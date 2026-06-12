'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Greeks refresh totals — patch #133 A–G regression coverage.
//
// Run: node tests/portfolio-greeks-refresh-totals.test.js
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

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    isFinite, parseFloat, Math, String, Date,
    Object, JSON,
    normalizeGreekPoints(v) { return v; },
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, '_portfolioTradeIsOpenForRisk'),
    extractFn(HTML, '_portfolioIdEq'),
    extractFn(HTML, '_portfolioPositionBelongsToPortfolio'),
    extractFn(HTML, 'getOpenPortfolioRiskPositions'),
    extractFn(HTML, 'aggregateGreeks'),
  ].join('\n'), ctx);
  return ctx;
}

// A. aggregateGreeks excludes terminal legs from totals and vega side buckets.
(function caseAActiveTotalsOnly() {
  const ctx = makeCtx();
  const r = ctx.aggregateGreeks([
    {
      ticker: 'SPY', beta: 1, underlyingPrice: 500,
      // Stale position totals intentionally include terminal-leg exposure; active
      // index-aligned legsLive must override them for open Portfolio risk totals.
      delta: 999, theta: 999, gamma: 999, vega: 999,
      legs: [
        { type: 'CALL', side: 'LONG',  qty: 50, status: 'CLOSED', entryPrice: 1 },
        { type: 'PUT',  side: 'SHORT', qty: 2,  status: 'OPEN',   entryPrice: 3 },
      ],
      // Index-aligned with pos.legs: index 0 is a terminal placeholder, index 1 is the open PUT.
      legsLive: [
        { currentPrice: null, delta: 100, theta: 100, gamma: 100, vega: 100, priceSource: 'terminal_leg_placeholder' },
        { currentPrice: 1, delta: 7, theta: -2, gamma: 0.3, vega: 4 },
      ],
    },
  ], 500);

  assert(r.totalDelta === -14, 'A: totalDelta excludes terminal legs and uses active sign×qty');
  assert(r.totalTheta === 4, 'A: totalTheta excludes terminal legs and uses active sign×qty');
  assert(Math.abs(r.totalGamma + 0.6) < 1e-9, 'A: totalGamma excludes terminal legs and uses active sign×qty');
  assert(r.totalVega === -8, 'A: totalVega excludes terminal legs and uses active sign×qty');
  assert(r.vegaCall === null, 'A: closed CALL excluded from vegaCall');
  assert(r.vegaPut === -8, 'A: open PUT contributes to vegaPut');
  assert(r.putShortVegaAbs === 8, 'A: short-put absolute vega uses only active legs');
  console.log('✓ A active aggregate totals exclude terminal legs');
})();

// B. β-weighted delta and average beta use active-leg delta/notional.
(function caseBBetaWeightedTotalsOnly() {
  const ctx = makeCtx();
  const r = ctx.aggregateGreeks([
    {
      ticker: 'SPY', beta: 1.5, underlyingPrice: 600, delta: 999, theta: null, gamma: null, vega: null,
      legs: [
        { type: 'CALL', side: 'LONG', qty: 100, status: 'CLOSED', entryPrice: 10 },
        { type: 'PUT', side: 'LONG', qty: 2, status: 'OPEN', entryPrice: 5 },
      ],
      legsLive: [
        { delta: 100, theta: null, gamma: null, vega: null, priceSource: 'terminal_leg_placeholder' },
        { delta: 4, theta: null, gamma: null, vega: null },
      ],
    },
  ], 500);
  assert(r.totalDelta === 8, 'B: active delta = 4 × 2');
  assert(Math.abs(r.betaWeightedDelta - 14.4) < 1e-9, 'B: βΔ = 8 × 1.5 × (600/500), got ' + r.betaWeightedDelta);
  assert(r.avgBeta === 1.5, 'B: average beta denominator uses active notional only');
  console.log('✓ B βΔ and avg beta use active legs only');
})();

const refreshSrc = extractFn(HTML, 'refreshPositionsLive');
const worstSrc = extractFn(HTML, 'getWorstShortLegDelta');
const exitSrc = extractFn(HTML, 'evaluateShortPremiumExitAlert');

