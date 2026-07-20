'use strict';
// Focused regression coverage for PR #305 follow-up bounded fallback behavior.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();
function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start), depth = 0, q = null, esc = false, line = false, block = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (line) { if (c === '\n') line = false; continue; }
      if (block) { if (c === '*' && n === '/') { block = false; j++; } continue; }
      if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
      if (c === '/' && n === '/') { line = true; j++; continue; }
      if (c === '/' && n === '*') { block = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
  }
  throw new Error('function not found: ' + name);
}
let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('✗ ' + msg); } }

(function boundedTimeoutPlanner() {
  const ctx = { Math, isFinite, parseFloat, Object, Array, String, Number, Infinity, S: { lastPortfolioLiveRefreshFailure: { reason: 'timeout' } } };
  vm.createContext(ctx);
  vm.runInContext([
    'var PORTFOLIO_MISSING_UNDERLYINGS_FALLBACK_CAP = 3;',
    extractFn(HTML, '_portfolioAggregatedMissingUnderlyings'),
    extractFn(HTML, '_planPortfolioUnderlyingFallback'),
    extractFn(HTML, '_portfolioIvrFallbackBudget')
  ].join('\n'), ctx);
  const tickers = ['QQQ','CSCO','UNH','UBER','QCOM','META','MRVL','FTNT','DELL','CVS','TEAM','AMD'];
  const suppress = ctx._portfolioAggregatedMissingUnderlyings(null);
  const candlePlan = ctx._planPortfolioUnderlyingFallback(tickers, { AMD: { price: 180 } }, suppress, false, 3);
  const intervalPlan = ctx._planPortfolioUnderlyingFallback(tickers, {}, suppress, false, 3, false);
  const coldStartPlan = ctx._planPortfolioUnderlyingFallback(tickers, {}, suppress, false, 3, true);
  assert(suppress === true, 'aggregate timeout enters bounded missing-underlyings mode');
  assert(candlePlan.candle.length === 0, 'aggregate timeout auto refresh does not fan out candles');
  assert(candlePlan.reuse.AMD === 180, 'aggregate timeout reuses last-known safe price cache first');
  assert(candlePlan.deferred.length === tickers.length - 1, 'aggregate timeout defers unresolved non-critical tickers');
  assert(intervalPlan.candle.length === 0 && intervalPlan.deferred.length === tickers.length,
    'non-initial interval refresh still has zero candle fallback after aggregate timeout');
  assert(coldStartPlan.candle.length === 3 && coldStartPlan.deferred.length === tickers.length - 3,
    'initial auto refresh can use capped cold-start candle fallback after aggregate timeout');
  assert(ctx._portfolioIvrFallbackBudget(suppress, false, 3) === 0, 'aggregate timeout auto refresh has zero live IVR budget');
  ctx.S.lastPortfolioLiveRefreshFailure = { reason: 'timeout' };
  assert(ctx._portfolioAggregatedMissingUnderlyings({ ok: true, underlyings: { AMD: { price: 180 } } }) === false,
    'successful aggregate with underlyings is not suppressed by stale timeout failure');
})();

(function staticWiring() {
  const live = extractFn(HTML, 'fetchPortfolioLiveRefresh');
  const refresh = extractFn(HTML, 'refreshPositionsLive');
  assert(/payload\.includeTechnicals\s*=\s*false/.test(live), 'live-refresh keeps includeTechnicals=false');
  assert(/var liveRefreshTimeoutMs\s*=\s*8000/.test(live), 'live-refresh timeout remains fast/bounded at 8000ms');
  assert(/errName === 'TimeoutError'/.test(live) && /reason = 'timeout'/.test(live), 'TimeoutError remains classified as timeout');
  assert(/missing_underlyings fallback plan/.test(refresh) && /liveQuoteBatch/.test(refresh) && /cap: PORTFOLIO_MISSING_UNDERLYINGS_FALLBACK_CAP/.test(refresh), 'fallback plan diagnostics include liveQuoteBatch and cap');
  assert(/cold-start fallback enabled/.test(refresh) && /_allowColdStartCandleFallback/.test(refresh), 'cold-start fallback diagnostics are wired');
  assert(/IVR fallback plan/.test(refresh) && /usedCache/.test(refresh) && /requestedLive/.test(refresh) && /deferred/.test(refresh), 'IVR fallback diagnostics include usedCache/requestedLive/deferred/cap');
  assert(/portfolioRefreshInFlight[\s\S]*skipped overlapping refresh[\s\S]*return;/.test(refresh), 'overlapping refresh guard returns before fallback work');
  assert(/Portfolio valuation fallback ignored stale response/.test(refresh), 'candle fallback stale sequence guard is preserved');
  assert(/_ivrFallbackDiag\.requestedLive\+\+/.test(refresh), 'live IVR requests are counted after bounded budget/cache checks');
})();

(function technicalPreserveAndCandleStore() {
  const refresh = extractFn(HTML, 'refreshPositionsLive');
  assert(/preserving previous valid technicals/.test(refresh) && /S\.backendTechnicalByTicker/.test(refresh), 'empty/failed technical refresh preserves previous valid technicals');
  assert(/formula_parity_not_confirmed/.test(refresh) && /buildFormulaParityGate/.test(refresh), 'formula parity guard is preserved');
  assert(HTML.indexOf('BACKEND_CANDLE_STORE') !== -1, 'backend candle store chart reads remain present');
})();

console.log((failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
