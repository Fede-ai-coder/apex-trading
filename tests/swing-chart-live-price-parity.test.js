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

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

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
   '_etDateStr', '_candleTradingSessionDate', '_apexIsDailyOrCoarserTimeframe', '_apexUtcDateStr', '_apexCandleSessionDate', '_apexWeekBucketFromSessionDate',
   'smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze', 'computeCandleIndicators',
   '_swingWeekBucket', '_etWeekBucket', '_etMinutes', '_backendCandleStoreChartNormTime', '_swingCandleTimeMs', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles', '_swingRowPriceObservedAt',
   '_swingPatchWeeklyWithSessionPrice',
   '_swingResolveRenderPrice', '_swingPreparePriceAlignedCandles', '_swingLogChartPrice', '_swingLogChartCandles',
   '_swingSetChartState', '_swingIsHardFailure', '_swingChartFailMsg',
   '_swingIsLatestChartRequest', '_swingDrawOneChart', '_swingRenderCharts']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);
vm.runInContext("var SWING_CANDLE_SOURCE = { BACKEND:'TASTYTRADE_DXLINK', CACHE:'DXLINK_CACHE', STALE:'DXLINK_STALE_CACHE', NONE:'NONE', ERROR:'ERROR' }; var SWING_CANDLE_REASON = { BACKEND_DOWN:'DXLINK_BACKEND_UNAVAILABLE', STALE_CACHE:'DXLINK_CANONICAL_CACHE_STALE', NO_CANONICAL:'NO_CANONICAL_CANDLES', NON_CANONICAL_REJECTED:'NON_CANONICAL_SERIES_REJECTED' };", sandbox);

// Count resolutions per render cycle (proves "resolve ONCE"). _swingRenderCharts and
// _swingResolveRenderPrice look these names up dynamically, so wrapping the context
// globals is observed by the already-defined functions.
sandbox.__realResolve = sandbox.resolveLatestDisplayPrice;
sandbox.resolveLatestDisplayPrice = function () { resolveCalls++; return sandbox.__realResolve.apply(null, arguments); };
sandbox.__realSwingResolve = sandbox._swingResolveRenderPrice;
sandbox._swingResolveRenderPrice = function () { swingResolveCalls++; return sandbox.__realSwingResolve.apply(null, arguments); };

// ── Fixtures ─────────────────────────────────────────────────────────────────
// SESSION ANCHORING. Every bar is stamped at 15:00 UTC — 10:00 ET, inside the regular
// session — so a bar's America/New_York trading date equals its UTC date and each fixture
// has one unambiguous session identity. (The former midnight-UTC anchor placed each bar at
// 19:00 ET of the PREVIOUS day; that UTC-vs-ET date shift is itself one of the hazards this
// suite now pins.)
//
// Two distinct situations must be kept apart, because the session-identity guard treats them
// differently and only one of them is real price parity:
//   • SAME session, fresher print — the 1D bar for today exists and the 4H carries a later
//     print of that same session. The daily's close legitimately advances to it.
//   • DIFFERENT sessions — the 1D store still ends on an earlier session. Writing today's
//     price into that bar would produce a candle with an open from one session and a close
//     from another (the EXPE hybrid). The guard must block it.
const DAY_MS = 86400000, H_MS = 3600000;
const DAILY_BASE = Date.UTC(2024, 0, 2, 15, 0); // a Tuesday, 10:00 ET
const LAST_IDX = 219;                            // last bar index of mkDaily(220, ...)

// Today's America/New_York trading date at 15:00 UTC. A live in-session DXLink mark belongs
// to the CURRENT trading session, so any fixture exercising that branch must put its final
// bar in that same session — otherwise the guard correctly refuses the patch.
const TODAY_ET = (function () {
  const q = sandbox._etDateStr(Date.now()).split('-').map(Number);
  return Date.UTC(q[0], q[1] - 1, q[2], 15, 0);
})();

