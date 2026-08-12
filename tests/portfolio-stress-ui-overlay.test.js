'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI — OVERLAY BUILDER CONTRACT.
//
// WHAT AN OVERLAY IS, AND WHAT IT MUST NEVER BECOME
//   A hypothetical structure that exists in memory for the length of a page view
//   and is sent with the next run. PST-OVERLAY-003 forbids it from touching the
//   Portfolio, the Journal, the backend trade store, localStorage, orders, real
//   quantities, real legs or any persistent cache — so the builder has no save
//   affordance at all, and §5 proves the absence rather than assuming it.
//
// VALIDATION IS THE OTHER HALF
//   PST-DATA-002 forbids a silent quantity of one. A builder that read a blank
//   contract count as 1, or `3abc` as 3, would inject exactly that hazard from
//   the frontend instead. Every reject case below is a value that a lenient
//   parser would have accepted.
//
// THE PAYLOAD IS PINNED EXACTLY
//   §3 asserts a leg is the seven declared fields and nothing else. A leg that
//   grew an eighth field would reach the backend validator as an unknown key.
//
// Run: node tests/portfolio-stress-ui-overlay.test.js
// ─────────────────────────────────────────────────────────────────────────────
const H = require('./lib/portfolio-stress-ui-sandbox.js');
const { ok, section, finish } = H.harness('UI overlay contract');

const GOOD = {
  underlying: 'SPY', expiration: '2026-12-18', strike: '500',
  optionType: 'PUT', side: 'LONG', contracts: '2',
};
const tick = () => new Promise((r) => setTimeout(r, 0));

