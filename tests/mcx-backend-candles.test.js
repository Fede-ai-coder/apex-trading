'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FF_BACKEND_CANDLES_MCX_CHARTS — pure-helper validation.
//
// Tests prove:
//   1.  flag default false (no localStorage)
//   2.  flag true only when localStorage key is '1'
//   3.  backend read response maps to MCX chart candle shape
//   4.  backend 4H uses read endpoint only after 30M warmup
//   5.  backend failure returns fallbackReason
//   6.  unsupported VIX/VI3M symbol falls back safely
//   7.  no /market/candles string in the new backend MCX helper
//   8.  no Yahoo string in the new backend MCX helper
//   9.  no new WebSocket usage
//   10. flag false leaves legacy MCX path unchanged
//   11. MCX cache does not use or mutate _pfBackendCandleCache
//
// Run: node tests/mcx-backend-candles.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extracts a named function (async or sync) from source.
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

// ── build sandbox ─────────────────────────────────────────────────────────────
const mockLS = {};
const sandbox = {
  console,
  Date, Math, JSON, Number, Boolean,
  isFinite, parseFloat, parseInt, encodeURIComponent,
  AbortSignal: { timeout: () => ({}) },
  BACKEND: 'https://api.test',
  _backendAuthHeaders: (extra) => Object.assign({ 'X-Test': '1' }, extra || {}),
  APEX_PARITY_TOL: 0.0001,
  localStorage: {
    getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
    setItem:    (k, v) => { mockLS[k] = v; },
    removeItem: (k) => { delete mockLS[k]; },
  },
  fetch: null,
  Object, Array, Promise,
  // _pfBackendCandleCache sentinel — must never be touched by MCX helpers
  _pfBackendCandleCache: null,
  _MCX_BACKEND_CACHE_TTL: 60000,
  _mcxBackendCandleCache: {},
};
vm.createContext(sandbox);

const FNS = [
  'ffBackendCandlesMcxCharts',
  'ffBackendCandlesPortfolioCharts',
  '_apexParityNormCandleArray', '_apexParityNormCandle', '_apexParityNormTime',
  '_apexParityExtractBackendCandles',
  '_mcxGetBackendCandleEntry',
  '_mcxGetCachedBackendCandles',
  '_mcxFetchBackendCandlesForChart',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// Build N synthetic daily bars in internal {t,o,h,l,c,v} shape.
function bars(n, base) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = base + i * 0.5;
    out.push({ t: ms0 + i * 86400000, o: c - 0.1, h: c + 0.5, l: c - 0.5, c, v: 1000 });
  }
  return out;
}

// Convert internal bars to backend ISO-timestamp shape.
function toBackendShape(rawBars) {
  return rawBars.map((c) => ({
    time: new Date(c.t).toISOString(),
    open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v,
  }));
}

// Mock fetch that consumes responses in order.
function makeFetch(responses) {
  let idx = 0;
  return function() {
    const resp = responses[idx++] || { ok: true, status: 200, body: {} };
    const isOk = resp.ok !== false;
    return Promise.resolve({
      ok:   isOk,
      status: resp.status || (isOk ? 200 : 500),
      json: () => Promise.resolve(resp.body || {}),
    });
  };
}

// Capture fetch calls to inspect URLs.
function makeCaptureFetch(responses) {
  const calls = [];
  let idx = 0;
  const fn = function(url) {
    calls.push(url);
    const resp = responses[idx++] || { ok: true, status: 200, body: {} };
    const isOk = resp.ok !== false;
    return Promise.resolve({
      ok: isOk,
      status: resp.status || (isOk ? 200 : 500),
      json: () => Promise.resolve(resp.body || {}),
    });
  };
  fn.calls = calls;
  return fn;
}

