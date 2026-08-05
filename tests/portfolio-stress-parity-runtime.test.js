'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO SCOPE PARITY — RUNTIME contract (PST-PARITY-RUNTIME-001..005).
//
// WHY THIS FILE EXISTS
//   The other four Stress suites check a DOCUMENT. This one runs the REAL
//   frontend scope owners over the REAL backend fixture manifest and compares
//   the outcome, field by field, with the outcome the backend recorded.
//
//   That distinction is the whole value. A specification can say the two tiers
//   agree about what a portfolio contains; only an execution can show it. The
//   backend half of this contract is
//   apex-backend tests/portfolio-scope-parity.test.js at commit 7027f0c; this is
//   the frontend half, and the fixtures are the same bytes.
//
// WHAT IS DELIBERATELY NOT DONE HERE
//   No second scope owner is defined to make the comparison pass. Every answer
//   comes from the functions the Portfolio itself uses —
//   _portfolioTradeIsOpenForRisk, _isTerminalPortfolioLeg,
//   _portfolioLegHasCloseMarker, _portfolioLegHasExplicitOpenQty and
//   _portfolioLegEffectiveQty — extracted from the real application source. A
//   parallel implementation would pass this suite and prove nothing about the
//   application, which is the one thing the suite exists to prove.
//
// THE TWO HASHES
//   They are different values with different jobs and are both checked:
//     manifest IDENTITY hash  sha256 over the canonical JSON of `fixtures` only.
//                             This is what the two tiers exchange.
//     file-content sha256     sha256 over the whole file. This proves the copy
//                             in this repository was not edited.
//   A test that checked only one would let an edited manifest keep a matching
//   identity, or let a byte-identical copy carry a stale identity.
//
// MUTATION PROOF
//   Every checker is re-run against deliberately broken in-memory inputs. All
//   mutations are in memory; no file is written and no network is touched.
//
// Run: node tests/portfolio-stress-parity-runtime.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const loader = require('./lib/load-app-source.js');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'contracts', 'portfolio-scope-parity-manifest.json');
const PARITY_MODULE_PATH = path.join(ROOT, 'js', 'services', 'portfolio-stress-parity.js');

// ── tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function section(t) { console.log('\n' + t); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// The canonical JSON serialization the backend hashes the fixtures with
// (lib/portfolio-stress-snapshot.js stableStringify): object keys sorted, array
// order preserved. Reimplemented here rather than imported, so the frontend
// arrives at the hash independently instead of trusting the value it is checking.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(
    (k) => JSON.stringify(k) + ':' + stableStringify(value[k])
  ).join(',') + '}';
}

const MANIFEST_BYTES = fs.readFileSync(MANIFEST_PATH);
const MANIFEST = JSON.parse(MANIFEST_BYTES.toString('utf8'));

// ── the real owners, in a sandbox ────────────────────────────────────────────
// The scope owners still live in index.html; the parity module is loaded from
// its own file. Both are executed in ONE context so the module resolves the
// owners exactly as the browser does — lexically, at call time.
const APP_SRC = loader.loadAppJavaScriptSource();
const OWNER_FNS = [
  '_portfolioTradeIsOpenForRisk',
  '_portfolioLegStatusForRisk',
  '_portfolioQuantityFieldPresent',
  '_portfolioStrictQuantity',
  '_portfolioReadQuantityField',
  '_portfolioResidualQuantityFields',
  '_portfolioGrossQuantityFields',
  '_portfolioLegCloseMarkerFields',
  '_portfolioResolveLegQuantity',
  '_portfolioLegExplicitOpenQty',
  '_portfolioLegHasExplicitOpenQty',
  '_portfolioLegEffectiveQty',
  '_portfolioLegHasCloseMarker',
  '_isTerminalPortfolioLeg',
];

const sandbox = { console };
vm.createContext(sandbox);
for (const name of OWNER_FNS) {
  vm.runInContext(loader.extractFunctionSource(name, { source: APP_SRC }), sandbox);
}
vm.runInContext(fs.readFileSync(PARITY_MODULE_PATH, 'utf8'), sandbox);

const call = (expr, vars) => {
  Object.assign(sandbox, vars || {});
  return vm.runInContext(expr, sandbox);
};

