'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS RESPONSE — NULL SAFETY (PST-NULL-001..005).
//
// THE FAILURE THIS SUITE EXISTS TO PREVENT
//   The backend withdraws the Actual and the Proposed Greeks when the Actual
//   portfolio is empty or unknown, and leaves the Overlay exactly as the Overlay
//   earned it (lib/portfolio-stress-engine.js `withEmptyActual`, backend 7027f0c).
//   That asymmetry is correct — a hypothetical structure priced against a frozen
//   market is a real answer — and it is also a trap. With `rawGreeks.actual`
//   withdrawn, the only non-null Greek vector left in the cell is
//   `rawGreeks.overlay`, so any reader with a fallback chain, a `|| 0` or a
//   "nearest available vector" habit ends up publishing
//
//               Proposed Greeks = Overlay Greeks
//
//   which presents the hypothetical structure AS the resulting portfolio. It is
//   the same substitution the P&L side already forbids, smuggled in through
//   Delta/Gamma/Vega/Theta.
//
//   The zero vector is what makes it survive review: `0 + overlay` is correct
//   addition of an incorrect addend, and every number looks plausible. A
//   portfolio that is not there has no delta; it does not have a delta of zero.
//
// WHY THE OVERLAY FIXTURE IS ASYMMETRIC
//   A 1-long/1-short overlay nets to zero in most components, so "proposed
//   equals overlay" and "proposed is a zero vector" become indistinguishable and
//   every assertion passes vacuously. The overlay vector used here is non-zero
//   in ALL FOUR components and different from every other vector in the fixture,
//   so a substitution cannot hide.
//
// Run: node tests/portfolio-stress-null-safety.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const RESPONSE_PATH = path.join(ROOT, 'js', 'services', 'portfolio-stress-response.js');
const CLIENT_PATH = path.join(ROOT, 'js', 'services', 'portfolio-stress-client.js');

// ── tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function section(t) { console.log('\n' + t); }

const RESPONSE_SRC = fs.readFileSync(RESPONSE_PATH, 'utf8');
const CLIENT_SRC = fs.readFileSync(CLIENT_PATH, 'utf8');
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}
const RESPONSE_CODE = stripComments(RESPONSE_SRC);
const CLIENT_CODE = stripComments(CLIENT_SRC);

const sandbox = { console, JSON, Object, Array, Error, String, Number, Boolean, Math, isFinite };
vm.createContext(sandbox);
vm.runInContext(RESPONSE_SRC, sandbox);
const call = (expr, vars) => { Object.assign(sandbox, vars || {}); return vm.runInContext(expr, sandbox); };

// ── fixtures ─────────────────────────────────────────────────────────────────
// Non-zero in every component, and no component shared with any other vector.
const OVERLAY_GREEKS = { delta: -37.5, gamma: 2.25, vega: -14.75, theta: 8.125 };
const ACTUAL_GREEKS = { delta: 118.25, gamma: -0.875, vega: 63.5, theta: -21.375 };
const PROPOSED_GREEKS = {
  delta: ACTUAL_GREEKS.delta + OVERLAY_GREEKS.delta,
  gamma: ACTUAL_GREEKS.gamma + OVERLAY_GREEKS.gamma,
  vega: ACTUAL_GREEKS.vega + OVERLAY_GREEKS.vega,
  theta: ACTUAL_GREEKS.theta + OVERLAY_GREEKS.theta,
};

// Exactly what `withEmptyActual` publishes: Actual and Proposed withdrawn in
// every Greek slot, Overlay untouched, equityShareDelta null.
function emptyActualCell(reason, overlay) {
  return {
    scenarioId: 's1',
    status: 'UNAVAILABLE',
    actualPortfolioEmptyReason: reason,
    actualStatus: 'UNAVAILABLE',
    overlayStatus: overlay ? 'VALID' : 'UNAVAILABLE',
    proposedStatus: 'UNAVAILABLE',
    actualStressPnl: null,
    overlayStressPnl: overlay ? -1875.5 : null,
    proposedStressPnl: null,
    partialActualStressPnl: null,
    partialProposedStressPnl: null,
    difference: null,
    incrementalEffect: null,
    rawGreeks: { actual: null, overlay: overlay ? Object.assign({}, OVERLAY_GREEKS) : null, proposed: null },
    partialRawGreeks: { actual: null, overlay: null, proposed: null },
    rawGreekCompleteness: { actual: false, overlay: !!overlay, proposed: false },
    rawGreekStatus: {
      actual: 'UNAVAILABLE',
      overlay: overlay ? 'VALID' : 'UNAVAILABLE',
      proposed: 'UNAVAILABLE',
    },
    equityShareDelta: null,
    rawGreekUnits: 'RAW_DXFEED_EVENT_UNITS x SIGNED_CONTRACTS',
  };
}

