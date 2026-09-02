'use strict';

// Permanent boundary contract for the MCX charts / lifecycle owner.
//
// It replaces the temporary pre-implementation audit (#407) and proves,
// permanently: byte identity against the merged #407 base; the owner-cohesive
// CANDIDATE C cut, which is NOT one contiguous slice but a six-fragment tiling
// of the MCX section — three fragments moved, two retained inline, one
// structural separator LF removed; the byte identity of every fragment and of
// the module they concatenate to; a complete ordered 51-owner manifest with
// declaration form, async status and measured size; declarations-only residue
// and load-time inertness in a completely empty VM; the exact 44-name free
// dependency inventory; that all 13 mutable MCX state owners moved WITH the
// functions that read and write them, so no MCX state is read across the
// boundary; the retained inline glue and its ownership of _mcxResizeTimer; the
// exact JavaScript and inline-markup consumers; a single synchronous src-only
// classic tag loaded immediately after the MCX macro-check owner and
// immediately before the inline monolith; the predicted index identity and
// 54-script count; a byte-exact forward transform and reverse WEAVE
// reconstruction of #407; a set of mutation-sensitive negative controls; and
// the exact production scope of the relocation.
//
// THE FINDING THIS CUT IS BUILT AROUND. The whole "MARKET CONTEXT AGENT (MCX)"
// section is not declarations-only: 825 characters in, between the state
// variables and _mcxOnCandleTick, sits a top-level
//
//     window.addEventListener('resize', function(){ ... });
//
// A module carrying it would perform a load-time side effect and would NOT
// evaluate before its dependencies exist. Candidate C therefore keeps the
// listener — and only the timer variable that is private to it — inline, and
// moves everything else, state included.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '08adbc22cb90c19ae7942428785edde3db7461b5';
const BASE_TREE = 'a219c0fae19afbefbd439df52695c6737ad3d64c';
const BASE_SUBJECT = 'test(audit): measure MCX charts lifecycle boundary (A / B / C) (#407)';
const AUDIT_REL = 'tests/temporary-mcx-charts-audit.test.js';
const MODULE_REL = 'js/ui/mcx-charts.js';
const MODULE_SRC = './js/ui/mcx-charts.js';
const MODULE_TAG = '<script src="./js/ui/mcx-charts.js"></script>';
const CONTRACT_REL = 'tests/mcx-charts-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/mcx-charts-undo.js';
const MACRO_CHECK_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>';
const BACKUP_RESTORE_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

// ── The base document ───────────────────────────────────────────────────────
const BASE_CHARS = 1928890;
const BASE_UTF8 = 1964320;
const BASE_LF = 33958;
const BASE_INDEX_SHA256 = '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96';
const BASE_LOCAL_SCRIPTS = 53;

// ── The shipped document ────────────────────────────────────────────────────
const INDEX_CHARS = 1884429;
const INDEX_UTF8 = 1918599;
const INDEX_LF = 33097;
const INDEX_SHA256 = 'b5f6dd5b2fad6e1d3e0ce3fee4abf5cfb561c19de714e20f86874e49e10a857e';
const LOCAL_SCRIPT_COUNT = 54;

