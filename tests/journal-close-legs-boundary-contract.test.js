'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL CLOSE LEGS — permanent boundary contract.
//
// Replaces tests/temporary-journal-forms-boundary-audit.test.js, which measured
// four candidates across the Journal trade-form window and recommended this one
// as the first extraction. That audit is deleted by this change; §12 proves it.
//
// WHAT THE AUDIT FOUND. The forms window [1718777,1777676) tiled into three
// semantic blocks — Manual Entry/Edit (A), Close Legs (B), Adjustment (C) —
// and the audit scored all four possible cuts, A, B, C and the whole window D.
// Computed over the window's eleven mutable owners, the number of state sites
// that would land on the wrong side of a new module boundary was:
//
//     A 95     B 0     C 66     D 29
//
// B was the ONLY zero, and also the only candidate with zero executable-code
// consumers outside itself. A and C are coupled by construction: C reads and
// writes five `_adjForm*` globals declared physically inside A, across 66 sites,
// 23 of them mutations. So B ships first, and A+C stay together for later.
//
// RELOCATION ONLY. Every moved byte is byte-identical to the base, and §9
// proves the reverse transform reconstructs 754e3dd0:index.html exactly.
//
// THE SEPARATOR MODEL, unchanged from the layers below it:
//
//     raw        [1740414,1752652)   12,238 units   dcc3de2a…
//     body       [1740414,1752651)   12,237 units   f43928cc…   ends `}\n`
//     separator  [1752651,1752652)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` (which CI runs)
// sees no blank line at EOF. The separator is document structure, not module
// content, and the undo re-inserts it.
//
// THE OWNERS. Six classic globals, in source order, and nothing else:
//
//     var _closeLegsTradeId                — the form's only mutable state
//     function showCloseLegsModal(tradeId) — opens the modal for a trade
//     function closeLegsModal()            — closes it
//     function _renderCloseLegsForm()      — renders the leg rows
//     function _clPnlPreview()             — live P&L preview
//     async function submitCloseLegs()     — submits the close
//
// Their consumer topology is what makes this a UI feature rather than a service:
// static markup calls closeLegsModal(), showTradeDetails GENERATES the onclick
// that calls showCloseLegsModal(...), and NOTHING in the remaining monolith
// references any owner as executable code. There is also an `id="closeLegsModal"`
// in the markup, which is a DOM id and NOT a consumer — §7 keeps the two apart.
//
// THE STEP-2 PAYOFF. B sat between A and C. §10 proves the audit's prediction
// held: with B gone, Manual Entry and Adjustment are now physically contiguous,
// 46,661 raw units hashing to ec16ed3c…, exactly A's raw bytes followed by C's,
// with no weave and no invented byte. The next extraction is a plain cut.
//
// Run: node tests/journal-close-legs-boundary-contract.test.js
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
const U = require('./lib/journal-close-legs-undo.js');

const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/ui/journal-close-legs.js';
const MODULE_SRC = './' + MODULE_REL;
const CONTRACT_REL = 'tests/journal-close-legs-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-close-legs-undo.js';
const AUDIT_REL = 'tests/temporary-journal-forms-boundary-audit.test.js';

// ── Pinned base: the merged #412 audit commit ────────────────────────────────
const BASE_SHA = '754e3dd04f011ca94694c350cbc3d0ae1c92a26b';
const BASE_TREE = 'bd4969c91931482b590b2c4e9d08abeee09097fa';
const BASE_SUBJECT = 'test(audit): measure journal forms lifecycle boundary (#412)';
const BASE_PARENT = 'cc372ae6350bc2678b60fbedc77456e52a80323c';
const BASE_INDEX_BLOB = '68df7adb3e44cc22da26a9c3538492317950f1c8';
const BASE_CHARS = 1875314;
const BASE_UTF8 = 1909396;
const BASE_LF = 32951;
const BASE_INDEX_SHA256 = '7dd13923b25053960fb8b26bcf0d2383ebe27abe0f7b66607fa5893478503dcd';
const BASE_LOCAL_SCRIPTS = 56;
// Ratchet. Advanced to 141 by the Journal trade-detail extraction audit, which
// adds tests/temporary-journal-trade-detail-boundary-audit.test.js. That audit
// is replaced one-for-one by its permanent contract, so the count stays at 141.
const TEST_FILE_COUNT = 141;

