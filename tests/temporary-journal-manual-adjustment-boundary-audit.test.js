'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL MANUAL ENTRY + ADJUSTMENT — TEMPORARY EXTRACTION AUDIT.
//
// PHASE 1 ONLY. This file measures. It does not extract anything, and the
// production tree it audits is byte-identical to its pinned base. §12 proves
// that: the entire committed footprint is four TEST files — this audit, plus
// the one suite-count constant in each of the three contracts that pin it.
//
// WHY THIS AUDIT EXISTS. Audit #412 measured the Journal forms window, chose
// Close Legs as the first extraction, and #413 shipped it. That left Manual
// Entry and Adjustment physically contiguous — a plain cut, as predicted. The
// obvious next step is to extract that pair. It is NOT obviously safe, and this
// audit is what establishes the boundary before any code moves.
//
// THE PROBLEM WITH THE OBVIOUS CUT. Manual Entry declares the `_jtForm*` state.
// Two handlers that live ELSEWHERE in the monolith — `_onJtLegExpChange` and
// `_onJtLegStrikeChange` — write into that state twelve times. Extracting the
// contiguous pair alone would leave a module whose mutable state is written
// from outside it. So this audit measures two candidates:
//
//     E   Manual Entry + Adjustment, the contiguous pair          41 owners
//     F   E plus the two chain-aware JT leg handlers              43 owners
//
// The handlers are themselves a self-contained banner-delimited block, and §5
// proves they are consumed ONLY by markup that Manual Entry generates. So F is
// two clean contiguous fragments, not a weave through foreign code.
//
// WHAT THE MEASUREMENTS SAY
//
//                                    E            F
//     external code sites            38           16
//     cross-boundary state sites     29           10
//       …of which WRITES             12            0
//     free dependencies              30           30
//     evaluation-time reads           0            0
//
// F costs 1,500 extra units and two extra owners, and buys back 22 code edges
// and every external write. Its dependency surface is IDENTICAL to E's, because
// the three names the handlers need are all owned by Manual Entry. §9 derives
// the recommendation from those numbers rather than asserting it.
//
// THE SEPARATOR MODEL, unchanged from the layers below it: each raw block is
// body + one structural LF, ends `}\n\n`, and sits behind a `}\n\n` seam. Both
// parts leave index.html; only the bodies are written to the module.
//
// PHASE 2 IS NOT IN THIS PR. §10 models both extractions and proves their
// forward and reverse transforms byte-exact, but nothing is written: no module,
// no permanent contract, no undo helper. §11 asserts they are all absent.
//
// Run: node tests/temporary-journal-manual-adjustment-boundary-audit.test.js
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
const AUDIT_REL = 'tests/temporary-journal-manual-adjustment-boundary-audit.test.js';
// The suite-count ratchets this audit advances, 139 → 140. §12 re-derives that
// these are the ONLY live suite-count pins rather than trusting the list, and
// proves the single constant is the entire change made to each.
const RATCHET_RELS = [
  'tests/apex-post-auth-init-boundary-contract.test.js',
  'tests/journal-close-legs-boundary-contract.test.js',
  'tests/tt-reconnect-boundary-contract.test.js',
];
const AUDIT_SCOPE = RATCHET_RELS.concat([AUDIT_REL]).sort();

// ── Pinned base: the merged #413 extraction ──────────────────────────────────
const BASE_SHA = '45cf2846a6f3aafe9bd6c4948d5bd84787e901c6';
const BASE_TREE = 'bfb9473138673ba262c06d2c87a2e85ef6bb8fcc';
const BASE_SUBJECT = 'refactor(journal): extract Close Legs form UI (#413)';
const BASE_PARENT = '754e3dd04f011ca94694c350cbc3d0ae1c92a26b';
const BASE_INDEX_BLOB = '2a1900d06e664c812f5eddb0bedfe99a4d297aad';
const BASE_CHARS = 1863130;
const BASE_UTF8 = 1897113;
const BASE_LF = 32721;
const BASE_INDEX_SHA256 = '8e52b9a882b29c3097c4bc6031c90349be4fffba481710a909b6f6f8695b4721';
const BASE_LOCAL_SCRIPTS = 57;
const BASE_TEST_FILES = 139;
// This audit adds the 140th file. Phase 2 replaces it one-for-one with the
// permanent contract, so 140 becomes the new resting count.
const AUDIT_TEST_FILES = 140;

// ── The single inline application script ─────────────────────────────────────
const CODE_AT = 113213;
const CODE_END = 1863104;

// ── The two blocks ───────────────────────────────────────────────────────────
const H = {
  label: 'chain-aware JT leg handlers',
  at: 1351203, end: 1352703, startLine: 23058,
  raw: { chars: 1500, utf8: 1512, lf: 36, sha: 'cbd7463dafc92da0a460a96b2a51228ab668b0d11855f8b3f8a428da5e520c85' },
  body: { chars: 1499, utf8: 1511, lf: 35, sha: 'bc568b87ca4b3ea6f05896ebf904dfd0dffc240025ba44dd1a398dd3b3c94993' },
  owners: ['_onJtLegExpChange', '_onJtLegStrikeChange'],
  banner: '// ── Journal form: chain-aware expiry / strike change handlers ────',
};
const AC = {
  label: 'Manual Entry + Adjustment',
  at: 1718831, end: 1765492, startLine: 30009,
  raw: { chars: 46661, utf8: 46829, lf: 949, sha: 'ec16ed3caf80d7da50e6a239eb8dce48ddf9a447be8353b46e05af46cd8ac914' },
  body: { chars: 46660, utf8: 46828, lf: 948, sha: '4ace9380e0cd021836dfc4fc68b0eb4c3dbb8c7b97f98a657fd44ec94b434f7d' },
  banner: '// ── JOURNAL MANUAL ENTRY FORM (multi-leg) ────────────────────────',
};

