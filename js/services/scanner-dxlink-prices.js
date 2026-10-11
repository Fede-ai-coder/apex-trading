// ── DXLink on-demand stock price fetch for scanner ─
// Reuses same protocol as fetchPortfolioGreeks: SETUP→AUTH→CHANNEL_REQUEST→FEED_SETUP→FEED_SUBSCRIPTION
// Quote only (no Greeks needed for equities). Subscriptions sent in batches of 150.
// Resolves on full coverage or 25s timeout, then disconnects.
async function fetchScannerDXLinkPrices(tickers){
  if(!S.ttConnected)return{};
  var tokenResp=await ttCall('/quote-token');
  if(!tokenResp||!tokenResp.token)return{};
  var token=tokenResp.token;
  var wsUrl=tokenResp.dxlinkUrl||'wss://tasty-openapi-ws.dxfeed.com/realtime';
  var priceMap={};
  var resolved=false;
  return new Promise(function(resolve){
    var ws,channelId=1,subscribed=false;
    var timeoutId=setTimeout(function(){
      if(!resolved){resolved=true;try{ws.close();}catch(e){}resolve(priceMap);}
    },25000);
    try{ws=new WebSocket(wsUrl);}catch(e){clearTimeout(timeoutId);resolve({});return;}
    ws.onopen=function(){
      ws.send(JSON.stringify({type:'SETUP',channel:0,version:'0.1',keepaliveTimeout:60,acceptKeepaliveTimeout:60}));
    };
    ws.onmessage=function(ev){
      var msg;try{msg=JSON.parse(ev.data);}catch(e){return;}
      if(!msg)return;
      if(msg.type==='SETUP'){
        ws.send(JSON.stringify({type:'AUTH',channel:0,token:token}));
      }else if(msg.type==='AUTH_STATE'&&msg.state==='AUTHORIZED'){
        ws.send(JSON.stringify({type:'CHANNEL_REQUEST',channel:channelId,service:'FEED',parameters:{contract:'AUTO'}}));
      }else if(msg.type==='CHANNEL_OPENED'&&msg.channel===channelId){
        ws.send(JSON.stringify({type:'FEED_SETUP',channel:channelId,
          acceptAggregationPeriod:10,acceptDataFormat:'FULL',
          acceptEventFields:{Quote:['eventSymbol','bidPrice','askPrice']}
        }));
        for(var i=0;i<tickers.length;i+=150){
          var batch=tickers.slice(i,i+150);
          ws.send(JSON.stringify({type:'FEED_SUBSCRIPTION',channel:channelId,
            add:batch.map(function(t){return{type:'Quote',symbol:t};})}));
        }
        subscribed=true;
      }else if(msg.type==='FEED_DATA'&&msg.channel===channelId){
        (msg.data||[]).forEach(function(ev2){
          var sym=ev2.eventSymbol;
          if(!sym)return;
          if(ev2.bidPrice!=null&&ev2.askPrice!=null){
            var bid=+ev2.bidPrice,ask=+ev2.askPrice;
            if(bid>0&&ask>0)priceMap[sym]={bid:+bid.toFixed(4),ask:+ask.toFixed(4),mark:+((bid+ask)/2).toFixed(4)};
          }
        });
        if(subscribed&&tickers.every(function(t){return priceMap[t];})){
          if(!resolved){resolved=true;clearTimeout(timeoutId);try{ws.close();}catch(e){}resolve(priceMap);}
        }
      }else if(msg.type==='KEEPALIVE'){
        ws.send(JSON.stringify({type:'KEEPALIVE',channel:0}));
      }
    };
    ws.onerror=function(){
      if(!resolved){resolved=true;clearTimeout(timeoutId);try{ws.close();}catch(e){}resolve(priceMap);}
    };
    ws.onclose=function(){
      if(!resolved){resolved=true;clearTimeout(timeoutId);resolve(priceMap);}
    };
  });
}
