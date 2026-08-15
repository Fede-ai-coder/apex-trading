// ─────────────────────────────────────────────────────────────────────────────
// PESS (Pre-Earnings Strangle Swap agent) — LIVE TRANSPORT
//
// PR 2 of the approved 4-PR PESS extraction (option E of the post-SFS monolith
// audit: config/rules · live transport · analysis service · UI panel). The two
// declarations below were relocated BYTE-FOR-BYTE out of the inline monolith in
// index.html. Names, signatures, bodies, `async function` binding form and
// relative physical order are unchanged; only their location changed. No
// transport behaviour changed, and no transport defect was fixed here.
//
// WHAT THIS FILE OWNS
//   The two steps that turn a PESS candidate into live market data:
//     • pessGetStreamerSymbols — resolves the four leg streamer symbols. Returns
//                        them straight from the chain response when the backend
//                        already embedded all four; otherwise fetches
//                        /eic/chain-symbols for both expirations in parallel and
//                        maps strikes to streamer symbols. Front legs allow a
//                        nearest match within $0.50; BACK legs are aligned to the
//                        FRONT strike within max($2.50, 2.5%), which is what
//                        preserves the same-strike calendar structure. Throws
//                        STREAMER_SYMBOL_MISSING or CHAIN_MAPPING_FAILED.
//     • pessRunDXLink  — opens the DXLink WebSocket, runs the
//                        SETUP → AUTH → CHANNEL_REQUEST → FEED_SETUP →
//                        FEED_SUBSCRIPTION handshake, collects Quote and Greeks
//                        events for the four legs behind a 9,000 ms timeout, and
//                        enforces the PESS_LIVE_MIN fields fail-closed. Throws
//                        LIVE_DATA_UNAVAILABLE or NO_VALID_LIVE_LEGS. It never
//                        continues with estimated or fallback values.
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   • The minimum-field list. PESS_LIVE_MIN is owned by pess-config-rules.js and
//     is READ here at call time. There is exactly one PESS_LIVE_MIN in the
//     application; this file does not redeclare, copy or inline it.
//   • The /pess/term-structure/ endpoint. That belongs to pessAnalyzeTicker and
//     pessAnalyzeAll, which are still inline and ship in PR 3 and PR 4. The only
//     endpoints owned here are /eic/chain-symbols/… and /quote-token.
//   • Panel rendering and persistent UI state. pessRunDXLink writes progress
//     text to `statusEl`, but `statusEl` is a PARAMETER supplied by the caller
//     and every write is guarded by `if(statusEl)`. This file performs no DOM
//     LOOKUP of any kind — no document.*, no getElementById, no querySelector —
//     creates no element and retains no element beyond the call. Writing
//     progress into a caller-injected sink is a transport status report, not
//     ownership of the panel.
//   • Any state. Neither declaration reads or writes S.*, any module-level
//     binding, storage, or window/globalThis.
//
// LOAD ORDER
//   A classic, synchronous, src-only script that declares two async functions
//   and executes NOTHING at load time: no request, no socket, no subscription,
//   no timer, no listener, no DOM access, no global assignment.
//
//   Every dependency is resolved at CALL time, never at evaluation time —
//   `ttCall` (js/api/backend-client.js), `logEv` and the two callers
//   pessAnalyzeTicker / pessAnalyzeAll (still inline), `PESS_LIVE_MIN`
//   (pess-config-rules.js) and the ambient `WebSocket` / `setTimeout`. Nothing
//   in the application references either binding at load time. The single
//   requirement is therefore that this tag precede the inline monolith, so both
//   global bindings exist by the time a consumer can be CALLED.
//
//   It is loaded immediately after pess-config-rules.js, keeping the PESS family
//   region contiguous as it grows, and leaving the DSB panel as the last local
//   script before the monolith — an invariant four sibling contracts rely on.
// ─────────────────────────────────────────────────────────────────────────────

