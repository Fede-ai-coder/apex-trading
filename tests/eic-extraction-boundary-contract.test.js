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
const RATCHET = [11, 7];
const MOVED_NAMES = G.SHIPPED_NAMES;

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
console.log('  EIC EXTRACTION BOUNDARY CONTRACT — PR 1 of 4 (SCREENING_RULES)');
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
eq(inlineEic.length, G.PENDING_SITES, '5.2 exactly seven EIC sites remain inline');
eq(inlineEic.reduce((a, d) => a + d.chars, 0), G.PENDING_CHARS, '5.3 …totalling 52,984 chars');
deepEq(inlineEic.map((d) => d.name), G.PENDING_ORDER, '5.4 …and they are exactly the pending three owners, in physical order');
eq(inlineEic.filter((d) => d.name === 'eicFetchLegs').length, 2,
  '5.5 eicFetchLegs is still declared TWICE inline — PR 4 must move both');
expectClean(G.guardRatchet(RATCHET, inlineEic.length), '5.6 the ratchet satisfies the shrink-only contract');
deepEq(RATCHET, [11, 7], '5.7 the inline allowance ratcheted 11 → 7');

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
eq(DOWNSTREAM.length, 24, '7.9 twenty-four local scripts execute between the module and the monolith');
eq(OBSERVER_SOURCES.length, 25, '7.10 …and all 25 downstream sources are scanned, monolith included');
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
  eq(baseDecls.length - INLINE_DECLS.length, 4, '10.3 the inline monolith lost exactly four declaration sites');
} else {
  ok(true, '10.1 whole-file comparison skipped: base blob unavailable');
}
let parseErr = null;
try { new vm.Script(APP_SRC, { filename: 'reconstructed-app.js' }); } catch (e) { parseErr = e; }
ok(parseErr === null, '10.4 the reconstructed application parses' + (parseErr ? ' — ' + parseErr.message : ''));

