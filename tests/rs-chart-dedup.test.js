'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// RS vs SPY chart — request de-duplication / single-flight guards.
//
// Goal under test (APEX frontend dedup task): opening RS charts must not fire
// duplicate backend requests or duplicate browser fallbacks for the same
// symbol / timeframe / view / benchmark.
//
//   1. A double-click on the same candidate must NOT produce a double 4H request
//      — concurrent identical loads dedup onto ONE in-flight backend load.
//   2. Navigating back to a symbol (HUM → IBM → HUM) reuses the cache/in-flight
//      load when possible; a different symbol uses a distinct dedup key.
//   3. The SPY 4H benchmark is single-flight: already-cached or in-flight serves
//      without a new backend request.
//   4. The browser 30M→4H fallback starts AT MOST ONCE per symbol+view while the
//      first is still waiting on the browser 30M aggregation.
//   5. A duplicate reason=chart_open context POST for the same symbol+timeframes
//      within a short window is suppressed (real symbol/tf change is allowed).
//
// Run: node tests/rs-chart-dedup.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }
function candles(n) { const out = []; for (let i = 0; i < n; i++) out.push({ time: i, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }); return out; }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── 1. static structure of the RS chart dedup/TTL guard ───────────────────────
section('1. _rsLoadBackendCandlesForChart carries an in-flight/TTL dedup guard');
{
  const src = stripComments(extractFn(HTML, '_rsLoadBackendCandlesForChart'));
  ok(/_rsLoadBackendCandlesForChart\(symbol,\s*opts\)/.test(src), '1: accepts opts (force-capable signature)');
  ok(/force\s*=\s*!!\(?opts/.test(src), '1: reads opts.force');
  ok(/_rsChartLoadKey\(symbol\)/.test(src), '1: builds the symbol+view+tf+benchmark dedup key');
  ok(/_RS_CHART_LOAD_TTL_MS/.test(src), '1: applies a short TTL reuse window');
  ok(/candles1d\.length\s*>\s*0[\s\S]*candles4h\.length\s*>\s*0/.test(src), '1: TTL hit requires 1D>0 and 4H>0');
  ok(/_rsLoadBackendCandlesDeduped\(/.test(src), '1: routes the fetch through the in-flight dedup helper');
  ok(/_rsLoadBackendSpyBenchmarks\(/.test(src), '1: SPY benchmark goes through the single-flight loader');
  // benchmark key carries SPY (item: dedup key includes benchmark SPY)
  const keyFn = stripComments(extractFn(HTML, '_rsChartLoadKey'));
  ok(/rs_chart/.test(keyFn) && /SPY/.test(keyFn) && /1D,4H/.test(keyFn), '1: dedup key includes view, timeframes and SPY benchmark');

  const helper = stripComments(extractFn(HTML, '_rsLoadBackendCandlesDeduped'));
  ok(/g\.inflight\s*&&\s*g\.inflightKey\s*===\s*loadKey/.test(helper), '1: reuses the in-flight Promise for an identical key');
  ok(/_loadBackendChartCandles\(symbol\)/.test(helper), '1: starts the real backend fetch when not deduped');
  ok(/console\.debug/.test(helper), '1: duplicate in-flight skip is logged at debug level');
}

// ── 2. behavioral: double-click → ONE load; TTL reuse; distinct symbol key ─────
section('2. double-click dedup + TTL reuse + distinct-symbol key');
{
  let loadCount = 0;
  let resolvers = [];
  const sb = {
    window: { console: { debug() {} } },
    console: { debug() {}, warn() {}, log() {} },
    Promise, Date,
    _RS_CHART_LOAD_TTL_MS: 45000,
    _rsChartLoadGuard: { key: null, ts: 0, scbc: null, inflight: null, inflightKey: null, inflightSkipLogged: false, ttlSkipLogged: false },
    _rsBackendCandleCache: null,
    S: { rsChartState: { symbol: null } },
    // The real backend loader (counted). Returns a complete backend-store result.
    _loadBackendChartCandles(symbol) {
      loadCount++;
      return new Promise((res) => { resolvers.push(() => res({ ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: candles(25), candles4h: candles(25), diag4h: null })); });
    },
    // stubs for the success-path side effects
    renderRsCharts() {},
    _recordBackendCandleProvenance() { return 'backend_cache_full'; },
    _startBrowser4hFallbackIfAllowed() { return false; },
    _recordRsBenchmarkDiag() {},
    _isBackendGateClosedReason() { return false; },
    _rsChartBrowserFallback() {},
    _rsLoadBackendSpyBenchmarks() {},
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_rsChartLoadKey'), sb);
  vm.runInContext(extractFn(HTML, '_rsLoadBackendCandlesDeduped'), sb);
  vm.runInContext(extractFn(HTML, '_rsLoadBackendCandlesForChart'), sb);

  const settle = () => { const r = resolvers; resolvers = []; r.forEach((fn) => fn()); return new Promise((res) => setTimeout(res, 0)); };

  return (async () => {
    // 2a. double-click HUM: two concurrent opens → ONE backend load
    sb.S.rsChartState.symbol = 'HUM';
    const p1 = sb._rsLoadBackendCandlesForChart('HUM');
    const p2 = sb._rsLoadBackendCandlesForChart('HUM');
    ok(loadCount === 1, '2a: double-click on the same candidate triggers only ONE 4H/backend load');
    await settle();
    await Promise.all([p1, p2]);
    ok(sb._rsChartLoadGuard.key === sb._rsChartLoadKey('HUM'), '2a: completed load is remembered for the TTL window');

    // 2b. immediate re-open of the same symbol → TTL reuse (no new load)
    const before2b = loadCount;
    await sb._rsLoadBackendCandlesForChart('HUM');
    ok(loadCount === before2b, '2b: re-opening the same symbol within TTL reuses cache (no new load)');

    // 2c. different symbol uses a distinct dedup key → loads
    const before2c = loadCount;
    sb.S.rsChartState.symbol = 'IBM';
    const pIbm = sb._rsLoadBackendCandlesForChart('IBM');
    ok(loadCount === before2c + 1, '2c: switching HUM → IBM is a distinct key and loads');
    ok(sb._rsChartLoadKey('HUM') !== sb._rsChartLoadKey('IBM'), '2c: HUM and IBM produce different dedup keys');
    await settle();
    await pIbm;

    // 2d. force=true bypasses the TTL reuse
    sb.S.rsChartState.symbol = 'IBM';
    const before2d = loadCount;
    const pForce = sb._rsLoadBackendCandlesForChart('IBM', { force: true });
    ok(loadCount === before2d + 1, '2d: force=true bypasses TTL reuse and re-loads');
    await settle();
    await pForce;

    await runSpyBenchmark();
  })();
}

// ── 3. SPY 4H benchmark is single-flight (cached + in-flight short-circuits) ───
async function runSpyBenchmark() {
  section('3. _fetchBackendSpy4hBenchmark single-flight: cache + in-flight');
  {
    let fetchCount = 0;
    const sb = {
      console: { log() {}, warn() {} },
      Promise, Date,
      RS_SPY_4H_MISSING_DIAG_COOLDOWN_MS: 60000,
      _rsSpy4hBenchmarkSessionCache: { candles: null, diag: null, inflight: null, lastMissingKey: null, lastMissingAt: 0 },
      _recordRsBenchmarkDiag() {},
      _recordRsBenchmarkMissingOnce() {},
      _rsBenchmarkDiagFrom4h() { return {}; },
      _cacheRsSpy4hBenchmark() {},
      postCandleContext() {},
      _backendCandleGateOpen() { return true; },
      _backendCandleGateReason() { return 'open'; },
      fetch() { fetchCount++; return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, candles: [] }) }); },
    };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_rsSpy4hBenchmarkUsable'), sb);
    vm.runInContext(extractFn(HTML, '_fetchBackendSpy4hBenchmark'), sb);

    // 3a. session cache populated → no fetch, served from cache
    sb._rsSpy4hBenchmarkSessionCache.candles = candles(30);
    const cached = await sb._fetchBackendSpy4hBenchmark('rs_chart', 'HUM', 30);
    ok(fetchCount === 0, '3a: cached SPY 4H benchmark is served WITHOUT a backend request');
    ok(cached && cached.ok === true && cached.fromSessionCache === true, '3a: returns the cached benchmark (fromSessionCache)');

    // 3b. in-flight request → second concurrent caller reuses it (single-flight):
    // no new backend request is started, and it resolves to the in-flight result.
    // (Identity is not asserted: _fetchBackendSpy4hBenchmark is async, so it wraps
    // the returned in-flight promise in a fresh one.)
    sb._rsSpy4hBenchmarkSessionCache.candles = null;
    let resolveInflight;
    const inflightResult = { ok: true, candles: candles(30), fromInflight: true };
    sb._rsSpy4hBenchmarkSessionCache.inflight = new Promise((res) => { resolveInflight = res; });
    const reuse = sb._fetchBackendSpy4hBenchmark('rs_chart', 'IBM', 30);
    ok(fetchCount === 0, '3b: no extra backend request while one is already in flight');
    resolveInflight(inflightResult);
    const reuseVal = await reuse;
    ok(reuseVal && reuseVal.fromInflight === true, '3b: the second caller resolves to the in-flight result (single-flight)');
    ok(fetchCount === 0, '3b: still no extra backend request after the in-flight load settles');
  }
  runFallbackOnce();
}

