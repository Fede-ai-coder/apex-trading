// Position-level unrealized P&L = Σ leg-level P&L across ACTIVE legs, each leg using
// its live current mark from legsLive[idx].currentPrice (index-aligned with
// position.legs — the same pairing the greeks aggregation uses). Terminal-leg
// placeholders and inactive legs are skipped. If ANY active leg lacks a current mark
// the total is incomplete → null (the row shows "--" rather than a partial number).
// Never uses the underlying price for an option leg; never falls back to the entry
// snapshot (P&L requires a CURRENT mark, which an entry snapshot does not hold).
function computePositionUnrealizedPnL(position) {
  if (!position) return null;
  var legs = position.legs || [];
  if (!legs.length) return null;
  var legsLive = position.legsLive || (position.live && position.live.legsLive) || [];
  var total = null, sawActive = false;
  for (var i = 0; i < legs.length; i++) {
    var leg = legs[i];
    if (!isActivePortfolioLeg(leg, position)) continue;
    sawActive = true;
    var ll = legsLive[i];
    var mark = (ll && ll.priceSource !== 'terminal_leg_placeholder' && ll.currentPrice != null)
      ? ll.currentPrice : null;
    var lp = _legUnrealizedPnL(leg, mark);
    if (lp === null) return null;   // incomplete data → "--"
    total = (total === null ? 0 : total) + lp;
  }
  return sawActive ? total : null;
}

// Portfolio-level total = Σ per-row P&L. Rows with a missing mark (null) are skipped
// so one un-warmed symbol never blanks the whole total; null only when NO row had a
// computable P&L. Sums the SAME per-row value the table shows (pos.unrealizedPnL).
function computePortfolioUnrealizedPnL(positions) {
  var total = null;
  (positions || []).forEach(function(p) {
    var v = (p && p.unrealizedPnL != null && isFinite(p.unrealizedPnL))
      ? p.unrealizedPnL
      : computePositionUnrealizedPnL(p);
    if (v != null && isFinite(v)) total = (total === null ? 0 : total) + v;
  });
  return total;
}
