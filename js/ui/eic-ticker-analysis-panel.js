// ─────────────────────────────────────────────────────────────────────────────
// EIC (Earnings Iron Condor agent) — TICKER ANALYSIS PANEL
//
// PR 3 of the approved 4-PR EIC extraction, chosen by the post-PESS monolith
// audit (PR #374 — evidence-only, closed unmerged as a historical artifact, so
// it is cited by PR number rather than by a path; option E: screening rules ·
// panel · ticker analysis · live deep dive). PR 1 shipped
// js/services/eic-screening-rules.js, PR 2 shipped js/ui/eic-panel.js. The ONE
// declaration site below was relocated BYTE-FOR-BYTE out of the inline monolith
// in index.html. Name, signature, body, binding form, async form and physical
// position relative to its siblings are unchanged; only its location changed.
// No behaviour changed and no defect was repaired.
//
// WHY THIS IS A PANEL AND NOT A SERVICE
//   eicAnalyzeTicker does single-ticker analysis AND renders its own UI, and the
//   two halves are interleaved rather than separable. A source audit of the real
//   body measured: 1 document.getElementById('eicResults'), 1
//   querySelector('.eic-dxlink-btn'), 3 innerHTML writes (loading state, result
//   card, error state), 1 addEventListener('click', …) and 5 distinct S.* fields
//   read. Naming this file a "service" would describe something it is not, so it
//   is named for what it owns: the TICKER ANALYSIS PANEL.
//
// IT IS IMPURE BY DESIGN, AND CLAIMS NOTHING ELSE
//   PR 1's module is pure and is proved so in a sandbox where every forbidden
//   global is a trap. That guard cannot be applied here and is not: this file
//   renders. What IS pinned is the narrower set of properties the relocation
//   preserves — no fetch, no ttCall, no WebSocket, no timers, no direct S.*
//   WRITE, no window assignment, and the DOM and listener ownership it already
//   had. Asserting purity here would assert something false.
//
//   One honest nuance the guard records rather than hides: the function performs
//   no `S.x = …` assignment, but it DOES mutate the scan row it looked up out of
//   S.scanData (`d.eicFinalDecision`, `d.eicSetupResult`,
//   `d.eicFinalDecisionTicker`). That is a write to shared state reached through
//   S, and it moved across unchanged like everything else.
//
// IT MUST STAY A CLASSIC-SCRIPT GLOBAL FUNCTION DECLARATION
//   js/ui/eic-panel.js loads BEFORE this file and calls eicAnalyzeTicker from a
//   click handler it registers on each EIC candidate card. That reference is
//   resolved off the GLOBAL scope when the user clicks — long after every script
//   has evaluated — which is why loading this module after the panel is safe and
//   why an ES module, a bundler wrapper or an IIFE would break it: the name
//   would bind locally and every candidate card would fail SILENTLY. A scan of
//   the 25 sources that execute after this tag finds ZERO load-time reads of the
//   name, so the tag placement is unconstrained in the other direction.
//
// IT CALLS FORWARD INTO CODE THAT IS STILL INLINE, ON PURPOSE
//   The DXLink button this panel renders calls eicRunDXLink, which belongs to
//   PR 4 (LIVE_DEEP_DIVE) and is still declared in the monolith — a script that
//   loads AFTER this one. That is not a problem to solve by moving PR 4 early:
//   the call sits inside a click handler, so the binding is resolved at CLICK
//   time, by which point the monolith has long since evaluated. The contract
//   proves that resolution in a real ordered-script harness rather than assuming
//   it.
// ─────────────────────────────────────────────────────────────────────────────

