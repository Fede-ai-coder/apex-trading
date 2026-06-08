'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend-first candle loading for ALL chart surfaces — behavior + anti-regression.
//
// Goal under test (cap relief): EVERY chart surface must prefer the backend candle
// GET endpoints (GET /dev/market/candles-dxlink/:symbol?timeframe=1D|4H, 4H derived
// server-side from native 30M) and must NOT spray browser DXLink Candle
// subscriptions for every symbol the user browses. Browser Candle subscriptions
// remain only as a per-symbol fallback for the single active chart symbol.
//
// Surfaces covered: global policy flag + per-surface delegation; scanner inline
// chart; RS vs SPY chart; main chart; Directional (DSS) chart; Market Context (MCX)
// chart; Portfolio chart; Squeeze Fire chart; shared loader; provenance + cap-hit
// diagnostics.
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

// ── 1. global flag defaults ON; off only when explicitly "0" ──────────────────
section('1. ffPreferBackendCandlesForCharts defaults ON (off only when "0")');
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
  vm.runInContext(extractFn(HTML, 'ffPreferBackendCandlesForCharts'), sb);
  ok(sb.ffPreferBackendCandlesForCharts() === true, '1: default (no key) → true');
  sb.localStorage.setItem('apex_ff_prefer_backend_candles_charts', '0');
  ok(sb.ffPreferBackendCandlesForCharts() === false, '1: "0" → false (legacy browser-sub path)');
  ['1', '', 'true', 'yes', 'off'].forEach((v) => {
    sb.localStorage.setItem('apex_ff_prefer_backend_candles_charts', v);
    ok(sb.ffPreferBackendCandlesForCharts() === true, '1: non-"0" value "' + v + '" → true');
  });
  sb.localStorage.removeItem('apex_ff_prefer_backend_candles_charts');
  ok(sb.ffPreferBackendCandlesForCharts() === true, '1: removed key → back to default true');
}

// ── 2. per-surface flags delegate to the global policy ────────────────────────
section('2. per-surface flags delegate to the global chart policy');
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
  ['ffPreferBackendCandlesForCharts', 'ffBackendCandlesScannerCharts', 'ffBackendCandlesPortfolioCharts', 'ffBackendCandlesMcxCharts']
    .forEach((n) => vm.runInContext(extractFn(HTML, n), sb));
  const surfaces = [
    ['ffBackendCandlesScannerCharts',   'apex_ff_backend_candles_scanner_charts'],
    ['ffBackendCandlesPortfolioCharts', 'apex_ff_backend_candles_portfolio_charts'],
    ['ffBackendCandlesMcxCharts',       'apex_ff_backend_candles_mcx_charts'],
  ];
  surfaces.forEach(([fn, key]) => {
    ok(sb[fn]() === true, '2: ' + fn + ' default ON (delegates to global)');
    sb.localStorage.setItem(key, '0');
    ok(sb[fn]() === false, '2: ' + fn + ' "0" forces OFF');
    sb.localStorage.setItem(key, '1');
    ok(sb[fn]() === true, '2: ' + fn + ' "1" forces ON');
    sb.localStorage.removeItem(key);
    // global OFF propagates
    sb.localStorage.setItem('apex_ff_prefer_backend_candles_charts', '0');
    ok(sb[fn]() === false, '2: ' + fn + ' follows global OFF when unset');
    sb.localStorage.removeItem('apex_ff_prefer_backend_candles_charts');
  });
}

