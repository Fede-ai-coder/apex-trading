// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI STATE — the pure, DOM-free half of the Stress Test screen.
//
// WHAT THIS IS
//   The scenario grid, the ephemeral overlay, the run lifecycle state machine and
//   the presentation-value derivation for the Portfolio Stress dashboard. Every
//   function here is PURE or operates only on the state object handed to it.
//
// WHAT THIS IS NOT
//   It is not a renderer: it produces no DOM node, no HTML string and no colour.
//   It is not a second engine: it computes no stress P&L, no Greek, no beta, no
//   option price and no NLV. Every number it publishes was read out of a
//   NORMALIZED backend response by js/services/portfolio-stress-response.js.
//   It is not a transport: it makes no request. The panel calls the client.
//
// THE ONE RULE, INHERITED
//   `null` stays `null`. The response contract already withdrew every figure its
//   own producer disowned; the job here is to carry that decision into a
//   presentable form WITHOUT reviving it. So there is no `|| 0`, no `?? 0`, no
//   `Number(...)` and no `parseFloat(...) || 0` anywhere in this file, and an
//   absent figure formats as an em dash — never as zero. A zero and an unknown
//   look nothing alike on screen because they mean opposite things: one is a
//   position that survives the scenario intact, the other is a position whose
//   fate nobody computed.
//
// WHY THE STATE IS SEPARATE FROM THE PANEL
//   The lifecycle rules this file owns — a stale response can never overwrite a
//   newer one, an overlay edit invalidates the displayed result, a revision
//   change invalidates it too — are the rules most likely to be quietly broken by
//   a later edit, and the hardest to test through a DOM. Keeping them in a module
//   with no DOM dependency means the contract suite exercises the REAL rules
//   rather than a re-implementation written to be testable.
//
// LOAD-TIME BEHAVIOUR
//   Classic script, inert at load: constants and function declarations only. No
//   request, no timer, no listener, no DOM access, no storage, no state write.
// ─────────────────────────────────────────────────────────────────────────────

// ── lifecycle ────────────────────────────────────────────────────────────────
// The complete set of phases the screen can be in. DIRTY is deliberately a phase
// and not a flag beside SUCCESS: a result whose inputs have moved is not a
// success that happens to be slightly out of date, and the two must not be
// representable at once.
var PORTFOLIO_STRESS_UI_PHASE = Object.freeze({
  IDLE: 'IDLE',
  DIRTY: 'DIRTY',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  DEGRADED: 'DEGRADED',
  ERROR: 'ERROR',
  ABORTED: 'ABORTED',
});

// Why a displayed result stopped being current. Recorded rather than reduced to a
// boolean so the header can say WHICH input moved.
var PORTFOLIO_STRESS_UI_DIRTY_REASON = Object.freeze({
  PORTFOLIO_CHANGED: 'PORTFOLIO_CHANGED',
  REVISION_CHANGED: 'REVISION_CHANGED',
  SCENARIOS_CHANGED: 'SCENARIOS_CHANGED',
  OVERLAY_CHANGED: 'OVERLAY_CHANGED',
  PRICING_CONFIGURATION_CHANGED: 'PRICING_CONFIGURATION_CHANGED',
  BACKEND_REPORTED_INPUTS_CHANGED: 'BACKEND_REPORTED_INPUTS_CHANGED',
});

// Error classes the screen must tell apart. A contract mismatch and a timeout are
// both "the run failed", and treating them alike is how a divergence gets
// retried forever instead of reported once.
var PORTFOLIO_STRESS_UI_ERROR_KIND = Object.freeze({
  PARITY_DIVERGENCE: 'PARITY_DIVERGENCE',
  INPUTS_CHANGED: 'INPUTS_CHANGED',
  REQUEST_INVALID: 'REQUEST_INVALID',
  TRANSPORT_UNAVAILABLE: 'TRANSPORT_UNAVAILABLE',
  RESPONSE_INVALID: 'RESPONSE_INVALID',
  ABORTED: 'ABORTED',
  BACKEND_ERROR: 'BACKEND_ERROR',
});

// ── scenario vocabulary ──────────────────────────────────────────────────────
// The scenario fields come from the model's scenarioModel block: a scenario is
// (spyReturn | targetSpyPrice), (vixTarget | vixChangePct), horizonDays and
// ivShockMethod. The UI expresses shocks RELATIVELY — spyReturn and vixChangePct
// — because the backend freezes the SPY and VIX levels a run is priced against.
var PORTFOLIO_STRESS_UI_IV_SHOCK_METHODS = Object.freeze(['VIX_PROXY', 'DIRECT_IV_SHOCK']);
var PORTFOLIO_STRESS_UI_DIRECT_IV_SHOCK_MODES = Object.freeze(['RELATIVE', 'VOLATILITY_POINTS']);

