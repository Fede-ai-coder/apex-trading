'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio risk + technical verbose-log gating contract test.
//
// The Portfolio/Risk/Greeks/Beta and PortfolioTechnical code paths used to print
// large per-position / per-leg / per-totals JSON dumps to console.log on every
// Portfolio refresh and render, flooding the preview console. This test pins the
// cleanup behavior:
//   • the verbose dumps are OFF by default (no console.log spam),
//   • they are gated behind two debug flags and use console.debug (never log):
//       - APEX_DEBUG_PORTFOLIO_RISK       → _portfolioRiskDebugEnabled()
//       - APEX_DEBUG_PORTFOLIO_TECHNICAL  → _portfolioTechnicalDebugEnabled()
//   • each flag is enabled only by window flag strictly === true OR
//     localStorage value exactly '1',
//   • real warnings/errors are NOT gated (still surface when the flag is off),
//   • the gated functions still return the same values regardless of the flag.
//
// Run: node tests/portfolio-risk-technical-debug.test.js
// ─────────────────────────────────────────────────────────────────────────────
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
function eq(actual, expected, msg) {
  if (actual === expected) { passed++; }
  else { failed++; console.error('  ✗ ' + msg + '\n      expected: ' + JSON.stringify(expected) + '\n      got:      ' + JSON.stringify(actual)); }
}
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); }
}

function fakeLocalStorage(map) {
  map = map || {};
  return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; } };
}

