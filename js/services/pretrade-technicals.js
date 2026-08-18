async function _fetchPretradeBackendCandles(ticker, price) {
  // AUTH-READY / BACKOFF GATE — share the same guard as the chart funnels so the
  // pre-trade snapshot path can never contribute to a 401 storm either.
  if (!_backendCandleGateOpen()) {
    return { ok: false, fallbackReason: _backendCandleGateReason() };
  }
  // Step 1: warm backend candles (1D + 30M; 4H is derived from 30M server-side).
  _recordCandleSubscriptionRequest({ requester:'_fetchPretradeBackendCandles', reason:'pretrade_backend_candles', eventType:'Candle', timeframes:['1D','30M'], symbols:[ticker], action:'backend_warmup', detail:'POST /dev/market/candles-dxlink/warmup' });
  try {
    var _wr = await fetch(BACKEND + '/dev/market/candles-dxlink/warmup', {
      method: 'POST',
      headers: _backendAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ symbols: [ticker], timeframes: ['1D', '30M'], waitMs: 15000 }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });
    if (!_wr.ok) {
      _noteBackendCandleFailure('pretrade_warmup', _wr.status, 'POST warmup ' + ticker);
      return { ok: false, fallbackReason: 'warmup_http_' + _wr.status };
    }
  } catch (e) {
    return { ok: false, fallbackReason: 'warmup_error:' + ((e && e.message) || e) };
  }

  // Step 2: fetch 1D candles (required).
  var _candles1d = null;
  try {
    var _r1 = await fetch(
      BACKEND + '/dev/market/candles-dxlink/' + encodeURIComponent(ticker) + '?timeframe=1D',
      { headers: _backendAuthHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) }
    );
    if (!_r1.ok) return { ok: false, fallbackReason: '1D_http_' + _r1.status };
    var _j1 = await _r1.json();
    _candles1d = _apexParityNormCandleArray(_apexParityExtractBackendCandles(_j1));
  } catch (e) {
    return { ok: false, fallbackReason: '1D_error:' + ((e && e.message) || e) };
  }
  if (!_candles1d || _candles1d.length < 20) {
    return { ok: false, fallbackReason: '1D_insufficient:' + (_candles1d ? _candles1d.length : 0) };
  }

  // Step 3: fetch 4H candles (non-fatal — 4H is derived from 30M server-side).
  var _candles4h = null;
  try {
    var _r4 = await fetch(
      BACKEND + '/dev/market/candles-dxlink/' + encodeURIComponent(ticker) + '?timeframe=4H',
      { headers: _backendAuthHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) }
    );
    if (_r4.ok) {
      var _j4 = await _r4.json();
      var _norm4 = _apexParityNormCandleArray(_apexParityExtractBackendCandles(_j4));
      if (_norm4 && _norm4.length >= 20) _candles4h = _norm4;
    }
  } catch (e) {
    console.warn('[PRETRADE][BACKEND-CANDLES] 4H fetch skipped (non-fatal):', (e && e.message) || e);
  }

  var _tech1d = _calcTechnicalsFromCandles(_candles1d, null, price);
  var _tech4h  = _candles4h ? _calcTechnicalsFromCandles(_candles4h, null, price) : null;

  return { ok: true, technicals1d: _tech1d, technicals4h: _tech4h };
}

