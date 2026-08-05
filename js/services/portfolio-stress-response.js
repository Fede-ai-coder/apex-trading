// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS RESPONSE CONTRACT — null-safe reader for a stress result.
//
// WHAT THIS IS
//   A normalizer/validator for the authoritative fields of a stress-run
//   response. It is NOT a formatter: nothing here produces a string, a colour,
//   a percentage or a DOM node. It reads the response the backend published and
//   answers, per field, "is this a number we may present as authoritative?"
//
// THE ONE RULE
//                              null stays null
//
//   Every one of these idioms is FORBIDDEN on an authoritative result field:
//
//       Number(value)          Number(null)  === 0     and Number(true) === 1
//       value || 0             turns a real 0 into 0 and an unknown into 0
//       value ?? 0             turns "we do not know" into "we know it is zero"
//       parseFloat(value) || 0 the same trap wearing a parser
//
//   A portfolio that is not there has no delta. It does not have a delta of
//   zero, and the difference between those two statements is the difference
//   between "no position" and "a perfectly hedged position".
//
// THE GREEK FAMILY, SPECIFICALLY
//   The backend withdraws the Actual and the Proposed Greeks when the Actual
//   portfolio is empty or unknown (lib/portfolio-stress-engine.js
//   `withEmptyActual`, backend commit 7027f0c):
//
//       rawGreeks.actual   = null      rawGreeks.proposed   = null
//       partialRawGreeks.actual = null partialRawGreeks.proposed = null
//       rawGreekCompleteness.actual = false   .proposed = false
//       rawGreekStatus.actual = UNAVAILABLE   .proposed = UNAVAILABLE
//       equityShareDelta   = null
//
//   The Overlay entries are left exactly as the Overlay earned them, because a
//   hypothetical structure priced against a frozen market is a real,
//   self-contained answer. That asymmetry is the whole point, and it is also the
//   trap: with `rawGreeks.actual` gone, the nearest non-null Greek vector in the
//   cell is `rawGreeks.overlay`, and a reader that falls back to it presents the
//   hypothetical structure AS the resulting portfolio.
//
//                    Proposed Greeks = Overlay Greeks
//
//   is therefore forbidden here, unconditionally. `proposed` is read from
//   `proposed` or it is null.
//
// STATUS
//   UNAVAILABLE never becomes VALID and never becomes 0. DEGRADED keeps its
//   number — a degraded figure is a real figure with a caveat — but it never
//   becomes VALID, and it is never counted as authoritative.
//
// PARTIAL
//   A partial sum is a sum over a set that lost members. It stays under its
//   `partial*` name, it is never promoted into the authoritative slot, and it is
//   never presented as a total.
//
// LOAD-TIME BEHAVIOUR
//   Classic script, inert at load: constants and function declarations only. No
//   request, no timer, no listener, no DOM access, no storage, no state write.
// ─────────────────────────────────────────────────────────────────────────────

// The three-valued result status, matching lib/portfolio-stress-quality.js.
var PORTFOLIO_STRESS_STATUS = Object.freeze({
  VALID: 'VALID',
  DEGRADED: 'DEGRADED',
  UNAVAILABLE: 'UNAVAILABLE',
});

// The three result sets a cell publishes, in the order they are reasoned about.
var PORTFOLIO_STRESS_RESULT_SETS = Object.freeze(['actual', 'overlay', 'proposed']);

// The Greek components published in RAW provider units.
var PORTFOLIO_STRESS_GREEK_COMPONENTS = Object.freeze(['delta', 'gamma', 'vega', 'theta']);

// Authoritative scalar fields of a matrix cell. "Authoritative" means: when the
// corresponding set is incomplete the backend publishes null here and moves the
// computable sum to the matching `partial*` field. Reading these with a zero
// default is what this module exists to prevent.
var PORTFOLIO_STRESS_AUTHORITATIVE_CELL_FIELDS = Object.freeze([
  'actualStressPnl', 'overlayStressPnl', 'proposedStressPnl',
  'difference', 'incrementalEffect',
  'actualCurrentValue', 'actualStressedValue', 'currentValue', 'stressedValue',
  'actualStressPnlPctNlv', 'proposedStressPnlPctNlv',
  'overlayDebitCredit', 'overlayContribution',
  'equityShareDelta', 'rawBetaWeightedShareDelta',
]);