// Build a sandbox with one extracted helper function.
function ctxWithHelper(helperName, env) {
  env = env || {};
  const ctx = {
    window: env.window || {},
    localStorage: env.localStorage || null,
    console: { log() {}, debug() {}, warn() {}, error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn(HTML, helperName), ctx);
  return ctx;
}

// ── 1. _portfolioRiskDebugEnabled(): off by default, strict window/localStorage ──
console.log('\n[1] _portfolioRiskDebugEnabled() flag detection');
(function () {
  const FN = '_portfolioRiskDebugEnabled';
  const KEY = 'APEX_DEBUG_PORTFOLIO_RISK';
  eq(ctxWithHelper(FN, {})[FN](), false, 'disabled with no flags (off by default)');
  eq(ctxWithHelper(FN, { window: { [KEY]: true } })[FN](), true, 'enabled via window flag === true');
  eq(ctxWithHelper(FN, { window: { [KEY]: 'true' } })[FN](), false, 'window flag must be strictly boolean true (not "true")');
  eq(ctxWithHelper(FN, { window: { [KEY]: 1 } })[FN](), false, 'window flag must be strictly boolean true (not 1)');
  eq(ctxWithHelper(FN, { localStorage: fakeLocalStorage({ [KEY]: '1' }) })[FN](), true, "enabled via localStorage === '1'");
  eq(ctxWithHelper(FN, { localStorage: fakeLocalStorage({ [KEY]: '0' }) })[FN](), false, "localStorage '0' does not enable");
  eq(ctxWithHelper(FN, { localStorage: fakeLocalStorage({ [KEY]: 'true' }) })[FN](), false, "localStorage 'true' does not enable");
})();

// ── 2. _portfolioTechnicalDebugEnabled(): off by default, strict window/localStorage ──
console.log('\n[2] _portfolioTechnicalDebugEnabled() flag detection');
(function () {
  const FN = '_portfolioTechnicalDebugEnabled';
  const KEY = 'APEX_DEBUG_PORTFOLIO_TECHNICAL';
  eq(ctxWithHelper(FN, {})[FN](), false, 'disabled with no flags (off by default)');
  eq(ctxWithHelper(FN, { window: { [KEY]: true } })[FN](), true, 'enabled via window flag === true');
  eq(ctxWithHelper(FN, { window: { [KEY]: 'yes' } })[FN](), false, 'window flag must be strictly boolean true');
  eq(ctxWithHelper(FN, { localStorage: fakeLocalStorage({ [KEY]: '1' }) })[FN](), true, "enabled via localStorage === '1'");
  eq(ctxWithHelper(FN, { localStorage: fakeLocalStorage({ [KEY]: '0' }) })[FN](), false, "localStorage '0' does not enable");
})();

// ── 3. Helpers are guarded with try/catch (never throw on a hostile env) ──────
console.log('\n[3] Helpers never throw, even with throwing window/localStorage');
(function () {
  ['_portfolioRiskDebugEnabled', '_portfolioTechnicalDebugEnabled'].forEach(function (FN) {
    const throwing = {
      window: new Proxy({}, { get() { throw new Error('boom'); } }),
      localStorage: { getItem() { throw new Error('boom'); } },
    };
    let result;
    let threw = false;
    try { result = ctxWithHelper(FN, throwing)[FN](); } catch (_e) { threw = true; }
    ok(!threw, FN + ' does not throw on hostile window/localStorage');
    eq(result, false, FN + ' returns false when env access throws');
  });
})();

// ── 4. Gated logs use console.debug, never console.log (static contract) ──────
// Each of these verbose dumps must be emitted via console.debug behind a flag.
// They must NOT remain as console.log (that is what floods the preview console).
console.log('\n[4] Gated verbose logs use console.debug, not console.log');
(function () {
  const RISK_TAGS = [
    '[PORTFOLIO-DIAG] renderPortfolioView reconciliation',
    '[PORTFOLIO-DIAG] portfolio card',
    '[PORTFOLIO_METRICS]',
    '[PORTFOLIO BETA REFRESH] start',
    '[PORTFOLIO BETA REFRESH] backend response',
    '[PORTFOLIO BETA REFRESH] applied',
    '[PORTFOLIO BETA REFRESH] missing',
    '[PORTFOLIO BETA REFRESH] totals before',
    '[PORTFOLIO BETA REFRESH] totals after',
    '[PORTFOLIO BETA REFRESH] completed',
    '[PORTFOLIO TOTALS RECALC] source=updatedPositionsAfterPriceAndBetaRefresh',
    '[PORTFOLIO TOTALS RECALC] after',
    '[PORTFOLIO TOTALS RECALC] completed',
    '[PORTFOLIO BETA-WTD DEBUG] row',
    '[PORTFOLIO BETA-WTD DEBUG] totals',
    '[PORTFOLIO DELTA-THETA DEBUG] inputs',
    '[PORTFOLIO GREEKS DEBUG] backend option payload',
    '[PORTFOLIO GREEKS DEBUG] normalized',
    '[PORTFOLIO GREEKS DEBUG] preserve previous',
    '[PORTFOLIO GREEKS DEBUG] unavailable reason',
    '[PORTFOLIO PRICE REFRESH] applied',
    '[PORTFOLIO GREEKS REFRESH] price freshness',
    '[PORTFOLIO GREEKS REFRESH] greeks freshness',
    '[PORTFOLIO GREEKS REFRESH] summary',
    // Per-leg Portfolio Greeks refresh logs (gated in the #277 micro-fix).
    '[PortfolioRefresh] applied stale greeks for display',
    '[PORTFOLIO GREEKS REFRESH] source',
    '[PORTFOLIO GREEKS REFRESH] leg updated',
  ];
  const TECH_TAGS = [
    '[PortfolioTechnical] partial technical state',
    '[PortfolioTechnical] traffic light unavailable: unconfirmed fields',
    '[PortfolioTechnical] alignment debug stored',
  ];
  RISK_TAGS.concat(TECH_TAGS).forEach(function (tag) {
    ok(HTML.indexOf("console.log('" + tag) === -1, 'no bare console.log for: ' + tag);
    ok(HTML.indexOf("console.debug('" + tag) !== -1, 'console.debug present for: ' + tag);
  });
})();

// ── 5. Real warnings/errors are NOT gated away ────────────────────────────────
console.log('\n[5] Real failure warnings remain on console.warn (not gated)');
(function () {
  // Beta-refresh genuine failure paths must still warn unconditionally.
  ok(HTML.indexOf("console.warn('[PORTFOLIO BETA REFRESH] fetch_failed'") !== -1,
     'beta fetch_failed still warns');
  ok(HTML.indexOf("console.warn('[PORTFOLIO BETA REFRESH] invalid beta ignored'") !== -1,
     'invalid beta still warns');
  // greeks_unavailable is a user-actionable diagnostic, intentionally not gated.
  ok(HTML.indexOf("console.log('[PORTFOLIO GREEKS REFRESH] greeks_unavailable'") !== -1,
     'greeks_unavailable still emitted (not silenced)');
  // "no greeks available for" is user-actionable (market open + no live greeks).
  ok(HTML.indexOf("console.log('[PortfolioRefresh] no greeks available for'") !== -1,
     'no greeks available still emitted (not silenced)');
  // partial-failure summary reflects a real partial failure / stale feed condition.
  ok(HTML.indexOf("console.log('[PortfolioRefresh] completed with partial failures'") !== -1,
     'completed with partial failures still emitted (not silenced)');
})();

// ── 6. computePortfolioRiskMetrics returns identical metrics with flag on/off ─
console.log('\n[6] Risk metrics payload is identical regardless of debug flag');
(function () {
  function buildMetricsCtx(env) {
    env = env || {};
    const ctx = {
      window: env.window || {},
      localStorage: env.localStorage || null,
      console: { log() {}, debug() {}, warn() {}, error() {} },
      S: {},
      _lastPortfolioMetricsSig: null,
      JSON: JSON,
    };
    vm.createContext(ctx);
    [
      '_resolveSpyPrice', '_scanDataField', '_portfolioTradeIsOpenForRisk', '_portfolioIdEq',
      '_portfolioPositionBelongsToPortfolio', 'getOpenPortfolioRiskPositions', '_portfolioLegStatusForRisk',
      '_portfolioFirstFiniteField', '_portfolioLegExplicitOpenQty', '_portfolioLegHasExplicitOpenQty',
      '_portfolioLegEffectiveQty', '_portfolioLegHasCloseMarker', '_isTerminalPortfolioLeg',
      'isActivePortfolioLeg', '_isActivePortfolioLeg', 'getActivePortfolioLegs',
      '_portfolioNetGreekFromActiveLegs', 'computeRowBetaWeightedDelta',
      '_portfolioRiskDebugEnabled', 'computePortfolioRiskMetrics',
    ].forEach(function (n) { vm.runInContext(extractFn(HTML, n), ctx); });
    return ctx;
  }
  const positions = [
    { id: 'a', portfolioId: 'p1', ticker: 'AAPL', qty: 1, beta: 1.2,
      live: { delta: 40, theta: -5, underlyingPrice: 200 } },
    { id: 'b', portfolioId: 'p1', ticker: 'MSFT', qty: 1, beta: 0.9,
      live: { delta: -10, theta: -3, underlyingPrice: 300 } },
  ];
  const opts = { spyPrice: 500, portfolioId: 'p1' };
  const off = buildMetricsCtx({}).computePortfolioRiskMetrics(positions, opts);
  const onWin = buildMetricsCtx({ window: { APEX_DEBUG_PORTFOLIO_RISK: true } }).computePortfolioRiskMetrics(positions, opts);
  const onLs = buildMetricsCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_PORTFOLIO_RISK: '1' }) }).computePortfolioRiskMetrics(positions, opts);
  eq(JSON.stringify(off), JSON.stringify(onWin), 'metrics unaffected by window debug flag');
  eq(JSON.stringify(off), JSON.stringify(onLs), 'metrics unaffected by localStorage debug flag');
})();

