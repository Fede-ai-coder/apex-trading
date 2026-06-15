'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend-driven Directional Scanner (DSB) — consumer of
// GET /scanner/directional/snapshot.
//
// Covers:
//   A. UI reads the backend snapshot (parse + render of the §contract payload)
//   B. results show freshness / source / last-updated / warnings
//   C. row click opens the detail (backend-candle charts) WITHOUT S.scanData
//   D. S.scanData is never the primary source on the backend path
//   E. snapshot survives tab/chart switches (state cache, TTL — no refetch)
//   F. fetches happen only from explicit render/refresh paths (source guards:
//      GET-only, no scanner-run POST, no WebSocket/subscriptions, no timers)
//
// Extracts the real functions from index.html into a vm sandbox so the tests
// cannot drift from app code. Run: node tests/backend-directional-snapshot.test.js
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
function sourceBetween(a, b) {
  const start = HTML.indexOf(a), end = HTML.indexOf(b, start + a.length);
  if (start < 0 || end < 0) throw new Error('source markers not found');
  return HTML.slice(start, end);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── sandbox ───────────────────────────────────────────────────────────────────
const elements = {};
function el(id) {
  if (!elements[id]) {
    elements[id] = {
      id, style: {}, innerHTML: '', textContent: '', className: '', disabled: false, onclick: null,
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); }, remove(c) { this.classes.delete(c); },
        toggle(c, on) { if (on) this.classes.add(c); else this.classes.delete(c); },
        contains(c) { return this.classes.has(c); },
      },
      querySelector: () => null,
      scrollIntoView: () => {},
    };
  }
  return elements[id];
}
const local = new Map();
let fetchCalls = [];
let fetchResponder = null;
function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
const contextCalls = [];
let renderSpyCalls = 0;
let largeChartCalls = [];

// ── controllable fakes for the live-patch / auto-refresh tests ───────────────
let intervalSeq = 1;
let intervalTimers = [];                 // {id, fn, ms}
function fakeSetInterval(fn, ms) { const id = intervalSeq++; intervalTimers.push({ id, fn, ms }); return id; }
function fakeClearInterval(id) { intervalTimers = intervalTimers.filter((t) => t.id !== id); }
let _rthOpen = true;                      // controls isRTHOpen()
let subscribeCalls = [];                  // each subscribeDxlinkQuotes(symbols) call
let liveQuoteMap = {};                    // symbol -> live price (absent ⇒ null)
let liveQuoteCalls = [];                  // each fetchLiveQuote(symbol) call

