'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING candles — TRADING-SESSION IDENTITY of the resolved-price upsert.
//
// THE REGRESSION (EXPE, 1D panel)
//   The internal SWING 1D chart drew a last candle with close ≈ 309.70 and open
//   ≈ 268–270, i.e. a ~+15% green body. TradingView for the same daily session
//   reported O 291.54  H 312.40  L 290.64  C 310.21. The close was plausible; the
//   open was not.
//
// ROOT CAUSE — proven, not assumed
//   Writing a resolved display price into a candle is an UPSERT into ONE OHLC
//   bucket, and a bucket's identity is (symbol, timeframe, TRADING SESSION).
//   patchLastCandleWithLivePrice keyed that upsert on "the last element of the
//   array" ALONE. Whenever the served series lagged the resolved price by one or
//   more trading sessions — the ordinary case while the backend 1D store has not
//   yet written the in-progress session, and the 4H store already has — the price
//   of session N landed on the bar of session N-k. That bar kept its own `open`
//   and `low` while receiving `high` and `close` from session N: a single candle
//   spanning TWO sessions.
//
//   The provider payload, the backend response, the frontend normalization, the
//   (absent) RTH filter, the sort and the (absent) dedup/merge were all verified
//   clean for the same fixture — the corruption is introduced by the patch and by
//   nothing before it. See PART 1 for that stage-by-stage proof.
//
// THE FIX
//   The resolved price now carries its own trading-session identity
//   (_swingResolveRenderPrice → { price, source, sessionDate, sessionMs }), and the
//   upsert applies only when the target bar belongs to that session
//   (patchLastCandleWithLivePrice's `priceSessionDate` guard, and the week-scoped
//   _swingPatchWeeklyWithSessionPrice for the weekly). No clamp, no size filter, no
//   dropped candle, no substituted open, no interpolation, no EXPE special case.
//
// BEFORE/AFTER is proven inside a SINGLE run WITHOUT any copy of the historical code:
// the fix was designed so that calling the REAL primitive with the session argument
// OMITTED reproduces the pre-fix behaviour exactly, so "BEFORE" is the live function on
// its unguarded path and "AFTER" is the same live function with the session supplied.
// LEGACY_UNGUARDED_PATCH below is kept only as an ANTI-DRIFT cross-check: §3 asserts the
// real unguarded path still matches it field by field, so if the primitive's unguarded
// behaviour ever changes, this test fails instead of silently comparing against a stale
// copy of history.
//
// Deterministic and fully offline: no network, no clock dependence, no live data.
//
// Run: node tests/swing-candle-session-identity.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const { loadAppJavaScriptSource, extractFunctionSource } = require('./lib/load-app-source');

const SRC = loadAppJavaScriptSource();
const fn = (name) => extractFunctionSource(name, { source: SRC });

// ── Harness ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6;

// ── Sandbox ──────────────────────────────────────────────────────────────────
const draws = [];
const priceLogs = [];
const elCache = {};
const fakeEl = () => ({ textContent: '', innerHTML: '', style: {} });

const sandbox = {
  console: {
    log: function () { if (arguments[0] === '[SWING-CHART-PRICE]') priceLogs.push(arguments[1]); },
    warn: function () {}, error: function () {},
  },
  JSON, Object, String, Math, Number, isFinite, parseFloat, parseInt, NaN, Array,
  Promise, Date, setTimeout, Intl,
  _isRegular: false,
  getUsEquityMarketSession: function () { return { isRegularSession: sandbox._isRegular }; },
  isRTHOpen: function () { return sandbox._isRegular; },
  S: { scanData: [], swing: { selectedSymbol: null, chartRequestId: 0 } },
  document: { getElementById: (id) => (elCache[id] || (elCache[id] = fakeEl())) },
  _drawCandleChart: function (wrapId, candles, indicators, opts) {
    draws.push({ wrapId: wrapId, candles: candles, indicators: indicators, opts: opts });
    const el = elCache[wrapId] || (elCache[wrapId] = fakeEl());
    el.innerHTML = 'READY:' + wrapId + ':' + (candles ? candles.length : 0);
  },
  _mcxDrawRsi: function () {},
};
vm.createContext(sandbox);

// Every function below is the REAL one, read out of the application source.
vm.runInContext([
  '_etMinutes', '_etDateStr', 'getUsEquityMarketSession', 'isRTHOpen',
  '_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray',
  '_apexParityExtractBackendCandles', '_sfsExtractBackendCandles',
  '_backendCandleStoreChartNormTime', '_candleTradingSessionDate',
  '_dssResolvePrice', 'resolveLatestDisplayPrice', 'patchLastCandleWithLivePrice',
  'smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze', 'computeCandleIndicators',
  '_swingWeekBucket', '_etWeekBucket', '_swingCandleTimeMs', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles', '_swingRowPriceObservedAt', '_swingResolveRenderPrice', '_swingPatchWeeklyWithSessionPrice',
  '_swingPreparePriceAlignedCandles', '_swingLogChartPrice', '_swingLogChartCandles',
  '_swingSetChartState', '_swingIsHardFailure', '_swingChartFailMsg',
  '_swingIsLatestChartRequest', '_swingDrawOneChart', '_swingRenderCharts',
].map(fn).join('\n'), sandbox);
vm.runInContext("var SWING_CANDLE_SOURCE = { BACKEND:'TASTYTRADE_DXLINK', CACHE:'DXLINK_CACHE', STALE:'DXLINK_STALE_CACHE', NONE:'NONE', ERROR:'ERROR' }; var SWING_CANDLE_REASON = { BACKEND_DOWN:'DXLINK_BACKEND_UNAVAILABLE', STALE_CACHE:'DXLINK_CANONICAL_CACHE_STALE', NO_CANONICAL:'NO_CANONICAL_CANDLES', LEGACY_REJECTED:'LEGACY_PROVIDER_REJECTED' };", sandbox);

// The pre-fix primitive as it stood before the session guard. NOT used to produce the
// "BEFORE" result — the real function's unguarded path is. It exists solely so §3 can
// assert the two still agree, pinning this reference against drift.
function LEGACY_UNGUARDED_PATCH(candles, livePrice) {
  if (!candles || !candles.length) return candles;
  const live = parseFloat(livePrice);
  if (!isFinite(live) || live <= 0) return candles;
  const last = candles[candles.length - 1];
  if (!last) return candles;
  const lastClose = parseFloat(last.close);
  if (isFinite(lastClose) && Math.abs(live - lastClose) < 0.001) return candles;
  const hi = parseFloat(last.high), lo = parseFloat(last.low);
  const patched = Object.assign({}, last, {
    close: live,
    high: Math.max(isFinite(hi) ? hi : live, live),
    low: Math.min(isFinite(lo) ? lo : live, live),
    source: 'DXLink',
  });
  return candles.slice(0, -1).concat([patched]);
}

// ── Fixture: the real EXPE case ──────────────────────────────────────────────
// Bars are stamped at 09:30 ET (13:30 UTC in EDT) — the backend contract for this
// series is "epoch seconds at the bucket START".
const DAY_MS = 86400000, H_MS = 3600000;
const at = (y, m, d, hh, mm) => Date.UTC(y, m - 1, d, hh == null ? 13 : hh, mm == null ? 30 : mm);

// The last CLOSED session present in the backend 1D store.
const SESSION_PREV = { date: '2026-07-29', t: at(2026, 7, 29), o: 268.30, h: 272.60, l: 267.10, c: 270.85 };
// The in-progress session, as TradingView reports it. NOT yet in the 1D store.
const SESSION_TODAY = { date: '2026-07-30', t: at(2026, 7, 30), o: 291.54, h: 312.40, l: 290.64, c: 310.21 };
// The latest 4H print of the in-progress session — the value that reached the chart.
const LIVE_4H_CLOSE = 309.70;

function history(endMs, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = 250 + i * 0.08;
    out.push({ time: endMs - (n - i) * DAY_MS, open: c - 0.4, high: c + 0.9, low: c - 0.9, close: c, volume: 1500000 });
  }
  return out;
}

