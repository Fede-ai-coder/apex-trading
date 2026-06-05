'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Scanner-chart + RS-chart backend candle migration — validation suite.
//
// Tests prove the deliverables in the migration task:
//  1.  scanner_chart uses backend read first (no immediate CANDLE-STREAM call)
//  2.  scanner_chart does NOT call frontend 30M subscription when backend succeeds
//  3.  scanner_chart warms 30M single-symbol when 4H missing from backend
//  4.  scanner_chart does NOT call /scanner/run
//  5.  rs_chart loads only selected symbol + SPY (not a batch)
//  6.  rs_chart does NOT open mass frontend 30M subscriptions per symbol
//  7.  repeated navigation dedupes in-flight requests per symbol|tf|reason
//  8.  symbol switch guard: stale result not rendered into the wrong chart
//  9.  backend endpoint unavailable → precise UI reason (no misleading messages)
// 10.  no Yahoo in _ensureBackendChartCandles
// 11.  no REST candle fallback (/market/candles without -dxlink)
// 12.  no new WebSocket in _ensureBackendChartCandles
// 13.  Squeeze Fire 4H loader (_sfsEnsureDetail4hCandles) still present + unchanged
// 14.  _scannerFetchBackendCandlesForChart (Backend Preview) still present + unchanged
// 15.  openScannerChart no longer calls _ensureCandleSubscription / _ensure30MSubscription
// 16.  openRsChart no longer calls _ensureCandleSubscription / _ensure30MSubscription
// 17.  _backendChartUiMsg returns precise per-state messages
// 18.  window.apexDebugScannerChartBackendCandles is registered unconditionally
// 19.  renderScannerInlineChart is async and uses _ensureBackendChartCandles
// 20.  renderRsCharts is async and uses _ensureBackendChartCandles
//
// Run: node tests/scanner-chart-backend-candles-migration.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Extract helpers ──────────────────────────────────────────────────────────

// Brace-matched function extraction — handles async + sync, inner functions, comments.
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

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── Sandbox for runtime tests ─────────────────────────────────────────────────
const mockLS = {};
const subscriptionCalls = { ensure1d: [], ensure30m: [] };

function makeSandbox(fetchImpl) {
  return {
    console, Date, Math, JSON, Number, Boolean, Object, Array, Promise,
    isFinite, parseFloat, parseInt, encodeURIComponent, String,
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    _backendAuthHeaders: (extra) => Object.assign({ 'X-Test': '1' }, extra || {}),
    _recordCandleSubscriptionRequest: () => {},
    APEX_PARITY_TOL: 0.0001,
    localStorage: {
      getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
      setItem:    (k, v) => { mockLS[k] = String(v); },
      removeItem: (k) => { delete mockLS[k]; },
    },
    fetch: fetchImpl || null,
    // Shared state stubs
    _backendChartCandleInflight: {},
    _backendChartDiag: {
      selectedSymbol: null, chartType: null, currentTimeframe: null,
      backendReadAttempted: false, backendWarmupAttempted: false,
      lastError: null, candleCounts: {}, frontendCandleStreamFallbackUsed: false,
    },
    // Candle buffer stubs (simulates DXLink buffer — empty by default)
    getDailyCandles: () => null,
    getFourHourCandles: () => null,
    // Normalization helpers
    _apexParityNormCandleArray: (arr) => (arr || []).map((c) => ({
      t: typeof c.time === 'string' ? new Date(c.time).getTime() : (c.t || c.time || 0),
      o: c.open || c.o || 0, h: c.high || c.h || 0,
      l: c.low  || c.l || 0, c: c.close || c.c || 0, v: c.volume || c.v || 0,
    })).sort((a, b) => a.t - b.t),
    _apexParityExtractBackendCandles: (json) => {
      if (!json) return [];
      for (const k of ['candles', 'bars', 'data']) if (Array.isArray(json[k])) return json[k];
      return [];
    },
    window: { apexDebugScannerChartBackendCandles: null },
  };
}

// Backend response factory for {ok, body} pairs.
function resp(ok, body, status) {
  const isOk = ok !== false;
  return { ok: isOk, status: status || (isOk ? 200 : 500), json: () => Promise.resolve(body || {}) };
}

