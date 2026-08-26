'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY pre-implementation audit — MCX charts / lifecycle boundary.
//
// READ-ONLY. This file changes no production byte; §10 proves it. Its job is to
// measure the next extraction boundary exactly, BEFORE anything is moved, and to
// record the one fact that makes this cut different from every extraction that
// came before it in this series.
//
// THE FINDING. The whole "MARKET CONTEXT AGENT (MCX)" section is NOT
// declarations-only. 825 characters into it, between the state variables and
// _mcxOnCandleTick, sits a top-level
//
//     window.addEventListener('resize', function(){ ... });
//
// — the MCX resize listener that #406 deliberately kept inline. A module
// carrying it would perform a load-time side effect and would NOT evaluate
// before its dependencies exist, breaking the invariant every prior owner in
// this series holds.
//
// So this audit measures TWO candidate boundaries and pins both:
//
//   CANDIDATE A — the whole MCX section (52 owners). Contiguous and natural,
//                 but load-bearing at evaluation time: it needs `window` and
//                 `_activeView` the moment the script runs.
//   CANDIDATE B — the declarations-only tail (38 owners), starting after the
//                 listener at the "MCX intrabar live-update" marker. Zero
//                 top-level residue; evaluates in a completely empty VM.
//
// The audit does not choose. It states what each costs, exactly.
// ─────────────────────────────────────────────────────────────────────────────

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '2c2964213367c8fb4448410b1394858e72090397';
const BASE_TREE = '168cc5549aa86e89366d3821e7feff4339c26d2b';
const BASE_SUBJECT = 'refactor(mcx): extract macro check UI (#406)';

const INDEX_CHARS = 1928890;
const INDEX_UTF8 = 1964320;
const INDEX_SHA256 = '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96';
const LOCAL_SCRIPTS = 53;

const BAR = '// ' + '═'.repeat(62);
const MCX_BANNER = BAR + '\n// MARKET CONTEXT AGENT (MCX)\n' + BAR + '\n\n';
const EIC_BANNER = BAR + '\n// EARNINGS IRON CONDOR AGENT (EIC)\n';
const LIVE_MARKER = '// ── MCX intrabar live-update ';
const SEPARATOR = '\n';

// ── CANDIDATE A: the whole MCX section ──────────────────────────────────────
const A_START = 1882013;
const A_END = 1926729;
const A_START_LINE = 33042;
const A_END_LINE = 33911;
const A_RANGE_CHARS = 44716;
const A_RANGE_UTF8 = 45976;
const A_RANGE_LF = 869;
const A_RANGE_SHA256 = '5095486e236f365421c3d177a583418d22bbcf1cda86fc8bf1d440929f4c5f21';
const A_MODULE_CHARS = 44715;
const A_MODULE_SHA256 = '17587bc67d92c33f131c7c3d8d7ee5157279f9b5a8e7e16200f819ab4b0834f8';
const A_OWNERS = 52;
const A_LISTENER_AT = 825;

// ── CANDIDATE B: the declarations-only tail ─────────────────────────────────
const B_START = 1883014;
const B_END = 1926729;
const B_START_LINE = 33065;
const B_END_LINE = 33911;
const B_RANGE_CHARS = 43715;
const B_RANGE_UTF8 = 44719;
const B_RANGE_LF = 846;
const B_RANGE_SHA256 = '099f6a27a879d318df4aae711ca6941b1726f7de5d36eb90521a75adb7172ff6';
const B_MODULE_CHARS = 43714;
const B_MODULE_UTF8 = 44718;
const B_MODULE_LF = 845;
const B_MODULE_SHA256 = 'daa0a165ef06abc401238ed2eb84a70d3e41a0439d070ad26e540220d0a0897d';
const B_OWNERS = 38;
const B_DECL_CHARS = 40564;
const B_PREDICTED_INDEX_CHARS = 1885221;
const B_PREDICTED_INDEX_UTF8 = 1919647;
const B_PREDICTED_INDEX_SHA256 = '0cc1582946efff6596d5cd21b9e2a256a8a0d464ae7d954b878d5b42f5adc3b6';
const B_PREDICTED_TAGS = 54;

// ── CANDIDATE C: owner-cohesive split (RECOMMENDED) ─────────────────────────
// Reviewer-proposed boundary. It moves the 13 MCX state owners WITH the
// chart/lifecycle functions that read and write them, and keeps behind exactly
// the listener plus the one variable that is private to it.
//
// The document is cut into six fragments. Three move, two stay, one is the
// structural separator:
//
//   1 [1882013,1882239)  MOVED     banner + state owners up to the timer
//   2 [1882239,1882272)  RETAINED  var _mcxResizeTimer = null;
//   3 [1882272,1882838)  MOVED     the remaining state owners
//   4 [1882838,1883014)  RETAINED  the resize listener, byte-for-byte
//   5 [1883014,1926728)  MOVED     the declarations-only tail
//   6 [1926728,1926729)  SEPARATOR one LF
//
// _mcxResizeTimer is listener-private: declared once, referenced only by this
// listener. Moving it would create a cross-boundary mutable-state write for no
// gain, so it stays with the listener that owns it.
const C_FRAGMENTS = [
  { name: 'movedPrefix1', moved: true, start: 1882013, end: 1882239, chars: 226,
    sha256: '56b2567b3f52c8b8f1017a5e8d1ffa68ec2a5b92997e43a19b61c6619f9f60fb' },
  { name: 'retainedTimerDecl', moved: false, start: 1882239, end: 1882272, chars: 33,
    sha256: 'b425ae3f21ef5671d0206b13498a14c354905fb199530a6764c4eaf2570e8504' },
  { name: 'movedPrefix2', moved: true, start: 1882272, end: 1882838, chars: 566,
    sha256: 'c1ec4d1f30c17d6dbf52f0daba7b539fa8e64d7ee90d9221ccb712a34b7d24cd' },
  { name: 'retainedListener', moved: false, start: 1882838, end: 1883014, chars: 176,
    sha256: '5194c5dd7a320f3ffe42efa9ca7e4eed28b37cb0977c3ac1be0fb71a2ec2a3ff' },
  { name: 'movedTail', moved: true, start: 1883014, end: 1926728, chars: 43714,
    sha256: 'daa0a165ef06abc401238ed2eb84a70d3e41a0439d070ad26e540220d0a0897d' },
];
const C_SEPARATOR_AT = 1926728;
const C_MODULE_CHARS = 44506;
const C_MODULE_UTF8 = 45766;
const C_MODULE_LF = 861;
const C_MODULE_SHA256 = '7337dba0ea08e5850899b539471003d4d7aa5dcb67006e0a3b49f187a1a98daa';
const C_OWNERS = 51;
const C_DEPENDENCIES = 44;
const C_GLUE_CHARS = 209;
const C_GLUE_UTF8 = 209;
const C_GLUE_LF = 7;
const C_GLUE_SHA256 = 'bca3dcbe07f48d7dfa0b640eb81bd6fa30bf8a035b324c354ab47e6c580eed62';
// Weave points inside the module: 226 = |fragment 1|, 792 = |fragment 1| + |fragment 3|.
const C_WEAVE_1 = 226;
const C_WEAVE_2 = 792;
const C_PREDICTED_INDEX_CHARS = 1884429;
const C_PREDICTED_INDEX_UTF8 = 1918599;
const C_PREDICTED_INDEX_LF = 33097;
const C_PREDICTED_INDEX_SHA256 = 'b5f6dd5b2fad6e1d3e0ce3fee4abf5cfb561c19de714e20f86874e49e10a857e';
const C_PREDICTED_TAGS = 54;

