// ── Main portfolio data fetch (positions + balances + DXLink greeks) ─
async function fetchPortfolioData(){
  if(!S.ttConnected||!S.ttAccounts.length)return;
  // Lifecycle guard: the ACCOUNT side panel (which owns this fetch) lives inside
  // view-dashboard. If the user has navigated to journal / mcx / etc., the panel
  // is no longer visible — skip balances/positions/greeks/VIX-family work so we
  // don't churn CPU & network in the background.  User-initiated calls (REFRESH
  // button, showAccountPanel) always happen while the panel is on-screen so they
  // are unaffected.
  if (typeof _activeView !== 'undefined' && _activeView !== 'dashboard' && _activeView !== 'portfolio') {
    console.log('[PortfolioLifecycle] fetchPortfolioData skipped (inactive view=' + _activeView + ')');
    return;
  }
  if(S.portfolioFetching)return; // guard against concurrent 60s-timer overlaps
  S.portfolioFetching=true;
  var acc=S.ttAccounts[0];
  // Show spinner only on first open (no stale data yet)
  if(!S.portfolioData){
    document.getElementById('panelHeader').textContent='PORTFOLIO \u2014 '+acc.number;
    document.getElementById('panelContent').innerHTML='<div class="dc"><div style="font-size:11px;color:var(--tx2)">&#x27F3; Loading portfolio...</div></div>';
    var _panelEl=document.getElementById('panelContent').parentElement;
    if(_panelEl)_panelEl.scrollTop=0;
  }
  try{
    var res=await Promise.all([
      ttCall('/account/'+acc.number+'/balances'),
      ttCall('/account/'+acc.number+'/positions'),
      // Fetch live SPY price for beta-weighted delta SPY normalization
      fetch(BACKEND+'/market/quotes?symbols=SPY',{signal:AbortSignal.timeout(5000)})
        .then(function(r){return r.ok?r.json():null;}).catch(function(){return null;})
    ]);
    var balData=res[0]||{};
    var positions=(res[1]&&res[1].positions)||[];
    var spyQuoteData=res[2];
    var spyPrice=(spyQuoteData&&spyQuoteData.quotes&&spyQuoteData.quotes.length&&
                  spyQuoteData.quotes[0].price!=null)?spyQuoteData.quotes[0].price:null;

    // ── Enrich each position with scan-data context (IVR / earnings / squeeze / beta)
    positions.forEach(function(p){
      p._underlying=portfolioGetUnderlying(p);
      var sr=S.scanData.find(function(x){return x.ticker===p._underlying;});
      if(sr){
        if(p.beta==null&&sr.beta!=null)p.beta=sr.beta;
        if(sr.ivRank!=null)p._ivr=sr.ivRank;
        // hvRank is never used as IVR proxy — policy: TASTYTRADE only
        if(sr.nextEarnings)p._nextEarnings=sr.nextEarnings;
        p._squeeze=sr.squeeze||null;
        p._squeezeFired=!!sr.squeezeFired;
        if(sr.price!=null)p._price=sr.price; // underlying price for beta-weighted delta
      }
    });

    S.portfolioData={balances:balData,positions:positions,greeksSource:null,spyPrice:spyPrice};
    S.portfolioLastUpdated=new Date();
    renderPortfolioPanel(); // first paint — no greeks yet

    // ── DXLink greeks + VIX family (both one-shot, run AFTER first render so UI isn't blocked)
    try{
      var dxRes=await Promise.all([
        fetchPortfolioGreeks(positions),
        _ensureVixFamily(),
      ]);
      var enriched=dxRes[0];
      S.portfolioData.positions=enriched;
      // Only report DXLink success if at least one position was actually enriched.
      // fetchPortfolioGreeks returns positions unchanged (no throw) on timeout/no-streamer-symbols,
      // so we must check whether any position got a real greek, not just that the call completed.
      var anyLive=enriched.some(function(p){return p.greeksSource==='DXLink';});
      S.portfolioData.greeksSource=anyLive?'DXLink':'unavailable';
    }catch(ge){
      logEv('portfolio','DXLink greeks error: '+ge.message,'warn');
      S.portfolioData.greeksSource='failed';
    }
    renderPortfolioPanel(); // second paint — with live greeks (or failure badge)

  }catch(e){
    var notice='<div style="font-size:9px;font-family:var(--M);color:var(--rd);padding:4px 0">Refresh failed: '+e.message+'</div>';
    var pc=document.getElementById('panelContent');
    if(pc&&S.portfolioData){renderPortfolioPanel();pc.insertAdjacentHTML('afterbegin',notice);}
    else if(pc){pc.innerHTML='<div class="dc">'+notice+'</div>';}
  }finally{
    S.portfolioFetching=false;
  }
}

