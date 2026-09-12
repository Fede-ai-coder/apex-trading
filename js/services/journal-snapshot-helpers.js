// ── SNAPSHOT HELPER — reads only already-available state ────────
// opts: { pos: positionObject, greeksSnap: aggregateGreeksResult, legs: legArray }
function _buildSnapshot(ticker, opts) {
  var pos        = (opts && opts.pos)        || null;
  var greeksSnap = (opts && opts.greeksSnap) || null;
  var _legs      = (opts && opts.legs)       || null;   // explicit legs array (manual form)
  var d  = ticker ? S.scanData.find(function(x) { return x.ticker === ticker; }) : null;
  var mr = S.marketRegime;

  // Underlying price: DXLink mark > Yahoo last close > position live
  var underlyingPrice       = null;
  var underlyingPriceSource = null;
  if (d && d.price != null) {
    underlyingPrice       = parseFloat(d.price);
    underlyingPriceSource = d._priceSource === 'DXLink' ? 'dxlink' : 'yahoo_close';
  } else if (pos && pos.underlyingPrice != null) {
    underlyingPrice       = parseFloat(pos.underlyingPrice);
    underlyingPriceSource = 'position_live';
  }

  // Greeks priority: aggregateGreeks result > pos direct fields > pos.live fields > null
  function _gk(snapKey, posKey) {
    if (greeksSnap && greeksSnap[snapKey] !== null && greeksSnap[snapKey] !== undefined) return greeksSnap[snapKey];
    if (pos) {
      if (pos[posKey] !== null && pos[posKey] !== undefined) return pos[posKey];
      var lv = pos.live || {};
      if (lv[posKey] !== null && lv[posKey] !== undefined) return lv[posKey];
    }
    return null;
  }

  // vegaCall/vegaPut: from greeksSnap or computed from pos.legsLive
  var vegaCall = greeksSnap && greeksSnap.vegaCall != null ? greeksSnap.vegaCall : null;
  var vegaPut  = greeksSnap && greeksSnap.vegaPut  != null ? greeksSnap.vegaPut  : null;
  if (vegaCall === null && vegaPut === null && pos) {
    var posLegsLive = pos.legsLive || (pos.live && pos.live.legsLive) || [];
    (pos.legs || []).forEach(function(leg, idx) {
      var ll = posLegsLive[idx];
      if (!ll || ll.vega == null) return;
      if (!isActivePortfolioLeg(leg, pos)) return;
      var lv = ll.vega * (leg.side === 'SHORT' ? -1 : 1) * Math.abs(_portfolioLegEffectiveQty(leg) || 0);
      if (leg.type === 'CALL') { if (vegaCall === null) vegaCall = 0; vegaCall += lv; }
      if (leg.type === 'PUT')  { if (vegaPut  === null) vegaPut  = 0; vegaPut  += lv; }
    });
  }

  // Resolve position/greeksSnap level Greeks into named variables
  var delta             = _gk('totalDelta',        'delta');
  var theta             = _gk('totalTheta',        'theta');
  var gamma             = _gk('totalGamma',        'gamma');
  var vega              = _gk('totalVega',         'vega');
  var beta              = _gk('avgBeta',           'beta');
  var betaWeightedDelta = _gk('betaWeightedDelta', 'betaWeightedDelta');

  // S.greeksCache fallback — TT/DXLink data keyed by streamerSymbol.
  // Used when pos/legsLive had no Greek data (e.g. manual journal form, new position).
  // Applies sign × qty aggregation per leg, identical to refreshPositionsLive.
  var _cacheLegs = (pos && pos.legs) || _legs || [];
  if (S.greeksCache && _cacheLegs.length &&
      (delta === null || theta === null || gamma === null || vega === null ||
       vegaCall === null || vegaPut === null)) {
    var _cD = null, _cTh = null, _cGa = null, _cV = null, _cVc = null, _cVp = null;
    _cacheLegs.forEach(function(leg) {
      // Prefer the stored streamerSymbol (may be real TT chain symbol with decimals);
      // fall back to builder to match keys written by _journalSnapshotPrefetch.
      var sym = ((leg.type === 'CALL' || leg.type === 'PUT') && ticker)
        ? (leg.streamerSymbol || buildStreamerSymbol(ticker, leg.expiry, leg.strike, leg.type === 'CALL' ? 'C' : 'P'))
        : leg.streamerSymbol;
      if (!sym || !S.greeksCache[sym]) return;
      var gd    = S.greeksCache[sym];
      var lSign = leg.side === 'SHORT' ? -1 : 1;
      var lQty  = Math.abs(_portfolioLegEffectiveQty(leg) || 0);
      var found = [];
      if (gd.delta !== null && gd.delta !== undefined) { _cD  = (_cD  === null ? 0 : _cD)  + gd.delta * lSign * lQty; found.push('delta'); }
      if (gd.theta !== null && gd.theta !== undefined) { _cTh = (_cTh === null ? 0 : _cTh) + gd.theta * lSign * lQty; found.push('theta'); }
      if (gd.gamma !== null && gd.gamma !== undefined) { _cGa = (_cGa === null ? 0 : _cGa) + gd.gamma * lSign * lQty; found.push('gamma'); }
      if (gd.vega  !== null && gd.vega  !== undefined) {
        var lv = gd.vega * lSign * lQty;
        _cV  = (_cV  === null ? 0 : _cV)  + lv;
        if (leg.type === 'CALL') _cVc = (_cVc === null ? 0 : _cVc) + lv;
        if (leg.type === 'PUT')  _cVp = (_cVp === null ? 0 : _cVp) + lv;
        found.push('vega');
      }
      if (found.length) {
        console.log('[JOURNAL SNAPSHOT CACHE HIT]', {
          symbol:        ticker,
          streamerSymbol: sym,
          fieldsFound:   found,
        });
      }
    });
    if (delta    === null && _cD  !== null) delta    = _cD;
    if (theta    === null && _cTh !== null) theta    = _cTh;
    if (gamma    === null && _cGa !== null) gamma    = _cGa;
    if (vega     === null && _cV  !== null) vega     = _cV;
    if (vegaCall === null && _cVc !== null) vegaCall = _cVc;
    if (vegaPut  === null && _cVp !== null) vegaPut  = _cVp;
  }

  // IVR: getCanonicalIvr() is the sole source — never falls back to scanData or pos.
  var _canonIvr = getCanonicalIvr(ticker);
  var ivr       = _canonIvr.ivr;
  var ivrSource = _canonIvr.source;
  var ivrReason = _canonIvr.reason;

  // Earnings: scanData preferred, fallback to position live
  var nextEarnings = (d && d.nextEarnings) ? d.nextEarnings
                   : (pos && pos.nextEarnings) ? pos.nextEarnings : null;
  var dteEarnings  = nextEarnings ? Math.ceil((new Date(nextEarnings) - Date.now()) / 86400000) : null;

  return {
    timestamp:             new Date().toISOString(),
    underlyingPrice:       underlyingPrice,
    underlyingPriceSource: underlyingPriceSource,
    delta:                 delta,
    theta:                 theta,
    gamma:                 gamma,
    vega:                  vega,
    vegaCall:              vegaCall,
    vegaPut:               vegaPut,
    beta:                  beta,
    betaWeightedDelta:     betaWeightedDelta,
    ivr:                   ivr,
    ivrSource:             ivrSource,
    ivrReason:             ivrReason,
    nextEarnings:          nextEarnings,
    dteEarnings:           dteEarnings,
    marketRegime:          mr ? Object.assign({}, mr, {
                             computedAt: mr.computedAt instanceof Date
                               ? mr.computedAt.toISOString() : (mr.computedAt || null)
                           }) : null,
    source:                d ? (d._priceSource || 'scan') : 'manual',
  };
}

