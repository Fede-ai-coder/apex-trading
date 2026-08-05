// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO SCOPE PARITY — the frontend half of the cross-tier scope contract.
//
// WHY THIS FILE EXISTS
//   The backend and the frontend each decide, independently, which trades and
//   which legs of a portfolio still carry risk. Two tiers that answer that
//   question differently do not disagree loudly — they quietly stress-test two
//   different portfolios and both report success. `contracts/portfolio-scope-
//   parity-manifest.json` is the neutral fixture set that makes the divergence
//   detectable, and this module is the SINGLE frontend owner of:
//
//     1. the three identifiers that pin the shared vocabulary, and
//     2. the canonical outcome the frontend produces for a manifest fixture.
//
//   The manifest is a byte-identical copy of the file published by the backend
//   on the branch of draft PR #220. Its identity is checked
//   two ways, because the two hashes mean different things:
//     • the MANIFEST IDENTITY HASH covers the canonical JSON of the `fixtures`
//       array only, so prose edits above it do not churn the value both tiers
//       compare — that is the value published in a run and claimed in a request;
//     • the FILE-CONTENT SHA256 covers the whole file and proves the copy was
//       not edited in transit. Confusing the two would let an edited manifest
//       keep a matching identity, which is exactly the hole the pair closes.
//
// WHAT THIS FILE DOES NOT DO
//   It defines NO scope rule of its own. Every question about a trade, a leg, a
//   residual quantity or a direction is answered by the owners that already
//   exist in index.html — _portfolioTradeIsOpenForRisk, _isTerminalPortfolioLeg,
//   _portfolioLegHasCloseMarker, _portfolioLegHasExplicitOpenQty,
//   _portfolioLegExplicitOpenQty and _portfolioLegEffectiveQty. A second scope
//   owner written to make a parity test pass would prove nothing about the
//   application, which is the one thing the test exists to prove.
//
// LOAD-TIME BEHAVIOUR
//   Loaded as a CLASSIC script BEFORE the inline monolith. It declares constants
//   and functions and nothing else: no request, no timer, no listener, no DOM
//   access, no storage, no state write. The index.html owners it calls are
//   resolved LEXICALLY at CALL time, never while this file loads, exactly as in
//   js/api/backend-client.js and the candle service modules.
// ─────────────────────────────────────────────────────────────────────────────

// ── the three identifiers, and nothing else ──────────────────────────────────
// These are the values the backend publishes in every stress response and the
// values a request claims. They are literals here on purpose: a browser cannot
// read contracts/portfolio-scope-parity-manifest.json at load time without a
// request, and a request at load time is exactly what this module must not make.
// tests/portfolio-stress-parity-runtime.test.js reads the manifest from disk and
// fails if any of the three drifts from it.
var PORTFOLIO_SCOPE_PARITY_MANIFEST_VERSION = '2.1.0';
var PORTFOLIO_SCOPE_PARITY_MANIFEST_SHA256 = '5dff46fb958c728ae48326a510fc79e6e5a94a8a85608b91538400125ec5d0cb';
var PORTFOLIO_SCOPE_SEMANTICS_VERSION = '2.1.0';

// The FILE-CONTENT sha256 of the manifest copy in this repository. Deliberately
// a DIFFERENT constant from the identity hash above: one proves the fixtures are
// the ones both tiers agreed on, the other proves the file was copied intact.
var PORTFOLIO_SCOPE_PARITY_MANIFEST_FILE_SHA256 = '7c207262a54746b19d60ae1b426d5781fc2fc036ae9021aafed3d36e1aa6f0b4';

// The backend commit the manifest copy and these identifiers were taken from.
var PORTFOLIO_SCOPE_PARITY_SOURCE_COMMIT = '746a6b9';

// The claim vocabulary, declared ONCE. A claim carries all three of these or it
// is not a claim: a partial claim verifies one identifier, silently skips the
// other two and still reads as "compatible" to anyone auditing the request.
var PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS = Object.freeze([
  'portfolioScopeParityManifestVersion',
  'portfolioScopeParityManifestSha256',
  'portfolioScopeSemanticsVersion',
]);

// The one canonical frontend error for a scope-vocabulary mismatch. Same string
// as the backend's PARITY_DIVERGENCE_REASON, so a divergence detected on either
// side is reported under one name.
var PORTFOLIO_SCOPE_PARITY_DIVERGENCE = 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE';

