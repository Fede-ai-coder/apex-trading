var JOURNAL_KEY = 'apex_journal_v1';

function jLoad() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY)||'[]'); }
  catch(e) { return []; }
}

function jSave(trades) {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(trades)); return true; }
  catch(e) { showToast('Journal save failed: '+e.message,'warn'); return false; }
}

function jAddTrade(trade) {
  var trades = jLoad();
  trade.id = 'T'+Date.now()+'_'+Math.random().toString(36).slice(2,6).toUpperCase();
  trade.createdAt = new Date().toISOString();
  trades.unshift(trade);
  jSave(trades);
  return trade.id;
}

function jUpdateTrade(id, updates) {
  var trades = jLoad();
  var idx = trades.findIndex(function(t){return t.id===id;});
  if(idx<0){showToast('Trade not found','warn');return false;}
  Object.assign(trades[idx], updates, {updatedAt:new Date().toISOString()});
  return jSave(trades);
}

function jDeleteTrade(id) {
  var trades = jLoad().filter(function(t){return t.id!==id;});
  return jSave(trades);
}

// ── Build snapshot from current APEX state for a ticker ──────────
function jBuildSnapshot(ticker) {
  var d    = S.scanData.find(function(x){return x.ticker===ticker;});
  var snap = {
    capturedAt:           new Date().toISOString(),
    // Setup
    setupScore:           d&&d.eicSetupResult  ? d.eicSetupResult.setupScore       : null,
    setupGrade:           d&&d.eicSetupResult  ? d.eicSetupResult.setupGrade        : null,
    setupCapsTriggered:   d&&d.eicSetupResult  ? d.eicSetupResult.setupCapsTriggered: [],
    // Decision
    finalTradingDecision: d&&d.eicFinalDecision? d.eicFinalDecision.finalTradingDecision : null,
    finalTradingReason:   d&&d.eicFinalDecision? d.eicFinalDecision.finalTradingReason   : null,
    decisionComponents:   d&&d.eicFinalDecision? d.eicFinalDecision.decisionComponents   : null,
    // Execution
    executionVerdict:     d&&d.eicLegs         ? d.eicLegs.executionVerdict               : null,
    theoreticalCredit:    d&&d.eicLegs&&d.eicLegs.markVsTheo ? d.eicLegs.markVsTheo.theoreticalCredit  : null,
    theoreticalConfidence:d&&d.eicLegs&&d.eicLegs.markVsTheo ? d.eicLegs.markVsTheo.theoreticalConfidence : null,
    marketCredit:         d&&d.eicLegs&&d.eicLegs.markVsTheo ? d.eicLegs.markVsTheo.marketCredit         : null,
    slippage:             d&&d.eicLegs&&d.eicLegs.markVsTheo ? d.eicLegs.markVsTheo.slippage             : null,
    slippagePct:          d&&d.eicLegs&&d.eicLegs.markVsTheo ? d.eicLegs.markVsTheo.slippagePct          : null,
    slippageGrade:        d&&d.eicLegs&&d.eicLegs.markVsTheo ? d.eicLegs.markVsTheo.slippageGrade        : null,
    // DXLink
    dxlinkConfidence:     d&&d.eicLegsLive     ? d.eicLegsLive.dxlinkConfidence   : null,
    greeksLive:           d&&d.eicLegsLive     ? d.eicLegsLive.greeksLive          : null,
    liveLegCount:         d&&d.eicLegsLive     ? d.eicLegsLive.liveLegCount        : null,
    // Market
    marketContextRisk:    S.marketContextRisk  || null,
    marketContextTimestamp: S.marketContextTimestamp || null,
    // IV — Tastytrade only. hvRank/HV_proxy never used as IVR source.
    ivr:                  d ? (d.ivRank!=null?d.ivRank:null) : null,
    ivrSource:            d ? (d.ivRank!=null?'TASTYTRADE':'TASTYTRADE_UNAVAILABLE') : null,
    ivrReason:            d ? (d.ivRank!=null?null:'NO_TASTYTRADE_IVR') : null,
    iv:                   d ? (d.iv||d.iv30||null)                        : null,
    hv:                   d ? (d.hv30||null)                              : null,
    // Tags (auto-generated)
    tags: jAutoTags(d),
  };
  return snap;
}

