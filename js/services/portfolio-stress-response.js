// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS RESPONSE CONTRACT — null-safe, status-bound reader.
//
// WHAT THIS IS
//   A normalizer/validator for the authoritative fields of a stress-run
//   response. It is NOT a formatter: nothing here produces a string, a colour,
//   a percentage or a DOM node.
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
// STATUS IS BINDING, NOT DECORATIVE
//   A number is not authoritative because it is a number. Every field belongs to
//   a RESULT SET, each set publishes a status and a completeness, and the two
//   together decide what may be presented:
//
//       VALID        the number is exposed; authoritative when the set is also
//                    complete
//       DEGRADED     the number is kept — a degraded figure is a real figure
//                    with a caveat — but it is NEVER authoritative
//       UNAVAILABLE  the number is WITHDRAWN. The exposed value is null even
//                    when the payload carries a finite number
//
//   That last line is the point. A response like
//
//       { actualStatus: 'UNAVAILABLE', actualStressPnl: 123 }
//
//   is self-contradictory, and 123 is not a smaller loss — it is a number whose
//   own producer says it should not be read. Earlier revisions of this module
//   read the status and the number independently, so that payload produced a
//   presentable 123. It now withdraws the number, exposes null, and records a
//   CONTRACT VIOLATION in the diagnostics rather than failing the whole run: a
//   caller that can see the violation can report it, while a hard rejection
//   would throw away the sets that were perfectly well-formed.
//
// THE GREEK FAMILY, SPECIFICALLY
//   The backend withdraws the Actual and Proposed Greeks when the Actual
//   portfolio is empty or unknown, and leaves the Overlay exactly as the Overlay
//   earned it. With `rawGreeks.actual` gone, `rawGreeks.overlay` is the only
//   non-null vector left in the cell, so any fallback chain publishes the
//   hypothetical structure AS the resulting portfolio:
//
//                    Proposed Greeks = Overlay Greeks
//
//   is therefore forbidden here, unconditionally. `proposed` is read from
//   `proposed` or it is null.
//
// THE RAW RESPONSE IS NOT EXPOSED
//   This module used to return the backend object under `response`, "so a future
//   renderer can reach fields this contract does not model". That is an escape
//   hatch with a normalizer bolted beside it: `result.response.matrix` bypasses
//   every rule above, and it is the path of least resistance for anyone in a
//   hurry. Only allowlisted, normalized values leave this module, and the result
//   holds no reference to the object it was built from — mutating the backend
//   payload afterwards cannot change an already-normalized result.
//
// LOAD-TIME BEHAVIOUR
//   Classic script, inert at load: constants and function declarations only.
// ─────────────────────────────────────────────────────────────────────────────

var PORTFOLIO_STRESS_STATUS = Object.freeze({
  VALID: 'VALID',
  DEGRADED: 'DEGRADED',
  UNAVAILABLE: 'UNAVAILABLE',
});

var PORTFOLIO_STRESS_RESULT_SETS = Object.freeze(['actual', 'overlay', 'proposed']);
var PORTFOLIO_STRESS_GREEK_COMPONENTS = Object.freeze(['delta', 'gamma', 'vega', 'theta']);

// ── THE field → result-set map ───────────────────────────────────────────────
// Every authoritative scalar names the set whose status and completeness govern
// it. A field missing from this map is not readable as authoritative at all,
// which is deliberate: an unmapped field would otherwise be governed by nothing.
var PORTFOLIO_STRESS_FIELD_SET = Object.freeze({
  actualStressPnl: 'actual',
  actualCurrentValue: 'actual',
  actualStressedValue: 'actual',
  actualStressPnlPctNlv: 'actual',
  equityShareDelta: 'actual',
  rawBetaWeightedShareDelta: 'actual',
  longPutContribution: 'actual',
  shortPutPnl: 'actual',
  longCallPnl: 'actual',
  shortCallPnl: 'actual',
  equityEtfPnl: 'actual',

  overlayStressPnl: 'overlay',
  overlayDebitCredit: 'overlay',
  overlayContribution: 'overlay',

  proposedStressPnl: 'proposed',
  proposedStressPnlPctNlv: 'proposed',
  currentValue: 'proposed',
  stressedValue: 'proposed',

  // A difference from an unknown baseline is unknown: BOTH sides must be usable.
  difference: 'difference',
  incrementalEffect: 'difference',
});

var PORTFOLIO_STRESS_AUTHORITATIVE_CELL_FIELDS = Object.freeze(Object.keys(PORTFOLIO_STRESS_FIELD_SET));

