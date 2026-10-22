// Decide whether a cache entry may be served as FRESH. Returns a structured verdict so the
// caller and the diagnostic agree on the reason, instead of recomputing it.
//   decision: CACHE_MISS | CACHE_INVALID | CACHE_IDENTITY_MISMATCH | CACHE_SESSION_MISMATCH
//           | CACHE_EXPIRED | CACHE_HIT_FRESH
function _swingChartCacheEvaluate(entry, symbol, tf, nowMs) {
  var now = (nowMs != null && isFinite(nowMs)) ? nowMs : Date.now();
  var expected = _swingExpectedNewestSessionDate(now);
  var out = { usable: false, decision: 'CACHE_MISS', ageMs: null,
              cachedSession: null, expectedSession: expected };
  if (!entry) return out;
  out.cachedSession = entry.lastSessionDate || null;
  out.ageMs = (entry.fetchedAt != null && isFinite(entry.fetchedAt)) ? (now - entry.fetchedAt) : null;
  // Structural validity — a malformed entry is a miss, never a silent hit.
  if (!entry.candles || !entry.candles.length || out.ageMs == null || out.ageMs < 0) {
    out.decision = 'CACHE_INVALID'; return out;
  }
  // Identity — the key already encodes symbol|tf, but the entry carries them too so a
  // corrupted or hand-written entry cannot be served for the wrong series.
  if (entry.symbol !== symbol || entry.timeframe !== tf) {
    out.decision = 'CACHE_IDENTITY_MISMATCH'; return out;
  }
  // SESSION CHECK — authoritative and independent of the TTL. An entry whose newest candle
  // predates the session the market has already produced is stale however recent it is.
  // An unprovable cached session is treated as a mismatch, never as a pass.
  if (expected != null) {
    if (out.cachedSession == null || out.cachedSession < expected) {
      out.decision = 'CACHE_SESSION_MISMATCH'; return out;
    }
  }
  if (out.ageMs > SWING_CHART_CACHE_TTL_MS) { out.decision = 'CACHE_EXPIRED'; return out; }
  out.usable = true; out.decision = 'CACHE_HIT_FRESH';
  return out;
}
