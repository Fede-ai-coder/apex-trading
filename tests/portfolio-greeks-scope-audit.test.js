'use strict';
// Portfolio Greeks operational-risk scope audit.
// Extracts the real Portfolio helpers from index.html and verifies that Greeks,
// beta-weighted delta, and vega monitor ratios are scoped to the selected
// portfolio's currently-open/active legs only.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine) { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
      if (c === '/' && n === '/') { inLine = true; j++; continue; }
      if (c === '/' && n === '*') { inBlock = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
  }
  throw new Error('function not found: ' + name);
}

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('  ✗ ' + msg); } }
function eq(actual, expected, msg) { assert(Object.is(actual, expected), msg + ' expected ' + expected + ', got ' + actual); }
function near(actual, expected, msg) { assert(Math.abs(actual - expected) < 1e-9, msg + ' expected ' + expected + ', got ' + actual); }

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    isFinite, parseFloat, Math, String, Object,
    _lastPortfolioMetricsSig: null,
    S: { scanData: [] },
    _spyPrice: null,
    _spyPriceResolution: null,
    _spyPriceSource: null,
    _spyPriceUpdatedAt: null,
    _spyPriceIsLive: false,
    _spyPriceStaleReason: null,
    _apexPortfolioPriceRefreshDiag: { resolvedPricesBySymbol: {} },
    normalizeGreekPoints(v) { const n = parseFloat(v); return isFinite(n) && Math.abs(n) <= 1 ? n * 100 : n; },
    _scanDataField() { return null; },
    _resolveSpyPrice(v) { return (v != null && isFinite(v) && v > 0) ? +v : null; },
  };
  vm.createContext(ctx);
  [
    '_portfolioTradeIsOpenForRisk', '_portfolioIdEq', '_portfolioPositionBelongsToPortfolio',
    'getOpenPortfolioRiskPositions', '_portfolioLegStatusForRisk', '_portfolioQuantityFieldPresent', '_portfolioStrictQuantity', '_portfolioReadQuantityField', '_portfolioResidualQuantityFields', '_portfolioGrossQuantityFields', '_portfolioResolveLegQuantity',
    '_portfolioLegExplicitOpenQty', '_portfolioLegHasExplicitOpenQty', '_portfolioLegEffectiveQty',
    '_portfolioLegCloseMarkerFields', '_portfolioLegHasCloseMarker', '_isTerminalPortfolioLeg', 'isActivePortfolioLeg',
    '_isActivePortfolioLeg', 'getActivePortfolioLegs', '_portfolioNetGreekFromActiveLegs',
    'aggregateGreeks', 'computeRowBetaWeightedDelta', '_portfolioRiskDebugEnabled',
    'computePortfolioRiskMetrics', 'computeVegaMonitorRatios'
  ].forEach(name => vm.runInContext(extractFn(HTML, name), ctx));
  return ctx;
}

function pos(id, portfolioId, legs, legsLive, extra = {}) {
  return Object.assign({ id, ticker: 'T' + id, portfolioId, status: 'OPEN', beta: 1, underlyingPrice: 500, legs, legsLive }, extra);
}
function leg(type, side, qty, extra = {}) { return Object.assign({ type, side, qty }, extra); }
function live(delta, theta, gamma, vega) { return { delta, theta, gamma, vega }; }

(function oneOpenPositionEqualsTotals() {
  const ctx = makeCtx();
  const positions = [pos('A', 'p1', [leg('CALL', 'LONG', 2)], [live(0.10, -0.02, 0.5, 1.5)])];
  const ag = ctx.aggregateGreeks(positions, 500, 'p1');
  eq(ag.totalDelta, 20, 'A: delta totals equal the single open position');
  eq(ag.totalTheta, -4, 'A: theta totals equal the single open position');
  eq(ag.totalGamma, 1, 'A: gamma totals equal the single open position');
  eq(ag.totalVega, 3, 'A: vega totals equal the single open position');
  eq(ag.betaWeightedDelta, 20, 'A: BWD totals equal the single open position');
  console.log('✓ A single open position totals equal that position');
})();

(function multipleOpenPositionsSumExactly() {
  const ctx = makeCtx();
  const positions = [
    pos('A', 'p1', [leg('CALL', 'LONG', 1)], [live(0.10, -0.02, 0.1, 1)]),
    pos('B', 'p1', [leg('PUT', 'SHORT', 2)], [live(-0.05, -0.01, 0.2, 0.5)], { beta: 2, underlyingPrice: 250 })
  ];
  const ag = ctx.aggregateGreeks(positions, 500, 'p1');
  eq(ag.totalDelta, 20, 'B: delta sums active open positions only');
  eq(ag.totalTheta, 0, 'B: theta signed sum is exact');
  eq(ag.totalGamma, -0.30000000000000004, 'B: gamma signed sum is exact');
  eq(ag.totalVega, 0, 'B: vega signed sum is exact');
  eq(ag.betaWeightedDelta, 20, 'B: BWD sums exact row BWD values');
  console.log('✓ B multiple open positions sum exactly');
})();

