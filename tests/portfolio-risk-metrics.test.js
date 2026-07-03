'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// computePortfolioRiskMetrics — Portfolio KPI calculator validation.
//
// Extracts the REAL helper (plus _resolveSpyPrice / _scanDataField) from
// index.html and runs it in a vm sandbox. Proves the acceptance criteria of the
// "Beta-Weighted Delta / Delta-Theta Ratio" fix:
//   1.  full data → numeric betaWeightedDelta + deltaThetaRatio (formula check)
//   2.  SPY price resolved from S.portfolioData.spyPrice when global _spyPrice
//       is null (the backend-offload regression path)
//   3.  one position missing beta/price does NOT blank the whole portfolio
//   4.  totalTheta zero/missing → deltaThetaRatio null (renderer shows "—")
//   5.  beta/price fall back to scanData when the position is un-enriched
//   6.  missingCounts is aggregated per reason
//
// Run: node tests/portfolio-risk-metrics.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inS) inS = null;
        continue;
      }
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
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ ' + msg); }
}
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-6); }

// Build a fresh sandbox per scenario so the dedupe signature never blocks a log
// and module state (_lastPortfolioMetricsSig, _spyPrice) is isolated.
function makeCtx(opts) {
  opts = opts || {};
  const ctx = {
    console: { log: function() {}, warn: function() {}, error: function() {} },
    S: { portfolioData: opts.portfolioData || null, scanData: opts.scanData || [] },
    _spyPrice: opts.spyPrice !== undefined ? opts.spyPrice : null,
    _lastPortfolioMetricsSig: null,
    isFinite: isFinite, parseFloat: parseFloat, Math: Math, String: String, Object: Object,
    normalizeGreekPoints(v) { const n = parseFloat(v); return isFinite(n) && Math.abs(n) <= 1 ? n * 100 : n; },
  };
  vm.createContext(ctx);
  const src = [
    extractFn(HTML, '_resolveSpyPrice'),
    extractFn(HTML, '_scanDataField'),
    extractFn(HTML, '_portfolioTradeIsOpenForRisk'),
    extractFn(HTML, '_portfolioIdEq'),
    extractFn(HTML, '_portfolioPositionBelongsToPortfolio'),
    extractFn(HTML, 'getOpenPortfolioRiskPositions'),
    extractFn(HTML, '_portfolioLegStatusForRisk'),
    extractFn(HTML, '_portfolioFirstFiniteField'),
    extractFn(HTML, '_portfolioLegExplicitOpenQty'),
    extractFn(HTML, '_portfolioLegHasExplicitOpenQty'),
    extractFn(HTML, '_portfolioLegEffectiveQty'),
    extractFn(HTML, '_portfolioLegHasCloseMarker'),
    extractFn(HTML, '_isTerminalPortfolioLeg'),
    extractFn(HTML, 'isActivePortfolioLeg'),
    extractFn(HTML, '_isActivePortfolioLeg'),
    extractFn(HTML, 'getActivePortfolioLegs'),
    extractFn(HTML, '_portfolioNetGreekFromActiveLegs'),
    extractFn(HTML, 'computeRowBetaWeightedDelta'),
    extractFn(HTML, '_portfolioRiskDebugEnabled'),
    extractFn(HTML, 'computePortfolioRiskMetrics'),
  ].join('\n');
  vm.runInContext(src, ctx);
  return ctx;
}

// ── 1. Full data → numeric KPIs, exact formula ──────────────────────────────
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  // betaWeightedDelta = delta × beta × (underlyingPrice / spyPrice)
  //  AAPL: 30 × 1.2 × (200/500) = 14.4
  //  MSFT: -20 × 0.9 × (400/500) = -14.4   → total 0
  const positions = [
    { ticker: 'AAPL', delta: 30,  theta: -5, beta: 1.2, underlyingPrice: 200 },
    { ticker: 'MSFT', delta: -20, theta: -3, beta: 0.9, underlyingPrice: 400 },
  ];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  assert(approx(r.totalBetaWeightedDelta, 0), '1: bwd total = 0, got ' + r.totalBetaWeightedDelta);
  assert(approx(r.totalTheta, -8), '1: totalTheta = -8, got ' + r.totalTheta);
  // ratio = 0 / |−8| = 0  → a VALID zero, not null
  assert(r.deltaThetaRatio === 0, '1: ratio is a valid 0, got ' + r.deltaThetaRatio);
  assert(r.spyPrice === 500, '1: spyPrice resolved');
  console.log('✓ 1 full-data KPIs + exact formula');
})();

