'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI — MATRIX CONTRACT.
//
// WHAT THIS PINS
//   The grid is frontend-owned and the numbers are not (PST-MATRIX-002). So the
//   matrix has exactly two jobs, and this suite is about both:
//
//     1. put each backend cell in the RIGHT square. The only join between the
//        grid the user edits and the numbers the backend computed is
//        `scenarioId`, so a row/column mix-up would show real figures under the
//        wrong scenario — the most dangerous failure this screen has, because
//        nothing about it looks wrong.
//
//     2. cost ONE request for the whole matrix, whatever its size
//        (PST-MATRIX-001/005). §5 grows the grid to 100 cells and counts.
//
// ALSO PINNED
//   the base scenario is reachable and marked; a scenario the backend did not
//   answer says MISSING rather than rendering blank; a grid larger than the
//   declared limit is refused before dispatch; the default grid CONTAINS the
//   minimum grid the model requires.
//
// Run: node tests/portfolio-stress-ui-matrix.test.js
// ─────────────────────────────────────────────────────────────────────────────
const H = require('./lib/portfolio-stress-ui-sandbox.js');
const { ok, section, finish } = H.harness('UI matrix contract');

const tick = () => new Promise((r) => setTimeout(r, 0));

(async function main() {
  // ───────────────────────────────────────────────────────────────────────────
  section('1. The default grid contains the minimum the model requires');
  {
    const { sandbox } = H.makeSandbox({});
    const spy = sandbox.PORTFOLIO_STRESS_UI_DEFAULT_SPY_RETURNS;
    const vix = sandbox.PORTFOLIO_STRESS_UI_DEFAULT_VIX_CHANGE_PCTS;
    for (const required of sandbox.PORTFOLIO_STRESS_UI_MINIMUM_SPY_RETURNS) {
      ok(spy.some((v) => Math.abs(v - required) < 1e-9), '1.1: the default SPY row set contains ' + required);
    }
    for (const required of sandbox.PORTFOLIO_STRESS_UI_MINIMUM_VIX_CHANGE_PCTS) {
      ok(vix.some((v) => Math.abs(v - required) < 1e-9), '1.2: the default VIX column set contains ' + required);
    }
    const scenarios = sandbox.buildPortfolioStressUiScenarios(sandbox.portfolioStressUiDefaultGrid());
    ok(scenarios.length >= 20, '1.3: the default grid meets the 20-cell minimum, got ' + scenarios.length);
    ok(scenarios.some((s) => s.spyReturn === 0 && s.vixChangePct === 0), '1.4: the base scenario is in the grid');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('2. Scenario expansion is the declared shape, and only that');
  {
    const { sandbox } = H.makeSandbox({});
    const scenarios = sandbox.buildPortfolioStressUiScenarios({
      spyReturns: [0, -0.1], vixChangePcts: [0, 0.5], horizonDays: 3, ivShockMethod: 'DIRECT_IV_SHOCK',
    });
    ok(scenarios.length === 4, '2.1: 2 x 2 = 4 scenarios');
    const declared = sandbox.PORTFOLIO_STRESS_UI_SCENARIO_FIELDS.slice().sort();
    for (const s of scenarios) {
      ok(JSON.stringify(Object.keys(s).sort()) === JSON.stringify(declared),
        '2.2: a scenario is exactly ' + JSON.stringify(declared));
    }
    ok(scenarios.every((s) => s.horizonDays === 3), '2.3: the horizon is carried');
    ok(scenarios.every((s) => s.ivShockMethod === 'DIRECT_IV_SHOCK'), '2.4: the IV shock method is carried');
    // Row-major, so the rendered order and the sent order agree.
    ok(scenarios[0].spyReturn === 0 && scenarios[1].spyReturn === 0 && scenarios[2].spyReturn === -0.1,
      '2.5: expansion is row-major — VIX across, SPY down');
    // Ids are unique, because they are the join key.
    ok(new Set(scenarios.map((s) => s.scenarioId)).size === 4, '2.6: every scenario id is unique');
    // A duplicated row must not produce two scenarios with one id.
    const dup = sandbox.buildPortfolioStressUiScenarios({
      spyReturns: [0, 0], vixChangePcts: [0], horizonDays: 1, ivShockMethod: 'VIX_PROXY',
    });
    ok(dup.length === 1, '2.7: a duplicated cell is collapsed rather than sent twice');
    // Junk in the grid is dropped, never turned into a zero-shock scenario.
    const junk = sandbox.buildPortfolioStressUiScenarios({
      spyReturns: [0, null, NaN, 'x', -0.1], vixChangePcts: [0], horizonDays: 1, ivShockMethod: 'VIX_PROXY',
    });
    ok(junk.length === 2, '2.8: unusable rows are dropped, not coerced to 0, got ' + junk.length);
    ok(!sandbox.PORTFOLIO_STRESS_UI_SCENARIO_FIELDS.includes('vixCurrent'),
      '2.9: vixCurrent is deliberately NOT sent — the backend owns the level a run is priced against');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('3. Every backend cell lands in the right square');
  {
    // A 3x3 grid where every cell carries a value derived from its own
    // coordinates, so a transposition or an off-by-one is visible.
    const spy = [0, -0.1, -0.2];
    const vix = [0, 0.5, 1];
    const { sandbox, dom } = H.makeSandbox({});
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
    st.scenarioGrid = { spyReturns: spy, vixChangePcts: vix, horizonDays: 1, ivShockMethod: 'VIX_PROXY' };

    const matrix = [];
    const expect = {};
    for (let r = 0; r < spy.length; r++) {
      for (let c = 0; c < vix.length; c++) {
        const id = sandbox.portfolioStressUiScenarioId(spy[r], vix[c]);
        const value = -((r + 1) * 1000 + (c + 1));
        expect[id] = value;
        matrix.push(H.cell(id, { actualStressPnl: value }));
      }
    }
    st.result = sandbox.normalizePortfolioStressResponse(H.goodResponse({ matrix: matrix }));
    st.resultFingerprint = sandbox.portfolioStressUiInputsFingerprint(st);
    st.phase = 'SUCCESS';
    sandbox.pstxRender();
    const html = dom.lastHtml;

    // Pull the table body apart and check each cell against its coordinates.
    const bodyStart = html.indexOf('<tbody>');
    const rows = html.slice(bodyStart).split('<tr>').slice(1);
    ok(rows.length === spy.length, '3.1: one row per SPY return, got ' + rows.length);
    let placed = 0;
    for (let r = 0; r < spy.length; r++) {
      const cells = rows[r].split('<td').slice(1);
      ok(cells.length === vix.length, '3.2: row ' + r + ' has one cell per VIX column');
      for (let c = 0; c < vix.length; c++) {
        const id = sandbox.portfolioStressUiScenarioId(spy[r], vix[c]);
        const wanted = sandbox.formatPortfolioStressUiCurrency(expect[id]);
        if (cells[c].indexOf(wanted) !== -1 && cells[c].indexOf(id) !== -1) placed++;
      }
    }
    ok(placed === spy.length * vix.length,
      '3.3: all ' + (spy.length * vix.length) + ' cells are in the right square, got ' + placed);
    // The row and column headers say which scenario a square belongs to.
    ok(html.indexOf('-20%') !== -1 && html.indexOf('+100%') !== -1, '3.4: the headers carry the shocks');
    ok(html.indexOf('current') !== -1, '3.5: the zero-VIX column is labelled current');
    ok(html.indexOf('pstx-cell-base') !== -1, '3.6: the base scenario square is marked structurally');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('4. A cell the backend did not answer says so');
  {
    const { sandbox, dom } = H.makeSandbox({});
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
    st.scenarioGrid = { spyReturns: [0, -0.1], vixChangePcts: [0], horizonDays: 1, ivShockMethod: 'VIX_PROXY' };
    // Only the base cell comes back.
    st.result = sandbox.normalizePortfolioStressResponse(H.goodResponse({
      matrix: [H.cell(sandbox.portfolioStressUiScenarioId(0, 0), { actualStressPnl: -10 })],
    }));
    st.resultFingerprint = sandbox.portfolioStressUiInputsFingerprint(st);
    st.phase = 'SUCCESS';
    sandbox.pstxRender();
    const html = dom.lastHtml;
    ok(html.indexOf('MISSING') !== -1, '4.1: the unanswered square says MISSING');
    ok(html.indexOf('no cell returned') !== -1, '4.2: it says why');
    ok(html.indexOf('-$10.00') !== -1, '4.3: the answered square still shows its figure');
    ok((html.match(/MISSING/g) || []).length === 1, '4.4: exactly one square is missing');
    // A missing square is not a zero.
    ok(html.indexOf('$0') === -1, '4.5: a missing square renders no zero');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('5. A large matrix is still ONE request');
  {
    const { sandbox, calls } = H.makeSandbox({
      transport: () => Promise.resolve(H.goodResponse({ matrix: [] })),
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    // 10 x 10 = 100 cells, the declared per-run maximum.
    const spy = []; const vix = [];
    for (let i = 0; i < 10; i++) { spy.push(-i / 100); vix.push(i / 10); }
    sandbox.setPortfolioStressUiScenarioGrid(st, {
      spyReturns: spy, vixChangePcts: vix, horizonDays: 1, ivShockMethod: 'VIX_PROXY',
    });
    ok(sandbox.buildPortfolioStressUiScenarios(st.scenarioGrid).length === 100, '5.1: the grid is 100 cells');
    sandbox.pstxRun();
    await tick(); await tick();
    ok(calls.transport.length === 1,
      '5.2: 100 cells cost exactly ONE request, got ' + calls.transport.length);
    ok(calls.transport[0].init.body.scenarios.length === 100, '5.3: all 100 travelled in that one body');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('6. An over-large grid is refused BEFORE dispatch');
  {
    const { sandbox, calls } = H.makeSandbox({
      transport: () => Promise.resolve(H.goodResponse()),
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
    const spy = []; const vix = [];
    for (let i = 0; i < 11; i++) spy.push(-i / 100);
    for (let i = 0; i < 11; i++) vix.push(i / 10);
    st.scenarioGrid = { spyReturns: spy, vixChangePcts: vix, horizonDays: 1, ivShockMethod: 'VIX_PROXY' };
    const blocked = sandbox.portfolioStressUiRunBlockedReason(st);
    ok(blocked !== null && /121/.test(blocked), '6.1: a 121-cell grid is blocked and the count is stated');
    sandbox.pstxRun();
    await tick(); await tick();
    ok(calls.transport.length === 0, '6.2: nothing was dispatched');
    // An empty grid is blocked too, rather than dispatching a scenario-less run.
    st.scenarioGrid = { spyReturns: [], vixChangePcts: [], horizonDays: 1, ivShockMethod: 'VIX_PROXY' };
    ok(/empty/i.test(sandbox.portfolioStressUiRunBlockedReason(st)), '6.3: an empty grid is blocked');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('7. The grid controls parse and reset without inventing values');
  {
    const { sandbox } = H.makeSandbox({});
    const p = sandbox.parsePortfolioStressUiPercentList('-20, -10, 0, +5 , 10%');
    ok(p.errors.length === 0, '7.1: a well-formed list parses cleanly');
    ok(JSON.stringify(p.values) === JSON.stringify([-0.2, -0.1, 0, 0.05, 0.1]),
      '7.2: percentages become fractions, got ' + JSON.stringify(p.values));
    const bad = sandbox.parsePortfolioStressUiPercentList('-20, abc, 5');
    ok(bad.errors.length === 1 && bad.errors[0] === 'abc', '7.3: a bad token is an ERROR, not a silent drop');
    ok(bad.values.length === 2, '7.4: the good tokens still parsed');
    ok(sandbox.parsePortfolioStressUiPercentList('').values.length === 0, '7.5: an empty list is empty, not [0]');
    ok(sandbox.formatPortfolioStressUiPercentList([-0.2, 0, 0.05]) === '-20, 0, 5',
      '7.6: fractions round-trip back to the control text');
    // A blank horizon keeps the current one rather than becoming zero.
    ok(sandbox.parsePortfolioStressUiNumberInput('') === null, '7.7: a blank numeric input is null, not 0');
    ok(sandbox.parsePortfolioStressUiNumberInput('3abc') === null, '7.8: "3abc" is null, not 3');
    ok(sandbox.parsePortfolioStressUiNumberInput('7') === 7, '7.9: a good numeric input parses');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('8. Rendering the matrix issues no request at all');
  {
    let dispatched = 0;
    const { sandbox, dom } = H.makeSandbox({
      transport: () => { dispatched++; return Promise.resolve(H.goodResponse()); },
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
    const matrix = [];
    const grid = sandbox.portfolioStressUiDefaultGrid();
    for (const s of sandbox.buildPortfolioStressUiScenarios(grid)) {
      matrix.push(H.cell(s.scenarioId, { actualStressPnl: -1 }));
    }
    st.scenarioGrid = grid;
    st.result = sandbox.normalizePortfolioStressResponse(H.goodResponse({ matrix: matrix }));
    st.phase = 'SUCCESS';
    // Render repeatedly, and select cells, which is what a user does.
    sandbox.pstxRender();
    sandbox.pstxSelectCell(matrix[0].scenarioId);
    sandbox.pstxSelectCell(matrix[5].scenarioId);
    sandbox.pstxRender();
    await tick(); await tick();
    ok(dispatched === 0, '8.1: rendering and selecting issued NO request, got ' + dispatched);
    ok(dom.renders.length >= 4, '8.2: the screen really was repainted');
    ok(dom.lastHtml.indexOf('pstx-cell-selected') !== -1, '8.3: the selected square is marked');
    ok(dom.lastHtml.indexOf('Actual vs Proposed') !== -1, '8.4: selecting a square opens its breakdown');
  }

  finish();
})();
