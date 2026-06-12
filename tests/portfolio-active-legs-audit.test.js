'use strict';
// Portfolio active-leg selector audit.
// Run: node tests/portfolio-active-legs-audit.test.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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
function approx(a, b) { return Math.abs(a - b) < 1e-9; }

const ctx = {
  console: { log() {}, warn() {}, error() {} },
  isFinite, parseFloat, Math, String, Date, Object,
  normalizeGreekPoints(v) { return v; },
};
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, '_portfolioTradeIsOpenForRisk'),
  extractFn(HTML, '_portfolioLegStatusForRisk'),
  extractFn(HTML, '_portfolioLegExplicitOpenQty'),
  extractFn(HTML, '_portfolioLegHasExplicitOpenQty'),
  extractFn(HTML, '_portfolioLegEffectiveQty'),
  extractFn(HTML, '_portfolioLegHasCloseMarker'),
  extractFn(HTML, '_portfolioIdEq'),
  extractFn(HTML, '_portfolioPositionBelongsToPortfolio'),
  extractFn(HTML, 'getOpenPortfolioRiskPositions'),
  extractFn(HTML, 'isActivePortfolioLeg'),
  extractFn(HTML, 'getActivePortfolioLegs'),
  extractFn(HTML, 'aggregateGreeks'),
].join('\n'), ctx);

// Trade A: rolled put spread. Old legs are historical; only new open legs count.
(function rolledTradeUsesOnlyNewOpenLegs() {
  const tradeA = {
    id: 'A', ticker: 'SPY', status: 'OPEN', beta: 1, underlyingPrice: 500,
    delta: 999, theta: 999, gamma: 999, vega: 999,
    legs: [
      { type: 'PUT', side: 'SHORT', qty: 1, strike: 100, status: 'ROLLED', entryPrice: 2, closePrice: 1, closeDate: '2026-01-10' },
      { type: 'PUT', side: 'LONG',  qty: 1, strike: 95,  status: 'ROLLED', entryPrice: 1, closePrice: .5, closeDate: '2026-01-10' },
      { type: 'PUT', side: 'SHORT', qty: 1, strike: 98,  status: 'OPEN', entryPrice: 2 },
      { type: 'PUT', side: 'LONG',  qty: 1, strike: 93,  status: 'OPEN', entryPrice: 1 },
    ],
    legsLive: [
      { delta: 100, theta: 100, gamma: 100, vega: 100 },
      { delta: 95,  theta: 95,  gamma: 95,  vega: 95 },
      { delta: 30,  theta: -4,  gamma: .2,  vega: 8 },
      { delta: 10,  theta: -1,  gamma: .1,  vega: 3 },
    ],
  };
  const active = ctx.getActivePortfolioLegs([tradeA]);
  assert(active.length === 2, 'A: rolled trade exposes exactly two active legs');
  assert(active.map(e => e.leg.strike).join(',') === '98,93', 'A: active strikes are 98 and 93 only');
  const r = ctx.aggregateGreeks([tradeA], 500);
  assert(r.totalDelta === -20, 'A: delta = short 98 (-30) + long 93 (+10), got ' + r.totalDelta);
  assert(r.totalTheta === 3, 'A: theta excludes old 100/95 rolled legs, got ' + r.totalTheta);
  assert(r.totalVega === -5, 'A: vega excludes old 100/95 rolled legs, got ' + r.totalVega);
})();

// Trade B: completely closed trade must contribute no legs and no Greeks.
(function closedTradeExcluded() {
  const tradeB = {
    id: 'B', status: 'CLOSED', ticker: 'AAPL', beta: 1, underlyingPrice: 200,
    legs: [{ type: 'CALL', side: 'LONG', qty: 1, status: 'OPEN', entryPrice: 1 }],
    legsLive: [{ delta: 50, theta: -2, gamma: .2, vega: 5 }],
  };
  assert(ctx.getActivePortfolioLegs([tradeB]).length === 0, 'B: closed trade returns zero active legs');
  const r = ctx.aggregateGreeks([tradeB], 500);
  assert(r.totalDelta === null && r.totalTheta === null && r.totalVega === null, 'B: closed trade contributes no portfolio Greeks');
})();

// Trade C: effective quantity controls partially closed legs.
(function partialLegUsesRemainingQuantity() {
  const tradeC = {
    id: 'C', status: 'OPEN', ticker: 'MSFT', beta: 1, underlyingPrice: 400,
    legs: [
      { type: 'CALL', side: 'LONG', qty: 2, remainingQty: 0, status: 'OPEN', entryPrice: 1 },
      { type: 'CALL', side: 'LONG', qty: 3, remainingQty: 1, status: 'OPEN', entryPrice: 1 },
    ],
    legsLive: [
      { delta: 20, theta: -2, gamma: .2, vega: 4 },
      { delta: 7,  theta: -1, gamma: .1, vega: 2 },
    ],
  };
  const active = ctx.getActivePortfolioLegs([tradeC]);
  assert(active.length === 1 && active[0].effectiveQty === 1, 'C: only remaining quantity 1 is active');
  const r = ctx.aggregateGreeks([tradeC], 500);
  assert(r.totalDelta === 7, 'C: delta uses remaining quantity only, got ' + r.totalDelta);
  assert(r.totalTheta === -1, 'C: theta uses remaining quantity only, got ' + r.totalTheta);
  assert(approx(r.totalVega, 2), 'C: vega uses remaining quantity only, got ' + r.totalVega);
})();


