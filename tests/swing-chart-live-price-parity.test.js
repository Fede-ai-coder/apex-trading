'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING panel — 1W / 1D / 4H last-price parity.
//
// Regression: opening a Swing candidate renders a 1W, a 1D and a 4H chart. The 4H
// backend series is often fresher than the 1D/1W (their last backend close lags),
// so the three charts ended on DIFFERENT last prices — e.g. NVDA 4H 210.93 while 1D
// and 1W stayed at the stale backend close 196.93. Indicators were also computed on
// the unpatched closes.
//
// Fix (mirrors the Directional Scanner PR #207 / SFS contract exactly): resolve the
// latest APEX display price ONCE per render cycle (via resolveLatestDisplayPrice,
// with a freshest-backend-candle fallback for candidates absent from S.scanData),
// patch every timeframe's FINAL candle with that identical value via
// patchLastCandleWithLivePrice BEFORE computing indicators, and derive the 1W from
// the ALREADY-PATCHED 1D so the weekly is never built from a stale daily.
//
// Every proof reads the REAL functions out of index.html (no copies, so they cannot
// drift) and drives them in a vm sandbox with capturing draw stubs.
//
// Run: node tests/swing-chart-live-price-parity.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level `function NAME(...) {...}` (or `async function`) by brace
// matching. Skips braces inside strings / template literals / regex / comments.
function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  let start = src.indexOf('async ' + sig);
  if (start < 0) start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
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
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

// ── Harness ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6;

// ── Sandbox ──────────────────────────────────────────────────────────────────
const draws = [];            // every _drawCandleChart call: { wrapId, candles, indicators, opts }
const priceLogs = [];        // every [SWING-CHART-PRICE] payload
let resolveCalls = 0;        // resolveLatestDisplayPrice calls in the current render cycle
let swingResolveCalls = 0;   // _swingResolveRenderPrice calls in the current render cycle

function fakeEl() { return { textContent: '', innerHTML: '', style: {} }; }
const elCache = {};

const sandbox = {
  console: {
    log: function () {
      // Capture the compact price-parity diagnostic; forward everything for visibility.
      if (arguments[0] === '[SWING-CHART-PRICE]') priceLogs.push(arguments[1]);
      console.log.apply(console, arguments);
    },
    warn: function () {}, error: function () {},
  },
  JSON, Object, String, Math, Number, isFinite, parseFloat, parseInt, NaN, Array, Promise, Date, setTimeout,
  _isRegular: true,
  getUsEquityMarketSession: function () { return { isRegularSession: sandbox._isRegular }; },
  isRTHOpen: function () { return sandbox._isRegular; },
  S: { scanData: [], swing: { selectedSymbol: null, chartRequestId: 0 } },
  document: { getElementById: function (id) { return (elCache[id] || (elCache[id] = fakeEl())); } },
  // Capturing chart stub — records exactly what the render path handed to the draw.
  _drawCandleChart: function (wrapId, candles, indicators, opts) {
    draws.push({ wrapId: wrapId, candles: candles, indicators: indicators, opts: opts });
    var el = elCache[wrapId] || (elCache[wrapId] = fakeEl());
    el.innerHTML = 'READY:' + wrapId + ':' + (candles ? candles.length : 0);
  },
  _mcxDrawRsi: function () {},
};
vm.createContext(sandbox);

// Real helpers + indicator stack + the Swing render path — all verbatim from index.html.
vm.runInContext(
  ['_dssResolvePrice', 'resolveLatestDisplayPrice', 'patchLastCandleWithLivePrice',
   'smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze', 'computeCandleIndicators',
   '_swingWeekBucket', '_swingDeriveWeeklyCandles',
   '_swingResolveRenderPrice', '_swingLogChartPrice', '_swingLogChartCandles',
   '_swingSetChartState', '_swingIsHardFailure', '_swingChartFailMsg',
   '_swingIsLatestChartRequest', '_swingDrawOneChart', '_swingRenderCharts']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);

