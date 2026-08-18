function _ptBias(snapshot) {
  var t = (snapshot && snapshot.tech1d) ? snapshot.tech1d : (snapshot || {});
  var rsi = t.rsi14 != null ? t.rsi14 : (snapshot ? snapshot.rsi14 : null);
  var sma20 = t.sma20 != null ? t.sma20 : (snapshot ? snapshot.sma20 : null);
  var sma30 = t.sma30 != null ? t.sma30 : (snapshot ? snapshot.sma30 : null);
  var distSma20 = t.distFromSma20 != null ? t.distFromSma20 : (snapshot ? snapshot.distFromSma20 : null);
  var rs = t.relStrengthVsSpy != null ? t.relStrengthVsSpy : (snapshot ? snapshot.relStrengthVsSpy : null);

  if (rsi == null && sma20 == null && rs == null) return 'UNKNOWN';

  var bull = 0, bear = 0, tot = 0;
  if (rsi != null) {
    tot++;
    if (rsi > 55) bull++;
    else if (rsi < 45) bear++;
  }
  if (sma20 != null && sma30 != null) {
    tot++;
    if (sma20 > sma30) bull++;
    else bear++;
  }
  if (distSma20 != null) {
    tot++;
    if (distSma20 > 0) bull++;
    else if (distSma20 < 0) bear++;
  }
  if (rs != null) {
    tot++;
    if (rs > 0) bull++;
    else if (rs < 0) bear++;
  }
  if (tot < 2) return 'UNKNOWN';
  var thresh = Math.ceil(tot * 0.6);
  if (bull >= thresh) return 'LONG';
  if (bear >= thresh) return 'SHORT';
  return 'NEUTRAL';
}

// Trade delta: computed directly from S.greeksCache per option leg.
// Returns null if any option leg is missing/stale in cache — never falls back to snapshot.
function _ptTradeDelta(legs, ticker) {
  var cache = S.greeksCache || {};
  var TTL = 24 * 60 * 60 * 1000;
  var optionDelta = 0;
  var hasOptionLegs = false;

  var optionLegs = (legs || []).filter(function(l) {
    return l.type === 'CALL' || l.type === 'PUT';
  });

  for (var i = 0; i < optionLegs.length; i++) {
    var l = optionLegs[i];
    hasOptionLegs = true;
    var sym = l.streamerSymbol;
    if (!sym && ticker && l.expiry && l.strike) {
      sym = buildStreamerSymbol(ticker, l.expiry, l.strike, l.type === 'CALL' ? 'C' : 'P');
    }
    if (!sym) return { delta: null, source: 'unavailable' };
    var gd = cache[sym];
    if (!gd || gd.delta == null) return { delta: null, source: 'unavailable' };
    if (gd.cachedAt && (Date.now() - new Date(gd.cachedAt).getTime()) > TTL) {
      return { delta: null, source: 'unavailable' };
    }
    var legSign = l.side === 'SHORT' ? -1 : 1;
    var qty = parseFloat(l.qty) || 0;
    optionDelta += legSign * _ptNormalizeGreekPointsSigned(gd.delta) * qty;
  }

  var equityDelta = 0;
  var hasEquityLegs = false;
  (legs || []).forEach(function(l) {
    if (l.type === 'EQUITY') {
      equityDelta += (l.side === 'SHORT' ? -1 : 1) * (parseFloat(l.qty) || 0);
      hasEquityLegs = true;
    }
  });

  if (hasOptionLegs) {
    return { delta: Math.round((optionDelta + equityDelta) * 100) / 100, source: 'greeks_cache' };
  }
  if (hasEquityLegs && equityDelta !== 0) {
    return { delta: equityDelta, source: 'equity_legs' };
  }
  return { delta: null, source: 'unavailable' };
}

