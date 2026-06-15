'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// RS vs SPY — backend snapshot consumer.
//
// Proves the RS vs SPY panel consumes GET /scanner/rs/snapshot as its source of
// truth (like the Directional Scanner) and does NOT duplicate the backend RS
// engine client-side. Functions are extracted from the REAL index.html (no
// copies) and run in a vm sandbox with a stubbed fetch.
//
//   1.  fetches GET /scanner/rs/snapshot (GET-only; never POST /scanner/run)
//   2.  normalizes backend candidates without recomputing RS
//   3.  no client-side RS engine / universe duplication in the consumer
//   4.  renders backend candidates even when Market Scanner results = 0
//   5.  ok:false NO_RS_SNAPSHOT → graceful empty/loading state (not a fallback)
//   6.  endpoint not deployed / fetch error → defers to legacy fallback
//   7.  never mutates S.scanData; results live on S.rsScanData / S.backendRs
//   8.  charts resolve backend rows + keep the latest-price patch
//   9.  the RS formula / thresholds / legacy path are unchanged
//   10. the Directional Scanner is untouched
//
// Run: node tests/rs-vs-spy-backend-snapshot.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  let start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function not found: ' + name);
  if (src.slice(start - 6, start) === 'async ') start -= 6;
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
function has(name) { return HTML.indexOf('function ' + name + '(') >= 0; }
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

const FNS = [
  'ffBackendRsSnapshot', 'rsbState', '_rsbNum', 'rsbNormalizeRow', 'rsbParseSnapshot',
  'rsbSnapshotAgeMs', 'rsbFetchSnapshot', 'rsbGetBackendSource', 'rsbRowsForMode',
  'rsbReasonIsFallback', 'rsbSourceBanner', 'rsbMaybeRenderBackendRs', 'rsbFallbackNoticeHtml',
  // diagnostics / breakdown / benchmark rewarm / refresh
  '_rsbSkipReason', '_rsbSkipTicker', '_rsbSkipScore', 'rsbSkipBreakdown', 'rsbNearMisses',
  'rsbBenchmarkStatus', 'rsbBuildDiag', 'rsbSkipBreakdownHtml', 'rsbRewarmRsBenchmarks',
  'rsbMaybeRewarmBenchmarks', 'rsbRefreshClicked', 'rsbControlsHtml',
  // snapshot validity + dedicated backend re-run
  '_rsbIsSpyUnavailableReason', 'rsbSnapshotValidity', 'rsbTriggerBackendRun',
];

// ── fetch stub / counters ────────────────────────────────────────────────────
let fetchCalls = [];
function makeFetch(responder) {
  return async function (url, opts) {
    fetchCalls.push({ url: url, opts: opts || {} });
    return responder(url, opts);
  };
}

// Backend candle gate + SPY benchmark stubs (drive the rewarm tests).
let gateOpen = true;
let spy1dWarmups = 0, spy4hWarmups = 0;