// ── 2. SPY from S.portfolioData.spyPrice when global _spyPrice is null ───────
(function() {
  const ctx = makeCtx({ spyPrice: null, portfolioData: { spyPrice: 450 } });
  const positions = [{ ticker: 'NVDA', delta: 10, theta: -2, beta: 1.5, underlyingPrice: 900 }];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: null });
  // 10 × 1.5 × (900/450) = 30
  assert(r.spyPrice === 450, '2: SPY fell back to portfolioData, got ' + r.spyPrice);
  assert(approx(r.totalBetaWeightedDelta, 30), '2: bwd = 30, got ' + r.totalBetaWeightedDelta);
  assert(approx(r.deltaThetaRatio, 15), '2: ratio = 30/|-2| = 15, got ' + r.deltaThetaRatio);
  assert(r.missingCounts.spyPrice === 0, '2: no spyPrice missing');
  console.log('✓ 2 SPY fallback via S.portfolioData.spyPrice');
})();

// ── 3. One bad position does not blank the whole portfolio ──────────────────
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  const positions = [
    { ticker: 'AAPL', delta: 30, theta: -5, beta: 1.2, underlyingPrice: 200 }, // valid → 14.4
    { ticker: 'XYZ',  delta: 10, theta: -1, beta: null, underlyingPrice: null }, // missing beta+price
  ];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  assert(approx(r.totalBetaWeightedDelta, 14.4), '3: bwd from valid leg only = 14.4, got ' + r.totalBetaWeightedDelta);
  assert(approx(r.totalTheta, -6), '3: theta still sums both = -6, got ' + r.totalTheta);
  assert(r.missingCounts.beta === 1, '3: one beta missing counted');
  assert(r.perSymbolMetrics[1].missingReason === 'beta', '3: XYZ excluded for beta');
  console.log('✓ 3 partial data does not break portfolio total');
})();


// ── 3b. Selected portfolio scope filters KPI positions ─────────────────────
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  const positions = [
    { ticker: 'AAPL', portfolioId: 1, status: 'OPEN', delta: 30, theta: -5, beta: 1.2, underlyingPrice: 200 },
    { ticker: 'MSFT', portfolioId: 2, status: 'OPEN', delta: 999, theta: -9, beta: 1.0, underlyingPrice: 400 },
    { ticker: 'IBM', portfolioId: 1, status: 'CLOSED', delta: 777, theta: -7, beta: 1.0, underlyingPrice: 100 },
    { ticker: 'TSLA', portfolioId: null, status: 'OPEN', delta: 555, theta: -5, beta: 1.0, underlyingPrice: 300 }
  ];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500, portfolioId: '1' });
  assert(r.perSymbolMetrics.length === 1, '3b: only one scoped symbol, got ' + r.perSymbolMetrics.length);
  assert(r.perSymbolMetrics[0].symbol === 'AAPL', '3b: scoped symbol is AAPL, got ' + (r.perSymbolMetrics[0] && r.perSymbolMetrics[0].symbol));
  assert(approx(r.totalBetaWeightedDelta, 14.4), '3b: bwd = 14.4, got ' + r.totalBetaWeightedDelta);
  assert(approx(r.totalTheta, -5), '3b: theta = -5, got ' + r.totalTheta);
  assert(approx(r.deltaThetaRatio, 2.88), '3b: ratio = 2.88, got ' + r.deltaThetaRatio);
  console.log('✓ 3b selected portfolio scope filters KPI positions');
})();

