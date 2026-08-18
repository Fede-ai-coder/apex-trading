// ─────────────────────────────────────────────────────────────────────────────
// EIC (Earnings Iron Condor agent) — LIVE DEEP DIVE
//
// PR 4 of the approved 4-PR EIC extraction, chosen by the post-PESS monolith
// audit (PR #374 — evidence-only, closed unmerged as a historical artifact, so
// it is cited by PR number rather than by a path; option E: screening rules ·
// panel · ticker analysis · live deep dive). PR 1 shipped
// js/services/eic-screening-rules.js, PR 2 js/ui/eic-panel.js, PR 3
// js/ui/eic-ticker-analysis-panel.js. The FOUR declaration sites below were
// relocated BYTE-FOR-BYTE out of the inline monolith in index.html. Name,
// signature, body, binding form, async form and physical order relative to one
// another are unchanged; only their location changed. No behaviour changed and
// no defect was repaired. This PR CLOSES the family: after it, zero EIC
// declarations remain inline, and that zero is terminal.
//
// FOUR SITES, THREE NAMES — AND THE DUPLICATE IS THE POINT
//   eicFetchLegs is declared TWICE, byte-for-byte identically, and BOTH copies
//   moved, in their original relative order. Both are `async function`
//   declarations, so both are HOISTED and the later one wins — at hoist time,
//   not at its physical position. Because the two are identical byte for byte,
//   the winner is indistinguishable from the loser.
//
//   DELETING one would also be behaviour-neutral, and that is exactly why it
//   must not happen here. It would be an EDIT, and this is a RELOCATION. The
//   same reasoning kept eicLiqFromLegs's duplicate pair intact in PR 1.
//
//   Recorded and deliberately NOT acted on: eicFetchLegs has ZERO call sites
//   anywhere in the application. Both declarations are dead code. The contract
//   pins that fact so a later reader knows it was measured rather than missed.
//
// THIS FILE IS NOT PURE, AND CLAIMS NOTHING OF THE KIND
//   PR 1's module is pure and is proved so in a sandbox where every forbidden
//   global is a trap. That guard cannot be applied here and is not: this file
//   performs TRANSPORT and RENDERING, and the two are interleaved rather than
//   separable. A source audit of the real bodies measured, across the four
//   declaration spans with comments stripped:
//
//     ttCall            4   (1 per eicFetchLegs copy; /quote-token and
//                            /eic/chain-symbols/… in eicDXLinkDeepDive)
//     new WebSocket     1   (DXLink realtime feed, 9s setTimeout budget)
//     setTimeout        1   ·  clearTimeout 4  ·  new Promise 1
//     getElementById    2   ·  querySelector 5  ·  createElement 1
//     innerHTML =       3   ·  innerHTML +=  2  ·  textContent = 2
//     callAgent         1   (awaited)
//     S.* fields read   2   (S.scanData, S.marketContextRisk)
//     direct S.x =      0   ·  window/globalThis writes 0  ·  fetch 0
//     addEventListener  0   ·  inline on*= handler strings 0
//
//   Splitting transport from rendering would be a redesign, so it was not done.
//   What the contract pins instead is the narrower set of properties the
//   relocation actually preserves: the effects measured ABSENT stay absent, and
//   the transport/DOM ownership measured PRESENT stays present.
//
//   The honest nuance, recorded rather than hidden: the bodies perform no
//   `S.x = …` assignment, but they DO mutate the scan row looked up out of
//   S.scanData (`d.eicLegsLive`, `d.eicFinalDecision`, `d.eicFinalDecisionTicker`).
//   That is a write to shared state reached through S, and it moved across
//   unchanged like everything else.
//
// IT MUST STAY CLASSIC-SCRIPT GLOBAL FUNCTION DECLARATIONS
//   js/ui/eic-ticker-analysis-panel.js loads BEFORE this file and calls
//   eicRunDXLink from a click handler it registers on the .eic-dxlink-btn button
//   it renders. That reference is resolved off the GLOBAL scope when the user
//   clicks — long after every script has evaluated — which is why loading this
//   module AFTER the ticker-analysis panel is safe, and why an ES module, a
//   bundler wrapper or an IIFE would break it: the name would bind locally and
//   the DXLink button would fail SILENTLY. The forward edge
//   eicAnalyzeTicker → eicRunDXLink is call-time, never load-time, and the
//   contract proves that in a real ordered classic-script harness rather than
//   assuming it. A scan of the sources that evaluate after this tag found ZERO
//   load-time reads of any of the three names.
//
//   The backward edges go the other way and are satisfied by load ORDER:
//   eicRunDXLink calls eicScreenTicker and eicBuildLiveContext, both owned by
//   js/services/eic-screening-rules.js, which loads first.
//
// INCIDENTAL DEFECTS — PINNED IN PLACE, DELIBERATELY NOT REPAIRED
//   A relocation that quietly fixed what it moved would be unreviewable: the
//   diff would no longer be a move. Each of these is measured, pinned by the
//   contract, and left exactly as it was found.
//
//     • eicRunDXLink references `fdColor` when building the live card, but
//       never declares it. `var fdColor` is function-scoped to
//       eicAnalyzeTicker, so this is an UNDECLARED global read: a genuine
//       ReferenceError on the success path. It is thrown inside the try block
//       and caught by the function's own catch, which reports it through
//       setAS('earnings-ic','err',…) and logEv(…,'err'). Relocated as-is.
//     • eicDXLinkDeepDive guards `if(d) var tsNone = …` and then dereferences
//       `d` UNCONDITIONALLY on the very next statement (`d.eicLegsLive={…}`),
//       before returning `d ? d.eicLegsLive : null`. The guard is dead in one
//       direction and absent in the other. Relocated as-is.
//     • The same body assigns `if(d) d.eicLegsLive = {…}` on the success path
//       and then returns `d.eicLegsLive` unconditionally. Relocated as-is.
//     • eicRunDXLink calls eicScreenTicker(d) TWICE — once as `sc`, once inside
//       the computeSetupScore fallback — producing an identical result.
//       Redundant, harmless, relocated as-is.
//     • Both eicFetchLegs copies are dead code, as noted above.
//
//   The separate inherited eicEnrichLegs defect belongs to PR 2 and lives in
//   js/ui/eic-panel.js. It is NOT touched here; that module stays byte-identical
//   to the base, as do PR 1's and PR 3's.
// ─────────────────────────────────────────────────────────────────────────────