// ── the VIX baseline, declared rather than supplied ──────────────────────────
//
// A scenario needs a VIX level to shock FROM. The deployed backend requires one
// of two things: an explicit `vixCurrent`, or a declaration that the baseline is
// the one the backend itself froze for the run.
//
// This UI sends the DECLARATION and never the number. The difference is the
// whole ownership contract:
//
//   • sending `vixCurrent` would make the frontend a second source for a market
//     level the backend freezes per run. Two sources for one run is exactly what
//     PST-SPY-007 forbids for SPY, and the reasoning does not change for VIX. It
//     would also open a window in which the level the UI read and the level the
//     backend froze disagree, silently, with no way to tell from the result;
//
//   • sending BACKEND_FROZEN_SNAPSHOT says "use the baseline you already have",
//     which is a statement about ownership, not a market datum. It cannot go
//     stale, because the frontend never held the value in the first place.
//
// The consequence, and it is deliberate: there is NO code path in this tier that
// reads, fetches, caches or computes a VIX level. The architecture suite asserts
// that absence directly rather than trusting this comment.
var PORTFOLIO_STRESS_UI_VIX_CURRENT_SOURCE = 'BACKEND_FROZEN_SNAPSHOT';

// The EXACT top-level keys of a scenario the UI sends. Declared as a list so a
// contract test can assert the payload is this and nothing else.
var PORTFOLIO_STRESS_UI_SCENARIO_FIELDS = Object.freeze([
  'scenarioId', 'spyReturn', 'vixChangePct', 'vixCurrentSource', 'horizonDays', 'ivShockMethod',
]);

// UI PRESETS, not model semantics. The minimum grid the model pins is SPY
// 0/-5/-10/-15/-20% by VIX current/+50%/+100%/+200%; these defaults contain it
// and add two upside SPY columns so the base case is not the edge of the table.
// They are starting values for a control the user edits, never a claim about
// which scenarios matter.
var PORTFOLIO_STRESS_UI_DEFAULT_SPY_RETURNS = Object.freeze([0.10, 0.05, 0, -0.05, -0.10, -0.15, -0.20]);
var PORTFOLIO_STRESS_UI_DEFAULT_VIX_CHANGE_PCTS = Object.freeze([0, 0.25, 0.50, 1.00, 2.00]);
var PORTFOLIO_STRESS_UI_DEFAULT_HORIZON_DAYS = 1;
var PORTFOLIO_STRESS_UI_DEFAULT_IV_SHOCK_METHOD = 'VIX_PROXY';

// The minimum grid the model requires, kept here so a test can prove the default
// grid CONTAINS it rather than merely looking similar to it.
var PORTFOLIO_STRESS_UI_MINIMUM_SPY_RETURNS = Object.freeze([0, -0.05, -0.10, -0.15, -0.20]);
var PORTFOLIO_STRESS_UI_MINIMUM_VIX_CHANGE_PCTS = Object.freeze([0, 0.50, 1.00, 2.00]);

// A grid larger than this is refused before a request is built. Not a performance
// guess: the run is ONE batch request, and the limit exists so a mistyped grid
// cannot ask the backend to price ten thousand scenarios in one call.
var PORTFOLIO_STRESS_UI_MAX_SCENARIOS = 100;

// ── overlay vocabulary ───────────────────────────────────────────────────────
// PST-OVERLAY-002: every hypothetical leg carries these seven fields. The list is
// the payload contract — a leg is exactly this and nothing more.
var PORTFOLIO_STRESS_UI_LEG_FIELDS = Object.freeze([
  'underlying', 'expiration', 'strike', 'optionType', 'side', 'contracts', 'contractMultiplier',
]);
var PORTFOLIO_STRESS_UI_OPTION_TYPES = Object.freeze(['CALL', 'PUT']);
var PORTFOLIO_STRESS_UI_SIDES = Object.freeze(['LONG', 'SHORT']);
var PORTFOLIO_STRESS_UI_DEFAULT_CONTRACT_MULTIPLIER = 100;

// ── the state object ─────────────────────────────────────────────────────────

/**
 * A fresh, empty screen state.
 *
 * `result` holds the NORMALIZED response of the last run that was allowed to
 * land. `resultFingerprint` records the inputs that produced it, so "are the
 * inputs still the ones this result describes?" is answered by comparing two
 * strings rather than by trusting a flag somebody remembered to set.
 */
function createPortfolioStressUiState() {
  return {
    phase: PORTFOLIO_STRESS_UI_PHASE.IDLE,
    portfolioId: null,
    portfolioRevision: null,
    scenarioGrid: {
      spyReturns: PORTFOLIO_STRESS_UI_DEFAULT_SPY_RETURNS.slice(),
      vixChangePcts: PORTFOLIO_STRESS_UI_DEFAULT_VIX_CHANGE_PCTS.slice(),
      horizonDays: PORTFOLIO_STRESS_UI_DEFAULT_HORIZON_DAYS,
      ivShockMethod: PORTFOLIO_STRESS_UI_DEFAULT_IV_SHOCK_METHOD,
    },
    overlayLegs: [],
    pricingConfiguration: {},
    // Monotonic run identity. A response is only allowed to land if it carries
    // the id of the run that is still current; see acceptResult below.
    runSeq: 0,
    activeRunId: null,
    result: null,
    resultFingerprint: null,
    resultRanAt: null,
    resultPortfolioId: null,
    resultPortfolioRevision: null,
    error: null,
    dirtyReasons: [],
    selectedScenarioId: null,
  };
}

// ── scenario grid ────────────────────────────────────────────────────────────