async function eicAnalyzeTicker(ticker){
  var d=S.scanData.find(function(x){return x.ticker===ticker;});
  if(!d){showToast('Ticker '+ticker+' non trovato','warn');return;}

  var days=d.nextEarnings?Math.round((new Date(d.nextEarnings)-Date.now())/86400000):null;
  var ivr=d.ivRank!=null?d.ivRank:null;
  // IV: TT real only — no proxy fallback (proxy caused EM underestimation)
  var iv=d.iv||d.iv30||null;
  var ivSourceLabel=d.iv?'TT[REAL-TIME]':d.iv30?'TT[iv30_delayed]':'UNAVAILABLE';

  // Compute screening metrics for this ticker
  var sc=eicScreenTicker(d);

  // Include real option legs data if available
  var legsData=d.eicLegs||null;

  // Setup score (objective, deterministic — before Claude)
  var setupResult=computeSetupScore(d, legsData, sc);

  // Provisional final decision (pre-analysis — shows in context before Claude writes analysis)
  var _sc=eicScreenTicker(d);
  var provFd=computeFinalDecision({
    setup:null, execution:legsData?legsData.executionVerdict:null,
    context:S.marketContextRisk||'NONE', dataConf:'none',
    theoConf:legsData&&legsData.markVsTheo?legsData.markVsTheo.theoreticalConfidence:null,
    screenScore:_sc.screenScore,
    hardReject:_sc.hardReject?[_sc.hardReject]:
               (legsData&&legsData.aggregate&&legsData.aggregate.hardReject)||null,
  });

  setAS('earnings-ic','busy','Analyzing '+ticker+'...');
  var res=document.getElementById('eicResults');
  if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2);padding:8px 0">'+
    '<div class="td2"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>'+
    ' Analisi Iron Condor per '+ticker+'...</div>';

  var ctx=[
    '=== EARNINGS IRON CONDOR — '+ticker+' ===',
    '--- PRE-COMPUTED FINAL DECISION ---',
    'Note: this decision is computed deterministically from the data before your analysis.',
    'Your analysis should support, explain, or flag disagreements with this decision.',
    'Scan age: '+(S.lastScan?Math.round((Date.now()-S.lastScan)/60000)+'min ago':'NEVER RUN'),
    '--- DATA QUALITY HEADER ---',
    'IVR source: '+(d.ivRank!=null?'[TASTYTRADE/REAL-TIME]':'[TASTYTRADE_UNAVAILABLE — connect TT for IVR]'),
    'Price source: [DELAYED/Yahoo ~15min]',
    'Legs data: '+(legsData?'[DELAYED/Yahoo chain ~15min]':'[UNAVAILABLE — MODE B active]'),
    '---',
    '--- PRE-COMPUTED DECISION (provisional, before your analysis) ---',
    'executionVerdict (pre-computed): '+(legsData?legsData.executionVerdict||'n/a':'NO CHAIN DATA'),
    'marketContextRisk: '+(S.marketContextRisk||'NONE'),
    'provisionalDecision (setup=unknown): '+provFd.finalTradingDecision,
    'provisionalReason: '+provFd.finalTradingReason,
    'Your analysis should align with or explicitly challenge this pre-computed verdict.',
    '--- SETUP SCORE (deterministico, non delegato a Claude) ---',
    'setupScore: '+setupResult.setupScore+'/100 | setupGrade: '+setupResult.setupGrade,
    'C1 IVR: '+setupResult.setupComponents.ivr.pts+'/'+setupResult.setupComponents.ivr.max+
      'pts ('+setupResult.setupComponents.ivr.value+'% ['+setupResult.setupComponents.ivr.source+'])',
    'C2 timing: '+setupResult.setupComponents.timing.pts+'/'+setupResult.setupComponents.timing.max+
      'pts ('+setupResult.setupComponents.timing.value+')',
    'C3 delta: '+setupResult.setupComponents.deltaValidation.pts+'/'+setupResult.setupComponents.deltaValidation.max+
      'pts ('+setupResult.setupComponents.deltaValidation.value+')',
    'C4 termStructure: '+setupResult.setupComponents.termStructure.pts+'/'+setupResult.setupComponents.termStructure.max+
      'pts ('+setupResult.setupComponents.termStructure.value+')',
    'C5 liquidity: '+setupResult.setupComponents.liquidity.pts+'/'+setupResult.setupComponents.liquidity.max+
      'pts ('+setupResult.setupComponents.liquidity.value+')',
    'C6 premium: '+setupResult.setupComponents.premium.pts+'/'+setupResult.setupComponents.premium.max+
      'pts ('+setupResult.setupComponents.premium.value+')',
    setupResult.setupCaps?'GRADE CAPS: '+setupResult.setupCaps.join(', '):'no grade caps',
    setupResult.setupHardReject?'SETUP HARD REJECT: '+setupResult.setupHardReject:'no hard reject',
    '',
    '--- SCREENING METRICS (proxy pre-chain) ---',
    'SCREENING SCORE: '+sc.screenScore+'/100',
    'LIQUIDITY PROXY: '+sc.liqLabel+(sc.liqLabel==='weak'?' ⚠️':''),
    'PREMIUM PROXY: '+sc.premiumLabel,
    'HARD REJECT: '+(sc.hardReject||'none'),
    '---',
    'PREZZO: $'+d.price,
    'EARNINGS DATE: '+(d.nextEarnings||'N/A'),
    'GIORNI AGLI EARNINGS: '+(days!=null?days:'N/A'),
    'IVR: '+(d.ivRank!=null&&ivr!=null?ivr.toFixed(1)+'%':'N/A')+' ['+(d.ivRank!=null?'TASTYTRADE':'TASTYTRADE_UNAVAILABLE')+']',
    'IV CORRENTE: '+(iv?(iv*100).toFixed(1)+'% ['+ivSourceLabel+']':'N/A [IV mancante — EM non affidabile]'),
    'IV 30gg: '+(d.iv30?(d.iv30*100).toFixed(1)+'%':'N/A'),
    'RSI: '+d.rsi,
    'BETA: '+(d.beta||'N/A'),
    'SIGNAL: '+d.signal,
    'SCORE TECNICO: '+d.score+'/100',
    'BB SQUEEZE: '+d.squeeze,
    'vs MA200: '+d.ma200dist,
    '',
    '=== CALCOLO EXPECTED MOVE ===',
    'Usa: EM = prezzo × IV × sqrt(DTE/365)',
    'DTE usato: '+(days||'N/A'),
    'IV usato: '+(iv?(iv*100).toFixed(1)+'% ['+ivSourceLabel+']':'UNAVAILABLE — trade non valutabile senza IV reale'),
    '',
    (legsData?
      '=== DATI LEGS — MODE A: REAL CHAIN DATA PRESENT (Yahoo REST ~15min delayed) ===':
      '=== DATI LEGS — MODE B: NO CHAIN DATA. ALL STRIKES ARE [THEORETICAL]. DO NOT PRESENT AS TRADABLE ==='),
    (legsData&&legsData.legs?(function(ld){
      var L=ld.legs;
      function legLine(nm,leg,fq){
        if(!leg)return nm+': N/A';
        var fqTag=fq?(' fillQ:'+fq.verdict):'';
        return nm+': $'+leg.strike+' [target $'+leg.theoreticalTarget+']'
          +' | delta '+(leg.estimatedDelta!=null?leg.estimatedDelta+' ['+leg.deltaSource+']':'n/a')
          +' | legIV '+(leg.legIV!=null?leg.legIV+'% ['+leg.legIVSource+']':'n/a')
          +' | bid '+leg.bid+' ask '+leg.ask+' spread '+(leg.spreadPct!=null?leg.spreadPct+'%':'n/a')
          +fqTag+' | OI '+leg.openInterest;
      }
      return [
        'VOLATILITY SEPARATION:',
        'termStructureIV [TT/HIGH QUALITY]: '+ld.termStructureIV+'%  — '+ld.termStructureIVNote,
        'legIV source: ['+ld.liqDataSource+'] delayed:'+(ld.liqDataDelayed?'YES ~15min':'NO')+' confidence:'+ld.liqConfidence,
        ld.liqConfidenceNote,
        'REAL STRIKES (mapped from Yahoo chain):',
        legLine('SHORT CALL',L.shortCall, ld.fillQuality&&ld.fillQuality.shortCall),
        legLine('SHORT PUT', L.shortPut,  ld.fillQuality&&ld.fillQuality.shortPut),
        legLine('LONG CALL', L.longCall,  ld.fillQuality&&ld.fillQuality.longCall),
        legLine('LONG PUT',  L.longPut,   ld.fillQuality&&ld.fillQuality.longPut),
        'DELTA VALIDATION [short 0.10-0.15 | long 0.20-0.30]: '+
          (ld.deltaWarnings&&ld.deltaWarnings.length?
            '⚠ STRUCTURE NOT VIABLE: '+ld.deltaWarnings.join(' | '):
            'all legs in range ✓'),
        (ld.deltaValidation?ld.deltaValidation.note:''),
        'STRUCTURE VIABLE (delta): '+(ld.structureViable?'YES':'NO — see delta warnings above'),
        'AVG spread:'+ld.aggregate.avgSpreadPct+'% WORST:'+ld.aggregate.worstSpreadPct+
          '% MARKET CREDIT:$'+ld.aggregate.estCredit+' LIQ:'+ld.aggregate.liqVerdict,
        'IV CONFIDENCE: '+(ld.overallIVConfidence||'UNKNOWN')+' | Delta source: ESTIMATED[B-S] — not real-time',
        ld.legIssues?'⚠ LEG ISSUES: '+JSON.stringify(ld.legIssues):'No per-leg issues',
        // Mark vs Theoretical
        ld.markVsTheo?(
          'THEORETICAL CREDIT: $'+ld.markVsTheo.theoreticalCredit+
            ' [ESTIMATED/B-S | confidence:'+( ld.markVsTheo.theoreticalConfidence||'UNKNOWN')+']'+
          ' | MARKET CREDIT: $'+ld.markVsTheo.marketCredit+' [DELAYED/Yahoo bid]'+
          ' | SLIPPAGE: $'+ld.markVsTheo.slippage+' ('+ld.markVsTheo.slippagePct+'%) — '+ld.markVsTheo.slippageGrade
        ):'markVsTheo: n/a',
        'EXECUTION VERDICT: '+(ld.executionVerdict||'UNKNOWN'),
        ld.aggregate.hardReject?'⚠ REJECT: '+ld.aggregate.hardReject.join(' | '):'No hard rejects',
      ].join('\n');
    })(legsData):'Dati legs NON DISPONIBILI — stima proxy stock-level. liqDataSource:proxy | liqConfidence:low'),
    '',
    '=== CONTESTO MACRO ===',

    'Binary Event Risk: '+(S.marketContextRisk||'NON VALUTATO — esegui Market Context prima'),
    (S.marketContextSummary?'Context summary: '+S.marketContextSummary.substring(0,200):''),
    '',
    '=== ISTRUZIONI ===',
    'Proponi un Iron Condor con strike a ~2x Expected Move.',
    'Mostra il calcolo EM esplicito.',
    'Valuta se il premio è adeguato rispetto al rischio.',
    'Se binary event risk è HIGH o CRITICAL, emetti WARNING prominente e considera SCARTATO.',
  ].join('\n');

  try{
    var analysis=await callAgent('earnings-ic',ctx);
    setAS('earnings-ic','ok','Analysis complete: '+ticker);

    var verdict='NEUTRO';
    if(analysis.includes('APPROVATO'))verdict='APPROVATO';
    else if(analysis.includes('SCARTATO'))verdict='SCARTATO';
    var vColor=verdict==='APPROVATO'?'var(--gr)':verdict==='SCARTATO'?'var(--rd)':'var(--am)';

    // ── Final Decision Layer (base path — no DXLink) ─────────────
    var fd=computeFinalDecision({
      setup:       setupResult.setupGrade,    // STRONG/OK/WEAK — deterministic
      claudeVerdict: verdict,                 // kept for reference but not decision input
      execution:   legsData?legsData.executionVerdict:null,
      context:     S.marketContextRisk||'NONE',
      dataConf:    'none',
      theoConf:    legsData?legsData.markVsTheo&&legsData.markVsTheo.theoreticalConfidence:null,
      screenScore: setupResult.setupScore,    // use objective score
      hardReject:  setupResult.setupHardReject?[setupResult.setupHardReject]:null,
    });
    if(d){d.eicFinalDecision=fd;d.eicSetupResult=setupResult;d.eicFinalDecisionTicker=ticker;}

    var formatted=analysis.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split('\n').join('<br>');
    var dxlinkBtn='';
    if(S.ttConnected){
      var expStr=(legsData&&legsData.expiration)?legsData.expiration:'';
      dxlinkBtn='<button class="eic-dxlink-btn" data-ticker="'+ticker+'" data-exp="'+expStr+'" '+
        'style="width:100%;margin-top:6px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);'+
        'color:#fff;border:none;border-radius:7px;padding:8px;font-family:var(--M);'+
        'font-size:9px;font-weight:700;cursor:pointer">'+
        '&#9670; DXLINK DEEP DIVE — delta, IV, bid/ask live</button>';
    }
    // Final Decision badge colors
    var fdColors={'APPROVED':'var(--gr)','APPROVED_WITH_CAUTION':'var(--am)',
                  'WATCHLIST_ONLY':'#f97316','AVOID':'var(--rd)','BLOCKED_BY_CONTEXT':'var(--rd)'};
    var fdColor=fdColors[fd.finalTradingDecision]||'var(--tx2)';
    var ssGradeColor=setupResult.setupGrade==='STRONG'?'var(--gr)':setupResult.setupGrade==='OK'?'var(--am)':'var(--rd)';
    var ssBadge='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">'+
      '<span style="font-size:7px;font-family:var(--M);padding:1px 5px;border-radius:4px;'+
        'background:rgba(0,0,0,.06);color:'+ssGradeColor+';font-weight:700">'+
        'SETUP '+setupResult.setupGrade+' ('+setupResult.setupScore+')</span>'+
      '<span style="font-size:7px;font-family:var(--M);padding:1px 5px;border-radius:4px;background:rgba(0,0,0,.06);color:var(--tx2)">'+
        'IVR:'+setupResult.setupComponents.ivr.pts+'/25'+
        ' T:'+setupResult.setupComponents.timing.pts+'/20'+
        ' Δ:'+setupResult.setupComponents.deltaValidation.pts+'/20'+
        ' IV:'+setupResult.setupComponents.termStructure.pts+'/15'+
        ' L:'+setupResult.setupComponents.liquidity.pts+'/12'+
        ' P:'+setupResult.setupComponents.premium.pts+'/8</span>'+
      (setupResult.setupCaps?'<span style="font-size:7px;font-family:var(--M);color:var(--am);padding:1px 5px">'+
        '⚠ '+setupResult.setupCaps.join(', ')+'</span>':'')+
    '</div>';
    var fdBadge='<div style="margin-top:8px;padding:6px 10px;border-radius:6px;'+
      'background:rgba(0,0,0,.04);border-left:3px solid '+fdColor+'">'+
      '<div style="font-size:9px;font-family:var(--M);font-weight:700;color:'+fdColor+
        ';margin-bottom:2px">&#9670; FINAL DECISION: '+fd.finalTradingDecision+'</div>'+
      '<div style="font-size:8px;font-family:var(--M);color:var(--tx2);line-height:1.5">'+fd.finalTradingReason+'</div>'+
      ssBadge+
      '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);margin-top:3px">'+
        'setup:'+fd.decisionComponents.setup.grade+
        ' | exec:'+fd.decisionComponents.execution.grade+
        ' | ctx:'+fd.decisionComponents.context.grade+
        ' | data:'+fd.decisionComponents.dataConfidence.grade+
      '</div>'+
    '</div>';
    var card='<div class="stbox" style="border-color:'+vColor+';margin-top:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
        '<div class="stitle" style="color:#06b6d4">EIC — '+ticker+'</div>'+
        '<div style="font-size:11px;font-weight:700;color:'+vColor+'">'+verdict+'</div>'+
      '</div>'+
      '<div style="font-size:10px;font-family:var(--M);line-height:1.75">'+formatted+'</div>'+
      fdBadge+
    '</div>'+dxlinkBtn;
    if(res){
      res.innerHTML=card;
      var dxBtn=res.querySelector('.eic-dxlink-btn');
      if(dxBtn)dxBtn.addEventListener('click',function(){
        eicRunDXLink(this.getAttribute('data-ticker'),this.getAttribute('data-exp'));
      });
    }
    appendSysMsg('&#9670; EIC analysis: '+ticker+' → '+verdict);
    appendAgentMsg('earnings-ic',analysis);
    logEv('earnings-ic','Analysis complete: '+ticker+' '+verdict,'ok');
  }catch(e){
    if(res)res.innerHTML='<div style="color:var(--rd);font-size:10px">Errore: '+e.message+'</div>';
    setAS('earnings-ic','err',e.message);
  }
}
