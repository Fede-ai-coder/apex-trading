// ══════════════════════════════════════════════════════════════════
// PORTFOLIO DIRECTIONAL ALIGNMENT ENGINE
// Uses existing smA, calcRSIWilder, getDailyCandles, getFourHourCandles,
// positionManager — no new dependencies or data providers.
// ══════════════════════════════════════════════════════════════════

// Compute technical bias for one symbol across 1D and 4H candle series.
// Each timeframe is scored independently, then combined.
// Returns null only when BOTH timeframes have insufficient candles.
function computePortfolioDirectionalBias(ticker, candles1D, candles4H) {
  function scoreTf(candles, backendTf) {
    try {
      if (backendTf) {
        var bSma20 = backendTf.sma20, bSma30 = backendTf.sma30, bPrice = backendTf.price, bRsi = backendTf.rsi;
        if (!isFinite(bSma20) || !isFinite(bSma30) || !isFinite(bPrice) || !isFinite(bRsi)) return null;
        var bSma8 = isFinite(backendTf.sma8) ? backendTf.sma8 : null;
        var bls = 0, bss = 0;
        if (bSma20 > bSma30) bls++; else if (bSma20 < bSma30) bss++;
        if (bPrice > bSma20) bls++; else if (bPrice < bSma20) bss++;
        if (bSma8 != null) { if (bPrice > bSma8) bls += 0.5; else if (bPrice < bSma8) bss += 0.5; }
        if (bRsi > 60) bls++; else if (bRsi < 40) bss++;
        return { ls: bls, ss: bss, sma8: bSma8, sma20: bSma20, sma30: bSma30, rsi: bRsi, price: bPrice };
      }
      if (!candles || candles.length < 32) return null;
      var closes = candles.map(function(c) { return c.close; });
      var n = closes.length - 1;
      var price    = closes[n];
      var sma8arr  = smA(closes, 8);
      var sma20arr = smA(closes, 20);
      var sma30arr = smA(closes, 30);
      var rsiArr   = calcRSIWilder(closes);
      var sma8  = sma8arr[n];
      var sma20 = sma20arr[n];
      var sma30 = sma30arr[n];
      var rsi   = rsiArr[n];
      if (sma20 == null || sma30 == null) return null;
      var ls = 0, ss = 0;
      // Primary trend structure: SMA20 vs SMA30
      if (sma20 > sma30) ls++; else if (sma20 < sma30) ss++;
      // Price vs SMA20
      if (price > sma20) ls++; else if (price < sma20) ss++;
      // Price vs SMA8 (half-weight secondary signal)
      if (sma8 != null) {
        if (price > sma8) ls += 0.5; else if (price < sma8) ss += 0.5;
      }
      // RSI14 (Wilder)
      if (rsi != null) {
        if (rsi > 60) ls++; else if (rsi < 40) ss++;
      }
      return { ls: ls, ss: ss, sma8: sma8, sma20: sma20, sma30: sma30, rsi: rsi, price: price };
    } catch(e) { return null; }
  }

  // Rolling 20-day excess return vs SPY — same approach as _pfDrawRsPanel
  function computeRs(candles, spyCandles) {
    try {
      if (!candles || candles.length < 22 || !spyCandles || spyCandles.length < 22) return null;
      var dn = candles.length - 1, sn = spyCandles.length - 1;
      if (dn < 20 || sn < 20) return null;
      var stockRet = (candles[dn].close - candles[dn - 20].close) / candles[dn - 20].close;
      var spyRet   = (spyCandles[sn].close - spyCandles[sn - 20].close) / spyCandles[sn - 20].close;
      var rs = stockRet - spyRet;
      var rsRising = null;
      if (dn >= 25 && sn >= 25) {
        var sr5  = (candles[dn - 5].close - candles[dn - 25].close) / candles[dn - 25].close;
        var spy5 = (spyCandles[sn - 5].close - spyCandles[sn - 25].close) / spyCandles[sn - 25].close;
        rsRising = (sr5 - spy5) < rs;
      }
      return { rs: rs, rsRising: rsRising };
    } catch(e) { return null; }
  }

  var spy1D = getDailyCandles('SPY');
  var spy4H = getFourHourCandles('SPY');
  var backendSnapshot = arguments.length > 3 ? arguments[3] : null;
  var tf1D  = scoreTf(candles1D, backendSnapshot && backendSnapshot.oneD ? backendSnapshot.oneD : null);
  var tf4H  = scoreTf(candles4H, backendSnapshot && backendSnapshot.fourH ? backendSnapshot.fourH : null);

  // Append RS vs SPY score (+1 long or +1 short) to each timeframe
  function applyRs(tf, rs) {
    if (!tf || !rs) return;
    if (rs.rsRising || rs.rs > 0) tf.ls++;
    else if (rs.rsRising === false || rs.rs < 0) tf.ss++;
    tf.rs = rs.rs; tf.rsRising = rs.rsRising;
  }
  if (ticker !== 'SPY') {
    applyRs(tf1D, computeRs(candles1D, spy1D));
    applyRs(tf4H, computeRs(candles4H, spy4H));
  }

  if (!tf1D && !tf4H) return null;

  function tfBias(tf) {
    if (!tf) return null;
    var net = tf.ls - tf.ss;
    if (net >= 2) return 'LONG';
    if (net <= -2) return 'SHORT';
    return 'NEUTRAL';
  }
  var bias1D = tfBias(tf1D);
  var bias4H  = tfBias(tf4H);

  var bias, explanation, transitionNote = null;
  if (bias1D && bias4H && bias1D === bias4H) {
    bias = bias1D;
    if (bias === 'LONG')    explanation = '1D and 4H both bullish';
    else if (bias === 'SHORT') explanation = '1D and 4H both bearish';
    else                    explanation = 'Mixed signals on both timeframes';
  } else if (bias1D === 'LONG'  && bias4H === 'NEUTRAL') {
    bias = 'LONG';    transitionNote = '1D bullish, 4H weakening — transition watch';    explanation = transitionNote;
  } else if (bias1D === 'LONG'  && bias4H === 'SHORT') {
    bias = 'NEUTRAL'; explanation = '1D bullish but 4H bearish — conflicting signals';
  } else if (bias1D === 'SHORT' && bias4H === 'NEUTRAL') {
    bias = 'SHORT';   transitionNote = '1D bearish, 4H stabilizing — transition watch'; explanation = transitionNote;
  } else if (bias1D === 'SHORT' && bias4H === 'LONG') {
    bias = 'NEUTRAL'; explanation = '1D bearish but 4H bullish — conflicting signals';
  } else if (bias1D === 'NEUTRAL' && bias4H === 'LONG') {
    bias = 'NEUTRAL'; transitionNote = '4H bullish but 1D still neutral';                    explanation = transitionNote;
  } else if (bias1D === 'NEUTRAL' && bias4H === 'SHORT') {
    bias = 'NEUTRAL'; transitionNote = '4H bearish but 1D still neutral';                    explanation = transitionNote;
  } else if (bias1D && !bias4H) {
    bias = bias1D;  explanation = '1D ' + bias1D.toLowerCase() + ' (4H unavailable)';
  } else if (!bias1D && bias4H) {
    bias = bias4H;  explanation = '4H ' + bias4H.toLowerCase()  + ' (1D unavailable)';
  } else {
    bias = 'NEUTRAL'; explanation = 'Mixed signals';
  }

  return {
    bias: bias, bias1D: bias1D, bias4H: bias4H,
    score1D: tf1D ? { long: tf1D.ls, short: tf1D.ss } : null,
    score4H: tf4H ? { long: tf4H.ls, short: tf4H.ss } : null,
    inputs1D: tf1D ? { rsi: tf1D.rsi, sma20: tf1D.sma20, sma30: tf1D.sma30, price: tf1D.price, rs: tf1D.rs, rsRising: tf1D.rsRising } : null,
    inputs4H: tf4H ? { rsi: tf4H.rsi, sma20: tf4H.sma20, sma30: tf4H.sma30, price: tf4H.price, rs: tf4H.rs, rsRising: tf4H.rsRising } : null,
    explanation: explanation,
    transitionNote: transitionNote,
  };
}

// Classify position delta into exposure bucket.
// Thresholds are _pfDeltaLongThreshold / _pfDeltaShortThreshold — easy to change.
function classifyPortfolioDeltaExposure(totalDelta) {
  if (totalDelta == null) return 'UNKNOWN';
  if (totalDelta > _pfDeltaLongThreshold)  return 'LONG_DELTA';
  if (totalDelta < _pfDeltaShortThreshold) return 'SHORT_DELTA';
  return 'NEUTRAL_DELTA';
}

// Map (bias × delta exposure) → alignment status + explanatory text.
function evaluatePortfolioDirectionalAlignment(bias, deltaExposure) {
  if (!bias || deltaExposure === 'UNKNOWN') return null;
  var T = [
    ['LONG',    'LONG_DELTA',    'ALIGNED',    'Bias LONG and position is LONG delta'],
    ['SHORT',   'SHORT_DELTA',   'ALIGNED',    'Bias SHORT and position is SHORT delta'],
    ['NEUTRAL', 'NEUTRAL_DELTA', 'ALIGNED',    'Neutral bias with flat delta'],
    ['LONG',    'SHORT_DELTA',   'MISALIGNED', 'Bias LONG but position is SHORT delta'],
    ['SHORT',   'LONG_DELTA',    'MISALIGNED', 'Bias SHORT but position is LONG delta'],
    ['LONG',    'NEUTRAL_DELTA', 'WARNING',    'Bias LONG but position has neutral delta — underexposed'],
    ['SHORT',   'NEUTRAL_DELTA', 'WARNING',    'Bias SHORT but position has neutral delta — underexposed'],
    ['NEUTRAL', 'LONG_DELTA',    'WARNING',    'Technical picture is neutral while position still has high delta'],
    ['NEUTRAL', 'SHORT_DELTA',   'WARNING',    'Technical picture is neutral while position still has high delta'],
  ];
  for (var i = 0; i < T.length; i++) {
    if (T[i][0] === bias && T[i][1] === deltaExposure) return { status: T[i][2], text: T[i][3] };
  }
  return { status: 'WARNING', text: 'Mixed alignment' };
}