(async () => {

// ── 1. flag default false ─────────────────────────────────────────────────────
section('1. FF_BACKEND_CANDLES_MCX_CHARTS default false');
ok(sandbox.ffBackendCandlesMcxCharts() === false, '1: returns false with no localStorage key');

// ── 2. flag true only when localStorage key === "1" ───────────────────────────
section('2. flag enabled via localStorage');
sandbox.localStorage.setItem('apex_ff_backend_candles_mcx_charts', '1');
ok(sandbox.ffBackendCandlesMcxCharts() === true,  '2: returns true when key==="1"');
sandbox.localStorage.removeItem('apex_ff_backend_candles_mcx_charts');
ok(sandbox.ffBackendCandlesMcxCharts() === false, '2: returns false after key removed');

section('2b. flag falsy for non-"1" values');
['0', 'true', 'yes', '', 'false'].forEach((v) => {
  sandbox.localStorage.setItem('apex_ff_backend_candles_mcx_charts', v);
  ok(!sandbox.ffBackendCandlesMcxCharts(), '2b: flag false when value="' + v + '"');
});
sandbox.localStorage.removeItem('apex_ff_backend_candles_mcx_charts');

// ── 3. backend read response maps to MCX chart candle shape ───────────────────
section('3. backend read response maps to MCX chart candle shape');
{
  const raw1d = bars(25, 500);
  const raw4h = bars(22, 480);
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },                                    // warmup
    { ok: true, body: { candles: toBackendShape(raw1d) } },    // 1D read
    { ok: true, body: { candles: toBackendShape(raw4h) } },    // 4H read
  ]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,                           '3: result.ok is true');
  ok(r.source === 'BACKEND_DXLINK_CANDLES',   '3: source is BACKEND_DXLINK_CANDLES');
  ok(Array.isArray(r.candles1d),              '3: candles1d is an array');
  ok(r.candles1d.length === 25,               '3: candles1d has 25 bars');

  // MCX chart renderer expects {time, open, high, low, close, volume, source}
  const c0 = r.candles1d[0];
  ok(typeof c0.time   === 'number',  '3: candle.time is epoch-ms number');
  ok(typeof c0.open   === 'number',  '3: candle.open is number');
  ok(typeof c0.high   === 'number',  '3: candle.high is number');
  ok(typeof c0.low    === 'number',  '3: candle.low is number');
  ok(typeof c0.close  === 'number',  '3: candle.close is number');
  ok(typeof c0.volume === 'number',  '3: candle.volume is number');
  ok(c0.source === 'BACKEND_DXLINK_CANDLES', '3: candle.source === BACKEND_DXLINK_CANDLES');

  ok(Array.isArray(r.candles4h) && r.candles4h.length >= 20, '3: candles4h populated');
  ok(r.candles4h[0].source === 'BACKEND_DXLINK_CANDLES',     '3: 4H candle.source correct');
}
{
  // Normalization sorts ascending by time even when backend returns reversed order.
  const raw = bars(30, 400);
  const reversed = toBackendShape([...raw].reverse());
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },
    { ok: true, body: { candles: reversed } },
    { ok: true, body: { candles: toBackendShape(raw.slice(0, 20)) } },
  ]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok && r.candles1d[0].time < r.candles1d[r.candles1d.length - 1].time,
    '3: candles1d sorted ascending by time');
}

// ── 4. 4H uses read endpoint; warmup timeframes are 1D+30M only ───────────────
section('4. 4H uses read endpoint only after 30M warmup');
{
  const src = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));

  ok(/30M/.test(src), '4: 30M present in warmup timeframes');

  const warmupBodyMatch = src.match(/timeframes\s*:\s*\[[^\]]+\]/);
  ok(warmupBodyMatch !== null, '4: timeframes array literal found');
  if (warmupBodyMatch) {
    ok(!/'4H'/.test(warmupBodyMatch[0]) && !/"4H"/.test(warmupBodyMatch[0]),
      '4: 4H not in warmup timeframes (derived server-side from 30M)');
  }

  ok(/\?timeframe=4H/.test(src), '4: 4H is fetched via ?timeframe=4H read endpoint');

  const warmupCount = (src.match(/\/warmup/g) || []).length;
  ok(warmupCount === 1, '4: /warmup endpoint called exactly once');
}

// ── 5. backend failure returns fallbackReason ─────────────────────────────────
section('5. backend failure returns fallbackReason');
{
  // Warmup HTTP error
  sandbox.fetch = makeFetch([{ ok: false, status: 503 }]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,                        '5: ok false on warmup HTTP failure');
  ok(typeof r.fallbackReason === 'string',  '5: fallbackReason is a string');
  ok(/warmup/.test(r.fallbackReason),       '5: fallbackReason mentions warmup');
  ok(/503/.test(r.fallbackReason),          '5: fallbackReason includes HTTP status');
}
{
  // 1D read HTTP error
  sandbox.fetch = makeFetch([
    { ok: true,  body: {} },
    { ok: false, status: 404 },
  ]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,             '5: ok false on 1D HTTP failure');
  ok(/1D/.test(r.fallbackReason), '5: fallbackReason mentions 1D');
}
{
  // 1D returns fewer than 20 bars
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },
    { ok: true, body: { candles: toBackendShape(bars(10, 100)) } },
  ]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,                           '5: ok false when 1D insufficient');
  ok(/1D_insufficient/.test(r.fallbackReason), '5: fallbackReason is 1D_insufficient');
}
{
  // 4H read fails — non-fatal; 1D still ok
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },
    { ok: true, body: { candles: toBackendShape(bars(25, 400)) } },
    { ok: false, status: 500 },
  ]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,            '5: ok true even when 4H fails (non-fatal)');
  ok(r.candles4h === null,     '5: candles4h null when 4H HTTP fails');
  ok(r.candles1d.length >= 20, '5: candles1d still populated when 4H fails');
}

