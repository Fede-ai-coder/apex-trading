// _betaMissingReasonLabel — maps computeRowBetaWeightedDelta's terse missingReason
// ('beta' | 'spyPrice' | 'underlyingPrice' | 'delta' | null) to the stable debug
// label surfaced by window.apexDebugPortfolioBetas(). Returns null when nothing is
// missing (βΔ computable).
function _betaMissingReasonLabel(reason, ttConnected) {
  switch (reason) {
    case 'beta':            return 'beta_missing';
    // When TT is the live source, a missing price is specifically a missing
    // Tastytrade quote — surface that so the cause is unambiguous.
    case 'spyPrice':        return ttConnected ? 'tastytrade_spy_price_missing' : 'spy_price_missing';
    case 'underlyingPrice': return ttConnected ? 'tastytrade_symbol_price_missing' : 'underlying_price_missing';
    case 'delta':           return 'delta_missing';
    default:                return null;
  }
}

// _aggregateBetaWtdMissingReason — the dominant per-position reason that the
// aggregate βΔ BETA-WTD total could not be computed (used to explain a null
// total). Returns null when at least one row produced a numeric βΔ — the total
// is then numeric and needs no reason.
function _aggregateBetaWtdMissingReason(rows) {
  if (!rows || !rows.length) return null;
  var counts = {};
  var anyComputed = false;
  rows.forEach(function(r) {
    if (r.betaWeightedDelta != null) { anyComputed = true; return; }
    var reason = r.betaWeightedDeltaMissingReason || r.reasonIfMissing;
    if (reason) counts[reason] = (counts[reason] || 0) + 1;
  });
  if (anyComputed) return null;
  var top = null, topN = 0;
  Object.keys(counts).forEach(function(k) { if (counts[k] > topN) { topN = counts[k]; top = k; } });
  return top;
}
