'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// APEX SHARED POST-AUTHENTICATION LIFECYCLE — permanent boundary contract.
//
// Replaces tests/temporary-tt-auth-lifecycle-audit.test.js, which measured four
// candidate cuts (#409) and recommended this one. What shipped is that
// recommendation, unchanged: Candidate C, the single owner in the 9,224-unit TT
// reconnect block that has two INDEPENDENT consumers — the normal login path and
// doReconnectTT — and therefore does not belong to the reconnect UI feature.
//
// RELOCATION ONLY. Every moved byte is byte-identical to the base, and §12
// proves the reverse transform reconstructs 852797ed:index.html exactly.
//
// THE SEPARATOR MODEL, which this contract exists to keep honest. The audited
// raw fragment is moduleBody + structuralSeparator:
//
//     raw        [1874908,1879379)   4,471 units   ed3bb60e…
//     body       [1874908,1879378)   4,470 units   690e47ce…   ends `}\n`
//     separator  [1879378,1879379)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file — which is
// what lets it end on a real line of code, so `git diff --check` (which CI runs)
// sees no blank line at EOF. The separator is document structure, not module
// content, and the undo re-inserts it. Leaving it inline would strand one byte,
// change the extracted index hash, and break the contiguity result below.
//
// THE CONTIGUITY RESULT. Because the COMPLETE raw fragment left, the reconnect
// UI that stayed behind is now contiguous: showReconnectPanel immediately
// followed by doReconnectTT, 4,753 units hashing to 53fba09f… — byte-identical
// to the audit's Candidate D fragment. That is what makes the follow-up
// reconnect-UI extraction a plain contiguous cut with no weave. It is asserted
// here so a later edit cannot quietly destroy it.
//
// DIRECT IS NOT TRANSITIVE. §7 measures _apexPostAuthInit's own effect surface
// (empty) AND the own surfaces of the twelve lifecycle entry points it calls
// (1 fetch, 3 setInterval, 2 setTimeout, 1 DOM write). The audit's source-backed
// 3/6/3 TT/DXLink coupling classification is carried forward in §8. Neither is
// allowed to stand in for the other.
//
// Run: node tests/apex-post-auth-init-boundary-contract.test.js
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, stripComments, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');
const U = require('./lib/apex-post-auth-init-undo.js');

const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/services/apex-post-auth-init.js';
const MODULE_SRC = './' + MODULE_REL;
const CONTRACT_REL = 'tests/apex-post-auth-init-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/apex-post-auth-init-undo.js';
const AUDIT_REL = 'tests/temporary-tt-auth-lifecycle-audit.test.js';

// ── Pinned base: the merged #409 audit commit ────────────────────────────────
const BASE_SHA = '852797ed03853e8d03d77b1da7a56e29fe60d467';
const BASE_TREE = 'c3173bf024043092ed8caf5929368814543c8a03';
const BASE_SUBJECT = 'test(audit): measure TT auth lifecycle boundary (#409)';
const BASE_INDEX_BLOB = '8b950dd00a71117955990e115d58ce143ac348ff';
const BASE_CHARS = 1884429;
const BASE_UTF8 = 1918599;
const BASE_LF = 33097;
const BASE_INDEX_SHA256 = 'b5f6dd5b2fad6e1d3e0ce3fee4abf5cfb561c19de714e20f86874e49e10a857e';
const BASE_LOCAL_SCRIPTS = 54;
// Ratchet. Advanced to 140 by the Manual Entry + Adjustment extraction audit,
// which adds tests/temporary-journal-manual-adjustment-boundary-audit.test.js.
// That audit is replaced one-for-one by its permanent contract, so the count
// stays at 140 — it does not go back to 139.
const TEST_FILE_COUNT = 140;

// ── The audited raw fragment, and its two parts ──────────────────────────────
const RAW_AT = 1874908;
const RAW_END = 1879379;
const RAW_START_LINE = 32930;
const RAW_CHARS = 4471;
const RAW_UTF8 = 4519;
const RAW_LF = 62;
const RAW_SHA256 = 'ed3bb60ec58df251b6b46b38c5f9d0501e11b51a1cfea25032c5ac05a31f5e25';

const MODULE_CHARS = 4470;
const MODULE_UTF8 = 4518;
const MODULE_LF = 61;
const MODULE_SHA256 = '690e47ce4d9ad8b656d5d95f0297a0e473847250a1186674d91caa1cd5297cd9';

const SEPARATOR = '\n';
const SEPARATOR_AT = 1879378;

// ── The shipped document ─────────────────────────────────────────────────────
const INDEX_CHARS = 1880019;
const INDEX_UTF8 = 1914141;
const INDEX_LF = 33036;
const INDEX_SHA256 = '4d514626ec99e6306400f3ce8eb383629cb3ec9fd75798043cd8dc14a376ebe1';
const LOCAL_SCRIPT_COUNT = 55;

const MODULE_TAG = '<script src="' + MODULE_SRC + '"></script>';
const ANCHOR_TAG = '<script src="./js/ui/mcx-charts.js"></script>';
const INLINE_OPEN = '<script>';

// ── The retained reconnect UI, now contiguous ────────────────────────────────
const RETAINED_AT = 1872835;
const RETAINED_CHARS = 4753;
const RETAINED_UTF8 = 4793;
const RETAINED_LF = 86;
const RETAINED_SHA256 = '53fba09f64e9663d3bcdbecd94fcbd75ef5bb389a6cbe6a69af56cd88b71093e';
const RETAINED_PANEL_RANGE = [1872835, 1874908];
const RETAINED_ACTION_RANGE = [1879379, 1882059];
const RETAINED_OWNERS = ['showReconnectPanel', 'doReconnectTT'];

// ── The one owner ────────────────────────────────────────────────────────────
const OWNER = '_apexPostAuthInit';
const OWNER_FORM = 'function';
const OWNER_IS_ASYNC = false;
const OWNER_DECL_CHARS = 3804;

const DEPENDENCIES = [
  'S', 'String', '_activeView', '_ensureVixFamily', '_renderDxlinkDiag',
  '_resetBackendApiAuthState', '_swingHydrateFromBackend', 'bssStartPolling', 'console',
  'dsbEnrichVisibleRowsLive', 'dsbStartAutoRefresh', 'jMigrateApexTradesToBackend',
  'postCandleContext', 'refreshSharedMarketRegime', 'startDxlinkConnectOnce',
  'startDxlinkStatusPolling',
];
const DEPENDENCY_COUNT = 16;

const S_WRITES = ['dxlinkConnectStarted'];
const S_REFS = ['dxlinkConnectStarted', 'dxlinkStatus', 'swing', 'ttConnected', 'ttSessionId'];

// The owner's OWN effect surface. Empty — and §7 proves that is not the same
// thing as saying running it has no effects.
const OWN_DIRECT_EFFECTS = { fetch: 0, setInterval: 0, setTimeout: 0, document: 0, localStorage: 0 };
// The own surfaces of the twelve entry points it calls. NOT a claim about the
// complete transitive call graph — only about those twelve bodies.
const ORCHESTRATED_DIRECT_EFFECTS = { fetch: 1, setInterval: 3, setTimeout: 2, document: 1, localStorage: 0 };

