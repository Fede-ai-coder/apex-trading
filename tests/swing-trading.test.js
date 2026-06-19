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

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
return;

// eslint-disable-next-line no-unreachable
console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
