'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING chart — on-demand candle load for ANY candidate (Current window OR All snapshot).
//
// Regression: an "All snapshot" symbol OUTSIDE the current rotating DXLink window (e.g. V) showed a
// FALSE "no backend candles available" although the persisted store held it. The chart did a single
// candles-dxlink READ (cold live buffer → empty) and — via _sfsEnsureTfCandles' single immediate
// re-read — misclassified a still-materialising 4H (derived server-side from 30M) as a true-empty.
//
// This runs the REAL state machine: _swingGetChartCandles → _swingGetCandles → (empty) →
// _swingWarmupThenReread (ONE warmup + BOUNDED backoff re-read). Only the final network
// (_sfsFetchBackendCandles / _sfsWarmupBatch) and the timers (_sfsSleep) are stubbed, so the test
// exercises the true classification (backend_success_warmed / not_ready / subscription_limit /
// network_error / insufficient_backend_candles / true_empty / superseded), the request-identity
// guards, and the REAL warmup/subscription pressure during navigation.
// Run: node tests/swing-chart-candle-load.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  let start = src.indexOf('async ' + sig); if (start < 0) start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } }
function eq(a, b, m) { ok(a === b, m + '  (got ' + JSON.stringify(a) + ')'); }
function section(t) { console.log('\n' + t); }
const mk = (n) => { const a = []; for (let i = 0; i < n; i++) a.push({ time: 1e12 + i * 3600000, open: 100, high: 101, low: 99, close: 100 + i, volume: 1 }); return a; };
const okC = (n) => ({ ok: true, candles: mk(n), count: n, reason: null });
const empty = (reason) => ({ ok: true, candles: [], count: 0, reason: reason || 'empty' });
const httpErr = (r) => ({ ok: false, candles: [], count: 0, reason: r || 'http_500' });

// ── Sandbox ──────────────────────────────────────────────────────────────────
const loadLogs = [];
let fetchLog = [], warmupLog = [], fetchCounts = {};
let subLimit = false;
let fetchImpl = () => empty();
let warmupImpl = () => ({ ok: true });

const sandbox = {
  console: { log: function (m) { if (/^\[SWING-CHART-LOAD\]/.test(String(m))) loadLogs.push(String(m)); }, warn: function () {}, error: function () {}, debug: function () {} },
  Math, JSON, Object, String, Number, isFinite, parseFloat, parseInt, NaN, Array, Promise, Date, setTimeout,
  SFS_DETAIL_4H_POST_WARM_ATTEMPTS: 3, SFS_DETAIL_4H_POST_WARM_DELAY_MS: 0,
  _sfsCandleSubLimitActive: function () { return subLimit; },
  _sfsSleep: function () { return Promise.resolve(); },
  _sfsFetchBackendCandles: function (sym, tf) {
    const k = sym + '|' + tf; fetchCounts[k] = (fetchCounts[k] || 0) + 1; fetchLog.push(k);
    return Promise.resolve(fetchImpl(sym, tf, fetchCounts[k]));
  },
  _sfsWarmupBatch: function (symbols, tfs, opts) {
    warmupLog.push({ symbols: (symbols || []).slice(), tfs: (tfs || []).slice() });
    return Promise.resolve(warmupImpl(symbols, tfs, opts));
  },
  S: { swing: { chartCache: {}, selectedSymbol: null, chartRequestId: 1, candidateScope: 'window' },
       squeezeFireScanner: { chartCacheCandles: {} }, scanData: [] },
};
vm.createContext(sandbox);
vm.runInContext('var _swingCandleInflight = {}; var _swingWarmupInflight = {}; var SWING_CHART_MIN_BARS = 5;', sandbox);
vm.runInContext(
  ['_swingNormSym', '_swingChartCacheKey', '_swingChartLoadLog', '_swingChartScopeLabel',
   '_swingCurrentChartSymbol', '_swingIsLatestChartRequest', '_swingIsHardFailure', '_swingChartFailMsg',
   '_swingReadCachedCandles', '_swingGetCandles', '_swingWarmupThenReread', '_swingGetChartCandles']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);