// Why a leg or trade carries no current risk. A boolean says THAT nothing is at
// risk; these say WHY, so a future renderer can distinguish "this leg was rolled"
// from "we do not know how big this leg is" without inventing its own taxonomy.
var PORTFOLIO_SCOPE_TERMINAL_REASON = Object.freeze({
  TERMINAL_TRADE_STATUS: 'TERMINAL_TRADE_STATUS',
  TERMINAL_LEG_STATUS: 'TERMINAL_LEG_STATUS',
  EXIT_PRICE_WITHOUT_SURVIVING_RESIDUAL: 'EXIT_PRICE_WITHOUT_SURVIVING_RESIDUAL',
  QUANTITY_UNAVAILABLE: 'QUANTITY_UNAVAILABLE',
  RESIDUAL_ZERO: 'RESIDUAL_ZERO',
});

// The canonical quantity vocabulary, in the SAME precedence order both tiers
// use as of semantics 2.1.0. Mirrored here only to LABEL which field a quantity
// came from — the VALUE always comes from the index.html owner. The parity suite
// extracts both lists from the real owner source AND from the backend manifest,
// so the label can never describe a different field from the one that was read,
// and neither tier can quietly re-order its own precedence.
var PORTFOLIO_SCOPE_RESIDUAL_QUANTITY_FIELDS = Object.freeze([
  'effectiveQty',
  'openQty', 'openQuantity', 'qtyOpen', 'quantityOpen',
  'remainingQty', 'remainingQuantity', 'qtyRemaining',
  'residualQty', 'residualQuantity',
  'currentQty', 'currentQuantity',
]);
var PORTFOLIO_SCOPE_GROSS_QUANTITY_FIELDS = Object.freeze(['qty', 'quantity', 'contracts']);

// ── the claim ────────────────────────────────────────────────────────────────

/**
 * Build the cross-tier scope-parity claim a stress request must carry.
 *
 * It is impossible for this function to produce a partial claim: the object is
 * assembled from the three constants above and then checked against
 * PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS before it is returned. A caller that
 * wants to send a claim gets all three identifiers or an exception — never a
 * two-field object that reads as compatible.
 */
function buildPortfolioScopeParityClaim() {
  var claim = {
    portfolioScopeParityManifestVersion: PORTFOLIO_SCOPE_PARITY_MANIFEST_VERSION,
    portfolioScopeParityManifestSha256: PORTFOLIO_SCOPE_PARITY_MANIFEST_SHA256,
    portfolioScopeSemanticsVersion: PORTFOLIO_SCOPE_SEMANTICS_VERSION,
  };
  var missing = _portfolioScopeParityMissingFields(claim);
  if (missing.length) {
    // Unreachable while the three constants are non-empty strings. It exists so
    // that if one is ever blanked, the failure is loud here rather than a silent
    // partial claim on the wire.
    throw _portfolioScopeParityError(
      'the frontend cannot build a complete scope-parity claim; missing: ' + missing.join(', '),
      missing.map(function (field) {
        return { field: field, expected: _portfolioScopeParityExpected()[field], received: null };
      })
    );
  }
  return claim;
}

/** The three identifiers this frontend uses, as a plain object. */
function portfolioScopeParityIdentity() {
  return buildPortfolioScopeParityClaim();
}

// ── response validation ──────────────────────────────────────────────────────

/**
 * Verify that a stress response speaks the SAME scope vocabulary as this tier.
 *
 * Returns { ok: true, identity } or { ok: false, code, message, mismatches }.
 * Nothing is tolerated: a response missing any one of the three identifiers, or
 * carrying a divergent, null or empty value for any one of them, is a
 * divergence. Absence is NOT treated as agreement — a run whose vocabulary we
 * cannot read is a run we cannot compare numbers from.
 *
 * The diagnostics carry ONLY the three identifiers (expected and received).
 * No portfolioId, no revision, no position, no quantity, no price.
 */
function validatePortfolioScopeParityResponse(response) {
  var expected = _portfolioScopeParityExpected();
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    return {
      ok: false,
      code: PORTFOLIO_SCOPE_PARITY_DIVERGENCE,
      message: 'the stress response carries no readable scope-parity identity object',
      mismatches: PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS.map(function (field) {
        return { field: field, expected: expected[field], received: null };
      }),
    };
  }

  // TOP LEVEL ONLY. The backend publishes the three identifiers as top-level
  // response fields, and that is the whole authoritative surface.
  //
  // A previous revision also fell back to a nested `portfolioScopeParity` /
  // `scopeParity` / `portfolioScopeParityIdentity` object, "in case a future
  // envelope shape appears". That was a preventive fallback for a contract
  // nobody has written, and it had a specific failure mode: the request itself
  // carries a `portfolioScopeParity` claim, so a backend that echoed the request
  // back — or any proxy that merged the two — would satisfy the check with the
  // CLIENT'S OWN claim and prove nothing at all.
  //
  // A future envelope must come with an explicit contract revision. Until then,
  // an identity that is only nested is a divergence.
  var source = _portfolioScopeParityReadIdentity(response);
  var mismatches = [];
  for (var i = 0; i < PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS.length; i++) {
    var field = PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS[i];
    var received = source[field];
    if (received === null || received === undefined) {
      mismatches.push({ field: field, expected: expected[field], received: null });
      continue;
    }
    if (typeof received !== 'string') {
      mismatches.push({ field: field, expected: expected[field], received: _portfolioScopeParityDescribe(received) });
      continue;
    }
    if (received.trim() === '') {
      mismatches.push({ field: field, expected: expected[field], received: '' });
      continue;
    }
    if (received !== expected[field]) {
      mismatches.push({ field: field, expected: expected[field], received: received });
    }
  }

  if (mismatches.length) {
    return {
      ok: false,
      code: PORTFOLIO_SCOPE_PARITY_DIVERGENCE,
      message: 'the stress response does not speak this tier\'s Portfolio scope vocabulary',
      mismatches: mismatches,
    };
  }
  return { ok: true, identity: expected };
}