(function closedAndOtherPortfolioExcluded() {
  const ctx = makeCtx();
  const positions = [
    pos('OPEN', 'p1', [leg('CALL', 'LONG', 1)], [live(0.10, -0.02, 0.1, 1)]),
    pos('CLOSED', 'p1', [leg('CALL', 'LONG', 9)], [live(0.99, -0.99, 9, 9)], { status: 'CLOSED' }),
    pos('OTHER', 'p2', [leg('CALL', 'LONG', 9)], [live(0.99, -0.99, 9, 9)])
  ];
  const ag = ctx.aggregateGreeks(positions, 500, 'p1');
  eq(ag.totalDelta, 10, 'C/D: closed and other-portfolio positions do not contribute delta');
  eq(ag.totalVega, 1, 'C/D: closed and other-portfolio positions do not contribute vega');
  console.log('✓ C/D closed positions and other portfolios excluded');
})();

(function rolledPositionUsesOnlyCurrentActiveLeg() {
  const ctx = makeCtx();
  const positions = [pos('ROLL', 'p1', [
    leg('PUT', 'SHORT', 1, { legStatus: 'CLOSED', closeDate: '2026-01-10' }),
    leg('PUT', 'SHORT', 1)
  ], [live(-0.90, -0.90, 9, 9), live(-0.20, -0.03, 0.4, 2)])];
  const ag = ctx.aggregateGreeks(positions, 500, 'p1');
  eq(ag.totalDelta, 20, 'E: rolled-out old leg is excluded from delta');
  eq(ag.totalTheta, 3, 'E: rolled-out old leg is excluded from theta');
  eq(ag.totalGamma, -0.4, 'E: rolled-out old leg is excluded from gamma');
  eq(ag.totalVega, -2, 'E: rolled-out old leg is excluded from vega');
  eq(ag.putShortVegaAbs, 2, 'E: only current short put contributes to short-put vega abs');
  console.log('✓ E rolled position includes only current active leg');
})();

(function emptyPortfolioAndZeroDenominatorAreSafe() {
  const ctx = makeCtx();
  const ag = ctx.aggregateGreeks([], 500, 'p1');
  eq(ag.totalDelta, null, 'F: empty portfolio has no stale delta data');
  eq(ag.betaWeightedDelta, null, 'F: empty portfolio has no stale BWD data');
  const risk = ctx.computePortfolioRiskMetrics([], { spyPrice: 500, portfolioId: 'p1' });
  eq(risk.totalBetaWeightedDelta, null, 'F: empty risk metrics have no stale BWD data');
  eq(risk.deltaThetaRatio, null, 'F/G: empty and zero-denominator ratio is safe null');
  const riskZeroTheta = ctx.computePortfolioRiskMetrics([
    pos('Z', 'p1', [leg('CALL', 'LONG', 1)], [live(0.10, 0, 0.1, 1)])
  ], { spyPrice: 500, portfolioId: 'p1' });
  eq(riskZeroTheta.deltaThetaRatio, null, 'G: zero theta denominator produces safe null, not NaN/Infinity');
  assert(!Number.isNaN(riskZeroTheta.deltaThetaRatio), 'G: ratio is not NaN');
  assert(riskZeroTheta.deltaThetaRatio !== Infinity && riskZeroTheta.deltaThetaRatio !== -Infinity, 'G: ratio is not Infinity');
  console.log('✓ F/G empty portfolio and zero denominators are safe');
})();

(function vegaSideRatiosUseExpectedAbsoluteShorts() {
  const ctx = makeCtx();
  const positions = [pos('V', 'p1', [
    leg('PUT', 'LONG', 1), leg('PUT', 'SHORT', 2), leg('CALL', 'LONG', 3), leg('CALL', 'SHORT', 4)
  ], [live(0.10, -0.01, 0.1, 2), live(-0.10, -0.01, 0.1, 1.5), live(0.10, -0.01, 0.1, 1), live(-0.10, -0.01, 0.1, 0.5)])];
  const ag = ctx.aggregateGreeks(positions, 500, 'p1');
  const ratios = ctx.computeVegaMonitorRatios(ag.betaWeightedDelta, ag);
  eq(ag.putLongVega, 2, 'H: put long vega total');
  eq(ag.putShortVegaAbs, 3, 'H: put short vega absolute total');
  eq(ag.callLongVega, 3, 'H: call long vega total');
  eq(ag.callShortVegaAbs, 2, 'H: call short vega absolute total');
  near(ratios.vegaLongPutOverShortPut, 2 / 3, 'H: Vega LP / |Vega SP| ratio');
  near(ratios.vegaLongCallOverShortCall, 3 / 2, 'H: Vega LC / |Vega SC| ratio');
  console.log('✓ H vega side ratios use absolute short denominators only where required');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