/**
 * A stable, human-readable identity for one cell of the grid.
 *
 * Deterministic on purpose: the response carries `scenarioId` and nothing else
 * that identifies a cell, so the id is the ONLY join between the grid the user
 * sees and the numbers the backend computed. Building it from the two shocks —
 * at fixed precision, so 0.1 and 0.10 cannot produce two different ids for one
 * cell — means the join cannot drift as the grid is edited.
 */
function portfolioStressUiScenarioId(spyReturn, vixChangePct) {
  return 'spy' + _portfolioStressUiSignedPct(spyReturn) + '_vix' + _portfolioStressUiSignedPct(vixChangePct);
}

function _portfolioStressUiSignedPct(fraction) {
  var pct = fraction * 100;
  var sign = pct < 0 ? '-' : '+';
  return sign + Math.abs(pct).toFixed(2);
}

/**
 * Expand the grid into the scenario array the request carries.
 *
 * ONE array containing EVERY cell: the matrix is computed by the backend in a
 * single batch run (PST-MATRIX-001), so this is the only place scenarios are
 * enumerated and there is no per-cell request anywhere in this feature.
 *
 * Row-major: VIX changes across the columns, SPY down the rows, which is the
 * order the panel renders and therefore the order a reader can follow.
 */
function buildPortfolioStressUiScenarios(grid) {
  var g = (grid && typeof grid === 'object') ? grid : {};
  var spyReturns = Array.isArray(g.spyReturns) ? g.spyReturns : [];
  var vixChangePcts = Array.isArray(g.vixChangePcts) ? g.vixChangePcts : [];
  var horizonDays = _portfolioStressUiFiniteOrNull(g.horizonDays);
  var ivShockMethod = PORTFOLIO_STRESS_UI_IV_SHOCK_METHODS.indexOf(g.ivShockMethod) !== -1
    ? g.ivShockMethod
    : PORTFOLIO_STRESS_UI_DEFAULT_IV_SHOCK_METHOD;
  var out = [];
  var seen = {};
  for (var r = 0; r < spyReturns.length; r++) {
    var spy = _portfolioStressUiFiniteOrNull(spyReturns[r]);
    if (spy === null) continue;
    for (var c = 0; c < vixChangePcts.length; c++) {
      var vix = _portfolioStressUiFiniteOrNull(vixChangePcts[c]);
      if (vix === null) continue;
      var id = portfolioStressUiScenarioId(spy, vix);
      // A duplicated cell would send the backend two scenarios with one id and
      // make the response ambiguous. Dropping the duplicate keeps the id a key.
      if (Object.prototype.hasOwnProperty.call(seen, id)) continue;
      seen[id] = true;
      out.push({
        scenarioId: id,
        spyReturn: spy,
        vixChangePct: vix,
        // The baseline the shock applies to is the backend's own frozen one.
        // Declared on EVERY scenario, not once per request: the backend
        // validates scenarios individually, and a per-request declaration would
        // leave each scenario ambiguous on its own terms.
        vixCurrentSource: PORTFOLIO_STRESS_UI_VIX_CURRENT_SOURCE,
        horizonDays: horizonDays === null ? PORTFOLIO_STRESS_UI_DEFAULT_HORIZON_DAYS : horizonDays,
        ivShockMethod: ivShockMethod,
      });
    }
  }
  return out;
}

/** The default grid, as a fresh mutable object. */
function portfolioStressUiDefaultGrid() {
  return {
    spyReturns: PORTFOLIO_STRESS_UI_DEFAULT_SPY_RETURNS.slice(),
    vixChangePcts: PORTFOLIO_STRESS_UI_DEFAULT_VIX_CHANGE_PCTS.slice(),
    horizonDays: PORTFOLIO_STRESS_UI_DEFAULT_HORIZON_DAYS,
    ivShockMethod: PORTFOLIO_STRESS_UI_DEFAULT_IV_SHOCK_METHOD,
  };
}

/**
 * Parse a user-typed percentage list ("-20, -10, 0, +5") into fractions.
 *
 * Returns { values, errors }. A token that is not a well-formed number is an
 * ERROR, never a silently dropped entry and never a zero: a grid that quietly
 * lost the row the user cared about is worse than one that refuses to run.
 */
function parsePortfolioStressUiPercentList(text) {
  var raw = (typeof text === 'string') ? text : '';
  var parts = raw.split(',');
  var values = [];
  var errors = [];
  for (var i = 0; i < parts.length; i++) {
    var token = parts[i].trim().replace(/%$/, '').trim();
    if (!token) continue;
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(token)) {
      errors.push(token);
      continue;
    }
    var pct = parseFloat(token);
    if (!isFinite(pct)) { errors.push(token); continue; }
    values.push(pct / 100);
  }
  return { values: values, errors: errors };
}

/**
 * A strict read of a single numeric control, or null.
 *
 * Exposed rather than kept private because the panel needs the SAME strictness
 * its list parser uses: a horizon field that read '' as 0 would silently price
 * every scenario at expiry.
 */
function parsePortfolioStressUiNumberInput(text) {
  return _portfolioStressUiStrictNumber(text);
}

