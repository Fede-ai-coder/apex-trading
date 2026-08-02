'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS TEST — REUSE CONTRACT (specification only, zero runtime).
//
// WHY THIS FILE EXISTS
//   The governing principle of the STRESS TEST work is:
//
//       REUSE FIRST / EXTEND SECOND / CREATE NEW ONLY AFTER ABSENCE PROOF
//
//   A Reuse Manifest that nothing checks decays into a wish list. This file pins
//   the OWNERSHIP layer of the specification:
//
//     • every responsibility the specification enumerates is classified;
//     • each carries exactly ONE decision from {REUSE, EXTEND, NEW, UNAVAILABLE};
//     • each has exactly ONE canonical owner (or none, precisely when NEW);
//     • every NEW decision resolves to a real ABSENCE PROOF;
//     • every REUSE / EXTEND decision carries definition, callers, tests, units,
//       dependencies and a reason (PST-REUSE-010);
//     • the responsibilities the specification names as non-copyable — portfolio
//       scope, active-leg filtering, residual quantity, SPY resolution, transport,
//       authentication, option-symbol construction, option-chain cache — are all
//       REUSE, never NEW.
//
//   It also runs a SOURCE-LEVEL anti-duplication scan over the REAL application
//   source, reconstructed through tests/lib/load-app-source.js (index.html plus the
//   external local <script> files, in document order — never a hardcoded file list).
//   Each protected responsibility must have exactly ONE top-level definition today,
//   so a future PR that transcribes one under a new name fails here.
//
// MUTATION PROOF
//   Every validator is re-run against a deliberately broken in-memory clone of the
//   model, and the source scanner is re-run against in-memory source strings that
//   contain injected duplicates. Nothing is written to disk; no runtime file is
//   touched; no network call is made.
//
// Run: node tests/portfolio-stress-reuse-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const loader = require('./lib/load-app-source');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'risk-models', 'portfolio-stress-test-v1.md');

// ── tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function section(t) { console.log('\n' + t); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mustHold(validator, model, extra, msg) {
  const v = validator(model, extra);
  return ok(v.length === 0, msg + (v.length ? ' — violations: ' + v.join(' | ') : ''));
}
function mustCatch(validator, model, extra, msg) {
  const v = validator(model, extra);
  return ok(v.length > 0, 'MUTATION NOT CAUGHT: ' + msg);
}

const MODEL = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const MD = fs.readFileSync(MD_PATH, 'utf8');

// The 21 responsibilities the specification requires, in the required order.
const REQUIRED_RESPONSIBILITIES = [
  'portfolio scope', 'open-position filtering', 'active-leg filtering', 'residual quantity',
  'SPY price resolution', 'option-symbol construction', 'option-chain retrieval',
  'option-chain cache', 'quote retrieval', 'Greeks retrieval', 'beta retrieval',
  'VIX retrieval', 'market snapshot', 'HTTP transport', 'authentication',
  'retry/error classification', 'pricing', 'scenario calculation', 'matrix calculation',
  'UI state', 'UI rendering',
];

const DECISIONS = new Set(['REUSE', 'EXTEND', 'NEW', 'UNAVAILABLE']);

// Responsibilities the specification explicitly forbids the future PRs from
// re-implementing. Each MUST be REUSE (never NEW, never a fresh owner).
// 'residual quantity' is deliberately ABSENT: revision 1.1.0 reclassified it EXTEND because
// the backend tier owns only a degenerate version (leg.qty, defaulting to 1). It is still
// non-copyable — MUST_NOT_BE_NEW below covers that — but it is not REUSE.
const MUST_BE_REUSED = [
  'portfolio scope', 'open-position filtering', 'active-leg filtering',
  'SPY price resolution', 'option-symbol construction', 'option-chain retrieval',
  'option-chain cache', 'quote retrieval', 'Greeks retrieval', 'beta retrieval',
  'VIX retrieval', 'market snapshot', 'HTTP transport', 'authentication',
  'retry/error classification',
];

// Nothing in this set may ever be classified NEW: an owner exists in at least one tier, so
// a NEW decision would mean a second implementation.
const MUST_NOT_BE_NEW = MUST_BE_REUSED.concat(['residual quantity', 'UI state']);

function byName(m, name) {
  return (m.reuseManifest || []).find((r) => r.responsibility === name);
}

// ── validators ───────────────────────────────────────────────────────────────

// 1. Every required responsibility appears, exactly once, in the required order.
function vManifestCoverage(m) {
  const out = [];
  const rows = m.reuseManifest || [];
  const names = rows.map((r) => r.responsibility);
  for (const req of REQUIRED_RESPONSIBILITIES) {
    const n = names.filter((x) => x === req).length;
    if (n === 0) out.push('responsibility not classified: ' + req);
    else if (n > 1) out.push('responsibility listed ' + n + ' times: ' + req);
  }
  if (JSON.stringify(names) !== JSON.stringify(REQUIRED_RESPONSIBILITIES)) {
    const extra = names.filter((x) => !REQUIRED_RESPONSIBILITIES.includes(x));
    if (extra.length) out.push('unexpected manifest rows: ' + extra.join(', '));
    else if (names.length === REQUIRED_RESPONSIBILITIES.length) out.push('manifest order differs from the specification');
  }
  return out;
}

// 2. Exactly one decision per responsibility, drawn from the fixed vocabulary.
function vSingleDecision(m) {
  const out = [];
  for (const r of m.reuseManifest || []) {
    if (!DECISIONS.has(r.decision)) {
      out.push(r.responsibility + ' has invalid decision ' + JSON.stringify(r.decision));
    }
  }
  return out;
}

// 3. Exactly one canonical owner (PST-REUSE-002). An owner is present precisely
//    when the decision is REUSE or EXTEND; NEW and UNAVAILABLE carry none.
function vSingleCanonicalOwner(m) {
  const out = [];
  for (const r of m.reuseManifest || []) {
    const hasOwner = r.existingOwner != null && String(r.existingOwner).trim() !== '';
    if (r.decision === 'REUSE' || r.decision === 'EXTEND') {
      if (!hasOwner) out.push(r.responsibility + ' is ' + r.decision + ' but names no owner');
      if (Array.isArray(r.existingOwner)) out.push(r.responsibility + ' names multiple owners as an array');
    } else if (r.decision === 'NEW') {
      if (hasOwner) out.push(r.responsibility + ' is NEW but already names an owner: ' + r.existingOwner);
      if (r.definition != null) out.push(r.responsibility + ' is NEW but points at a definition');
    }
  }
  // No two responsibilities may claim the same definition site — that would be one
  // owner serving two responsibilities under two names.
  const seenDef = new Map();
  for (const r of m.reuseManifest || []) {
    if (!r.definition) continue;
    if (seenDef.has(r.definition)) {
      out.push('definition claimed by two responsibilities: ' + r.definition +
        ' (' + seenDef.get(r.definition) + ', ' + r.responsibility + ')');
    }
    seenDef.set(r.definition, r.responsibility);
  }
  return out;
}

