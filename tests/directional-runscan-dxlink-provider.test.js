'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DIRECTIONAL SCANNER — runScan / candidate discovery is Tastytrade/DXLink ONLY.
//
// WHAT CHANGED
//   runScan used to acquire its daily series through the legacy cascade:
//       runScan → fetchScannerCandles → fetchCandles
//               → fetchBackendCandles  GET {BACKEND}/market/candles/{t}?days=300
//                                      (server-side Yahoo Finance)
//               → fetchTwelveData  (S.tdKey)
//               → fetchAlphaVantage (S.avKey)
//   It now acquires it through the SHARED canonical DXLink boundary:
//       runScan → fetchScannerCandles → _scannerFetchDxlinkDailyCandles
//               → _swingCandleTransport → _sfsFetchBackendCandles
//               → GET {BACKEND}/dev/market/candles-dxlink/{symbol}?timeframe=1D
//   Only the ACQUISITION BOUNDARY moved. The indicator formulas, the scoring, the
//   BUY/SELL thresholds, the ranking, the signal labels, the candidate filtering
//   and the >= 60 bar minimum are byte-for-byte the same code.
//
// WHAT THIS SUITE PROVES
//   1. Source-level: no legacy provider is reachable from the runScan closure.
//   2. Runtime: the only network call the scanner makes is the DXLink GET, at 1D.
//   3. Shape: ONE adapter converts the canonical long-key/epoch-ms shape to the
//      short-key/epoch-seconds shape every scanner formula reads — preserving
//      timestamp, OHLC, volume, chronological order and numeric precision, never
//      mutating the backend array or the backend candle objects.
//   3b. THE DAILY SESSION-LABEL CONTRACT. A read-only capture of the backend's own
//      GET /dev/market/candles-dxlink/SPY?timeframe=1D returned 205 bars stamped
//      2026-08-10 / 2026-08-11 / 2026-08-12 at 00:00:00.000Z — three consecutive
//      trading sessions (Mon/Tue/Wed), the newest being the current one, with real
//      volumes in the tens of millions. A daily timestamp is therefore a DATE LABEL
//      for the session, NOT an instant inside it, and converting it to ET moves
//      every daily bar one session backwards.
//   3c. VOLUME survives the whole chain, because the backend really sends it.
//   4. Parity: the SAME OHLCV table, presented in the OLD legacy shape and in the
//      NEW DXLink shape, produces identical indicators, ma50dist, ma200dist,
//      score, signal, strategy, ranking and candidate membership. The ONE allowed
//      difference is `priceDate`, where the legacy 00:00-UTC stamping reported the
//      PREVIOUS ET session and the DXLink session identity reports the real one.
//   5. Bar-count semantics preserved EXACTLY: 59 / 60 / 199 / 200 / 205.
//   6. Request economy: one acquisition per (symbol, 1D), bounded concurrency,
//      symbol isolation, 1D/4H isolation, per-symbol error isolation.
//   7. The PR #359 downstream contract is untouched: S.scanData[].candles is still
//      refused by the SWING reader even though it is now DXLink-derived.
//
// Deterministic and fully OFFLINE: no network, no live data. Time-dependent
// behaviour is driven by injected instants, and timezone independence is proved by
// re-running the adapter in child processes under three different TZ values.
//
// Run: node tests/directional-runscan-dxlink-provider.test.js
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { loadAppJavaScriptSource, extractFunctionSource } = require('./lib/load-app-source');

const SRC = loadAppJavaScriptSource();
const fn = (name) => extractFunctionSource(name, { source: SRC });
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// ─── TZ PROBE MODE ───────────────────────────────────────────────────────────
// When invoked as `node thisfile --tz-probe`, run the REAL adapter over a fixed
// series and print its session dates as JSON. The parent re-runs this under
// several TZ values to prove the adapter never depends on the host timezone.
const TZ_PROBE = process.argv.indexOf('--tz-probe') >= 0;

// ─── Deterministic ET instants (offset probed — no hardcoded UTC offset) ─────
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
const etDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(ms));
// The provider's own daily label, read back in UTC (never Intl, never a local zone).
const utcDate = (ms) => new Date(ms).toISOString().substring(0, 10);
// A 'YYYY-MM-DD' session label → the midnight-UTC stamp the backend emits for it.
const label = (iso) => Date.parse(iso + 'T00:00:00.000Z');

// ─── REAL TRADING SESSIONS, not consecutive calendar days ────────────────────
// Weekend days are not market sessions and must never appear as daily bars in a
// session/week assertion. The sequence is generated from the APPLICATION'S OWN
// market calendar (getUsEquityMarketSession, extracted into a bootstrap sandbox),
// so weekends AND exchange holidays are excluded by the same rules the app uses.
const bootstrap = (function () {
  const sb = { console: { log() {}, warn() {}, error() {} }, Date, Intl, Math, Number, String, Object, isFinite, parseFloat, parseInt, JSON };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(['_etMinutes', '_etDateStr', 'getUsEquityMarketSession'].map(fn).join('\n'), sb);
  return sb;
})();
function isTradingSession(iso) {
  const p = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  // Probe at 12:00 ET so the holiday lookup is inside the day in both EST and EDT.
  const probe = Date.UTC(p[0], p[1] - 1, p[2], 17, 0, 0);
  return !bootstrap.getUsEquityMarketSession(probe).isHoliday;
}
function stepDate(iso, delta) {
  const p = iso.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + delta));
  return d.toISOString().substring(0, 10);
}
// N real trading sessions ending on `lastIso`, ascending.
function tradingSessions(n, lastIso) {
  const out = [];
  let cur = lastIso;
  while (out.length < n) {
    if (isTradingSession(cur)) out.push(cur);
    cur = stepDate(cur, -1);
  }
  return out.reverse();
}

// ─── The ONE OHLCV table both shapes are built from ──────────────────────────
// Deterministic, no randomness, no clock. Values are chosen so the series is not
// monotonic (RSI/MACD/BB/KC/squeeze/HVR all have something to chew on). Volumes
// are realistic share counts in the tens of millions, matching the live capture —
// including its fractional value, so precision is exercised rather than assumed.
function ohlcvTable(n, lastIso) {
  const sessions = tradingSessions(n, lastIso || LAST_SESSION_ISO);
  return sessions.map((iso, k) => {
    const base = 100 + k * 0.35 + Math.sin(k / 6) * 4.25 + Math.cos(k / 17) * 2.5;
    const close = Math.round(base * 10000) / 10000;
    return {
      iso: iso,
      ms: label(iso),                       // the backend's midnight-UTC DATE LABEL
      open: Math.round((close - 0.8123) * 10000) / 10000,
      high: Math.round((close + 1.4567) * 10000) / 10000,
      low: Math.round((close - 1.9876) * 10000) / 10000,
      close: close,
      volume: 66823196.599905 - k * 13137.25,
    };
  });
}
// B. the NEW canonical DXLink shape (long keys, epoch MILLISECONDS)
const asDxlink = (rows) => rows.map((r) => ({ time: r.ms, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }));
// A. the OLD legacy scanner shape (short keys, epoch SECONDS, provider date string).
const asLegacy = (rows) => rows.map((r) => ({
  t: r.ms / 1000, date: r.iso,
  c: r.close, h: r.high, l: r.low, o: r.open, v: r.volume,
}));

// The live capture's newest session: Wed 2026-08-12, stamped 2026-08-12T00:00:00.000Z.
const LAST_SESSION_ISO = '2026-08-12';
const LAST_SESSION = label(LAST_SESSION_ISO);
const NOW_RTH = et(2026, 8, 12, 11, 0);          // mid-session on that same day

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; failures.push(msg); console.log('  FAIL  ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')'); }
function section(t) { if (!TZ_PROBE) console.log('\n' + t); }

// ═════════════════════════════════════════════════════════════════════════════
// SANDBOX BUILDER — the REAL acquisition chain, with the TRANSPORT stubbed only.
// ═════════════════════════════════════════════════════════════════════════════
// Every function below is extracted from the application source, so this harness
// cannot drift from the code it tests. The single seam is global `fetch`.
const ACQUISITION_FNS = [
  // ET / session identity (PR A)
  '_etMinutes', '_etDateStr', 'getUsEquityMarketSession',
  '_backendCandleStoreChartNormTime', '_candleTradingSessionDate', '_apexIsDailyOrCoarserTimeframe', '_apexUtcDateStr', '_apexCandleSessionDate', '_apexWeekBucketFromSessionDate',
  // shared canonical DXLink transport (PR #359) + its detach primitive
  '_swingCloneCandleSeries', '_swingCandleTransport',
  // scanner acquisition boundary + the ONE shape adapter
  '_scannerAdaptDxlinkCandles', '_scannerFetchDxlinkDailyCandles',
  '_scannerDetachCandleSeries', '_scannerCandleCacheKey', '_scannerCandlePumpQueue',
  'fetchScannerCandles',
];
// The candle client itself lives in js/services/candle-dxlink-client.js and is
// pulled in through the same reconstructed source.
const CLIENT_FNS = ['_sfsFetchBackendCandles', '_apexParityNormTime', '_apexParityNormCandle',
  '_apexParityNormCandleArray', '_apexParityExtractBackendCandles', '_sfsExtractBackendCandles'];
// Indicators + scoring, exactly as runScan uses them.
const INDICATOR_FNS = ['smA', 'emA', 'rma', 'calcRSI', 'calcRSIWilder', 'calcMACD', 'calcBB',
  'calcKC', 'calcSqueeze', 'calcHVR', 'macdLabel', 'bbPos', 'scoreStock', 'getSignal', 'getStrategy'];

function makeElement() {
  const el = {
    style: {}, textContent: '', innerHTML: '', disabled: false, value: '',
    classList: { add() {}, remove() {}, contains() { return false; } },
  };
  return el;
}
function makeDocument() {
  const els = Object.create(null);
  return {
    getElementById(id) { return (els[id] || (els[id] = makeElement())); },
    querySelectorAll() { return []; },
    _els: els,
  };
}

