'use strict';
// Portfolio active-leg selector audit: current risk must exclude historical legs.

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
function near(actual, expected, msg) { assert(Math.abs(actual - expected) < 1e-9, msg + ' expected ' + expected + ', got ' + actual); }
function isNull(v, msg) { assert(v === null, msg + ' expected null, got ' + v); }

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    isFinite, parseFloat, Number, Math, String, Date, Object,
    S: { greeksCache: {}, scanData: [], portfolioData: null },
    _spyPrice: null,
    normalizeGreekPoints(v) { const n = parseFloat(v); return isFinite(n) && Math.abs(n) <= 1 ? n * 100 : n; },
  };
  vm.createContext(ctx);
  [
    '_portfolioTradeIsOpenForRisk',
    '_portfolioIdEq',
    '_portfolioPositionBelongsToPortfolio',
    'getOpenPortfolioRiskPositions', '_portfolioLegStatusForRisk', '_portfolioFirstFiniteField',
    '_portfolioLegExplicitOpenQty', '_portfolioLegHasExplicitOpenQty', '_portfolioLegEffectiveQty',
    '_portfolioLegHasCloseMarker', '_isTerminalPortfolioLeg', 'isActivePortfolioLeg',
    '_isActivePortfolioLeg', 'getActivePortfolioLegs', '_portfolioNetGreekFromActiveLegs',
    '_terminalPortfolioLegPlaceholder', 'aggregateGreeks'
  ].forEach(name => vm.runInContext(extractFn(HTML, name), ctx));
  return ctx;
}

(function caseA_rolledPutSpread() {
  const ctx = makeCtx();
  const pos = {
    ticker: 'SPY', status: 'OPEN', beta: 1, underlyingPrice: 400,
    legs: [
      { type: 'PUT', side: 'SHORT', strike: 100, qty: 1, status: 'ROLLED', entryPrice: 1 },
      { type: 'PUT', side: 'LONG',  strike: 95,  qty: 1, status: 'ROLLED', entryPrice: 1 },
      { type: 'PUT', side: 'SHORT', strike: 98,  qty: 1, status: 'OPEN', entryPrice: 1 },
      { type: 'PUT', side: 'LONG',  strike: 93,  qty: 1, status: 'OPEN', entryPrice: 1 },
    ],
    legsLive: [
      { delta: -0.90, theta: -0.90, gamma: 9, vega: 90 },
      { delta:  0.90, theta: -0.90, gamma: 9, vega: 90 },
      { delta: -0.20, theta: -0.03, gamma: 0.01, vega: 2 },
      { delta:  0.10, theta: -0.01, gamma: 0.02, vega: 1 },
    ],
  };
  const r = ctx.aggregateGreeks([pos], 400);
  near(r.totalDelta, 30, 'A: only new 98/93 active legs contribute delta');
  near(r.totalTheta, 2, 'A: rolled 100/95 legs do not contribute theta');
  near(r.totalGamma, 0.01, 'A: rolled 100/95 legs do not contribute gamma');
  near(r.totalVega, -1, 'A: rolled 100/95 legs do not contribute vega');
})();

(function caseB_closedTrade() {
  const ctx = makeCtx();
  const r = ctx.aggregateGreeks([{ status: 'CLOSED', ticker: 'SPY', delta: 999, theta: 999, legs: [{ status: 'OPEN', qty: 1 }], legsLive: [{ delta: 0.5, theta: -0.2, gamma: 1, vega: 1 }] }], 400);
  isNull(r.totalDelta, 'B: closed trade delta');
  isNull(r.totalTheta, 'B: closed trade theta');
  isNull(r.totalGamma, 'B: closed trade gamma');
  isNull(r.totalVega, 'B: closed trade vega');
})();


(function caseB2_selectedPortfolioScope() {
  const ctx = makeCtx();
  const positions = [
    {
      id: 'G1',
      portfolioId: 101,
      status: 'OPEN',
      ticker: 'AAPL',
      legs: [{ type: 'CALL', side: 'LONG', qty: 1, status: 'OPEN' }],
      legsLive: [{ delta: 12, theta: -2, gamma: 0.2, vega: 5 }]
    },
    {
      id: 'G2',
      portfolioId: 202,
      status: 'OPEN',
      ticker: 'MSFT',
      legs: [{ type: 'PUT', side: 'LONG', qty: 1, status: 'OPEN' }],
      legsLive: [{ delta: 999, theta: 999, gamma: 999, vega: 999 }]
    },
    {
      id: 'G3',
      portfolioId: null,
      status: 'OPEN',
      ticker: 'TSLA',
      legs: [{ type: 'CALL', side: 'LONG', qty: 1, status: 'OPEN' }],
      legsLive: [{ delta: 777, theta: 777, gamma: 777, vega: 777 }]
    }
  ];
  const r = ctx.aggregateGreeks(positions, 500, '101');
  near(r.totalDelta, 12, 'B2: selected portfolio only includes G1 delta');
  near(r.totalTheta, -2, 'B2: selected portfolio only includes G1 theta');
  near(r.totalGamma, 0.2, 'B2: selected portfolio only includes G1 gamma');
  near(r.totalVega, 5, 'B2: selected portfolio only includes G1 vega');
})();

