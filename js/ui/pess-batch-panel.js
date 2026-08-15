// ─────────────────────────────────────────────────────────────────────────────
// PESS (Pre-Earnings Strangle Swap agent) — BATCH PANEL
//
// PR 3 of the approved 4-PR PESS extraction. The single declaration below was
// relocated BYTE-FOR-BYTE out of the inline monolith in index.html. Name,
// signature, body, `async function` binding form and physical position relative
// to the rest of the family are unchanged; only its location changed. No
// behaviour changed, and no defect was fixed here.
//
// WHY THIS FILE IS NOT CALLED pess-analysis-service.js
//   The post-SFS audit's option E named this layer ANALYSIS_SERVICE and planned
//   it as js/services/pess-analysis-service.js. A source audit run before this
//   relocation REJECTED that ownership label, and the plan was corrected rather
//   than forced. `pessAnalyzeAll` is not a service: it takes zero parameters,
//   acquires its own panel DOM by hardcoded id, holds those elements for the
//   whole batch, builds the ranking markup and renders the result cards. 4,726
//   of its 16,111 chars — 29.3% — are panel rendering.
//
//   The audit that produced option E had in fact already measured this: it
//   records that `pessAnalyzeTicker` and `pessAnalyzeAll` are "both analysis-
//   and-render monoliths; a service/UI cut cannot separate them without editing
//   bodies, which a byte-for-byte relocation must not do." Option E therefore
//   buys a SIZE split, which is real and worth having — the largest module stays
//   under the advisory ceiling — but it does not buy four service/UI ownership
//   layers. Naming this file a service would have asserted an ownership claim
//   the body contradicts. It is named for what it is.
//
//   The correct four-owner architecture, as the source reads:
//     CONFIG_RULES      rule / config owner
//     LIVE_TRANSPORT    transport owner
//     BATCH_PANEL       mixed batch-analysis + rendering UI orchestrator (here)
//     UI_PANEL          interactive / single-ticker PESS UI owner
//
// WHAT THIS FILE OWNS — measured, not assumed
//   `pessAnalyzeAll()` — the batch entry point, invoked from the inline
//   `onclick="pessAnalyzeAll()"` that runPESSPanel writes into its own markup.
//
//   DOM. Two direct lookups, both by hardcoded id: `#pessAnalyzeAll` (the button
//   runPESSPanel created) and `#pessResults` (the container runPESSPanel
//   created). Both are captured in closure variables `btn` and `res` and held
//   for the entire async batch, written from three nesting depths across six
//   sites: the button is disabled and relabelled on entry, restored on the
//   empty-candidate early return and restored again at the end; `#pessResults`
//   receives the opening progress line, a per-ticker progress line, and finally
//   the whole rendered ranking panel.
//
//   Rendering. The ranking panel markup is built here — the BEST FOR TODAY box,
//   the approved/neutral/rejected count line, and `renderCard` (2,304 chars),
//   which is called once per result and emits a `.stbox` card, with `pField`
//   parsing the agent's text into the fields that card displays.
//
//   Analysis. Candidate selection from `S.scanData`, the batch IVR gate, the
//   term-structure and chain fetches, live-data acquisition through the
//   transport module, Claude context assembly, verdict/score parsing and the
//   final ranking.
//
//   Endpoints. Exactly two, both reached through `ttCall` at call time:
//   `/pess/term-structure/{ticker}` (once, no query, inside an EMPTY catch) and
//   `/pess/chain/{ticker}` (once, six encodeURIComponent'd query parameters).
//   The identical `/pess/term-structure/` call inside pessAnalyzeTicker is NOT
//   owned here; that copy ships with PR 4.
//
//   Sequencing. Strictly sequential — a `for` loop that awaits each ticker in
//   turn, with a 700 ms delay between items and none after the last. There is no
//   Promise.all, allSettled, race or any; the effective concurrency cap is 1.
//   Candidates are filtered (earnings present, 7–45 days out), sorted by
//   distance from 20 days, and sliced to at most 8 — all before any await.
//   Results are ordered approved by score descending, then neutral by score
//   descending, then rejected in insertion order (never sorted).
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   • The rules. pessIVRRegime (called twice) and pessIVEdge (called once) are
//     owned by pess-config-rules.js and READ here at call time. pessRejectCard
//     and PESS_LIVE_MIN are NOT called from this file at all. Nothing is
//     redeclared, copied or inlined.
//   • The transport. pessGetStreamerSymbols and pessRunDXLink are owned by
//     pess-live-transport.js and each called once, in that order. Note that
//     pessRunDXLink is called with `null` for its `statusEl` parameter — this
//     file declines the caller-injected status sink and uses its own DOM.
//   • The interactive panel. runPESSPanel and pessAnalyzeTicker remain inline
//     and ship together in PR 4. There is NO call edge from pessAnalyzeAll to
//     either of them — the sole textual mention of pessAnalyzeTicker in this
//     file is a comment. That absence of a call edge is what makes separating
//     them cost nothing, and it is the one part of option E's premise the source
//     confirms unchanged.
//   • Shared state. Zero writes to S.* or to any binding declared elsewhere.
//     The only state access is a READ of `S.scanData`; the filter/sort/slice
//     chain sorts the new array filter() returned, never the source.
//
// LOAD ORDER
//   A classic, synchronous, src-only script that declares one async function and
//   executes NOTHING at load time. Despite being UI-owned, this module is
//   load-time inert: every DOM lookup, every request, every transport call and
//   every rule call happens only when pessAnalyzeAll() is CALLED. At evaluation
//   time it performs no request, no DOM access, no timer, no listener, no
//   storage access, no state mutation and no global assignment.
//
//   Every collaborator resolves at call time, never at evaluation time —
//   `ttCall` (js/api/backend-client.js), `callAgent`, `setAS`, `appendSysMsg`
//   and `logEv` (still inline), `pessIVRRegime` / `pessIVEdge`
//   (pess-config-rules.js), `pessGetStreamerSymbols` / `pessRunDXLink`
//   (pess-live-transport.js), `S` (still inline) and the ambient `document`,
//   `Date`, `setTimeout` and `console`. Nothing in the application references
//   `pessAnalyzeAll` at load time; the inline `onclick` resolves through the
//   global binding a classic script creates, at click time. The single
//   requirement is therefore that this tag precede the inline monolith, so the
//   global binding exists by the time a user can click.
//
//   It is loaded immediately after pess-live-transport.js, keeping the PESS
//   family contiguous in load order: config → transport → batch panel.
//
// DEFECTS FOUND HERE AND DELIBERATELY NOT FIXED
//   The ownership audit found four. A relocation PR must not repair them, and
//   naming them is what stops a later "tidy-up" doing it silently:
//     1. `runAll()` is called neither awaited nor caught. pessAnalyzeAll is
//        async, but its promise resolves BEFORE the batch runs, so completion is
//        untracked; anything thrown outside analyzeOne's try becomes an
//        unhandled rejection and leaves the button disabled forever.
//     2. The /pess/term-structure/ call sits in an EMPTY catch, so a transport
//        error and a rejected verdict both surface as 'fetch failed'.
//     3. The result shapes are asymmetric — only the success shape carries
//        ivSpreadPct, totalDebit, chain and ts.
//     4. rejectStage is derived from `e.message.split(':')[0]`, so reject
//        classification depends on error-message punctuation.
//   All four are pinned by tests/pess-extraction-boundary-contract.test.js.
// ─────────────────────────────────────────────────────────────────────────────

