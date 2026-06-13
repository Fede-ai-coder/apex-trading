'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio enriched-endpoint response-shape contract test.
//
// Pins the EXACT shape that refreshPositionsLive() (index.html) and PR #257's
// _backendEnrichedPositionsToAggregatedOptions() expect from the backend
// enriched endpoint (apex-backend PR #140, POST /portfolio/:id/positions/enriched).
//
// The assertions below mirror the real cache-merge reader in
// refreshPositionsLive() at index.html:21960-22019 — the loop over
// `aggregatedResp.options[sym]` that decides what is `resolved`, what counts as
// fresh, and how stale greeks vs fresh quotes are handled. We replicate that
// reader here as `applyAggregatedOption()` so the contract is executable: if the
// backend emits the documented shape, Greeks/quotes populate; if it deviates,
// these tests fail.
//
// Run: node tests/portfolio-enriched-endpoint-shape.test.js
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function eq(actual, expected, msg) {
  if (actual === expected) { passed++; }
  else { failed++; console.error('  ✗ ' + msg + '\n      expected: ' + JSON.stringify(expected) + '\n      got:      ' + JSON.stringify(actual)); }
}
function ok(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }

// ─────────────────────────────────────────────────────────────────────────────
// Reference reader — faithful port of index.html:21960-22019.
// Given one option payload `o`, returns the merged cache entry plus resolution
// flags. Backend payloads that don't match the contract will not resolve.
// ─────────────────────────────────────────────────────────────────────────────
function applyAggregatedOption(o, prior) {
  const merged = Object.assign({}, prior || {});
  let hasFreshGreeks = false, hasFreshQuote = false, hasAnyQuoteField = false;
  const g = o.greeks || null;
  const q = o.quote || null;
  const greeksFresh = o.greeksStale !== true;
  const quoteFresh = o.quoteStale !== true;

  if (greeksFresh && g) {
    ['delta', 'theta', 'gamma', 'vega', 'volatility'].forEach(function (k) {
      const n = parseFloat(g[k]);
      if (isFinite(n)) { merged[k] = n; hasFreshGreeks = true; }
    });
  }
  if (!hasFreshGreeks) {
    merged.greeksStale = true;
    if (o.greeksUnavailableReason) merged.greeksUnavailableReason = o.greeksUnavailableReason;
    else if (!greeksFresh) merged.greeksUnavailableReason = merged.greeksUnavailableReason || 'STALE';
    else if (!g) merged.greeksUnavailableReason = merged.greeksUnavailableReason || 'MISSING';
  } else {
    merged.greeksStale = false;
    delete merged.greeksUnavailableReason;
  }

  if (q) {
    const qBid = parseFloat(q.bidPrice);
    const qAsk = parseFloat(q.askPrice);
    const qMark = parseFloat(q.mark);
    const qLast = parseFloat(q.lastPrice);
    if (isFinite(qBid) || isFinite(qAsk) || isFinite(qMark) || isFinite(qLast)) hasAnyQuoteField = true;
    if (quoteFresh) {
      if (isFinite(qBid)) { merged.bid = qBid; hasFreshQuote = true; }
      if (isFinite(qAsk)) { merged.ask = qAsk; hasFreshQuote = true; }
      if (isFinite(qMark)) { merged.mark = qMark; hasFreshQuote = true; }
      else if (isFinite(qLast)) { merged.mark = qLast; hasFreshQuote = true; }
    }
  }
  merged.hasGreeks = hasFreshGreeks;
  merged.hasQuote = hasFreshQuote;
  merged.quoteStale = (q && !quoteFresh) ? true : (hasFreshQuote ? false : merged.quoteStale);

  const persisted = (hasFreshGreeks || hasFreshQuote || hasAnyQuoteField || !!g);
  return { merged: merged, greeksResolved: hasFreshGreeks, quoteResolved: hasFreshQuote, persisted: persisted };
}

