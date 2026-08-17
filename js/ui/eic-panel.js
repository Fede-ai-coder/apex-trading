// ─────────────────────────────────────────────────────────────────────────────
// EIC (Earnings Iron Condor agent) — PANEL
//
// PR 2 of the approved 4-PR EIC extraction, chosen by the post-PESS monolith
// audit (PR #374 — evidence-only, closed unmerged as a historical artifact, so
// it is cited by PR number rather than by a path; option E: screening rules ·
// panel · ticker analysis · live deep dive). PR 1 shipped
// js/services/eic-screening-rules.js. The two declaration SITES below were
// relocated BYTE-FOR-BYTE out of the inline monolith in index.html. Names,
// signatures, bodies, binding forms, sync/async form and relative physical
// order are unchanged; only their location changed. No behaviour changed.
//
// WHAT THIS FILE OWNS
//   The EIC panel — the rendering half of the agent:
//     • runEICPanel   — renders the whole EIC view: reads the scan rows from
//                       S.*, screens them, and paints the panel. Impure BY
//                       DESIGN — it touches the DOM, reads and writes S.*,
//                       sets timers and registers a listener.
//     • eicAnalyzeAll — async; drives the "analyse all" action, appends system
//                       messages and hands work to the agent layer.
//
//   Unlike PR 1, this module is NOT pure and no purity claim is made about it.
//   A panel that rendered nothing would not be a panel. What IS pinned is that
//   it performs no network call of its own (no fetch, no ttCall, no WebSocket)
//   and never assigns to `window`.
//
// THESE TWO MUST STAY GLOBAL FUNCTION DECLARATIONS
//   Both are reached from generated markup — `onclick="runEICPanel()"` and
//   `onclick="eicAnalyzeAll()"` are built as strings inside the monolith and
//   injected into the DOM, so the browser resolves the names off the global
//   scope when the user clicks. A classic <script src> keeps them global. An
//   ES module, a bundler wrapper or an IIFE would bind them locally and every
//   one of those buttons would fail SILENTLY at click time, long after load.
//   That is why this file is a classic script and why its tag carries no
//   type="module", no defer and no async.
//
// A DEFECT IS CARRIED ACROSS UNREPAIRED, DELIBERATELY
//   runEICPanel calls `eicEnrichLegs(...)` inside a setTimeout guarded by
//   `if(S.ttConnected && passed.length)`. That function does not exist anywhere
//   in the application — the call site below is its ONLY occurrence — so that
//   path throws a ReferenceError today, before this PR and after it.
//
//   It is relocated broken rather than quietly fixed. This is a RELOCATION, not
//   an edit: repairing it here would change behaviour inside a PR whose whole
//   claim is that behaviour is unchanged, and would hide the repair in a diff
//   nobody reviews for logic. It is recorded so it can be fixed on purpose, in
//   its own change.
//
// The relocation is proved byte-for-byte, and reversibility is proved by
// reconstruction, in tests/eic-extraction-boundary-contract.test.js.
// ─────────────────────────────────────────────────────────────────────────────

