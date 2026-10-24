'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FF_BACKEND_CANDLES_PORTFOLIO_CHARTS — pure-helper validation.
//
// Tests prove:
//   1.  flag default false (no localStorage)
//   2.  flag true only when localStorage key is '1'
//   3.  backend read response maps to Portfolio chart candle shape (read-first)
//   4.  backend 4H uses candle-store read endpoint; ensure uses 1D+30M+4H; read-first
//   5.  backend failure returns fallbackReason
//   5b. read-first / warm-only-if-needed (warm cache skips warmup; cold warms once)
//   6.  uses backend candle-store endpoints in the Portfolio chart helper
//   7.  no Yahoo string in the new backend Portfolio chart helper
//   8.  no new WebSocket usage in the Portfolio chart helper
//   9.  flag false leaves legacy getDailyCandles / getFourHourCandles path unchanged
//   10. flag ON gates frontend Candle subscriptions out of _pfToggleChart
//   11. flag ON: neutral 4H/1D state + backend SPY for the RS panel
//   12. QQQ expanded row uses active-symbol backend 1D candles, not SPY/fan-out
//   13. candle-store nested timeframe response shape maps to QQQ 1D candles
//
// Run: node tests/portfolio-backend-candles.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

// Extracts a named function (async or sync) from source, preserving async prefix.
function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inS) inS = null;
        continue;
      }
      if (c === '/' && n === '/') { inLine = true; j++; continue; }
      if (c === '/' && n === '*') { inBlock = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
  }
  throw new Error('function not found: ' + name);
}

function stripComments(src) {
  let out = '', inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = 0; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      out += c;
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

// Removes fire-and-forget _recordCandleSubscriptionRequest(...) telemetry calls so
// the structural source assertions below match the real request logic (warmup
// timeframes, /warmup count) rather than diagnostic metadata strings that the
// observability layer embeds (e.g. timeframes:['1D','4H'], 'POST .../warmup').
function stripCandleDiag(src) {
  const marker = '_recordCandleSubscriptionRequest(';
  let out = src, idx;
  while ((idx = out.indexOf(marker)) >= 0) {
    let depth = 0, inS = null, esc = false, end = -1;
    for (let j = idx + marker.length - 1; j < out.length; j++) {
      const c = out[j];
      if (inS) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inS) inS = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end < 0) break; // unbalanced — leave source intact rather than corrupt it
    let tail = end + 1;
    if (out[tail] === ';') tail++;
    out = out.slice(0, idx) + out.slice(tail);
  }
  return out;
}

// ── build sandbox ─────────────────────────────────────────────────────────────
const mockLS = {};
const sandbox = {
  console,
  Date, Math, JSON, Number, Boolean, Intl, String,
  isFinite, parseFloat, parseInt, encodeURIComponent,
  AbortSignal: { timeout: () => ({}) },
  BACKEND: 'https://api.test',
  _backendAuthHeaders: (extra) => Object.assign({ 'X-Test': '1' }, extra || {}),
  // Subscription-diagnostics recorder — a fire-and-forget side-channel the fetch
  // helpers call for telemetry; stubbed no-op here since it is outside the
  // behavior under test (covered by tests/candle-subscription-diagnostics.test.js).
  _recordCandleSubscriptionRequest: () => {},
  // Backend auth gate stubs — open by default so the fetch-behavior tests exercise the GET/warmup path.
  _backendCandleGateOpen: () => true,
  _backendCandleGateReason: () => 'open',
  _noteBackendCandleFailure: () => {},
  _noteBackendCandleSuccess: () => {},
  _recordCandleProvenance: () => {},
  APEX_PARITY_TOL: 0.0001,
  localStorage: {
    getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
    setItem:    (k, v) => { mockLS[k] = v; },
    removeItem: (k) => { delete mockLS[k]; },
  },
  fetch: null, // overridden per-test
  Object,
  Array,
  Promise,
};
vm.createContext(sandbox);

const FNS = [
  '_extractBackend4hDiag',
  'ffPreferBackendCandlesForCharts',
  'ffBackendCandlesPortfolioCharts',
  '_apexParityNormCandleArray', '_apexParityNormCandle', '_apexParityNormTime',
  '_apexParityExtractBackendCandles',
  '_portfolioFetchBackendCandlesForChart',
  // Portfolio chart price alignment (and the Swing helpers it reads) — real functions, no copies.
  '_etMinutes', '_etDateStr', 'getUsEquityMarketSession', '_swingExpectedNewestSessionDate',
  '_backendCandleStoreChartNormTime', '_swingCandleTimeMs', 'patchLastCandleWithLivePrice',
  'resolveLatestDisplayPrice', '_swingRowPriceObservedAt', '_swingResolveRenderPrice',
  '_portfolioRowUnderlyingPrice', '_pfBarSession', '_pfResolveChartPrice', '_pfDeriveDailyFromFourH', '_pfAlignedCandles',
  '_pfStaleBarNote', '_pfLogChartPrice',
  // SPY benchmark cache policy (read once per TTL, shared by the RS panel and the alignment RS).
  '_pfSpyBenchmarkNeeded', '_pfSpyBenchmarkSeries',
];
// The three constants the benchmark helpers read: copied from the source text, not retyped.
const SPY_CONSTS = ['_PF_SPY_BENCHMARK_TTL_MS', '_PF_SPY_RETRY_MS', '_pfSpyLastAttemptAt']
  .map((n) => { const m = HTML.match(new RegExp('^var ' + n + '\\s*=[^;]*;', 'm')); if (!m) throw new Error('constant not found: ' + n); return m[0]; })
  .join('\n');
vm.runInContext(SPY_CONSTS + '\n' + FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// Build N synthetic daily bars (normalized {t,o,h,l,c,v} shape).
function bars(n, base) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = base + i * 0.5;
    out.push({ t: ms0 + i * 86400000, o: c - 0.1, h: c + 0.5, l: c - 0.5, c, v: 1000 });
  }
  return out;
}

// Convert internal {t,o,h,l,c,v} bars to backend ISO-timestamp shape.
function toBackendShape(rawBars) {
  return rawBars.map((c) => ({
    time: new Date(c.t).toISOString(),
    open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v,
  }));
}

// Mock fetch that consumes responses in order.
function makeFetch(responses) {
  let idx = 0;
  return function(/* url, opts */) {
    const resp = responses[idx++] || { ok: true, status: 200, body: {} };
    const isOk = resp.ok !== false;
    return Promise.resolve({
      ok:     isOk,
      status: resp.status || (isOk ? 200 : 500),
      json:   () => Promise.resolve(resp.body || {}),
    });
  };
}

// URL-aware fetch router that records call counts per endpoint kind.
// routes: { read1d: [resp, ...], read4h: [...], warmup: [...] }
// Each kind consumes its response list in order (last entry repeats).
// This lets read-first tests assert whether/when /warmup was called.
function makeRouter(routes) {
  const calls = { read1d: 0, read4h: 0, warmup: 0, other: 0, urls: [] };
  const fn = function(url /*, opts */) {
    calls.urls.push(url);
    let kind = 'other';
    if (/\/market\/candles\/ensure/.test(url) || /\/warmup/.test(url)) kind = 'warmup';
    else if (/timeframe=1D/.test(url))   kind = 'read1d';
    else if (/timeframe=4H/.test(url))   kind = 'read4h';
    calls[kind]++;
    const list = routes[kind] || [];
    const resp = list[Math.min(calls[kind] - 1, list.length - 1)] || { ok: true, body: {} };
    const isOk = resp.ok !== false;
    return Promise.resolve({
      ok:     isOk,
      status: resp.status || (isOk ? 200 : 500),
      json:   () => Promise.resolve(resp.body || {}),
    });
  };
  fn.calls = calls;
  return fn;
}

(async () => {

// ── 1. flag defaults to the global chart policy (DEFAULT ON) ───────────────────
section('1. FF_BACKEND_CANDLES_PORTFOLIO_CHARTS delegates to global policy (default ON)');
ok(sandbox.ffPreferBackendCandlesForCharts() === true, 'global chart policy defaults ON');
ok(sandbox.ffBackendCandlesPortfolioCharts() === true, 'returns true (global default) with no per-surface key');

// ── 2. per-surface override: "1" forces ON, "0" forces OFF ────────────────────
section('2. per-surface override via localStorage');
sandbox.localStorage.setItem('apex_ff_backend_candles_portfolio_charts', '1');
ok(sandbox.ffBackendCandlesPortfolioCharts() === true,  'returns true when key==="1"');
sandbox.localStorage.setItem('apex_ff_backend_candles_portfolio_charts', '0');
ok(sandbox.ffBackendCandlesPortfolioCharts() === false, 'returns false when key==="0" (explicit per-surface disable)');
sandbox.localStorage.removeItem('apex_ff_backend_candles_portfolio_charts');
ok(sandbox.ffBackendCandlesPortfolioCharts() === true, 'returns true (global default) after key removed');

section('2b. non-"0"/"1" values fall through to the global policy (ON)');
['true', 'yes', '', 'false'].forEach((v) => {
  sandbox.localStorage.setItem('apex_ff_backend_candles_portfolio_charts', v);
  ok(sandbox.ffBackendCandlesPortfolioCharts() === true, 'follows global default when value="' + v + '"');
});
sandbox.localStorage.removeItem('apex_ff_backend_candles_portfolio_charts');

section('2c. global disable propagates to the per-surface flag');
sandbox.localStorage.setItem('apex_ff_prefer_backend_candles_charts', '0');
ok(sandbox.ffBackendCandlesPortfolioCharts() === false, 'per-surface follows global OFF with no override');
sandbox.localStorage.setItem('apex_ff_backend_candles_portfolio_charts', '1');
ok(sandbox.ffBackendCandlesPortfolioCharts() === true, 'per-surface "1" still forces ON even when global OFF');
sandbox.localStorage.removeItem('apex_ff_backend_candles_portfolio_charts');
sandbox.localStorage.removeItem('apex_ff_prefer_backend_candles_charts');

// ── 3. backend read response maps to Portfolio chart candle shape ──────────────
//      (read-first: warm cache → cached GETs only, no /warmup)
section('3. backend read response maps to Portfolio chart candle shape');
{
  const raw1d = bars(25, 500);
  const raw4h = bars(22, 480);
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(raw1d) } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(raw4h) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,                           '3: result.ok is true');
  ok(r.source === 'BACKEND_CANDLE_STORE',     '3: source is BACKEND_CANDLE_STORE');
  ok(Array.isArray(r.candles1d),              '3: candles1d is an array');
  ok(r.candles1d.length === 25,               '3: candles1d has 25 bars');
  ok(f.calls.warmup === 0,                    '3: warm cache → /warmup NOT called');

  // Portfolio chart renderer expects {time, open, high, low, close, volume, source}
  const c0 = r.candles1d[0];
  ok(typeof c0.time   === 'number',  '3: candle.time is epoch-ms number');
  ok(typeof c0.open   === 'number',  '3: candle.open is number');
  ok(typeof c0.high   === 'number',  '3: candle.high is number');
  ok(typeof c0.low    === 'number',  '3: candle.low is number');
  ok(typeof c0.close  === 'number',  '3: candle.close is number');
  ok(typeof c0.volume === 'number',  '3: candle.volume is number');
  ok(c0.source === 'BACKEND_CANDLE_STORE', '3: candle.source === BACKEND_CANDLE_STORE');

  ok(Array.isArray(r.candles4h) && r.candles4h.length >= 20, '3: candles4h populated');
  ok(r.candles4h[0].source === 'BACKEND_CANDLE_STORE',     '3: 4H candle.source correct');
}
{
  // Verify normalization sorts ascending by time even when backend returns reversed order.
  const raw = bars(30, 400);
  const reversed = toBackendShape([...raw].reverse());
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: reversed } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(raw.slice(0, 20)) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('AAPL');
  ok(r.ok && r.candles1d[0].time < r.candles1d[r.candles1d.length - 1].time,
    '3: candles1d sorted ascending by time');
  ok(f.calls.warmup === 0, '3: warm cache (sorted) → /warmup NOT called');
}

