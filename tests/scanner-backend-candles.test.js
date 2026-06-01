'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FF_BACKEND_CANDLES_SCANNER_CHARTS — pure-helper validation.
//
// First backend-migration slice: the Directional Setup Scanner (DSS) detail
// charts (reason=scanner_chart) read backend cached candles instead of opening
// direct DXLink Candle subscriptions.
//
// Tests prove:
//   1. flag default false (no localStorage)
//   2. flag true only when localStorage key is '1'
//   3. backend read response maps to scanner chart candle shape
//   4. backend 4H uses read endpoint only; warmup uses 30M not 4H
//   5. backend failure returns fallbackReason
//   6. no /market/candles string in the new backend scanner chart helper
//   7. no Yahoo string in the new backend scanner chart helper
//   8. no new WebSocket usage in the scanner chart helper
//   9. flag false leaves legacy getDailyCandles / getFourHourCandles path unchanged
//  10. scanner_chart DXLink subscription is gated behind the flag in _dssRenderLargeCharts
//
// Run: node tests/scanner-backend-candles.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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
  fetch: null, // overridden per-test
  Object,
  Array,
  Promise,
};
vm.createContext(sandbox);

const FNS = [
  'ffBackendCandlesScannerCharts',
  '_apexParityNormCandleArray', '_apexParityNormCandle', '_apexParityNormTime',
  '_apexParityExtractBackendCandles',
  '_scannerFetchBackendCandlesForChart',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

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

(async () => {

// ── 1. flag default false ─────────────────────────────────────────────────────
section('1. FF_BACKEND_CANDLES_SCANNER_CHARTS default false');
ok(sandbox.ffBackendCandlesScannerCharts() === false, 'returns false with no localStorage key');

// ── 2. flag true only when localStorage key === "1" ───────────────────────────
section('2. flag enabled via localStorage');
sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
ok(sandbox.ffBackendCandlesScannerCharts() === true,  'returns true when key==="1"');
sandbox.localStorage.removeItem('apex_ff_backend_candles_scanner_charts');
ok(sandbox.ffBackendCandlesScannerCharts() === false, 'returns false after key removed');

section('2b. flag falsy for non-"1" values');
['0', 'true', 'yes', '', 'false'].forEach((v) => {
  sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', v);
  ok(!sandbox.ffBackendCandlesScannerCharts(), 'flag false when value="' + v + '"');
});
sandbox.localStorage.removeItem('apex_ff_backend_candles_scanner_charts');

// ── 3. backend read response maps to scanner chart candle shape ────────────────
section('3. backend read response maps to scanner chart candle shape');
{
  const raw1d = bars(25, 500);
  const raw4h = bars(22, 480);
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },                                    // warmup
    { ok: true, body: { candles: toBackendShape(raw1d) } },    // 1D read
    { ok: true, body: { candles: toBackendShape(raw4h) } },    // 4H read
  ]);
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === true,                           '3: result.ok is true');
  ok(r.source === 'BACKEND_DXLINK_CANDLES',   '3: source is BACKEND_DXLINK_CANDLES');
  ok(Array.isArray(r.candles1d),              '3: candles1d is an array');
  ok(r.candles1d.length === 25,               '3: candles1d has 25 bars');

  // Scanner chart renderer (_drawCandleChart/computeCandleIndicators) expects
  // {time, open, high, low, close, volume, source}
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
  // Verify normalization sorts ascending by time even when backend returns reversed order.
  const raw = bars(30, 400);
  const reversed = toBackendShape([...raw].reverse());
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },
    { ok: true, body: { candles: reversed } },
    { ok: true, body: { candles: toBackendShape(raw.slice(0, 20)) } },
  ]);
  const r = await sandbox._scannerFetchBackendCandlesForChart('NVDA');
  ok(r.ok && r.candles1d[0].time < r.candles1d[r.candles1d.length - 1].time,
    '3: candles1d sorted ascending by time');
}

// ── 4. backend 4H uses read endpoint only; warmup uses 30M not 4H ─────────────
section('4. 4H uses read endpoint; warmup timeframes are 1D+30M only');
{
  const src = stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart'));

  ok(/30M/.test(src), '4: 30M present in function (warmup timeframes)');

  const warmupBodyMatch = src.match(/timeframes\s*:\s*\[[^\]]+\]/);
  ok(warmupBodyMatch !== null, '4: timeframes array literal found in function');
  if (warmupBodyMatch) {
    ok(!/'4H'/.test(warmupBodyMatch[0]) && !/"4H"/.test(warmupBodyMatch[0]),
      '4: 4H not in warmup timeframes (derived server-side from 30M)');
  }

  ok(/\?timeframe=4H/.test(src), '4: 4H read uses ?timeframe=4H endpoint');

  const warmupCount = (src.match(/\/warmup/g) || []).length;
  ok(warmupCount === 1, '4: /warmup endpoint called exactly once');
}

