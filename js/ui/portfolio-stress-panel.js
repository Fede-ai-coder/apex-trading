// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS PANEL — the renderer and the run controller.
//
// WHAT THIS IS
//   The visible half of the Portfolio Stress Test screen: the header, the
//   scenario controls, the matrix, the Actual-vs-Proposed comparison and the
//   ephemeral overlay builder. It renders, it wires the controls, and it drives
//   ONE run at a time through the existing client.
//
// WHAT IT IS NOT, AND CANNOT BECOME
//   There is no arithmetic on a result anywhere in this file. Not a sum, not a
//   difference, not a percentage of NLV, not a Greek, not a beta, not an option
//   price. Every number on screen was computed by the backend, verified by
//   js/services/portfolio-stress-parity.js and normalized by
//   js/services/portfolio-stress-response.js before it got here. The only
//   numeric work done in this file is formatting, and the formatters live in
//   js/services/portfolio-stress-ui-state.js where they can be tested without a
//   DOM.
//
// ONE CLIENT, ONE ENDPOINT, ONE BATCH
//   The only backend call in this file is runPortfolioStressTestRequest(). There
//   is no fetch, no XMLHttpRequest, no WebSocket and no direct ttCall: the
//   client owns dispatch and the transport owner owns HTTP. The whole matrix is
//   ONE request carrying every scenario — never one request per cell — so a
//   larger grid costs a bigger response, not more round trips.
//
// NOTHING RUNS BY ITSELF
//   No polling, no interval, no timer, no fetch at load, no run on page load and
//   no automatic rerun. A run happens because the user asked for one. When an
//   input moves, the screen marks the displayed result STALE and says so; it
//   never quietly re-runs, and it never recomputes the old result to "refresh"
//   it, because there is no engine here to do that with.
//
// EVENTS ARE INLINE HANDLERS, DELIBERATELY
//   The controls use `onclick`/`onchange` attributes on freshly rendered markup,
//   which is this repository's established panel convention. It also means the
//   panel attaches no persistent listener to anything it does not own, so
//   re-rendering cannot accumulate handlers and leaving the tab cannot leak one.
//
// LOAD-TIME BEHAVIOUR
//   Classic script, inert at load: constants and function declarations only. It
//   touches the DOM when the view is opened, never while it loads.
// ─────────────────────────────────────────────────────────────────────────────

var PSTX_MOUNT_ID = 'view-stress';

// The single ephemeral state object for the screen, created on first open.
// Ephemeral in the strict sense: it lives in this variable and nowhere else. It
// is never written to localStorage, to the Journal, to the portfolio or to the
// backend, and it does not survive a reload — which is exactly what a
// hypothetical overlay should do.
var _pstxState = null;

// The AbortController of the run currently in flight, or null.
var _pstxAbort = null;

// The last draft the leg form held, so a re-render does not wipe half-typed
// input. It is form state, not overlay state: nothing here reaches a request
// until the user adds the leg.
var _pstxLegDraft = null;

// ── lifecycle entry points (called by showView) ──────────────────────────────

/**
 * Open the screen. Idempotent: re-entering the tab re-syncs and re-renders, and
 * never starts a run.
 */
function pstxPanelOpen() {
  var st = pstxEnsureState();
  pstxSyncPortfolio(st);
  pstxRender();
}

/**
 * Leave the screen.
 *
 * An in-flight run is ABORTED rather than left to finish invisibly. That matches
 * the lifecycle the other views already follow — the dashboard tears its
 * scanner down on exit — and it means no backend work continues on behalf of a
 * screen nobody is looking at. The state object, the scenario grid and the
 * overlay all survive, so returning to the tab finds the screen as it was.
 */
function pstxPanelClose() {
  if (_pstxAbort) {
    try { _pstxAbort.abort(); } catch (e) {}
    _pstxAbort = null;
  }
}

function pstxEnsureState() {
  if (!_pstxState) _pstxState = createPortfolioStressUiState();
  return _pstxState;
}

/**
 * Point the screen at the portfolio the application currently has selected.
 *
 * The selection is READ from the existing owners — `_activePanelPortfolioId` and
 * `portfolioManager` — and never mirrored into a second portfolio state here.
 * A change to either the id or the backend-published revision marks the
 * displayed result stale.
 */
