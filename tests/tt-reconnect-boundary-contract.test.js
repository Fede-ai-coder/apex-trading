'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// TT RECONNECT UI — permanent boundary contract.
//
// The follow-up the #409 audit measured as Candidate D and #410 enabled. The
// audit found this block NON-contiguous at the time: the shared post-auth
// lifecycle owner sat between showReconnectPanel and doReconnectTT, so
// extracting it then would have needed a weave at offset 2073. #410 removed
// that middle fragment, and its permanent contract proves what was left behind
// is byte-identical to Candidate D's raw fragment. So this is a plain
// contiguous cut — NO weave — and no fresh audit was needed.
//
// RELOCATION ONLY. Every moved byte is byte-identical to the base, and §11
// proves the reverse transform reconstructs dffad56a:index.html exactly.
//
// THE SEPARATOR MODEL, unchanged from the two layers below it:
//
//     raw        [1872896,1877649)   4,753 units   53fba09f…
//     body       [1872896,1877648)   4,752 units   c380be90…   ends `}\n`
//     separator  [1877648,1877649)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` (which CI runs)
// sees no blank line at EOF. The separator is document structure, not module
// content, and the undo re-inserts it.
//
// THE OWNERS. Two classic globals, in source order, and nothing else:
//
//     function showReconnectPanel()      — renders the reconnect panel
//     async function doReconnectTT()     — submits the reconnect
//
// Their consumer topology is what makes this a UI feature rather than a service:
// static markup calls showReconnectPanel(), showReconnectPanel GENERATES the
// onclick that calls doReconnectTT(), and doReconnectTT calls the shared
// _apexPostAuthInit('reconnect') that #410 moved into the module loaded
// immediately before this one. §7 pins all four edges.
//
// Run: node tests/tt-reconnect-boundary-contract.test.js
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');
const U = require('./lib/tt-reconnect-undo.js');

const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/ui/tt-reconnect.js';
const MODULE_SRC = './' + MODULE_REL;
const CONTRACT_REL = 'tests/tt-reconnect-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/tt-reconnect-undo.js';

// ── Pinned base: the merged #410 commit ──────────────────────────────────────
const BASE_SHA = 'dffad56a68b8bb5744b6236d506825aefce9798d';
const BASE_TREE = 'ded5a882943bb84a6dba9518589253e149766dc6';
const BASE_SUBJECT = 'refactor(auth): extract shared post-auth lifecycle (#410)';
const BASE_PARENT = '852797ed03853e8d03d77b1da7a56e29fe60d467';
const BASE_INDEX_BLOB = '1cc7789405ace9e792ed194bd535444eebdfdd97';
const BASE_CHARS = 1880019;
const BASE_UTF8 = 1914141;
const BASE_LF = 33036;
const BASE_INDEX_SHA256 = '4d514626ec99e6306400f3ce8eb383629cb3ec9fd75798043cd8dc14a376ebe1';
const BASE_LOCAL_SCRIPTS = 55;
const TEST_FILE_COUNT = 138;

// ── The audited raw fragment, and its two parts ──────────────────────────────
const RAW_AT = 1872896;
const RAW_END = 1877649;
const RAW_START_LINE = 32896;
const RAW_CHARS = 4753;
const RAW_UTF8 = 4793;
const RAW_LF = 86;
const RAW_SHA256 = '53fba09f64e9663d3bcdbecd94fcbd75ef5bb389a6cbe6a69af56cd88b71093e';

const MODULE_CHARS = 4752;
const MODULE_UTF8 = 4792;
const MODULE_LF = 85;
const MODULE_SHA256 = 'c380be901aeb8f60ab188707526754597f9f3f9dd73c20b624ac68b5b920ca05';

const SEPARATOR = '\n';
const SEPARATOR_AT = 1877648;

// ── The shipped document ─────────────────────────────────────────────────────
const INDEX_CHARS = 1875314;
const INDEX_UTF8 = 1909396;
const INDEX_LF = 32951;
const INDEX_SHA256 = '7dd13923b25053960fb8b26bcf0d2383ebe27abe0f7b66607fa5893478503dcd';
const LOCAL_SCRIPT_COUNT = 56;

const MODULE_TAG = '<script src="' + MODULE_SRC + '"></script>';
const ANCHOR_TAG = '<script src="./js/services/apex-post-auth-init.js"></script>';
const MCX_CHARTS_TAG = '<script src="./js/ui/mcx-charts.js"></script>';
const INLINE_OPEN = '<script>';

// ── The two owners ───────────────────────────────────────────────────────────
const OWNERS = [
  { name: 'showReconnectPanel', form: 'function', isAsync: false, chars: 2006 },
  { name: 'doReconnectTT', form: 'function', isAsync: true, chars: 2678 },
];
const OWNER_NAMES = OWNERS.map((o) => o.name);

