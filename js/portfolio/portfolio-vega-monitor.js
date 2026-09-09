// ── VEGA MONITOR RATIOS ─────────────────────────────────────────
// Additive, display-only ratios derived ENTIRELY from values the Portfolio
// already computes — no greeks are recalculated and no existing aggregate is
// touched. Inputs come straight from the existing sources already shown in the
// greeks bar:
//   bwd                = computePortfolioRiskMetrics().totalBetaWeightedDelta
//   ag.putLongVega     = VegaLongPut    (aggregateGreeks · "ν PUT LONG")
//   ag.putShortVegaAbs = |VegaShortPut| (aggregateGreeks · "ν PUT SHORT", already abs)
//   ag.callLongVega    = VegaLongCall   (aggregateGreeks · "ν CALL LONG")
//   ag.callShortVegaAbs= |VegaShortCall|(aggregateGreeks · "ν CALL SHORT", already abs)
// Because putShortVegaAbs / callShortVegaAbs are stored as Math.abs(...) at the
// source, the |…| in the formulas is already satisfied — the same source value
// is reused verbatim. Each ratio is null (renderer shows "N/A") when its
// numerator is missing, or its denominator is missing / zero / non-finite.
//   bwdOverVegaLongPut        = BWD          / VegaLongPut
//   vegaLongPutOverShortPut   = VegaLongPut  / |VegaShortPut|
//   vegaLongCallOverShortCall = VegaLongCall / |VegaShortCall|
function computeVegaMonitorRatios(bwd, ag) {
  function ratio(num, den) {
    if (num === null || num === undefined || den === null || den === undefined) return null;
    if (!isFinite(num) || !isFinite(den) || den === 0) return null;
    var r = num / den;
    return isFinite(r) ? r : null;
  }
  ag = ag || {};
  return {
    bwdOverVegaLongPut:        ratio(bwd, ag.putLongVega),
    vegaLongPutOverShortPut:   ratio(ag.putLongVega,  ag.putShortVegaAbs),
    vegaLongCallOverShortCall: ratio(ag.callLongVega, ag.callShortVegaAbs)
  };
}
