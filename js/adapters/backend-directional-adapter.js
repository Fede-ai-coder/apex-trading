// ── Backend Directional Scanner (BDS) adapter — diagnostic-only ───────────────
// Pure, side-effect-free helpers that convert a backend scanner snapshot (the
// read-only structure surfaced by the Backend Scanner Snapshot panel /
// bssState()) into a Directional-Scanner-compatible row shape. This is the FIRST
// controlled migration step ONLY: nothing here renders, fetches, subscribes, or
// feeds the existing Directional Scanner. No fetch / ttCall / DXLink / Candle
// subscription / POST scanner-run — these helpers never touch the network or the
// candle pipeline, never mutate their inputs, and never run automatically.
//
// Diagnostic-only invariant (current backend): candidate.direction and
// candidate.score are null. The adapter reads the DIAGNOSTIC fields
// (directionDiagnostics.candidateDirection, scoreDiagnostics.scorePreview/
// scoreBucket/rankEligible) and deliberately preserves the operational
// candidate.direction / candidate.score as inert operationalDirection /
// operationalScore (expected null) — it never writes the diagnostic preview into
// any operational field used by the existing scanner.

// Finite-number-or-null coercion (rejects NaN / Infinity / strings / objects).
function _bdsNum(v){ return (typeof v === 'number' && isFinite(v)) ? v : null; }
// Strict boolean-or-null (anything not literally true/false becomes null).
function _bdsBoolOrNull(v){ return v === true ? true : (v === false ? false : null); }
// Non-empty-string-or-null.
function _bdsStrOrNull(v){ return (typeof v === 'string' && v.length > 0) ? v : null; }

// 1) Eligibility gate. Tolerant by design: a missing optional block never throws
//    — it just means "not eligible" (returns false), never an exception.
function bdsIsBackendDirectionalCandidate(candidate){
  if(!candidate || typeof candidate !== 'object') return false;
  if(!candidate.symbol) return false;
  var sd = candidate.scoreDiagnostics;
  if(!sd || typeof sd !== 'object') return false;
  if(sd.usable !== true) return false;
  if(sd.rankEligible !== true) return false;
  if(!(typeof sd.scorePreview === 'number' && isFinite(sd.scorePreview))) return false;
  var dd = candidate.directionDiagnostics;
  if(!dd || typeof dd !== 'object') return false;
  if(dd.candidateDirection !== 'bullish' && dd.candidateDirection !== 'bearish') return false;
  // Cache readiness — tolerant of a missing cache block.
  var cache = candidate.cache;
  var cacheReady = !!(cache && typeof cache === 'object') &&
    (cache.source === 'BACKEND_DXLINK_CANDLE_CACHE' ||
     (typeof cache.candleCount === 'number' && cache.candleCount > 0));
  if(!cacheReady) return false;
  // Core-technicals completeness — tolerant of a missing technicalCoverage block.
  var tc = candidate.technicalCoverage;
  var coreComplete = !!(tc && typeof tc === 'object') &&
    (tc.completeCoreTechnicals === true || tc.complete === true || tc.coreComplete === true);
  if(!coreComplete) return false;
  return true;
}