// ── The six fragments, in base coordinates. Half-open UTF-16 ranges. ────────
// Three move, two stay, one is the structural separator that is deleted.
const BAR = '// ' + '═'.repeat(62);
const MCX_BANNER = BAR + '\n// MARKET CONTEXT AGENT (MCX)\n' + BAR + '\n\n';
const EIC_BANNER = BAR + '\n// EARNINGS IRON CONDOR AGENT (EIC)\n';
const SECTION_AT = 1882013;
const SECTION_END = 1926729;
const SECTION_CHARS = 44716;
const SECTION_START_LINE = 33042;
const SECTION_END_LINE = 33911;
const SEPARATOR = '\n';
const SEPARATOR_AT = 1926728;
const FRAGMENTS = [
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
// The listener sits 825 characters into the section: the finding that made a
// whole-section cut impossible without breaking load-time inertness.
const LISTENER_OFFSET_IN_SECTION = 825;

// ── The module ──────────────────────────────────────────────────────────────
const MODULE_CHARS = 44506;
const MODULE_UTF8 = 45766;
const MODULE_LF = 861;
const MODULE_SHA256 = '7337dba0ea08e5850899b539471003d4d7aa5dcb67006e0a3b49f187a1a98daa';
const OWNER_COUNT = 51;
const DECLARATION_CHARS = 41010;
// Weave points INSIDE the module: 226 = |fragment 1|, 792 = |fragment 1| + |3|.
const WEAVE_1 = 226;
const WEAVE_2 = 792;

// ── The retained inline glue ────────────────────────────────────────────────
const GLUE_CHARS = 209;
const GLUE_UTF8 = 209;
const GLUE_LF = 7;
const GLUE_SHA256 = 'bca3dcbe07f48d7dfa0b640eb81bd6fa30bf8a035b324c354ab47e6c580eed62';
const GLUE_TEXT =
  'var _mcxResizeTimer      = null;\n' +
  "window.addEventListener('resize', function(){\n" +
  "  if (_activeView !== 'mcx') return;\n" +
  '  clearTimeout(_mcxResizeTimer);\n' +
  '  _mcxResizeTimer = setTimeout(_mcxRenderCharts, 160);\n' +
  '});\n' +
  '\n';

const EXPECTED_SHAPE = [
  { name: '_mcxOverlay', form: 'var', isAsync: false, chars: 62 },
  { name: '_mcxSqzState', form: 'var', isAsync: false, chars: 30 },
  { name: '_mcxSpy4hTimer', form: 'var', isAsync: false, chars: 32 },
  { name: '_mcxSpy4hCount', form: 'var', isAsync: false, chars: 24 },
  { name: '_mcxVi3m4hTimer', form: 'var', isAsync: false, chars: 32 },
  { name: '_mcxVi3m4hCount', form: 'var', isAsync: false, chars: 24 },
  { name: '_mcxAutoRefreshTimer', form: 'var', isAsync: false, chars: 32 },
  { name: '_mcxRefreshBusy', form: 'var', isAsync: false, chars: 33 },
  { name: '_mcxResizeObs', form: 'var', isAsync: false, chars: 32 },
  { name: '_mcxLiveCache', form: 'var', isAsync: false, chars: 30 },
  { name: '_mcxLiveThrottle', form: 'var', isAsync: false, chars: 30 },
  { name: '_mcxBackendFetchInFlight', form: 'var', isAsync: false, chars: 34 },
  { name: '_mcxSpySqzCache', form: 'var', isAsync: false, chars: 51 },
  { name: '_mcxOnCandleTick', form: 'function', isAsync: false, chars: 754 },
  { name: '_mcxLiveDrawOne', form: 'function', isAsync: false, chars: 912 },
  { name: '_mcxStopLiveUpdates', form: 'function', isAsync: false, chars: 165 },
  { name: '_mcxAttachResizeObserver', form: 'function', isAsync: false, chars: 513 },
  { name: '_mcxVi3mSym', form: 'function', isAsync: false, chars: 152 },
  { name: '_mcxTechCtx', form: 'function', isAsync: false, chars: 1016 },
  { name: '_mcxSqzToast', form: 'function', isAsync: false, chars: 1593 },
  { name: '_mcxCheckSqz', form: 'function', isAsync: false, chars: 193 },
  { name: '_mcxDrawRsi', form: 'function', isAsync: false, chars: 2440 },
  { name: '_mcxDrawOne', form: 'function', isAsync: false, chars: 1181 },
  { name: '_mcxUpdateTable', form: 'function', isAsync: false, chars: 2283 },
  { name: '_REGIME_LS_KEY', form: 'var', isAsync: false, chars: 47 },
  { name: '_regimeReadState', form: 'function', isAsync: false, chars: 126 },
  { name: '_regimeWriteState', form: 'function', isAsync: false, chars: 107 },
  { name: '_regimeDayStart', form: 'function', isAsync: false, chars: 92 },
  { name: '_regimeUpdateTransition', form: 'function', isAsync: false, chars: 550 },
  { name: '_regimeTransitionStatus', form: 'function', isAsync: false, chars: 346 },
  { name: '_regimeSections', form: 'function', isAsync: false, chars: 1005 },
  { name: '_mcxSpySqzBadgeHtml', form: 'function', isAsync: false, chars: 375 },
  { name: '_mcxRenderSpySqzBadge', form: 'function', isAsync: false, chars: 141 },
  { name: '_regimeMainKey', form: 'var', isAsync: false, chars: 24 },
  { name: '_regimeRenderMain', form: 'function', isAsync: false, chars: 1337 },
  { name: '_VIX_CTX_BADGE', form: 'var', isAsync: false, chars: 520 },
  { name: '_regimeCompactKey', form: 'var', isAsync: false, chars: 27 },
  { name: '_regimeRenderCompact', form: 'function', isAsync: false, chars: 1685 },
  { name: '_regimeTransKey', form: 'var', isAsync: false, chars: 23 },
  { name: '_regimeRenderTransition', form: 'function', isAsync: false, chars: 1529 },
  { name: '_regimeRefresh', form: 'function', isAsync: false, chars: 599 },
  { name: '_mcxSpy1dSma20Rising', form: 'function', isAsync: false, chars: 1019 },
  { name: '_mcxRenderSma20DefenseRule', form: 'function', isAsync: false, chars: 2328 },
  { name: '_mcxDrawVixCurve', form: 'function', isAsync: false, chars: 2781 },
  { name: '_mcxStopPolls', form: 'function', isAsync: false, chars: 217 },
  { name: '_mcxRenderCharts', form: 'function', isAsync: true, chars: 9971 },
  { name: '_mcxRedraw', form: 'function', isAsync: false, chars: 300 },
  { name: '_mcxRefresh', form: 'function', isAsync: false, chars: 778 },
  { name: '_mcxStartAutoRefresh', form: 'function', isAsync: false, chars: 397 },
  { name: '_mcxStopAutoRefresh', form: 'function', isAsync: false, chars: 284 },
  { name: '_mcxInit', form: 'function', isAsync: false, chars: 2754 },
];
const OWNER_NAMES = EXPECTED_SHAPE.map((entry) => entry.name);

// The 13 mutable MCX state owners. THE WHOLE POINT of candidate C over the
// declarations-only tail (candidate B) is that these move WITH the functions
// that read and write them, so none of them is read across the boundary.
const MCX_STATE_OWNERS = [
  '_mcxOverlay', '_mcxSqzState', '_mcxSpy4hTimer', '_mcxSpy4hCount', '_mcxVi3m4hTimer',
  '_mcxVi3m4hCount', '_mcxAutoRefreshTimer', '_mcxRefreshBusy', '_mcxResizeObs',
  '_mcxLiveCache', '_mcxLiveThrottle', '_mcxBackendFetchInFlight', '_mcxSpySqzCache',
];

const EXPECTED_DEPENDENCIES = [
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
const DEPENDENCY_COUNT = 44;

const EXPECTED_EFFECTS = {
  document: 39, window: 1, localStorage: 2, setTimeout: 7, setInterval: 3,
  clearTimeout: 1, clearInterval: 7, addEventListener: 0, removeEventListener: 0,
  ResizeObserver: 2, fetch: 0, innerHTML: 29, console: 10, requestAnimationFrame: 2,
};

const JS_CONSUMERS = {
  _mcxOnCandleTick: 2, _mcxDrawRsi: 3, _regimeRefresh: 8, _mcxStopPolls: 2,
  _mcxRenderCharts: 1, _mcxStopAutoRefresh: 1, _mcxInit: 1,
};
const JS_CONSUMER_TOTAL = 18;
const MARKUP_CONSUMERS = { _mcxRedraw: 3, _mcxRefresh: 1 };

const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// THE DOCUMENT THIS CONTRACT PINS is index.html as THIS extraction left it. The
// later Apex shared post-auth lifecycle owner sits on top of it, so peel that
// layer first, newest-first, and every assertion below keeps meaning exactly
// what it meant before the Apex extraction existed. The helper re-verifies its
// output by length and SHA-256, so the hop is proved rather than assumed.
const TRADE_FORMS_U = require('./lib/journal-trade-forms-undo.js');
const CLOSE_LEGS_U = require('./lib/journal-close-legs-undo.js');
const TT_RECONNECT_U = require('./lib/tt-reconnect-undo.js');
const TRADE_FORMS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-forms.js'), 'utf8');
const CLOSE_LEGS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-close-legs.js'), 'utf8');
const TT_RECONNECT_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/tt-reconnect.js'), 'utf8');
const APEX_POST_AUTH_U = require('./lib/apex-post-auth-init-undo.js');
const APEX_POST_AUTH_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/apex-post-auth-init.js'), 'utf8');
// The TT reconnect UI owner is the newest layer of all and sits on top of
// the Apex post-auth owner: peel it FIRST so the Apex undo below still sees
// the exact document it was cut against.
// The Journal Close Legs owner is the newest layer of all and sits on top of
// the TT reconnect owner: peel it FIRST so the TT reconnect undo below still
// sees the exact document it was cut against.
// The Journal trade-forms owner is a later layer than this one: peel it after
// every undo below still sees the exact document it was cut against.
// The Journal trade-detail owner is the newest layer of all: peel it FIRST so
// every undo below still sees the exact document it was cut against. Its helper
// re-verifies its own output by length and SHA-256, so the hop is proved.
const TRADE_DETAIL_U = require('./lib/journal-trade-detail-undo.js');
const TRADE_DETAIL_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-detail.js'), 'utf8');
const PRE_TRADE_DETAIL = TRADE_DETAIL_U.isApplied(LIVE_INDEX)
  ? TRADE_DETAIL_U.undoJournalTradeDetail(LIVE_INDEX, TRADE_DETAIL_MODULE)
  : LIVE_INDEX;
const PRE_TRADE_FORMS = TRADE_FORMS_U.isApplied(PRE_TRADE_DETAIL)
  ? TRADE_FORMS_U.undoJournalTradeForms(PRE_TRADE_DETAIL, TRADE_FORMS_MODULE)
  : PRE_TRADE_DETAIL;
const PRE_CLOSE_LEGS = CLOSE_LEGS_U.isApplied(PRE_TRADE_FORMS)
  ? CLOSE_LEGS_U.undoJournalCloseLegs(PRE_TRADE_FORMS, CLOSE_LEGS_MODULE)
  : PRE_TRADE_FORMS;
const PRE_TT_RECONNECT = TT_RECONNECT_U.isApplied(PRE_CLOSE_LEGS)
  ? TT_RECONNECT_U.undoTtReconnect(PRE_CLOSE_LEGS, TT_RECONNECT_MODULE)
  : PRE_CLOSE_LEGS;
const INDEX = APEX_POST_AUTH_U.isApplied(PRE_TT_RECONNECT)
  ? APEX_POST_AUTH_U.undoApexPostAuthInit(PRE_TT_RECONNECT, APEX_POST_AUTH_MODULE)
  : PRE_TT_RECONNECT;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const U = require('./lib/mcx-charts-undo.js');
const MACRO_U = require('./lib/mcx-macro-check-undo.js');
const MACRO_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-macro-check.js'), 'utf8');
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

let pass = 0;
function ok(value, message) {
  assert.ok(value, message);
  pass++;
}
function eq(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
  pass++;
}
function throws(fn, re, message) {
  assert.throws(fn, re, message);
  pass++;
}
function section(title) {
  console.log('\n' + title);
}
function sha256(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}
function countLiteral(source, needle) {
  let count = 0, at = 0;
  while ((at = source.indexOf(needle, at)) >= 0) { count++; at += needle.length; }
  return count;
}
function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function identifierCountMasked(masked, name) {
  const re = new RegExp('(?:^|[^A-Za-z0-9_$.])' + escapeRegExp(name) + '(?![A-Za-z0-9_$])', 'gm');
  return (masked.match(re) || []).length;
}
// Two of the MCX state vars are the SECOND declaration on their line
// (`var _mcxSpy4hTimer = null; var _mcxSpy4hCount = 0;`), so a line-anchored
// pattern would miss them and quietly weaken every assertion below that uses it.
function declaresTopLevelVar(source, name) {
  return new RegExp('(?:^|;)\\s*var\\s+' + escapeRegExp(name) + '\\s*=', 'm').test(source);
}
function topLevelShape(source) {
  return scanTopLevelDeclarations(source).map((entry) => ({
    name: entry.name, form: entry.form, isAsync: entry.isAsync, chars: entry.chars,
  }));
}
function topLevelResidue(source) {
  const declarations = scanTopLevelDeclarations(source);
  const chars = Array.from(source);
  declarations.forEach((entry) => {
    for (let i = entry.start; i <= entry.end; i++) chars[i] = ' ';
  });
  return chars.join('')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

const JS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof',
  'in', 'of', 'this', 'null', 'true', 'false', 'void', 'delete', 'throw',
  'try', 'catch', 'finally', 'default', 'yield', 'await', 'async', 'class',
  'extends', 'super', 'undefined',
]);

function freeIdentifiers(source) {
  const masked = maskLiterals(source);
  const declared = new Set();
  let match;
  const functionRe = /\bfunction\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((match = functionRe.exec(masked))) {
    if (match[1]) declared.add(match[1]);
    match[2].split(',').map((part) => part.trim()).filter(Boolean).forEach((param) => {
      declared.add(param.replace(/[^A-Za-z0-9_$].*$/, ''));
    });
  }
  const declarationRe = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((match = declarationRe.exec(masked))) declared.add(match[1]);
  const commaDeclarationRe = /,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  while ((match = commaDeclarationRe.exec(masked))) declared.add(match[1]);
  const catchRe = /\bcatch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((match = catchRe.exec(masked))) declared.add(match[1]);

  const free = new Set();
  const identifierRe = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b\s*(:?)/g;
  while ((match = identifierRe.exec(masked))) {
    if (match[1] === '.') continue;
    const name = match[2];
    if (JS_KEYWORDS.has(name) || declared.has(name)) continue;
    if (match[3] === ':' && /[{,]\s*$/.test(masked.slice(Math.max(0, match.index - 40), match.index))) continue;
    free.add(name);
  }
  return Array.from(free).sort();
}

function directEffects(source) {
  const masked = maskLiterals(source);
  const patterns = {
    document: /\bdocument\s*\./g,
    window: /\bwindow\s*\./g,
    localStorage: /\blocalStorage\s*\./g,
    setTimeout: /\bsetTimeout\s*\(/g,
    setInterval: /\bsetInterval\s*\(/g,
    clearTimeout: /\bclearTimeout\s*\(/g,
    clearInterval: /\bclearInterval\s*\(/g,
    addEventListener: /\baddEventListener\s*\(/g,
    removeEventListener: /\bremoveEventListener\s*\(/g,
    ResizeObserver: /\bResizeObserver\b/g,
    fetch: /\bfetch\s*\(/g,
    innerHTML: /\.innerHTML\s*=/g,
    console: /\bconsole\s*\./g,
    requestAnimationFrame: /\brequestAnimationFrame\s*\(/g,
  };
  return Object.fromEntries(Object.entries(patterns).map(([name, re]) => [
    name, (masked.match(re) || []).length,
  ]));
}

function ownerDeclarationCounts(source) {
  const masked = maskLiterals(source);
  const counts = {};
  OWNER_NAMES.forEach((name) => {
    const fn = new RegExp('(?:^|[^A-Za-z0-9_$.])(?:async\\s+)?function\\s+' + escapeRegExp(name) + '\\s*\\(', 'g');
    const va = new RegExp('(?:^|;|\\n)\\s*var\\s+' + escapeRegExp(name) + '\\s*=', 'g');
    counts[name] = (masked.match(fn) || []).length + (masked.match(va) || []).length;
  });
  return counts;
}

function loadCandidate(source) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: MODULE_REL });
    return { ok: true, error: null, globals: Object.keys(sandbox), sandbox };
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error), globals: Object.keys(sandbox), sandbox };
  }
}

// Application parts as the browser would execute them, with THIS module blanked
// so "outside the module" really means outside it.
const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    code: part.src === MODULE_SRC ? '\n' : part.code,
  }));
const OUTSIDE_APP = APP_PARTS.map((part) => part.code).join('\n');
const INLINE_PART = APP_PARTS.filter((part) => part.name === 'index.html:inline')[0];
const MARKUP = INDEX.replace(/<script[\s\S]*?<\/script>/g, '');

function jsConsumers(source) {
  const masked = maskLiterals(source);
  const found = {};
  OWNER_NAMES.forEach((name) => {
    const count = identifierCountMasked(masked, name);
    if (count) found[name] = count;
  });
  return found;
}
function markupConsumers(markup) {
  const found = {};
  OWNER_NAMES.forEach((name) => {
    const count = (markup.match(new RegExp(escapeRegExp(name) + '\\s*\\(', 'g')) || []).length;
    if (count) found[name] = count;
  });
  return found;
}

// ── Semantic gates, expressed as a violation list so mutants can be checked
// against the exact gate they are supposed to trip. ──────────────────────────
function boundaryViolations(source, outsideSource) {
  const violations = [];
  if (JSON.stringify(topLevelShape(source)) !== JSON.stringify(EXPECTED_SHAPE)) violations.push('manifest');
  if (JSON.stringify(freeIdentifiers(source)) !== JSON.stringify(EXPECTED_DEPENDENCIES)) violations.push('dependencies');
  if (topLevelResidue(source) !== '') violations.push('top-level-effect');
  const effects = directEffects(source);
  if (effects.addEventListener !== 0 || effects.removeEventListener !== 0) violations.push('listener-registration');
  if (effects.fetch !== 0) violations.push('foreign-direct-effect');
  if (source.indexOf('_mcxResizeTimer') >= 0) violations.push('timer-overreach');
  if (MCX_STATE_OWNERS.some((name) => freeIdentifiers(source).indexOf(name) >= 0)) violations.push('cross-boundary-state');
  const later = ownerDeclarationCounts(outsideSource);
  if (OWNER_NAMES.some((name) => later[name] !== 0)) violations.push('competing-owner');
  if (!loadCandidate(source).ok) violations.push('load-contract');
  const own = ownerDeclarationCounts(source);
  if (OWNER_NAMES.some((name) => own[name] !== 1)) violations.push('duplicate-owner');
  return violations;
}

function moduleOrderViolations(html) {
  const violations = [];
  if (countLiteral(html, MODULE_TAG) !== 1) violations.push('tag-count');
  const macroAt = html.indexOf(MACRO_CHECK_TAG);
  const ownAt = html.indexOf(MODULE_TAG);
  const inlineAt = html.indexOf(INLINE_OPEN);
  if (!(macroAt >= 0 && macroAt < ownAt && ownAt < inlineAt)) violations.push('load-order');
  if (countLiteral(html, MACRO_CHECK_TAG + '\n' + MODULE_TAG + '\n<script>') !== 1) {
    violations.push('adjacency');
  }
  const tags = APP_LOADER.parseScriptTags(html).filter((entry) => entry.src === MODULE_SRC);
  if (tags.length !== 1 || tags[0].attrs.trim() !== 'src="' + MODULE_SRC + '"') {
    violations.push('classic-tag');
  }
  return violations;
}

console.log('MCX CHARTS / LIFECYCLE BOUNDARY CONTRACT');
console.log('base=' + BASE_SHA);

// ─────────────────────────────────────────────────────────────────────────────
section('1. Pinned #407 base identity and the shipped document');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_SHA, 'merged #407 base commit resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_TREE, 'merged #407 base tree resolves exactly');
eq(execFileSync('git', ['log', '-1', '--format=%s', BASE_SHA], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_SUBJECT, 'merged #407 base subject is the pinned one');
eq(BASE.length, BASE_CHARS, 'base index UTF-16 length is pinned');
eq(Buffer.byteLength(BASE, 'utf8'), BASE_UTF8, 'base index UTF-8 byte length is pinned');
eq(countLiteral(BASE, '\n'), BASE_LF, 'base index LF count is pinned');
eq(sha256(BASE), BASE_INDEX_SHA256, 'base index SHA-256 is pinned');
eq(APP_LOADER.parseScriptTags(BASE).filter((entry) => entry.src && /^\.\//.test(entry.src)).length,
  BASE_LOCAL_SCRIPTS, 'the base carried exactly 53 local application scripts');
eq(INDEX.length, INDEX_CHARS, 'shipped index UTF-16 length is the audited prediction');
eq(Buffer.byteLength(INDEX, 'utf8'), INDEX_UTF8, 'shipped index UTF-8 byte length is the audited prediction');
eq(countLiteral(INDEX, '\n'), INDEX_LF, 'shipped index LF count is the audited prediction');
eq(sha256(INDEX), INDEX_SHA256, 'shipped index SHA-256 is the audited prediction');
// The LIVE document is one layer newer. Both states are pinned: the post-#409
// document this contract owns, and the shipped document that now carries the
// Apex post-auth owner on top of it.
eq(TT_RECONNECT_U.isApplied(LIVE_INDEX), true, 'the shipped index carries the newest TT reconnect layer');
eq(PRE_TT_RECONNECT.length, TT_RECONNECT_U.BASE_CHARS,
  'peeling the TT reconnect layer reaches the pinned post-#410 index length');
eq(sha256(PRE_TT_RECONNECT), TT_RECONNECT_U.BASE_SHA256,
  'peeling the TT reconnect layer reaches the pinned post-#410 index hash');
eq(APEX_POST_AUTH_U.isApplied(PRE_TT_RECONNECT), true, 'the post-#410 document carries the later Apex post-auth layer');
eq(LIVE_INDEX.length, TRADE_DETAIL_U.EXTRACTED_CHARS, 'the live shipped index UTF-16 length is the newest layer’s extracted value');
eq(sha256(LIVE_INDEX), TRADE_DETAIL_U.EXTRACTED_SHA256, 'the live shipped index SHA-256 is the newest layer’s extracted value');
eq(APP_LOADER.parseScriptTags(LIVE_INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).length,
  59, 'the live shipped index carries 59 local application scripts');
eq(PRE_TT_RECONNECT.length, APEX_POST_AUTH_U.EXTRACTED_CHARS, '…peeling TT reconnect returns it to the post-Apex length');
eq(sha256(PRE_TT_RECONNECT), APEX_POST_AUTH_U.EXTRACTED_SHA256, '…and to the post-Apex hash');
eq(APP_LOADER.parseScriptTags(PRE_TT_RECONNECT).filter((entry) => entry.src && /^\.\//.test(entry.src)).length,
  55, '…with 55 local application scripts');
eq(APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).length,
  LOCAL_SCRIPT_COUNT, '…and peeling the Apex layer returns it to this contract\'s 54');
eq(INDEX.length, BASE.length - SECTION_CHARS + GLUE_CHARS + MODULE_TAG.length + 1,
  'the whole index delta is exactly the removed section, minus the retained glue, plus the one added tag line');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The six-fragment tiling of the MCX section, derived and pinned');
eq(countLiteral(BASE, MCX_BANNER), 1, 'the MCX banner is unique in the base');
eq(countLiteral(BASE, EIC_BANNER), 1, 'the EIC banner is unique in the base');
const sectionAt = BASE.indexOf(MCX_BANNER);
const sectionEnd = BASE.indexOf(EIC_BANNER, sectionAt);
eq(sectionAt, SECTION_AT, 'the MCX section starts at the exact pinned base offset');
eq(sectionEnd, SECTION_END, 'the MCX section ends at the exact pinned base offset, at the EIC banner');
eq(lineAt(BASE, sectionAt), SECTION_START_LINE, 'the section starts on line 33042 of the base');
eq(lineAt(BASE, sectionEnd), SECTION_END_LINE, 'line 33911 of the base begins the EIC banner');
eq(sectionEnd - sectionAt, SECTION_CHARS, 'the section is exactly 44716 UTF-16 units');

const SLICE = {};
FRAGMENTS.forEach((fragment) => {
  const text = BASE.slice(fragment.start, fragment.end);
  SLICE[fragment.name] = text;
  eq(text.length, fragment.chars, 'fragment ' + fragment.name + ' has its pinned UTF-16 length');
  eq(sha256(text), fragment.sha256, 'fragment ' + fragment.name + ' has its pinned SHA-256');
});
eq(BASE.slice(SEPARATOR_AT, SEPARATOR_AT + 1), SEPARATOR,
  'fragment 6 is exactly one LF: the structural separator between the MCX section and the EIC banner');
// Exact tiling: no gap, no overlap, every character accounted for.
eq(FRAGMENTS[0].start, SECTION_AT, 'the fragments start where the MCX section starts');
FRAGMENTS.slice(1).forEach((fragment, i) => {
  eq(fragment.start, FRAGMENTS[i].end,
    'fragment ' + fragment.name + ' begins exactly where ' + FRAGMENTS[i].name + ' ends — no gap, no overlap');
});
eq(FRAGMENTS[FRAGMENTS.length - 1].end, SEPARATOR_AT, 'the last moved fragment ends exactly at the separator');
eq(SEPARATOR_AT + SEPARATOR.length, SECTION_END, 'the separator ends where the EIC banner begins');
eq(FRAGMENTS.reduce((total, fragment) => total + fragment.chars, 0) + SEPARATOR.length, SECTION_CHARS,
  'the six fragments account for EVERY character of the MCX section');
eq(FRAGMENTS.map((f) => SLICE[f.name]).join('') + SEPARATOR, BASE.slice(SECTION_AT, SECTION_END),
  'concatenating the six fragments in order reproduces the section byte-for-byte');
eq(FRAGMENTS.filter((f) => f.moved).length, 3, 'exactly three fragments move');
eq(FRAGMENTS.filter((f) => !f.moved).length, 2, 'exactly two fragments stay inline');
// THE FINDING that forced this shape.
eq(BASE.indexOf("window.addEventListener('resize'", SECTION_AT) - SECTION_AT, LISTENER_OFFSET_IN_SECTION,
  'the resize listener sits 825 characters into the section — the section is NOT declarations-only');
ok(topLevelResidue(BASE.slice(SECTION_AT, SECTION_END - 1)) !== '',
  'a whole-section cut WOULD have carried executable top-level code');
ok(!loadCandidate(BASE.slice(SECTION_AT, SECTION_END - 1)).ok,
  'a whole-section cut would NOT evaluate before its dependencies exist');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Module bytes, the 51-owner manifest and declarations-only residue');
eq(MODULE, SLICE.movedPrefix1 + SLICE.movedPrefix2 + SLICE.movedTail,
  'the module is byte-identical to the three moved fragments, concatenated in document order');
eq(MODULE.length, MODULE_CHARS, 'module has the exact pinned UTF-16 length');
eq(Buffer.byteLength(MODULE, 'utf8'), MODULE_UTF8, 'module has the exact pinned UTF-8 byte length');
eq(countLiteral(MODULE, '\n'), MODULE_LF, 'module carries exactly 861 LF characters');
eq(sha256(MODULE), MODULE_SHA256, 'module byte identity is pinned');
ok(MODULE.startsWith(MCX_BANNER), 'module opens on the MCX banner it took with it');
ok(MODULE.endsWith('}\n'), 'module ends on a real line of code, newline-terminated');
ok(!MODULE.endsWith('\n\n'),
  'module has NO blank line at EOF: the separator stays out, so git diff --check is clean');
eq(countLiteral(MODULE, '\r'), 0, 'module carries no CR: the fragments are LF-only, as in the base');
eq(WEAVE_1, FRAGMENTS[0].chars, 'first weave point is the length of fragment 1');
eq(WEAVE_2, FRAGMENTS[0].chars + FRAGMENTS[2].chars, 'second weave point is fragments 1 + 3');
eq(sha256(MODULE.slice(0, WEAVE_1)), FRAGMENTS[0].sha256, 'module [0,226) is exactly movedPrefix1');
eq(sha256(MODULE.slice(WEAVE_1, WEAVE_2)), FRAGMENTS[2].sha256, 'module [226,792) is exactly movedPrefix2');
eq(sha256(MODULE.slice(WEAVE_2)), FRAGMENTS[4].sha256, 'module [792,end) is exactly movedTail');

eq(topLevelShape(MODULE), EXPECTED_SHAPE,
  'module owns exactly 51 declarations with pinned order, forms, async status and sizes');
eq(topLevelShape(MODULE).length, OWNER_COUNT, 'the manifest has exactly 51 entries');
eq(topLevelShape(MODULE).map((entry) => entry.name), OWNER_NAMES, 'the ordered owner manifest is exact');
eq(topLevelShape(MODULE)[0].name, '_mcxOverlay', 'the module opens on the _mcxOverlay state root');
eq(topLevelShape(MODULE)[OWNER_COUNT - 1].name, '_mcxInit', 'the module closes on _mcxInit');
eq(topLevelShape(MODULE).filter((entry) => entry.form === 'function').length, 33, '33 function declarations');
eq(topLevelShape(MODULE).filter((entry) => entry.form === 'var').length, 18, '18 var declarations');
eq(topLevelShape(MODULE).filter((entry) => entry.isAsync).map((entry) => entry.name),
  ['_mcxRenderCharts'], '_mcxRenderCharts is the only async owner');
eq(topLevelShape(MODULE).reduce((total, entry) => total + entry.chars, 0), DECLARATION_CHARS,
  'owned declaration bytes total exactly 41010');
eq(topLevelResidue(MODULE), '',
  'module is declarations plus comments/whitespace only: zero executable top-level residue');
eq(countLiteral(MODULE, "'use strict'"), 0, 'module adds no strict-mode pragma');
eq(countLiteral(MODULE, '"use strict"'), 0, 'module adds no double-quoted strict-mode pragma');
eq(countLiteral(MODULE, 'module.exports'), 0, 'module adds no CommonJS export');
eq(countLiteral(MODULE, 'require('), 0, 'module adds no CommonJS require');
eq(countLiteral(MODULE, 'export '), 0, 'module adds no ES export');
eq(countLiteral(MODULE, 'import '), 0, 'module adds no ES import');
ok(!/^\s*\(function\s*\(/.test(MODULE) && !/^\s*!function/.test(MODULE),
  'module adds no IIFE or wrapper');
eq((maskLiterals(MODULE).match(/\bwindow\s*\.\s*[A-Za-z0-9_$]+\s*=/g) || []).length, 0,
  'module performs no manual window.* exposure');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Load-time inertness: empty-VM evaluation defines exactly the 51 owners');
const bareLoad = loadCandidate(MODULE);
ok(bareLoad.ok, 'module evaluates in a completely empty context, before any dependency exists: ' + bareLoad.error);
eq(bareLoad.globals.length, OWNER_COUNT, 'evaluation defines exactly 51 globals');
eq(bareLoad.globals.slice().sort(), OWNER_NAMES.slice().sort(),
  'the globals it defines are exactly its declared owners — and nothing else');
OWNER_NAMES.forEach((name) => {
  ok(name in bareLoad.sandbox, 'classic evaluation exposes global ' + name);
});
EXPECTED_SHAPE.filter((entry) => entry.form === 'function').forEach((entry) => {
  eq(typeof bareLoad.sandbox[entry.name], 'function', entry.name + ' is a classic global function');
});
eq(directEffects(MODULE).addEventListener, 0, 'module registers zero listeners at load time');
eq(directEffects(MODULE).removeEventListener, 0, 'module removes zero listeners at load time');
eq(directEffects(MODULE), EXPECTED_EFFECTS, 'measured source effects are exact');
eq(directEffects(MODULE).fetch, 0, 'module performs zero direct fetch calls');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Exact 44-name free-dependency inventory, with no MCX state in it');
eq(freeIdentifiers(MODULE), EXPECTED_DEPENDENCIES, 'module call-time dependency inventory is exact');
eq(freeIdentifiers(MODULE).length, DEPENDENCY_COUNT, 'the dependency inventory has exactly 44 entries');
eq(MCX_STATE_OWNERS.length, 13, 'there are exactly 13 mutable MCX state owners');
MCX_STATE_OWNERS.forEach((name) => {
  ok(OWNER_NAMES.indexOf(name) >= 0, name + ' is OWNED by the module, not read across the boundary');
  eq(freeIdentifiers(MODULE).indexOf(name), -1, name + ' is not a free dependency of the module');
  ok(declaresTopLevelVar(MODULE, name), name + ' is declared as a top-level var inside the module');
  eq(declaresTopLevelVar(INDEX, name), false, name + ' no longer stays inline in index.html');
  ok(declaresTopLevelVar(BASE, name), name + ' WAS inline in the pinned base');
});
eq(MCX_STATE_OWNERS.filter((name) => freeIdentifiers(MODULE).indexOf(name) >= 0), [],
  'NONE of the 13 MCX state owners remains a cross-boundary read');
// A line-anchored scanner would silently miss two of them; prove it here so the
// assertions above cannot quietly become vacuous.
eq(MCX_STATE_OWNERS.filter((name) => !new RegExp('^\\s*var\\s+' + escapeRegExp(name), 'm').test(MODULE)).sort(),
  ['_mcxSpy4hCount', '_mcxVi3m4hCount'],
  'two state owners are the SECOND declaration on their line — a line-anchored check would miss them');
eq(countLiteral(maskLiterals(INDEX), '_mcxSqzState'), 0, 'no inline residue of the MCX squeeze state');
eq(countLiteral(MODULE, 'ffBackendCandlesMcxCharts'), 4,
  'the backend-candle feature flag stays a call-time dependency, referenced exactly four times');
eq(ownerDeclarationCounts(MODULE).ffBackendCandlesMcxCharts, undefined,
  'the feature flag is read, never declared, by the module');
ok(/function\s+ffBackendCandlesMcxCharts\s*\(/.test(maskLiterals(OUTSIDE_APP)),
  'the feature flag is still declared outside this module, unchanged');

// ─────────────────────────────────────────────────────────────────────────────
section('6. The retained inline glue and its ownership of _mcxResizeTimer');
const GLUE = SLICE.retainedTimerDecl + SLICE.retainedListener;
eq(GLUE, GLUE_TEXT, 'the retained glue is byte-for-byte the pinned timer declaration plus resize listener');
eq(GLUE.length, GLUE_CHARS, 'retained glue UTF-16 length is pinned');
eq(Buffer.byteLength(GLUE, 'utf8'), GLUE_UTF8, 'retained glue UTF-8 byte length is pinned');
eq(countLiteral(GLUE, '\n'), GLUE_LF, 'retained glue carries exactly 7 LF characters');
eq(sha256(GLUE), GLUE_SHA256, 'retained glue SHA-256 is pinned');
// In the SHIPPED document every offset past the new tag is displaced by exactly
// the tag line; with the tag removed the glue sits at the base section offset,
// because every byte before it is unchanged. That is the offset the undo helper
// pins, so both forms are asserted here.
const UNTAGGED = INDEX.replace(MODULE_TAG + '\n', '');
const GLUE_AT_SHIPPED = SECTION_AT + MODULE_TAG.length + 1;
eq(INDEX.indexOf(GLUE), GLUE_AT_SHIPPED,
  'the shipped index carries the glue displaced by exactly the one added tag line');
eq(UNTAGGED.slice(SECTION_AT, SECTION_AT + GLUE_CHARS), GLUE,
  'with the tag removed the glue sits at the exact pinned base section offset');
eq(countLiteral(INDEX, GLUE), 1, 'the glue appears exactly once in the shipped index');
eq(topLevelShape(GLUE).map((entry) => entry.name), ['_mcxResizeTimer'],
  'the glue declares exactly one thing: the listener-private timer');
eq(countLiteral(INDEX, 'var _mcxResizeTimer'), 1, '_mcxResizeTimer is declared exactly once');
const timerRefsAll = identifierCountMasked(maskLiterals(INDEX), '_mcxResizeTimer');
const timerRefsGlue = identifierCountMasked(maskLiterals(GLUE), '_mcxResizeTimer');
eq(timerRefsGlue, 3, 'the glue holds all three _mcxResizeTimer references');
eq(timerRefsAll, timerRefsGlue,
  '_mcxResizeTimer is referenced ONLY inside the retained glue — it is listener-private');
eq(countLiteral(MODULE, '_mcxResizeTimer'), 0,
  'the module neither declares nor references _mcxResizeTimer, not even in a comment');
eq(identifierCountMasked(maskLiterals(OUTSIDE_APP), '_mcxResizeTimer'), 3,
  'app-wide, _mcxResizeTimer is referenced exactly three times, all in the glue');
ok(/^var\s+_mcxResizeTimer\s+=\s+null;\n/.test(GLUE), 'the glue opens on the _mcxResizeTimer declaration');
ok(GLUE.indexOf("window.addEventListener('resize', function(){") > 0,
  'the glue carries the resize listener unwrapped, unrenamed and top-level');
ok(!/^\s*\(function/.test(SLICE.retainedListener) && !/^\s*!function/.test(SLICE.retainedListener),
  'the listener was not wrapped in an IIFE on the way through');
ok(GLUE.indexOf('_mcxRenderCharts') > 0,
  'the listener still calls the classic global _mcxRenderCharts across the boundary');
eq(topLevelShape(MODULE).filter((entry) => entry.name === '_mcxRenderCharts').length, 1,
  '…which the module owns and exposes as a classic global');
ok(GLUE.indexOf("_activeView !== 'mcx'") > 0, 'the listener still guards on the inline-owned _activeView');
// No OTHER mutable MCX state was left behind.
eq(MCX_STATE_OWNERS.filter((name) => declaresTopLevelVar(INDEX, name)), [],
  'no other mutable MCX state declaration stays inline');
eq(scanTopLevelDeclarations(GLUE).length, 1, 'the glue owns exactly one declaration in total');

// ─────────────────────────────────────────────────────────────────────────────
section('7. Zero inline residue and no competing declaration app-wide');
eq(countLiteral(INDEX, MCX_BANNER), 0, 'the MCX banner moved with the module: zero inline residue');
eq(countLiteral(MODULE, MCX_BANNER), 1, 'the MCX banner lives in the module exactly once');
eq(countLiteral(INDEX, EIC_BANNER), 1, 'the EIC banner is untouched and still inline exactly once');
eq(ownerDeclarationCounts(OUTSIDE_APP),
  Object.fromEntries(OWNER_NAMES.map((name) => [name, 0])),
  'no competing declaration remains anywhere in the application once the module is blanked');
eq(ownerDeclarationCounts(MODULE), Object.fromEntries(OWNER_NAMES.map((name) => [name, 1])),
  'the module declares each of its 51 owners exactly once');
eq(APP_LOADER.loadOrderedScriptSources().filter((part) => part.src === MODULE_SRC).map((part) => part.code === MODULE),
  [true], 'the loader reconstructs the owner from disk exactly once, byte-for-byte');
ok(APP_LOADER.loadAppJavaScriptSource().indexOf(MODULE) >= 0,
  'the reconstructed application source contains the module text verbatim — a pure relocation, not a rewrite');

// ─────────────────────────────────────────────────────────────────────────────
section('8. Exact JavaScript and inline-markup consumers');
eq(jsConsumers(INLINE_PART.code), JS_CONSUMERS,
  'the inline monolith consumes exactly seven module owners, with the pinned reference counts');
eq(Object.values(jsConsumers(INLINE_PART.code)).reduce((a, b) => a + b, 0), JS_CONSUMER_TOTAL,
  'eighteen inline-JS references in total');
eq(markupConsumers(MARKUP), MARKUP_CONSUMERS,
  'inline markup consumes exactly _mcxRedraw (3) and _mcxRefresh (1)');
Object.keys(JS_CONSUMERS).concat(Object.keys(MARKUP_CONSUMERS)).forEach((name) => {
  ok(OWNER_NAMES.indexOf(name) >= 0, name + ' is owned by the module, so it must stay a classic global');
  eq(ownerDeclarationCounts(MODULE)[name], 1, name + ' resolves through exactly one classic global binding');
});
eq(countLiteral(MARKUP, '_mcxRedraw('), 3, 'markup keeps exactly three _mcxRedraw handlers');
eq(countLiteral(MARKUP, '_mcxRefresh('), 1, 'markup keeps exactly one _mcxRefresh handler');
eq(countLiteral(maskLiterals(MODULE), 'window.'), 1,
  'the module reads window exactly once, and only at call time (window.ResizeObserver)');
ok(MODULE.indexOf('if (!window.ResizeObserver) return;') >= 0,
  'that single window read is the pre-existing ResizeObserver feature test, carried over unchanged');
// The consumers resolve because the module is a classic script loaded BEFORE
// the inline monolith that calls them — proved structurally in section 9.
// This PR moved code, not call sites: deleting exactly the three moved
// fragments from the BASE inline monolith leaves precisely the shipped set.
const BASE_INLINE = APP_LOADER.loadOrderedScriptSources({ html: BASE })
  .filter((part) => part.isAppJs && part.code != null && part.kind === 'inline')[0].code;
const BASE_INLINE_WITHOUT_MOVED = BASE_INLINE
  .replace(SLICE.movedPrefix1, '')
  .replace(SLICE.movedPrefix2, '')
  .replace(SLICE.movedTail, '');
eq(jsConsumers(BASE_INLINE_WITHOUT_MOVED), JS_CONSUMERS,
  'removing only the three moved fragments from the base monolith leaves exactly the shipped consumers');
eq(identifierCountMasked(maskLiterals(GLUE), '_mcxRenderCharts'), 1,
  'the single _mcxRenderCharts consumer IS the retained listener, which stays inline');
eq(markupConsumers(BASE.replace(/<script[\s\S]*?<\/script>/g, '')), MARKUP_CONSUMERS,
  'the markup handlers are byte-identical to the base: no handler was added, removed or rewritten');

// ─────────────────────────────────────────────────────────────────────────────
section('9. One synchronous src-only classic tag, adjacency and load order');
eq(APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).length,
  LOCAL_SCRIPT_COUNT, 'index carries exactly 54 local application scripts');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'the new tag appears exactly once');
eq(moduleOrderViolations(INDEX), [],
  'the charts owner loads after the MCX macro-check owner and immediately before the inline monolith');
eq(countLiteral(INDEX, MACRO_CHECK_TAG + '\n' + MODULE_TAG + '\n<script>'), 1,
  'exact three-line adjacency: macro check, charts, then the inline monolith opens');
ok(INDEX.indexOf(BACKUP_RESTORE_TAG) < INDEX.indexOf(MACRO_CHECK_TAG),
  'Journal Backup/Restore still precedes the MCX macro-check owner');
const ownTag = APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src === MODULE_SRC)[0];
eq(ownTag.attrs.trim(), 'src="' + MODULE_SRC + '"', 'tag is src-only: no defer, async, type or inline code');
['defer', 'async', 'type=', 'nomodule', 'crossorigin', 'integrity'].forEach((attr) => {
  eq(ownTag.attrs.indexOf(attr), -1, 'tag carries no ' + attr + ' attribute');
});
eq(ownTag.code == null || ownTag.code === '', true, 'the tag has no inline body');
eq(APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).map((e) => e.src).slice(-1),
  [MODULE_SRC], 'the charts owner is the LAST local application script before the monolith');
// In the LIVE tree the Apex post-auth owner now loads after this one, so the
// module is second-to-last rather than last. The invariant this line protects —
// the charts owner evaluates before the inline monolith that consumes it — is
// unchanged and asserted in its stronger, current form.
eq(APP_LOADER.loadOrderedScriptSources().filter((p) => p.isAppJs && p.code != null).map((p) => p.src || '(inline)').slice(-7),
  [MODULE_SRC, './js/services/apex-post-auth-init.js', './js/ui/tt-reconnect.js', './js/ui/journal-close-legs.js', './js/ui/journal-trade-forms.js', './js/ui/journal-trade-detail.js', '(inline)'],
  'in execution order the module runs immediately before the Apex post-auth owner, which precedes the TT reconnect and Journal Close Legs owners and then the inline monolith');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Byte-exact forward transform and reverse WEAVE reconstruction of #407');
const KEPT = BASE.slice(0, SECTION_AT) + GLUE + BASE.slice(SECTION_END);
eq(countLiteral(KEPT, MACRO_CHECK_TAG + '\n'), 1, 'the macro-check tag is the unique anchor for the new tag');
const FORWARD = KEPT.replace(MACRO_CHECK_TAG + '\n', MACRO_CHECK_TAG + '\n' + MODULE_TAG + '\n');
eq(FORWARD, INDEX, 'the extraction algorithm reproduces the shipped index byte-for-byte');
eq(sha256(FORWARD), INDEX_SHA256, 'the forward transform hashes to the audited prediction');
eq(APP_LOADER.parseScriptTags(FORWARD).filter((e) => e.src && /^\.\//.test(e.src)).length, LOCAL_SCRIPT_COUNT,
  'the forward transform yields exactly 54 local application scripts');
// REVERSE: not an insertion but a weave — the two retained fragments splice
// back into the module at its two internal weave points, then the separator.
function weave(html, moduleSource, glue) {
  const untagged = html.replace(MODULE_TAG + '\n', '');
  return untagged.slice(0, SECTION_AT)
    + moduleSource.slice(0, WEAVE_1)
    + glue.slice(0, FRAGMENTS[1].chars)
    + moduleSource.slice(WEAVE_1, WEAVE_2)
    + glue.slice(FRAGMENTS[1].chars)
    + moduleSource.slice(WEAVE_2)
    + SEPARATOR
    + untagged.slice(SECTION_AT + glue.length);
}
eq(INDEX.replace(MODULE_TAG + '\n', ''), KEPT, 'removing the new tag restores the tag-free document exactly');
eq(weave(INDEX, MODULE, GLUE), BASE,
  'weaving the module fragments around the retained glue reconstructs #407 byte-for-byte');
eq(sha256(weave(INDEX, MODULE, GLUE)), BASE_INDEX_SHA256, 'the reconstruction hashes to the pinned base');
const rebuilt = U.undoMcxCharts(INDEX, MODULE);
eq(rebuilt, BASE, 'the undo helper reconstructs merged #407 byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the pinned base hash');
eq(U.TAG, MODULE_TAG + '\n', 'undo helper pins the tag including its LF');
eq(U.ANCHOR_TAG, MACRO_CHECK_TAG + '\n', 'undo helper pins the macro-check anchor tag');
eq(U.SECTION_AT, SECTION_AT, 'undo helper pins the exact section offset');
eq(U.SECTION_END, SECTION_END, 'undo helper pins the exact section end offset');
eq(U.GLUE_AT, SECTION_AT, 'undo helper pins the retained-glue offset');
eq(U.GLUE_CHARS, GLUE_CHARS, 'undo helper pins the retained-glue length');
eq(U.GLUE_SHA256, sha256(GLUE), 'undo helper pins the retained-glue hash');
eq(U.TIMER_DECL_CHARS, FRAGMENTS[1].chars, 'undo helper pins the timer-declaration length');
eq(U.TIMER_DECL_SHA256, FRAGMENTS[1].sha256, 'undo helper pins the timer-declaration hash');
eq(U.LISTENER_CHARS, FRAGMENTS[3].chars, 'undo helper pins the listener length');
eq(U.LISTENER_SHA256, FRAGMENTS[3].sha256, 'undo helper pins the listener hash');
eq(U.MODULE_CHARS, MODULE_CHARS, 'undo helper pins the module length');
eq(U.MODULE_SHA256, sha256(MODULE), 'undo helper pins the module hash');
eq(U.WEAVE_1, WEAVE_1, 'undo helper pins the first weave point');
eq(U.WEAVE_2, WEAVE_2, 'undo helper pins the second weave point');
eq(U.MOVED_PREFIX_1_SHA256, FRAGMENTS[0].sha256, 'undo helper pins the first moved fragment hash');
eq(U.MOVED_PREFIX_2_SHA256, FRAGMENTS[2].sha256, 'undo helper pins the second moved fragment hash');
eq(U.MOVED_TAIL_SHA256, FRAGMENTS[4].sha256, 'undo helper pins the third moved fragment hash');
eq(U.SEPARATOR, SEPARATOR, 'undo helper pins the one-character structural separator');
eq(U.BASE_CHARS, BASE_CHARS, 'undo helper pins the base length');
eq(U.BASE_SHA256, BASE_INDEX_SHA256, 'undo helper pins the base hash');
eq(U.EXTRACTED_CHARS, INDEX.length, 'undo helper pins the extracted length');
eq(U.EXTRACTED_SHA256, sha256(INDEX), 'undo helper pins the extracted hash');
ok(U.isApplied(INDEX), 'undo helper detects the applied extraction');
ok(!U.isApplied(BASE), 'undo helper reports the base as not extracted');
// The separator is load-bearing in both directions.
const noSeparator = INDEX.replace(MODULE_TAG + '\n', '').slice(0, SECTION_AT)
  + MODULE.slice(0, WEAVE_1) + SLICE.retainedTimerDecl
  + MODULE.slice(WEAVE_1, WEAVE_2) + SLICE.retainedListener
  + MODULE.slice(WEAVE_2)
  + INDEX.replace(MODULE_TAG + '\n', '').slice(SECTION_AT + GLUE_CHARS);
ok(noSeparator !== BASE, 'reconstructing WITHOUT the separator does not reproduce #407 — it is load-bearing');
eq(BASE.length - noSeparator.length, 1, '…and it is short by exactly the one separator character');
// The cumulative bridge must peel THIS layer first, then MCX macro check.
const BRIDGE_SRC = fs.readFileSync(path.join(ROOT, 'tests/lib/post-journal-mcx-pr3-undo.js'), 'utf8');
ok(BRIDGE_SRC.indexOf('undoMcxCharts') >= 0, 'the cumulative historical helper undoes MCX charts');
ok(BRIDGE_SRC.indexOf('undoMcxCharts') < BRIDGE_SRC.indexOf('undoMcxMacroCheck'),
  'the cumulative helper peels MCX charts BEFORE MCX macro check');
ok(BRIDGE_SRC.indexOf('undoMcxMacroCheck') < BRIDGE_SRC.indexOf('undoJournalBackupRestore'),
  '…and MCX macro check before Journal Backup/Restore');
const preMacro = MACRO_U.undoMcxMacroCheck(rebuilt, MACRO_MODULE);
eq(preMacro.length, MACRO_U.BASE_CHARS, 'the next layer down still reaches the pre-macro-check base');
eq(sha256(preMacro), MACRO_U.BASE_SHA256, 'the pre-macro-check base hash is unchanged by this layer');

// ─────────────────────────────────────────────────────────────────────────────
section('11. Mutation-sensitive negative controls');
eq(boundaryViolations(MODULE, OUTSIDE_APP), [], 'the shipped owner passes every semantic boundary gate');
// Listener absorbed into the module.
const withListener = MODULE + '\n' + SLICE.retainedListener;
ok(boundaryViolations(withListener, OUTSIDE_APP).includes('top-level-effect'),
  'a module that absorbed the resize listener is rejected as top-level residue');
ok(boundaryViolations(withListener, OUTSIDE_APP).includes('listener-registration'),
  '…and is rejected for registering a listener at load time');
ok(!loadCandidate(withListener).ok, '…and stops evaluating in an empty VM');
ok(/window is not defined/.test(loadCandidate(withListener).error),
  '…failing on `window` exactly as the audit measured');
// _mcxResizeTimer absorbed into the module.
const withTimer = SLICE.retainedTimerDecl + MODULE;
ok(topLevelShape(withTimer).some((entry) => entry.name === '_mcxResizeTimer'),
  'a module that absorbed the timer declaration is detected by the manifest');
ok(boundaryViolations(withTimer, OUTSIDE_APP).includes('manifest'),
  '…and its owner manifest no longer matches');
ok(boundaryViolations(withTimer, OUTSIDE_APP).includes('timer-overreach'),
  '…and it trips the dedicated timer-overreach gate');
ok(boundaryViolations(MODULE + '\n// _mcxResizeTimer\n', OUTSIDE_APP).includes('timer-overreach'),
  'even a bare comment mention of _mcxResizeTimer in the module is rejected');
// Missing structural separator.
throws(() => U.undoMcxCharts(INDEX, MODULE + SEPARATOR), /MODULE_IDENTITY/,
  'a module that re-absorbed the separator is rejected');
throws(() => U.undoMcxCharts(INDEX, MODULE.slice(0, -1)), /MODULE_IDENTITY/,
  'a module missing its own final LF is rejected');
ok(noSeparator !== BASE, 'a reconstruction with the separator dropped is not the base');
// Renamed owner.
ok(topLevelShape(MODULE.replace('function _mcxInit', 'function _mcxInitV2'))
  .map((entry) => entry.name).indexOf('_mcxInit') < 0, 'a renamed owner is detected by the manifest');
ok(boundaryViolations(MODULE.replace('function _mcxInit', 'function _mcxInitV2'), OUTSIDE_APP)
  .includes('manifest'), 'the renamed-owner mutant trips the manifest gate');
ok(boundaryViolations(MODULE.replace('function _mcxRedraw', 'function _mcxRedrawV2'), OUTSIDE_APP)
  .includes('manifest'), 'a renamed markup-handler owner is rejected');
ok(boundaryViolations(MODULE.replace('async function _mcxRenderCharts', 'function _mcxRenderCharts'), OUTSIDE_APP)
  .includes('manifest'), 'a de-async _mcxRenderCharts mutant is rejected');
ok(boundaryViolations(MODULE + '\nvar _mcxBoot = 1;\n', OUTSIDE_APP).includes('manifest'),
  'an extra top-level declaration mutant is rejected');
ok(boundaryViolations(MODULE + '\n_mcxInit();\n', OUTSIDE_APP).includes('top-level-effect'),
  'a top-level invocation mutant is rejected');
ok(boundaryViolations(MODULE + '\ndocument.body;\n', OUTSIDE_APP).includes('top-level-effect'),
  'a top-level DOM mutant is rejected');
ok(boundaryViolations(MODULE, OUTSIDE_APP + '\nfunction _mcxRedraw() {}\n').includes('competing-owner'),
  'a competing later _mcxRedraw owner is rejected');
ok(boundaryViolations(MODULE + '\nfunction _mcxStopPolls() {}\n', OUTSIDE_APP).includes('duplicate-owner'),
  'a duplicate _mcxStopPolls owner mutant is rejected');
// Reordered moved fragments.
const swapped = SLICE.movedPrefix2 + SLICE.movedPrefix1 + SLICE.movedTail;
ok(sha256(swapped) !== MODULE_SHA256, 'reordering the moved fragments changes the module hash');
ok(topLevelShape(swapped)[0].name !== '_mcxOverlay', '…and the manifest no longer opens on _mcxOverlay');
ok(weave(INDEX, swapped, GLUE) !== BASE, '…and reconstruction from it fails');
throws(() => U.undoMcxCharts(INDEX, swapped), /WEAVE_IDENTITY/,
  '…and the undo helper rejects it by the weave-point guard, not merely by total length');
// Changed weave point.
const shiftedWeave = MODULE.slice(0, WEAVE_1 - 1) + SLICE.retainedTimerDecl
  + MODULE.slice(WEAVE_1 - 1, WEAVE_2) + SLICE.retainedListener + MODULE.slice(WEAVE_2) + SEPARATOR;
ok(INDEX.replace(MODULE_TAG + '\n', '').slice(0, SECTION_AT) + shiftedWeave
   + INDEX.replace(MODULE_TAG + '\n', '').slice(SECTION_AT + GLUE_CHARS) !== BASE,
  'weaving the glue back at the wrong offset does NOT reconstruct the base');
ok(sha256(MODULE.slice(0, WEAVE_1 - 1)) !== FRAGMENTS[0].sha256,
  'a weave point off by one no longer matches the first moved fragment');
// Duplicate / reordered / non-classic script tag.
ok(moduleOrderViolations(INDEX.replace(MODULE_TAG + '\n', '')).includes('tag-count'),
  'missing module tag mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)).includes('tag-count'),
  'duplicate module tag mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(
  MACRO_CHECK_TAG + '\n' + MODULE_TAG, MODULE_TAG + '\n' + MACRO_CHECK_TAG
)).includes('adjacency'), 'charts-before-macro-check reorder mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' defer>'))).includes('classic-tag'),
  'deferred module tag mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' async>'))).includes('classic-tag'),
  'async module tag mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' type="module">'))).includes('classic-tag'),
  'type="module" tag mutant is rejected');
// Mutated retained glue.
throws(() => U.undoMcxCharts(INDEX.replace('setTimeout(_mcxRenderCharts, 160)', 'setTimeout(_mcxRenderCharts, 161)'), MODULE),
  /GLUE_IDENTITY/, 'a same-length mutation of the retained listener is rejected');
throws(() => U.undoMcxCharts(INDEX.replace(GLUE, GLUE.replace('_mcxResizeTimer      = null', '_mcxResizeTimer      = 0000')), MODULE),
  /GLUE_IDENTITY/, 'a same-length mutation of the timer declaration is rejected');
// Truncated / mutated module, foreign module, degenerate inputs.
throws(() => U.undoMcxCharts(INDEX, MODULE + ' '), /MODULE_IDENTITY/, 'appended-byte module mutant is rejected');
throws(() => U.undoMcxCharts(INDEX, MODULE.slice(0, 1000)), /MODULE_IDENTITY/, 'truncated module mutant is rejected');
throws(() => U.undoMcxCharts(INDEX, MODULE.slice(0, WEAVE_1) + MODULE.slice(WEAVE_2)), /MODULE_IDENTITY/,
  'a module missing its middle fragment entirely is rejected');
throws(() => U.undoMcxCharts(INDEX, MODULE.replace('sma8: true', 'sma8: fals')), /WEAVE_IDENTITY/,
  'a same-length mutated module is rejected by the fragment it mutated');
ok(MODULE.indexOf('sma8: true') >= 0, '…and that mutation targets a byte the module really carries');
throws(() => U.undoMcxCharts(INDEX, MACRO_MODULE), /MODULE_IDENTITY/,
  'a foreign module (MCX macro check) is rejected');
throws(() => U.undoMcxCharts(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /TAG_IDENTITY/, 'duplicate-tag state is rejected');
throws(() => U.undoMcxCharts(INDEX.replace(MODULE_TAG + '\n', ''), MODULE), /TAG_IDENTITY/,
  'missing-tag state is rejected');
throws(() => U.undoMcxCharts(
  INDEX.replace(MACRO_CHECK_TAG + '\n' + MODULE_TAG, MODULE_TAG + '\n' + MACRO_CHECK_TAG), MODULE),
  /TAG_ADJACENCY/, 'reordered-tag state is rejected');
throws(() => U.undoMcxCharts(INDEX.replace('mcxResults', 'mcxResultZ'), MODULE), /EXTRACTED_IDENTITY/,
  'a same-length edit anywhere in the retained document is rejected');
throws(() => U.undoMcxCharts(BASE, MODULE), /TAG_IDENTITY/,
  'a partially applied state (module absent from the document, tag absent) is rejected');
throws(() => U.undoMcxCharts(INDEX.replace(MODULE_TAG + '\n', '') + MODULE_TAG + '\n', MODULE),
  /TAG_ADJACENCY/, 'a tag appended in the wrong place is rejected');
throws(() => U.undoMcxCharts(null, MODULE), /BAD_INPUT/, 'a null document is rejected');
throws(() => U.undoMcxCharts(INDEX, null), /BAD_INPUT/, 'a null module is rejected');
throws(() => U.undoMcxCharts(INDEX, undefined), /BAD_INPUT/, 'an undefined module is rejected');

// ─────────────────────────────────────────────────────────────────────────────
section('12. Exact production scope and audit replacement');
function changedPaths() {
  const committed = execFileSync('git', ['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'], {
    cwd: ROOT, encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean);
  const statusOutput = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: ROOT, encoding: 'utf8',
  });
  const status = statusOutput.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
  return Array.from(new Set(committed.concat(status))).sort();
}
const changed = changedPaths();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
eq(changedProduction, ['index.html', 'js/services/apex-post-auth-init.js', 'js/ui/journal-close-legs.js', 'js/ui/journal-trade-detail.js', 'js/ui/journal-trade-forms.js', MODULE_REL, 'js/ui/tt-reconnect.js'],
  'production footprint is exactly index.html plus the MCX charts owner and the later Apex post-auth, TT reconnect and Journal Close Legs owners');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent charts contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact charts undo helper is part of the change');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
  'no temporary MCX charts audit file is shipped: the permanent contract replaces it');
ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit was removed as part of this change');
ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
ok(!changed.some((rel) => rel.endsWith('.md') && rel !== 'CLAUDE.md'),
  'no documentation changed, except the repository working notes');
ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
  'no backend/model configuration changed');