(function caseB3_legacyClosedScalarExcluded() {
  const ctx = makeCtx();
  const position = {
    id: 'H1',
    portfolioId: 303,
    status: 'CLOSED',
    ticker: 'IBM',
    delta: 999,
    theta: 999,
    gamma: 999,
    vega: 999,
    beta: 1,
    underlyingPrice: 100
  };
  const r = ctx.aggregateGreeks([position], 500, 303);
  isNull(r.totalDelta, 'B3: closed legacy scalar delta');
  isNull(r.totalTheta, 'B3: closed legacy scalar theta');
  isNull(r.totalGamma, 'B3: closed legacy scalar gamma');
  isNull(r.totalVega, 'B3: closed legacy scalar vega');
})();

(function caseC_partialRemainingQty() {
  const ctx = makeCtx();
  const r = ctx.aggregateGreeks([{ status: 'PARTIAL', legs: [{ status: 'OPEN', qty: 3, remainingQty: 1 }], legsLive: [{ delta: 0.10, theta: -0.02, gamma: 0.03, vega: 4 }] }], 400);
  near(r.totalDelta, 10, 'C: partial leg delta uses remainingQty=1');
  near(r.totalTheta, -2, 'C: partial leg theta uses remainingQty=1');
  near(r.totalGamma, 0.03, 'C: partial leg gamma uses remainingQty=1');
  near(r.totalVega, 4, 'C: partial leg vega uses remainingQty=1');
})();

(function caseD_openWithCloseMarkerNoResidual() {
  const ctx = makeCtx();
  const r = ctx.aggregateGreeks([{ status: 'OPEN', legs: [{ status: 'OPEN', qty: 1, closePrice: 1.20, closeDate: '2026-01-10' }], legsLive: [{ delta: 0.10, theta: -0.02, gamma: 0.03, vega: 4 }] }], 400);
  isNull(r.totalDelta, 'D: close-marker leg without explicit open qty delta');
  isNull(r.totalTheta, 'D: close-marker leg without explicit open qty theta');
  isNull(r.totalGamma, 'D: close-marker leg without explicit open qty gamma');
  isNull(r.totalVega, 'D: close-marker leg without explicit open qty vega');
})();

(function caseE_openWithCloseMarkerPositiveResidual() {
  const ctx = makeCtx();
  const r = ctx.aggregateGreeks([{ status: 'OPEN', legs: [{ status: 'OPEN', qty: 3, remainingQty: 1, closePrice: 1.20, closeDate: '2026-01-10' }], legsLive: [{ delta: 0.10, theta: -0.02, gamma: 0.03, vega: 4 }] }], 400);
  near(r.totalDelta, 10, 'E: close-marker leg with remainingQty=1 delta');
  near(r.totalTheta, -2, 'E: close-marker leg with remainingQty=1 theta');
  near(r.totalGamma, 0.03, 'E: close-marker leg with remainingQty=1 gamma');
  near(r.totalVega, 4, 'E: close-marker leg with remainingQty=1 vega');
})();

(function caseF_remainingQtyZero() {
  const ctx = makeCtx();
  const r = ctx.aggregateGreeks([{ status: 'OPEN', legs: [{ status: 'OPEN', qty: 3, remainingQty: 0 }], legsLive: [{ delta: 0.10, theta: -0.02, gamma: 0.03, vega: 4 }] }], 400);
  isNull(r.totalDelta, 'F: remainingQty zero delta');
  isNull(r.totalTheta, 'F: remainingQty zero theta');
  isNull(r.totalGamma, 'F: remainingQty zero gamma');
  isNull(r.totalVega, 'F: remainingQty zero vega');
})();

if (failed) {
  console.error(`portfolio-active-legs-audit: ${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`portfolio-active-legs-audit: ${passed} passed`);