// The backend 1D store: history + 07-28 + 07-29. No 07-30 bar.
// history() is anchored at 07-28 so its last bar is 07-27 — the explicit 07-28 and 07-29
// bars below are appended without duplicating a bucket.
function expeDaily1D() {
  return history(at(2026, 7, 28), 220).concat([
    { time: at(2026, 7, 28), open: 267.70, high: 270.20, low: 265.90, close: 269.40, volume: 1740000 },
    { time: SESSION_PREV.t, open: SESSION_PREV.o, high: SESSION_PREV.h, low: SESSION_PREV.l, close: SESSION_PREV.c, volume: 1960000 },
  ]);
}
// The backend 4H store: RTH-anchored buckets, INCLUDING the in-progress 07-30 session.
function expe4H(includeToday) {
  const out = [];
  for (let i = 0; i < 58; i++) {
    const c = 258 + i * 0.2;
    out.push({ time: SESSION_PREV.t - (58 - i) * 4 * H_MS, open: c - 0.5, high: c + 0.8, low: c - 0.8, close: c, volume: 600000 });
  }
  if (includeToday) {
    out.push({ time: at(2026, 7, 30, 13, 30), open: 291.54, high: 305.10, low: 290.64, close: 303.80, volume: 3100000 });
    out.push({ time: at(2026, 7, 30, 17, 30), open: 303.80, high: 312.40, low: 302.90, close: LIVE_4H_CLOSE, volume: 2300000 });
  }
  return out;
}

const sessOf = (c) => sandbox._candleTradingSessionDate(c);
const lastOf = (a) => (a && a.length ? a[a.length - 1] : null);
const drawn = (tf) => draws.filter((d) => d.wrapId === 'swing-chart-' + tf).pop();
function newCycle() { draws.length = 0; priceLogs.length = 0; }
async function render(sym, oneD, fourH, oneW) {
  const reqId = (sandbox.S.swing.chartRequestId = (sandbox.S.swing.chartRequestId || 0) + 1);
  sandbox.S.swing.selectedSymbol = sym;
  sandbox._swingGetChartCandles = async function (s, tf) {
    if (tf === '1D') return { ok: true, candles: oneD, count: oneD.length, source: 'BACKEND', reason: null };
    if (tf === '4H') return { ok: true, candles: fourH, count: fourH.length, source: 'BACKEND', reason: null };
    if (tf === '1W' && oneW) return { ok: true, candles: oneW, count: oneW.length, source: 'BACKEND', reason: null };
    return { ok: false, candles: [], count: 0, source: 'NONE', reason: null };
  };
  return vm.runInContext('_swingRenderCharts(' + JSON.stringify(sym) + ', ' + reqId + ')', sandbox);
}

