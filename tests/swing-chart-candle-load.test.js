'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING chart candle loading — persisted candle-store state machine.
//
// WHAT IS UNDER TEST
//   _swingGetChartCandles is the SWING chart's candle loader. It must resolve a
//   series from the BACKEND PERSISTED CANDLE STORE (GET /market/candles, via the
//   shared _scannerReadBackendCandlesTf primitive) and must NOT read the rotating
//   live DXLink candle buffer (GET /dev/market/candles-dxlink/:symbol).
//
//   That distinction is the entire point of the fix. The DXLink buffer is warm
//   only for symbols inside the current rotating subscription window, so an
//   "All snapshot" candidate outside that window read back EMPTY and was reported
//   as "no backend candles available" — a FALSE negative, while the persisted
//   store held a complete series. The persisted store also never opens a Candle
//   subscription, so navigating many distinct symbols costs nothing.
//
//   POST /market/candles/ensure is the ONLY step that can create backend Candle
//   subscriptions. It is therefore spent at most ONCE per symbol|timeframe, only
//   for the active symbol, and only after a store read that is genuinely unusable.
//   Because ensure answers `queued:true` before the derivation finishes (4H is
//   derived from stored 30M server-side), a bounded re-read loop follows, and its
//   exhaustion means NOT-READY — never "no data".
//
//   These tests run the REAL state machine extracted from the application source.
//   Only the transport primitives and the clock are stubbed.
//
// COUNTER DISCIPLINE
//   Persisted reads, ensures, DXLink buffer reads and quote lifecycle calls are
//   counted SEPARATELY and never aggregated — conflating them is exactly how the
//   original subscription-pressure regression went unnoticed.
//
// Run: node tests/swing-chart-candle-load.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const APP = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) { return String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }
function realConst(name) {
  const m = new RegExp('var\\s+' + name + '\\s*=\\s*(\\d+)').exec(APP);
  if (!m) throw new Error('constant not found in application source: ' + name);
  return Number(m[1]);
}

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) { if (cond) { pass++; } else { fail++; failures.push(msg); } }
function eq(a, b, msg) { ok(a === b, msg + '  [expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ']'); }
function section(t) { console.log('\n' + t); }

// Real budgets, read out of the shipping source so a stub can never invent them.
const ATTEMPTS = realConst('SWING_CHART_ENSURE_REREAD_ATTEMPTS');
const MIN_BARS = realConst('SWING_CHART_MIN_BARS');

function series(n, base) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ time: 1700000000 + i * 86400, open: base, high: base + 1, low: base - 1, close: base, volume: 10 });
  return out;
}

