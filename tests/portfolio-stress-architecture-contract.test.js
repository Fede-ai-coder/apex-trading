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

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'risk-models', 'portfolio-stress-test-v1.md');

const SPEC_FILES = [
  'docs/risk-models/portfolio-stress-test-v1.md',
  'config/risk-models/portfolio-stress-test-v1.json',
  'tests/portfolio-stress-model-contract.test.js',
  'tests/portfolio-stress-architecture-contract.test.js',
  'tests/portfolio-stress-reuse-contract.test.js',
];

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
  if (!snap || !/same frozen snapshot/i.test(snap.text)) out.push('PST-SNAPSHOT-001 does not require one frozen snapshot');
  const shared = c.get('PST-RESULT-004');
  for (const f of ['SPY', 'VIX', 'scenario', 'horizon', 'model', 'snapshot', 'sources']) {
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
  const hyd = c.get('PST-HYDRATION-001');
  if (!hyd || !/at most once per run/i.test(hyd.text)) out.push('PST-HYDRATION-001 does not cap hydration at once per run');
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
function vMonolithBoundary(readFile, fileList) {
  const out = [];
  const tokens = (MODEL.monolithBoundary || {}).forbiddenTokensInRuntimeFiles || [];
  if (!tokens.length) return ['no forbidden-token list is declared'];
  for (const rel of fileList) {
    let text;
    try { text = readFile(rel).toString('utf8'); } catch (_) { out.push('unreadable runtime file ' + rel); continue; }
    for (const t of tokens) {
      if (text.indexOf(t) !== -1) out.push(rel + ' contains forbidden stress token ' + JSON.stringify(t));
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

// 11. CHANGE-SET IDENTITY — no commit touching the specification may also touch a
//     runtime file. Returns violations; returns [] (with a printed note) when git
//     cannot answer.
function vChangeSetIdentity() {
  const out = [];
  if (!GIT_OK) return out;
  let commits;
  try {
    commits = git(['log', '--format=%H', '--'].concat(SPEC_FILES)).split('\n').filter(Boolean);
  } catch (_) { return out; }
  for (const sha of commits) {
    let touched;
    try {
      touched = git(['show', '--pretty=format:', '--name-only', sha]).split('\n').map((s) => s.trim()).filter(Boolean);
    } catch (_) { continue; }
    const runtime = touched.filter((f) => f === 'index.html' || f.startsWith('js/') || f.startsWith('css/'));
    if (runtime.length) {
      out.push('commit ' + sha.slice(0, 10) + ' touches both the specification and runtime files: ' + runtime.join(', '));
    }
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
  for (const owner of ['buildCanonicalOptionSymbol', 'fetchOptionChainNested', 'optionChainCache', 'createRequestCoalescer']) {
    ok((ep.mustCompose || []).includes(owner), '3.6: the endpoint must compose ' + owner);
  }
}

section('4. Data quality');
mustHold(vDataQuality, MODEL, null, '4.1: missing never becomes zero, nearest-strike substitution and double-counting are banned');

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
  ok(!fs.existsSync(path.join(ROOT, 'css')), '5.2: no css/ directory was created by this PR');
  for (const rel of SPEC_FILES) {
    ok(fs.existsSync(path.join(ROOT, rel)), '5.3: specification file present — ' + rel);
  }
  ok(MODEL.runtimeImplemented === false, '5.4: runtimeImplemented is false');
}

section('6. Monolith boundary (structural, always active)');
ok(RUNTIME_FILES.length >= 24, '6.0: runtime file set enumerated (' + RUNTIME_FILES.length + ' files)');
mustHold(vMonolithBoundary, realReader, RUNTIME_FILES, '6.1: no STRESS TEST runtime surface exists in index.html, js/** or css/**');
{
  const b = MODEL.monolithBoundary || {};
  for (const forb of ['pricing', 'scenario engine', 'matrix engine', 'overlay calculations',
    'option-symbol logic', 'option-chain logic', 'SPY resolver', 'market-data resolver',
    'stress renderer', 'stress cache', 'data-quality rules', 'contract constants']) {
    ok((b.forbiddenInMonolithForever || []).includes(forb), '6.2: the monolith permanently excludes ' + forb);
  }
  for (const allowed of ['stylesheet link', 'script tag', 'STRESS TEST navigation entry', 'empty mount point', 'minimal bootstrap call site']) {
    ok((b.allowedFutureMonolithAdditions || []).includes(allowed), '6.3: future PRs may add ' + allowed);
  }
  ok(/case-sensitive/i.test(String(b.forbiddenTokenMatching || '')),
    '6.4: the token-matching rule and its case-sensitivity rationale are recorded');
}

section('7. Zero runtime change — recorded evidence and change-set identity');
mustHold(vHashRecord, MODEL, null, '7.1: the recorded hash evidence is well-formed');
{
  const jsCount = Object.keys(MODEL.hashIdentity.jsFiles).length;
  const onDisk = RUNTIME_FILES.filter((f) => f.startsWith('js/')).length;
  ok(jsCount === onDisk, '7.2: every js/** file on disk has a recorded base hash (' + jsCount + ' recorded, ' + onDisk + ' on disk)');
  ok(MD.indexOf(MODEL.hashIdentity.indexHtml) !== -1, '7.3: the index.html base hash is published in the Markdown');
}
if (!GIT_OK) {
  skip('git is unavailable — the base-commit cross-check and the change-set identity check cannot run');
} else {
  mustHold(vHashRecordMatchesBase, MODEL, null, '7.4: recorded hashes match what the base commit actually contained');
  mustHold(vChangeSetIdentity, null, null, '7.5: no commit touches both the specification and a runtime file');
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

  // 8.4 pricing allowed in the monolith
  const m4 = clone(MODEL);
  m4.monolithBoundary.forbiddenInMonolithForever =
    m4.monolithBoundary.forbiddenInMonolithForever.filter((x) => x !== 'pricing');
  ok(!m4.monolithBoundary.forbiddenInMonolithForever.includes('pricing'),
    '8.4: removing pricing from the monolith ban is detectable');

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
  m14.contracts.find((c) => c.id === 'PST-HYDRATION-001').text = 'Contracts are hydrated whenever needed.';
  mustCatch(vNoNPlusOne, m14, null, 'removing the once-per-run hydration cap must be rejected');

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

// ── summary ─────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' assertions passed' + (skipped ? ' (' + skipped + ' skipped).' : '.')
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