/** Render a fraction list back into the text the control shows. */
function formatPortfolioStressUiPercentList(values) {
  var list = Array.isArray(values) ? values : [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var v = _portfolioStressUiFiniteOrNull(list[i]);
    if (v === null) continue;
    out.push(_portfolioStressUiTrimZeros((v * 100).toFixed(2)));
  }
  return out.join(', ');
}

// ── overlay builder ──────────────────────────────────────────────────────────

/**
 * Validate one hypothetical leg and return it in the EXACT payload shape.
 *
 * Returns { ok, leg, errors }. Nothing is defaulted into existence: a missing
 * strike is an error, not a zero, and an unparseable contract count is an error,
 * not a one. The backend's own default-to-one hazard is named in the data-quality
 * contract; the same trap in the builder would be no better.
 *
 * `contracts` is always POSITIVE here and the direction lives in `side`. The
 * signed quantity is the backend's to derive (PST-OVERLAY-004, applied exactly
 * once) — a frontend that pre-signed the count would risk it being signed twice.
 */
function validatePortfolioStressUiLeg(input) {
  var src = (input && typeof input === 'object') ? input : {};
  var errors = [];

  var underlying = (typeof src.underlying === 'string') ? src.underlying.trim().toUpperCase() : '';
  if (!underlying) errors.push({ field: 'underlying', message: 'is required' });
  else if (!/^[A-Z][A-Z0-9.\-/]{0,15}$/.test(underlying)) {
    errors.push({ field: 'underlying', message: 'is not a valid symbol' });
  }

  var expiration = (typeof src.expiration === 'string') ? src.expiration.trim() : '';
  if (!expiration) errors.push({ field: 'expiration', message: 'is required' });
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(expiration)) {
    errors.push({ field: 'expiration', message: 'must be an ISO date (YYYY-MM-DD)' });
  } else if (!_portfolioStressUiIsRealDate(expiration)) {
    errors.push({ field: 'expiration', message: 'is not a real calendar date' });
  }

  var strike = _portfolioStressUiStrictNumber(src.strike);
  if (strike === null) errors.push({ field: 'strike', message: 'is required and must be a number' });
  else if (strike <= 0) errors.push({ field: 'strike', message: 'must be greater than zero' });

  var optionType = (typeof src.optionType === 'string') ? src.optionType.trim().toUpperCase() : '';
  if (PORTFOLIO_STRESS_UI_OPTION_TYPES.indexOf(optionType) === -1) {
    errors.push({ field: 'optionType', message: 'must be CALL or PUT' });
  }

  var side = (typeof src.side === 'string') ? src.side.trim().toUpperCase() : '';
  if (PORTFOLIO_STRESS_UI_SIDES.indexOf(side) === -1) {
    errors.push({ field: 'side', message: 'must be LONG or SHORT' });
  }

  var contracts = _portfolioStressUiStrictNumber(src.contracts);
  if (contracts === null) errors.push({ field: 'contracts', message: 'is required and must be a number' });
  else if (!(contracts > 0)) errors.push({ field: 'contracts', message: 'must be greater than zero — direction is carried by side' });
  else if (Math.floor(contracts) !== contracts) errors.push({ field: 'contracts', message: 'must be a whole number of contracts' });

  var multiplier = src.contractMultiplier === undefined || src.contractMultiplier === null || src.contractMultiplier === ''
    ? PORTFOLIO_STRESS_UI_DEFAULT_CONTRACT_MULTIPLIER
    : _portfolioStressUiStrictNumber(src.contractMultiplier);
  if (multiplier === null) errors.push({ field: 'contractMultiplier', message: 'must be a number' });
  else if (!(multiplier > 0)) errors.push({ field: 'contractMultiplier', message: 'must be greater than zero' });

  if (errors.length) return { ok: false, leg: null, errors: errors };

  return {
    ok: true,
    errors: [],
    leg: {
      underlying: underlying,
      expiration: expiration,
      strike: strike,
      optionType: optionType,
      side: side,
      contracts: contracts,
      contractMultiplier: multiplier,
    },
  };
}

/**
 * Add a validated leg to the EPHEMERAL overlay.
 *
 * Ephemeral means exactly that: the legs live in the state object for as long as
 * the page does. Nothing here writes to the Journal, to the portfolio, to the
 * backend trade store, to localStorage or to an order path, and there is no
 * "save overlay" anywhere in this feature by design (PST-OVERLAY-003).
 */
function addPortfolioStressUiLeg(state, input) {
  var v = validatePortfolioStressUiLeg(input);
  if (!v.ok) return { ok: false, errors: v.errors };
  state.overlayLegs = state.overlayLegs.concat([v.leg]);
  markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.OVERLAY_CHANGED);
  return { ok: true, errors: [], leg: v.leg };
}

function removePortfolioStressUiLeg(state, index) {
  if (!Array.isArray(state.overlayLegs)) return false;
  if (typeof index !== 'number' || index < 0 || index >= state.overlayLegs.length) return false;
  state.overlayLegs = state.overlayLegs.slice(0, index).concat(state.overlayLegs.slice(index + 1));
  markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.OVERLAY_CHANGED);
  return true;
}

