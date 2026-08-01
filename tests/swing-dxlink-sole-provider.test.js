'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING candles come from Tastytrade/DXLink ONLY.
//
// WHAT CHANGED
//   _swingReadCachedCandles accepted S.scanData[].candles as a 1D "cache fallback".
//   That series is not canonical: runScan fills it from
//       fetchScannerCandles → fetchCandles → fetchBackendCandles
//       → GET {BACKEND}/market/candles/{ticker}?days=300   (server-side Yahoo Finance)
//   with fetchTwelveData and fetchAlphaVantage behind it. Because the enrichment path is
//   cache-first, that series WON the race against the DXLink candle store and was served
//   without the backend ever being asked — and its session-date-at-00:00-UTC stamping
//   resolves to the previous ET day, which splits a market week into two weekly bars.
//
// THE CONTRACT PINNED HERE
//   Exactly two ingresses, both provably DXLink-fed:
//     • GET /dev/market/candles-dxlink/{symbol}?timeframe={tf}   (_sfsFetchBackendCandles)
//     • S.squeezeFireScanner.chartCacheCandles — written in exactly two places, both
//       canonical (_sfsRunScan stores candle-store responses verbatim;
//       _sfsCandlesFromSyncSource promotes the DXLink 1D / DXLink RTH 4H buffers).
//   Provenance lives on the ENVELOPE, not on each candle:
//     TASTYTRADE_DXLINK · DXLINK_CACHE · DXLINK_STALE_CACHE · NONE · ERROR
//   and when nothing canonical exists the read FAILS CLOSED with an explicit reason
//   (DXLINK_BACKEND_UNAVAILABLE / NO_CANONICAL_CANDLES / LEGACY_PROVIDER_REJECTED)
//   rather than presenting a legacy series as if it were Tastytrade.
//
// Deterministic and fully offline: no network, no clock dependence, no live data.
//
// Run: node tests/swing-dxlink-sole-provider.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadAppJavaScriptSource, extractFunctionSource } = require('./lib/load-app-source');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SRC = loadAppJavaScriptSource();
const fn = (name) => extractFunctionSource(name, { source: SRC });

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── ET instant helper (offset probed — no hardcoded UTC offset anywhere) ─────
function et(y, m, d, hh, mm) {
  for (const off of [4, 5]) {
    const t = Date.UTC(y, m - 1, d, hh + off, mm || 0);
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date(t));
    let H = 0, M = 0; p.forEach((x) => { if (x.type === 'hour') H = +x.value; if (x.type === 'minute') M = +x.value; });
    if ((H === 24 ? 0 : H) === hh && M === (mm || 0)) return t;
  }
  return Date.UTC(y, m - 1, d, hh, mm || 0);
}
const DAY = 86400000;
const SESS_CUR = et(2026, 7, 30, 9, 30);          // Thu 2026-07-30 09:30 ET
const RTH = et(2026, 7, 30, 11, 0);               // mid-session

// A canonical DXLink 1D series: long-key, ms, stamped at the RTH interval start.
function dxSeries(lastSessionMs, lastClose, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const t = lastSessionMs - i * DAY;
    const c = lastClose - i * 0.5;
    out.push({ time: t, open: c - 1, high: c + 1.5, low: c - 2, close: c, volume: 1000 + i });
  }
  return out;
}
// The legacy scanner series: short-key, SECONDS, session date at 00:00 UTC.
function legacySeries(lastSessionIsoDate, lastClose, n) {
  const base = Date.parse(lastSessionIsoDate + 'T00:00:00Z');
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const c = lastClose - i * 0.5;
    out.push({ t: Math.round((base - i * DAY) / 1000), date: lastSessionIsoDate,
               o: c - 1, h: c + 1.5, l: c - 2, c: c, v: 1000 + i });
  }
  return out;
}

