// Stale-quote mark for a backend option cache entry (market-closed refresh where the
// backend flags quoteStale=true but still returns a valid price). Prefers a stale
// mark, then a stale bid/ask mid, then a single stale side. Returns a positive number
// or null. Kept SEPARATE from the fresh mark so a stale quote can still power the
// Unrealized P&L (with a stale indicator) instead of collapsing the row to "--".
function _backendCacheStaleMark(entry) {
  if (!entry || typeof entry !== 'object') return null;
  var f = function(v) { var n = parseFloat(v); return (isFinite(n) && n > 0) ? n : null; };
  var m = f(entry.staleMark);
  if (m != null) return m;
  var b = f(entry.staleBid), a = f(entry.staleAsk);
  if (b != null && a != null) return (b + a) / 2;
  if (b != null) return b;
  if (a != null) return a;
  return null;
}

// Robust squeeze → render state adapter. Normalizes the many shapes the backend/live
// sources emit (boolean from candle-derived technicals, 'ACTIVE'/'ON'/'OFF' strings
// from the scanner) into the exact strings the Portfolio row renders:
//   true  / 'ACTIVE' / 'ON'  → 'ACTIVE'   (renders ON)
//   false / 'OFF' / 'INACTIVE' → 'OFF'    (renders OFF — a REAL state, never "--")
//   null / undefined / unknown → null      (renders "--")
function _squeezeToState(v) {
  if (v === true) return 'ACTIVE';
  if (v === false) return 'OFF';
  if (typeof v === 'string') {
    var s = v.trim().toUpperCase();
    if (s === 'ACTIVE' || s === 'ON' || s === 'TRUE' || s === 'YES' || s === '1' || s === 'FIRED') return 'ACTIVE';
    if (s === 'OFF' || s === 'INACTIVE' || s === 'FALSE' || s === 'NO' || s === '0' || s === 'NONE') return 'OFF';
  }
  return null;
}