function clearPortfolioStressUiOverlay(state) {
  if (!Array.isArray(state.overlayLegs) || !state.overlayLegs.length) return false;
  state.overlayLegs = [];
  markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.OVERLAY_CHANGED);
  return true;
}

// ── request construction ─────────────────────────────────────────────────────

/**
 * The input object handed to runPortfolioStressTestRequest().
 *
 * It carries the five fields that client accepts and NOTHING else. In
 * particular it never carries positions, a market snapshot or a SPY price: the
 * backend hydrates the portfolio from `portfolioId` and freezes its own market,
 * and the client refuses those fields anyway.
 */
function buildPortfolioStressUiRequestInput(state) {
  return {
    portfolioId: state.portfolioId,
    portfolioRevision: state.portfolioRevision,
    scenarios: buildPortfolioStressUiScenarios(state.scenarioGrid),
    overlay: { legs: Array.isArray(state.overlayLegs) ? state.overlayLegs.slice() : [] },
    pricingConfiguration: (state.pricingConfiguration && typeof state.pricingConfiguration === 'object')
      ? state.pricingConfiguration
      : {},
  };
}

/**
 * Why a run cannot be started right now, or null when it can.
 *
 * `portfolioRevision` is the interesting one. The frontend has no revision owner
 * of its own and must not invent one: a run pinned to a made-up revision would
 * defeat the backend's own staleness check, which is the mechanism that makes
 * INPUTS CHANGED detectable at all. So when the selected portfolio publishes no
 * revision, the run is BLOCKED with that reason stated, rather than dispatched
 * with a placeholder.
 */
function portfolioStressUiRunBlockedReason(state) {
  if (!state.portfolioId) return 'No portfolio is selected.';
  if (!state.portfolioRevision) {
    return 'The selected portfolio publishes no revision, and a stress run must be pinned to one. ' +
      'Refresh the portfolio from the backend; if the revision is still absent the backend has not published one for it.';
  }
  var scenarios = buildPortfolioStressUiScenarios(state.scenarioGrid);
  if (!scenarios.length) return 'The scenario grid is empty.';
  if (scenarios.length > PORTFOLIO_STRESS_UI_MAX_SCENARIOS) {
    return 'The scenario grid has ' + scenarios.length + ' cells, above the ' +
      PORTFOLIO_STRESS_UI_MAX_SCENARIOS + '-cell limit for a single run.';
  }
  return null;
}

// ── portfolio revision ───────────────────────────────────────────────────────

// The fields a backend portfolio record may publish its revision under, in
// precedence order. Declared as a list so a contract test pins the precedence,
// and so the screen can report WHICH field a run was pinned to.
//
// Every entry is a value the BACKEND published on the portfolio record. None is
// computed here. That distinction is the whole point: the backend compares the
// revision a request claims against the portfolio it loads and answers 409 when
// they disagree, so a revision the frontend derived for itself would satisfy the
// check by construction and silently disable the one guard that detects a
// portfolio moving underneath a run.
var PORTFOLIO_STRESS_UI_REVISION_FIELDS = Object.freeze([
  'portfolioRevision', 'revision', 'updatedAt', 'updated_at',
]);

/**
 * The revision a run against this portfolio must be pinned to.
 *
 * Returns { revision, field } — or { revision: null, field: null } when the
 * record publishes none, which is a BLOCKED run and not a run with a made-up
 * revision. Own properties only: a revision inherited from a polluted prototype
 * is not something the backend sent.
 */
function resolvePortfolioStressUiRevision(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return { revision: null, field: null };
  for (var i = 0; i < PORTFOLIO_STRESS_UI_REVISION_FIELDS.length; i++) {
    var field = PORTFOLIO_STRESS_UI_REVISION_FIELDS[i];
    if (!Object.prototype.hasOwnProperty.call(portfolio, field)) continue;
    var raw = portfolio[field];
    if (typeof raw === 'string' && raw.trim()) return { revision: raw.trim(), field: field };
    if (typeof raw === 'number' && isFinite(raw)) return { revision: String(raw), field: field };
  }
  return { revision: null, field: null };
}

// ── staleness ────────────────────────────────────────────────────────────────

/**
 * A stable string identifying every input a run depends on.
 *
 * Compared, not interpreted. If it differs from the fingerprint recorded with
 * the displayed result then the result describes inputs that no longer exist,
 * and the screen must say so instead of presenting it as current.
 */
function portfolioStressUiInputsFingerprint(state) {
  var scenarios = buildPortfolioStressUiScenarios(state.scenarioGrid);
  return JSON.stringify({
    portfolioId: state.portfolioId,
    portfolioRevision: state.portfolioRevision,
    scenarios: scenarios,
    overlay: Array.isArray(state.overlayLegs) ? state.overlayLegs : [],
    pricingConfiguration: (state.pricingConfiguration && typeof state.pricingConfiguration === 'object')
      ? state.pricingConfiguration : {},
  });
}

/**
 * Mark the displayed result as no longer describing the current inputs.
 *
 * The result is NOT discarded. A previous run is useful evidence — it is simply
 * not current, and the screen labels it so. What is forbidden is recomputing it
 * in the browser to "bring it up to date": there is no frontend engine to do
 * that with, and inventing one is the thing this whole feature is built to avoid.
 */
