// _portfolioGreeksFreshness — builds the greeksFreshness debug block from the
// per-refresh option-resolution diagnostics gathered in refreshPositionsLive.
// Makes explicit, for each refresh, whether the greeks that fed the totals were
// live or stale, and (critically) whether stale was EXPECTED because the market
// is closed — so a market-closed stale snapshot is never mistaken for a live
// update. Pure (no globals): fully unit-testable.
//   source              — dominant per-leg greeks source this refresh
//   marketSessionStatus — 'open' | 'closed' (backend authoritative, local fallback)
//   greeksStale         — at least one option leg had stale greeks
//   greeksStaleExpected — stale is expected (market closed / backend says so)
//   quoteResolved       — count of option symbols whose quote resolved
//   greeksResolved      — count of option symbols whose greeks resolved
//   lastUpdatedAt       — ISO of the refresh that produced these greeks
function _portfolioGreeksFreshness(optDiag, fallbackSessionStatus, greeksRefreshDiag) {
  optDiag = optDiag || {};
  greeksRefreshDiag = greeksRefreshDiag || {};
  var sources = greeksRefreshDiag.sources || {};
  // Dominant per-leg greeks source (most frequent), else null.
  var source = null, topN = -1;
  Object.keys(sources).forEach(function(k) { if (sources[k] > topN) { topN = sources[k]; source = k; } });
  var staleCount = parseFloat(optDiag.staleGreeksCount);
  return {
    source: source,
    marketSessionStatus: optDiag.marketSessionStatus || fallbackSessionStatus || null,
    greeksStale: isFinite(staleCount) && staleCount > 0,
    greeksStaleExpected: optDiag.greeksStaleExpected === true,
    quoteResolved: (optDiag.quoteResolved != null && isFinite(parseFloat(optDiag.quoteResolved))) ? parseFloat(optDiag.quoteResolved) : null,
    greeksResolved: (optDiag.greeksResolved != null && isFinite(parseFloat(optDiag.greeksResolved))) ? parseFloat(optDiag.greeksResolved) : null,
    lastUpdatedAt: greeksRefreshDiag.lastUpdatedAt || null
  };
}
