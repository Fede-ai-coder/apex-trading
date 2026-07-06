'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — missing_underlyings fallback recovery must NOT storm the backend.
//
// Regression for deploy-preview-299: when the aggregated portfolio refresh comes
// back OK but WITHOUT an underlyings map (the `missing_underlyings` reason), the
// frontend used to fan out one /market/candles/:ticker?days=300 request per
// unresolved ticker AND one /options/ivr/:ticker request per ticker. Opening
// Portfolio therefore produced a burst of per-symbol candle + IVR calls.
//
// Required behaviour (this test proves it via the pure planners that the real
// refreshPositionsLive() delegates to, plus static wiring assertions):
//   1. `missing_underlyings` does NOT produce a candle fallback fan-out.
//   2. Cached / last-known underlying prices are reused when available.
//   3. Unresolved tickers stay VISIBLE in a partial "price temporarily unavailable"
//      state instead of triggering candle fallback for every ticker.
//   4. Any fallback is tiny + bounded — zero unless the user clicked Refresh, then
//      capped — never one call per ticker.
//   5. IVR fallback is NOT launched for every ticker just because underlyings are
//      missing.
//
// Run: node tests/portfolio-missing-underlyings-fallback.test.js
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
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }

const ctx = { Math, isFinite, parseFloat, Object, Array, String, Number };
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, '_portfolioAggregatedMissingUnderlyings'),
  extractFn(HTML, '_planPortfolioUnderlyingFallback'),
  extractFn(HTML, '_portfolioIvrFallbackBudget'),
].join('\n'), ctx);

const CAP = 3;
// Exact deploy-preview-299 scenario: aggregated OK, no underlyings map, five
// position tickers with no live price resolved by any prior path.
const AGG_MISSING = { ok: true };                       // ok true, no `underlyings` → missing_underlyings
const OBSERVED    = ['FTNT', 'DELL', 'CVS', 'TEAM', 'AMD'];

// ── 1. missing_underlyings is detected only in the intended state ────────────
(function() {
  assert(ctx._portfolioAggregatedMissingUnderlyings(AGG_MISSING) === true,
    '1: ok:true with no underlyings map → missing_underlyings');
  assert(ctx._portfolioAggregatedMissingUnderlyings({ ok: true, underlyings: { AMD: {} } }) === false,
    '1: underlyings present → NOT missing_underlyings (healthy path)');
  assert(ctx._portfolioAggregatedMissingUnderlyings({ ok: false }) === false,
    '1: failed aggregated response is NOT missing_underlyings (legacy fallback preserved)');
  assert(ctx._portfolioAggregatedMissingUnderlyings(null) === false,
    '1: null aggregated response (offload disabled) → legacy fallback preserved');
  console.log('✓ 1 missing_underlyings detected only when aggregated OK but underlyings map absent');
})();

// ── 2. NO candle fan-out on an automatic refresh (the core bug) ──────────────
(function() {
  const suppress = ctx._portfolioAggregatedMissingUnderlyings(AGG_MISSING);
  // Auto refresh (userInitiated:false), no cached prices at all.
  const plan = ctx._planPortfolioUnderlyingFallback(OBSERVED, {}, suppress, false, CAP);
  assert(plan.candle.length === 0,
    '2: ZERO per-symbol candle fallbacks on missing_underlyings auto refresh (no /market/candles fan-out)');
  assert(plan.deferred.length === OBSERVED.length,
    '2: every unresolved ticker deferred to a partial state (stays visible)');
  OBSERVED.forEach(function(t) {
    assert(plan.deferred.indexOf(t) !== -1, '2: ' + t + ' remains visible (deferred), not candle-fetched');
  });
  console.log('✓ 2 missing_underlyings does NOT fan out /market/candles per ticker');
})();

// ── 3. cached / last-known underlying prices are reused first ────────────────
(function() {
  const suppress = ctx._portfolioAggregatedMissingUnderlyings(AGG_MISSING);
  const lastKnown = { FTNT: { price: 92.5 }, DELL: { price: 133.1 } };
  const plan = ctx._planPortfolioUnderlyingFallback(OBSERVED, lastKnown, suppress, false, CAP);
  assert(plan.reuse.FTNT === 92.5 && plan.reuse.DELL === 133.1,
    '3: cached/last-known prices reused for FTNT + DELL');
  assert(Object.keys(plan.reuse).length === 2, '3: only the cached tickers are reused');
  assert(plan.candle.length === 0, '3: reuse never triggers a candle fetch');
  // Tickers without a cached price remain visible in the partial state.
  assert(plan.deferred.indexOf('FTNT') === -1 && plan.deferred.indexOf('DELL') === -1,
    '3: reused tickers are resolved, not deferred');
  ['CVS', 'TEAM', 'AMD'].forEach(function(t) {
    assert(plan.deferred.indexOf(t) !== -1, '3: uncached ' + t + ' stays visible (partial valuation)');
  });
  console.log('✓ 3 cached/last-known reused; uncached tickers stay in partial valuation state');
})();