const sandbox = {
  console, JSON, Object, String, Number, Math, Array, Boolean, Date, isFinite, parseFloat, isNaN,
  Promise, setTimeout, clearTimeout, Error, AbortSignal,
  setInterval: fakeSetInterval, clearInterval: fakeClearInterval,
  S: { scanData: [], backendKey: 'test-key', dxlinkStatus: { state: 'ready' } },
  _activeView: 'dashboard',
  isRTHOpen: () => _rthOpen,
  subscribeDxlinkQuotes: async (syms) => { subscribeCalls.push((syms || []).slice()); },
  fetchLiveQuote: async (sym) => { liveQuoteCalls.push(sym); return (liveQuoteMap[sym] != null) ? liveQuoteMap[sym] : null; },
  BACKEND: 'https://test.backend',
  DSB_SNAPSHOT_TTL_MS: 60000,
  DSB_AUTO_REFRESH_MS: 600000,
  DSB_LIVE_ENRICH_TTL_MS: 30000,
  DSB_LIVE_SYMBOL_CAP: 30,
  DSB_PRICE_FRESH_MS: 300000,
  _backendAuthHeaders: () => ({}),
  escHtml: (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  document: {
    getElementById: el,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  localStorage: {
    getItem: (k) => (local.has(k) ? local.get(k) : null),
    setItem: (k, v) => local.set(k, String(v)),
    removeItem: (k) => local.delete(k),
  },
  fetch: async function (url, opts) {
    fetchCalls.push({ url, opts });
    if (!fetchResponder) throw new Error('no fetch responder configured');
    return fetchResponder(url, opts);
  },
  // DSS globals + helpers the module reuses
  _dssMode: 'LONG', _dssSortCol: null, _dssSortDir: 'desc', _dssCandidateList: [], _dssDetailSymbol: null, _dssKeyHandler: null,
  _dssFlagFilter: 'all',
  _dssGetFlagFilter: () => sandbox._dssFlagFilter,
  _dssSetFlagFilter: () => {},
  _dssApplyFlagFilter: (c) => c,
  _dssIsFlaggedSymbol: () => false,
  _dssOnFlagClick: () => false,
  getCanonicalIvr: () => ({ ivr: 55, source: 'TASTYTRADE', reason: null }),
  postCandleContext: (o) => { contextCalls.push(o); },
  renderDirectionalSetupScanner: () => { renderSpyCalls++; },
  // detail-open dependencies
  getDirectionalTechnicalState: () => null,
  _dssRenderLargeCharts: (sym) => { largeChartCalls.push(sym); },
  showDetail: () => {},
  bssState: () => null,
  window: {},
};
vm.createContext(sandbox);

const FNS = [
  // DSB module
  'ffBackendDirectionalSnapshot', 'dsbState', '_dsbNum', '_dsbStr', '_dsbBool', '_dsbObj', '_dsbSafeSym',
  'dsbFmtAge', 'dsbFmtClock', 'dsbSourceMode', 'dsbSetSourceMode',
  'dsbNormalizeResultRow', 'dsbParseSnapshot', 'dsbSnapshotAgeMs',
  'dsbLegacyOperationalSource', 'dsbLegacySnapshotPresent', 'dsbGetBackendSource',
  'dsbScannerTabActive', 'dsbFetchSnapshot', 'dsbRefreshClicked',
  // live-price patching + auto-refresh lifecycle
  'dsbClassifyRowPrice', 'dsbRowPriceIsCurrent', 'dsbRepaintIfSafe', 'dsbEnrichVisibleRowsLive',
  'dsbAutoRefreshActive', 'dsbStartAutoRefresh', 'dsbStopAutoRefresh',
  'dsbFindRow', 'dsbScanRowShim', 'dsbTechnicalStateShim',
  'dsbRowsForMode', 'dsbFreshnessBadgeHtml', 'dsbBannerHtml', 'dsbControlsHtml', 'dsbRowHtml',
  'dsbRenderBackendDirectional', 'dsbMaybeRenderBackendDirectional', 'dsbSourceNoticeHtml',
  'apexDebugBackendDirectionalSnapshot',
  // chart-open wiring + spec'd debug surface
  'dsbNoteDirectionalChartOpen', 'apexDebugDirectionalBackendSnapshot',
  // real legacy adapter (for the legacy-operational fallback path)
  '_bdsNum', '_bdsBoolOrNull', '_bdsStrOrNull',
  'bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow',
  'bdsSortBackendDirectionalRows', 'bdsDeriveBackendDirectionalRows',
  // real sort/header helpers shared with the frontend table
  '_dssApplySort', '_dssTh',
  // real detail-open (uses the shims when S.scanData misses the symbol)
  'openDirectionalSetupDetail',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── fixtures ─────────────────────────────────────────────────────────────────
const GEN_AT = new Date(Date.now() - 120000).toISOString(); // 2 minutes old
function contractSnapshot() {
  return {
    ok: true,
    generatedAt: GEN_AT,
    symbolsScanned: 5, symbolsPassed: 2, symbolsSkipped: 1,
    dataSource: 'backend_candle_store',
    results: [
      {
        symbol: 'AAPL', direction: 'bullish', score: 87,
        lastPrice: 228.4, lastPriceSource: 'dxlink_live', lastPriceUpdatedAt: '2026-06-11T14:29:58Z', lastPriceIsLive: true,
        timeframe1D: { candlesCount: 251, lastTimestamp: '2026-06-11', indicators: { rsi14: 64.2, sma8: 226.1, sma20: 221.3, sma30: 218.8, relativeStrengthVsSpy: 0.041, rsRising: true, squeeze: false }, stale: false },
        timeframe4H: { candlesCount: 120, lastTimestamp: '2026-06-11T13:30:00Z', source: 'derived_30M', derivedFrom30M: true, derivationReason: 'aggregated_from_native_30M', indicators: { rsi14: 61.0 }, stale: false },
        reasons: ['rsi_above_59', 'sma20_above_sma30', 'rs_positive'], warnings: [], staleFlags: {},
      },
      {
        symbol: 'BA', direction: 'bearish', score: 71,
        lastPrice: 175.2, lastPriceSource: 'backend_cache', lastPriceUpdatedAt: '2026-06-11T13:55:00Z', lastPriceIsLive: false, lastPriceStaleReason: 'dxlink_unavailable',
        timeframe1D: { candlesCount: 251, indicators: { rsi14: 31.5, sma20: 181.0, sma30: 184.2, relativeStrengthVsSpy: -0.032, rsRising: false }, stale: false },
        timeframe4H: { candlesCount: 118, source: 'derived_30M', derivedFrom30M: true, indicators: {}, stale: true },
        reasons: ['rsi_below_39'], warnings: ['price_not_live'], staleFlags: { tf4h: true },
      },
    ],
    skipped: [{ symbol: 'NVDA', reason: 'missing_4H_candles', missingData: ['4H'], queuedWarmup: true }],
    freshness: { stale: false },
    diagnostics: { universe: { count: 5 }, backendCandlesUsed: true, frontendDependency: false, warnings: ['SPY benchmark missing — RS flags not computed'] },
  };
}

(async function main() {

  // ── 1. feature flag + source mode ──────────────────────────────────────────
  section('1. feature flag and source-mode persistence');
  ok(sandbox.ffBackendDirectionalSnapshot() === true, 'feature flag defaults ON');
  local.set('apex_ff_backend_directional_snapshot', '0');
  ok(sandbox.ffBackendDirectionalSnapshot() === false, 'localStorage "0" turns the flag OFF');
  local.delete('apex_ff_backend_directional_snapshot');
  ok(sandbox.dsbSourceMode() === 'auto', 'source mode defaults to auto (backend when available)');
  renderSpyCalls = 0;
  sandbox.dsbSetSourceMode('frontend');
  ok(sandbox.dsbSourceMode() === 'frontend' && local.get('apex_dss_source_mode') === 'frontend', 'forced frontend mode persists');
  ok(renderSpyCalls === 1, 'switching source re-renders the scanner panel');
  sandbox.dsbSetSourceMode('auto');

  // ── 2. row normalization ────────────────────────────────────────────────────
  section('2. dsbNormalizeResultRow — contract mapping');
  {
    const r = sandbox.dsbNormalizeResultRow(contractSnapshot().results[0]);
    ok(r.ticker === 'AAPL' && r.direction === 'bullish' && r.score === 87, 'symbol/direction/score mapped');
    ok(r.price === 228.4 && r.priceSource === 'dxlink_live' && r.priceIsLive === true, 'lastPrice + source + live flag mapped');
    ok(r.rsi === 64.2 && r.ma20 === 221.3 && r.ma30 === 218.8 && r.sma20AboveSma30 === true, '1D indicators mapped, SMA relation derived');
    ok(r.rs === 0.041 && r.rsRising === true, 'relative strength vs SPY mapped');
    ok(r.tf4h && r.tf4h.derivedFrom30M === true && r.tf4h.source === 'derived_30M' && r.tf4h.derivationReason === 'aggregated_from_native_30M', '4H derivation metadata preserved');
    ok(r.stale === false && Array.isArray(r.reasons) && r.reasons.length === 3, 'reasons preserved, row not stale');
  }
  {
    const r = sandbox.dsbNormalizeResultRow(contractSnapshot().results[1]);
    ok(r.priceIsLive === false && r.priceStaleReason === 'dxlink_unavailable', 'non-live fallback price flagged with reason');
    ok(r.stale === true, '4H stale / staleFlags mark the row stale');
  }
  {
    const long = sandbox.dsbNormalizeResultRow({ symbol: 'X', direction: 'LONG' });
    const short = sandbox.dsbNormalizeResultRow({ symbol: 'Y', direction: 'Short' });
    ok(long.direction === 'bullish' && short.direction === 'bearish', 'LONG/SHORT aliases map to bullish/bearish');
    const none = sandbox.dsbNormalizeResultRow({ symbol: 'Z' });
    ok(none.direction === null && none.warnings.indexOf('missing_operational_direction') >= 0, 'missing direction → null + warning');
    const bad = sandbox.dsbNormalizeResultRow({ symbol: 'BAD"><img src=x>', direction: 'bullish' });
    ok(bad.ticker === null, 'unsafe symbols are rejected (no attribute injection)');
    const brk = sandbox.dsbNormalizeResultRow({ symbol: 'brk.b', direction: 'bullish' });
    ok(brk.ticker === 'BRK.B', 'special class tickers (BRK.B) normalize fine');
  }

  // ── 3. snapshot parsing ─────────────────────────────────────────────────────
  section('3. dsbParseSnapshot — payload contract');
  {
    const p = sandbox.dsbParseSnapshot(contractSnapshot());
    ok(p.ok === true && p.results.length === 2 && p.skipped.length === 1, 'ok snapshot parses results + skipped');
    ok(p.generatedAt === GEN_AT && p.stale === false && p.dataSource === 'backend_candle_store', 'freshness + dataSource parsed');
    ok(p.skipped[0].symbol === 'NVDA' && p.skipped[0].queuedWarmup === true && p.skipped[0].reason === 'missing_4H_candles', 'skipped entry carries reason + warmup queue flag');
    ok(p.warnings.some((w) => w.indexOf('SPY benchmark missing') >= 0), 'SPY benchmark warning surfaces from diagnostics');
    ok(p.symbolsScanned === 5 && p.symbolsPassed === 2, 'scan counters parsed');
  }
  ok(sandbox.dsbParseSnapshot(null).ok === false && sandbox.dsbParseSnapshot(null).reason === 'empty_payload', 'null payload → safe not-ok parse');
  ok(sandbox.dsbParseSnapshot({ ok: false, reason: 'NO_SNAPSHOT' }).reason === 'NO_SNAPSHOT', 'ok:false keeps the backend reason');
  ok(sandbox.dsbParseSnapshot({ ok: true, results: 'garbage', skipped: 42 }).results.length === 0, 'malformed arrays degrade to empty, never throw');

  // ── 4. fetch lifecycle: TTL, single-flight, 404, errors ────────────────────
  section('4. fetch lifecycle (GET-only, TTL-deduped, single-flight)');
  fetchResponder = () => jsonResponse(200, contractSnapshot());
  fetchCalls = [];
  await sandbox.dsbFetchSnapshot();
  ok(fetchCalls.length === 1 && fetchCalls[0].url === 'https://test.backend/scanner/directional/snapshot', 'fetches GET /scanner/directional/snapshot');
  ok(!fetchCalls[0].opts || !fetchCalls[0].opts.method || fetchCalls[0].opts.method === 'GET', 'request is a plain GET (no method override)');
  ok(sandbox.dsbState().parsed && sandbox.dsbState().parsed.ok === true && sandbox.dsbState().endpointSupported === true, 'parsed snapshot stored on S.backendDirectional');
  await sandbox.dsbFetchSnapshot();
  ok(fetchCalls.length === 1, 'second call within the 60s TTL does not re-fetch');
  await sandbox.dsbFetchSnapshot({ force: true });
  ok(fetchCalls.length === 2, 'force:true bypasses the TTL (manual REFRESH)');
  sandbox.dsbState().fetching = true;
  await sandbox.dsbFetchSnapshot({ force: true });
  ok(fetchCalls.length === 2, 'single-flight: no parallel fetch while one is in progress');
  sandbox.dsbState().fetching = false;

  // 404 → endpoint not deployed
  {
    sandbox.S.backendDirectional = null; // reset state
    fetchResponder = () => jsonResponse(404, { error: 'not found' });
    fetchCalls = [];
    await sandbox.dsbFetchSnapshot();
    const st = sandbox.dsbState();
    ok(st.endpointSupported === false && st.error === null && st.lastHttpStatus === 404, '404 marks endpointSupported=false without surfacing an error');
    ok(sandbox.dsbGetBackendSource().available === false && sandbox.dsbGetBackendSource().reason === 'endpoint_unsupported', 'source unavailable: endpoint_unsupported');
  }
  // transport error
  {
    sandbox.S.backendDirectional = null;
    fetchResponder = () => { throw new Error('network down'); };
    await sandbox.dsbFetchSnapshot();
    const st = sandbox.dsbState();
    ok(/network down/.test(st.error || ''), 'transport failure stored as error');
    ok(sandbox.dsbGetBackendSource().reason === 'fetch_error', 'source unavailable: fetch_error');
  }

  // ── 5. source cascade (new endpoint → legacy operational → unavailable) ────
  section('5. dsbGetBackendSource cascade');
  {
    sandbox.S.backendDirectional = null;
    fetchResponder = () => jsonResponse(200, contractSnapshot());
    await sandbox.dsbFetchSnapshot();
    const src = sandbox.dsbGetBackendSource();
    ok(src.available === true && src.origin === 'directional_snapshot' && src.rows.length === 2, 'new endpoint snapshot is the primary source');
    ok(src.stale === false && typeof src.ageMs === 'number' && src.ageMs >= 110000 && src.ageMs <= 200000, 'age derived from generatedAt');
  }
  {
    // diagnostic-only legacy snapshot (today's backend): NOT accepted as operational
    sandbox.S.backendDirectional = null;
    sandbox.dsbState().endpointSupported = false; // pretend new endpoint 404'd
    sandbox.dsbState().lastFetchAt = Date.now();
    const diagCand = {
      symbol: 'MSFT', price: 400, rsi14: 62, sma20: 390, sma30: 380,
      directionDiagnostics: { candidateDirection: 'bullish', confidence: 'high' },
      scoreDiagnostics: { usable: true, rankEligible: true, scorePreview: 80, scoreBucket: 'A' },
      technicalCoverage: { completeCoreTechnicals: true },
      cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 251 },
      direction: null, score: null,
    };
    sandbox.bssState = () => ({ snapshot: { ok: true, candidates: [diagCand] }, status: {} });
    const src = sandbox.dsbGetBackendSource();
    ok(src.available === false && src.reason === 'diagnostic_only', 'diagnostic-only legacy snapshot (direction:null) never activates the backend path');
    // promote to operational → legacy fallback becomes available
    const opCand = Object.assign({}, diagCand, { direction: 'bullish', score: 82 });
    sandbox.bssState = () => ({ snapshot: { ok: true, candidates: [opCand] }, status: {} });
    const src2 = sandbox.dsbGetBackendSource();
    ok(src2.available === true && src2.origin === 'legacy_operational' && src2.rows[0].ticker === 'MSFT' && src2.rows[0].direction === 'bullish' && src2.rows[0].score === 82,
      'legacy snapshot WITH operational direction/score is consumed as fallback');
    sandbox.bssState = () => null;
  }

  // ── 6. backend-first rendering (no S.scanData involved) ────────────────────
  section('6. backend-first render with EMPTY S.scanData');
  {
    sandbox.S.backendDirectional = null;
    sandbox.S.scanData = [];
    fetchResponder = () => jsonResponse(200, contractSnapshot());
    fetchCalls = [];
    contextCalls.length = 0;
    await sandbox.dsbFetchSnapshot();
    const scanRef = sandbox.S.scanData;
    const painted = sandbox.dsbMaybeRenderBackendDirectional();
    ok(painted === true, 'panel renders from the backend snapshot with S.scanData EMPTY (no frontend scan run)');
    ok(el('panelHeader').textContent === 'DIRECTIONAL SCANNER', 'panel header set');
    const html = el('panelContent').innerHTML;
    ok(/data-ticker="AAPL"/.test(html) && !/data-ticker="BA"/.test(html), 'LONG mode shows bullish rows only');
    ok(/backend directional snapshot/.test(html) && /updated/.test(html) && />FRESH</.test(html), 'banner shows source, last-updated and FRESH badge');
    ok(/1 skipped/.test(html) && /NVDA \(missing_4H_candles, warmup queued\)/.test(html), 'skipped symbols listed with reason + warmup queue');
    ok(/SPY benchmark missing/.test(html), 'backend warnings (SPY benchmark) surface in the panel');
    ok(/prices: 1 live \/ 1 cached\/close/.test(html), 'live vs cached price breakdown shown');
    ok(/&middot;D/.test(html), '4H column marks server-side derived-from-30M data');
    ok(/openDirectionalSetupDetail\('AAPL'\)/.test(html), 'row click opens the standard detail (backend-candle charts)');
    ok(/>87</.test(html), 'backend operational score rendered');
    ok(/>55%</.test(html), 'IVR display enrichment via canonical IVR source');
    ok(sandbox._dssCandidateList.length === 1 && sandbox._dssCandidateList[0] === 'AAPL', 'arrow-key nav list fed from backend rows');
    ok(contextCalls.length === 1 && contextCalls[0].scanner === 'directional' && contextCalls[0].visibleSymbols.join(',') === 'AAPL', 'visible rows prewarm hint posted (context only, no candle GET fan-out)');
    ok(sandbox.S.scanData === scanRef && sandbox.S.scanData.length === 0, 'S.scanData untouched — backend path never reads or writes it');
    ok(fetchCalls.length === 1, 'render inside the TTL repaints from cache without a new fetch');

    // SHORT mode → bearish row with stale + non-live markers
    sandbox._dssMode = 'SHORT';
    sandbox.dsbMaybeRenderBackendDirectional();
    const shortHtml = el('panelContent').innerHTML;
    ok(/data-ticker="BA"/.test(shortHtml) && !/data-ticker="AAPL"/.test(shortHtml), 'SHORT mode shows bearish rows only');
    ok(/Backend marks this row stale/.test(shortHtml), 'stale rows carry a stale marker');
    ok(/not live/.test(shortHtml) && /dxlink_unavailable/.test(shortHtml), 'non-live fallback price labelled with its source/reason');
    sandbox._dssMode = 'LONG';
  }

  // ── 7. snapshot survives tab/panel switches ────────────────────────────────
  section('7. snapshot persists across tab switches (state cache)');
  {
    fetchCalls = [];
    // simulate leaving for another tab and coming back: just re-render
    const painted = sandbox.dsbMaybeRenderBackendDirectional();
    ok(painted === true && /data-ticker="AAPL"/.test(el('panelContent').innerHTML), 're-render after tab switch repaints from S.backendDirectional cache');
    ok(fetchCalls.length === 0, 'no refetch within the TTL on tab return');
  }

  // ── 8. forced frontend mode + source notice ────────────────────────────────
  section('8. forced frontend mode and source notice');
  {
    sandbox.dsbSetSourceMode('frontend');
    ok(sandbox.dsbMaybeRenderBackendDirectional() === false, 'forced frontend mode never paints the backend table');
    const notice = sandbox.dsbSourceNoticeHtml();
    ok(/SOURCE: frontend scan data/.test(notice) && /backend snapshot available/.test(notice) && /USE BACKEND/.test(notice), 'frontend mode notice offers switch back to backend');
    sandbox.dsbSetSourceMode('auto');
    // unavailable reason text
    sandbox.S.backendDirectional = null;
    sandbox.dsbState().endpointSupported = false;
    sandbox.dsbState().lastFetchAt = Date.now();
    const n2 = sandbox.dsbSourceNoticeHtml();
    ok(/BACKEND SOURCE UNAVAILABLE/.test(n2) && /backend endpoint not deployed/.test(n2) && /using frontend scan data/.test(n2), 'auto mode explains why the backend source is unavailable');
  }

  // ── 9. fetch completion repaint guards ─────────────────────────────────────
  section('9. fetch completion never stomps detail / other panels');
  {
    sandbox.S.backendDirectional = null;
    fetchResponder = () => jsonResponse(200, contractSnapshot());
    el('ptab-scanner').className = 'ptab active';
    sandbox._dssDetailSymbol = null;
    renderSpyCalls = 0;
    await sandbox.dsbFetchSnapshot();
    ok(renderSpyCalls === 1, 'scanner tab active + no detail open → list repaints after fetch');
    sandbox._dssDetailSymbol = 'AAPL'; // detail chart open
    renderSpyCalls = 0;
    await sandbox.dsbFetchSnapshot({ force: true });
    ok(renderSpyCalls === 0, 'open detail (selected symbol) is never closed/reset by a snapshot repaint');
    sandbox._dssDetailSymbol = null;
    el('ptab-scanner').className = 'ptab'; // other tab active
    renderSpyCalls = 0;
    await sandbox.dsbFetchSnapshot({ force: true });
    ok(renderSpyCalls === 0, 'fetch completion on another tab does not repaint the scanner panel');
    el('ptab-scanner').className = 'ptab active';
  }

  // ── 10. detail opens WITHOUT S.scanData via the backend shims ──────────────
  section('10. openDirectionalSetupDetail works for backend-only symbols');
  {
    sandbox.S.scanData = [];
    // shims read the current backend source (populated in section 9)
    const shimRow = sandbox.dsbScanRowShim('AAPL');
    ok(shimRow && shimRow.ticker === 'AAPL' && shimRow._dsbBackendRow === true && shimRow.candles === null, 'scan-row shim built from the backend snapshot (no fabricated candles)');
    const ts = sandbox.dsbTechnicalStateShim('AAPL');
    ok(ts && ts.price === 228.4 && ts.rsi === 64.2 && ts.sma20AboveSma30 === true && ts._source === 'BACKEND_DIRECTIONAL_SNAPSHOT', 'technical-state shim mirrors getDirectionalTechnicalState shape from backend indicators');
    ok(Math.abs(ts.rs - 4.1) < 1e-9, 'RS fraction converted to percent for the info bar');

    largeChartCalls = [];
    sandbox.openDirectionalSetupDetail('AAPL');
    ok(sandbox._dssDetailSymbol === 'AAPL', 'detail opens for a symbol absent from S.scanData');
    ok(/AAPL/.test(el('dssDetailSym').textContent), 'detail header shows the symbol');
    ok(/228\.40/.test(el('dss-info-bar').innerHTML) && /64\.2/.test(el('dss-info-bar').innerHTML), 'info bar shows backend price + RSI');
    await sleep(90); // _dssRenderLargeCharts is scheduled via setTimeout(...,60)
    ok(largeChartCalls.length === 1 && largeChartCalls[0] === 'AAPL', 'detail chart render invoked (charts load backend candles — see chart-open-backend-candles tests)');
    ok(sandbox.openDirectionalSetupDetail('NOPE') === undefined && sandbox._dssDetailSymbol === 'AAPL', 'unknown symbol still bails safely');
    sandbox._dssDetailSymbol = null;
  }

  // ── 11. debug helper ────────────────────────────────────────────────────────
  section('11. debug helper');
  {
    const dbg = sandbox.apexDebugBackendDirectionalSnapshot();
    ok(dbg.featureOn === true && dbg.available === true && dbg.origin === 'directional_snapshot' && dbg.rowCount === 2 && dbg.skippedCount === 1,
      'debug helper reports source, availability, rows and skipped counts');
  }

  // ── 12. source-level guards ─────────────────────────────────────────────────
  section('12. source guards: GET-only snapshot, one guarded auto-refresh timer, reuses shared quote helpers');
  {
    const moduleSrc = sourceBetween('BACKEND DIRECTIONAL SNAPSHOT (DSB) — backend-driven Directional Scanner',
      'BACKEND SCANNER SNAPSHOT — diagnostic-preview visibility panel');
    const code = stripComments(moduleSrc);
    ok(code.indexOf('/scanner/directional/snapshot') >= 0, 'module reads GET /scanner/directional/snapshot');
    ok(code.indexOf('/scanner/run') < 0 && code.indexOf('/scanner/directional/run') < 0, 'module never wires a backend scan-run trigger');
    ok(!/method\s*:\s*['"]POST['"]/.test(code), 'module declares no POST itself (live quotes go through the shared subscribeDxlinkQuotes helper)');
    // Exactly ONE auto-refresh timer, and it is created behind the idempotent
    // dsbStartAutoRefresh guard (never stacks duplicates) + has a matching stop.
    const intervalMatches = code.match(/setInterval\s*\(/g) || [];
    ok(intervalMatches.length === 1, 'module creates exactly one setInterval (the guarded auto-refresh timer)');
    ok(/if\s*\(\s*st\.autoRefreshTimerId\s*\)\s*return/.test(code), 'auto-refresh start short-circuits when a timer already exists (no duplicate timers)');
    ok(/clearInterval\s*\(\s*st\.autoRefreshTimerId\s*\)/.test(code), 'auto-refresh stop clears the timer');
    // Live-price patching reuses the SHARED, deduped helpers — it never opens its
    // own socket / candle stream and never defines a subscription primitive.
    ok(!/new\s+WebSocket|_ensureCandleSubscription|_initCandleStream|subscribe-quotes/.test(code), 'module defines no market-data socket / candle stream of its own');
    ok(/subscribeDxlinkQuotes\s*\(/.test(code) && /fetchLiveQuote\s*\(/.test(code), 'module REUSES the shared subscribeDxlinkQuotes + fetchLiveQuote helpers for live patching');
    ok(!/S\.scanData/.test(code), 'module never reads or writes S.scanData (backend is the primary source)');
    ok(!/_loadBackendChartCandles\(|_scannerFetchBackendCandlesForChart\(/.test(code), 'module never fans out candle GETs from list renders');
    const fetchMatches = code.match(/fetch\s*\(/g) || [];
    ok(fetchMatches.length === 1, 'exactly one direct fetch() call site (dsbFetchSnapshot) — quote fetches go through the shared helper');

    // integration hooks are guarded so extracted functions degrade safely
    const renderSrc = stripComments(extractFn(HTML, 'renderDirectionalSetupScanner'));
    ok(/typeof\s+dsbMaybeRenderBackendDirectional\s*===\s*'function'\s*&&\s*dsbMaybeRenderBackendDirectional\(\)/.test(renderSrc),
      'renderDirectionalSetupScanner consults the backend source first (typeof-guarded)');
    ok(renderSrc.indexOf('dsbMaybeRenderBackendDirectional') < renderSrc.indexOf('computeDirectionalSetupCandidates'),
      'backend hook runs BEFORE any frontend S.scanData computation');
    const openSrc = stripComments(extractFn(HTML, 'openDirectionalSetupDetail'));
    ok(/dsbScanRowShim/.test(openSrc) && /dsbTechnicalStateShim/.test(openSrc), 'detail open falls back to backend shims when S.scanData misses the symbol');
    // partial-input safety: the module exposes no symbol-search entry point;
    // fetches are render/refresh-driven only.
    ok(code.indexOf('committedSymbol') < 0 && code.indexOf('searchInput') < 0, 'no symbol-search/partial-input pathway can trigger snapshot fetches');
  }

  // ── 13. chart open from the Directional Scanner (directional_chart_open) ───
  section('13. chart open posts a directional_chart_open prewarm hint');
  {
    sandbox._dssMode = 'LONG';
    sandbox.S.scanData = [];                 // backend-only symbol (no frontend scan run)
    sandbox.S.backendDirectional = null;
    fetchResponder = () => jsonResponse(200, contractSnapshot());
    await sandbox.dsbFetchSnapshot();
    contextCalls.length = 0;
    sandbox._dssDetailSymbol = null;
    sandbox.openDirectionalSetupDetail('AAPL');
    const hint = contextCalls.find((c) => c && c.reason === 'directional_chart_open');
    ok(!!hint, 'opening a directional chart fires postCandleContext({reason:"directional_chart_open"})');
    ok(hint && hint.activeSymbol === 'AAPL', 'chart-open hint carries the opened symbol');
    ok(hint && ['1D', '4H', '30M'].every((t) => (hint.timeframes || []).indexOf(t) >= 0),
      'chart-open hint includes 1D, 4H and 30M (4H is derived from 30M)');
    const dbg = sandbox.apexDebugDirectionalBackendSnapshot();
    ok(dbg.chartOpenContext && dbg.chartOpenContext.lastSymbol === 'AAPL', 'debug.chartOpenContext records the opened symbol');
    ok(dbg.chartOpenContext.lastPrice === 228.4 && dbg.chartOpenContext.lastPriceSource === 'dxlink_live',
      'chartOpenContext carries the backend last price + source (live)');
    ok(dbg.chartOpenContext.lastPriceUpdatedAt === '2026-06-11T14:29:58Z' && dbg.chartOpenContext.lastPriceIsLive === true,
      'chartOpenContext carries last-price freshness (updatedAt + isLive)');
    ok(dbg.chartOpenContext.candlesSource === 'backend_candle_store' && dbg.chartOpenContext.timeframes.join(',') === '1D,4H,30M',
      'chartOpenContext records the backend candle source + timeframes');
    // unknown / non-snapshot symbol never posts a hint (no partial / fabricated input)
    contextCalls.length = 0;
    sandbox._dssDetailSymbol = null;
    sandbox.openDirectionalSetupDetail('NOPE');
    ok(contextCalls.length === 0, 'unknown symbol bails before any chart-open hint (no partial input)');
    await sleep(80); // drain the scheduled _dssRenderLargeCharts timer
    sandbox._dssDetailSymbol = null;
  }

  // ── 14. spec'd debug surface: apexDebugDirectionalBackendSnapshot() ────────
  section('14. apexDebugDirectionalBackendSnapshot() spec shape');
  {
    sandbox.S.backendDirectional = null;
    fetchResponder = () => jsonResponse(200, contractSnapshot());
    await sandbox.dsbFetchSnapshot();
    const dbg = sandbox.apexDebugDirectionalBackendSnapshot();
    ok(dbg.source === 'BACKEND_DIRECTIONAL_SNAPSHOT', 'source label is BACKEND_DIRECTIONAL_SNAPSHOT');
    ok(dbg.endpoint === 'https://test.backend/scanner/directional/snapshot', 'endpoint reported');
    ok(dbg.snapshotLoaded === true && dbg.resultsCount === 2 && dbg.skippedCount === 1, 'snapshotLoaded + result/skipped counts');
    ok(dbg.symbols.join(',') === 'AAPL,BA' && Array.isArray(dbg.sampleRows) && dbg.sampleRows.length === 2, 'symbols + sampleRows surfaced');
    ok(typeof dbg.lastFetchAt === 'number' && dbg.fallbackUsed === false, 'lastFetchAt set + fallbackUsed=false on the primary endpoint path');
    ok(Array.isArray(dbg.staleWarnings), 'staleWarnings present as an array');
  }

  // ── 15. no candle-context duplication (reuses the shipped helper) ──────────
  section('15. reuses the existing candle-context helper (no duplication)');
  {
    const moduleSrc = sourceBetween('BACKEND DIRECTIONAL SNAPSHOT (DSB) — backend-driven Directional Scanner',
      'BACKEND SCANNER SNAPSHOT — diagnostic-preview visibility panel');
    ok(moduleSrc.indexOf('function postCandleContext') < 0, 'DSB module does NOT redefine postCandleContext');
    ok(moduleSrc.indexOf('function apexDebugCandleContext') < 0, 'DSB module does NOT redefine apexDebugCandleContext');
    ok(/postCandleContext\s*\(/.test(moduleSrc), 'DSB module CALLS the existing postCandleContext helper');
  }

  // ── 16. live-price patching + auto-refresh (market open) ───────────────────
  section('16. directional rows go live during market open + safe auto-refresh');

  // helper: load a fresh contract snapshot into module state
  async function loadSnapshot() {
    sandbox.S.backendDirectional = null;
    fetchResponder = () => jsonResponse(200, contractSnapshot());
    await sandbox.dsbFetchSnapshot({ enrichLive: false });
  }
  function resetLiveFakes() {
    subscribeCalls = []; liveQuoteCalls = []; liveQuoteMap = {}; _rthOpen = true;
    sandbox.S.dxlinkStatus = { state: 'ready' };
    intervalTimers = [];
    sandbox._dssDetailSymbol = null;
    sandbox.document.hidden = false;
    sandbox._activeView = 'dashboard';
    el('ptab-scanner').className = 'ptab active';
  }
  // Drain any fire-and-forget enrich kicked by a render, then clear the
  // single-flight / TTL guards so a following forced pass runs deterministically.
  async function settleBg() {
    await sleep(10);
    sandbox.dsbState().liveEnriching = false;
    sandbox.dsbState().lastLiveEnrichAt = null;
  }

  // 16a. price freshness classifier
  {
    resetLiveFakes();
    const liveRow = sandbox.dsbNormalizeResultRow(contractSnapshot().results[0]);  // lastPriceIsLive:true
    ok(sandbox.dsbClassifyRowPrice(liveRow) === 'live' && sandbox.dsbRowPriceIsCurrent(liveRow) === true, '16a: live backend flag → "live" (current)');
    const recentRow = sandbox.dsbNormalizeResultRow({ symbol: 'RC', direction: 'bullish', lastPrice: 10, lastPriceIsLive: false, lastPriceUpdatedAt: new Date(Date.now() - 60000).toISOString() });
    ok(sandbox.dsbClassifyRowPrice(recentRow) === 'recent' && sandbox.dsbRowPriceIsCurrent(recentRow) === true, '16a: fresh non-live quote (<5m) → "recent" (current)');
    const closeRow = sandbox.dsbNormalizeResultRow(contractSnapshot().results[1]); // stale reason set
    ok(sandbox.dsbClassifyRowPrice(closeRow) === 'close' && sandbox.dsbRowPriceIsCurrent(closeRow) === false, '16a: stale/cached quote → "close" (not current)');
    const naRow = sandbox.dsbNormalizeResultRow({ symbol: 'NA', direction: 'bullish' });
    ok(sandbox.dsbClassifyRowPrice(naRow) === 'unavailable', '16a: no price → "unavailable"');
  }

  // 16b. market open + live quote available → row becomes live, no triangle
  {
    resetLiveFakes();
    await loadSnapshot();
    sandbox.dsbMaybeRenderBackendDirectional();          // paints + kicks a background enrich
    await settleBg();
    liveQuoteMap = { AAPL: 230.11 };
    await sandbox.dsbEnrichVisibleRowsLive({ force: true });
    const row = sandbox.dsbFindRow('AAPL');
    ok(row.priceIsLive === true && row.priceSource === 'dxlink_live' && Math.abs(row.price - 230.11) < 1e-6, '16b: AAPL patched with the live DXLink mark + source=dxlink_live');
    ok(sandbox.dsbClassifyRowPrice(row) === 'live', '16b: classifier reports the patched row as live');
    sandbox.dsbMaybeRenderBackendDirectional();          // repaint to reflect the patch
    const html = el('panelContent').innerHTML;
    const aaplCell = html.slice(html.indexOf('data-ticker="AAPL"'), html.indexOf('data-ticker="AAPL"') + 400);
    ok(aaplCell.indexOf('&#9888;') < 0, '16b: no price-not-live triangle on the live AAPL row');
    ok(subscribeCalls.length >= 1 && subscribeCalls.some((c) => c.indexOf('AAPL') >= 0), '16b: subscribed the visible symbol via the shared helper');
  }

  // 16c. THE BUG: market open but backend serves cached/close (0 live) + no live
  // quote available → triangle stays + machine-readable reason surfaced.
  {
    resetLiveFakes();
    await loadSnapshot();
    // Reproduce "prices: 0 live / N cached/close" while the market is open.
    sandbox.dsbGetBackendSource().rows.forEach((r) => { r.priceIsLive = false; r.priceStaleReason = 'dxlink_unavailable'; r.priceUpdatedAt = null; });
    sandbox.dsbMaybeRenderBackendDirectional();
    await settleBg();
    liveQuoteMap = {};                                   // no live quote available
    await sandbox.dsbEnrichVisibleRowsLive({ force: true });
    const row = sandbox.dsbFindRow('AAPL');
    ok(row.priceIsLive !== true && sandbox.dsbClassifyRowPrice(row) === 'close', '16c: row stays on the cached/close fallback (no live quote)');
    sandbox.dsbMaybeRenderBackendDirectional();
    const html = el('panelContent').innerHTML;
    ok(html.indexOf('&#9888;') >= 0, '16c: price-not-live triangle remains on the non-live row');
    ok(/prices: 0 live \//.test(html), '16c: banner reflects 0 live while the backend served cached/close');
    ok(/live unavailable: (dxlink_not_ready|quote_missing)/.test(html), '16c: banner shows a machine-readable reason when no live price is used');
  }

  // 16c-2. market closed → no patch, reason=market_closed, no quote fetches
  {
    resetLiveFakes();
    await loadSnapshot();
    sandbox.dsbMaybeRenderBackendDirectional();
    await settleBg();
    _rthOpen = false;
    liveQuoteCalls = [];
    liveQuoteMap = { AAPL: 999 };
    await sandbox.dsbEnrichVisibleRowsLive({ force: true });
    ok(liveQuoteCalls.length === 0, '16c-2: market closed → no live-quote fetches issued (keeps cached/close)');
    ok(sandbox.dsbState().livePriceReason === 'market_closed', '16c-2: reason recorded as market_closed');
    const row = sandbox.dsbFindRow('AAPL');
    ok(Math.abs(row.price - 228.4) < 1e-6, '16c-2: AAPL keeps its backend price (no AH/PM contamination)');
  }

  // 16d. live quote arrives AFTER a cached render → row patched, counts update, triangle removed, repaint triggered
  {
    resetLiveFakes();
    await loadSnapshot();
    sandbox._dssMode = 'SHORT';                          // BA is the bearish row, non-live in the fixture
    sandbox.dsbMaybeRenderBackendDirectional();
    await settleBg();
    // a real (painting) repaint so we can observe counts/triangle update
    const realRender = sandbox.renderDirectionalSetupScanner;
    sandbox.renderDirectionalSetupScanner = () => { renderSpyCalls++; sandbox.dsbRenderBackendDirectional(sandbox.dsbGetBackendSource()); };
    renderSpyCalls = 0;
    liveQuoteMap = { BA: 180.5 };
    await sandbox.dsbEnrichVisibleRowsLive({ force: true });
    const row = sandbox.dsbFindRow('BA');
    ok(row.priceIsLive === true && Math.abs(row.price - 180.5) < 1e-6, '16d: late live quote patches the previously-cached BA row');
    ok((row.warnings || []).indexOf('price_not_live') < 0, '16d: price_not_live warning removed from the patched row');
    ok(renderSpyCalls >= 1, '16d: a safe repaint was triggered to refresh counts/triangle');
    const dbg = sandbox.apexDebugBackendDirectionalSnapshot();
    ok(dbg.priceCounts.live >= 1, '16d: summary live count incremented after the patch');
    sandbox.renderDirectionalSetupScanner = realRender;
    sandbox._dssMode = 'LONG';
  }

  // 16e. open detail chart / selected symbol is preserved during a live patch
  {
    resetLiveFakes();
    await loadSnapshot();
    sandbox.dsbMaybeRenderBackendDirectional();
    await settleBg();
    sandbox._dssDetailSymbol = 'AAPL';                   // a chart is open
    renderSpyCalls = 0;
    liveQuoteMap = { AAPL: 231.0 };
    await sandbox.dsbEnrichVisibleRowsLive({ force: true });
    ok(sandbox._dssDetailSymbol === 'AAPL', '16e: selected symbol untouched while a chart is open');
    ok(renderSpyCalls === 0, '16e: no panel repaint (would close the open chart) while detail is open');
    const row = sandbox.dsbFindRow('AAPL');
    ok(row.priceIsLive === true && Math.abs(row.price - 231.0) < 1e-6, '16e: the row data is still patched in the background');
    sandbox._dssDetailSymbol = null;
  }

  // 16f. ranking / formulas unchanged by a price patch
  {
    resetLiveFakes();
    await loadSnapshot();
    const before = sandbox.dsbGetBackendSource().rows.map((r) => ({ t: r.ticker, dir: r.direction, sc: r.score, rsi: r.rsi, ma20: r.ma20, ma30: r.ma30, rs: r.rs }));
    liveQuoteMap = { AAPL: 250, BA: 150 };
    await sandbox.dsbEnrichVisibleRowsLive({ force: true });
    const after = sandbox.dsbGetBackendSource().rows.map((r) => ({ t: r.ticker, dir: r.direction, sc: r.score, rsi: r.rsi, ma20: r.ma20, ma30: r.ma30, rs: r.rs }));
    ok(JSON.stringify(before) === JSON.stringify(after), '16f: direction/score/RSI/SMA/RS untouched by the price patch (ranking unchanged)');
  }

  // 16g. single-flight: no overlapping enrich passes
  {
    resetLiveFakes();
    await loadSnapshot();
    sandbox.dsbState().liveEnriching = true;             // a pass is "in progress"
    liveQuoteCalls = [];
    liveQuoteMap = { AAPL: 240 };
    await sandbox.dsbEnrichVisibleRowsLive({ force: true });
    ok(liveQuoteCalls.length === 0, '16g: enrich bails immediately while another pass is in progress (single-flight)');
    sandbox.dsbState().liveEnriching = false;
  }

  // 16h. TTL: repeated renders do not start a quote storm
  {
    resetLiveFakes();
    await loadSnapshot();
    liveQuoteMap = { AAPL: 230 };
    await sandbox.dsbEnrichVisibleRowsLive();             // first pass (no force) runs
    const afterFirst = liveQuoteCalls.length;
    ok(afterFirst >= 1, '16h: first enrich pass fetches quotes');
    await sandbox.dsbEnrichVisibleRowsLive();             // within TTL → skipped
    await sandbox.dsbEnrichVisibleRowsLive();
    ok(liveQuoteCalls.length === afterFirst, '16h: subsequent passes within the TTL issue no further quote fetches (no storm)');
  }

  // 16i. auto-refresh: runs once on open, one guarded timer, idempotent, stop clears
  {
    resetLiveFakes();
    await loadSnapshot();
    fetchCalls = [];
    sandbox.dsbState().lastFetchAt = null;               // allow the on-open fetch
    sandbox.dsbStartAutoRefresh();
    ok(intervalTimers.length === 1, '16i: dsbStartAutoRefresh installs exactly one timer');
    ok(intervalTimers[0].ms === 600000, '16i: timer cadence is the 10-minute snapshot refresh');
    const fetchesAfterOpen = fetchCalls.length;
    ok(fetchesAfterOpen >= 1, '16i: a snapshot fetch runs once on open');
    sandbox.dsbStartAutoRefresh();                        // repeated dashboard open
    sandbox.dsbStartAutoRefresh();
    ok(intervalTimers.length === 1, '16i: repeated starts never stack duplicate timers');
    // let the on-open fetch settle (single-flight releases) before the tick
    await sleep(10);
    // a tick re-fetches + re-enriches
    sandbox.dsbState().lastFetchAt = null;
    fetchCalls = [];
    await intervalTimers[0].fn();
    ok(fetchCalls.length >= 1, '16i: the interval tick re-fetches the snapshot');
    sandbox.dsbStopAutoRefresh();
    ok(intervalTimers.length === 0, '16i: dsbStopAutoRefresh clears the timer');
  }

  // 16j. auto-refresh paused off-dashboard / page hidden
  {
    resetLiveFakes();
    sandbox._activeView = 'portfolio';
    ok(sandbox.dsbAutoRefreshActive() === false, '16j: auto-refresh inactive off the dashboard');
    sandbox.dsbStartAutoRefresh();
    ok(intervalTimers.length === 0, '16j: no timer started off the dashboard');
    sandbox._activeView = 'dashboard';
    sandbox.document.hidden = true;
    ok(sandbox.dsbAutoRefreshActive() === false, '16j: auto-refresh inactive when the page is hidden');
    sandbox.document.hidden = false;
    ok(sandbox.dsbAutoRefreshActive() === true, '16j: auto-refresh active on the visible dashboard');
  }

  // 16k. timer tick stops itself when the dashboard is left
  {
    resetLiveFakes();
    await loadSnapshot();
    sandbox.dsbStartAutoRefresh();
    ok(intervalTimers.length === 1, '16k: timer running on the dashboard');
    sandbox._activeView = 'journal';
    await intervalTimers[0].fn();                         // tick fires after leaving
    ok(intervalTimers.length === 0, '16k: the tick tears itself down once off-dashboard (self-healing)');
    sandbox._activeView = 'dashboard';
  }

  // ── summary ─────────────────────────────────────────────────────────────────
  console.log('\nResult: ' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
  console.log('ALL TESTS PASSED');
})().catch((e) => { console.error(e); process.exit(1); });
