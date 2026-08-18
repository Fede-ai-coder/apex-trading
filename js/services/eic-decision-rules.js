// ─────────────────────────────────────────────────────────────────────────────
// EIC (Earnings Iron Condor agent) — DECISION RULES
//
// Owner-corrective closure of the EIC extraction. The post-EIC audit in PR
// #380 proved that the generic names below are EIC-owned even though neither
// begins with the family prefix: every production caller is an EIC UI module,
// both bodies consume and produce EIC decision data, and no non-EIC module
// calls them.
//
// The two declaration sites were relocated BYTE-FOR-BYTE from index.html, in
// their original physical order. Names, signatures, bodies, classic-script
// binding forms and synchronous form are unchanged. The module is inert at
// evaluation time: both sites are plain function declarations, touch no DOM,
// issue no request, open no socket, set no timer, register no listener, read
// no storage and access no shared state.
//
// LOAD ORDER
//   This classic script loads after eic-screening-rules.js and before every EIC
//   UI consumer. The functions call no application binding themselves; their
//   consumers resolve them only when an EIC action runs.
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// FINAL DECISION LAYER — deterministic, not delegated to Claude
// Combines setup, execution, context, and data confidence
// ══════════════════════════════════════════════════════════════

function computeFinalDecision(components){
  var setup         = components.setup;         // 'APPROVATO'|'NEUTRO'|'SCARTATO'|null
  var execution     = components.execution;     // 'EXECUTABLE'|'EXECUTABLE_WITH_SLIPPAGE'|'POOR_EXECUTION_QUALITY'|'NOT_EXECUTABLE'|null
  var context       = components.context;       // 'NONE'|'MODERATE'|'HIGH'|'CRITICAL'|null
  var dataConf      = components.dataConf;      // 'high'|'partial'|'none'|null  (dxlinkConfidence or 'none' if no DXLink)
  var theoConf      = components.theoConf;      // 'HIGH'|'MEDIUM'|'LOW'|null
  var hardReject    = components.hardReject;    // array or null
  var screenScore   = components.screenScore;   // 0-100

  // ── Decision components (each graded independently) ──────────
  var compSetup, compExec, compCtx, compData;

  // Setup grade
  if(hardReject&&hardReject.length)           compSetup='BLOCKED';
  // Accept objective setupGrade (STRONG/OK/WEAK) directly
  else if(setup==='STRONG')                   compSetup='STRONG';
  else if(setup==='OK')                       compSetup='ACCEPTABLE';
  else if(setup==='WEAK')                     compSetup='WEAK';
  // Legacy: Claude verdicts (used when no setupGrade available)
  else if(setup==='APPROVATO'&&screenScore>=65) compSetup='STRONG';
  else if(setup==='APPROVATO')                compSetup='ACCEPTABLE';
  else if(setup==='NEUTRO')                   compSetup='WEAK';
  else                                         compSetup='REJECTED';

  // Execution grade
  if(execution==='EXECUTABLE')                compExec='STRONG';
  else if(execution==='EXECUTABLE_WITH_SLIPPAGE') compExec='ACCEPTABLE';
  else if(execution==='POOR_EXECUTION_QUALITY')   compExec='WEAK';
  else if(execution==='NOT_EXECUTABLE')           compExec='BLOCKED';
  else                                            compExec='UNKNOWN';

  // Context grade
  if(!context||context==='NONE')              compCtx='CLEAR';
  else if(context==='MODERATE')              compCtx='CAUTION';
  else if(context==='HIGH')                  compCtx='RISK';
  else if(context==='CRITICAL')              compCtx='BLOCKED';
  else                                        compCtx='UNKNOWN';

  // Data confidence grade
  // DXLink confidence takes precedence — partial DXLink caps at LOW
  // even if theoreticalConfidence is MEDIUM (theoretical is still ESTIMATED)
  if(dataConf==='partial')                   compData='LOW';      // partial live data — cap at LOW
  else if(dataConf==='high'&&theoConf==='HIGH')   compData='HIGH';
  else if(dataConf==='high'||theoConf==='MEDIUM') compData='MEDIUM';
  else                                        compData='MINIMAL'; // none/null/unknown

  // ── Final decision matrix ─────────────────────────────────────
  var decision, reason;

  // Hard blocks first — any of these → immediate block
  if(compCtx==='BLOCKED'){
    decision='BLOCKED_BY_CONTEXT';
    reason='Market context CRITICAL — macro binary event risk prohibits new positions.';
  } else if(compSetup==='BLOCKED'){
    decision='AVOID';
    reason='Hard reject on one or more legs ('+( hardReject?hardReject[0]:'unknown')+').';
  } else if(compExec==='BLOCKED'){
    decision='AVOID';
    reason='NOT_EXECUTABLE: zero bid or negative credit — structure cannot be filled at market.';

  // Context risk degrades anything
  } else if(compCtx==='RISK'){
    if(compSetup==='STRONG'&&compExec==='STRONG'){
      decision='WATCHLIST_ONLY';
      reason='Setup and execution are strong but HIGH macro risk. Wait for risk to resolve.';
    } else {
      decision='AVOID';
      reason='HIGH market context risk combined with non-ideal setup or execution.';
    }

  // Data too weak to decide
  } else if(compData==='MINIMAL'){
    decision='WATCHLIST_ONLY';
    reason='Insufficient real-time data (DXLink unavailable). Revisit with live data before trading.';

  // Setup blocked or rejected
  } else if(compSetup==='REJECTED'){
    decision='AVOID';
    reason='Setup scored below threshold (SCARTATO) — structure does not meet quality criteria.';

  // Core decision — setup + execution + data
  } else if(compSetup==='STRONG'&&compExec==='STRONG'&&compCtx==='CLEAR'&&(compData==='HIGH'||compData==='MEDIUM')){
    decision='APPROVED';
    reason='Strong setup, executable structure, clear market context, and sufficient data confidence.';

  } else if(compSetup==='STRONG'&&compExec==='STRONG'&&compCtx==='CAUTION'){
    decision='APPROVED_WITH_CAUTION';
    reason='Strong setup and execution but moderate macro risk — size down and monitor.';

  } else if(compSetup==='STRONG'&&compExec==='STRONG'&&compCtx==='CLEAR'&&compData==='LOW'){
    decision='APPROVED_WITH_CAUTION';
    reason='Strong setup and execution but partial real-time data — confirm with DXLink before trading.';

  } else if(compSetup==='STRONG'&&compExec==='ACCEPTABLE'){
    decision=compData==='MINIMAL'?'WATCHLIST_ONLY':'APPROVED_WITH_CAUTION';
    reason='Good setup but execution quality requires slippage acceptance. Use limit orders at mid.';

  } else if(compSetup==='ACCEPTABLE'&&compExec==='STRONG'){
    decision='APPROVED_WITH_CAUTION';
    reason='Execution is clean but setup is marginal. Reduce position size.';

  } else if(compSetup==='ACCEPTABLE'&&compExec==='ACCEPTABLE'){
    decision=compData==='HIGH'?'APPROVED_WITH_CAUTION':'WATCHLIST_ONLY';
    reason='Both setup and execution are marginal. Only trade with real-time data confirmation.';

  } else if(compSetup==='WEAK'||compExec==='WEAK'){
    decision='WATCHLIST_ONLY';
    reason='Setup or execution quality is insufficient for live trading. Monitor for improvement.';

  } else {
    decision='WATCHLIST_ONLY';
    reason='Mixed signals across setup, execution, context, and data confidence.';
  }

  return {
    finalTradingDecision: decision,
    finalTradingReason:   reason,
    decisionComponents: {
      setup:         {grade:compSetup,  input:setup,      score:screenScore},
      execution:     {grade:compExec,   input:execution},
      context:       {grade:compCtx,    input:context||'NONE'},
      dataConfidence:{grade:compData,   dxlink:dataConf,  theoretical:theoConf},
    },
  };
}