// ── 4. backend 4H uses candle-store read endpoint; ensure read-first ─────────
section('4. 4H uses candle-store read endpoint; ensure uses 1D+30M+4H; read-first');
{
  const src = stripCandleDiag(stripComments(extractFn(HTML, '_portfolioFetchBackendCandlesForChart')));

  ok(/\/market\/candles\?symbol=/.test(src), '4: read uses /market/candles?symbol= endpoint');
  ok(/timeframe=' \+ encodeURIComponent\(tf\)/.test(src) || /timeframe=/.test(src), '4: read endpoint includes timeframe query');
  ok(/\/market\/candles\/ensure/.test(src), '4: ensure endpoint present');
  ok(/'1D'/.test(src) && /'30M'/.test(src) && /'4H'/.test(src), '4: ensure requests 1D+30M+4H for store-backed 4H derivation');

  const readIdx = src.indexOf('/market/candles?symbol=');
  const ensureIdx = src.indexOf('/market/candles/ensure');
  ok(readIdx >= 0 && ensureIdx >= 0 && readIdx < ensureIdx,
    '4: candle-store read is positioned before /market/candles/ensure (read-first)');
}

// ── 5. backend failure returns fallbackReason ─────────────────────────────────
section('5. backend failure returns fallbackReason');
{
  // 1D read empty (insufficient) → warmup attempted → warmup HTTP error.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: [] } }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: false, status: 503 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,                          '5: ok false on warmup HTTP failure');
  ok(typeof r.fallbackReason === 'string',    '5: fallbackReason is a string');
  ok(/ensure/.test(r.fallbackReason),         '5: fallbackReason mentions ensure');
  ok(/503/.test(r.fallbackReason),            '5: fallbackReason includes HTTP status');
  ok(f.calls.warmup === 1,                    '5: warmup attempted once when 1D missing');
}
{
  // 1D read returns HTTP error both before and after warmup → 1D_http_.
  const f = makeRouter({
    read1d: [{ ok: false, status: 404 }, { ok: false, status: 404 }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,             '5: ok false on persistent 1D HTTP failure');
  ok(/1D/.test(r.fallbackReason), '5: fallbackReason mentions 1D');
  ok(f.calls.warmup === 0,        '5: ensure is not attempted when 1D read returns HTTP error');
}
{
  // 1D returns fewer than 20 bars before and after warmup → 1D_insufficient.
  const fewBars = toBackendShape(bars(10, 100));
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: fewBars } }, { ok: true, body: { candles: fewBars } }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,                          '5: ok false when 1D insufficient after warmup');
  ok(/1D_insufficient/.test(r.fallbackReason), '5: fallbackReason is 1D_insufficient');
  ok(f.calls.warmup === 1,                    '5: warmup attempted once when 1D insufficient');
}
{
  // 1D usable on first read; 4H read fails → non-fatal, ok true, no warmup.
  const good1d = toBackendShape(bars(25, 400));
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: good1d } }],
    read4h: [{ ok: false, status: 500 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,             '5: ok true even when 4H fails (non-fatal)');
  ok(r.candles4h === null,      '5: candles4h null when 4H HTTP fails');
  ok(r.candles1d.length >= 20,  '5: candles1d still populated when 4H fails');
  ok(f.calls.warmup === 0,      '5: usable 1D → no warmup even if 4H fails');
}

// ── 5b. read-first / warm-only-if-needed behavior ─────────────────────────────
section('5b. read-first: warm cache skips warmup; cold cache warms once then re-reads');
{
  // Warm cache: usable 1D + 4H on first read → return immediately, no warmup.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(bars(25, 300)) } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(bars(21, 290)) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('AAPL');
  ok(r.ok === true,                  '5b: warm cache → ok true');
  ok(f.calls.warmup === 0,           '5b: warm cache → /warmup NOT called');
  ok(f.calls.read1d === 1,           '5b: warm cache → 1D read exactly once (no re-read)');
  ok(r.diagnostics.warmed === false, '5b: diagnostics.warmed is false for warm cache');
}
{
  // Cold cache: 1D empty first, warmup once, then 1D+4H usable on re-read.
  const good1d = toBackendShape(bars(25, 300));
  const good4h = toBackendShape(bars(22, 290));
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: [] } },        // cold first read
             { ok: true, body: { candles: good1d } }],   // re-read after warmup
    read4h: [{ ok: true, body: { candles: [] } },
             { ok: true, body: { candles: good4h } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('NVDA');
  ok(r.ok === true,                 '5b: cold cache → ok true after warmup+re-read');
  ok(f.calls.warmup === 1,          '5b: cold cache → /warmup called exactly once');
  ok(f.calls.read1d === 2,          '5b: cold cache → 1D read twice (read-first + re-read)');
  ok(r.candles1d.length === 25,     '5b: cold cache → 1D candles populated after re-read');
  ok(r.candles4h && r.candles4h.length === 22, '5b: cold cache → 4H re-read populated');
  ok(r.diagnostics.warmed === true, '5b: diagnostics.warmed is true after warmup');
}

// ── 6. uses backend candle-store endpoints in Portfolio chart helper ──────────
section('6. uses /market/candles store endpoints in _portfolioFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_portfolioFetchBackendCandlesForChart'));
  ok(/\/market\/candles\?symbol=/.test(src),
    '6: uses /market/candles?symbol= store read endpoint');
  ok(/\/market\/candles\/ensure/.test(src),
    '6: uses /market/candles/ensure single-symbol ensure endpoint');
  ok(!/\/dev\/market\/candles-dxlink\//.test(src),
    '6: no /dev/market/candles-dxlink read path in Portfolio helper');
}

// ── 7. no Yahoo string in the new backend Portfolio chart helper ───────────────
section('7. no Yahoo in _portfolioFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_portfolioFetchBackendCandlesForChart'));
  ok(!/yahoo/i.test(src), '7: no Yahoo reference in portfolio backend helper');
}

// ── 8. no new WebSocket usage ─────────────────────────────────────────────────
section('8. no new WebSocket in _portfolioFetchBackendCandlesForChart');
{
  const src = extractFn(HTML, '_portfolioFetchBackendCandlesForChart');
  ok(!/new WebSocket/.test(src), '8: helper opens no WebSocket');
}

// ── 9. flag false leaves legacy getDailyCandles / getFourHourCandles path ──────
section('9. flag false: legacy getDailyCandles / getFourHourCandles path unchanged');
{
  const src = stripComments(extractFn(HTML, '_pfDrawTf'));
  ok(/getDailyCandles/.test(src),        '9: _pfDrawTf still calls getDailyCandles');
  ok(/getFourHourCandles/.test(src),     '9: _pfDrawTf still calls getFourHourCandles');
  ok(/ffBackendCandlesPortfolioCharts/.test(src), '9: flag check present in _pfDrawTf');

  // getDailyCandles must appear as a fallback — after the flag check
  const flagIdx    = src.indexOf('ffBackendCandlesPortfolioCharts');
  const dailyIdx   = src.lastIndexOf('getDailyCandles');
  ok(dailyIdx > flagIdx, '9: getDailyCandles fallback is positioned after flag check');

  // Explicit per-surface "0" forces the legacy path active.
  sandbox.localStorage.setItem('apex_ff_backend_candles_portfolio_charts', '0');
  ok(sandbox.ffBackendCandlesPortfolioCharts() === false,
    '9: explicit per-surface "0" → legacy path is active');
  sandbox.localStorage.removeItem('apex_ff_backend_candles_portfolio_charts');
}
{
  // ffBackendCandlesPortfolioCharts reads localStorage and delegates to the global policy
  const src = stripComments(extractFn(HTML, 'ffBackendCandlesPortfolioCharts'));
  ok(/localStorage/.test(src), '9: flag reads localStorage');
  ok(/ffPreferBackendCandlesForCharts\(\)/.test(src), '9: flag delegates to the global chart policy');
}

// ── 10. flag ON: row expansion opens no direct frontend Candle subscriptions ──
section('10. flag ON gates frontend Candle subscriptions out of _pfToggleChart');
{
  const src = stripComments(extractFn(HTML, '_pfToggleChart'));

  // The legacy subscription calls must still exist (flag OFF path)…
  ok(/_ensureCandleSubscription\(\s*ticker\s*,\s*'user_expanded_position'\s*\)/.test(src),
    '10: legacy user_expanded_position candle subscription still present (flag OFF path)');
  ok(/_ensure30MSubscription\(\s*'SPY'\s*,\s*'benchmark'\s*\)/.test(src),
    '10: legacy 30M SPY benchmark subscription still present (flag OFF path)');

  // …but the whole block must sit behind a !ffBackendCandlesPortfolioCharts() guard.
  const guardIdx = src.indexOf('!ffBackendCandlesPortfolioCharts()');
  const subIdx   = src.indexOf("_ensureCandleSubscription(ticker, 'user_expanded_position')");
  const sub30Idx = src.indexOf("_ensure30MSubscription(ticker, 'user_expanded_position')");
  ok(guardIdx >= 0, '10: _pfToggleChart contains a !ffBackendCandlesPortfolioCharts() subscription guard');
  ok(guardIdx >= 0 && subIdx   >= 0 && guardIdx < subIdx,
    '10: candle subscription is gated behind !ffBackendCandlesPortfolioCharts()');
  ok(guardIdx >= 0 && sub30Idx >= 0 && guardIdx < sub30Idx,
    '10: 30M subscription is gated behind !ffBackendCandlesPortfolioCharts()');
}

// ── 11. flag ON: neutral state + backend SPY for RS panel in _pfDrawTf ─────────
section('11. flag ON: neutral 4H/1D state and backend SPY for RS panel');
{
  const src = stripComments(extractFn(HTML, '_pfDrawTf'));

  // Neutral backend-unavailable state for THIS tf only, gated by the flag,
  // appearing before the legacy DXLink poller (setInterval).
  ok(/unavailable from backend/i.test(src),
    '11: neutral backend-unavailable state present for flag ON');
  const flagIdx     = src.indexOf('ffBackendCandlesPortfolioCharts');
  const intervalIdx = src.indexOf('setInterval');
  ok(flagIdx >= 0 && intervalIdx >= 0 && flagIdx < intervalIdx,
    '11: flag-gated neutral state precedes the legacy DXLink poller');

  // RS panel prefers the backend SPY cache so no frontend SPY subscription is needed.
  ok(/_pfBackendSpyCache/.test(src),
    '11: _pfDrawTf reads backend SPY cache for the RS panel');
  // Legacy SPY buffer read remains as a no-subscription fallback.
  ok(/getDailyCandles\('SPY'\)/.test(src) && /getFourHourCandles\('SPY'\)/.test(src),
    '11: legacy SPY buffer read retained as non-subscription fallback');
}
{
  // _pfDrawChart fetches SPY from the backend (read-first) for the RS panel.
  const src = stripComments(extractFn(HTML, '_pfDrawChart'));
  ok(/_pfBackendSpyCache/.test(src),
    '11: _pfDrawChart populates _pfBackendSpyCache');
  ok(/_portfolioFetchBackendCandlesForChart/.test(src),
    '11: _pfDrawChart uses the read-first backend helper');
}



