// ── FF_BACKEND_CANDLES_MCX_CHARTS helpers ─────────────────────────────────────
// Returns a fresh cache entry for symbol, or null if missing/stale.
function _mcxGetBackendCandleEntry(symbol) {
  var entry = _mcxBackendCandleCache[symbol];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > _MCX_BACKEND_CACHE_TTL) return null;
  return entry;
}

// Returns cached backend candle array for (symbol, tf), or null when unavailable.
function _mcxGetCachedBackendCandles(symbol, tf) {
  if (!ffBackendCandlesMcxCharts()) return null;
  var entry = _mcxGetBackendCandleEntry(symbol);
  if (!entry) return null;
  return tf === '1D' ? entry.candles1d : entry.candles4h;
}

// Newest finite bar time (epoch-ms) in a candle array, or null when unknown.
function _mcxNewestBarTime(candles) {
  if (!candles || !candles.length) return null;
  for (var i = candles.length - 1; i >= 0; i--) {
    var t = candles[i] && candles[i].time;
    if (t != null && isFinite(t)) return t;
  }
  return null;
}

// Stores a freshly fetched backend candle entry under a freshness guard so an
// OLDER backend candle set can never overwrite a NEWER one already cached
// (req #5 — never overwrite a newer value with an older cached value). The guard
// only blocks when BOTH newest-bar times are known and the incoming 1D series is
// strictly older than the cached one; in that case we keep the newer candles but
// reset fetchedAt so the TTL / auto-refresh cycle does not immediately re-warm.
// Returns the entry that is now active in the cache.
function _mcxStoreBackendCandleEntry(symbol, newEntry) {
  try {
    var prev = _mcxBackendCandleCache[symbol];
    if (prev && newEntry) {
      var prevT = _mcxNewestBarTime(prev.candles1d);
      var newT  = _mcxNewestBarTime(newEntry.candles1d);
      if (prevT != null && newT != null && newT < prevT) {
        prev.fetchedAt = (newEntry.fetchedAt != null) ? newEntry.fetchedAt : Date.now();
        console.log('[MCX][BACKEND-CANDLES] freshness-guard kept newer cache symbol=' + symbol +
          ' cachedBar=' + prevT + ' incomingBar=' + newT);
        return prev;
      }
    }
    _mcxBackendCandleCache[symbol] = newEntry;
    return newEntry;
  } catch (e) {
    _mcxBackendCandleCache[symbol] = newEntry;
    return newEntry;
  }
}

// Conservative staleness heuristic for backend candles. Returns true only when
// the freshest bar is *evidently* old vs. the current session, so we re-warm
// instead of charting a clearly stale cache. Tolerant of weekend/holiday gaps
// by design — we do NOT try to model the exact trading calendar (req C). An
// empty/insufficient series is NOT "stale" here (the cold-cache branch already
// warms on length < 20), so this returns false in that case.
function _mcxCandlesLookStale(candles, timeframe) {
  if (!candles || !candles.length) return false;
  var last = candles[candles.length - 1];
  var t = last && last.time;
  if (t == null || !isFinite(t)) return false;
  var ageMs = Date.now() - t;
  if (ageMs <= 0) return false;
  var DAY = 86400000;
  // 1D: allow a long weekend + a holiday (Fri close → Tue ≈ 4d) before flagging.
  // 4H: a single bar older than ~2 calendar days during an open week is stale.
  var maxAgeMs = (timeframe === '4H') ? (2 * DAY) : (4 * DAY);
  return ageMs > maxAgeMs;
}

