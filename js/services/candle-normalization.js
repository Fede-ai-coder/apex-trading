// ─────────────────────────────────────────────────────────────────────────────
// CANDLE NORMALIZATION — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith and AFTER the other
// already-extracted modules. Contains ONLY the seven shared candle
// normalization / mapping function declarations below and their associated
// comments — no top-level execution, no requests, no timers, no DOM access, no
// side effects at load time.
//
// These are pure shape/normalization helpers: they take raw backend or buffer
// payloads and return normalized {t,o,h,l,c} candles or chart-shaped rows. They
// read no module state and call only each other plus JS builtins, so they
// resolve lexically as globals at call time from the inline monolith and the
// other classic scripts, exactly as when they lived inline.
//
// Auth gate, provenance, transport/fetch, warmup and SFS orchestration stay in
// index.html — none of them moved here.
// ─────────────────────────────────────────────────────────────────────────────

// Normalize a candle timestamp to epoch-ms. Accepts ms numbers, second numbers,
// numeric strings, and ISO date strings. Returns null when unparseable.
function _apexParityNormTime(t) {
  if (t == null) return null;
  if (typeof t === 'number') {
    if (!isFinite(t)) return null;
    return t < 1e12 ? Math.round(t * 1000) : Math.round(t);
  }
  var s = String(t).trim();
  if (s === '') return null;
  if (/^-?\d+$/.test(s)) {
    var n = parseInt(s, 10);
    return n < 1e12 ? n * 1000 : n;
  }
  var ms = Date.parse(s);
  return isFinite(ms) ? ms : null;
}

// Normalize one raw candle (frontend buffer shape {t,o,h,l,c,v} OR backend shape
// {time/timestamp/date, open/high/low/close, volume}) into {t,o,h,l,c,v}. Missing
// OHLC fields fall back to close. Returns null when time or close is missing.
//
// VOLUME IS CARRIED, NOT DISCARDED. It used to be dropped here, which made every
// DXLink-fed series in the app arrive with volume 0 even though the backend sends
// real share counts (observed on the 1D candle store: tens of millions per bar).
// `v` is part of OHLCV — it is DATA, not producer metadata, and this normalizer's
// job is to make shapes agree, not to delete a field. Absent or non-finite volume
// still normalizes to 0, so a producer that sends none is unchanged; a NEGATIVE
// volume is not a share count and is treated as absent.
//
// What this normalizer still strips is everything that is NOT OHLCV: observation
// time, fetchedAt, sequence, revision, completed flags, source priority. That is
// the property the weekly aggregator's duplicate-authority rule depends on — no
// candle may carry a field that lets a consumer elect one reading over another —
// and carrying `v` does not weaken it: volume is compared, never used to rank.
function _apexParityNormCandle(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var t = _apexParityNormTime(
    raw.t != null ? raw.t :
    raw.time != null ? raw.time :
    raw.timestamp != null ? raw.timestamp :
    raw.date != null ? raw.date : null
  );
  function num(a, b) {
    var v = a != null ? a : b;
    var f = parseFloat(v);
    return isFinite(f) ? f : null;
  }
  var o = num(raw.o, raw.open), h = num(raw.h, raw.high),
      l = num(raw.l, raw.low), c = num(raw.c, raw.close);
  var v = num(raw.v, raw.volume);
  if (t == null || c == null) return null;
  return { t: t, o: o == null ? c : o, h: h == null ? c : h, l: l == null ? c : l, c: c,
           v: (v == null || v < 0) ? 0 : v };
}

function _apexParityNormCandleArray(arr) {
  if (!Array.isArray(arr)) return [];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var n = _apexParityNormCandle(arr[i]);
    if (n) out.push(n);
  }
  out.sort(function (a, b) { return a.t - b.t; });
  return out;
}

function _apexParityExtractBackendCandles(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  return json.candles || json.bars || json.data
    || (json.result && json.result.candles) || [];
}

function _sfsExtractBackendCandles(json, tf) {
  var raw = _apexParityExtractBackendCandles(json);
  if (raw && raw.length) return raw;
  if (!json || !tf) return raw || [];
  var keys = [tf, String(tf).toLowerCase(), String(tf).replace(/[^A-Za-z0-9]/g, '')];
  var roots = [json, json.result, json.data, json.timeframes, json.candlesByTimeframe, json.derived,
               json.result && json.result.timeframes, json.result && json.result.candlesByTimeframe,
               json.result && json.result.derived];
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

function _mapBackendCandlesForChart(norm) {
  if (!norm || norm.length < 20) return null;
  return norm.map(function(c) {
    return { time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v || 0, source: 'BACKEND_DXLINK_CANDLES' };
  });
}

function _scannerMapBackendCandlesForChart(norm){
  if (!norm || norm.length < 20) return null;
  return norm.map(function(c){ return { time:c.t, open:c.o, high:c.h, low:c.l, close:c.c, volume:c.v || 0, source:'BACKEND_CANDLE_STORE' }; });
}