// ── 5. backend failure returns fallbackReason ─────────────────────────────────
section('5. backend failure returns fallbackReason');
{
  sandbox.fetch = makeFetch([{ ok: false, status: 503 }]);
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === false,                          '5: ok false on warmup HTTP failure');
  ok(typeof r.fallbackReason === 'string',    '5: fallbackReason is a string');
  ok(/warmup/.test(r.fallbackReason),         '5: fallbackReason mentions warmup');
  ok(/503/.test(r.fallbackReason),            '5: fallbackReason includes HTTP status');
}
{
  sandbox.fetch = makeFetch([
    { ok: true,  body: {} },      // warmup ok
    { ok: false, status: 404 },   // 1D fails
  ]);
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === false,           '5: ok false on 1D HTTP failure');
  ok(/1D/.test(r.fallbackReason), '5: fallbackReason mentions 1D');
}
{
  const fewBars = toBackendShape(bars(10, 100));
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },
    { ok: true, body: { candles: fewBars } },
  ]);
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === false,                          '5: ok false when 1D insufficient');
  ok(/1D_insufficient/.test(r.fallbackReason), '5: fallbackReason is 1D_insufficient');
}
{
  const good1d = toBackendShape(bars(25, 400));
  sandbox.fetch = makeFetch([
    { ok: true, body: {} },
    { ok: true, body: { candles: good1d } },
    { ok: false, status: 500 },    // 4H fails
  ]);
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === true,             '5: ok true even when 4H fails (non-fatal)');
  ok(r.candles4h === null,      '5: candles4h null when 4H HTTP fails');
  ok(r.candles1d.length >= 20,  '5: candles1d still populated when 4H fails');
}

// ── 6. no /market/candles string in the new backend scanner chart helper ───────
section('6. no /market/candles in _scannerFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart'));
  ok(!/\/market\/candles(?!-dxlink)/.test(src),
    '6: no /market/candles (non-dev) in helper');
  ok(/\/dev\/market\/candles-dxlink\//.test(src),
    '6: uses /dev/market/candles-dxlink/ endpoints');
  ok(/\/dev\/market\/candles-dxlink\/warmup/.test(src),
    '6: warmup endpoint present');
}

// ── 7. no Yahoo string in the new backend scanner chart helper ─────────────────
section('7. no Yahoo in _scannerFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart'));
  ok(!/yahoo/i.test(src), '7: no Yahoo reference in scanner backend helper');
}

// ── 8. no new WebSocket usage ─────────────────────────────────────────────────
section('8. no new WebSocket in _scannerFetchBackendCandlesForChart');
{
  const src = extractFn(HTML, '_scannerFetchBackendCandlesForChart');
  ok(!/new WebSocket/.test(src), '8: helper opens no WebSocket');
}

// ── 9. flag false leaves legacy getDailyCandles / getFourHourCandles path ──────
section('9. flag false: legacy getDailyCandles / getFourHourCandles path unchanged');
{
  const src = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/getDailyCandles/.test(src),        '9: _dssRenderLargeCharts still calls getDailyCandles');
  ok(/getFourHourCandles/.test(src),     '9: _dssRenderLargeCharts still calls getFourHourCandles');
  ok(/ffBackendCandlesScannerCharts/.test(src), '9: flag check present in _dssRenderLargeCharts');

  // getDailyCandles must appear as a fallback — after the flag check
  const flagIdx    = src.indexOf('ffBackendCandlesScannerCharts');
  const dailyIdx   = src.lastIndexOf('getDailyCandles');
  ok(dailyIdx > flagIdx, '9: getDailyCandles fallback is positioned after flag check');

  ok(sandbox.ffBackendCandlesScannerCharts() === false,
    '9: flag is false by default — legacy path is active');
}
{
  const src = stripComments(extractFn(HTML, 'ffBackendCandlesScannerCharts'));
  ok(/localStorage/.test(src), '9: flag reads localStorage');
  ok(!/^\s*return true/.test(src), '9: flag is not hard-coded true');
}

// ── 10. scanner_chart subscription is gated behind the flag ───────────────────
section('10. scanner_chart DXLink subscription gated behind FF in _dssRenderLargeCharts');
{
  const src = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));

  // The scanner_chart subscription must still exist (legacy path) ...
  ok(/'scanner_chart'/.test(src) || /"scanner_chart"/.test(src),
    '10: scanner_chart reason still present for legacy path');

  // ... but it must be guarded by a negated flag check (skipped in backend mode).
  ok(/!ffBackendCandlesScannerCharts\(\)/.test(src),
    '10: a !ffBackendCandlesScannerCharts() guard is present');

  // The negated guard appears before the scanner_chart subscription call.
  const guardIdx = src.indexOf('!ffBackendCandlesScannerCharts()');
  const subIdx   = src.indexOf('scanner_chart');
  ok(guardIdx >= 0 && subIdx >= 0 && guardIdx < subIdx,
    '10: !flag guard precedes the scanner_chart subscription');
}

// ── summary ───────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);

})();
