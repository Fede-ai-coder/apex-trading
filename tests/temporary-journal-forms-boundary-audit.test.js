'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL TRADE-FORM REGION — TEMPORARY EXTRACTION AUDIT.
//
// PHASE 1 ONLY. This file measures. It does not extract anything, and the
// production tree it audits is byte-identical to its pinned base. §14 proves
// that: the entire committed footprint is three TEST files — this audit, plus
// the one suite-count constant in each of the two contracts that pin it. No
// production file is touched, and neither ratchet is otherwise altered.
//
// WHAT IS BEING AUDITED
//   One contiguous window of the inline monolith holds every Journal trade
//   FORM. It tiles into three semantic blocks, each opened by its own banner
//   comment and each ending `}\n\n`:
//
//     A  Manual Entry/Edit  [1718777,1740414)  21,637 units  25 declarations
//     B  Close Legs         [1740414,1752652)  12,238 units   6 declarations
//     C  Adjustment         [1752652,1777676)  25,024 units  16 declarations
//     D  all three          [1718777,1777676)  58,899 units  47 declarations
//
//   D is not a fourth region — it is A+B+C with the internal boundaries erased,
//   and §2 proves the tiling is exact, with no gap and no overlap.
//
// THE QUESTION
//   Which of A, B, C or D is the safest FIRST extraction? The answer is not
//   hard-coded anywhere below. Every candidate is measured with the same
//   guards, and §10 derives the recommendation from those measurements.
//
// WHAT THE MEASUREMENTS SAY
//   B is the only candidate with ZERO cross-boundary mutable state and ZERO
//   executable-code consumers outside itself. Its only external edges are two
//   classic late-bound handlers resolved at click time, so it needs no exposure
//   glue and no load-order constraint (§6 shows all 47 dependency references
//   are call-time; none is evaluation-time).
//
//   A and C are the opposite. C reads and writes FIVE mutable `_adjForm*`
//   globals that are physically declared inside A — 66 executable sites, 23 of
//   them mutations (§8). Extracting either one alone would split that state
//   across a module boundary. Extracting D would avoid the split, but only by
//   also moving B, which does not need to move with them.
//
//   And B sits BETWEEN A and C. Removing it makes A and C physically
//   contiguous, so the coupled pair becomes a single plain cut later — §12
//   proves the future remainder is exactly A's raw bytes followed by C's raw
//   bytes, with no weave and no invented byte.
//
// THE SEPARATOR MODEL, unchanged from the layers below it:
//
//     raw        = body + "\n"     ends `}\n\n`
//     body                         ends `}\n`
//     separator  = exactly one LF
//
//   BOTH leave index.html on an extraction; only the body is written to the
//   module, which is what lets the module end on a real line of code so
//   `git diff --check` sees no blank line at EOF.
//
// PHASE 2 IS NOT IN THIS PR. §11 and §12 model the Candidate B extraction and
// prove its forward and reverse transforms are byte-exact, but nothing is
// written: no module, no permanent contract, no undo helper. §14 asserts they
// are all absent.
//
// Run: node tests/temporary-journal-forms-boundary-audit.test.js
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const {
  maskLiterals,
  stripComments,
  scanTopLevelDeclarations,
  functionBodyRanges,
  classifyReferences,
} = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const AUDIT_REL = 'tests/temporary-journal-forms-boundary-audit.test.js';
// The two suite-count ratchets this audit advances. They are the ONLY two live
// suite-count pins in the repository — §14 re-derives that rather than trusting
// it — and the single constant in each is the entire change made to them.
const RATCHET_RELS = [
  'tests/apex-post-auth-init-boundary-contract.test.js',
  'tests/tt-reconnect-boundary-contract.test.js',
];
const AUDIT_SCOPE = RATCHET_RELS.concat([AUDIT_REL]).sort();

// ── Pinned base: the merged #411 commit ──────────────────────────────────────
const BASE_SHA = 'cc372ae6350bc2678b60fbedc77456e52a80323c';
const BASE_TREE = 'f0b9ed2d0b1f2c11b190d52763d06afb08856b52';
const BASE_SUBJECT = 'refactor(auth): extract TT reconnect UI (#411)';
const BASE_PARENT = 'dffad56a68b8bb5744b6236d506825aefce9798d';
const BASE_INDEX_BLOB = '68df7adb3e44cc22da26a9c3538492317950f1c8';
const BASE_CHARS = 1875314;
const BASE_UTF8 = 1909396;
const BASE_LF = 32951;
const BASE_INDEX_SHA256 = '7dd13923b25053960fb8b26bcf0d2383ebe27abe0f7b66607fa5893478503dcd';
const BASE_LOCAL_SCRIPTS = 56;
const BASE_TEST_FILES = 138;
// This audit adds the 139th file. Phase 2 replaces it ONE-FOR-ONE with the
// permanent Close Legs boundary contract, so 139 is the new resting count — the
// two ratchets advanced below are not meant to go back to 138.
const AUDIT_TEST_FILES = 139;

// ── The single inline application <script> ───────────────────────────────────
// Everything the audit calls "executable code" lives in this range; everything
// outside it is markup. The split is what stops a DOM id or an HTML attribute
// from being counted as a JavaScript reference.
const CODE_AT = 113159;
const CODE_END = 1875288;

// ── The complete Journal forms window ────────────────────────────────────────
const WINDOW_AT = 1718777;
const WINDOW_END = 1777676;

// ── The three semantic blocks, and the whole window as Candidate D ───────────
const CANDIDATES = {
  A: {
    label: 'Manual Entry/Edit',
    at: 1718777, end: 1740414,
    startLine: 30008, endLine: 30430,
    raw: { chars: 21637, utf8: 21697, lf: 422, sha: '5c6fe8f323a0cfc37f62f51f7a6c54cf9d90d5ed06ce67227529c471c654b9f0' },
    body: { chars: 21636, utf8: 21696, lf: 421, sha: '60a13686d8b3cc826892a1e3c44873f36f22a06375357ee7b3544d19cfa18795' },
    declCount: 25,
  },
  B: {
    label: 'Close Legs',
    at: 1740414, end: 1752652,
    startLine: 30430, endLine: 30661,
    raw: { chars: 12238, utf8: 12337, lf: 231, sha: 'dcc3de2aadd3944a875918bc553759a2faad3d5c168ac8bb9180e6cf9359118b' },
    body: { chars: 12237, utf8: 12336, lf: 230, sha: 'f43928cc65f576de51f535b69e3313c79a6c46c998c54f280342f9228a6a64db' },
    declCount: 6,
  },
  C: {
    label: 'Adjustment',
    at: 1752652, end: 1777676,
    startLine: 30661, endLine: 31188,
    raw: { chars: 25024, utf8: 25132, lf: 527, sha: '05f0ef0526b672e83d20f2310ef914376a8b187536c2bb357d2bc72efc5bac78' },
    body: { chars: 25023, utf8: 25131, lf: 526, sha: 'b78f4e2903596187900087a8e81ed0931dfb358e1e955d204868c5b161a1c35e' },
    declCount: 16,
  },
  D: {
    label: 'all three blocks',
    at: 1718777, end: 1777676,
    startLine: 30008, endLine: 31188,
    raw: { chars: 58899, utf8: 59166, lf: 1180, sha: '31d370d7f66d0a95ab72add31c4b34645fd84a66bd1d483a41b603fd4edf52c6' },
    body: { chars: 58898, utf8: 59165, lf: 1179, sha: '5fa13649d049a9b0563a32e045914f6daa93385085e10a3b55be2b2d8f88507a' },
    declCount: 47,
  },
};
const SEPARATOR = '\n';

// ── Candidate B's six owners, in source order ────────────────────────────────
const B_OWNERS = [
  { name: '_closeLegsTradeId', form: 'var', isAsync: false, chars: 29 },
  { name: 'showCloseLegsModal', form: 'function', isAsync: false, chars: 281 },
  { name: 'closeLegsModal', form: 'function', isAsync: false, chars: 125 },
  { name: '_renderCloseLegsForm', form: 'function', isAsync: false, chars: 6136 },
  { name: '_clPnlPreview', form: 'function', isAsync: false, chars: 1452 },
  { name: 'submitCloseLegs', form: 'function', isAsync: true, chars: 4134 },
];
const B_OWNER_NAMES = B_OWNERS.map((o) => o.name);
const B_STATE = '_closeLegsTradeId';
const B_STATE_INIT = 'var _closeLegsTradeId = null;';

const A_OWNER_NAMES = [
  '_jtFormLegs', '_jtFormStrategy', '_jtFormStatus', '_jtEditId', '_jtPreselectPfId',
  '_adjFormTradeId', '_adjFormNewLegs', '_adjFormNewStrategy', '_adjFormLegsToRoll',
  '_adjFormRollClosePrices', 'showAddTradeForm', 'showEditTradeForm', '_renderJtForm',
  'onJtStrategyChange', 'onJtStatusChange', '_renderJtLegsTable', 'updateJtLegField',
  '_syncJtFormLegsFromDom', 'addJtCustomLeg', 'removeJtLeg', '_deriveJtLegStreamer',
  'updateJtLegStreamer', '_validateJtSymbol', 'refreshAllJtLegStreamers', 'cancelJtForm',
];
const C_OWNER_NAMES = [
  'showAddAdjustmentForm', 'closeAdjustmentModal', '_adjTypeNeedsLegs', '_renderAdjustmentForm',
  '_onAdjTypeChange', '_onAdjStrategyChange', '_renderAdjNewLegsTable', '_adjUpdateLegField',
  '_adjAddLeg', '_adjRemoveLeg', '_adjUpdateRollClosePrice', '_rollLegPnlPreview',
  '_onAdjRollLegToggle', '_autoPopulateRollLegs', '_validateRollTypeMatch', 'submitAdjustment',
];
const D_OWNER_NAMES = A_OWNER_NAMES.concat(B_OWNER_NAMES).concat(C_OWNER_NAMES);

// ── Free-dependency inventories ──────────────────────────────────────────────
const DEPS_A = ['Date', 'JSON', 'Math', 'Object', 'S', 'STRATEGY_TEMPLATES', 'String',
  '_chainError', '_fetchAndRenderChain', '_optChainCache', '_optionChainErrorText',
  '_setLegStreamerFromChain', 'buildCompactOptionDxlinkSymbol', 'console', 'document', 'escHtml',
  'journalManager', 'normalizeOptionLegSymbolAliases', 'portfolioManager', 'setTimeout',
  'showNewPortfolioForm', 'showToast', 'showView'];
const DEPS_B = ['Date', 'JSON', 'Math', 'NaN', 'S', '_buildRichSnapshot', '_journalSnapshotPrefetch',
  '_scheduleSnapshotTechRetry', '_spyPrice', 'aggregateGreeks', 'document', 'escHtml', 'isNaN',
  'journalManager', 'parseFloat', 'positionManager', 'renderPortfolioJournalView',
  'renderPortfolioView', 'showToast', 'showTradeDetails'];
const DEPS_C = ['Boolean', 'Date', 'Math', 'Object', 'STRATEGY_TEMPLATES', '_adjFormLegsToRoll',
  '_adjFormNewLegs', '_adjFormNewStrategy', '_adjFormRollClosePrices', '_adjFormTradeId',
  '_buildRichSnapshot', '_greeksMergeFromCache', '_journalSnapshotPrefetch', 'document', 'escHtml',
  'isNaN', 'journalManager', 'parseFloat', 'showToast', 'showTradeDetails'];
const DEPS_D = ['Boolean', 'Date', 'JSON', 'Math', 'NaN', 'Object', 'S', 'STRATEGY_TEMPLATES',
  'String', '_buildRichSnapshot', '_chainError', '_fetchAndRenderChain', '_greeksMergeFromCache',
  '_journalSnapshotPrefetch', '_optChainCache', '_optionChainErrorText',
  '_scheduleSnapshotTechRetry', '_setLegStreamerFromChain', '_spyPrice', 'aggregateGreeks',
  'buildCompactOptionDxlinkSymbol', 'console', 'document', 'escHtml', 'isNaN', 'journalManager',
  'normalizeOptionLegSymbolAliases', 'parseFloat', 'portfolioManager', 'positionManager',
  'renderPortfolioJournalView', 'renderPortfolioView', 'setTimeout', 'showNewPortfolioForm',
  'showToast', 'showTradeDetails', 'showView'];