// ── what the two tiers must agree on ─────────────────────────────────────────
// Revision 2.0.0 pinned quantitySource, positionSide and terminalReason in an
// EXTENDED table right here, because the manifest carried no field for them.
// That made THIS FILE the authority for what the BACKEND produces — the same
// cross-tier divergence the manifest exists to prevent, one layer up. The table
// is gone. Manifest 2.1.0 generates every expected block from the backend
// owners, and this suite compares against the artefact rather than against a
// second opinion written beside the code under test.
const EXPECTED_FIELDS = MANIFEST.expectedFields || [];

// The six the contract calls out by name. They are a SUBSET of what is compared:
// vFixtureParity below compares every field the manifest declares, so a new
// agreed field is covered the moment the backend publishes it.
const PARITY_FIELDS = [
  'carriesCurrentRisk', 'signedQuantity', 'quantityStatus',
  'quantitySource', 'positionSide', 'terminalReason',
];

// ── checkers ─────────────────────────────────────────────────────────────────

// A. The frontend outcome for every fixture equals the backend's recorded one.
//    `outcomeOf` is injected so the mutation proof can substitute a broken
//    producer without touching the module on disk.
function vFixtureParity(manifest, outcomeOf) {
  const out = [];
  const declared = manifest.expectedFields || [];
  if (declared.length < 8) return ['the manifest declares too few expected fields: ' + declared.length];
  for (const f of PARITY_FIELDS) {
    if (!declared.includes(f)) out.push('the manifest no longer declares the agreed field ' + f);
  }
  for (const fx of manifest.fixtures || []) {
    let actual;
    try { actual = outcomeOf(fx); } catch (e) { out.push(fx.id + ': producer threw — ' + e.message); continue; }
    // EVERY declared field, not a hand-picked subset: a field the backend adds
    // to the contract is compared without anyone remembering to list it here.
    for (const f of declared) {
      if (!Object.prototype.hasOwnProperty.call(actual, f)) {
        out.push(fx.id + '.' + f + ': the frontend produces no such field');
        continue;
      }
      if (actual[f] !== fx.expected[f]) {
        out.push(fx.id + '.' + f + ': frontend ' + JSON.stringify(actual[f]) +
          ' vs backend ' + JSON.stringify(fx.expected[f]));
      }
    }
    // Internal coherence: a reason is present exactly when risk is absent.
    const hasReason = actual.terminalReason !== null;
    if (hasReason === actual.carriesCurrentRisk) {
      out.push(fx.id + ': terminalReason and carriesCurrentRisk disagree');
    }
  }
  return out;
}

// B. Every state the contract calls mandatory is present in the manifest.
function vMandatoryStates(manifest) {
  const out = [];
  const ids = new Set((manifest.fixtures || []).map((f) => f.id));
  for (const required of [
    'open', 'closed', 'rolled', 'assigned', 'exercised', 'expired', 'cash_settled',
    'terminal', 'residual_zero', 'residual_non_zero', 'missing_quantity',
    'negative_quantity', 'partial_close',
    'partial_close_still_open', 'partial_close_fully_closed',
  ]) {
    if (!ids.has(required)) out.push('the manifest is missing the mandatory state ' + required);
  }
  // The reconciled taxonomy, asserted as a rule and not merely as fixtures.
  const noRisk = ((manifest.canonicalRules || {}).noCurrentRisk) || [];
  for (const state of ['closed', 'rolled', 'assigned', 'exercised', 'cash_settled', 'terminal', 'residual_zero', 'expired']) {
    if (!noRisk.includes(state)) out.push('canonicalRules.noCurrentRisk omits ' + state);
  }
  return out;
}

