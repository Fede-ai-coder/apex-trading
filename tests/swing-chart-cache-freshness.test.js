'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING chart cache — FRESHNESS, TTL and INVALIDATION contract.
//
// THE DEFECT
//   S.swing.chartCache held { candles, origin } with no age and no session identity,
//   and had no TTL and no invalidation of any kind. The first series ever fetched for
//   a symbol|timeframe was served for the entire life of the page:
//
//     read #1 → BACKEND             lastSession = N-1   backendCalls = 1
//     read #2 → SWING_CHART_CACHE   lastSession = N-1   backendCalls = 1   ← network never retried
//
//   Once the session-identity guard (the preceding PR) stopped the current session's
//   price from being written into the previous session's bar, this turned a WRONG
//   candle into a FROZEN one: the chart could sit on the previous trading session
//   indefinitely while the backend already served the current one.
//
// THE CONTRACT PINNED HERE
//   Three INDEPENDENT facts, all checked:
//     • AGE of the response      → fetchedAt, bounded by SWING_CHART_CACHE_TTL_MS
//     • SESSION IN THE DATA      → lastSessionDate, from the newest CACHED candle,
//                                  via the America/New_York trading date
//     • SESSION OF THE MARKET    → _swingExpectedNewestSessionDate()
//   A response fetched two seconds ago is stale if it only holds the previous session.
//   Conversely, during pre-market yesterday IS the newest session in existence, so a
//   cache holding it is legitimately fresh and must not trigger a pointless refetch.
//
//   Staleness is a property of the DATA, not of its origin: a response straight off the
//   wire is still reported stale when its newest bar predates the session the market has
//   already produced.
//
// Every function under test is the REAL one, read out of the application source. Clocks
// are pinned via the injectable nowMs so the suite is deterministic and offline.
//
// Run: node tests/swing-chart-cache-freshness.test.js
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
const cacheDiag = [];
const sandbox = {
  console: { log: function (a, b) { if (a === '[SWING][CHART-CACHE]') cacheDiag.push(b); },
             warn: function () {}, error: function () {} },
  JSON, Object, String, Math, Number, isFinite, parseFloat, parseInt, NaN, Array,
  Promise, Date, setTimeout, Intl,
  S: { scanData: [], swing: { chartCache: {}, candidates: [] }, squeezeFireScanner: { chartCacheCandles: {} } },
};
vm.createContext(sandbox);
vm.runInContext('var _swingCandleInflight = {}; var _swingChartCacheSeq = {}; var _swingChartCacheAuthorizedSeq = {};', sandbox);
// The TTL is read from the application source, not hardcoded here, so the test tracks it.
const TTL = (function () {
  const m = SRC.match(/var\s+SWING_CHART_CACHE_TTL_MS\s*=\s*(\d+)/);
  if (!m) throw new Error('SWING_CHART_CACHE_TTL_MS not found in the application source');
  return Number(m[1]);
})();
vm.runInContext('var SWING_CHART_CACHE_TTL_MS = ' + TTL + ';', sandbox);
vm.runInContext([
  '_etMinutes', '_etDateStr', 'getUsEquityMarketSession', 'isRTHOpen',
  '_backendCandleStoreChartNormTime', '_candleTradingSessionDate', '_swingCandleTimeMs',
  '_swingReadCachedCandles', '_swingGetCandles', '_swingChartCacheKey',
  '_swingExpectedNewestSessionDate', '_swingSeriesSessionDate', '_swingChartCacheEvaluate',
  '_swingChartCacheBeginRequest', '_swingCloneCandleSeries',
  '_swingChartCachePut', '_swingInvalidateChartCacheEntry', '_swingInvalidateChartCacheSymbol',
  '_swingLogChartCache', '_swingBackendOutcome', '_swingGetChartCandles',
  '_swingPrefetchNeighbors',
].map(fn).join('\n'), sandbox);

// The PRE-PR-E read path, as it stood before the freshness contract. Used ONLY to
// demonstrate the defect in the same run as the fix (§4B), so the regression stays pinned
// without depending on git state. It is deliberately a faithful transcription: the entire
// old implementation was these ten lines.
async function LEGACY_CHART_CACHE_READ(symbol, tf) {
  const k = sandbox._swingChartCacheKey(symbol, tf);
  const hit = sandbox.S.swing.chartCache && sandbox.S.swing.chartCache[k];
  if (hit && hit.candles && hit.candles.length) {
    return { ok: true, candles: hit.candles, count: hit.candles.length, reason: null,
             source: hit.origin === 'prefetch' ? 'PREFETCH_CACHE' : 'SWING_CHART_CACHE' };
  }
  const res = await sandbox._swingGetCandles(symbol, tf);
  if (res && res.ok && res.candles && res.candles.length) {
    sandbox.S.swing.chartCache[k] = { candles: res.candles, origin: 'backend' };
  }
  return res;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAY = 86400000;
// A UTC instant for a given America/New_York wall clock, found by probing the offset so the
// fixture is correct in both EST and EDT (no hardcoded offset anywhere in this suite).
function et(y, m, d, hh, mm) {
  for (const off of [4, 5]) {
    const t = Date.UTC(y, m - 1, d, hh + off, mm || 0);
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date(t));
    let H = 0, M = 0; p.forEach((x) => { if (x.type === 'hour') H = +x.value; if (x.type === 'minute') M = +x.value; });
    if ((H === 24 ? 0 : H) === hh && M === (mm || 0)) return t;
  }
  return Date.UTC(y, m - 1, d, hh, mm || 0);
}
// n daily bars whose LAST bar sits on `lastSessMs`.
function series(lastSessMs, lastClose, n) {
  const out = [];
  for (let i = 0; i < (n || 25); i++) {
    const c = 250 + i * 0.4;
    out.push({ time: lastSessMs - ((n || 25) - 1 - i) * DAY, open: c - 0.4, high: c + 0.9,
               low: c - 0.9, close: (i === (n || 25) - 1 ? lastClose : c), volume: 0 });
  }
  return out;
}
const sessOf = (arr) => sandbox._swingSeriesSessionDate(arr);
const key = (s, tf) => sandbox._swingChartCacheKey(s, tf);
const lastOf = (a) => (a && a.length ? a[a.length - 1] : null);
// The cached ARRAY for a key (not the entry) — used by the immutability proofs.
const cached = (s, tf) => (sandbox.S.swing.chartCache[key(s, tf)] || {}).candles;
function resetCache() { sandbox.S.swing.chartCache = {}; cacheDiag.length = 0; }
function entryFor(symbol, tf, lastSessMs, fetchedAt, origin) {
  const c = series(lastSessMs, 300, 25);
  return { candles: c, origin: origin || 'backend', symbol: symbol, timeframe: tf,
           fetchedAt: fetchedAt, lastSessionDate: sessOf(c), lastCandleTs: c[c.length - 1].time };
}
// Controllable backend reader (the seam _swingGetCandles uses).
let backendCalls = 0, backendImpl = null;
sandbox._sfsFetchBackendCandles = async function (sym, tf) { backendCalls++; return backendImpl(sym, tf); };
const serveOk = (arr) => async () => ({ ok: true, candles: arr, count: arr.length, reason: null });
const serveFail = (reason) => async () => ({ ok: false, status: 0, count: 0, reason: reason });