ok(!changed.some((rel) => rel === '.gitattributes'), '.gitattributes is untouched');
ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL || rel === 'CLAUDE.md' ||
  rel === 'js/services/apex-post-auth-init.js' || rel === 'js/ui/tt-reconnect.js' ||
  rel === 'js/ui/journal-close-legs.js' || rel === 'js/ui/journal-trade-detail.js' || rel === 'js/ui/journal-trade-forms.js' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');

const contractsToAdvance = [
  'tests/backend-directional-adapter-boundary-contract.test.js',
  'tests/backend-directional-preview-boundary-contract.test.js',
  'tests/backend-directional-snapshot-boundary-contract.test.js',
  'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
  'tests/journal-backend-write-through-boundary-contract.test.js',
  'tests/journal-backup-restore-boundary-contract.test.js',
  'tests/journal-core-boundary-contract.test.js',
  'tests/journal-manual-import-boundary-contract.test.js',
  'tests/journal-migration-boundary-contract.test.js',
  'tests/journal-remote-persistence-boundary-contract.test.js',
  'tests/journal-ui-boundary-contract.test.js',
  'tests/mcx-backend-candles-boundary-contract.test.js',
  'tests/mcx-macro-check-boundary-contract.test.js',
  'tests/mcx-market-context-boundary-contract.test.js',
  'tests/mcx-regime-policy-boundary-contract.test.js',
  'tests/mcx-vix-market-context-boundary-contract.test.js',
  'tests/pess-extraction-boundary-contract.test.js',
  'tests/pretrade-risk-modal-boundary-contract.test.js',
  'tests/pretrade-risk-rules-boundary-contract.test.js',
  'tests/pretrade-technicals-boundary-contract.test.js',
  'tests/sfs-extraction-boundary-contract.test.js',
];
for (const rel of contractsToAdvance) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('mcx-charts'),
    rel + ' recognizes the new MCX charts owner or the current classic-script tail');
}