const sandbox = {
  console, Date, JSON, Math, isFinite, Number, Object,
  RSB_SNAPSHOT_TTL_MS: 60000,
  _rsbBenchWarmAt: 0,
  RSB_SPY_UNAVAILABLE_REASONS: { spy_benchmark_unavailable: 1, missing_spy_1d_benchmark: 1, missing_spy_4h_benchmark: 1, spy_unavailable: 1, no_spy_benchmark: 1, spy_benchmark_missing: 1 },
  BACKEND: 'http://backend.test',
  _rsActive: false,
  _rsCandidateList: [],
  _rsFlagFilter: 'all',
  S: null,
  fetch: null,
  AbortSignal: { timeout: function () { return undefined; } },
  _backendAuthHeaders: function () { return { 'x-api-key': 'k' }; },
  // candle gate + SPY benchmark session caches / fetchers (mirror index.html)
  _backendCandleGateOpen: function () { return gateOpen; },
  _rsSpy1dBenchmarkSessionCache: { candles: null },
  _rsSpy4hBenchmarkSessionCache: { candles: null },
  _fetchBackendSpy1dBenchmark: async function () { spy1dWarmups++; return { ok: true, candles: [] }; },
  _fetchBackendSpy4hBenchmark: async function () { spy4hWarmups++; return { ok: true, candles: [] }; },
  setTimeout: function () { return 0; },
  // UI/render stubs (display-only helpers the consumer calls)
  escHtml: function (s) { return String(s == null ? '' : s); },
  _rsApplySort: function (a) { return a; },
  _rsApplyFlagFilter: function (a) { return a; },
  _rsFlagFilterEmptyHtml: function () { return 'FLAG_EMPTY'; },
  _rsTableHtml: function (cands) { return 'TABLE[' + cands.map(function (c) { return c.ticker; }).join(',') + ']'; },
  localStorage: { getItem: function () { return null; } },
  renderRsScanner: function () {},
  document: { getElementById: function () { return null; } },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── harness ───────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// A representative backend snapshot payload (backend-computed RS fields).
function snapshotOk() {
  return {
    ok: true,
    generatedAt: new Date(Date.now() - 5000).toISOString(),
    stale: false,
    universe: 150, analyzed: 142,
    dataSource: 'backend_candle_store',
    spy: { candles: 207, source: 'backend_candle_store' },
    results: [
      { ticker: 'AAA', name: 'A Co', direction: 'outperformer', rsScore: 9.1, rs5: 4.2, rs20: 9.1, rsi: 63, price: 120.5, avgVol: 3e6, ivr: 40 },
      { ticker: 'BBB', name: 'B Co', direction: 'outperformer', rsScore: 6.3, rs5: 2.1, rs20: 6.3, rsi: 58, price: 55.2, avgVol: 1e6 },
      { ticker: 'WWW', name: 'W Co', direction: 'underperformer', rsScore: -7.4, rs5: -3.1, rs20: -7.4, rsi: 38, price: 80.0, avgVol: 2e6 },
    ],
    skipped: [
      { ticker: 'ZZZ', reason: 'insufficient_history', rsScore: 1.2 },
      { ticker: 'QQQ', reason: 'rs_below_threshold', rsScore: 2.9 },
      { ticker: 'MMM', reason: 'rs_below_threshold', rsScore: -0.4 },
      { ticker: 'NNN', reason: 'missing_symbol_4h_candles' },
    ],
  };
}
// A snapshot where the backend skipped everything (the observed "319 skipped"
// shape) — used to prove the generic message is replaced by a per-reason breakdown.
function snapshotAllSkipped() {
  const skipped = [];
  for (let i = 0; i < 200; i++) skipped.push({ ticker: 'S' + i, reason: 'missing_spy_1d_benchmark' });
  for (let i = 0; i < 90; i++) skipped.push({ ticker: 'T' + i, reason: 'missing_symbol_1d_candles', rsScore: (i % 7) - 3 });
  for (let i = 0; i < 29; i++) skipped.push({ ticker: 'U' + i, reason: 'rs_below_threshold', rsScore: 4 - i * 0.05 });
  return { ok: true, generatedAt: new Date().toISOString(), stale: false, universe: 319, analyzed: 319,
    dataSource: 'backend_candle_store', spy: { candles: 0, source: 'backend_candle_store' }, results: [], skipped: skipped };
}
// The exact observed invalid case: ok:true but every symbol skipped because the
// backend SPY benchmark was unavailable when the snapshot was generated.
function snapshotSpyUnavailable() {
  const skipped = [];
  for (let i = 0; i < 319; i++) skipped.push({ ticker: 'S' + i, reason: 'spy_benchmark_unavailable' });
  return { ok: true, generatedAt: new Date().toISOString(), stale: false, universe: 319, analyzed: 319,
    dataSource: 'backend_candle_store', spy: { candles: 0, source: 'backend_candle_store' }, results: [], skipped: skipped };
}
function resetS(scanData) {
  sandbox.S = {
    rsScanner: { mode: 'STRONG', tf: '20D', sortCol: null, sortDir: 'desc' },
    rsScannerFilters: { minVol: 0, minPrice: 0, minIvr: 0, sma20: 'any', rsi: 'any' },
    scanData: scanData === undefined ? [] : scanData,
    rsChartState: { symbol: null },
    rsScannerData: [],
    rsScanData: null,
    backendRs: null,
  };
  fetchCalls = [];
}

(async function main() {

  // ── 1. fetches GET /scanner/rs/snapshot, GET-only ──────────────────────────
  section('1. consumes GET /scanner/rs/snapshot (GET-only)');
  resetS();
  sandbox.fetch = makeFetch(() => ({ ok: true, status: 200, json: async () => snapshotOk() }));
  await sandbox.rsbFetchSnapshot({ force: true });
  ok(fetchCalls.length === 1 && /\/scanner\/rs\/snapshot$/.test(fetchCalls[0].url), 'fetched /scanner/rs/snapshot exactly once');
  ok(!fetchCalls[0].opts.method || String(fetchCalls[0].opts.method).toUpperCase() === 'GET', 'request method is GET (no POST)');
  const src = sandbox.rsbGetBackendSource();
  ok(src.available === true && src.rows.length === 3, 'parsed snapshot is available with 3 rows');
  ok(src.dataSource === 'backend_candle_store' && src.spy && src.spy.candles === 207, 'source carries backend candle store + SPY benchmark');

  // ── 2. normalizes backend RS fields without recomputing ────────────────────
  section('2. normalizes backend candidates (no recomputation)');
  const row = sandbox.rsbNormalizeRow({ ticker: 'aaa', direction: 'outperformer', rs5: 4.2, rs20: 9.1, rsScore: 9.1, price: 120.5, rsi: 63 });
  ok(row.ticker === 'AAA' && row.rs5 === 4.2 && row.rs20 === 9.1 && row.rsSel === 9.1 && row.direction === 'outperformer',
     'rsbNormalizeRow maps backend RS values verbatim (rs5/rs20/rsScore/direction)');
  ok(sandbox.rsbNormalizeRow({ symbol: 'SPY', rs20: 0 }) === null, 'SPY is excluded from candidate rows');
  const nbody = stripComments(extractFn(HTML, 'rsbNormalizeRow'));
  ['_rsExcessReturns', '_rsComputeAll', '_rsQualityCheck', 'calcRSIWilder', 'smA('].forEach((t) =>
    ok(nbody.indexOf(t) < 0, 'rsbNormalizeRow does not call ' + t + ' (no client-side RS recompute)'));

  // ── 3. no client-side RS engine / universe duplication in the consumer ──────
  section('3. consumer does not duplicate the backend RS engine / universe');
  ['computeRsVsSpyCandidates', '_rsScanUniverse', '_rsLoadBackendCandlesForSymbol',
   '_rsEvaluateCandidate', 'runRsVsSpyScanner', '_rsBatchLoadCandles'].forEach((n) =>
    ok(!has(n), 'no client-side RS engine function present: ' + n));
  FNS.forEach((n) => {
    const b = stripComments(extractFn(HTML, n));
    ok(b.indexOf('_rsExcessReturns(') < 0 && b.indexOf('_rsComputeAll(') < 0 && b.indexOf('_rsQualityCheck(') < 0,
       n + ' does not recompute RS (no formula/quality calls)');
    ok(b.indexOf('_candleBuffer') < 0, n + ' does not read the DXLink candle buffer');
  });

  // ── 4. renders backend candidates with Market Scanner = 0 results ──────────
  section('4. renders backend candidates even when Market Scanner results = 0');
  resetS([]); // S.scanData empty → Market Scanner shows 0
  const st = sandbox.rsbState();
  st.parsed = sandbox.rsbParseSnapshot(snapshotOk());
  st.endpointSupported = true; st.lastFetchAt = Date.now(); // suppress a real fetch (TTL)
  let panelHtml = null;
  const setPanel = (h) => { panelHtml = h; };
  let handled = sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, setPanel);
  ok(handled === true, 'rsbMaybeRenderBackendRs handled the render');
  ok(/BACKEND RS SNAPSHOT/.test(panelHtml) && /TABLE\[AAA,BBB\]/.test(panelHtml), 'rendered backend outperformers (AAA,BBB) with source banner');
  ok(sandbox.S.scanData.length === 0, 'Market Scanner results stayed at 0 (backend independent)');
  // WEAK mode → underperformer
  handled = sandbox.rsbMaybeRenderBackendRs('HDR', 'WEAK', '20D', sandbox.S.rsScannerFilters, true, setPanel);
  ok(/TABLE\[WWW\]/.test(panelHtml), 'WEAK mode renders the backend underperformer (WWW)');

  // ── 5. NO_RS_SNAPSHOT → graceful empty/loading (not a fallback) ────────────
  section('5. ok:false NO_RS_SNAPSHOT → graceful empty/loading state');
  resetS([]);
  const st2 = sandbox.rsbState();
  st2.parsed = sandbox.rsbParseSnapshot({ ok: false, reason: 'NO_RS_SNAPSHOT' });
  st2.endpointSupported = true; st2.lastFetchAt = Date.now();
  const src2 = sandbox.rsbGetBackendSource();
  ok(src2.available === false && src2.reason === 'NO_RS_SNAPSHOT', 'source = unavailable with reason NO_RS_SNAPSHOT');
  ok(sandbox.rsbReasonIsFallback('NO_RS_SNAPSHOT') === false, 'NO_RS_SNAPSHOT is NOT treated as a fallback reason');
  handled = sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, setPanel);
  ok(handled === true && /No backend RS snapshot/.test(panelHtml), 'shows graceful empty state (no other engine)');

  // ── 6. endpoint not deployed / fetch error → legacy fallback ───────────────
  section('6. endpoint unavailable → defers to legacy live fallback');
  ok(sandbox.rsbReasonIsFallback('endpoint_unsupported') === true && sandbox.rsbReasonIsFallback('fetch_error') === true,
     'endpoint_unsupported / fetch_error are fallback reasons');
  resetS([]);
  const st3 = sandbox.rsbState(); st3.endpointSupported = false; st3.lastFetchAt = Date.now();
  handled = sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, setPanel);
  ok(handled === false, 'returns false (lets the legacy live DXLink path render)');
  ok(/FALLBACK/.test(sandbox.rsbFallbackNoticeHtml()), 'fallback notice clearly marks the legacy path');
  // wiring: renderRsScanner calls the backend consumer BEFORE the legacy path,
  // and the legacy path is prefixed with the fallback notice.
  const render = stripComments(extractFn(HTML, 'renderRsScanner'));
  ok(render.indexOf('rsbMaybeRenderBackendRs(') >= 0 &&
     render.indexOf('rsbMaybeRenderBackendRs(') < render.indexOf('computeRsCandidates('),
     'renderRsScanner consults the backend snapshot before the legacy compute');
  ok(render.indexOf('rsbFallbackNoticeHtml(') >= 0, 'renderRsScanner marks the legacy path as a fallback');

  // ── 7. never mutates S.scanData; separate state ────────────────────────────
  section('7. never mutates S.scanData; results on S.rsScanData / S.backendRs');
  resetS([{ ticker: 'KEEP', name: 'Keep' }]);
  const ref = sandbox.S.scanData, snap = JSON.stringify(ref);
  const st4 = sandbox.rsbState(); st4.parsed = sandbox.rsbParseSnapshot(snapshotOk()); st4.endpointSupported = true; st4.lastFetchAt = Date.now();
  sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, setPanel);
  ok(sandbox.S.scanData === ref && JSON.stringify(sandbox.S.scanData) === snap, 'S.scanData reference + contents unchanged');
  ok(sandbox.S.rsScanData && sandbox.S.rsScanData.available === true, 'backend result stored on S.rsScanData');
  ok(sandbox.S.backendRs && sandbox.S.backendRs.parsed, 'fetch state stored on S.backendRs (separate)');
  ['rsbFetchSnapshot', 'rsbMaybeRenderBackendRs', 'rsbGetBackendSource'].forEach((n) => {
    const b = stripComments(extractFn(HTML, n));
    ok(b.indexOf('scanner/run') < 0 && b.indexOf("method:'POST'") < 0 && b.indexOf('method: \'POST\'') < 0,
       n + ' never POSTs (no /scanner/run, no manual debug run)');
    ok(!/S\.scanData\s*=/.test(b), n + ' never assigns S.scanData');
  });

  // ── 8. charts: backend rows open + latest-price patch preserved ────────────
  section('8. charts resolve backend rows + keep the latest-price patch');
  const openSrc = stripComments(extractFn(HTML, 'openRsChart'));
  ok(/S\.rsScannerData/.test(openSrc), 'openRsChart resolves the row from the visible RS list (backend rows)');
  ok(!/var d=S\.scanData\.find\(function\(x\)\{return x\.ticker===symbol;\}\);\s*if\(!d\)return;/.test(openSrc),
     'openRsChart no longer hard-returns for symbols absent from S.scanData');
  const draw = stripComments(extractFn(HTML, '_rsDrawTf'));
  ok(draw.indexOf('patchLastCandleWithLivePrice') >= 0 &&
     draw.indexOf('patchLastCandleWithLivePrice') < draw.indexOf('computeCandleIndicators'),
     '_rsDrawTf still patches the final candle with the live price before indicators');

  // ── 9. RS formula / thresholds / legacy path unchanged ─────────────────────
  section('9. RS formula / thresholds / legacy path unchanged');
  const exc = stripComments(extractFn(HTML, '_rsExcessReturns'));
  ok(/\(a\[n\]-a\[n-k\]\)\/a\[n-k\]/.test(exc) && /d5=ret\(symCloses,dn,5\)/.test(exc) && /d20=ret\(symCloses,dn,20\)/.test(exc),
     '_rsExcessReturns formula + 5D/20D lookbacks unchanged');
  const qc = stripComments(extractFn(HTML, '_rsQualityCheck'));
  ['0.40', '0.006', '0.20', '45', '82', '55', '18'].forEach((t) => ok(qc.indexOf(t) >= 0, '_rsQualityCheck keeps threshold ' + t));
  ok(/rs\.d20>0&&rs\.d5>0/.test(stripComments(extractFn(HTML, 'computeRsCandidates'))), 'legacy computeRsCandidates keeps the 5D+20D coherence rule');
  ok(/S\.scanData/.test(extractFn(HTML, 'computeRsCandidates')), 'legacy live path still available as fallback');

  // ── 10. Directional Scanner untouched ──────────────────────────────────────
  section('10. Directional Scanner untouched');
  ['dsbFetchSnapshot', 'dsbRenderBackendDirectional', 'dsbGetBackendSource', 'computeDirectionalSetupCandidates']
    .forEach((n) => ok(has(n), 'directional function still present: ' + n));
  FNS.forEach((n) => ok(stripComments(extractFn(HTML, n)).indexOf('dsb') < 0, n + ' does not touch the directional (dsb) module'));

  // ── 11. skip reasons → detailed breakdown (not the generic message) ────────
  section('11. "N skipped" is replaced by a per-reason breakdown');
  const allSkip = snapshotAllSkipped();
  const bd = sandbox.rsbSkipBreakdown(allSkip.skipped);
  ok(bd.total === 319, 'breakdown counts all 319 skipped');
  ok(bd.byReason[0].reason === 'missing_spy_1d_benchmark' && bd.byReason[0].count === 200,
     'dominant skip reason surfaced (missing_spy_1d_benchmark=200)');
  ok(bd.byReason.map((b) => b.reason).join(',').indexOf('missing_symbol_1d_candles') >= 0,
     'breakdown enumerates each backend reason');
  const bdHtml = sandbox.rsbSkipBreakdownHtml(bd, sandbox.rsbNearMisses(allSkip.skipped, 'STRONG', 10), sandbox.rsbBenchmarkStatus());
  ok(/SKIPPED BREAKDOWN/.test(bdHtml) && /missing_spy_1d_benchmark/.test(bdHtml) && bdHtml.indexOf('insufficient data / filtered') < 0,
     'panel breakdown HTML lists reasons (no generic "insufficient data / filtered" text)');
  // and rendered through the panel when no candidates
  resetS([]);
  const stB = sandbox.rsbState(); stB.parsed = sandbox.rsbParseSnapshot(allSkip); stB.endpointSupported = true; stB.lastFetchAt = Date.now();
  let html11 = null;
  sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, (h) => { html11 = h; });
  ok(/SKIPPED BREAKDOWN/.test(html11) && /missing_spy_1d_benchmark/.test(html11), 'no-candidates panel shows the skip breakdown');
  ok(/SPY benchmark incomplete/.test(html11), 'no-candidates panel flags the missing SPY benchmark explicitly');

  // ── 12. near misses (top skipped by RS score) ──────────────────────────────
  section('12. near-miss list (top skipped by RS score)');
  const nm = sandbox.rsbNearMisses(snapshotOk().skipped, 'STRONG', 10);
  ok(nm.length >= 2 && nm[0].score >= nm[1].score, 'near misses sorted by RS score desc (STRONG)');
  ok(nm[0].ticker === 'QQQ' && nm[0].reason === 'rs_below_threshold', 'highest near-miss is QQQ (rs_below_threshold, +2.9)');
  const nmWeak = sandbox.rsbNearMisses(snapshotOk().skipped, 'WEAK', 10);
  ok(nmWeak[0].score <= nmWeak[nmWeak.length - 1].score, 'near misses sorted by RS score asc (WEAK)');

  // ── 13. manual Refresh RS vs SPY (no Market Scanner) ───────────────────────
  section('13. manual Refresh RS vs SPY reloads only RS data');
  ok(/rsb-refresh/.test(sandbox.rsbControlsHtml()) && /Refresh RS vs SPY/.test(sandbox.rsbControlsHtml()), 'a Refresh RS vs SPY button is rendered');
  ['rsbRefreshClicked', 'rsbControlsHtml'].forEach((n) => {
    const b = stripComments(extractFn(HTML, n));
    ok(b.indexOf('scanner/run') < 0 && b.indexOf('runScan') < 0, n + ' never runs the Market Scanner');
  });
  const refreshBody = stripComments(extractFn(HTML, 'rsbRefreshClicked'));
  ok(/rsbFetchSnapshot\(\{force:true\}\)/.test(refreshBody), 'refresh forces a snapshot re-GET');
  ok(/rsbRewarmRsBenchmarks\(true\)/.test(refreshBody), 'refresh re-attempts the SPY benchmark');
  // behavioral: clicking refresh forces a fetch + benchmark rewarm
  resetS([]);
  gateOpen = true; spy1dWarmups = 0; spy4hWarmups = 0; sandbox._rsbBenchWarmAt = 0; fetchCalls = [];
  sandbox.fetch = makeFetch(() => ({ ok: true, status: 200, json: async () => snapshotOk() }));
  sandbox.rsbState().lastFetchAt = Date.now(); // would normally suppress (TTL) — force must bypass
  await sandbox.rsbRefreshClicked();
  ok(fetchCalls.some((c) => /\/scanner\/rs\/snapshot$/.test(c.url)), 'refresh issued a forced GET /scanner/rs/snapshot (bypassing TTL)');
  ok(spy1dWarmups === 1 && spy4hWarmups === 1, 'refresh re-warmed the SPY 1D + 4H benchmark');

  // ── 14. backend_auth_not_ready recovery ────────────────────────────────────
  section('14. SPY benchmark recovers after auth (backend_auth_not_ready)');
  // gate closed (pre-login) → rewarm deferred, nothing fetched
  gateOpen = false; spy1dWarmups = 0; spy4hWarmups = 0; sandbox._rsbBenchWarmAt = 0;
  sandbox._rsSpy1dBenchmarkSessionCache.candles = null; sandbox._rsSpy4hBenchmarkSessionCache.candles = null;
  ok(sandbox.rsbRewarmRsBenchmarks(false) === false && spy1dWarmups === 0, 'gate closed → benchmark rewarm deferred (no fetch)');
  sandbox.rsbMaybeRewarmBenchmarks();
  ok(spy1dWarmups === 0 && spy4hWarmups === 0, 'maybe-rewarm is a no-op while auth not ready');
  // gate opens (after TT login) + benchmark still missing → rewarm fires
  gateOpen = true;
  sandbox.rsbMaybeRewarmBenchmarks();
  ok(spy1dWarmups === 1 && spy4hWarmups === 1, 'after auth ready, missing SPY benchmark is re-fetched');
  // once cached, maybe-rewarm stops re-fetching
  sandbox._rsSpy1dBenchmarkSessionCache.candles = new Array(30); sandbox._rsSpy4hBenchmarkSessionCache.candles = new Array(30);
  spy1dWarmups = 0; spy4hWarmups = 0; sandbox._rsbBenchWarmAt = 0;
  sandbox.rsbMaybeRewarmBenchmarks();
  ok(spy1dWarmups === 0 && spy4hWarmups === 0, 'no re-fetch once the benchmark is cached (no aggressive auto-refresh)');

  // ── 15. readable debug object ──────────────────────────────────────────────
  section('15. readable RS scanner debug object');
  resetS([]);
  sandbox._rsSpy1dBenchmarkSessionCache.candles = new Array(207); sandbox._rsSpy4hBenchmarkSessionCache.candles = new Array(120);
  const stD = sandbox.rsbState(); stD.parsed = sandbox.rsbParseSnapshot(snapshotOk()); stD.endpointSupported = true; stD.lastFetchAt = Date.now();
  sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, () => {});
  const diag = sandbox.window._rsScanDiag;
  ok(diag && typeof diag.timestamp === 'number', 'window._rsScanDiag exposed with a timestamp');
  ok(diag.analyzed === 142 && diag.candidatesPassed === 2 && diag.skippedTotal === 4, 'diag reports analyzed / candidates / skipped counts');
  ok(Array.isArray(diag.skipBreakdown) && diag.skipBreakdown.length >= 1, 'diag carries the skip-reason breakdown');
  ok(diag.spyBenchmark && diag.spyBenchmark.spy1d.candles === 207 && diag.spyBenchmark.spy4h.candles === 120, 'diag reports SPY 1D/4H benchmark status');
  ok(diag.dataSource === 'backend_candle_store' && diag.source === 'backend_rs_snapshot', 'diag reports the data source used');
  ok(sandbox.S.rsScanData && sandbox.S.rsScanData.diag === diag, 'diag also attached to S.rsScanData (inspectable)');

  // ── 16. market closed → uses snapshot, no live requirement ─────────────────
  section('16. market closed → consumes snapshot (no live data requirement)');
  FNS.forEach((n) => {
    const b = stripComments(extractFn(HTML, n));
    ok(b.indexOf('getUsEquityMarketSession') < 0 && b.indexOf('_rsSession(') < 0 && b.indexOf('isRegularSession') < 0,
       n + ' does not gate on the live market session');
  });
  // a stale (after-hours) snapshot still renders its candidates
  resetS([]);
  const stale = snapshotOk(); stale.stale = true; stale.generatedAt = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const stM = sandbox.rsbState(); stM.parsed = sandbox.rsbParseSnapshot(stale); stM.endpointSupported = true; stM.lastFetchAt = Date.now();
  let html16 = null;
  const handled16 = sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, (h) => { html16 = h; });
  ok(handled16 === true && /TABLE\[AAA,BBB\]/.test(html16), 'stale/after-hours snapshot still renders backend candidates');
  ok(/STALE/.test(html16), 'banner marks the snapshot STALE (last available snapshot)');

  // ── 17. all-skipped-for-SPY snapshot → invalid / needsBackendRefresh ───────
  section('17. spy_benchmark_unavailable=319 → snapshot marked invalid (not "No candidates")');
  const spyUn = snapshotSpyUnavailable();
  const parsedUn = sandbox.rsbParseSnapshot(spyUn);
  const v = sandbox.rsbSnapshotValidity({ rows: parsedUn.results, skipped: parsedUn.skipped, spy: parsedUn.spy });
  ok(v.needsBackendRefresh === true && v.valid === false, 'rsbSnapshotValidity flags needsBackendRefresh=true');
  ok(v.spyUnavailableCount === 319 && v.skippedTotal === 319, 'all 319 skips attributed to SPY benchmark unavailable');
  ok(sandbox.rsbSnapshotValidity({ rows: [{ ticker: 'A' }, { ticker: 'B' }, { ticker: 'C' }], skipped: parsedUn.skipped }).needsBackendRefresh === false,
     'a snapshot WITH candidates is never marked needsBackendRefresh');
  // rendered: shows the invalid diagnostic, NOT "No RS strong candidates"
  resetS([]);
  gateOpen = true; sandbox._rsSpy1dBenchmarkSessionCache.candles = new Array(206); sandbox._rsSpy4hBenchmarkSessionCache.candles = new Array(126);
  const stU = sandbox.rsbState(); stU.parsed = parsedUn; stU.endpointSupported = true; stU.lastFetchAt = Date.now();
  let html17 = null;
  const h17 = sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, (h) => { html17 = h; });
  ok(h17 === true && /Backend RS snapshot invalid: SPY benchmark unavailable at generation time/.test(html17),
     'panel shows the invalid-snapshot diagnostic');
  ok(html17.indexOf('No RS strong candidates') < 0, 'panel does NOT show "No RS strong candidates" for an invalid snapshot');
  ok(sandbox.window._rsScanDiag.needsBackendRefresh === true && sandbox.window._rsScanDiag.snapshotValid === false,
     'debug object reports snapshotValid=false / needsBackendRefresh=true');

  // ── 18. "No RS strong candidates" only for a VALID snapshot ────────────────
  section('18. "No RS strong candidates" only when the snapshot is valid');
  resetS([]);
  // valid snapshot, SPY benchmark available, but 0 outperformers (only an underperformer)
  const validNoStrong = { ok: true, generatedAt: new Date().toISOString(), stale: false, universe: 10, analyzed: 10,
    dataSource: 'backend_candle_store', spy: { candles: 207, source: 'backend_candle_store' },
    results: [{ ticker: 'WWW', direction: 'underperformer', rs20: -5, rsScore: -5, price: 50 }],
    skipped: [{ ticker: 'AAA', reason: 'rs_below_threshold', rsScore: 1.0 }] };
  const stV = sandbox.rsbState(); stV.parsed = sandbox.rsbParseSnapshot(validNoStrong); stV.endpointSupported = true; stV.lastFetchAt = Date.now();
  let html18 = null;
  sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, (h) => { html18 = h; });
  ok(/No RS strong candidates/.test(html18), 'valid snapshot with 0 outperformers shows "No RS strong candidates"');
  ok(sandbox.window._rsScanDiag.snapshotValid === true, 'debug object reports snapshotValid=true');

  // ── 19. Refresh triggers POST /scanner/rs/snapshot/run, then GET ───────────
  section('19. Refresh POSTs /scanner/rs/snapshot/run then GETs the snapshot');
  resetS([]);
  gateOpen = true; spy1dWarmups = 0; spy4hWarmups = 0; sandbox._rsbBenchWarmAt = 0; fetchCalls = [];
  sandbox.fetch = makeFetch((url, opts) => {
    if (/\/scanner\/rs\/snapshot\/run$/.test(url)) return { ok: true, status: 200, json: async () => ({ ok: true }) };
    return { ok: true, status: 200, json: async () => snapshotOk() };
  });
  sandbox.rsbState().lastFetchAt = Date.now();
  await sandbox.rsbRefreshClicked();
  const postCall = fetchCalls.find((c) => /\/scanner\/rs\/snapshot\/run$/.test(c.url));
  const getCall = fetchCalls.find((c) => /\/scanner\/rs\/snapshot$/.test(c.url));
  ok(postCall && String(postCall.opts.method).toUpperCase() === 'POST', 'Refresh issued POST /scanner/rs/snapshot/run');
  ok(getCall && (!getCall.opts.method || String(getCall.opts.method).toUpperCase() === 'GET'), 'Refresh then issued GET /scanner/rs/snapshot');
  ok(fetchCalls.indexOf(postCall) < fetchCalls.indexOf(getCall), 'POST run happened BEFORE the GET re-read');
  ok(!fetchCalls.some((c) => /\/scanner\/run\b/.test(c.url)), 'Refresh never calls /scanner/run');
  const trigBody = stripComments(extractFn(HTML, 'rsbTriggerBackendRun'));
  ok(/scanner\/rs\/snapshot\/run/.test(trigBody) && !/['"]\/scanner\/run/.test(trigBody) && trigBody.indexOf('runScan') < 0,
     'rsbTriggerBackendRun targets the dedicated RS run endpoint (never /scanner/run)');
  const refBody = stripComments(extractFn(HTML, 'rsbRefreshClicked'));
  ok(/rsbTriggerBackendRun\(\)/.test(refBody) && !/['"]\/scanner\/run/.test(refBody) && refBody.indexOf('runScan') < 0,
     'rsbRefreshClicked delegates to the RS run trigger (never /scanner/run)');

  // ── 20. POST run failure → diagnostic error, not "No candidates" ───────────
  section('20. backend run failure → diagnostic error (not "No candidates")');
  resetS([]);
  gateOpen = true; fetchCalls = [];
  sandbox.fetch = makeFetch((url) => {
    if (/\/scanner\/rs\/snapshot\/run$/.test(url)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => snapshotSpyUnavailable() }; // still invalid after run
  });
  sandbox.rsbState().lastFetchAt = 0;
  await sandbox.rsbRefreshClicked();
  ok(sandbox.rsbState().runSupported === false && sandbox.rsbState().runError === 'endpoint_unsupported',
     'a 404 on the run endpoint is recorded as unsupported');
  let html20 = null;
  sandbox.rsbMaybeRenderBackendRs('HDR', 'STRONG', '20D', sandbox.S.rsScannerFilters, false, (h) => { html20 = h; });
  ok(/Backend RS snapshot invalid/.test(html20) && /Backend refresh unavailable/.test(html20),
     'UI shows "Backend refresh unavailable" diagnostic');
  ok(html20.indexOf('No RS strong candidates') < 0, 'UI does NOT fall back to "No RS strong candidates"');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
})();