// n daily bars, one calendar day apart, ending on `lastClose`. The penultimate
// progression is independent of the final close so raw-vs-patched indicators differ.
// `endT` (optional) pins the LAST bar's timestamp; bars step backwards from it.
function mkDaily(n, lastClose, endT) {
  const arr = []; let prev = 150;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const c = isLast ? lastClose : prev + (i % 2 ? 0.8 : -0.5);
    if (!isLast) prev = c;
    const t = (endT != null) ? (endT - (n - 1 - i) * DAY_MS) : (DAILY_BASE + i * DAY_MS);
    arr.push({ time: t, open: c - 0.3, high: c + 1.2, low: c - 1.2, close: c, volume: 1000 + i });
  }
  return arr;
}
// n 4H bars, 4h apart. The DEFAULT end is four hours after the last mkDaily bar — the SAME
// ET trading session, a later print: the real "the 4H is fresher than the daily close" case.
// Pass lastT explicitly to place the 4H in a different session on purpose.
function mk4H(n, lastClose, lastT) {
  const end = (lastT != null) ? lastT : (DAILY_BASE + LAST_IDX * DAY_MS + 4 * H_MS);
  const arr = []; let prev = 150;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const c = isLast ? lastClose : prev + (i % 2 ? 0.9 : -0.6);
    if (!isLast) prev = c;
    arr.push({ time: end - (n - 1 - i) * 4 * H_MS, open: c - 0.4, high: c + 1.0, low: c - 1.0, close: c, volume: 500 + i });
  }
  return arr;
}
// A scanner row carrying a LIVE DXLink mark also carries `_priceAt`, the observation time the
// scanner stamped when it wrote that mark. The SWING resolver requires it before the mark may
// claim a trading session (an unstamped or previous-session mark cannot be written into a
// candle), so a fixture modelling a real live-mark row must include it.
function dxRow(sym, px, lastDailyClose, priceAt) {
  return { ticker: sym, _priceSource: 'DXLink', price: String(px), bid: px - 0.1, ask: px + 0.1,
           _priceAt: (priceAt != null ? priceAt : Date.now()),
           candles: [{ c: lastDailyClose }] };
}
// Return a copy with every candle's numeric ms `time` rewritten as an ISO-8601 string —
// exercises the ISO-aware timestamp normalization (parseFloat would misread these).
function asISO(candles) { return candles.map((c) => Object.assign({}, c, { time: new Date(c.time).toISOString() })); }
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
  // ── CASE A — market OPEN: the live DXLink mark is authoritative over BOTH candle
  //    closes (daily 196.93 AND 4H 209.80), and all three timeframes end on it. ────
  section('1. CASE A (market open) — live DXLink 210.93 wins over daily 196.93 & 4H 209.80');
  {
    newCycle();
    sandbox._isRegular = true;
    sandbox.S.scanData = [dxRow('NVDA', 210.93, 196.93)]; // live DXLink mark 210.93
    // Current-session bars: the live mark and the bars it advances are the SAME session.
    fx = { oneD: mkDaily(220, 196.93, TODAY_ET), fourH: mk4H(60, 209.80, TODAY_ET + 4 * H_MS), oneW: null };

    const probe = sandbox.resolveLatestDisplayPrice('NVDA');
    resolveCalls = 0; // reset the manual probe call above; measure only the render cycle
    ok(probe.price === 210.93 && probe.source === 'dxlink', '1: resolveLatestDisplayPrice → live mark 210.93 (source dxlink)');

    await render('NVDA');
    const log = priceLogs[priceLogs.length - 1];

    ok(swingResolveCalls === 1, '1: price resolved EXACTLY once for the render cycle (_swingResolveRenderPrice)');
    ok(resolveCalls === 1, '1: resolveLatestDisplayPrice called EXACTLY once (no per-timeframe re-resolve, no late poll)');
    ok(log && near(log.resolvedPrice, 210.93) && log.source === 'dxlink',
       '1: resolvedPrice=210.93 source=dxlink (live mark not downgraded to a candle close)');
    ok(!!draw('1D') && !!draw('4H') && !!draw('1W'), '1: all three timeframes drew');
    ok(near(lastClose(draw('1D').candles), 210.93), '1: 1D last candle ends on 210.93 (was 196.93)');
    ok(near(lastClose(draw('4H').candles), 210.93), '1: 4H last candle ends on 210.93 (lifted from 209.80)');
    ok(near(lastClose(draw('1W').candles), 210.93), '1: 1W last candle ends on 210.93 (was 196.93 — weekly no longer stale)');
    ok(near(lastClose(draw('1D').candles), lastClose(draw('4H').candles)) &&
       near(lastClose(draw('1D').candles), lastClose(draw('1W').candles)),
       '1: 1W == 1D == 4H — the three charts end EQUAL');
  }

  section('2. Indicators (SMA/RSI/BB/KC/squeeze) derive from the PATCHED series, not the raw close');
  {
    // draws carry the indicators the render computed; recompute on raw vs patched to prove which won.
    const d1d = draw('1D');
    const patched = sandbox.patchLastCandleWithLivePrice(fx.oneD, 210.93, sandbox._etDateStr(TODAY_ET));
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
    fx = { oneD: mkDaily(220, 200.00, TODAY_ET), fourH: mk4H(60, 205.00, TODAY_ET + 4 * H_MS), oneW: null };
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
    fx = { oneD: mkDaily(220, 200.00, TODAY_ET), fourH: mk4H(60, 199.00, TODAY_ET + 4 * H_MS), oneW: null };
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
    fx = { oneD: mkDaily(220, 300.00, TODAY_ET), fourH: mk4H(60, 305.00, TODAY_ET + 4 * H_MS), oneW: null };
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
    fx = { oneD: mkDaily(24, 390.00, TODAY_ET),   // 1D chartable (>=20), but too few weekly buckets → local weekly NOT chartable
           fourH: mk4H(60, 395.00, TODAY_ET + 4 * H_MS),
           oneW: mkDaily(30, 388.00, TODAY_ET) }; // backend weekly, ends stale at 388.00, CURRENT week
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
    ok(log && near(log.resolvedPrice, 210.93) && /backend 4H/.test(String(log.source)),
       '7: fallback resolved the freshest (4H) backend close 210.93, source=' + (log && log.source));
    ok(near(lastClose(draw('1D').candles), 210.93), '7: 1D pulled up to 210.93 while CLOSED (not left stale at 196.93)');
    ok(near(lastClose(draw('1W').candles), 210.93), '7: 1W pulled up to 210.93 while CLOSED');
    ok(near(lastClose(draw('4H').candles), 210.93), '7: 4H stays on 210.93');
    ok(near(lastClose(draw('1D').candles), lastClose(draw('4H').candles)) &&
       near(lastClose(draw('1W').candles), lastClose(draw('4H').candles)),
       '7: 1W == 1D == 4H even with the market closed');
  }

  // ── CASE B (the mandatory real regression from the deploy preview) ───────────
  // Market CLOSED, NVDA PRESENT in S.scanData: resolveLatestDisplayPrice returns the
  // scanner row's last RTH daily close 196.93 (source 'row'). That candle-close fallback
  // must NOT win — _swingResolveRenderPrice must still pick the fresher backend 4H 210.93
  // and NOT demote the 4H back to 196.93.
  section('7B. CASE B (market closed, row present) — stale row close 196.93 must NOT drag the 4H down from 210.93');
  {
    newCycle();
    sandbox._isRegular = false;                          // market closed
    sandbox.S.scanData = [dxRow('NVDA', 999.99, 196.93)]; // AH mark ignored; row daily close = 196.93
    // backend 1D last close 196.93 (older bar); backend 4H last close 210.93 (newer bar).
    fx = { oneD: mkDaily(220, 196.93), fourH: mk4H(60, 210.93), oneW: null };

    const rlp = sandbox.resolveLatestDisplayPrice('NVDA');
    ok(rlp.price === 196.93 && rlp.source === 'row',
       '7B: resolveLatestDisplayPrice CAN return the stale daily close 196.93 (source row) when closed');
    resolveCalls = 0; swingResolveCalls = 0;
    const chosen = sandbox._swingResolveRenderPrice('NVDA', fx.oneD, fx.fourH);
    ok(chosen.price === 210.93 && /backend 4H/.test(String(chosen.source)),
       '7B: _swingResolveRenderPrice still selects the fresher 210.93 (source ' + chosen.source + '), NOT the 196.93 row close');

    await render('NVDA');
    const log = priceLogs[priceLogs.length - 1];
    ok(log && near(log.resolvedPrice, 210.93) && /backend 4H/.test(String(log.source)),
       '7B: render cycle resolvedPrice=210.93 source=backend 4H');
    ok(near(lastClose(draw('4H').candles), 210.93), '7B: 4H NOT demoted to 196.93 — stays on 210.93');
    ok(near(lastClose(draw('1D').candles), 210.93), '7B: 1D final close = 210.93');
    ok(near(lastClose(draw('1W').candles), 210.93), '7B: 1W final close = 210.93');
    // Indicators were computed AFTER the patch (on the 210.93 series, not the 196.93 one).
    const d1d = draw('1D');
    const patchedInd = sandbox.computeCandleIndicators(sandbox.patchLastCandleWithLivePrice(fx.oneD, 210.93));
    const staleInd   = sandbox.computeCandleIndicators(fx.oneD);
    ok(near(d1d.opts.lastSma8, patchedInd.lastSma8) && !near(patchedInd.lastSma8, staleInd.lastSma8),
       '7B: 1D indicators derive from the patched 210.93 series, not the stale 196.93 close');
  }

  // ── CASE C — market closed, the DAILY bar is the more recent one (4H is stale). The
  //    chronologically newest candle must win, so the DAILY close is chosen (not the 4H).
  section('7C. CASE C (market closed) — pick the DAILY when its candle is more recent than the 4H');
  {
    newCycle();
    sandbox._isRegular = false;
    sandbox.S.scanData = [];
    // 4H series ends BEFORE the last daily bar → daily is chronologically newest.
    const daily = mkDaily(220, 351.10);                                   // last daily ts = DAILY_BASE + 219 days
    const staleFourH = mk4H(60, 349.20, DAILY_BASE + 100 * DAY_MS);       // 4H ends ~day 100 → older than the daily
    const chosen = sandbox._swingResolveRenderPrice('WHO', daily, staleFourH);
    ok(chosen.price === 351.10 && /backend 1D/.test(String(chosen.source)),
       '7C: selects the DAILY 351.10 (source ' + chosen.source + '), NOT the older 4H 349.20 — 4H is not assumed fresher');
    fx = { oneD: daily, fourH: staleFourH, oneW: null };
    await render('WHO');
    // The chosen price belongs to the DAILY's session, so the 1D (and the weekly derived from
    // it) legitimately end on 351.10. The 4H series' last bar is ~119 sessions earlier: writing
    // 351.10 into it would fabricate a 4H candle opening in one session and closing in another,
    // so the session-identity guard leaves it on its own close 349.20. Parity is SESSION-scoped,
    // never "make the numbers equal whatever session the bar belongs to".
    ok(near(lastClose(draw('1D').candles), 351.10) && near(lastClose(draw('1W').candles), 351.10),
       '7C: 1D and 1W end on the fresher DAILY close 351.10');
    ok(near(lastClose(draw('4H').candles), 349.20),
       '7C: the cross-session 4H is NOT patched — it keeps its own session close 349.20');
    const c4h = draw('4H').candles[draw('4H').candles.length - 1];
    ok(c4h.high < 351.10 && c4h.close === 349.20,
       '7C: no hybrid 4H candle — its high was NOT lifted by a price from another session');
  }

  // ── ISO timestamps: chronological selection must use ISO-aware normalization. A naive
  //    parseFloat("2026-…") → 2026 would misorder these — prove both directions. ─────
  section('7D. ISO timestamps — chronologically newest candle is chosen (parseFloat would misread ISO)');
  {
    // 4H newer than daily (ISO strings on BOTH series).
    const dISO1 = asISO(mkDaily(220, 196.93));                                  // daily ends 2024-… (base+219d)
    const fISO1 = asISO(mk4H(60, 210.93, DAILY_BASE + 300 * DAY_MS + 3 * H_MS)); // 4H ends far later
    const a = sandbox._swingResolveRenderPrice('ISO1', dISO1, fISO1);
    ok(a.price === 210.93 && /backend 4H/.test(String(a.source)),
       '7D: ISO — newer 4H (210.93) chosen over older daily (196.93), source ' + a.source);
    // Inverse: daily newer than 4H (ISO strings on BOTH series).
    const dISO2 = asISO(mkDaily(220, 305.55));                            // daily ends base+219d
    const fISO2 = asISO(mk4H(60, 301.10, DAILY_BASE + 80 * DAY_MS));      // 4H ends base+80d → older
    const b = sandbox._swingResolveRenderPrice('ISO2', dISO2, fISO2);
    ok(b.price === 305.55 && /backend 1D/.test(String(b.source)),
       '7D: ISO — newer daily (305.55) chosen over older 4H (301.10), source ' + b.source);
    // Direct proof the ISO string is normalized to real epoch-ms (not truncated by parseFloat).
    const iso = fISO1[fISO1.length - 1].time;
    ok(typeof iso === 'string' && /T/.test(iso) &&
       sandbox._swingCandleTimeMs({ time: iso }) === Date.parse(iso),
       '7D: _swingCandleTimeMs normalizes the ISO string to Date.parse ms (parseFloat would give ' + parseFloat(iso) + ')');
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
    fx = { oneD: mkDaily(220, 100.00, TODAY_ET), fourH: mk4H(60, 105.00, TODAY_ET + 4 * H_MS), oneW: null };
    await render('ONCE');
    ok(priceLogs.length === 1, '9: exactly ONE [SWING-CHART-PRICE] payload per render cycle');
    const log = priceLogs[0];
    ok(log.symbol === 'ONCE' && near(log.resolvedPrice, 111.11) &&
       near(log.dailyBefore, 100.00) && near(log.dailyAfter, 111.11) &&
       near(log.fourHBefore, 105.00) && near(log.fourHAfter, 111.11),
       '9: payload carries symbol + resolvedPrice + daily/weekly/4H before-vs-after');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1B — SESSION-IDENTITY GUARD (the EXPE hybrid-candle regression)
  //
  // Price parity must never be bought by mixing two trading sessions into one candle.
  // These cases pin the boundary: a price advances a bar only when the bar belongs to
  // that price's America/New_York trading session.
  // ═══════════════════════════════════════════════════════════════════════════
  section('14. EXPE regression — a price from session N must NOT be written into the bar of session N-1');
  {
    // Real EXPE numbers. The backend 1D store ends on 2026-07-29 (open 268.30, close 270.85);
    // the current session 2026-07-30 (TradingView O 291.54 H 312.40 L 290.64 C 310.21) is not
    // in the 1D store yet but IS in the 4H store, whose latest print is 309.70.
    const D = (y, m, d, hh) => Date.UTC(y, m - 1, d, hh == null ? 15 : hh, 0);
    const hist = [];
    for (let i = 0; i < 220; i++) hist.push({ time: D(2026, 7, 29) - (220 - i) * DAY_MS, open: 250 + i * 0.08, high: 251 + i * 0.08, low: 249 + i * 0.08, close: 250.5 + i * 0.08, volume: 1000 });
    const expeDaily = hist.concat([
      { time: D(2026, 7, 28), open: 267.70, high: 270.20, low: 265.90, close: 269.40, volume: 1740000 },
      { time: D(2026, 7, 29), open: 268.30, high: 272.60, low: 267.10, close: 270.85, volume: 1960000 },
    ]);
    const expe4H = [];
    for (let i = 0; i < 58; i++) expe4H.push({ time: D(2026, 7, 29) - (58 - i) * 4 * H_MS, open: 260 + i * 0.15, high: 261 + i * 0.15, low: 259 + i * 0.15, close: 260.5 + i * 0.15, volume: 500 });
    expe4H.push({ time: D(2026, 7, 30, 13), open: 291.54, high: 305.10, low: 290.64, close: 303.80, volume: 3100000 });
    expe4H.push({ time: D(2026, 7, 30, 17), open: 303.80, high: 312.40, low: 302.90, close: 309.70, volume: 2300000 });

    newCycle();
    sandbox._isRegular = false;
    sandbox.S.scanData = [];          // EXPE is a squeeze/RS candidate, absent from scanData
    fx = { oneD: expeDaily, fourH: expe4H, oneW: null };
    await render('EXPE');

    const chosen = sandbox._swingResolveRenderPrice('EXPE', expeDaily, expe4H);
    ok(near(chosen.price, 309.70) && chosen.sessionDate === '2026-07-30',
       '14: the resolved price 309.70 is tagged with its own session 2026-07-30 (got ' + chosen.sessionDate + ')');

    const last1D = draw('1D').candles[draw('1D').candles.length - 1];
    ok(sandbox._candleTradingSessionDate(last1D) === '2026-07-29',
       '14: the final 1D bar is still session 2026-07-29 (no bar invented for 07-30)');
    ok(near(last1D.open, 268.30) && near(last1D.high, 272.60) &&
       near(last1D.low, 267.10) && near(last1D.close, 270.85),
       '14: that bar is UNTOUCHED — O 268.30 H 272.60 L 267.10 C 270.85, one single session');
    ok(!near(last1D.close, 309.70),
       '14: the 07-30 price 309.70 was NOT written into the 07-29 bar (this WAS the bug)');
    ok(!(near(last1D.open, 268.30) && near(last1D.close, 309.70)),
       '14: the hybrid candle (open 268.30 + close 309.70, a false +15.4% body) can no longer be built');
    // The 4H, which really is on 2026-07-30, keeps the live print.
    ok(near(lastClose(draw('4H').candles), 309.70),
       '14: the 4H — genuinely session 2026-07-30 — still ends on 309.70 (no over-blocking)');
    // The weekly inherits the guarded daily, so it cannot carry the hybrid close either.
    ok(!near(lastClose(draw('1W').candles), 309.70),
       '14: the weekly derived from the guarded daily does not carry the 07-30 close');
    const log = priceLogs[priceLogs.length - 1];
    ok(log && log.priceSession === '2026-07-30' && log.dailySession === '2026-07-29' && log.dailyPatchApplied === false,
       '14: the diagnostic reports priceSession/dailySession and dailyPatchApplied=false');
  }

  section('15. Same session, fresher print — the legitimate parity case still works');
  {
    // The 1D bar for 2026-07-30 EXISTS (open 291.54) and the 4H carries a later print of the
    // SAME session. The daily close must advance to it, and the open must be preserved.
    const D = (y, m, d, hh) => Date.UTC(y, m - 1, d, hh == null ? 15 : hh, 0);
    const hist = [];
    for (let i = 0; i < 220; i++) hist.push({ time: D(2026, 7, 29) - (220 - i) * DAY_MS, open: 250 + i * 0.08, high: 251 + i * 0.08, low: 249 + i * 0.08, close: 250.5 + i * 0.08, volume: 1000 });
    const daily = hist.concat([{ time: D(2026, 7, 30, 13), open: 291.54, high: 312.40, low: 290.64, close: 310.21, volume: 5400000 }]);
    const four = [];
    for (let i = 0; i < 59; i++) four.push({ time: D(2026, 7, 29) - (59 - i) * 4 * H_MS, open: 260 + i * 0.15, high: 261 + i * 0.15, low: 259 + i * 0.15, close: 260.5 + i * 0.15, volume: 500 });
    four.push({ time: D(2026, 7, 30, 17), open: 303.80, high: 312.40, low: 302.90, close: 311.40, volume: 2300000 });

    newCycle();
    sandbox._isRegular = false;
    sandbox.S.scanData = [];
    fx = { oneD: daily, fourH: four, oneW: null };
    await render('EXPE2');

    const last1D = draw('1D').candles[draw('1D').candles.length - 1];
    ok(sandbox._candleTradingSessionDate(last1D) === '2026-07-30', '15: the 1D bar is session 2026-07-30');
    ok(near(last1D.close, 311.40), '15: its close DID advance to the fresher same-session print 311.40');
    ok(near(last1D.open, 291.54), '15: its open is still the real session open 291.54 (never rewritten)');
    ok(near(last1D.high, 312.40) && near(last1D.low, 290.64), '15: high/low remain the real session extremes');
    ok(near(lastClose(draw('1D').candles), lastClose(draw('4H').candles)),
       '15: 1D == 4H — same-session parity is preserved by the guard, not broken by it');
    const log = priceLogs[priceLogs.length - 1];
    ok(log && log.priceSession === '2026-07-30' && log.dailyPatchApplied === true,
       '15: diagnostic confirms the patch was APPLIED for the same-session case');
  }

  section('16. OHLC invariants hold on every drawn candle, in both cases');
  {
    // No hybrid can survive: for every drawn bar high >= max(open, close) and low <= min(open, close).
    let bad = 0, checked = 0;
    draws.forEach((d) => (d.candles || []).forEach((c) => {
      checked++;
      const o = +c.open, h = +c.high, l = +c.low, cl = +c.close;
      if (!(h >= o && h >= cl && l <= o && l <= cl && h >= l)) bad++;
    }));
    ok(checked > 0 && bad === 0, '16: ' + checked + ' drawn candles all satisfy high>=open/close, low<=open/close, high>=low (' + bad + ' violations)');
  }

  section('17. Timestamp units + ISO all resolve to the SAME trading session');
  {
    const ms = Date.UTC(2026, 6, 30, 15, 0);   // 2026-07-30 11:00 ET
    const sec = Math.round(ms / 1000);
    const iso = new Date(ms).toISOString();
    const a = sandbox._candleTradingSessionDate({ time: ms });
    const b = sandbox._candleTradingSessionDate({ time: sec });
    const c = sandbox._candleTradingSessionDate({ time: iso });
    const d = sandbox._candleTradingSessionDate({ t: sec });
    ok(a === '2026-07-30' && b === a && c === a && d === a,
       '17: epoch-ms, epoch-seconds, ISO string and the short `t` key all resolve to 2026-07-30');
    ok(sandbox._candleTradingSessionDate(null) === null &&
       sandbox._candleTradingSessionDate({ time: null }) === null &&
       sandbox._candleTradingSessionDate({ time: 'nonsense' }) === null,
       '17: an unusable timestamp yields null (and null is treated as a MISMATCH, never a pass)');
  }

  section('18. DST — the session date is America/New_York, never a UTC date or a fixed offset');
  {
    // 20:00 ET on 2026-03-06 (EST, UTC-5) is 01:00 UTC on 2026-03-07: the UTC date has already
    // rolled over while the ET trading date has not. A UTC-derived date would say 03-07.
    ok(sandbox._candleTradingSessionDate({ time: Date.UTC(2026, 2, 7, 1, 0) }) === '2026-03-06',
       '18: EST — 2026-03-06 20:00 ET (01:00 UTC next day) is still session 2026-03-06');
    // Same instant-of-day in EDT (UTC-4): 20:00 ET on 2026-07-30 is 00:00 UTC on 07-31.
    ok(sandbox._candleTradingSessionDate({ time: Date.UTC(2026, 6, 31, 0, 0) }) === '2026-07-30',
       '18: EDT — 2026-07-30 20:00 ET (00:00 UTC next day) is still session 2026-07-30');
    // The US/Europe DST misalignment window (Europe already on summer time, US not yet):
    // 2026-03-26 is inside it; 09:30 ET == 13:30 UTC (still EDT for the US from 03-08).
    ok(sandbox._candleTradingSessionDate({ time: Date.UTC(2026, 2, 26, 13, 30) }) === '2026-03-26',
       '18: inside the US/EU DST misalignment window the ET session date is still correct');
    // A fixed -5h offset would misdate this EDT instant; Intl does not.
    ok(sandbox._candleTradingSessionDate({ time: Date.UTC(2026, 6, 30, 4, 30) }) === '2026-07-30' &&
       sandbox._candleTradingSessionDate({ time: Date.UTC(2026, 6, 30, 3, 30) }) === '2026-07-29',
       '18: the EDT midnight boundary sits at 04:00 UTC, proving a real DST-aware conversion');
  }

  section('19. The guard is opt-in — omitting the session argument preserves legacy behaviour');
  {
    const old = [{ time: Date.UTC(2024, 0, 2, 15, 0), open: 100, high: 101, low: 99, close: 100.5 }];
    const noArg = sandbox.patchLastCandleWithLivePrice(old, 250);
    ok(noArg !== old && near(noArg[0].close, 250),
       '19: with no session argument the patch still applies (other chart surfaces unaffected)');
    const guarded = sandbox.patchLastCandleWithLivePrice(old, 250, '2026-07-30');
    ok(guarded === old, '19: with a mismatching session the INPUT ARRAY is returned by identity (pure no-op)');
    const matched = sandbox.patchLastCandleWithLivePrice(old, 250, '2024-01-02');
    ok(matched !== old && near(matched[0].close, 250), '19: with the matching session the patch applies');
    ok(old[0].close === 100.5, '19: the input is never mutated in any of the three paths');
  }

  section('20. Weekly patch is WEEK-scoped, not session-scoped');
  {
    const wkNow = [{ time: Date.UTC(2026, 6, 27, 15, 0), open: 280, high: 300, low: 275, close: 295 }]; // Mon 2026-07-27
    const inWeek = Date.UTC(2026, 6, 30, 15, 0);  // Thu 2026-07-30 — same market week
    const nextWeek = Date.UTC(2026, 7, 4, 15, 0); // Tue 2026-08-04 — a later week
    const a = sandbox._swingPatchWeeklyWithSessionPrice(wkNow, 310.21, inWeek);
    ok(a !== wkNow && near(a[0].close, 310.21),
       '20: a price from a session INSIDE the weekly bar\'s week advances that bar (Mon-open weekly bar, Thu price)');
    const b = sandbox._swingPatchWeeklyWithSessionPrice(wkNow, 310.21, nextWeek);
    ok(b === wkNow, '20: a price from a LATER week is refused (no weekly bar ever gets a close from a week it excludes)');
    const c = sandbox._swingPatchWeeklyWithSessionPrice(wkNow, 310.21, null);
    ok(c === wkNow, '20: an unknown price session is refused (unprovable ⇒ no patch)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2 — STATIC WIRING (source-level, drift-proof)
  // ═══════════════════════════════════════════════════════════════════════════
  section('10. _swingRenderCharts resolves ONCE and patches BEFORE indicators / draws');
  {
    const src = stripComments(extractFn(HTML, '_swingRenderCharts'));
    // Centralized: _swingRenderCharts resolves+patches via the SHARED helper exactly once, and
    // never calls _swingResolveRenderPrice / resolveLatestDisplayPrice directly (single seam).
    ok((src.match(/_swingPreparePriceAlignedCandles\(/g) || []).length === 1,
       '10: _swingRenderCharts calls the shared _swingPreparePriceAlignedCandles exactly once');
    ok(!/_swingResolveRenderPrice\s*\(/.test(src),
       '10: _swingRenderCharts does not re-resolve the price directly (delegates to the shared helper)');
    ok(!/resolveLatestDisplayPrice\s*\(/.test(src),
       '10: _swingRenderCharts never calls resolveLatestDisplayPrice directly (single resolver seam)');
    // The shared helper resolves ONCE and derives the weekly from the PATCHED daily.
    const help = stripComments(extractFn(HTML, '_swingPreparePriceAlignedCandles'));
    ok((help.match(/_swingResolveRenderPrice\(/g) || []).length === 1,
       '10: the shared helper resolves the price exactly once via _swingResolveRenderPrice');
    ok(/_swingDeriveWeeklyCandles\(Array\.isArray\(dailyPatched\)/.test(help) || /_derive\(\s*Array\.isArray\(dailyPatched\)/.test(help),
       '10: the shared helper derives the weekly from the PATCHED daily (dailyPatched), never the raw input');
    // The alignment precedes every draw in _swingRenderCharts.
    const firstAlign = src.indexOf('_swingPreparePriceAlignedCandles(');
    const firstDraw  = src.indexOf('_swingDrawOneChart(');
    ok(firstAlign >= 0 && firstDraw >= 0 && firstAlign < firstDraw,
       '10: price alignment precedes the first _swingDrawOneChart (indicators derive from the patched close)');
  }

  section('11. No late 4H poll re-resolves a divergent price (the Swing path has none)');
  {
    // The Swing 4H is fetched synchronously in the single _swingRenderCharts cycle — there
    // is no separate _swing*4h poll function that could re-resolve. Prove: (a) the render
    // resolved exactly once above, and (b) no swing chart function starts a timer/poll.
    ok(resolveCalls >= 0, '11: (context) covered by §1/§7 — exactly one resolution per render, no second poll cycle');
    const chartSrc = ['_swingRenderCharts', '_swingPreparePriceAlignedCandles', '_swingResolveRenderPrice', '_swingDrawOneChart', '_swingLogChartPrice']
      .map((n) => stripComments(extractFn(HTML, n))).join('\n');
    ok(!/setInterval\s*\(/.test(chartSrc), '11: swing chart path starts no setInterval (no autonomous late-price poll)');
  }

  section('12. No new fetch / Yahoo / WebSocket / endpoint / fan-out in the price-parity code');
  {
    const src = ['_swingRenderCharts', '_swingPreparePriceAlignedCandles', '_swingResolveRenderPrice', '_swingLogChartPrice']
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