(async function main() {
  // ───────────────────────────────────────────────────────────────────────────
  section('1. Add a leg');
  {
    const { sandbox } = H.makeSandbox({});
    const st = sandbox.createPortfolioStressUiState();
    const res = sandbox.addPortfolioStressUiLeg(st, GOOD);
    ok(res.ok === true, '1.1: a well-formed leg is accepted');
    ok(st.overlayLegs.length === 1, '1.2: it is in the overlay');
    const leg = st.overlayLegs[0];
    ok(leg.underlying === 'SPY' && leg.expiration === '2026-12-18', '1.3: the identity fields survive');
    ok(leg.strike === 500 && typeof leg.strike === 'number', '1.4: the strike is a NUMBER, not the typed string');
    ok(leg.contracts === 2 && typeof leg.contracts === 'number', '1.5: the contract count is a number');
    ok(leg.contractMultiplier === 100, '1.6: the multiplier defaults to 100 when not given');
    // The direction lives in `side`. A pre-signed count risks being signed twice.
    ok(leg.contracts > 0, '1.7: contracts is POSITIVE for a LONG');
    const short = sandbox.addPortfolioStressUiLeg(st, Object.assign({}, GOOD, { side: 'SHORT' }));
    ok(short.leg.contracts > 0 && short.leg.side === 'SHORT',
      '1.8: contracts is POSITIVE for a SHORT too — the sign is the backend\'s to apply, exactly once');
    ok(sandbox.addPortfolioStressUiLeg(st, Object.assign({}, GOOD, { underlying: 'spy' })).leg.underlying === 'SPY',
      '1.9: the symbol is normalized to upper case');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('2. Remove and clear');
  {
    const { sandbox } = H.makeSandbox({});
    const st = sandbox.createPortfolioStressUiState();
    sandbox.addPortfolioStressUiLeg(st, GOOD);
    sandbox.addPortfolioStressUiLeg(st, Object.assign({}, GOOD, { strike: '480' }));
    sandbox.addPortfolioStressUiLeg(st, Object.assign({}, GOOD, { strike: '460' }));
    ok(st.overlayLegs.length === 3, '2.1: three legs');
    ok(sandbox.removePortfolioStressUiLeg(st, 1) === true, '2.2: the middle leg is removed');
    ok(st.overlayLegs.length === 2 && st.overlayLegs[1].strike === 460,
      '2.3: the RIGHT leg was removed and the rest kept their order');
    ok(sandbox.removePortfolioStressUiLeg(st, 9) === false, '2.4: an out-of-range index removes nothing');
    ok(sandbox.removePortfolioStressUiLeg(st, -1) === false, '2.5: a negative index removes nothing');
    ok(sandbox.removePortfolioStressUiLeg(st, '0') === false, '2.6: a non-numeric index removes nothing');
    ok(st.overlayLegs.length === 2, '2.7: the bad removals really did nothing');
    ok(sandbox.clearPortfolioStressUiOverlay(st) === true, '2.8: clear empties the overlay');
    ok(st.overlayLegs.length === 0, '2.9: it is empty');
    ok(sandbox.clearPortfolioStressUiOverlay(st) === false, '2.10: clearing an empty overlay is a no-op');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('3. The payload is EXACTLY the seven declared fields');
  {
    const { sandbox, calls } = H.makeSandbox({
      transport: () => Promise.resolve(H.goodResponse()),
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.addPortfolioStressUiLeg(st, Object.assign({}, GOOD, { contractMultiplier: '10' }));
    sandbox.pstxRun();
    await tick(); await tick();

    const body = calls.transport[0].init.body;
    ok(Object.keys(body).sort().join(',') ===
      'overlay,portfolioId,portfolioRevision,portfolioScopeParity,pricingConfiguration,scenarios',
      '3.1: the request body is exactly the client\'s six fields');
    ok(Array.isArray(body.overlay.legs) && body.overlay.legs.length === 1, '3.2: the overlay travels as { legs: [] }');
    const sent = body.overlay.legs[0];
    const declared = sandbox.PORTFOLIO_STRESS_UI_LEG_FIELDS.slice().sort();
    ok(JSON.stringify(Object.keys(sent).sort()) === JSON.stringify(declared),
      '3.3: a leg is exactly ' + JSON.stringify(declared) + ', got ' + JSON.stringify(Object.keys(sent).sort()));
    ok(sent.contractMultiplier === 10, '3.4: an explicit multiplier is honoured');
    // The forbidden fields must never appear, at any level.
    const serialized = JSON.stringify(body);
    for (const forbidden of ['positions', 'marketSnapshot', 'spySnapshotPrice', 'spyPrice']) {
      ok(serialized.indexOf('"' + forbidden + '"') === -1, '3.5: the request carries no ' + forbidden);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('4. Invalid legs are REFUSED — never defaulted into existence');
  {
    const { sandbox } = H.makeSandbox({});
    const st = sandbox.createPortfolioStressUiState();
    const reject = (patch, label) => {
      const before = st.overlayLegs.length;
      const res = sandbox.addPortfolioStressUiLeg(st, Object.assign({}, GOOD, patch));
      ok(res.ok === false && res.errors.length > 0 && st.overlayLegs.length === before, label);
    };
    // Quantity — the "silent one" hazard.
    reject({ contracts: '' }, '4.1: a blank contract count is refused, not read as 1');
    reject({ contracts: '0' }, '4.2: zero contracts is refused');
    reject({ contracts: '-3' }, '4.3: a negative count is refused — direction belongs to side');
    reject({ contracts: '2.5' }, '4.4: a fractional contract count is refused');
    reject({ contracts: '3abc' }, '4.5: "3abc" is refused, not read as 3');
    reject({ contracts: null }, '4.6: null contracts is refused');
    reject({ contracts: undefined }, '4.7: absent contracts is refused');
    reject({ contracts: true }, '4.8: a boolean contract count is refused, not read as 1');
    // Strike.
    reject({ strike: '' }, '4.9: a blank strike is refused');
    reject({ strike: '0' }, '4.10: a zero strike is refused');
    reject({ strike: '-10' }, '4.11: a negative strike is refused');
    reject({ strike: 'abc' }, '4.12: a non-numeric strike is refused');
    reject({ strike: null }, '4.13: a null strike is refused, not read as 0');
    // Shape.
    reject({ underlying: '' }, '4.14: a blank underlying is refused');
    reject({ underlying: '123' }, '4.15: a symbol that is not a symbol is refused');
    reject({ optionType: 'STOCK' }, '4.16: an unsupported option type is refused');
    reject({ optionType: '' }, '4.17: a blank option type is refused');
    reject({ side: 'BUY' }, '4.18: an unsupported side is refused');
    reject({ expiration: '18/12/2026' }, '4.19: a non-ISO expiration is refused');
    reject({ expiration: '2026-13-01' }, '4.20: month 13 is refused');
    reject({ expiration: '2026-02-30' }, '4.21: a date that does not exist is refused');
    reject({ expiration: '' }, '4.22: a blank expiration is refused');
    reject({ contractMultiplier: '0' }, '4.23: a zero multiplier is refused');
    reject({ contractMultiplier: 'x' }, '4.24: a non-numeric multiplier is refused');
    ok(sandbox.addPortfolioStressUiLeg(st, null).ok === false, '4.25: a null leg is refused');
    ok(sandbox.addPortfolioStressUiLeg(st, {}).ok === false, '4.26: an empty leg is refused');
    // Every rejection names the field it is about.
    const res = sandbox.addPortfolioStressUiLeg(st, {});
    const fields = res.errors.map((e) => e.field).sort();
    ok(fields.join(',') === 'contracts,expiration,optionType,side,strike,underlying',
      '4.27: an empty leg reports every missing field by name, got ' + fields.join(','));
    ok(st.overlayLegs.length === 0, '4.28: after 26 rejections the overlay is still empty');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('5. NOTHING is persisted, and there is no way to persist it');
  {
    const { sandbox, dom } = H.makeSandbox({});
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.addPortfolioStressUiLeg(st, GOOD);
    sandbox.pstxRender();
    const html = dom.lastHtml;
    ok(html.indexOf('ephemeral, never saved') !== -1, '5.1: the builder says it is ephemeral');
    for (const affordance of ['SAVE', 'PERSIST', 'SUBMIT ORDER', 'PLACE ORDER', 'LOG TRADE', 'ADD TRADE']) {
      ok(html.indexOf(affordance) === -1, '5.2: the builder offers no ' + affordance + ' control');
    }
    // A brand-new state object shares nothing with the one that has legs.
    const fresh = sandbox.createPortfolioStressUiState();
    ok(fresh.overlayLegs.length === 0, '5.3: a fresh state has no legs — nothing was stored anywhere');
    // The legs array is replaced, not mutated in place, so a captured reference
    // cannot be edited from outside.
    const captured = st.overlayLegs;
    sandbox.addPortfolioStressUiLeg(st, Object.assign({}, GOOD, { strike: '400' }));
    ok(captured.length === 1 && st.overlayLegs.length === 2,
      '5.4: adding a leg replaces the array rather than mutating a shared one');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('6. The builder reads the form and reports its errors');
  {
    const { sandbox, dom } = H.makeSandbox({
      elements: {
        'pstx-leg-underlying': 'QQQ', 'pstx-leg-expiration': '2027-01-15',
        'pstx-leg-strike': '0', 'pstx-leg-type': 'CALL',
        'pstx-leg-side': 'SHORT', 'pstx-leg-contracts': '', 'pstx-leg-multiplier': '100',
      },
    });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.pstxAddLeg();
    ok(st.overlayLegs.length === 0, '6.1: the invalid form added nothing');
    ok(dom.lastHtml.indexOf('strike') !== -1 && dom.lastHtml.indexOf('contracts') !== -1,
      '6.2: both bad fields are reported on screen');
    // Fix the form and add again.
    sandbox.__elements['pstx-leg-strike'].value = '350';
    sandbox.__elements['pstx-leg-contracts'].value = '4';
    sandbox.pstxAddLeg();
    ok(st.overlayLegs.length === 1, '6.3: the corrected form adds the leg');
    ok(st.overlayLegs[0].underlying === 'QQQ' && st.overlayLegs[0].side === 'SHORT',
      '6.4: the leg carries what the form said');
    ok(dom.lastHtml.indexOf('CLEAR OVERLAY') !== -1, '6.5: a clear control appears once there is something to clear');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('7. An empty overlay is a legitimate run');
  {
    const { sandbox, calls } = H.makeSandbox({ transport: () => Promise.resolve(H.goodResponse()) });
    const st = sandbox.createPortfolioStressUiState();
    sandbox._pstxState = st;
    sandbox.pstxRun();
    await tick(); await tick();
    ok(calls.transport.length === 1, '7.1: a run with no overlay is dispatched');
    ok(JSON.stringify(calls.transport[0].init.body.overlay) === '{"legs":[]}',
      '7.2: it carries an EMPTY legs array, not a missing overlay');
  }

  finish();
})();