const AC_OWNERS = [
  '_jtFormLegs', '_jtFormStrategy', '_jtFormStatus', '_jtEditId', '_jtPreselectPfId',
  '_adjFormTradeId', '_adjFormNewLegs', '_adjFormNewStrategy', '_adjFormLegsToRoll',
  '_adjFormRollClosePrices', 'showAddTradeForm', 'showEditTradeForm', '_renderJtForm',
  'onJtStrategyChange', 'onJtStatusChange', '_renderJtLegsTable', 'updateJtLegField',
  '_syncJtFormLegsFromDom', 'addJtCustomLeg', 'removeJtLeg', '_deriveJtLegStreamer',
  'updateJtLegStreamer', '_validateJtSymbol', 'refreshAllJtLegStreamers', 'cancelJtForm',
  'showAddAdjustmentForm', 'closeAdjustmentModal', '_adjTypeNeedsLegs', '_renderAdjustmentForm',
  '_onAdjTypeChange', '_onAdjStrategyChange', '_renderAdjNewLegsTable', '_adjUpdateLegField',
  '_adjAddLeg', '_adjRemoveLeg', '_adjUpdateRollClosePrice', '_rollLegPnlPreview',
  '_onAdjRollLegToggle', '_autoPopulateRollLegs', '_validateRollTypeMatch', 'submitAdjustment',
];
const F_OWNERS = H.owners.concat(AC_OWNERS);
// The ten mutable owners, all declared by Manual Entry.
const STATE = AC_OWNERS.slice(0, 10);

// ── Free dependencies ────────────────────────────────────────────────────────
const DEPS_H = ['JSON', '_deriveJtLegStreamer', '_jtFormLegs', '_renderJtLegsTable',
  '_setLegStreamerFromChain', 'console', 'document', 'isNaN', 'normalizeOptionLegSymbolAliases',
  'parseFloat'];
const DEPS_AC = ['Boolean', 'Date', 'JSON', 'Math', 'Object', 'S', 'STRATEGY_TEMPLATES', 'String',
  '_buildRichSnapshot', '_chainError', '_fetchAndRenderChain', '_greeksMergeFromCache',
  '_journalSnapshotPrefetch', '_optChainCache', '_optionChainErrorText', '_setLegStreamerFromChain',
  'buildCompactOptionDxlinkSymbol', 'console', 'document', 'escHtml', 'isNaN', 'journalManager',
  'normalizeOptionLegSymbolAliases', 'parseFloat', 'portfolioManager', 'setTimeout',
  'showNewPortfolioForm', 'showToast', 'showTradeDetails', 'showView'];
// Identical to AC's: the three names H needs are all owned by AC.
const DEPS_F = DEPS_AC;
const CALLTIME_H = 31;
const CALLTIME_AC = 144;
const CALLTIME_F = 153;

// ── The measured coupling of each candidate ──────────────────────────────────
const COUPLING = {
  E: { owners: 41, codeSites: 38, generated: 4, markup: 3, stateSites: 29, stateReads: 17, stateWrites: 12 },
  F: { owners: 43, codeSites: 16, generated: 4, markup: 3, stateSites: 10, stateReads: 10, stateWrites: 0 },
};
// The hosts that still reach into Candidate F, and what they touch.
const F_EXTERNAL_HOSTS = {
  submitTrade: { _jtFormLegs: 6, _jtEditId: 3, _jtPreselectPfId: 1, _syncJtFormLegsFromDom: 1, _deriveJtLegStreamer: 1, cancelJtForm: 2 },
  showAddPositionForm: { showAddTradeForm: 1 },
  _fetchAndRenderChain: { _renderJtLegsTable: 1 },
};
// The hosts that write into Manual Entry's state today, and would stop doing so
// across a module boundary only if Candidate F is chosen.
const E_WRITING_HOSTS = { _onJtLegExpChange: 9, _onJtLegStrikeChange: 3 };

// ── The hypothetical Phase 2 extraction (modelled, never written) ────────────
const HYP_MODULE_REL = 'js/ui/journal-trade-forms.js';
const HYP_TAG = '<script src="./js/ui/journal-trade-forms.js"></script>';
const ANCHOR_TAG = '<script src="./js/ui/journal-close-legs.js"></script>';
const INLINE_OPEN = '<script>';
const HYP_INSERTION_CHARS = 55;