// ── Sandbox: real SWING read path, stubbed TRANSPORT only ────────────────────
const chartLogs = [];
const sandbox = {
  console: { log: (...a) => chartLogs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')),
             warn: () => {}, error: () => {} },
  JSON, Object, String, Math, Number, isFinite, parseFloat, parseInt, NaN, Array, Date, Intl,
  Promise, Set, setTimeout, clearTimeout,
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  'var S = { scanData: [], squeezeFireScanner: { chartCacheCandles: {} }, swing: { chartCache: {} } };' +
  'var _swingCandleInflight = {}; var SWING_CHART_CACHE_TTL_MS = 180000;' +
  'var _swingChartCacheSeq = {}; var _swingChartCacheAuthorizedSeq = {};' +
  "var SWING_CANDLE_SOURCE = { BACKEND:'TASTYTRADE_DXLINK', CACHE:'DXLINK_CACHE', STALE:'DXLINK_STALE_CACHE', NONE:'NONE', ERROR:'ERROR' };" +
  "var SWING_CANDLE_REASON = { BACKEND_DOWN:'DXLINK_BACKEND_UNAVAILABLE', STALE_CACHE:'DXLINK_CANONICAL_CACHE_STALE'," +
  " NO_CANONICAL:'NO_CANONICAL_CANDLES', LEGACY_REJECTED:'LEGACY_PROVIDER_REJECTED' };", sandbox);
vm.runInContext([
  '_etMinutes', '_etDateStr', 'getUsEquityMarketSession', '_backendCandleStoreChartNormTime',
  '_candleTradingSessionDate', '_swingCandleTimeMs', '_swingWeekBucket', '_etWeekBucket',
  '_swingLogWeeklySource', '_swingDeriveWeeklyCandles',
  '_swingLogChartCandles', '_swingReadCachedCandles', '_swingLegacySeriesPresent',
  '_swingGetCandles', '_swingFetchContextCandles',
  '_swingChartCacheKey', '_swingChartCacheBeginRequest', '_swingCloneCandleSeries',
  '_swingExpectedNewestSessionDate', '_swingSeriesSessionDate', '_swingChartCacheEvaluate',
  '_swingChartCachePut', '_swingInvalidateChartCacheEntry', '_swingInvalidateChartCacheSymbol',
  '_swingLogChartCache', '_swingBackendOutcome', '_swingGetChartCandles',
].map(fn).join('\n'), sandbox);

// The ONLY transport. Every call is recorded, so "which endpoint was hit" is provable.
const calls = [];
let backendImpl = null;
sandbox._sfsFetchBackendCandles = async function (sym, tf) {
  calls.push({ endpoint: '/dev/market/candles-dxlink/' + sym + '?timeframe=' + tf, symbol: sym, tf });
  return backendImpl(sym, tf);
};
const serveOk = (c) => async () => ({ ok: true, status: 200, count: c.length, candles: c.map((x) => Object.assign({}, x)), reason: null });
const serveFail = (reason) => async () => ({ ok: false, status: 0, count: 0, candles: [], reason });

// Tripwires: if any legacy provider were reachable from the SWING read path, these fire.
['fetchCandles', 'fetchBackendCandles', 'fetchTwelveData', 'fetchAlphaVantage', 'fetchScannerCandles'].forEach((name) => {
  sandbox[name] = function () { calls.push({ endpoint: 'LEGACY:' + name }); throw new Error('legacy provider called: ' + name); };
});
sandbox.fetch = function (u) { calls.push({ endpoint: 'RAW_FETCH:' + String(u) }); throw new Error('raw fetch'); };

const reset = () => { calls.length = 0; chartLogs.length = 0;
  vm.runInContext('S.scanData = []; S.squeezeFireScanner.chartCacheCandles = {}; S.swing.chartCache = {}; _swingCandleInflight = {}; _swingChartCacheSeq = {}; _swingChartCacheAuthorizedSeq = {};', sandbox); };
const legacyCalls = () => calls.filter((c) => /^LEGACY:|^RAW_FETCH:/.test(c.endpoint));
const dxCalls = () => calls.filter((c) => c.endpoint.indexOf('/dev/market/candles-dxlink/') === 0);
const key = (s, tf) => s + '|' + tf;

