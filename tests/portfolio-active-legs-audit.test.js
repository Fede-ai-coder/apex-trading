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
  extractFn(HTML, '_portfolioLegEffectiveQty'),
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

if (failed) {
  console.error(`\nFAIL: ${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`PASS: all ${passed} assertions`);
