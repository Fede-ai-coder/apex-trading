// ── Targeted DXLink fetch for Journal snapshots ───────────────────────────
// Opens a single WebSocket and subscribes to:
//   optionSymbols  — Greeks + Quote events  (completion gated on these)
//   ticker         — Quote events only      (captured opportunistically; never blocks completion)
// Completion: all optionSymbols have delta AND bid; or, when optionSymbols is
// empty, as soon as the underlying ticker receives one Quote tick.
// Timeout: 5 s (same as fetchDXLinkGreeks).
async function _prefetchDXLinkForSnapshot(ticker, optionSymbols) {
  var tokenData = await ttCall('/quote-token');
  var wsUrl = tokenData.dxlinkUrl || tokenData.websocketUrl
    || tokenData.url || (tokenData.data && (tokenData.data['dxlink-url'] || tokenData.data.url));
  var token = tokenData.token || (tokenData.data && tokenData.data.token);
  if (!wsUrl || !token) throw new Error('_prefetchDXLinkForSnapshot: /quote-token bad shape');

  var optResult = {};
  (optionSymbols || []).forEach(function(s) {
    optResult[s] = {delta:null, theta:null, gamma:null, vega:null, volatility:null, bid:null, ask:null};
  });
  var undResult = {bid: null, ask: null};

  return new Promise(function(resolve) {
    var ws, settled = false;
    function finish() {
      if (settled) return; settled = true; clearTimeout(deadline);
      try { if (ws && ws.readyState < 2) ws.close(); } catch(e) {}
      resolve({greeksMap: optResult, underlying: undResult});
    }
    var deadline = setTimeout(finish, 5000);

    function checkComplete() {
      if (!optionSymbols || !optionSymbols.length) {
        // Underlying-only mode: complete on first quote tick
        if (undResult.bid !== null || undResult.ask !== null) finish();
        return;
      }
      if (optionSymbols.every(function(s) {
        return optResult[s].delta !== null && optResult[s].bid !== null;
      })) finish();
    }

    try { ws = new WebSocket(wsUrl); } catch(e) {
      clearTimeout(deadline);
      resolve({greeksMap: optResult, underlying: undResult});
      return;
    }
    ws.onopen = function() {
      ws.send(JSON.stringify({type:'SETUP', channel:0, keepaliveTimeout:60, acceptKeepaliveTimeout:60, version:'0.1'}));
    };
    ws.onmessage = function(evt) {
      var msg; try { msg = JSON.parse(evt.data); } catch(e) { return; }
      if (!msg) return;
      switch (msg.type) {
        case 'SETUP':
          ws.send(JSON.stringify({type:'AUTH', channel:0, token:token})); break;
        case 'AUTH_STATE':
          if (msg.state === 'AUTHORIZED')
            ws.send(JSON.stringify({type:'CHANNEL_REQUEST', channel:1, service:'FEED', parameters:{contract:'AUTO'}}));
          break;
        case 'CHANNEL_OPENED':
          if (msg.channel !== 1) break;
          ws.send(JSON.stringify({
            type:'FEED_SETUP', channel:1,
            acceptAggregationPeriod:10, acceptDataFormat:'FULL',
            acceptEventFields:{
              Greeks: ['eventSymbol','delta','theta','gamma','vega','volatility'],
              Quote:  ['eventSymbol','bidPrice','askPrice'],
            },
          }));
          var subs = [];
          (optionSymbols || []).forEach(function(s) {
            subs.push({type:'Greeks', symbol:s});
            subs.push({type:'Quote',  symbol:s});
          });
          if (ticker) subs.push({type:'Quote', symbol:ticker}); // equity quote only
          console.log('[JOURNAL PREFETCH DXLINK SUBSCRIBE]', JSON.stringify({
            ticker: ticker,
            optionSymbols: optionSymbols,
            subscriptions: subs,
          }));
          ws.send(JSON.stringify({type:'FEED_SUBSCRIPTION', channel:1, add:subs}));
          break;
        case 'FEED_DATA':
          if (msg.channel !== 1) break;
          (msg.data || []).forEach(function(ev) {
            var sym = ev.eventSymbol;
            if (!sym) return;
            var isKnownOpt = !!(optResult[sym]);
            var isUnderlying = !!(ticker && sym === ticker);
            console.log('[JOURNAL PREFETCH FEED_DATA ev]', JSON.stringify({
              eventSymbol:  sym,
              knownOptKey:  isKnownOpt,
              isUnderlying: isUnderlying,
              hasDelta:     ev.delta != null,
              hasQuote:     ev.bidPrice != null,
              delta:        ev.delta   !== undefined ? ev.delta   : null,
              bid:          ev.bidPrice !== undefined ? ev.bidPrice : null,
            }));
            // Option symbol
            if (isKnownOpt) {
              if (ev.bidPrice   != null) optResult[sym].bid        = ev.bidPrice;
              if (ev.askPrice   != null) optResult[sym].ask        = ev.askPrice;
              if (ev.delta      != null) optResult[sym].delta      = ev.delta;
              if (ev.theta      != null) optResult[sym].theta      = ev.theta;
              if (ev.gamma      != null) optResult[sym].gamma      = ev.gamma;
              if (ev.vega       != null) optResult[sym].vega       = ev.vega;
              if (ev.volatility != null) optResult[sym].volatility = ev.volatility;
              checkComplete();
            }
            // Underlying equity quote (captured regardless)
            if (isUnderlying) {
              if (ev.bidPrice != null) undResult.bid = ev.bidPrice;
              if (ev.askPrice != null) undResult.ask = ev.askPrice;
              checkComplete(); // triggers early-exit in underlying-only mode
            }
          }); break;
        case 'KEEPALIVE':
          ws.send(JSON.stringify({type:'KEEPALIVE', channel:msg.channel || 0})); break;
      }
    };
    ws.onerror  = function() { finish(); };
    ws.onclose  = function() { finish(); };
  });
}

