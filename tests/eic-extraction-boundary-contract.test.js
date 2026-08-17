'use strict';
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
//   PANEL             js/ui/eic-panel.js                        2 / 15,268   pending
//   TICKER_ANALYSIS   js/ui/eic-ticker-analysis-panel.js        1 / 13,990   pending
//   LIVE_DEEP_DIVE    js/ui/eic-live-deep-dive.js               4 / 23,726   pending
//                                                              ──────────────
//                                                             11 / 67,352
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
const RATCHET = [11, 7, 5, 4];
// PR 1's three names. Sections 8 and 9 are PR 1's purity and parity proofs and
// must keep meaning exactly that; the panel gets its own sections, because a
// panel is not pure and proving it "pure" would be proving something false.
const MOVED_NAMES = G.PR1_NAMES;
const PANEL_NAMES = G.PANEL_NAMES;
const TA_NAMES = G.TICKER_ANALYSIS_NAMES;

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
console.log('  EIC EXTRACTION BOUNDARY CONTRACT — PRs 1-3 of 4');
console.log('  (SCREENING_RULES, PANEL, TICKER_ANALYSIS · LIVE_DEEP_DIVE pending)');
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
  const baseEic = scanTopLevelDeclarations(BASE_MONO).filter((d) => /^eic/i.test(d.name) || d.name === 'runEICPanel');
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
const inlineEic = INLINE_DECLS.filter((d) => /^eic/i.test(d.name) || d.name === 'runEICPanel');
eq(inlineEic.length, G.PENDING_SITES, '5.2 exactly four EIC sites remain inline');
eq(inlineEic.reduce((a, d) => a + d.chars, 0), G.PENDING_CHARS, '5.3 …totalling 23,726 chars');
deepEq(inlineEic.map((d) => d.name), G.PENDING_ORDER, '5.4 …and they are exactly the pending LIVE_DEEP_DIVE sites, in physical order');
eq(inlineEic.filter((d) => d.name === 'eicFetchLegs').length, 2,
  '5.5 eicFetchLegs is still declared TWICE inline — PR 4 must move both');