(async () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1 — WHICH STAGE CORRUPTS THE CANDLE
  // Walk the pipeline with the REAL functions and show the OHLC is intact at
  // every stage up to the price upsert.
  // ═══════════════════════════════════════════════════════════════════════════
  section('1. Provider/backend payload → frontend normalization is loss-free for OHLC and session');
  {
    // Provider shape: epoch SECONDS, {candles:[...]}, exactly as /dev/market/candles-dxlink returns.
    const payload = { ok: true, symbol: 'EXPE', timeframe: '1D', candles: expeDaily1D().map((c) => ({
      time: Math.round(c.time / 1000), open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })) };
    const extracted = sandbox._sfsExtractBackendCandles(payload, '1D');
    const normed = sandbox._apexParityNormCandleArray(extracted);
    const mapped = normed.map((c) => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v || 0 }));
    const rawLast = payload.candles[payload.candles.length - 1];
    const normLast = lastOf(mapped);

    ok(mapped.length === payload.candles.length, '1: every provider bar survives extraction + normalization');
    ok(near(normLast.open, rawLast.open) && near(normLast.high, rawLast.high) &&
       near(normLast.low, rawLast.low) && near(normLast.close, rawLast.close),
       '1: the final bar\'s OHLC is byte-identical to the provider payload (no transformation)');
    ok(sessOf(normLast) === SESSION_PREV.date,
       '1: epoch SECONDS normalize to the correct ET trading session ' + SESSION_PREV.date);
    ok(near(normLast.open, 268.30) && near(normLast.close, 270.85),
       '1: at this stage the bar is a coherent single session — O 268.30 → C 270.85 (+0.95%)');
    // Ordering is enforced upstream, so a later chronological comparison is sound.
    let ascending = true;
    for (let i = 1; i < mapped.length; i++) if (!(mapped[i].time > mapped[i - 1].time)) ascending = false;
    ok(ascending, '1: normalization sorts strictly ascending by timestamp (no lexicographic ordering)');
  }

  section('2. No RTH filter, no dedup and no OHLC merge exist between the read and the upsert');
  {
    // Mechanical, not a claim: an out-of-order + duplicated payload passes through
    // _apexParityNormCandleArray unchanged except for the sort, proving there is no
    // dedup/merge stage that could fuse two sessions.
    const dup = [
      { time: Math.round(SESSION_PREV.t / 1000), open: 268.30, high: 272.60, low: 267.10, close: 270.85 },
      { time: Math.round(at(2026, 7, 28) / 1000), open: 267.70, high: 270.20, low: 265.90, close: 269.40 },
      { time: Math.round(SESSION_PREV.t / 1000), open: 999.99, high: 999.99, low: 999.99, close: 111.11 },
    ];
    const n = sandbox._apexParityNormCandleArray(dup);
    ok(n.length === 3, '2: a duplicate bucket is NOT collapsed — there is no dedup stage (3 in, 3 out)');
    ok(n[0].t < n[1].t && n[1].t === n[2].t, '2: out-of-order input is sorted; the duplicate pair keeps equal timestamps');
    const merged = n.some((c) => c.o === 268.30 && c.c === 111.11);
    ok(!merged, '2: no OHLC merge is performed (no bar mixes the two duplicates\' open and close)');
  }

  section('3. BEFORE/AFTER on the same fixture — the upsert is the corrupting stage');
  {
    const daily = expeDaily1D();
    const resolved = sandbox._swingResolveRenderPrice('EXPE', daily, expe4H(true));
    ok(near(resolved.price, LIVE_4H_CLOSE) && /backend 4H/.test(String(resolved.source)),
       '3: the resolver picks the chronologically newest close ' + LIVE_4H_CLOSE + ' (from the 4H store)');
    ok(resolved.sessionDate === SESSION_TODAY.date,
       '3: and now TAGS it with its own trading session ' + SESSION_TODAY.date + ' (got ' + resolved.sessionDate + ')');

    // BEFORE — the REAL primitive on its unguarded path (session argument omitted), which is
    // byte-for-byte the pre-fix behaviour. Cross-checked against the historical reference so
    // this cannot silently drift.
    const beforeArr = sandbox.patchLastCandleWithLivePrice(daily, resolved.price);
    const refArr = LEGACY_UNGUARDED_PATCH(daily, resolved.price);
    const legacy = lastOf(beforeArr), ref = lastOf(refArr);
    ok(beforeArr.length === refArr.length && near(legacy.open, ref.open) && near(legacy.high, ref.high) &&
       near(legacy.low, ref.low) && near(legacy.close, ref.close) && legacy.source === ref.source,
       '3: ANTI-DRIFT — the real unguarded path still equals the historical pre-fix reference');
    ok(near(legacy.open, 268.30) && near(legacy.close, LIVE_4H_CLOSE),
       '3: BEFORE — the pre-fix patch produced open 268.30 (07-29) with close 309.70 (07-30)');
    ok(near(legacy.high, LIVE_4H_CLOSE) && near(legacy.low, 267.10),
       '3: BEFORE — high lifted to 309.70 while low stayed 267.10 (fields from two sessions)');
    const legacyBodyPct = ((legacy.close - legacy.open) / legacy.open) * 100;
    ok(legacyBodyPct > 15 && legacyBodyPct < 16,
       '3: BEFORE — a fabricated +' + legacyBodyPct.toFixed(1) + '% body (the reported oversized green candle)');
    ok(sessOf(legacy) === SESSION_PREV.date,
       '3: BEFORE — and it was still stamped ' + SESSION_PREV.date + ', so one bar carried two sessions');

    // AFTER — the real, guarded primitive, same inputs.
    const guarded = sandbox.patchLastCandleWithLivePrice(daily, resolved.price, resolved.sessionDate);
    ok(guarded === daily, '3: AFTER — the guarded patch is a pure no-op (input array returned by identity)');
    const g = lastOf(guarded);
    ok(near(g.open, 268.30) && near(g.high, 272.60) && near(g.low, 267.10) && near(g.close, 270.85),
       '3: AFTER — the 07-29 bar keeps its own O 268.30 H 272.60 L 267.10 C 270.85');
    const afterBodyPct = ((g.close - g.open) / g.open) * 100;
    ok(afterBodyPct > 0.9 && afterBodyPct < 1.0,
       '3: AFTER — a truthful +' + afterBodyPct.toFixed(2) + '% body for that session');
    ok(!near(g.close, LIVE_4H_CLOSE), '3: AFTER — the 07-30 price never reaches the 07-29 bar');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2 — END TO END through the real render path
  // ═══════════════════════════════════════════════════════════════════════════
  section('4. Full render, 1D store lagging — no hybrid candle reaches the renderer');
  {
    newCycle();
    sandbox._isRegular = false;
    sandbox.S.scanData = [];           // EXPE absent from scanData (squeeze/RS candidate)
    await render('EXPE', expeDaily1D(), expe4H(true), null);

    const last1D = lastOf(drawn('1d').candles);
    ok(sessOf(last1D) === SESSION_PREV.date, '4: the last 1D bar handed to the renderer is session ' + SESSION_PREV.date);
    ok(near(last1D.open, 268.30) && near(last1D.close, 270.85), '4: with its own O 268.30 / C 270.85');
    ok(!near(last1D.close, LIVE_4H_CLOSE), '4: NOT the 309.70 of the following session');
    // No bar is invented for the missing session.
    const has0730 = drawn('1d').candles.some((c) => sessOf(c) === SESSION_TODAY.date);
    ok(!has0730, '4: no candle is fabricated for the session the 1D store has not written yet');
    // The 4H really is on 07-30, so it keeps the live print — the guard does not over-block.
    ok(near(lastOf(drawn('4h').candles).close, LIVE_4H_CLOSE) &&
       sessOf(lastOf(drawn('4h').candles)) === SESSION_TODAY.date,
       '4: the 4H bar — genuinely session 07-30 — still ends on 309.70');
    // The weekly is derived from the guarded daily and cannot inherit the hybrid close.
    ok(!near(lastOf(drawn('1w').candles).close, LIVE_4H_CLOSE),
       '4: the derived 1W does not carry the 07-30 close either');
    const log = priceLogs[priceLogs.length - 1];
    ok(log && log.priceSession === SESSION_TODAY.date && log.dailySession === SESSION_PREV.date,
       '4: the one-shot diagnostic reports the price session AND each series\' session');
    ok(log && log.dailyPatchApplied === false,
       '4: dailyPatchApplied=false — the guard refused the cross-session upsert');
    // The 4H needs no patch here: the resolved price IS its own last close, so the primitive
    // takes its "already current" early return. Not-patched and correct are the same thing.
    ok(log && log.fourHPatchApplied === false && near(log.fourHAfter, LIVE_4H_CLOSE),
       '4: the 4H needed no patch — it already carried the resolved price 309.70');
  }

  section('5. Full render, 1D store current — the legitimate same-session parity still works');
  {
    newCycle();
    sandbox._isRegular = false;
    sandbox.S.scanData = [];
    // The 07-30 bar now EXISTS in the 1D store, and the 4H carries a later print of it.
    const daily = expeDaily1D().concat([{ time: SESSION_TODAY.t, open: SESSION_TODAY.o,
      high: SESSION_TODAY.h, low: SESSION_TODAY.l, close: SESSION_TODAY.c, volume: 5400000 }]);
    const four = expe4H(true).concat([{ time: at(2026, 7, 30, 18, 0), open: 309.70,
      high: 312.40, low: 309.00, close: 311.40, volume: 900000 }]);
    await render('EXPE', daily, four, null);

    const last1D = lastOf(drawn('1d').candles);
    ok(sessOf(last1D) === SESSION_TODAY.date, '5: the last 1D bar is session ' + SESSION_TODAY.date);
    ok(near(last1D.close, 311.40), '5: its close DOES advance to the fresher same-session print 311.40');
    ok(near(last1D.open, 291.54), '5: its open remains the real session open 291.54 — never rewritten');
    ok(near(last1D.high, 312.40) && near(last1D.low, 290.64), '5: high/low remain the real session extremes');
    ok(near(lastOf(drawn('1d').candles).close, lastOf(drawn('4h').candles).close),
       '5: 1D == 4H — same-session parity is preserved by the guard, not broken by it');
    const log = priceLogs[priceLogs.length - 1];
    ok(log && log.dailyPatchApplied === true, '5: the diagnostic confirms the patch was APPLIED here');
  }

  section('6. Two consecutive sessions are never fused, whatever order they arrive in');
  {
    // Out-of-order arrival must not let the newer session\'s price reach the older bar.
    const outOfOrder = [
      { time: SESSION_TODAY.t, open: 291.54, high: 312.40, low: 290.64, close: 310.21 },
      { time: SESSION_PREV.t, open: 268.30, high: 272.60, low: 267.10, close: 270.85 },
    ];
    const sorted = sandbox._apexParityNormCandleArray(outOfOrder)
      .map((c) => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: 0 }));
    ok(sessOf(sorted[0]) === SESSION_PREV.date && sessOf(sorted[1]) === SESSION_TODAY.date,
       '6: normalization restores chronological order (07-29 then 07-30)');
    ok(sorted.length === 2, '6: the two sessions remain TWO candles — never merged into one');
    const p = sandbox.patchLastCandleWithLivePrice(sorted, 311.40, SESSION_TODAY.date);
    ok(near(lastOf(p).open, 291.54) && near(lastOf(p).close, 311.40),
       '6: the price lands on the 07-30 bar (open 291.54 preserved), not on the 07-29 bar');
    ok(near(p[0].open, 268.30) && near(p[0].close, 270.85), '6: the 07-29 bar is left completely untouched');
  }

  section('7. Timestamp unit / shape does not change the session verdict');
  {
    const ms = SESSION_PREV.t, sec = Math.round(ms / 1000), iso = new Date(ms).toISOString();
    ok(sessOf({ time: ms }) === SESSION_PREV.date && sessOf({ time: sec }) === SESSION_PREV.date &&
       sessOf({ time: iso }) === SESSION_PREV.date && sessOf({ t: sec }) === SESSION_PREV.date,
       '7: epoch-ms, epoch-seconds, ISO string and the short `t` key all yield ' + SESSION_PREV.date);
    // The guard must behave identically across all four shapes.
    const shapes = [
      [{ time: ms, open: 268.30, high: 272.60, low: 267.10, close: 270.85 }],
      [{ time: sec, open: 268.30, high: 272.60, low: 267.10, close: 270.85 }],
      [{ time: iso, open: 268.30, high: 272.60, low: 267.10, close: 270.85 }],
    ];
    const blocked = shapes.every((a) => sandbox.patchLastCandleWithLivePrice(a, LIVE_4H_CLOSE, SESSION_TODAY.date) === a);
    ok(blocked, '7: a cross-session price is blocked for ms, seconds AND ISO timestamps alike');
    const allowed = shapes.every((a) => sandbox.patchLastCandleWithLivePrice(a, 271.50, SESSION_PREV.date) !== a);
    ok(allowed, '7: a same-session price is allowed for all three shapes');
  }

  section('8. Session boundaries: America/New_York, DST-correct, no fixed UTC offset');
  {
    // 20:00 ET is already the next UTC day, but the SAME trading session.
    ok(sessOf({ time: Date.UTC(2026, 6, 31, 0, 0) }) === '2026-07-30',
       '8: EDT — 2026-07-30 20:00 ET (00:00 UTC on 07-31) is still session 2026-07-30');
    ok(sessOf({ time: Date.UTC(2026, 2, 7, 1, 0) }) === '2026-03-06',
       '8: EST — 2026-03-06 20:00 ET (01:00 UTC on 03-07) is still session 2026-03-06');
    // The ET midnight boundary moves with DST: 05:00 UTC in EST, 04:00 UTC in EDT.
    ok(sessOf({ time: Date.UTC(2026, 0, 15, 5, 0) }) === '2026-01-15' &&
       sessOf({ time: Date.UTC(2026, 0, 15, 4, 59) }) === '2026-01-14',
       '8: EST midnight boundary sits at 05:00 UTC');
    ok(sessOf({ time: Date.UTC(2026, 6, 15, 4, 0) }) === '2026-07-15' &&
       sessOf({ time: Date.UTC(2026, 6, 15, 3, 59) }) === '2026-07-14',
       '8: EDT midnight boundary sits at 04:00 UTC — a hardcoded offset could not do both');
    // US/EU DST misalignment window (EU on summer time from 03-29, US from 03-08).
    ok(sessOf({ time: Date.UTC(2026, 2, 26, 13, 30) }) === '2026-03-26',
       '8: inside the US/EU DST misalignment window the ET session date is still correct');
    // Session-crossing pairs must never be treated as one bucket.
    const friday = [{ time: Date.UTC(2026, 6, 24, 13, 30), open: 260, high: 262, low: 259, close: 261 }];
    ok(sandbox.patchLastCandleWithLivePrice(friday, 309.70, '2026-07-27') === friday,
       '8: a Monday price is refused by a Friday bar (weekend gap is not a same-session upsert)');
  }

  section('9. Market holidays / early closes / weekends are honoured by the session helper');
  {
    const S = sandbox.getUsEquityMarketSession;
    // The stub above shadows the real helper in this sandbox, so call the real one directly.
    const real = vm.runInContext('getUsEquityMarketSession', sandbox);
    // 2026-07-04 falls on a Saturday, so Independence Day is OBSERVED on Friday 07-03: a full
    // closure, not an early close. The helper must classify it that way.
    const july3_2026 = real(Date.UTC(2026, 6, 3, 17, 0));  // Fri 2026-07-03, 13:00 ET
    ok(july3_2026.isHoliday === true && july3_2026.isRegularSession === false,
       '9: 2026-07-03 is the OBSERVED Independence Day (07-04 is a Saturday) — a full closure');
    // 2025-07-04 is a Friday, so 07-03 (Thursday) IS the pre-holiday early close.
    const july3_2025 = real(Date.UTC(2025, 6, 3, 17, 0));  // Thu 2025-07-03, 13:00 ET
    ok(july3_2025.isEarlyClose === true && july3_2025.closeMinutesET === 780,
       '9: 2025-07-03 is an early close — the session ends 13:00 ET (780 min), not 16:00');
    // Christmas Eve 2026 is a Thursday → early close.
    const xmasEve = real(Date.UTC(2026, 11, 24, 17, 0));
    ok(xmasEve.isEarlyClose === true && xmasEve.closeMinutesET === 780,
       '9: Christmas Eve 2026 (a Thursday) is an early close at 13:00 ET');
    const xmas = real(Date.UTC(2026, 11, 25, 16, 0));
    ok(xmas.isHoliday === true && xmas.isRegularSession === false, '9: Christmas Day is a full closure');
    const thanksgivingFri = real(Date.UTC(2026, 10, 27, 17, 0));
    ok(thanksgivingFri.isEarlyClose === true, '9: the day after Thanksgiving is an early close');
    const sat = real(Date.UTC(2026, 6, 25, 17, 0));
    ok(sat.isRegularSession === false && /weekend/.test(sat.reason), '9: Saturday is not a regular session');
    const normal = real(Date.UTC(2026, 6, 30, 17, 0));    // Thu 2026-07-30, 13:00 ET
    ok(normal.isRegularSession === true && normal.openMinutesET === 570 && normal.closeMinutesET === 960,
       '9: an ordinary session runs 09:30 ET (570) → 16:00 ET (960)');
    // The window is half-open [09:30, 16:00): the closing print itself is not "in session".
    ok(real(Date.UTC(2026, 6, 30, 13, 30)).isRegularSession === true &&
       real(Date.UTC(2026, 6, 30, 13, 29)).isRegularSession === false,
       '9: 09:30 ET is IN session and 09:29 ET is not (pre-market excluded at the boundary)');
    ok(real(Date.UTC(2026, 6, 30, 19, 59)).isRegularSession === true &&
       real(Date.UTC(2026, 6, 30, 20, 0)).isRegularSession === false,
       '9: 15:59 ET is IN session and 16:00 ET is not (after-hours excluded at the boundary)');
    // The session helper installed in this context is the REAL calendar (the runInContext
    // declaration shadows the sandbox stub). Assert that fact deterministically, against a
    // PINNED instant — never against the wall clock: comparing S().isRegularSession to
    // sandbox._isRegular made this assertion pass only while the suite happened to run
    // outside the regular session, and fail once it ran during one.
    ok(typeof S === 'function' && S === real,
       '9: the helper these render cases resolve is the real calendar, not the sandbox stub');
    ok(S(Date.UTC(2026, 6, 30, 17, 0)).isRegularSession === true &&
       S(Date.UTC(2026, 6, 30, 23, 0)).isRegularSession === false,
       '9: and it answers deterministically for a pinned instant (clock-independent)');
  }

  section('10. Cross-symbol / cross-timeframe isolation of the guard');
  {
    // A price resolved for one symbol cannot be laundered into another symbol's bar just
    // because the session matches: the caller resolves per symbol, and the guard is per bar.
    const aDaily = [{ time: SESSION_PREV.t, open: 268.30, high: 272.60, low: 267.10, close: 270.85 }];
    const bDaily = [{ time: SESSION_TODAY.t, open: 291.54, high: 312.40, low: 290.64, close: 310.21 }];
    ok(sandbox.patchLastCandleWithLivePrice(aDaily, 309.70, SESSION_TODAY.date) === aDaily,
       '10: a 07-30 price cannot enter a 07-29 bar');
    ok(sandbox.patchLastCandleWithLivePrice(bDaily, 270.85, SESSION_PREV.date) === bDaily,
       '10: and a 07-29 price cannot enter a 07-30 bar (the guard is symmetric)');
    // Timeframes are independent: the same resolved price is evaluated per series.
    const aligned = sandbox._swingPreparePriceAlignedCandles('EXPE', expeDaily1D(), expe4H(true));
    ok(aligned.sessions.daily === SESSION_PREV.date && aligned.sessions.fourH === SESSION_TODAY.date,
       '10: within ONE render cycle the helper reports each series\' own final-bar session');
    ok(aligned.applied.daily === false,
       '10: the lagging 1D is refused — the decision is made per series, not once for the cycle');
    ok(near(lastOf(aligned.fourHCandles).close, LIVE_4H_CLOSE) &&
       near(lastOf(aligned.dailyCandles).close, SESSION_PREV.c),
       '10: so the 4H ends on 309.70 (its own session) while the 1D ends on 270.85 (its own session)');
    // The same price, evaluated against a 07-30 daily bar, IS accepted — the per-series
    // decision tracks the bar, never the timeframe.
    const withToday = expeDaily1D().concat([{ time: SESSION_TODAY.t, open: SESSION_TODAY.o,
      high: SESSION_TODAY.h, low: SESSION_TODAY.l, close: 300.00, volume: 1 }]);
    const aligned2 = sandbox._swingPreparePriceAlignedCandles('EXPE', withToday, expe4H(true));
    ok(aligned2.applied.daily === true && near(lastOf(aligned2.dailyCandles).close, LIVE_4H_CLOSE) &&
       near(lastOf(aligned2.dailyCandles).open, SESSION_TODAY.o),
       '10: with a 07-30 daily bar present the SAME price is accepted (close 309.70, open 291.54 kept)');
  }

  section('11. Weekly aggregation is not re-patched, and the backend weekly is week-scoped');
  {
    // The weekly returned by the shared helper must be a pure aggregation of the (guarded)
    // daily — reproducible from its sources, with no extra price written into it.
    const aligned = sandbox._swingPreparePriceAlignedCandles('EXPE', expeDaily1D(), expe4H(true));
    const expected = sandbox._swingDeriveWeeklyCandles(aligned.dailyCandles);
    const w = aligned.weeklyCandles, e = expected;
    ok(w.length === e.length, '11: the weekly bar count equals a fresh aggregation of the guarded daily');
    const identical = w.every((c, i) => near(c.open, e[i].open) && near(c.high, e[i].high) &&
                                        near(c.low, e[i].low) && near(c.close, e[i].close));
    ok(identical, '11: every weekly bar is exactly reduce(ordered daily sources) — no re-patch residue');
    // OHLC aggregation rules on the final weekly bucket.
    const lastW = lastOf(w);
    const wkKey = sandbox._swingWeekBucket(sandbox._swingCandleTimeMs(lastW));
    const members = aligned.dailyCandles.filter((c) => sandbox._swingWeekBucket(sandbox._swingCandleTimeMs(c)) === wkKey);
    ok(members.length >= 1, '11: the final weekly bucket has ' + members.length + ' daily source(s)');
    ok(near(lastW.open, members[0].open), '11: weekly open = open of the chronologically FIRST source');
    ok(near(lastW.close, members[members.length - 1].close), '11: weekly close = close of the LAST source');
    ok(near(lastW.high, Math.max.apply(null, members.map((c) => c.high))), '11: weekly high = max of source highs');
    ok(near(lastW.low, Math.min.apply(null, members.map((c) => c.low))), '11: weekly low = min of source lows');
    // Backend-served weekly: week-scoped, not session-scoped.
    const wkBar = [{ time: Date.UTC(2026, 6, 27, 13, 30), open: 280, high: 300, low: 275, close: 295 }];
    const inWeek = sandbox._swingPatchWeeklyWithSessionPrice(wkBar, 310.21, SESSION_TODAY.t);
    ok(inWeek !== wkBar && near(lastOf(inWeek).close, 310.21),
       '11: a Thu-07-30 price advances the Mon-07-27 weekly bar (same market week)');
    ok(near(lastOf(inWeek).open, 280), '11: and the weekly open is preserved');
    const laterWeek = sandbox._swingPatchWeeklyWithSessionPrice(wkBar, 310.21, Date.UTC(2026, 7, 4, 13, 30));
    ok(laterWeek === wkBar, '11: a price from a LATER week is refused');
    ok(sandbox._swingPatchWeeklyWithSessionPrice(wkBar, 310.21, null) === wkBar,
       '11: an unknown price session is refused (unprovable ⇒ no patch)');
  }

  section('12. OHLC invariants hold on every candle handed to the renderer');
  {
    let checked = 0; const bad = [];
    draws.forEach((d) => (d.candles || []).forEach((c, i) => {
      checked++;
      const o = +c.open, h = +c.high, l = +c.low, cl = +c.close;
      if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(cl)) { bad.push(d.wrapId + '#' + i + ' non-finite'); return; }
      if (h < o || h < cl || l > o || l > cl || h < l) bad.push(d.wrapId + '#' + i + ' OHLC order');
      if (c.volume != null && +c.volume < 0) bad.push(d.wrapId + '#' + i + ' negative volume');
    }));
    ok(checked > 0 && bad.length === 0,
       '12: ' + checked + ' drawn candles all finite with high>=open/close, low<=open/close, high>=low' +
       (bad.length ? ' — violations: ' + bad.slice(0, 3).join(', ') : ''));
    // Strictly increasing timestamps per drawn series.
    let monotonic = true;
    draws.forEach((d) => {
      const ts = (d.candles || []).map((c) => sandbox._swingCandleTimeMs(c));
      for (let i = 1; i < ts.length; i++) if (!(ts[i] > ts[i - 1])) monotonic = false;
    });
    ok(monotonic, '12: every drawn series has strictly increasing timestamps (no duplicate bucket)');
    // No drawn bar mixes sessions: an upsert only ever touched a bar of its own session.
    let hybrid = 0;
    draws.filter((d) => d.wrapId !== 'swing-chart-1w').forEach((d) => (d.candles || []).forEach((c) => {
      if (c.source === 'DXLink' && sessOf(c) !== SESSION_TODAY.date) hybrid++;
    }));
    ok(hybrid === 0, '12: no patched bar belongs to a session other than the resolved price\'s');
  }

  section('13. Legacy-safe: the guard is opt-in and never fabricates values');
  {
    const bar = [{ time: SESSION_PREV.t, open: 268.30, high: 272.60, low: 267.10, close: 270.85 }];
    ok(sandbox.patchLastCandleWithLivePrice(bar, 309.70) !== bar,
       '13: omitting the session argument keeps the previous behaviour (other chart surfaces untouched)');
    ok(bar[0].close === 270.85 && bar[0].open === 268.30, '13: the input array is never mutated');
    ok(sandbox.patchLastCandleWithLivePrice(bar, 0, SESSION_PREV.date) === bar, '13: price 0 is refused');
    ok(sandbox.patchLastCandleWithLivePrice(bar, -5, SESSION_PREV.date) === bar, '13: a negative price is refused');
    ok(sandbox.patchLastCandleWithLivePrice(bar, NaN, SESSION_PREV.date) === bar, '13: NaN is refused');
    ok(sandbox.patchLastCandleWithLivePrice([], 300, SESSION_PREV.date).length === 0, '13: an empty series is a no-op');
    ok(sandbox.patchLastCandleWithLivePrice(null, 300, SESSION_PREV.date) === null, '13: null input is a no-op');
    // An unusable timestamp must be treated as a MISMATCH, never as a pass.
    const noTs = [{ open: 1, high: 2, low: 0.5, close: 1.5 }];
    ok(sandbox.patchLastCandleWithLivePrice(noTs, 300, SESSION_PREV.date) === noTs,
       '13: a bar with no timestamp has no provable session, so the upsert is refused');
  }

  section('14. No new network / socket / provider introduced by the fix');
  {
    const src = ['_candleTradingSessionDate', 'patchLastCandleWithLivePrice', '_swingResolveRenderPrice',
                 '_swingPatchWeeklyWithSessionPrice', '_swingPreparePriceAlignedCandles']
      .map(fn).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    ok(!/\bfetch\s*\(/.test(src), '14: no fetch(');
    ok(!/new\s+WebSocket|dxlinkSubscribe|createSubscription/i.test(src), '14: no WebSocket / new subscription');
    ok(!/yahoo/i.test(src), '14: no Yahoo provider');
    ok(!/BACKEND\s*\+|\/dev\/market\/|\/scanner\//.test(src), '14: no new backend endpoint');
    ok(!/setInterval\s*\(|setTimeout\s*\(/.test(src), '14: no timer / retry / artificial delay');
    // The session verdict comes from the shared ET helper, not from a local offset.
    const sess = fn('_candleTradingSessionDate');
    ok(/_etDateStr/.test(sess), '14: the session date is derived through the shared _etDateStr (Intl, America/New_York)');
    ok(!/getTimezoneOffset|3600000\s*\*\s*5|18000000/.test(sess), '14: no browser-timezone read and no hardcoded UTC offset');
    // No EXPE-specific branch, no size clamp anywhere in the fix.
    const all = ['_candleTradingSessionDate', 'patchLastCandleWithLivePrice', '_swingResolveRenderPrice',
                 '_swingPatchWeeklyWithSessionPrice', '_swingPreparePriceAlignedCandles', '_swingRenderCharts'].map(fn).join('\n');
    ok(!/EXPE/.test(all), '14: no symbol-specific branch (no "EXPE" anywhere in the touched functions)');
    ok(!/Math\.abs\([^)]*open[^)]*\)\s*[<>]/.test(all) && !/bodyPct|maxBody|clampCandle/i.test(all),
       '14: no candle-size clamp and no percentage-move filter was introduced');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2B — PRICE/SESSION PROVENANCE (found by the PR review, fixed in this PR)
  // A session the code cannot PROVE must never be claimed, and the SWING path must
  // fail CLOSED rather than fall back to the unguarded primitive.
  // ═══════════════════════════════════════════════════════════════════════════
  section('18. The live DXLink mark may claim a session only if its OWN stamp proves it');
  {
    const daily = expeDaily1D().concat([{ time: SESSION_TODAY.t, open: SESSION_TODAY.o,
      high: SESSION_TODAY.h, low: SESSION_TODAY.l, close: SESSION_TODAY.c, volume: 5400000 }]);
    const NOW = at(2026, 7, 30, 13, 31);   // today, in session

    // The real getUsEquityMarketSession is loaded into this context (so it shadows the sandbox
    // stub); _dssResolvePrice calls it with NO argument, i.e. against the wall clock. Pin it
    // open for this section so the live-mark branch is actually exercised, then restore.
    const realSession = vm.runInContext('getUsEquityMarketSession', sandbox);
    sandbox.getUsEquityMarketSession = function () {
      return { isOpen: true, isRegularSession: true, isHoliday: false, isEarlyClose: false,
               openMinutesET: 570, closeMinutesET: 960, reason: 'regular session' };
    };

    // (a) UNSTAMPED row: the mark could have been captured in any earlier session, because the
    //     row keeps `price` indefinitely and only re-enriches during RTH. Unprovable ⇒ no upsert.
    sandbox._isRegular = true;
    sandbox.S.scanData = [{ ticker: 'EXPE', _priceSource: 'DXLink', price: '270.85',
                            bid: 270.8, ask: 270.9, candles: [{ c: 270.85 }] }]; // no _priceAt
    const rUnstamped = sandbox._swingResolveRenderPrice('EXPE', daily, [], NOW);
    ok(near(rUnstamped.price, 270.85) && rUnstamped.source === 'dxlink',
       '18a: the mark is still returned as the display price');
    ok(rUnstamped.sessionDate === null && rUnstamped.sessionMs === null,
       '18a: but its session is NULL — unprovable, never asserted from the clock');
    const alignedUnstamped = sandbox._swingPreparePriceAlignedCandles('EXPE', daily, [], NOW);
    ok(alignedUnstamped.applied.daily === false, '18a: so the upsert is SKIPPED (fail closed)');
    const bar = lastOf(alignedUnstamped.dailyCandles);
    ok(near(bar.open, 291.54) && near(bar.high, 312.40) && near(bar.low, 290.64) && near(bar.close, 310.21),
       '18a: today\'s bar keeps the real O 291.54 H 312.40 L 290.64 C 310.21 (was corrupted to C 270.85)');

    // (b) STAMPED in a PREVIOUS session: explicitly stale, must not claim today.
    sandbox.S.scanData = [{ ticker: 'EXPE', _priceSource: 'DXLink', price: '270.85',
                            bid: 270.8, ask: 270.9, _priceAt: at(2026, 7, 29, 19, 59),
                            candles: [{ c: 270.85 }] }];
    const rStale = sandbox._swingResolveRenderPrice('EXPE', daily, [], NOW);
    ok(rStale.sessionDate === null,
       '18b: a mark stamped in session 2026-07-29 cannot claim 2026-07-30');
    ok(sandbox._swingPreparePriceAlignedCandles('EXPE', daily, [], NOW).applied.daily === false,
       '18b: and its upsert is skipped');

    // (c) STAMPED in the CURRENT session: provable ⇒ the upsert proceeds, open preserved.
    sandbox.S.scanData = [{ ticker: 'EXPE', _priceSource: 'DXLink', price: '311.40',
                            bid: 311.3, ask: 311.5, _priceAt: at(2026, 7, 30, 13, 30),
                            candles: [{ c: 310.21 }] }];
    const rFresh = sandbox._swingResolveRenderPrice('EXPE', daily, [], NOW);
    ok(rFresh.sessionDate === SESSION_TODAY.date && rFresh.sessionMs === at(2026, 7, 30, 13, 30),
       '18c: a mark stamped today carries session 2026-07-30 taken from its OWN stamp');
    const alignedFresh = sandbox._swingPreparePriceAlignedCandles('EXPE', daily, [], NOW);
    ok(alignedFresh.applied.daily === true, '18c: the upsert proceeds');
    const b2 = lastOf(alignedFresh.dailyCandles);
    ok(near(b2.close, 311.40) && near(b2.open, 291.54),
       '18c: close advances to 311.40 and the real session open 291.54 is preserved');
    // price and sessionDate came from the SAME observation (the stamp, not the clock).
    ok(rFresh.sessionMs !== NOW, '18c: sessionMs is the observation stamp, NOT Date.now()');
    sandbox.getUsEquityMarketSession = realSession; // restore
    sandbox.S.scanData = [];
  }

  section('19. FAIL CLOSED — an unprovable price session skips the upsert, never runs unguarded');
  {
    // A last bar whose timestamp cannot be parsed has no provable session, so the resolver
    // finds no timestamped observation and sessionDate is null.
    const badTs = [
      { time: at(2026, 7, 28), open: 267.70, high: 270.20, low: 265.90, close: 269.40 },
      { time: 'not-a-timestamp', open: 268.30, high: 272.60, low: 267.10, close: 270.85 },
    ];
    sandbox._isRegular = false;
    sandbox.S.scanData = [{ ticker: 'X', _priceSource: 'RTH_CLOSE', price: '309.70', candles: [{ c: 309.70 }] }];
    const r = sandbox._swingResolveRenderPrice('X', badTs, [], at(2026, 7, 30, 13, 31));
    ok(r.sessionDate === null, '19: sessionDate is null when no timestamped observation exists');
    const aligned = sandbox._swingPreparePriceAlignedCandles('X', badTs, [], at(2026, 7, 30, 13, 31));
    ok(aligned.applied.daily === false && aligned.dailyCandles === badTs,
       '19: the series is returned by IDENTITY — the upsert did not run unguarded');
    ok(lastOf(aligned.dailyCandles).close === 270.85, '19: the served close is untouched');
    // Source-level proof the SWING path never hands a null session to the primitive.
    const prep = fn('_swingPreparePriceAlignedCandles').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    ok(/sessionDate\s*!=\s*null\s*\)\s*\?\s*_patch\(/.test(prep.replace(/\s+/g, ' ')) ||
       /\(sessionDate != null\) \? _patch\(/.test(prep.replace(/\s+/g, ' ')),
       '19: both _patch call sites are gated on a non-null sessionDate');
    const patchCalls = (prep.match(/_patch\(/g) || []).length;
    const gated = (prep.match(/sessionDate != null\) \? _patch\(/g) || []).length;
    ok(patchCalls === gated && patchCalls === 2,
       '19: EVERY _patch call in the SWING path is session-gated (' + gated + '/' + patchCalls + ')');
    sandbox.S.scanData = [];
  }

  section('20. Weekly week identity is anchored to the America/New_York trading date');
  {
    // Sunday 21:00 ET is already MONDAY in UTC. A raw-UTC week bucket puts it in the NEXT
    // market week; the ET-anchored bucket keeps it with the preceding Friday.
    const sunEve = Date.UTC(2026, 7, 3, 1, 0);    // Sun 2026-08-02 21:00 EDT
    const monOpen = Date.UTC(2026, 7, 3, 13, 30); // Mon 2026-08-03 09:30 EDT
    const friPrev = Date.UTC(2026, 6, 31, 13, 30); // Fri 2026-07-31 09:30 EDT
    ok(sandbox._swingWeekBucket(sunEve) === sandbox._swingWeekBucket(monOpen),
       '20: the raw-UTC bucket wrongly groups Sunday-ET with Monday');
    ok(sandbox._etWeekBucket(sunEve) === sandbox._etWeekBucket(friPrev) &&
       sandbox._etWeekBucket(sunEve) !== sandbox._etWeekBucket(monOpen),
       '20: the ET-anchored bucket groups it with the preceding Friday instead');
    ok(/_etWeekBucket\(/.test(fn('_swingPatchWeeklyWithSessionPrice')),
       '20: the weekly guard uses the ET-anchored bucket, not the raw-UTC one');
    // Month and year boundaries must not split a market week.
    ok(sandbox._etWeekBucket(Date.UTC(2026, 11, 31, 14, 30)) ===
       sandbox._etWeekBucket(Date.UTC(2027, 0, 1, 14, 30)),
       '20: Thu 2026-12-31 and Fri 2027-01-01 are the SAME market week (year boundary)');
    ok(sandbox._etWeekBucket(Date.UTC(2026, 6, 31, 13, 30)) !==
       sandbox._etWeekBucket(Date.UTC(2026, 7, 3, 13, 30)),
       '20: Fri 2026-07-31 and Mon 2026-08-03 are DIFFERENT market weeks (month boundary)');
    // A next-week price can never modify the previous week's bar.
    const prevWeekBar = [{ time: friPrev, open: 300, high: 320, low: 295, close: 315 }];
    ok(sandbox._swingPatchWeeklyWithSessionPrice(prevWeekBar, 999, monOpen) === prevWeekBar,
       '20: a Monday price is refused by the previous week\'s weekly bar');
    ok(sandbox._swingPatchWeeklyWithSessionPrice(prevWeekBar, 999, sunEve) !== prevWeekBar,
       '20: a Sunday-ET price of that same week IS accepted (ET week, not UTC week)');
    ok(prevWeekBar[0].close === 315, '20: the input weekly array is never mutated');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 3 — MULTI-SYMBOL PROOF TABLE
  // The audit must fail if ANY analysed candle contains a contribution from a
  // session other than its own. Three symbols, both store states, all timeframes.
  // ═══════════════════════════════════════════════════════════════════════════
  section('15. Multi-symbol proof — no analysed candle mixes trading sessions');
  {
    // Each symbol: a distinct price level and a distinct lag, so a shared accumulator or a
    // leaked cache entry between symbols would show up as a session mismatch.
    const SYMS = [
      { sym: 'EXPE', prevO: 268.30, prevC: 270.85, todayO: 291.54, todayC: 310.21, live: 309.70 },
      { sym: 'HII',  prevO: 198.40, prevC: 201.10, todayO: 214.75, todayC: 219.60, live: 218.85 },
      { sym: 'WKY',  prevO: 442.10, prevC: 447.85, todayO: 431.20, todayC: 425.40, live: 426.15 },
    ];
    const rows = [];
    let violations = 0;

    for (const S of SYMS) {
      for (const storeHasToday of [false, true]) {
        newCycle();
        sandbox._isRegular = false;
        sandbox.S.scanData = [];
        const daily = history(at(2026, 7, 28), 220).concat([
          { time: at(2026, 7, 28), open: S.prevO - 1, high: S.prevC + 1, low: S.prevO - 2, close: S.prevO, volume: 1000 },
          { time: SESSION_PREV.t, open: S.prevO, high: S.prevC + 2, low: S.prevO - 1.2, close: S.prevC, volume: 1960000 },
        ]).concat(storeHasToday
          ? [{ time: SESSION_TODAY.t,
               open: S.todayO,
               high: Math.max(S.todayO, S.todayC, S.live) + 2,
               low: Math.min(S.todayO, S.todayC, S.live) - 1,
               close: S.todayC, volume: 5400000 }]
          : []);
        const four = [];
        for (let i = 0; i < 58; i++) {
          const c = S.prevO - 8 + i * 0.15;
          four.push({ time: SESSION_PREV.t - (58 - i) * 4 * H_MS, open: c - 0.5, high: c + 0.8, low: c - 0.8, close: c, volume: 600000 });
        }
        // high/low must be derived from ALL of open, close and the live print — a gap-DOWN
        // fixture otherwise produces open > high. (The OHLC invariant asserted below is what
        // surfaced that; keep the fixture honest instead of relaxing the assertion.)
        const mid = (S.todayO + S.live) / 2;
        four.push({ time: at(2026, 7, 30, 13, 30), open: S.todayO,
                    high: Math.max(S.todayO, mid) + 3, low: Math.min(S.todayO, mid) - 1,
                    close: mid, volume: 3100000 });
        four.push({ time: at(2026, 7, 30, 17, 30), open: mid,
                    high: Math.max(mid, S.todayC, S.live) + 2, low: Math.min(mid, S.todayC, S.live) - 1,
                    close: S.live, volume: 2300000 });

        await render(S.sym, daily, four, null);

        for (const tf of ['1d', '4h', '1w']) {
          const d = drawn(tf);
          if (!d) continue;
          const bar = lastOf(d.candles);
          const barSess = sessOf(bar);
          // A patched bar (source 'DXLink') must belong to the resolved price's session.
          const aligned = sandbox._swingPreparePriceAlignedCandles(S.sym, daily, four);
          const priceSess = aligned.sessionDate;
          const wkMembers = (tf === '1w')
            ? aligned.dailyCandles.filter((c) => sandbox._swingWeekBucket(sandbox._swingCandleTimeMs(c)) === sandbox._swingWeekBucket(sandbox._swingCandleTimeMs(bar)))
            : null;
          const mixed = (tf !== '1w') && bar.source === 'DXLink' && barSess !== priceSess;
          const ohlcOk = bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open &&
                         bar.low <= bar.close && bar.high >= bar.low;
          if (mixed || !ohlcOk) violations++;
          rows.push({
            sym: S.sym, storeHasToday: storeHasToday ? 'yes' : 'no ', tf: tf.toUpperCase(),
            barSession: barSess, priceSession: priceSess,
            srcCount: wkMembers ? wkMembers.length : 1,
            first: wkMembers ? sessOf(wkMembers[0]) : barSess,
            last: wkMembers ? sessOf(wkMembers[wkMembers.length - 1]) : barSess,
            o: bar.open, h: bar.high, l: bar.low, c: bar.close,
            prov: bar.source || 'BACKEND', mixed: mixed, ohlcOk: ohlcOk,
          });
        }
      }
    }

    // Print the table the audit requires (session boundaries come from the real helper).
    console.log('\n  sym  store1D_hasToday  tf   barSession  priceSession  srcs first       last        open     high     low      close    prov     verdict');
    console.log('  ' + '─'.repeat(140));
    rows.forEach((r) => {
      const sess = vm.runInContext('getUsEquityMarketSession', sandbox)(
        r.barSession ? Date.parse(r.barSession + 'T17:00:00Z') : Date.now());
      console.log('  ' + r.sym.padEnd(5) + r.storeHasToday.padEnd(18) + r.tf.padEnd(5) +
        String(r.barSession).padEnd(12) + String(r.priceSession).padEnd(14) +
        String(r.srcCount).padEnd(5) + String(r.first).padEnd(12) + String(r.last).padEnd(12) +
        r.o.toFixed(2).padStart(8) + ' ' + r.h.toFixed(2).padStart(8) + ' ' +
        r.l.toFixed(2).padStart(8) + ' ' + r.c.toFixed(2).padStart(8) + '  ' +
        r.prov.padEnd(8) + ' ' + (r.mixed ? 'MIXED SESSIONS' : (r.ohlcOk ? 'ok' : 'OHLC BROKEN')) +
        '  [' + (sess.isEarlyClose ? 'early-close' : (sess.isHoliday ? 'holiday' : 'regular')) +
        ' ' + sess.openMinutesET + '→' + sess.closeMinutesET + ' ET]');
    });

    ok(rows.length === 18, '15: 3 symbols × 2 store states × 3 timeframes = 18 analysed candles (got ' + rows.length + ')');
    ok(violations === 0, '15: ZERO candles mix trading sessions or break the OHLC order (' + violations + ' violations)');
    // Cross-symbol isolation: every symbol keeps its own price level.
    const expeRows = rows.filter((r) => r.sym === 'EXPE' && r.tf === '4H');
    const hiiRows = rows.filter((r) => r.sym === 'HII' && r.tf === '4H');
    ok(expeRows.every((r) => near(r.c, 309.70)) && hiiRows.every((r) => near(r.c, 218.85)),
       '15: no cross-symbol contamination — EXPE stays 309.70 and HII stays 218.85');
    // A DOWN session is handled identically (the guard is not direction-aware).
    const wkyLag = rows.find((r) => r.sym === 'WKY' && r.tf === '1D' && r.storeHasToday === 'no ');
    ok(near(wkyLag.o, 442.10) && near(wkyLag.c, 447.85),
       '15: WKY (a gap-DOWN session) also keeps its own bar — the guard is direction-agnostic');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 4 — CONCURRENCY: a late response must never repaint the current chart
  // ═══════════════════════════════════════════════════════════════════════════
  section('16. Race conditions — stale symbol / timeframe responses are discarded');
  {
    const mkSeries = (lastClose, sessMs) => history(at(2026, 7, 28), 220)
      .concat([{ time: sessMs, open: lastClose - 3, high: lastClose + 2, low: lastClose - 4, close: lastClose, volume: 1000 }]);

    // (a) SLOW previous symbol, fast new symbol: the slow one must not draw.
    {
      newCycle();
      sandbox._isRegular = false;
      sandbox.S.scanData = [];
      const slow = mkSeries(270.85, SESSION_PREV.t);
      const fast = mkSeries(201.10, SESSION_PREV.t);
      let release;
      const gate = new Promise((r) => { release = r; });
      sandbox._swingGetChartCandles = async function (sym, tf) {
        if (sym === 'SLOW') { await gate; return { ok: true, candles: slow, count: slow.length, source: 'BACKEND', reason: null }; }
        return { ok: true, candles: fast, count: fast.length, source: 'BACKEND', reason: null };
      };
      const r1 = (sandbox.S.swing.chartRequestId = (sandbox.S.swing.chartRequestId || 0) + 1);
      sandbox.S.swing.selectedSymbol = 'SLOW';
      const p1 = vm.runInContext('_swingRenderCharts("SLOW", ' + r1 + ')', sandbox);
      // User navigates away before SLOW resolves (Prev/Next).
      const r2 = (sandbox.S.swing.chartRequestId = sandbox.S.swing.chartRequestId + 1);
      sandbox.S.swing.selectedSymbol = 'FAST';
      await vm.runInContext('_swingRenderCharts("FAST", ' + r2 + ')', sandbox);
      const drawsAfterFast = draws.length;
      release(); await p1;
      ok(draws.length === drawsAfterFast,
         '16a: the late SLOW response drew NOTHING after the symbol changed (' + drawsAfterFast + ' draws, unchanged)');
      ok(near(lastOf(drawn('1d').candles).close, 201.10),
         '16a: the 1D panel still shows the CURRENT symbol\'s series, not the late one');
    }

    // (b) Stale request generation for the SAME symbol (double load / retry after abort).
    {
      newCycle();
      const first = mkSeries(270.85, SESSION_PREV.t);
      const second = mkSeries(310.21, SESSION_TODAY.t);
      let release;
      const gate = new Promise((r) => { release = r; });
      // Only the FIRST generation's reads are held open; flipping the flag before the retry
      // starts lets the retry resolve immediately (gating by a call counter instead would
      // stall the retry too and deadlock the test).
      let gateOpen = true;
      sandbox._swingGetChartCandles = async function () {
        if (gateOpen) { await gate; return { ok: true, candles: first, count: first.length, source: 'BACKEND', reason: null }; }
        return { ok: true, candles: second, count: second.length, source: 'BACKEND', reason: null };
      };
      const rA = (sandbox.S.swing.chartRequestId = sandbox.S.swing.chartRequestId + 1);
      sandbox.S.swing.selectedSymbol = 'SAME';
      const pA = vm.runInContext('_swingRenderCharts("SAME", ' + rA + ')', sandbox);
      gateOpen = false;
      const rB = (sandbox.S.swing.chartRequestId = sandbox.S.swing.chartRequestId + 1); // retry supersedes
      await vm.runInContext('_swingRenderCharts("SAME", ' + rB + ')', sandbox);
      const afterB = draws.length;
      release(); await pA;
      ok(draws.length === afterB, '16b: the superseded generation for the SAME symbol drew nothing');
      ok(near(lastOf(drawn('1d').candles).close, 310.21), '16b: the retry\'s data is what remains on screen');
    }

    // (c) Guard freshness is re-checked AFTER the 1W fetch too (not only after 1D/4H).
    {
      const src = fn('_swingRenderCharts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      const checks = (src.match(/_swingIsLatestChartRequest\(/g) || []).length;
      ok(checks >= 2, '16c: the render re-validates the request generation ' + checks + '× (after 1D/4H AND after the 1W fetch)');
      const firstDraw = src.indexOf('_swingDrawOneChart(');
      const firstGuard = src.indexOf('_swingIsLatestChartRequest(');
      ok(firstGuard >= 0 && firstGuard < firstDraw, '16c: the first guard precedes the first draw');
    }

    // (d) The chart cache key carries BOTH symbol and timeframe — no cross-contamination.
    {
      const k = fn('_swingChartCacheKey').replace(/\/\/[^\n]*/g, '');
      ok(/symbol/.test(k) && /tf/.test(k), '16d: the chart cache key is composed of symbol AND timeframe');
      // Drive the real builder: distinct (symbol, timeframe) pairs must never collide, so a
      // 1D entry can never be served for a 4H request or for another symbol.
      vm.runInContext(fn('_swingChartCacheKey'), sandbox);
      const K = sandbox._swingChartCacheKey;
      const keys = [K('EXPE', '1D'), K('EXPE', '4H'), K('EXPE', '1W'), K('HII', '1D'), K('HII', '4H')];
      ok(new Set(keys).size === keys.length,
         '16d: 5 distinct (symbol, timeframe) pairs yield 5 distinct keys — no cache collision');
      ok(K('EXPE', '1D') === K('EXPE', '1D'), '16d: the key is stable for the same pair');
    }

    // (e) The alignment helper is PURE across repeated/concurrent use: same inputs, same
    //     outputs, and the inputs are never mutated (no shared accumulator between cycles).
    {
      const daily = expeDaily1D(), four = expe4H(true);
      const snapshot = JSON.stringify([lastOf(daily), lastOf(four)]);
      const a1 = sandbox._swingPreparePriceAlignedCandles('EXPE', daily, four);
      const a2 = sandbox._swingPreparePriceAlignedCandles('EXPE', daily, four);
      ok(JSON.stringify([lastOf(daily), lastOf(four)]) === snapshot,
         '16e: the input series are byte-identical after two alignment passes (no in-place mutation)');
      ok(near(lastOf(a1.dailyCandles).close, lastOf(a2.dailyCandles).close) &&
         a1.sessionDate === a2.sessionDate,
         '16e: repeated alignment is deterministic (no accumulator carried between cycles)');
      // Interleaving a different symbol between the two passes changes nothing.
      sandbox._swingPreparePriceAlignedCandles('OTHER', mkSeries(99.5, SESSION_TODAY.t), []);
      const a3 = sandbox._swingPreparePriceAlignedCandles('EXPE', daily, four);
      ok(near(lastOf(a3.dailyCandles).close, lastOf(a1.dailyCandles).close) && a3.sessionDate === a1.sessionDate,
         '16e: an interleaved other-symbol alignment does not perturb EXPE\'s result');
    }
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
