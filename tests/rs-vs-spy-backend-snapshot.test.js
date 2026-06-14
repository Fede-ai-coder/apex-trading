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
];

// ── fetch stub / counters ────────────────────────────────────────────────────
let fetchCalls = [];
function makeFetch(responder) {
  return async function (url, opts) {
    fetchCalls.push({ url: url, opts: opts || {} });
    return responder(url, opts);
  };
}

const sandbox = {
  console, Date, JSON, Math, isFinite, Number, Object,
  RSB_SNAPSHOT_TTL_MS: 60000,
  BACKEND: 'http://backend.test',
  _rsActive: false,
  _rsCandidateList: [],
  _rsFlagFilter: 'all',
  S: null,
  fetch: null,
  AbortSignal: { timeout: function () { return undefined; } },
  _backendAuthHeaders: function () { return { 'x-api-key': 'k' }; },
  // UI/render stubs (display-only helpers the consumer calls)
  escHtml: function (s) { return String(s == null ? '' : s); },
  _rsApplySort: function (a) { return a; },
  _rsApplyFlagFilter: function (a) { return a; },
  _rsFlagFilterEmptyHtml: function () { return 'FLAG_EMPTY'; },
  _rsTableHtml: function (cands) { return 'TABLE[' + cands.map(function (c) { return c.ticker; }).join(',') + ']'; },
  localStorage: { getItem: function () { return null; } },
  renderRsScanner: function () {},
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
    skipped: [{ ticker: 'ZZZ', reason: 'INSUFFICIENT_DATA' }],
  };
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

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
})();
