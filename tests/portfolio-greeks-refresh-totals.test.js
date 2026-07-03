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

// Extracts a brace-balanced block starting at `anchor` (an assignment like
// `window.x = function() {` or an `if (...) {`), honoring strings + comments.
// Used to load the window.* debug APIs (anonymous function expressions) so they
// can be invoked end-to-end, not just string-matched.
function extractBlock(src, anchor) {
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error('block not found: ' + anchor);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unbalanced block: ' + anchor);
}

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('  ✗ ' + msg); } }
function near(actual, expected, msg) { assert(Math.abs(actual - expected) < 1e-9, msg + ' expected ' + expected + ', got ' + actual); }
function approx(a, b, eps) { return a != null && Math.abs(a - b) <= (eps || 1e-6); }

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    isFinite, parseFloat, Number, Math, String, Date, Object,
    S: { greeksCache: {}, scanData: [], portfolioData: null },
    _spyPrice: null,
    _spyPriceStaleReason: null,
    _lastPortfolioMetricsSig: null,
    buildStreamerSymbol(ticker, expiry, strike, cp) { return [ticker, expiry, strike, cp].join('|'); },
    normalizeGreekPoints(v) { const n = parseFloat(v); return isFinite(n) && Math.abs(n) <= 1 ? n * 100 : n; },
  };
  vm.createContext(ctx);
  [
    '_portfolioTradeIsOpenForRisk',
    '_portfolioIdEq',
    '_portfolioPositionBelongsToPortfolio',
    'getOpenPortfolioRiskPositions',
    '_portfolioLegStatusForRisk',
    '_portfolioFirstFiniteField',
    '_portfolioLegExplicitOpenQty',
    '_portfolioLegHasExplicitOpenQty',
    '_portfolioLegEffectiveQty',
    '_portfolioLegHasCloseMarker',
    '_isTerminalPortfolioLeg',
    'isActivePortfolioLeg',
    '_isActivePortfolioLeg',
    'getActivePortfolioLegs',
    '_portfolioNetGreekFromActiveLegs'
  ].forEach(name => vm.runInContext(extractFn(HTML, name), ctx));
  vm.runInContext(extractFn(HTML, '_terminalPortfolioLegPlaceholder'), ctx);
  vm.runInContext(extractFn(HTML, 'aggregateGreeks'), ctx);
  vm.runInContext(extractFn(HTML, 'getWorstShortLegDelta'), ctx);
  vm.runInContext(extractFn(HTML, 'evaluateShortPremiumExitAlert'), ctx);
  // Helpers used by the UI/debug-consistency, no-accumulation and freshness tests.
  vm.runInContext(extractFn(HTML, '_resolveSpyPrice'), ctx);
  vm.runInContext(extractFn(HTML, '_scanDataField'), ctx);
  vm.runInContext(extractFn(HTML, 'computeRowBetaWeightedDelta'), ctx);
  vm.runInContext(extractFn(HTML, '_portfolioRiskDebugEnabled'), ctx);
  vm.runInContext(extractFn(HTML, 'computePortfolioRiskMetrics'), ctx);
  vm.runInContext(extractFn(HTML, '_portfolioTotalsSnapshot'), ctx);
  vm.runInContext(extractFn(HTML, '_aggregateBetaWtdMissingReason'), ctx);
  vm.runInContext(extractFn(HTML, '_deltaThetaRatioMissingReason'), ctx);
  vm.runInContext(extractFn(HTML, '_portfolioGreeksFreshness'), ctx);
  vm.runInContext(extractFn(HTML, '_portfolioPriceFreshness'), ctx);
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
  assert(HTML.includes('if (!isActivePortfolioLeg(leg, pos)) return;') && HTML.includes('var sym = String(getPreferredOptionDxlinkSymbol'), 'option symbol fanout filters terminal legs');
  assert(HTML.includes('if (!isActivePortfolioLeg(leg, pos)) return;') && HTML.includes('var legType = String'), 'backend option symbols filter terminal legs');
})();

