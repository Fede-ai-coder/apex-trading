// ─────────────────────────────────────────────────────────────────────────────
// SFS SPY read-only benchmark resolver — extracted VERBATIM from index.html.
//
// Physical location only: the four declarations below are byte-identical to the
// ones that used to sit inline in the monolith. Behaviour, diagnostics, cooldown
// namespaces, warmup priority, bounded rereads and return shape are unchanged.
//
// This is a CLASSIC script: no module syntax, no pragma, no top-level code. The
// resolver STATE (_sfsSpyReadInflight / _sfsSpyReadCooldown), the four SFS_SPY_*
// constants and the shared helpers (_sfsSleep / _sfsCandlesFromSyncSource) stay
// declared in the monolith; they are resolved globally at CALL time, so this file
// must keep loading BEFORE the inline monolith and must never execute on load.
// ─────────────────────────────────────────────────────────────────────────────
function _sfsSpyDiag(tf, action, detail, context) {
  _recordCandleSubscriptionRequest({
    requester:'_sfsSpyReadOnly', reason:'sfs_spy_rs_warmup', eventType:'Candle',
    timeframe:tf, symbols:['SPY'], action:action, detail:detail || null,
    context:context || null
  });
}
function _sfsPromoteSpyCandles(tf, candles, path) {
  var cache = S.squeezeFireScanner.chartCacheCandles;
  if (!cache.SPY) cache.SPY = {};
  cache.SPY[tf] = candles;
  _sfsSpyDiag(tf, 'promoted', 'promoted_to_sfs_cache', { count:candles.length, path:path || null, usable:true });
  return candles;
}
function _sfsSpyReadResultContext(read, attempt, phase) {
  return {
    phase: phase || null,
    attempt: attempt != null ? attempt : null,
    ok: !!(read && read.ok),
    status: read && read.status != null ? read.status : null,
    count: read && read.count != null ? read.count : ((read && read.candles) ? read.candles.length : 0),
    reason: (read && read.reason) || null,
    usable: !!(read && _sfsCandlesUsable(read.candles))
  };
}
async function _sfsSpyReadOnly(tf) {
  var sync = _sfsCandlesFromSyncSource('SPY', tf);          // in-memory cache / buffer
  if (sync) {
    _sfsSpyDiag(tf, 'sync_hit', sync.path || 'sync', { count: sync.candles.length, usable:true });
    return Promise.resolve(sync.candles);
  }
  _sfsSpyDiag(tf, 'sync_miss', 'no_sfs_cache_or_dxlink_buffer', null);
  if (_sfsSpyReadInflight[tf]) {
    _sfsSpyDiag(tf, 'deduped', 'inflight_read_or_warmup', null);
    return _sfsSpyReadInflight[tf];
  }
  var now = Date.now();
  if (_sfsSpyReadCooldown[tf] && now < _sfsSpyReadCooldown[tf]) {
    _sfsSpyDiag(tf, 'cooldown_blocked', 'read_cooldown', { waitMs: _sfsSpyReadCooldown[tf] - now });
    return Promise.resolve(null);
  }
  if (typeof _sfsFetchBackendCandles !== 'function') {
    _sfsSpyDiag(tf, 'skipped', 'missing_fetch_helper', null);
    return Promise.resolve(null);
  }
  var p = (async function() {
    var finalReason = 'unknown';
    try {
      var read = await _sfsFetchBackendCandles('SPY', tf);   // pure GET — never subscribes
      _sfsSpyDiag(tf, 'backend_read', 'first_backend_read', _sfsSpyReadResultContext(read, 0, 'pre_warmup'));
      if (read && read.ok && _sfsCandlesUsable(read.candles)) {
        return _sfsPromoteSpyCandles(tf, read.candles, 'first_backend_read');
      }
      var bodyReason = (read && read.reason) || '';
      if (_sfsCandleSubLimitActive() || /subscription/i.test(String(bodyReason))) {
        finalReason = 'SUBSCRIPTION_LIMIT';
        _sfsSpyReadCooldown[tf] = Date.now() + SFS_SPY_READ_COOLDOWN_MS;
        _sfsSpyDiag(tf, 'skipped', 'subscription_limit_or_backend_reason', { bodyReason:bodyReason || null, finalReason:finalReason });
        return null;
      }
      var warmKey = 'SPY|' + tf;
      if (_sfsSpyReadCooldown[warmKey] && Date.now() < _sfsSpyReadCooldown[warmKey]) {
        finalReason = 'SPY_WARMUP_COOLDOWN';
        _sfsSpyDiag(tf, 'cooldown_blocked', 'spy_single_symbol_warmup_cooldown', { waitMs:_sfsSpyReadCooldown[warmKey] - Date.now(), finalReason:finalReason });
        return null;
      }
      _sfsSpyReadCooldown[warmKey] = Date.now() + SFS_SPY_WARM_COOLDOWN_MS;
      var warm = await _sfsWarmupBatch(['SPY'], [tf === '4H' ? '30M' : tf], { reason:'sfs_spy_rs_warmup', priority:true, context:{ requestedTimeframe:tf, singleSymbol:true } });
      _sfsSpyDiag(tf, warm && warm.ok ? 'sent' : 'skipped', 'spy_single_symbol_warmup_result', {
        warmupOk: !!(warm && warm.ok), status: warm && warm.status != null ? warm.status : null,
        reason: (warm && warm.reason) || null, sentSymbols: (warm && warm.sentSymbols) || ['SPY'],
        requestedWarmupTimeframes: [tf === '4H' ? '30M' : tf]
      });
      if (!warm || !warm.ok) {
        finalReason = (warm && warm.reason) || 'WARMUP_FAILED';
        _sfsSpyReadCooldown[tf] = Date.now() + SFS_SPY_READ_COOLDOWN_MS;
        _sfsSpyDiag(tf, 'skipped', 'final_null', { finalReason:finalReason });
        return null;
      }

      // Backend 4H is derived from the warmed 30M series and can lag the warmup
      // response. Re-read a bounded number of times with short backoff; never warm
      // again inside this flow.
      var attempts = Math.max(1, SFS_SPY_POST_WARM_READ_ATTEMPTS || 1);
      var delay = Math.max(0, SFS_SPY_POST_WARM_RETRY_DELAY_MS || 0);
      for (var attempt = 1; attempt <= attempts; attempt++) {
        if (attempt > 1 && delay) await _sfsSleep(delay * (attempt - 1));
        var reread = await _sfsFetchBackendCandles('SPY', tf);
        var ctx = _sfsSpyReadResultContext(reread, attempt, 'post_warmup');
        _sfsSpyDiag(tf, 'backend_reread', 'post_warmup_reread_attempt_' + attempt, ctx);
        if (reread && reread.ok && _sfsCandlesUsable(reread.candles)) {
          return _sfsPromoteSpyCandles(tf, reread.candles, 'post_warmup_reread_attempt_' + attempt);
        }
        finalReason = ctx.reason || (ctx.count < 22 ? 'INSUFFICIENT_CANDLES_' + ctx.count : 'UNUSABLE_CANDLES');
      }
      _sfsSpyReadCooldown[tf] = Date.now() + SFS_SPY_READ_COOLDOWN_MS;  // back off; do not hammer
      _sfsSpyDiag(tf, 'skipped', 'final_null', { finalReason:finalReason, attempts:attempts });
      return null;
    } catch (e) {
      finalReason = 'EXCEPTION:' + ((e && e.message) || e);
      _sfsSpyReadCooldown[tf] = Date.now() + SFS_SPY_READ_COOLDOWN_MS;
      _sfsSpyDiag(tf, 'skipped', 'final_null_exception', { finalReason:finalReason });
      return null;
    } finally {
      delete _sfsSpyReadInflight[tf];
    }
  })();
  _sfsSpyReadInflight[tf] = p;
  return p;
}