function pstxSyncPortfolio(st) {
  var id = (typeof _activePanelPortfolioId !== 'undefined' && _activePanelPortfolioId != null)
    ? String(_activePanelPortfolioId) : null;
  var record = null;
  if (id && typeof portfolioManager !== 'undefined' && portfolioManager
      && typeof portfolioManager.getById === 'function') {
    record = portfolioManager.getById(id);
  }
  var resolved = resolvePortfolioStressUiRevision(record);
  st.portfolioName = (record && typeof record.name === 'string') ? record.name : null;
  st.portfolioRevisionField = resolved.field;
  setPortfolioStressUiPortfolio(st, id, resolved.revision);
}

// ── the run ──────────────────────────────────────────────────────────────────

/**
 * Run the stress test once.
 *
 * Ordering, and it is the point of the whole function:
 *   1. a run already in flight is ABORTED, and the state machine opens a NEW run
 *      id, so the older run is doubly disqualified from landing — its signal is
 *      aborted AND its id no longer matches;
 *   2. the fingerprint of the inputs is captured BEFORE dispatch, and stored
 *      with the result, so "did the inputs move since this was computed?" is
 *      answered against what was actually sent;
 *   3. the response is accepted only if its run id is still the current one.
 *
 * There is no retry here. A failed run is reported and the user decides — an
 * automatic retry against a backend that just rejected the request is how a
 * single bad input becomes a request storm.
 */
function pstxRun() {
  var st = pstxEnsureState();
  pstxSyncPortfolio(st);

  var blocked = portfolioStressUiRunBlockedReason(st);
  if (blocked) {
    st.error = { kind: 'REQUEST_INVALID', blocking: false, title: 'Cannot run', message: blocked };
    st.phase = PORTFOLIO_STRESS_UI_PHASE.ERROR;
    pstxRender();
    return;
  }

  if (_pstxAbort) {
    try { _pstxAbort.abort(); } catch (e) {}
  }
  var ctrl = new AbortController();
  _pstxAbort = ctrl;

  var input = buildPortfolioStressUiRequestInput(st);
  var fingerprint = portfolioStressUiInputsFingerprint(st);
  var runId = beginPortfolioStressUiRun(st);
  pstxRender();

  runPortfolioStressTestRequest(input, { signal: ctrl.signal }).then(function (result) {
    if (_pstxAbort === ctrl) _pstxAbort = null;
    if (acceptPortfolioStressUiResult(st, runId, result, fingerprint)) pstxRender();
  }, function (err) {
    if (_pstxAbort === ctrl) _pstxAbort = null;
    // The canonical HTTP-status reader in js/api/backend-client.js. A second
    // status parser here would drift from the one every other caller uses.
    var status = (typeof _httpStatusFromError === 'function') ? _httpStatusFromError(err) : null;
    if (acceptPortfolioStressUiError(st, runId, classifyPortfolioStressUiError(err, status))) pstxRender();
  });
}

// ── control handlers ─────────────────────────────────────────────────────────

function pstxApplyGrid() {
  var st = pstxEnsureState();
  var spyEl = document.getElementById('pstx-spy-list');
  var vixEl = document.getElementById('pstx-vix-list');
  var horizonEl = document.getElementById('pstx-horizon');
  var methodEl = document.getElementById('pstx-ivmethod');
  var spy = parsePortfolioStressUiPercentList(spyEl ? spyEl.value : '');
  var vix = parsePortfolioStressUiPercentList(vixEl ? vixEl.value : '');
  st.gridErrors = spy.errors.concat(vix.errors);
  if (st.gridErrors.length) { pstxRender(); return; }
  // A blank or malformed horizon KEEPS the current one. It never falls back to
  // zero, which would silently price every scenario at expiry.
  var horizon = parsePortfolioStressUiNumberInput(horizonEl ? horizonEl.value : '');
  setPortfolioStressUiScenarioGrid(st, {
    spyReturns: spy.values,
    vixChangePcts: vix.values,
    horizonDays: horizon === null ? st.scenarioGrid.horizonDays : horizon,
    ivShockMethod: methodEl ? methodEl.value : st.scenarioGrid.ivShockMethod,
  });
  pstxRender();
}

function pstxResetGrid() {
  var st = pstxEnsureState();
  st.gridErrors = [];
  setPortfolioStressUiScenarioGrid(st, portfolioStressUiDefaultGrid());
  pstxRender();
}

function pstxSelectCell(scenarioId) {
  var st = pstxEnsureState();
  st.selectedScenarioId = (st.selectedScenarioId === scenarioId) ? null : scenarioId;
  pstxRender();
}

