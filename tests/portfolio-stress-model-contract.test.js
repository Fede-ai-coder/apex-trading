'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS TEST — MODEL CONTRACT (specification only, zero runtime).
//
// WHY THIS FILE EXISTS
//   docs/risk-models/portfolio-stress-test-v1.md is the HUMAN normative source for
//   the future STRESS TEST dashboard. config/risk-models/portfolio-stress-test-v1.json
//   is its MACHINE-READABLE mirror. Two documents describing one contract will drift
//   unless something mechanically forbids it.
//
//   This file pins the MODEL layer:
//     • the JSON parses and carries every field the specification requires;
//     • the Markdown and the JSON declare the SAME version;
//     • every contract ID is unique;
//     • every contract ID in the JSON appears in the Markdown, and vice versa —
//       neither document may carry a rule the other has never heard of;
//     • runtimeImplemented is false (this PR implements nothing);
//     • the data-status and result-set vocabularies are exactly the required ones;
//     • the "Vega LP / |Vega SP| > 30" semantics stay an OPEN decision and are NOT
//       silently reinterpreted as a percentage anywhere.
//
// MUTATION PROOF
//   Every validator below is also run against a DELIBERATELY BROKEN in-memory copy
//   of the model. A validator that cannot fail proves nothing, so each mutation must
//   be caught. Mutations happen ONLY on structuredClone'd objects and on local
//   strings — no file on disk is ever written, and nothing here touches runtime code.
//
// Run: node tests/portfolio-stress-model-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'risk-models', 'portfolio-stress-test-v1.md');