// Their partial counterparts. Present here so a reader can find the partial that
// belongs to an authoritative field WITHOUT guessing a name — and so a test can
// assert no partial ever answers an authoritative question.
var PORTFOLIO_STRESS_PARTIAL_CELL_FIELDS = Object.freeze([
  'partialActualStressPnl', 'partialOverlayStressPnl', 'partialProposedStressPnl',
  'partialCurrentValue', 'partialStressedValue',
  'partialOverlayDebitCredit', 'partialOverlayContribution',
  'partialRawBetaWeightedShareDelta',
]);

var PORTFOLIO_STRESS_RESPONSE_INVALID = 'PORTFOLIO_STRESS_RESPONSE_INVALID';

// ── strict primitive readers ─────────────────────────────────────────────────

/**
 * Read a number that the backend actually published as a number.
 *
 * Returns the value only when it is a finite JS number. Everything else —
 * null, undefined, '', '4.2', true, NaN, Infinity, {} — is null. Numeric
 * STRINGS are refused on purpose: the backend publishes numbers, so a string
 * arriving in a numeric field means the shape changed, and quietly parsing it
 * would hide that. Coercion is what turns an unknown into a plausible zero.
 */
function readPortfolioStressNumber(value) {
  return (typeof value === 'number' && isFinite(value)) ? value : null;
}

/**
 * Read a boolean the backend actually published. Anything that is not a real
 * boolean is null — never a truthiness verdict, because `completeness` is a
 * claim about coverage and "missing" is not "false".
 */
function readPortfolioStressBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

/**
 * Read a status token. An unrecognised or absent status is UNAVAILABLE, never
 * VALID: missing information never upgrades a result.
 */
function readPortfolioStressStatus(value) {
  if (value === PORTFOLIO_STRESS_STATUS.VALID) return PORTFOLIO_STRESS_STATUS.VALID;
  if (value === PORTFOLIO_STRESS_STATUS.DEGRADED) return PORTFOLIO_STRESS_STATUS.DEGRADED;
  return PORTFOLIO_STRESS_STATUS.UNAVAILABLE;
}

/** Is this status one whose numbers may be presented as authoritative totals? */
function portfolioStressStatusIsAuthoritative(status) {
  return readPortfolioStressStatus(status) === PORTFOLIO_STRESS_STATUS.VALID;
}

// ── Greek vectors ────────────────────────────────────────────────────────────

/**
 * Read one raw Greek vector.
 *
 *   null / undefined / not an object  ->  null      (withdrawn: not a zero vector)
 *   an object                         ->  { delta, gamma, vega, theta }
 *
 * A component the backend did not publish is null inside the vector. It never
 * becomes 0: a vector with three known components and one unknown is not a
 * vector with a zero fourth component.
 */
function readPortfolioStressGreekVector(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  var out = {};
  for (var i = 0; i < PORTFOLIO_STRESS_GREEK_COMPONENTS.length; i++) {
    var k = PORTFOLIO_STRESS_GREEK_COMPONENTS[i];
    out[k] = readPortfolioStressNumber(value[k]);
  }
  return out;
}

/**
 * Read the raw Greeks of one result set from a matrix cell.
 *
 * `set` is 'actual' | 'overlay' | 'proposed'. The returned object always
 * reports the set it describes, so a caller cannot lose track of which set a
 * vector belongs to and present one under another's name:
 *
 *   { set, values, partialValues, complete, status, authoritative }
 *
 * `values` is the AUTHORITATIVE vector: null unless the backend published one
 * for THIS set. It is never taken from another set. `partialValues` is the
 * computable-but-incomplete vector, under its own name, and is never promoted.
 */
function readPortfolioStressGreekSet(cell, set) {
  var c = (cell && typeof cell === 'object') ? cell : {};
  var raw = (c.rawGreeks && typeof c.rawGreeks === 'object') ? c.rawGreeks : {};
  var partial = (c.partialRawGreeks && typeof c.partialRawGreeks === 'object') ? c.partialRawGreeks : {};
  var completeness = (c.rawGreekCompleteness && typeof c.rawGreekCompleteness === 'object') ? c.rawGreekCompleteness : {};
  var statuses = (c.rawGreekStatus && typeof c.rawGreekStatus === 'object') ? c.rawGreekStatus : {};

  // Read strictly by NAME. There is deliberately no fallback chain here: the
  // Proposed slot is filled from `proposed` or it stays null. Substituting the
  // Overlay would publish a hypothetical structure as the resulting portfolio.
  var values = readPortfolioStressGreekVector(raw[set]);
  var complete = readPortfolioStressBoolean(completeness[set]);
  var status = readPortfolioStressStatus(statuses[set]);

  return {
    set: set,
    values: values,
    partialValues: readPortfolioStressGreekVector(partial[set]),
    // A completeness the backend did not state is not a completeness we may
    // assume; `false` is the honest reading of "unstated".
    complete: complete === null ? false : complete,
    status: status,
    // Three conditions, all required. A DEGRADED vector keeps its numbers but is
    // not authoritative; an UNAVAILABLE one has no numbers to keep.
    authoritative: values !== null && complete === true && portfolioStressStatusIsAuthoritative(status),
  };
}

