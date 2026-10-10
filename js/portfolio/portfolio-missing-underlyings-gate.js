// True when the aggregated portfolio refresh came back OK but carries no underlyings map
// (the `missing_underlyings` reason surfaced by getAggregatedIvrForTicker). In that state
// the per-symbol candle/IVR fallback must NOT fan out across every unresolved ticker.
// A null/failed aggregated response is NOT this state — those keep the legacy fallback so
// deployments without backend offload are unaffected.
function _portfolioAggregatedMissingUnderlyings(aggregatedResp) {
  if (aggregatedResp && aggregatedResp.ok === true && aggregatedResp.underlyings) return false;
  if (aggregatedResp && aggregatedResp.ok === true && !aggregatedResp.underlyings) return true;
  var f = (typeof S !== 'undefined' && S && S.lastPortfolioLiveRefreshFailure) || null;
  var reason = f && f.reason ? String(f.reason) : '';
  // A bounded aggregate timeout is operationally the same risk state: the backend did
  // not deliver underlyings/IVR, so the frontend must not immediately fan out candles
  // or /options/ivr across the whole portfolio.
  return reason === 'timeout' || reason === 'missing_underlyings';
}

// Budget of per-ticker /options/ivr fallbacks allowed this cycle. Infinite on the healthy
// path (unchanged), but bounded — and zero unless the user clicked Refresh — while the
// aggregated refresh is missing underlyings, so IVR fallback never fans out across the
// whole book just because underlying prices are absent.
function _portfolioIvrFallbackBudget(suppress, userInitiated, cap) {
  if (!suppress) return Infinity;
  return userInitiated ? Math.max(0, cap | 0) : 0;
}