/**
 * The throwing form, for call sites that must not be able to ignore the result.
 * Throws an Error carrying `code` and `mismatches`; returns the identity when
 * the response agrees.
 */
function assertPortfolioScopeParityResponse(response) {
  var verdict = validatePortfolioScopeParityResponse(response);
  if (!verdict.ok) throw _portfolioScopeParityError(verdict.message, verdict.mismatches);
  return verdict.identity;
}

// ── the canonical frontend outcome for one manifest fixture ──────────────────

/**
 * Produce this tier's canonical answer for one { trade, leg } pair, using ONLY
 * the existing frontend scope owners. This is the artefact the backend's
 * `canonicalScopeOutcome` must match, fixture by fixture.
 *
 *   tradeOpen         does the TRADE still carry risk
 *   legOpen           does the LEG still carry risk, independently of its size
 *   quantity          unsigned magnitude that is still open; null when unknown
 *   signedQuantity    sign applied exactly once; SHORT is negative
 *   quantityStatus    VALID | UNAVAILABLE — never a silent 1 and never a silent 0
 *   quantityReason    QUANTITY_MISSING | QUANTITY_INVALID | null
 *   quantitySource    which field the quantity was read from, or was recorded in
 *   positionSide      LONG | SHORT | null
 *   isZeroResidual    a KNOWN zero (the leg is closed), distinct from unknown
 *   carriesCurrentRisk the single question both tiers must agree on
 *   terminalReason    why it carries none, or null when it does
 */
function portfolioScopeCanonicalOutcome(trade, leg) {
  var tradeOpen = _portfolioTradeIsOpenForRisk(trade);
  var legTerminal = _isTerminalPortfolioLeg(leg);
  var hasCloseMarker = _portfolioLegHasCloseMarker(leg);
  var hasSurvivingResidual = _portfolioLegHasExplicitOpenQty(leg);

  // The leg-open question, with the SAME rule the canonical predicate applies:
  // a terminal status retires the leg outright, and a close marker retires it
  // only when no explicit residual says a positive quantity is still open. A
  // partial close records an exit price for the CLOSED portion; the surviving
  // contracts are still at risk.
  var legOpen = !legTerminal && (hasCloseMarker ? hasSurvivingResidual : true);

  // ONE call into the canonical owner. It reports the value AND which field it
  // came from, so the label can never describe a different field from the one
  // that was read, and "nothing was recorded" stays distinguishable from
  // "something was recorded and is unusable".
  var resolved = _portfolioResolveLegQuantity(leg);
  var raw = resolved.value;
  var quantityKnown = raw !== null && raw !== undefined;
  var quantity = quantityKnown ? Math.abs(raw) : null;
  var declaredSide = _portfolioScopeDeclaredSide(leg);
  var isShort = declaredSide === 'SHORT' || (quantityKnown && raw < 0);
  var signedQuantity = quantityKnown ? (isShort ? -quantity : quantity) : null;
  var quantityStatus = quantityKnown ? 'VALID' : 'UNAVAILABLE';
  var quantityReason = quantityKnown ? null : (resolved.present ? 'QUANTITY_INVALID' : 'QUANTITY_MISSING');
  var isZeroResidual = quantityKnown && quantity === 0;

  var carriesCurrentRisk = tradeOpen && legOpen && !isZeroResidual && quantityStatus === 'VALID';

  return {
    tradeOpen: tradeOpen,
    legOpen: legOpen,
    quantity: quantity,
    signedQuantity: signedQuantity,
    quantityStatus: quantityStatus,
    quantityReason: quantityReason,
    // The field the owner actually read, named even when its value was
    // unusable: "openQty was recorded and is unreadable" is a different fact
    // from "no quantity was recorded at all".
    quantitySource: resolved.source,
    // Mirrors the backend quantity owner: with no readable quantity there is no
    // position, so there is no side to report either.
    positionSide: quantityKnown ? (isShort ? 'SHORT' : (declaredSide || 'LONG')) : null,
    isZeroResidual: isZeroResidual,
    carriesCurrentRisk: carriesCurrentRisk,
    terminalReason: carriesCurrentRisk ? null : _portfolioScopeTerminalReason({
      tradeOpen: tradeOpen,
      legTerminal: legTerminal,
      hasCloseMarker: hasCloseMarker,
      hasSurvivingResidual: hasSurvivingResidual,
      quantityStatus: quantityStatus,
      isZeroResidual: isZeroResidual,
    }),
  };
}