// ── H. Repeated aggregation never accumulates; legsLive is never duplicated ───
(function repeatedAggregationDoesNotAccumulate() {
  const ctx = makeCtx();
  const positions = [{
    ticker: 'AAPL', beta: 1.2, underlyingPrice: 200, delta: 70, theta: 6, gamma: -0.03, vega: -1,
    legs: [
      { type: 'CALL', side: 'LONG',  qty: 1, entryPrice: 2 },
      { type: 'PUT',  side: 'SHORT', qty: 2, entryPrice: 1 },
    ],
    legsLive: [
      { delta: 0.30, theta: -0.04, gamma: 0.01, vega: 3 },
      { delta: -0.20, theta: -0.05, gamma: 0.02, vega: 2 },
    ],
  }];
  const r1 = ctx.aggregateGreeks(positions, 500);
  const r2 = ctx.aggregateGreeks(positions, 500);
  const r3 = ctx.aggregateGreeks(positions, 500);
  ['totalDelta','totalTheta','totalGamma','totalVega','vegaCall','vegaPut','avgBeta','betaWeightedDelta','bdRatio']
    .forEach(k => assert(r1[k] === r2[k] && r2[k] === r3[k],
      'H: ' + k + ' stable across repeated aggregation (no accumulation), got ' + r1[k] + '/' + r2[k] + '/' + r3[k]));
  // Sanity: the headline metrics are actually numeric (not all-null no-ops).
  assert(r1.totalDelta !== null && r1.betaWeightedDelta !== null && r1.bdRatio !== null,
    'H: headline metrics numeric so the stability check is meaningful');
  // aggregation must not mutate the inputs (legsLive stays index-aligned, length 2).
  assert(positions[0].legsLive.length === 2 && positions[0].legs.length === 2,
    'H: aggregation does not duplicate or mutate legs/legsLive');
})();

// ── I. UI path (computePortfolioRiskMetrics) == debug path (aggregateGreeks /
//      _portfolioTotalsSnapshot) on a consistent post-refresh portfolio ─────────
(function uiAndDebugAgreeAfterRefresh() {
  const ctx = makeCtx();
  // pos.delta / pos.theta are the NET values refreshPositionsLive persists from the
  // same legsLive the aggregate re-derives — so both paths must produce the same βΔ.
  const positions = [
    { ticker: 'AAPL', beta: 1.2, underlyingPrice: 200, delta: 70, theta: 6,
      legs: [
        { type: 'CALL', side: 'LONG',  qty: 1, entryPrice: 2 },
        { type: 'PUT',  side: 'SHORT', qty: 2, entryPrice: 1 },
      ],
      legsLive: [ { delta: 0.30, theta: -0.04, gamma: 0.01, vega: 3 }, { delta: -0.20, theta: -0.05, gamma: 0.02, vega: 2 } ] },
    { ticker: 'MSFT', beta: 0.9, underlyingPrice: 400, delta: 40, theta: -3,
      legs: [ { type: 'CALL', side: 'LONG', qty: 1, entryPrice: 4 } ],
      legsLive: [ { delta: 0.40, theta: -0.03, gamma: 0.01, vega: 5 } ] },
  ];
  const debugTotals = ctx._portfolioTotalsSnapshot(positions, 500);  // === apexDebugPortfolioGreeksRefresh().currentTotals input
  const agg         = ctx.aggregateGreeks(positions, 500);
  const ui          = ctx.computePortfolioRiskMetrics(positions, { spyPrice: 500 });
  // _portfolioTotalsSnapshot is a thin wrapper over aggregateGreeks → identical.
  ['totalDelta','totalTheta','totalGamma','totalVega','betaWeightedDelta','bdRatio'].forEach(k =>
    assert(debugTotals[k] === agg[k], 'I: _portfolioTotalsSnapshot mirrors aggregateGreeks for ' + k));
  // UI βΔ total (computePortfolioRiskMetrics) equals the debug aggregate βΔ.
  // AAPL 70×1.2×(200/500)=33.6 ; MSFT 40×0.9×(400/500)=28.8 ; total 62.4
  near(ui.totalBetaWeightedDelta, 62.4, 'I: UI βΔ total = 62.4');
  near(agg.betaWeightedDelta, 62.4, 'I: debug βΔ total = 62.4');
  assert(Math.abs(ui.totalBetaWeightedDelta - agg.betaWeightedDelta) < 1e-9,
    'I: UI βΔ === debug βΔ, got ' + ui.totalBetaWeightedDelta + ' vs ' + agg.betaWeightedDelta);
  // Delta/Theta ratio agrees between the UI calculator and the aggregate. theta 6-3=3 → 62.4/3=20.8
  near(ui.deltaThetaRatio, 20.8, 'I: UI ratio = 20.8');
  near(agg.bdRatio, 20.8, 'I: debug ratio = 20.8');
  // Per-row βΔ (the visible column) sums to the same total.
  const rowSum = positions.reduce((acc, p) => acc + (ctx.computeRowBetaWeightedDelta(p, ui.spyPrice).betaWeightedDelta || 0), 0);
  assert(Math.abs(rowSum - ui.totalBetaWeightedDelta) < 1e-9, 'I: Σ row βΔ = UI βΔ total, got ' + rowSum);
})();