const C_EXPECTED_DEPENDENCIES = [
  'Date', 'JSON', 'Math', 'Object', 'Promise', 'ResizeObserver', 'S', '_REGIME_CONTENT',
  '_REGIME_LABEL', '_activeView', '_drawCandleChart', '_ensure30MSubscription',
  '_ensureCandleSubscription', '_mcxFetchBackendCandlesForChart', '_mcxGetBackendCandleEntry',
  '_mcxGetCachedBackendCandles', '_mcxRefreshVixData', '_mcxRegimeOf',
  '_mcxRenderBackendTechnicalSummary', '_mcxStoreBackendCandleEntry', '_patchLivePrice',
  '_recordBackendCandleProvenance', '_regimeCompactVixNotes', '_regimeDynForbidden',
  'clearInterval', 'clearTimeout', 'computeCandleIndicators', 'console', 'document',
  'ffBackendCandlesMcxCharts', 'getCandleDataSource', 'getDailyCandles', 'getFourHourCandles',
  'isFinite', 'localStorage', 'logEv', 'prepareHiDPICanvas', 'refreshSharedMarketRegime',
  'requestAnimationFrame', 'setAS', 'setInterval', 'setTimeout', 'smA', 'window',
];

const MCX_STATE_OWNERS = [
  '_mcxOverlay', '_mcxSqzState', '_mcxSpy4hTimer', '_mcxSpy4hCount', '_mcxVi3m4hTimer',
  '_mcxVi3m4hCount', '_mcxAutoRefreshTimer', '_mcxRefreshBusy', '_mcxResizeObs',
  '_mcxLiveCache', '_mcxLiveThrottle', '_mcxBackendFetchInFlight', '_mcxSpySqzCache',
];

const PROPOSED_TAG = '<script src="./js/ui/mcx-charts.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>\n';

// The state the listener and the vars leave behind in index.html under B.
const RETAINED_STATE_VARS = [
  '_mcxOverlay', '_mcxResizeTimer', '_mcxSqzState', '_mcxSpy4hTimer', '_mcxSpy4hCount',
  '_mcxVi3m4hTimer', '_mcxVi3m4hCount', '_mcxAutoRefreshTimer', '_mcxRefreshBusy',
  '_mcxResizeObs', '_mcxLiveCache', '_mcxLiveThrottle', '_mcxBackendFetchInFlight',
  '_mcxSpySqzCache',
];

const B_EXPECTED_DEPENDENCIES = [
  'Date', 'JSON', 'Math', 'Object', 'Promise', 'ResizeObserver', 'S', '_REGIME_CONTENT',
  '_REGIME_LABEL', '_activeView', '_drawCandleChart', '_ensure30MSubscription',
  '_ensureCandleSubscription', '_mcxAutoRefreshTimer', '_mcxBackendFetchInFlight',
  '_mcxFetchBackendCandlesForChart', '_mcxGetBackendCandleEntry', '_mcxGetCachedBackendCandles',
  '_mcxLiveCache', '_mcxLiveThrottle', '_mcxOverlay', '_mcxRefreshBusy', '_mcxRefreshVixData',
  '_mcxRegimeOf', '_mcxRenderBackendTechnicalSummary', '_mcxResizeObs', '_mcxSpy4hCount',
  '_mcxSpy4hTimer', '_mcxSpySqzCache', '_mcxSqzState', '_mcxStoreBackendCandleEntry',
  '_mcxVi3m4hCount', '_mcxVi3m4hTimer', '_patchLivePrice', '_recordBackendCandleProvenance',
  '_regimeCompactVixNotes', '_regimeDynForbidden', 'clearInterval', 'clearTimeout',
  'computeCandleIndicators', 'console', 'document', 'ffBackendCandlesMcxCharts',
  'getCandleDataSource', 'getDailyCandles', 'getFourHourCandles', 'isFinite', 'localStorage',
  'logEv', 'prepareHiDPICanvas', 'refreshSharedMarketRegime', 'requestAnimationFrame',
  'setAS', 'setInterval', 'setTimeout', 'smA', 'window',
];

