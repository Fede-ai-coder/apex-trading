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
    isFinite: isFinite, parseFloat: parseFloat, Math: Math, String: String,
  };
  vm.createContext(ctx);
  const src = [
    extractFn(HTML, '_resolveSpyPrice'),
    extractFn(HTML, '_scanDataField'),
    extractFn(HTML, 'aggregateGreeks'),
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

// ── 7. Option position whose delta is ALREADY NET must NOT be multiplied again ─
// pos.delta is the net position delta (sign × qty × multiplier already applied
// upstream in refreshPositionsLive). Supplying legs/qty must NOT change the result.
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  // A 2-contract long call: net delta already 40 (e.g. 0.20/contract → 20 pts × 2).
  const netPos = [{
    ticker: 'AAPL', delta: 40, theta: -5, beta: 1.2, underlyingPrice: 200,
    legs: [{ qty: 2, side: 'LONG', type: 'CALL' }],
  }];
  const r = ctx.computePortfolioRiskMetrics(netPos, { spyPrice: 500 });
  // Correct (net, not re-multiplied): 40 × 1.2 × (200/500) = 19.2
  // WRONG (re-multiplied by qty=2):   80 × 1.2 × (200/500) = 38.4
  assert(approx(r.totalBetaWeightedDelta, 19.2), '7: net delta used as-is = 19.2, got ' + r.totalBetaWeightedDelta);
  assert(r.perSymbolMetrics[0].quantity === 2, '7: quantity surfaced for audit, got ' + r.perSymbolMetrics[0].quantity);
  assert(r.perSymbolMetrics[0].delta === 40, '7: net delta recorded unchanged, got ' + r.perSymbolMetrics[0].delta);

  // Same net delta WITHOUT legs → identical βΔ (proves qty never re-scales delta).
  const noLegs = [{ ticker: 'AAPL', delta: 40, theta: -5, beta: 1.2, underlyingPrice: 200 }];
  const r2 = ctx.computePortfolioRiskMetrics(noLegs, { spyPrice: 500 });
  assert(approx(r2.totalBetaWeightedDelta, r.totalBetaWeightedDelta),
    '7: result independent of legs/qty, got ' + r2.totalBetaWeightedDelta);
  console.log('✓ 7 net delta is never re-multiplied by qty');
})();

// ── 8. Raw/per-contract delta is normalized UPSTREAM, computePortfolio trusts it ─
// Document the contract: the calculator does not normalize per-contract Greeks
// itself — refreshPositionsLive does (normalizeGreekPoints + sign × qty). So a
// position carrying the already-normalized net value produces the SPY-weighted βΔ
// directly, and the audit row exposes the raw per-leg delta for cross-checking.
(function() {
  const ctx = makeCtx({ spyPrice: 400 });
  // Upstream: leg raw delta 0.25/contract, 4 contracts long → net 100 (25 pts × 4).
  // legsLive carries the raw per-leg delta so the audit table can show it.
  const pos = [{
    ticker: 'SPY', delta: 100, theta: -8, beta: 1.0, underlyingPrice: 400,
    legs: [{ qty: 4, side: 'LONG', type: 'CALL' }],
    legsLive: [{ delta: 0.25 }],
  }];
  const r = ctx.computePortfolioRiskMetrics(pos, { spyPrice: 400 });
  // 100 × 1.0 × (400/400) = 100  — uses the net value verbatim, no re-normalization.
  assert(approx(r.totalBetaWeightedDelta, 100), '8: normalized-upstream net used = 100, got ' + r.totalBetaWeightedDelta);
  assert(approx(r.perSymbolMetrics[0].rawDelta, 0.25), '8: raw per-leg delta surfaced = 0.25, got ' + r.perSymbolMetrics[0].rawDelta);
  assert(r.perSymbolMetrics[0].delta === 100, '8: net delta used, not the raw 0.25');
  console.log('✓ 8 raw delta normalized upstream; calculator trusts net + audits raw');
})();