const DEPENDENCIES = [
  'Error', 'S', '_apexPostAuthInit', '_ttAuthLogin', 'console', 'document', 'enrichWithTT',
  'fetchEarningsForAll', 'localStorage', 'location', 'logEv', 'setAS', 'setPanel',
  'setTimeout', 'showToast',
];
const DEPENDENCY_COUNT = 15;

const S_WRITES = ['_ttSessionSource', 'ttAccounts', 'ttConnected', 'ttSessionId'];
const S_REFS = ['_ttSessionSource', 'scanData', 'ttAccounts', 'ttConnected', 'ttSessionId'];
const LOCALSTORAGE_KEY = 'apex_tt_session';
const DOM_IDS_READ = ['rtu', 'rtp', 'rttStatus', 'ttPill', 'accBtn', 'reconnectTTBtn', 'dataPill'];
const DOM_IDS_RENDERED = ['rtu', 'rtp', 'rttStatus'];

// ── The consumer topology ────────────────────────────────────────────────────
const STATIC_HANDLER = 'onclick="showReconnectPanel()"';
const GENERATED_HANDLER = 'onclick="doReconnectTT()"';
const RECONNECT_CALL = "_apexPostAuthInit('reconnect');";
const LOGIN_CALL = "_apexPostAuthInit('login');";

// ─────────────────────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throws(fn, re, m) { assert.throws(fn, re, m); pass++; }
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function lineAt(s, o) { return s.slice(0, o).split('\n').length; }
function localScripts(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src));
}
function shape(src) {
  return scanTopLevelDeclarations(src)
    .map((e) => ({ name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
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
    vm.runInContext(src, sandbox, { filename: 'tt-reconnect.js' });
    return { ok: true, error: null, globals: Object.keys(sandbox) };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), globals: Object.keys(sandbox) };
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
function matchesOf(source, re) {
  const m = maskLiterals(source);
  const out = [];
  let x;
  const r = new RegExp(re.source, 'g');
  while ((x = r.exec(m))) out.push(x.index);
  return out;
}
function sProps(source, writesOnly) {
  const m = maskLiterals(source);
  const out = new Set();
  let x;
  const r = writesOnly ? /\bS\.([A-Za-z0-9_$]+)\s*=(?!=)/g : /\bS\.([A-Za-z0-9_$]+)/g;
  while ((x = r.exec(m))) out.add(x[1]);
  return Array.from(out).sort();
}

console.log('TT RECONNECT UI — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited Candidate D (#409), enabled by #410 · base=' + BASE_SHA);

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const BASE = git(['show', BASE_SHA + ':index.html']);
const APP_SRC = APP_LOADER.loadAppJavaScriptSource();
const APP_PARTS = APP_LOADER.loadOrderedScriptSources().filter((p) => p.isAppJs && p.code != null);

// ─────────────────────────────────────────────────────────────────────────────
section('1. Pinned base and the shipped document');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'base commit resolves exactly');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'base tree resolves exactly');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'base subject is the pinned one');
eq(git(['rev-parse', BASE_SHA + '^1']).trim(), BASE_PARENT, 'the base parent is the merged #409 commit');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob is the pinned one');
eq(BASE.length, BASE_CHARS, 'base index UTF-16 length is pinned');
eq(Buffer.byteLength(BASE, 'utf8'), BASE_UTF8, 'base index UTF-8 byte length is pinned');
eq(countLiteral(BASE, '\n'), BASE_LF, 'base index LF count is pinned');
eq(sha256(BASE), BASE_INDEX_SHA256, 'base index SHA-256 is pinned');
eq(localScripts(BASE).length, BASE_LOCAL_SCRIPTS, 'the base carried exactly 55 local application scripts');

eq(INDEX.length, INDEX_CHARS, 'shipped index UTF-16 length is the predicted value');
eq(Buffer.byteLength(INDEX, 'utf8'), INDEX_UTF8, 'shipped index UTF-8 byte length is the predicted value');
eq(countLiteral(INDEX, '\n'), INDEX_LF, 'shipped index LF count is the predicted value');
eq(sha256(INDEX), INDEX_SHA256, 'shipped index SHA-256 is the predicted value');
eq(localScripts(INDEX).length, LOCAL_SCRIPT_COUNT, 'the shipped index carries exactly 56 local application scripts');
// THE ARITHMETIC. 1,880,019 − 4,753 + 48. A separator left behind inline fails
// HERE, before any hash is consulted.
eq(INDEX.length, BASE.length - RAW_CHARS + (MODULE_TAG + '\n').length,
  'the whole index delta is exactly the removed RAW fragment plus the one added tag line');