// ── 4. browser 30M→4H fallback starts at most once per symbol+view ────────────
function runFallbackOnce() {
  section('4. _startBrowser4hFallbackIfAllowed: single start per symbol+view while waiting');
  {
    const ensured = [];
    const sb = {
      window: { console: { debug() {} } },
      console: { debug() {} },
      Date,
      _browser4hFallbackState: {},
      _BROWSER_4H_FALLBACK_DEDUP_MS: 45000,
      _candleSubscriptionLimitHit: { hit: false },
      _candleProvenanceLog: [],
      _recordCandleProvenance() {},
      _backendCandleGateReason() { return 'open'; },
      _isBackendGateClosedReason() { return false; },
      _browserCandleBackoffActive() { return false; },
      S: { ttConnected: true },
      _ensure30MSubscription(sym) { ensured.push(sym); },
    };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_startBrowser4hFallbackIfAllowed'), sb);

    const r1 = sb._startBrowser4hFallbackIfAllowed('HUM', 'rs_chart', { needsSpy: false });
    const r2 = sb._startBrowser4hFallbackIfAllowed('HUM', 'rs_chart', { needsSpy: false });
    ok(r1 === true, '4: first fallback for HUM+rs_chart starts');
    ok(r2 === false, '4: second fallback for HUM+rs_chart while waiting is suppressed');
    ok(ensured.filter((s) => s === 'HUM').length === 1, '4: only ONE 30M subscription opened for HUM+rs_chart');

    // A different symbol is independent and still starts.
    const r3 = sb._startBrowser4hFallbackIfAllowed('IBM', 'rs_chart', { needsSpy: false });
    ok(r3 === true, '4: a different symbol (IBM) starts its own fallback');
    ok(ensured.filter((s) => s === 'IBM').length === 1, '4: IBM opens exactly one 30M subscription');
  }
  runChartOpenCtxDedup();
}

