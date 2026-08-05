'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — enriched quote → Unrealized P&L + technical-refresh → SQZ mapping.
//
// Follow-up to #290: the P&L helper was correct, but the runtime never fed it a mark
// for a market-closed (quoteStale=true) enriched quote, and technical-refresh squeeze
// was never mapped. This suite pins the mapping adapters + the enriched→options parser.
//
//   A. /positions/enriched leg.quote.mark → aggregated options[sym].quote.mark
//   B. AMD short put entry 3.87 + mark 7.325 → Unrealized P&L -345.50
//   C. quoteStale=true stale mark still powers P&L (_backendCacheStaleMark)
//   D. mark missing → -- (null)
//   E. option P&L uses the leg mark, never the underlying price
//   F. technical-refresh squeeze=false → OFF; =true → ACTIVE; missing → --
//   G. _squeezeToState robust across boolean / string shapes
//   H. bare backend trade (no entrySnapshot) computes P&L from enriched mark
//
// Run: node tests/portfolio-enriched-mark-mapping.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

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
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }
function near(a, b, eps, msg) { assert(a !== null && a !== undefined && Math.abs(a - b) < (eps || 0.001), msg + ' (got ' + a + ', want ' + b + ')'); }

const ctx = { console: { log() {}, warn() {}, debug() {} }, Number, Math, isFinite, parseFloat, String, Object, Array };
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, '_portfolioQuantityFieldPresent'),
  extractFn(HTML, '_portfolioStrictQuantity'),
  extractFn(HTML, '_portfolioReadQuantityField'),
  extractFn(HTML, '_portfolioResidualQuantityFields'),
  extractFn(HTML, '_portfolioGrossQuantityFields'),
  extractFn(HTML, '_portfolioResolveLegQuantity'),
  extractFn(HTML, '_portfolioLegExplicitOpenQty'),
  extractFn(HTML, '_portfolioLegHasExplicitOpenQty'),
  extractFn(HTML, '_portfolioLegEffectiveQty'),
  extractFn(HTML, '_portfolioLegStatusForRisk'),
  extractFn(HTML, '_portfolioLegCloseMarkerFields'),
  extractFn(HTML, '_portfolioLegHasCloseMarker'),
  extractFn(HTML, '_isTerminalPortfolioLeg'),
  extractFn(HTML, '_portfolioTradeIsOpenForRisk'),
  extractFn(HTML, 'isActivePortfolioLeg'),
  extractFn(HTML, '_legUnrealizedPnL'),
  extractFn(HTML, 'computePositionUnrealizedPnL'),
  extractFn(HTML, '_backendCacheStaleMark'),
  extractFn(HTML, '_squeezeToState'),
  extractFn(HTML, '_technicalTfSqueezeState'),
  extractFn(HTML, '_backendEnrichedPositionsToAggregatedOptions'),
].join('\n'), ctx);

// The exact AMD enriched leg from the runtime report.
function amdEnrichedResp() {
  return {
    positions: [{
      ticker: 'AMD',
      legs: [{
        ticker: 'AMD', side: 'SHORT', qty: 1, expiration: '2026-07-31', strike: 400,
        type: 'PUT', streamerSymbol: '.AMD260731P400',
        quote: { bidPrice: 6.85, askPrice: 7.8, mark: 7.325, lastPrice: null },
        greeksStale: true, quoteStale: true,
      }],
    }],
  };
}

// ── A. enriched leg.quote.mark → options[sym].quote.mark ─────────────────────
(function() {
  const agg = ctx._backendEnrichedPositionsToAggregatedOptions(amdEnrichedResp());
  const o = agg.options['.AMD260731P400'];
  assert(!!o, 'A: option keyed by streamerSymbol');
  near(o.quote.mark, 7.325, 0.0001, 'A: quote.mark mapped = 7.325');
  near(o.quote.bidPrice, 6.85, 0.0001, 'A: bidPrice mapped');
  near(o.quote.askPrice, 7.8, 0.0001, 'A: askPrice mapped');
  assert(o.quoteStale === true, 'A: quoteStale preserved');
  assert(o.greeksStale === true, 'A: greeksStale preserved');
  console.log('✓ A enriched leg.quote.mark → aggregated options[sym].quote.mark');
})();

// ── B/C. stale mark powers P&L → AMD -345.50 ─────────────────────────────────
(function() {
  // Simulate the cache entry as written by the (fixed) cache-write loop for a stale
  // quote: fresh mark withheld, price kept in staleMark.
  const cacheEntry = { source: 'BACKEND_PORTFOLIO_REFRESH', staleMark: 7.325, staleBid: 6.85, staleAsk: 7.8, quoteStale: true };
  near(ctx._backendCacheStaleMark(cacheEntry), 7.325, 0.0001, 'C: _backendCacheStaleMark → 7.325');

  const mark = ctx._backendCacheStaleMark(cacheEntry);
  const pos = {
    status: 'OPEN',
    legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }],
    legsLive: [{ currentPrice: mark, quoteStale: true, priceSource: 'backend_portfolio_refresh_stale' }],
  };
  near(ctx.computePositionUnrealizedPnL(pos), -345.5, 0.001, 'B: AMD short put 3.87→7.325 = -345.50');
  console.log('✓ B/C stale mark 7.325 (quoteStale=true) → Unrealized P&L -345.50');
})();

