// Portfolio technical 1D formula-parity keys and their accepted, semantically
// EQUIVALENT aliases. The backend emits the authoritative per-formula 1D verdict
// under the *_1d-suffixed keys (rsi14_1d / sma_1d / distanceFromSma_1d) while the
// unsuffixed keys (rsi14 / sma / distanceFromSma) double as a batch-completeness
// signal it downgrades to 'partial' when ANY requested symbol lacks a complete 1D
// (see BACKEND_ISSUE_PORTFOLIO_4H_FORMULA_PARITY / PORTFOLIO_SPY_EQ_EARNINGS_SQZ_AUDIT
// §4). Accepting the suffixed alias EXPLICITLY (never a wildcard, never a loosened
// threshold) stops a confirmed formula from being discarded for the whole batch just
// because one symbol was cold. The canonical key is always tried FIRST; a *_1d alias
// only confirms when the canonical key itself is not already 'confirmed'.
var PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES = {
  rsi14: ['rsi14', 'rsi14_1d'],
  sma: ['sma', 'sma_1d'],
  distanceFromSma: ['distanceFromSma', 'distanceFromSma_1d'],
  bollinger: ['bollinger', 'bollinger_1d']
};

// Resolve a required parity slot against its explicit alias list. Returns the exact
// key that confirmed it (canonical preferred, else the first alias === 'confirmed'),
// or null when none of the aliases is 'confirmed'. This never invents a verdict — it
// only reads the backend's own 'confirmed' string under an equivalent key name.
function _resolvePortfolioTechnicalParityKey(fp, aliases) {
  if (!fp || typeof fp !== 'object' || !Array.isArray(aliases)) return null;
  for (var i = 0; i < aliases.length; i++) {
    if (fp[aliases[i]] === 'confirmed') return aliases[i];
  }
  return null;
}

// Build the PortfolioTechnical formula-parity gate from a backend response's
// `formulaParity` object. Alias-aware (see PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES):
// the required 1D slots are confirmed when the backend says 'confirmed' under either
// the canonical key or its *_1d-suffixed alias. Thresholds are UNCHANGED — all three
// 1D slots must be confirmed; nothing is loosened. Top-level so both the mapping path
// and the post-mapping diagnostic read the identical verdict.
function buildFormulaParityGate(parity) {
  var fp = (parity && typeof parity === 'object') ? parity : {};
  var required1DKeys = ['rsi14', 'sma', 'distanceFromSma'];
  var required4HKeys = ['rsi14_4h', 'sma_4h', 'distanceFromSma_4h'];
  // Resolve each required 1D slot through its explicit alias list so the backend's
  // *_1d-suffixed verdict counts. The gate/thresholds are UNCHANGED: a slot is
  // confirmed only when the backend itself says 'confirmed' (under the canonical key
  // or an equivalent alias); nothing is loosened or auto-passed.
  var confirmedBy1D = {};
  var appliedParityAliases = {};
  required1DKeys.forEach(function(k) {
    var via = _resolvePortfolioTechnicalParityKey(fp, PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES[k]);
    confirmedBy1D[k] = via;
    if (via && via !== k) appliedParityAliases[k] = via; // record only non-canonical hits
  });
  var bollingerVia = _resolvePortfolioTechnicalParityKey(fp, PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES.bollinger);
  if (bollingerVia && bollingerVia !== 'bollinger') appliedParityAliases.bollinger = bollingerVia;
  var has4HSpecificParity = required4HKeys.some(function(k){ return Object.prototype.hasOwnProperty.call(fp, k); });
  var missingRequired1D = required1DKeys.filter(function(k){ return !confirmedBy1D[k]; });
  // Global fallback (no 4H-specific keys) inherits the ALIAS-AWARE 1D verdict, exactly
  // as before but computed from the resolved slots.
  var missingRequired4H = has4HSpecificParity
    ? required4HKeys.filter(function(k){ return fp[k] !== 'confirmed'; })
    : missingRequired1D.slice();
  // Optional diagnostics: keys the backend sent that are neither a known required key
  // nor a known alias, and are not 'confirmed'. Excluding the alias keys keeps the
  // *_1d verdicts from being mislabeled as "optional unconfirmed".
  var knownParityKeys = required1DKeys.concat(required4HKeys)
    .concat(['rsi14_1d', 'sma_1d', 'distanceFromSma_1d', 'bollinger', 'bollinger_1d']);
  var optionalUnconfirmedKeys = Object.keys(fp).filter(function(k) {
    return knownParityKeys.indexOf(k) === -1 && fp[k] !== 'confirmed';
  });
  return {
    formulaParity: fp,
    availableParityKeys: Object.keys(fp),
    required1DParityConfirmed: missingRequired1D.length === 0,
    required4HParityConfirmed: missingRequired4H.length === 0,
    fourHParityMode: has4HSpecificParity ? 'timeframe_specific' : 'global_fallback',
    missingRequired1D: missingRequired1D,
    missingRequired4H: missingRequired4H,
    appliedParityAliases: appliedParityAliases,
    // Per-formula verdicts (alias-aware) so the field-application gates in the mapping
    // path match exactly what the required-key gate decided.
    rsiParityConfirmed: !!confirmedBy1D.rsi14,
    smaParityConfirmed: !!(confirmedBy1D.sma && confirmedBy1D.distanceFromSma),
    bollingerParityConfirmed: !!bollingerVia,
    optionalParityDiagnostics: { unconfirmedKeys: optionalUnconfirmedKeys }
  };
}

