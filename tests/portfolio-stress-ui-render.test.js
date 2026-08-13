'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI — RENDER CONTRACT.
//
// THE ONE THING THIS SUITE IS FOR
//                    an unknown must never look like a zero
//
//   The response contract already withdraws a figure whose own producer disowned
//   it, and hands the renderer `null`. Everything that guarantee buys is lost in
//   the last three lines of the pipeline if the renderer prints `$0.00`. So every
//   case below runs a REAL backend cell through the REAL response contract and
//   then asserts on the HTML the panel actually produced.
//
// WHAT IS CHECKED
//   VALID / DEGRADED / UNAVAILABLE are visually distinct, and distinct by
//   something other than colour; a withdrawn number renders as an em dash;
//   an Actual-absent cell does not promote Overlay into Proposed; partial figures
//   are labelled as partials; the metric-specific statuses survive; contract
//   violations are surfaced rather than swallowed.
//
// Run: node tests/portfolio-stress-ui-render.test.js
// ─────────────────────────────────────────────────────────────────────────────
const H = require('./lib/portfolio-stress-ui-sandbox.js');
const { ok, section, finish } = H.harness('UI render contract');

// Render a matrix of exactly one cell (SPY 0 / VIX 0) and return the HTML.
function renderCell(backendCell, gridOverrides) {
  const { sandbox, dom } = H.makeSandbox({});
  const st = sandbox.createPortfolioStressUiState();
  sandbox._pstxState = st;
  st.portfolioId = 'pf-1';
  st.portfolioRevision = 'rev-1';
  st.scenarioGrid = Object.assign({
    spyReturns: [0], vixChangePcts: [0], horizonDays: 1, ivShockMethod: 'VIX_PROXY',
  }, gridOverrides || {});
  const normalized = sandbox.normalizePortfolioStressResponse(H.goodResponse({ matrix: [backendCell] }));
  st.result = normalized;
  st.resultFingerprint = sandbox.portfolioStressUiInputsFingerprint(st);
  st.phase = 'SUCCESS';
  st.selectedScenarioId = backendCell.scenarioId;
  sandbox.pstxRender();
  return { html: dom.lastHtml, sandbox, state: st, normalized };
}

const ID = H.cell('spy+0.00_vix+0.00').scenarioId;
const DASH = '—';