eq(BASE.length - INDEX.length, RAW_CHARS - (MODULE_TAG + '\n').length, '…and nothing else moved');
eq((MODULE_TAG + '\n').length, 48, 'the added tag line is exactly 48 units');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The raw fragment, the module body and the structural separator');
// ─────────────────────────────────────────────────────────────────────────────
const RAW = BASE.slice(RAW_AT, RAW_END);
eq(RAW.length, RAW_CHARS, 'raw fragment UTF-16 length');
eq(Buffer.byteLength(RAW, 'utf8'), RAW_UTF8, 'raw fragment UTF-8 byte length');
eq(countLiteral(RAW, '\n'), RAW_LF, 'raw fragment LF count');
eq(sha256(RAW), RAW_SHA256, 'raw fragment SHA-256 — the audit\'s Candidate D fragment');
eq(lineAt(BASE, RAW_AT), RAW_START_LINE, 'the raw fragment starts on line 32,896 of the base');
ok(RAW.startsWith('// ── TT RECONNECT panel (accessible after launch)'),
  'the raw fragment opens on the TT reconnect panel marker');
eq(countLiteral(BASE, '// ── TT RECONNECT panel (accessible after launch)'), 1,
  'that marker is unique in the base');
ok(RAW.endsWith('}\n\n'), 'the raw fragment ends exactly `}\\n\\n`');
// CONTIGUITY — the property #410 created and this extraction depends on.
eq(BASE.indexOf('async function doReconnectTT(){'), RAW_AT + 2073,
  'doReconnectTT begins exactly where showReconnectPanel ends — the block is contiguous, so there is NO weave');

const BODY = BASE.slice(RAW_AT, SEPARATOR_AT);
const SEP = BASE.slice(SEPARATOR_AT, RAW_END);
eq(BODY.length, MODULE_CHARS, 'module body UTF-16 length');
eq(Buffer.byteLength(BODY, 'utf8'), MODULE_UTF8, 'module body UTF-8 byte length');
eq(countLiteral(BODY, '\n'), MODULE_LF, 'module body LF count');
eq(sha256(BODY), MODULE_SHA256, 'module body SHA-256');
eq(SEP, SEPARATOR, 'the structural separator is exactly one LF');
eq(SEP.length, 1, 'separator UTF-16 length is 1');
eq(Buffer.byteLength(SEP, 'utf8'), 1, 'separator UTF-8 byte length is 1');
eq(countLiteral(SEP, '\n'), 1, 'separator LF count is 1');
eq(BODY + SEP, RAW, 'moduleBody + separator reproduces the raw fragment exactly');
eq(BODY.length + SEP.length, RAW_CHARS, '…and accounts for every unit of it');
// The undo helper deliberately does NOT re-check this at runtime: once its
// module hash gate passes, body + separator is fully determined, so such a
// guard could never fire. It is proved HERE against the base blob instead, and
// the helper's exported pins are checked against what this contract measured.
eq(sha256(BODY + SEP), RAW_SHA256, 'the shipped module plus one LF hashes to the pinned raw fragment');
eq(U.RAW_AT, RAW_AT, 'the undo helper pins the raw start offset');
eq(U.RAW_END, RAW_END, 'the undo helper pins the raw end offset');
eq(U.RAW_CHARS, RAW_CHARS, 'the undo helper pins the raw length');
eq(U.RAW_SHA256, RAW_SHA256, 'the undo helper pins the raw hash');
eq(U.SEPARATOR_AT, SEPARATOR_AT, 'the undo helper pins the separator offset');

eq(MODULE, BODY, 'the shipped module is byte-identical to the base module body');
eq(MODULE.length, MODULE_CHARS, 'shipped module UTF-16 length');
eq(Buffer.byteLength(MODULE, 'utf8'), MODULE_UTF8, 'shipped module UTF-8 byte length');
eq(countLiteral(MODULE, '\n'), MODULE_LF, 'shipped module LF count');
eq(sha256(MODULE), MODULE_SHA256, 'shipped module SHA-256');
ok(MODULE.endsWith('}\n'), 'the module ends `}\\n` — a real line of code');
ok(!MODULE.endsWith('\n\n'), 'the module does NOT end on a blank line: git diff --check is clean');
eq(countLiteral(INDEX, RAW), 0, 'the raw fragment no longer appears in the shipped index');
eq(countLiteral(INDEX, MODULE), 0, 'the module body no longer appears in the shipped index');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The forward transform, derived rather than assumed');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(BASE, ANCHOR_TAG + '\n'), 1, 'the apex-post-auth tag is the unique anchor in the base');
const FORWARD = (BASE.slice(0, RAW_AT) + BASE.slice(RAW_END))
  .replace(ANCHOR_TAG + '\n', ANCHOR_TAG + '\n' + MODULE_TAG + '\n');
eq(FORWARD, INDEX, 'the extraction algorithm reproduces the shipped index byte-for-byte');
eq(sha256(FORWARD), INDEX_SHA256, '…hashing to the pinned shipped SHA-256');
eq(localScripts(FORWARD).length, LOCAL_SCRIPT_COUNT, '…with 56 local application scripts');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The script tag: unique, classic, src-only, correctly placed');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(INDEX, MODULE_TAG), 1, 'exactly one TT reconnect script tag');
eq(countLiteral(INDEX, MCX_CHARTS_TAG + '\n' + ANCHOR_TAG + '\n' + MODULE_TAG + '\n' + INLINE_OPEN), 1,
  'the required tail order is mcx-charts → apex-post-auth → tt-reconnect → inline monolith');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const ownTagIdx = TAGS.findIndex((t) => t.src === MODULE_SRC);