function buildBackendTechnicalByTickerFromResponse(tickers, technicalResp, sourceTag) {
  var outByTicker = {};
  var response = technicalResp || {};
  var hasLiveTechnicals =
    response.technicalsIncluded === true &&
    (
      (Array.isArray(response.technicals) && response.technicals.length > 0) ||
      (response.technicals && typeof response.technicals === 'object' && Object.keys(response.technicals).length > 0) ||
      (response.technicalsBySymbol && typeof response.technicalsBySymbol === 'object' && Object.keys(response.technicalsBySymbol).length > 0)
    );
  var technicalRespOk = !!(response && (response.ok === true || hasLiveTechnicals));
  var parityGate = buildFormulaParityGate(response.formulaParity || {});
  var formulaParity = parityGate.formulaParity;
  var required1DParityConfirmed = parityGate.required1DParityConfirmed;
  var required4HParityConfirmed = parityGate.required4HParityConfirmed;
  var smaParityConfirmed = parityGate.smaParityConfirmed;
  var rsiParityConfirmed = parityGate.rsiParityConfirmed;
  var bollingerParityConfirmed = parityGate.bollingerParityConfirmed;
  if (!technicalRespOk || !required1DParityConfirmed) return { byTicker: outByTicker, usable: false, parityGate: parityGate };

  var technicalMap = {};
  if (response.technicalsBySymbol && typeof response.technicalsBySymbol === 'object' && !Array.isArray(response.technicalsBySymbol)) {
    Object.keys(response.technicalsBySymbol).forEach(function(sym) {
      var k = String(sym || '').trim().toUpperCase();
      if (k) technicalMap[k] = response.technicalsBySymbol[sym];
    });
  }
  if (response.technicals && typeof response.technicals === 'object' && !Array.isArray(response.technicals)) {
    Object.keys(response.technicals).forEach(function(sym) {
      var k = String(sym || '').trim().toUpperCase();
      if (k) technicalMap[k] = response.technicals[sym];
    });
  }
  if (Array.isArray(response.technicals)) {
    response.technicals.forEach(function(row) {
      var k = String(row && row.symbol || '').trim().toUpperCase();
      if (k) technicalMap[k] = row;
    });
  }
  if (Array.isArray(response.symbols)) {
    response.symbols.forEach(function(row) {
      var k = String(row && row.symbol || '').trim().toUpperCase();
      if (k) technicalMap[k] = row;
    });
  }

  (tickers || []).forEach(function(tk) {
    var key = String(tk || '').trim().toUpperCase();
    var row = technicalMap[key];
    if (!row || !row.technical || !row.technical['1D']) return;
    var d1 = row.technical['1D'];
    var d4h = row.technical['4H'] || null;
    var diag = (response.candleDiagnostics && response.candleDiagnostics[key] && response.candleDiagnostics[key]['1D']) ||
      (row.candleDiagnostics && row.candleDiagnostics['1D']) || null;
    var diag4h = (response.candleDiagnostics && response.candleDiagnostics[key] && response.candleDiagnostics[key]['4H']) ||
      (row.candleDiagnostics && row.candleDiagnostics['4H']) || row.candleDiagnostics4h || null;
    if (diag && diag.candleStale === true) return;
    var out = { timeframe:'1D', timestamp: row.timestamp || response.timestamp || new Date().toISOString(), candleDiagnostics: diag || null };
    if (diag4h) out.candleDiagnostics4h = { candlesCount:isFinite(parseFloat(diag4h.candlesCount))?parseFloat(diag4h.candlesCount):null, raw30mCandlesCount:isFinite(parseFloat(diag4h.raw30mCandlesCount))?parseFloat(diag4h.raw30mCandlesCount):null, aggregated4hCandlesCount:isFinite(parseFloat(diag4h.aggregated4hCandlesCount))?parseFloat(diag4h.aggregated4hCandlesCount):null, waitedFor4hMs:isFinite(parseFloat(diag4h.waitedFor4hMs))?parseFloat(diag4h.waitedFor4hMs):null, wait4hTimedOut:diag4h.wait4hTimedOut===true, targetAggregated4hCandles:isFinite(parseFloat(diag4h.targetAggregated4hCandles))?parseFloat(diag4h.targetAggregated4hCandles):null, candleStale:diag4h.candleStale===true, candleMissingReason:diag4h.candleMissingReason||null, rthAggregation:diag4h.rthAggregation===true };
    var applied = 0, applied4h = 0, appliedBollinger1D = false;
    if (smaParityConfirmed) ['sma8','sma13','sma20','sma30','sma200','distFromSma8','distFromSma13','distFromSma20','distFromSma30','distFromSma200'].forEach(function(f){ var n=parseFloat(d1[f]); if(isFinite(n)){ out[f]=n; applied++; }});
    if (rsiParityConfirmed) { var rsi14=parseFloat(d1.rsi14); if(isFinite(rsi14)){ out.rsi14=rsi14; applied++; } }
    if (bollingerParityConfirmed) ['bbUpper','bbMiddle','bbLower'].forEach(function(f){ var b=parseFloat(d1[f]); if(isFinite(b)){ out[f]=b; applied++; appliedBollinger1D=true; }});
    if (d4h && (!diag4h || diag4h.candleStale !== true)) {
      out.backendReturned4H = true;
      if (required4HParityConfirmed && rsiParityConfirmed) { var rsi4=parseFloat(d4h.rsi14); if(isFinite(rsi4)){ out.rsi14_4h=rsi4; applied++; applied4h++; }}
      if (required4HParityConfirmed && smaParityConfirmed) ['sma8','sma13','sma20','sma30','sma200','distFromSma8','distFromSma13','distFromSma20','distFromSma30','distFromSma200'].forEach(function(f){ var n4=parseFloat(d4h[f]); if(isFinite(n4)){ out[f+'_4h']=n4; applied++; applied4h++; }});
      if (required4HParityConfirmed && bollingerParityConfirmed) ['bbUpper','bbMiddle','bbLower'].forEach(function(f){ var b4=parseFloat(d4h[f]); if(isFinite(b4)){ out[f+'_4h']=b4; applied++; applied4h++; }});
      if (!required4HParityConfirmed) out.backend4HParityUnconfirmed = true;
      if (required4HParityConfirmed && applied4h === 0) out.backend4HShapeUnmapped = true;
      if (applied4h > 0) out.hasAnyBackendTechnical4H = true;
      var hasRsi14_4h = isFinite(parseFloat(out.rsi14_4h));
      var hasSma20_4h = isFinite(parseFloat(out.sma20_4h));
      var hasSma30_4h = isFinite(parseFloat(out.sma30_4h));
      if (hasRsi14_4h && hasSma20_4h && hasSma30_4h) {
        out.hasBackendTechnical4H = true;
        out.backendTechnical4HConfirmed = true;
        out.hasTechnical4H = true;
      } else if (applied4h > 0) {
        console.debug('[PortfolioTechnical] backend 4H mapped but incomplete for traffic light', {
          ticker: key,
          hasRsi14_4h: hasRsi14_4h,
          hasSma20_4h: hasSma20_4h,
          hasSma30_4h: hasSma30_4h,
          availableKeys: Object.keys(out)
        });
      }
    }
    // Squeeze (BB-inside-KC compression) is candle-derived and independent of the
    // SMA/RSI/Bollinger parity gates above, so extract it directly from the per-TF
    // technicals. 1D preferred, then 4H. Normalized to 'ACTIVE'/'OFF'/null so the
    // Portfolio row (which reads live.squeeze) renders it without a snapshot. `false`
    // is a REAL 'OFF' state — never dropped.
    var _sq1d = _technicalTfSqueezeState(d1);
    var _sq4h = _technicalTfSqueezeState(d4h);
    if (_sq1d != null) out.squeeze1d = _sq1d;
    if (_sq4h != null) out.squeeze4h = _sq4h;
    var _sqCombined = (_sq1d != null) ? _sq1d : _sq4h;
    if (_sqCombined != null) out.squeeze = _sqCombined;
    if (applied > 0) {
      if (appliedBollinger1D) out.hasBackendBollinger1D = true;
      out.formulaParity = formulaParity;
      out.required1DParityConfirmed = required1DParityConfirmed;
      out.required4HParityConfirmed = required4HParityConfirmed;
      out.fourHParityMode = parityGate.fourHParityMode;
      out.optionalParityDiagnostics = parityGate.optionalParityDiagnostics;
      out.source = sourceTag || 'BACKEND_TECHNICAL_REFRESH';
      outByTicker[key] = out;
    }
  });
  return { byTicker: outByTicker, usable: Object.keys(outByTicker).length > 0, parityGate: parityGate };
}
