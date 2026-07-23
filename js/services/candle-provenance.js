// ─────────────────────────────────────────────────────────────────────────────────
// CANDLE PROVENANCE — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith and AFTER the other
// already-extracted candle modules (candle-normalization.js, candle-auth-gate.js).
// Contains ONLY the four backend candle PROVENANCE function declarations below
// (classifier, 4H diagnostics extractor, provenance recorder, convenience recorder)
// and their associated comments — no state, no constants, no top-level execution,
// no requests, no timers, no DOM access, no side effects at load time.
//
// The provenance state and constants these functions read/mutate STAY declared in
// index.html: _candleProvenanceStats, _candleProvenanceLog, _CANDLE_PROVENANCE_MAX and
// _CANDLE_USABLE_MIN, plus the _candleDiagNowIso helper. Every such symbol is resolved
// LEXICALLY as a global at CALL time (never read while this file loads), exactly as
// when these functions lived inline, so the earlier load order does not create a TDZ.
//
// The auth gate (which stays in js/services/candle-auth-gate.js), candle
// normalization, transport/fetch, warmup and SFS orchestration stay where they are —
// none of them moved here. The gate-to-provenance source mapper stays in the auth
// gate module and is only CALLED (never redefined) from the monolith, not from here.
// ──────────────────────────────────────────────────────────────────────────────────

// Classify a backend candle serve into a precise provenance source + detail from the
// 1D/4H bar counts and the optional backend 4H derivation diagnostics (diag4h carries
// { source30mCount, derivationReason, missingReason } from the 4H GET response).
//   1D≥min & 4H≥min                 → backend_cache_full
//   1D≥min & 4H==0 with backend dx  → backend_4h_missing (detail=missingReason/derivationReason)
//   1D≥min & 4H short/empty         → backend_cache_partial
function _classifyBackendCandleProvenance(count1d, count4h, diag4h) {
  var c1 = count1d || 0, c4 = count4h || 0;
  if (c1 >= _CANDLE_USABLE_MIN && c4 >= _CANDLE_USABLE_MIN) {
    return { source: 'backend_cache_full', detail: null };
  }
  if (c1 >= _CANDLE_USABLE_MIN && c4 === 0 && diag4h && (diag4h.derivationReason || diag4h.missingReason)) {
    return { source: 'backend_4h_missing', detail: (diag4h.missingReason || '?') + '/' + (diag4h.derivationReason || '?') };
  }
  return { source: 'backend_cache_partial', detail: '1D=' + c1 + ' 4H=' + c4 };
}
// Extract the backend 4H derivation diagnostics from a 4H GET response body, or
// null when none present. Tolerant of top-level or nested {timeframes['4H']} shapes.
function _extractBackend4hDiag(json) {
  try {
    if (!json || typeof json !== 'object') return null;
    var src = json;
    if (json.timeframes && json.timeframes['4H'] && typeof json.timeframes['4H'] === 'object') {
      src = Object.assign({}, json, json.timeframes['4H']);
    }
    var has = (src.source30mCount != null) || (src.derivationReason != null) || (src.missingReason != null);
    if (!has) return null;
    return {
      source30mCount:  src.source30mCount != null ? src.source30mCount : null,
      derivationReason: src.derivationReason != null ? src.derivationReason : null,
      missingReason:    src.missingReason != null ? src.missingReason : null,
    };
  } catch (e) { return null; }
}

function _recordCandleProvenance(source, ctx) {
  try {
    ctx = ctx || {};
    // Total backend-serve counter covers every backend_cache* / backend_4h_missing serve.
    if (source === 'backend_cache' || source === 'backend_cache_full' || source === 'backend_cache_partial' || source === 'backend_4h_missing') {
      _candleProvenanceStats.backendCache++;
    }
    if (source === 'backend_cache_full') _candleProvenanceStats.backendCacheFull++;
    else if (source === 'backend_cache_partial') _candleProvenanceStats.backendCachePartial++;
    else if (source === 'backend_4h_missing') _candleProvenanceStats.backend4hMissing++;
    else if (source === 'browser_dxlink_fallback') _candleProvenanceStats.browserDxlinkFallback++;
    else if (source === 'browser_4h_fallback_started') {
      _candleProvenanceStats.browser4hFallbackStarted++;
      if (ctx.symbol) {
        _candleProvenanceStats.browser4hFallbackSymbolsRecent.push(String(ctx.symbol).trim().toUpperCase());
        if (_candleProvenanceStats.browser4hFallbackSymbolsRecent.length > 12) {
          _candleProvenanceStats.browser4hFallbackSymbolsRecent.splice(0, _candleProvenanceStats.browser4hFallbackSymbolsRecent.length - 12);
        }
      }
    } else if (source === 'browser_4h_fallback_blocked_cap' || source === 'browser_4h_fallback_blocked_gate') {
      _candleProvenanceStats.browser4hFallbackBlocked++;
    }
    _candleProvenanceStats.lastSource = source;
    _candleProvenanceStats.lastAt = _candleDiagNowIso();
    _candleProvenanceStats.lastSymbol = ctx.symbol || null;
    var rec = {
      timestamp: _candleDiagNowIso(),
      source: source,
      symbol: ctx.symbol || null,
      view: ctx.view || null,
      candles1d: ctx.candles1d != null ? ctx.candles1d : null,
      candles4h: ctx.candles4h != null ? ctx.candles4h : null,
      detail: ctx.detail || null,
    };
    _candleProvenanceLog.push(rec);
    if (_candleProvenanceLog.length > _CANDLE_PROVENANCE_MAX) _candleProvenanceLog.splice(0, _candleProvenanceLog.length - _CANDLE_PROVENANCE_MAX);
    console.log('[CANDLE-PROVENANCE] source=' + source +
      ' symbol=' + (ctx.symbol || '?') +
      (ctx.view ? ' view=' + ctx.view : '') +
      (ctx.candles1d != null ? ' 1D=' + ctx.candles1d : '') +
      (ctx.candles4h != null ? ' 4H=' + ctx.candles4h : '') +
      (ctx.detail ? ' detail=' + ctx.detail : ''));
    return rec;
  } catch (e) { return null; }
}
// Convenience: classify + record a backend serve in one call (used by every chart
// loader). Returns the chosen source string.
function _recordBackendCandleProvenance(view, symbol, count1d, count4h, diag4h) {
  var cls = _classifyBackendCandleProvenance(count1d, count4h, diag4h);
  _recordCandleProvenance(cls.source, { symbol: symbol, view: view, candles1d: count1d || 0, candles4h: count4h || 0, detail: cls.detail });
  return cls.source;
}
