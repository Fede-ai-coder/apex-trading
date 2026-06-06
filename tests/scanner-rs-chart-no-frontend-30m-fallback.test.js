'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PR #218 FOLLOW-UP — Directional / Market Scanner chart + RS vs SPY chart must
// open NO frontend DXLink CANDLE-STREAM 30M subscription from chart navigation.
//
// Root cause that PR #218 left unfixed: the reason=scanner_chart storm did NOT come
// from the inline "▲ CHART" panel (PR #218 migrated that). It came from the DSS
// DETAIL view (_dssRenderLargeCharts), whose legacy fallback opened
// _ensure30MSubscription(symbol,'scanner_chart') whenever the FF
// (ffBackendCandlesScannerCharts) was OFF — and that flag defaults OFF, including on
// deploy-preview. Rapid ArrowUp/ArrowDown detail navigation multiplied the calls into
// the observed [CANDLE-STREAM] subscribing 30M … reason=scanner_chart storm.
//
// This suite proves the storm is unreachable from EVERY scanner/RS chart surface:
//   1. renderScannerInlineChart  — Market Scanner inline "▲ CHART"
//   2. _dssRenderLargeCharts      — Directional Setup Scanner DETAIL (the storm source)
//   3. renderRsCharts             — RS vs SPY
// plus the chart-open entry points (openScannerChart / openRsChart /
// openDirectionalSetupDetail) and the Squeeze Fire detail loader.
//
// All proofs read the REAL functions out of index.html (drift-proof) and/or drive
// the real pure helpers in a vm sandbox. Runtime coverage of _ensureBackendChartCandles
// itself (read-first / single-symbol warmup / cache TTL / dedup) lives in
// tests/scanner-chart-backend-candles-migration.test.js — this suite proves the
// orchestrators are wired to it and never to a frontend stream.
//
// Run: node tests/scanner-rs-chart-no-frontend-30m-fallback.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Brace-matched function extraction (async + sync; skips strings/comments) ──
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

// ── Harness ───────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else      { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// Forbidden frontend-stream openers. NOTE the trailing '(' — these match the START
// pollers / subscription openers, never the *Stop* variants (which are fine to call).
const FRONTEND_SUB_OPENERS = [
  '_ensureCandleSubscription\\(',
  '_ensure30MSubscription\\(',
  '\\bsubscribeCandles\\(',
];
const FRONTEND_POLLERS = [
  '_schart4hStartPoll\\(',
  '_rs4hStartPoll\\(',
  '_dss4hStartPoll\\(',
  '_dss4hStartSpyPoll\\(',
];