async function pessGetStreamerSymbols(ticker,chain,ts){
  var fe=chain.frontExp,be=chain.backExp;
  // Prefer symbols already embedded in chain response (backend may provide them)
  var scSym=fe&&fe.shortCall&&fe.shortCall.streamerSymbol?fe.shortCall.streamerSymbol:null;
  var spSym=fe&&fe.shortPut &&fe.shortPut.streamerSymbol ?fe.shortPut.streamerSymbol :null;
  var lcSym=be&&be.longCall &&be.longCall.streamerSymbol ?be.longCall.streamerSymbol :null;
  var lpSym=be&&be.longPut  &&be.longPut.streamerSymbol  ?be.longPut.streamerSymbol  :null;
  if(scSym&&spSym&&lcSym&&lpSym)
    return {frontShortCall:scSym,frontShortPut:spSym,backLongCall:lcSym,backLongPut:lpSym};

  // Fallback: fetch chain-symbols for both expirations in parallel
  var frontChain=null,backChain=null,fetchErr='';
  try{
    var rs=await Promise.allSettled([
      ttCall('/eic/chain-symbols/'+ticker+'?expiration='+encodeURIComponent(ts.frontExpiration)),
      ttCall('/eic/chain-symbols/'+ticker+'?expiration='+encodeURIComponent(ts.backExpiration)),
    ]);
    if(rs[0].status==='fulfilled')frontChain=rs[0].value;
    else fetchErr+=' front:'+rs[0].reason.message;
    if(rs[1].status==='fulfilled')backChain=rs[1].value;
    else fetchErr+=' back:'+rs[1].reason.message;
  }catch(e){fetchErr+=e.message;}

  if(!frontChain||!frontChain.strikes)
    throw new Error('STREAMER_SYMBOL_MISSING: front expiration ('+ts.frontExpiration+') chain-symbols unavailable'+fetchErr);
  if(!backChain||!backChain.strikes)
    throw new Error('STREAMER_SYMBOL_MISSING: back expiration ('+ts.backExpiration+') chain-symbols unavailable'+fetchErr);

  // findStreamer: exact match first (within $0.01), then nearest within maxDist.
  // maxDist=null → accept any nearest (front legs: should always be exact).
  // maxDist set  → reject if nearest exceeds threshold (back legs: alignment guard).
  function findStreamer(cd,strike,type,maxDist){
    var s=cd.strikes.find(function(x){return Math.abs(x.strike-strike)<0.01;});
    if(!s){
      var nearest=cd.strikes.reduce(function(best,x){
        return Math.abs(x.strike-strike)<Math.abs(best.strike-strike)?x:best;
      });
      if(nearest&&(maxDist==null||Math.abs(nearest.strike-strike)<=maxDist))s=nearest;
    }
    if(!s)return null;
    return type==='call'?s.callStreamer:s.putStreamer;
  }

  // FRONT legs: delta drives strike selection (done by backend on front chain).
  // Exact match expected; nearest allowed only within $0.50 (tick-level rounding only).
  if(!scSym)scSym=findStreamer(frontChain,fe.shortCall.strike,'call',0.50);
  if(!spSym)spSym=findStreamer(frontChain,fe.shortPut.strike,'put',0.50);

  // BACK legs: must align to the FRONT strike — do NOT re-select by delta on back.
  // Target is fe.shortCall/shortPut (front selection), NOT be.longCall/longPut.
  // Nearest allowed only within ~2.5% of front strike (min $2.50) to preserve
  // same-strike calendar structure. Rejects if back chain lacks a close enough strike.
  var _cdCall=Math.max(2.50,fe.shortCall.strike*0.025);
  var _cdPut =Math.max(2.50,fe.shortPut.strike *0.025);
  if(!lcSym)lcSym=findStreamer(backChain,fe.shortCall.strike,'call',_cdCall);
  if(!lpSym)lpSym=findStreamer(backChain,fe.shortPut.strike,'put', _cdPut);

  var missing=[];
  if(!scSym)missing.push('front-SC($'+fe.shortCall.strike+')');
  if(!spSym)missing.push('front-SP($'+fe.shortPut.strike+')');
  if(!lcSym)missing.push('back-LC(target $'+fe.shortCall.strike+' maxDist $'+_cdCall.toFixed(2)+')');
  if(!lpSym)missing.push('back-LP(target $'+fe.shortPut.strike+' maxDist $'+_cdPut.toFixed(2)+')');
  if(missing.length)
    throw new Error('CHAIN_MAPPING_FAILED: back strike alignment failed \u2014 ['+missing.join(', ')+']');

  return {frontShortCall:scSym,frontShortPut:spSym,backLongCall:lcSym,backLongPut:lpSym};
}