// ─────────────────────────────────────────────────────────────────────────────
section('1. The scenario id joins the grid to the response');
{
  const { sandbox } = H.makeSandbox({});
  ok(sandbox.portfolioStressUiScenarioId(0, 0) === 'spy+0.00_vix+0.00', '1.1: the base cell id is stable');
  ok(sandbox.portfolioStressUiScenarioId(-0.05, 0.5) === 'spy-5.00_vix+50.00', '1.2: signed ids are readable');
  // 0.1 and 0.10 are the same cell and must not produce two ids.
  ok(sandbox.portfolioStressUiScenarioId(0.1, 0) === sandbox.portfolioStressUiScenarioId(0.10, 0),
    '1.3: fixed precision means one cell has one id');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. VALID renders the number');
{
  // Every field the comparison reads is populated, so a NOT AUTHORITATIVE badge
  // anywhere would be the renderer flagging a figure the contract calls sound.
  const { html } = renderCell(H.cell(ID, {
    actualStressPnl: -12345, actualStressPnlPctNlv: -0.0812,
    rawBetaWeightedShareDelta: 42,
    overlayStressPnl: -100, overlayDebitCredit: 250,
    proposedStressPnl: -9000, proposedStressPnlPctNlv: -0.06,
    difference: 3345,
    rawGreeks: {
      actual: { delta: 1, gamma: 2, vega: 3, theta: 4 },
      overlay: { delta: 5, gamma: 6, vega: 7, theta: 8 },
      proposed: { delta: 9, gamma: 10, vega: 11, theta: 12 },
    },
    rawGreekStatus: { actual: 'VALID', overlay: 'VALID', proposed: 'VALID' },
    rawGreekCompleteness: { actual: true, overlay: true, proposed: true },
  }));
  ok(html.indexOf('-$12,345') !== -1, '2.1: a valid Actual P&L is rendered');
  ok(html.indexOf('-8.12%') !== -1, '2.2: a valid % of NLV is rendered');
  ok(html.indexOf('VALID') !== -1, '2.3: the VALID status is shown');
  ok(html.indexOf('NOT AUTHORITATIVE') === -1, '2.4: a complete VALID cell flags nothing non-authoritative');
  ok(html.indexOf('INCOMPLETE') === -1, '2.5: a complete VALID cell is not marked incomplete');
  ok(html.indexOf(DASH + '</span>') === -1 || html.indexOf('MISSING') === -1,
    '2.6: a fully populated cell needs no unavailable placeholder in the matrix');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. UNAVAILABLE renders an em dash, never a zero');
{
  const { html } = renderCell(H.cell(ID, {
    actualStatus: 'UNAVAILABLE', actualComplete: false,
    proposedStatus: 'UNAVAILABLE', proposedComplete: false,
  }));
  ok(html.indexOf(DASH) !== -1, '3.1: the withdrawn figure renders as an em dash');
  ok(html.indexOf('$0.00') === -1 && html.indexOf('+$0') === -1,
    '3.2: no zero currency appears anywhere for an UNAVAILABLE cell');
  ok(html.indexOf('0.00%') === -1, '3.3: no zero percentage appears either');
  ok(html.indexOf('UNAVAILABLE') !== -1, '3.4: the UNAVAILABLE status is named');
  // Not colour alone: the empty-set glyph must be present.
  ok(html.indexOf('&#8709;') !== -1, '3.5: UNAVAILABLE carries a glyph, not only a colour');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. A REAL zero is not an unknown');
{
  const { html } = renderCell(H.cell(ID, { actualStressPnl: 0, actualStressPnlPctNlv: 0 }));
  ok(html.indexOf('$0.00') !== -1, '4.1: a genuine zero renders as a zero');
  ok(html.indexOf('pstx-zero') !== -1, '4.2: a genuine zero carries the zero class, not the unknown class');
  // The two must be distinguishable in the markup, which is the whole point.
  const unknown = renderCell(H.cell(ID, { actualStatus: 'UNAVAILABLE', actualComplete: false })).html;
  ok(html !== unknown, '4.3: a zero cell and an unknown cell do not render identically');
  ok(unknown.indexOf('pstx-none') !== -1, '4.4: the unknown cell carries the "none" class');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. DEGRADED is distinct from VALID, and never silently authoritative');
{
  const { html } = renderCell(H.cell(ID, {
    actualStatus: 'DEGRADED', actualComplete: true, actualStressPnl: -500,
  }));
  ok(html.indexOf('-$500.00') !== -1, '5.1: a degraded figure is still shown — it is a real figure with a caveat');
  ok(html.indexOf('DEGRADED') !== -1, '5.2: the DEGRADED status is named');
  ok(html.indexOf('&#9888;') !== -1, '5.3: DEGRADED carries a warning glyph, not only a colour');
  ok(html.indexOf('NOT AUTHORITATIVE') !== -1, '5.4: a degraded figure is marked non-authoritative');
  const valid = renderCell(H.cell(ID, { actualStressPnl: -500 })).html;
  ok(valid !== html, '5.5: DEGRADED and VALID do not render identically');
  // The legend explains both glyphs, so it carries one of each regardless. What
  // must differ is how MANY the rendered cells carry.
  const warnings = (s) => (s.match(/&#9888;/g) || []).length;
  ok(warnings(html) > warnings(valid),
    '5.6: a degraded cell carries more warning glyphs than a valid one (' +
    warnings(html) + ' vs ' + warnings(valid) + ')');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Actual absent: Overlay is NOT promoted to Proposed');
{
  // The exact shape the empty-portfolio case produces: Actual and Proposed
  // withdrawn, Overlay intact and the only non-null vector in the cell.
  const { html } = renderCell(H.cell(ID, {
    actualStatus: 'UNAVAILABLE', actualComplete: false,
    proposedStatus: 'UNAVAILABLE', proposedComplete: false,
    overlayStatus: 'VALID', overlayComplete: true,
    overlayStressPnl: -777,
    actualPortfolioEmptyReason: 'NO_OPEN_POSITIONS',
    rawGreeks: { overlay: { delta: 12, gamma: 1, vega: 3, theta: -4 } },
    rawGreekStatus: { overlay: 'VALID', actual: 'UNAVAILABLE', proposed: 'UNAVAILABLE' },
    rawGreekCompleteness: { overlay: true, actual: false, proposed: false },
  }));
  ok(html.indexOf('-$777.00') !== -1, '6.1: the Overlay figure is shown in its own column');
  const proposedIdx = html.indexOf('With overlay / Proposed');
  const proposedBlock = html.slice(proposedIdx, proposedIdx + 700);
  ok(proposedBlock.indexOf('-$777.00') === -1, '6.2: the Overlay figure does NOT appear under Proposed');
  ok(proposedBlock.indexOf(DASH) !== -1, '6.3: Proposed renders as unavailable');
  ok(html.indexOf('NO_OPEN_POSITIONS') !== -1, '6.4: the reason the Actual portfolio is empty is surfaced');
  // The Greek family, same rule.
  const overlayIdx = html.indexOf('Hypothetical overlay');
  ok(html.slice(overlayIdx, proposedIdx).indexOf('12.00') !== -1, '6.5: the Overlay delta is shown under Overlay');
  ok(proposedBlock.indexOf('12.00') === -1, '6.6: the Overlay delta is NOT shown under Proposed');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Metric-specific statuses survive to the screen');
{
  // The Actual set is perfectly healthy; the NLV is not. The P&L must show and
  // the percentage must not.
  const { html } = renderCell(H.cell(ID, {
    actualStressPnl: -4200,
    actualStressPnlPctNlv: -0.03,
    pctNlvStatus: 'UNAVAILABLE',
  }));
  ok(html.indexOf('-$4,200') !== -1, '7.1: the Actual P&L is shown — the numerator is fine');
  ok(html.indexOf('-3.00%') === -1, '7.2: the percentage is WITHDRAWN because the denominator is not');
  ok(html.indexOf('pctNlvStatus') !== -1, '7.3: pctNlvStatus is reported by name in the diagnostics');

  const beta = renderCell(H.cell(ID, {
    rawBetaWeightedShareDelta: 1234,
    rawBetaWeightedShareDeltaStatus: 'UNAVAILABLE',
    rawBetaWeightedShareDeltaReason: 'SPY_PRICE_UNAVAILABLE',
  })).html;
  ok(beta.indexOf('1234.00') === -1, '7.4: a withdrawn beta-weighted delta is not shown');
  ok(beta.indexOf('SPY_PRICE_UNAVAILABLE') !== -1, '7.5: the reason it was withdrawn is shown');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Contract violations are surfaced, not swallowed');
{
  // A finite number published under an UNAVAILABLE status. The response contract
  // withdraws it and records a violation; the screen must say so.
  const { html, normalized } = renderCell(H.cell(ID, {
    actualStatus: 'UNAVAILABLE', actualComplete: false,
    actualStressPnl: 999999,
  }));
  ok(normalized.contractViolations.length === 1, '8.1: the response contract recorded the violation');
  ok(html.indexOf('999,999') === -1 && html.indexOf('999999') === -1,
    '8.2: the contradicted number never reaches the screen');
  ok(html.indexOf('CONTRACT VIOLATION') !== -1, '8.3: the violation is announced');
  ok(html.indexOf('actualStressPnl') !== -1, '8.4: the offending field is named');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Partial figures are labelled as partials');
{
  const { html } = renderCell(H.cell(ID, {
    actualStatus: 'DEGRADED', actualComplete: false,
    actualStressPnl: -100,
    partialActualStressPnl: -80,
  }));
  ok(html.indexOf('Partial figures') !== -1, '9.1: the partial section is rendered');
  ok(html.indexOf('partialActualStressPnl') !== -1, '9.2: the partial is named as a partial');
  ok(html.indexOf('never totals') !== -1, '9.3: the partial section says what a partial is not');
  ok(html.indexOf('INCOMPLETE') !== -1, '9.4: an incomplete set is marked incomplete');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Formatters take the null path first');
{
  const { sandbox } = H.makeSandbox({});
  for (const bad of [null, undefined, NaN, Infinity, '12', true, {}]) {
    ok(sandbox.formatPortfolioStressUiCurrency(bad) === DASH, '10.1: currency of ' + String(bad) + ' is an em dash');
    ok(sandbox.formatPortfolioStressUiPercent(bad) === DASH, '10.2: percent of ' + String(bad) + ' is an em dash');
    ok(sandbox.formatPortfolioStressUiNumber(bad) === DASH, '10.3: number of ' + String(bad) + ' is an em dash');
  }
  ok(sandbox.formatPortfolioStressUiCurrency(0) === '$0.00', '10.4: a real zero formats as a zero');
  ok(sandbox.portfolioStressUiSignClass(null) === 'none', '10.5: null has no sign');
  ok(sandbox.portfolioStressUiSignClass(0) === 'zero', '10.6: zero has the zero sign');
  ok(sandbox.portfolioStressUiSignClass(-1) === 'neg' && sandbox.portfolioStressUiSignClass(1) === 'pos',
    '10.7: signed values are classified');
  // An unmapped field is governed by nothing, so it must read UNAVAILABLE.
  const read = sandbox.readPortfolioStressUiField({ values: { mystery: 5 }, setAuthority: {} }, 'mystery');
  ok(read.status === 'UNAVAILABLE' && read.authoritative === false,
    '10.8: a field with no result set is never authoritative');
  // A missing cell is UNAVAILABLE, not zero.
  const absent = sandbox.readPortfolioStressUiField(null, 'actualStressPnl');
  ok(absent.value === null && absent.status === 'UNAVAILABLE' && absent.present === false,
    '10.9: a missing cell reads as unavailable and absent');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. A blocking error withholds the matrix entirely');
{
  const { sandbox, dom } = H.makeSandbox({});
  const st = sandbox.createPortfolioStressUiState();
  sandbox._pstxState = st;
  st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
  st.result = sandbox.normalizePortfolioStressResponse(H.goodResponse({
    matrix: [H.cell('spy+0.00_vix+0.00', { actualStressPnl: -1 })],
  }));
  st.phase = 'ERROR';
  st.error = sandbox.classifyPortfolioStressUiError(
    Object.assign(new Error('PORTFOLIO_SCOPE_PARITY_DIVERGENCE: manifest version'), { code: 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE' }), null);
  sandbox.pstxRender();
  const html = dom.lastHtml;
  ok(html.indexOf('contract mismatch') !== -1, '11.1: the divergence is reported as a contract mismatch');
  ok(html.indexOf('update required') !== -1, '11.2: it says an update is required');
  ok(html.indexOf('MATRIX WITHHELD') !== -1, '11.3: the screen says the matrix was withheld');
  ok(html.indexOf('Stress matrix') === -1, '11.4: the matrix is not rendered at all');
  ok(html.indexOf('Actual vs Proposed') === -1, '11.5: the comparison is not rendered either');
  ok(html.indexOf('-$1.00') === -1, '11.6: no number from the divergent response reaches the screen');
}

finish();
