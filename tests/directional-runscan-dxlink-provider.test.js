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

// ─── The ONE OHLCV table both shapes are built from ──────────────────────────
// Deterministic, no randomness, no clock. Values are chosen so the series is not
// monotonic (RSI/MACD/BB/KC/squeeze/HVR all have something to chew on).
function ohlcvTable(n, lastSessionMs) {
  const rows = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = n - 1 - i;
    const base = 100 + k * 0.35 + Math.sin(k / 6) * 4.25 + Math.cos(k / 17) * 2.5;
    const close = Math.round(base * 10000) / 10000;
    rows.push({
      ms: lastSessionMs - i * DAY,
      open: Math.round((close - 0.8123) * 10000) / 10000,
      high: Math.round((close + 1.4567) * 10000) / 10000,
      low: Math.round((close - 1.9876) * 10000) / 10000,
      close: close,
      volume: 1000000 + k * 3137,
    });
  }
  return rows;
}
// B. the NEW canonical DXLink shape (long keys, epoch MILLISECONDS)
const asDxlink = (rows) => rows.map((r) => ({ time: r.ms, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }));
// A. the OLD legacy scanner shape (short keys, epoch SECONDS, provider date string).
//    `date` is the UTC calendar day — exactly what fetchBackendCandles produced.
const asLegacy = (rows) => rows.map((r) => ({
  t: r.ms / 1000, date: new Date(r.ms).toISOString().substring(0, 10),
  c: r.close, h: r.high, l: r.low, o: r.open, v: r.volume,
}));

