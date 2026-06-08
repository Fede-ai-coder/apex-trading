'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Inline-chart 1D / 4H last-price parity — Scanner "▲ CHART", RS vs SPY, Squeeze
// Fire. Extends the PR #207 Directional-Scanner fix to the other inline-chart
// panels.
//
// Background: opening a symbol detail renders a 1D and a 4H chart. Both charts
// (and the late-arriving 4H poll) MUST end on the SAME latest available APEX
// price resolved once for that render/open cycle — the value shown on the
// scanner row / info bar. PR #207 fixed `_dssRenderLargeCharts`. Three more
// panels had the identical bug and are fixed here:
//   • Scanner inline chart  — renderScannerInlineChart / _schartDrawTf / _schart4hStartPoll
//   • RS vs SPY             — renderRsCharts / _rsDrawTf / _rs4hStartPoll
//   • Squeeze Fire          — _sfsDrawCharts / _sfsDrawOneTf
//
// Each path was vulnerable in (some of) these ways before the fix:
//   1. computeCandleIndicators() ran on the UNPATCHED candles, then the patch was
//      applied — so SMA/RSI/RS/squeeze labels derived from a stale close.
//   2. each timeframe independently re-resolved its own price (via _patchLivePrice),
//      so 1D and 4H could disagree.
//   3. the late 4H poll re-resolved a fresh price that could drift from the 1D one.
//
// The fix mirrors PR #207 exactly: resolve ONCE via resolveLatestDisplayPrice,
// patch every timeframe's final candle with patchLastCandleWithLivePrice BEFORE
// computing indicators, and hand the render-scoped price into the late poll.
//
// All proofs read the REAL functions out of index.html (no copies, so they cannot
// drift) and either assert on their source or drive them in a vm sandbox.
//
// Run: node tests/scanner-chart-live-patch.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level `function NAME(...) {...}` by brace-matching. Skips braces
// inside strings, template literals, regex and comments so nested bodies are safe.
function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
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
  throw new Error('unterminated body: ' + name);
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── Sandbox: real helpers + indicator stack + capturing draw stubs ───────────
const draws = [];          // every _drawCandleChart call
const rsPanels = [];       // every _pfDrawRsPanel / _sfsDrawRsPanel call
let resolveCalls = 0;      // how many times the render cycle resolved a price

function fakeEl() { return { textContent: '', innerHTML: '', style: {} }; }
const elCache = {};

const sandbox = {
  console, JSON, Object, String, Math, Number, isFinite, parseFloat, parseInt, NaN,
  setInterval: function () { return 0; },   // poll timers are inert in the sandbox
  clearInterval: function () {},
  // Controlled market session — flip _isRegular between cases.
  _isRegular: true,
  getUsEquityMarketSession: function () { return { isRegularSession: sandbox._isRegular }; },
  isRTHOpen: function () { return sandbox._isRegular; },
  debugLog: function () {}, debugWarn: function () {},
  S: {
    scanData: [],
    rsChartState: { symbol: null, overlay: { sma8: false, bb: false, kc: false, atr: false } },
    squeezeFireScanner: { chartSymbol: null, chartCacheCandles: {}, chartOverlay: { sma8: false } },
  },
  _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
  _scannerChartSymbol: null,
  // Backend chart-candle caches (null → _rsDrawTf/_schartDrawTf use the buffer
  // accessors, which is the live-patch path under test here).
  _rsBackendCandleCache: null,
  _scannerBackendCandleCache: null,
  SFS_FIRE_LOOKBACK: 5,
  // Fake DOM — one reusable element per id.
  document: {
    getElementById: function (id) { return (elCache[id] || (elCache[id] = fakeEl())); },
  },
  // Capturing chart stubs — record exactly what the render path handed to the draw.
  _drawCandleChart: function (wrapId, candles, indicators, opts) {
    draws.push({ wrapId: wrapId, candles: candles, indicators: indicators, opts: opts });
  },
  _mcxDrawRsi: function () {},
  _pfDrawRsPanel: function (wrapId, candles, spyCandles, viewLen) {
    rsPanels.push({ via: '_pfDrawRsPanel', wrapId: wrapId, candles: candles });
  },
  _sfsDrawRsPanel: function (symbol, tf, rsId, candles, viewLen) {
    rsPanels.push({ via: '_sfsDrawRsPanel', symbol: symbol, tf: tf, candles: candles });
  },
  // SPY benchmark series for the RS sub-panels (any series works — panel is stubbed).
  getDailyCandles: function () { return spySeries(); },
  getFourHourCandles: function () { return spySeries(); },
  _rsGetDailyCandles: function () { return spySeries(); },
};
sandbox.window = { addEventListener: function () {} };
vm.createContext(sandbox);