/**
 * The Proposed raw Greeks, read from the Proposed slot and nowhere else.
 *
 * Named separately because this is the exact substitution the empty-Actual case
 * invites: with `rawGreeks.actual` withdrawn, `rawGreeks.overlay` is the only
 * non-null vector left in the cell.
 */
function readPortfolioStressProposedGreeks(cell) {
  return readPortfolioStressGreekSet(cell, 'proposed');
}

/**
 * The equity share delta. `null` means "we do not know what is held" and is
 * kept distinct from a published 0, which means "no shares are held".
 */
function readPortfolioStressEquityShareDelta(cell) {
  return readPortfolioStressNumber(cell && cell.equityShareDelta);
}

// ── cells and responses ──────────────────────────────────────────────────────

/**
 * Normalize one matrix cell into a shape whose null-ness is trustworthy.
 *
 * Every authoritative field is read strictly; every partial field keeps its
 * `partial*` name; the Greek family is read per set. No field is defaulted, no
 * field is invented, and no field is moved between the authoritative and partial
 * halves.
 */
function normalizePortfolioStressCell(cell) {
  var c = (cell && typeof cell === 'object' && !Array.isArray(cell)) ? cell : {};
  var out = {
    scenarioId: typeof c.scenarioId === 'string' ? c.scenarioId : null,
    status: readPortfolioStressStatus(c.status),
    // The reason an empty or unknown Actual withdrew the figures, when present.
    actualPortfolioEmptyReason: typeof c.actualPortfolioEmptyReason === 'string' ? c.actualPortfolioEmptyReason : null,
    actualStatus: readPortfolioStressStatus(c.actualStatus),
    overlayStatus: readPortfolioStressStatus(c.overlayStatus),
    proposedStatus: readPortfolioStressStatus(c.proposedStatus),
    authoritative: {},
    partial: {},
    rawGreeks: {},
    equityShareDelta: readPortfolioStressEquityShareDelta(c),
    rawGreekUnits: typeof c.rawGreekUnits === 'string' ? c.rawGreekUnits : null,
  };

  var i;
  for (i = 0; i < PORTFOLIO_STRESS_AUTHORITATIVE_CELL_FIELDS.length; i++) {
    var af = PORTFOLIO_STRESS_AUTHORITATIVE_CELL_FIELDS[i];
    out.authoritative[af] = readPortfolioStressNumber(c[af]);
  }
  for (i = 0; i < PORTFOLIO_STRESS_PARTIAL_CELL_FIELDS.length; i++) {
    var pf = PORTFOLIO_STRESS_PARTIAL_CELL_FIELDS[i];
    out.partial[pf] = readPortfolioStressNumber(c[pf]);
  }
  for (i = 0; i < PORTFOLIO_STRESS_RESULT_SETS.length; i++) {
    var set = PORTFOLIO_STRESS_RESULT_SETS[i];
    out.rawGreeks[set] = readPortfolioStressGreekSet(c, set);
  }
  return out;
}

/**
 * Normalize a whole stress response.
 *
 * The raw response is kept under `response` so a future renderer can reach
 * fields this contract does not yet model, but every number this module reports
 * has been through the strict readers above.
 */
function normalizePortfolioStressResponse(response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    var err = new Error(PORTFOLIO_STRESS_RESPONSE_INVALID + ': the stress response is not an object');
    err.name = 'PortfolioStressResponseError';
    err.code = PORTFOLIO_STRESS_RESPONSE_INVALID;
    throw err;
  }
  var cells = Array.isArray(response.matrix) ? response.matrix : [];
  return {
    status: readPortfolioStressStatus(response.status),
    reason: typeof response.reason === 'string' ? response.reason : null,
    cells: cells.map(normalizePortfolioStressCell),
    // An UNAVAILABLE run publishes no matrix; an empty matrix on a VALID run is
    // a real, distinct answer. Both are reported as they are.
    cellCount: cells.length,
    response: response,
  };
}
