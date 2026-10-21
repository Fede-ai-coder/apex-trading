async function _apexParityWarmupBackend(symbol, timeframe, waitMs) {
  var tfs = _apexParityWarmupTimeframes(timeframe);
  if (!tfs.length) {
    _recordCandleSubscriptionRequest({ requester:'_apexParityWarmupBackend', reason:'parity_debug_warmup', eventType:'Candle', timeframe:timeframe, symbols:symbol, action:'skipped', detail:'no_warmup_timeframe' });
    return { ok: false, reason: 'no warmup timeframe for ' + timeframe };
  }
  var body = { symbols: [symbol], timeframes: tfs, waitMs: waitMs };
  _recordCandleSubscriptionRequest({ requester:'_apexParityWarmupBackend', reason:'parity_debug_warmup', eventType:'Candle', timeframes:tfs, symbols:[symbol], action:'backend_warmup', detail:'POST /dev/market/candles-dxlink/warmup', context:{ requestedTimeframe:timeframe, waitMs:waitMs } });
  var r = await fetch(BACKEND + '/dev/market/candles-dxlink/warmup', {
    method: 'POST',
    headers: _backendAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(Math.max(5000, (waitMs || 0) + 10000)),
  });
  var json = null; try { json = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, request: body, response: json };
}

async function _apexParityFetchBackend(symbol, timeframe) {
  var url = BACKEND + '/dev/market/candles-dxlink/' + encodeURIComponent(symbol)
    + '?timeframe=' + encodeURIComponent(timeframe);
  var r = await fetch(url, {
    headers: _backendAuthHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  var json = null; try { json = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, json: json };
}