// A run where everything is present: all three sets publish a vector.
function completeCell() {
  return {
    scenarioId: 's1',
    status: 'VALID',
    actualStatus: 'VALID', overlayStatus: 'VALID', proposedStatus: 'VALID',
    actualStressPnl: -4200.25, overlayStressPnl: -1875.5, proposedStressPnl: -6075.75,
    difference: -1875.5, incrementalEffect: -1875.5,
    partialActualStressPnl: null, partialOverlayStressPnl: null, partialProposedStressPnl: null,
    rawGreeks: {
      actual: Object.assign({}, ACTUAL_GREEKS),
      overlay: Object.assign({}, OVERLAY_GREEKS),
      proposed: Object.assign({}, PROPOSED_GREEKS),
    },
    partialRawGreeks: { actual: null, overlay: null, proposed: null },
    rawGreekCompleteness: { actual: true, overlay: true, proposed: true },
    rawGreekStatus: { actual: 'VALID', overlay: 'VALID', proposed: 'VALID' },
    equityShareDelta: 250,
    rawGreekUnits: 'RAW_DXFEED_EVENT_UNITS x SIGNED_CONTRACTS',
  };
}

const vecEq = (a, b) => a && b && ['delta', 'gamma', 'vega', 'theta'].every((k) => a[k] === b[k]);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The forbidden coercion idioms do not appear on the result path');
{
  // `Number(` with a word character in front is `readPortfolioStressNumber(`,
  // which is the strict reader, not the coercion.
  for (const [label, re] of [
    ['Number(value) coercion', /(?<![A-Za-z0-9_$])Number\s*\(/],
    ['a `|| 0` default', /\|\|\s*0(?![.\d])/],
    ['a `?? 0` default', /\?\?\s*0(?![.\d])/],
    ['parseFloat', /parseFloat\s*\(/],
    ['parseInt', /parseInt\s*\(/],
    ['unary + coercion of a field', /[=(,\s]\+\s*(?:cell|response|value|raw)\b/],
  ]) {
    ok(!re.test(RESPONSE_CODE), '1.1: the response contract contains no ' + label);
    ok(!re.test(CLIENT_CODE), '1.2: the client contains no ' + label);
  }
  ok(/typeof value === 'number' && isFinite\(value\)/.test(RESPONSE_CODE),
    '1.3: the strict number reader accepts only a real finite number');
}

section('2. Strict primitive readers — null stays null');
{
  const num = (v) => call('readPortfolioStressNumber(__v)', { __v: v });
  ok(num(0) === 0, '2.1: a published 0 survives as 0');
  ok(num(-4200.25) === -4200.25, '2.2: a real number survives unchanged');
  for (const [label, v] of [
    ['null', null], ['undefined', undefined], ['an empty string', ''], ['a numeric string', '4.2'],
    ['true', true], ['false', false], ['NaN', NaN], ['Infinity', Infinity], ['an object', {}], ['an array', []],
  ]) {
    ok(num(v) === null, '2.3: ' + label + ' reads as null, never as a number');
  }
  // The single most important line in this suite.
  ok(num(null) !== 0, '2.4: Number(null) === 0 is NOT what this reader does');

  const bool = (v) => call('readPortfolioStressBoolean(__v)', { __v: v });
  ok(bool(true) === true && bool(false) === false, '2.5: real booleans survive');
  ok(bool(null) === null && bool(undefined) === null && bool(1) === null && bool('true') === null,
    '2.6: a missing or non-boolean completeness is null, never a truthiness verdict');
}

section('3. Status — UNAVAILABLE never becomes VALID, DEGRADED keeps its number');
{
  const st = (v) => call('readPortfolioStressStatus(__v)', { __v: v });
  ok(st('VALID') === 'VALID', '3.1: VALID is preserved');
  ok(st('DEGRADED') === 'DEGRADED', '3.2: DEGRADED is preserved — it is not rounded up to VALID');
  ok(st('UNAVAILABLE') === 'UNAVAILABLE', '3.3: UNAVAILABLE is preserved');
  for (const [label, v] of [['null', null], ['undefined', undefined], ['an empty string', ''],
    ['an unknown token', 'OK'], ['a number', 1], ['true', true]]) {
    ok(st(v) === 'UNAVAILABLE', '3.4: ' + label + ' degrades to UNAVAILABLE, never upgrades to VALID');
  }
  ok(call("portfolioStressStatusIsAuthoritative('VALID')") === true, '3.5: only VALID is authoritative');
  ok(call("portfolioStressStatusIsAuthoritative('DEGRADED')") === false,
    '3.6: DEGRADED is not authoritative — the number is kept, the authority is not');
  ok(call("portfolioStressStatusIsAuthoritative('UNAVAILABLE')") === false, '3.7: UNAVAILABLE is not authoritative');

  // A DEGRADED cell keeps its figures.
  const degraded = Object.assign(completeCell(), {
    status: 'DEGRADED',
    rawGreekStatus: { actual: 'DEGRADED', overlay: 'VALID', proposed: 'DEGRADED' },
  });
  const n = call('normalizePortfolioStressCell(__c)', { __c: degraded });
  ok(n.status === 'DEGRADED', '3.8: a DEGRADED run stays DEGRADED');
  ok(n.authoritative.actualStressPnl === -4200.25, '3.9: a DEGRADED cell keeps its number');
  ok(n.rawGreeks.actual.status === 'DEGRADED' && vecEq(n.rawGreeks.actual.values, ACTUAL_GREEKS),
    '3.10: a DEGRADED Greek vector keeps its components');
  ok(n.rawGreeks.actual.authoritative === false,
    '3.11: a DEGRADED Greek vector is NOT authoritative');
}

section('4. EMPTY ACTUAL + COMPLETE OVERLAY — the substitution must not happen');
{
  const cell = emptyActualCell('ACTUAL_PORTFOLIO_EMPTY', true);
  const n = call('normalizePortfolioStressCell(__c)', { __c: cell });

  ok(n.rawGreeks.actual.values === null, '4.1: rawGreeks.actual is null — not a zero vector');
  ok(n.rawGreeks.proposed.values === null, '4.2: rawGreeks.proposed is null');
  ok(n.rawGreeks.actual.partialValues === null && n.rawGreeks.proposed.partialValues === null,
    '4.3: partialRawGreeks.actual and .proposed are null too');
  ok(n.rawGreeks.actual.complete === false && n.rawGreeks.proposed.complete === false,
    '4.4: rawGreekCompleteness.actual and .proposed are false');
  ok(n.rawGreeks.actual.status === 'UNAVAILABLE' && n.rawGreeks.proposed.status === 'UNAVAILABLE',
    '4.5: rawGreekStatus.actual and .proposed are UNAVAILABLE');
  ok(n.equityShareDelta === null, '4.6: equityShareDelta is null — zero shares held is a different claim');

  // The Overlay stays independently evaluable, non-zero, and complete.
  ok(vecEq(n.rawGreeks.overlay.values, OVERLAY_GREEKS), '4.7: the Overlay Greeks are published exactly as earned');
  ok(n.rawGreeks.overlay.authoritative === true, '4.8: a complete Overlay is authoritative on its own');
  ok(['delta', 'gamma', 'vega', 'theta'].every((k) => OVERLAY_GREEKS[k] !== 0),
    '4.9: the Overlay vector is non-zero in every component — this suite is not vacuous');

  // The substitution, asserted directly.
  ok(!vecEq(n.rawGreeks.proposed.values, n.rawGreeks.overlay.values),
    '4.10: Proposed is NOT the Overlay');
  ok(n.rawGreeks.proposed.values !== n.rawGreeks.overlay.values,
    '4.11: Proposed does not even share the Overlay object');
  const proposed = call('readPortfolioStressProposedGreeks(__c)', { __c: cell });
  ok(proposed.values === null && proposed.set === 'proposed',
    '4.12: the dedicated Proposed reader returns null and names the set it read');
  ok(proposed.authoritative === false, '4.13: a withdrawn Proposed is not authoritative');

  // And no zero anywhere it would be an answer.
  for (const set of ['actual', 'proposed']) {
    ok(n.rawGreeks[set].values !== 0 && JSON.stringify(n.rawGreeks[set].values) !== JSON.stringify({ delta: 0, gamma: 0, vega: 0, theta: 0 }),
      '4.14: ' + set + ' is not a zero vector');
  }
  ok(n.authoritative.actualStressPnl === null && n.authoritative.proposedStressPnl === null,
    '4.15: the P&L side is withdrawn under the same rule');
  ok(n.authoritative.overlayStressPnl === -1875.5, '4.16: the Overlay P&L is still published');
  ok(n.actualPortfolioEmptyReason === 'ACTUAL_PORTFOLIO_EMPTY', '4.17: the reason the Actual was withdrawn is preserved');
}

section('5. PORTFOLIO NOT FOUND + complete Overlay — the same rule');
{
  const cell = emptyActualCell('PORTFOLIO_NOT_FOUND', true);
  const n = call('normalizePortfolioStressCell(__c)', { __c: cell });
  ok(n.rawGreeks.actual.values === null && n.rawGreeks.proposed.values === null,
    '5.1: a portfolio that does not exist withdraws Actual and Proposed');
  ok(!vecEq(n.rawGreeks.proposed.values, n.rawGreeks.overlay.values),
    '5.2: Proposed is still not the Overlay');
  ok(n.equityShareDelta === null, '5.3: equityShareDelta stays null');
  ok(n.actualPortfolioEmptyReason === 'PORTFOLIO_NOT_FOUND',
    '5.4: a missing portfolio is distinguishable from an empty one');
}

section('6. EMPTY ACTUAL + NO OVERLAY — nothing at all is published as a total');
{
  const cell = emptyActualCell('ACTUAL_PORTFOLIO_EMPTY', false);
  const n = call('normalizePortfolioStressCell(__c)', { __c: cell });
  for (const set of ['actual', 'overlay', 'proposed']) {
    ok(n.rawGreeks[set].values === null, '6.1: ' + set + ' publishes no vector');
    ok(n.rawGreeks[set].authoritative === false, '6.2: ' + set + ' is not authoritative');
    ok(n.rawGreeks[set].status === 'UNAVAILABLE', '6.3: ' + set + ' is UNAVAILABLE');
  }
  ok(n.equityShareDelta === null, '6.4: equityShareDelta is null, not 0');
  ok(n.authoritative.actualStressPnl === null && n.authoritative.overlayStressPnl === null &&
     n.authoritative.proposedStressPnl === null,
    '6.5: no P&L total is published');
}

section('7. NON-EMPTY ACTUAL — all three sets, distinct, with Proposed = Actual + Overlay');
{
  const n = call('normalizePortfolioStressCell(__c)', { __c: completeCell() });

  ok(vecEq(n.rawGreeks.actual.values, ACTUAL_GREEKS), '7.1: the Actual vector is published');
  ok(vecEq(n.rawGreeks.overlay.values, OVERLAY_GREEKS), '7.2: the Overlay vector is published');
  ok(vecEq(n.rawGreeks.proposed.values, PROPOSED_GREEKS), '7.3: the Proposed vector is published');

  // Distinct, so "everything is null" cannot pass by breaking the feature and
  // so a substitution has somewhere to be visible.
  ok(!vecEq(n.rawGreeks.actual.values, n.rawGreeks.overlay.values), '7.4: Actual and Overlay are distinct');
  ok(!vecEq(n.rawGreeks.proposed.values, n.rawGreeks.overlay.values), '7.5: Proposed and Overlay are distinct');
  ok(!vecEq(n.rawGreeks.proposed.values, n.rawGreeks.actual.values), '7.6: Proposed and Actual are distinct');

  for (const k of ['delta', 'gamma', 'vega', 'theta']) {
    ok(n.rawGreeks.proposed.values[k] === n.rawGreeks.actual.values[k] + n.rawGreeks.overlay.values[k],
      '7.7[' + k + ']: Proposed = Actual + Overlay');
  }
  for (const set of ['actual', 'overlay', 'proposed']) {
    ok(n.rawGreeks[set].authoritative === true, '7.8: ' + set + ' is authoritative on a complete run');
  }
  ok(n.equityShareDelta === 250, '7.9: a real equityShareDelta survives');
  ok(n.authoritative.proposedStressPnl === -6075.75, '7.10: the Proposed P&L is published on a complete run');
}

section('8. Incomplete authoritative fields stay null; partial keeps its own name');
{
  // A set that lost legs: the total is withdrawn, the computable sum moves to
  // the partial slot, and neither is allowed to answer the other one's question.
  const cell = Object.assign(completeCell(), {
    actualStatus: 'DEGRADED',
    actualStressPnl: null,
    proposedStressPnl: null,
    difference: null,
    incrementalEffect: null,
    partialActualStressPnl: -3100.5,
    partialProposedStressPnl: -4976,
    rawGreeks: { actual: null, overlay: Object.assign({}, OVERLAY_GREEKS), proposed: null },
    partialRawGreeks: {
      actual: Object.assign({}, ACTUAL_GREEKS),
      overlay: null,
      proposed: Object.assign({}, PROPOSED_GREEKS),
    },
    rawGreekCompleteness: { actual: false, overlay: true, proposed: false },
    rawGreekStatus: { actual: 'UNAVAILABLE', overlay: 'VALID', proposed: 'UNAVAILABLE' },
  });
  const n = call('normalizePortfolioStressCell(__c)', { __c: cell });

  ok(n.authoritative.actualStressPnl === null, '8.1: an incomplete Actual total stays null');
  ok(n.authoritative.proposedStressPnl === null, '8.2: an incomplete Proposed total stays null');
  ok(n.authoritative.difference === null, '8.3: a difference from an incomplete baseline stays null');
  ok(n.partial.partialActualStressPnl === -3100.5, '8.4: the computable sum is kept, under its partial name');
  ok(n.partial.partialProposedStressPnl === -4976, '8.5: the partial Proposed sum keeps its partial name');

  // The two halves must never trade places.
  ok(!('partialActualStressPnl' in n.authoritative), '8.6: no partial field appears in the authoritative set');
  ok(!('actualStressPnl' in n.partial), '8.7: no authoritative field appears in the partial set');
  ok(Object.keys(n.partial).every((k) => /^partial/.test(k)), '8.8: every partial field is named partial*');
  ok(Object.keys(n.authoritative).every((k) => !/^partial/.test(k)), '8.9: no authoritative field is named partial*');

  // The Greek family under the same rule.
  ok(n.rawGreeks.actual.values === null && vecEq(n.rawGreeks.actual.partialValues, ACTUAL_GREEKS),
    '8.10: an incomplete Actual vector is null, with the computable one under partialValues');
  ok(n.rawGreeks.actual.authoritative === false, '8.11: a partial vector is never authoritative');
  ok(n.rawGreeks.proposed.values === null && vecEq(n.rawGreeks.proposed.partialValues, PROPOSED_GREEKS),
    '8.12: an incomplete Proposed vector is null, with the computable one under partialValues');
  ok(!vecEq(n.rawGreeks.proposed.values, n.rawGreeks.overlay.values),
    '8.13: even here, Proposed is not the Overlay');
}

section('9. A set is authoritative only when the vector, the completeness AND the status agree');
{
  const base = completeCell();
  const variant = (patch) => call('readPortfolioStressGreekSet(__c, "actual")',
    { __c: Object.assign({}, base, patch) });

  ok(variant({}).authoritative === true, '9.1: complete + VALID + a vector is authoritative');
  ok(variant({ rawGreeks: { actual: null, overlay: null, proposed: null } }).authoritative === false,
    '9.2: no vector is not authoritative');
  ok(variant({ rawGreekCompleteness: { actual: false, overlay: true, proposed: true } }).authoritative === false,
    '9.3: an incomplete set is not authoritative even with a vector and a VALID status');
  ok(variant({ rawGreekStatus: { actual: 'DEGRADED', overlay: 'VALID', proposed: 'VALID' } }).authoritative === false,
    '9.4: a DEGRADED status is not authoritative even when complete');
  ok(variant({ rawGreekCompleteness: {} }).complete === false,
    '9.5: an unstated completeness reads as false, never as an assumed true');
  ok(variant({ rawGreekStatus: {} }).status === 'UNAVAILABLE',
    '9.6: an unstated status reads as UNAVAILABLE, never as an assumed VALID');

  // A component the backend did not publish is null inside the vector.
  const partialVector = variant({
    rawGreeks: { actual: { delta: 12, gamma: 3 }, overlay: null, proposed: null },
  });
  ok(partialVector.values.delta === 12 && partialVector.values.gamma === 3,
    '9.7: published components survive');
  ok(partialVector.values.vega === null && partialVector.values.theta === null,
    '9.8: an unpublished component is null inside the vector, never 0');
}

section('10. Whole-response normalization');
{
  const response = {
    status: 'UNAVAILABLE',
    reason: 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE',
    matrix: [],
  };
  const n = call('normalizePortfolioStressResponse(__r)', { __r: response });
  ok(n.status === 'UNAVAILABLE' && n.reason === 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE',
    '10.1: the run status and reason are preserved');
  ok(n.cells.length === 0 && n.cellCount === 0, '10.2: an UNAVAILABLE run publishes no cells');
  ok(n.response === response, '10.3: the raw response is kept reachable for a future renderer');

  const withMatrix = call('normalizePortfolioStressResponse(__r)',
    { __r: { status: 'VALID', matrix: [completeCell(), emptyActualCell('ACTUAL_PORTFOLIO_EMPTY', true)] } });
  ok(withMatrix.cells.length === 2, '10.4: every cell is normalized');
  ok(withMatrix.cells[0].rawGreeks.proposed.values !== null, '10.5: the complete cell keeps its Proposed');
  ok(withMatrix.cells[1].rawGreeks.proposed.values === null, '10.6: the empty-Actual cell withdraws its Proposed');

  for (const bad of [null, undefined, 'x', 42, []]) {
    let threw = null;
    try { call('normalizePortfolioStressResponse(__r)', { __r: bad }); } catch (e) { threw = e; }
    ok(threw && threw.code === 'PORTFOLIO_STRESS_RESPONSE_INVALID',
      '10.7: a non-object response is a named error, not an empty result');
  }
  // A malformed cell must not throw and must not invent numbers.
  const junk = call('normalizePortfolioStressCell(__c)', { __c: { rawGreeks: 'nonsense', equityShareDelta: 'x' } });
  ok(junk.rawGreeks.actual.values === null && junk.equityShareDelta === null && junk.status === 'UNAVAILABLE',
    '10.8: a malformed cell yields nulls and UNAVAILABLE, never zeros');
}

section('11. MUTATION PROOF — the readers are proven able to fail');
{
  // 11.1 the substitution, written out, must be visibly different from the truth.
  const cell = emptyActualCell('ACTUAL_PORTFOLIO_EMPTY', true);
  const substituted = JSON.parse(JSON.stringify(cell));
  substituted.rawGreeks.proposed = Object.assign({}, OVERLAY_GREEKS);
  substituted.rawGreekCompleteness.proposed = true;
  substituted.rawGreekStatus.proposed = 'VALID';
  const nSub = call('normalizePortfolioStressCell(__c)', { __c: substituted });
  ok(vecEq(nSub.rawGreeks.proposed.values, OVERLAY_GREEKS) && nSub.rawGreeks.proposed.authoritative === true,
    '11.1: a backend that DID substitute would be visible here — the reader reports what it is given');
  const nTruth = call('normalizePortfolioStressCell(__c)', { __c: cell });
  ok(nTruth.rawGreeks.proposed.values === null,
    '11.2: and the shipped cell is NOT in that state — the reader never creates the substitution itself');

  // 11.3 a zero vector promoted where a withdrawal belongs.
  const zeroed = JSON.parse(JSON.stringify(cell));
  zeroed.rawGreeks.actual = { delta: 0, gamma: 0, vega: 0, theta: 0 };
  zeroed.rawGreekCompleteness.actual = true;
  zeroed.rawGreekStatus.actual = 'VALID';
  const nZero = call('normalizePortfolioStressCell(__c)', { __c: zeroed });
  ok(nZero.rawGreeks.actual.authoritative === true && nTruth.rawGreeks.actual.authoritative === false,
    '11.3: a zero-vector regression is distinguishable from a withdrawal');

  // 11.4 UNAVAILABLE promoted to VALID.
  const promoted = JSON.parse(JSON.stringify(cell));
  promoted.rawGreekStatus.proposed = 'VALID';
  ok(call('normalizePortfolioStressCell(__c)', { __c: promoted }).rawGreeks.proposed.authoritative === false,
    '11.4: promoting the status alone does NOT make a null vector authoritative');

  // 11.5 a partial promoted into the authoritative slot.
  const promotedPartial = completeCell();
  promotedPartial.actualStressPnl = null;
  promotedPartial.partialActualStressPnl = -3100.5;
  const nPP = call('normalizePortfolioStressCell(__c)', { __c: promotedPartial });
  ok(nPP.authoritative.actualStressPnl === null && nPP.partial.partialActualStressPnl === -3100.5,
    '11.5: a partial sum never fills the authoritative slot');

  // 11.6 the strict reader would catch a coerced null.
  ok(call('readPortfolioStressNumber(__v)', { __v: null }) === null && Number(null) === 0,
    '11.6: Number(null) is 0 and the strict reader is not — the difference is the contract');
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log(fail === 0
  ? '\nAll ' + pass + ' assertions passed.'
  : '\n' + pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.');
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