// ── 3. scanner inline chart routes through backend loader, not direct subs ─────
section('3. openScannerChart prefers backend loader; gates browser subs behind !flag');
{
  const src = stripComments(extractFn(HTML, 'openScannerChart'));
  ok(/ffPreferBackendCandlesForCharts\(\)/.test(src), '3: consults the global chart policy');
  ok(/_scannerLoadBackendCandlesForInlineChart\(/.test(src), '3: backend-first loader is invoked');
  ok(/postCandleContext\(/.test(src), '3: POST /context prewarm preserved');
  const flagIdx = src.indexOf('ffPreferBackendCandlesForCharts()');
  const ensureIdx = src.indexOf('_ensureCandleSubscription');
  ok(flagIdx >= 0 && ensureIdx >= 0 && flagIdx < ensureIdx, '3: flag check precedes any direct browser subscription');
  ok(/else\s*\{[\s\S]*_ensureCandleSubscription[\s\S]*'chart_open'[\s\S]*\}/.test(src), '3: chart_open browser subs are in the legacy else branch');
}
{
  const src = stripComments(extractFn(HTML, '_scannerLoadBackendCandlesForInlineChart'));
  ok(/_scannerFetchBackendCandlesForChart\(|_loadBackendChartCandles\(/.test(src), '3: reads via the backend GET loader');
  ok(/_recordBackendCandleProvenance\('scanner_inline_chart'/.test(src), '3: records precise backend provenance (full/partial/4h_missing)');
  const successPart = src.split('_scannerInlineChartBrowserFallback')[0];
  ok(!/_ensureCandleSubscription|_ensure30MSubscription/.test(successPart), '3: success branch opens no browser subscription');
}
{
  const src = stripComments(extractFn(HTML, '_scannerInlineChartBrowserFallback'));
  ok(/_ensureCandleSubscription\(\[symbol\]/.test(src), '3: fallback subscribes only the single active symbol');
  ok(!/forEach|visibleSymbols|scanData/.test(src), '3: fallback never iterates a symbol universe');
}

// ── 4. RS vs SPY chart routes through backend loader ──────────────────────────
section('4. openRsChart prefers backend loader; gates rs_chart subs behind !flag');
{
  const src = stripComments(extractFn(HTML, 'openRsChart'));
  ok(/ffPreferBackendCandlesForCharts\(\)/.test(src), '4: consults the global chart policy');
  ok(/_rsLoadBackendCandlesForChart\(/.test(src), '4: backend-first loader is invoked');
  ok(/postCandleContext\(/.test(src), '4: POST /context prewarm added');
  const flagIdx = src.indexOf('ffPreferBackendCandlesForCharts()');
  const subIdx = src.indexOf("'rs_chart'");
  ok(flagIdx >= 0 && subIdx >= 0 && flagIdx < subIdx, '4: flag check precedes rs_chart subscription');
  ok(/else\s*\{[\s\S]*_ensureCandleSubscription[\s\S]*'rs_chart'[\s\S]*\}/.test(src), '4: rs_chart browser subs are in the legacy else branch');
}
{
  const src = stripComments(extractFn(HTML, '_rsLoadBackendCandlesForChart'));
  ok(/_loadBackendChartCandles\(/.test(src), '4: reads via the shared backend loader');
  ok(/_recordBackendCandleProvenance\('rs_chart'/.test(src), '4: records rs_chart precise backend provenance');
  const successPart = src.split('_rsChartBrowserFallback')[0];
  ok(!/_ensureCandleSubscription|_ensure30MSubscription/.test(successPart), '4: success branch opens no browser subscription');
}
{
  const src = stripComments(extractFn(HTML, '_rsChartBrowserFallback'));
  ok(/_ensureCandleSubscription\(\[symbol,'SPY'\]/.test(src), '4: fallback subscribes only the single active symbol (+SPY)');
  ok(!/forEach|_rsCandidateList|scanData/.test(src), '4: fallback never iterates a symbol universe');
}
{
  const src = stripComments(extractFn(HTML, 'renderRsCharts'));
  ok(/_rsBackendCandleCache/.test(src), '4: renderRsCharts consults _rsBackendCandleCache');
  ok(/BACKEND_DXLINK_CANDLES/.test(src), '4: labels backend-sourced RS candles BACKEND_DXLINK_CANDLES');
  const guardIdx = src.indexOf('ffPreferBackendCandlesForCharts()');
  const pollIdx = src.indexOf('_rs4hStartPoll');
  ok(guardIdx >= 0 && pollIdx >= 0 && guardIdx < pollIdx, '4: prefer-backend guard precedes the browser 4H poll');
}

// ── 5. main chart prefers backend DXLink candles ──────────────────────────────
section('5. openChart prefers backend DXLink candles (fallback: legacy fetchCandles)');
{
  const src = stripComments(extractFn(HTML, 'openChart'));
  ok(/ffPreferBackendCandlesForCharts\(\)/.test(src), '5: consults the global chart policy');
  ok(/_loadBackendChartCandles\(/.test(src), '5: reads via the shared backend loader');
  ok(/_recordCandleProvenance\('backend_cache'[\s\S]*main_chart/.test(src) || /view:'main_chart'/.test(src), '5: records main_chart provenance');
  ok(/postCandleContext\(/.test(src), '5: POST /context prewarm preserved');
  // backend attempt must come before the legacy fetchCandles fallback
  const backendIdx = src.indexOf('_loadBackendChartCandles');
  const fetchIdx = src.lastIndexOf('fetchCandles(');
  ok(backendIdx >= 0 && fetchIdx >= 0 && backendIdx < fetchIdx, '5: backend attempt precedes legacy fetchCandles fallback');
  ok(!/_ensureCandleSubscription|_ensure30MSubscription/.test(src), '5: main chart opens no browser Candle subscriptions');
}
{
  // shape mapper: backend {time:ms} → main chart {t:seconds}
  const sb = {};
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_mainChartMapBackendCandles'), sb);
  const out = sb._mainChartMapBackendCandles([{ time: 1700000000000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }]);
  ok(out.length === 1 && out[0].t === 1700000000 && out[0].c === 1.5 && out[0].v === 100, '5: maps ms→seconds and OHLCV correctly');
}

// ── 6. shared loader exists and reads the backend GET ─────────────────────────
section('6. shared backend-first loader');
{
  const src = stripComments(extractFn(HTML, '_loadBackendChartCandles'));
  ok(/_scannerFetchBackendCandlesForChart\(/.test(src), '6: _loadBackendChartCandles delegates to the read-first backend fetcher');
  const fetcher = stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart'));
  ok(/timeframe=1D/.test(fetcher) && /timeframe=4H/.test(fetcher), '6: fetcher reads 1D and 4H GET endpoints');
  // Legacy Yahoo endpoint is exactly /market/candles; the backend DXLink endpoint
  // is /dev/market/candles-dxlink — exclude that via negative lookahead.
  ok(!/\/market\/candles(?![-a-z])/i.test(fetcher), '6: fetcher never calls /market/candles (no Yahoo)');
}

// ── 7. DSS / MCX / Portfolio surfaces are gated + provenance-tagged ────────────
section('7. DSS / MCX / Portfolio backend-first with gated subs + provenance');
{
  const dss = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/!ffBackendCandlesScannerCharts\(\)/.test(dss), '7: DSS gates scanner_chart subs behind !flag');
  ok(/_recordBackendCandleProvenance\('directional_chart'/.test(dss), '7: DSS records directional_chart precise backend provenance');

  const mcx = stripComments(extractFn(HTML, '_mcxRenderCharts'));
  ok(/!ffBackendCandlesMcxCharts\(\)/.test(mcx), '7: MCX gates benchmark/chart_open subs behind !flag');
  ok(/market_context_chart/.test(mcx), '7: MCX records market_context_chart provenance');

  const pf = stripComments(extractFn(HTML, '_pfDrawChart'));
  ok(/ffBackendCandlesPortfolioCharts\(\)/.test(pf), '7: Portfolio consults its (delegating) flag');
  ok(/portfolio_chart/.test(pf), '7: Portfolio records portfolio_chart provenance');
}

// ── 8. Squeeze Fire chart is already backend-first (no browser subs) ──────────
section('8. Squeeze Fire chart loads candles from backend only (no Candle subs)');
{
  const tf = stripComments(extractFn(HTML, '_sfsEnsureTfCandles'));
  ok(/_sfsFetchBackendCandles\(/.test(tf), '8: SFS reads candles via _sfsFetchBackendCandles (backend GET)');
  ok(!/_ensureCandleSubscription|_ensure30MSubscription/.test(tf), '8: SFS never opens a browser Candle subscription');
  ok(/sfs_chart/.test(tf), '8: SFS records sfs_chart provenance');
}

// ── 9. provenance recorder behavior ───────────────────────────────────────────
section('9. _recordCandleProvenance counts backend vs browser sources');
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
  ['scanner_inline_chart', 'main_chart', 'directional_chart', 'rs_chart', 'sfs_chart', 'portfolio_chart', 'market_context_chart']
    .forEach((view) => sb._recordCandleProvenance('backend_cache', { symbol: 'X', view }));
  sb._recordCandleProvenance('browser_dxlink_fallback', { symbol: 'COIN', view: 'rs_chart' });
  ok(sb._candleProvenanceStats.backendCache === 7, '9: backendCache count increments across all surfaces');
  ok(sb._candleProvenanceStats.browserDxlinkFallback === 1, '9: browserDxlinkFallback count increments');
  ok(sb._candleProvenanceStats.lastSymbol === 'COIN', '9: last symbol tracked');
  const views = sb._candleProvenanceLog.map((r) => r.view);
  ['scanner_inline_chart', 'main_chart', 'directional_chart', 'rs_chart', 'sfs_chart', 'portfolio_chart', 'market_context_chart']
    .forEach((v) => ok(views.indexOf(v) >= 0, '9: provenance log captures view=' + v));
}

// ── 9b. precise backend provenance classification + counters ──────────────────
section('9b. backend_cache_full / _partial / 4h_missing classification + counters');
{
  const sb = {
    console: { log() {} },
    _candleProvenanceStats: { backendCache: 0, backendCacheFull: 0, backendCachePartial: 0, backend4hMissing: 0, browserDxlinkFallback: 0, lastSource: null, lastAt: null, lastSymbol: null },
    _candleProvenanceLog: [],
    _CANDLE_PROVENANCE_MAX: 80,
    _CANDLE_USABLE_MIN: 20,
    _candleDiagNowIso: () => '2026-01-01T00:00:00.000Z',
  };
  vm.createContext(sb);
  ['_classifyBackendCandleProvenance', '_recordCandleProvenance', '_recordBackendCandleProvenance', '_extractBackend4hDiag']
    .forEach((n) => vm.runInContext(extractFn(HTML, n), sb));

  // full: 1D + 4H both usable
  let s = sb._recordBackendCandleProvenance('directional_chart', 'PYPL', 205, 40, null);
  ok(s === 'backend_cache_full', '9b: 1D+4H usable → backend_cache_full');
  // partial: 1D usable, 4H == 0, no backend reason
  s = sb._recordBackendCandleProvenance('scanner_inline_chart', 'XYZ', 205, 0, null);
  ok(s === 'backend_cache_partial', '9b: 1D usable + 4H=0 (no reason) → backend_cache_partial');
  // 4h_missing: 1D usable, 4H == 0, backend reports NO_30M_SOURCE_CANDLES / DXLINK_BACKOFF_ACTIVE
  const diag = { source30mCount: 0, derivationReason: 'NO_30M_SOURCE_CANDLES', missingReason: 'DXLINK_BACKOFF_ACTIVE' };
  s = sb._recordBackendCandleProvenance('directional_chart', 'AMT', 205, 0, diag);
  ok(s === 'backend_4h_missing', '9b: 1D usable + 4H=0 with backend reason → backend_4h_missing');
  const amtRec = sb._candleProvenanceLog[sb._candleProvenanceLog.length - 1];
  ok(/DXLINK_BACKOFF_ACTIVE/.test(amtRec.detail) && /NO_30M_SOURCE_CANDLES/.test(amtRec.detail), '9b: 4h_missing detail carries missingReason/derivationReason');

  ok(sb._candleProvenanceStats.backendCacheFull === 1, '9b: backendCacheFull counter');
  ok(sb._candleProvenanceStats.backendCachePartial === 1, '9b: backendCachePartial counter');
  ok(sb._candleProvenanceStats.backend4hMissing === 1, '9b: backend4hMissing counter');
  ok(sb._candleProvenanceStats.backendCache === 3, '9b: total backendCache counts full+partial+4h_missing');

  // browser fallback only counts when the fallback path is actually invoked
  sb._recordCandleProvenance('browser_dxlink_fallback', { symbol: 'COIN', view: 'rs_chart' });
  ok(sb._candleProvenanceStats.browserDxlinkFallback === 1, '9b: browserDxlinkFallback counted only on actual fallback');
  ok(sb._candleProvenanceStats.backendCache === 3, '9b: browser fallback does NOT increment backendCache');

  // _extractBackend4hDiag: top-level and nested timeframes['4H'] shapes
  ok(sb._extractBackend4hDiag({ source30mCount: 0, derivationReason: 'NO_30M_SOURCE_CANDLES' }) != null, '9b: extracts top-level 4H diag');
  ok(sb._extractBackend4hDiag({ timeframes: { '4H': { missingReason: 'DXLINK_BACKOFF_ACTIVE' } } }).missingReason === 'DXLINK_BACKOFF_ACTIVE', '9b: extracts nested timeframes[4H] diag');
  ok(sb._extractBackend4hDiag({ candles: [] }) === null, '9b: returns null when no diag present');
}

// ── 9c. apexDebugCandleSubscriptions exposes the new provenance counters ───────
section('9c. apexDebugCandleSubscriptions exposes precise provenance counters');
{
  const stats = stripComments(HTML.slice(HTML.indexOf('var _candleProvenanceStats ='), HTML.indexOf('var _candleProvenanceStats =') + 900));
  ['backendCacheFull', 'backendCachePartial', 'backend4hMissing', 'browserDxlinkFallback',
   'browser4hFallbackStarted', 'browser4hFallbackBlocked', 'browser4hFallbackSymbolsRecent']
    .forEach((k) => ok(new RegExp(k).test(stats), '9c: provenance stats include ' + k));
  const dbg = stripComments(extractFn(HTML, 'apexDebugCandleSubscriptions'));
  ok(/provenance:\s*_candleProvenanceStats/.test(dbg), '9c: apexDebug exposes provenance stats object (incl. new counters)');
}

// ── 10. candle subscription cap-hit note + wiring ─────────────────────────────
section('10. _noteCandleSubscriptionLimitHit records cap hits; wired into dxlink poll');
{
  const sb = {
    _candleSubscriptionLimitHit: { hit: false, count: 0, firstAt: null, lastAt: null, lastError: null },
    _candleDiagNowIso: () => '2026-01-01T00:00:00.000Z',
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_noteCandleSubscriptionLimitHit'), sb);
  ok(sb._candleSubscriptionLimitHit.hit === false, '10: starts not-hit (acceptance baseline)');
  sb._noteCandleSubscriptionLimitHit("subscription size for event type 'Candle' is too big");
  ok(sb._candleSubscriptionLimitHit.hit === true && sb._candleSubscriptionLimitHit.count === 1, '10: first hit sets flag + count');
  const poll = stripComments(extractFn(HTML, 'pollDxlinkStatus'));
  ok(/_noteCandleSubscriptionLimitHit\(_feedErr\)/.test(poll), '10: pollDxlinkStatus notes the cap hit on Candle limit errors');
}

// ── 11. apexDebugCandleSubscriptions surfaces the new diagnostics ─────────────
section('11. apexDebugCandleSubscriptions exposes the global flag + provenance + cap-hit');
{
  const src = stripComments(extractFn(HTML, 'apexDebugCandleSubscriptions'));
  ok(/preferBackendForCharts/.test(src), '11: exposes preferBackendForCharts (renamed from preferBackendOnChartOpen)');
  ok(!/preferBackendOnChartOpen/.test(src), '11: old preferBackendOnChartOpen key removed');
  ok(/perSurfaceBackendCandles/.test(src), '11: exposes per-surface flag states');
  ok(/provenance:\s*_candleProvenanceStats/.test(src), '11: exposes provenance stats');
  ok(/candleSubscriptionLimitHit:\s*_candleSubscriptionLimitHit/.test(src), '11: exposes candleSubscriptionLimitHit');
  ok(/browser4hFallbackStarted:\s*_candleProvenanceStats\.browser4hFallbackStarted/.test(src), '11: exposes browser4hFallbackStarted');
  ok(/browser4hFallbackBlocked:\s*_candleProvenanceStats\.browser4hFallbackBlocked/.test(src), '11: exposes browser4hFallbackBlocked');
  ok(/browser4hFallbackSymbolsRecent:\s*_candleProvenanceStats\.browser4hFallbackSymbolsRecent/.test(src), '11: exposes browser4hFallbackSymbolsRecent');
}

// ── 12. partial backend 4H starts or explains scoped browser fallback ──────────
section('12. partial backend candles start strictly scoped 4H browser fallback');
{
  const scannerLoad = stripComments(extractFn(HTML, '_scannerLoadBackendCandlesForInlineChart'));
  ok(/backend_4h_missing/.test(scannerLoad) && /backend_cache_partial/.test(scannerLoad), '12: scanner inline treats missing/partial 4H as not full success');
  ok(/_startBrowser4hFallbackIfAllowed\(symbol,\s*'scanner_inline_chart'/.test(scannerLoad), '12: scanner inline asks for single active-symbol 4H fallback');
  ok(!/forEach\(|map\(/.test(scannerLoad), '12: scanner inline fallback path never iterates a universe');
  const rsLoad = stripComments(extractFn(HTML, '_rsLoadBackendCandlesForChart'));
  ok(/_startBrowser4hFallbackIfAllowed\(symbol,\s*'rs_chart'[\s\S]*needsSpy:!_spy4hUsable/.test(rsLoad), '12: RS chart fallback may include SPY only when 4H benchmark is missing');
  const helper = stripComments(extractFn(HTML, '_startBrowser4hFallbackIfAllowed'));
  ['browser_4h_fallback_started', 'browser_4h_fallback_blocked_cap', 'browser_4h_fallback_blocked_gate', 'browser_4h_fallback_waiting']
    .forEach((event) => ok(helper.includes(event), '12: helper records ' + event));
  ok(/_candleSubscriptionLimitHit[\s\S]*\.hit/.test(helper), '12: helper blocks when candleSubscriptionLimitHit.hit is true');
  ok(/_isBackendGateClosedReason\(gate\)/.test(helper), '12: helper blocks backend auth/key/backoff gate reasons');
  const sub30 = stripComments(extractFn(HTML, '_ensure30MSubscription'));
  ok(/subReason\s*===\s*'chart_4h_fallback'/.test(sub30), '12: 30M fallback reason suppresses automatic SPY add');
}


// ── 13. RS 4H benchmark uses backend SPY cache/GET without browser bursts ─────
section('13. RS 4H benchmark prefers backend SPY 4H and diagnoses misses');
{
  const scannerLoad = stripComments(extractFn(HTML, '_scannerLoadBackendCandlesForInlineChart'));
  ok(/_fetchBackendSpy4hBenchmark\('scanner_inline_chart'/.test(scannerLoad), '13: scanner inline fetches backend SPY 4H when symbol 4H exists');
  ok(/_scannerBackendCandleCache\.spy4h\s*=\s*\(spy4\s*&&\s*spy4\.ok\)\s*\?\s*spy4\.candles/.test(scannerLoad), '13: scanner inline stores SPY 4H in chart backend cache asynchronously');

  const dssRender = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/_fetchBackendSpy4hBenchmark\('directional_chart'/.test(dssRender), '13: DSS chart fetches backend SPY 4H benchmark');
  ok(/_scannerBackendCandleCache\.spy4h\s*=\s*\(_dssSpy4\s*&&\s*_dssSpy4\.ok\)\s*\?\s*_dssSpy4\.candles/.test(dssRender), '13: DSS chart stores SPY 4H in shared backend cache asynchronously');

  const dssRs = stripComments(extractFn(HTML, '_dss4hRelativeStrength'));
  ok(dssRs.indexOf('_rsResolveBackendSpy4hFromCache') >= 0 && dssRs.indexOf('_rsResolveBackendSpy4hFromCache') < dssRs.indexOf("getFourHourCandles('SPY')"), '13: DSS 4H RS checks backend SPY cache before browser buffer');
  ok(/SPY 4H benchmark unavailable/.test(dssRs), '13: DSS missing reason is SPY 4H benchmark unavailable');
  ok(/spyBackendGetAttempted/.test(dssRs) && /spyFromBackendCache/.test(dssRs), '13: DSS SCHART log includes backend cache/fetch diagnostics');

  const schartDraw = stripComments(extractFn(HTML, '_schartDrawTf'));
  ok(/_rsResolveBackendSpy4hFromCache\(symbol,\s*'scanner_inline_chart'/.test(schartDraw), '13: scanner inline RS panel reads backend SPY 4H cache');
  ok(/_pfDrawRsPanel\(rsId,\s*candles,\s*spyCandles/.test(schartDraw), '13: scanner main 4H chart still draws; only RS panel gets unavailable state');

  const rsDraw = stripComments(extractFn(HTML, '_rsDrawTf'));
  ok(/_rsResolveBackendSpy4hFromCache\(symbol,\s*'rs_chart'/.test(rsDraw), '13: RS-vs-SPY chart reads backend SPY 4H cache');
  ok(/rs_4h_benchmark_missing/.test(rsDraw), '13: RS-vs-SPY chart records benchmark-missing diagnostics');

  const fetchBench = stripComments(extractFn(HTML, '_fetchBackendSpy4hBenchmark'));
  ok(/postCandleContext\(\{\s*reason:'rs_4h_benchmark'/.test(fetchBench) && /needsBenchmark:true/.test(fetchBench), '13: SPY benchmark helper triggers backend context/prewarm with needsBenchmark');
  ok(/candles-dxlink\/SPY\?timeframe=4H/.test(fetchBench), '13: SPY benchmark helper attempts backend GET /dev/market/candles-dxlink/SPY?timeframe=4H');
  ok(/rs_4h_benchmark_backend_cache/.test(fetchBench), '13: helper records backend-cache hit with spyCandles > 0 path');
  ok(/rs_4h_benchmark_missing/.test(fetchBench), '13: helper records benchmark-missing diagnostics');
  ok(/rs_4h_benchmark_fetch_failed/.test(fetchBench), '13: helper records benchmark fetch failures');
  ok(!/_ensure(?:30M|Candle)Subscription/.test(fetchBench), '13: helper never opens browser Candle subscriptions');

  const fallback = stripComments(extractFn(HTML, '_rsLoadBackendCandlesForChart'));
  ok(/rs_4h_benchmark_fallback_started/.test(fallback) && /fallbackRequestedSpy30m:true/.test(fallback), '13: SPY 30M fallback is diagnosed only behind safe fallback gate');

  const debug = stripComments(extractFn(HTML, 'apexDebugCandleSubscriptions'));
  ok(/rsBenchmarkRecent:\s*_rsBenchmarkDiagLog\.slice/.test(debug), '13: apexDebugCandleSubscriptions exposes recent RS benchmark diagnostics');
}

console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
process.exit(fail ? 1 : 0);
