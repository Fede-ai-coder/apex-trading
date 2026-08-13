'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI — RUN LIFECYCLE CONTRACT.
//
// THE PROPERTY THIS SUITE EXISTS FOR
//            whichever response arrives last, the NEWEST run's wins
//
//   An abort signal is advisory. A backend that has already written its response
//   will finish sending it, and a slow first run can land after a fast second
//   one. If the renderer simply painted whatever resolved, the screen would show
//   the older matrix — and it would look completely normal. That is the failure
//   this suite is built around, and §3 forces exactly that interleaving.
//
// ALSO PINNED
//   the phase machine; a second run aborting the first; every input that must
//   mark a displayed result STALE; 409 reported as INPUTS CHANGED rather than as
//   a generic failure; a parity divergence as a BLOCKING error; abort reported as
//   ABORTED and not as an error; and no automatic retry or rerun anywhere.
//
// Run: node tests/portfolio-stress-ui-lifecycle.test.js
// ─────────────────────────────────────────────────────────────────────────────
const H = require('./lib/portfolio-stress-ui-sandbox.js');
const { ok, section, finish } = H.harness('UI lifecycle contract');

const PHASES = ['IDLE', 'DIRTY', 'LOADING', 'SUCCESS', 'DEGRADED', 'ERROR', 'ABORTED'];
const tick = () => new Promise((r) => setTimeout(r, 0));

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