// Enriches missing technical fields in a pre-built snapshot using backend candles.
// Called inside submitTrade() after _buildRichSnapshot() and before runPreTradeRiskCheck().
// Only runs when indicatorSource is UNAVAILABLE (DXLink buffer not yet warm).
// Uses the existing _calcTechnicalsFromCandles() engine — no duplicate logic.
// Never overwrites IVR, Greeks, VIX, or any field already set by _buildRichSnapshot().
async function ensurePreTradeTechnicals(ticker, snapshot) {
  // ── Argument normalization ─────────────────────────────────────────────────
  // Supports two calling conventions without breaking the production call site:
  //   ensurePreTradeTechnicals(ticker, snapshot)  ← submitTrade() call site
  //   ensurePreTradeTechnicals(snapshotObject)    ← single-arg console / test form
  if (ticker !== null && typeof ticker === 'object') {
    snapshot = ticker; // first arg IS the snapshot; shift.
    ticker   = null;
  }
  // Resolve ticker string from snapshot fields when not yet provided.
  if (!ticker && snapshot) {
    var _rt = snapshot.ticker || snapshot.symbol || snapshot.underlying || snapshot.underlyingSymbol || null;
    ticker = _rt ? String(_rt).trim().toUpperCase() : null;
  } else if (ticker) {
    ticker = String(ticker).trim().toUpperCase() || null;
  }

  // Already have technicals from DXLink — nothing to do.
  if (snapshot && snapshot.indicatorSource && snapshot.indicatorSource !== 'UNAVAILABLE' &&
      (snapshot.rsi14 != null || snapshot.sma20 != null || snapshot.sma30 != null)) {
    return snapshot;
  }
  if (!ticker) {
    if (ffBackendCandlesPretradeSnapshot()) {
      return Object.assign({}, snapshot || {}, {
        technicalSource:         'BACKEND_DXLINK_CANDLES_UNAVAILABLE',
        technicalFallbackReason: 'missing_ticker',
      });
    }
    return snapshot;
  }

  // Resolve price — check multiple snapshot field names in priority order.
  var price = snapshot
    ? (snapshot.underlyingPrice != null ? snapshot.underlyingPrice
       : snapshot.price         != null ? snapshot.price
       : snapshot.close         != null ? snapshot.close
       : null)
    : null;
  var _technicalFallbackReason = null;

  // ── FF_BACKEND_CANDLES_PRETRADE_SNAPSHOT — backend DXLink path (dev-only) ────
  // When enabled, uses backend DXLink candles exclusively — no Yahoo fallback.
  // On success: returns snapshot enriched with backend technicals.
  // On failure: returns snapshot with BACKEND_DXLINK_CANDLES_UNAVAILABLE — does NOT
  //             fall through to the legacy /market/candles (Yahoo-backed) path below.
  if (ffBackendCandlesPretradeSnapshot()) {
    var _bcp = null;
    try { _bcp = await _fetchPretradeBackendCandles(ticker, price); } catch (e) {
      _bcp = { ok: false, fallbackReason: 'threw:' + ((e && e.message) || e) };
    }
    if (_bcp && _bcp.ok) {
      console.log('[PRETRADE][TECH] source=BACKEND_DXLINK_CANDLES ticker=' + ticker +
        ' 4H=' + (_bcp.technicals4h ? 'ok' : 'unavailable'));
      return Object.assign({}, snapshot, _bcp.technicals1d, {
        tech1d:                 _bcp.technicals1d,
        tech4h:                 _bcp.technicals4h,
        indicatorSource:        'BACKEND_DXLINK_CANDLES',
        indicatorMissingReason: null,
        technicalSource:        'BACKEND_DXLINK_CANDLES',
      });
    }
    _technicalFallbackReason = (_bcp && _bcp.fallbackReason) || 'unknown';
    console.warn('[PRETRADE][TECH] backend candle path unavailable; no Yahoo fallback because FF_BACKEND_CANDLES_PRETRADE_SNAPSHOT is enabled');
    return Object.assign({}, snapshot, {
      technicalSource:         'BACKEND_DXLINK_CANDLES_UNAVAILABLE',
      technicalFallbackReason: _technicalFallbackReason,
    });
  }

  // Fetch candles from Railway backend (server-side Yahoo, 300 days, no CORS).
  var candles = null;
  try {
    console.log('[CandleAudit] Pre-trade technical fallback requesting candles', { ticker: ticker, reason: 'snapshot_indicator_unavailable' });
    candles = await fetchCandles(ticker);
  } catch(e) {
    console.log('[PRETRADE][TECH] unavailable ticker='+ticker+' reason=CANDLE_FETCH_ERROR err='+e.message);
    return snapshot;
  }
  if (!candles || candles.length < 20) {
    console.log('[PRETRADE][TECH] unavailable ticker='+ticker+' reason='+(!candles?'NO_CANDLES':'INSUFFICIENT_CLOSES_'+candles.length));
    return snapshot;
  }

  // SPY for RS computation: prefer DXLink 1D buffer, then scanData daily candles.
  var spyCandles = null;
  var _spyBuf = (_candleBuffer['SPY'] || {})['1D'];
  if (_spyBuf && _spyBuf.length >= 21) {
    spyCandles = _spyBuf;
  } else {
    var _spySd = S.scanData && S.scanData.find(function(x) { return x.ticker === 'SPY'; });
    if (_spySd && _spySd.candles && _spySd.candles.length >= 21) spyCandles = _spySd.candles;
  }

  var techs = _calcTechnicalsFromCandles(candles, spyCandles, price);

  // Compute bias for log only — mirrors _ptBias() logic.
  var _logBias = 'UNKNOWN';
  if (techs.rsi14 != null || techs.sma20 != null) {
    var _b = 0, _r = 0, _tot = 0;
    if (techs.rsi14 != null) { _tot++; if (techs.rsi14 > 55) _b++; else if (techs.rsi14 < 45) _r++; }
    if (techs.sma20 != null && techs.sma30 != null) { _tot++; if (techs.sma20 > techs.sma30) _b++; else _r++; }
    if (techs.distFromSma20 != null) { _tot++; if (techs.distFromSma20 > 0) _b++; else _r++; }
    if (_tot > 0) _logBias = _b > _r ? 'LONG' : _r > _b ? 'SHORT' : 'NEUTRAL';
  }
  console.log('[PRETRADE][TECH] enriched ticker='+ticker+
    ' source=backend_candles rsi='+techs.rsi14+
    ' sma20='+techs.sma20+' sma30='+techs.sma30+' bias='+_logBias);

  return Object.assign({}, snapshot, techs, {
    indicatorSource:        'backend_candles',
    indicatorMissingReason: null,
    technicalSource:        'backend_candles',
    technicalFallbackReason: _technicalFallbackReason || null,
  });
}