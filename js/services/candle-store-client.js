// ─────────────────────────────────────────────────────────────────────────────
// CANDLE STORE CLIENT — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith and AFTER the other
// already-extracted candle modules (candle-normalization.js, candle-auth-gate.js,
// candle-provenance.js). Contains ONLY the five low-level candle-store primitive
// function declarations below — the scanner session-cache key/get/put helpers and
// the two candle-store transport primitives (a GET /market/candles read and a POST
// /market/candles/ensure) — and their associated comments. No state, no constants,
// no top-level execution, no requests, no timers, no DOM access and no side effects
// at load time.
//
// The scanner session-cache STATE these functions read/mutate STAYS declared in
// index.html: the _scannerChartCandleSessionCache map and the
// _SCANNER_CHART_CANDLE_CACHE_TTL_MS constant. Every runtime dependency (the BACKEND
// base URL, the S session object, the auth-header builder, the auth-ready gate, the
// failure/success notes, the 4H diagnostics extractor, the candle normalization +
// chart mappers and the subscription-request recorder) is resolved LEXICALLY as a
// global at CALL time (never read while this file loads), exactly as when these
// functions lived inline, so the earlier load order does not create a TDZ.
//
// The read-first orchestration and its retry timers, the DXLink read primitive and
// the per-feature adapters (Portfolio, Market Context, Pre-trade, SFS/Swing) stay
// where they are — none of them moved here. This PR extracts the five functions, not
// the cache state and not the orchestration.
// ─────────────────────────────────────────────────────────────────────────────
function _scannerChartCandleCacheKey(symbol, tf){ return String(symbol||'').trim().toUpperCase() + '|' + String(tf||'').trim().toUpperCase(); }
function _scannerGetCachedBackendTfCandles(symbol, tf){
  var e = _scannerChartCandleSessionCache[_scannerChartCandleCacheKey(symbol, tf)];
  if (!e || !e.candles || e.candles.length < 20) return null;
  return (Date.now() - (e.timestamp || 0)) <= _SCANNER_CHART_CANDLE_CACHE_TTL_MS ? e : null;
}
function _scannerPutCachedBackendTfCandles(symbol, tf, candles, diag){
  if (!candles || candles.length < 20) return null;
  return (_scannerChartCandleSessionCache[_scannerChartCandleCacheKey(symbol, tf)] = { candles:candles, timestamp:Date.now(), diag:diag || null });
}
async function _scannerReadBackendCandlesTf(symbol, tf, opts){
  opts = opts || {}; symbol = String(symbol || '').trim().toUpperCase(); tf = String(tf || '').trim().toUpperCase();
  if (!opts.forceNetwork) { var cached = _scannerGetCachedBackendTfCandles(symbol, tf); if (cached) return { ok:true, candles:cached.candles, count:cached.candles.length, missingReason:null, diag:cached.diag || null, fromSessionCache:true }; }
  if (!_backendCandleGateOpen()) { var gr = _backendCandleGateReason(); return { ok:false, fallbackReason:gr, reason:gr, missingReason:gr, count:0 }; }
  try {
    var r = await fetch(BACKEND + '/market/candles?symbol=' + encodeURIComponent(symbol) + '&timeframe=' + encodeURIComponent(tf) + '&limit=300', { headers:_backendAuthHeaders(), cache:'no-store', signal:AbortSignal.timeout(15000) });
    if (!r.ok) { _noteBackendCandleFailure(tf === '4H' ? 'candle_4h' : 'candle_1d', r.status, 'GET ' + tf + ' ' + symbol); return { ok:false, httpStatus:r.status, missingReason:'http_' + r.status, count:0 }; }
    _noteBackendCandleSuccess(r.status);
    var j = await r.json();
    var diag = (tf === '4H' && typeof _extractBackend4hDiag === 'function') ? _extractBackend4hDiag(j) : null;
    var missingReason = (j && (j.missingReason || j.reason)) || (diag && (diag.missingReason || diag.derivationReason)) || null;
    if (!j || (j.ok !== true && !j.candles && !(j.timeframes && j.timeframes[tf]))) return { ok:false, reason:missingReason || 'backend_not_ok', missingReason:missingReason || 'backend_not_ok', count:(j && typeof j.count === 'number') ? j.count : 0, diag:diag };
    var norm = _apexParityNormCandleArray(_apexParityExtractBackendCandles(j));
    var mapper = (typeof _mapBackendCandlesForChart === 'function') ? _mapBackendCandlesForChart : _scannerMapBackendCandlesForChart;
    var candles = mapper(norm);
    var count = candles ? candles.length : (norm ? norm.length : ((j && typeof j.count === 'number') ? j.count : 0));
    if (candles && candles.length >= 20) _scannerPutCachedBackendTfCandles(symbol, tf, candles, diag);
    return { ok:!!(candles && candles.length >= 20), candles:candles || null, count:count, missingReason:missingReason, diag:diag };
  } catch(e) { return { ok:false, error:(e && e.message) || String(e), missingReason:'fetch_error:' + ((e && e.message) || String(e)), count:0, diag:null }; }
}
async function _scannerEnsureBackendCandles(symbol, timeframes, reason){
  var tfs = timeframes || ['1D','30M','4H'];
  if (typeof _backendCandleGateOpen === 'function' && !_backendCandleGateOpen()) {
    var gateReason = (typeof _backendCandleGateReason === 'function') ? _backendCandleGateReason() : 'backend_auth_not_ready';
    return { ok:false, fallbackReason:gateReason, missingReason:gateReason };
  }
  _recordCandleSubscriptionRequest({ requester:'_scannerEnsureBackendCandles', reason:reason || 'scanner_chart_lookup', eventType:'Candle', timeframes:tfs, symbols:[symbol], action:'backend_warmup', detail:'POST /market/candles/ensure' });
  try {
    var wr = await fetch(BACKEND + '/market/candles/ensure', { method:'POST', headers:_backendAuthHeaders({ 'Content-Type':'application/json' }), body:JSON.stringify({ symbol:symbol, timeframes:tfs, reason:reason || 'scanner_chart_lookup' }), cache:'no-store', signal:AbortSignal.timeout(25000) });
    if (!wr.ok) { _noteBackendCandleFailure('warmup', wr.status, 'POST /market/candles/ensure ' + symbol); return { ok:false, fallbackReason:'ensure_http_' + wr.status }; }
    return { ok:true };
  } catch(e) { return { ok:false, fallbackReason:'ensure_error:' + ((e && e.message) || e) }; }
}
