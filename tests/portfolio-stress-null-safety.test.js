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
    actualComplete: false,
    overlayComplete: !!overlay,
    proposedComplete: false,
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
    actualComplete: true, overlayComplete: true, proposedComplete: true,
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
  // DEGRADED on the ACTUAL SET, not merely on the cell: the set is what governs
  // its fields, so degrading only the cell headline would leave every Actual
  // number authoritative and the section would prove nothing.
  const degraded = Object.assign(completeCell(), {
    status: 'DEGRADED',
    actualStatus: 'DEGRADED',
    rawGreekStatus: { actual: 'DEGRADED', overlay: 'VALID', proposed: 'DEGRADED' },
  });
  const n = call('normalizePortfolioStressCell(__c)', { __c: degraded });
  ok(n.status === 'DEGRADED', '3.8: a DEGRADED run stays DEGRADED');
  ok(n.values.actualStressPnl === -4200.25, '3.9: a DEGRADED cell keeps its number');
  ok(n.authoritative.actualStressPnl === null, '3.9b: …but it is not authoritative');
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
  ok(n.values.equityShareDelta === null, '4.6: equityShareDelta is null — zero shares held is a different claim');

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
  ok(n.values.actualStressPnl === null && n.values.proposedStressPnl === null,
    '4.15: the P&L side is withdrawn under the same rule');
  ok(n.authoritative.overlayStressPnl === -1875.5, '4.16: the Overlay P&L is still published and authoritative');
  ok(n.actualPortfolioEmptyReason === 'ACTUAL_PORTFOLIO_EMPTY', '4.17: the reason the Actual was withdrawn is preserved');
  // The whole Actual side is withdrawn under the SAME rule, not field by field.
  for (const f of ['actualStressPnl', 'actualCurrentValue', 'actualStressedValue', 'equityShareDelta']) {
    ok(n.values[f] === null, '4.18[' + f + ']: withdrawn with the Actual set');
  }
}