// 2) Map one backend candidate to a stable Directional-Scanner-compatible row.
//    Always returns the full row shape (null fields where data is absent) plus a
//    `warnings` list; never throws on a missing/partial candidate.
function bdsMapBackendCandidateToDirectionalRow(candidate, index){
  var raw = (candidate && typeof candidate === 'object') ? candidate : null;
  var c = raw || {};
  var warnings = [];
  var idx = (typeof index === 'number' && isFinite(index)) ? index : 0;

  var symbol = (c.symbol != null && c.symbol !== '') ? String(c.symbol) : null;
  if(!symbol) warnings.push('missing_symbol');

  // Direction — diagnostic candidateDirection ONLY (never operational direction).
  var dd = (c.directionDiagnostics && typeof c.directionDiagnostics === 'object') ? c.directionDiagnostics : null;
  var direction = null, directionConfidence = null, directionSource = null;
  if(!dd){
    warnings.push('missing_direction_diagnostics');
  } else {
    if(dd.candidateDirection === 'bullish' || dd.candidateDirection === 'bearish') direction = dd.candidateDirection;
    else warnings.push('direction_not_directional');
    if(dd.confidence === 'high' || dd.confidence === 'medium' || dd.confidence === 'low') directionConfidence = dd.confidence;
    directionSource = _bdsStrOrNull(dd.directionSource);
    if(directionSource === null) directionSource = _bdsStrOrNull(dd.source);
  }

  // Score preview — diagnostic scorePreview ONLY (never operational score).
  var sd = (c.scoreDiagnostics && typeof c.scoreDiagnostics === 'object') ? c.scoreDiagnostics : null;
  var scorePreview = sd ? _bdsNum(sd.scorePreview) : null;
  if(scorePreview === null) warnings.push('missing_score_preview');
  var bucket = sd ? sd.scoreBucket : null;
  var scoreBucket = (bucket === 'A' || bucket === 'B' || bucket === 'C' || bucket === 'D') ? bucket : null;
  var rankEligible = !!(sd && sd.rankEligible === true);
  if(!rankEligible) warnings.push('not_rank_eligible');

  // Cache / freshness.
  var cache = (c.cache && typeof c.cache === 'object') ? c.cache : null;
  var candleCount = cache ? _bdsNum(cache.candleCount) : null;
  var candleSource = cache ? _bdsStrOrNull(cache.source) : null;
  var candleReason = cache ? _bdsStrOrNull(cache.reason) : null;
  var cacheAgeMs = cache ? _bdsNum(cache.ageMs) : null;
  var cacheReady = !!cache &&
    (cache.source === 'BACKEND_DXLINK_CANDLE_CACHE' || (typeof cache.candleCount === 'number' && cache.candleCount > 0));
  if(!cacheReady) warnings.push('cache_not_ready');

  // Technical coverage.
  var tc = (c.technicalCoverage && typeof c.technicalCoverage === 'object') ? c.technicalCoverage : null;
  var completeCoreTechnicals = tc
    ? (tc.completeCoreTechnicals === true || tc.complete === true || tc.coreComplete === true)
    : null;
  if(completeCoreTechnicals !== true) warnings.push('core_technicals_incomplete');

  // Parity / quality.
  var dp = (c.directionParity && typeof c.directionParity === 'object') ? c.directionParity : null;
  var parityComparable = dp ? _bdsBoolOrNull(dp.comparable) : null;
  var parityMatches = dp ? _bdsBoolOrNull(dp.matches) : null;
  var parityMismatchType = dp ? _bdsStrOrNull(dp.mismatchType) : null;
  if(parityComparable === true && parityMatches === false) warnings.push('parity_mismatch');

  // Relative strength (number + optional source; tolerant of object/number forms).
  var relativeStrengthVsSpy = _bdsNum(c.relativeStrengthVsSpy);
  var relativeStrengthSource = _bdsStrOrNull(c.relativeStrengthSource);
  var rs = c.relativeStrength;
  if(relativeStrengthVsSpy === null){
    if(typeof rs === 'number'){ relativeStrengthVsSpy = _bdsNum(rs); }
    else if(rs && typeof rs === 'object'){
      var a1 = _bdsNum(rs.relativeStrengthVsSpy);
      var a2 = _bdsNum(rs.vsSpy);
      var a3 = _bdsNum(rs.value);
      relativeStrengthVsSpy = (a1 !== null) ? a1 : ((a2 !== null) ? a2 : a3);
    }
  }
  if(relativeStrengthSource === null && rs && typeof rs === 'object') relativeStrengthSource = _bdsStrOrNull(rs.source);

  return {
    source: 'BACKEND_SCANNER_SNAPSHOT',
    sourceLabel: 'Backend snapshot',
    sourceIndex: idx,

    symbol: symbol,
    price: _bdsNum(c.price),

    direction: direction,
    directionConfidence: directionConfidence,
    directionSource: directionSource,

    scorePreview: scorePreview,
    scoreBucket: scoreBucket,
    rankEligible: rankEligible,

    rsi14: _bdsNum(c.rsi14),
    sma8: _bdsNum(c.sma8),
    sma20: _bdsNum(c.sma20),
    sma30: _bdsNum(c.sma30),
    sma200: _bdsNum(c.sma200),
    distFromSma8: _bdsNum(c.distFromSma8),
    distFromSma20: _bdsNum(c.distFromSma20),
    distFromSma30: _bdsNum(c.distFromSma30),
    distFromSma200: _bdsNum(c.distFromSma200),
    squeezeState: _bdsBoolOrNull(c.squeezeState),

    relativeStrengthVsSpy: relativeStrengthVsSpy,
    relativeStrengthSource: relativeStrengthSource,

    parityComparable: parityComparable,
    parityMatches: parityMatches,
    parityMismatchType: parityMismatchType,

    candleCount: candleCount,
    candleSource: candleSource,
    candleReason: candleReason,
    cacheAgeMs: cacheAgeMs,

    completeCoreTechnicals: completeCoreTechnicals,

    backendCandidate: raw,

    // Operational backend fields are intentionally inert here (expected null) —
    // never overwritten with the diagnostic direction/scorePreview above.
    operationalDirection: (c.direction == null ? null : c.direction),
    operationalScore: (c.score == null ? null : c.score),

    warnings: warnings
  };
}

