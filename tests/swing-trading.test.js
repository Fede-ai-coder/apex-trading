'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Swing Trading screen — unit + structural tests
//
// Extracts the REAL Swing functions from index.html (no copies) and runs them in
// a vm sandbox to prove the task's hard requirements:
//   1.  `Swing Trading` nav item appears (top nav tab + sidebar entry).
//   2.  Opening the Swing screen does not break Dashboard/MCX/Portfolio/Journal/
//       existing scanners (showView still registers every prior view; view
//       containers untouched; swing is purely additive in showView).
//   3.  The screen can render Squeeze, RS vs SPY and Directional sections (tab
//       buttons present; _swingTabCandidates reads each existing store).
//   4.  Weekly / Daily / 4H context labels render for scanner candidates.
//   5.  Missing weekly data does not crash the screen (safe degrade).
//   6.  Existing scanner stores are read-only (no mutation of results / scanData
//       / rsScannerData in the Swing block).
//   7.  No duplicate timers / websocket subscriptions / refresh loops introduced
//       (no setInterval / new WebSocket in the Swing block; single-flight guards).
//   8.  Swing Score is informational only and does not filter out candidates.
//
// Run: node tests/swing-trading.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Function extractor (same brace-matching logic used by all test files) ─────
function extractFn(src, name) {
  const sig   = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}
function extractAsyncFn(src, name) {
  const sig   = 'async function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('async function not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}

// Source-level slice of the entire Swing block (for static, read-only assertions)
function swingBlock(src) {
  const a = src.indexOf('// SWING TRADING SCREEN  (additive, isolated)');
  const b = src.indexOf('// END SWING TRADING SCREEN');
  if (a < 0 || b < 0) throw new Error('Swing block markers not found');
  return src.slice(a, b);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

// ── Sandbox ───────────────────────────────────────────────────────────────────
const sandbox = {
  console, Math, JSON, Number, isFinite, parseFloat, parseInt, Array, Object, Promise, Date, String,
  localStorage: (function () { let s = {}; return { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; }, _reset: () => { s = {}; } }; })(),
  SWING_MIN_WEEKLY_BARS: null, SWING_MIN_DAILY_BARS: null, SWING_MIN_4H_BARS: null,
  SWING_VIX_MAX_SUITABLE: null, SWING_MAX_CANDIDATES: null, SWING_MAX_CONCURRENT: null,
  SWING_EXT_SMA20_PCT: null, SWING_EXT_SMA30_PCT: null,
  smA: null, rma: null, calcRSIWilder: null, calcBB: null, calcKC: null, calcSqueeze: null,
  S: { squeezeFireScanner: { results: [], chartCacheCandles: {} }, rsScannerData: [], scanData: [] },
};

// Pull the shared constants out of the file so the sandbox mirrors index.html.
const CONST_RE = /var (SWING_[A-Z0-9_]+)\s*=\s*([0-9]+)/g;
let m;
while ((m = CONST_RE.exec(HTML)) !== null) { sandbox[m[1]] = Number(m[2]); }

const FNS = [
  'smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze',
  'ffSwingTrading',
  '_swingWeekBucket', '_swingDeriveWeeklyCandles', '_swingTrendContextFromCandles',
  '_swing4hTiming', '_swingSqueezeStatus', '_swingDistancePct', '_swingAlignment',
  '_swingRsContext', '_swingVixSuitability', '_swingScore', '_swingBuildCandidate',
  '_swingFilterCandidates', '_swingTabCandidates',
];

vm.createContext(sandbox);
vm.runInContext(FNS.map(n => extractFn(HTML, n)).join('\n'), sandbox);

// Synthetic candle helpers ----------------------------------------------------
const DAY = 86400000;
function dailySeries(n, startPrice, step) {
  const base = Date.UTC(2024, 0, 1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const close = startPrice + i * step;
    out.push({ time: base + i * DAY, open: close - step / 2, high: close + 1, low: close - 1, close: close, volume: 1000 });
  }
  return out;
}

console.log('Swing Trading — tests\n');

// ── 1. Nav item appears ───────────────────────────────────────────────────────
console.log('1) nav item');
ok(/id="ntab-swing"[^>]*onclick="showView\('swing'\)"/.test(HTML), 'top nav tab ntab-swing -> showView(swing)');
ok(/onclick="showView\('swing'\)"[\s\S]*?Swing Trading/.test(HTML), 'sidebar Swing Trading entry');
ok(/id="view-swing"/.test(HTML), 'view-swing container exists');