// Real helpers + indicator stack + the three per-timeframe draw fns + the SFS
// orchestrator — all pulled verbatim from index.html.
vm.runInContext(
  ['_dssResolvePrice', 'resolveLatestDisplayPrice', 'patchLastCandleWithLivePrice',
   'smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze', 'computeCandleIndicators',
   '_schartDrawTf', '_rsDrawTf', '_sfsDrawOneTf', '_sfsResolveRenderPrice', '_sfsDrawCharts']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);

// Wrap resolveLatestDisplayPrice so we can count resolutions per render cycle
// (proves "resolve ONCE"). _sfsDrawCharts looks the name up dynamically, so
// reassigning the context global is observed by the already-defined function.
sandbox.__realResolve = sandbox.resolveLatestDisplayPrice;
sandbox.resolveLatestDisplayPrice = function () { resolveCalls++; return sandbox.__realResolve.apply(null, arguments); };

// ── Fixtures ─────────────────────────────────────────────────────────────────
// 40-bar oscillating series ending on a chosen close (>20 bars → indicators
// non-null). The penultimate progression is independent of the final close so
// raw-vs-patched indicators clearly differ.
function series(lastClose) {
  const arr = []; let prev = 290;
  for (let i = 0; i < 40; i++) {
    const c = (i === 39) ? lastClose : prev + (i % 2 ? 1.2 : -0.7);
    if (i !== 39) prev = c;
    arr.push({ time: i + 1, open: c - 0.3, high: c + 1.5, low: c - 1.5, close: c, volume: 1000 });
  }
  return arr;
}
function spySeries() { return series(500); }
const lastClose = (a) => a[a.length - 1].close;

function dxRow(sym, px, candleC) {
  return { ticker: sym, _priceSource: 'DXLink', price: String(px), bid: px - 0.1, ask: px + 0.1,
           candles: [{ c: candleC }] };
}
function resetCaptures() { draws.length = 0; rsPanels.length = 0; resolveCalls = 0; }

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — STATIC WIRING (source-level, drift-proof)
// ═════════════════════════════════════════════════════════════════════════════