function markPortfolioStressUiDirty(state, reason) {
  if (reason && state.dirtyReasons.indexOf(reason) === -1) state.dirtyReasons.push(reason);
  if (state.phase === PORTFOLIO_STRESS_UI_PHASE.SUCCESS
    || state.phase === PORTFOLIO_STRESS_UI_PHASE.DEGRADED
    || state.phase === PORTFOLIO_STRESS_UI_PHASE.DIRTY) {
    state.phase = PORTFOLIO_STRESS_UI_PHASE.DIRTY;
  }
  return state.phase;
}

/** True when a result is on screen and its inputs have moved since it was produced. */
function portfolioStressUiResultIsStale(state) {
  if (!state.result) return false;
  if (state.resultFingerprint === null) return false;
  return state.resultFingerprint !== portfolioStressUiInputsFingerprint(state);
}

/**
 * Point the screen at a portfolio, dirtying any displayed result when it moved.
 *
 * Both the id and the revision are watched: the same portfolio with a new
 * revision is a different set of positions, and treating it as unchanged is
 * exactly how a matrix outlives the portfolio it describes.
 */
function setPortfolioStressUiPortfolio(state, portfolioId, portfolioRevision) {
  var id = (typeof portfolioId === 'string' && portfolioId) ? portfolioId
    : (typeof portfolioId === 'number' ? String(portfolioId) : null);
  var rev = (typeof portfolioRevision === 'string' && portfolioRevision) ? portfolioRevision : null;
  var idChanged = id !== state.portfolioId;
  var revChanged = rev !== state.portfolioRevision;
  state.portfolioId = id;
  state.portfolioRevision = rev;
  if (idChanged) markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.PORTFOLIO_CHANGED);
  else if (revChanged) markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.REVISION_CHANGED);
  return { idChanged: idChanged, revisionChanged: revChanged };
}

function setPortfolioStressUiScenarioGrid(state, grid) {
  var before = JSON.stringify(buildPortfolioStressUiScenarios(state.scenarioGrid));
  state.scenarioGrid = {
    spyReturns: Array.isArray(grid.spyReturns) ? grid.spyReturns.slice() : [],
    vixChangePcts: Array.isArray(grid.vixChangePcts) ? grid.vixChangePcts.slice() : [],
    horizonDays: grid.horizonDays,
    ivShockMethod: grid.ivShockMethod,
  };
  var after = JSON.stringify(buildPortfolioStressUiScenarios(state.scenarioGrid));
  if (before !== after) markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.SCENARIOS_CHANGED);
  return before !== after;
}

// ── run lifecycle ────────────────────────────────────────────────────────────

/**
 * Open a new run and return its id.
 *
 * The id is a monotonically increasing counter, and it is the ONLY thing that
 * decides which response may land. A second run started while the first is in
 * flight increments it, so the first run's response — which may still arrive,
 * abort signals being advisory rather than instantaneous — is recognised as
 * belonging to a superseded run and dropped.
 */
function beginPortfolioStressUiRun(state) {
  state.runSeq += 1;
  state.activeRunId = state.runSeq;
  state.phase = PORTFOLIO_STRESS_UI_PHASE.LOADING;
  state.error = null;
  return state.activeRunId;
}

/**
 * Land a successful result, IF it belongs to the run that is still current.
 *
 * Returns true when the result was accepted. A stale response returns false and
 * changes nothing at all — not the phase, not the result, not the error. The
 * ordering guarantee this provides is the one that matters: whichever response
 * arrives last, the one on screen is always the newest run's.
 *
 * The phase is DEGRADED, not SUCCESS, when the response says so or when any cell
 * reported a contract violation. A degraded run is a real result with a caveat,
 * and it must never be presented as a clean one.
 */
function acceptPortfolioStressUiResult(state, runId, result, fingerprint) {
  if (runId !== state.activeRunId) return false;
  state.activeRunId = null;
  state.result = result;
  state.resultFingerprint = (typeof fingerprint === 'string') ? fingerprint : null;
  state.resultRanAt = new Date().toISOString();
  state.resultPortfolioId = state.portfolioId;
  state.resultPortfolioRevision = state.portfolioRevision;
  state.error = null;
  state.dirtyReasons = [];
  state.phase = portfolioStressUiResultIsDegraded(result)
    ? PORTFOLIO_STRESS_UI_PHASE.DEGRADED
    : PORTFOLIO_STRESS_UI_PHASE.SUCCESS;
  if (!state.selectedScenarioId || !portfolioStressUiFindCell(result, state.selectedScenarioId)) {
    state.selectedScenarioId = _portfolioStressUiFirstScenarioId(result);
  }
  return true;
}

/**
 * Land a failure, IF it belongs to the run that is still current.
 *
 * An ABORT is not an error state to be recovered from — it is the expected
 * outcome of the user starting a newer run, so it does not clear the result that
 * is on screen. The distinction matters: showing "run failed" because the user
 * clicked Rerun would be a lie about a healthy system.
 */