// ── 12. QQQ expanded row renders active-symbol backend 1D candles ─────────────
section('12. QQQ expanded row uses active-symbol backend 1D candles, not SPY/fan-out');
{
  vm.runInContext([
    extractFn(HTML, '_pfNormalizeChartUnderlyingSymbol'),
    extractFn(HTML, '_pfDrawChart'),
    extractFn(HTML, '_pfDrawTf'),
  ].join('\n'), sandbox);

  const qqq1d = bars(25, 430).map((c) => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v, source: 'BACKEND_CANDLE_STORE' }));
  const spy1d = bars(25, 500).map((c) => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v, source: 'BACKEND_CANDLE_STORE' }));
  const calls = { fetchSymbols: [], draw: [], dailyFallback: [], fanout: [] };
  sandbox._pfExpandedPosId = 101;
  sandbox._pfBackendCandleCache = null;
  sandbox._pfBackendSpyCache = { candles1d: spy1d, candles4h: null, source: 'BACKEND_DXLINK_CANDLES' };
  sandbox.S = { scanData: [] };
  sandbox.document = { getElementById: (id) => ({ id, textContent: '', innerHTML: '', style: {}, offsetWidth: 320, offsetHeight: 180 }) };
  sandbox._portfolioFetchBackendCandlesForChart = async (sym) => {
    calls.fetchSymbols.push(sym);
    if (sym === 'QQQ') return { ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: qqq1d, candles4h: null };
    if (sym === 'SPY') return { ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: spy1d, candles4h: null };
    return { ok: false, fallbackReason: 'unexpected_symbol' };
  };
  sandbox._recordBackendCandleProvenance = () => {};
  sandbox.getDailyCandles = (sym) => { calls.dailyFallback.push(sym); return sym === 'SPY' ? spy1d : []; };
  sandbox.getFourHourCandles = () => [];
  sandbox._patchLivePrice = (candles) => candles;
  sandbox.computeCandleIndicators = () => ({ lastSma8: 1, lastRsi: 55, rsi: new Array(25).fill(55), lastSqueeze: false, squeeze: new Array(25).fill(false) });
  sandbox.getCandleDataSource = () => 'FRONTEND_DXLINK_BUFFER';
  sandbox._drawCandleChart = (wrapId, candles, ind, opts) => { calls.draw.push({ wrapId, candles, opts }); };
  sandbox._mcxDrawRsi = () => {}; sandbox._pfDrawRsiPanel = () => {};
  sandbox._pfDrawRsPanel = () => {};
  sandbox._pfUpdateAlignment = () => {};
  sandbox.prepareHiDPICanvas = () => ({ ctx: {}, width: 320, height: 180 });

  await sandbox._pfDrawChart(101, 'qqq');

  ok(calls.fetchSymbols.length === 1 && calls.fetchSymbols[0] === 'QQQ',
    '12: single-symbol backend ensure/read called only for normalized QQQ');
  ok(!calls.fetchSymbols.includes('SPY'),
    '12: SPY benchmark backend candles are not fanned out during QQQ chart open');
  const oneDayDraw = calls.draw.find((d) => d.wrapId === 'pf-1d-wrap-101');
  ok(!!oneDayDraw, '12: 1D candle chart render is invoked');
  ok(oneDayDraw && oneDayDraw.candles === qqq1d && oneDayDraw.candles.length > 0,
    '12: 1D chart receives non-empty QQQ backend candles');
  ok(oneDayDraw && oneDayDraw.candles !== spy1d,
    '12: SPY benchmark candles are not used as QQQ active candles');
  // The fixture bars are from January 2024, so the badge also says how old the last bar is.
  ok(oneDayDraw && oneDayDraw.opts && oneDayDraw.opts.source === 'BACKEND_CANDLE_STORE · last bar 2024-01-26 (stale)',
    '12: chart source is BACKEND_CANDLE_STORE, with its stale last bar named (got ' + (oneDayDraw && oneDayDraw.opts && oneDayDraw.opts.source) + ')');
  ok(calls.dailyFallback.indexOf('QQQ') === -1,
    '12: QQQ frontend daily fallback is not used when backend QQQ candles exist');
  ok(!/backend-derived|technical \(backend-derived\)|RSI/.test(String(sandbox.document.getElementById('pf-1d-wrap-101').innerHTML || '')),
    '12: text-only technical fallback is not rendered when candles exist');
}