async function prefetchJournalSnapshotFromBackendDxlink(ticker, legs) {
  var optionSymbols = [];
  (legs || []).forEach(function(leg) {
    var legType = String(leg.type || leg.optionType || leg.right || '').toUpperCase();
    if (!(legType === 'CALL' || legType === 'PUT' || legType === 'C' || legType === 'P')) return;
    var sym = getPreferredOptionDxlinkSymbol(ticker, leg);
    if (sym && optionSymbols.indexOf(sym) === -1) optionSymbols.push(sym);
  });

  console.log('[JOURNAL BACKEND DXLINK PREFETCH]', JSON.stringify({
    ticker: ticker,
    optionSymbols: optionSymbols,
    hasUnderlying: !!ticker,
  }));

  if (!S.greeksCache) S.greeksCache = {};
  var ts = new Date().toISOString();
  var cacheHits = [];
  var greeksHits = [];
  var quoteHits = [];
  var cacheMisses = [];
  var underlyingHit = false;

  try {
    await Promise.all([
      subscribeBackendOptionLive(optionSymbols),
      ticker ? subscribeDxlinkQuotes([ticker]) : Promise.resolve(),
    ]);

    var optionResults = await Promise.all(optionSymbols.map(async function(sym) {
      var live = await fetchBackendOptionLive(sym);
      return { sym: sym, live: live };
    }));

    optionResults.forEach(function(row) {
      var sym = row.sym;
      var live = row.live;
      var existing = S.greeksCache[sym] || {};
      var merged = Object.assign({}, existing);
      var wrote = false;
      var hasGreeks = false;
      var hasQuote = false;
      if (live && live.greeks && !live.greeksStale) {
        ['delta','theta','gamma','vega','volatility'].forEach(function(k) {
          if (live.greeks[k] != null && isFinite(parseFloat(live.greeks[k]))) {
            merged[k] = parseFloat(live.greeks[k]);
            wrote = true;
            hasGreeks = true;
          }
        });
      }
      if (live && live.quote && !live.quoteStale) {
        var bid = live.quote.bidPrice != null ? parseFloat(live.quote.bidPrice) : null;
        var ask = live.quote.askPrice != null ? parseFloat(live.quote.askPrice) : null;
        if (isFinite(bid)) { merged.bid = bid; wrote = true; hasQuote = true; }
        if (isFinite(ask)) { merged.ask = ask; wrote = true; hasQuote = true; }
      }
      if (wrote) {
        merged.cachedAt = ts;
        merged.source = 'BACKEND_DXLINK_PREFETCH';
        S.greeksCache[sym] = merged;
        cacheHits.push(sym);
        if (hasGreeks) greeksHits.push(sym);
        if (hasQuote) quoteHits.push(sym);
        console.log('[JOURNAL BACKEND DXLINK CACHE WRITE]', JSON.stringify({
          symbol: sym,
          source: merged.source,
          hasGreeks: hasGreeks,
          hasQuote: hasQuote,
        }));
        if (hasQuote && !hasGreeks) console.log('[JOURNAL BACKEND DXLINK QUOTE ONLY]', JSON.stringify({ symbol: sym }));
      } else {
        cacheMisses.push(sym);
      }
    });

    if (ticker) {
      var undPx = await fetchLiveQuote(ticker);
      var px = Number.isFinite(parseFloat(undPx)) ? parseFloat(undPx) : null;
      if (px != null && Number.isFinite(px)) {
        S.greeksCache[ticker] = Object.assign(S.greeksCache[ticker] || {}, {
          bid: px,
          ask: px,
          underlyingPrice: px,
          cachedAt: ts,
          source: 'BACKEND_DXLINK_PREFETCH',
        });
        underlyingHit = true;
        console.log('[JOURNAL BACKEND DXLINK CACHE WRITE]', JSON.stringify({
          symbol: ticker,
          source: 'BACKEND_DXLINK_PREFETCH',
          underlyingPrice: px,
          hasQuote: true,
        }));
      } else {
        console.log('[JOURNAL BACKEND DXLINK UNDERLYING MISS]', JSON.stringify({ ticker: ticker, raw: undPx }));
      }
    }
  } catch (e) {
    console.log('[JOURNAL BACKEND DXLINK RESULT]', JSON.stringify({
      ticker: ticker,
      requestedSymbols: optionSymbols,
      cacheHits: cacheHits,
      greeksHits: greeksHits,
      quoteHits: quoteHits,
      cacheMisses: optionSymbols.filter(function(sym) { return cacheHits.indexOf(sym) === -1; }),
      underlyingHit: underlyingHit,
      success: false,
      source: 'BACKEND_DXLINK_PREFETCH',
      error: e.message || String(e),
    }));
    return {
      ticker: ticker,
      requestedSymbols: optionSymbols,
      cacheHits: cacheHits,
      greeksHits: greeksHits,
      quoteHits: quoteHits,
      cacheMisses: optionSymbols.filter(function(sym) { return cacheHits.indexOf(sym) === -1; }),
      underlyingHit: underlyingHit,
      success: false,
      source: 'BACKEND_DXLINK_PREFETCH',
    };
  }

  _saveGreeksCache();
  var summary = {
    ticker: ticker,
    requestedSymbols: optionSymbols,
    cacheHits: cacheHits,
    greeksHits: greeksHits,
    quoteHits: quoteHits,
    cacheMisses: optionSymbols.filter(function(sym) { return cacheHits.indexOf(sym) === -1; }),
    underlyingHit: underlyingHit,
    success: cacheHits.length > 0 || quoteHits.length > 0 || greeksHits.length > 0 || underlyingHit,
    source: 'BACKEND_DXLINK_PREFETCH',
  };
  console.log('[JOURNAL BACKEND DXLINK RESULT]', JSON.stringify(summary));
  return summary;
}