// ── 4. any fallback is tiny + bounded, and only on a user-initiated refresh ──
(function() {
  const suppress = ctx._portfolioAggregatedMissingUnderlyings(AGG_MISSING);
  // User clicked Refresh — a tiny bounded number may candle-fetch; the rest defer.
  const plan = ctx._planPortfolioUnderlyingFallback(OBSERVED, {}, suppress, true, CAP);
  assert(plan.candle.length === CAP,
    '4: user-initiated refresh candle fallback capped at ' + CAP + ' (never per-ticker)');
  assert(plan.deferred.length === OBSERVED.length - CAP,
    '4: remaining tickers beyond the cap stay in the partial state');
  assert(plan.candle.length < OBSERVED.length, '4: bounded strictly below the whole book');
  console.log('✓ 4 candle fallback bounded to a tiny cap and only on an explicit user refresh');
})();

// ── 5. IVR fallback is NOT launched for every ticker on missing underlyings ──
(function() {
  // Auto refresh → zero IVR fan-out budget (no /options/ivr per ticker).
  assert(ctx._portfolioIvrFallbackBudget(true, false, CAP) === 0,
    '5: missing_underlyings auto refresh → IVR fan-out budget 0 (no per-ticker /options/ivr)');
  // User refresh → tiny bounded budget, never one call per ticker.
  const userBudget = ctx._portfolioIvrFallbackBudget(true, true, CAP);
  assert(userBudget === CAP && userBudget < OBSERVED.length,
    '5: user-initiated IVR fallback capped at ' + CAP + ', below the whole book');
  console.log('✓ 5 IVR fallback is not launched for every ticker just because underlyings are missing');
})();

// ── 6. healthy / non-missing path is UNCHANGED ───────────────────────────────
(function() {
  // suppress=false → every unresolved ticker remains a candle candidate, nothing
  // reused or deferred, IVR budget infinite (legacy behaviour preserved verbatim).
  const plan = ctx._planPortfolioUnderlyingFallback(OBSERVED, { FTNT: { price: 1 } }, false, false, CAP);
  assert(plan.candle.length === OBSERVED.length, '6: healthy path keeps all unresolved tickers as candle candidates');
  assert(Object.keys(plan.reuse).length === 0 && plan.deferred.length === 0, '6: healthy path never reuses/defers');
  assert(ctx._portfolioIvrFallbackBudget(false, false, CAP) === Infinity, '6: healthy path IVR budget unbounded');
  console.log('✓ 6 healthy (non-missing) path behaviour is unchanged');
})();

// ── 7. static wiring — refreshPositionsLive delegates to the planners ────────
(function() {
  const fn = extractFn(HTML, 'refreshPositionsLive');
  assert(/_portfolioAggregatedMissingUnderlyings\(aggregatedResp\)/.test(fn),
    '7: refreshPositionsLive computes aggMissingUnderlyings from the aggregated response');
  assert(/_planPortfolioUnderlyingFallback\(/.test(fn) && /var missing = _fallbackPlan\.candle\.slice\(\);/.test(fn),
    '7: candle fallback loop iterates ONLY the planned candle targets (not every unresolved ticker)');
  assert(/underlyingPriceSource = 'LAST_KNOWN'/.test(fn),
    '7: reused prices are marked LAST_KNOWN');
  assert(/underlyingPriceUnavailable = true/.test(fn),
    '7: deferred tickers flagged with a controlled partial "price temporarily unavailable" state');
  assert(/_lastKnownUnderlyingPrice\[t\] = \{ price: \+pm\.price/.test(fn),
    '7: resolved prices are remembered for reuse on a later missing_underlyings refresh');
  assert(/_portfolioIvrFallbackBudget\(aggMissingUnderlyings/.test(fn) && /_ivrFanoutBudget <= 0/.test(fn) && /ivrPartial = true/.test(fn),
    '7: IVR loop is budget-gated and leaves a partial IVR state instead of fanning out');
  console.log('✓ 7 refreshPositionsLive is wired to the bounded missing_underlyings planners');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