const LIFECYCLE_CALLS = [
  '_resetBackendApiAuthState', 'startDxlinkConnectOnce', 'startDxlinkStatusPolling',
  '_renderDxlinkDiag', 'refreshSharedMarketRegime', '_ensureVixFamily', 'postCandleContext',
  'bssStartPolling', 'dsbStartAutoRefresh', 'dsbEnrichVisibleRowsLive',
  'jMigrateApexTradesToBackend', '_swingHydrateFromBackend',
];
// The audit's source-backed classification, carried forward. Tier 2 is derived
// below by the same bounded call walk, not taken on trust.
const DXLINK_DIRECT_CALLS = ['startDxlinkConnectOnce', 'startDxlinkStatusPolling', '_renderDxlinkDiag'];
const TT_DXLINK_COUPLED_CALLS = [
  '_ensureVixFamily', 'dsbEnrichVisibleRowsLive', 'dsbStartAutoRefresh',
  'jMigrateApexTradesToBackend', 'refreshSharedMarketRegime', '_swingHydrateFromBackend',
];
const GENERIC_LIFECYCLE_CALLS = ['_resetBackendApiAuthState', 'bssStartPolling', 'postCandleContext'];
const COUPLING_MAX_DEPTH = 4;
const COUPLING_PROOFS = [
  { owner: '_ensureVixFamily', callee: '_fetchVixFamilyBackendFirst',
    calleeMustContain: ['fetchVixFamily(', 'S.ttConnected'] },
  { owner: 'refreshSharedMarketRegime', callee: '_ensureVixFamily',
    ownerMustContain: ['S.ttConnected'], calleeMustContain: ['_fetchVixFamilyBackendFirst'] },
  { owner: 'dsbEnrichVisibleRowsLive', callee: 'dsbLiveEnrichReadiness',
    ownerMustContain: ['subscribeDxlinkQuotes'],
    calleeMustContain: ['_backendCandleGateOpen', 'S.dxlinkConnectStarted', 'S.dxlinkStatus'] },
  { owner: 'dsbStartAutoRefresh', callee: 'dsbEnrichVisibleRowsLive',
    calleeMustContain: ['subscribeDxlinkQuotes'] },
  { owner: 'jMigrateApexTradesToBackend', callee: 'ttCall', calleeMustContain: ['S.ttSessionId'] },
  { owner: '_swingHydrateFromBackend', callee: '_backendCandleGateReason',
    calleeMustContain: ['S.ttConnected', 'S.ttSessionId'] },
];