// ── C2. _backendCacheStaleMark bid/ask mid fallback + guards ─────────────────
(function() {
  near(ctx._backendCacheStaleMark({ staleBid: 6.0, staleAsk: 8.0 }), 7.0, 0.001, 'C2: stale mid fallback');
  assert(ctx._backendCacheStaleMark({}) === null, 'C2: no stale fields → null');
  assert(ctx._backendCacheStaleMark({ staleMark: 0 }) === null, 'C2: zero mark → null (not a price)');
  assert(ctx._backendCacheStaleMark(null) === null, 'C2: null entry → null');
  console.log('✓ C2 stale-mark adapter: mid fallback + zero/missing guards');
})();

// ── D. mark missing → -- ─────────────────────────────────────────────────────
(function() {
  const pos = {
    status: 'OPEN',
    legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }],
    legsLive: [{ currentPrice: null }],
  };
  assert(ctx.computePositionUnrealizedPnL(pos) === null, 'D: no mark → null (--)');
  console.log('✓ D mark missing → -- (null)');
})();

// ── E. option P&L uses the leg mark, never the underlying price ──────────────
(function() {
  const pos = {
    status: 'OPEN',
    legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }],
    legsLive: [{ currentPrice: 7.325 }],
    underlyingPrice: 250,   // must be ignored for option P&L
  };
  near(ctx.computePositionUnrealizedPnL(pos), -345.5, 0.001, 'E: uses 7.325 mark, not 250 underlying');
  console.log('✓ E option P&L uses the leg mark, never underlying');
})();

// ── F. technical-refresh squeeze → state ─────────────────────────────────────
(function() {
  assert(ctx._technicalTfSqueezeState({ squeeze: false }) === 'OFF', 'F: tech squeeze=false → OFF');
  assert(ctx._technicalTfSqueezeState({ squeeze: true }) === 'ACTIVE', 'F: tech squeeze=true → ACTIVE');
  assert(ctx._technicalTfSqueezeState({}) === null, 'F: no squeeze field → null (--)');
  assert(ctx._technicalTfSqueezeState(null) === null, 'F: null tf → null');
  assert(ctx._technicalTfSqueezeState({ inSqueeze: true }) === 'ACTIVE', 'F: inSqueeze alias');
  assert(ctx._technicalTfSqueezeState({ sqz: false }) === 'OFF', 'F: sqz alias false → OFF');
  console.log('✓ F technical-refresh squeeze: false=OFF, true=ACTIVE, missing=-- (+aliases)');
})();

// ── G. _squeezeToState robust across shapes ──────────────────────────────────
(function() {
  assert(ctx._squeezeToState(true) === 'ACTIVE', 'G: true');
  assert(ctx._squeezeToState(false) === 'OFF', 'G: false → OFF (never --)');
  assert(ctx._squeezeToState('ACTIVE') === 'ACTIVE', 'G: "ACTIVE"');
  assert(ctx._squeezeToState('ON') === 'ACTIVE', 'G: "ON"');
  assert(ctx._squeezeToState('OFF') === 'OFF', 'G: "OFF"');
  assert(ctx._squeezeToState('off') === 'OFF', 'G: case-insensitive');
  assert(ctx._squeezeToState(null) === null, 'G: null → null');
  assert(ctx._squeezeToState(undefined) === null, 'G: undefined → null');
  assert(ctx._squeezeToState('maybe') === null, 'G: unknown string → null');
  console.log('✓ G _squeezeToState robust adapter (boolean + string shapes)');
})();

// ── H. bare backend trade (no entrySnapshot) computes P&L from enriched mark ──
(function() {
  // Trade shape straight from /journal/trades — no entrySnapshot, no live yet.
  const bareTrade = {
    ticker: 'AMD',
    legs: [{ side: 'SHORT', optType: 'PUT', type: 'PUT', qty: 1, strike: 400, expiration: '2026-07-31', entryPrice: 3.87 }],
  };
  assert(bareTrade.entrySnapshot === undefined, 'H: precondition — no entrySnapshot');
  // After enriched refresh maps the stale mark into legsLive:
  const pos = { status: 'OPEN', legs: bareTrade.legs, legsLive: [{ currentPrice: 7.325, quoteStale: true }] };
  near(ctx.computePositionUnrealizedPnL(pos), -345.5, 0.001, 'H: bare trade + enriched mark → -345.50');
  console.log('✓ H bare backend trade (no entrySnapshot) computes P&L from enriched mark');
})();

// ── I. static wiring guards on the runtime mapping ───────────────────────────
(function() {
  // Cache-write loop stores a stale mark when the quote is stale.
  assert(HTML.indexOf('merged.staleMark = _sMark') !== -1, 'I: cache-write persists staleMark for a stale quote');
  // Leg loop consumes the stale mark for P&L.
  assert(HTML.indexOf('_backendCacheStaleMark(aggCacheData)') !== -1, 'I: leg loop uses stale-mark fallback');
  assert(HTML.indexOf("legLive.priceSource = 'backend_portfolio_refresh_stale'") !== -1, 'I: stale price source flagged');
  // Technical parse extracts squeeze; priceMap enrichment maps it.
  assert(HTML.indexOf('_technicalTfSqueezeState(d1)') !== -1, 'I: technical parse extracts 1D squeeze');
  assert(HTML.indexOf('_technicalTfSqueezeState(d4h)') !== -1, 'I: technical parse extracts 4H squeeze');
  assert(HTML.indexOf('priceMap[t].squeeze   = sq;') !== -1, 'I: technical-refresh squeeze mapped into priceMap');
  console.log('✓ I static wiring: stale-mark persist+consume, technical squeeze extract+map');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