// ═════════════════════════════════════════════════════════════════════════════
section('11. THE UNDO HELPER');
// ═════════════════════════════════════════════════════════════════════════════
{
  const regions = EIC_UNDO.regionTexts();
  eq(regions.length, 4, '11.1 exactly four regions are derived from the shipped module');
  deepEq(EIC_UNDO.REGION_OFFSETS.map((r) => r.name), G.EXPECTED_MODULE.order, '11.2 …in the recorded order');
  deepEq(regions.map((r) => r.length), EIC_UNDO.REGION_OFFSETS.map((r) => r.chars), '11.3 …with the recorded lengths');
  eq(regions.reduce((a, r) => a + r.length, 0), EIC_UNDO.REGION_TOTAL_CHARS, '11.4 …totalling ' + EIC_UNDO.REGION_TOTAL_CHARS + ' region chars');
  ok(EIC_UNDO.REGION_TOTAL_CHARS > 14368,
    '11.5 region chars exceed declaration chars, because a region is declaration + its leading comment + separator');
  eq(HTML.split(EIC_UNDO.TAG + '\n').length - 1, 1, '11.6 the EIC tag appears exactly once and is removed exactly once');
  const undone = EIC_UNDO.postPessHtml(HTML);
  eq(undone.verified, true, '11.7 undoing EIC PR 1 reproduces the post-PESS document byte-exactly (' + undone.reason + ')');
  eq(undone.html ? undone.html.length : -1, EIC_UNDO.POST_PESS_INDEX_CHARS, '11.8 …at the recorded character count');
  eq(undone.html ? sha256(undone.html) : null, EIC_UNDO.POST_PESS_INDEX_SHA256, '11.9 …and the recorded SHA-256');
  // NEGATIVE CONTROL — the hash check must actually be load-bearing.
  const tampered = MODULE_SRC.replace('var ivr=d.ivRank!=null?d.ivRank:0;', 'var ivr=d.ivRank!=null?d.ivRank:1;');
  ok(tampered !== MODULE_SRC, '11.10 negative control: one byte of the module source was changed in memory');
  const fakeRegions = EIC_UNDO.regionTexts().slice();
  fakeRegions[0] = fakeRegions[0].replace('d.ivRank:0', 'd.ivRank:1');
  ok(fakeRegions[0] !== regions[0], '11.11 …and the derived region changed with it');
  const rebuilt = (function () {
    let out = HTML.replace(EIC_UNDO.TAG + '\n', '');
    const inl = L.parseScriptTags(out).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
    const monoAt = out.indexOf(inl[0].inline);
    const spans = EIC_UNDO.REGION_OFFSETS.map((r, i) => ({ off: r.monoOffset, text: fakeRegions[i] }));
    for (const s of spans.slice().sort((a, b) => a.off - b.off)) out = out.slice(0, monoAt + s.off) + s.text + out.slice(monoAt + s.off);
    return out;
  })();
  ok(sha256(rebuilt) !== EIC_UNDO.POST_PESS_INDEX_SHA256,
    '11.12 …so the reconstruction NO LONGER matches the post-PESS hash — the check is load-bearing, not decorative');
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
  MUTANTS.push({ category, id, guard, mutate, baseline });
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
mutant(S_, 'extract a pending declaration early (runEICPanel leaves the monolith)', G.guardInlineResidue,
  () => cutDeclaration(INLINE, 'runEICPanel', 0), () => INLINE);
mutant(S_, 'ship only ONE of the two inline eicFetchLegs sites', G.guardInlineResidue,
  () => cutDeclaration(INLINE, 'eicFetchLegs', 1), () => INLINE);
mutant(S_, 'collapse the 11-site manifest into a 9-name manifest', G.guardManifest, () => {
  const seen = new Set();
  return MANIFEST.filter((m) => { if (seen.has(m[0])) return false; seen.add(m[0]); return true; });
}, () => MANIFEST);
mutant(S_, 'split the duplicate pair across two owners', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicLiqFromLegs' && m[4] === 1921950 ? [m[0], PANEL, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'mark a shipped site as pending', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'eicScreenTicker' ? [m[0], PANEL, m[2], m[3], m[4]] : m)), () => MANIFEST);
mutant(S_, 'mark a pending site as shipped', G.guardManifest,
  () => MANIFEST.map((m) => (m[0] === 'runEICPanel' ? [m[0], SCREENING_RULES, m[2], m[3], m[4]] : m)), () => MANIFEST);
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
for (const m of MUTANTS) {
  catTotals[m.category] = catTotals[m.category] || { total: 0, killed: 0 };
  catTotals[m.category].total++;

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
  const detected = !!(res && res.violations.length > 0);
  const isKill = detected && controlClean && changed;
  if (isKill) { killed++; catTotals[m.category].killed++; }
  else if (threwOutside) harnessErrors.push(m.category + ' / ' + m.id + ' → harness threw: ' + threwOutside);
  else if (changed) survivors.push(m.category + ' / ' + m.id);
  ok(isKill, '12.mutant [' + m.category + '] ' + m.id
    + (isKill ? '' : ' — SURVIVED' + (threwOutside ? ' (guard threw instead of reporting: ' + threwOutside + ')' : '')));
}
eq(survivors, [], '12.1 mutation survivors');
eq(harnessErrors, [], '12.2 harness errors (a guard that throws never counts as a kill)');
eq(inert, [], '12.3 inert mutants (a mutation that changes nothing is not a mutant)');
eq(killed, MUTANTS.length, '12.4 every genuine mutant was killed by a real guard violation');
ok(MUTANTS.length >= 55, '12.5 the suite runs ' + MUTANTS.length + ' genuine mutants');
ok(Object.keys(catTotals).length === 5, '12.6 five mutation categories: ' + Object.keys(catTotals).sort().join(', '));

// ═════════════════════════════════════════════════════════════════════════════
console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  SCREENING_RULES  4 sites / 3 names / 14,368 chars   SHIPPED');
console.log('  PANEL            2 sites / 15,268 chars                pending');
console.log('  TICKER_ANALYSIS  1 site  / 13,990 chars                pending');
console.log('  LIVE_DEEP_DIVE   4 sites / 23,726 chars                pending');
console.log('                   ─────────────────────────');
console.log('                   11 sites / 9 names / 67,352 chars');
console.log('');
console.log('  INLINE           ' + G.PENDING_SITES + ' / ' + G.PENDING_CHARS.toLocaleString('en-US'));
console.log('  RATCHET:         ' + RATCHET.join(' → '));
console.log('');
console.log('  observers        ' + OBSERVER_SOURCES.length + ' downstream sources scanned ('
  + DOWNSTREAM.length + ' local scripts + the monolith) · '
  + OBSERVER_CONTROLS.length + ' scanner controls · load-time observers found: '
  + MOVED_NAMES.reduce((a, n) => a + (REAL_OBS[n] ? REAL_OBS[n].load : 0), 0));
console.log('  parity           eicScreenTicker ' + fxScreen + ' · eicLiqFromLegs ' + fxLiq
  + ' · eicBuildLiveContext ' + fxCtx + ' = ' + (fxScreen + fxLiq + fxCtx) + ' fixtures · differences ' + diffs);
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