// Assert a navigation function opens NO frontend Candle subscription and starts NO
// frontend 4H poll. (The backend read-first loaders are checked separately.)
function assertNoFrontendStream(fnName, label) {
  const src = stripComments(extractFn(HTML, fnName));
  FRONTEND_SUB_OPENERS.forEach((p) => {
    ok(!new RegExp(p).test(src), label + ': does NOT call ' + p.replace('\\(', '').replace('\\b', ''));
  });
  FRONTEND_POLLERS.forEach((p) => {
    ok(!new RegExp(p).test(src), label + ': does NOT start ' + p.replace('\\(', ''));
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 1+2. Directional / Market Scanner chart — frontend 30M fallback fully disabled
// ═════════════════════════════════════════════════════════════════════════════
section('1. Market Scanner inline chart (renderScannerInlineChart) — backend-only, no _schart4hStartPoll');
{
  const src = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  // (task test 1) missing backend 4H does NOT call _schart4hStartPoll
  ok(!/_schart4hStartPoll\(/.test(src),
    '1: renderScannerInlineChart does NOT call _schart4hStartPoll (no frontend 4H poll)');
  // (task test 2) does NOT open a frontend 30M / Candle subscription
  ok(!/_ensure30MSubscription\(/.test(src),
    '1: renderScannerInlineChart does NOT call _ensure30MSubscription');
  ok(!/_ensureCandleSubscription\(/.test(src),
    '1: renderScannerInlineChart does NOT call _ensureCandleSubscription');
  // Backend read-first loader is wired in.
  ok(/_ensureBackendChartCandles\(symbol/.test(src),
    '1: renderScannerInlineChart loads candles via _ensureBackendChartCandles (read-first)');
  // (task test 7) 4H-missing branch surfaces the precise backend reason.
  ok(/_backendChartUiMsg\(/.test(src),
    '1: renderScannerInlineChart surfaces _backendChartUiMsg on backend failure');
}

section('2. Directional Setup Scanner DETAIL chart (_dssRenderLargeCharts) — the original storm source');
{
  const src = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  // (task test 2 + 5) the reason=scanner_chart subscription storm is fully removed.
  ok(!/_ensure30MSubscription\(/.test(src),
    '2: _dssRenderLargeCharts does NOT call _ensure30MSubscription (storm removed)');
  ok(!/_ensureCandleSubscription\(/.test(src),
    '2: _dssRenderLargeCharts does NOT call _ensureCandleSubscription (storm removed)');
  // (task test 1, analog for the detail view) no frontend 4H / SPY poll.
  ok(!/_dss4hStartPoll\(/.test(src),
    '2: _dssRenderLargeCharts does NOT start the frontend 4H poll _dss4hStartPoll');
  ok(!/_dss4hStartSpyPoll\(/.test(src),
    '2: _dssRenderLargeCharts does NOT start the frontend SPY poll _dss4hStartSpyPoll');
  // Backend-only candle sources: Backend Preview (FF on) + shared loader (FF off).
  ok(/_scannerFetchBackendCandlesForChart\(/.test(src),
    '2: FF-on path preserves Backend Preview (_scannerFetchBackendCandlesForChart)');
  ok(/_ensureBackendChartCandles\(symbol/.test(src),
    '2: FF-off path uses the shared backend loader (_ensureBackendChartCandles)');
  // (task test 7) FF-off 4H-missing surfaces the precise backend reason.
  ok(/_backendChartUiMsg\(/.test(src),
    '2: _dssRenderLargeCharts surfaces _backendChartUiMsg when backend 4H is missing (FF off)');
  // Buffer fallback (scan/snapshot data) is still available — never a stream.
  ok(/getDailyCandles\(symbol\)/.test(src) && /getFourHourCandles\(symbol\)/.test(src),
    '2: in-memory buffer fallback (getDailyCandles / getFourHourCandles) preserved');
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. RS vs SPY chart — frontend 30M fallback fully disabled
// ═════════════════════════════════════════════════════════════════════════════
section('3. RS vs SPY chart (renderRsCharts) — backend-only, no _rs4hStartPoll');
{
  const src = stripComments(extractFn(HTML, 'renderRsCharts'));
  // (task test 3) missing backend 4H does NOT call _rs4hStartPoll
  ok(!/_rs4hStartPoll\(/.test(src),
    '3: renderRsCharts does NOT call _rs4hStartPoll (no frontend 4H poll)');
  // (task test 4) does NOT open a frontend 30M / Candle subscription
  ok(!/_ensure30MSubscription\(/.test(src),
    '3: renderRsCharts does NOT call _ensure30MSubscription');
  ok(!/_ensureCandleSubscription\(/.test(src),
    '3: renderRsCharts does NOT call _ensureCandleSubscription');
  // Backend read-first loader is wired in for symbol + SPY.
  ok(/_ensureBackendChartCandles\(symbol/.test(src) && /_ensureBackendChartCandles\('SPY'/.test(src),
    '3: renderRsCharts loads symbol + SPY via _ensureBackendChartCandles (read-first)');
  ok(/_backendChartUiMsg\(/.test(src),
    '3: renderRsCharts surfaces _backendChartUiMsg on backend failure');
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Chart-open entry points open NO subscriptions
// ═════════════════════════════════════════════════════════════════════════════
section('4. Chart-open entry points are frontend-stream-free');
{
  assertNoFrontendStream('openScannerChart',         '4: openScannerChart');
  assertNoFrontendStream('openRsChart',              '4: openRsChart');
  assertNoFrontendStream('openDirectionalSetupDetail','4: openDirectionalSetupDetail');
  // The entry points still hand off to the (backend-only) render orchestrators.
  ok(/renderScannerInlineChart\(symbol\)/.test(stripComments(extractFn(HTML, 'openScannerChart'))),
    '4: openScannerChart still renders via renderScannerInlineChart');
  ok(/renderRsCharts\(symbol\)/.test(stripComments(extractFn(HTML, 'openRsChart'))),
    '4: openRsChart still renders via renderRsCharts');
  ok(/_dssRenderLargeCharts\(symbol\)/.test(stripComments(extractFn(HTML, 'openDirectionalSetupDetail'))),
    '4: openDirectionalSetupDetail still renders via _dssRenderLargeCharts');
}

// ═════════════════════════════════════════════════════════════════════════════
// SPY benchmark backend loading — fixes the "spyCandles:0 → RS unavailable" root cause
// ═════════════════════════════════════════════════════════════════════════════
section('S1. Scanner charts fetch SPY 1D + SPY 4H from the backend candle cache');
{
  const inline = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  ok(/_ensureBackendChartCandles\(\s*'SPY'\s*,\s*'1D'/.test(inline),
    'S1: renderScannerInlineChart fetches SPY 1D from backend');
  ok(/_ensureBackendChartCandles\(\s*'SPY'\s*,\s*'4H'/.test(inline),
    'S1: renderScannerInlineChart fetches SPY 4H from backend');
  // Selected symbol 1D + 4H are still fetched (unchanged) — spec E1.
  ok(/_ensureBackendChartCandles\(symbol,\s*'1D'/.test(inline) && /_ensureBackendChartCandles\(symbol,\s*'4H'/.test(inline),
    'S1: renderScannerInlineChart still fetches selected symbol 1D + 4H');

  const dss = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/_ensureBackendChartCandles\(\s*'SPY'\s*,\s*'1D'/.test(dss),
    'S1: _dssRenderLargeCharts fetches SPY 1D from backend');
  ok(/_ensureBackendChartCandles\(\s*'SPY'\s*,\s*'4H'/.test(dss),
    'S1: _dssRenderLargeCharts fetches SPY 4H from backend');
  // SPY reason is 'benchmark' (a backend read reason) — never a subscription.
  ok(/_ensureBackendChartCandles\(\s*'SPY'[^)]*'benchmark'\s*\)/.test(inline) &&
     /_ensureBackendChartCandles\(\s*'SPY'[^)]*'benchmark'\s*\)/.test(dss),
    'S1: SPY is loaded with the backend-read reason "benchmark"');
}

section('S2. Backend-fetched SPY candles are passed into the RS panel / RS legend (spec E3)');
{
  // _schartDrawTf accepts a spyCandlesOv param and prefers it over the in-memory getter.
  const drawTf = stripComments(extractFn(HTML, '_schartDrawTf'));
  ok(/function _schartDrawTf\([^)]*spyCandlesOv\s*\)/.test(drawTf),
    'S2: _schartDrawTf accepts an optional spyCandlesOv parameter');
  ok(/spyCandles\s*=\s*spyCandlesOv\s*\|\|/.test(drawTf),
    'S2: _schartDrawTf uses spyCandlesOv before falling back to getDailyCandles/getFourHourCandles(SPY)');
  // renderScannerInlineChart threads backend SPY candles into BOTH _schartDrawTf calls.
  const inline = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  ok(/_schartDrawTf\('1D'[^;]*_scSpy1d\s*\)/.test(inline),
    'S2: renderScannerInlineChart passes backend SPY 1D into the 1D RS panel');
  ok(/_schartDrawTf\('4H'[^;]*_scSpy4h\s*\)/.test(inline),
    'S2: renderScannerInlineChart passes backend SPY 4H into the 4H RS panel');
  // _dss4hRelativeStrength accepts a SPY override and uses it for the 4H RS legend.
  const rsHelper = stripComments(extractFn(HTML, '_dss4hRelativeStrength'));
  ok(/function _dss4hRelativeStrength\([^)]*spy4Ov\s*\)/.test(rsHelper),
    'S2: _dss4hRelativeStrength accepts an optional spy4Ov parameter');
  ok(/spy4\s*=\s*spy4Ov\s*\|\|/.test(rsHelper),
    'S2: _dss4hRelativeStrength uses spy4Ov before falling back to getFourHourCandles(SPY)');
  const dss = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/_dss4hRelativeStrength\(symbol,\s*four,\s*_dssSpy4h\)/.test(dss),
    'S2: _dssRenderLargeCharts passes backend SPY 4H into _dss4hRelativeStrength');
}

section('S3. Missing SPY 4H → precise RS-unavailable message, NEVER a frontend 30M stream (spec E4)');
{
  const rsPanel = stripComments(extractFn(HTML, '_pfDrawRsPanel'));
  ok(/SPY data unavailable/.test(rsPanel),
    'S3: _pfDrawRsPanel shows "SPY data unavailable" when SPY candles are missing');
  assertNoFrontendStream('_pfDrawRsPanel', 'S3: _pfDrawRsPanel');
  const rsHelper = stripComments(extractFn(HTML, '_dss4hRelativeStrength'));
  ok(/insufficient SPY 4H candles/.test(rsHelper),
    'S3: _dss4hRelativeStrength logs a precise "insufficient SPY 4H candles" reason');
  assertNoFrontendStream('_dss4hRelativeStrength', 'S3: _dss4hRelativeStrength');
  assertNoFrontendStream('_schartDrawTf', 'S3: _schartDrawTf');

  // Runtime: _pfDrawRsPanel with a null SPY series renders the message and opens nothing.
  const el = { innerHTML: '' };
  const sb = { document: { getElementById: () => el }, console, Math, Array };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_pfDrawRsPanel'), sb);
  const candles = Array.from({ length: 30 }, (_, i) => ({ close: 100 + i }));
  sb._pfDrawRsPanel('rs-big-wrap-4h', candles, null, 30);
  ok(/SPY data unavailable/.test(el.innerHTML),
    'S3: _pfDrawRsPanel(null SPY) renders the precise unavailable message (no throw, no stream)');
}

section('S4. SPY is a TTL-cached GLOBAL dependency — repeat render is a cache hit, fetched once');
(async () => {
  const ENSURE_FNS = [
    '_apexParityNormTime', '_apexParityNormCandle',
    '_apexParityNormCandleArray', '_apexParityExtractBackendCandles',
    '_sfsExtractBackendCandles', '_sfsFetchBackendCandles', '_ensureBackendChartCandles',
  ];
  function bars(n, base) {
    const out = []; const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) { const c = base + i * 0.5;
      out.push({ time: new Date(ms0 + i * 86400000).toISOString(), open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000 }); }
    return out;
  }
  let spyFetches = 0;
  const sb = {
    console, Date, Math, JSON, Number, Boolean, Object, Array, Promise,
    isFinite, parseFloat, parseInt, encodeURIComponent, String,
    setTimeout: (fn) => { fn(); return 0; },   // bounded-poll backoff runs instantly in tests
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test',
    _backendAuthHeaders: (e) => Object.assign({}, e || {}), _recordCandleSubscriptionRequest: () => {},
    _backendChartCandleInflight: {}, _backendChartCandleCache: {}, BACKEND_CHART_CACHE_TTL_MS: 45000, BACKEND_CHART_POST_WARM_ATTEMPTS: 3, BACKEND_CHART_POST_WARM_DELAY_MS: 1, BACKEND_CHART_WARMUP_WAIT_MS: 2000,
    _backendChartDiag: { candleCounts: {}, cacheHitCount: 0, backendFetchCount: 0, lastFetchByKey: {},
      backendReadAttempted: false, backendWarmupAttempted: false, lastError: null },
    fetch: function (url) { if (/SPY/.test(url)) spyFetches++; return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: bars(25, 500) }) }); },
  };
  vm.createContext(sb);
  vm.runInContext(ENSURE_FNS.map((n) => extractFn(HTML, n)).join('\n'), sb);
  const a = await sb._ensureBackendChartCandles('SPY', '4H', 'benchmark');
  const fetchesAfterFirst = spyFetches;
  const b = await sb._ensureBackendChartCandles('SPY', '4H', 'benchmark');   // simulates the next symbol's render
  ok(a.ok && b.ok, 'S4: SPY 4H resolves ok on both renders');
  ok(spyFetches === fetchesAfterFirst,
    'S4: SPY 4H fetched ONCE across renders (global TTL-cached benchmark, not per-symbol)');
  ok(sb._backendChartDiag.cacheHitCount >= 1, 'S4: SPY repeat render is a cache hit');
})();

section('S5. apexDebugScannerChartBackendCandles exposes SPY + cache + fallback diagnostics (spec D)');
{
  const i = HTML.indexOf('window.apexDebugScannerChartBackendCandles');
  const body = HTML.slice(i, i + 2500);
  ok(/spyRequested/.test(body),                'S5: diagnostic includes spyRequested (SPY 1D/4H requested)');
  ok(/spyCandleCounts/.test(body),             'S5: diagnostic includes spyCandleCounts by timeframe');
  ok(/selectedSymbolCandleCounts/.test(body),  'S5: diagnostic includes selectedSymbolCandleCounts by timeframe');
  ok(/cacheKeys/.test(body),                   'S5: diagnostic includes cache hit/miss by key (cacheKeys)');
  ok(/backendFetchCount/.test(body),           'S5: diagnostic includes backendFetchCount');
  ok(/frontendStreamFallbackCount/.test(body), 'S5: diagnostic includes frontendStreamFallbackCount (must stay 0)');
  ['activeSymbol','active4hWarmupInFlight','lastActiveWarmupSymbol','lastActiveWarmupStartedAt',
   'lastActiveWarmupFinishedAt','lastActiveWarmupResultCount','staleWarmupResponsesIgnored',
   'last4hAutoRenderAt','activeChartBackendPollAttempts'].forEach(function(k){
    ok(new RegExp(k).test(body), 'S5: diagnostic includes ' + k);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Active-symbol on-demand 4H warmup — bounded poll, auto-render, stale-guard, 1D stays
// ═════════════════════════════════════════════════════════════════════════════
section('W1. _ensureBackendChartCandles warms single-symbol then BOUNDED-polls (no single early re-read)');
{
  const src = stripComments(extractFn(HTML, '_ensureBackendChartCandles'));
  ok(/BACKEND_CHART_POST_WARM_ATTEMPTS/.test(src),
    'W1: post-warmup re-read is a bounded loop (BACKEND_CHART_POST_WARM_ATTEMPTS)');
  ok(/for\s*\(var _attempt/.test(src), 'W1: bounded re-read loop present');
  ok(/activeChartBackendPollAttempts\+\+/.test(src), 'W1: counts each backend poll attempt');
  ok(/symbols:\s*\[symbol\]/.test(src), 'W1: warmup is single-symbol only ([symbol])');
  ok(/waitMs:\s*BACKEND_CHART_WARMUP_WAIT_MS/.test(src), 'W1: warmup uses the (short) waitMs constant');
  ok((src.match(/\/warmup/g) || []).length === 1, 'W1: exactly one /warmup per request (no re-warm loop)');
}

section('W2. RUNTIME: warmup then a LAGGED 4H (empty re-read, then candles) auto-resolves ok');
(async () => {
  const ENSURE_FNS = ['_apexParityNormTime','_apexParityNormCandle','_apexParityNormCandleArray',
    '_apexParityExtractBackendCandles','_sfsExtractBackendCandles','_sfsFetchBackendCandles','_ensureBackendChartCandles'];
  function bars(n, base){ const out=[]; const ms0=Date.UTC(2024,0,2);
    for(let i=0;i<n;i++){const c=base+i*0.5; out.push({time:new Date(ms0+i*86400000).toISOString(),open:c-0.1,high:c+0.5,low:c-0.5,close:c,volume:1000});} return out; }
  const read4h = [ {c:[]}, {c:[]}, {c:bars(63,400)} ];  // cold, lagged-empty, then 63 bars on 2nd poll
  let ri = 0, warmups = 0;
  const sb = {
    console, Date, Math, JSON, Number, Boolean, Object, Array, Promise, isFinite, parseFloat, parseInt, encodeURIComponent, String,
    setTimeout: (fn) => { fn(); return 0; }, AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test',
    _backendAuthHeaders: (e)=>Object.assign({},e||{}), _recordCandleSubscriptionRequest: ()=>{},
    _backendChartCandleInflight: {}, _backendChartCandleCache: {}, BACKEND_CHART_CACHE_TTL_MS: 45000,
    BACKEND_CHART_POST_WARM_ATTEMPTS: 3, BACKEND_CHART_POST_WARM_DELAY_MS: 1, BACKEND_CHART_WARMUP_WAIT_MS: 2000,
    _backendChartDiag: { candleCounts: {}, cacheHitCount: 0, backendFetchCount: 0, lastFetchByKey: {},
      backendReadAttempted: false, backendWarmupAttempted: false, lastError: null, activeChartBackendPollAttempts: 0 },
    fetch: function(url){
      if (/\/warmup/.test(url)) { warmups++; return Promise.resolve({ ok:true, status:200, json:()=>Promise.resolve({}) }); }
      const body = read4h[Math.min(ri++, read4h.length-1)];
      return Promise.resolve({ ok:true, status:200, json:()=>Promise.resolve({ candles: body.c }) });
    },
  };
  vm.createContext(sb);
  vm.runInContext(ENSURE_FNS.map((n)=>extractFn(HTML,n)).join('\n'), sb);
  const r = await sb._ensureBackendChartCandles('AMZN', '4H', 'scanner_chart');
  ok(r.ok === true, 'W2: lagged 4H eventually resolves ok (bounded poll caught the derived candles)');
  ok(r.candles && r.candles.length === 63, 'W2: returns the 63 warmed 4H candles (auto-renderable)');
  ok(warmups === 1, 'W2: exactly one single-symbol warmup (no re-warm loop)');
  ok(sb._backendChartDiag.activeChartBackendPollAttempts >= 2, 'W2: bounded poll did multiple re-reads');
})();

section('W3. After the 4H result, each surface AUTO-RENDERS the 4H panel + stamps last4hAutoRenderAt');
{
  ['renderScannerInlineChart','renderRsCharts','_dssRenderLargeCharts'].forEach(function(fn){
    const src = stripComments(extractFn(HTML, fn));
    ok(/last4hAutoRenderAt\s*=\s*Date\.now\(\)/.test(src), 'W3: ' + fn + ' stamps last4hAutoRenderAt on 4H draw');
    ok(/active4hWarmupInFlight\s*=\s*true/.test(src) && /active4hWarmupInFlight\s*=\s*false/.test(src),
      'W3: ' + fn + ' toggles active4hWarmupInFlight around the warmup');
  });
}

section('W4. Symbol switch / newer render during warmup → stale result ignored (renderNonce token)');
{
  ['renderScannerInlineChart','renderRsCharts','_dssRenderLargeCharts'].forEach(function(fn){
    const src = stripComments(extractFn(HTML, fn));
    ok(/_backendChartRenderNonce/.test(src), 'W4: ' + fn + ' captures/checks the render nonce token');
    ok(/staleWarmupResponsesIgnored\+\+/.test(src), 'W4: ' + fn + ' counts ignored stale warmup responses');
    // The stale check must appear AFTER the 4H await (so a late response cannot paint).
    const awaitIdx = src.indexOf('await');
    const staleIdx = src.indexOf('staleWarmupResponsesIgnored++');
    ok(staleIdx > awaitIdx, 'W4: ' + fn + ' stale-guard sits after an await');
  });
}

section('W5. 1D chart stays rendered while 4H warms (1D draw precedes the 4H warmup await)');
{
  // scanner inline: 1D _schartDrawTf('1D'…) before the active-warmup diagnostics/await.
  const sc = stripComments(extractFn(HTML, 'renderScannerInlineChart'));
  ok(sc.indexOf("_schartDrawTf('1D'") >= 0 && sc.indexOf("_schartDrawTf('1D'") < sc.indexOf('active4hWarmupInFlight = true'),
    'W5: scanner inline draws 1D before starting the 4H warmup');
  // DSS detail: 1D _drawCandleChart('dss-big-wrap-1d'…) before the 4H warmup block.
  const dss = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(dss.indexOf("_drawCandleChart('dss-big-wrap-1d'") >= 0 &&
     dss.indexOf("_drawCandleChart('dss-big-wrap-1d'") < dss.indexOf('active4hWarmupInFlight = true'),
    'W5: DSS detail draws 1D before starting the 4H warmup');
  // The 4H warming placeholder only writes the 4H wrap, never the 1D wrap.
  ok(/Warming 4H from backend/.test(sc) && /Warming 4H from backend/.test(dss),
    'W5: both show "Warming 4H from backend…" (4H panel only)');
  const rs = stripComments(extractFn(HTML, 'renderRsCharts'));
  ok(/Warming 4H from backend/.test(rs), 'W5: RS chart shows "Warming 4H from backend…"');
}

section('W6. RUNTIME: precise NON-LOOPING pending message for cache-not-ready 4H');
{
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_backendChartUiMsg') + '\n' + extractFn(HTML, '_backendChartPendingMsg'), sb);
  const msg = sb._backendChartPendingMsg('BACKEND_CACHE_NOT_READY:0', '4H');
  ok(/not ready yet/i.test(msg) && /try again in a moment/i.test(msg),
    'W6: cache-not-ready 4H → "4H backend cache not ready yet. Try again in a moment."');
  // _backendChartUiMsg itself stays retry-copy-free (migration contract).
  ok(!/try again/i.test(sb._backendChartUiMsg('BACKEND_CACHE_NOT_READY:0', '4H')),
    'W6: _backendChartUiMsg stays free of "try again" copy');
  // Other states defer to the precise per-error copy (no spurious retry text).
  ok(/Endpoint unavailable/.test(sb._backendChartPendingMsg('ENDPOINT_UNAVAILABLE', '4H')),
    'W6: non-cache errors keep their precise message');
}

// ═════════════════════════════════════════════════════════════════════════════
// 5+6. No CANDLE-STREAM reason=scanner_chart / reason=rs_chart reachable anywhere
// ═════════════════════════════════════════════════════════════════════════════
// The ONLY function that logs "[CANDLE-STREAM] subscribing 30M … reason=<r>" is
// _ensure30MSubscription (and _ensureCandleSubscription for 1H/4H/1D). Prove that
// nowhere in the ENTIRE file is either subscription opener called with the
// scanner_chart / rs_chart reason — i.e. those reasons can never reach the stream.
section('5. reason=scanner_chart is never passed to a CANDLE-STREAM subscription opener (whole file)');
{
  const lines = stripComments(HTML).split('\n');
  const offenders = lines.filter((l) =>
    /_ensure(?:Candle|30M)Subscription\s*\(/.test(l) && /['"]scanner_chart['"]/.test(l));
  ok(offenders.length === 0,
    '5: no _ensure*Subscription(..., "scanner_chart") call anywhere (' + offenders.length + ' found)');
}
section('6. reason=rs_chart is never passed to a CANDLE-STREAM subscription opener (whole file)');
{
  const lines = stripComments(HTML).split('\n');
  const offenders = lines.filter((l) =>
    /_ensure(?:Candle|30M)Subscription\s*\(/.test(l) && /['"]rs_chart['"]/.test(l));
  ok(offenders.length === 0,
    '6: no _ensure*Subscription(..., "rs_chart") call anywhere (' + offenders.length + ' found)');
  // scanner_chart / rs_chart strings may still appear — but only as backend read
  // reasons (_ensureBackendChartCandles), never as subscription reasons.
  const subReasonLines = stripComments(HTML).split('\n').filter((l) =>
    /_ensure(?:Candle|30M)Subscription\s*\(/.test(l) && /(scanner_chart|rs_chart)/.test(l));
  ok(subReasonLines.length === 0,
    '6: scanner_chart/rs_chart never used as a subscription reason (backend read reasons only)');
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. Missing backend 4H → precise "backend cache not ready" UI (runtime, real fn)
// ═════════════════════════════════════════════════════════════════════════════
section('7. _backendChartUiMsg maps backend states to precise, non-misleading copy');
{
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_backendChartUiMsg'), sb);
  const m = sb._backendChartUiMsg;
  ok(/Backend cache not ready/.test(m('BACKEND_CACHE_NOT_READY:0', '4H')),
    '7: BACKEND_CACHE_NOT_READY → "Backend cache not ready for 4H."');
  ok(/Endpoint unavailable/.test(m('ENDPOINT_UNAVAILABLE', '4H')),
    '7: ENDPOINT_UNAVAILABLE → "Endpoint unavailable for 4H candles."');
  ok(/[Ss]ubscription/.test(m('subscription cap', '4H')),
    '7: subscription backoff → subscription cap/backoff copy');
  ok(/[Ii]nsufficient/.test(m('insufficient', '4H')),
    '7: insufficient → "Insufficient candles for 4H chart."');
  // Never the old misleading "run scan" / "try again" / "connect to Tastytrade" stream copy.
  ['BACKEND_CACHE_NOT_READY:0', 'ENDPOINT_UNAVAILABLE', 'insufficient', null].forEach((e) => {
    const msg = m(e, '4H');
    ok(!/run scan|try again|enable DXLink/i.test(msg),
      '7: message for ' + e + ' is not misleading stream/run-scan copy');
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. Repeated render uses the cache TTL → no backend fetch loop (runtime)
// ═════════════════════════════════════════════════════════════════════════════
section('8. Two renders within TTL → exactly one backend fetch (cache TTL respected)');
(async () => {
  const ENSURE_FNS = [
    '_apexParityNormTime', '_apexParityNormCandle',
    '_apexParityNormCandleArray', '_apexParityExtractBackendCandles',
    '_sfsExtractBackendCandles', '_sfsFetchBackendCandles', '_ensureBackendChartCandles',
  ];
  function bars(n, base) {
    const out = []; const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: new Date(ms0 + i * 86400000).toISOString(),
                 open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000 });
    }
    return out;
  }
  let fetchCount = 0;
  const sb = {
    console, Date, Math, JSON, Number, Boolean, Object, Array, Promise,
    isFinite, parseFloat, parseInt, encodeURIComponent, String,
    setTimeout: (fn) => { fn(); return 0; },   // bounded-poll backoff runs instantly in tests
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    _backendAuthHeaders: (extra) => Object.assign({}, extra || {}),
    _recordCandleSubscriptionRequest: () => {},
    _backendChartCandleInflight: {},
    _backendChartCandleCache: {},
    BACKEND_CHART_CACHE_TTL_MS: 45000, BACKEND_CHART_POST_WARM_ATTEMPTS: 3, BACKEND_CHART_POST_WARM_DELAY_MS: 1, BACKEND_CHART_WARMUP_WAIT_MS: 2000,
    _backendChartDiag: { candleCounts: {}, cacheHitCount: 0, backendFetchCount: 0,
      lastFetchByKey: {}, backendReadAttempted: false, backendWarmupAttempted: false, lastError: null },
    fetch: function () {
      fetchCount++;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: bars(25, 400) }) });
    },
  };
  vm.createContext(sb);
  vm.runInContext(ENSURE_FNS.map((n) => extractFn(HTML, n)).join('\n'), sb);

  const r1 = await sb._ensureBackendChartCandles('CSCO', '4H', 'scanner_chart');
  const afterFirst = fetchCount;
  const r2 = await sb._ensureBackendChartCandles('CSCO', '4H', 'scanner_chart');   // within TTL
  ok(r1.ok && r2.ok, '8: both renders return ok=true');
  ok(fetchCount === afterFirst, '8: second render is a cache hit — NO new backend fetch (no fetch loop)');
  ok(sb._backendChartDiag.cacheHitCount >= 1, '8: cacheHitCount incremented on the repeat render');
  // The TTL constant + 45s window must exist (render guard from the last update).
  ok(/BACKEND_CHART_CACHE_TTL_MS\s*=\s*\d+/.test(HTML), '8: BACKEND_CHART_CACHE_TTL_MS render-guard constant present');
})();

// ═════════════════════════════════════════════════════════════════════════════
// 9+10. Squeeze Fire detail loader — preserved backend-first, NO frontend 30M fallback
// ═════════════════════════════════════════════════════════════════════════════
section('9. Squeeze Fire detail 4H loader preserved (backend read + bounded warmup)');
{
  const src = stripComments(extractFn(HTML, '_sfsEnsureDetail4hCandles'));
  ok(/_sfsFetchBackendCandles\(/.test(src),
    '9: _sfsEnsureDetail4hCandles still reads via _sfsFetchBackendCandles (backend GET)');
  ok(/_sfsWarmupBatch\(/.test(src),
    '9: _sfsEnsureDetail4hCandles still warms via _sfsWarmupBatch (backend POST, single-symbol)');
  ok(!/yahoo/i.test(src), '9: no Yahoo in the SFS detail loader');
  ok(!/\/scanner\/run/i.test(src), '9: no /scanner/run in the SFS detail loader');
}
section('10. Squeeze Fire detail surfaces NO uncontrolled frontend 30M fallback (audit: none exists)');
{
  // The audit found the SFS loader has no frontend 30M fallback — assert it stays that way
  // across both the loader and the open path.
  assertNoFrontendStream('_sfsEnsureDetail4hCandles', '10: _sfsEnsureDetail4hCandles');
  assertNoFrontendStream('_sfsOpenChart',             '10: _sfsOpenChart');
}

// ═════════════════════════════════════════════════════════════════════════════
// 11-14. Cross-cutting constraints across every chart-navigation function
// ═════════════════════════════════════════════════════════════════════════════
section('11-14. No /scanner/run · no Yahoo · no REST candle fallback · no new WebSocket (chart nav)');
{
  const NAV_FNS = ['renderScannerInlineChart', '_dssRenderLargeCharts', 'renderRsCharts',
                   'openScannerChart', 'openRsChart', 'openDirectionalSetupDetail'];
  NAV_FNS.forEach((n) => {
    const src = stripComments(extractFn(HTML, n));
    ok(!/\/scanner\/run/i.test(src), '11: ' + n + ' never calls /scanner/run');
    ok(!/yahoo/i.test(src),          '12: ' + n + ' introduces no Yahoo source');
    // REST candle fallback = /market/candles WITHOUT the -dxlink suffix.
    ok(!/\/market\/candles(?!-dxlink)/.test(src), '13: ' + n + ' uses no REST /market/candles fallback');
    ok(!/new\s+WebSocket/.test(src),  '14: ' + n + ' opens no new WebSocket');
  });
}

// ── done ─────────────────────────────────────────────────────────────────────
setImmediate(function () {
  console.log('\n' + (fail === 0 ? 'All ' + pass + ' tests passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  if (fail > 0) process.exit(1);
});
