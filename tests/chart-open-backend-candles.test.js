'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Prefer-backend candle loading on chart open — behavior + anti-regression tests.
//
// Goal under test (cap relief): opening the scanner inline chart must prefer the
// backend candle GET endpoints (GET /dev/market/candles-dxlink/:symbol?timeframe=
// 1D|4H, 4H derived server-side from native 30M) and must NOT spray browser
// DXLink Candle subscriptions for every symbol the user browses. Browser Candle
// subscriptions remain only as a per-symbol fallback when the backend cache
// cannot serve the active chart symbol.
//
// Run: node tests/chart-open-backend-candles.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── 1. flag defaults ON; off only when explicitly "0" ─────────────────────────
section('1. ffPreferBackendCandlesOnChartOpen defaults ON (off only when "0")');
{
  const mockLS = {};
  const sb = {
    localStorage: {
      getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
      setItem: (k, v) => { mockLS[k] = v; },
      removeItem: (k) => { delete mockLS[k]; },
    },
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, 'ffPreferBackendCandlesOnChartOpen'), sb);
  ok(sb.ffPreferBackendCandlesOnChartOpen() === true, '1: default (no key) → true');
  sb.localStorage.setItem('apex_ff_prefer_backend_candles_chart_open', '0');
  ok(sb.ffPreferBackendCandlesOnChartOpen() === false, '1: "0" → false (legacy browser-sub path)');
  ['1', '', 'true', 'yes', 'off'].forEach((v) => {
    sb.localStorage.setItem('apex_ff_prefer_backend_candles_chart_open', v);
    ok(sb.ffPreferBackendCandlesOnChartOpen() === true, '1: non-"0" value "' + v + '" → true');
  });
  sb.localStorage.removeItem('apex_ff_prefer_backend_candles_chart_open');
  ok(sb.ffPreferBackendCandlesOnChartOpen() === true, '1: removed key → back to default true');
}

