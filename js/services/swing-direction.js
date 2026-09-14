// ─── Final multi-timeframe Swing direction (PURE, testable) ───────────────────
// Derives the FINAL Swing direction from the ALREADY-computed Weekly / Daily / 4H
// context (never recomputes indicators, never a second SMA formula) and keeps it
// STRICTLY SEPARATE from the scanner source bias. A scanner bias that disagrees with
// the absolute trend is surfaced as CONFLICT — it is never shown as the final direction.
//
// PENDING vs WAIT are DIFFERENT states and must not be conflated:
//   • PENDING = enrichment has not completed for this row yet (a thin operational row, or
//     a row whose 4H is still deferred/loading). Driven by the EXPLICIT `enriched` flag and
//     by fourHTiming === 'pending' — NEVER inferred from missing trend values.
//   • WAIT    = enrichment finished but the technical context is genuinely missing /
//     insufficient (Weekly or Daily unavailable, or a needed 4H unavailable) — never a
//     permanent PENDING.
// A missing 4H (`unavailable`) is NOT tactical confirmation: it can never turn a bullish or
// bearish structure into LONG/SHORT — it yields WAIT.
//
// Enum inputs match the project exactly: weekly/daily trend ∈ UP / DOWN / FLAT / unavailable;
// fourHTiming ∈ BULLISH / BEARISH / NEUTRAL / unavailable / pending; sourceBias ∈ LONG /
// SHORT / NEUTRAL / UNKNOWN (UNKNOWN = no explicit scanner bias → treated as no conflict).
// Accepts a candidate-like object; reads { weeklyTrend, dailyTrend, fourHTiming, sourceBias,
// source, enriched }. Returns { direction, conflict, reason } with direction ∈
// LONG / SHORT / CONFLICT / WAIT / PENDING.
function _swingResolveDirection(ctx) {
  ctx = ctx || {};
  var enriched = ctx.enriched === true;
  // 1) Enrichment not complete yet → PENDING (thin row). The source bias may already exist,
  //    but there is NO final Swing direction to show. Distinguished from WAIT by this flag.
  if (!enriched) return { direction: 'PENDING', conflict: false, reason: 'Awaiting enrichment' };

  var wk = ctx.weeklyTrend, dl = ctx.dailyTrend, fh = ctx.fourHTiming;
  var bias = _swingNormDir(ctx.sourceBias);            // UNKNOWN → NEUTRAL → no conflict
  var prov = ctx.source ? String(ctx.source) : 'Source';
  var wkOk = (wk === 'UP' || wk === 'DOWN' || wk === 'FLAT');
  var dlOk = (dl === 'UP' || dl === 'DOWN' || dl === 'FLAT');

  // Fixed precedence (documented + tested):
  //   1 enriched:false → PENDING   2 Weekly unavailable → WAIT   3 Daily unavailable → WAIT
  //   4 4H pending → PENDING        5 Weekly/Daily disagreement → CONFLICT
  //   6 4H unavailable → WAIT       7 LONG / SHORT / CONFLICT (bias·4H) / WAIT (FLAT)
  // 2 & 3) A required structural timeframe is genuinely unavailable → WAIT.
  if (!wkOk) return { direction: 'WAIT', conflict: false, reason: 'Weekly context unavailable after enrichment' };
  if (!dlOk) return { direction: 'WAIT', conflict: false, reason: 'Daily context unavailable after enrichment' };
  // 4) 4H still deferred / loading → PENDING. Takes precedence over the trend rules so a
  //    deferred row reads PENDING (transient) rather than a CONFLICT/WAIT it will re-resolve.
  if (fh === 'pending') return { direction: 'PENDING', conflict: false, reason: '4H timing pending enrichment' };

  var wkUp = wk === 'UP', wkDown = wk === 'DOWN';
  var dlUp = dl === 'UP', dlDown = dl === 'DOWN';
  var fhBull = fh === 'BULLISH', fhBear = fh === 'BEARISH';
  var fhUsable = fhBull || fhBear || (fh === 'NEUTRAL'); // 'unavailable' is NOT tactical confirmation

  // 5) Weekly vs Daily disagreement → CONFLICT (knowable without the 4H).
  if ((wkUp && dlDown) || (wkDown && dlUp)) {
    return { direction: 'CONFLICT', conflict: true, reason: 'Weekly/Daily trend disagreement (' + wk + '/' + dl + ')' };
  }
  // 6) 4H genuinely unavailable → WAIT (a missing 4H is never a tactical confirmation, so it
  //    can never turn a bullish/bearish structure into LONG/SHORT).
  if (!fhUsable) return { direction: 'WAIT', conflict: false, reason: '4H context unavailable after enrichment' };

  // 7) Directional resolution with an available 4H (BULLISH / BEARISH / NEUTRAL).
  if (wkUp && dlUp) {
    if (fhBear) return { direction: 'CONFLICT', conflict: true, reason: '4H tactical reversal (BEARISH) against bullish Weekly/Daily trend' };
    if (bias === 'SHORT') return { direction: 'CONFLICT', conflict: true, reason: prov + ' SHORT bias conflicts with bullish Weekly/Daily trend' };
    return { direction: 'LONG', conflict: false, reason: 'Weekly + Daily uptrend, 4H ' + (fhBull ? 'bullish' : 'neutral') };
  }
  if (wkDown && dlDown) {
    if (fhBull) return { direction: 'CONFLICT', conflict: true, reason: '4H tactical reversal (BULLISH) against bearish Weekly/Daily trend' };
    if (bias === 'LONG') return { direction: 'CONFLICT', conflict: true, reason: prov + ' LONG bias conflicts with bearish Weekly/Daily trend' };
    return { direction: 'SHORT', conflict: false, reason: 'Weekly + Daily downtrend, 4H ' + (fhBear ? 'bearish' : 'neutral') };
  }
  // 8) Trend not sufficiently defined (FLAT weekly or daily) → WAIT. Absence of a clear trend
  //    is NEVER auto-promoted to LONG / SHORT.
  return { direction: 'WAIT', conflict: false, reason: 'Weekly/Daily trend not clearly defined (' + wk + '/' + dl + ')' };
}
// READ-ONLY read of the existing RS vs SPY result store. Never mutates RS state.
function _swingRsContext(symbol) {
  try {
    if (typeof S === 'undefined' || !Array.isArray(S.rsScannerData)) return null;
    var row = S.rsScannerData.find(function(x) { return (x.ticker || x.symbol) === symbol; });
    if (!row) return null;
    var rsVal = (row.rs != null) ? row.rs : (row.rsScore != null ? row.rsScore : (row.rs20 != null ? row.rs20 : null));
    var bias = (rsVal != null) ? (rsVal >= 0 ? 'STRONG' : 'WEAK') : 'NEUTRAL';
    var label = 'RS ' + bias + (rsVal != null ? ' (' + (rsVal > 0 ? '+' : '') + Number(rsVal).toFixed(1) + ')' : '');
    return { bias: bias, value: rsVal, label: label };
  } catch (e) { return null; }
}
function _swingVixSuitability(vix) {
  var v = parseFloat(vix);
  if (!isFinite(v)) return { suitable: null, warn: false, message: 'VIX unavailable — confirm Market Context before swing entries.' };
  if (v > SWING_VIX_MAX_SUITABLE) return { suitable: false, warn: true, message: 'VIX ' + v.toFixed(1) + ' — elevated volatility regime; swing setups carry higher risk.' };
  return { suitable: true, warn: false, message: 'VIX ' + v.toFixed(1) + ' — volatility regime acceptable for swing setups.' };
}
