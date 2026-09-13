// ─── Weekly candle derivation (frontend; no backend weekly series exists) ─────
// Buckets daily candles into US market weeks (Mon–Sun) and reduces each bucket with
// the standard OHLC rules. Safe degrade: returns [] for null / empty / malformed
// input — never throws, never mutates the input.
//
// ORDER INDEPENDENCE. The reduction used to take `open` (and the weekly timestamp)
// from the FIRST ARRAY ELEMENT of a bucket and `close` from the LAST one, without
// ever sorting the daily sources — the trailing `order.sort(...)` sorts the WEEK
// KEYS only. That is correct solely when the caller happens to hand over an already
// chronological array. It does not: `_apexParityNormCandleArray` sorts, but the
// CACHE_FALLBACK branch (`_swingReadCachedCandles` → the scanner's own series) does
// not, and neither do `_swingReadCachedCandles` or `_swingGetCandles` themselves.
// Delivering one market week as Fri, Mon, Wed, Tue, Thu produced open 271.30 (the
// FRIDAY open) and close 271.10 (the THURSDAY close) instead of 260.00 / 269.40 —
// three different weekly bars for the same five sessions depending on arrival order.
// Each bucket's sources are therefore sorted chronologically HERE, on a copy, before
// being reduced, so the result depends only on the data.
//
// WEEK IDENTITY is the America/New_York trading week (_etWeekBucket, the canonical
// ET-anchored helper), not the raw UTC day: an instant that has already rolled over
// in UTC while the ET date has not — Sunday 21:00 ET is Monday in UTC — otherwise
// lands in the following market week.
//
// TIMESTAMPS are normalised through the shared _swingCandleTimeMs, which handles
// epoch seconds, epoch ms AND ISO strings. The previous inline `(t < 1e12) ? t*1000 : t`
// silently mis-handled ISO input: the string comparison is false, so the raw string
// became the bucket key and the week SPLIT into extra bars stamped with the string.
// A candle whose timestamp cannot be resolved is skipped rather than bucketed as NaN.
//
// DUPLICATE AUTHORITY — THERE IS NONE, SO THE AGGREGATOR NEVER PICKS A WINNER.
// A candle object arriving here carries {time,open,high,low,close,volume} (or the
// short-key {t,o,h,l,c,v}) and NOTHING else: no observation time, no fetchedAt, no
// sequence, no revision, no completed/final flag, no source priority. Every producer
// that can reach this function was enumerated and each one strips such metadata —
// _apexParityNormCandle returns a fresh {t,o,h,l,c}, so anything extra the backend
// sends is discarded at the transport boundary; the wrappers that DO carry freshness
// ({candles,fetchedAt,seq} in the swing chart cache, {candles,ts} in the scanner cache)
// are unwrapped by their readers and only the bare array is handed on.
// The candle TIMESTAMP is not a substitute: it is a bucket label whose convention
// differs per producer — the DXLink series stamps the RTH interval START (09:30 ET)
// while the Yahoo/TwelveData scanner series stamps the SESSION DATE at 00:00 UTC, and
// the AlphaVantage branch stamps the literal constant 0. "Larger timestamp" therefore
// encodes which SOURCE served the bar, never which reading was observed later.
// So, for several records of the SAME America/New_York trading session:
//   • identical normalised OHLCV → the same datum expressed twice. Collapsed into ONE
//     contribution (volume counted once) whatever the start/end-time convention.
//   • divergent OHLCV → unresolvable. The session is NOT silently dropped either: a
//     weekly missing one of its sessions still looks like a complete bar while carrying
//     the wrong open / high / low / close. The ENTIRE week bucket containing that
//     session is invalidated, AMBIGUOUS_DUPLICATE_SESSION is emitted, and no weekly is
//     produced for it. Every other week is unaffected and byte-identical.
function _swingWeekBucket(ms) {
  // epoch day 0 (1970-01-01) was a Thursday → +3 shifts week boundaries to Monday
  var days = Math.floor(ms / 86400000);
  return Math.floor((days + 3) / 7);
}
// Compact diagnostic for a weekly source that had to be dropped. Never per candle in
// the normal path — only when a source is unusable or a session is unprovable.
function _swingLogWeeklySource(fields) {
  try { if (typeof console !== 'undefined' && console.log) console.log('[SWING][WEEKLY]', fields); } catch (e) {}
}
function _swingDeriveWeeklyCandles(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return [];
  // 1) NORMALISE — read only the fields the weekly needs, from either the long-key
  //    ({time,open,high,low,close,volume}) or short-key ({t,o,h,l,c,v}) shape. This is a
  //    local read of this aggregator's own inputs, not a fix of the CACHE_FALLBACK shape.
  var num = function(v) { var f = parseFloat(v); return isFinite(f) ? f : null; };
  var rows = [];
  for (var i = 0; i < daily.length; i++) {
    var c = daily[i];
    if (!c) continue;
    // Coerced to Number here so "260" and 260 are the SAME reading: the duplicate rule
    // below compares normalised OHLCV for equality, and the reduction sums volume.
    var close = num((c.close != null) ? c.close : c.c);
    if (close == null) continue;
    var ms = (typeof _swingCandleTimeMs === 'function') ? _swingCandleTimeMs(c) : null;
    if (ms == null) {                       // unusable timestamp → no provable week
      _swingLogWeeklySource({ reason: 'UNRESOLVABLE_TIMESTAMP', rawTime: (c.time != null ? c.time : c.t) });
      continue;
    }
    var week = (typeof _etWeekBucket === 'function') ? _etWeekBucket(ms) : null;
    var session = (typeof _candleTradingSessionDate === 'function') ? _candleTradingSessionDate(c) : null;
    if (week == null || session == null) {
      _swingLogWeeklySource({ reason: 'UNRESOLVABLE_SESSION', ms: ms });
      continue;
    }
    var vol = num((c.volume != null) ? c.volume : c.v);
    rows.push({
      ms: ms, week: week, session: session,
      open : (c.open != null && num(c.open) != null) ? num(c.open) : (c.o != null && num(c.o) != null ? num(c.o) : close),
      high : (c.high != null && num(c.high) != null) ? num(c.high) : (c.h != null && num(c.h) != null ? num(c.h) : close),
      low  : (c.low  != null && num(c.low)  != null) ? num(c.low)  : (c.l != null && num(c.l) != null ? num(c.l) : close),
      close: close,
      volume: (vol != null && vol >= 0) ? vol : 0
    });
  }
  if (!rows.length) return [];

  // 2) ONE CONTRIBUTION PER TRADING SESSION — WITHOUT ELECTING A WINNER.
  //    Nothing in a candle object states which of two readings of the same session was
  //    observed later (see the DUPLICATE AUTHORITY note above), so:
  //      • all readings agree on the normalised OHLCV → one datum, one contribution. The
  //        timestamps may differ (interval start vs interval end vs session date): that is
  //        a convention difference, not a data difference, so it cannot change the outcome.
  //        The canonical instant is the EARLIEST of the group, which is order-independent.
  //      • the readings disagree → unresolvable. Dropping just the session would still emit
  //        a weekly that LOOKS complete while missing that session's open / high / low /
  //        close, so the whole week bucket is invalidated instead.
  var bySession = {};
  rows.forEach(function(r) { (bySession[r.session] = bySession[r.session] || []).push(r); });
  var deduped = [], ambiguousWeeks = {};
  Object.keys(bySession).forEach(function(sessionDate) {
    var group = bySession[sessionDate];
    var canonical = group[0];
    if (group.length > 1) {
      var distinct = {}, n = 0;
      for (var g = 0; g < group.length; g++) {
        var r = group[g];
        // OHLCV ONLY — the timestamp is deliberately absent from the signature.
        var sig = r.open + '|' + r.high + '|' + r.low + '|' + r.close + '|' + r.volume;
        if (!distinct[sig]) { distinct[sig] = true; n++; }
        if (r.ms < canonical.ms) canonical = r;
      }
      if (n > 1) {
        group.forEach(function(x) { ambiguousWeeks[x.week] = true; });
        _swingLogWeeklySource({ reason: 'AMBIGUOUS_DUPLICATE_SESSION', session: sessionDate,
          week: group[0].week, candidates: n, weekInvalidated: true });
        return;                             // fail closed for the whole week (step 3)
      }
    }
    deduped.push(canonical);
  });
  if (!deduped.length) return [];

  // 3) REDUCE each week from its CHRONOLOGICALLY SORTED sources (sorted on our own array;
  //    the caller's array and its candle objects are never touched). A week holding an
  //    ambiguous session is not emitted at all — never as a partial bar.
  var weeks = {};
  deduped.forEach(function(r) {
    if (ambiguousWeeks[r.week]) return;
    (weeks[r.week] = weeks[r.week] || []).push(r);
  });
  return Object.keys(weeks)
    .map(Number)
    .sort(function(a, b) { return a - b; })
    .map(function(key) {
      var src = weeks[key].slice().sort(function(a, b) { return a.ms - b.ms; });
      var first = src[0], last = src[src.length - 1];
      var high = first.high, low = first.low, volume = 0;
      src.forEach(function(r) {
        if (r.high > high) high = r.high;
        if (r.low  < low ) low  = r.low;
        volume += r.volume;
      });
      return { time: first.ms, open: first.open, high: high, low: low, close: last.close, volume: volume };
    });
}