// 4. Every NEW decision resolves to a real absence proof with a NO_CANONICAL_OWNER
//    conclusion (PST-PRICING-005, newOwnerRequiresAbsenceProof).
function vNewRequiresAbsenceProof(m) {
  const out = [];
  const proofs = m.absenceProofs || {};
  const byId = new Map(Object.values(proofs).map((p) => [p.id, p]));
  const rows = (m.reuseManifest || []).concat(m.supplementaryManifest || []);
  for (const r of rows) {
    if (r.decision !== 'NEW') continue;
    const id = r.absenceProofId;
    if (!id) { out.push(r.responsibility + ' is NEW without an absenceProofId'); continue; }
    const proof = byId.get(id);
    if (!proof) { out.push(r.responsibility + ' points at missing absence proof ' + id); continue; }
    if (proof.conclusion !== 'NO_CANONICAL_OWNER') {
      out.push('absence proof ' + id + ' does not conclude NO_CANONICAL_OWNER');
    }
    if (!proof.verdict || !/may be classified `?NEW/i.test(String(proof.verdict))) {
      out.push('absence proof ' + id + ' carries no NEW verdict');
    }
  }
  return out;
}

// 5. The pricing absence proof is the deepest one: it must enumerate the search
//    terms the specification demands and must classify every hit as a non-owner.
function vPricingAbsenceProofDepth(m) {
  const out = [];
  const p = (m.absenceProofs || {}).pricing_engine;
  if (!p) return ['pricing_engine absence proof is missing'];
  const REQUIRED_TERMS = ['black-scholes', 'merton', 'binomial', 'cox-ross', 'theoretical value',
    'implied volatility solver', 'finite difference', 'early exercise', 'american option',
    'european option', 'intrinsic floor', 'discount factor', 'dividend yield'];
  const searched = (p.searchedTerms || []).map((t) => String(t).toLowerCase());
  for (const t of REQUIRED_TERMS) {
    if (!searched.some((s) => s.includes(t.split(' ')[0]))) out.push('pricing search did not cover ' + t);
  }
  const REQUIRED_AXES = ['declaration names', 'call sites', 'endpoint paths', 'log strings',
    'response field names', 'tests', 'cache keys', 'dependency manifests', 'documentation', 'dead code'];
  const axes = p.searchAxes || [];
  for (const a of REQUIRED_AXES) if (!axes.includes(a)) out.push('pricing search axis missing: ' + a);
  const scope = (p.scope || []).join(' ');
  if (!/apex-trading/.test(scope) || !/apex-backend/.test(scope)) {
    out.push('pricing absence proof does not cover both repositories');
  }
  if (!p.dependencyCheck) out.push('pricing absence proof performs no dependency check');
  for (const h of p.hits || []) {
    if (!h.kind) out.push('a pricing hit has no classification');
    if (!h.whyNotAnOwner) out.push('a pricing hit is not explained away: ' + h.location);
    if (h.kind === 'OWNER') out.push('a pricing owner WAS found — decision must be REUSE or EXTEND');
  }
  return out;
}

// 6. PST-REUSE-010 — every REUSE / EXTEND decision carries full evidence.
function vReuseEvidence(m) {
  const out = [];
  for (const r of m.reuseManifest || []) {
    if (r.decision !== 'REUSE' && r.decision !== 'EXTEND') continue;
    const need = ['definition', 'units', 'reason'];
    for (const f of need) {
      if (!r[f] || !String(r[f]).trim()) out.push(r.responsibility + ' (' + r.decision + ') has no ' + f);
    }
    if (!Array.isArray(r.callers) || r.callers.length === 0) {
      out.push(r.responsibility + ' (' + r.decision + ') lists no callers');
    }
    if (!Array.isArray(r.tests) || r.tests.length === 0) {
      out.push(r.responsibility + ' (' + r.decision + ') names no protecting test');
    }
    if (!Array.isArray(r.dependencies)) {
      out.push(r.responsibility + ' (' + r.decision + ') does not declare its dependencies');
    }
    if (!r.errorContract) out.push(r.responsibility + ' (' + r.decision + ') has no error contract');
    if (r.decision === 'EXTEND') {
      if (!r.decisionRationale) out.push(r.responsibility + ' is EXTEND without a rationale');
      if (!Array.isArray(r.extendedCapabilities) || !r.extendedCapabilities.length) {
        out.push(r.responsibility + ' is EXTEND without naming the additional capabilities');
      }
    }
  }
  return out;
}

// 7. The non-copyable responsibilities are all REUSE.
function vNonCopyableAreReused(m) {
  const out = [];
  for (const name of MUST_BE_REUSED) {
    const row = byName(m, name);
    if (!row) { out.push('missing responsibility ' + name); continue; }
    if (row.decision !== 'REUSE') {
      out.push(name + ' must be REUSE but is ' + row.decision);
    }
  }
  for (const name of MUST_NOT_BE_NEW) {
    const row = byName(m, name);
    if (row && row.decision === 'NEW') out.push(name + ' must never be NEW — an owner already exists');
  }
  return out;
}

// 8. The canonical-owner declarations at the top of the model agree with the manifest.
function vCanonicalOwnersAgree(m) {
  const out = [];
  const transport = byName(m, 'HTTP transport');
  if (!transport || !/ttCall/.test(String(transport.existingOwner || ''))) {
    out.push('the canonical transport owner is not ttCall');
  }
  if (m.canonicalTransport !== 'existing_frontend_backend_client') out.push('canonicalTransport drifted');
  const spy = byName(m, 'SPY price resolution');
  if (!spy || !/backend underlying spot resolver/i.test(String(spy.existingOwner || ''))) {
    out.push('the run-authoritative SPY owner is not the backend underlying spot resolver');
  }
  if (!spy || !/^BACKEND/.test(String(spy.runAuthority || ''))) {
    out.push('SPY run authority is not declared BACKEND');
  }
  if (m.canonicalSpySource !== 'backend_run_frozen_spy_from_existing_backend_quote_owner') {
    out.push('canonicalSpySource drifted');
  }
  if (m.canonicalExactContractHydrationOwner !== 'existing_backend_exact_symbol_dxlink_read') {
    out.push('the canonical exact-contract hydration owner drifted');
  }
  const sym = byName(m, 'option-symbol construction');
  if (!sym || !/buildCanonicalOptionSymbol/.test(String(sym.existingOwner || ''))) {
    out.push('the canonical option-symbol owner is not buildCanonicalOptionSymbol');
  }
  const cache = byName(m, 'option-chain cache');
  if (!cache || !/OptionChainCache/.test(String(cache.existingOwner || ''))) {
    out.push('the canonical option-chain cache owner is not OptionChainCache');
  }
  const scope = byName(m, 'portfolio scope');
  if (!scope || !/getOpenPortfolioRiskPositions/.test(String(scope.existingOwner || ''))) {
    out.push('the canonical portfolio-scope owner is not getOpenPortfolioRiskPositions');
  }
  const legs = byName(m, 'active-leg filtering');
  if (!legs || !/isActivePortfolioLeg/.test(String(legs.existingOwner || ''))) {
    out.push('the canonical active-leg owner is not isActivePortfolioLeg');
  }
  return out;
}

// 9. Adoption status is honest: an endpoint the frontend does not call in the
//    default configuration is AVAILABLE_NOT_ADOPTED, not part of the current flow.
function vAdoptionHonesty(m) {
  const out = [];
  const ana = (m.adoption && m.adoption.AVAILABLE_NOT_ADOPTED) || [];
  const fullRefresh = ana.find((e) => e.endpoint === 'POST /portfolio/full-refresh');
  if (!fullRefresh) out.push('/portfolio/full-refresh is not recorded as AVAILABLE_NOT_ADOPTED');
  else {
    if (fullRefresh.status !== 'AVAILABLE_NOT_ADOPTED') out.push('/portfolio/full-refresh status drifted');
    if (!fullRefresh.gate) out.push('/portfolio/full-refresh does not record its feature gate');
    if (!/OFF/.test(String(fullRefresh.gateDefault || ''))) out.push('/portfolio/full-refresh gate default is not recorded as OFF');
    for (const f of ['backendRoute', 'requestSchema', 'responseSchema', 'backendTests', 'frontendCaller', 'fallback']) {
      if (!fullRefresh[f]) out.push('/portfolio/full-refresh reconstruction missing ' + f);
    }
  }
  const adopted = (m.adoption && m.adoption.ADOPTED) || [];
  if (!adopted.some((e) => e.endpoint === 'POST /portfolio/live-refresh')) {
    out.push('the production path /portfolio/live-refresh is not recorded as ADOPTED');
  }
  // An endpoint cannot be in both lists.
  const anaSet = new Set(ana.map((e) => e.endpoint));
  for (const e of adopted) if (anaSet.has(e.endpoint)) out.push('endpoint in both ADOPTED and AVAILABLE_NOT_ADOPTED: ' + e.endpoint);
  return out;
}

// 9b. Declared counts are DERIVED from the manifest, never a preserved target.
function vDerivedCounts(m) {
  const out = [];
  const tally = (rows) => {
    const t = { total: rows.length, REUSE: 0, EXTEND: 0, NEW: 0, UNAVAILABLE: 0 };
    for (const r of rows) if (Object.prototype.hasOwnProperty.call(t, r.decision)) t[r.decision]++;
    return t;
  };
  const mc = m.manifestCounts;
  if (!mc) return ['manifestCounts is missing'];
  const core = tally(m.reuseManifest || []);
  const supp = tally(m.supplementaryManifest || []);
  if (JSON.stringify(core) !== JSON.stringify(mc.core)) {
    out.push('core counts declared ' + JSON.stringify(mc.core) + ' but derived ' + JSON.stringify(core));
  }
  if (JSON.stringify(supp) !== JSON.stringify(mc.supplementary)) {
    out.push('supplementary counts declared ' + JSON.stringify(mc.supplementary) + ' but derived ' + JSON.stringify(supp));
  }
  const combined = {
    total: core.total + supp.total,
    REUSE: core.REUSE + supp.REUSE,
    EXTEND: core.EXTEND + supp.EXTEND,
    NEW: core.NEW + supp.NEW,
    UNAVAILABLE: core.UNAVAILABLE + supp.UNAVAILABLE,
  };
  if (JSON.stringify(combined) !== JSON.stringify(mc.combined)) {
    out.push('combined counts declared ' + JSON.stringify(mc.combined) + ' but derived ' + JSON.stringify(combined));
  }
  return out;
}

// 9c. A responsibility owned in BOTH tiers must name both owners explicitly
//     (PST-REUSE-002), and must not claim a cross-tier call is possible.
const CROSS_TIER_RESPONSIBILITIES = [
  'portfolio scope', 'open-position filtering', 'active-leg filtering',
  'residual quantity', 'SPY price resolution',
];
function vTierOwnership(m) {
  const out = [];
  for (const name of CROSS_TIER_RESPONSIBILITIES) {
    const row = byName(m, name);
    if (!row) { out.push('missing responsibility ' + name); continue; }
    const t = row.tierOwners;
    if (!t) { out.push(name + ' does not declare per-tier owners'); continue; }
    const tiers = Object.keys(t);
    if (tiers.length < 2) out.push(name + ' declares only one tier: ' + tiers.join(','));
    for (const k of tiers) {
      if (!t[k] || !String(t[k]).trim()) out.push(name + ' has an empty owner for tier ' + k);
    }
    if (!row.blocker || !String(row.blocker).trim()) {
      out.push(name + ' does not record the cross-tier reachability blocker');
    }
  }
  // The Portfolio-rule rows must record the divergence risk they carry.
  for (const name of ['open-position filtering', 'active-leg filtering']) {
    const row = byName(m, name);
    if (row && !row.tierDivergenceRisk) out.push(name + ' does not record its cross-tier divergence risk');
  }
  // The contract itself must be tier-aware.
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const r2 = c.get('PST-REUSE-002');
  if (!r2 || !/execution tier/i.test(r2.text)) out.push('PST-REUSE-002 is not tier-aware');
  if (!r2 || !/MUST NOT be claimed/i.test(r2.text)) {
    out.push('PST-REUSE-002 does not forbid claiming a frontend declaration is callable from the backend');
  }
  const a2 = c.get('PST-ACTUAL-002');
  if (!a2 || !/executing tier/i.test(a2.text)) out.push('PST-ACTUAL-002 is not tier-aware');
  return out;
}

// 9d. Dependency lists must not carry the dependencies the audit disproved.
//     This is the manifest-side half of the factual guard; the source-side half
//     lives in tests/portfolio-stress-source-facts.test.js.
function vDisprovenDependencies(m) {
  const out = [];
  const rows = (m.reuseManifest || []).concat(m.supplementaryManifest || []);
  for (const r of rows) {
    const forbidden = r.explicitlyNotADependency || [];
    for (const f of forbidden) {
      if ((r.dependencies || []).includes(f)) {
        out.push(r.responsibility + ' lists a disproven dependency: ' + f);
      }
    }
  }
  const chain = byName(m, 'option-chain retrieval');
  if (chain) {
    if ((chain.dependencies || []).includes('ttFetch')) out.push('option-chain retrieval still depends on ttFetch');
    if (!(chain.explicitlyNotADependency || []).includes('ttFetch')) {
      out.push('option-chain retrieval does not record that ttFetch is NOT a dependency');
    }
    if (!(chain.dependencies || []).some((d) => /getAccessToken/.test(d))) {
      out.push('option-chain retrieval does not record injected getAccessToken');
    }
    if (chain.role !== undefined && !/DISCOVERY/i.test(String(chain.role))) {
      out.push('option-chain retrieval is not marked a discovery owner');
    }
  }
  const cache = byName(m, 'option-chain cache');
  if (cache) {
    if ((cache.dependencies || []).includes('createRequestCoalescer')) {
      out.push('option-chain cache still depends on createRequestCoalescer');
    }
    if (!(cache.explicitlyNotADependency || []).includes('createRequestCoalescer')) {
      out.push('option-chain cache does not record that createRequestCoalescer is NOT a dependency');
    }
    if (!/pending/i.test(String(cache.singleFlightOwner || ''))) {
      out.push('option-chain cache does not name its own pending-Map coalescer');
    }
    const mech = String(cache.revalidationMechanism || '');
    if (/revalidation timer/i.test(mech)) out.push('option-chain cache still describes a revalidation TIMER');
    if (!/promise/i.test(mech)) out.push('option-chain cache does not describe revalidation as a promise');
  }
  // No DESCRIPTIVE field anywhere may say "background revalidation timer".
  //
  // The ban is scoped to descriptions on purpose. The specification legitimately QUOTES the
  // wrong phrasing where it records the correction ("revision 1.0.0 described a 'background
  // revalidation timer'; that was wrong"). Banning the string globally would forbid the
  // document from explaining its own fix, so keys that exist to disavow a claim are skipped.
  const DISAVOWAL_KEY = /CorrectionNote$|^factualCorrections$|^revisionHistory$|^forbiddenPhrases|^notProven$/;
  const walk = (node, key) => {
    if (typeof node === 'string') {
      if (!DISAVOWAL_KEY.test(String(key)) && /background revalidation timer/i.test(node)) {
        out.push('a descriptive field still says "background revalidation timer" (key: ' + key + ')');
      }
      return;
    }
    if (Array.isArray(node)) { for (const v of node) walk(v, key); return; }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (DISAVOWAL_KEY.test(k)) continue;
        walk(v, k);
      }
    }
  };
  walk(m, 'root');
  return out;
}

// 9e. The exact-symbol hydration owner is REUSE and the chain is discovery-only.
function vHydrationOwnership(m) {
  const out = [];
  const sup = m.supplementaryManifest || [];
  const exact = sup.find((r) => r.responsibility === 'exact-contract hydration');
  if (!exact) out.push('exact-contract hydration is not classified');
  else {
    if (exact.decision !== 'REUSE') out.push('exact-contract hydration is ' + exact.decision + ', expected REUSE');
    if (!/PRIMARY/i.test(String(exact.role || ''))) out.push('exact-contract hydration is not marked PRIMARY');
    if (!/readOptionLivePayloadForPortfolio/.test(String(exact.existingOwner || ''))) {
      out.push('exact-contract hydration does not name the real owner');
    }
  }
  const disc = sup.find((r) => r.responsibility === 'option-chain discovery / browsing');
  if (!disc) out.push('option-chain discovery is not classified');
  else if (!/DISCOVERY/i.test(String(disc.role || ''))) out.push('the chain is not marked discovery-only');
  const c = new Map((m.contracts || []).map((x) => [x.id, x]));
  const h1 = c.get('PST-HYDRATION-001');
  if (!h1 || !/MUST NOT be on this path/i.test(h1.text)) {
    out.push('PST-HYDRATION-001 does not remove the chain from the primary path');
  }
  const h6 = c.get('PST-HYDRATION-006');
  if (!h6 || h6.level !== 'MUST NOT') out.push('PST-HYDRATION-006 is not a prohibition');
  return out;
}

// 10. Blockers are documented rather than worked around with a renamed copy.
function vBlockersDocumented(m) {
  const out = [];
  for (const r of m.reuseManifest || []) {
    if (r.decision !== 'REUSE' && r.decision !== 'EXTEND') continue;
    if (!Object.prototype.hasOwnProperty.call(r, 'blocker')) {
      out.push(r.responsibility + ' does not state whether a reuse blocker exists');
    }
  }
  return out;
}

// ── SOURCE-LEVEL ANTI-DUPLICATION SCAN ──────────────────────────────────────
// Reconstruct the REAL application source the way the browser executes it, then
// assert each protected responsibility has exactly ONE top-level definition. A
// future PR that transcribes one under a new name adds a second definition and
// fails here. The scanner takes the source as an argument so the mutation proof
// can feed it a string carrying an injected duplicate.
const PROTECTED_DEFINITIONS = [
  { responsibility: 'portfolio scope', name: 'getOpenPortfolioRiskPositions' },
  { responsibility: 'open-position filtering', name: '_portfolioTradeIsOpenForRisk' },
  { responsibility: 'active-leg filtering', name: 'isActivePortfolioLeg' },
  { responsibility: 'active-leg filtering', name: 'getActivePortfolioLegs' },
  { responsibility: 'residual quantity', name: '_portfolioLegEffectiveQty' },
  { responsibility: 'residual quantity', name: '_portfolioLegExplicitOpenQty' },
  { responsibility: 'SPY price resolution', name: '_resolveSpyPrice' },
  { responsibility: 'SPY price resolution', name: 'resolveFreshSpyPrice' },
  { responsibility: 'SPY price resolution', name: 'resolvePortfolioLivePrice' },
  { responsibility: 'BWD formula', name: 'computeRowBetaWeightedDelta' },
  { responsibility: 'Greeks aggregation', name: 'aggregateGreeks' },
  { responsibility: 'option-symbol construction', name: 'buildCompactOptionDxlinkSymbol' },
  { responsibility: 'option-symbol construction', name: 'buildStreamerSymbol' },
  { responsibility: 'option-symbol construction', name: 'getPreferredOptionDxlinkSymbol' },
  { responsibility: 'HTTP transport', name: 'ttCall' },
  { responsibility: 'authentication', name: '_backendAuthHeaders' },
  { responsibility: 'retry/error classification', name: '_isTransientFetchError' },
];

function countTopLevelDefinitions(src, name) {
  // Matches a top-level `function NAME(` / `async function NAME(` declaration.
  const re = new RegExp('(^|[\\n;])\\s*(async\\s+)?function\\s+' + name.replace(/[$]/g, '\\$') + '\\s*\\(', 'g');
  let n = 0;
  while (re.exec(src) !== null) n++;
  return n;
}

function scanForDuplicateOwners(src) {
  const out = [];
  for (const d of PROTECTED_DEFINITIONS) {
    const n = countTopLevelDefinitions(src, d.name);
    if (n === 0) out.push('canonical owner disappeared: ' + d.name + ' (' + d.responsibility + ')');
    else if (n > 1) out.push('DUPLICATE OWNER: ' + d.name + ' has ' + n + ' definitions (' + d.responsibility + ')');
  }
  return out;
}

// A second option-chain cache, a second SPY resolver or a second active-leg filter
// may also appear under a DIFFERENT name, so a name-only scan is not enough. Each
// shape below matches STRUCTURALLY and is checked against an explicit ALLOWLIST of
// the definitions that exist at the audited base — not against a bare count. An
// allowlist is strictly stronger: adding a new name fails even when an old one is
// removed at the same time, which a count comparison would let through.
//
// Every allowlisted name was individually audited and is a COMPOSED part of one
// canonical owner, never a duplicate:
//   • _resolveSpyPrice ......... pure reader over already-resolved SPY values
//   • resolveFreshSpyPrice ..... freshest-first SPY benchmark cascade with provenance
//     (both are orchestrated together at the single call site in refreshPositionsLive;
//      resolvePortfolioLivePrice runs with allowLiveFetch:false so they never race)
//   • isActivePortfolioLeg ..... the active-leg predicate
//   • _isActivePortfolioLeg .... a one-line alias delegating to the predicate
//   • getActivePortfolioLegs ... the list filter built on the predicate
//   • _portfolioNetGreekFromActiveLegs — a Greek aggregator that CONSUMES the
//     predicate; it is matched by the shape regex but is not a filter
const DUPLICATE_SHAPES = [
  {
    label: 'second SPY resolver',
    re: /function\s+(\w*(?:[Rr]esolve|[Gg]et)\w*Spy\w*Price\w*)\s*\(/g,
    allow: ['_resolveSpyPrice', 'resolveFreshSpyPrice'],
  },
  {
    label: 'second active-leg filter',
    re: /function\s+(\w*[Aa]ctive\w*Leg\w*)\s*\(/g,
    allow: ['isActivePortfolioLeg', '_isActivePortfolioLeg', 'getActivePortfolioLegs', '_portfolioNetGreekFromActiveLegs'],
  },
  {
    label: 'second option-chain cache',
    re: /(?:var|let|const)\s+(\w*[Oo]pt\w*[Cc]hain\w*[Cc]ache\w*)\s*=/g,
    allow: ['_optChainCache'],
  },
  {
    label: 'second option-symbol builder',
    re: /function\s+(build\w*(?:Option|Streamer)\w*Symbol\w*)\s*\(/g,
    allow: ['buildStreamerSymbol', 'buildOptionDxlinkSymbolCandidate', 'buildCompactOptionDxlinkSymbol'],
  },
];

function scanForDuplicateShapes(src) {
  const out = [];
  for (const s of DUPLICATE_SHAPES) {
    const re = new RegExp(s.re.source, s.re.flags);
    const allow = new Set(s.allow);
    const found = new Set();
    let m;
    while ((m = re.exec(src)) !== null) found.add(m[1]);
    for (const name of found) {
      if (!allow.has(name)) out.push(s.label + ': unrecognised definition "' + name + '"');
    }
    for (const name of allow) {
      if (!found.has(name)) out.push(s.label + ': audited definition disappeared: "' + name + '"');
    }
  }
  return out;
}

// The stress client must not introduce a direct fetch or a stress formula in the
// renderer. Neither exists yet — assert the surface is clean and prove the scanner
// can catch a violation.
const STRESS_RUNTIME_LEAKS = [
  { label: 'direct Stress Test fetch outside the canonical client', re: /fetch\s*\([^)]*stress-test/i },
  { label: 'stress formula in the renderer', re: /stressedTheoreticalValue|baseTheoreticalValue|stressedMark/ },
  { label: 'duplicated market-data fallback for stress', re: /stressSpyFallback|stressQuoteFallback|stressGreeksFallback/ },
  { label: 'frontend pricing owner', re: /function\s+\w*(?:blackScholes|priceOption|optionTheoretical)\w*\s*\(/i },
  { label: 'frontend matrix owner', re: /function\s+\w*(?:computeScenarioMatrix|buildStressMatrix)\w*\s*\(/i },
];

function scanForStressLeaks(src) {
  const out = [];
  for (const s of STRESS_RUNTIME_LEAKS) {
    if (s.re.test(src)) out.push('stress runtime leaked into application source: ' + s.label);
  }
  return out;
}

// ── run the contract against the real model and the real source ─────────────
section('1. Reuse Manifest coverage and shape');
mustHold(vManifestCoverage, MODEL, null, '1.1: all 21 required responsibilities are classified, once each, in order');
mustHold(vSingleDecision, MODEL, null, '1.2: every responsibility carries exactly one valid decision');
mustHold(vSingleCanonicalOwner, MODEL, null, '1.3: every responsibility has exactly one canonical owner (PST-REUSE-002)');
ok((MODEL.reuseManifest || []).length === REQUIRED_RESPONSIBILITIES.length,
  '1.4: the manifest has exactly ' + REQUIRED_RESPONSIBILITIES.length + ' rows');

section('2. Decision discipline');
mustHold(vNonCopyableAreReused, MODEL, null, '2.1: every non-copyable responsibility is REUSE');
mustHold(vCanonicalOwnersAgree, MODEL, null, '2.2: the declared canonical owners agree with the manifest');
mustHold(vReuseEvidence, MODEL, null, '2.3: every REUSE/EXTEND carries definition, callers, tests, units, dependencies, reason (PST-REUSE-010)');
mustHold(vBlockersDocumented, MODEL, null, '2.4: every reused owner states whether a blocker exists');
{
  const decisions = (MODEL.reuseManifest || []).map((r) => r.decision);
  ok(decisions.filter((d) => d === 'REUSE').length >= 15, '2.5: the manifest is reuse-dominant, got ' + decisions.filter((d) => d === 'REUSE').length + ' REUSE rows');
  ok(decisions.filter((d) => d === 'NEW').length <= 4, '2.6: at most four core responsibilities are genuinely new, got ' + decisions.filter((d) => d === 'NEW').length);
  const residual = byName(MODEL, 'residual quantity');
  ok(residual && residual.decision === 'EXTEND',
    '2.7: a partial owner defaults to EXTEND, not NEW (PST-REUSE-007) — residual quantity');
  const marketSnapshot = byName(MODEL, 'market snapshot');
  ok(marketSnapshot && marketSnapshot.decision === 'REUSE' && marketSnapshot.portfolioAgnostic === true,
    '2.8: the market snapshot is REUSE and stays portfolio-agnostic');
}

section('3. Absence proofs');
mustHold(vNewRequiresAbsenceProof, MODEL, null, '3.1: every NEW decision resolves to a real absence proof');
mustHold(vPricingAbsenceProofDepth, MODEL, null, '3.2: the pricing absence proof covers every required term, axis and repository');
{
  const p = MODEL.absenceProofs.pricing_engine;
  const dead = (p.hits || []).find((h) => h.kind === 'DEAD_CODE');
  ok(!!dead, '3.3: the dead approxDelta closure is recorded as the only pricing-shaped code');
  ok(dead && /never called|ZERO call sites|no call site/i.test(String(dead.detail || '')),
    '3.4: the dead-code hit records that it has no call site');
  ok(MD.indexOf('ABSENCE PROOF') !== -1, '3.5: the Markdown carries an ABSENCE PROOF section');
  for (const id of Object.values(MODEL.absenceProofs).map((x) => x.id)) {
    ok(MD.indexOf(id) !== -1, '3.6: absence proof ' + id + ' is documented in the Markdown');
  }
}

section('3b. Derived counts, tier ownership and disproven dependencies');
mustHold(vDerivedCounts, MODEL, null, '3b.1: declared counts are derived from the manifest, not a preserved target');
mustHold(vTierOwnership, MODEL, null, '3b.2: cross-tier responsibilities name both owners and record the reachability blocker');
mustHold(vDisprovenDependencies, MODEL, null, '3b.3: no manifest row carries a dependency the audit disproved');
mustHold(vHydrationOwnership, MODEL, null, '3b.4: exact-symbol hydration is the primary owner, the chain is discovery-only');

section('4. Adoption honesty');
mustHold(vAdoptionHonesty, MODEL, null, '4.1: available-but-unadopted endpoints are not described as part of the current flow');
ok(MD.indexOf('AVAILABLE_NOT_ADOPTED') !== -1, '4.2: the Markdown records the AVAILABLE_NOT_ADOPTED status');
{
  const sf = (MODEL.supplementaryManifest || []).find((r) => r.responsibility === 'stress-run single-flight');
  ok(sf && sf.adoptionStatus === 'AVAILABLE_NOT_YET_USED_FOR_THIS',
    '4.3: createRequestCoalescer is recorded as available but not yet used for stress runs');
  ok(sf && /NOT today used by the option-chain cache/i.test(String(sf.constraint || '')),
    '4.4: the record states it is not the option-chain cache coalescer');
}

section('5. Source-level anti-duplication scan (real application source)');
const APP_SRC = loader.loadAppJavaScriptSource();
ok(APP_SRC.length > 100000, '5.0: application source reconstructed via tests/lib/load-app-source.js (' + APP_SRC.length + ' bytes)');
{
  const dup = scanForDuplicateOwners(APP_SRC);
  ok(dup.length === 0, '5.1: every protected responsibility has exactly one definition' + (dup.length ? ' — ' + dup.join(' | ') : ''));
  const shapes = scanForDuplicateShapes(APP_SRC);
  ok(shapes.length === 0, '5.2: no duplicate owner appears under a different name' + (shapes.length ? ' — ' + shapes.join(' | ') : ''));
  const leaks = scanForStressLeaks(APP_SRC);
  ok(leaks.length === 0, '5.3: no stress runtime has leaked into the application source' + (leaks.length ? ' — ' + leaks.join(' | ') : ''));
}

// ── MUTATION PROOF ──────────────────────────────────────────────────────────
section('6. MUTATION PROOF — model mutations (in memory only)');
{
  // 6.1 a responsibility with no owner
  const m1 = clone(MODEL);
  byName(m1, 'portfolio scope').existingOwner = null;
  mustCatch(vSingleCanonicalOwner, m1, null, 'a REUSE responsibility without an owner must be rejected');

  // 6.2 a responsibility with two owners
  const m2 = clone(MODEL);
  byName(m2, 'portfolio scope').existingOwner = ['getOpenPortfolioRiskPositions', 'stressPortfolioScope'];
  mustCatch(vSingleCanonicalOwner, m2, null, 'a responsibility with two owners must be rejected');

  // 6.3 two responsibilities claiming the same definition site
  const m3 = clone(MODEL);
  byName(m3, 'open-position filtering').definition = byName(m3, 'portfolio scope').definition;
  mustCatch(vSingleCanonicalOwner, m3, null, 'one definition serving two responsibilities must be rejected');

  // 6.4 NEW without an absence proof
  const m4 = clone(MODEL);
  delete byName(m4, 'pricing').absenceProofId;
  mustCatch(vNewRequiresAbsenceProof, m4, null, 'a NEW decision without an absence proof must be rejected');

  // 6.5 NEW pointing at a proof that does not exist
  const m5 = clone(MODEL);
  byName(m5, 'scenario calculation').absenceProofId = 'ABSENCE-IMAGINARY';
  mustCatch(vNewRequiresAbsenceProof, m5, null, 'a dangling absence-proof reference must be rejected');

  // 6.6 an absence proof that quietly stops concluding
  const m6 = clone(MODEL);
  m6.absenceProofs.pricing_engine.conclusion = 'PROBABLY_FINE';
  mustCatch(vNewRequiresAbsenceProof, m6, null, 'a weakened absence-proof conclusion must be rejected');

  // 6.7 a pricing owner was actually found but the decision stayed NEW
  const m7 = clone(MODEL);
  m7.absenceProofs.pricing_engine.hits.push({ location: 'lib/pricing.js:1', kind: 'OWNER', detail: 'x', whyNotAnOwner: 'x' });
  mustCatch(vPricingAbsenceProofDepth, m7, null, 'finding a pricing owner while staying NEW must be rejected');

  // 6.8 a shallow pricing search
  const m8 = clone(MODEL);
  m8.absenceProofs.pricing_engine.searchedTerms = ['portfolioStressPrice'];
  mustCatch(vPricingAbsenceProofDepth, m8, null, 'a weak name-only search must be rejected');

  // 6.9 SPY resolution reclassified as NEW (a second resolver)
  const m9 = clone(MODEL);
  const spy = byName(m9, 'SPY price resolution');
  spy.decision = 'NEW'; spy.existingOwner = null; spy.definition = null; spy.absenceProofId = 'ABSENCE-SPY';
  mustCatch(vNonCopyableAreReused, m9, null, 'a second SPY resolver must be rejected');

  // 6.10 active-leg filtering reclassified as NEW
  const m10 = clone(MODEL);
  const legs = byName(m10, 'active-leg filtering');
  legs.decision = 'NEW'; legs.existingOwner = null; legs.definition = null;
  mustCatch(vNonCopyableAreReused, m10, null, 'a second active-leg filter must be rejected');

  // 6.11 a second option-symbol builder
  const m11 = clone(MODEL);
  const sym = byName(m11, 'option-symbol construction');
  sym.decision = 'NEW'; sym.existingOwner = null;
  mustCatch(vNonCopyableAreReused, m11, null, 'a second option-symbol builder must be rejected');

  // 6.12 a second option-chain cache
  const m12 = clone(MODEL);
  const cc = byName(m12, 'option-chain cache');
  cc.decision = 'NEW'; cc.existingOwner = null;
  mustCatch(vNonCopyableAreReused, m12, null, 'a second option-chain cache must be rejected');

  // 6.13 a REUSE decision that names no protecting test
  const m13 = clone(MODEL);
  byName(m13, 'HTTP transport').tests = [];
  mustCatch(vReuseEvidence, m13, null, 'a REUSE decision with no protecting test must be rejected');

  // 6.14 a REUSE decision with no definition
  const m14 = clone(MODEL);
  byName(m14, 'residual quantity').definition = '';
  mustCatch(vReuseEvidence, m14, null, 'a REUSE decision with no definition must be rejected');

  // 6.15 an EXTEND decision that names no existing owner
  const m15 = clone(MODEL);
  byName(m15, 'residual quantity').existingOwner = null;
  mustCatch(vSingleCanonicalOwner, m15, null, 'an EXTEND decision with no existing owner must be rejected');

  // 6.16 an EXTEND decision with no stated additional capability
  const m16 = clone(MODEL);
  byName(m16, 'residual quantity').extendedCapabilities = [];
  mustCatch(vReuseEvidence, m16, null, 'an EXTEND decision that names no added capability must be rejected');

  // 6.17 a responsibility silently dropped from the manifest
  const m17 = clone(MODEL);
  m17.reuseManifest = m17.reuseManifest.filter((r) => r.responsibility !== 'beta retrieval');
  mustCatch(vManifestCoverage, m17, null, 'an unclassified responsibility must be rejected');

  // 6.18 a responsibility classified twice
  const m18 = clone(MODEL);
  m18.reuseManifest.push(clone(byName(m18, 'quote retrieval')));
  mustCatch(vManifestCoverage, m18, null, 'a responsibility classified twice must be rejected');

  // 6.19 an invalid decision value
  const m19 = clone(MODEL);
  byName(m19, 'UI state').decision = 'PROBABLY_REUSE';
  mustCatch(vSingleDecision, m19, null, 'a decision outside the fixed vocabulary must be rejected');

  // 6.20 an unadopted endpoint promoted into the current flow
  const m20 = clone(MODEL);
  m20.adoption.AVAILABLE_NOT_ADOPTED = m20.adoption.AVAILABLE_NOT_ADOPTED
    .filter((e) => e.endpoint !== 'POST /portfolio/full-refresh');
  m20.adoption.ADOPTED.push({ endpoint: 'POST /portfolio/full-refresh', role: 'production' });
  mustCatch(vAdoptionHonesty, m20, null, 'promoting a flag-gated endpoint to ADOPTED must be rejected');

  // 6.21 a blocker quietly deleted
  const m21 = clone(MODEL);
  delete byName(m21, 'SPY price resolution').blocker;
  mustCatch(vBlockersDocumented, m21, null, 'deleting a documented blocker must be rejected');

  // ── revision 1.1.0 mutations ───────────────────────────────────────────────

  // 6.22 fetchOptionChainNested described as depending on the global ttFetch
  const m22 = clone(MODEL);
  byName(m22, 'option-chain retrieval').dependencies.push('ttFetch');
  mustCatch(vDisprovenDependencies, m22, null, 'reintroducing ttFetch as a chain dependency must be rejected');
  const m22b = clone(MODEL);
  byName(m22b, 'option-chain retrieval').explicitlyNotADependency = [];
  mustCatch(vDisprovenDependencies, m22b, null, 'dropping the explicit ttFetch exclusion must be rejected');

  // 6.23 OptionChainCache described as a consumer of createRequestCoalescer
  const m23 = clone(MODEL);
  byName(m23, 'option-chain cache').dependencies.push('createRequestCoalescer');
  mustCatch(vDisprovenDependencies, m23, null, 'attributing the chain cache to createRequestCoalescer must be rejected');
  const m23b = clone(MODEL);
  byName(m23b, 'option-chain cache').singleFlightOwner = 'createRequestCoalescer';
  mustCatch(vDisprovenDependencies, m23b, null, 'renaming the chain cache single-flight owner must be rejected');

  // 6.24 the revalidation timer phrasing creeping back
  const m24 = clone(MODEL);
  byName(m24, 'option-chain cache').revalidationMechanism = 'a background revalidation timer per soft-expired hit';
  mustCatch(vDisprovenDependencies, m24, null, 'describing a background revalidation timer must be rejected');
  // ...and creeping back into any other descriptive field
  const m24b = clone(MODEL);
  byName(m24b, 'option-chain cache').sideEffects = 'module-level Map plus a background revalidation timer';
  mustCatch(vDisprovenDependencies, m24b, null, 'the timer phrasing in any descriptive field must be rejected');

  // 6.25 the nested chain made mandatory for every exact contract
  const m25 = clone(MODEL);
  m25.contracts.find((c) => c.id === 'PST-HYDRATION-001').text =
    'Every exact contract MUST be hydrated through the nested option chain and the chain cache.';
  mustCatch(vHydrationOwnership, m25, null, 'making the nested chain mandatory must be rejected');
  const m25b = clone(MODEL);
  m25b.supplementaryManifest = m25b.supplementaryManifest.filter((r) => r.responsibility !== 'exact-contract hydration');
  mustCatch(vHydrationOwnership, m25b, null, 'deleting the exact-symbol hydration owner must be rejected');

  // 6.26 exact-symbol hydration reclassified NEW (a second hydration path)
  const m26 = clone(MODEL);
  m26.supplementaryManifest.find((r) => r.responsibility === 'exact-contract hydration').decision = 'NEW';
  mustCatch(vHydrationOwnership, m26, null, 'a second exact-symbol hydration owner must be rejected');

  // 6.27 a frontend helper declared directly callable from the backend
  const m27 = clone(MODEL);
  delete byName(m27, 'portfolio scope').tierOwners;
  mustCatch(vTierOwnership, m27, null, 'collapsing the two tiers into one owner must be rejected');
  const m27b = clone(MODEL);
  m27b.contracts.find((c) => c.id === 'PST-REUSE-002').text =
    'Every responsibility MUST have exactly one canonical owner.';
  mustCatch(vTierOwnership, m27b, null, 'a tier-blind single-owner rule must be rejected');

  // 6.28 the cross-tier reachability blocker deleted
  const m28 = clone(MODEL);
  byName(m28, 'active-leg filtering').blocker = '';
  mustCatch(vTierOwnership, m28, null, 'deleting the cross-tier blocker must be rejected');

  // 6.29 the known tier divergence quietly dropped
  const m29 = clone(MODEL);
  delete byName(m29, 'active-leg filtering').tierDivergenceRisk;
  mustCatch(vTierOwnership, m29, null, 'dropping the recorded tier divergence must be rejected');

  // 6.30 market context extended with overlayHash (the 1.0.0 ownership error)
  const m30 = clone(MODEL);
  const ms = byName(m30, 'market snapshot');
  ms.decision = 'EXTEND';
  ms.extendedCapabilities = ['overlayHash', 'positionsHash', 'scenarioHash'];
  mustCatch(vNonCopyableAreReused, m30, null, 'extending the market context with run identity must be rejected');

  // 6.31 counts preserved as a target instead of derived
  const m31 = clone(MODEL);
  m31.manifestCounts.core.REUSE = 16;
  mustCatch(vDerivedCounts, m31, null, 'declared counts that do not match the manifest must be rejected');
  const m31b = clone(MODEL);
  byName(m31b, 'residual quantity').decision = 'REUSE';
  mustCatch(vDerivedCounts, m31b, null, 'changing a decision without recomputing the counts must be rejected');
}

section('7. MUTATION PROOF — source mutations (in memory only)');
{
  // A renamed copy of _resolveSpyPrice.
  const copiedSpy = APP_SRC + '\nfunction _resolveSpyPrice(contextSpyPrice) { return 1; }\n';
  ok(scanForDuplicateOwners(copiedSpy).some((v) => /_resolveSpyPrice/.test(v)),
    '7.1: a copied _resolveSpyPrice must be caught');

  // The same logic under a different name — caught by the shape scan.
  const renamedSpy = APP_SRC + '\nfunction resolveStressSpyPrice(ctx) { return 1; }\n';
  ok(scanForDuplicateShapes(renamedSpy).some((v) => /second SPY resolver/.test(v)),
    '7.2: a renamed SPY resolver must be caught');

  // A copied active-leg filter.
  const copiedLegs = APP_SRC + '\nfunction isActivePortfolioLeg(leg, trade) { return true; }\n';
  ok(scanForDuplicateOwners(copiedLegs).some((v) => /isActivePortfolioLeg/.test(v)),
    '7.3: a copied active-leg filter must be caught');

  // An active-leg filter under a stress-specific name.
  const renamedLegs = APP_SRC + '\nfunction isStressActiveLeg(leg) { return true; }\n'
    + 'function filterActiveLegsForStress(p) { return []; }\n';
  ok(scanForDuplicateShapes(renamedLegs).some((v) => /second active-leg filter/.test(v)),
    '7.4: a renamed active-leg filter must be caught');

  // A second option-symbol builder.
  const secondSymbol = APP_SRC + '\nfunction buildStressOptionSymbol(u, leg) { return null; }\n';
  ok(scanForDuplicateShapes(secondSymbol).some((v) => /second option-symbol builder/.test(v)),
    '7.5: a second option-symbol builder must be caught');

  // A second option-chain cache.
  const secondCache = APP_SRC + '\nvar _stressOptionChainCache = {};\n';
  ok(scanForDuplicateShapes(secondCache).some((v) => /second option-chain cache/.test(v)),
    '7.6: a second option-chain cache must be caught');

  // A direct Stress Test fetch bypassing the canonical transport.
  const directFetch = APP_SRC + "\nasync function runStress(b){ return fetch(BACKEND + '/portfolio/stress-test/run', {method:'POST'}); }\n";
  ok(scanForStressLeaks(directFetch).some((v) => /direct Stress Test fetch/.test(v)),
    '7.7: a direct Stress Test fetch must be caught');

  // A pricing owner in the frontend.
  const fePricing = APP_SRC + '\nfunction blackScholesPrice(s,k,t,v,r){ return 0; }\n';
  ok(scanForStressLeaks(fePricing).some((v) => /frontend pricing owner/.test(v)),
    '7.8: a frontend pricing owner must be caught');

  // A matrix owner in the frontend.
  const feMatrix = APP_SRC + '\nfunction computeScenarioMatrix(scenarios){ return []; }\n';
  ok(scanForStressLeaks(feMatrix).some((v) => /frontend matrix owner/.test(v)),
    '7.9: a frontend matrix owner must be caught');

  // A stress formula inside the renderer.
  const rendererFormula = APP_SRC + '\nfunction renderStressCell(c){ var x = c.stressedTheoreticalValue - c.baseTheoreticalValue; return x; }\n';
  ok(scanForStressLeaks(rendererFormula).some((v) => /stress formula in the renderer/.test(v)),
    '7.10: a stress formula in the renderer must be caught');

  // A duplicated market-data fallback.
  const dupFallback = APP_SRC + '\nfunction stressSpyFallback(){ return 0; }\n';
  ok(scanForStressLeaks(dupFallback).some((v) => /duplicated market-data fallback/.test(v)),
    '7.11: a duplicated market-data fallback must be caught');

  // A canonical owner deleted outright.
  const deleted = APP_SRC.replace(/function\s+_resolveSpyPrice\s*\(/, 'function _resolveSpyPriceRENAMED(');
  ok(scanForDuplicateOwners(deleted).some((v) => /disappeared/.test(v)),
    '7.12: deleting a canonical owner must be caught');
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' assertions passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