// ── metric-specific status, on top of the result set ─────────────────────────
// Three fields carry a SECOND status of their own, because the set they belong
// to can be perfectly healthy while the metric is not computable:
//
//   • the two %-of-NLV figures need an NLV. The Actual P&L can be VALID and
//     complete while the NLV is missing, and dividing by an invented NLV — or
//     publishing the numerator as if it were a percentage — is worse than saying
//     nothing. The backend already says so with `pctNlvStatus`; this tier used to
//     ignore it and present the number anyway.
//
//   • the beta-weighted share delta needs SPY, the equity spot AND a beta. Any
//     one of them missing withdraws the figure while the Actual set stays VALID.
//
// A field listed here is governed by the WORST of its set status and its metric
// status. The direction is one-way on purpose: a metric status can only ever
// take authority AWAY. A VALID metric status over a DEGRADED set does not make
// the number authoritative — the number is still built on a degraded set.
var PORTFOLIO_STRESS_FIELD_METRIC_STATUS = Object.freeze({
  actualStressPnlPctNlv: 'pctNlvStatus',
  proposedStressPnlPctNlv: 'pctNlvStatus',
  rawBetaWeightedShareDelta: 'rawBetaWeightedShareDeltaStatus',
});

// The metric statuses, and the reasons that explain them, republished in
// normalized form. A consumer must be able to see WHY a figure was withdrawn
// without being handed the raw response to rummage through.
var PORTFOLIO_STRESS_METRIC_STATUS_FIELDS = Object.freeze([
  'pctNlvStatus', 'rawBetaWeightedShareDeltaStatus',
]);
var PORTFOLIO_STRESS_METRIC_REASON_FIELDS = Object.freeze([
  'rawBetaWeightedShareDeltaReason',
]);

// Their partial counterparts, so a reader can find the partial that belongs to
// an authoritative field WITHOUT guessing a name.
var PORTFOLIO_STRESS_PARTIAL_CELL_FIELDS = Object.freeze([
  'partialActualStressPnl', 'partialOverlayStressPnl', 'partialProposedStressPnl',
  'partialCurrentValue', 'partialStressedValue',
  'partialOverlayDebitCredit', 'partialOverlayContribution',
  'partialRawBetaWeightedShareDelta',
]);

// Metadata that may leave this module. An allowlist, not a filter: an unmodelled
// backend object is never carried through just because it happened to be there.
var PORTFOLIO_STRESS_METADATA_FIELDS = Object.freeze([
  'requestId', 'modelVersion', 'portfolioId', 'portfolioRevision',
  'snapshotId', 'snapshotCompletedAt', 'snapshotStartedAt',
  'cacheStatus', 'rawGreekUnits',
]);

var PORTFOLIO_STRESS_RESPONSE_INVALID = 'PORTFOLIO_STRESS_RESPONSE_INVALID';
var PORTFOLIO_STRESS_CONTRACT_VIOLATION = 'PORTFOLIO_STRESS_CONTRACT_VIOLATION';

// ── strict primitive readers ─────────────────────────────────────────────────

/**
 * Read a number the backend actually published as a number.
 *
 * Numeric STRINGS are refused on purpose: the backend publishes numbers, so a
 * string in a numeric field means the shape changed, and quietly parsing it
 * would hide that.
 */
function readPortfolioStressNumber(value) {
  return (typeof value === 'number' && isFinite(value)) ? value : null;
}

/** A real boolean, or null. `completeness` is a claim, and "missing" is not "false". */
function readPortfolioStressBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

/** An unrecognised or absent status is UNAVAILABLE: missing information never upgrades. */
function readPortfolioStressStatus(value) {
  if (value === PORTFOLIO_STRESS_STATUS.VALID) return PORTFOLIO_STRESS_STATUS.VALID;
  if (value === PORTFOLIO_STRESS_STATUS.DEGRADED) return PORTFOLIO_STRESS_STATUS.DEGRADED;
  return PORTFOLIO_STRESS_STATUS.UNAVAILABLE;
}

function portfolioStressStatusIsAuthoritative(status) {
  return readPortfolioStressStatus(status) === PORTFOLIO_STRESS_STATUS.VALID;
}

/**
 * Read an OWN property, or undefined.
 *
 * The backend sends a JSON object; anything reachable only through the
 * prototype chain was not sent. Reading it would let a polluted prototype
 * supply a status AND the number that status authorises — for every cell at
 * once, invisibly.
 */