// ── J. Market closed / stale greeks marked but totals still computed ──────────
(function marketClosedStaleGreeksMarkedTotalsStillComputed() {
  const ctx = makeCtx();
  // Backend reports greeks stale and stale-expected (market closed). The freshness
  // block must label it clearly and NOT present it as a live update.
  const gf = ctx._portfolioGreeksFreshness(
    { marketSessionStatus: 'closed', greeksStaleExpected: true, staleGreeksCount: 2, greeksResolved: 0, quoteResolved: 2 },
    'open',  // local fallback — backend status is authoritative
    { sources: { backend_portfolio_refresh: 2 }, lastUpdatedAt: '2026-06-11T00:00:00Z' }
  );
  assert(gf.marketSessionStatus === 'closed', 'J: marketSessionStatus closed (backend authoritative)');
  assert(gf.greeksStale === true, 'J: greeksStale true when backend reports stale greeks');
  assert(gf.greeksStaleExpected === true, 'J: greeksStaleExpected true so stale is not mistaken for live');
  assert(gf.greeksResolved === 0 && gf.quoteResolved === 2, 'J: resolved counts surfaced');
  assert(gf.source === 'backend_portfolio_refresh', 'J: dominant greeks source surfaced');
  // Totals are STILL computed from the best-available (stale) per-leg greeks —
  // freshness is a label, it must never blank the numbers.
  const positions = [{
    ticker: 'AAPL', beta: 1.1, underlyingPrice: 180, delta: 40, theta: -5,
    legs: [{ type: 'CALL', side: 'LONG', qty: 1, entryPrice: 3 }],
    legsLive: [{ delta: 0.40, theta: -0.05, gamma: 0.01, vega: 4 }],
  }];
  const r = ctx.aggregateGreeks(positions, 500);
  near(r.totalDelta, 40, 'J: totals computed from best-available stale greeks (delta)');
  assert(r.betaWeightedDelta !== null, 'J: βΔ still computed even when greeks are stale');
  // No backend option diag at all (DXLink-only path) → still a valid block.
  const gfNull = ctx._portfolioGreeksFreshness(null, 'open', { sources: {}, lastUpdatedAt: 't' });
  assert(gfNull.marketSessionStatus === 'open' && gfNull.greeksStale === false && gfNull.greeksStaleExpected === false,
    'J: missing option diag degrades gracefully to session fallback');
})();

