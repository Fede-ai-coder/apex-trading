// ─────────────────────────────────────────────────────────────────────────────
// EIC (Earnings Iron Condor agent) — SCREENING RULES
//
// PR 1 of the approved 4-PR EIC extraction, chosen by the post-PESS monolith
// audit (PR #374 — evidence-only, deliberately never merged, so it is cited by
// PR number rather than by a path that does not exist on this branch; option E:
// screening rules · panel · ticker analysis · live deep dive). The four
// declaration SITES below were relocated BYTE-FOR-BYTE out of the inline
// monolith in index.html. Names, signatures, bodies, binding forms, sync form
// and relative physical order are unchanged; only their location changed. No
// behaviour changed.
//
// WHAT THIS FILE OWNS
//   The inert half of EIC — the part with no effects at all:
//     • eicScreenTicker     — maps one scan row to a screening object: IVR
//                             regime, earnings window, liquidity gate and the
//                             hard-reject reasons. Pure input → output.
//     • eicLiqFromLegs      — maps an /eic/legs aggregate to a liquidity label,
//                             spread quality and confidence note. Pure.
//     • eicBuildLiveContext — formats DXLink-enriched leg data into the text
//                             block handed to the analysis prompt. It builds a
//                             STRING and returns it; it writes nothing.
//
//   Nothing here reads or writes S.*, touches the DOM, opens a socket, issues a
//   request, sets a timer, registers a listener, reads storage or assigns to
//   window. That is what makes this the first slice: it is the most inert and
//   most reversible owner the family has.
//
// THE DUPLICATE IS DELIBERATE — DO NOT "TIDY" IT
//   `eicLiqFromLegs` is declared TWICE, and BOTH sites are here, in their
//   original relative order, byte-for-byte identical. That is not an oversight.
//
//   In the monolith the pair `eicFetchLegs` + `eicLiqFromLegs` (with their
//   comments) appears twice, once on each side of `runEICPanel` — a copy-paste
//   of a whole region. In a classic script both declarations are hoisted, so
//   the LATER one wins, and it wins before the first statement executes.
//   Because the two are byte-identical, the winner is indistinguishable from
//   the loser: no statement can observe which is bound, and nothing between the
//   sites references the name at all.
//
//   Relocating both sites unchanged is therefore semantics-preserving in the
//   strictest sense. DELETING one would also be behaviour-neutral — but it
//   would be an edit, not a relocation, and this PR is a relocation. The audit
//   (§14) settled this explicitly: deduplication is out of scope for any
//   extraction PR. If the duplicate is to be removed, that is its own change
//   with its own review.
//
//   A related fact, recorded and NOT acted on: `eicLiqFromLegs` has ZERO call
//   sites anywhere in the application. Both declarations are dead code. It is
//   relocated dead rather than quietly deleted, for the same reason.
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   Everything with an effect. The seven remaining EIC declarations stay inline
//   until their own PRs: runEICPanel and eicAnalyzeAll (panel), eicAnalyzeTicker
//   (ticker analysis), and eicFetchLegs ×2, eicDXLinkDeepDive and eicRunDXLink
//   (live deep dive). Note that eicFetchLegs is ALSO declared twice and stays
//   inline for now — its duplicate pair is PR 4's problem, handled the same way.
//
// LOAD ORDER
//   A classic, synchronous, src-only script. It has NO evaluation-time
//   dependency on anything: all four sites are plain `function` declarations,
//   so nothing runs when this file is evaluated. Nothing in the application
//   references these bindings at load time either — the audit checked for
//   top-level statement references (0), `typeof` / `window.` / existence guards
//   (0) and inline HTML attribute handlers (0). Every consumer is an EIC
//   function that runs on user action.
//
//   The single requirement is therefore that this tag precede the inline
//   monolith, so the three global bindings exist by the time any consumer can
//   be CALLED. It is loaded immediately after the PESS family block, where the
//   other agent-family modules live.
//
//   Call-time consumers, all of which remain inline:
//     eicScreenTicker      ← runEICPanel, eicAnalyzeTicker ×2, eicRunDXLink ×2
//     eicBuildLiveContext  ← eicRunDXLink
//     eicLiqFromLegs       ← nobody (see above)
// ─────────────────────────────────────────────────────────────────────────────

