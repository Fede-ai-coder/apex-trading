// ─────────────────────────────────────────────────────────────────────────────
// SFS CANDLE PREDICATES — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith and AFTER the other
// already-extracted candle modules. Contains ONLY the four read-only SFS candle
// predicate / normalizer function declarations below and their associated
// comments — no top-level execution, no state, no constants, no requests, no
// timers, no DOM access, no side effects at load time.
//
// _sfsNormSymbolList / _sfsNormTimeframes are pure input normalizers (Array,
// String + JS builtins only). _sfsCandlesUsable is a pure usability predicate
// (Array + isFinite only). _sfsCandleSubLimitActive is read-only but not fully
// pure: it READS the global S.dxlinkStatus at call time (defensively, never
// throws) and NEVER mutates S. All four resolve lexically as globals at call
// time from the inline monolith and the other classic scripts, exactly as when
// they lived inline. No caller invokes them at module load time, so S is always
// initialised by the time _sfsCandleSubLimitActive runs.
//
// The SFS warmup / queue / cooldown / in-flight state, every stateful
// orchestrator (ensure / detail-4H / SPY / warmup batch / queue / drain) and all
// SFS constants stay in index.html — none of them moved here.
// ─────────────────────────────────────────────────────────────────────────────

function _sfsNormSymbolList(symbols) {
  var arr = Array.isArray(symbols) ? symbols : (symbols ? [symbols] : []);
  var seen = {}, out = [];
  arr.forEach(function(sym) {
    sym = String(sym == null ? '' : sym).trim().toUpperCase();
    if (sym && !seen[sym]) { seen[sym] = true; out.push(sym); }
  });
  return out;
}
function _sfsNormTimeframes(timeframes) {
  var arr = Array.isArray(timeframes) ? timeframes : (timeframes ? [timeframes] : []);
  var seen = {}, out = [];
  arr.forEach(function(tf) {
    tf = String(tf == null ? '' : tf).trim().toUpperCase();
    if (tf && !seen[tf]) { seen[tf] = true; out.push(tf); }
  });
  return out;
}

// A candle series is RS-usable only when it is an array with >= 22 bars carrying
// finite numeric closes (mirrors _pfDrawRsPanel's minimum). Defensive: never throws.
function _sfsCandlesUsable(arr) {
  if (!arr || !arr.length || arr.length < 22) return false;
  var last = arr[arr.length - 1];
  return !!(last && last.close != null && isFinite(last.close));
}

// True when the live DXLink status reports the Candle subscription limit. Read-only
// (consumes the existing /dxlink/status poll result; opens nothing, changes nothing).
function _sfsCandleSubLimitActive() {
  try {
    var err = S.dxlinkStatus && S.dxlinkStatus.feedChannelLastError;
    return !!(err && /subscription/i.test(String(err)) && /candle/i.test(String(err)));
  } catch (e) { return false; }
}