// 4) Stable, non-mutating sort (declared before derive, which calls it).
function bdsSortBackendDirectionalRows(rows){
  if(!Array.isArray(rows)) return [];
  var bucketRank = { A:0, B:1, C:2, D:3 };
  var copy = rows.slice();
  copy.sort(function(a,b){
    // scorePreview desc (nulls last)
    var asp = (typeof a.scorePreview === 'number' && isFinite(a.scorePreview)) ? a.scorePreview : null;
    var bsp = (typeof b.scorePreview === 'number' && isFinite(b.scorePreview)) ? b.scorePreview : null;
    if(asp === null && bsp !== null) return 1;
    if(asp !== null && bsp === null) return -1;
    if(asp !== null && bsp !== null && asp !== bsp) return bsp - asp;
    // rankEligible true before false
    var ae = a.rankEligible === true ? 0 : 1;
    var be = b.rankEligible === true ? 0 : 1;
    if(ae !== be) return ae - be;
    // scoreBucket A < B < C < D
    var ab = Object.prototype.hasOwnProperty.call(bucketRank, a.scoreBucket) ? bucketRank[a.scoreBucket] : 99;
    var bb = Object.prototype.hasOwnProperty.call(bucketRank, b.scoreBucket) ? bucketRank[b.scoreBucket] : 99;
    if(ab !== bb) return ab - bb;
    // relativeStrengthVsSpy: desc generally; ascending (most-negative first) when
    // both rows are bearish, where relative weakness is the stronger signal.
    var ars = (typeof a.relativeStrengthVsSpy === 'number' && isFinite(a.relativeStrengthVsSpy)) ? a.relativeStrengthVsSpy : null;
    var brs = (typeof b.relativeStrengthVsSpy === 'number' && isFinite(b.relativeStrengthVsSpy)) ? b.relativeStrengthVsSpy : null;
    if(ars !== null && brs !== null && ars !== brs){
      var bothBearish = (a.direction === 'bearish' && b.direction === 'bearish');
      return bothBearish ? (ars - brs) : (brs - ars);
    }
    if(ars === null && brs !== null) return 1;
    if(ars !== null && brs === null) return -1;
    // stable fallback: original snapshot order
    var ai = (typeof a.sourceIndex === 'number' && isFinite(a.sourceIndex)) ? a.sourceIndex : 0;
    var bi = (typeof b.sourceIndex === 'number' && isFinite(b.sourceIndex)) ? b.sourceIndex : 0;
    return ai - bi;
  });
  return copy;
}

// 3) Derive directional rows from a snapshot (non-mutating; safe on bad input).
function bdsDeriveBackendDirectionalRows(snapshot, options){
  var opts = options || {};
  var includeNonEligible = opts.includeNonEligible === true;
  var requireFresh = opts.requireFresh === true; // false by default for this migration step
  var directionFilter = (opts.directionFilter === 'bullish' || opts.directionFilter === 'bearish') ? opts.directionFilter : 'all';
  var maxRows = (typeof opts.maxRows === 'number' && isFinite(opts.maxRows)) ? opts.maxRows : null;

  if(!snapshot || typeof snapshot !== 'object' || snapshot.ok !== true) return [];
  if(!Array.isArray(snapshot.candidates)) return [];
  if(requireFresh && snapshot.stale === true) return [];

  var stale = snapshot.stale === true;
  var rows = [];
  // forEach READS only — snapshot.candidates and each candidate are never mutated.
  snapshot.candidates.forEach(function(candidate, i){
    if(!includeNonEligible && !bdsIsBackendDirectionalCandidate(candidate)) return;
    var row = bdsMapBackendCandidateToDirectionalRow(candidate, i);
    if(stale && row.warnings.indexOf('snapshot_stale') < 0) row.warnings.push('snapshot_stale');
    rows.push(row);
  });

  if(directionFilter !== 'all'){
    rows = rows.filter(function(r){ return r.direction === directionFilter; });
  }

  rows = bdsSortBackendDirectionalRows(rows);

  if(maxRows !== null && maxRows >= 0 && rows.length > maxRows) rows = rows.slice(0, maxRows);
  return rows;
}