// ══════════════════════════════════════════════════════════════
// SETUP SCORING — deterministic, not delegated to Claude
// computeSetupScore(d, legsData, sc) → setupScore, setupGrade, setupComponents
// d        = scanData entry
// legsData = /eic/legs backend response (null if not fetched)
// sc       = eicScreenTicker(d) result
// ══════════════════════════════════════════════════════════════

function computeSetupScore(d, legsData, sc) {
  var comps = {}, reasons = [], caps = [];

  // ── C1: IVR — premium availability (0-25 pts). Tastytrade only, no proxy. ──
  var ivr = d.ivRank!=null ? d.ivRank : 0;
  var ivrSrc = d.ivRank!=null ? 'TASTYTRADE' : 'TASTYTRADE_UNAVAILABLE';
  var ivrPts = d.ivRank!=null ? (ivr>=60?25 : ivr>=45?18 : ivr>=30?10 : 2) : 0;
  reasons.push('IVR '+(d.ivRank!=null?ivr.toFixed(0):'N/A')+'% ['+ivrSrc+']');
  comps.ivr = {pts:ivrPts, max:25, value:d.ivRank!=null?+ivr.toFixed(0):null, source:ivrSrc};

  // ── C2: Earnings timing (0-20 pts) ────────────────────────────
  var days = sc.days;
  var timePts = (days>=5&&days<=10)?20 : (days>=11&&days<=14)?15 : (days>=15&&days<=21)?7 : (days>=3&&days<=4)?5 : 0;
  reasons.push('DTE '+days+'d');
  comps.timing = {pts:timePts, max:20, value:days+'d'};

  // ── C3: Delta validation (0-20 pts) ───────────────────────────
  var deltaPts, nWarn=0;
  if(!legsData){
    deltaPts=6;
    comps.deltaValidation={pts:deltaPts, max:20, value:'NO_CHAIN_DATA'};
  } else {
    nWarn=legsData.deltaWarnings?legsData.deltaWarnings.length:0;
    deltaPts=nWarn===0?20 : nWarn===1?10 : nWarn===2?4 : 0;
    if(nWarn>0) reasons.push(nWarn+' delta warning(s)');
    comps.deltaValidation={pts:deltaPts, max:20, value:nWarn===0?'IN_SPEC':'OUT_OF_SPEC', warnings:nWarn};
  }

  // ── C4: IV / term structure quality (0-15 pts) ────────────────
  var tsPts;
  if(legsData&&legsData.termStructureIV){
    var ivc=legsData.overallIVConfidence;
    tsPts=ivc==='MEDIUM'?15:ivc==='LOW'?8:3;
    comps.termStructure={pts:tsPts, max:15, value:'termIV:'+legsData.termStructureIV+'%', ivConf:ivc};
  } else if(d.ivRank!=null){
    tsPts=10;
    comps.termStructure={pts:tsPts, max:15, value:'IVR_only'};
  } else {
    tsPts=0;
    comps.termStructure={pts:tsPts, max:15, value:'UNAVAILABLE'};
  }

  // ── C5: Liquidity (0-12 pts) ──────────────────────────────────
  var liqPts=sc.liqLabel==='good'?12:sc.liqLabel==='acceptable'?6:0;
  if(liqPts===0) reasons.push('Liquidity weak');
  comps.liquidity={pts:liqPts, max:12, value:sc.liqLabel};

  // ── C6: Premium adequacy (0-8 pts) ────────────────────────────
  var premPts=sc.premiumLabel==='good'?8:sc.premiumLabel==='acceptable'?4:0;
  if(premPts===0) reasons.push('Premium thin');
  comps.premium={pts:premPts, max:8, value:sc.premiumLabel};

  var rawScore=Math.round(Math.min(100, ivrPts+timePts+deltaPts+tsPts+liqPts+premPts));

  // ── Grade caps — STRONG requires full structural alignment ─────
  // Any single structural failure prevents STRONG.
  var canBeStrong=true;
  var capsTriggered=[];
  if(ivr<45)                          {canBeStrong=false; caps.push('IVR<45');             capsTriggered.push('low_ivr');}
  if(days<5||days>14)                 {canBeStrong=false; caps.push('timing outside 5-14d');capsTriggered.push('timing_outside_window');}
  if(nWarn>=1)                        {canBeStrong=false; caps.push(nWarn+' delta warning(s)');capsTriggered.push('delta_warning');}
  if(sc.liqLabel==='weak')            {canBeStrong=false; caps.push('liquidity weak');      capsTriggered.push('weak_liquidity');}
  if(!legsData)                       {canBeStrong=false; caps.push('no chain data');       capsTriggered.push('missing_legsData');}

  var grade;
  if     (rawScore>=68&&canBeStrong) grade='STRONG';
  else if(rawScore>=40)              grade='OK';
  else                               grade='WEAK';

  // Hard reject
  var hardReject=sc.hardReject||null;
  if(!hardReject&&legsData&&legsData.aggregate&&legsData.aggregate.hardReject&&legsData.aggregate.hardReject.length)
    hardReject=legsData.aggregate.hardReject[0];

  return {
    setupScore:      rawScore,
    setupGrade:      grade,
    setupComponents: comps,
    setupReason:     reasons.join(' | '),
    setupCaps:           caps.length?caps:null,
    setupCapsTriggered:  capsTriggered.length?capsTriggered:[],
    setupHardReject:     hardReject,
  };
}

// End of owner-corrective EIC decision-rule declarations.
