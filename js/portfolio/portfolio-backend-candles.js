// ── FF_BACKEND_CANDLES_PORTFOLIO_CHARTS helper ────────────────────────────────
// Fetches backend candle-store candles for Portfolio inline charts.
// Called from _pfDrawChart() ONLY when ffBackendCandlesPortfolioCharts() is true.
// Never uses Yahoo.  Never opens a frontend DXLink Candle subscription.
//
// READ-FIRST, WARM-ONLY-IF-NEEDED.  The deploy-preview QQQ failure showed the
// older /dev/market/candles-dxlink/:symbol path returning 0 bars while the app's
// candle-store chart path can serve QQQ via /market/candles?symbol=QQQ.  Portfolio
// chart reads now use that same single-symbol backend-backed candle-store source.
//
// Data source policy: only /market/candles and /market/candles/ensure — 4H is
// derived from 30M server-side.  Calls are for the expanded active symbol only.
//
// Returns { ok: true, source, candles1d, candles4h, diagnostics }
//      or { ok: false, fallbackReason }
async function _portfolioFetchBackendCandlesForChart(symbol) {
  symbol = String(symbol || '').trim().toUpperCase();
  if (!_backendCandleGateOpen()) {
    var _pgReason = _backendCandleGateReason();
    _recordCandleProvenance(_backendGateProvenanceSource(_pgReason), { symbol: symbol, view: 'portfolio_chart', detail: _pgReason });
    return { ok: false, fallbackReason: _pgReason };
  }
  _recordCandleSubscriptionRequest({ requester:'_portfolioFetchBackendCandlesForChart', reason:'portfolio_chart_backend_candles', eventType:'Candle', timeframes:['1D','4H'], symbols:[symbol], action:'skipped', detail:'backend_candle_store_read_start' });

  var _shapeLogged = false;
  function _jsonShape(json) {
    if (!json || typeof json !== 'object') return typeof json;
    var keys = Object.keys(json).slice(0, 12);
    var out = { keys: keys };
    ['candles','bars','data','result','timeframes','candlesByTimeframe','derived','count','missingReason','reason','ok'].forEach(function(k) {
      if (json[k] == null) return;
      if (Array.isArray(json[k])) out[k] = 'array(' + json[k].length + ')';
      else if (typeof json[k] === 'object') out[k] = 'object(' + Object.keys(json[k]).slice(0, 8).join(',') + ')';
      else out[k] = typeof json[k] + ':' + String(json[k]).slice(0, 80);
    });
    return out;
  }
  function _extractCandlesForTf(json, tf) {
    var raw = _apexParityExtractBackendCandles(json);
    if (raw && raw.length) return raw;
    if (!json || !tf) return raw || [];
    var keys = [tf, String(tf).toLowerCase(), String(tf).replace(/[^A-Za-z0-9]/g, '')];
    var roots = [json, json.result, json.data, json.timeframes, json.candlesByTimeframe, json.derived,
      json.result && json.result.timeframes, json.result && json.result.candlesByTimeframe, json.result && json.result.derived];
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      if (!root || typeof root !== 'object') continue;
      for (var k = 0; k < keys.length; k++) {
        var node = root[keys[k]];
        if (!node) continue;
        if (Array.isArray(node)) return node;
        var nested = _apexParityExtractBackendCandles(node);
        if (nested && nested.length) return nested;
      }
    }
    return raw || [];
  }
  // Maps a normalized backend candle array to the chart shape, or null if <20 bars.
  var _mapCandles = function(norm) {
    if (!norm || norm.length < 20) return null;
    return norm.map(function(c) {
      return { time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v || 0, source: 'BACKEND_CANDLE_STORE' };
    });
  };

  async function _readTf(tf, opts) {
    opts = opts || {};
    var _url = BACKEND + '/market/candles?symbol=' + encodeURIComponent(symbol) + '&timeframe=' + encodeURIComponent(tf) + '&limit=300';
    try {
      console.log('[PORTFOLIO][CHART][BACKEND-CANDLES] read endpoint symbol=' + symbol + ' tf=' + tf + ' url=' + _url);
      var _r = await fetch(_url, { headers: _backendAuthHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!_r.ok) { _noteBackendCandleFailure(tf === '4H' ? 'candle_4h' : 'candle_1d', _r.status, 'GET ' + tf + ' ' + symbol); return { ok:false, httpStatus:_r.status, endpoint:_url, count:0 }; }
      _noteBackendCandleSuccess(_r.status);
      var _j = await _r.json();
      var _diag = (tf === '4H' && typeof _extractBackend4hDiag === 'function') ? _extractBackend4hDiag(_j) : null;
      var _raw = _extractCandlesForTf(_j, tf);
      var _norm = _apexParityNormCandleArray(_raw);
      var _candles = _mapCandles(_norm);
      var _count = _candles ? _candles.length : (_norm ? _norm.length : ((typeof _j.count === 'number') ? _j.count : 0));
      if ((!_candles || _candles.length < 20) && !_shapeLogged && (tf === '1D' || opts.logShape)) {
        _shapeLogged = true;
        console.warn('[PORTFOLIO][CHART][BACKEND-CANDLES] response shape symbol=' + symbol + ' tf=' + tf + ' count=' + _count, _jsonShape(_j));
      }
      return { ok:!!(_candles && _candles.length >= 20), candles:_candles || null, count:_count, diag:_diag, endpoint:_url, missingReason:(_j && (_j.missingReason || _j.reason)) || null };
    } catch (e) {
      return { ok:false, error:(e && e.message) || String(e), endpoint:_url, count:0 };
    }
  }

  async function _ensure() {
    _recordCandleSubscriptionRequest({ requester:'_portfolioFetchBackendCandlesForChart', reason:'portfolio_chart_backend_candles', eventType:'Candle', timeframes:['1D','30M','4H'], symbols:[symbol], action:'backend_warmup', detail:'POST /market/candles/ensure' });
    try {
      var _wr = await fetch(BACKEND + '/market/candles/ensure', {
        method: 'POST',
        headers: _backendAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ symbol: symbol, timeframes: ['1D','30M','4H'], reason: 'portfolio_chart_backend_candles' }),
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
      });
      if (!_wr.ok) { _noteBackendCandleFailure('warmup', _wr.status, 'POST /market/candles/ensure ' + symbol); return { ok:false, fallbackReason:'ensure_http_' + _wr.status }; }
      return { ok:true };
    } catch (e) {
      return { ok:false, fallbackReason:'ensure_error:' + ((e && e.message) || e) };
    }
  }

  var _first1d = await _readTf('1D');
  if (_first1d.error) return { ok:false, fallbackReason:'1D_error:' + _first1d.error };
  if (_first1d.httpStatus) return { ok:false, fallbackReason:'1D_http_' + _first1d.httpStatus };
  var _first4h = await _readTf('4H');
  var _candles1d = _first1d.ok ? _first1d.candles : null;
  var _candles4h = _first4h && _first4h.ok ? _first4h.candles : null;
  var _diag4h = _first4h ? _first4h.diag : null;
  var _warmed = false;

  if (!_candles1d || _candles1d.length < 20) {
    var _ens = await _ensure();
    if (!_ens.ok) return { ok:false, fallbackReason:_ens.fallbackReason || 'ensure_failed' };
    _warmed = true;
    var _second1d = await _readTf('1D', { logShape:true });
    if (_second1d.error)      return { ok:false, fallbackReason:'1D_error:' + _second1d.error };
    if (_second1d.httpStatus) return { ok:false, fallbackReason:'1D_http_' + _second1d.httpStatus };
    _candles1d = _second1d.ok ? _second1d.candles : null;
    var _second4h = await _readTf('4H');
    _candles4h = _second4h && _second4h.ok ? _second4h.candles : _candles4h;
    _diag4h = _second4h ? _second4h.diag : _diag4h;
  }

  if (!_candles1d || _candles1d.length < 20) {
    return { ok: false, fallbackReason: '1D_insufficient:' + (_candles1d ? _candles1d.length : 0) };
  }

  return {
    ok: true,
    source: 'BACKEND_CANDLE_STORE',
    candles1d: _candles1d,
    candles4h: _candles4h,
    diagnostics: {
      symbol: symbol,
      warmed: _warmed,
      candles1dCount: _candles1d.length,
      candles4hCount: _candles4h ? _candles4h.length : 0,
      diag4h: _diag4h,
    },
    diag4h: _diag4h,
  };
}