section('5. PORTFOLIO NOT FOUND + complete Overlay — the same rule');
{
  const cell = emptyActualCell('PORTFOLIO_NOT_FOUND', true);
  const n = call('normalizePortfolioStressCell(__c)', { __c: cell });
  ok(n.rawGreeks.actual.values === null && n.rawGreeks.proposed.values === null,
    '5.1: a portfolio that does not exist withdraws Actual and Proposed');
  ok(!vecEq(n.rawGreeks.proposed.values, n.rawGreeks.overlay.values),
    '5.2: Proposed is still not the Overlay');
  ok(n.values.equityShareDelta === null, '5.3: equityShareDelta stays null');
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
  ok(n.values.equityShareDelta === null, '6.4: equityShareDelta is null, not 0');
  ok(n.values.actualStressPnl === null && n.values.overlayStressPnl === null &&
     n.values.proposedStressPnl === null,
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
  ok(n.authoritative.equityShareDelta === 250, '7.9: a real equityShareDelta survives');
  ok(n.authoritative.proposedStressPnl === -6075.75, '7.10: the Proposed P&L is published on a complete run');
  ok(n.authoritative.difference === -1875.5, '7.10b: the difference is authoritative when both sides are');
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
  // 2.1.0: the raw response is NOT reachable. `result.response.matrix` would have
  // bypassed every rule in this file, and it was the path of least resistance.
  ok(n.response === undefined, '10.3: the raw backend response is NOT exposed');
  for (const k of ['response', 'rawResponse', 'backendResponse', 'payload', 'raw', 'body']) {
    ok(n[k] === undefined, '10.3b: the result carries no `' + k + '` escape hatch');
  }
  ok(n.metadata && typeof n.metadata === 'object', '10.3c: allowlisted metadata is exposed instead');

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
  ok(junk.rawGreeks.actual.values === null && junk.values.equityShareDelta === null && junk.status === 'UNAVAILABLE',
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
  ok(nPP.values.actualStressPnl === null, '11.5b: …nor the exposed-value slot');

  // 11.6 the strict reader would catch a coerced null.
  ok(call('readPortfolioStressNumber(__v)', { __v: null }) === null && Number(null) === 0,
    '11.6: Number(null) is 0 and the strict reader is not — the difference is the contract');
}

section('12. ADVERSARIAL — a payload that contradicts its own status');
{
  // Every case here is a response the backend should never send. The point is
  // not that it might; it is that when it does, nothing presentable comes out.
  const withSet = (set, patch) => {
    const c = completeCell();
    c[set + 'Status'] = 'UNAVAILABLE';
    return Object.assign(c, patch || {});
  };

  // 12.1-12.3 an UNAVAILABLE set that still carries a finite number.
  for (const [set, field, value] of [
    ['actual', 'actualStressPnl', -4200.25],
    ['overlay', 'overlayStressPnl', -1875.5],
    ['proposed', 'proposedStressPnl', -6075.75],
  ]) {
    const cell = withSet(set, {});
    cell[field] = value;
    const n = call('normalizePortfolioStressCell(__c)', { __c: cell });
    ok(n.values[field] === null, '12.1[' + set + ']: an UNAVAILABLE set withdraws ' + field + ' even though a number was sent');
    ok(n.authoritative[field] === null, '12.2[' + set + ']: …and it is certainly not authoritative');
    ok(n.contractViolations.some((v) => v.field === field),
      '12.3[' + set + ']: …and the contradiction is REPORTED, not silently swallowed');
  }

  // 12.4 a difference computed from an unusable Actual.
  const diffCell = Object.assign(completeCell(), { actualStatus: 'UNAVAILABLE' });
  const nDiff = call('normalizePortfolioStressCell(__c)', { __c: diffCell });
  ok(nDiff.values.difference === null && nDiff.authoritative.difference === null,
    '12.4: a difference from an unusable baseline is withdrawn, however well-formed the subtraction');
  ok(nDiff.setAuthority.difference.status === 'UNAVAILABLE',
    '12.4b: the difference inherits the worst of Actual and Proposed');

  // 12.5 completeness false with a VALID status: the number is real but partial.
  const incomplete = Object.assign(completeCell(), { actualComplete: false });
  const nInc = call('normalizePortfolioStressCell(__c)', { __c: incomplete });
  ok(nInc.values.actualStressPnl === -4200.25, '12.5: a VALID-but-incomplete number is still exposed');
  ok(nInc.authoritative.actualStressPnl === null, '12.5b: …but never as a total');

  // 12.6 a MISSING status beside a number: unstated never means VALID.
  const noStatus = completeCell();
  delete noStatus.actualStatus;
  const nNo = call('normalizePortfolioStressCell(__c)', { __c: noStatus });
  ok(nNo.values.actualStressPnl === null && nNo.authoritative.actualStressPnl === null,
    '12.6: a missing status withdraws the number rather than assuming VALID');

  // 12.7 an UNKNOWN status token beside a number.
  const weird = Object.assign(completeCell(), { actualStatus: 'PROBABLY_FINE' });
  const nWeird = call('normalizePortfolioStressCell(__c)', { __c: weird });
  ok(nWeird.values.actualStressPnl === null, '12.7: an unrecognised status is UNAVAILABLE, not VALID');

  // 12.8 a partial present alongside an incompatible authoritative value.
  const both = Object.assign(completeCell(), { partialActualStressPnl: -3100.5 });
  const nBoth = call('normalizePortfolioStressCell(__c)', { __c: both });
  ok(nBoth.authoritative.actualStressPnl === -4200.25 && nBoth.partial.partialActualStressPnl === -3100.5,
    '12.8: the two halves are reported separately and never reconciled into one number');
  ok(nBoth.authoritative.actualStressPnl !== nBoth.partial.partialActualStressPnl,
    '12.8b: …and they are visibly different, so neither can stand in for the other');

  // 12.9 a raw Greek vector carrying numbers under an UNAVAILABLE status.
  const greekLie = completeCell();
  greekLie.rawGreekStatus = { actual: 'UNAVAILABLE', overlay: 'VALID', proposed: 'VALID' };
  const nGL = call('normalizePortfolioStressCell(__c)', { __c: greekLie });
  ok(nGL.rawGreeks.actual.values === null, '12.9: an UNAVAILABLE Greek vector is withdrawn despite its numbers');
  ok(nGL.contractViolations.some((v) => v.field === 'rawGreeks.actual'), '12.9b: …and reported as a contract violation');

  // 12.10 Proposed Greeks numeric while the Actual is empty — the substitution.
  const substituted = emptyActualCell('ACTUAL_PORTFOLIO_EMPTY', true);
  substituted.rawGreeks.proposed = Object.assign({}, OVERLAY_GREEKS);
  const nSub = call('normalizePortfolioStressCell(__c)', { __c: substituted });
  ok(nSub.rawGreeks.proposed.values === null,
    '12.10: a Proposed vector smuggled in under an UNAVAILABLE status is withdrawn');
  ok(!vecEq(nSub.rawGreeks.proposed.values, nSub.rawGreeks.overlay.values),
    '12.10b: …so Proposed still cannot equal Overlay');

  // 12.11 the raw response mutated AFTER normalization must not change anything.
  const live = { status: 'VALID', matrix: [completeCell()], requestId: 'r-1' };
  const normalized = call('normalizePortfolioStressResponse(__r)', { __r: live });
  const before = JSON.stringify(normalized);
  live.matrix[0].actualStressPnl = 999999;
  live.status = 'UNAVAILABLE';
  live.requestId = 'tampered';
  live.matrix.push(completeCell());
  ok(JSON.stringify(normalized) === before,
    '12.11: mutating the backend payload after normalization cannot change the result');
  ok(normalized.metadata.requestId === 'r-1', '12.11b: …including its metadata');
  ok(normalized.cells.length === 1, '12.11c: …including its cell count');

  // 12.12 numeric properties arriving on the PROTOTYPE, not the payload.
  const polluted = Object.create({ actualStressPnl: 12345, actualStatus: 'VALID' });
  polluted.scenarioId = 's1';
  const nPol = call('normalizePortfolioStressCell(__c)', { __c: polluted });
  ok(nPol.values.actualStressPnl === null,
    '12.12: an inherited status cannot authorise an inherited number');

  // 12.13 an ARRAY where a result object belongs.
  const arrayCell = call('normalizePortfolioStressCell(__c)', { __c: [] });
  ok(arrayCell.values.actualStressPnl === null && arrayCell.status === 'UNAVAILABLE',
    '12.13: an array is not a cell');
  const arrayGreeks = call('normalizePortfolioStressCell(__c)', { __c: { rawGreeks: [1, 2, 3], actualStatus: 'VALID' } });
  ok(arrayGreeks.rawGreeks.actual.values === null, '12.13b: an array is not a Greek vector either');

  // 12.14 numeric STRINGS and non-finite numbers in authoritative fields.
  for (const bad of ['4200.25', '0', NaN, Infinity, -Infinity, true, {}]) {
    const cell = Object.assign(completeCell(), { actualStressPnl: bad });
    const n = call('normalizePortfolioStressCell(__c)', { __c: cell });
    ok(n.values.actualStressPnl === null && n.authoritative.actualStressPnl === null,
      '12.14: ' + JSON.stringify(String(bad)) + ' is not a number the contract will present');
  }
  // …and a real 0 still survives, so the check above is not just rejecting falsy.
  const zero = Object.assign(completeCell(), { actualStressPnl: 0 });
  ok(call('normalizePortfolioStressCell(__c)', { __c: zero }).authoritative.actualStressPnl === 0,
    '12.14b: a genuine 0 is preserved — the strictness is about type, not truthiness');
}

section('13. MUTATION PROOF — every guard in §12 is proven able to fail');
{
  // Each mutation reconstructs, in memory, what a WEAKER normalizer would have
  // produced, and asserts the shipped one does not produce it.
  const cell = Object.assign(completeCell(), { actualStatus: 'UNAVAILABLE' });
  const n = call('normalizePortfolioStressCell(__c)', { __c: cell });

  // 13.1 "UNAVAILABLE numeric -> accepted" — the pre-2.1.0 behaviour.
  const weakRead = readWeak(cell, 'actualStressPnl');
  ok(weakRead === -4200.25, '13.1: a status-blind reader WOULD have returned the number');
  ok(n.values.actualStressPnl === null, '13.1b: …and the shipped reader does not');

  // 13.2 "DEGRADED -> VALID"
  const degraded = Object.assign(completeCell(), { actualStatus: 'DEGRADED' });
  const nDeg = call('normalizePortfolioStressCell(__c)', { __c: degraded });
  ok(nDeg.setAuthority.actual.status === 'DEGRADED' && nDeg.authoritative.actualStressPnl === null,
    '13.2: DEGRADED is never promoted to VALID');

  // 13.3 "partial -> authoritative"
  const partialOnly = Object.assign(completeCell(), { actualStressPnl: null, partialActualStressPnl: -3100.5 });
  const nPart = call('normalizePortfolioStressCell(__c)', { __c: partialOnly });
  ok(nPart.authoritative.actualStressPnl === null, '13.3: a partial never becomes authoritative');

  // 13.4 "Overlay -> Proposed"
  const empty = emptyActualCell('ACTUAL_PORTFOLIO_EMPTY', true);
  const nEmpty = call('normalizePortfolioStressCell(__c)', { __c: empty });
  ok(nEmpty.rawGreeks.overlay.values !== null && nEmpty.rawGreeks.proposed.values === null,
    '13.4: the Overlay survives and the Proposed does not — no substitution');

  // 13.5 "raw response exposed"
  const res = call('normalizePortfolioStressResponse(__r)', { __r: { status: 'VALID', matrix: [] } });
  ok(!Object.keys(res).some((k) => /^(response|rawResponse|backendResponse|payload|raw|body)$/.test(k)),
    '13.5: no key on the result exposes the backend payload');
  ok(!/response: response/.test(RESPONSE_CODE), '13.5b: …and the source no longer carries the escape hatch');

  // 13.6 "status check removed"
  //
  // The gate is now the EFFECTIVE status — the worst of the result set and the
  // field's own metric status — so this pins both halves. Pinning only the set
  // would let the metric half be deleted silently, which is exactly the hole
  // that let an UNAVAILABLE pctNlvStatus present a percentage.
  ok(/readPortfolioStressSetAuthority/.test(RESPONSE_CODE) &&
     /effective === PORTFOLIO_STRESS_STATUS\.UNAVAILABLE/.test(RESPONSE_CODE),
    '13.6: the governed read gates on the effective status before exposing anything');
  ok(/portfolioStressWorstStatus\(authority\.status, metricStatus\)/.test(RESPONSE_CODE),
    '13.6b: …and the effective status is the WORST of the set and the metric status');
  ok(/portfolioStressStatusIsAuthoritative\(effective\)/.test(RESPONSE_CODE),
    '13.6c: …and authority is decided on the effective status, not on the set alone');

  // 13.7 "completeness check removed"
  ok(/authority\.complete === true/.test(RESPONSE_CODE),
    '13.7: authority requires the completeness flag, not just the status');

  // A status-blind reader, written out so 13.1 is a comparison and not a claim.
  function readWeak(c, field) {
    return (typeof c[field] === 'number' && isFinite(c[field])) ? c[field] : null;
  }
}

section('14. ADVERSARIAL — the metric-specific statuses are binding too');
{
  // WHY THIS SECTION EXISTS
  //   A result set can be perfectly healthy while one METRIC derived from it is
  //   not computable. The Actual P&L can be VALID and complete with no NLV in
  //   sight, and the beta-weighted share delta needs SPY, the equity spot AND a
  //   beta, any one of which can be missing on its own.
  //
  //   The backend says so — `pctNlvStatus`, `rawBetaWeightedShareDeltaStatus` —
  //   and this tier used to read neither. A percentage computed against no NLV
  //   is not a slightly worse percentage; it is the numerator wearing a % sign.

  // 14.1 an UNAVAILABLE pctNlvStatus withdraws the Actual percentage, even
  //      though the Actual set itself is VALID and complete.
  {
    const c = completeCell();
    c.pctNlvStatus = 'UNAVAILABLE';
    c.actualStressPnlPctNlv = -0.12;
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.setAuthority.actual.status === 'VALID' && n.setAuthority.actual.complete === true,
      '14.1: the Actual set is VALID and complete — the metric status is the only thing wrong');
    ok(n.values.actualStressPnlPctNlv === null,
      '14.2: an UNAVAILABLE pctNlvStatus WITHDRAWS actualStressPnlPctNlv');
    ok(n.authoritative.actualStressPnlPctNlv === null, '14.3: …and it is not authoritative');
    const v = n.contractViolations.filter((x) => x.field === 'actualStressPnlPctNlv');
    ok(v.length === 1, '14.4: …and the contradiction is REPORTED');
    ok(v.length === 1 && v[0].metricStatusField === 'pctNlvStatus',
      '14.5: …naming pctNlvStatus, so nobody hunts through a healthy actualStatus');
    ok(n.values.actualStressPnl === -4200.25,
      '14.6: …and the P&L itself is untouched — the metric status withdraws only its own metric');
  }

  // 14.2 a DEGRADED pctNlvStatus keeps the number visible but never authoritative.
  {
    const c = completeCell();
    c.pctNlvStatus = 'DEGRADED';
    c.proposedStressPnlPctNlv = -0.20;
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.proposedStressPnlPctNlv === -0.20,
      '14.7: a DEGRADED pctNlvStatus KEEPS the number in values');
    ok(n.authoritative.proposedStressPnlPctNlv === null,
      '14.8: …but it is never authoritative');
    ok(n.contractViolations.every((x) => x.field !== 'proposedStressPnlPctNlv'),
      '14.9: …and DEGRADED is not a contract violation — it is a declared quality level');
  }

  // 14.3 the beta-weighted share delta, withdrawn by its own status, reason kept.
  {
    const c = completeCell();
    c.rawBetaWeightedShareDeltaStatus = 'UNAVAILABLE';
    c.rawBetaWeightedShareDeltaReason = 'BETA_UNAVAILABLE';
    c.rawBetaWeightedShareDelta = 4.5;
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.rawBetaWeightedShareDelta === null,
      '14.10: an UNAVAILABLE rawBetaWeightedShareDeltaStatus withdraws the figure');
    ok(n.authoritative.rawBetaWeightedShareDelta === null, '14.11: …and it is not authoritative');
    ok(n.metricAuthority.rawBetaWeightedShareDeltaReason === 'BETA_UNAVAILABLE',
      '14.12: …and the REASON is preserved, so the withdrawal is explainable');
    ok(n.metricAuthority.rawBetaWeightedShareDeltaStatus === 'UNAVAILABLE',
      '14.13: …and the metric status itself is republished, normalized');
  }

  // 14.4 a VALID metric status must NOT promote a set that is not VALID. The
  //      direction is one-way: a metric status can only take authority away.
  {
    const c = completeCell();
    c.actualStatus = 'DEGRADED';
    c.pctNlvStatus = 'VALID';
    c.actualStressPnlPctNlv = -0.12;
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === -0.12, '14.14: a DEGRADED set keeps its number');
    ok(n.authoritative.actualStressPnlPctNlv === null,
      '14.15: a VALID pctNlvStatus does NOT promote a DEGRADED set to authoritative');
  }
  {
    const c = completeCell();
    c.actualStatus = 'UNAVAILABLE';
    c.pctNlvStatus = 'VALID';
    c.actualStressPnlPctNlv = -0.12;
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === null,
      '14.16: a VALID pctNlvStatus does NOT rescue an UNAVAILABLE set');
  }

  // 14.5 an unpublished metric status is UNAVAILABLE, like every other status:
  //      silence is not permission.
  {
    const c = completeCell();
    c.actualStressPnlPctNlv = -0.12;
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === null,
      '14.17: a percentage with NO pctNlvStatus at all is withdrawn — silence never authorises');
    ok(n.metricAuthority.pctNlvStatus === 'UNAVAILABLE',
      '14.18: …and the missing status normalizes to UNAVAILABLE');
  }

  // 14.6 the metric status must be read as an OWN property, like the rest.
  {
    const proto = { pctNlvStatus: 'VALID' };
    const c = Object.assign(Object.create(proto), completeCell());
    delete c.pctNlvStatus;
    c.actualStressPnlPctNlv = -0.12;
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === null,
      '14.19: a prototype-supplied pctNlvStatus does not authorise anything');
  }

  // 14.7 the raw response is still not exposed by any of this.
  {
    const c = completeCell();
    c.pctNlvStatus = 'VALID';
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(!Object.keys(n).some((k) => /^(response|rawResponse|payload|raw|body)$/.test(k)),
      '14.20: republishing the metric statuses did not smuggle the raw response out');
  }
}