// Structure count = minimum non-zero qty among option legs. Fallback: 1.
function _ptStructureCount(legs) {
  var minQty = null;
  (legs || []).forEach(function(l) {
    var q = parseFloat(l.qty) || 0;
    if ((l.type === 'CALL' || l.type === 'PUT') && q > 0) {
      if (minQty === null || q < minQty) minQty = q;
    }
  });
  return Math.max(1, minQty || 1);
}

// Tolerance: short-leg delta may exceed the conservative vol range by this many Δ-points.
var _ptVolDeltaTolerance = 8;

// Signed normalization: raw decimal → delta-points, preserving sign.
// -0.20 → -20 · +0.20 → +20
function _ptNormalizeGreekPointsSigned(v) {
  var f = parseFloat(v);
  if (isNaN(f)) return 0;
  return Math.abs(f) < 1
    ? Math.round(f * 100 * 10000) / 10000
    : Math.round(f * 10000) / 10000;
}

// Absolute normalization: magnitude in delta-points (for short-leg aggressiveness check).
// -0.201 → 20.1 · +20.1 → 20.1
function _ptNormalizeGreekPointsAbs(v) {
  var a = Math.abs(parseFloat(v) || 0);
  return a < 1 ? Math.round(a * 100 * 10000) / 10000 : Math.round(a * 10000) / 10000;
}

// Normalize IVR: decimal (0–1) → percent; already a percent → pass through.
function _ptNormalizeIvrPercent(ivr) {
  if (ivr == null) return null;
  var v = parseFloat(ivr);
  return (v > 0 && v <= 1) ? Math.round(v * 100 * 10) / 10 : v;
}

// IVR → short-leg delta target range [lo, hi].
// <40 → [12,15] · 40–60 → [10,12] · >60 → [8,10]
function _ptGetIvrDeltaRange(ivr) {
  if (ivr == null) return null;
  var pct = _ptNormalizeIvrPercent(ivr);
  if (pct < 40)  return [12, 15];
  if (pct <= 60) return [10, 12];
  return [8, 10];
}

// VIX3M → short-leg delta target range [lo, hi].
// <15→[15,20] · 15–17→[12,15] · 17–20→[10,12] · 20–30→[8,10] · 30–40→[6,8] · >40→[4,6]
function _ptGetVix3mDeltaRange(vix3m) {
  if (vix3m == null) return null;
  var v = parseFloat(vix3m);
  if (v < 15)  return [15, 20];
  if (v < 17)  return [12, 15];
  if (v < 20)  return [10, 12];
  if (v < 30)  return [8,  10];
  if (v <= 40) return [6,   8];
  return [4, 6];
}

// Most conservative range: lower upper bound wins; tie-break on lower lower bound.
function _ptSelectConservativeVolDeltaRange(a, b) {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  if (a[1] < b[1]) return a;
  if (b[1] < a[1]) return b;
  return a[0] <= b[0] ? a : b;
}

// Structure-scaled directional delta range [lo, hi] for a given bias.
// NEUTRAL ±10/struct · LONG +10–+30/struct · SHORT −30–−10/struct
function _ptGetDeltaRangeForBias(bias, structureCount) {
  var n = structureCount || 1;
  if (bias === 'LONG')  return [+10 * n, +30 * n];
  if (bias === 'SHORT') return [-30 * n, -10 * n];
  return [-10 * n, +10 * n];
}

// Highest absolute delta (points) among short option legs, from S.greeksCache.
function _ptWorstShortLegDelta(ticker, legs) {
  var worst = null;
  var cache = S.greeksCache || {};
  var TTL = 24 * 60 * 60 * 1000;
  (legs || []).forEach(function(l) {
    if ((l.type !== 'CALL' && l.type !== 'PUT') || l.side !== 'SHORT') return;
    var sym = l.streamerSymbol;
    if (!sym && ticker && l.expiry && l.strike) {
      sym = buildStreamerSymbol(ticker, l.expiry, l.strike, l.type === 'CALL' ? 'C' : 'P');
    }
    if (!sym) return;
    var gd = cache[sym];
    if (!gd || gd.delta == null) return;
    if (gd.cachedAt && (Date.now() - new Date(gd.cachedAt).getTime()) > TTL) return;
    var absD = _ptNormalizeGreekPointsAbs(gd.delta);
    if (worst === null || absD > worst) worst = Math.round(absD * 100) / 100;
  });
  return worst;
}