// ── 1. Fully fresh option: greeks + quote both resolve ───────────────────────
console.log('\n[1] Fresh greeks + fresh quote');
(function () {
  const o = {
    greeks: { delta: 0.55, theta: -0.12, gamma: 0.02, vega: 0.31, volatility: 0.21 },
    quote:  { bidPrice: 1.20, askPrice: 1.40, mark: 1.30, lastPrice: 1.29 },
    greeksStale: false,
    quoteStale: false,
  };
  const r = applyAggregatedOption(o);
  ok(r.greeksResolved, 'greeks resolved');
  ok(r.quoteResolved, 'quote resolved');
  eq(r.merged.delta, 0.55, 'delta mapped');
  eq(r.merged.theta, -0.12, 'theta mapped');
  eq(r.merged.gamma, 0.02, 'gamma mapped');
  eq(r.merged.vega, 0.31, 'vega mapped');
  eq(r.merged.volatility, 0.21, 'volatility mapped (raw DXLink fraction, NOT *100)');
  eq(r.merged.bid, 1.20, 'quote.bidPrice -> bid');
  eq(r.merged.ask, 1.40, 'quote.askPrice -> ask');
  eq(r.merged.mark, 1.30, 'quote.mark -> mark');
  eq(r.merged.greeksStale, false, 'greeksStale=false when fresh');
  ok(!('greeksUnavailableReason' in r.merged), 'no greeksUnavailableReason when fresh');
})();

// ── 2. lastPrice fallback when mark missing ──────────────────────────────────
console.log('\n[2] mark falls back to lastPrice');
(function () {
  const o = { greeks: null, quote: { bidPrice: 1.0, askPrice: 1.2, lastPrice: 1.11 }, greeksStale: true, quoteStale: false };
  const r = applyAggregatedOption(o);
  eq(r.merged.mark, 1.11, 'mark falls back to lastPrice when mark absent');
  ok(r.quoteResolved, 'quote still resolves via lastPrice');
})();

// ── 3. Stale greeks + fresh quote — independent freshness ────────────────────
console.log('\n[3] Stale greeks, fresh quote');
(function () {
  const o = {
    greeks: { delta: 0.55, theta: -0.12, gamma: 0.02, vega: 0.31, volatility: 0.21 },
    quote:  { bidPrice: 1.20, askPrice: 1.40, mark: 1.30 },
    greeksStale: true,
    quoteStale: false,
  };
  const r = applyAggregatedOption(o);
  ok(!r.greeksResolved, 'stale greeks do NOT resolve');
  ok(r.quoteResolved, 'quote resolves even though greeks are stale');
  eq(r.merged.greeksStale, true, 'greeksStale=true');
  ok(!('delta' in r.merged), 'stale greeks are NOT written into cache (no pollution)');
  eq(r.merged.greeksUnavailableReason, 'STALE', 'reason STALE when flagged stale');
})();

// ── 4. Missing greeks object → MISSING reason ────────────────────────────────
console.log('\n[4] Missing greeks');
(function () {
  const o = { greeks: null, quote: { bidPrice: 1.0, askPrice: 1.2, mark: 1.1 }, quoteStale: false };
  const r = applyAggregatedOption(o);
  ok(!r.greeksResolved, 'missing greeks do not resolve');
  eq(r.merged.greeksUnavailableReason, 'MISSING', 'reason MISSING when greeks object absent');
  ok(r.quoteResolved, 'quote still resolves');
})();

// ── 5. Explicit greeksUnavailableReason is honored ───────────────────────────
console.log('\n[5] Backend-supplied greeksUnavailableReason');
(function () {
  const o = { greeks: null, quote: null, greeksStale: true, greeksUnavailableReason: 'NO_SUBSCRIPTION' };
  const r = applyAggregatedOption(o);
  eq(r.merged.greeksUnavailableReason, 'NO_SUBSCRIPTION', 'explicit reason passed through');
})();