function pstxReadLegForm() {
  return {
    underlying: pstxInputValue('pstx-leg-underlying'),
    expiration: pstxInputValue('pstx-leg-expiration'),
    strike: pstxInputValue('pstx-leg-strike'),
    optionType: pstxInputValue('pstx-leg-type'),
    side: pstxInputValue('pstx-leg-side'),
    contracts: pstxInputValue('pstx-leg-contracts'),
    contractMultiplier: pstxInputValue('pstx-leg-multiplier'),
  };
}

function pstxAddLeg() {
  var st = pstxEnsureState();
  var draft = pstxReadLegForm();
  var res = addPortfolioStressUiLeg(st, draft);
  st.legErrors = res.errors;
  _pstxLegDraft = res.ok ? null : draft;
  pstxRender();
}

function pstxRemoveLeg(index) {
  var st = pstxEnsureState();
  removePortfolioStressUiLeg(st, index);
  pstxRender();
}

function pstxClearOverlay() {
  var st = pstxEnsureState();
  clearPortfolioStressUiOverlay(st);
  st.legErrors = [];
  pstxRender();
}

// ── rendering ────────────────────────────────────────────────────────────────

/**
 * Repaint the whole screen from state.
 *
 * A full repaint rather than a set of targeted patches: the screen is small, the
 * state is the single source of truth, and a patch that forgets one element is
 * how a stale number survives a rerun.
 */
function pstxRender() {
  var mount = document.getElementById(PSTX_MOUNT_ID);
  if (!mount) return;
  var st = pstxEnsureState();
  var html = pstxHeaderHtml(st) +
    pstxBannersHtml(st) +
    pstxControlsHtml(st) +
    pstxOverlayHtml(st);
  // A blocking error means the response cannot be trusted to describe THIS
  // portfolio. The matrix and the comparison are withheld entirely — a warning
  // banner above a rendered matrix would still be showing the numbers.
  if (!pstxHasBlockingError(st)) {
    html += pstxMatrixHtml(st) + pstxCompareHtml(st);
  }
  mount.innerHTML = '<div class="pstx-wrap">' + html + '</div>';
}

function pstxHasBlockingError(st) {
  return !!(st.error && st.error.blocking === true);
}

function pstxHeaderHtml(st) {
  var stale = portfolioStressUiResultIsStale(st);
  var meta = st.result ? st.result.metadata : null;
  var running = st.phase === PORTFOLIO_STRESS_UI_PHASE.LOADING;
  var blocked = portfolioStressUiRunBlockedReason(st);

  return '<div class="pstx-head">' +
    '<div class="pstx-title">PORTFOLIO STRESS</div>' +
    pstxPhaseBadge(st, stale) +
    '<div class="pstx-head-meta">' +
      pstxKv('Portfolio', pstxEsc(st.portfolioName || st.portfolioId || '—')) +
      pstxKv('Revision', pstxEsc(st.portfolioRevision || '—') +
        (st.portfolioRevisionField ? ' <span class="pstx-b pstx-b-muted">' + pstxEsc(st.portfolioRevisionField) + '</span>' : '')) +
      pstxKv('Run at', pstxEsc(st.resultRanAt || '—')) +
      pstxKv('Snapshot', pstxEsc((meta && meta.snapshotCompletedAt) || '—')) +
      pstxKv('Model', pstxEsc((meta && meta.modelVersion) || '—')) +
      pstxKv('Scope parity', pstxEsc(PORTFOLIO_SCOPE_PARITY_MANIFEST_VERSION)) +
    '</div>' +
    '<div class="pstx-row" style="gap:6px">' +
      '<button class="pstx-btn pstx-btn-primary" onclick="pstxRun()"' +
        (running || blocked ? ' disabled' : '') + '>' +
        (st.result ? 'RERUN' : 'RUN STRESS TEST') + '</button>' +
      (running ? '<button class="pstx-btn pstx-btn-danger" onclick="pstxPanelClose();pstxRender()">ABORT</button>' : '') +
    '</div>' +
  '</div>';
}

function pstxPhaseBadge(st, stale) {
  if (st.phase === PORTFOLIO_STRESS_UI_PHASE.LOADING) return '<span class="pstx-b pstx-b-info">RUNNING</span>';
  if (stale || st.phase === PORTFOLIO_STRESS_UI_PHASE.DIRTY) return '<span class="pstx-b pstx-b-warn">RERUN REQUIRED</span>';
  if (st.phase === PORTFOLIO_STRESS_UI_PHASE.ERROR) return '<span class="pstx-b pstx-b-err">ERROR</span>';
  if (st.phase === PORTFOLIO_STRESS_UI_PHASE.ABORTED) return '<span class="pstx-b pstx-b-muted">ABORTED</span>';
  if (st.phase === PORTFOLIO_STRESS_UI_PHASE.DEGRADED) return '<span class="pstx-b pstx-b-warn">DEGRADED</span>';
  if (st.phase === PORTFOLIO_STRESS_UI_PHASE.SUCCESS) return '<span class="pstx-b pstx-b-ok">CURRENT</span>';
  return '<span class="pstx-b pstx-b-muted">IDLE</span>';
}