// Fetches backend DXLink candles for a single MCX symbol.
// Called from _mcxRenderCharts() ONLY when ffBackendCandlesMcxCharts() is true.
// Never calls /market/candles.  Never uses Yahoo.  Never opens a frontend DXLink
// Candle subscription.  Does not use or mutate _pfBackendCandleCache.
//
// READ-FIRST, WARM-ONLY-IF-NEEDED (parity with _scannerFetchBackendCandlesForChart,
// PR #203).  A backend cached GET read is safe and never opens a backend Candle
// subscription, whereas /warmup may.  So we read 1D/4H from the backend cache
// first and only POST /warmup (once) when 1D is missing or insufficient, then
// re-read.  This keeps MCX auto-refresh from warming aggressively — the whole
// point of the migration.
//
// Data source policy: only /dev/market/candles-dxlink/:symbol and
// /dev/market/candles-dxlink/warmup — 4H is derived from 30M server-side.
//
// REFRESH POLICY (opts.forceRefresh):
//   Auto-refresh stays read-first/warm-only-if-needed (the migration's whole
//   point). But a *manual* MCX open must show genuinely fresh data, so callers
//   pass { forceRefresh: true } to warm BEFORE the final read even when the
//   backend cache already holds ≥20 bars. A conservative staleness check warms
//   even without forceRefresh when the cached bars look evidently old.
//   warmup always uses timeframes ['1D','30M'] (never '4H' — 4H is derived
//   server-side from 30M). When 1D is genuinely insufficient (cold cache), a
//   warmup failure is fatal; when we already have usable 1D (force/stale), a
//   warmup failure is non-fatal and we chart the cached data instead.
//
// Returns { ok: true, source, candles1d, candles4h, diagnostics }
//      or { ok: false, fallbackReason }
async function _mcxFetchBackendCandlesForChart(symbol, opts) {
  var _forceRefresh = !!(opts && opts.forceRefresh === true);
  if (!_backendCandleGateOpen()) {
    var _mgReason = _backendCandleGateReason();
    _recordCandleProvenance(_backendGateProvenanceSource(_mgReason), { symbol: symbol, view: 'market_context_chart', detail: _mgReason });
    return { ok: false, fallbackReason: _mgReason };
  }
  _recordCandleSubscriptionRequest({ requester:'_mcxFetchBackendCandlesForChart', reason:'mcx_chart_backend_candles', eventType:'Candle', timeframes:['1D','4H'], symbols:[symbol], action:'skipped', detail:'backend_cache_read_start', context:{ forceRefresh:_forceRefresh } });

  // Maps a normalized backend candle array to the chart shape, or null if <20 bars.
  var _mapCandles = function(norm) {
    if (!norm || norm.length < 20) return null;
    return norm.map(function(c) {
      return { time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v || 0, source: 'BACKEND_DXLINK_CANDLES' };
    });
  };

  // Cached GET of 1D candles.  Returns { candles } (candles is null when the
  // payload has <20 usable bars), { httpStatus } on non-OK, or { error } on throw.
  async function _read1d() {
    try {
      var _r1 = await fetch(
        BACKEND + '/dev/market/candles-dxlink/' + encodeURIComponent(symbol) + '?timeframe=1D',
        { headers: _backendAuthHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) }
      );
      if (!_r1.ok) { _noteBackendCandleFailure('candle_1d', _r1.status, 'GET 1D ' + symbol); return { httpStatus: _r1.status }; }
      _noteBackendCandleSuccess(_r1.status);
      var _j1 = await _r1.json();
      return { candles: _mapCandles(_apexParityNormCandleArray(_apexParityExtractBackendCandles(_j1))) };
    } catch (e) {
      return { error: (e && e.message) || String(e) };
    }
  }

  // Cached GET of 4H candles.  Non-fatal everywhere: returns mapped candles or null.
  var _diag4h = null; // backend 4H derivation diagnostics (source30mCount/derivationReason/missingReason)
  async function _read4h() {
    try {
      var _r4 = await fetch(
        BACKEND + '/dev/market/candles-dxlink/' + encodeURIComponent(symbol) + '?timeframe=4H',
        { headers: _backendAuthHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) }
      );
      if (!_r4.ok) { _noteBackendCandleFailure('candle_4h', _r4.status, 'GET 4H ' + symbol); return null; }
      _noteBackendCandleSuccess(_r4.status);
      var _j4 = await _r4.json();
      _diag4h = _extractBackend4hDiag(_j4);
      return _mapCandles(_apexParityNormCandleArray(_apexParityExtractBackendCandles(_j4)));
    } catch (e) {
      console.warn('[MCX][BACKEND-CANDLES] 4H fetch skipped (non-fatal) symbol=' + symbol + ':', (e && e.message) || e);
      return null;
    }
  }

  // POST /warmup with timeframes ['1D','30M'] only — 4H is derived server-side
  // from 30M, never requested directly. Returns { ok:true } or { ok:false, fallbackReason }.
  async function _warmup() {
    _recordCandleSubscriptionRequest({ requester:'_mcxFetchBackendCandlesForChart', reason:'mcx_chart_backend_candles', eventType:'Candle', timeframes:['1D','30M'], symbols:[symbol], action:'backend_warmup', detail:'POST /dev/market/candles-dxlink/warmup', context:{ forceRefresh:_forceRefresh } });
    try {
      var _wr = await fetch(BACKEND + '/dev/market/candles-dxlink/warmup', {
        method: 'POST',
        headers: _backendAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ symbols: [symbol], timeframes: ['1D', '30M'], waitMs: 15000 }),
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
      });
      if (!_wr.ok) { _noteBackendCandleFailure('warmup', _wr.status, 'POST warmup ' + symbol); return { ok: false, fallbackReason: 'warmup_http_' + _wr.status }; }
      return { ok: true };
    } catch (e) {
      return { ok: false, fallbackReason: 'warmup_error:' + ((e && e.message) || e) };
    }
  }

  // ── Step 1+2: read-first (cached GETs only — no warmup yet). ────────────────
  var _first1d = await _read1d();
  if (_first1d.error) return { ok: false, fallbackReason: '1D_error:' + _first1d.error };
  var _candles1d = _first1d.candles || null;
  var _candles4h = await _read4h();
  var _warmed = false;

  // ── Step 3: decide whether to warm. ─────────────────────────────────────────
  //   coldCache  → 1D missing/insufficient: MUST warm; warmup failure is fatal.
  //   forceRefresh → manual MCX open: warm even with a warm cache (req A/B).
  //   stale      → cached bars are evidently old: warm even without forceRefresh.
  var _coldCache = (!_candles1d || _candles1d.length < 20);
  var _stale = _mcxCandlesLookStale(_candles1d, '1D') || _mcxCandlesLookStale(_candles4h, '4H');
  if (_coldCache || _forceRefresh || _stale) {
    var _w = await _warmup();
    if (!_w.ok) {
      // Cold cache has nothing usable to fall back on → fatal.
      if (_coldCache) return { ok: false, fallbackReason: _w.fallbackReason };
      // force/stale but 1D already usable → keep cached data, don't blank the chart.
      console.warn('[MCX][BACKEND-CANDLES] warmup failed (non-fatal, charting cached) symbol=' +
        symbol + ' reason=' + _w.fallbackReason);
    } else {
      _warmed = true;
      // ── Step 4+5: re-read 1D and 4H after warmup. ───────────────────────────
      var _second1d = await _read1d();
      if (_second1d.error) {
        if (_coldCache) return { ok: false, fallbackReason: '1D_error:' + _second1d.error };
      } else if (_second1d.httpStatus) {
        if (_coldCache) return { ok: false, fallbackReason: '1D_http_' + _second1d.httpStatus };
      } else if (_second1d.candles) {
        _candles1d = _second1d.candles;
      } else if (_coldCache) {
        _candles1d = null;
      }
      // Re-read 4H too — warmup may have populated the 30M-derived 4H series.
      // Keep the prior 4H when the re-read comes back empty (4H stays non-fatal).
      var _re4h = await _read4h();
      if (_re4h) _candles4h = _re4h;
      else if (_coldCache) _candles4h = _re4h;
    }
  }

  // ── Step 6: 1D still unavailable after the optional warmup → fail. ──────────
  if (!_candles1d || _candles1d.length < 20) {
    return { ok: false, fallbackReason: '1D_insufficient:' + (_candles1d ? _candles1d.length : 0) };
  }

  // ── Step 7: 4H remains non-fatal in all cases. ─────────────────────────────
  return {
    ok: true,
    source: 'BACKEND_DXLINK_CANDLES',
    candles1d: _candles1d,
    candles4h: _candles4h,
    diagnostics: {
      symbol: symbol,
      warmed: _warmed,
      forceRefresh: _forceRefresh,
      candles1dCount: _candles1d.length,
      candles4hCount: _candles4h ? _candles4h.length : 0,
      diag4h: _diag4h,
    },
    diag4h: _diag4h,
  };
}

var _mcxBackendCandleCache = {}; // symbol → {candles1d,candles4h,source,fetchedAt} — FF_BACKEND_CANDLES_MCX_CHARTS
var _MCX_BACKEND_CACHE_TTL = 60000; // 60 s — reuse within one auto-refresh cycle