function eicScreenTicker(d){
  // Returns a screening object for one ticker.
  // Uses only objective/measurable metrics — no qualitative judgment.
  var days=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);
  var ivr=d.ivRank!=null?d.ivRank:0;
  // IV: use real TT implied-volatility if available.
  // REMOVED: ivr×0.4 proxy — unreliable, causes EM underestimation.
  // If d.iv is null, EM is null → hardReject = 'IV non disponibile'.
  var iv=d.iv||null;
  var ivSource=d.iv?'TT_realtime':d.iv30?'TT_iv30':null;
  // Fallback to iv30 only (same source, same reliability)
  if(!iv&&d.iv30){iv=d.iv30;ivSource='TT_iv30';}
  var ivLowConf=!iv; // true = IV missing, EM unreliable
  var price=d.price||0;

  // ── Expected Move ──────────────────────────────────────────────
  var emAbs=price&&iv>0?+(price*iv*Math.sqrt(days/365)).toFixed(2):null;
  var emPct=emAbs&&price?+(emAbs/price*100).toFixed(2):null;

  // ── Short strike distances (2× EM) ────────────────────────────
  var shortCallStrike=emAbs?+(price+2*emAbs).toFixed(2):null;
  var shortPutStrike=emAbs?+(price-2*emAbs).toFixed(2):null;
  var shortDistPct=emPct?+(emPct*2).toFixed(2):null;
  var emRatio=emPct&&shortDistPct?+(shortDistPct/emPct).toFixed(2):2.0;

  // ── Liquidity scoring (proxy — stock-level, not option-level) ──
  // TT liquidity rating: 1=excellent...5=poor (or similar)
  // bid/ask spread on stock as proxy for option spread quality
  // volume as proxy for option OI
  var liqScore=0;
  var liqLabel='unknown';

  // TT liquidity rating (1-5, lower=better)
  if(d.liq!=null){
    if(d.liq<=2)liqScore+=3;
    else if(d.liq<=3)liqScore+=2;
    else liqScore+=0;
  }
  // Stock bid/ask spread (proxy for option spread quality)
  var stockBid=d.bid||d.ttBid||0;
  var stockAsk=d.ask||d.ttAsk||0;
  if(stockBid>0&&stockAsk>0&&price>0){
    var spreadPct=(stockAsk-stockBid)/price*100;
    if(spreadPct<0.1)liqScore+=3;
    else if(spreadPct<0.3)liqScore+=2;
    else if(spreadPct<0.8)liqScore+=1;
    // >0.8% spread = 0 points, likely illiquid options
  }
  // Volume proxy
  if(d.volume>2000000)liqScore+=2;
  else if(d.volume>500000)liqScore+=1;
  // Price level (very low price = wide option spreads)
  if(price>50)liqScore+=1;

  if(liqScore>=7)liqLabel='good';
  else if(liqScore>=4)liqLabel='acceptable';
  else liqLabel='weak';

  // ── Premium quality proxy ─────────────────────────────────────
  // Estimate: for a 2x EM iron condor, typical credit ≈ 8-15% of width
  // Width ≈ EM × 0.5 per side (long strikes at 2.5× EM)
  // Credit ≈ iv × sqrt(DTE/365) × price × 0.08  (very rough)
  var wingWidth=emAbs?+(emAbs*0.5).toFixed(2):null;
  var estCredit=wingWidth&&iv>0?+(wingWidth*0.10).toFixed(2):null;
  var estMaxLoss=wingWidth&&estCredit?+(wingWidth-estCredit).toFixed(2):null;
  var creditRatio=estCredit&&wingWidth?+(estCredit/wingWidth).toFixed(3):null;

  var premiumLabel='unknown';
  if(creditRatio!=null){
    if(creditRatio>=0.12)premiumLabel='good';
    else if(creditRatio>=0.07)premiumLabel='acceptable';
    else premiumLabel='thin';
  }

  // ── Composite screening score (0-100) ─────────────────────────
  // NOT the trade quality — just "is this worth a deep dive?"
  var screenScore=0;
  screenScore+=Math.min(ivr,80)/80*30;            // IVR: max 30pts
  if(liqLabel==='good')screenScore+=25;            // Liquidity: max 25pts
  else if(liqLabel==='acceptable')screenScore+=12;
  if(premiumLabel==='good')screenScore+=20;         // Premium: max 20pts
  else if(premiumLabel==='acceptable')screenScore+=10;
  if(days>=5&&days<=14)screenScore+=15;            // Timing ideal: max 15pts
  else if(days>=2&&days<=21)screenScore+=7;
  if(emRatio>=1.8&&emRatio<=2.5)screenScore+=10;  // Strike placement: max 10pts
  screenScore=Math.round(screenScore);

  // ── Hard filter: objectively not tradable ─────────────────────
  var hardReject=null;
  if(liqLabel==='weak'&&liqScore<3)hardReject='Liquidità insufficiente (spread troppo largo / volume basso)';
  if(price<10)hardReject='Prezzo troppo basso (<$10) — opzioni probabilmente illiquide';
  if(emAbs===null&&ivLowConf)hardReject='IV non disponibile — EM non calcolabile. Connetti Tastytrade per IV reale.';
  if(emAbs===null&&!ivLowConf)hardReject='EM non calcolabile (price o DTE mancante)';

  return {
    ticker:d.ticker, name:d.name, price, days, ivr, iv,
    emAbs, emPct, shortCallStrike, shortPutStrike, shortDistPct, emRatio,
    liqScore, liqLabel, wingWidth, estCredit, estMaxLoss, creditRatio, premiumLabel,
    screenScore, hardReject,
    nextEarnings:d.nextEarnings,
    signal:d.signal, rsi:d.rsi, beta:d.beta,
  };
}