section('15. MUTATION PROOF — every guard in §14 is proven able to fail');
{
  // Each mutation is applied to the module source IN MEMORY and run in a fresh
  // sandbox. Nothing is written. A guard that has never been seen to fail is a
  // guard nobody has tested.
  const mutate = (from, to) => {
    const src = RESPONSE_SRC.split(from).join(to);
    if (src === RESPONSE_SRC) return null;
    return src;
  };
  const runMutant = (src, expr, vars) => {
    const sb = { console, JSON, Object, Array, Error, String, Number, Boolean, Math, isFinite };
    vm.createContext(sb);
    vm.runInContext(src, sb);
    Object.assign(sb, vars || {});
    return vm.runInContext(expr, sb);
  };

  // 15.1 ignore pctNlvStatus entirely → the percentage survives an UNAVAILABLE
  //      metric status. This is the shipped-before behaviour.
  {
    const src = mutate(
      "  var metricField = PORTFOLIO_STRESS_FIELD_METRIC_STATUS[field] || null;",
      "  var metricField = null;");
    ok(src !== null, '15.1: the "ignore the metric status" mutation is representable');
    const c = completeCell();
    c.pctNlvStatus = 'UNAVAILABLE';
    c.actualStressPnlPctNlv = -0.12;
    const n = runMutant(src, 'normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === -0.12,
      '15.2: MUTATION CONFIRMED — ignoring pctNlvStatus presents a percentage with no NLV behind it');
    ok(n.contractViolations.every((v) => v.field !== 'actualStressPnlPctNlv'),
      '15.3: …silently, with no violation reported. §14.2 is what stops that.');
  }

  // 15.2 the same for the beta-weighted share delta.
  {
    const src = mutate(
      "  rawBetaWeightedShareDelta: 'rawBetaWeightedShareDeltaStatus',",
      "");
    ok(src !== null, '15.4: dropping rawBetaWeightedShareDeltaStatus from the map is representable');
    const c = completeCell();
    c.rawBetaWeightedShareDeltaStatus = 'UNAVAILABLE';
    c.rawBetaWeightedShareDelta = 4.5;
    const n = runMutant(src, 'normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.rawBetaWeightedShareDelta === 4.5,
      '15.5: MUTATION CONFIRMED — an unmapped metric leaves the figure exposed. §14.10 is what stops that.');
  }

  // 15.3 promote instead of demote: BEST of the two statuses rather than worst.
  //      A VALID metric status would then rescue a DEGRADED or UNAVAILABLE set.
  {
    const src = mutate(
      "    : portfolioStressWorstStatus(authority.status, metricStatus);",
      "    : (metricStatus === PORTFOLIO_STRESS_STATUS.VALID ? PORTFOLIO_STRESS_STATUS.VALID : portfolioStressWorstStatus(authority.status, metricStatus));");
    ok(src !== null, '15.6: the "a VALID metric promotes the set" mutation is representable');
    const c = completeCell();
    c.actualStatus = 'DEGRADED';
    c.pctNlvStatus = 'VALID';
    c.actualStressPnlPctNlv = -0.12;
    const n = runMutant(src, 'normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.authoritative.actualStressPnlPctNlv === -0.12,
      '15.7: MUTATION CONFIRMED — promotion makes a DEGRADED set authoritative. §14.15 is what stops that.');
  }

  // 15.4 keep DEGRADED authoritative: the metric status is read but not enforced.
  {
    const src = mutate(
      "      && portfolioStressStatusIsAuthoritative(effective)",
      "      && effective !== PORTFOLIO_STRESS_STATUS.UNAVAILABLE");
    ok(src !== null, '15.8: the "DEGRADED counts as authoritative" mutation is representable');
    const c = completeCell();
    c.pctNlvStatus = 'DEGRADED';
    c.proposedStressPnlPctNlv = -0.20;
    const n = runMutant(src, 'normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.authoritative.proposedStressPnlPctNlv === -0.20,
      '15.9: MUTATION CONFIRMED — a DEGRADED metric becomes authoritative. §14.8 is what stops that.');
  }
}

