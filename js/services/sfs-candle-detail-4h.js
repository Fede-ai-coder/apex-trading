// ─────────────────────────────────────────────────────────────────────────────
// SFS detail-chart 4H CORE — extracted VERBATIM from the inline monolith.
//
// Classic script — no module syntax, no wrapper, no global re-assignment: the four
// function declarations below stay GLOBAL function declarations, exactly as they
// were inside index.html. Only their physical location changed — signatures,
// bodies, strings, reasons, delays, log lines and control flow are untouched, and
// so is every documented asymmetry of the loader.
//
// Loaded AFTER sfs-candle-spy-read.js and BEFORE the inline monolith. Nothing here
// runs at load time: the file contains declarations only. Every dependency —
// the state and constants among them now declared in js/services/sfs-config-state.js —
//   S, Date.now, _sfsCandlesUsable, _sfsCandlesFromSyncSource,
//   _sfsFetchBackendCandles, _sfsCandleSubLimitActive, _sfsWarmupBatch, _sfsSleep,
//   _sfsRender4hDetailState, debugLog, debugWarn,
//   _sfsDetail4hInflight, _sfsDetail4hPhase, _sfsDetail4hResult,
//   _sfsWarmupCooldown, _sfsLastFailReason,
//   SFS_DETAIL_4H_POST_WARM_ATTEMPTS, SFS_DETAIL_4H_POST_WARM_DELAY_MS,
//   SFS_WARMUP_COOLDOWN_MS
// — is resolved GLOBALLY at CALL time, not at load time. The phase/result/in-flight
// state, the two detail constants and the shared cooldown/last-fail maps and
// SFS_WARMUP_COOLDOWN_MS are declared in js/services/sfs-config-state.js; the
// detail-4H UI (_sfs4hDetailMessage / _sfsRender4hDetailState) and the shared
// _sfsSleep / _sfsCandlesFromSyncSource helpers stay declared in the monolith — the
// orchestrator keeps calling the renderer globally, with no wrapper, callback or
// injected dependency.
// ─────────────────────────────────────────────────────────────────────────────

function _sfsDetail4hBaseResult(symbol) {
  return { ok:false, symbol:symbol, timeframe:'4H', candles:null, source:null,
    reason:null, warmupAttempted:false, warmupResponse:null, error:null, status:null, count:0 };
}

// Map an internal/backend reason + read shape to one of the PRECISE external
// reasons the UI surfaces. Pure function — no side effects.
function _sfsMapDetail4hReason(internal, read) {
  if (internal === 'ENDPOINT_UNAVAILABLE') return 'ENDPOINT_UNAVAILABLE';
  if (internal === 'FETCH_ERROR')          return 'FETCH_ERROR';
  if (internal === 'SUBSCRIPTION_LIMIT' || internal === 'SUBSCRIPTION_LIMIT_BACKOFF') return 'SUBSCRIPTION_LIMIT_BACKOFF';
  var reasonStr = String((read && read.reason) || internal || '');
  var count = (read && read.count != null) ? read.count : 0;
  if (/subscription/i.test(reasonStr)) return 'SUBSCRIPTION_LIMIT_BACKOFF';
  if (/no[_-]?cache|not[_-]?cached/i.test(reasonStr)) return 'NO_CACHE';
  if (count > 0 && count < 22) return 'INSUFFICIENT_30M_CANDLES';
  return 'CANDLES_NOT_READY';
}

function _sfsStoreDetail4h(symbol, candles) {
  var cache = S.squeezeFireScanner.chartCacheCandles;
  if (!cache[symbol]) cache[symbol] = {};
  cache[symbol]['4H'] = candles;
}

