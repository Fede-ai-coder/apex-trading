// ─────────────────────────────────────────────────────────────────────────────
// CANDLE DXLINK CLIENT — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith and AFTER the other
// already-extracted candle modules. Holds the single low-level DXLink candle read
// primitive below — a pure GET against the per-symbol dxlink candles endpoint that
// normalizes the response through the shared parity helpers and returns a plain
// structured result. It owns NO application state of its own: it declares no
// constants, keeps no response cache, no concurrency or dedupe state, and no
// timers; it performs no request and no DOM access at load time. Read-first
// orchestration and every higher-level read path remain external, in the inline
// monolith, exactly as before.
//
// Every runtime dependency (the BACKEND base URL, the auth-header builder, the
// auth-ready gate, the failure/success notes, the response extractor + candle
// normalizer and the provenance recorder) is resolved LEXICALLY as a global at
// CALL time — never read while this file loads — so the earlier load order creates
// no TDZ. This extraction changes the physical location of the one function only;
// its signature, endpoint, headers, timeout, normalization, provenance, error
// reasons and return shape are unchanged.
// ─────────────────────────────────────────────────────────────────────────────
// ─── Fetch backend candles for one symbol/timeframe ───────────────────────────
// Pure cached READ (GET) — never opens a DXLink subscription. Returns
// { ok, candles, status, count, reason }. Body is normalized via the shared
// parity extractor/normalizer (accepts candles|bars|data|result.candles and
// c|close field names), so field-shape differences are handled here.
async function _sfsFetchBackendCandles(symbol, tf) {
  // AUTH-READY / BACKOFF GATE — never fan out SFS backend candle GETs before auth
  // exists (would 401 across the scan universe) or during a 401 backoff window.
  if (!_backendCandleGateOpen()) {
    var _sgReason = _backendCandleGateReason();
    if (typeof _recordCandleProvenance === 'function') _recordCandleProvenance(_backendGateProvenanceSource(_sgReason), { symbol: symbol, view: 'sfs_chart', detail: _sgReason + ' tf=' + tf });
    return { ok: false, status: 0, count: 0, reason: _sgReason };
  }
  try {
    var url = BACKEND + '/dev/market/candles-dxlink/' + encodeURIComponent(symbol) + '?timeframe=' + encodeURIComponent(tf);
    var r = await fetch(url, {
      headers: _backendAuthHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) { _noteBackendCandleFailure('sfs_candle', r.status, 'GET ' + tf + ' ' + symbol); return { ok: false, status: r.status, count: 0, reason: 'http_' + r.status }; }
    _noteBackendCandleSuccess(r.status);
    var json = null;
    try { json = await r.json(); } catch(e) { return { ok: false, status: r.status, count: 0, reason: 'json_parse' }; }
    var raw = _sfsExtractBackendCandles(json, tf);
    var normed = _apexParityNormCandleArray(raw);
    var candles = normed.map(function(c) {
      // `c.v` is the backend's real volume, preserved by _apexParityNormCandle (which
      // already normalizes an absent/invalid one to 0). `|| 0` is kept only as a
      // belt-and-braces default; it must never be the thing that zeroes real volume.
      return { time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v || 0 };
    });
    // Surface a backend-reported error/reason even on HTTP 200 (e.g. subscription
    // limit) so callers can log it rather than silently treating it as empty.
    var bodyReason = json && (json.error || json.reason || json.message) || null;
    return { ok: true, status: r.status, count: candles.length, candles: candles,
      reason: candles.length ? null : (bodyReason || 'empty') };
  } catch(e) {
    return { ok: false, status: 0, count: 0, reason: 'fetch:' + ((e && e.message) || e) };
  }
}