// ── 13. candle-store nested timeframe response shape maps to QQQ candles ──────
section('13. candle-store nested timeframe response shape maps to QQQ 1D candles');
{
  const raw1d = bars(26, 430);
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, symbol: 'QQQ', timeframes: { '1D': { candles: toBackendShape(raw1d) } } } }],
    read4h: [{ ok: true, body: { ok: true, symbol: 'QQQ', timeframes: { '4H': { candles: [] } } } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._portfolioFetchBackendCandlesForChart('QQQ');
  ok(r.ok === true, '13: nested timeframes.1D response returns ok true');
  ok(r.candles1d && r.candles1d.length >= 20, '13: QQQ nested 1D candles are parsed and mapped');
  ok(r.source === 'BACKEND_CANDLE_STORE', '13: nested response source is BACKEND_CANDLE_STORE');
  ok(f.calls.warmup === 0, '13: valid nested QQQ 1D response does not call ensure');
}

// ── 14. 1D and 4H end on ONE price whose trading session is proven ───────────
section('14. Portfolio charts end on one session-proven price; the position price never enters a bar');
{
  // Series are built relative to the real clock: D = the newest trading session that can exist now.
  const D = sandbox._swingExpectedNewestSessionDate(Date.now());
  const day = (ds, h, m) => Date.parse(ds + 'T00:00:00Z') + ((h || 0) * 60 + (m || 0)) * 60000;
  const shift = (ds, n) => new Date(Date.parse(ds + 'T00:00:00Z') + n * 86400000).toISOString().substring(0, 10);
  // n bars ending on `lastMs`, `stepMs` apart; each bar's close = base + i * 0.5, the last one = lastClose.
  const series = (n, lastMs, stepMs, base, lastClose) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = i === n - 1 ? lastClose : base + i * 0.5;
      out.push({ time: lastMs - (n - 1 - i) * stepMs, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_CANDLE_STORE' });
    }
    return out;
  };
  // RTH-style 4H bars: two per calendar day (09:30 and 13:30 EDT = 13:30Z / 17:30Z) over [fromDate, toDate];
  // open = the day's index + 0.0 / close = + 0.5, last bar's close = lastClose.
  const rth4h = (fromDate, toDate, lastClose) => {
    const out = []; let n = 0;
    for (let ms = day(fromDate); ms <= day(toDate); ms += 86400000) {
      [[13, 30], [17, 30]].forEach((hm, k) => {
        const base = 240 + n * 0.01;
        out.push({ time: ms + (hm[0] * 60 + hm[1]) * 60000, open: base, high: base + 2 + k, low: base - 2 - k, close: base + 0.5 * (k + 1), volume: 100 + k, source: 'BACKEND_CANDLE_STORE' });
        n++;
      });
    }
    out[out.length - 1].close = lastClose;
    return out;
  };
  const d1 = (lastDate, lastClose) => series(25, day(lastDate), 86400000, 240, lastClose);          // 1D bars are stamped at 00:00Z of their date
  const h4 = (lastDate, lastClose) => series(25, day(lastDate, 17, 30), 4 * 3600000, 240, lastClose); // 17:30Z = 13:30 ET, inside session `lastDate`

  const run = (c1, c4, scanData, pos) => {
    const draw = [];
    sandbox._pfExpandedPosId = 202;
    sandbox._pfBackendCandleCache = { symbol: 'IBM', candles1d: c1, candles4h: c4, source: 'BACKEND_CANDLE_STORE' };
    sandbox.S = { scanData };
    sandbox.positionManager = { getById: (id) => (id === 202 ? pos : null) };
    sandbox._drawCandleChart = (wrapId, candles, ind, opts) => { draw.push({ wrapId, candles, last: candles[candles.length - 1], source: opts && opts.source }); };
    sandbox._pfDrawTf(202, 'IBM', '1D');
    sandbox._pfDrawTf(202, 'IBM', '4H');
    return { d1: draw.find((d) => d.wrapId === 'pf-1d-wrap-202'), d4: draw.find((d) => d.wrapId === 'pf-4h-wrap-202') };
  };

  // The real IBM case (2026-10-24): 1D store stuck on 12 Aug @ 235.98, 4H current @ 253.58, and the
  // portfolio refresh handing back the stale 235.98 as the "underlying price".
  const staleD = shift(D, -73);
  const c1 = d1(staleD, 235.98), c4 = rth4h(shift(D, -140), D, 253.58);
  const lastBefore4 = JSON.stringify(c4[c4.length - 1]);
  const a = run(c1, c4, [], { underlyingPrice: 235.98, underlyingPriceSource: 'BACKEND_PORTFOLIO_REFRESH' });
  ok(a.d4 && a.d4.last.close === 253.58 && JSON.stringify(a.d4.last) === lastBefore4 && a.d4.candles === c4,
    '14: IBM — the current 4H bar is NOT overwritten by the position price (no fabricated -7% candle)');
  ok(a.d1 && a.d1.last.close === 253.58 && a.d4.last.close === 253.58,
    '14: IBM — the 1D chart now ends on the same current close as the 4H');
  ok(a.d1 && a.d1.candles.length === c1.length + 73 && a.d1.candles.slice(0, c1.length).every((x, i) => x === c1[i]),
    '14: IBM — the 73 missing sessions are appended and every served 1D bar is kept as is');
  const dl = a.d1 && a.d1.candles[a.d1.candles.length - 1];
  const lastDay4 = c4.slice(-2);
  ok(dl && dl.derived === true && dl.source === 'DERIVED_FROM_4H' && dl.time === day(D)
    && dl.open === lastDay4[0].open && dl.close === 253.58 && dl.high === Math.max(lastDay4[0].high, lastDay4[1].high)
    && dl.low === Math.min(lastDay4[0].low, lastDay4[1].low) && dl.volume === lastDay4[0].volume + lastDay4[1].volume,
    '14: IBM — the newest derived 1D bar is that session\'s 4H bars: first open, last close, highest high, lowest low, summed volume');
  ok(a.d1 && a.d1.source === 'BACKEND_CANDLE_STORE · 73 daily bar(s) derived from 4H',
    '14: IBM — the 1D badge says how many bars were derived and no longer calls the series stale (got ' + (a.d1 && a.d1.source) + ')');
  ok(a.d4 && a.d4.source === 'BACKEND_CANDLE_STORE',
    '14: IBM — the 4H badge is plain (got ' + (a.d4 && a.d4.source) + ')');

  ok(c1.length === 25 && c1[24].close === 235.98 && c1.every((x) => !x.derived), '14: the served 1D array itself is never modified');
  // The 4H series does not reach back to the 1D series' last session → nothing is derived (a session could be missing).
  const shortH4 = rth4h(shift(D, -30), D, 253.58);
  const noCover = run(c1, shortH4, [], null);
  ok(noCover.d1.candles === c1 && noCover.d1.last.close === 235.98 && noCover.d1.source === 'BACKEND_CANDLE_STORE · last bar ' + staleD + ' (stale)',
    '14: 4H not reaching the last 1D session → 1D left exactly as served and named stale (got ' + noCover.d1.source + ')');
  // A bad bar inside the gap leaves the series as served.
  const badH4 = rth4h(shift(D, -140), D, 253.58); badH4[badH4.length - 5].high = 'x';
  ok(run(c1, badH4, [], null).d1.candles === c1, '14: a non-numeric 4H bar inside the gap → nothing derived');
  const badTime = rth4h(shift(D, -140), D, 253.58); badTime[badTime.length - 5].time = 'garbage';
  ok(run(c1, badTime, [], null).d1.candles === c1, '14: an unparseable 4H time → nothing derived');
  // Each OHLC field must be numeric, wherever in the gap the bad bar sits.
  ['open', 'close', 'low', 'high'].forEach((k) => {
    const bad = rth4h(shift(D, -140), D, 253.58); bad[bad.length - 7][k] = 'x'; bad[bad.length - 8][k] = 'x';   // both bars of one session
    ok(run(c1, bad, [], null).d1.candles === c1, '14: a non-numeric 4H ' + k + ' inside the gap → nothing derived');
  });
  // Direct calls: identity when nothing is derived, unparseable last 1D bar, missing volume, order independence, coverage edge.
  const dd = sandbox._pfDeriveDailyFromFourH;
  const cur = d1(D, 252);
  ok(dd(cur, rth4h(shift(D, -20), D, 253.58)) === cur, '14: no 4H session after the last 1D session → the very same array is returned');
  ok(dd(null, c4) === null && dd(cur, null) === cur && dd([], c4).length === 0 && dd(cur, []) === cur, '14: missing or empty inputs are returned as they came');
  const garbageLast = c1.slice(0, 24).concat([Object.assign({}, c1[24], { time: 'garbage' })]);
  ok(dd(garbageLast, c4) === garbageLast, '14: a last 1D bar with no readable date → nothing derived');
  const noVol = rth4h(shift(D, -140), D, 253.58).map((x) => { const y = Object.assign({}, x); delete y.volume; return y; });
  ok(dd(c1, noVol)[25].volume === 0, '14: 4H bars without volume give a derived volume of 0, not NaN');
  const shuffled = c4.slice().reverse();
  const fromShuffled = dd(c1, shuffled), fromSorted = dd(c1, c4);
  ok(fromShuffled.length === fromSorted.length && JSON.stringify(fromShuffled) === JSON.stringify(fromSorted),
    '14: the derived bars do not depend on the order the 4H bars arrive in');
  const edge = dd(c1, rth4h(staleD, D, 253.58));
  ok(edge.length === c1.length + 73, '14: a 4H series starting on the last 1D session itself already covers the gap');
  ok(dd(c1, rth4h(shift(staleD, 1), D, 253.58)) === c1, '14: a 4H series starting the day after the last 1D session does not (a session could be missing)');
  // Only sessions AFTER the last 1D bar are derived (the last served session is never rebuilt).
  const oneBehind = run(d1(shift(D, -1), 250), rth4h(shift(D, -20), D, 253.58), [], null);
  ok(oneBehind.d1.candles.length === 26 && oneBehind.d1.candles[24].close === 250 && oneBehind.d1.candles[25].derived === true
    && oneBehind.d1.last.close === 253.58, '14: 1D one session behind → exactly one bar derived, the served last bar untouched');

  // Both series current: the OLDER-stamped 1D bar of the same session ends on the newest close (1D/4H parity).
  const b = run(d1(D, 252), h4(D, 253.58), [], { underlyingPrice: 261.5 });
  ok(b.d4.last.close === 253.58 && b.d1.last.close === 253.58,
    '14: both series current → 1D and 4H end on the newest stored close (1D bar stamped 00:00Z counts as session ' + D + ')');
  ok(b.d1.last.high >= 253.58 && b.d1.last.low <= 252 && b.d1.last.open === 251.9,
    '14: the patched 1D bar keeps its own open and its range widens to include the close');
  ok(b.d1.last.close !== 261.5 && b.d4.last.close !== 261.5,
    '14: the position price (261.5) is ignored — it carries no session');

  // 4H lagging, 1D current: the 1D close is the price and the old 4H bar is left alone.
  const c4old = h4(shift(D, -9), 230);
  const c = run(d1(D, 250), c4old, [], { underlyingPrice: 261.5 });
  ok(c.d1.last.close === 250 && c.d4.last.close === 230 && c.d4.candles === c4old,
    '14: 4H lagging → 1D ends on its own close, the lagging 4H bar is left exactly as served');
  ok(/last bar .* \(stale\)$/.test(c.d4.source) && c.d1.source === 'BACKEND_CANDLE_STORE',
    '14: ... and only the 4H badge reports the stale bar');

  // No position price at all: nothing changes versus the served bars.
  const d = run(d1(D, 252), h4(D, 253.58), [], null);
  ok(d.d4.last.close === 253.58 && d.d1.last.close === 253.58, '14: no position row → same result (the position is not an input)');

  // A DXLink mark observed NOW (stamped) is a proven current-session price and keeps priority.
  sandbox._dssResolvePrice = (row) => ({ price: row.price, source: 'DXLink_RTH' });
  const today = sandbox._etDateStr(Date.now());
  const live = [{ ticker: 'IBM', _priceSource: 'DXLink', price: 260.25, bid: 260.2, _priceAt: Date.now() }];
  const e = run(d1(today, 252), h4(today, 253.58), live, { underlyingPrice: 235.98 });
  ok(e.d1.last.close === 260.25 && e.d4.last.close === 260.25,
    '14: a stamped live DXLink mark observed in the current session ends both series');
  const liveUnstamped = [{ ticker: 'IBM', _priceSource: 'DXLink', price: 260.25, bid: 260.2 }];
  const f = run(d1(today, 252), h4(today, 253.58), liveUnstamped, null);
  ok(f.d4.last.close === 253.58 && f.d1.last.close === 253.58,
    '14: a DXLink mark with no observation stamp cannot prove its session → the newest stored close is used instead');
  const liveOld = [{ ticker: 'IBM', _priceSource: 'DXLink', price: 260.25, bid: 260.2, _priceAt: Date.now() - 3 * 86400000 }];
  const g = run(d1(today, 252), h4(today, 253.58), liveOld, null);
  ok(g.d4.last.close === 253.58, '14: a live mark stamped in an earlier session is not written into the current bar');
  delete sandbox._dssResolvePrice;

  // A series whose last bar has no usable timestamp is left alone.
  const noTime = h4(D, 253.58).map((x) => Object.assign({}, x, { time: 'garbage' }));
  const h = run(d1(D, 252), noTime, [], { underlyingPrice: 261.5 });
  ok(h.d4.candles === noTime && h.d4.last.close === 253.58, '14: unparseable bar times → series untouched');

  // Trading date of a bar: 1D bars stamped 00:00Z ARE that date, any other stamp (and any 4H bar) reads as ET.
  const midnight = Date.UTC(2026, 6, 31);
  ok(sandbox._pfBarSession({ time: midnight }, true) === '2026-07-31', '14: a 1D bar stamped 00:00Z is its own date');
  ok(sandbox._pfBarSession({ time: midnight }, false) === '2026-07-30', '14: a 4H bar at 00:00Z is the previous ET evening, not a date-only stamp');
  ok(sandbox._pfBarSession({ time: midnight + 13.5 * 3600000 }, true) === '2026-07-31', '14: a 1D bar stamped 13:30Z (09:30 EDT) is that ET date');
  ok(sandbox._pfBarSession({ time: Date.UTC(2026, 0, 15, 5, 0) }, true) === '2026-01-15', '14: a 1D bar stamped at ET midnight in winter (05:00Z) is that date');
  ok(sandbox._pfBarSession({ time: 'garbage' }, true) === null && sandbox._pfBarSession({ time: 'garbage' }, false) === null && sandbox._pfBarSession(null, true) === null,
    '14: an unparseable or missing bar time has no session (not 1970-01-01)');

  // Which series owns the price: the newest bar by timestamp, labelled by its own timeframe.
  const rc = sandbox._pfResolveChartPrice('IBM', d1(D, 250), h4(shift(D, -9), 230), Date.now());
  ok(rc.price === 250 && rc.source === 'backend 1D' && rc.sessionDate === D, '14: newest bar is the 1D one → its close, labelled backend 1D, its date');
  const rc2 = sandbox._pfResolveChartPrice('IBM', d1(D, 250), h4(D, 253.58), Date.now());
  ok(rc2.price === 253.58 && rc2.source === 'backend 4H' && rc2.sessionDate === D, '14: a same-session 4H bar is newer than the 1D bar stamped 00:00Z → its close, labelled backend 4H');
  const rc3 = sandbox._pfResolveChartPrice('IBM', d1(staleD, 235.98), h4(D, 0), Date.now());
  ok(rc3.price === 235.98 && rc3.source === 'backend 1D', '14: a non-positive close on the newest bar is never a price (the next bar is used)');
  const rc4 = sandbox._pfResolveChartPrice('IBM', [], null, Date.now());
  ok(rc4.price === null && rc4.source === null && rc4.sessionDate === null, '14: no bars at all → no price');

  // A 1D bar of session D must not give its close to a 4H bar of the PREVIOUS session (the hybrid candle).
  const prev4h = h4(shift(D, -1), 248);
  const prevRes = run(d1(D, 250), prev4h, [], null);
  ok(prevRes.d4.last.close === 248 && prevRes.d4.candles === prev4h && prevRes.d1.last.close === 250,
    '14: 4H one session behind a current 1D bar → left exactly as served (no cross-session close)');

  // _pfAlignedCandles input handling (a valid cache is in place, so only the guard stops a null series).
  sandbox._pfBackendCandleCache = { symbol: 'IBM', candles1d: d1(D, 252), candles4h: h4(D, 253.58), source: 'X' };
  ok(sandbox._pfAlignedCandles('IBM', '1D', null) === null, '14: null series is returned as is');
  const emptySeries = [];
  ok(sandbox._pfAlignedCandles('IBM', '1D', emptySeries) === emptySeries, '14: empty series is returned as is');

  // The other timeframe counts only when it is the SAME symbol and a real series (>= 20 bars).
  sandbox._pfBackendCandleCache = { symbol: 'IBM', candles1d: null, candles4h: h4(D, 253.58).slice(-5), source: 'X' };
  const own1d = d1(D, 252);
  ok(sandbox._pfAlignedCandles('IBM', '1D', own1d) === own1d, '14: a 4H series shorter than 20 bars is ignored (own series untouched)');
  sandbox._pfBackendCandleCache = { symbol: 'OTHER', candles1d: null, candles4h: h4(D, 253.58), source: 'X' };
  ok(sandbox._pfAlignedCandles('IBM', '1D', own1d) === own1d, '14: another symbol\'s cached series is never used');
  sandbox._pfBackendCandleCache = { symbol: 'IBM', candles1d: null, candles4h: h4(D, 253.58), source: 'X' };
  ok(sandbox._pfAlignedCandles('IBM', '1D', own1d)[24].close === 253.58, '14: the same symbol\'s 4H series supplies the price for the 1D');

  // Without a provable session nothing is written: bars parse, but the date cannot be derived.
  const realEt = sandbox._etDateStr;
  sandbox._etDateStr = () => null;
  const own1dAgain = series(25, day(D, 13, 30), 86400000, 240, 252);   // 13:30Z: its session comes from the ET date
  ok(sandbox._pfAlignedCandles('IBM', '1D', own1dAgain) === own1dAgain, '14: price known but its session unknowable → series untouched');
  sandbox._etDateStr = realEt;

  // A badge only when the newest session is known and the bar is older than it.
  const realNewest = sandbox._swingExpectedNewestSessionDate;
  sandbox._swingExpectedNewestSessionDate = () => null;
  ok(sandbox._pfStaleBarNote(d1(staleD, 1), true) === '', '14: unknown newest session → no stale note');
  sandbox._swingExpectedNewestSessionDate = realNewest;
  ok(sandbox._pfStaleBarNote(d1(D, 1), true) === '' && sandbox._pfStaleBarNote(null, true) === '' && sandbox._pfStaleBarNote([], true) === '',
    '14: a current, missing or empty series has no stale note');
  ok(sandbox._pfStaleBarNote(d1(staleD, 1), true) === ' · last bar ' + staleD + ' (stale)', '14: a lagging 1D series is named with its own date');

  // Flag OFF: both series come from the frontend getters; the same rule applies.
  sandbox.localStorage.setItem('apex_ff_backend_candles_portfolio_charts', '0');
  const f1 = d1(D, 252), f4 = h4(D, 253.58);
  sandbox.getDailyCandles = () => f1; sandbox.getFourHourCandles = () => f4;
  const off = run(f1, f4, [], null);
  ok(off.d1.last.close === 253.58 && off.d4.last.close === 253.58, '14: flag OFF → the 1D series is aligned to the 4H close read from the frontend getters');
  sandbox.localStorage.removeItem('apex_ff_backend_candles_portfolio_charts');

  // Opening the chart logs the price line once.
  const openLogs = [];
  sandbox.console = { log: (...x) => openLogs.push(x.join(' ')), warn: () => {}, error: () => {} };
  sandbox._pfBackendSpyCache = null;
  sandbox._pfExpandedPosId = 202;
  sandbox.document = { getElementById: (id) => ({ id, textContent: '', innerHTML: '', style: {}, offsetWidth: 320, offsetHeight: 180 }) };
  sandbox._portfolioFetchBackendCandlesForChart = async () => ({ ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: c1, candles4h: c4 });
  sandbox._recordBackendCandleProvenance = () => {};
  sandbox.computeCandleIndicators = () => ({ lastSma8: 1, lastRsi: 55, rsi: new Array(25).fill(55), lastSqueeze: false, squeeze: new Array(25).fill(false) });
  sandbox._mcxDrawRsi = () => {}; sandbox._pfDrawRsiPanel = () => {}; sandbox._pfDrawRsPanel = () => {}; sandbox._pfUpdateAlignment = () => {};
  sandbox.getCandleDataSource = () => 'FRONTEND'; sandbox.positionManager = { getById: () => ({ underlyingPrice: 235.98 }) };
  sandbox._drawCandleChart = () => {};
  await sandbox._pfDrawChart(202, 'IBM');
  sandbox.console = console;
  ok(openLogs.filter((l) => l.indexOf('[PORTFOLIO CHART] price symbol=IBM') === 0).length === 1, '14: _pfDrawChart logs the price line exactly once per open');

  // The one-line price diagnostic.
  const logs = [];
  const realLog = console.log;
  sandbox.console = { log: (...x) => logs.push(x.join(' ')), warn: () => {}, error: () => {} };
  sandbox._pfBackendCandleCache = { symbol: 'IBM', candles1d: c1, candles4h: c4, source: 'BACKEND_CANDLE_STORE' };
  sandbox.positionManager = { getById: () => ({ underlyingPrice: 235.98 }) };
  sandbox._pfLogChartPrice(202, 'IBM');
  sandbox.console = console;
  const line = logs.find((l) => l.indexOf('[PORTFOLIO CHART] price symbol=IBM') === 0);
  const rec = line && JSON.parse(line.slice(line.indexOf('{')));
  ok(rec && rec.price === 253.58 && rec.source === 'backend 4H' && rec.session === D && rec.positionPrice === 235.98
    && rec.d1.session === staleD && rec.d1.close === 235.98 && rec.h4.session === D && rec.newestSession === D && rec.derivedDailyBars === 73,
    '14: the diagnostic line reports the resolved price, its session, each series\' last bar and the (ignored) position price');
}

// ── 15. RSI / RS sub-panels follow the candle chart's window ───────────────────
section('15. _pfDrawTf hands the chart window to the RSI and RS panels');
{
  const mk = (n, base) => bars(n, base).map((c) => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v, source: 'BACKEND_CANDLE_STORE' }));
  const c1 = mk(120, 256), c4 = mk(120, 270), spy = mk(120, 500);
  const rsi = new Array(120).fill(55);
  const prep = () => {
    const calls = { rsi: [], rs: [], chart: null };
    sandbox._pfExpandedPosId = 303;
    sandbox._pfBackendCandleCache = { symbol: 'ADBE', candles1d: c1, candles4h: c4, source: 'BACKEND_CANDLE_STORE' };
    sandbox._pfBackendSpyCache = { candles1d: spy, candles4h: spy, source: 'BACKEND_CANDLE_STORE' };
    sandbox.S = { scanData: [] };
    sandbox.positionManager = { getById: () => null };
    sandbox.computeCandleIndicators = () => ({ lastSma8: 1, lastRsi: 55, rsi, lastSqueeze: false, squeeze: new Array(120).fill(false) });
    sandbox.getCandleDataSource = () => 'FRONTEND';
    sandbox._pfDrawRsiPanel = (id, series, vs, ve) => { calls.rsi.push({ id, series, vs, ve }); };
    sandbox._pfDrawRsPanel = (id, candles, spyC, viewLen, viewEnd) => { calls.rs.push({ id, n: candles.length, spyN: spyC && spyC.length, viewLen, viewEnd }); };
    sandbox._pfUpdateAlignment = () => {};
    return calls;
  };

  let calls = prep();
  sandbox._drawCandleChart = (wrapId, candles, ind, opts) => { calls.chart = { wrapId, opts }; opts.onView(45, 120); };
  sandbox._pfDrawTf(303, 'ADBE', '1D');
  ok(calls.chart && typeof calls.chart.opts.onView === 'function', '15: the candle chart receives an onView callback');
  ok(calls.rsi.length === 1 && calls.rsi[0].id === 'pf-1d-rsi-303' && calls.rsi[0].vs === 45 && calls.rsi[0].ve === 120 && calls.rsi[0].series === rsi,
    '15: the reported window is passed to the RSI panel (with the full RSI series)');
  ok(calls.rs.length === 1 && calls.rs[0].id === 'pf-1d-rs-303' && calls.rs[0].viewLen === 75 && calls.rs[0].viewEnd === 120 && calls.rs[0].spyN === 120,
    '15: ... and to the RS panel as (length, end) with the SPY series already resolved');
  ok(calls.rsi.length === 1 && calls.rs.length === 1, '15: no extra default-window draw when the chart reported its window (no flash of the wrong window)');
  calls.chart.opts.onView(10, 60);
  ok(calls.rsi.length === 2 && calls.rsi[1].vs === 10 && calls.rsi[1].ve === 60 && calls.rs[1].viewLen === 50 && calls.rs[1].viewEnd === 60,
    '15: a later pan / zoom (the chart calling onView again) redraws both panels on the new window');

  calls = prep();
  sandbox._drawCandleChart = (wrapId, candles, ind, opts) => { calls.chart = { wrapId, opts }; };   // chart could not draw: never reports a window
  sandbox._pfDrawTf(303, 'ADBE', '4H');
  ok(calls.rsi.length === 1 && calls.rsi[0].id === 'pf-4h-rsi-303' && calls.rsi[0].vs === 45 && calls.rsi[0].ve === 120 && calls.rs[0].viewLen === 75 && calls.rs[0].viewEnd === 120,
    '15: if the chart reports nothing, the panels fall back to the default trailing window');
}