function acceptPortfolioStressUiError(state, runId, classified) {
  if (runId !== state.activeRunId) return false;
  state.activeRunId = null;
  if (classified.kind === PORTFOLIO_STRESS_UI_ERROR_KIND.ABORTED) {
    state.phase = PORTFOLIO_STRESS_UI_PHASE.ABORTED;
    state.error = classified;
    return true;
  }
  state.error = classified;
  state.phase = PORTFOLIO_STRESS_UI_PHASE.ERROR;
  if (classified.kind === PORTFOLIO_STRESS_UI_ERROR_KIND.INPUTS_CHANGED) {
    if (state.dirtyReasons.indexOf(PORTFOLIO_STRESS_UI_DIRTY_REASON.BACKEND_REPORTED_INPUTS_CHANGED) === -1) {
      state.dirtyReasons.push(PORTFOLIO_STRESS_UI_DIRTY_REASON.BACKEND_REPORTED_INPUTS_CHANGED);
    }
  }
  return true;
}

/**
 * Classify a rejection from the client into something the screen can act on.
 *
 * `httpStatus` comes from the canonical owner `_httpStatusFromError` in
 * js/api/backend-client.js — this module does not parse HTTP status out of a
 * message itself, because a second parser would drift from the first.
 *
 * A parity divergence is BLOCKING: the response describes a different portfolio
 * vocabulary, so its numbers are not a degraded version of the right answer,
 * they are the right answer to a different question. The matrix is not rendered.
 */
function classifyPortfolioStressUiError(err, httpStatus) {
  var code = (err && typeof err.code === 'string') ? err.code : '';
  var name = (err && typeof err.name === 'string') ? err.name : '';
  var message = (err && typeof err.message === 'string') ? err.message : 'The stress run failed.';

  if (code === 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE' || /PORTFOLIO_SCOPE_PARITY_DIVERGENCE/.test(message)) {
    return {
      kind: PORTFOLIO_STRESS_UI_ERROR_KIND.PARITY_DIVERGENCE,
      blocking: true,
      title: 'Frontend / backend contract mismatch — update required',
      message: message,
      mismatches: (err && Array.isArray(err.mismatches)) ? err.mismatches : [],
    };
  }
  if (code === 'PORTFOLIO_STRESS_ABORTED' || name === 'AbortError') {
    return {
      kind: PORTFOLIO_STRESS_UI_ERROR_KIND.ABORTED,
      blocking: false,
      title: 'Run aborted',
      message: 'The run was superseded or cancelled.',
    };
  }
  if (httpStatus === 409) {
    return {
      kind: PORTFOLIO_STRESS_UI_ERROR_KIND.INPUTS_CHANGED,
      blocking: false,
      title: 'Inputs changed — rerun required',
      message: 'The backend rejected the run because the portfolio moved after the revision this run was pinned to. ' +
        'Refresh the portfolio and run again.',
    };
  }
  if (code === 'PORTFOLIO_STRESS_REQUEST_INVALID') {
    return {
      kind: PORTFOLIO_STRESS_UI_ERROR_KIND.REQUEST_INVALID,
      blocking: false,
      title: 'The run request was refused before it was sent',
      message: message,
      errors: (err && Array.isArray(err.errors)) ? err.errors : [],
    };
  }
  if (code === 'PORTFOLIO_STRESS_TRANSPORT_UNAVAILABLE') {
    return {
      kind: PORTFOLIO_STRESS_UI_ERROR_KIND.TRANSPORT_UNAVAILABLE,
      blocking: true,
      title: 'The backend client is not available',
      message: message,
    };
  }
  if (code === 'PORTFOLIO_STRESS_RESPONSE_INVALID') {
    return {
      kind: PORTFOLIO_STRESS_UI_ERROR_KIND.RESPONSE_INVALID,
      blocking: true,
      title: 'The backend response did not match the response contract',
      message: message,
    };
  }
  return {
    kind: PORTFOLIO_STRESS_UI_ERROR_KIND.BACKEND_ERROR,
    blocking: false,
    title: 'The stress run failed',
    message: message,
    httpStatus: (typeof httpStatus === 'number') ? httpStatus : null,
  };
}

// ── reading a normalized result ──────────────────────────────────────────────

/** True when the run, or any cell in it, is anything less than clean. */
function portfolioStressUiResultIsDegraded(result) {
  if (!result) return false;
  if (result.status === 'DEGRADED' || result.status === 'UNAVAILABLE') return true;
  if (Array.isArray(result.contractViolations) && result.contractViolations.length) return true;
  var cells = Array.isArray(result.cells) ? result.cells : [];
  for (var i = 0; i < cells.length; i++) {
    if (cells[i].status === 'DEGRADED' || cells[i].status === 'UNAVAILABLE') return true;
  }
  return false;
}

/** The normalized cell for a scenario id, or null when the backend returned none. */
function portfolioStressUiFindCell(result, scenarioId) {
  if (!result || !Array.isArray(result.cells)) return null;
  for (var i = 0; i < result.cells.length; i++) {
    if (result.cells[i].scenarioId === scenarioId) return result.cells[i];
  }
  return null;
}

function _portfolioStressUiFirstScenarioId(result) {
  if (!result || !Array.isArray(result.cells) || !result.cells.length) return null;
  for (var i = 0; i < result.cells.length; i++) {
    if (typeof result.cells[i].scenarioId === 'string') return result.cells[i].scenarioId;
  }
  return null;
}