// ── 2. Does not break other views ──────────────────────────────────────────────
console.log('2) other views intact');
['view-dashboard', 'view-portfolio', 'view-journal', 'view-mcx'].forEach(id => {
  ok(new RegExp('id="' + id + '"').test(HTML), id + ' container still present');
});
const showView = extractFn(HTML, 'showView');
['dashboard', 'portfolio', 'journal', 'mcx', 'swing'].forEach(v => {
  ok(showView.indexOf("'" + v + "'") >= 0, "showView still registers '" + v + "'");
});
ok(/if \(name === 'swing'\) \{ if \(typeof _swingInit/.test(showView), 'showView inits swing additively');
ok(/_swingTeardown/.test(showView), 'showView tears down swing on leave');

// ── 3. Squeeze / RS / Directional sections render ───────────────────────────────
console.log('3) three scanner sections');
ok(/id="swing-tab-squeeze"/.test(HTML) && /id="swing-tab-rs"/.test(HTML) && /id="swing-tab-directional"/.test(HTML), 'all three tab buttons present');
sandbox.S.squeezeFireScanner.results = [{ symbol: 'AAPL', direction: 'BULLISH' }, { symbol: 'AAPL', direction: 'BULLISH' }];
sandbox.S.rsScannerData = [{ ticker: 'NVDA', rs: 12.5 }, { ticker: 'INTC', rs: -4 }];
sandbox.S.scanData = [{ ticker: 'MSFT', signal: 'STRONG BUY' }, { ticker: 'XOM', signal: 'SHORT' }, { ticker: 'KO', signal: 'NEUTRAL' }];
const sq = vm.runInContext('_swingTabCandidates("squeeze")', sandbox);
eq(sq.length, 1, 'squeeze candidates de-duped to 1');
eq(sq[0].direction, 'LONG', 'BULLISH -> LONG');
const rsCands = vm.runInContext('_swingTabCandidates("rs")', sandbox);
eq(rsCands.length, 2, 'RS candidates from rsScannerData');
eq(rsCands.find(c => c.symbol === 'INTC').direction, 'SHORT', 'negative RS -> SHORT');
const dir = vm.runInContext('_swingTabCandidates("directional")', sandbox);
eq(dir.length, 2, 'directional excludes NEUTRAL signal');
eq(dir.find(c => c.symbol === 'MSFT').direction, 'LONG', 'STRONG BUY -> LONG');
eq(dir.find(c => c.symbol === 'XOM').direction, 'SHORT', 'SHORT -> SHORT');

// ── 4. Weekly / Daily / 4H labels render ────────────────────────────────────────
console.log('4) W/D/4H context labels');
const daily = dailySeries(200, 100, 0.5);   // steady uptrend
const fourH = dailySeries(120, 100, 0.3);
const cand = vm.runInContext('_swingBuildCandidate(arg)', Object.assign(sandbox, { arg: { symbol: 'AAPL', source: 'Squeeze', direction: 'LONG', dailyCandles: daily, fourHCandles: fourH, rsContext: { bias: 'STRONG', label: 'RS STRONG (+12.5)' } } }));
ok(/^Weekly: /.test(cand.weeklyLabel), 'weeklyLabel present: ' + cand.weeklyLabel);
ok(/^Daily: /.test(cand.dailyLabel), 'dailyLabel present: ' + cand.dailyLabel);
ok(/^4H: /.test(cand.fourHLabel), 'fourHLabel present: ' + cand.fourHLabel);
eq(cand.weeklyTrend, 'UP', 'weekly trend UP on uptrend');
eq(cand.dailyTrend, 'UP', 'daily trend UP on uptrend');
ok(cand.alignment === 'ALIGNED', 'weekly/daily ALIGNED on uptrend');
ok(cand.swingScore && cand.swingScore.max === 6, 'score has 6 components');

// derive weekly: 200 consecutive calendar days ≈ 29 weeks
const weekly = vm.runInContext('_swingDeriveWeeklyCandles(arg.dailyCandles)', sandbox);
ok(weekly.length >= 26 && weekly.length <= 32, 'weekly derivation buckets ~29 weeks (got ' + weekly.length + ')');
ok(weekly[weekly.length - 1].close === daily[daily.length - 1].close, 'weekly close = last daily close');

// ── 5. Missing weekly data does not crash ───────────────────────────────────────
console.log('5) safe degrade');
let threw = false, c2;
try {
  c2 = vm.runInContext('_swingBuildCandidate(arg2)', Object.assign(sandbox, { arg2: { symbol: 'ZZZ', source: 'Squeeze', direction: 'LONG', dailyCandles: [], fourHCandles: null, rsContext: null } }));
} catch (e) { threw = true; }
ok(!threw, 'build candidate with empty daily / null 4H does not throw');
eq(c2.weeklyLabel, 'Weekly: unavailable', 'weekly unavailable label');
eq(c2.fourHLabel, '4H: unavailable', '4H unavailable label');
ok(c2.notes.indexOf('Weekly: unavailable') >= 0, 'note flags missing weekly');
eq(vm.runInContext('_swingDeriveWeeklyCandles(null)', sandbox).length, 0, 'derive weekly from null -> []');
eq(vm.runInContext('_swingDeriveWeeklyCandles([{bogus:1}])', sandbox).length, 0, 'derive weekly from malformed -> []');

// ── 6. Existing scanner stores are read-only ────────────────────────────────────
console.log('6) read-only / no scanner-rule changes');
const block = swingBlock(HTML);
ok(!/S\.squeezeFireScanner\.results\s*=/.test(block), 'never assigns S.squeezeFireScanner.results');
ok(!/S\.rsScannerData\s*=/.test(block), 'never assigns S.rsScannerData');
ok(!/S\.scanData\s*=/.test(block), 'never assigns S.scanData');
ok(!/_sfsAnalyzeSymbolTimeframe\s*=/.test(block), 'does not reassign SFS analysis fn');
// existing scanner analysis function still present + unchanged signature
ok(/function _sfsAnalyzeSymbolTimeframe\(symbol, tf, candles\)/.test(HTML), 'SFS analysis fn intact');

// ── 7. No new timers / websockets / refresh loops ───────────────────────────────
console.log('7) no duplicate timers / sockets');
const blockCode = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); // strip comments
ok(!/setInterval\s*\(/.test(blockCode), 'no setInterval in Swing block');
ok(!/new WebSocket/.test(blockCode), 'no new WebSocket in Swing block');
ok(/_swingCandleInflight/.test(block), 'single-flight guard for candle reads present');
ok(/if \(S\.swing\.running\) return;/.test(block), 'single-flight guard for tab runs present');
ok(/owns no timers/.test(block), 'teardown documents it owns no timers');

// ── 8. Swing Score is informational only (never filters) ────────────────────────
console.log('8) score informational only');
const lowScore = vm.runInContext('_swingBuildCandidate(arg3)', Object.assign(sandbox, { arg3: { symbol: 'LOW', source: 'RS', direction: 'SHORT', dailyCandles: daily, fourHCandles: fourH, rsContext: null } }));
ok(lowScore.swingScore.score <= 2, 'a contrarian SHORT on an uptrend scores low (got ' + lowScore.swingScore.score + ')');
const kept = vm.runInContext('_swingFilterCandidates([cand, lowScore])', Object.assign(sandbox, { cand, lowScore }));
eq(kept.length, 2, 'filter keeps both high- and low-score candidates');
ok(cand.swingScore.informational === true, 'score flagged informational');
// VIX suitability warning helper
ok(vm.runInContext('_swingVixSuitability(35).warn', sandbox) === true, 'high VIX -> warn');
ok(vm.runInContext('_swingVixSuitability(15).warn', sandbox) === false, 'low VIX -> no warn');
ok(vm.runInContext('_swingVixSuitability(null).suitable', sandbox) === null, 'unknown VIX -> suitable null');

// ── L) Sticky chart dock layout (scoped to Swing Trading) ───────────────────
console.log('L) sticky chart dock layout');
// 1. dedicated chart dock container
ok(/id="swing-chart-dock"/.test(HTML), 'dedicated chart dock container exists');
ok(/class="swing-chart-dock"/.test(HTML), 'dock carries the swing-chart-dock class');
// 2. dock uses sticky/fixed bottom positioning
ok(/#view-swing \.swing-chart-dock\s*\{[^}]*position:sticky;\s*bottom:0/.test(HTML), 'dock uses position:sticky; bottom:0');
ok(/#view-swing \.swing-chart-dock\s*\{[^}]*border-top:[^;]+;[^}]*box-shadow:0 -8px/.test(HTML), 'dock has border-top + top shadow for separation');
// 3. candidate list inside a scrollable area
ok(/#view-swing \.swing-scroll-area\s*\{[^}]*overflow-y:auto/.test(HTML), 'candidate area is an independent scrollable region');
ok(/#view-swing\.swing-view\s*\{[^}]*flex-direction:column/.test(HTML), 'view is a vertical flex layout (scroll area + dock)');
ok(/swing:'flex'/.test(showView), "showView renders the Swing view with display:flex (column layout)");
// 4. bottom padding so the dock never hides the final rows
ok(/#view-swing \.swing-scroll-area\s*\{[^}]*padding:24px 40px 20px/.test(HTML), 'scroll area has bottom padding so final rows clear the dock');
// structural: table lives in the scroll area (above), charts live in the dock
const _scrollIdx = HTML.indexOf('class="swing-scroll-area"');
const _dockIdx   = HTML.indexOf('id="swing-chart-dock"');
const _tblIdx    = HTML.indexOf('id="swing-tbl"');
const _c1wIdx    = HTML.indexOf('id="swing-chart-1w"');
ok(_scrollIdx >= 0 && _tblIdx > _scrollIdx && _tblIdx < _dockIdx, 'candidate table is inside the scroll area, above the dock');
ok(_c1wIdx > _dockIdx, '1W/1D/4H charts live inside the sticky dock');
// readable height + responsive shrink
ok(/#view-swing \.swing-chart-canvas\s*\{height:230px/.test(HTML), 'dock charts have a readable default height');
ok(/@media \(max-height:[0-9]+px\)\{#view-swing \.swing-chart-canvas\s*\{height:/.test(HTML), 'chart height reduces on shorter screens');
// 9. sticky behaviour scoped ONLY to Swing Trading (no global rule)
const _dockAll    = (HTML.match(/\.swing-chart-dock\s*\{/g) || []).length;
const _dockScoped = (HTML.match(/#view-swing \.swing-chart-dock\s*\{/g) || []).length;
ok(_dockAll === _dockScoped && _dockScoped >= 1, 'sticky dock CSS is scoped to #view-swing only (not global)');
// 10. existing full-view base rule unchanged (other screens keep their own scroll)
ok(/\.full-view\{flex:1;min-height:0;overflow-y:auto/.test(HTML), '.full-view base rule unchanged — other screens unaffected');
// 5. existing chart rendering functions + elements unchanged
ok(/function _swingDrawOneChart/.test(HTML) && /async function _swingRenderCharts/.test(HTML), 'chart rendering functions unchanged');
['swing-chart-1w', 'swing-chart-1d', 'swing-chart-4h'].forEach(id => ok(new RegExp('id="' + id + '"').test(HTML), id + ' chart element retained'));

// ── 9–18. Scanner status panel ──────────────────────────────────────────────
// Load the status helpers + a minimal DOM stub so render output can be asserted.
console.log('9) scanner status panel');
const els = {};
function fakeEl() { return { innerHTML: '', textContent: '', style: {}, _attrs: {},
  setAttribute(k, v) { this._attrs[k] = v; }, removeAttribute(k) { delete this._attrs[k]; },
  getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; } }; }
['swing-scan-status', 'swing-run-btn', 'swing-nav-dot', 'swing-status'].forEach(id => { els[id] = fakeEl(); });
sandbox.document = { getElementById: id => els[id] || null };
sandbox.S.swing = { running: false, activeTab: 'squeeze', candidates: [], status: {
  phase: 'idle', scanner: null, currentSymbol: null, processed: 0, total: 0, candidates: 0,
  startedAt: null, completedAt: null, lastUpdate: null, error: null,
  byTab: { squeeze: null, rs: null, directional: null } } };
const STATUS_FNS = ['_swingScannerLabel', '_swingFmtElapsed', '_swingStatusHeadline', '_swingSetStatus', '_swingRenderStatus', '_swingSetStatusState'];
vm.runInContext(STATUS_FNS.map(n => extractFn(HTML, n)).join('\n'), sandbox);
vm.runInContext(extractAsyncFn(HTML, '_swingRunActiveTab'), sandbox);

// 9.1 panel exists in markup
ok(/id="swing-scan-status"/.test(HTML), 'status panel container present in markup');
ok(/SCANNER STATUS/.test(HTML), 'status panel titled');
ok(/id="swing-nav-dot"/.test(HTML), 'nav running dot present');

// 10. Idle before any run
vm.runInContext('_swingRenderStatus()', sandbox);
ok(/Swing Scanner: Idle/.test(els['swing-scan-status'].innerHTML), 'panel shows Idle before run');
eq(vm.runInContext("_swingStatusHeadline({phase:'idle'})", sandbox), 'Idle', 'idle headline');

// 11. Running headline per scanner
eq(vm.runInContext("_swingStatusHeadline({phase:'running',scanner:'Squeeze'})", sandbox), 'Running Squeeze Scanner', 'running squeeze headline');
eq(vm.runInContext("_swingStatusHeadline({phase:'running',scanner:'RS vs SPY'})", sandbox), 'Running RS vs SPY Scanner', 'running RS headline');
eq(vm.runInContext("_swingStatusHeadline({phase:'building'})", sandbox), 'Building swing context', 'building headline');
eq(vm.runInContext('_swingScannerLabel("directional")', sandbox), 'Directional', 'scanner label mapping');

// 12–14. Running panel shows processed/total, current symbol, candidates, elapsed, last update
Object.assign(sandbox.S.swing.status, { phase: 'building', scanner: 'Squeeze', currentSymbol: 'AMD',
  processed: 37, total: 150, candidates: 8, startedAt: Date.now() - 42000, lastUpdate: Date.now() });
vm.runInContext('_swingRenderStatus()', sandbox);
const runHtml = els['swing-scan-status'].innerHTML;
ok(/Progress:<\/span> <span[^>]*>37 \/ 150 symbols/.test(runHtml), 'shows processed / total symbols');
ok(/Processing:<\/span> <span[^>]*>AMD/.test(runHtml), 'shows current symbol');
ok(/Candidates:<\/span> <span[^>]*>8/.test(runHtml), 'shows candidate count');
ok(/Elapsed:<\/span> <span[^>]*>00:42/.test(runHtml), 'shows elapsed mm:ss');
ok(/Last update:/.test(runHtml), 'shows last update');
ok(els['swing-nav-dot'].style.display === 'inline-block', 'nav dot visible while running');
ok(els['swing-run-btn']._attrs.disabled === 'disabled', 'run button disabled while running');
ok(/Running…/.test(els['swing-run-btn'].innerHTML), 'run button shows Running…');

// 15. Completed shows per-scanner + total counts
Object.assign(sandbox.S.swing.status, { phase: 'completed', completedAt: Date.now(),
  byTab: { squeeze: 12, rs: 9, directional: 7 } });
vm.runInContext('_swingRenderStatus()', sandbox);
const doneHtml = els['swing-scan-status'].innerHTML;
ok(/Swing Scanner: Completed/.test(doneHtml), 'shows Completed');
ok(/Squeeze:<\/span> <span[^>]*>12 candidates/.test(doneHtml), 'completed shows squeeze count');
ok(/RS vs SPY:<\/span> <span[^>]*>9 candidates/.test(doneHtml), 'completed shows RS count');
ok(/Directional:<\/span> <span[^>]*>7 candidates/.test(doneHtml), 'completed shows directional count');
ok(/Total:<\/span> <span[^>]*>28 candidates/.test(doneHtml), 'completed shows total 28');
ok(els['swing-nav-dot'].style.display === 'none', 'nav dot hidden when not running');
ok(els['swing-run-btn']._attrs.disabled === undefined, 'run button re-enabled when idle/complete');

// 16. _swingSetStatusState mutates + re-renders (UI is source of truth)
sandbox.S.swing.status.phase = 'idle';
vm.runInContext("_swingSetStatusState({phase:'failed', error:'boom'})", sandbox);
eq(sandbox.S.swing.status.phase, 'failed', 'setStatusState mutates phase');
ok(sandbox.S.swing.status.lastUpdate != null, 'setStatusState stamps lastUpdate');
ok(/Failed \/ partial results/.test(els['swing-scan-status'].innerHTML), 'failed panel rendered');

// ── 19–28. Chart data path: backend-first candles + states ──────────────────
// Separate context so the chart wiring is exercised in isolation with a fully
// controllable backend reader. Loads the REAL chart functions from index.html.
console.log('19) chart data path (backend candles)');
const cEls = {};
['swing-chart-1w', 'swing-chart-1d', 'swing-chart-4h', 'swing-chart-sym', 'swing-1w-note',
 'swing-chart-pos', 'swing-chart-prev', 'swing-chart-next',
 'swing-tbl-body', 'swing-tab-squeeze', 'swing-tab-rs', 'swing-tab-directional', 'swing-tab-label',
 'swing-row-AAPL', 'swing-row-MSFT', 'swing-row-GOOG', 'swing-row-OTHER', 'swing-row-AAA', 'swing-row-BBB'].forEach(id => { cEls[id] = fakeEl(); });
const chartLogs = [];
let backendCalls = [];
let keydownListeners = 0;
let backendImpl = async () => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null });
const chartSandbox = {
  Math, JSON, Number, isFinite, parseFloat, parseInt, Array, Object, Promise, Date, String, setTimeout,
  console: { log: (s) => chartLogs.push(String(s)), warn: () => {}, error: () => {} },
  document: { getElementById: id => cEls[id] || null, addEventListener: (ev) => { if (ev === 'keydown') keydownListeners++; } },
  S: { swing: { chartSymbol: null, selectedSymbol: null, selectedIndex: null, chartRequestId: 0, active: false, activeTab: 'squeeze', candidates: [] },
       squeezeFireScanner: { chartCacheCandles: {} }, scanData: [] },
  _sfsFetchBackendCandles: async function (sym, tf) { backendCalls.push(sym + '|' + tf); return backendImpl(sym, tf); },
  computeCandleIndicators: function () { return { lastSma8: 1, lastRsi: 50 }; },
  // records wrapId + candle count so we can prove WHICH series was drawn last
  _drawCandleChart: function (wrapId, candles) { if (cEls[wrapId]) cEls[wrapId].innerHTML = 'READY:' + wrapId + ':' + (candles ? candles.length : 0); },
};
const CHART_FNS = ['_swingWeekBucket', '_swingDeriveWeeklyCandles', '_swingLogChartCandles', '_swingGetCandles',
  '_swingFetchContextCandles', '_swingSetChartState', '_swingDrawOneChart', '_swingIsHardFailure', '_swingChartFailMsg',
  '_swingSetChartHeader', '_swingHighlightSelectedRow', '_swingSetBtnDisabled', '_swingUpdateChartNav', '_swingRenderSelectedRow',
  '_swingScrollRowIntoView', '_swingClearCharts', '_swingIsLatestChartRequest', '_swingSelectCandidate',
  '_swingSelectNextCandidate', '_swingSelectPrevCandidate', '_swingKeydownHandler', '_swingAttachKeyListener',
  '_swingFilterCandidates', '_swingTrendCellColor', '_swingFmtPct', '_swingRenderTable', '_swingSetTab'];
vm.createContext(chartSandbox);
vm.runInContext('var _swingCandleInflight = {}; var _swingKeyListenerAttached = false;', chartSandbox); // top-level vars in index.html
vm.runInContext(CHART_FNS.map(n => extractFn(HTML, n)).join('\n'), chartSandbox);
vm.runInContext(extractAsyncFn(HTML, '_swingOpenCharts'), chartSandbox);
vm.runInContext(extractAsyncFn(HTML, '_swingRenderCharts'), chartSandbox);
const runC = code => vm.runInContext(code, chartSandbox);
const tick = () => new Promise(r => setImmediate(r));
function clearChartEls() { Object.keys(cEls).forEach(id => { cEls[id].innerHTML = ''; }); }
function mkCand(sym) { return { symbol: sym, source: 'Squeeze', direction: 'LONG', weeklyTrend: 'UP', dailyTrend: 'UP',
  fourHTiming: 'BULLISH', rs: 'RS STRONG', squeezeStatus: 'FIRED', distSma20: 1, distSma30: 2, swingScore: { score: 5, max: 6 }, notes: [] }; }

// 17. Duplicate run prevented while already running (single-flight guard)
sandbox.S.swing.running = true;
sandbox.S.swing.status.phase = 'completed';   // sentinel
sandbox.S.swing.status.startedAt = 111;
(async () => {
  await vm.runInContext('_swingRunActiveTab(false)', sandbox);
  ok(sandbox.S.swing.status.phase === 'completed' && sandbox.S.swing.status.startedAt === 111,
    'second run is a no-op while running (no status reset, no duplicate launch)');
  ok(sandbox.S.swing.running === true, 'guard leaves running flag untouched');

  // 18. status code introduces no timers / sockets (re-check on the status helpers)
  const statusSrc = STATUS_FNS.map(n => extractFn(HTML, n)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(!/setInterval\s*\(|setTimeout\s*\(|new WebSocket/.test(statusSrc), 'status code adds no timers/sockets');

  // 19. Selecting a candidate triggers backend candle loading for that symbol
  backendImpl = async () => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null });
  backendCalls = []; chartLogs.length = 0; clearChartEls();
  chartSandbox.S.swing.chartSymbol = null;
  await runC('_swingOpenCharts("AAPL")');
  ok(backendCalls.indexOf('AAPL|1D') >= 0 && backendCalls.indexOf('AAPL|4H') >= 0, 'selecting a candidate loads backend candles for 1D + 4H');

  // 20–21. 1D and 4H use backend candles (Ready + BACKEND provenance)
  ok(/READY:swing-chart-1d/.test(cEls['swing-chart-1d'].innerHTML), '1D chart rendered from backend candles');
  ok(/READY:swing-chart-4h/.test(cEls['swing-chart-4h'].innerHTML), '4H chart rendered from backend candles');
  ok(chartLogs.some(l => /symbol=AAPL tf=1D source=BACKEND count=\d+/.test(l)), '1D candle provenance logged as BACKEND');
  ok(chartLogs.some(l => /symbol=AAPL tf=4H source=BACKEND count=\d+/.test(l)), '4H candle provenance logged as BACKEND');

  // 22. 1W derived from backend 1D
  ok(/READY:swing-chart-1w/.test(cEls['swing-chart-1w'].innerHTML), '1W chart rendered');
  ok(chartLogs.some(l => /symbol=AAPL tf=1W source=DERIVED_FROM_BACKEND_1D count=\d+/.test(l)), '1W provenance DERIVED_FROM_BACKEND_1D');
  ok(/derived from backend 1D candles/.test(cEls['swing-1w-note'].textContent), '1W panel labelled derived-from-backend-1D');

  // 23. Empty candle arrays do not render as valid charts
  backendImpl = async () => ({ ok: true, candles: [], reason: null });
  backendCalls = []; clearChartEls(); chartSandbox.S.swing.chartSymbol = null;
  await runC('_swingOpenCharts("EMPT")');
  ok(!/READY/.test(cEls['swing-chart-1d'].innerHTML), 'empty backend 1D does NOT render a valid chart');
  ok(/no backend candles available/.test(cEls['swing-chart-1d'].innerHTML), '1D shows a no-data message on empty');
  ok(/cannot derive weekly/.test(cEls['swing-chart-1w'].innerHTML), '1W shows no-data when no backend 1D');
  const grEmpty = await runC('_swingGetCandles("EMPT","1D")');
  ok(grEmpty.ok === false && grEmpty.source === 'NONE', 'empty backend → ok:false / source NONE (no stale empty as valid)');

  // 24. Loading state shown while backend pending
  backendImpl = () => new Promise(r => setTimeout(() => r({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null }), 5));
  clearChartEls(); chartSandbox.S.swing.chartSymbol = null;
  const pend = runC('_swingOpenCharts("LOAD")'); // not awaited — Loading is set synchronously
  ok(/Loading backend candles/.test(cEls['swing-chart-1d'].innerHTML), '1D shows Loading while backend pending');
  ok(/Loading backend candles/.test(cEls['swing-chart-4h'].innerHTML), '4H shows Loading while backend pending');
  ok(/Loading backend candles/.test(cEls['swing-chart-1w'].innerHTML), '1W shows Loading while backend pending');
  await pend;
  ok(/READY:swing-chart-1d/.test(cEls['swing-chart-1d'].innerHTML), '1D renders Ready once backend data arrives');

  // 25. Visible error/no-data message when backend fetch fails
  backendImpl = async () => { throw new Error('net down'); };
  clearChartEls(); chartSandbox.S.swing.chartSymbol = null;
  await runC('_swingOpenCharts("ERR")');
  ok(/backend candle fetch failed/.test(cEls['swing-chart-1d'].innerHTML), '1D shows an error message on backend failure');
  ok(/fetch_error/.test(cEls['swing-chart-1d'].innerHTML), 'error message includes the failure reason');
  ok(!/READY/.test(cEls['swing-chart-1d'].innerHTML), 'failed panel is not left blank / not rendered as valid');

  // 26. No duplicate candle requests for the same symbol (single-flight)
  backendImpl = async () => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null });
  backendCalls = [];
  const [a, b] = await Promise.all([runC('_swingGetCandles("DUP","1D")'), runC('_swingGetCandles("DUP","1D")')]);
  ok(backendCalls.filter(x => x === 'DUP|1D').length === 1, 'concurrent same-symbol reads dedupe to ONE backend request');
  ok(a.candles === b.candles, 'both callers receive the shared single-flight result');

  // 27. Chart path reuses the existing backend reader (not a new pipeline)
  ok(/_sfsFetchBackendCandles/.test(block), 'chart candles reuse the existing backend reader (_sfsFetchBackendCandles)');
  // 28. Chart code adds no timers / websockets / refresh loops
  const chartSrc = CHART_FNS.concat(['_swingOpenCharts', '_swingRenderCharts']).map(n => {
    try { return extractFn(HTML, n); } catch (e) { return extractAsyncFn(HTML, n); }
  }).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(!/setInterval\s*\(|new WebSocket/.test(chartSrc), 'chart code adds no timers/websockets');

  // ── 29–40. Auto-open charts on row selection ──────────────────────────────
  console.log('29) auto-open charts on row selection');
  backendImpl = async () => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null });

  // 29. Rows are wired to the chart-loading function (row click + button)
  chartSandbox.S.swing.candidates = [mkCand('AAPL'), mkCand('MSFT')];
  chartSandbox.S.swing.selectedSymbol = null;
  runC('_swingRenderTable()');
  const tbl = cEls['swing-tbl-body'].innerHTML;
  ok(/<tr id="swing-row-AAPL" class="swing-row"[^>]*onclick="_swingOpenCharts\('AAPL'\)"/.test(tbl), 'row click wired to _swingOpenCharts');
  ok(/event\.stopPropagation\(\);_swingOpenCharts\('AAPL'\)/.test(tbl), 'Chart button uses the same _swingOpenCharts path (stops row bubbling)');

  // 30. Selecting a row sets S.swing.selectedSymbol
  chartSandbox.S.swing.selectedSymbol = null; backendCalls = []; clearChartEls();
  await runC('_swingOpenCharts("AAPL")');
  eq(chartSandbox.S.swing.selectedSymbol, 'AAPL', 'selecting a row sets selectedSymbol');
  eq(cEls['swing-chart-sym'].textContent, 'Charts: AAPL', 'chart header shows selected symbol');

  // 31. Selected row receives an active/selected class (live highlight + baked render)
  runC('_swingHighlightSelectedRow("MSFT")');
  ok(/swing-selected/.test(cEls['swing-row-MSFT'].className), 'highlight adds swing-selected to the selected row');
  eq(cEls['swing-row-AAPL'].className, 'swing-row', 'non-selected row has no selected class');
  chartSandbox.S.swing.selectedSymbol = 'AAPL'; runC('_swingRenderTable()');
  ok(/<tr id="swing-row-AAPL" class="swing-row swing-selected"/.test(cEls['swing-tbl-body'].innerHTML), 'render bakes swing-selected for the selected row');

  // 33. Selecting a different row updates symbol + header
  chartSandbox.S.swing.selectedSymbol = null; clearChartEls();
  await runC('_swingOpenCharts("AAPL")');
  await runC('_swingOpenCharts("MSFT")');
  eq(chartSandbox.S.swing.selectedSymbol, 'MSFT', 'selecting a different row updates selectedSymbol');
  eq(cEls['swing-chart-sym'].textContent, 'Charts: MSFT', 'header updates to the newly selected symbol');

  // 34. Duplicate clicks on the same symbol do not refetch
  backendCalls = [];
  await runC('_swingOpenCharts("MSFT")'); // already selected
  eq(backendCalls.length, 0, 're-selecting the same row triggers no backend requests');

  // 35. Late async response from a previous symbol cannot overwrite the latest
  backendImpl = (sym, tf) => new Promise(r => setTimeout(
    () => r({ ok: true, candles: dailySeries(sym === 'AAA' ? 60 : 200, 100, 0.5), reason: null }),
    sym === 'AAA' ? 30 : 5)); // AAA (60 bars) resolves slowly; BBB (200 bars) fast
  chartSandbox.S.swing.selectedSymbol = null; clearChartEls();
  const pAAA = runC('_swingOpenCharts("AAA")');
  const pBBB = runC('_swingOpenCharts("BBB")');
  await Promise.all([pAAA, pBBB]);
  await new Promise(r => setTimeout(r, 50)); // let AAA's late callback fully settle
  eq(chartSandbox.S.swing.selectedSymbol, 'BBB', 'latest selection wins after a race');
  eq(cEls['swing-chart-sym'].textContent, 'Charts: BBB', 'header reflects the latest symbol only');
  ok(/READY:swing-chart-1d:200/.test(cEls['swing-chart-1d'].innerHTML), 'rendered chart is the LATEST (BBB, 200 bars) — stale AAA(60) did not overwrite');

  // 36. Empty state before any selection
  backendImpl = async () => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null });
  runC('_swingClearCharts()');
  eq(cEls['swing-chart-sym'].textContent, 'Select a symbol row to load charts', 'header shows empty state when nothing selected');
  ok(/Select a symbol row to load charts/.test(cEls['swing-chart-1d'].innerHTML), 'panel shows empty state before selection');
  eq(chartSandbox.S.swing.selectedSymbol, null, 'clearCharts clears selectedSymbol');

  // 37. Tab switch: preserve selection if present, else clear
  chartSandbox.S.swing.candidates = [mkCand('AAPL'), mkCand('MSFT')];
  chartSandbox.S.swing.selectedSymbol = 'AAPL';
  runC('_swingSetTab("rs")');
  eq(chartSandbox.S.swing.selectedSymbol, 'AAPL', 'tab switch preserves selected symbol when still present');
  eq(cEls['swing-chart-sym'].textContent, 'Charts: AAPL', 'header preserved across tab switch');
  chartSandbox.S.swing.candidates = [mkCand('OTHER')]; // AAPL no longer present
  runC('_swingSetTab("directional")');
  eq(chartSandbox.S.swing.selectedSymbol, null, 'tab switch clears selection when symbol absent');
  eq(cEls['swing-chart-sym'].textContent, 'Select a symbol row to load charts', 'header reverts to empty state when selection cleared');

  // 38. Provenance logs still present on a fresh selection
  chartLogs.length = 0; chartSandbox.S.swing.selectedSymbol = null; clearChartEls();
  await runC('_swingOpenCharts("AAPL")');
  ok(chartLogs.some(l => /tf=1D source=BACKEND/.test(l)), 'provenance log 1D source=BACKEND retained');
  ok(chartLogs.some(l => /tf=4H source=BACKEND/.test(l)), 'provenance log 4H source=BACKEND retained');
  ok(chartLogs.some(l => /tf=1W source=DERIVED_FROM_BACKEND_1D/.test(l)), 'provenance log 1W source=DERIVED_FROM_BACKEND_1D retained');

  // ── 41–55. Arrow / keyboard navigation ────────────────────────────────────
  console.log('41) arrow / keyboard navigation');
  backendImpl = async () => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null });
  chartSandbox.S.swing.candidates = [mkCand('AAPL'), mkCand('MSFT'), mkCand('GOOG')];
  chartSandbox.S.swing.selectedSymbol = null; chartSandbox.S.swing.selectedIndex = null;

  // 41. Counter updates on selection
  await runC('_swingSelectCandidate("MSFT", {})');
  eq(chartSandbox.S.swing.selectedIndex, 1, 'selecting MSFT sets selectedIndex=1');
  eq(cEls['swing-chart-pos'].textContent, 'Candidate 2 / 3', 'counter shows position');

  // 42. Boundary disable (clamping, no wrap-around)
  await runC('_swingSelectCandidate(0, {})');
  eq(cEls['swing-chart-prev']._attrs.disabled, 'disabled', 'Prev disabled at first candidate');
  ok(cEls['swing-chart-next']._attrs.disabled === undefined, 'Next enabled when not at last');
  await runC('_swingSelectCandidate(2, {})');
  eq(cEls['swing-chart-next']._attrs.disabled, 'disabled', 'Next disabled at last candidate');
  ok(cEls['swing-chart-prev']._attrs.disabled === undefined, 'Prev enabled when not at first');

  // 43. Next / Prev advance and retreat
  await runC('_swingSelectCandidate(0, {})');
  runC('_swingSelectNextCandidate()'); await tick();
  eq(chartSandbox.S.swing.selectedSymbol, 'MSFT', 'Next advances to MSFT');
  runC('_swingSelectPrevCandidate()'); await tick();
  eq(chartSandbox.S.swing.selectedSymbol, 'AAPL', 'Prev retreats to AAPL');

  // 44. ArrowDown / ArrowRight => next ; ArrowUp / ArrowLeft => prev (screen active)
  chartSandbox.S.swing.active = true;
  await runC('_swingSelectCandidate(0, {})');
  runC('_swingKeydownHandler({ key:"ArrowDown", target:{tagName:"BODY"}, preventDefault(){} })'); await tick();
  eq(chartSandbox.S.swing.selectedSymbol, 'MSFT', 'ArrowDown selects next');
  runC('_swingKeydownHandler({ key:"ArrowRight", target:{tagName:"BODY"}, preventDefault(){} })'); await tick();
  eq(chartSandbox.S.swing.selectedSymbol, 'GOOG', 'ArrowRight selects next');
  runC('_swingKeydownHandler({ key:"ArrowUp", target:{tagName:"BODY"}, preventDefault(){} })'); await tick();
  eq(chartSandbox.S.swing.selectedSymbol, 'MSFT', 'ArrowUp selects previous');
  runC('_swingKeydownHandler({ key:"ArrowLeft", target:{tagName:"BODY"}, preventDefault(){} })'); await tick();
  eq(chartSandbox.S.swing.selectedSymbol, 'AAPL', 'ArrowLeft selects previous');

  // 45. Keyboard does not interfere with inputs/selects/textareas
  chartSandbox.S.swing.selectedSymbol = 'AAPL'; chartSandbox.S.swing.selectedIndex = 0;
  ['INPUT', 'SELECT', 'TEXTAREA'].forEach(tag => {
    runC('_swingKeydownHandler({ key:"ArrowDown", target:{tagName:"' + tag + '"}, preventDefault(){} })');
  });
  runC('_swingKeydownHandler({ key:"ArrowDown", target:{tagName:"DIV", isContentEditable:true}, preventDefault(){} })');
  eq(chartSandbox.S.swing.selectedSymbol, 'AAPL', 'arrows ignored while typing in inputs/selects/textareas/contentEditable');

  // 46. Keyboard no-op when the Swing screen is not active
  chartSandbox.S.swing.active = false; chartSandbox.S.swing.selectedIndex = 0; chartSandbox.S.swing.selectedSymbol = 'AAPL';
  runC('_swingKeydownHandler({ key:"ArrowDown", target:{tagName:"BODY"}, preventDefault(){} })');
  eq(chartSandbox.S.swing.selectedSymbol, 'AAPL', 'arrow keys no-op when Swing screen inactive');
  chartSandbox.S.swing.active = true;

  // 47. No selection + arrow selects the first candidate
  chartSandbox.S.swing.selectedSymbol = null; chartSandbox.S.swing.selectedIndex = null;
  runC('_swingSelectNextCandidate()'); await tick();
  eq(chartSandbox.S.swing.selectedSymbol, 'AAPL', 'arrow with no selection selects first candidate');

  // 48. Keydown listener attaches once (no duplicates on repeated init)
  keydownListeners = 0;
  runC('_swingAttachKeyListener()'); runC('_swingAttachKeyListener()'); runC('_swingAttachKeyListener()');
  eq(keydownListeners, 1, 'keydown listener attached exactly once across repeated calls');

  // 49. Re-selecting same candidate does not refetch
  backendCalls = [];
  await runC('_swingSelectCandidate("AAPL", {})'); // AAPL already selected
  eq(backendCalls.length, 0, 're-selecting the same candidate triggers no backend requests');

  // 50. Charts load ONLY for the selected symbol — enrichment reads do NOT log
  chartLogs.length = 0;
  await runC('Promise.all([_swingFetchContextCandles("ZZZ","1D"), _swingFetchContextCandles("YYY","4H")])');
  ok(!chartLogs.some(l => /\[SWING\]\[CHART-CANDLES\]/.test(l)), 'enrichment/context reads emit NO chart-candle provenance logs');
  chartSandbox.S.swing.selectedSymbol = null; chartSandbox.S.swing.selectedIndex = null; chartLogs.length = 0;
  await runC('_swingSelectCandidate("AAPL", {})');
  const aaplLogs = chartLogs.filter(l => /\[SWING\]\[CHART-CANDLES\]/.test(l));
  ok(aaplLogs.length > 0 && aaplLogs.every(l => /symbol=AAPL/.test(l)), 'provenance logs appear only for the selected symbol');

  // 51. Scrolling the table cannot trigger chart loads (no scroll listener in block)
  ok(!/addEventListener\(\s*['"]scroll['"]/.test(block) && !/onscroll/.test(block), 'no scroll listener / onscroll in Swing block — scrolling never loads charts');

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
return;

// eslint-disable-next-line no-unreachable
console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