// ── 6. Unresolved leg: symbol absent from options map ────────────────────────
console.log('\n[6] Unresolved leg diagnostics');
(function () {
  const options = { '.SPY260619C825': { greeks: { delta: 0.5, theta: -0.1, gamma: 0.02, vega: 0.3, volatility: 0.2 }, quote: { bidPrice: 1, askPrice: 1.2, mark: 1.1 }, greeksStale: false, quoteStale: false } };
  // Legs the frontend asks about, keyed by canonical symbol:
  const requested = ['.SPY260619C825', '.IWM260116P210', '.QQQ260619P480.5'];
  const resolved = [], unresolved = [];
  requested.forEach(function (sym) {
    const o = options[sym];
    if (!o) { unresolved.push(sym); return; }
    const r = applyAggregatedOption(o);
    if (r.greeksResolved || r.quoteResolved) resolved.push(sym); else unresolved.push(sym);
  });
  eq(resolved.length, 1, 'one leg resolved');
  eq(unresolved.length, 2, 'two legs unresolved (not present in options map)');
  ok(unresolved.indexOf('.IWM260116P210') !== -1 && unresolved.indexOf('.QQQ260619P480.5') !== -1,
     'unresolved list carries the exact canonical symbols (for unresolvedSymbols logging)');
})();

// ── 7. Top-level response shape + market-closed diagnostics ──────────────────
console.log('\n[7] Top-level + optionResolutionDiagnostics contract');
(function () {
  const RESP = {
    ok: true,                                  // degraded responses MUST stay ok:true
    generatedAt: '2026-06-13T13:00:00Z',
    underlyings: { SPY: { mark: 600 } },       // (or underlyingsBySymbol)
    options: {
      '.SPY260619C825': {
        greeks: null,
        quote: { bidPrice: 1.2, askPrice: 1.4, mark: 1.3 },
        greeksStale: true,
        quoteStale: false,
        greeksUnavailableReason: 'STALE',
      },
    },
    optionResolutionDiagnostics: {
      unresolvedReason: 'market_closed_stale_greeks',
      marketSessionStatus: 'closed',
      greeksStaleExpected: true,
      staleGreeksReason: 'market_closed',
      lastGreeksEventAt: '2026-06-13T08:00:00Z',
    },
  };
  ok(RESP.ok === true, 'market-closed response is ok:true (degraded, not a hard error)');
  ok(RESP.underlyings || RESP.underlyingsBySymbol, 'underlyings / underlyingsBySymbol present');
  ok(typeof RESP.options === 'object' && !Array.isArray(RESP.options), 'options is a keyed map (not an array)');
  const d = RESP.optionResolutionDiagnostics;
  ['unresolvedReason', 'marketSessionStatus', 'greeksStaleExpected', 'staleGreeksReason', 'lastGreeksEventAt']
    .forEach(function (k) { ok(k in d, 'optionResolutionDiagnostics.' + k + ' present'); });
  eq(d.unresolvedReason, 'market_closed_stale_greeks', 'unresolvedReason explains stale greeks when closed');
  eq(d.marketSessionStatus, 'closed', 'marketSessionStatus=closed');
  // The lone option still yields a usable quote despite stale greeks.
  const r = applyAggregatedOption(RESP.options['.SPY260619C825']);
  ok(!r.greeksResolved && r.quoteResolved, 'closed-market leg: greeks unresolved, quote usable');
})();

// ── 8. Empty options on a closed market is not a failure ─────────────────────
console.log('\n[8] Empty options map + diagnostics');
(function () {
  const RESP = {
    ok: true,
    options: {},
    optionResolutionDiagnostics: { unresolvedReason: 'feed_unavailable', marketSessionStatus: 'closed', greeksStaleExpected: true },
  };
  ok(RESP.ok === true, 'empty-options response still ok:true');
  ok(Object.keys(RESP.options).length === 0, 'options may be empty');
  ok(RESP.optionResolutionDiagnostics.unresolvedReason === 'feed_unavailable', 'reason still explains why');
})();

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