// ── 9. Missing beta on ONE symbol must not blank the total (explicit + sources) ─
(function() {
  const ctx = makeCtx({ spyPrice: 500, scanData: [] });
  const positions = [
    { ticker: 'AAPL', delta: 30, theta: -5, beta: 1.2, underlyingPrice: 200 }, // → 14.4
    { ticker: 'MSFT', delta: 20, theta: -3, beta: null, underlyingPrice: 400 }, // beta missing
    { ticker: 'NVDA', delta: 10, theta: -2, beta: 1.5, underlyingPrice: 900 }, // → 27
  ];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  assert(approx(r.totalBetaWeightedDelta, 14.4 + 27), '9: total = valid legs only = 41.4, got ' + r.totalBetaWeightedDelta);
  assert(r.missingCounts.beta === 1, '9: exactly one beta missing');
  assert(r.perSymbolMetrics[1].missingReason === 'beta', '9: MSFT flagged missing beta');
  assert(r.perSymbolMetrics[0].betaSource === 'position', '9: AAPL beta from position');
  assert(r.perSymbolMetrics[1].betaWeightedDelta === null, '9: MSFT contributes null, not 0');
  console.log('✓ 9 one missing beta does not blank the whole total');
})();

// ── 10. scanData fallback matches on the correct ticker (case-insensitive) ──────
(function() {
  const ctx = makeCtx({
    spyPrice: 500,
    // Wrong-symbol rows present to prove the lookup keys on ticker, not order.
    scanData: [
      { ticker: 'AMD',  beta: 9.9, price: 1 },
      { ticker: 'tsla', beta: 2.0, price: 250 }, // lowercase → must still match TSLA
      { ticker: 'F',    beta: 0.1, price: 12 },
    ],
  });
  const positions = [{ ticker: 'TSLA', delta: 5, theta: -1, beta: null, underlyingPrice: null }];
  const r = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  // 5 × 2.0 × (250/500) = 5  — beta/price came from the TSLA row, not AMD/F.
  assert(approx(r.totalBetaWeightedDelta, 5), '10: matched TSLA row = 5, got ' + r.totalBetaWeightedDelta);
  assert(r.perSymbolMetrics[0].beta === 2.0, '10: beta from TSLA scan row, got ' + r.perSymbolMetrics[0].beta);
  assert(r.perSymbolMetrics[0].underlyingPrice === 250, '10: price from TSLA scan row, got ' + r.perSymbolMetrics[0].underlyingPrice);
  assert(r.perSymbolMetrics[0].betaSource === 'scanData', '10: betaSource = scanData');
  assert(r.perSymbolMetrics[0].underlyingPriceSource === 'scanData', '10: priceSource = scanData');
  console.log('✓ 10 scanData fallback matches the correct ticker');
})();

// ── 11. AVG BETA and BETA-WTDΔ are intentionally DIFFERENT quantities ──────────
// AVG BETA = notional-weighted mean beta (aggregateGreeks.avgBeta).
// BETA-WTDΔ = SPY-normalized Σ(delta × beta × underlyingPrice/spy).
// They must not be confused: different units, different values.
(function() {
  const ctx = makeCtx({ spyPrice: 500 });
  const positions = [
    { ticker: 'AAPL', delta: 30,  theta: -5, beta: 1.2, underlyingPrice: 200, qty: 1, entryPrice: 5 },
    { ticker: 'MSFT', delta: -20, theta: -3, beta: 0.9, underlyingPrice: 400, qty: 1, entryPrice: 8 },
  ];
  const ag   = ctx.aggregateGreeks(positions, 500);
  const risk = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  assert(ag.avgBeta !== null, '11: AVG BETA computed');
  assert(risk.totalBetaWeightedDelta !== null, '11: BETA-WTDΔ computed');
  // AVG BETA is a small ratio (~1); BETA-WTDΔ here = 14.4 + (-14.4) = 0. Distinct.
  assert(approx(risk.totalBetaWeightedDelta, 0), '11: BETA-WTDΔ = 0, got ' + risk.totalBetaWeightedDelta);
  assert(Math.abs(ag.avgBeta - risk.totalBetaWeightedDelta) > 0.5,
    '11: AVG BETA (' + ag.avgBeta + ') ≠ BETA-WTDΔ (' + risk.totalBetaWeightedDelta + ')');
  // And aggregateGreeks must NOT expose a "betaWeightedDelta" equal to avgBeta.
  assert(ag.avgBeta !== ag.betaWeightedDelta, '11: avgBeta and betaWeightedDelta are separate fields');
  console.log('✓ 11 AVG BETA and BETA-WTDΔ are distinct quantities');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed')
                            : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