// Helper: assert a draw fn patches its candles BEFORE computing indicators and
// BEFORE drawing, no longer re-resolves via _patchLivePrice, and uses the shared
// PR #207 primitive on its candle variable.
function assertDrawTf(fnName, candleVar, label, indVar) {
  indVar = indVar || candleVar;   // SFS patches rawCandles → candles, then computes on candles
  const src = stripComments(extractFn(HTML, fnName));
  const patch = src.indexOf('patchLastCandleWithLivePrice(' + candleVar);
  const ind   = src.indexOf('computeCandleIndicators(' + indVar + ')');
  const draw  = src.indexOf('_drawCandleChart(');
  ok(patch >= 0, label + ': patches via patchLastCandleWithLivePrice(' + candleVar + ', …)');
  ok(patch >= 0 && ind >= 0 && patch < ind,
     label + ': patch precedes computeCandleIndicators (indicators derive from the patched close)');
  ok(patch >= 0 && draw >= 0 && patch < draw,
     label + ': patch precedes _drawCandleChart (no unpatched first draw)');
  ok(!/_patchLivePrice\(\s*(candles|rawCandles)\b/.test(src),
     label + ': no longer re-resolves the symbol price via _patchLivePrice');
  ok(!/yahoo/i.test(src) && !/\bfetch\b/.test(src) && !/\/market\//.test(src),
     label + ': introduces no Yahoo / fetch / network fallback');
}

// Helper: assert a late 4H poll accepts + reuses the render-scoped price and never
// re-resolves a (potentially divergent) price of its own.
function assertPoll(fnName, drawFn, label) {
  const src = stripComments(extractFn(HTML, fnName));
  ok(new RegExp('function ' + fnName + '\\(\\s*symbol\\s*,\\s*resolvedPrice\\s*\\)').test(src),
     label + ': accepts the render-scoped resolvedPrice parameter');
  ok(/var pollPrice = /.test(src) || /pollPrice/.test(src),
     label + ': captures the render-scoped price (pollPrice) before clearing poll state');
  ok(new RegExp(drawFn + "\\('4H'[^;]*pollPrice").test(src),
     label + ': hands the captured pollPrice to ' + drawFn + "('4H', …)");
  ok(!/resolveLatestDisplayPrice\s*\(/.test(src),
     label + ': does NOT call resolveLatestDisplayPrice — cannot drift from the 1D render price');
  ok(!/_patchLivePrice\(/.test(src),
     label + ': does NOT use the RTH-gated _patchLivePrice');
}

// Helper: assert a render orchestrator resolves the price exactly once and threads
// it into both timeframes (+ the poll, when present).
function assertOrchestrator(fnName, priceExpr, drawFn, pollFn, label) {
  const src = stripComments(extractFn(HTML, fnName));
  const resolves = (src.match(/resolveLatestDisplayPrice\(\s*symbol\s*\)/g) || []).length;
  ok(resolves === 1, label + ': resolves the price exactly once via resolveLatestDisplayPrice(symbol)');
  const threaded = (src.match(new RegExp(drawFn + '\\([^;]*' + priceExpr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  ok(threaded >= 2, label + ': threads ' + priceExpr + ' into BOTH timeframe draws (>=2 sites)');
  if (pollFn) {
    ok(new RegExp(pollFn + '\\(\\s*symbol\\s*,\\s*' + priceExpr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(src),
       label + ': hands ' + priceExpr + ' to the late 4H poll ' + pollFn + '(symbol, …)');
  }
}

section('1. Scanner inline chart ("▲ CHART") — renderScannerInlineChart / _schartDrawTf / _schart4hStartPoll');
assertOrchestrator('renderScannerInlineChart', '_schartLive.price', '_schartDrawTf', '_schart4hStartPoll', '1: renderScannerInlineChart');
assertDrawTf('_schartDrawTf', 'candles', '1: _schartDrawTf');
assertPoll('_schart4hStartPoll', '_schartDrawTf', '1: _schart4hStartPoll');

section('2. RS vs SPY — renderRsCharts / _rsDrawTf / _rs4hStartPoll');
assertOrchestrator('renderRsCharts', '_rsLive.price', '_rsDrawTf', '_rs4hStartPoll', '2: renderRsCharts');
assertDrawTf('_rsDrawTf', 'candles', '2: _rsDrawTf');
assertPoll('_rs4hStartPoll', '_rsDrawTf', '2: _rs4hStartPoll');

section('3. Squeeze Fire — _sfsDrawCharts / _sfsDrawOneTf (synchronous, no late poll)');
{
  // _sfsDrawCharts resolves once and threads live.price into both _sfsDrawOneTf calls.
  const src = stripComments(extractFn(HTML, '_sfsDrawCharts'));
  ok((src.match(/_sfsResolveRenderPrice\(\s*symbol\s*\)/g) || []).length === 1,
     '3: _sfsDrawCharts resolves the price exactly once (via _sfsResolveRenderPrice)');
  ok((src.match(/_sfsDrawOneTf\([^;]*live\.price\s*\)/g) || []).length >= 2,
     '3: _sfsDrawCharts threads live.price into BOTH _sfsDrawOneTf calls');
  assertDrawTf('_sfsDrawOneTf', 'rawCandles', '3: _sfsDrawOneTf', 'candles');
  const tfSrc = stripComments(extractFn(HTML, '_sfsDrawOneTf'));
  ok(!/resolveLatestDisplayPrice\s*\(/.test(tfSrc),
     '3: _sfsDrawOneTf does NOT re-resolve — it receives the render-scoped livePrice');
  // Both timeframes are drawn in the single synchronous _sfsDrawCharts call (after
  // _sfsEnsureChartData), so there is no late poll path to drift. Guard that the
  // open path awaits data then draws both, and the resize redraws both.
  const openSrc = stripComments(extractFn(HTML, '_sfsOpenChart'));
  ok(/_sfsEnsureChartData\(\s*symbol\s*\)[\s\S]*_sfsDrawCharts\(\s*symbol\s*\)/.test(openSrc),
     '3: _sfsOpenChart hydrates via _sfsEnsureChartData THEN _sfsDrawCharts (single render cycle)');
}

section('4. SPY-benchmark patching is preserved (no over-reach into the RS sub-panel)');
{
  const rsPanelSrc = stripComments(extractFn(HTML, '_sfsDrawRsPanel'));
  ok(/_patchLivePrice\(\s*\w+,\s*'SPY'\s*\)/.test(rsPanelSrc),
     "4: _sfsDrawRsPanel still patches the SPY benchmark via _patchLivePrice(…, 'SPY')");
  // The shared primitives are untouched (still the PR #207 contract).
  const prim = stripComments(extractFn(HTML, 'patchLastCandleWithLivePrice'));
  ok(/candles\.slice\(0, -1\)\.concat/.test(prim) && !/yahoo/i.test(prim),
     '4: patchLastCandleWithLivePrice remains pure + DXLink-only (no Yahoo)');
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — RUNTIME END-TO-END (drive the REAL draw fns, capture the drawn candles)
// ═════════════════════════════════════════════════════════════════════════════
// FSLR: live DXLink mark 311.01 during RTH; the 1D buffer ends at 299.50 and the
// 4H buffer ends at a DIFFERENT stale 303.64 — the exact divergence the fix must
// erase. After the render cycle, every drawn timeframe must end on 311.01.

section('5. Scanner inline chart: 1D & 4H drawn candles + RS panel end on the SAME resolved price');
{
  resetCaptures();
  sandbox._isRegular = true;
  sandbox.S.scanData = [dxRow('FSLR', 311.01, 299.50)];
  const live = sandbox.resolveLatestDisplayPrice('FSLR').price;   // == _schartLive.price
  ok(live === 311.01, '5: resolveLatestDisplayPrice → live mark 311.01');

  const d = series(299.50), f = series(303.64);
  sandbox._schartDrawTf('1D', 'FSLR', d, 'DXLINK', live);
  sandbox._schartDrawTf('4H', 'FSLR', f, 'DXLINK', live);

  ok(draws.length === 2, '5: both timeframes drew');
  ok(lastClose(draws[0].candles) === 311.01, '5: 1D drawn candle ends on 311.01 (was 299.50)');
  ok(lastClose(draws[1].candles) === 311.01, '5: 4H drawn candle ends on 311.01 (was the stale 303.64)');
  ok(lastClose(draws[0].candles) === lastClose(draws[1].candles), '5: 1D and 4H end EQUAL — no divergence');
  // RS sub-panel received the PATCHED candles (RS derives from the live close).
  ok(rsPanels.length === 2 && rsPanels.every((p) => lastClose(p.candles) === 311.01),
     '5: RS-vs-SPY sub-panel got the patched candles (RS computed off 311.01)');
  // Indicators in the draw were computed on the PATCHED dataset (≠ the raw one).
  const patchedSma = sandbox.computeCandleIndicators(draws[0].candles).lastSma8;
  const rawSma     = sandbox.computeCandleIndicators(d).lastSma8;   // d is untouched (pure patch)
  ok(draws[0].opts.lastSma8 === patchedSma && patchedSma !== rawSma,
     '5: SMA label matches indicators of the PATCHED dataset, not the raw close (' +
     rawSma.toFixed(2) + ' → ' + patchedSma.toFixed(2) + ')');
}

section('6. RS vs SPY: 1D & 4H drawn candles + RS panel end on the SAME resolved price');
{
  resetCaptures();
  sandbox._isRegular = true;
  sandbox.S.scanData = [dxRow('NVDA', 123.45, 120.00)];
  const live = sandbox.resolveLatestDisplayPrice('NVDA').price;
  ok(live === 123.45, '6: resolveLatestDisplayPrice → live mark 123.45');

  sandbox._rsDrawTf('1D', 'NVDA', series(120.00), 'DXLINK', live);
  sandbox._rsDrawTf('4H', 'NVDA', series(118.30), 'DXLINK', live);

  ok(draws.length === 2 && lastClose(draws[0].candles) === 123.45 && lastClose(draws[1].candles) === 123.45,
     '6: 1D and 4H drawn candles both end on 123.45 (were 120.00 / 118.30)');
  ok(rsPanels.length === 2 && rsPanels.every((p) => lastClose(p.candles) === 123.45),
     '6: RS-vs-SPY sub-panel got the patched candles for both timeframes');
}

section('7. Squeeze Fire: _sfsDrawCharts resolves ONCE and both timeframes end on that price');
{
  resetCaptures();
  sandbox._isRegular = true;
  sandbox.S.scanData = [dxRow('AAPL', 207.77, 205.10)];
  sandbox.S.squeezeFireScanner.chartCacheCandles = { AAPL: { '1D': series(205.10), '4H': series(209.40) } };

  sandbox._sfsDrawCharts('AAPL');   // resolves internally, draws both timeframes

  ok(resolveCalls === 1, '7: _sfsDrawCharts resolved the price exactly ONCE for the whole render cycle');
  ok(draws.length === 2 && lastClose(draws[0].candles) === 207.77 && lastClose(draws[1].candles) === 207.77,
     '7: both SFS timeframes end on the single resolved price 207.77 (were 205.10 / 209.40)');
  ok(rsPanels.length === 2 && rsPanels.every((p) => p.via === '_sfsDrawRsPanel' && lastClose(p.candles) === 207.77),
     '7: SFS RS sub-panel got the patched candles for both timeframes');
}

section('8. Market CLOSED: all panels fall back to the last RTH daily close (never a live AH mark)');
{
  resetCaptures();
  sandbox._isRegular = false;                              // after hours
  // Row carries a bogus AH "mark" 888; the canonical truth is the RTH daily close 305.10.
  sandbox.S.scanData = [{ ticker: 'FSLR', _priceSource: 'DXLink', price: '888', bid: 1, ask: 2,
                          candles: [{ c: 300.0 }, { c: 305.10 }] }];
  const live = sandbox.resolveLatestDisplayPrice('FSLR').price;
  ok(live === 305.10, '8: closed → resolves the last RTH daily close 305.10, ignores the 888 AH mark');

  sandbox._schartDrawTf('1D', 'FSLR', series(305.10), 'RTH_CLOSE', live);
  sandbox._schartDrawTf('4H', 'FSLR', series(301.20), 'RTH_CLOSE', live);
  ok(draws.length === 2 && lastClose(draws[0].candles) === 305.10 && lastClose(draws[1].candles) === 305.10,
     '8: 1D and 4H both end on the RTH close 305.10 (4H no longer stale at 301.20)');
}

section('9. REOPEN freshness: a second open re-resolves the CURRENT price and re-patches');
{
  resetCaptures();
  sandbox._isRegular = true;
  sandbox.S.scanData = [dxRow('TSLA', 250.00, 248.0)];
  const first = sandbox.resolveLatestDisplayPrice('TSLA').price;   // first open
  sandbox.S.scanData[0].price = '262.50';                          // APEX updates while detail closed
  const second = sandbox.resolveLatestDisplayPrice('TSLA').price;  // reopen
  ok(first === 250.00 && second === 262.50,
     '9: reopen re-resolves the latest price (250.00 → 262.50), not a memoized first-open value');
  sandbox._sfsDrawCharts && (sandbox.S.squeezeFireScanner.chartCacheCandles = { TSLA: { '1D': series(248), '4H': series(255) } });
  sandbox._sfsDrawCharts('TSLA');
  ok(draws.length === 2 && lastClose(draws[0].candles) === 262.50 && lastClose(draws[1].candles) === 262.50,
     '9: re-render patches both timeframes to the freshly resolved 262.50');
}

section('10. Squeeze Fire FALLBACK parity: scanData has no row → resolve from the SFS cache');
{
  // The residual 1D/4H mismatch (e.g. 441.31 vs 441.29): SFS runs independently of
  // the Directional Scanner, so the symbol is absent from S.scanData and
  // resolveLatestDisplayPrice returns null — leaving BOTH timeframes UNPATCHED and
  // each showing its own raw last close. _sfsResolveRenderPrice now falls back to
  // the symbol's freshest cached close so one shared price patches both.
  resetCaptures();
  sandbox._isRegular = true;
  sandbox.S.scanData = [];                              // Directional Scanner NOT run
  sandbox.S.squeezeFireScanner.chartSymbol = 'MSFT';
  sandbox.S.squeezeFireScanner.chartCacheCandles = { MSFT: { '1D': series(441.31), '4H': series(441.29) } };

  const r = sandbox._sfsResolveRenderPrice('MSFT');
  ok(r.price === 441.31 && /sfsCache/.test(r.source),
     '10: scanData empty → falls back to the SFS cache close 441.31 (source ' + r.source + '), not null');

  sandbox._sfsDrawCharts('MSFT');
  ok(draws.length === 2, '10: both timeframes drew');
  ok(lastClose(draws[0].candles) === 441.31 && lastClose(draws[1].candles) === 441.31,
     '10: 1D and 4H drawn candles BOTH end on 441.31 (4H was the stale 441.29) — mismatch erased');
  ok(lastClose(draws[0].candles) === lastClose(draws[1].candles),
     '10: 1D and 4H visible last-price labels are now identical');
}

section('11. Squeeze Fire: scanData row STILL wins over the cache fallback when present');
{
  resetCaptures();
  sandbox._isRegular = true;
  sandbox.S.scanData = [dxRow('MSFT', 442.00, 441.31)];   // live DXLink mark present
  sandbox.S.squeezeFireScanner.chartCacheCandles = { MSFT: { '1D': series(441.31), '4H': series(441.29) } };
  const r = sandbox._sfsResolveRenderPrice('MSFT');
  ok(r.price === 442.00 && r.source === 'dxlink',
     '11: scanData DXLink mark 442.00 is preferred over the cache fallback');
  sandbox._sfsDrawCharts('MSFT');
  ok(lastClose(draws[0].candles) === 442.00 && lastClose(draws[1].candles) === 442.00,
     '11: both timeframes patched to the canonical resolver price 442.00');
}

section('12. Visible price-label SOURCE: _drawCandleChart uses the passed (patched) last close');
{
  const dcc = stripComments(extractFn(HTML, '_drawCandleChart'));
  // The right-axis price tag derives curPrice from opts.currentPrice/livePrice/
  // lastPrice, ELSE the last visible candle's close — i.e. the dataset passed in.
  ok(/view\[view\.length-1\]\.close/.test(dcc),
     '12: _drawCandleChart falls back to view[last].close (the passed dataset) for the price tag');
  // SFS passes NO overriding price opt, so the tag is exactly the patched last close.
  const oneTf = stripComments(extractFn(HTML, '_sfsDrawOneTf'));
  const drawCall = oneTf.slice(oneTf.indexOf('_drawCandleChart('));
  ok(!/currentPrice|livePrice|lastPrice/.test(drawCall),
     '12: SFS _drawCandleChart call passes no currentPrice/livePrice/lastPrice — label = patched last close');
  // Redraw/zoom/pan: _drawCandleChart stashes the PASSED candles; _chartRedraw reuses them.
  ok(/wrap\.__chart\s*=\s*\{[\s\S]*candles:\s*candles/.test(dcc),
     '12: _drawCandleChart stashes the passed (patched) candles into wrap.__chart');
  ok(/st\.candles/.test(stripComments(extractFn(HTML, '_chartRedraw'))),
     '12: _chartRedraw (zoom/pan/reset) redraws from the stashed patched candles');
}

section('13. Per-timeframe SFS debug log emits live / lastBefore / lastAfter');
{
  const oneTf = extractFn(HTML, '_sfsDrawOneTf');
  ok(/\[SFS-CHART-LIVE-PATCH\][\s\S]*tf=. \+ tf \+ . live=/.test(oneTf) || /tf=' \+ tf \+ ' live=/.test(oneTf),
     '13: _sfsDrawOneTf logs [SFS-CHART-LIVE-PATCH] … tf=… live=…');
  ok(/lastBefore=/.test(oneTf) && /lastAfter=/.test(oneTf),
     '13: log includes lastBefore= and lastAfter= (raw vs patched final close)');
  ok(/debugLog\(\s*'sfs'/.test(oneTf), '13: log stays behind the existing S.debug.sfs scope');
}

section('14. No scanner rule / ranking / filter / signal logic touched by the price-parity fix');
{
  // The functions that own scan/rank/filter/signal logic must contain NO chart
  // price-patch code, and the chart code must not call them.
  ['_sfsAnalyzeSymbolTimeframe', '_sfsGetFilteredResults', '_sfsSortResults'].forEach((n) => {
    let body; try { body = stripComments(extractFn(HTML, n)); } catch (e) { body = null; }
    if (body == null) { ok(true, '14: ' + n + ' not present (skipped)'); return; }
    ok(!/patchLastCandleWithLivePrice|_sfsResolveRenderPrice|resolveLatestDisplayPrice/.test(body),
       '14: ' + n + ' contains no chart price-patch / resolver code (logic untouched)');
  });
  const charts = stripComments(extractFn(HTML, '_sfsDrawCharts'));
  const oneTf  = stripComments(extractFn(HTML, '_sfsDrawOneTf'));
  ok(!/_sfsAnalyzeSymbolTimeframe|_sfsSortResults|_sfsGetFilteredResults|\.score\b|fireBarsAgo|_sfsSetFilter/.test(charts + oneTf),
     '14: SFS chart draw path never invokes scan/rank/filter/scoring logic');
}

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