expectClean(G.guardRatchet(RATCHET, inlineEic.length), '5.6 the ratchet satisfies the shrink-only contract');
deepEq(RATCHET, [11, 7, 5, 4], '5.7 the inline allowance ratcheted 11 → 7 → 5 → 4');
eq(new Set(inlineEic.map((d) => d.name)).size, 3, '5.8 …across exactly three unique inline names, all owned by PR 4');

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
eq(DOWNSTREAM.length, 26, '7.9 twenty-six local scripts execute between the module and the monolith');
eq(OBSERVER_SOURCES.length, 27, '7.10 …and all 27 downstream sources are scanned, monolith included');
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
    .map((s) => ({ label: String(s.src || '(monolith)'), code: s.code }));
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
    // The PR 4 names must STILL be the monolith's — proving PR 4 was not started.
    const monoCode = ORDERED[MONO_SLOT].code;
    for (const nm of ['eicFetchLegs', 'eicDXLinkDeepDive', 'eicRunDXLink']) {
      eq(typeof HEAD_APP3.ctx[nm], 'function', '9E.10 ' + nm + ' resolves as a global function');
      ok(monoCode.indexOf(String(HEAD_APP3.ctx[nm])) >= 0,
        '9E.11 …and its text is still found INSIDE the inline monolith — PR 4 has not shipped');
      eq(String(HEAD_APP3.ctx[nm]), String(BASE_APP3.ctx[nm]), '9E.12 …identical on BASE and HEAD');
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
section('10. THE REST OF THE APPLICATION IS UNTOUCHED');
// ═════════════════════════════════════════════════════════════════════════════
if (BASE_MONO) {
  const baseDecls = scanTopLevelDeclarations(BASE_MONO);
  const APP_DECLS = scanTopLevelDeclarations(APP_SRC);
  const baseMap = {}, headMap = {};
  for (const d of baseDecls) (baseMap[d.name] = baseMap[d.name] || []).push(BASE_MONO.slice(d.start, d.end + 1));
  for (const d of APP_DECLS) (headMap[d.name] = headMap[d.name] || []).push(APP_SRC.slice(d.start, d.end + 1));
  let missing = 0, changed = 0;
  for (const n of Object.keys(baseMap)) {
    if (!headMap[n]) { missing++; continue; }
    if (baseMap[n].length !== headMap[n].length) { changed++; continue; }
    for (let i = 0; i < baseMap[n].length; i++) if (baseMap[n][i] !== headMap[n][i]) { changed++; break; }
  }
  eq(missing, 0, '10.1 no declaration disappeared from the application');
  eq(changed, 0, '10.2 no declaration body changed by a single byte');
  eq(baseDecls.length - INLINE_DECLS.length, 7,
    '10.3 the inline monolith lost exactly seven declaration sites — four for PR 1, two for PR 2, one for PR 3');
} else {
  ok(true, '10.1 whole-file comparison skipped: base blob unavailable');
}
let parseErr = null;
try { new vm.Script(APP_SRC, { filename: 'reconstructed-app.js' }); } catch (e) { parseErr = e; }
ok(parseErr === null, '10.4 the reconstructed application parses' + (parseErr ? ' — ' + parseErr.message : ''));

// ═════════════════════════════════════════════════════════════════════════════
section('11. THE UNDO CHAIN');
//
// Three links now, newest first: PR 3, then PR 2, then PR 1. Each PR's recorded
// offsets are positions in the monolith AS IT WAS WHEN THAT PR WAS CUT, so the
// order is not a convention — undoing an older PR first would reinsert text
// ABOVE a newer PR's offset and land its region inside another function's body,
// producing a plausible-looking document that is silently wrong. Each link is
// proved by hash on its own, the whole chain is proved end to end, and BOTH
// wrong orders are proved to fail rather than pass by luck.
// ═════════════════════════════════════════════════════════════════════════════
{
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
  eq((HTML.match(/\/\/ S\.eicShowAll: toggle to show all candidates including hard-rejected/g) || []).length, 1,
    '11.0i …it is still in index.html, exactly where it always was');
  eq((PANEL_SRC.match(/\/\/ S\.eicShowAll: toggle to show all candidates including hard-rejected/g) || []).length, 1,
    '11.0j …and the OTHER copy is the one PR 2 legitimately took into the panel');
  eq(HTML.split(EIC_UNDO3.TAG + '\n').length - 1, 1, '11.0k the PR 3 tag appears exactly once and is removed exactly once');
  const undone3 = EIC_UNDO3.postPr2Html(HTML);
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
  const chain = EIC_UNDO3.postPessHtml(HTML);
  eq(chain.verified, true, '11.16 the full chain HEAD → post-PR2 → post-PR1 → post-PESS verifies end to end (' + chain.reason + ')');
  eq(chain.html ? sha256(chain.html) : null, EIC_UNDO.POST_PESS_INDEX_SHA256,
    '11.17 …and lands on exactly the same document as the two links run by hand');

  // ── ORDER IS LOAD-BEARING ─────────────────────────────────────────────────
  // Undoing PR 1 first, against a document PR 2 has already been cut from,
  // must NOT quietly succeed.
  const wrongOrder = EIC_UNDO.postPessHtml(HTML);
  ok(!wrongOrder.verified,
    '11.18 undoing PR 1 FIRST fails loudly — the chain order is a real constraint, not a convention');
  const wrongOrder2 = EIC_UNDO2.postPr1Html(HTML);
  ok(!wrongOrder2.verified,
    '11.18b undoing PR 2 before PR 3 fails too — PR 2 reinserts 15,343 chars ABOVE PR 3s offset, so PR 3s region would land inside another body');
  const wrongOrder3 = EIC_UNDO2.postPessHtml(HTML);
  ok(!wrongOrder3.verified,
    '11.18c …and so does the PR2-rooted whole-chain call, which no longer owns the newest link');

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
mutant(S_, 'extract a pending declaration early (eicDXLinkDeepDive leaves the monolith)', G.guardInlineResidue,
  () => cutDeclaration(INLINE, 'eicDXLinkDeepDive', 0), () => INLINE);
mutant(S_, 'ship only ONE of the two inline eicFetchLegs sites', G.guardInlineResidue,
  () => cutDeclaration(INLINE, 'eicFetchLegs', 1), () => INLINE);
mutant(S_, 'collapse the 11-site manifest into a 9-name manifest', G.guardManifest, () => {
  const seen = new Set();
  return MANIFEST.filter((m) => { if (seen.has(m[0])) return false; seen.add(m[0]); return true; });
}, () => MANIFEST);
mutant(S_, 'split the duplicate pair across two owners', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicLiqFromLegs' && m[4] === 1921950 ? [m[0], PANEL, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'mark a shipped site as pending', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicScreenTicker' ? [m[0], LIVE_DEEP_DIVE, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'mark a pending site as shipped', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicDXLinkDeepDive' ? [m[0], SCREENING_RULES, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'mark a PANEL site as pending — PR 2 shipped it', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'runEICPanel' ? [m[0], LIVE_DEEP_DIVE, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'mark the TICKER_ANALYSIS site as pending — PR 3 shipped it', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicAnalyzeTicker' ? [m[0], LIVE_DEEP_DIVE, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'mark a PR 4 site as shipped EARLY — LIVE_DEEP_DIVE has not shipped', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicRunDXLink' ? [m[0], TICKER_ANALYSIS, m[2], m[3], m[4]] : m)), () => MANIFEST);
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
mutant(R_, 'ratchet stalls: 11 → 7 → 5 → 5', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 5], () => RATCHET);
mutant(R_, 'ratchet overshoots: 11 → 7 → 5 → 3', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 3], () => RATCHET);
mutant(R_, 'the ratchet is REOPENED to 6', (m) => G.guardRatchet(m, inlineEic.length),
  () => [11, 7, 5, 4, 6], () => RATCHET);
mutant(R_, 'the floor is relaxed to the pre-PR3 residue', (m) => G.guardRatchet(RATCHET, m),
  () => 5, () => inlineEic.length);
// The duplicate pair — PR 4 must move BOTH, so both must still be inline now.
mutant(R_, 'only ONE of the two inline eicFetchLegs sites survives', G.guardInlineResidue,
  () => cutDeclaration(INLINE, 'eicFetchLegs', 1), () => INLINE);
mutant(R_, 'the duplicate eicFetchLegs pair is collapsed to nothing', G.guardInlineResidue,
  () => cutDeclaration(cutDeclaration(INLINE, 'eicFetchLegs', 1), 'eicFetchLegs', 0), () => INLINE);
mutant(R_, 'the two eicFetchLegs sites are allowed to diverge', G.guardInlineResidue,
  () => replaceNth(INLINE, "var resp=await ttCall('/eic/legs/'+ticker);",
    "var resp=await ttCall('/eic/legs/v2/'+ticker);", 1), () => INLINE);

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
    eq(Object.keys(catTotals).length, 9, '12.6 nine mutation categories: ' + Object.keys(catTotals).sort().join(', '));
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
  console.log('  LIVE_DEEP_DIVE   4 sites / 23,726 chars                pending');
  console.log('                   ─────────────────────────');
  console.log('                   11 sites / 9 names / 67,352 chars');
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
  console.log('  parity           eicScreenTicker ' + fxScreen + ' · eicLiqFromLegs ' + fxLiq
    + ' · eicBuildLiveContext ' + fxCtx + ' = ' + (fxScreen + fxLiq + fxCtx) + ' fixtures · differences ' + diffs);
  console.log('  panel parity     runEICPanel ' + pxPanel + ' · eicAnalyzeAll ' + pxAnalyze
    + ' = ' + (pxPanel + pxAnalyze) + ' fixtures · differences ' + pxDiffs);
  console.log('  ticker parity    eicAnalyzeTicker ' + txTicker + ' fixtures · differences ' + txDiffs);
  console.log('  cross-module     PR2 ' + XMOD_DIFFS + ' diffs · PR3 ' + XTA_DIFFS + ' diffs');
  console.log('  mutants          ' + killed + '/' + MUTANTS.length + ' killed, ' + survivors.length + ' survivors, '
    + harnessErrors.length + ' harness errors');
  for (const c of Object.keys(catTotals).sort()) {
    console.log('                   ' + c.padEnd(10) + ' ' + catTotals[c].killed + '/' + catTotals[c].total);
  }
  console.log('');
  console.log('  assertions: ' + passed);
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
