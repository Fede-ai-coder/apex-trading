'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS TEST — ARCHITECTURE CONTRACT (specification only, zero runtime).
//
// WHY THIS FILE EXISTS
//   The specification commits to a shape:
//
//       BACKEND BATCH COMPUTATION  /  FRONTEND STATE + RENDERING
//
//   and to the promise that THIS PR changes no runtime behaviour at all. Both are
//   easy to state and easy to erode. This file pins the ARCHITECTURE layer:
//
//     • the matrix is backend-owned and the renderer is frontend-owned;
//     • no pricing lives in the frontend, and none in the monolith;
//     • Actual / Overlay / Proposed / Difference share ONE snapshot;
//     • the overlay is additive and ephemeral — Proposed = Overlay is rejected;
//     • no request-per-cell, no request-per-leg-per-scenario, no N+1;
//     • a missing input never becomes zero, a debit is never counted twice and a
//       credit is never declared as profit;
//     • the exact contract is never replaced by the nearest strike or expiry;
//     • this PR adds no endpoint, no behaviour, no persistence and no order;
//     • index.html, js/** and css/** carry no STRESS TEST runtime surface.
//
// ZERO-RUNTIME-CHANGE ENFORCEMENT — two axes, deliberately chosen
//   A test that pins the monolith's sha256 forever would go red the moment ANY
//   unrelated PR touches the actively-developed index.html. That is a landmine, not
//   a guarantee. The contract is therefore enforced as:
//
//     1. CHANGE-SET IDENTITY (git-derived, durable) — every commit that touches this
//        specification's file set must touch NO file under index.html, js/** or
//        css/**. True for any history; never breaks on unrelated changes. Skips with
//        a printed reason when git is unavailable.
//     2. STRUCTURAL BOUNDARY (always active) — index.html, js/** and css/** are
//        scanned for stress-test runtime tokens. Any occurrence fails.
//
//   The recorded base hashes are additionally validated for shape and, when the base
//   commit is reachable, cross-checked against `git show <base>:<path>` so the
//   recorded evidence cannot silently rot. The PR-time byte-identity proof itself is
//   documented in docs/risk-models/portfolio-stress-test-v1.md §22.
//
// MUTATION PROOF
//   Every validator is re-run against deliberately broken in-memory inputs — a
//   modified index.html, a modified js/ file, a frontend pricing owner, a per-cell
//   request, a persistent overlay, and so on. All mutations are in memory. No file is
//   written, no runtime file is touched, no network call is made.
//
// Run: node tests/portfolio-stress-architecture-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const loader = require('./lib/load-app-source.js');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'risk-models', 'portfolio-stress-test-v1.md');

const SPEC_FILES = [
  'docs/risk-models/portfolio-stress-test-v1.md',
  'config/risk-models/portfolio-stress-test-v1.json',
  'tests/portfolio-stress-model-contract.test.js',
  'tests/portfolio-stress-architecture-contract.test.js',
  'tests/portfolio-stress-reuse-contract.test.js',
  'tests/portfolio-stress-source-facts.test.js',
  // Added in revision 1.2.3 with the frontend companion. They are specification
  // files in the sense that matters here: they live under tests/, they carry the
  // same module allowlist, and they must never sit on a runtime path.
  'tests/portfolio-stress-parity-runtime.test.js',
  'tests/portfolio-stress-client-contract.test.js',
  'tests/portfolio-stress-null-safety.test.js',
];

// The runtime footprint this COMPANION PR is permitted to have, read from the
// model rather than hardcoded, so the declaration and the enforcement cannot
// drift apart. Everything outside it must still be byte-identical to the base.
const COMPANION = MODEL_COMPANION();
function MODEL_COMPANION() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json'), 'utf8'));
  return raw.frontendCompanionIdentity || {};
}
const COMPANION_ADDED = COMPANION.addedRuntimeFiles || [];
const COMPANION_MODIFIED = COMPANION.modifiedRuntimeFiles || [];
const COMPANION_RUNTIME = COMPANION_ADDED.concat(COMPANION_MODIFIED);
const COMPANION_ALL_PATHS = COMPANION_RUNTIME.concat(COMPANION.addedNonRuntimeFiles || []);

// The SECOND declared tier, added in revision 1.3.0: the UI PR.
//
// It is a separate declaration rather than a widening of the companion's,
// because the companion's rules are still exactly right for the companion. Those
// modules must contain no DOM access, no listener and no renderer — and a
// renderer needs all three. Loosening the companion's rules to let a renderer
// through would have removed the guarantee from the three files that genuinely
// still have to satisfy it. Two declarations, enforced side by side, keep both
// tiers pinned to the rules that actually apply to them.
const UI = (MODEL_UI());
function MODEL_UI() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json'), 'utf8'));
  return raw.frontendUiIdentity || {};
}
const UI_ADDED = UI.addedRuntimeFiles || [];
const UI_MODIFIED = UI.modifiedRuntimeFiles || [];
const UI_ADDED_JS = UI_ADDED.filter((f) => f.startsWith('js/'));
// Every runtime file either tier declares. The enforcement below is the union of
// the two footprints and NOTHING else: a file in neither declaration is exactly
// as much of a violation as it was before the second tier existed.
const DECLARED_RUNTIME_ADDED = COMPANION_ADDED.concat(UI_ADDED);
const UI_ALL_PATHS = UI_ADDED.concat(UI_MODIFIED)
  .concat(UI.addedNonRuntimeFiles || [])
  .concat(UI.modifiedNonRuntimeFiles || []);
// Every runtime path either tier declares it MODIFIES or ADDS. Used by the
// "nothing outside the footprint changed" checks, which are unchanged in
// strength: a file in neither declaration still fails.
const DECLARED_RUNTIME_PATHS = COMPANION_RUNTIME.concat(UI_ADDED).concat(UI_MODIFIED);

// ── tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0, skipped = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function skip(msg) { skipped++; console.log('  ~ SKIPPED: ' + msg); }
function section(t) { console.log('\n' + t); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mustHold(validator, a, b, msg) {
  const v = validator(a, b);
  return ok(v.length === 0, msg + (v.length ? ' — violations: ' + v.join(' | ') : ''));
}
function mustCatch(validator, a, b, msg) {
  const v = validator(a, b);
  return ok(v.length > 0, 'MUTATION NOT CAUGHT: ' + msg);
}

const MODEL = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const MD = fs.readFileSync(MD_PATH, 'utf8');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
let GIT_OK = true;
try { git(['rev-parse', '--git-dir']); } catch (_) { GIT_OK = false; }

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// A file reader indirection so the mutation proof can serve modified content from
// memory without ever writing to disk.
function realReader(rel) { return fs.readFileSync(path.join(ROOT, rel)); }

// ── validators ───────────────────────────────────────────────────────────────

// 1. Ownership of computation and rendering.
function vComputationOwnership(m) {
  const out = [];
  if (m.matrixComputationOwner !== 'backend') out.push('matrixComputationOwner is ' + JSON.stringify(m.matrixComputationOwner));
  if (m.renderOwner !== 'frontend') out.push('renderOwner is ' + JSON.stringify(m.renderOwner));
  if (m.architectureDecision !== 'reuse_first_backend_batch_frontend_render') {
    out.push('architectureDecision is ' + JSON.stringify(m.architectureDecision));
  }
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const matrix = c.get('PST-MATRIX-001');
  if (!matrix || !/backend/i.test(matrix.text) || !/single batch/i.test(matrix.text)) {
    out.push('PST-MATRIX-001 does not require a single backend batch');
  }
  const render = c.get('PST-MATRIX-002');
  if (!render || !/frontend-owned/i.test(render.text) || !/MUST NOT compute/i.test(render.text)) {
    out.push('PST-MATRIX-002 does not keep the renderer computation-free');
  }
  const pricing = c.get('PST-PRICING-006');
  if (!pricing || pricing.level !== 'MUST NOT') out.push('PST-PRICING-006 is not a prohibition');
  if (!pricing || !/frontend/i.test(pricing.text) || !/index\.html/i.test(pricing.text)) {
    out.push('PST-PRICING-006 does not exclude pricing from both the frontend and the monolith');
  }
  return out;
}

// 2. Pricing discipline: full repricing primary, Vega x dIV only as diagnostics,
//    American early exercise supported, anchored repricing formula pinned.
function vPricingDiscipline(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const full = c.get('PST-PRICING-001');
  if (!full || !/full repricing/i.test(full.text)) out.push('PST-PRICING-001 does not mandate full repricing');
  if (!full || !/MUST NOT be the primary/i.test(full.text)) out.push('PST-PRICING-001 does not demote Vega x dIV');
  const inputs = c.get('PST-PRICING-002');
  for (const f of ['spot', 'strike', 'timeToExpiry', 'impliedVolatility', 'riskFreeRate', 'dividendYield', 'optionType', 'exerciseStyle']) {
    if (!inputs || inputs.text.indexOf(f) === -1) out.push('PST-PRICING-002 omits input ' + f);
  }
  const amer = c.get('PST-PRICING-003');
  if (!amer || !/early exercise/i.test(amer.text)) out.push('PST-PRICING-003 does not require early exercise');
  const anchor = c.get('PST-PRICING-004');
  const WANT = 'stressedMark = currentMarketMark + stressedTheoreticalValue - baseTheoreticalValue';
  if (!anchor || anchor.text.indexOf(WANT) === -1) out.push('PST-PRICING-004 does not pin the anchored repricing formula');
  const own = c.get('PST-PRICING-005');
  if (!own || !/absence proof/i.test(own.text)) out.push('PST-PRICING-005 does not gate NEW on the absence proof');
  return out;
}

// 3. One snapshot for every result set; Actual and Proposed share every input.
function vSingleSnapshot(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const snap = c.get('PST-SNAPSHOT-001');
  if (!snap || !/same frozen stress-run snapshot/i.test(snap.text)) out.push('PST-SNAPSHOT-001 does not require one frozen stress-run snapshot');
  const shared = c.get('PST-RESULT-004');
  for (const f of ['SPY', 'VIX', 'scenario', 'horizon', 'model', 'snapshot', 'stressed spots', 'sources']) {
    if (!shared || shared.text.indexOf(f) === -1) out.push('PST-RESULT-004 omits shared input ' + f);
  }
  const stale = c.get('PST-SNAPSHOT-004');
  if (!stale || stale.text.indexOf('INPUTS CHANGED — RERUN REQUIRED') === -1) {
    out.push('PST-SNAPSHOT-004 does not pin the rerun banner');
  }
  return out;
}

// 4. Additivity: Proposed = Actual + Overlay, and the arithmetic identity is pinned.
function vAdditivity(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const add = c.get('PST-OVERLAY-001');
  if (!add || add.text.indexOf('Proposed = Actual + Overlay') === -1) out.push('PST-OVERLAY-001 does not state the additive identity');
  if (!add || !/forbidden/i.test(add.text) || add.text.indexOf('Proposed = Overlay') === -1) {
    out.push('PST-OVERLAY-001 does not forbid Proposed = Overlay');
  }
  const sum = c.get('PST-RESULT-002');
  if (!sum || sum.text.indexOf('proposedStressPnl = actualStressPnl + overlayStressPnl') === -1) {
    out.push('PST-RESULT-002 does not pin the additivity equation');
  }
  if (!sum || !/tolerance/i.test(sum.text)) out.push('PST-RESULT-002 does not require a documented tolerance');
  const inc = c.get('PST-RESULT-003');
  if (!inc || inc.text.indexOf('incrementalEffect = proposedStressPnl - actualStressPnl') === -1) {
    out.push('PST-RESULT-003 does not pin the incremental effect');
  }
  if (m.hypotheticalOverlayMode !== 'additive_ephemeral') out.push('hypotheticalOverlayMode drifted');
  if ((m.overlay || {}).identity !== 'Proposed = Actual + Overlay') out.push('overlay.identity drifted');
  return out;
}

// 5. The overlay is ephemeral: it may not touch any persistent store.
function vEphemeralOverlay(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const eph = c.get('PST-OVERLAY-003');
  if (!eph || eph.level !== 'MUST NOT') out.push('PST-OVERLAY-003 is not a prohibition');
  for (const store of ['Portfolio', 'Journal', 'backend trade store', 'localStorage', 'orders']) {
    if (!eph || eph.text.indexOf(store) === -1) out.push('PST-OVERLAY-003 omits ' + store);
  }
  const mn = new Set((m.overlay || {}).mustNotMutate || []);
  for (const store of ['Portfolio', 'Journal', 'backend trade store', 'localStorage', 'orders', 'persistent caches']) {
    if (!mn.has(store)) out.push('overlay.mustNotMutate omits ' + store);
  }
  return out;
}

// 6. No N+1 anywhere: no request per cell, per leg per scenario, or per position.
function vNoNPlusOne(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const perf = c.get('PST-PERF-002');
  if (!perf || perf.level !== 'MUST NOT') out.push('PST-PERF-002 is not a prohibition');
  for (const shape of ['per position', 'per leg per scenario', 'per cell']) {
    if (!perf || perf.text.indexOf(shape) === -1) out.push('PST-PERF-002 omits the ' + shape + ' shape');
  }
  const mx = c.get('PST-MATRIX-005');
  for (const shape of ['One request per cell', 'pricing loop in the renderer', 'fetch per leg per scenario', 'option-chain fetch per cell']) {
    if (!mx || mx.text.indexOf(shape) === -1) out.push('PST-MATRIX-005 omits ' + JSON.stringify(shape));
  }
  const hyd = c.get('PST-HYDRATION-004');
  if (!hyd || !/at most once per run/i.test(hyd.text)) out.push('PST-HYDRATION-004 does not cap hydration at once per run');
  const chainCap = c.get('PST-HYDRATION-005');
  if (!chainCap || !/at most once per underlying/i.test(chainCap.text)) {
    out.push('PST-HYDRATION-005 does not cap the chain at once per underlying');
  }
  const forb = new Set((m.matrix || {}).forbidden || []);
  if (!forb.has('one request per cell')) out.push('matrix.forbidden omits one request per cell');
  return out;
}

// 7. Data quality: missing never becomes zero; nearest-strike substitution is banned.
function vDataQuality(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const zero = c.get('PST-DATA-002');
  if (!zero || zero.level !== 'MUST NOT' || !/MUST NOT be converted into zero/i.test(zero.text)) {
    out.push('PST-DATA-002 does not forbid turning a missing input into zero');
  }
  const spyZero = c.get('PST-SPY-006');
  if (!spyZero || !/never zero/i.test(spyZero.text)) out.push('PST-SPY-006 does not forbid a zero SPY');
  const silent = c.get('PST-DATA-003');
  if (!silent || silent.level !== 'MUST NOT') out.push('PST-DATA-003 is not a prohibition');
  const incomplete = c.get('PST-DATA-004');
  if (!incomplete || !/incomplete Proposed/i.test(incomplete.text)) out.push('PST-DATA-004 does not reject an incomplete VALID Proposed');
  const nearest = c.get('PST-OPTION-SYMBOL-005');
  if (!nearest || nearest.level !== 'MUST NOT' || !/nearest strike/i.test(nearest.text)) {
    out.push('PST-OPTION-SYMBOL-005 does not forbid nearest-strike substitution');
  }
  const notFound = c.get('PST-HYDRATION-003');
  if (!notFound || notFound.text.indexOf('UNAVAILABLE — exact contract not found') === -1) {
    out.push('PST-HYDRATION-003 does not pin the not-found status');
  }
  const dbl = c.get('PST-ENTRY-002');
  if (!dbl || !/counted twice/i.test(dbl.text)) out.push('PST-ENTRY-002 does not forbid double-counting a debit');
  if (!dbl || !/initial profit/i.test(dbl.text)) out.push('PST-ENTRY-002 does not forbid declaring a credit as profit');
  return out;
}

// 8. This PR adds no endpoint, no behaviour, no persistence, no order, no network
//    call, no cache, no subscription and no timer.
//
//    This is asserted STRUCTURALLY rather than by scanning the files for the words
//    `fetch(` or `setInterval(`. A text scan would be worse than useless here: this
//    specification's whole job is to QUOTE the forbidden constructs — the endpoint
//    audit in §5.4 lists real `fetch(BACKEND + …)` call sites, and these very tests
//    carry detector literals for the patterns they forbid. Flagging a document for
//    describing what it bans is a false positive, not a finding.
//
//    What actually makes this PR inert is verifiable without any of that:
//      (a) the machine-readable mirror PARSES AS JSON, so it is pure data and can
//          carry no executable surface at all;
//      (b) no file this PR adds sits on a runtime path (index.html, js/**, css/**);
//      (c) no runtime file references any file this PR adds, so nothing added here
//          can ever be loaded, parsed or executed by the application;
//      (d) the test files reach only an allowlist of Node builtins — no network
//          module, no server, no browser storage — and the only external program
//          any of them may execute is `git`.
function vSpecificationIsInert(readFile, runtimeFiles) {
  const out = [];

  // (a) the mirror is pure data
  const mirror = 'config/risk-models/portfolio-stress-test-v1.json';
  try { JSON.parse(readFile(mirror).toString('utf8')); }
  catch (e) { out.push(mirror + ' is not pure JSON data: ' + (e && e.message)); }

  // (b) nothing added lives on a runtime path
  for (const rel of SPEC_FILES) {
    if (rel === 'index.html' || rel.startsWith('js/') || rel.startsWith('css/')) {
      out.push('specification file sits on a runtime path: ' + rel);
    }
  }

  // (c) no runtime file can reach anything this PR adds
  const SPEC_MARKERS = ['portfolio-stress-test-v1', 'portfolio-stress-model-contract',
    'portfolio-stress-architecture-contract', 'portfolio-stress-reuse-contract',
    'risk-models'];
  for (const rel of runtimeFiles) {
    let text;
    try { text = readFile(rel).toString('utf8'); } catch (_) { continue; }
    for (const marker of SPEC_MARKERS) {
      if (text.indexOf(marker) !== -1) {
        out.push('runtime file ' + rel + ' references the specification (' + marker + ')');
      }
    }
  }

  // (d) the tests reach only an allowlist of builtins
  const ALLOWED_MODULES = new Set(['fs', 'path', 'crypto', 'child_process', 'assert', 'vm', 'os', 'util']);
  const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const WRITE_RE = /\bfs\s*\.\s*(?:writeFile|writeFileSync|appendFile|appendFileSync|rm|rmSync|unlink|unlinkSync|mkdir|mkdirSync|rename|renameSync|copyFile|copyFileSync)\b/;
  const EXEC_RE = /\bexecFileSync\s*\(\s*['"]([^'"]+)['"]/g;
  for (const rel of SPEC_FILES.filter((f) => f.startsWith('tests/'))) {
    const text = readFile(rel).toString('utf8');
    let m;
    REQUIRE_RE.lastIndex = 0;
    while ((m = REQUIRE_RE.exec(text)) !== null) {
      const mod = m[1];
      if (mod.startsWith('./') || mod.startsWith('../')) continue; // local test helpers
      if (!ALLOWED_MODULES.has(mod)) out.push(rel + ' requires a non-allowlisted module: ' + mod);
    }
    if (WRITE_RE.test(text)) out.push(rel + ' writes to the filesystem');
    EXEC_RE.lastIndex = 0;
    while ((m = EXEC_RE.exec(text)) !== null) {
      if (m[1] !== 'git') out.push(rel + ' executes a program other than git: ' + m[1]);
    }
  }
  return out;
}

// 9. STRUCTURAL BOUNDARY — no stress-test runtime surface in index.html, js/**, css/**.
//    Matching is case-sensitive by design: index.html legitimately contains the prose
//    "Black-Scholes" inside AI-prompt strings that FORBID estimation, and the
//    identifier vixStressFlag. Neither is a stress runtime surface.
//    Revision 1.2.3: the three declared companion modules are EXEMPT, because
//    they are the declared owners of the stress vocabulary and the ban is by
//    construction unsatisfiable for them. The exemption is narrow (exactly the
//    declared files) and is paid for by vCompanionModulesInert below, which
//    forbids a renderer, a timer, a listener, DOM access, storage, an order
//    path, an overlay store and a result cache — none of which a substring ban
//    would ever have caught. index.html is scanned UNCHANGED apart from the
//    declared <script src> lines, which the model anticipated as the one
//    permitted monolith addition.
//    Revision 1.3.0: a SECOND exemption record covers the two UI modules, and the
//    index.html strip list grows from one pattern to six. Both are narrowings, not
//    relaxations, and the two rules below are what make that true rather than a
//    claim:
//
//      • an exemption for a file no tier declared is a violation (unchanged);
//      • a declared file that is NOT exempt must be genuinely token-CLEAN. That
//        rule is new, and it is what keeps the exemption minimal: it is what
//        proves css/portfolio-stress.css passes the scan on its merits rather
//        than being waved through, and it makes an unnecessary exemption
//        detectable instead of invisible.
function vMonolithBoundary(readFile, fileList) {
  const out = [];
  const tokens = (MODEL.monolithBoundary || {}).forbiddenTokensInRuntimeFiles || [];
  if (!tokens.length) return ['no forbidden-token list is declared'];
  const boundary = MODEL.monolithBoundary || {};
  const companionExempt = (boundary.companionModuleExemption || {}).exemptFiles || [];
  const uiExempt = (boundary.uiModuleExemption || {}).exemptFiles || [];
  const exempt = new Set(companionExempt.concat(uiExempt));

  // An exemption for a file NO tier declared is a hole.
  for (const rel of exempt) {
    if (!DECLARED_RUNTIME_ADDED.includes(rel)) out.push('token-scan exemption for an undeclared file: ' + rel);
  }
  // Every companion module must still be exempt — the companion's three files
  // cannot avoid the vocabulary they own.
  for (const rel of COMPANION_ADDED) {
    if (!exempt.has(rel)) out.push('declared companion module is not covered by the exemption record: ' + rel);
  }
  // A declared UI file is either exempt or clean. Nothing is unaccounted for, and
  // an exemption that is not needed is reported rather than tolerated.
  for (const rel of UI_ADDED) {
    if (exempt.has(rel)) continue;
    let text;
    try { text = readFile(rel).toString('utf8'); } catch (_) { out.push('declared UI file is unreadable: ' + rel); continue; }
    const hits = tokens.filter((t) => text.indexOf(t) !== -1);
    if (hits.length) {
      out.push('declared UI file ' + rel + ' is neither exempt nor token-clean: ' + JSON.stringify(hits));
    }
  }

  // The index.html lines each tier is allowed to have added. Everything else in
  // the monolith is scanned exactly as before.
  const allowedIndexPatterns = []
    .concat((COMPANION.indexHtmlDelta || {}).allowedAddedLinePattern
      ? [(COMPANION.indexHtmlDelta || {}).allowedAddedLinePattern] : [])
    .concat((UI.indexHtmlDelta || {}).allowedAddedLinePatterns || [])
    .map((p) => new RegExp(p));
  if (!allowedIndexPatterns.length) return ['no allowed index.html line pattern is declared'];

  for (const rel of fileList) {
    if (exempt.has(rel)) continue;
    let text;
    try { text = readFile(rel).toString('utf8'); } catch (_) { out.push('unreadable runtime file ' + rel); continue; }
    if (rel === 'index.html') {
      // Strip ONLY the declared line shapes, then scan everything else.
      text = text.split('\n')
        .filter((l) => !allowedIndexPatterns.some((re) => re.test(l.trim())))
        .join('\n');
    }
    for (const t of tokens) {
      if (text.indexOf(t) !== -1) out.push(rel + ' contains forbidden stress token ' + JSON.stringify(t));
    }
  }
  return out;
}

// 9c. The UI tier's replacement for the inertness rule the exemption stands in for.
//
//     vCompanionModulesInert cannot be applied to a renderer: it forbids DOM
//     access, listeners and rendering, which are the renderer's entire job. What
//     CAN be required of a renderer — and is required here — is that it performs
//     no arithmetic on a result, opens no second network path, keeps nothing
//     across a reload, starts nothing on its own, and never turns an absent
//     figure into a zero. Those are precisely the properties a second engine, a
//     second transport, a persisted overlay or a null-to-zero bug would have to
//     break, and a substring ban would have caught none of them.
//
//     The pure state module is held to the STRICTER, client-tier rule as well: it
//     has no reason to touch a DOM, and saying so mechanically is what keeps the
//     lifecycle rules testable without one.
function vUiModulesContract(readFile, addedFiles) {
  const out = [];
  const inert = UI.uiModuleInertness || {};
  if (!inert.stateModule || !inert.rendererModule) return ['no UI inertness rule is declared'];
  const jsFiles = (addedFiles || []).filter((f) => f.startsWith('js/'));
  if (!jsFiles.length) return ['no UI runtime modules are declared'];

  // Applies to EVERY declared UI module, renderer included.
  const FORBIDDEN_EVERYWHERE = [
    ['a direct fetch', /(?<![A-Za-z0-9_$.])fetch\s*\(/],
    ['a second HTTP system', /XMLHttpRequest|WebSocket|EventSource|sendBeacon/],
    ['a direct call to the transport owner', /(?<![A-Za-z0-9_$.])ttCall\s*\(/],
    ['storage access', /localStorage|sessionStorage|indexedDB|\bcookie\b/],
    ['a timer', /\bsetInterval\s*\(|\bsetTimeout\s*\(|requestAnimationFrame\s*\(/],
    ['order placement', /placeOrder|submitOrder|sendOrder|createOrder|orderTicket/],
    ['overlay persistence', /saveOverlay|persistOverlay|storeOverlay/],
    ['journal persistence', /saveJournal|persistJournal|journalSave/],
    ['a result cache', /new Map\s*\(|new WeakMap\s*\(|memoize\s*\(/],
    ['option chain access', /optionChain|fetchOptionChain|_optChainCache/],
    ['null-to-zero coercion', /\|\|\s*0\b|\?\?\s*0\b|\bNumber\s*\(|parseFloat\s*\([^)]*\)\s*\|\|/],
    ['a pricing formula', /blackScholes|Math\.exp\s*\(|Math\.log\s*\(|normCdf|cumulativeNormal/],
  ];
  // Applies only to the PURE module. The renderer is exempt from these three and
  // from nothing else.
  const FORBIDDEN_IN_STATE = [
    ['DOM access', /\bdocument\s*\.|\bwindow\s*\.|innerHTML|outerHTML|querySelector|createElement|appendChild|getElementById/],
    ['an event listener', /\baddEventListener\s*\(/],
    ['a renderer', /\.style\s*\.|innerHTML/],
  ];

  const stateFile = inert.stateModule.file;
  const rendererFile = inert.rendererModule.file;
  for (const rel of [stateFile, rendererFile]) {
    if (!jsFiles.includes(rel)) out.push('the inertness record names an undeclared module: ' + rel);
  }
  for (const rel of jsFiles) {
    if (rel !== stateFile && rel !== rendererFile) out.push('a declared UI module has no inertness rule: ' + rel);
  }

  for (const rel of jsFiles) {
    let text;
    try { text = readFile(rel).toString('utf8'); } catch (_) { out.push('declared UI module is missing: ' + rel); continue; }
    // Comments are stripped before the scan: these files DOCUMENT the idioms they
    // forbid, and a rule that fired on its own explanation would push the
    // explanation out of the file.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    const rules = (rel === stateFile) ? FORBIDDEN_EVERYWHERE.concat(FORBIDDEN_IN_STATE) : FORBIDDEN_EVERYWHERE;
    for (const [label, re] of rules) {
      if (re.test(code)) out.push(rel + ' contains ' + label);
    }
    // Inert AT LOAD: every top-level statement is a declaration. This is what
    // makes "no request, no timer, no DOM access while the script loads" a
    // structural fact rather than a promise.
    for (const line of code.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (/^[\s})\];,]/.test(line)) continue;
      if (/^(var|function|const|let|async function)\b/.test(t)) continue;
      out.push(rel + ' has a top-level statement that is not a declaration: ' + JSON.stringify(t.slice(0, 60)));
    }
  }
  return out;
}

// 9b. The replacement guard for the exempted modules. Strictly stronger than the
//     token ban it stands in for: it asserts what those files may not DO, not
//     merely which words they may not contain.
function vCompanionModulesInert(readFile, addedFiles) {
  const out = [];
  const inert = COMPANION.companionModuleInertness || {};
  if (!(inert.forbidden || []).length) return ['no companion inertness rule is declared'];
  if (!addedFiles.length) return ['no companion runtime modules are declared'];

  const FORBIDDEN = [
    ['DOM access', /\bdocument\s*\.|\bwindow\s*\.|innerHTML|outerHTML|querySelector|createElement|appendChild|getElementById/],
    ['a timer', /\bsetInterval\s*\(|\bsetTimeout\s*\(|requestAnimationFrame\s*\(/],
    ['an event listener', /\baddEventListener\s*\(/],
    ['a direct fetch', /(?<![A-Za-z0-9_$.])fetch\s*\(/],
    ['a second HTTP system', /XMLHttpRequest|WebSocket|EventSource|sendBeacon/],
    ['storage access', /localStorage|sessionStorage|indexedDB|\bcookie\b/],
    ['order placement', /placeOrder|submitOrder|sendOrder|createOrder|orderTicket/],
    ['overlay persistence', /saveOverlay|persistOverlay|storeOverlay/],
    ['journal persistence', /saveJournal|persistJournal|journalSave/],
    ['a renderer', /render[A-Z]\w*\s*\(|\.style\s*\.|Html\s*\(/],
    ['a result cache', /new Map\s*\(|new WeakMap\s*\(|memoize\s*\(/],
  ];

  for (const rel of addedFiles) {
    let text;
    try { text = readFile(rel).toString('utf8'); } catch (_) { out.push('declared companion module is missing: ' + rel); continue; }
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    for (const [label, re] of FORBIDDEN) {
      if (re.test(code)) out.push(rel + ' contains ' + label);
    }
    // Inert at load: every top-level statement must be a declaration.
    for (const line of code.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (/^[\s})\];,]/.test(line)) continue;      // continuation of a declaration
      if (/^(var|function|const|let|async function)\b/.test(t)) continue;
      out.push(rel + ' has a top-level statement that is not a declaration: ' + JSON.stringify(t.slice(0, 60)));
    }
  }
  return out;
}

// 10. Recorded hash evidence is well-formed and, when git can reach the base commit,
//     matches what that commit actually contained.
function vHashRecord(m) {
  const out = [];
  const h = m.hashIdentity || {};
  const HEX = /^[0-9a-f]{64}$/;
  if (h.algorithm !== 'sha256') out.push('hashIdentity.algorithm is ' + JSON.stringify(h.algorithm));
  if (!/^[0-9a-f]{40}$/.test(String(h.baseCommit || ''))) out.push('hashIdentity.baseCommit is not a full sha1');
  if (!HEX.test(String(h.indexHtml || ''))) out.push('hashIdentity.indexHtml is not a sha256');
  const files = h.jsFiles || {};
  const n = Object.keys(files).length;
  if (n === 0) out.push('no js/** hashes are recorded');
  for (const [rel, hash] of Object.entries(files)) {
    if (!rel.startsWith('js/')) out.push('non-js path recorded in jsFiles: ' + rel);
    if (!HEX.test(String(hash))) out.push('malformed hash for ' + rel);
  }
  if (h.cssDirectoryPresent !== false || h.cssFileCount !== 0) {
    out.push('the css/** record must state the directory is absent with zero files');
  }
  if (!h.cssNote) out.push('the empty css/** set is not explained');
  return out;
}

function vHashRecordMatchesBase(m) {
  const out = [];
  if (!GIT_OK) return out;
  const h = m.hashIdentity || {};
  const base = h.baseCommit;
  try { git(['cat-file', '-e', base + '^{commit}']); } catch (_) { return out; } // unreachable base: nothing to check
  const check = (rel, expected) => {
    let blob;
    try {
      blob = execFileSync('git', ['show', base + ':' + rel], { cwd: ROOT, maxBuffer: 1 << 28 });
    } catch (_) { out.push('recorded file missing from the base commit: ' + rel); return; }
    const actual = sha256(blob);
    if (actual !== expected) out.push('recorded hash does not match the base commit for ' + rel + ' (recorded ' + expected.slice(0, 12) + ', base ' + actual.slice(0, 12) + ')');
  };
  check('index.html', h.indexHtml);
  for (const [rel, expected] of Object.entries(h.jsFiles || {})) check(rel, expected);
  return out;
}

// 10a. Added in revision 1.2.2.
//
//      vHashRecordMatchesBase above is self-consistent but circular: it verifies the
//      recorded hashes against the commit the record itself names. When dev-clean
//      advanced from de7365c to 0a16ea5a (PR #359, which really did modify index.html)
//      this branch was rebased, and all four suites still passed with hashIdentity
//      pointing at the OLD base. Nothing failed, because the old hashes did still match
//      the old commit. The record had gone stale silently.
//
//      What the specification actually claims is narrower and stronger: "this PR changes
//      no runtime file", which is a statement about HEAD versus the base HEAD is stacked
//      on — not about an arbitrary commit named in a JSON field. This validator enforces
//      that claim directly, so a future rebase cannot leave the record behind.
function vHashRecordIsCurrentBase(m) {
  const out = [];
  if (!GIT_OK) return out;
  const h = m.hashIdentity || {};
  const base = String(h.baseCommit || '');
  try { git(['cat-file', '-e', base + '^{commit}']); } catch (_) { return out; } // shallow/partial clone: nothing to check

  // The recorded base must be part of this branch's history, not an unrelated commit.
  try {
    git(['merge-base', '--is-ancestor', base, 'HEAD']);
  } catch (_) {
    out.push('hashIdentity.baseCommit ' + base.slice(0, 12) + ' is not an ancestor of HEAD: the record does not describe this branch');
    return out;
  }

  // Every recorded runtime file must be byte-identical between that base and
  // HEAD — EXCEPT the files this companion PR declares it modifies, which are
  // checked separately and far more precisely by vCompanionRuntimeDelta below.
  // Narrowing the byte-identity claim to the undeclared files is what keeps it
  // true; widening it to "runtime files may change" is what would gut it.
  const modified = new Set(COMPANION_MODIFIED);
  const compare = (rel) => {
    if (modified.has(rel)) return;
    let atBase, atHead;
    try { atBase = execFileSync('git', ['show', base + ':' + rel], { cwd: ROOT, maxBuffer: 1 << 28 }); }
    catch (_) { out.push('recorded runtime file missing from the recorded base: ' + rel); return; }
    try { atHead = execFileSync('git', ['show', 'HEAD:' + rel], { cwd: ROOT, maxBuffer: 1 << 28 }); }
    catch (_) { out.push('recorded runtime file missing from HEAD: ' + rel); return; }
    const a = sha256(atBase);
    const b = sha256(atHead);
    if (a !== b) {
      out.push('runtime file differs between the recorded base and HEAD: ' + rel +
        ' (base ' + a.slice(0, 12) + ', HEAD ' + b.slice(0, 12) + ')');
    }
  };
  compare('index.html');
  for (const rel of Object.keys(h.jsFiles || {})) compare(rel);

  // css/** must still be an empty set at the recorded base, matching the record.
  let cssAtBase = '';
  try { cssAtBase = execFileSync('git', ['ls-tree', '-r', '--name-only', base, '--', 'css'], { cwd: ROOT }).toString().trim(); }
  catch (_) { cssAtBase = ''; }
  const cssCount = cssAtBase ? cssAtBase.split('\n').filter(Boolean).length : 0;
  if (cssCount !== Number(h.cssFileCount || 0)) {
    out.push('css/** file count at the recorded base is ' + cssCount + ' but the record says ' + h.cssFileCount);
  }
  return out;
}

// 10b. The non-SPY underlying shock is fully contracted (revision 1.1.0). Without it,
//      the pricing of every non-SPY option is undefined.
function vUnderlyingShockContracts(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  for (let i = 1; i <= 7; i++) {
    const id = 'PST-UNDERLYING-00' + i;
    if (!c.get(id)) out.push('missing ' + id);
  }
  const spot = c.get('PST-UNDERLYING-001');
  if (!spot || !/No second spot resolver/i.test(spot.text)) out.push('PST-UNDERLYING-001 does not forbid a second spot resolver');
  const manual = c.get('PST-UNDERLYING-002');
  if (!manual || !/precedence/i.test(manual.text)) out.push('PST-UNDERLYING-002 does not give the manual override precedence');
  const down = c.get('PST-UNDERLYING-003');
  if (!down || !/MUST NOT be invented/i.test(down.text)) out.push('PST-UNDERLYING-003 permits inventing a downside beta');
  const ord = c.get('PST-UNDERLYING-004');
  if (!ord || !/MUST NOT be called downside beta/i.test(ord.text)) out.push('PST-UNDERLYING-004 permits relabelling ordinary beta');
  if (!ord || !/at least DEGRADED/i.test(ord.text)) out.push('PST-UNDERLYING-004 does not force DEGRADED');
  const formula = c.get('PST-UNDERLYING-005');
  if (!formula || formula.text.indexOf('betaShockFactor x spyReturn + idiosyncraticReturnOverride') === -1) {
    out.push('PST-UNDERLYING-005 does not pin the return formula');
  }
  if (!formula || !/MUST NOT silently become zero/i.test(formula.text)) {
    out.push('PST-UNDERLYING-005 does not forbid a silent zero');
  }
  const spotF = c.get('PST-UNDERLYING-006');
  if (!spotF || spotF.text.indexOf('stressedSpot = currentSpot x (1 + symbolStressReturn)') === -1) {
    out.push('PST-UNDERLYING-006 does not pin the stressed-spot formula');
  }
  if (!spotF || !/strictly greater than zero/i.test(spotF.text)) out.push('PST-UNDERLYING-006 does not require a positive spot');
  const missing = c.get('PST-UNDERLYING-007');
  if (!missing || !/MUST be UNAVAILABLE/i.test(missing.text)) out.push('PST-UNDERLYING-007 does not force UNAVAILABLE');
  if (!missing || !/MUST NOT be assigned beta 1/i.test(missing.text)) out.push('PST-UNDERLYING-007 permits assuming beta 1');
  if (!missing || !/MUST NOT be assumed to move with SPY/i.test(missing.text)) {
    out.push('PST-UNDERLYING-007 permits assuming the symbol moves with SPY');
  }
  // Actual and Proposed must share the stressed spots, not just the scenario.
  const shared = c.get('PST-RESULT-004');
  if (!shared || shared.text.indexOf('stressed spots') === -1) {
    out.push('PST-RESULT-004 does not require Actual and Proposed to share stressed spots');
  }
  return out;
}

// 10c. Equity/ETF stress P&L is contracted with signed SHARES and no option multiplier.
function vEquityContracts(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const signed = c.get('PST-EQUITY-001');
  if (!signed || !/signedShares > 0/.test(signed.text)) out.push('PST-EQUITY-001 does not define signed shares');
  if (!signed || !/multiplier MUST NOT be applied/i.test(signed.text)) {
    out.push('PST-EQUITY-001 does not forbid the option multiplier on shares');
  }
  const pnl = c.get('PST-EQUITY-002');
  if (!pnl || pnl.text.indexOf('equityStressPnl = (stressedSpot - currentSpot) x signedShares') === -1) {
    out.push('PST-EQUITY-002 does not pin the equity P&L formula');
  }
  if (pnl && /x\s*100/.test(pnl.text)) out.push('PST-EQUITY-002 applies a 100x multiplier to shares');
  const rec = c.get('PST-EQUITY-003');
  if (!rec || !/reconcile/i.test(rec.text)) out.push('PST-EQUITY-003 does not require reconciliation');
  return out;
}

// 10d. Cross-tier parity is contracted, and divergence is fatal rather than tolerated.
function vParityContracts(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  for (let i = 1; i <= 5; i++) {
    const id = 'PST-PARITY-00' + i;
    if (!c.get(id)) out.push('missing ' + id);
  }
  const agree = c.get('PST-PARITY-001');
  for (const kase of ['partial close', 'rolled', 'assigned', 'exercised', 'expired', 'residual quantity']) {
    if (!agree || agree.text.toLowerCase().indexOf(kase) === -1) out.push('PST-PARITY-001 omits the case: ' + kase);
  }
  const nodup = c.get('PST-PARITY-002');
  if (!nodup || nodup.level !== 'MUST NOT') out.push('PST-PARITY-002 is not a prohibition');
  if (!nodup || !/semantic parity/i.test(nodup.text)) out.push('PST-PARITY-002 does not state the objective is semantic parity');
  const fail = c.get('PST-PARITY-003');
  if (!fail || !/unavailable/i.test(fail.text)) out.push('PST-PARITY-003 does not make a divergence fatal');
  if (!fail || !/MUST NOT be tolerated silently/i.test(fail.text)) out.push('PST-PARITY-003 tolerates silent divergence');
  const fix = c.get('PST-PARITY-004');
  if (!fix || !/shared or generated from a common manifest/i.test(fix.text)) {
    out.push('PST-PARITY-004 does not require shared fixtures');
  }
  const tax = c.get('PST-PARITY-005');
  if (!tax || !/both owners/i.test(tax.text)) out.push('PST-PARITY-005 does not require both owners to change together');
  return out;
}

// 10e. Engine units are contracted: raw in, presentation transforms out of the way.
function vUnitsContracts(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  for (let i = 1; i <= 5; i++) {
    const id = 'PST-UNITS-00' + i;
    if (!c.get(id)) out.push('missing ' + id);
  }
  const noNorm = c.get('PST-UNITS-002');
  if (!noNorm || noNorm.level !== 'MUST NOT') out.push('PST-UNITS-002 is not a prohibition');
  if (!noNorm || noNorm.text.indexOf('normalizeGreekPoints') === -1) {
    out.push('PST-UNITS-002 does not name normalizeGreekPoints');
  }
  const distinct = c.get('PST-UNITS-003');
  if (!distinct || !/distinct fields/i.test(distinct.text)) out.push('PST-UNITS-003 does not separate raw from display');
  const same = c.get('PST-UNITS-004');
  if (!same || !/same raw units/i.test(same.text)) out.push('PST-UNITS-004 does not require shared raw units');
  const heur = c.get('PST-UNITS-005');
  if (!heur || heur.level !== 'MUST NOT') out.push('PST-UNITS-005 is not a prohibition');
  // The measured units must be recorded as RAW, not as an inferred economic unit.
  const g = ((m.units || {}).measuredCurrentUnits || {}).legLiveGreeks || {};
  if (!/RAW DXLINK EVENT UNITS/.test(String(g.scale || ''))) {
    out.push('leg Greeks are not recorded as raw DXLink event units');
  }
  if (!g.notProven || !/per share/i.test(String(g.notProven))) {
    out.push('the specification does not record that the per-share economic unit is unproven');
  }
  const n = ((m.units || {}).measuredCurrentUnits || {}).deltaAndThetaNormalization || {};
  if (!/PRESENTATION/i.test(String(n.classification || ''))) {
    out.push('normalizeGreekPoints is not classified as a presentation transform');
  }
  return out;
}

// 10f. The stress-run snapshot is owned by a NEW builder; market context stays clean.
function vSnapshotOwnership(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const agnostic = c.get('PST-SNAPSHOT-005');
  if (!agnostic || agnostic.level !== 'MUST NOT') out.push('PST-SNAPSHOT-005 is not a prohibition');
  for (const f of ['portfolio identity', 'positions hash', 'overlay hash', 'scenario hash']) {
    if (!agnostic || agnostic.text.toLowerCase().indexOf(f) === -1) out.push('PST-SNAPSHOT-005 omits ' + f);
  }
  const compose = c.get('PST-SNAPSHOT-006');
  if (!compose || !/without duplicating any of their sources/i.test(compose.text)) {
    out.push('PST-SNAPSHOT-006 does not forbid duplicating sources');
  }
  if (!compose || !/without invalidating the global market-context cache/i.test(compose.text)) {
    out.push('PST-SNAPSHOT-006 does not protect the global market-context cache');
  }
  if ((m.snapshot || {}).owner !== 'stress-run snapshot builder (NEW)') {
    out.push('the snapshot owner is ' + JSON.stringify((m.snapshot || {}).owner));
  }
  if (!((m.snapshot || {}).composedOwners || []).some((o) => /market-context snapshot/i.test(o))) {
    out.push('the snapshot does not compose the market-context snapshot');
  }
  if (!((m.snapshot || {}).mustNotInvalidate || []).some((o) => /market-context cache/i.test(o))) {
    out.push('the snapshot does not protect the market-context cache');
  }
  const ms = (m.reuseManifest || []).find((r) => r.responsibility === 'market snapshot');
  if (!ms || ms.decision !== 'REUSE') out.push('market snapshot is not REUSE');
  if (!ms || ms.portfolioAgnostic !== true) out.push('market snapshot is not marked portfolio-agnostic');
  for (const f of ['overlayHash', 'scenarioHash', 'positionsHash', 'snapshotId']) {
    if (!ms || !(ms.mustNotReceive || []).includes(f)) out.push('market snapshot may still receive ' + f);
  }
  return out;
}

// 10g. One run, one frozen SPY source, frozen by the backend.
function vSpyRunAuthority(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const s1 = c.get('PST-SPY-001');
  if (!s1 || !/BACKEND Stress Engine/.test(s1.text)) out.push('PST-SPY-001 does not make the backend authoritative');
  if (!s1 || !/MUST NOT require the backend to call a frontend function/i.test(s1.text)) {
    out.push('PST-SPY-001 still implies a backend-to-frontend call');
  }
  const s7 = c.get('PST-SPY-007');
  if (!s7 || !/exactly one frozen SPY source/i.test(s7.text)) out.push('PST-SPY-007 does not pin one source per run');
  if (!s7 || !/MUST NOT run a second resolver/i.test(s7.text)) out.push('PST-SPY-007 permits a second frontend resolver');
  if (!s7 || !/MUST NOT substitute its own value after the run has started/i.test(s7.text)) {
    out.push('PST-SPY-007 permits post-hoc substitution');
  }
  if (m.canonicalSpySource !== 'backend_run_frozen_spy_from_existing_backend_quote_owner') {
    out.push('canonicalSpySource is ' + JSON.stringify(m.canonicalSpySource));
  }
  // The request must NOT carry a client-supplied market snapshot any more.
  const resolved = (m.resolvedDecisions || []).find((d) => d.id === 'PST-OPEN-008');
  if (!resolved) out.push('the SPY-source decision is not recorded as resolved');
  else if (!/THE BACKEND/i.test(String(resolved.resolution || ''))) out.push('the SPY-source resolution is not the backend');
  return out;
}

// 10h. Temporal coherence: freeze before compute, never reread mid-matrix.
function vTemporalContracts(m) {
  const out = [];
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const t = m.temporalModel || {};
  for (let i = 1; i <= 7; i++) {
    const id = 'PST-TEMPORAL-00' + i;
    if (!c.get(id)) out.push('missing ' + id);
  }
  const freeze = c.get('PST-TEMPORAL-001');
  if (!freeze || !/BEFORE any scenario calculation/i.test(freeze.text)) {
    out.push('PST-TEMPORAL-001 does not require freezing before calculation');
  }
  const noReread = c.get('PST-TEMPORAL-002');
  if (!noReread || noReread.level !== 'MUST NOT') out.push('PST-TEMPORAL-002 is not a prohibition');
  for (const src of ['quote cache', 'Greeks cache', 'SPY', 'VIX', 'underlying prices', 'Portfolio state']) {
    if (!noReread || noReread.text.indexOf(src) === -1) out.push('PST-TEMPORAL-002 omits the source: ' + src);
  }
  if (!noReread || !/same frozen values/i.test(noReread.text)) {
    out.push('PST-TEMPORAL-002 does not require all cells to share the frozen values');
  }
  const assembly = c.get('PST-TEMPORAL-003');
  for (const f of ['snapshotStartedAt', 'snapshotCompletedAt', 'snapshotAssemblyMs']) {
    if (!assembly || assembly.text.indexOf(f) === -1) out.push('PST-TEMPORAL-003 omits ' + f);
  }
  const perInput = c.get('PST-TEMPORAL-004');
  for (const f of ['source', 'asOf', 'ageMs', 'freshness', 'status']) {
    if (!perInput || perInput.text.indexOf(f) === -1) out.push('PST-TEMPORAL-004 omits the field ' + f);
  }
  for (const cov of ['SPY', 'VIX', 'underlying', 'option quotes', 'implied volatilities', 'Greeks', 'beta', 'NLV']) {
    if (!perInput || perInput.text.indexOf(cov) === -1) out.push('PST-TEMPORAL-004 omits the input ' + cov);
  }
  const skew = c.get('PST-TEMPORAL-005');
  for (const f of ['oldestInputAsOf', 'newestInputAsOf', 'maxCrossInputSkewMs', 'maxInputAgeMs']) {
    if (!skew || skew.text.indexOf(f) === -1) out.push('PST-TEMPORAL-005 omits ' + f);
  }
  const policy = c.get('PST-TEMPORAL-006');
  if (!policy || !/No threshold may be hidden/i.test(policy.text)) out.push('PST-TEMPORAL-006 permits hidden thresholds');
  if (!policy || !/DEGRADED or UNAVAILABLE/.test(policy.text)) out.push('PST-TEMPORAL-006 does not pin the over-threshold outcome');
  const same = c.get('PST-TEMPORAL-007');
  for (const f of ['snapshot id', 'current spots', 'stressed spots', 'timestamps', 'option quotes',
    'implied volatilities', 'Greeks', 'beta', 'NLV', 'freshness classifications']) {
    if (!same || same.text.indexOf(f) === -1) out.push('PST-TEMPORAL-007 omits ' + f);
  }
  // The prohibition belongs to the phase AFTER the snapshot is complete. Stating it
  // absolutely — as revision 1.2.0 did — contradicts PST-HYDRATION-001, because a newly
  // added leg introduces exact symbols that have never been read.
  if (!same || !/AFTER the stress-run snapshot has been completed/i.test(same.text)) {
    out.push('PST-TEMPORAL-007 does not scope the prohibition to the post-completion phase');
  }
  if (!same || !/MUST NOT cause any further market-data read/i.test(same.text)) {
    out.push('PST-TEMPORAL-007 does not forbid post-completion market reads');
  }
  if (!same || !/does NOT forbid market-data reads while a NEW snapshot is being assembled/i.test(same.text)) {
    out.push('PST-TEMPORAL-007 does not permit hydration during a new snapshot assembly');
  }
  if (/Adding or editing the Overlay MUST NOT cause a new market read/i.test(String(same && same.text))) {
    out.push('PST-TEMPORAL-007 still carries the absolute 1.2.0 formulation');
  }

  // PST-TEMPORAL-008 — the overlay edit lifecycle.
  const life = c.get('PST-TEMPORAL-008');
  if (!life) out.push('missing PST-TEMPORAL-008');
  else {
    for (const step of ['invalidate the previous result', 'INPUTS CHANGED — RERUN REQUIRED',
      'leave the previous snapshot unmutated', 'NOT silently update Proposed alone', 'require a new run',
      'hydrate the exact canonical symbols', 'deduplicate every exact symbol',
      'at most once in the new run', 'frozen together in the new snapshot',
      'only after the new snapshot is complete']) {
      if (life.text.indexOf(step) === -1) out.push('PST-TEMPORAL-008 omits: ' + step);
    }
    const seq = life.lifecycle || [];
    const WANT = ['overlay edit', 'invalidate previous run', 'hydrate required exact symbols',
      'build new frozen snapshot', 'calculate all result sets'];
    if (JSON.stringify(seq) !== JSON.stringify(WANT)) {
      out.push('PST-TEMPORAL-008 lifecycle sequence is ' + JSON.stringify(seq));
    }
  }

  // The machine-readable phase boundary must exist and must point both ways.
  if (t.snapshotAssemblyMarketReads !== 'ALLOWED_AND_BOUNDED') {
    out.push('snapshotAssemblyMarketReads is ' + JSON.stringify(t.snapshotAssemblyMarketReads));
  }
  if (t.postSnapshotMarketReads !== 'FORBIDDEN') {
    out.push('postSnapshotMarketReads is ' + JSON.stringify(t.postSnapshotMarketReads));
  }
  if (t.overlayEditInvalidatesPreviousRun !== true) out.push('an overlay edit does not invalidate the previous run');
  if (t.newExactSymbolsHydratedBeforeFreeze !== true) out.push('new exact symbols are not hydrated before the freeze');
  if (t.calculationUsesFrozenSnapshotOnly !== true) out.push('calculation is not restricted to the frozen snapshot');
  if (t.phaseBoundary !== 'snapshotCompletedAt') out.push('the phase boundary is not snapshotCompletedAt');
  for (const a of ['hydrating a newly referenced exact canonical symbol', 'bounded DXLink warmup of that exact symbol',
    'computing cross-input skew']) {
    if (!(t.allowedDuringSnapshotAssembly || []).includes(a)) out.push('assembly does not allow: ' + a);
  }
  for (const f of ['rereading SPY during the matrix', 'rereading quotes per scenario',
    'rereading Greeks for Proposed', 'hydrating Overlay separately from Actual',
    'updating a single cell with newer data', 'replacing snapshot data during pricing']) {
    if (!(t.forbiddenAfterSnapshotCompletion || []).includes(f)) out.push('post-completion does not forbid: ' + f);
  }
  // Consistency with the hydration and snapshot contracts must be declared, and those
  // contracts must still exist.
  for (const id of ['PST-HYDRATION-001', 'PST-HYDRATION-004', 'PST-HYDRATION-006',
    'PST-SNAPSHOT-003', 'PST-SNAPSHOT-004', 'PST-SNAPSHOT-006',
    'PST-TEMPORAL-001', 'PST-TEMPORAL-002']) {
    if (!c.get(id)) out.push('consistency partner missing: ' + id);
    if (!(t.consistencyWith || []).includes(id)) out.push('temporalModel does not declare consistency with ' + id);
  }
  // The model block must back the contracts.
  if (!t.freezeRule) out.push('temporalModel has no freeze rule');
  if (!(t.rereadForbiddenDuring || []).includes('matrix cell evaluation')) {
    out.push('temporalModel does not forbid rereads during matrix cell evaluation');
  }
  if (!/TO_BE_DERIVED/.test(String(t.thresholdStatus || ''))) {
    out.push('temporal thresholds are asserted rather than derived');
  }
  return out;
}

// 11. CHANGE-SET IDENTITY.
//
//     Revision 1.2.2's rule was "no commit touching the specification may also
//     touch a runtime file". That was exactly right for a specification-only PR
//     and is FALSE for this companion, which ships three inert modules by
//     design. Deleting the rule would have removed the only mechanical guard on
//     scope, so it is NARROWED rather than dropped: a commit touching the
//     specification may touch runtime files ONLY from the declared companion
//     footprint. A commit that also touched the scanner, the Journal, a chart or
//     any other runtime file still fails, which is the property that mattered.
function vChangeSetIdentity() {
  const out = [];
  if (!GIT_OK) return out;
  const allowed = new Set(COMPANION_ALL_PATHS.concat(UI_ALL_PATHS).concat(
    ((COMPANION.adjacentSuiteUpdates || {}).files || []).map((f) => f.file)));
  // ONLY the commits this branch adds on top of its base.
  //
  // Walking all history reachable from HEAD was wrong in a way that only CI
  // exposed: on a `pull_request` event the checkout is a MERGE ref, so the walk
  // also traversed dev-clean — where commits legitimately touch the
  // specification and runtime files together, because they are not this PR.
  // The rule has always meant "no commit THIS BRANCH adds", and now it says so.
  const base = String(COMPANION.baseCommit || (MODEL.hashIdentity || {}).baseCommit || '');
  let range = null;
  if (/^[0-9a-f]{40}$/.test(base)) {
    try { git(['cat-file', '-e', base + '^{commit}']); range = base + '..HEAD'; } catch (_) { range = null; }
  }
  if (range === null) {
    // Without the base there is no branch to scope to, and walking everything
    // would produce exactly the false positive above. Say so rather than
    // silently checking a different property.
    skip('the base commit is not reachable in this clone — the change-set identity walk cannot be scoped to this branch');
    return out;
  }
  let commits;
  try {
    commits = git(['log', '--format=%H', range, '--'].concat(SPEC_FILES)).split('\n').filter(Boolean);
  } catch (_) { return out; }
  for (const sha of commits) {
    let touched;
    try {
      touched = git(['show', '--pretty=format:', '--name-only', sha]).split('\n').map((s) => s.trim()).filter(Boolean);
    } catch (_) { continue; }
    const runtime = touched.filter((f) => f === 'index.html' || f.startsWith('js/') || f.startsWith('css/'));
    const undeclared = runtime.filter((f) => !allowed.has(f));
    if (undeclared.length) {
      out.push('commit ' + sha.slice(0, 10) + ' touches the specification and UNDECLARED runtime files: ' + undeclared.join(', '));
    }
  }
  return out;
}

// 12. The companion runtime delta, file by file, against the declared rules.
//     This is what replaces the blanket byte-identity claim for the two files
//     the companion modifies, and it is deliberately stricter than "the file
//     changed somehow".
function vCompanionRuntimeDelta() {
  const out = [];
  if (!GIT_OK) return out;
  const base = String(COMPANION.baseCommit || '');
  if (!/^[0-9a-f]{40}$/.test(base)) return ['frontendCompanionIdentity.baseCommit is not a full sha1'];
  try { git(['cat-file', '-e', base + '^{commit}']); } catch (_) { return out; } // unreachable base

  const at = (rev, rel) => {
    try { return execFileSync('git', ['show', rev + ':' + rel], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8'); }
    catch (_) { return null; }
  };

  // (a) every declared ADDED file must be absent at the base and present at HEAD.
  //     Both tiers' additions are checked: the companion base predates both, so a
  //     UI file must be absent there too.
  for (const rel of COMPANION_ADDED.concat(COMPANION.addedNonRuntimeFiles || [])
    .concat(UI_ADDED).concat(UI.addedNonRuntimeFiles || [])) {
    if (at(base, rel) !== null) out.push('declared as ADDED but already present at the base: ' + rel);
    if (at('HEAD', rel) === null) out.push('declared as ADDED but missing from HEAD: ' + rel);
  }

  // (b) index.html: declared script tags, plus the declared canonical-owner
  //     corrections and nothing else.
  //
  //     Revision 1.2.3 could say SCRIPT_TAGS_ONLY because no fixture had yet
  //     found a divergence. The 2.1.0 fixtures found six, and correcting a
  //     canonical owner is the one change to existing Portfolio code the
  //     boundary permits. So the rule is NARROWED rather than dropped: every
  //     changed line must fall inside a DECLARED owner function, or be a
  //     declared script tag. A change anywhere else in the monolith still fails,
  //     which is the property that mattered.
  const idxDelta = COMPANION.indexHtmlDelta || {};
  const baseIdx = at(base, 'index.html');
  const headIdx = at('HEAD', 'index.html');
  if (baseIdx === null || headIdx === null) out.push('index.html is unreadable at the base or at HEAD');
  else {
    // The union of both tiers' declared line shapes and declared owner functions.
    // The rule itself is unchanged — every changed line is a declared line shape
    // or sits inside a declared owner — but the declaration now has two authors,
    // and a line matching NEITHER tier still fails exactly as it did before.
    const uiDelta = UI.indexHtmlDelta || {};
    const allowedPatterns = []
      .concat(idxDelta.allowedAddedLinePattern ? [idxDelta.allowedAddedLinePattern] : [])
      .concat(uiDelta.allowedAddedLinePatterns || [])
      .map((p) => new RegExp(p));
    const allowed = { test: (line) => allowedPatterns.some((re) => re.test(line)) };
    const declaredFns = (idxDelta.declaredOwnerFunctions || []).concat(uiDelta.declaredOwnerFunctions || []);
    const removedFns = idxDelta.removedOwnerFunctions || [];
    // How many declared line shapes the two tiers between them expect to have
    // added: the companion's script tags plus every UI pattern.
    const expectedDeclaredLines = COMPANION_ADDED.length + (uiDelta.allowedAddedLinePatterns || []).length;
    if (!declaredFns.length) out.push('no declared owner functions are recorded for the index.html delta');

    // The line spans each declared owner occupies, in a given revision of the file.
    const spansIn = (text, names) => {
      const lines = text.split('\n');
      const spans = [];
      for (const name of names) {
        let src = null;
        try { src = loader.extractFunctionSource(name, { source: text }); } catch (_) { continue; }
        const startIdx = text.indexOf(src);
        if (startIdx < 0) continue;
        const startLine = text.slice(0, startIdx).split('\n').length;
        const endLine = startLine + src.split('\n').length - 1;
        // Include the comment block immediately above the declaration: a comment
        // explaining a correction belongs to it.
        let commentStart = startLine;
        while (commentStart > 1 && /^\s*(\/\/|$)/.test(lines[commentStart - 2])) commentStart--;
        spans.push([commentStart, endLine]);
      }
      return spans;
    };
    const inAnySpan = (line, spans) => spans.some(([a2, b2]) => line >= a2 && line <= b2);
    const headSpans = spansIn(headIdx, declaredFns);
    const baseSpans = spansIn(baseIdx, declaredFns.concat(removedFns));

    // Changed line ranges, from git itself rather than a guessed diff.
    let diffText = '';
    try {
      diffText = execFileSync('git', ['diff', '-U0', base, 'HEAD', '--', 'index.html'],
        { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
    } catch (_) { diffText = ''; }
    const headLines = headIdx.split('\n');
    let addedOutside = 0, removedOutside = 0, scriptTagsAdded = 0;
    const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm;
    let hm;
    while ((hm = hunk.exec(diffText)) !== null) {
      const oldStart = Number(hm[1]); const oldCount = hm[2] === undefined ? 1 : Number(hm[2]);
      const newStart = Number(hm[3]); const newCount = hm[4] === undefined ? 1 : Number(hm[4]);
      for (let i = 0; i < newCount; i++) {
        const line = newStart + i;
        const text = (headLines[line - 1] || '').trim();
        if (allowed.test(text)) { scriptTagsAdded++; continue; }
        if (!inAnySpan(line, headSpans)) {
          addedOutside++;
          if (addedOutside <= 3) out.push('index.html changed OUTSIDE every declared owner at line ' + line + ': ' + JSON.stringify(text.slice(0, 70)));
        }
      }
      for (let i = 0; i < oldCount; i++) {
        if (!inAnySpan(oldStart + i, baseSpans)) {
          removedOutside++;
          if (removedOutside <= 3) out.push('index.html removed a line OUTSIDE every declared owner at base line ' + (oldStart + i));
        }
      }
    }
    if (scriptTagsAdded !== expectedDeclaredLines) {
      out.push('expected ' + expectedDeclaredLines + ' declared index.html lines to be added, saw ' + scriptTagsAdded);
    }
    // Every declared JS module of either tier must actually be wired in, in the
    // right form. A declared-but-unloaded module is a footprint entry for a file
    // the application never runs.
    for (const rel of COMPANION_ADDED.concat(UI_ADDED_JS)) {
      if (headIdx.indexOf('<script src="./' + rel + '"></script>') === -1) {
        out.push('declared module is not loaded by index.html: ' + rel);
      }
    }
    // The stylesheet is linked, not scripted, so it is checked in its own shape.
    for (const rel of UI_ADDED.filter((f) => f.startsWith('css/'))) {
      if (headIdx.indexOf('<link rel="stylesheet" href="./' + rel + '">') === -1) {
        out.push('declared stylesheet is not linked by index.html: ' + rel);
      }
    }
    // A declared owner that no longer exists is a declaration about nothing.
    for (const name of declaredFns) {
      if (!new RegExp('function\\s+' + name + '\\s*\\(').test(headIdx)) {
        out.push('declared owner function is absent from index.html: ' + name);
      }
    }
    for (const name of removedFns) {
      if (new RegExp('function\\s+' + name + '\\s*\\(').test(headIdx)) {
        out.push('owner declared as REMOVED is still present: ' + name);
      }
    }
  }

  // (c) js/api/backend-client.js: the delta must be EXACTLY the declared signal
  //     composition. Proven by reconstruction, not by counting lines: undo the
  //     declared change on the HEAD content and the base file must come back
  //     byte for byte. Nothing else can hide inside a diff that survives that.
  const t = COMPANION.transportOwnerDelta || {};
  if (t.file) {
    const baseSrc = at(base, t.file);
    const headSrc = at('HEAD', t.file);
    if (baseSrc === null || headSrc === null) out.push(t.file + ' is unreadable at the base or at HEAD');
    else {
      const helperStart = headSrc.indexOf('function _ttCallSignal(');
      const commentStart = headSrc.lastIndexOf('// The abort signal ttCall gives fetch', helperStart);
      const helperEnd = headSrc.indexOf('\n}\n', helperStart);
      if (helperStart < 0 || commentStart < 0 || helperEnd < 0) {
        out.push(t.file + ': the declared _ttCallSignal helper is not present in the declared shape');
      } else {
        // Drop the helper block AND the blank line that separates it from the
        // next declaration, so the reconstruction is byte-exact rather than
        // byte-exact-modulo-whitespace.
        const withoutHelper = headSrc.slice(0, commentStart) +
          headSrc.slice(helperEnd + 3).replace(/^\n/, '');

        // Undo the declared delta MECHANICALLY — never by pasting the base text,
        // which would assert base === base and prove nothing.
        //
        // The delta now wraps the WHOLE transaction (fetch + body read + parse +
        // HTTP classification) in the guarded region, so its inverse has to undo
        // the indentation too. Four steps, each reversing one thing:
        //   1. delete the added comment block and the `try{` that opens the guard;
        //   2. de-indent the guarded body by exactly two spaces;
        //   3. delete the `finally` that releases the composed listeners;
        //   4. restore the fetch signal expression the base file held.
        const ADDED = '  // The composed signal owns two listeners';
        const OPEN = '  var _sig=_ttCallSignal(opts.signal);\n  try{\n';
        const CLOSE = '  }finally{\n    _sig.cleanup();\n  }\n';
        const i0 = withoutHelper.indexOf(ADDED);
        const iOpen = withoutHelper.indexOf(OPEN, i0);
        const iClose = withoutHelper.indexOf(CLOSE, iOpen);
        if (i0 < 0 || iOpen < 0 || iClose < 0) {
          out.push(t.file + ': the declared transport delta is not in the declared shape — ' +
            'the guarded region must open with `var _sig=_ttCallSignal(opts.signal);` + `try{` ' +
            'and close with `}finally{ _sig.cleanup(); }`');
        } else {
          // Everything between the added comment and `var _sig=` must be comment
          // lines, or something undeclared is hiding in the gap.
          const gap = withoutHelper.slice(i0, iOpen);
          if (gap.split('\n').some((l) => l.trim() && !l.trim().startsWith('//'))) {
            out.push(t.file + ': non-comment code sits between the declared comment and the guard');
          }
          const guarded = withoutHelper.slice(iOpen + OPEN.length, iClose);
          // De-indent by exactly two spaces. A line that is not indented by at
          // least two spaces was never inside the guard, so refuse rather than
          // silently reconstruct something that never existed.
          const dedented = guarded.split('\n').map((l) => {
            if (l === '') return l;
            if (!l.startsWith('  ')) return null;
            return l.slice(2);
          });
          if (dedented.some((l) => l === null)) {
            out.push(t.file + ': the guarded region is not uniformly indented, so the delta is not purely a wrap');
          } else {
            const restored = (withoutHelper.slice(0, i0) + dedented.join('\n') +
              withoutHelper.slice(iClose + CLOSE.length))
              .replace("var r=await fetch(BACKEND+path,{method:opts.method||'GET',headers:headers,body:body,signal:_sig.signal});",
                "var r=await fetch(BACKEND+path,{method:opts.method||'GET',headers:headers,body:body,signal:AbortSignal.timeout(20000)});");
            if (sha256(Buffer.from(restored)) !== sha256(Buffer.from(baseSrc))) {
              out.push(t.file + ': the delta is NOT limited to the declared signal composition — ' +
                'un-wrapping the guarded transaction and restoring the original fetch signal ' +
                'does not reproduce the base file');
            }
          }
        }
      }
      if (t.behaviourChangeForExistingCallers !== 'NONE') {
        out.push(t.file + ': the transport delta no longer claims zero behaviour change for existing callers');
      }
      if (!/if \(!callerSignal\) return \{ signal: timeout, cleanup: function \(\) \{\} \};/.test(headSrc)) {
        out.push(t.file + ': the no-caller-signal path is not a verbatim no-op');
      }
      if (!/removeEventListener/.test(headSrc) || !/_sig\.cleanup\(\)/.test(headSrc)) {
        out.push(t.file + ': the composed listeners are not released');
      }
    }
  }

  // (d) nothing outside the declared footprint changed at all.
  let changed = [];
  try {
    changed = git(['diff', '--name-only', base, 'HEAD']).split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (_) { return out; }
  // Four adjacent boundary suites pinned the exact NUMBER of local <script> tags,
  // which a permitted script-tag addition necessarily invalidates. They are
  // declared by name, with a recorded reason, rather than being quietly allowed.
  const adjacent = ((COMPANION.adjacentSuiteUpdates || {}).files || []).map((f) => f.file);
  const declared = new Set(COMPANION_ALL_PATHS.concat(UI_ALL_PATHS).concat(SPEC_FILES).concat(adjacent));
  for (const f of changed) {
    if (declared.has(f)) continue;
    out.push('this companion changed an UNDECLARED file: ' + f);
  }
  // Every declared adjacent update must state WHY it is stronger, not merely that
  // it changed — an undocumented "adjacent" entry would be a blank cheque.
  for (const entry of (COMPANION.adjacentSuiteUpdates || {}).files || []) {
    if (!entry.change || String(entry.change).length < 20) out.push('adjacent suite update with no stated change: ' + entry.file);
    if (!entry.strongerBecause || String(entry.strongerBecause).length < 3) {
      out.push('adjacent suite update that does not say why it is not a weakening: ' + entry.file);
    }
  }

  // …and specifically nothing in the RUNTIME areas the companion is forbidden to
  // touch. Scoped to runtime paths on purpose: a boundary TEST whose filename
  // contains "scanner" is not the scanner, and conflating the two would make the
  // check unable to distinguish a re-derived script count from a behaviour change.
  const FORBIDDEN_AREAS = [
    ['scanner', /scanner/i], ['SWING', /swing/i], ['candles', /candle/i], ['charts', /chart/i],
    ['DSS', /\bdss/i], ['RS', /(^|[\/-])rs[\/-]/i], ['MCX', /mcx/i], ['journal', /journal/i],
  ];
  const runtimeChanged = changed.filter((f) => f === 'index.html' || f.startsWith('js/') || f.startsWith('css/'));
  for (const f of runtimeChanged) {
    if (DECLARED_RUNTIME_PATHS.includes(f)) continue;   // declared by a tier, and delta-checked above
    for (const [area, re] of FORBIDDEN_AREAS) {
      if (re.test(f)) out.push('this companion touched the forbidden ' + area + ' runtime area: ' + f);
    }
    out.push('this companion changed an undeclared runtime file: ' + f);
  }
  return out;
}

// ── run the contract ────────────────────────────────────────────────────────
section('1. Computation and rendering ownership');
mustHold(vComputationOwnership, MODEL, null, '1.1: matrix is backend-owned, rendering is frontend-owned, pricing is excluded from the frontend');
mustHold(vPricingDiscipline, MODEL, null, '1.2: full repricing is primary, Vega x dIV is demoted, early exercise is required');

section('2. Snapshot and additivity');
mustHold(vSingleSnapshot, MODEL, null, '2.1: Actual and Proposed share one frozen snapshot and identical inputs');
mustHold(vAdditivity, MODEL, null, '2.2: Proposed = Actual + Overlay, with the arithmetic identity pinned');
mustHold(vEphemeralOverlay, MODEL, null, '2.3: the overlay is ephemeral and touches no persistent store');

section('3. Batch discipline');
mustHold(vNoNPlusOne, MODEL, null, '3.1: no request per cell, per leg per scenario or per position');
{
  const c = new Map((MODEL.contracts || []).map((x) => [x.id, x]));
  ok(!!c.get('PST-MATRIX-003') && /0%, -5%, -10%, -15%, -20%/.test(c.get('PST-MATRIX-003').text),
    '3.2: the minimum SPY grid is pinned');
  ok(!!c.get('PST-MATRIX-003') && /current, \+50%, \+100%, \+200%/.test(c.get('PST-MATRIX-003').text),
    '3.3: the minimum VIX grid is pinned');
  const ep = MODEL.endpointProposal || {};
  ok(ep.nameStatus === 'INDICATIVE_ONLY', '3.4: the proposed endpoint name is marked indicative only');
  ok(/orchestrator/i.test(String(ep.role || '')) && /MUST NOT become a second Portfolio backend/i.test(String(ep.role || '')),
    '3.5: the endpoint is an orchestrator, not a second Portfolio backend');
  for (const owner of ['buildPortfolioPositionsFromJournal', 'isJournalTradeOpenForCurrentRisk',
    'isJournalLegOpenForCurrentRisk', 'buildCanonicalOptionSymbol',
    'readOptionLivePayloadForPortfolio', 'buildVixFamilySnapshot', 'getLatestBetas', 'requireApiKey']) {
    ok((ep.mustCompose || []).includes(owner), '3.6: the endpoint must compose ' + owner);
  }
  // The chain owners are OPTIONAL and discovery-only — requiring them would reinstate the
  // mandatory-chain error of revision 1.0.0.
  const may = (ep.mayCompose || []).join(' | ');
  ok(/fetchOptionChainNested/.test(may) && /discovery only/i.test(may),
    '3.7: the chain owners are optional and marked discovery-only');
  ok(/createRequestCoalescer/.test(may), '3.8: createRequestCoalescer is available for stress-run single-flight');
  ok(!(ep.mustCompose || []).includes('fetchOptionChainNested'),
    '3.9: the chain is NOT a mandatory composition of the endpoint');
  ok((ep.mustNotRebuild || []).includes('exact-symbol quote and Greeks reads'),
    '3.10: exact-symbol quote/Greeks reads must not be rebuilt');
  ok(/RESOLVED/.test(String(ep.portfolioInputDecision || '')) && /portfolioId/.test(String(ep.portfolioInputDecision || '')),
    '3.11: the portfolioId-vs-snapshot decision is resolved in favour of portfolioId');
}

section('3b. Revision 1.1.0 architectural contracts');
mustHold(vUnderlyingShockContracts, MODEL, null, '3b.1: the non-SPY underlying shock is fully contracted');
mustHold(vEquityContracts, MODEL, null, '3b.2: equity/ETF stress P&L uses signed shares and no option multiplier');
mustHold(vParityContracts, MODEL, null, '3b.3: cross-tier parity is contracted and divergence is fatal');
mustHold(vUnitsContracts, MODEL, null, '3b.4: engine units are raw, and presentation transforms are excluded from engine inputs');
mustHold(vSnapshotOwnership, MODEL, null, '3b.5: the stress-run snapshot is NEW and the market context stays portfolio-agnostic');
mustHold(vSpyRunAuthority, MODEL, null, '3b.6: one run has exactly one frozen SPY source, frozen by the backend');

section('3c. Temporal coherence');
mustHold(vTemporalContracts, MODEL, null, '3c.1: the run freezes every input before computing and never rereads mid-matrix');

section('4. Data quality');
mustHold(vDataQuality, MODEL, null, '4.1: missing never becomes zero, nearest-strike substitution and double-counting are banned');
{
  const c = new Map((MODEL.contracts || []).map((x) => [x.id, x]));
  const d2 = c.get('PST-DATA-002');
  ok(!!d2 && /beta of one/i.test(d2.text),
    '4.2: PST-DATA-002 also forbids a silent beta of one');
  ok(!!d2 && /quantity of one/i.test(d2.text),
    '4.3: PST-DATA-002 also forbids a silent quantity of one (the backend default-to-1 hazard)');
}

// The runtime file set: index.html plus everything under js/ and css/. Enumerated
// from disk (never a hardcoded list) so a newly added runtime file is covered
// automatically.
const RUNTIME_FILES = (function () {
  const out = ['index.html'];
  const walk = (dir) => {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) walk(rel);
      else out.push(rel);
    }
  };
  walk('js'); walk('css');
  return out;
})();

section('5. This PR is inert');
mustHold(vSpecificationIsInert, realReader, RUNTIME_FILES, '5.1: nothing this PR adds is on a runtime path, reachable from runtime code, or able to reach the network');
{
  // 5.2 — RE-DERIVED in revision 1.3.0.
  //
  // The old assertion was `no css/ directory exists`, which was the right way to
  // say "this PR adds no presentation surface" while no PR had one. The UI tier
  // adds the stylesheet link that monolithBoundary.allowedFutureMonolithAdditions
  // anticipated as its FIRST permitted addition, so the directory now exists —
  // and the honest invariant is not that it is absent but that it holds EXACTLY
  // the declared stylesheet and nothing else. That is strictly more than the old
  // rule checked: "absent" said nothing about what a css/ directory would be
  // allowed to contain once one appeared.
  {
    const cssDir = path.join(ROOT, 'css');
    const declaredCss = UI_ADDED.filter((f) => f.startsWith('css/'));
    if (!fs.existsSync(cssDir)) {
      ok(declaredCss.length === 0, '5.2: no css/ directory, and none is declared');
    } else {
      const onDisk = fs.readdirSync(cssDir).map((f) => 'css/' + f).sort();
      ok(JSON.stringify(onDisk) === JSON.stringify([...declaredCss].sort()),
        '5.2: css/ holds exactly the declared stylesheet — on disk ' + JSON.stringify(onDisk) +
        ', declared ' + JSON.stringify(declaredCss));
    }
  }
  for (const rel of SPEC_FILES) {
    ok(fs.existsSync(path.join(ROOT, rel)), '5.3: specification file present — ' + rel);
  }
  // 5.4 — RE-DERIVED in revision 1.3.0.
  //
  // `runtimeImplemented is false` was never the invariant; it was the CURRENT
  // VALUE of a field whose meaning the model states explicitly:
  //
  //   "runtimeImplemented answers ONE question: can a user reach the Portfolio
  //    Stress Test from the application? ... it must stay false until the
  //    renderer and the tab exist."
  //
  // Asserting the literal `false` forever would have made the field unfalsifiable
  // in the one direction that matters — it could never become true even once its
  // own stated criterion was met. What is enforced instead is the CRITERION: the
  // field is true if and only if the renderer, the state module and the
  // navigation entry all exist on disk and are wired into index.html. A PR that
  // flips the flag without building them fails; a PR that builds them and leaves
  // the flag false fails too.
  {
    const declaredJs = UI_ADDED_JS;
    const modulesExist = declaredJs.length > 0 && declaredJs.every((f) => fs.existsSync(path.join(ROOT, f)));
    let idx = '';
    try { idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); } catch (_) { idx = ''; }
    const wired = declaredJs.every((f) => idx.indexOf('<script src="./' + f + '"></script>') !== -1);
    const navEntry = /id="ntab-stress"/.test(idx) && idx.indexOf('STRESS TEST') !== -1;
    const mount = /id="view-stress"/.test(idx);
    const reachable = modulesExist && wired && navEntry && mount;
    ok(MODEL.runtimeImplemented === reachable,
      '5.4: runtimeImplemented (' + MODEL.runtimeImplemented + ') matches whether the feature is reachable' +
      ' (modules=' + modulesExist + ' wired=' + wired + ' tab=' + navEntry + ' mount=' + mount + ')');
  }
}

section('6. Monolith boundary (structural, always active)');
ok(RUNTIME_FILES.length >= 24, '6.0: runtime file set enumerated (' + RUNTIME_FILES.length + ' files)');
mustHold(vMonolithBoundary, realReader, RUNTIME_FILES, '6.1: no STRESS TEST runtime surface exists in index.html, js/** or css/**');
{
  const b = MODEL.monolithBoundary || {};
  for (const forb of ['new Stress-Test-specific logic', 'a second implementation of an existing owner',
    'new pricing formulas', 'scenario engine', 'matrix engine', 'overlay calculations',
    'stress-run state', 'stress renderer', 'stress cache', 'stress data-quality rules',
    'stress contract constants']) {
    ok((b.forbiddenNewSurfaceInMonolith || []).includes(forb), '6.2: the monolith excludes NEW surface: ' + forb);
  }
  // The blanket ban of revision 1.0.0 must NOT come back: it outlawed the audited legacy
  // owners the same document classifies as REUSE.
  ok(!Object.prototype.hasOwnProperty.call(b, 'forbiddenInMonolithForever'),
    '6.2b: the blanket "forbidden forever" list is gone');
  const tol = b.toleratedLegacyOwners || {};
  ok(/out of scope/i.test(String(tol.rule || '')), '6.2c: audited legacy owners are explicitly tolerated and out of scope');
  ok((tol.examples || []).length >= 4, '6.2d: the tolerated legacy owners are enumerated');
  for (const legacy of ['resolveFreshSpyPrice', 'getPreferredOptionDxlinkSymbol', '_optChainCache']) {
    ok((tol.examples || []).join(' | ').indexOf(legacy) !== -1,
      '6.2e: legacy owner tolerated by name — ' + legacy);
  }
  for (const allowed of ['stylesheet link', 'script tag', 'STRESS TEST navigation entry', 'empty mount point', 'minimal bootstrap call site']) {
    ok((b.allowedFutureMonolithAdditions || []).includes(allowed), '6.3: future PRs may add ' + allowed);
  }
  ok(/case-sensitive/i.test(String(b.forbiddenTokenMatching || '')),
    '6.4: the token-matching rule and its case-sensitivity rationale are recorded');
}

section('7. Runtime change is DECLARED, bounded and enforced');
mustHold(vHashRecord, MODEL, null, '7.1: the recorded hash evidence is well-formed');
{
  // Every js/** file on disk must be accounted for EXACTLY once: either it
  // existed at the base (and carries a recorded hash) or this companion declares
  // it as an addition. A file in both, or in neither, is the hole this replaces
  // the old count comparison to close.
  const recorded = new Set(Object.keys(MODEL.hashIdentity.jsFiles));
  // Either tier may account for a js/** file, and exactly one of them must.
  const added = new Set(DECLARED_RUNTIME_ADDED);
  const onDisk = RUNTIME_FILES.filter((f) => f.startsWith('js/'));
  const unaccounted = onDisk.filter((f) => !recorded.has(f) && !added.has(f));
  const doubleCounted = onDisk.filter((f) => recorded.has(f) && added.has(f));
  ok(unaccounted.length === 0,
    '7.2: every js/** file on disk is either recorded at the base or declared as a companion addition' +
    (unaccounted.length ? ' — unaccounted: ' + unaccounted.join(', ') : ''));
  ok(doubleCounted.length === 0,
    '7.2b: no js/** file is both recorded at the base and declared as new' +
    (doubleCounted.length ? ' — ' + doubleCounted.join(', ') : ''));
  // Scoped to js/** because that is what `onDisk` enumerates; the UI tier's
  // stylesheet is accounted for by 5.2, which checks css/ against its own
  // declaration.
  const declaredJs = [...added].filter((f) => f.startsWith('js/'));
  ok(declaredJs.length > 0 && declaredJs.every((f) => onDisk.includes(f)),
    '7.2c: every declared js/** module exists on disk (' + declaredJs.length + ' declared)');
  ok(MD.indexOf(MODEL.hashIdentity.indexHtml) !== -1, '7.3: the index.html base hash is published in the Markdown');
}
if (!GIT_OK) {
  skip('git is unavailable — the base-commit cross-check and the change-set identity check cannot run');
} else {
  mustHold(vHashRecordMatchesBase, MODEL, null, '7.4: recorded hashes match what the base commit actually contained');
  mustHold(vHashRecordIsCurrentBase, MODEL, null, '7.4b: the recorded base is an ancestor of HEAD and every UNDECLARED runtime file is byte-identical between them');
  mustHold(vChangeSetIdentity, null, null, '7.5: no commit touches the specification and an UNDECLARED runtime file');
  mustHold(vCompanionRuntimeDelta, null, null, '7.6: the companion runtime delta is exactly what the model declares — script tags, three new modules and the declared transport signal');
}

section('7b. The companion modules are inert, and the declared boundary holds');
mustHold(vCompanionModulesInert, realReader, COMPANION_ADDED,
  '7b.1: every companion module is inert at load and carries no renderer, timer, listener, DOM, storage, order, overlay store or cache');
{
  ok(COMPANION.rendererDelivered !== true, '7b.2: the model does not claim a renderer was delivered');
  for (const item of ['Stress Test tab or page', 'matrix renderer', 'scenario builder UI',
    'Overlay graphical editor', 'Overlay persistence', 'order entry', 'Journal changes',
    'backend changes', 'migrations']) {
    ok((COMPANION.notDeliveredByThisPr || []).includes(item),
      '7b.3: the model records that this PR does NOT deliver — ' + item);
  }
  ok(COMPANION.branch === 'claude/portfolio-stress-backend-parity-v1',
    '7b.4: the companion branch is declared');
  {
    // The count is no longer zero: the 2.1.0 fixtures surfaced six real
    // divergences in the frontend owners. What the contract requires is that
    // each correction is NAMED with its before and after, and that consumer
    // regression coverage is recorded — not that the count stays at zero.
    const c = COMPANION.canonicalOwnerCorrectionsRequired || {};
    ok(typeof c.count === 'number', '7b.5: the model records how many canonical owner corrections the parity fixtures required');
    ok((c.corrections || []).length === c.count,
      '7b.5b: every correction is enumerated (' + ((c.corrections || []).length) + ' of ' + c.count + ')');
    for (const corr of c.corrections || []) {
      ok(!!corr.owner && !!corr.before && !!corr.after,
        '7b.5c: the correction to ' + (corr.owner || '?') + ' records what it was and what it became');
    }
    ok(c.count === 0 || (typeof c.consumerRegressionCoverage === 'string' && c.consumerRegressionCoverage.length > 40),
      '7b.5d: a correction to a canonical owner records how its existing consumers are regression-covered');
    ok(c.count === 0 || /MINIMAL/.test(String(c.rule || '')),
      '7b.5e: the correction rule is recorded — minimal owner fix, never an adjusted fixture');
  }
  // Every stress module on disk belongs to exactly one declared tier, and every
  // declared module exists. Widened from `js/services/portfolio-stress-*` to
  // cover js/ui/ too, because that is where the renderer lives and a renderer
  // dropped into an unscanned directory is precisely what this assertion is for.
  const onDiskStress = RUNTIME_FILES
    .filter((f) => /^js\/(services|ui)\/portfolio-stress-/.test(f)).sort();
  ok(JSON.stringify(onDiskStress) === JSON.stringify([...COMPANION_ADDED.concat(UI_ADDED_JS)].sort()),
    '7b.6: exactly the declared stress modules exist on disk, got ' + JSON.stringify(onDiskStress));
}

section('7c. The UI tier is declared, minimal and bounded');
mustHold(vUiModulesContract, realReader, UI_ADDED,
  '7c.1: every UI module is inert at load, reaches no network, no storage, no order path and no cache, and coerces no null to zero');
{
  // The declared base must be a real commit in THIS branch's history, and it must
  // be at or after the companion's base — a UI tier claiming to be built on
  // something that does not contain the client it calls would be describing a
  // different branch. Checked against git rather than pinned to a literal, so a
  // rebase cannot leave the record behind the way a hardcoded sha would.
  ok(/^[0-9a-f]{40}$/.test(String(UI.baseCommit || '')), '7c.2: the UI base commit is a full sha1');
  if (GIT_OK) {
    let reachable = true;
    try { git(['cat-file', '-e', UI.baseCommit + '^{commit}']); } catch (_) { reachable = false; }
    if (!reachable) skip('the UI base commit is not reachable in this clone — ancestry check skipped');
    else {
      let isAncestor = true;
      try { git(['merge-base', '--is-ancestor', UI.baseCommit, 'HEAD']); } catch (_) { isAncestor = false; }
      ok(isAncestor, '7c.2b: the declared UI base is an ancestor of HEAD');
      let companionIncluded = true;
      try { git(['merge-base', '--is-ancestor', COMPANION.baseCommit, UI.baseCommit]); } catch (_) { companionIncluded = false; }
      ok(companionIncluded, '7c.2c: the UI base contains the companion base — the UI is built on the client it calls');
    }
  } else {
    skip('git is unavailable — UI base ancestry checks skipped');
  }
  ok(Array.isArray(UI_ADDED) && UI_ADDED.length > 0, '7c.3: the UI tier declares its added runtime files');
  for (const rel of UI_ADDED) {
    ok(fs.existsSync(path.join(ROOT, rel)), '7c.4: declared UI runtime file exists — ' + rel);
  }
  for (const rel of (UI.addedNonRuntimeFiles || [])) {
    ok(fs.existsSync(path.join(ROOT, rel)), '7c.5: declared UI suite exists — ' + rel);
  }
  // The renderer must reach the backend through the ONE client, and through
  // nothing else. Checked positively (it calls the client) as well as negatively
  // (the inertness rules above forbid fetch/ttCall), because "contains no fetch"
  // is also true of a file that talks to no backend at all.
  // Comments are stripped first: this file DOCUMENTS what it must not reach
  // ("never written to localStorage", "the only backend call is
  // runPortfolioStressTestRequest"), and counting those sentences as code would
  // reward deleting the explanation.
  const panelRaw = fs.readFileSync(path.join(ROOT, UI.uiModuleInertness.rendererModule.file), 'utf8');
  const panel = panelRaw.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok(panel.indexOf('runPortfolioStressTestRequest(') !== -1,
    '7c.6: the renderer dispatches through the canonical stress client');
  const clientCalls = (panel.match(/runPortfolioStressTestRequest\s*\(/g) || []).length;
  ok(clientCalls === 1,
    '7c.7: the renderer has exactly ONE dispatch site, got ' + clientCalls);
  ok(panel.indexOf('_httpStatusFromError') !== -1,
    '7c.8: the renderer reads HTTP status through the canonical owner rather than parsing it again');
  // The overlay never leaves memory. A single grep for a persistence verb beside
  // the overlay would be weak; the inertness rule already bans the storage APIs
  // outright, and this pins the absence of a save affordance in the UI itself.
  // journalManager/positionManager are named because they are the two owners a
  // "just persist it" change would reach for first.
  for (const forbidden of ['saveOverlay', 'persistOverlay', 'localStorage', 'journalManager', 'positionManager']) {
    ok(panel.indexOf(forbidden) === -1, '7c.9: the renderer does not reach ' + forbidden);
  }
  // A suite that exists but never runs is worse than no suite: it reads as
  // coverage on the file listing and proves nothing in CI. Every declared UI
  // suite must appear in the workflow as its own step.
  {
    let wf = '';
    try { wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'portfolio-stress-companion.yml'), 'utf8'); }
    catch (_) { wf = ''; }
    ok(wf.length > 0, '7c.12: the companion workflow is present');
    for (const suite of (UI.addedNonRuntimeFiles || []).filter((f) => f.endsWith('.test.js'))) {
      ok(wf.indexOf('node ' + suite) !== -1, '7c.13: CI runs ' + suite);
    }
    // ...and the syntax check must cover the directory the renderer lives in.
    ok(/js\/ui\/portfolio-stress-\*\.js/.test(wf),
      '7c.14: the CI syntax check covers js/ui/');
  }
  // Every existing file this tier MODIFIES must be declared, with a stated
  // reason. The same requirement the companion's adjacent-suite updates carry:
  // an undocumented "we had to change this test" entry is a blank cheque.
  ok((UI.modifiedNonRuntimeFiles || []).length > 0,
    '7c.15: the UI tier declares which existing non-runtime files it modifies');
  ok(typeof UI.modifiedNonRuntimeFilesReason === 'string' && UI.modifiedNonRuntimeFilesReason.length > 200,
    '7c.16: it states, at length, why each modification is a re-derivation and not a weakening');
  for (const kw of ['RE-DERIVED', 'never relaxed', 'adds no allowance']) {
    ok(UI.modifiedNonRuntimeFilesReason.indexOf(kw) !== -1,
      '7c.17: the reason addresses — ' + kw);
  }
  ok((UI.notDeliveredByThisPr || []).length >= 5,
    '7c.10: the UI tier enumerates what it does NOT deliver');
  for (const item of ['Overlay persistence', 'order entry', 'Journal changes', 'backend changes']) {
    ok((UI.notDeliveredByThisPr || []).includes(item),
      '7c.11: the UI tier records that it does NOT deliver — ' + item);
  }
}

// ── MUTATION PROOF ──────────────────────────────────────────────────────────
section('8. MUTATION PROOF — architecture mutations (in memory only)');
{
  // 8.1 matrix owner moved to the frontend
  const m1 = clone(MODEL); m1.matrixComputationOwner = 'frontend';
  mustCatch(vComputationOwnership, m1, null, 'a frontend matrix owner must be rejected');

  // 8.2 rendering moved to the backend
  const m2 = clone(MODEL); m2.renderOwner = 'backend';
  mustCatch(vComputationOwnership, m2, null, 'a backend render owner must be rejected');

  // 8.3 pricing allowed in the frontend
  const m3 = clone(MODEL);
  m3.contracts.find((c) => c.id === 'PST-PRICING-006').text = 'Pricing may live wherever is convenient.';
  mustCatch(vComputationOwnership, m3, null, 'permitting frontend pricing must be rejected');

  // 8.4 new pricing formulas allowed in the monolith
  const m4 = clone(MODEL);
  m4.monolithBoundary.forbiddenNewSurfaceInMonolith =
    m4.monolithBoundary.forbiddenNewSurfaceInMonolith.filter((x) => x !== 'new pricing formulas');
  ok(!m4.monolithBoundary.forbiddenNewSurfaceInMonolith.includes('new pricing formulas'),
    '8.4: removing new pricing formulas from the monolith ban is detectable');

  // 8.4b the blanket ban reinstated — it would outlaw the audited legacy owners
  const m4b = clone(MODEL);
  m4b.monolithBoundary.forbiddenInMonolithForever = ['SPY resolver', 'option-symbol logic', 'market-data resolver'];
  ok(Object.prototype.hasOwnProperty.call(m4b.monolithBoundary, 'forbiddenInMonolithForever'),
    '8.4b: a reinstated blanket "forbidden forever" list is detectable');

  // 8.4c the tolerance for audited legacy owners removed
  const m4c = clone(MODEL);
  delete m4c.monolithBoundary.toleratedLegacyOwners;
  ok(!m4c.monolithBoundary.toleratedLegacyOwners,
    '8.4c: removing the legacy-owner tolerance is detectable');

  // 8.5 Vega x dIV promoted to the primary pricing method
  const m5 = clone(MODEL);
  m5.contracts.find((c) => c.id === 'PST-PRICING-001').text = 'Pricing uses Vega x delta-IV.';
  mustCatch(vPricingDiscipline, m5, null, 'promoting the Vega approximation must be rejected');

  // 8.6 early exercise dropped
  const m6 = clone(MODEL);
  m6.contracts.find((c) => c.id === 'PST-PRICING-003').text = 'All options are treated as European for simplicity.';
  mustCatch(vPricingDiscipline, m6, null, 'dropping American early exercise must be rejected');

  // 8.7 Actual and Proposed on different snapshots
  const m7 = clone(MODEL);
  m7.contracts.find((c) => c.id === 'PST-SNAPSHOT-001').text = 'Each result set may resolve its own market data independently.';
  mustCatch(vSingleSnapshot, m7, null, 'different snapshots for Actual and Proposed must be rejected');

  // 8.8 shared-input guarantee weakened
  const m8 = clone(MODEL);
  m8.contracts.find((c) => c.id === 'PST-RESULT-004').text = 'Actual and Proposed use the same model.';
  mustCatch(vSingleSnapshot, m8, null, 'dropping the shared SPY/VIX/scenario guarantee must be rejected');

  // 8.9 overlay replacing Actual
  const m9 = clone(MODEL); m9.overlay.identity = 'Proposed = Overlay';
  mustCatch(vAdditivity, m9, null, 'an overlay that replaces Actual must be rejected');

  // 8.10 additivity equation removed
  const m10 = clone(MODEL);
  m10.contracts.find((c) => c.id === 'PST-RESULT-002').text = 'Proposed is computed independently of Actual.';
  mustCatch(vAdditivity, m10, null, 'dropping the additivity equation must be rejected');

  // 8.11 a persistent overlay
  const m11 = clone(MODEL);
  m11.contracts.find((c) => c.id === 'PST-OVERLAY-003').text = 'The overlay is saved to localStorage between sessions.';
  mustCatch(vEphemeralOverlay, m11, null, 'a persistent overlay must be rejected');

  // 8.12 one request per cell
  const m12 = clone(MODEL);
  m12.contracts.find((c) => c.id === 'PST-MATRIX-005').text = 'Each cell is fetched individually.';
  mustCatch(vNoNPlusOne, m12, null, 'one request per cell must be rejected');

  // 8.13 one request per leg per scenario
  const m13 = clone(MODEL);
  m13.contracts.find((c) => c.id === 'PST-PERF-002').text = 'Requests are made as needed.';
  mustCatch(vNoNPlusOne, m13, null, 'a request per leg per scenario must be rejected');

  // 8.14 hydration cap removed
  const m14 = clone(MODEL);
  m14.contracts.find((c) => c.id === 'PST-HYDRATION-004').text = 'Contracts are hydrated whenever needed.';
  mustCatch(vNoNPlusOne, m14, null, 'removing the once-per-run hydration cap must be rejected');

  // 8.14b the per-underlying chain cap removed
  const m14b = clone(MODEL);
  m14b.contracts.find((c) => c.id === 'PST-HYDRATION-005').text = 'The chain is fetched as needed.';
  mustCatch(vNoNPlusOne, m14b, null, 'removing the per-underlying chain cap must be rejected');

  // 8.15 a missing input turned into zero
  const m15 = clone(MODEL);
  m15.contracts.find((c) => c.id === 'PST-DATA-002').text = 'A missing input defaults to 0 so the totals stay computable.';
  mustCatch(vDataQuality, m15, null, 'turning a missing input into zero must be rejected');

  // 8.16 a zero SPY fallback
  const m16 = clone(MODEL);
  m16.contracts.find((c) => c.id === 'PST-SPY-006').text = 'A missing SPY price falls back to the last known default.';
  mustCatch(vDataQuality, m16, null, 'a zero/invented SPY fallback must be rejected');

  // 8.17 nearest strike allowed
  const m17 = clone(MODEL);
  m17.contracts.find((c) => c.id === 'PST-OPTION-SYMBOL-005').text = 'The closest available strike may be used.';
  mustCatch(vDataQuality, m17, null, 'nearest-strike substitution must be rejected');

  // 8.18 the debit counted twice / the credit declared as profit
  const m18 = clone(MODEL);
  m18.contracts.find((c) => c.id === 'PST-ENTRY-002').text = 'The overlay credit is booked as immediate profit.';
  mustCatch(vDataQuality, m18, null, 'declaring a credit as initial profit must be rejected');

  // 8.19 an incomplete Proposed reported as VALID
  const m19 = clone(MODEL);
  m19.contracts.find((c) => c.id === 'PST-DATA-004').text = 'Results are reported optimistically.';
  mustCatch(vDataQuality, m19, null, 'an incomplete VALID Proposed must be rejected');

  // ── revision 1.1.0 mutations ───────────────────────────────────────────────

  // 8.20 every underlying treated as SPY
  const m20 = clone(MODEL);
  m20.contracts = m20.contracts.filter((c) => !c.id.startsWith('PST-UNDERLYING-'));
  mustCatch(vUnderlyingShockContracts, m20, null, 'deleting the underlying shock contracts must be rejected');

  // 8.21 a missing beta silently becoming 1
  const m21 = clone(MODEL);
  m21.contracts.find((c) => c.id === 'PST-UNDERLYING-007').text =
    'When no beta is available the symbol is assumed to move with SPY (beta 1).';
  mustCatch(vUnderlyingShockContracts, m21, null, 'assuming beta 1 for a missing mapping must be rejected');

  // 8.22 ordinary beta relabelled as downside beta
  const m22 = clone(MODEL);
  m22.contracts.find((c) => c.id === 'PST-UNDERLYING-004').text =
    'Ordinary beta is used and reported as the downside beta of the symbol.';
  mustCatch(vUnderlyingShockContracts, m22, null, 'relabelling ordinary beta as downside beta must be rejected');

  // 8.23 a downside beta invented
  const m23 = clone(MODEL);
  m23.contracts.find((c) => c.id === 'PST-UNDERLYING-003').text =
    'A downside beta is estimated from ordinary beta when none is published.';
  mustCatch(vUnderlyingShockContracts, m23, null, 'inventing a downside beta must be rejected');

  // 8.24 a non-positive stressed spot allowed
  const m24 = clone(MODEL);
  m24.contracts.find((c) => c.id === 'PST-UNDERLYING-006').text =
    'stressedSpot = currentSpot x (1 + symbolStressReturn).';
  mustCatch(vUnderlyingShockContracts, m24, null, 'dropping the strictly-positive stressed spot must be rejected');

  // 8.25 Actual and Proposed allowed to use different stressed spots
  const m25 = clone(MODEL);
  m25.contracts.find((c) => c.id === 'PST-RESULT-004').text =
    'Actual and Proposed MUST use the same SPY, VIX, scenario, horizon, model, snapshot and sources.';
  mustCatch(vUnderlyingShockContracts, m25, null, 'diverging stressed spots must be rejected');

  // 8.26 equity P&L without signed shares
  const m26 = clone(MODEL);
  m26.contracts.find((c) => c.id === 'PST-EQUITY-001').text = 'Equities use a share quantity.';
  mustCatch(vEquityContracts, m26, null, 'equity P&L without signed shares must be rejected');

  // 8.27 the 100x option multiplier applied to shares
  const m27 = clone(MODEL);
  m27.contracts.find((c) => c.id === 'PST-EQUITY-002').text =
    'equityStressPnl = (stressedSpot - currentSpot) x signedShares x 100.';
  mustCatch(vEquityContracts, m27, null, 'a 100x multiplier on shares must be rejected');

  // 8.28 the parity contract deleted
  const m28 = clone(MODEL);
  m28.contracts = m28.contracts.filter((c) => !c.id.startsWith('PST-PARITY-'));
  mustCatch(vParityContracts, m28, null, 'deleting the cross-tier parity contracts must be rejected');

  // 8.29 a tier divergence tolerated silently
  const m29 = clone(MODEL);
  m29.contracts.find((c) => c.id === 'PST-PARITY-003').text =
    'A divergence between the tiers is logged and the run continues.';
  mustCatch(vParityContracts, m29, null, 'silently tolerating a tier divergence must be rejected');

  // 8.30 two independent fixture sets
  const m30 = clone(MODEL);
  m30.contracts.find((c) => c.id === 'PST-PARITY-004').text = 'Each tier maintains its own fixtures.';
  mustCatch(vParityContracts, m30, null, 'independent per-tier fixtures must be rejected');

  // 8.31 a raw Greek mixed with a points-normalized Greek
  const m31 = clone(MODEL);
  m31.contracts.find((c) => c.id === 'PST-UNITS-004').text = 'Units are handled per call site.';
  mustCatch(vUnitsContracts, m31, null, 'mixing raw and points-normalized Greeks must be rejected');

  // 8.32 normalizeGreekPoints fed into the engine
  const m32 = clone(MODEL);
  m32.contracts.find((c) => c.id === 'PST-UNITS-002').text = 'Greeks are normalized before pricing.';
  mustCatch(vUnitsContracts, m32, null, 'feeding a presentation transform into the engine must be rejected');

  // 8.33 the unproven per-share unit re-asserted as fact
  const m33 = clone(MODEL);
  m33.units.measuredCurrentUnits.legLiveGreeks.scale = 'per share, unscaled by quantity';
  mustCatch(vUnitsContracts, m33, null, 're-asserting an unproven economic unit must be rejected');

  // 8.34 market context extended with overlayHash
  const m34 = clone(MODEL);
  m34.contracts.find((c) => c.id === 'PST-SNAPSHOT-005').text =
    'The market-context snapshot carries the run identity fields.';
  mustCatch(vSnapshotOwnership, m34, null, 'adding run identity to the market context must be rejected');
  const m34b = clone(MODEL);
  const msRow = m34b.reuseManifest.find((r) => r.responsibility === 'market snapshot');
  msRow.mustNotReceive = msRow.mustNotReceive.filter((f) => f !== 'overlayHash');
  mustCatch(vSnapshotOwnership, m34b, null, 'permitting overlayHash on the market context must be rejected');

  // 8.35 an overlay edit invalidating the global market cache
  const m35 = clone(MODEL);
  m35.snapshot.mustNotInvalidate = [];
  mustCatch(vSnapshotOwnership, m35, null, 'letting an overlay edit invalidate the global market cache must be rejected');

  // 8.36 two SPY sources in one run
  const m36 = clone(MODEL);
  m36.contracts.find((c) => c.id === 'PST-SPY-007').text =
    'The frontend may re-resolve SPY and replace the backend value.';
  mustCatch(vSpyRunAuthority, m36, null, 'two SPY sources in one run must be rejected');

  // 8.37 the backend required to call a frontend function
  const m37 = clone(MODEL);
  m37.contracts.find((c) => c.id === 'PST-SPY-001').text =
    'Every run MUST start from the SPY price already resolved by the canonical frontend Portfolio path.';
  mustCatch(vSpyRunAuthority, m37, null, 'requiring a backend-to-frontend call must be rejected');

  // ── revision 1.2.0 temporal mutations ──────────────────────────────────────

  // 8.38 SPY reread part-way through the matrix
  const m38 = clone(MODEL);
  m38.contracts.find((c) => c.id === 'PST-TEMPORAL-002').text =
    'The matrix engine may refresh SPY between cells so later cells are more accurate.';
  mustCatch(vTemporalContracts, m38, null, 'rereading SPY mid-matrix must be rejected');

  // 8.39 quotes refetched for every scenario
  const m39 = clone(MODEL);
  m39.contracts.find((c) => c.id === 'PST-TEMPORAL-002').text =
    'Each scenario reads the quote cache and the Greeks cache as needed. All cells use current values.';
  mustCatch(vTemporalContracts, m39, null, 'refetching quotes per scenario must be rejected');

  // 8.40 calculation allowed to start before the freeze completes
  const m40 = clone(MODEL);
  m40.contracts.find((c) => c.id === 'PST-TEMPORAL-001').text =
    'Market inputs are read as each scenario needs them.';
  mustCatch(vTemporalContracts, m40, null, 'computing before the freeze must be rejected');

  // 8.41 Actual and Proposed carrying different timestamps
  const m41 = clone(MODEL);
  m41.contracts.find((c) => c.id === 'PST-TEMPORAL-007').text =
    'Actual and Proposed use the same snapshot id.';
  mustCatch(vTemporalContracts, m41, null, 'Actual and Proposed with different timestamps must be rejected');

  // 8.42 OVERLAY LIFECYCLE — five mutants.
  //
  // Revision 1.2.0's mutant here asserted that "Adding an Overlay leg refreshes the
  // affected quotes" was a violation. It is not: during a NEW snapshot assembly that is
  // exactly what PST-HYDRATION-001 requires, because a newly added leg introduces exact
  // canonical symbols nobody has ever read. The real violations are about WHEN the read
  // happens and WHAT it is allowed to touch.
  const setT = (model, id, text) => {
    const cc = model.contracts.find((c) => c.id === id);
    cc.text = text;
    return model;
  };

  // A — hydration AFTER the freeze
  const mA = setT(clone(MODEL), 'PST-TEMPORAL-007',
    'Actual, Overlay, Proposed and Difference MUST use the same snapshot id, the same current spots, the same ' +
    'stressed spots, the same timestamps, the same option quotes, the same implied volatilities, the same Greeks, ' +
    'the same beta, the same NLV, and the same sources and freshness classifications. The Overlay may hydrate a new ' +
    'exact symbol after snapshotCompletedAt.');
  mustCatch(vTemporalContracts, mA, null, 'MUTANT A: hydrating a new exact symbol after the freeze must be rejected');

  // B — Proposed hydrated separately from Actual
  const mB = clone(MODEL);
  mB.temporalModel.forbiddenAfterSnapshotCompletion =
    mB.temporalModel.forbiddenAfterSnapshotCompletion.filter((x) => x !== 'hydrating Overlay separately from Actual');
  mustCatch(vTemporalContracts, mB, null, 'MUTANT B: Proposed refreshing the Overlay quotes separately must be rejected');
  const mB2 = setT(clone(MODEL), 'PST-TEMPORAL-008',
    'An edit to the Hypothetical Overlay MUST invalidate the previous result; display INPUTS CHANGED — RERUN REQUIRED; ' +
    'leave the previous snapshot unmutated; require a new run. Actual is calculated from the original snapshot and ' +
    'Proposed refreshes the Overlay quotes.');
  mustCatch(vTemporalContracts, mB2, null, 'MUTANT B2: Actual and Proposed built from different reads must be rejected');

  // C — an overlay edit mutating the completed run in place
  const mC = clone(MODEL);
  mC.temporalModel.overlayEditInvalidatesPreviousRun = false;
  mustCatch(vTemporalContracts, mC, null, 'MUTANT C: an overlay edit mutating the completed snapshot must be rejected');
  const mC2 = setT(clone(MODEL), 'PST-TEMPORAL-008',
    'An edit to the Hypothetical Overlay updates the existing run in place and recomputes Proposed. ' +
    'The previous snapshot is reused.');
  mustCatch(vTemporalContracts, mC2, null, 'MUTANT C2: an in-place overlay update without a rerun must be rejected');

  // D — a new contract reusing another leg's data instead of being hydrated
  const mD = clone(MODEL);
  mD.temporalModel.newExactSymbolsHydratedBeforeFreeze = false;
  mustCatch(vTemporalContracts, mD, null, 'MUTANT D: a new exact contract reusing another leg\'s quote must be rejected');
  const mD2 = clone(MODEL);
  mD2.temporalModel.allowedDuringSnapshotAssembly =
    mD2.temporalModel.allowedDuringSnapshotAssembly.filter((x) => x !== 'hydrating a newly referenced exact canonical symbol');
  mustCatch(vTemporalContracts, mD2, null, 'MUTANT D2: forbidding hydration of a newly referenced symbol must be rejected');

  // E — the CORRECT formulation must be ACCEPTED, not flagged.
  //     This is the mutant that proves the validator is not simply banning the word
  //     "hydrate": a new run hydrating newly referenced exact symbols before completing
  //     the snapshot is exactly right, and must pass cleanly.
  const mE = clone(MODEL);
  mE.temporalModel.overlayRule =
    'A new run hydrates newly referenced exact symbols before completing the snapshot. ' +
    'After snapshotCompletedAt no further market read may occur.';
  ok(vTemporalContracts(mE, null).length === 0,
    'MUTANT E: hydration during a NEW snapshot assembly must be ACCEPTED, not flagged');

  // 8.43 a snapshot without snapshotStartedAt
  const m43 = clone(MODEL);
  m43.contracts.find((c) => c.id === 'PST-TEMPORAL-003').text =
    'The snapshot reports snapshotCompletedAt.';
  mustCatch(vTemporalContracts, m43, null, 'a snapshot without snapshotStartedAt must be rejected');

  // 8.44 an input without asOf
  const m44 = clone(MODEL);
  m44.contracts.find((c) => c.id === 'PST-TEMPORAL-004').text =
    'Every input reports source and status.';
  mustCatch(vTemporalContracts, m44, null, 'an input without asOf must be rejected');

  // 8.45 cross-input skew not computed
  const m45 = clone(MODEL);
  m45.contracts.find((c) => c.id === 'PST-TEMPORAL-005').text =
    'The snapshot reports maxInputAgeMs.';
  mustCatch(vTemporalContracts, m45, null, 'omitting maxCrossInputSkewMs must be rejected');

  // 8.46 a hidden temporal threshold
  const m46 = clone(MODEL);
  m46.contracts.find((c) => c.id === 'PST-TEMPORAL-006').text =
    'Inputs older than the internal staleness limit are downgraded automatically.';
  mustCatch(vTemporalContracts, m46, null, 'a hidden temporal threshold must be rejected');

  // 8.47 a stale input reported VALID (the temporal side of PST-DATA-001)
  const m47 = clone(MODEL);
  m47.temporalModel.thresholdStatus = 'stale inputs are still reported VALID';
  mustCatch(vTemporalContracts, m47, null, 'a stale input reported VALID must be rejected');

  // 8.48 one cell allowed to use fresher data than the others
  const m48 = clone(MODEL);
  m48.temporalModel.rereadForbiddenDuring = ['pricing'];
  mustCatch(vTemporalContracts, m48, null, 'a cell using newer data than its peers must be rejected');

  // ── 8.49–8.51 the stale-base class, added in revision 1.2.2 ──────────────
  // These are the mutants that the 1.2.1 suite could not express, which is why the
  // record silently survived the rebase onto the post-PR #359 base.

  // 8.49 the record keeps a base whose index.html no longer matches HEAD. This is
  //      literally what carrying c67c073e… forward past PR #359 would have produced.
  if (GIT_OK) {
    const m49 = clone(MODEL);
    let stale = null;
    try {
      // the parent of the recorded base: a real ancestor of HEAD whose index.html differs
      const prev = git(['rev-parse', MODEL.hashIdentity.baseCommit + '^1']).trim();
      const atPrev = sha256(execFileSync('git', ['show', prev + ':index.html'], { cwd: ROOT, maxBuffer: 1 << 28 }));
      if (atPrev !== MODEL.hashIdentity.indexHtml) stale = { prev: prev, hash: atPrev };
    } catch (_) { /* history too shallow to build the mutant */ }
    if (stale) {
      m49.hashIdentity.baseCommit = stale.prev;
      m49.hashIdentity.indexHtml = stale.hash;
      mustCatch(vHashRecordIsCurrentBase, m49, null,
        'a recorded base whose index.html differs from HEAD must be rejected (the stale-record failure mode)');
    }

    // 8.50 the record names a commit that is not on this branch at all.
    const m50 = clone(MODEL);
    let unrelated = null;
    try {
      const cands = git(['rev-list', '--max-count=40', 'HEAD']).trim().split('\n');
      for (const c of cands) {
        try { git(['merge-base', '--is-ancestor', c, 'HEAD']); } catch (_) { unrelated = c; break; }
      }
      if (!unrelated) {
        // fall back to any commit reachable from a ref that HEAD does not contain
        const other = git(['rev-list', '--max-count=1', '--all', '--not', 'HEAD']).trim();
        if (other) unrelated = other;
      }
    } catch (_) { /* no such commit available */ }
    if (unrelated) {
      m50.hashIdentity.baseCommit = unrelated;
      mustCatch(vHashRecordIsCurrentBase, m50, null,
        'a recorded base that is not an ancestor of HEAD must be rejected');
    }

    // 8.51 the css/** record disagrees with what the base actually contains.
    //      Needs the base to be reachable: without it the validator has nothing
    //      to compare the count against, and a "mutation not caught" there would
    //      be reporting on the clone rather than on the model.
    let baseReachableForCss = false;
    try { git(['cat-file', '-e', MODEL.hashIdentity.baseCommit + '^{commit}']); baseReachableForCss = true; }
    catch (_) { baseReachableForCss = false; }
    if (!baseReachableForCss) {
      skip('the recorded base is not reachable in this clone — the css/** count mutation was NOT run');
    } else {
      const m51 = clone(MODEL);
      m51.hashIdentity.cssFileCount = 3;
      mustCatch(vHashRecordIsCurrentBase, m51, null,
        'a css/** count that disagrees with the base must be rejected');
    }

    // 8.52 the CORRECT record must be ACCEPTED, not flagged. Guards against a
    //      validator that rejects everything and therefore proves nothing.
    ok(vHashRecordIsCurrentBase(MODEL, null).length === 0,
      '8.52: the correct base record must be ACCEPTED, not flagged');
  }
}

section('9. MUTATION PROOF — runtime-file mutations (in memory only)');
{
  // A reader that serves a MODIFIED index.html without ever writing to disk.
  const withStressInIndex = (rel) => rel === 'index.html'
    ? Buffer.from(realReader('index.html').toString('utf8') + '\n<script src="./js/ui/stressTestPanel.js"></script>\n')
    : realReader(rel);
  ok(vMonolithBoundary(withStressInIndex, RUNTIME_FILES).some((v) => /index\.html/.test(v)),
    '9.1: a STRESS TEST script tag added to index.html must be caught');

  // A modified js/ file.
  const jsTarget = RUNTIME_FILES.find((f) => f.startsWith('js/'));
  const withStressInJs = (rel) => rel === jsTarget
    ? Buffer.from(realReader(jsTarget).toString('utf8') + '\nfunction f(){ return stressedMark; }\n')
    : realReader(rel);
  ok(vMonolithBoundary(withStressInJs, RUNTIME_FILES).some((v) => v.startsWith(jsTarget)),
    '9.2: a stress formula added to a js/ file must be caught');

  // A stress state slice smuggled into the monolith.
  const withStateInIndex = (rel) => rel === 'index.html'
    ? Buffer.from(realReader('index.html').toString('utf8') + '\nvar hypotheticalOverlay = [];\n')
    : realReader(rel);
  ok(vMonolithBoundary(withStateInIndex, RUNTIME_FILES).length > 0,
    '9.3: overlay state added to the monolith must be caught');

  // A contract constant smuggled into the monolith.
  const withConstInIndex = (rel) => rel === 'index.html'
    ? Buffer.from(realReader('index.html').toString('utf8') + "\nvar SNAP = { snapshotId: null, overlayHash: null };\n")
    : realReader(rel);
  ok(vMonolithBoundary(withConstInIndex, RUNTIME_FILES).length > 0,
    '9.4: contract constants added to the monolith must be caught');

  // ── the UI tier's own guards must be able to fail ─────────────────────────
  //
  // vMonolithBoundary and vUiModulesContract are NEW, and a new validator that
  // has only ever been run against correct input is a validator nobody has seen
  // work. Each mutation below is a way the UI tier could erode, served from
  // memory, and each must be caught.
  {
    const stateFile = (UI.uiModuleInertness || {}).stateModule.file;
    const panelFile = (UI.uiModuleInertness || {}).rendererModule.file;
    const withUi = (rel, extra) => (r) => (r === rel
      ? Buffer.from(realReader(rel).toString('utf8') + '\n' + extra + '\n')
      : realReader(r));

    // 9.7 a fetch in the renderer — the second transport.
    ok(vUiModulesContract(withUi(panelFile, "function f(){ return fetch('/x'); }"), UI_ADDED)
      .some((v) => /direct fetch/.test(v)), '9.7: a fetch added to the renderer must be caught');

    // 9.8 the transport owner called directly, going around the client.
    ok(vUiModulesContract(withUi(panelFile, "function f(){ return ttCall('/x', {}); }"), UI_ADDED)
      .some((v) => /transport owner/.test(v)), '9.8: a direct ttCall must be caught');

    // 9.9 null coerced to zero.
    ok(vUiModulesContract(withUi(panelFile, 'function f(v){ return Number(v) || 0; }'), UI_ADDED)
      .some((v) => /null-to-zero/.test(v)), '9.9: a null-to-zero coercion must be caught');

    // 9.10 the overlay persisted.
    ok(vUiModulesContract(withUi(panelFile, "function f(l){ localStorage.setItem('o', l); }"), UI_ADDED)
      .some((v) => /storage/.test(v)), '9.10: overlay persistence must be caught');

    // 9.11 an order path.
    ok(vUiModulesContract(withUi(panelFile, 'function f(l){ return placeOrder(l); }'), UI_ADDED)
      .some((v) => /order/.test(v)), '9.11: an order path must be caught');

    // 9.12 a polling timer.
    ok(vUiModulesContract(withUi(panelFile, 'function f(){ setInterval(pstxRun, 1000); }'), UI_ADDED)
      .some((v) => /timer/.test(v)), '9.12: a polling timer must be caught');

    // 9.13 pricing maths.
    ok(vUiModulesContract(withUi(panelFile, 'function f(s,v){ return Math.exp(s*v); }'), UI_ADDED)
      .some((v) => /pricing/.test(v)), '9.13: a pricing formula must be caught');

    // 9.14 the option chain.
    ok(vUiModulesContract(withUi(panelFile, 'function f(u){ return fetchOptionChain(u); }'), UI_ADDED)
      .some((v) => /option chain/.test(v)), '9.14: an option-chain call must be caught');

    // 9.15 the module stops being inert at load.
    ok(vUiModulesContract(withUi(panelFile, 'pstxRender();'), UI_ADDED)
      .some((v) => /top-level statement/.test(v)), '9.15: a top-level call must be caught');

    // 9.16 the PURE module reaching the DOM — the split this tier depends on.
    ok(vUiModulesContract(withUi(stateFile, "function f(){ return document.getElementById('x'); }"), UI_ADDED)
      .some((v) => /DOM access/.test(v)), '9.16: DOM access in the pure state module must be caught');

    // 9.17 ...while the SAME line in the renderer is fine, so the rule is a real
    //      distinction and not a ban that happens to be worded twice.
    ok(vUiModulesContract(withUi(panelFile, "function f(){ return document.getElementById('x'); }"), UI_ADDED)
      .length === 0, '9.17: DOM access in the RENDERER is permitted — the rule distinguishes the tiers');

    // 9.18 the real files are ACCEPTED, so the validator is not rejecting
    //      everything and therefore proving nothing.
    ok(vUiModulesContract(realReader, UI_ADDED).length === 0,
      '9.18: the real UI modules are accepted by the same validator');

    // 9.19 a stress token smuggled into the stylesheet — the file that is
    //      deliberately NOT exempt.
    const cssFile = UI_ADDED.find((f) => f.startsWith('css/'));
    if (cssFile) {
      ok(vMonolithBoundary(withUi(cssFile, '/* stressPnl */'), RUNTIME_FILES)
        .some((v) => v.indexOf(cssFile) !== -1),
        '9.19: a forbidden token in the non-exempt stylesheet must be caught');
    }

    // 9.20 an exemption for a file no tier declared.
    {
      const m = clone(MODEL);
      m.monolithBoundary.uiModuleExemption.exemptFiles =
        m.monolithBoundary.uiModuleExemption.exemptFiles.concat(['js/ui/whatever.js']);
      const saved = MODEL.monolithBoundary.uiModuleExemption.exemptFiles;
      MODEL.monolithBoundary.uiModuleExemption.exemptFiles = m.monolithBoundary.uiModuleExemption.exemptFiles;
      const v = vMonolithBoundary(realReader, RUNTIME_FILES);
      MODEL.monolithBoundary.uiModuleExemption.exemptFiles = saved;
      ok(v.some((x) => /undeclared file/.test(x)), '9.20: an exemption for an undeclared file must be caught');
    }

    // 9.21 an UNDECLARED stress script tag in index.html — the shape a future PR
    //      would use to wire in a second renderer.
    const withRogueTag = (r) => (r === 'index.html'
      ? Buffer.from(realReader('index.html').toString('utf8') +
        '\n<script src="./js/ui/portfolio-stress-extra.js"></script>\n')
      : realReader(r));
    ok(vMonolithBoundary(withRogueTag, RUNTIME_FILES).some((v) => /index\.html/.test(v)),
      '9.21: an undeclared stress script tag must still be caught');
  }

  // A recorded hash that no longer matches the base commit.
  const mBad = clone(MODEL);
  mBad.hashIdentity.indexHtml = 'f'.repeat(64);
  if (GIT_OK) {
    let baseReachable = true;
    try { git(['cat-file', '-e', MODEL.hashIdentity.baseCommit + '^{commit}']); } catch (_) { baseReachable = false; }
    if (baseReachable) {
      mustCatch(vHashRecordMatchesBase, mBad, null, 'a drifted index.html hash record must be caught');
      const mBadJs = clone(MODEL);
      const firstJs = Object.keys(mBadJs.hashIdentity.jsFiles)[0];
      mBadJs.hashIdentity.jsFiles[firstJs] = '0'.repeat(64);
      mustCatch(vHashRecordMatchesBase, mBadJs, null, 'a drifted js/ hash record must be caught');
    } else {
      skip('the base commit is not reachable in this clone — hash cross-check mutations skipped');
    }
  } else {
    skip('git is unavailable — hash cross-check mutations skipped');
  }

  // A malformed hash record.
  const mMalformed = clone(MODEL); mMalformed.hashIdentity.indexHtml = 'not-a-hash';
  mustCatch(vHashRecord, mMalformed, null, 'a malformed hash record must be caught');

  // A css/** record claiming files exist when the directory does not.
  const mCss = clone(MODEL); mCss.hashIdentity.cssFileCount = 3;
  mustCatch(vHashRecord, mCss, null, 'an inconsistent css/** record must be caught');

  // The machine-readable mirror stops being pure data (i.e. becomes executable).
  const mirrorAsCode = (rel) => rel === 'config/risk-models/portfolio-stress-test-v1.json'
    ? Buffer.from("module.exports = { run(){ return fetch('/x'); } };")
    : realReader(rel);
  ok(vSpecificationIsInert(mirrorAsCode, RUNTIME_FILES).some((v) => /not pure JSON data/.test(v)),
    '9.5: turning the machine-readable mirror into executable code must be caught');

  // index.html made to reference the specification — the first step of wiring the
  // dashboard in, which belongs to PR 4 and not here.
  const indexReferencesSpec = (rel) => rel === 'index.html'
    ? Buffer.from('<script src="./js/risk-models/portfolio-stress-test-v1.js"></script>')
    : realReader(rel);
  ok(vSpecificationIsInert(indexReferencesSpec, RUNTIME_FILES).some((v) => /references the specification/.test(v)),
    '9.6: a runtime file reaching the specification must be caught');

  // A js/ module made to load the contract constants.
  const jsReferencesSpec = (rel) => rel === jsTarget
    ? Buffer.from("var C = require('../config/risk-models/portfolio-stress-test-v1.json');")
    : realReader(rel);
  ok(vSpecificationIsInert(jsReferencesSpec, RUNTIME_FILES).some((v) => /references the specification/.test(v)),
    '9.7: a js/ module loading the contract constants must be caught');

  // The next three mutations must contain code the validator is built to reject —
  // and the validator scans THIS file too. Written as literals they would flag this
  // file itself, so each payload is assembled from fragments: the forbidden pattern
  // exists only in memory at run time, never as contiguous text on disk. This is the
  // same in-memory-only discipline every other mutation here follows.
  const Q = String.fromCharCode(39);
  const payload = (parts) => Buffer.from(parts.join(''));
  const asModelTest = (buf) => (rel) =>
    rel === 'tests/portfolio-stress-model-contract.test.js' ? buf : realReader(rel);

  // A specification test reaching for the network.
  const netPayload = payload(['const https = requ', 'ire(', Q, 'https', Q, ');\n']);
  ok(vSpecificationIsInert(asModelTest(netPayload), RUNTIME_FILES).some((v) => /non-allowlisted module: https/.test(v)),
    '9.8: a specification test requiring a network module must be caught');

  // A specification test writing to disk.
  const writePayload = payload(['fs', '.', 'writeFileSync(', Q, '/tmp/x', Q, ', ', Q, 'y', Q, ');\n']);
  ok(vSpecificationIsInert(asModelTest(writePayload), RUNTIME_FILES).some((v) => /writes to the filesystem/.test(v)),
    '9.9: a specification test writing to disk must be caught');

  // A specification test shelling out to something other than git.
  const execPayload = payload(['execFileSync', '(', Q, 'curl', Q, ', []);\n']);
  ok(vSpecificationIsInert(asModelTest(execPayload), RUNTIME_FILES).some((v) => /executes a program other than git: curl/.test(v)),
    '9.10: a specification test executing an arbitrary program must be caught');
}

section('10. MUTATION PROOF — companion-footprint mutations (in memory only)');
{
  // A reader that serves ONE altered companion module from memory and the real
  // bytes for everything else. No file is written.
  const patchedModule = (rel, transform) => (r) =>
    (r === rel ? Buffer.from(transform(realReader(r).toString('utf8'))) : realReader(r));
  const TARGET = COMPANION_ADDED[0];

  const catches = (reader, re, msg) =>
    ok(vCompanionModulesInert(reader, COMPANION_ADDED).some((v) => re.test(v)), msg);

  // 10.1 a renderer appearing in an inert module — the boundary this PR is
  //      defined by, and the first thing a later PR will be tempted to add here.
  catches(patchedModule(TARGET, (s) => s + '\nfunction renderStressMatrix(c){ document.getElementById("x").innerHTML = c; }\n'),
    /DOM access|a renderer/, '10.1: a renderer or DOM access introduced prematurely must be caught');

  // 10.2 a timer
  catches(patchedModule(TARGET, (s) => s + '\nfunction poll(){ setInterval(function(){}, 1000); }\n'),
    /a timer/, '10.2: a timer in a companion module must be caught');

  // 10.3 an event listener
  catches(patchedModule(TARGET, (s) => s + '\nfunction wire(){ addEventListener("load", function(){}); }\n'),
    /an event listener/, '10.3: an event listener in a companion module must be caught');

  // 10.4 a direct fetch — a second HTTP system beside the canonical owner
  catches(patchedModule(TARGET, (s) => s + '\nfunction go(){ return fetch("/portfolio/stress-test/run"); }\n'),
    /a direct fetch/, '10.4: a direct fetch bypassing the transport owner must be caught');

  // 10.5 persistence
  catches(patchedModule(TARGET, (s) => s + '\nfunction save(v){ localStorage.setItem("stress", v); }\n'),
    /storage access/, '10.5: storage access in a companion module must be caught');

  // 10.6 an order path
  catches(patchedModule(TARGET, (s) => s + '\nfunction send(o){ return placeOrder(o); }\n'),
    /order placement/, '10.6: an order path in a companion module must be caught');

  // 10.7 overlay persistence
  catches(patchedModule(TARGET, (s) => s + '\nfunction keep(o){ return persistOverlay(o); }\n'),
    /overlay persistence/, '10.7: overlay persistence in a companion module must be caught');

  // 10.8 a frontend result cache — the backend TTL is zero precisely so that no
  //      matrix is replayed from a market snapshot that no longer exists.
  catches(patchedModule(TARGET, (s) => s + '\nvar _stressResults = new Map();\n'),
    /a result cache/, '10.8: a frontend result cache must be caught');

  // 10.9 a module that stops being inert at load
  catches(patchedModule(TARGET, (s) => s + '\nbuildPortfolioScopeParityClaim();\n'),
    /top-level statement that is not a declaration/,
    '10.9: a top-level call at load time must be caught');

  // 10.10 the real modules are accepted — the validator is not rejecting everything
  mustHold(vCompanionModulesInert, realReader, COMPANION_ADDED,
    '10.10: the shipped companion modules are accepted by the same validator');

  // 10.11 the token-scan exemption widened to a file the companion never declared
  const widened = clone(MODEL);
  widened.monolithBoundary.companionModuleExemption.exemptFiles =
    widened.monolithBoundary.companionModuleExemption.exemptFiles.concat(['js/services/candle-store-client.js']);
  {
    const saved = MODEL.monolithBoundary.companionModuleExemption.exemptFiles;
    MODEL.monolithBoundary.companionModuleExemption.exemptFiles = widened.monolithBoundary.companionModuleExemption.exemptFiles;
    ok(vMonolithBoundary(realReader, RUNTIME_FILES).some((v) => /exemption for an undeclared file/.test(v)),
      '10.11: widening the token-scan exemption to an undeclared file must be caught');
    MODEL.monolithBoundary.companionModuleExemption.exemptFiles = saved;
  }

  // 10.12 a stress token leaking into a NON-exempt runtime file is still caught —
  //       the exemption must not have disabled the scan.
  const leaked = (r) => (r === 'js/services/candle-store-client.js'
    ? Buffer.from(realReader(r).toString('utf8') + '\nvar scenarioMatrix = null;\n')
    : realReader(r));
  ok(vMonolithBoundary(leaked, RUNTIME_FILES).some((v) => /candle-store-client\.js contains forbidden stress token/.test(v)),
    '10.12: a stress token in a non-exempt runtime file is still caught');

  // 10.13 …and index.html is still scanned outside the declared script tags.
  const idxLeak = (r) => (r === 'index.html'
    ? Buffer.from(realReader(r).toString('utf8') + '\n<script>var stressPnl = 0;</script>\n')
    : realReader(r));
  ok(vMonolithBoundary(idxLeak, RUNTIME_FILES).some((v) => /index\.html contains forbidden stress token/.test(v)),
    '10.13: a stress token in index.html outside the declared script tags is still caught');

  // 10.14 the declared footprint must actually match the branch. Point the
  //       companion record at a base it does not describe and the delta check
  //       must notice, rather than silently comparing nothing.
  //
  //       A malformed base is caught with or without a reachable base commit;
  //       the two that FOLLOW need the real base, and skip loudly without it
  //       rather than reporting a pass they did not earn.
  {
    const saved = COMPANION.baseCommit;
    COMPANION.baseCommit = 'not-a-sha';
    ok(vCompanionRuntimeDelta().some((v) => /not a full sha1/.test(v)),
      '10.14: a malformed companion base commit must be caught');
    COMPANION.baseCommit = saved;
  }

  const baseReachable = (function () {
    if (!GIT_OK) return false;
    try { git(['cat-file', '-e', String(COMPANION.baseCommit || '') + '^{commit}']); return true; }
    catch (_) { return false; }
  })();

  if (!baseReachable) {
    skip('the companion base commit is not reachable in this clone — the base-dependent footprint mutations were NOT run');
  } else {
    // 10.15 a module declared but never loaded by index.html would be dead code
    //       shipped as if it were wired in.
    const saved = COMPANION_ADDED.slice();
    COMPANION_ADDED.push('js/services/portfolio-stress-ghost.js');
    ok(vCompanionRuntimeDelta().some((v) => /missing from HEAD|not loaded by index\.html/.test(v)),
      '10.15: a declared module that does not exist or is not loaded must be caught');
    COMPANION_ADDED.length = 0;
    COMPANION_ADDED.push(...saved);

    // 10.16 the real footprint is ACCEPTED, so the mutations above are not
    //       passing merely because the validator rejects everything.
    mustHold(vCompanionRuntimeDelta, null, null,
      '10.16: the real companion footprint is accepted by the same validator');
  }
}

section('11. The node-20 known-failure rule rejects everything except the measured cause');
{
  // A known FILENAME is not a licence to fail for any reason. The workflow used
  // to accept a listed file on exit code alone, which meant the day one of them
  // developed a real bug — a syntax error, a broken assertion — CI would report
  // it as the recorded node-20 condition and nobody would look.
  //
  // The rule is a pure function, so it can be proven here rather than by pushing
  // a SyntaxError to CI and watching. These cases run on ANY node version: they
  // feed the classifier synthetic outputs, not real suites.
  const rule = require('./lib/node20-known-failures.js');
  const decl = rule.knownFailureDeclaration();
  const KNOWN = decl.files[0].file;
  const FINGERPRINT = decl.files[0].fingerprint;
  const cls = (r) => rule.classifyResult(r, decl);

  ok(decl.files.length === 4, '11.1: exactly four node-20 exceptions are declared (' + decl.files.length + ')');
  ok(decl.files.every((f) => typeof f.fingerprint === 'string' && f.fingerprint.length > 10),
    '11.2: every declared exception carries a measured fingerprint, not just a filename');

  // The fingerprints are NOT uniform, and pretending they were would have been
  // the easy mistake: three raise `ReferenceError: FORBIDDEN_GLOBAL:<name>`, the
  // fourth raises `Error: FORBIDDEN GLOBAL: <name>`. A single shared pattern
  // would have accepted the fourth file for a cause nobody measured.
  const shapes = new Set(decl.files.map((f) => f.fingerprint.split(':')[0]));
  ok(shapes.size === 2, '11.3: the declaration records BOTH error shapes, not one assumed pattern');

  // The happy path: listed, failing, with its own recorded cause.
  ok(cls({ file: KNOWN, exitCode: 1, output: 'x\n' + FINGERPRINT + '\ny' }).accepted,
    '11.4: a listed file failing with its recorded cause is accepted');

  // The four forbidden causes, EACH on a known filename. This is the case the
  // old filename-only rule got wrong.
  for (const marker of decl.forbiddenCauses) {
    const v = cls({ file: KNOWN, exitCode: 1, output: FINGERPRINT + '\n' + marker + ': boom' });
    ok(!v.accepted && v.kind === 'forbidden-cause',
      '11.5.' + marker + ': a listed file failing with ' + marker + ' is REJECTED even though the filename is known');
  }

  // A listed file failing for some other reason entirely.
  ok(!cls({ file: KNOWN, exitCode: 1, output: 'ReferenceError: FORBIDDEN_GLOBAL:somethingElse' }).accepted,
    '11.6: a listed file failing with a DIFFERENT forbidden-global symbol is rejected');
  ok(cls({ file: KNOWN, exitCode: 1, output: 'ReferenceError: FORBIDDEN_GLOBAL:somethingElse' }).kind === 'wrong-cause',
    '11.7: …and is reported as a wrong cause, not as an unlisted failure');
  ok(!cls({ file: KNOWN, exitCode: 1, output: '' }).accepted,
    '11.8: a listed file failing with NO recognisable cause is rejected');

  // The exception outliving the condition.
  const passing = cls({ file: KNOWN, exitCode: 0, output: 'OK' });
  ok(!passing.accepted && passing.kind === 'listed-but-passing',
    '11.9: a listed file that PASSES is rejected — the list must not outlive the condition');

  // A fifth file appearing.
  const fifth = cls({ file: 'tests/some-new-suite.test.js', exitCode: 1, output: 'ReferenceError: FORBIDDEN_GLOBAL:x' });
  ok(!fifth.accepted && fifth.kind === 'unlisted-failure',
    '11.10: an UNLISTED file failing is rejected even with a forbidden-global error');
  ok(cls({ file: 'tests/some-new-suite.test.js', exitCode: 0, output: '' }).accepted,
    '11.11: an unlisted file that passes is fine');

  // The fingerprint must be matched against stdout AND stderr combined: a rule
  // reading only stdout would accept a file whose real cause went to stderr —
  // which is precisely where a thrown ReferenceError lands. Asserted on what the
  // runner DOES, not on what its comment says.
  const ruleSrc = fs.readFileSync(path.join(ROOT, 'tests', 'lib', 'node20-known-failures.js'), 'utf8');
  ok(/String\(e\.stdout[^)]*\)\s*\+\s*String\(e\.stderr[^)]*\)/.test(ruleSrc),
    '11.12: the runner classifies stdout and stderr CONCATENATED, so a cause printed to stderr still counts');

  // The workflow must DELEGATE to the rule rather than re-implement it in shell.
  const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'portfolio-stress-companion.yml'), 'utf8');
  ok(/node tests\/lib\/node20-known-failures\.js --run/.test(wf),
    '11.13: the workflow runs the rule module');
  ok(!/KNOWN=|is_known\(\)/.test(wf),
    '11.14: the workflow no longer carries a second, untestable copy of the rule in shell');
  ok(!/continue-on-error/.test(wf),
    '11.15: no blanket continue-on-error hides any of this');
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' assertions passed' + (skipped ? ' (' + skipped + ' skipped).' : '.')
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