/**
 * Everything the renderer needs about ONE authoritative field of ONE cell.
 *
 * The value is taken from `values` — what may be shown at all — while
 * `authoritative` records whether it may be shown as a settled total. Both come
 * from the response contract; neither is recomputed here.
 *
 * A missing cell yields status UNAVAILABLE and value null, which is the honest
 * answer: the backend returned no result for that scenario, and the screen must
 * show that rather than an empty-looking zero.
 */
function readPortfolioStressUiField(cell, field) {
  if (!cell || typeof cell !== 'object') {
    return { value: null, status: 'UNAVAILABLE', authoritative: false, present: false };
  }
  var values = (cell.values && typeof cell.values === 'object') ? cell.values : {};
  var authoritative = (cell.authoritative && typeof cell.authoritative === 'object') ? cell.authoritative : {};
  var value = Object.prototype.hasOwnProperty.call(values, field) ? values[field] : null;
  var authValue = Object.prototype.hasOwnProperty.call(authoritative, field) ? authoritative[field] : null;
  return {
    value: value,
    status: _portfolioStressUiFieldStatus(cell, field),
    authoritative: authValue !== null,
    present: true,
  };
}

// The governing status of a field is the status of the result SET it belongs to,
// which the response contract already published per cell. The mapping is read
// from that published authority rather than restated, so a field that moves
// between sets cannot end up governed by the wrong one here.
var PORTFOLIO_STRESS_UI_FIELD_SET = Object.freeze({
  actualStressPnl: 'actual',
  actualStressPnlPctNlv: 'actual',
  rawBetaWeightedShareDelta: 'actual',
  equityShareDelta: 'actual',
  overlayStressPnl: 'overlay',
  overlayDebitCredit: 'overlay',
  overlayContribution: 'overlay',
  proposedStressPnl: 'proposed',
  proposedStressPnlPctNlv: 'proposed',
  difference: 'difference',
  incrementalEffect: 'difference',
});

function _portfolioStressUiFieldStatus(cell, field) {
  var set = PORTFOLIO_STRESS_UI_FIELD_SET[field];
  if (!set) return 'UNAVAILABLE';
  var authority = (cell.setAuthority && typeof cell.setAuthority === 'object') ? cell.setAuthority[set] : null;
  if (!authority || typeof authority.status !== 'string') return 'UNAVAILABLE';
  return authority.status;
}

// ── presentation ─────────────────────────────────────────────────────────────
// Formatters. They turn a value into text; they never turn an absence into a
// number. Every one of them takes the null path FIRST.

var PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT = '—';

/** Currency, or an em dash. Never "$0" for an unknown. */
function formatPortfolioStressUiCurrency(value) {
  if (value === null || value === undefined) return PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT;
  if (typeof value !== 'number' || !isFinite(value)) return PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT;
  var sign = value < 0 ? '-' : (value > 0 ? '+' : '');
  var abs = Math.abs(value);
  var body = abs >= 1000
    ? abs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : abs.toFixed(2);
  return sign + '$' + body;
}

/** A percentage, or an em dash. The input is a FRACTION. */
function formatPortfolioStressUiPercent(value, digits) {
  if (value === null || value === undefined) return PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT;
  if (typeof value !== 'number' || !isFinite(value)) return PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT;
  var d = (typeof digits === 'number') ? digits : 2;
  var sign = value < 0 ? '-' : (value > 0 ? '+' : '');
  return sign + Math.abs(value * 100).toFixed(d) + '%';
}

/** A plain number, or an em dash. */
function formatPortfolioStressUiNumber(value, digits) {
  if (value === null || value === undefined) return PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT;
  if (typeof value !== 'number' || !isFinite(value)) return PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT;
  var d = (typeof digits === 'number') ? digits : 2;
  return value.toFixed(d);
}

/**
 * The sign class of a value, for a renderer that must not use colour ALONE.
 *
 * Returns 'pos' | 'neg' | 'zero' | 'none'. 'none' is not 'zero': the first means
 * nothing is known and the second means the scenario costs nothing, and a screen
 * that renders them identically has destroyed the distinction the whole response
 * contract exists to preserve.
 */
function portfolioStressUiSignClass(value) {
  if (value === null || value === undefined) return 'none';
  if (typeof value !== 'number' || !isFinite(value)) return 'none';
  if (value > 0) return 'pos';
  if (value < 0) return 'neg';
  return 'zero';
}

// ── internals ────────────────────────────────────────────────────────────────

function _portfolioStressUiFiniteOrNull(value) {
  return (typeof value === 'number' && isFinite(value)) ? value : null;
}

/**
 * A strict numeric read of USER INPUT — a number, or a well-formed numeric
 * string, or null. Deliberately not `Number()` or a bare `parseFloat`: the first
 * turns null and '' into 0 and true into 1, the second reads '3abc' as 3.
 */
function _portfolioStressUiStrictNumber(value) {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  var t = value.trim();
  if (!t) return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  var n = parseFloat(t);
  return isFinite(n) ? n : null;
}

function _portfolioStressUiIsRealDate(iso) {
  var parts = iso.split('-');
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  var probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

function _portfolioStressUiTrimZeros(text) {
  return text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