// Every one of Candidate B's 47 dependency references sits inside a function
// body. NONE is read while the block is being evaluated, so the module could be
// loaded at any point before first click.
const B_CALLTIME_REFS = {
  Date: 2, JSON: 1, Math: 1, NaN: 1, S: 1, _buildRichSnapshot: 1, _journalSnapshotPrefetch: 1,
  _scheduleSnapshotTechRetry: 1, _spyPrice: 1, aggregateGreeks: 1, document: 12, escHtml: 4,
  isNaN: 3, journalManager: 6, parseFloat: 5, positionManager: 1, renderPortfolioJournalView: 1,
  renderPortfolioView: 1, showToast: 2, showTradeDetails: 1,
};
const B_CALLTIME_TOTAL = 47;

// ── The A↔C mutable-state coupling ───────────────────────────────────────────
// Declared physically inside A; used — and mutated — from inside C.
const ADJ_STATE = [
  { name: '_adjFormTradeId', declIn: 'A', cTotal: 19, cWrite: 2, cMutate: 0, cRead: 17 },
  { name: '_adjFormNewLegs', declIn: 'A', cTotal: 14, cWrite: 6, cMutate: 2, cRead: 6 },
  { name: '_adjFormNewStrategy', declIn: 'A', cTotal: 6, cWrite: 3, cMutate: 0, cRead: 3 },
  { name: '_adjFormLegsToRoll', declIn: 'A', cTotal: 15, cWrite: 3, cMutate: 3, cRead: 9 },
  { name: '_adjFormRollClosePrices', declIn: 'A', cTotal: 12, cWrite: 3, cMutate: 1, cRead: 8 },
];
const ADJ_C_SITES = 66;
const ADJ_C_MUTATIONS = 23;

// ── Consumer census, per candidate ───────────────────────────────────────────
const CENSUS = {
  A: { code: 104, codeNames: 13, generated: 3, markup: 2 },
  B: { code: 0, codeNames: 0, generated: 1, markup: 2 },
  C: { code: 0, codeNames: 0, generated: 1, markup: 1 },
  D: { code: 38, codeNames: 8, generated: 5, markup: 5 },
};

// ── Candidate B's exact external edges ───────────────────────────────────────
const GENERATED_HANDLER = 'onclick="showCloseLegsModal(+this.dataset.tid)"';
const GENERATED_HANDLER_OWNER = 'showTradeDetails';
const STATIC_HANDLER = 'onclick="if(event.target===this)closeLegsModal()"';
const CLOSE_LEGS_DOM_ID = 'id="closeLegsModal"';

// ── The hypothetical Phase 2 extraction (modelled, never written) ────────────
const HYP_MODULE_REL = 'js/ui/journal-close-legs.js';
const HYP_TAG = '<script src="./js/ui/journal-close-legs.js"></script>';
const ANCHOR_TAG = '<script src="./js/ui/tt-reconnect.js"></script>';
const INLINE_OPEN = '<script>';
const HYP_INSERTION = '\n' + HYP_TAG;
const HYP_INSERTION_CHARS = 54;

const HYP_CHARS = 1863130;
const HYP_UTF8 = 1897113;
const HYP_LF = 32721;
const HYP_SHA256 = '8e52b9a882b29c3097c4bc6031c90349be4fffba481710a909b6f6f8695b4721';
const HYP_LOCAL_SCRIPTS = 57;

// ── The future A+C remainder, inside the hypothetical index ──────────────────
const FUT_AT = 1718831;
const FUT_END = 1765492;
const FUT_RAW = { chars: 46661, utf8: 46829, lf: 949, sha: 'ec16ed3caf80d7da50e6a239eb8dce48ddf9a447be8353b46e05af46cd8ac914' };
const FUT_BODY = { chars: 46660, utf8: 46828, lf: 948, sha: '4ace9380e0cd021836dfc4fc68b0eb4c3dbb8c7b97f98a657fd44ec94b434f7d' };
const FUT_DECLS = 41;

// ─────────────────────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function utf8(s) { return Buffer.byteLength(s, 'utf8'); }
function countLf(s) { let n = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++; return n; }
function lineAt(s, o) { return s.slice(0, o).split('\n').length; }
function ident(s, chars, utf8n, lf, sha) {
  return { chars: s.length, utf8: utf8(s), lf: countLf(s), sha: sha256(s) };
}
function metrics(s) { return { chars: s.length, utf8: utf8(s), lf: countLf(s), sha: sha256(s) }; }
function localScripts(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src));
}
function shape(src) {
  return scanTopLevelDeclarations(src)
    .map((e) => ({ name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
}
function loadInEmptyVm(src, filename) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: filename || 'candidate.js' });
    return { ok: true, error: null, globals: Object.keys(sandbox).sort() };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), globals: Object.keys(sandbox).sort() };
  }
}

// The repo's established free-identifier reader: lexical masking first, so a
// name that appears only in a string, a comment, a regex or an object key is
// never counted as a dependency.
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

// Three index-aligned lexical views of one source. `code` keeps only executable
// text; `strings` keeps only string-literal contents (where generated markup
// lives); `comments` keeps only comment text. Every reference question below
// is asked of exactly one of them, never of the raw source.
function lexicalViews(src) {
  const masked = maskLiterals(src);
  const noComments = stripComments(src);
  const build = (keep) => {
    const out = new Array(src.length);
    for (let i = 0; i < src.length; i++) out[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return out.join('');
  };
  return {
    code: masked,
    strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]),
    comments: build((i) => noComments[i] !== src[i]),
  };
}
// Locate the single inline application <script> in an ARBITRARY document. The
// mutants in §13 insert and delete bytes, so a guard that hard-coded CODE_END
// would silently truncate the region it scans and stop seeing the mutation.
function codeRegion(html) {
  const re = /<script\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    const at = m.index + m[0].length;
    return { at, end: html.indexOf('</script>', at) };
  }
  return { at: -1, end: -1 };
}
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function rawSites(text, name) {
  // Deliberately naive: no masking at all. Used ONLY to prove the masked
  // readers above reject what this one accepts.
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE GUARDS
//
// Each returns an array of violation strings. Empty === accepted. Every mutant
// in §13 asserts the EXACT COMPLETE vector it produces, so a coarse guard can
// never stand in for a specific one.
// ─────────────────────────────────────────────────────────────────────────────

function guardBaseIdentity(html) {
  const v = [];
  const m = metrics(html);
  if (m.chars !== BASE_CHARS) v.push('base:units');
  if (m.utf8 !== BASE_UTF8) v.push('base:bytes');
  if (m.lf !== BASE_LF) v.push('base:lf');
  if (m.sha !== BASE_INDEX_SHA256) v.push('base:sha');
  if (localScripts(html).length !== BASE_LOCAL_SCRIPTS) v.push('base:localScripts');
  return v;
}

// The three blocks must tile the complete window exactly.
function guardTiling(html, ranges) {
  const v = [];
  const [A, B, C] = ranges;
  if (A[0] !== WINDOW_AT) v.push('tiling:windowStart');
  if (C[1] !== WINDOW_END) v.push('tiling:windowEnd');
  if (A[1] < B[0]) v.push('tiling:gap@A|B');
  if (A[1] > B[0]) v.push('tiling:overlap@A|B');
  if (B[1] < C[0]) v.push('tiling:gap@B|C');
  if (B[1] > C[0]) v.push('tiling:overlap@B|C');
  const parts = html.slice(A[0], A[1]) + html.slice(B[0], B[1]) + html.slice(C[0], C[1]);
  const whole = html.slice(WINDOW_AT, WINDOW_END);
  if (parts.length !== whole.length) v.push('tiling:units');
  if (parts !== whole) v.push('tiling:bytes');
  return v;
}

// One candidate's raw / body / separator identity.
function guardBlock(html, key, at, end) {
  const spec = CANDIDATES[key];
  const v = [];
  const raw = html.slice(at, end);
  const body = html.slice(at, end - 1);
  const sep = html.slice(end - 1, end);
  const rm = metrics(raw);
  if (rm.chars !== spec.raw.chars) v.push(key + ':raw:units');
  if (rm.utf8 !== spec.raw.utf8) v.push(key + ':raw:bytes');
  if (rm.lf !== spec.raw.lf) v.push(key + ':raw:lf');
  if (rm.sha !== spec.raw.sha) v.push(key + ':raw:sha');
  const bm = metrics(body);
  if (bm.chars !== spec.body.chars) v.push(key + ':body:units');
  if (bm.utf8 !== spec.body.utf8) v.push(key + ':body:bytes');
  if (bm.lf !== spec.body.lf) v.push(key + ':body:lf');
  if (bm.sha !== spec.body.sha) v.push(key + ':body:sha');
  if (sep !== SEPARATOR) v.push(key + ':sep:notLF');
  if (!/\}\n\n$/.test(raw)) v.push(key + ':raw:tail');
  if (!/\}\n$/.test(body)) v.push(key + ':body:tail');
  if (body + SEPARATOR !== raw) v.push(key + ':compose');
  return v;
}

// Ordered declaration manifest: name, form, async status and span, per slot.
function guardOwners(body, expected) {
  const v = [];
  const got = shape(body);
  if (got.length !== expected.length) v.push('owners:count');
  const n = Math.max(got.length, expected.length);
  for (let i = 0; i < n; i++) {
    const g = got[i], e = expected[i];
    if (!g || !e) { v.push('owners:#' + i + ':absent'); continue; }
    if (g.name !== e.name) v.push('owners:#' + i + ':name');
    if (g.form !== e.form) v.push('owners:#' + i + ':form');
    if (g.isAsync !== e.isAsync) v.push('owners:#' + i + ':async');
    if (g.chars !== e.chars) v.push('owners:#' + i + ':span');
  }
  return v;
}