// ── The audited raw fragment, and its two parts ──────────────────────────────
const RAW_AT = 1740414;
const RAW_END = 1752652;
const RAW_START_LINE = 30430;
const RAW_CHARS = 12238;
const RAW_UTF8 = 12337;
const RAW_LF = 231;
const RAW_SHA256 = 'dcc3de2aadd3944a875918bc553759a2faad3d5c168ac8bb9180e6cf9359118b';

const MODULE_CHARS = 12237;
const MODULE_UTF8 = 12336;
const MODULE_LF = 230;
const MODULE_SHA256 = 'f43928cc65f576de51f535b69e3313c79a6c46c998c54f280342f9228a6a64db';

const SEPARATOR = '\n';
const SEPARATOR_AT = 1752651;

// ── The shipped document ─────────────────────────────────────────────────────
const INDEX_CHARS = 1863130;
const INDEX_UTF8 = 1897113;
const INDEX_LF = 32721;
const INDEX_SHA256 = '8e52b9a882b29c3097c4bc6031c90349be4fffba481710a909b6f6f8695b4721';
const LOCAL_SCRIPT_COUNT = 57;
const TAG_AT = 113151;
const CODE_AT = 113213;
const CODE_END = 1863104;

const MODULE_TAG = '<script src="' + MODULE_SRC + '"></script>';
const ANCHOR_TAG = '<script src="./js/ui/tt-reconnect.js"></script>';
const INLINE_OPEN = '<script>';

// ── The six owners ───────────────────────────────────────────────────────────
const OWNERS = [
  { name: '_closeLegsTradeId', form: 'var', isAsync: false, chars: 29 },
  { name: 'showCloseLegsModal', form: 'function', isAsync: false, chars: 281 },
  { name: 'closeLegsModal', form: 'function', isAsync: false, chars: 125 },
  { name: '_renderCloseLegsForm', form: 'function', isAsync: false, chars: 6136 },
  { name: '_clPnlPreview', form: 'function', isAsync: false, chars: 1452 },
  { name: 'submitCloseLegs', form: 'function', isAsync: true, chars: 4134 },
];
const OWNER_NAMES = OWNERS.map((o) => o.name);
const STATE = '_closeLegsTradeId';
const STATE_DECL = 'var _closeLegsTradeId = null;';

const DEPENDENCIES = ['Date', 'JSON', 'Math', 'NaN', 'S', '_buildRichSnapshot',
  '_journalSnapshotPrefetch', '_scheduleSnapshotTechRetry', '_spyPrice', 'aggregateGreeks',
  'document', 'escHtml', 'isNaN', 'journalManager', 'parseFloat', 'positionManager',
  'renderPortfolioJournalView', 'renderPortfolioView', 'showToast', 'showTradeDetails'];
const DEPENDENCY_COUNT = 20;
const CALLTIME_REFS = {
  Date: 2, JSON: 1, Math: 1, NaN: 1, S: 1, _buildRichSnapshot: 1, _journalSnapshotPrefetch: 1,
  _scheduleSnapshotTechRetry: 1, _spyPrice: 1, aggregateGreeks: 1, document: 12, escHtml: 4,
  isNaN: 3, journalManager: 6, parseFloat: 5, positionManager: 1, renderPortfolioJournalView: 1,
  renderPortfolioView: 1, showToast: 2, showTradeDetails: 1,
};
const CALLTIME_TOTAL = 47;

// ── The consumer topology ────────────────────────────────────────────────────
const GENERATED_HANDLER = 'onclick="showCloseLegsModal(+this.dataset.tid)"';
const GENERATED_HANDLER_OWNER = 'showTradeDetails';
const STATIC_HANDLER = 'onclick="if(event.target===this)closeLegsModal()"';
const DOM_ID = 'id="closeLegsModal"';

// ── The step-2 payoff: A and C, now contiguous ───────────────────────────────
const REMAINDER_AT = 1718831;
const REMAINDER_END = 1765492;
const REMAINDER_RAW = { chars: 46661, utf8: 46829, lf: 949, sha: 'ec16ed3caf80d7da50e6a239eb8dce48ddf9a447be8353b46e05af46cd8ac914' };
const REMAINDER_BODY = { chars: 46660, utf8: 46828, lf: 948, sha: '4ace9380e0cd021836dfc4fc68b0eb4c3dbb8c7b97f98a657fd44ec94b434f7d' };
const REMAINDER_DECLS = 41;
// The two blocks the remainder is made of, in BASE coordinates.
const A_AT = 1718777, A_END = 1740414;
const C_AT = 1752652, C_END = 1777676;