// ── 4. totalTheta zero/missing → ratio null (renderer shows "—") ────────────
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  // theta sums to ~0 → ratio must be null, NOT a fake number
  const positions = [
    { ticker: 'AAPL', delta: 30, theta: 4,  beta: 1.2, underlyingPrice: 200 },
    { ticker: 'MSFT', delta: 10, theta: -4, beta: 0.9, underlyingPrice: 400 },
  ];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  assert(r.totalBetaWeightedDelta !== null, '4: bwd still computed');
  assert(r.deltaThetaRatio === null, '4: ratio null when |theta|<0.001, got ' + r.deltaThetaRatio);

  const ctx2 = makeCtx({ spyPrice: 500 });
  const noTheta = [{ ticker: 'AAPL', delta: 30, theta: null, beta: 1.2, underlyingPrice: 200 }];
  const r2 = ctx2.computePortfolioRiskMetrics(noTheta, { spyPrice: 500 });
  assert(r2.totalTheta === null, '4: totalTheta null when no theta data');
  assert(r2.deltaThetaRatio === null, '4: ratio null when theta missing');
  assert(r2.missingCounts.theta === 1, '4: theta missing counted');
  console.log('✓ 4 zero/missing theta → ratio null');
})();

// ── 5. beta + price fall back to scanData for un-enriched positions ─────────
(function() {
  const ctx = makeCtx({
    spyPrice: 500,
    scanData: [{ ticker: 'TSLA', beta: 2.0, price: 250 }],
  });
  const positions = [{ ticker: 'TSLA', delta: 5, theta: -1, beta: null, underlyingPrice: null }];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  // 5 × 2.0 × (250/500) = 5
  assert(approx(r.totalBetaWeightedDelta, 5), '5: bwd via scanData = 5, got ' + r.totalBetaWeightedDelta);
  assert(r.missingCounts.beta === 0 && r.missingCounts.underlyingPrice === 0, '5: scanData filled the gaps');
  console.log('✓ 5 scanData fallback for beta + price');
})();

// ── 6. no SPY anywhere → bwd null + missingCounts.spyPrice ──────────────────
(function() {
  const ctx = makeCtx({ spyPrice: null, portfolioData: null, scanData: [] });
  const positions = [{ ticker: 'AAPL', delta: 30, theta: -5, beta: 1.2, underlyingPrice: 200 }];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: null });
  assert(r.spyPrice === null, '6: no SPY resolved');
  assert(r.totalBetaWeightedDelta === null, '6: bwd null without SPY');
  assert(r.totalTheta === -5, '6: theta still aggregated independently of SPY');
  assert(r.missingCounts.spyPrice === 1, '6: spyPrice missing counted');
  console.log('✓ 6 missing SPY → bwd null, theta intact');
})();

// ── 7. computeRowBetaWeightedDelta uses NET delta as-is (no qty re-scaling) ──
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  // delta is already net; helper must NOT multiply by any quantity/contracts field.
  //  10 × 1.2 × (200/500) = 4.8 — identical whether or not `quantity` is present.
  const row     = ctx.computeRowBetaWeightedDelta({ ticker: 'AAPL', delta: 10, beta: 1.2, underlyingPrice: 200 }, 500);
  const rowQty  = ctx.computeRowBetaWeightedDelta({ ticker: 'AAPL', delta: 10, beta: 1.2, underlyingPrice: 200, quantity: 7 }, 500);
  assert(approx(row.betaWeightedDelta, 4.8), '7: row βΔ = delta×beta×(price/spy) = 4.8, got ' + row.betaWeightedDelta);
  assert(approx(rowQty.betaWeightedDelta, 4.8), '7: quantity is ignored (net delta as-is), got ' + rowQty.betaWeightedDelta);
  assert(row.beta === 1.2 && row.underlyingPrice === 200 && row.spyPrice === 500, '7: row echoes resolved inputs');
  assert(row.missingReason === null, '7: no missingReason when fully populated');
  console.log('✓ 7 row βΔ uses net delta as-is, ignores quantity');
})();