// ── 7. Debug flag on → [PORTFOLIO_METRICS] surfaces via console.debug only ────
console.log('\n[7] [PORTFOLIO_METRICS] logs to console.debug when flag enabled, silent when off');
(function () {
  function buildCapturingCtx(env) {
    env = env || {};
    const calls = { log: [], debug: [], warn: [], error: [] };
    const ctx = {
      window: env.window || {},
      localStorage: env.localStorage || null,
      console: {
        log() { calls.log.push(Array.from(arguments)); },
        debug() { calls.debug.push(Array.from(arguments)); },
        warn() { calls.warn.push(Array.from(arguments)); },
        error() { calls.error.push(Array.from(arguments)); },
      },
      S: {}, _lastPortfolioMetricsSig: null, JSON: JSON,
    };
    ctx._calls = calls;
    vm.createContext(ctx);
    [
      '_resolveSpyPrice', '_scanDataField', '_portfolioTradeIsOpenForRisk', '_portfolioIdEq',
      '_portfolioPositionBelongsToPortfolio', 'getOpenPortfolioRiskPositions', '_portfolioLegStatusForRisk',
      '_portfolioFirstFiniteField', '_portfolioLegExplicitOpenQty', '_portfolioLegHasExplicitOpenQty',
      '_portfolioLegEffectiveQty', '_portfolioLegHasCloseMarker', '_isTerminalPortfolioLeg',
      'isActivePortfolioLeg', '_isActivePortfolioLeg', 'getActivePortfolioLegs',
      '_portfolioNetGreekFromActiveLegs', 'computeRowBetaWeightedDelta',
      '_portfolioRiskDebugEnabled', 'computePortfolioRiskMetrics',
    ].forEach(function (n) { vm.runInContext(extractFn(HTML, n), ctx); });
    return ctx;
  }
  const positions = [
    { id: 'a', portfolioId: 'p1', ticker: 'AAPL', qty: 1, beta: 1.2,
      live: { delta: 40, theta: -5, underlyingPrice: 200 } },
  ];
  const opts = { spyPrice: 500, portfolioId: 'p1' };

  // Flag OFF → no metrics log of any kind.
  const offCtx = buildCapturingCtx({});
  offCtx.computePortfolioRiskMetrics(positions, opts);
  ok(offCtx._calls.log.filter(a => String(a[0]) === '[PORTFOLIO_METRICS]').length === 0, 'no console.log[PORTFOLIO_METRICS] when off');
  ok(offCtx._calls.debug.filter(a => String(a[0]) === '[PORTFOLIO_METRICS]').length === 0, 'no console.debug[PORTFOLIO_METRICS] when off');

  // Flag ON via window → metrics surface via console.debug, never console.log.
  const onWinCtx = buildCapturingCtx({ window: { APEX_DEBUG_PORTFOLIO_RISK: true } });
  onWinCtx.computePortfolioRiskMetrics(positions, opts);
  ok(onWinCtx._calls.debug.filter(a => String(a[0]) === '[PORTFOLIO_METRICS]').length === 1, 'console.debug[PORTFOLIO_METRICS] emitted when window flag on');
  ok(onWinCtx._calls.log.filter(a => String(a[0]) === '[PORTFOLIO_METRICS]').length === 0, 'still no console.log[PORTFOLIO_METRICS] when window flag on');

  // Flag ON via localStorage → same.
  const onLsCtx = buildCapturingCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_PORTFOLIO_RISK: '1' }) });
  onLsCtx.computePortfolioRiskMetrics(positions, opts);
  ok(onLsCtx._calls.debug.filter(a => String(a[0]) === '[PORTFOLIO_METRICS]').length === 1, 'console.debug[PORTFOLIO_METRICS] emitted when localStorage flag on');
})();

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