// ── Harness ──────────────────────────────────────────────────────────────────
// Builds a sandbox holding the REAL loader plus separately-counted stubs.
function makeSandbox() {
  const c = {
    storeReads: [],       // persisted GET /market/candles
    ensures: [],          // POST /market/candles/ensure
    dxlinkReads: [],      // GET /dev/market/candles-dxlink/:symbol
    quoteCalls: [],       // quote lifecycle (must stay untouched by this loader)
    subscribes: [],       // any Candle subscription request
    sleeps: [],
    logs: [],
  };
  // Default: a healthy persisted store.
  let storeImpl = async () => ({ ok: true, candles: series(200, 100), count: 200, missingReason: null });
  let ensureImpl = async () => ({ ok: true });

  const sb = {
    Math, JSON, Number, isFinite, parseFloat, parseInt, Array, Object, Promise, Date, String,
    console: { log: (s) => c.logs.push(String(s)), warn: () => {}, error: () => {} },
    // Virtual clock: the bounded backoff is exercised for real, without real waiting.
    setTimeout: (fn, ms) => { c.sleeps.push(ms); return Promise.resolve().then(fn); },
    S: { swing: { selectedSymbol: null, chartRequestId: 0, chartCache: {} } },
    _scannerReadBackendCandlesTf: async function (sym, tf, opts) {
      c.storeReads.push(sym + '|' + tf + (opts && opts.forceNetwork ? '|net' : '|cache'));
      return storeImpl(sym, tf, opts);
    },
    _scannerEnsureBackendCandles: async function (sym, tfs, reason) {
      c.ensures.push(sym + '|' + (tfs || []).join(',') + '|' + reason);
      c.subscribes.push(sym);
      return ensureImpl(sym, tfs, reason);
    },
    // Present but must NEVER be called by the chart loader.
    _sfsFetchBackendCandles: async function (sym, tf) { c.dxlinkReads.push(sym + '|' + tf); return { ok: false, candles: [] }; },
    _sfsWarmupBatch: async function (syms) { c.subscribes.push(String(syms)); return { ok: true }; },
    subscribeDxlinkQuotes: async function (syms) { c.quoteCalls.push('subscribe:' + syms); },
    fetchLiveQuote: async function (sym) { c.quoteCalls.push('quote:' + sym); return null; },
  };
  vm.createContext(sb);
  vm.runInContext('var _swingEnsureInflight = {}; var _swingChartLoadSeq = 0;'
    + ' var SWING_CHART_ENSURE_REREAD_ATTEMPTS = ' + ATTEMPTS + ';'
    + ' var SWING_CHART_ENSURE_REREAD_DELAY_MS = ' + realConst('SWING_CHART_ENSURE_REREAD_DELAY_MS') + ';'
    + ' var SWING_CHART_MIN_BARS = ' + MIN_BARS + ';', sb);
  ['_swingChartCacheKey', '_swingIsExplicitNoData', '_swingIsTransportFailure', '_swingEnsureTimeframesFor',
    '_swingChartLoadLog', '_swingEnsureOnce', '_swingChartSleep', '_swingClassifyRead',
    '_swingIsLatestChartRequest', '_swingReadPersistedCandles', '_swingGetChartCandles',
  ].forEach((n) => vm.runInContext(extractFn(APP, n), sb));

  return {
    sb, c,
    setStore: (fn) => { storeImpl = fn; },
    setEnsure: (fn) => { ensureImpl = fn; },
    select: (sym) => { sb.S.swing.selectedSymbol = sym; return ++sb.S.swing.chartRequestId; },
    load: (sym, tf, reqId) => sb._swingGetChartCandles(sym, tf, reqId),
  };
}