// ── 16. RSI / RS panels draw the candle chart's own window (real functions, recording canvas) ─
// Folded into this suite on purpose: the repository pins its test-file inventory, so a new
// file would change it. Everything below runs in its own vm context.
section('16. RSI and RS panels follow the chart window (pan / zoom / reset)');
await (async () => {
  const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-6 : e);
// ── a recording canvas ──────────────────────────────────────────────────────────
const W = 800, H = 120;
function makeCtx(log) {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return (s) => ({ width: String(s).length * 5 });
      if (k in t) return t[k];
      return (...a) => { log.push([k, a]); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function makeEnv() {
  const log = [];
  const wraps = {};
  const mkWrap = (id) => {
    const w = {
      id, innerHTML: '', style: {}, children: [], isConnected: true, offsetWidth: W, offsetHeight: H,
      appendChild(c) { this.children.push(c); c.isConnected = true; return c; },
      getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }),
      addEventListener() {},
    };
    Object.defineProperty(w, 'innerHTML', { get() { return ''; }, set(v) { w.children = []; } });
    return w;
  };
  const sandbox = {
    console, Math, Date, JSON, Array, Object, Number, String, isFinite, parseFloat, requestAnimationFrame: (f) => f(),
    document: {
      getElementById: (id) => (wraps[id] = wraps[id] || mkWrap(id)),
      createElement: () => ({ style: {}, getContext: () => makeCtx(log), getBoundingClientRect: () => ({ width: W, height: H }), isConnected: true }),
    },
    getComputedStyle: () => ({ position: 'relative' }),
    window: { devicePixelRatio: 1, addEventListener() {} },
    prepareHiDPICanvas: (cv) => ({ ctx: cv.getContext('2d'), width: W, height: H, dpr: 1 }),
    S: {},
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  return { sandbox, log, wraps };
}

const FNS = ['_chartPad2', '_chartXSpan', '_chartViewKey', '_chartResolveView', '_chartRedraw', '_chartClearHover', '_chartBindInteractions',
  '_drawCandleChart', '_pfDrawRsiPanel', '_pfDrawRsPanel', '_chartLinkedRsiId', '_chartSyncLinkedRsi'];
const CHART_RSI_LINKS_SRC = (HTML.match(/^var _CHART_RSI_LINKS = \[[\s\S]*?\n\];/m) || [''])[0];
function load(env) {
  const consts = 'var _CHART_DEFAULT_VISIBLE = 75; var _CHART_MIN_VISIBLE = 20; var _CHART_RIGHT_PAD_SLOTS = 4; var _chartDragState = null; var _chartDragBound = false;\n' + CHART_RSI_LINKS_SRC;
  vm.runInContext(consts + '\n' + FNS.map((n) => { try { return extractFn(HTML, n); } catch (e) { return ''; } }).join('\n'), env.sandbox);
}

// 120 daily candles + a 120-point RSI/ind shape the chart can draw.
function series(n) {
  const candles = [], rsi = [];
  for (let i = 0; i < n; i++) {
    const c = 100 + Math.sin(i / 7) * 5 + i * 0.1;
    candles.push({ time: Date.UTC(2026, 0, 2) + i * 86400000, open: c - 0.3, high: c + 1, low: c - 1, close: c, volume: 1000 });
    rsi.push(i < 14 ? null : 50 + 30 * Math.sin(i / 9));
  }
  const ind = { sma8: new Array(n).fill(100), sma20: new Array(n).fill(100), sma30: new Array(n).fill(100), rsi, lastRsi: rsi[n - 1], lastSma8: 100,
    bb: { upper: new Array(n).fill(110), lower: new Array(n).fill(90) }, kc: { upper: new Array(n).fill(108), lower: new Array(n).fill(92) }, squeeze: new Array(n).fill(false), lastSqueeze: false };
  return { candles, ind, rsi };
}

// Line segments recorded by a panel draw: moveTo/lineTo pairs in call order.
function segments(log, from) {
  const segs = [];
  let cur = null;
  for (let k = from; k < log.length; k++) {
    const [name, a] = log[k];
    if (name === 'moveTo') cur = a;
    else if (name === 'lineTo' && cur) { segs.push([cur[0], cur[1], a[0], a[1]]); cur = null; }
  }
  return segs;
}
// Data line only: drop the two dashed reference lines (horizontal, from PAD.left to the right margin).
const dataSegs = (segs) => segs.filter((s) => !(s[1] === s[3] && s[0] === 10));

  // ── 1. _drawCandleChart reports its window ───────────────────────────────────
  section('16.1 _drawCandleChart reports the window it drew');
  {
    const env = makeEnv(); load(env);
    const { candles, ind } = series(120);
    const seen = [];
    const opts = { showSMA8: true, showBB: true, showKC: true, source: 'X', rsi: ind.lastRsi, onView: (vs, ve) => seen.push([vs, ve]) };
    env.sandbox._drawCandleChart('pf-1d-wrap-1', candles, ind, opts);
    ok(JSON.stringify(seen) === JSON.stringify([[45, 120]]), '1: first draw reports the default trailing window (75 bars)');
    const wrap = env.sandbox.document.getElementById('pf-1d-wrap-1');
    ok(wrap.__chart && wrap.__chart.opts === opts, '1: the opts (with onView) are stashed for zoom / pan redraws');
    wrap.__chartView.start = 10; wrap.__chartView.end = 60; wrap.__chartView.anchored = false;
    env.sandbox._chartRedraw(wrap);
    ok(JSON.stringify(seen[1]) === JSON.stringify([10, 60]), '1: after a pan / zoom redraw it reports the window the user is looking at');
    wrap.__chartView = null; env.sandbox._chartRedraw(wrap);
    ok(JSON.stringify(seen[2]) === JSON.stringify([45, 120]), '1: reset returns to the default window');
    wrap.__chartView = { key: wrap.__chartView.key, start: 0, end: 120, anchored: true };
    env.sandbox._chartRedraw(wrap);
    ok(JSON.stringify(seen[3]) === JSON.stringify([0, 120]), '1: full zoom-out reports the whole series');
    const bad = { onView: () => { throw new Error('boom'); } };
    env.sandbox._drawCandleChart('pf-1d-wrap-2', candles, ind, bad);
    ok(!!env.sandbox.document.getElementById('pf-1d-wrap-2').__chart, '1: a throwing callback does not break the chart (it is still drawn and interactive)');
    const before = seen.length;
    env.sandbox._drawCandleChart('pf-1d-wrap-3', candles, ind, { source: 'Y' });
    ok(seen.length === before, '1: charts without onView are unaffected');
    env.sandbox._drawCandleChart('pf-1d-wrap-4', candles.slice(0, 3), ind, opts);
    ok(seen.length === before, '1: a chart that cannot draw (too few candles) does not report a window');
  }

  // ── 2. RSI panel draws exactly the window, on the candle grid ─────────────────
  section('16.2 RSI panel follows the window');
  {
    const env = makeEnv(); load(env);
    const { rsi } = series(120);
    const plotW = W - 10 - 64, plotH = H - 14 - 4;
    const yOf = (v) => 14 + (1 - v / 100) * plotH;
    const run = (vs, ve) => { const start = env.log.length; env.sandbox._pfDrawRsiPanel('rsi-1', rsi, vs, ve); return dataSegs(segments(env.log, start)); };

    let segs = run(45, 120);
    const nv = 75, span = nv - 1 + 4;
    ok(segs.length === 74, '2: default window draws 74 segments for 75 points');
    ok(near(segs[0][0], 10) && near(segs[0][1], yOf(rsi[45])), '2: first point = first bar of the window, at the left margin');
    ok(near(segs[segs.length - 1][2], 10 + (nv - 1) / span * plotW) && near(segs[segs.length - 1][3], yOf(rsi[119])), '2: last point sits on the candle grid (leaves the 4 "future" slots free), value = last RSI');
    ok(segs[segs.length - 1][2] < W - 64, '2: the line stops before the price-axis margin, like the candles');

    segs = run(10, 60);
    ok(near(segs[0][1], yOf(rsi[14])) || segs[0][1] !== yOf(rsi[45]), '2: panned window shows other data');
    // window [10,60): RSI is null before index 14, so the first drawn point is index 14 at x for slot 4
    ok(near(segs[0][0], 10 + 4 / (50 - 1 + 4) * plotW) && near(segs[0][1], yOf(rsi[14])), '2: leading nulls are skipped and the first value keeps its candle slot');
    ok(near(segs[segs.length - 1][3], yOf(rsi[59])), '2: window end = RSI at index 59');

    segs = run(0, 120);
    ok(segs.length === 120 - 14 - 1, '2: full zoom-out draws every valid pair of the series');
    const lbl = env.log.filter((c) => c[0] === 'fillText' && /RSI\(14\)/.test(c[1][0])).pop();
    ok(lbl && lbl[1][0] === 'RSI(14): ' + rsi[119].toFixed(1), '2: label shows the value at the right edge of the window');
    const segsA = run(30, 90), segsB = run(31, 91);
    ok(Math.abs(segsA[0][1] - segsB[0][1]) > 1e-9, '2: shifting the window by one bar changes the drawn line');
    const s0 = env.log.length; env.sandbox._pfDrawRsiPanel('rsi-1', rsi, 50, 50); env.sandbox._pfDrawRsiPanel('rsi-1', null, 0, 10);
    ok(env.log.length === s0, '2: empty window / missing series draw nothing');
    ok(env.sandbox._pfDrawRsiPanel('missing-id-ok', rsi, 0, 10) === undefined, '2: a panel container that exists but has no layout does not throw');
  }

  // ── 3. RS panel: window mode and legacy mode ──────────────────────────────────
  section('16.3 RS panel: window mode aligned, legacy mode untouched');
  {
    const env = makeEnv(); load(env);
    const nc = 120, ns = 100;
    const mk = (n, f) => Array.from({ length: n }, (_, i) => ({ time: i, close: f(i) }));
    const cand = mk(nc, (i) => 100 + i * 0.5 + Math.sin(i) * 2);
    const spy = mk(ns, (i) => 400 + i * 0.3);
    const rsFull = (ci) => { const len = ns, off = nc - len; const i = ci - off; if (i < 20) return null;
      const sRet = (cand[ci].close - cand[ci - 20].close) / cand[ci - 20].close, pRet = (spy[i].close - spy[i - 20].close) / spy[i - 20].close; return (sRet - pRet) * 100; };
    const run = (a, b, viewLen, viewEnd) => { const start = env.log.length; env.sandbox._pfDrawRsPanel('rs-1', a, b, viewLen, viewEnd); return segments(env.log, start); };

    // window mode: [60,120) of the candle array, every point has RS (ci >= 20 + 20)
    let segs = run(cand, spy, 60).filter((s) => !(s[1] === s[3] && s[0] === 10)); // legacy: trailing 60, no viewEnd
    const legacyLastX = segs[segs.length - 1][2];
    ok(segs.length === 59, '3: legacy call draws exactly the trailing viewLen points (60 → 59 segments)');
    ok(near(legacyLastX, 10 + (W - 10 - 30), 1e-6), '3: legacy 4-argument call keeps the old layout (last point on the right edge of a 30px margin)');
    segs = run(cand, spy, 60, 120).filter((s) => !(s[1] === s[3] && s[0] === 10));
    const plotW = W - 10 - 64, nv = 60;
    ok(near(segs[segs.length - 1][2], 10 + (nv - 1) / (nv - 1 + 4) * plotW), '3: window mode puts the last point on the candle grid with the 64px margin');
    // pan to [20,80): first RS value (ci = 20 + (nc-len)=40) appears at slot 20 of the window? window start 20 -> ci 20..79; RS exists from ci=40
    segs = run(cand, spy, 60, 80).filter((s) => !(s[1] === s[3] && s[0] === 10));
    ok(segs.length === 39, '3: a panned window draws only the part of RS that exists inside it (ci >= 40) — 40 points → 39 segments (got ' + segs.length + ')');
    const nv2 = 60;
    ok(near(segs[0][0], 10 + 20 / (nv2 - 1 + 4) * plotW), '3: the first RS point sits under the candle of the same index (null RS before it)');
    const lbl = env.log.filter((c) => c[0] === 'fillText' && /RS vs SPY/.test(c[1][0])).pop();
    const expLast = rsFull(79);
    ok(lbl && lbl[1][0] === 'RS vs SPY: ' + (expLast >= 0 ? '+' : '') + expLast.toFixed(1) + '%', '3: label = RS at the right edge of the window (got ' + (lbl && lbl[1][0]) + ')');
    const s0 = env.log.length; env.sandbox._pfDrawRsPanel('rs-1', cand.slice(0, 10), spy, 5, 10);
    ok(env.log.length === s0, '3: too little data still shows the neutral message, no drawing');
  }

  // ── 4. static wiring of _pfDrawTf ──────────────────────────────────────────────
  section('16.4 _pfDrawTf wiring');
  {
    const body = extractFn(HTML, '_pfDrawTf');
    ok(/onView: drawPanels,/.test(body), '4: _pfDrawTf passes onView to the candle chart');
    ok(/_pfDrawRsiPanel\(rsiId, ind\.rsi, vs, ve\);/.test(body) && /_pfDrawRsPanel\(rsId, candles, spyCandles, ve - vs, ve\);/.test(body), '4: the callback redraws both panels with the reported window');
    ok(/if \(!panelsDrawn\) drawPanels\(candles\.length - viewLen, candles\.length\);/.test(body), '4: fallback draws the default window when the chart did not report one');
    ok(!/_mcxDrawRsi\(/.test(body), '4: the trailing-only shared RSI drawer is no longer used by the Portfolio charts');
    ok(body.indexOf('var spyCandles = null;') < body.indexOf('_drawCandleChart(wrapId'), '4: SPY series is resolved before the chart is drawn (the callback needs it)');
  }
  // ── 5. the other charts' RSI panels follow the window too ────────────────────
  // MCX and SFS draw their RSI from byte-pinned modules (right after _drawCandleChart returns), so the
  // chart finds the panel by id and redraws it once the caller is done.
  section('16.5 scanner / RS / SFS / MCX RSI panels follow the window (linked by id, redrawn after the caller)');
  {
    const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
    ok(CHART_RSI_LINKS_SRC.length > 0, '5: the link table is found in the source');
    const env0 = makeEnv(); load(env0);
    const L = env0.sandbox._chartLinkedRsiId;
    ok(L('schart-big-wrap-1d') === 'schart-rsi-1d' && L('schart-big-wrap-4h') === 'schart-rsi-4h', '5: scanner inline chart -> schart-rsi-*');
    ok(L('rs-big-wrap-1d') === 'rs-rsi-1d' && L('rs-big-wrap-4h') === 'rs-rsi-4h', '5: RS charts -> rs-rsi-*');
    ok(L('sfs-big-wrap-1d') === 'sfs-rsi-1d' && L('sfs-big-wrap-4h') === 'sfs-rsi-4h', '5: SFS detail -> sfs-rsi-*');
    ok(L('mcx-wrap-spy-1d') === 'mcx-rsi-spy-1d' && L('mcx-wrap-vi3m-4h') === 'mcx-rsi-vi3m-4h', '5: MCX -> mcx-rsi-*');
    ok(L('pf-1d-wrap-7') === null && L('') === null && L(null) === null && L('xschart-big-wrap-1d') === null, '5: the Portfolio (it passes onView, and is not in the table), empty / null ids and non-prefix matches are not linked');

    // The link table is checked against every chart wrap that exists in the app source: each one has
    // its RSI wrap, so no chart is silently left on the trailing window.
    const MARKUP = [path.join(__dirname, '..', 'index.html')].concat(fs.readdirSync(path.join(__dirname, '..', 'js', 'ui')).map((f) => path.join(__dirname, '..', 'js', 'ui', f)))
      .map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    const wrapIds = [...MARKUP.matchAll(/id="((?:schart-big-wrap-|rs-big-wrap-|sfs-big-wrap-|mcx-wrap-)[a-z0-9-]*)"/g)].map((m) => m[1]);
    ok(wrapIds.length === 10, '5: ten linked chart wraps exist in the app source (' + wrapIds.length + ')');
    ok(wrapIds.every((id) => MARKUP.indexOf('id="' + L(id) + '"') >= 0), '5: every one of them has its RSI wrap in the source: ' + wrapIds.filter((id) => MARKUP.indexOf('id="' + L(id) + '"') < 0).join(','));
    // ... and the callers pass the ids the table derives.
    const sfsCalls = [...HTML.matchAll(/_sfsDrawOneTf\(symbol, '[14][DH]', '([a-z0-9-]+)', '([a-z0-9-]+)'/g)];
    ok(sfsCalls.length === 2 && sfsCalls.every((m) => L(m[1]) === m[2]), '5: both SFS calls hand _sfsDrawOneTf the ids the table derives');
    ok(/var rsiId = wrapId\.replace\('mcx-wrap-', 'mcx-rsi-'\);/.test(HTML), '5: the MCX caller derives its RSI id with the same prefixes');
    ok(/var wrapId   = 'schart-big-wrap-' \+ sfx;\s+var rsiId    = 'schart-rsi-'      \+ sfx;/.test(HTML), '5: the scanner caller uses schart-big-wrap-* / schart-rsi-*');
    ok(/var wrapId='rs-big-wrap-'\+sfx, rsiId='rs-rsi-'\+sfx/.test(HTML), '5: the RS-chart caller uses rs-big-wrap-* / rs-rsi-*');

    // Real order of events in a caller: chart, then the shared trailing-window RSI drawer.
    const env = makeEnv(); load(env);
    vm.runInContext(extractFn(HTML, '_mcxDrawRsi'), env.sandbox);
    const { candles, ind, rsi } = series(120);
    const plotW = W - 10 - 64, plotH = H - 14 - 4;
    const yOf = (v) => 14 + (1 - v / 100) * plotH;
    const lastSeg = (from) => { const sg = dataSegs(segments(env.log, from)); return sg[sg.length - 1]; };

    env.sandbox._drawCandleChart('schart-big-wrap-1d', candles, ind, { source: 'X', rsi: ind.lastRsi });
    const beforeCaller = env.log.length;
    env.sandbox._mcxDrawRsi('schart-rsi-1d', ind.rsi, 75);                 // the caller's own call
    const afterCaller = env.log.length;
    const callerSeg = lastSeg(beforeCaller);
    await flush();
    const seg = lastSeg(afterCaller);
    ok(!!seg, '5: the RSI panel is redrawn after the caller finished');
    ok(seg && near(seg[2], 10 + 74 / 78 * plotW) && near(seg[3], yOf(rsi[119])), '5: ... on the candle grid, ending on the last RSI value');
    ok(callerSeg && seg && !near(callerSeg[2], seg[2]), '5: ... replacing the caller\'s trailing-window layout (which ends at a different x)');

    // pan: the panel follows
    const wrap = env.sandbox.document.getElementById('schart-big-wrap-1d');
    wrap.__chartView.start = 10; wrap.__chartView.end = 60; wrap.__chartView.anchored = false;
    const beforePan = env.log.length;
    env.sandbox._chartRedraw(wrap);
    await flush();
    const panSeg = lastSeg(beforePan);
    ok(panSeg && near(panSeg[3], yOf(rsi[59])), '5: after a pan the RSI panel ends on the RSI at the new right edge (index 59)');
    wrap.__chartView = null;
    const beforeReset = env.log.length;
    env.sandbox._chartRedraw(wrap);
    await flush();
    const resetSeg = lastSeg(beforeReset);
    ok(resetSeg && near(resetSeg[3], yOf(rsi[119])) && near(resetSeg[2], 10 + 74 / 78 * plotW), '5: reset puts the RSI panel back on the default window');

    // every family draws through the same hook
    const calls = [];
    const env2 = makeEnv(); load(env2);
    env2.sandbox._pfDrawRsiPanel = (id, series_, vs, ve) => calls.push([id, series_ === rsi || series_ === ind.rsi, vs, ve]);
    for (const id of ['rs-big-wrap-4h', 'sfs-big-wrap-1d', 'mcx-wrap-spy-1d']) env2.sandbox._drawCandleChart(id, candles, ind, { source: 'X' });
    await flush();
    ok(JSON.stringify(calls.map((c) => c[0])) === JSON.stringify(['rs-rsi-4h', 'sfs-rsi-1d', 'mcx-rsi-spy-1d']) && calls.every((c) => c[1] && c[2] === 45 && c[3] === 120),
      '5: RS, SFS and MCX charts each redraw their own RSI panel on the default window');

    // not linked / superseded / cleared
    calls.length = 0;
    env2.sandbox._drawCandleChart('pf-1d-wrap-9', candles, ind, { source: 'X', onView: () => {} });
    env2.sandbox._drawCandleChart('pf-1d-wrap-8', candles, ind, { source: 'X' });
    env2.sandbox._drawCandleChart('schart-big-wrap-1d', candles.slice(0, 3), ind, { source: 'X' });   // too few candles: cannot draw
    env2.sandbox._drawCandleChart('schart-big-wrap-4h', candles, { sma8: ind.sma8 }, { source: 'X' });  // no RSI series
    await flush();
    ok(calls.length === 0, '5: the Portfolio (onView), an unlinked id, a chart that cannot draw and a chart without an RSI series draw no linked panel');
    env2.sandbox._drawCandleChart('sfs-big-wrap-4h', candles, ind, { source: 'X' });
    env2.sandbox._drawCandleChart('sfs-big-wrap-4h', candles.slice(0, 100), Object.assign({}, ind, { rsi: ind.rsi.slice(0, 100) }), { source: 'X' });
    await flush();
    ok(calls.length === 1 && calls[0][0] === 'sfs-rsi-4h' && calls[0][3] === 100, '5: two draws before the panel runs redraw it once, for the newer draw (end 100)');
    env2.sandbox._drawCandleChart('sfs-big-wrap-1d', candles, ind, { source: 'X' });
    env2.sandbox.document.getElementById('sfs-big-wrap-1d').__chart = null;                              // chart cleared meanwhile
    calls.length = 0;
    await flush();
    ok(calls.length === 0, '5: a chart cleared before the panel runs is not drawn over');
  }
})();

// ── 17. RS vs SPY: the benchmark is read once per TTL and reaches every RS consumer ──
// The Technical Analysis block showed `RS --` on 1D and 4H because backend-read mode opens no SPY
// Candle subscription, so getDailyCandles('SPY') / getFourHourCandles('SPY') were both null.
section('17. SPY benchmark: fetched once per TTL, shared by the RS panel and the alignment RS');
{
  const TTL = sandbox._PF_SPY_BENCHMARK_TTL_MS, RETRY = sandbox._PF_SPY_RETRY_MS;
  const T0 = 1_800_000_000_000;
  const spyBars = (n) => bars(n, 500).map((c) => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v }));
  const setSpy = (c) => { sandbox._pfBackendSpyCache = c; };
  const need = (t, now) => sandbox._pfSpyBenchmarkNeeded(t, now);

  ok(TTL === 600000 && RETRY === 60000, '17: TTL is 10 minutes and the failed-read retry is 1 minute');

  sandbox._pfSpyLastAttemptAt = 0;
  setSpy(null);
  ok(need('TSLA', T0) === true, '17: no cache -> the benchmark is needed');
  ok(need('SPY', T0) === false && need('spy', T0) === false, '17: the SPY chart itself never asks for the benchmark (any case)');
  setSpy({ candles1d: spyBars(25), candles4h: null, source: 'x', at: T0 });
  ok(need('TSLA', T0 + TTL - 1) === false, '17: a cache younger than the TTL is reused');
  ok(need('TSLA', T0 + TTL) === true, '17: a cache exactly TTL old is refreshed');
  setSpy({ candles1d: spyBars(19), candles4h: null, source: 'x', at: T0 });
  ok(need('TSLA', T0) === true, '17: a cache with fewer than 20 daily bars does not count as a benchmark');
  setSpy({ candles1d: spyBars(20), candles4h: null, source: 'x', at: T0 });
  ok(need('TSLA', T0) === false, '17: 20 daily bars is enough (boundary)');
  setSpy({ candles1d: spyBars(25), candles4h: null, source: 'x' });
  ok(need('TSLA', T0 + 10 * TTL) === false, '17: a cache with no timestamp (older callers) is never refreshed by age');
  setSpy(null);
  sandbox._pfSpyLastAttemptAt = T0;
  ok(need('TSLA', T0 + RETRY - 1) === false, '17: a failed read is not retried inside the retry window');
  ok(need('TSLA', T0 + RETRY) === true, '17: ... and is retried once the window has passed');
  sandbox._pfSpyLastAttemptAt = 1;
  ok(need('TSLA') === true, '17: `now` defaults to the real clock when omitted (retry window long past)');

  // series accessor
  setSpy({ candles1d: spyBars(30), candles4h: spyBars(21), source: 'x', at: T0 });
  ok(sandbox._pfSpyBenchmarkSeries('1D').length === 30 && sandbox._pfSpyBenchmarkSeries('4H').length === 21, '17: series accessor maps 1D / 4H to the matching candles');
  setSpy({ candles1d: spyBars(30), candles4h: spyBars(19), source: 'x', at: T0 });
  ok(sandbox._pfSpyBenchmarkSeries('4H') === null, '17: a short 4H series is reported as absent');
  setSpy({ candles1d: spyBars(30), candles4h: null, source: 'x', at: T0 });
  ok(sandbox._pfSpyBenchmarkSeries('4H') === null, '17: a missing 4H series is reported as absent');
  setSpy(null);
  ok(sandbox._pfSpyBenchmarkSeries('1D') === null, '17: no cache -> null');

  // _pfDrawChart: one SPY read per TTL, written with its timestamp
  vm.runInContext([extractFn(HTML, '_pfNormalizeChartUnderlyingSymbol'), extractFn(HTML, '_pfDrawChart'), extractFn(HTML, '_pfDrawTf')].join('\n'), sandbox);
  const fetched = [];
  const tsla1d = bars(40, 200).map((c) => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v }));
  const spy1d = spyBars(40), spy4h = spyBars(40);
  sandbox._pfExpandedPosId = 301;
  sandbox.S = { scanData: [] };
  sandbox.document = { getElementById: (id) => ({ id, textContent: '', innerHTML: '', style: {}, offsetWidth: 320, offsetHeight: 180 }) };
  sandbox._portfolioFetchBackendCandlesForChart = async (sym) => {
    fetched.push(sym);
    if (sym === 'SPY') return { ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: spy1d, candles4h: spy4h };
    return { ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: tsla1d, candles4h: null };
  };
  sandbox._recordBackendCandleProvenance = () => {};
  sandbox.getDailyCandles = () => []; sandbox.getFourHourCandles = () => [];
  sandbox._patchLivePrice = (c) => c;
  sandbox.computeCandleIndicators = () => ({ lastSma8: 1, lastRsi: 55, rsi: new Array(40).fill(55), lastSqueeze: false, squeeze: new Array(40).fill(false) });
  sandbox.getCandleDataSource = () => 'X';
  sandbox._drawCandleChart = () => {};
  sandbox._mcxDrawRsi = () => {}; sandbox._pfDrawRsiPanel = () => {}; sandbox._pfDrawRsPanel = () => {}; sandbox._pfUpdateAlignment = () => {};
  sandbox.prepareHiDPICanvas = () => ({ ctx: {}, width: 320, height: 180 });

  setSpy(null); sandbox._pfSpyLastAttemptAt = 0;
  const before = Date.now();
  await sandbox._pfDrawChart(301, 'tsla');
  ok(fetched.slice().sort().join(',') === 'SPY,TSLA', '17: opening TSLA with no benchmark reads TSLA and SPY (got ' + fetched.join(',') + ')');
  ok(sandbox._pfBackendSpyCache && sandbox._pfBackendSpyCache.candles1d === spy1d && sandbox._pfBackendSpyCache.candles4h === spy4h, '17: the SPY read lands in the shared benchmark cache (1D and 4H)');
  ok(sandbox._pfBackendSpyCache && sandbox._pfBackendSpyCache.at >= before && sandbox._pfBackendSpyCache.at <= Date.now(), '17: ... stamped with the time it was read');
  ok(sandbox._pfBackendCandleCache && sandbox._pfBackendCandleCache.symbol === 'TSLA' && sandbox._pfBackendCandleCache.candles1d === tsla1d, '17: the active chart keeps TSLA candles, never SPY');

  fetched.length = 0;
  await sandbox._pfDrawChart(301, 'tsla');
  ok(fetched.join(',') === 'TSLA', '17: a second open inside the TTL reads TSLA only (got ' + fetched.join(',') + ')');

  fetched.length = 0; setSpy(null); sandbox._pfSpyLastAttemptAt = 0;
  await sandbox._pfDrawChart(301, 'spy');
  ok(fetched.join(',') === 'SPY', '17: the SPY chart reads SPY exactly once (got ' + fetched.join(',') + ')');

  // a failed SPY read is remembered: the next open does not retry inside the window
  fetched.length = 0; setSpy(null); sandbox._pfSpyLastAttemptAt = 0;
  sandbox._portfolioFetchBackendCandlesForChart = async (sym) => { fetched.push(sym); return sym === 'SPY' ? { ok: false, fallbackReason: 'http_500' } : { ok: true, source: 'S', candles1d: tsla1d, candles4h: null }; };
  await sandbox._pfDrawChart(301, 'tsla');
  const afterFail = fetched.slice(); fetched.length = 0;
  await sandbox._pfDrawChart(301, 'tsla');
  ok(afterFail.indexOf('SPY') >= 0 && sandbox._pfBackendSpyCache === null, '17: a failed SPY read leaves no benchmark cache');
  ok(fetched.join(',') === 'TSLA', '17: ... and the next open does not hammer the backend again (got ' + fetched.join(',') + ')');
}