function jAutoTags(d) {
  var tags = [];
  if(!d) return tags;
  if(d.nextEarnings) tags.push('earnings');
  if(d.ivRank!=null&&d.ivRank>=60) tags.push('high_ivr');
  if(d.ivRank!=null&&d.ivRank<30)  tags.push('low_ivr');
  if(d.squeeze&&d.squeeze!=='off')  tags.push('squeeze');
  if(d.eicSetupResult){
    var caps = d.eicSetupResult.setupCapsTriggered||[];
    caps.forEach(function(c){tags.push('cap:'+c);});
  }
  if(d.eicFinalDecision){
    tags.push('decision:'+d.eicFinalDecision.finalTradingDecision.toLowerCase());
  }
  return tags;
}

// ── Analytics engine ──────────────────────────────────────────────
function jComputeStats(trades) {
  var closed = trades.filter(function(t){return t.status==='closed'&&t.pnl!=null;});
  if(!closed.length) return {count:0, closedCount:0, openCount:trades.filter(function(t){return t.status==='open';}).length};

  var pnls    = closed.map(function(t){return t.pnl;});
  var winners = pnls.filter(function(p){return p>0;});
  var losers  = pnls.filter(function(p){return p<=0;});
  var totalPnl   = +pnls.reduce(function(a,b){return a+b;},0).toFixed(2);
  var winRate    = +(winners.length/closed.length*100).toFixed(1);
  var avgWinner  = winners.length ? +(winners.reduce(function(a,b){return a+b;},0)/winners.length).toFixed(2) : 0;
  var avgLoser   = losers.length  ? +(losers.reduce(function(a,b){return a+b;},0)/losers.length).toFixed(2)  : 0;
  var expectancy = +(winRate/100*avgWinner + (1-winRate/100)*avgLoser).toFixed(2);

  // By strategy
  var byStrategy={};
  closed.forEach(function(t){
    var k=t.strategyType||'unknown';
    if(!byStrategy[k]) byStrategy[k]={count:0,pnl:0,wins:0};
    byStrategy[k].count++;byStrategy[k].pnl+=t.pnl;
    if(t.pnl>0)byStrategy[k].wins++;
  });

  // By context
  var byContext={};
  closed.forEach(function(t){
    var k=(t.snapshot&&t.snapshot.marketContextRisk)||'unknown';
    if(!byContext[k]) byContext[k]={count:0,pnl:0,wins:0};
    byContext[k].count++;byContext[k].pnl+=t.pnl;
    if(t.pnl>0)byContext[k].wins++;
  });

  // By setupGrade
  var byGrade={};
  closed.forEach(function(t){
    var k=(t.snapshot&&t.snapshot.setupGrade)||'unknown';
    if(!byGrade[k]) byGrade[k]={count:0,pnl:0,wins:0};
    byGrade[k].count++;byGrade[k].pnl+=t.pnl;
    if(t.pnl>0)byGrade[k].wins++;
  });

  // By setupCapsTriggered (each cap analyzed independently)
  var byCap={};
  closed.forEach(function(t){
    var caps=(t.snapshot&&t.snapshot.setupCapsTriggered)||[];
    if(!caps.length) caps=['no_caps'];
    caps.forEach(function(c){
      if(!byCap[c]) byCap[c]={count:0,pnl:0,wins:0};
      byCap[c].count++;byCap[c].pnl+=t.pnl;
      if(t.pnl>0)byCap[c].wins++;
    });
  });

  return {
    count:trades.length, closedCount:closed.length,
    openCount:trades.filter(function(t){return t.status==='open';}).length,
    totalPnl, winRate, avgWinner, avgLoser, expectancy,
    byStrategy, byContext, byGrade, byCap,
  };
}