// Resolve candle arrays for the expanded-row directional alignment banner.
// This is data binding only: it does not change directional rules, labels,
// thresholds, traffic lights, scanner logic, or scoring.
function _pfGetAlignmentCandleInputs(ticker) {
  var normTicker = (_pfNormalizeChartUnderlyingSymbol(ticker) || String(ticker || '').trim().toUpperCase());
  var candles1D = getDailyCandles(normTicker);
  var candles4H = getFourHourCandles(normTicker);
  var source = 'FRONTEND_CANDLE_BUFFER';
  var reason = '';
  var cache = (typeof _pfBackendCandleCache !== 'undefined') ? _pfBackendCandleCache : null;
  var cacheSymbol = cache && (_pfNormalizeChartUnderlyingSymbol(cache.symbol) || String(cache.symbol || '').trim().toUpperCase());
  if (cache && cacheSymbol === normTicker) {
    var b1 = cache.candles1d || null;
    var b4 = cache.candles4h || null;
    if (b1 && b1.length >= 32) candles1D = b1;
    if (b4 && b4.length >= 32) candles4H = b4;
    if ((b1 && b1.length >= 32) || (b4 && b4.length >= 32)) {
      source = cache.source || 'BACKEND_CANDLE_STORE';
    } else {
      reason = 'backend_cache_insufficient:1D=' + (b1 ? b1.length : 0) + ':4H=' + (b4 ? b4.length : 0);
    }
  } else if (cache && cacheSymbol && cacheSymbol !== normTicker) {
    reason = 'backend_cache_symbol_mismatch:' + cacheSymbol;
  } else {
    reason = 'backend_cache_absent';
  }
  return {
    symbol: normTicker,
    candles1D: candles1D,
    candles4H: candles4H,
    source: source,
    reason: reason,
    backendMatched: !!(cache && cacheSymbol === normTicker),
  };
}

// Compute alignment for posId/ticker and update the #pf-align-{posId} div.
// Called from _pfDrawTf after every successful chart render.
function _pfUpdateAlignment(posId, ticker) {
  try {
    var el = document.getElementById('pf-align-' + posId);
    if (!el) return;

    ticker = _pfNormalizeChartUnderlyingSymbol(ticker) || String(ticker || '').trim().toUpperCase();
    var _alignCandles = _pfGetAlignmentCandleInputs(ticker);
    var candles1D  = _alignCandles.candles1D;
    var candles4H  = _alignCandles.candles4H;
    var biasResult = computePortfolioDirectionalBias(ticker, candles1D, candles4H);

    var pos        = positionManager.getById(posId);
    var totalDelta = pos ? pos.delta : null;
    var deltaExp   = classifyPortfolioDeltaExposure(totalDelta);
    var alignment  = biasResult ? evaluatePortfolioDirectionalAlignment(biasResult.bias, deltaExp) : null;

    if (!biasResult) {
      var _insReason = _alignCandles.reason || ('candles_insufficient:1D=' + (candles1D ? candles1D.length : 0) + ':4H=' + (candles4H ? candles4H.length : 0));
      console.log('[PORTFOLIO ALIGNMENT] insufficient_data symbol=' + ticker + ' reason=' + _insReason);
      el.innerHTML = '<div style="font-family:var(--M);font-size:8px;color:var(--tx3)">DIRECTIONAL ALIGNMENT: INSUFFICIENT DATA</div>';
      return;
    }
    if (_alignCandles.source === 'BACKEND_CANDLE_STORE') {
      console.log('[PORTFOLIO ALIGNMENT] source=BACKEND_CANDLE_STORE symbol=' + ticker +
        ' 1D=' + (candles1D ? candles1D.length : 0) + ' 4H=' + (candles4H ? candles4H.length : 0));
    }

    var bias = biasResult.bias;
    var biasColor = bias === 'LONG' ? 'var(--gr)' : bias === 'SHORT' ? 'var(--rd)' : 'var(--am)';
    var biasBg    = bias === 'LONG' ? 'rgba(0,212,138,.12)' : bias === 'SHORT' ? 'rgba(232,68,90,.12)' : 'rgba(255,160,0,.10)';

    var dLabel = deltaExp === 'LONG_DELTA' ? 'LONG Δ' : deltaExp === 'SHORT_DELTA' ? 'SHORT Δ' : deltaExp === 'NEUTRAL_DELTA' ? 'NEUTRAL Δ' : '--';
    var dColor = deltaExp === 'LONG_DELTA' ? 'var(--gr)' : deltaExp === 'SHORT_DELTA' ? 'var(--rd)' : 'var(--tx2)';
    var dBg    = deltaExp === 'LONG_DELTA' ? 'rgba(0,212,138,.10)' : deltaExp === 'SHORT_DELTA' ? 'rgba(232,68,90,.10)' : 'rgba(100,100,140,.15)';

    var alnColor = !alignment ? 'var(--tx3)' : alignment.status === 'ALIGNED' ? 'var(--gr)' : alignment.status === 'MISALIGNED' ? 'var(--rd)' : 'var(--am)';
    var alnBg    = !alignment ? 'transparent' : alignment.status === 'ALIGNED' ? 'rgba(0,212,138,.12)' : alignment.status === 'MISALIGNED' ? 'rgba(232,68,90,.12)' : 'rgba(255,160,0,.10)';
    var alnLabel = alignment ? alignment.status : '--';
    var alnText  = alignment ? alignment.text : biasResult.explanation;

    var bS = 'display:inline-block;font-family:var(--M);font-size:8px;font-weight:700;padding:2px 7px;border-radius:3px;border:1px solid currentColor;margin-right:5px;white-space:nowrap';

    function fmtN(v, dp) { return v != null ? v.toFixed(dp != null ? dp : 2) : '--'; }
    function rsLbl(rs, rising) {
      if (rs == null) return '<span style="color:var(--tx3)">--</span>';
      var pct = (rs * 100).toFixed(1);
      var dir = rising === true ? ' ▲' : rising === false ? ' ▼' : '';
      var c   = rs > 0 ? 'var(--gr)' : rs < 0 ? 'var(--rd)' : 'var(--tx3)';
      return '<span style="color:' + c + '">' + (rs >= 0 ? '+' : '') + pct + '%' + dir + '</span>';
    }
    function tfRow(label, inp) {
      if (!inp) return '<tr><td style="color:var(--tx3);padding:2px 10px 2px 0;white-space:nowrap">' + label + '</td>' +
        '<td colspan="4" style="color:var(--tx3);padding:2px 0;font-style:italic">unavailable</td></tr>';
      var rsiC = inp.rsi != null ? (inp.rsi > 60 ? 'var(--gr)' : inp.rsi < 40 ? 'var(--rd)' : 'var(--tx2)') : 'var(--tx3)';
      var smaS = inp.sma20 != null && inp.sma30 != null
        ? (inp.sma20 > inp.sma30 ? '<span style="color:var(--gr)">SMA20&gt;30</span>' : inp.sma20 < inp.sma30 ? '<span style="color:var(--rd)">SMA20&lt;30</span>' : 'SMA20=30')
        : '<span style="color:var(--tx3)">--</span>';
      var pvS = inp.price != null && inp.sma20 != null
        ? (inp.price > inp.sma20 ? '<span style="color:var(--gr)">P&gt;SMA20</span>' : inp.price < inp.sma20 ? '<span style="color:var(--rd)">P&lt;SMA20</span>' : 'P=SMA20')
        : '<span style="color:var(--tx3)">--</span>';
      return '<tr>' +
        '<td style="color:var(--tx3);padding:2px 10px 2px 0;white-space:nowrap">' + label + '</td>' +
        '<td style="padding:2px 10px 2px 0;color:' + rsiC + ';white-space:nowrap">RSI&nbsp;' + fmtN(inp.rsi, 1) + '</td>' +
        '<td style="padding:2px 10px 2px 0;white-space:nowrap">' + smaS + '</td>' +
        '<td style="padding:2px 10px 2px 0;white-space:nowrap">' + pvS  + '</td>' +
        '<td style="padding:2px 0;white-space:nowrap">RS&nbsp;' + rsLbl(inp.rs, inp.rsRising) + '</td>' +
      '</tr>';
    }

    // ── Compute traffic light values before rendering so the risk panel can reference them ──
    var _si  = pos ? inferStructureCountForPosition(pos) : { count: 1, assumed: true };
    var _vix = S.vixFamily ? S.vixFamily.vix3m : null;
    var _ivrNorm = pos ? getPortfolioUnderlyingIvr(pos.ticker, pos) : null;
    var _vc  = pos
      ? evaluateVolatilityDeltaConsistency(pos, _ivrNorm, _vix)
      : { status: 'VOL_UNAVAILABLE', source: 'NONE', range: null, worstShortLegDelta: null };
    var _drs = biasResult ? evaluateDeltaRangeForBias(biasResult.bias, totalDelta, _si.count) : 'DELTA_UNKNOWN';
    var _ea  = pos ? evaluateShortPremiumExitAlert(pos) : { status: 'EXIT_UNAVAILABLE' };
    var _hasShortOpts = pos ? (pos.legs || []).some(function(l) { return l.side === 'SHORT' && l.type !== 'EQUITY'; }) : false;
    var _tl  = computePortfolioRowTrafficLight({
      alignmentStatus: alignment ? alignment.status : null,
      deltaRangeStatus: _drs,
      volatilityStatus: _vc.status,
      totalDelta: totalDelta,
      structureCount: _si.count,
      exitAlertStatus: _ea.status,
      hasShortOptionLegs: _hasShortOpts,
    });
    var _ivr = _ivrNorm;

    var transitionBanner = biasResult.transitionNote
      ? '<div style="font-family:var(--M);font-size:8px;color:var(--am);margin-top:8px;padding:4px 8px;background:rgba(255,160,0,.08);border-radius:3px;border-left:2px solid var(--am)">⚠ ' + escHtml(biasResult.transitionNote) + '</div>'
      : '';
    var _techDbg = pos && pos.technicalAlignmentDebug ? pos.technicalAlignmentDebug : null;
    var technicalAlignmentDebugBlock = '';
    if (_techDbg) {
      var _bias1D = _techDbg.bias1D != null ? String(_techDbg.bias1D) : 'unknown';
      var _bias4H = _techDbg.bias4H != null ? String(_techDbg.bias4H) : 'unknown';
      var _agreement = _techDbg.agreement != null ? String(_techDbg.agreement) : 'unknown';
      var _posDir = _techDbg.positionDirection != null ? String(_techDbg.positionDirection) : '';
      var _missing = Array.isArray(_techDbg.missingFields) ? _techDbg.missingFields.filter(Boolean).join(', ') : '';
      var _reasons = Array.isArray(_techDbg.reasons) ? _techDbg.reasons.filter(Boolean).join(' · ') : '';
      technicalAlignmentDebugBlock =
        '<div style="font-family:var(--M);font-size:8px;color:var(--tx2);margin:6px 0 8px 0;padding:4px 6px;border:1px solid rgba(120,130,150,.35);border-radius:3px;background:rgba(120,130,150,.08)">' +
          '<div>Technical alignment: 1D ' + escHtml(_bias1D) + ' / 4H ' + escHtml(_bias4H) + ' / ' + escHtml(_agreement) + '</div>' +
          (_posDir ? '<div style="color:var(--tx3);margin-top:2px">Position: ' + escHtml(_posDir) + '</div>' : '') +
          (_missing ? '<div style="color:var(--tx3);margin-top:2px">Missing: ' + escHtml(_missing) + '</div>' : '') +
          (_reasons ? '<div style="color:var(--tx3);margin-top:2px">Reason: ' + escHtml(_reasons) + '</div>' : '') +
        '</div>';
    }
    var _shortOptCount = pos ? (pos.legs || []).filter(function(l) { return l.side === 'SHORT' && l.type !== 'EQUITY'; }).length : 0;
    var riskPanel = _pfBuildAlignmentRiskPanel(biasResult.bias, totalDelta, alignment, _si, _drs, _vc, _tl, _ivr, _vix, _ea, _shortOptCount);

    el.innerHTML =
      // Badge row
      '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:8px">' +
        '<span style="font-family:var(--M);font-size:8px;font-weight:700;color:var(--tx3);margin-right:4px;white-space:nowrap;letter-spacing:.04em">DIRECTIONAL ALIGNMENT</span>' +
        '<span style="' + bS + ';color:' + biasColor + ';background:' + biasBg + '">' + bias + '</span>' +
        '<span style="' + bS + ';color:' + dColor    + ';background:' + dBg    + '">' + dLabel + (totalDelta != null ? ' (' + (totalDelta >= 0 ? '+' : '') + totalDelta.toFixed(1) + ')' : '') + '</span>' +
        '<span style="' + bS + ';color:' + alnColor  + ';background:' + alnBg  + '">' + alnLabel + '</span>' +
      '</div>' +
      // Explanation
      '<div style="font-family:var(--M);font-size:8px;color:var(--tx2);margin-bottom:8px;font-style:italic">' + escHtml(alnText) + '</div>' +
      technicalAlignmentDebugBlock +
      // Inputs table
      '<table style="font-family:var(--M);font-size:8px;border-collapse:collapse;width:100%">' +
        tfRow('1D', biasResult.inputs1D) +
        tfRow('4H', biasResult.inputs4H) +
      '</table>' +
      transitionBanner +
      riskPanel;

    // ── Update cache and dot ──
    if (pos) {
      _pfAlignmentCache[posId] = {
        biasResult: biasResult, alignment: alignment, deltaExp: deltaExp,
        totalDelta: totalDelta, structInfo: _si, deltaRangeStatus: _drs,
        volConsistency: _vc, exitAlert: _ea, trafficLight: _tl,
      };
      _pfUpdateRowTrafficLight(posId);
    }
  } catch(e) {
    try {
      var el2 = document.getElementById('pf-align-' + posId);
      if (el2) el2.innerHTML = '<div style="font-family:var(--M);font-size:8px;color:var(--tx3)">Alignment: error</div>';
    } catch(_) { /* silent */ }
  }
}

