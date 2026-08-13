// ─────────────────────────────────────────────────────────────────────────────
// SFS generic-timeframe candle ensure.
//
// The single function declaration below was extracted VERBATIM from the inline
// monolith in index.html (no behaviour change). It is the SFS generic-timeframe
// candle ensure: read-first, ONE post-warmup re-read, per-(sym|tf) in-flight dedupe
// and warmup cooldown. The in-flight / cooldown / last-failure-reason state
// (_sfsTfFetchInflight, _sfsWarmupCooldown, _sfsLastFailReason) and the
// SFS_WARMUP_COOLDOWN_MS constant are declared in js/services/sfs-config-state.js,
// which loads before this file; they are shared with other SFS flows and are
// resolved globally at call time. The runtime dependencies (S, _sfsCandlesUsable,
// _sfsFetchBackendCandles,
// _sfsCandleSubLimitActive, _sfsWarmupBatch, _recordCandleProvenance, debugLog,
// debugWarn, Date.now) also stay where they are and are resolved globally when the
// function runs. This file is a classic (non-module) script: it declares one
// function only and executes nothing at load time.
// ─────────────────────────────────────────────────────────────────────────────
async function _sfsEnsureTfCandles(sym, tf) {
  try {
    var cache = S.squeezeFireScanner.chartCacheCandles;
    var have  = (cache[sym] && cache[sym][tf]) ? cache[sym][tf] : null;
    if (_sfsCandlesUsable(have)) return have;

    var key = sym + '|' + tf;
    if (_sfsTfFetchInflight[key]) return _sfsTfFetchInflight[key];

    var p = (async function() {
      try {
        // 1) Cached READ first — no subscription added. Often already warm from
        //    a prior scan, another SFS symbol, or another panel.
        var read = await _sfsFetchBackendCandles(sym, tf);
        if (read && read.ok && _sfsCandlesUsable(read.candles)) {
          if (!cache[sym]) cache[sym] = {};
          cache[sym][tf] = read.candles;
          delete _sfsLastFailReason[key];
          delete _sfsWarmupCooldown[key];
          if (typeof _recordCandleProvenance === 'function') _recordCandleProvenance('backend_cache', { symbol: sym, view: 'sfs_chart', detail: 'tf=' + tf + ' count=' + read.count });
          debugLog('sfs', '[SFS RS] sym=' + sym + ' tf=' + tf + ' path=backendRead ok=true count=' + read.count + ' status=OK');
          return read.candles;
        }

        var now = Date.now();
        var subLimit = _sfsCandleSubLimitActive() || /subscription/i.test(String((read && read.reason) || ''));

        // 2a) Do NOT warm while the Candle subscription limit is active — warmup
        //     would fail and add pressure. Record reason, back off, bail.
        if (subLimit) {
          _sfsLastFailReason[key] = 'SUBSCRIPTION_LIMIT';
          _sfsWarmupCooldown[key] = now + SFS_WARMUP_COOLDOWN_MS;
          debugWarn('sfs', '[SFS RS] sym=' + sym + ' tf=' + tf + ' path=backendRead count=' +
            (read ? read.count : 0) + ' reason=SUBSCRIPTION_LIMIT (warmup skipped)');
          return null;
        }

        // 2b) Recent warmup for this series already failed — skip re-warming while
        //     in cooldown so ArrowUp/ArrowDown browsing doesn't spam warmups.
        if (_sfsWarmupCooldown[key] && now < _sfsWarmupCooldown[key]) {
          debugWarn('sfs', '[SFS RS] sym=' + sym + ' tf=' + tf + ' path=backendRead count=' +
            (read ? read.count : 0) + ' reason=' + (_sfsLastFailReason[key] || 'EMPTY') + ' (warmup cooldown)');
          return null;
        }

        // 3) Read empty, no limit, not in cooldown — warm ONCE (4H derives from
        //    30M), re-read.
        debugWarn('sfs', '[SFS RS] sym=' + sym + ' tf=' + tf + ' path=backendRead httpOk=' +
          (read ? read.ok : false) + ' status=' + (read ? read.status : '?') + ' count=' +
          (read ? read.count : 0) + ' reason=' + ((read && read.reason) || 'EMPTY') + ' → warming');
        try { await _sfsWarmupBatch([sym], [tf === '4H' ? '30M' : tf]); } catch (e) {}
        var read2 = await _sfsFetchBackendCandles(sym, tf);
        if (read2 && read2.ok && _sfsCandlesUsable(read2.candles)) {
          if (!cache[sym]) cache[sym] = {};
          cache[sym][tf] = read2.candles;
          delete _sfsLastFailReason[key];
          delete _sfsWarmupCooldown[key];
          debugLog('sfs', '[SFS RS] sym=' + sym + ' tf=' + tf + ' path=warmThenRead ok=true count=' + read2.count + ' status=OK');
          return read2.candles;
        }

        // Still nothing — classify the reason and back off to avoid warmup spam.
        var n = read2 ? read2.count : 0;
        var bodyReason = (read2 && read2.reason) || (read && read.reason) || '';
        var reason;
        if (_sfsCandleSubLimitActive() || /subscription/i.test(String(bodyReason))) reason = 'SUBSCRIPTION_LIMIT';
        else if (!read2 || !read2.ok) reason = 'FETCH_ERROR';
        else if (n === 0) reason = 'EMPTY';
        else if (n < 22) reason = 'SHORT';
        else reason = 'INVALID_CLOSE';
        _sfsLastFailReason[key] = reason;
        _sfsWarmupCooldown[key] = now + SFS_WARMUP_COOLDOWN_MS;
        debugWarn('sfs', '[SFS RS] sym=' + sym + ' tf=' + tf + ' path=warmThenRead count=' + n +
          ' reason=' + reason + ' bodyReason=' + (bodyReason || 'none') + ' (cooldown ' + (SFS_WARMUP_COOLDOWN_MS / 1000) + 's)');
        return null;
      } finally {
        delete _sfsTfFetchInflight[key];
      }
    })();
    _sfsTfFetchInflight[key] = p;
    return p;
  } catch (e) { return null; }
}
