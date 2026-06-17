'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO GREEKS — stale / last-known display resolution (PR #273 follow-up).
//
// Symptom: backend enriched the AAPL leg (.AAPL260710P155, unresolved=0) but the
// Portfolio showed blank Greeks with [PORTFOLIO GREEKS REFRESH] greeks_unavailable.
// Root cause: when the market is closed the backend returns greeks marked
// greeksStale=true; the cache-merge intentionally never wrote those values, so on a
// fresh browser (no prior cache) the numeric greeks were discarded and the leg
// blanked.
//
// _resolveLegGreeksDisplay() is the testable core of the fix: a non-destructive
// DISPLAY fallback that fills null greeks from stale/last-known sources, flags the
// leg stale, and returns an explicit reason. This test pins:
//   1. fresh greeks always win (no fallback, reason=null, untouched);
//   2. backend STALE greeks are displayed (filled + greeksStale) -> not blank;
//   3. stale cache snapshot (merged.staleGreeks) is displayed when no backend live;
//   4. never overwrites an existing finite value (no frontend_overwrite_with_null);
//   5. explicit reasons: stale_market_closed_preserved_previous /
//      stale_market_closed_no_prior_cache / backend_missing_greeks /
//      normalization_missing_alias.
//   6. _backendEnrichedPositionsToAggregatedOptions carries greek values even when
//      the leg is greeksStale (so the stale snapshot has something to preserve).
//
// Run: node tests/portfolio-greeks-stale-display.test.js
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

const ctx = { console: { log() {}, warn() {} }, JSON, Array, Object, String, isFinite, parseFloat, window: {} };
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, '_backendEnrichedPositionsToAggregatedOptions'),
  extractFn(HTML, '_resolveLegGreeksDisplay'),
].join('\n'), ctx);
const resolve = (legLive, opts) => vm.runInContext('_resolveLegGreeksDisplay', ctx)(legLive, opts);
const enrich  = (resp) => vm.runInContext('_backendEnrichedPositionsToAggregatedOptions', ctx)(resp);

// ── 1. fresh greeks always win — no fallback, untouched ──────────────────────
(function() {
  const leg = { delta: -0.42, theta: 0.05, gamma: null, vega: 0.11, volatility: 0.3 };
  const r = resolve(leg, { backendRawGreeks: { delta: -0.99 }, backendGreeksStale: true });
  assert(r.hasFresh === true && r.applied === false && r.reason === null, '1: fresh greeks short-circuit');
  assert(leg.delta === -0.42 && leg.greeksStale === undefined, '1: fresh leg left untouched (no stale flag)');
  console.log('✓ 1 fresh greeks win');
})();

// ── 2. backend STALE greeks displayed (market closed, fresh browser) ─────────
(function() {
  const leg = { delta: null, theta: null, gamma: null, vega: null, volatility: null };
  const r = resolve(leg, {
    backendRawGreeks: { delta: -0.41, theta: 0.04, gamma: 0.02, vega: 0.10, volatility: 0.28 },
    backendGreeksStale: true, backendHadOptionPayload: true, marketClosed: true
  });
  assert(r.applied === true && r.stale === true, '2: stale backend greeks applied');
  assert(r.reason === 'stale_market_closed_preserved_previous', '2: reason = preserved_previous');
  assert(leg.delta === -0.41 && leg.theta === 0.04 && leg.vega === 0.10, '2: leg filled with stale values');
  assert(leg.greeksStale === true && leg.greeksStaleReason === 'market_closed_stale_greeks', '2: leg flagged stale');
  console.log('✓ 2 backend stale greeks displayed, not blank');
})();

// ── 3. stale cache snapshot used when no backend live greeks ─────────────────
(function() {
  const leg = { delta: null, theta: null, gamma: null, vega: null, volatility: null };
  const r = resolve(leg, {
    staleCacheGreeks: { delta: 0.33, theta: -0.02, gamma: 0.01, vega: 0.08 },
    backendHadOptionPayload: true, marketClosed: true
  });
  assert(r.applied === true && leg.delta === 0.33 && r.usedSource === 'cache_stale', '3: cache stale snapshot displayed');
  console.log('✓ 3 stale cache snapshot displayed');
})();

// ── 4. non-destructive: existing finite value never overwritten ──────────────
(function() {
  // delta fresh, rest null -> hasFresh true -> NO fill at all (fresh wins wholesale)
  const leg = { delta: -0.5, theta: null, gamma: null, vega: null, volatility: null };
  resolve(leg, { backendRawGreeks: { delta: 0.99, theta: 0.99 }, backendGreeksStale: true });
  assert(leg.delta === -0.5 && leg.theta === null, '4: existing fresh delta not overwritten; no partial stale fill');
  console.log('✓ 4 non-destructive (no null overwrite)');
})();

// ── 5. explicit reasons when nothing is displayable ──────────────────────────
(function() {
  const blank = () => ({ delta: null, theta: null, gamma: null, vega: null, volatility: null });
  // 5a: backend returned an option payload (quote) but no usable greek values, closed
  let r = resolve(blank(), { backendHadOptionPayload: true, marketClosed: true });
  assert(r.applied === false && r.reason === 'stale_market_closed_no_prior_cache', '5a: no_prior_cache reason');
  // 5b: nothing at all from backend
  r = resolve(blank(), { backendHadOptionPayload: false, marketClosed: true });
  assert(r.reason === 'backend_missing_greeks', '5b: backend_missing_greeks reason');
  // 5c: backend had greek-like values but normalization mapped none -> alias mismatch
  r = resolve(blank(), { rawHadGreekishValues: true, backendHadOptionPayload: true, marketClosed: true });
  assert(r.reason === 'normalization_missing_alias', '5c: normalization_missing_alias reason');
  console.log('✓ 5 explicit unavailable reasons');
})();

// ── 6. enriched mapping carries greeks even when leg is greeksStale ──────────
(function() {
  const resp = { positions: [{ ticker: 'AAPL', legs: [{
    type: 'PUT', side: 'SHORT', streamerSymbol: '.AAPL260710P155',
    greeks: { delta: -0.41, theta: 0.04, gamma: 0.02, vega: 0.10, iv: 0.28 },
    greeksStale: true, quote: { bidPrice: 1.2, askPrice: 1.4 }, quoteStale: true
  }] }] };
  const out = enrich(resp);
  const o = out.options['.AAPL260710P155'];
  assert(o && o.greeks && o.greeks.delta === -0.41 && o.greeks.volatility === 0.28, '6: greeks (incl iv alias) carried');
  assert(o.greeksStale === true, '6: greeksStale flag preserved');
  assert(out.enrichedLegsCount === 1 && out.unresolvedLegs.length === 0, '6: leg counts as enriched, not unresolved');
  console.log('✓ 6 enriched mapping keeps stale greek values');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
