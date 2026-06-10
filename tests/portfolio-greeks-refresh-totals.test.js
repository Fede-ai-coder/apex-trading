'use strict';
// Portfolio Greeks refresh regression tests for active-leg-only current totals.

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
function near(actual, expected, msg) { assert(Math.abs(actual - expected) < 1e-9, msg + ' expected ' + expected + ', got ' + actual); }

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    isFinite, parseFloat, Number, Math, String, Date,
    S: { greeksCache: {} },
    buildStreamerSymbol(ticker, expiry, strike, cp) { return [ticker, expiry, strike, cp].join('|'); },
    normalizeGreekPoints(v) { const n = parseFloat(v); return isFinite(n) && Math.abs(n) <= 1 ? n * 100 : n; },
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn(HTML, '_isTerminalPortfolioLeg'), ctx);
  vm.runInContext(extractFn(HTML, '_isActivePortfolioLeg'), ctx);
  vm.runInContext(extractFn(HTML, '_terminalPortfolioLegPlaceholder'), ctx);
  vm.runInContext(extractFn(HTML, 'aggregateGreeks'), ctx);
  vm.runInContext(extractFn(HTML, 'getWorstShortLegDelta'), ctx);
  vm.runInContext(extractFn(HTML, 'evaluateShortPremiumExitAlert'), ctx);
  return ctx;
}

(function terminalLegsExcludedFromTotalsAndBwd() {
  const ctx = makeCtx();
  const positions = [{
    ticker: 'SPY', beta: 1.2, underlyingPrice: 500,
    delta: 999, theta: 999, gamma: 999, vega: 999,
    legs: [
      { type: 'CALL', side: 'LONG', qty: 1, entryPrice: 2 },
      { type: 'PUT', side: 'SHORT', qty: 1, entryPrice: 1, status: 'CLOSED' },
    ],
    legsLive: [
      { delta: 0.20, theta: -0.03, gamma: 0.01, vega: 2 },
      { delta: -0.90, theta: -0.90, gamma: 9, vega: 90, priceSource: 'terminal_leg_placeholder' },
    ],
  }];
  const r = ctx.aggregateGreeks(positions, 400);
  near(r.totalDelta, 20, 'A: terminal legs excluded from total delta');
  near(r.totalTheta, -3, 'A: terminal legs excluded from total theta');
  near(r.totalGamma, 0.01, 'A: terminal legs excluded from total gamma');
  near(r.totalVega, 2, 'A: terminal legs excluded from total vega');
  near(r.betaWeightedDelta, 30, 'B: beta-weighted delta calculated from active leg delta only');
})();

(function legsLivePlaceholderIsIndexAligned() {
  const ctx = makeCtx();
  const legs = [
    { type: 'CALL', status: 'OPEN' },
    { type: 'PUT', status: 'EXPIRED_OTM' },
    { type: 'CALL', status: 'ASSIGNED' },
  ];
  const legsLive = legs.map(leg => ctx._isActivePortfolioLeg(leg) ? { priceSource: 'live_mid' } : ctx._terminalPortfolioLegPlaceholder(leg));
  assert(legsLive.length === legs.length, 'C: legsLive remains index-aligned with pos.legs');
  assert(legsLive[1].priceSource === 'terminal_leg_placeholder', 'C: expired leg receives terminal placeholder');
  assert(legsLive[2].priceSource === 'terminal_leg_placeholder', 'C: assigned leg receives terminal placeholder');
})();

(function invalidMarkGuardIsPresent() {
  assert(HTML.includes('var validMark = isFinite(parseFloat(mark));'), 'D: P&L guard checks mark is finite');
  assert(HTML.includes('if (anyData) update.unrealizedPnL = totalPnL;'), 'D: unrealizedPnL updated only when valid price data exists');
  assert(!HTML.includes('unrealizedPnL: totalPnL, legsLive'), 'D: update object no longer blindly overwrites unrealizedPnL');
})();

(function helpersFilterTerminalLegs() {
  const ctx = makeCtx();
  const pos = {
    ticker: 'SPY', strategy: 'SHORT_PUT_SPREAD',
    legs: [
      { type: 'PUT', side: 'SHORT', qty: 1, entryPrice: 2, expiry: '2026-01-16', strike: 450 },
      { type: 'CALL', side: 'SHORT', qty: 1, entryPrice: 9, expiry: '2026-01-16', strike: 600, status: 'CLOSED' },
    ],
    legsLive: [
      { delta: 0.12, currentPrice: 0.8 },
      { delta: 0.95, currentPrice: 8 },
    ],
  };
  assert(ctx.getWorstShortLegDelta(pos) === 12, 'E: getWorstShortLegDelta ignores terminal short leg');
  const alert = ctx.evaluateShortPremiumExitAlert(pos);
  assert(alert.entryCredit === 200, 'F: exit alert entry credit excludes terminal legs');
  assert(alert.currentValue === 80, 'F: exit alert current value excludes terminal legs');
})();

(function diagnosticsAndStaticRefreshGuardsExist() {
  assert(HTML.includes('var _apexPortfolioGreeksRefreshDiag'), 'G: diagnostics object exists');
  assert(HTML.includes('window.apexDebugPortfolioGreeksRefresh'), 'G: debug API exists');
  assert(HTML.includes('window.apexDebugPortfolioGreksRefresh'), 'G: typo-compatible debug alias exists');
  assert(HTML.includes('function _portfolioTotalsSnapshot'), 'G: totals snapshot helper exists');
  ['start','source','leg updated','greeks_unavailable','summary'].forEach(label => {
    assert(HTML.includes('[PORTFOLIO GREEKS REFRESH] ' + label), 'G: greeks refresh log present: ' + label);
  });
  ['before','after','completed'].forEach(label => {
    assert(HTML.includes('[PORTFOLIO TOTALS RECALC] ' + label), 'G: totals recalc log present: ' + label);
  });
  assert(HTML.includes('if (!_isActivePortfolioLeg(leg)) return;\n      var sym = String(getPreferredOptionDxlinkSymbol'), 'option symbol fanout filters terminal legs');
  assert(HTML.includes('if (!_isActivePortfolioLeg(leg)) return;\n      var legType = String'), 'backend option symbols filter terminal legs');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