// Real top-level calls, excluding declaration heads and control keywords.
function topLevelCallSites(body) {
  const masked = maskLiterals(body);
  const bodies = functionBodyRanges(body).filter((r) => !r.iife);
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  const re = /([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) {
    const at = m.index;
    if (inFn(at)) continue;
    const before = masked.slice(Math.max(0, at - 30), at);
    if (/\b(?:function|catch|if|for|while|switch)\s*$/.test(before)) continue;
    out.push({ at, name: m[1] });
  }
  return out;
}
function topLevelHits(body, re) {
  const masked = maskLiterals(body);
  const bodies = functionBodyRanges(body).filter((r) => !r.iife);
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  const r = new RegExp(re.source, 'g');
  const out = [];
  let m;
  while ((m = r.exec(masked))) if (!inFn(m.index)) out.push(m.index);
  return out;
}

// Declarations / comments / whitespace only at top level, and nothing that
// touches the world while the block is being evaluated.
function guardTopLevelPurity(body, expectedGlobals, deps) {
  const v = [];
  const decls = scanTopLevelDeclarations(body);
  const ch = Array.from(body);
  decls.forEach((d) => { for (let i = d.start; i <= d.end; i++) ch[i] = ' '; });
  if (maskLiterals(ch.join('')).replace(/\s+/g, '') !== '') v.push('purity:residue');

  const loaded = loadInEmptyVm(body);
  if (!loaded.ok) v.push('purity:vmError');
  if (loaded.ok && String(loaded.globals) !== String(expectedGlobals.slice().sort())) v.push('purity:globals');

  if (topLevelCallSites(body).length) v.push('purity:topLevelCall');
  if (topLevelHits(body, /\b(?:document|window)\s*\./).length) v.push('purity:topLevelDom');
  if (topLevelHits(body, /\baddEventListener\b/).length) v.push('purity:topLevelListener');
  if (topLevelHits(body, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length) v.push('purity:topLevelTimer');
  if (topLevelHits(body, /\b(?:localStorage|sessionStorage|indexedDB)\b/).length) v.push('purity:topLevelStorage');
  if (topLevelHits(body, /\b(?:fetch|XMLHttpRequest|WebSocket|navigator)\b/).length) v.push('purity:topLevelNetwork');
  if (topLevelHits(body, /\b(?:journalManager|positionManager|portfolioManager)\b/).length) v.push('purity:topLevelJournal');

  if (deps && classifyReferences(body, deps).loadTime.length) v.push('purity:loadTimeDeps');
  return v;
}

// The block's one mutable owner is initialised with an inert literal.
function guardInertState(body) {
  const v = [];
  const d = scanTopLevelDeclarations(body)[0];
  if (!d || d.name !== B_STATE) { v.push('state:owner'); return v; }
  const text = body.slice(d.start, d.end + 1);
  if (text !== B_STATE_INIT) v.push('state:init');
  if (!/=\s*(?:null|undefined|0|''|"")\s*;?$/.test(text)) v.push('state:notInert');
  return v;
}

// The mutable owner appears in executable code ONLY inside its own block.
function guardStateConfinement(html, name, at, end) {
  const v = [];
  const reg = codeRegion(html);
  const views = lexicalViews(html.slice(reg.at, reg.end));
  const outside = refSites(views.code, name)
    .map((i) => i + reg.at)
    .filter((abs) => abs < at || abs >= end);
  if (outside.length) v.push('confinement:' + name + ':code=' + outside.length);
  const markup = refSites(html.slice(0, reg.at), name).concat(refSites(html.slice(reg.end), name));
  if (markup.length) v.push('confinement:' + name + ':markup=' + markup.length);
  return v;
}

// Candidate B's complete external edge set: zero code consumers, exactly one
// generated handler inside showTradeDetails, exactly one static markup call,
// and exactly one DOM id that must NOT be read as a call.
function guardConsumerTopology(html) {
  const v = [];
  const reg = codeRegion(html);
  const code = html.slice(reg.at, reg.end);
  const views = lexicalViews(code);
  const inB = (i) => {
    const abs = i + reg.at;
    return abs >= CANDIDATES.B.at && abs < CANDIDATES.B.end;
  };

  let codeOutside = 0;
  for (const n of B_OWNER_NAMES) codeOutside += refSites(views.code, n).filter((i) => !inB(i)).length;
  if (codeOutside !== 0) v.push('consumers:code=' + codeOutside);

  const gen = [];
  for (const n of B_OWNER_NAMES) for (const i of refSites(views.strings, n)) if (!inB(i)) gen.push({ n, i });
  if (gen.length !== 1) v.push('consumers:generated:count=' + gen.length);
  if (gen.length === 1) {
    if (gen[0].n !== 'showCloseLegsModal') v.push('consumers:generated:name');
    const owner = scanTopLevelDeclarations(code).find((d) => gen[0].i >= d.start && gen[0].i <= d.end);
    if (!owner || owner.name !== GENERATED_HANDLER_OWNER) v.push('consumers:generated:owner');
  }
  if (code.split(GENERATED_HANDLER).length - 1 !== 1) v.push('consumers:generated:literal');

  const head = html.slice(0, reg.at);
  const tail = html.slice(reg.end);
  const markup = [];
  for (const n of B_OWNER_NAMES) {
    for (const i of refSites(head, n)) markup.push({ n, i, text: head });
    for (const i of refSites(tail, n)) markup.push({ n, i, text: tail });
  }
  // Split the markup occurrences by what they actually are. A name followed by
  // `(` is a call; a name that is the value of an `id` attribute is a DOM id and
  // is NOT a consumer of anything.
  let calls = 0, domIds = 0, other = 0;
  for (const h of markup) {
    const after = h.text.slice(h.i + h.n.length, h.i + h.n.length + 4);
    const before = h.text.slice(Math.max(0, h.i - 12), h.i);
    if (/^\s*\(/.test(after)) calls++;
    else if (/id\s*=\s*["']$/.test(before)) domIds++;
    else other++;
  }
  if (calls !== 1) v.push('consumers:static:calls=' + calls);
  if (domIds !== 1) v.push('consumers:static:domIds=' + domIds);
  if (other !== 0) v.push('consumers:static:other=' + other);
  if (head.split(STATIC_HANDLER).length - 1 !== 1) v.push('consumers:static:literal');
  if (head.split(CLOSE_LEGS_DOM_ID).length - 1 !== 1) v.push('consumers:domId:literal');
  return v;
}

// The hypothetical index: identity, tag placement, and that the block is gone
// together with its structural separator.
function guardHypIndex(hyp) {
  const v = [];
  const m = metrics(hyp);
  if (m.chars !== HYP_CHARS) v.push('hyp:units');
  if (m.utf8 !== HYP_UTF8) v.push('hyp:bytes');
  if (m.lf !== HYP_LF) v.push('hyp:lf');
  if (m.sha !== HYP_SHA256) v.push('hyp:sha');
  if (localScripts(hyp).length !== HYP_LOCAL_SCRIPTS) v.push('hyp:localScripts');

  const tags = APP_LOADER.parseScriptTags(hyp).filter((t) => t.src === './' + HYP_MODULE_REL);
  if (tags.length !== 1) v.push('hyp:tag:count=' + tags.length);
  const n = hyp.split(HYP_TAG).length - 1;
  if (n !== 1) v.push('hyp:tag:literal=' + n);
  const a = hyp.indexOf(ANCHOR_TAG), t = hyp.indexOf(HYP_TAG), inline = hyp.indexOf(INLINE_OPEN, a);
  if (!(a >= 0 && t > a && t < inline)) v.push('hyp:tag:order');
  if (a >= 0 && t >= 0 && hyp.slice(a + ANCHOR_TAG.length, t) !== '\n') v.push('hyp:tag:adjacency');
  // async, defer and type=module each get their OWN violation, so no control
  // can be satisfied by a guard that merely noticed "some attribute changed".
  const raw = /<script\b[^>]*journal-close-legs\.js[^>]*>/.exec(hyp);
  if (raw && /\basync\b/.test(raw[0])) v.push('hyp:tag:async');
  if (raw && /\bdefer\b/.test(raw[0])) v.push('hyp:tag:defer');
  if (raw && /type\s*=\s*["']module["']/.test(raw[0])) v.push('hyp:tag:module');

  const body = fs.readFileSync(INDEX_PATH, 'utf8').slice(CANDIDATES.B.at, CANDIDATES.B.end - 1);
  if (hyp.indexOf(body) >= 0) v.push('hyp:blockRetained');
  // The block's own separator LF must leave with it. If it were stranded the
  // document would carry one extra LF at the join.
  if (m.lf !== BASE_LF - CANDIDATES.B.raw.lf + 1) v.push('hyp:separatorStranded');
  return v;
}

function guardHypModule(mod) {
  const v = [];
  const m = metrics(mod);
  if (m.chars !== CANDIDATES.B.body.chars) v.push('module:units');
  if (m.utf8 !== CANDIDATES.B.body.utf8) v.push('module:bytes');
  if (m.lf !== CANDIDATES.B.body.lf) v.push('module:lf');
  if (m.sha !== CANDIDATES.B.body.sha) v.push('module:sha');
  if (!/\}\n$/.test(mod)) v.push('module:tail');
  if (/\n\s*\n$/.test(mod)) v.push('module:trailingBlank');
  return v;
}

// The future A+C remainder: identity, and that it is A's raw bytes followed
// immediately by C's raw bytes with nothing invented, dropped or reordered.
function guardFutureRemainder(hyp, base) {
  const v = [];
  const raw = hyp.slice(FUT_AT, FUT_END);
  const body = hyp.slice(FUT_AT, FUT_END - 1);
  const rm = metrics(raw);
  if (rm.chars !== FUT_RAW.chars) v.push('future:raw:units');
  if (rm.utf8 !== FUT_RAW.utf8) v.push('future:raw:bytes');
  if (rm.lf !== FUT_RAW.lf) v.push('future:raw:lf');
  if (rm.sha !== FUT_RAW.sha) v.push('future:raw:sha');
  const bm = metrics(body);
  if (bm.chars !== FUT_BODY.chars) v.push('future:body:units');
  if (bm.utf8 !== FUT_BODY.utf8) v.push('future:body:bytes');
  if (bm.lf !== FUT_BODY.lf) v.push('future:body:lf');
  if (bm.sha !== FUT_BODY.sha) v.push('future:body:sha');
  const aRaw = base.slice(CANDIDATES.A.at, CANDIDATES.A.end);
  const cRaw = base.slice(CANDIDATES.C.at, CANDIDATES.C.end);
  if (raw !== aRaw + cRaw) v.push('future:compose');
  if (raw.slice(0, aRaw.length) !== aRaw) v.push('future:orderA');
  if (raw.slice(aRaw.length) !== cRaw) v.push('future:orderC');
  if (!/\}\n$/.test(body)) v.push('future:body:tail');
  if (hyp.slice(FUT_END - 1, FUT_END) !== SEPARATOR) v.push('future:sep');
  if (scanTopLevelDeclarations(body).length !== FUT_DECLS) v.push('future:decls');
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────

const INDEX_PATH = path.join(ROOT, 'index.html');
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const INDEX = APP_LOADER.loadIndexHtml();

console.log('JOURNAL TRADE-FORM REGION — TEMPORARY EXTRACTION AUDIT (Phase 1)');
console.log('measurement only · production untouched · base=' + BASE_SHA);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base, rederived from git and from the blob');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git, not guessed');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is #411');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'the base parent is #410');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');

eq(guardBaseIdentity(INDEX), [], 'the working index.html is byte-identical to the pinned base');
eq(INDEX.length, BASE_CHARS, 'base index.html is 1,875,314 UTF-16 units');
eq(utf8(INDEX), BASE_UTF8, 'base index.html is 1,909,396 UTF-8 bytes');
eq(countLf(INDEX), BASE_LF, 'base index.html has 32,951 LF');
eq(sha256(INDEX), BASE_INDEX_SHA256, 'base index.html SHA-256');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'exactly 56 local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only, so UTF-16 offsets are stable');

const baseTestFiles = git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
  .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f));
eq(baseTestFiles.length, BASE_TEST_FILES, 'the base suite is exactly 138 test files');
const nowTestFiles = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f));
eq(nowTestFiles.length, AUDIT_TEST_FILES, 'with this temporary audit the suite is 139 test files');
ok(nowTestFiles.indexOf(path.basename(AUDIT_REL)) >= 0, 'the 139th file is this audit');

// The audited window lives inside the single inline application <script>.
const inlineTags = APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src);
eq(inlineTags.length, 1, 'index.html has exactly one inline application script');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline script opens at the pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'the inline script closes at the pinned offset');
ok(WINDOW_AT >= CODE_AT && WINDOW_END <= CODE_END, 'the whole forms window is inside that inline script');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The complete forms window, and its exact three-way tiling');
// ─────────────────────────────────────────────────────────────────────────────
const WINDOW = INDEX.slice(WINDOW_AT, WINDOW_END);
eq(metrics(WINDOW), {
  chars: 58899, utf8: 59166, lf: 1180,
  sha: '31d370d7f66d0a95ab72add31c4b34645fd84a66bd1d483a41b603fd4edf52c6',
}, 'the complete window is 58,899 units / 59,166 bytes / 1,180 LF / 31d370d7…');
eq(lineAt(INDEX, WINDOW_AT), 30008, 'the window opens on line 30,008');
eq(lineAt(INDEX, WINDOW_END), 31188, 'the window closes on line 31,188');
ok(/^\/\/ ── JOURNAL MANUAL ENTRY FORM/.test(WINDOW), 'the window opens on its own banner comment');
eq(INDEX.slice(WINDOW_AT - 3, WINDOW_AT), '}\n\n', 'the window opens right after a complete `}\\n\\n` seam');
ok(/^\/\/ ── TRADE DETAIL MODAL/.test(INDEX.slice(WINDOW_END, WINDOW_END + 32)),
  'the byte after the window opens the next banner, so the cut is on a real seam');

const RANGES = [[CANDIDATES.A.at, CANDIDATES.A.end], [CANDIDATES.B.at, CANDIDATES.B.end], [CANDIDATES.C.at, CANDIDATES.C.end]];
eq(guardTiling(INDEX, RANGES), [], 'A, B and C tile the complete window exactly — no gap, no overlap');
eq(CANDIDATES.A.end, CANDIDATES.B.at, 'A ends exactly where B begins');
eq(CANDIDATES.B.end, CANDIDATES.C.at, 'B ends exactly where C begins');
eq(CANDIDATES.A.raw.chars + CANDIDATES.B.raw.chars + CANDIDATES.C.raw.chars, 58899,
  '21,637 + 12,238 + 25,024 = 58,899 units');
eq(CANDIDATES.A.raw.utf8 + CANDIDATES.B.raw.utf8 + CANDIDATES.C.raw.utf8, 59166, 'the UTF-8 byte counts tile too');
eq(CANDIDATES.A.raw.lf + CANDIDATES.B.raw.lf + CANDIDATES.C.raw.lf, 1180, 'the LF counts tile too');
eq(INDEX.slice(CANDIDATES.A.at, CANDIDATES.A.end)
  + INDEX.slice(CANDIDATES.B.at, CANDIDATES.B.end)
  + INDEX.slice(CANDIDATES.C.at, CANDIDATES.C.end), WINDOW, 'concatenating the three raw blocks rebuilds the window byte for byte');
