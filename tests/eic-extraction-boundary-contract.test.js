'use strict';
// An unhandled rejection anywhere in the async proof chains would otherwise
// stop the suite silently: the final summary would never print and the process
// would still exit 0, reporting green while having proved less than it claims.
process.on('unhandledRejection', (e) => {
  console.log('UNHANDLED REJECTION in the contract harness: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
// ═════════════════════════════════════════════════════════════════════════════
// EIC EXTRACTION BOUNDARY CONTRACT
//
// WHAT THIS IS
//   The boundary contract for the EIC (Earnings Iron Condor agent) family,
//   opened with PR 1 of 4 and carrying the WHOLE eleven-site plan from day one.
//
//   EIC had, like PESS before it, ZERO existing test coverage: before this file
//   not one suite in the repository referenced any EIC declaration. So this
//   contract is not an accessory to the extraction — it is the only thing that
//   would notice a mistake.
//
// THE PLAN (option E of the post-PESS audit, PR #374 — evidence-only)
//   SCREENING_RULES   js/services/eic-screening-rules.js        4 / 14,368   SHIPPED
//   PANEL             js/ui/eic-panel.js                        2 / 15,268   SHIPPED
//   TICKER_ANALYSIS   js/ui/eic-ticker-analysis-panel.js        1 / 13,990   SHIPPED
//   LIVE_DEEP_DIVE    js/ui/eic-live-deep-dive.js               4 / 23,726   SHIPPED
//                                                              ──────────────
//                                                             11 / 67,352   COMPLETE
//
//   THE FAMILY IS CLOSED. Inline EIC residue is 0 sites / 0 chars, the ratchet
//   reads 11 → 7 → 5 → 4 → 0, and that ZERO IS TERMINAL: guardRatchet refuses a
//   later positive allowance, and guardInlineResidue refuses any EIC declaration
//   reappearing in the monolith. There is no PR 5.
//
//   Note the SITE counts. Eleven sites, nine unique names: both `eicLiqFromLegs`
//   and `eicFetchLegs` are declared TWICE. This contract counts sites
//   throughout, because a contract that counted names would not notice a
//   duplicate silently disappearing.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE MUTATION PROOF WAS REBUILT
//
//   The first version of this file claimed "17 mutants · 0 survivors". Several
//   of those were not mutations at all:
//
//       mutant('the script tag gains defer', () => !/\bdefer\b/i.test(tag.attrs));
//       mutant('a sync declaration is turned async', () => MODULE_DECLS.every(d => !d.isAsync));
//
//   Each merely asks whether the HEALTHY repository currently satisfies the
//   rule, and reports "killed" when it does. The rule and the evidence are the
//   same expression, so the check can never fail for the reason it claims to
//   test. An independent review called this out, and it was right.
//
//   The verification is now split in three:
//
//     • tests/lib/eic-contract-guards.js holds the GUARDS — pure functions from
//       a model (module source, script list, manifest, ratchet) to a list of
//       violations. A guard cannot tell whether it is looking at the real
//       repository or at a mutant.
//     • §3-§9 run each guard against the REAL repository and require zero
//       violations.
//     • §11 copies the same model, MUTATES it, runs the SAME guard, and
//       requires at least one violation.
//
//   A mutant is killed ONLY when the guard returns a violation. A guard that
//   throws is recorded as a harness error and counts as a SURVIVOR, because a
//   crash is indistinguishable from a broken test.
//
// WHAT PR 1 IS
//   A BYTE-FOR-BYTE RELOCATION. Four declaration SITES were cut from the inline
//   monolith and pasted into a classic script, unchanged. One `<script src>` tag
//   was added. Nothing else changed, and NO behaviour changed.
//
// THE DUPLICATE IS THE POINT, AND IT IS NOT A DEFECT TO BE TIDIED
//   `eicLiqFromLegs` is declared twice and BOTH sites moved, in their original
//   relative order, byte-for-byte identical. Both are plain `function`
//   declarations, so both are HOISTED — bound before the first statement of the
//   script executes. The later declaration wins, and it wins at hoist time, not
//   at its physical position. Because the two are identical byte for byte, the
//   winner is indistinguishable from the loser.
//
//   DELETING one would also be behaviour-neutral — and that is exactly why it
//   must not happen here. It would be an EDIT, and this is a RELOCATION.
//
//   Recorded and deliberately NOT acted on: `eicLiqFromLegs` has ZERO call sites
//   anywhere in the application. Both declarations are dead code. §6 pins that
//   fact so a later reader knows it was measured rather than missed.
// ═════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const L = require('./lib/load-app-source.js');
const G = require('./lib/eic-contract-guards.js');
const EIC_UNDO = require('./lib/eic-pr1-undo.js');
const EIC_UNDO2 = require('./lib/eic-pr2-undo.js');
const EIC_UNDO3 = require('./lib/eic-pr3-undo.js');
const EIC_UNDO4 = require('./lib/eic-pr4-undo.js');

const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/services/eic-screening-rules.js';
const MODULE_PATH = path.join(ROOT, MODULE_REL);
const { sha256, scanTopLevelDeclarations, classifyReferences } = G;

let passed = 0;
const failures = [];
function ok(c, m) { if (c) { passed++; return; } failures.push(m); console.log('  FAIL  ' + m); }
function eq(a, b, m) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  ok(x === y, m + ' (expected ' + y + ', got ' + x + ')');
}
function deepEq(a, b, m) { eq(a, b, m); }
function section(t) { console.log('\n' + t); }
function note(t) { console.log('    · ' + t); }

/** A guard result is CLEAN when it produced no violations at all. */
function expectClean(res, label) {
  ok(res.violations.length === 0, label + (res.violations.length ? ' — ' + res.violations.join(' | ') : ''));
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MODEL — everything the guards consume, built once from the real repo.
// ─────────────────────────────────────────────────────────────────────────────
const HTML = L.loadIndexHtml();
const MODULE_SRC = fs.readFileSync(MODULE_PATH, 'utf8');
const PANEL_PATH = path.resolve(__dirname, '..', 'js', 'ui', 'eic-panel.js');
const PANEL_SRC = fs.readFileSync(PANEL_PATH, 'utf8');
const TA_PATH = path.resolve(__dirname, '..', 'js', 'ui', 'eic-ticker-analysis-panel.js');
const TA_SRC = fs.readFileSync(TA_PATH, 'utf8');
const LDD_PATH = path.resolve(__dirname, '..', 'js', 'ui', 'eic-live-deep-dive.js');
const LDD_SRC = fs.readFileSync(LDD_PATH, 'utf8');
// PR 4's byte-identity and undo proofs remain historical even after the later
// fdColor functional repair. The helper removes only that exact approved block;
// runtime and surface proofs below continue to exercise the current source.
const LDD_EXTRACTION_SRC = EIC_UNDO4.extractionSource(LDD_SRC);
if (LDD_EXTRACTION_SRC == null) throw new Error('the approved fdColor repair block is missing, duplicated or changed');
const SCRIPT_TAGS = L.parseScriptTags(HTML);
const SCRIPT_MODEL = SCRIPT_TAGS.map((t) => ({
  src: t.src ? String(t.src).trim() : null,
  attrs: t.attrs,
  type: t.type,
  inline: t.inline,
  isInlineMonolith: (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000,
}));
const INLINE = SCRIPT_MODEL.filter((s) => s.isInlineMonolith).map((s) => s.inline).join('\n');
const APP_SRC = L.loadAppJavaScriptSource();
const ORDERED = L.loadOrderedScriptSources();

const MODULE_DECLS = scanTopLevelDeclarations(MODULE_SRC);
const PANEL_DECLS = scanTopLevelDeclarations(PANEL_SRC);
const TA_DECLS = scanTopLevelDeclarations(TA_SRC);
const LDD_DECLS = scanTopLevelDeclarations(LDD_SRC);
const LDD_EXTRACTION_DECLS = scanTopLevelDeclarations(LDD_EXTRACTION_SRC);
// Assigned by §9F once the BASE transcripts exist, for the same reason
// TA_TRANSCRIPT_GUARD is: §12 mutates the real bodies through it, so a parity
// regression is proved rather than asserted.
let LDD_TRANSCRIPT_GUARD = null;
// Assigned by §9D once the BASE transcript exists, for the same reason
// PANEL_TRANSCRIPT_GUARD is: §12 mutates the real body through it, so a parity
// regression is proved rather than asserted.
let TA_TRANSCRIPT_GUARD = null;
// §9B is asynchronous (eicAnalyzeAll is async). The final summary waits on this.
let PARITY_TAIL = Promise.resolve();
// Assigned by §9B once the BASE transcript exists. §12 mutates panel source
// through it, so a parity regression is provable, not merely asserted.
let PANEL_TRANSCRIPT_GUARD = null;
const INLINE_DECLS = scanTopLevelDeclarations(INLINE);

const BASE_REF = '73ecb1683d916a9eb2521654d88c530907e6462b';
const BASE_INDEX_SHA256 = '945685db0a90052ad6236bc9aaf7a43a1b9ba5a2a77eb11222f646a1c1fa3d5d';
const BASE_MONOLITH_CHARS = 2089628;

const SCREENING_RULES = G.SHIPPED_OWNER;
const PANEL = 'PANEL', TICKER_ANALYSIS = 'TICKER_ANALYSIS', LIVE_DEEP_DIVE = 'LIVE_DEEP_DIVE';

// name, owner, chars, form, base offset — ALL ELEVEN SITES, physical order.
const MANIFEST = [
  ['eicScreenTicker', SCREENING_RULES, 4613, 'function', 1904395],
  ['eicFetchLegs', LIVE_DEEP_DIVE, 144, 'async function', 1909192],
  ['eicLiqFromLegs', SCREENING_RULES, 628, 'function', 1909407],
  ['runEICPanel', PANEL, 11442, 'function', 1910108],
  ['eicFetchLegs', LIVE_DEEP_DIVE, 144, 'async function', 1921735],
  ['eicLiqFromLegs', SCREENING_RULES, 628, 'function', 1921950],
  ['eicAnalyzeTicker', TICKER_ANALYSIS, 13990, 'async function', 1922652],
  ['eicAnalyzeAll', PANEL, 3826, 'async function', 1936644],
  ['eicDXLinkDeepDive', LIVE_DEEP_DIVE, 12815, 'async function', 1940887],
  ['eicBuildLiveContext', SCREENING_RULES, 8499, 'function', 1953770],
  ['eicRunDXLink', LIVE_DEEP_DIVE, 10623, 'async function', 1962349],
];
const RATCHET = [11, 7, 5, 4, 0];
// PR 1's three names. Sections 8 and 9 are PR 1's purity and parity proofs and
// must keep meaning exactly that; the panel gets its own sections, because a
// panel is not pure and proving it "pure" would be proving something false.
const MOVED_NAMES = G.PR1_NAMES;
const PANEL_NAMES = G.PANEL_NAMES;
const TA_NAMES = G.TICKER_ANALYSIS_NAMES;
const LDD_NAMES = G.LIVE_DEEP_DIVE_NAMES;

function git(args) { return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, encoding: 'utf8' }); }
function baseHtml() {
  let s = null;
  try { s = git(['show', BASE_REF + ':index.html']); } catch (_) { return null; }
  return sha256(s) === BASE_INDEX_SHA256 ? s : null;
}
function monolithOf(html) {
  const inl = L.parseScriptTags(html).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
  return inl.length === 1 ? inl[0].inline : null;
}
const BASE_HTML = baseHtml();
const BASE_MONO = BASE_HTML ? monolithOf(BASE_HTML) : null;

// PR 2 was cut from a DIFFERENT base than PR 1: the post-PR1 application, i.e.
// dev-clean after #375 merged. Its blob is what the panel's byte-for-byte proof
// compares against, so it is read separately and verified by hash.
const BASE_PR1_REF = 'b7c003654359c118c4e3c7672ed9254458064515';
function basePr1Html() {
  let s = null;
  try { s = git(['show', BASE_PR1_REF + ':index.html']); } catch (_) { return null; }
  return sha256(s) === EIC_UNDO2.POST_PR1_INDEX_SHA256 ? s : null;
}
const BASE_PR1_HTML = basePr1Html();
const BASE_PR1_MONO = BASE_PR1_HTML ? monolithOf(BASE_PR1_HTML) : null;

// PR 3 was cut from a THIRD base: the post-PR2 application, i.e. dev-clean after
// #376 merged. Same pattern, verified by hash so a wrong blob cannot silently
// stand in for the right one.
const BASE_PR2_REF = EIC_UNDO3.POST_PR2_REF;
function basePr2Html() {
  let s = null;
  try { s = git(['show', BASE_PR2_REF + ':index.html']); } catch (_) { return null; }
  return sha256(s) === EIC_UNDO3.POST_PR2_INDEX_SHA256 ? s : null;
}
const BASE_PR2_HTML = basePr2Html();
const BASE_PR2_MONO = BASE_PR2_HTML ? monolithOf(BASE_PR2_HTML) : null;

// PR 4 was cut from a FOURTH base: the post-PR3 application, i.e. dev-clean
// after #377 merged. Same pattern, verified by hash so a wrong blob cannot
// silently stand in for the right one.
const BASE_PR3_REF = EIC_UNDO4.POST_PR3_REF;
function basePr3Html() {
  let s = null;
  try { s = git(['show', BASE_PR3_REF + ':index.html']); } catch (_) { return null; }
  return sha256(s) === EIC_UNDO4.POST_PR3_INDEX_SHA256 ? s : null;
}
const BASE_PR3_HTML = basePr3Html();
const BASE_PR3_MONO = BASE_PR3_HTML ? monolithOf(BASE_PR3_HTML) : null;
const BASE_PR3_RUNTIME_MONO = (function () {
  if (!BASE_PR3_MONO) return null;
  const baseRun = scanTopLevelDeclarations(BASE_PR3_MONO).filter((d) => d.name === 'eicRunDXLink')[0];
  const currentRun = LDD_DECLS.filter((d) => d.name === 'eicRunDXLink')[0];
  if (!baseRun || !currentRun) return null;
  return BASE_PR3_MONO.slice(0, baseRun.start)
    + LDD_SRC.slice(currentRun.start, currentRun.end + 1)
    + BASE_PR3_MONO.slice(baseRun.end + 1);
})();

// Three of the strongest proofs below — byte-for-byte relocation (§4), BASE vs
// HEAD parity (§9) and the whole-file comparison (§10) — need the base blob.
// They degrade to a skip when it is unreachable, which is right for a shallow
// clone and WRONG anywhere else: a skip that reports green proves nothing.
// CI checks out with fetch-depth 0, so there the blob is always reachable and
// the skip must be unreachable. This turns "unreachable" into a fact that has
// to be true rather than an excuse the suite can help itself to.
function isShallow() {
  try { return git(['rev-parse', '--is-shallow-repository']).trim() === 'true'; }
  catch (_) { return false; }
}
const SHALLOW = isShallow();

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  EIC EXTRACTION BOUNDARY CONTRACT — PRs 1-4 of 4, COMPLETE');
console.log('  (SCREENING_RULES, PANEL, TICKER_ANALYSIS, LIVE_DEEP_DIVE · 0 inline residue)');
console.log('════════════════════════════════════════════════════════════════════════════════');

// ═════════════════════════════════════════════════════════════════════════════
section('1. PARSER PROOF — reproduce the shipped fixtures exactly');
// ═════════════════════════════════════════════════════════════════════════════
const FIXTURES = [
  ['js/services/pess-config-rules.js', 4, 1786],
  ['js/services/pess-live-transport.js', 2, 9127],
  ['js/ui/pess-batch-panel.js', 1, 16111],
  ['js/ui/pess-panel.js', 2, 25698],
  ['js/services/sfs-config-state.js', 33, 1059],
  ['js/services/sfs-scan-service.js', 9, 10635],
  ['js/ui/sfs-panel.js', 20, 28128],
  ['js/adapters/backend-directional-snapshot-adapter.js', 19, 6789],
  ['js/services/backend-directional-snapshot-service.js', 26, 26385],
  ['js/ui/backend-directional-snapshot-panel.js', 9, 14945],
];
for (const [rel, cnt, chars] of FIXTURES) {
  const d = scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(d.length, cnt, '1.1 fixture ' + rel + ' — declaration count');
  eq(d.reduce((a, x) => a + x.chars, 0), chars, '1.2 fixture ' + rel + ' — declaration chars');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2. THE ELEVEN-SITE MANIFEST');
// ═════════════════════════════════════════════════════════════════════════════
expectClean(G.guardManifest(MANIFEST), '2.1 the manifest satisfies the plan contract');
eq(MANIFEST.length, G.FAMILY_SITES, '2.2 eleven declaration SITES');
eq(new Set(MANIFEST.map((m) => m[0])).size, G.FAMILY_NAMES, '2.3 …which are nine unique NAMES');
eq(MANIFEST.reduce((a, m) => a + m[2], 0), G.FAMILY_CHARS, '2.4 …totalling 67,352 chars');
const dupNames = Array.from(new Set(MANIFEST.map((m) => m[0]))).filter((n) => MANIFEST.filter((m) => m[0] === n).length > 1);
deepEq(dupNames.sort(), ['eicFetchLegs', 'eicLiqFromLegs'], '2.5 exactly two names are declared twice');
// ── every site has EXACTLY ONE declared owner, checked against the SOURCE ───
// While the family was mid-extraction, guardManifest's shipped/pending
// arithmetic caught a wrong owner because it moved a site between buckets. Now
// that all four owners have shipped, that arithmetic no longer distinguishes
// them, so ownership is cross-checked against what the modules really declare.
const DECLS_BY_MODULE = {
  './js/services/eic-screening-rules.js': MODULE_DECLS.map((d) => d.name),
  './js/ui/eic-panel.js': PANEL_DECLS.map((d) => d.name),
  './js/ui/eic-ticker-analysis-panel.js': TA_DECLS.map((d) => d.name),
  './js/ui/eic-live-deep-dive.js': LDD_DECLS.map((d) => d.name),
};
expectClean(G.guardOwnership(MANIFEST, DECLS_BY_MODULE), '2.6 all eleven sites have exactly one declared owner, and it is the module that declares them');
eq(Object.keys(DECLS_BY_MODULE).length, 4, '2.7 exactly four owning modules');
eq(Object.keys(DECLS_BY_MODULE).reduce((a, k) => a + DECLS_BY_MODULE[k].length, 0), G.FAMILY_SITES,
  '2.8 …declaring eleven sites between them — application-wide declaration conservation is exact');
deepEq(Object.keys(DECLS_BY_MODULE).map((k) => G.canonicalLocalSrc(k)).sort(), G.EIC_MODULE_FILES.slice().sort(),
  '2.9 …and they are exactly the four modules the inventory declares by name');

// ── THE DISK INVENTORY ──────────────────────────────────────────────────────
// Script tags say what the application LOADS. This says what EXISTS. A fifth
// eic-*.js module sitting unreferenced in js/ui/ is still a fifth module of a
// family that is supposed to be closed at four — it would be swept up by any
// later glob, bundler or audit — so both inventories are checked.
//
// The directories are named explicitly, for the same reason the file list is:
// a recursive walk of js/ would quietly extend the rule's reach as the tree
// grows, and this contract only owns the three directories the family could
// plausibly land in.
const EIC_SCAN_DIRS = ['js/services', 'js/ui', 'js/adapters'];
const DISK_JS_FILES = [];
for (const d of EIC_SCAN_DIRS) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (/\.js$/.test(f)) DISK_JS_FILES.push(d + '/' + f);
  }
}
const DISK_EIC_FILES = DISK_JS_FILES.filter((f) => G.isEicModulePath(G.canonicalLocalSrc(f))).sort();
deepEq(DISK_EIC_FILES, G.EIC_MODULE_FILES.slice().sort(),
  '2.10 exactly four eic-*.js files EXIST on disk across js/services, js/ui and js/adapters — no unreferenced fifth');
ok(DISK_JS_FILES.length > DISK_EIC_FILES.length,
  '2.11 …found among ' + DISK_JS_FILES.length + ' .js files in those directories, so the scan really looked');
for (const f of G.EIC_MODULE_FILES) {
  ok(fs.existsSync(path.join(ROOT, f)), '2.12 the declared module exists on disk: ' + f);
}

// ═════════════════════════════════════════════════════════════════════════════
section('3. THE MODULE');
// ═════════════════════════════════════════════════════════════════════════════
ok(fs.existsSync(MODULE_PATH), '3.1 ' + MODULE_REL + ' exists');
expectClean(G.guardModuleShape(MODULE_SRC), '3.2 the shipped module satisfies the shape contract');
eq(MODULE_DECLS.length, 4, '3.3 four declaration SITES');
eq(new Set(MODULE_DECLS.map((d) => d.name)).size, 3, '3.4 three unique names');
eq(MODULE_DECLS.reduce((a, d) => a + d.chars, 0), 14368, '3.5 14,368 declaration chars');
deepEq(MODULE_DECLS.map((d) => d.name), G.EXPECTED_MODULE.order, '3.6 original physical order, both duplicate sites included');
ok(!/module\.exports|export\s|require\s*\(/.test(MODULE_SRC), '3.7 classic script — no module system introduced');

// ═════════════════════════════════════════════════════════════════════════════
section('4. BYTE-FOR-BYTE RELOCATION');
// ═════════════════════════════════════════════════════════════════════════════
for (const d of MODULE_DECLS) {
  eq(sha256(MODULE_SRC.slice(d.start, d.end + 1)), G.EXPECTED_MODULE.spanSha[d.name],
    '4.1 ' + d.name + ' is byte-identical to its recorded base span (sha256)');
}
// The gate on every base-dependent proof in this file. In a full clone the base
// blob MUST be readable; only a shallow clone earns the skip.
ok(SHALLOW || BASE_MONO !== null,
  '4.0 the base blob at ' + BASE_REF.slice(0, 10) + ' is reachable — this checkout is not shallow, so the '
  + 'skips in §4/§9/§10 are not available'
  + (BASE_HTML === null ? ' (git show failed, or the blob did not match the recorded SHA-256)' : ''));
if (BASE_MONO) {
  eq(BASE_MONO.length, BASE_MONOLITH_CHARS, '4.2 the base monolith is the size this contract was written against');
  const shipped = MANIFEST.filter((m) => m[1] === SCREENING_RULES);
  let direct = 0;
  for (let i = 0; i < shipped.length; i++) {
    const m = shipped[i];
    const baseText = BASE_MONO.slice(m[4], m[4] + m[2]);
    const modText = MODULE_SRC.slice(MODULE_DECLS[i].start, MODULE_DECLS[i].end + 1);
    eq(modText, baseText, '4.3 ' + m[0] + '@' + m[4] + ' — module span EQUALS the base span, character for character');
    if (modText === baseText) direct++;
  }
  eq(direct, 4, '4.4 4/4 sites byte-identical to the real base blob');
  const baseEic = scanTopLevelDeclarations(BASE_MONO).filter(G.isEicFamilyDecl);
  eq(baseEic.length, G.FAMILY_SITES, '4.5 the base monolith declared all eleven EIC sites');
  eq(baseEic.reduce((a, d) => a + d.chars, 0), G.FAMILY_CHARS, '4.6 …totalling 67,352 chars');
  note('4/4 byte-identical, verified against the base blob at ' + BASE_REF.slice(0, 10));
} else {
  note('base blob unreachable (shallow clone) — sha256 proofs stand alone');
  ok(true, '4.3 base-blob comparison skipped: the recorded hashes are the proof');
}

// ═════════════════════════════════════════════════════════════════════════════
section('5. WHAT REMAINS INLINE — the ratchet');
// ═════════════════════════════════════════════════════════════════════════════
expectClean(G.guardInlineResidue(INLINE), '5.1 the inline residue satisfies the residue contract');
const inlineEic = INLINE_DECLS.filter(G.isEicFamilyDecl);
eq(inlineEic.length, G.PENDING_SITES, '5.2 ZERO EIC sites remain inline — the family is closed');
eq(inlineEic.reduce((a, d) => a + d.chars, 0), G.PENDING_CHARS, '5.3 …totalling 0 chars');
deepEq(inlineEic.map((d) => d.name), G.PENDING_ORDER, '5.4 …and the residue list is empty');
eq(inlineEic.filter((d) => d.name === 'eicFetchLegs').length, 0,
  '5.5 NEITHER eicFetchLegs copy is left inline — PR 4 moved both');
expectClean(G.guardRatchet(RATCHET, inlineEic.length), '5.6 the ratchet satisfies the shrink-only contract');
deepEq(RATCHET, [11, 7, 5, 4, 0], '5.7 the inline allowance ratcheted 11 → 7 → 5 → 4 → 0');
eq(new Set(inlineEic.map((d) => d.name)).size, 0, '5.8 …across zero unique inline names');
// ── the ZERO IS TERMINAL, three ways ───────────────────────────────────────
eq(RATCHET[RATCHET.length - 1], 0, '5.9 zero is the FINAL value of the ratchet');
eq(Math.min.apply(null, RATCHET), 0, '5.10 …and the MINIMUM — nothing sits below it');
eq(RATCHET.indexOf(0), RATCHET.length - 1, '5.11 …and it occurs exactly once, at the end: no allowance was appended after it');
ok(G.guardRatchet(RATCHET.concat([2]), 2).violations.some((v) => /RATCHET_REOPENED/.test(v)),
  '5.12 appending a positive allowance AFTER the zero is REJECTED by name (RATCHET_REOPENED)');
ok(G.guardRatchet([11, 7, 5, 4, 0], 1).violations.some((v) => /RATCHET_ZERO_UNEARNED/.test(v)),
  '5.13 …and a zero that is merely asserted while a declaration is still inline is REJECTED too');
// Every EIC name, application-wide, is declared in a MODULE and nowhere inline.
for (const n of G.SHIPPED_NAMES) {
  eq(INLINE_DECLS.filter((d) => d.name === n).length, 0,
    '5.14 ' + n + ' is not declared inline');
}
eq(INLINE_DECLS.filter(G.isEicFamilyDecl).length, 0,
  '5.15 no declaration whose name LOOKS like an EIC name survives inline — checked by the shared family PREDICATE, not by the shipped list');
// The predicate is the load-bearing half of 5.15, so it is proved here rather
// than assumed. An independent review found the original inline expression
// (`/^eic/i.test(name) || name === 'runEICPanel'`) missed two ordinary shapes,
// which meant 5.15 was asserting something the filter could not deliver.
{
  const MUST = ['eicFoo', 'EICFoo', '_eicFoo', 'runEICFoo', 'runEICSomething', '_eicBootstrap',
    'runEICPanel', 'eicRunDXLink', 'eicFetchLegs', 'EIC_THING', '$eicX'];
  const MUST_NOT = ['deiceThing', 'receiptTotal', 'pessAnalyzeAll', 'computeSetupScore',
    'runPESSPanel', 'specificThing', 'eiffelTower', 'sfsPanel', 'bdspRender'];
  let wrong = 0;
  for (const n of MUST) if (!G.isEicFamilyName(n)) { wrong++; ok(false, '5.16 the family predicate MISSED ' + n); }
  for (const n of MUST_NOT) if (G.isEicFamilyName(n)) { wrong++; ok(false, '5.16 the family predicate FALSE-POSITIVED on ' + n); }
  eq(wrong, 0, '5.16 the shared EIC family predicate classifies all ' + (MUST.length + MUST_NOT.length)
    + ' controls correctly — including the two shapes the old inline regex missed');
  // The two shapes that used to slip through, named individually so a
  // regression names them back.
  ok(G.isEicFamilyName('_eicBootstrap'), '5.17 a leading underscore does not hide an EIC name (the old ^eic anchor missed it)');
  ok(G.isEicFamilyName('runEICSomething'), '5.18 EIC in the MIDDLE of a name is detected (the old rule hardcoded only runEICPanel)');
  ok(!G.isEicFamilyName('deiceThing'), '5.19 …and it matches SEGMENTS, so a name that merely contains the letters is not swept in');
  // Every one of the nine shipped names is recognised by the predicate, so the
  // pattern layer and the exact-name layer agree about the family they describe.
  for (const n of G.SHIPPED_NAMES) {
    ok(G.isEicFamilyName(n), '5.20 the predicate recognises the shipped name ' + n);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('6. THE DUPLICATE — analysed, not tidied');
// ═════════════════════════════════════════════════════════════════════════════
const modLiq = MODULE_DECLS.filter((d) => d.name === 'eicLiqFromLegs');
eq(modLiq.length, 2, '6.1 the module carries BOTH eicLiqFromLegs sites');
const liqTexts = modLiq.map((d) => MODULE_SRC.slice(d.start, d.end + 1));
eq(liqTexts[0], liqTexts[1], '6.2 the two sites are byte-identical');
eq(sha256(liqTexts[0]), G.EXPECTED_MODULE.spanSha.eicLiqFromLegs, '6.3 …and both match the single recorded span hash');
ok(modLiq[0].start < modLiq[1].start, '6.4 their original relative order is preserved');
ok(modLiq.every((d) => d.form === 'function' && !d.isAsync),
  '6.5 both are plain function declarations — therefore HOISTED, so neither position can be observed');
{
  const sigRe = /^function\s+eicLiqFromLegs\s*\(([^)]*)\)/;
  const sigs = liqTexts.map((t) => (t.match(sigRe) || [])[1]);
  eq(sigs[0], sigs[1], '6.6 both sites share the same signature');
  eq(sigs[0], 'legs', '6.7 …which is (legs)');
}
eq(INLINE_DECLS.filter((d) => d.name === 'eicLiqFromLegs').length, 0, '6.8 no third copy remains inline');

const APP_CODE = G.maskLiterals(APP_SRC);
function callSites(name) {
  const re = new RegExp('(^|[^.\\w$])(function\\s+)?' + name + '\\s*\\(', 'g');
  let m, n = 0;
  while ((m = re.exec(APP_CODE)) !== null) if (!m[2]) n++;
  return n;
}
function referenceUses(name) {
  const re = new RegExp('(^|[^.\\w$])(function\\s+)?' + name + '\\b\\s*(\\()?', 'g');
  let m, n = 0;
  while ((m = re.exec(APP_CODE)) !== null) if (!m[2] && !m[3]) n++;
  return n;
}
eq(callSites('eicLiqFromLegs'), 0, '6.9 eicLiqFromLegs has ZERO direct call sites — recorded, NOT deleted');
eq(referenceUses('eicLiqFromLegs'), 0, '6.10 …and zero by-reference uses: it is unreachable dead code');
eq(callSites('eicScreenTicker'), 4, '6.11 eicScreenTicker has four direct call sites');
eq(referenceUses('eicScreenTicker'), 1, '6.12 …plus one by-reference use (passed to .map)');
eq(callSites('eicBuildLiveContext'), 1, '6.13 eicBuildLiveContext has one call site');
eq(MODULE_DECLS.length - new Set(MODULE_DECLS.map((d) => d.name)).size, 1,
  '6.14 the module still contains exactly one duplicate site — no deduplication was performed');

// ═════════════════════════════════════════════════════════════════════════════
section('7. THE LOAD, AND THE REAL LOAD-TIME OBSERVER PROOF');
//
// The question is not "does anything MENTION these names?" but "does anything
// READ the binding while scripts are still evaluating?" — because only the
// second constrains where the tag may go. The scanner therefore separates
// evaluation-time reads from references parked inside function bodies, and
// proves it can tell them apart before it is believed about the real source.
// ═════════════════════════════════════════════════════════════════════════════
expectClean(G.guardLoad(SCRIPT_MODEL), '7.1 the script tag satisfies the load contract');
const localSrcs = ORDERED.filter((s) => s.kind === 'local').map((s) => s.src);
eq(localSrcs.filter((s) => s === './' + MODULE_REL).length, 1, '7.2 the module is loaded exactly once');
{
  const i = localSrcs.indexOf('./' + MODULE_REL);
  eq(localSrcs[i - 1], './js/ui/pess-panel.js', '7.3 it loads immediately after the PESS family block');
}

// ── 7A. the scanner proves itself on controls FIRST ──────────────────────────
const OBSERVER_CONTROLS = [
  ['bare read', 'var observed = eicScreenTicker;', 'load'],
  ['direct call', 'eicScreenTicker();', 'load'],
  ['typeof probe', 'const x = typeof eicScreenTicker;', 'load'],
  ['if guard', 'if (eicScreenTicker) { doThing(); }', 'load'],
  ['passed to a registrar', 'register(eicScreenTicker);', 'load'],
  ['window assignment', 'window.foo = eicScreenTicker;', 'load'],
  ['globalThis assignment', 'globalThis.foo = eicBuildLiveContext;', 'load'],
  ['IIFE body', '(function(){ eicScreenTicker(); })();', 'load'],
  ['arrow IIFE body', '(() => { eicScreenTicker(); })();', 'load'],
  ['array literal', 'var arr = [eicScreenTicker];', 'load'],
  ['object value', 'var o = { fn: eicScreenTicker };', 'load'],
  ['function declaration body', 'function later(x){ return eicScreenTicker(x); }', 'call'],
  ['async function body', 'async function later(x,y){ return eicBuildLiveContext(x,y); }', 'call'],
  ['callback body', 'register(function(){ return eicScreenTicker(); });', 'call'],
  ['arrow block body', 'register(() => { return eicLiqFromLegs(x); });', 'call'],
  ['arrow concise body', 'register(x => eicScreenTicker(x));', 'call'],
  ['nested function body', 'function a(){ function b(){ return eicScreenTicker(); } }', 'call'],
  ['object method shorthand', 'var o = { run(){ return eicScreenTicker(); } };', 'call'],
  ['class method', 'class K { run(){ return eicScreenTicker(); } }', 'call'],
  ['line comment', '// eicScreenTicker is great', 'none'],
  ['string literal', 'var s = "eicScreenTicker";', 'none'],
  ['block comment', '/* eicBuildLiveContext(x) */', 'none'],
  ['unrelated property', 'obj.eicScreenTicker = 1;', 'none'],
];
let controlFails = 0;
for (const [label, code, want] of OBSERVER_CONTROLS) {
  const r = classifyReferences(code, MOVED_NAMES);
  const got = r.loadTime.length ? 'load' : r.callTime.length ? 'call' : 'none';
  if (got !== want) controlFails++;
  ok(got === want, '7.4 observer control [' + label + '] classified ' + got + ', expected ' + want);
}
eq(controlFails, 0, '7.5 every observer control classified correctly — the scanner can tell the two apart');
ok(OBSERVER_CONTROLS.filter((c) => c[2] === 'load').length >= 8, '7.6 the controls include at least eight positive (load-time) cases');
ok(OBSERVER_CONTROLS.filter((c) => c[2] === 'call').length >= 8, '7.7 …and at least eight call-time-only cases');

// ── 7B. the real scan ────────────────────────────────────────────────────────
const MOD_SLOT = ORDERED.findIndex((s) => s.src === './' + MODULE_REL);
const MONO_SLOT = ORDERED.findIndex((s) => s.kind === 'inline' && s.isAppJs && s.code.length > 100000);
ok(MOD_SLOT >= 0 && MONO_SLOT > MOD_SLOT, '7.8 the module loads before the inline monolith (slots ' + MOD_SLOT + ' → ' + MONO_SLOT + ')');
const DOWNSTREAM = ORDERED.slice(MOD_SLOT + 1, MONO_SLOT).filter((s) => s.isAppJs && s.code != null);
const OBSERVER_SOURCES = DOWNSTREAM.map((s) => ({ label: s.src, code: s.code }))
  .concat([{ label: '(inline monolith)', code: ORDERED[MONO_SLOT].code }]);
eq(DOWNSTREAM.length, 27, '7.9 twenty-seven local scripts execute between the module and the monolith (PR 4 added one)');
eq(OBSERVER_SOURCES.length, 28, '7.10 …and all 28 downstream sources are scanned, monolith included');
expectClean(G.guardNoLoadTimeObservers(OBSERVER_SOURCES, MOVED_NAMES),
  '7.11 no downstream source READS a relocated binding at evaluation time');
const REAL_OBS = {};
for (const nm of MOVED_NAMES) {
  let load = 0, call = 0;
  for (const s of OBSERVER_SOURCES) {
    const c = classifyReferences(s.code, [nm]);
    load += c.loadTime.length; call += c.callTime.length;
  }
  REAL_OBS[nm] = { load, call };
  eq(load, 0, '7.12 ' + nm + ' — load-time observers downstream');
}
note('downstream observers — ' + MOVED_NAMES.map((n) => n + ': ' + REAL_OBS[n].load + ' load / ' + REAL_OBS[n].call + ' call').join(' · '));
for (const nm of MOVED_NAMES) {
  const outside = HTML.replace(ORDERED[MONO_SLOT].code, '');
  eq((outside.match(new RegExp('\\b' + nm + '\\b', 'g')) || []).length, 0,
    '7.13 ' + nm + ' appears in no HTML attribute handler');
}

// ═════════════════════════════════════════════════════════════════════════════
section('7C. THE PANEL LOAD-TIME OBSERVER PROOF — EIC PR 2');
//
// §7 scans for the PR 1 names. It says NOTHING about the panel, so PR 2 needs
// its own scan with its own window: the sources that execute AFTER
// js/ui/eic-panel.js, through the inline monolith. Reusing §7's numbers here
// would be reporting a PR 1 result under a PR 2 heading.
//
// Three reference kinds are kept apart, because they impose different rules:
//   LOAD-TIME  — read while scripts are still evaluating. Would constrain where
//                the tag may sit. Expected: none.
//   CALL-TIME  — parked inside a function body, resolved when that body runs.
//                Imposes nothing beyond "declared before the call happens".
//   CLICK-TIME — a name inside generated onclick= markup. Resolved off the
//                GLOBAL object when a user clicks, so it constrains the BINDING
//                FORM (must stay a global function declaration) and not the
//                load order at all. Counted separately for exactly that reason.
// ═════════════════════════════════════════════════════════════════════════════
const PANEL_MOVED = G.PANEL_NAMES;
deepEq(PANEL_MOVED, ['runEICPanel', 'eicAnalyzeAll'], '7C.1 the PR 2 scan targets the two relocated panel names');
ok(PANEL_MOVED.join(',') !== MOVED_NAMES.join(','), '7C.2 …which are NOT the PR 1 names — this is a distinct proof');

// ── 7C-a. controls, on the PANEL names, before the real scan is believed ─────
const PANEL_OBSERVER_CONTROLS = [
  ['bare read', 'var x = runEICPanel;', 'load'],
  ['direct call', 'runEICPanel();', 'load'],
  ['typeof probe', 'typeof eicAnalyzeAll;', 'load'],
  ['passed to a registrar', 'register(eicAnalyzeAll);', 'load'],
  ['if guard', 'if (runEICPanel) { boot(); }', 'load'],
  ['window assignment', 'window.p = runEICPanel;', 'load'],
  ['IIFE body', '(function(){ runEICPanel(); })();', 'load'],
  ['array literal', 'var a = [eicAnalyzeAll];', 'load'],
  ['function declaration body', 'function later(){ runEICPanel(); }', 'call'],
  ['setTimeout callback', 'setTimeout(function(){ eicAnalyzeAll(); }, 1);', 'call'],
  ['arrow block body', 'register(() => { runEICPanel(); });', 'call'],
  ['arrow concise body', 'register(() => eicAnalyzeAll());', 'call'],
  ['method shorthand', 'var o = { run(){ runEICPanel(); } };', 'call'],
  ['async body', 'async function go(){ await eicAnalyzeAll(); }', 'call'],
  ['line comment', '// runEICPanel is the panel', 'none'],
  ['string literal', 'var s = "eicAnalyzeAll";', 'none'],
  ['unrelated property', 'obj.runEICPanel = 1;', 'none'],
];
let panelControlFails = 0;
for (const [label, code, want] of PANEL_OBSERVER_CONTROLS) {
  const r = classifyReferences(code, PANEL_MOVED);
  const got = r.loadTime.length ? 'load' : r.callTime.length ? 'call' : 'none';
  if (got !== want) panelControlFails++;
  ok(got === want, '7C.3 panel observer control [' + label + '] classified ' + got + ', expected ' + want);
}
eq(panelControlFails, 0, '7C.4 every panel observer control classified correctly');
ok(PANEL_OBSERVER_CONTROLS.filter((c) => c[2] === 'load').length >= 4, '7C.5 the controls include the four required positive cases');
ok(PANEL_OBSERVER_CONTROLS.filter((c) => c[2] === 'call').length >= 2, '7C.6 …and the required deferred cases');

// ── 7C-b. the real scan, in the PANEL's own window ───────────────────────────
const PANEL_SLOT = ORDERED.findIndex((s) => s.src === './js/ui/eic-panel.js');
ok(PANEL_SLOT >= 0 && MONO_SLOT > PANEL_SLOT,
  '7C.7 the panel loads before the inline monolith (slots ' + PANEL_SLOT + ' → ' + MONO_SLOT + ')');
const PANEL_DOWNSTREAM = ORDERED.slice(PANEL_SLOT + 1, MONO_SLOT).filter((s) => s.isAppJs && s.code != null);
const PANEL_OBSERVER_SOURCES = PANEL_DOWNSTREAM.map((s) => ({ label: s.src, code: s.code }))
  .concat([{ label: '(inline monolith)', code: ORDERED[MONO_SLOT].code }]);
ok(PANEL_OBSERVER_SOURCES.length >= 1, '7C.8 the panel scan window is non-empty');
expectClean(G.guardNoLoadTimeObservers(PANEL_OBSERVER_SOURCES, PANEL_MOVED),
  '7C.9 no source downstream of the panel READS runEICPanel or eicAnalyzeAll at evaluation time');
const PANEL_OBS = {};
for (const nm of PANEL_MOVED) {
  let load = 0, call = 0;
  for (const s of PANEL_OBSERVER_SOURCES) {
    const c = classifyReferences(s.code, [nm]);
    load += c.loadTime.length; call += c.callTime.length;
  }
  PANEL_OBS[nm] = { load, call };
  eq(load, 0, '7C.10 ' + nm + ' — load-time observers downstream of the panel');
}
note('panel observers — ' + PANEL_OBSERVER_SOURCES.length + ' sources ('
  + PANEL_DOWNSTREAM.length + ' local + the monolith) · '
  + PANEL_MOVED.map((n) => n + ': ' + PANEL_OBS[n].load + ' load / ' + PANEL_OBS[n].call + ' call').join(' · '));

// ── 7C-c. CLICK-TIME, counted separately ─────────────────────────────────────
// These are not load-order constraints. They are binding-FORM constraints, and
// they live in the panel's own emitted markup.
const PANEL_CODE_7C = PANEL_SRC.slice(PANEL_DECLS[0].start);
const CLICK_TIME = (PANEL_CODE_7C.match(/on[a-z]+\s*=\s*["'][^"']*\b(runEICPanel|eicAnalyzeAll)\b/g) || []).length;
eq(CLICK_TIME, 4, '7C.11 four CLICK-TIME global-resolution requirements, all in the panel’s own emitted markup');
for (const nm of PANEL_MOVED) {
  const outside = HTML.replace(ORDERED[MONO_SLOT].code, '');
  eq((outside.match(new RegExp('\\b' + nm + '\\b', 'g')) || []).length, 0,
    '7C.12 ' + nm + ' appears in no STATIC HTML attribute handler — every handler is generated');
}
ok(CLICK_TIME > 0 && PANEL_OBS.runEICPanel.load === 0,
  '7C.13 click-time requirements exist while load-time observers do not — the two are genuinely different constraints');

// ═════════════════════════════════════════════════════════════════════════════
section('7D. THE TICKER-ANALYSIS LOAD-TIME OBSERVER PROOF — EIC PR 3');
//
// Moving eicAnalyzeTicker into an earlier classic script changes WHEN its global
// binding starts existing. In a pure relocation that is the only load-time
// semantic difference available, so it is the thing this section measures.
//
// A HOLE IN THE INHERITED SCANNER WAS FOUND AND CLOSED HERE
//   The method-shorthand pass in functionBodyRanges read its captured name from
//   `m[3]`. The modifier alternation is NON-capturing, so `m[3]` is always
//   undefined, the NOT_METHOD guard never fired, and every top-level
//   `if (…) { … }`, `for`, `while` and `switch` BLOCK was registered as a
//   deferred function body. A reference inside a top-level `if` is read WHILE
//   THE SCRIPT EVALUATES — misreading it as call-time would hide exactly the
//   observer this proof exists to find, and `if (typeof X === 'function') { … }`
//   is the single most likely shape for such a read to take.
//
//   The fix is one character. Its consequence is not: 7D-a below pins all four
//   control-flow forms as LOAD-TIME, so the scanner cannot regress to the
//   permissive reading. The real repository measures 0 either way — the fix
//   CONFIRMS the result rather than changing it — which is the outcome that
//   makes the fix safe to make in the same PR that depends on it.
// ═════════════════════════════════════════════════════════════════════════════

// ── 7D-a. the scanner proves itself, including the four repaired forms ───────
const TA_OBSERVER_CONTROLS = [
  ['a top-level read', 'var boot = eicAnalyzeTicker;', 'load'],
  ['a top-level call', 'eicAnalyzeTicker("AAPL");', 'load'],
  ['a top-level typeof probe', 'typeof eicAnalyzeTicker;', 'load'],
  ['registration by reference', 'register(eicAnalyzeTicker);', 'load'],
  ['assignment onto window', 'window.handler = eicAnalyzeTicker;', 'load'],
  ['an IIFE that calls it', '(function(){ eicAnalyzeTicker("A"); })();', 'load'],
  // The four forms the inherited scanner got WRONG. Each is evaluation-time.
  ['inside a top-level if-block', 'if (ready) { eicAnalyzeTicker("A"); }', 'load'],
  ['inside a top-level for-block', 'for (var i=0;i<1;i++) { eicAnalyzeTicker("A"); }', 'load'],
  ['inside a top-level while-block', 'while (go) { eicAnalyzeTicker("A"); }', 'load'],
  ['inside a top-level switch-block', 'switch (k) { case 1: eicAnalyzeTicker("A"); }', 'load'],
  // …and the forms that are genuinely deferred and must STAY deferred.
  ['parked in a function body', 'function later(){ eicAnalyzeTicker("AAPL"); }', 'call'],
  ['parked in a setTimeout callback', 'setTimeout(function(){ eicAnalyzeTicker("AAPL"); }, 10);', 'call'],
  ['parked in a click listener', 'el.addEventListener("click", function(){ eicAnalyzeTicker("AAPL"); });', 'call'],
  ['parked in a method shorthand', 'var o = { run(){ eicAnalyzeTicker("A"); } };', 'call'],
  ['parked in a class method', 'class A { run(){ eicAnalyzeTicker("A"); } }', 'call'],
  ['parked in an arrow body', 'var f = () => { eicAnalyzeTicker("A"); };', 'call'],
  // Text that merely MENTIONS the name is not a JS read at all.
  ['a mention inside a string', 'var s = "eicAnalyzeTicker(x)";', 'none'],
  ['a mention inside a comment', '// eicAnalyzeTicker is called on click', 'none'],
];
let taControlFails = 0;
for (const [label, code, want] of TA_OBSERVER_CONTROLS) {
  const c = classifyReferences(code, TA_NAMES);
  const got = c.loadTime.length ? 'load' : (c.callTime.length ? 'call' : 'none');
  if (got !== want) { taControlFails++; ok(false, '7D.1 control [' + label + '] expected ' + want + ', got ' + got); }
}
eq(taControlFails, 0, '7D.1 all ' + TA_OBSERVER_CONTROLS.length
  + ' scanner controls classify correctly — including the four control-flow forms the inherited scanner misread');

// ── 7D-b. the real scan, in the ticker-analysis panel's own window ───────────
const TA_SLOT = ORDERED.findIndex((s) => s.src === G.TICKER_ANALYSIS_SRC_ATTR);
ok(TA_SLOT >= 0, '7D.2 the ticker-analysis module has a slot in the real load order');
ok(TA_SLOT < MONO_SLOT, '7D.3 …before the inline monolith');
const TA_DOWNSTREAM = ORDERED.slice(TA_SLOT + 1, MONO_SLOT).filter((s) => s.isAppJs && s.code != null);
const TA_OBSERVER_SOURCES = TA_DOWNSTREAM.map((s) => ({ label: s.src, code: s.code }))
  .concat([{ label: '(inline monolith)', code: ORDERED[MONO_SLOT].code }]);
expectClean(G.guardNoLoadTimeObservers(TA_OBSERVER_SOURCES, TA_NAMES),
  '7D.4 no source downstream of the ticker-analysis module READS eicAnalyzeTicker at evaluation time');
const TA_OBS = {};
for (const nm of TA_NAMES) {
  let load = 0, call = 0;
  for (const s of TA_OBSERVER_SOURCES) {
    const c = classifyReferences(s.code, [nm]);
    load += c.loadTime.length; call += c.callTime.length;
  }
  TA_OBS[nm] = { load, call };
  eq(load, 0, '7D.5 ' + nm + ' — load-time observers downstream of the module');
}
note('ticker-analysis observers — ' + TA_OBSERVER_SOURCES.length + ' sources ('
  + TA_DOWNSTREAM.length + ' local + the monolith) · '
  + TA_NAMES.map((n) => n + ': ' + TA_OBS[n].load + ' load / ' + TA_OBS[n].call + ' call').join(' · '));

// ── 7D-c. the ONE caller, which loads BEFORE this module ────────────────────
// js/ui/eic-panel.js is UPSTREAM, so it is not in the scan window above — and it
// is the only place in the application that references the name. Being upstream
// is precisely why it has to be classified explicitly: if that reference were
// evaluation-time, the panel would read a binding that does not exist yet and
// the relocation would be unsafe in a way no downstream scan could see.
{
  const c = classifyReferences(PANEL_SRC, TA_NAMES);
  eq(c.loadTime.length, 0, '7D.6 js/ui/eic-panel.js — which loads BEFORE this module — never reads eicAnalyzeTicker at evaluation time');
  eq(c.callTime.length, 1, '7D.7 …it holds exactly ONE deferred reference');
  ok(/addEventListener\([^)]*['"]click['"][\s\S]{0,80}eicAnalyzeTicker/.test(PANEL_SRC),
    '7D.8 …and that reference is inside a click listener, resolved off the global scope when the user clicks');
  // Application-wide census, with comments and strings masked so a mention
  // cannot inflate or deflate the count.
  const census = [];
  for (const s of ORDERED.filter((x) => x.isAppJs && x.code != null)) {
    const n = (G.maskLiterals(s.code).match(/\beicAnalyzeTicker\b/g) || []).length;
    if (n) census.push([String(s.src || '(monolith)'), n]);
  }
  const total = census.reduce((a, x) => a + x[1], 0);
  eq(total, 2, '7D.9 eicAnalyzeTicker occurs exactly TWICE in the masked application: its declaration and its one caller');
  deepEq(census.map((x) => x[0]).sort(),
    ['./js/ui/eic-panel.js', './js/ui/eic-ticker-analysis-panel.js'].sort(),
    '7D.10 …and those two occurrences are the module that declares it and the panel that calls it — none left in the monolith');
}

// ═════════════════════════════════════════════════════════════════════════════
section('7E. THE LIVE-DEEP-DIVE LOAD-TIME OBSERVER PROOF — EIC PR 4');
//
// Moving three names into an earlier classic script changes WHEN their global
// bindings start existing. In a pure relocation that is the only load-time
// semantic difference available, so it is the thing this section measures — for
// all THREE unique names, not just the interesting one.
//
// The analysis distinguishes three things that are easy to conflate:
//
//   EVALUATION-TIME  read while the script that contains it is executing. This
//                    is the only kind that can break a relocation, and the only
//                    kind that must be zero.
//   CALL-TIME        parked inside a function body, resolved when that function
//                    is later called.
//   CLICK/LISTENER   parked inside a listener callback, resolved when the event
//                    fires. A special case of call-time, counted separately
//                    because it is the shape the one real caller takes.
//
// Top-level `if`/`for`/`while`/`switch` blocks are EVALUATION-TIME and are
// re-proved as such here. The inherited scanner used to misread them as deferred
// function bodies; PR 3 fixed that and 7E-a re-pins all four forms against the
// PR 4 names, so the repair cannot regress in the PR that most depends on it —
// `if (typeof eicRunDXLink === 'function') { … }` is exactly the shape a
// load-time read of this module's names would take.
// ═════════════════════════════════════════════════════════════════════════════

// ── 7E-a. the scanner proves itself on the PR 4 names, before the real scan ──
const LDD_OBSERVER_CONTROLS = [
  ['a top-level read', 'var boot = eicRunDXLink;', 'load'],
  ['a top-level call', 'eicRunDXLink("AAPL");', 'load'],
  ['a top-level typeof probe', 'typeof eicDXLinkDeepDive;', 'load'],
  ['registration by reference', 'register(eicFetchLegs);', 'load'],
  ['assignment onto window', 'window.h = eicRunDXLink;', 'load'],
  ['an IIFE that calls it', '(function(){ eicDXLinkDeepDive("A"); })();', 'load'],
  ['an array literal', 'var a = [eicFetchLegs];', 'load'],
  ['an object value', 'var o = { fn: eicRunDXLink };', 'load'],
  // The four control-flow forms. A reference inside ANY of them is read while
  // the script evaluates, and hiding them as deferred bodies is the one direction
  // this scanner must never get wrong.
  ['inside a top-level if-block', 'if (ready) { eicRunDXLink("A"); }', 'load'],
  ['inside a top-level typeof-guard if', 'if (typeof eicRunDXLink === "function") { eicRunDXLink("A"); }', 'load'],
  ['inside a top-level for-block', 'for (var i=0;i<1;i++) { eicFetchLegs("A"); }', 'load'],
  ['inside a top-level while-block', 'while (go) { eicDXLinkDeepDive("A"); }', 'load'],
  ['inside a top-level switch-block', 'switch (k) { case 1: eicRunDXLink("A"); }', 'load'],
  // …and the forms that are genuinely deferred and must STAY deferred.
  ['parked in a function body', 'function later(){ eicRunDXLink("AAPL"); }', 'call'],
  ['parked in an async function body', 'async function later(){ await eicDXLinkDeepDive("A"); }', 'call'],
  ['parked in a setTimeout callback', 'setTimeout(function(){ eicRunDXLink("A"); }, 10);', 'call'],
  ['parked in a click listener', 'el.addEventListener("click", function(){ eicRunDXLink("A"); });', 'call'],
  ['parked in a method shorthand', 'var o = { run(){ eicRunDXLink("A"); } };', 'call'],
  ['parked in a class method', 'class A { run(){ eicFetchLegs("A"); } }', 'call'],
  ['parked in an arrow block', 'var f = () => { eicDXLinkDeepDive("A"); };', 'call'],
  ['parked in an arrow concise body', 'var f = x => eicRunDXLink(x);', 'call'],
  // Text that merely MENTIONS a name is not a JS read at all.
  ['a mention inside a string', 'var s = "eicRunDXLink(x)";', 'none'],
  ['a mention inside a line comment', '// eicRunDXLink is called on click', 'none'],
  ['a mention inside a block comment', '/* eicDXLinkDeepDive(x) */', 'none'],
  ['an unrelated property of the same name', 'obj.eicRunDXLink = 1;', 'none'],
];
let lddControlFails = 0;
for (const [label, code, want] of LDD_OBSERVER_CONTROLS) {
  const c = classifyReferences(code, LDD_NAMES);
  const got = c.loadTime.length ? 'load' : (c.callTime.length ? 'call' : 'none');
  if (got !== want) { lddControlFails++; ok(false, '7E.1 control [' + label + '] expected ' + want + ', got ' + got); }
}
eq(lddControlFails, 0, '7E.1 all ' + LDD_OBSERVER_CONTROLS.length
  + ' scanner controls classify correctly — including the five top-level control-flow forms, which are LOAD-TIME');
eq(LDD_OBSERVER_CONTROLS.filter((c) => c[2] === 'load').length, 13, '7E.2 thirteen positive (evaluation-time) controls');
eq(LDD_OBSERVER_CONTROLS.filter((c) => c[2] === 'call').length, 8, '7E.3 eight deferred (call-time) controls');
eq(LDD_OBSERVER_CONTROLS.filter((c) => c[2] === 'none').length, 4, '7E.4 four non-reads (comments, strings, unrelated properties)');

// ── 7E-b. the real scan, in the live-deep-dive module's own window ──────────
const LDD_SLOT = ORDERED.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
ok(LDD_SLOT >= 0, '7E.5 the live-deep-dive module has a slot in the real load order');
ok(LDD_SLOT < MONO_SLOT, '7E.6 …before the inline monolith');
eq(LDD_SLOT, TA_SLOT + 1, '7E.7 …and immediately after the ticker-analysis panel');
const LDD_DOWNSTREAM = ORDERED.slice(LDD_SLOT + 1, MONO_SLOT).filter((s) => s.isAppJs && s.code != null);
const LDD_OBSERVER_SOURCES = LDD_DOWNSTREAM.map((s) => ({ label: s.src, code: s.code }))
  .concat([{ label: '(inline monolith)', code: ORDERED[MONO_SLOT].code }]);
expectClean(G.guardNoLoadTimeObservers(LDD_OBSERVER_SOURCES, LDD_NAMES),
  '7E.8 no source downstream of the live-deep-dive module READS any of its three names at evaluation time');
const LDD_OBS = {};
for (const nm of LDD_NAMES) {
  let load = 0, call = 0;
  for (const s of LDD_OBSERVER_SOURCES) {
    const c = classifyReferences(s.code, [nm]);
    load += c.loadTime.length; call += c.callTime.length;
  }
  LDD_OBS[nm] = { load, call };
  eq(load, 0, '7E.9 ' + nm + ' — load-time observers downstream of the module');
}
note('live-deep-dive observers — ' + LDD_OBSERVER_SOURCES.length + ' sources ('
  + LDD_DOWNSTREAM.length + ' local + the monolith) · '
  + LDD_NAMES.map((n) => n + ': ' + LDD_OBS[n].load + ' load / ' + LDD_OBS[n].call + ' call').join(' · '));

// ── 7E-c. the UPSTREAM caller, and the CLICK-TIME classification ────────────
// js/ui/eic-ticker-analysis-panel.js loads BEFORE this module, so it is not in
// the scan window above — and it holds the only application reference to any of
// these three names. Being upstream is precisely why it has to be classified
// explicitly: if that reference were evaluation-time, it would read a binding
// that does not exist yet and the relocation would be unsafe in a way no
// downstream scan could see.
{
  const c = classifyReferences(TA_SRC, LDD_NAMES);
  eq(c.loadTime.length, 0,
    '7E.10 js/ui/eic-ticker-analysis-panel.js — which loads BEFORE this module — never reads a PR 4 name at evaluation time');
  eq(c.callTime.length, 1, '7E.11 …it holds exactly ONE deferred reference');
  eq(c.callTime[0].name, 'eicRunDXLink', '7E.12 …and it is eicRunDXLink');
  // CLICK-TIME specifically, not merely "deferred": the reference sits inside an
  // addEventListener callback, so it resolves when the user clicks.
  ok(/addEventListener\([^)]*['"]click['"][\s\S]{0,200}eicRunDXLink/.test(TA_SRC),
    '7E.13 …inside an addEventListener("click", …) callback — resolved off the global scope at CLICK time');
  // Application-wide census, with comments and strings masked so a mention
  // cannot inflate or deflate the count.
  const census = {};
  for (const nm of LDD_NAMES) {
    census[nm] = [];
    for (const s of ORDERED.filter((x) => x.isAppJs && x.code != null)) {
      const n = (G.maskLiterals(s.code).match(new RegExp('\\b' + nm + '\\b', 'g')) || []).length;
      if (n) census[nm].push([String(s.src || '(monolith)'), n]);
    }
  }
  // eicFetchLegs: TWO declarations, ZERO callers. Dead code, and pinned as such.
  deepEq(census.eicFetchLegs.map((x) => x[0]), ['./js/ui/eic-live-deep-dive.js'],
    '7E.14 eicFetchLegs occurs ONLY in its own module — it has zero call sites anywhere in the application');
  eq(census.eicFetchLegs.reduce((a, x) => a + x[1], 0), 2,
    '7E.15 …exactly twice: its two declarations, and nothing else. Both copies are DEAD CODE, recorded not repaired');
  // eicDXLinkDeepDive: one declaration + one in-module caller.
  deepEq(census.eicDXLinkDeepDive.map((x) => x[0]), ['./js/ui/eic-live-deep-dive.js'],
    '7E.16 eicDXLinkDeepDive occurs only in its own module');
  eq(census.eicDXLinkDeepDive.reduce((a, x) => a + x[1], 0), 2,
    '7E.17 …twice: its declaration and the in-module call from eicRunDXLink');
  // eicRunDXLink: one declaration + one CROSS-MODULE caller, upstream.
  deepEq(census.eicRunDXLink.map((x) => x[0]).sort(),
    ['./js/ui/eic-live-deep-dive.js', './js/ui/eic-ticker-analysis-panel.js'].sort(),
    '7E.18 eicRunDXLink occurs in its own module and in the ticker-analysis panel — and NOWHERE in the monolith');
  eq(census.eicRunDXLink.reduce((a, x) => a + x[1], 0), 2,
    '7E.19 …twice: its declaration and its one caller');
  // Nothing at all is left in the monolith.
  const monoMasked = G.maskLiterals(ORDERED[MONO_SLOT].code);
  for (const nm of LDD_NAMES) {
    eq((monoMasked.match(new RegExp('\\b' + nm + '\\b', 'g')) || []).length, 0,
      '7E.20 ' + nm + ' does not appear in the inline monolith at all — not as a declaration, not as a reference');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('8. MODULE PURITY — structural, then EVALUATED under a trapping sandbox');
// ═════════════════════════════════════════════════════════════════════════════
expectClean(G.guardModulePurity(MODULE_SRC), '8.1 the shipped module satisfies the purity contract');
{
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    Math, JSON, Date, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt, RegExp, Error,
  };
  vm.createContext(sandbox);
  vm.runInContext(MODULE_SRC, sandbox, { filename: MODULE_REL });
  for (const n of MOVED_NAMES) eq(typeof sandbox[n], 'function', '8.2 ' + n + ' is bound as a global function by the module');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9. BEHAVIOURAL PARITY — BASE vs HEAD over source-derived fixtures');
//
// The three functions are extracted from the BASE monolith and from the HEAD
// module and run side by side over identical inputs. Time is PINNED in both
// sandboxes: eicScreenTicker derives its DTE from
// `new Date(d.nextEarnings) - Date.now()`, so a fixture that supplies a
// `daysToEarnings` field exercises nothing and a live clock makes the
// comparison irreproducible. Production is not modified to inject a clock — the
// harness supplies a fixed Date to both sides.
// ═════════════════════════════════════════════════════════════════════════════
const FIXED_NOW = Date.UTC(2026, 0, 15, 0, 0, 0);
const DAY = 86400000;
const iso = (offsetDays) => new Date(FIXED_NOW + offsetDays * DAY).toISOString();

function evalDecls(src, names) {
  class FixedDate extends Date {
    constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
    static now() { return FIXED_NOW; }
  }
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Math, JSON, Date: FixedDate, Number, String, Array, Object, Boolean,
    isNaN, parseFloat, parseInt, RegExp, Error,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'parity.js' });
  const out = {};
  for (const n of names) out[n] = ctx[n];
  return out;
}

let fxScreen = 0, fxLiq = 0, fxCtx = 0, diffs = 0;
const PARITY_LABELS = { screen: [], liq: [], ctx: [] };

if (BASE_MONO) {
  const shipped = MANIFEST.filter((m) => m[1] === SCREENING_RULES);
  const baseParts = shipped.map((m) => BASE_MONO.slice(m[4], m[4] + m[2]));
  const headParts = MODULE_DECLS.map((d) => MODULE_SRC.slice(d.start, d.end + 1));
  const BASE_FN = evalDecls(baseParts.join('\n'), MOVED_NAMES);
  const HEAD_FN = evalDecls(headParts.join('\n'), MOVED_NAMES);
  for (const n of MOVED_NAMES) {
    ok(typeof BASE_FN[n] === 'function', '9.1 BASE ' + n + ' evaluated from the base monolith');
    ok(typeof HEAD_FN[n] === 'function', '9.2 HEAD ' + n + ' evaluated from the shipped module');
  }

  function compare(bucket, label, fn, args) {
    if (bucket === 'screen') fxScreen++; else if (bucket === 'liq') fxLiq++; else fxCtx++;
    PARITY_LABELS[bucket].push(label);
    let a, b, ea = null, eb = null;
    try { a = BASE_FN[fn].apply(null, args); } catch (e) { ea = String(e && e.message); }
    try { b = HEAD_FN[fn].apply(null, args); } catch (e) { eb = String(e && e.message); }
    const sa = ea !== null ? 'THREW:' + ea : JSON.stringify(a);
    const sb = eb !== null ? 'THREW:' + eb : JSON.stringify(b);
    if (sa !== sb) { diffs++; ok(false, '9.x ' + fn + ' [' + label + '] BASE≠HEAD: ' + sa + ' vs ' + sb); }
    return ea !== null ? null : a;
  }

  // ── eicScreenTicker — branches read off the real body ──────────────────────
  const base = { ticker: 'AAPL', name: 'Apple', price: 190, ivRank: 55, iv: 0.35,
    volume: 3000000, liq: 1, bid: 189.98, ask: 190.02, signal: 'BUY', rsi: 60, beta: 1.1 };
  const withT = (o) => Object.assign({}, base, o);

  compare('screen', 'null input', 'eicScreenTicker', [null]);
  compare('screen', 'undefined input', 'eicScreenTicker', [undefined]);
  compare('screen', 'empty object', 'eicScreenTicker', [{}]);

  // IV source
  compare('screen', 'iv present → TT_realtime', 'eicScreenTicker', [withT({ nextEarnings: iso(7), iv: 0.35, iv30: null })]);
  compare('screen', 'iv absent, iv30 present → TT_iv30', 'eicScreenTicker', [withT({ nextEarnings: iso(7), iv: null, iv30: 0.30 })]);
  compare('screen', 'both IV absent → ivLowConf', 'eicScreenTicker', [withT({ nextEarnings: iso(7), iv: null, iv30: null })]);
  compare('screen', 'iv zero (falsy) + iv30', 'eicScreenTicker', [withT({ nextEarnings: iso(7), iv: 0, iv30: 0.28 })]);

  // Price
  for (const [lbl, price] of [['price normal', 190], ['price 0', 0], ['price <10', 7.5],
    ['price null', null], ['price >50 bonus', 250], ['price exactly 10', 10], ['price 50', 50]]) {
    compare('screen', lbl, 'eicScreenTicker', [withT({ nextEarnings: iso(7), price })]);
  }

  // Earnings timing — real nextEarnings values against the pinned clock
  for (const [lbl, days] of [['days 1', 1], ['days 2 boundary', 2], ['days 4', 4], ['days 5 boundary', 5],
    ['days 14 boundary', 14], ['days 15', 15], ['days 21 boundary', 21], ['days 22 outside', 22],
    ['days 30 outside', 30], ['days 0', 0], ['days negative', -3]]) {
    compare('screen', lbl, 'eicScreenTicker', [withT({ nextEarnings: iso(days) })]);
  }
  compare('screen', 'nextEarnings missing → NaN days', 'eicScreenTicker', [withT({ nextEarnings: undefined })]);
  compare('screen', 'nextEarnings unparseable → NaN days', 'eicScreenTicker', [withT({ nextEarnings: 'not-a-date' })]);

  // Liquidity rating
  for (const [lbl, liq] of [['liq 1 (<=2)', 1], ['liq 2 boundary', 2], ['liq 3', 3],
    ['liq 4 (poor)', 4], ['liq 5 (poor)', 5], ['liq null', null]]) {
    compare('screen', lbl, 'eicScreenTicker', [withT({ nextEarnings: iso(7), liq })]);
  }
  // Stock spread bands: spreadPct = (ask-bid)/price*100
  for (const [lbl, bid, ask, price] of [
    ['spread <0.1%', 199.95, 200.05, 200],
    ['spread 0.1-0.3%', 199.8, 200.2, 200],
    ['spread 0.3-0.8%', 199.4, 200.6, 200],
    ['spread >=0.8%', 199.0, 201.0, 200],
    ['spread via ttBid/ttAsk', undefined, undefined, 200],
    ['zero bid/ask', 0, 0, 200]]) {
    const o = { nextEarnings: iso(7), price, bid, ask };
    if (lbl.indexOf('ttBid') >= 0) { o.bid = 0; o.ask = 0; o.ttBid = 199.9; o.ttAsk = 200.1; }
    compare('screen', lbl, 'eicScreenTicker', [withT(o)]);
  }
  // Volume bands
  for (const [lbl, volume] of [['volume >2M', 3000000], ['volume 2M boundary', 2000000],
    ['volume >500k', 700000], ['volume 500k boundary', 500000], ['volume low', 100000], ['volume missing', undefined]]) {
    compare('screen', lbl, 'eicScreenTicker', [withT({ nextEarnings: iso(7), volume })]);
  }
  // Composite liquidity labels
  compare('screen', 'liqLabel good (score>=7)', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), liq: 1, bid: 199.95, ask: 200.05, price: 200, volume: 3000000 })]);
  compare('screen', 'liqLabel acceptable (4-6)', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), liq: 3, bid: 199.4, ask: 200.6, price: 200, volume: 700000 })]);
  compare('screen', 'liqLabel weak (<4)', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), liq: 5, bid: 199, ask: 201, price: 20, volume: 100000 })]);
  // Premium label paths — creditRatio comes from a rounded estCredit, so tiny
  // wing widths are the only way the non-'acceptable' bands are reachable.
  for (const [lbl, price, iv] of [['premium normal', 190, 0.35], ['premium tiny wing', 12, 0.01],
    ['premium very tiny wing', 11, 0.005], ['premium large wing', 900, 0.9]]) {
    compare('screen', lbl, 'eicScreenTicker', [withT({ nextEarnings: iso(7), price, iv })]);
  }
  // Hard-reject precedence — the body assigns hardReject up to four times and
  // the LAST assignment wins. These fixtures make more than one true at once
  // and pin the real behaviour rather than an assumed priority order.
  compare('screen', 'HR weak-liq only', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), liq: 5, bid: 199, ask: 201, price: 200, volume: 1000 })]);
  compare('screen', 'HR price<10 only', 'eicScreenTicker', [withT({ nextEarnings: iso(7), price: 5 })]);
  compare('screen', 'HR weak-liq AND price<10 (price wins)', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), liq: 5, bid: 4.5, ask: 5.5, price: 5, volume: 1000 })]);
  compare('screen', 'HR no IV → EM null (IV message wins)', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), iv: null, iv30: null })]);
  compare('screen', 'HR weak-liq AND price<10 AND no IV (IV wins)', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), liq: 5, bid: 4.5, ask: 5.5, price: 5, volume: 1000, iv: null, iv30: null })]);
  compare('screen', 'HR EM null with IV present (price/DTE message)', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), price: 0, iv: 0.35 })]);
  compare('screen', 'HR none — clean row', 'eicScreenTicker',
    [withT({ nextEarnings: iso(7), liq: 1, bid: 199.95, ask: 200.05, price: 200, volume: 3000000, iv: 0.35 })]);
  // ivRank paths
  for (const [lbl, ivRank] of [['ivr null → 0', null], ['ivr 0', 0], ['ivr 40', 40],
    ['ivr 80 cap', 80], ['ivr 95 above cap', 95]]) {
    compare('screen', lbl, 'eicScreenTicker', [withT({ nextEarnings: iso(7), ivRank })]);
  }

  // ── eicLiqFromLegs — real source shape ────────────────────────────────────
  const liqCases = [
    ['null', null],
    ['undefined', undefined],
    ['empty object (no aggregate)', {}],
    ['aggregate null', { aggregate: null }],
    ['complete aggregate + full metadata', {
      aggregate: { liqVerdict: 'GOOD', avgSpreadPct: 1.2, worstSpreadPct: 2.4, estCredit: 0.85, hardReject: null },
      liqDataSource: 'DXLink', liqDataDelayed: false, liqDataTimestamp: '2026-01-15T00:00:00Z',
      liqConfidence: 'high', liqConfidenceNote: 'all four legs live' }],
    ['aggregate present, metadata absent (delayed ?? true)', {
      aggregate: { liqVerdict: 'POOR', avgSpreadPct: 9.9, worstSpreadPct: 22.1, estCredit: 0.1, hardReject: 'spread' } }],
    ['delayed explicitly false', {
      aggregate: { liqVerdict: 'OK', avgSpreadPct: 2, worstSpreadPct: 3, estCredit: 0.5, hardReject: null },
      liqDataDelayed: false }],
    ['delayed explicitly true', {
      aggregate: { liqVerdict: 'OK', avgSpreadPct: 2, worstSpreadPct: 3, estCredit: 0.5, hardReject: null },
      liqDataDelayed: true }],
    ['delayed null (?? true applies)', {
      aggregate: { liqVerdict: 'OK', avgSpreadPct: 2, worstSpreadPct: 3, estCredit: 0.5, hardReject: null },
      liqDataDelayed: null }],
    ['liqVerdict missing → unknown', { aggregate: { avgSpreadPct: 1, worstSpreadPct: 2, estCredit: 0.3 } }],
    ['zero/false-y aggregate fields', {
      aggregate: { liqVerdict: '', avgSpreadPct: 0, worstSpreadPct: 0, estCredit: 0, hardReject: '' },
      liqDataSource: '', liqConfidence: '', liqConfidenceNote: '' }],
  ];
  for (const [lbl, arg] of liqCases) compare('liq', lbl, 'eicLiqFromLegs', [arg]);
  // The two sites must also be behaviourally interchangeable.
  {
    const first = evalDecls(baseParts[1], ['eicLiqFromLegs']).eicLiqFromLegs;
    const second = evalDecls(baseParts[2], ['eicLiqFromLegs']).eicLiqFromLegs;
    let dupDiffs = 0;
    for (const [, arg] of liqCases) {
      let x, y;
      try { x = JSON.stringify(first(arg)); } catch (e) { x = 'THREW'; }
      try { y = JSON.stringify(second(arg)); } catch (e) { y = 'THREW'; }
      if (x !== y) dupDiffs++;
    }
    eq(dupDiffs, 0, '9.3 the two eicLiqFromLegs sites are behaviourally interchangeable over all ' + liqCases.length + ' fixtures');
  }

  // ── eicBuildLiveContext — realistic object-shaped legs ────────────────────
  const leg = (o) => Object.assign({ strike: 200, openInterest: 1200 }, o);
  const liveLeg = (o) => leg(Object.assign({
    realDelta: 0.12, realIV: 32.5, bidPrice: 1.20, askPrice: 1.30,
    realTheta: -0.05, realGamma: 0.01, realVega: 0.11, liveSpread: 8 }, o));
  const delayedLeg = (o) => leg(Object.assign({ estimatedDelta: 0.13, legIV: 30.1, bid: 1.10, ask: 1.45, spreadPct: 27 }, o));
  const fourLive = () => ({
    shortCall: liveLeg({ strike: 210 }), shortPut: liveLeg({ strike: 190, realDelta: -0.12 }),
    longCall: liveLeg({ strike: 220, realDelta: 0.25 }), longPut: liveLeg({ strike: 180, realDelta: -0.25 }) });

  const ctxCases = [
    ['no liveData', [null, null]],
    ['undefined liveData', [undefined, undefined]],
    ['liveData without legs', [{ confidence: 'high' }, null]],
    ['legs null', [{ legs: null, confidence: 'high' }, null]],
    ['confidence high 4/4 live', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4,
      dxlinkConfidence: 'high', liveLegCount: '4/4', liveDataTimestamp: '2026-01-15T00:00:00Z', greeksLive: true }, null]],
    ['confidence partial 2/4', [{ legs: Object.assign(fourLive(), { longCall: delayedLeg({ strike: 220 }), longPut: delayedLeg({ strike: 180 }) }),
      confidence: 'partial', legsWithLiveData: 2, dxlinkConfidence: 'partial' }, null]],
    ['confidence none 0/4', [{ legs: { shortCall: delayedLeg({ strike: 210 }), shortPut: delayedLeg({ strike: 190 }),
      longCall: delayedLeg({ strike: 220 }), longPut: delayedLeg({ strike: 180 }) },
      confidence: 'none', legsWithLiveData: 0, dxlinkConfidence: 'none' }, null]],
    ['missing leg (N/A path)', [{ legs: { shortCall: liveLeg({ strike: 210 }), shortPut: null,
      longCall: liveLeg({ strike: 220 }), longPut: null }, confidence: 'partial', legsWithLiveData: 2 }, null]],
    ['realDelta inside range', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['realDelta outside range', [{ legs: {
      shortCall: liveLeg({ strike: 210, realDelta: 0.45 }), shortPut: liveLeg({ strike: 190, realDelta: -0.45 }),
      longCall: liveLeg({ strike: 220, realDelta: 0.55 }), longPut: liveLeg({ strike: 180, realDelta: -0.55 }) },
      confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['estimated delta fallback', [{ legs: { shortCall: delayedLeg({ strike: 210 }), shortPut: delayedLeg({ strike: 190 }),
      longCall: delayedLeg({ strike: 220 }), longPut: delayedLeg({ strike: 180 }) },
      confidence: 'none', legsWithLiveData: 0 }, null]],
    ['IV unavailable (no realIV, no legIV)', [{ legs: {
      shortCall: leg({ bidPrice: 1.2, askPrice: 1.3 }), shortPut: leg({ bidPrice: 1.2, askPrice: 1.3 }),
      longCall: leg({ bidPrice: 0.5, askPrice: 0.6 }), longPut: leg({ bidPrice: 0.5, askPrice: 0.6 }) },
      confidence: 'partial', legsWithLiveData: 1 }, null]],
    ['TIGHT fill quality', [{ legs: {
      shortCall: liveLeg({ bidPrice: 2.00, askPrice: 2.10 }), shortPut: liveLeg({ bidPrice: 2.00, askPrice: 2.10 }),
      longCall: liveLeg({ bidPrice: 0.50, askPrice: 0.52 }), longPut: liveLeg({ bidPrice: 0.50, askPrice: 0.52 }) },
      confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['ACCEPTABLE fill quality', [{ legs: {
      shortCall: liveLeg({ bidPrice: 2.00, askPrice: 2.40 }), shortPut: liveLeg({ bidPrice: 2.00, askPrice: 2.40 }),
      longCall: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }), longPut: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }) },
      confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['WIDE fill quality', [{ legs: {
      shortCall: liveLeg({ bidPrice: 2.00, askPrice: 2.80 }), shortPut: liveLeg({ bidPrice: 2.00, askPrice: 2.60 }),
      longCall: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }), longPut: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }) },
      confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['VERY_WIDE fill quality', [{ legs: {
      shortCall: liveLeg({ bidPrice: 2.00, askPrice: 5.00 }), shortPut: liveLeg({ bidPrice: 2.00, askPrice: 2.10 }),
      longCall: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }), longPut: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }) },
      confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['NOT_EXECUTABLE (zero bid)', [{ legs: {
      shortCall: liveLeg({ bidPrice: 0, askPrice: 1.0 }), shortPut: liveLeg({ bidPrice: 2.00, askPrice: 2.10 }),
      longCall: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }), longPut: liveLeg({ bidPrice: 0.50, askPrice: 0.55 }) },
      confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['debit credit (<=0) → NOT_EXECUTABLE', [{ legs: {
      shortCall: liveLeg({ bidPrice: 0.10, askPrice: 0.12 }), shortPut: liveLeg({ bidPrice: 0.10, askPrice: 0.12 }),
      longCall: liveLeg({ bidPrice: 3.00, askPrice: 3.10 }), longPut: liveLeg({ bidPrice: 3.00, askPrice: 3.10 }) },
      confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['positive live credit', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['dxlinkConfidence degradation (partial + otherwise EXECUTABLE)', [{ legs: {
      shortCall: liveLeg({ bidPrice: 2.00, askPrice: 2.10 }), shortPut: liveLeg({ bidPrice: 2.00, askPrice: 2.10 }),
      longCall: liveLeg({ bidPrice: 0.50, askPrice: 0.52 }), longPut: liveLeg({ bidPrice: 0.50, askPrice: 0.52 }) },
      confidence: 'partial', legsWithLiveData: 2, dxlinkConfidence: 'partial' }, null]],
    ['source breakdown present', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4,
      dxlinkConfidence: 'high', liveCreditSourceBreakdown: { SC: 'live', SP: 'live', LC: 'live', LP: 'live' } }, null]],
    ['source breakdown absent', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' }, null]],
    ['legacy fields only (no explicit dxlink fields)', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4 }, null]],
    ['delayed bid/ask fallback', [{ legs: {
      shortCall: delayedLeg({ strike: 210 }), shortPut: delayedLeg({ strike: 190 }),
      longCall: delayedLeg({ strike: 220 }), longPut: delayedLeg({ strike: 180 }) },
      confidence: 'partial', legsWithLiveData: 1, dxlinkConfidence: 'partial' }, null]],
    ['greeksLive true', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high', greeksLive: true }, null]],
    ['greeksLive false, 0 live', [{ legs: { shortCall: delayedLeg({}), shortPut: delayedLeg({}),
      longCall: delayedLeg({}), longPut: delayedLeg({}) }, confidence: 'none', legsWithLiveData: 0, greeksLive: false }, null]],
    ['baseLegsData supplied', [{ legs: fourLive(), confidence: 'high', legsWithLiveData: 4, dxlinkConfidence: 'high' },
      { aggregate: { liqVerdict: 'GOOD', estCredit: 0.9 } }]],
  ];
  for (const [lbl, args] of ctxCases) compare('ctx', lbl, 'eicBuildLiveContext', args);

  eq(diffs, 0, '9.4 every parity fixture produced identical output in BASE and HEAD');
  ok(fxScreen >= 50, '9.5 eicScreenTicker parity fixtures: ' + fxScreen);
  ok(fxLiq >= 10, '9.6 eicLiqFromLegs parity fixtures: ' + fxLiq);
  ok(fxCtx >= 25, '9.7 eicBuildLiveContext parity fixtures: ' + fxCtx);

  // The fixtures must actually REACH the branches they claim to. A screening
  // sweep whose `days` is always NaN — the defect the independent review found
  // in the first version — would still report "0 differences" while proving
  // nothing, so the branch coverage is asserted rather than assumed.
  {
    const seen = { days: new Set(), liqLabel: new Set(), premiumLabel: new Set(), hardReject: new Set(), ivSource: new Set() };
    const probe = (o) => { const r = HEAD_FN.eicScreenTicker(o); if (r) {
      seen.days.add(Number.isNaN(r.days) ? 'NaN' : r.days);
      seen.liqLabel.add(r.liqLabel); seen.premiumLabel.add(r.premiumLabel);
      seen.hardReject.add(r.hardReject === null ? 'none' : r.hardReject.slice(0, 12));
      seen.ivSource.add(r.iv === null ? 'none' : 'iv');
    } };
    for (const days of [1, 2, 4, 5, 14, 15, 21, 22, 30, 0, -3]) probe(withT({ nextEarnings: iso(days) }));
    probe(withT({ nextEarnings: undefined }));
    probe(withT({ nextEarnings: iso(7), liq: 1, bid: 199.95, ask: 200.05, price: 200, volume: 3000000 }));
    probe(withT({ nextEarnings: iso(7), liq: 3, bid: 199.4, ask: 200.6, price: 200, volume: 700000 }));
    probe(withT({ nextEarnings: iso(7), liq: 5, bid: 199, ask: 201, price: 20, volume: 100000 }));
    probe(withT({ nextEarnings: iso(7), price: 5 }));
    probe(withT({ nextEarnings: iso(7), iv: null, iv30: null }));
    probe(withT({ nextEarnings: iso(7), price: 0, iv: 0.35 }));
    probe(withT({ nextEarnings: iso(7), price: 12, iv: 0.01 }));
    ok(!seen.days.has('NaN') || seen.days.size > 5,
      '9.8 the screening sweep produced REAL day counts, not only NaN (' + Array.from(seen.days).sort((a, b) => (a === 'NaN' ? 1 : b === 'NaN' ? -1 : a - b)).join(', ') + ')');
    ok(seen.days.has(5) && seen.days.has(14) && seen.days.has(21) && seen.days.has(2),
      '9.9 the 2 / 5 / 14 / 21-day timing boundaries were all reached');
    deepEq(Array.from(seen.liqLabel).sort(), ['acceptable', 'good', 'weak'], '9.10 all three liquidity labels were reached');
    ok(seen.hardReject.size >= 3, '9.11 at least three distinct hard-reject outcomes were reached (' + seen.hardReject.size + ')');
    note('branch coverage — days ' + seen.days.size + ' distinct · liqLabel ' + Array.from(seen.liqLabel).sort().join('/')
      + ' · premiumLabel ' + Array.from(seen.premiumLabel).sort().join('/') + ' · hardReject ' + seen.hardReject.size + ' distinct');
  }
} else {
  note('base blob unreachable — parity sweep skipped, sha256 identity stands');
  ok(true, '9.4 parity skipped: base blob unavailable in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9B. PANEL BEHAVIOURAL PARITY — BASE vs HEAD, by transcript');
//
// §9 compares return values, which works for pure functions. The panel returns
// nothing interesting: what it DOES is call collaborators. So each side is run
// against the same recording collaborators and the resulting TRANSCRIPT is
// compared — every setPanel markup string, every setAS, every timer, every DOM
// lookup, every listener, every eicScreenTicker result, in order.
//
// Nothing here emulates a browser and nothing re-implements the functions. The
// REAL runEICPanel/eicAnalyzeAll are evaluated from the BASE monolith and from
// the shipped module, and the REAL eicScreenTicker from the PR 1 module is used
// by both sides, so a difference can only come from the relocation itself.
//
// The clock is pinned. setTimeout fires its callback immediately and records the
// delay, and CATCHES what the callback throws — which is how a browser behaves
// (a timer callback's error does not unwind its scheduler) and is what lets the
// inherited eicEnrichLegs ReferenceError be OBSERVED on both sides rather than
// aborting the run.
// ═════════════════════════════════════════════════════════════════════════════
let pxPanel = 0, pxAnalyze = 0, pxDiffs = 0;
const PANEL_BRANCHES = { panel: new Set(), analyze: new Set() };

if (BASE_PR1_MONO) {
  const baseDecl = (nm) => {
    const d = scanTopLevelDeclarations(BASE_PR1_MONO).filter((x) => x.name === nm)[0];
    return BASE_PR1_MONO.slice(d.start, d.end + 1);
  };
  const headDecl = (nm) => {
    const d = PANEL_DECLS.filter((x) => x.name === nm)[0];
    return PANEL_SRC.slice(d.start, d.end + 1);
  };
  const BASE_BODY = baseDecl('runEICPanel') + '\n' + baseDecl('eicAnalyzeAll');
  const HEAD_BODY = headDecl('runEICPanel') + '\n' + headDecl('eicAnalyzeAll');
  eq(BASE_BODY, HEAD_BODY, '9B.1 the two declarations are byte-identical between BASE and HEAD before anything runs');

  // The real screening rules, shipped by PR 1, are used by BOTH sides.
  const RULES_SRC = MODULE_SRC;

  function makeCtx(state, opts) {
    const T = [];
    const rec = (...a) => T.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' | '));
    const S = new Proxy(Object.assign({}, state), {
      set(t, k, v) { rec('S.set', String(k), v); t[k] = v; return true; },
      get(t, k) { return t[k]; },
    });
    const el = (id) => ({
      _id: id,
      set disabled(v) { rec('el.disabled', id, v); },
      set textContent(v) { rec('el.textContent', id, v); },
      set innerHTML(v) { rec('el.innerHTML', id, v); },
      get innerHTML() { return ''; },
      // Registering is not enough: the work order requires the eicAnalyzeTicker
      // callback to be OBSERVED. The handler is invoked with `this` bound to the
      // element, exactly as a click would, so its body runs on both sides.
      addEventListener(ev, fn) {
        rec('el.addEventListener', id, ev);
        try { fn.call(this); } catch (e) { rec('handler.threw', String(e && e.name), String(e && e.message)); }
      },
      getAttribute(a) { rec('el.getAttribute', id, a); return id + ':' + a; },
    });
    const ctx = {
      S,
      setAS: (...a) => rec('setAS', ...a),
      setPanel: (...a) => rec('setPanel', ...a),
      appendSysMsg: (...a) => rec('appendSysMsg', ...a),
      logEv: (...a) => rec('logEv', ...a),
      eicAnalyzeTicker: (...a) => rec('eicAnalyzeTicker', ...a),
      callAgent: function (agent, context) {
        rec('callAgent', agent, context);
        if (opts && opts.agentThrows) return Promise.reject(new Error('agent exploded'));
        return Promise.resolve((opts && opts.agentReply) || 'NEUTRO baseline');
      },
      setTimeout: function (fn, ms) {
        rec('setTimeout', String(ms));
        try { fn(); } catch (e) { rec('timer.threw', String(e && e.name), String(e && e.message)); }
        return 0;
      },
      document: {
        getElementById(id) { rec('document.getElementById', id); return (opts && opts.noDom) ? null : el(id); },
        querySelectorAll(sel) {
          rec('document.querySelectorAll', sel);
          return [el('cand0'), el('cand1')];
        },
      },
      console: { log() {}, warn() {}, error() {} },
      Math, JSON, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt, RegExp, Error, Promise,
    };
    class FixedDate extends Date {
      constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
      static now() { return FIXED_NOW; }
    }
    ctx.Date = FixedDate;
    return { ctx, T };
  }

  function runSide(body, state, opts, invoke) {
    const { ctx, T } = makeCtx(state, opts);
    vm.createContext(ctx);
    try { vm.runInContext(RULES_SRC + '\n' + body, ctx, { filename: 'parity.js', timeout: 10000 }); }
    catch (e) { T.push('EVAL_THREW | ' + String(e && e.message)); return Promise.resolve(T); }
    return invoke(ctx, T);
  }

  function comparePanel(label, state, opts) {
    pxPanel++; PANEL_BRANCHES.panel.add(label);
    const inv = (ctx, T) => {
      try { const r = ctx.runEICPanel(); T.push('returned | ' + JSON.stringify(r === undefined ? null : r)); }
      catch (e) { T.push('THREW | ' + String(e && e.name) + ' | ' + String(e && e.message)); }
      return Promise.resolve(T);
    };
    return Promise.all([runSide(BASE_BODY, state, opts, inv), runSide(HEAD_BODY, state, opts, inv)])
      .then(([a, b]) => {
        const sa = a.join('\n'), sb = b.join('\n');
        if (sa !== sb) {
          pxDiffs++;
          const i = [...sa].findIndex((c, k) => c !== sb[k]);
          ok(false, '9B.x runEICPanel [' + label + '] BASE≠HEAD near offset ' + i
            + ': ' + JSON.stringify(sa.slice(Math.max(0, i - 40), i + 40))
            + ' vs ' + JSON.stringify(sb.slice(Math.max(0, i - 40), i + 40)));
        }
        return a;
      });
  }

  function compareAnalyze(label, state, opts) {
    pxAnalyze++; PANEL_BRANCHES.analyze.add(label);
    const inv = (ctx, T) => ctx.eicAnalyzeAll()
      .then((r) => { T.push('resolved | ' + JSON.stringify(r === undefined ? null : r)); return T; })
      .catch((e) => { T.push('rejected | ' + String(e && e.message)); return T; });
    return Promise.all([runSide(BASE_BODY, state, opts, inv), runSide(HEAD_BODY, state, opts, inv)])
      .then(([a, b]) => {
        const sa = a.join('\n'), sb = b.join('\n');
        if (sa !== sb) {
          pxDiffs++;
          ok(false, '9B.y eicAnalyzeAll [' + label + '] BASE≠HEAD');
        }
        return a;
      });
  }

  // ── source-derived fixtures ────────────────────────────────────────────────
  const iso = (days) => new Date(FIXED_NOW + days * 86400000).toISOString();
  const tk = (o) => Object.assign({
    ticker: 'AAPL', name: 'Apple', price: 190, ivRank: 55, iv: 0.35, iv30: 0.30,
    volume: 3000000, liq: 1, bid: 189.98, ask: 190.02, signal: 'BUY', rsi: 60, beta: 1.1,
    nextEarnings: iso(7),
  }, o);
  const baseState = (o) => Object.assign({
    scanData: [], eicShowAll: false, ttConnected: false, lastScan: null,
    marketContextRisk: null, marketContextTimestamp: null, marketContextValidMinutes: 240,
  }, o);

  const withIVR = [tk({ ticker: 'AAA', ivRank: 70 }), tk({ ticker: 'BBB', ivRank: 40 })];
  const noIVR = [tk({ ticker: 'CCC', ivRank: null }), tk({ ticker: 'DDD', ivRank: 10 })];
  const weak = [tk({ ticker: 'EEE', ivRank: 60, price: 5, volume: 1000, liq: 5, bid: 4, ask: 6 })];

  // A GUARD-shaped view of the parity harness: body source in, named violations
  // out. The BASE transcript is computed once from the real BASE declarations;
  // any body whose transcript differs is rejected. §12 drives mutants through
  // this exact function, so "parity holds" becomes falsifiable.
  // A guard that ran ONE fixture would be satisfied by any mutation outside that
  // one path — a threshold nothing crosses, a label nothing renders. So the
  // guard sweeps a set of states chosen to straddle the thresholds the source
  // actually contains, and compares the CONCATENATED transcript.
  const GUARD_STATES = [
    baseState({ scanData: withIVR.concat(weak), ttConnected: true, eicShowAll: false,
      marketContextRisk: 'HIGH', marketContextTimestamp: FIXED_NOW - 60000, lastScan: FIXED_NOW - 2000 }),
    baseState({ scanData: withIVR, eicShowAll: undefined }),                    // the default-assignment line
    baseState({ scanData: [tk({ ticker: 'W25', nextEarnings: iso(25) })] }),    // straddles the 21-day window
    baseState({ scanData: [tk({ ticker: 'I27', ivRank: 27 })] }),               // straddles the IVR-25 tier
    baseState({ scanData: [95, 90, 85, 80, 75, 70, 65, 60].map((v, i) => tk({ ticker: 'C' + i, ivRank: v })) }), // straddles the 6-cap
    baseState({ scanData: [tk({ nextEarnings: iso(60) })] }),                   // the no-candidates label
    // marketContextValidMinutes is NULL here on purpose: the source reads
    // `S.marketContextValidMinutes||240`, so the 240 default is only reachable
    // when the field is absent. With it set, the default is dead code and a
    // mutation to it would be unobservable.
    baseState({ scanData: withIVR, marketContextRisk: 'HIGH',
      marketContextValidMinutes: null, marketContextTimestamp: FIXED_NOW - 60 * 60000 }),
    baseState({ scanData: [tk({ ticker: 'AAA', ivRank: 70 })], lastScan: FIXED_NOW - 2000 }), // the recent-scan notice
    baseState({ scanData: withIVR.concat(weak), eicShowAll: true }),            // the show-all view
  ];
  function transcriptOf(body, state) {
    const { ctx, T } = makeCtx(state, {});
    vm.createContext(ctx);
    try { vm.runInContext(RULES_SRC + '\n' + body, ctx, { filename: 'guard.js', timeout: 10000 }); }
    catch (e) { return 'EVAL_THREW | ' + String(e && e.message); }
    try { ctx.runEICPanel(); T.push('returned'); } catch (e) { T.push('THREW | ' + String(e && e.name)); }
    return T.join('\n');
  }
  const sweep = (body) => GUARD_STATES.map((st, i) => '### fixture ' + i + '\n' + transcriptOf(body, st)).join('\n');
  const BASE_TRANSCRIPT = sweep(BASE_BODY);
  PANEL_TRANSCRIPT_GUARD = function (body) {
    const violations = [];
    let threw = null;
    try {
      const got = sweep(body);
      if (got !== BASE_TRANSCRIPT) {
        const i = [...got].findIndex((c, k) => c !== BASE_TRANSCRIPT[k]);
        violations.push('PARITY: transcript diverges from BASE at offset ' + i
          + ' — ' + JSON.stringify(String(got).slice(Math.max(0, i - 30), i + 30)));
      }
    } catch (e) { threw = String(e && e.message); violations.push('PARITY_GUARD_FAILED: ' + threw); }
    return { violations, threw };
  };
  ok(BASE_TRANSCRIPT.length > 500, '9B.0a the BASE transcript is substantial (' + BASE_TRANSCRIPT.length + ' chars)');
  deepEq(PANEL_TRANSCRIPT_GUARD(HEAD_BODY).violations, [], '9B.0b the transcript guard is CLEAN on the real shipped panel');

  const PANEL_FIXTURES = [
    ['empty S.scanData', baseState({ scanData: [] }), {}],
    ['no earnings candidates', baseState({ scanData: [tk({ nextEarnings: null }), tk({ nextEarnings: iso(60) })] }), {}],
    ['candidates with IVR', baseState({ scanData: withIVR }), {}],
    ['candidates without qualifying IVR', baseState({ scanData: noIVR }), {}],
    ['passed + rejected', baseState({ scanData: withIVR.concat(weak) }), {}],
    ['eicShowAll false', baseState({ scanData: withIVR.concat(weak), eicShowAll: false }), {}],
    ['eicShowAll true', baseState({ scanData: withIVR.concat(weak), eicShowAll: true }), {}],
    ['eicShowAll undefined → defaulted', baseState({ scanData: withIVR, eicShowAll: undefined }), {}],
    ['marketContextRisk HIGH fresh', baseState({ scanData: withIVR, marketContextRisk: 'HIGH', marketContextTimestamp: FIXED_NOW - 60000 }), {}],
    ['marketContextRisk CRITICAL stale', baseState({ scanData: withIVR, marketContextRisk: 'CRITICAL', marketContextTimestamp: FIXED_NOW - 999 * 60000 }), {}],
    ['marketContextRisk NONE', baseState({ scanData: withIVR, marketContextRisk: 'NONE' }), {}],
    ['recent scan notice', baseState({ scanData: [tk({ ticker: 'AAA', ivRank: 70 })], lastScan: FIXED_NOW - 2000 }), {}],
    ['ttConnected false', baseState({ scanData: withIVR, ttConnected: false }), {}],
    ['ttConnected true with passed → eicEnrichLegs path', baseState({ scanData: withIVR, ttConnected: true }), {}],
    ['ttConnected true, no passed', baseState({ scanData: weak, ttConnected: true }), {}],
    ['boundary days 2 and 21', baseState({ scanData: [tk({ ticker: 'AAA', nextEarnings: iso(2) }), tk({ ticker: 'BBB', nextEarnings: iso(21) })] }), {}],
    ['outside window days 1 and 22', baseState({ scanData: [tk({ ticker: 'AAA', nextEarnings: iso(1) }), tk({ ticker: 'BBB', nextEarnings: iso(22) })] }), {}],
  ];

  const ANALYZE_FIXTURES = [
    ['zero candidates', baseState({ scanData: [] }), {}],
    ['one candidate', baseState({ scanData: [tk({ ticker: 'AAA', ivRank: 70 })] }), {}],
    ['multiple candidates', baseState({ scanData: withIVR }), {}],
    ['verdict APPROVATO', baseState({ scanData: withIVR }), { agentReply: 'Esito: APPROVATO — ok' }],
    ['verdict SCARTATO', baseState({ scanData: withIVR }), { agentReply: 'Esito: SCARTATO — no' }],
    ['verdict NEUTRO', baseState({ scanData: withIVR }), { agentReply: 'Nessun verdetto esplicito' }],
    ['callAgent rejection', baseState({ scanData: withIVR }), { agentThrows: true }],
    ['six-candidate cap', baseState({ scanData: [90, 85, 80, 75, 70, 65, 60, 55].map((v, i) => tk({ ticker: 'T' + i, ivRank: v })) }), {}],
    ['ordering by ivRank', baseState({ scanData: [tk({ ticker: 'LOW', ivRank: 30 }), tk({ ticker: 'HIGH', ivRank: 90 })] }), {}],
    ['no DOM elements', baseState({ scanData: withIVR }), { noDom: true }],
    ['markdown bold formatting', baseState({ scanData: withIVR }), { agentReply: '**APPROVATO**\nriga due' }],
  ];

  const jobs = PANEL_FIXTURES.map(([l, st, o]) => () => comparePanel(l, st, o))
    .concat(ANALYZE_FIXTURES.map(([l, st, o]) => () => compareAnalyze(l, st, o)));

  // Sequential, so a failure names the fixture that produced it.
  let chain = Promise.resolve();
  const collected = {};
  for (const [i, j] of jobs.entries()) chain = chain.then(() => j().then((T) => { collected[i] = T; }));

  PARITY_TAIL = chain.then(() => {
    eq(pxDiffs, 0, '9B.2 every panel parity fixture produced an IDENTICAL transcript on BASE and HEAD');
    ok(pxPanel >= 15, '9B.3 runEICPanel parity fixtures: ' + pxPanel);
    ok(pxAnalyze >= 10, '9B.4 eicAnalyzeAll parity fixtures: ' + pxAnalyze);

    // The fixtures must actually REACH the branches they name. A transcript
    // sweep that never rendered a card would compare nothing and still be green.
    const all = Object.values(collected).map((T) => T.join('\n')).join('\n');
    ok(all.indexOf('NESSUN DATO') >= 0, '9B.5 the empty-scanData branch was reached');
    ok(all.indexOf('NESSUN CANDIDATO EIC') >= 0, '9B.6 the no-candidates branch was reached');
    ok(all.indexOf('BINARY EVENT RISK') >= 0, '9B.7 the macro-warning branch was reached');
    ok(all.indexOf('STALE') >= 0, '9B.8 …including the stale-context sub-branch');
    ok(all.indexOf('ESCLUSI DALLO SCREENING') >= 0, '9B.9 the rejected-separator branch was reached');
    ok(all.indexOf('Scan recente') >= 0, '9B.10 the recent-scan notice branch was reached');
    ok(all.indexOf('ANALIZZA TOP') >= 0, '9B.11 the analyze-button branch was reached');
    ok(all.indexOf('Nessun candidato supera lo screening') >= 0, '9B.12 …and its no-passed alternative');
    ok(all.indexOf('Mostra tutti') >= 0 && all.indexOf('Solo filtrati') >= 0,
      '9B.13 both eicShowAll toggle states were rendered');
    ok(all.indexOf('document.querySelectorAll | .eic-cand') >= 0, '9B.14 the click-handler timer ran and queried the cards');
    ok(all.indexOf('el.addEventListener') >= 0, '9B.15 …and registered listeners on them');
    ok(all.indexOf('eicAnalyzeTicker') >= 0, '9B.16 …whose handler calls eicAnalyzeTicker');
    ok(all.indexOf('setTimeout | 50') >= 0, '9B.17 the 50ms handler timer was registered');
    ok(all.indexOf('setTimeout | 200') >= 0, '9B.18 the 200ms enrichment timer was registered');
    ok(all.indexOf('timer.threw | ReferenceError') >= 0,
      '9B.19 the inherited eicEnrichLegs path threw a ReferenceError — IDENTICALLY on BASE and HEAD, and is still not repaired');
    ok(all.indexOf('onclick="runEICPanel()"') >= 0, '9B.20 the emitted markup contains the self-referential onclick handlers');
    ok(all.indexOf('onclick="eicAnalyzeAll()"') >= 0, '9B.21 …and the analyse-all handler');
    ok(all.indexOf('APPROVATO: ') >= 0, '9B.22 the batch summary was rendered');
    ok(all.indexOf('callAgent | earnings-ic') >= 0, '9B.23 callAgent was invoked with the earnings-ic agent and a real context');
    ok(all.indexOf('agent exploded') >= 0, '9B.24 the callAgent rejection path was exercised');
    ok(all.indexOf('appendSysMsg') >= 0 && all.indexOf('logEv') >= 0, '9B.25 the completion notifications were emitted');
    ok(all.indexOf('el.disabled | eicAnalyzeAll | true') >= 0, '9B.26 the analyse button was disabled and restored');
    ok(/RIEPILOGO EIC \(6\)/.test(all), '9B.27 the six-candidate cap held — the batch never exceeded six');
    note('panel parity — runEICPanel ' + pxPanel + ' · eicAnalyzeAll ' + pxAnalyze
      + ' = ' + (pxPanel + pxAnalyze) + ' fixtures · differences ' + pxDiffs);
  });
} else {
  ok(true, '9B.2 panel parity skipped: the post-PR1 base blob is unavailable in this checkout');
  PARITY_TAIL = Promise.resolve();
}

// ═════════════════════════════════════════════════════════════════════════════
section('9C. CROSS-MODULE CALL-TIME RESOLUTION — the whole app, in load order');
//
// §9B evaluates the two declarations in isolation. That proves the bytes behave
// identically; it does NOT prove that, in the real document, the panel still
// finds its siblings. runEICPanel now lives in js/ui/eic-panel.js and calls
// eicScreenTicker — which PR 1 moved into a DIFFERENT file — and
// eicAnalyzeTicker, which is still inline in the monolith loaded AFTER it.
//
// So the whole application is evaluated here in its real classic-script order,
// on both sides, and the panel is then invoked. Classic scripts share one global
// object, so the question is not "was it defined first?" but "is it defined by
// the time the call happens?" — and that is what invoking it proves.
//
// BASE is reconstructed exactly: the same local scripts minus js/ui/eic-panel.js,
// with the monolith replaced by the BASE monolith that still carries the two
// declarations inline. This PR changes nothing else, which §10 proves separately.
// ═════════════════════════════════════════════════════════════════════════════
let XMOD_DIFFS = 0;
if (BASE_PR1_MONO) {
  const permissiveFactory = () => {
    const p = new Proxy(function () {}, {
      get(t, k) { if (k === Symbol.toPrimitive || k === 'toString' || k === Symbol.toStringTag) return () => ''; return p; },
      set() { return true; }, apply() { return p; }, construct() { return p; }, has() { return true; },
    });
    return p;
  };
  function makeAppCtx() {
    const permissive = permissiveFactory();
    const ctx = {
      console: { log() {}, warn() {}, error() {} },
      Math, JSON, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt,
      RegExp, Error, Promise, Set, Map,
      document: permissive, window: permissive, localStorage: permissive,
      sessionStorage: permissive, navigator: permissive, location: permissive,
      setTimeout() { return 0; }, setInterval() { return 0; }, clearTimeout() {}, clearInterval() {},
      fetch() { return Promise.resolve(permissive); }, WebSocket: function () { return permissive; },
      requestAnimationFrame() { return 0; }, alert() {},
    };
    class FixedDate extends Date {
      constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
      static now() { return FIXED_NOW; }
    }
    ctx.Date = FixedDate;
    vm.createContext(ctx);
    return ctx;
  }

  const HEAD_PARTS = ORDERED.filter((s) => s.isAppJs && s.code != null)
    .map((s) => ({ label: String(s.src || '(monolith)'), code: s.code }));
  const BASE_PARTS = HEAD_PARTS
    .filter((p) => p.label !== './js/ui/eic-panel.js' && p.label !== G.TICKER_ANALYSIS_SRC_ATTR)
    .map((p) => (p.label === '(monolith)' ? { label: p.label, code: BASE_PR1_MONO } : p));
  eq(HEAD_PARTS.length - BASE_PARTS.length, 2,
    '9C.1 BASE loads exactly two scripts fewer — neither the panel nor the ticker-analysis module existed after PR 1');
  ok(HEAD_PARTS.some((p) => p.label === './js/ui/eic-panel.js'), '9C.2 …and HEAD loads the panel');
  ok(HEAD_PARTS.some((p) => p.label === G.TICKER_ANALYSIS_SRC_ATTR), '9C.2b …and the ticker-analysis module');

  function evalApp(parts) {
    const ctx = makeAppCtx();
    const failures = [];
    for (const p of parts) {
      try { vm.runInContext(p.code, ctx, { filename: p.label, timeout: 30000 }); }
      catch (e) { failures.push(p.label + ': ' + String(e && e.message)); }
    }
    return { ctx, failures };
  }

  const HEAD_APP = evalApp(HEAD_PARTS);
  const BASE_APP = evalApp(BASE_PARTS);
  deepEq(HEAD_APP.failures, [], '9C.3 every script in HEAD load order evaluated without error');
  deepEq(BASE_APP.failures, [], '9C.4 …and every script in BASE load order too');

  const SIBLINGS = ['eicScreenTicker', 'eicAnalyzeTicker', 'eicBuildLiveContext', 'eicLiqFromLegs',
    'setAS', 'setPanel', 'callAgent', 'appendSysMsg', 'logEv'];
  for (const n of ['runEICPanel', 'eicAnalyzeAll'].concat(SIBLINGS)) {
    eq(typeof HEAD_APP.ctx[n], 'function', '9C.5 HEAD resolves ' + n + ' as a global function after full load');
    eq(typeof BASE_APP.ctx[n], 'function', '9C.6 BASE resolves ' + n + ' as a global function after full load');
  }

  // WHERE each binding came from. This is the part that actually proves the
  // cross-module story: on HEAD the global must be the text of the EXTRACTED
  // file, not an inline copy left behind.
  {
    const panelDeclText = (nm) => {
      const d = PANEL_DECLS.filter((x) => x.name === nm)[0];
      return PANEL_SRC.slice(d.start, d.end + 1);
    };
    const rulesDeclText = (nm) => {
      const d = MODULE_DECLS.filter((x) => x.name === nm)[0];
      return MODULE_SRC.slice(d.start, d.end + 1);
    };
    eq(String(HEAD_APP.ctx.runEICPanel), panelDeclText('runEICPanel'),
      '9C.7 the global runEICPanel IS the text shipped in js/ui/eic-panel.js');
    eq(String(HEAD_APP.ctx.eicAnalyzeAll), panelDeclText('eicAnalyzeAll'),
      '9C.8 …and so is eicAnalyzeAll');
    eq(String(HEAD_APP.ctx.eicScreenTicker), rulesDeclText('eicScreenTicker'),
      '9C.9 the global eicScreenTicker IS the text shipped in js/services/eic-screening-rules.js — resolved ACROSS modules');
    eq(String(HEAD_APP.ctx.runEICPanel), String(BASE_APP.ctx.runEICPanel),
      '9C.10 and it is byte-identical to the function BASE bound from the monolith');
    eq(String(HEAD_APP.ctx.eicAnalyzeAll), String(BASE_APP.ctx.eicAnalyzeAll), '9C.11 …likewise eicAnalyzeAll');
  }

  // INVOKE, under recording collaborators installed AFTER full evaluation, so
  // the call-time lookup is the real one the application would perform.
  function drive(app, opts) {
    const T = [];
    const rec = (...a) => T.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' | '));
    const c = app.ctx;
    const realScreen = c.eicScreenTicker;
    c.eicScreenTicker = function (d) { const r = realScreen.apply(this, arguments); rec('eicScreenTicker', d.ticker, r ? r.screenScore : null); return r; };
    c.eicAnalyzeTicker = function (t) { rec('eicAnalyzeTicker', String(t)); };
    c.setAS = (...a) => rec('setAS', ...a);
    c.setPanel = (...a) => rec('setPanel', ...a);
    c.appendSysMsg = (...a) => rec('appendSysMsg', ...a);
    c.logEv = (...a) => rec('logEv', ...a);
    c.setTimeout = function (fn, ms) { rec('setTimeout', String(ms)); try { fn(); } catch (e) { rec('timer.threw', String(e && e.name)); } return 0; };
    const el = (id) => ({
      getAttribute(a) { return id + ':' + a; },
      addEventListener(ev, fn) { rec('addEventListener', id, ev); try { fn.call(this); } catch (e) { rec('handler.threw', String(e && e.name)); } },
      set disabled(v) { rec('disabled', id, v); }, set textContent(v) { rec('textContent', id, v); },
      set innerHTML(v) { rec('innerHTML', id, String(v).length); }, get innerHTML() { return ''; },
    });
    c.document = { getElementById: (id) => { rec('getElementById', id); return el(id); },
      querySelectorAll: (s) => { rec('querySelectorAll', s); return [el('c0')]; } };
    // `S` is declared `const` at the top level of the monolith, so it lives in
    // the context's global LEXICAL scope, not on the global object: assigning
    // `c.S` from outside would create a shadow property the panel never reads.
    // The real binding is reached through the context and MUTATED in place —
    // which is also exactly how the running application shares that state.
    const appS = vm.runInContext('S', c);
    Object.assign(appS, {
      scanData: [], eicShowAll: false, ttConnected: false, lastScan: null,
      marketContextRisk: null, marketContextTimestamp: null, marketContextValidMinutes: 240,
    }, opts.S);
    c.callAgent = function (a, ctxStr) { rec('callAgent', a, String(ctxStr).length); return Promise.resolve('APPROVATO ok'); };
    try { c.runEICPanel(); rec('runEICPanel returned'); } catch (e) { rec('runEICPanel THREW', String(e && e.name), String(e && e.message)); }
    return c.eicAnalyzeAll().then(() => { rec('eicAnalyzeAll resolved'); return T; })
      .catch((e) => { rec('eicAnalyzeAll rejected', String(e && e.message)); return T; });
  }

  const isoX = (days) => new Date(FIXED_NOW + days * 86400000).toISOString();
  const scan = [
    { ticker: 'AAA', name: 'Alpha', price: 190, ivRank: 70, iv: 0.35, volume: 3000000, liq: 1, bid: 189.98, ask: 190.02, rsi: 60, beta: 1.1, nextEarnings: isoX(7) },
    { ticker: 'BBB', name: 'Beta', price: 55, ivRank: 40, iv: 0.28, volume: 900000, liq: 3, bid: 54.9, ask: 55.1, rsi: 52, beta: 0.9, nextEarnings: isoX(12) },
  ];
  const XFIX = [
    ['screening + batch, ttConnected', { S: { scanData: scan, ttConnected: true } }],
    ['show-all view', { S: { scanData: scan, eicShowAll: true } }],
    ['empty scan', { S: { scanData: [] } }],
  ];

  PARITY_TAIL = PARITY_TAIL.then(() => {
    let chain = Promise.resolve();
    const seen = [];
    for (const [label, opts] of XFIX) {
      chain = chain.then(() => Promise.all([drive(evalApp(BASE_PARTS), opts), drive(evalApp(HEAD_PARTS), opts)])
        .then(([a, b]) => {
          const sa = a.join('\n'), sb = b.join('\n');
          if (sa !== sb) { XMOD_DIFFS++; ok(false, '9C.x cross-module transcript differs for [' + label + ']'); }
          seen.push(sa);
        }));
    }
    return chain.then(() => {
      eq(XMOD_DIFFS, 0, '9C.12 invoking the panel through the FULLY LOADED application gives identical transcripts on BASE and HEAD');
      const all = seen.join('\n');
      ok(all.indexOf('eicScreenTicker | AAA') >= 0,
        '9C.13 eicScreenTicker resolved and ran at CALL TIME, across the module boundary PR 1 created');
      ok(all.indexOf('eicAnalyzeTicker | c0:data-ticker') >= 0,
        '9C.14 eicAnalyzeTicker — still inline in the monolith, loaded AFTER the panel — resolved at CALL TIME');
      ok(all.indexOf('timer.threw | ReferenceError') >= 0,
        '9C.15 the eicEnrichLegs path still throws in the fully loaded application, on BASE and HEAD alike');
      ok(all.indexOf('callAgent') >= 0, '9C.16 the batch path reached callAgent through the loaded application');
      note('cross-module — ' + XFIX.length + ' fixtures through ' + HEAD_PARTS.length
        + ' ordered scripts · differences ' + XMOD_DIFFS);
    });
  });
} else {
  ok(true, '9C.12 cross-module proof skipped: the post-PR1 base blob is unavailable in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9E. PR 3 CROSS-MODULE RESOLUTION — the whole app, in real load order');
//
// §9D evaluates eicAnalyzeTicker in isolation. That proves the bytes behave
// identically; it does NOT prove that, in the real document, the boundaries this
// PR creates actually resolve. Two of them are new and they point in OPPOSITE
// directions:
//
//   BACKWARD  js/ui/eic-panel.js loads BEFORE this module and calls
//             eicAnalyzeTicker from a click handler.
//   FORWARD   eicAnalyzeTicker calls eicRunDXLink, which is still declared in
//             the monolith — a script that loads AFTER it.
//
// Neither is a load-order problem, because both are resolved when the user
// clicks rather than while scripts evaluate. But "should be fine" is not a
// proof, so the whole application is evaluated here in its real classic-script
// order, on both sides, and then driven.
//
// The BASE side is the POST-PR2 application: the same scripts minus this
// module, with the monolith replaced by the post-PR2 monolith that still
// carries the declaration inline.
// ═════════════════════════════════════════════════════════════════════════════
let XTA_DIFFS = 0;
if (BASE_PR2_MONO) {
  const permissive3 = () => {
    const p = new Proxy(function () {}, {
      get(t, k) { if (k === Symbol.toPrimitive || k === 'toString' || k === Symbol.toStringTag) return () => ''; return p; },
      set() { return true; }, apply() { return p; }, construct() { return p; }, has() { return true; },
    });
    return p;
  };
  function makeAppCtx3() {
    const permissive = permissive3();
    const ctx = {
      console: { log() {}, warn() {}, error() {} },
      Math, JSON, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt,
      RegExp, Error, Promise, Set, Map,
      document: permissive, window: permissive, localStorage: permissive,
      sessionStorage: permissive, navigator: permissive, location: permissive,
      setTimeout() { return 0; }, setInterval() { return 0; }, clearTimeout() {}, clearInterval() {},
      fetch() { return Promise.resolve(permissive); }, WebSocket: function () { return permissive; },
      requestAnimationFrame() { return 0; }, alert() {},
    };
    class FixedDate extends Date {
      constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
      static now() { return FIXED_NOW; }
    }
    ctx.Date = FixedDate;
    vm.createContext(ctx);
    return ctx;
  }
  const HEAD3 = ORDERED.filter((s) => s.isAppJs && s.code != null)
    .map((s) => ({ label: String(s.src || '(monolith)'),
      // This section proves PR 3's historical relocation. Project the one later
      // PR 4 functional repair away so it cannot masquerade as a PR 3 delta.
      code: String(s.src || '') === G.LIVE_DEEP_DIVE_SRC_ATTR ? LDD_EXTRACTION_SRC : s.code }));
  const BASE3 = HEAD3
    .filter((p) => p.label !== G.TICKER_ANALYSIS_SRC_ATTR)
    .map((p) => (p.label === '(monolith)' ? { label: p.label, code: BASE_PR2_MONO } : p));
  eq(HEAD3.length - BASE3.length, 1,
    '9E.1 BASE loads exactly one script fewer — the ticker-analysis module did not exist after PR 2');

  function evalApp3(parts) {
    const ctx = makeAppCtx3();
    const failures = [];
    for (const p of parts) {
      try { vm.runInContext(p.code, ctx, { filename: p.label, timeout: 30000 }); }
      catch (e) { failures.push(p.label + ': ' + String(e && e.message)); }
    }
    return { ctx, failures };
  }
  const HEAD_APP3 = evalApp3(HEAD3);
  const BASE_APP3 = evalApp3(BASE3);
  deepEq(HEAD_APP3.failures, [], '9E.2 every script in HEAD load order evaluated without error');
  deepEq(BASE_APP3.failures, [], '9E.3 …and every script in BASE load order too');

  // WHERE each binding came from, after the FULL load. This is what actually
  // proves the relocation: on HEAD the global must be the text of the extracted
  // file, and the PR 4 names must still be the monolith's.
  {
    const taText = TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1);
    const rulesText = (nm) => { const d = MODULE_DECLS.filter((x) => x.name === nm)[0]; return MODULE_SRC.slice(d.start, d.end + 1); };
    const panelText = (nm) => { const d = PANEL_DECLS.filter((x) => x.name === nm)[0]; return PANEL_SRC.slice(d.start, d.end + 1); };
    eq(typeof HEAD_APP3.ctx.eicAnalyzeTicker, 'function', '9E.4 HEAD resolves eicAnalyzeTicker as a global function');
    eq(String(HEAD_APP3.ctx.eicAnalyzeTicker), taText,
      '9E.5 …and the global IS the text shipped in js/ui/eic-ticker-analysis-panel.js, not an inline copy left behind');
    eq(String(HEAD_APP3.ctx.eicAnalyzeTicker), String(BASE_APP3.ctx.eicAnalyzeTicker),
      '9E.6 …byte-identical to the function BASE bound from the monolith');
    eq(String(HEAD_APP3.ctx.eicScreenTicker), rulesText('eicScreenTicker'),
      '9E.7 eicScreenTicker still comes from js/services/eic-screening-rules.js');
    eq(String(HEAD_APP3.ctx.runEICPanel), panelText('runEICPanel'), '9E.8 runEICPanel still comes from js/ui/eic-panel.js');
    eq(String(HEAD_APP3.ctx.eicAnalyzeAll), panelText('eicAnalyzeAll'), '9E.9 …and so does eicAnalyzeAll');
    // The PR 4 names. This assertion INVERTED when PR 4 shipped, and the
    // inversion is the point: while PR 4 was pending they had to resolve out of
    // the monolith, and now they must resolve out of the module instead. BASE
    // here is the post-PR2 application, where they were still inline — so
    // comparing the two sides proves the bytes are the same while the SOURCE
    // changed, which is exactly what a relocation is.
    const monoCode = ORDERED[MONO_SLOT].code;
    for (const nm of ['eicFetchLegs', 'eicDXLinkDeepDive', 'eicRunDXLink']) {
      eq(typeof HEAD_APP3.ctx[nm], 'function', '9E.10 ' + nm + ' resolves as a global function');
      ok(monoCode.indexOf(String(HEAD_APP3.ctx[nm])) < 0,
        '9E.11 …and its text is NO LONGER found inside the inline monolith — PR 4 has shipped');
      ok(LDD_EXTRACTION_SRC.indexOf(String(HEAD_APP3.ctx[nm])) >= 0,
        '9E.11b …it is found in the historical PR 4 projection of js/ui/eic-live-deep-dive.js instead');
      eq(String(HEAD_APP3.ctx[nm]), String(BASE_APP3.ctx[nm]),
        '9E.12 …byte-identical to what BASE bound from the monolith — the bytes did not change, only their file did');
    }
  }

  // DRIVE IT. Collaborators are installed AFTER full evaluation, so the lookups
  // the application performs are the real ones.
  function drive3(app, opts) {
    const T = [];
    const rec = (...a) => T.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' | '));
    const c = app.ctx;
    // Record the FORWARD boundary without replacing it first: capture the real
    // binding, then wrap it, so the wrapper proves the real one was reachable.
    const realDx = c.eicRunDXLink;
    c.eicRunDXLink = function (t, e) { rec('eicRunDXLink', String(t), String(e), 'realWasFunction=' + (typeof realDx === 'function')); };
    const realScreen = c.eicScreenTicker;
    c.eicScreenTicker = function (d) { const r = realScreen.apply(this, arguments); rec('eicScreenTicker', d.ticker, r ? r.screenScore : null); return r; };
    c.setAS = (...a) => rec('setAS', ...a);
    c.showToast = (...a) => rec('showToast', ...a);
    c.appendSysMsg = (...a) => rec('appendSysMsg', ...a);
    c.appendAgentMsg = (...a) => rec('appendAgentMsg', ...a);
    c.logEv = (...a) => rec('logEv', ...a);
    c.callAgent = function (a, ctxStr) { rec('callAgent', a, 'ctxChars=' + String(ctxStr).length); return Promise.resolve('APPROVATO ok'); };
    // querySelector reflects what was actually WRITTEN, as a browser would:
    // returning a button the render did not emit would let the ttConnected=false
    // fixture exercise the DXLink path and quietly stop being a distinct branch.
    const el = (id) => {
      let last = '';
      return {
        getAttribute(a) { return id + ':' + a; },
        set innerHTML(v) { last = String(v); rec('innerHTML', id, last.length); }, get innerHTML() { return last; },
        querySelector(sel) {
          const hit = last.indexOf('eic-dxlink-btn') >= 0;
          rec('querySelector', sel, hit ? 'found' : 'null');
          return hit ? el('dxbtn') : null;
        },
        addEventListener(ev, fn) { rec('addEventListener', id, ev); try { fn.call(this); } catch (e) { rec('handler.threw', String(e && e.name)); } },
      };
    };
    c.document = { getElementById: (id) => { rec('getElementById', id); return el(id); },
      querySelectorAll: (s) => { rec('querySelectorAll', s); return [el('c0')]; } };
    // `S` is a top-level `const` in the monolith, so it lives in the context's
    // global LEXICAL scope and cannot be replaced from outside — the real
    // binding is reached through the context and mutated in place.
    const appS = vm.runInContext('S', c);
    Object.assign(appS, { scanData: [], ttConnected: false, lastScan: null,
      marketContextRisk: null, marketContextSummary: null }, opts.S);
    return c.eicAnalyzeTicker(opts.ticker)
      .then(() => { rec('eicAnalyzeTicker resolved'); return T; })
      .catch((e) => { rec('eicAnalyzeTicker rejected', String(e && e.message)); return T; });
  }

  const isoZ = (d) => new Date(FIXED_NOW + d * 86400000).toISOString();
  const scanRow = (o) => Object.assign({ ticker: 'AAA', name: 'Alpha', price: 190, ivRank: 70, iv: 0.35,
    iv30: 0.3, volume: 3000000, liq: 1, bid: 189.98, ask: 190.02, rsi: 60, beta: 1.1,
    score: 70, signal: 'LONG', squeeze: 'OFF', ma200dist: '+5%', nextEarnings: isoZ(7) }, o);
  const XTA_FIX = [
    ['ttConnected → the DXLink click path runs', { S: { scanData: [scanRow({}) ], ttConnected: true }, ticker: 'AAA' }],
    ['not connected → no DXLink button', { S: { scanData: [scanRow({})] }, ticker: 'AAA' }],
    ['ticker absent → guard clause', { S: { scanData: [] }, ticker: 'ZZZ' }],
  ];

  PARITY_TAIL = PARITY_TAIL.then(() => {
    let chain = Promise.resolve();
    const seen = [];
    for (const [label, opts] of XTA_FIX) {
      chain = chain.then(() => Promise.all([drive3(evalApp3(BASE3), opts), drive3(evalApp3(HEAD3), opts)])
        .then(([a, b]) => {
          const sa = a.join('\n'), sb = b.join('\n');
          if (sa !== sb) { XTA_DIFFS++; ok(false, '9E.x cross-module transcript differs for [' + label + ']'); }
          seen.push(sa);
        }));
    }
    return chain.then(() => {
      eq(XTA_DIFFS, 0, '9E.13 invoking eicAnalyzeTicker through the FULLY LOADED application gives identical transcripts on BASE and HEAD');
      const all = seen.join('\n');
      ok(all.indexOf('eicScreenTicker | AAA') >= 0,
        '9E.14 eicScreenTicker resolved at CALL TIME across the boundary PR 1 created');
      ok(all.indexOf('eicRunDXLink | dxbtn:data-ticker') >= 0 && all.indexOf('realWasFunction=true') >= 0,
        '9E.15 eicRunDXLink — still inline in a monolith loaded AFTER this module — was already bound and resolved at CLICK TIME');
      ok(all.indexOf('getElementById | eicResults') >= 0, '9E.16 the panel found its render host through the loaded document');
      ok(all.indexOf('showToast | Ticker ZZZ non trovato') >= 0, '9E.17 the guard clause path ran identically on both sides');
      note('PR3 cross-module — ' + XTA_FIX.length + ' fixtures through ' + HEAD3.length
        + ' ordered scripts · differences ' + XTA_DIFFS);
    });
  });
} else {
  ok(true, '9E.13 PR 3 cross-module proof skipped: the post-PR2 base blob is unavailable in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9D. TICKER-ANALYSIS BEHAVIOURAL PARITY — BASE vs HEAD, by transcript');
//
// The REAL eicAnalyzeTicker is evaluated from the BASE (post-PR2) monolith and
// from the shipped module under ONE deterministic sandbox, and the transcripts
// are compared. Nothing re-implements the function and nothing emulates a
// browser: only its COLLABORATORS are stubbed, identically on both sides, so a
// difference can only come from the relocation.
//
// The real eicScreenTicker from PR 1's module is used by both sides, because it
// is an EIC sibling rather than a stub-able boundary — using a fake there would
// hide a cross-module regression instead of exposing one.
//
// Recorded: every DOM lookup, every innerHTML write (as text, so a reworded
// label is a difference), the listener registration AND the click callback's
// effect, every collaborator call with its exact arguments, the callAgent
// context length, promise settlement, thrown errors, and the mutation the body
// performs on the scan row it looked up out of S.scanData.
// ═════════════════════════════════════════════════════════════════════════════
let txTicker = 0, txDiffs = 0;
const TA_BRANCHES = new Set();

if (BASE_PR2_MONO) {
  const baseTaDecl = (function () {
    const d = scanTopLevelDeclarations(BASE_PR2_MONO).filter((x) => x.name === 'eicAnalyzeTicker')[0];
    return BASE_PR2_MONO.slice(d.start, d.end + 1);
  })();
  const headTaDecl = TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1);
  eq(baseTaDecl, headTaDecl, '9D.1 the declaration is byte-identical between BASE and HEAD before anything runs');

  function makeTaCtx(state, opts) {
    const T = [];
    const rec = (...a) => T.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' | '));
    const S = new Proxy(Object.assign({}, state), {
      set(t, k, v) { rec('S.set', String(k), v); t[k] = v; return true; },
      get(t, k) { return t[k]; },
    });
    const el = (id) => ({
      _id: id,
      _html: '',
      set innerHTML(v) { this._html = String(v); rec('innerHTML', id, String(v)); }, get innerHTML() { return this._html; },
      set textContent(v) { rec('textContent', id, String(v)); },
      getAttribute(a) { rec('getAttribute', id, a); return id + ':' + a; },
      addEventListener(ev, fn) {
        rec('addEventListener', id, ev);
        // The DXLink click callback is the ONLY deferred reference in the body,
        // and the whole cross-module story rests on it, so it is INVOKED rather
        // than merely registered — with `this` bound as a click would bind it.
        try { fn.call(this); } catch (e) { rec('handler.threw', String(e && e.name), String(e && e.message)); }
      },
      // Reflects what was actually written, so the ttConnected=false fixtures
      // genuinely do NOT reach the click path. `noButton` stays as an explicit
      // override for the case where the element is gone at lookup time.
      querySelector(sel) {
        const hit = !(opts && opts.noButton) && this.innerHTML.indexOf('eic-dxlink-btn') >= 0;
        rec('querySelector', sel, hit ? 'found' : 'null');
        return hit ? el('dxbtn') : null;
      },
    });
    const ctx = {
      S,
      showToast: (...a) => rec('showToast', ...a),
      setAS: (...a) => rec('setAS', ...a),
      appendSysMsg: (...a) => rec('appendSysMsg', ...a),
      appendAgentMsg: (...a) => rec('appendAgentMsg', ...a),
      logEv: (...a) => rec('logEv', ...a),
      eicRunDXLink: (...a) => rec('eicRunDXLink', ...a),
      computeSetupScore: function (d, legsData, sc) {
        rec('computeSetupScore', d && d.ticker, !!legsData, sc ? sc.screenScore : null);
        return (opts && opts.setupResult) || {
          setupScore: 72, setupGrade: 'OK', setupCaps: null, setupHardReject: null,
          setupComponents: {
            ivr: { pts: 18, max: 25, value: 55, source: 'TT' }, timing: { pts: 15, max: 20, value: 'ok' },
            deltaValidation: { pts: 14, max: 20, value: 'ok' }, termStructure: { pts: 10, max: 15, value: 'ok' },
            liquidity: { pts: 9, max: 12, value: 'ok' }, premium: { pts: 6, max: 8, value: 'ok' },
          },
        };
      },
      computeFinalDecision: function (a) {
        rec('computeFinalDecision', JSON.stringify(a));
        return (opts && opts.finalDecision) || {
          finalTradingDecision: 'APPROVED_WITH_CAUTION', finalTradingReason: 'reason text',
          decisionComponents: { setup: { grade: 'OK' }, execution: { grade: 'OK' },
            context: { grade: 'LOW' }, dataConfidence: { grade: 'none' } },
        };
      },
      callAgent: function (agent, context) {
        // The FULL context, not just its length: it is the artefact this
        // function exists to build, so any reworded label, reordered section or
        // flipped branch inside it becomes a transcript difference.
        rec('callAgent', agent, 'ctxChars=' + String(context).length, String(context));
        if (opts && opts.agentThrows) return Promise.reject(new Error('agent exploded'));
        return Promise.resolve((opts && opts.agentReply) || 'Analisi **completa** NEUTRO');
      },
      document: {
        getElementById(id) { rec('getElementById', id); return (opts && opts.noDom) ? null : el(id); },
      },
      console: { log() {}, warn() {}, error() {} },
      Math, JSON, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt, RegExp, Error, Promise,
    };
    class FixedDate extends Date {
      constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
      static now() { return FIXED_NOW; }
    }
    ctx.Date = FixedDate;
    return { ctx, T };
  }

  function runTaSide(body, state, opts, ticker) {
    const { ctx, T } = makeTaCtx(state, opts);
    vm.createContext(ctx);
    try { vm.runInContext(MODULE_SRC + '\n' + body, ctx, { filename: 'ta-parity.js', timeout: 10000 }); }
    catch (e) { T.push('EVAL_THREW | ' + String(e && e.message)); return Promise.resolve(T); }
    let p;
    try { p = ctx.eicAnalyzeTicker(ticker); }
    catch (e) { T.push('THREW | ' + String(e && e.name) + ' | ' + String(e && e.message)); return Promise.resolve(T); }
    return Promise.resolve(p)
      .then((r) => { T.push('resolved | ' + JSON.stringify(r === undefined ? null : r)); })
      .catch((e) => { T.push('rejected | ' + String(e && e.message)); })
      .then(() => {
        // The body mutates the scan ROW it found in S.scanData. That is a write
        // to shared state, so it is part of the observable result.
        const rows = (state.scanData || []).map((x) => x.ticker + ':' + JSON.stringify({
          fd: x.eicFinalDecision || null, sr: x.eicSetupResult || null, ft: x.eicFinalDecisionTicker || null,
        }));
        T.push('scanRows | ' + rows.join(' ;; '));
        return T;
      });
  }

  function compareTa(label, state, opts, ticker) {
    txTicker++; TA_BRANCHES.add(label);
    const st = () => JSON.parse(JSON.stringify(state));
    return Promise.all([
      runTaSide(baseTaDecl, st(), opts, ticker),
      runTaSide(headTaDecl, st(), opts, ticker),
    ]).then(([a, b]) => {
      const sa = a.join('\n'), sb = b.join('\n');
      if (sa !== sb) {
        txDiffs++;
        const i = [...sa].findIndex((c, k) => c !== sb[k]);
        ok(false, '9D.x eicAnalyzeTicker [' + label + '] BASE≠HEAD near offset ' + i
          + ': ' + JSON.stringify(sa.slice(Math.max(0, i - 40), i + 40))
          + ' vs ' + JSON.stringify(sb.slice(Math.max(0, i - 40), i + 40)));
      }
      return a;
    });
  }

  // ── source-derived fixtures ────────────────────────────────────────────────
  const iso = (days) => new Date(FIXED_NOW + days * 86400000).toISOString();
  const row = (o) => Object.assign({
    ticker: 'AAPL', name: 'Apple', price: 190, ivRank: 55, iv: 0.35, iv30: 0.30,
    volume: 5000000, liq: 1, bid: 189.98, ask: 190.02, rsi: 58, beta: 1.2,
    score: 78, signal: 'LONG', squeeze: 'ON', ma200dist: '+8.4%', nextEarnings: iso(9),
  }, o);
  const leg = (o) => Object.assign({
    strike: 200, theoreticalTarget: 201, estimatedDelta: 0.12, deltaSource: 'BS',
    legIV: 38, legIVSource: 'chain', bid: 1.2, ask: 1.3, spreadPct: 8, openInterest: 450,
  }, o);
  const fullLegs = (o) => Object.assign({
    expiration: '2026-02-20', executionVerdict: 'OK',
    termStructureIV: 42, termStructureIVNote: 'front elevated',
    liqDataSource: 'yahoo', liqDataDelayed: true, liqConfidence: 'medium',
    liqConfidenceNote: 'delayed chain',
    legs: { shortCall: leg({}), shortPut: leg({ strike: 180 }), longCall: leg({ strike: 210 }), longPut: leg({ strike: 170 }) },
    fillQuality: { shortCall: { verdict: 'good' }, shortPut: { verdict: 'fair' }, longCall: { verdict: 'good' }, longPut: { verdict: 'poor' } },
    deltaWarnings: [], deltaValidation: { note: 'all in range' }, structureViable: true,
    aggregate: { avgSpreadPct: 7, worstSpreadPct: 11, estCredit: 1.35, liqVerdict: 'ok', hardReject: null },
    overallIVConfidence: 'MEDIUM', legIssues: null,
    markVsTheo: { theoreticalCredit: 1.5, theoreticalConfidence: 'HIGH', marketCredit: 1.35, slippage: 0.15, slippagePct: 10, slippageGrade: 'B' },
  }, o);

  const base = { scanData: [row({})], marketContextRisk: 'LOW', marketContextSummary: 'calm tape, low vol',
    lastScan: FIXED_NOW - 15 * 60000, ttConnected: false };
  const withLegs = (legs, extra) => Object.assign({}, base, { scanData: [row({ eicLegs: legs })] }, extra);

  const TA_FIXTURES = [
    // guard clause
    ['ticker not in scanData → showToast and early return', { scanData: [] }, {}, 'ZZZZ'],
    // MODE B — no chain data
    ['MODE B: no legs data at all', base, {}, 'AAPL'],
    // MODE A — full chain data
    ['MODE A: full legs data', withLegs(fullLegs({})), {}, 'AAPL'],
    ['MODE A: legs object present but .legs missing', withLegs(fullLegs({ legs: null })), {}, 'AAPL'],
    ['MODE A: one leg missing → legLine N/A branch',
      withLegs(fullLegs({ legs: { shortCall: leg({}), shortPut: null, longCall: leg({}), longPut: leg({}) } })), {}, 'AAPL'],
    ['MODE A: no fillQuality', withLegs(fullLegs({ fillQuality: null })), {}, 'AAPL'],
    ['MODE A: delta warnings present', withLegs(fullLegs({ deltaWarnings: ['shortCall 0.22 out of range'], structureViable: false })), {}, 'AAPL'],
    ['MODE A: deltaValidation absent', withLegs(fullLegs({ deltaValidation: null })), {}, 'AAPL'],
    ['MODE A: legIssues present', withLegs(fullLegs({ legIssues: { shortPut: 'wide' } })), {}, 'AAPL'],
    ['MODE A: markVsTheo absent', withLegs(fullLegs({ markVsTheo: null })), {}, 'AAPL'],
    ['MODE A: aggregate hardReject present', withLegs(fullLegs({ aggregate: { avgSpreadPct: 20, worstSpreadPct: 40, estCredit: 0.2, liqVerdict: 'weak', hardReject: ['spread too wide'] } })), {}, 'AAPL'],
    ['MODE A: executionVerdict missing', withLegs(fullLegs({ executionVerdict: null })), {}, 'AAPL'],
    ['MODE A: overallIVConfidence missing', withLegs(fullLegs({ overallIVConfidence: null })), {}, 'AAPL'],
    // IV source label — all three branches
    ['IV source: iv present (TT REAL-TIME)', base, {}, 'AAPL'],
    ['IV source: iv absent, iv30 present (iv30_delayed)',
      Object.assign({}, base, { scanData: [row({ iv: null })] }), {}, 'AAPL'],
    ['IV source: neither iv nor iv30 (UNAVAILABLE)',
      Object.assign({}, base, { scanData: [row({ iv: null, iv30: null })] }), {}, 'AAPL'],
    // IVR / earnings
    ['ivRank null → TASTYTRADE_UNAVAILABLE', Object.assign({}, base, { scanData: [row({ ivRank: null })] }), {}, 'AAPL'],
    ['nextEarnings null → days N/A', Object.assign({}, base, { scanData: [row({ nextEarnings: null })] }), {}, 'AAPL'],
    // macro context
    ['marketContextRisk unset → NON VALUTATO', Object.assign({}, base, { marketContextRisk: null }), {}, 'AAPL'],
    ['marketContextSummary absent', Object.assign({}, base, { marketContextSummary: null }), {}, 'AAPL'],
    ['marketContextSummary longer than 200 chars',
      Object.assign({}, base, { marketContextSummary: 'x'.repeat(400) }), {}, 'AAPL'],
    ['lastScan never run', Object.assign({}, base, { lastScan: null }), {}, 'AAPL'],
    // agent verdicts — all three
    ['verdict APPROVATO', base, { agentReply: 'Verdetto: APPROVATO tutto ok' }, 'AAPL'],
    ['verdict SCARTATO', base, { agentReply: 'Verdetto: SCARTATO rischio alto' }, 'AAPL'],
    ['verdict NEUTRO (neither token present)', base, { agentReply: 'Nessun verdetto esplicito' }, 'AAPL'],
    // the catch path
    ['callAgent rejects → error rendering + setAS err', base, { agentThrows: true }, 'AAPL'],
    ['callAgent rejects with no #eicResults element', base, { agentThrows: true, noDom: true }, 'AAPL'],
    // DXLink button — the deferred cross-module call
    ['ttConnected → DXLink button rendered, listener fires eicRunDXLink',
      Object.assign({}, base, { ttConnected: true }), {}, 'AAPL'],
    ['ttConnected with legs expiration',
      withLegs(fullLegs({}), { ttConnected: true }), {}, 'AAPL'],
    ['ttConnected but querySelector finds no button',
      Object.assign({}, base, { ttConnected: true }), { noButton: true }, 'AAPL'],
    // DOM absent entirely
    ['no #eicResults element at all', base, { noDom: true }, 'AAPL'],
    // final-decision badge colours — each mapped key plus the fallback
    ['final decision APPROVED', base, { finalDecision: { finalTradingDecision: 'APPROVED', finalTradingReason: 'r', decisionComponents: { setup: { grade: 'STRONG' }, execution: { grade: 'OK' }, context: { grade: 'LOW' }, dataConfidence: { grade: 'none' } } } }, 'AAPL'],
    ['final decision AVOID', base, { finalDecision: { finalTradingDecision: 'AVOID', finalTradingReason: 'r', decisionComponents: { setup: { grade: 'WEAK' }, execution: { grade: 'NO' }, context: { grade: 'HIGH' }, dataConfidence: { grade: 'none' } } } }, 'AAPL'],
    ['final decision WATCHLIST_ONLY', base, { finalDecision: { finalTradingDecision: 'WATCHLIST_ONLY', finalTradingReason: 'r', decisionComponents: { setup: { grade: 'OK' }, execution: { grade: 'OK' }, context: { grade: 'MED' }, dataConfidence: { grade: 'none' } } } }, 'AAPL'],
    ['final decision BLOCKED_BY_CONTEXT', base, { finalDecision: { finalTradingDecision: 'BLOCKED_BY_CONTEXT', finalTradingReason: 'r', decisionComponents: { setup: { grade: 'OK' }, execution: { grade: 'OK' }, context: { grade: 'CRITICAL' }, dataConfidence: { grade: 'none' } } } }, 'AAPL'],
    ['final decision UNKNOWN key → colour falls back', base, { finalDecision: { finalTradingDecision: 'SOMETHING_ELSE', finalTradingReason: 'r', decisionComponents: { setup: { grade: 'OK' }, execution: { grade: 'OK' }, context: { grade: 'LOW' }, dataConfidence: { grade: 'none' } } } }, 'AAPL'],
    // setup grade colours + caps
    ['setup grade STRONG', base, { setupResult: { setupScore: 91, setupGrade: 'STRONG', setupCaps: null, setupHardReject: null, setupComponents: { ivr: { pts: 25, max: 25, value: 80, source: 'TT' }, timing: { pts: 20, max: 20, value: 'ok' }, deltaValidation: { pts: 20, max: 20, value: 'ok' }, termStructure: { pts: 15, max: 15, value: 'ok' }, liquidity: { pts: 12, max: 12, value: 'ok' }, premium: { pts: 8, max: 8, value: 'ok' } } } }, 'AAPL'],
    ['setup grade WEAK with caps and a hard reject', base, { setupResult: { setupScore: 31, setupGrade: 'WEAK', setupCaps: ['low IVR', 'wide spreads'], setupHardReject: 'IVR below floor', setupComponents: { ivr: { pts: 2, max: 25, value: 8, source: 'TT' }, timing: { pts: 4, max: 20, value: 'late' }, deltaValidation: { pts: 3, max: 20, value: 'off' }, termStructure: { pts: 2, max: 15, value: 'flat' }, liquidity: { pts: 1, max: 12, value: 'weak' }, premium: { pts: 0, max: 8, value: 'thin' } } } }, 'AAPL'],
    // multiple rows — the .find() must pick the right one and mutate only it
    ['two rows, the second is the target',
      Object.assign({}, base, { scanData: [row({ ticker: 'MSFT' }), row({ ticker: 'AAPL' })] }), {}, 'AAPL'],
  ];

  PARITY_TAIL = PARITY_TAIL.then(() => {
    let chain = Promise.resolve();
    const seen = [];
    for (const [label, state, opts, ticker] of TA_FIXTURES) {
      chain = chain.then(() => compareTa(label, state, opts, ticker).then((t) => seen.push(t.join('\n'))));
    }
    return chain.then(() => {
      eq(txDiffs, 0, '9D.2 BASE and HEAD produce identical transcripts over every fixture');
      eq(txTicker, TA_FIXTURES.length, '9D.3 ' + TA_FIXTURES.length + ' fixtures ran');
      eq(TA_BRANCHES.size, TA_FIXTURES.length, '9D.4 …each a distinct named branch');

      // BRANCH COVERAGE — every fixture must have REACHED the branch it names,
      // proved from the transcripts rather than assumed from the setup.
      const all = seen.join('\n');
      const reached = (needle, id, what) => ok(all.indexOf(needle) >= 0, '9D.' + id + ' ' + what);
      reached('showToast | Ticker ZZZZ non trovato | warn', 5, 'the not-found guard clause was reached');
      reached('MODE B: NO CHAIN DATA', 6, 'the MODE B (no chain) rendering branch was reached');
      reached('MODE A: REAL CHAIN DATA PRESENT', 7, 'the MODE A (real chain) rendering branch was reached');
      reached('SHORT PUT: N/A', 8, 'the missing-leg legLine branch was reached');
      reached('STRUCTURE NOT VIABLE', 9, 'the delta-warning branch was reached');
      reached('TT[REAL-TIME]', 10, 'the iv (real-time) IV-source label was reached');
      reached('TT[iv30_delayed]', 11, 'the iv30 (delayed) IV-source label was reached');
      reached('UNAVAILABLE — trade non valutabile', 12, 'the no-IV label was reached');
      reached('TASTYTRADE_UNAVAILABLE', 13, 'the missing-IVR branch was reached');
      reached('NEVER RUN', 14, 'the never-scanned branch was reached');
      reached('NON VALUTATO', 15, 'the unset-macro-context branch was reached');
      reached('APPROVATO', 16, 'the APPROVATO verdict branch was reached');
      reached('SCARTATO', 17, 'the SCARTATO verdict branch was reached');
      reached('NEUTRO', 18, 'the NEUTRO fallback verdict branch was reached');
      reached('Errore: agent exploded', 19, 'the catch/error-rendering path was reached');
      reached('eic-dxlink-btn', 20, 'the ttConnected DXLink button was rendered');
      reached('eicRunDXLink | dxbtn:data-ticker', 21,
        'the DXLink click callback FIRED and resolved eicRunDXLink — a PR 4 name still inline — at event time');
      reached('"ft":"AAPL"', 22, 'the scan-row mutation was observed');
      reached('setAS | earnings-ic | err', 23, 'the error setAS branch was reached');
      reached('callAgent | earnings-ic | ctxChars=', 24, 'callAgent was reached with a built context');
      ok(all.indexOf('MSFT:{"fd":null,"sr":null,"ft":null}') >= 0,
        '9D.25 …and only the matched row was mutated — the sibling row is untouched');

      note('ticker-analysis parity — ' + txTicker + ' fixtures · differences ' + txDiffs);
    });
  });

  // §12 mutates the REAL body through this guard, so a parity regression is
  // provable rather than merely asserted.
  //
  // It is ASYNCHRONOUS, and it has to be. eicAnalyzeTicker awaits callAgent, and
  // almost everything worth mutating — the verdict tokens, the decision badge,
  // the card markup, the error path, the scan-row mutation — happens AFTER that
  // await. A guard that compared only the synchronously-observable prefix would
  // be blind to exactly those mutations, and four of them SURVIVED such a guard
  // before this was fixed. §12 therefore runs promise-returning guards in a
  // second pass rather than pretending the function is synchronous.
  const TA_GUARD_PROBES = [
    ['MODE A full', withLegs(fullLegs({})), {}, 'AAPL'],
    ['MODE B', base, {}, 'AAPL'],
    ['ttConnected', Object.assign({}, base, { ttConnected: true }), {}, 'AAPL'],
    ['APPROVATO', base, { agentReply: 'Esito APPROVATO' }, 'AAPL'],
    ['SCARTATO', base, { agentReply: 'Esito SCARTATO' }, 'AAPL'],
    ['NEUTRO default', base, { agentReply: 'nessun verdetto' }, 'AAPL'],
    ['agent throws', base, { agentThrows: true }, 'AAPL'],
    ['not found', { scanData: [] }, {}, 'ZZZZ'],
    ['no ivRank', Object.assign({}, base, { scanData: [row({ ivRank: null })] }), {}, 'AAPL'],
    ['no iv at all', Object.assign({}, base, { scanData: [row({ iv: null, iv30: null })] }), {}, 'AAPL'],
    ['delta warnings', withLegs(fullLegs({ deltaWarnings: ['x'], structureViable: false })), {}, 'AAPL'],
    ['no lastScan', Object.assign({}, base, { lastScan: null }), {}, 'AAPL'],
    ['long macro summary', Object.assign({}, base, { marketContextSummary: 'y'.repeat(400) }), {}, 'AAPL'],
    ['no nextEarnings', Object.assign({}, base, { scanData: [row({ nextEarnings: null })] }), {}, 'AAPL'],
  ];
  function taSweep(body) {
    let chain = Promise.resolve([]);
    for (const [plabel, state, opts, ticker] of TA_GUARD_PROBES) {
      chain = chain.then((acc) => runTaSide(body, JSON.parse(JSON.stringify(state)), opts, ticker)
        .then((T) => acc.concat('### ' + plabel, T.join('\n'))));
    }
    return chain.then((a) => a.join('\n'));
  }
  let TA_BASE_TRANSCRIPT_P = null;
  TA_TRANSCRIPT_GUARD = function (mutatedBody) {
    if (!TA_BASE_TRANSCRIPT_P) TA_BASE_TRANSCRIPT_P = taSweep(baseTaDecl);
    return TA_BASE_TRANSCRIPT_P
      .then((baseT) => taSweep(mutatedBody).then((got) => {
        const violations = [];
        if (got !== baseT) {
          const k = [...got].findIndex((c, n) => c !== baseT[n]);
          violations.push('TA_PARITY: transcript diverges from BASE at offset ' + k
            + ' — ' + JSON.stringify(String(got).slice(Math.max(0, k - 30), k + 30)));
        }
        return { violations, threw: null };
      }))
      .catch((e) => ({ violations: ['TA_PARITY_GUARD_FAILED: ' + String(e && e.message)],
        threw: String(e && e.message) }));
  };

} else {
  note('post-PR2 base blob unreachable — ticker parity sweep skipped, sha256 identity stands');
  ok(true, '9D.2 ticker parity skipped: base blob unavailable in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9F. LIVE-DEEP-DIVE BEHAVIOURAL PARITY — BASE vs HEAD, by transcript');
//
// §9 compares RETURN VALUES, which works for pure functions. Nothing here is
// pure: these functions call a backend, open a WebSocket, render into the DOM,
// mutate a scan row and log. Comparing what they RETURN would miss almost
// everything they do — and would miss the defects this PR is required to
// preserve. So both sides are driven under one deterministic sandbox and the
// ORDERED TRANSCRIPT of everything they did is compared, character for
// character.
//
// WHAT IS REAL AND WHAT IS STUBBED
//   The BODIES are real: BASE's are evaluated out of the post-PR3 monolith blob,
//   HEAD's out of the shipped module. Nothing re-implements them and nothing
//   emulates a browser. Only COLLABORATORS are stubbed, at their boundaries, and
//   identically on both sides: ttCall, the WebSocket, document, callAgent,
//   setAS/showToast/logEv/appendSysMsg/appendAgentMsg, computeSetupScore and
//   computeFinalDecision. The REAL eicScreenTicker and eicBuildLiveContext from
//   PR 1's shipped module are used by both sides, so a cross-module regression
//   would surface here rather than hide.
//
//   The WebSocket stub is a scripted DXLink SERVER, not a mock with canned
//   returns: it answers SETUP with SETUP, AUTH with AUTH_STATE, CHANNEL_REQUEST
//   with CHANNEL_OPENED and FEED_SUBSCRIPTION with the fixture's FEED_DATA. The
//   real protocol state machine in the body therefore actually runs.
//
// THESE FUNCTIONS ARE ASYNCHRONOUS, AND THAT IS THE POINT
//   Almost everything worth checking in eicDXLinkDeepDive and eicRunDXLink
//   happens AFTER an await. Every fixture is awaited to settlement before its
//   transcript is compared; a synchronous-prefix comparison would have declared
//   parity on the first few lines and missed the rest.
//
// BRANCH COVERAGE IS ASSERTED FROM THE TRANSCRIPTS
//   "0 differences" over fixtures that all take the same path proves nothing.
//   The assertions below require the transcripts to CONTAIN evidence of each
//   branch — success, rejection, malformed data, missing DOM, credential/token
//   failure, transport failure and timeout — so the fixtures are proved to have
//   exercised what they claim.
// ═════════════════════════════════════════════════════════════════════════════
let LDD_DIFFS = 0, LDD_FIX_COUNT = 0;
if (BASE_PR3_MONO) {
  const baseLdd = scanTopLevelDeclarations(BASE_PR3_MONO)
    .filter((x) => G.LIVE_DEEP_DIVE_NAMES.indexOf(x.name) >= 0);
  eq(baseLdd.length, 4, '9F.1 the four declarations were located in the post-PR3 base monolith');
  const BASE_LDD_SRC = baseLdd.map((d) => BASE_PR3_MONO.slice(d.start, d.end + 1)).join('\n\n');
  const HEAD_EXTRACTION_LDD_SRC = LDD_EXTRACTION_DECLS
    .map((d) => LDD_EXTRACTION_SRC.slice(d.start, d.end + 1)).join('\n\n');
  const HEAD_LDD_SRC = LDD_DECLS.map((d) => LDD_SRC.slice(d.start, d.end + 1)).join('\n\n');
  eq(BASE_LDD_SRC, HEAD_EXTRACTION_LDD_SRC,
    '9F.2 the historical PR 4 projection is still byte-identical to the four declarations in the base monolith');
  const baseRun = baseLdd.filter((d) => d.name === 'eicRunDXLink')[0];
  const currentRun = LDD_DECLS.filter((d) => d.name === 'eicRunDXLink')[0];
  const baseRunText = BASE_PR3_MONO.slice(baseRun.start, baseRun.end + 1);
  const currentRunText = LDD_SRC.slice(currentRun.start, currentRun.end + 1);
  // Function replacer is mandatory: the body contains `$'`, which a string
  // replacement would interpret as "the suffix after the match" and silently
  // splice unrelated source into the fixture.
  const BASE_RUNTIME_LDD_SRC = BASE_LDD_SRC.replace(baseRunText, () => currentRunText);
  eq(BASE_RUNTIME_LDD_SRC, HEAD_LDD_SRC,
    '9F.2b applying the one approved repair to BASE yields the current declaration text exactly');

  // PR 1's module supplies the REAL siblings both sides call.
  const RULES_SRC = MODULE_SRC;

  /**
   * One sandbox, one transcript. `fx` describes the fixture: the scan rows, the
   * ttCall behaviour, the DXLink script, whether the DOM host exists, and what
   * callAgent does.
   */
  function makeLdd(fx, src) {
    const T = [];
    const rec = (...a) => T.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' | '));
    const ctx = {
      console: { log() {}, warn() {}, error() {} },
      // The DXLink budget. The callback is captured, and — when the fixture asks
      // for it — fired from a HOST macrotask rather than from inside the socket
      // script. That ordering is deliberate: setImmediate runs after every
      // pending microtask, so the feed (delivered on a microtask) always lands
      // first and the timeout fires against whatever data actually arrived.
      // Firing it from the subscription handler instead would never reach the
      // fixtures where the socket stalls BEFORE subscribing — never opens, or is
      // refused at AUTH — and those fixtures would hang rather than fail.
      setTimeout(fn, ms) {
        rec('setTimeout', ms);
        ctx.__timeoutFn = fn;
        if (fx.fireTimeout) setImmediate(() => {
          const f = ctx.__timeoutFn;
          if (!f) return;
          ctx.__timeoutFn = null;
          try { f(); } catch (e) { rec('timeout.threw', String(e && e.name), String(e && e.message)); }
        });
        return 77;
      },
      clearTimeout(id) { rec('clearTimeout', String(id)); ctx.__timeoutFn = null; },
      setInterval() { return 0; }, clearInterval() {},
    };
    class FixedDate extends Date {
      constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
      static now() { return FIXED_NOW; }
    }
    ctx.Date = FixedDate;

    // ── the DOM host ────────────────────────────────────────────────────────
    const mkEl = (id) => {
      const node = {
        _html: '', _text: '', _children: [], className: '', style: { cssText: '' },
        get innerHTML() { return node._html; },
        set innerHTML(v) {
          node._html = String(v);
          const badge = node._html.match(/\| <span style="color:([^;]+);font-weight:700">/);
          rec('innerHTML=', id, String(v).length, 'fdColor=' + (badge ? badge[1] : 'none'));
        },
        get textContent() { return node._text; },
        set textContent(v) { node._text = String(v); rec('textContent=', id, String(v)); },
        querySelector(sel) {
          const hit = node._children.some((c) => c.className && ('.' + c.className) === sel);
          rec('querySelector', id, sel, hit ? 'found' : 'null');
          return hit ? node._children.filter((c) => ('.' + c.className) === sel)[0] : null;
        },
        appendChild(c) { node._children.push(c); rec('appendChild', id, c.className || '?'); return c; },
      };
      return node;
    };
    const host = fx.noDom ? null : mkEl('eicResults');
    ctx.document = {
      getElementById(i) { rec('getElementById', i, host ? 'found' : 'null'); return i === 'eicResults' ? host : null; },
      createElement(t) { rec('createElement', t); return mkEl('new:' + t); },
    };

    // ── the scripted DXLink server ──────────────────────────────────────────
    ctx.WebSocket = function (url) {
      rec('new WebSocket', url);
      if (fx.wsThrow) { throw new Error('ws construct failed'); }
      const ws = this;
      ws.close = function () { rec('ws.close'); };
      ws.send = function (raw) {
        let msg = null; try { msg = JSON.parse(raw); } catch (e) { /* recorded below */ }
        // The PAYLOAD, not just the frame type. A type-only transcript cannot
        // see the credential being dropped or the subscription losing an event
        // class — two mutations that change what this module puts on the wire
        // while every frame still arrives in the same order.
        if (!msg) { rec('ws.send', 'unparseable'); }
        else if (msg.type === 'SETUP') rec('ws.send', 'SETUP', 'version=' + msg.version, 'keepalive=' + msg.keepaliveTimeout);
        else if (msg.type === 'AUTH') rec('ws.send', 'AUTH', 'hasToken=' + (msg.token !== undefined), 'token=' + String(msg.token), 'channel=' + msg.channel);
        else if (msg.type === 'CHANNEL_REQUEST') rec('ws.send', 'CHANNEL_REQUEST', 'channel=' + msg.channel, 'service=' + msg.service, 'contract=' + (msg.parameters && msg.parameters.contract));
        else if (msg.type === 'FEED_SETUP') rec('ws.send', 'FEED_SETUP', 'format=' + msg.acceptDataFormat,
          'agg=' + msg.acceptAggregationPeriod, 'events=' + Object.keys(msg.acceptEventFields || {}).sort().join('/'),
          'fields=' + JSON.stringify(msg.acceptEventFields));
        else if (msg.type === 'FEED_SUBSCRIPTION') rec('ws.send', 'FEED_SUBSCRIPTION', 'adds=' + (msg.add || []).length,
          'types=' + Array.from(new Set((msg.add || []).map((x) => x.type))).sort().join('/'),
          'symbols=' + Array.from(new Set((msg.add || []).map((x) => x.symbol))).sort().join(','));
        else rec('ws.send', msg.type, 'channel=' + msg.channel);
        if (!msg || fx.deaf) return;
        // An exception thrown by an event handler does not propagate back to
        // whoever dispatched the event — in a browser it goes to window.onerror.
        // Modelling that faithfully is what lets a mutant which REMOVES the
        // malformed-data fallback show up as a transcript difference instead of
        // tearing down the harness as an unhandled rejection.
        const deliver = (obj) => {
          if (!ws.onmessage) return;
          try { ws.onmessage({ data: typeof obj === 'string' ? obj : JSON.stringify(obj) }); }
          catch (e) { rec('onmessage.threw', String(e && e.name), String(e && e.message)); }
        };
        if (msg.type === 'SETUP') deliver({ type: 'SETUP' });
        else if (msg.type === 'AUTH') deliver({ type: 'AUTH_STATE', state: fx.authState || 'AUTHORIZED' });
        else if (msg.type === 'CHANNEL_REQUEST') deliver({ type: 'CHANNEL_OPENED', channel: msg.channel });
        else if (msg.type === 'FEED_SUBSCRIPTION') {
          if (fx.malformedFrame) deliver('{not json');
          if (fx.keepalive) deliver({ type: 'KEEPALIVE' });
          for (const frame of (fx.feed || [])) deliver(frame);
          if (fx.thenError && ws.onerror) { try { ws.onerror(); } catch (e) { rec('onerror.threw', String(e && e.name)); } }
          if (fx.thenClose && ws.onclose) { try { ws.onclose(); } catch (e) { rec('onclose.threw', String(e && e.name)); } }
        }
      };
      // The body assigns onopen/onmessage/onerror/onclose synchronously right
      // after construction, so kicking the protocol off on a microtask is what a
      // real socket does and what keeps the handlers in place.
      Promise.resolve().then(() => {
        if (fx.neverOpen || !ws.onopen) return;
        try { ws.onopen(); } catch (e) { rec('onopen.threw', String(e && e.name), String(e && e.message)); }
      });
    };

    // ── collaborators ───────────────────────────────────────────────────────
    ctx.ttCall = function (url) {
      rec('ttCall', url);
      const r = fx.tt ? fx.tt(url) : undefined;
      if (r && r.__reject) return Promise.reject(new Error(r.__reject));
      return Promise.resolve(r === undefined ? null : r);
    };
    ctx.callAgent = function (a, text) {
      rec('callAgent', a, 'ctxChars=' + String(text).length);
      if (fx.agentReject) return Promise.reject(new Error(fx.agentReject));
      return Promise.resolve(fx.agent || 'VERDICT APPROVATO ok');
    };
    ctx.setAS = (...a) => rec('setAS', ...a);
    ctx.showToast = (...a) => rec('showToast', ...a);
    ctx.logEv = (...a) => rec('logEv', ...a);
    ctx.appendSysMsg = (...a) => rec('appendSysMsg', ...a);
    ctx.appendAgentMsg = (...a) => rec('appendAgentMsg', ...a);
    ctx.computeSetupScore = function (d) { rec('computeSetupScore', d ? d.ticker : null);
      return { setupGrade: 'OK', setupScore: 61, setupHardReject: null }; };
    ctx.computeFinalDecision = function (o) { rec('computeFinalDecision', JSON.stringify(o));
      return { finalTradingDecision: fx.finalDecision || 'TRADE_SMALL' }; };
    ctx.S = { scanData: fx.scanData || [], marketContextRisk: fx.macro || null };

    vm.createContext(ctx);
    // PR 1's REAL module first, so eicScreenTicker/eicBuildLiveContext are the
    // shipped ones on BOTH sides.
    vm.runInContext(RULES_SRC, ctx, { filename: 'eic-screening-rules.js', timeout: 20000 });
    vm.runInContext(src, ctx, { filename: 'ldd-under-test.js', timeout: 20000 });
    return { ctx, T, rec, host };
  }

  const quote = (sym, bid, ask) => ({ type: 'Quote', eventSymbol: sym, bidPrice: bid, askPrice: ask });
  // Deliberately MORE decimals than the body keeps. The real code rounds delta
  // to 4 places, gamma to 6, theta/vega to 4 and volatility to 2 after scaling —
  // feeding it values that are already short would make every one of those
  // toFixed() calls invisible, and a mutant that changes a precision would
  // survive because the fixture, not the guard, was too weak to see it.
  const greeks = (sym, d) => ({ type: 'Greeks', eventSymbol: sym, delta: d,
    gamma: 0.0123456789, theta: -0.5432198, vega: 0.2198765, volatility: 0.4213579 });
  const SYMS = ['.AAA C1', '.AAA C2', '.AAA P1', '.AAA P2'];
  const fullFeed = () => [{ type: 'FEED_DATA', channel: 1, data: [
    quote(SYMS[0], 1.1098765, 1.2012345), greeks(SYMS[0], 0.1234567),
    quote(SYMS[1], 0.4098765, 0.5012345), greeks(SYMS[1], 0.2536789),
    quote(SYMS[2], 1.0598765, 1.1512345), greeks(SYMS[2], -0.1342876),
    quote(SYMS[3], 0.3598765, 0.4512345), greeks(SYMS[3], -0.2418642),
  ] }];
  const partialFeed = () => [{ type: 'FEED_DATA', channel: 1, data: [
    quote(SYMS[0], 1.1098765, 1.2012345), greeks(SYMS[0], 0.1234567),
    quote(SYMS[1], 0.4098765, 0.5012345), greeks(SYMS[1], 0.2536789),
  ] }];
  const legs = () => ({ legs: {
    shortCall: { strike: 200, bid: 1.0, ask: 1.3 }, longCall: { strike: 205, bid: 0.3, ask: 0.6 },
    shortPut: { strike: 180, bid: 1.0, ask: 1.3 }, longPut: { strike: 175, bid: 0.3, ask: 0.6 } },
    executionVerdict: 'EXECUTABLE', markVsTheo: { theoreticalConfidence: 'MED' } });
  const chain = () => ({ strikes: [
    { strike: 200, callStreamer: SYMS[0], putStreamer: '.x1' },
    { strike: 205, callStreamer: SYMS[1], putStreamer: '.x2' },
    { strike: 180, callStreamer: '.x3', putStreamer: SYMS[2] },
    { strike: 175, callStreamer: '.x4', putStreamer: SYMS[3] }] });
  const row = (o) => Object.assign({ ticker: 'AAA', name: 'Alpha', price: 190, ivRank: 70, iv: 0.35,
    iv30: 0.3, volume: 3000000, liq: 1, bid: 189.98, ask: 190.02, rsi: 60, beta: 1.1, score: 70,
    signal: 'LONG', squeeze: 'OFF', ma200dist: '+5%',
    nextEarnings: new Date(FIXED_NOW + 7 * 86400000).toISOString(), eicLegs: legs() }, o);
  const okTt = (u) => (/quote-token/.test(u) ? { token: 'TKN', dxlinkUrl: 'wss://fake/rt' }
    : /chain-symbols/.test(u) ? chain() : { ok: true });

  // ── the fixture matrix ──────────────────────────────────────────────────
  // Each entry names the BRANCH it exists to exercise. `fn` selects which of the
  // three names is driven, so all four moved sites are covered — including both
  // eicFetchLegs copies through the final hoisted binding.
  const LDD_FIX = [
    // eicFetchLegs — success and rejection
    ['fetchLegs: backend resolves', { fn: 'eicFetchLegs', args: ['AAA'], tt: () => ({ legs: 'payload' }) }],
    ['fetchLegs: backend REJECTS → null', { fn: 'eicFetchLegs', args: ['AAA'], tt: () => ({ __reject: 'boom' }) }],
    ['fetchLegs: backend resolves null', { fn: 'eicFetchLegs', args: ['AAA'], tt: () => null }],
    // eicDXLinkDeepDive — the credential/token branch
    ['deepDive: quote token MISSING → throw → catch', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: () => ({}) }],
    ['deepDive: quote token call REJECTS', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: () => ({ __reject: 'token transport down' }) }],
    // …the chain-symbols branch
    ['deepDive: chain symbols MISSING → throw', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: (u) => (/quote-token/.test(u) ? okTt(u) : {}) }],
    ['deepDive: expiration is threaded into the chain URL', { fn: 'eicDXLinkDeepDive', args: ['AAA', '2026-02-20'],
      scanData: [row({})], tt: okTt, feed: fullFeed() }],
    // …the malformed / missing leg-data branch
    ['deepDive: scan row has NO eicLegs → throw', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({ eicLegs: null })], tt: okTt }],
    ['deepDive: ticker absent from scanData → throw', { fn: 'eicDXLinkDeepDive', args: ['ZZZ', null],
      scanData: [row({})], tt: okTt }],
    // …the transport branches
    ['deepDive: WebSocket constructor THROWS → resolve(null) → timeout fallback', { fn: 'eicDXLinkDeepDive',
      args: ['AAA', null], scanData: [row({})], tt: okTt, wsThrow: true }],
    ['deepDive: socket never opens, timeout fires with 0 legs', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, neverOpen: true, fireTimeout: true }],
    ['deepDive: onerror before any data', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: [], thenError: true }],
    ['deepDive: onclose before any data', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: [], thenClose: true }],
    // …the data branches
    ['deepDive: FULL feed → all four legs live → confidence high', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed() }],
    ['deepDive: PARTIAL feed then timeout → confidence partial', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: partialFeed(), fireTimeout: true }],
    ['deepDive: MALFORMED frame is swallowed by the JSON.parse guard', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, malformedFrame: true, feed: fullFeed() }],
    ['deepDive: KEEPALIVE is answered', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, keepalive: true, feed: fullFeed() }],
    ['deepDive: AUTH is REFUSED → no channel → timeout', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, authState: 'UNAUTHORIZED', fireTimeout: true }],
    ['deepDive: a strike has no exact match → nearest-strike fallback', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({ eicLegs: Object.assign(legs(), { legs: Object.assign(legs().legs,
        { shortCall: { strike: 201.5, bid: 1, ask: 1.3 } }) }) })], tt: okTt, feed: fullFeed() }],
    // …the missing-DOM branch, on both the success and failure paths
    ['deepDive: NO #eicResults host, success path', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), noDom: true }],
    ['deepDive: NO #eicResults host, failure path', { fn: 'eicDXLinkDeepDive', args: ['AAA', null],
      scanData: [row({})], tt: () => ({}), noDom: true }],
    // eicRunDXLink — every branch it has
    ['runDXLink: ticker not found → toast → return', { fn: 'eicRunDXLink', args: ['ZZZ', null],
      scanData: [row({})], tt: okTt }],
    ['runDXLink: deep dive returns null → toast + warn → return', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: () => ({}) }],
    ['runDXLink: confidence none → extra toast, then continues', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, neverOpen: true, fireTimeout: true }],
    ['runDXLink: FULL success path — renders through the final messages', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed() }],
    ['runDXLink: APPROVED decision badge is green', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), finalDecision: 'APPROVED' }],
    ['runDXLink: APPROVED_WITH_CAUTION decision badge is amber', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), finalDecision: 'APPROVED_WITH_CAUTION' }],
    ['runDXLink: WATCHLIST_ONLY decision badge is orange', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), finalDecision: 'WATCHLIST_ONLY' }],
    ['runDXLink: AVOID decision badge is red', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), finalDecision: 'AVOID' }],
    ['runDXLink: BLOCKED_BY_CONTEXT decision badge is red', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), finalDecision: 'BLOCKED_BY_CONTEXT' }],
    ['runDXLink: PARTIAL confidence, success path', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: partialFeed(), fireTimeout: true }],
    ['runDXLink: callAgent REJECTS → catch → setAS err', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), agentReject: 'agent unavailable' }],
    ['runDXLink: agent says SCARTATO', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), agent: 'VERDICT SCARTATO no' }],
    ['runDXLink: agent says neither → NEUTRO', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), agent: 'nothing decisive here' }],
    ['runDXLink: macro context present', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), macro: 'ELEVATED' }],
    ['runDXLink: a prior eicSetupResult is reused instead of recomputed', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({ eicSetupResult: { setupGrade: 'STRONG', setupScore: 88, setupHardReject: null } })],
      tt: okTt, feed: fullFeed() }],
    ['runDXLink: NO #eicResults host', { fn: 'eicRunDXLink', args: ['AAA', null],
      scanData: [row({})], tt: okTt, feed: fullFeed(), noDom: true }],
  ];
  LDD_FIX_COUNT = LDD_FIX.length;

  /** Drive one fixture on one source, and return its settled transcript. */
  function driveLdd(fx, src) {
    let s;
    try { s = makeLdd(fx, src); }
    catch (e) { return Promise.resolve(['EVAL THREW | ' + String(e && e.message)]); }
    const fn = s.ctx[fx.fn];
    if (typeof fn !== 'function') return Promise.resolve(['NOT A FUNCTION | ' + fx.fn]);
    let p;
    try { p = fn.apply(null, fx.args); }
    catch (e) { s.rec('threw synchronously', String(e && e.name), String(e && e.message)); return Promise.resolve(s.T); }
    // A fixture that never settles is a real failure, and must look like one.
    // Without this race the whole PARITY_TAIL chain would simply stop, the final
    // summary would never print, and the suite would exit 0 having proved less
    // than it claims — the exact silent-green failure these contracts exist to
    // prevent.
    let hung;
    const timer = new Promise((res) => { hung = setTimeout(() => res('__HUNG__'), 15000); });
    if (hung && hung.unref) hung.unref();
    return Promise.race([Promise.resolve(p).then(() => '__DONE__', () => '__DONE__'), timer])
      .then((how) => { clearTimeout(hung); if (how === '__HUNG__') { s.rec('DID NOT SETTLE within 15s'); return s.T; } return null; })
      .then((early) => (early !== null ? early : Promise.resolve(p).then(
      (v) => { s.rec('resolved', v === null ? 'null' : v === undefined ? 'undefined' : typeof v);
        if (v && typeof v === 'object') s.rec('resolved.keys', Object.keys(v).sort().join(','));
        if (v && v.confidence !== undefined) s.rec('resolved.confidence', String(v.confidence));
        if (v && v.liveLegCount !== undefined) s.rec('resolved.liveLegCount', String(v.liveLegCount));
        // the scan-row mutation, as the caller would observe it
        const r = s.ctx.S.scanData[0];
        if (r) s.rec('row', 'eicLegsLive=' + (r.eicLegsLive ? r.eicLegsLive.confidence : 'absent'),
          'eicFinalDecision=' + (r.eicFinalDecision ? r.eicFinalDecision.finalTradingDecision : 'absent'),
          'eicFinalDecisionTicker=' + String(r.eicFinalDecisionTicker));
        return s.T; },
      (e) => { s.rec('rejected', String(e && e.name), String(e && e.message));
        const r = s.ctx.S.scanData[0];
        if (r) s.rec('row', 'eicLegsLive=' + (r.eicLegsLive ? r.eicLegsLive.confidence : 'absent'),
          'eicFinalDecision=' + (r.eicFinalDecision ? r.eicFinalDecision.finalTradingDecision : 'absent'),
          'eicFinalDecisionTicker=' + String(r.eicFinalDecisionTicker));
        return s.T; })));
  }

  // §12 mutates the real module through this guard, so a parity regression is
  // PROVED rather than asserted. It returns a promise, and §12's second pass
  // awaits it — a synchronous read would call every async mutant a survivor.
  const BASE_TRANSCRIPTS = [];
  PARITY_TAIL = PARITY_TAIL.then(() => {
    let chainP = Promise.resolve();
    for (const [, fx] of LDD_FIX) {
      chainP = chainP.then(() => driveLdd(fx, BASE_RUNTIME_LDD_SRC)).then((t) => { BASE_TRANSCRIPTS.push(t.join('\n')); });
    }
    return chainP;
  }).then(() => {
    LDD_TRANSCRIPT_GUARD = function (candidateSrc) {
      let chainP = Promise.resolve();
      const violations = [];
      LDD_FIX.forEach(([label, fx], i) => {
        chainP = chainP.then(() => driveLdd(fx, candidateSrc)).then((t) => {
          if (t.join('\n') !== BASE_TRANSCRIPTS[i]) violations.push('PARITY: [' + label + '] transcript differs');
        });
      });
      return chainP.then(() => ({ violations, threw: null }));
    };
    return LDD_TRANSCRIPT_GUARD(HEAD_LDD_SRC);
  }).then((res) => {
    LDD_DIFFS = res.violations.length;
    for (const v of res.violations) ok(false, '9F.x ' + v);
    eq(LDD_DIFFS, 0, '9F.3 all ' + LDD_FIX.length
      + ' fixtures produce IDENTICAL ordered transcripts on BASE and HEAD, awaited to settlement');

    // ── BRANCH COVERAGE, asserted from the transcripts themselves ───────────
    const all = BASE_TRANSCRIPTS.join('\n');
    ok(all.indexOf("ttCall | /eic/legs/AAA") >= 0, '9F.4 branch: eicFetchLegs hit its endpoint');
    ok(all.indexOf('resolved | object') >= 0, '9F.5 branch: a success path resolved with a payload');
    ok(all.indexOf('resolved | null') >= 0, '9F.6 branch: a failure path resolved with null');
    ok(all.indexOf('ttCall | /quote-token') >= 0, '9F.7 branch: the CREDENTIAL call was made');
    ok(/logEv \| earnings-ic \| DXLink deepdive failed: Quote token non disponibile/.test(all),
      '9F.8 branch: the missing-quote-token path threw and was caught');
    ok(/DXLink deepdive failed: Chain symbols non disponibili/.test(all),
      '9F.9 branch: the missing-chain-symbols path threw and was caught');
    ok(/DXLink deepdive failed: Leg data non disponibile/.test(all),
      '9F.10 branch: the MALFORMED/missing leg-data path threw and was caught');
    ok(/DXLink deepdive failed: token transport down/.test(all),
      '9F.11 branch: a TRANSPORT rejection propagated into the catch');
    ok(all.indexOf('ttCall | /eic/chain-symbols/AAA?expiration=2026-02-20') >= 0,
      '9F.12 branch: the expiration argument reached the chain URL');
    ok(all.indexOf('ttCall | /eic/chain-symbols/AAA') >= 0, '9F.13 branch: …and the no-expiration form exists too');
    ok(all.indexOf('new WebSocket | wss://fake/rt') >= 0, '9F.14 branch: the DXLink socket was opened at the URL the token supplied');
    ok(all.indexOf('ws.send | SETUP') >= 0 && all.indexOf('ws.send | AUTH') >= 0
      && all.indexOf('ws.send | CHANNEL_REQUEST') >= 0 && all.indexOf('ws.send | FEED_SETUP') >= 0
      && all.indexOf('ws.send | FEED_SUBSCRIPTION') >= 0,
      '9F.15 branch: the full DXLink handshake ran — SETUP → AUTH → CHANNEL_REQUEST → FEED_SETUP → FEED_SUBSCRIPTION');
    ok(all.indexOf('ws.send | KEEPALIVE') >= 0, '9F.16 branch: a KEEPALIVE was answered');
    ok(all.indexOf('resolved.confidence | high') >= 0, '9F.17 branch: a FULL feed produced confidence=high');
    ok(all.indexOf('resolved.confidence | partial') >= 0, '9F.18 branch: a PARTIAL feed produced confidence=partial');
    ok(all.indexOf('resolved.confidence | none') >= 0, '9F.19 branch: the 0-leg timeout produced confidence=none');
    ok(all.indexOf('resolved.liveLegCount | 4/4') >= 0 && all.indexOf('resolved.liveLegCount | 0/4') >= 0,
      '9F.20 branch: both the 4/4 and 0/4 leg counts were produced');
    ok(all.indexOf('setTimeout | 9000') >= 0, '9F.21 branch: the 9-second timeout budget was armed, unchanged');
    ok(all.indexOf('getElementById | eicResults | null') >= 0,
      '9F.22 branch: the MISSING-DOM path ran — every `if(res)` guard was exercised with res falsy');
    ok(all.indexOf('getElementById | eicResults | found') >= 0, '9F.23 branch: …and the present-DOM path too');
    ok(all.indexOf('querySelector | eicResults | .dxlink-status | null') >= 0
      && all.indexOf('createElement | div') >= 0 && all.indexOf('appendChild | eicResults | dxlink-status') >= 0,
      '9F.24 branch: the status element was created on first use and reused after');
    ok(all.indexOf('showToast | Ticker non trovato | warn') >= 0, '9F.25 branch: eicRunDXLink’s not-found guard');
    ok(all.indexOf('showToast | DXLink: errore critico per AAA | warn') >= 0,
      '9F.26 branch: eicRunDXLink’s null-liveData guard');
    ok(all.indexOf('showToast | DXLink: 0/4 legs — output con dati DELAYED/ESTIMATED | warn') >= 0,
      '9F.27 branch: eicRunDXLink’s confidence=none warning, which then CONTINUES');
    ok(all.indexOf('callAgent | earnings-ic') >= 0, '9F.28 branch: the agent was called with the generated context');
    ok(/logEv \| earnings-ic \| DXLink re-analysis error: agent unavailable \| err/.test(all),
      '9F.29 branch: a REJECTING agent was caught and reported');
    ok(all.indexOf('computeFinalDecision') >= 0, '9F.30 branch: the final-decision layer ran');
    ok(all.indexOf('row | eicLegsLive=high') >= 0, '9F.31 branch: the scan ROW was mutated with live data');
    ok(all.indexOf('eicFinalDecision=TRADE_SMALL') >= 0, '9F.32 branch: …and with the final decision');
    // THE REPAIR: the former ReferenceError is gone and the success path now
    // reaches rendering, both messages and the final success log.
    ok(all.indexOf('fdColor is not defined') < 0,
      '9F.33 REPAIR: no success fixture reports the former fdColor ReferenceError');
    ok(all.indexOf('appendSysMsg | &#9670; EIC DXLink AAA:') >= 0,
      '9F.34 the success path reaches appendSysMsg after rendering the live card');
    ok(all.indexOf('appendAgentMsg | earnings-ic | [DXLINK DEEP DIVE - AAA]') >= 0,
      '9F.35 …and reaches appendAgentMsg with the completed analysis');
    ok(/logEv \| earnings-ic \| DXLink re-analysis AAA: .* \| 4\/4 live \| ok/.test(all),
      '9F.36 …and records the final successful re-analysis log');
    for (const [decision, color, labelNeedle] of [
      ['APPROVED', 'var(--gr)', 'APPROVED decision'],
      ['APPROVED_WITH_CAUTION', 'var(--am)', 'APPROVED_WITH_CAUTION decision'],
      ['WATCHLIST_ONLY', '#f97316', 'WATCHLIST_ONLY decision'],
      ['AVOID', 'var(--rd)', 'AVOID decision'],
      ['BLOCKED_BY_CONTEXT', 'var(--rd)', 'BLOCKED_BY_CONTEXT decision'],
      ['TRADE_SMALL', 'var(--tx2)', 'FULL success path'],
    ]) {
      const fxIndex = LDD_FIX.findIndex(([label]) => label.indexOf(labelNeedle) >= 0);
      const transcript = fxIndex >= 0 ? BASE_TRANSCRIPTS[fxIndex] : '';
      ok(transcript.indexOf('eicFinalDecision=' + decision) >= 0 && transcript.indexOf('fdColor=' + color) >= 0,
        '9F.37 decision ' + decision + ' renders with ' + color);
    }
    note('live-deep-dive parity — ' + LDD_FIX.length + ' fixtures · differences ' + LDD_DIFFS);
  });
} else {
  ok(true, '9F.3 live-deep-dive parity skipped: the post-PR3 base blob is unavailable in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9G. PR 4 CROSS-MODULE RESOLUTION — the FORWARD edge, proved not assumed');
//
// §9F evaluates the four declarations in isolation. That proves the bytes behave
// identically; it does NOT prove that, in the real document, the boundary this
// PR creates actually resolves. And this boundary is the interesting one,
// because it points FORWARD:
//
//   js/ui/eic-ticker-analysis-panel.js loads BEFORE js/ui/eic-live-deep-dive.js
//   and calls eicRunDXLink.
//
// Every previous EIC PR could lean on load ORDER: the callee shipped first. Here
// the CALLER ships first, so ordering proves nothing and the edge is safe for a
// different reason entirely — the reference sits inside an addEventListener
// callback and is resolved off the global scope when the user CLICKS, long after
// every script has evaluated. "Should be fine" is not a proof, so the whole
// application is evaluated here in its real classic-script order and then
// DRIVEN, and the resolved function's own text is compared against the file it
// must have come from.
//
// The BASE side is the POST-PR3 application: the same scripts minus this module,
// with the monolith replaced by the post-PR3 monolith that still carries the
// four declarations inline.
// ═════════════════════════════════════════════════════════════════════════════
let XLDD_DIFFS = 0;
if (BASE_PR3_MONO) {
  const permissive4 = () => {
    const p = new Proxy(function () {}, {
      get(t, k) { if (k === Symbol.toPrimitive || k === 'toString' || k === Symbol.toStringTag) return () => ''; return p; },
      set() { return true; }, apply() { return p; }, construct() { return p; }, has() { return true; },
    });
    return p;
  };
  function makeAppCtx4() {
    const permissive = permissive4();
    const ctx = {
      console: { log() {}, warn() {}, error() {} },
      Math, JSON, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt,
      RegExp, Error, Promise, Set, Map,
      document: permissive, window: permissive, localStorage: permissive,
      sessionStorage: permissive, navigator: permissive, location: permissive,
      setTimeout() { return 0; }, setInterval() { return 0; }, clearTimeout() {}, clearInterval() {},
      fetch() { return Promise.resolve(permissive); }, WebSocket: function () { return permissive; },
      requestAnimationFrame() { return 0; }, alert() {},
    };
    class FixedDate extends Date {
      constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
      static now() { return FIXED_NOW; }
    }
    ctx.Date = FixedDate;
    vm.createContext(ctx);
    return ctx;
  }
  const HEAD4 = ORDERED.filter((s) => s.isAppJs && s.code != null)
    .map((s) => ({ label: String(s.src || '(monolith)'), code: s.code }));
  const BASE4 = HEAD4
    .filter((p) => p.label !== G.LIVE_DEEP_DIVE_SRC_ATTR)
    .map((p) => (p.label === '(monolith)' ? { label: p.label, code: BASE_PR3_RUNTIME_MONO } : p));
  eq(HEAD4.length - BASE4.length, 1,
    '9G.1 BASE loads exactly one script fewer — the live-deep-dive module did not exist after PR 3');

  function evalApp4(parts) {
    const ctx = makeAppCtx4();
    const failures = [];
    for (const p of parts) {
      try { vm.runInContext(p.code, ctx, { filename: p.label, timeout: 30000 }); }
      catch (e) { failures.push(p.label + ': ' + String(e && e.message)); }
    }
    return { ctx, failures };
  }
  const HEAD_APP4 = evalApp4(HEAD4);
  const BASE_APP4 = evalApp4(BASE4);
  deepEq(HEAD_APP4.failures, [], '9G.2 every script in HEAD load order evaluated without error');
  deepEq(BASE_APP4.failures, [], '9G.3 …and every script in BASE load order too');

  // WHERE each binding came from, after the FULL load. This is what actually
  // proves the relocation: on HEAD each global must be the TEXT OF THE FILE it
  // came from, byte for byte.
  {
    const lddText = (nm, occ) => { const d = LDD_DECLS.filter((x) => x.name === nm)[occ || 0]; return LDD_SRC.slice(d.start, d.end + 1); };
    const rulesText = (nm) => { const d = MODULE_DECLS.filter((x) => x.name === nm)[0]; return MODULE_SRC.slice(d.start, d.end + 1); };
    const panelText = (nm) => { const d = PANEL_DECLS.filter((x) => x.name === nm)[0]; return PANEL_SRC.slice(d.start, d.end + 1); };
    const monoCode4 = ORDERED[MONO_SLOT].code;
    for (const nm of G.LIVE_DEEP_DIVE_NAMES) {
      eq(typeof HEAD_APP4.ctx[nm], 'function', '9G.4 HEAD resolves ' + nm + ' as a global function');
      ok(LDD_SRC.indexOf(String(HEAD_APP4.ctx[nm])) >= 0,
        '9G.5 …and the resolved function text comes from js/ui/eic-live-deep-dive.js');
      ok(monoCode4.indexOf(String(HEAD_APP4.ctx[nm])) < 0,
        '9G.6 …and is NOT found in the inline monolith — nothing was left behind');
      eq(String(HEAD_APP4.ctx[nm]), String(BASE_APP4.ctx[nm]),
        '9G.7 …byte-identical after applying the one approved fdColor repair to the BASE-side runner');
    }
    // The duplicate: the LATER declaration is the surviving binding.
    eq(String(HEAD_APP4.ctx.eicFetchLegs), lddText('eicFetchLegs', 1),
      '9G.8 the surviving eicFetchLegs binding is the SECOND declaration — hoisting means the later one wins');
    eq(lddText('eicFetchLegs', 0), lddText('eicFetchLegs', 1),
      '9G.9 …and because the copies are byte-identical, the winner is indistinguishable from the loser');
    // The other three owners still resolve out of their own modules.
    eq(String(HEAD_APP4.ctx.eicScreenTicker), rulesText('eicScreenTicker'), '9G.10 eicScreenTicker still comes from js/services/eic-screening-rules.js');
    eq(String(HEAD_APP4.ctx.eicBuildLiveContext), rulesText('eicBuildLiveContext'), '9G.11 …and so does eicBuildLiveContext');
    eq(String(HEAD_APP4.ctx.runEICPanel), panelText('runEICPanel'), '9G.12 runEICPanel still comes from js/ui/eic-panel.js');
    eq(String(HEAD_APP4.ctx.eicAnalyzeTicker), TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1),
      '9G.13 eicAnalyzeTicker still comes from js/ui/eic-ticker-analysis-panel.js');
    // ALL ELEVEN sites now resolve out of a module. Nothing EIC remains inline.
    const monoDecls = scanTopLevelDeclarations(monoCode4).filter(G.isEicFamilyDecl);
    eq(monoDecls.length, 0, '9G.14 the loaded monolith declares ZERO EIC sites — the family is entirely modular');
  }

  // ── DRIVE THE FORWARD EDGE ────────────────────────────────────────────────
  // Collaborators are installed AFTER full evaluation, so the lookups the
  // application performs are the real ones. eicRunDXLink is NOT replaced before
  // it is captured: the real binding is read first, then wrapped, so the wrapper
  // proves the real one was reachable at click time.
  function drive4(app, opts) {
    const T = [];
    const rec = (...a) => T.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' | '));
    const c = app.ctx;
    const realDx = c.eicRunDXLink;
    rec('eicRunDXLink.captured', 'typeof=' + typeof realDx, 'chars=' + String(realDx).length);
    c.eicRunDXLink = function (t, e) { rec('eicRunDXLink CALLED', String(t), String(e), 'realWasFunction=' + (typeof realDx === 'function')); };
    const realScreen = c.eicScreenTicker;
    c.eicScreenTicker = function (d) { const r = realScreen.apply(this, arguments); rec('eicScreenTicker', d.ticker, r ? r.screenScore : null); return r; };
    c.setAS = (...a) => rec('setAS', ...a);
    c.showToast = (...a) => rec('showToast', ...a);
    c.appendSysMsg = (...a) => rec('appendSysMsg', ...a);
    c.appendAgentMsg = (...a) => rec('appendAgentMsg', ...a);
    c.logEv = (...a) => rec('logEv', ...a);
    c.callAgent = function (a, ctxStr) { rec('callAgent', a, 'ctxChars=' + String(ctxStr).length); return Promise.resolve('APPROVATO ok'); };
    const el = (id) => {
      let last = '';
      return {
        getAttribute(a) { return id + ':' + a; },
        set innerHTML(v) { last = String(v); rec('innerHTML', id, last.length); }, get innerHTML() { return last; },
        querySelector(sel) {
          const hit = last.indexOf('eic-dxlink-btn') >= 0;
          rec('querySelector', sel, hit ? 'found' : 'null');
          return hit ? el('dxbtn') : null;
        },
        addEventListener(ev, fn) { rec('addEventListener', id, ev); try { fn.call(this); } catch (e) { rec('handler.threw', String(e && e.name)); } },
      };
    };
    c.document = { getElementById: (id) => { rec('getElementById', id); return el(id); },
      querySelectorAll: (s) => { rec('querySelectorAll', s); return [el('c0')]; } };
    const appS = vm.runInContext('S', c);
    Object.assign(appS, { scanData: [], ttConnected: false, lastScan: null,
      marketContextRisk: null, marketContextSummary: null }, opts.S);
    return c.eicAnalyzeTicker(opts.ticker)
      .then(() => { rec('eicAnalyzeTicker resolved'); return T; })
      .catch((e) => { rec('eicAnalyzeTicker rejected', String(e && e.message)); return T; });
  }

  const isoZ4 = (d) => new Date(FIXED_NOW + d * 86400000).toISOString();
  const scanRow4 = (o) => Object.assign({ ticker: 'AAA', name: 'Alpha', price: 190, ivRank: 70, iv: 0.35,
    iv30: 0.3, volume: 3000000, liq: 1, bid: 189.98, ask: 190.02, rsi: 60, beta: 1.1,
    score: 70, signal: 'LONG', squeeze: 'OFF', ma200dist: '+5%', nextEarnings: isoZ4(7) }, o);
  const XLDD_FIX = [
    ['ttConnected → the DXLink click path runs', { S: { scanData: [scanRow4({})], ttConnected: true }, ticker: 'AAA' }],
    ['not connected → no DXLink button', { S: { scanData: [scanRow4({})] }, ticker: 'AAA' }],
    ['ticker absent → guard clause', { S: { scanData: [] }, ticker: 'ZZZ' }],
  ];

  PARITY_TAIL = PARITY_TAIL.then(() => {
    let chain = Promise.resolve();
    const seen = [];
    for (const [label, opts] of XLDD_FIX) {
      chain = chain.then(() => Promise.all([drive4(evalApp4(BASE4), opts), drive4(evalApp4(HEAD4), opts)])
        .then(([a, b]) => {
          const sa = a.join('\n'), sb = b.join('\n');
          if (sa !== sb) { XLDD_DIFFS++; ok(false, '9G.x cross-module transcript differs for [' + label + ']'); }
          seen.push(sa);
        }));
    }
    return chain.then(() => {
      eq(XLDD_DIFFS, 0,
        '9G.15 invoking eicAnalyzeTicker through the FULLY LOADED application gives identical transcripts on BASE and HEAD');
      const all = seen.join('\n');
      // THE FORWARD EDGE, proved three ways.
      ok(all.indexOf('eicRunDXLink CALLED | dxbtn:data-ticker') >= 0 && all.indexOf('realWasFunction=true') >= 0,
        '9G.16 FORWARD EDGE: eicRunDXLink — declared in a module that loads AFTER its caller — was already bound and resolved at CLICK TIME');
      ok(all.indexOf('addEventListener | dxbtn | click') >= 0,
        '9G.17 …the edge is traversed through a real addEventListener("click", …) registration, not a direct call');
      ok(all.indexOf('handler.threw') < 0,
        '9G.18 …and the click callback did NOT throw — the binding existed when the event fired');
      ok(all.indexOf('eicScreenTicker | AAA') >= 0,
        '9G.19 the BACKWARD edge into PR 1s module still resolves at call time');
      ok(all.indexOf('showToast | Ticker ZZZ non trovato') >= 0, '9G.20 the guard-clause path ran identically on both sides');
      note('PR4 cross-module — ' + XLDD_FIX.length + ' fixtures through ' + HEAD4.length
        + ' ordered scripts · differences ' + XLDD_DIFFS);
    });
  });

  // The captured binding is the SHIPPED text, checked outside the transcript so
  // a wrapper cannot be what satisfies the claim.
  {
    const captured = String(HEAD_APP4.ctx.eicRunDXLink);
    eq(captured, LDD_SRC.slice(LDD_DECLS[3].start, LDD_DECLS[3].end + 1),
      '9G.21 the eicRunDXLink the click handler would resolve IS the text of js/ui/eic-live-deep-dive.js, byte for byte');
    const historicalRun = LDD_EXTRACTION_DECLS.filter((d) => d.name === 'eicRunDXLink')[0];
    eq(sha256(LDD_EXTRACTION_SRC.slice(historicalRun.start, historicalRun.end + 1)),
      G.EXPECTED_LIVE_DEEP_DIVE.spanSha.eicRunDXLink,
      '9G.22 projecting away the approved fix still hashes to the SHA-256 recorded from the base blob');
  }
} else {
  ok(true, '9G.15 PR 4 cross-module proof skipped: the post-PR3 base blob is unavailable in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
section('10. THE REST OF THE APPLICATION IS UNTOUCHED');
// ═════════════════════════════════════════════════════════════════════════════
if (BASE_MONO) {
  const baseDecls = scanTopLevelDeclarations(BASE_MONO);
  const APP_DECLS = scanTopLevelDeclarations(APP_SRC);
  const baseMap = {}, headMap = {};
  for (const d of baseDecls) (baseMap[d.name] = baseMap[d.name] || []).push(BASE_MONO.slice(d.start, d.end + 1));
  for (const d of APP_DECLS) (headMap[d.name] = headMap[d.name] || []).push(APP_SRC.slice(d.start, d.end + 1));
  // Application-wide conservation is the extraction proof, so compare the PR 4
  // historical projection here; current runtime behaviour is proved in §9F/G.
  for (const n of G.LIVE_DEEP_DIVE_NAMES) {
    headMap[n] = LDD_EXTRACTION_DECLS.filter((d) => d.name === n)
      .map((d) => LDD_EXTRACTION_SRC.slice(d.start, d.end + 1));
  }
  let missing = 0, changed = 0;
  for (const n of Object.keys(baseMap)) {
    if (!headMap[n]) { missing++; continue; }
    if (baseMap[n].length !== headMap[n].length) { changed++; continue; }
    for (let i = 0; i < baseMap[n].length; i++) if (baseMap[n][i] !== headMap[n][i]) { changed++; break; }
  }
  eq(missing, 0, '10.1 no declaration disappeared from the application');
  eq(changed, 0, '10.2 no extracted declaration body changed after projecting away the one approved functional repair');
  eq(baseDecls.length - INLINE_DECLS.length, 11,
    '10.3 the inline monolith lost exactly ELEVEN declaration sites — four for PR 1, two for PR 2, one for PR 3, four for PR 4: the whole family');
} else {
  ok(true, '10.1 whole-file comparison skipped: base blob unavailable');
}
let parseErr = null;
try { new vm.Script(APP_SRC, { filename: 'reconstructed-app.js' }); } catch (e) { parseErr = e; }
ok(parseErr === null, '10.4 the reconstructed application parses' + (parseErr ? ' — ' + parseErr.message : ''));

// ═════════════════════════════════════════════════════════════════════════════
section('11. THE UNDO CHAIN');
//
// FOUR links now, newest first: PR 4, then PR 3, then PR 2, then PR 1. Each PR's
// recorded offsets are positions in the monolith AS IT WAS WHEN THAT PR WAS CUT,
// so the order is not a convention — undoing an older PR first would reinsert
// text ABOVE a newer PR's offset and land its region inside another function's
// body, producing a plausible-looking document that is silently wrong. Each link
// is proved by hash on its own, the whole chain is proved end to end, and every
// wrong order is proved to fail rather than pass by luck.
//
// The one valid cumulative order is:
//
//     undo PR4 → post-PR3 → undo PR3 → post-PR2 → undo PR2 → post-PR1
//              → undo PR1 → post-PESS
// ═════════════════════════════════════════════════════════════════════════════
{
  // ── link -1: undo PR 4, landing on the post-PR3 application ───────────────
  const r4 = EIC_UNDO4.regionTexts();
  eq(r4.length, 4, '11.00a exactly four regions are derived from the shipped live-deep-dive module');
  deepEq(EIC_UNDO4.REGION_OFFSETS.map((r) => r.name), G.EXPECTED_LIVE_DEEP_DIVE.order,
    '11.00b …with the recorded names, in the recorded physical order');
  deepEq(r4.map((r) => r.length), EIC_UNDO4.REGION_OFFSETS.map((r) => r.chars), '11.00c …and the recorded lengths');
  eq(r4.reduce((a, r) => a + r.length, 0), EIC_UNDO4.REGION_TOTAL_CHARS, '11.00d the regions total 24,176 chars');
  eq(EIC_UNDO4.REGION_TOTAL_CHARS - G.EXPECTED_LIVE_DEEP_DIVE.chars, 450,
    '11.00e …450 more than the 23,726 declaration chars — three attached comment blocks and four separators');
  // The attachment rule resolves the four sites DIFFERENTLY, and each outcome is
  // pinned so a future edit cannot quietly reclassify one.
  ok(/^\/\/ ── eicFetchLegs:/.test(r4[0]), '11.00f site 1 carries its attached comment block');
  ok(/^\/\/ ── eicFetchLegs:/.test(r4[1]), '11.00g …and so does site 2');
  ok(r4[2].indexOf('async function eicDXLinkDeepDive(ticker, expiration){') === 0,
    '11.00h site 3 begins AT the declaration — the DXLINK banner above it is separated by a blank line and STAYS inline');
  ok(/^\/\/ ── eicRunDXLink:/.test(r4[3]), '11.00i site 4 carries its one attached comment line');
  // The two eicFetchLegs regions are byte-identical to each other, and BOTH are
  // reinserted. Dropping one still yields valid JS, so only the hash notices.
  eq(r4[0], r4[1], '11.00j the two eicFetchLegs regions are byte-identical to one another');
  eq(sha256(r4[0]), sha256(r4[1]), '11.00k …by SHA-256 as well as by string comparison');
  // The banner and the S.eicShowAll comment PR 3 left behind must still be in
  // index.html: neither belongs to any PR 4 region.
  eq((HTML.match(/\/\/ S\.eicShowAll: toggle to show all candidates including hard-rejected/g) || []).length, 1,
    '11.00l the S.eicShowAll comment PR 3 left inline is STILL inline — PR 4 did not take it either');
  ok(HTML.indexOf('// DXLINK ON-DEMAND — real-time option data for EIC deep dive') >= 0,
    '11.00m the DXLINK banner comment stayed in index.html');
  ok(LDD_SRC.indexOf('// DXLINK ON-DEMAND — real-time option data for EIC deep dive') < 0,
    '11.00n …and did NOT travel into the module');
  eq(HTML.split(EIC_UNDO4.TAG + '\n').length - 1, 1, '11.00o the PR 4 tag appears exactly once and is removed exactly once');
  const undone4 = EIC_UNDO4.postPr3Html(HTML);
  eq(undone4.verified, true, '11.00p undoing EIC PR 4 reproduces the post-PR3 document byte-exactly (' + undone4.reason + ')');
  eq(undone4.html ? undone4.html.length : -1, EIC_UNDO4.POST_PR3_INDEX_CHARS, '11.00q …at the recorded character count');
  eq(undone4.html ? sha256(undone4.html) : null, EIC_UNDO4.POST_PR3_INDEX_SHA256, '11.00r …and the recorded SHA-256');
  deepEq(EIC_UNDO4.declarationTexts().map((t) => sha256(t)), EIC_UNDO4.DECLARATION_SHA256,
    '11.00s each shipped declaration still hashes to the SHA recorded from the base blob');
  deepEq(EIC_UNDO4.declarationTexts().map((t) => t.length), EIC_UNDO4.DECLARATION_CHARS_EACH,
    '11.00t …at the recorded per-site lengths [144, 144, 12815, 10623]');

  // Everything below runs from that verified intermediate, not from HEAD.
  const POST_PR3 = undone4.verified ? undone4.html : HTML;

  // ── link 0: undo PR 3, landing on the post-PR2 application ────────────────
  const r3 = EIC_UNDO3.regionTexts();
  eq(r3.length, 1, '11.0a exactly one region is derived from the shipped ticker-analysis module');
  deepEq(EIC_UNDO3.REGION_OFFSETS.map((r) => r.name), G.EXPECTED_TICKER_ANALYSIS.order, '11.0b …with the recorded name');
  deepEq(r3.map((r) => r.length), EIC_UNDO3.REGION_OFFSETS.map((r) => r.chars), '11.0c …and the recorded length');
  eq(EIC_UNDO3.REGION_TOTAL_CHARS, 13992, '11.0d the region is 13,992 chars');
  eq(EIC_UNDO3.REGION_TOTAL_CHARS - G.EXPECTED_TICKER_ANALYSIS.chars, 2,
    '11.0e …exactly two more than the 13,990 declaration chars — the blank-line separator, and NO attached comment');
  // §10's rule applied to THIS declaration yields no comment, and that is a
  // measured fact rather than an omission: the identical comment text
  // `// S.eicShowAll:` appeared TWICE in the pre-PR2 monolith — attached to
  // runEICPanel with no blank line (so PR 2 correctly took it) and separated
  // from eicAnalyzeTicker by a blank line (so PR 3 correctly leaves it). Pin
  // both halves, because taking it would have deleted a comment the panel needs
  // and would have broken this round-trip.
  ok(!/^\s*\/\//.test(r3[0]), '11.0f the derived region does NOT begin with a comment');
  ok(r3[0].indexOf('async function eicAnalyzeTicker(ticker){') === 0, '11.0g …it begins at the declaration itself');
  ok(TA_SRC.indexOf('// S.eicShowAll: toggle to show all candidates including hard-rejected') < 0,
    '11.0h the S.eicShowAll comment did NOT travel into the ticker-analysis module');
  eq((POST_PR3.match(/\/\/ S\.eicShowAll: toggle to show all candidates including hard-rejected/g) || []).length, 1,
    '11.0i …it was still in index.html at post-PR3, exactly where it always was');
  eq((PANEL_SRC.match(/\/\/ S\.eicShowAll: toggle to show all candidates including hard-rejected/g) || []).length, 1,
    '11.0j …and the OTHER copy is the one PR 2 legitimately took into the panel');
  eq(POST_PR3.split(EIC_UNDO3.TAG + '\n').length - 1, 1, '11.0k the PR 3 tag appears exactly once and is removed exactly once');
  const undone3 = EIC_UNDO3.postPr2Html(POST_PR3);
  eq(undone3.verified, true, '11.0l undoing EIC PR 3 reproduces the post-PR2 document byte-exactly (' + undone3.reason + ')');
  eq(undone3.html ? undone3.html.length : -1, EIC_UNDO3.POST_PR2_INDEX_CHARS, '11.0m …at the recorded character count');
  eq(undone3.html ? sha256(undone3.html) : null, EIC_UNDO3.POST_PR2_INDEX_SHA256, '11.0n …and the recorded SHA-256');
  eq(EIC_UNDO3.sha256(EIC_UNDO3.declarationText() || ''), EIC_UNDO3.DECLARATION_SHA256,
    '11.0o the shipped declaration still hashes to the SHA recorded from the base blob');

  // Everything below runs from that verified intermediate, not from HEAD.
  const POST_PR2 = undone3.verified ? undone3.html : HTML;

  // ── link 1: undo PR 2, landing on the post-PR1 application ────────────────
  const r2 = EIC_UNDO2.regionTexts();
  eq(r2.length, 2, '11.1 exactly two regions are derived from the shipped panel module');
  deepEq(EIC_UNDO2.REGION_OFFSETS.map((r) => r.name), G.EXPECTED_PANEL.order, '11.2 …in the recorded order');
  deepEq(r2.map((r) => r.length), EIC_UNDO2.REGION_OFFSETS.map((r) => r.chars), '11.3 …with the recorded lengths');
  eq(r2.reduce((a, r) => a + r.length, 0), EIC_UNDO2.REGION_TOTAL_CHARS,
    '11.4 …totalling ' + EIC_UNDO2.REGION_TOTAL_CHARS + ' region chars');
  ok(EIC_UNDO2.REGION_TOTAL_CHARS > G.EXPECTED_PANEL.chars,
    '11.5 region chars exceed declaration chars, because a region is declaration + attached comment + separator');
  eq(POST_PR2.split(EIC_UNDO2.TAG + '\n').length - 1, 1, '11.6 the PR 2 tag appears exactly once and is removed exactly once');
  const undone2 = EIC_UNDO2.postPr1Html(POST_PR2);
  eq(undone2.verified, true, '11.7 undoing EIC PR 2 reproduces the post-PR1 document byte-exactly (' + undone2.reason + ')');
  eq(undone2.html ? undone2.html.length : -1, EIC_UNDO2.POST_PR1_INDEX_CHARS, '11.8 …at the recorded character count');
  eq(undone2.html ? sha256(undone2.html) : null, EIC_UNDO2.POST_PR1_INDEX_SHA256, '11.9 …and the recorded SHA-256');

  // ── link 2: PR 1's helper, run against that intermediate ──────────────────
  const POST_PR1 = undone2.verified ? undone2.html : HTML;
  const regions = EIC_UNDO.regionTexts();
  eq(regions.length, 4, '11.10 exactly four regions are derived from the PR 1 module');
  deepEq(EIC_UNDO.REGION_OFFSETS.map((r) => r.name), G.EXPECTED_MODULE.order, '11.11 …in the recorded order');
  deepEq(regions.map((r) => r.length), EIC_UNDO.REGION_OFFSETS.map((r) => r.chars), '11.12 …with the recorded lengths');
  const undone = EIC_UNDO.postPessHtml(POST_PR1);
  eq(undone.verified, true, '11.13 undoing EIC PR 1 from there reproduces the post-PESS document (' + undone.reason + ')');
  eq(undone.html ? undone.html.length : -1, EIC_UNDO.POST_PESS_INDEX_CHARS, '11.14 …at the recorded character count');
  eq(undone.html ? sha256(undone.html) : null, EIC_UNDO.POST_PESS_INDEX_SHA256, '11.15 …and the recorded SHA-256');

  // ── the chain as one call ─────────────────────────────────────────────────
  const chain = EIC_UNDO4.postPessHtml(HTML);
  eq(chain.verified, true, '11.16 the full chain HEAD → post-PR3 → post-PR2 → post-PR1 → post-PESS verifies end to end (' + chain.reason + ')');
  eq(chain.html ? sha256(chain.html) : null, EIC_UNDO.POST_PESS_INDEX_SHA256,
    '11.17 …and lands on exactly the same document as the four links run by hand');
  // COMPLETE EIC RECONSTRUCTION: the pre-EIC document, byte for byte. §4 pins
  // that BASE_INDEX_SHA256 is the blob at BASE_REF, so this is a reconstruction
  // of a real historical document rather than agreement with a literal.
  eq(chain.html ? chain.html.length : -1, EIC_UNDO.POST_PESS_INDEX_CHARS,
    '11.17b …at the pre-EIC character count');
  eq(EIC_UNDO.POST_PESS_INDEX_SHA256, BASE_INDEX_SHA256,
    '11.17c …and that document IS the §4 base the whole family was cut from');

  // ── ORDER IS LOAD-BEARING ─────────────────────────────────────────────────
  // Undoing PR 1 first, against a document PR 2 has already been cut from,
  // must NOT quietly succeed.
  const wrongOrder = EIC_UNDO.postPessHtml(HTML);
  ok(!wrongOrder.verified,
    '11.18 undoing PR 1 FIRST fails loudly — the chain order is a real constraint, not a convention');
  const wrongOrder2 = EIC_UNDO2.postPr1Html(HTML);
  ok(!wrongOrder2.verified,
    '11.18b undoing PR 2 before PR 4 fails too — PR 2 reinserts 15,343 chars ABOVE PR 4s offsets, so its regions would land inside other bodies');
  const wrongOrder3 = EIC_UNDO2.postPessHtml(HTML);
  ok(!wrongOrder3.verified,
    '11.18c …and so does the PR2-rooted whole-chain call, which no longer owns the newest link');
  // The newest wrong order, and the one this PR introduces: PR 3 before PR 4.
  const wrongOrder4 = EIC_UNDO3.postPr2Html(HTML);
  ok(!wrongOrder4.verified,
    '11.18d undoing PR 3 BEFORE PR 4 fails — PR 4 removed 24,176 chars BELOW PR 3s offset, so PR 3s region would land ~24 k characters late');
  const wrongOrder5 = EIC_UNDO3.postPessHtml(HTML);
  ok(!wrongOrder5.verified,
    '11.18e …and the PR3-rooted whole-chain call fails for the same reason: it no longer owns the newest link');
  // Every wrong order fails; only the one valid cumulative order verifies.
  eq([wrongOrder, wrongOrder2, wrongOrder3, wrongOrder4, wrongOrder5].filter((r) => r.verified).length, 0,
    '11.18f all FIVE wrong orders fail; exactly one order reconstructs the family');

  // ── NEGATIVE CONTROL — the hash check must be load-bearing ────────────────
  const fake2 = EIC_UNDO2.regionTexts().slice();
  const before = fake2[0];
  fake2[0] = fake2[0].replace("S.eicShowAll=false", "S.eicShowAll=true");
  ok(fake2[0] !== before, '11.19 negative control: one byte of the panel module was changed in memory');
  const rebuilt = (function () {
    let out = POST_PR2.replace(EIC_UNDO2.TAG + '\n', '');
    const inl = L.parseScriptTags(out).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
    const monoAt = out.indexOf(inl[0].inline);
    const spans = EIC_UNDO2.REGION_OFFSETS.map((r, i) => ({ off: r.monoOffset, text: fake2[i] }));
    for (const s of spans.slice().sort((a, b) => a.off - b.off)) out = out.slice(0, monoAt + s.off) + s.text + out.slice(monoAt + s.off);
    return out;
  })();
  ok(sha256(rebuilt) !== EIC_UNDO2.POST_PR1_INDEX_SHA256,
    '11.20 …so the reconstruction NO LONGER matches the post-PR1 hash — the check is load-bearing, not decorative');

  // ── NEGATIVE CONTROL for PR 4 — an EQUAL-LENGTH one-byte mutation ─────────
  // Deliberately length-preserving: if the reconstruction only ever noticed a
  // size change, this mutation would slip through. The regions still total
  // 24,176 chars and every length check still passes; only the HASH catches it.
  {
    const fake4 = EIC_UNDO4.regionTexts().slice();
    const before = fake4[2];
    fake4[2] = fake4[2].replace("acceptDataFormat:'FULL'", "acceptDataFormat:'full'");
    ok(fake4[2] !== before, '11.21 negative control: exactly one byte of the live-deep-dive module was changed in memory');
    eq(fake4[2].length, before.length, '11.22 …and the mutation is EQUAL-LENGTH, so no length check can catch it');
    eq(fake4.reduce((a, r) => a + r.length, 0), EIC_UNDO4.REGION_TOTAL_CHARS,
      '11.23 …the regions still total the recorded 24,176 chars');
    const rebuilt4 = (function () {
      let out = HTML.replace(EIC_UNDO4.TAG + '\n', '');
      const inl = L.parseScriptTags(out).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
      const monoAt = out.indexOf(inl[0].inline);
      const spans = EIC_UNDO4.REGION_OFFSETS.map((r, i) => ({ off: r.monoOffset, text: fake4[i] }));
      for (const sp of spans.slice().sort((a, b) => a.off - b.off)) out = out.slice(0, monoAt + sp.off) + sp.text + out.slice(monoAt + sp.off);
      return out;
    })();
    eq(rebuilt4.length, EIC_UNDO4.POST_PR3_INDEX_CHARS,
      '11.24 …the rebuilt document is exactly the right LENGTH — the length check is satisfied by a wrong document');
    ok(sha256(rebuilt4) !== EIC_UNDO4.POST_PR3_INDEX_SHA256,
      '11.25 …but the SHA-256 does NOT match, so the hash is what carries the proof');
  }

  // ── regions derive from the module after one explicit repair projection ──
  // The helper carries no extracted body. It knows only the exact later fdColor
  // repair block, removes it, then derives and hash-checks the original regions.
  {
    const helperSrc = fs.readFileSync(path.join(ROOT, 'tests', 'lib', 'eic-pr4-undo.js'), 'utf8');
    for (const needle of ["ttCall('/eic/legs/'+ticker)", 'acceptDataFormat', 'dxlinkConfidence']) {
      ok(helperSrc.indexOf(needle) < 0,
        '11.26 the undo helper does NOT hardcode the declaration body (' + needle + ' is absent from it)');
    }
    eq(LDD_SRC.split(EIC_UNDO4.POST_EXTRACTION_FDCOLOR_FIX).length - 1, 1,
      '11.27 the current module contains the exact approved repair block once');
    eq(EIC_UNDO4.extractionSource(LDD_SRC), LDD_EXTRACTION_SRC,
      '11.28 removing that block yields the independently used historical projection');
    ok(helperSrc.indexOf('regionTexts') >= 0 && helperSrc.indexOf(EIC_UNDO4.MODULE_REL) >= 0,
      '11.29 every historical region is then derived from ' + EIC_UNDO4.MODULE_REL + ' on disk');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('11B. THE PANEL — EIC PR 2');
//
// PR 1's module was pure, so §8 evaluates it under a trapping sandbox and §9
// runs a behavioural sweep. NEITHER is honest here. A panel renders: it reads
// and writes S.*, touches the DOM and sets timers, so a "purity" assertion would
// assert something false, and a behavioural sweep would need a fabricated DOM
// whose fidelity nobody has verified — a proof of the harness, not of the code.
//
// What IS proved, and is the actual claim of a byte-for-byte relocation:
//   • every relocated byte is identical to the base blob at its recorded offset;
//   • the module's shape — sites, names, order, chars, per-name sync/async form,
//     per-span SHA-256 — is exactly what was cut;
//   • both names still land on the GLOBAL object, because generated onclick=
//     markup resolves them there at click time;
//   • the inherited eicEnrichLegs defect is still present and still unrepaired.
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(PANEL_DECLS.length, 2, '11B.1 the panel module declares exactly two sites');
  deepEq(PANEL_DECLS.map((d) => d.name), G.EXPECTED_PANEL.order, '11B.2 …in their original physical order');
  eq(PANEL_DECLS.reduce((a, d) => a + d.chars, 0), 15268, '11B.3 …totalling exactly 15,268 declaration chars');
  eq(PANEL_DECLS.filter((d) => d.name === 'runEICPanel')[0].chars, 11442, '11B.4 runEICPanel is 11,442 chars');
  eq(PANEL_DECLS.filter((d) => d.name === 'eicAnalyzeAll')[0].chars, 3826, '11B.5 eicAnalyzeAll is 3,826 chars');
  eq(PANEL_DECLS.filter((d) => d.name === 'runEICPanel')[0].isAsync, false, '11B.6 runEICPanel is synchronous, as it was inline');
  eq(PANEL_DECLS.filter((d) => d.name === 'eicAnalyzeAll')[0].isAsync, true, '11B.7 eicAnalyzeAll is async, as it was inline');
  for (const d of PANEL_DECLS) {
    eq(sha256(PANEL_SRC.slice(d.start, d.end + 1)), G.EXPECTED_PANEL.spanSha[d.name],
      '11B.8 ' + d.name + ' matches its recorded span SHA-256');
  }
  deepEq(G.guardModuleShape(PANEL_SRC, G.EXPECTED_PANEL).violations, [], '11B.9 the panel satisfies the shape guard');
  deepEq(G.guardPanelSurface(PANEL_SRC).violations, [], '11B.10 …and the panel surface guard');
  deepEq(G.guardLoad(SCRIPT_MODEL, G.PANEL_SRC_ATTR).violations, [], '11B.11 …and the load guard for its own tag');

  // BYTE-FOR-BYTE against the real base blob, at the offsets the regions held.
  if (!SHALLOW || BASE_PR1_MONO) {
    ok(BASE_PR1_MONO !== null, '11B.12 the post-PR1 base monolith is reachable for the byte comparison');
  }
  if (BASE_PR1_MONO) {
    let exact = 0;
    for (const d of PANEL_DECLS) {
      const baseDecl = scanTopLevelDeclarations(BASE_PR1_MONO).filter((x) => x.name === d.name)[0];
      const baseText = BASE_PR1_MONO.slice(baseDecl.start, baseDecl.end + 1);
      const headText = PANEL_SRC.slice(d.start, d.end + 1);
      if (baseText === headText) exact++;
      else ok(false, '11B.13 ' + d.name + ' differs from the base blob');
    }
    eq(exact, 2, '11B.13 2/2 sites byte-identical to the real base blob at ' + BASE_PR1_REF.slice(0, 10));
  }

  // The two names are reached from generated markup, which is the reason this
  // file must stay a classic script. Pin the call sites so a later PR cannot
  // delete them and quietly make the "must be global" rule untestable.
  // All four handlers are emitted BY runEICPanel, so they travelled with it into
  // this module. That makes the global-binding requirement self-referential and
  // sharper, not weaker: the panel writes markup that calls the panel by NAME,
  // off the global object, at click time. Bind these locally and the buttons the
  // panel itself renders stop working.
  // Counted over the RELOCATED CODE only — from the first declaration onward —
  // not over this file's hand-written header, which quotes two of these handlers
  // while explaining them. Counting the header too would let an edit to a
  // comment change a number that is supposed to measure the code.
  const PANEL_CODE = PANEL_SRC.slice(PANEL_DECLS[0].start);
  const handlers = (PANEL_CODE.match(/on[a-z]+\s*=\s*["'][^"']*\b(runEICPanel|eicAnalyzeAll)\b/g) || []).length;
  eq(handlers, 4, '11B.14 four generated onclick= handlers reach the two relocated names, all emitted by the panel itself');
  ok(PANEL_CODE.indexOf('onclick="runEICPanel()"') >= 0, '11B.15 …including the plain runEICPanel() button');
  ok(PANEL_CODE.indexOf('onclick="eicAnalyzeAll()"') >= 0, '11B.16 …and the eicAnalyzeAll() button');
  eq((HTML.match(/on[a-z]+\s*=\s*["'][^"']*\b(runEICPanel|eicAnalyzeAll)\b/g) || []).length, 0,
    '11B.16b …and index.html no longer emits any of them, because they left with the panel');

  // Both bind as globals when the module is evaluated as a classic script.
  {
    const sandbox = { S: {}, document: { getElementById() { return null; }, querySelectorAll() { return []; } },
      setTimeout() {}, console: { log() {}, warn() {}, error() {} },
      Math, JSON, Date, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt, RegExp, Error, Promise };
    let evalErr = null;
    try { vm.createContext(sandbox); vm.runInContext(PANEL_SRC, sandbox, { filename: 'eic-panel-probe.js', timeout: 5000 }); }
    catch (e) { evalErr = String(e && e.message); }
    eq(evalErr, null, '11B.17 the panel module evaluates as a classic script');
    eq(typeof sandbox.runEICPanel, 'function', '11B.18 runEICPanel is bound as a GLOBAL function declaration');
    eq(typeof sandbox.eicAnalyzeAll, 'function', '11B.19 eicAnalyzeAll is bound as a GLOBAL function declaration');
  }

  // The inherited defect, recorded and deliberately unrepaired.
  ok(/\beicEnrichLegs\s*\(/.test(G.maskLiterals(PANEL_SRC)),
    '11B.20 the eicEnrichLegs call site is relocated UNREPAIRED — this PR moves code, it does not fix it');
  eq(scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === 'eicEnrichLegs').length, 0,
    '11B.21 …and eicEnrichLegs is still declared nowhere in the application, exactly as before this PR');
  // The PR body claims the call site is the name's ONLY occurrence in the whole
  // application. That is a mechanical claim, so it is mechanically proved here
  // rather than asserted in prose: count occurrences across the reconstructed
  // application with comments and string literals MASKED, so a mention in a
  // comment or a string could not prop the number up.
  {
    const maskedApp = G.maskLiterals(APP_SRC);
    const total = (maskedApp.match(/\beicEnrichLegs\b/g) || []).length;
    eq(total, 1, '11B.22 eicEnrichLegs occurs exactly ONCE in the masked application source — the call site, and nothing else');
    const inPanel = (G.maskLiterals(PANEL_SRC).match(/\beicEnrichLegs\b/g) || []).length;
    eq(inPanel, 1, '11B.23 …and that one occurrence is inside this module, where it was relocated to');
    // Declared nowhere, called once ⇒ the path throws. Stated as the exact fact
    // the source proves, not as a stronger claim about runtime behaviour that
    // this contract does not execute.
    ok(total === 1 && scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === 'eicEnrichLegs').length === 0,
      '11B.24 eicEnrichLegs has NO application declaration and exactly one call site, so that path resolves to a ReferenceError when it executes');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('11C. THE TICKER ANALYSIS PANEL — EIC PR 3');
//
// One declaration site, moved byte-for-byte. §8's purity guard is not applied
// and no purity claim is made: this function renders. §14's surface guard is
// applied instead, and it is derived from a SOURCE AUDIT of the real body rather
// than from a general idea of what a module should look like — it pins the
// effects the audit measured ABSENT (fetch, ttCall, WebSocket, timers, direct
// S writes, window writes) and the DOM/listener/sibling ownership it measured
// PRESENT, so removing the rendering would fail even though the byte-identity
// proof only ever compares the function to what was cut.
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(TA_DECLS.length, 1, '11C.1 the module declares exactly ONE site');
  deepEq(TA_DECLS.map((d) => d.name), G.EXPECTED_TICKER_ANALYSIS.order, '11C.2 …and it is eicAnalyzeTicker');
  eq(TA_DECLS[0].chars, 13990, '11C.3 …of exactly 13,990 declaration chars');
  eq(TA_DECLS[0].form, 'function', '11C.4 …declared as a function, not a const/arrow');
  eq(TA_DECLS[0].isAsync, true, '11C.5 …and async, as it was inline');
  eq(sha256(TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1)), G.EXPECTED_TICKER_ANALYSIS.spanSha.eicAnalyzeTicker,
    '11C.6 …matching its recorded span SHA-256');
  expectClean(G.guardModuleShape(TA_SRC, G.EXPECTED_TICKER_ANALYSIS), '11C.7 the module satisfies the shape guard');
  expectClean(G.guardTickerAnalysisSurface(TA_SRC), '11C.8 …and the ticker-analysis surface guard');
  expectClean(G.guardLoad(SCRIPT_MODEL, G.TICKER_ANALYSIS_SRC_ATTR), '11C.9 …and the load guard for its own tag');

  // BYTE-FOR-BYTE against the real post-PR2 base blob, at the offset it held.
  if (!SHALLOW || BASE_PR2_MONO) {
    ok(BASE_PR2_MONO !== null, '11C.10 the post-PR2 base monolith is reachable for the byte comparison');
  }
  if (BASE_PR2_MONO) {
    const baseDecl = scanTopLevelDeclarations(BASE_PR2_MONO).filter((x) => x.name === 'eicAnalyzeTicker');
    eq(baseDecl.length, 1, '11C.11 the base monolith declared eicAnalyzeTicker exactly once');
    const baseText = BASE_PR2_MONO.slice(baseDecl[0].start, baseDecl[0].end + 1);
    eq(baseText, TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1),
      '11C.12 1/1 site byte-identical to the real base blob at ' + BASE_PR2_REF.slice(0, 10));
    eq(baseDecl[0].start, EIC_UNDO3.REGION_OFFSETS[0].monoOffset,
      '11C.13 …at exactly the monolith offset the undo helper records');
  }

  // It is GONE from the monolith and present exactly once application-wide.
  eq(INLINE_DECLS.filter((d) => d.name === 'eicAnalyzeTicker').length, 0,
    '11C.14 eicAnalyzeTicker is no longer declared inline');
  eq(scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === 'eicAnalyzeTicker').length, 1,
    '11C.15 …and is declared exactly ONCE across the whole application — no duplicate, none missing');

  // The global binding form, evaluated as a classic script.
  {
    const sandbox = { console: { log() {}, warn() {}, error() {} },
      Math, JSON, Date, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt, RegExp, Error, Promise };
    let evalErr = null;
    try { vm.createContext(sandbox); vm.runInContext(TA_SRC, sandbox, { filename: 'ta-probe.js', timeout: 5000 }); }
    catch (e) { evalErr = String(e && e.message); }
    eq(evalErr, null, '11C.16 the module evaluates as a classic script');
    eq(typeof sandbox.eicAnalyzeTicker, 'function', '11C.17 eicAnalyzeTicker is bound as a GLOBAL function declaration');
    eq(sandbox.eicAnalyzeTicker.constructor.name, 'AsyncFunction', '11C.18 …and it is an AsyncFunction');
    eq(sandbox.eicAnalyzeTicker.length, 1, '11C.19 …with arity 1 (ticker)');
    ok(Object.prototype.hasOwnProperty.call(sandbox, 'eicAnalyzeTicker'),
      '11C.20 …landing on the global object, where the panel resolves it at click time');
  }

  // ── the §5 OWNERSHIP AUDIT, pinned as measured ────────────────────────────
  // Every number below was RE-MEASURED from the base blob for this PR rather
  // than carried over from the plan. They are asserted so a later edit cannot
  // quietly turn this panel into something else while the shape guard still
  // passes.
  {
    const body = TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1);
    const m = G.maskLiterals(body);
    const count = (re) => (m.match(new RegExp(re.source, 'g')) || []).length;
    eq(count(/\bdocument\s*\.\s*getElementById\s*\(/), 1, '11C.21 audit: 1 document.getElementById');
    eq(count(/\bquerySelector\s*\(/), 1, '11C.22 audit: 1 querySelector');
    eq(count(/\.\s*innerHTML\s*=(?!=)/), 3, '11C.23 audit: 3 innerHTML writes (loading, card, error)');
    eq(count(/\baddEventListener\s*\(/), 1, '11C.24 audit: 1 addEventListener');
    eq(count(/\bfetch\s*\(/), 0, '11C.25 audit: 0 direct fetch()');
    eq(count(/\bttCall\s*\(/), 0, '11C.26 audit: 0 direct ttCall()');
    eq(count(/\bWebSocket\b/), 0, '11C.27 audit: 0 WebSocket');
    eq(count(/\bset(Timeout|Interval)\s*\(/), 0, '11C.28 audit: 0 timers');
    eq(count(/\bS\s*\.\s*[A-Za-z_$][\w$]*\s*=(?!=)/), 0, '11C.29 audit: 0 DIRECT S.* writes');
    eq(count(/\b(window|globalThis)\b/), 0, '11C.30 audit: 0 window/globalThis references');
    eq(count(/\b(local|session)Storage\b/), 0, '11C.31 audit: 0 storage access');
    eq(count(/\bawait\b/), 1, '11C.32 audit: exactly 1 await point (callAgent)');
    eq(count(/\bcatch\s*\(/), 1, '11C.33 audit: 1 catch clause, 0 finally');
    eq(count(/\bfinally\b/), 0, '11C.34 audit: 0 finally blocks');
    eq(Array.from(new Set((m.match(/\bS\s*\.\s*[A-Za-z_$][\w$]*/g) || [])
      .map((x) => x.replace(/\s+/g, '')))).sort().join(','),
      'S.lastScan,S.marketContextRisk,S.marketContextSummary,S.scanData,S.ttConnected',
      '11C.35 audit: exactly five distinct S.* fields are READ');
    // The honest nuance: no direct S write, but the scan ROW is mutated.
    eq(count(/\bd\s*\.\s*eic[A-Za-z]*\s*=(?!=)/), 3,
      '11C.36 audit: 3 mutations of the scan ROW reached through S.scanData — shared state IS written, just not via S.x=');
    // Inline handler strings: NONE. Unlike the panel, this function wires its
    // button with addEventListener and data-* attributes, so the "must be
    // global" requirement comes from its CALLER, not from its own markup.
    eq(count(/\bon[a-z]+\s*=\s*["']/), 0, '11C.37 audit: 0 inline on*= handler strings in generated markup');
    ok(body.indexOf('data-ticker="') >= 0 && body.indexOf('data-exp="') >= 0,
      '11C.38 …it passes state through data-* attributes and addEventListener instead');
  }

  // ── the §6 CALL GRAPH, pinned ─────────────────────────────────────────────
  {
    const body = TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1);
    const m = G.maskLiterals(body);
    const calls = {};
    const re = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
    const LOCAL = new Set(['function', 'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof',
      'new', 'else', 'do', 'try', 'await', 'legLine', 'find', 'Math', 'Date', 'JSON', 'Number', 'String', 'Array', 'Object']);
    let mm;
    while ((mm = re.exec(m)) !== null) { if (!LOCAL.has(mm[2])) calls[mm[2]] = (calls[mm[2]] || 0) + 1; }
    eq(calls.eicScreenTicker, 2, '11C.39 call graph: eicScreenTicker × 2 — resolved ACROSS the module boundary PR 1 created');
    eq(calls.eicRunDXLink, 1, '11C.40 call graph: eicRunDXLink × 1 — a PR 4 name, still inline, called from a CLICK handler');
    eq(calls.callAgent, 1, '11C.41 call graph: callAgent × 1, awaited');
    eq(calls.setAS, 3, '11C.42 call graph: setAS × 3');
    eq(calls.computeFinalDecision, 2, '11C.43 call graph: computeFinalDecision × 2');
    eq(calls.computeSetupScore, 1, '11C.44 call graph: computeSetupScore × 1');
    eq(calls.showToast, 1, '11C.45 call graph: showToast × 1 (the not-found guard)');
    eq(calls.appendSysMsg, 1, '11C.46 call graph: appendSysMsg × 1');
    eq(calls.appendAgentMsg, 1, '11C.47 call graph: appendAgentMsg × 1');
    eq(calls.logEv, 1, '11C.48 call graph: logEv × 1');
    // No PR 4 declaration may arrive early, and no shipped name may reappear.
    for (const n of ['eicFetchLegs', 'eicDXLinkDeepDive']) {
      eq(scanTopLevelDeclarations(TA_SRC).filter((d) => d.name === n).length, 0,
        '11C.49 ' + n + ' did NOT come along early — PR 4 is not started');
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('11D. THE LIVE DEEP DIVE — EIC PR 4, and the family is closed');
//
// FOUR declaration sites, THREE unique names, moved byte-for-byte. §8's purity
// guard is not applied and NO purity claim is made anywhere: this module
// performs transport (ttCall, a DXLink WebSocket) AND rendering, and the two are
// interleaved rather than separable. §14's surface guard is applied instead, and
// it is derived from a SOURCE AUDIT of the real bodies re-measured for this PR
// rather than carried over from the plan — it pins the effects the audit
// measured ABSENT and the transport/DOM ownership it measured PRESENT, at the
// measured multiplicity, so deleting the WebSocket or one endpoint fails even
// though the byte-identity proof only ever compares the functions to what was
// cut.
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(fs.existsSync(LDD_PATH), '11D.1 js/ui/eic-live-deep-dive.js exists');
  eq(LDD_EXTRACTION_DECLS.length, 4, '11D.2 the historical projection declares exactly FOUR sites');
  deepEq(LDD_EXTRACTION_DECLS.map((d) => d.name), G.EXPECTED_LIVE_DEEP_DIVE.order,
    '11D.3 …in the original physical order: eicFetchLegs, eicFetchLegs, eicDXLinkDeepDive, eicRunDXLink');
  eq(new Set(LDD_EXTRACTION_DECLS.map((d) => d.name)).size, 3, '11D.4 …across THREE unique names');
  deepEq(LDD_EXTRACTION_DECLS.map((d) => d.chars), [144, 144, 12815, 10623],
    '11D.5 …at the recorded per-site lengths before the later functional repair');
  eq(LDD_EXTRACTION_DECLS.reduce((a, d) => a + d.chars, 0), 23726,
    '11D.6 …totalling the 23,726 declaration chars extracted by PR 4');
  for (const d of LDD_EXTRACTION_DECLS) {
    eq(d.form, 'function', '11D.7 ' + d.name + ' is declared as a function, not a const/arrow');
    eq(d.isAsync, true, '11D.8 ' + d.name + ' is async, exactly as it was inline');
    eq(sha256(LDD_EXTRACTION_SRC.slice(d.start, d.end + 1)), G.EXPECTED_LIVE_DEEP_DIVE.spanSha[d.name],
      '11D.9 ' + d.name + ' matches its recorded span SHA-256');
  }
  expectClean(G.guardLiveDeepDiveShape(LDD_SRC), '11D.10 the module projects to the exact PR 4 extraction shape');
  expectClean(G.guardLiveDeepDiveSurface(LDD_SRC), '11D.11 …and the live-deep-dive surface guard');
  expectClean(G.guardLoad(SCRIPT_MODEL, G.LIVE_DEEP_DIVE_SRC_ATTR), '11D.12 …and the load guard for its own tag');
  // The inventory guard, asserted CLEAN on the real repository in its own right.
  // §12's control-clean phase also evaluates it, but a positive proof that only
  // exists inside the mutation harness is a positive proof nobody reads — and if
  // the mutant list were ever trimmed, it would vanish with it.
  expectClean(G.guardEicModuleInventory(SCRIPT_MODEL, DISK_JS_FILES),
    '11D.12b …and the EIC module inventory over BOTH the loaded script tags and the files on disk');
  // The canonical normalizer, proved on the spellings that used to bypass it.
  {
    const canon = 'js/ui/eic-live-deep-dive.js';
    for (const form of ['js/ui/eic-live-deep-dive.js', '/js/ui/eic-live-deep-dive.js',
      './js/ui/eic-live-deep-dive.js', './js/ui/eic-live-deep-dive.js?v=1',
      './js/ui/eic-live-deep-dive.js#top', '  ./js/ui/eic-live-deep-dive.js  ',
      './js/ui/../ui/eic-live-deep-dive.js']) {
      eq(G.canonicalLocalSrc(form), canon, '11D.12c canonical form of ' + JSON.stringify(form));
    }
    // Genuinely REMOTE srcs are not local scripts and must not be dragged into
    // the local inventory. Protocol-relative is remote, not root-relative.
    for (const remote of ['https://cdn.example.com/eic-x.js', 'http://x/eic-x.js',
      '//cdn.example.com/eic-x.js', 'data:text/javascript,0']) {
      eq(G.canonicalLocalSrc(remote), null, '11D.12d remote src is not local: ' + JSON.stringify(remote));
    }
    eq(G.canonicalLocalSrc(''), null, '11D.12e an empty src is not a local script');
    eq(G.canonicalLocalSrc(null), null, '11D.12f a missing src is not a local script');
    ok(G.isEicModulePath('js/ui/eic-extra.js') && !G.isEicModulePath('js/ui/pess-panel.js'),
      '11D.12g the eic-*.js path test matches the family and nothing else');
    // The four literal src attributes in index.html canonicalize to the four
    // declared files — so the tag guard and the inventory guard are talking
    // about the same modules even though they compare different spellings.
    deepEq(G.EIC_MODULE_SRC_ATTRS.map((a) => G.canonicalLocalSrc(a)), G.EIC_MODULE_FILES,
      '11D.12h the literal src attributes canonicalize onto the declared file list');
    for (const a of G.EIC_MODULE_SRC_ATTRS) {
      ok(HTML.indexOf('<script src="' + a + '"></script>') >= 0,
        '11D.12i index.html loads it with exactly that literal attribute: ' + a);
    }
  }
  ok(!/module\.exports|export\s|require\s*\(|^\s*['"]use strict['"]/m.test(LDD_SRC),
    '11D.13 classic script — no module system, no wrapper, no strict-mode directive introduced');

  // ── the duplicate pair, preserved rather than tidied ──────────────────────
  {
    const pair = LDD_DECLS.filter((d) => d.name === 'eicFetchLegs');
    eq(pair.length, 2, '11D.14 BOTH eicFetchLegs sites moved');
    const a = LDD_SRC.slice(pair[0].start, pair[0].end + 1);
    const b = LDD_SRC.slice(pair[1].start, pair[1].end + 1);
    eq(a, b, '11D.15 …and the two copies are byte-identical to one another');
    eq(sha256(a), sha256(b), '11D.16 …by SHA-256 as well');
    ok(pair[0].start < pair[1].start, '11D.17 …in their original relative order');
    // Both are HOISTED async function declarations, so the later one wins — at
    // hoist time, not at its physical position. Because they are identical, the
    // winner is indistinguishable from the loser, which is exactly why deleting
    // one would have been behaviour-neutral AND wrong: it is an EDIT.
    eq(LDD_DECLS.indexOf(pair[0]), 0, '11D.18 the first copy is the module’s first declaration');
    eq(LDD_DECLS.indexOf(pair[1]), 1, '11D.19 …and the second is the second — nothing was reordered between them');
  }

  // ── BYTE-FOR-BYTE against the real post-PR3 base blob ─────────────────────
  if (!SHALLOW || BASE_PR3_MONO) {
    ok(BASE_PR3_MONO !== null, '11D.20 the post-PR3 base monolith is reachable for the byte comparison');
  }
  if (BASE_PR3_MONO) {
    const baseDecls = scanTopLevelDeclarations(BASE_PR3_MONO)
      .filter((x) => G.LIVE_DEEP_DIVE_NAMES.indexOf(x.name) >= 0);
    eq(baseDecls.length, 4, '11D.21 the base monolith declared all four sites');
    deepEq(baseDecls.map((x) => x.name), G.EXPECTED_LIVE_DEEP_DIVE.order, '11D.22 …in the same physical order');
    let direct = 0;
    for (let i = 0; i < baseDecls.length; i++) {
      const baseText = BASE_PR3_MONO.slice(baseDecls[i].start, baseDecls[i].end + 1);
      const modText = LDD_EXTRACTION_SRC.slice(LDD_EXTRACTION_DECLS[i].start, LDD_EXTRACTION_DECLS[i].end + 1);
      eq(modText, baseText, '11D.23 ' + baseDecls[i].name + '@' + baseDecls[i].start
        + ' — module span EQUALS the base span, character for character');
      if (modText === baseText) direct++;
    }
    eq(direct, 4, '11D.24 4/4 sites byte-identical to the real base blob at ' + BASE_PR3_REF.slice(0, 10));
    // The recorded region offsets must be the offsets the REGIONS held, which
    // are the declaration offsets minus any attached comment block.
    deepEq(baseDecls.map((x, i) => x.start - (EIC_UNDO4.REGION_OFFSETS[i].chars - EIC_UNDO4.DECLARATION_CHARS_EACH[i] - 2)),
      EIC_UNDO4.REGION_OFFSETS.map((r) => r.monoOffset),
      '11D.25 …and each declaration sits exactly where the undo helper records its region beginning, plus its attached comment');
  }

  // ── GONE from the monolith, present exactly once each application-wide ────
  for (const n of G.LIVE_DEEP_DIVE_NAMES) {
    eq(INLINE_DECLS.filter((d) => d.name === n).length, 0, '11D.26 ' + n + ' is no longer declared inline');
  }
  eq(scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === 'eicFetchLegs').length, 2,
    '11D.27 eicFetchLegs is declared exactly TWICE across the whole application — the pair is intact, not duplicated further');
  for (const n of ['eicDXLinkDeepDive', 'eicRunDXLink']) {
    eq(scanTopLevelDeclarations(APP_SRC).filter((d) => d.name === n).length, 1,
      '11D.28 ' + n + ' is declared exactly ONCE across the whole application');
  }

  // ── the global binding form, evaluated as a classic script ────────────────
  {
    const sandbox = { console: { log() {}, warn() {}, error() {} },
      Math, JSON, Date, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt, RegExp, Error, Promise };
    let evalErr = null;
    try { vm.createContext(sandbox); vm.runInContext(LDD_SRC, sandbox, { filename: 'ldd-probe.js', timeout: 5000 }); }
    catch (e) { evalErr = String(e && e.message); }
    eq(evalErr, null, '11D.29 the module evaluates as a classic script');
    for (const n of G.LIVE_DEEP_DIVE_NAMES) {
      eq(typeof sandbox[n], 'function', '11D.30 ' + n + ' is bound as a GLOBAL function declaration');
      eq(sandbox[n].constructor.name, 'AsyncFunction', '11D.31 ' + n + ' is an AsyncFunction');
      ok(Object.prototype.hasOwnProperty.call(sandbox, n),
        '11D.32 ' + n + ' lands on the global object, where the ticker-analysis panel resolves it at click time');
    }
    eq(sandbox.eicFetchLegs.length, 1, '11D.33 eicFetchLegs has arity 1 (ticker)');
    eq(sandbox.eicDXLinkDeepDive.length, 2, '11D.34 eicDXLinkDeepDive has arity 2 (ticker, expiration)');
    eq(sandbox.eicRunDXLink.length, 2, '11D.35 eicRunDXLink has arity 2 (ticker, expiration)');
    // The duplicate is hoisted, so the binding exists before the first statement
    // and the LATER declaration is the one that wins.
    eq(String(sandbox.eicFetchLegs), LDD_SRC.slice(LDD_DECLS[1].start, LDD_DECLS[1].end + 1),
      '11D.36 the LATER eicFetchLegs declaration is the surviving binding — and it is byte-identical to the earlier one, so the winner is indistinguishable from the loser');
  }

  // ── the SOURCE AUDIT, pinned as measured ──────────────────────────────────
  // Every number below was RE-MEASURED from the shipped bodies for this PR. They
  // are asserted so a later edit cannot quietly turn this module into something
  // else while the shape guard still passes. No purity claim is made: the counts
  // record what IS here, including the transport and the rendering.
  {
    const span = LDD_DECLS.map((d) => G.stripComments(LDD_SRC.slice(d.start, d.end + 1))).join('\n');
    const m = G.maskLiterals(span);
    const count = (re) => (m.match(new RegExp(re.source, 'g')) || []).length;
    eq(count(/\bttCall\s*\(/), 4, '11D.37 audit: 4 ttCall transport calls (1 per eicFetchLegs copy, 2 in the deep dive)');
    eq(count(/\bfetch\s*\(/), 0, '11D.38 audit: 0 direct fetch() — the module goes through ttCall, as it did inline');
    eq(count(/new\s+WebSocket\s*\(/), 1, '11D.39 audit: 1 DXLink WebSocket');
    eq(count(/\bsetTimeout\s*\(/), 1, '11D.40 audit: 1 setTimeout (the 9s DXLink budget)');
    eq(count(/\bclearTimeout\s*\(/), 4, '11D.41 audit: 4 clearTimeout cancellations');
    eq(count(/\bsetInterval\s*\(/), 0, '11D.42 audit: 0 setInterval');
    eq(count(/new\s+Promise\s*\(/), 1, '11D.43 audit: 1 explicit Promise (the WebSocket completion)');
    eq(count(/\bdocument\s*\.\s*getElementById\s*\(/), 2, '11D.44 audit: 2 getElementById lookups');
    eq(count(/\bquerySelector\s*\(/), 5, '11D.45 audit: 5 querySelector lookups');
    eq(count(/\bdocument\s*\.\s*createElement\s*\(/), 1, '11D.46 audit: 1 createElement');
    eq(count(/\.\s*innerHTML\s*=(?!=)/), 3, '11D.47 audit: 3 innerHTML assignments');
    eq(count(/\.\s*innerHTML\s*\+=/), 2, '11D.48 audit: 2 innerHTML appends');
    eq(count(/\.\s*textContent\s*=(?!=)/), 2, '11D.49 audit: 2 textContent writes');
    eq(count(/\baddEventListener\s*\(/), 0, '11D.50 audit: 0 addEventListener — this module registers no listener of its own');
    eq(count(/\bS\s*\.\s*[A-Za-z_$][\w$]*\s*=(?!=)/), 0, '11D.51 audit: 0 DIRECT S.* writes');
    eq(count(/\b(window|globalThis)\b/), 0, '11D.52 audit: 0 window/globalThis references');
    eq(count(/\b(local|session)Storage\b/), 0, '11D.53 audit: 0 storage access');
    eq(count(/\bawait\b/), 7, '11D.54 audit: 7 await points across the four spans (1 per eicFetchLegs copy, 3 in the deep dive, 2 in the runner)');
    eq(count(/\bcatch\s*\(/), 9, '11D.55 audit: 9 catch clauses (1 per eicFetchLegs copy, 6 in the deep dive, 1 in the runner)');
    eq(count(/\bfinally\b/), 0, '11D.56 audit: 0 finally blocks');
    eq(count(/\bthrow\b/), 4, '11D.57 audit: 4 explicit throws, all inside the deep dive’s own try');
    eq(count(/\bon[a-z]+\s*=\s*["']/), 0, '11D.58 audit: 0 inline on*= handler strings in generated markup');
    eq(Array.from(new Set((m.match(/\bS\s*\.\s*[A-Za-z_$][\w$]*/g) || [])
      .map((x) => x.replace(/\s+/g, '')))).sort().join(','),
      'S.marketContextRisk,S.scanData',
      '11D.59 audit: exactly two distinct S.* fields are READ');
    // The honest nuance: no direct S write, but the scan ROW is mutated.
    eq(count(/\bd\s*\.\s*eic[A-Za-z]*\s*=(?!=)/), 4,
      '11D.60 audit: 4 mutations of the scan ROW reached through S.scanData — shared state IS written, just not via S.x=');
    // It is NOT pure, and the audit says so in the affirmative rather than by
    // omitting a purity claim.
    ok(count(/\bttCall\s*\(/) > 0 && count(/new\s+WebSocket\s*\(/) > 0,
      '11D.61 the module performs TRANSPORT — no purity guard is applied, because asserting purity here would assert something false');
    ok(count(/\.\s*innerHTML\s*=(?!=)/) + count(/\.\s*innerHTML\s*\+=/) > 0,
      '11D.62 …and it performs RENDERING; transport and rendering are interleaved and were NOT split, because this is a relocation');
  }

  // ── the CALL GRAPH, pinned ────────────────────────────────────────────────
  {
    // BODIES only. Slicing from each declaration's opening brace keeps the
    // signature out of the graph: `function eicDXLinkDeepDive(` would otherwise
    // be counted as a call to itself, and the in-module edge this section exists
    // to pin would read 2 whether or not the real call survived.
    const span = LDD_DECLS.map((d) => {
      const body = LDD_SRC.slice(d.start, d.end + 1);
      return G.stripComments(body.slice(body.indexOf('{')));
    }).join('\n');
    const m = G.maskLiterals(span);
    const calls = {};
    const re = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
    const LOCAL = new Set(['function', 'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof',
      'new', 'else', 'do', 'try', 'await', 'findStreamerSymbol', 'find', 'filter', 'reduce', 'every',
      'forEach', 'flatMap', 'Math', 'Date', 'JSON', 'Number', 'String', 'Array', 'Object', 'Promise', 'Error']);
    let mm;
    while ((mm = re.exec(m)) !== null) { if (!LOCAL.has(mm[2])) calls[mm[2]] = (calls[mm[2]] || 0) + 1; }
    eq(calls.ttCall, 4, '11D.63 call graph: ttCall × 4 — the transport, unchanged');
    eq(calls.eicDXLinkDeepDive, 1, '11D.64 call graph: eicDXLinkDeepDive × 1 — an IN-MODULE call from eicRunDXLink');
    eq((m.match(/\bawait\s+eicDXLinkDeepDive\s*\(/g) || []).length, 1, '11D.64b …and it is awaited');
    ok(calls.eicFetchLegs === undefined, '11D.64c call graph: eicFetchLegs × 0 — both copies are DEAD CODE, called from nowhere');
    ok(calls.eicRunDXLink === undefined, '11D.64d call graph: eicRunDXLink × 0 from inside this module — its only caller is the ticker-analysis panel, at click time');
    eq(calls.eicScreenTicker, 2, '11D.65 call graph: eicScreenTicker × 2 — resolved ACROSS the boundary PR 1 created');
    eq(calls.eicBuildLiveContext, 1, '11D.66 call graph: eicBuildLiveContext × 1 — also PR 1’s module');
    eq(calls.callAgent, 1, '11D.67 call graph: callAgent × 1, awaited');
    eq(calls.setAS, 5, '11D.68 call graph: setAS × 5');
    eq(calls.showToast, 3, '11D.69 call graph: showToast × 3');
    eq(calls.logEv, 5, '11D.70 call graph: logEv × 5');
    eq(calls.appendSysMsg, 1, '11D.71 call graph: appendSysMsg × 1');
    eq(calls.appendAgentMsg, 1, '11D.72 call graph: appendAgentMsg × 1');
    eq(calls.computeSetupScore, 1, '11D.73 call graph: computeSetupScore × 1');
    eq(calls.computeFinalDecision, 1, '11D.74 call graph: computeFinalDecision × 1');
    // The BACKWARD edges are satisfied by load ORDER: PR 1's module loads first.
    ok(ORDERED.findIndex((s) => s.src === G.MODULE_SRC_ATTR) < LDD_SLOT,
      '11D.75 js/services/eic-screening-rules.js loads BEFORE this module, so eicScreenTicker/eicBuildLiveContext are bound when called');
    // No name from another owner may have come along.
    for (const n of G.PR1_NAMES.concat(G.PANEL_NAMES, G.TICKER_ANALYSIS_NAMES)) {
      eq(LDD_DECLS.filter((d) => d.name === n).length, 0,
        '11D.76 ' + n + ' did NOT come along — it belongs to another owner');
    }
  }

  // ── INCIDENTAL DEFECTS: recorded, pinned, and deliberately NOT repaired ───
  {
    const runText = LDD_SRC.slice(LDD_DECLS[3].start, LDD_DECLS[3].end + 1);
    const diveText = LDD_SRC.slice(LDD_DECLS[2].start, LDD_DECLS[2].end + 1);
    const runCode = G.stripComments(runText), diveCode = G.stripComments(diveText);

    // 1 — fdColor: repaired deliberately after the byte-for-byte extraction.
    ok(/\bvar\s+fdColors\s*=/.test(G.maskLiterals(runCode))
      && /\bvar\s+fdColor\s*=/.test(G.maskLiterals(runCode)),
      '11D.77 repair: eicRunDXLink declares the colour map and selected colour locally');
    eq(LDD_SRC.split(EIC_UNDO4.POST_EXTRACTION_FDCOLOR_FIX).length - 1, 1,
      '11D.78 …through exactly one approved repair block');
    const historicalRun = LDD_EXTRACTION_DECLS.filter((d) => d.name === 'eicRunDXLink')[0];
    const historicalRunCode = G.stripComments(LDD_EXTRACTION_SRC.slice(historicalRun.start, historicalRun.end + 1));
    ok(!/\b(var|let|const)\s+fdColor\b/.test(G.maskLiterals(historicalRunCode))
      && sha256(LDD_EXTRACTION_SRC.slice(historicalRun.start, historicalRun.end + 1))
        === G.EXPECTED_LIVE_DEEP_DIVE.spanSha.eicRunDXLink,
      '11D.79 …while projecting it away reproduces the original defective PR 4 span byte-exactly');
    ok(runCode.indexOf("fdColors[fd.finalTradingDecision]||'var(--tx2)'") >= 0,
      '11D.80 …and the current path selects by finalTradingDecision with the neutral fallback');

    // 2 — the dead `if(d)` guard followed by an unconditional dereference.
    ok(diveCode.indexOf('if(d) var tsNone=new Date().toISOString();') >= 0,
      '11D.81 defect: the dead `if(d) var tsNone = …` guard survives');
    ok(diveCode.indexOf('d.eicLegsLive={') >= 0,
      '11D.82 …immediately followed by an UNCONDITIONAL d.eicLegsLive={…} — the guard protects nothing');
    ok(diveCode.indexOf('return d?d.eicLegsLive:null;') >= 0,
      '11D.83 …and then `d` is re-checked on the return, after it has already been dereferenced');

    // 3 — the guarded write followed by an unguarded read on the success path.
    ok(diveCode.indexOf('if(d) d.eicLegsLive = {') >= 0, '11D.84 defect: the success path guards the write with if(d)…');
    ok(diveCode.indexOf('return d.eicLegsLive;') >= 0, '11D.85 …and then returns d.eicLegsLive UNGUARDED');

    // 4 — the redundant second eicScreenTicker(d).
    ok(runCode.indexOf('var sc = eicScreenTicker(d);') >= 0, '11D.86 defect: eicScreenTicker(d) is called once as `sc`…');
    ok(runCode.indexOf('computeSetupScore(d, baseLegs, eicScreenTicker(d))') >= 0,
      '11D.87 …and again inside the computeSetupScore fallback, for an identical result');

    // 5 — both eicFetchLegs copies are dead code (0 call sites) — see 7E.14-15.
    ok(LDD_DECLS.filter((d) => d.name === 'eicFetchLegs').length === 2,
      '11D.88 defect: both eicFetchLegs copies are retained even though neither is ever called');

    // The eicEnrichLegs defect belongs to PR 2 and is NOT touched here.
    // Measured over CODE, not raw source: this module's architecture header
    // NAMES the defect while explaining that it belongs elsewhere, and a comment
    // must never satisfy — or fail — a rule about code.
    ok(G.stripComments(LDD_SRC).indexOf('eicEnrichLegs') < 0,
      '11D.89 the inherited eicEnrichLegs defect is NOT in this module’s code — it is PR 2’s');
    ok(LDD_SRC.indexOf('eicEnrichLegs') >= 0,
      '11D.89b …though the header names it, to record that it was considered and deliberately left alone');
    ok(PANEL_SRC.indexOf('eicEnrichLegs') >= 0, '11D.90 …it is still in js/ui/eic-panel.js, still unrepaired');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('12. MUTATION PROOF — genuine mutations, run through the real guards');
//
// Every mutant below MUTATES A MODEL and then calls the SAME guard the real
// repository is checked with. A mutant is KILLED only when that guard returns a
// violation. If the guard merely throws, the mutant is recorded as a HARNESS
// ERROR and counted as a SURVIVOR — a crash proves nothing.
//
// Before any mutant runs, each guard is confirmed CLEAN on the unmutated input,
// so "killed" cannot be an artefact of a guard that objects to everything.
// ═════════════════════════════════════════════════════════════════════════════

const MUTANTS = [];
function mutant(category, id, guard, mutate, baseline) {
  MUTANTS.push({ category, id, guard, mutate, baseline, isAsync: false });
}
// Some guards must be asynchronous — see TA_TRANSCRIPT_GUARD. They run in a
// SECOND pass, after the parity chain, because the thing they measure does not
// exist until a promise settles. Counting them as killed without waiting would
// be the same class of error as counting a guard that threw.
function mutantAsync(category, id, guard, mutate, baseline) {
  MUTANTS.push({ category, id, guard, mutate, baseline, isAsync: true });
}

// Helper: replace the Nth occurrence of `needle` in `src`.
function replaceNth(src, needle, replacement, n) {
  let idx = -1;
  for (let k = 0; k <= n; k++) {
    idx = src.indexOf(needle, idx + 1);
    if (idx < 0) return src;
  }
  return src.slice(0, idx) + replacement + src.slice(idx + needle.length);
}
function cutDeclaration(src, name, occurrence) {
  const decls = scanTopLevelDeclarations(src).filter((d) => d.name === name);
  const d = decls[occurrence];
  if (!d) return src;
  return src.slice(0, d.start) + src.slice(d.end + 1);
}
function declText(src, name, occurrence) {
  const decls = scanTopLevelDeclarations(src).filter((d) => d.name === name);
  const d = decls[occurrence || 0];
  return d ? src.slice(d.start, d.end + 1) : null;
}

// ── SOURCE / RELOCATION ──────────────────────────────────────────────────────
const S_ = 'source';
mutant(S_, 'remove eicScreenTicker from the module', G.guardModuleShape,
  () => cutDeclaration(MODULE_SRC, 'eicScreenTicker', 0), () => MODULE_SRC);
mutant(S_, 'remove the FIRST eicLiqFromLegs site', G.guardModuleShape,
  () => cutDeclaration(MODULE_SRC, 'eicLiqFromLegs', 0), () => MODULE_SRC);
mutant(S_, 'remove the SECOND eicLiqFromLegs site', G.guardModuleShape,
  () => cutDeclaration(MODULE_SRC, 'eicLiqFromLegs', 1), () => MODULE_SRC);
mutant(S_, 'remove eicBuildLiveContext from the module', G.guardModuleShape,
  () => cutDeclaration(MODULE_SRC, 'eicBuildLiveContext', 0), () => MODULE_SRC);
mutant(S_, 'introduce a THIRD eicLiqFromLegs declaration', G.guardModuleShape,
  () => MODULE_SRC + '\n' + declText(MODULE_SRC, 'eicLiqFromLegs', 0) + '\n', () => MODULE_SRC);
mutant(S_, 'reorder the duplicate pair relative to the plan', G.guardModuleShape, () => {
  // Move eicBuildLiveContext between the two eicLiqFromLegs sites.
  const bl = declText(MODULE_SRC, 'eicBuildLiveContext', 0);
  const without = cutDeclaration(MODULE_SRC, 'eicBuildLiveContext', 0);
  const d = scanTopLevelDeclarations(without).filter((x) => x.name === 'eicLiqFromLegs');
  return without.slice(0, d[1].start) + bl + '\n\n' + without.slice(d[1].start);
}, () => MODULE_SRC);
mutant(S_, 'change one executable byte inside eicScreenTicker', G.guardModuleShape,
  () => MODULE_SRC.replace('var ivr=d.ivRank!=null?d.ivRank:0;', 'var ivr=d.ivRank!=null?d.ivRank:1;'), () => MODULE_SRC);
mutant(S_, 'change one executable byte inside eicLiqFromLegs (first site)', G.guardModuleShape,
  () => replaceNth(MODULE_SRC, "legs.aggregate.liqVerdict||'unknown'", "legs.aggregate.liqVerdict||'UNKNOWN'", 0), () => MODULE_SRC);
mutant(S_, 'change one executable byte inside eicLiqFromLegs (second site only → sites diverge)', G.guardModuleShape,
  () => replaceNth(MODULE_SRC, "legs.liqDataDelayed??true", "legs.liqDataDelayed??false", 1), () => MODULE_SRC);
mutant(S_, 'change one executable byte inside eicBuildLiveContext', G.guardModuleShape,
  () => MODULE_SRC.replace("var conf = liveData.confidence;", "var conf = liveData.confidenceX;"), () => MODULE_SRC);
mutant(S_, 'turn a synchronous moved declaration into async', G.guardModuleShape,
  () => MODULE_SRC.replace('function eicScreenTicker(d){', 'async function eicScreenTicker(d){'), () => MODULE_SRC);
mutant(S_, 'alter one function signature', G.guardModuleShape,
  () => MODULE_SRC.replace('function eicBuildLiveContext(liveData, baseLegsData){', 'function eicBuildLiveContext(liveData){'), () => MODULE_SRC);
mutant(S_, 'rename a relocated declaration', G.guardModuleShape,
  () => MODULE_SRC.replace('function eicScreenTicker(d){', 'function eicScreenTickerV2(d){'), () => MODULE_SRC);
mutant(S_, 'reintroduce a shipped declaration inline', G.guardInlineResidue,
  () => INLINE + '\n' + declText(MODULE_SRC, 'eicScreenTicker', 0) + '\n', () => INLINE);
mutant(S_, 'a PR 4 declaration is put BACK into the monolith', G.guardInlineResidue,
  () => INLINE + '\n' + declText(LDD_SRC, 'eicDXLinkDeepDive', 0) + '\n', () => INLINE);
mutant(S_, 'the module loses eicDXLinkDeepDive entirely', G.guardLiveDeepDiveShape,
  () => cutDeclaration(LDD_SRC, 'eicDXLinkDeepDive', 0), () => LDD_SRC);
mutant(S_, 'collapse the 11-site manifest into a 9-name manifest', G.guardManifest, () => {
  const seen = new Set();
  return MANIFEST.filter((m) => { if (seen.has(m[0])) return false; seen.add(m[0]); return true; });
}, () => MANIFEST);
mutant(S_, 'split the duplicate pair across two owners', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicLiqFromLegs' && m[4] === 1921950 ? [m[0], PANEL, m[2], m[3], m[4]] : m)), () => MANIFEST);
// The family is CLOSED, so "shipped vs pending" no longer separates the owners.
// A site credited to an owner that does not exist still breaks the arithmetic…
mutant(S_, 'credit a site to an owner that does not exist', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicScreenTicker' ? [m[0], 'PR5', m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'move a whole owner out of the shipped set', G.guardManifest,
  () => MANIFEST.map((m) => (m[1] === TICKER_ANALYSIS ? [m[0], 'PENDING', m[2], m[3], m[4]] : m)), () => MANIFEST);
// …but a WRONG OWNER among the four shipped ones keeps every total correct, and
// is caught only by cross-checking against what the modules actually declare.
const OWN_ = 'owner';
mutant(OWN_, 'wrong owner: eicRunDXLink is credited to PANEL', (m) => G.guardOwnership(m, DECLS_BY_MODULE),
  () => MANIFEST.map((m) => (m[0] === 'eicRunDXLink' ? [m[0], PANEL, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(OWN_, 'wrong owner: eicAnalyzeTicker is credited to LIVE_DEEP_DIVE', (m) => G.guardOwnership(m, DECLS_BY_MODULE),
  () => MANIFEST.map((m) => (m[0] === 'eicAnalyzeTicker' ? [m[0], LIVE_DEEP_DIVE, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(OWN_, 'wrong owner: eicDXLinkDeepDive is credited to SCREENING_RULES', (m) => G.guardOwnership(m, DECLS_BY_MODULE),
  () => MANIFEST.map((m) => (m[0] === 'eicDXLinkDeepDive' ? [m[0], SCREENING_RULES, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(OWN_, 'the eicFetchLegs pair is split across two owners', (m) => G.guardOwnership(m, DECLS_BY_MODULE), () => {
  let first = true;
  return MANIFEST.map((m) => { if (m[0] === 'eicFetchLegs' && first) { first = false; return [m[0], PANEL, m[2], m[3], m[4]]; } return m; });
}, () => MANIFEST);
mutant(OWN_, 'a name is declared by TWO modules at once', (m) => G.guardOwnership(MANIFEST, m),
  () => Object.assign({}, DECLS_BY_MODULE, { './js/ui/eic-panel.js': PANEL_DECLS.map((d) => d.name).concat(['eicRunDXLink']) }),
  () => DECLS_BY_MODULE);
mutant(OWN_, 'a shipped module declares something outside the eleven-site plan', (m) => G.guardOwnership(MANIFEST, m),
  () => Object.assign({}, DECLS_BY_MODULE, { './js/ui/eic-live-deep-dive.js': LDD_DECLS.map((d) => d.name).concat(['eicSomethingNew']) }),
  () => DECLS_BY_MODULE);
mutant(OWN_, 'one of the two eicFetchLegs declarations vanishes from its owner', (m) => G.guardOwnership(MANIFEST, m), () => {
  const names = LDD_DECLS.map((d) => d.name);
  names.splice(names.indexOf('eicFetchLegs'), 1);
  return Object.assign({}, DECLS_BY_MODULE, { './js/ui/eic-live-deep-dive.js': names });
}, () => DECLS_BY_MODULE);
mutant(S_, 'make the owner/char arithmetic inconsistent', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicScreenTicker' ? [m[0], m[1], m[2] + 1, m[3], m[4]] : m)), () => MANIFEST);

// ── LOAD ─────────────────────────────────────────────────────────────────────
const L_ = 'load';
const cloneScripts = () => SCRIPT_MODEL.map((s) => Object.assign({}, s));
mutant(L_, 'remove the EIC script tag', G.guardLoad,
  () => cloneScripts().filter((s) => s.src !== G.MODULE_SRC_ATTR), () => SCRIPT_MODEL);
mutant(L_, 'duplicate the EIC script tag', G.guardLoad, () => {
  const s = cloneScripts(); const i = s.findIndex((x) => x.src === G.MODULE_SRC_ATTR);
  s.splice(i + 1, 0, Object.assign({}, s[i])); return s;
}, () => SCRIPT_MODEL);
mutant(L_, 'move the tag AFTER the inline monolith', G.guardLoad, () => {
  const s = cloneScripts(); const i = s.findIndex((x) => x.src === G.MODULE_SRC_ATTR);
  const [tag] = s.splice(i, 1); s.push(tag); return s;
}, () => SCRIPT_MODEL);
mutant(L_, 'add defer to the tag', G.guardLoad, () => cloneScripts().map((s) =>
  (s.src === G.MODULE_SRC_ATTR ? Object.assign({}, s, { attrs: s.attrs + ' defer' }) : s)), () => SCRIPT_MODEL);
mutant(L_, 'add async to the tag', G.guardLoad, () => cloneScripts().map((s) =>
  (s.src === G.MODULE_SRC_ATTR ? Object.assign({}, s, { attrs: s.attrs + ' async' }) : s)), () => SCRIPT_MODEL);
mutant(L_, 'add type="module" to the tag', G.guardLoad, () => cloneScripts().map((s) =>
  (s.src === G.MODULE_SRC_ATTR ? Object.assign({}, s, { attrs: s.attrs + ' type="module"', type: 'module' }) : s)), () => SCRIPT_MODEL);
mutant(L_, 'add a nomodule attribute to the tag', G.guardLoad, () => cloneScripts().map((s) =>
  (s.src === G.MODULE_SRC_ATTR ? Object.assign({}, s, { attrs: s.attrs + ' nomodule' }) : s)), () => SCRIPT_MODEL);
mutant(L_, 'give the tag an inline body as well as a src', G.guardLoad, () => cloneScripts().map((s) =>
  (s.src === G.MODULE_SRC_ATTR ? Object.assign({}, s, { inline: 'eicScreenTicker();' }) : s)), () => SCRIPT_MODEL);
mutant(L_, 'a downstream script READS a moved binding at evaluation time',
  (m) => G.guardNoLoadTimeObservers(m, MOVED_NAMES),
  () => OBSERVER_SOURCES.concat([{ label: '(synthetic downstream)', code: 'var observed = eicScreenTicker;' }]),
  () => OBSERVER_SOURCES);
mutant(L_, 'a downstream script CALLS a moved binding at evaluation time',
  (m) => G.guardNoLoadTimeObservers(m, MOVED_NAMES),
  () => OBSERVER_SOURCES.concat([{ label: '(synthetic downstream)', code: 'eicBuildLiveContext(a,b);' }]),
  () => OBSERVER_SOURCES);
mutant(L_, 'a downstream script registers a moved binding BY REFERENCE at evaluation time',
  (m) => G.guardNoLoadTimeObservers(m, MOVED_NAMES),
  () => OBSERVER_SOURCES.concat([{ label: '(synthetic downstream)', code: 'register(eicLiqFromLegs);' }]),
  () => OBSERVER_SOURCES);
mutant(L_, 'a downstream script probes a moved binding with typeof at evaluation time',
  (m) => G.guardNoLoadTimeObservers(m, MOVED_NAMES),
  () => OBSERVER_SOURCES.concat([{ label: '(synthetic downstream)', code: 'if (typeof eicScreenTicker === "undefined") { boom(); }' }]),
  () => OBSERVER_SOURCES);

// ── OWNER / PURITY ───────────────────────────────────────────────────────────
const P_ = 'purity';
const injectInto = (needle, injection) => MODULE_SRC.replace(needle, needle + '\n  ' + injection);
const AFTER_SCREEN_OPEN = 'function eicScreenTicker(d){';
mutant(P_, 'module reads document', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'var _el = document.getElementById("x");'), () => MODULE_SRC);
mutant(P_, 'module mutates the DOM', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'document.body.innerHTML = "x";'), () => MODULE_SRC);
mutant(P_, 'module reads S.*', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'var _s = S.scanData;'), () => MODULE_SRC);
mutant(P_, 'module writes S.*', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'S.eicShowAll = true;'), () => MODULE_SRC);
mutant(P_, 'module writes to window', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'window.eicHook = 1;'), () => MODULE_SRC);
mutant(P_, 'module writes to globalThis', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'globalThis.eicHook = 1;'), () => MODULE_SRC);
mutant(P_, 'module calls fetch()', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'fetch("/x");'), () => MODULE_SRC);
mutant(P_, 'module calls ttCall()', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'ttCall("/eic/legs/X");'), () => MODULE_SRC);
mutant(P_, 'module opens a WebSocket', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'var ws = new WebSocket("wss://x");'), () => MODULE_SRC);
mutant(P_, 'module sets a timer', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'setTimeout(function(){}, 10);'), () => MODULE_SRC);
mutant(P_, 'module sets an interval', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'setInterval(function(){}, 10);'), () => MODULE_SRC);
mutant(P_, 'module registers a listener', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'document.addEventListener("click", function(){});'), () => MODULE_SRC);
mutant(P_, 'module reads localStorage', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'var v = localStorage.getItem("k");'), () => MODULE_SRC);
mutant(P_, 'module reads sessionStorage', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'var v = sessionStorage.getItem("k");'), () => MODULE_SRC);
mutant(P_, 'module gains a top-level executable statement', G.guardModulePurity,
  () => MODULE_SRC + '\nvar _sideEffect = eicScreenTicker({});\n', () => MODULE_SRC);
mutant(P_, 'module calls another application declaration', G.guardModulePurity,
  () => injectInto(AFTER_SCREEN_OPEN, 'computeSetupScore(d);'), () => MODULE_SRC);

// ── PLAN / RATCHET ───────────────────────────────────────────────────────────
const R_ = 'ratchet';
mutant(R_, 'ratchet grows: 11 → 7 → 8', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 8], () => RATCHET);
mutant(R_, 'inline allowance raised above the real residue', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 9], () => RATCHET);
mutant(R_, 'ratchet opens at the wrong family size', (m) => G.guardRatchet(m, inlineEic.length),
  () => [9, 7], () => RATCHET);
mutant(R_, 'ratchet floor disagrees with the measured residue',
  (m) => G.guardRatchet(RATCHET, m), () => 6, () => inlineEic.length);

// ── PARSER ───────────────────────────────────────────────────────────────────
const X_ = 'parser';
function parserGuardCollapse(src) {
  // A parser that reported names instead of sites would return 3 here.
  const violations = [];
  const d = scanTopLevelDeclarations(src);
  if (d.length !== 4) violations.push('PARSER_SITES: expected 4 sites, got ' + d.length);
  if (d.filter((x) => x.name === 'eicLiqFromLegs').length !== 2) violations.push('PARSER_DUPLICATE: duplicate site was collapsed');
  return { violations, threw: null };
}
mutant(X_, 'duplicate site collapsed into one', parserGuardCollapse,
  () => cutDeclaration(MODULE_SRC, 'eicLiqFromLegs', 1), () => MODULE_SRC);
mutant(X_, 'a stray brace is left outside the four declaration spans', G.guardModuleShape,
  () => MODULE_SRC.replace('  return lines.join(\'\\n\');\n}', '  return lines.join(\'\\n\');\n}\n}'), () => MODULE_SRC);
mutant(X_, 'declaration body extended past its closing brace', G.guardModuleShape,
  () => MODULE_SRC.replace('function eicLiqFromLegs(legs){\n  if(!legs||!legs.aggregate)return null;',
    'function eicLiqFromLegs(legs){\n  if(!legs||!legs.aggregate){return null;}'), () => MODULE_SRC);

// ── PANEL (EIC PR 2) ─────────────────────────────────────────────────────────
// Mutants for the second shipped module. Each perturbs the panel model and is
// handed to the SAME guard the real panel is certified with.
const N_ = 'panel';
const panelShape = (m) => G.guardModuleShape(m, G.EXPECTED_PANEL);
mutant(N_, 'remove runEICPanel from the panel', panelShape,
  () => cutDeclaration(PANEL_SRC, 'runEICPanel', 0), () => PANEL_SRC);
mutant(N_, 'remove eicAnalyzeAll from the panel', panelShape,
  () => cutDeclaration(PANEL_SRC, 'eicAnalyzeAll', 0), () => PANEL_SRC);
mutant(N_, 'swap the two declarations out of physical order', panelShape,
  () => {
    const a = declText(PANEL_SRC, 'runEICPanel', 0), b = declText(PANEL_SRC, 'eicAnalyzeAll', 0);
    return PANEL_SRC.replace(a, '\u0000TMP\u0000').replace(b, a).replace('\u0000TMP\u0000', b);
  }, () => PANEL_SRC);
mutant(N_, 'eicAnalyzeAll loses its async form', panelShape,
  () => PANEL_SRC.replace('async function eicAnalyzeAll(', 'function eicAnalyzeAll('), () => PANEL_SRC);
mutant(N_, 'runEICPanel gains an async form it never had', panelShape,
  () => PANEL_SRC.replace('function runEICPanel(', 'async function runEICPanel('), () => PANEL_SRC);
mutant(N_, 'one byte of runEICPanel changes', panelShape,
  () => PANEL_SRC.replace("if(typeof S.eicShowAll==='undefined')S.eicShowAll=false;",
                          "if(typeof S.eicShowAll==='undefined')S.eicShowAll=true;"), () => PANEL_SRC);
mutant(N_, 'the panel is wrapped in an IIFE — the names stop being global', G.guardPanelSurface,
  () => '(function(){\n' + PANEL_SRC + '\n})();\n', () => PANEL_SRC);
mutant(N_, 'runEICPanel becomes a const arrow — no longer a global declaration', G.guardPanelSurface,
  () => PANEL_SRC.replace('function runEICPanel(){', 'const runEICPanel = () => {'), () => PANEL_SRC);
mutant(N_, 'the panel acquires a fetch() it never had', G.guardPanelSurface,
  () => PANEL_SRC.replace('function runEICPanel(){', 'function runEICPanel(){ fetch("/x");'), () => PANEL_SRC);
mutant(N_, 'the panel acquires a ttCall() it never had', G.guardPanelSurface,
  () => PANEL_SRC.replace('function runEICPanel(){', 'function runEICPanel(){ ttCall("/eic/legs/X");'), () => PANEL_SRC);
mutant(N_, 'the panel assigns to window', G.guardPanelSurface,
  () => PANEL_SRC.replace('function runEICPanel(){', 'function runEICPanel(){ window.eicHook = 1;'), () => PANEL_SRC);
mutant(N_, 'the inherited eicEnrichLegs defect is silently REPAIRED', G.guardPanelSurface,
  () => PANEL_SRC.replace(/eicEnrichLegs\(/g, 'eicFetchLegs('), () => PANEL_SRC);
// Load model, for the panel's own tag.
const panelLoad = (m) => G.guardLoad(m, G.PANEL_SRC_ATTR);
mutant(N_, 'the panel tag loads AFTER the monolith', panelLoad,
  () => { const m = SCRIPT_MODEL.filter((x) => x.src !== G.PANEL_SRC_ATTR);
    const i = m.findIndex((x) => x.isInlineMonolith);
    return m.slice(0, i + 1).concat([{ src: G.PANEL_SRC_ATTR, attrs: 'src="' + G.PANEL_SRC_ATTR + '"', type: null, inline: '', isInlineMonolith: false }], m.slice(i + 1)); },
  () => SCRIPT_MODEL);
mutant(N_, 'the panel tag gains defer', panelLoad,
  () => SCRIPT_MODEL.map((x) => (x.src === G.PANEL_SRC_ATTR ? Object.assign({}, x, { attrs: x.attrs + ' defer' }) : x)),
  () => SCRIPT_MODEL);
mutant(N_, 'the panel tag becomes type="module" — the names stop being global', panelLoad,
  () => SCRIPT_MODEL.map((x) => (x.src === G.PANEL_SRC_ATTR ? Object.assign({}, x, { type: 'module' }) : x)),
  () => SCRIPT_MODEL);
mutant(N_, 'the panel tag is duplicated', panelLoad,
  () => { const t = SCRIPT_MODEL.filter((x) => x.src === G.PANEL_SRC_ATTR)[0];
    const i = SCRIPT_MODEL.indexOf(t);
    return SCRIPT_MODEL.slice(0, i).concat([t, t], SCRIPT_MODEL.slice(i + 1)); },
  () => SCRIPT_MODEL);

// ── PANEL OBSERVERS (EIC PR 2) ───────────────────────────────────────────────
// The §7C result is only worth something if a load-time observer would actually
// fail it. Each mutant injects one into the PANEL's scan window and is handed to
// the SAME guard, with the SAME names, that certified the real sources.
const O_ = 'observer';
const panelObsGuard = (m) => G.guardNoLoadTimeObservers(m, G.PANEL_NAMES);
const withSource = (code) => PANEL_OBSERVER_SOURCES.concat([{ label: '(injected)', code }]);
mutant(O_, 'a downstream script READS runEICPanel at load time', panelObsGuard,
  () => withSource('var boot = runEICPanel;'), () => PANEL_OBSERVER_SOURCES);
mutant(O_, 'a downstream script CALLS runEICPanel at load time', panelObsGuard,
  () => withSource('runEICPanel();'), () => PANEL_OBSERVER_SOURCES);
mutant(O_, 'a downstream script typeof-probes eicAnalyzeAll at load time', panelObsGuard,
  () => withSource('if (typeof eicAnalyzeAll === "function") { boot(); }'), () => PANEL_OBSERVER_SOURCES);
mutant(O_, 'a downstream script registers eicAnalyzeAll at load time', panelObsGuard,
  () => withSource('register(eicAnalyzeAll);'), () => PANEL_OBSERVER_SOURCES);
mutant(O_, 'a downstream IIFE calls the panel while scripts evaluate', panelObsGuard,
  () => withSource('(function(){ runEICPanel(); })();'), () => PANEL_OBSERVER_SOURCES);
mutant(O_, 'a downstream script assigns the panel onto window at load time', panelObsGuard,
  () => withSource('window.p = runEICPanel;'), () => PANEL_OBSERVER_SOURCES);

// ── PANEL PARITY (EIC PR 2) ──────────────────────────────────────────────────
// Real source mutations, run through the real transcript guard. Each changes
// observable behaviour, so BASE and HEAD must stop agreeing.
if (PANEL_TRANSCRIPT_GUARD) {
  const Y_ = 'parity';
  const HEAD_BODY_FOR_MUTANTS = (function () {
    const d1 = PANEL_DECLS.filter((x) => x.name === 'runEICPanel')[0];
    const d2 = PANEL_DECLS.filter((x) => x.name === 'eicAnalyzeAll')[0];
    return PANEL_SRC.slice(d1.start, d1.end + 1) + '\n' + PANEL_SRC.slice(d2.start, d2.end + 1);
  })();
  const pm = (id, mutate) => mutant(Y_, id, PANEL_TRANSCRIPT_GUARD, mutate, () => HEAD_BODY_FOR_MUTANTS);
  pm('the eicShowAll default flips to true',
    () => HEAD_BODY_FOR_MUTANTS.replace("S.eicShowAll=false;", "S.eicShowAll=true;"));
  pm('the earnings window widens past 21 days',
    () => HEAD_BODY_FOR_MUTANTS.replace('days>=2&&days<=21', 'days>=2&&days<=28'));
  pm('the IVR tier threshold moves from 25 to 30',
    () => HEAD_BODY_FOR_MUTANTS.replace('d.ivRank>=25', 'd.ivRank>=30'));
  pm('the analyse batch cap moves from 6 to 4',
    () => HEAD_BODY_FOR_MUTANTS.replace('passed.slice(0,6)', 'passed.slice(0,4)'));
  pm('the click-handler timer delay changes',
    () => HEAD_BODY_FOR_MUTANTS.replace('},50);', '},80);'));
  pm('the enrichment timer is dropped entirely',
    () => HEAD_BODY_FOR_MUTANTS.replace(/if\(S\.ttConnected&&passed\.length\)\{[\s\S]*?\n  \}/, ''));
  pm('a rendered label is reworded',
    () => HEAD_BODY_FOR_MUTANTS.replace('NESSUN CANDIDATO EIC', 'NO CANDIDATES'));
  pm('the passed/rejected sort is inverted',
    () => HEAD_BODY_FOR_MUTANTS.replace('return b.screenScore-a.screenScore;', 'return a.screenScore-b.screenScore;'));
  pm('the macro-warning staleness window changes',
    () => HEAD_BODY_FOR_MUTANTS.replace('S.marketContextValidMinutes||240', 'S.marketContextValidMinutes||10'));
  pm('the self-referential onclick handler is renamed',
    () => HEAD_BODY_FOR_MUTANTS.replace('onclick="runEICPanel()"', 'onclick="reloadEIC()"'));
}

// ── TICKER ANALYSIS (EIC PR 3) ───────────────────────────────────────────────
// Mutants for the third shipped module. Each perturbs a model and is handed to
// the SAME guard the real module is certified with.
const T_ = 'ticker';
const taShape = (m) => G.guardModuleShape(m, G.EXPECTED_TICKER_ANALYSIS);
// Mutate INSIDE the declaration span only. The module's architecture header
// quotes several of the identifiers and selectors below while explaining them,
// so a plain `TA_SRC.replace(...)` would rewrite the COMMENT and leave the code
// untouched — a mutation that changes the file, changes no behaviour, and
// survives. Two mutants were written that way before this helper existed.
const TA_HEAD = TA_SRC.slice(0, TA_DECLS[0].start);
const TA_BODY = TA_SRC.slice(TA_DECLS[0].start);
const taCode = (needle, replacement) => TA_HEAD + TA_BODY.replace(needle, replacement);
mutant(T_, 'remove eicAnalyzeTicker from the module', taShape,
  () => cutDeclaration(TA_SRC, 'eicAnalyzeTicker', 0), () => TA_SRC);
mutant(T_, 'duplicate eicAnalyzeTicker inside the module', taShape,
  () => TA_SRC + '\n' + declText(TA_SRC, 'eicAnalyzeTicker', 0) + '\n', () => TA_SRC);
mutant(T_, 'rename the relocated declaration', taShape,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTickerV2(ticker){'), () => TA_SRC);
mutant(T_, 'eicAnalyzeTicker loses its async form', taShape,
  () => taCode('async function eicAnalyzeTicker(', 'function eicAnalyzeTicker('), () => TA_SRC);
mutant(T_, 'alter the signature', taShape,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTicker(ticker, opts){'), () => TA_SRC);
mutant(T_, 'change one executable byte inside the body', taShape,
  () => taCode("var verdict='NEUTRO';", "var verdict='NEUTRA';"), () => TA_SRC);
mutant(T_, 'the module gains a top-level executable statement', taShape,
  () => TA_SRC + '\nvar _boot = eicAnalyzeTicker("AAPL");\n', () => TA_SRC);
mutant(T_, 'a PR 4 declaration is moved into this module early', taShape,
  () => TA_SRC + '\nasync function eicFetchLegs(ticker){\n  return null;\n}\n', () => TA_SRC);
mutant(T_, 'a stray brace is left outside the declaration span', taShape,
  () => TA_SRC + '\n}\n', () => TA_SRC);
// SURFACE — the §14 guard, derived from the source audit.
mutant(T_, 'the module is wrapped in an IIFE — the name stops being global', G.guardTickerAnalysisSurface,
  () => '(function(){\n' + TA_SRC + '\n})();\n', () => TA_SRC);
mutant(T_, 'eicAnalyzeTicker becomes a const arrow — no longer a global declaration', G.guardTickerAnalysisSurface,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'const eicAnalyzeTicker = async (ticker) => {'), () => TA_SRC);
mutant(T_, 'the panel acquires a fetch() it never had', G.guardTickerAnalysisSurface,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTicker(ticker){ fetch("/x");'), () => TA_SRC);
mutant(T_, 'the panel acquires a ttCall() it never had', G.guardTickerAnalysisSurface,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTicker(ticker){ ttCall("/eic/legs/X");'), () => TA_SRC);
mutant(T_, 'the panel opens a WebSocket', G.guardTickerAnalysisSurface,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTicker(ticker){ var w = new WebSocket("wss://x");'), () => TA_SRC);
mutant(T_, 'the panel acquires a timer', G.guardTickerAnalysisSurface,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTicker(ticker){ setTimeout(function(){}, 10);'), () => TA_SRC);
mutant(T_, 'the panel gains a direct S.* WRITE', G.guardTickerAnalysisSurface,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTicker(ticker){ S.eicLast = ticker;'), () => TA_SRC);
mutant(T_, 'the panel assigns to window', G.guardTickerAnalysisSurface,
  () => taCode('async function eicAnalyzeTicker(ticker){', 'async function eicAnalyzeTicker(ticker){ window.eicHook = 1;'), () => TA_SRC);
mutant(T_, 'the DOM render host is renamed', G.guardTickerAnalysisSurface,
  () => taCode("getElementById('eicResults')", "getElementById('eicOutput')"), () => TA_SRC);
mutant(T_, 'the DXLink button selector is renamed', G.guardTickerAnalysisSurface,
  () => taCode("querySelector('.eic-dxlink-btn')", "querySelector('.eic-dx-button')"), () => TA_SRC);
mutant(T_, 'the emitted DXLink button markup is renamed but the lookup is not', G.guardTickerAnalysisSurface,
  () => taCode('class="eic-dxlink-btn"', 'class="eic-dx-button"'), () => TA_SRC);
mutant(T_, 'the click listener is removed — the panel stops owning its button', G.guardTickerAnalysisSurface,
  () => taCode(/if\(dxBtn\)dxBtn\.addEventListener\('click',function\(\)\{[\s\S]*?\}\);/, ''), () => TA_SRC);
mutant(T_, 'the scan-row mutation is dropped', G.guardTickerAnalysisSurface,
  () => taCode('d.eicFinalDecision=fd;', ''), () => TA_SRC);
mutant(T_, 'the eicRunDXLink call into still-inline PR 4 code is dropped', G.guardTickerAnalysisSurface,
  () => taCode('eicRunDXLink(', 'noopDeepDive('), () => TA_SRC);
mutant(T_, 'the eicScreenTicker call across PR 1s boundary is dropped', G.guardTickerAnalysisSurface,
  () => taCode(/eicScreenTicker\(/g, 'inlineScreen('), () => TA_SRC);
mutant(T_, 'the awaited callAgent call is dropped', G.guardTickerAnalysisSurface,
  () => taCode('await callAgent(', 'await runAgent('), () => TA_SRC);
// RESIDUE — the shipped name must not also remain inline.
mutant(T_, 'eicAnalyzeTicker is shipped AND left inline', G.guardInlineResidue,
  () => INLINE + '\n' + declText(TA_SRC, 'eicAnalyzeTicker', 0) + '\n', () => INLINE);
// LOAD — the module's own tag.
const taLoad = (m) => G.guardLoad(m, G.TICKER_ANALYSIS_SRC_ATTR);
mutant(T_, 'the ticker-analysis tag is missing', taLoad,
  () => SCRIPT_MODEL.filter((x) => x.src !== G.TICKER_ANALYSIS_SRC_ATTR), () => SCRIPT_MODEL);
mutant(T_, 'the ticker-analysis tag is duplicated', taLoad,
  () => { const t = SCRIPT_MODEL.filter((x) => x.src === G.TICKER_ANALYSIS_SRC_ATTR)[0];
    const i = SCRIPT_MODEL.indexOf(t);
    return SCRIPT_MODEL.slice(0, i).concat([t, t], SCRIPT_MODEL.slice(i + 1)); },
  () => SCRIPT_MODEL);
mutant(T_, 'the ticker-analysis tag loads AFTER the monolith', taLoad,
  () => { const m = SCRIPT_MODEL.filter((x) => x.src !== G.TICKER_ANALYSIS_SRC_ATTR);
    const i = m.findIndex((x) => x.isInlineMonolith);
    return m.slice(0, i + 1).concat([{ src: G.TICKER_ANALYSIS_SRC_ATTR, attrs: 'src="' + G.TICKER_ANALYSIS_SRC_ATTR + '"', type: null, inline: '', isInlineMonolith: false }], m.slice(i + 1)); },
  () => SCRIPT_MODEL);
mutant(T_, 'the ticker-analysis tag gains defer', taLoad,
  () => SCRIPT_MODEL.map((x) => (x.src === G.TICKER_ANALYSIS_SRC_ATTR ? Object.assign({}, x, { attrs: x.attrs + ' defer' }) : x)),
  () => SCRIPT_MODEL);
mutant(T_, 'the ticker-analysis tag gains async', taLoad,
  () => SCRIPT_MODEL.map((x) => (x.src === G.TICKER_ANALYSIS_SRC_ATTR ? Object.assign({}, x, { attrs: x.attrs + ' async' }) : x)),
  () => SCRIPT_MODEL);
mutant(T_, 'the ticker-analysis tag becomes type="module" — the name stops being global', taLoad,
  () => SCRIPT_MODEL.map((x) => (x.src === G.TICKER_ANALYSIS_SRC_ATTR ? Object.assign({}, x, { type: 'module' }) : x)),
  () => SCRIPT_MODEL);
mutant(T_, 'the ticker-analysis tag gains an inline body as well as a src', taLoad,
  () => SCRIPT_MODEL.map((x) => (x.src === G.TICKER_ANALYSIS_SRC_ATTR ? Object.assign({}, x, { inline: 'eicAnalyzeTicker("A");' }) : x)),
  () => SCRIPT_MODEL);

// ── TICKER-ANALYSIS OBSERVERS (EIC PR 3) ─────────────────────────────────────
// §7D's "0 load-time observers" is only worth something if one would actually
// fail the guard. The last four inject the CONTROL-FLOW forms the inherited
// scanner misread — they are the mutants that would have SURVIVED before the
// one-character repair, which is what makes that repair load-bearing here.
const taObsGuard = (m) => G.guardNoLoadTimeObservers(m, TA_NAMES);
const withTaSource = (code) => TA_OBSERVER_SOURCES.concat([{ label: '(injected)', code }]);
mutant(O_, 'a downstream script READS eicAnalyzeTicker at load time', taObsGuard,
  () => withTaSource('var boot = eicAnalyzeTicker;'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream script CALLS eicAnalyzeTicker at load time', taObsGuard,
  () => withTaSource('eicAnalyzeTicker("AAPL");'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream script typeof-probes eicAnalyzeTicker at load time', taObsGuard,
  () => withTaSource('typeof eicAnalyzeTicker;'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream script registers eicAnalyzeTicker BY REFERENCE at load time', taObsGuard,
  () => withTaSource('register(eicAnalyzeTicker);'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream script assigns eicAnalyzeTicker onto window at load time', taObsGuard,
  () => withTaSource('window.analyze = eicAnalyzeTicker;'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream IIFE calls eicAnalyzeTicker while scripts evaluate', taObsGuard,
  () => withTaSource('(function(){ eicAnalyzeTicker("A"); })();'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream top-level IF-BLOCK reads eicAnalyzeTicker', taObsGuard,
  () => withTaSource('if (typeof eicAnalyzeTicker === "function") { boot(); }'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream top-level FOR-BLOCK calls eicAnalyzeTicker', taObsGuard,
  () => withTaSource('for (var i=0;i<1;i++) { eicAnalyzeTicker("A"); }'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream top-level WHILE-BLOCK calls eicAnalyzeTicker', taObsGuard,
  () => withTaSource('while (go) { eicAnalyzeTicker("A"); }'), () => TA_OBSERVER_SOURCES);
mutant(O_, 'a downstream top-level SWITCH-BLOCK calls eicAnalyzeTicker', taObsGuard,
  () => withTaSource('switch (k) { case 1: eicAnalyzeTicker("A"); }'), () => TA_OBSERVER_SOURCES);

// ── TICKER-ANALYSIS PARITY (EIC PR 3) ────────────────────────────────────────
// Real source mutations, run through the real transcript guard. Each changes
// observable behaviour on a path the fixture sweep actually reaches.
if (TA_TRANSCRIPT_GUARD) {
  const TA_BODY_FOR_MUTANTS = TA_SRC.slice(TA_DECLS[0].start, TA_DECLS[0].end + 1);
  const tm = (id, mutate) => mutantAsync('parity', id, TA_TRANSCRIPT_GUARD, mutate, () => TA_BODY_FOR_MUTANTS);
  tm('the APPROVATO verdict token changes',
    () => TA_BODY_FOR_MUTANTS.replace("analysis.includes('APPROVATO')", "analysis.includes('APPROVED')"));
  tm('the SCARTATO verdict token changes',
    () => TA_BODY_FOR_MUTANTS.replace("analysis.includes('SCARTATO')", "analysis.includes('REJECTED')"));
  tm('the default verdict flips from NEUTRO',
    () => TA_BODY_FOR_MUTANTS.replace("var verdict='NEUTRO';", "var verdict='UNKNOWN';"));
  tm('the not-found toast is reworded',
    () => TA_BODY_FOR_MUTANTS.replace("' non trovato'", "' not found'"));
  tm('the agent name changes',
    () => TA_BODY_FOR_MUTANTS.replace("callAgent('earnings-ic'", "callAgent('earnings-condor'"));
  tm('the expected-move instruction is reworded',
    () => TA_BODY_FOR_MUTANTS.replace('strike a ~2x Expected Move', 'strike a ~1.5x Expected Move'));
  tm('the macro-summary truncation length changes',
    () => TA_BODY_FOR_MUTANTS.replace('substring(0,200)', 'substring(0,120)'));
  tm('the scan-age unit changes',
    () => TA_BODY_FOR_MUTANTS.replace('/60000)+\'min ago\'', '/1000)+\'s ago\''));
  tm('the DTE divisor changes',
    () => TA_BODY_FOR_MUTANTS.replace('/86400000)', '/43200000)'));
  tm('the MODE B banner is reworded',
    () => TA_BODY_FOR_MUTANTS.replace('ALL STRIKES ARE [THEORETICAL]', 'ALL STRIKES ARE ESTIMATED'));
  tm('the IV source label changes',
    () => TA_BODY_FOR_MUTANTS.replace("'TT[REAL-TIME]'", "'TT[LIVE]'"));
  tm('the setup-score denominator changes',
    () => TA_BODY_FOR_MUTANTS.replace("setupResult.setupScore+'/100 | setupGrade: '", "setupResult.setupScore+'/1000 | setupGrade: '"));
}

// ── RATCHET (EIC PR 3) ───────────────────────────────────────────────────────
mutant(R_, 'ratchet stalls: 11 → 7 → 5 → 4 → 4', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 4, 4], () => RATCHET);
mutant(R_, 'ratchet overshoots below zero: 11 → 7 → 5 → 4 → -1', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 4, -1], () => RATCHET);
mutant(R_, 'the ratchet stops one short of zero: 11 → 7 → 5 → 4', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 4], () => RATCHET);
mutant(R_, 'the ratchet is REOPENED to 3 AFTER reaching zero', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 4, 0, 3], () => RATCHET);
mutant(R_, 'a positive allowance is appended two steps after zero', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 4, 0, 6, 2], () => RATCHET);
mutant(R_, 'the floor is relaxed to the pre-PR4 residue', (m) => G.guardRatchet(RATCHET, m),
  () => 4, () => inlineEic.length);
// One EIC declaration left inline, in every shape that matters.
mutant(R_, 'ONE EIC declaration is left inline (eicRunDXLink)', G.guardInlineResidue,
  () => INLINE + '\n' + declText(LDD_SRC, 'eicRunDXLink', 0) + '\n', () => INLINE);
mutant(R_, 'EIC inline residue is REOPENED after zero (one eicFetchLegs copy returns)', G.guardInlineResidue,
  () => INLINE + '\n' + declText(LDD_SRC, 'eicFetchLegs', 0) + '\n', () => INLINE);
mutant(R_, 'a shipped PR 1 declaration is reintroduced inline', G.guardInlineResidue,
  () => INLINE + '\n' + declText(MODULE_SRC, 'eicBuildLiveContext', 0) + '\n', () => INLINE);
// ── the terminal-zero classifier, under a NEW name ─────────────────────────
// An independent review found the old inline filter could not see these two
// shapes, so "no EIC declaration can be added back under a new name" was a claim
// the code did not enforce. Both must now register as terminal inline residue.
// The guard's verdict is narrowed to the residue-count/pattern violations, so a
// kill cannot be scored by some unrelated rule tripping.
for (const [id, src] of [
  ['a NEW EIC declaration is added inline as runEICSomething()', 'function runEICSomething(){}'],
  ['a NEW EIC declaration is added inline as _eicBootstrap()', 'function _eicBootstrap(){}'],
  ['a NEW EIC declaration is added inline as EICHelper()', 'function EICHelper(){}'],
]) {
  mutant(R_, id,
    (m) => {
      const r = G.guardInlineResidue(m);
      return { violations: r.violations.filter((v) => /RESIDUE_COUNT|RESIDUE_CHARS|RESIDUE_ORDER/.test(v)), threw: r.threw };
    },
    () => INLINE + '\n' + src + '\n', () => INLINE);
}
// …and the CLASSIFIER itself. If it stopped recognising a family shape, the
// residue guard would go quiet on exactly the reintroduction it exists to catch,
// and every assertion above would keep passing.
//
// The model is the classifier's VERDICT VECTOR over a fixed control set, not the
// function object: a function does not survive JSON.stringify, so modelling it
// directly would make the mutation compare undefined to undefined and register
// as inert rather than as a kill.
const FAMILY_CONTROLS = ['eicFoo', 'EICFoo', '_eicFoo', 'runEICFoo', 'runEICSomething',
  '_eicBootstrap', 'runEICPanel', 'eicRunDXLink'];
const classify = (fn) => FAMILY_CONTROLS.map((n) => !!fn(n));
const familyClassifierGuard = (vec) => ({
  violations: FAMILY_CONTROLS
    .filter((n, i) => !vec[i])
    .map((n) => 'PREDICATE_BLIND: ' + n + ' is not classified as an EIC family name'),
  threw: null,
});
mutant(R_, 'the family classifier reverts to the old /^eic/i + runEICPanel rule', familyClassifierGuard,
  () => classify((n) => /^eic/i.test(n) || n === 'runEICPanel'), () => classify(G.isEicFamilyName));
mutant(R_, 'the family classifier drops the leading-underscore case', familyClassifierGuard,
  () => classify((n) => G.isEicFamilyName(n) && !/^[_$]/.test(n)), () => classify(G.isEicFamilyName));
mutant(R_, 'the family classifier only anchors at the start of the name', familyClassifierGuard,
  () => classify((n) => /^[_$]*eic/i.test(n)), () => classify(G.isEicFamilyName));
// The duplicate pair — PR 4 moved BOTH, so the pair rule now lives on the MODULE.
mutant(R_, 'only ONE of the two eicFetchLegs sites was moved', G.guardLiveDeepDiveShape,
  () => cutDeclaration(LDD_SRC, 'eicFetchLegs', 1), () => LDD_SRC);
mutant(R_, 'the duplicate eicFetchLegs pair is collapsed to one', G.guardLiveDeepDiveShape,
  () => cutDeclaration(LDD_SRC, 'eicFetchLegs', 0), () => LDD_SRC);
mutant(R_, 'the duplicate eicFetchLegs pair is dropped entirely', G.guardLiveDeepDiveShape,
  () => cutDeclaration(cutDeclaration(LDD_SRC, 'eicFetchLegs', 1), 'eicFetchLegs', 0), () => LDD_SRC);
mutant(R_, 'the two eicFetchLegs copies are allowed to diverge', G.guardLiveDeepDiveShape,
  () => replaceNth(LDD_SRC, "var resp=await ttCall('/eic/legs/'+ticker);",
    "var resp=await ttCall('/eic/legs/v2/'+ticker);", 1), () => LDD_SRC);

// ── LIVE DEEP DIVE (EIC PR 4) ────────────────────────────────────────────────
const LD_ = 'livedeep';
mutant(LD_, 'remove eicRunDXLink from the module', G.guardLiveDeepDiveShape,
  () => cutDeclaration(LDD_SRC, 'eicRunDXLink', 0), () => LDD_SRC);
mutant(LD_, 'rename a relocated declaration', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace('function eicRunDXLink(ticker, expiration){', 'function eicRunDXLinkV2(ticker, expiration){'), () => LDD_SRC);
mutant(LD_, 'reorder the declarations — the runner is put before the deep dive', G.guardLiveDeepDiveShape, () => {
  const dive = declText(LDD_SRC, 'eicDXLinkDeepDive', 0), run = declText(LDD_SRC, 'eicRunDXLink', 0);
  return LDD_SRC.replace(dive, '__D__').replace(run, dive).replace('__D__', run);
}, () => LDD_SRC);
mutant(LD_, 'change an async form to synchronous', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace('async function eicDXLinkDeepDive(', 'function eicDXLinkDeepDive('), () => LDD_SRC);
mutant(LD_, 'change eicFetchLegs to synchronous', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace('async function eicFetchLegs(', 'function eicFetchLegs('), () => LDD_SRC);
mutant(LD_, 'change a SIGNATURE — eicRunDXLink loses its expiration parameter', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace('async function eicRunDXLink(ticker, expiration){', 'async function eicRunDXLink(ticker){'), () => LDD_SRC);
mutant(LD_, 'change ONE BYTE of a body', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace("acceptDataFormat:'FULL'", "acceptDataFormat:'full'"), () => LDD_SRC);
mutant(LD_, 'reformat a body (whitespace only)', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace('  try{\n    var resp=await', '  try {\n    var resp = await'), () => LDD_SRC);
mutant(LD_, 'rename a local variable', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace('var liveData = {};', 'var liveFeed = {};'), () => LDD_SRC);
mutant(LD_, 'a STRAY EXECUTABLE STATEMENT is left outside the declarations', G.guardLiveDeepDiveShape,
  () => LDD_SRC + '\nwindow.eicLiveDeepDiveReady = true;\n', () => LDD_SRC);
mutant(LD_, 'a stray closing brace is left between declarations', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace('\nasync function eicRunDXLink(', '\n}\nasync function eicRunDXLink('), () => LDD_SRC);
mutant(LD_, 'the module is wrapped in an IIFE', G.guardLiveDeepDiveShape,
  () => '(function(){\n' + LDD_SRC + '\n})();\n', () => LDD_SRC);
mutant(LD_, 'the module is converted to an ES module', G.guardLiveDeepDiveShape,
  () => LDD_SRC + '\nexport { eicRunDXLink };\n', () => LDD_SRC);
mutant(LD_, 'the module gains a CommonJS export', G.guardLiveDeepDiveShape,
  () => LDD_SRC + '\nmodule.exports = { eicRunDXLink };\n', () => LDD_SRC);
mutant(LD_, 'a strict-mode directive is prepended', G.guardLiveDeepDiveShape,
  () => "'use strict';\n" + LDD_SRC, () => LDD_SRC);
mutant(LD_, 'a fifth declaration arrives in the module', G.guardLiveDeepDiveShape,
  () => LDD_SRC + '\nasync function eicExtra(x){ return x; }\n', () => LDD_SRC);

// ── LIVE-DEEP-DIVE SURFACE (EIC PR 4) ────────────────────────────────────────
// §11D's audit is only worth something if changing what it measures FAILS.
const LS_ = 'ldsurface';
mutant(LS_, 'the transport is replaced — ttCall becomes fetch', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace("await ttCall('/quote-token')", "await fetch('/quote-token')"), () => LDD_SRC);
mutant(LS_, 'an ENDPOINT is changed (both copies)', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.split("ttCall('/eic/legs/'+ticker)").join("ttCall('/eic/legs/v2/'+ticker)"), () => LDD_SRC);
// Changing only ONE copy is a different defect — divergence — and belongs to the
// shape guard's duplicate rule, which is where it is proved.
mutant(LS_, 'only ONE endpoint copy is changed — the pair diverges', G.guardLiveDeepDiveShape,
  () => LDD_SRC.replace("ttCall('/eic/legs/'+ticker)", "ttCall('/eic/legs/v2/'+ticker)"), () => LDD_SRC);
mutant(LS_, 'the quote-token endpoint is changed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace("ttCall('/quote-token')", "ttCall('/quote-token-v2')"), () => LDD_SRC);
mutant(LS_, 'the DXLink fallback URL is changed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('wss://tasty-openapi-ws.dxfeed.com/realtime', 'wss://example.invalid/realtime'), () => LDD_SRC);
mutant(LS_, 'the WebSocket is removed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('ws = new WebSocket(wsUrl);', 'ws = null;'), () => LDD_SRC);
mutant(LS_, 'the TIMEOUT is removed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('var timeoutId = setTimeout(function(){', 'var timeoutId = (function(){'), () => LDD_SRC);
mutant(LS_, 'the rendering is removed — innerHTML assignments deleted', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.split(".innerHTML='<span").join(".dataset.x='<span"), () => LDD_SRC);
mutant(LS_, 'the render host id is renamed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.split("getElementById('eicResults')").join("getElementById('eicOutput')"), () => LDD_SRC);
mutant(LS_, 'the status selector is renamed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.split("querySelector('.dxlink-status')").join("querySelector('.dx-status')"), () => LDD_SRC);
mutant(LS_, 'the agent channel is changed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace("callAgent('earnings-ic', ctx)", "callAgent('earnings-ic-v2', ctx)"), () => LDD_SRC);
mutant(LS_, 'a DIRECT S.* write is introduced', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('  setAS(\'earnings-ic\',\'busy\',\'DXLink deep dive per \'+ticker+\'...\');',
    '  S.eicBusy = true;\n  setAS(\'earnings-ic\',\'busy\',\'DXLink deep dive per \'+ticker+\'...\');'), () => LDD_SRC);
mutant(LS_, 'a window write is introduced', G.guardLiveDeepDiveSurface,
  () => LDD_SRC + '\nasync function eicNoop(){ window.eicLive = 1; }\n', () => LDD_SRC);
mutant(LS_, 'a listener is acquired', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace("var res = document.getElementById('eicResults');\n  if(res) res.innerHTML +=",
    "var res = document.getElementById('eicResults');\n  if(res) res.addEventListener('click', function(){});\n  if(res) res.innerHTML +="), () => LDD_SRC);
mutant(LS_, 'the sibling call into PR 1s module is dropped', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('var liveCtx  = eicBuildLiveContext(liveData, baseLegs);', 'var liveCtx  = null;'), () => LDD_SRC);
mutant(LS_, 'the in-module await edge is broken', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('await eicDXLinkDeepDive(ticker, expiration||null)', 'null'), () => LDD_SRC);
// ── THE FDCOLOR REPAIR, plus the remaining preserved defects ────────────────
mutant(LS_, 'the approved fdColor repair block disappears', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace(EIC_UNDO4.POST_EXTRACTION_FDCOLOR_FIX, ''), () => LDD_SRC);
mutant(LS_, 'APPROVED is mapped to the wrong badge colour', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace("'APPROVED':'var(--gr)'", "'APPROVED':'var(--rd)'"), () => LDD_SRC);
mutant(LS_, 'the neutral fdColor fallback is removed', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace("fdColors[fd.finalTradingDecision]||'var(--tx2)'", 'fdColors[fd.finalTradingDecision]'), () => LDD_SRC);
mutant(LS_, 'the live card stops using the selected fdColor', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace("' | <span style=\"color:'+fdColor+';font-weight:700\">'", "' | <span style=\"font-weight:700\">'"), () => LDD_SRC);
mutant(LS_, 'DEFECT REPAIRED: the dead if(d) tsNone guard is tidied', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('if(d) var tsNone=new Date().toISOString();', 'var tsNone=new Date().toISOString();'), () => LDD_SRC);
mutant(LS_, 'DEFECT REPAIRED: the unguarded return is guarded', G.guardLiveDeepDiveSurface,
  () => LDD_SRC.replace('    return d.eicLegsLive;', '    return d?d.eicLegsLive:null;'), () => LDD_SRC);

// ── LIVE-DEEP-DIVE OBSERVERS (EIC PR 4) ──────────────────────────────────────
// §7E's "0 load-time observers" is only worth something if one would actually be
// found. Each mutant injects a real evaluation-time read into a downstream
// source and requires the guard to name it.
const LO_ = 'ldobserver';
for (const [id, snippet] of [
  ['a top-level call appears downstream', '\neicRunDXLink("AAA");\n'],
  ['a top-level reference appears downstream', '\nvar boot = eicDXLinkDeepDive;\n'],
  ['a top-level typeof probe appears downstream', '\nvar t = typeof eicFetchLegs;\n'],
  ['a read hidden in a top-level IF block', '\nif (window.ready) { eicRunDXLink("AAA"); }\n'],
  ['a read hidden in a top-level typeof-guard IF', '\nif (typeof eicRunDXLink === "function") { eicRunDXLink("A"); }\n'],
  ['a read hidden in a top-level FOR block', '\nfor (var i=0;i<1;i++) { eicDXLinkDeepDive("A"); }\n'],
  ['a read hidden in a top-level WHILE block', '\nwhile (window.go) { eicFetchLegs("A"); }\n'],
  ['a read hidden in a top-level SWITCH block', '\nswitch (window.k) { case 1: eicRunDXLink("A"); }\n'],
  ['a read hidden in a top-level IIFE', '\n(function(){ eicRunDXLink("A"); })();\n'],
]) {
  mutant(LO_, id, (m) => G.guardNoLoadTimeObservers(m, LDD_NAMES),
    () => LDD_OBSERVER_SOURCES.map((s, i) => (i === 0 ? { label: s.label, code: s.code + snippet } : s)),
    () => LDD_OBSERVER_SOURCES);
}
// The negative direction — a genuinely deferred read must NOT be reported — is
// a CONTROL, not a mutant: a "mutant" whose guard fires on the unmutated model
// can never satisfy the control-clean requirement, and dressing one up as a kill
// is exactly the fake this file's header calls out. It is asserted directly.
{
  const deferred = LDD_OBSERVER_SOURCES.map((s, i) => (i === 0
    ? { label: s.label, code: s.code + '\nfunction laterLdd(){ eicRunDXLink("A"); }\n' } : s));
  expectClean(G.guardNoLoadTimeObservers(deferred, LDD_NAMES),
    '12.control a genuinely DEFERRED read injected downstream is NOT reported as a load-time observer');
}

// ── EIC MODULE INVENTORY (EIC PR 4) ──────────────────────────────────────────
const LI_ = 'inventory';
mutant(LI_, 'the script tag is MISSING', (m) => G.guardEicModuleInventory(m, DISK_JS_FILES),
  () => SCRIPT_MODEL.filter((s) => s.src !== G.LIVE_DEEP_DIVE_SRC_ATTR), () => SCRIPT_MODEL);
mutant(LI_, 'the script tag is DUPLICATED', (m) => G.guardEicModuleInventory(m, DISK_JS_FILES), () => {
  const i = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
  return SCRIPT_MODEL.slice(0, i).concat([SCRIPT_MODEL[i], SCRIPT_MODEL[i]], SCRIPT_MODEL.slice(i + 1));
}, () => SCRIPT_MODEL);
mutant(LI_, 'the script tag is MOVED AFTER the monolith', (m) => G.guardEicModuleInventory(m, DISK_JS_FILES), () => {
  const i = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
  const rest = SCRIPT_MODEL.slice(0, i).concat(SCRIPT_MODEL.slice(i + 1));
  return rest.concat([SCRIPT_MODEL[i]]);
}, () => SCRIPT_MODEL);
mutant(LI_, 'the four EIC modules stop being CONTIGUOUS', (m) => G.guardEicModuleInventory(m, DISK_JS_FILES), () => {
  const i = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
  const rest = SCRIPT_MODEL.slice(0, i).concat(SCRIPT_MODEL.slice(i + 1));
  const mono = rest.findIndex((s) => s.isInlineMonolith);
  return rest.slice(0, mono - 1).concat([SCRIPT_MODEL[i]], rest.slice(mono - 1));
}, () => SCRIPT_MODEL);
mutant(LI_, 'the EIC modules are loaded OUT OF ORDER', (m) => G.guardEicModuleInventory(m, DISK_JS_FILES), () => {
  const a = SCRIPT_MODEL.findIndex((s) => s.src === G.TICKER_ANALYSIS_SRC_ATTR);
  const b = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
  const out = SCRIPT_MODEL.slice();
  const t = out[a]; out[a] = out[b]; out[b] = t;
  return out;
}, () => SCRIPT_MODEL);
mutant(LI_, 'a FIFTH eic-* module joins — the wildcard/prefix hole', (m) => G.guardEicModuleInventory(m, DISK_JS_FILES), () => {
  const i = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
  return SCRIPT_MODEL.slice(0, i + 1)
    .concat([{ src: './js/ui/eic-extra-panel.js', attrs: ' src="./js/ui/eic-extra-panel.js"', type: null, inline: '', isInlineMonolith: false }])
    .concat(SCRIPT_MODEL.slice(i + 1));
}, () => SCRIPT_MODEL);
mutant(LI_, 'a fifth eic-* module joins under js/services/ instead', (m) => G.guardEicModuleInventory(m, DISK_JS_FILES), () => {
  const i = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
  return SCRIPT_MODEL.slice(0, i + 1)
    .concat([{ src: './js/services/eic-something.js', attrs: ' src="./js/services/eic-something.js"', type: null, inline: '', isInlineMonolith: false }])
    .concat(SCRIPT_MODEL.slice(i + 1));
}, () => SCRIPT_MODEL);
// ── the PATH-SPELLING mutants ───────────────────────────────────────────────
// An independent review found that the first version of this guard filtered
// candidates with /^\.\//, so a fifth module written any other way walked
// straight past the stray check. Each spelling below is now its own mutant, and
// each must be rejected SPECIFICALLY as INVENTORY_UNDECLARED_EIC_MODULE — not
// merely as "some violation", which a count or contiguity rule could satisfy by
// accident.
for (const [id, src] of [
  ['a fifth eic-* module joins BARE-RELATIVE (js/ui/eic-extra.js)', 'js/ui/eic-extra.js'],
  ['a fifth eic-* module joins ROOT-RELATIVE (/js/ui/eic-extra.js)', '/js/ui/eic-extra.js'],
  ['a fifth eic-* module joins with a QUERY STRING (?v=1)', './js/ui/eic-extra.js?v=1'],
  ['a fifth eic-* module joins with a HASH SUFFIX (#x)', './js/ui/eic-extra.js#x'],
]) {
  mutant(LI_, id,
    (m) => {
      const r = G.guardEicModuleInventory(m, DISK_JS_FILES);
      // Only the SPECIFIC violation counts as a kill here.
      return { violations: r.violations.filter((v) => /INVENTORY_UNDECLARED_EIC_MODULE/.test(v)), threw: r.threw };
    },
    () => {
      const i = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
      return SCRIPT_MODEL.slice(0, i + 1)
        .concat([{ src, attrs: ' src="' + src + '"', type: null, inline: '', isInlineMonolith: false }])
        .concat(SCRIPT_MODEL.slice(i + 1));
    }, () => SCRIPT_MODEL);
}
// A remote CDN script that merely LOOKS like an EIC module is NOT part of the
// local inventory, and must not be dragged into it. Asserted as a control, not
// a mutant: the guard is supposed to stay clean here.
{
  const i = SCRIPT_MODEL.findIndex((s) => s.src === G.LIVE_DEEP_DIVE_SRC_ATTR);
  const withRemote = SCRIPT_MODEL.slice(0, i + 1)
    .concat([{ src: 'https://cdn.example.com/eic-vendor.js', attrs: ' src="https://cdn.example.com/eic-vendor.js"', type: null, inline: '', isInlineMonolith: false }])
    .concat(SCRIPT_MODEL.slice(i + 1));
  expectClean(G.guardEicModuleInventory(withRemote, DISK_JS_FILES),
    '12.control a REMOTE eic-looking CDN script is not part of the local inventory and is not reported');
}
// ── the DISK mutants ────────────────────────────────────────────────────────
// Modelled as guard INPUT so a fifth file can be injected without writing one to
// the filesystem. A guard that could only be exercised by creating real files
// could not be exercised safely, and would end up never exercised at all.
mutant(LI_, 'a fifth eic-*.js file EXISTS on disk but is never loaded',
  (m) => {
    const r = G.guardEicModuleInventory(SCRIPT_MODEL, m);
    return { violations: r.violations.filter((v) => /INVENTORY_UNDECLARED_EIC_MODULE/.test(v)), threw: r.threw };
  },
  () => DISK_JS_FILES.concat(['js/ui/eic-orphan.js']), () => DISK_JS_FILES);
mutant(LI_, 'a fifth eic-*.js file exists on disk under js/adapters/',
  (m) => {
    const r = G.guardEicModuleInventory(SCRIPT_MODEL, m);
    return { violations: r.violations.filter((v) => /INVENTORY_UNDECLARED_EIC_MODULE/.test(v)), threw: r.threw };
  },
  () => DISK_JS_FILES.concat(['js/adapters/eic-bridge.js']), () => DISK_JS_FILES);
mutant(LI_, 'a declared module DISAPPEARS from disk', (m) => G.guardEicModuleInventory(SCRIPT_MODEL, m),
  () => DISK_JS_FILES.filter((f) => G.canonicalLocalSrc(f) !== 'js/ui/eic-live-deep-dive.js'), () => DISK_JS_FILES);
// The tag's own attributes, through the load guard.
mutant(LI_, 'the tag gains defer', (m) => G.guardLoad(m, G.LIVE_DEEP_DIVE_SRC_ATTR),
  () => SCRIPT_MODEL.map((s) => (s.src === G.LIVE_DEEP_DIVE_SRC_ATTR ? Object.assign({}, s, { attrs: s.attrs + ' defer' }) : s)), () => SCRIPT_MODEL);
mutant(LI_, 'the tag gains async', (m) => G.guardLoad(m, G.LIVE_DEEP_DIVE_SRC_ATTR),
  () => SCRIPT_MODEL.map((s) => (s.src === G.LIVE_DEEP_DIVE_SRC_ATTR ? Object.assign({}, s, { attrs: s.attrs + ' async' }) : s)), () => SCRIPT_MODEL);
mutant(LI_, 'the tag gains type="module"', (m) => G.guardLoad(m, G.LIVE_DEEP_DIVE_SRC_ATTR),
  () => SCRIPT_MODEL.map((s) => (s.src === G.LIVE_DEEP_DIVE_SRC_ATTR ? Object.assign({}, s, { type: 'module' }) : s)), () => SCRIPT_MODEL);
mutant(LI_, 'the tag gains an inline body as well as a src', (m) => G.guardLoad(m, G.LIVE_DEEP_DIVE_SRC_ATTR),
  () => SCRIPT_MODEL.map((s) => (s.src === G.LIVE_DEEP_DIVE_SRC_ATTR ? Object.assign({}, s, { inline: 'eicRunDXLink();' }) : s)), () => SCRIPT_MODEL);

// ── LIVE-DEEP-DIVE PARITY (EIC PR 4) ─────────────────────────────────────────
// Behavioural mutants, run through the REAL transcript guard from §9F. They are
// asynchronous because everything worth mutating here happens after an await.
const LP_ = 'ldparity';
const LDD_CONCAT = () => LDD_DECLS.map((d) => LDD_SRC.slice(d.start, d.end + 1)).join('\n\n');
for (const [id, from, to] of [
  ['the DXLink timeout budget is shortened', '}, 9000); // 9s timeout', '}, 4000); // 9s timeout'],
  ['the credential is not sent', "ws.send(JSON.stringify({type:'AUTH',channel:0,token:token}));", "ws.send(JSON.stringify({type:'AUTH',channel:0}));"],
  ['the subscription drops the Greeks event', "{type:'Greeks', symbol:sym},", ''],
  ['the confidence thresholds are changed', "var dxConf = gotRealDelta === 4 ? 'high' : gotRealDelta > 0 ? 'partial' : 'none';",
    "var dxConf = gotRealDelta >= 2 ? 'high' : gotRealDelta > 0 ? 'partial' : 'none';"],
  ['a malformed-data fallback is removed', "var msg; try{ msg=JSON.parse(ev.data); }catch(e){ return; }", "var msg = JSON.parse(ev.data);"],
  ['the missing-DOM guard is removed', "if(res) res.innerHTML += '<div style=\"font-size:8px", "res.innerHTML += '<div style=\"font-size:8px"],
  ['an error message is reworded', "throw new Error('Quote token non disponibile')", "throw new Error('Quote token unavailable')"],
  ['a log verdict is reworded', "logEv('earnings-ic','DXLink deepdive failed: '+e.message,'warn');", "logEv('earnings-ic','DXLink deepdive failed: '+e.message,'err');"],
  ['the returned payload loses a field', 'liveLegCount:              gotRealDelta+\'/4\',', ''],
  ['the not-found toast is reworded', "showToast('Ticker non trovato','warn')", "showToast('Ticker not found','warn')"],
  ['a rounding precision is changed', 'liveData[sym2].delta      = +ev2.delta.toFixed(4);', 'liveData[sym2].delta      = +ev2.delta.toFixed(2);'],
  ['the eicFetchLegs catch swallows differently', '  }catch(e){\n    return null;\n  }\n}', '  }catch(e){\n    return undefined;\n  }\n}'],
]) {
  mutantAsync(LP_, id, (m) => LDD_TRANSCRIPT_GUARD(m), () => LDD_CONCAT().split(from).join(to), LDD_CONCAT);
}

// ── run them ─────────────────────────────────────────────────────────────────
// A kill requires three independent facts, and the loop below refuses to record
// one unless it has all three:
//   (a) the guard is CLEAN on the unmutated model  — so "killed" is not the
//       verdict of a guard that rejects whatever it is handed;
//   (b) the mutation actually CHANGED the model    — so a `.replace()` whose
//       target string has drifted cannot be counted as a mutant at all;
//   (c) the guard reported a named VIOLATION       — a thrown error is a
//       harness fault, recorded separately, and never a kill.
const ser = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
let killed = 0;
const survivors = [];
const harnessErrors = [];
const inert = [];
const catTotals = {};
function recordMutant(m, controlClean, controlErr, changed, mutateErr, res, threwOutside) {
  ok(controlClean, '12.control [' + m.category + '] ' + m.id + ' — the guard is clean on the UNMUTATED model'
    + (controlErr ? ' (threw ' + controlErr + ')' : ''));
  if (!changed) inert.push(m.category + ' / ' + m.id + (mutateErr ? ' → mutator threw: ' + mutateErr : ''));
  ok(changed, '12.differs [' + m.category + '] ' + m.id + ' — the mutation really alters the model'
    + (mutateErr ? ' (mutator threw ' + mutateErr + ')' : ''));
  const detected = !!(res && res.violations.length > 0);
  const isKill = detected && controlClean && changed;
  if (isKill) { killed++; catTotals[m.category].killed++; }
  else if (threwOutside) harnessErrors.push(m.category + ' / ' + m.id + ' → harness threw: ' + threwOutside);
  else if (changed) survivors.push(m.category + ' / ' + m.id);
  ok(isKill, '12.mutant [' + m.category + '] ' + m.id
    + (isKill ? '' : ' — SURVIVED' + (threwOutside ? ' (guard threw instead of reporting: ' + threwOutside + ')' : '')));
}

for (const m of MUTANTS) {
  catTotals[m.category] = catTotals[m.category] || { total: 0, killed: 0 };
  catTotals[m.category].total++;
  if (m.isAsync) continue;   // second pass, below

  let controlClean = false, controlErr = null;
  try { const c = m.guard(m.baseline()); controlClean = c.violations.length === 0; }
  catch (e) { controlErr = String(e && e.message); }
  ok(controlClean, '12.control [' + m.category + '] ' + m.id + ' — the guard is clean on the UNMUTATED model'
    + (controlErr ? ' (threw ' + controlErr + ')' : ''));

  let changed = false, mutateErr = null, mutated;
  try { mutated = m.mutate(); changed = ser(m.baseline()) !== ser(mutated); }
  catch (e) { mutateErr = String(e && e.message); }
  if (!changed) inert.push(m.category + ' / ' + m.id + (mutateErr ? ' → mutator threw: ' + mutateErr : ''));
  ok(changed, '12.differs [' + m.category + '] ' + m.id + ' — the mutation really alters the model'
    + (mutateErr ? ' (mutator threw ' + mutateErr + ')' : ''));

  let res = null, threwOutside = null;
  if (changed) {
    try { res = m.guard(mutated); } catch (e) { threwOutside = String(e && e.message); }
  }
  recordMutant(m, controlClean, controlErr, changed, mutateErr, res, threwOutside);
}

// ── second pass: promise-returning guards ────────────────────────────────────
// Same three requirements, same recorder; the only difference is that the
// verdict is awaited instead of read synchronously.
PARITY_TAIL = PARITY_TAIL.then(function () {
  let chain = Promise.resolve();
  for (const m of MUTANTS.filter((x) => x.isAsync)) {
    chain = chain.then(function () {
      let controlClean = false, controlErr = null;
      return Promise.resolve()
        .then(() => m.guard(m.baseline()))
        .then((c) => { controlClean = c.violations.length === 0; },
          (e) => { controlErr = String(e && e.message); })
        .then(() => {
          let changed = false, mutateErr = null, mutated;
          try { mutated = m.mutate(); changed = ser(m.baseline()) !== ser(mutated); }
          catch (e) { mutateErr = String(e && e.message); }
          if (!changed) { recordMutant(m, controlClean, controlErr, false, mutateErr, null, null); return; }
          return Promise.resolve()
            .then(() => m.guard(mutated))
            .then((res) => recordMutant(m, controlClean, controlErr, true, mutateErr, res, null),
              (e) => recordMutant(m, controlClean, controlErr, true, mutateErr, null, String(e && e.message)));
        });
    });
  }
  return chain.then(function () {
    eq(survivors, [], '12.1 mutation survivors');
    eq(harnessErrors, [], '12.2 harness errors (a guard that throws never counts as a kill)');
    eq(inert, [], '12.3 inert mutants (a mutation that changes nothing is not a mutant)');
    eq(killed, MUTANTS.length, '12.4 every genuine mutant was killed by a real guard violation');
    ok(MUTANTS.length >= 55, '12.5 the suite runs ' + MUTANTS.length + ' genuine mutants');
    eq(Object.keys(catTotals).length, 15, '12.6 fifteen mutation categories: ' + Object.keys(catTotals).sort().join(', '));
    for (const c of ['livedeep', 'ldsurface', 'ldobserver', 'ldparity', 'inventory', 'owner']) {
      ok(catTotals[c] && catTotals[c].total > 0, '12.8 the PR 4 category "' + c + '" ran ' + (catTotals[c] ? catTotals[c].total : 0) + ' mutants');
    }
    ok(MUTANTS.filter((x) => x.category === 'ldparity' && x.isAsync).length >= 10,
      '12.9 the live-deep-dive parity mutants are ASYNCHRONOUS — everything worth mutating here happens after an await');
    eq(MUTANTS.filter((x) => x.isAsync).length > 0, true,
      '12.7 the async pass really ran ' + MUTANTS.filter((x) => x.isAsync).length + ' promise-guarded mutants');
  });
});

PARITY_TAIL.then(function () {
  // ═════════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('  SCREENING_RULES  4 sites / 3 names / 14,368 chars   SHIPPED');
  console.log('  PANEL            2 sites / 15,268 chars   SHIPPED');
  console.log('  TICKER_ANALYSIS  1 site  / 13,990 chars   SHIPPED');
  console.log('  LIVE_DEEP_DIVE   4 sites / 3 names / 23,726 chars   SHIPPED');
  console.log('                   ─────────────────────────');
  console.log('                   11 sites / 9 names / 67,352 chars   COMPLETE');
  console.log('');
  console.log('  SHIPPED          ' + G.SHIPPED_SITES + ' / ' + G.SHIPPED_CHARS.toLocaleString('en-US'));
  console.log('  INLINE           ' + G.PENDING_SITES + ' / ' + G.PENDING_CHARS.toLocaleString('en-US')
    + '   [' + G.PENDING_ORDER.join(', ') + ']');
  console.log('  RATCHET:         ' + RATCHET.join(' → '));
  console.log('');
  console.log('  observers        ' + OBSERVER_SOURCES.length + ' downstream sources scanned ('
    + DOWNSTREAM.length + ' local scripts + the monolith) · '
    + OBSERVER_CONTROLS.length + ' scanner controls · load-time observers found: '
    + MOVED_NAMES.reduce((a, n) => a + (REAL_OBS[n] ? REAL_OBS[n].load : 0), 0));
  console.log('  ticker obs       ' + TA_OBSERVER_SOURCES.length + ' downstream sources scanned ('
    + TA_DOWNSTREAM.length + ' local scripts + the monolith) · '
    + TA_OBSERVER_CONTROLS.length + ' scanner controls · load-time observers found: '
    + TA_NAMES.reduce((a, n) => a + (TA_OBS[n] ? TA_OBS[n].load : 0), 0));
  console.log('  livedeep obs     ' + LDD_OBSERVER_SOURCES.length + ' downstream sources scanned ('
    + LDD_DOWNSTREAM.length + ' local scripts + the monolith) · '
    + LDD_OBSERVER_CONTROLS.length + ' scanner controls · load-time observers found: '
    + LDD_NAMES.reduce((a, n) => a + (LDD_OBS[n] ? LDD_OBS[n].load : 0), 0));
  console.log('  parity           eicScreenTicker ' + fxScreen + ' · eicLiqFromLegs ' + fxLiq
    + ' · eicBuildLiveContext ' + fxCtx + ' = ' + (fxScreen + fxLiq + fxCtx) + ' fixtures · differences ' + diffs);
  console.log('  panel parity     runEICPanel ' + pxPanel + ' · eicAnalyzeAll ' + pxAnalyze
    + ' = ' + (pxPanel + pxAnalyze) + ' fixtures · differences ' + pxDiffs);
  console.log('  ticker parity    eicAnalyzeTicker ' + txTicker + ' fixtures · differences ' + txDiffs);
  console.log('  livedeep parity  ' + LDD_FIX_COUNT + ' fixtures across all 4 moved sites · differences ' + LDD_DIFFS);
  console.log('  cross-module     PR2 ' + XMOD_DIFFS + ' diffs · PR3 ' + XTA_DIFFS + ' diffs · PR4 ' + XLDD_DIFFS + ' diffs');
  console.log('  undo chain       PR4 → post-PR3 → PR3 → post-PR2 → PR2 → post-PR1 → PR1 → post-PESS');
  console.log('  mutants          ' + killed + '/' + MUTANTS.length + ' killed, ' + survivors.length + ' survivors, '
    + harnessErrors.length + ' harness errors');
  for (const c of Object.keys(catTotals).sort()) {
    console.log('                   ' + c.padEnd(10) + ' ' + catTotals[c].killed + '/' + catTotals[c].total);
  }
  console.log('');
  console.log('  assertions: ' + passed);
  console.log('');
  console.log('  EIC PRs 1-4 COMPLETE · inline residue 0 sites / 0 chars · ratchet '
    + RATCHET.join(' → ') + ' (zero is TERMINAL)');
  if (failures.length) {
    console.log('');
    console.log('  FAILURES (' + failures.length + '):');
    for (const f of failures) console.log('    - ' + f);
    console.log('════════════════════════════════════════════════════════════════════════════════');
    process.exit(1);
  }
  console.log('  EIC EXTRACTION BOUNDARY CONTRACT: OK');
  console.log('════════════════════════════════════════════════════════════════════════════════');

});