// ── internals ────────────────────────────────────────────────────────────────

function _portfolioScopeParityExpected() {
  return {
    portfolioScopeParityManifestVersion: PORTFOLIO_SCOPE_PARITY_MANIFEST_VERSION,
    portfolioScopeParityManifestSha256: PORTFOLIO_SCOPE_PARITY_MANIFEST_SHA256,
    portfolioScopeSemanticsVersion: PORTFOLIO_SCOPE_SEMANTICS_VERSION,
  };
}

function _portfolioScopeParityMissingFields(claim) {
  var missing = [];
  for (var i = 0; i < PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS.length; i++) {
    var field = PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS[i];
    var v = claim ? claim[field] : null;
    if (v === null || v === undefined) { missing.push(field); continue; }
    if (typeof v !== 'string' || v.trim() === '') missing.push(field);
  }
  return missing;
}

// Read the identity from a response without inventing one, and without reaching
// anywhere but the top level.
function _portfolioScopeParityReadIdentity(response) {
  var out = {};
  for (var j = 0; j < PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS.length; j++) {
    var field = PORTFOLIO_SCOPE_PARITY_CLAIM_FIELDS[j];
    // OWN property only. A value inherited from Object.prototype was never sent
    // by the backend, and treating it as published identity would let a polluted
    // prototype satisfy the contract for every response at once.
    out[field] = Object.prototype.hasOwnProperty.call(response, field) ? response[field] : null;
  }
  return out;
}

// Describe a non-string received value for diagnostics WITHOUT serialising it:
// a portfolio object arriving in an identity field must not be echoed into an
// error message. Only its type is reported.
function _portfolioScopeParityDescribe(value) {
  if (Array.isArray(value)) return '[array]';
  return '[' + typeof value + ']';
}

function _portfolioScopeParityError(message, mismatches) {
  var err = new Error(PORTFOLIO_SCOPE_PARITY_DIVERGENCE + ': ' + message);
  err.name = 'PortfolioScopeParityDivergenceError';
  err.code = PORTFOLIO_SCOPE_PARITY_DIVERGENCE;
  err.mismatches = mismatches || [];
  return err;
}

// The leg's DECLARED direction, or null when it declares none. Only the tokens
// the Portfolio itself writes are recognised; an unknown token is null rather
// than a guessed LONG, so the sign is never invented.
function _portfolioScopeDeclaredSide(leg) {
  var v = String((leg && leg.side) || '').trim().toUpperCase();
  if (v === 'SHORT' || v === 'SELL' || v === 'S' || v === 'STO' || v === 'BTC') return 'SHORT';
  if (v === 'LONG' || v === 'BUY' || v === 'B' || v === 'BTO' || v === 'STC') return 'LONG';
  return null;
}

// Precedence is deliberate and matches how a reader would explain the outcome:
// a closed TRADE explains every leg of it; a terminal LEG status explains the
// leg regardless of its size; an exit price with nothing surviving explains a
// finished partial close; an unreadable size is not a closure at all; and a
// known zero residual is the ordinary "fully closed" case.
function _portfolioScopeTerminalReason(facts) {
  if (!facts.tradeOpen) return PORTFOLIO_SCOPE_TERMINAL_REASON.TERMINAL_TRADE_STATUS;
  if (facts.legTerminal) return PORTFOLIO_SCOPE_TERMINAL_REASON.TERMINAL_LEG_STATUS;
  if (facts.hasCloseMarker && !facts.hasSurvivingResidual) {
    return PORTFOLIO_SCOPE_TERMINAL_REASON.EXIT_PRICE_WITHOUT_SURVIVING_RESIDUAL;
  }
  if (facts.quantityStatus !== 'VALID') return PORTFOLIO_SCOPE_TERMINAL_REASON.QUANTITY_UNAVAILABLE;
  if (facts.isZeroResidual) return PORTFOLIO_SCOPE_TERMINAL_REASON.RESIDUAL_ZERO;
  return null;
}