async function pessRunDXLink(ticker,syms,statusEl){
  var tokenResp=await ttCall('/quote-token');
  if(!tokenResp||!tokenResp.token)
    throw new Error('LIVE_DATA_UNAVAILABLE: /quote-token failed for '+ticker);

  var wsUrl=tokenResp.dxlinkUrl||'wss://tasty-openapi-ws.dxfeed.com/realtime';
  var legMap={
    frontShortCall:syms.frontShortCall,
    frontShortPut: syms.frontShortPut,
    backLongCall:  syms.backLongCall,
    backLongPut:   syms.backLongPut,
  };
  var allSymbols=Object.values(legMap).filter(Boolean);
  if(!allSymbols.length)
    throw new Error('STREAMER_SYMBOL_MISSING: all streamer symbols are null for '+ticker);

  if(statusEl)statusEl.textContent='\u25c6 DXLink PESS: connecting (4 legs)...';

  var raw={};     // streamerSymbol \u2192 live fields
  var resolved=false;

  var wsResult=await new Promise(function(resolve){
    var ws,channelId=1;
    var timeoutId=setTimeout(function(){
      if(!resolved){resolved=true;try{ws.close();}catch(e){}
        resolve(Object.keys(raw).length>0?raw:null);}
    },9000);
    try{ws=new WebSocket(wsUrl);}catch(e){clearTimeout(timeoutId);resolve(null);return;}

    ws.onopen=function(){
      ws.send(JSON.stringify({type:'SETUP',channel:0,version:'0.1',keepaliveTimeout:60,acceptKeepaliveTimeout:60}));
    };
    ws.onmessage=function(ev){
      var msg;try{msg=JSON.parse(ev.data);}catch(e){return;}
      if(!msg)return;
      if(msg.type==='SETUP'){
        ws.send(JSON.stringify({type:'AUTH',channel:0,token:tokenResp.token}));
      }else if(msg.type==='AUTH_STATE'&&msg.state==='AUTHORIZED'){
        ws.send(JSON.stringify({type:'CHANNEL_REQUEST',channel:channelId,service:'FEED',parameters:{contract:'AUTO'}}));
      }else if(msg.type==='CHANNEL_OPENED'&&msg.channel===channelId){
        ws.send(JSON.stringify({type:'FEED_SETUP',channel:channelId,
          acceptAggregationPeriod:10,acceptDataFormat:'FULL',
          acceptEventFields:{
            Quote: ['eventSymbol','bidPrice','askPrice'],
            Greeks:['eventSymbol','delta','gamma','theta','vega','volatility'],
          }
        }));
        var subs=allSymbols.flatMap(function(sym){return[
          {type:'Quote',symbol:sym},{type:'Greeks',symbol:sym},
        ];});
        ws.send(JSON.stringify({type:'FEED_SUBSCRIPTION',channel:channelId,add:subs}));
        if(statusEl)statusEl.textContent='\u25c6 DXLink PESS: subscribed \u2014 waiting for '+allSymbols.length+' legs...';
      }else if(msg.type==='FEED_DATA'&&msg.channel===channelId){
        (msg.data||[]).forEach(function(ev2){
          var s2=ev2.eventSymbol;if(!s2)return;
          if(!raw[s2])raw[s2]={};
          if(ev2.type==='Quote'){
            if(ev2.bidPrice!=null) raw[s2].bidPrice=+ev2.bidPrice.toFixed(4);
            if(ev2.askPrice!=null) raw[s2].askPrice=+ev2.askPrice.toFixed(4);
          }
          if(ev2.type==='Greeks'){
            if(ev2.delta!=null)    raw[s2].delta    =+ev2.delta.toFixed(4);
            if(ev2.gamma!=null)    raw[s2].gamma    =+ev2.gamma.toFixed(6);
            if(ev2.theta!=null)    raw[s2].theta    =+ev2.theta.toFixed(4);
            if(ev2.vega!=null)     raw[s2].vega     =+ev2.vega.toFixed(4);
            if(ev2.volatility!=null)raw[s2].volatility=+(ev2.volatility*100).toFixed(2);
            raw[s2].source='dxlink_realtime';
          }
        });
        var complete=allSymbols.every(function(s){
          var d2=raw[s];return d2&&d2.bidPrice!=null&&d2.delta!=null;
        });
        if(complete&&!resolved){
          resolved=true;clearTimeout(timeoutId);
          try{ws.close();}catch(e){}resolve(raw);
        }
      }else if(msg.type==='KEEPALIVE'){
        ws.send(JSON.stringify({type:'KEEPALIVE',channel:0}));
      }
    };
    ws.onerror=function(){if(!resolved){resolved=true;clearTimeout(timeoutId);try{ws.close();}catch(e){};resolve(Object.keys(raw).length>0?raw:null);}};
    ws.onclose=function(){if(!resolved){resolved=true;clearTimeout(timeoutId);resolve(Object.keys(raw).length>0?raw:null);}};
  });

  if(!wsResult)
    throw new Error('LIVE_DATA_UNAVAILABLE: DXLink timeout \u2014 0/4 legs responded for '+ticker);

  // Map back to leg names and enforce minimum live requirements
  var liveLegs={};
  var badLegs=[];
  ['frontShortCall','frontShortPut','backLongCall','backLongPut'].forEach(function(k){
    var sym=legMap[k];
    var ld=sym&&wsResult[sym]?wsResult[sym]:null;
    liveLegs[k]=ld?Object.assign({streamerSymbol:sym},ld):{streamerSymbol:sym};
    // Minimum required: bidPrice + askPrice + delta (PESS_LIVE_MIN)
    if(!ld||ld.bidPrice==null||ld.askPrice==null||ld.delta==null){
      var miss=PESS_LIVE_MIN.filter(function(f){return !ld||ld[f]==null;});
      badLegs.push(k+'[sym='+sym+'|missing:'+miss.join(',')+']');
    }
  });

  if(badLegs.length){
    var gotCount=4-badLegs.length;
    if(gotCount===0)
      throw new Error('LIVE_DATA_UNAVAILABLE: 0/4 legs returned required fields ('+PESS_LIVE_MIN.join('+')+') for '+ticker);
    throw new Error('NO_VALID_LIVE_LEGS: '+gotCount+'/4 legs live \u2014 min-field failures: '+badLegs.join(' | '));
  }

  if(statusEl)statusEl.innerHTML='<span style="color:var(--gr)">\u25c6 DXLink PESS: 4/4 legs live [bid/ask/\u0394/greeks]</span>';
  logEv('pess','PESS DXLink '+ticker+': 4/4 legs live bid/ask/delta/greeks','ok');
  return liveLegs;
}