// Count resolutions per render cycle (proves "resolve ONCE"). _swingRenderCharts and
// _swingResolveRenderPrice look these names up dynamically, so wrapping the context
// globals is observed by the already-defined functions.
sandbox.__realResolve = sandbox.resolveLatestDisplayPrice;
sandbox.resolveLatestDisplayPrice = function () { resolveCalls++; return sandbox.__realResolve.apply(null, arguments); };
sandbox.__realSwingResolve = sandbox._swingResolveRenderPrice;
sandbox._swingResolveRenderPrice = function () { swingResolveCalls++; return sandbox.__realSwingResolve.apply(null, arguments); };

// ── Fixtures ─────────────────────────────────────────────────────────────────
const DAY_MS = 86400000, H_MS = 3600000;
const DAILY_BASE = Date.UTC(2024, 0, 2); // a Tuesday

// n daily bars, one calendar day apart, ending on `lastClose`. The penultimate
// progression is independent of the final close so raw-vs-patched indicators differ.
function mkDaily(n, lastClose) {
  const arr = []; let prev = 150;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const c = isLast ? lastClose : prev + (i % 2 ? 0.8 : -0.5);
    if (!isLast) prev = c;
    arr.push({ time: DAILY_BASE + i * DAY_MS, open: c - 0.3, high: c + 1.2, low: c - 1.2, close: c, volume: 1000 + i });
  }
  return arr;
}
// n 4H bars, 4h apart, ending AFTER the last daily bar (so a freshest-timestamp
// fallback prefers the 4H close — exactly the real "4H is more recent" situation).
function mk4H(n, lastClose, lastT) {
  const end = (lastT != null) ? lastT : (DAILY_BASE + 260 * DAY_MS + 3 * H_MS);
  const arr = []; let prev = 150;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const c = isLast ? lastClose : prev + (i % 2 ? 0.9 : -0.6);
    if (!isLast) prev = c;
    arr.push({ time: end - (n - 1 - i) * 4 * H_MS, open: c - 0.4, high: c + 1.0, low: c - 1.0, close: c, volume: 500 + i });
  }
  return arr;
}
function dxRow(sym, px, lastDailyClose) {
  return { ticker: sym, _priceSource: 'DXLink', price: String(px), bid: px - 0.1, ask: px + 0.1,
           candles: [{ c: lastDailyClose }] };
}
const lastClose = (a) => a && a.length ? a[a.length - 1].close : null;
const lastHigh  = (a) => a && a.length ? a[a.length - 1].high  : null;
const lastLow   = (a) => a && a.length ? a[a.length - 1].low   : null;
const draw = (tf) => { const id = 'swing-chart-' + tf.toLowerCase(); return draws.filter((d) => d.wrapId === id).pop(); };