// ── 6. unsupported VIX/VI3M symbol falls back safely ─────────────────────────
section('6. unsupported VI3M symbol falls back safely');
{
  // Simulate warmup failing for a VIX-style symbol (503)
  sandbox.fetch = makeFetch([{ ok: false, status: 503 }]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('$VIX3M.X');
  ok(r.ok === false,                    '6: ok false for unsupported VI3M warmup failure');
  ok(typeof r.fallbackReason === 'string', '6: fallbackReason is a string');
  ok(r.fallbackReason.length > 0,       '6: fallbackReason is non-empty');
}
{
  // Simulate 1D returning empty for VIX-style symbol
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },
    { ok: true, body: { candles: [] } },   // empty 1D
  ]);
  const r = await sandbox._mcxFetchBackendCandlesForChart('$VIX3M.X');
  ok(r.ok === false,                           '6: ok false when 1D empty for VI3M');
  ok(/1D_insufficient/.test(r.fallbackReason), '6: fallbackReason is 1D_insufficient');
}

// ── 7. no /market/candles in _mcxFetchBackendCandlesForChart ──────────────────
section('7. no /market/candles in _mcxFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));
  ok(!/\/market\/candles(?!-dxlink)/.test(src),
    '7: no /market/candles (non-dev) in MCX helper');
  ok(/\/dev\/market\/candles-dxlink\//.test(src),
    '7: uses /dev/market/candles-dxlink/ endpoints');
  ok(/\/dev\/market\/candles-dxlink\/warmup/.test(src),
    '7: warmup endpoint present');
}

// ── 8. no Yahoo in _mcxFetchBackendCandlesForChart ────────────────────────────
section('8. no Yahoo in _mcxFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));
  ok(!/yahoo/i.test(src), '8: no Yahoo reference in MCX backend helper');
}

// ── 9. no new WebSocket in _mcxFetchBackendCandlesForChart ────────────────────
section('9. no new WebSocket in _mcxFetchBackendCandlesForChart');
{
  const src = extractFn(HTML, '_mcxFetchBackendCandlesForChart');
  ok(!/new WebSocket/.test(src), '9: helper opens no WebSocket');
}

// ── 10. flag false leaves legacy MCX render path unchanged ────────────────────
section('10. flag false: legacy MCX path unchanged');
{
  const src = stripComments(extractFn(HTML, '_mcxRenderCharts'));
  ok(/getDailyCandles/.test(src),     '10: _mcxRenderCharts still calls getDailyCandles');
  ok(/getFourHourCandles/.test(src),  '10: _mcxRenderCharts still calls getFourHourCandles');
  ok(/ffBackendCandlesMcxCharts/.test(src), '10: flag check present in _mcxRenderCharts');

  // Legacy candle getters must appear after the flag check
  const flagIdx  = src.indexOf('ffBackendCandlesMcxCharts');
  const dailyIdx = src.lastIndexOf('getDailyCandles');
  ok(dailyIdx > flagIdx, '10: getDailyCandles fallback positioned after flag check');

  ok(sandbox.ffBackendCandlesMcxCharts() === false,
    '10: flag is false by default — legacy path is active');
}
{
  const src = stripComments(extractFn(HTML, 'ffBackendCandlesMcxCharts'));
  ok(/localStorage/.test(src),        '10: flag reads localStorage');
  ok(!/^\s*return true/.test(src),    '10: flag is not hard-coded true');
}

// ── 11. MCX cache does not use or mutate _pfBackendCandleCache ────────────────
section('11. MCX cache isolation from _pfBackendCandleCache');
{
  const mcxFetchSrc = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));
  ok(!/_pfBackendCandleCache/.test(mcxFetchSrc),
    '11: _mcxFetchBackendCandlesForChart does not reference _pfBackendCandleCache');

  // Cache entry helpers also must not reference portfolio cache
  const entrySrc  = stripComments(extractFn(HTML, '_mcxGetBackendCandleEntry'));
  const cachedSrc = stripComments(extractFn(HTML, '_mcxGetCachedBackendCandles'));
  ok(!/_pfBackendCandleCache/.test(entrySrc),
    '11: _mcxGetBackendCandleEntry does not reference _pfBackendCandleCache');
  ok(!/_pfBackendCandleCache/.test(cachedSrc),
    '11: _mcxGetCachedBackendCandles does not reference _pfBackendCandleCache');

  // Portfolio cache variable must be untouched in sandbox
  ok(sandbox._pfBackendCandleCache === null,
    '11: sandbox _pfBackendCandleCache is still null after all MCX calls');

  // MCX cache is separate: uses _mcxBackendCandleCache
  const renderSrc = stripComments(extractFn(HTML, '_mcxRenderCharts'));
  ok(/_mcxBackendCandleCache/.test(renderSrc) || /ffBackendCandlesMcxCharts/.test(renderSrc),
    '11: _mcxRenderCharts references MCX-specific cache or flag');
}

// ── summary ───────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);

})();