async function pessAnalyzeAll(){
  var btn=document.getElementById('pessAnalyzeAll');
  if(btn){btn.disabled=true;btn.textContent='Analisi in corso...';}

  var candidates=S.scanData.filter(function(d){
    if(!d.nextEarnings)return false;
    var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
    return days>=7&&days<=45;
  }).sort(function(a,b){
    var da=Math.round((new Date(a.nextEarnings)-Date.now())/86400000);
    var db=Math.round((new Date(b.nextEarnings)-Date.now())/86400000);
    return Math.abs(da-20)-Math.abs(db-20);
  }).slice(0,8);

  if(!candidates.length){
    if(btn){btn.disabled=false;btn.textContent='&#9670; ANALIZZA TUTTI';}
    return;
  }

  var res=document.getElementById('pessResults');
  if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
    'Analisi batch PESS — 0/'+candidates.length+' in corso...</div>';

  // Collect all results then rank
  // pessAnalyzeTicker writes to #pessResults directly — we intercept by passing a collector
  var allResults=[];  // { ticker, verdict, score, analysis, days, ivr }

  async function analyzeOne(d){
    var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
    var ivr=d.ivRank!=null?d.ivRank:null;

    // ── Gate 0 (batch): IVR hard reject (> 70) ──────────────────
    var _batchIVRGate=pessIVRRegime(ivr);
    if(_batchIVRGate.hardReject){
      allResults.push({ticker:d.ticker,verdict:'SCARTATO',score:0,
        analysis:'SCARTATO — IVR_HARD_REJECT: '+_batchIVRGate.hardReject,
        days:days,ivr:ivr,rejectStage:'ivr_hard_reject'});
      return;
    }

    // Update progress
    if(res){
      var done=allResults.length;
      res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
        'Analisi batch: '+(done+1)+'/'+candidates.length+' — '+d.ticker+'...</div>';
    }

    // Run full pipeline: term-structure → chain → Claude
    // But capture result instead of rendering immediately
    try{
      // Fetch term structure
      var ts=null;
      try{ts=await ttCall('/pess/term-structure/'+d.ticker);}catch(e){}

      if(!ts||ts.termStructureDataComplete===false||ts.isTradable===false||ts.termStructureVerdict!=='to_evaluate'){
        var reason=ts?ts.rejectReason||ts.termStructureVerdict:'fetch failed';
        allResults.push({ticker:d.ticker,verdict:'SCARTATO',score:0,analysis:'SCARTATO — '+reason,days:days,ivr:ivr,rejectStage:'term_structure'});
        return;
      }

      var earningsDate=ts.earningsDate||d.nextEarnings||null;
      var daysCalc=earningsDate?Math.round((new Date(earningsDate)-Date.now())/86400000):days;

      // Fetch chain
      var _aoMiss=[];
      if(daysCalc==null||isNaN(daysCalc))_aoMiss.push('days');
      if(!ts.underlyingIV)_aoMiss.push('iv');
      if(_aoMiss.length)console.warn('[PESS] '+d.ticker+': /pess/chain skipped — missing params: '+_aoMiss.join(', '));
      var chain=null,_bChainFetchErr=null;
      if(!_aoMiss.length){
        try{
          chain=await ttCall('/pess/chain/'+d.ticker+
            '?frontExp='+encodeURIComponent(ts.frontExpiration)+
            '&backExp='+encodeURIComponent(ts.backExpiration)+
            '&price='+encodeURIComponent(d.price||0)+
            '&ivr='+encodeURIComponent(ts.ivRank!=null?ts.ivRank:'')+
            '&days='+encodeURIComponent(daysCalc)+
            '&iv='+encodeURIComponent(ts.underlyingIV));
        }catch(e){
          _bChainFetchErr=e.message;
          console.warn('[PESS] /pess/chain HTTP error for '+d.ticker+':', e.message);
        }
      }

      if(!chain||!chain.chainComplete){
        var _bcec,_bced;
        if(!chain){
          _bcec='CHAIN_FETCH_FAILED';
          _bced=_bChainFetchErr
            ?'Backend error for '+d.ticker+': '+_bChainFetchErr+' (front='+ts.frontExpiration+' back='+ts.backExpiration+')'
            :'Network error for '+d.ticker+' (front='+ts.frontExpiration+' back='+ts.backExpiration+')';
        }else if(chain.rejectCode){
          _bcec=chain.rejectCode;
          _bced=(chain.error||chain.reason||'Backend rejected')+' (front='+ts.frontExpiration+' back='+ts.backExpiration+')';
          console.warn('[PESS] /pess/chain rejectCode for '+d.ticker+':', chain.rejectCode, chain.error||'');
        }else if(chain.missing&&chain.missing.length){
          _bcec=chain.missing.length>=2?'CHAIN_EXPIRATION_MISMATCH':'CHAIN_PARTIAL_MISS';
          _bced='front='+ts.frontExpiration+' back='+ts.backExpiration+
            ' | missing: ['+chain.missing.join(', ')+']'+
            (chain.availableExpirations?' | has: '+chain.availableExpirations.slice(0,6).join(', '):'');
        }else{
          _bcec='CHAIN_MAPPING_FAILED';
          _bced='chainComplete=false, no missing array (front='+ts.frontExpiration+' back='+ts.backExpiration+')';
        }
        allResults.push({ticker:d.ticker,verdict:'SCARTATO',score:0,
          analysis:'SCARTATO — '+_bcec+': '+_bced,days:daysCalc,ivr:ivr,rejectStage:_bcec.toLowerCase()});
        return;
      }

      // ── Step 2b (batch): streamer symbols → DXLink live data ────
      var _bSyms=null,_bLive=null,_bLiveErr=null;
      try{
        _bSyms=await pessGetStreamerSymbols(d.ticker,chain,ts);
        _bLive=await pessRunDXLink(d.ticker,_bSyms,null);
      }catch(e){
        _bLiveErr=e.message.split(':')[0].trim();
        allResults.push({ticker:d.ticker,verdict:'SCARTATO',score:0,
          analysis:'SCARTATO — '+_bLiveErr+': '+e.message,days:daysCalc,ivr:ivr,rejectStage:_bLiveErr.toLowerCase()});
        return;
      }

      // Build Claude context — live data only, no BS-estimated greeks
      var fe=chain.frontExp,be=chain.backExp;
      function legStr2(leg,live){
        if(!leg)return 'N/A';
        var bid =live&&live.bidPrice!=null?live.bidPrice:(leg.bid||'N/A');
        var ask =live&&live.askPrice!=null?live.askPrice:(leg.ask||'N/A');
        var mark=live&&live.bidPrice!=null&&live.askPrice!=null?((live.bidPrice+live.askPrice)/2).toFixed(2):'N/A';
        return '$'+leg.strike+
          ' bid $'+bid+' ask $'+ask+' mark $'+mark+' [LIVE/DXLink]'+
          ' | \u0394 '+(live&&live.delta!=null?live.delta:'N/A')+' [LIVE]'+
          ' | IV '+(live&&live.volatility!=null?live.volatility+'%':'N/A')+' [LIVE]'+
          ' | \u03b8 '+(live&&live.theta!=null?live.theta:'N/A')+
          ' | OI '+leg.oi;
      }
      var _bSCBid=_bLive.frontShortCall.bidPrice,_bSPBid=_bLive.frontShortPut.bidPrice;
      var _bLCAsk=_bLive.backLongCall.askPrice, _bLPAsk=_bLive.backLongPut.askPrice;
      var _bTotDebit=+((_bLCAsk-_bSCBid)+(_bLPAsk-_bSPBid)).toFixed(2);

      var ctx=[
        '=== TICKER: '+d.ticker+' ('+d.name+') ===',
        'PREZZO: $'+d.price+' | RSI: '+d.rsi+' | SIGNAL: '+d.signal+' | BETA: '+(d.beta||'N/A'),
        '',
        '=== EARNINGS ===',
        'DATA: '+earningsDate+' | GIORNI: '+(daysCalc!=null?daysCalc:'N/A')+' | Method: '+ts.selectionMethod,
        '',
        '=== TERM STRUCTURE (Tastytrade) ===',
        'FRONT: '+ts.frontExpiration+' ('+ts.frontDTE+' DTE) IV '+(ts.frontIV*100).toFixed(2)+'%',
        'BACK:  '+ts.backExpiration+' ('+ts.backDTE+' DTE) IV '+(ts.backIV*100).toFixed(2)+'%',
        'IV SPREAD: '+(ts.ivSpread*100).toFixed(2)+'% abs | '+(ts.ivSpreadPct*100).toFixed(2)+'% rel',
        'IVR: '+(ts.ivRank!=null?ts.ivRank.toFixed(1)+'%':'N/A'),
        '',
        '=== PESS REGIME SCORING ===',
        (function(){var _ri=pessIVRRegime(ts.ivRank!=null?ts.ivRank:ivr);
          return 'IVR_REGIME: '+_ri.label+' (adj '+(_ri.adj>0?'+':'')+_ri.adj+')'+
            ' | IVR='+((ts.ivRank!=null?ts.ivRank:ivr)!=null?(ts.ivRank!=null?ts.ivRank:ivr).toFixed(1):'N/A')+'%';}
        )(),
        (function(){var _ei=pessIVEdge(ts.frontIV,ts.backIV);
          return 'IV_EDGE (back-front): '+(_ei.edgePct!=null?_ei.edgePct.toFixed(2)+'pp':'N/A')+
            ' | Quality: '+_ei.label+' (adj '+(_ei.adj>0?'+':'')+_ei.adj+')';}
        )(),
        '',
        '=== DOUBLE CALENDAR — LIVE DATA [TT chain structure + DXLink real-time] ===',
        'DATA SOURCE: TT chain (strikes/OI) + DXLink WebSocket (bid/ask/mark/\u0394/greeks/IV)',
        'ATM: $'+(chain.atmUsed||d.price)+' | Call target \u0394: '+(chain.callTargetDelta||'N/A')+' | Put target \u0394: '+(chain.putTargetDelta||'N/A'),
        'Strikes: call $'+chain.shortCallStrike+' put $'+chain.shortPutStrike+' (SAME on back)',
        '',
        '--- SELL FRONT ('+ts.frontExpiration+', '+ts.frontDTE+' DTE) ---',
        '  SELL Call $'+chain.shortCallStrike+': '+legStr2(fe.shortCall,_bLive.frontShortCall),
        '  SELL Put  $'+chain.shortPutStrike+':  '+legStr2(fe.shortPut, _bLive.frontShortPut),
        '',
        '--- BUY BACK ('+ts.backExpiration+', '+ts.backDTE+' DTE \u2014 SAME STRIKES) ---',
        '  BUY  Call $'+chain.shortCallStrike+': '+legStr2(be.longCall, _bLive.backLongCall),
        '  BUY  Put  $'+chain.shortPutStrike+':  '+legStr2(be.longPut,  _bLive.backLongPut),
        '',
        'LIVE NET DEBIT: $'+_bTotDebit+' [DXLink bid/ask]',
        '',
        '=== TECHNICAL CONTEXT ===',
        'SQUEEZE: '+d.squeeze+' | MA200: '+d.ma200dist+' | MACD: '+d.macd,
        '',
        '=== INSTRUCTIONS FOR BATCH RANKING ===',
        'This is one of multiple PESS candidates being evaluated in batch.',
        'Output your assessment using the MANDATORY STRUCTURED OUTPUT format.',
        'Include RANK_SCORE (0-100) for cross-ticker ranking.',
        'All greeks/bid/ask above are LIVE from DXLink. Do not estimate or use theoretical values.',
      ].join('\n');

      var analysis=await callAgent('pess',ctx);

      // Parse verdict and score
      var verdict='NEUTRO';
      if(analysis.indexOf('APPROVATO')>=0)verdict='APPROVATO';
      else if(analysis.indexOf('SCARTATO')>=0)verdict='SCARTATO';

      // Parse RANK_SCORE if present
      var rankScore=0;
      var rsMatch=analysis.match(/RANK_SCORE:\s*(\d+)/);
      if(rsMatch)rankScore=parseInt(rsMatch[1]);
      else{
        // Fallback: use SCORE field
        var sMatch=analysis.match(/\*\*SCORE\*\*:\s*(\d+)/);
        if(sMatch)rankScore=parseInt(sMatch[1]);
      }

      allResults.push({
        ticker:d.ticker,verdict,score:rankScore,analysis,
        days:daysCalc,ivr:ivr,
        ivSpreadPct:ts.ivSpreadPct,
        totalDebit:_bTotDebit,   // live DXLink debit, not backend estimate
        chain,ts,
        rejectStage:null,
      });

    }catch(e){
      allResults.push({ticker:d.ticker,verdict:'ERROR',score:0,
        analysis:'Errore: '+e.message,days:days,ivr:ivr,rejectStage:'exception'});
    }
  }

  // Run sequentially (API rate limit)
  async function runAll(){
    for(var i=0;i<candidates.length;i++){
      await analyzeOne(candidates[i]);
      if(i<candidates.length-1)await new Promise(function(r){setTimeout(r,700);});
    }

    // Sort: APPROVATO first by score desc, then NEUTRO by score, then SCARTATO
    var approved=allResults.filter(function(r){return r.verdict==='APPROVATO';})
                           .sort(function(a,b){return b.score-a.score;});
    var neutro  =allResults.filter(function(r){return r.verdict==='NEUTRO';})
                           .sort(function(a,b){return b.score-a.score;});
    var rejected=allResults.filter(function(r){return r.verdict==='SCARTATO'||r.verdict==='ERROR';});

    // Render ranking
    var out='<div class="ptitle" style="color:#f97316;margin-top:8px">PESS BATCH — '+allResults.length+' TICKER</div>';

    // Section 10: BEST FOR TODAY (top 3 approved)
    var best=approved.slice(0,3);
    if(best.length){
      out+='<div style="background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.3);'+
        'border-radius:8px;padding:10px;margin:8px 0">';
      out+='<div style="font-size:10px;font-family:var(--M);font-weight:700;color:#f97316;margin-bottom:6px">'+
        '&#9670; BEST FOR TODAY</div>';
      best.forEach(function(r,i){
        out+='<div style="display:flex;justify-content:space-between;align-items:center;'+
          'padding:4px 0;border-bottom:1px solid rgba(249,115,22,.15)">';
        out+='<span style="font-size:11px;font-weight:700">#'+(i+1)+' '+r.ticker+'</span>';
        out+='<span style="font-size:9px;font-family:var(--M);color:var(--gr)">APPROVATO '+r.score+'pt</span>';
        out+='</div>';
        out+='<div style="font-size:8px;font-family:var(--M);color:var(--tx2);padding:2px 0">'+
          (r.days!=null?r.days+'gg':'?gg')+' | IVR '+(r.ivr!=null?r.ivr.toFixed(0):'?')+'% | '+
          'IV spread '+(r.ivSpreadPct?(r.ivSpreadPct*100).toFixed(1)+'%':'?')+
          ' | debit $'+(r.totalDebit||'?')+
        '</div>';
      });
      out+='</div>';
    }

    // ALL VALID — sorted best→worst, full detail
    out+='<div style="font-size:9px;font-family:var(--M);color:var(--tx3);margin:8px 0 4px">'+
      '&#9670; APPROVATI ('+approved.length+') &nbsp;&#9670; NEUTRI ('+neutro.length+') '+
      '&nbsp;&#9674; SCARTATI ('+rejected.length+')</div>';

    function pField(text,field){
      var m=text.match(new RegExp(field+':\\s*(.+)'));
      return m?m[1].trim():'';
    }
    function renderCard(r,idx){
      var vc=r.verdict==='APPROVATO'?'var(--gr)':r.verdict==='SCARTATO'?'var(--rd)':
             r.verdict==='ERROR'?'var(--tx3)':'var(--am)';
      var tsR=pField(r.analysis,'TERM_STRUCTURE_REASON');
      var svc=pField(r.analysis,'SPREAD_VS_COST');
      var tim=pField(r.analysis,'TIMING');
      var dpp=pField(r.analysis,'DELTA_POSITIONING');
      var liq=pField(r.analysis,'LIQUIDITY');
      var rsk=pField(r.analysis,'RISCHI');
      return '<div class="stbox" style="border-color:'+vc+';margin-bottom:6px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
          '<div style="display:flex;align-items:center;gap:6px">'+
            (idx<3&&r.verdict==='APPROVATO'?'<span style="font-size:7px;font-family:var(--M);background:#f97316;color:#fff;padding:1px 5px;border-radius:8px">BEST '+(idx+1)+'</span>':'')+
            '<strong style="font-size:11px">'+r.ticker+'</strong>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:8px">'+
            '<span style="font-size:9px;font-family:var(--M);color:var(--tx3)">'+r.score+'pt</span>'+
            '<span style="font-size:10px;font-weight:700;color:'+vc+'">'+r.verdict+'</span>'+
          '</div>'+
        '</div>'+
        '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-bottom:5px">'+
          (r.days!=null?r.days+'gg':'')+
          (r.ivr!=null?' | IVR '+r.ivr.toFixed(0)+'%':'')+
          (r.totalDebit?' | debit $'+r.totalDebit:'')+
          (r.rejectStage?' | rejected: '+r.rejectStage:'')+
        '</div>'+
        '<div style="display:grid;gap:3px;font-size:9px;font-family:var(--M);color:var(--tx2)">'+
          (tsR?'<div><span style="color:var(--tx3)">SPREAD</span> '+tsR+'</div>':'')+
          (svc?'<div><span style="color:var(--tx3)">COST</span> '+svc+'</div>':'')+
          (tim?'<div><span style="color:var(--tx3)">TIMING</span> '+tim+'</div>':'')+
          (dpp?'<div><span style="color:var(--tx3)">DELTA</span> '+dpp+'</div>':'')+
          (liq?'<div><span style="color:var(--tx3)">LIQUIDITY</span> '+liq+'</div>':'')+
          (rsk?'<div style="color:var(--am)"><span style="color:var(--tx3)">RISCHIO</span> '+rsk+'</div>':'')+
        '</div>'+
      '</div>';
    }

    approved.forEach(function(r,i){out+=renderCard(r,i);});
    neutro.forEach(function(r){out+=renderCard(r,99);});
    rejected.forEach(function(r){out+=renderCard(r,99);});

    if(res)res.innerHTML=out;
    setAS('pess','ok',approved.length+' APPROVATI / '+neutro.length+' NEUTRI / '+rejected.length+' SCARTATI');
    if(btn){btn.disabled=false;btn.textContent='&#9670; ANALIZZA TUTTI ('+candidates.length+')';}

    appendSysMsg('&#9670; PESS Batch — '+approved.length+' approvati, '+neutro.length+' neutri, '+rejected.length+' scartati');
    logEv('pess','Batch PESS completato: best='+approved.slice(0,3).map(function(r){return r.ticker;}).join(','),'ok');
  }

  runAll();
}
