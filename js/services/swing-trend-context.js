// ─── Trend context from a candle series (Weekly or Daily) ─────────────────────
// Returns { available, trend:'UP'|'DOWN'|'FLAT'|'unavailable', sma20, sma30,
// price, structure }. Never throws.
function _swingTrendContextFromCandles(candles, minBars) {
  var out = { available: false, trend: 'unavailable', sma20: null, sma30: null, price: null, structure: 'unavailable' };
  var min = minBars || SWING_MIN_DAILY_BARS;
  if (!Array.isArray(candles) || candles.length < min) return out;
  var closes = [];
  for (var i = 0; i < candles.length; i++) {
    var v = candles[i] && (candles[i].close != null ? candles[i].close : candles[i].c);
    if (v != null && isFinite(v)) closes.push(v);
  }
  if (closes.length < min) return out;
  var sma20arr = smA(closes, 20);
  var sma30arr = smA(closes, 30);
  var n = closes.length - 1;
  var price = closes[n], s20 = sma20arr[n], s30 = sma30arr[n];
  out.price = price; out.sma20 = s20; out.sma30 = s30; out.available = true;
  var ref = (s20 != null) ? s20 : (s30 != null ? s30 : null);
  if (ref == null) {
    var prev = closes[Math.max(0, n - 5)];
    out.trend = price > prev ? 'UP' : price < prev ? 'DOWN' : 'FLAT';
  } else {
    var aboveSma = price >= ref;
    var back = sma20arr[Math.max(0, n - 3)];
    var slopeUp = (s20 != null && back != null) ? (s20 >= back) : aboveSma;
    if (aboveSma && slopeUp) out.trend = 'UP';
    else if (!aboveSma && !slopeUp) out.trend = 'DOWN';
    else out.trend = 'FLAT';
  }
  if (s20 != null && s30 != null) out.structure = (s20 >= s30) ? 'SMA20>SMA30' : 'SMA20<SMA30';
  else out.structure = 'partial';
  return out;
}
