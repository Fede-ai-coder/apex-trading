'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI — MUTATION PROOF.
//
// WHY THIS FILE EXISTS
//   The other five suites pass. That is evidence the code is right today; it is
//   NOT evidence that the suites would notice if it stopped being right. A green
//   assertion that cannot fail is worse than no assertion, because it is read as
//   coverage.
//
//   So every rule this feature depends on is BROKEN here, in memory, and the
//   check that is supposed to catch it is re-run and must FAIL. If a mutation
//   passes, the guard it was aimed at is decorative and the suite says so.
//
// EVERY MUTATION IS IN MEMORY
//   `mutateSource` reads a module, replaces one anchor and hands the text to a
//   sandbox. No file is written, no runtime file is touched, and the anchor must
//   exist — a mutation that quietly changed nothing would "pass" for the wrong
//   reason, which is the exact failure this file exists to prevent.
//
// Run: node tests/portfolio-stress-ui-mutation.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const H = require('./lib/portfolio-stress-ui-sandbox.js');
const { ok, section, finish } = H.harness('UI mutation proof');

const tick = () => new Promise((r) => setTimeout(r, 0));
const ID = 'spy+0.00_vix+0.00';

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}

// The source-level guards from the architecture suite, re-expressed as functions
// so a mutation can be fed to the SAME rule rather than to a restatement of it.
function scanForbidden(code) {
  const hits = [];
  const RULES = [
    ['a direct fetch', /(?<![A-Za-z0-9_$.])fetch\s*\(/],
    ['a direct ttCall', /(?<![A-Za-z0-9_$.])ttCall\s*\(/],
    ['storage', /localStorage|sessionStorage|indexedDB/],
    ['an order path', /placeOrder|submitOrder|sendOrder|createOrder|orderTicket/],
    ['null-to-zero coercion', /\|\|\s*0\b|\?\?\s*0\b|\bNumber\s*\(|parseFloat\s*\([^)]*\)\s*\|\|/],
    ['a timer', /\bsetInterval\s*\(|\bsetTimeout\s*\(/],
    ['option chain access', /optionChain|fetchOptionChain|_optChainCache/],
    ['a pricing formula', /Math\.(exp|log|sqrt|pow)\s*\(|blackScholes|normCdf/],
    ['a result cache', /new Map\s*\(|new WeakMap\s*\(|memoize\s*\(/],
  ];
  for (const [label, re] of RULES) if (re.test(code)) hits.push(label);
  return hits;
}

// Render one cell through a (possibly mutated) module set.
function renderCell(backendCell, sources) {
  const { sandbox, dom } = H.makeSandbox({ sources: sources || {} });
  const st = sandbox.createPortfolioStressUiState();
  sandbox._pstxState = st;
  st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
  st.scenarioGrid = { spyReturns: [0], vixChangePcts: [0], horizonDays: 1, ivShockMethod: 'VIX_PROXY' };
  st.result = sandbox.normalizePortfolioStressResponse(H.goodResponse({ matrix: [backendCell] }));
  st.resultFingerprint = sandbox.portfolioStressUiInputsFingerprint(st);
  st.phase = 'SUCCESS';
  st.selectedScenarioId = backendCell.scenarioId;
  sandbox.pstxRender();
  return { html: dom.lastHtml, sandbox, state: st };
}

(async function main() {
  // ───────────────────────────────────────────────────────────────────────────
  section('1. The renderer turns null into zero');
  {
    // The baseline: a withdrawn Actual renders as an em dash and no zero.
    const clean = renderCell(H.cell(ID, { actualStatus: 'UNAVAILABLE', actualComplete: false })).html;
    ok(clean.indexOf('$0.00') === -1, '1.0: BASELINE — the honest renderer shows no zero');

    // MUTATION: the currency formatter falls back to zero instead of an em dash.
    const mutated = renderCell(H.cell(ID, { actualStatus: 'UNAVAILABLE', actualComplete: false }), {
      uiState: H.mutateSource('uiState',
        "function formatPortfolioStressUiCurrency(value) {\n  if (value === null || value === undefined) return PORTFOLIO_STRESS_UI_UNAVAILABLE_TEXT;",
        "function formatPortfolioStressUiCurrency(value) {\n  if (value === null || value === undefined) value = 0;"),
    }).html;
    ok(mutated.indexOf('$0.00') !== -1, '1.1: the mutation really did produce a zero');
    ok(clean !== mutated, '1.2: MUTATION CAUGHT — the render contract sees the difference');

    // The same mutation is caught at the SOURCE level too, by the coercion scan.
    const coerced = stripComments(H.mutateSource('uiState',
      'return (typeof value === \'number\' && isFinite(value)) ? value : null;',
      'return Number(value) || 0;'));
    ok(scanForbidden(coerced).indexOf('null-to-zero coercion') !== -1,
      '1.3: MUTATION CAUGHT — `Number(value) || 0` is rejected by the source scan');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('2. UNAVAILABLE is rendered as VALID');
  {
    const cellSpec = H.cell(ID, { actualStatus: 'UNAVAILABLE', actualComplete: false });
    const clean = renderCell(cellSpec).html;
    ok(clean.indexOf('&#8709;') !== -1, '2.0: BASELINE — UNAVAILABLE carries its glyph');

    // MUTATION: the status badge reports everything as VALID.
    const mutated = renderCell(cellSpec, {
      panel: H.mutateSource('panel',
        "  if (status === 'VALID') return '<span class=\"pstx-b pstx-b-ok\">VALID</span>';",
        "  return '<span class=\"pstx-b pstx-b-ok\">VALID</span>';"),
    }).html;
    const count = (s, needle) => (s.split(needle).length - 1);
    ok(count(mutated, 'UNAVAILABLE') < count(clean, 'UNAVAILABLE'),
      '2.1: the mutation really did hide the status (' + count(mutated, 'UNAVAILABLE') +
      ' vs ' + count(clean, 'UNAVAILABLE') + ' mentions)');
    ok(count(mutated, '>VALID<') > count(clean, '>VALID<'),
      '2.2: MUTATION CAUGHT — a withdrawn set is now badged VALID');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('3. DEGRADED is rendered as VALID');
  {
    const degraded = H.cell(ID, { actualStatus: 'DEGRADED', actualComplete: true, actualStressPnl: -500 });
    const clean = renderCell(degraded).html;
    ok(clean.indexOf('DEGRADED') !== -1, '3.0: BASELINE — DEGRADED is named');

    // MUTATION: the per-value status mark is dropped entirely.
    const mutated = renderCell(degraded, {
      panel: H.mutateSource('panel',
        "  if (read.status === 'DEGRADED') mark = ' <span class=\"pstx-mark pstx-mark-degraded\" title=\"DEGRADED\">&#9888;</span>';",
        '  if (false) mark = \'\';'),
    }).html;
    const warnings = (s) => (s.match(/&#9888;/g) || []).length;
    ok(warnings(mutated) < warnings(clean),
      '3.1: MUTATION CAUGHT — the degraded cell lost its warning glyph (' +
      warnings(mutated) + ' vs ' + warnings(clean) + ')');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('4. Overlay is promoted to Proposed');
  {
    const emptyActual = H.cell(ID, {
      actualStatus: 'UNAVAILABLE', actualComplete: false,
      proposedStatus: 'UNAVAILABLE', proposedComplete: false,
      overlayStatus: 'VALID', overlayComplete: true, overlayStressPnl: -777,
    });
    const clean = renderCell(emptyActual).html;
    const cleanProposed = clean.slice(clean.indexOf('With overlay / Proposed'));
    ok(cleanProposed.indexOf('-$777.00') === -1, '4.0: BASELINE — the Overlay figure is not under Proposed');

    // MUTATION: the Proposed column reads the Overlay field — the exact
    // substitution an empty Actual portfolio invites, because with Actual and
    // Proposed both withdrawn the Overlay is the only number left in the cell.
    const mutated = renderCell(emptyActual, {
      panel: H.mutateSource('panel',
        "  var proposed = readPortfolioStressUiField(cell, 'proposedStressPnl');\n  var proposedPct",
        "  var proposed = readPortfolioStressUiField(cell, 'overlayStressPnl');\n  var proposedPct"),
    }).html;
    const mutatedProposed = mutated.slice(mutated.indexOf('With overlay / Proposed'));
    ok(mutatedProposed.indexOf('-$777.00') !== -1, '4.1: the mutation really did promote the Overlay');
    ok(cleanProposed !== mutatedProposed, '4.2: MUTATION CAUGHT — Proposed = Overlay is visible in the render');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('5. A stale response overwrites a newer one');
  {
    // MUTATION: the run-id guard is removed from the result acceptor, so
    // whichever response resolves LAST wins — the failure that looks completely
    // normal on screen.
    const mutatedState = H.mutateSource('uiState',
      'function acceptPortfolioStressUiResult(state, runId, result, fingerprint) {\n  if (runId !== state.activeRunId) return false;',
      'function acceptPortfolioStressUiResult(state, runId, result, fingerprint) {');

    // Exercised at the state layer, where the guard lives. Going through the
    // panel would ALSO be caught by the AbortController — which is the second
    // line of defence, not this one — and a proof that cannot tell the two apart
    // would still pass with the run-id guard deleted.
    const land = (sources) => {
      const { sandbox } = H.makeSandbox({ sources: sources });
      const st = sandbox.createPortfolioStressUiState();
      const result = (n) => ({ cells: [{ scenarioId: ID, values: { actualStressPnl: n } }],
        cellCount: 1, contractViolations: [], status: 'VALID', metadata: {} });
      const firstRunId = sandbox.beginPortfolioStressUiRun(st);
      const secondRunId = sandbox.beginPortfolioStressUiRun(st);
      // The NEWER run lands first, then the older, superseded one resolves.
      sandbox.acceptPortfolioStressUiResult(st, secondRunId, result(-222), 'fp');
      sandbox.acceptPortfolioStressUiResult(st, firstRunId, result(-111), 'fp');
      return st.result.cells[0].values.actualStressPnl;
    };

    ok(land({}) === -222, '5.0: BASELINE — the newest run wins whatever the arrival order');
    ok(land({ uiState: mutatedState }) === -111,
      '5.1: MUTATION CAUGHT — without the run-id guard the superseded response overwrites it');

    // The AbortController is the SECOND guard, and it must be there too: a second
    // run aborts the first rather than leaving it running.
    const { sandbox, calls } = H.makeSandbox({ transport: () => new Promise(() => {}) });
    const st2 = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st2;
    sandbox.pstxRun();
    sandbox.pstxRun();
    ok(calls.aborts.length === 1, '5.2: BASELINE — the second run aborted the first');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('6. A portfolio change no longer dirties the result');
  {
    const check = (sources) => {
      const { sandbox } = H.makeSandbox({ sources: sources });
      const st = sandbox.createPortfolioStressUiState();
      st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
      const runId = sandbox.beginPortfolioStressUiRun(st);
      sandbox.acceptPortfolioStressUiResult(st, runId,
        { cells: [], cellCount: 0, contractViolations: [], status: 'VALID', metadata: {} },
        sandbox.portfolioStressUiInputsFingerprint(st));
      sandbox.setPortfolioStressUiPortfolio(st, 'pf-2', 'rev-9');
      return { stale: sandbox.portfolioStressUiResultIsStale(st), phase: st.phase };
    };
    const clean = check({});
    ok(clean.stale === true && clean.phase === 'DIRTY', '6.0: BASELINE — a portfolio change dirties the result');

    // MUTATION: the fingerprint stops covering the portfolio, so a different
    // portfolio's matrix reads as current.
    const mutated = check({
      uiState: H.mutateSource('uiState',
        '  return JSON.stringify({\n    portfolioId: state.portfolioId,\n    portfolioRevision: state.portfolioRevision,',
        '  return JSON.stringify({'),
    });
    ok(mutated.stale === false, '6.1: MUTATION CAUGHT — the result is no longer marked stale');

    // MUTATION: the revision is dropped from the watch, which is subtler — the
    // SAME portfolio with different positions.
    const revOnly = (() => {
      const { sandbox } = H.makeSandbox({
        sources: {
          uiState: H.mutateSource('uiState',
            '  if (idChanged) markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.PORTFOLIO_CHANGED);\n  else if (revChanged) markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.REVISION_CHANGED);',
            '  if (idChanged) markPortfolioStressUiDirty(state, PORTFOLIO_STRESS_UI_DIRTY_REASON.PORTFOLIO_CHANGED);'),
        },
      });
      const st = sandbox.createPortfolioStressUiState();
      st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
      const runId = sandbox.beginPortfolioStressUiRun(st);
      sandbox.acceptPortfolioStressUiResult(st, runId,
        { cells: [], cellCount: 0, contractViolations: [], status: 'VALID', metadata: {} },
        sandbox.portfolioStressUiInputsFingerprint(st));
      sandbox.setPortfolioStressUiPortfolio(st, 'pf-1', 'rev-2');
      return st.phase;
    })();
    ok(revOnly !== 'DIRTY',
      '6.2: MUTATION CAUGHT — dropping the revision watch stops the phase becoming DIRTY');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('7. The matrix sends one request per cell');
  {
    // MUTATION: the run loops over scenarios instead of sending them as one
    // batch — the N+1 the performance contract forbids outright.
    const mutated = H.mutateSource('panel',
      '  runPortfolioStressTestRequest(input, { signal: ctrl.signal }).then(function (result) {',
      '  input.scenarios.forEach(function (s) { runPortfolioStressTestRequest(' +
      '{ portfolioId: input.portfolioId, portfolioRevision: input.portfolioRevision, scenarios: [s],' +
      ' overlay: input.overlay, pricingConfiguration: input.pricingConfiguration },' +
      ' { signal: ctrl.signal }); });\n' +
      '  runPortfolioStressTestRequest(input, { signal: ctrl.signal }).then(function (result) {');

    const count = async (sources) => {
      const { sandbox, calls } = H.makeSandbox({
        sources: sources,
        transport: () => Promise.resolve(H.goodResponse({ matrix: [] })),
      });
      const st = sandbox.createPortfolioStressUiState();
      sandbox._pstxState = st;
      sandbox.pstxRun();
      await tick(); await tick();
      return calls.transport.length;
    };
    ok(await count({}) === 1, '7.0: BASELINE — the whole matrix is ONE request');
    ok(await count({ panel: mutated }) > 1,
      '7.1: MUTATION CAUGHT — a per-scenario loop shows up as many requests');
    // And at the source level: the dispatch-site count guard.
    const sites = (stripComments(mutated).match(/runPortfolioStressTestRequest\s*\(/g) || []).length;
    ok(sites !== 1, '7.2: MUTATION CAUGHT — the single-dispatch-site rule sees ' + sites + ' sites');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('8. The client is bypassed, or a second transport appears');
  {
    for (const [label, from, to] of [
      ['a direct fetch',
        'runPortfolioStressTestRequest(input, { signal: ctrl.signal })',
        "fetch('/portfolio/stress-test/run', { signal: ctrl.signal })"],
      ['a direct ttCall',
        'runPortfolioStressTestRequest(input, { signal: ctrl.signal })',
        "ttCall('/portfolio/stress-test/run', { method: 'POST', body: input })"],
    ]) {
      const hits = scanForbidden(stripComments(H.mutateSource('panel', from, to)));
      ok(hits.length > 0, '8.1: MUTATION CAUGHT — ' + label + ' is rejected (' + hits.join(', ') + ')');
    }
    ok(scanForbidden(stripComments(fs.readFileSync(H.FILES.panel, 'utf8'))).length === 0,
      '8.2: BASELINE — the real panel trips none of these rules');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('9. The overlay is persisted, or an order path appears');
  {
    for (const [label, to] of [
      ['overlay persistence', "  localStorage.setItem('overlay', JSON.stringify(state.overlayLegs));"],
      ['an order path', '  placeOrder(state.overlayLegs);'],
    ]) {
      const mutatedState = H.mutateSource('uiState',
        '  state.overlayLegs = state.overlayLegs.concat([v.leg]);',
        '  state.overlayLegs = state.overlayLegs.concat([v.leg]);\n' + to);
      const hits = scanForbidden(stripComments(mutatedState));
      ok(hits.length > 0, '9.1: MUTATION CAUGHT — ' + label + ' is rejected (' + hits.join(', ') + ')');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('10. Frontend pricing is introduced');
  {
    const mutated = H.mutateSource('uiState',
      'function _portfolioStressUiFiniteOrNull(value) {',
      'function _pstxTheoretical(s, k, t, v) { return s * Math.exp(-v * t) - k * Math.log(t); }\n' +
      'function _portfolioStressUiFiniteOrNull(value) {');
    const hits = scanForbidden(stripComments(mutated));
    ok(hits.indexOf('a pricing formula') !== -1,
      '10.1: MUTATION CAUGHT — a pricing formula in the UI tier is rejected');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('11. The parity check is bypassed');
  {
    // A response whose scope vocabulary does not match. The REAL client rejects
    // it before a number is read; without that check the matrix would render.
    const divergent = Object.assign(H.goodResponse({
      matrix: [H.cell(ID, { actualStressPnl: -4242 })],
    }), { portfolioScopeParityManifestVersion: '9.9.9' });

    const run = async (sources) => {
      const { sandbox, dom } = H.makeSandbox({ sources: sources, transport: () => Promise.resolve(divergent) });
      const st = sandbox.createPortfolioStressUiState();
      sandbox._pstxState = st;
      sandbox.pstxRun();
      await tick(); await tick();
      return { phase: st.phase, html: dom.lastHtml, kind: st.error ? st.error.kind : null };
    };

    const clean = await run({});
    ok(clean.kind === 'PARITY_DIVERGENCE' && clean.html.indexOf('-$4,242') === -1,
      '11.0: BASELINE — a divergent response is blocked and none of its numbers render');

    // MUTATION: the client stops verifying the response identity.
    const mutated = await run({
      client: H.mutateSource('client',
        '    var identity = assertPortfolioScopeParityResponse(response);',
        "    var identity = { portfolioScopeParityManifestVersion: 'x' };"),
    });
    ok(mutated.html.indexOf('-$4,242') !== -1,
      '11.1: MUTATION CAUGHT — bypassing the parity check lets a divergent matrix render');
    ok(clean.phase !== mutated.phase, '11.2: MUTATION CAUGHT — the phase differs too');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('12. A blocking error stops withholding the matrix');
  {
    const build = (sources) => {
      const { sandbox, dom } = H.makeSandbox({ sources: sources });
      const st = sandbox.createPortfolioStressUiState();
      sandbox._pstxState = st;
      st.portfolioId = 'pf-1'; st.portfolioRevision = 'rev-1';
      st.result = sandbox.normalizePortfolioStressResponse(H.goodResponse({
        matrix: [H.cell(ID, { actualStressPnl: -31337 })],
      }));
      st.phase = 'ERROR';
      st.error = { kind: 'PARITY_DIVERGENCE', blocking: true, title: 'mismatch', message: 'x' };
      sandbox.pstxRender();
      return dom.lastHtml;
    };
    ok(build({}).indexOf('-$31,337') === -1, '12.0: BASELINE — the matrix is withheld');
    const mutated = build({
      panel: H.mutateSource('panel',
        '  if (!pstxHasBlockingError(st)) {',
        '  if (true) {'),
    });
    ok(mutated.indexOf('-$31,337') !== -1,
      '12.1: MUTATION CAUGHT — removing the guard renders a matrix that must not be shown');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('13. A leg is accepted with an invented quantity');
  {
    const check = (sources) => {
      const { sandbox } = H.makeSandbox({ sources: sources });
      const st = sandbox.createPortfolioStressUiState();
      const res = sandbox.addPortfolioStressUiLeg(st, {
        underlying: 'SPY', expiration: '2026-12-18', strike: '500',
        optionType: 'PUT', side: 'LONG', contracts: '',
      });
      return { ok: res.ok, legs: st.overlayLegs.length, qty: res.ok ? st.overlayLegs[0].contracts : null };
    };
    ok(check({}).ok === false, '13.0: BASELINE — a blank contract count is refused');
    // MUTATION: the silent default-to-one hazard, in the builder.
    const mutated = check({
      uiState: H.mutateSource('uiState',
        '  var contracts = _portfolioStressUiStrictNumber(src.contracts);',
        '  var contracts = _portfolioStressUiStrictNumber(src.contracts);\n  if (contracts === null) contracts = 1;'),
    });
    ok(mutated.ok === true && mutated.qty === 1, '13.1: the mutation really did invent a quantity of 1');
    ok(check({}).ok !== mutated.ok, '13.2: MUTATION CAUGHT — the overlay contract sees the difference');
  }

  finish();
})();
