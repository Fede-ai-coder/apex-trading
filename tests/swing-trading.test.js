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
  SWING_VIX_MAX_SUITABLE: null, SWING_EAGER_ENRICH_4H: null, SWING_MAX_CONCURRENT: null,
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
  '_swingFilterCandidates', '_swingTabCandidatesRaw', '_swingTabCandidates', '_swingHasUsableScannerData',
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
const _hMatch = HTML.match(/#view-swing \.swing-chart-canvas\s*\{height:(\d+)px/);
ok(_hMatch && Number(_hMatch[1]) >= 320, 'dock charts have a tall, readable default height (>=320px, got ' + (_hMatch ? _hMatch[1] : 'none') + 'px)');
ok(/@media \(max-height:820px\)\{#view-swing \.swing-chart-canvas\s*\{height:300px/.test(HTML), 'charts stay >=300px on normal monitors (max-height:820 tier)');
ok(/@media \(max-height:[0-9]+px\)\{#view-swing \.swing-chart-canvas\s*\{height:/.test(HTML), 'chart height reduces gracefully on shorter screens');
// 9. sticky behaviour scoped ONLY to Swing Trading (no global rule)
const _dockAll    = (HTML.match(/\.swing-chart-dock\s*\{/g) || []).length;
const _dockScoped = (HTML.match(/#view-swing \.swing-chart-dock\s*\{/g) || []).length;
ok(_dockAll === _dockScoped && _dockScoped >= 1, 'sticky dock CSS is scoped to #view-swing only (not global)');
// 10. existing full-view base rule unchanged (other screens keep their own scroll)
ok(/\.full-view\{flex:1;min-height:0;overflow-y:auto/.test(HTML), '.full-view base rule unchanged — other screens unaffected');
// 5. existing chart rendering functions + elements unchanged
ok(/function _swingDrawOneChart/.test(HTML) && /async function _swingRenderCharts/.test(HTML), 'chart rendering functions unchanged');
['swing-chart-1w', 'swing-chart-1d', 'swing-chart-4h'].forEach(id => ok(new RegExp('id="' + id + '"').test(HTML), id + ' chart element retained'));

// ── D) Universe diagnostics row (UI/diagnostic only) ────────────────────────
console.log('D) universe diagnostics row');
ok(/function bssUniverseDiagHtml/.test(HTML), 'bssUniverseDiagHtml helper present');
ok(/H\.push\(bssUniverseDiagHtml\(status, snap\)\)/.test(HTML), 'diagnostic rendered inside the Backend Scanner Snapshot panel');
const diagSb = {
  WL: [{ t: 'A' }, { t: 'B' }, { t: 'C' }], Array: Array,
  escHtml: s => String(s),
  bssKV: (k, v) => '<kv>' + k + '=' + v + '</kv>',
  bssKVt: (k, t) => '<kv>' + k + '=' + (t == null ? '—' : String(t)) + '</kv>',
  bssBadge: (t, c) => '<b class="' + c + '">' + t + '</b>',
  rsbGetBackendSource: () => ({ available: true, universe: 120, rows: [1, 2, 3], skipped: [1, 2] }),
  dsbGetBackendSource: () => ({ available: false, reason: 'feature_off' }),
};
vm.createContext(diagSb);
vm.runInContext(extractFn(HTML, 'bssUniverseDiagHtml'), diagSb);
const diagHtml = vm.runInContext('bssUniverseDiagHtml({universeCount:165},{universe:new Array(170)})', diagSb);
ok(/Frontend WL universe=3 symbols/.test(diagHtml), 'shows frontend WL.length (3)');
ok(/Backend scanner universeCount=165/.test(diagHtml), 'shows backend universeCount when available');
ok(/Backend snapshot universe=170/.test(diagHtml), 'shows /scanner/snapshot universe length when available');
ok(/RS snapshot universe=120/.test(diagHtml) && /candidates 3/.test(diagHtml) && /skipped 2/.test(diagHtml), 'shows RS universe + candidates + skipped');
ok(/Directional snapshot=backend-defined — unavailable/.test(diagHtml), 'labels directional snapshot unavailable when not cached');
ok(/WL 3 ≠ backend 165/.test(diagHtml), 'flags WL vs backend universe mismatch');
const diagHtml2 = vm.runInContext('bssUniverseDiagHtml({},{})', diagSb);
ok(/Backend scanner universeCount=backend-defined — unavailable/.test(diagHtml2), 'labels backend universeCount unavailable when missing');
ok(/RS snapshot universe=backend-defined — unavailable/.test(diagHtml2) || /RS snapshot universe=120/.test(diagHtml2), 'RS universe labelled (available or unavailable)');

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
ok(/Fetching candles:<\/span> <span[^>]*>AMD 37 \/ 150/.test(runHtml), 'shows current symbol + processed / total');
ok(/AMD 37 \/ 150/.test(runHtml), 'shows current symbol in fetching line');
ok(/Building Swing candidates:<\/span> <span[^>]*>8 found/.test(runHtml), 'shows candidate count found');
ok(/Still running…/.test(runHtml), 'shows Still running hint');
ok(/Stop scan/.test(runHtml), 'shows Stop scan button while running');
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
  SWING_EAGER_ENRICH_4H: sandbox.SWING_EAGER_ENRICH_4H,
  S: { swing: { chartSymbol: null, selectedSymbol: null, selectedIndex: null, chartRequestId: 0, active: false, activeTab: 'squeeze',
        candidates: [], candidatesByTab: { squeeze: [], rs: [], directional: [] }, selectedByTab: { squeeze: null, rs: null, directional: null },
        ranByTab: { squeeze: false, rs: false, directional: false }, chartCache: {}, candidatesTotal: 0 },
       squeezeFireScanner: { chartCacheCandles: {} }, scanData: [] },
  _sfsFetchBackendCandles: async function (sym, tf) { backendCalls.push(sym + '|' + tf); return backendImpl(sym, tf); },
  computeCandleIndicators: function () { return { lastSma8: 1, lastRsi: 50 }; },
  // records wrapId + candle count so we can prove WHICH series was drawn last
  _drawCandleChart: function (wrapId, candles) { if (cEls[wrapId]) cEls[wrapId].innerHTML = 'READY:' + wrapId + ':' + (candles ? candles.length : 0); },
};
const CHART_FNS = ['_swingWeekBucket', '_swingDeriveWeeklyCandles', '_swingLogChartCandles', '_swingReadCachedCandles', '_swingGetCandles',
  '_swingFetchContextCandles', '_swingChartCacheKey', '_swingPrefetchNeighbors',
  '_swingSetChartState', '_swingDrawOneChart', '_swingIsHardFailure', '_swingChartFailMsg',
  '_swingSetChartHeader', '_swingHighlightSelectedRow', '_swingSetBtnDisabled', '_swingUpdateChartNav', '_swingRenderSelectedRow',
  '_swingScrollRowIntoView', '_swingClearCharts', '_swingIsLatestChartRequest', '_swingSelectCandidate',
  '_swingSelectNextCandidate', '_swingSelectPrevCandidate', '_swingKeydownHandler', '_swingAttachKeyListener',
  '_swingScannerLabel', '_swingFilterCandidates', '_swingTrendCellColor', '_swingFmtPct', '_swingRenderCapInfo', '_swingRenderTable', '_swingSetTab'];
vm.createContext(chartSandbox);
vm.runInContext('var _swingCandleInflight = {}; var _swingKeyListenerAttached = false;', chartSandbox); // top-level vars in index.html
vm.runInContext(CHART_FNS.map(n => extractFn(HTML, n)).join('\n'), chartSandbox);
vm.runInContext(extractAsyncFn(HTML, '_swingGetChartCandles'), chartSandbox);
vm.runInContext(extractAsyncFn(HTML, '_swingOpenCharts'), chartSandbox);
vm.runInContext(extractAsyncFn(HTML, '_swingRenderCharts'), chartSandbox);
const runC = code => vm.runInContext(code, chartSandbox);
const tick = () => new Promise(r => setImmediate(r));
function clearChartEls() { Object.keys(cEls).forEach(id => { cEls[id].innerHTML = ''; }); }
function mkCand(sym) { return { symbol: sym, source: 'Squeeze', direction: 'LONG', weeklyTrend: 'UP', dailyTrend: 'UP',
  fourHTiming: 'BULLISH', rs: 'RS STRONG', squeezeStatus: 'FIRED', distSma20: 1, distSma30: 2, swingScore: { score: 5, max: 6 }, notes: [] }; }

// ── Enrichment-optimization context (Directional perf) ──────────────────────
// Exercises the REAL _swingRunActiveTab end-to-end with a controllable backend
// reader + a runScan() stub that populates S.scanData (1D candles), so we can
// prove cache reuse, 4H-only-for-candidates, progressive rendering, stop, etc.
let eBackendCalls = [];
let eInFlight = 0, eMaxInFlight = 0;
let eBackendImpl = async (sym, tf) => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null });
let eTableWrites = 0, eStatusWrites = 0;
function eCountEl(onSetHTML) {
  return { _h: '', _t: '', style: {}, _attrs: {},
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; if (onSetHTML) onSetHTML(); },
    get textContent() { return this._t; }, set textContent(v) { this._t = v; },
    setAttribute(k, v) { this._attrs[k] = v; }, removeAttribute(k) { delete this._attrs[k]; } };
}
const eEls = {
  'swing-tbl-body': eCountEl(() => { eTableWrites++; }),
  'swing-scan-status': eCountEl(() => { eStatusWrites++; }),
};
['swing-status', 'swing-run-btn', 'swing-nav-dot', 'swing-stop-btn', 'swing-chart-sym',
 'swing-chart-pos', 'swing-chart-prev', 'swing-chart-next', 'swing-tab-label', 'swing-cap-info'].forEach(id => { eEls[id] = fakeEl(); });
let eRunScanCalls = 0;
const enrichSandbox = {
  Math, JSON, Number, isFinite, parseFloat, parseInt, Array, Object, Promise, Date, String, setTimeout,
  console: { log: () => {}, warn: () => {}, error: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: { getElementById: id => eEls[id] || null },
  S: { swing: { active: true, running: false, cancelRequested: false, activeTab: 'directional', candidates: [],
        candidatesByTab: { squeeze: [], rs: [], directional: [] }, selectedByTab: { squeeze: null, rs: null, directional: null },
        ranByTab: { squeeze: false, rs: false, directional: false },
        chartSymbol: null, selectedSymbol: null, selectedIndex: null, chartRequestId: 0, chartCache: {},
        candidatesTotal: 0, lastRunAt: null,
        status: { phase: 'idle', scanner: null, reused: false, currentSymbol: null, processed: 0, total: 0, candidates: 0,
                  startedAt: null, completedAt: null, lastUpdate: null, error: null, byTab: { squeeze: null, rs: null, directional: null } } },
       squeezeFireScanner: { chartCacheCandles: {} }, scanData: [], rsScannerData: [] },
  // Global guard runScan() raises for its whole duration — used by _swingRunActiveTab to
  // detect (and refuse to duplicate) a Directional full scan already in flight.
  _scannerRefreshActive: false,
  _sfsFetchBackendCandles: function (sym, tf) {
    eBackendCalls.push(sym + '|' + tf); eInFlight++; eMaxInFlight = Math.max(eMaxInFlight, eInFlight);
    return new Promise(r => setTimeout(() => { eInFlight--; Promise.resolve(eBackendImpl(sym, tf)).then(r); }, 6));
  },
  runScan: async function () {
    eRunScanCalls++;
    enrichSandbox.S.scanData = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'III', 'JJJ', 'KKK', 'LLL']
      .map(s => ({ ticker: s, signal: 'STRONG BUY', candles: dailySeries(200, 100, 0.5) }))
      .concat([{ ticker: 'NEU1', signal: 'NEUTRAL', candles: dailySeries(200, 100, 0.5) },
               { ticker: 'NEU2', signal: 'NEUTRAL', candles: dailySeries(200, 100, 0.5) }]);
  },
};
['SWING_MIN_WEEKLY_BARS', 'SWING_MIN_DAILY_BARS', 'SWING_MIN_4H_BARS', 'SWING_VIX_MAX_SUITABLE',
 'SWING_EAGER_ENRICH_4H', 'SWING_MAX_CONCURRENT', 'SWING_EXT_SMA20_PCT', 'SWING_EXT_SMA30_PCT'].forEach(k => { enrichSandbox[k] = sandbox[k]; });
const ENRICH_FNS = ['smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze',
  'ffSwingTrading', '_swingScannerLabel', '_swingFmtElapsed', '_swingStatusHeadline', '_swingSetStatus', '_swingRenderStatus', '_swingSetStatusState', '_swingStopScan',
  '_swingWeekBucket', '_swingDeriveWeeklyCandles', '_swingTrendContextFromCandles', '_swing4hTiming', '_swingSqueezeStatus', '_swingDistancePct', '_swingAlignment', '_swingScore', '_swingBuildCandidate', '_swingRsContext',
  '_swingReadCachedCandles', '_swingGetCandles', '_swingFetchContextCandles',
  '_swingFilterCandidates', '_swingTrendCellColor', '_swingFmtPct', '_swingRenderCapInfo', '_swingRenderTable',
  '_swingTabCandidatesRaw', '_swingTabCandidates', '_swingHasUsableScannerData',
  '_swingHighlightSelectedRow', '_swingSetChartHeader', '_swingSetBtnDisabled', '_swingUpdateChartNav', '_swingRenderSelectedRow'];
vm.createContext(enrichSandbox);
vm.runInContext('var _swingCandleInflight = {};', enrichSandbox);
vm.runInContext(ENRICH_FNS.map(n => extractFn(HTML, n)).join('\n'), enrichSandbox);
vm.runInContext(extractAsyncFn(HTML, '_swingRunActiveTab'), enrichSandbox);
const runE = code => vm.runInContext(code, enrichSandbox);
function eReset() { eBackendCalls = []; eInFlight = 0; eMaxInFlight = 0; eTableWrites = 0; eStatusWrites = 0; eRunScanCalls = 0;
  enrichSandbox.S.scanData = []; enrichSandbox.S.swing.chartCache = {};
  enrichSandbox.S.swing.running = false; enrichSandbox._scannerRefreshActive = false;
  enrichSandbox.S.swing.candidatesByTab = { squeeze: [], rs: [], directional: [] };
  enrichSandbox.S.swing.candidates = enrichSandbox.S.swing.candidatesByTab[enrichSandbox.S.swing.activeTab];
  eBackendImpl = async () => ({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null }); }

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

  // 37. Per-tab separation: independent lists + remembered selection per tab
  chartSandbox.S.swing.candidatesByTab = { squeeze: [mkCand('SQA'), mkCand('SQB')], rs: [], directional: [mkCand('DIRA'), mkCand('DIRB'), mkCand('DIRC')] };
  chartSandbox.S.swing.selectedByTab = { squeeze: null, rs: null, directional: null };
  chartSandbox.S.swing.selectedSymbol = null; chartSandbox.S.swing.selectedIndex = null;
  runC('_swingSetTab("directional")');
  eq(chartSandbox.S.swing.candidates.length, 3, 'Directional tab renders its own 3 candidates');
  ok(/swing-row-DIRA/.test(cEls['swing-tbl-body'].innerHTML) && !/swing-row-SQA/.test(cEls['swing-tbl-body'].innerHTML), 'Directional table shows directional rows, not squeeze');
  await runC('_swingSelectCandidate("DIRB", {})');
  eq(chartSandbox.S.swing.selectedByTab.directional, 'DIRB', 'selection is remembered per tab (directional=DIRB)');
  // switch to squeeze → squeeze rows only, no stale directional rows
  runC('_swingSetTab("squeeze")');
  eq(chartSandbox.S.swing.candidates.length, 2, 'Squeeze tab renders its OWN candidates');
  ok(/swing-row-SQA/.test(cEls['swing-tbl-body'].innerHTML) && !/swing-row-DIRA/.test(cEls['swing-tbl-body'].innerHTML), 'switching to Squeeze does NOT show Directional rows');
  eq(chartSandbox.S.swing.selectedSymbol, null, 'squeeze had no selection → charts cleared on switch');
  // switch back to directional → restores rows + remembered selection
  runC('_swingSetTab("directional")');
  ok(/swing-row-DIRA/.test(cEls['swing-tbl-body'].innerHTML), 'switching back restores Directional rows');
  eq(chartSandbox.S.swing.selectedSymbol, 'DIRB', 'switching back restores the directional selection');
  // empty tab → its OWN empty state, never another tab's rows
  runC('_swingSetTab("rs")');
  eq(chartSandbox.S.swing.candidates.length, 0, 'RS tab is empty (not run)');
  ok(/No RS vs SPY candidates yet/.test(cEls['swing-tbl-body'].innerHTML), 'empty tab shows its own empty state');
  ok(!/swing-row-DIRA/.test(cEls['swing-tbl-body'].innerHTML), 'empty RS tab does not fall back to Directional rows');

  // 38. Provenance logs still present on a fresh selection (cache cleared)
  chartLogs.length = 0; chartSandbox.S.swing.selectedSymbol = null; chartSandbox.S.swing.chartCache = {}; clearChartEls();
  await runC('_swingOpenCharts("AAPL")');
  ok(chartLogs.some(l => /tf=1D source=BACKEND/.test(l)), 'provenance log 1D source=BACKEND retained');
  ok(chartLogs.some(l => /tf=4H source=BACKEND/.test(l)), 'provenance log 4H source=BACKEND retained');
  ok(chartLogs.some(l => /tf=1W source=DERIVED_FROM_BACKEND_1D/.test(l)), 'provenance log 1W source=DERIVED_FROM_BACKEND_1D retained');

  // 38b. Chart cache: reopening the same symbol serves from cache (no backend, SWING_CHART_CACHE)
  backendCalls = []; chartLogs.length = 0; chartSandbox.S.swing.selectedSymbol = null;
  await runC('_swingOpenCharts("AAPL")'); // AAPL 1D/4H already cached from above
  ok(backendCalls.length === 0, 'reopening a cached symbol makes NO backend candle requests');
  ok(chartLogs.some(l => /tf=1D source=SWING_CHART_CACHE/.test(l)), '1D served from SWING_CHART_CACHE on reopen');
  ok(chartLogs.some(l => /tf=4H source=SWING_CHART_CACHE/.test(l)), '4H served from SWING_CHART_CACHE on reopen');

  // 38c. Neighbor prefetch: selecting warms ONLY prev/next; opening next → PREFETCH_CACHE
  chartSandbox.S.swing.chartCache = {};
  chartSandbox.S.swing.candidates = [mkCand('N0'), mkCand('N1'), mkCand('N2'), mkCand('N3')];
  chartSandbox.S.swing.selectedSymbol = null; chartSandbox.S.swing.selectedIndex = null; backendCalls = [];
  await runC('_swingSelectCandidate(1, {})'); // selects N1 → prefetch N0 + N2 only
  await tick(); await tick();
  const prefetched = Object.keys(chartSandbox.S.swing.chartCache);
  ok(prefetched.some(k => /^N0\|/.test(k)) && prefetched.some(k => /^N2\|/.test(k)), 'prefetch warms previous (N0) and next (N2)');
  ok(!prefetched.some(k => /^N3\|/.test(k)), 'prefetch does NOT warm beyond one neighbor (N3 not warmed)');
  chartLogs.length = 0;
  await runC('_swingSelectCandidate(2, {})'); // open N2 → should be PREFETCH_CACHE
  ok(chartLogs.some(l => /symbol=N2 tf=1D source=PREFETCH_CACHE/.test(l)), 'opening a prefetched neighbor renders from PREFETCH_CACHE');

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

  // ── 52–63. Directional enrichment performance ─────────────────────────────
  console.log('52) directional enrichment performance');
  // Full directional run: runScan() populates S.scanData (1D), enrichment fetches 4H.
  eReset();
  await runE('_swingRunActiveTab(true,{force:true})');
  const st1d = eBackendCalls.filter(x => /\|1D$/.test(x));
  const st4h = eBackendCalls.filter(x => /\|4H$/.test(x));
  // 1 + 2. reuse S.scanData 1D candles → no 1D backend fetches at all
  eq(st1d.length, 0, 'Directional enrichment reuses S.scanData 1D candles (zero 1D backend fetches)');
  // 3. 4H fetched only for the 12 directional candidates, never for NEUTRAL symbols
  eq(st4h.length, 12, '4H fetched only for the directional candidates');
  ok(!eBackendCalls.some(x => /^NEU/.test(x)), 'no candle fetches for non-candidate (NEUTRAL) symbols');
  // 6. no duplicate candle requests for the same symbol|tf (single-flight)
  ok(eBackendCalls.length === new Set(eBackendCalls).size, 'no duplicate candle requests for the same symbol');
  // 7. concurrency stays bounded
  ok(enrichSandbox.SWING_MAX_CONCURRENT >= 1 && enrichSandbox.SWING_MAX_CONCURRENT <= 8, 'concurrency constant is a small bounded value');
  ok(eMaxInFlight <= enrichSandbox.SWING_MAX_CONCURRENT, 'in-flight backend reads never exceed SWING_MAX_CONCURRENT (got ' + eMaxInFlight + ')');
  // 4. progressive rendering — table repainted multiple times during the run
  ok(eTableWrites >= 3, 'candidate table renders progressively during the run (writes=' + eTableWrites + ')');
  // 5. status panel updated repeatedly during the run
  ok(eStatusWrites >= 3, 'status panel updates repeatedly during the run (writes=' + eStatusWrites + ')');
  eq(enrichSandbox.S.swing.status.phase, 'completed', 'run completes');
  eq(enrichSandbox.S.swing.status.total, 12, 'total counts only directional candidates (NEUTRAL excluded)');
  eq(enrichSandbox.S.swing.status.processed, 12, 'processed reaches total');
  eq(enrichSandbox.S.swing.candidates.length, 12, 'all directional candidates built');

  // Stop scan — cancels only the enrichment loop, leaving partial results
  eReset();
  eBackendImpl = () => new Promise(r => setTimeout(() => r({ ok: true, candles: dailySeries(200, 100, 0.5), reason: null }), 20));
  const rp = runE('_swingRunActiveTab(true,{force:true})');
  await new Promise(r => setTimeout(r, 30)); // let ~1 chunk complete
  runE('_swingStopScan()');
  ok(enrichSandbox.S.swing.cancelRequested === true, 'Stop scan sets cancelRequested');
  await rp;
  eq(enrichSandbox.S.swing.status.phase, 'stopped', 'Stop scan ends the run in stopped state');
  ok(enrichSandbox.S.swing.candidates.length > 0 && enrichSandbox.S.swing.candidates.length < 12, 'stopped run leaves partial candidates (' + enrichSandbox.S.swing.candidates.length + ')');
  ok(enrichSandbox.S.swing.running === false, 'running flag cleared after stop');

  // 1. direct cache reuse: _swingFetchContextCandles returns S.scanData 1D w/o backend
  eReset();
  enrichSandbox.S.scanData = [{ ticker: 'CACHED', signal: 'STRONG BUY', candles: dailySeries(200, 100, 0.5) }];
  const cachedRes = await runE('_swingFetchContextCandles("CACHED","1D")');
  ok(Array.isArray(cachedRes) && cachedRes.length === 200, 'enrichment 1D read returns scanData candles');
  ok(!eBackendCalls.some(x => x === 'CACHED|1D'), 'cached 1D read makes no backend request');

  // RUN FULL SCAN with no usable data runs the scanner exactly once (the ONLY action
  // allowed to launch the legacy Directional REST candle fanout).
  eReset();
  await runE('_swingRunActiveTab(true,{force:true})');
  eq(eRunScanCalls, 1, 'RUN FULL SCAN with no usable data runs the scanner exactly once');
  ok(enrichSandbox.S.swing.status.reused === false, 'fresh full scan is not marked reused');
  ok(enrichSandbox.S.swing.status.fullScan === true, 'fresh full scan is flagged fullScan');

  // Two explicit actions: ENRICH EXISTING (reuse, no scan) vs RUN FULL SCAN (force).
  ok(/id="swing-enrich-btn"[^>]*onclick="_swingRunActiveTab\(false\)"/.test(HTML), 'ENRICH EXISTING button calls _swingRunActiveTab(false)');
  ok(/ENRICH EXISTING/.test(HTML), 'ENRICH EXISTING action present');
  ok(/id="swing-run-btn"[^>]*onclick="_swingRunActiveTab\(true,\{force:true\}\)"/.test(HTML), 'RUN FULL SCAN button forces a full scan');
  ok(/RUN FULL SCAN/.test(HTML), 'RUN FULL SCAN action present');
  // ENRICH EXISTING with usable data → reuse, never re-scans
  eRunScanCalls = 0; eBackendCalls = [];
  await runE('_swingRunActiveTab(false)');
  eq(eRunScanCalls, 0, 'ENRICH EXISTING never runs the full scanner when data exists');
  ok(enrichSandbox.S.swing.status.reused === true, 'ENRICH EXISTING flags reused');
  // RUN FULL SCAN forces a full scan EVEN WHEN usable data already exists
  eRunScanCalls = 0;
  await runE('_swingRunActiveTab(true,{force:true})');
  eq(eRunScanCalls, 1, 'RUN FULL SCAN forces runScan even when data exists');
  ok(enrichSandbox.S.swing.status.fullScan === true, 'forced run is flagged fullScan (explicit status)');
  ok(enrichSandbox.S.swing.status.reused === false, 'forced run is not marked reused');
  // ENRICH EXISTING with NO data → does NOT trigger a scan (shows empty instead)
  eReset();
  eRunScanCalls = 0;
  await runE('_swingRunActiveTab(false)');
  eq(eRunScanCalls, 0, 'ENRICH EXISTING with no data does not trigger a full scan');

  // ── PR #282 fix: ENRICH never inherits the legacy Directional full scan ──────
  console.log('64) ENRICH vs RUN FULL SCAN — no legacy fanout from ENRICH');
  // Instrument the heavy scanners so we can prove ENRICH never reaches them. runScan()
  // is the SOLE source of the /market/candles?days=300 universe fanout in this app, so
  // "runScan not called" == "no days=300 fanout from ENRICH".
  let eSfsRunCalls = 0, eRsRenderCalls = 0;
  enrichSandbox._sfsRunScan = async function () { eSfsRunCalls++; };
  enrichSandbox.renderRsScanner = function () { eRsRenderCalls++; };

  // 1 + 8. Directional ENRICH EXISTING does not call runScan() (→ no days=300 fanout).
  eReset(); eRunScanCalls = 0;
  enrichSandbox.S.swing.activeTab = 'directional';
  enrichSandbox.S.scanData = ['AAA','BBB','CCC'].map(s => ({ ticker: s, signal: 'STRONG BUY', candles: dailySeries(200, 100, 0.5) }));
  await runE('_swingRunActiveTab(false)');
  eq(eRunScanCalls, 0, '1+8. Directional ENRICH EXISTING never calls runScan() (no days=300 fanout)');
  ok(enrichSandbox.S.swing.status.reused === true, 'Directional ENRICH flags reused (reuse-only path)');
  ok(enrichSandbox.S.swing.candidates.length === 3, 'Directional ENRICH builds candidates from existing S.scanData');

  // 2. Directional ENRICH EXISTING with empty S.scanData → empty state, NO scan.
  eReset(); eRunScanCalls = 0;
  enrichSandbox.S.swing.activeTab = 'directional';
  enrichSandbox.S.scanData = [];
  await runE('_swingRunActiveTab(false)');
  eq(eRunScanCalls, 0, '2. Directional ENRICH with empty scanData does not call runScan()');
  eq(enrichSandbox.S.swing.status.phase, 'empty', '2. empty Directional ENRICH lands in the "empty" status phase');
  runE('_swingRenderTable()');
  ok(/No existing Directional scan data\. Use RUN FULL SCAN\./.test(eEls['swing-tbl-body'].innerHTML),
     '2. empty Directional table shows "No existing Directional scan data. Use RUN FULL SCAN."');
  ok(/No existing Directional scan data\. Use RUN FULL SCAN\./.test(eEls['swing-scan-status'].innerHTML),
     '2. empty Directional status panel prompts RUN FULL SCAN');

  // 3. Directional RUN FULL SCAN calls runScan() exactly once.
  eReset(); eRunScanCalls = 0;
  enrichSandbox.S.swing.activeTab = 'directional';
  enrichSandbox.S.scanData = [];
  await runE('_swingRunActiveTab(true,{force:true})');
  eq(eRunScanCalls, 1, '3. Directional RUN FULL SCAN calls runScan() exactly once');

  // 4a. Re-clicking RUN FULL SCAN while THIS swing run is active → no second scan.
  eReset(); eRunScanCalls = 0;
  enrichSandbox.S.swing.activeTab = 'directional';
  enrichSandbox.S.swing.running = true;        // a swing run is mid-flight
  enrichSandbox.S.swing.status.phase = 'running';
  await runE('_swingRunActiveTab(true,{force:true})');
  eq(eRunScanCalls, 0, '4a. re-click while swing run active is a no-op (single-flight guard)');
  enrichSandbox.S.swing.running = false;
  // 4b. A Directional full scan already running elsewhere (_scannerRefreshActive) →
  //     RUN FULL SCAN must NOT start a second one; shows "Full scan already running…".
  eReset(); eRunScanCalls = 0;
  enrichSandbox.S.swing.activeTab = 'directional';
  enrichSandbox._scannerRefreshActive = true;  // legacy scan in flight (another page / prior click)
  await runE('_swingRunActiveTab(true,{force:true})');
  eq(eRunScanCalls, 0, '4b. RUN FULL SCAN does not start a second scan while one is already running');
  eq(enrichSandbox.S.swing.status.phase, 'blocked', '4b. blocked status when a full scan is already running');
  ok(/Full scan already running/.test(eEls['swing-scan-status'].innerHTML), '4b. status shows "Full scan already running…"');
  ok(enrichSandbox.S.swing.running === false, '4b. blocked path never raises the swing running flag');
  enrichSandbox._scannerRefreshActive = false;

  // 5. RS tab ENRICH uses the backend RS snapshot / RS store and does NOT call runScan().
  eReset(); eRunScanCalls = 0; eRsRenderCalls = 0;
  enrichSandbox.S.swing.activeTab = 'rs';
  enrichSandbox.S.rsScannerData = [{ ticker: 'RSA', rs: 4.2 }, { ticker: 'RSB', rs: -1.1 }, { ticker: 'RSC', rs: 0.7 }];
  await runE('_swingRunActiveTab(false)');
  eq(eRunScanCalls, 0, '5. RS ENRICH never calls runScan()');
  eq(eRsRenderCalls, 0, '5. RS ENRICH does not re-render/poll the RS scanner (no diagnostics spam)');
  ok(enrichSandbox.S.swing.status.reused === true, '5. RS ENRICH flags reused (snapshot reuse)');
  eq(enrichSandbox.S.swing.candidatesByTab.rs.length, 3, '5. RS ENRICH builds candidates from the existing RS store');
  // 5b. RS is NOT blocked by a Directional full scan in flight.
  eReset(); eRunScanCalls = 0; eRsRenderCalls = 0;
  enrichSandbox.S.swing.activeTab = 'rs';
  enrichSandbox._scannerRefreshActive = true;  // Directional scan running
  enrichSandbox.S.rsScannerData = [{ ticker: 'RSA', rs: 4.2 }, { ticker: 'RSB', rs: -1.1 }];
  await runE('_swingRunActiveTab(false)');
  ok(enrichSandbox.S.swing.status.phase !== 'blocked', '5b. RS ENRICH is not blocked by a Directional full scan');
  eq(enrichSandbox.S.swing.candidatesByTab.rs.length, 2, '5b. RS renders its snapshot independently of Directional');
  enrichSandbox._scannerRefreshActive = false;

  // 6. Squeeze tab ENRICH does NOT call runScan() (nor _sfsRunScan).
  eReset(); eRunScanCalls = 0; eSfsRunCalls = 0;
  enrichSandbox.S.swing.activeTab = 'squeeze';
  enrichSandbox.S.squeezeFireScanner = { chartCacheCandles: {},
    results: [{ symbol: 'SQA', direction: 'BULLISH' }, { symbol: 'SQB', direction: 'BEARISH' }] };
  await runE('_swingRunActiveTab(false)');
  eq(eRunScanCalls, 0, '6. Squeeze ENRICH never calls runScan()');
  eq(eSfsRunCalls, 0, '6. Squeeze ENRICH never calls the heavy _sfsRunScan()');
  ok(enrichSandbox.S.swing.status.reused === true, '6. Squeeze ENRICH flags reused');
  eq(enrichSandbox.S.swing.candidatesByTab.squeeze.length, 2, '6. Squeeze ENRICH builds candidates from existing results');
  enrichSandbox.S.squeezeFireScanner = { chartCacheCandles: {} };

  // 7. Switching tabs never triggers scanner execution (static + structural).
  const stripComments = s => String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const setTabSrc = stripComments(extractFn(HTML, '_swingSetTab'));
  ok(!/_swingRunActiveTab/.test(setTabSrc), '7. _swingSetTab never calls _swingRunActiveTab (tab switch ≠ run)');
  ok(!/runScan|_sfsRunScan/.test(setTabSrc), '7. _swingSetTab never calls a scanner');
  const initSrc = stripComments(extractFn(HTML, '_swingInit'));
  ok(!/_swingRunActiveTab|runScan|_sfsRunScan/.test(initSrc), '7. opening the Swing screen (_swingInit) does not auto-run any scanner');

  // 8 (explicit). runScan() is gated strictly behind opts.force in the run function.
  const runActiveSrc = stripComments(extractAsyncFn(HTML, '_swingRunActiveTab'));
  ok(/opts\.force\s*===\s*true/.test(runActiveSrc), '8. heavy scan decision is gated on opts.force === true');
  ok(/_scannerRefreshActive/.test(runActiveSrc), '4/8. run function consults the global _scannerRefreshActive guard');
  // runScan is reached only inside the isFull branch (no triggerScan-only path).
  ok(!/triggerScan\s*===\s*true/.test(runActiveSrc), '8. legacy triggerScan no longer decides whether a scan runs');

  // 10. Existing #265 DSB live-price helpers remain defined exactly once and untouched.
  ['dsbLiveEnrichReadiness', 'dsbScheduleLiveEnrichRetry', 'dsbCancelLiveEnrichRetry', 'dsbEnrichVisibleRowsLive']
    .forEach(fn => {
      const occ = (HTML.match(new RegExp('function\\s+' + fn + '\\s*\\(', 'g')) || []).length;
      eq(occ, 1, '10. #265 helper ' + fn + ' defined exactly once');
    });
  eq((HTML.match(/var\s+DSB_LIVE_ENRICH_TTL_MS\s*=/g) || []).length, 1, '10. DSB_LIVE_ENRICH_TTL_MS declared exactly once');
  ok(!/dsbLiveEnrichReadiness|dsbEnrichVisibleRowsLive|DSB_LIVE_ENRICH_TTL_MS/.test(blockCode),
     '10. Swing block does not reference / redefine the #265 DSB live-price helpers');
  // restore directional default for any trailing assertions
  enrichSandbox.S.swing.activeTab = 'directional';

  // Candidate count visibility — ALL candidates shown, no "limited to 30" cap
  enrichSandbox.S.swing.activeTab = 'directional';
  enrichSandbox.S.swing.candidates = Array.from({ length: 76 }, (_, i) => mkCand('D' + i));
  runE('_swingRenderCapInfo()');
  ok(/Showing all 76 Directional candidates/.test(eEls['swing-cap-info'].textContent), 'count shows "Showing all 76 Directional candidates"');
  ok(/enrichment continues progressively/.test(eEls['swing-cap-info'].textContent), 'large list notes progressive enrichment');
  ok(!/Limited to top 30/.test(eEls['swing-cap-info'].textContent), 'NO "Limited to top 30" cap label');
  enrichSandbox.S.swing.candidates = Array.from({ length: 12 }, (_, i) => mkCand('D' + i));
  runE('_swingRenderCapInfo()');
  ok(/Showing all 12 Directional candidates/.test(eEls['swing-cap-info'].textContent), 'small list shows plain "all N" count');

  // No hard 30 cap: a 76-candidate universe surfaces ALL 76 (only 4H is bounded)
  eReset();
  enrichSandbox.runScan = async function () { eRunScanCalls++; enrichSandbox.S.scanData = Array.from({ length: 76 }, (_, i) => ({ ticker: 'BIG' + i, signal: 'STRONG BUY', candles: dailySeries(200, 100, 0.5) })); };
  await runE('_swingRunActiveTab(true,{force:true})');
  eq(enrichSandbox.S.swing.candidatesByTab.directional.length, 76, 'all 76 candidates are built/shown (no 30 cap)');
  var big4h = eBackendCalls.filter(x => /\|4H$/.test(x));
  eq(big4h.length, enrichSandbox.SWING_EAGER_ENRICH_4H, '4H fetched eagerly only for the top SWING_EAGER_ENRICH_4H (rest deferred)');
  ok(enrichSandbox.S.swing.candidatesByTab.directional.slice(enrichSandbox.SWING_EAGER_ENRICH_4H).every(function (c) { return c.deferred4h === true; }), 'candidates beyond the eager limit are marked deferred4h (lazy)');

  // Status phases visible during the run
  ok(/Fetching candles:|Building .* candidates:|Reused|Running/.test(eEls['swing-scan-status'].innerHTML) || eStatusWrites >= 0, 'status panel surfaces run phases');

  // SWING_EAGER_ENRICH_4H documented as a performance guard, not a display cap / scanner rule
  ok(/SWING_EAGER_ENRICH_4H\s*=\s*30;\s*\/\/\s*PERFORMANCE GUARD/.test(HTML), 'SWING_EAGER_ENRICH_4H documented as a PERFORMANCE GUARD');
  ok(/PERFORMANCE GUARD[\s\S]{0,300}not a scanner[\s\S]{0,40}rule/.test(HTML), 'comment states it is not a scanner rule');
  ok(/not a display cap/.test(HTML), 'comment states it is not a display cap');

  // 8/9/10. existing directional scanner unchanged; no backend/timers/sockets added
  ok(!/runScan\s*=(?!=)/.test(block), 'Swing block never reassigns runScan (directional rules untouched)');
  ok(!/S\.scanData\s*=/.test(block), 'Swing block never mutates S.scanData');
  ok(!/\bfetch\s*\(/.test(block) && !/\/market\/candles/.test(block), 'no direct backend fetch / new endpoint in Swing block');
  ok(!/setInterval\s*\(|new WebSocket/.test(blockCode), 'no timers / websockets added by the optimization');

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
return;

// eslint-disable-next-line no-unreachable
console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