// ─────────────────────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throws(fn, re, m) { assert.throws(fn, re, m); pass++; }
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function utf8(s) { return Buffer.byteLength(s, 'utf8'); }
function countLf(s) { let n = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++; return n; }
function metrics(s) { return { chars: s.length, utf8: utf8(s), lf: countLf(s), sha: sha256(s) }; }
function lineAt(s, o) { return s.slice(0, o).split('\n').length; }
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function localScripts(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src));
}
function shape(src) {
  return scanTopLevelDeclarations(src)
    .map((e) => ({ name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
}
function loadInEmptyVm(src) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'journal-close-legs.js' });
    return { ok: true, error: null, globals: Object.keys(sandbox).sort() };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), globals: Object.keys(sandbox).sort() };
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
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
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

console.log('JOURNAL CLOSE LEGS — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited Candidate B (#412) · base=' + BASE_SHA);

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// The Journal trade-forms owner is a LATER layer sitting on top of this one, so
// the live document is no longer the one this layer shipped. Peel it first and
// every assertion below still measures the exact document this contract pins.
const TRADE_FORMS_U = require('./lib/journal-trade-forms-undo.js');
const TRADE_FORMS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-forms.js'), 'utf8');
// The Journal trade-detail owner is the newest layer of all: peel it FIRST so
// every undo below still sees the exact document it was cut against. Its helper
// re-verifies its own output by length and SHA-256, so the hop is proved.
const TRADE_DETAIL_U = require('./lib/journal-trade-detail-undo.js');
const TRADE_DETAIL_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-detail.js'), 'utf8');
const PRE_TRADE_DETAIL = TRADE_DETAIL_U.isApplied(LIVE_INDEX)
  ? TRADE_DETAIL_U.undoJournalTradeDetail(LIVE_INDEX, TRADE_DETAIL_MODULE)
  : LIVE_INDEX;
const INDEX = TRADE_FORMS_U.isApplied(PRE_TRADE_DETAIL)
  ? TRADE_FORMS_U.undoJournalTradeForms(PRE_TRADE_DETAIL, TRADE_FORMS_MODULE)
  : PRE_TRADE_DETAIL;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const BASE_INDEX = git(['show', BASE_SHA + ':index.html']);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base, rederived from git');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git, not guessed');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #412 audit');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'the base parent is #411');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(BASE_INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the base index.html identity: 1,875,314 units / 1,909,396 bytes / 32,951 LF / 7dd13923…');
eq(localScripts(BASE_INDEX).length, BASE_LOCAL_SCRIPTS, 'the base loaded 56 local application scripts');
ok(BASE_INDEX.indexOf('\r') < 0, 'the base is LF-only, so UTF-16 offsets are stable');
eq(BASE_INDEX.indexOf(MODULE_TAG), -1, 'the base carried no Close Legs tag');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The moved fragment, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
const RAW = BASE_INDEX.slice(RAW_AT, RAW_END);
eq(metrics(RAW), { chars: RAW_CHARS, utf8: RAW_UTF8, lf: RAW_LF, sha: RAW_SHA256 },
  'the raw fragment: 12,238 units / 12,337 bytes / 231 LF / dcc3de2a…');
eq(lineAt(BASE_INDEX, RAW_AT), RAW_START_LINE, 'it began on line 30,430 of the base');
ok(/^\/\/ ── CLOSE LEGS FORM/.test(RAW), 'it opens on its own banner comment');
eq(BASE_INDEX.slice(RAW_AT - 3, RAW_AT), '}\n\n', 'it began right after a complete `}\\n\\n` seam');
eq(RAW.slice(-3), '}\n\n', 'and it ends `}\\n\\n`');
// The separator model, proved against the base rather than assumed.
eq(RAW, MODULE + SEPARATOR, 'raw === module body + exactly one LF');
eq(BASE_INDEX.slice(SEPARATOR_AT, SEPARATOR_AT + 1), SEPARATOR, 'the separator is the LF at 1,752,651');
eq(RAW_CHARS - MODULE_CHARS, 1, 'the separator is exactly one unit');
eq(RAW_LF - MODULE_LF, 1, 'the separator is exactly one LF');
eq(U.RAW_AT, RAW_AT, 'the undo helper pins the same raw offset');
eq(U.RAW_END, RAW_END, 'the undo helper pins the same raw end');
eq(U.RAW_SHA256, RAW_SHA256, 'the undo helper pins the same raw hash');
eq(U.SEPARATOR_AT, SEPARATOR_AT, 'the undo helper pins the same separator offset');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The module file');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(MODULE), { chars: MODULE_CHARS, utf8: MODULE_UTF8, lf: MODULE_LF, sha: MODULE_SHA256 },
  'the module: 12,237 units / 12,336 bytes / 230 LF / f43928cc…');