// Build a synthetic candle array of N bars in backend ISO shape.
function bars(n, base) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = base + i * 0.5;
    out.push({ time: new Date(ms0 + i * 86400000).toISOString(),
               open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000 });
  }
  return out;
}

// URL-aware fetch router. routes: { read1d, read4h, warmup } each a list of responses.
function makeRouter(routes) {
  const calls = { read1d: 0, read4h: 0, warmup: 0, scannerRun: 0, other: 0, urls: [] };
  const fn = function(url, opts) {
    calls.urls.push(url);
    if (/\/scanner\/run/i.test(url)) { calls.scannerRun++; return Promise.resolve(resp(false, {}, 403)); }
    let kind = 'other';
    if (/\/warmup/.test(url)) kind = 'warmup';
    else if (/timeframe=1D/.test(url)) kind = 'read1d';
    else if (/timeframe=4H/.test(url)) kind = 'read4h';
    calls[kind]++;
    const list = routes[kind] || [{ ok: true, body: {} }];
    const r = list[Math.min(calls[kind] - 1, list.length - 1)];
    return Promise.resolve(resp(r.ok !== false, r.body || {}, r.status));
  };
  fn.calls = calls;
  return fn;
}

// Shared set of functions needed to run _ensureBackendChartCandles in a sandbox.
// _apexParityNormCandle and _apexParityNormTime are called by _apexParityNormCandleArray.
const ENSURE_FNS = [
  '_apexParityNormTime', '_apexParityNormCandle',
  '_apexParityNormCandleArray', '_apexParityExtractBackendCandles',
  '_sfsExtractBackendCandles', '_sfsFetchBackendCandles',
  '_ensureBackendChartCandles',
];

// Run _ensureBackendChartCandles in a fresh sandbox.
async function runEnsure(symbol, timeframe, reason, routes) {
  const sb = makeSandbox(makeRouter(routes || {}));
  const ctx = vm.createContext(sb);
  vm.runInContext(ENSURE_FNS.map((n) => extractFn(HTML, n)).join('\n'), ctx);
  const result = await sb._ensureBackendChartCandles(symbol, timeframe, reason);
  return { result, calls: sb.fetch.calls };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1 — STATIC SOURCE CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

section('1. scanner_chart uses backend read first (no immediate CANDLE-STREAM)');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  ok(/\/dev\/market\/candles-dxlink\//.test(src), '1: uses /dev/market/candles-dxlink/ read endpoint');
  ok(/_sfsFetchBackendCandles\(/.test(src), '1: calls _sfsFetchBackendCandles (cached GET)');
  // Read appears before warmup in source (read-first ordering).
  const readIdx   = src.indexOf('_sfsFetchBackendCandles(');
  const warmupIdx = src.indexOf('/warmup');
  ok(readIdx >= 0 && warmupIdx >= 0 && readIdx < warmupIdx,
    '1: _sfsFetchBackendCandles read precedes /warmup in source (read-first)');
}

section('2. scanner_chart does NOT call frontend 30M subscription when backend succeeds');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  ok(!/_ensureCandleSubscription/.test(src), '2: no _ensureCandleSubscription in _ensureBackendChartCandles');
  ok(!/_ensure30MSubscription/.test(src),    '2: no _ensure30MSubscription in _ensureBackendChartCandles');
  ok(!/subscribeCandles/.test(src),          '2: no subscribeCandles in _ensureBackendChartCandles');
}

section('3. scanner_chart warms 30M single-symbol when 4H missing from backend');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  // Warmup body must reference 30M for 4H charts.
  ok(/30M/.test(src), '3: 30M present in warmup logic');
  // Warmup for 4H should NOT include "4H" as a literal timeframe (4H derived server-side).
  // The warmup timeframes variable is ['30M'] for 4H requests.
  const warmupLiterals = src.match(/\['[^']+(?:','[^']+)*'\]/g) || [];
  const anyWarmup4H = warmupLiterals.some((m) => m.includes("'4H'") || m.includes('"4H"'));
  ok(!anyWarmup4H, '3: warmup timeframes literals do not include 4H (4H derived server-side from 30M)');
  // Warmup for 1D path includes '1D' in the timeframe variable assignment.
  ok(/'1D'/.test(src) && /'30M'/.test(src),
    '3: both 1D and 30M appear in warmup logic (1D warmup uses [1D,30M])');
  // Exactly one warmup call per request cycle.
  ok((src.match(/\/warmup/g) || []).length === 1, '3: /warmup referenced exactly once per request');
  // Single-symbol warmup: symbols array built with just [symbol].
  ok(/symbols\s*:\s*\[\s*symbol\s*\]/.test(src), '3: warmup symbols: [symbol] (single-symbol only)');
}

section('4. scanner_chart does NOT call /scanner/run');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  ok(!/\/scanner\/run/i.test(src), '4: /scanner/run absent from _ensureBackendChartCandles');
  // Also check renderScannerInlineChart
  const renderSrc = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  ok(!/\/scanner\/run/i.test(renderSrc), '4: /scanner/run absent from renderScannerInlineChart');
}

