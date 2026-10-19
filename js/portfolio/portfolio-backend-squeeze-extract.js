// SQZ is candle-derived (BB-inside-KC compression) and INDEPENDENT of the SMA/RSI/
// Bollinger formula-parity gate that buildBackendTechnicalByTickerFromResponse
// enforces. That gate's early return (usable:false when required1DParityConfirmed is
// false) would otherwise discard a perfectly valid backend squeeze. This dedicated,
// parity-independent pass extracts ONLY the squeeze aliases the backend emits inside
// technical['1D'|'4H'] (squeeze/squeezeOn/inSqueeze/sqz) so SQZ still renders. It never
// computes a squeeze and never touches the technicals used by the traffic-light path.
// When no 1D squeeze can be sourced it records the backend's OWN reason (oneDReason /
// candleMissingReason) or an explicit no_1d_candles / insufficient_candles / squeeze_
// unavailable — never a silent "--", never a fabricated state.
function _extractBackendSqueezeByTicker(tickers, technicalResp, sourceTag) {
  var byTicker = {};
  var reasonByTicker = {};
  var response = technicalResp || {};
  var technicalMap = _portfolioTechnicalRowMapFromResponse(response);
  (tickers || []).forEach(function(tk) {
    var key = String(tk || '').trim().toUpperCase();
    if (!key) return;
    var row = technicalMap[key];
    var tech = (row && row.technical && typeof row.technical === 'object') ? row.technical : null;
    var d1 = tech ? tech['1D'] : null;
    var d4h = tech ? tech['4H'] : null;
    var sq1d = _technicalTfSqueezeState(d1);
    var sq4h = _technicalTfSqueezeState(d4h);
    var sq = (sq1d != null) ? sq1d : sq4h;
    if (sq != null || sq1d != null || sq4h != null) {
      var out = {
        timeframe: '1D',
        timestamp: (row && row.timestamp) || response.timestamp || null,
        source: sourceTag || 'BACKEND_TECHNICAL_REFRESH_SQUEEZE',
        squeezeOnly: true
      };
      if (sq1d != null) out.squeeze1d = sq1d;
      if (sq4h != null) out.squeeze4h = sq4h;
      if (sq != null)   out.squeeze   = sq;
      byTicker[key] = out;
    } else if (row) {
      // A row exists but carried no squeeze — surface the backend's own reason.
      var diag1d = (response.candleDiagnostics && response.candleDiagnostics[key] && response.candleDiagnostics[key]['1D'])
        || (row.candleDiagnostics && row.candleDiagnostics['1D']) || null;
      var reason = (row.oneDReason || row.reason)
        || (diag1d && diag1d.candleMissingReason)
        || (row.oneDStatus === 'unavailable' ? 'no_1d_candles' : null)
        || (row.oneDStatus === 'partial' ? 'insufficient_candles' : null)
        || (d1 ? 'squeeze_unavailable' : 'no_1d_candles');
      reasonByTicker[key] = reason;
    } else {
      // No technical row at all for this ticker (e.g. cold candle store / batch abort).
      var respReason = (response.reasons && response.reasons[key]) || null;
      reasonByTicker[key] = respReason || 'no_1d_candles';
    }
  });
  return { byTicker: byTicker, reasonByTicker: reasonByTicker };
}
