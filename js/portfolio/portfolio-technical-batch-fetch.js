async function _fetchPortfolioTechnicalBatch(batchSymbols, timeframes, perBatchTimeoutMs, isLatestSeqFn) {
  var t0 = Date.now();
  try {
    var res = await fetch(BACKEND + '/portfolio/technical-refresh', {
      method: 'POST',
      headers: _backendAuthHeaders({'Content-Type': 'application/json'}),
      cache: 'no-store',
      body: JSON.stringify({ symbols: batchSymbols, benchmark: 'SPY', timeframes: timeframes }),
      signal: AbortSignal.timeout(perBatchTimeoutMs)
    });
    if (!res.ok) {
      return { ok: false, reason: 'http_not_ok', status: res.status, errorMessage: 'HTTP ' + res.status, durationMs: Date.now() - t0, symbols: batchSymbols, timeframes: timeframes };
    }
    try {
      var data = await res.json();
      if (typeof isLatestSeqFn === 'function' && !isLatestSeqFn()) {
        return { ok: false, reason: 'stale_seq', durationMs: Date.now() - t0, symbols: batchSymbols, timeframes: timeframes };
      }
      return { ok: true, data: data, durationMs: Date.now() - t0, symbols: batchSymbols, timeframes: timeframes };
    } catch (parseErr) {
      var parseErrName = parseErr && parseErr.name || 'Error';
      var parseReason = parseErrName === 'AbortError' ? 'aborted_json_parse' : 'invalid_json';
      return { ok: false, reason: parseReason, status: res.status, errorName: parseErrName, errorMessage: parseErr && parseErr.message || String(parseErr), durationMs: Date.now() - t0, symbols: batchSymbols, timeframes: timeframes };
    }
  } catch (e) {
    var errName = e && e.name ? e.name : 'Error';
    var errMessage = e && e.message ? e.message : String(e);
    var reason = errName === 'AbortError' ? 'timeout' : 'request_error';
    return { ok: false, reason: reason, errorName: errName, errorMessage: errMessage, durationMs: Date.now() - t0, symbols: batchSymbols, timeframes: timeframes };
  }
}