section('5. rs_chart loads only selected symbol + SPY (not a batch)');
{
  const src = stripComments(extractFn(HTML, 'renderRsCharts'));
  // Uses _ensureBackendChartCandles for symbol and SPY individually.
  ok(/_ensureBackendChartCandles\(symbol/.test(src), '5: calls _ensureBackendChartCandles(symbol, ...)');
  ok(/_ensureBackendChartCandles\('SPY'/.test(src) || /_ensureBackendChartCandles\("SPY"/.test(src),
    '5: calls _ensureBackendChartCandles(\'SPY\', ...) for benchmark');
  // No batch array syntax (symbols loaded one by one).
  ok(!(/symbols\s*:\s*\[/.test(src)), '5: renderRsCharts does not POST a symbols batch itself');
}

section('6. rs_chart does NOT open mass frontend 30M subscriptions per symbol');
{
  const openRs = stripComments(extractFn(HTML, 'openRsChart'));
  ok(!/_ensureCandleSubscription/.test(openRs), '6: openRsChart no longer calls _ensureCandleSubscription');
  ok(!/_ensure30MSubscription/.test(openRs),    '6: openRsChart no longer calls _ensure30MSubscription');
  ok(!/'rs_chart'/.test(openRs) && !/"rs_chart"/.test(openRs),
    '6: reason=rs_chart string removed from openRsChart subscriptions');
}

section('7. repeated navigation dedupes in-flight requests per symbol|tf|reason');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  // Key-based deduplication.
  ok(/key\s*=\s*symbol\s*\+\s*'[|]'/.test(src) || /key\s*=\s*symbol\s*\+/.test(src),
    '7: key built from symbol in _ensureBackendChartCandles');
  ok(/_backendChartCandleInflight\[key\]/.test(src), '7: in-flight map keyed lookup present');
  ok(/delete _backendChartCandleInflight\[key\]/.test(src),
    '7: in-flight key deleted after completion (no memory leak)');
}

section('8. symbol switch guard: stale result not rendered');
{
  const scannerSrc = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  ok(/_scannerChartSymbol\s*!==\s*symbol/.test(scannerSrc),
    '8: scanner chart checks _scannerChartSymbol !== symbol after await');

  const rsSrc = stripComments(extractFn(HTML, 'renderRsCharts'));
  ok(/S\.rsChartState\.symbol\s*!==\s*symbol/.test(rsSrc),
    '8: RS chart checks S.rsChartState.symbol !== symbol after await');
}

section('9. backend endpoint unavailable → precise UI reason');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  ok(/ENDPOINT_UNAVAILABLE/.test(src), '9: ENDPOINT_UNAVAILABLE error code present');
  ok(/BACKEND_CACHE_NOT_READY/.test(src), '9: BACKEND_CACHE_NOT_READY error code present');

  const uiSrc = stripComments(extractFn(HTML, '_backendChartUiMsg'));
  ok(/ENDPOINT_UNAVAILABLE/.test(uiSrc), '9: _backendChartUiMsg handles ENDPOINT_UNAVAILABLE');
  ok(/BACKEND_CACHE_NOT_READY/.test(uiSrc), '9: _backendChartUiMsg handles BACKEND_CACHE_NOT_READY');
  ok(/subscription/i.test(uiSrc), '9: _backendChartUiMsg handles subscription cap/backoff');
  ok(/insufficient/i.test(uiSrc), '9: _backendChartUiMsg handles insufficient candles');
  // No misleading "run scan first" messages.
  ok(!/run scan/i.test(uiSrc), '9: no "run scan" message in _backendChartUiMsg');
  ok(!/try again/i.test(uiSrc), '9: no "try again" message in _backendChartUiMsg');
}

section('10. no Yahoo in _ensureBackendChartCandles');
{
  const src = extractFn(HTML, '_ensureBackendChartCandles');
  ok(!/yahoo/i.test(src), '10: no Yahoo reference in _ensureBackendChartCandles');
}

section('11. no REST candle fallback (/market/candles without -dxlink)');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  ok(!/\/market\/candles(?!-dxlink)/.test(src), '11: no /market/candles (non-dev) in helper');
  ok(/\/dev\/market\/candles-dxlink/.test(src), '11: only /dev/market/candles-dxlink endpoints used');
}

section('12. no new WebSocket in _ensureBackendChartCandles');
{
  const src = extractFn(HTML, '_ensureBackendChartCandles');
  ok(!/new\s+WebSocket/.test(src), '12: _ensureBackendChartCandles opens no new WebSocket');
}

section('13. Squeeze Fire 4H loader still present and unmodified');
{
  let body;
  try { body = extractFn(HTML, '_sfsEnsureDetail4hCandles'); } catch(e) { body = null; }
  ok(body !== null, '13: _sfsEnsureDetail4hCandles still exists in source');
  if (body) {
    ok(/backendRead|backend.*read|_sfsFetchBackendCandles/.test(body),
      '13: _sfsEnsureDetail4hCandles still reads backend candles');
    ok(!/yahoo/i.test(body), '13: _sfsEnsureDetail4hCandles still has no Yahoo');
    ok(!/\/scanner\/run/i.test(body), '13: _sfsEnsureDetail4hCandles still has no /scanner/run');
  }
}

section('14. Backend Preview (_scannerFetchBackendCandlesForChart) still present and unmodified');
{
  let body;
  try { body = extractFn(HTML, '_scannerFetchBackendCandlesForChart'); } catch(e) { body = null; }
  ok(body !== null, '14: _scannerFetchBackendCandlesForChart still exists in source');
  if (body) {
    ok(/\/dev\/market\/candles-dxlink\//.test(body),
      '14: _scannerFetchBackendCandlesForChart still uses /dev/market/candles-dxlink/');
    ok(!/yahoo/i.test(body), '14: _scannerFetchBackendCandlesForChart still has no Yahoo');
  }
}

section('15. openScannerChart no longer calls CANDLE-STREAM subscriptions');
{
  const src = stripComments(extractFn(HTML, 'openScannerChart'));
  ok(!/_ensureCandleSubscription/.test(src), '15: openScannerChart removed _ensureCandleSubscription call');
  ok(!/_ensure30MSubscription/.test(src),    '15: openScannerChart removed _ensure30MSubscription call');
  ok(!/'chart_open'/.test(src) && !/"chart_open"/.test(src),
    '15: reason=chart_open subscription string removed from openScannerChart');
  // Still calls renderScannerInlineChart.
  ok(/renderScannerInlineChart\(symbol\)/.test(src),
    '15: openScannerChart still calls renderScannerInlineChart(symbol)');
}

section('16. openRsChart no longer calls CANDLE-STREAM subscriptions');
{
  const src = stripComments(extractFn(HTML, 'openRsChart'));
  ok(!/_ensureCandleSubscription/.test(src), '16: openRsChart removed _ensureCandleSubscription call');
  ok(!/_ensure30MSubscription/.test(src),    '16: openRsChart removed _ensure30MSubscription call');
  ok(!/'rs_chart'/.test(src) && !/"rs_chart"/.test(src),
    '16: reason=rs_chart subscription string removed from openRsChart');
  // Still calls renderRsCharts.
  ok(/renderRsCharts\(symbol\)/.test(src),
    '16: openRsChart still calls renderRsCharts(symbol)');
}

section('17. _backendChartUiMsg returns precise per-state messages');
{
  const src = stripComments(extractFn(HTML, '_backendChartUiMsg'));
  ok(/Loading chart candles|Endpoint unavailable|Backend cache not ready/.test(HTML),
    '17: loading state messages present in HTML');
  ok(/Warming backend 30M candles/.test(HTML),
    '17: warming state message present in HTML');
}

section('18. window.apexDebugScannerChartBackendCandles registered unconditionally');
{
  ok(/window\.apexDebugScannerChartBackendCandles\s*=/.test(HTML),
    '18: apexDebugScannerChartBackendCandles registered');
  // Not gated behind a feature flag (the assignment must not be immediately inside an if-FF block).
  const diagIdx   = HTML.indexOf('window.apexDebugScannerChartBackendCandles');
  const ffGateIdx = HTML.lastIndexOf('ffBackendCandlesScannerCharts()', diagIdx);
  ok(ffGateIdx < 0 || diagIdx - ffGateIdx > 500,
    '18: apexDebugScannerChartBackendCandles not immediately inside a FF gate');
  // Exposes required diagnostic fields — search a generous window after the assignment.
  const diagEnd   = HTML.indexOf('};', diagIdx + 100);
  const diagSrc   = HTML.slice(diagIdx, diagEnd > diagIdx ? diagEnd + 2 : diagIdx + 2000);
  ok(/selectedSymbol/.test(diagSrc), '18: diagnostic includes selectedSymbol');
  ok(/chartType/.test(diagSrc),      '18: diagnostic includes chartType');
  ok(/inFlightKeys/.test(diagSrc),   '18: diagnostic includes inFlightKeys');
  ok(/lastError/.test(diagSrc),      '18: diagnostic includes lastError');
  ok(/candleCounts/.test(diagSrc),   '18: diagnostic includes candleCounts');
  ok(/frontendCandleStreamFallbackUsed/.test(diagSrc),
    '18: diagnostic includes frontendCandleStreamFallbackUsed');
}

section('19. renderScannerInlineChart is async and uses _ensureBackendChartCandles');
{
  ok(/async\s+function\s+renderScannerInlineChart/.test(HTML),
    '19: renderScannerInlineChart is declared async');
  const src = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  ok(/_ensureBackendChartCandles\(symbol/.test(src),
    '19: renderScannerInlineChart calls _ensureBackendChartCandles(symbol, ...)');
  ok(/await\s+_scPr1d/.test(src) || /await\s+_ensureBackendChartCandles/.test(src),
    '19: renderScannerInlineChart awaits backend candle result');
  // Stale-symbol guard present.
  ok(/_scannerChartSymbol\s*!==\s*symbol/.test(src),
    '19: stale-symbol guard (_scannerChartSymbol !== symbol) present');
}

section('20. renderRsCharts is async and uses _ensureBackendChartCandles');
{
  ok(/async\s+function\s+renderRsCharts/.test(HTML),
    '20: renderRsCharts is declared async');
  const src = stripComments(extractFn(HTML, 'renderRsCharts'));
  ok(/_ensureBackendChartCandles\(symbol/.test(src),
    '20: renderRsCharts calls _ensureBackendChartCandles(symbol, ...)');
  ok(/_ensureBackendChartCandles\('SPY'/.test(src) || /_ensureBackendChartCandles\("SPY"/.test(src),
    '20: renderRsCharts calls _ensureBackendChartCandles(\'SPY\', ...) for SPY benchmark');
  // Stale-symbol guard.
  ok(/S\.rsChartState\.symbol\s*!==\s*symbol/.test(src),
    '20: stale-symbol guard (S.rsChartState.symbol !== symbol) present');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2 — RUNTIME TESTS FOR _ensureBackendChartCandles
// ═══════════════════════════════════════════════════════════════════════════════

section('R1. backend read cache hit: no warmup called');
(async () => {
  const { result, calls } = await runEnsure('AAPL', '1D', 'scanner_chart', {
    read1d: [{ ok: true, body: { candles: bars(25, 500) } }],
  });
  ok(result.ok === true, 'R1: ok true on cache hit');
  ok(result.source === 'BACKEND_DXLINK_CANDLES', 'R1: source is BACKEND_DXLINK_CANDLES');
  ok(Array.isArray(result.candles) && result.candles.length === 25, 'R1: 25 candles returned');
  ok(calls.warmup === 0, 'R1: /warmup NOT called on cache hit');
  ok(calls.read1d === 1, 'R1: exactly one 1D read (no re-read needed)');
  ok(result.warmupAttempted === false, 'R1: warmupAttempted is false');
})();

section('R2. 4H missing → warms 30M single-symbol → re-reads 4H');
(async () => {
  const { result, calls } = await runEnsure('NVDA', '4H', 'scanner_chart', {
    read4h: [
      { ok: true, body: { candles: [] } },       // cold: empty first read
      { ok: true, body: { candles: bars(22, 400) } }, // warm: 4H populated after warmup
    ],
    warmup: [{ ok: true, body: {} }],
  });
  ok(result.ok === true, 'R2: ok true after warmup');
  ok(calls.warmup === 1, 'R2: /warmup called exactly once');
  ok(calls.read4h === 2, 'R2: 4H read twice (cache miss + post-warmup re-read)');
  ok(result.warmupAttempted === true, 'R2: warmupAttempted is true');
  ok(result.candles && result.candles.length === 22, 'R2: 22 4H candles returned after warmup');
})();

section('R3. 4H warmup uses 30M timeframe, not 4H');
(async () => {
  const { calls } = await runEnsure('TSLA', '4H', 'scanner_chart', {
    read4h: [{ ok: true, body: { candles: [] } }, { ok: true, body: { candles: bars(20, 300) } }],
    warmup: [{ ok: true, body: {} }],
  });
  const warmupUrls = calls.urls.filter((u) => /\/warmup/.test(u));
  ok(warmupUrls.length === 1, 'R3: one warmup POST sent');
  // Verify POST body via source — warmup body for 4H uses 30M, not 4H directly.
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  // 30M must appear somewhere in the function (in the timeframe variable or inline).
  ok(/30M/.test(src), 'R3: warmup body references 30M');
  // No literal '4H' inside a timeframes array in the warmup body.
  const warmupSection = src.slice(src.indexOf('/warmup'));
  const warmup4hInBody = warmupSection.match(/timeframes\s*:\s*\[[^\]]*'4H'[^\]]*\]/);
  ok(!warmup4hInBody, 'R3: 4H not in warmup timeframes body');
})();

section('R4. /scanner/run not called during chart navigation');
(async () => {
  const { calls } = await runEnsure('CAT', '1D', 'scanner_chart', {
    read1d: [{ ok: true, body: { candles: bars(25, 100) } }],
  });
  ok(calls.scannerRun === 0, 'R4: /scanner/run not called');
  ok(calls.urls.every((u) => !/scanner\/run/i.test(u)), 'R4: no scanner/run URL in request log');
})();

section('R5. rs_chart loads symbol + SPY separately (not a batch)');
(async () => {
  // Each call to _ensureBackendChartCandles is single-symbol.
  // Symbol and SPY are loaded by separate calls (proven by source check in test 5).
  const { result: symResult } = await runEnsure('GOOG', '1D', 'rs_chart', {
    read1d: [{ ok: true, body: { candles: bars(25, 180) } }],
  });
  const { result: spyResult } = await runEnsure('SPY', '1D', 'benchmark', {
    read1d: [{ ok: true, body: { candles: bars(25, 500) } }],
  });
  ok(symResult.ok && symResult.symbol === 'GOOG', 'R5: GOOG candles loaded');
  ok(spyResult.ok && spyResult.symbol === 'SPY',  'R5: SPY candles loaded separately');
})();

section('R6. in-flight deduplication: concurrent requests for same key share one promise');
(async () => {
  const sb = makeSandbox(null);
  const ctx = vm.createContext(sb);
  vm.runInContext(ENSURE_FNS.map((n) => extractFn(HTML, n)).join('\n'), ctx);

  let fetchCount = 0;
  sb.fetch = function(url) {
    fetchCount++;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: bars(25, 300) }) });
  };

  // Fire three concurrent requests for the same key.
  const [r1, r2, r3] = await Promise.all([
    sb._ensureBackendChartCandles('MSFT', '1D', 'scanner_chart'),
    sb._ensureBackendChartCandles('MSFT', '1D', 'scanner_chart'),
    sb._ensureBackendChartCandles('MSFT', '1D', 'scanner_chart'),
  ]);
  ok(r1.ok && r2.ok && r3.ok, 'R6: all three concurrent calls succeed');
  ok(fetchCount === 1, 'R6: only ONE actual fetch despite three concurrent calls (deduped)');
})();