// ── K. priceFreshness separates a live SPY from a stale (kept-previous) underlying ─
(function priceFreshnessSeparatesLiveSpyFromStaleUnderlying() {
  const ctx = makeCtx();
  const now = Date.parse('2026-06-11T00:05:00Z');
  const pf = ctx._portfolioPriceFreshness({ resolvedPricesBySymbol: {
    SPY:  { price: 500, source: 'TASTYTRADE_QUOTE_BATCH', updatedAt: '2026-06-11T00:05:00Z', isLive: true, attempts: [{}] },
    AAPL: { price: 200, source: 'CACHE_PREVIOUS_PRICE', updatedAt: '2026-06-11T00:00:00Z', isLive: false, staleReason: 'CACHE_PREVIOUS_PRICE', attempts: [{}, {}] },
  } }, { refreshStartedAt: 'a', refreshCompletedAt: 'b' }, now);
  assert(pf.spy.isLive === true && pf.spy.ageMs === 0, 'K: live SPY price marked live, age 0');
  assert(pf.underlyings.AAPL.isLive === false, 'K: stale underlying marked not-live');
  assert(pf.underlyings.AAPL.staleReason === 'CACHE_PREVIOUS_PRICE', 'K: stale reason surfaced');
  assert(pf.underlyings.AAPL.ageMs === 300000, 'K: stale underlying age grows (5min), got ' + pf.underlyings.AAPL.ageMs);
  assert(pf.symbols.join(',') === 'AAPL', 'K: SPY excluded from position underlyings list');
  assert(pf.spy.price === 500 && pf.underlyings.AAPL.price === 200, 'K: SPY separated from underlyings, prices preserved');
  assert(pf.refreshStartedAt === 'a' && pf.refreshCompletedAt === 'b', 'K: refresh window timestamps carried through');
})();