// ══════════════════════════════════════════════════════════════════
// PORTFOLIO ROW TRAFFIC LIGHT — helpers
// All functions below are self-contained; they reuse existing engine
// functions (computePortfolioDirectionalBias, etc.) and global state
// (S.vixFamily, positionManager) without duplicating any logic.
// ══════════════════════════════════════════════════════════════════

// Structure-scaled delta acceptable ranges.
// All thresholds multiply by structureCount so 2 strangles = 2× the single-unit range.
function getStructureScaledDeltaRanges(structureCount) {
  var n = Math.max(1, Number(structureCount) || 1);
  return {
    neutralMin:  -10 * n,
    neutralMax:   10 * n,
    longMin:      10 * n,
    longTarget:   20 * n,
    longMax:      30 * n,
    shortMin:    -30 * n,   // most-negative acceptable (too short beyond this)
    shortTarget: -20 * n,
    shortMax:    -10 * n,   // least-negative acceptable (not short enough above this)
  };
}

// Classify whether totalDelta fits the bias for structureCount units.
function evaluateDeltaRangeForBias(bias, totalDelta, structureCount) {
  if (totalDelta == null || !isFinite(totalDelta)) return 'DELTA_UNKNOWN';
  if (!bias) return 'DELTA_UNKNOWN';
  var r = getStructureScaledDeltaRanges(structureCount);
  if (bias === 'NEUTRAL') {
    return (totalDelta >= r.neutralMin && totalDelta <= r.neutralMax) ? 'DELTA_OK' : 'DELTA_NEUTRAL_TOO_DIRECTIONAL';
  }
  if (bias === 'LONG') {
    if (totalDelta < 0)       return 'DELTA_WRONG_DIRECTION';
    if (totalDelta < r.longMin) return 'DELTA_TOO_LOW';
    if (totalDelta > r.longMax) return 'DELTA_TOO_HIGH';
    return 'DELTA_OK';
  }
  if (bias === 'SHORT') {
    if (totalDelta > 0)          return 'DELTA_WRONG_DIRECTION';
    if (totalDelta < r.shortMin) return 'DELTA_TOO_HIGH';   // too far short
    if (totalDelta > r.shortMax) return 'DELTA_TOO_LOW';    // not short enough
    return 'DELTA_OK';
  }
  // TRANSITION / other — treat like NEUTRAL
  var absD = Math.abs(totalDelta);
  return absD <= r.neutralMax ? 'DELTA_OK' : 'DELTA_NEUTRAL_TOO_DIRECTIONAL';
}

// Best-effort: infer how many minimum structures the position represents.
// Uses the smallest non-zero absolute qty across option legs as the unit count.
function inferStructureCountForPosition(position) {
  try {
    var legs = position.legs || [];
    var optLegs = legs.filter(function(l) { return l.type !== 'EQUITY'; });
    if (!optLegs.length) return { count: 1, assumed: true };
    var qtys = optLegs.map(function(l) { return Math.abs(parseFloat(l.qty) || 0); })
                      .filter(function(q) { return q > 0; });
    if (!qtys.length) return { count: 1, assumed: true };
    var minQty = Math.min.apply(null, qtys);
    return { count: Math.max(1, Math.round(minQty)), assumed: false };
  } catch(e) { return { count: 1, assumed: true }; }
}

// IVR → target short-leg delta range [min, max] as percentage points.
function getIvrDeltaRange(ivr) {
  if (ivr == null || !isFinite(Number(ivr))) return null;
  ivr = Number(ivr);
  if (ivr < 40) return [12, 15];
  if (ivr < 60) return [10, 12];
  return [8, 10];
}

// VIX3M → target short-leg delta range [min, max] as percentage points.
function getVix3mDeltaRange(vix3m) {
  if (vix3m == null || !isFinite(Number(vix3m))) return null;
  vix3m = Number(vix3m);
  if (vix3m < 15) return [15, 20];
  if (vix3m < 17) return [12, 15];
  if (vix3m < 20) return [10, 12];
  if (vix3m < 30) return [8,  10];
  if (vix3m < 40) return [6,  8];
  return [4, 6];
}

// Format a VIX3M delta range for display, substituting special labels for extreme regimes.
// VIX3M 30–40 ([6,8])  → "≤8"   (both sides of market are volatile; cap is the binding constraint)
// VIX3M > 40  ([4,6])  → "≈5"   (extremely high vol; tight midpoint target)
function _fmtVix3mRangeDisplay(range, vix3mVal) {
  if (!range) return null;
  var v = vix3mVal != null ? Number(vix3mVal) : null;
  if (v != null && v >= 40) return '≈5';   // ≈5
  if (v != null && v >= 30) return '≤8';   // ≤8
  return range[0] + '–' + range[1];        // N–N
}

// Tolerance applied around the ideal short-leg delta range.
// Short-leg delta inside [idealMin-TOL, idealMax+TOL] is VOL_OK_WITH_TOLERANCE.
var VOL_DELTA_TOLERANCE = 8;

// Select the more conservative (lower upper bound) of two target ranges.
// "More conservative" = lower [1]; ties broken by lower [0].
function selectConservativeVolDeltaRange(ivrRange, vix3mRange) {
  if (!ivrRange && !vix3mRange) return null;
  if (ivrRange  && !vix3mRange) return { range: ivrRange,   source: 'IVR' };
  if (!ivrRange && vix3mRange)  return { range: vix3mRange, source: 'VIX3M' };
  if (ivrRange[1] < vix3mRange[1]) return { range: ivrRange,   source: 'IVR' };
  if (vix3mRange[1] < ivrRange[1]) return { range: vix3mRange, source: 'VIX3M' };
  // Equal upper bounds — prefer lower lower bound
  return ivrRange[0] <= vix3mRange[0]
    ? { range: ivrRange,   source: 'IVR' }
    : { range: vix3mRange, source: 'VIX3M' };
}

// Return absolute delta of the most aggressive sold option leg (percentage points).
// DXLink returns delta as decimal (0-1); we convert to percentage (0-100).
function getWorstShortLegDelta(position) {
  try {
    var ticker   = position.ticker   || null;
    var legs     = position.legs     || [];
    var legsLive = position.legsLive || [];
    var worst = null;
    legs.forEach(function(leg, i) {
      if (!isActivePortfolioLeg(leg, position)) return;
      if (leg.side !== 'SHORT') return;
      if (leg.type === 'EQUITY') return;
      var d = null;
      // (1) live leg greeks from legsLive
      var ll = legsLive[i];
      if (ll && ll.delta != null) {
        var raw = Math.abs(parseFloat(ll.delta) || 0);
        if (raw > 0 && raw <= 1) raw = raw * 100;
        if (raw > 0) d = raw;
      }
      // (2) greeksCache fallback by streamerSymbol
      if ((d === null || d === 0) && S.greeksCache) {
        var sym = leg.streamerSymbol ||
          (ticker && leg.expiry && leg.strike
            ? buildStreamerSymbol(ticker, leg.expiry, leg.strike, leg.type === 'CALL' ? 'C' : 'P')
            : null);
        if (sym && S.greeksCache[sym] && S.greeksCache[sym].delta != null) {
          var gd = Math.abs(parseFloat(S.greeksCache[sym].delta) || 0);
          if (gd > 0 && gd <= 1) gd = gd * 100;
          if (gd > 0) d = gd;
        }
      }
      if (d !== null && d > 0 && (worst === null || d > worst)) worst = d;
    });
    return worst;
  } catch(e) { return null; }
}