function renderPortfolioPanel(){
  if(typeof _regimeRefresh==='function')_regimeRefresh(); // keep dashboard regime alert live on each refresh
  if(!S.portfolioData)return;
  var acc=S.ttAccounts[0];
  var bal=S.portfolioData.balances||{};
  var positions=S.portfolioData.positions||[];
  // Open-position symbols become available → include them as lower-priority context.
  try{postCandleContext({reason:'portfolio_symbols',contextType:'portfolio',portfolioSymbols:positions.map(function(p){return p&&(p.underlyingSymbol||p.ticker||p.symbol);}),timeframes:['1D','30M','4H']});}catch(e){}
  var greeksSource=S.portfolioData.greeksSource; // null=loading | 'DXLink'=ok | 'failed'
  var ts=S.portfolioLastUpdated?S.portfolioLastUpdated.toLocaleTimeString():'\u2014';

  // ── Aggregate P&L and greeks (greeks only from confirmed DXLink positions) ──
  var netDelta=0,netGamma=0,netTheta=0,netVega=0;
  var netBwDelta=0,netBwDeltaSpy=0,hasBwDelta=false,hasBwDeltaSpy=false;
  var totalDayPnl=0,totalUnrealPnl=0,hasUnreal=false,liveGreekCount=0;
  var spyPrice=S.portfolioData.spyPrice;
  positions.forEach(function(p){
    if(p.unrealizedDayGain!=null)totalDayPnl+=parseFloat(p.unrealizedDayGain)||0;
    if(p.unrealizedGain!=null){totalUnrealPnl+=parseFloat(p.unrealizedGain)||0;hasUnreal=true;}
    if(p.greeksSource==='DXLink'){
      var qty=parseFloat(p.quantity)||0;
      var mult=(p.instrumentType==='Equity Option'||p.instrumentType==='Future Option')?100:1;
      if(p.delta!=null)netDelta+=(parseFloat(p.delta)||0)*qty*mult;
      if(p.gamma!=null)netGamma+=(parseFloat(p.gamma)||0)*qty*mult;
      if(p.theta!=null)netTheta+=(parseFloat(p.theta)||0)*qty*mult;
      if(p.vega!=null) netVega+=(parseFloat(p.vega)||0)*qty*mult;
      liveGreekCount++;
      // Beta-weighted delta aggregation
      if(p.delta!=null&&p.beta!=null){
        var posDelta=(parseFloat(p.delta)||0)*qty*mult;
        var bwd=posDelta*(parseFloat(p.beta)||0);
        netBwDelta+=bwd;
        hasBwDelta=true;
        if(spyPrice!=null&&p._price!=null){
          netBwDeltaSpy+=bwd*(p._price/spyPrice);
          hasBwDeltaSpy=true;
        }
      }
    }
  });

  // ── Refresh controls bar ─────────────────────────────────────
  var autoOn=!!S.portfolioTimerId;
  var autoColor=autoOn?'var(--gr)':'var(--tx3)';
  var greekBadge=greeksSource===null
    ?'<span style="font-size:8px;font-family:var(--M);color:var(--pu)">&#x27F3; fetching greeks\u2026</span>'
    :greeksSource==='DXLink'
      ?'<span style="font-size:8px;font-family:var(--M);color:var(--gr);white-space:nowrap">&#9670; DXLink live</span>'
      :'<span style="font-size:8px;font-family:var(--M);color:var(--am);white-space:nowrap">&#9650; greeks n/a</span>';
  // 'unavailable' = DXLink returned 0 enriched positions (timeout, no streamer symbols, no options)
  // 'failed'      = token fetch or WebSocket threw an exception
  // Both render the same amber badge above; the distinction is logged to the event log.
  var html=regimeHTML()+'<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'+
    '<button class="tbtn" onclick="fetchPortfolioData()" style="flex:1;padding:7px;font-size:9px">&#x27F3; REFRESH</button>'+
    '<button class="tbtn" onclick="togglePortfolioAutoRefresh()" style="padding:7px 10px;font-size:9px;color:'+autoColor+';border-color:'+autoColor+'">'+(autoOn?'AUTO ON':'AUTO OFF')+'</button>'+
    greekBadge+
    '</div>'+
    '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-bottom:10px;text-align:right">Updated: '+ts+'</div>';

  // ── Account summary box ───────────────────────────────────────
  var netLiq=bal.netLiq!=null?'\u0024'+parseFloat(bal.netLiq).toFixed(2):'\u2014';
  var bp=bal.buyingPower!=null?'\u0024'+parseFloat(bal.buyingPower).toFixed(2):'\u2014';
  var cash=bal.cash!=null?'\u0024'+parseFloat(bal.cash).toFixed(2):'\u2014';
  var dpColor=totalDayPnl>=0?'var(--gr)':'var(--rd)';
  var urColor=totalUnrealPnl>=0?'var(--gr)':'var(--rd)';
  html+='<div class="ptitle">ACCOUNT SUMMARY</div><div class="psum-box">'+
    '<div class="psum-item"><div class="psum-label">NET LIQ</div><div class="psum-value">'+netLiq+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">BUYING POWER</div><div class="psum-value">'+bp+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">DAILY P&amp;L</div><div class="psum-value" style="color:'+dpColor+'">'+formatPnl(totalDayPnl)+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">UNREALIZED</div><div class="psum-value" style="color:'+(hasUnreal?urColor:'var(--tx3)')+'">'+
      (hasUnreal?formatPnl(totalUnrealPnl):'\u2014')+'</div></div>'+
    '</div>';

  // ── Net greeks — always shown; "—" placeholders when DXLink unavailable ──
  var greeksLoading=greeksSource===null;
  var greeksLive=liveGreekCount>0;
  var dColor=greeksLive?(Math.abs(netDelta)<20?'var(--gr)':'var(--am)'):'var(--tx3)';
  var tColor=greeksLive?(netTheta>=0?'var(--gr)':'var(--rd)'):'var(--tx3)';
  var vColor=greeksLive?(netVega>=0?'var(--am)':'var(--gr)'):'var(--tx3)';
  var gkSrcLabel=greeksLoading
    ?'<span style="color:var(--pu);font-size:7px">&#x27F3; fetching\u2026</span>'
    :greeksLive
      ?'<span style="color:var(--gr);font-size:7px">DXLink \u00b7 '+liveGreekCount+' pos</span>'
      :greeksSource==='failed'
        ?'<span style="color:var(--am);font-size:7px">&#9650; DXLink error</span>'
        :'<span style="color:var(--tx3);font-size:7px">&#9650; unavailable</span>';
  html+='<div class="ptitle" style="margin-top:4px">NET GREEKS '+
    '<span style="font-weight:400;text-transform:none;letter-spacing:0">'+gkSrcLabel+'</span></div>'+
    '<div class="pgk-box">'+
    '<div class="psum-item"><div class="psum-label">&Delta; NET DELTA</div><div class="psum-value" style="color:'+dColor+'">'+(greeksLive?netDelta.toFixed(2):'\u2014')+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">&Gamma; NET GAMMA</div><div class="psum-value" style="color:var(--tx'+(greeksLive?'1':'3')+'">'+(greeksLive?netGamma.toFixed(4):'\u2014')+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">&Theta; NET THETA/day</div><div class="psum-value" style="color:'+tColor+'">'+(greeksLive?'\u0024'+netTheta.toFixed(2):'\u2014')+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">&nu; NET VEGA</div><div class="psum-value" style="color:'+vColor+'">'+(greeksLive?'\u0024'+netVega.toFixed(2):'\u2014')+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">&beta;w DELTA</div><div class="psum-value" style="color:var(--tx'+(hasBwDelta?'1':'3')+'">'+(hasBwDelta?netBwDelta.toFixed(2):'\u2014')+'</div></div>'+
    '<div class="psum-item"><div class="psum-label">&beta;w DELTA (SPY)</div><div class="psum-value" style="color:var(--tx'+(hasBwDeltaSpy?'1':'3')+'">'+(hasBwDeltaSpy?netBwDeltaSpy.toFixed(2):'\u2014')+'</div></div>'+
    '</div>';

  // ── Positions table ───────────────────────────────────────────
  html+='<div class="ptitle" style="margin-top:4px">POSITIONS ('+positions.length+')</div>';
  if(!positions.length){
    html+='<div style="font-size:10px;font-family:var(--M);color:var(--tx3);padding:8px 0">No open positions.</div>';
  }else{
    html+='<div style="overflow-x:auto"><table class="ptbl"><thead><tr>'+
      '<th style="text-align:left">Symbol</th>'+
      '<th>Qty</th>'+
      '<th>Mark</th>'+
      '<th>Day P&amp;L</th>'+
      '<th>Unreal</th>'+
      '<th title="Delta \u2014 DXLink real-time only, never estimated">&Delta;</th>'+
      '<th title="Gamma \u2014 DXLink real-time only">&Gamma;</th>'+
      '<th title="Theta \u2014 DXLink real-time only">&Theta;</th>'+
      '<th title="Vega \u2014 DXLink real-time only">&nu;</th>'+
      '<th title="Underlying beta">&beta;</th>'+
      '<th title="Beta-weighted delta (position delta \xd7 beta)">&beta;w &Delta;</th>'+
      '<th title="SPY-normalized beta-weighted delta (position delta \xd7 beta \xd7 underlying/SPY)">&beta;w &Delta; (SPY)</th>'+
      '<th title="IV Rank">IVR</th>'+
      '<th title="Days to earnings">DTEe</th>'+
      '<th title="BB/KC Squeeze state">SQZ</th>'+
      '</tr></thead><tbody>';

    positions.forEach(function(p){
      var qty=parseFloat(p.quantity)||0;
      var dayPnl=p.unrealizedDayGain!=null?parseFloat(p.unrealizedDayGain):null;
      var unrealPnl=p.unrealizedGain!=null?parseFloat(p.unrealizedGain):null;
      // Mark: prefer live DXLink mid, then broker mark/markPrice/closePrice
      var mark=p.mark!=null?parseFloat(p.mark)
        :(p.markPrice!=null?parseFloat(p.markPrice)
          :(p.closePrice!=null?parseFloat(p.closePrice):null));
      var beta=p.beta!=null?parseFloat(p.beta):null;

      // Greeks — ONLY DXLink real values; never estimate, never fall back
      var hasLiveG=p.greeksSource==='DXLink';
      var noGTag='<span style="color:var(--tx3);font-size:8px">\u2014</span>';
      var delta=hasLiveG&&p.delta!=null?parseFloat(p.delta).toFixed(2):null;
      var gamma=hasLiveG&&p.gamma!=null?parseFloat(p.gamma).toFixed(4):null;
      var theta=hasLiveG&&p.theta!=null?parseFloat(p.theta).toFixed(2):null;
      var vega= hasLiveG&&p.vega!=null ?parseFloat(p.vega).toFixed(2) :null;

      // Beta-weighted delta — requires live delta and beta
      var bwDelta=null,bwDeltaSpy=null;
      if(hasLiveG&&p.delta!=null&&p.beta!=null){
        var _mult=(p.instrumentType==='Equity Option'||p.instrumentType==='Future Option')?100:1;
        var _posDelta=(parseFloat(p.delta)||0)*qty*_mult;
        bwDelta=_posDelta*(parseFloat(p.beta)||0);
        if(spyPrice!=null&&p._price!=null){
          bwDeltaSpy=bwDelta*(p._price/spyPrice);
        }
      }

      // IVR from scan data
      var ivr=p._ivr!=null?Math.round(p._ivr):null;
      var ivrColor=ivr!=null?(ivr>=50?'var(--gr)':ivr>=25?'var(--am)':'var(--bl)'):'var(--tx3)';

      // Earnings DTE — only show if within 90 days
      var dte=null;
      if(p._nextEarnings){
        var d=Math.round((new Date(p._nextEarnings)-Date.now())/86400000);
        if(d>=0&&d<=90)dte=d;
      }
      var dteColor=dte!=null?(dte<=7?'var(--rd)':dte<=14?'var(--am)':'var(--tx2)'):'var(--tx3)';

      // Squeeze
      var sqzColor=p._squeezeFired?'var(--am)':p._squeeze==='ACTIVE'?'var(--bl)':'var(--tx3)';
      var sqzStr=p._squeezeFired?'FIRED':p._squeeze==='ACTIVE'?'ACT':'\u2014';

      var dpC=dayPnl!=null?(dayPnl>=0?'var(--gr)':'var(--rd)'):'inherit';
      var urC=unrealPnl!=null?(unrealPnl>=0?'var(--gr)':'var(--rd)'):'inherit';
      var thC=theta!=null?(parseFloat(theta)>=0?'var(--gr)':'var(--rd)'):'inherit';

      html+='<tr>'+
        '<td>'+
          '<div style="font-size:10px;font-weight:700;white-space:nowrap">'+p.symbol+'</div>'+
          '<div style="font-size:8px;color:var(--tx3)">'+p._underlying+(p.instrumentType&&p.instrumentType!=='Equity'?' \u00b7 opt':'')+'</div>'+
        '</td>'+
        '<td class="mono">'+qty+'</td>'+
        '<td class="mono">'+(mark!=null?'\u0024'+mark.toFixed(2):'\u2014')+'</td>'+
        '<td class="mono" style="color:'+dpC+'">'+(dayPnl!=null?formatPnl(dayPnl):'\u2014')+'</td>'+
        '<td class="mono" style="color:'+urC+'">'+(unrealPnl!=null?formatPnl(unrealPnl):'\u2014')+'</td>'+
        '<td class="mono">'+(delta!=null?delta:noGTag)+'</td>'+
        '<td class="mono">'+(gamma!=null?gamma:noGTag)+'</td>'+
        '<td class="mono" style="color:'+thC+'">'+(theta!=null?theta:noGTag)+'</td>'+
        '<td class="mono">'+(vega!=null?vega:noGTag)+'</td>'+
        '<td class="mono" style="color:var(--tx2)">'+(beta!=null?beta.toFixed(2):'\u2014')+'</td>'+
        '<td class="mono" style="color:var(--tx2)">'+(bwDelta!=null?bwDelta.toFixed(2):noGTag)+'</td>'+
        '<td class="mono" style="color:var(--tx2)">'+(bwDeltaSpy!=null?bwDeltaSpy.toFixed(2):noGTag)+'</td>'+
        '<td class="mono" style="color:'+ivrColor+'">'+(ivr!=null?ivr+'%':'\u2014')+'</td>'+
        '<td class="mono" style="color:'+dteColor+'">'+(dte!=null?dte+'d':'\u2014')+'</td>'+
        '<td class="mono" style="color:'+sqzColor+'">'+sqzStr+'</td>'+
        '</tr>';
    });
    html+='</tbody></table></div>';
    if(liveGreekCount===0&&greeksSource!==null){
      html+='<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-top:6px;text-align:right">'+
        '&#9650; Greeks: no live data \u2014 DXLink unavailable or no option positions</div>';
    }
  }

  // Write directly to DOM — bypasses setPanel so our timer is never cleared by the render itself
  document.getElementById('panelHeader').textContent='PORTFOLIO \u2014 '+acc.number;
  document.getElementById('panelContent').innerHTML=html;
}

async function showAccountPanel(){
  if(!S.ttConnected||!S.ttAccounts.length){
    setPanel('PORTFOLIO','<div class="dc"><div style="font-size:11px;color:var(--am)">Tastytrade not connected.</div></div>');return;
  }
  stopPortfolioRefresh();   // kill any stale timer before starting fetch
  S.portfolioData=null;     // clear so spinner shows on fresh open
  await fetchPortfolioData();
  // Re-clear any timer that may have been set by a concurrent showAccountPanel()
  // call that raced through the await above (e.g. rapid double-click on ACCOUNT button).
  // Without this guard, the previous setInterval ID is orphaned.
  stopPortfolioRefresh();
  // Start 60s auto-refresh; stopPortfolioRefresh() in setPanel() kills it on navigate-away
  S.portfolioTimerId=setInterval(fetchPortfolioData,60000);
  renderPortfolioPanel();   // flip AUTO button to ON
}
async function showIVPanel(ticker){
  if(!S.ttConnected){showToast('Tastytrade non connesso','warn');return;}
  setPanel(ticker+' — IVR LIVE','<div class="dc"><div style="font-size:11px;color:var(--tx2)">&#x27F3; Caricamento IVR...</div></div>');
  try{
    var data=await ttCall('/options/ivr/'+ticker);
    var ivrColor=data.ivRank>=50?'var(--gr)':data.ivRank>=25?'var(--am)':'var(--bl)';
    setPanel(ticker+' — IVR LIVE',
      '<div class="ptitle">IV RANK — '+ticker+'</div>'+
      '<div class="dc">'+
        '<div style="font-size:28px;font-family:var(--M);font-weight:800;color:'+ivrColor+';margin-bottom:6px">'+
          (data.ivRank!==null?data.ivRank.toFixed(0):'N/A')+
          '<span style="font-size:12px;color:var(--tx3)"> IVR</span></div>'+
        ir('IV Rank',data.ivRank!==null?data.ivRank.toFixed(1)+'/100':'N/A',ivrColor)+
        ir('IV Percentile',data.ivPercentile!==null?data.ivPercentile.toFixed(1)+'%':'N/A')+
        ir('IV Corrente',data.iv!==null?(data.iv*100).toFixed(1)+'%':'N/A')+
      '</div>'+
      '<div class="ptitle" style="margin-top:8px">TERM STRUCTURE</div>'+
      '<div class="dc">'+
        ir('IV 30gg',data.iv30?(data.iv30*100).toFixed(1)+'%':'N/A')+
        ir('IV 60gg',data.iv60?(data.iv60*100).toFixed(1)+'%':'N/A')+
        ir('HV 30gg',data.hv30?(data.hv30*100).toFixed(1)+'%':'N/A')+
      '</div>'+
      '<div class="stbox"><div class="stitle">REGIME</div>'+
      '<div class="stext" style="color:'+ivrColor+'">'+(data.regime||'').replace(/_/g,' ').toUpperCase()+'</div>'+
      '<div class="stext" style="margin-top:6px">'+(data.premiumStrategy||'')+'</div></div>'
    );
  }catch(e){setPanel(ticker+' — IVR','<div class="dc"><div style="font-size:11px;color:var(--am)">'+e.message+'</div></div>');}
}