const report = {
  base: {
    commit: BASE_SHA, tree: BASE_TREE, subject: BASE_SUBJECT,
    indexChars: BASE.length,
    indexUtf8Bytes: Buffer.byteLength(BASE, 'utf8'),
    indexLf: countLiteral(BASE, '\n'),
    indexSha256: sha256(BASE),
    localScripts: BASE_LOCAL_SCRIPTS,
  },
  selected: {
    module: MODULE_REL,
    strategy: 'owner-cohesive candidate C — three moved fragments, two retained inline, one separator LF removed',
    section: [SECTION_AT, SECTION_END],
    startLine: SECTION_START_LINE,
    endLine: SECTION_END_LINE - 1,
    fragments: FRAGMENTS.map((f) => ({
      name: f.name, moved: f.moved, range: [f.start, f.end], chars: f.chars, sha256: f.sha256,
    })),
    separatorAt: SEPARATOR_AT,
    weavePoints: [WEAVE_1, WEAVE_2],
    chars: MODULE.length,
    utf8Bytes: Buffer.byteLength(MODULE, 'utf8'),
    lf: countLiteral(MODULE, '\n'),
    sha256: sha256(MODULE),
    owners: OWNER_COUNT,
    firstOwner: OWNER_NAMES[0],
    lastOwner: OWNER_NAMES[OWNER_COUNT - 1],
    declarationChars: DECLARATION_CHARS,
    declarationsOnly: true,
    evaluatesBeforeDependencies: true,
    freeDependencies: EXPECTED_DEPENDENCIES.length,
    mcxStateOwnedByModule: MCX_STATE_OWNERS.length,
    mcxStateReadAcrossBoundary: 0,
    effects: EXPECTED_EFFECTS,
  },
  retainedGlue: {
    chars: GLUE_CHARS,
    utf8Bytes: GLUE_UTF8,
    lf: GLUE_LF,
    sha256: GLUE_SHA256,
    declares: ['_mcxResizeTimer'],
    rationale: '_mcxResizeTimer is listener-private: declared once, referenced only by this listener. ' +
               'Moving it would create a cross-boundary mutable-state write for no gain.',
  },
  consumers: { javascript: JS_CONSUMERS, markup: MARKUP_CONSUMERS },
  extractionContract: {
    productionFiles: ['index.html', MODULE_REL],
    permanentContract: CONTRACT_REL,
    undoHelper: UNDO_REL,
    replacedAudit: AUDIT_REL,
    indexChars: INDEX.length,
    indexUtf8Bytes: Buffer.byteLength(INDEX, 'utf8'),
    indexLf: countLiteral(INDEX, '\n'),
    indexSha256: sha256(INDEX),
    localScriptCount: LOCAL_SCRIPT_COUNT,
    contractsToAdvance,
  },
  relocationOnly: true,
};

console.log('\nMCX_CHARTS_BOUNDARY_BEGIN');
console.log(JSON.stringify(report, null, 2));
console.log('MCX_CHARTS_BOUNDARY_END');
console.log('\n' + pass + ' assertions passed');
console.log('MCX_CHARTS_BOUNDARY_OK');