function _logSnapshot(type, ticker, snap) {
  debugLog('journal', '[JOURNAL SNAPSHOT]', JSON.stringify({
    snapshotType:  type,
    symbol:        ticker,
    hasGreeks:     snap.delta !== null || snap.theta !== null || snap.gamma !== null || snap.vega !== null,
    hasUnderlying: snap.underlyingPrice !== null,
    snapshot:      snap,
  }));
  debugLog('journal', '[JOURNAL SNAPSHOT OUTPUT]', JSON.stringify({
    snapshotType:    type,
    symbol:          ticker,
    delta:           snap.delta,
    theta:           snap.theta,
    gamma:           snap.gamma,
    vega:            snap.vega,
    ivr:             snap.ivr,
    underlyingPrice: snap.underlyingPrice,
  }));
}

// Build a greeksToMerge object from S.greeksCache using normalized streamerSymbols.
// Returns {} (not null) so _buildRichSnapshot always receives a valid object.
function _greeksMergeFromCache(ticker, legs) {
  var cache = S.greeksCache;
  var cacheKeys = cache ? Object.keys(cache) : [];
  console.log('[JOURNAL GREEKS CACHE STATE]', JSON.stringify({
    populated:    !!cache,
    keysCount:    cacheKeys.length,
    first5Keys:   cacheKeys.slice(0, 5),
    sampleValues: (function() { var s = {}; cacheKeys.slice(0, 2).forEach(function(k) { s[k] = cache[k]; }); return s; })(),
  }));

  if (!cache || !legs || !legs.length) return {};

  var normLegs = legs.map(function(leg) {
    var sym = ((leg.type === 'CALL' || leg.type === 'PUT') && ticker)
      ? (leg.streamerSymbol || buildStreamerSymbol(ticker, leg.expiry, leg.strike, leg.type === 'CALL' ? 'C' : 'P'))
      : (leg.streamerSymbol || null);
    return { leg: leg, sym: sym };
  });

  console.log('[JOURNAL SNAPSHOT INPUT]', JSON.stringify({
    ticker:              ticker,
    legsCount:           legs.length,
    normalizedSymbols:   normLegs.map(function(x) { return x.sym; }),
  }));

  var _TTL = 24 * 60 * 60 * 1000;
  var delta = null, theta = null, gamma = null, vega = null, vegaCall = null, vegaPut = null;
  normLegs.forEach(function(item) {
    var sym      = item.sym;
    var leg      = item.leg;
    var cacheHit = !!(sym && cache[sym]);
    if (cacheHit) {
      var _ca = cache[sym].cachedAt ? new Date(cache[sym].cachedAt).getTime() : null;
      if (_ca && (Date.now() - _ca) > _TTL) {
        console.log('[GREEKS CACHE STALE]', JSON.stringify({ symbol: sym, cachedAt: cache[sym].cachedAt }));
        cacheHit = false;
      }
    }
    console.log('[JOURNAL SNAPSHOT CACHE LOOKUP]', JSON.stringify({
      normalizedStreamerSymbol: sym,
      cacheHit:                cacheHit,
      cachedGreeks:            cacheHit ? cache[sym] : null,
    }));
    if (!cacheHit) return;
    var gd    = cache[sym];
    var lSign = leg.side === 'SHORT' ? -1 : 1;
    var lQty  = Math.abs(_portfolioLegEffectiveQty(leg) || 0);
    if (gd.delta !== null && gd.delta !== undefined) { delta    = (delta    === null ? 0 : delta)    + gd.delta * lSign * lQty; }
    if (gd.theta !== null && gd.theta !== undefined) { theta    = (theta    === null ? 0 : theta)    + gd.theta * lSign * lQty; }
    if (gd.gamma !== null && gd.gamma !== undefined) { gamma    = (gamma    === null ? 0 : gamma)    + gd.gamma * lSign * lQty; }
    if (gd.vega  !== null && gd.vega  !== undefined) {
      var lv = gd.vega * lSign * lQty;
      vega    = (vega    === null ? 0 : vega)    + lv;
      if (leg.type === 'CALL') { vegaCall = (vegaCall === null ? 0 : vegaCall) + lv; }
      if (leg.type === 'PUT')  { vegaPut  = (vegaPut  === null ? 0 : vegaPut)  + lv; }
    }
  });

  var result = {};
  if (delta    !== null) result.delta    = delta;
  if (theta    !== null) result.theta    = theta;
  if (gamma    !== null) result.gamma    = gamma;
  if (vega     !== null) result.vega     = vega;
  if (vegaCall !== null) result.vegaCall = vegaCall;
  if (vegaPut  !== null) result.vegaPut  = vegaPut;
  console.log('[JOURNAL SNAPSHOT CACHE LOOKUP OUTPUT]', JSON.stringify({
    ticker:    ticker,
    hasGreeks: Object.keys(result).length > 0,
    result:    result,
  }));
  return result;
}