// Check whether sold option legs are sized appropriately for current IV.
// Uses IVR first; falls back to VIX3M; VOL_UNAVAILABLE when neither is present.
// Range computation always runs (so the panel can show the target even without short-leg delta).
function evaluateVolatilityDeltaConsistency(position, ivr, vix3m) {
  var result = {
    status: 'VOL_UNAVAILABLE',
    selectedSource: 'NONE', selectedRange: null, toleranceBand: null,
    ivrRange: null, vix3mRange: null, ivr: null, vix3m: null,
    worstShortLegDelta: null,
  };
  try {
    var worst = getWorstShortLegDelta(position);
    result.worstShortLegDelta = worst;

    // Always compute IVR/VIX3M ranges so the panel can show the target even without short-leg delta.
    var ivrNum = (ivr   != null && isFinite(Number(ivr)))   ? Number(ivr)   : null;
    var vixNum = (vix3m != null && isFinite(Number(vix3m))) ? Number(vix3m) : null;
    result.ivr   = ivrNum;
    result.vix3m = vixNum;

    var ivrRange = ivrNum != null ? getIvrDeltaRange(ivrNum)    : null;
    var vixRange = vixNum != null ? getVix3mDeltaRange(vixNum)  : null;
    result.ivrRange   = ivrRange;
    result.vix3mRange = vixRange;

    var selected = selectConservativeVolDeltaRange(ivrRange, vixRange);
    if (selected) {
      result.selectedSource = selected.source;
      result.selectedRange  = selected.range;
      var tol    = VOL_DELTA_TOLERANCE;
      var accMin = Math.max(0, selected.range[0] - tol);
      var accMax = selected.range[1] + tol;
      result.toleranceBand = [accMin, accMax];
    }

    // Without short-leg delta we can show the target but cannot evaluate consistency.
    if (worst === null) return result;
    if (!selected) return result;

    if (worst >= selected.range[0] && worst <= selected.range[1]) {
      result.status = 'VOL_OK';
    } else if (worst >= accMin && worst <= accMax) {
      result.status = 'VOL_OK_WITH_TOLERANCE';
    } else if (worst > accMax) {
      result.status = 'TOO_AGGRESSIVE';
    } else {
      result.status = 'TOO_DEFENSIVE';
    }
  } catch(e) { /* silent */ }
  return result;
}

// Combine alignment, delta-range, and volatility into a single traffic light.
// Evaluate whether a short-premium / credit position has hit a profit-taking exit threshold.
// Returns EXIT_TAKE_PROFIT when current value <= 50% of entry credit,
// EXIT_LOW_PREMIUM when residual premium <= $70, EXIT_OK otherwise,
// EXIT_UNAVAILABLE when data is missing or the position is not a net-credit structure.
function evaluateShortPremiumExitAlert(position) {
  var result = {
    status: 'EXIT_UNAVAILABLE', reason: '',
    entryCredit: null, currentValue: null,
    profitPct: null, residualPremium: null, strategyDetected: null,
  };
  try {
    if (!position) return result;
    result.strategyDetected = position.strategy || null;

    var legs     = position.legs     || [];
    var legsLive = position.legsLive || [];
    if (!legs.length) return result;

    // ── Entry credit from static leg data ──
    var totalCreditRec = 0, totalDebitPaid = 0, hasEntryData = false;
    legs.forEach(function(leg) {
      if (!isActivePortfolioLeg(leg, position)) return;
      var ep = parseFloat(leg.entryPrice);
      if (!isFinite(ep) || ep === 0) return;
      var qty    = Math.abs(_portfolioLegEffectiveQty(leg) || 0);
      var mult   = leg.type !== 'EQUITY' ? 100 : 1;
      var amount = Math.abs(ep) * qty * mult;
      if (leg.side === 'SHORT') totalCreditRec += amount;
      else                      totalDebitPaid += amount;
      hasEntryData = true;
    });
    if (!hasEntryData) return result;
    var entryCredit = totalCreditRec - totalDebitPaid;
    if (entryCredit <= 0) return result;   // debit structure — not applicable
    result.entryCredit = entryCredit;

    // ── Current value to close from legsLive ──
    var closeCost = 0, closeReceipt = 0, allHaveData = true;
    legs.forEach(function(leg, i) {
      if (!isActivePortfolioLeg(leg, position)) return;
      var ll = legsLive[i];
      if (!ll || ll.currentPrice == null || !isFinite(parseFloat(ll.currentPrice))) { allHaveData = false; return; }
      var cp     = Math.abs(parseFloat(ll.currentPrice));
      var qty    = Math.abs(_portfolioLegEffectiveQty(leg) || 0);
      var mult   = leg.type !== 'EQUITY' ? 100 : 1;
      var amount = cp * qty * mult;
      if (leg.side === 'SHORT') closeCost    += amount;   // cost to buy back
      else                      closeReceipt += amount;   // proceeds when selling
    });
    if (!allHaveData) return result;   // missing data — never force RED

    var currentValue = Math.max(0, closeCost - closeReceipt);
    result.currentValue     = currentValue;
    result.residualPremium  = currentValue;
    var profit = entryCredit - currentValue;
    result.profitPct = profit / entryCredit;

    if (currentValue <= entryCredit * 0.50) {
      result.status = 'EXIT_TAKE_PROFIT';
      result.reason = 'Current value $' + currentValue.toFixed(0) + ' is at or below 50% of initial credit $' + entryCredit.toFixed(0) +
        ' — ' + (result.profitPct * 100).toFixed(1) + '% credit captured.';
    } else if (currentValue <= 70) {
      result.status = 'EXIT_LOW_PREMIUM';
      result.reason = 'Residual premium $' + currentValue.toFixed(0) + ' is below the $70 threshold.';
    } else {
      result.status = 'EXIT_OK';
      result.reason = 'Residual premium $' + currentValue.toFixed(0) + ' — no exit alert.';
    }
  } catch(e) { /* silent */ }
  return result;
}

function computePortfolioRowTrafficLight(params) {
  try {
    var aln   = params.alignmentStatus;   // 'ALIGNED'|'WARNING'|'MISALIGNED'|null
    var drs   = params.deltaRangeStatus;  // 'DELTA_OK'|'DELTA_TOO_LOW'|etc.
    var vol   = params.volatilityStatus;  // 'VOL_OK'|'TOO_AGGRESSIVE'|'TOO_DEFENSIVE'|'VOL_UNAVAILABLE'
    var delta = params.totalDelta;
    var n     = params.structureCount || 1;
    var ranges = getStructureScaledDeltaRanges(n);
    var absDelta = (delta != null && isFinite(delta)) ? Math.abs(delta) : 0;
    var reasons = [];

    // GRAY — no technical data yet
    if (!aln) return { light: 'GRAY', reasons: ['Insufficient data — alignment not available yet'] };

    // ── EXIT ALERT — overrides technical alignment (close / profit-taking) ──
    var exitStatus = params.exitAlertStatus;
    if (exitStatus === 'EXIT_TAKE_PROFIT') {
      return { light: 'RED', reasons: ['Close alert: 50% profit threshold reached — consider closing'] };
    }
    if (exitStatus === 'EXIT_LOW_PREMIUM') {
      return { light: 'RED', reasons: ['Close alert: residual premium below $70 — consider closing'] };
    }

    // ── RED ──────────────────────────────────────────────────────
    var red = false;
    if (aln === 'MISALIGNED' && absDelta > ranges.neutralMax) {
      red = true; reasons.push('Bias and position delta are in conflict');
    }
    if (drs === 'DELTA_WRONG_DIRECTION') {
      red = true; reasons.push('Delta is in the wrong direction for the current bias');
    }
    if (drs === 'DELTA_TOO_HIGH') {
      red = true; reasons.push('Total delta is too large for the current bias range');
    }
    if (drs === 'DELTA_NEUTRAL_TOO_DIRECTIONAL' && absDelta > ranges.neutralMax * 1.5) {
      red = true; reasons.push('Bias is neutral but position is too directional');
    }
    if (vol === 'TOO_AGGRESSIVE') {
      red = true; reasons.push('Short-leg delta exceeds the conservative IVR/VIX tolerance band — vol risk too high');
    }
    if (red) return { light: 'RED', reasons: reasons };

    // ── YELLOW ───────────────────────────────────────────────────
    var yellow = false;
    if (aln === 'WARNING') {
      yellow = true; reasons.push('Directional alignment is WARNING');
    }
    if (drs === 'DELTA_TOO_LOW') {
      yellow = true; reasons.push('Total delta is below the suggested range for current bias');
    }
    if (drs === 'DELTA_NEUTRAL_TOO_DIRECTIONAL') {
      yellow = true; reasons.push('Bias is neutral but total delta is outside the neutral range');
    }
    if (vol === 'TOO_DEFENSIVE') {
      yellow = true; reasons.push('Short-leg delta more conservative than volatility regime suggests');
    }
    if (vol === 'VOL_UNAVAILABLE' && params.hasShortOptionLegs) {
      yellow = true; reasons.push('Volatility data unavailable — cannot confirm short-leg delta sizing');
    }
    if (aln === 'MISALIGNED' && absDelta <= ranges.neutralMax) {
      yellow = true; reasons.push('Misaligned with bias, but delta is near neutral');
    }
    if (yellow) return { light: 'YELLOW', reasons: reasons };

    // ── GREEN ─────────────────────────────────────────────────────
    // VOL_OK_WITH_TOLERANCE is informational only — does not prevent GREEN
    reasons.push('Aligned');
    if (drs === 'DELTA_OK')                    reasons.push('Total delta within suggested range');
    if (vol === 'VOL_OK')                      reasons.push('Short-leg delta consistent with volatility regime');
    if (vol === 'VOL_OK_WITH_TOLERANCE')       reasons.push('Short-leg delta within volatility tolerance band');

    // Full GREEN requires both 1D and 4H confirmation. If only 1D is available
    // (4H missing/unavailable), downgrade to YELLOW — 4H is an important
    // confirmation layer and missing it must not silently pass as full alignment.
    if (params.technicalStatus === 'partial_1d_only') {
      var partialReason = '1D-only confirmation — 4H unavailable';
      if (params.fourHUnavailableReason) partialReason += ' (' + params.fourHUnavailableReason + ')';
      reasons.push(partialReason);
      return { light: 'YELLOW', reasons: reasons };
    }
    return { light: 'GREEN', reasons: reasons };
  } catch(e) {
    return { light: 'GRAY', reasons: ['Error computing traffic light'] };
  }
}