// C. The manifest's two hashes, and their distinctness.
function vManifestIdentity(manifest, bytes) {
  const out = [];
  if (manifest.version !== '2.1.0') out.push('manifest version is ' + JSON.stringify(manifest.version));
  if (manifest.scopeSemanticsVersion !== '2.1.0') out.push('scopeSemanticsVersion is ' + JSON.stringify(manifest.scopeSemanticsVersion));
  const identity = sha256(Buffer.from(stableStringify(manifest.fixtures)));
  if (identity !== manifest.sha256) {
    out.push('the declared identity hash does not cover the fixtures (declared ' +
      String(manifest.sha256).slice(0, 12) + ', recomputed ' + identity.slice(0, 12) + ')');
  }
  const fileSha = sha256(bytes);
  if (fileSha === manifest.sha256) {
    out.push('the identity hash and the file-content sha256 are the same value — one of the two is not being computed');
  }
  return out;
}

// D. The module's declared quantity field lists mirror the REAL owner source.
//    Without this the module could label a quantity with a field the owner never
//    reads, and the label would be a fiction.
function vFieldListsMirrorOwners(_appSrc, declaredResidual, declaredGross) {
  const out = [];
  // Read the canonical vocabularies out of the REAL application source, so the
  // module's copy cannot describe a precedence the owner does not apply.
  // Call the REAL owner functions extracted from the application source, rather
  // than regex-scraping a literal: what matters is what the owner returns.
  const listFrom = (fnName) => {
    try { return call(fnName + '()'); } catch (e) { return null; }
  };
  const residual = listFrom('_portfolioResidualQuantityFields');
  const gross = listFrom('_portfolioGrossQuantityFields');
  if (!residual) out.push('could not read the residual vocabulary from the application source');
  else if (residual.join(',') !== declaredResidual.join(',')) {
    out.push('residual vocabulary drifted — owner [' + residual.join(',') + '] vs module [' + declaredResidual.join(',') + ']');
  }
  if (!gross) out.push('could not read the gross vocabulary from the application source');
  else if (gross.join(',') !== declaredGross.join(',')) {
    out.push('gross vocabulary drifted — owner [' + gross.join(',') + '] vs module [' + declaredGross.join(',') + ']');
  }
  return out;
}