// ── eicLiqLabel: compute liquidity label from legs response ──────
function eicLiqFromLegs(legs){
  if(!legs||!legs.aggregate)return null;
  return {
    label:          legs.aggregate.liqVerdict||'unknown',
    avgSpread:      legs.aggregate.avgSpreadPct,
    worstSpread:    legs.aggregate.worstSpreadPct,
    estCredit:      legs.aggregate.estCredit,
    hardReject:     legs.aggregate.hardReject,
    // Transparency metadata from backend
    dataSource:     legs.liqDataSource||'unknown',
    delayed:        legs.liqDataDelayed??true,
    timestamp:      legs.liqDataTimestamp||null,
    confidence:     legs.liqConfidence||'unknown',
    confidenceNote: legs.liqConfidenceNote||'',
  };
}

// ── eicLiqLabel: compute liquidity label from legs response ──────
function eicLiqFromLegs(legs){
  if(!legs||!legs.aggregate)return null;
  return {
    label:          legs.aggregate.liqVerdict||'unknown',
    avgSpread:      legs.aggregate.avgSpreadPct,
    worstSpread:    legs.aggregate.worstSpreadPct,
    estCredit:      legs.aggregate.estCredit,
    hardReject:     legs.aggregate.hardReject,
    // Transparency metadata from backend
    dataSource:     legs.liqDataSource||'unknown',
    delayed:        legs.liqDataDelayed??true,
    timestamp:      legs.liqDataTimestamp||null,
    confidence:     legs.liqConfidence||'unknown',
    confidenceNote: legs.liqConfidenceNote||'',
  };
}