ok(ownTagIdx >= 0, 'the tag is parsed as a real script tag');
const ownTag = TAGS[ownTagIdx];
eq(ownTag.type, null, 'the tag carries no type attribute — it is a classic script');
['defer', 'async', 'nomodule', 'crossorigin', 'integrity'].forEach((attr) => {
  eq(ownTag.attrs.indexOf(attr), -1, 'tag carries no ' + attr + ' attribute');
});
eq(String(ownTag.inline).trim(), '', 'the tag has no inline body — it is src-only');
eq(TAGS[ownTagIdx - 1].src, './js/services/apex-post-auth-init.js', 'the preceding tag is apex-post-auth-init.js');
eq(TAGS[ownTagIdx + 1].src, null, 'the following tag is the inline monolith');
eq(localScripts(INDEX).map((t) => t.src).slice(-1), [MODULE_SRC],
  'the TT reconnect owner is the LAST local application script before the monolith');
eq(APP_PARTS.map((p) => p.src || '(inline)').slice(-2), [MODULE_SRC, '(inline)'],
  'in execution order the module runs immediately before the inline monolith');
eq(APP_PARTS.filter((p) => p.kind === 'inline').length, 1,
  'the relocation added no second inline script block');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Two owners, in order, declarations-only, empty-VM safe');
// ─────────────────────────────────────────────────────────────────────────────
const SHAPE = shape(MODULE);
eq(SHAPE.length, 2, 'the module declares exactly two top-level things');
eq(SHAPE.map((e) => e.name), OWNER_NAMES, '…showReconnectPanel then doReconnectTT, in source order');
eq(SHAPE.map((e) => e.form), ['function', 'function'], '…both function declarations');
eq(SHAPE.map((e) => e.isAsync), [false, true], '…and only doReconnectTT is async');
eq(SHAPE.map((e) => e.chars), OWNERS.map((o) => o.chars), '…each with its pinned declaration span');
eq(SHAPE.filter((e) => e.form !== 'function').length, 0, 'no top-level variable declaration exists');
eq(residue(MODULE), '', 'zero executable top-level residue: the module is declarations-only');
const load = loadInEmptyVm(MODULE);
ok(load.ok, 'the module evaluates in a completely empty VM: ' + load.error);
eq(load.globals, OWNER_NAMES, 'evaluation defines exactly the two owners and nothing else');
eq(typeof load.globals, 'object', 'the empty-VM sandbox is inspectable');
ok((() => { try { new vm.Script(MODULE, { filename: MODULE_REL }); return true; } catch (e) { return false; } })(),
  'the module parses standalone as a classic script');