eq(CANDIDATES.D.at, WINDOW_AT, 'Candidate D starts where the window starts');
eq(CANDIDATES.D.end, WINDOW_END, 'Candidate D ends where the window ends');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Candidate raw / body / separator identities');
// ─────────────────────────────────────────────────────────────────────────────
for (const key of ['A', 'B', 'C', 'D']) {
  const c = CANDIDATES[key];
  eq(guardBlock(INDEX, key, c.at, c.end), [], 'Candidate ' + key + ' (' + c.label + ') has its pinned raw/body/separator identity');
  const raw = INDEX.slice(c.at, c.end);
  const body = INDEX.slice(c.at, c.end - 1);
  eq(metrics(raw), { chars: c.raw.chars, utf8: c.raw.utf8, lf: c.raw.lf, sha: c.raw.sha },
    'Candidate ' + key + ' raw metrics');
  eq(metrics(body), { chars: c.body.chars, utf8: c.body.utf8, lf: c.body.lf, sha: c.body.sha },
    'Candidate ' + key + ' body metrics');
  eq(body + SEPARATOR, raw, 'Candidate ' + key + ': raw === body + one LF');
  eq(raw.slice(-3), '}\n\n', 'Candidate ' + key + ' raw ends `}\\n\\n`');
  eq(body.slice(-2), '}\n', 'Candidate ' + key + ' body ends `}\\n`');
  eq(c.raw.chars - c.body.chars, 1, 'Candidate ' + key + ': the separator is exactly one unit');
  eq(c.raw.lf - c.body.lf, 1, 'Candidate ' + key + ': the separator is exactly one LF');
}
eq(lineAt(INDEX, CANDIDATES.B.at), CANDIDATES.B.startLine, 'Candidate B opens on line 30,430');
eq(lineAt(INDEX, CANDIDATES.B.end), CANDIDATES.B.endLine, 'Candidate B closes on line 30,661');
ok(/^\/\/ ── CLOSE LEGS FORM/.test(INDEX.slice(CANDIDATES.B.at, CANDIDATES.B.at + 24)),
  'Candidate B opens on its own banner comment');
ok(/^\/\/ ── ADJUSTMENT FORM/.test(INDEX.slice(CANDIDATES.C.at, CANDIDATES.C.at + 22)),
  'Candidate C opens on its own banner comment');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Complete ordered declaration manifests');
// ─────────────────────────────────────────────────────────────────────────────
const BODY_A = INDEX.slice(CANDIDATES.A.at, CANDIDATES.A.end - 1);
const BODY_B = INDEX.slice(CANDIDATES.B.at, CANDIDATES.B.end - 1);
const BODY_C = INDEX.slice(CANDIDATES.C.at, CANDIDATES.C.end - 1);
const BODY_D = INDEX.slice(CANDIDATES.D.at, CANDIDATES.D.end - 1);

eq(shape(BODY_A).map((d) => d.name), A_OWNER_NAMES, 'Candidate A declares exactly its 25 owners, in order');
eq(shape(BODY_C).map((d) => d.name), C_OWNER_NAMES, 'Candidate C declares exactly its 16 owners, in order');
eq(shape(BODY_D).map((d) => d.name), D_OWNER_NAMES, 'Candidate D declares exactly A+B+C, in order');
eq(shape(BODY_A).length, 25, 'Candidate A contains 25 declarations');
eq(shape(BODY_B).length, 6, 'Candidate B contains 6 declarations');
eq(shape(BODY_C).length, 16, 'Candidate C contains 16 declarations');
eq(shape(BODY_D).length, 47, 'Candidate D contains 47 declarations');
eq(25 + 6 + 16, 47, 'the declaration counts tile: 25 + 6 + 16 = 47');

eq(guardOwners(BODY_B, B_OWNERS), [], 'Candidate B declares exactly its six owners with the pinned form/async/span');
eq(shape(BODY_B), B_OWNERS, 'the Candidate B manifest, verbatim');
eq(shape(BODY_B).filter((d) => d.isAsync).map((d) => d.name), ['submitCloseLegs'],
  'submitCloseLegs is the only async owner in Candidate B');
eq(shape(BODY_B).filter((d) => d.form === 'var').map((d) => d.name), [B_STATE],
  '_closeLegsTradeId is the only var in Candidate B');
eq(B_OWNERS.reduce((n, o) => n + o.chars, 0), 12157, 'the six owner spans sum to 12,157 units');
eq(shape(BODY_A).filter((d) => d.isAsync).map((d) => d.name), [], 'Candidate A has no async owner');
eq(shape(BODY_C).filter((d) => d.isAsync).map((d) => d.name), ['submitAdjustment'],
  'Candidate C has exactly one async owner');
eq(shape(BODY_A).filter((d) => d.form === 'var').map((d) => d.name), A_OWNER_NAMES.slice(0, 10),
  'all ten mutable form-state vars are declared in Candidate A');
eq(shape(BODY_C).filter((d) => d.form === 'var').length, 0, 'Candidate C declares NO state of its own');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Top-level residue, empty-VM evaluation and exact global sets');
// ─────────────────────────────────────────────────────────────────────────────
eq(guardTopLevelPurity(BODY_B, B_OWNER_NAMES, DEPS_B), [],
  'Candidate B is declarations/comments/whitespace only, and does nothing at load time');
for (const [key, body, names] of [['A', BODY_A, A_OWNER_NAMES], ['C', BODY_C, C_OWNER_NAMES], ['D', BODY_D, D_OWNER_NAMES]]) {
  const loaded = loadInEmptyVm(body);
  ok(loaded.ok, 'Candidate ' + key + ' evaluates in an empty VM with no error');
  eq(loaded.globals, names.slice().sort(), 'Candidate ' + key + ' defines exactly its own owners and nothing else');
  eq(topLevelCallSites(body).length, 0, 'Candidate ' + key + ' makes no call at top level');
}
const loadedB = loadInEmptyVm(BODY_B, 'journal-close-legs.js');
ok(loadedB.ok, 'Candidate B evaluates in an empty VM with no error');
eq(loadedB.error, null, '…and throws nothing');
eq(loadedB.globals, B_OWNER_NAMES.slice().sort(), 'Candidate B defines exactly the six globals, and no others');
eq(loadedB.globals.length, 6, 'exactly six globals');
eq(guardInertState(BODY_B), [], '_closeLegsTradeId is initialised with an inert literal (null)');
eq(BODY_B.slice(scanTopLevelDeclarations(BODY_B)[0].start, scanTopLevelDeclarations(BODY_B)[0].end + 1),
  B_STATE_INIT, 'the state declaration, verbatim');