// Build a compact structured tooltip string from a cached row state.
// Format: LIGHT · alignment · Bias X · Total Δ value vs range · Short-leg Δ vs vol target
function _pfBuildTrafficLightTooltip(state) {
  try {
    var tl  = state.trafficLight;
    if (!tl) return 'Alignment: computing…';
    var light = tl.light;
    if (light === 'GRAY') return 'GRAY · Insufficient technical data';

    // Exit alert is the dominant RED cause — show a focused close-alert tooltip
    var ea = state.exitAlert;
    if (light === 'RED' && ea && (ea.status === 'EXIT_TAKE_PROFIT' || ea.status === 'EXIT_LOW_PREMIUM')) {
      var eaParts = ['RED · Close alert'];
      if (ea.status === 'EXIT_TAKE_PROFIT' && ea.entryCredit != null && ea.currentValue != null) {
        eaParts.push('current value $' + ea.currentValue.toFixed(0) + ' ≤ 50% of initial credit $' + ea.entryCredit.toFixed(0));
        if (ea.profitPct != null) eaParts.push((ea.profitPct * 100).toFixed(0) + '% credit captured');
      } else if (ea.status === 'EXIT_LOW_PREMIUM' && ea.currentValue != null) {
        eaParts.push('residual premium $' + ea.currentValue.toFixed(0) + ' below $70 threshold');
      }
      eaParts.push('consider closing');
      return eaParts.join(' · ');
    }

    var bias  = state.biasResult ? state.biasResult.bias : null;
    var dv    = state.totalDelta != null ? (state.totalDelta >= 0 ? '+' : '') + state.totalDelta.toFixed(1) : null;
    var n     = state.structInfo ? state.structInfo.count : 1;
    var r     = getStructureScaledDeltaRanges(n);
    var vc    = state.volConsistency;
    var aln   = state.alignment ? state.alignment.status : null;
    var drs   = state.deltaRangeStatus;
    var parts = [light];

    // Alignment summary
    if (aln === 'ALIGNED')         parts.push('Aligned');
    else if (aln === 'WARNING')    parts.push('Warning');
    else if (aln === 'MISALIGNED') parts.push('Misaligned');

    // Technical confirmation depth: surface partial 1D-only state in tooltip
    if (state.technicalStatus === 'partial_1d_only') {
      var partialNote = '1D-only (4H unavailable';
      if (state.fourHUnavailableReason) partialNote += ': ' + state.fourHUnavailableReason;
      partialNote += ')';
      parts.push(partialNote);
    } else if (state.technicalStatus === 'full') {
      parts.push('1D+4H confirmed');
    }

    // Bias
    if (bias) parts.push('Bias ' + bias);

    // Total delta with its suggested range (explicitly labeled as "Total Δ")
    if (dv != null) {
      var totalRangeNote;
      if (drs === 'DELTA_WRONG_DIRECTION') {
        totalRangeNote = ' (wrong direction for ' + bias + ' bias)';
      } else if (drs === 'DELTA_TOO_HIGH') {
        var ceiling = bias === 'LONG' ? '+' + r.longMax.toFixed(0) : r.shortMin.toFixed(0);
        totalRangeNote = ' above ' + ceiling;
      } else if (drs === 'DELTA_TOO_LOW') {
        var floor = bias === 'LONG' ? '+' + r.longMin.toFixed(0) : r.shortMax.toFixed(0);
        totalRangeNote = ' below ' + floor;
      } else if (bias === 'LONG') {
        totalRangeNote = ' (suggested +' + r.longMin.toFixed(0) + '/+' + r.longMax.toFixed(0) + ')';
      } else if (bias === 'SHORT') {
        totalRangeNote = ' (suggested '  + r.shortMin.toFixed(0) + '/' + r.shortMax.toFixed(0) + ')';
      } else if (bias === 'NEUTRAL') {
        totalRangeNote = ' (neutral ' + r.neutralMin.toFixed(0) + '/+' + r.neutralMax.toFixed(0) + ')';
      } else {
        totalRangeNote = '';
      }
      parts.push('Total Δ ' + dv + totalRangeNote);
    }

    // Short-leg delta vs selected vol target (explicitly labeled as "Short-leg Δ")
    if (vc && vc.selectedSource !== 'NONE' && vc.selectedRange) {
      var rngStr    = vc.selectedSource === 'VIX3M'
        ? _fmtVix3mRangeDisplay(vc.selectedRange, vc.vix3m)
        : vc.selectedRange[0] + '–' + vc.selectedRange[1];
      var bothAvail = !!(vc.ivrRange && vc.vix3mRange);
      var conserv   = bothAvail ? 'conservative ' : '';
      if (vc.worstShortLegDelta != null) {
        var wsd = _fmtShortLegDelta(vc.worstShortLegDelta);
        if (vc.status === 'TOO_AGGRESSIVE')
          parts.push('Short-leg Δ' + wsd + ' above ' + conserv + 'vol target ' + rngStr);
        else if (vc.status === 'TOO_DEFENSIVE')
          parts.push('Short-leg Δ' + wsd + ' below ' + conserv + 'vol target ' + rngStr);
        else if (vc.status === 'VOL_OK_WITH_TOLERANCE')
          parts.push('Short-leg Δ' + wsd + ' within ' + conserv + 'vol target ' + rngStr + ' tolerance band');
        else
          parts.push('Short-leg Δ' + wsd + ' within ' + conserv + 'vol target ' + rngStr);
      } else {
        parts.push(conserv + 'vol target ' + rngStr + ' (no short-leg delta)');
      }
    } else if (vc && vc.status === 'VOL_UNAVAILABLE' && light !== 'GREEN') {
      parts.push('vol target unavailable — no IVR/VIX3M data');
    }

    return parts.join(' · ');
  } catch(e) { return 'Error'; }
}

// Update the #pf-tl-{posId} dot from the cached state.
function _pfUpdateRowTrafficLight(posId) {
  try {
    var el = document.getElementById('pf-tl-' + posId);
    if (!el) return;
    var state = _pfAlignmentCache[posId];
    if (!state || !state.trafficLight) {
      el.style.background = '#444';
      el.title = 'Alignment: computing…';
      return;
    }
    var colors = { GREEN: '#00d084', YELLOW: '#f5c542', RED: '#ff4d4f', GRAY: '#666' };
    el.style.background = colors[state.trafficLight.light] || '#666';
    el.title = _pfBuildTrafficLightTooltip(state);
  } catch(e) { /* silent */ }
}

// Build a plain-English single sentence explaining the YELLOW or RED traffic light cause.
// Called from _pfBuildAlignmentRiskPanel with pre-computed values.
function _pfBuildTlReasonSentence(bias, totalDelta, alignment, drs, vc, r) {
  try {
    var aln = alignment ? alignment.status : null;
    var dv  = totalDelta != null ? (totalDelta >= 0 ? '+' : '') + totalDelta.toFixed(1) : null;

    if (drs === 'DELTA_WRONG_DIRECTION') {
      var posDir = totalDelta > 0 ? 'LONG' : 'SHORT';
      return 'Bias is ' + bias + ' but position delta is ' + posDir + (dv ? ' (' + dv + ')' : '') + '.';
    }
    if (drs === 'DELTA_TOO_HIGH') {
      if (bias === 'LONG')  return 'Position delta ' + dv + ' is above the suggested LONG range +' + r.longMin.toFixed(0) + '/+' + r.longMax.toFixed(0) + '.';
      if (bias === 'SHORT') return 'Position delta ' + dv + ' is more short than the suggested range ' + r.shortMin.toFixed(0) + '/' + r.shortMax.toFixed(0) + '.';
      return 'Total delta ' + dv + ' is too large for the current bias range.';
    }
    if (drs === 'DELTA_TOO_LOW') {
      if (bias === 'LONG')  return 'Position delta ' + dv + ' is below the suggested LONG range +' + r.longMin.toFixed(0) + '/+' + r.longMax.toFixed(0) + '.';
      if (bias === 'SHORT') return 'Position delta ' + dv + ' is not short enough for the suggested range ' + r.shortMin.toFixed(0) + '/' + r.shortMax.toFixed(0) + '.';
      return 'Total delta ' + dv + ' is too low for the current bias range.';
    }
    if (drs === 'DELTA_NEUTRAL_TOO_DIRECTIONAL') {
      return 'Bias is NEUTRAL but total delta ' + dv + ' is outside the neutral range ' + r.neutralMin.toFixed(0) + '/+' + r.neutralMax.toFixed(0) + '.';
    }
    if (aln === 'MISALIGNED' && totalDelta != null && Math.abs(totalDelta) > r.neutralMax) {
      var posDir2 = totalDelta > 0 ? 'LONG' : 'SHORT';
      return 'Bias is ' + bias + ' but position is ' + posDir2 + ' delta (' + dv + ').';
    }
    if (aln === 'MISALIGNED' && totalDelta != null && Math.abs(totalDelta) <= r.neutralMax) {
      return 'Misaligned with bias, but delta is near neutral (' + dv + ').';
    }
    if (vc && vc.status === 'TOO_AGGRESSIVE') {
      var wsd = vc.worstShortLegDelta != null ? _fmtShortLegDelta(vc.worstShortLegDelta) : '?';
      var tbRange = vc.toleranceBand ? 'Δ' + vc.toleranceBand[0] + '–' + vc.toleranceBand[1] : (vc.selectedRange ? 'Δ' + vc.selectedRange[0] + '–' + vc.selectedRange[1] : '');
      return 'Short-leg Δ' + wsd + ' exceeds the IVR/VIX tolerance band ' + tbRange + ' — too aggressive for current volatility regime.';
    }
    if (vc && vc.status === 'TOO_DEFENSIVE' && vc.selectedRange) {
      var wsd2 = vc.worstShortLegDelta != null ? _fmtShortLegDelta(vc.worstShortLegDelta) : '?';
      return 'Aligned directionally, but short-leg delta ' + wsd2 + ' is below the conservative vol target ' + vc.selectedRange[0] + '–' + vc.selectedRange[1] + '.';
    }
    if (vc && vc.status === 'VOL_UNAVAILABLE' && vc.selectedRange) {
      return 'Short-leg delta unavailable — vol target ' + vc.selectedRange[0] + '–' + vc.selectedRange[1] + ' shown for reference.';
    }
    if (vc && vc.status === 'VOL_UNAVAILABLE') {
      return 'Vol target unavailable — no reliable IVR or VIX3M data.';
    }
    if (aln === 'WARNING' && alignment && alignment.text) {
      return alignment.text;
    }
    return 'Check alignment and delta range.';
  } catch(e) { return 'Check alignment and delta range.'; }
}