// E. The canonical vocabulary must ALSO match the backend's, as published in the
//    manifest. Matching only the local owner would let both frontend halves
//    drift together, away from the tier they are supposed to agree with.
function vVocabularyMatchesBackend(manifest, declaredResidual, declaredGross) {
  const out = [];
  const rules = manifest.canonicalRules || {};
  const backendResidual = rules.residualFieldVocabulary || [];
  const backendGross = rules.grossFieldVocabulary || [];
  if (!backendResidual.length) return ['the manifest publishes no residual vocabulary'];
  if (backendResidual.join(',') !== declaredResidual.join(',')) {
    out.push('residual vocabulary differs from the backend — backend [' + backendResidual.join(',') +
      '] vs frontend [' + declaredResidual.join(',') + ']');
  }
  if (backendGross.join(',') !== declaredGross.join(',')) {
    out.push('gross vocabulary differs from the backend — backend [' + backendGross.join(',') +
      '] vs frontend [' + declaredGross.join(',') + ']');
  }
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────────
section('1. The manifest is the backend artefact, and its two hashes are distinct');
{
  const v = vManifestIdentity(MANIFEST, MANIFEST_BYTES);
  ok(v.length === 0, '1.1: manifest identity is well-formed' + (v.length ? ' — ' + v.join(' | ') : ''));
  ok(MANIFEST.sha256 === '5dff46fb958c728ae48326a510fc79e6e5a94a8a85608b91538400125ec5d0cb',
    '1.2: the manifest identity hash is the value the backend published');
  ok(sha256(MANIFEST_BYTES) === '7c207262a54746b19d60ae1b426d5781fc2fc036ae9021aafed3d36e1aa6f0b4',
    '1.3: the file-content sha256 matches the backend file — the copy was not edited');
  ok(MANIFEST.manifestId === 'portfolio-scope-parity', '1.4: the manifest id is unchanged');
  ok(Array.isArray(MANIFEST.fixtures) && MANIFEST.fixtures.length >= 15,
    '1.5: the fixture set is complete (' + (MANIFEST.fixtures || []).length + ' fixtures)');
  // Neutral and serializable: the frontend must be able to load it as plain JSON.
  ok(JSON.stringify(JSON.parse(JSON.stringify(MANIFEST.fixtures))) === JSON.stringify(MANIFEST.fixtures),
    '1.6: every fixture is neutral and JSON-round-trippable');
}

section('2. The frontend identity owner agrees with the manifest');
{
  ok(call('PORTFOLIO_SCOPE_PARITY_MANIFEST_VERSION') === MANIFEST.version,
    '2.1: PORTFOLIO_SCOPE_PARITY_MANIFEST_VERSION matches the manifest');
  ok(call('PORTFOLIO_SCOPE_PARITY_MANIFEST_SHA256') === MANIFEST.sha256,
    '2.2: PORTFOLIO_SCOPE_PARITY_MANIFEST_SHA256 matches the manifest IDENTITY hash');
  ok(call('PORTFOLIO_SCOPE_SEMANTICS_VERSION') === MANIFEST.scopeSemanticsVersion,
    '2.3: PORTFOLIO_SCOPE_SEMANTICS_VERSION matches the manifest');
  ok(call('PORTFOLIO_SCOPE_PARITY_MANIFEST_FILE_SHA256') === sha256(MANIFEST_BYTES),
    '2.4: the module records the FILE-content sha256 separately, and it matches the file on disk');
  ok(call('PORTFOLIO_SCOPE_PARITY_MANIFEST_FILE_SHA256') !== call('PORTFOLIO_SCOPE_PARITY_MANIFEST_SHA256'),
    '2.5: the module keeps the identity hash and the file hash as DIFFERENT constants');
  ok(/^[0-9a-f]{7,40}$/.test(call('PORTFOLIO_SCOPE_PARITY_SOURCE_COMMIT')),
    '2.6: the module records the backend commit the manifest was taken from');
  ok(call('PORTFOLIO_SCOPE_PARITY_DIVERGENCE') === 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE',
    '2.7: the canonical divergence code is declared');
  const fields = call('PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS.slice()');
  ok(fields.length === 3, '2.8: the claim vocabulary is exactly three fields');
  ok(Object.isFrozen(call('PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS')),
    '2.9: the claim vocabulary is frozen — a caller cannot shrink it');
}

section('3. The claim is atomic and cannot be produced partially');
{
  const claim = call('buildPortfolioScopeParityClaim()');
  const keys = Object.keys(claim).sort();
  ok(keys.length === 3, '3.1: the claim carries exactly three keys, got ' + keys.length);
  ok(keys.join(',') === 'portfolioScopeParityManifestSha256,portfolioScopeParityManifestVersion,portfolioScopeSemanticsVersion',
    '3.2: the claim carries the three declared identifiers and nothing else');
  ok(claim.portfolioScopeParityManifestVersion === MANIFEST.version &&
     claim.portfolioScopeParityManifestSha256 === MANIFEST.sha256 &&
     claim.portfolioScopeSemanticsVersion === MANIFEST.scopeSemanticsVersion,
    '3.3: every value in the claim comes from the manifest');
  // Two independently built claims must be identical: the builder has no state
  // and no input, so a claim cannot depend on when it was asked for.
  ok(JSON.stringify(call('buildPortfolioScopeParityClaim()')) === JSON.stringify(claim),
    '3.4: the builder is deterministic and stateless');
  ok(JSON.stringify(call('portfolioScopeParityIdentity()')) === JSON.stringify(claim),
    '3.5: the identity accessor and the claim builder cannot disagree');
  // Mutating a returned claim must not corrupt the next one.
  call('(function(){ var c = buildPortfolioScopeParityClaim(); delete c.portfolioScopeSemanticsVersion; return c; })()');
  ok(Object.keys(call('buildPortfolioScopeParityClaim()')).length === 3,
    '3.6: mutating one claim cannot make the next one partial');
}

section('4. Response validation rejects everything that is not a complete match');
{
  const good = call('buildPortfolioScopeParityClaim()');
  const validate = (obj) => call('validatePortfolioScopeParityResponse(__r)', { __r: obj });

  ok(validate(Object.assign({}, good)).ok === true, '4.1: a complete, correct triple is accepted');
  ok(validate(Object.assign({}, good, { matrix: [], status: 'VALID', harmlessExtra: 1 })).ok === true,
    '4.2: a harmless extra field does not make a correct triple invalid');
  // 2.1.0: the nested fallback is GONE. It was a preventive accommodation for an
  // envelope nobody has specified, and it could be satisfied by the client's own
  // claim echoed back — proving nothing.
  ok(validate({ portfolioScopeParity: Object.assign({}, good) }).ok === false,
    '4.3: an identity present ONLY in a nested object is rejected');
  ok(validate({ scopeParity: Object.assign({}, good) }).ok === false,
    '4.3b: a nested `scopeParity` object is not an authoritative identity either');
  ok(validate({ portfolioScopeParityIdentity: Object.assign({}, good) }).ok === false,
    '4.3c: nor is a nested `portfolioScopeParityIdentity`');
  // The request's own claim echoed back must NOT satisfy the check.
  ok(validate({ portfolioScopeParity: call('buildPortfolioScopeParityClaim()') }).ok === false,
    '4.3d: the client\'s own claim echoed back is not proof of anything');

  const FIELDS = call('PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS.slice()');
  for (const f of FIELDS) {
    const missing = Object.assign({}, good); delete missing[f];
    const r1 = validate(missing);
    ok(r1.ok === false && r1.code === 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE',
      '4.4: a response MISSING ' + f + ' is rejected');
    ok(r1.mismatches.length === 1 && r1.mismatches[0].field === f && r1.mismatches[0].received === null,
      '4.4b: the diagnostics name exactly the missing field ' + f);

    const diverged = Object.assign({}, good, { [f]: 'not-what-this-tier-uses' });
    const r2 = validate(diverged);
    ok(r2.ok === false && r2.mismatches.length === 1 && r2.mismatches[0].field === f &&
       r2.mismatches[0].received === 'not-what-this-tier-uses' && r2.mismatches[0].expected === good[f],
      '4.5: a response DIVERGENT in ' + f + ' is rejected with expected and received');

    ok(validate(Object.assign({}, good, { [f]: null })).ok === false, '4.6: a NULL ' + f + ' is rejected');
    ok(validate(Object.assign({}, good, { [f]: '' })).ok === false, '4.7: an EMPTY ' + f + ' is rejected');
    ok(validate(Object.assign({}, good, { [f]: '   ' })).ok === false, '4.8: a BLANK ' + f + ' is rejected');
    ok(validate(Object.assign({}, good, { [f]: 2 })).ok === false, '4.9: a non-string ' + f + ' is rejected');
  }

  const empty = validate({});
  ok(empty.ok === false && empty.mismatches.length === 3, '4.10: an empty object is rejected on all three fields');
  for (const bad of [null, undefined, 'a string', 42, [], true]) {
    ok(validate(bad).ok === false, '4.11: a non-object response (' + JSON.stringify(bad === undefined ? 'undefined' : bad) + ') is rejected');
  }
  ok(validate({ portfolioScopeParity: 'nonsense' }).ok === false,
    '4.12: an invalid identity object is rejected, not read around');

  // A correct top-level triple stands on its own; a divergent nested object is
  // simply not read.
  const conflicted = Object.assign({}, good, { portfolioScopeParity: { portfolioScopeSemanticsVersion: '1.0.0' } });
  ok(validate(conflicted).ok === true, '4.13: a divergent nested object is irrelevant beside a correct top-level triple');
  // …and the reverse: a correct nested object cannot rescue a divergent top level.
  const rescued = Object.assign({}, good, {
    portfolioScopeSemanticsVersion: '1.0.0',
    portfolioScopeParity: Object.assign({}, good),
  });
  ok(validate(rescued).ok === false, '4.13b: a correct nested object cannot rescue a divergent top-level identifier');

  // A top-level field inherited from the prototype was never sent by the backend.
  const inherited = Object.create({ portfolioScopeSemanticsVersion: good.portfolioScopeSemanticsVersion });
  inherited.portfolioScopeParityManifestVersion = good.portfolioScopeParityManifestVersion;
  inherited.portfolioScopeParityManifestSha256 = good.portfolioScopeParityManifestSha256;
  ok(validate(inherited).ok === false, '4.13c: an identity field inherited from the prototype is rejected');

  // Diagnostics must carry no portfolio data.
  const leaky = Object.assign({}, good, {
    portfolioScopeSemanticsVersion: { portfolioId: 'SECRET-PF', positions: [{ ticker: 'AAPL', qty: 42 }] },
  });
  const r3 = validate(leaky);
  const blob = JSON.stringify(r3);
  ok(r3.ok === false, '4.14: an identity field carrying an object is a divergence');
  ok(blob.indexOf('SECRET-PF') === -1 && blob.indexOf('AAPL') === -1 && blob.indexOf('42') === -1,
    '4.15: the diagnostics describe the type only — no Portfolio data is echoed back');

  // The throwing form carries the canonical code.
  let thrown = null;
  try { call('assertPortfolioScopeParityResponse({})'); } catch (e) { thrown = e; }
  ok(thrown && thrown.code === 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE',
    '4.16: the throwing form raises the canonical PORTFOLIO_SCOPE_PARITY_DIVERGENCE');
  ok(thrown && Array.isArray(thrown.mismatches) && thrown.mismatches.length === 3,
    '4.17: the thrown error carries the per-field diagnostics');
}

section('5. CROSS-TIER PARITY — the real owners, over the real fixtures');
{
  ok(APP_SRC.length > 100000, '5.0: application source reconstructed (' + APP_SRC.length + ' bytes)');
  const declaredResidual = call('PORTFOLIO_SCOPE_RESIDUAL_QUANTITY_FIELDS.slice()');
  const declaredGross = call('PORTFOLIO_SCOPE_GROSS_QUANTITY_FIELDS.slice()');
  const v = vFieldListsMirrorOwners(APP_SRC, declaredResidual, declaredGross);
  ok(v.length === 0, '5.1: the module\'s quantity vocabulary mirrors the canonical owner' + (v.length ? ' — ' + v.join(' | ') : ''));
  const b = vVocabularyMatchesBackend(MANIFEST, declaredResidual, declaredGross);
  ok(b.length === 0, '5.1b: …and the SAME vocabulary the backend published' + (b.length ? ' — ' + b.join(' | ') : ''));
  ok(declaredResidual.length === 12, '5.1c: the canonical residual vocabulary is the 12-field union, got ' + declaredResidual.length);

  const m = vMandatoryStates(MANIFEST);
  ok(m.length === 0, '5.2: every mandatory scope state is covered' + (m.length ? ' — ' + m.join(' | ') : ''));

  const outcomeOf = (fx) => call('portfolioScopeCanonicalOutcome(__t, __l)', { __t: fx.trade, __l: fx.leg });
  const p = vFixtureParity(MANIFEST, outcomeOf);
  ok(p.length === 0, '5.3: every fixture produces the backend\'s canonical outcome' + (p.length ? ' — ' + p.join(' | ') : ''));

  // Stated individually, so a regression names the case rather than a count.
  for (const fx of MANIFEST.fixtures) {
    const actual = outcomeOf(fx);
    ok(actual.carriesCurrentRisk === fx.expected.carriesCurrentRisk,
      '5.4[' + fx.id + ']: carriesCurrentRisk agrees across tiers');
  }

  // The semantics the contract states in words, asserted as behaviour.
  const byId = (id) => MANIFEST.fixtures.find((f) => f.id === id);
  for (const id of ['closed', 'rolled', 'assigned', 'exercised', 'expired', 'cash_settled', 'terminal', 'residual_zero']) {
    ok(outcomeOf(byId(id)).carriesCurrentRisk === false, '5.5[' + id + ']: carries NO current risk');
  }
  const stillOpen = outcomeOf(byId('partial_close_still_open'));
  ok(stillOpen.carriesCurrentRisk === true && stillOpen.signedQuantity === 3,
    '5.6: a partial close with a positive residual stays OPEN for the residual quantity');
  ok(outcomeOf(byId('partial_close_fully_closed')).carriesCurrentRisk === false,
    '5.7: an exitPrice with no surviving residual is terminal');
  const missing = outcomeOf(byId('missing_quantity'));
  ok(missing.quantity === null && missing.signedQuantity === null && missing.quantityStatus === 'UNAVAILABLE',
    '5.8: a missing quantity is UNAVAILABLE — never 1, never 0');
  const zero = outcomeOf(byId('residual_zero'));
  ok(zero.quantityStatus === 'VALID' && zero.isZeroResidual === true && zero.quantityStatus !== missing.quantityStatus,
    '5.9: a KNOWN zero residual is distinguishable from an unknown quantity');
  const neg = outcomeOf(byId('negative_quantity'));
  ok(neg.signedQuantity === -3 && neg.quantity === 3 && neg.positionSide === 'SHORT',
    '5.10: a negative stored quantity is SHORT, signed exactly once');
  const short = outcomeOf(byId('assigned'));
  ok(short.signedQuantity === -1, '5.11: a declared SHORT side signs the quantity once, not twice');
}

section('6. MUTATION PROOF — parity mutations (in memory only)');
{
  const outcomeOf = (fx) => call('portfolioScopeCanonicalOutcome(__t, __l)', { __t: fx.trade, __l: fx.leg });

  // 6.1 a producer that treats ROLLED as still carrying risk (the pre-2.0.0 backend)
  const rolledStillOpen = (fx) => {
    const o = outcomeOf(fx);
    if (fx.id === 'rolled') return Object.assign({}, o, { legOpen: true, carriesCurrentRisk: true });
    return o;
  };
  ok(vFixtureParity(MANIFEST, rolledStillOpen).length > 0,
    '6.1: MUTATION CAUGHT — treating ROLLED as open must fail parity');

  // 6.2 a producer that lets any exitPrice retire a leg with a surviving residual
  const exitPriceWins = (fx) => {
    const o = outcomeOf(fx);
    if (fx.id === 'partial_close_still_open') return Object.assign({}, o, { legOpen: false, carriesCurrentRisk: false });
    return o;
  };
  ok(vFixtureParity(MANIFEST, exitPriceWins).length > 0,
    '6.2: MUTATION CAUGHT — an exitPrice deleting a surviving residual must fail parity');

  // 6.3 a missing quantity defaulted to 1 — the classic silent default
  const missingBecomesOne = (fx) => {
    const o = outcomeOf(fx);
    if (fx.id === 'missing_quantity') {
      return Object.assign({}, o, { quantity: 1, signedQuantity: 1, quantityStatus: 'VALID', carriesCurrentRisk: true, terminalReason: null });
    }
    return o;
  };
  ok(vFixtureParity(MANIFEST, missingBecomesOne).length > 0,
    '6.3: MUTATION CAUGHT — a missing quantity becoming 1 must fail parity');

  // 6.4 a missing quantity collapsed onto a known zero
  const missingBecomesZero = (fx) => {
    const o = outcomeOf(fx);
    if (fx.id === 'missing_quantity') {
      return Object.assign({}, o, { quantity: 0, signedQuantity: 0, quantityStatus: 'VALID', isZeroResidual: true, terminalReason: 'RESIDUAL_ZERO' });
    }
    return o;
  };
  ok(vFixtureParity(MANIFEST, missingBecomesZero).length > 0,
    '6.4: MUTATION CAUGHT — a missing quantity becoming a known zero must fail parity');

  // 6.5 the sign applied twice to a declared SHORT with a negative quantity
  const signedTwice = (fx) => {
    const o = outcomeOf(fx);
    if (fx.id === 'negative_quantity') return Object.assign({}, o, { signedQuantity: 3, positionSide: 'LONG' });
    return o;
  };
  ok(vFixtureParity(MANIFEST, signedTwice).length > 0,
    '6.5: MUTATION CAUGHT — double-signing a negative SHORT must fail parity');

  // 6.6 the quantity source mislabelled: the gross qty claimed where a residual was read
  const wrongSource = (fx) => {
    const o = outcomeOf(fx);
    if (fx.id === 'partial_close') return Object.assign({}, o, { quantitySource: 'qty' });
    return o;
  };
  ok(vFixtureParity(MANIFEST, wrongSource).length > 0,
    '6.6: MUTATION CAUGHT — mislabelling which field a quantity came from must fail parity');

  // 6.7 a terminalReason that contradicts carriesCurrentRisk
  const incoherent = (fx) => {
    const o = outcomeOf(fx);
    if (fx.id === 'open') return Object.assign({}, o, { terminalReason: 'RESIDUAL_ZERO' });
    return o;
  };
  ok(vFixtureParity(MANIFEST, incoherent).length > 0,
    '6.7: MUTATION CAUGHT — a reason on a live leg must fail parity');

  // 6.8 a manifest that stops declaring one of the agreed fields must not let
  //     that field quietly go unchecked.
  const narrowed = clone(MANIFEST);
  narrowed.expectedFields = narrowed.expectedFields.filter((f) => f !== 'terminalReason');
  ok(vFixtureParity(narrowed, outcomeOf).some((v) => /no longer declares the agreed field terminalReason/.test(v)),
    '6.8: MUTATION CAUGHT — dropping an agreed field from the contract must fail');
  // 6.8b a fixture whose expected block disagrees with the frontend must fail,
  //      whichever declared field it disagrees on.
  const drifted = clone(MANIFEST);
  drifted.fixtures[0].expected.quantitySource = 'someOtherField';
  ok(vFixtureParity(drifted, outcomeOf).some((v) => /quantitySource/.test(v)),
    '6.8b: MUTATION CAUGHT — a drifted quantitySource must fail parity');

  // 6.9 a manifest whose declared identity hash no longer covers its fixtures
  const tampered = clone(MANIFEST);
  tampered.fixtures[0].expected.carriesCurrentRisk = false;
  ok(vManifestIdentity(tampered, MANIFEST_BYTES).some((v) => /identity hash does not cover/.test(v)),
    '6.9: MUTATION CAUGHT — editing a fixture without regenerating the identity hash');

  // 6.10 the identity hash quietly replaced by the file-content hash
  const confused = clone(MANIFEST);
  confused.sha256 = sha256(MANIFEST_BYTES);
  ok(vManifestIdentity(confused, MANIFEST_BYTES).length > 0,
    '6.10: MUTATION CAUGHT — confusing the file-content sha256 for the manifest identity hash');

  // 6.11 a mandatory state dropped from the manifest
  const shrunk = clone(MANIFEST);
  shrunk.fixtures = shrunk.fixtures.filter((f) => f.id !== 'partial_close_still_open');
  ok(vMandatoryStates(shrunk).length > 0, '6.11: MUTATION CAUGHT — dropping a mandatory scope state');

  // 6.12 the reconciled taxonomy quietly loosened
  const loosened = clone(MANIFEST);
  loosened.canonicalRules.noCurrentRisk = loosened.canonicalRules.noCurrentRisk.filter((s) => s !== 'rolled');
  ok(vMandatoryStates(loosened).length > 0, '6.12: MUTATION CAUGHT — removing ROLLED from the no-risk taxonomy');

  // 6.13 the module's field list drifting from the owner's
  ok(vFieldListsMirrorOwners(APP_SRC, ['openQty', 'remainingQty'], call('PORTFOLIO_SCOPE_GROSS_QUANTITY_FIELDS.slice()')).length > 0,
    '6.13: MUTATION CAUGHT — a residual vocabulary that no longer mirrors the owner');
  ok(vFieldListsMirrorOwners(APP_SRC, call('PORTFOLIO_SCOPE_RESIDUAL_QUANTITY_FIELDS.slice()'), ['qty']).length > 0,
    '6.14: MUTATION CAUGHT — a gross vocabulary that no longer mirrors the owner');
  // 6.15 the two tiers re-ordering their precedence independently
  const reordered = call('PORTFOLIO_SCOPE_RESIDUAL_QUANTITY_FIELDS.slice()').slice().reverse();
  ok(vVocabularyMatchesBackend(MANIFEST, reordered, call('PORTFOLIO_SCOPE_GROSS_QUANTITY_FIELDS.slice()')).length > 0,
    '6.15: MUTATION CAUGHT — a precedence that no longer matches the backend');
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log('\nfixtures: ' + MANIFEST.fixtures.length +
  '  |  manifest identity ' + String(MANIFEST.sha256).slice(0, 12) +
  '  |  file sha256 ' + sha256(MANIFEST_BYTES).slice(0, 12));
console.log(fail === 0
  ? 'All ' + pass + ' assertions passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.');
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