eq(MODULE, BASE_INDEX.slice(RAW_AT, RAW_END - 1), 'the module is byte-identical to the base fragment body');
eq(MODULE.slice(-2), '}\n', 'it ends on a real line of code');
ok(!/\n\s*\n$/.test(MODULE), 'no blank line at EOF, so `git diff --check` stays clean');
ok(MODULE.indexOf('\r') < 0, 'the module is LF-only');
eq((MODULE.match(/\bexport\b|\bimport\b/g) || []), [], 'it is a classic script, not an ES module');
eq((maskLiterals(MODULE).match(/\bwindow\s*\.\s*[A-Za-z_$]/g) || []), [],
  'it needs no window.* exposure glue: the owners are already classic globals');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The six owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(shape(MODULE), OWNERS, 'the module declares exactly its six owners, in order, with the pinned form/async/span');
eq(shape(MODULE).map((d) => d.name), OWNER_NAMES, 'the owner names, in source order');
eq(shape(MODULE).filter((d) => d.isAsync).map((d) => d.name), ['submitCloseLegs'],
  'submitCloseLegs is the only async owner');
eq(shape(MODULE).filter((d) => d.form === 'var').map((d) => d.name), [STATE],
  '_closeLegsTradeId is the only var');
eq(OWNERS.reduce((n, o) => n + o.chars, 0), 12157, 'the six owner spans sum to 12,157 units');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Load-time purity');
// ─────────────────────────────────────────────────────────────────────────────
const decls = scanTopLevelDeclarations(MODULE);
const residueChars = Array.from(MODULE);
decls.forEach((d) => { for (let i = d.start; i <= d.end; i++) residueChars[i] = ' '; });
eq(maskLiterals(residueChars.join('')).replace(/\s+/g, ''), '',
  'top level is declarations, comments and whitespace only — no residue');