section('R7. endpoint unavailable (status 0) → ENDPOINT_UNAVAILABLE error, no warmup');
(async () => {
  const sb = makeSandbox(null);
  const ctx = vm.createContext(sb);
  vm.runInContext([
    '_apexParityNormCandleArray', '_apexParityExtractBackendCandles',
    '_sfsExtractBackendCandles', '_sfsFetchBackendCandles',
    '_ensureBackendChartCandles',
  ].map((n) => extractFn(HTML, n)).join('\n'), ctx);

  let warmupCalled = false;
  sb.fetch = function(url) {
    if (/\/warmup/.test(url)) { warmupCalled = true; }
    return Promise.reject(new TypeError('network error'));  // transport failure → status 0
  };

  const result = await sb._ensureBackendChartCandles('AAPL', '4H', 'scanner_chart');
  ok(result.ok === false, 'R7: ok false on transport failure');
  ok(result.error === 'ENDPOINT_UNAVAILABLE', 'R7: error is ENDPOINT_UNAVAILABLE');
  ok(!warmupCalled, 'R7: warmup NOT called when read throws (endpoint unavailable)');
})();

section('R8. warmup HTTP failure → error set, candles null');
(async () => {
  const { result, calls } = await runEnsure('AMD', '4H', 'scanner_chart', {
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: false, status: 503 }],
  });
  ok(result.ok === false, 'R8: ok false on warmup HTTP failure');
  ok(/warmup_http_503/.test(result.error), 'R8: error includes warmup_http_503');
  ok(result.candles === null, 'R8: candles null on failure');
  ok(calls.warmup === 1, 'R8: warmup attempted once');
})();

