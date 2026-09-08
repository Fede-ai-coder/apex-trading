// ── Extract underlying symbol from a position ─────────────────
// Equity → symbol itself; Option/Future → parent ticker
function portfolioGetUnderlying(p){
  if(p.underlyingSymbol)return p.underlyingSymbol;
  if(p['underlying-symbol'])return p['underlying-symbol'];
  if(!p.instrumentType||p.instrumentType==='Equity'||p.instrumentType==='ETF')return p.symbol;
  // OCC-style option symbol: "AAPL  250117P00150000" → "AAPL"
  var m=p.symbol.match(/^([A-Z1-9]+)\s/);
  if(m)return m[1];
  m=p.symbol.match(/^([A-Z]+)\d/);
  if(m)return m[1];
  return p.symbol;
}

// ── DXLink one-shot greeks + bid/ask for open option positions ──
// Uses the same protocol as EIC deep-dive (SETUP→AUTH→CHANNEL→FEED_SETUP→SUBSCRIBE→collect→close).
// Returns positions array with .delta/.gamma/.theta/.vega/.liveIV/.mark merged in where live data arrived.
// NEVER assigns estimated/computed greeks — missing fields stay null.
async function fetchPortfolioGreeks(positions){
  // Only option positions need DXLink greeks
  var optPos=positions.filter(function(p){
    return p.instrumentType==='Equity Option'||p.instrumentType==='Future Option';
  });
  if(!optPos.length)return positions;

  // Build streamer-symbol → position map (field may be camelCase or kebab-case from backend)
  var symMap={};
  optPos.forEach(function(p){
    var sym=p.streamerSymbol||p['streamer-symbol'];
    console.log('[PortfolioSymbol]', p.symbol || p.ticker || '?',
      '| streamer-symbol:', JSON.stringify(sym),
      '| len:', sym ? sym.length : 'null');
    if(sym)symMap[sym]=p;
  });
  var allSymbols=Object.keys(symMap);
  if(!allSymbols.length){
    logEv('portfolio','DXLink: no streamer symbols on positions — greeks skipped','warn');
    return positions;
  }

  // Fetch quote token
  var tokenResp=await ttCall('/quote-token');
  if(!tokenResp||!tokenResp.token)throw new Error('Quote token unavailable');
  var token=tokenResp.token;
  var wsUrl=tokenResp.dxlinkUrl||'wss://tasty-openapi-ws.dxfeed.com/realtime';

  var liveData={};   // streamerSymbol → { bidPrice, askPrice, delta, gamma, theta, vega, iv }
  var resolved=false;

  var result=await new Promise(function(resolve){
    var ws;
    var channelId=1;
    var timeoutId=setTimeout(function(){
      if(!resolved){resolved=true;try{ws.close();}catch(e){}
        resolve(Object.keys(liveData).length>0?liveData:null);}
    },10000); // 10s timeout — longer than EIC since we may have many positions

    try{ws=new WebSocket(wsUrl);}catch(e){clearTimeout(timeoutId);resolve(null);return;}

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
          acceptEventFields:{
            Quote:  ['eventSymbol','bidPrice','askPrice'],
            Greeks: ['eventSymbol','delta','gamma','theta','vega','volatility'],
          }
        }));
        var subs=allSymbols.flatMap(function(sym){
          return [{type:'Quote',symbol:sym},{type:'Greeks',symbol:sym}];
        });
        ws.send(JSON.stringify({type:'FEED_SUBSCRIPTION',channel:channelId,add:subs}));
      }else if(msg.type==='FEED_DATA'&&msg.channel===channelId){
        (msg.data||[]).forEach(function(ev2){
          var sym2=ev2.eventSymbol;
          if(!sym2||!symMap[sym2])return;
          if(!liveData[sym2])liveData[sym2]={};
          // FULL format omits ev2.type — apply by field presence (sets are non-overlapping)
          if(ev2.bidPrice!=null)liveData[sym2].bidPrice=+ev2.bidPrice.toFixed(4);
          if(ev2.askPrice!=null)liveData[sym2].askPrice=+ev2.askPrice.toFixed(4);
          if(ev2.delta!=null)     liveData[sym2].delta    =+ev2.delta.toFixed(4);
          if(ev2.gamma!=null)     liveData[sym2].gamma    =+ev2.gamma.toFixed(6);
          if(ev2.theta!=null)     liveData[sym2].theta    =+ev2.theta.toFixed(4);
          if(ev2.vega!=null)      liveData[sym2].vega     =+ev2.vega.toFixed(4);
          if(ev2.volatility!=null)liveData[sym2].iv       =+(ev2.volatility*100).toFixed(2);
        });
        // Resolve early if every subscribed symbol has bid+delta
        var complete=allSymbols.every(function(s){
          var d2=liveData[s];return d2&&d2.delta!=null&&d2.bidPrice!=null;
        });
        if(complete&&!resolved){
          resolved=true;clearTimeout(timeoutId);try{ws.close();}catch(e){}resolve(liveData);
        }
      }else if(msg.type==='KEEPALIVE'){
        ws.send(JSON.stringify({type:'KEEPALIVE',channel:0}));
      }
    };
    ws.onerror=function(){
      if(!resolved){resolved=true;clearTimeout(timeoutId);try{ws.close();}catch(e){}
        resolve(Object.keys(liveData).length>0?liveData:null);}
    };
    ws.onclose=function(){
      if(!resolved){resolved=true;clearTimeout(timeoutId);
        resolve(Object.keys(liveData).length>0?liveData:null);}
    };
  });

  if(!result){
    logEv('portfolio','DXLink timeout — 0/'+allSymbols.length+' option positions responded','warn');
    return positions;
  }

  // Merge live data into positions — only if field actually arrived (no fallbacks)
  var enriched=0;
  positions.forEach(function(p){
    var sym=p.streamerSymbol||p['streamer-symbol'];
    if(!sym||!result[sym])return;
    var live=result[sym];
    // Mark price = mid of live bid/ask (both must be present)
    if(live.bidPrice!=null&&live.askPrice!=null){
      p.mark=+((live.bidPrice+live.askPrice)/2).toFixed(4);
      p.bidPrice=live.bidPrice;
      p.askPrice=live.askPrice;
    }
    // Greeks — assign ONLY fields DXLink actually returned
    if(live.delta!=null)p.delta=live.delta;
    if(live.gamma!=null)p.gamma=live.gamma;
    if(live.theta!=null)p.theta=live.theta;
    if(live.vega!=null) p.vega=live.vega;
    if(live.iv!=null)   p.liveIV=live.iv;
    p.greeksSource='DXLink';
    enriched++;
  });
  logEv('portfolio','DXLink greeks: '+enriched+'/'+allSymbols.length+' positions enriched','ok');
  return positions;
}