// C. refreshPositionsLive keeps legsLive index-aligned with pos.legs via terminal placeholders.
(function caseCLegsLiveAlignment() {
  assert(/allLegs\.forEach\(function\(leg\)/.test(refreshSrc), 'C: refresh iterates all original legs');
  assert(/priceSource:'terminal_leg_placeholder'/.test(refreshSrc), 'C: terminal legs push placeholder legsLive entries');
  assert(/allLegs\.forEach\(function\(leg, idx\)/.test(refreshSrc), 'C: Greek aggregation reuses original leg indexes');
  assert(/legsLive is index-aligned with pos\.legs/.test(refreshSrc), 'C: source documents index-aligned legsLive contract');
  console.log('✓ C legsLive index alignment is explicit and guarded');
})();

// D. P&L guard: null/non-finite mark cannot create phantom P&L or overwrite unrealizedPnL.
(function caseDPnlGuard() {
  assert(/var hasValidMark = isFinite\(parseFloat\(mark\)\);/.test(refreshSrc), 'D: validates option mark before P&L');
  assert(/if \(!hasValidMark\) \{[\s\S]*pnlGuardSkipped\+\+/.test(refreshSrc), 'D: missing mark hits P&L guard diagnostics');
  assert(/var update = \{ legsLive: legsLive \};\s*if \(anyPriceData\) update\.unrealizedPnL = totalPnL;/.test(refreshSrc), 'D: unrealizedPnL only updates when finite price data exists');
  assert(/!underlyingInfo \|\| !isFinite\(parseFloat\(underlyingInfo\.price\)\)/.test(refreshSrc), 'D: equity P&L also requires finite underlying price');
  console.log('✓ D finite-mark P&L guard is present');
})();

// E/F. Short-premium helpers ignore terminal legs while retaining index-aligned legsLive lookup.
(function caseEFActiveFiltersInShortHelpers() {
  assert(/!legIsOpen\(leg\)\) return;[\s\S]*if \(leg\.side !== 'SHORT'\)/.test(worstSrc), 'E: getWorstShortLegDelta filters terminal legs');
  assert(/!legIsOpen\(leg\)\) return;[\s\S]*var ep = parseFloat\(leg\.entryPrice\)/.test(exitSrc), 'F: evaluateShortPremiumExitAlert filters entry credit legs');
  assert(/!legIsOpen\(leg\)\) return;[\s\S]*var ll = legsLive\[i\]/.test(exitSrc), 'F: evaluateShortPremiumExitAlert filters current-value legs but keeps original index');
  console.log('✓ E/F short-premium helpers filter active legs only');
})();

// G. Diagnostics/debug API and required log families are present.
(function caseGDiagnosticsAndLogs() {
  assert(/var _apexPortfolioGreeksRefreshDiag = \{/.test(HTML), 'G: _apexPortfolioGreeksRefreshDiag exists');
  assert(/function apexDebugPortfolioGreeksRefresh\(\)/.test(HTML), 'G: apexDebugPortfolioGreeksRefresh() exists');
  assert(/window\.apexDebugPortfolioGreeksRefresh = apexDebugPortfolioGreeksRefresh/.test(HTML), 'G: window debug function exported');
  assert(/window\.apexDebugPortfolioGreksRefresh = apexDebugPortfolioGreeksRefresh/.test(HTML), 'G: misspelled alias exported');
  assert(/function _portfolioTotalsSnapshot\(portfolioId, positions, spyPrice\)/.test(HTML), 'G: _portfolioTotalsSnapshot exists');
  ['start', 'source', 'leg updated', 'greeks_unavailable', 'summary'].forEach(kind => {
    assert(HTML.includes("[PORTFOLIO GREEKS REFRESH] ' + kind") || HTML.includes("_portfolioGreeksRefreshLog('" + kind + "'"), 'G: greeks refresh log includes ' + kind);
  });
  assert(/\[PORTFOLIO TOTALS RECALC\] before/.test(HTML), 'G: totals recalc before log exists');
  assert(/\[PORTFOLIO TOTALS RECALC\] after/.test(HTML), 'G: totals recalc after log exists');
  assert(/\[PORTFOLIO TOTALS RECALC\] completed/.test(HTML), 'G: totals recalc completed log exists');
  assert(/source: 'currentLiveGreeks'/.test(HTML), 'G: totals recalc source=currentLiveGreeks exists');
  console.log('✓ G diagnostics, debug API, and totals logs are present');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed')
                            : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