const HYP_E = { chars: 1816524, utf8: 1850339, lf: 31773, sha: 'a48f08175ffa2229a36105d320c2f5e681cd8008d300fda68932474e7af50f08', scripts: 58 };
const HYP_F = { chars: 1815024, utf8: 1848827, lf: 31737, sha: '7e0851ae220daa6454cf2f3f093821b29c8aff8ba137cb0bbef24283bb976156', scripts: 58 };
const MODULE_E = { chars: 46660, utf8: 46828, lf: 948, sha: '4ace9380e0cd021836dfc4fc68b0eb4c3dbb8c7b97f98a657fd44ec94b434f7d' };
const MODULE_F = { chars: 48160, utf8: 48340, lf: 984, sha: 'e10f84094a435d07ff49461c2ace24c89aadb25193afa8c5cb33dece16d64a54' };

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
function metrics(s) { return { chars: s.length, utf8: utf8(s), lf: countLf(s), sha: sha256(s) }; }
function lineAt(s, o) { return s.slice(0, o).split('\n').length; }
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function localScripts(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src));
}
function shape(src) {
  return scanTopLevelDeclarations(src).map((e) => ({ name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
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

// A reference is a WRITE when the name is followed by any chain of property or
// index accesses terminated by an assignment. The plain form `x[i] = v` is NOT
// enough: this codebase writes `_jtFormLegs[idx].expiry = v`, a deep write that
// a shallower rule silently reads as a read — the exact mistake that would make
// Candidate E look safer than it is.
const ACCESS_CHAIN = '(?:\\s*\\.\\s*[A-Za-z_$][A-Za-z0-9_$]*|\\s*\\[[^\\]]*\\])*';
const ASSIGN_OP = '\\s*(?:=(?!=)|\\+=|-=|\\*=|/=|%=|\\|\\|=|&&=|\\?\\?=|\\+\\+|--)';
const WRITE_RE = new RegExp('^' + ACCESS_CHAIN + ASSIGN_OP);
const MUTATOR_RE = /^(?:\s*\[[^\]]*\])*\s*\.\s*(?:push|pop|shift|unshift|splice|sort|reverse|fill)\s*\(/;

// ─────────────────────────────────────────────────────────────────────────────

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const INDEX = APP_LOADER.loadIndexHtml();

console.log('JOURNAL MANUAL ENTRY + ADJUSTMENT — TEMPORARY EXTRACTION AUDIT (Phase 1)');
console.log('measurement only · production untouched · base=' + BASE_SHA);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base, rederived from git and from the blob');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git, not guessed');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #413 extraction');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'the base parent is the merged #412 audit');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the working index.html is byte-identical to the pinned base');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'exactly 57 local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only, so UTF-16 offsets are stable');
eq(INDEX.indexOf(HYP_TAG), -1, 'no journal-trade-forms tag exists yet');
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no journal-trade-forms module exists yet');

const baseTestFiles = git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
  .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f));
eq(baseTestFiles.length, BASE_TEST_FILES, 'the base suite is exactly 139 test files');
const nowTestFiles = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f));
eq(nowTestFiles.length, AUDIT_TEST_FILES, 'with this temporary audit the suite is 140 test files');

const reg = codeRegion(INDEX);
eq([reg.at, reg.end], [CODE_AT, CODE_END], 'the single inline application script sits at the pinned range');
ok(H.at > CODE_AT && AC.end < CODE_END, 'both audited blocks are inside that inline script');
ok(H.end < AC.at, 'the handler block sits EARLIER in the document than the forms block');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The two blocks, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
for (const B of [H, AC]) {
  const raw = INDEX.slice(B.at, B.end);
  const body = INDEX.slice(B.at, B.end - 1);
  eq(metrics(raw), { chars: B.raw.chars, utf8: B.raw.utf8, lf: B.raw.lf, sha: B.raw.sha },
    B.label + ': raw identity');
  eq(metrics(body), { chars: B.body.chars, utf8: B.body.utf8, lf: B.body.lf, sha: B.body.sha },
    B.label + ': body identity');
  eq(body + '\n', raw, B.label + ': raw === body + exactly one LF');
  eq(raw.slice(-3), '}\n\n', B.label + ': raw ends `}\\n\\n`');
  eq(body.slice(-2), '}\n', B.label + ': body ends `}\\n`');
  eq(INDEX.slice(B.at - 3, B.at), '}\n\n', B.label + ': it opens right after a complete `}\\n\\n` seam');
  eq(lineAt(INDEX, B.at), B.startLine, B.label + ': it opens on its pinned line');
  ok(INDEX.slice(B.at, B.at + B.banner.length) === B.banner, B.label + ': it opens on its own banner comment');
  eq(B.raw.chars - B.body.chars, 1, B.label + ': the separator is exactly one unit');
  eq(B.raw.lf - B.body.lf, 1, B.label + ': the separator is exactly one LF');
}
// The two blocks do not touch, and nothing of one leaks into the other.
ok(H.end < AC.at, 'the blocks are disjoint');
eq(INDEX.slice(H.at, H.end).indexOf('JOURNAL MANUAL ENTRY'), -1, 'no forms banner inside the handler block');
eq(INDEX.slice(AC.at, AC.end).indexOf('chain-aware expiry'), -1, 'no handler banner inside the forms block');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Declaration manifests');
// ─────────────────────────────────────────────────────────────────────────────
const BODY_H = INDEX.slice(H.at, H.end - 1);
const BODY_AC = INDEX.slice(AC.at, AC.end - 1);
eq(shape(BODY_H).map((d) => d.name), H.owners, 'the handler block declares exactly its two owners, in order');
eq(shape(BODY_AC).map((d) => d.name), AC_OWNERS, 'the forms block declares exactly its 41 owners, in order');
eq(shape(BODY_H).length, 2, 'handler block: 2 declarations');
eq(shape(BODY_AC).length, 41, 'forms block: 41 declarations');
eq(shape(BODY_H).filter((d) => d.form === 'var').length, 0, 'the handler block declares NO state of its own');
eq(shape(BODY_AC).filter((d) => d.form === 'var').map((d) => d.name), STATE,
  'all ten mutable owners are declared by the forms block');
eq(shape(BODY_AC).filter((d) => d.isAsync).map((d) => d.name), ['submitAdjustment'],
  'submitAdjustment is the only async owner');