// ── 2. openScannerChart routes through backend loader, not direct subs ─────────
section('2. openScannerChart prefers backend loader; gates browser subs behind !flag');
{
  const src = stripComments(extractFn(HTML, 'openScannerChart'));
  ok(/ffPreferBackendCandlesOnChartOpen\(\)/.test(src), '2: openScannerChart consults the prefer-backend flag');
  ok(/_scannerLoadBackendCandlesForInlineChart\(/.test(src), '2: backend-first loader is invoked');
  ok(/postCandleContext\(/.test(src), '2: POST /context prewarm (PR #219) is preserved');
  // Direct browser subscriptions must live in the else (legacy) branch only.
  const flagIdx = src.indexOf('ffPreferBackendCandlesOnChartOpen()');
  const ensureIdx = src.indexOf('_ensureCandleSubscription');
  ok(flagIdx >= 0 && ensureIdx >= 0 && flagIdx < ensureIdx,
    '2: prefer-backend flag check precedes any direct browser subscription');
  ok(/else\s*\{[\s\S]*_ensureCandleSubscription[\s\S]*'chart_open'[\s\S]*\}/.test(src),
    '2: chart_open browser subs are in the legacy else branch');
}

// ── 3. backend loader: success → cache + provenance, no subscription ───────────
section('3. _scannerLoadBackendCandlesForInlineChart success path opens no browser sub');
{
  const src = stripComments(extractFn(HTML, '_scannerLoadBackendCandlesForInlineChart'));
  ok(/_scannerFetchBackendCandlesForChart\(/.test(src), '3: reads via _scannerFetchBackendCandlesForChart (backend GET)');
  ok(/_recordCandleProvenance\('backend_cache'/.test(src), '3: records backend_cache provenance on success');
  ok(/_scannerChartSymbol !== symbol/.test(src), '3: guards against browsing away mid-fetch');
  // success branch must NOT itself call _ensureCandleSubscription
  const successPart = src.split('_scannerInlineChartBrowserFallback')[0];
  ok(!/_ensureCandleSubscription|_ensure30MSubscription/.test(successPart),
    '3: success branch opens no browser Candle subscription');
  ok(/_scannerInlineChartBrowserFallback\(/.test(src), '3: failure delegates to the per-symbol fallback');
}

// ── 4. fallback is strictly per-symbol (never universe-wide) ───────────────────
section('4. _scannerInlineChartBrowserFallback is single-symbol scoped');
{
  const src = stripComments(extractFn(HTML, '_scannerInlineChartBrowserFallback'));
  ok(/_scannerChartSymbol !== symbol/.test(src), '4: bails unless symbol is still the active chart symbol');
  ok(/_recordCandleProvenance\('browser_dxlink_fallback'/.test(src), '4: records browser_dxlink_fallback provenance');
  ok(/_ensureCandleSubscription\(\[symbol\]/.test(src), '4: subscribes only the single active symbol (+SPY inside ensure)');
  ok(!/forEach|visibleSymbols|scanData/.test(src), '4: never iterates a symbol universe');
}

// ── 5. renderScannerInlineChart prefers backend cache; no browser poll in mode ─
section('5. renderScannerInlineChart prefers backend cache over browser buffer');
{
  const src = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  ok(/_scannerBackendCandleCache/.test(src), '5: consults _scannerBackendCandleCache');
  ok(/BACKEND_DXLINK_CANDLES/.test(src), '5: labels backend-sourced candles BACKEND_DXLINK_CANDLES');
  // In prefer-backend mode the browser 4H poll must be suppressed.
  ok(/ffPreferBackendCandlesOnChartOpen\(\)/.test(src), '5: prefer-backend mode gates the 4H browser poll');
  const pollIdx = src.indexOf('_schart4hStartPoll');
  const guardIdx = src.indexOf('ffPreferBackendCandlesOnChartOpen()');
  ok(pollIdx >= 0 && guardIdx >= 0 && guardIdx < pollIdx,
    '5: prefer-backend guard precedes _schart4hStartPoll (poll only in legacy branch)');
}

// ── 6. provenance recorder behavior ───────────────────────────────────────────
section('6. _recordCandleProvenance counts backend vs browser sources');
{
  const sb = {
    console: { log() {} },
    _candleProvenanceStats: { backendCache: 0, browserDxlinkFallback: 0, lastSource: null, lastAt: null, lastSymbol: null },
    _candleProvenanceLog: [],
    _CANDLE_PROVENANCE_MAX: 80,
    _candleDiagNowIso: () => '2026-01-01T00:00:00.000Z',
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_recordCandleProvenance'), sb);
  sb._recordCandleProvenance('backend_cache', { symbol: 'PYPL', view: 'scanner_inline_chart', candles1d: 120, candles4h: 40 });
  sb._recordCandleProvenance('backend_cache', { symbol: 'SNOW', view: 'scanner_inline_chart', candles1d: 90, candles4h: 30 });
  sb._recordCandleProvenance('browser_dxlink_fallback', { symbol: 'COIN', view: 'scanner_inline_chart' });
  ok(sb._candleProvenanceStats.backendCache === 2, '6: backendCache count increments');
  ok(sb._candleProvenanceStats.browserDxlinkFallback === 1, '6: browserDxlinkFallback count increments');
  ok(sb._candleProvenanceStats.lastSource === 'browser_dxlink_fallback' && sb._candleProvenanceStats.lastSymbol === 'COIN', '6: last source/symbol tracked');
  ok(sb._candleProvenanceLog.length === 3, '6: provenance ring buffer records each event');
}

// ── 7. candle subscription cap-hit note + wiring ──────────────────────────────
section('7. _noteCandleSubscriptionLimitHit records cap hits; wired into dxlink poll');
{
  const sb = {
    _candleSubscriptionLimitHit: { hit: false, count: 0, firstAt: null, lastAt: null, lastError: null },
    _candleDiagNowIso: () => '2026-01-01T00:00:00.000Z',
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_noteCandleSubscriptionLimitHit'), sb);
  ok(sb._candleSubscriptionLimitHit.hit === false, '7: starts not-hit (acceptance baseline)');
  sb._noteCandleSubscriptionLimitHit("subscription size for event type 'Candle' is too big");
  ok(sb._candleSubscriptionLimitHit.hit === true && sb._candleSubscriptionLimitHit.count === 1, '7: first hit sets flag + count');
  ok(sb._candleSubscriptionLimitHit.firstAt && sb._candleSubscriptionLimitHit.lastError, '7: captures firstAt + lastError');
  sb._noteCandleSubscriptionLimitHit({ message: 'Candle limit again' });
  ok(sb._candleSubscriptionLimitHit.count === 2, '7: subsequent hits increment count');

  const poll = stripComments(extractFn(HTML, 'pollDxlinkStatus'));
  ok(/_noteCandleSubscriptionLimitHit\(_feedErr\)/.test(poll), '7: pollDxlinkStatus notes the cap hit on Candle limit errors');
  const limitIdx = poll.indexOf('_noteCandleSubscriptionLimitHit');
  const candleIdx = poll.indexOf('Candle');
  ok(limitIdx >= 0 && candleIdx >= 0 && candleIdx < limitIdx, '7: cap-hit note is scoped to the Candle limit branch');
}

// ── 8. apexDebugCandleSubscriptions surfaces the new diagnostics ───────────────
section('8. apexDebugCandleSubscriptions exposes provenance + cap-hit diagnostics');
{
  const src = stripComments(extractFn(HTML, 'apexDebugCandleSubscriptions'));
  ok(/provenance:\s*_candleProvenanceStats/.test(src), '8: exposes provenance stats');
  ok(/candleSubscriptionLimitHit:\s*_candleSubscriptionLimitHit/.test(src), '8: exposes candleSubscriptionLimitHit');
  ok(/preferBackendOnChartOpen/.test(src), '8: exposes the prefer-backend mode flag');
}

console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
process.exit(fail ? 1 : 0);