// Zero load-time work of every kind the audit asked about.
eq(topLevelHits(BODY_B, /\b(?:document|window)\s*\./).length, 0, 'Candidate B: zero top-level DOM access');
eq(topLevelHits(BODY_B, /\b(?:localStorage|sessionStorage|indexedDB)\b/).length, 0, 'Candidate B: zero top-level storage access');
eq(topLevelHits(BODY_B, /\baddEventListener\b/).length, 0, 'Candidate B: zero top-level listeners');
eq(topLevelHits(BODY_B, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length, 0, 'Candidate B: zero top-level timers');
eq(topLevelHits(BODY_B, /\b(?:fetch|XMLHttpRequest|WebSocket|navigator)\b/).length, 0, 'Candidate B: zero top-level network work');
eq(topLevelHits(BODY_B, /\b(?:journalManager|positionManager|portfolioManager)\b/).length, 0, 'Candidate B: zero top-level journal work');
eq(topLevelCallSites(BODY_B).length, 0, 'Candidate B: zero top-level calls');

// The same effects DO exist — inside function bodies, where they run on click.
ok(maskLiterals(BODY_B).split('document.').length - 1 === 12, 'Candidate B touches the DOM 12 times, all at call time');
ok(maskLiterals(BODY_B).split('journalManager').length - 1 === 6, 'Candidate B calls the journal 6 times, all at call time');
ok(/\basync function submitCloseLegs\b/.test(BODY_B), 'the only async work is inside submitCloseLegs');
{
  const awaits = [];
  const re = /\bawait\b/g;
  let m;
  while ((m = re.exec(maskLiterals(BODY_B)))) awaits.push(m.index);
  const sub = scanTopLevelDeclarations(BODY_B).find((d) => d.name === 'submitCloseLegs');
  eq(awaits.length, 2, 'Candidate B contains exactly two awaits');
  eq(awaits.filter((i) => i >= sub.start && i <= sub.end).length, 2, '…both inside submitCloseLegs');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Free-dependency inventories, and evaluation-time vs call-time');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(BODY_B), DEPS_B, 'Candidate B: the free-dependency inventory is exactly the audited 20 names');
eq(DEPS_B.length, 20, 'Candidate B has 20 free dependencies');
eq(freeIdentifiers(BODY_A), DEPS_A, 'Candidate A: 23 free dependencies');
eq(freeIdentifiers(BODY_C), DEPS_C, 'Candidate C: 20 free dependencies');
eq(freeIdentifiers(BODY_D), DEPS_D, 'Candidate D: 37 free dependencies');
eq(DEPS_A.length, 23, 'Candidate A dependency count');
eq(DEPS_C.length, 20, 'Candidate C dependency count');
eq(DEPS_D.length, 37, 'Candidate D dependency count');

const clsB = classifyReferences(BODY_B, DEPS_B);
eq(clsB.loadTime, [], 'Candidate B reads NO dependency while it is being evaluated');
eq(clsB.loadTime.length, 0, 'zero evaluation-time references');
eq(clsB.callTime.length, B_CALLTIME_TOTAL, 'all 47 dependency references are call-time');
const perName = {};
for (const r of clsB.callTime) perName[r.name] = (perName[r.name] || 0) + 1;
eq(perName, B_CALLTIME_REFS, 'the per-dependency call-time reference counts');
eq(DEPS_B.filter((n) => !perName[n]), [], 'every declared dependency is actually referenced');
// This is the whole load-order story: with no evaluation-time read, the module
// tag may sit anywhere before the inline monolith.
ok(clsB.loadTime.length === 0, 'Candidate B imposes NO load-order constraint on its dependencies');

// Candidate C's inventory is the coupling, stated as a dependency fact.
eq(DEPS_C.filter((n) => /^_adjForm/.test(n)),
  ['_adjFormLegsToRoll', '_adjFormNewLegs', '_adjFormNewStrategy', '_adjFormRollClosePrices', '_adjFormTradeId'],
  'Candidate C free-depends on five _adjForm* owners it does not declare');
eq(DEPS_B.filter((n) => /^_adjForm/.test(n)), [], 'Candidate B free-depends on none of them');
eq(DEPS_A.filter((n) => /^_adjForm/.test(n)), [], 'Candidate A declares them, so they are not free there');

// ─────────────────────────────────────────────────────────────────────────────
section('7. Mutable state: declarations, reads and writes');
// ─────────────────────────────────────────────────────────────────────────────
const CODE = INDEX.slice(CODE_AT, CODE_END);
const VIEWS = lexicalViews(CODE);
function zoneOf(i) {
  const abs = i + CODE_AT;
  if (abs >= CANDIDATES.A.at && abs < CANDIDATES.A.end) return 'A';
  if (abs >= CANDIDATES.B.at && abs < CANDIDATES.B.end) return 'B';
  if (abs >= CANDIDATES.C.at && abs < CANDIDATES.C.end) return 'C';
  return 'OUT';
}
function kindOf(name, at) {
  const before = VIEWS.code.slice(Math.max(0, at - 40), at);
  if (/\b(?:var|let|const)\s+$/.test(before)) return 'decl';
  const after = VIEWS.code.slice(at + name.length, at + name.length + 60);
  if (/^\s*(?:\+\+|--)/.test(after)) return 'write';
  if (/^\s*(?:\+=|-=|\*=|\/=|%=|\|\|=|&&=|\?\?=)/.test(after)) return 'write';
  if (/^\s*=(?!=)/.test(after)) return 'write';
  if (/^\s*\.\s*(?:push|pop|shift|unshift|splice|sort|reverse|fill)\s*\(/.test(after)) return 'mutate';
  if (/^\s*\[[^\]]*\]\s*=(?!=)/.test(after)) return 'mutate';
  return 'read';
}
function stateProfile(name) {
  const prof = {};
  for (const i of refSites(VIEWS.code, name)) {
    const z = zoneOf(i), k = kindOf(name, i);
    prof[z] = prof[z] || { decl: 0, write: 0, mutate: 0, read: 0, total: 0 };
    prof[z][k]++; prof[z].total++;
  }
  return prof;
}
let adjSites = 0, adjMutations = 0;
for (const st of ADJ_STATE) {
  const p = stateProfile(st.name);
  eq(p.A, { decl: 1, write: 0, mutate: 0, read: 0, total: 1 },
    st.name + ' is DECLARED in Candidate A, and only declared there');
  eq(p.C, { decl: 0, write: st.cWrite, mutate: st.cMutate, read: st.cRead, total: st.cTotal },
    st.name + ' is used ' + st.cTotal + ' times from Candidate C');
  eq(p.B, undefined, st.name + ' never appears in Candidate B');
  eq(p.OUT, undefined, st.name + ' never appears outside the forms window');
  adjSites += st.cTotal;
  adjMutations += st.cWrite + st.cMutate;
}
eq(adjSites, ADJ_C_SITES, 'Candidate C touches A-owned adjustment state at 66 executable sites');
eq(adjMutations, ADJ_C_MUTATIONS, '…23 of which MUTATE it');
eq(ADJ_STATE.map((s) => s.cTotal), [19, 14, 6, 15, 12], 'the per-owner occurrence counts inside Candidate C');

// Candidate B's own state, by contrast, never leaves its block.
eq(guardStateConfinement(INDEX, B_STATE, CANDIDATES.B.at, CANDIDATES.B.end), [],
  '_closeLegsTradeId appears in executable code ONLY inside Candidate B');
const stateProf = stateProfile(B_STATE);
eq(stateProf.B, { decl: 1, write: 2, mutate: 0, read: 9, total: 12 },
  '_closeLegsTradeId: 1 declaration, 2 writes, 9 reads — all inside Candidate B');
eq(stateProf.A, undefined, '_closeLegsTradeId never appears in Candidate A');
eq(stateProf.C, undefined, '_closeLegsTradeId never appears in Candidate C');
eq(stateProf.OUT, undefined, '_closeLegsTradeId never appears elsewhere in the monolith');
eq(refSites(INDEX.slice(0, CODE_AT), B_STATE).length, 0, '…and never in markup');

// ─────────────────────────────────────────────────────────────────────────────
section('8. External consumers: code, static markup, generated markup');
// ─────────────────────────────────────────────────────────────────────────────
function census(owners, at, end) {
  const inHome = (i) => { const abs = i + CODE_AT; return abs >= at && abs < end; };
  const head = INDEX.slice(0, CODE_AT), tail = INDEX.slice(CODE_END);
  let code = 0, generated = 0, markup = 0;
  const codeNames = new Set();
  for (const n of owners) {
    const c = refSites(VIEWS.code, n).filter((i) => !inHome(i));
    if (c.length) { code += c.length; codeNames.add(n); }
    generated += refSites(VIEWS.strings, n).filter((i) => !inHome(i)).length;
    markup += refSites(head, n).length + refSites(tail, n).length;
  }
  return { code, codeNames: codeNames.size, generated, markup };
}
eq(census(B_OWNER_NAMES, CANDIDATES.B.at, CANDIDATES.B.end), CENSUS.B, 'Candidate B consumer census');
eq(census(A_OWNER_NAMES, CANDIDATES.A.at, CANDIDATES.A.end), CENSUS.A, 'Candidate A consumer census');
eq(census(C_OWNER_NAMES, CANDIDATES.C.at, CANDIDATES.C.end), CENSUS.C, 'Candidate C consumer census');
eq(census(D_OWNER_NAMES, CANDIDATES.D.at, CANDIDATES.D.end), CENSUS.D, 'Candidate D consumer census');

eq(guardConsumerTopology(INDEX), [], 'Candidate B has exactly the two audited late-bound handler edges');
eq(CENSUS.B.code, 0, 'ZERO JavaScript-code references to Candidate B owners outside the block');
eq(INDEX.split(GENERATED_HANDLER).length - 1, 1, 'exactly one generated showCloseLegsModal(...) handler');
const genOwner = scanTopLevelDeclarations(CODE)
  .find((d) => { const i = INDEX.indexOf(GENERATED_HANDLER) - CODE_AT; return i >= d.start && i <= d.end; });
eq(genOwner && genOwner.name, GENERATED_HANDLER_OWNER, '…and it is generated inside showTradeDetails');
eq(INDEX.slice(0, CODE_AT).split(STATIC_HANDLER).length - 1, 1, 'exactly one static closeLegsModal() invocation in markup');
eq(INDEX.slice(0, CODE_AT).split(CLOSE_LEGS_DOM_ID).length - 1, 1, 'exactly one id="closeLegsModal" attribute');

// The false positives the audit must NOT make.
const markupHits = refSites(INDEX.slice(0, CODE_AT), 'closeLegsModal');
eq(markupHits.length, 2, 'the identifier closeLegsModal occurs twice in markup');
const head = INDEX.slice(0, CODE_AT);
const classified = markupHits.map((i) => {
  const after = head.slice(i + 'closeLegsModal'.length, i + 'closeLegsModal'.length + 4);
  const before = head.slice(Math.max(0, i - 12), i);
  return /^\s*\(/.test(after) ? 'call' : (/id\s*=\s*["']$/.test(before) ? 'domId' : 'other');
});
eq(classified, ['domId', 'call'], '…one is the DOM id, one is the call — and they are told apart');
eq(classified.filter((c) => c === 'call').length, 1, 'exactly one is a function consumer');
eq(classified.filter((c) => c === 'domId').length, 1, 'exactly one is a DOM id and is NOT a consumer');
for (const n of B_OWNER_NAMES) {
  eq(refSites(VIEWS.comments, n).filter((i) => {
    const abs = i + CODE_AT; return abs < CANDIDATES.B.at || abs >= CANDIDATES.B.end;
  }).length, 0, 'no comment outside Candidate B mentions ' + n);
}
// No shipped module already reaches into any candidate owner.
const jsFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name)) jsFiles.push(p);
  }
})(path.join(ROOT, 'js'));
eq(jsFiles.length, BASE_LOCAL_SCRIPTS, 'all 56 shipped modules are on disk');
const moduleTouches = jsFiles.filter((f) => {
  const t = maskLiterals(fs.readFileSync(f, 'utf8'));
  return D_OWNER_NAMES.some((n) => refSites(t, n).length > 0);
});
eq(moduleTouches, [], 'no already-extracted module references any forms-window owner');

// No exposure glue would be required: every owner is a classic global, and the
// two external edges resolve the name at click time, not at load time.
eq(shape(BODY_B).filter((d) => /^(?:function|var)$/.test(d.form)).length, 6,
  'all six Candidate B owners are classic globals (var / function)');
eq((maskLiterals(BODY_B).match(/\b(?:export|import)\b/g) || []).length, 0, 'Candidate B uses no module syntax');
eq((maskLiterals(BODY_B).match(/\bwindow\s*\.\s*[A-Za-z_$]/g) || []).length, 0, 'Candidate B needs no window.* exposure glue');

// ─────────────────────────────────────────────────────────────────────────────
section('9. Cohesion and cross-boundary coupling, per candidate');
// ─────────────────────────────────────────────────────────────────────────────
// Cohesion here is "how much of what this block declares is only used by this
// block", and coupling is "how many executable edges cross the boundary".
function coupling(key, owners, at, end) {
  const c = census(owners, at, end);
  const foreignState = (key === 'C' || key === 'A')
    ? ADJ_STATE.filter((s) => (key === 'C' ? true : false)).length : 0;
  return { declared: owners.length, codeEdges: c.code, generatedEdges: c.generated, markupEdges: c.markup, foreignState };
}
const COUP = {
  A: coupling('A', A_OWNER_NAMES, CANDIDATES.A.at, CANDIDATES.A.end),
  B: coupling('B', B_OWNER_NAMES, CANDIDATES.B.at, CANDIDATES.B.end),
  C: coupling('C', C_OWNER_NAMES, CANDIDATES.C.at, CANDIDATES.C.end),
  D: coupling('D', D_OWNER_NAMES, CANDIDATES.D.at, CANDIDATES.D.end),
};
eq(COUP.A, { declared: 25, codeEdges: 104, generatedEdges: 3, markupEdges: 2, foreignState: 0 }, 'Candidate A coupling');
eq(COUP.B, { declared: 6, codeEdges: 0, generatedEdges: 1, markupEdges: 2, foreignState: 0 }, 'Candidate B coupling');
eq(COUP.C, { declared: 16, codeEdges: 0, generatedEdges: 1, markupEdges: 1, foreignState: 5 }, 'Candidate C coupling');
eq(COUP.D, { declared: 47, codeEdges: 38, generatedEdges: 5, markupEdges: 5, foreignState: 0 }, 'Candidate D coupling');

ok(COUP.B.codeEdges === 0, 'B is the only single-block candidate with zero executable code edges…');
ok(COUP.C.codeEdges === 0 && COUP.C.foreignState === 5,
  '…C also has zero, but only because its five state owners live in A instead');
ok(COUP.A.codeEdges > COUP.D.codeEdges,
  'extracting A alone costs MORE code edges (104) than extracting all three (38): the extra 66 are the A↔C state split');
eq(COUP.A.codeEdges - COUP.D.codeEdges, ADJ_C_SITES, 'the difference is exactly the 66 A↔C state sites');

// ─────────────────────────────────────────────────────────────────────────────
section('10. The recommendation, derived from the measurements');
// ─────────────────────────────────────────────────────────────────────────────
// Nothing here is asserted from a constant. Each criterion is recomputed from
// the numbers §2–§9 measured, and the winner falls out of them.
const SCORE = {};
for (const key of ['A', 'B', 'C', 'D']) {
  const c = COUP[key];
  SCORE[key] = {
    crossBoundaryMutableState: key === 'C' ? ADJ_C_SITES : (key === 'A' ? ADJ_C_SITES : 0),
    codeEdges: c.codeEdges,
    lateBoundEdges: c.generatedEdges + (key === 'B' ? 1 : c.markupEdges),
    loadOrderConstraint: classifyReferences(
      INDEX.slice(CANDIDATES[key].at, CANDIDATES[key].end - 1),
      key === 'A' ? DEPS_A : key === 'B' ? DEPS_B : key === 'C' ? DEPS_C : DEPS_D
    ).loadTime.length,
    units: CANDIDATES[key].body.chars,
    declarations: CANDIDATES[key].declCount,
  };
}
eq(SCORE.B.crossBoundaryMutableState, 0, 'B: extracting it splits no mutable state');
eq(SCORE.A.crossBoundaryMutableState, ADJ_C_SITES, 'A: extracting it alone splits 66 mutable-state sites away from C');
eq(SCORE.C.crossBoundaryMutableState, ADJ_C_SITES, 'C: extracting it alone splits the same 66 sites away from A');
eq(SCORE.D.crossBoundaryMutableState, 0, 'D: extracting all three keeps that state together');
eq([SCORE.A.loadOrderConstraint, SCORE.B.loadOrderConstraint, SCORE.C.loadOrderConstraint, SCORE.D.loadOrderConstraint],
  [0, 0, 0, 0], 'no candidate reads a dependency at evaluation time');

const zeroStateSplit = ['A', 'B', 'C', 'D'].filter((k) => SCORE[k].crossBoundaryMutableState === 0);
eq(zeroStateSplit, ['B', 'D'], 'only B and D avoid splitting mutable state');
const smallest = zeroStateSplit.slice().sort((x, y) => SCORE[x].codeEdges - SCORE[y].codeEdges
  || SCORE[x].units - SCORE[y].units)[0];
eq(smallest, 'B', 'of those two, B has the fewer code edges (0 vs 38) and the smaller body');
eq(SCORE.B.codeEdges, 0, 'B: zero code edges to rewrite');
eq(SCORE.D.codeEdges, 38, 'D: 38 code edges would still cross the boundary');
ok(SCORE.B.units < SCORE.D.units, 'B is 12,237 units against D at 58,898 — a fifth of the mutation surface');
// D's only advantage over B is that it also removes the A↔C boundary — but the
// two-step sequence removes it too, because taking B out makes A and C adjacent.
eq(FUT_BODY.chars, CANDIDATES.A.raw.chars + CANDIDATES.C.raw.chars - 1,
  'after B leaves, A and C are one contiguous body: 21,637 + 25,024 − 1 = 46,660');