eq(shape(BODY_H).filter((d) => d.isAsync).length, 0, 'neither handler is async');
eq(shape(BODY_H).length + shape(BODY_AC).length, 43, 'Candidate F would own 43 declarations');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Load-time purity and empty-VM evaluation');
// ─────────────────────────────────────────────────────────────────────────────
for (const [label, body, names] of [['handler block', BODY_H, H.owners], ['forms block', BODY_AC, AC_OWNERS]]) {
  const decls = scanTopLevelDeclarations(body);
  const ch = Array.from(body);
  decls.forEach((d) => { for (let i = d.start; i <= d.end; i++) ch[i] = ' '; });
  eq(maskLiterals(ch.join('')).replace(/\s+/g, ''), '', label + ': declarations, comments and whitespace only at top level');
  const loaded = loadInEmptyVm(body, label);
  ok(loaded.ok, label + ': evaluates in an empty VM with no error');
  eq(loaded.globals, names.slice().sort(), label + ': defines exactly its own owners, and nothing else');
  eq(topLevelCallSites(body).length, 0, label + ': zero top-level calls');
  eq(topLevelHits(body, /\b(?:document|window)\s*\./).length, 0, label + ': zero top-level DOM access');
  eq(topLevelHits(body, /\baddEventListener\b/).length, 0, label + ': zero top-level listeners');
  eq(topLevelHits(body, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length, 0, label + ': zero top-level timers');
  eq(topLevelHits(body, /\b(?:localStorage|sessionStorage|indexedDB)\b/).length, 0, label + ': zero top-level storage access');
  eq(topLevelHits(body, /\b(?:fetch|XMLHttpRequest|WebSocket|navigator)\b/).length, 0, label + ': zero top-level network work');
  eq(topLevelHits(body, /\b(?:journalManager|positionManager|portfolioManager)\b/).length, 0, label + ': zero top-level journal work');
}
// The ten state owners are all initialised with inert literals.
const stateDecls = scanTopLevelDeclarations(BODY_AC).filter((d) => d.form === 'var');
for (const d of stateDecls) {
  const text = BODY_AC.slice(d.start, d.end + 1);
  // Inert means: a literal that cannot reach the DOM, the network or the app.
  ok(/=\s*(?:null|undefined|\[\]|\{\}|-?\d+(?:\.\d+)?|true|false|'[^'\\]*'|"[^"\\]*")\s*;?$/.test(text),
    d.name + ' is initialised with an inert literal');
}
// Combined, the two bodies still evaluate cleanly and define 43 globals.
const BODY_F = BODY_H + '\n' + BODY_AC;
const loadedF = loadInEmptyVm(BODY_F, 'F');
ok(loadedF.ok, 'Candidate F evaluates in an empty VM with no error');
eq(loadedF.globals, F_OWNERS.slice().sort(), 'Candidate F defines exactly its 43 owners');
eq(metrics(BODY_F), { chars: MODULE_F.chars, utf8: MODULE_F.utf8, lf: MODULE_F.lf, sha: MODULE_F.sha },
  'the Candidate F module body identity: 48,160 units / e10f8409…');

// ─────────────────────────────────────────────────────────────────────────────
section('5. The handlers belong to the form — proved, not assumed');
// ─────────────────────────────────────────────────────────────────────────────
const CODE = INDEX.slice(CODE_AT, CODE_END);
const VIEWS = lexicalViews(CODE);
const inH = (i) => { const a = i + CODE_AT; return a >= H.at && a < H.end; };
const inAC = (i) => { const a = i + CODE_AT; return a >= AC.at && a < AC.end; };
const inF = (i) => inH(i) || inAC(i);

for (const n of H.owners) {
  eq(refSites(VIEWS.code, n).filter((i) => !inF(i)).length, 0,
    n + ' has NO executable reference anywhere outside Candidate F');
  eq(refSites(VIEWS.code, n).length, 1, n + ' appears exactly once in executable code — its own declaration');
  const gen = refSites(VIEWS.strings, n);
  eq(gen.length, 1, n + ' is referenced from generated markup exactly once');
  ok(inAC(gen[0]), '…and that markup is generated INSIDE the forms block');
}
// Both handler call sites are onchange attributes emitted by the legs table.
eq(countLiteral(CODE, 'onchange="_onJtLegExpChange('), 1, 'one generated onchange for the expiry handler');
eq(countLiteral(CODE, 'onchange="_onJtLegStrikeChange('), 1, 'one generated onchange for the strike handler');
const legsTable = scanTopLevelDeclarations(CODE).find((d) => d.name === '_renderJtLegsTable');
for (const n of H.owners) {
  const at = refSites(VIEWS.strings, n)[0];
  ok(at >= legsTable.start && at <= legsTable.end, n + ' is emitted by _renderJtLegsTable');
}
// And the handlers need three names the forms block owns.
eq(freeIdentifiers(BODY_H), DEPS_H, 'the handler block free-depends on exactly 10 names');
eq(DEPS_H.filter((n) => AC_OWNERS.indexOf(n) >= 0).sort(),
  ['_deriveJtLegStreamer', '_jtFormLegs', '_renderJtLegsTable'],
  '…three of which are owned by the forms block');

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependencies, and the load-order question');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(BODY_AC), DEPS_AC, 'the forms block free-depends on exactly 30 names');
eq(freeIdentifiers(BODY_F), DEPS_F, 'Candidate F free-depends on exactly the SAME 30 names as the forms block alone');
eq(DEPS_F.length, 30, 'thirty dependencies');
// This is the whole argument for taking the handlers along: they cost nothing.
eq(DEPS_F.filter((n) => DEPS_AC.indexOf(n) < 0), [], 'absorbing the handlers introduces NO new dependency');
eq(DEPS_AC.filter((n) => DEPS_F.indexOf(n) < 0), [], '…and removes none either');
for (const [label, body, expected, calls] of [
  ['handler block', BODY_H, DEPS_H, CALLTIME_H],
  ['forms block', BODY_AC, DEPS_AC, CALLTIME_AC],
  ['Candidate F', BODY_F, DEPS_F, CALLTIME_F],
]) {
  const cls = classifyReferences(body, expected);
  eq(cls.loadTime, [], label + ': reads NO dependency at evaluation time');
  eq(cls.callTime.length, calls, label + ': every dependency reference is call-time');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Mutable state: who writes it, and from where');
// ─────────────────────────────────────────────────────────────────────────────
const decls = scanTopLevelDeclarations(CODE);
function kindOf(name, at) {
  if (/\b(?:var|let|const)\s+$/.test(VIEWS.code.slice(Math.max(0, at - 40), at))) return 'decl';
  const after = VIEWS.code.slice(at + name.length, at + name.length + 120);
  if (MUTATOR_RE.test(after)) return 'mutate';
  if (WRITE_RE.test(after)) return 'write';
  return 'read';
}
function stateCrossing(inside) {
  let read = 0, write = 0, mutate = 0;
  const perName = {};
  for (const n of STATE) {
    for (const i of refSites(VIEWS.code, n)) {
      if (inside(i)) continue;
      const k = kindOf(n, i);
      if (k === 'read') read++; else if (k === 'write') write++; else if (k === 'mutate') mutate++;
      perName[n] = perName[n] || { read: 0, write: 0, mutate: 0 };
      perName[n][k]++;
    }
  }
  return { read, write, mutate, total: read + write + mutate, perName };
}
const crossE = stateCrossing(inAC);
const crossF = stateCrossing(inF);
eq({ total: crossE.total, read: crossE.read, write: crossE.write, mutate: crossE.mutate },
  { total: 29, read: 17, write: 12, mutate: 0 },
  'Candidate E would leave 29 state sites across the boundary — TWELVE of them writes');
eq({ total: crossF.total, read: crossF.read, write: crossF.write, mutate: crossF.mutate },
  { total: 10, read: 10, write: 0, mutate: 0 },
  'Candidate F would leave 10, and NOT ONE of them a write');
eq(crossE.write - crossF.write, 12, 'the twelve writes are exactly what absorbing the handlers removes');
// Name the writers, so the finding is checkable rather than a bare number.
const writers = {};
for (const n of STATE) {
  for (const i of refSites(VIEWS.code, n)) {
    if (inAC(i) || kindOf(n, i) !== 'write') continue;
    const h = (decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name;
    writers[h] = (writers[h] || 0) + 1;
  }
}
eq(writers, E_WRITING_HOSTS, 'the only external writers are the two chain-aware handlers');
eq(Object.keys(writers).sort(), H.owners.slice().sort(), '…which are exactly the block Candidate F absorbs');
// The deep-write form this codebase actually uses.
ok(countLiteral(CODE, '_jtFormLegs[idx].expiry = ') >= 1,
  'the writes are deep — `_jtFormLegs[idx].expiry = …` — not plain rebinding');
eq(refSites(VIEWS.code, '_adjFormTradeId').filter((i) => !inAC(i)).length, 0,
  'the five _adjForm* owners never leave the forms block (spot-checked on _adjFormTradeId)');

// ─────────────────────────────────────────────────────────────────────────────
section('8. External consumers of each candidate');
// ─────────────────────────────────────────────────────────────────────────────
function census(owners, inside) {
  const head = INDEX.slice(0, CODE_AT), tail = INDEX.slice(CODE_END);
  let code = 0, generated = 0, markup = 0;
  for (const n of owners) {
    code += refSites(VIEWS.code, n).filter((i) => !inside(i)).length;
    generated += refSites(VIEWS.strings, n).filter((i) => !inside(i)).length;
    markup += refSites(head, n).length + refSites(tail, n).length;
  }
  return { code, generated, markup };
}
const censusE = census(AC_OWNERS, inAC);
const censusF = census(F_OWNERS, inF);
eq(censusE, { code: COUPLING.E.codeSites, generated: COUPLING.E.generated, markup: COUPLING.E.markup },
  'Candidate E consumer census: 38 code sites');
eq(censusF, { code: COUPLING.F.codeSites, generated: COUPLING.F.generated, markup: COUPLING.F.markup },
  'Candidate F consumer census: 16 code sites — 22 fewer');
eq(censusE.code - censusF.code, 22, 'absorbing the handlers removes 22 executable edges');
eq(censusE.generated, censusF.generated, 'the generated-markup surface is identical either way');
eq(censusE.markup, censusF.markup, 'the static-markup surface is identical either way');
// Where Candidate F's remaining edges live.
const hostsF = {};
for (const n of F_OWNERS) {
  for (const i of refSites(VIEWS.code, n)) {
    if (inF(i)) continue;
    const h = (decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name;
    hostsF[h] = hostsF[h] || {};
    hostsF[h][n] = (hostsF[h][n] || 0) + 1;
  }
}
eq(hostsF, F_EXTERNAL_HOSTS, 'Candidate F is reached from exactly three functions');
eq(Object.keys(hostsF).length, 3, 'three host functions, not a diffuse spread');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The recommendation, derived from the measurements');
// ─────────────────────────────────────────────────────────────────────────────
// Every number below is recomputed above; none is assigned per candidate.
const SCORE = {
  E: {
    stateWrites: crossE.write, stateSites: crossE.total, codeEdges: censusE.code,
    deps: freeIdentifiers(BODY_AC).length, units: BODY_AC.length,
    loadOrder: classifyReferences(BODY_AC, DEPS_AC).loadTime.length,
  },
  F: {
    stateWrites: crossF.write, stateSites: crossF.total, codeEdges: censusF.code,
    deps: freeIdentifiers(BODY_F).length, units: BODY_F.length,
    loadOrder: classifyReferences(BODY_F, DEPS_F).loadTime.length,
  },
};
eq(SCORE.E.stateWrites, 12, 'E: twelve external writes into the module\'s own state');
eq(SCORE.F.stateWrites, 0, 'F: none');
eq(SCORE.E.deps, SCORE.F.deps, 'both candidates carry the same dependency surface');
eq([SCORE.E.loadOrder, SCORE.F.loadOrder], [0, 0], 'neither imposes a load-order constraint');
ok(SCORE.F.units > SCORE.E.units, 'F is the larger module…');
eq(SCORE.F.units - SCORE.E.units, 1500, '…by exactly the 1,500 units of the handler block');
ok(SCORE.F.codeEdges < SCORE.E.codeEdges, '…and the better-isolated one');

// The ranking: no external writes first, then fewer code edges, then smaller.
const ranked = ['E', 'F'].slice().sort((x, y) =>
  SCORE[x].stateWrites - SCORE[y].stateWrites ||
  SCORE[x].codeEdges - SCORE[y].codeEdges ||
  SCORE[x].units - SCORE[y].units);
eq(ranked, ['F', 'E'], 'the ranking puts Candidate F first');
const RECOMMENDATION = ranked[0];
eq(RECOMMENDATION, 'F', 'THE RECOMMENDATION: extract Manual Entry + Adjustment TOGETHER WITH the two chain-aware handlers');
// And it does not hinge on the write count alone.
const rankedByEdges = ['E', 'F'].slice().sort((x, y) => SCORE[x].codeEdges - SCORE[y].codeEdges);
eq(rankedByEdges[0], 'F', 'F still wins on executable edges alone, with the write criterion dropped');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Both hypothetical extractions, byte-exact in each direction');
// ─────────────────────────────────────────────────────────────────────────────
const anchorAt = INDEX.indexOf(ANCHOR_TAG);
ok(anchorAt > 0, 'the anchor tag exists');
eq(countLiteral(INDEX, ANCHOR_TAG), 1, '…exactly once');
const anchorLineEnd = INDEX.indexOf('\n', anchorAt);
eq(anchorLineEnd, anchorAt + ANCHOR_TAG.length, 'the anchor tag ends its own line');
eq(INDEX.slice(anchorLineEnd + 1, anchorLineEnd + 1 + INLINE_OPEN.length), INLINE_OPEN,
  'the inline monolith opens on the very next line');
eq(('\n' + HYP_TAG).length, HYP_INSERTION_CHARS, 'the inserted tag line is 55 UTF-16 units');

function model(ranges) {
  let out = INDEX;
  for (const r of ranges.slice().sort((a, b) => b.at - a.at)) out = out.slice(0, r.at) + out.slice(r.end);
  out = out.slice(0, anchorLineEnd) + '\n' + HYP_TAG + out.slice(anchorLineEnd);
  const body = ranges.map((r) => INDEX.slice(r.at, r.end - 1)).join('\n');
  const untag = out.slice(0, anchorLineEnd) + out.slice(anchorLineEnd + HYP_INSERTION_CHARS);
  let back = untag;
  for (const r of ranges.slice().sort((a, b) => a.at - b.at)) {
    back = back.slice(0, r.at) + INDEX.slice(r.at, r.end) + back.slice(r.at);
  }
  return { out, body, back };
}
const mE = model([AC]);
const mF = model([H, AC]);

eq(metrics(mE.body), { chars: MODULE_E.chars, utf8: MODULE_E.utf8, lf: MODULE_E.lf, sha: MODULE_E.sha },
  'hypothetical E module body: 46,660 units / 4ace9380…');
eq(metrics(mE.out), { chars: HYP_E.chars, utf8: HYP_E.utf8, lf: HYP_E.lf, sha: HYP_E.sha },
  'hypothetical E index: 1,816,524 units / a48f0817…');
eq(BASE_CHARS - AC.raw.chars + HYP_INSERTION_CHARS, HYP_E.chars,
  'E arithmetic: 1,863,130 − 46,661 + 55 = 1,816,524');
eq(localScripts(mE.out).length, HYP_E.scripts, 'hypothetical E loads 58 local scripts');
eq(mE.back, INDEX, 'the E reverse transform reconstructs the base byte for byte');

eq(metrics(mF.body), { chars: MODULE_F.chars, utf8: MODULE_F.utf8, lf: MODULE_F.lf, sha: MODULE_F.sha },
  'hypothetical F module body: 48,160 units / e10f8409…');
eq(metrics(mF.out), { chars: HYP_F.chars, utf8: HYP_F.utf8, lf: HYP_F.lf, sha: HYP_F.sha },
  'hypothetical F index: 1,815,024 units / 7e0851ae…');
eq(BASE_CHARS - H.raw.chars - AC.raw.chars + HYP_INSERTION_CHARS, HYP_F.chars,
  'F arithmetic: 1,863,130 − 1,500 − 46,661 + 55 = 1,815,024');
eq(BASE_LF - H.raw.lf - AC.raw.lf + 1, HYP_F.lf, 'F LF arithmetic: 32,721 − 36 − 949 + 1 = 31,737');
eq(localScripts(mF.out).length, HYP_F.scripts, 'hypothetical F loads 58 local scripts');
eq(mF.back, INDEX, 'the F reverse transform reconstructs the base byte for byte');
eq(sha256(mF.back), BASE_INDEX_SHA256, '…with the base SHA-256');

// The F module is the two bodies in DOCUMENT order, joined by one LF.
eq(mF.body, BODY_H + '\n' + BODY_AC, 'the F module is the handler body, one LF, then the forms body');
eq(mF.body.slice(0, BODY_H.length), BODY_H, '…handlers first, unchanged');
eq(mF.body.slice(BODY_H.length + 1), BODY_AC, '…then the forms block, unchanged');
eq(mF.out.indexOf(BODY_AC), -1, 'not one byte of the forms body remains in the F index');
eq(mF.out.indexOf(BODY_H), -1, 'not one byte of the handler body remains in the F index');
eq(mF.out.indexOf(H.banner), -1, 'the handler banner is gone from the F index');
eq(mF.out.indexOf(AC.banner), -1, 'the forms banner is gone from the F index');
// There is a SIBLING pair for the Portfolio form — `_onLegExpChange` and
// `_onLegStrikeChange`, operating on `_formLegs` — sitting immediately above the
// Journal pair behind a nearly identical banner. It is NOT part of any candidate
// and must survive both extractions untouched.
const SIBLING_BANNER = '// ── Portfolio form: chain-aware expiry / strike change handlers ──';
eq(countLiteral(INDEX, SIBLING_BANNER), 1, 'the Portfolio sibling banner exists in the base');
eq(countLiteral(mF.out, SIBLING_BANNER), 1, '…and survives the F extraction');
eq(countLiteral(mE.out, SIBLING_BANNER), 1, '…and the E extraction');
for (const n of ['_onLegExpChange', '_onLegStrikeChange', '_formLegs']) {
  ok(countLiteral(mF.out, n) > 0, 'the Portfolio sibling ' + n + ' stays inline');
  eq(F_OWNERS.indexOf(n), -1, '…and is not claimed by any candidate: ' + n);
}
ok(HYP_F.chars < HYP_E.chars, 'F removes more inline code than E');
eq(HYP_E.chars - HYP_F.chars, H.raw.chars, '…by exactly the handler block');

// ─────────────────────────────────────────────────────────────────────────────
section('11. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
// The write classifier must see DEEP writes. This is the control that would
// have caught the earlier mistaken reading of these sites as reads.
{
  const deep = '_jtFormLegs[idx].expiry = 1;';
  const shallowOnly = /^(?:\s*\[[^\]]*\])\s*=(?!=)/;
  ok(WRITE_RE.test(deep.slice('_jtFormLegs'.length)), '11.1 the classifier sees `x[i].prop =` as a WRITE');
  ok(!shallowOnly.test(deep.slice('_jtFormLegs'.length)),
    '…which a shallower `x[i] =` rule would have missed, reading it as a read');
  ok(WRITE_RE.test('_jtEditId = 3;'.slice('_jtEditId'.length)), '11.2 plain rebinding is a write');
  ok(WRITE_RE.test('_jtFormLegs[i].a.b += 1;'.slice('_jtFormLegs'.length)), '11.3 nested chains count');
  ok(!WRITE_RE.test('_jtFormLegs.length'.slice('_jtFormLegs'.length)), '11.4 a plain property read is not a write');
  ok(!WRITE_RE.test('_jtFormLegs[i] === x'.slice('_jtFormLegs'.length)), '11.5 a comparison is not a write');
  ok(MUTATOR_RE.test('_jtFormLegs.push(1)'.slice('_jtFormLegs'.length)), '11.6 a mutating method is a mutation');
}
// Boundary shifts.
{
  const shifted = metrics(INDEX.slice(H.at, H.end - 1));
  ok(shifted.sha !== H.raw.sha, '11.7 the handler raw block shifted by one LF has a different hash');
  const grown = metrics(INDEX.slice(AC.at, AC.end + 1));
  ok(grown.sha !== AC.raw.sha, '11.8 the forms raw block shifted by one unit has a different hash');
  ok(INDEX.slice(AC.at - 1, AC.end - 1) !== INDEX.slice(AC.at, AC.end), '11.9 shifting the start moves the bytes');
}
// The handler-belongs-to-the-form finding must be falsifiable.
{
  const moved = CODE.replace('onchange="_onJtLegExpChange(', 'onchange="_somethingElse(');
  const v = lexicalViews(moved);
  eq(refSites(v.strings, '_onJtLegExpChange').length, 0,
    '11.10 removing the generated onchange is detectable');
  // Plant at the `}\n\n` seam before the handler block: a real top-level
  // position. Planting at an arbitrary offset risks landing inside a string,
  // where the masking would correctly hide it and the control would prove
  // nothing — §11.13 exercises that case deliberately instead.
  const seam = H.at - CODE_AT;
  const planted = CODE.slice(0, seam) + 'function _x(){ _onJtLegExpChange(1,2); }\n\n' + CODE.slice(seam);
  eq(refSites(maskLiterals(planted), '_onJtLegExpChange').length,
    refSites(VIEWS.code, '_onJtLegExpChange').length + 1,
    '11.11 an executable consumer planted outside the block is detectable');
}
// A state write planted outside the candidate must move the numbers.
{
  const at = AC.at - CODE_AT;
  const planted = CODE.slice(0, at) + '_jtEditId = 99;\n' + CODE.slice(at);
  const pv = maskLiterals(planted);
  const before = refSites(VIEWS.code, '_jtEditId').length;
  ok(refSites(pv, '_jtEditId').length === before + 1, '11.12 an extra external state write is visible');
}
// Lexical masking is not optional.
{
  // `_jtEditId` legitimately has three external READS in submitTrade, so the
  // control is that a planted write does not INCREASE the executable count —
  // not that the count is zero.
  const baseline = refSites(VIEWS.code, '_jtEditId').length;
  const at = AC.at - CODE_AT;
  const inString = CODE.slice(0, at) + "var _s = '_jtEditId = 99;';\n\n" + CODE.slice(at);
  eq(refSites(maskLiterals(inString), '_jtEditId').length, baseline,
    '11.13 a write hidden in a STRING is not counted as executable');
  const inComment = CODE.slice(0, at) + '// _jtEditId = 99;\n\n' + CODE.slice(at);
  eq(refSites(maskLiterals(inComment), '_jtEditId').length, baseline,
    '11.14 a write mentioned in a COMMENT is not counted either');
  // …while a real one IS counted, so the masking is not simply blind.
  const inCode = CODE.slice(0, at) + '_jtEditId = 99;\n\n' + CODE.slice(at);
  eq(refSites(maskLiterals(inCode), '_jtEditId').length, baseline + 1,
    '11.14b …but a real external write is');
}
// The hypothetical transforms must fail closed.
{
  ok(sha256(mF.out + ' ') !== HYP_F.sha, '11.15 one foreign byte changes the hypothetical F index hash');
  const noSep = mF.out.slice(0, anchorLineEnd) + mF.out.slice(anchorLineEnd + HYP_INSERTION_CHARS);
  let back = noSep;
  back = back.slice(0, H.at) + INDEX.slice(H.at, H.end - 1) + back.slice(H.at);
  ok(back !== INDEX, '11.16 a reverse transform that drops a separator does NOT reconstruct the base');
  const swapped = BODY_AC + '\n' + BODY_H;
  ok(sha256(swapped) !== MODULE_F.sha, '11.17 the two fragments in the wrong order hash differently');
  eq(swapped.length, MODULE_F.chars, '…even though the length is identical');
}
// The candidate comparison must be able to come out the other way.
{
  const fakeScore = { E: { stateWrites: 0, codeEdges: 1, units: 1 }, F: { stateWrites: 5, codeEdges: 9, units: 9 } };
  const r = ['E', 'F'].slice().sort((x, y) =>
    fakeScore[x].stateWrites - fakeScore[y].stateWrites ||
    fakeScore[x].codeEdges - fakeScore[y].codeEdges ||
    fakeScore[x].units - fakeScore[y].units);
  eq(r, ['E', 'F'], '11.18 the ranking function returns E first when the numbers favour E');
}

// ─────────────────────────────────────────────────────────────────────────────
section('12. Production is unchanged, and the audit footprint is four test files');
// ─────────────────────────────────────────────────────────────────────────────
eq(sha256(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), BASE_INDEX_SHA256,
  'index.html on disk is byte-identical to the base');
eq(git(['hash-object', 'index.html']).trim(), BASE_INDEX_BLOB, '…and hashes to the base blob');
eq(git(['diff', '--name-only', BASE_SHA + '...HEAD', '--', 'index.html', 'js/']).trim(), '',
  'the committed diff touches neither index.html nor js/');
const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
eq(changed, AUDIT_SCOPE, 'the ENTIRE change set is the audit plus the three suite-count ratchets');
eq(changed.length, 4, 'exactly four files, all under tests/');
eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [], 'production scope is empty');
eq(changed.filter((rel) => rel.startsWith('.github/')), [], 'no workflow changed');
eq(changed.filter((rel) => rel.endsWith('.md')), [], 'no documentation changed');
eq(changed.filter((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')), [], 'no configuration changed');
eq(changed.filter((rel) => rel.startsWith('tests/lib/')), [], 'no test helper changed');
eq(changed.filter((rel) => !rel.startsWith('tests/')), [], 'every changed path is a test artifact');

// The ratchet advance is mechanical: in each contract the ONLY changed content
// is the suite-count constant, its explanatory comment and the assertion text.
// Nothing else moved, so no contract was weakened to accommodate this audit.
eq(RATCHET_RELS.length, 3, 'exactly three suite-count ratchets exist');
for (const rel of RATCHET_RELS) {
  const before = git(['show', BASE_SHA + ':' + rel]);
  const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(before.indexOf('const TEST_FILE_COUNT = 139;') >= 0, rel + ' pinned 139 at the base');
  eq(after.indexOf('const TEST_FILE_COUNT = 139;'), -1, rel + ' no longer pins 139');
  ok(after.indexOf('const TEST_FILE_COUNT = 140;') >= 0, rel + ' now pins 140');
  // Structural, not phrase-matched: drop the constant line together with the
  // contiguous comment block directly above it, plus the assertion's message
  // line. Whatever remains must be byte-identical on both sides.
  const norm = (t) => {
    const lines = t.split('\n');
    const at = lines.findIndex((l) => /const TEST_FILE_COUNT\s*=/.test(l));
    if (at < 0) return t;
    let from = at;
    while (from > 0 && /^\s*\/\//.test(lines[from - 1])) from--;
    lines.splice(from, at - from + 1);
    return lines.filter((l) => !/the suite is (?:exactly |still )?1(?:39|40) test files/.test(l)).join('\n');
  };
  eq(norm(after), norm(before), rel + ': every other byte is identical to the base');
}
// And they are still the only three. A fourth pin must not hide.
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
eq(pinned.sort(), RATCHET_RELS, 'the repository has exactly these three live suite-count pins');
eq(declRe.test(fs.readFileSync(path.join(ROOT, AUDIT_REL), 'utf8')), false,
  'this audit declares no suite-count pin of its own');
// Phase 2 has not been started.
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no journal-trade-forms module was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/journal-trade-forms-boundary-contract.test.js')),
  'no permanent boundary contract was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/lib/journal-trade-forms-undo.js')), 'no undo helper was created');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-manual-entry.js')), 'no manual-entry-only module exists');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-adjustment.js')), 'no adjustment-only module exists');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'index.html still loads exactly the base 57 local scripts');

console.log('\n' + pass + ' assertions passed');
console.log('recommendation: extract Candidate ' + RECOMMENDATION +
  ' (Manual Entry + Adjustment + the two chain-aware handlers)');
console.log('JOURNAL_MANUAL_ADJUSTMENT_BOUNDARY_AUDIT_OK');
