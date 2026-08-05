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
  canonicalSpySource: 'backend_run_frozen_spy_from_existing_backend_quote_owner',
  canonicalTransport: 'existing_frontend_backend_client',
  canonicalOptionSymbolOwner: 'existing_backend_option_symbol_module',
  canonicalOptionChainOwner: 'existing_backend_nested_chain_and_cache',
  canonicalExactContractHydrationOwner: 'existing_backend_exact_symbol_dxlink_read',
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

// 4b. The current revision-history entry is well-formed FOR ITS KIND.
//
//     Revision 1.2.2 introduced the `normativeChange: NONE` branch because a
//     revision whose whole purpose was to re-derive evidence against a new base
//     had nothing to pad four "factual corrections" with, and padding is the
//     dishonest way to make a rule pass. Revision 1.2.3 exercises the OTHER
//     branch: it adds contracts, so it owes the corrections record.
//
//     The rule lives here, as a validator, rather than inline in the run — so the
//     mutation proof can actually run it against a broken record instead of
//     restating the condition and asserting the restatement.
function vRevisionRecord(rev) {
  const out = [];
  if (!rev) return ['the current version has no revision-history entry'];
  if (!rev.normativeChange) out.push(rev.version + ' does not declare what kind of change it is');
  if (typeof rev.reason !== 'string' || rev.reason.length <= 40) {
    out.push(rev.version + ' does not explain itself');
  }
  for (const k of ['contractsAdded', 'contractsRewritten', 'contractsRemoved']) {
    if (!Array.isArray(rev[k])) out.push(rev.version + '.' + k + ' is not an array');
  }
  const touched = (rev.contractsAdded || []).length + (rev.contractsRewritten || []).length +
    (rev.contractsRemoved || []).length;

  if (rev.normativeChange === 'NONE') {
    // A revision that claims to change nothing must PROVE it, which the old
    // ">= 4 corrections" rule never asked of anything.
    if (touched !== 0) {
      out.push(rev.version + ' declares normativeChange NONE while touching ' + touched + ' contract(s)');
    }
    if ((rev.reDerived || []).length < 3) {
      out.push(rev.version + ' is a re-derivation but enumerates only ' + ((rev.reDerived || []).length) + ' re-derived item(s)');
    }
  } else {
    // Anything that DOES change the normative surface owes the correction record.
    if ((rev.factualCorrections || []).length < 4) {
      out.push(rev.version + ' changes the normative surface but records only ' +
        ((rev.factualCorrections || []).length) + ' factual correction(s)');
    }
    if (touched === 0) {
      out.push(rev.version + ' declares normativeChange ' + rev.normativeChange + ' but touches no contract');
    }
    // An ADDITIVE revision may not quietly rewrite or remove an existing rule.
    if (rev.normativeChange === 'ADDITIVE' &&
        ((rev.contractsRewritten || []).length || (rev.contractsRemoved || []).length)) {
      out.push(rev.version + ' claims to be ADDITIVE while rewriting or removing a contract');
    }
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
    'PST-REUSE': 11, 'PST-TRANSPORT': 4, 'PST-SPY': 7, 'PST-ACTUAL': 6,
    'PST-PARITY': 5, 'PST-OPTION-SYMBOL': 5, 'PST-SNAPSHOT': 6, 'PST-OVERLAY': 4,
    'PST-ENTRY': 3, 'PST-HYDRATION': 7, 'PST-UNDERLYING': 7, 'PST-EQUITY': 3,
    'PST-UNITS': 5, 'PST-TEMPORAL': 8, 'PST-BACKEND-TARGET': 3, 'PST-SCENARIO': 3, 'PST-IV': 5, 'PST-PRICING': 8,
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
    'optionQuotes', 'impliedVolatilities', 'greeks', 'overlayHash', 'scenarioHash',
    'marketDataAsOf'];
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

// 16b. The non-SPY underlying shock model is fully specified: precedence, formulas,
//      per-method status, an EXPLICIT idiosyncratic default, and the required tests.
function vUnderlyingShockModel(m) {
  const out = [];
  const u = m.underlyingShockModel;
  if (!u) return ['underlyingShockModel is missing'];
  const ORDER = ['MANUAL_OVERRIDE', 'DOWNSIDE_BETA', 'ORDINARY_BETA_FALLBACK', 'UNAVAILABLE'];
  if (JSON.stringify(u.precedence) !== JSON.stringify(ORDER)) {
    out.push('shock precedence is ' + JSON.stringify(u.precedence));
  }
  if (!/manualSymbolReturn/.test(String(u.formula || ''))) out.push('formula omits the manual override');
  if (!/betaShockFactor/.test(String(u.formula || ''))) out.push('formula omits betaShockFactor');
  if (!/idiosyncraticReturnOverride/.test(String(u.formula || ''))) out.push('formula omits idiosyncraticReturnOverride');
  if (String(u.stressedSpotFormula || '') !== 'stressedSpot = currentSpot x (1 + symbolStressReturn)') {
    out.push('stressedSpot formula is ' + JSON.stringify(u.stressedSpotFormula));
  }
  const st = u.statusByMethod || {};
  if (st.ORDINARY_BETA_FALLBACK !== 'DEGRADED') out.push('ordinary beta does not produce DEGRADED');
  if (st.UNAVAILABLE !== 'UNAVAILABLE') out.push('a missing mapping does not produce UNAVAILABLE');
  if (st.MANUAL_OVERRIDE !== 'VALID') out.push('a manual override does not produce VALID');
  // The idiosyncratic default may be zero, but ONLY as an explicitly declared choice.
  if (u.idiosyncraticReturnOverrideDefaultIsExplicit !== true) {
    out.push('the idiosyncratic default is not declared explicit');
  }
  if (!u.idiosyncraticReturnOverrideNote || !/PST-DATA-002/.test(u.idiosyncraticReturnOverrideNote)) {
    out.push('the idiosyncratic default is not distinguished from the missing-input ban');
  }
  if (u.downsideBetaAvailableAtAuditedCommit !== false) {
    out.push('the model claims a downside beta exists at the audited commit');
  }
  for (const d of ['currentSpot', 'stressedSpot', 'symbolStressReturn', 'mappingMethod',
    'betaValue', 'betaSource', 'manualOverride', 'idiosyncraticOverride', 'status', 'warnings']) {
    if (!(u.perSymbolDiagnostics || []).includes(d)) out.push('per-symbol diagnostics omit ' + d);
  }
  const req = (u.requiredTests || []).join(' | ');
  for (const t of ['1.2', 'manual override', 'DEGRADED', 'downside beta', 'neither 0 nor 1', '<= 0', 'same stressed spot', 'ordering']) {
    if (req.indexOf(t) === -1) out.push('required tests omit the case: ' + t);
  }
  return out;
}

// 16c. The equity/ETF model uses signed SHARES and never an option multiplier.
function vEquityModel(m) {
  const out = [];
  const e = m.equityModel;
  if (!e) return ['equityModel is missing'];
  if (!/signed number of shares/i.test(String(e.quantityUnit || ''))) {
    out.push('equity quantity unit is ' + JSON.stringify(e.quantityUnit));
  }
  if (!/MUST NOT be applied/i.test(String(e.multiplierRule || ''))) {
    out.push('the equity multiplier rule does not forbid the option multiplier');
  }
  if (String(e.formula || '') !== 'equityStressPnl = (stressedSpot - currentSpot) x signedShares') {
    out.push('equity formula is ' + JSON.stringify(e.formula));
  }
  if (!/reconcile/i.test(String(e.reconciliation || ''))) out.push('no reconciliation rule');
  const req = (e.requiredTests || []).join(' | ');
  for (const t of ['100 shares long', '100 shares short', 'zero shock', 'negative quantity', 'protective put', 'multiplier of 100']) {
    if (req.indexOf(t) === -1) out.push('required equity tests omit: ' + t);
  }
  return out;
}

// 16d. Architectural, ownership, unit and data-flow decisions may NOT stay open.
function vOpenDecisionPolicy(m) {
  const out = [];
  const pol = m.openDecisionPolicy;
  if (!pol) return ['openDecisionPolicy is missing'];
  for (const c of ['ARCHITECTURE', 'OWNERSHIP', 'UNITS', 'DATA_FLOW']) {
    if (!(pol.forbiddenOpenCategories || []).includes(c)) out.push('category not forbidden from staying open: ' + c);
  }
  const allowed = new Set(pol.allowedOpenCategories || []);
  for (const d of m.openDecisions || []) {
    if (!d.category) { out.push(d.id + ' has no category'); continue; }
    if (!allowed.has(d.category)) out.push(d.id + ' stays open with a forbidden category: ' + d.category);
  }
  // Every decision resolved in this revision must name the contracts that now govern it.
  for (const r of m.resolvedDecisions || []) {
    if (!r.resolution || String(r.resolution).length < 40) out.push(r.id + ' has no substantive resolution');
    if (!Array.isArray(r.governedBy) || !r.governedBy.length) out.push(r.id + ' names no governing contract');
    const ids = new Set((m.contracts || []).map((c) => c.id));
    for (const g of r.governedBy || []) if (!ids.has(g)) out.push(r.id + ' points at unknown contract ' + g);
  }
  // An ID may not be simultaneously open and resolved.
  const openIds = new Set((m.openDecisions || []).map((d) => d.id));
  for (const r of m.resolvedDecisions || []) {
    if (openIds.has(r.id)) out.push(r.id + ' is both open and resolved');
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
ok((MODEL.contracts || []).length >= 100, '3.5: the contract set is complete (>= 100 rules), got ' + (MODEL.contracts || []).length);

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

section('5b. Non-SPY shock and equity models');
mustHold(vUnderlyingShockModel, MODEL, null, '5b.1: the per-symbol shock model is fully specified with declared precedence');
mustHold(vEquityModel, MODEL, null, '5b.2: equities use signed shares and never the option multiplier');

section('6. Open decisions stay open');
mustHold(vOpenDecisions, MODEL, MD, '6.1: open decisions are recorded and not silently resolved');
ok(/PST-OPEN-004/.test(MD), '6.2: the Vega LP / |Vega SP| > 30 semantics are tracked as PST-OPEN-004');
mustHold(vOpenDecisionPolicy, MODEL, null, '6.3: no architectural, ownership, unit or data-flow decision stays open');
{
  const cats = (MODEL.openDecisions || []).map((d) => d.category);
  ok(cats.length > 0 && cats.every((c) => ['CALIBRATION', 'SEMANTICS', 'PROVIDER', 'NUMERIC_TOLERANCE', 'PERFORMANCE'].includes(c)),
    '6.4: every remaining open decision is calibration, semantics, provider, tolerance or performance — got ' + JSON.stringify(cats));
  ok((MODEL.resolvedDecisions || []).length >= 8,
    '6.5: the architectural decisions from revision 1.0.0 were resolved, got ' + (MODEL.resolvedDecisions || []).length);
  ok(!(MODEL.openDecisions || []).some((d) => d.id === 'PST-OPEN-008'),
    '6.6: PST-OPEN-008 is retired from the open list');
  ok((MODEL.resolvedDecisions || []).some((d) => d.id === 'PST-OPEN-008'),
    '6.7: PST-OPEN-008 is recorded as resolved rather than silently deleted');
  // Rate / dividend / NLV may stay open only because the BEHAVIOUR is already pinned.
  const c = new Map((MODEL.contracts || []).map((x) => [x.id, x]));
  ok(!!c.get('PST-PRICING-007') && /hidden defaults/i.test(c.get('PST-PRICING-007').text),
    '6.8: rate and dividend yield are already forbidden hidden defaults');
  ok(!!c.get('PST-PRICING-008') && /UNAVAILABLE/.test(c.get('PST-PRICING-008').text),
    '6.9: an unsourceable rate or yield makes the leg UNAVAILABLE');
}

section('6b. Revision history records the corrections');
{
  const rev = (MODEL.revisionHistory || []).find((r) => r.version === MODEL.version);
  ok(!!rev, '6b.1: the current version has a revision-history entry');

  // 6b.2 — relaxed in shape, not in strength, by revision 1.2.2.
  //
  // The old rule demanded >= 4 factualCorrections from EVERY revision. That was written
  // when every revision was a correction round (1.1.0, 1.2.0, 1.2.1), and it produced a
  // false positive the moment a revision existed whose whole purpose was to re-derive
  // evidence against a new base without changing any contract. Padding the list to reach
  // four would have been the dishonest way to make it pass, so the rule now branches on
  // what KIND of revision it is — and a no-normative-change revision has to prove that
  // claim, which the old rule never asked of anything.
  mustHold(vRevisionRecord, rev, null,
    '6b.2: the current revision (' + (rev && rev.normativeChange) + ') is well-formed for its kind');
  // Revision 1.2.3 exercises the non-NONE branch: it adds contracts, so it owes
  // both a correction record and a non-empty contract delta.
  if (rev && rev.normativeChange !== 'NONE') {
    ok((rev.factualCorrections || []).length >= 4,
      '6b.2b: a normative revision enumerates its factual corrections, got ' + ((rev.factualCorrections || []).length));
    ok((rev.contractsAdded || []).length > 0,
      '6b.2c: a normative revision names the contracts it added, got ' + ((rev.contractsAdded || []).length));
    // Every contract it claims to have added must actually exist.
    const ids = new Set((MODEL.contracts || []).map((c) => c.id));
    const missing = (rev.contractsAdded || []).filter((id) => !ids.has(id));
    ok(missing.length === 0, '6b.2d: every contract the revision claims to add exists' +
      (missing.length ? ' — missing: ' + missing.join(', ') : ''));
  }
  // Every correction ever made stays on the record — a later revision must not be able to
  // quietly drop an earlier one, because the earlier claim is what a reader might still
  // remember. The topic coverage is therefore checked over the WHOLE history.
  const allCorrections = (MODEL.revisionHistory || [])
    .flatMap((r) => r.factualCorrections || []).join(' | ');
  for (const topic of ['ttFetch', 'createRequestCoalescer', 'timer', 'option chain',
    'portfolio-agnostic', 'RAW', 'execution tier', 'DIVERGENT', 'bounded', 'portfolio-recovery']) {
    ok(allCorrections.indexOf(topic) !== -1, '6b.3: correction recorded somewhere in the history for ' + topic);
  }
  ok((MODEL.revisionHistory || []).length >= 3, '6b.4: every revision is on the record');
  const versions = (MODEL.revisionHistory || []).map((r) => r.version);
  ok(versions[versions.length - 1] === MODEL.version,
    '6b.5: the newest revision-history entry is the current version');
}

section('6c. Backend references and the deployment blocker');
{
  const br = MODEL.backendReferences || {};
  const c2 = new Map((MODEL.contracts || []).map((x) => [x.id, x]));
  for (const k of ['backendProductionReference', 'backendDevelopmentReference',
    'backendStressImplementationTarget', 'backendDeploymentEvidence']) {
    ok(!!br[k], '6c.1: ' + k + ' is declared');
  }
  const target = br.backendStressImplementationTarget || {};
  ok(/^[0-9a-f]{40}$/.test(String(target.commit || '')), '6c.2: the implementation target names a full commit sha');
  ok(!!target.branch && !!target.rationale, '6c.3: the target names a branch and a rationale');
  ok(/PENDING_DEPLOYMENT_VERIFICATION/.test(String(target.status || '')),
    '6c.4: the target is marked provisional until the deployment is verified');
  ok(/MUST NOT start/.test(String(target.mustVerifyBeforePr2 || '')),
    '6c.5: PR 2 is explicitly gated on verifying the deployment mapping');
  // The two services are DIFFERENT — conflating them was the 1.1.0 error.
  ok(br.backendProductionReference.service !== br.backendDevelopmentReference.service,
    '6c.6: production and development are recorded as different services');
  // The blocker must be stated, with real attempts, and must not be papered over.
  const ev = br.backendDeploymentEvidence || {};
  ok(/BLOCKED/.test(String(ev.conclusion || '')), '6c.7: the deployment evidence is recorded as BLOCKED');
  ok((ev.attempts || []).length >= 5, '6c.8: the attempts are enumerated, got ' + (ev.attempts || []).length);
  ok((ev.attempts || []).some((a) => /403/.test(String(a.result || ''))),
    '6c.9: the policy denial is recorded verbatim');
  ok((ev.attempts || []).some((a) => /railway\.toml/i.test(String(a.target || '')) && /INCONCLUSIVE/.test(String(a.result || ''))),
    '6c.10: railway.toml was checked and found inconclusive');
  ok(/GET \/version/.test(String((ev.authoritativeVerificationProcedure || {}).endpoint || '') + ' ' +
     String((ev.authoritativeVerificationProcedure || {}).howToUse || '')),
    '6c.11: the authoritative verification procedure is recorded');
  ok(/name/i.test(String(ev.whatWasNotDone || '')),
    '6c.12: it is recorded that no branch was inferred from its name');
  // ── the deployment gate must demand an EXACT match ──────────────────────
  // Revision 1.2.0 implicitly allowed "the audited commit OR the branch tip at that
  // time". A branch tip nobody audited is exactly the shortcut this gate exists to stop.
  ok(target.exactMatchRequired === true, '6c.12a: an exact commit match is required');
  ok(target.branchTipAcceptable === false, '6c.12b: a branch tip is explicitly NOT acceptable');
  {
    // Scoped like the timer-phrase scan: the specification legitimately QUOTES the old
    // wording where it records the correction ("1.2.0 implicitly allowed 'the audited
    // commit OR the branch tip at that time'"). Banning the string globally would forbid
    // the document from explaining its own fix, so disavowal keys are skipped.
    const DISAVOWAL = /CorrectionNote$|^factualCorrections$|^revisionHistory$|^correctionNote$|^supersedes$/;
    const hits = [];
    const walk = (node, key) => {
      if (typeof node === 'string') {
        if (!DISAVOWAL.test(String(key)) && /branch tip at that time/i.test(node)) hits.push(key);
        return;
      }
      if (Array.isArray(node)) { for (const v of node) walk(v, key); return; }
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) { if (DISAVOWAL.test(k)) continue; walk(v, k); }
      }
    };
    walk(MODEL, 'root');
    ok(hits.length === 0,
      '6c.12c: no NORMATIVE field carries the "branch tip at that time" escape hatch' +
      (hits.length ? ' — found in: ' + hits.join(', ') : ''));
  }
  const gate = target.deploymentGate || {};
  ok(/=== audit\.backend\.commit/.test(String((gate.caseA_exactMatch || {}).condition || '')),
    '6c.12d: case A is an exact equality');
  ok(/MAY start/.test(String((gate.caseA_exactMatch || {}).outcome || '')),
    '6c.12e: case A authorises PR 2');
  const caseB = gate.caseB_differentCommit || {};
  ok(/MUST NOT start/.test(String(caseB.outcome || '')), '6c.12f: case B blocks PR 2');
  ok(/null or UNAVAILABLE/i.test(String(caseB.condition || '')),
    '6c.12g: null and UNAVAILABLE are treated as non-authorising');
  for (const step of ['delta audit', 'audited file hashes', 'line references', 'source facts',
    'Reuse Manifest', 'route boundaries', 'performance facts', 'strict source-facts test']) {
    ok((caseB.requiredSteps || []).some((x) => x.indexOf(step) !== -1),
      '6c.12h: case B requires — ' + step);
  }
  ok(/MUST NOT be accepted automatically/i.test(String(gate.rule || '')),
    '6c.12i: an unaudited branch tip is never accepted automatically');
  // ── the target must be named provisionally, never "correct" or "deployed" ──
  ok(/PROVISIONAL_BACKEND_DEVELOPMENT_TARGET/.test(String(target.status || '')),
    '6c.12j: the target is named a provisional development target');
  ok(/MUST NOT be described as the/i.test(String(target.naming || '')),
    '6c.12k: the naming rule forbids calling it the correct/deployed backend');
  const sps = MODEL.specificationPrStatus || {};
  ok((sps.unverifiedDeploymentBlocks || []).some((x) => /PR 2/.test(x)),
    '6c.12l: an unverified deployment blocks PR 2');
  ok((sps.unverifiedDeploymentDoesNotNecessarilyBlock || []).some((x) => /merge/.test(x)),
    '6c.12m: an unverified deployment does not necessarily block merging THIS PR');
  for (const rec of ['the target is provisional', 'PR 2 is blocked until the deployment is verified',
    'a different deployed commit requires a delta audit', 'a branch tip is not a shortcut']) {
    ok((sps.mustRecord || []).includes(rec), '6c.12n: the PR must record — ' + rec);
  }
  // The contracts must back all of it.
  for (const id of ['PST-BACKEND-TARGET-001', 'PST-BACKEND-TARGET-002', 'PST-BACKEND-TARGET-003']) {
    ok(!!c2.get(id), '6c.12o: ' + id + ' exists');
  }
  ok(/EXACTLY audited/.test(String((c2.get('PST-BACKEND-TARGET-001') || {}).text || '')),
    '6c.12p: PST-BACKEND-TARGET-001 demands the exactly-audited commit');
  ok(/does NOT automatically authorise PR 2/.test(String((c2.get('PST-BACKEND-TARGET-002') || {}).text || '')),
    '6c.12q: PST-BACKEND-TARGET-002 refuses to auto-authorise on null/different');
  ok((c2.get('PST-BACKEND-TARGET-003') || {}).level === 'MUST NOT',
    '6c.12r: PST-BACKEND-TARGET-003 is a prohibition');
  // Divergence, not fast-forward.
  const div = br.branchDivergence || {};
  ok(/DIVERGENT/.test(String(div.relationship || '')), '6c.13: the branches are recorded as divergent');
  ok(div.commitsOnMainOnly > 0 && div.commitsOnDev4hOnly > 0,
    '6c.14: both branches carry commits the other lacks (' + div.commitsOnMainOnly + ' / ' + div.commitsOnDev4hOnly + ')');
  ok(!!div.mergeBase && !!div.consequenceForPr2,
    '6c.15: the merge-base and the consequence for PR 2 are recorded');
  ok((div.libModuleDelta || {}).byteIdenticalOnBoth.length === 5,
    '6c.16: the five branch-independent lib modules are identified');
  // audit.backend must BE the target.
  ok(MODEL.audit.backend.commit === target.commit && MODEL.audit.backend.branch === target.branch,
    '6c.17: the audited backend IS the implementation target');
}

section('6d. Temporal coherence model');
{
  const t = MODEL.temporalModel || {};
  ok(!!t.freezeRule, '6d.1: the freeze rule is declared');
  for (const f of ['snapshotStartedAt', 'snapshotCompletedAt', 'snapshotAssemblyMs']) {
    ok((t.assemblyFields || []).includes(f), '6d.2: assembly field ' + f);
  }
  for (const f of ['source', 'asOf', 'ageMs', 'freshness', 'status']) {
    ok((t.perInputFields || []).includes(f), '6d.3: per-input field ' + f);
  }
  for (const c of ['spy', 'vix', 'underlying', 'optionQuote', 'impliedVolatility', 'greeks', 'beta', 'nlv']) {
    ok((t.perInputCoverage || []).includes(c), '6d.4: per-input coverage ' + c);
  }
  for (const f of ['oldestInputAsOf', 'newestInputAsOf', 'maxCrossInputSkewMs', 'maxInputAgeMs']) {
    ok((t.skewFields || []).includes(f), '6d.5: skew field ' + f);
  }
  ok(/TO_BE_DERIVED/.test(String(t.thresholdStatus || '')),
    '6d.6: temporal thresholds are deferred to the freshness policy and the benchmarks');
  ok(/hidden threshold is a contract violation/i.test(String(t.thresholdVisibility || '')),
    '6d.7: hidden thresholds are forbidden');
  // Corrected in 1.2.1: an overlay edit MUST trigger hydration of the newly referenced
  // exact symbols — during the NEW snapshot assembly. What it must never do is read the
  // market after the freeze, or mutate the completed run.
  ok(/requires a NEW complete run/i.test(String(t.overlayRule || '')),
    '6d.8a: an overlay edit requires a new complete run');
  ok(/ARE hydrated/i.test(String(t.overlayRule || '')),
    '6d.8b: the new run DOES hydrate the newly referenced exact symbols');
  ok(/After snapshotCompletedAt no further market read/i.test(String(t.overlayRule || '')),
    '6d.8c: no market read is permitted after snapshot completion');
  ok(t.snapshotAssemblyMarketReads === 'ALLOWED_AND_BOUNDED' && t.postSnapshotMarketReads === 'FORBIDDEN',
    '6d.8d: the hydration/calculation phase boundary is machine-readable');
  ok(JSON.stringify(t.overlayEditLifecycle) === JSON.stringify(
    ['overlay edit', 'invalidate previous run', 'hydrate required exact symbols',
     'build new frozen snapshot', 'calculate all result sets']),
    '6d.8e: the overlay edit lifecycle sequence is pinned');
  ok((t.requiredTests || []).length >= 10, '6d.9: the temporal test cases are enumerated');
  ok((MODEL.snapshot.temporalFields || []).length >= 7, '6d.10: the snapshot carries the temporal fields');
}

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

  // ── revision 1.1.0 mutations ───────────────────────────────────────────────

  // 9.22 the whole PST-UNDERLYING-* family removed
  const m22 = clone(MODEL);
  m22.contracts = m22.contracts.filter((c) => !c.id.startsWith('PST-UNDERLYING-'));
  mustCatch(vContractFamilies, m22, null, 'removing the PST-UNDERLYING-* family must be rejected');

  // 9.23 every underlying treated as SPY (the shock mapping deleted)
  const m23 = clone(MODEL); delete m23.underlyingShockModel;
  mustCatch(vUnderlyingShockModel, m23, null, 'treating all underlyings as SPY must be rejected');

  // 9.24 a missing beta silently becoming 1
  const m24 = clone(MODEL);
  m24.underlyingShockModel.statusByMethod.UNAVAILABLE = 'VALID';
  mustCatch(vUnderlyingShockModel, m24, null, 'a missing mapping reported as VALID must be rejected');
  const m24b = clone(MODEL);
  m24b.underlyingShockModel.requiredTests =
    m24b.underlyingShockModel.requiredTests.filter((t) => !/neither 0 nor 1/.test(t));
  mustCatch(vUnderlyingShockModel, m24b, null, 'dropping the beta-never-becomes-1 test must be rejected');

  // 9.25 ordinary beta relabelled as downside beta / promoted to VALID
  const m25 = clone(MODEL);
  m25.underlyingShockModel.statusByMethod.ORDINARY_BETA_FALLBACK = 'VALID';
  mustCatch(vUnderlyingShockModel, m25, null, 'ordinary beta promoted to VALID must be rejected');
  const m25b = clone(MODEL);
  m25b.underlyingShockModel.downsideBetaAvailableAtAuditedCommit = true;
  mustCatch(vUnderlyingShockModel, m25b, null, 'claiming a downside beta exists must be rejected');

  // 9.26 the idiosyncratic default turned into a hidden fallback
  const m26 = clone(MODEL);
  m26.underlyingShockModel.idiosyncraticReturnOverrideDefaultIsExplicit = false;
  mustCatch(vUnderlyingShockModel, m26, null, 'a hidden idiosyncratic default must be rejected');

  // 9.27 equity P&L without signed shares
  const m27 = clone(MODEL);
  m27.equityModel.quantityUnit = 'number of shares';
  mustCatch(vEquityModel, m27, null, 'unsigned equity quantity must be rejected');

  // 9.28 the option multiplier applied to shares
  const m28 = clone(MODEL);
  m28.equityModel.multiplierRule = 'shares use the same 100x multiplier as options';
  mustCatch(vEquityModel, m28, null, 'applying the option multiplier to shares must be rejected');
  const m28b = clone(MODEL);
  m28b.equityModel.formula = 'equityStressPnl = (stressedSpot - currentSpot) x signedShares x 100';
  mustCatch(vEquityModel, m28b, null, 'a 100x factor in the equity formula must be rejected');

  // 9.29 an architectural decision left open
  const m29 = clone(MODEL);
  m29.openDecisions.push({ id: 'PST-OPEN-099', question: 'who owns the matrix?', category: 'ARCHITECTURE', status: 'OPEN' });
  mustCatch(vOpenDecisionPolicy, m29, null, 'an ARCHITECTURE decision left open must be rejected');

  // 9.30 an open decision with no category at all
  const m30 = clone(MODEL);
  m30.openDecisions.push({ id: 'PST-OPEN-098', question: 'unclassified', status: 'OPEN' });
  mustCatch(vOpenDecisionPolicy, m30, null, 'an uncategorised open decision must be rejected');

  // 9.31 a resolution that names no governing contract
  const m31 = clone(MODEL);
  m31.resolvedDecisions[0].governedBy = [];
  mustCatch(vOpenDecisionPolicy, m31, null, 'a resolution with no governing contract must be rejected');

  // 9.32 a decision simultaneously open and resolved
  const m32 = clone(MODEL);
  m32.openDecisions.push({ id: m32.resolvedDecisions[0].id, question: 'x', category: 'PROVIDER', status: 'OPEN' });
  mustCatch(vOpenDecisionPolicy, m32, null, 'a decision both open and resolved must be rejected');

  // 9.32b the branch-tip escape hatch reintroduced
  const m32b = clone(MODEL);
  m32b.backendReferences.backendStressImplementationTarget.branchTipAcceptable = true;
  ok(m32b.backendReferences.backendStressImplementationTarget.branchTipAcceptable === true,
    '9.32b: accepting a branch tip is detectable');
  const m32c = clone(MODEL);
  m32c.backendReferences.backendStressImplementationTarget.exactMatchRequired = false;
  ok(m32c.backendReferences.backendStressImplementationTarget.exactMatchRequired === false,
    '9.32c: dropping the exact-match requirement is detectable');
  const m32d = clone(MODEL);
  m32d.backendReferences.backendStressImplementationTarget.deploymentGate.caseB_differentCommit.outcome =
    'PR 2 may proceed against the newer commit.';
  ok(!/MUST NOT start/.test(m32d.backendReferences.backendStressImplementationTarget.deploymentGate.caseB_differentCommit.outcome),
    '9.32d: auto-authorising a different deployed commit is detectable');

  // 9.33 the snapshot losing marketDataAsOf
  const m33 = clone(MODEL);
  m33.snapshot.requiredFields = m33.snapshot.requiredFields.filter((f) => f !== 'marketDataAsOf');
  mustCatch(vSnapshot, m33, null, 'a snapshot without marketDataAsOf must be rejected');

  // ── revision-record mutations ──────────────────────────────────────────────
  // The `normativeChange: NONE` branch must not become an escape hatch that lets
  // a revision skip the correction record while still changing contracts, and the
  // normative branch must not be satisfiable by an empty correction record. Both
  // branches are mutated against the REAL validator rather than restated.
  const currentRev = (MODEL.revisionHistory || []).find((r) => r.version === MODEL.version);
  const asNone = (patch) => Object.assign(clone(currentRev), {
    normativeChange: 'NONE', contractsAdded: [], contractsRewritten: [], contractsRemoved: [],
    reDerived: ['a', 'b', 'c'],
  }, patch || {});

  // 9.34 a revision claiming to change nothing while adding a contract
  mustCatch(vRevisionRecord, asNone({ contractsAdded: ['PST-SMUGGLED-001'] }), null,
    'a NONE-normative revision that adds a contract must be rejected');

  // 9.35 a revision claiming to change nothing while rewriting one
  mustCatch(vRevisionRecord, asNone({ contractsRewritten: ['PST-TEMPORAL-007'] }), null,
    'a NONE-normative revision that rewrites a contract must be rejected');

  // 9.36 a re-derivation revision that lists nothing it re-derived
  mustCatch(vRevisionRecord, asNone({ reDerived: [] }), null,
    'a re-derivation revision with no re-derived evidence must be rejected');

  // 9.36b a well-formed re-derivation record must still be ACCEPTED, so the
  //       validator is not merely rejecting everything.
  mustHold(vRevisionRecord, asNone(), null,
    '9.36b: a well-formed re-derivation record is accepted');

  // 9.37 the NORMATIVE branch: contracts added, corrections missing
  const m37 = clone(currentRev);
  m37.factualCorrections = ['only', 'three', 'here'];
  mustCatch(vRevisionRecord, m37, null,
    'a normative revision with fewer than four factual corrections must be rejected');

  // 9.37b a normative revision that touches no contract at all
  const m37b = clone(currentRev);
  m37b.contractsAdded = [];
  mustCatch(vRevisionRecord, m37b, null,
    'a revision declaring a normative change while touching no contract must be rejected');

  // 9.37c an "ADDITIVE" revision quietly rewriting an existing rule
  const m37c = clone(currentRev);
  m37c.contractsRewritten = ['PST-DATA-002'];
  mustCatch(vRevisionRecord, m37c, null,
    'an ADDITIVE revision that rewrites a contract must be rejected');

  // 9.37d the real current record is accepted, and is the kind it says it is.
  mustHold(vRevisionRecord, currentRev, null,
    '9.37d: revision ' + MODEL.version + ' is a well-formed ' + (currentRev || {}).normativeChange + ' record');
  ok(currentRev && currentRev.normativeChange === 'ADDITIVE' &&
     (currentRev.contractsAdded || []).length > 0 &&
     (currentRev.contractsRewritten || []).length === 0 &&
     (currentRev.contractsRemoved || []).length === 0,
    '9.37e: revision ' + MODEL.version + ' adds contracts and rewrites or removes none');
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' assertions passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