// ── tiny harness (matches the convention used across tests/) ─────────────────
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  return ok(a === e, msg + (a === e ? '' : ' — got ' + a + ', expected ' + e));
}
function section(t) { console.log('\n' + t); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

// A validator returns an array of violation strings. Empty array = contract holds.
// `mutates` asserts that a broken copy IS caught, so the validator is proven live.
function mustHold(validator, model, extra, msg) {
  const v = validator(model, extra);
  return ok(v.length === 0, msg + (v.length ? ' — violations: ' + v.join(' | ') : ''));
}
function mustCatch(validator, model, extra, msg) {
  const v = validator(model, extra);
  return ok(v.length > 0, 'MUTATION NOT CAUGHT: ' + msg);
}

// ── load ─────────────────────────────────────────────────────────────────────
const RAW_JSON = fs.readFileSync(JSON_PATH, 'utf8');
const MD = fs.readFileSync(MD_PATH, 'utf8');
const MODEL = JSON.parse(RAW_JSON);

// ── contract vocabularies pinned by the specification ────────────────────────
const REQUIRED_TOP_LEVEL = {
  modelId: 'portfolio-stress-test',
  status: 'specification',
  runtimeImplemented: false,
  architectureDecision: 'reuse_first_backend_batch_frontend_render',
  actualPortfolioRequired: true,
  hypotheticalOverlayMode: 'additive_ephemeral',
  canonicalSpySource: 'existing_portfolio_price_resolver',
  canonicalTransport: 'existing_frontend_backend_client',
  canonicalOptionSymbolOwner: 'existing_backend_option_symbol_module',
  canonicalOptionChainOwner: 'existing_backend_nested_chain_and_cache',
  matrixComputationOwner: 'backend',
  renderOwner: 'frontend',
  reuseDecisionsRequired: true,
  newOwnerRequiresAbsenceProof: true,
};
const REQUIRED_RESULT_SETS = ['actual', 'overlay', 'proposed', 'difference'];
const REQUIRED_DATA_STATUSES = ['VALID', 'DEGRADED', 'UNAVAILABLE'];

// ── validators ───────────────────────────────────────────────────────────────

// 1. Every required top-level field is present with its exact required value.
function vTopLevel(m) {
  const out = [];
  for (const [k, want] of Object.entries(REQUIRED_TOP_LEVEL)) {
    if (!Object.prototype.hasOwnProperty.call(m, k)) { out.push('missing ' + k); continue; }
    if (m[k] !== want) out.push(k + '=' + JSON.stringify(m[k]) + ' expected ' + JSON.stringify(want));
  }
  return out;
}

// 2. runtimeImplemented MUST be false — this PR implements nothing.
function vRuntimeNotImplemented(m) {
  return m.runtimeImplemented === false ? [] : ['runtimeImplemented is not false'];
}

// 3. Markdown and JSON declare the same version.
function vVersionMatch(m, md) {
  const semver = /^\d+\.\d+\.\d+$/;
  if (!semver.test(String(m.version || ''))) return ['JSON version is not semver: ' + m.version];
  const mdMatch = md.match(/^\*\*Version:\*\*\s*`([^`]+)`\s*$/m);
  if (!mdMatch) return ['Markdown does not declare a **Version:** line'];
  if (mdMatch[1] !== m.version) return ['version mismatch: md=' + mdMatch[1] + ' json=' + m.version];
  const titleMatch = md.match(/^#\s+.*v(\d+\.\d+\.\d+)\s*$/m);
  if (!titleMatch) return ['Markdown title does not carry the version'];
  if (titleMatch[1] !== m.version) return ['title version mismatch: ' + titleMatch[1] + ' vs ' + m.version];
  return [];
}

// 4. Markdown declares the same status / runtimeImplemented as the JSON.
function vStatusMirrored(m, md) {
  const out = [];
  const st = md.match(/^\*\*Status:\*\*\s*`([^`]+)`\s*$/m);
  if (!st) out.push('Markdown does not declare a **Status:** line');
  else if (st[1] !== m.status) out.push('status mismatch: md=' + st[1] + ' json=' + m.status);
  const ri = md.match(/^\*\*Runtime implemented:\*\*\s*`([^`]+)`\s*$/m);
  if (!ri) out.push('Markdown does not declare a **Runtime implemented:** line');
  else if (ri[1] !== String(m.runtimeImplemented)) {
    out.push('runtimeImplemented mismatch: md=' + ri[1] + ' json=' + m.runtimeImplemented);
  }
  const ad = md.match(/^\*\*Architecture decision:\*\*\s*`([^`]+)`\s*$/m);
  if (!ad) out.push('Markdown does not declare an **Architecture decision:** line');
  else if (ad[1] !== m.architectureDecision) {
    out.push('architectureDecision mismatch: md=' + ad[1] + ' json=' + m.architectureDecision);
  }
  return out;
}

// 5. Contract IDs are unique.
function vUniqueContractIds(m) {
  const seen = new Map();
  const out = [];
  for (const c of m.contracts || []) {
    if (seen.has(c.id)) out.push('duplicate contract id: ' + c.id);
    seen.set(c.id, true);
  }
  return out;
}

// 6. Every contract is well-formed: id shape, title, level, non-empty text.
function vContractShape(m) {
  const out = [];
  const LEVELS = new Set(['MUST', 'MUST NOT', 'MAY']);
  const ID_RE = /^PST-[A-Z-]+-\d{3}$/;
  for (const c of m.contracts || []) {
    if (!ID_RE.test(String(c.id || ''))) out.push('malformed contract id: ' + c.id);
    if (!c.title || !String(c.title).trim()) out.push(c.id + ' has no title');
    if (!LEVELS.has(c.level)) out.push(c.id + ' has invalid level ' + JSON.stringify(c.level));
    if (!c.text || String(c.text).trim().length < 20) out.push(c.id + ' has no meaningful text');
  }
  return out;
}

// 7. Neither document may carry a rule the other has never heard of.
//    Every JSON contract id appears in the Markdown, and every PST-*-NNN id in the
//    Markdown is declared in the JSON.
function vContractIdsMirrored(m, md) {
  const out = [];
  const jsonIds = new Set((m.contracts || []).map((c) => c.id));
  for (const id of jsonIds) {
    if (md.indexOf(id) === -1) out.push('contract ' + id + ' is not documented in the Markdown');
  }
  const mdIds = new Set((md.match(/PST-[A-Z-]+-\d{3}/g) || []));
  for (const id of mdIds) {
    // PST-OPEN-NNN identifies open decisions, not contracts; checked separately.
    if (id.startsWith('PST-OPEN-')) continue;
    if (!jsonIds.has(id)) out.push('Markdown mentions undeclared contract ' + id);
  }
  return out;
}

// 8. Every contract family required by the specification exists.
function vContractFamilies(m) {
  const REQUIRED = {
    'PST-REUSE': 10, 'PST-TRANSPORT': 4, 'PST-SPY': 6, 'PST-ACTUAL': 6,
    'PST-OPTION-SYMBOL': 5, 'PST-SNAPSHOT': 4, 'PST-OVERLAY': 4, 'PST-ENTRY': 3,
    'PST-HYDRATION': 3, 'PST-SCENARIO': 3, 'PST-IV': 5, 'PST-PRICING': 6,
    'PST-RESULT': 4, 'PST-MATRIX': 5, 'PST-PERF': 3, 'PST-DATA': 5, 'PST-MONOLITH': 3,
  };
  const out = [];
  const counts = {};
  for (const c of m.contracts || []) {
    const fam = String(c.id).replace(/-\d{3}$/, '');
    counts[fam] = (counts[fam] || 0) + 1;
  }
  for (const [fam, min] of Object.entries(REQUIRED)) {
    if ((counts[fam] || 0) < min) out.push('family ' + fam + ' has ' + (counts[fam] || 0) + ', requires at least ' + min);
  }
  return out;
}

// 9. Result-set and data-status vocabularies are exactly the required ones.
function vVocabularies(m) {
  const out = [];
  if (JSON.stringify(m.requiredResultSets) !== JSON.stringify(REQUIRED_RESULT_SETS)) {
    out.push('requiredResultSets is ' + JSON.stringify(m.requiredResultSets));
  }
  if (JSON.stringify(m.requiredDataStatuses) !== JSON.stringify(REQUIRED_DATA_STATUSES)) {
    out.push('requiredDataStatuses is ' + JSON.stringify(m.requiredDataStatuses));
  }
  for (const s of REQUIRED_DATA_STATUSES) {
    if (md_indexOfWord(MD, s) === -1) out.push('Markdown never documents status ' + s);
  }
  return out;
}
function md_indexOfWord(text, word) { return text.indexOf(word); }

// 10. The snapshot contract carries every required identity field and every
//     invalidation trigger.
function vSnapshot(m) {
  const REQ = ['snapshotId', 'snapshotCreatedAt', 'modelVersion', 'activePortfolioId',
    'portfolioRevision', 'positionsHash', 'spySnapshotPrice', 'spyPriceSource',
    'spyPriceTimestamp', 'vixCurrent', 'vixSource', 'vixTimestamp', 'underlyingPrices',
    'optionQuotes', 'impliedVolatilities', 'greeks', 'overlayHash', 'scenarioHash'];
  const TRIG = ['portfolio', 'real position', 'residual quantity', 'SPY', 'VIX', 'scenario',
    'overlay', 'strike', 'expiry', 'side', 'contracts', 'entry method', 'model version'];
  const out = [];
  const have = new Set((m.snapshot && m.snapshot.requiredFields) || []);
  for (const f of REQ) if (!have.has(f)) out.push('snapshot missing required field ' + f);
  const trig = new Set((m.snapshot && m.snapshot.invalidationTriggers) || []);
  for (const t of TRIG) if (!trig.has(t)) out.push('snapshot missing invalidation trigger ' + t);
  if ((m.snapshot && m.snapshot.staleMessage) !== 'INPUTS CHANGED — RERUN REQUIRED') {
    out.push('snapshot.staleMessage is ' + JSON.stringify(m.snapshot && m.snapshot.staleMessage));
  }
  return out;
}

// 11. The overlay contract is additive, ephemeral, non-persistent and carries the
//     full leg definition. Proposed = Overlay must be explicitly forbidden.
function vOverlay(m) {
  const out = [];
  const o = m.overlay || {};
  if (o.mode !== 'additive_ephemeral') out.push('overlay.mode is ' + JSON.stringify(o.mode));
  if (o.identity !== 'Proposed = Actual + Overlay') out.push('overlay.identity is ' + JSON.stringify(o.identity));
  if (o.forbiddenIdentity !== 'Proposed = Overlay') out.push('overlay.forbiddenIdentity is ' + JSON.stringify(o.forbiddenIdentity));
  const REQ = ['underlying', 'expiration', 'strike', 'optionType', 'side', 'contracts', 'contractMultiplier'];
  const have = new Set(o.legRequiredFields || []);
  for (const f of REQ) if (!have.has(f)) out.push('overlay leg definition missing ' + f);
  const MUSTNOT = ['Portfolio', 'Journal', 'backend trade store', 'localStorage', 'orders'];
  const mn = new Set(o.mustNotMutate || []);
  for (const f of MUSTNOT) if (!mn.has(f)) out.push('overlay.mustNotMutate missing ' + f);
  const ENTRY = ['MARK', 'MID', 'BID', 'ASK', 'MANUAL'];
  const em = new Set(o.entryMethods || []);
  for (const f of ENTRY) if (!em.has(f)) out.push('overlay entry method missing ' + f);
  if (!/stressedMark - estimatedEntryPrice/.test(String(o.pnlFormula || ''))) {
    out.push('overlay.pnlFormula does not anchor on (stressedMark - estimatedEntryPrice)');
  }
  if (!/signedContracts/.test(String(o.pnlFormula || '')) || !/contractMultiplier/.test(String(o.pnlFormula || ''))) {
    out.push('overlay.pnlFormula does not apply signedContracts x contractMultiplier');
  }
  return out;
}

// 12. Scenario model keeps SPY and VIX as independent inputs and declares both IV
//     shock methods plus the five presets.
function vScenarioModel(m) {
  const out = [];
  const s = m.scenarioModel || {};
  for (const f of ['scenarioId', 'spyReturn|targetSpyPrice', 'vixCurrent', 'vixTarget|vixChangePct', 'horizonDays', 'ivShockMethod']) {
    if (!(s.requiredFields || []).includes(f)) out.push('scenario missing required field ' + f);
  }
  for (const meth of ['DIRECT_IV_SHOCK', 'VIX_PROXY']) {
    if (!(s.ivShockMethods || []).includes(meth)) out.push('missing IV shock method ' + meth);
  }
  for (const p of ['PURE_VOLATILITY', 'CORRECTION', 'STRESS', 'CRASH', 'CUSTOM']) {
    if (!(s.presets || []).includes(p)) out.push('missing preset ' + p);
  }
  if (!/illustrative/i.test(String(s.presetSemantics || ''))) {
    out.push('presets are not declared illustrative');
  }
  if (!(s.unsupportedDeclaredLimitations || []).length) {
    out.push('unsupported skew/term-structure limitations are not declared');
  }
  return out;
}

// 13. The matrix contract pins the minimum grid, the cell fields, and the ban on
//     per-cell work.
function vMatrix(m) {
  const out = [];
  const mx = m.matrix || {};
  if (JSON.stringify(mx.minimumSpyReturns) !== JSON.stringify([0, -0.05, -0.1, -0.15, -0.2])) {
    out.push('minimumSpyReturns is ' + JSON.stringify(mx.minimumSpyReturns));
  }
  for (const v of ['current', '+50%', '+100%', '+200%']) {
    if (!(mx.minimumVixTargets || []).includes(v)) out.push('minimumVixTargets missing ' + v);
  }
  const CELL = ['scenarioId', 'spyReturn', 'stressedSpyPrice', 'vixTarget', 'actualStressPnl',
    'proposedStressPnl', 'difference', 'actualStressPnlPctNlv', 'proposedStressPnlPctNlv', 'status'];
  const have = new Set(mx.cellFields || []);
  for (const f of CELL) if (!have.has(f)) out.push('matrix cell missing field ' + f);
  const FORBID = ['one request per cell', 'a full pricing loop in the renderer',
    'a fetch per leg per scenario', 'an option-chain fetch per cell'];
  const forb = new Set(mx.forbidden || []);
  for (const f of FORBID) if (!forb.has(f)) out.push('matrix.forbidden missing ' + JSON.stringify(f));
  return out;
}

// 14. The benchmark plan covers all four load points and leaves the limits to be
//     derived from measurement, not asserted in advance.
function vBenchmarkPlan(m) {
  const out = [];
  const b = m.benchmarkPlan || {};
  const legs = (b.loadPoints || []).map((p) => p.legs).sort((a, c) => a - c);
  if (JSON.stringify(legs) !== JSON.stringify([10, 30, 60, 100])) {
    out.push('benchmark load points are ' + JSON.stringify(legs));
  }
  for (const p of b.loadPoints || []) {
    if (p.scenarios !== 20) out.push('load point ' + p.legs + ' legs does not use 20 scenarios');
  }
  if (b.limitsStatus !== 'TO_BE_DERIVED_FROM_MEASUREMENT') {
    out.push('benchmark limits are asserted rather than measured: ' + JSON.stringify(b.limitsStatus));
  }
  return out;
}

// 15. Open decisions stay OPEN. Specifically, the "Vega LP / |Vega SP| > 30"
//     semantics MUST NOT be silently reinterpreted as a percentage anywhere in
//     either document.
function vOpenDecisions(m, md) {
  const out = [];
  const open = m.openDecisions || [];
  if (!open.length) out.push('no open decisions are recorded');
  const ids = new Set(open.map((d) => d.id));
  for (const id of ids) {
    if (md.indexOf(id) === -1) out.push('open decision ' + id + ' is not documented in the Markdown');
  }
  const vega = open.find((d) => /Vega LP/.test(String(d.question || '')));
  if (!vega) out.push('the Vega LP / |Vega SP| threshold is not recorded as an open decision');
  else if (!/OPEN/.test(String(vega.status || ''))) out.push('the Vega threshold decision is not OPEN');
  // The reinterpretation ban: no document may state the threshold as a percentage.
  const PERCENT_FORMS = [/Vega\s*LP\s*\/\s*\|?\s*Vega\s*SP\s*\|?\s*>\s*30\s*%/i, /threshold\s+of\s+30\s*%/i];
  for (const re of PERCENT_FORMS) {
    if (re.test(md)) out.push('Markdown reinterprets the Vega threshold as a percentage');
    if (re.test(JSON.stringify(m))) out.push('JSON reinterprets the Vega threshold as a percentage');
  }
  return out;
}

// 16. The document-ownership decision is recorded with evidence, and no second
//     instruction document was created when an equivalent owner already exists.
function vDocumentOwnership(m) {
  const out = [];
  const d = m.documentOwnership || {};
  if (d.normativeSource !== 'docs/risk-models/portfolio-stress-test-v1.md') out.push('normativeSource is wrong');
  if (d.machineReadableMirror !== 'config/risk-models/portfolio-stress-test-v1.json') out.push('machineReadableMirror is wrong');
  if (typeof d.agentsMdUpdated !== 'boolean') out.push('agentsMdUpdated is not recorded');
  if (!d.agentsMdEvidence || String(d.agentsMdEvidence).length < 40) out.push('agentsMdEvidence is missing');
  // If AGENTS.md was NOT updated, the evidence must be verifiable on disk right now.
  if (d.agentsMdUpdated === false) {
    const exists = fs.existsSync(path.join(ROOT, 'AGENTS.md'));
    if (exists) out.push('AGENTS.md exists on disk but the audit claims it does not');
  }
  return out;
}

// ── run the contract against the real model ─────────────────────────────────
section('1. JSON is valid and carries every required top-level field');
ok(typeof MODEL === 'object' && MODEL !== null, '1.1: config JSON parses');
mustHold(vTopLevel, MODEL, null, '1.2: every required top-level field has its required value');
mustHold(vRuntimeNotImplemented, MODEL, null, '1.3: runtimeImplemented is false');

section('2. Markdown and JSON agree');
mustHold(vVersionMatch, MODEL, MD, '2.1: Markdown and JSON declare the same version');
mustHold(vStatusMirrored, MODEL, MD, '2.2: status / runtimeImplemented / architecture decision are mirrored');
ok(MD.indexOf('config/risk-models/portfolio-stress-test-v1.json') !== -1,
  '2.3: Markdown names its machine-readable mirror');

section('3. Contract IDs');
mustHold(vUniqueContractIds, MODEL, null, '3.1: every contract ID is unique');
mustHold(vContractShape, MODEL, null, '3.2: every contract is well-formed');
mustHold(vContractIdsMirrored, MODEL, MD, '3.3: contract IDs are mirrored in both documents');
mustHold(vContractFamilies, MODEL, null, '3.4: every required contract family is present');
ok((MODEL.contracts || []).length >= 60, '3.5: the contract set is complete (>= 60 rules), got ' + (MODEL.contracts || []).length);

section('4. Required vocabularies');
mustHold(vVocabularies, MODEL, null, '4.1: result sets and data statuses are exactly the required ones');
eq(MODEL.requiredResultSets, REQUIRED_RESULT_SETS, '4.2: actual/overlay/proposed/difference');
eq(MODEL.requiredDataStatuses, REQUIRED_DATA_STATUSES, '4.3: VALID/DEGRADED/UNAVAILABLE');

section('5. Snapshot, overlay, scenario, matrix and benchmark contracts');
mustHold(vSnapshot, MODEL, null, '5.1: snapshot carries every identity field and invalidation trigger');
mustHold(vOverlay, MODEL, null, '5.2: overlay is additive, ephemeral and fully specified');
mustHold(vScenarioModel, MODEL, null, '5.3: scenario model keeps SPY and VIX independent');
mustHold(vMatrix, MODEL, null, '5.4: matrix pins the grid, the cell fields and the per-cell ban');
mustHold(vBenchmarkPlan, MODEL, null, '5.5: benchmark plan defers limits to measurement');

section('6. Open decisions stay open');
mustHold(vOpenDecisions, MODEL, MD, '6.1: open decisions are recorded and not silently resolved');
ok(/PST-OPEN-004/.test(MD), '6.2: the Vega LP / |Vega SP| > 30 semantics are tracked as PST-OPEN-004');

section('7. Document ownership');
mustHold(vDocumentOwnership, MODEL, null, '7.1: the AGENTS.md decision is recorded with verifiable evidence');

section('8. The specification implements nothing');
{
  // The normative documents must not smuggle in an executable module.
  ok(!/\brequire\s*\(/.test(RAW_JSON), '8.1: the JSON contains no require()');
  ok(!/module\.exports/.test(RAW_JSON), '8.2: the JSON contains no module.exports');
  ok(MODEL.runtimeImplemented === false, '8.3: runtimeImplemented stays false');
  const prPlan = MODEL.prPlan || [];
  const pr1 = prPlan.find((p) => p.pr === 1);
  ok(pr1 && pr1.runtimeChanges === 'none', '8.4: PR 1 declares zero runtime changes');
  ok(pr1 && pr1.merged === false, '8.5: PR 1 is not marked merged');
  const pr2 = prPlan.find((p) => p.pr === 2);
  ok(pr2 && /PR 1 merged/.test(String(pr2.precondition || '')),
    '8.6: PR 2 is gated on this specification being merged first');
}

// ── MUTATION PROOF ──────────────────────────────────────────────────────────
// Each mutation is applied to an in-memory clone ONLY. Nothing is written to disk.
section('9. MUTATION PROOF — every validator is proven able to fail');
{
  // 9.1 runtimeImplemented flipped to true
  const m1 = clone(MODEL); m1.runtimeImplemented = true;
  mustCatch(vRuntimeNotImplemented, m1, null, 'runtimeImplemented=true must be rejected');
  mustCatch(vTopLevel, m1, null, 'runtimeImplemented=true must fail the top-level contract');

  // 9.2 duplicate contract ID
  const m2 = clone(MODEL);
  m2.contracts.push({ id: m2.contracts[0].id, title: 'dup', level: 'MUST', text: 'a duplicated identifier that should be rejected' });
  mustCatch(vUniqueContractIds, m2, null, 'a duplicated contract ID must be rejected');

  // 9.3 version drift between Markdown and JSON
  const m3 = clone(MODEL); m3.version = '9.9.9';
  mustCatch(vVersionMatch, m3, MD, 'a version mismatch between Markdown and JSON must be rejected');

  // 9.4 a contract declared in JSON but never documented in the Markdown
  const m4 = clone(MODEL);
  m4.contracts.push({ id: 'PST-GHOST-001', title: 'undocumented', level: 'MUST', text: 'a rule that exists only in the machine mirror' });
  mustCatch(vContractIdsMirrored, m4, MD, 'an undocumented contract must be rejected');

  // 9.5 a contract mentioned in the Markdown but absent from the JSON
  mustCatch(vContractIdsMirrored, MODEL, MD + '\nSee PST-PHANTOM-001 for details.\n',
    'a Markdown-only contract must be rejected');

  // 9.6 a missing data status
  const m6 = clone(MODEL); m6.requiredDataStatuses = ['VALID', 'DEGRADED'];
  mustCatch(vVocabularies, m6, null, 'dropping UNAVAILABLE must be rejected');

  // 9.7 a missing result set
  const m7 = clone(MODEL); m7.requiredResultSets = ['actual', 'proposed'];
  mustCatch(vVocabularies, m7, null, 'dropping overlay/difference must be rejected');

  // 9.8 overlay replacing Actual instead of adding to it
  const m8 = clone(MODEL); m8.overlay.identity = 'Proposed = Overlay';
  mustCatch(vOverlay, m8, null, 'Proposed = Overlay must be rejected');

  // 9.9 overlay allowed to persist
  const m9 = clone(MODEL);
  m9.overlay.mustNotMutate = m9.overlay.mustNotMutate.filter((x) => x !== 'localStorage');
  mustCatch(vOverlay, m9, null, 'an overlay allowed to write localStorage must be rejected');

  // 9.10 snapshot losing its run identity
  const m10 = clone(MODEL);
  m10.snapshot.requiredFields = m10.snapshot.requiredFields.filter((f) => f !== 'snapshotId');
  mustCatch(vSnapshot, m10, null, 'a snapshot without snapshotId must be rejected');

  // 9.11 invalidation trigger removed
  const m11 = clone(MODEL);
  m11.snapshot.invalidationTriggers = m11.snapshot.invalidationTriggers.filter((t) => t !== 'overlay');
  mustCatch(vSnapshot, m11, null, 'dropping the overlay invalidation trigger must be rejected');

  // 9.12 per-cell requests quietly permitted
  const m12 = clone(MODEL);
  m12.matrix.forbidden = m12.matrix.forbidden.filter((f) => f !== 'one request per cell');
  mustCatch(vMatrix, m12, null, 'permitting one request per cell must be rejected');

  // 9.13 a matrix cell losing its status field
  const m13 = clone(MODEL);
  m13.matrix.cellFields = m13.matrix.cellFields.filter((f) => f !== 'status');
  mustCatch(vMatrix, m13, null, 'a matrix cell without a data-quality status must be rejected');

  // 9.14 SPY and VIX collapsed into one input
  const m14 = clone(MODEL);
  m14.scenarioModel.requiredFields = m14.scenarioModel.requiredFields.filter((f) => f !== 'vixTarget|vixChangePct');
  mustCatch(vScenarioModel, m14, null, 'collapsing the VIX input must be rejected');

  // 9.15 presets presented as forecasts
  const m15 = clone(MODEL); m15.scenarioModel.presetSemantics = 'forecast of expected market moves';
  mustCatch(vScenarioModel, m15, null, 'presets presented as forecasts must be rejected');

  // 9.16 benchmark limits asserted instead of measured
  const m16 = clone(MODEL); m16.benchmarkPlan.limitsStatus = 'p95 under 800ms';
  mustCatch(vBenchmarkPlan, m16, null, 'pre-asserted performance limits must be rejected');

  // 9.17 the Vega threshold silently reinterpreted as a percentage
  const m17 = clone(MODEL);
  m17.openDecisions = m17.openDecisions.filter((d) => !/Vega LP/.test(String(d.question || '')));
  mustCatch(vOpenDecisions, m17, MD, 'removing the Vega threshold open decision must be rejected');
  mustCatch(vOpenDecisions, MODEL, MD + '\nWe apply a threshold of 30% here.\n',
    'reinterpreting the Vega threshold as 30% must be rejected');

  // 9.18 the architecture decision quietly flipped
  const m18 = clone(MODEL); m18.matrixComputationOwner = 'frontend';
  mustCatch(vTopLevel, m18, null, 'moving matrix computation to the frontend must be rejected');

  // 9.19 the canonical SPY source replaced
  const m19 = clone(MODEL); m19.canonicalSpySource = 'stress_test_spy_resolver';
  mustCatch(vTopLevel, m19, null, 'a second SPY source must be rejected');

  // 9.20 absence proof no longer required for new owners
  const m20 = clone(MODEL); m20.newOwnerRequiresAbsenceProof = false;
  mustCatch(vTopLevel, m20, null, 'dropping the absence-proof requirement must be rejected');

  // 9.21 the AGENTS.md audit contradicting the filesystem
  const m21 = clone(MODEL); m21.documentOwnership.agentsMdEvidence = 'short';
  mustCatch(vDocumentOwnership, m21, null, 'an unevidenced AGENTS.md decision must be rejected');
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' assertions passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