// Build the risk explanation panel HTML for the expanded alignment block.
// Shows: TL reason (YELLOW/RED), suggested total Δ range, and vol target with
// both IVR and VIX3M ranges when available plus tolerance band.
function _pfBuildAlignmentRiskPanel(bias, totalDelta, alignment, structInfo, drs, vc, tl, ivr, vix3m, ea, shortOptLegCount) {
  try {
    if (!tl || tl.light === 'GRAY') return '';
    var n       = Math.max(1, (structInfo && structInfo.count) || 1);
    var assumed = !!(structInfo && structInfo.assumed);
    var r       = getStructureScaledDeltaRanges(n);
    var tlColor = tl.light === 'GREEN' ? '#00d084' : tl.light === 'YELLOW' ? '#f5c542' : '#ff4d4f';
    var S8  = 'font-family:var(--M);font-size:8px;';
    var tx3 = 'color:var(--tx3)';
    var tx2 = 'color:var(--tx2)';
    var parts = [];

    // ── Exit alert panel (shown before directional analysis when triggered) ──
    if (ea && (ea.status === 'EXIT_TAKE_PROFIT' || ea.status === 'EXIT_LOW_PREMIUM')) {
      var eaLines = [];
      if (ea.status === 'EXIT_TAKE_PROFIT') {
        eaLines.push('<span style="font-weight:700">Close alert: short-premium exit rule triggered.</span>');
        if (ea.entryCredit  != null) eaLines.push('Entry credit: $' + ea.entryCredit.toFixed(0) + '.');
        if (ea.currentValue != null) eaLines.push('Current value: $' + ea.currentValue.toFixed(0) + '.');
        if (ea.profitPct    != null) eaLines.push('Credit captured: ' + (ea.profitPct * 100).toFixed(1) + '%.');
        eaLines.push('<span style="' + tx3 + '">Rule: close when current value ≤ 50% of initial credit or residual premium ≤ $70.</span>');
      } else {
        eaLines.push('<span style="font-weight:700">Close alert: residual premium below threshold.</span>');
        if (ea.currentValue != null) eaLines.push('Residual premium: $' + ea.currentValue.toFixed(0) + ' (threshold $70).');
        if (ea.entryCredit  != null) eaLines.push('Initial credit: $' + ea.entryCredit.toFixed(0) + '.');
        eaLines.push('Consider closing the position.');
      }
      parts.push('<div style="' + S8 + 'color:#ff4d4f;margin-bottom:6px;padding:5px 8px;background:rgba(255,77,79,.08);border-radius:3px;border-left:2px solid #ff4d4f">' +
        eaLines.join(' ') + '</div>');
    } else if (ea && ea.status === 'EXIT_UNAVAILABLE' && ea.entryCredit == null) {
      // silently omit — no partial data to show
    }

    // ── TL reason sentence (YELLOW or RED from directional/delta/vol causes, not exit alert) ──
    var isExitRed = ea && (ea.status === 'EXIT_TAKE_PROFIT' || ea.status === 'EXIT_LOW_PREMIUM');
    if (tl.light !== 'GREEN' && !isExitRed) {
      var sentence = _pfBuildTlReasonSentence(bias, totalDelta, alignment, drs, vc, r);
      parts.push('<div style="' + S8 + 'color:' + tlColor + ';margin-bottom:5px">' +
        '<span style="font-weight:700">Traffic light ' + tl.light + ':</span> ' + escHtml(sentence) +
        '</div>');
    }

    // ── Position Δ status: show actual delta vs range (no midpoint "target") ──
    if (bias && totalDelta != null) {
      var dv2 = (totalDelta >= 0 ? '+' : '') + totalDelta.toFixed(1);
      var pRangeStr, pStatusWord, pStatusColor;
      if (bias === 'LONG') {
        pRangeStr = '+' + r.longMin.toFixed(0) + '/+' + r.longMax.toFixed(0);
      } else if (bias === 'SHORT') {
        pRangeStr = r.shortMin.toFixed(0) + '/' + r.shortMax.toFixed(0);
      } else {
        pRangeStr = r.neutralMin.toFixed(0) + '/+' + r.neutralMax.toFixed(0);
      }
      if (drs === 'DELTA_OK') {
        pStatusWord = 'within'; pStatusColor = '#00d084';
      } else if (drs === 'DELTA_TOO_HIGH') {
        pStatusWord = 'above'; pStatusColor = '#ff4d4f';
      } else if (drs === 'DELTA_TOO_LOW') {
        pStatusWord = 'below'; pStatusColor = '#f5c542';
      } else if (drs === 'DELTA_WRONG_DIRECTION') {
        pStatusWord = 'wrong direction for'; pStatusColor = '#ff4d4f';
      } else if (drs === 'DELTA_NEUTRAL_TOO_DIRECTIONAL') {
        pStatusWord = 'outside'; pStatusColor = '#f5c542';
      } else {
        pStatusWord = 'vs'; pStatusColor = 'var(--tx2)';
      }
      var structNote = assumed
        ? ' <span style="' + tx3 + '">(structure count assumed 1)</span>'
        : n > 1 ? ' <span style="' + tx3 + '">(' + n + ' structures)</span>' : '';
      parts.push('<div style="' + S8 + tx2 + ';margin-bottom:4px">' +
        '<span style="' + tx3 + '">Position Δ check:</span> total Δ' + dv2 +
        ' is <span style="color:' + pStatusColor + '">' + pStatusWord + '</span> ' +
        bias + ' bias range ' + pRangeStr + structNote +
        '</div>');
    }

    // ── Volatility target (SHORT-LEG delta, not total position delta) ──
    if (vc && vc.selectedSource !== 'NONE' && vc.selectedRange) {
      var bothAvail   = !!(vc.ivrRange && vc.vix3mRange);
      var selRng      = vc.selectedSource === 'VIX3M'
        ? _fmtVix3mRangeDisplay(vc.selectedRange, vc.vix3m)
        : vc.selectedRange[0] + '–' + vc.selectedRange[1];
      var tolBand     = vc.toleranceBand ? vc.toleranceBand[0] + '–' + vc.toleranceBand[1] : null;

      var volHeader = '<span style="' + tx3 + '">Short-leg Δ target (conservative IVR/VIX):</span> ';

      // Show individual ranges when both sources are available
      var rangeBreakdown = '';
      if (bothAvail) {
        var ivrStr = vc.ivrRange[0] + '–' + vc.ivrRange[1];
        var vixStr = _fmtVix3mRangeDisplay(vc.vix3mRange, vc.vix3m);
        var ivrRaw = vc.ivr   != null ? 'IVR '   + Number(vc.ivr).toFixed(0)   : 'IVR';
        var vixRaw = vc.vix3m != null ? 'VIX3M ' + Number(vc.vix3m).toFixed(1) : 'VIX3M';
        rangeBreakdown = ivrRaw + ' suggests Δ' + ivrStr + ', ' + vixRaw + ' suggests Δ' + vixStr +
          ' → <span style="font-weight:600">conservative target Δ' + selRng + '</span>';
      } else {
        var srcLabel = vc.selectedSource === 'IVR'
          ? 'IVR '   + (vc.ivr   != null ? Number(vc.ivr).toFixed(0)   : '?')
          : 'VIX3M ' + (vc.vix3m != null ? Number(vc.vix3m).toFixed(1) : '?');
        rangeBreakdown = srcLabel + ' suggests Δ' + selRng;
      }
      if (tolBand) rangeBreakdown += '. Tolerance band Δ' + tolBand + '.';

      // Current short-leg delta status
      // "Current" for a single short option leg; "Highest" when multiple short legs exist.
      var _slegLabel = (shortOptLegCount != null && shortOptLegCount > 1) ? 'Highest short-leg' : 'Current short-leg';
      var wdvLine = '';
      if (vc.worstShortLegDelta != null) {
        var wdv = _fmtShortLegDelta(vc.worstShortLegDelta);
        if (vc.status === 'TOO_AGGRESSIVE')
          wdvLine = ' ' + _slegLabel + ' Δ' + wdv + ': <span style="color:#ff4d4f">too aggressive — above tolerance band.</span>';
        else if (vc.status === 'TOO_DEFENSIVE')
          wdvLine = ' ' + _slegLabel + ' Δ' + wdv + ': <span style="color:#f5c542">more defensive than target range.</span>';
        else if (vc.status === 'VOL_OK_WITH_TOLERANCE')
          wdvLine = ' ' + _slegLabel + ' Δ' + wdv + ': <span style="color:#f5c542">outside ideal range but within tolerance.</span>';
        else
          wdvLine = ' ' + _slegLabel + ' Δ' + wdv + ': <span style="color:#00d084">within ideal range.</span>';
      }

      parts.push('<div style="' + S8 + tx2 + '">' + volHeader + rangeBreakdown + wdvLine + '</div>');
    } else if (vc && vc.status === 'VOL_UNAVAILABLE') {
      parts.push('<div style="' + S8 + tx3 + '">Vol target unavailable: missing IVR/VIX3M or short-leg delta.</div>');
    }

    if (!parts.length) return '';
    return '<div style="margin-top:10px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px">' +
      parts.join('') + '</div>';
  } catch(e) { return ''; }
}

