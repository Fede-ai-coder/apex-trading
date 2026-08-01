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
const MUST_BE_REUSED = [
  'portfolio scope', 'open-position filtering', 'active-leg filtering', 'residual quantity',
  'SPY price resolution', 'option-symbol construction', 'option-chain retrieval',
  'option-chain cache', 'quote retrieval', 'Greeks retrieval', 'beta retrieval',
  'VIX retrieval', 'HTTP transport', 'authentication', 'retry/error classification',
];

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
  if (!spy || !/_resolveSpyPrice/.test(String(spy.existingOwner || ''))) {
    out.push('the canonical SPY owner is not _resolveSpyPrice');
  }
  if (m.canonicalSpySource !== 'existing_portfolio_price_resolver') out.push('canonicalSpySource drifted');
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
  ok(decisions.filter((d) => d === 'NEW').length <= 4, '2.6: at most four responsibilities are genuinely new, got ' + decisions.filter((d) => d === 'NEW').length);
  const marketSnapshot = byName(MODEL, 'market snapshot');
  ok(marketSnapshot && marketSnapshot.decision === 'EXTEND',
    '2.7: a partial owner defaults to EXTEND, not NEW (PST-REUSE-007)');
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

section('4. Adoption honesty');
mustHold(vAdoptionHonesty, MODEL, null, '4.1: available-but-unadopted endpoints are not described as part of the current flow');
ok(MD.indexOf('AVAILABLE_NOT_ADOPTED') !== -1, '4.2: the Markdown records the AVAILABLE_NOT_ADOPTED status');

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
  byName(m15, 'market snapshot').existingOwner = null;
  mustCatch(vSingleCanonicalOwner, m15, null, 'an EXTEND decision with no existing owner must be rejected');

  // 6.16 an EXTEND decision with no stated additional capability
  const m16 = clone(MODEL);
  byName(m16, 'market snapshot').extendedCapabilities = [];
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