// Fixed reference clocks.
const RTH   = et(2026, 7, 30, 12, 0);   // Thu, in session      → expected newest 2026-07-30
const PRE   = et(2026, 7, 30, 7, 39);   // Thu, pre-market      → expected newest 2026-07-29
const AH    = et(2026, 7, 30, 16, 30);  // Thu, after-hours     → expected newest 2026-07-30
const SAT   = et(2026, 8, 1, 12, 0);    // Sat                  → expected newest 2026-07-31
const SESS_PREV = et(2026, 7, 29, 9, 30);
const SESS_CUR  = et(2026, 7, 30, 9, 30);

(async () => {
  // ═══════════════════════════════════════════════════════════════════════════
  section('1. Entry schema — age AND data session are both recorded');
  {
    resetCache();
    const arr = series(SESS_CUR, 310.21, 25);
    const decision = sandbox._swingChartCachePut('EXPE', '1D', arr, 'backend', RTH);
    const e = sandbox.S.swing.chartCache[key('EXPE', '1D')];
    ok(decision === 'CACHE_WRITTEN', '1: a valid series is written (' + decision + ')');
    ok(e.symbol === 'EXPE' && e.timeframe === '1D', '1: entry carries its own symbol + timeframe identity');
    ok(e.fetchedAt === RTH, '1: entry records fetchedAt (the response observation time)');
    ok(e.lastSessionDate === '2026-07-30', '1: entry records lastSessionDate derived FROM THE DATA');
    ok(e.lastCandleTs === arr[arr.length - 1].time, '1: entry records the newest candle timestamp');
    ok(e.origin === 'backend', '1: entry records its origin');
    // lastSessionDate must come from the candles, never from the clock.
    const past = sandbox._swingChartCachePut('OLD', '1D', series(SESS_PREV, 270.85, 25), 'backend', RTH);
    ok(past === 'CACHE_WRITTEN' &&
       sandbox.S.swing.chartCache[key('OLD', '1D')].lastSessionDate === '2026-07-29',
       '1: a series holding the PREVIOUS session is stamped 2026-07-29 even when written now');
  }

  section('2. Expected-newest-session policy across the market calendar');
  {
    const cases = [
      ['pre-market  Thu 07:39 ET', PRE, '2026-07-29'],
      ['just before open 09:29 ET', et(2026, 7, 30, 9, 29), '2026-07-29'],
      ['at the open  09:30 ET', et(2026, 7, 30, 9, 30), '2026-07-30'],
      ['in session   12:00 ET', RTH, '2026-07-30'],
      ['after-hours  16:30 ET', AH, '2026-07-30'],
      ['overnight    20:30 ET', et(2026, 7, 30, 20, 30), '2026-07-30'],
      ['Saturday', SAT, '2026-07-31'],
      ['Sunday', et(2026, 8, 2, 12, 0), '2026-07-31'],
      ['Monday pre-market', et(2026, 8, 3, 8, 0), '2026-07-31'],
      ['observed holiday (Fri 2026-07-03)', et(2026, 7, 3, 12, 0), '2026-07-02'],
      ['day after a holiday', et(2026, 7, 6, 10, 0), '2026-07-06'],
      ['early close, after its 13:00 ET close', et(2026, 11, 27, 13, 30), '2026-11-27'],
      ['early close, before open (Thanksgiving Thu 11-26 shut)', et(2026, 11, 27, 9, 0), '2026-11-25'],
      ['New Year holiday (Fri 2027-01-01)', et(2027, 1, 1, 12, 0), '2026-12-31'],
      ['first session after US DST switch', et(2026, 3, 9, 10, 0), '2026-03-09'],
      ['inside the US/EU DST misalignment window', et(2026, 3, 26, 10, 0), '2026-03-26'],
    ];
    let bad = 0;
    for (const [label, t, want] of cases) {
      const got = sandbox._swingExpectedNewestSessionDate(t);
      if (got !== want) { bad++; console.log('        ' + label + ': want ' + want + ' got ' + got); }
    }
    ok(bad === 0, '2: all ' + cases.length + ' calendar clocks resolve to the right newest session (' + bad + ' wrong)');
    // Weekends and holidays are never reported as the newest session.
    ok(sandbox._swingExpectedNewestSessionDate(SAT) === '2026-07-31',
       '2: Saturday reports Friday, not Saturday');
    ok(sandbox._swingExpectedNewestSessionDate(et(2026, 7, 3, 12, 0)) === '2026-07-02',
       '2: an observed holiday reports the previous trading day');
  }

  section('3. Freshness decision matrix');
  {
    const rows = [
      ['current session, 30s old, RTH',        entryFor('E', '1D', SESS_CUR,  RTH - 30000),      RTH, 'CACHE_HIT_FRESH'],
      ['PREVIOUS session, 2s old, RTH',        entryFor('E', '1D', SESS_PREV, RTH - 2000),       RTH, 'CACHE_SESSION_MISMATCH'],
      ['current session, TTL+1 old',           entryFor('E', '1D', SESS_CUR,  RTH - TTL - 1),    RTH, 'CACHE_EXPIRED'],
      ['current session, exactly at TTL',      entryFor('E', '1D', SESS_CUR,  RTH - TTL),        RTH, 'CACHE_HIT_FRESH'],
      ['previous session, PRE-MARKET',         entryFor('E', '1D', SESS_PREV, PRE - 30000),      PRE, 'CACHE_HIT_FRESH'],
      ['previous session, AFTER-HOURS',        entryFor('E', '1D', SESS_PREV, AH - 30000),       AH,  'CACHE_SESSION_MISMATCH'],
      ['Friday session, Saturday, 30s old',    entryFor('E', '1D', et(2026, 7, 31, 9, 30), SAT - 30000), SAT, 'CACHE_HIT_FRESH'],
      ['Friday session, Saturday, 1h old',     entryFor('E', '1D', et(2026, 7, 31, 9, 30), SAT - 3600000), SAT, 'CACHE_EXPIRED'],
      ['no entry',                             null,                                            RTH, 'CACHE_MISS'],
    ];
    let bad = 0;
    for (const [label, entry, now, want] of rows) {
      const v = sandbox._swingChartCacheEvaluate(entry, 'E', '1D', now);
      const good = v.decision === want && v.usable === (want === 'CACHE_HIT_FRESH');
      if (!good) { bad++; console.log('        ' + label + ': want ' + want + ' got ' + v.decision + ' usable=' + v.usable); }
    }
    ok(bad === 0, '3: all ' + rows.length + ' age × data-session × market-session combinations decide correctly');
    // Structural rejections — never a silent hit.
    const bads = [
      ['empty candles', { candles: [], symbol: 'E', timeframe: '1D', fetchedAt: RTH - 1, lastSessionDate: '2026-07-30' }, 'CACHE_INVALID'],
      ['missing fetchedAt', { candles: series(SESS_CUR, 1, 25), symbol: 'E', timeframe: '1D', lastSessionDate: '2026-07-30' }, 'CACHE_INVALID'],
      ['fetchedAt in the future', { candles: series(SESS_CUR, 1, 25), symbol: 'E', timeframe: '1D', fetchedAt: RTH + 5000, lastSessionDate: '2026-07-30' }, 'CACHE_INVALID'],
      ['wrong symbol', entryFor('OTHER', '1D', SESS_CUR, RTH - 1000), 'CACHE_IDENTITY_MISMATCH'],
      ['wrong timeframe', entryFor('E', '4H', SESS_CUR, RTH - 1000), 'CACHE_IDENTITY_MISMATCH'],
      ['unprovable cached session', { candles: series(SESS_CUR, 1, 25), symbol: 'E', timeframe: '1D', fetchedAt: RTH - 1000, lastSessionDate: null }, 'CACHE_SESSION_MISMATCH'],
    ];
    let bad2 = 0;
    for (const [label, entry, want] of bads) {
      const v = sandbox._swingChartCacheEvaluate(entry, 'E', '1D', RTH);
      if (v.usable || v.decision !== want) { bad2++; console.log('        ' + label + ': want ' + want + ' got ' + v.decision); }
    }
    ok(bad2 === 0, '3: all ' + bads.length + ' malformed/mismatched entries are rejected with the right reason');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('4. THE CENTRAL REPRODUCTION — the chart advances from session N-1 to N');
  {
    resetCache();
    backendCalls = 0;
    const prev = series(SESS_PREV, 270.85, 25);
    const cur = series(SESS_CUR, 310.21, 25);
    backendImpl = serveOk(prev);

    // read #1 — backend only has N-1.
    const r1 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
    ok(r1.source === 'BACKEND' && sessOf(r1.candles) === '2026-07-29',
       '4: read #1 serves the backend series (session 2026-07-29)');
    ok(r1.stale === true && r1.staleReason === 'BACKEND_DATA_SESSION_BEHIND',
       '4: read #1 is MARKED STALE — a fresh response holding only N-1 while the market is in N');

    // read #2 — the old code returned the cache and never retried. It MUST retry now.
    const callsBefore = backendCalls;
    const r2 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
    ok(backendCalls === callsBefore + 1,
       '4: read #2 RE-ATTEMPTS the backend (the old cache short-circuit is gone)');
    ok(sessOf(r2.candles) === '2026-07-29' && r2.stale === true,
       '4: while the backend still lacks N, the N-1 bars are returned unchanged and marked stale');
    const lastPrev = r2.candles[r2.candles.length - 1];
    ok(lastPrev.open === prev[prev.length - 1].open && lastPrev.close === 270.85,
       '4: the N-1 bar is byte-identical — no bar invented for the missing session N');

    // read #3 — the backend finally has N.
    backendImpl = serveOk(cur);
    const r3 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
    ok(sessOf(r3.candles) === '2026-07-30' && r3.stale === false,
       '4: read #3 advances the chart to session 2026-07-30 and is no longer stale');
    ok(sandbox.S.swing.chartCache[key('EXPE', '1D')].lastSessionDate === '2026-07-30',
       '4: the cache now holds session 2026-07-30');

    // read #4 — immediately after, the fresh entry short-circuits: no fetch storm.
    const callsAfter = backendCalls;
    const r4 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH + 1000 });
    ok(r4.source === 'CACHE_FRESH' && backendCalls === callsAfter,
       '4: read #4 (1s later) is a fresh cache hit — no fetch storm');
    // And once the TTL lapses it re-checks again.
    const r5 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH + TTL + 1 });
    ok(backendCalls === callsAfter + 1 && r5.source === 'BACKEND',
       '4: after the TTL lapses the backend is consulted again');
  }

  section('4B. BEFORE/AFTER on the same fixture — the old path pins N-1, the new one advances');
  {
    const prev = series(SESS_PREV, 270.85, 25);
    const cur = series(SESS_CUR, 310.21, 25);

    // ── BEFORE: the pre-PR-E read path ────────────────────────────────────────
    resetCache();
    backendCalls = 0;
    backendImpl = serveOk(prev);
    const o1 = await LEGACY_CHART_CACHE_READ('EXPE', '1D');
    const callsAfterFirst = backendCalls;
    backendImpl = serveOk(cur);                      // the backend NOW has session N
    const o2 = await LEGACY_CHART_CACHE_READ('EXPE', '1D');
    const o3 = await LEGACY_CHART_CACHE_READ('EXPE', '1D');
    ok(o1.source === 'BACKEND' && sessOf(o1.candles) === '2026-07-29',
       '4B BEFORE: read #1 caches session 2026-07-29');
    ok(o2.source === 'SWING_CHART_CACHE' && o3.source === 'SWING_CHART_CACHE',
       '4B BEFORE: subsequent reads short-circuit to the cache');
    ok(backendCalls === callsAfterFirst,
       '4B BEFORE: the network is NEVER retried (backendCalls stuck at ' + backendCalls + ')');
    ok(sessOf(o3.candles) === '2026-07-29',
       '4B BEFORE: the chart stays pinned to 2026-07-29 even though the backend serves 2026-07-30');
    ok(o3.stale === undefined,
       '4B BEFORE: the old result had no staleness signal at all (stale=undefined)');

    // ── AFTER: the same fixture through the real, current path ────────────────
    resetCache();
    backendCalls = 0;
    backendImpl = serveOk(prev);
    const n1 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
    backendImpl = serveOk(cur);                      // the backend NOW has session N
    const n2 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
    ok(sessOf(n1.candles) === '2026-07-29' && n1.stale === true,
       '4B AFTER: read #1 serves 2026-07-29 and MARKS it stale');
    ok(backendCalls === 2, '4B AFTER: read #2 retries the network (backendCalls=' + backendCalls + ')');
    ok(sessOf(n2.candles) === '2026-07-30' && n2.stale === false,
       '4B AFTER: read #2 advances the chart to 2026-07-30');
    ok(sessOf(o3.candles) !== sessOf(n2.candles),
       '4B: the two paths diverge on the SAME fixture — old 2026-07-29 vs new 2026-07-30');
  }

  section('5. Pre-market must NOT thrash: yesterday is legitimately the newest session');
  {
    resetCache();
    backendCalls = 0;
    backendImpl = serveOk(series(SESS_PREV, 270.85, 25));
    const a = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: PRE });
    ok(a.stale === false, '5: a pre-market response holding yesterday is NOT stale');
    const calls = backendCalls;
    const b = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: PRE + 1000 });
    ok(b.source === 'CACHE_FRESH' && backendCalls === calls,
       '5: the second pre-market read is a cache hit — no pointless refetch of data that cannot exist yet');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('6. Backend failure never becomes a fresh hit, and never resaves the stale entry');
  {
    const cases = [
      ['timeout', 'fetch:The operation was aborted due to timeout', 'TIMEOUT'],
      ['abort',   'fetch:aborted',                                  'ABORTED'],
      ['empty',   'backend_empty',                                  'BACKEND_EMPTY'],
      ['http',    'http_503',                                       'BACKEND_ERROR'],
    ];
    for (const [label, reason, want] of cases) {
      resetCache();
      backendImpl = serveOk(series(SESS_PREV, 270.85, 25));
      await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
      const fetchedAt0 = sandbox.S.swing.chartCache[key('EXPE', '1D')].fetchedAt;
      const sess0 = sandbox.S.swing.chartCache[key('EXPE', '1D')].lastSessionDate;
      backendImpl = serveFail(reason);
      const r = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH + 5000 });
      const e = sandbox.S.swing.chartCache[key('EXPE', '1D')];
      ok(r.source === 'CACHE_STALE' && r.stale === true && r.backendResult === want,
         '6 (' + label + '): served as CACHE_STALE with backendResult=' + want);
      ok(e.fetchedAt === fetchedAt0,
         '6 (' + label + '): fetchedAt NOT refreshed — a stale serve cannot pose as a new fetch');
      ok(e.lastSessionDate === sess0, '6 (' + label + '): lastSessionDate unchanged');
      ok(r.reason === reason, '6 (' + label + '): the backend reason is surfaced, not hidden');
    }
    // No cache at all + a failing backend → must NOT claim ok.
    resetCache();
    backendImpl = serveFail('http_500');
    const none = await sandbox._swingGetChartCandles('NOPE', '1D', { nowMs: RTH });
    ok(none.ok === false && none.backendResult === 'BACKEND_ERROR',
       '6: with no cache and a failing backend the result is not ok (no fabricated hit)');
    ok(!sandbox.S.swing.chartCache[key('NOPE', '1D')], '6: nothing was written to the cache');
  }

  section('7. The non-normalized CACHE_FALLBACK shape is never promoted to a chart-cache entry');
  {
    // _swingGetCandles falls back to the scanner\'s SHORT-KEY scanData series when the backend
    // is empty. That shape is broken for the chart (a separate, out-of-scope defect); this PR
    // only guarantees it can never be mistaken for a fresh chart-cache entry.
    resetCache();
    const shortKey = [];
    for (let i = 0; i < 30; i++) shortKey.push({ t: Math.round((SESS_CUR - (29 - i) * DAY) / 1000), o: 1, h: 2, l: 0.5, c: 1.5, v: 1 });
    sandbox.S.scanData = [{ ticker: 'FB', candles: shortKey }];
    backendImpl = serveFail('backend_empty');
    const r = await sandbox._swingGetChartCandles('FB', '1D', { nowMs: RTH });
    ok(r.source === 'CACHE_FALLBACK', '7: the fallback is still returned with its own provenance');
    ok(!sandbox.S.swing.chartCache[key('FB', '1D')],
       '7: it is NOT written into the chart cache (it can never later look like a fresh entry)');
    ok(r.stale !== true || r.source !== 'CACHE_FRESH', '7: it is never labelled CACHE_FRESH');
    sandbox.S.scanData = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('8. A late / older response cannot drag the cache backwards');
  {
    resetCache();
    const cur = series(SESS_CUR, 310.21, 25);
    const prev = series(SESS_PREV, 270.85, 25);
    sandbox._swingChartCachePut('EXPE', '1D', cur, 'backend', RTH);
    const before = Object.assign({}, sandbox.S.swing.chartCache[key('EXPE', '1D')]);
    const d = sandbox._swingChartCachePut('EXPE', '1D', prev, 'backend', RTH + 5000);
    const after = sandbox.S.swing.chartCache[key('EXPE', '1D')];
    ok(d === 'CACHE_WRITE_SKIPPED_LATE_REQUEST', '8: an older payload is refused (' + d + ')');
    ok(after.lastSessionDate === before.lastSessionDate && after.lastSessionDate === '2026-07-30',
       '8: lastSessionDate does not regress to 2026-07-29');
    ok(after.fetchedAt === before.fetchedAt, '8: fetchedAt does not move for a refused write');
    const d2 = sandbox._swingChartCachePut('EXPE', '1D', series(et(2026, 7, 31, 9, 30), 315, 25), 'backend', RTH + 6000);
    ok(d2 === 'CACHE_WRITTEN' && sandbox.S.swing.chartCache[key('EXPE', '1D')].lastSessionDate === '2026-07-31',
       '8: a genuinely NEWER payload does replace the entry');
    // Same-session refresh (new intraday bar, same day) is allowed.
    resetCache();
    sandbox._swingChartCachePut('EXPE', '4H', series(SESS_CUR, 300, 25), 'backend', RTH);
    const same = sandbox._swingChartCachePut('EXPE', '4H', series(SESS_CUR, 305, 25), 'backend', RTH + 1000);
    ok(same === 'CACHE_WRITTEN', '8: a same-session refresh is allowed (not treated as late)');
  }

  section('8B. SAME lastCandleTs — two snapshots of the same in-progress candle');
  {
    // The subtle case timestamp monotonicity CANNOT catch: identical symbol, timeframe,
    // session AND lastCandleTs; only the OHLC differs, because these are two successive
    // snapshots of the same in-progress bar.
    const T = SESS_CUR;
    const snap = (close, high) => {
      const out = series(T, close, 25);
      out[out.length - 1].high = high;
      return out;
    };
    const A = snap(300, 302);   // request A — starts FIRST, responds LAST
    const B = snap(310, 312);   // request B — starts SECOND, responds FIRST
    ok(A[A.length - 1].time === B[B.length - 1].time,
       '8B: both payloads carry the IDENTICAL lastCandleTs');
    ok(sessOf(A) === sessOf(B), '8B: and the identical lastSessionDate (' + sessOf(A) + ')');

    // (1) old and new payload with the same lastCandleTs — sequence decides.
    resetCache();
    const seqA = sandbox._swingChartCacheBeginRequest('EXPE', '1D');   // A starts first
    const seqB = sandbox._swingChartCacheBeginRequest('EXPE', '1D');   // B starts second
    ok(seqB > seqA, '8B: the sequence is monotonic and assigned at request START (' + seqA + ' → ' + seqB + ')');
    // (2) the NEWER response arrives FIRST and writes.
    const dB = sandbox._swingChartCachePut('EXPE', '1D', B, 'backend', RTH, seqB);
    ok(dB === 'CACHE_WRITTEN', '8B: B (newer request) writes');
    ok(lastOf(cached('EXPE', '1D')).close === 310 && lastOf(cached('EXPE', '1D')).high === 312,
       '8B: cache holds close 310 / high 312');
    // (3) the OLDER response arrives LATE and must be refused.
    const dA = sandbox._swingChartCachePut('EXPE', '1D', A, 'backend', RTH + 50, seqA);
    ok(dA === 'CACHE_WRITE_SKIPPED_LATE_REQUEST',
       '8B: A (superseded request) is refused with CACHE_WRITE_SKIPPED_LATE_REQUEST');
    ok(lastOf(cached('EXPE', '1D')).close === 310 && lastOf(cached('EXPE', '1D')).high === 312,
       '8B: the chart does NOT walk back from 310 to 300 — cache still 310 / 312');

    // Two requests starting in the same millisecond still get distinct identities.
    const s1 = sandbox._swingChartCacheBeginRequest('MS', '1D');
    const s2 = sandbox._swingChartCacheBeginRequest('MS', '1D');
    ok(s2 === s1 + 1, '8B: two starts in the same millisecond get distinct ordered sequences (counter, not a clock)');

    // (4) a late PREFETCH with the same timestamp cannot displace a newer direct read.
    resetCache();
    const seqPre = sandbox._swingChartCacheBeginRequest('PF', '1D');    // prefetch starts
    const seqDir = sandbox._swingChartCacheBeginRequest('PF', '1D');    // direct read starts after
    sandbox._swingChartCachePut('PF', '1D', B, 'backend', RTH, seqDir); // direct wins the race
    const late = sandbox._swingChartCachePut('PF', '1D', A, 'prefetch', RTH + 10, seqPre);
    ok(late === 'CACHE_WRITE_SKIPPED_LATE_REQUEST' && lastOf(cached('PF', '1D')).close === 310,
       '8B: a late PREFETCH with the same timestamp is refused');
    // …and the reverse ordering: a late DIRECT read cannot displace a newer prefetch either.
    resetCache();
    const d1 = sandbox._swingChartCacheBeginRequest('PF2', '1D');
    const p2 = sandbox._swingChartCacheBeginRequest('PF2', '1D');
    sandbox._swingChartCachePut('PF2', '1D', B, 'prefetch', RTH, p2);
    const lateDirect = sandbox._swingChartCachePut('PF2', '1D', A, 'backend', RTH + 10, d1);
    ok(lateDirect === 'CACHE_WRITE_SKIPPED_LATE_REQUEST' && lastOf(cached('PF2', '1D')).close === 310,
       '8B: a late DIRECT read with the same timestamp is refused too (symmetric)');

    // (5) timeout/abort then retry: the retry is newer, so it writes; the corpse cannot.
    for (const label of ['timeout', 'abort']) {
      resetCache();
      const seqFailed = sandbox._swingChartCacheBeginRequest('RTY', '1D');  // this one will time out
      const seqRetry = sandbox._swingChartCacheBeginRequest('RTY', '1D');   // the retry
      ok(sandbox._swingChartCachePut('RTY', '1D', B, 'backend', RTH, seqRetry) === 'CACHE_WRITTEN',
         '8B (' + label + ' → retry): the retry writes');
      ok(sandbox._swingChartCachePut('RTY', '1D', A, 'backend', RTH + 5, seqFailed) === 'CACHE_WRITE_SKIPPED_LATE_REQUEST',
         '8B (' + label + ' → retry): a late response from the ' + label + 'ed request is refused');
      ok(lastOf(cached('RTY', '1D')).close === 310, '8B (' + label + ' → retry): the retry data survives');
    }

    // (6) the same in-progress candle updated repeatedly — each newer request wins in order.
    resetCache();
    let lastSeq = 0;
    for (const px of [300, 305, 310, 315]) {
      lastSeq = sandbox._swingChartCacheBeginRequest('PROG', '1D');
      sandbox._swingChartCachePut('PROG', '1D', snap(px, px + 2), 'backend', RTH, lastSeq);
    }
    ok(lastOf(cached('PROG', '1D')).close === 315, '8B: repeated updates of the same bar end on the newest (315)');
    ok(sandbox._swingChartCachePut('PROG', '1D', snap(300, 302), 'backend', RTH, lastSeq - 2) === 'CACHE_WRITE_SKIPPED_LATE_REQUEST',
       '8B: an out-of-order straggler from two generations back is refused');

    // (7) sequences are PER KEY — different symbols and timeframes never interfere.
    resetCache();
    const a1 = sandbox._swingChartCacheBeginRequest('AA', '1D');
    const b1 = sandbox._swingChartCacheBeginRequest('BB', '1D');
    const a4 = sandbox._swingChartCacheBeginRequest('AA', '4H');
    ok(sandbox._swingChartCachePut('AA', '1D', B, 'backend', RTH, a1) === 'CACHE_WRITTEN',
       '8B: AA|1D writes even though BB|1D started later (per-key sequences)');
    ok(sandbox._swingChartCachePut('BB', '1D', B, 'backend', RTH, b1) === 'CACHE_WRITTEN',
       '8B: BB|1D writes independently');
    ok(sandbox._swingChartCachePut('AA', '4H', B, 'backend', RTH, a4) === 'CACHE_WRITTEN',
       '8B: AA|4H writes independently of AA|1D');
    // A stale sequence for one key does not block another.
    const a1b = sandbox._swingChartCacheBeginRequest('AA', '1D');
    ok(sandbox._swingChartCachePut('AA', '1D', A, 'backend', RTH, a1) === 'CACHE_WRITE_SKIPPED_LATE_REQUEST' &&
       sandbox._swingChartCachePut('AA', '4H', A, 'backend', RTH, a4) === 'CACHE_WRITTEN',
       '8B: superseding AA|1D leaves AA|4H writable');
    ok(a1b > a1, '8B: (sequence advanced for AA|1D)');
  }

  section('10B. DEEP immutability — the candle OBJECTS are not shared with the cache');
  {
    // A shallow copy (slice / spread) leaves the objects shared, so result.candles[0].close = 999
    // would rewrite the cached bar. Candle objects are flat, so one per-element copy suffices.
    const build = () => series(SESS_CUR, 310.21, 25);

    // (a) BACKEND path.
    resetCache();
    const backendArr = build();
    backendImpl = serveOk(backendArr);
    const r1 = await sandbox._swingGetChartCandles('MUT', '1D', { nowMs: RTH });
    const entry = sandbox.S.swing.chartCache[key('MUT', '1D')];
    ok(r1.candles !== entry.candles, '10B: the BACKEND path returns a different ARRAY than the cached one');
    ok(r1.candles[0] !== entry.candles[0] && lastOf(r1.candles) !== lastOf(entry.candles),
       '10B: and different candle OBJECTS (first and last)');
    ok(entry.candles[0] !== backendArr[0], '10B: the cache does not share objects with the backend array either');

    const snapshotJson = JSON.stringify(entry.candles);
    // (b) mutate the RETURNED objects — first and last candle, several fields.
    r1.candles[0].close = 999; r1.candles[0].high = 999; r1.candles[0].open = 999;
    lastOf(r1.candles).close = 111; lastOf(r1.candles).low = 0.01;
    // (c) mutate the returned ARRAY itself.
    r1.candles.push({ time: 1, open: 1, high: 1, low: 1, close: 1 });
    r1.candles.reverse();
    r1.candles.length = 2;
    ok(JSON.stringify(entry.candles) === snapshotJson,
       '10B: after object AND array mutation the entry is byte-identical');

    const r2 = await sandbox._swingGetChartCandles('MUT', '1D', { nowMs: RTH + 1000 });
    ok(r2.source === 'CACHE_FRESH', '10B: (the re-read is a fresh cache hit)');
    ok(r2.candles[0].close === 250 && r2.candles[0].high === 250.9 && r2.candles[0].open === 249.6,
       '10B: the second read returns the ORIGINAL first candle');
    ok(lastOf(r2.candles).close === 310.21, '10B: and the ORIGINAL last candle');
    ok(r2.candles.length === 25, '10B: and the original length');

    // (d) mutate the BACKEND's own array AND objects after the write.
    resetCache();
    const arr2 = build();
    backendImpl = serveOk(arr2);
    await sandbox._swingGetChartCandles('MUT2', '1D', { nowMs: RTH });
    const before2 = JSON.stringify(sandbox.S.swing.chartCache[key('MUT2', '1D')].candles);
    arr2[0].close = 777; lastOf(arr2).high = 777; arr2.push({ time: 9 }); arr2.reverse();
    ok(JSON.stringify(sandbox.S.swing.chartCache[key('MUT2', '1D')].candles) === before2,
       '10B: mutating the backend array/objects AFTER the write leaves the cache byte-identical');

    // (e) the CACHE_FRESH result.
    resetCache();
    backendImpl = serveOk(build());
    await sandbox._swingGetChartCandles('MUT3', '1D', { nowMs: RTH });
    const fresh = await sandbox._swingGetChartCandles('MUT3', '1D', { nowMs: RTH + 1000 });
    ok(fresh.source === 'CACHE_FRESH', '10B: (fresh-hit path)');
    const before3 = JSON.stringify(sandbox.S.swing.chartCache[key('MUT3', '1D')].candles);
    fresh.candles[0].close = 555; lastOf(fresh.candles).close = 555;
    ok(JSON.stringify(sandbox.S.swing.chartCache[key('MUT3', '1D')].candles) === before3,
       '10B: mutating a CACHE_FRESH result cannot reach the cache');

    // (f) the CACHE_STALE fallback result.
    resetCache();
    backendImpl = serveOk(series(SESS_PREV, 270.85, 25));
    await sandbox._swingGetChartCandles('MUT4', '1D', { nowMs: RTH });
    backendImpl = serveFail('fetch:timeout');
    const st = await sandbox._swingGetChartCandles('MUT4', '1D', { nowMs: RTH + 1000 });
    ok(st.source === 'CACHE_STALE', '10B: (stale-fallback path)');
    const before4 = JSON.stringify(sandbox.S.swing.chartCache[key('MUT4', '1D')].candles);
    st.candles[0].close = 444; lastOf(st.candles).close = 444; st.candles.reverse();
    ok(JSON.stringify(sandbox.S.swing.chartCache[key('MUT4', '1D')].candles) === before4,
       '10B: a stale result is not indirectly mutable either');
    const st2 = await sandbox._swingGetChartCandles('MUT4', '1D', { nowMs: RTH + 2000 });
    ok(lastOf(st2.candles).close === 270.85, '10B: the next stale serve still returns the original values');

    // (g) the real consumers must not mutate what they are handed.
    vm.runInContext(['_swingWeekBucket', '_etWeekBucket', '_swingDeriveWeeklyCandles',
      '_swingRowPriceObservedAt', '_dssResolvePrice', 'resolveLatestDisplayPrice',
      'patchLastCandleWithLivePrice', 'smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC',
      'calcSqueeze', 'computeCandleIndicators'].map(fn).join('\n'), sandbox);
    const consumed = build();
    const consumedJson = JSON.stringify(consumed);
    const keysBefore = Object.keys(consumed[0]).join(',');
    sandbox.patchLastCandleWithLivePrice(consumed, 320, '2026-07-30');
    ok(JSON.stringify(consumed) === consumedJson, '10B: the live-price patch does not mutate its input');
    sandbox.computeCandleIndicators(consumed);
    ok(JSON.stringify(consumed) === consumedJson, '10B: the indicator stack does not mutate its input');
    ok(Object.keys(consumed[0]).join(',') === keysBefore, '10B: indicators add no properties to candle objects');
    sandbox._swingDeriveWeeklyCandles(consumed);
    ok(JSON.stringify(consumed) === consumedJson, '10B: the weekly derivation does not mutate the daily candles');
    // The clone helper itself.
    const orig = build();
    const clone = sandbox._swingCloneCandleSeries(orig);
    clone[0].close = 1;
    ok(orig[0].close !== 1 && clone.length === orig.length,
       '10B: _swingCloneCandleSeries detaches every element');
  }

  section('9. Writes reject everything that must never enter the cache');
  {
    resetCache();
    const bad = [
      ['empty array', () => sandbox._swingChartCachePut('X', '1D', [], 'backend', RTH), 'CACHE_WRITE_SKIPPED_EMPTY'],
      ['not an array', () => sandbox._swingChartCachePut('X', '1D', null, 'backend', RTH), 'CACHE_WRITE_SKIPPED_EMPTY'],
      ['no symbol', () => sandbox._swingChartCachePut('', '1D', series(SESS_CUR, 1, 5), 'backend', RTH), 'CACHE_WRITE_SKIPPED_NO_IDENTITY'],
      ['no timeframe', () => sandbox._swingChartCachePut('X', '', series(SESS_CUR, 1, 5), 'backend', RTH), 'CACHE_WRITE_SKIPPED_NO_IDENTITY'],
      ['unparseable timestamp', () => sandbox._swingChartCachePut('X', '1D', [{ time: 'nope', open: 1, high: 1, low: 1, close: 1 }], 'backend', RTH), 'CACHE_WRITE_SKIPPED_BAD_TIMESTAMP'],
    ];
    let bad2 = 0;
    for (const [label, run, want] of bad) {
      const got = run();
      if (got !== want) { bad2++; console.log('        ' + label + ': want ' + want + ' got ' + got); }
    }
    ok(bad2 === 0, '9: all ' + bad.length + ' invalid writes are refused with the right decision');
    ok(Object.keys(sandbox.S.swing.chartCache).length === 0, '9: none of them left an entry behind');
  }

  section('10. A consumer cannot corrupt the cache by reference');
  {
    resetCache();
    const cur = series(SESS_CUR, 310.21, 25);
    backendImpl = serveOk(cur);
    const r1 = await sandbox._swingGetChartCandles('MUT', '1D', { nowMs: RTH });
    const stored = sandbox.S.swing.chartCache[key('MUT', '1D')];
    const lenBefore = stored.candles.length;
    ok(r1.candles !== stored.candles, '10: the BACKEND path does not hand out the cached array itself');
    // Abuse the array the consumer received.
    r1.candles.push({ time: 1, open: 1, high: 1, low: 1, close: 1 });
    r1.candles.reverse();
    r1.candles.length = 3;
    const r2 = await sandbox._swingGetChartCandles('MUT', '1D', { nowMs: RTH + 1000 });
    ok(stored.candles.length === lenBefore, '10: push/reverse/truncate on the returned array left the cache intact');
    ok(r2.source === 'CACHE_FRESH' && sessOf(r2.candles) === '2026-07-30',
       '10: the next read still returns the correct, ordered series');
    ok(r2.candles !== stored.candles, '10: the CACHE_FRESH path also returns a copy');
    // The cache also owns its array against the WRITER's later mutation.
    resetCache();
    const own = series(SESS_CUR, 300, 25);
    sandbox._swingChartCachePut('OWN', '1D', own, 'backend', RTH);
    own.push({ time: 2, open: 1, high: 1, low: 1, close: 1 });
    ok(sandbox.S.swing.chartCache[key('OWN', '1D')].candles.length === 25,
       '10: mutating the array AFTER writing it does not change the cached entry');
  }

  section('11. Invalidation is explicit and scoped — no blanket clear');
  {
    resetCache();
    const cur = series(SESS_CUR, 300, 25);
    sandbox._swingChartCachePut('AAA', '1D', cur, 'backend', RTH);
    sandbox._swingChartCachePut('AAA', '4H', cur, 'backend', RTH);
    sandbox._swingChartCachePut('BBB', '1D', cur, 'backend', RTH);
    ok(sandbox._swingInvalidateChartCacheEntry('AAA', '1D') === true, '11: entry invalidation reports success');
    ok(!sandbox.S.swing.chartCache[key('AAA', '1D')] && !!sandbox.S.swing.chartCache[key('AAA', '4H')],
       '11: only that symbol|timeframe was dropped — the other timeframe survived');
    ok(sandbox._swingInvalidateChartCacheEntry('AAA', '1D') === false, '11: invalidating a missing entry reports false');
    ok(sandbox._swingInvalidateChartCacheSymbol('AAA') === 1, '11: symbol invalidation drops the remaining AAA entry');
    ok(!!sandbox.S.swing.chartCache[key('BBB', '1D')],
       '11: another symbol is untouched — changing candidate does NOT nuke the whole cache');
    // The source must contain no blanket clear on the render path.
    const renderSrc = fn('_swingGetChartCandles') + fn('_swingPrefetchNeighbors');
    ok(!/chartCache\s*=\s*\{\}/.test(renderSrc), '11: the read/prefetch path never resets the whole cache');
  }

  section('12. Concurrency — dedup without collapsing distinct series');
  {
    resetCache();
    backendCalls = 0;
    const cur = series(SESS_CUR, 310.21, 25);
    backendImpl = async () => { await new Promise((r) => setTimeout(r, 5)); return { ok: true, candles: cur, count: cur.length, reason: null }; };
    const [a, b] = await Promise.all([
      sandbox._swingGetChartCandles('CONC', '1D', { nowMs: RTH }),
      sandbox._swingGetChartCandles('CONC', '1D', { nowMs: RTH }),
    ]);
    ok(backendCalls === 1, '12: two concurrent reads for the same symbol|timeframe make ONE backend call');
    ok(a.ok && b.ok, '12: both consumers still receive data');
    resetCache();
    backendCalls = 0;
    await Promise.all([
      sandbox._swingGetChartCandles('C2', '1D', { nowMs: RTH }),
      sandbox._swingGetChartCandles('C2', '4H', { nowMs: RTH }),
    ]);
    ok(backendCalls === 2, '12: the same symbol on two timeframes is NOT collapsed into one request');
    resetCache();
    backendCalls = 0;
    await Promise.all([
      sandbox._swingGetChartCandles('S1', '1D', { nowMs: RTH }),
      sandbox._swingGetChartCandles('S2', '1D', { nowMs: RTH }),
    ]);
    ok(backendCalls === 2, '12: two different symbols are not collapsed either');
    ok(!!sandbox.S.swing.chartCache[key('S1', '1D')] && !!sandbox.S.swing.chartCache[key('S2', '1D')],
       '12: each symbol got its own entry (no cross-symbol contamination)');
  }

  section('13. Rapid Prev/Next — prefetch re-warms a stale neighbour instead of pinning it');
  {
    resetCache();
    sandbox.S.swing.candidates = [{ symbol: 'N0' }, { symbol: 'N1' }, { symbol: 'N2' }, { symbol: 'N3' }];
    // Seed N0 with a PREVIOUS-session entry (what the old cache would have pinned forever).
    sandbox.S.swing.chartCache[key('N0', '1D')] = entryFor('N0', '1D', SESS_PREV, RTH - 1000, 'prefetch');
    // And N2 with a CURRENT-session entry, which must not be re-fetched.
    sandbox.S.swing.chartCache[key('N2', '1D')] = entryFor('N2', '1D', SESS_CUR, RTH - 1000, 'prefetch');
    ok(sandbox._swingChartCacheEvaluate(sandbox.S.swing.chartCache[key('N0', '1D')], 'N0', '1D', RTH).usable === false,
       '13: the previous-session neighbour entry is judged NOT usable');
    ok(sandbox._swingChartCacheEvaluate(sandbox.S.swing.chartCache[key('N2', '1D')], 'N2', '1D', RTH).usable === true,
       '13: the current-session neighbour entry IS usable');
    const prefetchSrc = fn('_swingPrefetchNeighbors');
    ok(/_swingChartCacheEvaluate\([\s\S]*?\)\.usable/.test(prefetchSrc),
       '13: prefetch skips only on a USABLE entry (a stale neighbour is re-warmed)');
    ok(/_swingChartCachePut\(/.test(prefetchSrc),
       '13: prefetch stores through the same validated write (same age + session identity)');
    ok(/res\.source === 'BACKEND'/.test(prefetchSrc),
       '13: prefetch only caches genuine backend responses, never the fallback shape');
  }

  section('14. Diagnostics explain every decision');
  {
    resetCache();
    backendImpl = serveOk(series(SESS_PREV, 270.85, 25));
    await sandbox._swingGetChartCandles('DIAG', '1D', { nowMs: RTH });   // miss → backend, data behind
    await sandbox._swingGetChartCandles('DIAG', '1D', { nowMs: RTH });   // session mismatch → backend again
    backendImpl = serveFail('fetch:timeout');
    await sandbox._swingGetChartCandles('DIAG', '1D', { nowMs: RTH + 1 }); // → stale serve
    const required = ['symbol', 'timeframe', 'cacheKey', 'decision', 'cacheAgeMs',
                      'cachedSession', 'currentSession', 'fresh', 'backendAttempted',
                      'backendResult', 'finalOrigin'];
    const missing = [];
    cacheDiag.forEach((d, i) => required.forEach((k) => { if (!(k in d)) missing.push(i + ':' + k); }));
    ok(missing.length === 0, '14: every diagnostic carries the required fields (' + missing.slice(0, 4).join(', ') + ')');
    const decisions = cacheDiag.map((d) => d.decision);
    ok(decisions.indexOf('CACHE_MISS') >= 0, '14: CACHE_MISS emitted');
    ok(decisions.indexOf('CACHE_SESSION_MISMATCH') >= 0, '14: CACHE_SESSION_MISMATCH emitted');
    ok(decisions.indexOf('CACHE_STALE_BACKEND_ERROR') >= 0, '14: CACHE_STALE_BACKEND_ERROR emitted');
    const last = cacheDiag[cacheDiag.length - 1];
    ok(last.finalOrigin === 'CACHE_STALE' && last.backendResult === 'TIMEOUT' && last.fresh === false,
       '14: the stale serve records finalOrigin, backendResult and fresh=false');
    ok(cacheDiag.some((d) => d.writeDecision === 'CACHE_WRITTEN' && d.finalOrigin === 'CACHE_REPLACED_BY_BACKEND'),
       '14: a backend replacement records CACHE_REPLACED_BY_BACKEND');
    // One line per decision, not per candle.
    ok(cacheDiag.length === 3, '14: exactly one diagnostic per read (' + cacheDiag.length + ' for 3 reads) — no per-candle noise');
  }

  section('15. The session-identity guard (previous PR) still holds on a stale serve');
  {
    // A stale serve returns previous-session bars while the market is in the current session.
    // The price upsert must still refuse to touch them — a stale chart must never become a
    // hybrid chart.
    vm.runInContext([
      '_swingWeekBucket', '_etWeekBucket', '_swingDeriveWeeklyCandles',
      '_swingRowPriceObservedAt', '_dssResolvePrice', 'resolveLatestDisplayPrice',
      'patchLastCandleWithLivePrice', '_swingResolveRenderPrice',
      '_swingPatchWeeklyWithSessionPrice', '_swingPreparePriceAlignedCandles',
    ].map(fn).join('\n'), sandbox);
    resetCache();
    backendImpl = serveOk(series(SESS_PREV, 270.85, 25));
    await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
    backendImpl = serveFail('fetch:timeout');
    const staleRead = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH + 1000 });
    ok(staleRead.source === 'CACHE_STALE', '15: we are on the stale-serve path');
    // A current-session 4H print is available; it must NOT be written into the N-1 daily bar.
    const four = series(SESS_CUR, 309.70, 25);
    const aligned = sandbox._swingPreparePriceAlignedCandles('EXPE', staleRead.candles, four, RTH);
    const lastD = aligned.dailyCandles[aligned.dailyCandles.length - 1];
    ok(aligned.sessionDate === '2026-07-30', '15: the resolved price belongs to session 2026-07-30');
    ok(aligned.applied.daily === false, '15: the upsert is refused on the stale N-1 series');
    ok(lastD.close === 270.85 && sandbox._candleTradingSessionDate(lastD) === '2026-07-29',
       '15: the stale bar keeps its own close 270.85 — no hybrid candle reintroduced');
    ok(lastD.high === staleRead.candles[staleRead.candles.length - 1].high,
       '15: its high was not lifted by the other session\'s price either');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