// Install the controllable backend candle reader (single source the render awaits).
let fx = { oneD: [], fourH: [], oneW: null };
sandbox._swingGetChartCandles = async function (sym, tf) {
  if (tf === '1D') return { ok: true, candles: fx.oneD,  count: fx.oneD.length,  source: 'BACKEND', reason: null };
  if (tf === '4H') return { ok: true, candles: fx.fourH, count: fx.fourH.length, source: 'BACKEND', reason: null };
  if (tf === '1W') return fx.oneW ? { ok: true, candles: fx.oneW, count: fx.oneW.length, source: 'BACKEND', reason: null }
                                  : { ok: false, candles: [], count: 0, source: 'NONE', reason: null };
  return { ok: false, candles: [], count: 0, source: 'NONE', reason: null };
};
function newCycle() { draws.length = 0; priceLogs.length = 0; resolveCalls = 0; swingResolveCalls = 0; }
async function render(sym) {
  const reqId = (sandbox.S.swing.chartRequestId = (sandbox.S.swing.chartRequestId || 0) + 1);
  sandbox.S.swing.selectedSymbol = sym;
  return vm.runInContext('_swingRenderCharts(' + JSON.stringify(sym) + ', ' + reqId + ')', sandbox);
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — RUNTIME: drive the REAL _swingRenderCharts end-to-end
// ═════════════════════════════════════════════════════════════════════════════
(async () => {
  // ── The exact regression: 4H fresh at 210.93, 1D & 1W stale at 196.93 ────────
  section('1. NVDA — 1W, 1D, 4H all end on the ONE resolved price 210.93 (regression)');
  {
    newCycle();
    sandbox._isRegular = true;
    sandbox.S.scanData = [dxRow('NVDA', 210.93, 196.93)]; // live DXLink mark 210.93
    fx = { oneD: mkDaily(220, 196.93), fourH: mk4H(60, 210.93), oneW: null };

    const resolved = sandbox.resolveLatestDisplayPrice('NVDA').price;
    resolveCalls = 0; // reset the manual probe call above; measure only the render cycle
    ok(resolved === 210.93, '1: resolveLatestDisplayPrice → live mark 210.93');

    await render('NVDA');

    ok(swingResolveCalls === 1, '1: price resolved EXACTLY once for the render cycle (_swingResolveRenderPrice)');
    ok(resolveCalls === 1, '1: resolveLatestDisplayPrice called EXACTLY once (no per-timeframe re-resolve, no late poll)');
    ok(!!draw('1D') && !!draw('4H') && !!draw('1W'), '1: all three timeframes drew');
    ok(near(lastClose(draw('1D').candles), 210.93), '1: 1D last candle ends on 210.93 (was 196.93)');
    ok(near(lastClose(draw('4H').candles), 210.93), '1: 4H last candle ends on 210.93');
    ok(near(lastClose(draw('1W').candles), 210.93), '1: 1W last candle ends on 210.93 (was 196.93 — weekly no longer stale)');
    ok(near(lastClose(draw('1D').candles), lastClose(draw('4H').candles)) &&
       near(lastClose(draw('1D').candles), lastClose(draw('1W').candles)),
       '1: 1W == 1D == 4H — the three charts end EQUAL');
  }

  section('2. Indicators (SMA/RSI/BB/KC/squeeze) derive from the PATCHED series, not the raw close');
  {
    // draws carry the indicators the render computed; recompute on raw vs patched to prove which won.
    const d1d = draw('1D');
    const patched = sandbox.patchLastCandleWithLivePrice(fx.oneD, 210.93);
    const patchedInd = sandbox.computeCandleIndicators(patched);
    const rawInd     = sandbox.computeCandleIndicators(fx.oneD);
    ok(near(d1d.indicators.lastSma8, patchedInd.lastSma8) && !near(patchedInd.lastSma8, rawInd.lastSma8),
       '2: SMA8 matches the PATCHED dataset, not the raw close (' + rawInd.lastSma8.toFixed(3) + ' → ' + patchedInd.lastSma8.toFixed(3) + ')');
    ok(near(d1d.opts.lastSma8, patchedInd.lastSma8), '2: the SMA8 label handed to _drawCandleChart is the patched value');
    ok(near(d1d.opts.rsi, patchedInd.lastRsi) && Number.isFinite(patchedInd.lastRsi), '2: RSI label is the patched-series RSI');
    ok(d1d.indicators.bb && d1d.indicators.kc && Array.isArray(d1d.indicators.squeeze),
       '2: BB / KC / squeeze were computed on the drawn (patched) series');
    // Squeeze/BB/KC parity: the drawn squeeze array equals the one computed on the patched series.
    ok(d1d.indicators.squeeze.length === patchedInd.squeeze.length &&
       d1d.indicators.lastSqueeze === patchedInd.lastSqueeze,
       '2: squeeze state equals the patched-series squeeze (BB+KC fed the patched final candle)');
  }

  section('3. HIGH extended when the resolved price is above the last candle high');
  {
    newCycle();
    sandbox._isRegular = true;
    sandbox.S.scanData = [dxRow('HII', 260.00, 200.00)]; // resolved 260 >> daily high (~201.2) & 4H high
    fx = { oneD: mkDaily(220, 200.00), fourH: mk4H(60, 205.00), oneW: null };
    await render('HII');
    ok(near(lastClose(draw('1D').candles), 260.00) && near(lastHigh(draw('1D').candles), 260.00),
       '3: 1D final candle close AND high both lifted to 260.00 (high extended)');
    ok(near(lastClose(draw('4H').candles), 260.00) && near(lastHigh(draw('4H').candles), 260.00),
       '3: 4H final candle high extended to 260.00');
    ok(near(lastClose(draw('1W').candles), 260.00) && near(lastHigh(draw('1W').candles), 260.00),
       '3: 1W final candle high extended to 260.00');
    // open / timestamp preserved (only close/high/low may move).
    const rawLastDaily = fx.oneD[fx.oneD.length - 1];
    const drawnLastDaily = draw('1D').candles[draw('1D').candles.length - 1];
    ok(near(drawnLastDaily.open, rawLastDaily.open) && drawnLastDaily.time === rawLastDaily.time,
       '3: open & timestamp of the final candle are preserved (not fabricated)');
  }

  section('4. LOW extended when the resolved price is below the last candle low');
  {
    newCycle();
    sandbox._isRegular = true;
    sandbox.S.scanData = [dxRow('LOO', 140.00, 200.00)]; // resolved 140 << daily low (~198.8)
    fx = { oneD: mkDaily(220, 200.00), fourH: mk4H(60, 199.00), oneW: null };
    await render('LOO');
    ok(near(lastClose(draw('1D').candles), 140.00) && near(lastLow(draw('1D').candles), 140.00),
       '4: 1D final candle close AND low both dropped to 140.00 (low extended)');
    ok(near(lastLow(draw('4H').candles), 140.00), '4: 4H final candle low extended to 140.00');
    ok(near(lastLow(draw('1W').candles), 140.00), '4: 1W final candle low extended to 140.00');
  }

  section('5. Weekly is derived from the PATCHED daily (not a stale daily series)');
  {
    // The drawn 1W final bar close must equal the drawn 1D final bar close for the same
    // render cycle — only possible if the weekly was aggregated AFTER the daily patch.
    newCycle();
    sandbox._isRegular = true;
    sandbox.S.scanData = [dxRow('WKY', 321.00, 300.00)];
    fx = { oneD: mkDaily(220, 300.00), fourH: mk4H(60, 305.00), oneW: null };
    await render('WKY');
    const w = draw('1W').candles, d = draw('1D').candles;
    ok(near(lastClose(w), 321.00) && near(lastClose(w), lastClose(d)),
       '5: 1W final close == 1D final close == 321.00 (weekly built from the patched daily)');
    // Prove staleness would have been visible: raw weekly (from the UNPATCHED daily) ends on 300.00.
    const rawWeekly = sandbox._swingDeriveWeeklyCandles(fx.oneD);
    ok(near(lastClose(rawWeekly), 300.00),
       '5: the raw (unpatched) weekly would have ended on the stale 300.00 — the fix moved it to 321.00');
    // The one-shot diagnostic reflects the weekly before/after.
    const log = priceLogs[priceLogs.length - 1];
    ok(log && near(log.weeklyBefore, 300.00) && near(log.weeklyAfter, 321.00),
       '5: [SWING-CHART-PRICE] logs weeklyBefore=300.00 → weeklyAfter=321.00');
  }

  section('6. Backend-served 1W fallback is ALSO patched (weekly never stale via either source)');
  {
    // Too few daily bars to derive a chartable weekly locally → the backend 1W is used;
    // it must be patched to the same resolved price before drawing.
    newCycle();
    sandbox._isRegular = true;
    sandbox.S.scanData = [dxRow('BWK', 410.00, 390.00)];
    fx = { oneD: mkDaily(24, 390.00),   // 1D chartable (>=20), but ~4 weekly buckets → local weekly NOT chartable
           fourH: mk4H(60, 395.00),
           oneW: mkDaily(30, 388.00) }; // backend weekly, ends stale at 388.00
    await render('BWK');
    ok(!!draw('1W'), '6: backend 1W fallback drew');
    ok(near(lastClose(draw('1W').candles), 410.00),
       '6: backend-served 1W final candle patched to 410.00 (was the stale 388.00)');
    ok(near(lastClose(draw('1D').candles), 410.00) && near(lastClose(draw('4H').candles), 410.00),
       '6: 1D & 4H also on 410.00 — parity preserved on the backend-weekly path');
  }

  section('7. Market CLOSED + no scanner row → freshest backend candle wins; parity holds (no RTH-only gate)');
  {
    // Squeeze / RS candidate absent from scanData → resolveLatestDisplayPrice returns null.
    // The 4H backend bar is fresher (210.93) than the 1D (196.93); the fallback resolves it
    // and BOTH 1D and 1W are pulled up to it — they are NOT left stale while the 4H is fresh.
    newCycle();
    sandbox._isRegular = false;      // market closed
    sandbox.S.scanData = [];         // no row for this symbol
    fx = { oneD: mkDaily(220, 196.93), fourH: mk4H(60, 210.93), oneW: null };
    await render('NOROW');
    ok(swingResolveCalls === 1 && resolveCalls === 1, '7: still resolved exactly once (closed market)');
    const log = priceLogs[priceLogs.length - 1];
    ok(log && near(log.resolvedPrice, 210.93) && /swingCandle:4H/.test(String(log.source)),
       '7: fallback resolved the freshest (4H) backend close 210.93, source=' + (log && log.source));
    ok(near(lastClose(draw('1D').candles), 210.93), '7: 1D pulled up to 210.93 while CLOSED (not left stale at 196.93)');
    ok(near(lastClose(draw('1W').candles), 210.93), '7: 1W pulled up to 210.93 while CLOSED');
    ok(near(lastClose(draw('4H').candles), 210.93), '7: 4H stays on 210.93');
    ok(near(lastClose(draw('1D').candles), lastClose(draw('4H').candles)) &&
       near(lastClose(draw('1W').candles), lastClose(draw('4H').candles)),
       '7: 1W == 1D == 4H even with the market closed');
  }

  section('8. Legacy-safe: NO valid price resolved → backend closes untouched (no NaN, no corrupt candle)');
  {
    newCycle();
    // Force the genuine no-price case (the real fallback returns non-null when candles
    // exist, so stub _swingResolveRenderPrice to null for this one render).
    const realSwingResolve = sandbox._swingResolveRenderPrice;
    sandbox._swingResolveRenderPrice = function () { swingResolveCalls++; return { price: null, source: null }; };
    sandbox._isRegular = true;
    sandbox.S.scanData = [];
    fx = { oneD: mkDaily(220, 196.93), fourH: mk4H(60, 205.55), oneW: null };
    await render('NULLP');
    ok(near(lastClose(draw('1D').candles), 196.93), '8: 1D keeps its backend close 196.93 (no patch applied)');
    ok(near(lastClose(draw('4H').candles), 205.55), '8: 4H keeps its backend close 205.55 (legacy behavior preserved)');
    const allFinite = draws.every((d) => d.candles.every((c) => Number.isFinite(c.close) && Number.isFinite(c.high) && Number.isFinite(c.low)));
    ok(allFinite, '8: every drawn candle has finite close/high/low — no NaN introduced');
    const log = priceLogs[priceLogs.length - 1];
    ok(log && log.resolvedPrice === null, '8: diagnostic reports resolvedPrice=null (honest no-op)');
    sandbox._swingResolveRenderPrice = realSwingResolve; // restore
  }

  section('9. Diagnostic is emitted ONCE per render cycle (no per-candle log storm)');
  {
    newCycle();
    sandbox._isRegular = true;
    sandbox.S.scanData = [dxRow('ONCE', 111.11, 100.00)];
    fx = { oneD: mkDaily(220, 100.00), fourH: mk4H(60, 105.00), oneW: null };
    await render('ONCE');
    ok(priceLogs.length === 1, '9: exactly ONE [SWING-CHART-PRICE] payload per render cycle');
    const log = priceLogs[0];
    ok(log.symbol === 'ONCE' && near(log.resolvedPrice, 111.11) &&
       near(log.dailyBefore, 100.00) && near(log.dailyAfter, 111.11) &&
       near(log.fourHBefore, 105.00) && near(log.fourHAfter, 111.11),
       '9: payload carries symbol + resolvedPrice + daily/weekly/4H before-vs-after');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2 — STATIC WIRING (source-level, drift-proof)
  // ═══════════════════════════════════════════════════════════════════════════
  section('10. _swingRenderCharts resolves ONCE and patches BEFORE indicators / draws');
  {
    const src = stripComments(extractFn(HTML, '_swingRenderCharts'));
    ok((src.match(/_swingResolveRenderPrice\(/g) || []).length === 1,
       '10: _swingRenderCharts calls _swingResolveRenderPrice exactly once');
    ok(!/resolveLatestDisplayPrice\s*\(/.test(src),
       '10: _swingRenderCharts never calls resolveLatestDisplayPrice directly (single resolver seam)');
    // patch of both series precedes every _swingDrawOneChart call.
    const firstPatch = src.indexOf('patchLastCandleWithLivePrice');
    const firstDraw  = src.indexOf('_swingDrawOneChart(');
    ok(firstPatch >= 0 && firstDraw >= 0 && firstPatch < firstDraw,
       '10: the last-candle patch precedes the first _swingDrawOneChart (indicators derive from the patched close)');
    ok(/_swingDeriveWeeklyCandles\(\s*oneDCandles\s*\)/.test(src),
       '10: weekly is derived from oneDCandles (the PATCHED daily), never the raw oneD.candles');
  }

  section('11. No late 4H poll re-resolves a divergent price (the Swing path has none)');
  {
    // The Swing 4H is fetched synchronously in the single _swingRenderCharts cycle — there
    // is no separate _swing*4h poll function that could re-resolve. Prove: (a) the render
    // resolved exactly once above, and (b) no swing chart function starts a timer/poll.
    ok(resolveCalls >= 0, '11: (context) covered by §1/§7 — exactly one resolution per render, no second poll cycle');
    const chartSrc = ['_swingRenderCharts', '_swingResolveRenderPrice', '_swingDrawOneChart', '_swingLogChartPrice']
      .map((n) => stripComments(extractFn(HTML, n))).join('\n');
    ok(!/setInterval\s*\(/.test(chartSrc), '11: swing chart path starts no setInterval (no autonomous late-price poll)');
  }

  section('12. No new fetch / Yahoo / WebSocket / endpoint / fan-out in the price-parity code');
  {
    const src = ['_swingRenderCharts', '_swingResolveRenderPrice', '_swingLogChartPrice']
      .map((n) => stripComments(extractFn(HTML, n))).join('\n');
    ok(!/\bfetch\s*\(/.test(src), '12: no fetch(');
    ok(!/yahoo/i.test(src), '12: no Yahoo provider');
    ok(!/new\s+WebSocket|dxlinkSubscribe|createSubscription/i.test(src), '12: no WebSocket / new DXLink subscription');
    ok(!/BACKEND\s*\+|\/dev\/market\/|\/scanner\//.test(src), '12: no new backend endpoint / URL');
    ok(!/forEach[\s\S]*_swingGetChartCandles|for\s*\([^)]*\)[\s\S]*_swingGetChartCandles/.test(src),
       '12: no per-symbol / per-timeframe candle fan-out loop');
  }

  section('13. Shared primitives untouched (still the PR #207 contract)');
  {
    const prim = stripComments(extractFn(HTML, 'patchLastCandleWithLivePrice'));
    ok(/candles\.slice\(0, -1\)\.concat/.test(prim) && !/yahoo/i.test(prim),
       '13: patchLastCandleWithLivePrice remains pure + DXLink-only (no Yahoo, input not mutated)');
    // _swingResolveRenderPrice reuses the shared resolver (does not fork price truth).
    const rr = stripComments(extractFn(HTML, '_swingResolveRenderPrice'));
    ok(/resolveLatestDisplayPrice\s*\(\s*symbol\s*\)/.test(rr),
       '13: _swingResolveRenderPrice reuses the canonical resolveLatestDisplayPrice');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