// Build a sandbox that can run the REAL runScan end-to-end.
// opts.universe   : [{t,n,i}] watchlist
// opts.serve      : (symbol, tf) => backend JSON body  |  {throwErr}  |  {httpStatus}
// opts.ttConnected: whether DXLink marks are fetched (default false)
// opts.now        : injected instant for the market-session helpers
function makeScanSandbox(opts) {
  opts = opts || {};
  const calls = [];
  const logs = [];
  const sandbox = {
    console: {
      log: (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')),
      warn: () => {}, error: () => {},
    },
    JSON, Object, String, Math, Number, isFinite, isNaN, parseFloat, parseInt, NaN, Infinity,
    Array, Date, Intl, Promise, Set, Map, Error, RegExp, encodeURIComponent,
    setTimeout: (f) => { const id = setTimeout(f, 0); return id; },
    clearTimeout,
    AbortSignal: { timeout: () => ({ __abortSignal: true }) },
    BACKEND: 'https://backend.test',
    document: makeDocument(),
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  // ── Application state + the collaborators runScan needs (all inert stubs) ──
  vm.runInContext(
    'var S = { scanData: [], ttConnected: ' + (opts.ttConnected ? 'true' : 'false') + ', selectedTicker: null,' +
    '  lastScan: null, dataHealth: null, portfolioData: null,' +
    '  squeezeFireScanner: { chartCacheCandles: {}, results: [] }, swing: { chartCache: {} },' +
    '  rsScannerData: [] };' +
    'var WL = [];' +
    'var _scannerCandleCache = Object.create(null); var _scannerCandleInFlight = Object.create(null);' +
    'var _scannerCandleQueue = []; var _scannerCandleActive = 0;' +
    'var _SCANNER_CANDLE_CONCURRENCY = 5;' +
    'var _SCANNER_CANDLE_CACHE_TTL_MS = 600000;' +
    "var _SCANNER_CANDLE_TF = '1D'; var _SCANNER_CANDLE_SOURCE = 'TASTYTRADE_DXLINK';" +
    'var _scannerCandleDiag = { scannerCandleRequestsStarted:0, scannerCandleRequestsDeduped:0,' +
    '  scannerCandleRequestsCached:0, scannerCandleRequestsInFlight:0, scannerCandleQueueLength:0,' +
    '  scannerCandleConcurrencyLimit:0, scannerCandleLastError:null };' +
    'var _swingCandleInflight = {};' +
    "var SWING_CANDLE_SOURCE = { BACKEND:'TASTYTRADE_DXLINK', CACHE:'DXLINK_CACHE', STALE:'DXLINK_STALE_CACHE', NONE:'NONE', ERROR:'ERROR' };" +
    "var SWING_CANDLE_REASON = { BACKEND_DOWN:'DXLINK_BACKEND_UNAVAILABLE', STALE_CACHE:'DXLINK_CANONICAL_CACHE_STALE'," +
    " NO_CANONICAL:'NO_CANONICAL_CANDLES', NON_CANONICAL_REJECTED:'NON_CANONICAL_SERIES_REJECTED' };" +
    'var _scannerRefreshActive = false; var _scannerRefreshUniverse = null;'
    , sandbox);
  vm.runInContext('_SCANNER_CANDLE_CONCURRENCY = ' + (opts.concurrency != null ? opts.concurrency : 5) + ';', sandbox);

  // Real code under test.
  vm.runInContext(ACQUISITION_FNS.concat(CLIENT_FNS, INDICATOR_FNS).map(fn).join('\n'), sandbox);

  // The auth gate / provenance / diagnostics collaborators of the DXLink client:
  // open gate, no-op notes. They are NOT what this suite is testing.
  vm.runInContext(
    'function _backendCandleGateOpen(){ return true; }' +
    "function _backendCandleGateReason(){ return 'open'; }" +
    'function _backendAuthHeaders(extra){ var h = { "x-session-id": "test" }; if(extra){ for(var k in extra) h[k]=extra[k]; } return h; }' +
    'function _noteBackendCandleFailure(){} function _noteBackendCandleSuccess(){}' +
    'function _recordCandleProvenance(){} function _backendGateProvenanceSource(){ return null; }'
    , sandbox);

  // runScan's UI / orchestration collaborators — inert, counted where useful.
  sandbox.__counters = { subscribeQuotes: 0, enrichLive: 0, render: 0, qa: 0, earnings: 0, tt: 0, vix: 0, regime: 0 };
  vm.runInContext(
    'function setP(){} function setAS(){} function logEv(){}' +
    'function showToast(){} function renderScanResults(){ __counters.render++; } function renderRanking(){}' +
    'function renderPanelAlerts(){} function renderDataHealth(){} function renderPortfolioPanel(){}' +
    'function computeMarketRegime(){ __counters.regime++; } function showDetail(){}' +
    'function subscribeDxlinkQuotes(){ __counters.subscribeQuotes++; }' +
    'function enrichScanWithLiveQuotes(){ __counters.enrichLive++; return Promise.resolve(); }' +
    'function runQA(){ __counters.qa++; } function fetchEarningsForAll(){ __counters.earnings++; }' +
    'function enrichWithTT(){ __counters.tt++; } function _ensureVixFamily(){ __counters.vix++; }' +
    'function fetchScannerDXLinkPrices(){ return Promise.resolve({}); }'
    , sandbox);

  // Injected market session: the scanner reads it once per scan.
  const nowMs = opts.now != null ? opts.now : NOW_RTH;
  sandbox.__nowMs = nowMs;
  // Two separate scripts on purpose: a function declaration is hoisted within its
  // own script, so capturing the original must happen in an earlier one.
  vm.runInContext('var __realSession = getUsEquityMarketSession;', sandbox);
  vm.runInContext('function getUsEquityMarketSession(ms){ return __realSession(ms != null ? ms : __nowMs); }', sandbox);

  // ── TRIPWIRES ──────────────────────────────────────────────────────────────
  // Every legacy provider is present in the sandbox and THROWS. If the scanner
  // could still reach one, these turn a silent fallback into a hard failure.
  ['fetchCandles', 'fetchBackendCandles', 'fetchTastytradeCandles', 'fetchTwelveData',
   'fetchAlphaVantage', 'fetchYahooProxy'].forEach((name) => {
    sandbox[name] = function () { calls.push({ kind: 'LEGACY', name: name }); throw new Error('legacy provider called: ' + name); };
  });
  // Legacy provider KEYS are present too: a surviving `S.tdKey` / `S.avKey`
  // branch would light up here rather than being invisible.
  vm.runInContext("S.tdKey = 'TD-KEY-PRESENT'; S.avKey = 'AV-KEY-PRESENT';", sandbox);

  // ── THE ONLY SEAM: global fetch ────────────────────────────────────────────
  let inflight = 0, maxInflight = 0;
  sandbox.fetch = function (url, init) {
    const u = String(url);
    calls.push({ kind: 'FETCH', url: u, headers: (init && init.headers) || null });
    const m = /\/dev\/market\/candles-dxlink\/([^?]+)\?timeframe=(.+)$/.exec(u);
    if (!m) return Promise.reject(new Error('unexpected endpoint: ' + u));
    const symbol = decodeURIComponent(m[1]);
    const tf = decodeURIComponent(m[2]);
    inflight++; if (inflight > maxInflight) maxInflight = inflight;
    const served = opts.serve ? opts.serve(symbol, tf) : { candles: [] };
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        inflight--;
        if (served && served.__throw) { reject(new Error(served.__throw)); return; }
        if (served && served.__status && served.__status !== 200) {
          resolve({ ok: false, status: served.__status, json: async () => ({}) });
          return;
        }
        resolve({ ok: true, status: 200, json: async () => (served && served.__badJson ? Promise.reject(new Error('bad json')) : served) });
      }, 0);
    });
  };
  sandbox.__calls = calls;
  sandbox.__logs = logs;
  sandbox.__stats = () => ({ maxInflight });
  return sandbox;
}

// Load runScan into a prepared sandbox (kept separate so tests can patch the
// boundary BEFORE runScan is defined, for the legacy-shape parity run).
function installRunScan(sandbox) {
  vm.runInContext(fn('runScan'), sandbox);
}
const dxCalls = (sandbox) => sandbox.__calls.filter((c) => c.kind === 'FETCH' && c.url.indexOf('/dev/market/candles-dxlink/') >= 0);
const legacyCalls = (sandbox) => sandbox.__calls.filter((c) => c.kind === 'LEGACY');
const otherFetches = (sandbox) => sandbox.__calls.filter((c) => c.kind === 'FETCH' && c.url.indexOf('/dev/market/candles-dxlink/') < 0);