// S.eicShowAll: toggle to show all candidates including hard-rejected
function runEICPanel(){
  if(typeof S.eicShowAll==='undefined')S.eicShowAll=false;
  setAS('earnings-ic','busy','Screening candidati...');

  // ── Diagnostic: no scan data at all ────────────────────────────
  if(!S.scanData.length){
    setPanel('EARNINGS IRON CONDOR',
      '<div class="ptitle">NESSUN DATO</div>'+
      '<div class="dc"><div style="font-size:11px;color:var(--tx2);line-height:1.7">'+
      'Scanner vuoto. Esegui prima uno scan.</div></div>'+
      '<button onclick="runScan()" class="runbtn" style="width:100%;margin-top:8px;font-size:9px;padding:8px">&#9654; RUN SCAN</button>'
    );
    setAS('earnings-ic','warn','Scan non eseguito');
    return;
  }

  // ── Base filter: earnings 2-21 days ────────────────────────────
  // IVR >= 25 is preferred but NOT mandatory — without TT the data may not be ready.
  // Show all earnings candidates regardless of IVR availability.
  // Tickers without IVR get a warning badge but are still shown.
  var raw=S.scanData.filter(function(d){
    if(!d.nextEarnings)return false;
    var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
    return days>=2&&days<=21;
  });

  // Separate tiers: has TT IVR ≥ 25 vs no TT IVR (hvRank never used as proxy)
  var rawWithIVR=raw.filter(function(d){
    return d.ivRank!=null&&d.ivRank>=25;
  });
  var rawNoIVR=raw.filter(function(d){
    return !(d.ivRank!=null&&d.ivRank>=25);
  });

  if(!raw.length){
    // No earnings at all — check if scan was run
    var noEarningMsg=S.scanData.length?
      'Nessun ticker con earnings nei prossimi 2-21 giorni. I dati earnings vengono caricati ~3.5s dopo il scan.':
      'Scanner vuoto — esegui prima uno scan.';
    setPanel('EARNINGS IRON CONDOR',
      '<div class="ptitle">NESSUN CANDIDATO EIC</div>'+
      '<div class="dc"><div style="font-size:11px;color:var(--tx2);line-height:1.7">'+noEarningMsg+'</div></div>'+
      '<button onclick="runScan()" class="runbtn" style="width:100%;margin-top:8px;font-size:9px;padding:8px">&#9654; RUN SCAN</button>'+
      (S.scanData.length?'<button onclick="runEICPanel()" class="runbtn" style="width:100%;margin-top:4px;font-size:9px;padding:8px;background:rgba(6,182,212,.15)">&#8635; RICARICA (earnings potrebbero non essere pronti)</button>':'')
    );
    setAS('earnings-ic','warn','0 candidati (no earnings data)');
    return;
  }

  // Use all raw (with and without IVR) — use rawWithIVR for primary sort
  // Tickers without IVR are shown but with a "IVR N/A" warning

  // ── Screen all tickers ─────────────────────────────────────────
  // Sort: tickers with IVR >= 25 first, then no-IVR tickers
  var sortedRaw = rawWithIVR.concat(rawNoIVR);
  var screened=sortedRaw.map(eicScreenTicker);
  var passed=screened.filter(function(s){return !s.hardReject;})
    .sort(function(a,b){return b.screenScore-a.screenScore;});
  var rejected=screened.filter(function(s){return s.hardReject;})
    .sort(function(a,b){return b.ivr-a.ivr;});

  // ── toShow: default = passed first + rejected dimmed ───────────
  // If S.eicShowAll=true → all screened sorted by score
  // If S.eicShowAll=false → passed (score desc) + rejected (dimmed) appended
  var toShow;
  if(S.eicShowAll){
    toShow=screened.slice().sort(function(a,b){return b.screenScore-a.screenScore;});
  } else {
    // Always show passed, then append rejected dimmed so list is never empty
    toShow=passed.concat(rejected);
  }

  // ── Macro warning ───────────────────────────────────────────────
  // Macro warning with timestamp + stale detection
  var macroWarning='';
  if(S.marketContextRisk&&S.marketContextRisk!=='NONE'){
    var mcxAge=S.marketContextTimestamp?Math.round((Date.now()-S.marketContextTimestamp)/60000):null;
    var mcxValid=S.marketContextValidMinutes||240;
    var mcxStale=mcxAge!==null&&mcxAge>mcxValid;
    var wColor=S.marketContextRisk==='CRITICAL'?'var(--rd)':S.marketContextRisk==='HIGH'?'var(--am)':'rgba(6,182,212,.8)';
    var staleNote=mcxStale?'<span style="color:var(--rd)"> ⚠ STALE ('+mcxAge+'min — aggiorna MCX)</span>':'';
    var ageNote=mcxAge!==null?' · '+mcxAge+'min fa':'';
    macroWarning='<div class="dc" style="border-color:'+wColor+';margin-bottom:6px">'+
      '<div style="font-size:9px;font-family:var(--M);color:'+wColor+'">'+
        '&#9650; BINARY EVENT RISK: '+S.marketContextRisk+ageNote+staleNote+
      '</div></div>';
  }

  // ── Toggle + summary bar ────────────────────────────────────────
  var passedLabel=passed.length
    ?'<span style="color:var(--gr)">'+passed.length+' ok</span>'
    :'<span style="color:var(--am)">0 passano screening</span>';
  var toggleBtn='<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">'+
    '<div style="font-size:9px;font-family:var(--M);color:var(--tx2);flex:1">'+
      passedLabel+
      (rejected.length?' &middot; <span style="color:var(--tx3)">'+rejected.length+' esclusi</span>':'')+
      ' &middot; '+screened.length+' totali'+
    '</div>'+
    '<button onclick="S.eicShowAll=!S.eicShowAll;runEICPanel()" style="font-size:8px;font-family:var(--M);'+
      'background:rgba(6,182,212,.12);color:#06b6d4;border:1px solid #06b6d4;border-radius:10px;'+
      'padding:3px 8px;cursor:pointer;white-space:nowrap">'+
      (S.eicShowAll?'&#9660; Solo filtrati':'&#9661; Mostra tutti')+
    '</button>'+
  '</div>';

  // ── Separator between passed/rejected when not showing all ──────
  var listHtml='<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">';
  var shownRejectedHeader=false;

  toShow.forEach(function(s){
    var isRejected=!!s.hardReject;

    // Insert separator before first rejected card (only in default view)
    if(!S.eicShowAll&&isRejected&&!shownRejectedHeader){
      shownRejectedHeader=true;
      if(passed.length){ // only show separator if there were passed items above
        listHtml+='<div style="font-size:8px;font-family:var(--M);color:var(--tx3);'+
          'padding:4px 0 2px;border-top:1px solid var(--b0);margin-top:4px">'+
          '&#9660; ESCLUSI DALLO SCREENING ('+rejected.length+')</div>';
      }
    }

    var liqColor=s.liqLabel==='good'?'var(--gr)':s.liqLabel==='acceptable'?'var(--am)':'var(--rd)';
    var premColor=s.premiumLabel==='good'?'var(--gr)':s.premiumLabel==='acceptable'?'var(--am)':'var(--tx3)';
    var ivrColor=s.ivr>=50?'var(--gr)':s.ivr>=35?'var(--am)':'var(--tx2)';
    var scoreColor=s.screenScore>=65?'var(--gr)':s.screenScore>=40?'var(--am)':'var(--tx3)';

    listHtml+='<div class="ai eic-cand" data-ticker="'+s.ticker+'" style="cursor:pointer;'+
      (isRejected?'opacity:0.45;border-color:rgba(255,77,106,.3)!important;':'')+
      (!isRejected&&s.liqLabel==='weak'?'border-left:2px solid var(--am);':'')+'">'+

      // Row 1: ticker + score
      '<div style="display:flex;justify-content:space-between;align-items:center;width:100%">'+
        '<div style="display:flex;align-items:center;gap:6px">'+
          '<span style="font-size:11px;font-weight:700">'+s.ticker+'</span>'+
          (isRejected?'<span style="font-size:7px;font-family:var(--M);color:var(--rd);background:rgba(255,60,60,.1);padding:1px 5px;border-radius:8px">ESCLUSO</span>':'')+
        '</div>'+
        '<span style="font-size:10px;font-family:var(--M);font-weight:700;color:'+scoreColor+'">'+s.screenScore+'</span>'+
      '</div>'+

      // Row 2: name + earnings
      '<div style="font-size:9px;color:var(--tx2);margin-top:1px">'+
        s.name+' &middot; '+s.nextEarnings+' ('+s.days+'gg) &middot; $'+s.price+
      '</div>'+

      // Row 3: IVR + EM + ratio
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:3px">'+
        (s.ivr>0?'<span style="font-size:8px;font-family:var(--M);color:'+ivrColor+'">'+
          (s.ivr===s.ivr&&S.scanData.find(function(x){return x.ticker===s.ticker;})?.ivRank!=null?'IVR':'HVR')+' '+s.ivr.toFixed(0)+'%</span>':
          '<span style="font-size:8px;font-family:var(--M);color:var(--tx3)">IVR N/A — enrich TT</span>')+
        (s.emPct?'<span style="font-size:8px;font-family:var(--M);color:var(--tx2)">EM ±'+s.emPct+'%</span>':
                 '<span style="font-size:8px;font-family:var(--M);color:var(--tx3)">EM n/a</span>')+
        (s.shortDistPct?'<span style="font-size:8px;font-family:var(--M);color:var(--tx)">&#9670;'+s.emRatio+'&times; strike</span>':'')+
      '</div>'+

      // Row 4: LIQ + PREM badges + reject reason
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">'+
        '<span class="eic-liq-badge" style="font-size:7px;font-family:var(--M);padding:1px 5px;border-radius:8px;'+
          'background:rgba(6,182,212,.08);color:'+liqColor+'" title="Proxy stock-level — aggiornamento in corso">'+
          'LIQ: '+s.liqLabel.toUpperCase()+(S.ttConnected?' &#10227;':'')+
        '</span>'+
        (s.premiumLabel!=='unknown'?
          '<span class="eic-credit-badge" style="font-size:7px;font-family:var(--M);padding:1px 5px;border-radius:8px;'+
            'background:rgba(6,182,212,.08);color:'+premColor+'">PREM: '+s.premiumLabel.toUpperCase()+'</span>':'')+ 
        (s.hardReject?
          '<span style="font-size:7px;font-family:var(--M);color:var(--tx3)" title="'+s.hardReject+'">'+
            '&#9888; '+s.hardReject.substring(0,35)+(s.hardReject.length>35?'…':'')+
          '</span>':'')+
      '</div>'+
    '</div>';
  });
  listHtml+='</div>';

  // ── Analyze button (only if there are passed candidates) ────────
  var passedForBatch=passed.slice(0,6);
  var analyzeBtn=passed.length?
    '<button id="eicAnalyzeAll" onclick="eicAnalyzeAll()" style="width:100%;background:#06b6d4;color:#fff;border:none;'+
      'border-radius:7px;padding:9px;font-family:var(--M);font-size:10px;font-weight:700;cursor:pointer;margin-bottom:6px">'+
      '&#9670; ANALIZZA TOP '+passedForBatch.length+'</button>':
    '<div style="font-size:9px;font-family:var(--M);color:var(--tx3);text-align:center;padding:6px 0">'+
      'Nessun candidato supera lo screening — clicca su un ticker per analisi manuale</div>';

  // If scan was recent (<10s ago) and few earnings found, show auto-refresh hint
  var scanAge=S.lastScan?Math.round((Date.now()-S.lastScan)/1000):999;
  var earningsNotice='';
  if(scanAge<10&&raw.length<3){
    earningsNotice='<div style="font-size:8px;font-family:var(--M);color:var(--am);margin-bottom:6px;padding:4px 6px;'+
      'background:rgba(255,179,64,.08);border-radius:5px">'+
      '&#9650; Scan recente — dati earnings ancora in caricamento. '+
      '<span style="cursor:pointer;text-decoration:underline" onclick="runEICPanel()">Ricarica</span> tra qualche secondo.'+
    '</div>';
  }

  var panelHtml=
    '<div class="ptitle">EARNINGS IRON CONDOR ('+raw.length+')</div>'+
    earningsNotice+
    macroWarning+
    toggleBtn+
    listHtml+
    analyzeBtn+
    '<div id="eicResults"></div>';

  setPanel('EARNINGS IRON CONDOR',panelHtml);
  setAS('earnings-ic','ok',
    passed.length+' screening ok'+(rejected.length?' · '+rejected.length+' esclusi':''));

  // Click handlers
  setTimeout(function(){
    document.querySelectorAll('.eic-cand').forEach(function(el){
      el.addEventListener('click',function(){
        eicAnalyzeTicker(this.getAttribute('data-ticker'));
      });
    });
  },50);

  // Async enrichment with real option legs (non-blocking)
  if(S.ttConnected&&passed.length){
    setTimeout(function(){
      eicEnrichLegs(passed.map(function(s){return s.ticker;}));
    },200);
  }
}