// Classic-script semantics: nothing was wrapped, exposed or rewritten.
eq(countLiteral(MODULE, 'use strict'), 0, 'no "use strict" was added');
eq(countLiteral(MODULE, 'window.'), 0, 'no manual window.* exposure was added');
eq(countLiteral(MODULE, 'export '), 0, 'no export was added');
eq(countLiteral(MODULE, 'import '), 0, 'no import was added');
eq(countLiteral(MODULE, 'module.exports'), 0, 'no CommonJS export was added');
ok(!/^\s*\(function|^\s*\(\s*\(\)\s*=>/.test(MODULE), 'the module is not wrapped in an IIFE');
ok(MODULE.trimStart().startsWith('// ── TT RECONNECT panel'),
  'the module opens on the original comment banner, unreformatted');
eq(countLiteral(MODULE, 'async function doReconnectTT('), 1, 'doReconnectTT is still declared async');
eq(countLiteral(MODULE, 'function showReconnectPanel('), 1, 'showReconnectPanel is still a plain function declaration');

// Load-time inertness, itemised. Every such site lies strictly inside a
// declaration body, AND an empty VM would have thrown on any of them.
const SPANS = scanTopLevelDeclarations(MODULE).map((e) => ({ start: e.start, end: e.end }));
const insideDecl = (i) => SPANS.some((s) => i >= s.start && i <= s.end);
function outsideDeclSites(re) { return matchesOf(MODULE, re).filter((i) => !insideDecl(i)); }
[['DOM', /\bdocument\s*\./], ['DOM lookup', /\bgetElementById\s*\(/], ['storage', /\blocalStorage\s*\./],
 ['timer', /\bset(?:Timeout|Interval)\s*\(/], ['listener', /\baddEventListener\s*\(/],
 ['network', /\b(?:fetch|XMLHttpRequest)\s*\(/], ['authentication', /\b_ttAuthLogin\s*\(/],
 ['credential read', /\.value\b/], ['window', /\bwindow\s*\./]].forEach(([label, re]) => {
  eq(outsideDeclSites(re).length, 0, 'no ' + label + ' access at load time');
});
eq(matchesOf(MODULE, /\baddEventListener\s*\(/).length, 0, 'the module registers no listener at all');
eq(matchesOf(MODULE, /\b(?:fetch|XMLHttpRequest)\s*\(/).length, 0, 'the module opens no network call of its own');

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependency and state contract');
// ─────────────────────────────────────────────────────────────────────────────
const DEPS = freeIdentifiers(MODULE);
eq(DEPS, DEPENDENCIES, 'the free-dependency inventory is exactly the audited 15 names');
eq(DEPS.length, DEPENDENCY_COUNT, 'the module needs exactly 15 call-time globals');
eq(DEPS.filter((n) => SHAPE.some((e) => e.name === n)), [], 'no dependency is self-satisfied');
ok(DEPS.indexOf('_apexPostAuthInit') >= 0, 'the shared post-auth owner is one of them — resolved at call time');
eq(sProps(MODULE, true), S_WRITES, 'exactly four S.* session writes');
eq(sProps(MODULE, false), S_REFS, 'the exact S.* properties referenced');
eq(matchesOf(MODULE, /\bset(?:Timeout)\s*\(/).length, 2, 'exactly two call-time setTimeout sites');
eq(matchesOf(MODULE, /\b_ttAuthLogin\s*\(/).length, 1, 'exactly one _ttAuthLogin call');
eq(matchesOf(MODULE, /\bawait\s/).length, 1, 'exactly one await');
eq(matchesOf(MODULE, /\blocalStorage\s*\./).length, 1, 'exactly one localStorage access');
eq(countLiteral(MODULE, "localStorage.setItem('" + LOCALSTORAGE_KEY + "'"), 1,
  'the single storage write uses the apex_tt_session key');
eq((MODULE.match(/getElementById\('([^']+)'\)/g) || []).map((s) => s.replace(/.*'([^']+)'.*/, '$1')),
  DOM_IDS_READ, 'exactly seven DOM element ids are read, in this order');
DOM_IDS_RENDERED.forEach((id) => {
  ok(MODULE.indexOf('id="' + id + '"') > 0, 'the panel renders the #' + id + ' element it later reads');
});
// No foreign top-level binding is reassigned: every bare-identifier assignment
// target is a local, so the only foreign writes are properties on S and on DOM
// elements fetched at call time.
const bareTargets = (function () {
  const m = maskLiterals(MODULE);
  const out = new Set();
  let x;
  const r = /(?:^|[^A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?![=>])/g;
  while ((x = r.exec(m))) out.add(x[1]);
  return Array.from(out).sort();
})();
eq(bareTargets.filter((n) => DEPS.indexOf(n) >= 0), [], 'zero foreign top-level binding reassignments');

// ─────────────────────────────────────────────────────────────────────────────
section('7. Consumer topology and classic-global resolution');
// ─────────────────────────────────────────────────────────────────────────────
// (a) static markup → showReconnectPanel
eq(countLiteral(INDEX, STATIC_HANDLER), 1, 'static markup carries exactly one onclick="showReconnectPanel()"');
eq(countLiteral(BASE, STATIC_HANDLER), 1, '…byte-identical to the base');
eq(countLiteral(MODULE, STATIC_HANDLER), 0, '…and it stayed in index.html, not in the module');
const staticOnly = INDEX.replace(/<script[\s\S]*?<\/script>/g, '');
eq(countLiteral(staticOnly, 'showReconnectPanel'), 1,
  'the static handler really is outside every <script>');
// (b) showReconnectPanel GENERATES the doReconnectTT handler, inside a string
eq(countLiteral(MODULE, GENERATED_HANDLER), 1, 'showReconnectPanel generates exactly one onclick="doReconnectTT()"');
eq(countLiteral(maskLiterals(MODULE), GENERATED_HANDLER), 0,
  '…and it lives inside a JavaScript string literal, not as code');
eq(countLiteral(staticOnly, 'doReconnectTT'), 0,
  'a static-HTML-only scanner finds NO doReconnectTT consumer — which is why it is insufficient');
// (c) doReconnectTT → the shared post-auth owner extracted in #410
eq(countLiteral(MODULE, RECONNECT_CALL), 1, 'doReconnectTT contains exactly one _apexPostAuthInit(\'reconnect\');');
eq(countLiteral(BASE, RECONNECT_CALL), 1, '…byte-identical to the base');
// (d) the normal-login consumer stays inline
eq(countLiteral(INDEX, LOGIN_CALL), 1, "the normal-login _apexPostAuthInit('login'); consumer stays inline");
eq(countLiteral(MODULE, LOGIN_CALL), 0, '…and was not dragged into the module');
// One declaration each, app-wide, and no exposure glue.
OWNER_NAMES.forEach((n) => {
  eq(scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === n).length, 1,
    n + ' has exactly one declaration app-wide');
  eq(countLiteral(APP_SRC, 'window.' + n), 0, n + ' is never exposed through window.*');
  eq(countLiteral(APP_SRC, 'export ' + n), 0, n + ' is never exported');
  eq(countLiteral(INDEX, 'function ' + n), 0, n + ' is no longer declared in index.html');
});
eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => t.type === 'module').length, 0,
  'the application carries no type="module" script — every owner is a classic global');
// Load order: this module evaluates AFTER the apex owner it calls, and BEFORE
// the inline monolith, so both markup handlers resolve at click time.
const ownerPartIdx = APP_PARTS.findIndex((p) => p.src === MODULE_SRC);
const apexPartIdx = APP_PARTS.findIndex((p) => p.src === './js/services/apex-post-auth-init.js');
ok(apexPartIdx >= 0 && ownerPartIdx === apexPartIdx + 1,
  'the module evaluates immediately after apex-post-auth-init.js, so its call-time lookup resolves');
ok(ownerPartIdx === APP_PARTS.length - 2, '…and immediately before the inline monolith');
// The documentation-only mention is still a comment, not a consumer.
const MIGRATION_SRC = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
eq(countLiteral(MIGRATION_SRC, 'doReconnectTT'), 1, 'journal-migration.js mentions doReconnectTT once');
eq(countLiteral(maskLiterals(MIGRATION_SRC), 'doReconnectTT'), 0, '…and it is a comment, not a consumer');

// ─────────────────────────────────────────────────────────────────────────────
section('8. What did NOT move');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(INDEX, 'function _apexPostAuthInit'), 0, 'the shared post-auth owner is not in index.html');
eq(countLiteral(MODULE, 'function _apexPostAuthInit'), 0, '…nor was it dragged into this module');
const APEX_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/apex-post-auth-init.js'), 'utf8');
eq(sha256(APEX_MODULE), '690e47ce4d9ad8b656d5d95f0297a0e473847250a1186674d91caa1cd5297cd9',
  'the #410 Apex module is untouched by this extraction');
const MCX_GLUE = "var _mcxResizeTimer      = null;\nwindow.addEventListener('resize', function(){\n";
ok(INDEX.indexOf(MCX_GLUE) > 0, 'the #408 MCX resize glue is still inline, byte-for-byte');
eq(countLiteral(INDEX, 'function escHtml('), 1, 'escHtml is still declared exactly once, inline');
eq(countLiteral(MODULE, 'escHtml'), 0, 'the module carries no escHtml');
eq(countLiteral(INDEX, ANCHOR_TAG), 1, 'the apex-post-auth tag is untouched');
eq(countLiteral(INDEX, MCX_CHARTS_TAG), 1, 'the mcx-charts tag is untouched');

// ─────────────────────────────────────────────────────────────────────────────
section('9. Byte-exact reverse reconstruction through the undo helper');
// ─────────────────────────────────────────────────────────────────────────────
eq(U.MODULE_CHARS, MODULE_CHARS, 'the undo helper pins the module length this contract measured');
eq(U.MODULE_UTF8, MODULE_UTF8, 'the undo helper pins the module UTF-8 size');
eq(U.MODULE_LF, MODULE_LF, 'the undo helper pins the module LF count');
eq(U.MODULE_SHA256, MODULE_SHA256, 'the undo helper pins the module hash');
eq(U.EXTRACTED_CHARS, INDEX_CHARS, 'the undo helper pins the extracted index length');
eq(U.EXTRACTED_SHA256, INDEX_SHA256, 'the undo helper pins the extracted index hash');
eq(U.EXTRACTED_LOCAL_SCRIPTS, LOCAL_SCRIPT_COUNT, 'the undo helper pins the extracted script count');
eq(U.BASE_CHARS, BASE_CHARS, 'the undo helper pins the base length');
eq(U.BASE_SHA256, BASE_INDEX_SHA256, 'the undo helper pins the base hash');
eq(U.BASE_LOCAL_SCRIPTS, BASE_LOCAL_SCRIPTS, 'the undo helper pins the base script count');
eq(U.SEPARATOR, SEPARATOR, 'the undo helper re-inserts exactly one LF');
eq(U.REINSERT_AT, RAW_AT, 'the undo helper re-inserts at the fragment offset');
ok(U.isApplied(INDEX), 'the shipped index is recognised as carrying this layer');
const rebuilt = U.undoTtReconnect(INDEX, MODULE);
eq(rebuilt.length, BASE_CHARS, 'reconstruction UTF-16 length is the pinned base');
eq(Buffer.byteLength(rebuilt, 'utf8'), BASE_UTF8, 'reconstruction UTF-8 byte length is the pinned base');
eq(countLiteral(rebuilt, '\n'), BASE_LF, 'reconstruction LF count is the pinned base');
eq(sha256(rebuilt), BASE_INDEX_SHA256, 'reconstruction hashes to the pinned base');
eq(rebuilt, BASE, 'reconstruction is byte-identical to dffad56a:index.html');
ok(!U.isApplied(rebuilt), 'the reconstruction no longer carries the tag');
eq(localScripts(rebuilt).length, BASE_LOCAL_SCRIPTS, 'the reconstruction is back to 55 local scripts');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
// Ordered so each guard is INDEPENDENTLY reachable, and each control asserts
// ONE EXACT error — no regex alternations — so no mutant can pass by tripping
// an earlier, coarser check. Every error the helper can raise is exercised
// except its closing BASE_IDENTITY, which the helper documents honestly as a
// deliberate redundant final gate: once the module hash and the whole-document
// hash both pass, the reconstruction is a pure function of two fixed byte
// strings, so no ordinary mutant can reach it.
throws(() => U.undoTtReconnect(INDEX, MODULE.slice(0, -1)), /MODULE_IDENTITY/,
  'a truncated module is rejected');
throws(() => U.undoTtReconnect(INDEX, MODULE.slice(0, 1000)), /MODULE_IDENTITY/,
  'a heavily truncated module is rejected');
throws(() => U.undoTtReconnect(INDEX, MODULE + ' '), /MODULE_IDENTITY/,
  'an appended-byte module is rejected');
throws(() => U.undoTtReconnect(INDEX, MODULE + SEPARATOR), /MODULE_IDENTITY/,
  'a module that ABSORBED its structural separator is rejected');
throws(() => U.undoTtReconnect(INDEX, MODULE.replace('CONNETTI ORA', 'CONNETTI  ORA')), /MODULE_IDENTITY/,
  'a same-size mutated module is rejected by the hash gate');
throws(() => U.undoTtReconnect(INDEX, MODULE.replace('function showReconnectPanel', 'function showReconnectPanelV2')),
  /MODULE_IDENTITY/, 'a renamed owner is rejected');
throws(() => U.undoTtReconnect(INDEX, MODULE.replace('async function doReconnectTT(', 'function doReconnectTT(')),
  /MODULE_IDENTITY/, 'de-asyncing doReconnectTT is rejected');
// A module ending on a blank line, built to be INDISTINGUISHABLE by size: one
// earlier LF becomes a space (LF −1) and the closing `}\n` becomes `\n\n`
// (LF +1), so the size gate cannot catch it and the separator gate must.
const blankLineEofMutant = (function () {
  const firstLf = MODULE.indexOf('\n');
  const spaced = MODULE.slice(0, firstLf) + ' ' + MODULE.slice(firstLf + 1);
  return spaced.slice(0, -2) + '\n\n';
})();
eq(blankLineEofMutant.length, MODULE_CHARS, 'the blank-line-EOF mutant has the SAME UTF-16 length as the module');
eq(Buffer.byteLength(blankLineEofMutant, 'utf8'), MODULE_UTF8, '…the same UTF-8 byte length');
eq(countLiteral(blankLineEofMutant, '\n'), MODULE_LF, '…and the same LF count');
ok(blankLineEofMutant.endsWith('\n\n') && !blankLineEofMutant.endsWith('}\n'), '…but it ends on a blank line');
throws(() => U.undoTtReconnect(INDEX, blankLineEofMutant), /MODULE_SEPARATOR/,
  'a same-size module ending on a blank line is rejected BY THE SEPARATOR GUARD');
throws(() => U.undoTtReconnect(INDEX, null), /BAD_INPUT/, 'a null module is rejected');
throws(() => U.undoTtReconnect(INDEX, undefined), /BAD_INPUT/, 'an undefined module is rejected');
// Document-shaped mutants.
throws(() => U.undoTtReconnect(INDEX.replace(MODULE_TAG + '\n', ''), MODULE), /TAG_IDENTITY/,
  'a missing script tag is rejected');
throws(() => U.undoTtReconnect(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /TAG_IDENTITY/, 'a duplicated script tag is rejected');
throws(() => U.undoTtReconnect(
  INDEX.replace(ANCHOR_TAG + '\n' + MODULE_TAG + '\n', MODULE_TAG + '\n' + ANCHOR_TAG + '\n'), MODULE),
  /TAG_ADJACENCY/, 'a reordered tag — before apex-post-auth-init.js — is rejected');
throws(() => U.undoTtReconnect(BASE, MODULE), /TAG_IDENTITY/,
  'an already-unextracted document is rejected — no reconstruction is ever guessed');
throws(() => U.undoTtReconnect(INDEX.replace('mcxResults', 'mcxResultZ'), MODULE), /EXTRACTED_IDENTITY/,
  'foreign content elsewhere in the extracted index is rejected');
// A separator left stranded inline makes the document one byte too long.
throws(() => U.undoTtReconnect(
  INDEX.slice(0, RAW_AT + (MODULE_TAG + '\n').length) + SEPARATOR
  + INDEX.slice(RAW_AT + (MODULE_TAG + '\n').length), MODULE),
  /EXTRACTED_IDENTITY/, 'a structural separator left inline is rejected');

// Guards measured against the shipped tree rather than through the helper.
function tagViolations(html) {
  const out = [];
  const tags = APP_LOADER.parseScriptTags(html);
  const at = tags.findIndex((t) => t.src === MODULE_SRC);
  if (at < 0) { out.push('missing'); return out; }
  if (tags.filter((t) => t.src === MODULE_SRC).length !== 1) out.push('duplicate');
  if (tags[at - 1] == null || tags[at - 1].src !== './js/services/apex-post-auth-init.js') out.push('not-after-anchor');
  if (tags[at + 1] == null || tags[at + 1].src !== null) out.push('not-before-inline');
  if (tags[at].type != null && String(tags[at].type).trim() !== '') out.push('type');
  if (/(?:^|\s)(?:async|defer)(?=[\s=>]|$)/i.test(tags[at].attrs)) out.push('async-or-defer');
  return out;
}
eq(tagViolations(INDEX), [], 'the shipped tag passes every tag guard');
eq(tagViolations(INDEX.replace(MODULE_TAG, '<script type="module" src="' + MODULE_SRC + '"></script>')), ['type'],
  'a type="module" tag mutant is rejected');
eq(tagViolations(INDEX.replace(MODULE_TAG, '<script src="' + MODULE_SRC + '" async></script>')), ['async-or-defer'],
  'an async tag mutant is rejected');
eq(tagViolations(INDEX.replace(MODULE_TAG, '<script src="' + MODULE_SRC + '" defer></script>')), ['async-or-defer'],
  'a defer tag mutant is rejected');
eq(tagViolations(INDEX.replace(MODULE_TAG + '\n', '')), ['missing'], 'a missing tag is rejected by the tag guard');
// A duplicated tag also displaces the inline monolith, so the guard reports
// both facts. The expectation states exactly what it really produces.
eq(tagViolations(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)), ['duplicate', 'not-before-inline'],
  'a duplicate tag is rejected by the tag guard');
// Swapping the two tags breaks BOTH adjacency facts: the reconnect tag is no
// longer after the anchor, and the anchor now sits where the monolith should.
eq(tagViolations(INDEX.replace(ANCHOR_TAG + '\n' + MODULE_TAG + '\n', MODULE_TAG + '\n' + ANCHOR_TAG + '\n')),
  ['not-after-anchor', 'not-before-inline'], 'a tag placed before apex-post-auth-init.js is rejected');
// Ownership and consumer mutants, measured against the manifest.
eq(shape(MODULE.replace('function showReconnectPanel', 'function showReconnectPanelV2')).map((e) => e.name),
  ['showReconnectPanelV2', 'doReconnectTT'], 'a renamed owner is caught by the manifest');
eq(shape(BASE.slice(1874969, RAW_END - 1) + '\n' + BASE.slice(RAW_AT, 1874969)).map((e) => e.name),
  ['doReconnectTT', 'showReconnectPanel'], 'a reordered owner pair is caught by the manifest');
eq(shape(MODULE.replace('async function doReconnectTT(', 'function doReconnectTT(')).map((e) => e.isAsync),
  [false, false], 'de-asyncing doReconnectTT is caught by the manifest');
ok(residue(MODULE + '\nshowReconnectPanel();\n') !== '', 'an added top-level call is caught');
ok(residue(MODULE + "\nwindow.addEventListener('load', function(){});\n") !== '', 'an added top-level listener is caught');
ok(residue(MODULE + '\nsetTimeout(showReconnectPanel, 0);\n') !== '', 'an added top-level timer is caught');
ok(!loadInEmptyVm(MODULE + "\ndocument.getElementById('x');\n").ok,
  'an added top-level DOM access stops the module evaluating in an empty VM');
ok(freeIdentifiers(MODULE.replace(/setPanel/g, 'setPanelV2')).indexOf('setPanel') < 0,
  'a changed free dependency is caught by the inventory');
eq(countLiteral(INDEX.replace(STATIC_HANDLER, 'onclick="void 0"'), STATIC_HANDLER), 0,
  'a removed static showReconnectPanel handler is detectable');
eq(countLiteral(MODULE.replace(GENERATED_HANDLER, 'onclick="void 0"'), GENERATED_HANDLER), 0,
  'a removed generated doReconnectTT handler is detectable');
eq(countLiteral(MODULE.replace(RECONNECT_CALL, ''), RECONNECT_CALL), 0,
  "a removed _apexPostAuthInit('reconnect') call is detectable");

// ─────────────────────────────────────────────────────────────────────────────
section('11. Exact production scope');
// ─────────────────────────────────────────────────────────────────────────────
const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
eq(changedProduction, ['index.html', MODULE_REL],
  'production footprint is exactly index.html plus the TT reconnect owner');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
ok(!changed.some((rel) => rel.endsWith('.md')), 'no documentation changed');
ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
  'no backend/model configuration changed');
ok(!changed.some((rel) => rel === '.gitattributes'), '.gitattributes is untouched');
ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  'the suite is 138 test files: this genuinely new extraction layer added one');
// The audit's rejected candidates were never built.
ok(!fs.existsSync(path.join(ROOT, 'js/ui/tt-auth-lifecycle.js')), 'no combined TT auth lifecycle module exists');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/tt-reconnect-panel.js')), 'no separate reconnect panel module exists');

console.log('\n' + pass + ' assertions passed');
console.log('TT_RECONNECT_BOUNDARY_OK');
