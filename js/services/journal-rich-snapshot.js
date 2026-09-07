// ── RICH ASYNC SNAPSHOT — fetches 1D candles, calculates all indicators ──────
// greeksToMerge: optional {delta,theta,gamma,vega,vegaCall,vegaPut,beta,betaWeightedDelta}
async function _buildRichSnapshot(ticker, greeksToMerge) {
  var now = new Date().toISOString();
  var d   = ticker ? S.scanData.find(function(x) { return x.ticker === ticker; }) : null;

  // ── 1. Underlying price — Tastytrade primary ──────────────────────────────
  var underlyingPrice          = null;
  var underlyingPriceTimestamp = null;
  var priceSource              = null;
  var fallbackUsed             = false;

  if (d && d.price != null && !isNaN(parseFloat(d.price))) {
    underlyingPrice          = parseFloat(d.price);
    priceSource              = 'TASTYTRADE';
    underlyingPriceTimestamp = d._priceTimestamp || now;
    fallbackUsed             = false;
  }
  // Fallback: DXLink bid/ask mid from S.greeksCache[ticker] when scanData is absent
  if (underlyingPrice === null && ticker && S.greeksCache && S.greeksCache[ticker]) {
    var _uc = S.greeksCache[ticker];
    var _ucCa = _uc.cachedAt ? new Date(_uc.cachedAt).getTime() : null;
    if (_ucCa && (Date.now() - _ucCa) > 24 * 60 * 60 * 1000) {
      console.log('[GREEKS CACHE STALE]', JSON.stringify({ symbol: ticker, cachedAt: _uc.cachedAt }));
      _uc = null;
    }
    var _bid = (_uc && _uc.bid != null && !isNaN(parseFloat(_uc.bid))) ? parseFloat(_uc.bid) : null;
    var _ask = (_uc && _uc.ask != null && !isNaN(parseFloat(_uc.ask))) ? parseFloat(_uc.ask) : null;
    if (_bid !== null && _ask !== null) {
      underlyingPrice = Math.round((_bid + _ask) / 2 * 100) / 100;
    } else if (_bid !== null) {
      underlyingPrice = _bid;
    } else if (_ask !== null) {
      underlyingPrice = _ask;
    }
    if (underlyingPrice !== null) {
      priceSource  = 'dxlink_cache';
      fallbackUsed = true;
      console.log('[JOURNAL SNAPSHOT UNDERLYING CACHE FALLBACK]', JSON.stringify({
        ticker:          ticker,
        bid:             _bid,
        ask:             _ask,
        underlyingPrice: underlyingPrice,
      }));
    }
  }

  // ── 2. Technical indicators from DXLink Candle buffer (1H → 4H → 1D → null) ─
  // Buffer is pre-filled by _ensureCandleSubscription (called from _journalSnapshotPrefetch).
  // SPY is always co-subscribed; RS vs SPY comes from the same buffer timeframe.
  // This step is fully synchronous — never awaits, never blocks trade insertion.
  var indicatorSource       = null;
  var indicatorMissingReason = null;
  var _tr = ticker
    ? _getIntradayTech(ticker, underlyingPrice)
    : { technicals: null, indicatorSource: 'UNAVAILABLE', indicatorMissingReason: 'no_ticker' };
  indicatorSource        = _tr.indicatorSource;
  indicatorMissingReason = _tr.indicatorMissingReason;
  // Fall through to empty-shape object when buffer is insufficient — snapshot still saves.
  var technicals = _tr.technicals || _calcTechnicalsFromCandles(null, null, null);

  // ── 5. IVR — cache first (TASTYTRADE only), then live TT fetch, never proxy ──
  var ivr = null, ivSource = null, ivrReason = null;
  if (ticker) {
    var _cacheEntry = _ivrCache[ticker];
    if (_cacheEntry && _cacheEntry.source === 'TASTYTRADE' && _cacheEntry.ivr != null) {
      ivr      = _cacheEntry.ivr;
      ivSource = 'TASTYTRADE';
      console.log('[IVR] _buildRichSnapshot cache hit TASTYTRADE ivr='+ivr+' ticker='+ticker);
    } else if (S.ttSessionId) {
      try {
        var _ivrData = await ttCall('/options/ivr/' + ticker);
        if (_ivrData && _ivrData.ivRank != null) {
          ivr      = parseFloat(_ivrData.ivRank);
          ivSource = 'TASTYTRADE';
          ivrReason = null;
          _ivrCache[ticker] = { symbol: ticker, ivr: ivr, iv: _ivrData.iv||null, hv: _ivrData.hv||null, source: 'TASTYTRADE', updatedAt: Date.now(), reason: null };
          console.log('[IVR] _buildRichSnapshot fetched TASTYTRADE ivr='+ivr+' ticker='+ticker);
        } else {
          ivSource = 'TASTYTRADE_UNAVAILABLE';
          ivrReason = 'NO_TASTYTRADE_IVR';
          _ivrCache[ticker] = { symbol: ticker, ivr: null, iv: (_ivrData&&_ivrData.iv)||null, hv: (_ivrData&&_ivrData.hv)||null, source: 'TASTYTRADE_UNAVAILABLE', updatedAt: Date.now(), reason: 'NO_TASTYTRADE_IVR' };
          console.log('[IVR] _buildRichSnapshot TASTYTRADE_UNAVAILABLE ticker='+ticker);
        }
      } catch(e) {
        ivSource = 'TASTYTRADE_UNAVAILABLE';
        ivrReason = 'FETCH_ERROR';
        console.log('[IVR] _buildRichSnapshot fetch error ticker='+ticker, e.message);
      }
    } else {
      ivSource = 'TASTYTRADE_UNAVAILABLE';
      ivrReason = 'NO_TT_SESSION';
    }
  }

  // ── 6. Earnings — cache/scanData only; no API calls during snapshot build ──
  var nextEarnings = null, dteEarnings = null, _earningsSrc = 'unavailable';
  if (ticker) {
    var _earningsDate = null;
    if (_earningsCache[ticker]) {
      _earningsDate = _earningsCache[ticker];
      _earningsSrc  = 'earningsCache';
    } else if (d && d.nextEarnings) {
      _earningsDate = d.nextEarnings;
      _earningsSrc  = 'scanData';
    }
    if (_earningsDate) {
      var _staleDte = Math.ceil((new Date(_earningsDate) - Date.now()) / 86400000);
      if (_staleDte < 0) {
        console.log('[EARNINGS] evicting stale entry for', ticker, '→', _earningsDate, '(dte='+_staleDte+')');
        delete _earningsCache[ticker];
        _earningsDate = null;
        _earningsSrc  = 'unavailable';
      }
    }
    if (_earningsDate) {
      var _dte = Math.ceil((new Date(_earningsDate) - Date.now()) / 86400000);
      if (_dte >= 0) { nextEarnings = _earningsDate; dteEarnings = _dte; }
      else { console.log('[EARNINGS] date is past (dte='+_dte+') — skipping'); _earningsSrc = 'unavailable'; }
    }
    console.log('[EARNINGS] snapshot result: src=', _earningsSrc, 'nextEarnings=', nextEarnings, 'dteEarnings=', dteEarnings);
  }

  // ── 7. Market regime ─────────────────────────────────────────────────────
  var mr = S.marketRegime;
  var mrSnap = mr ? Object.assign({}, mr, {
    computedAt: mr.computedAt instanceof Date ? mr.computedAt.toISOString() : (mr.computedAt || null),
  }) : null;

  // ── 8. Greeks — merge if provided ─────────────────────────────────────────
  var g = greeksToMerge || {};

  // ── 9. VIX family — primary: S.vixFamily (dedicated DXLink feed via fetchVixFamily());
  //                   fallback: S.scanData DXLink-only entries (reject Yahoo/stale) ──
  // Check S.vixFamily.vix (not just S.vixFamily) — a timed-out fetch leaves a truthy
  // all-null object; we must still wait/retry in that case.
  console.log('[SNAPSHOT] step 9 VIX check: S.vixFamily=',
    S.vixFamily ? JSON.stringify({vix:S.vixFamily.vix,vix9d:S.vixFamily.vix9d}) : 'null',
    'ttConnected=', S.ttConnected);
  if ((!S.vixFamily || S.vixFamily.vix == null) && S.ttConnected) {
    try {
      console.log('[SNAPSHOT] awaiting VIX family (in-flight or starting now)');
      await Promise.race([_ensureVixFamily(), new Promise(function(r) { setTimeout(r, 4000); })]);
    } catch(e) {}
    console.log('[SNAPSHOT] VIX family ready:', S.vixFamily ? JSON.stringify({
      vix: S.vixFamily.vix, vix9d: S.vixFamily.vix9d,
      vix3m: S.vixFamily.vix3m, vix6m: S.vixFamily.vix6m,
    }) : 'still null');
  }
  function _vixLookup(vfKey, candidates) {
    // Primary: S.vixFamily populated by fetchVixFamily()
    if (S.vixFamily && S.vixFamily[vfKey] != null) {
      return { val: S.vixFamily[vfKey], src: 'vixFamily' };
    }
    // Fallback: S.scanData (DXLink-sourced only)
    for (var _i = 0; _i < candidates.length; _i++) {
      var _sd = S.scanData.find(function(x) { return x.ticker === candidates[_i]; });
      if (_sd && _sd._priceSource === 'DXLink' && _sd.price != null && !isNaN(parseFloat(_sd.price))) {
        return { val: Math.round(parseFloat(_sd.price) * 100) / 100, src: 'scanData' };
      }
    }
    return null;
  }
  var _vE   = _vixLookup('vix',   ['VIX',   '^VIX']);
  var _v9   = _vixLookup('vix9d', ['VIX9D', '^VIX9D']);
  var _v3   = _vixLookup('vix3m', ['VIX3M', '^VIX3M']);
  var _v6   = _vixLookup('vix6m', ['VIX6M', '^VIX6M']);
  var vix   = _vE ? _vE.val : null;
  var vix9d = _v9 ? _v9.val : null;
  var vix3m = _v3 ? _v3.val : null;
  var vix6m = _v6 ? _v6.val : null;

  var vixSpread_9d_0  = (vix9d !== null && vix   !== null) ? Math.round((vix9d - vix)   * 100) / 100 : null;
  var vixSpread_3m_0  = (vix3m !== null && vix   !== null) ? Math.round((vix3m - vix)   * 100) / 100 : null;
  var vixSpread_6m_3m = (vix6m !== null && vix3m !== null) ? Math.round((vix6m - vix3m) * 100) / 100 : null;

  var vixRatio_9d_0  = (vix9d !== null && vix   !== null && vix   > 0) ? Math.round(vix9d / vix   * 1000) / 1000 : null;
  var vixRatio_3m_0  = (vix3m !== null && vix   !== null && vix   > 0) ? Math.round(vix3m / vix   * 1000) / 1000 : null;
  var vixRatio_6m_3m = (vix6m !== null && vix3m !== null && vix3m > 0) ? Math.round(vix6m / vix3m * 1000) / 1000 : null;

  var vixCurveState = 'UNKNOWN';
  if (vix !== null && vix9d !== null && vix3m !== null && vix6m !== null) {
    if      (vix9d < vix && vix < vix3m && vix3m < vix6m) vixCurveState = 'CONTANGO';
    else if (vix9d > vix && vix > vix3m)                   vixCurveState = 'BACKWARDATION';
    else                                                    vixCurveState = 'MIXED';
  } else if (vix !== null && vix9d !== null && vix3m !== null) {
    if      (vix9d > vix && vix > vix3m) vixCurveState = 'BACKWARDATION';
    else                                  vixCurveState = 'MIXED';
  }

  var vixStressFlag = 'UNKNOWN';
  if (vix !== null && vix9d !== null && vix3m !== null) {
    if      (vix9d > vix && vix > vix3m)                          vixStressFlag = 'SHORT_TERM_STRESS';
    else if (vix6m !== null && vix > vix3m && vix3m > vix6m)      vixStressFlag = 'FULL_CURVE_STRESS';
    else if (vixCurveState === 'CONTANGO')                         vixStressFlag = 'NORMAL';
  }

  console.log('[SNAPSHOT] VIX values saved: vix=' + vix + ' vix9d=' + vix9d +
    ' vix3m=' + vix3m + ' vix6m=' + vix6m +
    ' curveState=' + (vixCurveState) + ' stressFlag=' + (vixStressFlag));
  var _vixFirst = _vE || _v9 || _v3 || _v6;
  var vixTimestamp = _vixFirst
    ? (_vixFirst.src==='vixFamily'&&S.vixFamily&&S.vixFamily.timestamp
        ? S.vixFamily.timestamp
        : (S.lastScan ? S.lastScan.toISOString() : now))
    : null;
  var vixSource      = _vixFirst ? 'DXLink' : null;
  var vixSymbolsUsed = (_vixFirst&&_vixFirst.src==='vixFamily'&&S.vixFamily&&S.vixFamily.symbolsUsed)
    ? S.vixFamily.symbolsUsed : null;

  // Beta for the entry snapshot: explicit greeks-merge beta wins, then the latest
  // trusted backend beta from GET /market/betas/latest (populated by the Portfolio's
  // refreshPortfolioBetas), then scanData. When the backend latest beta is used we also
  // persist its source and fetch time so the snapshot is auditable. Never invented.
  var _latestBetaEntry = _portfolioLatestBackendBetaEntry(ticker);
  var _snapBeta, _snapBetaSource = null, _snapBetaFetchedAt = null;
  if (g.beta !== undefined) {
    _snapBeta = g.beta;
    _snapBetaSource = g.betaSource || (d && d.betaSource) || null;
  } else if (_latestBetaEntry) {
    _snapBeta = +_latestBetaEntry.beta;
    _snapBetaSource = _latestBetaEntry.source || 'tastytrade';
    _snapBetaFetchedAt = _latestBetaEntry.fetchedAt || null;
  } else {
    _snapBeta = (d && d.beta != null ? parseFloat(d.beta) : null);
    _snapBetaSource = (d && d.betaSource) || (_snapBeta != null ? 'scanData' : null);
  }
  var _snapDelta  = g.delta !== undefined ? g.delta : null;
  var _snapBwd    = g.betaWeightedDelta !== undefined ? g.betaWeightedDelta :
                    (_snapDelta !== null && _snapBeta !== null ? Math.round(_snapDelta * _snapBeta * 1000000) / 1000000 : null);
  var _snapBwdSrc = _snapBwd !== null ? 'calculated' : 'unavailable';

  // Per-timeframe technicals (candle-derived) — hoisted so the squeeze booleans can
  // be persisted explicitly alongside the full tech objects. null when that TF has
  // < 20 candles buffered.
  var _tech4h = _getTechForTF(ticker, '4H', underlyingPrice);
  var _tech1d = _getTechForTF(ticker, '1D', underlyingPrice);
  var _sq1d = (_tech1d && typeof _tech1d.squeeze === 'boolean') ? _tech1d.squeeze : null;
  var _sq4h = (_tech4h && typeof _tech4h.squeeze === 'boolean') ? _tech4h.squeeze : null;
  var _squeezeSource = (_sq1d !== null || _sq4h !== null) ? (indicatorSource || 'candles') : null;

  return Object.assign({
    timestamp:                 now,
    underlyingPrice:           underlyingPrice,
    underlyingPriceTimestamp:  underlyingPriceTimestamp,
    priceSource:               priceSource,
    fallbackUsed:              fallbackUsed,
    delta:                     _snapDelta,
    theta:                     g.theta              !== undefined ? g.theta              : null,
    gamma:                     g.gamma              !== undefined ? g.gamma              : null,
    vega:                      g.vega               !== undefined ? g.vega               : null,
    vegaCall:                  g.vegaCall           !== undefined ? g.vegaCall           : null,
    vegaPut:                   g.vegaPut            !== undefined ? g.vegaPut            : null,
    beta:                      _snapBeta,
    betaSource:                _snapBeta != null ? (_snapBetaSource || g.betaSource || (d && d.betaSource) || 'scanData') : null,
    betaFetchedAt:             _snapBeta != null ? _snapBetaFetchedAt : null,
    betaUpdatedAt:             _snapBeta != null ? _snapBetaFetchedAt : null,
    betaWeightedDelta:         _snapBwd,
    // Persist IVR as a normalized percent (Tastytrade ratio 1.023 → 102.3) so the
    // value read back from GET /journal/trades renders correctly without the caller
    // having to know the source unit. ivrRaw keeps the untouched source value for
    // traceability/audit. normalizeIvrPercent is idempotent for already-percent input.
    ivr:                       ivr != null ? normalizeIvrPercent(ivr) : null,
    ivrRaw:                    ivr,
    ivSource:                  ivSource,
    ivrSource:                 ivSource,
    ivrReason:                 ivrReason,
    nextEarnings:              nextEarnings,
    earningsDate:              nextEarnings,
    dteEarnings:               dteEarnings,
    dteToEarnings:             dteEarnings,
    _earningsSrc:              _earningsSrc,
    earningsSource:            _earningsSrc,
    _bwdSrc:                   _snapBwdSrc,
    marketRegime:              mrSnap,
    indicatorSource:           indicatorSource,
    indicatorMissingReason:    indicatorMissingReason,
    source:                    d ? (d._priceSource || 'scan') : 'manual',
    vix:                       vix,
    vix9d:                     vix9d,
    vix3m:                     vix3m,
    vix6m:                     vix6m,
    vixSpread_9d_0:            vixSpread_9d_0,
    vixSpread_3m_0:            vixSpread_3m_0,
    vixSpread_6m_3m:           vixSpread_6m_3m,
    vixRatio_9d_0:             vixRatio_9d_0,
    vixRatio_3m_0:             vixRatio_3m_0,
    vixRatio_6m_3m:            vixRatio_6m_3m,
    vixCurveState:             vixCurveState,
    vixStressFlag:             vixStressFlag,
    vixTimestamp:              vixTimestamp,
    vixSource:                 vixSource,
    vixSymbolsUsed:            vixSymbolsUsed,
    // Per-timeframe tech objects for export — independent of primary indicatorSource.
    // null when that TF has fewer than 20 candles in the buffer.
    tech4h:                    _tech4h,
    tech1d:                    _tech1d,
    // Explicit squeeze source/value for the Portfolio + Journal (Part 3). Booleans
    // mirror tech1d/tech4h.squeeze; `false` is a REAL state ('OFF'), never dropped.
    squeeze1d:                 _sq1d,
    squeeze4h:                 _sq4h,
    squeezeSource:             _squeezeSource,
  }, technicals);
}