// ── eicFetchLegs: fetch real option bid/ask for 4 IC legs ────────
// Called async per-ticker after initial screening.
// Returns null if backend unavailable or data insufficient.
async function eicFetchLegs(ticker){
  try{
    var resp=await ttCall('/eic/legs/'+ticker);
    return resp;
  }catch(e){
    return null;
  }
}

// ── eicFetchLegs: fetch real option bid/ask for 4 IC legs ────────
// Called async per-ticker after initial screening.
// Returns null if backend unavailable or data insufficient.
async function eicFetchLegs(ticker){
  try{
    var resp=await ttCall('/eic/legs/'+ticker);
    return resp;
  }catch(e){
    return null;
  }
}

async function eicDXLinkDeepDive(ticker, expiration){
  // Returns enriched leg data with real-time bid/ask, delta, IV.
  // Falls back gracefully to null if DXLink unavailable.
  var res = document.getElementById('eicResults');
  if(res) res.innerHTML += '<div style="font-size:8px;font-family:var(--M);color:#8b5cf6;margin-top:6px">'+
    '&#9670; DXLink: richiesta quote token per '+ticker+'...</div>';

  try {
    // ── Step 1: Get quote token from backend ─────────────────────
    var tokenResp = await ttCall('/quote-token');
    if(!tokenResp || !tokenResp.token) throw new Error('Quote token non disponibile');
    var token = tokenResp.token;
    var wsUrl  = tokenResp.dxlinkUrl || 'wss://tasty-openapi-ws.dxfeed.com/realtime';

    // ── Step 2: Get TT chain streamer symbols for the 4 legs ─────
    var chainUrl = '/eic/chain-symbols/'+ticker+(expiration?'?expiration='+expiration:'');
    var chainResp = await ttCall(chainUrl);
    if(!chainResp || !chainResp.strikes) throw new Error('Chain symbols non disponibili');

    // The /eic/legs response already has the real strike for each leg.
    // We need to find the matching streamer symbol from chain data.
    var d = S.scanData.find(function(x){return x.ticker===ticker;});
    var legsData = d&&d.eicLegs ? d.eicLegs : null;
    if(!legsData||!legsData.legs) throw new Error('Leg data non disponibile — esegui analisi base prima');

    // Map real strikes → streamer symbols
    function findStreamerSymbol(strike, type) {
      var s = chainResp.strikes.find(function(x){ return Math.abs(x.strike - strike) < 0.01; });
      if(!s) {
        // Find nearest
        s = chainResp.strikes.reduce(function(best, x){
          return Math.abs(x.strike - strike) < Math.abs(best.strike - strike) ? x : best;
        });
      }
      return type === 'call' ? s.callStreamer : s.putStreamer;
    }

    var streamerSymbols = {
      shortCall: findStreamerSymbol(legsData.legs.shortCall.strike, 'call'),
      longCall:  findStreamerSymbol(legsData.legs.longCall.strike,  'call'),
      shortPut:  findStreamerSymbol(legsData.legs.shortPut.strike,  'put'),
      longPut:   findStreamerSymbol(legsData.legs.longPut.strike,   'put'),
    };
    var allSymbols = Object.values(streamerSymbols).filter(Boolean);
    if(!allSymbols.length) throw new Error('Nessun streamer symbol trovato');

    if(res) {
      var extra = res.querySelector('.dxlink-status');
      if(!extra){ extra = document.createElement('div'); extra.className='dxlink-status';
        extra.style.cssText='font-size:8px;font-family:var(--M);color:#8b5cf6;margin-top:4px'; res.appendChild(extra); }
      extra.textContent = '&#9670; DXLink: connessione a '+wsUrl+'...';
    }

    // ── Step 3: Open DXLink WebSocket ────────────────────────────
    var liveData = {}; // { streamerSymbol: { bidPrice, askPrice, delta, volatility } }
    var resolved  = false;

    var result = await new Promise(function(resolve){
      var ws;
      var channelId = 1;
      var timeoutId = setTimeout(function(){
        if(!resolved){ resolved=true; try{ws.close();}catch(e){}
          resolve(Object.keys(liveData).length > 0 ? liveData : null); }
      }, 9000); // 9s timeout

      try { ws = new WebSocket(wsUrl); } catch(e){ clearTimeout(timeoutId); resolve(null); return; }

      ws.onopen = function(){
        // DXLink setup sequence
        ws.send(JSON.stringify({type:'SETUP',channel:0,version:'0.1',keepaliveTimeout:60,acceptKeepaliveTimeout:60}));
      };

      ws.onmessage = function(ev){
        var msg; try{ msg=JSON.parse(ev.data); }catch(e){ return; }
        if(!msg) return;

        if(msg.type === 'SETUP'){
          // Authenticate
          ws.send(JSON.stringify({type:'AUTH',channel:0,token:token}));
        }
        else if(msg.type === 'AUTH_STATE' && msg.state === 'AUTHORIZED'){
          // Open feed channel
          ws.send(JSON.stringify({type:'CHANNEL_REQUEST',channel:channelId,service:'FEED',
            parameters:{contract:'AUTO'}}));
        }
        else if(msg.type === 'CHANNEL_OPENED' && msg.channel === channelId){
          // Configure feed: request Quote and Greeks events, specific fields only
          ws.send(JSON.stringify({type:'FEED_SETUP',channel:channelId,
            acceptAggregationPeriod:10,
            acceptDataFormat:'FULL',
            acceptEventFields:{
              Quote:   ['eventSymbol','bidPrice','askPrice'],
              Greeks:  ['eventSymbol','delta','gamma','theta','vega','volatility'],
            }
          }));
          // Subscribe to all 4 leg symbols
          var subs = allSymbols.flatMap(function(sym){ return [
            {type:'Quote',  symbol:sym},
            {type:'Greeks', symbol:sym},
          ]; });
          ws.send(JSON.stringify({type:'FEED_SUBSCRIPTION',channel:channelId,add:subs}));
          if(res){
            var extra = res.querySelector('.dxlink-status');
            if(extra) extra.textContent='&#9670; DXLink: subscribed a '+allSymbols.length+' symbols — attendo dati...';
          }
        }
        else if(msg.type === 'FEED_DATA' && msg.channel === channelId){
          // Parse incoming events
          var events = msg.data || [];
          events.forEach(function(ev2){
            var sym2 = ev2.eventSymbol;
            if(!sym2) return;
            if(!liveData[sym2]) liveData[sym2]={};
            if(ev2.type === 'Quote'){
              if(ev2.bidPrice != null) liveData[sym2].bidPrice = +ev2.bidPrice.toFixed(4);
              if(ev2.askPrice != null) liveData[sym2].askPrice = +ev2.askPrice.toFixed(4);
            }
            if(ev2.type === 'Greeks'){
              if(ev2.delta      != null) liveData[sym2].delta      = +ev2.delta.toFixed(4);
              if(ev2.gamma      != null) liveData[sym2].gamma      = +ev2.gamma.toFixed(6);   // delta per $1
              if(ev2.theta      != null) liveData[sym2].theta      = +ev2.theta.toFixed(4);   // $ per day
              if(ev2.vega       != null) liveData[sym2].vega       = +ev2.vega.toFixed(4);    // $ per 1pt IV
              if(ev2.volatility != null) liveData[sym2].volatility = +(ev2.volatility*100).toFixed(2); // → %
              liveData[sym2].dataSource = 'dxlink_realtime';
            }
          });
          // If we have Quote+Greeks for all symbols, resolve early
          var complete = allSymbols.every(function(s){
            var d2=liveData[s]; return d2&&d2.bidPrice!=null&&d2.delta!=null;
          });
          if(complete && !resolved){
            resolved=true; clearTimeout(timeoutId);
            try{ws.close();}catch(e){}
            resolve(liveData);
          }
        }
        else if(msg.type === 'KEEPALIVE'){
          ws.send(JSON.stringify({type:'KEEPALIVE',channel:0}));
        }
      };

      ws.onerror = function(){ if(!resolved){ resolved=true; clearTimeout(timeoutId); try{ws.close();}catch(e){}; resolve(Object.keys(liveData).length>0?liveData:null); } };
      ws.onclose = function(){ if(!resolved){ resolved=true; clearTimeout(timeoutId); resolve(Object.keys(liveData).length>0?liveData:null); } };
    });

    if(!result){
      // DXLink returned 0 data — build a 'none' confidence result
      // instead of throwing, so the card still renders with fallback values
      logEv('earnings-ic','DXLink: timeout 0/4 legs for '+ticker+' — rendering with fallback data','warn');
      var enrichedLegsNone={};
      ['shortCall','longCall','shortPut','longPut'].forEach(function(k){
        enrichedLegsNone[k]=Object.assign({},legsData.legs[k],{dxlinkNote:'No DXLink data — values are DELAYED/ESTIMATED'});
      });
      if(d) var tsNone=new Date().toISOString();
      d.eicLegsLive={
        legs:enrichedLegsNone, streamerSymbols,
        dxlinkConfidence:          'none',
        liveLegCount:              '0/4',
        liveCreditSourceBreakdown: {shortCall:'delayed/Yahoo',shortPut:'delayed/Yahoo',longCall:'delayed/Yahoo',longPut:'delayed/Yahoo'},
        liveDataTimestamp:         tsNone,
        dataSource:'dxlink_timeout', dataTimestamp:tsNone,
        legsWithLiveData:0, confidence:'none',
      };
      if(res){var extra=res.querySelector('.dxlink-status');
        if(extra) extra.innerHTML='<span style="color:var(--am)">&#9650; DXLink timeout — 0/4 legs. Valori DELAYED/ESTIMATED.</span>';}
      return d?d.eicLegsLive:null;
    }

    // ── Step 4: Merge DXLink data into legsData ───────────────────
    var enrichedLegs = {};
    var legKeys = ['shortCall','longCall','shortPut','longPut'];
    legKeys.forEach(function(legKey){
      var leg = legsData.legs[legKey];
      var symKey = streamerSymbols[legKey];
      var live = symKey && result[symKey] ? result[symKey] : null;
      enrichedLegs[legKey] = Object.assign({}, leg, live ? {
        bidPrice:      live.bidPrice,
        askPrice:      live.askPrice,
        liveSpread:    live.askPrice && live.bidPrice ? +(live.askPrice - live.bidPrice).toFixed(4) : null,
        // Greeks — REAL-TIME from DXLink Greeks event
        realDelta:     live.delta      != null ? live.delta      : null,
        realGamma:     live.gamma      != null ? live.gamma      : null,  // [REAL-TIME/DXLink]
        realTheta:     live.theta      != null ? live.theta      : null,  // [REAL-TIME/DXLink] $/day
        realVega:      live.vega       != null ? live.vega       : null,  // [REAL-TIME/DXLink] $/pt
        realIV:        live.volatility != null ? live.volatility : null,
        // Source tags per field
        deltaSource:   live.delta      != null ? 'REAL-TIME/DXLink' : 'ESTIMATED/B-S',
        gammaSource:   live.gamma      != null ? 'REAL-TIME/DXLink' : 'ESTIMATED/B-S',
        thetaSource:   live.theta      != null ? 'REAL-TIME/DXLink' : 'ESTIMATED/B-S',
        vegaSource:    live.vega       != null ? 'REAL-TIME/DXLink' : 'ESTIMATED/B-S',
        ivSource:      live.volatility != null ? 'REAL-TIME/DXLink' : 'DELAYED/Yahoo',
        streamerSymbol: symKey,
      } : { dxlinkNote: 'No real-time data received for this leg' });
    });

    // Build summary — count legs with each live greek
    var gotRealDelta  = legKeys.filter(function(k){return enrichedLegs[k].realDelta!=null;}).length;
    var gotRealTheta  = legKeys.filter(function(k){return enrichedLegs[k].realTheta!=null;}).length;
    var gotRealGamma  = legKeys.filter(function(k){return enrichedLegs[k].realGamma!=null;}).length;
    var gotRealVega   = legKeys.filter(function(k){return enrichedLegs[k].realVega!=null;}).length;
    var greeksLive    = gotRealTheta === 4 && gotRealGamma === 4; // full greek coverage

        // Credit source breakdown: which legs have real bid/ask vs delayed
    var creditSrcBD = {
      shortCall: enrichedLegs.shortCall&&enrichedLegs.shortCall.bidPrice!=null ? 'live/DXLink' : 'delayed/Yahoo',
      shortPut:  enrichedLegs.shortPut &&enrichedLegs.shortPut.bidPrice!=null  ? 'live/DXLink' : 'delayed/Yahoo',
      longCall:  enrichedLegs.longCall &&enrichedLegs.longCall.askPrice!=null  ? 'live/DXLink' : 'delayed/Yahoo',
      longPut:   enrichedLegs.longPut  &&enrichedLegs.longPut.askPrice!=null   ? 'live/DXLink' : 'delayed/Yahoo',
    };
    var dxConf = gotRealDelta === 4 ? 'high' : gotRealDelta > 0 ? 'partial' : 'none';
    var tsNow  = new Date().toISOString();
    if(d) d.eicLegsLive = {
      legs:          enrichedLegs,
      streamerSymbols,
      // ── Transparency fields ───────────────────────────────────
      dxlinkConfidence:          dxConf,
      liveLegCount:              gotRealDelta+'/4',
      liveCreditSourceBreakdown: creditSrcBD,
      liveDataTimestamp:         tsNow,
      // ── Greeks coverage ───────────────────────────────────────
      greeksLive,                              // true = theta+gamma 4/4 legs
      gotRealTheta,  gotRealGamma,  gotRealVega,
      greeksSource: greeksLive ? 'REAL-TIME/DXLink' : 'ESTIMATED/B-S',
      // ── Legacy aliases ────────────────────────────────────────
      dataSource:       'dxlink_realtime',
      dataTimestamp:    tsNow,
      legsWithLiveData: gotRealDelta,
      confidence:       dxConf,
    };

    if(res){
      var extra = res.querySelector('.dxlink-status');
      if(extra) extra.innerHTML = '<span style="color:var(--gr)">&#9670; DXLink: '+gotRealDelta+'/4 legs con dati real-time</span>'+
        (gotRealDelta < 4 ? ' <span style="color:var(--am)">(parziale — timeout)</span>' : '');
    }
    logEv('earnings-ic','DXLink deepdive '+ticker+': '+gotRealDelta+'/4 legs real-time','ok');
    return d.eicLegsLive;

  } catch(e) {
    logEv('earnings-ic','DXLink deepdive failed: '+e.message,'warn');
    if(res){
      var extra = res.querySelector('.dxlink-status');
      if(extra) extra.innerHTML='<span style="color:var(--am)">&#9650; DXLink non disponibile: '+e.message+'</span>';
    }
    return null;
  }
}