// ═════════════════════════════════════════════════════════════════════════════
// TZ PROBE — runs the real adapter and prints its output. Used by §4.
// ═════════════════════════════════════════════════════════════════════════════
if (TZ_PROBE) {
  const sb = makeScanSandbox({});
  sb.__probeInput = asDxlink(['2026-08-10', '2026-08-11', '2026-08-12'].map((iso, i) => ({
    iso: iso, ms: label(iso), open: 1 + i, high: 2 + i, low: 0.5 + i, close: 1.5 + i, volume: 66823196.599905,
  })));
  const out = vm.runInContext('JSON.stringify(_scannerAdaptDxlinkCandles(__probeInput))', sb);
  process.stdout.write(out);
  process.exit(0);
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  DIRECTIONAL runScan — TASTYTRADE/DXLINK SOLE CANDLE PROVIDER');
console.log('════════════════════════════════════════════════════════════════════════════════');

(async function () {

// ═════════════════════════════════════════════════════════════════════════════
section('1. SOURCE-LEVEL — no legacy provider is reachable from the runScan closure');
// ═════════════════════════════════════════════════════════════════════════════
{
  const runScanSrc = strip(fn('runScan'));
  const wrapper = strip(fn('fetchScannerCandles'));
  const pump = strip(fn('_scannerCandlePumpQueue'));
  const boundary = strip(fn('_scannerFetchDxlinkDailyCandles'));
  const adapter = strip(fn('_scannerAdaptDxlinkCandles'));
  const transport = strip(fn('_swingCandleTransport'));
  const client = strip(fn('_sfsFetchBackendCandles'));

  // 1. runScan uses the canonical reader, through the throttle wrapper.
  ok(/fetchScannerCandles\s*\(/.test(runScanSrc), '1: runScan acquires candles via fetchScannerCandles');
  ok(/_scannerFetchDxlinkDailyCandles\s*\(/.test(pump), '1: the wrapper pump calls _scannerFetchDxlinkDailyCandles');
  ok(/_swingCandleTransport\s*\(/.test(boundary), '1: the boundary delegates to the SHARED canonical transport');
  ok(/_sfsFetchBackendCandles\s*\(/.test(transport), '1: the shared transport acquires via _sfsFetchBackendCandles');

  // 2 + 3. Endpoint family and timeframe.
  ok(/\/dev\/market\/candles-dxlink\//.test(client), '2: the canonical client GETs /dev/market/candles-dxlink/');
  ok(/timeframe=/.test(client), '3: …with an explicit timeframe query parameter');
  ok(/tf:\s*'1D'/.test(runScanSrc), '3: runScan requests timeframe 1D');

  // The boundary owns no transport, no cache, no auth, no parser of its own.
  ok(!/\bfetch\s*\(/.test(boundary), '1: the boundary performs no fetch of its own (no second client)');
  ok(!/\bfetch\s*\(/.test(adapter), '1: the adapter performs no fetch of its own');
  ok(!/_backendAuthHeaders|x-session-id/.test(boundary + adapter), '1: no second auth implementation');
  ok(!/_apexParityNormCandleArray|_sfsExtractBackendCandles/.test(boundary + adapter),
     '1: no second parser — parsing stays inside the canonical client');
  ok(!/setInterval/.test(boundary + adapter + pump), '1: no polling introduced');
  ok(!/while\s*\(/.test(boundary), '1: no retry loop in the boundary (it fails closed)');

  // 4-9. The whole reachable closure is free of every legacy provider.
  const closure = runScanSrc + wrapper + pump + boundary + adapter + transport + client;
  const banned = [
    [/\byahoo\b/i, '4: no Yahoo reference'],
    [/\/market\/candles\/[^-]/, '5: no /market/candles/{ticker} legacy endpoint'],
    [/days=300/, '5: no days=300 depth request'],
    [/\blimit=/, '5: no limit= parameter added to the canonical GET'],
    [/fetchBackendCandles\s*\(/, '5: fetchBackendCandles is unreachable'],
    [/fetchCandles\s*\(/, '5: fetchCandles is unreachable'],
    [/fetchTwelveData\s*\(/, '6: fetchTwelveData is unreachable'],
    [/twelvedata/i, '6: no TwelveData hostname'],
    [/fetchAlphaVantage\s*\(/, '7: fetchAlphaVantage is unreachable'],
    [/alphavantage/i, '7: no AlphaVantage hostname'],
    [/\bS\.tdKey\b/, '8: no S.tdKey provider branch'],
    [/\bS\.avKey\b/, '9: no S.avKey candle provider branch'],
  ];
  banned.forEach(([re, label]) => ok(!re.test(closure), label));

  // Session identity stays Intl-based inside the adapter.
  ok(!/-0[45]:00|UTC-[45]|\b(?:14400000|18000000)\b/.test(adapter), '1: no hardcoded ET offset in the adapter');
  ok(!/getTimezoneOffset|toISOString/.test(adapter), '1: the adapter never uses the browser timezone or toISOString');
  ok(!/toISOString/.test(runScanSrc), '1: runScan no longer fabricates a date with toISOString');
  ok(/_apexCandleSessionDate\(\s*raw\s*,\s*_SCANNER_CANDLE_TF\s*\)/.test(adapter),
     '1: the adapter stamps the session through the shared resolver, with the DAILY timeframe');
  ok(!/_candleTradingSessionDate/.test(adapter),
     '1: …and never reads a daily stamp as an intraday instant');

  // The legacy functions still EXIST (other surfaces use them) — this PR does not
  // claim a repository-wide removal.
  ok(/\/market\/candles\//.test(fn('fetchBackendCandles')), '1: fetchBackendCandles still exists for other surfaces');
  ok(/twelvedata/i.test(fn('fetchTwelveData')), '1: fetchTwelveData still exists for other surfaces');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2. RUNTIME — the only network call the scanner makes is the DXLink 1D GET');
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = ohlcvTable(205, LAST_SESSION_ISO);
  const sb = makeScanSandbox({ serve: () => ({ candles: asDxlink(rows) }) });
  sb.__in = { sym: 'AAPL' };
  const out = await vm.runInContext("fetchScannerCandles(__in.sym, { reason:'scanner_refresh', tf:'1D', source:'TASTYTRADE_DXLINK' })", sb);

  eq(dxCalls(sb).length, 1, '2: exactly one candles-dxlink GET');
  eq(otherFetches(sb).length, 0, '2: no other HTTP endpoint is touched');
  eq(legacyCalls(sb).length, 0, '2: no legacy provider function is invoked');
  eq(dxCalls(sb)[0].url, 'https://backend.test/dev/market/candles-dxlink/AAPL?timeframe=1D',
     '2: the exact canonical URL — symbol path segment, timeframe=1D, no limit, no days');
  eq(out.length, 205, '2: the caller receives the full 205-bar series');
  ok(dxCalls(sb)[0].headers && dxCalls(sb)[0].headers['x-session-id'] != null,
     '2: the shared auth headers are used (no second auth implementation)');
}

// ═════════════════════════════════════════════════════════════════════════════
section('3. THE ADAPTER — shape, order, precision, volume, and no mutation');
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = ohlcvTable(205, LAST_SESSION_ISO);
  const sb = makeScanSandbox({});
  // Feed the adapter the reader's exact output shape, out of order, frozen-checked.
  const readerOut = asDxlink(rows).slice().reverse();
  const snapshot = JSON.parse(JSON.stringify(readerOut));
  sb.__in = readerOut;
  const adapted = vm.runInContext('_scannerAdaptDxlinkCandles(__in)', sb);

  // 15. Short-key shape, exactly the keys every scanner formula reads.
  const keys = Object.keys(adapted[0]).sort();
  ok(JSON.stringify(keys) === JSON.stringify(['c', 'date', 'h', 'l', 'o', 't', 'v']),
     '15: adapted candles carry exactly {t,date,o,h,l,c,v} — got ' + JSON.stringify(keys));
  eq(adapted.length, 205, '15: every input bar survives the adapter');

  // 17. Chronological order, ascending, even though the input was reversed.
  let ordered = true;
  for (let i = 1; i < adapted.length; i++) if (!(adapted[i].t > adapted[i - 1].t)) ordered = false;
  ok(ordered, '17: the adapted series is strictly ascending in time');

  // Timestamp round-trips EXACTLY to the reader's epoch-ms value.
  let tsExact = true, ohlcExact = true, volExact = true;
  rows.forEach((r, i) => {
    if (adapted[i].t * 1000 !== r.ms) tsExact = false;
    if (adapted[i].o !== r.open || adapted[i].h !== r.high || adapted[i].l !== r.low || adapted[i].c !== r.close) ohlcExact = false;
    if (adapted[i].v !== r.volume) volExact = false;
  });
  ok(tsExact, '15: t*1000 round-trips to the reader\'s epoch-ms timestamp, bar for bar');
  ok(ohlcExact, '15: open/high/low/close carried with full numeric precision (no rounding)');
  // 16. Volume is carried verbatim — never synthesized, never defaulted away.
  ok(volExact, '16: volume is preserved verbatim from the reader');
  eq(adapted[0].v, rows[0].volume, '16: first bar volume preserved');
  eq(adapted[204].v, rows[204].volume, '16: last bar volume preserved');

  // 18. The backend array and the backend candle objects are NOT mutated.
  ok(JSON.stringify(readerOut) === JSON.stringify(snapshot), '18: the backend input array/objects are never mutated');
  ok(adapted[0] !== readerOut[0], '18: the adapter allocates new objects (no aliasing of backend candles)');

  // Missing OHLC falls back to close (legacy reader posture); nothing invented.
  sb.__partial = [{ time: LAST_SESSION, close: 42.5 }];
  const partial = vm.runInContext('_scannerAdaptDxlinkCandles(__partial)', sb);
  eq(partial.length, 1, '15: a close-only bar is kept');
  ok(partial[0].o === 42.5 && partial[0].h === 42.5 && partial[0].l === 42.5, '15: missing OHLC falls back to close');
  eq(partial[0].v, 0, '16: absent volume becomes 0 — it is never invented');

  // Unusable bars are DROPPED, not repaired.
  sb.__junk = [{ time: null, close: 10 }, { time: LAST_SESSION, close: 'x' },
               { time: LAST_SESSION, close: 0 }, null, 'nope', { time: LAST_SESSION, close: 11 }];
  const junk = vm.runInContext('_scannerAdaptDxlinkCandles(__junk)', sb);
  eq(junk.length, 1, '29: bars with no timestamp / no usable close are dropped, not repaired');
  eq(vm.runInContext('_scannerAdaptDxlinkCandles(null).length', sb), 0, '29: a non-array payload adapts to an empty series');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4. THE DAILY SESSION-LABEL CONTRACT — a 1D stamp is a DATE, not an instant');
// ═════════════════════════════════════════════════════════════════════════════
// Captured read-only from GET /dev/market/candles-dxlink/SPY?timeframe=1D:
//   2026-08-10T00:00:00.000Z  2026-08-11T00:00:00.000Z  2026-08-12T00:00:00.000Z
// Mon / Tue / Wed — three consecutive trading sessions, newest = the current one.
// A midnight-UTC daily stamp is the provider's DATE LABEL for that session.
{
  const sb = makeScanSandbox({});
  const S = (iso, tf) => vm.runInContext('_apexCandleSessionDate(__c, __tf)',
    Object.assign(sb, { __c: { time: typeof iso === 'number' ? iso : label(iso) }, __tf: tf }));

  // ── The captured payload, bar for bar ──────────────────────────────────────
  sb.__in = asDxlink(['2026-08-10', '2026-08-11', '2026-08-12'].map((iso, i) => ({
    iso: iso, ms: label(iso), open: 1 + i, high: 2 + i, low: 0.5 + i, close: 1.5 + i, volume: 66823196.599905,
  })));
  const a = vm.runInContext('_scannerAdaptDxlinkCandles(__in)', sb);
  eq(a[2].date, '2026-08-12', '34: 2026-08-12T00:00:00.000Z at 1D IS session 2026-08-12');
  eq(a[1].date, '2026-08-11', '34: 2026-08-11T00:00:00.000Z at 1D IS session 2026-08-11');
  eq(a[0].date, '2026-08-10', '34: 2026-08-10T00:00:00.000Z at 1D IS session 2026-08-10');
  // The reading this replaces, stated explicitly so the regression cannot come back.
  eq(etDate(label('2026-08-12')), '2026-08-11',
     '34: reading that same stamp as an INSTANT gives 2026-08-11 — one session behind the market');
  ok(a.every((c, i) => c.date === ['2026-08-10', '2026-08-11', '2026-08-12'][i]),
     '34: three consecutive sessions stay three consecutive sessions');

  // ── Friday → Monday: no weekend drift in either direction ──────────────────
  eq(S('2026-08-07', '1D'), '2026-08-07', '34: Friday 2026-08-07 daily label stays Friday');
  eq(S('2026-08-10', '1D'), '2026-08-10', '34: Monday 2026-08-10 daily label stays Monday');
  ok(isTradingSession('2026-08-07') && isTradingSession('2026-08-10'),
     '34: …and both are real market sessions (weekends are never used as daily bars)');
  ok(!isTradingSession('2026-08-08') && !isTradingSession('2026-08-09'),
     '34: the intervening Sat/Sun are correctly NOT trading sessions');

  // ── Month boundary ─────────────────────────────────────────────────────────
  eq(S('2026-07-31', '1D'), '2026-07-31', '34: month boundary — Fri 2026-07-31 stays in July');
  eq(S('2026-08-03', '1D'), '2026-08-03', '34: month boundary — Mon 2026-08-03 stays in August');
  eq(S('2026-09-01', '1D'), '2026-09-01', '34: month boundary — 2026-09-01 does not slip to 08-31');

  // ── Year boundary ──────────────────────────────────────────────────────────
  eq(S('2026-12-31', '1D'), '2026-12-31', '34: year boundary — 2026-12-31 stays in 2026');
  eq(S('2027-01-04', '1D'), '2027-01-04', '34: year boundary — 2027-01-04 does not slip to 2027-01-03');
  eq(etDate(label('2027-01-01')), '2026-12-31',
     '34: …whereas the instant reading would have moved 2027-01-01 into the previous YEAR');

  // ── DST: both offsets, and the two transition weeks ────────────────────────
  eq(S('2026-01-15', '1D'), '2026-01-15', '34: EST (UTC-5) — 2026-01-15 stays put');
  eq(S('2026-07-15', '1D'), '2026-07-15', '34: EDT (UTC-4) — 2026-07-15 stays put');
  eq(S('2026-03-09', '1D'), '2026-03-09', '34: the Monday after the EST→EDT switch is itself');
  eq(S('2026-03-06', '1D'), '2026-03-06', '34: the Friday before it is itself');
  eq(S('2026-11-02', '1D'), '2026-11-02', '34: the Monday after the EDT→EST switch is itself');
  eq(S('2026-10-30', '1D'), '2026-10-30', '34: the Friday before it is itself');
  // The label branch does not consult ET at all, so no DST rule can reach it.
  ok(['2026-01-15', '2026-07-15', '2026-03-09', '2026-11-02'].every((d) => S(d, '1D') === d),
     '34: every probed session equals its own label under both offsets');

  // ── THE INTRADAY CONTRACT IS UNCHANGED ─────────────────────────────────────
  const h4Midnight = label('2026-08-12');                 // a calendar-aligned {=4h} block
  eq(S(h4Midnight, '4H'), etDate(h4Midnight),
     '31: a 4H bar at 00:00 UTC keeps the ET-INSTANT reading (2026-08-11) — not the label rule');
  eq(S(et(2026, 8, 12, 13, 30), '4H'), '2026-08-12', '31: a 4H bar at 13:30 ET is session 2026-08-12');
  eq(S(et(2026, 8, 12, 9, 30), '30M'), '2026-08-12', '31: a 30M bar at 09:30 ET is session 2026-08-12');
  eq(S(h4Midnight, null), etDate(h4Midnight),
     '31: with NO timeframe the intraday reading is kept — the change is opt-in, never global');
  // A DAILY bar that is NOT stamped at midnight is still an instant (the DXLink 1D buffer).
  eq(S(et(2026, 8, 12, 9, 30), '1D'), '2026-08-12',
     '31: a 1D bar stamped 09:30 ET is read as an instant and still resolves to its own session');
  eq(S(et(2026, 8, 12, 16, 0), '1D'), '2026-08-12', '31: …and so is one stamped at the 16:00 ET close');

  // ── 33. Timezone independence, proved in child processes ───────────────────
  const probe = (tz) => execFileSync(process.execPath, [__filename, '--tz-probe'],
    { env: Object.assign({}, process.env, { TZ: tz }), encoding: 'utf8' });
  const utc = probe('UTC'), tokyo = probe('Asia/Tokyo'), la = probe('America/Los_Angeles');
  ok(utc === tokyo && tokyo === la, '33: adapter output is byte-identical under TZ=UTC / Asia/Tokyo / America/Los_Angeles');
  const parsed = JSON.parse(utc);
  eq(parsed[0].date, '2026-08-10', '33: …the daily labels are identical in every host timezone');
  eq(parsed[1].date, '2026-08-11', '33: …bar for bar');
  eq(parsed[2].date, '2026-08-12', '33: …including the newest session');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4b. CACHE-SESSION RUNTIME PROOF — a fresh 1D fetch is FRESH, not stale');
// ═════════════════════════════════════════════════════════════════════════════
// Production showed a 0.9-second-old cache being judged stale:
//     CACHE_SESSION_MISMATCH cachedSession=2026-08-11 currentSession=2026-08-12 cacheAgeMs=905
// because the served 1D series' newest label was read as an ET instant. With the
// daily contract the two sides agree and the entry is CACHE_HIT_FRESH.
{
  const sb = makeScanSandbox({});
  vm.runInContext([
    '_swingChartCacheKey', '_swingChartCacheBeginRequest', '_swingChartCacheEvaluate', '_swingChartCachePut',
    '_swingExpectedNewestSessionDate', '_swingSeriesSessionDate', '_swingCandleTimeMs',
    '_swingReadCachedCandles', '_swingEvaluateCanonicalCache', '_swingWeekBucket', '_etWeekBucket',
  ].map(fn).join('\n'), sb);
  vm.runInContext('var SWING_CHART_CACHE_TTL_MS = 180000; var _swingChartCacheSeq = {}; var _swingChartCacheAuthorizedSeq = {};', sb);

  const series = asDxlink(ohlcvTable(205, LAST_SESSION_ISO));
  sb.__series = series;

  // The market's newest produced session at 11:00 ET on 2026-08-12.
  const expected = vm.runInContext('_swingExpectedNewestSessionDate(' + NOW_RTH + ')', sb);
  eq(expected, '2026-08-12', '4b: the market has produced session 2026-08-12 at 11:00 ET that day');

  // What the SERVED 1D series reports as its own session.
  const served = vm.runInContext("_swingSeriesSessionDate(__series, '1D')", sb);
  eq(served, '2026-08-12', '4b: the served 1D series reports the SAME session — no off-by-one');
  eq(vm.runInContext("_swingSeriesSessionDate(__series, '4H')", sb), '2026-08-11',
     '4b: …and reading that identical series as 4H still gives the instant answer (contract is per-timeframe)');

  // Write it, then evaluate it 905 ms later — the exact production timing.
  const put = vm.runInContext("_swingChartCachePut('SPY','1D',__series,'backend'," + NOW_RTH + ",1)", sb);
  eq(put, 'CACHE_WRITTEN', '4b: the fresh backend series is admitted to the chart cache');
  const verdict = vm.runInContext("_swingChartCacheEvaluate(S.swing.chartCache[_swingChartCacheKey('SPY','1D')],'SPY','1D'," + (NOW_RTH + 905) + ")", sb);
  eq(verdict.decision, 'CACHE_HIT_FRESH', '4b: 905 ms later the entry is CACHE_HIT_FRESH — not CACHE_SESSION_MISMATCH');
  eq(verdict.cachedSession, '2026-08-12', '4b: cachedSession is the real session');
  eq(verdict.expectedSession, '2026-08-12', '4b: …and equals currentSession');
  ok(verdict.usable === true, '4b: the entry is usable');

  // The canonical (preferCache) cache used by enrichment agrees.
  vm.runInContext('S.squeezeFireScanner.chartCacheCandles = { SPY: { "1D": __series } };', sb);
  const canon = vm.runInContext("_swingEvaluateCanonicalCache('SPY','1D'," + NOW_RTH + ")", sb);
  eq(canon.cachedSession, '2026-08-12', '4b: the canonical cache reports session 2026-08-12');
  eq(canon.sessionBehind, false, '4b: it is not behind the market');
  ok(canon.usable === true, '4b: …so the preferCache early path can actually fire');

  // A genuinely stale series must STILL be rejected — the fix must not blunt the check.
  sb.__old = asDxlink(ohlcvTable(205, '2026-08-10'));
  vm.runInContext('S.squeezeFireScanner.chartCacheCandles = { SPY: { "1D": __old } };', sb);
  const stale = vm.runInContext("_swingEvaluateCanonicalCache('SPY','1D'," + NOW_RTH + ")", sb);
  eq(stale.cachedSession, '2026-08-10', '4b: a two-session-old series still reports its own older session');
  eq(stale.sessionBehind, true, '4b: …is still judged BEHIND the market');
  ok(stale.usable === false, '4b: …and is still refused — the session check is intact, not weakened');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4c. WEEKLY — each daily label lands in ITS OWN market week');
// ═════════════════════════════════════════════════════════════════════════════
{
  const sb = makeScanSandbox({});
  vm.runInContext([
    '_swingCandleTimeMs', '_swingWeekBucket', '_etWeekBucket', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles',
  ].map(fn).join('\n'), sb);

  // Mon 2026-08-10 … Fri 2026-08-14 — one real market week of daily LABELS.
  const wk = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'];
  ok(wk.every(isTradingSession), '4c: all five fixture days are real trading sessions');
  sb.__wk = wk.map((iso, i) => ({ time: label(iso), open: 100 + i, high: 105 + i, low: 99 + i, close: 102 + i, volume: 1000000 * (i + 1) }));
  const weekly = vm.runInContext('_swingDeriveWeeklyCandles(__wk)', sb);
  eq(weekly.length, 1, '4c: five daily labels derive exactly ONE weekly bar — the Monday is not split off');
  eq(weekly[0].open, 100, '4c: open comes from Monday');
  eq(weekly[0].close, 106, '4c: close comes from Friday');
  eq(weekly[0].volume, 15000000, '4c: the week sums the REAL daily volumes');

  // The Monday label specifically — the bar the instant reading used to misplace.
  const monBucket = vm.runInContext("_apexWeekBucketFromSessionDate(_apexCandleSessionDate({time:" + label('2026-08-10') + "},'1D'))", sb);
  const friBucket = vm.runInContext("_apexWeekBucketFromSessionDate('2026-08-14')", sb);
  eq(monBucket, friBucket, '4c: Mon 2026-08-10 and Fri 2026-08-14 are the SAME market week');
  ok(monBucket !== vm.runInContext('_etWeekBucket(' + label('2026-08-10') + ')', sb),
     '4c: …which the instant reading got wrong (it put that Monday in the previous week)');

  // Two adjacent weeks still separate, in order.
  sb.__two = ['2026-08-06', '2026-08-07', '2026-08-10', '2026-08-11']
    .map((iso, i) => ({ time: label(iso), open: 10 + i, high: 12 + i, low: 9 + i, close: 11 + i, volume: 5 }));
  const two = vm.runInContext('_swingDeriveWeeklyCandles(__two)', sb);
  eq(two.length, 2, '4c: Thu/Fri then Mon/Tue are TWO market weeks');
  eq(two[0].open, 10, '4c: …oldest first, opening on the Thursday');
}

section('5. BAR-COUNT CONTRACT — 59 / 60 / 199 / 200 / 205, semantics preserved');
// ═════════════════════════════════════════════════════════════════════════════
// The >= 60 minimum and the "no MA200 below 200 bars" behaviour are the PRE-EXISTING
// semantics. This PR preserves them EXACTLY; it does not "improve" the formulas.
async function scanOne(nBars, extra) {
  const rows = ohlcvTable(nBars, LAST_SESSION_ISO);
  const sb = makeScanSandbox(Object.assign({ serve: () => ({ candles: asDxlink(rows) }) }, extra || {}));
  vm.runInContext("WL = [{ t:'AAPL', n:'Apple', i:'NDX' }];", sb);
  installRunScan(sb);
  await vm.runInContext('runScan()', sb);
  return { sb, rows, row: vm.runInContext('S.scanData[0] || null', sb),
           health: vm.runInContext('JSON.parse(JSON.stringify(S.dataHealth))', sb) };
}
{
  // 14 — 59 bars: BELOW the minimum. Excluded, counted as a failure, nothing invented.
  const r59 = await scanOne(59);
  eq(r59.row, null, '14 (59 bars): the symbol is EXCLUDED — S.scanData is empty');
  eq(r59.health.failures, 1, '14 (59 bars): it is recorded as a per-symbol failure');
  eq(r59.health.fetched, 0, '14 (59 bars): nothing is fetched into the results');
  eq(dxCalls(r59.sb).length, 1, '14 (59 bars): the backend WAS asked — the refusal is on the count, not the call');
  eq(legacyCalls(r59.sb).length, 0, '14 (59 bars): insufficient data never re-activates a legacy provider');

  // 13 — 60 bars: exactly AT the minimum. Passes; MA200 is NOT invented.
  const r60 = await scanOne(60);
  ok(r60.row != null, '13 (60 bars): the symbol passes the >= 60 minimum');
  eq(r60.row.ma200, null, '13 (60 bars): ma200 is null — no SMA200 is invented from 60 bars');
  eq(r60.row.ma200dist, '+0%', '13 (60 bars): ma200dist keeps its PRE-EXISTING "no MA200" encoding');
  ok(r60.row.ma20 != null && r60.row.ma50 != null, '13 (60 bars): MA20 and MA50 ARE available at 60 bars');
  eq(r60.row.candles.length, 60, '13 (60 bars): the row carries the 60 DXLink bars');

  // 12 — 199 bars: one short of MA200. ma200dist must not be fabricated.
  const r199 = await scanOne(199);
  ok(r199.row != null, '12 (199 bars): the symbol scans');
  eq(r199.row.ma200, null, '12 (199 bars): ma200 is null — SMA200 needs 200 closes and is NOT invented');
  eq(r199.row.ma200dist, '+0%', '12 (199 bars): ma200dist keeps the PRE-EXISTING "no MA200" encoding');
  ok(r199.row.ma50 != null, '12 (199 bars): MA50 is available');

  // 11 — 200 bars: the first bar count at which SMA200 exists.
  const r200 = await scanOne(200);
  ok(r200.row != null, '11 (200 bars): the symbol scans');
  ok(r200.row.ma200 != null, '11 (200 bars): ma200 becomes available at exactly 200 bars');
  ok(r200.row.ma200dist !== '+0%', '11 (200 bars): ma200dist is a real computed distance');
  {
    // …and it is the RIGHT number: (price - SMA200) / SMA200, from the DXLink closes.
    const closes = r200.rows.map((x) => x.close);
    const sma200 = closes.reduce((a, b) => a + b, 0) / 200;
    const price = closes[closes.length - 1];
    const expect = +((price - sma200) / sma200 * 100).toFixed(1);
    eq(r200.row.ma200dist, (expect >= 0 ? '+' : '') + expect + '%', '18/ma200dist: the value matches the DXLink closes exactly');
    eq(r200.row.ma200, sma200.toFixed(2), '11 (200 bars): the reported MA200 equals the mean of the 200 DXLink closes');
  }

  // 10 — 205 bars: the depth the live backend actually serves (observed: SPY 208,
  //      AAPL/META/GOOGL/QCOM/CVS/EXPE 205, source DXLINK_BACKEND_CACHE).
  const r205 = await scanOne(205);
  ok(r205.row != null, '10 (205 bars): the live-equivalent depth scans');
  ok(r205.row.ma200 != null, '10 (205 bars): MA200 is available — 205 bars is enough, 300 was never required');
  ok(r205.row.ma200dist !== '+0%', '10 (205 bars): ma200dist is available at the live depth');
  eq(r205.row.candles.length, 205, '10 (205 bars): all 205 DXLink bars reach S.scanData');
  eq(r205.row.priceDate, LAST_SESSION_ISO, '10 (205 bars): priceDate is the last ET trading session');
  eq(dxCalls(r205.sb).length, 1, '10 (205 bars): one GET for one symbol');
  eq(legacyCalls(r205.sb).length, 0, '10 (205 bars): zero legacy provider calls in a full pass');
}

// ═════════════════════════════════════════════════════════════════════════════
section('6. PARITY — identical OHLCV in the OLD shape and the NEW shape');
// ═════════════════════════════════════════════════════════════════════════════
// The SAME table, presented as the legacy boundary used to present it and as the
// DXLink boundary presents it now, run through the SAME unmodified runScan.
{
  const rows = ohlcvTable(205, LAST_SESSION_ISO);
  const universe = "WL = [{ t:'AAPL', n:'Apple', i:'NDX' }, { t:'META', n:'Meta', i:'NDX' }, { t:'CVS', n:'CVS', i:'SPX' }];";
  const perSymbol = { AAPL: 0, META: 12.5, CVS: -7.25 };
  const shift = (sym) => rows.map((r) => ({ ms: r.ms, open: r.open + perSymbol[sym], high: r.high + perSymbol[sym],
    low: r.low + perSymbol[sym], close: r.close + perSymbol[sym], volume: r.volume }));

  // NEW: the real acquisition chain, DXLink shape in, adapter converts.
  const sbNew = makeScanSandbox({ serve: (sym) => ({ candles: asDxlink(shift(sym)) }) });
  vm.runInContext(universe, sbNew);
  installRunScan(sbNew);
  await vm.runInContext('runScan()', sbNew);
  const newRows = vm.runInContext('JSON.parse(JSON.stringify(S.scanData))', sbNew);

  // OLD: the SAME runScan, but the boundary hands back the legacy short-key series
  // built from the SAME OHLCV table — i.e. exactly the pre-migration input.
  const sbOld = makeScanSandbox({});
  vm.runInContext(universe, sbOld);
  sbOld.__legacy = {}; Object.keys(perSymbol).forEach((s) => { sbOld.__legacy[s] = asLegacy(shift(s)); });
  vm.runInContext('function fetchScannerCandles(ticker){ return Promise.resolve(__legacy[ticker].map(function(c){ return Object.assign({}, c); })); }', sbOld);
  installRunScan(sbOld);
  await vm.runInContext('runScan()', sbOld);
  const oldRows = vm.runInContext('JSON.parse(JSON.stringify(S.scanData))', sbOld);

  eq(newRows.length, 3, '22: the DXLink run produces 3 candidate rows');
  eq(oldRows.length, 3, '22: the legacy-shape run produces 3 candidate rows');

  // 22 — candidate list parity: same symbols, SAME RANKING ORDER.
  eq(newRows.map((r) => r.ticker).join(','), oldRows.map((r) => r.ticker).join(','),
     '22: candidate list and ranking order are identical');

  // 19/20/21 — every indicator, score, signal and derived field is identical.
  const PARITY_FIELDS = ['ticker', 'name', 'index', 'price', 'change', 'score', 'signal', 'rsi', 'macd',
    'squeezeFired', 'ma20dist', 'ma50dist', 'ma200dist', 'bbPos', 'squeeze', 'hvRank', 'strategy',
    'bbUpper', 'bbLower', 'ma20', 'ma50', 'ma200', '_priceSource'];
  let allEqual = true; const diffs = [];
  newRows.forEach((nr, i) => {
    const or = oldRows[i];
    PARITY_FIELDS.forEach((f) => {
      if (JSON.stringify(nr[f]) !== JSON.stringify(or[f])) { allEqual = false; diffs.push(nr.ticker + '.' + f + ': ' + JSON.stringify(or[f]) + ' → ' + JSON.stringify(nr[f])); }
    });
  });
  ok(allEqual, '19/20/21: indicator, scoring and signal parity across all rows and all fields' + (diffs.length ? ' — DIFFS: ' + diffs.join('; ') : ''));
  // Spelled out for the specific fields the migration brief names.
  eq(newRows[0].ma50dist, oldRows[0].ma50dist, '19: ma50dist parity');
  eq(newRows[0].ma200dist, oldRows[0].ma200dist, '19: ma200dist parity');
  eq(newRows[0].score, oldRows[0].score, '20: score parity');
  eq(newRows[0].signal, oldRows[0].signal, '21: signal parity');
  eq(newRows[0].strategy, oldRows[0].strategy, '21: strategy label parity');
  eq(newRows[0].rsi, oldRows[0].rsi, '19: RSI parity');
  eq(newRows[0].macd, oldRows[0].macd, '19: MACD label parity');
  eq(newRows[0].hvRank, oldRows[0].hvRank, '19: HV rank parity');
  eq(newRows[0].squeeze, oldRows[0].squeeze, '19: squeeze state parity');
  eq(newRows[0].bbPos, oldRows[0].bbPos, '19: Bollinger position parity');

  // The candle payload itself carries the same timestamps and OHLC in both runs.
  const nc = newRows[0].candles, oc = oldRows[0].candles;
  eq(nc.length, oc.length, '19: same bar count reaches the row in both shapes');
  let ohlcSame = true;
  for (let i = 0; i < nc.length; i++) {
    if (nc[i].o !== oc[i].o || nc[i].h !== oc[i].h || nc[i].l !== oc[i].l || nc[i].c !== oc[i].c || nc[i].t !== oc[i].t) ohlcSame = false;
  }
  ok(ohlcSame, '19: t/o/h/l/c are identical bar-for-bar after normalization');

  // 16. VOLUME SURVIVES THE WHOLE CHAIN. It used to be discarded by the shared
  // normalizer (_apexParityNormCandle returned {t,o,h,l,c}, and the client then
  // rebuilt `volume: c.v || 0`), so every DXLink-fed series arrived with volume 0
  // while the backend was really sending tens of millions of shares per bar.
  ok(nc.every((c, i) => c.v === oc[i].v), '16: volume is identical bar-for-bar in both shapes');
  ok(nc.every((c) => c.v > 0), '16: …and it is the real non-zero backend volume, not a zero default');
  eq(nc[nc.length - 1].v, rows[rows.length - 1].volume, '16: the newest bar carries the exact captured volume');

  // Volume is DATA, not authority metadata: no scored field reads it, so preserving
  // it cannot move an indicator or a score.
  const scoredSrc = strip(fn('runScan') + fn('smA') + fn('calcRSI') + fn('calcMACD') + fn('calcBB') +
    fn('calcKC') + fn('calcSqueeze') + fn('calcHVR') + fn('scoreStock') + fn('getSignal') + fn('getStrategy'));
  ok(!/\.\s*v\b|\bvolume\b/.test(scoredSrc), '16: no scored field reads volume — indicator/score parity is unaffected');

  // priceDate: with the DAILY LABEL contract the two runs AGREE, because the backend's
  // label and the legacy provider's `date` string name the same session. The earlier
  // claim that a 00:00-UTC stamp had to be corrected to the previous ET day is WITHDRAWN
  // — the capture shows that stamp IS the session, so there is no residual difference
  // between the shapes at all.
  eq(newRows[0].priceDate, LAST_SESSION_ISO, '34: the DXLink run reports the captured session as priceDate');
  eq(oldRows[0].priceDate, newRows[0].priceDate, '34: legacy and DXLink priceDate AGREE — parity is now total');
  {
    // The OLD expression, evaluated on the legacy last bar, agrees too: a midnight-UTC
    // stamp's UTC calendar day IS the session label. What was actually wrong was reading
    // it as an ET instant, which no path does any more.
    const legacyLast = asLegacy(rows)[rows.length - 1];
    const oldPriceDate = legacyLast.date || new Date(legacyLast.t * 1000).toISOString().substring(0, 10);
    eq(oldPriceDate, LAST_SESSION_ISO, '34: the OLD priceDate expression names the same session');
    eq(etDate(legacyLast.t * 1000), '2026-08-11',
       '34: …while an ET-INSTANT reading of it names 2026-08-11 — the reading this PR removes');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('7. S.scanData — written correctly, and still refused downstream (PR #359)');
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = ohlcvTable(205, LAST_SESSION_ISO);
  const sb = makeScanSandbox({ serve: (sym) => ({ candles: asDxlink(rows.map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (sym === 'META' ? 20 : 0), volume: r.volume }))) }) });
  vm.runInContext("WL = [{ t:'AAPL', n:'Apple', i:'NDX' }, { t:'META', n:'Meta', i:'NDX' }];", sb);
  installRunScan(sb);
  await vm.runInContext('runScan()', sb);

  // 23. The scanner result rows are written, sorted, and derived from DXLink bars.
  eq(vm.runInContext('S.scanData.length', sb), 2, '23: S.scanData holds one row per scanned symbol');
  ok(vm.runInContext('S.scanData[0].score >= S.scanData[1].score', sb), '23: rows are ranked by score, descending');
  ok(vm.runInContext('S.scanData.every(function(d){ return d.candles && d.candles.length === 205; })', sb),
     '23: every row carries its 205 DXLink bars');
  ok(vm.runInContext("S.scanData.every(function(d){ return d.priceDate === '" + LAST_SESSION_ISO + "'; })", sb),
     '23: every row is stamped with the last ET trading session');
  eq(vm.runInContext('S.dataHealth.fetched', sb), 2, '23: dataHealth reflects the scan');
  eq(vm.runInContext('S.dataHealth.failures', sb), 0, '23: no failures on the happy path');
  ok(vm.runInContext('_scannerRefreshActive === false && _scannerRefreshUniverse === null', sb),
     '23: the scanner_refresh guard is always released (try/finally)');

  // 24 + 35. THE PR #359 CONTRACT IS UNCHANGED. S.scanData[].candles is DXLink-derived
  // now, and the SWING downstream reader STILL refuses it: the contract is an ingress
  // list, not a provenance guess. No CACHE_FALLBACK is reintroduced.
  const dsb = makeScanSandbox({});
  vm.runInContext([
    '_swingLogChartCandles', '_swingReadCachedCandles', '_swingNonCanonicalSeriesPresent',
    '_swingDetachCandleResult', '_swingEvaluateCanonicalCache', '_swingCandleReadFailed',
    '_swingGetCandles', '_swingFetchContextCandles', '_swingExpectedNewestSessionDate',
    '_swingSeriesSessionDate',
  ].map(fn).join('\n'), dsb);
  // The scanner's rows are present…
  dsb.__scan = vm.runInContext('JSON.parse(JSON.stringify(S.scanData))', sb);
  vm.runInContext('S.scanData = __scan;', dsb);
  // …and the candle store is DOWN, so the row is the only 1D series in existence.
  vm.runInContext('function _sfsFetchBackendCandles(){ return Promise.resolve({ ok:false, status:0, count:0, reason:"http_503" }); }', dsb);
  const res = await vm.runInContext("_swingGetCandles('AAPL','1D',{ nowMs: " + NOW_RTH + " })", dsb);
  eq(res.ok, false, '24: with the store down the SWING read FAILS CLOSED');
  eq(res.source, 'NONE', '24: …with source NONE');
  eq(res.reason, 'NON_CANONICAL_SERIES_REJECTED', '24: …and an explicit refusal reason');
  eq(res.candles.length, 0, '24: S.scanData[].candles never becomes the served series');
  ok(!/scanData/.test(strip(fn('_swingReadCachedCandles'))), '35: the downstream reader still never reads S.scanData');
  ok(!/CACHE_FALLBACK/.test(strip(SRC)), '24: the old CACHE_FALLBACK branch is not reintroduced anywhere (it survives only in comments)');

  // …and when the store IS up, the downstream is fed by DXLink, as before.
  vm.runInContext('function _sfsFetchBackendCandles(){ return Promise.resolve({ ok:true, status:200, count:2, candles:[{time:' + (LAST_SESSION - DAY) + ',open:1,high:2,low:0.5,close:1.5,volume:0},{time:' + LAST_SESSION + ',open:2,high:3,low:1.5,close:2.5,volume:0}] }); }', dsb);
  vm.runInContext('_swingCandleInflight = {};', dsb);
  const res2 = await vm.runInContext("_swingGetCandles('AAPL','1D',{ nowMs: " + NOW_RTH + " })", dsb);
  eq(res2.source, 'TASTYTRADE_DXLINK', '35: with the store up the downstream is fed by DXLink, unchanged');
}

// ═════════════════════════════════════════════════════════════════════════════
section('8. REQUEST ECONOMY — one acquisition per symbol, bounded, isolated');
// ═════════════════════════════════════════════════════════════════════════════
{
  // 25. One GET per symbol across a whole scan — no N+1, no duplicate work.
  const rows = ohlcvTable(205, LAST_SESSION_ISO);
  const sb = makeScanSandbox({ serve: () => ({ candles: asDxlink(rows) }) });
  const universe = Array.from({ length: 12 }, (_, i) => "{ t:'SYM" + i + "', n:'n', i:'x' }").join(',');
  vm.runInContext('WL = [' + universe + '];', sb);
  installRunScan(sb);
  await vm.runInContext('runScan()', sb);
  eq(dxCalls(sb).length, 12, '25: exactly one candles-dxlink GET per symbol (12 symbols → 12 GETs)');
  const symbols = dxCalls(sb).map((c) => /candles-dxlink\/([^?]+)/.exec(c.url)[1]);
  eq(new Set(symbols).size, 12, '25: twelve DISTINCT symbols — no symbol is requested twice');
  eq(vm.runInContext('S.scanData.length', sb), 12, '25: all twelve are scored');
  ok(dxCalls(sb).every((c) => /timeframe=1D$/.test(c.url)), '31: every scanner GET is 1D — the scanner never asks for 4H');

  // 25 (dedup). Two concurrent requests for the SAME (symbol,1D) share ONE GET.
  const sb2 = makeScanSandbox({ serve: () => ({ candles: asDxlink(rows) }) });
  const both = await vm.runInContext(
    "Promise.all([fetchScannerCandles('AAPL',{tf:'1D',source:'TASTYTRADE_DXLINK'}), fetchScannerCandles('AAPL',{tf:'1D',source:'TASTYTRADE_DXLINK'})])", sb2);
  eq(dxCalls(sb2).length, 1, '25: two concurrent reads of the same (symbol,1D) collapse onto ONE GET');
  ok(both[0] !== both[1], '25: …but each caller receives its OWN detached array');
  ok(both[0][0] !== both[1][0], '25: …with its own candle objects (the boundary keeps its detach promise)');
  both[0][0].c = -999;
  ok(both[1][0].c !== -999, '25: mutating one caller\'s series cannot reach another caller');
  const third = await vm.runInContext("fetchScannerCandles('AAPL',{tf:'1D',source:'TASTYTRADE_DXLINK'})", sb2);
  eq(dxCalls(sb2).length, 1, '25: a later read inside the TTL is served from cache — still one GET');
  third[0].c = -111;
  const fourth = await vm.runInContext("fetchScannerCandles('AAPL',{tf:'1D',source:'TASTYTRADE_DXLINK'})", sb2);
  ok(fourth[0].c !== -111, '25: the cache is detached too — a consumer cannot write through it');

  // 26. Bounded concurrency: the pool cap is respected under a burst.
  const sb3 = makeScanSandbox({ serve: () => ({ candles: asDxlink(rows) }), concurrency: 5 });
  const burst = Array.from({ length: 24 }, (_, i) => "fetchScannerCandles('B" + i + "',{tf:'1D',source:'TASTYTRADE_DXLINK'})").join(',');
  await vm.runInContext('Promise.all([' + burst + '])', sb3);
  eq(dxCalls(sb3).length, 24, '26: 24 distinct symbols → 24 GETs');
  ok(sb3.__stats().maxInflight <= 5, '26: never more than 5 GETs in flight (bound preserved) — peak ' + sb3.__stats().maxInflight);
  ok(sb3.__stats().maxInflight > 1, '26: …and the pool really is concurrent, not serialized — peak ' + sb3.__stats().maxInflight);

  // 32. Symbol isolation: each symbol gets ITS OWN series, never a neighbour's.
  const sb4 = makeScanSandbox({ serve: (sym) => ({ candles: asDxlink(ohlcvTable(205, LAST_SESSION_ISO).map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (sym === 'BBB' ? 500 : 0), volume: r.volume }))) }) });
  vm.runInContext("WL = [{ t:'AAA', n:'a', i:'x' }, { t:'BBB', n:'b', i:'x' }];", sb4);
  installRunScan(sb4);
  await vm.runInContext('runScan()', sb4);
  const aaa = vm.runInContext("S.scanData.find(function(d){return d.ticker==='AAA';}).candles", sb4);
  const bbb = vm.runInContext("S.scanData.find(function(d){return d.ticker==='BBB';}).candles", sb4);
  ok(Math.abs(bbb[bbb.length - 1].c - aaa[aaa.length - 1].c - 500) < 1e-9, '32: each symbol carries its own series (no cross-symbol contamination)');

  // 31. 1D / 4H isolation at the transport: the cache key and the single-flight key
  //     both carry the timeframe, so a 4H read can never satisfy a 1D read.
  const sb5 = makeScanSandbox({ serve: (sym, tf) => ({ candles: asDxlink(ohlcvTable(205, LAST_SESSION_ISO).map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (tf === '4H' ? 900 : 0), volume: r.volume }))) }) });
  const [d1, h4] = await vm.runInContext(
    "Promise.all([fetchScannerCandles('SPY',{tf:'1D',source:'TASTYTRADE_DXLINK'}), fetchScannerCandles('SPY',{tf:'4H',source:'TASTYTRADE_DXLINK'})])", sb5);
  eq(dxCalls(sb5).length, 2, '31: 1D and 4H are two SEPARATE GETs for the same symbol');
  const tfs = dxCalls(sb5).map((c) => /timeframe=(.+)$/.exec(c.url)[1]).sort();
  eq(tfs.join(','), '1D,4H', '31: …one per timeframe');
  ok(Math.abs(h4[h4.length - 1].c - d1[d1.length - 1].c - 900) < 1e-9, '31: the 4H series never leaks into the 1D result');
  eq(vm.runInContext("_scannerCandleCacheKey('SPY',{tf:'1D',source:'TASTYTRADE_DXLINK'})", sb5), 'SPY|tf=1D|source=TASTYTRADE_DXLINK',
     '31: the cache key is (symbol, timeframe, provenance) — and carries no days/limit');
  ok(vm.runInContext("_scannerCandleCacheKey('SPY',{tf:'1D',source:'TASTYTRADE_DXLINK'}) !== _scannerCandleCacheKey('SPY',{tf:'4H',source:'TASTYTRADE_DXLINK'})", sb5),
     '31: 1D and 4H are distinct cache identities');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9. ERROR HANDLING — isolated, explicit, and never a legacy fallback');
// ═════════════════════════════════════════════════════════════════════════════
{
  const good = asDxlink(ohlcvTable(205, LAST_SESSION_ISO));
  const cases = [
    ['28: HTTP 500', { __status: 500 }],
    ['30: empty payload', { candles: [] }],
    ['29: malformed payload (candles is not an array)', { candles: { nope: true } }],
    ['29: malformed payload (bars with no timestamp/close)', { candles: [{ foo: 1 }, { bar: 2 }] }],
    ['29: unparseable JSON body', { __badJson: true }],
    ['28: transport throw (abort / network down)', { __throw: 'AbortError: signal timed out' }],
  ];
  for (const [label, bad] of cases) {
    const sb = makeScanSandbox({ serve: (sym) => (sym === 'BAD' ? bad : { candles: good }) });
    vm.runInContext("WL = [{ t:'BAD', n:'bad', i:'x' }, { t:'OK1', n:'ok', i:'x' }, { t:'OK2', n:'ok', i:'x' }];", sb);
    installRunScan(sb);
    await vm.runInContext('runScan()', sb);
    const tickers = vm.runInContext('S.scanData.map(function(d){return d.ticker;}).sort().join(",")', sb);
    eq(tickers, 'OK1,OK2', label + ' — the failing symbol is excluded, the scan continues');
    eq(vm.runInContext('S.dataHealth.failures', sb), 1, label + ' — recorded as exactly one per-symbol failure');
    eq(legacyCalls(sb).length, 0, label + ' — no Yahoo / TwelveData / AlphaVantage fallback is attempted');
    eq(otherFetches(sb).length, 0, label + ' — no other endpoint is tried');
    ok(vm.runInContext('S.scanData.every(function(d){ return d.candles.length === 205; })', sb),
       label + ' — no invented candles anywhere in the result');
    ok(vm.runInContext('_scannerRefreshActive === false', sb), label + ' — the scan guard is released');
  }

  // 27. Cancel/abort: an aborted transport is a per-symbol failure, and an abort of
  //     the WHOLE universe leaves no results, no guard and no legacy retry.
  const sbAll = makeScanSandbox({ serve: () => ({ __throw: 'AbortError: signal timed out' }) });
  vm.runInContext("WL = [{ t:'A', n:'a', i:'x' }, { t:'B', n:'b', i:'x' }];", sbAll);
  installRunScan(sbAll);
  await vm.runInContext('runScan()', sbAll);
  eq(vm.runInContext('S.scanData.length', sbAll), 0, '27: a fully aborted scan produces NO rows (nothing invented)');
  eq(vm.runInContext('S.dataHealth.failures', sbAll), 2, '27: every symbol is recorded as a failure');
  eq(legacyCalls(sbAll).length, 0, '27: an abort never re-activates a legacy provider');
  ok(vm.runInContext('_scannerRefreshActive === false && _scannerRefreshUniverse === null', sbAll),
     '27: the scanner_refresh guard is released after an aborted scan');
  // The canonical client passes an abort signal — cancellation is real, not simulated.
  ok(/AbortSignal\.timeout/.test(fn('_sfsFetchBackendCandles')), '27: the canonical GET carries an AbortSignal timeout');
}

// ═════════════════════════════════════════════════════════════════════════════
section('10. END-TO-END — scanner → S.scanData → candidate discovery → downstream');
// ═════════════════════════════════════════════════════════════════════════════
// One deterministic offline probe over as much of the REAL chain as exists:
//   runScan → DXLink client → adapter → indicators → scoring → S.scanData
//           → _swingTabCandidatesRaw (candidate discovery)
//           → _swingGetCandles (downstream enrichment) → weekly derivation.
{
  const rows = ohlcvTable(205, LAST_SESSION_ISO);
  const serve = (sym) => ({ candles: asDxlink(rows.map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (sym === 'META' ? 18 : sym === 'CVS' ? -6 : 0), volume: r.volume }))) });
  const sb = makeScanSandbox({ serve });
  vm.runInContext("WL = [{ t:'AAPL', n:'Apple', i:'NDX' }, { t:'META', n:'Meta', i:'NDX' }, { t:'CVS', n:'CVS', i:'SPX' }];", sb);
  // The downstream half of the chain, real code, same sandbox.
  vm.runInContext([
    '_swingLogChartCandles', '_swingReadCachedCandles', '_swingNonCanonicalSeriesPresent',
    '_swingDetachCandleResult', '_swingEvaluateCanonicalCache', '_swingCandleReadFailed',
    '_swingGetCandles', '_swingFetchContextCandles', '_swingExpectedNewestSessionDate',
    '_swingSeriesSessionDate', '_swingTabCandidatesRaw',
    '_swingCandleTimeMs', '_etWeekBucket', '_swingWeekBucket', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles',
  ].map(fn).join('\n'), sb);
  vm.runInContext("var S_swingTabStub = null; if(!S.swing) S.swing = {}; S.swing.activeTab='directional';", sb);
  installRunScan(sb);

  await vm.runInContext('runScan()', sb);

  // Candidate discovery is fed by the DXLink-derived scan.
  const cands = vm.runInContext("JSON.parse(JSON.stringify(_swingTabCandidatesRaw('directional')))", sb);
  ok(cands.length >= 1, 'E2E: candidate discovery yields candidates from the DXLink-fed scan (' + cands.length + ')');
  ok(cands.every((c) => ['AAPL', 'META', 'CVS'].indexOf(c.symbol) >= 0), 'E2E: every candidate comes from the scanned universe');
  ok(!JSON.stringify(cands).includes('candles'), 'E2E: the candidate list carries ticker + direction only — never candles');

  const beforeDownstream = dxCalls(sb).length;
  eq(beforeDownstream, 3, 'E2E: the scan itself issued exactly 3 GETs (one per symbol)');

  // Downstream enrichment for a candidate: same shared transport, same store.
  const enriched = await vm.runInContext("_swingGetCandles('AAPL','1D',{ nowMs: " + NOW_RTH + " })", sb);
  eq(enriched.source, 'TASTYTRADE_DXLINK', 'E2E: downstream enrichment is fed by DXLink');
  eq(enriched.candles.length, 205, 'E2E: downstream receives the full 205-bar DXLink series');
  eq(legacyCalls(sb).length, 0, 'E2E: ZERO legacy provider calls in the full scanner → downstream flow');
  eq(otherFetches(sb).length, 0, 'E2E: no endpoint outside /dev/market/candles-dxlink/ is touched');

  // ma200dist really is available at the live-observed depth.
  const aaplRow = vm.runInContext("JSON.parse(JSON.stringify(S.scanData.find(function(d){return d.ticker==='AAPL';})))", sb);
  ok(aaplRow.ma200 != null && aaplRow.ma200dist !== '+0%', 'E2E: ma200dist is available with 205 bars');
  eq(aaplRow.priceDate, LAST_SESSION_ISO, 'E2E: the last ET session is reported correctly');

  // No week split: the weekly derivation over the DXLink series puts each ET week in
  // exactly one bucket. A 00:00-UTC-stamped series would split the Monday.
  const last15 = rows.slice(-15);
  const weekly = vm.runInContext('JSON.parse(JSON.stringify(_swingDeriveWeeklyCandles(' + JSON.stringify(asDxlink(last15)) + ')))', sb);
  // Week identity comes from the SESSION LABEL — the same rule the aggregator uses —
  // not from an ET reading of the bar's instant, which is what split weeks before.
  const buckets = weekly.map((w) => vm.runInContext("_apexWeekBucketFromSessionDate(_apexCandleSessionDate({time:" + w.time + "},'1D'))", sb));
  eq(new Set(buckets).size, buckets.length, 'E2E: every weekly bar has a DISTINCT market-week bucket — no week split');
  // 15 real trading sessions span exactly the number of distinct market weeks their
  // labels occupy — computed from the fixture, never assumed.
  const expectedWeeks = new Set(last15.map((r) => vm.runInContext("_apexWeekBucketFromSessionDate('" + r.iso + "')", sb))).size;
  eq(weekly.length, expectedWeeks, 'E2E: 15 trading sessions derive exactly one bar per market week they occupy');
  ok(weekly.every((w) => w.volume > 0), 'E2E: the weekly bars carry summed REAL volume, not zeros');

  // Progressive rendering is not blocked: the render collaborators still run.
  ok(sb.__counters.render > 0, 'E2E: renderScanResults still runs (progressive rendering is not blocked)');
  ok(sb.__counters.subscribeQuotes === 1 && sb.__counters.qa >= 0, 'E2E: post-scan orchestration is unchanged');
}

// ═════════════════════════════════════════════════════════════════════════════
section('10b. VOLUME END-TO-END — the raw backend number survives every hop');
// ═════════════════════════════════════════════════════════════════════════════
// raw backend body → _apexParityNormCandle → _sfsFetchBackendCandles
//   → _swingCandleTransport → _scannerAdaptDxlinkCandles → S.scanData
// asserted NUMERICALLY at every hop, with the exact value from the live capture.
{
  const V = 66823196.599905;
  const sessions = tradingSessions(205, LAST_SESSION_ISO);
  const rawBody = { candles: sessions.map((iso, i) => ({
    time: label(iso), open: 100 + i * 0.1, high: 101 + i * 0.1, low: 99 + i * 0.1,
    close: 100.5 + i * 0.1, volume: i === sessions.length - 1 ? V : V - i,
  })) };

  const sb = makeScanSandbox({ serve: () => rawBody });
  vm.runInContext([
    '_mapBackendCandlesForChart', '_scannerMapBackendCandlesForChart',
    '_swingCandleTimeMs', '_swingWeekBucket', '_etWeekBucket', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles',
  ].map(fn).join('\n'), sb);

  // HOP 1 — the shared normalizer.
  sb.__raw = rawBody.candles;
  const normed = vm.runInContext('_apexParityNormCandleArray(__raw)', sb);
  eq(normed.length, 205, '10b/hop1: the normalizer keeps every bar');
  eq(normed[204].v, V, '10b/hop1: _apexParityNormCandle CARRIES volume — ' + V);
  ok(normed.every((c) => c.v > 0), '10b/hop1: …for every bar, none zeroed');
  ok(Object.keys(normed[0]).sort().join(',') === 'c,h,l,o,t,v',
     '10b/hop1: the normalized shape is exactly {t,o,h,l,c,v} — OHLCV, and nothing else');

  // HOP 2 — the canonical client (a real fetch through the stubbed transport).
  const client = await vm.runInContext("_sfsFetchBackendCandles('SPY','1D')", sb);
  eq(client.candles[204].volume, V, '10b/hop2: _sfsFetchBackendCandles returns the same number');

  // HOP 3 — the shared single-flight transport.
  vm.runInContext('_swingCandleInflight = {};', sb);
  const transported = await vm.runInContext("_swingCandleTransport('SPY','1D')", sb);
  eq(transported.candles[204].volume, V, '10b/hop3: _swingCandleTransport preserves it');

  // HOP 4 — the scanner shape adapter.
  sb.__t = transported.candles;
  const adapted = vm.runInContext('_scannerAdaptDxlinkCandles(__t)', sb);
  eq(adapted[204].v, V, '10b/hop4: _scannerAdaptDxlinkCandles preserves it (short-key `v`)');

  // HOP 5 — S.scanData, through the real runScan.
  vm.runInContext("WL = [{ t:'SPY', n:'S&P 500', i:'SPX' }];", sb);
  installRunScan(sb);
  await vm.runInContext('runScan()', sb);
  const rowCandles = vm.runInContext('JSON.parse(JSON.stringify(S.scanData[0].candles))', sb);
  eq(rowCandles.length, 205, '10b/hop5: the scanner row carries all 205 bars');
  eq(rowCandles[204].v, V, '10b/hop5: S.scanData[].candles carries the exact backend volume');
  ok(rowCandles.every((c) => c.v > 0), '10b/hop5: …and every bar has real volume, none defaulted to 0');

  // THE CHART PATH gets the same number.
  sb.__norm = normed;
  const chart = vm.runInContext('_mapBackendCandlesForChart(__norm)', sb);
  eq(chart[204].volume, V, '10b/chart: _mapBackendCandlesForChart passes the real volume through');
  const scChart = vm.runInContext('_scannerMapBackendCandlesForChart(__norm)', sb);
  eq(scChart[204].volume, V, '10b/chart: _scannerMapBackendCandlesForChart likewise');

  // THE WEEKLY PATH sums real volume instead of summing zeros.
  sb.__wkin = transported.candles.slice(-5);
  const wk = vm.runInContext('_swingDeriveWeeklyCandles(__wkin)', sb);
  const sum = transported.candles.slice(-5).reduce((a, c) => a + c.volume, 0);
  ok(wk.length >= 1, '10b/weekly: the weekly derivation produces bars');
  const wkSum = wk.reduce((a, b) => a + b.volume, 0);
  ok(Math.abs(wkSum - sum) < 1e-6 && sum > 0,
     '10b/weekly: the weekly bars sum to the REAL daily volume total (' + wkSum + ' vs ' + sum + ')');

  // An absent / invalid / negative volume still normalizes to 0 — nothing is invented.
  sb.__edge = [{ time: label('2026-08-12'), close: 10 },
               { time: label('2026-08-11'), close: 10, volume: 'x' },
               { time: label('2026-08-10'), close: 10, volume: -5 }];
  const edge = vm.runInContext('_apexParityNormCandleArray(__edge)', sb);
  ok(edge.every((c) => c.v === 0), '10b/edge: absent, non-numeric and negative volumes all normalize to 0');
  ok(edge.length === 3, '10b/edge: …and none of those bars is dropped for it');
}

// ═════════════════════════════════════════════════════════════════════════════
section('11. SCOPE — what this PR deliberately does NOT claim');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The legacy providers are still present for OTHER surfaces. Claiming a
  // repository-wide removal would be false, so it is asserted false here.
  ok(/function fetchTwelveData/.test(SRC), '12: fetchTwelveData still exists (other surfaces) — no global removal claimed');
  ok(/function fetchAlphaVantage/.test(SRC), '12: fetchAlphaVantage still exists (other surfaces)');
  ok(/function fetchBackendCandles/.test(SRC), '12: fetchBackendCandles still exists (other surfaces)');
  ok(/fetchCandles\s*\(/.test(strip(fn('openChart'))) || /fetchCandles/.test(SRC),
     '12: fetchCandles is still reachable from non-scanner surfaces (openChart et al.)');
  // …and no backend contract was touched: no warmup, no ensure, no limit from the scanner.
  const scannerChain = strip(fn('runScan') + fn('fetchScannerCandles') + fn('_scannerCandlePumpQueue') +
    fn('_scannerFetchDxlinkDailyCandles') + fn('_scannerAdaptDxlinkCandles'));
  ok(!/warmup/i.test(scannerChain), '17: the scanner never POSTs a warmup');
  ok(!/candles\/ensure/.test(scannerChain), '17: the scanner never POSTs an ensure');
  ok(!/method\s*:\s*'POST'/.test(scannerChain), '17: the scanner issues no POST at all — read-only');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); failures.forEach((f) => console.log('  • ' + f)); process.exit(1); }
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  DIRECTIONAL runScan DXLINK PROVIDER: OK');
console.log('════════════════════════════════════════════════════════════════════════════════');
})().catch((e) => { console.error(e); process.exit(1); });
