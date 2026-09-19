// ── fetchDXLinkGreeks — one-shot WebSocket fetch for a list of streamer symbols ──
// Returns { [streamerSymbol]: { delta, theta, gamma, vega, volatility, bid, ask } }
// All fields start null; filled as DXLink events arrive. 5s hard timeout.
async function fetchDXLinkGreeks(streamerSymbols) {
  if (!streamerSymbols || !streamerSymbols.length) return {};
  var tokenData = await ttCall('/quote-token');
  var wsUrl  = tokenData.dxlinkUrl || tokenData.websocketUrl
             || tokenData.url      || (tokenData.data && (tokenData.data['dxlink-url'] || tokenData.data.url));
  var token  = tokenData.token     || (tokenData.data && tokenData.data.token);
  if (!wsUrl || !token) throw new Error('fetchDXLinkGreeks: /quote-token bad shape');
  var result = {};
  streamerSymbols.forEach(function(s) {
    result[s] = { delta:null, theta:null, gamma:null, vega:null, volatility:null, bid:null, ask:null };
  });
  // Canary equity subscription — determines whether FEED_DATA arrives at all on this path.
  // Not in streamerSymbols so it never blocks checkComplete or appears in the returned map.
  var CANARY = 'CSCO';
  result[CANARY] = { _canary:true, bid:null, ask:null };
  return new Promise(function(resolve) {
    var ws, settled = false;
    function finish() {
      if (settled) return; settled = true; clearTimeout(deadline);
      try { if (ws && ws.readyState < 2) ws.close(); } catch(e) {}
      resolve(result);
    }
    var deadline = setTimeout(function() {
      var canary = result[CANARY];
      console.log('[DXLink CANARY]', CANARY, 'bid:', canary.bid, 'ask:', canary.ask,
        '→', (canary.bid !== null || canary.ask !== null) ? 'equity FEED_DATA OK' : 'NO equity data — feed path broken');
console.log('[DXLink TIMEOUT] 5s expired. Final result:', JSON.stringify(result));
      finish();
    }, 5000);
    function checkComplete() {
      if (streamerSymbols.every(function(s) {
        return result[s].delta !== null && result[s].bid !== null;
      })) finish();
    }
    try { ws = new WebSocket(wsUrl); } catch(e) { clearTimeout(deadline); resolve(result); return; }
    ws.onopen = function() {
      ws.send(JSON.stringify({ type:'SETUP', channel:0, keepaliveTimeout:60, acceptKeepaliveTimeout:60, version:'0.1' }));
    };
    ws.onmessage = function(evt) {
      var msg; try { msg = JSON.parse(evt.data); } catch(e) { return; }
      if (!msg) return;
      console.log('[DXLink MSG]', msg.type, msg.channel != null ? 'ch:' + msg.channel : '');
      switch (msg.type) {
        case 'SETUP':
          ws.send(JSON.stringify({ type:'AUTH', channel:0, token:token })); break;
        case 'AUTH_STATE':
          if (msg.state === 'AUTHORIZED') {
            ws.send(JSON.stringify({ type:'CHANNEL_REQUEST', channel:1, service:'FEED', parameters:{ contract:'AUTO' } }));
          } break;
        case 'CHANNEL_OPENED':
          if (msg.channel !== 1) break;
          ws.send(JSON.stringify({ type:'FEED_SETUP', channel:1, acceptAggregationPeriod:10, acceptDataFormat:'FULL',
            acceptEventFields:{ Greeks:['eventSymbol','delta','theta','gamma','vega','volatility'], Quote:['eventSymbol','bidPrice','askPrice'] }
          }));
          var subs = [];
          streamerSymbols.forEach(function(s) { subs.push({type:'Greeks',symbol:s}); subs.push({type:'Quote',symbol:s}); });
          subs.push({type:'Quote',  symbol:CANARY});   // canary: equity
          console.log('[DXLink SUBSCRIBE] symbols:', JSON.stringify(subs));
          ws.send(JSON.stringify({ type:'FEED_SUBSCRIPTION', channel:1, add:subs })); break;
        case 'FEED_DATA':
          if (msg.channel !== 1) break;
          console.log('[DXLink RAW FEED_DATA]', JSON.stringify(msg.data));
          (msg.data || []).forEach(function(ev) {
            var sym = ev.eventSymbol;
            if (!sym || !result[sym]) {
              console.log('[DXLink SKIP]', 'sym:', sym, 'raw:', JSON.stringify(ev));
              return;
            }
            // FULL format does not include ev.type — apply by field presence (sets are non-overlapping)
            if (ev.bidPrice   != null) { result[sym].bid = ev.bidPrice; console.log('[DXLink Quote]', sym, 'bid:', ev.bidPrice, 'ask:', ev.askPrice); }
            if (ev.askPrice   != null) result[sym].ask        = ev.askPrice;
            if (ev.delta      != null) result[sym].delta      = ev.delta;
            if (ev.theta      != null) result[sym].theta      = ev.theta;
            if (ev.gamma      != null) result[sym].gamma      = ev.gamma;
            if (ev.vega       != null) result[sym].vega       = ev.vega;
            if (ev.volatility != null) result[sym].volatility = ev.volatility;
            checkComplete();
          }); break;
        case 'KEEPALIVE':
          ws.send(JSON.stringify({ type:'KEEPALIVE', channel:msg.channel || 0 })); break;
      }
    };
    ws.onerror = function() { finish(); };
    ws.onclose = function() { finish(); };
  });
}