// Candidate B's surface, and candidate A's. The three-effect gap between them
// IS the listener body: one `window.`, one `setTimeout`, one `clearTimeout`.
const B_EXPECTED_EFFECTS = {
  document: 39, window: 1, localStorage: 2, setTimeout: 7, setInterval: 3,
  clearTimeout: 1, clearInterval: 7, addEventListener: 0, ResizeObserver: 2,
  fetch: 0, innerHTML: 29, console: 10,
};
const A_EXPECTED_EFFECTS = {
  document: 39, window: 2, localStorage: 2, setTimeout: 8, setInterval: 3,
  clearTimeout: 2, clearInterval: 7, addEventListener: 1, ResizeObserver: 2,
  fetch: 0, innerHTML: 29, console: 10,
};

const B_JS_CONSUMERS = {
  _mcxOnCandleTick: 2, _mcxDrawRsi: 3, _regimeRefresh: 8, _mcxStopPolls: 2,
  _mcxRenderCharts: 1, _mcxStopAutoRefresh: 1, _mcxInit: 1,
};
const B_MARKUP_CONSUMERS = { _mcxRedraw: 3, _mcxRefresh: 1 };

const INDEX = APP_LOADER.loadIndexHtml();
const INLINE = APP_LOADER.loadOrderedScriptSources()
  .filter((p) => p.isAppJs && p.code != null && p.kind === 'inline')[0].code;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function lineAt(s, o) { return s.slice(0, o).split('\n').length; }
function esc(v) { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// Two of the MCX state vars are the SECOND declaration on their line
// (`var _mcxSpy4hTimer = null; var _mcxSpy4hCount = 0;`), so a line-anchored
// pattern would miss them and quietly weaken the assertion.
function declaresTopLevelVar(source, name) {
  return new RegExp('(?:^|;)\\s*var\\s+' + esc(name) + '\\s*=', 'm').test(source);
}

function shape(src) {
  return scanTopLevelDeclarations(src).map((e) => ({
    name: e.name, form: e.form, isAsync: e.isAsync, chars: e.chars,
  }));
}
function residue(src) {
  const d = scanTopLevelDeclarations(src);
  const ch = Array.from(src);
  d.forEach((e) => { for (let i = e.start; i <= e.end; i++) ch[i] = ' '; });
  return ch.join('').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
}
function loadInEmptyVm(src) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'candidate.js' });
    return { ok: true, error: null, globals: Object.keys(sandbox) };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e), globals: Object.keys(sandbox) };
  }
}