function pstxBannersHtml(st) {
  var out = '';
  var stale = portfolioStressUiResultIsStale(st);

  if (stale || st.phase === PORTFOLIO_STRESS_UI_PHASE.DIRTY) {
    out += '<div class="pstx-banner pstx-banner-warn">' +
      '<span class="pstx-banner-strong">INPUTS CHANGED — RERUN REQUIRED</span>' +
      '<span>The result below is from a previous run and does not describe the current inputs' +
      (st.dirtyReasons && st.dirtyReasons.length ? ' (' + pstxEsc(st.dirtyReasons.join(', ')) + ')' : '') +
      '. It is not recomputed in the browser.</span></div>';
  }
  if (st.error) {
    out += '<div class="pstx-banner ' + (st.error.blocking ? 'pstx-banner-err' : 'pstx-banner-warn') + '">' +
      '<span class="pstx-banner-strong">' + pstxEsc(st.error.title || 'Error') + '</span>' +
      '<span>' + pstxEsc(st.error.message || '') + '</span>' +
      (st.error.blocking ? '<span class="pstx-b pstx-b-err">MATRIX WITHHELD</span>' : '') +
      '</div>';
  }
  var violations = (st.result && Array.isArray(st.result.contractViolations)) ? st.result.contractViolations : [];
  if (violations.length) {
    out += '<div class="pstx-banner pstx-banner-warn">' +
      '<span class="pstx-banner-strong">' + violations.length + ' CONTRACT VIOLATION' + (violations.length === 1 ? '' : 'S') + '</span>' +
      '<span>The backend published figures that contradict their own status. They have been withdrawn: ' +
      pstxEsc(violations.slice(0, 3).map(function (v) { return v.field; }).join(', ')) +
      (violations.length > 3 ? ' and ' + (violations.length - 3) + ' more' : '') + '.</span></div>';
  }
  if (st.result && st.result.reason) {
    out += '<div class="pstx-banner pstx-banner-info"><span class="pstx-banner-strong">BACKEND REASON</span>' +
      '<span>' + pstxEsc(st.result.reason) + '</span></div>';
  }
  return out;
}

function pstxControlsHtml(st) {
  var grid = st.scenarioGrid;
  var scenarios = buildPortfolioStressUiScenarios(grid);
  var errs = Array.isArray(st.gridErrors) ? st.gridErrors : [];
  return '<div class="pstx-card">' +
    '<div class="pstx-card-title">Scenario grid — ' + scenarios.length + ' cells, one batch run</div>' +
    '<div class="pstx-row">' +
      pstxField('SPY return %', '<input class="pstx-input pstx-input-wide" id="pstx-spy-list" value="' +
        pstxEsc(formatPortfolioStressUiPercentList(grid.spyReturns)) + '">') +
      pstxField('VIX change %', '<input class="pstx-input pstx-input-wide" id="pstx-vix-list" value="' +
        pstxEsc(formatPortfolioStressUiPercentList(grid.vixChangePcts)) + '">') +
      pstxField('Horizon days', '<input class="pstx-input" id="pstx-horizon" value="' +
        pstxEsc(String(grid.horizonDays)) + '">') +
      pstxField('IV shock', '<select class="pstx-select" id="pstx-ivmethod">' +
        PORTFOLIO_STRESS_UI_IV_SHOCK_METHODS.map(function (m) {
          return '<option value="' + m + '"' + (grid.ivShockMethod === m ? ' selected' : '') + '>' + m + '</option>';
        }).join('') + '</select>') +
      '<button class="pstx-btn" onclick="pstxApplyGrid()">APPLY</button>' +
      '<button class="pstx-btn" onclick="pstxResetGrid()">RESET DEFAULTS</button>' +
    '</div>' +
    (errs.length ? '<ul class="pstx-errs"><li>Not a number: ' + pstxEsc(errs.join(', ')) + '</li></ul>' : '') +
    '<div class="pstx-empty">Presets are illustrative hypotheses, not forecasts. Shocks are expressed relative to the ' +
      'SPY and VIX levels the backend freezes for the run.</div>' +
  '</div>';
}