// ── The two external consumers, both still inline ────────────────────────────
const LOGIN_CALL = "_apexPostAuthInit('login');";
const RECONNECT_CALL = "_apexPostAuthInit('reconnect');";
const APP_WIDE_CODE_OCCURRENCES = 3;   // one declaration + two calls

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
    vm.runInContext(src, sandbox, { filename: 'apex-post-auth-init.js' });
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
const EFFECT_PROBES = {
  fetch: /\bfetch\s*\(/g, setInterval: /\bsetInterval\s*\(/g, setTimeout: /\bsetTimeout\s*\(/g,
  document: /\bdocument\s*\./g, localStorage: /\blocalStorage\s*\./g,
};
function effectSurface(src) {
  const m = maskLiterals(src);
  const out = {};
  Object.keys(EFFECT_PROBES).forEach((k) => {
    out[k] = (m.match(new RegExp(EFFECT_PROBES[k].source, 'g')) || []).length;
  });
  return out;
}
function sumEffects(sources) {
  const out = {};
  Object.keys(EFFECT_PROBES).forEach((k) => { out[k] = 0; });
  sources.forEach((src) => {
    const e = effectSurface(src);
    Object.keys(e).forEach((k) => { out[k] += e[k]; });
  });
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

console.log('APEX SHARED POST-AUTH LIFECYCLE — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited Candidate C (#409) · base=' + BASE_SHA);

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// THE DOCUMENT THIS CONTRACT PINS is index.html as THIS extraction left it. The
// later TT reconnect UI owner sits on top of it, so peel that layer first,
// newest-first, and every assertion below keeps meaning exactly what it meant
// before the TT reconnect extraction existed. The helper re-verifies its output
// by length and SHA-256, so the hop is proved rather than assumed.
const TRADE_FORMS_U = require('./lib/journal-trade-forms-undo.js');
const CLOSE_LEGS_U = require('./lib/journal-close-legs-undo.js');
const TT_RECONNECT_U = require('./lib/tt-reconnect-undo.js');
const TRADE_FORMS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-forms.js'), 'utf8');
const CLOSE_LEGS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-close-legs.js'), 'utf8');
const TT_RECONNECT_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/tt-reconnect.js'), 'utf8');
// The Journal Close Legs owner is the newest layer of all and sits on top of
// the TT reconnect owner: peel it FIRST so the TT reconnect undo below still
// sees the exact document it was cut against.
// The Journal trade-forms owner is the newest layer of all: peel it FIRST so
// every undo below still sees the exact document it was cut against.
const PRE_TRADE_FORMS = TRADE_FORMS_U.isApplied(LIVE_INDEX)
  ? TRADE_FORMS_U.undoJournalTradeForms(LIVE_INDEX, TRADE_FORMS_MODULE)
  : LIVE_INDEX;
const PRE_CLOSE_LEGS = CLOSE_LEGS_U.isApplied(PRE_TRADE_FORMS)
  ? CLOSE_LEGS_U.undoJournalCloseLegs(PRE_TRADE_FORMS, CLOSE_LEGS_MODULE)
  : PRE_TRADE_FORMS;
const INDEX = TT_RECONNECT_U.isApplied(PRE_CLOSE_LEGS)
  ? TT_RECONNECT_U.undoTtReconnect(PRE_CLOSE_LEGS, TT_RECONNECT_MODULE)
  : PRE_CLOSE_LEGS;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const BASE = git(['show', BASE_SHA + ':index.html']);
const APP_SRC = APP_LOADER.loadAppJavaScriptSource();
const APP_PARTS = APP_LOADER.loadOrderedScriptSources().filter((p) => p.isAppJs && p.code != null);

// Reconstructed top-level bodies, for the §8 call walk.
const APP_BODIES = (function () {
  const out = {};
  scanTopLevelDeclarations(APP_SRC).forEach((d) => {
    if (!(d.name in out)) out[d.name] = APP_SRC.slice(d.start, d.end + 1);
  });
  return out;
})();
function appBody(n) { return APP_BODIES[n] || ''; }
// Comments blanked, STRING LITERALS KEPT: '/dxlink/connect' and 'dxlinkDiag'
// are real evidence, while a prose mention of DXLink in a comment is not.
function codeOnly(src) { return stripComments(src); }
function calleesOf(name) {
  const body = codeOnly(appBody(name));
  const out = new Set();
  let m;
  const re = /(?:^|[^A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  while ((m = re.exec(body))) {
    if (m[1] !== name && Object.prototype.hasOwnProperty.call(APP_BODIES, m[1])) out.add(m[1]);
  }
  return Array.from(out).sort();
}
function couplingOf(name, maxDepth) {
  let frontier = [name];
  const seen = new Set([name]);
  for (let depth = 0; depth <= maxDepth && frontier.length; depth++) {
    const next = [];
    for (const n of frontier) {
      const body = codeOnly(appBody(n));
      if (!body) continue;
      const ev = [];
      if (/dxlink/i.test(body)) ev.push('dxlink-token');
      if (/\bS\.tt(?:Connected|SessionId)\b/.test(body)) ev.push('tt-session-gate');
      if (ev.length) return { depth: depth, via: n, evidence: ev };
      for (const c of calleesOf(n)) if (!seen.has(c)) { seen.add(c); next.push(c); }
    }
    frontier = next;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. Pinned base and the shipped document');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'base commit resolves exactly');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'base tree resolves exactly');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'base subject is the pinned one');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'base index.html blob is the pinned one');
eq(BASE.length, BASE_CHARS, 'base index UTF-16 length is pinned');
eq(Buffer.byteLength(BASE, 'utf8'), BASE_UTF8, 'base index UTF-8 byte length is pinned');
eq(countLiteral(BASE, '\n'), BASE_LF, 'base index LF count is pinned');
eq(sha256(BASE), BASE_INDEX_SHA256, 'base index SHA-256 is pinned');
eq(localScripts(BASE).length, BASE_LOCAL_SCRIPTS, 'the base carried exactly 54 local application scripts');

eq(INDEX.length, INDEX_CHARS, 'shipped index UTF-16 length is the audited prediction');
eq(Buffer.byteLength(INDEX, 'utf8'), INDEX_UTF8, 'shipped index UTF-8 byte length is the audited prediction');
eq(countLiteral(INDEX, '\n'), INDEX_LF, 'shipped index LF count is the audited prediction');
eq(sha256(INDEX), INDEX_SHA256, 'shipped index SHA-256 is the audited prediction');
eq(localScripts(INDEX).length, LOCAL_SCRIPT_COUNT, 'the shipped index carries exactly 55 local application scripts');
// The LIVE document is one layer newer. Both states are pinned, and the TT
// reconnect undo is proved to return the document to this contract's EXACT #410
// state — the guarantee this file has always owned, now reached through a peel.
eq(TT_RECONNECT_U.isApplied(LIVE_INDEX), true, 'the shipped index carries the later TT reconnect layer');
eq(LIVE_INDEX.length, TRADE_FORMS_U.EXTRACTED_CHARS, 'the live shipped index UTF-16 length is the post-TT-reconnect value');
eq(sha256(LIVE_INDEX), TRADE_FORMS_U.EXTRACTED_SHA256, 'the live shipped index SHA-256 is the post-TT-reconnect value');
eq(localScripts(LIVE_INDEX).length, 58, 'the live shipped index carries 58 local application scripts');
eq(INDEX.length, TT_RECONNECT_U.BASE_CHARS, 'peeling TT reconnect returns the exact #410 index length');
eq(sha256(INDEX), TT_RECONNECT_U.BASE_SHA256, 'peeling TT reconnect returns the exact #410 index hash');
eq(localScripts(INDEX).length, TT_RECONNECT_U.BASE_LOCAL_SCRIPTS, '…with exactly 55 local application scripts');
eq(sha256(INDEX), INDEX_SHA256, '…which is byte-identical to this contract\'s own pinned #410 document');
// THE ARITHMETIC. The whole delta is the complete raw fragment out, one tag
// line in. A separator left behind inline fails HERE, before any hash.
eq(INDEX.length, BASE.length - RAW_CHARS + (MODULE_TAG + '\n').length,
  'the whole index delta is exactly the removed RAW fragment plus the one added tag line');
eq(BASE.length - INDEX.length, RAW_CHARS - (MODULE_TAG + '\n').length,
  '…and nothing else moved');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The raw fragment, the module body and the structural separator');
// ─────────────────────────────────────────────────────────────────────────────
const RAW = BASE.slice(RAW_AT, RAW_END);
eq(RAW.length, RAW_CHARS, 'raw fragment UTF-16 length');
eq(Buffer.byteLength(RAW, 'utf8'), RAW_UTF8, 'raw fragment UTF-8 byte length');
eq(countLiteral(RAW, '\n'), RAW_LF, 'raw fragment LF count');
eq(sha256(RAW), RAW_SHA256, 'raw fragment SHA-256');
eq(lineAt(BASE, RAW_AT), RAW_START_LINE, 'the raw fragment starts on line 32,930 of the base');
ok(RAW.startsWith('// ── Shared post-authentication initialization'),
  'the raw fragment opens on the shared post-authentication marker');
eq(countLiteral(BASE, '// ── Shared post-authentication initialization'), 1,
  'that marker is unique in the base');

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
eq(BODY + SEP, RAW, 'body + separator reproduces the raw fragment exactly');
eq(BODY.length + SEP.length, RAW_CHARS, '…and accounts for every unit of it');
// The undo helper deliberately does NOT re-check this at runtime — once its
// module hash gate passes, body + separator is fully determined, so such a
// guard could never fire. The fact still matters, so it is proved HERE against
// the base blob, and the helper's exported pins are checked against it.
eq(sha256(BODY + SEP), RAW_SHA256, 'the shipped module plus one LF hashes to the pinned raw fragment');
eq(U.RAW_CHARS, RAW_CHARS, 'the undo helper pins the raw fragment length this contract measured');
eq(U.RAW_SHA256, RAW_SHA256, 'the undo helper pins the raw fragment hash this contract measured');
eq(U.RAW_AT, RAW_AT, 'the undo helper pins the raw fragment start offset');
eq(U.RAW_END, RAW_END, 'the undo helper pins the raw fragment end offset');
eq(U.SEPARATOR_AT, SEPARATOR_AT, 'the undo helper pins the structural separator offset');

// The shipped module IS the body, and it ends on a real line of code.
eq(MODULE, BODY, 'the shipped module is byte-identical to the base module body');
eq(MODULE.length, MODULE_CHARS, 'shipped module UTF-16 length');
eq(Buffer.byteLength(MODULE, 'utf8'), MODULE_UTF8, 'shipped module UTF-8 byte length');
eq(countLiteral(MODULE, '\n'), MODULE_LF, 'shipped module LF count');
eq(sha256(MODULE), MODULE_SHA256, 'shipped module SHA-256');
ok(MODULE.endsWith('}\n'), 'the module ends `}\\n` — a real line of code');
ok(!MODULE.endsWith('\n\n'), 'the module does NOT end on a blank line: git diff --check is clean');
eq(MODULE.slice(-1), '\n', 'the module is newline-terminated');
// The separator is gone from the document, not merely moved.
eq(countLiteral(INDEX, RAW), 0, 'the raw fragment no longer appears in the shipped index');
eq(countLiteral(INDEX, MODULE), 0, 'the module body no longer appears in the shipped index');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The forward transform, derived rather than assumed');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(BASE, ANCHOR_TAG + '\n'), 1, 'the mcx-charts tag is the unique anchor in the base');
const FORWARD = (BASE.slice(0, RAW_AT) + BASE.slice(RAW_END))
  .replace(ANCHOR_TAG + '\n', ANCHOR_TAG + '\n' + MODULE_TAG + '\n');
eq(FORWARD, INDEX, 'the extraction algorithm reproduces the shipped index byte-for-byte');
eq(sha256(FORWARD), INDEX_SHA256, '…hashing to the pinned shipped SHA-256');
eq(localScripts(FORWARD).length, LOCAL_SCRIPT_COUNT, '…with 55 local application scripts');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The script tag: unique, classic, src-only, correctly placed');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(INDEX, MODULE_TAG), 1, 'exactly one Apex post-auth script tag');
eq(countLiteral(INDEX, ANCHOR_TAG + '\n' + MODULE_TAG + '\n' + INLINE_OPEN), 1,
  'the tag sits immediately after mcx-charts.js and immediately before the inline monolith');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const ownTagIdx = TAGS.findIndex((t) => t.src === MODULE_SRC);
ok(ownTagIdx >= 0, 'the tag is parsed as a real script tag');
const ownTag = TAGS[ownTagIdx];
eq(ownTag.type, null, 'the tag carries no type attribute — it is a classic script');
['defer', 'async', 'nomodule', 'crossorigin', 'integrity'].forEach((attr) => {
  eq(ownTag.attrs.indexOf(attr), -1, 'tag carries no ' + attr + ' attribute');
});
eq(String(ownTag.inline).trim(), '', 'the tag has no inline body — it is src-only');
eq(TAGS[ownTagIdx - 1].src, './js/ui/mcx-charts.js', 'the preceding tag is mcx-charts.js');
eq(TAGS[ownTagIdx + 1].src, null, 'the following tag is the inline monolith');
eq(localScripts(INDEX).map((t) => t.src).slice(-1), [MODULE_SRC],
  'the Apex post-auth owner is the LAST local application script before the monolith');
// In the LIVE tree the TT reconnect owner now loads after this one, so the
// module is second-to-last rather than last. The invariant this line protects —
// the module evaluates before the inline monolith that calls it — is unchanged
// and asserted in its stronger, current form.
eq(APP_PARTS.map((p) => p.src || '(inline)').slice(-5),
  [MODULE_SRC, './js/ui/tt-reconnect.js', './js/ui/journal-close-legs.js', './js/ui/journal-trade-forms.js', '(inline)'],
  'in execution order the module runs immediately before the TT reconnect owner, which precedes the Journal Close Legs owner and then the inline monolith');
eq(APP_PARTS.filter((p) => p.kind === 'inline').length, 1,
  'the relocation added no second inline script block');

// ─────────────────────────────────────────────────────────────────────────────
section('5. One owner, declarations-only, empty-VM safe');
// ─────────────────────────────────────────────────────────────────────────────
const SHAPE = shape(MODULE);
eq(SHAPE.length, 1, 'the module declares exactly one top-level thing');
eq(SHAPE[0].name, OWNER, '…and it is ' + OWNER);
eq(SHAPE[0].form, OWNER_FORM, '…declared as a function');
eq(SHAPE[0].isAsync, OWNER_IS_ASYNC, '…and it is NOT async');
eq(SHAPE[0].chars, OWNER_DECL_CHARS, '…with the pinned declaration span of 3,804 units');
eq(SHAPE.filter((e) => e.form !== 'function').length, 0, 'no top-level variable declaration exists');
eq(residue(MODULE), '', 'zero executable top-level residue: the module is declarations-only');
const load = loadInEmptyVm(MODULE);
ok(load.ok, 'the module evaluates in a completely empty VM: ' + load.error);
eq(load.globals, [OWNER], 'evaluation defines exactly ' + OWNER + ' and nothing else');
ok((() => { try { new vm.Script(MODULE, { filename: MODULE_REL }); return true; } catch (e) { return false; } })(),
  'the module parses standalone as a classic script');
// Classic-script semantics: nothing was wrapped, exposed or rewritten.
eq(countLiteral(MODULE, 'use strict'), 0, 'no "use strict" was added');
eq(countLiteral(MODULE, 'window.'), 0, 'no manual window.* exposure was added');
eq(countLiteral(MODULE, 'export '), 0, 'no export was added');
eq(countLiteral(MODULE, 'import '), 0, 'no import was added');
eq(countLiteral(MODULE, 'module.exports'), 0, 'no CommonJS export was added');
ok(!/^\s*\(function|^\s*\(\s*\(\)\s*=>/.test(MODULE), 'the module is not wrapped in an IIFE');
ok(MODULE.trimStart().startsWith('// ── Shared post-authentication initialization'),
  'the module opens on the original comment banner, unreformatted');

// Load-time inertness, itemised. Every such site lies strictly inside the one
// declaration body, AND an empty VM would have thrown on any of them.
const SPANS = scanTopLevelDeclarations(MODULE).map((e) => ({ start: e.start, end: e.end }));
const insideDecl = (i) => SPANS.some((s) => i >= s.start && i <= s.end);
function outsideDeclSites(re) {
  const m = maskLiterals(MODULE);
  const out = [];
  let x;
  const r = new RegExp(re.source, 'g');
  while ((x = r.exec(m))) if (!insideDecl(x.index)) out.push(x.index);
  return out;
}
[['DOM', /\bdocument\s*\./], ['DOM lookup', /\bgetElementById\s*\(/], ['storage', /\blocalStorage\s*\./],
 ['timer', /\bset(?:Timeout|Interval)\s*\(/], ['listener', /\baddEventListener\s*\(/],
 ['network', /\b(?:fetch|XMLHttpRequest)\s*\(/], ['authentication', /\b_ttAuthLogin\s*\(/],
 ['credential read', /\.value\b/], ['window', /\bwindow\s*\./]].forEach(([label, re]) => {
  eq(outsideDeclSites(re).length, 0, 'no ' + label + ' access at load time');
});
eq((maskLiterals(MODULE).match(/\baddEventListener\s*\(/g) || []).length, 0,
  'the module registers no listener at all');

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependency and state contract');
// ─────────────────────────────────────────────────────────────────────────────
const DEPS = freeIdentifiers(MODULE);
eq(DEPS, DEPENDENCIES, 'the free-dependency inventory is exactly the audited 16 names');
eq(DEPS.length, DEPENDENCY_COUNT, 'the module needs exactly 16 call-time globals');
DEPS.forEach((n) => {
  eq(countLiteral(MODULE, 'var ' + n + ' ='), 0, n + ' is not redeclared inside the module');
});
// Every dependency is late-bound: none of them is defined by the module, and
// the module evaluates with none of them present (proved in §5).
eq(DEPS.filter((n) => SHAPE.some((e) => e.name === n)), [], 'no dependency is self-satisfied');
eq(sProps(MODULE, true), S_WRITES, 'exactly one direct S.* write: S.dxlinkConnectStarted');
eq(sProps(MODULE, false), S_REFS, 'the exact S.* properties referenced');
eq((maskLiterals(MODULE).match(/S\.dxlinkConnectStarted\s*=/g) || []).length, 1,
  'the single guard reset is written exactly once');
// No foreign top-level binding is reassigned: every bare-identifier assignment
// target is a local, so the only foreign writes are properties on S.
const bareTargets = (function () {
  const m = maskLiterals(MODULE);
  const out = new Set();
  let x;
  const r = /(?:^|[^A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?![=>])/g;
  while ((x = r.exec(m))) out.add(x[1]);
  return Array.from(out).sort();
})();
eq(bareTargets.filter((n) => DEPS.indexOf(n) >= 0), [],
  'zero foreign top-level binding reassignments');

// ─────────────────────────────────────────────────────────────────────────────
section('7. Direct effects versus orchestrated effects');
// ─────────────────────────────────────────────────────────────────────────────
eq(effectSurface(MODULE), OWN_DIRECT_EFFECTS, 'the module\'s own direct effect surface is empty');
const orchestrated = sumEffects(LIFECYCLE_CALLS.map((n) => appBody(n)));
eq(orchestrated, ORCHESTRATED_DIRECT_EFFECTS,
  'the twelve entry points it calls carry, in their OWN bodies, the audited effect totals');
ok(orchestrated.fetch > 0 && orchestrated.setInterval > 0 && orchestrated.document > 0,
  'so running the owner DOES cause network, timers and DOM writes — transitively');
ok(effectSurface(MODULE).fetch === 0 && orchestrated.fetch > 0,
  'direct and transitive effects genuinely differ and are never conflated');
eq(LIFECYCLE_CALLS.length, 12, 'the owner orchestrates exactly twelve lifecycle entry points');
LIFECYCLE_CALLS.forEach((n) => {
  ok(DEPS.indexOf(n) >= 0, n + ' is one of the module\'s free dependencies');
});

// ─────────────────────────────────────────────────────────────────────────────
section('8. TT / DXLink coupling — the audited 3/6/3, rederived');
// ─────────────────────────────────────────────────────────────────────────────
const coupling = {};
LIFECYCLE_CALLS.forEach((n) => { coupling[n] = couplingOf(n, COUPLING_MAX_DEPTH); });
const tier1 = LIFECYCLE_CALLS.filter((n) => /dxlink/i.test(n));
const tier2 = LIFECYCLE_CALLS.filter((n) => !/dxlink/i.test(n) && coupling[n] !== null);
const tier3 = LIFECYCLE_CALLS.filter((n) => !/dxlink/i.test(n) && coupling[n] === null);
eq(tier1.slice().sort(), DXLINK_DIRECT_CALLS.slice().sort(), 'TIER 1 — three directly DXLink-specific owners');
eq(tier2.slice().sort(), TT_DXLINK_COUPLED_CALLS.slice().sort(), 'TIER 2 — six TT/DXLink-readiness coupled');
eq(tier3.slice().sort(), GENERIC_LIFECYCLE_CALLS.slice().sort(), 'TIER 3 — three generic backend/UI');
eq(tier1.length + tier2.length + tier3.length, 12, 'the tiers partition all twelve');
eq(tier1.length, 3, 'the defensible DIRECT claim is 3 of 12');
eq(tier1.length + tier2.length, 9, '…and 9 of 12 are direct-or-coupled');
tier1.forEach((n) => {
  ok(/dxlink/i.test(codeOnly(appBody(n))), 'TIER 1 is not name-only: ' + n + ' operates DXLink in its own body');
  eq(coupling[n].depth, 0, '…at call depth 0');
});
COUPLING_PROOFS.forEach((pr) => {
  ok(calleesOf(pr.owner).indexOf(pr.callee) >= 0, pr.owner + ' really calls ' + pr.callee);
  (pr.ownerMustContain || []).forEach((t) => {
    ok(codeOnly(appBody(pr.owner)).indexOf(t) >= 0, pr.owner + ' body carries ' + JSON.stringify(t));
  });
  (pr.calleeMustContain || []).forEach((t) => {
    ok(codeOnly(appBody(pr.callee)).indexOf(t) >= 0, pr.callee + ' body carries ' + JSON.stringify(t));
  });
});
ok(/DXLink/.test(appBody('_ensureVixFamily')) && !/dxlink/i.test(codeOnly(appBody('_ensureVixFamily'))),
  'the walk is comment-proof: _ensureVixFamily mentions DXLink in prose but not in code');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The two external consumers, and classic-global resolution');
// ─────────────────────────────────────────────────────────────────────────────
const INLINE_CODE = maskLiterals(APP_PARTS[APP_PARTS.length - 1].code);
const MODULE_CODE = maskLiterals(MODULE);
function refsIn(masked) { let c = 0, i = 0; while ((i = masked.indexOf(OWNER, i)) >= 0) { c++; i += 1; } return c; }
eq(refsIn(MODULE_CODE), 1, 'the module carries exactly one code reference: its own declaration');
// CONSUMER LOCATION ADVANCED. Both consumers still exist and both still resolve
// the classic global; the reconnect one simply travelled with doReconnectTT
// into js/ui/tt-reconnect.js. The count that matters — one declaration plus
// exactly two calls, app-wide — is unchanged and asserted below.
eq(refsIn(INLINE_CODE), 1, 'the inline monolith carries exactly one: the normal-login call');
eq(refsIn(maskLiterals(TT_RECONNECT_MODULE)), 1,
  'the TT reconnect module carries exactly one: the reconnect call inside doReconnectTT');
eq(APP_PARTS.reduce((a, p) => a + refsIn(maskLiterals(p.code)), 0), APP_WIDE_CODE_OCCURRENCES,
  'exactly three code occurrences app-wide — one declaration plus two calls');
eq(countLiteral(INDEX, LOGIN_CALL), 1, "the normal-login consumer _apexPostAuthInit('login'); is unchanged and inline");
eq(countLiteral(INDEX, RECONNECT_CALL), 1, "in this contract's #410 document the reconnect consumer is still inline");
eq(countLiteral(BASE, LOGIN_CALL), 1, '…and the login call site is byte-identical to the base');
eq(countLiteral(BASE, RECONNECT_CALL), 1, '…as is the reconnect call site');
ok(INDEX.indexOf(RECONNECT_CALL) > INDEX.indexOf('async function doReconnectTT(){'),
  'the reconnect consumer really sits inside doReconnectTT');
// In the LIVE tree that same call site travelled, byte-for-byte, into the TT
// reconnect module — still inside doReconnectTT, still a classic-global call.
eq(countLiteral(LIVE_INDEX, LOGIN_CALL), 1, 'the live index still carries the normal-login call');
eq(countLiteral(LIVE_INDEX, RECONNECT_CALL), 0, '…and no longer carries the reconnect call');
eq(countLiteral(TT_RECONNECT_MODULE, RECONNECT_CALL), 1, 'the TT reconnect module carries it instead');
ok(TT_RECONNECT_MODULE.indexOf(RECONNECT_CALL) > TT_RECONNECT_MODULE.indexOf('async function doReconnectTT(){'),
  '…still inside doReconnectTT');
eq(countLiteral(APP_SRC, RECONNECT_CALL), 1, 'and app-wide the reconnect call site still appears exactly once');
// Both consumers resolve through the ordinary classic-global binding.
eq(countLiteral(INDEX, 'window.' + OWNER), 0, 'no window.* exposure glue was added');
eq(countLiteral(APP_SRC, 'export ' + OWNER), 0, OWNER + ' is never exported');
eq(countLiteral(APP_SRC, "require('" + OWNER), 0, OWNER + ' is never required');
eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => t.type === 'module').length, 0,
  'the application carries no type="module" script');
eq(scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === OWNER).length, 1,
  OWNER + ' has exactly one declaration app-wide');
// Load order: the module evaluates before the inline monolith that calls it.
const ownerPartIdx = APP_PARTS.findIndex((p) => p.src === MODULE_SRC);
ok(ownerPartIdx >= 0 && ownerPartIdx < APP_PARTS.length - 1,
  'the module evaluates before the inline monolith, so both call-time lookups resolve');
ok(ownerPartIdx > APP_PARTS.findIndex((p) => p.src === './js/ui/mcx-charts.js'),
  '…and after mcx-charts.js');
// The documentation-only mention is still a comment, not a consumer.
const MIGRATION_SRC = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
eq(countLiteral(MIGRATION_SRC, 'doReconnectTT'), 1, 'journal-migration.js mentions doReconnectTT once');
eq(countLiteral(maskLiterals(MIGRATION_SRC), 'doReconnectTT'), 0, '…and it is a comment, not a consumer');

// ─────────────────────────────────────────────────────────────────────────────
section('10. The retained reconnect UI is contiguous and byte-identical');
// ─────────────────────────────────────────────────────────────────────────────
const untaggedIndex = INDEX.replace(MODULE_TAG + '\n', '');
const RETAINED = untaggedIndex.slice(RETAINED_AT, RETAINED_AT + RETAINED_CHARS);
eq(RETAINED.length, RETAINED_CHARS, 'retained reconnect pair UTF-16 length');
eq(Buffer.byteLength(RETAINED, 'utf8'), RETAINED_UTF8, 'retained reconnect pair UTF-8 byte length');
eq(countLiteral(RETAINED, '\n'), RETAINED_LF, 'retained reconnect pair LF count');
eq(sha256(RETAINED), RETAINED_SHA256, 'retained reconnect pair SHA-256 — the audit\'s Candidate D fragment');
eq(RETAINED, BASE.slice(RETAINED_PANEL_RANGE[0], RETAINED_PANEL_RANGE[1])
  + BASE.slice(RETAINED_ACTION_RANGE[0], RETAINED_ACTION_RANGE[1]),
  'it is exactly reconnectPanel + reconnectAction from the base, in source order');
eq(shape(RETAINED).map((e) => e.name), RETAINED_OWNERS, 'it owns exactly showReconnectPanel and doReconnectTT');
eq(shape(RETAINED).map((e) => e.isAsync), [false, true], 'doReconnectTT is still async, showReconnectPanel is not');
RETAINED_OWNERS.forEach((n) => {
  eq(scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === n).length, 1,
    n + ' still has exactly one declaration app-wide');
  eq(countLiteral(MODULE, 'function ' + n), 0, n + ' was not dragged into the Apex module');
});
// OWNERSHIP ADVANCED. What this extraction left behind was contiguous, and the
// follow-up TT reconnect extraction moved that exact block into its own module.
// The guarantee is unchanged and stated in its stronger, current form: the pair
// is byte-identical to what this contract measured, it is owned by exactly one
// named module, and that module still loads AFTER this one — so doReconnectTT's
// call to _apexPostAuthInit still resolves through the preceding module.
const TT_RECONNECT_SRC = './js/ui/tt-reconnect.js';
// The TT reconnect extraction applies the same separator model this contract
// uses: the module file is the retained RAW pair minus its final LF, which is
// the structural separator its undo re-inserts. So the module is 4,752 units
// and module + separator is the 4,753-unit fragment measured here.
eq(TT_RECONNECT_MODULE + '\n', RETAINED,
  'the retained pair is now owned, byte-for-byte, by js/ui/tt-reconnect.js plus its structural separator');
eq(sha256(TT_RECONNECT_MODULE + '\n'), RETAINED_SHA256, '…hashing to the same Candidate D fragment measured here');
eq(TT_RECONNECT_MODULE.length, RETAINED_CHARS - 1, '…the module itself being one LF shorter');
ok(TT_RECONNECT_MODULE.endsWith('}\n') && !TT_RECONNECT_MODULE.endsWith('\n\n'),
  '…and ending on a real line of code, like every module this series ships');
RETAINED_OWNERS.forEach((n) => {
  eq(countLiteral(TT_RECONNECT_MODULE, 'function ' + n), 1, n + ' is declared exactly once in the TT reconnect module');
});
const LIVE_PARTS = APP_LOADER.loadOrderedScriptSources().filter((p) => p.isAppJs && p.code != null);
const apexIdx = LIVE_PARTS.findIndex((p) => p.src === MODULE_SRC);
const ttIdx = LIVE_PARTS.findIndex((p) => p.src === TT_RECONNECT_SRC);
ok(apexIdx >= 0 && ttIdx === apexIdx + 1,
  'the TT reconnect module loads immediately AFTER this one, so its call to _apexPostAuthInit still resolves');
ok(ttIdx === LIVE_PARTS.length - 4, '…and immediately before the Journal Close Legs owner, then trade forms');
ok(RETAINED.indexOf('onclick="doReconnectTT()"') > 0,
  'the generated reconnect handler is untouched inside showReconnectPanel');
// Contiguity is the whole point: nothing sits between the two halves any more.
eq(untaggedIndex.indexOf('async function doReconnectTT(){'),
  RETAINED_AT + (RETAINED_PANEL_RANGE[1] - RETAINED_PANEL_RANGE[0]),
  'reconnectAction begins exactly where reconnectPanel ends — no gap');

// ─────────────────────────────────────────────────────────────────────────────
section('11. What did NOT move');
// ─────────────────────────────────────────────────────────────────────────────
const MCX_GLUE = "var _mcxResizeTimer      = null;\nwindow.addEventListener('resize', function(){\n";
ok(INDEX.indexOf(MCX_GLUE) > 0, 'the #408 MCX resize glue is still inline, byte-for-byte');
eq(countLiteral(INDEX, 'var _mcxResizeTimer'), 1, '_mcxResizeTimer is still declared exactly once, inline');
eq(countLiteral(MODULE, '_mcxResizeTimer'), 0, 'the module carries no _mcxResizeTimer, not even in a comment');
eq(countLiteral(INDEX, 'function escHtml('), 1, 'escHtml is still declared exactly once, inline');
eq(countLiteral(MODULE, 'escHtml'), 0, 'the module carries no escHtml');
eq(countLiteral(INDEX, ANCHOR_TAG), 1, 'the mcx-charts tag is untouched');
eq(countLiteral(INDEX, '<script src="./js/ui/mcx-macro-check.js"></script>'), 1,
  'the #406 macro-check owner is untouched');

// ─────────────────────────────────────────────────────────────────────────────
section('12. Byte-exact reverse reconstruction through the undo helper');
// ─────────────────────────────────────────────────────────────────────────────
eq(U.MODULE_CHARS, MODULE_CHARS, 'the undo helper pins the module length this contract measured');
eq(U.MODULE_SHA256, MODULE_SHA256, 'the undo helper pins the module hash this contract measured');
eq(U.EXTRACTED_CHARS, INDEX_CHARS, 'the undo helper pins the extracted index length');
eq(U.EXTRACTED_SHA256, INDEX_SHA256, 'the undo helper pins the extracted index hash');
eq(U.BASE_CHARS, BASE_CHARS, 'the undo helper pins the base length');
eq(U.BASE_SHA256, BASE_INDEX_SHA256, 'the undo helper pins the base hash');
eq(U.RETAINED_SHA256, RETAINED_SHA256, 'the undo helper pins the retained reconnect remainder');
eq(U.SEPARATOR, SEPARATOR, 'the undo helper re-inserts exactly one LF');
ok(U.isApplied(INDEX), 'the shipped index is recognised as carrying this layer');
const rebuilt = U.undoApexPostAuthInit(INDEX, MODULE);
eq(rebuilt.length, BASE_CHARS, 'reconstruction UTF-16 length is the pinned base');
eq(Buffer.byteLength(rebuilt, 'utf8'), BASE_UTF8, 'reconstruction UTF-8 byte length is the pinned base');
eq(countLiteral(rebuilt, '\n'), BASE_LF, 'reconstruction LF count is the pinned base');
eq(sha256(rebuilt), BASE_INDEX_SHA256, 'reconstruction hashes to the pinned base');
eq(rebuilt, BASE, 'reconstruction is byte-identical to 852797ed:index.html');
ok(!U.isApplied(rebuilt), 'the reconstruction no longer carries the tag');
eq(localScripts(rebuilt).length, BASE_LOCAL_SCRIPTS, 'the reconstruction is back to 54 local scripts');

// ─────────────────────────────────────────────────────────────────────────────
section('13. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
// Ordered so each guard is INDEPENDENTLY reachable: module-shaped mutants are
// rejected before the document is looked at, and document-shaped mutants before
// the whole-document hash. A single leading identity check would have made most
// of these unreachable.
//
// Every runtime error the helper can raise is exercised below by a mutant that
// really reaches it — BAD_INPUT, MODULE_IDENTITY (size and hash),
// MODULE_SEPARATOR, TAG_IDENTITY, TAG_ADJACENCY, RETAINED_OFFSET,
// RETAINED_IDENTITY and EXTRACTED_IDENTITY — with one stated exception: the
// helper's closing BASE_IDENTITY is a deliberate redundant final gate, not an
// independently reachable guard, because after the module hash and the
// whole-document hash both pass the reconstruction is a pure function of two
// fixed byte strings. Each mutant below asserts the EXACT error it should
// produce, so none can pass by tripping an earlier, coarser check.
throws(() => U.undoApexPostAuthInit(INDEX, MODULE + SEPARATOR), /MODULE_IDENTITY/,
  'a module that ABSORBED the structural separator is rejected');
// A module ending on a blank line, built to be INDISTINGUISHABLE from the real
// one by size: same UTF-16 length, same UTF-8 byte length and same LF count.
// One earlier LF becomes a space (LF −1) and the closing `}\n` becomes `\n\n`
// (LF +1), so the size gate above cannot catch it and the separator gate is the
// one that must. Asserting /MODULE_SEPARATOR/ exactly means this can never pass
// by falling through to MODULE_IDENTITY.
const blankLineEofMutant = (function () {
  const firstLf = MODULE.indexOf('\n');
  const spaced = MODULE.slice(0, firstLf) + ' ' + MODULE.slice(firstLf + 1);
  return spaced.slice(0, -2) + '\n\n';
})();
eq(blankLineEofMutant.length, MODULE_CHARS, 'the blank-line-EOF mutant has the SAME UTF-16 length as the module');
eq(Buffer.byteLength(blankLineEofMutant, 'utf8'), MODULE_UTF8, '…the same UTF-8 byte length');
eq(countLiteral(blankLineEofMutant, '\n'), MODULE_LF, '…and the same LF count');
ok(blankLineEofMutant.endsWith('\n\n') && !blankLineEofMutant.endsWith('}\n'),
  '…but it ends on a blank line rather than a real line of code');
ok(blankLineEofMutant !== MODULE, '…and it is genuinely a different byte sequence');
throws(() => U.undoApexPostAuthInit(INDEX, blankLineEofMutant), /MODULE_SEPARATOR/,
  'a same-size module ending on a blank line is rejected BY THE SEPARATOR GUARD');
// The cheaper blank-line mutant is still rejected, one gate earlier, by size.
throws(() => U.undoApexPostAuthInit(INDEX, MODULE.slice(0, -1) + '\n\n'), /MODULE_IDENTITY/,
  'a longer module ending on a blank line is rejected by the size gate');
throws(() => U.undoApexPostAuthInit(INDEX, MODULE.slice(0, -1)), /MODULE_IDENTITY/,
  'a truncated module is rejected');
throws(() => U.undoApexPostAuthInit(INDEX, MODULE.slice(0, 1000)), /MODULE_IDENTITY/,
  'a heavily truncated module is rejected');
throws(() => U.undoApexPostAuthInit(INDEX, MODULE + ' '), /MODULE_IDENTITY/,
  'an appended-byte module is rejected');
throws(() => U.undoApexPostAuthInit(INDEX, MODULE.replace("reason || 'login'", "reason || 'Login'")),
  /MODULE_IDENTITY/, 'a mutated module is rejected');
throws(() => U.undoApexPostAuthInit(INDEX, MODULE.replace('function _apexPostAuthInit', 'function _apexPostAuthInitV2')),
  /MODULE_IDENTITY/, 'a renamed owner is rejected');
throws(() => U.undoApexPostAuthInit(INDEX, null), /BAD_INPUT/, 'a null module is rejected');
throws(() => U.undoApexPostAuthInit(INDEX, undefined), /BAD_INPUT/, 'an undefined module is rejected');
// Document-shaped mutants.
throws(() => U.undoApexPostAuthInit(INDEX.replace(MODULE_TAG + '\n', ''), MODULE), /TAG_IDENTITY/,
  'a missing script tag is rejected');
throws(() => U.undoApexPostAuthInit(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /TAG_IDENTITY/, 'a duplicated script tag is rejected');
throws(() => U.undoApexPostAuthInit(
  INDEX.replace(ANCHOR_TAG + '\n' + MODULE_TAG + '\n', MODULE_TAG + '\n' + ANCHOR_TAG + '\n'), MODULE),
  /TAG_ADJACENCY/, 'a reordered script tag — before mcx-charts.js — is rejected');
throws(() => U.undoApexPostAuthInit(
  INDEX.replace(MODULE_TAG + '\n' + INLINE_OPEN, INLINE_OPEN), MODULE),
  /TAG_IDENTITY/, 'a tag moved out from before the inline monolith is rejected');
// A separator left stranded inline: the document is one byte too long.
throws(() => U.undoApexPostAuthInit(
  INDEX.slice(0, RETAINED_AT + (MODULE_TAG + '\n').length) + SEPARATOR
  + INDEX.slice(RETAINED_AT + (MODULE_TAG + '\n').length), MODULE),
  /RETAINED_IDENTITY/, 'a structural separator left inline is rejected by the retained guard');
// A mutated or reordered retained reconnect pair.
throws(() => U.undoApexPostAuthInit(INDEX.replace('CONNETTI ORA', 'CONNETTI  ORA'), MODULE),
  /RETAINED_IDENTITY/, 'a mutated retained reconnect UI is rejected by the retained-identity guard');
// Reordered retained pair, WITH the tag intact so the mutant actually reaches
// the retained-identity guard rather than stopping at the tag guard.
const reorderedRetained = (untaggedIndex.slice(0, RETAINED_AT)
  + BASE.slice(RETAINED_ACTION_RANGE[0], RETAINED_ACTION_RANGE[1])
  + BASE.slice(RETAINED_PANEL_RANGE[0], RETAINED_PANEL_RANGE[1])
  + untaggedIndex.slice(RETAINED_AT + RETAINED_CHARS))
  .replace(ANCHOR_TAG + '\n', ANCHOR_TAG + '\n' + MODULE_TAG + '\n');
throws(() => U.undoApexPostAuthInit(reorderedRetained, MODULE),
  /RETAINED_IDENTITY/, 'a reordered retained reconnect pair is rejected by the retained guard');
throws(() => U.undoApexPostAuthInit(
  INDEX.slice(0, RETAINED_AT + (MODULE_TAG + '\n').length + 40) + 'X'
  + INDEX.slice(RETAINED_AT + (MODULE_TAG + '\n').length + 41), MODULE),
  /RETAINED_IDENTITY/, 'a single foreign byte inside the retained pair is rejected');
throws(() => U.undoApexPostAuthInit(INDEX.replace('mcxResults', 'mcxResultZ'), MODULE),
  /EXTRACTED_IDENTITY/, 'foreign content elsewhere in the document is rejected');
throws(() => U.undoApexPostAuthInit(ANCHOR_TAG + '\n' + MODULE_TAG + '\n', MODULE), /RETAINED_OFFSET/,
  'a document too short to hold the retained reconnect pair is rejected before any slice is trusted');
throws(() => U.undoApexPostAuthInit(BASE, MODULE), /TAG_IDENTITY/,
  'the un-extracted base is rejected — a partially applied state never reconstructs');

// Guards that do NOT run through the undo helper: they measure the shipped tree.
function tagMutantViolations(html) {
  const out = [];
  const tags = APP_LOADER.parseScriptTags(html);
  const at = tags.findIndex((t) => t.src === MODULE_SRC);
  if (at < 0) { out.push('missing'); return out; }
  if (tags.filter((t) => t.src === MODULE_SRC).length !== 1) out.push('duplicate');
  if (tags[at - 1] == null || tags[at - 1].src !== './js/ui/mcx-charts.js') out.push('not-after-anchor');
  if (tags[at + 1] == null || tags[at + 1].src !== null) out.push('not-before-inline');
  if (tags[at].type != null && String(tags[at].type).trim() !== '') out.push('type');
  if (/(?:^|\s)(?:async|defer)(?=[\s=>]|$)/i.test(tags[at].attrs)) out.push('async-or-defer');
  return out;
}
eq(tagMutantViolations(INDEX), [], 'the shipped tag passes every tag guard');
ok(tagMutantViolations(INDEX.replace(MODULE_TAG, '<script type="module" src="' + MODULE_SRC + '"></script>')).indexOf('type') >= 0,
  'a type="module" tag mutant is rejected');
ok(tagMutantViolations(INDEX.replace(MODULE_TAG, '<script src="' + MODULE_SRC + '" async></script>')).indexOf('async-or-defer') >= 0,
  'an async tag mutant is rejected');
ok(tagMutantViolations(INDEX.replace(MODULE_TAG, '<script src="' + MODULE_SRC + '" defer></script>')).indexOf('async-or-defer') >= 0,
  'a defer tag mutant is rejected');
ok(tagMutantViolations(INDEX.replace(MODULE_TAG + '\n', '')).indexOf('missing') >= 0,
  'a missing tag is rejected by the tag guard too');
ok(tagMutantViolations(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)).indexOf('duplicate') >= 0,
  'a duplicate tag is rejected by the tag guard too');
ok(tagMutantViolations(
  INDEX.replace(ANCHOR_TAG + '\n' + MODULE_TAG + '\n', MODULE_TAG + '\n' + ANCHOR_TAG + '\n')
).indexOf('not-after-anchor') >= 0, 'a tag placed before mcx-charts.js is rejected');
ok(tagMutantViolations(
  INDEX.replace(MODULE_TAG + '\n', '').replace('<script src="./js/utils/indicators.js"></script>\n',
    '<script src="./js/utils/indicators.js"></script>\n' + MODULE_TAG + '\n')
).indexOf('not-after-anchor') >= 0, 'a tag placed at the head of the load order is rejected');
// Ownership mutants, measured against the manifest rather than a hash.
ok(shape(MODULE.replace('function _apexPostAuthInit', 'function _apexPostAuthInitV2'))
  .every((e) => e.name !== OWNER), 'a renamed owner is caught by the manifest');
ok(residue(MODULE + '\n_apexPostAuthInit("login");\n') !== '', 'an added top-level call is caught');
ok(residue(MODULE + "\nwindow.addEventListener('load', function(){});\n") !== '',
  'an added top-level listener is caught');
ok(residue(MODULE + '\nsetTimeout(_apexPostAuthInit, 0);\n') !== '', 'an added top-level timer is caught');
ok(!loadInEmptyVm(MODULE + "\ndocument.getElementById('x');\n").ok,
  'an added top-level DOM access stops the module evaluating in an empty VM');
ok(freeIdentifiers(MODULE.replace(/bssStartPolling/g, 'bssStartPollingV2')).indexOf('bssStartPolling') < 0,
  'a changed free dependency is caught by the inventory');
ok(sProps(MODULE.replace(/S\.dxlinkConnectStarted(\s*=\s*false)/g, 'S.dxlinkConnectStartedV2$1'), true)
  .indexOf('dxlinkConnectStarted') < 0, 'a changed S.dxlinkConnectStarted write is caught');
// A duplicate owner left inline would break the one-declaration invariant.
ok(scanTopLevelDeclarations(APP_SRC + '\nfunction _apexPostAuthInit(){}\n')
  .filter((d) => d.name === OWNER).length === 2,
  'a duplicate owner left inline is caught by the app-wide declaration count');
// Consumer mutants.
eq(countLiteral(INDEX.replace(LOGIN_CALL, ''), LOGIN_CALL), 0, 'a removed login consumer is detectable');
eq(countLiteral(INDEX.replace(RECONNECT_CALL, ''), RECONNECT_CALL), 0, 'a removed reconnect consumer is detectable');

// ─────────────────────────────────────────────────────────────────────────────
section('14. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
eq(changedProduction, ['index.html', MODULE_REL, 'js/ui/journal-close-legs.js', 'js/ui/journal-trade-forms.js', 'js/ui/tt-reconnect.js'],
  'production footprint is exactly index.html plus the Apex shared post-auth owner and the later TT reconnect and Journal Close Legs owners');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
  'no temporary TT auth lifecycle audit is shipped: this contract replaces it');
ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
ok(!changed.some((rel) => rel.endsWith('.md')), 'no documentation changed');
ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
  'no backend/model configuration changed');
ok(!changed.some((rel) => rel === '.gitattributes'), '.gitattributes is untouched');
ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
  rel === 'js/ui/tt-reconnect.js' || rel === 'js/ui/journal-close-legs.js' || rel === 'js/ui/journal-trade-forms.js' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  'the suite is exactly 140 test files: the shipped contracts plus the Manual Entry + Adjustment audit');
// The follow-up reconnect-UI extraction HAS now shipped, as exactly one module
// with its own permanent contract and undo helper. The audit's other rejected
// candidates were never built, and are still asserted absent.
ok(fs.existsSync(path.join(ROOT, 'js/ui/tt-reconnect.js')), 'the reconnect UI module exists');
ok(fs.existsSync(path.join(ROOT, 'tests/tt-reconnect-boundary-contract.test.js')),
  '…with its own permanent boundary contract');
ok(fs.existsSync(path.join(ROOT, 'tests/lib/tt-reconnect-undo.js')), '…and its own byte-exact undo helper');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/tt-auth-lifecycle.js')), 'no combined TT auth lifecycle module exists (rejected candidate A/B)');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/tt-reconnect-panel.js')), 'no reconnect panel module exists (rejected candidate B)');

console.log('\n' + pass + ' assertions passed');
console.log('APEX_POST_AUTH_INIT_BOUNDARY_OK');