const JS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'this', 'null',
  'true', 'false', 'void', 'delete', 'throw', 'try', 'catch', 'finally', 'default', 'yield',
  'await', 'async', 'class', 'extends', 'super', 'undefined',
]);
function freeIdentifiers(source) {
  const m = maskLiterals(source);
  const declared = new Set();
  let x;
  const fr = /\bfunction\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((x = fr.exec(m))) {
    if (x[1]) declared.add(x[1]);
    x[2].split(',').map((p) => p.trim()).filter(Boolean)
      .forEach((p) => declared.add(p.replace(/[^A-Za-z0-9_$].*$/, '')));
  }
  const dr = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((x = dr.exec(m))) declared.add(x[1]);
  const cr = /,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  while ((x = cr.exec(m))) declared.add(x[1]);
  const kr = /\bcatch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((x = kr.exec(m))) declared.add(x[1]);
  const free = new Set();
  const ir = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b\s*(:?)/g;
  while ((x = ir.exec(m))) {
    if (x[1] === '.') continue;
    const n = x[2];
    if (JS_KEYWORDS.has(n) || declared.has(n)) continue;
    if (x[3] === ':' && /[{,]\s*$/.test(m.slice(Math.max(0, x.index - 40), x.index))) continue;
    free.add(n);
  }
  return Array.from(free).sort();
}
function effects(src) {
  const m = maskLiterals(src);
  const p = {
    document: /\bdocument\s*\./g, window: /\bwindow\s*\./g, localStorage: /\blocalStorage\s*\./g,
    setTimeout: /\bsetTimeout\s*\(/g, setInterval: /\bsetInterval\s*\(/g,
    clearTimeout: /\bclearTimeout\s*\(/g, clearInterval: /\bclearInterval\s*\(/g,
    addEventListener: /\baddEventListener\s*\(/g, ResizeObserver: /\bResizeObserver\b/g,
    fetch: /\bfetch\s*\(/g, innerHTML: /\.innerHTML\s*=/g, console: /\bconsole\s*\./g,
  };
  return Object.fromEntries(Object.entries(p).map(([k, r]) => [k, (m.match(r) || []).length]));
}

console.log('MCX CHARTS / LIFECYCLE — TEMPORARY PRE-IMPLEMENTATION AUDIT');
console.log('candidates: A (rejected) · B (rejected) · C (recommended)');
console.log('base=' + BASE_SHA);

section('1. Pinned base identity');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_SHA, 'merged #406 base commit resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_TREE, 'merged #406 base tree resolves exactly');
eq(execFileSync('git', ['log', '-1', '--format=%s', BASE_SHA], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_SUBJECT, 'merged #406 base subject is the pinned one');
eq(INDEX.length, INDEX_CHARS, 'index UTF-16 length is the post-#406 value');
eq(Buffer.byteLength(INDEX, 'utf8'), INDEX_UTF8, 'index UTF-8 byte length is the post-#406 value');
eq(sha256(INDEX), INDEX_SHA256, 'index SHA-256 is the post-#406 value');
eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src)).length,
  LOCAL_SCRIPTS, 'index carries exactly 53 local application scripts');

section('2. The MCX section is uniquely locatable');
eq(count(INDEX, MCX_BANNER), 1, 'the MCX banner appears exactly once');
eq(count(INDEX, EIC_BANNER), 1, 'the EIC banner appears exactly once');
eq(count(INDEX, LIVE_MARKER), 1, 'the intrabar live-update marker appears exactly once');
const aStart = INDEX.indexOf(MCX_BANNER);
const aEnd = INDEX.indexOf(EIC_BANNER, aStart);
const bStart = INDEX.indexOf(LIVE_MARKER);
eq(aStart, A_START, 'MCX section starts at the pinned offset');
eq(aEnd, A_END, 'MCX section ends at the pinned offset, where the EIC banner begins');
eq(bStart, B_START, 'the declarations-only tail starts at the pinned offset');
eq(lineAt(INDEX, aStart), A_START_LINE, 'MCX section starts on line 33042');
eq(lineAt(INDEX, aEnd), A_END_LINE, 'MCX section ends at the line-33911 boundary');
eq(lineAt(INDEX, bStart), B_START_LINE, 'the tail starts on line 33065');
ok(aStart < bStart && bStart < aEnd, 'the tail is strictly inside the MCX section');

const A_RANGE = INDEX.slice(aStart, aEnd);
const A_MODULE = A_RANGE.slice(0, -SEPARATOR.length);
const B_RANGE = INDEX.slice(bStart, aEnd);
const B_MODULE = B_RANGE.slice(0, -SEPARATOR.length);

section('3. CANDIDATE A — the whole MCX section, and why it is load-bearing');
eq(A_RANGE.length, A_RANGE_CHARS, 'candidate A range UTF-16 length');
eq(Buffer.byteLength(A_RANGE, 'utf8'), A_RANGE_UTF8, 'candidate A range UTF-8 byte length');
eq(count(A_RANGE, '\n'), A_RANGE_LF, 'candidate A range LF count');
eq(sha256(A_RANGE), A_RANGE_SHA256, 'candidate A range SHA-256');
eq(A_MODULE.length, A_MODULE_CHARS, 'candidate A module UTF-16 length (range minus separator)');
eq(sha256(A_MODULE), A_MODULE_SHA256, 'candidate A module SHA-256');
eq(shape(A_MODULE).length, A_OWNERS, 'candidate A owns 52 top-level declarations');
eq(shape(A_MODULE)[0].name, '_mcxOverlay', 'candidate A opens on the _mcxOverlay state root');
eq(shape(A_MODULE)[A_OWNERS - 1].name, '_mcxInit', 'candidate A closes on _mcxInit');
// THE FINDING.
const aResidue = residue(A_MODULE);
ok(aResidue !== '', 'candidate A is NOT declarations-only: it carries executable top-level code');
ok(aResidue.indexOf("window.addEventListener('resize'") === 0,
  'the residue is exactly the MCX resize listener #406 kept inline');
eq(A_MODULE.indexOf("window.addEventListener('resize'"), A_LISTENER_AT,
  'the listener sits at the pinned offset, 1.8% into the section');
eq(effects(A_MODULE).addEventListener, 1, 'candidate A registers exactly one listener at load time');
const aLoad = loadInEmptyVm(A_MODULE);
ok(!aLoad.ok, 'candidate A does NOT evaluate before its dependencies exist');
ok(/window is not defined/.test(aLoad.error),
  'it fails on `window` at evaluation time: ' + aLoad.error);
ok(freeIdentifiers(A_MODULE).indexOf('_activeView') >= 0,
  'the listener also reads _activeView, a global owned by the inline monolith');

section('4. CANDIDATE B — the declarations-only tail');
eq(B_RANGE.length, B_RANGE_CHARS, 'candidate B range UTF-16 length');
eq(Buffer.byteLength(B_RANGE, 'utf8'), B_RANGE_UTF8, 'candidate B range UTF-8 byte length');
eq(count(B_RANGE, '\n'), B_RANGE_LF, 'candidate B range LF count');
eq(sha256(B_RANGE), B_RANGE_SHA256, 'candidate B range SHA-256');
eq(B_MODULE.length, B_MODULE_CHARS, 'candidate B module UTF-16 length');
eq(Buffer.byteLength(B_MODULE, 'utf8'), B_MODULE_UTF8, 'candidate B module UTF-8 byte length');
eq(count(B_MODULE, '\n'), B_MODULE_LF, 'candidate B module LF count');
eq(sha256(B_MODULE), B_MODULE_SHA256, 'candidate B module SHA-256');
ok(B_MODULE.endsWith('}\n'), 'candidate B module ends on a real line of code, newline-terminated');
ok(!B_MODULE.endsWith('\n\n'), 'candidate B module has no blank line at EOF (git diff --check clean)');
eq(B_RANGE.slice(-1), SEPARATOR, 'the last character of the B range is the structural separator');
const bShape = shape(B_MODULE);
eq(bShape.length, B_OWNERS, 'candidate B owns exactly 38 top-level declarations');
eq(bShape.filter((e) => e.form === 'function').length, 33, '…33 function declarations');
eq(bShape.filter((e) => e.form === 'var').length, 5, '…and 5 var declarations');
eq(bShape.filter((e) => e.isAsync).length, 1, 'exactly one async owner');
eq(bShape.filter((e) => e.isAsync)[0].name, '_mcxRenderCharts', '…_mcxRenderCharts');
eq(bShape.reduce((a, e) => a + e.chars, 0), B_DECL_CHARS, 'declaration chars total exactly');
eq(bShape[0].name, '_mcxOnCandleTick', 'candidate B opens on _mcxOnCandleTick');
eq(bShape[B_OWNERS - 1].name, '_mcxInit', 'candidate B closes on _mcxInit');
eq(residue(B_MODULE), '', 'candidate B IS declarations-only: zero executable top-level residue');
eq(effects(B_MODULE).addEventListener, 0, 'candidate B registers no listener at load time');
const bLoad = loadInEmptyVm(B_MODULE);
ok(bLoad.ok, 'candidate B evaluates in a completely empty VM: ' + bLoad.error);
eq(bLoad.globals.length, B_OWNERS, 'evaluation defines exactly the 38 owners and nothing else');
eq(bLoad.globals.slice().sort(), bShape.map((e) => e.name).sort(),
  'the globals it defines are exactly its declared owners');

section('5. Candidate B dependency surface — the real cost of this cut');
const bDeps = freeIdentifiers(B_MODULE);
eq(bDeps, B_EXPECTED_DEPENDENCIES, 'candidate B free dependency inventory is exact');
eq(bDeps.length, 57, 'candidate B needs 57 call-time globals');
ok(bDeps.length > 11,
  'for scale: the #406 macro-check owner needed 11 — this surface is five times wider');
const stillInline = RETAINED_STATE_VARS.filter((n) => bDeps.indexOf(n) >= 0);
eq(stillInline.sort(), [
  '_mcxAutoRefreshTimer', '_mcxBackendFetchInFlight', '_mcxLiveCache', '_mcxLiveThrottle',
  '_mcxOverlay', '_mcxRefreshBusy', '_mcxResizeObs', '_mcxSpy4hCount', '_mcxSpy4hTimer',
  '_mcxSpySqzCache', '_mcxSqzState', '_mcxVi3m4hCount', '_mcxVi3m4hTimer',
].sort(), 'candidate B reads 13 MCX state variables that would stay inline');
ok(stillInline.every((n) => declaresTopLevelVar(INDEX, n)),
  'each of those is still declared inline as a top-level var');
eq(stillInline.filter((n) => /^\s*var\s/m.test('') || !new RegExp('^\\s*var\\s+' + esc(n), 'm').test(INDEX)).sort(),
  ['_mcxSpy4hCount', '_mcxVi3m4hCount'],
  'two of them are the second declaration on their line — a line-anchored check would miss them');
eq(effects(B_MODULE), B_EXPECTED_EFFECTS, 'candidate B measured effects are exact');
eq(effects(A_MODULE), A_EXPECTED_EFFECTS, 'candidate A measured effects are exact');
// The gap between the two candidates is the listener body and nothing else.
eq(Object.fromEntries(Object.entries(A_EXPECTED_EFFECTS)
  .filter(([k, v]) => v !== B_EXPECTED_EFFECTS[k])
  .map(([k, v]) => [k, v - B_EXPECTED_EFFECTS[k]])),
  { window: 1, setTimeout: 1, clearTimeout: 1, addEventListener: 1 },
  'A minus B is exactly the resize listener: one addEventListener, one window read, ' +
  'one setTimeout and one clearTimeout — no other effect differs');

section('6. Candidate B consumers');
const outside = INLINE.replace(B_MODULE, '');
const maskedOutside = maskLiterals(outside);
const owners = bShape.map((e) => e.name);
const jsConsumers = {};
owners.forEach((n) => {
  const c = (maskedOutside.match(
    new RegExp('(?:^|[^A-Za-z0-9_$.])' + esc(n) + '(?![A-Za-z0-9_$])', 'gm')) || []).length;
  if (c) jsConsumers[n] = c;
});
eq(jsConsumers, B_JS_CONSUMERS, 'inline-JS consumers of candidate B owners are exact');
eq(Object.values(jsConsumers).reduce((a, b) => a + b, 0), 18, '18 inline-JS references in total');
const markup = INDEX.replace(/<script[\s\S]*?<\/script>/g, '');
const markupConsumers = {};
owners.forEach((n) => {
  const c = (markup.match(new RegExp(esc(n) + '\\s*\\(', 'g')) || []).length;
  if (c) markupConsumers[n] = c;
});
eq(markupConsumers, B_MARKUP_CONSUMERS, 'inline-markup handler consumers are exact');
ok(owners.indexOf('_mcxRedraw') >= 0 && owners.indexOf('_mcxRefresh') >= 0,
  'both markup handlers are owned by candidate B, so they must stay classic globals');

section('7. Predicted post-extraction index for candidate B');
const withoutB = INDEX.slice(0, bStart) + INDEX.slice(aEnd);
eq(count(withoutB, ANCHOR_TAG), 1, 'the macro-check tag is the unique anchor for the new tag');
const predicted = withoutB.replace(ANCHOR_TAG, ANCHOR_TAG + PROPOSED_TAG);
eq(predicted.length, B_PREDICTED_INDEX_CHARS, 'predicted index UTF-16 length');
eq(Buffer.byteLength(predicted, 'utf8'), B_PREDICTED_INDEX_UTF8, 'predicted index UTF-8 byte length');
eq(sha256(predicted), B_PREDICTED_INDEX_SHA256, 'predicted index SHA-256');
eq(APP_LOADER.parseScriptTags(predicted).filter((t) => t.src && /^\.\//.test(t.src)).length,
  B_PREDICTED_TAGS, 'predicted local application script count is 54');
// Reversibility, in the exact shape the #406 undo helper uses: drop the tag
// first — which restores every offset before the slice — then re-insert the
// module plus the one separator character at the pinned offset.
const withoutTag = predicted.replace(PROPOSED_TAG, '');
eq(withoutTag, withoutB, 'removing the new tag restores the tag-free document exactly');
eq(withoutTag.slice(0, bStart) + B_MODULE + SEPARATOR + withoutTag.slice(bStart), INDEX,
  'the transform is reversible: module + separator reconstructs this base byte-for-byte');
ok(withoutTag.slice(0, bStart) + B_MODULE + withoutTag.slice(bStart) !== INDEX,
  'without the separator it does NOT reconstruct — the separator is load-bearing here too');

section('8. What candidate B would leave inline');
ok(count(withoutB, MCX_BANNER) === 1, 'the MCX banner stays inline');
RETAINED_STATE_VARS.forEach((n) => {
  ok(declaresTopLevelVar(withoutB, n), n + ' stays inline');
});
ok(withoutB.indexOf("window.addEventListener('resize'") >= 0, 'the MCX resize listener stays inline');
ok(count(withoutB, 'window.apexImportJournalTradesJson = apexImportJournalTradesJson;') === 1,
  'the Journal manual-import exposure glue is untouched, as always');
ok(count(withoutB, '<script src="./js/ui/mcx-macro-check.js"></script>') === 1,
  'the #406 macro-check owner is untouched');

section('9. Negative controls — the measurements are not vacuous');
ok(residue(A_MODULE) !== residue(B_MODULE),
  'the two candidates genuinely differ in load-time behavior');
ok(loadInEmptyVm(A_MODULE).ok !== loadInEmptyVm(B_MODULE).ok,
  'only one of the two candidates evaluates before its dependencies exist');
ok(sha256(A_MODULE) !== sha256(B_MODULE), 'the two candidates are different byte sequences');
ok(A_MODULE.length - B_MODULE.length === 1001,
  'candidate A is exactly 1001 characters larger — the banner, 14 state vars and the listener');
ok(!loadInEmptyVm(B_MODULE + "\nwindow.addEventListener('resize', function(){});\n").ok === false
   || residue(B_MODULE + "\nwindow.addEventListener('resize', function(){});\n") !== '',
  'adding a listener back to candidate B is detected as top-level residue');
ok(residue(B_MODULE + '\n_mcxInit();\n') !== '', 'a top-level invocation mutant is detected');
ok(shape(B_MODULE.replace('function _mcxRedraw', 'function _mcxRedrawV2')).map((e) => e.name)
  .indexOf('_mcxRedraw') < 0, 'a renamed-owner mutant is detected by the manifest');

section('10. This audit changes no production byte');
const changed = execFileSync('git', ['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'], {
  cwd: ROOT, encoding: 'utf8',
}).trim().split(/\r?\n/).filter(Boolean);
const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
  cwd: ROOT, encoding: 'utf8',
}).split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const all = Array.from(new Set(changed.concat(status))).sort();
eq(all.filter((r) => r === 'index.html' || r.startsWith('js/')), [],
  'ZERO production files changed: this is a measurement, not a relocation');
ok(all.every((r) => r.startsWith('tests/')), 'every changed path is a test artifact');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/mcx-charts.js')),
  'the proposed module does not exist yet');

section('11. CANDIDATE C — the owner-cohesive split (RECOMMENDED)');
// Every fragment is re-derived from the live blob and checked against its pin.
// A single drifted byte fails here rather than downstream.
const cSlices = {};
C_FRAGMENTS.forEach((f) => {
  const text = INDEX.slice(f.start, f.end);
  cSlices[f.name] = text;
  eq(text.length, f.chars, 'fragment ' + f.name + ' has its pinned UTF-16 length');
  eq(sha256(text), f.sha256, 'fragment ' + f.name + ' has its pinned SHA-256');
});
eq(INDEX.slice(C_SEPARATOR_AT, C_SEPARATOR_AT + 1), SEPARATOR,
  'fragment 6 is exactly one LF: the structural separator');
// The six fragments tile the MCX section with no gap and no overlap.
eq(C_FRAGMENTS[0].start, A_START, 'the fragments start where the MCX section starts');
eq(C_SEPARATOR_AT + 1, A_END, 'the separator ends where the EIC banner begins');
C_FRAGMENTS.slice(1).forEach((f, i) => {
  eq(f.start, C_FRAGMENTS[i].end, 'fragment ' + f.name + ' begins exactly where the previous ends');
});
eq(C_FRAGMENTS[C_FRAGMENTS.length - 1].end, C_SEPARATOR_AT,
  'the last moved fragment ends exactly at the separator');
eq(C_FRAGMENTS.reduce((a, f) => a + f.chars, 0) + 1, A_RANGE_CHARS,
  'the six fragments account for every character of the MCX section');

const C_MODULE = C_FRAGMENTS.filter((f) => f.moved).map((f) => cSlices[f.name]).join('');
const C_GLUE = C_FRAGMENTS.filter((f) => !f.moved).map((f) => cSlices[f.name]).join('');
eq(C_MODULE.length, C_MODULE_CHARS, 'candidate C module UTF-16 length');
eq(Buffer.byteLength(C_MODULE, 'utf8'), C_MODULE_UTF8, 'candidate C module UTF-8 byte length');
eq(count(C_MODULE, '\n'), C_MODULE_LF, 'candidate C module LF count');
eq(sha256(C_MODULE), C_MODULE_SHA256, 'candidate C module SHA-256');
eq(C_WEAVE_1, C_FRAGMENTS[0].chars, 'first weave point is the length of fragment 1');
eq(C_WEAVE_2, C_FRAGMENTS[0].chars + C_FRAGMENTS[2].chars,
  'second weave point is fragments 1 + 3');

const cShape = shape(C_MODULE);
eq(cShape.length, C_OWNERS, 'candidate C owns exactly 51 top-level declarations');
eq(cShape[0].name, '_mcxOverlay', 'candidate C opens on _mcxOverlay');
eq(cShape[C_OWNERS - 1].name, '_mcxInit', 'candidate C closes on _mcxInit');
eq(residue(C_MODULE), '', 'candidate C is declarations-only: zero executable top-level residue');
eq(effects(C_MODULE).addEventListener, 0, 'candidate C registers no listener at load time');
const cLoad = loadInEmptyVm(C_MODULE);
ok(cLoad.ok, 'candidate C evaluates in a completely empty VM: ' + cLoad.error);
eq(cLoad.globals.length, C_OWNERS, 'evaluation defines exactly the 51 owners and nothing else');
eq(cLoad.globals.slice().sort(), cShape.map((e) => e.name).sort(),
  'the globals it defines are exactly its declared owners');

section('12. Candidate C keeps mutable MCX state on ONE side of the boundary');
const cDeps = freeIdentifiers(C_MODULE);
eq(cDeps, C_EXPECTED_DEPENDENCIES, 'candidate C free dependency inventory is exact');
eq(cDeps.length, C_DEPENDENCIES, 'candidate C needs exactly 44 call-time globals');
MCX_STATE_OWNERS.forEach((n) => {
  ok(cShape.some((e) => e.name === n), n + ' is OWNED by candidate C, not read across the boundary');
  eq(cDeps.indexOf(n), -1, n + ' is no longer a free dependency');
});
eq(MCX_STATE_OWNERS.filter((n) => cDeps.indexOf(n) >= 0), [],
  'NONE of the 13 MCX state variables remains a cross-boundary read');
// This is the whole point of C over B: B read 13 of them from inline.
eq(B_EXPECTED_DEPENDENCIES.filter((n) => MCX_STATE_OWNERS.indexOf(n) >= 0).length, 13,
  'for contrast: candidate B read 13 of them across the boundary');
eq(bDeps.length - cDeps.length, 13,
  'C is exactly 13 dependencies narrower than B — the state it absorbed');

section('13. The retained glue: listener-private state stays with its listener');
eq(C_GLUE.length, C_GLUE_CHARS, 'retained glue UTF-16 length');
eq(Buffer.byteLength(C_GLUE, 'utf8'), C_GLUE_UTF8, 'retained glue UTF-8 byte length');
eq(count(C_GLUE, '\n'), C_GLUE_LF, 'retained glue LF count');
eq(sha256(C_GLUE), C_GLUE_SHA256, 'retained glue SHA-256');
ok(/^var\s+_mcxResizeTimer\s+=\s+null;\n/.test(C_GLUE),
  'the glue opens on the _mcxResizeTimer declaration');
ok(C_GLUE.indexOf("window.addEventListener('resize', function(){") > 0,
  'the glue carries the resize listener, unwrapped and unrenamed');
eq(count(INDEX, 'var _mcxResizeTimer'), 1, '_mcxResizeTimer is declared exactly once');
const timerRefsAll = (maskLiterals(INDEX)
  .match(/(?:^|[^A-Za-z0-9_$.])_mcxResizeTimer(?![A-Za-z0-9_$])/gm) || []).length;
const timerRefsGlue = (maskLiterals(C_GLUE)
  .match(/(?:^|[^A-Za-z0-9_$.])_mcxResizeTimer(?![A-Za-z0-9_$])/gm) || []).length;
eq(timerRefsGlue, 3, 'the glue holds all three _mcxResizeTimer references');
eq(timerRefsAll, timerRefsGlue,
  '_mcxResizeTimer is referenced ONLY inside the retained glue — it is listener-private');
eq(count(C_MODULE, '_mcxResizeTimer'), 0,
  'the module neither declares nor references _mcxResizeTimer, not even in a comment');
ok(C_GLUE.indexOf('_mcxRenderCharts') > 0,
  'the listener still calls the classic global _mcxRenderCharts across the boundary');
eq(cShape.filter((e) => e.name === '_mcxRenderCharts').length, 1,
  '…which candidate C owns and exposes as a classic global');
// No other mutable MCX state is left behind.
const retainedAfter = INDEX.slice(0, A_START) + C_GLUE + INDEX.slice(A_END);
MCX_STATE_OWNERS.forEach((n) => {
  ok(!declaresTopLevelVar(retainedAfter, n), n + ' no longer stays inline under candidate C');
});
eq(shape(C_GLUE).map((e) => e.name), ['_mcxResizeTimer'],
  'the retained glue declares exactly one thing: the listener-private timer');

section('14. Candidate C forward transform and byte-exact reverse reconstruction');
const cKept = INDEX.slice(0, A_START) + C_GLUE + INDEX.slice(A_END);
eq(count(cKept, ANCHOR_TAG), 1, 'the macro-check tag is the unique anchor for the new tag');
const cPredicted = cKept.replace(ANCHOR_TAG, ANCHOR_TAG + PROPOSED_TAG);
eq(cPredicted.length, C_PREDICTED_INDEX_CHARS, 'predicted index UTF-16 length');
eq(Buffer.byteLength(cPredicted, 'utf8'), C_PREDICTED_INDEX_UTF8, 'predicted index UTF-8 byte length');
eq(count(cPredicted, '\n'), C_PREDICTED_INDEX_LF, 'predicted index LF count');
eq(sha256(cPredicted), C_PREDICTED_INDEX_SHA256, 'predicted index SHA-256');
eq(APP_LOADER.parseScriptTags(cPredicted).filter((t) => t.src && /^\.\//.test(t.src)).length,
  C_PREDICTED_TAGS, 'predicted local application script count is 54');
eq(count(cPredicted, ANCHOR_TAG + PROPOSED_TAG), 1,
  'the new tag sits immediately after mcx-macro-check.js');

// REVERSE. Drop the tag, then weave the module fragments back around the two
// retained fragments and restore the separator.
function weave(html, moduleSource, glue) {
  const untagged = html.replace(PROPOSED_TAG, '');
  const head = untagged.slice(0, A_START);
  const tail = untagged.slice(A_START + glue.length);
  return head
    + moduleSource.slice(0, C_WEAVE_1)
    + cSlices.retainedTimerDecl
    + moduleSource.slice(C_WEAVE_1, C_WEAVE_2)
    + cSlices.retainedListener
    + moduleSource.slice(C_WEAVE_2)
    + SEPARATOR
    + tail;
}
eq(cPredicted.replace(PROPOSED_TAG, ''), cKept, 'removing the new tag restores the tag-free document');
eq(weave(cPredicted, C_MODULE, C_GLUE), INDEX,
  'interleaving module fragments with the retained glue reconstructs this base byte-for-byte');
eq(sha256(weave(cPredicted, C_MODULE, C_GLUE)), INDEX_SHA256,
  'the reconstruction hashes to the pinned base SHA-256');

section('15. Candidate C negative controls');
// Absorbed listener.
ok(residue(C_MODULE + '\n' + cSlices.retainedListener) !== '',
  'a module that absorbed the listener is detected as top-level residue');
ok(!loadInEmptyVm(C_MODULE + '\n' + cSlices.retainedListener).ok,
  '…and stops evaluating in an empty VM');
// Absorbed timer.
const absorbedTimer = cSlices.retainedTimerDecl + C_MODULE;
ok(shape(absorbedTimer).some((e) => e.name === '_mcxResizeTimer'),
  'a module that absorbed the timer declaration is detected by the manifest');
ok(shape(absorbedTimer).length !== C_OWNERS, '…and its owner count no longer matches');
// Missing separator.
const untagged = cPredicted.replace(PROPOSED_TAG, '');
const noSeparator = untagged.slice(0, A_START)
  + C_MODULE.slice(0, C_WEAVE_1) + cSlices.retainedTimerDecl
  + C_MODULE.slice(C_WEAVE_1, C_WEAVE_2) + cSlices.retainedListener
  + C_MODULE.slice(C_WEAVE_2) + untagged.slice(A_START + C_GLUE.length);
ok(noSeparator !== INDEX, 'dropping the separator does NOT reconstruct — it is load-bearing');
eq(INDEX.length - noSeparator.length, 1, '…and it is short by exactly the one separator character');
// Renamed owner.
ok(shape(C_MODULE.replace('function _mcxInit', 'function _mcxInitV2'))
  .map((e) => e.name).indexOf('_mcxInit') < 0, 'a renamed owner is detected by the manifest');
// Altered fragment order.
const swapped = cSlices.movedPrefix2 + cSlices.movedPrefix1 + cSlices.movedTail;
ok(sha256(swapped) !== C_MODULE_SHA256, 'reordering the moved fragments changes the module hash');
ok(shape(swapped)[0].name !== '_mcxOverlay', '…and the manifest no longer opens on _mcxOverlay');
ok(weave(cPredicted, swapped, C_GLUE) !== INDEX, '…and reconstruction from it fails');
// The recommendation is not vacuous: C differs from both A and B.
ok(sha256(C_MODULE) !== sha256(A_MODULE) && sha256(C_MODULE) !== sha256(B_MODULE),
  'candidate C is a distinct byte sequence from both A and B');
eq([A_OWNERS, B_OWNERS, C_OWNERS], [52, 38, 51], 'the three candidates own 52, 38 and 51 declarations');

const report = {
  base: { commit: BASE_SHA, tree: BASE_TREE, subject: BASE_SUBJECT,
          indexChars: INDEX.length, indexSha256: sha256(INDEX), localScripts: LOCAL_SCRIPTS },
  finding: 'the MCX section carries a top-level window resize listener at offset ' + A_LISTENER_AT +
           ', so the natural whole-section cut is NOT declarations-only',
  candidateA: {
    label: 'whole MCX section',
    range: [A_START, A_END], startLine: A_START_LINE, endLine: A_END_LINE,
    rangeChars: A_RANGE.length, rangeSha256: sha256(A_RANGE),
    moduleChars: A_MODULE.length, moduleSha256: sha256(A_MODULE),
    owners: A_OWNERS,
    declarationsOnly: false,
    evaluatesBeforeDependencies: false,
    loadTimeEffects: ['window.addEventListener("resize", ...)'],
    verdict: 'breaks the load-time-inertness invariant every prior owner in this series holds',
  },
  candidateB: {
    label: 'declarations-only tail',
    range: [B_START, B_END], startLine: B_START_LINE, endLine: B_END_LINE,
    rangeChars: B_RANGE.length, rangeSha256: sha256(B_RANGE),
    moduleChars: B_MODULE.length, moduleUtf8: Buffer.byteLength(B_MODULE, 'utf8'),
    moduleLf: count(B_MODULE, '\n'), moduleSha256: sha256(B_MODULE),
    owners: B_OWNERS, declarationChars: B_DECL_CHARS,
    declarationsOnly: true,
    evaluatesBeforeDependencies: true,
    freeDependencies: bDeps.length,
    retainedStateVarsRead: stillInline.length,
    jsConsumers: jsConsumers, markupConsumers: markupConsumers,
    predictedIndexChars: B_PREDICTED_INDEX_CHARS,
    predictedIndexSha256: B_PREDICTED_INDEX_SHA256,
    predictedLocalScripts: B_PREDICTED_TAGS,
    verdict: 'preserves the invariant, at the cost of a 57-name dependency surface and 13 ' +
             'MCX state variables left behind inline',
  },
  candidateC: {
    label: 'owner-cohesive split (RECOMMENDED)',
    fragments: C_FRAGMENTS.map((f) => ({
      name: f.name, moved: f.moved, range: [f.start, f.end], chars: f.chars, sha256: f.sha256,
    })),
    separatorAt: C_SEPARATOR_AT,
    moduleChars: C_MODULE.length, moduleUtf8: Buffer.byteLength(C_MODULE, 'utf8'),
    moduleLf: count(C_MODULE, '\n'), moduleSha256: sha256(C_MODULE),
    owners: C_OWNERS, firstOwner: cShape[0].name, lastOwner: cShape[C_OWNERS - 1].name,
    declarationsOnly: true,
    evaluatesBeforeDependencies: true,
    freeDependencies: cDeps.length,
    mcxStateOwnedByModule: MCX_STATE_OWNERS.length,
    mcxStateReadAcrossBoundary: 0,
    retainedGlue: {
      chars: C_GLUE.length, utf8: Buffer.byteLength(C_GLUE, 'utf8'),
      lf: count(C_GLUE, '\n'), sha256: sha256(C_GLUE),
      declares: ['_mcxResizeTimer'],
      rationale: '_mcxResizeTimer is listener-private: declared once, referenced only by this ' +
                 'listener. Moving it would create a cross-boundary mutable-state write.',
    },
    weavePoints: [C_WEAVE_1, C_WEAVE_2],
    predictedIndexChars: C_PREDICTED_INDEX_CHARS,
    predictedIndexUtf8: C_PREDICTED_INDEX_UTF8,
    predictedIndexLf: C_PREDICTED_INDEX_LF,
    predictedIndexSha256: C_PREDICTED_INDEX_SHA256,
    predictedLocalScripts: C_PREDICTED_TAGS,
    verdict: 'load-time inert like B, but 13 dependencies narrower: all module-owned MCX state ' +
             'moves with the module, and only listener-private state stays inline',
  },
  recommendation: 'C',
  rejections: {
    A: 'registers a listener at module load and violates the load-time-inertness invariant',
    B: 'leaves 13 mutable MCX state variables inline while the extracted module reads and ' +
       'writes them',
  },
  productionChanged: [],
};

console.log('\nMCX_CHARTS_AUDIT_BEGIN');
console.log(JSON.stringify(report, null, 2));
console.log('MCX_CHARTS_AUDIT_END');
console.log('\n' + pass + ' assertions passed');
console.log('MCX_CHARTS_AUDIT_OK');