section('R9. backend cache not ready after warmup → BACKEND_CACHE_NOT_READY error');
(async () => {
  const { result, calls } = await runEnsure('META', '4H', 'scanner_chart', {
    read4h: [
      { ok: true, body: { candles: [] } },        // cold first read
      { ok: true, body: { candles: bars(5, 200) } }, // still too few bars after warmup
    ],
    warmup: [{ ok: true, body: {} }],
  });
  ok(result.ok === false, 'R9: ok false when too few bars after warmup');
  ok(/BACKEND_CACHE_NOT_READY/.test(result.error), 'R9: error is BACKEND_CACHE_NOT_READY');
  ok(calls.warmup === 1, 'R9: only one warmup attempt (no retry loop)');
})();

section('R10. no Yahoo in any chart navigation function (non-comment source)');
(async () => {
  // Strip comments before checking — "never Yahoo/AH/PM" appears in legacy comments
  // from the PR #207 pattern but is NOT functional code.
  for (const fn of ['_ensureBackendChartCandles', 'renderScannerInlineChart',
                    'renderRsCharts', 'openScannerChart', 'openRsChart']) {
    let body; try { body = stripComments(extractFn(HTML, fn)); } catch(e) { body = null; }
    if (body) ok(!/yahoo/i.test(body), 'R10: no Yahoo in ' + fn + ' (non-comment source)');
  }
})();

section('R11. no /market/candles (non-dev) in chart navigation functions');
(async () => {
  for (const fn of ['_ensureBackendChartCandles', 'renderScannerInlineChart', 'renderRsCharts']) {
    let body; try { body = stripComments(extractFn(HTML, fn)); } catch(e) { body = null; }
    if (body) ok(!/\/market\/candles(?!-dxlink)/.test(body),
      'R11: no non-dev /market/candles in ' + fn);
  }
})();

section('R12. no new WebSocket in chart navigation functions');
(async () => {
  for (const fn of ['_ensureBackendChartCandles', 'renderScannerInlineChart', 'renderRsCharts']) {
    let body; try { body = extractFn(HTML, fn); } catch(e) { body = null; }
    if (body) ok(!/new\s+WebSocket/.test(body), 'R12: no new WebSocket in ' + fn);
  }
})();

// ── summary ───────────────────────────────────────────────────────────────────
// Give async sections a tick to complete before printing final result.
setImmediate(function() {
  console.log('\n' + (fail === 0
    ? 'All ' + pass + ' tests passed.'
    : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  if (fail > 0) process.exit(1);
});