function readPortfolioStressOwn(obj, key) {
  if (obj === null || typeof obj !== 'object') return undefined;
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

/** Worst of two statuses, ordered VALID < DEGRADED < UNAVAILABLE. */
function portfolioStressWorstStatus(a, b) {
  var rank = { VALID: 0, DEGRADED: 1, UNAVAILABLE: 2 };
  var sa = readPortfolioStressStatus(a);
  var sb = readPortfolioStressStatus(b);
  return rank[sa] >= rank[sb] ? sa : sb;
}

// ── per-set status and completeness ──────────────────────────────────────────

/**
 * The status and completeness governing one result set.
 *
 * `difference` is not a published set: it is the worst of Actual and Proposed,
 * and complete only when both are. A difference computed from an unknown
 * baseline is unknown however well-formed the subtraction was.
 */
function readPortfolioStressSetAuthority(cell, set) {
  var c = (cell && typeof cell === 'object') ? cell : {};
  if (set === 'difference') {
    var a = readPortfolioStressSetAuthority(c, 'actual');
    var p = readPortfolioStressSetAuthority(c, 'proposed');
    return {
      set: 'difference',
      status: portfolioStressWorstStatus(a.status, p.status),
      complete: a.complete === true && p.complete === true,
    };
  }
  var complete = readPortfolioStressBoolean(readPortfolioStressOwn(c, set + 'Complete'));
  return {
    set: set,
    status: readPortfolioStressStatus(readPortfolioStressOwn(c, set + 'Status')),
    // A completeness the backend did not state is not one we may assume.
    complete: complete === null ? false : complete,
  };
}

// ── the governed read ────────────────────────────────────────────────────────

/**
 * Read one authoritative scalar under the authority of its result set.
 *
 * Returns { value, status, authoritative, violation }:
 *   value         the number, or null when the set withdrew it
 *   status        the governing set's status
 *   authoritative VALID AND complete AND a real number
 *   violation     set when the payload contradicts its own status
 */
function readPortfolioStressGovernedNumber(cell, field) {
  var set = PORTFOLIO_STRESS_FIELD_SET[field];
  if (!set) return { value: null, status: PORTFOLIO_STRESS_STATUS.UNAVAILABLE, authoritative: false, violation: null };
  var authority = readPortfolioStressSetAuthority(cell, set);
  var raw = readPortfolioStressNumber(readPortfolioStressOwn(cell, field));

  // The metric's OWN status, where it has one. Absent for most fields, in which
  // case this is a no-op and the set alone governs.
  var metricField = PORTFOLIO_STRESS_FIELD_METRIC_STATUS[field] || null;
  var metricStatus = metricField === null
    ? null
    : readPortfolioStressStatus(readPortfolioStressOwn(cell, metricField));

  // Worst wins. A metric status can only take authority away, never grant it:
  // `portfolioStressWorstStatus` is monotone, so a VALID pctNlvStatus over a
  // DEGRADED actual set still yields DEGRADED.
  var effective = metricStatus === null
    ? authority.status
    : portfolioStressWorstStatus(authority.status, metricStatus);

  if (effective === PORTFOLIO_STRESS_STATUS.UNAVAILABLE) {
    // WITHDRAWN. A number here contradicts its own producer, so it is reported
    // as a contract violation and never as a value. Naming the metric field when
    // it is the one that withdrew the figure matters: "actualStatus is VALID but
    // the number vanished" is exactly the report that sends someone hunting in
    // the wrong place.
    var withdrewBecauseOfMetric = metricStatus === PORTFOLIO_STRESS_STATUS.UNAVAILABLE
      && authority.status !== PORTFOLIO_STRESS_STATUS.UNAVAILABLE;
    return {
      value: null,
      status: effective,
      metricStatus: metricStatus,
      authoritative: false,
      violation: raw === null ? null : {
        code: PORTFOLIO_STRESS_CONTRACT_VIOLATION,
        field: field,
        set: set,
        metricStatusField: withdrewBecauseOfMetric ? metricField : null,
        detail: withdrewBecauseOfMetric
          ? 'a finite number was published under an UNAVAILABLE ' + metricField + ' and has been withdrawn'
          : 'a finite number was published under an UNAVAILABLE result set and has been withdrawn',
      },
    };
  }

  return {
    value: raw,
    status: effective,
    metricStatus: metricStatus,
    authoritative: raw !== null
      && portfolioStressStatusIsAuthoritative(effective)
      && authority.complete === true,
    violation: null,
  };
}

// ── Greek vectors ────────────────────────────────────────────────────────────

/**
 * Read one raw Greek vector. A component the backend did not publish is null
 * inside the vector; it never becomes 0.
 */
function readPortfolioStressGreekVector(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  var out = {};
  for (var i = 0; i < PORTFOLIO_STRESS_GREEK_COMPONENTS.length; i++) {
    var k = PORTFOLIO_STRESS_GREEK_COMPONENTS[i];
    out[k] = readPortfolioStressNumber(readPortfolioStressOwn(value, k));
  }
  return out;
}

/**
 * Read the raw Greeks of one result set, under the same status authority as the
 * scalars.
 *
 * `values` is read strictly BY NAME. There is deliberately no fallback chain:
 * the Proposed slot is filled from `proposed` or it stays null. Substituting the
 * Overlay would publish a hypothetical structure as the resulting portfolio.
 */
function readPortfolioStressGreekSet(cell, set) {
  var c = (cell && typeof cell === 'object') ? cell : {};
  var rawObj = readPortfolioStressOwn(c, 'rawGreeks');
  var partialObj = readPortfolioStressOwn(c, 'partialRawGreeks');
  var completenessObj = readPortfolioStressOwn(c, 'rawGreekCompleteness');
  var statusObj = readPortfolioStressOwn(c, 'rawGreekStatus');
  // An ARRAY is not a result object: `[1,2,3]` has no named sets, and reading it
  // as one would silently answer with undefined for every set.
  var raw = (rawObj && typeof rawObj === 'object' && !Array.isArray(rawObj)) ? rawObj : {};
  var partial = (partialObj && typeof partialObj === 'object' && !Array.isArray(partialObj)) ? partialObj : {};
  var completeness = (completenessObj && typeof completenessObj === 'object' && !Array.isArray(completenessObj)) ? completenessObj : {};
  var statuses = (statusObj && typeof statusObj === 'object' && !Array.isArray(statusObj)) ? statusObj : {};

  var status = readPortfolioStressStatus(readPortfolioStressOwn(statuses, set));
  var complete = readPortfolioStressBoolean(readPortfolioStressOwn(completeness, set));
  var vector = readPortfolioStressGreekVector(readPortfolioStressOwn(raw, set));
  var violation = null;

  if (status === PORTFOLIO_STRESS_STATUS.UNAVAILABLE && vector !== null) {
    // Same rule as the scalars: an UNAVAILABLE vector is withdrawn, whatever
    // numbers it carries.
    violation = {
      code: PORTFOLIO_STRESS_CONTRACT_VIOLATION,
      field: 'rawGreeks.' + set,
      set: set,
      detail: 'a Greek vector was published under an UNAVAILABLE status and has been withdrawn',
    };
    vector = null;
  }

  return {
    set: set,
    values: vector,
    partialValues: readPortfolioStressGreekVector(readPortfolioStressOwn(partial, set)),
    complete: complete === null ? false : complete,
    status: status,
    authoritative: vector !== null && complete === true && portfolioStressStatusIsAuthoritative(status),
    violation: violation,
  };
}

/**
 * The Proposed raw Greeks, read from the Proposed slot and nowhere else. Named
 * separately because this is the exact substitution the empty-Actual case
 * invites.
 */
function readPortfolioStressProposedGreeks(cell) {
  return readPortfolioStressGreekSet(cell, 'proposed');
}

// ── cells and responses ──────────────────────────────────────────────────────

/**
 * Normalize one matrix cell. Every authoritative field is read under its set's
 * authority; every partial keeps its `partial*` name; the Greek family is read
 * per set. No field is defaulted, invented, or moved between the authoritative
 * and partial halves.
 */
function normalizePortfolioStressCell(cell) {
  var c = (cell && typeof cell === 'object' && !Array.isArray(cell)) ? cell : {};
  var violations = [];
  var out = {
    scenarioId: typeof readPortfolioStressOwn(c, 'scenarioId') === 'string' ? c.scenarioId : null,
    status: readPortfolioStressStatus(readPortfolioStressOwn(c, 'status')),
    actualPortfolioEmptyReason: typeof readPortfolioStressOwn(c, 'actualPortfolioEmptyReason') === 'string'
      ? c.actualPortfolioEmptyReason : null,
    setAuthority: {},
    // The metric-specific statuses and reasons, normalized. Published so a
    // consumer can tell "the Actual set is fine but there is no NLV" apart from
    // "the Actual set is unusable" — the raw response is never handed over, so
    // this is the only place that distinction can survive.
    metricAuthority: {},
    authoritative: {},
    values: {},
    partial: {},
    rawGreeks: {},
    rawGreekUnits: typeof readPortfolioStressOwn(c, 'rawGreekUnits') === 'string' ? c.rawGreekUnits : null,
    contractViolations: violations,
  };

  var i;
  for (i = 0; i < PORTFOLIO_STRESS_RESULT_SETS.length; i++) {
    out.setAuthority[PORTFOLIO_STRESS_RESULT_SETS[i]] = readPortfolioStressSetAuthority(c, PORTFOLIO_STRESS_RESULT_SETS[i]);
  }
  out.setAuthority.difference = readPortfolioStressSetAuthority(c, 'difference');

  // An unpublished metric status reads UNAVAILABLE, like every other status
  // here: a metric the backend said nothing about is not a metric we may show.
  for (i = 0; i < PORTFOLIO_STRESS_METRIC_STATUS_FIELDS.length; i++) {
    var msf = PORTFOLIO_STRESS_METRIC_STATUS_FIELDS[i];
    out.metricAuthority[msf] = readPortfolioStressStatus(readPortfolioStressOwn(c, msf));
  }
  for (i = 0; i < PORTFOLIO_STRESS_METRIC_REASON_FIELDS.length; i++) {
    var mrf = PORTFOLIO_STRESS_METRIC_REASON_FIELDS[i];
    var reason = readPortfolioStressOwn(c, mrf);
    out.metricAuthority[mrf] = typeof reason === 'string' ? reason : null;
  }

  for (i = 0; i < PORTFOLIO_STRESS_AUTHORITATIVE_CELL_FIELDS.length; i++) {
    var field = PORTFOLIO_STRESS_AUTHORITATIVE_CELL_FIELDS[i];
    var read = readPortfolioStressGovernedNumber(c, field);
    // `values` carries what may be shown at all (null when withdrawn);
    // `authoritative` carries only what may be shown as a TOTAL.
    out.values[field] = read.value;
    out.authoritative[field] = read.authoritative ? read.value : null;
    if (read.violation) violations.push(read.violation);
  }

  for (i = 0; i < PORTFOLIO_STRESS_PARTIAL_CELL_FIELDS.length; i++) {
    var pf = PORTFOLIO_STRESS_PARTIAL_CELL_FIELDS[i];
    out.partial[pf] = readPortfolioStressNumber(readPortfolioStressOwn(c, pf));
  }

  for (i = 0; i < PORTFOLIO_STRESS_RESULT_SETS.length; i++) {
    var set = PORTFOLIO_STRESS_RESULT_SETS[i];
    var greeks = readPortfolioStressGreekSet(c, set);
    if (greeks.violation) violations.push(greeks.violation);
    out.rawGreeks[set] = greeks;
  }
  return out;
}

/**
 * Normalize a whole stress response.
 *
 * The backend object is READ and discarded. What comes back is allowlisted
 * metadata plus normalized cells — never the payload, and never a reference into
 * it, so a later mutation of the response cannot change an existing result.
 */
function normalizePortfolioStressResponse(response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    var err = new Error(PORTFOLIO_STRESS_RESPONSE_INVALID + ': the stress response is not an object');
    err.name = 'PortfolioStressResponseError';
    err.code = PORTFOLIO_STRESS_RESPONSE_INVALID;
    throw err;
  }
  var matrix = readPortfolioStressOwn(response, 'matrix');
  var cells = Array.isArray(matrix) ? matrix : [];
  var normalizedCells = cells.map(normalizePortfolioStressCell);
  var metadata = {};
  for (var i = 0; i < PORTFOLIO_STRESS_METADATA_FIELDS.length; i++) {
    var k = PORTFOLIO_STRESS_METADATA_FIELDS[i];
    var v = Object.prototype.hasOwnProperty.call(response, k) ? response[k] : null;
    // Scalars only. An unmodelled object would smuggle the payload back in
    // under a metadata name.
    metadata[k] = (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') ? v : null;
  }
  var violations = [];
  for (i = 0; i < normalizedCells.length; i++) {
    violations = violations.concat(normalizedCells[i].contractViolations);
  }
  return {
    status: readPortfolioStressStatus(readPortfolioStressOwn(response, 'status')),
    reason: typeof readPortfolioStressOwn(response, 'reason') === 'string' ? response.reason : null,
    metadata: metadata,
    cells: normalizedCells,
    cellCount: normalizedCells.length,
    contractViolations: violations,
  };
}
