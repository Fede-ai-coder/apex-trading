// ── Directional Chart backend-candle load dedup / TTL throttle ───────────────
// _dssRenderLargeCharts is re-entered from many paths (initial open, window resize,
// overlay toggles, the SPY 4H benchmark redraw, the 4H/SPY polls). Without a guard
// each re-entry re-ran the backend candle load and re-logged
// [SCANNER][CHART][BACKEND-CANDLES], producing dozens of identical console lines
// for the same symbol/view/timeframes — and the SPY-benchmark redraw could feed
// back into itself. We dedup identical in-flight loads and serve a short TTL cache
// for already-complete data (1D>0 & 4H>0 from the backend store). An explicit force
// (opts.force=true) or a symbol change always bypasses the cache. This changes only
// load orchestration — backend, scanner rules, scoring and chart rendering are untouched.
var _DSS_CHART_LOAD_TTL_MS = 45000;
var _dssChartLoadGuard = {
  key: null, ts: 0, scbc: null,           // last successful load (TTL cache)
  inflight: null, inflightKey: null,      // in-flight fetch dedup
  inflightSkipLogged: false, ttlSkipLogged: false
};
// Dedup concurrent identical backend candle loads for the directional chart.
// Returns the shared in-flight Promise when an identical (non-forced) load is
// already running; otherwise starts one. Resolves to the fetcher result.
function _dssLoadBackendCandlesDeduped(symbol, loadKey, force) {
  var g = _dssChartLoadGuard;
  if (!force && g.inflight && g.inflightKey === loadKey) {
    if (!g.inflightSkipLogged) {
      g.inflightSkipLogged = true;
      if (window.console && console.debug) console.debug('[SCANNER][CHART][BACKEND-CANDLES] skipped duplicate in-flight symbol=' + symbol);
    }
    return g.inflight;
  }
  g.inflightKey = loadKey;
  g.inflightSkipLogged = false;
  var p;
  try { p = Promise.resolve(_scannerFetchBackendCandlesForChart(symbol)); }
  catch (e) { p = Promise.reject(e); }
  g.inflight = p;
  // Clear the in-flight handle once settled so the next identical load can run.
  p.then(function(){ if (g.inflightKey === loadKey) g.inflight = null; },
         function(){ if (g.inflightKey === loadKey) g.inflight = null; });
  return p;
}
