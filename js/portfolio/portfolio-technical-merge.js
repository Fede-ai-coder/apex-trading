function _mergeBatchInto(merged, data, timeframes) {
  if (!data || typeof data !== 'object') return;
  if (!merged._diagSeenBySymbolTf) merged._diagSeenBySymbolTf = {};
  if (data.dataSourceByTicker && typeof data.dataSourceByTicker === 'object') {
    merged.dataSourceByTicker = Object.assign({}, merged.dataSourceByTicker || {}, data.dataSourceByTicker);
  }
  if (Array.isArray(data.perSymbolDiagnostics)) {
    if (!Array.isArray(merged.perSymbolDiagnostics)) merged.perSymbolDiagnostics = [];
    data.perSymbolDiagnostics.forEach(function(d) {
      if (!d || typeof d !== 'object') return;
      var sym = String(d.symbol || d.ticker || d.underlying || '').trim().toUpperCase();
      var tf = String(d.timeframe || d.tf || d.interval || '').trim().toUpperCase();
      var key = sym + '|' + tf;
      if (merged._diagSeenBySymbolTf[key]) return;
      merged._diagSeenBySymbolTf[key] = true;
      merged.perSymbolDiagnostics.push(d);
    });
  }
  if (Array.isArray(data.missingTickers)) {
    var missSeen = {};
    (merged.missingTickers || []).forEach(function(t){ missSeen[String(t || '').trim().toUpperCase()] = true; });
    data.missingTickers.forEach(function(t){
      var k = String(t || '').trim().toUpperCase();
      if (!k || missSeen[k]) return;
      missSeen[k] = true;
      merged.missingTickers.push(k);
    });
  }
  if (data.backendCandleSourceStatus !== undefined) merged.backendCandleSourceStatus = data.backendCandleSourceStatus;
  if (data.subscriptionLimitStatus !== undefined) merged.subscriptionLimitStatus = data.subscriptionLimitStatus;
  if (data.formulaParity && typeof data.formulaParity === 'object') {
    Object.keys(data.formulaParity).forEach(function(k) {
      // prefer 'confirmed' over anything else; otherwise first non-null wins
      var prev = merged.formulaParity[k];
      var cur = data.formulaParity[k];
      if (prev === 'confirmed') return;
      if (cur === 'confirmed' || prev == null) merged.formulaParity[k] = cur;
    });
  }
  function _ingestRowMap(srcMap) {
    if (!srcMap || typeof srcMap !== 'object') return;
    Object.keys(srcMap).forEach(function(sym) {
      var key = String(sym || '').trim().toUpperCase();
      if (!key) return;
      var row = srcMap[sym] || {};
      if (!merged.technicalsBySymbol[key]) merged.technicalsBySymbol[key] = { symbol: key, technical: {} };
      var dst = merged.technicalsBySymbol[key];
      if (!dst.technical) dst.technical = {};
      if (row.technical && typeof row.technical === 'object') {
        Object.keys(row.technical).forEach(function(tf) {
          if (row.technical[tf] != null) dst.technical[tf] = row.technical[tf];
        });
      }
      if (row.timestamp && !dst.timestamp) dst.timestamp = row.timestamp;
      if (row.candleDiagnostics && typeof row.candleDiagnostics === 'object') {
        if (!dst.candleDiagnostics) dst.candleDiagnostics = {};
        Object.keys(row.candleDiagnostics).forEach(function(tf) {
          if (row.candleDiagnostics[tf] != null) dst.candleDiagnostics[tf] = row.candleDiagnostics[tf];
        });
      }
      if (row.candleDiagnostics4h && !dst.candleDiagnostics4h) dst.candleDiagnostics4h = row.candleDiagnostics4h;
      // `earnings` (next-earnings metadata, server.js toTechnicalRefreshEarnings) is
      // carried per row so the merged technicalsBySymbol keeps it — it is Tastytrade
      // symbol metadata, independent of the 1D/4H technical formula-parity gate.
      ['candles1DCount','candleCount1D','candles4HCount','candleCount4H','hasBackendTechnical1D','hasBackendTechnical4H','hasAnyBackendTechnical4H','hasBackendBollinger1D','okForTrafficLight1D','okForTrafficLight4H','missingFieldsForTrafficLight1D','missingFieldsForTrafficLight4H','oneDStatus','oneDReason','fourhStatus','fourhReason','approvedSource1D','approvedSource4H','dataSourceByTicker','formulaParity','earnings'].forEach(function(field){
        if (row[field] !== undefined) dst[field] = row[field];
      });
    });
  }
  _ingestRowMap(data.technicalsBySymbol);
  _ingestRowMap(data.technicalsByTicker);
  if (data.technicals && typeof data.technicals === 'object' && !Array.isArray(data.technicals)) _ingestRowMap(data.technicals);
  if (Array.isArray(data.technicals)) {
    data.technicals.forEach(function(row) {
      if (!row) return;
      var key = String(row.symbol || row.ticker || '').trim().toUpperCase();
      if (!key) return;
      var wrap = {}; wrap[key] = row;
      _ingestRowMap(wrap);
    });
  }
  if (Array.isArray(data.symbols)) {
    data.symbols.forEach(function(row) {
      if (!row || typeof row !== 'object') return;
      var key = String(row.symbol || row.ticker || '').trim().toUpperCase();
      if (!key) return;
      var wrap = {}; wrap[key] = row;
      _ingestRowMap(wrap);
    });
  }
  if (data.candleDiagnostics && typeof data.candleDiagnostics === 'object') {
    Object.keys(data.candleDiagnostics).forEach(function(sym) {
      var key = String(sym || '').trim().toUpperCase();
      if (!key) return;
      var src = data.candleDiagnostics[sym] || {};
      if (!merged.candleDiagnostics[key]) merged.candleDiagnostics[key] = {};
      if (src && typeof src === 'object') {
        Object.keys(src).forEach(function(tf) {
          if (src[tf] != null) merged.candleDiagnostics[key][tf] = src[tf];
        });
      }
    });
  }
  if (data.timestamp && !merged.timestamp) merged.timestamp = data.timestamp;
  var keys = Object.keys(merged.technicalsBySymbol || {});
  merged.returnedTechnicalsCount = keys.length;
  merged.with1d = keys.filter(function(k) {
    var r = merged.technicalsBySymbol[k];
    return !!(r && r.technical && r.technical['1D']);
  }).length;
  merged.with4h = keys.filter(function(k) {
    var r = merged.technicalsBySymbol[k];
    return !!(r && r.technical && r.technical['4H']);
  }).length;
}