// ── matrix ───────────────────────────────────────────────────────────────────

/**
 * The matrix: SPY down the rows, VIX across the columns.
 *
 * A cell is rendered from the backend's cell for that scenarioId. When the
 * backend returned no cell for a scenario the grid asked about, the cell says
 * MISSING — it does not render a blank that reads as zero.
 */
function pstxMatrixHtml(st) {
  var grid = st.scenarioGrid;
  var spyReturns = grid.spyReturns;
  var vixChangePcts = grid.vixChangePcts;

  if (!st.result) {
    return '<div class="pstx-card"><div class="pstx-card-title">Stress matrix</div>' +
      '<div class="pstx-empty">No run yet. The matrix is computed by the backend in a single batch request.</div></div>';
  }

  var head = '<thead><tr><th class="pstx-corner">SPY \\ VIX</th>';
  for (var c = 0; c < vixChangePcts.length; c++) {
    head += '<th>' + pstxEsc(formatPortfolioStressUiPercent(vixChangePcts[c], 0)) +
      (vixChangePcts[c] === 0 ? '<br><span class="pstx-cell-sub">current</span>' : '') + '</th>';
  }
  head += '</tr></thead>';

  var body = '<tbody>';
  for (var r = 0; r < spyReturns.length; r++) {
    body += '<tr><th class="pstx-rowhead">' + pstxEsc(formatPortfolioStressUiPercent(spyReturns[r], 0)) + '</th>';
    for (var k = 0; k < vixChangePcts.length; k++) {
      body += pstxCellHtml(st, spyReturns[r], vixChangePcts[k]);
    }
    body += '</tr>';
  }
  body += '</tbody>';

  return '<div class="pstx-card">' +
    '<div class="pstx-card-title">Stress matrix — ' + (st.result.cellCount) + ' cells returned</div>' +
    '<div class="pstx-matrix-scroll"><table class="pstx-matrix">' + head + body + '</table></div>' +
    '<div class="pstx-empty">' + pstxEsc(PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT) +
      ' means the backend published no usable figure. It never means zero. ' +
      '&#9888; marks a degraded set; &#8709; marks a withdrawn one. Click a cell for its diagnostics.</div>' +
  '</div>';
}

function pstxCellHtml(st, spyReturn, vixChangePct) {
  var scenarioId = portfolioStressUiScenarioId(spyReturn, vixChangePct);
  var cell = portfolioStressUiFindCell(st.result, scenarioId);
  var classes = ['pstx-cell'];
  if (spyReturn === 0 && vixChangePct === 0) classes.push('pstx-cell-base');
  if (st.selectedScenarioId === scenarioId) classes.push('pstx-cell-selected');
  var attrs = ' class="' + classes.join(' ') + '" onclick="pstxSelectCell(\'' + pstxEsc(scenarioId) + '\')"';

  if (!cell) {
    return '<td' + attrs + '><span class="pstx-cell-line pstx-none">MISSING</span>' +
      '<span class="pstx-cell-line pstx-cell-sub">no cell returned</span></td>';
  }

  var actual = readPortfolioStressUiField(cell, 'actualStressPnl');
  var actualPct = readPortfolioStressUiField(cell, 'actualStressPnlPctNlv');
  var proposed = readPortfolioStressUiField(cell, 'proposedStressPnl');
  var diff = readPortfolioStressUiField(cell, 'difference');

  return '<td' + attrs + '>' +
    pstxValueLine(actual, formatPortfolioStressUiCurrency(actual.value)) +
    pstxValueLine(actualPct, formatPortfolioStressUiPercent(actualPct.value), true) +
    pstxValueLine(proposed, 'P ' + formatPortfolioStressUiCurrency(proposed.value), true) +
    pstxValueLine(diff, 'Δ ' + formatPortfolioStressUiCurrency(diff.value), true) +
  '</td>';
}

/**
 * One line of a cell: the formatted text, its sign class and its status mark.
 *
 * The status mark is a GLYPH, not a colour. A screen that signalled DEGRADED
 * only with an amber tint would say nothing at all to a reader who cannot
 * distinguish it, and nothing at all in a greyscale screenshot pasted into a
 * review.
 */