// ── eicRunDXLink: trigger DXLink deep dive then re-analyze with live data ─
async function eicRunDXLink(ticker, expiration){
  var d = S.scanData.find(function(x){return x.ticker===ticker;});
  if(!d){showToast('Ticker non trovato','warn');return;}

  setAS('earnings-ic','busy','DXLink deep dive per '+ticker+'...');
  var liveData = await eicDXLinkDeepDive(ticker, expiration||null);

  if(!liveData){
    showToast('DXLink: errore critico per '+ticker,'warn');
    setAS('earnings-ic','warn','DXLink: errore');
    return;
  }
  // confidence=none: proceed anyway — eicBuildLiveContext will show fallback tags
  if(liveData.confidence === 'none'){
    showToast('DXLink: 0/4 legs — output con dati DELAYED/ESTIMATED','warn');
  }

  setAS('earnings-ic','busy','Re-analisi Claude con dati live...');
  var res = document.getElementById('eicResults');

  // Build context: merge live data over base Yahoo data
  var days=d.nextEarnings?Math.round((new Date(d.nextEarnings)-Date.now())/86400000):null;
  var ivr=d.ivRank!=null?d.ivRank:null;
  var sc = eicScreenTicker(d);
  var baseLegs = d.eicLegs || null;
  var liveCtx  = eicBuildLiveContext(liveData, baseLegs);

  var ctx=[
    '=== EIC DXLINK DEEP DIVE — '+ticker+' ===',
    'PREZZO: $'+d.price+' | EARNINGS: '+d.nextEarnings+' ('+days+'gg)',
    'IVR: '+(ivr!=null?ivr.toFixed(1)+'%':'N/A')+' | RSI: '+d.rsi+
      ' | BETA: '+(d.beta||'N/A'),
    'SCREENING SCORE: '+sc.screenScore+'/100',
    'MACRO RISK: '+(S.marketContextRisk||'non valutato'),
    '',
    liveCtx||'DXLink context non disponibile',
    '',
    '=== ISTRUZIONI DXLink DEEP DIVE ===',
    '--- WHAT IS REAL-TIME ---',
    'bid/ask: [REAL-TIME/DXLink] — use these for credit calculation, NOT delayed Yahoo values',
    'delta:   [REAL-TIME/DXLink] — use for range validation and structure assessment',
    'IV:      [REAL-TIME/DXLink] — use for IV assessment',
    '',
    '--- GREEKS SOURCE ---',
    'theta: '+(liveData.gotRealTheta===4?'ALL [REAL-TIME/DXLink] — use exact values':
               liveData.gotRealTheta>0?liveData.gotRealTheta+'/4 [PARTIAL] — use exact where available, qualitative for missing':
               '[ESTIMATED/B-S] — use qualitative ranges only, not exact numbers'),
    'gamma: '+(liveData.gotRealGamma===4?'ALL [REAL-TIME/DXLink] — use exact values':
               liveData.gotRealGamma>0?liveData.gotRealGamma+'/4 [PARTIAL] — same rule':
               '[ESTIMATED/B-S] — use qualitative only'),
    'vega:  '+(liveData.gotRealVega===4 ?'ALL [REAL-TIME/DXLink] — use exact values':
               liveData.gotRealVega>0  ?liveData.gotRealVega+'/4 [PARTIAL] — same rule':
               '[ESTIMATED/B-S] — use qualitative only'),
    '--- WHAT REMAINS ESTIMATED ---',
    'rho:   [ESTIMATED/B-S] — not from DXLink feed. Omit or state as negligible for short-dated.',
    '',
    '--- CONFIDENCE LEVEL: '+(liveData.confidence||'unknown').toUpperCase()+' ('+liveData.legsWithLiveData+'/4 legs live) ---',
    (liveData.confidence==='partial'?'IMPORTANT: some legs missing real-time data — check per-leg source tags in data above.':''),
    (liveData.confidence==='none'?'WARNING: DXLink returned 0/4 legs — all values are DELAYED/ESTIMATED. Treat as analysis-grade only.':''),
    '',
    '--- OUTPUT FORMAT ---',
    'Use this format for the DXLink deep dive output:',
    '**SHORT PUT**: $[strike] | Δ [real delta] [REAL-TIME] | IV [real iv]% [REAL-TIME] | bid [bid] ask [ask] [REAL-TIME]',
    '**SHORT CALL**: $[strike] | Δ [real delta] [REAL-TIME] | IV [real iv]% [REAL-TIME] | bid [bid] ask [ask] [REAL-TIME]',
    '**LONG PUT**: $[strike] | Δ [real delta] [REAL-TIME] | IV [real iv]% [REAL-TIME] | bid [bid] ask [ask] [REAL-TIME]',
    '**LONG CALL**: $[strike] | Δ [real delta] [REAL-TIME] | IV [real iv]% [REAL-TIME] | bid [bid] ask [ask] [REAL-TIME]',
    '**NET CREDIT**: $[live credit] [REAL-TIME bid/ask]',
    '**DELTA VALIDATION**: [short in 0.10-0.15 ✓/✗ | long in 0.20-0.30 ✓/✗] — based on REAL delta',
    (liveData.greeksLive?
      '**GREEKS [REAL-TIME/DXLink]**: theta [exact $/day per leg] | gamma [exact Δ/$ per leg] | vega [exact $/pt per leg]':
      '**GREEKS**: theta '+(liveData.gotRealTheta>0?'[PARTIAL REAL-TIME/DXLink for '+liveData.gotRealTheta+'/4 legs]':'[ESTIMATED/B-S — qualitative range only]')+
        ' | gamma '+(liveData.gotRealGamma>0?'[PARTIAL]':'[ESTIMATED/B-S]')+
        ' | vega '+(liveData.gotRealVega>0?'[PARTIAL]':'[ESTIMATED/B-S]')),
    '**VERDICT**: APPROVATO / NEUTRO / SCARTATO',
    '',
    'ABSOLUTE RULES:',
    '- Use real-time delta for structure validation, not estimated',
    '- Use real-time bid/ask for credit, not delayed',
    '- theta/gamma/vega: if [REAL-TIME/DXLink] → use exact values. If [ESTIMATED/B-S] → qualitative ranges only.',
    '- Never present an ESTIMATED greek as if it were real-time.',
    '- If a leg is missing real data: state it explicitly with its source tag',
    '- EXECUTION VERDICT must reflect data quality:',
    '  * dxlinkConfidence=high → verdict from real data',
    '  * dxlinkConfidence=partial → max EXECUTABLE_WITH_SLIPPAGE',
    '  * dxlinkConfidence=none → POOR_EXECUTION_QUALITY minimum',
  ].join('\n');

  try{
    var analysis = await callAgent('earnings-ic', ctx);
    setAS('earnings-ic','ok','DXLink analysis: '+ticker);

    var verdict='NEUTRO';
    if(analysis.includes('APPROVATO'))verdict='APPROVATO';
    else if(analysis.includes('SCARTATO'))verdict='SCARTATO';
    var vColor=verdict==='APPROVATO'?'var(--gr)':verdict==='SCARTATO'?'var(--rd)':'var(--am)';

    // ── Final Decision Layer (DXLink path — richer data) ─────────
    var dxConf2 = liveData.dxlinkConfidence || liveData.confidence || 'none';
    // Use stored setupResult if available (computed in prior base analysis), else recompute
    var dxSetupResult = d.eicSetupResult ||
      computeSetupScore(d, baseLegs, eicScreenTicker(d));
    var fd=computeFinalDecision({
      setup:       dxSetupResult.setupGrade, // STRONG/OK/WEAK — objective
      claudeVerdict: verdict,
      execution:   (function(){
                     // prefer live execution quality, fall back to base
                     if(liveData.legsWithLiveData>0){
                       var anyNE =['shortCall','shortPut','longCall','longPut'].some(function(k){
                         var leg=liveData.legs&&liveData.legs[k];
                         var bid=leg&&leg.bidPrice!=null?leg.bidPrice:leg&&leg.bid;
                         return !bid||bid===0;
                       });
                       if(anyNE) return 'NOT_EXECUTABLE';
                     }
                     return baseLegs?baseLegs.executionVerdict:null;
                   })(),
      context:     S.marketContextRisk||'NONE',
      dataConf:    dxConf2,
      theoConf:    liveData.greeksLive?'HIGH':
                   (baseLegs&&baseLegs.markVsTheo?baseLegs.markVsTheo.theoreticalConfidence:'LOW'),
      screenScore: dxSetupResult.setupScore,
      hardReject:  dxSetupResult.setupHardReject?[dxSetupResult.setupHardReject]:null,
    });
    if(d){d.eicFinalDecision=fd;d.eicFinalDecisionTicker=ticker;}

    // Auto-warning prepended to output if dxlinkConfidence !== high
    var dxWarnHtml = '';
    if(dxConf2 === 'partial'){
      var lc2 = liveData.liveLegCount || liveData.legsWithLiveData+'/4';
      dxWarnHtml = '<div style="font-size:9px;font-family:var(--M);color:var(--am);padding:5px 8px;'+
        'background:rgba(255,179,64,.08);border-radius:5px;margin-bottom:8px">'+
        '&#9650; DXLINK PARTIAL: '+lc2+' legs real-time. '+
        'Alcune legs usano dati [DELAYED/Yahoo] o [ESTIMATED/B-S]. '+
        'Verdict basato su dati misti — non execution-grade.</div>';
    } else if(dxConf2 === 'none'){
      dxWarnHtml = '<div style="font-size:9px;font-family:var(--M);color:var(--rd);padding:5px 8px;'+
        'background:rgba(255,60,60,.08);border-radius:5px;margin-bottom:8px">'+
        '&#9888; DXLINK FAILED: 0/4 legs real-time. '+
        'Tutti i valori sono [DELAYED/Yahoo] o [ESTIMATED/B-S]. '+
        'Questo output equivale a un\'analisi REST standard \u2014 non beneficia di DXLink.</div>';
    }

    var formatted=dxWarnHtml+analysis.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split('\n').join('<br>');

    // Live credit from enrichedLegs for display in card header
    var ll=liveData.legs;
    var lcBid=ll.shortCall&&ll.shortCall.bidPrice!=null?ll.shortCall.bidPrice:ll.shortCall?ll.shortCall.bid:0;
    var lpBid=ll.shortPut &&ll.shortPut.bidPrice!=null ?ll.shortPut.bidPrice :ll.shortPut?ll.shortPut.bid:0;
    var lcAsk=ll.longCall &&ll.longCall.askPrice!=null ?ll.longCall.askPrice :ll.longCall?ll.longCall.ask:0;
    var lpAsk=ll.longPut  &&ll.longPut.askPrice!=null  ?ll.longPut.askPrice  :ll.longPut?ll.longPut.ask:0;
    var dispCredit=+((lcBid||0)+(lpBid||0)-(lcAsk||0)-(lpAsk||0)).toFixed(3);
    var confColor=liveData.confidence==='high'?'var(--gr)':liveData.confidence==='partial'?'var(--am)':'var(--rd)';
    var liveCard='<div class="stbox" style="border-color:'+vColor+';border-left:3px solid #8b5cf6;margin-top:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
        '<div class="stitle" style="color:#8b5cf6">EIC LIVE — '+ticker+'</div>'+
        '<div style="font-size:11px;font-weight:700;color:'+vColor+'">'+verdict+' [DXLINK]</div>'+
      '</div>'+
      '<div style="font-size:8px;font-family:var(--M);color:'+confColor+';margin-bottom:3px">'+
        '&#9670; '+liveData.legsWithLiveData+'/4 legs REAL-TIME'+
        (liveData.confidence==='partial'?' ⚠ partial — some legs [DELAYED/Yahoo]':'')+
        (liveData.confidence==='none'?' ✗ no live data — all [DELAYED/Yahoo]':'')+
        ' | <span style="color:'+fdColor+';font-weight:700">'+fd.finalTradingDecision+'</span>'+
      '</div>'+
      '<div style="font-size:8px;font-family:var(--M);color:var(--tx2);margin-bottom:6px">'+
        'Net credit: $'+dispCredit+(dispCredit<=0?' ⚠':'')+'  |  '+liveData.dataTimestamp.substring(0,19)+'Z'+
        '  |  delta/IV: [REAL-TIME]  |  theta/gamma: [ESTIMATED]'+
      '</div>'+
      '<div style="font-size:10px;font-family:var(--M);line-height:1.75">'+formatted+'</div>'+
    '</div>';

    if(res) res.innerHTML += liveCard;
    appendSysMsg('&#9670; EIC DXLink '+ticker+': '+verdict+' ('+liveData.legsWithLiveData+'/4 live legs)');
    appendAgentMsg('earnings-ic','[DXLINK DEEP DIVE - '+ticker+']\n\n'+analysis);
    logEv('earnings-ic','DXLink re-analysis '+ticker+': '+verdict+' | '+liveData.legsWithLiveData+'/4 live','ok');
  }catch(e){
    setAS('earnings-ic','err',e.message);
    logEv('earnings-ic','DXLink re-analysis error: '+e.message,'err');
  }
}