// Ensure the detail chart's 4H candles for ONE symbol via the backend DXLink candle
// cache (read) + at most one controlled 30M warmup + bounded re-read. Deduped per
// symbol so repeated CHART clicks reuse the same in-flight promise. Returns the
// structured result described above. Never throws.
async function _sfsEnsureDetail4hCandles(symbol) {
  if (!symbol) return _sfsDetail4hBaseResult(symbol);
  if (_sfsDetail4hInflight[symbol]) return _sfsDetail4hInflight[symbol];   // dedupe in-flight

  // 0) Synchronous in-memory hit (SFS cache / DXLink buffer) — no network at all.
  var sync = (typeof _sfsCandlesFromSyncSource === 'function') ? _sfsCandlesFromSyncSource(symbol, '4H') : null;
  if (sync && _sfsCandlesUsable(sync.candles)) {
    var hit = _sfsDetail4hBaseResult(symbol);
    hit.ok = true; hit.candles = sync.candles; hit.count = sync.candles.length;
    hit.source = sync.path === 'dxlinkBuffer' ? 'DXLINK_BUFFER' : 'SFS_CACHE';
    _sfsDetail4hPhase[symbol] = null;
    _sfsDetail4hResult[symbol] = hit;
    return Promise.resolve(hit);
  }

  var key = symbol + '|4H';
  _sfsDetail4hPhase[symbol] = 'loading';   // set synchronously so the first draw shows "Loading 4H…"

  var p = (async function() {
    var result = _sfsDetail4hBaseResult(symbol);
    try {
      // 1) Pure cached READ (GET — never opens a subscription).
      var read = await _sfsFetchBackendCandles(symbol, '4H');
      result.status = read ? read.status : null;
      result.count  = read ? read.count : 0;
      if (read && read.ok && _sfsCandlesUsable(read.candles)) {
        _sfsStoreDetail4h(symbol, read.candles);
        result.ok = true; result.candles = read.candles; result.count = read.candles.length;
        result.source = 'BACKEND_DXLINK_CANDLE_CACHE';
        delete _sfsLastFailReason[key]; delete _sfsWarmupCooldown[key];
        debugLog('sfs', '[SFS-4H] ' + symbol + ' path=backendRead ok=true count=' + result.count);
        return result;
      }

      var bodyReason = (read && read.reason) || '';
      // Hard transport failure from the read endpoint (HTTP error / parse error).
      if (read && read.ok === false) {
        result.reason = /404/.test(String(bodyReason)) ? 'ENDPOINT_UNAVAILABLE' : 'FETCH_ERROR';
        _sfsLastFailReason[key] = result.reason;
        debugWarn('sfs', '[SFS-4H] ' + symbol + ' path=backendRead httpFail reason=' + result.reason + ' body=' + bodyReason);
        return result;
      }

      // 2) Candle subscription cap/backoff active → do NOT warm (preserve PR #116). Back off.
      var subLimit = _sfsCandleSubLimitActive() || /subscription/i.test(String(bodyReason));
      if (subLimit) {
        result.reason = 'SUBSCRIPTION_LIMIT_BACKOFF';
        _sfsLastFailReason[key] = 'SUBSCRIPTION_LIMIT';
        _sfsWarmupCooldown[key] = Date.now() + SFS_WARMUP_COOLDOWN_MS;
        debugWarn('sfs', '[SFS-4H] ' + symbol + ' reason=SUBSCRIPTION_LIMIT_BACKOFF (warmup skipped)');
        return result;
      }

      // 2b) A recent warmup already failed (cooldown) → report pending without re-warming.
      if (_sfsWarmupCooldown[key] && Date.now() < _sfsWarmupCooldown[key]) {
        result.reason = _sfsMapDetail4hReason(_sfsLastFailReason[key], read);
        debugWarn('sfs', '[SFS-4H] ' + symbol + ' reason=' + result.reason + ' (warmup cooldown)');
        return result;
      }

      // 3) Read empty, no cap, not in cooldown → ONE controlled single-symbol 30M
      //    warmup (backend derives 4H from 30M), then bounded re-read with backoff.
      _sfsDetail4hPhase[symbol] = 'warming';
      _sfsRender4hDetailState(symbol);   // flip the 4H panel to "warming pending"
      result.warmupAttempted = true;
      try {
        result.warmupResponse = await _sfsWarmupBatch([symbol], ['30M'], {
          reason: 'squeeze_fire_detail_chart',
          context: { singleSymbol: true, requestedTimeframe: '4H' }
        });
      } catch (e) { result.warmupResponse = { ok:false, reason:'warmup_exception:' + ((e && e.message) || e) }; }

      var lastRead = null;
      for (var attempt = 1; attempt <= Math.max(1, SFS_DETAIL_4H_POST_WARM_ATTEMPTS); attempt++) {
        // Stale-symbol guard: stop the moment the user navigated to another symbol so
        // we never render stale 4H data into the wrong panel.
        if (!S.squeezeFireScanner || S.squeezeFireScanner.chartSymbol !== symbol) { result.reason = 'SYMBOL_CHANGED'; return result; }
        await _sfsSleep(SFS_DETAIL_4H_POST_WARM_DELAY_MS * attempt);
        if (!S.squeezeFireScanner || S.squeezeFireScanner.chartSymbol !== symbol) { result.reason = 'SYMBOL_CHANGED'; return result; }
        lastRead = await _sfsFetchBackendCandles(symbol, '4H');
        result.status = lastRead ? lastRead.status : null;
        result.count  = lastRead ? lastRead.count : 0;
        if (lastRead && lastRead.ok && _sfsCandlesUsable(lastRead.candles)) {
          _sfsStoreDetail4h(symbol, lastRead.candles);
          result.ok = true; result.candles = lastRead.candles; result.count = lastRead.candles.length;
          result.source = 'BACKEND_DXLINK_CANDLE_CACHE';
          delete _sfsLastFailReason[key]; delete _sfsWarmupCooldown[key];
          debugLog('sfs', '[SFS-4H] ' + symbol + ' path=warmThenRead ok=true count=' + result.count + ' attempt=' + attempt);
          return result;
        }
        if (_sfsCandleSubLimitActive() || /subscription/i.test(String((lastRead && lastRead.reason) || ''))) {
          result.reason = 'SUBSCRIPTION_LIMIT_BACKOFF';
          _sfsLastFailReason[key] = 'SUBSCRIPTION_LIMIT';
          _sfsWarmupCooldown[key] = Date.now() + SFS_WARMUP_COOLDOWN_MS;
          return result;
        }
      }
      // Still nothing after bounded polling — classify a precise reason and back off
      // (so ArrowUp/ArrowDown browsing never spams warmups).
      result.reason = _sfsMapDetail4hReason(null, lastRead);
      _sfsLastFailReason[key] = result.reason;
      _sfsWarmupCooldown[key] = Date.now() + SFS_WARMUP_COOLDOWN_MS;
      debugWarn('sfs', '[SFS-4H] ' + symbol + ' path=warmThenRead final reason=' + result.reason + ' count=' + result.count);
      return result;
    } catch (e) {
      result.error = (e && e.message) || String(e);
      result.reason = 'FETCH_ERROR';
      return result;
    } finally {
      _sfsDetail4hPhase[symbol] = null;
      _sfsDetail4hResult[symbol] = result;
      delete _sfsDetail4hInflight[symbol];
    }
  })();
  _sfsDetail4hInflight[symbol] = p;
  return p;
}
