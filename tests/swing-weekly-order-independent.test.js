'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING weekly aggregation — ORDER INDEPENDENCE and ET week identity.
//
// THE DEFECT
//   _swingDeriveWeeklyCandles took a bucket's `open` (and the weekly timestamp) from
//   the FIRST ARRAY ELEMENT and its `close` from the LAST one, without ever sorting
//   the daily sources — the trailing `order.sort(...)` sorts the WEEK KEYS only. That
//   is correct solely when the caller hands over an already chronological array, and
//   it does not: _apexParityNormCandleArray sorts, but the CACHE_FALLBACK branch
//   (_swingReadCachedCandles → the scanner's own series) does not, and neither do
//   _swingReadCachedCandles or _swingGetCandles themselves.
//
//   Delivering ONE market week as Fri, Mon, Wed, Tue, Thu produced:
//       open  271.30  (the FRIDAY open)    instead of 260.00 (Monday)
//       close 271.10  (the THURSDAY close) instead of 269.40 (Friday)
//       stamp 2026-07-31                   instead of 2026-07-27
//   Three different weekly bars for the same five sessions, depending on arrival order.
//
//   Three further defects in the same reduction:
//     • the week was keyed on the raw UTC day, so an instant that has rolled over in
//       UTC while the ET date has not (Sunday 21:00 ET is Monday in UTC) landed in the
//       following market week;
//     • `(t < 1e12) ? t*1000 : t` mis-handled ISO strings — the comparison is false, so
//       the raw string became the bucket key and the week SPLIT into extra bars;
//     • a session delivered twice had its volume counted twice and its OHLC merged.
//
// THE CONTRACT PINNED HERE
//   Sources are sorted chronologically inside each bucket, on a copy; open comes from
//   the chronologically FIRST session and close from the LAST; high/low are the week
//   extremes; volume sums one contribution per session. The week is the America/New_York
//   trading week via _etWeekBucket — the canonical ET helper already in the repo, reused,
//   not reimplemented. Timestamps normalise through the shared _swingCandleTimeMs.
//
// Deterministic and fully offline: no network, no clock dependence, no live data.
//
// Run: node tests/swing-weekly-order-independent.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const { loadAppJavaScriptSource, extractFunctionSource } = require('./lib/load-app-source');

const SRC = loadAppJavaScriptSource();
const fn = (name) => extractFunctionSource(name, { source: SRC });

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── Sandbox ──────────────────────────────────────────────────────────────────
const weeklyDiag = [];
const sandbox = {
  console: { log: function (a, b) { if (a === '[SWING][WEEKLY]') weeklyDiag.push(b); },
             warn: function () {}, error: function () {} },
  JSON, Object, String, Math, Number, isFinite, parseFloat, parseInt, NaN, Array, Date, Intl,
};
vm.createContext(sandbox);
vm.runInContext([
  '_etMinutes', '_etDateStr', '_backendCandleStoreChartNormTime', '_candleTradingSessionDate',
  '_swingCandleTimeMs', '_swingWeekBucket', '_etWeekBucket',
  '_swingLogWeeklySource', '_swingDeriveWeeklyCandles',
].map(fn).join('\n'), sandbox);

