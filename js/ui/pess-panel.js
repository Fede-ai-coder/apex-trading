// ─────────────────────────────────────────────────────────────────────────────
// PESS (Pre-Earnings Strangle Swap agent) — UI PANEL
//
// PR 4 of the approved 4-PR PESS extraction, and the LAST one. The two
// declarations below were relocated BYTE-FOR-BYTE out of the inline monolith in
// index.html. Names, signatures, bodies, binding forms and their physical order
// relative to each other and to the rest of the family are unchanged; only
// their location changed. No behaviour changed, and no defect was fixed here.
//
// THIS FILE CLOSES THE FAMILY
//   CONFIG_RULES      js/services/pess-config-rules.js     4 /  1,786
//   LIVE_TRANSPORT    js/services/pess-live-transport.js   2 /  9,127
//   BATCH_PANEL       js/ui/pess-batch-panel.js            1 / 16,111
//   UI_PANEL          js/ui/pess-panel.js (here)           2 / 25,698
//                                                          ─────────────
//                                                          9 / 52,722
//   With this file the inline PESS declaration count reaches ZERO. The ratchet
//   ran 9 → 5 → 3 → 2 → 0 and may never rise again.
//
// WHAT THIS FILE OWNS — measured, not assumed
//   `runPESSPanel()` (3,685 chars, zero parameters) — the interactive panel
//   bootstrap and render entry. It READS `S.scanData` once (filter → sort by
//   distance from 20 days; the sort acts on the new array filter() returned,
//   never on the source) and writes nothing to S. It renders through `setPanel`
//   twice — the empty state and the populated panel — and reports through
//   `setAS` three times. It calls `pessIVRRegime` once per candidate row for the
//   IVR badge. It performs exactly ONE DOM lookup of its own,
//   `document.querySelectorAll('.pess-cand')`, and that lookup is deferred
//   inside a single `setTimeout(…, 50)` so the markup setPanel just wrote
//   exists by the time it runs; each match gets one click listener. It issues no
//   request of any kind.
//
//   The markup it generates is the panel's DOM contract: the `#pessAnalyzeAll`
//   button carrying a literal `onclick="pessAnalyzeAll()"`, the `#pessResults`
//   container, one `.pess-cand` row per candidate, and — on the empty path —
//   a `runScan()` button instead. Those id and handler strings are load-bearing
//   across module boundaries and are pinned character-for-character by the
//   contract.
//
//   `pessAnalyzeTicker(ticker)` (22,013 chars, one parameter, `async`) — the
//   single-ticker drill-down that runPESSPanel drives at click time. It is an
//   analysis-and-render flow, not a service: it acquires `#pessResults` by
//   hardcoded id in ONE `getElementById` call, holds it in `res` for the whole
//   async pipeline, and writes it from every branch — 14 `innerHTML`
//   assignments plus one `appendChild` — always guarded by `if(res)`, so a
//   headless call degrades silently rather than throwing. It never creates
//   `#pessResults`; runPESSPanel does.
//
//   Endpoints. Exactly two, and they are NOT reached the same way — a
//   difference from the batch panel that is real and is pinned:
//     • `/pess/term-structure/{ticker}` — once, through `ttCall`, no query
//       string, inside a catch that logs through `logEv` (not an empty catch).
//     • `/pess/chain/{ticker}` — once, through a RAW `fetch` against `BACKEND`,
//       deliberately not `ttCall`, so a backend JSON error is returned as
//       `chain` and the rejectCode / missing / mapping branches can classify it.
//       Six `encodeURIComponent`'d query parameters (frontExp, backExp, price,
//       ivr, days, iv), an `AbortSignal.timeout(20000)`, and headers built from
//       `S.ttSessionId` / `S.backendKey` when present.
//
//   State. Reads `S.scanData`, `S.ttSessionId` and `S.backendKey`. ZERO writes
//   to S or to any binding declared elsewhere. No storage access.
//
//   Returns. Every path resolves `undefined` — nine bare `return;` early exits
//   plus the implicit tail. It never resolves a value and, because each await
//   sits inside a try/catch, it never rejects.
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   • The rules. `pessIVRRegime` (once in runPESSPanel, twice in
//     pessAnalyzeTicker), `pessIVEdge` (once) and `pessRejectCard` (eight times)
//     are owned by pess-config-rules.js and READ here at call time.
//     `PESS_LIVE_MIN` is never referenced from this file. Nothing is redeclared,
//     copied or inlined.
//   • The transport. `pessGetStreamerSymbols` and `pessRunDXLink` are owned by
//     pess-live-transport.js and each called once, in that order, from
//     pessAnalyzeTicker only. Unlike the batch panel — which passes `null` and
//     declines the sink — this file CREATES a status element, appends it to
//     `#pessResults`, and passes it as `pessRunDXLink`'s `statusEl`.
//   • The batch. `pessAnalyzeAll` is owned by pess-batch-panel.js and is NOT
//     redeclared here. There is no call edge in either direction: runPESSPanel
//     reaches it only through the literal `onclick="pessAnalyzeAll()"` string it
//     writes into its own markup, resolved against the global binding at CLICK
//     time, and pessAnalyzeAll calls neither declaration in this file.
//
// LOAD ORDER
//   A classic, synchronous, src-only script that declares two functions and
//   executes NOTHING at load time. Despite being the most UI-heavy module in the
//   family, it is load-time inert: every DOM lookup, every request, every
//   transport call, every rule call and the one timer happen only when
//   runPESSPanel() or pessAnalyzeTicker() is CALLED. At evaluation time it
//   performs no request, no DOM access, no timer, no listener, no storage
//   access, no state mutation and no global assignment. Evaluating it
//   instantiates exactly two function globals: runPESSPanel (Function) and
//   pessAnalyzeTicker (AsyncFunction).
//
//   Every collaborator resolves at call time, never at evaluation time —
//   `ttCall` (js/api/backend-client.js), `BACKEND` (js/config/backend-config.js),
//   `callAgent`, `setAS`, `setPanel`, `appendSysMsg`, `appendAgentMsg`, `logEv`,
//   `showToast` and `S` (still inline), `pessIVRRegime` / `pessIVEdge` /
//   `pessRejectCard` (pess-config-rules.js), `pessGetStreamerSymbols` /
//   `pessRunDXLink` (pess-live-transport.js), `pessAnalyzeAll`
//   (pess-batch-panel.js, via the generated onclick), and the ambient
//   `document`, `fetch`, `Date`, `setTimeout`, `AbortSignal`, `JSON` and
//   `console`. Nothing in the application references either declaration at load
//   time, so the single requirement is that this tag precede the inline
//   monolith, so both global bindings exist by the time a user can click.
//
//   It is loaded immediately after pess-batch-panel.js, keeping the PESS family
//   contiguous in load order: config → transport → batch panel → UI panel.
//
// DEFECTS FOUND HERE AND DELIBERATELY NOT FIXED
//   The ownership audit for this relocation found four. A relocation PR must not
//   repair them, and naming them is what stops a later "tidy-up" doing it
//   silently:
//     1. `var rejectReason` is redeclared in two sibling branches of the same
//        function scope (Gate A and Gate B). Legal `var` hoisting, but the
//        second declaration shadows nothing and reads as a block-scoped binding
//        that is not one.
//     2. The `/pess/chain` OTM percentage for the put leg is computed as
//        `(chain.atmUsed||d.price-chain.shortPutStrike)/…` — `-` binds tighter
//        than `||`, so when `chain.atmUsed` is truthy the subtraction is
//        discarded and the printed OTM% is wrong. The call-leg line above it is
//        parenthesised correctly, which is what makes this a typo rather than a
//        convention.
//     3. Reject classification is derived from `e.message.split(':')[0]` for
//        both transport failures, so the reject code depends on error-message
//        punctuation — the same defect already pinned in the batch panel.
//     4. `appendSysMsg` interpolates `days`, which is `null` when no earnings
//        date is known, producing the literal text "(nullgg to earnings)".
//   All four are pinned by tests/pess-extraction-boundary-contract.test.js.
// ─────────────────────────────────────────────────────────────────────────────

function runPESSPanel(){
  setAS('pess','busy','Scanning earnings candidates...');
  // Find tickers with earnings in 7-45 days from scan data
  var candidates=S.scanData.filter(function(d){
    if(!d.nextEarnings)return false;
    var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
    return days>=7&&days<=45;
  }).sort(function(a,b){
    var da=Math.round((new Date(a.nextEarnings)-Date.now())/86400000);
    var db=Math.round((new Date(b.nextEarnings)-Date.now())/86400000);
    // Prefer 15-25 days (ideal window)
    var sa=Math.abs(da-20),sb=Math.abs(db-20);
    return sa-sb;
  });

  if(!candidates.length){
    setPanel('PRE-EARNINGS STRANGLE SWAP',
      '<div class="ptitle">NESSUN CANDIDATO</div>'+
      '<div class="dc"><div style="font-size:11px;color:var(--tx2);line-height:1.7">'+
      'Nessun ticker ha earnings nei prossimi 7-45 giorni nel dato corrente.<br><br>'+
      'Esegui uno scan e attendi il caricamento del calendario earnings.</div></div>'+
      '<button onclick="runScan()" class="runbtn" style="width:100%;margin-top:8px;font-size:9px;padding:8px">&#9654; RUN SCAN</button>'
    );
    setAS('pess','warn','No earnings candidates found');
    return;
  }

  // Build panel with candidate list + analyze button
  var html='<div class="ptitle">CANDIDATI EARNINGS ('+candidates.length+')</div>'+
    '<div style="font-size:9px;font-family:var(--M);color:var(--tx2);margin-bottom:8px">'+
    'Finestra ideale: 15-25 giorni &middot; Short front (pre-earnings) + Long back (include earnings)</div>'+
    '<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">';

  candidates.forEach(function(d){
    var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
    var ideal=days>=15&&days<=25;
    var close=days<10;
    var tc=ideal?'var(--gr)':close?'var(--rd)':'var(--am)';
    var _ivrR=pessIVRRegime(d.ivRank!==null&&d.ivRank!==undefined?d.ivRank:null);
    var ivLabel=d.ivRank!==null&&d.ivRank!==undefined?
      '<span style="font-size:8px;font-family:var(--M);color:'+_ivrR.color+'">'+'IVR '+d.ivRank.toFixed(0)+(d.ivRank>70?' REJECT':'')+'</span>':'';
    html+='<div class="ai pess-cand" data-ticker="'+d.ticker+'" style="cursor:pointer;border-color:'+(ideal?'rgba(249,115,22,.3)':'var(--b0)')+'">'+
      '<div class="adot" style="background:#f97316"></div>'+
      '<div style="flex:1">'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<span style="font-size:11px;font-weight:700">'+d.ticker+'</span>'+
          '<span style="font-size:9px;font-family:var(--M);color:'+tc+'">'+days+'gg '+ivLabel+'</span>'+
        '</div>'+
        '<div style="font-size:9px;color:var(--tx2)">'+d.name+' &middot; Earnings: '+d.nextEarnings+'</div>'+
        '<div style="font-size:8px;font-family:var(--M);color:var(--tx3)">Score: '+d.score+' &middot; '+d.signal+'</div>'+
      '</div>'+
    '</div>';
  });

  html+='</div>';
  html+='<button id="pessAnalyzeAll" onclick="pessAnalyzeAll()" style="width:100%;background:#f97316;color:#fff;border:none;border-radius:7px;padding:9px;font-family:var(--M);font-size:10px;font-weight:700;cursor:pointer;margin-bottom:6px">&#9670; ANALIZZA TUTTI ('+candidates.length+')</button>';
  html+='<div id="pessResults"></div>';

  setPanel('PRE-EARNINGS STRANGLE SWAP',html);
  setAS('pess','ok',candidates.length+' candidati trovati');

  // Attach click handlers
  setTimeout(function(){
    document.querySelectorAll('.pess-cand').forEach(function(el){
      el.addEventListener('click',function(){
        var ticker=this.getAttribute('data-ticker');
        pessAnalyzeTicker(ticker);
      });
    });
  },50);
}

async function pessAnalyzeTicker(ticker){
  var d=S.scanData.find(function(x){return x.ticker===ticker;});
  if(!d){showToast('Ticker '+ticker+' non trovato nello scanner','warn');return;}
  if(ticker==='UBER'||ticker==='CVS')console.log('[PESS-DIAG] pessAnalyzeTicker entry',ticker,'d.iv=',d.iv,'d.ivRank=',d.ivRank);

  var res=document.getElementById('pessResults');

  // ── Gate 0: IVR hard reject (> 70) — Tastytrade only, no hvRank proxy ──
  var _tickerIVR=d.ivRank!=null?d.ivRank:null;
  var _ivrGate=pessIVRRegime(_tickerIVR);
  if(_ivrGate.hardReject){
    if(res)res.innerHTML=pessRejectCard(ticker,'IVR Hard Reject',_ivrGate.hardReject);
    appendAgentMsg('pess','**SCARTATO — IVR_HARD_REJECT**\n\n'+_ivrGate.hardReject);
    setAS('pess','warn',ticker+' scartato: ivr > 70');
    logEv('pess','PESS '+ticker+' HARD REJECT (ivr>70): ivr='+(_tickerIVR!=null?_tickerIVR.toFixed(1):'N/A'),'warn');
    return;
  }

  setAS('pess','busy','Fetching term structure per '+ticker+'...');
  if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
    '<div class="td2"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>'+
    ' Fetching term structure da Tastytrade per '+ticker+'...</div>';

  // ── Step 1: fetch real term structure ───────────────────────────
  var ts=null;
  try{
    var tsResp=await ttCall('/pess/term-structure/'+ticker);
    ts=tsResp;
  }catch(e){
    logEv('pess','Term structure fetch failed per '+ticker+': '+e.message,'warn');
  }

  // ── Gate A: insufficient data ────────────────────────────────────
  if(!ts||ts.termStructureDataComplete===false){
    var rejectReason=ts&&ts.rejectReason?ts.rejectReason:'Term structure fetch failed';
    if(res)res.innerHTML=pessRejectCard(ticker,'Insufficient Term Structure Data',rejectReason);
    appendAgentMsg('pess','**SCARTATO — INSUFFICIENT_DATA**\n\n'+rejectReason);
    setAS('pess','warn',ticker+' scartato: insufficient_data');
    logEv('pess','PESS '+ticker+' REJECT (insufficient_data): '+rejectReason,'warn');
    return;
  }

  // ── Gate B: unfavorable term structure ──────────────────────────
  if(ts.isTradable===false){
    var rejectReason=ts.rejectReason||'Term structure objectively unfavorable';
    var spreadInfo='Front IV: '+(ts.frontIV*100).toFixed(2)+'% | Back IV: '+(ts.backIV*100).toFixed(2)+'% | Spread: '+(ts.ivSpread*100).toFixed(2)+'%';
    if(res)res.innerHTML=pessRejectCard(ticker,'Unfavorable Term Structure',rejectReason+'\n'+spreadInfo);
    appendAgentMsg('pess','**SCARTATO — UNFAVORABLE**\n\n'+rejectReason+'\n\n'+spreadInfo);
    setAS('pess','warn',ticker+' scartato: unfavorable');
    logEv('pess','PESS '+ticker+' REJECT (unfavorable): '+rejectReason,'warn');
    return;
  }

  // ── Gate C: unexpected verdict ───────────────────────────────────
  if(ts.termStructureVerdict!=='to_evaluate'){
    if(res)res.innerHTML=pessRejectCard(ticker,'Unexpected State','termStructureVerdict='+ts.termStructureVerdict);
    setAS('pess','warn',ticker+': unexpected state');
    return;
  }

  // ── Step 2: fetch real option chain — HARD REJECT if missing ────
  if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
    '<div class="td2"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>'+
    ' Fetching real option chain per '+ticker+'...</div>';

  var _pdDate=ts.earningsDate||d.nextEarnings||null;
  var _pdDays=_pdDate?Math.round((new Date(_pdDate)-Date.now())/86400000):null;

  // Per-expiration IVs: d.expirationIVs lookup (primary) → ts.frontIV/backIV (fallback).
  // ts.frontIV/backIV are already the IVs for the selected expirations so they
  // are a safe immediate fallback when expirationIVs doesn't contain the date.
  var _xivLookup=function(exp){
    if(!d.expirationIVs||!exp)return null;
    var e=d.expirationIVs.find(function(x){
      return (x.expirationDate||x.expiration||x.date)===exp;
    });
    return (e&&e.iv!=null)?parseFloat(e.iv):null;
  };
  var frontExpIV=(function(){var v=_xivLookup(ts.frontExpiration);return v!=null?v:(ts.frontIV!=null?ts.frontIV:null);})();
  var backExpIV =(function(){var v=_xivLookup(ts.backExpiration); return v!=null?v:(ts.backIV!=null?ts.backIV:null);})();

  // _pdIV: single IV forwarded to /pess/chain for strike delta-targeting.
  // frontExpIV is preferred (front-leg sizing is the binding constraint);
  // fall back through backExpIV → underlyingIV → d.iv → d.iv30.
  var _pdIV=frontExpIV!=null?frontExpIV
    :(backExpIV!=null?backExpIV
    :(ts.underlyingIV!=null?ts.underlyingIV
    :(d.iv!=null?d.iv
    :(d.iv30!=null?d.iv30:null))));
  if(ticker==='UBER'||ticker==='CVS')console.log('[PESS-DIAG] ivs',ticker,'frontExpIV=',frontExpIV,'backExpIV=',backExpIV,'_pdIV=',_pdIV);
  var _pdMiss=[];
  if(_pdDays==null)_pdMiss.push('days');
  if(_pdIV==null)_pdMiss.push('iv');
  var chain=null,_chainFetchErr=null,_chHttpStatus=null;
  if(_pdMiss.length){
    // Fetch skipped — missing required params. Record a specific error so the generic
    // "Network error or backend unavailable" fallback is never shown for this case.
    _chainFetchErr='Chain fetch skipped — missing required params: '+_pdMiss.join(', ');
    console.warn('[PESS] '+ticker+': /pess/chain skipped — missing params: '+_pdMiss.join(', '));
  }else{
    // Raw fetch (not ttCall) so backend JSON errors are returned as `chain`
    // and the rejectCode/error branch below can surface them properly.
    try{
      var _chHeaders={};
      if(S.ttSessionId)_chHeaders['x-session-id']=S.ttSessionId;
      if(S.backendKey)_chHeaders['x-api-key']=S.backendKey;
      var _chResp=await fetch(BACKEND+'/pess/chain/'+ticker+
        '?frontExp='+encodeURIComponent(ts.frontExpiration)+
        '&backExp='+encodeURIComponent(ts.backExpiration)+
        '&price='+encodeURIComponent(d.price||0)+
        '&ivr='+encodeURIComponent(ts.ivRank!=null?ts.ivRank:'')+
        '&days='+encodeURIComponent(_pdDays)+
        '&iv='+encodeURIComponent(_pdIV),
        {headers:_chHeaders,signal:AbortSignal.timeout(20000)});
      _chHttpStatus=_chResp.status;
      var _chRaw=await _chResp.text();
      try{chain=JSON.parse(_chRaw);}
      catch(e2){
        // Non-JSON response — true backend unavailability
        _chainFetchErr='Backend non-JSON (HTTP '+_chResp.status+'): '+_chRaw.substring(0,120);
      }
      if(!_chResp.ok&&chain&&!_chainFetchErr){
        // Backend replied with JSON error — keep `chain` so rejectCode/error branch below handles it
        console.warn('[PESS] /pess/chain HTTP '+_chResp.status+' for '+ticker+':', chain.rejectCode||chain.error||'');
        logEv('pess','Chain HTTP '+_chResp.status+' for '+ticker+': '+(chain.rejectCode||chain.error||''),'warn');
      }
    }catch(e){
      // True network failure (no response / fetch threw)
      _chainFetchErr=e.message;
      console.warn('[PESS] /pess/chain network error for '+ticker+':', e.message);
      logEv('pess','Chain fetch failed per '+ticker+': '+e.message,'warn');
    }
  }

  // Hard reject: chain not available — emit precise failure code instead of generic NO_CHAIN_DATA
  if(!chain||!chain.chainComplete){
    var _cec,_ced; // error code, detail
    if(!chain){
      _cec='CHAIN_FETCH_FAILED';
      _ced=_chainFetchErr
        ?'Backend error for '+ticker+': '+_chainFetchErr+' (front='+ts.frontExpiration+' back='+ts.backExpiration+')'
        :'Network error or backend unavailable for '+ticker+' (requested front='+ts.frontExpiration+' back='+ts.backExpiration+')';
    }else if(_chHttpStatus===404){
      // 404 means the backend has no chain for these specific expirations — not a generic error
      _cec='CHAIN_EXPIRATION_NOT_FOUND';
      _ced='Expiration not found on backend for '+ticker+
        ' (front='+ts.frontExpiration+' back='+ts.backExpiration+')'+
        (chain&&chain.error?' — '+chain.error:'')+
        (chain&&chain.availableExpirations?' | available: '+chain.availableExpirations.slice(0,6).join(', '):'');
      console.warn('[PESS] /pess/chain 404 for '+ticker+': front='+ts.frontExpiration+' back='+ts.backExpiration);
    }else if(chain.rejectCode){
      _cec=chain.rejectCode;
      _ced=(chain.error||chain.reason||'Backend rejected')+' (front='+ts.frontExpiration+' back='+ts.backExpiration+')'+
        (chain.availableExpirations?' | available: '+chain.availableExpirations.slice(0,6).join(', '):'');
      console.warn('[PESS] /pess/chain rejectCode for '+ticker+':', chain.rejectCode, chain.error||'');
    }else if(chain.missing&&chain.missing.length){
      _cec=chain.missing.length>=2?'CHAIN_EXPIRATION_MISMATCH':'CHAIN_PARTIAL_MISS';
      _ced='Requested front='+ts.frontExpiration+' back='+ts.backExpiration+
        ' | backend missing: ['+chain.missing.join(', ')+']'+
        (chain.availableExpirations?' | chain has: '+chain.availableExpirations.slice(0,6).join(', '):'');
    }else{
      _cec='CHAIN_MAPPING_FAILED';
      _ced='chainComplete=false with no missing array'+
        ' (front='+ts.frontExpiration+' back='+ts.backExpiration+')';
    }
    if(res)res.innerHTML=pessRejectCard(ticker,_cec,'HARD REJECT: '+_cec+'. '+_ced);
    appendAgentMsg('pess','**SCARTATO — '+_cec+'**\n\n'+_ced);
    setAS('pess','warn',ticker+' scartato: '+_cec.toLowerCase());
    logEv('pess','PESS '+ticker+' HARD REJECT ('+_cec+'): '+_ced,'warn');
    return;
  }

  // Validate all 4 legs have real data
  var legIssues=[];
  // Double calendar: 4 legs with exact same strikes on both expirations
  var fe=chain.frontExp; var be=chain.backExp;
  if(!fe||!fe.shortCall||!fe.shortCall.strike) legIssues.push('front short call');
  if(!fe||!fe.shortPut ||!fe.shortPut.strike)  legIssues.push('front short put');
  if(!be||!be.longCall ||!be.longCall.strike)   legIssues.push('back long call');
  if(!be||!be.longPut  ||!be.longPut.strike)    legIssues.push('back long put');
  // Verify calendar integrity: same strikes on front and back
  if(fe&&be&&fe.shortCall&&be.longCall&&fe.shortCall.strike!==be.longCall.strike)
    legIssues.push('call strike mismatch (front='+fe.shortCall.strike+' back='+be.longCall.strike+')');
  if(fe&&be&&fe.shortPut&&be.longPut&&fe.shortPut.strike!==be.longPut.strike)
    legIssues.push('put strike mismatch (front='+fe.shortPut.strike+' back='+be.longPut.strike+')');
  if(legIssues.length){
    if(res)res.innerHTML=pessRejectCard(ticker,'Incomplete Chain Data',
      'HARD REJECT: missing legs ['+legIssues.join(', ')+']. Cannot build complete strangle structure.');
    setAS('pess','warn',ticker+' scartato: incomplete_legs');
    logEv('pess','PESS '+ticker+' HARD REJECT (incomplete_legs): '+legIssues.join(', '),'warn');
    return;
  }

  // ── Step 2b: resolve streamer symbols → DXLink live data (fail-closed) ──
  if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
    '<div class="td2"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>'+
    ' Resolving streamer symbols + fetching live quotes per '+ticker+'...</div>';

  var _pessLiveStatus=document.createElement('div');
  _pessLiveStatus.style.cssText='font-size:8px;font-family:var(--M);color:#f97316;margin-top:4px';
  if(res)res.appendChild(_pessLiveStatus);

  var _pessSyms,_pessLiveLegs;
  try{
    _pessSyms=await pessGetStreamerSymbols(ticker,chain,ts);
  }catch(e){
    var _psc=e.message.split(':')[0].trim();
    if(res)res.innerHTML=pessRejectCard(ticker,_psc,e.message);
    appendAgentMsg('pess','**SCARTATO — '+_psc+'**\n\n'+e.message);
    setAS('pess','warn',ticker+' scartato: '+_psc.toLowerCase());
    logEv('pess','PESS '+ticker+' REJECT ('+_psc+'): '+e.message,'warn');
    return;
  }
  try{
    _pessLiveLegs=await pessRunDXLink(ticker,_pessSyms,_pessLiveStatus);
  }catch(e){
    var _psc=e.message.split(':')[0].trim();
    if(res)res.innerHTML=pessRejectCard(ticker,_psc,e.message);
    appendAgentMsg('pess','**SCARTATO — '+_psc+'**\n\n'+e.message);
    setAS('pess','warn',ticker+' scartato: '+_psc.toLowerCase());
    logEv('pess','PESS '+ticker+' REJECT ('+_psc+'): '+e.message,'warn');
    return;
  }

  // ── Step 3: build Claude context with LIVE chain data ────────────
  var earningsDate=ts.earningsDate||d.nextEarnings||null;
  var days=earningsDate?Math.round((new Date(earningsDate)-Date.now())/86400000):null;

  setAS('pess','busy','Analyzing '+ticker+' con Claude...');

  // legLiveStr: format a PESS leg using live DXLink fields (no BS fallback)
  function legLiveStr(leg,live){
    if(!leg)return 'N/A';
    var bid =live&&live.bidPrice!=null?live.bidPrice:(leg.bid||'N/A');
    var ask =live&&live.askPrice!=null?live.askPrice:(leg.ask||'N/A');
    var mark=live&&live.bidPrice!=null&&live.askPrice!=null?((live.bidPrice+live.askPrice)/2).toFixed(2):'N/A';
    var src =live&&live.source==='dxlink_realtime'?'[LIVE/DXLink]':'[CHAIN/TT]';
    return '$'+leg.strike+
      ' | bid $'+bid+' ask $'+ask+' mark $'+mark+' '+src+
      ' | \u0394 '+(live&&live.delta!=null?live.delta:'N/A')+' [LIVE/DXLink]'+
      ' | IV '+(live&&live.volatility!=null?live.volatility+'%':'N/A')+' [LIVE/DXLink]'+
      ' | \u03b8 '+(live&&live.theta!=null?live.theta+' $/day [LIVE]':'N/A')+
      ' | vega '+(live&&live.vega!=null?live.vega+' $/pt [LIVE]':'N/A')+
      ' | OI '+leg.oi;
  }

  var ctx=[
    '=== TICKER: '+ticker+' ('+d.name+') ===',
    'PREZZO: $'+d.price,
    'RSI: '+d.rsi,
    'SIGNAL: '+d.signal,
    'SCORE TECNICO: '+d.score+'/100',
    'BETA: '+(d.beta||'N/A'),
    '',
    '=== EARNINGS ===',
    'DATA EARNINGS: '+(earningsDate||'non nota'),
    'GIORNI AGLI EARNINGS: '+(days!=null?days:'N/A'),
    'METODO SELEZIONE EXPIRATION: '+ts.selectionMethod,
    '',
    '=== TERM STRUCTURE REALE (Tastytrade) ===',
    'FRONT EXPIRATION: '+ts.frontExpiration+' ('+ts.frontDTE+' DTE)',
    'FRONT IV: '+(ts.frontIV*100).toFixed(2)+'%',
    'BACK EXPIRATION:  '+ts.backExpiration+' ('+ts.backDTE+' DTE)',
    'BACK IV:  '+(ts.backIV*100).toFixed(2)+'%',
    'IV SPREAD (back-front): '+(ts.ivSpread*100).toFixed(2)+'%',
    'IV SPREAD PCT (relativo a frontIV): '+(ts.ivSpreadPct*100).toFixed(2)+'%',
    'termStructureDataComplete: true',
    'UNDERLYING IV: '+(ts.underlyingIV?(ts.underlyingIV*100).toFixed(1)+'%':'N/A'),
    'IVR: '+(ts.ivRank!=null?ts.ivRank.toFixed(1)+'%':'N/A'),
    'LIQUIDITA: '+(ts.liquidity||'N/A'),
    '',
    '=== PESS REGIME SCORING ===',
    (function(){
      var _ivr=ts.ivRank!=null?ts.ivRank:(d.ivRank!=null?d.ivRank:null);
      var _ir=pessIVRRegime(_ivr);
      return 'IVR_REGIME: '+_ir.label+' (adj '+(_ir.adj>0?'+':'')+_ir.adj+')'+
        ' | IVR='+(_ivr!=null?_ivr.toFixed(1):'N/A')+'%';
    })(),
    (function(){
      var _ie=pessIVEdge(ts.frontIV,ts.backIV);
      return 'IV_EDGE (back-front): '+(_ie.edgePct!=null?_ie.edgePct.toFixed(2)+'pp':' N/A')+
        ' | Quality: '+_ie.label+' (adj '+(_ie.adj>0?'+':'')+_ie.adj+')';
    })(),
    '',
    '=== CURVA IV COMPLETA ===',
  ];

  if(ts.termStructure&&ts.termStructure.length){
    ts.termStructure.forEach(function(e){
      var mark='';
      if(e.expirationDate===ts.frontExpiration) mark='  <- FRONT';
      else if(e.expirationDate===ts.backExpiration) mark='  <- BACK (include earnings)';
      ctx.push(e.expirationDate+' ('+e.dte+'dte): IV '+(e.iv*100).toFixed(2)+'%'+mark);
    });
  }

  // Live net debit from DXLink bid/ask (no backend estimate)
  var _lSCBid=_pessLiveLegs.frontShortCall.bidPrice;
  var _lSPBid=_pessLiveLegs.frontShortPut.bidPrice;
  var _lLCAsk=_pessLiveLegs.backLongCall.askPrice;
  var _lLPAsk=_pessLiveLegs.backLongPut.askPrice;
  var _lDebitCall=+(_lLCAsk-_lSCBid).toFixed(2);
  var _lDebitPut =+(_lLPAsk-_lSPBid).toFixed(2);
  var _lTotalDebit=+(_lDebitCall+_lDebitPut).toFixed(2);

  ctx=ctx.concat([
    '',
    '=== PRE-EARNINGS DOUBLE CALENDAR — LIVE DATA [TT chain structure + DXLink real-time] ===',
    'DATA SOURCE: TT chain (strikes/contracts/OI) + DXLink WebSocket (bid/ask/mark/\u0394/greeks/IV)',
    'ATM: $'+(chain.atmUsed||d.price)+' | IVR: '+(ts.ivRank!=null?ts.ivRank.toFixed(1)+'%':'N/A')+' | Days to earnings: '+(days!=null?days:'N/A'),
    '',
    'Strike selection (delta-targeted, TT chain):',
    '  Call target \u0394: '+(chain.callTargetDelta||'N/A')+' | strike: $'+chain.shortCallStrike+
      ' | OTM: '+((chain.shortCallStrike-(chain.atmUsed||d.price))/(chain.atmUsed||d.price)*100).toFixed(1)+'%',
    '  Put  target \u0394: '+(chain.putTargetDelta||'N/A')+' | strike: $'+chain.shortPutStrike+
      ' | OTM: '+((chain.atmUsed||d.price-chain.shortPutStrike)/(chain.atmUsed||d.price)*100).toFixed(1)+'%',
    '',
    '--- SELL at FRONT ('+ts.frontExpiration+', '+ts.frontDTE+' DTE) ---',
    '  SELL Call $'+chain.shortCallStrike+': '+legLiveStr(fe.shortCall,_pessLiveLegs.frontShortCall),
    '  SELL Put  $'+chain.shortPutStrike+':  '+legLiveStr(fe.shortPut, _pessLiveLegs.frontShortPut),
    '',
    '--- BUY at BACK ('+ts.backExpiration+', '+ts.backDTE+' DTE \u2014 SAME STRIKES) ---',
    '  BUY  Call $'+chain.shortCallStrike+': '+legLiveStr(be.longCall, _pessLiveLegs.backLongCall),
    '  BUY  Put  $'+chain.shortPutStrike+':  '+legLiveStr(be.longPut,  _pessLiveLegs.backLongPut),
    '',
    'LIVE NET DEBIT (DXLink bid/ask):',
    '  Call calendar: $'+_lDebitCall+' (back ask $'+_lLCAsk+' \u2212 front bid $'+_lSCBid+')',
    '  Put  calendar: $'+_lDebitPut+' (back ask $'+_lLPAsk+' \u2212 front bid $'+_lSPBid+')',
    '  TOTAL NET DEBIT: $'+_lTotalDebit+' [LIVE/DXLink]',
    '',
    '=== ISTRUZIONI ===',
    'TUTTI i dati sopra sono LIVE da DXLink (bid/ask/mark/greeks/IV). Nessun dato stimato.',
    'NON stimare greeks. NON usare [THEORETICAL]. NON usare Black-Scholes.',
    'Se bid=0 su un leg: dichiararlo come illiquido nella valutazione.',
    'Se il setup non soddisfa i criteri: emetti SCARTATO con motivazione specifica.',
    'NON richiedere dati aggiuntivi. Usa solo i dati forniti sopra.',
  ]);

  var ctxStr=ctx.join('\n');

  if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
    '<div class="td2"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>'+
    ' Analisi PESS per '+ticker+'...</div>';

  try{
    var analysis=await callAgent('pess',ctxStr);
    setAS('pess','ok','Analysis complete: '+ticker);

    // Parse compact ranking output
    var rankScore=0;
    var rsM=analysis.match(/RANK_SCORE:\s*(\d+)/);
    if(rsM)rankScore=parseInt(rsM[1]);

    var verdict='NEUTRO';
    var vM=analysis.match(/VERDICT:\s*(APPROVATO|NEUTRO|SCARTATO)/);
    if(vM)verdict=vM[1];
    else if(analysis.indexOf('APPROVATO')>=0)verdict='APPROVATO';
    else if(analysis.indexOf('SCARTATO')>=0)verdict='SCARTATO';

    var vColor=verdict==='APPROVATO'?'var(--gr)':verdict==='SCARTATO'?'var(--rd)':'var(--am)';

    // Extract key fields for display
    function parseField(text,field){
      var m=text.match(new RegExp(field+':\\s*(.+)'));
      return m?m[1].trim():'';
    }
    var spreadVsCost=parseField(analysis,'SPREAD_VS_COST');
    var timing=parseField(analysis,'TIMING');
    var deltaPos=parseField(analysis,'DELTA_POSITIONING');
    var liq=parseField(analysis,'LIQUIDITY');
    var tsReason=parseField(analysis,'TERM_STRUCTURE_REASON');
    var rischi=parseField(analysis,'RISCHI');

    var cardHtml='<div class="stbox" style="border-color:'+vColor+';margin-top:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<div style="font-family:var(--M);font-weight:700;color:#f97316;font-size:11px">PESS — '+ticker+'</div>'+
        '<div style="display:flex;align-items:center;gap:8px">'+
          '<span style="font-size:9px;font-family:var(--M);color:var(--tx3)">'+rankScore+'pt</span>'+
          '<span style="font-size:11px;font-weight:700;color:'+vColor+'">'+verdict+'</span>'+
        '</div>'+
      '</div>'+
      '<div style="display:grid;gap:4px;font-size:9px;font-family:var(--M);color:var(--tx2)">'+
        (tsReason?'<div><span style="color:var(--tx3)">SPREAD</span> '+tsReason+'</div>':'')+
        (spreadVsCost?'<div><span style="color:var(--tx3)">COST</span> '+spreadVsCost+'</div>':'')+
        (timing?'<div><span style="color:var(--tx3)">TIMING</span> '+timing+'</div>':'')+
        (deltaPos?'<div><span style="color:var(--tx3)">DELTA</span> '+deltaPos+'</div>':'')+
        (liq?'<div><span style="color:var(--tx3)">LIQUIDITY</span> '+liq+'</div>':'')+
        (rischi?'<div style="color:var(--am)"><span style="color:var(--tx3)">RISCHIO</span> '+rischi+'</div>':'')+
        '<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(255,255,255,.07);display:grid;gap:2px">'+
          '<div style="color:var(--tx3)">SELECTED OPTION IVs [LIVE]</div>'+
          '<div>Front call IV: '+(_pessLiveLegs.frontShortCall&&_pessLiveLegs.frontShortCall.volatility!=null?_pessLiveLegs.frontShortCall.volatility+'%':'N/A')+
            ' &nbsp;|&nbsp; Front put IV: '+(_pessLiveLegs.frontShortPut&&_pessLiveLegs.frontShortPut.volatility!=null?_pessLiveLegs.frontShortPut.volatility+'%':'N/A')+'</div>'+
          '<div>Back call IV: &nbsp;'+(_pessLiveLegs.backLongCall&&_pessLiveLegs.backLongCall.volatility!=null?_pessLiveLegs.backLongCall.volatility+'%':'N/A')+
            ' &nbsp;|&nbsp; Back put IV: &nbsp;'+(_pessLiveLegs.backLongPut&&_pessLiveLegs.backLongPut.volatility!=null?_pessLiveLegs.backLongPut.volatility+'%':'N/A')+'</div>'+
        '</div>'+
      '</div>'+
    '</div>';
    if(res)res.innerHTML=cardHtml;

    appendSysMsg('&#9670; PESS analysis for '+ticker+' ('+days+'gg to earnings):');
    appendAgentMsg('pess',analysis);
    logEv('pess','Analysis complete for '+ticker+': '+verdict,'ok');
  }catch(e){
    if(res)res.innerHTML='<div style="font-size:10px;color:var(--rd);padding:8px">Errore: '+e.message+'</div>';
    setAS('pess','err',e.message);
    logEv('pess','Error analyzing '+ticker+': '+e.message,'err');
  }
}