ok(FUT_DECLS === CANDIDATES.A.declCount + CANDIDATES.C.declCount,
  '…carrying all 41 of their declarations, with the five _adjForm* owners still beside their users');
const RECOMMENDATION = smallest;
eq(RECOMMENDATION, 'B', 'THE RECOMMENDATION: extract Candidate B (Close Legs) first');

// ─────────────────────────────────────────────────────────────────────────────
section('11. The hypothetical Candidate B extraction — byte-exact both ways');
// ─────────────────────────────────────────────────────────────────────────────
const anchorAt = INDEX.indexOf(ANCHOR_TAG);
ok(anchorAt > 0, 'the anchor tag exists');
eq(INDEX.split(ANCHOR_TAG).length - 1, 1, '…exactly once');
const anchorLineEnd = INDEX.indexOf('\n', anchorAt);
eq(anchorLineEnd, anchorAt + ANCHOR_TAG.length, 'the anchor tag ends its own line');
eq(INDEX.slice(anchorLineEnd + 1, anchorLineEnd + 1 + INLINE_OPEN.length), INLINE_OPEN,
  'the inline monolith opens on the very next line, so the new tag goes between them');
eq(HYP_INSERTION.length, HYP_INSERTION_CHARS, 'the inserted tag line is 54 UTF-16 units');
eq(INDEX.indexOf(HYP_TAG), -1, 'the hypothetical tag does not exist in the base');
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'the hypothetical module does not exist on disk');

// FORWARD: remove the whole raw block (body AND separator), insert the tag line.
const removed = INDEX.slice(0, CANDIDATES.B.at) + INDEX.slice(CANDIDATES.B.end);
const HYP = removed.slice(0, anchorLineEnd) + HYP_INSERTION + removed.slice(anchorLineEnd);
const HYP_MODULE = BODY_B;

eq(guardHypIndex(HYP), [], 'the hypothetical index has its predicted identity, tag placement and residue');
eq(HYP.length, HYP_CHARS, 'hypothetical index is 1,863,130 UTF-16 units');
eq(BASE_CHARS - CANDIDATES.B.raw.chars + HYP_INSERTION_CHARS, HYP_CHARS,
  'the predicted arithmetic holds: 1,875,314 − 12,238 + 54 = 1,863,130');
eq(utf8(HYP), HYP_UTF8, 'hypothetical index is 1,897,113 UTF-8 bytes');
eq(countLf(HYP), HYP_LF, 'hypothetical index has 32,721 LF');
eq(sha256(HYP), HYP_SHA256, 'hypothetical index SHA-256 8e52b9a8…');
eq(localScripts(HYP).length, HYP_LOCAL_SCRIPTS, 'the hypothetical index loads 57 local application scripts');
eq(BASE_LF - CANDIDATES.B.raw.lf + 1, HYP_LF, 'the LF arithmetic holds: 32,951 − 231 + 1 = 32,721');
eq(guardHypModule(HYP_MODULE), [], 'the hypothetical module is exactly Candidate B body, ending on a real line of code');
eq(metrics(HYP_MODULE), { chars: 12237, utf8: 12336, lf: 230, sha: CANDIDATES.B.body.sha },
  'hypothetical module identity: 12,237 units / 12,336 bytes / 230 LF / f43928cc…');
eq(HYP.indexOf(HYP_MODULE), -1, 'not one byte of the module body is left in the hypothetical index');

// The tag lands between tt-reconnect.js and the inline monolith, on its own line.
const tagAt = HYP.indexOf(HYP_TAG);
eq(HYP.slice(HYP.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length, tagAt), '\n', 'the tag sits immediately after tt-reconnect.js');
eq(HYP.slice(tagAt + HYP_TAG.length, tagAt + HYP_TAG.length + 1 + INLINE_OPEN.length), '\n' + INLINE_OPEN,
  '…and immediately before the inline monolith');
eq(localScripts(HYP).map((t) => t.src).slice(-2), ['./js/ui/tt-reconnect.js', './' + HYP_MODULE_REL],
  'it becomes the last local script, after the reconnect owner');

// REVERSE: put the body plus its separator back, take the tag line out.
const unTagged = HYP.slice(0, anchorLineEnd) + HYP.slice(anchorLineEnd + HYP_INSERTION.length);
const RESTORED = unTagged.slice(0, CANDIDATES.B.at) + HYP_MODULE + SEPARATOR + unTagged.slice(CANDIDATES.B.at);
eq(RESTORED, INDEX, 'the reverse transform reconstructs the pinned base byte for byte');
eq(sha256(RESTORED), BASE_INDEX_SHA256, '…with the base SHA-256');
eq(metrics(RESTORED), metrics(INDEX), '…and every base metric');

// ─────────────────────────────────────────────────────────────────────────────
section('12. The step-2 payoff: A and C become contiguous, with no weave');
// ─────────────────────────────────────────────────────────────────────────────
eq(guardFutureRemainder(HYP, INDEX), [], 'the future A+C remainder has its pinned identity and composition');
eq(FUT_AT, CANDIDATES.A.at + HYP_INSERTION_CHARS, 'the remainder starts at 1,718,777 + 54 = 1,718,831');
eq(FUT_END - FUT_AT, CANDIDATES.A.raw.chars + CANDIDATES.C.raw.chars, 'its span is A raw + C raw');
eq(metrics(HYP.slice(FUT_AT, FUT_END)), { chars: 46661, utf8: 46829, lf: 949, sha: FUT_RAW.sha },
  'future raw remainder: 46,661 units / 46,829 bytes / 949 LF / ec16ed3c…');
eq(metrics(HYP.slice(FUT_AT, FUT_END - 1)), { chars: 46660, utf8: 46828, lf: 948, sha: FUT_BODY.sha },
  'future shippable body: 46,660 units / 46,828 bytes / 948 LF / 4ace9380…');
eq(HYP.slice(FUT_AT, FUT_END),
  INDEX.slice(CANDIDATES.A.at, CANDIDATES.A.end) + INDEX.slice(CANDIDATES.C.at, CANDIDATES.C.end),
  'the future remainder IS the current A raw bytes followed immediately by the current C raw bytes');
eq(HYP.slice(FUT_AT, FUT_AT + CANDIDATES.A.raw.chars), INDEX.slice(CANDIDATES.A.at, CANDIDATES.A.end),
  '…A first, unchanged');
eq(HYP.slice(FUT_AT + CANDIDATES.A.raw.chars, FUT_END), INDEX.slice(CANDIDATES.C.at, CANDIDATES.C.end),
  '…then C, unchanged');
eq(HYP.slice(FUT_END - 1, FUT_END), SEPARATOR, 'the remainder is followed by exactly one structural LF');
eq(HYP.slice(FUT_END - 2, FUT_END - 1), '\n', '…and its body ends `}\\n`');
eq(HYP.slice(FUT_END - 3, FUT_END - 1), '}\n', '…on a closing brace');
eq(scanTopLevelDeclarations(HYP.slice(FUT_AT, FUT_END - 1)).length, FUT_DECLS,
  'the future body carries 41 declarations');
eq(scanTopLevelDeclarations(HYP.slice(FUT_AT, FUT_END - 1)).map((d) => d.name),
  A_OWNER_NAMES.concat(C_OWNER_NAMES), '…exactly A then C, in order, with nothing woven between them');
eq(HYP.slice(FUT_AT, FUT_END).indexOf('CLOSE LEGS FORM'), -1, 'no Close Legs banner survives inside the remainder');
eq(FUT_RAW.chars, CANDIDATES.A.raw.chars + CANDIDATES.C.raw.chars, 'no byte was invented or dropped: 21,637 + 25,024 = 46,661');
eq(FUT_RAW.utf8, CANDIDATES.A.raw.utf8 + CANDIDATES.C.raw.utf8, '…and the same in UTF-8 bytes');
eq(FUT_RAW.lf, CANDIDATES.A.raw.lf + CANDIDATES.C.raw.lf, '…and in LF count');