function pstxValueLine(read, text, small) {
  var cls = 'pstx-cell-line pstx-' + portfolioStressUiSignClass(read.value) + (small ? ' pstx-cell-sub' : '');
  var mark = '';
  if (read.status === 'DEGRADED') mark = ' <span class="pstx-mark pstx-mark-degraded" title="DEGRADED">&#9888;</span>';
  else if (read.status === 'UNAVAILABLE') mark = ' <span class="pstx-mark pstx-mark-unavailable" title="UNAVAILABLE">&#8709;</span>';
  return '<span class="' + cls + '">' + pstxEsc(text) + mark + '</span>';
}

// ── Actual vs Proposed ───────────────────────────────────────────────────────

/**
 * The comparison for the selected scenario.
 *
 * Three columns — Actual, Overlay, Proposed — plus the Difference. Overlay is
 * shown in its OWN column and is never promoted into the Proposed one. When the
 * Actual portfolio is absent the backend withdraws Proposed, and the only
 * non-null vector left in the cell is the Overlay's; a screen that filled the
 * Proposed column from it would be publishing the hypothetical structure as the
 * resulting portfolio.
 */
function pstxCompareHtml(st) {
  if (!st.result) return '';
  var scenarioId = st.selectedScenarioId;
  var cell = portfolioStressUiFindCell(st.result, scenarioId);
  if (!cell) {
    return '<div class="pstx-card"><div class="pstx-card-title">Actual vs Proposed</div>' +
      '<div class="pstx-empty">Select a cell in the matrix to see its breakdown.</div></div>';
  }

  var actual = readPortfolioStressUiField(cell, 'actualStressPnl');
  var actualPct = readPortfolioStressUiField(cell, 'actualStressPnlPctNlv');
  var overlay = readPortfolioStressUiField(cell, 'overlayStressPnl');
  var overlayDc = readPortfolioStressUiField(cell, 'overlayDebitCredit');
  var proposed = readPortfolioStressUiField(cell, 'proposedStressPnl');
  var proposedPct = readPortfolioStressUiField(cell, 'proposedStressPnlPctNlv');
  var diff = readPortfolioStressUiField(cell, 'difference');
  var beta = readPortfolioStressUiField(cell, 'rawBetaWeightedShareDelta');

  return '<div class="pstx-card">' +
    '<div class="pstx-card-title">Actual vs Proposed — scenario ' + pstxEsc(scenarioId) + '</div>' +
    '<div class="pstx-compare">' +
      pstxCompareCol('Current portfolio / Actual', cell, 'actual', [
        ['Stress P&L', actual, formatPortfolioStressUiCurrency(actual.value)],
        ['% of NLV', actualPct, formatPortfolioStressUiPercent(actualPct.value)],
        ['Beta-weighted Δ', beta, formatPortfolioStressUiNumber(beta.value)],
      ]) +
      pstxCompareCol('Hypothetical overlay', cell, 'overlay', [
        ['Stress P&L', overlay, formatPortfolioStressUiCurrency(overlay.value)],
        ['Debit / credit', overlayDc, formatPortfolioStressUiCurrency(overlayDc.value)],
      ]) +
      pstxCompareCol('With overlay / Proposed', cell, 'proposed', [
        ['Stress P&L', proposed, formatPortfolioStressUiCurrency(proposed.value)],
        ['% of NLV', proposedPct, formatPortfolioStressUiPercent(proposedPct.value)],
      ]) +
      pstxCompareCol('Difference', cell, 'difference', [
        ['Incremental', diff, formatPortfolioStressUiCurrency(diff.value)],
      ]) +
    '</div>' +
    pstxDiagnosticsHtml(cell) +
  '</div>';
}

function pstxCompareCol(title, cell, set, rows) {
  var authority = (cell.setAuthority && cell.setAuthority[set]) ? cell.setAuthority[set] : null;
  var status = authority ? authority.status : 'UNAVAILABLE';
  var complete = authority ? authority.complete : null;
  var html = '<div class="pstx-compare-col"><h4>' + pstxEsc(title) + ' ' + pstxStatusBadge(status) +
    (complete === true ? ' <span class="pstx-b pstx-b-muted">COMPLETE</span>'
      : ' <span class="pstx-b pstx-b-warn">INCOMPLETE</span>') + '</h4>';
  for (var i = 0; i < rows.length; i++) {
    var read = rows[i][1];
    html += '<div class="pstx-stat"><span class="pstx-stat-k">' + pstxEsc(rows[i][0]) + '</span>' +
      '<span class="pstx-' + portfolioStressUiSignClass(read.value) + '">' + pstxEsc(rows[i][2]) +
      (read.authoritative ? '' : ' <span class="pstx-b pstx-b-warn">NOT AUTHORITATIVE</span>') + '</span></div>';
  }
  if (set !== 'difference') html += pstxGreeksHtml(cell, set);
  return html + '</div>';
}