const call = (sym, tf, reqId) => vm.runInContext(
  '_swingGetChartCandles(' + JSON.stringify(sym) + ',' + JSON.stringify(tf) + (reqId != null ? ',' + reqId : '') + ')', sandbox);
const S = sandbox.S;
const setSel = (sym, gen) => { S.swing.selectedSymbol = sym; if (gen != null) S.swing.chartRequestId = gen; };
const failMsg = (tf, res) => vm.runInContext('_swingChartFailMsg(' + JSON.stringify(tf) + ',' + JSON.stringify(res) + ')', sandbox);
function reset() {
  loadLogs.length = 0; fetchLog = []; warmupLog = []; fetchCounts = {}; subLimit = false;
  fetchImpl = () => empty(); warmupImpl = () => ({ ok: true });
  S.swing = { chartCache: {}, selectedSymbol: null, chartRequestId: 1, candidateScope: 'window' };
  S.squeezeFireScanner = { chartCacheCandles: {} }; S.scanData = [];
  vm.runInContext('_swingWarmupInflight = {}; _swingCandleInflight = {};', sandbox);
}
const warmedSyms = () => warmupLog.map((w) => w.symbols.join(','));

(async () => {
  // ── Criticità A — false true_empty on a delayed 4H derivation ──────────────────────────────────
  section('A. 4H DELAYED derivation — warmup 30M then a BOUNDED re-read materialises on a later attempt');
  {
    reset(); setSel('V', 12); S.swing.candidateScope = 'all';
    // Direct read (nth 1) empty; re-reads (nth 2,3) empty; the 3rd re-read (nth 4) is populated.
    fetchImpl = (sym, tf, nth) => (sym === 'V' && tf === '4H') ? (nth >= 4 ? okC(60) : empty()) : empty();
    const r = await call('V', '4H', 12);
    eq(r.state, 'backend_success_warmed', 'A: 4H materialises via the bounded re-read → backend_success_warmed');
    eq(r.source, 'BACKEND_WARMUP', 'A: provenance BACKEND_WARMUP');
    ok(r.candles.length >= 5, 'A: usable 4H candles returned (' + r.candles.length + ')');
    eq(warmupLog.length, 1, 'A: exactly ONE warmup issued');
    eq(warmupLog[0].tfs.join(','), '30M', 'A: 4H warmup targets 30M (server derives 4H from 30M)');
    eq(fetchLog.filter((k) => k === 'V|4H').length, 4, 'A: 1 direct read + 3 bounded re-reads');
    ok(!!S.swing.chartCache['V|4H'], 'A: the warmed 4H is cached');
    ok(!loadLogs.some((l) => /true_empty/.test(l)), 'A: NEVER classified as true_empty');
    ok(loadLogs.some((l) => /reread_success symbol=V tf=4H attempt=3/.test(l)), 'A: logged the successful re-read attempt');
  }

  section('A2. All re-reads empty → NOT_READY (retry-able), never a false true_empty');
  {
    reset(); setSel('V', 3);
    fetchImpl = () => empty();
    const r = await call('V', '4H', 3);
    eq(r.state, 'not_ready', 'A2: bounded re-reads exhausted after an accepted warmup → not_ready');
    eq(warmupLog.length, 1, 'A2: one warmup attempted');
    eq(fetchLog.filter((k) => k === 'V|4H').length, 4, 'A2: 1 read + 3 bounded re-reads');
    eq(failMsg('4H', r), '4H — backend candles not ready — retry shortly', 'A2: transient not-ready copy, not "no backend candles"');
    ok(!S.swing.chartCache['V|4H'], 'A2: nothing cached');
  }

  section('A3. Subscription cap BEFORE the warmup → subscription_limit, NO warmup issued');
  {
    reset(); setSel('V', 1); subLimit = true;
    fetchImpl = () => empty();
    const r = await call('V', '4H', 1);
    eq(r.state, 'subscription_limit', 'A3: cap active → subscription_limit');
    eq(warmupLog.length, 0, 'A3: no warmup opened while the Candle cap is active (adds no pressure)');
    eq(failMsg('4H', r), '4H — backend candle subscription limit — retry shortly', 'A3: subscription-limit copy');
  }

  section('A4. Subscription cap reported by an HTTP-200 body during a re-read → subscription_limit');
  {
    reset(); setSel('V', 1);
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : empty('subscription size for event type Candle is too big');
    const r = await call('V', '4H', 1);
    eq(r.state, 'subscription_limit', 'A4: a subscription reason in the re-read body → subscription_limit');
  }

  section('A5. Network error DURING warmup → still bounded re-reads; empty → not_ready (warmup non-fatal)');
  {
    reset(); setSel('V', 1);
    warmupImpl = () => { throw new Error('net down'); };
    fetchImpl = () => empty();
    const r = await call('V', '4H', 1);
    eq(r.state, 'not_ready', 'A5: a warmup exception is not fatal; empty re-reads → not_ready');
    eq(warmupLog.length, 1, 'A5: warmup was attempted');
  }

  section('A6. Network error during a RE-READ → network_error (never "no candles")');
  {
    reset(); setSel('V', 1);
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : httpErr('http_503');
    const r = await call('V', '4H', 1);
    eq(r.state, 'network_error', 'A6: an HTTP error during the re-read → network_error');
    eq(failMsg('4H', r), '4H — backend candle fetch failed (http_503)', 'A6: hard-failure copy');
  }

  section('A7. SHORT 4H series after the bounded re-read → insufficient_backend_candles');
  {
    reset(); setSel('V', 1);
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : { ok: true, candles: mk(3), count: 3, reason: null };
    const r = await call('V', '4H', 1);
    eq(r.state, 'insufficient_backend_candles', 'A7: 1-4 bars after warmup → insufficient_backend_candles');
    eq(failMsg('4H', r), '4H — insufficient backend candles', 'A7: insufficient copy');
  }

  section('A8. Symbol change DURING the backoff → superseded before any re-read (no wasted work)');
  {
    reset(); setSel('V', 12);
    warmupImpl = () => { setSel('V', 99); return { ok: true }; }; // a newer selection lands during warmup
    fetchImpl = () => empty();
    const r = await call('V', '4H', 12);
    eq(r.state, 'superseded', 'A8: generation moved on → superseded');
    eq(fetchLog.filter((k) => k === 'V|4H').length, 1, 'A8: only the direct read ran; NO re-reads for a stale request');
    ok(!S.swing.chartCache['V|4H'], 'A8: nothing cached for a superseded request');
  }

  section('A9. Symbol change DURING the last fetch → the outer guard drops the stale success');
  {
    reset(); setSel('V', 12);
    // The populated re-read (nth 4) flips the generation THEN returns candles → the inner loop
    // returns success, but _swingGetChartCandles re-checks identity and drops it.
    fetchImpl = (sym, tf, nth) => { if (nth >= 4) { setSel('V', 77); return okC(60); } return empty(); };
    const r = await call('V', '4H', 12);
    eq(r.state, 'superseded', 'A9: a result that materialises after the selection moved is dropped');
    ok(!S.swing.chartCache['V|4H'], 'A9: the stale-symbol candles are NOT cached');
  }

  section('A10. Retry after not_ready — a later re-select succeeds and caches');
  {
    reset(); setSel('V', 1);
    fetchImpl = () => empty();
    const first = await call('V', '4H', 1);
    eq(first.state, 'not_ready', 'A10: first attempt not_ready');
    // Re-select (new generation); the 4H has now materialised in the backend store, so the retry's
    // DIRECT read succeeds (backend_success) — a not_ready is always retry-able, never a dead end.
    setSel('V', 2); fetchImpl = (sym, tf, nth) => okC(60);
    const second = await call('V', '4H', 2);
    ok(second.ok === true && (second.state === 'backend_success' || second.state === 'backend_success_warmed'),
       'A10: the retry succeeds (state ' + second.state + ') — not_ready is never a dead end');
    ok(!!S.swing.chartCache['V|4H'], 'A10: the successful retry caches');
  }

  // ── Criticità B — cumulative Candle subscription pressure during navigation ────────────────────
  section('B. Navigation V→AMD→NET→PANW (all cold) — measured warmup / subscription pressure');
  {
    reset();
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : okC(60); // cold read, then materialises after warmup
    const nav = ['V', 'AMD', 'NET', 'PANW'];
    for (let i = 0; i < nav.length; i++) {
      setSel(nav[i], 10 + i);
      await call(nav[i], '1D', 10 + i);
      await call(nav[i], '4H', 10 + i);
    }
    // HONEST measurement: the warmup opens an INDIRECT backend Candle subscription per cold symbol
    // (1D + 30M-for-4H). It is active-symbol-only and single-symbol (NOT a mass/all-rows warmup),
    // but it IS cumulative and has no frontend release (documented blocker — see PR note).
    eq(warmupLog.length, 8, 'B: 2 warmups per cold symbol (1D + 30M-for-4H) × 4 = 8 (cumulative — measured, not assumed absent)');
    ok(warmupLog.every((w) => w.symbols.length === 1), 'B: EVERY warmup is single-symbol (active-symbol only — never a mass/all-rows warmup)');
    eq(warmedSyms().join('|'), 'V|V|AMD|AMD|NET|NET|PANW|PANW', 'B: warmups target exactly the navigated symbols, in order');
    eq(warmupLog.filter((w) => w.tfs.indexOf('1D') >= 0).length, 4, 'B: four 1D warmups (one per symbol)');
    eq(warmupLog.filter((w) => w.tfs.indexOf('30M') >= 0).length, 4, 'B: four 30M warmups (one per symbol — 4H derives from 30M)');
  }

  section('B2. Once the Candle cap is active, navigation opens NO further warmups (backpressure)');
  {
    reset(); subLimit = true;
    fetchImpl = () => empty();
    for (const sym of ['NEWA', 'NEWB', 'NEWC']) { setSel(sym, 1); await call(sym, '1D', 1); await call(sym, '4H', 1); }
    eq(warmupLog.length, 0, 'B2: with the cap active every warmup is skipped — pressure never grows past the cap');
  }

  // ── Criticità C — request identity across the slow warmup path ─────────────────────────────────
  section('C. Request identity — a warmup that finishes after the selection moved never applies');
  {
    reset(); setSel('AAPL', 10);
    // AAPL's warmup is held pending; while it is in flight the user selects V (gen 11).
    let releaseAapl; const aaplWarm = new Promise((r) => { releaseAapl = r; });
    warmupImpl = (syms) => (syms[0] === 'AAPL') ? aaplWarm.then(() => ({ ok: true })) : { ok: true };
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : okC(60);
    const aaplP = call('AAPL', '4H', 10);            // starts, blocks on the pending warmup
    setSel('V', 11);                                  // selection moves to V (newer generation)
    releaseAapl();                                    // the stale AAPL warmup now resolves
    const aaplR = await aaplP;
    eq(aaplR.state, 'superseded', 'C: the late AAPL load is dropped (generation moved to 11)');
    ok(!S.swing.chartCache['AAPL|4H'], 'C: AAPL never enters the SWING chart cache from the stale load');
    // V loads normally on its own generation.
    const vR = await call('V', '4H', 11);
    eq(vR.state, 'backend_success_warmed', 'C: the current selection V loads normally');
  }

  section('C2. _swingReanalyzeSelectedRow threads + guards the chart request id (identity on the 2nd path)');
  {
    const src = stripComments(extractFn(HTML, '_swingReanalyzeSelectedRow'));
    ok(/_swingGetChartCandles\(sym, '1D', _reqId\)/.test(src) && /_swingGetChartCandles\(sym, '4H', _reqId\)/.test(src),
       'C2: reanalyze passes the current chartRequestId into the candle load');
    ok(/var _reqId = S\.swing\.chartRequestId/.test(src), 'C2: reanalyze snapshots the request id before the awaits');
    ok(/S\.swing\.chartRequestId !== _reqId/.test(src), 'C2: reanalyze re-checks the request id after the awaits (drops stale rebuilds)');
  }

  // ── Retained regression coverage ───────────────────────────────────────────────────────────────
  section('D. Cache hit — served from cache, no read, no warmup');
  {
    reset(); setSel('AAPL', 1);
    S.swing.chartCache['AAPL|1D'] = { candles: mk(60), origin: 'backend' };
    S.swing.chartCache['AAPL|4H'] = { candles: mk(60), origin: 'prefetch' };
    const d = await call('AAPL', '1D', 1);
    eq(d.state, 'cache_hit', 'D: 1D cache hit'); eq(d.source, 'SWING_CHART_CACHE', 'D: backend-origin → SWING_CHART_CACHE');
    const h = await call('AAPL', '4H', 1);
    eq(h.source, 'PREFETCH_CACHE', 'D: prefetch-origin → PREFETCH_CACHE');
    eq(fetchLog.length, 0, 'D: no backend read on a cache hit'); eq(warmupLog.length, 0, 'D: no warmup on a cache hit');
  }

  section('E. In-window symbol — direct read succeeds, no warmup');
  {
    reset(); setSel('AAPL', 1);
    fetchImpl = () => okC(120);
    const d = await call('AAPL', '1D', 1);
    eq(d.state, 'backend_success', 'E: direct read hit → backend_success');
    eq(warmupLog.length, 0, 'E: a warm buffer never triggers a warmup');
    ok(!!S.swing.chartCache['AAPL|1D'], 'E: cached');
  }

  section('F. Coverage is never consulted; scope only labels the log');
  {
    const src = stripComments(extractFn(HTML, '_swingGetChartCandles')) + stripComments(extractFn(HTML, '_swingWarmupThenReread'));
    ok(!/coverage|operational/i.test(src), 'F: the loader never consults coverage/operational to build or skip candles');
    ok(!/candidateScope/.test(src), 'F: the loader logic never branches on candidateScope (scope is a log label only)');
  }

  section('G. Partial cache — 1D cached, only 4H is fetched/warmed');
  {
    reset(); setSel('V', 1);
    S.swing.chartCache['V|1D'] = { candles: mk(120), origin: 'backend' };
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : okC(60);
    const d = await call('V', '1D', 1); eq(d.state, 'cache_hit', 'G: 1D from cache');
    const h = await call('V', '4H', 1); eq(h.state, 'backend_success_warmed', 'G: 4H fetched on demand');
    eq(warmupLog.length, 1, 'G: exactly one warmup (4H only)');
    eq(warmupLog[0].tfs.join(','), '30M', 'G: it is the 30M warmup');
  }

  section('H. Scope parity — identical load for the same symbol from Current window vs All snapshot');
  {
    reset(); setSel('V', 1);
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : okC(60);
    S.swing.candidateScope = 'window'; const w = await call('V', '1D', 1);
    S.swing.chartCache = {}; fetchCounts = {}; vm.runInContext('_swingWarmupInflight = {}; _swingCandleInflight = {};', sandbox);
    S.swing.candidateScope = 'all';    const a = await call('V', '1D', 1);
    eq(w.state, a.state, 'H: same state under both scopes'); eq(w.ok, a.ok, 'H: same ok under both scopes');
  }

  section('I. Candle load is independent of the quote lease (delegated warmup, no direct fetch/interval)');
  {
    const src = stripComments(extractFn(HTML, '_swingGetChartCandles')) + stripComments(extractFn(HTML, '_swingWarmupThenReread'));
    ok(!/acquireSwingChartQuote|releaseSwingChartQuote|releaseAllSwingChartQuotes|subscribeDxlinkQuotes/.test(src),
       'I: the candle loader never touches the quote lease / quote subscription');
    ok(/_sfsWarmupBatch\(/.test(src) && /_sfsFetchBackendCandles\(/.test(src), 'I: warmup + read delegated to the shared SFS primitives');
    ok(!/\bfetch\s*\(/.test(src) && !/setInterval/.test(src), 'I: no direct fetch / no interval in the loader');
  }

  section('J. Warmup gating — active symbol + 1D/4H only');
  {
    reset(); setSel('AAPL', 1); // active symbol is AAPL, not V
    fetchImpl = () => empty();
    const other = await call('V', '1D'); // no reqId → isolate the active-symbol gate
    eq(warmupLog.length, 0, 'J: a NON-active symbol never warms up');
    eq(other.state, 'not_ready', 'J: a non-active empty read resolves as not_ready (retry-able), never a warmup');
    reset(); setSel('V', 1); fetchImpl = () => empty();
    await call('V', '1W', 1);
    eq(warmupLog.length, 0, 'J: 1W never triggers an independent warmup (weekly is derived from 1D)');
  }

  section('K. Message mapping — only true-empty says "no backend candles available"');
  {
    eq(failMsg('1D', { reason: 'http_503' }), '1D — backend candle fetch failed (http_503)', 'K: HTTP error');
    eq(failMsg('1D', { state: 'subscription_limit' }), '1D — backend candle subscription limit — retry shortly', 'K: subscription cap');
    eq(failMsg('1D', { state: 'network_error' }), '1D — backend candle fetch failed (network)', 'K: network');
    eq(failMsg('1D', { state: 'superseded' }), '1D — loading backend candles…', 'K: superseded');
    eq(failMsg('1D', { state: 'not_ready' }), '1D — backend candles not ready — retry shortly', 'K: not_ready');
    eq(failMsg('4H', { state: 'insufficient_backend_candles' }), '4H — insufficient backend candles', 'K: insufficient');
    eq(failMsg('1D', { state: 'true_empty', reason: 'true_empty' }), '1D — no backend candles available', 'K: TRUE empty (only this one)');
  }

  section('L. Explicit backend no-data signal → true_empty (definitive)');
  {
    reset(); setSel('DELISTED', 1);
    fetchImpl = (sym, tf, nth) => nth === 1 ? empty() : empty('unknown_symbol not_found');
    const r = await call('DELISTED', '4H', 1);
    eq(r.state, 'true_empty', 'L: an explicit not_found/unknown_symbol → definitive true_empty');
    eq(failMsg('4H', r), '4H — no backend candles available', 'L: the genuine no-data copy');
  }

  section('M. Diagnostics — the [SWING-CHART-LOAD] state machine is logged (no per-candle spam)');
  {
    reset(); setSel('V', 5);
    fetchImpl = (sym, tf, nth) => (nth >= 3 ? okC(60) : empty());
    await call('V', '4H', 5);
    const want = ['read_start', 'read_empty', 'warmup_start', 'warmup_complete', 'reread_attempt=1', 'reread_success'];
    want.forEach((t) => ok(loadLogs.some((l) => l.indexOf(t) >= 0), 'M: logged ' + t));
    ok(loadLogs.every((l) => !/close=|open=|"o":|\bcandles\[/.test(l)), 'M: no per-candle payload in the logs');
    ok(loadLogs.some((l) => /generation=5/.test(l)), 'M: logs carry the generation');
  }

  section('N. Render wiring — start/complete/aborted + reqId threading');
  {
    const r = stripComments(extractFn(HTML, '_swingRenderCharts'));
    ok(/_swingChartLoadLog\('start symbol=/.test(r), 'N: per-render start with scope + generation');
    ok(/_swingChartLoadLog\('complete symbol=/.test(r), 'N: per-render complete');
    ok(/_swingChartLoadLog\('aborted symbol=/.test(r), 'N: aborted on a superseded render');
    ok(/_swingGetChartCandles\(symbol, '1D', reqId\)/.test(r) && /_swingGetChartCandles\(symbol, '4H', reqId\)/.test(r),
       'N: threads the generation into the candle load');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