section('16. REAL BACKEND RESPONSES — the %NLV metric status, end to end');
{
  // WHY THESE ARE CAPTURED, NOT HAND-WRITTEN
  //   Sections 14 and 15 build contradictory payloads on purpose, which proves
  //   the normalizer refuses them. It does NOT prove the normalizer handles what
  //   the backend actually sends. These four cells are the real output of
  //   runPortfolioStressTest() at apex-backend 12f3ba1, captured verbatim from
  //   the engine — same fixtures as tests/portfolio-stress-gating.test.js, with
  //   `underlyingShockOverrides: { AAPL: -0.12 }` and a complete pricing
  //   configuration so the Actual set reaches VALID rather than the DEGRADED an
  //   ordinary-beta shock is honestly labelled with.
  //
  //   The first one is the case that motivated the whole fix: with the OLD
  //   backend it carried `pctNlvStatus: UNAVAILABLE` beside a finite Actual
  //   percentage, and this tier — correctly applying the metric status —
  //   withdrew a number that was never in doubt and called it a contract
  //   violation.
  const REAL = {
    OVERLAY_INCOMPLETE_NLV_VALID: {
      "scenarioId": "base",
      "status": "DEGRADED",
      "actualStatus": "VALID",
      "actualComplete": true,
      "overlayStatus": "DEGRADED",
      "overlayComplete": false,
      "proposedStatus": "DEGRADED",
      "proposedComplete": false,
      "pctNlvStatus": "VALID",
      "actualStressPnl": 1922.0211507814731,
      "proposedStressPnl": null,
      "actualStressPnlPctNlv": 0.019220211507814732,
      "proposedStressPnlPctNlv": null,
      "rawBetaWeightedShareDelta": 0,
      "rawBetaWeightedShareDeltaStatus": "VALID",
      "rawBetaWeightedShareDeltaReason": null,
      "partialProposedStressPnl": 5239.788973254258,
      "rawGreekUnits": "RAW_DXFEED_EVENT_UNITS x SIGNED_CONTRACTS (contract multiplier NOT applied: the per-share vs per-contract scale is not established by the provider contract)"
    },
    NLV_DEGRADED: {
      "scenarioId": "base",
      "status": "VALID",
      "actualStatus": "VALID",
      "actualComplete": true,
      "overlayStatus": "VALID",
      "overlayComplete": true,
      "proposedStatus": "VALID",
      "proposedComplete": true,
      "pctNlvStatus": "DEGRADED",
      "actualStressPnl": 1922.0211507814731,
      "proposedStressPnl": 1922.0211507814731,
      "actualStressPnlPctNlv": 0.019220211507814732,
      "proposedStressPnlPctNlv": 0.019220211507814732,
      "rawBetaWeightedShareDelta": 0,
      "rawBetaWeightedShareDeltaStatus": "VALID",
      "rawBetaWeightedShareDeltaReason": null,
      "partialProposedStressPnl": null,
      "rawGreekUnits": "RAW_DXFEED_EVENT_UNITS x SIGNED_CONTRACTS (contract multiplier NOT applied: the per-share vs per-contract scale is not established by the provider contract)"
    },
    NLV_UNAVAILABLE: {
      "scenarioId": "base",
      "status": "VALID",
      "actualStatus": "VALID",
      "actualComplete": true,
      "overlayStatus": "VALID",
      "overlayComplete": true,
      "proposedStatus": "VALID",
      "proposedComplete": true,
      "pctNlvStatus": "UNAVAILABLE",
      "actualStressPnl": 1922.0211507814731,
      "proposedStressPnl": 1922.0211507814731,
      "actualStressPnlPctNlv": null,
      "proposedStressPnlPctNlv": null,
      "rawBetaWeightedShareDelta": 0,
      "rawBetaWeightedShareDeltaStatus": "VALID",
      "rawBetaWeightedShareDeltaReason": null,
      "partialProposedStressPnl": null,
      "rawGreekUnits": "RAW_DXFEED_EVENT_UNITS x SIGNED_CONTRACTS (contract multiplier NOT applied: the per-share vs per-contract scale is not established by the provider contract)"
    },
    ACTUAL_DEGRADED_NLV_VALID: {
      "scenarioId": "base",
      "status": "DEGRADED",
      "actualStatus": "DEGRADED",
      "actualComplete": true,
      "overlayStatus": "VALID",
      "overlayComplete": true,
      "proposedStatus": "DEGRADED",
      "proposedComplete": true,
      "pctNlvStatus": "VALID",
      "actualStressPnl": 1922.0211507814731,
      "proposedStressPnl": 1922.0211507814731,
      "actualStressPnlPctNlv": 0.019220211507814732,
      "proposedStressPnlPctNlv": 0.019220211507814732,
      "rawBetaWeightedShareDelta": 0,
      "rawBetaWeightedShareDeltaStatus": "VALID",
      "rawBetaWeightedShareDeltaReason": null,
      "partialProposedStressPnl": null,
      "rawGreekUnits": "RAW_DXFEED_EVENT_UNITS x SIGNED_CONTRACTS (contract multiplier NOT applied: the per-share vs per-contract scale is not established by the provider contract)"
    },
  };

  // 16.1 Actual complete + Overlay incomplete + pctNlvStatus VALID.
  {
    const c = REAL.OVERLAY_INCOMPLETE_NLV_VALID;
    ok(c.actualStatus === 'VALID' && c.actualComplete === true && c.pctNlvStatus === 'VALID'
       && c.proposedComplete === false && typeof c.actualStressPnlPctNlv === 'number',
      '16.1: the captured cell really is the case under test (Actual VALID+complete, Proposed incomplete, NLV VALID)');
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === c.actualStressPnlPctNlv,
      '16.2: the Actual percentage is KEPT');
    ok(n.authoritative.actualStressPnlPctNlv === c.actualStressPnlPctNlv,
      '16.3: …and it is AUTHORITATIVE — this is what the old pctNlvStatus destroyed');
    ok(n.contractViolations.every((v) => v.field !== 'actualStressPnlPctNlv'),
      '16.4: …and NO contract violation is raised against it');
    ok(n.values.proposedStressPnlPctNlv === null,
      '16.5: the Proposed percentage is null — withheld by its own result set');
    ok(n.authoritative.proposedStressPnlPctNlv === null, '16.6: …and is not authoritative');
    ok(n.metricAuthority.pctNlvStatus === 'VALID', '16.7: the metric status is republished as VALID');
  }

  // 16.2 a DEGRADED NLV: numbers visible, never authoritative.
  {
    const c = REAL.NLV_DEGRADED;
    ok(c.pctNlvStatus === 'DEGRADED' && c.actualStatus === 'VALID',
      '16.8: the captured cell carries a DEGRADED NLV over a VALID Actual set');
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === c.actualStressPnlPctNlv
       && n.values.proposedStressPnlPctNlv === c.proposedStressPnlPctNlv,
      '16.9: both percentages are present in values');
    ok(n.authoritative.actualStressPnlPctNlv === null
       && n.authoritative.proposedStressPnlPctNlv === null,
      '16.10: …and ABSENT from authoritative — a stale denominator is not a total');
    ok(n.metricAuthority.pctNlvStatus === 'DEGRADED', '16.11: metricAuthority.pctNlvStatus === DEGRADED');
    // The P&L is untouched: the metric status governs only its own metric.
    ok(n.authoritative.actualStressPnl === c.actualStressPnl,
      '16.12: the P&L itself stays authoritative — the NLV governs the ratio, not the numerator');
  }

  // 16.3 an UNAVAILABLE NLV with numbers present by mistake.
  {
    // The real cell already withholds both percentages, which is correct — so a
    // contradiction has to be INJECTED to test the withdrawal path. The status
    // fields stay exactly as the backend produced them.
    const c = Object.assign({}, REAL.NLV_UNAVAILABLE, {
      actualStressPnlPctNlv: -0.12,
      proposedStressPnlPctNlv: -0.2,
    });
    ok(REAL.NLV_UNAVAILABLE.actualStressPnlPctNlv === null,
      '16.13: the real backend already sends null here — the numbers below are injected');
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === null && n.values.proposedStressPnlPctNlv === null,
      '16.14: numbers under an UNAVAILABLE pctNlvStatus are WITHDRAWN');
    const v = n.contractViolations.filter((x) => x.metricStatusField === 'pctNlvStatus');
    ok(v.length === 2, '16.15: …and both contradictions are reported against pctNlvStatus');
    ok(n.metricAuthority.pctNlvStatus === 'UNAVAILABLE', '16.16: the metric status is republished');
  }

  // 16.4 a VALID pctNlvStatus must not promote a DEGRADED result set.
  {
    const c = REAL.ACTUAL_DEGRADED_NLV_VALID;
    ok(c.actualStatus === 'DEGRADED' && c.pctNlvStatus === 'VALID',
      '16.17: the captured cell is a DEGRADED Actual set under a VALID NLV');
    const n = call('normalizePortfolioStressCell(__c)', { __c: c });
    ok(n.values.actualStressPnlPctNlv === c.actualStressPnlPctNlv,
      '16.18: the number is kept');
    ok(n.authoritative.actualStressPnlPctNlv === null,
      '16.19: a VALID pctNlvStatus does NOT promote a DEGRADED Actual set');
    ok(n.authoritative.proposedStressPnlPctNlv === null,
      '16.20: …nor a DEGRADED Proposed set');
  }

  // 16.5 the fixtures must stay honest: if the backend ever stops producing
  //      these shapes, these tests are measuring a museum piece.
  {
    const shapes = Object.values(REAL);
    ok(shapes.every((c) => typeof c.pctNlvStatus === 'string'),
      '16.21: every captured cell publishes pctNlvStatus');
    ok(new Set(shapes.map((c) => c.pctNlvStatus)).size === 3,
      '16.22: the captures cover all three metric statuses (VALID, DEGRADED, UNAVAILABLE)');
    ok(shapes.some((c) => c.pctNlvStatus === 'VALID' && c.proposedComplete === false),
      '16.23: …including the VALID-denominator-with-incomplete-Proposed case that used to be impossible');
  }
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log(fail === 0
  ? '\nAll ' + pass + ' assertions passed.'
  : '\n' + pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.');
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
