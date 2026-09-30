// Validates a backend full-refresh payload before any legacy step is skipped.
// Returns { valid: boolean, warnings: string[] }.
// A non-empty warnings array means partial or full trust must be withheld for affected fields.
function _validateBackendFullRefreshPayload(data, tickers) {
  var warnings = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, warnings: ['payload_null_or_non_object'] };
  }
  var normalizedTickers = (tickers || []).map(function(t) {
    return String(t || '').trim().toUpperCase();
  }).filter(Boolean);
  // underlyings must exist and contain the expected tickers
  var underlyings = data.underlyingsBySymbol || data.underlyings || null;
  if (!underlyings || typeof underlyings !== 'object' || Array.isArray(underlyings)) {
    warnings.push('missing_or_invalid_underlyings');
  } else {
    normalizedTickers.forEach(function(tk) {
      if (!underlyings[tk]) warnings.push('underlying_missing_' + tk);
    });
  }
  // options must be an object/map if present
  if (data.options !== undefined && (typeof data.options !== 'object' || Array.isArray(data.options))) {
    warnings.push('options_not_object_map');
  }
  // betaWeightedDelta: backend returns { bwd, benchmarkPrice, contributions, reason } or null.
  // null = backend could not compute — not malformed. Only warn if bwd is present but not finite.
  if (data.betaWeightedDelta !== undefined && data.betaWeightedDelta !== null) {
    if (typeof data.betaWeightedDelta === 'object' && !Array.isArray(data.betaWeightedDelta)) {
      var _bwdVal = data.betaWeightedDelta.bwd;
      if (_bwdVal !== undefined && _bwdVal !== null && !isFinite(parseFloat(_bwdVal))) {
        warnings.push('betaWeightedDelta_bwd_not_finite');
      }
      // bwd === null means backend could not compute — record as unavailable, not malformed
    } else if (typeof data.betaWeightedDelta !== 'object' && !isFinite(parseFloat(data.betaWeightedDelta))) {
      // scalar form must be finite
      warnings.push('betaWeightedDelta_not_finite');
    }
  }
  // exitAlertsByPositionId must be { [positionId]: Array } if present
  if (data.exitAlertsByPositionId !== undefined) {
    if (typeof data.exitAlertsByPositionId !== 'object' || Array.isArray(data.exitAlertsByPositionId)) {
      warnings.push('exitAlertsByPositionId_invalid_schema');
    } else {
      Object.keys(data.exitAlertsByPositionId).forEach(function(k) {
        if (!Array.isArray(data.exitAlertsByPositionId[k])) {
          warnings.push('exitAlertsByPositionId_' + k + '_not_array');
        }
      });
    }
  }
  // portfolioAlignmentBySymbol is only trustworthy when alignmentSource === "backend"
  var diag = data.fullRefreshDiagnostics || {};
  if (data.portfolioAlignmentBySymbol && diag.alignmentSource !== 'backend') {
    warnings.push('portfolioAlignmentBySymbol_source_not_confirmed');
  }
  return { valid: warnings.length === 0, warnings: warnings };
}