// ── 5. chart_open context POST dedup (same symbol+tf within a short window) ────
function runChartOpenCtxDedup() {
  section('5. postCandleContext suppresses a duplicate reason=chart_open');
  {
    const src = stripComments(extractFn(HTML, 'postCandleContext'));
    ok(/reason\s*===\s*'chart_open'/.test(src), '5: postCandleContext has a chart_open dedup branch');
    ok(/_CANDLE_CTX_CHART_OPEN_DEDUP_MS/.test(src), '5: dedup uses a short window constant');
    ok(/chartOpenDeduped\+\+/.test(src), '5: a suppressed chart_open is counted');

    const sb = {
      console: { log() {}, warn() {} },
      Date, setTimeout: () => 1, clearTimeout: () => {}, Math, JSON,
      _CANDLE_CTX_SYMBOL_CAP: 40,
      _CANDLE_CTX_PORTFOLIO_CAP: 25,
      _CANDLE_CTX_BENCHMARK: 'SPY',
      _CANDLE_CTX_DEBOUNCE_MS: 450,
      _CANDLE_CTX_MAX_WAIT_MS: 1500,
      _CANDLE_CTX_CHART_OPEN_DEDUP_MS: 4000,
      _candleCtxChartOpenLast: { key: null, at: 0 },
      _candleCtxCounts: { sent: 0, dedupedSkipped: 0, cooldownSkipped: 0, chartOpenDeduped: 0 },
      _candleCtxPending: null,
      _candleCtxFirstPendingAt: null,
      _candleCtxDebounceTimer: null,
      _candleCtxLast: {},
      _candleCtxVisibleScannerSymbols() { return []; },
      _candleCtxPortfolioSymbols() { return []; },
      _candleCtxDiag() {},
      _candleCtxFlush() {},
      _candleDiagNowIso() { return ''; },
      S: { selectedTicker: null },
    };
    vm.createContext(sb);
    ['_candleCtxNormSym', '_candleCtxDedupe', '_candleCtxBuildSymbols', '_candleCtxNormTimeframes', '_candleCtxMergePayload', 'postCandleContext']
      .forEach((fn) => vm.runInContext(extractFn(HTML, fn), sb));

    sb.postCandleContext({ reason: 'chart_open', contextType: 'chart', activeSymbol: 'HUM', timeframes: ['1D', '30M', '4H'] });
    sb.postCandleContext({ reason: 'chart_open', contextType: 'chart', activeSymbol: 'HUM', timeframes: ['1D', '30M', '4H'] });
    ok(sb._candleCtxCounts.chartOpenDeduped === 1, '5: a second chart_open for the same symbol+tf is deduped');

    // A real symbol change is NOT suppressed.
    sb.postCandleContext({ reason: 'chart_open', contextType: 'chart', activeSymbol: 'IBM', timeframes: ['1D', '30M', '4H'] });
    ok(sb._candleCtxCounts.chartOpenDeduped === 1, '5: a real symbol change (HUM → IBM) is allowed through');
  }

  console.log('\n' + (fail === 0
    ? 'All ' + pass + ' tests passed.'
    : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  process.exit(fail ? 1 : 0);
}