// A session-aligned table: last bar at 09:30 ET on Thu 2026-07-30.
const LAST_SESSION = et(2026, 7, 30, 9, 30);
const NOW_RTH = et(2026, 7, 30, 11, 0);

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
  '_backendCandleStoreChartNormTime', '_candleTradingSessionDate',
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
    " NO_CANONICAL:'NO_CANONICAL_CANDLES', LEGACY_REJECTED:'LEGACY_PROVIDER_REJECTED' };" +
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
  sb.__probeInput = asDxlink([
    { ms: Date.UTC(2026, 6, 30, 0, 0), open: 1, high: 2, low: 0.5, close: 1.5, volume: 11 },
    { ms: et(2026, 7, 30, 9, 30), open: 2, high: 3, low: 1.5, close: 2.5, volume: 22 },
    { ms: et(2026, 7, 30, 16, 0), open: 3, high: 4, low: 2.5, close: 3.5, volume: 33 },
  ]);
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
  ok(/_candleTradingSessionDate/.test(adapter), '1: the adapter stamps the canonical ET trading session');

  // The legacy functions still EXIST (other surfaces use them) — this PR does not
  // claim a repository-wide removal.
  ok(/\/market\/candles\//.test(fn('fetchBackendCandles')), '1: fetchBackendCandles still exists for other surfaces');
  ok(/twelvedata/i.test(fn('fetchTwelveData')), '1: fetchTwelveData still exists for other surfaces');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2. RUNTIME — the only network call the scanner makes is the DXLink 1D GET');
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = ohlcvTable(205, LAST_SESSION);
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
  const rows = ohlcvTable(205, LAST_SESSION);
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
section('4. SESSION IDENTITY — ET trading date, no 00:00-UTC bug, timezone independent');
// ═════════════════════════════════════════════════════════════════════════════
{
  const sb = makeScanSandbox({});
  // A bar stamped 2026-07-30 00:00 UTC is the evening of 2026-07-29 in ET.
  const utcMidnight = Date.UTC(2026, 6, 30, 0, 0);
  const open0930 = et(2026, 7, 30, 9, 30);
  const close1600 = et(2026, 7, 30, 16, 0);
  sb.__in = asDxlink([
    { ms: utcMidnight, open: 1, high: 2, low: 0.5, close: 1.5, volume: 11 },
    { ms: open0930, open: 2, high: 3, low: 1.5, close: 2.5, volume: 22 },
    { ms: close1600, open: 3, high: 4, low: 2.5, close: 3.5, volume: 33 },
  ]);
  const a = vm.runInContext('_scannerAdaptDxlinkCandles(__in)', sb);

  // 34. The 00:00-UTC bar resolves to the PREVIOUS ET session, not to the UTC day.
  eq(a[0].date, '2026-07-29', '34: a 00:00-UTC bar is stamped with its real ET session (2026-07-29)');
  ok(new Date(utcMidnight).toISOString().substring(0, 10) === '2026-07-30',
     '34: …while the legacy toISOString() stamping would have said 2026-07-30 — the bug this removes');
  eq(a[1].date, '2026-07-30', '34: the 09:30 ET open bar belongs to session 2026-07-30');
  eq(a[2].date, '2026-07-30', '34: the 16:00 ET close bar belongs to the SAME session 2026-07-30');
  eq(a[1].date, etDate(open0930), '34: the stamp equals the independently computed Intl ET date');

  // 33. Timezone independence — the SAME adapter, run in child processes under
  //     three very different host timezones, produces byte-identical output.
  const probe = (tz) => execFileSync(process.execPath, [__filename, '--tz-probe'],
    { env: Object.assign({}, process.env, { TZ: tz }), encoding: 'utf8' });
  const utc = probe('UTC'), tokyo = probe('Asia/Tokyo'), la = probe('America/Los_Angeles');
  ok(utc === tokyo && tokyo === la, '33: adapter output is byte-identical under TZ=UTC / Asia/Tokyo / America/Los_Angeles');
  const parsed = JSON.parse(utc);
  eq(parsed[0].date, '2026-07-29', '33: …and the ET session is correct in every one of them');
  eq(parsed[2].date, '2026-07-30', '33: …for the intraday bars too');
}

// ═════════════════════════════════════════════════════════════════════════════
section('5. BAR-COUNT CONTRACT — 59 / 60 / 199 / 200 / 205, semantics preserved');
// ═════════════════════════════════════════════════════════════════════════════
// The >= 60 minimum and the "no MA200 below 200 bars" behaviour are the PRE-EXISTING
// semantics. This PR preserves them EXACTLY; it does not "improve" the formulas.
async function scanOne(nBars, extra) {
  const rows = ohlcvTable(nBars, LAST_SESSION);
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
  eq(r205.row.priceDate, etDate(LAST_SESSION), '10 (205 bars): priceDate is the last ET trading session');
  eq(dxCalls(r205.sb).length, 1, '10 (205 bars): one GET for one symbol');
  eq(legacyCalls(r205.sb).length, 0, '10 (205 bars): zero legacy provider calls in a full pass');
}

// ═════════════════════════════════════════════════════════════════════════════
section('6. PARITY — identical OHLCV in the OLD shape and the NEW shape');
// ═════════════════════════════════════════════════════════════════════════════
// The SAME table, presented as the legacy boundary used to present it and as the
// DXLink boundary presents it now, run through the SAME unmodified runScan.
{
  const rows = ohlcvTable(205, LAST_SESSION);
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

  // 16 (KNOWN, PRE-EXISTING, OUT OF SCOPE). Volume does NOT survive the CANONICAL
  // TRANSPORT: _apexParityNormCandle returns a fresh {t,o,h,l,c} and _sfsFetchBackendCandles
  // then maps `volume: c.v || 0`, so every DXLink-fed series in this app already carries
  // volume 0 — SWING charts, MCX, the main chart's backend path. That discard is a
  // load-bearing invariant of the weekly aggregator's duplicate-authority argument
  // (PR C), so this PR does NOT change it. The scanner ADAPTER preserves whatever the
  // reader hands it (proved in §3); the reader hands it 0.
  ok(nc.every((c) => c.v === 0), '16: DXLink-fed rows carry volume 0 — the canonical transport discards it upstream (documented, out of scope)');
  ok(oc.some((c) => c.v > 0), '16: …the legacy Yahoo series did carry volume — the difference is upstream of this PR, not in the adapter');
  // …and it changes NOTHING that is scored: no scanner formula reads volume.
  const scoredSrc = strip(fn('runScan') + fn('smA') + fn('calcRSI') + fn('calcMACD') + fn('calcBB') +
    fn('calcKC') + fn('calcSqueeze') + fn('calcHVR') + fn('scoreStock') + fn('getSignal') + fn('getStrategy'));
  ok(!/\.\s*v\b|\bvolume\b/.test(scoredSrc), '16: no scored field reads volume — indicator/score parity is unaffected');

  // THE ONE ALLOWED DIFFERENCE: priceDate, where the legacy stamping could be wrong.
  // For an RTH-stamped series the two AGREE — there is no unexplained divergence here.
  eq(newRows[0].priceDate, etDate(LAST_SESSION), '34: the DXLink run reports the real ET session as priceDate');
  eq(oldRows[0].priceDate, newRows[0].priceDate, '34: for an RTH-stamped series the legacy and DXLink priceDate AGREE');

  // …and where the legacy series was stamped at 00:00 UTC — which is what the Railway
  // reader produced from a 'YYYY-MM-DD' provider date — the legacy value named the WRONG
  // ET session while every scored field stays identical.
  {
    const utcRows = ohlcvTable(205, Date.UTC(2026, 6, 30, 0, 0));
    const sbA = makeScanSandbox({ serve: () => ({ candles: asDxlink(utcRows) }) });
    vm.runInContext("WL = [{ t:'AAPL', n:'Apple', i:'NDX' }];", sbA);
    installRunScan(sbA);
    await vm.runInContext('runScan()', sbA);
    const dxRow = vm.runInContext('JSON.parse(JSON.stringify(S.scanData[0]))', sbA);

    const sbB = makeScanSandbox({});
    vm.runInContext("WL = [{ t:'AAPL', n:'Apple', i:'NDX' }];", sbB);
    sbB.__legacy = asLegacy(utcRows);
    vm.runInContext('function fetchScannerCandles(){ return Promise.resolve(__legacy.map(function(c){ return Object.assign({}, c); })); }', sbB);
    installRunScan(sbB);
    await vm.runInContext('runScan()', sbB);
    const lgRow = vm.runInContext('JSON.parse(JSON.stringify(S.scanData[0]))', sbB);

    let same = true; PARITY_FIELDS.forEach((f) => { if (JSON.stringify(dxRow[f]) !== JSON.stringify(lgRow[f])) same = false; });
    ok(same, '19/20/21: a 00:00-UTC-stamped series still scores IDENTICALLY in both shapes');

    // priceDate is the ONE field the migration deliberately changes, and the change is
    // in runScan's own expression, not in the shape. The OLD expression was
    //     lc.date || new Date(lc.t*1000).toISOString().substring(0,10)
    // evaluated on the legacy last bar; the NEW one is the ET trading session.
    const legacyLast = sbB.__legacy[sbB.__legacy.length - 1];
    const oldPriceDate = legacyLast.date || new Date(legacyLast.t * 1000).toISOString().substring(0, 10);
    eq(oldPriceDate, '2026-07-30', '34: the OLD priceDate expression reports the UTC calendar day…');
    eq(dxRow.priceDate, '2026-07-29', '34: …while the session identity reports the real ET session — the ONE permitted difference');
    eq(lgRow.priceDate, dxRow.priceDate, '34: and the new expression is shape-independent — it corrects the legacy shape too');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('7. S.scanData — written correctly, and still refused downstream (PR #359)');
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = ohlcvTable(205, LAST_SESSION);
  const sb = makeScanSandbox({ serve: (sym) => ({ candles: asDxlink(rows.map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (sym === 'META' ? 20 : 0), volume: r.volume }))) }) });
  vm.runInContext("WL = [{ t:'AAPL', n:'Apple', i:'NDX' }, { t:'META', n:'Meta', i:'NDX' }];", sb);
  installRunScan(sb);
  await vm.runInContext('runScan()', sb);

  // 23. The scanner result rows are written, sorted, and derived from DXLink bars.
  eq(vm.runInContext('S.scanData.length', sb), 2, '23: S.scanData holds one row per scanned symbol');
  ok(vm.runInContext('S.scanData[0].score >= S.scanData[1].score', sb), '23: rows are ranked by score, descending');
  ok(vm.runInContext('S.scanData.every(function(d){ return d.candles && d.candles.length === 205; })', sb),
     '23: every row carries its 205 DXLink bars');
  ok(vm.runInContext("S.scanData.every(function(d){ return d.priceDate === '" + etDate(LAST_SESSION) + "'; })", sb),
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
    '_swingLogChartCandles', '_swingReadCachedCandles', '_swingLegacySeriesPresent',
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
  eq(res.reason, 'LEGACY_PROVIDER_REJECTED', '24: …and an explicit refusal reason');
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
  const rows = ohlcvTable(205, LAST_SESSION);
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
  const sb4 = makeScanSandbox({ serve: (sym) => ({ candles: asDxlink(ohlcvTable(205, LAST_SESSION).map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (sym === 'BBB' ? 500 : 0), volume: r.volume }))) }) });
  vm.runInContext("WL = [{ t:'AAA', n:'a', i:'x' }, { t:'BBB', n:'b', i:'x' }];", sb4);
  installRunScan(sb4);
  await vm.runInContext('runScan()', sb4);
  const aaa = vm.runInContext("S.scanData.find(function(d){return d.ticker==='AAA';}).candles", sb4);
  const bbb = vm.runInContext("S.scanData.find(function(d){return d.ticker==='BBB';}).candles", sb4);
  ok(Math.abs(bbb[bbb.length - 1].c - aaa[aaa.length - 1].c - 500) < 1e-9, '32: each symbol carries its own series (no cross-symbol contamination)');

  // 31. 1D / 4H isolation at the transport: the cache key and the single-flight key
  //     both carry the timeframe, so a 4H read can never satisfy a 1D read.
  const sb5 = makeScanSandbox({ serve: (sym, tf) => ({ candles: asDxlink(ohlcvTable(205, LAST_SESSION).map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (tf === '4H' ? 900 : 0), volume: r.volume }))) }) });
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
  const good = asDxlink(ohlcvTable(205, LAST_SESSION));
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
  const rows = ohlcvTable(205, LAST_SESSION);
  const serve = (sym) => ({ candles: asDxlink(rows.map((r) => ({ ms: r.ms, open: r.open, high: r.high, low: r.low, close: r.close + (sym === 'META' ? 18 : sym === 'CVS' ? -6 : 0), volume: r.volume }))) });
  const sb = makeScanSandbox({ serve });
  vm.runInContext("WL = [{ t:'AAPL', n:'Apple', i:'NDX' }, { t:'META', n:'Meta', i:'NDX' }, { t:'CVS', n:'CVS', i:'SPX' }];", sb);
  // The downstream half of the chain, real code, same sandbox.
  vm.runInContext([
    '_swingLogChartCandles', '_swingReadCachedCandles', '_swingLegacySeriesPresent',
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
  eq(aaplRow.priceDate, etDate(LAST_SESSION), 'E2E: the last ET session is reported correctly');

  // No week split: the weekly derivation over the DXLink series puts each ET week in
  // exactly one bucket. A 00:00-UTC-stamped series would split the Monday.
  const weekly = vm.runInContext('JSON.parse(JSON.stringify(_swingDeriveWeeklyCandles(' + JSON.stringify(asDxlink(rows.slice(-15))) + ')))', sb);
  const buckets = weekly.map((w) => vm.runInContext('_etWeekBucket(' + '__wt' + ')', Object.assign(sb, { __wt: w.time })));
  eq(new Set(buckets).size, buckets.length, 'E2E: every weekly bar has a DISTINCT ET week bucket — no week split');
  ok(weekly.length >= 3 && weekly.length <= 4, 'E2E: 15 trading days derive to 3-4 weekly bars (' + weekly.length + ')');

  // Progressive rendering is not blocked: the render collaborators still run.
  ok(sb.__counters.render > 0, 'E2E: renderScanResults still runs (progressive rendering is not blocked)');
  ok(sb.__counters.subscribeQuotes === 1 && sb.__counters.qa >= 0, 'E2E: post-scan orchestration is unchanged');
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