const loaded = loadInEmptyVm(MODULE);
ok(loaded.ok, 'the module evaluates in an empty VM with no error');
eq(loaded.error, null, '…and throws nothing');
eq(loaded.globals, OWNER_NAMES.slice().sort(), 'it defines exactly the six globals, and no others');
eq(loaded.globals.length, 6, 'exactly six globals');
eq(topLevelCallSites(MODULE).length, 0, 'zero top-level calls');
eq(topLevelHits(MODULE, /\b(?:document|window)\s*\./).length, 0, 'zero top-level DOM access');
eq(topLevelHits(MODULE, /\b(?:localStorage|sessionStorage|indexedDB)\b/).length, 0, 'zero top-level storage access');
eq(topLevelHits(MODULE, /\baddEventListener\b/).length, 0, 'zero top-level listeners');
eq(topLevelHits(MODULE, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length, 0, 'zero top-level timers');
eq(topLevelHits(MODULE, /\b(?:fetch|XMLHttpRequest|WebSocket|navigator)\b/).length, 0, 'zero top-level network work');
eq(topLevelHits(MODULE, /\b(?:journalManager|positionManager|portfolioManager)\b/).length, 0, 'zero top-level journal work');
eq(MODULE.slice(decls[0].start, decls[0].end + 1), STATE_DECL,
  'the state owner is initialised with an inert literal');

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependencies, and why the tag may sit where it does');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(MODULE), DEPENDENCIES, 'the free-dependency inventory is exactly the audited 20 names');
eq(DEPENDENCIES.length, DEPENDENCY_COUNT, 'twenty dependencies');
const cls = classifyReferences(MODULE, DEPENDENCIES);
eq(cls.loadTime, [], 'NO dependency is read while the module is being evaluated');
eq(cls.callTime.length, CALLTIME_TOTAL, 'all 47 dependency references are call-time');
const perName = {};
for (const r of cls.callTime) perName[r.name] = (perName[r.name] || 0) + 1;
eq(perName, CALLTIME_REFS, 'the per-dependency call-time reference counts');
eq(DEPENDENCIES.filter((n) => !perName[n]), [], 'every declared dependency is actually referenced');
// This is the whole load-order story: with no evaluation-time read, the tag may
// sit anywhere before the inline monolith. It sits right after tt-reconnect.js.
ok(cls.loadTime.length === 0, 'the module imposes NO load-order constraint on its dependencies');

// ─────────────────────────────────────────────────────────────────────────────
section('7. The consumer topology, in the shipped document');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline monolith opens at the pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at the pinned offset');
const CODE = INDEX.slice(CODE_AT, CODE_END);
const VIEWS = lexicalViews(CODE);
let codeRefs = 0;
for (const n of OWNER_NAMES) codeRefs += refSites(VIEWS.code, n).length;
eq(codeRefs, 0, 'ZERO executable-code references to any owner remain in the monolith');
for (const n of OWNER_NAMES) {
  eq(refSites(VIEWS.comments, n).length, 0, 'no comment in the monolith mentions ' + n);
}
// The generated handler, and the function that emits it.
eq(countLiteral(INDEX, GENERATED_HANDLER), 1, 'exactly one generated showCloseLegsModal(...) handler');
const genAt = INDEX.indexOf(GENERATED_HANDLER) - CODE_AT;
const genOwner = scanTopLevelDeclarations(CODE).find((d) => genAt >= d.start && genAt <= d.end);
eq(genOwner && genOwner.name, GENERATED_HANDLER_OWNER, '…emitted inside showTradeDetails');
let genRefs = 0;
for (const n of OWNER_NAMES) genRefs += refSites(VIEWS.strings, n).length;
eq(genRefs, 1, 'and it is the ONLY reference to an owner in generated markup');
// The static handler, and the DOM id that must not be mistaken for one.
const HEAD = INDEX.slice(0, CODE_AT);
eq(countLiteral(HEAD, STATIC_HANDLER), 1, 'exactly one static closeLegsModal() invocation in markup');
eq(countLiteral(HEAD, DOM_ID), 1, 'exactly one id="closeLegsModal" attribute');
const markupHits = refSites(HEAD, 'closeLegsModal');
eq(markupHits.length, 2, 'the identifier occurs twice in markup');
const classified = markupHits.map((i) => {
  const after = HEAD.slice(i + 'closeLegsModal'.length, i + 'closeLegsModal'.length + 4);
  const before = HEAD.slice(Math.max(0, i - 12), i);
  return /^\s*\(/.test(after) ? 'call' : (/id\s*=\s*["']$/.test(before) ? 'domId' : 'other');
});
eq(classified, ['domId', 'call'], '…one is the DOM id, one is the call, and they are told apart');
eq(classified.filter((c) => c === 'call').length, 1, 'exactly one markup consumer');
eq(classified.filter((c) => c === 'domId').length, 1, 'the DOM id is NOT counted as a consumer');

// ─────────────────────────────────────────────────────────────────────────────
section('8. The shipped index.html');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(INDEX), { chars: INDEX_CHARS, utf8: INDEX_UTF8, lf: INDEX_LF, sha: INDEX_SHA256 },
  'the shipped document: 1,863,130 units / 1,897,113 bytes / 32,721 LF / 8e52b9a8…');
eq(BASE_CHARS - RAW_CHARS + (1 + MODULE_TAG.length), INDEX_CHARS,
  'the arithmetic holds: 1,875,314 − 12,238 + 54 = 1,863,130');
eq(BASE_LF - RAW_LF + 1, INDEX_LF, 'the LF arithmetic holds: 32,951 − 231 + 1 = 32,721');
eq(localScripts(INDEX).length, LOCAL_SCRIPT_COUNT, 'it loads 57 local application scripts');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'exactly one Close Legs tag');
eq(INDEX.indexOf(MODULE_TAG), TAG_AT, 'the tag sits at the pinned offset');
eq(INDEX.slice(INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length, TAG_AT), '\n',
  'immediately after tt-reconnect.js');
eq(INDEX.slice(TAG_AT + MODULE_TAG.length, TAG_AT + MODULE_TAG.length + 1 + INLINE_OPEN.length),
  '\n' + INLINE_OPEN, 'and immediately before the inline monolith');
eq(localScripts(INDEX).map((t) => t.src).slice(-2), ['./js/ui/tt-reconnect.js', MODULE_SRC],
  'it is the last local script, after the reconnect owner');
const rawTag = /<script\b[^>]*journal-close-legs\.js[^>]*>/.exec(INDEX);
ok(rawTag && !/\basync\b/.test(rawTag[0]), 'the tag is not async');
ok(rawTag && !/\bdefer\b/.test(rawTag[0]), 'the tag is not deferred');
ok(rawTag && !/type\s*=\s*["']module["']/.test(rawTag[0]), 'the tag is not type=module');
eq(INDEX.indexOf(MODULE), -1, 'not one byte of the module body is left in the document');
eq(INDEX.indexOf('CLOSE LEGS FORM'), -1, 'the Close Legs banner is gone from the document');
// The separator left with the body. Had it been stranded, the document would be
// one unit and one LF longer than the pinned identity.
eq(INDEX_LF, BASE_LF - RAW_LF + 1, 'the structural separator left with the body, not stranded inline');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The byte-exact undo');
// ─────────────────────────────────────────────────────────────────────────────
eq(U.MODULE_SHA256, MODULE_SHA256, 'the undo helper pins the module hash this contract measured');
eq(U.EXTRACTED_SHA256, INDEX_SHA256, 'the undo helper pins the shipped document hash');
eq(U.BASE_SHA256, BASE_INDEX_SHA256, 'the undo helper pins the base hash');
eq(U.BASE_LOCAL_SCRIPTS, BASE_LOCAL_SCRIPTS, 'the undo helper pins the base script count');
eq(U.EXTRACTED_LOCAL_SCRIPTS, LOCAL_SCRIPT_COUNT, 'the undo helper pins the shipped script count');
ok(U.isApplied(INDEX), 'the extraction reads as applied');
ok(!U.isApplied(BASE_INDEX), 'the base reads as not applied');
const restored = U.undoJournalCloseLegs(INDEX, MODULE);
eq(restored, BASE_INDEX, 'the undo reconstructs the base index.html byte for byte');
eq(sha256(restored), BASE_INDEX_SHA256, '…with the base SHA-256');
eq(metrics(restored), metrics(BASE_INDEX), '…and every base metric');

// ─────────────────────────────────────────────────────────────────────────────
section('10. The step-2 payoff: Manual Entry and Adjustment are now contiguous');
// ─────────────────────────────────────────────────────────────────────────────
const REM_RAW = INDEX.slice(REMAINDER_AT, REMAINDER_END);
const REM_BODY = INDEX.slice(REMAINDER_AT, REMAINDER_END - 1);
eq(metrics(REM_RAW), { chars: REMAINDER_RAW.chars, utf8: REMAINDER_RAW.utf8, lf: REMAINDER_RAW.lf, sha: REMAINDER_RAW.sha },
  'the remainder raw block matches the audit prediction: 46,661 units / ec16ed3c…');
eq(metrics(REM_BODY), { chars: REMAINDER_BODY.chars, utf8: REMAINDER_BODY.utf8, lf: REMAINDER_BODY.lf, sha: REMAINDER_BODY.sha },
  'and its shippable body: 46,660 units / 4ace9380…');
eq(REM_RAW, BASE_INDEX.slice(A_AT, A_END) + BASE_INDEX.slice(C_AT, C_END),
  'the remainder IS the base Manual Entry raw bytes followed immediately by the base Adjustment raw bytes');
eq(REM_RAW.slice(0, A_END - A_AT), BASE_INDEX.slice(A_AT, A_END), '…Manual Entry first, unchanged');
eq(REM_RAW.slice(A_END - A_AT), BASE_INDEX.slice(C_AT, C_END), '…then Adjustment, unchanged');
eq(REMAINDER_RAW.chars, (A_END - A_AT) + (C_END - C_AT), 'no byte invented or dropped: 21,637 + 25,024 = 46,661');
eq(REM_RAW.indexOf('CLOSE LEGS FORM'), -1, 'no Close Legs banner survives between them');
eq(REM_BODY.slice(-2), '}\n', 'the remainder body ends `}\\n`');
eq(INDEX.slice(REMAINDER_END - 1, REMAINDER_END), SEPARATOR, 'followed by exactly one structural LF');
eq(scanTopLevelDeclarations(REM_BODY).length, REMAINDER_DECLS, 'it carries 41 declarations');
ok(/^\/\/ ── JOURNAL MANUAL ENTRY FORM/.test(REM_BODY), 'it opens on the Manual Entry banner');
// The A↔C coupling the audit measured is still intact, and now lives entirely
// inside one contiguous region — which is the point of extracting B first.
const ADJ_STATE = ['_adjFormTradeId', '_adjFormNewLegs', '_adjFormNewStrategy',
  '_adjFormLegsToRoll', '_adjFormRollClosePrices'];
const remMasked = maskLiterals(REM_BODY);
eq(ADJ_STATE.map((n) => refSites(remMasked, n).length), [20, 15, 7, 16, 13],
  'all five _adjForm* owners and their users are inside the one contiguous region');
for (const n of ADJ_STATE) {
  eq(refSites(VIEWS.code, n).filter((i) => {
    const abs = i + CODE_AT;
    return abs < REMAINDER_AT || abs >= REMAINDER_END;
  }).length, 0, n + ' appears nowhere else in the monolith');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
// Each control asserts the EXACT undo error it genuinely produces.
throws(() => U.undoJournalCloseLegs(null, MODULE), /JOURNAL_CLOSE_LEGS_UNDO_BAD_INPUT/,
  '11.1 a non-string document is rejected');
throws(() => U.undoJournalCloseLegs(INDEX, null), /JOURNAL_CLOSE_LEGS_UNDO_BAD_INPUT/,
  '11.2 a non-string module is rejected');
throws(() => U.undoJournalCloseLegs(INDEX, MODULE + SEPARATOR),
  /JOURNAL_CLOSE_LEGS_UNDO_MODULE_IDENTITY/,
  '11.3 a module that ABSORBED the structural separator is rejected');
throws(() => U.undoJournalCloseLegs(INDEX, MODULE.slice(0, -1)),
  /JOURNAL_CLOSE_LEGS_UNDO_MODULE_IDENTITY/,
  '11.4 a module missing its final LF is rejected');
throws(() => U.undoJournalCloseLegs(INDEX, MODULE.slice(0, 6000)),
  /JOURNAL_CLOSE_LEGS_UNDO_MODULE_IDENTITY/,
  '11.5 a truncated module is rejected');
throws(() => U.undoJournalCloseLegs(INDEX, MODULE.replace('Trade not found', 'Trade not fouud')),
  /JOURNAL_CLOSE_LEGS_UNDO_MODULE_IDENTITY/,
  '11.6 a SAME-LENGTH edit inside the module is caught by its hash');
{
  // Same size and same LF count, but ending on a blank line: MODULE_SEPARATOR,
  // not MODULE_IDENTITY, so the caller learns which mistake was made.
  const blankEnd = MODULE.slice(0, -2) + '\n\n';
  eq(blankEnd.length, MODULE_CHARS, 'the blank-line mutant is the same length');
  eq(countLf(blankEnd), MODULE_LF + 1, '…though it carries one more LF');
  throws(() => U.undoJournalCloseLegs(INDEX, blankEnd),
    /JOURNAL_CLOSE_LEGS_UNDO_MODULE_IDENTITY/,
    '11.7 a module ending on a blank line is rejected');
}
throws(() => U.undoJournalCloseLegs(BASE_INDEX, MODULE), /JOURNAL_CLOSE_LEGS_UNDO_TAG_IDENTITY/,
  '11.8 an already-unextracted document has no tag and is rejected');
throws(() => U.undoJournalCloseLegs(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /JOURNAL_CLOSE_LEGS_UNDO_TAG_IDENTITY/, '11.9 a duplicate tag is rejected');
{
  // Tag moved before its anchor: adjacency fails, identity does not.
  const untagged = INDEX.slice(0, TAG_AT) + INDEX.slice(TAG_AT + MODULE_TAG.length + 1);
  const anchorAt = untagged.indexOf(ANCHOR_TAG);
  const reordered = untagged.slice(0, anchorAt) + MODULE_TAG + '\n' + untagged.slice(anchorAt);
  eq(countLiteral(reordered, MODULE_TAG), 1, 'the reordered mutant still has exactly one tag');
  throws(() => U.undoJournalCloseLegs(reordered, MODULE),
    /JOURNAL_CLOSE_LEGS_UNDO_TAG_ADJACENCY/, '11.10 a tag before its anchor is rejected');
}
throws(() => U.undoJournalCloseLegs(INDEX + ' ', MODULE),
  /JOURNAL_CLOSE_LEGS_UNDO_EXTRACTED_IDENTITY/,
  '11.11 foreign content anywhere in the document is rejected');
{
  // The separator stranded inline: the document is one unit too long.
  const stranded = INDEX.slice(0, REMAINDER_AT) + '\n' + INDEX.slice(REMAINDER_AT);
  eq(stranded.length, INDEX_CHARS + 1, 'the stranded mutant is one unit longer');
  throws(() => U.undoJournalCloseLegs(stranded, MODULE),
    /JOURNAL_CLOSE_LEGS_UNDO_EXTRACTED_IDENTITY/,
    '11.12 a structural separator left stranded inline is rejected');
}
// The guards are not vacuous: the real pair still round-trips.
eq(U.undoJournalCloseLegs(INDEX, MODULE), BASE_INDEX, '11.13 the genuine pair still reconstructs the base');
// Consumer-edge controls, on in-memory mutants.
eq(countLiteral(INDEX.replace(GENERATED_HANDLER, 'onclick="void 0"'), GENERATED_HANDLER), 0,
  '11.14 a removed generated showCloseLegsModal handler is detectable');
eq(countLiteral(INDEX.replace(STATIC_HANDLER, 'onclick="void 0"'), STATIC_HANDLER), 0,
  '11.15 a removed static closeLegsModal() handler is detectable');
eq(countLiteral(INDEX.replace(DOM_ID, 'id="closeLegsModalX"'), DOM_ID), 0,
  '11.16 a renamed DOM id is detectable, separately from the call');
// Owner-shape controls.
eq(shape(MODULE.replace('async function submitCloseLegs', 'function submitCloseLegs'))
  .filter((d) => d.isAsync).length, 0, '11.17 submitCloseLegs losing async is detectable');
ok(freeIdentifiers(MODULE.replace(/\bescHtml\b/g, 'escHtml2')).indexOf('escHtml') < 0,
  '11.18 a renamed dependency disappears from the inventory');
ok(topLevelCallSites(MODULE + 'showToast("x");\n').length === 1,
  '11.19 an extra top-level call is detectable');
ok(topLevelHits(MODULE + 'var _x = document.title;\n', /\b(?:document|window)\s*\./).length === 1,
  '11.20 an extra top-level DOM access is detectable');

// ─────────────────────────────────────────────────────────────────────────────
section('12. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
eq(changedProduction, ['index.html', MODULE_REL, 'js/ui/journal-trade-detail.js', 'js/ui/journal-trade-forms.js'],
  'production footprint is exactly index.html plus the Close Legs owner and the later trade-forms owner');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
  'no temporary Journal forms audit is shipped: this contract replaces it');
ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
ok(!changed.some((rel) => rel.endsWith('.md')), 'no documentation changed');
ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
  'no backend/model configuration changed');
ok(!changed.some((rel) => rel === '.gitattributes'), '.gitattributes is untouched');
ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
  rel === 'js/ui/journal-trade-detail.js' || rel === 'js/ui/journal-trade-forms.js' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  'the suite is 141 test files: the shipped contracts plus the trade-detail audit');
// The audit's rejected candidates were never built. Candidate D was the WHOLE
// forms window — Manual Entry, Close Legs and Adjustment in one module. A later
// layer (#414 Candidate F) does ship js/ui/journal-trade-forms.js, but that is
// Manual Entry + Adjustment + the chain-aware leg handlers, NOT Candidate D:
// the test is therefore what that module CONTAINS, not whether it exists.
const TRADE_FORMS_REL = 'js/ui/journal-trade-forms.js';
ok(fs.existsSync(path.join(ROOT, TRADE_FORMS_REL)),
  'the later Manual Entry + Adjustment owner exists…');
{
  const laterModule = fs.readFileSync(path.join(ROOT, TRADE_FORMS_REL), 'utf8');
  for (const owner of OWNER_NAMES) {
    eq(countLiteral(laterModule, owner), 0,
      '…and it does NOT carry the Close Legs owner ' + owner + ': Candidate D was never built');
  }
  eq(countLiteral(laterModule, 'CLOSE LEGS FORM'), 0, '…nor the Close Legs banner');
}
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-manual-entry.js')), 'no manual-entry-only module exists (rejected Candidate A)');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-adjustment.js')), 'no adjustment-only module exists (rejected Candidate C)');

console.log('\n' + pass + ' assertions passed');
console.log('JOURNAL_CLOSE_LEGS_BOUNDARY_OK');