// Trade D: status OPEN with close markers but no explicit remaining/open qty is historical.
(function openStatusWithCloseMarkersExcludedWithoutExplicitOpenQty() {
  const tradeD = {
    id: 'D', status: 'OPEN', ticker: 'QQQ', beta: 1, underlyingPrice: 400,
    legs: [
      { type: 'PUT', side: 'SHORT', qty: 1, status: 'OPEN', entryPrice: 2, closePrice: 1.20, closeDate: '2026-01-10' },
    ],
    legsLive: [
      { delta: 11, theta: -2, gamma: .3, vega: 4 },
    ],
  };
  assert(ctx.getActivePortfolioLegs([tradeD]).length === 0, 'D: OPEN leg with close markers and no explicit open qty is not active');
  const r = ctx.aggregateGreeks([tradeD], 500);
  assert(r.totalDelta === null, 'D: delta excludes close-marked OPEN leg');
  assert(r.totalTheta === null, 'D: theta excludes close-marked OPEN leg');
  assert(r.totalGamma === null, 'D: gamma excludes close-marked OPEN leg');
  assert(r.totalVega === null, 'D: vega excludes close-marked OPEN leg');
})();

// Trade E: status OPEN with close markers and positive remainingQty keeps residual risk only.
(function openStatusWithCloseMarkersUsesExplicitRemainingQty() {
  const tradeE = {
    id: 'E', status: 'OPEN', ticker: 'QQQ', beta: 1, underlyingPrice: 400,
    legs: [
      { type: 'PUT', side: 'SHORT', qty: 3, remainingQty: 1, status: 'OPEN', entryPrice: 2, closePrice: 1.20, closeDate: '2026-01-10' },
    ],
    legsLive: [
      { delta: 11, theta: -2, gamma: .3, vega: 4 },
    ],
  };
  const active = ctx.getActivePortfolioLegs([tradeE]);
  assert(active.length === 1 && active[0].effectiveQty === 1, 'E: close-marked OPEN leg remains active only for remainingQty=1');
  const r = ctx.aggregateGreeks([tradeE], 500);
  assert(r.totalDelta === -11, 'E: delta uses only residual remainingQty=1');
  assert(r.totalTheta === 2, 'E: theta uses only residual remainingQty=1');
  assert(approx(r.totalGamma, -.3), 'E: gamma uses only residual remainingQty=1');
  assert(r.totalVega === -4, 'E: vega uses only residual remainingQty=1');
})();

// Trade F: status OPEN with explicit remainingQty=0 has no active Portfolio risk.
(function openStatusWithZeroRemainingQtyExcluded() {
  const tradeF = {
    id: 'F', status: 'OPEN', ticker: 'QQQ', beta: 1, underlyingPrice: 400,
    legs: [
      { type: 'CALL', side: 'LONG', qty: 3, remainingQty: 0, status: 'OPEN', entryPrice: 1 },
    ],
    legsLive: [
      { delta: 15, theta: -1, gamma: .2, vega: 3 },
    ],
  };
  assert(ctx.getActivePortfolioLegs([tradeF]).length === 0, 'F: remainingQty=0 leg is not active');
  const r = ctx.aggregateGreeks([tradeF], 500);
  assert(r.totalDelta === null && r.totalTheta === null && r.totalGamma === null && r.totalVega === null, 'F: remainingQty=0 contributes no Greeks');
})();


// Trade G: portfolio scope is enforced before Greek aggregation.
(function aggregateGreeksUsesOnlySelectedPortfolioPositions() {
  const positions = [
    {
      id: 'G1', portfolioId: 101, status: 'OPEN', ticker: 'AAPL', beta: 1, underlyingPrice: 200,
      legs: [{ type: 'CALL', side: 'LONG', qty: 1, status: 'OPEN', entryPrice: 1 }],
      legsLive: [{ delta: 12, theta: -2, gamma: .2, vega: 5 }],
    },
    {
      id: 'G2', portfolioId: 202, status: 'OPEN', ticker: 'MSFT', beta: 1, underlyingPrice: 400,
      legs: [{ type: 'PUT', side: 'LONG', qty: 1, status: 'OPEN', entryPrice: 1 }],
      legsLive: [{ delta: 999, theta: 999, gamma: 999, vega: 999 }],
    },
    {
      id: 'G3', portfolioId: null, status: 'OPEN', ticker: 'TSLA', beta: 1, underlyingPrice: 300,
      legs: [{ type: 'CALL', side: 'LONG', qty: 1, status: 'OPEN', entryPrice: 1 }],
      legsLive: [{ delta: 777, theta: 777, gamma: 777, vega: 777 }],
    },
  ];
  const scoped = ctx.getOpenPortfolioRiskPositions(positions, '101');
  assert(scoped.length === 1 && scoped[0].id === 'G1', 'G: selected portfolio includes only assigned open positions');
  const r = ctx.aggregateGreeks(positions, 500, '101');
  assert(r.totalDelta === 12, 'G: delta excludes other/unassigned portfolios, got ' + r.totalDelta);
  assert(r.totalTheta === -2, 'G: theta excludes other/unassigned portfolios, got ' + r.totalTheta);
  assert(r.totalVega === 5, 'G: vega excludes other/unassigned portfolios, got ' + r.totalVega);
})();

// Trade H: scalar legacy closed rows are excluded even when they have no legs.
(function scalarClosedLegacyRowExcluded() {
  const positions = [
    { id: 'H1', portfolioId: 303, status: 'CLOSED', ticker: 'IBM', delta: 999, theta: 999, gamma: 999, vega: 999, beta: 1, underlyingPrice: 100 },
  ];
  const r = ctx.aggregateGreeks(positions, 500, 303);
  assert(r.totalDelta === null && r.totalTheta === null && r.totalGamma === null && r.totalVega === null,
    'H: closed scalar legacy row contributes no Greeks');
})();

if (failed) {
  console.error(`\nFAIL: ${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`PASS: all ${passed} assertions`);