/** The raw Greek vector of one set, read strictly by name from that set. */
function pstxGreeksHtml(cell, set) {
  var greeks = (cell.rawGreeks && cell.rawGreeks[set]) ? cell.rawGreeks[set] : null;
  if (!greeks) return '<div class="pstx-empty">No Greeks published.</div>';
  var values = greeks.values;
  var names = ['delta', 'gamma', 'vega', 'theta'];
  var html = '<div class="pstx-greeks">';
  for (var i = 0; i < names.length; i++) {
    var v = (values && Object.prototype.hasOwnProperty.call(values, names[i])) ? values[names[i]] : null;
    html += '<div class="pstx-greek"><div class="pstx-greek-k">' + names[i] + '</div>' +
      '<div class="pstx-greek-v pstx-' + portfolioStressUiSignClass(v) + '">' +
      pstxEsc(formatPortfolioStressUiNumber(v)) + '</div></div>';
  }
  html += '</div>';
  html += '<div class="pstx-empty">Greeks ' + pstxStatusBadge(greeks.status) +
    (greeks.authoritative ? '' : ' <span class="pstx-b pstx-b-warn">NOT AUTHORITATIVE</span>') +
    (cell.rawGreekUnits ? ' <span class="pstx-b pstx-b-muted">' + pstxEsc(cell.rawGreekUnits) + '</span>' : '') +
    '</div>';
  return html;
}

/** Statuses, completeness, metric statuses, reasons, partials and violations. */
function pstxDiagnosticsHtml(cell) {
  var metric = (cell.metricAuthority && typeof cell.metricAuthority === 'object') ? cell.metricAuthority : {};
  var partial = (cell.partial && typeof cell.partial === 'object') ? cell.partial : {};
  var html = '<div class="pstx-detail"><div class="pstx-card-title">Cell diagnostics</div><div class="pstx-detail-grid">';
  html += pstxKv('Cell status', pstxStatusBadge(cell.status));
  html += pstxKv('pctNlvStatus', pstxStatusBadge(metric.pctNlvStatus));
  html += pstxKv('betaWeightedΔ status', pstxStatusBadge(metric.rawBetaWeightedShareDeltaStatus));
  if (cell.actualPortfolioEmptyReason) {
    html += pstxKv('Actual empty reason', '<span class="pstx-reason">' + pstxEsc(cell.actualPortfolioEmptyReason) + '</span>');
  }
  if (metric.rawBetaWeightedShareDeltaReason) {
    html += pstxKv('betaWeightedΔ reason', '<span class="pstx-reason">' + pstxEsc(metric.rawBetaWeightedShareDeltaReason) + '</span>');
  }
  html += '</div>';

  var partialKeys = Object.keys(partial).filter(function (k) { return partial[k] !== null; });
  if (partialKeys.length) {
    html += '<div class="pstx-card-title" style="margin-top:8px">Partial figures — never totals</div><div class="pstx-detail-grid">';
    for (var i = 0; i < partialKeys.length; i++) {
      html += pstxKv(partialKeys[i], pstxEsc(formatPortfolioStressUiCurrency(partial[partialKeys[i]])));
    }
    html += '</div>';
  }

  var violations = Array.isArray(cell.contractViolations) ? cell.contractViolations : [];
  if (violations.length) {
    html += '<div class="pstx-card-title" style="margin-top:8px">Contract violations</div>';
    for (var v = 0; v < violations.length; v++) {
      html += '<div class="pstx-reason">' + pstxEsc(violations[v].field + ' — ' + violations[v].detail) + '</div>';
    }
  }
  return html + '</div>';
}

// ── overlay builder ──────────────────────────────────────────────────────────

/**
 * The ephemeral hypothetical-structure builder.
 *
 * There is no save button, and there cannot be one: this overlay never reaches
 * the Journal, the portfolio, an order path or storage of any kind. It exists in
 * memory for as long as the tab is open and is sent with the next run.
 */
