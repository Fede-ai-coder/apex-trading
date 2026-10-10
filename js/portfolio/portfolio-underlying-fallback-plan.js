// Plans the underlying-price fallback for one refresh cycle.
//   missingTickers : position tickers with no resolved live price this cycle
//   lastKnownPrices: _lastKnownUnderlyingPrice cache from prior refreshes
//   suppress       : _portfolioAggregatedMissingUnderlyings(aggregatedResp)
//   userInitiated  : the user explicitly clicked Refresh
//   cap            : PORTFOLIO_MISSING_UNDERLYINGS_FALLBACK_CAP
//   coldStart      : initial Portfolio open with no reusable prices after aggregate/DXLink failure
// Returns { reuse:{ticker:price}, candle:[tickers], deferred:[tickers] }.
// When NOT suppressing, behaviour is unchanged: every unresolved ticker is a candle
// fallback candidate (no reuse, nothing deferred). When suppressing, cached/last-known
// prices are reused first, and any still-unresolved ticker is left in a partial state
// (deferred) except for a tiny bounded number that only runs on a user-initiated refresh
// or a cold-start initial open recovery.
function _planPortfolioUnderlyingFallback(missingTickers, lastKnownPrices, suppress, userInitiated, cap, coldStart) {
  var plan = { reuse: {}, candle: [], deferred: [] };
  var list = (missingTickers || []).slice();
  if (!suppress) { plan.candle = list; return plan; }
  var remaining = [];
  list.forEach(function(t) {
    var lk = lastKnownPrices && lastKnownPrices[t];
    var px = (lk && isFinite(parseFloat(lk.price))) ? parseFloat(lk.price) : null;
    if (px != null) plan.reuse[t] = px;
    else remaining.push(t);
  });
  var budget = (userInitiated || coldStart) ? Math.max(0, cap | 0) : 0;
  plan.candle = remaining.slice(0, budget);
  plan.deferred = remaining.slice(budget);
  return plan;
}
