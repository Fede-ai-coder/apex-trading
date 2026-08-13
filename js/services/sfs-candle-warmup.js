// ─────────────────────────────────────────────────────────────────────────────
// SFS candle warmup coordinator.
//
// The four function declarations below were extracted verbatim from the inline
// monolith in index.html (no behaviour change). They form the complete SFS
// warmup batch/queue/drain cycle. The warmup state (_sfsWarmupLastSentAt,
// _sfsWarmupQueue, _sfsWarmupQueuedKeys, _sfsWarmupDrainTimer) and the constants
// (SFS_WARMUP_BATCH_CAP, SFS_WARMUP_DEBOUNCE_MS) are declared in
// js/services/sfs-config-state.js, which loads before this file; they are resolved
// globally at call time. The runtime dependencies (BACKEND, S,
// _backendAuthHeaders, _recordCandleSubscriptionRequest,
// _sfsNormSymbolList, _sfsNormTimeframes) also stay where they are and are
// resolved globally when a function runs. This file is a classic (non-module)
// script: it declares functions only and executes nothing at load time.
// ─────────────────────────────────────────────────────────────────────────────
function _sfsWarmupDiag(reason, action, symbols, timeframes, detail, context) {
  _recordCandleSubscriptionRequest({
    requester: '_sfsWarmupBatch', reason: reason || 'squeeze_fire_chart_warmup',
    eventType: 'Candle', timeframes: timeframes, symbols: symbols, action: action,
    requestedSymbolsCount: (symbols || []).length, detail: detail, context: context || null
  });
}
function _sfsQueueWarmupSymbols(symbols, timeframes, reason, context) {
  var syms = _sfsNormSymbolList(symbols), tfs = _sfsNormTimeframes(timeframes);
  if (!syms.length || !tfs.length) return 0;
  var queued = 0;
  for (var i = 0; i < syms.length; i += SFS_WARMUP_BATCH_CAP) {
    var chunk = syms.slice(i, i + SFS_WARMUP_BATCH_CAP);
    var key = chunk.join(',') + '|' + tfs.join(',') + '|' + (reason || 'squeeze_fire_chart_warmup');
    if (_sfsWarmupQueuedKeys[key]) continue;
    _sfsWarmupQueuedKeys[key] = true;
    _sfsWarmupQueue.push({ symbols: chunk, timeframes: tfs, reason: reason || 'squeeze_fire_chart_warmup', context: context || null, key: key });
    queued += chunk.length;
  }
  if (queued && !_sfsWarmupDrainTimer) {
    _sfsWarmupDrainTimer = setTimeout(_sfsDrainWarmupQueue, SFS_WARMUP_DEBOUNCE_MS);
  }
  return queued;
}
function _sfsDrainWarmupQueue() {
  _sfsWarmupDrainTimer = null;
  if (!_sfsWarmupQueue.length) return;
  var item = _sfsWarmupQueue.shift();
  if (item && item.key) delete _sfsWarmupQueuedKeys[item.key];
  _sfsWarmupBatch(item.symbols, item.timeframes, {
    reason: item.reason,
    staged: true,
    context: Object.assign({}, item.context || {}, { staged: true })
  }).finally(function() {
    if (_sfsWarmupQueue.length && !_sfsWarmupDrainTimer) {
      _sfsWarmupDrainTimer = setTimeout(_sfsDrainWarmupQueue, SFS_WARMUP_DEBOUNCE_MS);
    }
  });
}

async function _sfsWarmupBatch(symbols, timeframes, opts) {
  opts = opts || {};
  var reason = opts.reason || 'squeeze_fire_chart_warmup';
  var requested = _sfsNormSymbolList(symbols);
  var tfs = _sfsNormTimeframes(timeframes);
  var capped = requested.slice(0, SFS_WARMUP_BATCH_CAP);
  var deferred = requested.slice(SFS_WARMUP_BATCH_CAP);
  var baseCtx = Object.assign({}, opts.context || {}, {
    originalRequestedSymbolsCount: requested.length,
    cappedSymbolCount: capped.length,
    deferredSymbolCount: deferred.length,
    cap: SFS_WARMUP_BATCH_CAP,
    staged: !!opts.staged
  });

  if (!requested.length || !tfs.length) {
    _sfsWarmupDiag(reason, 'skipped', capped, tfs, 'no_symbols_or_timeframes', baseCtx);
    return { ok: false, reason: 'no_symbols_or_timeframes' };
  }

  if (deferred.length) {
    var queued = _sfsQueueWarmupSymbols(deferred, tfs, reason, baseCtx);
    _sfsWarmupDiag(reason, 'queued', capped, tfs,
      'capped_to_' + SFS_WARMUP_BATCH_CAP + '; deferred=' + deferred.length + '; queued=' + queued,
      Object.assign({}, baseCtx, { queuedDeferredSymbolsCount: queued }));
  }

  var now = Date.now();
  var isLarge = requested.length > SFS_WARMUP_BATCH_CAP;
  var allowImmediate = !!opts.priority || capped.length <= 1 || !isLarge || (now - _sfsWarmupLastSentAt >= SFS_WARMUP_DEBOUNCE_MS);
  if (!allowImmediate) {
    var q = _sfsQueueWarmupSymbols(capped, tfs, reason, baseCtx);
    _sfsWarmupDiag(reason, 'cooldown_blocked', capped, tfs,
      'debounced; queued=' + q + '; waitMs=' + Math.max(0, SFS_WARMUP_DEBOUNCE_MS - (now - _sfsWarmupLastSentAt)), baseCtx);
    return { ok: false, reason: 'cooldown_blocked', queued: q };
  }

  _sfsWarmupLastSentAt = now;
  _sfsWarmupDiag(reason, 'sent', capped, tfs, 'POST /dev/market/candles-dxlink/warmup', baseCtx);
  try {
    var r = await fetch(BACKEND + '/dev/market/candles-dxlink/warmup', {
      method: 'POST',
      headers: _backendAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ symbols: capped, timeframes: tfs, waitMs: 15000 }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000)
    });
    return { ok: r.ok, status: r.status, sentSymbols: capped, deferredSymbols: deferred };
  } catch(e) {
    return { ok: false, reason: 'warmup:' + ((e && e.message) || e), sentSymbols: capped, deferredSymbols: deferred };
  }
}
