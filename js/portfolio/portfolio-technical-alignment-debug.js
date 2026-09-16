function buildPortfolioTechnicalAlignmentDebug(ticker, pos, technical) {
  var debug = { ok:false, ticker:ticker, source:'BACKEND_TECHNICAL_REFRESH', bias1D:'unknown', bias4H:'unknown', agreement:'unknown', positionDirection:'unknown', reasons:[], missingFields:[], diagnostics:{ rsi14:null, sma20:null, sma30:null, bbUpper:null, bbMiddle:null, bbLower:null, rsi14_4h:null, sma20_4h:null, sma30_4h:null, bbUpper_4h:null, bbMiddle_4h:null, bbLower_4h:null, agg4h:null, waitTimedOut4h:null, candleStale4h:null } };
  var t = technical || {}, c4h = t.candleDiagnostics4h || {};
  ['rsi14','sma20','sma30','bbUpper','bbMiddle','bbLower','rsi14_4h','sma20_4h','sma30_4h','bbUpper_4h','bbMiddle_4h','bbLower_4h'].forEach(function(k){ if(isFinite(t[k])) debug.diagnostics[k]=Number(t[k]); });
  debug.diagnostics.agg4h = isFinite(c4h.aggregated4hCandlesCount) ? Number(c4h.aggregated4hCandlesCount) : null;
  debug.diagnostics.waitTimedOut4h = c4h.waitTimedOut === true;
  debug.diagnostics.candleStale4h = c4h.candleStale === true;
  if (isFinite(pos && pos.delta)) {
    var posDelta = Number(pos.delta);
    if (posDelta > 0) debug.positionDirection = 'long_delta';
    else if (posDelta < 0) debug.positionDirection = 'short_delta';
    else debug.positionDirection = 'flat_delta';
  }

  var rsi14 = Number(t.rsi14), sma20 = Number(t.sma20), sma30 = Number(t.sma30);
  var hasRsi1D = isFinite(rsi14), hasSma20_1D = isFinite(sma20), hasSma30_1D = isFinite(sma30);
  if (!hasRsi1D) debug.missingFields.push('rsi14');
  if (!hasSma20_1D) debug.missingFields.push('sma20');
  if (!hasSma30_1D) debug.missingFields.push('sma30');
  if (!hasRsi1D || !hasSma20_1D || !hasSma30_1D) debug.bias1D = 'unknown';
  else if (rsi14 > 55 && sma20 > sma30) debug.bias1D = 'bullish';
  else if (rsi14 < 45 && sma20 < sma30) debug.bias1D = 'bearish';
  else debug.bias1D = 'neutral';

  var rsi4h = Number(t.rsi14_4h), sma20_4h = Number(t.sma20_4h), sma30_4h = Number(t.sma30_4h);
  var hasRsi4h = isFinite(rsi4h), hasSma20_4h = isFinite(sma20_4h), hasSma30_4h = isFinite(sma30_4h);
  if (c4h.candleStale === true) { debug.bias4H = 'unknown'; debug.reasons.push('4H candles stale'); }
  else if (!hasRsi4h && !hasSma20_4h && !hasSma30_4h) { debug.bias4H = 'unknown'; debug.missingFields.push('rsi14_4h','sma20_4h','sma30_4h'); }
  else if (hasRsi4h && (!hasSma20_4h || !hasSma30_4h)) { debug.bias4H = 'partial'; if(!hasSma20_4h) debug.missingFields.push('sma20_4h'); if(!hasSma30_4h) debug.missingFields.push('sma30_4h'); debug.reasons.push('4H SMA confirmation unavailable'); }
  else if (!hasRsi4h && (hasSma20_4h || hasSma30_4h)) { debug.bias4H = 'unknown'; debug.missingFields.push('rsi14_4h'); }
  else if (rsi4h > 55 && sma20_4h > sma30_4h) debug.bias4H = 'bullish';
  else if (rsi4h < 45 && sma20_4h < sma30_4h) debug.bias4H = 'bearish';
  else debug.bias4H = 'neutral';

  var known1D = debug.bias1D !== 'unknown';
  var known4H = debug.bias4H !== 'unknown' && debug.bias4H !== 'partial';
  if (debug.bias1D === 'bullish' && debug.bias4H === 'bullish') debug.agreement = 'aligned_bullish';
  else if (debug.bias1D === 'bearish' && debug.bias4H === 'bearish') debug.agreement = 'aligned_bearish';
  else if (known1D && known4H) debug.agreement = 'mixed';
  else if (!known1D && !known4H && debug.bias4H !== 'partial') debug.agreement = 'unknown';
  else debug.agreement = 'partial';
  debug.ok = true;
  return debug;
}

async function mapLimit(items, limit, worker) {
  var arr = Array.isArray(items) ? items : [];
  var max = Math.max(1, parseInt(limit, 10) || 1);
  var out = new Array(arr.length);
  var idx = 0;
  async function runOne() {
    while (idx < arr.length) {
      var cur = idx++;
      try {
        out[cur] = await worker(arr[cur], cur);
      } catch (e) {
        var msg = (e && e.message) ? e.message : String(e);
        console.warn('[mapLimit] worker failed', arr[cur], msg);
        out[cur] = { error: true, item: arr[cur], message: msg };
      }
    }
  }
  var runners = [];
  var count = Math.min(max, arr.length);
  for (var i = 0; i < count; i++) runners.push(runOne());
  await Promise.all(runners);
  return out;
}