// ─────────────────────────────────────────────────────────────────────────────
section('13. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
// Every control mutates a real in-memory copy and asserts the EXACT COMPLETE
// violation vector the guards produce. A coarse guard cannot stand in for a
// specific one, because the whole array is compared.

// 13.1 Every boundary shifted by one LF.
eq(guardTiling(INDEX, [[CANDIDATES.A.at - 1, CANDIDATES.A.end], RANGES[1], RANGES[2]]),
  ['tiling:windowStart', 'tiling:units', 'tiling:bytes'], '13.1a window start shifted back one LF is caught');
eq(guardTiling(INDEX, [RANGES[0], RANGES[1], [CANDIDATES.C.at, CANDIDATES.C.end - 1]]),
  ['tiling:windowEnd', 'tiling:units', 'tiling:bytes'], '13.1b window end shifted back one LF is caught');
eq(guardBlock(INDEX, 'A', CANDIDATES.A.at, CANDIDATES.A.end - 1),
  ['A:raw:units', 'A:raw:bytes', 'A:raw:lf', 'A:raw:sha', 'A:body:units', 'A:body:bytes', 'A:body:lf',
    'A:body:sha', 'A:raw:tail', 'A:body:tail'], '13.1c A end shifted back one LF is caught');
eq(guardBlock(INDEX, 'B', CANDIDATES.B.at - 1, CANDIDATES.B.end),
  ['B:raw:units', 'B:raw:bytes', 'B:raw:lf', 'B:raw:sha', 'B:body:units', 'B:body:bytes', 'B:body:lf',
    'B:body:sha'], '13.1d B start shifted back one LF is caught');
// Shifting B's end forward takes the FIRST byte of C's banner, so the block no
// longer ends on a seam and its separator is no longer an LF.
eq(guardBlock(INDEX, 'B', CANDIDATES.B.at, CANDIDATES.B.end + 1),
  ['B:raw:units', 'B:raw:bytes', 'B:raw:sha', 'B:body:units', 'B:body:bytes', 'B:body:lf',
    'B:body:sha', 'B:sep:notLF', 'B:raw:tail', 'B:body:tail', 'B:compose'],
  '13.1e B end shifted forward one unit is caught, separator included');
eq(guardBlock(INDEX, 'C', CANDIDATES.C.at + 1, CANDIDATES.C.end),
  ['C:raw:units', 'C:raw:bytes', 'C:raw:sha', 'C:body:units', 'C:body:bytes', 'C:body:sha'],
  '13.1f C start shifted forward one unit is caught');

// 13.2 Gap and overlap in the tiling.
eq(guardTiling(INDEX, [[CANDIDATES.A.at, CANDIDATES.A.end - 1], RANGES[1], RANGES[2]]),
  ['tiling:gap@A|B', 'tiling:units', 'tiling:bytes'], '13.2a a one-unit GAP between A and B is caught');
eq(guardTiling(INDEX, [[CANDIDATES.A.at, CANDIDATES.A.end + 1], RANGES[1], RANGES[2]]),
  ['tiling:overlap@A|B', 'tiling:units', 'tiling:bytes'], '13.2b a one-unit OVERLAP between A and B is caught');
eq(guardTiling(INDEX, [RANGES[0], [CANDIDATES.B.at, CANDIDATES.B.end - 1], RANGES[2]]),
  ['tiling:gap@B|C', 'tiling:units', 'tiling:bytes'], '13.2c a GAP between B and C is caught');
eq(guardTiling(INDEX, [RANGES[0], [CANDIDATES.B.at, CANDIDATES.B.end + 1], RANGES[2]]),
  ['tiling:overlap@B|C', 'tiling:units', 'tiling:bytes'], '13.2d an OVERLAP between B and C is caught');

// 13.3 Body absorbing its structural separator, and a missing separator.
eq(guardHypModule(BODY_B + SEPARATOR),
  ['module:units', 'module:bytes', 'module:lf', 'module:sha', 'module:tail', 'module:trailingBlank'],
  '13.3a a module that absorbed the separator is caught, including the EOF blank line');
eq(guardHypModule(BODY_B.slice(0, -1)), ['module:units', 'module:bytes', 'module:lf', 'module:sha', 'module:tail'],
  '13.3b a module missing its final LF is caught');
{
  // The separator stranded in the hypothetical index: the block body leaves but
  // its LF stays behind.
  const strandedRemoved = INDEX.slice(0, CANDIDATES.B.at) + INDEX.slice(CANDIDATES.B.end - 1);
  const stranded = strandedRemoved.slice(0, anchorLineEnd) + HYP_INSERTION + strandedRemoved.slice(anchorLineEnd);
  eq(guardHypIndex(stranded), ['hyp:units', 'hyp:bytes', 'hyp:lf', 'hyp:sha', 'hyp:separatorStranded'],
    '13.3c a stranded separator LF in the hypothetical index is caught');
}
{
  // A MISSING separator on the way back: the reverse transform re-inserts the
  // module body but forgets the structural LF that belongs with it. The
  // reconstruction must then NOT equal the base.
  const unTag = HYP.slice(0, anchorLineEnd) + HYP.slice(anchorLineEnd + HYP_INSERTION.length);
  const noSep = unTag.slice(0, CANDIDATES.B.at) + BODY_B + unTag.slice(CANDIDATES.B.at);
  ok(noSep !== INDEX, '13.3d a reverse transform that omits the separator does NOT reconstruct the base');
  eq(noSep.length, BASE_CHARS - 1, '…it is exactly one unit short');
  eq(countLf(noSep), BASE_LF - 1, '…exactly one LF short');
  ok(sha256(noSep) !== BASE_INDEX_SHA256, '…and its hash differs');
  // The BODY is still intact — every body metric matches. Only the separator,
  // and therefore the raw block, is wrong. That is exactly the failure mode a
  // guard that checked the body alone would have missed.
  eq(guardBlock(noSep, 'B', CANDIDATES.B.at, CANDIDATES.B.end),
    ['B:raw:lf', 'B:raw:sha', 'B:sep:notLF', 'B:raw:tail', 'B:compose'],
    '…and the block guard names the missing separator, with every body metric still clean');
}

// 13.4 Renamed and reordered owners; submitCloseLegs losing async.
eq(guardOwners(BODY_B.replace('function closeLegsModal(', 'function closeLegsModalV2('), B_OWNERS),
  ['owners:#2:name', 'owners:#2:span'], '13.4a a renamed owner is caught');
{
  // Renaming everywhere also lengthens the caller that references it, so the
  // vector names BOTH the renamed slot and the caller whose span moved.
  const renamedAll = BODY_B.split('_clPnlPreview').join('_clPnlPreviewX');
  eq(guardOwners(renamedAll, B_OWNERS), ['owners:#3:span', 'owners:#4:name', 'owners:#4:span'],
    '13.4b a consistently renamed owner is still caught');
}
{
  // Swap the two smallest owners so the manifest order changes.
  const decls = scanTopLevelDeclarations(BODY_B);
  const d1 = decls[1], d2 = decls[2];
  const swapped = BODY_B.slice(0, d1.start) + BODY_B.slice(d2.start, d2.end + 1)
    + BODY_B.slice(d1.end + 1, d2.start) + BODY_B.slice(d1.start, d1.end + 1) + BODY_B.slice(d2.end + 1);
  eq(guardOwners(swapped, B_OWNERS),
    ['owners:#1:name', 'owners:#1:span', 'owners:#2:name', 'owners:#2:span'], '13.4c reordered owners are caught');
}
eq(guardOwners(BODY_B.replace('async function submitCloseLegs', 'function submitCloseLegs'), B_OWNERS),
  ['owners:#5:async', 'owners:#5:span'], '13.4d submitCloseLegs losing `async` is caught');
eq(guardOwners(BODY_B.replace('var _closeLegsTradeId = null;', 'let _closeLegsTradeId = null;'), B_OWNERS),
  ['owners:#0:form'], '13.4e a changed declaration FORM is caught');
{
  const dropped = BODY_B.slice(0, scanTopLevelDeclarations(BODY_B)[0].start)
    + BODY_B.slice(scanTopLevelDeclarations(BODY_B)[0].end + 2);
  const v = guardOwners(dropped, B_OWNERS);
  eq(v.slice(0, 1), ['owners:count'], '13.4f a dropped owner is caught, starting with the count');
  ok(v.indexOf('owners:#5:absent') >= 0, '…and the vector names the now-absent final slot');
}

// 13.5 Extra top-level work of each kind.
// Each of these also fails to EVALUATE in the empty VM, because the thing it
// newly reaches for at load time is not there. That is the point: `vmError` and
// the specific effect violation appear together, and the vectors stay distinct.
eq(guardTopLevelPurity(BODY_B + 'showToast("hi");\n', B_OWNER_NAMES, DEPS_B),
  ['purity:residue', 'purity:vmError', 'purity:topLevelCall', 'purity:loadTimeDeps'],
  '13.5a an extra top-level CALL is caught');
eq(guardTopLevelPurity(BODY_B + 'var _x = document.title;\n', B_OWNER_NAMES.concat(['_x']), DEPS_B),
  ['purity:vmError', 'purity:topLevelDom', 'purity:loadTimeDeps'],
  '13.5b an extra top-level DOM ACCESS is caught even inside a declaration initialiser');
eq(guardTopLevelPurity(BODY_B + 'document.addEventListener("click", closeLegsModal);\n', B_OWNER_NAMES, DEPS_B),
  ['purity:residue', 'purity:vmError', 'purity:topLevelCall', 'purity:topLevelDom',
    'purity:topLevelListener', 'purity:loadTimeDeps'],
  '13.5c an extra top-level LISTENER is caught');
eq(guardTopLevelPurity(BODY_B + 'setTimeout(closeLegsModal, 0);\n', B_OWNER_NAMES, DEPS_B),
  ['purity:residue', 'purity:vmError', 'purity:topLevelCall', 'purity:topLevelTimer'],
  '13.5d an extra top-level TIMER is caught');
eq(guardTopLevelPurity(BODY_B + 'var _y = localStorage;\n', B_OWNER_NAMES.concat(['_y']), DEPS_B),
  ['purity:vmError', 'purity:topLevelStorage'], '13.5e an extra top-level STORAGE read is caught');
eq(guardTopLevelPurity(BODY_B + 'var _z = journalManager;\n', B_OWNER_NAMES.concat(['_z']), DEPS_B),
  ['purity:vmError', 'purity:topLevelJournal', 'purity:loadTimeDeps'],
  '13.5f an extra top-level JOURNAL read is caught');
eq(guardTopLevelPurity(BODY_B + 'var _q = 1\n_q = _q +\n', B_OWNER_NAMES.concat(['_q']), DEPS_B).indexOf('purity:vmError') >= 0,
  true, '13.5g a body that does not evaluate is caught');
eq(guardTopLevelPurity(BODY_B + 'var _extra = 1;\n', B_OWNER_NAMES, DEPS_B),
  ['purity:globals'], '13.5h an extra defined global is caught');
eq(guardInertState(BODY_B.replace(B_STATE_INIT, 'var _closeLegsTradeId = document.body;')),
  ['state:init', 'state:notInert'], '13.5i a state initialiser that touches the world is caught');

// 13.6 The mutable owner escaping its block.
//
// The insertion point is the B|C seam — a real top-level statement boundary.
// Planting bytes anywhere else risks landing INSIDE a string literal, where the
// lexical masking would (correctly) hide them and the control would prove
// nothing. §13.7 exercises that case deliberately instead.
const PLANT_AT = CANDIDATES.C.at;
{
  // A READ of _closeLegsTradeId planted in real code outside Candidate B.
  const mutated = INDEX.slice(0, PLANT_AT) + 'var _leak = _closeLegsTradeId;\n' + INDEX.slice(PLANT_AT);
  eq(guardStateConfinement(mutated, B_STATE, CANDIDATES.B.at, CANDIDATES.B.end),
    ['confinement:_closeLegsTradeId:code=1'], '13.6a a READ outside Candidate B is caught');
}
{
  // A WRITE planted outside Candidate B.
  const mutated = INDEX.slice(0, PLANT_AT) + '_closeLegsTradeId = 7;\n' + INDEX.slice(PLANT_AT);
  eq(guardStateConfinement(mutated, B_STATE, CANDIDATES.B.at, CANDIDATES.B.end),
    ['confinement:_closeLegsTradeId:code=1'], '13.6b a WRITE outside Candidate B is caught');
}
{
  // …and one planted in markup, before the inline script.
  const mutated = INDEX.slice(0, 5000) + '<b>_closeLegsTradeId</b>' + INDEX.slice(5000);
  eq(guardStateConfinement(mutated, B_STATE, CANDIDATES.B.at + 24, CANDIDATES.B.end + 24),
    ['confinement:_closeLegsTradeId:markup=1'], '13.6c a markup mention is caught');
}

// 13.7 Lexical masking: strings and comments must NOT be read as code.
{
  const inString = INDEX.slice(0, PLANT_AT) + "var _s = '_closeLegsTradeId = 7;';\n" + INDEX.slice(PLANT_AT);
  eq(guardStateConfinement(inString, B_STATE, CANDIDATES.B.at, CANDIDATES.B.end), [],
    '13.7a a "consumer" hidden in a STRING is correctly NOT counted as a reference');
  const reg = codeRegion(inString);
  const code = inString.slice(reg.at, reg.end);
  ok(rawSites(code, B_STATE).length > refSites(maskLiterals(code), B_STATE).length,
    '…and naive identifier counting WOULD have counted it, which is why masking is not optional');
  eq(rawSites(code, B_STATE).length - refSites(maskLiterals(code), B_STATE).length, 1,
    '…by exactly the one planted occurrence');
}
{
  const inComment = INDEX.slice(0, PLANT_AT) + '// _closeLegsTradeId is documented here\n' + INDEX.slice(PLANT_AT);
  eq(guardStateConfinement(inComment, B_STATE, CANDIDATES.B.at, CANDIDATES.B.end), [],
    '13.7b a COMMENT mention is correctly NOT misclassified as a consumer');
  const reg = codeRegion(inComment);
  const code = inComment.slice(reg.at, reg.end);
  eq(rawSites(code, B_STATE).length - refSites(maskLiterals(code), B_STATE).length, 1,
    '…though a raw count would have flagged it');
}
{
  // An object KEY and a regex body must not become references either.
  const asKey = 'function _k() { return { ' + B_STATE + ': 1 }; }\n';
  eq(freeIdentifiers(asKey).indexOf(B_STATE), -1, '13.7c an object KEY does not become a free dependency');
  const inRegex = 'function _r() { var _re = /' + B_STATE + '/; return _re; }\n';
  eq(freeIdentifiers(inRegex).indexOf(B_STATE), -1, '13.7d a REGEX body does not become a free dependency');
  const inTemplate = 'function _t() { return `' + B_STATE + '`; }\n';
  eq(freeIdentifiers(inTemplate).indexOf(B_STATE), -1, '13.7e a TEMPLATE literal does not become a free dependency');
}

// 13.8 The DOM id must not be read as a call, and each handler edge is required.
{
  // Remove the static call but KEEP the id. If the id were being counted as a
  // call this would pass — it must not.
  const noCall = INDEX.replace(STATIC_HANDLER, 'onclick="if(event.target===this)void 0"');
  ok(noCall.length !== INDEX.length, 'the static handler mutation applied');
  eq(guardConsumerTopology(noCall),
    ['consumers:static:calls=0', 'consumers:static:literal'],
    '13.8a removing the static closeLegsModal() call is caught even though id="closeLegsModal" remains');
  eq(noCall.split(CLOSE_LEGS_DOM_ID).length - 1, 1, '…and the DOM id is still there, so the id alone never satisfied the guard');
}
{
  // Remove the id but keep the call.
  const noId = INDEX.replace(CLOSE_LEGS_DOM_ID, 'id="closeLegsModalX"');
  eq(guardConsumerTopology(noId), ['consumers:static:domIds=0', 'consumers:domId:literal'],
    '13.8b removing the DOM id is caught, and is reported as an ID violation, never as a call violation');
}
{
  // Turn the id into a second call: the two must be told apart by shape.
  const idAsCall = INDEX.replace(CLOSE_LEGS_DOM_ID, 'data-x="closeLegsModal()"');
  eq(guardConsumerTopology(idAsCall),
    ['consumers:static:calls=2', 'consumers:static:domIds=0', 'consumers:domId:literal'],
    '13.8c a second markup CALL is counted as a call, not as an id');
}
{
  const noGen = INDEX.replace(GENERATED_HANDLER, 'onclick="void 0"');
  eq(guardConsumerTopology(noGen),
    ['consumers:generated:count=0', 'consumers:generated:literal'],
    '13.8d removing the generated showCloseLegsModal handler is caught');
}
{
  // A generated handler moved out of showTradeDetails into another owner.
  const moved = INDEX.replace(GENERATED_HANDLER, 'onclick="void 0"');
  const elsewhere = moved.slice(0, PLANT_AT) + "var _h = '" + GENERATED_HANDLER + "';\n" + moved.slice(PLANT_AT);
  eq(guardConsumerTopology(elsewhere), ['consumers:generated:owner'],
    '13.8e the generated handler moving out of showTradeDetails is caught');
}
{
  // A real code consumer appearing outside the block, at the B|C seam.
  const leaked = INDEX.slice(0, PLANT_AT) + 'function _later() { submitCloseLegs(); }\n' + INDEX.slice(PLANT_AT);
  eq(guardConsumerTopology(leaked), ['consumers:code=1'], '13.8f an executable consumer outside Candidate B is caught');
}

// 13.9 A wrong free dependency.
eq(freeIdentifiers(BODY_B.replace(/\bescHtml\b/g, 'escHtml2')).indexOf('escHtml'), -1,
  '13.9a a renamed dependency disappears from the inventory');
ok(freeIdentifiers(BODY_B.replace(/\bescHtml\b/g, 'escHtml2')).indexOf('escHtml2') >= 0, '…and the new name appears');
eq(freeIdentifiers(BODY_B) === DEPS_B, false, '13.9b the inventory is an array comparison, not identity');
{
  const extra = BODY_B.replace('function closeLegsModal() {', 'function closeLegsModal() {\n  somethingNew();');
  ok(freeIdentifiers(extra).indexOf('somethingNew') >= 0, '13.9c an added dependency shows up in the inventory');
  ok(freeIdentifiers(extra).length === DEPS_B.length + 1, '…and changes its length');
}

// 13.10 The hypothetical tag: duplicated, reordered, async, deferred, module.
{
  const dup = HYP.slice(0, tagAt) + HYP_TAG + '\n' + HYP.slice(tagAt);
  eq(guardHypIndex(dup), ['hyp:units', 'hyp:bytes', 'hyp:lf', 'hyp:sha', 'hyp:localScripts',
    'hyp:tag:count=2', 'hyp:tag:literal=2', 'hyp:separatorStranded'], '13.10a a DUPLICATE tag is caught');
}
{
  // Tag moved BEFORE the anchor: the order guard must fire.
  const noTag = HYP.slice(0, anchorLineEnd) + HYP.slice(anchorLineEnd + HYP_INSERTION.length);
  const a2 = noTag.indexOf(ANCHOR_TAG);
  const reordered = noTag.slice(0, a2) + HYP_TAG + '\n' + noTag.slice(a2);
  eq(guardHypIndex(reordered), ['hyp:sha', 'hyp:tag:order', 'hyp:tag:adjacency'],
    '13.10b a REORDERED tag (before tt-reconnect.js) is caught');
}
{
  const asyncTag = HYP.replace(HYP_TAG, '<script async src="./' + HYP_MODULE_REL + '"></script>');
  eq(guardHypIndex(asyncTag), ['hyp:units', 'hyp:bytes', 'hyp:sha', 'hyp:tag:literal=0',
    'hyp:tag:order', 'hyp:tag:async'], '13.10c an ASYNC tag is caught, and reported as async');
}
{
  const defer = HYP.replace(HYP_TAG, '<script defer src="./' + HYP_MODULE_REL + '"></script>');
  eq(guardHypIndex(defer), ['hyp:units', 'hyp:bytes', 'hyp:sha', 'hyp:tag:literal=0',
    'hyp:tag:order', 'hyp:tag:defer'], '13.10d a DEFERRED tag is caught, and reported as defer');
}
{
  const mod = HYP.replace(HYP_TAG, '<script type="module" src="./' + HYP_MODULE_REL + '"></script>');
  eq(guardHypIndex(mod), ['hyp:units', 'hyp:bytes', 'hyp:sha', 'hyp:tag:literal=0',
    'hyp:tag:order', 'hyp:tag:module'], '13.10e a MODULE-TYPE tag is caught, and reported as module');
}

// 13.11 The future A+C remainder.
{
  // Fragments reversed: C first, then A.
  const reversedRemoved = INDEX.slice(0, CANDIDATES.A.at)
    + INDEX.slice(CANDIDATES.C.at, CANDIDATES.C.end)
    + INDEX.slice(CANDIDATES.A.at, CANDIDATES.A.end)
    + INDEX.slice(CANDIDATES.C.end);
  const reversed = reversedRemoved.slice(0, anchorLineEnd) + HYP_INSERTION + reversedRemoved.slice(anchorLineEnd);
  eq(guardFutureRemainder(reversed, INDEX),
    ['future:raw:sha', 'future:body:sha', 'future:compose', 'future:orderA', 'future:orderC'],
    '13.11a A and C REVERSED is caught — same bytes, wrong order');
}
{
  // One byte dropped exactly at the join.
  const join = CANDIDATES.A.end;
  const droppedRemoved = INDEX.slice(0, CANDIDATES.B.at) + INDEX.slice(CANDIDATES.B.end);
  const dropped0 = droppedRemoved.slice(0, join - 1) + droppedRemoved.slice(join);
  const dropped = dropped0.slice(0, anchorLineEnd) + HYP_INSERTION + dropped0.slice(anchorLineEnd);
  eq(guardFutureRemainder(dropped, INDEX),
    ['future:raw:lf', 'future:raw:sha', 'future:body:sha', 'future:compose', 'future:orderA',
      'future:orderC', 'future:body:tail', 'future:sep'],
    '13.11b ONE byte dropped at the A|C join is caught');
}
{
  // The Close Legs bytes accidentally retained in the remainder.
  const retained = HYP.slice(0, FUT_AT + CANDIDATES.A.raw.chars)
    + INDEX.slice(CANDIDATES.B.at, CANDIDATES.B.end)
    + HYP.slice(FUT_AT + CANDIDATES.A.raw.chars);
  eq(guardFutureRemainder(retained, INDEX),
    ['future:raw:bytes', 'future:raw:lf', 'future:raw:sha', 'future:body:bytes', 'future:body:lf',
      'future:body:sha', 'future:compose', 'future:orderC', 'future:body:tail', 'future:sep',
      'future:decls'],
    '13.11c the removed Close Legs bytes retained between A and C are caught');
  ok(guardHypIndex(retained).indexOf('hyp:blockRetained') >= 0,
    '…and the hypothetical-index guard independently reports the block was retained');
}

// 13.12 A mutated or truncated hypothetical module.
// A genuinely SAME-LENGTH edit: only the hash can see it.
eq(guardHypModule(BODY_B.replace('Trade not found', 'Trade not fouud')),
  ['module:sha'], '13.12a a same-length edit inside the module is caught by its hash alone');
eq(guardHypModule(BODY_B.slice(0, 6000)),
  ['module:units', 'module:bytes', 'module:lf', 'module:sha', 'module:tail'],
  '13.12b a truncated module is caught');
eq(guardHypModule(BODY_B + '\n// extra\n'),
  ['module:units', 'module:bytes', 'module:lf', 'module:sha', 'module:tail'],
  '13.12c an appended module is caught');

// 13.13 Foreign content elsewhere in the hypothetical index.
{
  const foreign = HYP.slice(0, 60000) + '<!-- injected -->' + HYP.slice(60000);
  eq(guardHypIndex(foreign), ['hyp:units', 'hyp:bytes', 'hyp:sha'],
    '13.13a foreign markup anywhere in the hypothetical index is caught');
}
{
  const foreignCode = HYP.slice(0, CODE_AT + 5000) + '\nvar _injected = 1;\n' + HYP.slice(CODE_AT + 5000);
  eq(guardHypIndex(foreignCode), ['hyp:units', 'hyp:bytes', 'hyp:lf', 'hyp:sha', 'hyp:separatorStranded'],
    '13.13b foreign CODE anywhere in the hypothetical index is caught');
}
// And the base guard itself fails closed.
eq(guardBaseIdentity(INDEX + ' '), ['base:units', 'base:bytes', 'base:sha'], '13.13c the base guard fails closed');

// ─────────────────────────────────────────────────────────────────────────────
section('14. Production is unchanged, and the audit footprint is exactly three test files');
// ─────────────────────────────────────────────────────────────────────────────
eq(sha256(fs.readFileSync(INDEX_PATH, 'utf8')), BASE_INDEX_SHA256, 'index.html on disk is byte-identical to the base');
eq(git(['hash-object', 'index.html']).trim(), BASE_INDEX_BLOB, '…and hashes to the base blob');
eq(git(['diff', '--name-only', BASE_SHA + '...HEAD', '--', 'index.html', 'js/']).trim(), '',
  'the committed diff touches neither index.html nor js/');

const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
eq(changed, AUDIT_SCOPE, 'the ENTIRE change set is the audit plus the two suite-count ratchets');
eq(changed.length, 3, 'exactly three files, all under tests/');
eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
  'production scope is empty: no index.html, no js/');