async function eicAnalyzeAll(){
  var btn=document.getElementById('eicAnalyzeAll');
  if(btn){btn.disabled=true;btn.textContent='Analisi in corso...';}

  var candidates=S.scanData.filter(function(d){
    if(!d.nextEarnings)return false;
    var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
    var ivr=d.ivRank!=null?d.ivRank:null;
    return days>=2&&days<=21&&ivr!=null&&ivr>=25;
  }).sort(function(a,b){
    var ia=a.ivRank!=null?a.ivRank:0;
    var ib=b.ivRank!=null?b.ivRank:0;
    return ib-ia;
  }).slice(0,6);

  var res=document.getElementById('eicResults');
  var results=[];
  for(var i=0;i<candidates.length;i++){
    var d=candidates[i];
    if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
      'Analisi batch: '+(i+1)+'/'+candidates.length+' — '+d.ticker+'...</div>';
    try{
      var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
      var ivr=d.ivRank!=null?d.ivRank:null;
      var iv=d.iv||d.iv30||null;
      var ivSrcL=d.iv?'TT[REAL-TIME]':d.iv30?'TT[iv30]':'UNAVAILABLE';
      var ctx='TICKER: '+d.ticker+'\nPREZZO: $'+d.price+'\nEARNINGS: '+d.nextEarnings+'\nGIORNI: '+days+
        '\nIVR: '+(ivr!=null?ivr.toFixed(1)+'%':'N/A')+'\nIV: '+(iv?(iv*100).toFixed(1)+'%':'N/A')+
        '\nRSI: '+d.rsi+'\nBETA: '+(d.beta||'N/A')+
        '\nMACRO RISK: '+(S.marketContextRisk||'non valutato');
      var analysis=await callAgent('earnings-ic',ctx);
      var verdict=analysis.includes('APPROVATO')?'APPROVATO':analysis.includes('SCARTATO')?'SCARTATO':'NEUTRO';
      results.push({ticker:d.ticker,days:days,ivr:ivr,verdict:verdict,analysis:analysis,data:d});
    }catch(e){
      results.push({ticker:d.ticker,days:days||0,ivr:ivr||0,verdict:'ERROR',analysis:e.message,data:d});
    }
    await new Promise(function(r){setTimeout(r,400);});
  }

  var approved=results.filter(function(r){return r.verdict==='APPROVATO';});
  var neutro=results.filter(function(r){return r.verdict==='NEUTRO';});
  var scartati=results.filter(function(r){return r.verdict==='SCARTATO'||r.verdict==='ERROR';});

  var summary='<div class="ptitle" style="margin-top:10px;color:#06b6d4">RIEPILOGO EIC ('+results.length+')</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:8px;font-family:var(--M);font-size:10px">'+
    '<span style="color:var(--gr)">&#9670; APPROVATO: '+approved.length+'</span>'+
    '<span style="color:var(--am)">&#9670; NEUTRO: '+neutro.length+'</span>'+
    '<span style="color:var(--rd)">&#9670; SCARTATO: '+scartati.length+'</span></div>';

  results.forEach(function(r){
    var vc=r.verdict==='APPROVATO'?'var(--gr)':r.verdict==='SCARTATO'?'var(--rd)':'var(--am)';
    var formatted=r.analysis.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split('\n').join('<br>');
    summary+='<div class="stbox" style="border-color:'+vc+';margin-bottom:6px">'+
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
        '<strong style="font-size:11px">'+r.ticker+'</strong>'+
        '<span style="font-size:10px;font-weight:700;color:'+vc+'">'+r.verdict+'</span>'+
      '</div>'+
      '<div style="font-size:9px;color:var(--tx2);margin-bottom:4px">'+r.days+'gg &middot; IVR '+r.ivr.toFixed(0)+'%</div>'+
      '<div style="font-size:9px;font-family:var(--M);line-height:1.6">'+formatted+'</div>'+
    '</div>';
  });

  if(res)res.innerHTML=summary;
  setAS('earnings-ic','ok',approved.length+' APPROVATI / '+neutro.length+' NEUTRI / '+scartati.length+' SCARTATI');
  if(btn){btn.disabled=false;btn.textContent='&#9670; ANALIZZA TUTTI ('+candidates.length+')';}
  appendSysMsg('&#9670; EIC Batch — '+approved.length+' APPROVATI, '+neutro.length+' NEUTRI, '+scartati.length+' SCARTATI');
  logEv('earnings-ic','Batch complete: '+approved.length+' approvati','ok');
}
