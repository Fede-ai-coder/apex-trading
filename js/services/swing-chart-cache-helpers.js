function _swingInvalidateChartCacheSymbol(symbol) {
  if (!S.swing || !S.swing.chartCache || !symbol) return 0;
  var n = 0;
  Object.keys(S.swing.chartCache).forEach(function(k) {
    var e = S.swing.chartCache[k];
    if ((e && e.symbol === symbol) || k.indexOf(symbol + '|') === 0) { delete S.swing.chartCache[k]; n++; }
  });
  return n;
}

// One compact line per chart-cache decision (never per candle). Carries everything needed
// to answer "why was this cache used or rejected" without re-deriving it.
function _swingLogChartCache(fields) {
  try { if (typeof console !== 'undefined' && console.log) console.log('[SWING][CHART-CACHE]', fields); } catch (e) {}
}

// Map a backend reader failure reason onto a provenance code, so a transport failure is
// never reported as an ordinary empty result.
function _swingBackendOutcome(res) {
  if (!res) return 'BACKEND_ERROR';
  if (res.ok && res.candles && res.candles.length) return 'BACKEND';
  var r = String((res && res.reason) || '').toLowerCase();
  // Order matters: a timeout and an abort both surface as a 'fetch:'-prefixed reason, and an
  // empty store surfaces as ok:false + a *_empty reason (because _swingGetCandles only reports
  // ok when candles exist). Classify those BEFORE the generic error bucket, so "the store has
  // no bars for this symbol" is never reported as a transport failure and vice versa.
  if (/timeout|timed out/.test(r)) return 'TIMEOUT';
  if (/abort/.test(r)) return 'ABORTED';
  if (/empty|no_?data/.test(r)) return 'BACKEND_EMPTY';
  return 'BACKEND_ERROR';
}