// Conservative IVR/VIX3M vol range — delegates to _pt-local helpers.
function _ptVolRange(ivr, vix3m) {
  var ivrRange   = _ptGetIvrDeltaRange(ivr);
  var vix3mRange = _ptGetVix3mDeltaRange(vix3m);
  return {
    ivrRange:   ivrRange,
    vix3mRange: vix3mRange,
    selected:   _ptSelectConservativeVolDeltaRange(ivrRange, vix3mRange),
  };
}

// Main pre-trade risk check entry point.
// IVR is read only when snapshot.ivrSource === 'TASTYTRADE'; VIX3M is a separate input.
// Returns a preTradeCheck object (override must be set by caller after user decision).
function runPreTradeRiskCheck(ticker, legs, snapshot) {
  var reasons = [];
  var status = 'OK';

  function escalate(s, reason) {
    if (reason) reasons.push(reason);
    if (s === 'RED' || (s === 'WARNING' && status === 'OK')) status = s;
  }

  var indicatorAvail = snapshot && snapshot.indicatorSource && snapshot.indicatorSource !== 'UNAVAILABLE';

  // 1. Technical bias
  var bias = 'UNKNOWN';
  if (!indicatorAvail) {
    escalate('WARNING', 'Technical data incomplete — bias could not be determined.');
  } else {
    bias = _ptBias(snapshot);
    if (bias === 'UNKNOWN') escalate('WARNING', 'Technical bias unclear — mixed or insufficient signals.');
  }

  // 2. Trade delta (real per-leg Greeks only)
  var deltaResult = _ptTradeDelta(legs, ticker);
  var tradeDelta = deltaResult.delta;

  // 3. Structure count + delta range alignment
  var structureCount = _ptStructureCount(legs);
  var deltaRange = _ptGetDeltaRangeForBias(bias, structureCount);
  var deltaRangeStatus = null;

  if (tradeDelta == null) {
    escalate('WARNING', 'Option Greeks unavailable — trade delta cannot be verified.');
    deltaRangeStatus = 'unknown';
  } else {
    var wrongDirection = (bias === 'LONG' && tradeDelta < 0) ||
                        (bias === 'SHORT' && tradeDelta > 0);
    if (wrongDirection) {
      deltaRangeStatus = 'wrong_direction';
      escalate('RED',
        'Trade Δ' + (tradeDelta >= 0 ? '+' : '') + tradeDelta.toFixed(1) +
        ' is in the wrong direction vs technical bias ' + bias + '.');
    } else {
      var inRange = tradeDelta >= deltaRange[0] && tradeDelta <= deltaRange[1];
      if (!inRange) {
        var tooHigh = tradeDelta > deltaRange[1];
        deltaRangeStatus = tooHigh ? 'above' : 'below';
        var rangeWidth = Math.abs(deltaRange[1] - deltaRange[0]) || 20;
        var excess = tooHigh ? tradeDelta - deltaRange[1] : deltaRange[0] - tradeDelta;
        var sev = excess > rangeWidth * 0.5 ? 'RED' : 'WARNING';
        escalate(sev,
          'Trade Δ' + (tradeDelta >= 0 ? '+' : '') + tradeDelta.toFixed(1) +
          ' is ' + (tooHigh ? 'above' : 'below') + ' ' + bias +
          ' bias range [Δ' + deltaRange[0] + ' / Δ' + (deltaRange[1] >= 0 ? '+' : '') + deltaRange[1] + '].');
      } else {
        deltaRangeStatus = 'within';
      }
      if (bias === 'NEUTRAL' && Math.abs(tradeDelta) > 15 * structureCount) {
        escalate('WARNING',
          'Neutral bias but trade carries directional delta ' +
          (tradeDelta >= 0 ? '+' : '') + tradeDelta.toFixed(1) + '.');
      }
    }
  }

  // 4. Short-leg delta vs conservative IVR/VIX3M target.
  // IVR: accepted only when ivrSource (canonical) or ivSource (legacy) equals 'TASTYTRADE'.
  // Exact equality prevents TASTYTRADE_UNAVAILABLE being treated as a valid source.
  // VIX3M: independent volatility regime input, not an IVR fallback.
  var ivrSource = snapshot ? (snapshot.ivrSource || snapshot.ivSource || null) : null;
  var ivrReason = snapshot ? (snapshot.ivrReason || null) : null;
  var ivrFromTastytrade = ivrSource === 'TASTYTRADE';
  var ivrRaw    = ivrFromTastytrade ? (snapshot ? snapshot.ivr : null) : null;
  var ivr       = _ptNormalizeIvrPercent(ivrRaw);
  var vix3m     = snapshot ? snapshot.vix3m : null;

  var hasShortOptions = (legs || []).some(function(l) {
    return (l.type === 'CALL' || l.type === 'PUT') && l.side === 'SHORT';
  });

  var worstShortLegDelta = null, volRanges = null, selectedVolRange = null, toleranceBand = null;
  var volatilityMode = null;

  if (hasShortOptions) {
    worstShortLegDelta = _ptWorstShortLegDelta(ticker, legs);
    volRanges = _ptVolRange(ivr, vix3m);
    selectedVolRange = volRanges.selected;
    toleranceBand = selectedVolRange
      ? [selectedVolRange[0], selectedVolRange[1] + _ptVolDeltaTolerance]
      : null;

    // Label volatility mode clearly — VIX3M is never an 'IVR fallback'.
    if (ivr != null && vix3m != null)  volatilityMode = 'IVR+VIX3M';
    else if (ivr != null)              volatilityMode = 'IVR-only';
    else if (vix3m != null)            volatilityMode = 'VIX3M-only volatility check';

    if (ivr == null && vix3m == null) {
      escalate('WARNING', 'IVR and VIX3M unavailable — short-leg delta target cannot be computed.');
    } else if (!selectedVolRange) {
      escalate('WARNING', 'Volatility target range unavailable for short-leg delta check.');
    } else if (worstShortLegDelta == null) {
      escalate('WARNING', 'Short-leg delta unavailable — cannot verify against volatility target.');
    } else {
      var upperWithTol = selectedVolRange[1] + _ptVolDeltaTolerance;
      if (worstShortLegDelta > upperWithTol) {
        escalate('RED',
          'Short-leg Δ' + worstShortLegDelta.toFixed(1) +
          ' exceeds ' + (volatilityMode || 'conservative') + ' tolerance band Δ' + upperWithTol + '.');
      } else if (worstShortLegDelta > selectedVolRange[1]) {
        escalate('WARNING',
          'Short-leg Δ' + worstShortLegDelta.toFixed(1) +
          ' is above ' + (volatilityMode || 'conservative') + ' range Δ' + selectedVolRange[0] +
          '–Δ' + selectedVolRange[1] + '.');
      }
    }
  }

  return {
    status:    status,
    override:  false,
    checkedAt: new Date().toISOString(),
    reasons:   reasons,
    inputs: {
      symbol:              ticker,
      bias:                bias,
      estimatedTradeDelta: tradeDelta,
      deltaRangeStatus:    deltaRangeStatus,
      deltaRange:          deltaRange,
      structureCount:      structureCount,
      ivr:                 ivr,
      ivrSource:           ivrSource,
      ivrReason:           ivrReason,
      vix3m:               vix3m,
      volatilityMode:      volatilityMode,
      selectedVolRange:    selectedVolRange,
      toleranceBand:       toleranceBand,
      worstShortLegDelta:  worstShortLegDelta,
    },
  };
}