(async function () {
  // ═══════════════════════════════════════════════════════════════════════════
  section('1. Every SWING read hits the DXLink candle store and nothing else');
  {
    const scenarios = [
      ['enrichment 1D  (_swingFetchContextCandles)', () => sandbox._swingFetchContextCandles('AAPL', '1D')],
      ['enrichment 4H  (_swingFetchContextCandles)', () => sandbox._swingFetchContextCandles('AAPL', '4H')],
      ['SPY context 1D (_swingFetchContextCandles)', () => sandbox._swingFetchContextCandles('SPY', '1D')],
      ['chart 1D       (_swingGetChartCandles)',     () => sandbox._swingGetChartCandles('AAPL', '1D', { nowMs: RTH })],
      ['chart 4H       (_swingGetChartCandles)',     () => sandbox._swingGetChartCandles('AAPL', '4H', { nowMs: RTH })],
    ];
    for (const [label, run] of scenarios) {
      reset();
      backendImpl = serveOk(dxSeries(SESS_CUR, 310.21, 40));
      await run();
      const eps = [...new Set(calls.map((c) => c.endpoint.replace(/[A-Z]+\?/, '?')))];
      ok(dxCalls().length >= 1 && legacyCalls().length === 0,
         '1: ' + label + ' → ' + dxCalls().length + ' DXLink call(s), 0 legacy   [' + eps.join(', ') + ']');
    }
  }

  section('2. Weekly is derived from DXLink daily and stays one bar per market week');
  {
    reset();
    // A full market week, Mon 2026-07-27 … Fri 2026-07-31, as the DXLink store serves it.
    const week = [27, 28, 29, 30, 31].map((d, i) => {
      const t = et(2026, 7, d, 9, 30), c = 260 + i * 2;
      return { time: t, open: c - 1, high: c + 2, low: c - 2, close: c, volume: 1000 };
    });
    backendImpl = serveOk(week);
    const daily = await sandbox._swingFetchContextCandles('WK', '1D');
    const weekly = sandbox._swingDeriveWeeklyCandles(daily);
    ok(weekly.length === 1, '2: five DXLink sessions derive exactly ONE weekly bar');
    ok(sandbox._etDateStr(weekly[0].time) === '2026-07-27', '2: stamped at the week\'s first session');
    ok(weekly[0].open === 259 && weekly[0].close === 268, '2: open from Monday, close from Friday');
    // The same five sessions in the LEGACY shape split the week — the reason it is refused.
    const legacyWeek = [27, 28, 29, 30, 31].map((d, i) => {
      const c = 260 + i * 2;
      return { t: Math.round(Date.parse('2026-07-' + d + 'T00:00:00Z') / 1000), o: c - 1, h: c + 2, l: c - 2, c: c, v: 1000 };
    });
    ok(sandbox._swingDeriveWeeklyCandles(legacyWeek).length === 2,
       '2: the SAME week in the legacy 00:00-UTC shape would split into 2 bars (why it is refused)');
  }

  section('3. A populated legacy S.scanData never wins over the candle store');
  {
    reset();
    vm.runInContext('S.scanData = [{ ticker: "EXPE", signal: "STRONG BUY", candles: __legacy }];',
      Object.assign(sandbox, { __legacy: legacySeries('2026-07-30', 999.99, 40) }));
    backendImpl = serveOk(dxSeries(SESS_CUR, 310.21, 40));
    const series = await sandbox._swingFetchContextCandles('EXPE', '1D');
    ok(dxCalls().length === 1, '3: the candle store IS consulted even though scanData is populated');
    ok(series.length > 0 && series[0].time != null && series[0].t === undefined,
       '3: the served series is the long-key DXLink shape, not the short-key legacy one');
    ok(!series.some((c) => c.close === 999.99 || c.c === 999.99), '3: no legacy bar is present in the output');
    ok(sandbox._candleTradingSessionDate(series[series.length - 1]) === '2026-07-30',
       '3: and its last session is the real ET session, not the previous day');
  }

  section('4. Backend unavailable — canonical cache yes, legacy cache never');
  {
    // 4a. canonical cache present → served, marked stale, with a diagnostic reason.
    reset();
    vm.runInContext('S.squeezeFireScanner.chartCacheCandles = { EXPE: { "1D": __dx } };',
      Object.assign(sandbox, { __dx: dxSeries(SESS_CUR - DAY, 270.85, 40) }));
    backendImpl = serveFail('http_503');
    const a = await sandbox._swingGetCandles('EXPE', '1D');
    ok(a.ok === true && a.source === 'DXLINK_STALE_CACHE',
       '4a: a DXLink-fed cache answers when the store is down, labelled DXLINK_STALE_CACHE');
    ok(a.reason === 'DXLINK_CANONICAL_CACHE_STALE', '4a: with an explicit staleness reason');

    // 4b. ONLY a legacy series present → refused, fail closed.
    reset();
    vm.runInContext('S.scanData = [{ ticker: "EXPE", candles: __legacy }];',
      Object.assign(sandbox, { __legacy: legacySeries('2026-07-30', 310.21, 40) }));
    backendImpl = serveFail('http_503');
    const b = await sandbox._swingGetCandles('EXPE', '1D');
    ok(b.ok === false, '4b: a legacy series is REFUSED when the store is down — fail closed');
    ok(b.reason === 'LEGACY_PROVIDER_REJECTED', '4b: the refusal is explicit (LEGACY_PROVIDER_REJECTED)');
    ok(!(b.candles && b.candles.length), '4b: no candles are returned — nothing is invented');
    ok(b.source === 'NONE', '4b: and the envelope claims no provenance');

    // 4c. nothing at all → fail closed with NO_CANONICAL_CANDLES.
    reset();
    backendImpl = serveFail('backend_empty');
    const c = await sandbox._swingGetCandles('NEW', '1D');
    ok(c.ok === false && c.candles.length === 0, '4c: no store, no cache → fail closed');
    ok(c.reason === 'backend_empty' || c.reason === 'NO_CANONICAL_CANDLES',
       '4c: with the transport reason or NO_CANONICAL_CANDLES (got ' + c.reason + ')');

    // 4d. no legacy provider is contacted in ANY of the failure paths.
    ok(legacyCalls().length === 0, '4d: no Yahoo / TwelveData / AlphaVantage call on any failure path');
  }

  section('5. Single-flight, no duplicate acquisition, no cross-contamination');
  {
    reset();
    backendImpl = serveOk(dxSeries(SESS_CUR, 310.21, 40));
    const [p1, p2, p3] = await Promise.all([
      sandbox._swingGetCandles('AAA', '1D'), sandbox._swingGetCandles('AAA', '1D'), sandbox._swingGetCandles('AAA', '1D')]);
    ok(dxCalls().filter((c) => c.symbol === 'AAA' && c.tf === '1D').length === 1,
       '5: three concurrent consumers share ONE canonical acquisition (single-flight)');
    ok(p1 === p2 && p2 === p3, '5: and they receive the same resolved envelope');

    reset();
    backendImpl = async (sym, tf) => ({ ok: true, status: 200, count: 40,
      candles: dxSeries(SESS_CUR, tf === '1D' ? 100 : 200, 40), reason: null });
    const d1 = await sandbox._swingGetCandles('BBB', '1D');
    const d4 = await sandbox._swingGetCandles('BBB', '4H');
    ok(d1.candles[d1.candles.length - 1].close === 100 && d4.candles[d4.candles.length - 1].close === 200,
       '5: 1D and 4H are separate keys — one never contaminates the other');

    reset();
    backendImpl = async (sym) => ({ ok: true, status: 200, count: 40,
      candles: dxSeries(SESS_CUR, sym === 'SYMA' ? 11 : 22, 40), reason: null });
    const sa = await sandbox._swingGetCandles('SYMA', '1D');
    const sb2 = await sandbox._swingGetCandles('SYMB', '1D');
    ok(sa.candles[sa.candles.length - 1].close === 11 && sb2.candles[sb2.candles.length - 1].close === 22,
       '5: symbol A never contaminates symbol B');
  }

  section('6. The chart cache stays canonical, and a legacy series never enters it');
  {
    reset();
    backendImpl = serveOk(dxSeries(SESS_CUR, 310.21, 40));
    const r1 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH });
    ok(r1.source === 'TASTYTRADE_DXLINK' && r1.origin === 'backend',
       '6: a fresh chart read is labelled TASTYTRADE_DXLINK');
    const before = dxCalls().length;
    const r2 = await sandbox._swingGetChartCandles('EXPE', '1D', { nowMs: RTH + 1000 });
    ok(r2.source === 'CACHE_FRESH' && dxCalls().length === before,
       '6: a second read 1s later is a cache hit — no duplicate acquisition');

    reset();
    vm.runInContext('S.scanData = [{ ticker: "LEG", candles: __legacy }];',
      Object.assign(sandbox, { __legacy: legacySeries('2026-07-30', 310.21, 40) }));
    backendImpl = serveFail('backend_empty');
    const r3 = await sandbox._swingGetChartCandles('LEG', '1D', { nowMs: RTH });
    ok(r3.ok === false, '6: with only a legacy series available the chart read fails closed');
    ok(!sandbox.S.swing.chartCache[key('LEG', '1D')],
       '6: and nothing is written into the chart cache');
  }

  section('7. Nothing is mutated indirectly');
  {
    reset();
    const store = dxSeries(SESS_CUR, 310.21, 40);
    vm.runInContext('S.squeezeFireScanner.chartCacheCandles = { IMM: { "1D": __c } };',
      Object.assign(sandbox, { __c: store }));
    const snapshot = JSON.stringify(store);
    backendImpl = serveFail('http_503');
    const r = await sandbox._swingGetCandles('IMM', '1D');
    r.candles[0].close = -1;
    ok(JSON.stringify(sandbox.S.squeezeFireScanner.chartCacheCandles.IMM['1D']) === snapshot ||
       store[0].close !== -1,
       '7: the canonical cache is not corrupted through the returned series');
    const legacy = legacySeries('2026-07-30', 310.21, 10);
    const legacySnap = JSON.stringify(legacy);
    vm.runInContext('S.scanData = [{ ticker: "IMM2", candles: __l }];', Object.assign(sandbox, { __l: legacy }));
    await sandbox._swingGetCandles('IMM2', '1D');
    ok(JSON.stringify(legacy) === legacySnap, '7: the refused legacy series is left untouched');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('8. SOURCE-LEVEL GUARDS — the SWING block can never regain a legacy provider');
  {
    // The Swing block, comments stripped: prose may DOCUMENT the removed endpoint, code may not
    // call it. Bounded by the two markers already used by the existing SWING suites.
    const start = HTML.indexOf('// ─── Weekly candle derivation');
    const end = HTML.indexOf('async function _swingRenderSpyContext');
    ok(start > 0 && end > start, '8: the SWING block was located in index.html');
    const block = HTML.slice(start, end);
    const code = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const banned = [
      [/\/market\/candles\//, 'the Railway/Yahoo candles endpoint'],
      [/fetchBackendCandles\s*\(/, 'fetchBackendCandles'],
      [/fetchTwelveData\s*\(/, 'fetchTwelveData'],
      [/fetchAlphaVantage\s*\(/, 'fetchAlphaVantage'],
      [/fetchCandles\s*\(/, 'fetchCandles'],
      [/fetchScannerCandles\s*\(/, 'fetchScannerCandles'],
      [/\bS\.tdKey\b/, 'S.tdKey'],
      [/\bS\.avKey\b/, 'S.avKey'],
      [/twelvedata|alphavantage|yahoo/i, 'a legacy provider hostname'],
    ];
    banned.forEach(([re, label]) => ok(!re.test(code), '8: the SWING block never references ' + label));

    // The reader itself must not consult S.scanData for candles.
    const reader = fn('_swingReadCachedCandles').replace(/\/\/[^\n]*/g, '');
    ok(!/scanData/.test(reader), '8: _swingReadCachedCandles no longer reads S.scanData at all');
    ok(/chartCacheCandles/.test(reader), '8: it reads only the DXLink-fed SFS chart cache');

    const getter = fn('_swingGetCandles').replace(/\/\/[^\n]*/g, '');
    ok(/_sfsFetchBackendCandles/.test(getter), '8: _swingGetCandles acquires only via _sfsFetchBackendCandles');
    ok(!/fetch\s*\(/.test(getter), '8: and performs no transport of its own');
    ok(!/setInterval|setTimeout/.test(getter), '8: no polling and no timer');
    ok(!/for\s*\(|while\s*\(/.test(getter), '8: no retry loop');
    ok(/SWING_CANDLE_SOURCE\.BACKEND/.test(getter) && /SWING_CANDLE_SOURCE\.STALE/.test(getter),
       '8: provenance is set from the shared constants, not ad-hoc strings');
    ok(/LEGACY_REJECTED|LEGACY_PROVIDER_REJECTED/.test(getter),
       '8: the legacy refusal has an explicit diagnostic');

    // Session identity must stay Intl-based: no hardcoded ET offset, no browser timezone.
    ok(!/-0[45]:00|UTC-[45]|\b(?:14400000|18000000)\b/.test(code),
       '8: no hardcoded ET offset in the SWING block');
    ok(!/getTimezoneOffset|new Date\(\)\.getHours\(\)/.test(code),
       '8: no dependence on the browser timezone');
  }

  section('9. The neighbouring contracts are untouched');
  {
    const reader = fn('_swingReadCachedCandles');
    ok(!/_swingDeriveWeeklyCandles|patchLastCandleWithLivePrice/.test(reader),
       '9: the reader does not reach into the weekly aggregator (PR C) or the live patch (PR A)');
    const getter = fn('_swingGetCandles');
    ok(!/chartCache\b|SWING_CHART_CACHE_TTL_MS/.test(getter),
       '9: nor into the PR E chart cache — that stays a layer above');
    ok(/_swingCandleInflight/.test(getter), '9: the existing single-flight guard is reused, not replaced');
    ok(!/_apexParityNormCandle/.test(getter),
       '9: no candle-shape repair here — the volume / short-key work stays out (PR D)');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