// Full orchestration for one position: compute bias → delta range → vol → traffic light → render dot.
// Also writes result into _pfAlignmentCache so _pfUpdateAlignment can stay lean.
function _pfRefreshAllRowTrafficLights() {
  try {
    var positions = _activePanelPortfolioId != null
      ? positionManager.getByPortfolio(_activePanelPortfolioId)
      : (positionManager.getAll ? positionManager.getAll() : []);
    positions.forEach(function(p) {
      try { _pfComputeAndRenderRowTrafficLight(p); } catch(_e) { /* silent */ }
    });
  } catch(e) { /* silent */ }
}



function _pfBuildTechnicalSnapshotFromBackend(ticker) {
  try {
    var bt = S.backendTechnicalByTicker && S.backendTechnicalByTicker[ticker];
    function logSnapshotRejected(reason, missingFields, row) {
      if (S.debugPortfolioRefresh !== true) return;
      var source = row || bt || null;
      console.log('[PortfolioTechnical] backend technical snapshot rejected', {
        ticker: ticker,
        reason: reason,
        missingFields: missingFields || [],
        availableKeys: Object.keys(source || {}),
        sample: {
          rsi14: source && source.rsi14,
          sma20: source && source.sma20,
          sma30: source && source.sma30,
          distFromSma20: source && source.distFromSma20,
          distFromSma30: source && source.distFromSma30,
          rsi14_4h: source && source.rsi14_4h,
          sma20_4h: source && source.sma20_4h,
          sma30_4h: source && source.sma30_4h,
          distFromSma20_4h: source && source.distFromSma20_4h,
          distFromSma30_4h: source && source.distFromSma30_4h,
          price: source && source.price,
          price_4h: source && source.price_4h
        }
      });
    }
    if (!bt) {
      logSnapshotRejected('missing_backend_technical_row', [], null);
      return null;
    }

    function isExplicitParityConfirmed(parity) {
      if (parity === true || parity === 'CONFIRMED' || parity === 'PARITY_OK') return true;
      // Traffic-light alignment needs rsi14 + sma + distanceFromSma. Bollinger
      // is used by the chart, not by the traffic-light gate, so don't require it.
      return !!(parity && typeof parity === 'object' &&
        parity.rsi14 === 'confirmed' &&
        parity.sma === 'confirmed' &&
        parity.distanceFromSma === 'confirmed');
    }

    var paritySource = bt.formulaParity;
    if (paritySource == null) {
      var globalParityCandidates = [
        S.backendTechnicalFormulaParity,
        S.portfolioTechnicalFormulaParity,
        S.lastTechnicalFormulaParity,
        S.formulaParity
      ];
      for (var i = 0; i < globalParityCandidates.length; i++) {
        if (globalParityCandidates[i] != null) { paritySource = globalParityCandidates[i]; break; }
      }
    }

    var parityOk = isExplicitParityConfirmed(paritySource);
    if (!parityOk) {
      if (S.debugPortfolioRefresh === true) {
        console.log('[PortfolioTechnical] backend technical fallback rejected', {
          ticker: ticker,
          reason: 'parity_not_confirmed',
          formulaParity: paritySource
        });
      }
      return null;
    }

    function tf(tfKey) {
      var sfx = tfKey === '4H' ? '_4h' : '';
      var rsi = Number(bt['rsi14' + sfx]);
      var sma20 = Number(bt['sma20' + sfx]);
      var sma30 = Number(bt['sma30' + sfx]);
      var price = isFinite(bt['price' + sfx]) ? Number(bt['price' + sfx]) : null;
      var missingFields = [];
      if (!isFinite(rsi)) missingFields.push('rsi14' + sfx);
      if (!isFinite(sma20)) missingFields.push('sma20' + sfx);
      if (!isFinite(sma30)) missingFields.push('sma30' + sfx);
      if (!isFinite(price)) {
        var dist20 = Number(bt['distFromSma20' + sfx]);
        if (isFinite(dist20) && isFinite(sma20) && sma20 !== 0) price = sma20 * (1 + dist20 / 100);
      }
      if (!isFinite(price)) {
        var dist30 = Number(bt['distFromSma30' + sfx]);
        if (isFinite(dist30) && isFinite(sma30) && sma30 !== 0) price = sma30 * (1 + dist30 / 100);
      }
      if (!isFinite(price) && isFinite(rsi) && isFinite(sma20) && isFinite(sma30)) {
        var underlyingMap = S.backendUnderlyingByTicker || S.underlyingByTicker || null;
        var underlyingEntry = underlyingMap && underlyingMap[ticker];
        var underlyingPrice = Number(underlyingEntry && (underlyingEntry.price != null ? underlyingEntry.price : underlyingEntry.last));
        if (!isFinite(underlyingPrice)) underlyingPrice = Number(underlyingMap && underlyingMap[ticker]);
        if (isFinite(underlyingPrice)) price = underlyingPrice;
      }
      if (!isFinite(price)) missingFields.push('price' + sfx);
      var sma8 = isFinite(bt['sma8' + sfx]) ? Number(bt['sma8' + sfx]) : null;
      if (missingFields.length) return { snapshot: null, missingFields: missingFields };
      return { snapshot: { rsi: rsi, sma20: sma20, sma30: sma30, sma8: isFinite(sma8) ? sma8 : null, price: price }, missingFields: [] };
    }

    var oneDResult = tf('1D');
    var fourHResult = tf('4H');
    if (!oneDResult.snapshot) {
      logSnapshotRejected('missing_1d_fields', oneDResult.missingFields, bt);
      return null;
    }
    // 4H is optional: if missing/incomplete, return 1D-only snapshot. The bias
    // function downstream already handles `fourH == null` ("1D bias, 4H unavailable").
    var fourHUnavailableReason = null;
    if (!fourHResult.snapshot) {
      var declared4H = (bt.hasBackendTechnical4H === true || bt.backendTechnical4HConfirmed === true || bt.hasTechnical4H === true);
      var any4H = bt.hasAnyBackendTechnical4H === true;
      var returned4H = bt.backendReturned4H === true;
      var parityUnconfirmed4H = bt.backend4HParityUnconfirmed === true || (bt.required4HParityConfirmed === false && returned4H);
      var shapeUnmapped4H = bt.backend4HShapeUnmapped === true;
      if (parityUnconfirmed4H) fourHUnavailableReason = 'backend_returned_4h_but_parity_unconfirmed';
      else if (shapeUnmapped4H) fourHUnavailableReason = 'backend_4h_shape_unmapped';
      else if (!declared4H && !any4H && !returned4H) fourHUnavailableReason = 'backend_did_not_return_4h';
      else if (!declared4H && any4H) fourHUnavailableReason = '4h_partial_not_confirmed';
      else fourHUnavailableReason = 'missing_4h_fields:' + (fourHResult.missingFields || []).join(',');
      if (S.debugPortfolioRefresh === true) {
        console.log('[PortfolioTechnical] backend 4H unavailable; using 1D-only snapshot', {
          ticker: ticker,
          reason: fourHUnavailableReason,
          missingFields: fourHResult.missingFields || [],
          hasBackendTechnical4H: bt.hasBackendTechnical4H === true,
          hasAnyBackendTechnical4H: bt.hasAnyBackendTechnical4H === true,
          backendReturned4H: returned4H,
          required4HParityConfirmed: bt.required4HParityConfirmed === true,
          fourHParityMode: bt.fourHParityMode || null
        });
      }
    }
    return {
      source: 'backendTechnicalByTicker',
      oneD: oneDResult.snapshot,
      fourH: fourHResult.snapshot, // may be null — handled downstream
      fourHUnavailableReason: fourHUnavailableReason,
      raw: bt
    };
  } catch(e) { return null; }
}

function _pfGetTrafficLightTechnicalInputs(ticker) {
  var allowLegacyFrontendFallback = ffPortfolioTechnicalFrontendFallback();
  if (allowLegacyFrontendFallback) {
    console.warn('[PortfolioTechnical] legacy frontend fallback enabled');
  }
  var candles1D = getDailyCandles(ticker);
  var candles4H = getFourHourCandles(ticker);
  var backendSnapshot = _pfBuildTechnicalSnapshotFromBackend(ticker);
  if (backendSnapshot) {
    if (S.debugPortfolioRefresh === true) console.log('[PortfolioTechnical] using backend technicals for traffic light', { ticker: ticker });
    return { source: 'backendTechnicalByTicker', candles1D: candles1D, candles4H: candles4H, backendSnapshot: backendSnapshot };
  }
  var hasFrontend = !!(candles1D && candles1D.length >= 32 && candles4H && candles4H.length >= 32);
  if (allowLegacyFrontendFallback && hasFrontend) {
    return { source: 'frontend candle buffer', candles1D: candles1D, candles4H: candles4H, backendSnapshot: null };
  }
  return { source: 'missing', candles1D: candles1D, candles4H: candles4H, backendSnapshot: null };
}
function _pfBuildTrafficLightInputAudit(pos, candles1D, candles4H, alignment, drs, vc, ea, tl, hasShortOpts, technicalSource, backendSnapshot) {
  // Audit helper only: documents exact current Portfolio traffic-light inputs and availability checks.
  var sourceByField = {
    ticker: 'position',
    totalDelta: 'position',
    structureCount: 'position/legs inference',
    hasShortOptionLegs: 'position/legs',
    exitAlertStatus: 'position + options/greeks',
    rsi14_1d: 'missing',
    sma20_1d: 'missing',
    sma30_1d: 'missing',
    rsi14_4h: 'missing',
    sma20_4h: 'missing',
    sma30_4h: 'missing',
    ivr: 'options/greeks / position context',
    vix3m: 'market context',
    shortLegDelta: 'options/greeks / position legs'
  };
  var requiredFields = Object.keys(sourceByField);
  var presentFields = [];
  var missingFields = [];
  var unconfirmedFields = [];

  var usingBackend = technicalSource === 'backendTechnicalByTicker' && !!backendSnapshot;
  var hasFrontend1D = !!(candles1D && candles1D.length >= 20);
  var hasFrontend4H = !!(candles4H && candles4H.length >= 20);
  var backendOneD = backendSnapshot && backendSnapshot.oneD;
  var backendFourH = backendSnapshot && backendSnapshot.fourH;

  function pickSrc(backendOk, frontendOk) {
    if (backendOk) return 'backendTechnicalByTicker';
    if (frontendOk) return 'frontend candle buffer';
    return 'missing';
  }
  sourceByField.rsi14_1d = pickSrc(backendOneD && isFinite(backendOneD.rsi), hasFrontend1D);
  sourceByField.sma20_1d = pickSrc(backendOneD && isFinite(backendOneD.sma20), hasFrontend1D);
  sourceByField.sma30_1d = pickSrc(backendOneD && isFinite(backendOneD.sma30), hasFrontend1D);
  sourceByField.rsi14_4h = pickSrc(backendFourH && isFinite(backendFourH.rsi), hasFrontend4H);
  sourceByField.sma20_4h = pickSrc(backendFourH && isFinite(backendFourH.sma20), hasFrontend4H);
  sourceByField.sma30_4h = pickSrc(backendFourH && isFinite(backendFourH.sma30), hasFrontend4H);

  var fields = {
    ticker: !!(pos && pos.ticker),
    totalDelta: isFinite(pos && pos.delta),
    structureCount: true,
    hasShortOptionLegs: typeof hasShortOpts === 'boolean',
    exitAlertStatus: !!(ea && ea.status),
    rsi14_1d: sourceByField.rsi14_1d !== 'missing',
    sma20_1d: sourceByField.sma20_1d !== 'missing',
    sma30_1d: sourceByField.sma30_1d !== 'missing',
    rsi14_4h: sourceByField.rsi14_4h !== 'missing',
    sma20_4h: sourceByField.sma20_4h !== 'missing',
    sma30_4h: sourceByField.sma30_4h !== 'missing',
    ivr: vc && vc.ivr != null,
    vix3m: vc && vc.vix3m != null,
    shortLegDelta: vc && vc.worstShortLegDelta != null
  };

  requiredFields.forEach(function(k) { (fields[k] ? presentFields : missingFields).push(k); });
  if (!fields.rsi14_1d || !fields.sma20_1d || !fields.sma30_1d || !fields.rsi14_4h || !fields.sma20_4h || !fields.sma30_4h) {
    unconfirmedFields = ['rsi14_1d','sma20_1d','sma30_1d','rsi14_4h','sma20_4h','sma30_4h'].filter(function(k){ return !fields[k]; });
  }

  var reason = null;
  if (!alignment || !alignment.status) reason = 'alignment unavailable';
  else if (drs === 'DELTA_UNKNOWN') reason = 'delta range unknown';
  else if (vc && vc.status === 'VOL_UNAVAILABLE' && hasShortOpts) reason = 'vol target unavailable for short options';
  else if (unconfirmedFields.length) reason = 'unconfirmed fields';

  return {
    requiredFields: requiredFields,
    presentFields: presentFields,
    missingFields: missingFields,
    unconfirmedFields: unconfirmedFields,
    sourceByField: sourceByField,
    outcomes: {
      green: 'aligned + delta-in-range + volatility acceptable (with exit-alert override possible)',
      yellow: 'warning alignment and/or delta near/outside ideal and/or volatility defensive/unavailable',
      red: 'misalignment, wrong-direction delta, or too aggressive short-leg delta',
      unknown: 'alignment/delta prerequisites unavailable'
    },
    finalTrafficLight: tl && tl.light ? tl.light : null,
    reason: reason
  };
}