// 5) Stable summary over a set of derived rows (order-preserving; non-mutating).
function bdsBackendDirectionalSummary(rows){
  var summary = {
    total: 0, bullish: 0, bearish: 0, rankEligible: 0,
    bucketCounts: { A:0, B:0, C:0, D:0 },
    parityMatches: 0, parityMismatches: 0,
    withCompleteTechnicals: 0, withCache: 0,
    topSymbols: []
  };
  if(!Array.isArray(rows)) return summary;
  summary.total = rows.length;
  rows.forEach(function(r){
    if(!r || typeof r !== 'object') return;
    if(r.direction === 'bullish') summary.bullish++;
    else if(r.direction === 'bearish') summary.bearish++;
    if(r.rankEligible === true) summary.rankEligible++;
    if(r.scoreBucket === 'A' || r.scoreBucket === 'B' || r.scoreBucket === 'C' || r.scoreBucket === 'D') summary.bucketCounts[r.scoreBucket]++;
    if(r.parityMatches === true) summary.parityMatches++;
    if(r.parityComparable === true && r.parityMatches === false) summary.parityMismatches++;
    if(r.completeCoreTechnicals === true) summary.withCompleteTechnicals++;
    if((typeof r.candleCount === 'number' && r.candleCount > 0) || r.candleSource) summary.withCache++;
  });
  summary.topSymbols = rows.slice(0, 5).map(function(r){ return (r && r.symbol) ? r.symbol : null; }).filter(function(s){ return !!s; });
  return summary;
}

// 6) Source-state probe used LATER to decide whether the Directional Scanner can
//    safely consume the backend snapshot. Reports readiness/staleness; it never
//    enforces freshness here (requireFresh stays opt-in for this migration step).
function bdsGetBackendDirectionalSourceState(snapshot, status){
  var snap = (snapshot && typeof snapshot === 'object') ? snapshot : null;
  var st = (status && typeof status === 'object') ? status : null;
  var snapshotOk = !!(snap && snap.ok === true);
  var candidates = (snap && Array.isArray(snap.candidates)) ? snap.candidates : [];

  var scoreDiagnosticsReady = candidates.some(function(c){ return !!(c && c.scoreDiagnostics && typeof c.scoreDiagnostics === 'object'); });
  var directionDiagnosticsReady = candidates.some(function(c){ return !!(c && c.directionDiagnostics && typeof c.directionDiagnostics === 'object'); });
  var parityReady = candidates.some(function(c){ return !!(c && c.directionParity && typeof c.directionParity === 'object'); });
  var diagnosticsReady = scoreDiagnosticsReady && directionDiagnosticsReady;

  var stale = snap ? _bdsBoolOrNull(snap.stale) : null;
  var ageMs = snap ? _bdsNum(snap.ageMs) : null;
  var updatedAt = snap ? _bdsStrOrNull(snap.updatedAt) : null;
  var nextScheduledRunAt = snap ? _bdsStrOrNull(snap.nextScheduledRunAt) : null;

  var schedulerEnabled = null;
  if(st){
    if(st.schedulerEnabled === true || st.schedulerEnabled === false) schedulerEnabled = st.schedulerEnabled;
    else if(st.scheduler && typeof st.scheduler === 'object' && (st.scheduler.enabled === true || st.scheduler.enabled === false)) schedulerEnabled = st.scheduler.enabled;
  }

  var available = false, reason = null;
  if(!snap) reason = 'no_snapshot';
  else if(!snapshotOk) reason = 'snapshot_not_ok';
  else if(!Array.isArray(snap.candidates)) reason = 'no_candidates_array';
  else if(!candidates.length) reason = 'no_candidates';
  else if(st && (st.statusError || st.snapshotError)) reason = 'status_error';
  else if(!diagnosticsReady) reason = 'diagnostics_not_ready';
  else available = true;

  return {
    available: available,
    reason: reason,
    snapshotOk: snapshotOk,
    schedulerEnabled: schedulerEnabled,
    stale: stale,
    ageMs: ageMs,
    updatedAt: updatedAt,
    nextScheduledRunAt: nextScheduledRunAt,
    diagnosticsReady: diagnosticsReady,
    scoreDiagnosticsReady: scoreDiagnosticsReady,
    directionDiagnosticsReady: directionDiagnosticsReady,
    parityReady: parityReady
  };
}