// The PRE-FIX reduction, transcribed from the commit before this one. Used ONLY to
// demonstrate the defect in the same run as the fix, so the regression stays pinned
// regardless of git state — never to produce an expected value.
function LEGACY_DERIVE_WEEKLY(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return [];
  const weeks = {}, order = [];
  for (let i = 0; i < daily.length; i++) {
    const c = daily[i];
    if (!c) continue;
    const t = (c.time != null) ? c.time : c.t;
    const close = (c.close != null) ? c.close : c.c;
    if (t == null || close == null || !isFinite(close)) continue;
    const ms = (t < 1e12) ? t * 1000 : t;
    const open = (c.open != null) ? c.open : (c.o != null ? c.o : close);
    const high = (c.high != null) ? c.high : (c.h != null ? c.h : close);
    const low = (c.low != null) ? c.low : (c.l != null ? c.l : close);
    const vol = (c.volume != null) ? c.volume : (c.v != null ? c.v : 0);
    const key = sandbox._swingWeekBucket(ms);
    if (!weeks[key]) { weeks[key] = { time: ms, open, high, low, close, volume: vol || 0 }; order.push(key); }
    else {
      const w = weeks[key];
      if (high != null && (w.high == null || high > w.high)) w.high = high;
      if (low != null && (w.low == null || low < w.low)) w.low = low;
      w.close = close;
      w.volume = (w.volume || 0) + (vol || 0);
    }
  }
  order.sort((a, b) => a - b);
  return order.map((k) => weeks[k]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// A UTC instant for a given America/New_York wall clock, found by probing the offset so
// every fixture is correct in EST and EDT alike (no hardcoded offset in this suite).
function et(y, m, d, hh, mm) {
  for (const off of [4, 5]) {
    const t = Date.UTC(y, m - 1, d, hh + off, mm || 0);
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date(t));
    let H = 0, M = 0; p.forEach((x) => { if (x.type === 'hour') H = +x.value; if (x.type === 'minute') M = +x.value; });
    if ((H === 24 ? 0 : H) === hh && M === (mm || 0)) return t;
  }
  return Date.UTC(y, m - 1, d, hh, mm || 0);
}
// One daily bar stamped at 09:30 ET of that session.
const bar = (y, m, d, o, h, l, c, v) => ({ time: et(y, m, d, 9, 30), open: o, high: h, low: l, close: c, volume: (v == null ? 0 : v) });
const sess = (ms) => sandbox._etDateStr(ms);
const W = (arr) => sandbox._swingDeriveWeeklyCandles(arr);
const sig = (b) => [b.open, b.high, b.low, b.close, b.volume, b.time].join('|');
// Every permutation of a small array, so "order independence" is proven exhaustively.
function permutations(a) {
  if (a.length <= 1) return [a];
  const out = [];
  a.forEach((x, i) => permutations(a.slice(0, i).concat(a.slice(i + 1))).forEach((p) => out.push([x].concat(p))));
  return out;
}

// The canonical market week used by most cases: Mon 2026-07-27 … Fri 2026-07-31.
const MON = bar(2026, 7, 27, 260.00, 264.00, 259.00, 263.00, 1000); // week LOW 259.00
const TUE = bar(2026, 7, 28, 263.20, 266.00, 262.00, 265.50, 1100);
const WED = bar(2026, 7, 29, 265.60, 268.00, 261.00, 267.20, 1200);
const THU = bar(2026, 7, 30, 267.40, 272.00, 266.00, 271.10, 1300); // week HIGH 272.00
const FRI = bar(2026, 7, 31, 271.30, 271.90, 268.00, 269.40, 1400);
const WEEK = [MON, TUE, WED, THU, FRI];
const EXPECT = { open: 260.00, high: 272.00, low: 259.00, close: 269.40, volume: 6000, session: '2026-07-27' };

(function () {
  // ═══════════════════════════════════════════════════════════════════════════
  section('1. THE CENTRAL CASE — Fri, Mon, Wed, Tue, Thu must give Monday open / Friday close');
  {
    const shuffled = [FRI, MON, WED, TUE, THU];

    // BEFORE — the pre-fix reduction on the same input.
    const before = LEGACY_DERIVE_WEEKLY(shuffled)[0];
    ok(before.open === 271.30 && before.close === 271.10 && sess(before.time) === '2026-07-31',
       '1 BEFORE: the old reduction gave O 271.30 (Friday) / C 271.10 (Thursday), stamped 2026-07-31');

    // AFTER — the real function.
    const w = W(shuffled);
    ok(w.length === 1, '1: the five sessions form ONE weekly bar');
    const b = w[0];
    ok(b.open === EXPECT.open, '1: open  = 260.00 — the MONDAY open (chronologically first)');
    ok(b.close === EXPECT.close, '1: close = 269.40 — the FRIDAY close (chronologically last)');
    ok(b.high === EXPECT.high, '1: high  = 272.00 — the week maximum');
    ok(b.low === EXPECT.low, '1: low   = 259.00 — the week minimum');
    ok(b.volume === EXPECT.volume, '1: volume = 6000 — the sum of the five sessions');
    ok(sess(b.time) === EXPECT.session, '1: stamped 2026-07-27 — the week\'s first session');
    ok(before.open !== b.open && before.close !== b.close,
       '1: BEFORE and AFTER differ on the SAME input — the regression is pinned');
  }

  section('2. Order independence — ALL 120 permutations give a byte-identical weekly');
  {
    const perms = permutations(WEEK);
    const results = new Set(perms.map((p) => sig(W(p)[0])));
    ok(perms.length === 120, '2: 120 permutations generated');
    ok(results.size === 1, '2: all 120 produce ONE distinct weekly bar (got ' + results.size + ')');
    const b = W(WEEK)[0];
    ok(results.has(sig(b)), '2: and it is the contract-correct bar');
    // The old code did not have this property.
    const legacyResults = new Set(perms.map((p) => sig(LEGACY_DERIVE_WEEKLY(p)[0])));
    ok(legacyResults.size > 1,
       '2: the old reduction produced ' + legacyResults.size + ' distinct bars for the same 120 permutations');
    // Named orders called out in the audit.
    const named = [
      ['ordered', WEEK],
      ['fully reversed', WEEK.slice().reverse()],
      ['partially out of order', [MON, WED, TUE, THU, FRI]],
      ['last first', [FRI, MON, TUE, WED, THU]],
    ];
    let bad = 0;
    named.forEach(([label, arr]) => { if (sig(W(arr)[0]) !== sig(b)) { bad++; console.log('        ' + label + ' diverged'); } });
    ok(bad === 0, '2: ordered / reversed / partially-unordered / last-first all agree byte-for-byte');
  }

  section('3. Short weeks — never assume five sessions');
  {
    // 8. four sessions (Monday holiday)   9. three sessions
    const monHoliday = [TUE, WED, THU, FRI];
    const w4 = W(monHoliday.slice().reverse())[0];
    ok(w4.open === 263.20 && w4.close === 269.40 && sess(w4.time) === '2026-07-28',
       '3: Monday holiday → open from TUESDAY 263.20, close from FRIDAY, stamped 2026-07-28');
    const friHoliday = [MON, TUE, WED, THU];
    const wFri = W(friHoliday.slice().reverse())[0];
    ok(wFri.open === 260.00 && wFri.close === 271.10,
       '3: Friday holiday → open from MONDAY, close from THURSDAY 271.10');
    const three = [MON, WED, FRI];
    const w3 = W([FRI, MON, WED])[0];
    ok(w3.open === 260.00 && w3.close === 269.40 && w3.volume === 3600,
       '3: three sessions (mid-week holiday) → open Monday, close Friday, volume 3600');
    ok(W([THU])[0].open === 267.40 && W([THU])[0].close === 271.10,
       '3: a single-session week is valid (open == close bar of that session)');
    // A real mid-week closure: Thanksgiving 2026 (Thu 11-26) with an early-close Friday.
    const tg = [bar(2026, 11, 23, 100, 104, 99, 103, 10), bar(2026, 11, 24, 103, 106, 102, 105, 10),
                bar(2026, 11, 25, 105, 108, 104, 107, 10), bar(2026, 11, 27, 107, 110, 106, 109, 10)];
    const wTg = W(tg.slice().reverse())[0];
    ok(wTg.open === 100 && wTg.close === 109 && wTg.volume === 40 && sess(wTg.time) === '2026-11-23',
       '3: Thanksgiving week (Thu shut, Fri early close) → 4 sessions, open Mon, close Fri');
  }

  section('4. Month and year boundaries stay inside one market week');
  {
    // Mon 2026-08-31 … Fri 2026-09-04 spans a month change.
    const monthSpan = [bar(2026, 8, 31, 50, 54, 49, 53, 1), bar(2026, 9, 1, 53, 56, 52, 55, 1),
                       bar(2026, 9, 2, 55, 58, 54, 57, 1), bar(2026, 9, 3, 57, 60, 56, 59, 1),
                       bar(2026, 9, 4, 59, 61, 58, 60, 1)];
    const wm = W(monthSpan.slice().reverse());
    ok(wm.length === 1 && wm[0].open === 50 && wm[0].close === 60,
       '4: Mon 08-31 → Fri 09-04 is ONE week (open 50 from August, close 60 from September)');
    // Thu 2026-12-31 and Fri 2027-01-01 are the same market week.
    const yearSpan = [bar(2026, 12, 30, 10, 12, 9, 11, 1), bar(2026, 12, 31, 11, 14, 10, 13, 1),
                      bar(2027, 1, 1, 13, 15, 12, 14, 1)];
    const wy = W(yearSpan.slice().reverse());
    ok(wy.length === 1 && wy[0].open === 10 && wy[0].close === 14,
       '4: Wed 2026-12-30 → Fri 2027-01-01 is ONE week across the year boundary');
    // Two adjacent weeks stay separate and come out in chronological order.
    const twoWeeks = W([FRI, bar(2026, 8, 3, 300, 305, 299, 304, 1), MON]);
    ok(twoWeeks.length === 2 && sess(twoWeeks[0].time) === '2026-07-27' && sess(twoWeeks[1].time) === '2026-08-03',
       '4: two market weeks stay separate and are emitted oldest-first');
  }

  section('5. Week identity is the America/New_York trading week, not the UTC day');
  {
    const body = fn('_swingDeriveWeeklyCandles').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    ok(/_etWeekBucket\(/.test(body), '5: the aggregator keys the week on _etWeekBucket (the canonical ET helper)');
    ok(!/_swingWeekBucket\(/.test(body), '5: it no longer keys on the raw-UTC _swingWeekBucket');
    // Sunday 21:00 ET is already Monday in UTC.
    const sunEve = Date.UTC(2026, 7, 3, 1, 0);
    ok(sandbox._swingWeekBucket(sunEve) !== sandbox._etWeekBucket(sunEve),
       '5: the two helpers genuinely disagree for a Sunday-evening-ET instant');
    ok(sandbox._etWeekBucket(sunEve) === sandbox._etWeekBucket(et(2026, 7, 31, 9, 30)),
       '5: ET-anchored, it belongs to the week of Fri 2026-07-31');
    // A daily stamped at the session CLOSE (16:00 ET) must land in the same week as 09:30 ET.
    const closeStamped = { time: et(2026, 7, 31, 16, 0), open: 271.30, high: 271.90, low: 268.00, close: 269.40, volume: 1400 };
    const wc = W([MON, closeStamped]);
    ok(wc.length === 1 && wc[0].close === 269.40,
       '5: a Friday bar stamped 16:00 ET stays in the Monday-anchored week');
  }

  section('6. Timestamp shapes — seconds, milliseconds, ISO, short keys');
  {
    const toSec = (b) => Object.assign({}, b, { time: Math.round(b.time / 1000) });
    const toIso = (b) => Object.assign({}, b, { time: new Date(b.time).toISOString() });
    const toShort = (b) => ({ t: Math.round(b.time / 1000), o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume });
    const base = sig(W(WEEK)[0]);

    ok(sig(W(WEEK.map(toSec).reverse())[0]) === base, '6: epoch SECONDS give the identical weekly');
    ok(sig(W(WEEK.slice().reverse())[0]) === base, '6: epoch MILLISECONDS give the identical weekly');
    ok(sig(W(WEEK.map(toShort).reverse())[0]) === base, '6: SHORT-KEY {t,o,h,l,c,v} gives the identical weekly');

    // ISO used to break the bucket key: `(t < 1e12)` compares a string to a number, which
    // is NaN-false, so the raw STRING became the key. Every ISO bar hashed to the same NaN
    // bucket and the bar came out stamped with the string, reduced by array position.
    const isoWeek = WEEK.map(toIso);
    const legacyIso = LEGACY_DERIVE_WEEKLY(isoWeek)[0];
    ok(typeof legacyIso.time === 'string',
       '6 BEFORE: ISO input produced a bar stamped with the raw STRING (' + legacyIso.time + ')');
    ok(sig(LEGACY_DERIVE_WEEKLY(isoWeek)[0]) !== sig(LEGACY_DERIVE_WEEKLY(isoWeek.slice().reverse())[0]),
       '6 BEFORE: and it was order-dependent — reversing the ISO input changed the bar');
    // A mixed ISO + numeric array split the week outright.
    const legacyMixed = LEGACY_DERIVE_WEEKLY([toIso(MON), TUE]);
    ok(legacyMixed.length === 2, '6 BEFORE: one ISO bar among numeric ones SPLIT the week into 2 bars');
    const wIso = W(isoWeek.slice().reverse());
    ok(wIso.length === 1 && sig(wIso[0]) === base, '6: ISO strings now give ONE identical weekly bar');
    // Mixed shapes in one array.
    const mixed = [toIso(FRI), toSec(MON), toShort(WED), TUE, toSec(THU)];
    ok(sig(W(mixed)[0]) === base, '6: a MIXED array (ISO + seconds + short-key + ms) still gives the same bar');
  }

  section('7. Unusable sources are skipped, not bucketed as NaN');
  {
    weeklyDiag.length = 0;
    const badTs = W([Object.assign({}, MON, { time: 'nope' }), TUE, WED, THU, FRI]);
    ok(badTs.length === 1, '7: an unparseable timestamp does not create a second bar');
    ok(badTs[0].open === 263.20, '7: that session is skipped, so open comes from TUESDAY');
    ok(weeklyDiag.some((d) => d.reason === 'UNRESOLVABLE_TIMESTAMP'), '7: and it is diagnosed');
    ok(W([Object.assign({}, MON, { close: null })]).length === 0, '7: a null close is skipped');
    ok(W([Object.assign({}, MON, { close: NaN })]).length === 0, '7: a NaN close is skipped');
    ok(W([]).length === 0 && W(null).length === 0 && W(undefined).length === 0,
       '7: empty / null / undefined input returns [] and never throws');
    ok(W([null, undefined, MON]).length === 1, '7: null entries inside the array are skipped');
    // Negative or non-finite volume contributes 0 rather than poisoning the sum.
    const wv = W([Object.assign({}, MON, { volume: -5 }), Object.assign({}, TUE, { volume: NaN })]);
    ok(wv[0].volume === 0, '7: negative / NaN volume contributes 0 (no NaN weekly volume)');
  }

  section('8. Duplicate sessions — one contribution per session, no OHLC merge');
  {
    weeklyDiag.length = 0;
    // Exact duplicate: collapsed silently.
    const exact = W([MON, MON, TUE]);
    ok(exact[0].volume === 2100, '8: an exact duplicate session is counted ONCE (volume 2100, not 3100)');
    ok(LEGACY_DERIVE_WEEKLY([MON, MON, TUE])[0].volume === 3100,
       '8 BEFORE: the old reduction double-counted it (3100)');
    ok(exact[0].open === 260.00 && exact[0].close === 265.50, '8: and the OHLC is unaffected');

    // Same session, LATER timestamp → the later observation is authoritative.
    const later = Object.assign({}, MON, { time: et(2026, 7, 27, 16, 0), close: 262.00, volume: 1500 });
    const wLater = W([later, MON, TUE]);
    ok(wLater[0].volume === 1500 + 1100 && wLater[0].open === 260.00,
       '8: a later observation of the same session supersedes the earlier one (volume 2600)');

    // Same session, SAME timestamp, DIFFERENT OHLC → unprovable, session dropped.
    weeklyDiag.length = 0;
    const conflict = Object.assign({}, MON, { close: 999, volume: 9999 });
    const wConf = W([MON, conflict, TUE]);
    ok(wConf.length === 1 && wConf[0].open === 263.20 && wConf[0].volume === 1100,
       '8: an ambiguous duplicate (same ts, different OHLC) drops that session — fail closed');
    ok(weeklyDiag.some((d) => d.reason === 'AMBIGUOUS_DUPLICATE_SESSION' && d.session === '2026-07-27'),
       '8: and it is diagnosed with the session date');
    ok(!wConf.some((b) => b.close === 999), '8: the conflicting record is never merged in');
    // Dedup is order-independent too.
    const a = sig(W([MON, conflict, TUE])[0]), b2 = sig(W([TUE, conflict, MON])[0]);
    ok(a === b2, '8: the duplicate resolution does not depend on arrival order');
  }

  section('9. Immutability — the input array and its candles are never touched');
  {
    const input = [FRI, MON, WED, TUE, THU];
    const beforeJson = JSON.stringify(input);
    const beforeOrder = input.map((b) => sess(b.time)).join(',');
    const beforeRefs = input.slice();
    const out = W(input);
    ok(JSON.stringify(input) === beforeJson, '9: the input array is byte-identical after aggregation');
    ok(input.map((b) => sess(b.time)).join(',') === beforeOrder,
       '9: its ORDER is unchanged (no in-place sort) — still ' + beforeOrder.replace(/2026-/g, ''));
    ok(input.every((b, i) => b === beforeRefs[i]), '9: no element was replaced');
    ok(Object.keys(input[0]).join(',') === 'time,open,high,low,close,volume',
       '9: no property was added to a source candle');
    // Mutating the OUTPUT must not reach back into the input.
    out[0].open = 1; out[0].close = 1;
    ok(input.every((b) => b.open !== 1 && b.close !== 1), '9: the weekly bars are fresh objects');
    // Two runs over the same input produce independent objects.
    const w1 = W(input), w2 = W(input);
    ok(w1[0] !== w2[0] && sig(w1[0]) === sig(w2[0]), '9: repeated runs are independent yet identical');
  }

  section('10. Interaction with the session-identity and chart-cache work (PR A / PR E)');
  {
    vm.runInContext(['_swingPatchWeeklyWithSessionPrice', 'patchLastCandleWithLivePrice',
                     '_candleTradingSessionDate'].map(fn).join('\n'), sandbox);
    const weekly = W(WEEK);
    const lastBar = weekly[weekly.length - 1];
    // The weekly bar is stamped at the week's FIRST session, so the ET week guard still
    // recognises a price from any session of that same week.
    const thuPrice = et(2026, 7, 30, 12, 0);
    const patched = sandbox._swingPatchWeeklyWithSessionPrice(weekly, 275.00, thuPrice);
    ok(patched !== weekly && patched[patched.length - 1].close === 275.00,
       '10: a THURSDAY price still reaches the Monday-stamped weekly bar of that week');
    ok(patched[patched.length - 1].open === 260.00, '10: and the weekly open is preserved');
    // A price from the FOLLOWING week is still refused.
    const nextWeek = et(2026, 8, 3, 12, 0);
    ok(sandbox._swingPatchWeeklyWithSessionPrice(weekly, 999, nextWeek) === weekly,
       '10: a next-week price is still refused — the week-scoped guard is intact');
    ok(sandbox._swingPatchWeeklyWithSessionPrice(weekly, 999, null) === weekly,
       '10: an unknown price session is still refused');
    ok(lastBar.close === 269.40, '10: the guard did not mutate the derived weekly');
    // This PR must not touch the chart cache or the live-price primitive.
    const body = fn('_swingDeriveWeeklyCandles');
    ok(!/chartCache|fetchedAt|lastSessionDate|SWING_CHART_CACHE_TTL_MS/.test(body),
       '10: the aggregator does not touch the chart cache (PR E scope)');
    ok(!/patchLastCandleWithLivePrice|_swingResolveRenderPrice/.test(body),
       '10: nor the live-price patch (PR A scope)');
  }

  section('11. Scope — nothing outside the weekly aggregator was changed');
  {
    const body = fn('_swingDeriveWeeklyCandles');
    ok(!/_apexParityNormCandle|_swingReadCachedCandles/.test(body),
       '11: no CACHE_FALLBACK shape repair and no _apexParityNormCandle change (PR D scope)');
    ok(!/_buildRth4hCandles|timeframe=|BACKEND/.test(body),
       '11: no backend RTH / 4H aggregation (PR B scope)');
    ok(!/_drawCandleChart|computeCandleIndicators/.test(body),
       '11: no renderer and no indicator changes');
    ok(!/\bfetch\s*\(|setInterval|setTimeout/.test(body),
       '11: no fetch, no timer');
    ok(/\.slice\(\)\.sort\(/.test(body.replace(/\s+/g, '')) || /slice\(\)\s*\.\s*sort\(/.test(body),
       '11: the chronological sort runs on a COPY (no in-place sort of the caller\'s array)');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