// ── Build DXLink-enriched Claude context ──────────────────────
function eicBuildLiveContext(liveData, baseLegsData){
  if(!liveData||!liveData.legs) return null;
  var legs = liveData.legs;
  var conf = liveData.confidence; // 'high'=4/4, 'partial'=1-3/4, 'none'=0/4

  // Per-leg line: shows REAL-TIME or ESTIMATED tag per field explicitly
  function legLine(nm, leg, deltaRange){
    if(!leg) return nm+': N/A';
    var dTag  = leg.realDelta!=null   ? '[REAL-TIME/DXLink]' : '[ESTIMATED/B-S]';
    var ivTag = leg.realIV!=null      ? '[REAL-TIME/DXLink]' : leg.legIV!=null ? '[DELAYED/Yahoo]' : '[UNAVAILABLE]';
    var bidV  = leg.bidPrice!=null    ? leg.bidPrice          : leg.bid;
    var askV  = leg.askPrice!=null    ? leg.askPrice          : leg.ask;
    var bidTag= leg.bidPrice!=null    ? '[REAL-TIME/DXLink]' : '[DELAYED/Yahoo]';
    var dVal  = leg.realDelta!=null   ? leg.realDelta         : leg.estimatedDelta;
    var ivVal = leg.realIV!=null      ? leg.realIV+'%'        : leg.legIV!=null ? leg.legIV+'%' : 'n/a';
    var spread= leg.liveSpread!=null  ? leg.liveSpread        : leg.spreadPct!=null ? leg.spreadPct+'%' : 'n/a';
    var absD  = dVal!=null ? Math.abs(dVal) : null;
    var inRange = absD!=null ? (absD>=deltaRange[0]&&absD<=deltaRange[1]) : null;
    var rangeTag = inRange===null?'unknown':inRange?'IN RANGE ✓':'OUT OF RANGE ✗ (|Δ|='+absD+')';
    // Greeks — show live if available, else ESTIMATED tag
    var thetaStr = leg.realTheta!=null
      ? leg.realTheta+' $/day [REAL-TIME/DXLink]'
      : '[ESTIMATED/B-S — use qualitative only]';
    var gammaStr = leg.realGamma!=null
      ? leg.realGamma+' Δ/$ [REAL-TIME/DXLink]'
      : '[ESTIMATED/B-S — use qualitative only]';
    var vegaStr = leg.realVega!=null
      ? leg.realVega+' $/pt [REAL-TIME/DXLink]'
      : '[ESTIMATED/B-S — use qualitative only]';
    return [
      nm+': $'+leg.strike+' [REAL/chain]',
      '  delta: '+(dVal!=null?dVal:'n/a')+' '+dTag+' | range ['+deltaRange[0]+'-'+deltaRange[1]+']: '+rangeTag,
      '  IV: '+ivVal+' '+ivTag,
      '  theta: '+thetaStr,
      '  gamma: '+gammaStr,
      '  vega:  '+vegaStr,
      '  bid: '+bidV+' ask: '+askV+' '+bidTag+' | spread: '+spread+' | OI: '+leg.openInterest,
    ].join('\n');
  }

  // Live credit: use real bid/ask when available, fall back to delayed
  var scBid = legs.shortCall&&legs.shortCall.bidPrice!=null ? legs.shortCall.bidPrice : (legs.shortCall?legs.shortCall.bid:0)||0;
  var spBid = legs.shortPut &&legs.shortPut.bidPrice!=null  ? legs.shortPut.bidPrice  : (legs.shortPut?legs.shortPut.bid:0)||0;
  var lcAsk = legs.longCall &&legs.longCall.askPrice!=null  ? legs.longCall.askPrice  : (legs.longCall?legs.longCall.ask:0)||0;
  var lpAsk = legs.longPut  &&legs.longPut.askPrice!=null   ? legs.longPut.askPrice   : (legs.longPut?legs.longPut.ask:0)||0;
  var liveCredit = +(scBid + spBid - lcAsk - lpAsk).toFixed(3);
  var creditSrcLegs = [
    legs.shortCall&&legs.shortCall.bidPrice!=null?'SC:live':'SC:delayed',
    legs.shortPut &&legs.shortPut.bidPrice!=null ?'SP:live':'SP:delayed',
    legs.longCall &&legs.longCall.askPrice!=null ?'LC:live':'LC:delayed',
    legs.longPut  &&legs.longPut.askPrice!=null  ?'LP:live':'LP:delayed',
  ];

  // Structure viability on real deltas
  var scOk = legs.shortCall&&legs.shortCall.realDelta!=null ? Math.abs(legs.shortCall.realDelta)>=0.10&&Math.abs(legs.shortCall.realDelta)<=0.15 : null;
  var spOk = legs.shortPut &&legs.shortPut.realDelta!=null  ? Math.abs(legs.shortPut.realDelta)>=0.10&&Math.abs(legs.shortPut.realDelta)<=0.15  : null;
  var lcOk = legs.longCall &&legs.longCall.realDelta!=null  ? Math.abs(legs.longCall.realDelta)>=0.20&&Math.abs(legs.longCall.realDelta)<=0.30  : null;
  var lpOk = legs.longPut  &&legs.longPut.realDelta!=null   ? Math.abs(legs.longPut.realDelta)>=0.20&&Math.abs(legs.longPut.realDelta)<=0.30   : null;
  var allReal = [scOk,spOk,lcOk,lpOk].every(function(v){return v===true;});
  var anyFail = [scOk,spOk,lcOk,lpOk].some(function(v){return v===false;});
  var viability = allReal?'VIABLE ✓':anyFail?'NOT VIABLE ✗':'PARTIAL (some legs missing real delta)';

  // Use new explicit fields if available, fall back to legacy
  var dxConf  = liveData.dxlinkConfidence || liveData.confidence || 'unknown';
  var legCount = liveData.liveLegCount    || (liveData.legsWithLiveData+'/4');
  var dxTs    = liveData.liveDataTimestamp|| liveData.dataTimestamp || 'unknown';
  var srcBD   = liveData.liveCreditSourceBreakdown || null;

  // Live market credit (uses DXLink bid/ask where available)
  var liveMktCredit = +(
    ((legs.shortCall&&legs.shortCall.bidPrice!=null?legs.shortCall.bidPrice:legs.shortCall?legs.shortCall.bid:0)||0)+
    ((legs.shortPut &&legs.shortPut.bidPrice!=null ?legs.shortPut.bidPrice :legs.shortPut?legs.shortPut.bid:0)||0)-
    ((legs.longCall &&legs.longCall.askPrice!=null ?legs.longCall.askPrice :legs.longCall?legs.longCall.ask:0)||0)-
    ((legs.longPut  &&legs.longPut.askPrice!=null  ?legs.longPut.askPrice  :legs.longPut?legs.longPut.ask:0)||0)
  ).toFixed(3);

  // Fill quality per leg from live data
  function liveFQ(leg){
    if(!leg) return 'MISSING';
    var bid = leg.bidPrice!=null?leg.bidPrice:leg.bid;
    var ask = leg.askPrice!=null?leg.askPrice:leg.ask;
    if(!bid||bid===0) return 'NOT_EXECUTABLE';
    var sprd = (ask&&bid&&ask>bid) ? +((ask-bid)/((ask+bid)/2)*100).toFixed(1) : null;
    return sprd===null?'UNKNOWN':sprd<=10?'TIGHT':sprd<=25?'ACCEPTABLE':sprd<=40?'WIDE':'VERY_WIDE';
  }
  var fqSC=liveFQ(legs.shortCall),fqSP=liveFQ(legs.shortPut),fqLC=liveFQ(legs.longCall),fqLP=liveFQ(legs.longPut);
  var anyNotExecLive=[fqSC,fqSP,fqLC,fqLP].some(function(f){return f==='NOT_EXECUTABLE';});
  var anyVeryWideLive=[fqSC,fqSP,fqLC,fqLP].some(function(f){return f==='VERY_WIDE';});
  var anyWideLive=[fqSC,fqSP,fqLC,fqLP].some(function(f){return f==='WIDE';});

  // Execution verdict from live data
  var liveExecVerdict;
  if(anyNotExecLive||liveMktCredit<=0)        liveExecVerdict='NOT_EXECUTABLE';
  else if(anyVeryWideLive)                    liveExecVerdict='POOR_EXECUTION_QUALITY';
  else if(anyWideLive)                        liveExecVerdict='EXECUTABLE_WITH_SLIPPAGE';
  else                                        liveExecVerdict='EXECUTABLE';

  // Degrade if dxlinkConfidence !== high
  if(dxConf!=='high'&&liveExecVerdict==='EXECUTABLE')
    liveExecVerdict='EXECUTABLE_WITH_SLIPPAGE (data incomplete — dxlinkConfidence:'+dxConf+')';

  var lines = [
    '=== DXLINK REAL-TIME DATA ===',
    'dxlinkConfidence: '+dxConf.toUpperCase(),
    'liveLegCount: '+legCount+' legs with real-time data',
    'liveDataTimestamp: '+dxTs,
    'liveCreditSourceBreakdown: '+(srcBD ? JSON.stringify(srcBD) : 'n/a'),
    '',
    '=== DATA SOURCE SUMMARY ===',
    'bid/ask:  '+(liveData.legsWithLiveData===4?'ALL [REAL-TIME/DXLink]':'MIXED — see per-leg'),
    'delta:    '+(liveData.legsWithLiveData===4?'ALL [REAL-TIME/DXLink]':'MIXED — see per-leg'),
    'IV:       '+(liveData.legsWithLiveData===4?'ALL [REAL-TIME/DXLink]':'MIXED — see per-leg'),
    'theoreticalConfidence: '+(liveData.greeksLive?'HIGH (live IV + greeks from DXLink)':
                               liveData.legsWithLiveData===4?'HIGH (live IV from DXLink)':
                               liveData.legsWithLiveData>0?'MEDIUM (partial DXLink)':'LOW (no live IV)'),
    'theta/gamma: [ESTIMATED/B-S — not from DXLink]',
    'strike:   [REAL/Yahoo chain — from prior REST fetch]',
    '',
    '=== LEGS ===',
    legLine('SHORT CALL', legs.shortCall, [0.10,0.15]),
    legLine('SHORT PUT',  legs.shortPut,  [0.10,0.15]),
    legLine('LONG CALL',  legs.longCall,  [0.20,0.30]),
    legLine('LONG PUT',   legs.longPut,   [0.20,0.30]),
    '',
    '=== STRUCTURE ===',
    'Delta viability (real-time): '+viability,
    'MARKET CREDIT (live): $'+liveMktCredit+(liveMktCredit<=0?' ⚠ DEBIT — not viable':'')+'  ['+
      (liveData.legsWithLiveData===4?'REAL-TIME/DXLink':'MIXED/partial DXLink')+']',
    'FILL QUALITY: SC:'+fqSC+' | SP:'+fqSP+' | LC:'+fqLC+' | LP:'+fqLP,
    'EXECUTION VERDICT (live): '+liveExecVerdict,
  ];

  // Partial confidence warning
  if(conf==='partial'){
    lines.push('');
    lines.push('⚠ PARTIAL DATA: only '+liveData.legsWithLiveData+'/4 legs have DXLink data.');
    lines.push('Missing legs retain [DELAYED/Yahoo] or [ESTIMATED/B-S] values — see per-leg tags.');
  } else if(conf==='none'){
    lines.push('');
    lines.push('⚠ NO LIVE DATA: DXLink returned 0/4 legs. All values are [DELAYED] or [ESTIMATED].');
  }

  return lines.join('\n');
}