(async function main() {
  // ───────────────────────────────────────────────────────────────────────────
  section('1. The phase machine is exactly the declared set');
  {
    const { sandbox } = H.makeSandbox({});
    const declared = Object.keys(sandbox.PORTFOLIO_STRESS_UI_PHASE);
    ok(JSON.stringify(declared.sort()) === JSON.stringify([...PHASES].sort()),
      '1.1: the phases are ' + JSON.stringify(PHASES) + ', got ' + JSON.stringify(declared));
    const st = sandbox.createPortfolioStressUiState();
    ok(st.phase === 'IDLE', '1.2: a fresh screen is IDLE');
    ok(st.result === null && st.error === null, '1.3: a fresh screen holds no result and no error');
    ok(st.runSeq === 0 && st.activeRunId === null, '1.4: no run has been opened');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('2. First run: one request, one batch, every scenario in it');
  {
    let seen = null;
    const { sandbox, calls } = H.makeSandbox({
      transport: (p, init) => { seen = init.body; return Promise.resolve(H.goodResponse({ matrix: [] })); },
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.pstxRun();
    ok(st.phase === 'LOADING', '2.1: the screen is LOADING while the run is in flight');
    await tick(); await tick();
    ok(calls.transport.length === 1, '2.2: exactly ONE request was made, got ' + calls.transport.length);
    ok(calls.transport[0].path === '/portfolio/stress-test/run', '2.3: it went to the one stress endpoint');
    ok(calls.transport[0].init.method === 'POST', '2.4: it was a POST');
    const expected = 7 * 5; // the default grid
    ok(seen.scenarios.length === expected, '2.5: all ' + expected + ' scenarios travelled in ONE body, got ' + seen.scenarios.length);
    ok(st.phase === 'SUCCESS', '2.6: the screen settles on SUCCESS');
    ok(st.activeRunId === null, '2.7: the run is closed');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('3. A stale response can NEVER overwrite a newer one');
  {
    const first = deferred();
    const second = deferred();
    let n = 0;
    const { sandbox, calls } = H.makeSandbox({
      transport: () => { n++; return n === 1 ? first.promise : second.promise; },
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;

    sandbox.pstxRun();
    const firstRunId = st.activeRunId;
    sandbox.pstxRun();
    const secondRunId = st.activeRunId;
    ok(secondRunId > firstRunId, '3.1: the second run opened a NEW run id');
    ok(calls.aborts.length === 1, '3.2: starting the second run aborted the first');

    // The SECOND run answers first...
    second.resolve(H.goodResponse({ matrix: [H.cell('spy+0.00_vix+0.00', { actualStressPnl: -222 })] }));
    await tick(); await tick();
    ok(st.result.cells[0].values.actualStressPnl === -222, '3.3: the newest run landed');

    // ...and only THEN does the first, superseded run resolve.
    first.resolve(H.goodResponse({ matrix: [H.cell('spy+0.00_vix+0.00', { actualStressPnl: -111 })] }));
    await tick(); await tick();
    ok(st.result.cells[0].values.actualStressPnl === -222,
      '3.4: the superseded response did NOT overwrite the newer one');
    ok(st.phase === 'SUCCESS', '3.5: the phase was not disturbed by the late arrival');

    // The same must hold for a late FAILURE, which would otherwise wipe a good
    // result and show an error for a run nobody is waiting for.
    const accepted = sandbox.acceptPortfolioStressUiError(st, firstRunId, { kind: 'BACKEND_ERROR', blocking: false });
    ok(accepted === false, '3.6: a superseded FAILURE is refused too');
    ok(st.error === null && st.phase === 'SUCCESS', '3.7: the good result survived the late failure');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('4. Abort is ABORTED, and it does not destroy the visible result');
  {
    const { sandbox } = H.makeSandbox({});
    const st = sandbox.createPortfolioStressUiState();
    st.result = { cells: [], cellCount: 0, contractViolations: [], status: 'VALID', metadata: {} };
    st.phase = 'SUCCESS';
    const runId = sandbox.beginPortfolioStressUiRun(st);
    const abortErr = Object.assign(new Error('aborted'), { code: 'PORTFOLIO_STRESS_ABORTED', name: 'AbortError' });
    const classified = sandbox.classifyPortfolioStressUiError(abortErr, null);
    ok(classified.kind === 'ABORTED', '4.1: an abort classifies as ABORTED');
    ok(classified.blocking === false, '4.2: an abort is not a blocking error');
    sandbox.acceptPortfolioStressUiError(st, runId, classified);
    ok(st.phase === 'ABORTED', '4.3: the phase is ABORTED, not ERROR');
    ok(st.result !== null, '4.4: the previous result is still there — an abort is not a failure');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('5. 409 is INPUTS CHANGED, and it is not a generic error');
  {
    const { sandbox } = H.makeSandbox({});
    const err = new Error('HTTP 409');
    const generic = sandbox.classifyPortfolioStressUiError(new Error('HTTP 500'), 500);
    const conflict = sandbox.classifyPortfolioStressUiError(err, 409);
    ok(conflict.kind === 'INPUTS_CHANGED', '5.1: 409 classifies as INPUTS_CHANGED');
    ok(/rerun required/i.test(conflict.title), '5.2: the title says a rerun is required');
    ok(generic.kind === 'BACKEND_ERROR', '5.3: a 500 is a generic backend error');
    ok(generic.kind !== conflict.kind, '5.4: the two are distinguishable');

    const st = sandbox.createPortfolioStressUiState();
    const runId = sandbox.beginPortfolioStressUiRun(st);
    sandbox.acceptPortfolioStressUiError(st, runId, conflict);
    ok(st.dirtyReasons.indexOf('BACKEND_REPORTED_INPUTS_CHANGED') !== -1,
      '5.5: a 409 records that the backend reported the inputs moved');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('6. A parity divergence is BLOCKING');
  {
    const { sandbox } = H.makeSandbox({});
    const err = Object.assign(new Error('PORTFOLIO_SCOPE_PARITY_DIVERGENCE: manifest version 2.1.0 vs 2.0.0'),
      { code: 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE' });
    const c = sandbox.classifyPortfolioStressUiError(err, null);
    ok(c.kind === 'PARITY_DIVERGENCE', '6.1: it classifies as a parity divergence');
    ok(c.blocking === true, '6.2: it is BLOCKING');
    ok(/contract mismatch/i.test(c.title) && /update required/i.test(c.title),
      '6.3: the message names a frontend/backend contract mismatch requiring an update');

    // And it really does reach the panel as a divergence: the REAL client rejects
    // a response whose identifiers do not match, before any number is read.
    const { sandbox: sb2, dom } = H.makeSandbox({
      transport: () => Promise.resolve(Object.assign(H.goodResponse({
        matrix: [H.cell('spy+0.00_vix+0.00', { actualStressPnl: -1 })],
      }), { portfolioScopeParityManifestVersion: '9.9.9' })),
    });
    const st2 = sb2.createPortfolioStressUiState();
    sb2._pstxState = st2;
    sb2.pstxRun();
    await tick(); await tick();
    ok(st2.phase === 'ERROR' && st2.error.kind === 'PARITY_DIVERGENCE',
      '6.4: a divergent response really does land as a blocking divergence');
    ok(st2.result === null, '6.5: no result was stored from a divergent response');
    ok(dom.lastHtml.indexOf('MATRIX WITHHELD') !== -1, '6.6: the matrix is withheld on screen');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('7. Every declared input marks a displayed result STALE');
  {
    const mkSettled = () => {
      const { sandbox } = H.makeSandbox({});
      const st = sandbox.createPortfolioStressUiState();
      st.portfolioId = 'pf-1';
      st.portfolioRevision = 'rev-1';
      const runId = sandbox.beginPortfolioStressUiRun(st);
      const fp = sandbox.portfolioStressUiInputsFingerprint(st);
      sandbox.acceptPortfolioStressUiResult(st, runId, { cells: [], cellCount: 0, contractViolations: [], status: 'VALID', metadata: {} }, fp);
      return { sandbox, st };
    };

    {
      const { sandbox, st } = mkSettled();
      ok(st.phase === 'SUCCESS' && !sandbox.portfolioStressUiResultIsStale(st), '7.0: a fresh result is not stale');
    }
    {
      const { sandbox, st } = mkSettled();
      sandbox.setPortfolioStressUiPortfolio(st, 'pf-2', 'rev-1');
      ok(sandbox.portfolioStressUiResultIsStale(st) && st.phase === 'DIRTY', '7.1: a portfolio change marks it stale');
      ok(st.dirtyReasons.indexOf('PORTFOLIO_CHANGED') !== -1, '7.1b: and says the portfolio changed');
    }
    {
      const { sandbox, st } = mkSettled();
      sandbox.setPortfolioStressUiPortfolio(st, 'pf-1', 'rev-2');
      ok(sandbox.portfolioStressUiResultIsStale(st) && st.phase === 'DIRTY', '7.2: a REVISION change marks it stale');
      ok(st.dirtyReasons.indexOf('REVISION_CHANGED') !== -1, '7.2b: and says the revision changed');
    }
    {
      const { sandbox, st } = mkSettled();
      sandbox.setPortfolioStressUiScenarioGrid(st, {
        spyReturns: [0, -0.5], vixChangePcts: [0], horizonDays: 1, ivShockMethod: 'VIX_PROXY',
      });
      ok(sandbox.portfolioStressUiResultIsStale(st) && st.phase === 'DIRTY', '7.3: a scenario-grid change marks it stale');
      ok(st.dirtyReasons.indexOf('SCENARIOS_CHANGED') !== -1, '7.3b: and says the scenarios changed');
    }
    {
      const { sandbox, st } = mkSettled();
      sandbox.addPortfolioStressUiLeg(st, {
        underlying: 'SPY', expiration: '2026-12-18', strike: '500',
        optionType: 'PUT', side: 'LONG', contracts: '1',
      });
      ok(sandbox.portfolioStressUiResultIsStale(st) && st.phase === 'DIRTY', '7.4: an overlay edit marks it stale');
      ok(st.dirtyReasons.indexOf('OVERLAY_CHANGED') !== -1, '7.4b: and says the overlay changed');
    }
    {
      const { sandbox, st } = mkSettled();
      st.pricingConfiguration = { exerciseStyle: 'AMERICAN' };
      ok(sandbox.portfolioStressUiResultIsStale(st), '7.5: a pricingConfiguration change marks it stale');
    }
    {
      // Staleness must not be a one-way flag: restoring the inputs restores it.
      const { sandbox, st } = mkSettled();
      sandbox.setPortfolioStressUiPortfolio(st, 'pf-2', 'rev-1');
      sandbox.setPortfolioStressUiPortfolio(st, 'pf-1', 'rev-1');
      ok(!sandbox.portfolioStressUiResultIsStale(st),
        '7.6: staleness is a comparison, not a latch — restoring the inputs clears it');
    }
    {
      // The stale result is KEPT, not discarded, and never recomputed.
      const { sandbox, st } = mkSettled();
      const before = st.result;
      sandbox.setPortfolioStressUiPortfolio(st, 'pf-9', 'rev-9');
      ok(st.result === before, '7.7: the previous run stays visible as evidence');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('8. The screen says RERUN REQUIRED, and does not rerun by itself');
  {
    let runs = 0;
    const { sandbox, dom } = H.makeSandbox({
      transport: () => { runs++; return Promise.resolve(H.goodResponse({ matrix: [] })); },
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.pstxRun();
    await tick(); await tick();
    ok(runs === 1, '8.1: one run so far');

    sandbox.addPortfolioStressUiLeg(st, {
      underlying: 'SPY', expiration: '2026-12-18', strike: '500',
      optionType: 'PUT', side: 'LONG', contracts: '2',
    });
    sandbox.pstxRender();
    ok(dom.lastHtml.indexOf('INPUTS CHANGED — RERUN REQUIRED') !== -1, '8.2: the banner says inputs changed');
    ok(dom.lastHtml.indexOf('not recomputed in the browser') !== -1,
      '8.3: the banner says the old result is not recomputed locally');
    await tick(); await tick();
    ok(runs === 1, '8.4: editing the overlay started NO run of its own');
    ok(dom.lastHtml.indexOf('RERUN') !== -1, '8.5: the button offers a rerun for the user to press');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('9. A blocked run never reaches the network');
  {
    let runs = 0;
    const { sandbox } = H.makeSandbox({
      portfolio: { id: 'pf-1', name: 'No revision here' },   // publishes NO revision
      transport: () => { runs++; return Promise.resolve(H.goodResponse()); },
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.pstxRun();
    await tick(); await tick();
    ok(runs === 0, '9.1: with no portfolio revision, nothing was dispatched');
    ok(st.phase === 'ERROR' && /revision/i.test(st.error.message), '9.2: the screen says why it is blocked');
    ok(st.portfolioRevision === null, '9.3: no revision was invented to make the run possible');

    // ...and with a revision the backend published, it does run.
    const { sandbox: sb2, calls } = H.makeSandbox({
      portfolio: { id: 'pf-1', name: 'Main', updatedAt: '2026-08-12T09:00:00Z' },
      transport: () => Promise.resolve(H.goodResponse()),
    });
    const st2 = sb2.createPortfolioStressUiState();
    sb2._pstxState = st2;
    sb2.pstxRun();
    await tick(); await tick();
    ok(calls.transport.length === 1, '9.4: a backend-published updatedAt is a usable revision');
    ok(calls.transport[0].init.body.portfolioRevision === '2026-08-12T09:00:00Z',
      '9.5: the run is pinned to the revision the BACKEND published');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('10. Leaving the tab aborts, and nothing keeps running');
  {
    const pending = deferred();
    const { sandbox, calls } = H.makeSandbox({ transport: () => pending.promise });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.pstxRun();
    ok(st.phase === 'LOADING', '10.1: a run is in flight');
    sandbox.pstxPanelClose();
    ok(calls.aborts.length === 1, '10.2: leaving the tab aborted it');
    ok(sandbox._pstxAbort === null, '10.3: the controller reference is released');
    // Re-opening does not start a run.
    const before = calls.transport.length;
    sandbox.pstxPanelOpen();
    await tick();
    ok(calls.transport.length === before, '10.4: re-opening the tab starts NO run');
    ok(Array.isArray(st.overlayLegs), '10.5: the ephemeral state survived the round trip');
  }

  finish();
})();
