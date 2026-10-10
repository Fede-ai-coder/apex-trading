// _portfolioPriceFreshness — builds the priceFreshness debug block from the
// per-refresh price-resolution diagnostics (resolvedPricesBySymbol). ageMs is
// computed against nowMs at CALL time so a kept-previous/stale price's age keeps
// growing between refreshes and a stale benchmark is visible. Pure + testable.
//   { refreshStartedAt, refreshCompletedAt, symbols, spy:{...}, underlyings:{SYM:{...}} }
// each entry: { price, source, updatedAt, isLive, staleReason, ageMs, attempts }.
function _portfolioPriceFreshness(priceDiag, meta, nowMs) {
  priceDiag = priceDiag || {};
  meta = meta || {};
  nowMs = (nowMs != null && isFinite(nowMs)) ? nowMs : Date.now();
  var resolved = priceDiag.resolvedPricesBySymbol || {};
  function withAge(entry) {
    if (!entry) return null;
    var ageMs = null;
    if (entry.updatedAt) { var t = Date.parse(entry.updatedAt); if (isFinite(t)) ageMs = Math.max(0, nowMs - t); }
    return {
      price: entry.price != null ? entry.price : null,
      source: entry.source || null,
      updatedAt: entry.updatedAt || null,
      isLive: !!entry.isLive,
      staleReason: entry.staleReason || null,
      ageMs: ageMs,
      attempts: entry.attempts || []
    };
  }
  var underlyings = {};
  var symbols = [];
  Object.keys(resolved).forEach(function(sym) {
    if (sym === 'SPY') return;
    symbols.push(sym);
    underlyings[sym] = withAge(resolved[sym]);
  });
  return {
    refreshStartedAt: meta.refreshStartedAt || null,
    refreshCompletedAt: meta.refreshCompletedAt || null,
    symbols: symbols,
    spy: withAge(resolved.SPY),
    underlyings: underlyings
  };
}