(async () => {

// ── 1–2. Cache hit and persisted-store network success ───────────────────────
section('1–2. chart cache hit / persisted-store network success');
{
  const h = makeSandbox();
  const r1 = h.select('AAPL');
  const a = await h.load('AAPL', '1D', r1);
  eq(a.state, 'backend_success', '2: a fresh persisted-store read reports backend_success');
  eq(a.source, 'BACKEND_CANDLE_STORE', '2: provenance is the persisted candle store');
  eq(h.c.storeReads.length, 1, '2: exactly ONE persisted read');
  eq(h.c.ensures.length, 0, '2: a usable read spends NO ensure');
  eq(h.c.dxlinkReads.length, 0, '2: the DXLink buffer is never read');

  const b = await h.load('AAPL', '1D', r1);
  eq(b.state, 'cache_hit', '1: the second load is served from the SWING chart cache');
  eq(h.c.storeReads.length, 1, '1: a cache hit performs NO further network read');
  eq(h.c.ensures.length, 0, '1: a cache hit spends NO ensure');
}

// ── 3. All-snapshot symbol outside the current DXLink window ─────────────────
section('3. All-snapshot candidate outside the rotating DXLink window');
{
  const h = makeSandbox();
  // The persisted store HAS the series; the DXLink buffer would have been cold.
  h.setStore(async () => ({ ok: true, candles: series(180, 42), count: 180, missingReason: null }));
  const r = h.select('V');
  const res = await h.load('V', '1D', r);
  eq(res.state, 'backend_success', '3: an out-of-window symbol still renders from the persisted store');
  ok(res.candles.length === 180, '3: the full persisted series is returned');
  eq(h.c.dxlinkReads.length, 0, '3: the cold DXLink buffer is never consulted');
  eq(h.c.ensures.length, 0, '3: no ensure needed — the store already had the data');
  eq(h.c.subscribes.length, 0, '3: ZERO Candle subscriptions for an out-of-window symbol');
}

// ── 4. Coverage is never consulted ───────────────────────────────────────────
section('4. coverage is never consulted to decide loading');
{
  const src = stripComments(
    extractFn(APP, '_swingGetChartCandles') + extractFn(APP, '_swingReadPersistedCandles') +
    extractFn(APP, '_swingClassifyRead') + extractFn(APP, '_swingEnsureOnce'));
  ok(!/coverage|Coverage|COVERAGE/.test(src), '4: the loader never reads any coverage structure');
  ok(!/currentWindow|rotating|inWindow/.test(src), '4: the loader never branches on window membership');
}

// ── 5–6. 1D and 4H available without ensure ──────────────────────────────────
section('5–6. 1D / 4H available straight from the store');
{
  for (const tf of ['1D', '4H']) {
    const h = makeSandbox();
    const r = h.select('MSFT');
    const res = await h.load('MSFT', tf, r);
    eq(res.state, 'backend_success', (tf === '1D' ? '5' : '6') + ': ' + tf + ' served without ensure');
    eq(h.c.ensures.length, 0, (tf === '1D' ? '5' : '6') + ': ' + tf + ' spends no ensure');
    eq(h.c.subscribes.length, 0, (tf === '1D' ? '5' : '6') + ': ' + tf + ' creates no Candle subscription');
  }
}

// ── 7–8. Ensure only after an unusable read, once per symbol|tf ──────────────
section('7–8. ensure fires only after an unusable read, once per symbol|tf');
{
  const h = makeSandbox();
  let n = 0;
  h.setStore(async () => (++n === 1)
    ? ({ ok: false, candles: [], count: 0, missingReason: 'store_empty' })
    : ({ ok: true, candles: series(150, 10), count: 150, missingReason: null }));
  const r = h.select('NET');
  const res = await h.load('NET', '4H', r);
  eq(res.state, 'backend_success_ensured', '7: a repaired series reports backend_success_ensured');
  eq(h.c.ensures.length, 1, '8: exactly ONE ensure for the symbol|timeframe');
  ok(String(h.c.ensures[0] || '').startsWith('NET|1D,30M,4H|'), '6: 4H ensure honours the 30M → 4H derivation contract');
  ok(/swing_chart_lookup/.test(String(h.c.ensures[0] || '')), '7: the ensure is attributed to the swing chart lookup');
}

// ── 9. Concurrent dedupe ─────────────────────────────────────────────────────
section('9. concurrent loads share ONE ensure');
{
  const h = makeSandbox();
  let n = 0;
  h.setStore(async () => (++n <= 2)
    ? ({ ok: false, candles: [], count: 0, missingReason: 'store_empty' })
    : ({ ok: true, candles: series(150, 10), count: 150, missingReason: null }));
  const r = h.select('AMD');
  const [x, y] = await Promise.all([h.load('AMD', '1D', r), h.load('AMD', '1D', r)]);
  eq(h.c.ensures.length, 1, '9: two concurrent loaders spend exactly ONE ensure');
  ok(x.ok && y.ok, '9: both concurrent callers still resolve successfully');
}

// ── 10. 4H derived late, available at a bounded re-read ──────────────────────
section('10. late 4H derivation is picked up by the bounded re-read');
{
  const h = makeSandbox();
  let n = 0;
  h.setStore(async () => {
    n++;
    if (n < 3) return { ok: false, candles: [], count: 0, missingReason: 'missing_30m_for_4h' };
    return { ok: true, candles: series(120, 55), count: 120, missingReason: null };
  });
  const r = h.select('PANW');
  const res = await h.load('PANW', '4H', r);
  eq(res.state, 'backend_success_ensured', '10: a late 4H derivation resolves on a later bounded re-read');
  ok(res.state !== 'explicit_no_data', '10: a derivation delay is NEVER classified as no-data');
  eq(h.c.ensures.length, 1, '10: still only one ensure');
  ok(h.c.sleeps.length >= 1, '10: the re-read backoff actually elapsed');
}

// ── 11. Bounded exhaustion → not_ready ───────────────────────────────────────
section('11. bounded exhaustion reports not_ready, never no-data');
{
  const h = makeSandbox();
  h.setStore(async () => ({ ok: false, candles: [], count: 0, missingReason: 'store_empty' }));
  const r = h.select('COLD');
  const res = await h.load('COLD', '4H', r);
  eq(res.state, 'not_ready', '11: exhausting the bounded budget yields not_ready');
  eq(h.c.ensures.length, 1, '11: exhaustion still costs only ONE ensure');
  eq(h.c.storeReads.length, 1 + ATTEMPTS, '11: exactly one initial read plus the declared re-read budget');
  ok(h.c.sleeps.length === ATTEMPTS, '11: the backoff ran a bounded number of times');
}

// ── 12. Network error ────────────────────────────────────────────────────────
section('12. network error is reported as such');
{
  const h = makeSandbox();
  h.setStore(async () => ({ ok: false, candles: null, count: 0, missingReason: 'fetch_error:socket hang up' }));
  const r = h.select('ERR');
  const res = await h.load('ERR', '1D', r);
  eq(res.state, 'network_error', '12: a transport failure reports network_error');
  eq(h.c.ensures.length, 0, '12: a transport failure does not spend an ensure');

  // A rejecting primitive must not escape into the render path.
  const h2 = makeSandbox();
  h2.setStore(async () => { throw new Error('net down'); });
  const r2 = h2.select('BOOM');
  const res2 = await h2.load('BOOM', '1D', r2);
  eq(res2.state, 'network_error', '12: a REJECTING read is contained and classified as network_error');
}

// ── 13. Explicit no-data ─────────────────────────────────────────────────────
section('13. explicit backend no-data');
{
  for (const reason of ['symbol_missing', 'unknown_symbol', 'not_found', 'unsupported_timeframe']) {
    const h = makeSandbox();
    h.setStore(async () => ({ ok: false, candles: [], count: 0, missingReason: reason }));
    const r = h.select('NOPE');
    const res = await h.load('NOPE', '1D', r);
    eq(res.state, 'explicit_no_data', '13: "' + reason + '" is a definitive no-data verdict');
    eq(h.c.ensures.length, 0, '13: "' + reason + '" spends no ensure (nothing to repair)');
  }
  // …and the repairable reasons must NOT be treated as no-data.
  for (const reason of ['store_empty', 'missing_30m_for_4h', 'missing_1d_for_1w', 'derived_4h_empty']) {
    const h = makeSandbox();
    h.setStore(async () => ({ ok: false, candles: [], count: 0, missingReason: reason }));
    const r = h.select('WAIT');
    const res = await h.load('WAIT', '4H', r);
    eq(res.state, 'not_ready', '13: "' + reason + '" is pending, NOT no-data');
  }
}

// ── 14. 1–4 bars → insufficient ──────────────────────────────────────────────
section('14. a too-short series is reported as insufficient');
{
  for (let nBars = 1; nBars <= MIN_BARS - 1; nBars++) {
    const h = makeSandbox();
    h.setStore(async () => ({ ok: false, candles: series(nBars, 7), count: nBars, missingReason: null }));
    const r = h.select('TINY');
    const res = await h.load('TINY', '1D', r);
    eq(res.state, 'insufficient_backend_candles', '14: ' + nBars + ' bar(s) → insufficient_backend_candles');
    eq(h.c.ensures.length, 0, '14: a short-but-present series is not "repaired" with an ensure');
  }
  const h = makeSandbox();
  h.setStore(async () => ({ ok: false, candles: series(MIN_BARS, 7), count: MIN_BARS, missingReason: null }));
  const r = h.select('JUST');
  const res = await h.load('JUST', '1D', r);
  eq(res.state, 'backend_success', '14: exactly SWING_CHART_MIN_BARS bars IS renderable');
}

// ── 15–17. Supersession ──────────────────────────────────────────────────────
section('15–17. symbol change supersedes in-flight work');
{
  // 15. symbol changes while the bounded wait is in progress
  const h = makeSandbox();
  let n = 0;
  h.setStore(async () => {
    n++;
    if (n === 1) return { ok: false, candles: [], count: 0, missingReason: 'store_empty' };
    return { ok: true, candles: series(150, 1), count: 150, missingReason: null };
  });
  const r = h.select('AMD');
  const p = h.load('AMD', '1D', r);
  h.select('NET'); // user moves on while the ensure/backoff is pending
  const res = await p;
  eq(res.state, 'superseded', '15: a symbol change during the wait supersedes the load');
  eq(h.sb.S.swing.chartCache['AMD|1D'], undefined, '17: a superseded result NEVER enters the chart cache');

  // 16. symbol changes during the LAST read
  const h2 = makeSandbox();
  let m = 0;
  h2.setStore(async () => {
    m++;
    if (m === 1) return { ok: false, candles: [], count: 0, missingReason: 'store_empty' };
    h2.select('OTHER');  // selection moves while this very read is in flight
    return { ok: true, candles: series(150, 1), count: 150, missingReason: null };
  });
  const r2 = h2.select('AMD');
  const res2 = await h2.load('AMD', '1D', r2);
  eq(res2.state, 'superseded', '16: a symbol change during the final read supersedes the result');
  eq(h2.sb.S.swing.chartCache['AMD|1D'], undefined, '17: the late series does not poison the cache');
}

// ── 18. Retry after not_ready ────────────────────────────────────────────────
section('18. a not_ready verdict stays retry-able');
{
  const h = makeSandbox();
  let ready = false;
  h.setStore(async () => ready
    ? ({ ok: true, candles: series(150, 3), count: 150, missingReason: null })
    : ({ ok: false, candles: [], count: 0, missingReason: 'store_empty' }));
  const r = h.select('RETRY');
  const first = await h.load('RETRY', '1D', r);
  eq(first.state, 'not_ready', '18: first attempt exhausts the budget → not_ready');
  ready = true;
  const r2 = h.select('RETRY');
  const second = await h.load('RETRY', '1D', r2);
  eq(second.state, 'backend_success', '18: a later retry succeeds (no permanent cooldown lock-out)');
  eq(h.c.ensures.length, 1, '18: the successful retry needed no second ensure');
}

// ── 19–21. Navigation pressure and blast radius ──────────────────────────────
section('19–21. navigating many symbols creates ZERO subscriptions on store hits');
{
  const h = makeSandbox();
  const syms = ['V', 'AMD', 'NET', 'PANW', 'BK', 'DXY', 'SQ', 'FI', 'BRK.B', 'PARA', 'MSFT', 'NVDA'];
  for (const s of syms) {
    const r = h.select(s);
    for (const tf of ['1D', '4H']) await h.load(s, tf, r);
  }
  eq(h.c.ensures.length, 0, '19: navigating ' + syms.length + ' distinct symbols spends ZERO ensures');
  eq(h.c.subscribes.length, 0, '19: …and creates ZERO new Candle subscriptions');
  eq(h.c.dxlinkReads.length, 0, '19: …and never touches the DXLink buffer');
  eq(h.c.storeReads.length, syms.length * 2, '20: exactly one persisted read per symbol|timeframe — no mass prefetch');
  eq(h.c.quoteCalls.length, 0, '21: the candle loader never touches any quote subscription');

  const src = stripComments(extractFn(APP, '_swingGetChartCandles') + extractFn(APP, '_swingEnsureOnce'));
  ok(!/forEach[\s\S]*candidates|candidates\.map|S\.swing\.candidates/.test(src), '20: the loader never iterates the candidate list');
  ok(!/subscribeDxlinkQuotes|unsubscribe|_sfsWarmupBatch/.test(src), '21: Portfolio / scanner / SPY subscriptions are untouched');
}

// ── 22. UI messages ──────────────────────────────────────────────────────────
section('22. UI copy is driven by state, not by emptiness');
{
  const sb = { S: { swing: {} } };
  vm.createContext(sb);
  [ '_swingIsHardFailure', '_swingChartFailMsg', '_swingChartStateIsError' ].forEach((n) => vm.runInContext(extractFn(APP, n), sb));
  const msg = (state, reason) => sb._swingChartFailMsg('4H', { state, reason: reason || null });

  ok(/backend candles not ready — retry shortly/.test(msg('not_ready')), '22: not_ready → "backend candles not ready — retry shortly"');
  ok(/backend candle fetch failed/.test(msg('network_error', 'fetch_error:x')), '22: network_error → "backend candle fetch failed"');
  ok(/insufficient backend candles/.test(msg('insufficient_backend_candles')), '22: short series → "insufficient backend candles"');
  eq(msg('explicit_no_data'), '4H — no backend candles available', '22: explicit_no_data → "no backend candles available"');
  // The critical anti-regression: only explicit_no_data may claim absence.
  ['not_ready', 'network_error', 'insufficient_backend_candles', 'superseded'].forEach((st) => {
    ok(!/no backend candles available/.test(msg(st)), '22: "' + st + '" NEVER says "no backend candles available"');
  });
  eq(sb._swingChartStateIsError({ state: 'network_error' }), true, '22: only a transport failure is styled as an error');
  eq(sb._swingChartStateIsError({ state: 'not_ready' }), false, '22: a pending series is not an error');
  eq(sb._swingChartStateIsError({ state: 'explicit_no_data' }), false, '22: a definitive no-data is not a transport error');
}

// ── 23. Diagnostics are per load, never per candle ───────────────────────────
section('23. diagnostics are per load cycle, never per candle');
{
  const h = makeSandbox();
  h.setStore(async () => ({ ok: true, candles: series(300, 9), count: 300, missingReason: null }));
  const r = h.select('LOG');
  await h.load('LOG', '1D', r);
  ok(h.c.logs.length > 0, '23: the loader emits state diagnostics');
  ok(h.c.logs.length < 10, '23: …a bounded number of them, never one per candle (300 bars → ' + h.c.logs.length + ' lines)');
  ok(h.c.logs.every((l) => /^\[SWING-CHART-LOAD\]/.test(l)), '23: every diagnostic carries the load-state token');
  ok(h.c.logs.some((l) => /state=backend_success/.test(l) && /symbol=LOG/.test(l) && /timeframe=1D/.test(l)),
    '23: diagnostics carry state + symbol + timeframe');
  ok(h.c.logs.some((l) => /generation=\d+/.test(l)), '23: diagnostics carry the request generation');
}

// ── 24. 1W / 1D / 4H rendering wiring unchanged ──────────────────────────────
section('24. 1W / 1D / 4H render wiring still routes through the loader');
{
  const render = stripComments(extractFn(APP, '_swingRenderCharts'));
  ok(/_swingGetChartCandles\(symbol, '1D', reqId\)/.test(render), '24: 1D goes through the loader with the request id');
  ok(/_swingGetChartCandles\(symbol, '4H', reqId\)/.test(render), '24: 4H goes through the loader with the request id');
  ok(/_swingGetChartCandles\(symbol, '1W', reqId\)/.test(render), '24: the 1W fallback goes through the loader with the request id');
  ok(/_swingPreparePriceAlignedCandles/.test(render), '24: the shared price-alignment seam is preserved');
  ok(/aligned\.weeklyCandles/.test(render), '24: 1W is still derived from the patched 1D first');
  // The loader is the ONLY candle transport the chart render path uses.
  ok(!/_sfsFetchBackendCandles|_swingGetCandles\(/.test(render), '24: the render path never bypasses the loader');

  // Ensure timeframe mapping honours the current derivation contracts.
  const sb = {};
  vm.createContext(sb);
  vm.runInContext(extractFn(APP, '_swingEnsureTimeframesFor'), sb);
  eq(sb._swingEnsureTimeframesFor('4H').join(','), '1D,30M,4H', '24: 4H ensure requests the 30M source');
  eq(sb._swingEnsureTimeframesFor('1W').join(','), '1D', '24: 1W ensure requests the 1D source');
  eq(sb._swingEnsureTimeframesFor('1D').join(','), '1D', '24: 1D ensure requests 1D');
}

// ── Extraction / ownership guards ────────────────────────────────────────────
section('25. ownership: shared primitives are called, never redefined');
{
  ['_scannerReadBackendCandlesTf', '_scannerEnsureBackendCandles', '_sfsFetchBackendCandles'].forEach((fn) => {
    const n = (APP.match(new RegExp('(?:async\\s+)?function\\s+' + fn.replace('.', '\\.') + '\\s*\\(', 'g')) || []).length;
    eq(n, 1, '25: ' + fn + ' is defined exactly once across the whole application source');
  });
  const loader = stripComments(extractFn(APP, '_swingGetChartCandles') + extractFn(APP, '_swingReadPersistedCandles'));
  ok(!/\bfetch\s*\(/.test(loader), '25: the loader performs no direct transport of its own');
  ok(!/setInterval\s*\(|new WebSocket/.test(loader), '25: the loader adds no interval timers or sockets');
}

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }

})().catch((e) => { console.error(e); process.exit(1); });