// ── 17b. getDailyCandles / getFourHourCandles('SPY') fall back to the cache; RS is then computed ──
section('17b. alignment RS vs SPY is populated from the benchmark cache (1D and 4H)');
{
  const env = { _candleBuffer: {}, S: { scanData: [] }, _buildRth4hCandles: () => null, console, Math, Date, isFinite, parseFloat, Number, Array, Object, String };
  const ctx = vm.createContext(env);
  const modSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'portfolio', 'portfolio-traffic-light.js'), 'utf8');
  vm.runInContext([SPY_CONSTS, ...['_pfSpyBenchmarkSeries', 'getDailyCandles', 'getFourHourCandles', 'smA', 'calcRSIWilder'].map((n) => extractFn(HTML, n)), extractFn(modSrc, 'computePortfolioDirectionalBias')].join('\n'), ctx);
  const mk = (n, base, step) => { const o = []; for (let i = 0; i < n; i++) o.push({ time: 1_700_000_000_000 + i * 86400000, open: base + i * step, high: base + i * step + 1, low: base + i * step - 1, close: base + i * step, volume: 1 }); return o; };
  const tsla = mk(60, 100, 1);      // +20 closes ago: strongly up
  const spy = mk(60, 500, 0.1);     // gently up

  vm.runInContext('var _pfBackendSpyCache = null;', ctx);
  ok(ctx.getDailyCandles('SPY') === null && ctx.getFourHourCandles('SPY') === null, '17b: with no buffer and no cache SPY is unavailable (the old behaviour)');
  const none = ctx.computePortfolioDirectionalBias('TSLA', tsla, tsla);
  ok(none.inputs1D.rs === undefined && none.inputs4H.rs === undefined, '17b: ... which is exactly the `RS --` the Technical Analysis block showed');

  env._pfBackendSpyCache = { candles1d: spy, candles4h: spy, source: 'x', at: Date.now() };
  vm.runInContext('_pfBackendSpyCache = this._pfBackendSpyCache;', ctx);
  ok(ctx.getDailyCandles('SPY') === spy && ctx.getFourHourCandles('SPY') === spy, '17b: with the benchmark cached both timeframes resolve to it');
  ok(ctx.getDailyCandles('TSLA') === null && ctx.getFourHourCandles('TSLA') === null, '17b: the cache is only ever SPY: another symbol never gets it');
  const res = ctx.computePortfolioDirectionalBias('TSLA', tsla, tsla);
  const expRs = (tsla[59].close - tsla[39].close) / tsla[39].close - (spy[59].close - spy[39].close) / spy[39].close;
  ok(res.inputs1D.rs !== undefined && Math.abs(res.inputs1D.rs - expRs) < 1e-12, '17b: 1D RS = 20-bar stock return minus SPY return (' + res.inputs1D.rs + ')');
  ok(res.inputs4H.rs !== undefined && Math.abs(res.inputs4H.rs - expRs) < 1e-12, '17b: 4H RS is populated too');

  // a real frontend buffer still wins over the cache
  env._candleBuffer = { SPY: { '1D': spy.map((c) => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume })) } };
  ok(ctx.getDailyCandles('SPY')[0].source === 'DXLink', '17b: a live DXLink buffer is preferred over the cached backend series');
}