// ── 8. missing beta / price / SPY → betaWeightedDelta null (display "—") ──────
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  const noBeta  = ctx.computeRowBetaWeightedDelta({ ticker: 'XYZ', delta: 10, beta: null, underlyingPrice: 200 }, 500);
  const noPrice = ctx.computeRowBetaWeightedDelta({ ticker: 'XYZ', delta: 10, beta: 1.1, underlyingPrice: null }, 500);
  const noSpy   = ctx.computeRowBetaWeightedDelta({ ticker: 'XYZ', delta: 10, beta: 1.1, underlyingPrice: 200 }, null);
  const noDelta = ctx.computeRowBetaWeightedDelta({ ticker: 'XYZ', delta: null, beta: 1.1, underlyingPrice: 200 }, 500);
  assert(noBeta.betaWeightedDelta === null && noBeta.beta === null && noBeta.missingReason === 'beta', '8: missing beta → null + reason');
  assert(noPrice.betaWeightedDelta === null && noPrice.missingReason === 'underlyingPrice', '8: missing price → null + reason');
  assert(noSpy.betaWeightedDelta === null && noSpy.spyPrice === null && noSpy.missingReason === 'spyPrice', '8: missing SPY → null + reason');
  assert(noDelta.betaWeightedDelta === null && noDelta.missingReason === 'delta', '8: missing delta → null + reason');
  console.log('✓ 8 missing input → betaWeightedDelta null (renderer shows dash)');
})();

// ── 9. row βΔ values sum to the aggregate when all inputs are present ─────────
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  const positions = [
    { ticker: 'AAPL', delta: 30,  theta: -5, beta: 1.2, underlyingPrice: 200 },
    { ticker: 'MSFT', delta: -20, theta: -3, beta: 0.9, underlyingPrice: 400 },
    { ticker: 'NVDA', delta: 12,  theta: -2, beta: 1.5, underlyingPrice: 900 },
  ];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  // Reproduce the visible row column independently via the row helper, then sum.
  const rowSum = positions.reduce(function(acc, p) {
    const v = ctx.computeRowBetaWeightedDelta(p, r.spyPrice).betaWeightedDelta;
    return acc + (v != null ? v : 0);
  }, 0);
  assert(approx(rowSum, r.totalBetaWeightedDelta), '9: Σ row βΔ = aggregate, got ' + rowSum + ' vs ' + r.totalBetaWeightedDelta);
  // And the per-symbol values the aggregate stores match the row helper exactly.
  positions.forEach(function(p, i) {
    const v = ctx.computeRowBetaWeightedDelta(p, r.spyPrice).betaWeightedDelta;
    assert(approx(v, r.perSymbolMetrics[i].betaWeightedDelta), '9: row[' + i + '] matches aggregate per-symbol');
  });
  console.log('✓ 9 row βΔ values sum to aggregate βΔ WTD');
})();

// ── 10. mixed valid/missing rows: only valid rows sum to the (non-blanked) total ─
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  const positions = [
    { ticker: 'AAPL', delta: 30, theta: -5, beta: 1.2, underlyingPrice: 200 },  // 14.4
    { ticker: 'XYZ',  delta: 10, theta: -1, beta: null, underlyingPrice: null }, // missing → excluded
  ];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  const rowSum = positions.reduce(function(acc, p) {
    const v = ctx.computeRowBetaWeightedDelta(p, r.spyPrice).betaWeightedDelta;
    return acc + (v != null ? v : 0);
  }, 0);
  assert(approx(rowSum, 14.4) && approx(rowSum, r.totalBetaWeightedDelta), '10: only valid rows sum to total, got ' + rowSum);
  assert(ctx.computeRowBetaWeightedDelta(positions[1], r.spyPrice).betaWeightedDelta === null, '10: missing row stays null, not 0');
  console.log('✓ 10 missing rows excluded; valid rows still sum to aggregate');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed')
                            : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
