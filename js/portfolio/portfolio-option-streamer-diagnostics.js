function getOptionStreamerDiagnosticsForPosition(position) {
  if (!position) return [];
  var underlying = String(position.ticker || position.symbol || '').trim().toUpperCase();
  var legs = position.legs || [];
  return legs.filter(function(leg) {
    var t = String(leg && (leg.type || leg.optionType || leg.right) || '').toUpperCase();
    return t === 'CALL' || t === 'PUT' || t === 'C' || t === 'P';
  }).map(function(leg) {
    var found = [];
    ['streamerSymbol', 'optionSymbol', 'symbol', 'rawSymbol', 'expiration', 'expiry', 'strike', 'type', 'side', 'qty', 'ticker'].forEach(function(k) {
      if (leg[k] !== undefined && leg[k] !== null && leg[k] !== '') found.push('leg.' + k);
    });
    ['ticker', 'symbol'].forEach(function(k) {
      if (position[k] !== undefined && position[k] !== null && position[k] !== '') found.push('position.' + k);
    });
    return {
      underlying: underlying,
      legType: String(leg.type || leg.optionType || leg.right || '').toUpperCase(),
      strike: leg.strike != null ? leg.strike : null,
      expiration: leg.expiration || leg.expiry || null,
      side: leg.side || leg.action || null,
      qty: leg.qty != null ? leg.qty : null,
      existingStreamerSymbol: leg.streamerSymbol || leg['streamer-symbol'] || null,
      streamerSymbolConsistent: isOptionStreamerSymbolConsistent(underlying || leg.ticker, leg, leg.streamerSymbol || leg['streamer-symbol'] || null),
      compactDxlinkSymbol: buildCompactOptionDxlinkSymbol(underlying || leg.ticker, leg),
      preferredDxlinkSymbol: getPreferredOptionDxlinkSymbol(underlying || leg.ticker, leg),
      existingOptionSymbol: leg.optionSymbol || null,
      existingSymbol: leg.symbol || leg.rawSymbol || null,
      builtDxlinkSymbol: buildOptionDxlinkSymbolCandidate(underlying || leg.ticker, leg),
      sourceFieldsFound: found.join(', ')
    };
  });
}