function _pfComputeAndRenderRowTrafficLight(pos) {
  try {
    var techInputs = _pfGetTrafficLightTechnicalInputs(pos.ticker);
    var candles1D  = techInputs.candles1D;
    var candles4H  = techInputs.candles4H;
    var biasResult = computePortfolioDirectionalBias(pos.ticker, candles1D, candles4H, techInputs.backendSnapshot);
    var totalDelta = pos.delta;
    var deltaExp   = classifyPortfolioDeltaExposure(totalDelta);
    var alignment  = biasResult ? evaluatePortfolioDirectionalAlignment(biasResult.bias, deltaExp) : null;
    var si         = inferStructureCountForPosition(pos);
    var drs        = biasResult ? evaluateDeltaRangeForBias(biasResult.bias, totalDelta, si.count) : 'DELTA_UNKNOWN';
    var vix3m      = S.vixFamily ? S.vixFamily.vix3m : null;
    var ivrNorm    = getPortfolioUnderlyingIvr(pos.ticker, pos);
    var vc         = evaluateVolatilityDeltaConsistency(pos, ivrNorm, vix3m);
    var ea         = evaluateShortPremiumExitAlert(pos);
    var hasShortOpts = (pos.legs || []).some(function(l) { return l.side === 'SHORT' && l.type !== 'EQUITY'; });

    // Derive technicalStatus:
    //   "full"             — 1D and 4H both valid
    //   "partial_1d_only"  — 1D valid, 4H missing/unavailable
    //   "unknown"          — 1D missing
    var has1D = !!(biasResult && biasResult.inputs1D);
    var has4H = !!(biasResult && biasResult.inputs4H);
    var fourHUnavailableReason = null;
    if (techInputs.backendSnapshot && techInputs.backendSnapshot.fourHUnavailableReason) {
      fourHUnavailableReason = techInputs.backendSnapshot.fourHUnavailableReason;
    } else if (has1D && !has4H) {
      if (techInputs.source === 'frontend candle buffer') fourHUnavailableReason = 'frontend_4h_buffer_insufficient';
      else if (techInputs.source === 'backendTechnicalByTicker') fourHUnavailableReason = 'backend_4h_not_in_snapshot';
      else fourHUnavailableReason = 'no_4h_source';
    }
    var technicalStatus = has1D ? (has4H ? 'full' : 'partial_1d_only') : 'unknown';

    var tl         = computePortfolioRowTrafficLight({
      alignmentStatus: alignment ? alignment.status : null,
      deltaRangeStatus: drs,
      volatilityStatus: vc.status,
      totalDelta: totalDelta,
      structureCount: si.count,
      exitAlertStatus: ea.status,
      hasShortOptionLegs: hasShortOpts,
      technicalStatus: technicalStatus,
      fourHUnavailableReason: fourHUnavailableReason
    });
    _pfAlignmentCache[pos.id] = {
      biasResult: biasResult, alignment: alignment, deltaExp: deltaExp,
      totalDelta: totalDelta, structInfo: si, deltaRangeStatus: drs,
      volConsistency: vc, exitAlert: ea, trafficLight: tl,
      technicalStatus: technicalStatus, fourHUnavailableReason: fourHUnavailableReason
    };
    if (technicalStatus === 'partial_1d_only' && _portfolioTechnicalDebugEnabled()) {
      console.debug('[PortfolioTechnical] partial technical state', {
        ticker: pos.ticker,
        technicalStatus: technicalStatus,
        fourHUnavailableReason: fourHUnavailableReason,
        finalTrafficLight: tl && tl.light,
        bias: biasResult && biasResult.bias,
        source: techInputs.source
      });
    }
    if (!biasResult && techInputs.source !== 'backendTechnicalByTicker' && (!candles1D || candles1D.length < 20 || !candles4H || candles4H.length < 20) &&
        S.backendTechnicalByTicker && S.backendTechnicalByTicker[pos.ticker]) {
      var btRow = S.backendTechnicalByTicker[pos.ticker] || {};
      var miss = [];
      ['rsi14','sma20','sma30','price'].forEach(function(k){
        var v = btRow[k];
        if (!(typeof v === 'number' && isFinite(v))) miss.push(k);
      });
      var miss4h = [];
      ['rsi14_4h','sma20_4h','sma30_4h','price_4h'].forEach(function(k){
        var v = btRow[k];
        if (!(typeof v === 'number' && isFinite(v))) miss4h.push(k);
      });
      var bdiag1D = btRow.candleDiagnostics || null;
      var bdiag4H = btRow.candleDiagnostics4h || null;
      var backendCandles1DCount = bdiag1D && isFinite(parseFloat(bdiag1D.candlesCount)) ? parseFloat(bdiag1D.candlesCount) : null;
      var backendCandles4HCount = bdiag4H && isFinite(parseFloat(bdiag4H.aggregated4hCandlesCount)) ? parseFloat(bdiag4H.aggregated4hCandlesCount)
        : (bdiag4H && isFinite(parseFloat(bdiag4H.candlesCount)) ? parseFloat(bdiag4H.candlesCount) : null);
      var hasConfirmed1D = miss.length === 0;
      var contractMismatch = hasConfirmed1D && (backendCandles1DCount == null || backendCandles1DCount === 0);
      if (_portfolioTechnicalDebugEnabled()) console.debug('[PortfolioTechnical] traffic light unavailable: unconfirmed fields', {
        ticker: pos.ticker,
        candles1DCount: backendCandles1DCount != null ? backendCandles1DCount : (candles1D ? candles1D.length : 0),
        candles4HCount: backendCandles4HCount != null ? backendCandles4HCount : (candles4H ? candles4H.length : 0),
        frontendCandles1DCount: candles1D ? candles1D.length : 0,
        frontendCandles4HCount: candles4H ? candles4H.length : 0,
        backendCandles1DCount: backendCandles1DCount,
        backendCandles4HCount: backendCandles4HCount,
        backendMissingFields1D: miss,
        backendMissingFields4H: miss4h,
        hasBackendTechnical4H: btRow.hasBackendTechnical4H === true,
        hasAnyBackendTechnical4H: btRow.hasAnyBackendTechnical4H === true,
        hasBackendBollinger1D: btRow.hasBackendBollinger1D === true,
        formulaParity: btRow.formulaParity || null,
        contractMismatch: contractMismatch,
        contractMismatchNote: contractMismatch ? 'backend returned confirmed 1D indicators but no 1D candle count; counts should reflect derivation' : null
      });
    }
    if (S.debugPortfolioRefresh === true) {
      var audit = _pfBuildTrafficLightInputAudit(pos, candles1D, candles4H, alignment, drs, vc, ea, tl, hasShortOpts, techInputs.source, techInputs.backendSnapshot);
      console.log('[PortfolioTechnical] traffic light input audit', {
        ticker: pos.ticker,
        positionId: pos.id,
        audit: audit
      });
      console.log('[PortfolioTechnical] traffic light input audit summary', JSON.stringify({
        ticker: pos.ticker,
        positionId: pos.id,
        finalTrafficLight: audit ? audit.finalTrafficLight : null,
        reason: audit ? audit.reason : null,
        missingFields: audit ? audit.missingFields : [],
        unconfirmedFields: audit ? audit.unconfirmedFields : [],
        presentFields: audit ? audit.presentFields : [],
        sourceByField: audit ? audit.sourceByField : {}
      }));
    }
    _pfUpdateRowTrafficLight(pos.id);
  } catch(e) { /* silent — never block rendering */ }
}