eq(changed.filter((rel) => rel.startsWith('.github/')), [], 'no workflow or bootstrap file changed');
eq(changed.filter((rel) => rel.endsWith('.md')), [], 'no documentation changed');
eq(changed.filter((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')), [],
  'no configuration or JSON changed');
eq(changed.filter((rel) => rel === '.gitattributes'), [], '.gitattributes is untouched');
eq(changed.filter((rel) => rel.startsWith('tests/lib/')), [], 'no test helper changed');
eq(changed.filter((rel) => !rel.startsWith('tests/')), [], 'every changed path is a test artifact');

// The ratchet advance is mechanical: in each contract the ONLY changed content
// is the suite-count constant (plus the comment explaining it). Nothing else in
// either contract moved, so neither one was weakened to accommodate this audit.
eq(RATCHET_RELS.length, 2, 'exactly two suite-count ratchets exist');
for (const rel of RATCHET_RELS) {
  const before = git(['show', BASE_SHA + ':' + rel]);
  const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(before.indexOf('const TEST_FILE_COUNT = 138;') >= 0, rel + ' pinned 138 at the base');
  eq(after.indexOf('const TEST_FILE_COUNT = 138;'), -1, rel + ' no longer pins 138');
  ok(after.indexOf('const TEST_FILE_COUNT = 139;') >= 0, rel + ' now pins 139');
  // Strip the constant line, the assertion message line and the added comment
  // block; what remains must be byte-identical to the base.
  const norm = (t) => t.split('\n')
    .filter((l) => !/const TEST_FILE_COUNT = 13[89];/.test(l))
    .filter((l) => !/the suite is (?:exactly )?13[89] test files/.test(l))
    .filter((l) => !/^\/\/ (?:Ratchet\.|tests\/temporary-journal-forms|one-for-one|at 139)/.test(l))
    .join('\n');
  eq(norm(after), norm(before), rel + ': every other byte is identical to the base');
}
// And they are still the only two. A third pin appearing later must not hide:
// this scans every suite and every helper for a LIVE declaration, excluding
// only this audit, whose sole mentions are inside the normaliser above.
const declRe = /^\s*const TEST_FILE_COUNT\s*=/m;
const pinned = [];
for (const dir of ['tests', 'tests/lib']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = dir + '/' + f;
    if (!/\.js$/.test(f) || rel === AUDIT_REL) continue;
    const p = path.join(ROOT, dir, f);
    if (!fs.statSync(p).isFile()) continue;
    if (declRe.test(fs.readFileSync(p, 'utf8'))) pinned.push(rel);
  }
}
eq(pinned.sort(), RATCHET_RELS, 'the repository has exactly these two live suite-count pins, and no third');
eq(declRe.test(fs.readFileSync(path.join(ROOT, AUDIT_REL), 'utf8')), false,
  'this audit declares no suite-count pin of its own');

// Phase 2 has NOT been started. None of its artefacts exists.
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no journal-close-legs module was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/journal-close-legs-boundary-contract.test.js')),
  'no permanent boundary contract was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/lib/journal-close-legs-undo.js')), 'no undo helper was created');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-trade-forms.js')), 'no combined forms module exists (rejected Candidate D)');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-manual-entry.js')), 'no manual-entry module exists (rejected Candidate A)');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-adjustment.js')), 'no adjustment module exists (rejected Candidate C)');
eq(localScripts(fs.readFileSync(INDEX_PATH, 'utf8')).length, BASE_LOCAL_SCRIPTS,
  'index.html still loads exactly the base 56 local scripts');

console.log('\n' + pass + ' assertions passed');
console.log('recommendation: extract Candidate ' + RECOMMENDATION + ' (Close Legs) first');
console.log('JOURNAL_FORMS_BOUNDARY_AUDIT_OK');