function pstxOverlayHtml(st) {
  var legs = Array.isArray(st.overlayLegs) ? st.overlayLegs : [];
  var draft = _pstxLegDraft || {};
  var errs = Array.isArray(st.legErrors) ? st.legErrors : [];

  var rows = '';
  for (var i = 0; i < legs.length; i++) {
    var leg = legs[i];
    rows += '<tr>' +
      '<td>' + pstxEsc(leg.underlying) + '</td>' +
      '<td>' + pstxEsc(leg.expiration) + '</td>' +
      '<td>' + pstxEsc(formatPortfolioStressUiNumber(leg.strike)) + '</td>' +
      '<td>' + pstxEsc(leg.optionType) + '</td>' +
      '<td>' + pstxEsc(leg.side) + '</td>' +
      '<td>' + pstxEsc(String(leg.contracts)) + '</td>' +
      '<td>' + pstxEsc(String(leg.contractMultiplier)) + '</td>' +
      '<td><button class="pstx-btn pstx-btn-danger" onclick="pstxRemoveLeg(' + i + ')">REMOVE</button></td>' +
    '</tr>';
  }

  return '<div class="pstx-card">' +
    '<div class="pstx-card-title">Hypothetical overlay — ephemeral, never saved</div>' +
    '<div class="pstx-row">' +
      pstxField('Underlying', '<input class="pstx-input" id="pstx-leg-underlying" value="' + pstxEsc(draft.underlying || '') + '">') +
      pstxField('Expiration', '<input class="pstx-input" id="pstx-leg-expiration" placeholder="YYYY-MM-DD" value="' + pstxEsc(draft.expiration || '') + '">') +
      pstxField('Strike', '<input class="pstx-input" id="pstx-leg-strike" value="' + pstxEsc(draft.strike || '') + '">') +
      pstxField('Type', '<select class="pstx-select" id="pstx-leg-type">' +
        pstxOptions(PORTFOLIO_STRESS_UI_OPTION_TYPES, draft.optionType) + '</select>') +
      pstxField('Side', '<select class="pstx-select" id="pstx-leg-side">' +
        pstxOptions(PORTFOLIO_STRESS_UI_SIDES, draft.side) + '</select>') +
      pstxField('Contracts', '<input class="pstx-input" id="pstx-leg-contracts" value="' + pstxEsc(draft.contracts || '') + '">') +
      pstxField('Multiplier', '<input class="pstx-input" id="pstx-leg-multiplier" value="' +
        pstxEsc(draft.contractMultiplier || String(PORTFOLIO_STRESS_UI_DEFAULT_CONTRACT_MULTIPLIER)) + '">') +
      '<button class="pstx-btn" onclick="pstxAddLeg()">ADD LEG</button>' +
      (legs.length ? '<button class="pstx-btn pstx-btn-danger" onclick="pstxClearOverlay()">CLEAR OVERLAY</button>' : '') +
    '</div>' +
    (errs.length ? '<ul class="pstx-errs">' + errs.map(function (e) {
      return '<li>' + pstxEsc(e.field + ' ' + e.message) + '</li>';
    }).join('') + '</ul>' : '') +
    (legs.length
      ? '<div class="pstx-legs-scroll"><table class="pstx-legs"><thead><tr>' +
        '<th>Underlying</th><th>Expiration</th><th>Strike</th><th>Type</th><th>Side</th>' +
        '<th>Contracts</th><th>Multiplier</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="pstx-empty">No hypothetical legs. The run below is the Actual portfolio only.</div>') +
  '</div>';
}

// ── small helpers ────────────────────────────────────────────────────────────

function pstxStatusBadge(status) {
  if (status === 'VALID') return '<span class="pstx-b pstx-b-ok">VALID</span>';
  if (status === 'DEGRADED') return '<span class="pstx-b pstx-b-warn">&#9888; DEGRADED</span>';
  if (status === 'UNAVAILABLE') return '<span class="pstx-b pstx-b-muted">&#8709; UNAVAILABLE</span>';
  return '<span class="pstx-b pstx-b-muted">&#8709; UNAVAILABLE</span>';
}

function pstxKv(k, vHtml) {
  return '<div class="pstx-kv"><div class="pstx-k">' + pstxEsc(k) + '</div><div class="pstx-v">' + vHtml + '</div></div>';
}

function pstxField(label, controlHtml) {
  return '<div class="pstx-field"><div class="pstx-label">' + pstxEsc(label) + '</div>' + controlHtml + '</div>';
}

function pstxOptions(list, selected) {
  return list.map(function (v) {
    return '<option value="' + v + '"' + (selected === v ? ' selected' : '') + '>' + v + '</option>';
  }).join('');
}

function pstxInputValue(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}

/**
 * HTML-escape. Reuses the monolith's canonical `escHtml` when it is available
 * and falls back to an identical local escape otherwise, so this module can be
 * exercised by the contract suite without loading the monolith.
 */
function pstxEsc(value) {
  if (typeof escHtml === 'function') return escHtml(value == null ? '' : String(value));
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