// ── 17c. strategy named from legs when the trade has none ──────────────────────
section('17c. a trade with no strategy is named from its legs');
{
  const env = { console, Math, Date, isFinite, parseFloat, Number, Array, Object, String };
  const ctx = vm.createContext(env);
  vm.runInContext(['_jxiInferStrategy', '_journalStrategyFromLegs'].map((n) => extractFn(HTML, n)).join('\n'), ctx);
  const f = ctx._journalStrategyFromLegs;
  const L = (type, side, strike, extra) => Object.assign({ type, side, strike, expiry: '2026-12-18', qty: 1 }, extra || {});
  ok(f([L('CALL', 'SHORT', 250)]) === ctx._jxiInferStrategy([{ type: 'CALL', side: 'SHORT', strike: 250, expiry: '2026-12-18', qty: 1 }]), '17c: a single leg is handed to the same inference the Excel import uses');
  const sc = f([L('CALL', 'SHORT', 250), L('PUT', 'SHORT', 200)]);
  ok(sc && sc !== 'CUSTOM' && /STRANGLE/i.test(sc), '17c: short call + short put at two strikes -> a strangle (got ' + sc + ')');
  ok(f([L('CALL', 'short', '250', { qty: -1 })]) !== null, '17c: lower-case side, string strike and negative quantity are normalised');
  ok(f([L('CALL', 'SHORT', 250, { expiry: undefined, expiration: '2026-12-18' })]) !== null, '17c: `expiration` is accepted as the expiry');
  ok(f(null) === null && f(undefined) === null && f([]) === null && f('x') === null, '17c: no legs -> null');
  ok(f([L('STOCK', 'LONG', 0)]) === null, '17c: a stock leg cannot be named -> null');
  ok(f([L('CALL', 'SHORT', 250), L('STOCK', 'LONG', 0)]) === null, '17c: ... and neither can a mixed list');
  ok(f([L('CALL', 'FLAT', 250)]) === null, '17c: an unknown side -> null');
  ok(f([L('CALL', 'SHORT', 'abc')]) === null, '17c: a non-numeric strike -> null');
  ok(f([L('CALL', 'SHORT', 250, { expiry: null })]) === null, '17c: a missing expiry -> null');
  ok(f([L('CALL', 'SHORT', 250, { qty: 0 })]) === null, '17c: a zero quantity -> null');
  ok(f([null]) === null, '17c: a null leg -> null');

  // wiring: _migrateTrade names the strategy only when it is missing
  const body = extractFn(HTML, '_migrateTrade');
  ok(/if \(!t\.strategy\) t\.strategy = _journalStrategyFromLegs\(t\.legs\) \|\| t\.strategy;/.test(body), '17c: _migrateTrade infers only when strategy is empty and keeps it otherwise');
  ok(body.indexOf('_journalStrategyFromLegs') < body.indexOf('t.originalStrategy = t.strategy'), '17c: ... before the original-strategy snapshot copies it');
}

// ── summary ───────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);

})();