// ── L. New diagnostic surface + console APIs are wired ────────────────────────
(function newDiagnosticSurfaceWired() {
  assert(HTML.includes('window.apexDebugPortfolioPrices'), 'L: window.apexDebugPortfolioPrices console API exists');
  assert(HTML.includes('function _portfolioGreeksFreshness'), 'L: _portfolioGreeksFreshness helper exists');
  assert(HTML.includes('function _portfolioPriceFreshness'), 'L: _portfolioPriceFreshness helper exists');
  // Rich fields assigned by refreshPositionsLive after the post-refresh recompute.
  ['updatedGreeksCount','unavailableGreeksCount','betaBySymbol','resolvedPricesBySymbol','spyPrice',
   'lastRefreshCompletedAt','staleSnapshotDetected','reasonIfMissing'].forEach(f =>
    assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.' + f + ' ='), 'L: greeks diag assigns ' + f));
  assert(HTML.includes('lastRefreshStartedAt: new Date().toISOString()'), 'L: lastRefreshStartedAt captured at refresh start');
  assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.greeksFreshness = _portfolioGreeksFreshness('), 'L: greeksFreshness wired into diag');
  assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.priceFreshness = _portfolioPriceFreshness('), 'L: priceFreshness wired into diag');
  // greeksFreshness contract keys present in the helper return shape.
  const gfSrc = extractFn(HTML, '_portfolioGreeksFreshness');
  ['source','marketSessionStatus','greeksStale','greeksStaleExpected','quoteResolved','greeksResolved','lastUpdatedAt']
    .forEach(k => assert(gfSrc.includes(k + ':'), 'L: greeksFreshness returns ' + k));
  // priceFreshness contract keys present in the helper return shape.
  const pfSrc = extractFn(HTML, '_portfolioPriceFreshness');
  ['refreshStartedAt','refreshCompletedAt','symbols','spy','underlyings','ageMs','staleReason','attempts']
    .forEach(k => assert(pfSrc.includes(k), 'L: priceFreshness returns ' + k));
  // apexDebugPortfolioGreeksRefresh recomputes live missing-reasons against currentTotals.
  assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.reasonIfMissing = {'), 'L: reasonIfMissing computed in debug API + refresh');
})();

// ── M. window.apexDebugPortfolioGreeksRefresh() / apexDebugPortfolioPrices()
//      invoked end-to-end: live currentTotals, reasons, and price freshness ─────
(function debugConsoleApisReturnLiveStateAndShape() {
  const ctx = makeCtx();
  // Wire the module-level state the window debug APIs read at call time.
  ctx.window = {};
  ctx._activePanelPortfolioId = 'p1';
  ctx._spyPrice = 500;
  ctx._spyPriceStaleReason = null;
  ctx._apexPortfolioGreeksRefreshDiag = { sources: { backend_portfolio_refresh: 1 }, lastRefreshStartedAt: '2026-06-11T00:00:00Z', lastRefreshCompletedAt: '2026-06-11T00:00:01Z' };
  ctx._apexPortfolioBetaDiag = { appliedToPositions: [], betaBySymbol: { AAPL: 1.2 } };
  ctx._apexPortfolioPriceRefreshDiag = { resolvedPricesBySymbol: {
    SPY:  { price: 500, source: 'TASTYTRADE_QUOTE_BATCH', updatedAt: '2026-06-11T00:00:00Z', isLive: true, attempts: [] },
    AAPL: { price: 200, source: 'CACHE_PREVIOUS_PRICE', updatedAt: '2026-06-11T00:00:00Z', isLive: false, staleReason: 'CACHE_PREVIOUS_PRICE', attempts: [] },
  } };
  // A consistent, fully-populated position so currentTotals are numeric.
  ctx.positionManager = { getByPortfolio() { return [{
    ticker: 'AAPL', portfolioId: 'p1', beta: 1.2, underlyingPrice: 200, delta: 50, theta: -10,
    legs: [{ type: 'CALL', side: 'LONG', qty: 1 }],
    legsLive: [{ delta: 0.50, theta: -0.10, gamma: 0.01, vega: 3 }],
  }]; } };
  // Load the two window debug APIs as anonymous function expressions and run them.
  vm.runInContext(extractBlock(HTML, 'window.apexDebugPortfolioGreeksRefresh = function()') + ';', ctx);
  vm.runInContext(extractBlock(HTML, 'window.apexDebugPortfolioPrices = function()') + ';', ctx);

  const g = ctx.window.apexDebugPortfolioGreeksRefresh();
  // currentTotals recomputed from the fresh store; βΔ = 50×1.2×(200/500) = 24 ; ratio = 24/10 = 2.4
  assert(approx(g.currentTotals.betaWeightedDelta, 24), 'M: debug currentTotals βΔ = 24, got ' + (g.currentTotals && g.currentTotals.betaWeightedDelta));
  assert(approx(g.betaWeightedDelta, 24), 'M: debug API surfaces betaWeightedDelta = 24');
  assert(approx(g.deltaThetaRatio, 2.4), 'M: debug API surfaces deltaThetaRatio = 2.4, got ' + g.deltaThetaRatio);
  assert(g.reasonIfMissing && g.reasonIfMissing.betaWeightedDelta === null && g.reasonIfMissing.deltaThetaRatio === null && g.reasonIfMissing.spyPrice === null,
    'M: reasonIfMissing all null when every metric is computable');

  // Missing SPY → βΔ + ratio null with a reason, computed live by the debug API.
  // The per-position reason is sourced from the beta-refresh diag rows (exactly as
  // refreshPortfolioBetas records them), so the aggregate reason cascades correctly.
  ctx._spyPrice = null;
  ctx._spyPriceStaleReason = 'spy_price_missing';
  ctx._apexPortfolioBetaDiag.appliedToPositions = [{ betaWeightedDelta: null, betaWeightedDeltaMissingReason: 'spy_price_missing' }];
  const g2 = ctx.window.apexDebugPortfolioGreeksRefresh();
  assert(g2.currentTotals.betaWeightedDelta === null, 'M: βΔ null when SPY missing');
  assert(g2.reasonIfMissing.spyPrice === 'spy_price_missing', 'M: reasonIfMissing.spyPrice surfaced, got ' + g2.reasonIfMissing.spyPrice);
  assert(g2.reasonIfMissing.betaWeightedDelta === 'spy_price_missing', 'M: βΔ reason = spy_price_missing, got ' + g2.reasonIfMissing.betaWeightedDelta);
  assert(g2.reasonIfMissing.deltaThetaRatio === 'spy_price_missing', 'M: ratio reason cascades to spy_price_missing, got ' + g2.reasonIfMissing.deltaThetaRatio);

  const p = ctx.window.apexDebugPortfolioPrices();
  assert(p.spy.price === 500 && p.spy.isLive === true, 'M: apexDebugPortfolioPrices SPY live');
  assert(p.underlyings.AAPL.isLive === false && p.underlyings.AAPL.staleReason === 'CACHE_PREVIOUS_PRICE', 'M: apexDebugPortfolioPrices marks stale underlying');
  assert(p.priceFreshness.symbols.join(',') === 'AAPL', 'M: priceFreshness lists position underlyings (SPY separated)');
  assert(p.priceFreshness.refreshStartedAt === '2026-06-11T00:00:00Z', 'M: priceFreshness carries refresh start time');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
