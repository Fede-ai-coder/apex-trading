// BACKEND DIRECTIONAL SNAPSHOT — SERVICE / STATE / LIFECYCLE
//
// Classic synchronous script loaded after the DSB pure adapter and before the
// inline monolith.
//
// Owns feature/state access, source selection, snapshot transport, live-price
// enrichment lifecycle, refresh/polling, detail/chart bridges and debug payload
// builders.
//
// Every shared dependency is resolved inside function bodies at call time.
// No bootstrap, state creation or shared-global access occurs at load time.
//
// The two window.apexDebug* exposure statements intentionally remain inline.

function ffBackendDirectionalSnapshot(){
  // Default ON: the Directional Scanner prefers the backend snapshot whenever
  // the backend serves operational directional results.
  // Disable via: localStorage.setItem('apex_ff_backend_directional_snapshot','0'); location.reload();
  try{
    var v=localStorage.getItem('apex_ff_backend_directional_snapshot');
    if(v==='0')return false;
  }catch(e){}
  return true;
}

function dsbState(){
  if(!S.backendDirectional||typeof S.backendDirectional!=='object'){
    S.backendDirectional={
      parsed:null,            // dsbParseSnapshot() result of the last good payload
      error:null,             // transport/HTTP error message of the last attempt
      fetching:false,         // single-flight guard
      lastFetchAt:null,       // ms timestamp of the last completed attempt (TTL)
      endpointSupported:null, // false after an HTTP 404 (endpoint not deployed)
      lastHttpStatus:null,
      sourceMode:null,        // 'auto' | 'frontend' (lazy-loaded from localStorage)
      autoRefreshTimerId:null,// single guarded auto-refresh interval (10 min)
      liveEnriching:false,    // single-flight guard for live-quote enrichment
      lastLiveEnrichAt:null,  // ms timestamp of the last live-quote enrich pass
      livePriceReason:null,   // machine-readable reason when no live price is used
      liveRetryTimerId:null,  // single (non-stacking) readiness-retry timer
      liveEnrichCooldownUntil:null, // ms: suppress relaunch after an aborted batch
      inflightSnapshot:null,  // reused promise while a snapshot GET is in flight
    };
  }
  return S.backendDirectional;
}

function dsbSourceMode(){
  var st=dsbState();
  if(st.sourceMode==='frontend'||st.sourceMode==='auto')return st.sourceMode;
  var v=null;
  try{v=localStorage.getItem('apex_dss_source_mode');}catch(e){}
  st.sourceMode=(v==='frontend')?'frontend':'auto';
  return st.sourceMode;
}

function dsbSetSourceMode(mode){
  var st=dsbState();
  st.sourceMode=(mode==='frontend')?'frontend':'auto';
  try{localStorage.setItem('apex_dss_source_mode',st.sourceMode);}catch(e){}
  if(typeof renderDirectionalSetupScanner==='function'){
    try{renderDirectionalSetupScanner();}catch(e){}
  }
}

function dsbLegacyOperationalSource(){
  try{
    if(typeof bssState!=='function'||typeof bdsDeriveBackendDirectionalRows!=='function')return null;
    var bst=bssState();
    var snap=bst&&bst.snapshot;
    if(!snap||snap.ok!==true)return null;
    var rows=bdsDeriveBackendDirectionalRows(snap,{includeNonEligible:false});
    var op=[];
    rows.forEach(function(r){
      if(!r||(r.operationalDirection!=='bullish'&&r.operationalDirection!=='bearish'))return;
      var ticker=_dsbSafeSym(r.symbol);
      if(!ticker)return;
      op.push({
        ticker:ticker,name:ticker,
        direction:r.operationalDirection,
        score:_dsbNum(r.operationalScore),
        price:_dsbNum(r.price),
        priceSource:_dsbStr(r.candleSource)||'backend_snapshot',
        priceIsLive:null,priceUpdatedAt:null,priceStaleReason:null,
        rsi:_dsbNum(r.rsi14),ma20:_dsbNum(r.sma20),ma30:_dsbNum(r.sma30),
        sma20AboveSma30:(r.sma20!=null&&r.sma30!=null)?(r.sma20>r.sma30):null,
        rs:_dsbNum(r.relativeStrengthVsSpy),rsRising:null,
        squeeze:_dsbBool(r.squeezeState),
        earningsDte:null,
        tf1d:{count:_dsbNum(r.candleCount),lastTimestamp:null,updatedAt:null,source:_dsbStr(r.candleSource),derivedFrom30M:null,derivationReason:null,stale:null,indicators:null},
        tf4h:null,
        stale:false,staleFlags:null,reasons:[],
        warnings:Array.isArray(r.warnings)?r.warnings.slice():[],
        backendResult:r.backendCandidate||null,
      });
    });
    if(!op.length)return null;
    return {
      available:true,origin:'legacy_operational',reason:null,
      rows:op,skipped:[],
      generatedAt:_dsbStr(snap.updatedAt),
      ageMs:_dsbNum(snap.ageMs),
      stale:_dsbBool(snap.stale),
      dataSource:'backend_scanner_snapshot',
      warnings:['source: legacy /scanner/snapshot operational fields'],
      diagnostics:null,
    };
  }catch(e){return null;}
}

function dsbLegacySnapshotPresent(){
  try{
    if(typeof bssState!=='function')return false;
    var bst=bssState();
    return !!(bst&&bst.snapshot&&bst.snapshot.ok===true&&Array.isArray(bst.snapshot.candidates)&&bst.snapshot.candidates.length);
  }catch(e){return false;}
}

function dsbGetBackendSource(){
  var unavailable=function(reason){
    return {available:false,origin:null,reason:reason,rows:[],skipped:[],warnings:[],
      generatedAt:null,ageMs:null,stale:null,dataSource:null,diagnostics:null};
  };
  if(typeof ffBackendDirectionalSnapshot==='function'&&!ffBackendDirectionalSnapshot())return unavailable('feature_off');
  var st=dsbState();
  if(st.parsed&&st.parsed.ok===true){
    return {
      available:true,origin:'directional_snapshot',reason:null,
      rows:st.parsed.results,skipped:st.parsed.skipped,
      generatedAt:st.parsed.generatedAt,ageMs:dsbSnapshotAgeMs(st),
      stale:st.parsed.stale,
      dataSource:st.parsed.dataSource||'backend_candle_store',
      warnings:st.parsed.warnings,diagnostics:st.parsed.diagnostics,
    };
  }
  var legacy=dsbLegacyOperationalSource();
  if(legacy)return legacy;
  if(st.fetching&&!st.lastFetchAt)return unavailable('fetching');
  if(st.parsed&&st.parsed.ok!==true)return unavailable(st.parsed.reason||'snapshot_not_ok');
  if(st.endpointSupported===false)return unavailable(dsbLegacySnapshotPresent()?'diagnostic_only':'endpoint_unsupported');
  if(st.error)return unavailable('fetch_error');
  return unavailable('no_snapshot');
}

function dsbScannerTabActive(){
  try{
    var el=document.getElementById('ptab-scanner');
    return !!(el&&String(el.className).indexOf('active')>=0);
  }catch(e){return false;}
}

async function dsbFetchSnapshot(opts){
  opts=opts||{};
  var st=dsbState();
  // Single-flight: overlapping dashboard_init / scanner_change / visible_rows_change
  // calls must NOT start a second request (which would abort the first as
  // NS_BINDING_ABORTED). Reuse the in-flight promise so concurrent callers await
  // the SAME GET. A forced refresh waits for the current one to settle.
  if(st.fetching)return st.inflightSnapshot||undefined;
  if(!opts.force&&st.lastFetchAt!=null&&(Date.now()-st.lastFetchAt)<DSB_SNAPSHOT_TTL_MS)return;
  st.fetching=true;
  st.inflightSnapshot=(async function(){
  try{
    var r=await fetch(BACKEND+'/scanner/directional/snapshot',{headers:_backendAuthHeaders(),signal:AbortSignal.timeout(9000)});
    st.lastHttpStatus=r.status;
    if(r.status===404){
      // Endpoint not deployed on this backend yet — remember and stop treating
      // it as an error; the panel falls back (legacy operational → frontend).
      st.endpointSupported=false;
      st.error=null;
    }else if(!r.ok){
      throw new Error('HTTP '+r.status);
    }else{
      var data=await r.json();
      st.endpointSupported=true;
      st.parsed=dsbParseSnapshot(data);
      st.error=null;
    }
    st.lastFetchAt=Date.now();
  }catch(e){
    st.error=(e&&e.message)?e.message:String(e);
    st.lastFetchAt=Date.now();
  }finally{
    st.fetching=false;
    st.inflightSnapshot=null;
    // Repaint only when the scanner tab is showing AND no detail chart is open
    // — never stomp another panel or reset the user's selected symbol.
    try{
      if(opts.rerender!==false&&dsbSourceMode()!=='frontend'&&dsbScannerTabActive()&&
         (typeof _dssDetailSymbol==='undefined'||_dssDetailSymbol==null)&&
         typeof renderDirectionalSetupScanner==='function'){
        renderDirectionalSetupScanner();
      }
    }catch(e2){}
    // A fresh snapshot just landed → patch visible rows with live marks (the
    // renderer above populated _dssCandidateList). Fire-and-forget, gated on
    // readiness so it never fires /market/live before auth/dxlink are ready.
    if(opts.enrichLive!==false){ try{ dsbEnrichVisibleRowsLive(); }catch(e3){} }
  }
  })();
  return st.inflightSnapshot;
}

function dsbRefreshClicked(){
  var btn=document.getElementById('dsb-refresh');
  if(btn){btn.disabled=true;setTimeout(function(){var b=document.getElementById('dsb-refresh');if(b)b.disabled=false;},1500);}
  dsbFetchSnapshot({force:true});
  dsbEnrichVisibleRowsLive({force:true});
}

function dsbRepaintIfSafe(){
  try{
    if(typeof ffBackendDirectionalSnapshot==='function'&&!ffBackendDirectionalSnapshot())return;
    if(dsbSourceMode()==='frontend')return;
    if(!dsbScannerTabActive())return;
    if(typeof _dssDetailSymbol!=='undefined'&&_dssDetailSymbol!=null)return; // chart open → keep it
    if(typeof renderDirectionalSetupScanner==='function')renderDirectionalSetupScanner();
  }catch(e){}
}

function dsbLiveEnrichReadiness(){
  // Off-dashboard / hidden / feature-off → do not enrich AND do not retry.
  if(typeof dsbAutoRefreshActive==='function'&&!dsbAutoRefreshActive())return {ready:false,active:false,reason:'context_inactive'};
  if(dsbSourceMode()==='frontend')return {ready:false,active:false,reason:'frontend_source'};
  // Market must be open — no live mark exists otherwise.
  if(typeof isRTHOpen==='function'&&!isRTHOpen())return {ready:false,active:true,reason:'market_closed'};
  // TT session connected + backend auth ready (key present, not known-invalid,
  // not in 401 backoff). _backendCandleGateOpen covers TT session + x-api-key.
  if(typeof _backendCandleGateOpen==='function'&&!_backendCandleGateOpen())return {ready:false,active:true,reason:'backend_auth_not_ready'};
  // Quote-token pipeline must have been initiated (DXLink connect kicked).
  if(typeof S!=='undefined'&&S&&!S.dxlinkConnectStarted)return {ready:false,active:true,reason:'quote_token_not_ready'};
  // DXLink feed must actually be ready (the backend holds the quote token / feed).
  var dxState=(typeof S!=='undefined'&&S&&S.dxlinkStatus)?String(S.dxlinkStatus.state||'').toLowerCase():null;
  if(dxState!=='ready')return {ready:false,active:true,reason:'dxlink_not_ready'};
  // The directional snapshot GET must have completed successfully (not in-flight,
  // not partial) — never enrich against stale/partial rows.
  var st=dsbState();
  if(st.fetching)return {ready:false,active:true,reason:'snapshot_not_ready'};
  var src=(typeof dsbGetBackendSource==='function')?dsbGetBackendSource():null;
  if(!src||src.available!==true)return {ready:false,active:true,reason:'snapshot_not_ready'};
  if(!Array.isArray(src.rows)||!src.rows.length)return {ready:false,active:true,reason:'visible_rows_not_ready'};
  var syms=(typeof _dssCandidateList!=='undefined'&&Array.isArray(_dssCandidateList)&&_dssCandidateList.length)
    ? _dssCandidateList.slice()
    : src.rows.map(function(r){return r&&r.ticker;});
  syms=syms.filter(Boolean);
  if(!syms.length)return {ready:false,active:true,reason:'visible_rows_not_ready'};
  return {ready:true,active:true,reason:null,src:src,syms:syms.slice(0,DSB_LIVE_SYMBOL_CAP)};
}

function dsbScheduleLiveEnrichRetry(){
  var st=dsbState();
  if(st.liveRetryTimerId)return;                              // already one pending — no stacking
  if(typeof dsbAutoRefreshActive==='function'&&!dsbAutoRefreshActive())return;
  st.liveRetryTimerId=setTimeout(function(){
    st.liveRetryTimerId=null;
    if(typeof dsbAutoRefreshActive==='function'&&!dsbAutoRefreshActive())return; // re-check on fire
    dsbEnrichVisibleRowsLive();                               // one attempt; reschedules ONE if still not ready
  },DSB_LIVE_RETRY_MS);
}

function dsbCancelLiveEnrichRetry(){
  var st=dsbState();
  if(st.liveRetryTimerId){ clearTimeout(st.liveRetryTimerId); st.liveRetryTimerId=null; }
}

async function dsbEnrichVisibleRowsLive(opts){
  opts=opts||{};
  var st=dsbState();
  if(st.liveEnriching)return;                                   // single-flight: in-flight batch wins
  if(typeof ffBackendDirectionalSnapshot==='function'&&!ffBackendDirectionalSnapshot())return;
  if(dsbSourceMode()==='frontend')return;
  // Cooldown after an aborted batch — do not relaunch immediately.
  if(!opts.force&&st.liveEnrichCooldownUntil&&Date.now()<st.liveEnrichCooldownUntil)return;
  // TTL between successful passes — repeated renders never storm.
  if(!opts.force&&st.lastLiveEnrichAt!=null&&(Date.now()-st.lastLiveEnrichAt)<DSB_LIVE_ENRICH_TTL_MS)return;
  // STRICT readiness gate — never call /market/live until fully ready.
  var rd=dsbLiveEnrichReadiness();
  if(!rd.ready){
    if(rd.active){ st.livePriceReason=rd.reason; dsbScheduleLiveEnrichRetry(); } // wait + retry once
    else { dsbCancelLiveEnrichRetry(); }                        // inactive → stop retrying
    return;                                                     // NO /market/live calls
  }
  dsbCancelLiveEnrichRetry();                                   // we are ready & running now
  var src=rd.src,syms=rd.syms;
  st.liveEnriching=true;
  try{
    if(typeof subscribeDxlinkQuotes==='function'){ try{ await subscribeDxlinkQuotes(syms); }catch(e){} }
    var patched=0,gotAny=false,aborted=false;
    await Promise.all(syms.map(async function(sym){
      if(typeof fetchLiveQuote!=='function')return;
      var px;
      try{ px=await fetchLiveQuote(sym); }
      catch(e){ if(typeof isAbortLikeError==='function'&&isAbortLikeError(e))aborted=true; return; }
      if(px==null||!isFinite(+px))return;
      gotAny=true;
      var row=null;
      for(var i=0;i<src.rows.length;i++){ if(src.rows[i]&&src.rows[i].ticker===sym){ row=src.rows[i]; break; } }
      if(!row)return;
      var changed=(row.priceIsLive!==true)||(row.price==null)||(Math.abs((+row.price)-(+px))>=0.001);
      // Patch ONLY price + freshness — direction/score/RSI/SMA/RS untouched.
      row.price=+(+px).toFixed(4);
      row.priceIsLive=true;
      row.priceSource='dxlink_live';
      row.priceUpdatedAt=new Date().toISOString();
      row.priceStaleReason=null;
      // Clear the "price not live" warning so its triangle is removed for this row.
      if(Array.isArray(row.warnings))row.warnings=row.warnings.filter(function(w){ return w!=='price_not_live'; });
      if(changed)patched++;
    }));
    // Aborted mid-batch (per-request abort OR the panel went inactive while the
    // batch was in flight) → set a precise reason + cooldown; do NOT relaunch now.
    if(aborted||(typeof dsbAutoRefreshActive==='function'&&!dsbAutoRefreshActive())){
      st.livePriceReason='live_quote_aborted';
      st.liveEnrichCooldownUntil=Date.now()+DSB_LIVE_ABORT_COOLDOWN_MS;
      if(patched>0)dsbRepaintIfSafe();
      return;
    }
    // Diagnostics reason when nothing went live this pass (dxlink is ready here).
    st.livePriceReason=gotAny?null:'quote_missing';
    st.lastLiveEnrichAt=Date.now();
    if(patched>0)dsbRepaintIfSafe();   // patch visible rows + counters, keep selection
  }catch(e){
    // Unexpected failure / abort of the batch → cooldown, no immediate relaunch.
    st.livePriceReason='live_quote_aborted';
    st.liveEnrichCooldownUntil=Date.now()+DSB_LIVE_ABORT_COOLDOWN_MS;
  }finally{
    st.liveEnriching=false;
  }
}

function dssResolveChartLivePrice(symbol, rowData){
  var sym=(typeof _dsbSafeSym==='function')?_dsbSafeSym(symbol):(symbol||null);
  // 1) freshest: a chart-open live quote fetched for this symbol within the short
  //    TTL window. Stored on module state (not the ranking row) and per-symbol, so
  //    it is re-resolved on every open/reopen and never cached globally forever.
  if(sym){
    var g=dsbState().chartLiveQuote;
    if(g&&g.price&&g.price[sym]!=null&&g.at&&g.at[sym]!=null&&(Date.now()-g.at[sym])<DSB_CHART_LIVE_TTL_MS){
      var fpx=parseFloat(g.price[sym]);
      if(isFinite(fpx)&&fpx>0)return {price:fpx,source:'fresh_live_quote'};
    }
  }
  // 2) fallback: the already live/recent backend snapshot row (PR #265 enrichment).
  if(typeof dsbFindRow==='function'&&typeof dsbRowPriceIsCurrent==='function'){
    var r=dsbFindRow(symbol);
    if(r&&dsbRowPriceIsCurrent(r)){
      var px=parseFloat(r.price);
      if(isFinite(px)&&px>0)return {price:px,source:'dsb_row_fallback'};
    }
  }
  // 3) final fallback: existing resolver (S.scanData DXLink/row → cache/close, or null).
  var base=(typeof resolveLatestDisplayPrice==='function')
    ? resolveLatestDisplayPrice(symbol, rowData) : {price:null,source:null};
  if(base&&base.price!=null)base={price:base.price,source:'latest_display_fallback'};
  return base; // never breaks chart rendering
}

async function dssEnsureChartLiveQuoteForDisplay(symbol){
  try{
    var sym=(typeof _dsbSafeSym==='function')?_dsbSafeSym(symbol):(symbol||null);
    if(!sym)return;
    // Strict readiness — never call /market/live before the feed/snapshot are ready
    // (and never when the market is closed: keep the DSB row / cached close).
    if(typeof dsbLiveEnrichReadiness==='function'&&!dsbLiveEnrichReadiness().ready){
      if(typeof debugLog==='function')debugLog('candles','[DSS-CHART-LIVE-OPEN] '+sym+' source=dsb_row_fallback (fresh live fetch not ready)');
      return;
    }
    var st=dsbState();
    if(!st.chartLiveQuote)st.chartLiveQuote={inflight:{},at:{},price:{}};
    var g=st.chartLiveQuote;
    if(g.inflight[sym])return;                                   // single-flight per symbol
    if(g.at[sym]!=null&&(Date.now()-g.at[sym])<DSB_CHART_LIVE_TTL_MS)return; // short TTL — no storm on rapid reopens
    g.inflight[sym]=true;
    try{
      if(typeof subscribeDxlinkQuotes==='function'){ try{ await subscribeDxlinkQuotes([sym]); }catch(e){} }
      var px=(typeof fetchLiveQuote==='function')?await fetchLiveQuote(sym):null;
      g.at[sym]=Date.now();                                      // throttle further attempts (success OR miss)
      if(px==null||!isFinite(+px)){
        if(typeof debugLog==='function')debugLog('candles','[DSS-CHART-LIVE-OPEN] '+sym+' source=dsb_row_fallback (fresh quote unavailable)');
        return;                                                  // unavailable → DSB row / close fallback
      }
      var fresh=+(+px).toFixed(4);
      g.price[sym]=fresh;                                        // freshest chart-open price (short-TTL, per symbol)
      // Keep the scanner row consistent (display fields only) + drop the triangle;
      // direction/score/RSI/SMA/RS and candle arrays are never touched.
      var row=(typeof dsbFindRow==='function')?dsbFindRow(sym):null;
      if(row){
        row.price=fresh;
        row.priceIsLive=true;
        row.priceSource='dxlink_live';
        row.priceUpdatedAt=new Date().toISOString();
        row.priceStaleReason=null;
        if(Array.isArray(row.warnings))row.warnings=row.warnings.filter(function(w){return w!=='price_not_live';});
      }
      if(typeof debugLog==='function')debugLog('candles','[DSS-CHART-LIVE-OPEN] '+sym+' source=fresh_live_quote price='+fresh.toFixed(2));
      // Redraw the OPEN detail chart only if still viewing this symbol — both 1D and
      // 4H re-resolve through dssResolveChartLivePrice and end on this fresh price.
      // Preserves the selected symbol, overlays and filters (no chart close / reset).
      if(typeof _dssDetailSymbol!=='undefined'&&_dssDetailSymbol===sym&&typeof _dssRedrawLargeCharts==='function'){
        try{_dssRedrawLargeCharts();}catch(e){}
      }
    }finally{
      g.inflight[sym]=false;
    }
  }catch(e){/* display-only enrichment never throws */}
}

function dsbAutoRefreshActive(){
  try{
    if(typeof ffBackendDirectionalSnapshot==='function'&&!ffBackendDirectionalSnapshot())return false;
    if(typeof _activeView!=='undefined'&&_activeView!=='dashboard')return false;
    if(typeof document!=='undefined'&&document&&document.hidden===true)return false;
    return true;
  }catch(e){return false;}
}

function dsbStartAutoRefresh(){
  if(!dsbAutoRefreshActive())return;
  var st=dsbState();
  if(st.autoRefreshTimerId)return;            // never stack duplicate timers
  st.autoRefreshTimerId=setInterval(function(){
    if(!dsbAutoRefreshActive()){ dsbStopAutoRefresh(); return; }
    dsbFetchSnapshot({force:true});           // single-flight; repaint via completion
    dsbEnrichVisibleRowsLive();               // refresh live prices for visible rows
  },DSB_AUTO_REFRESH_MS);
  // Run once on open: TTL-deduped snapshot kick + a live enrich pass.
  dsbFetchSnapshot();
  dsbEnrichVisibleRowsLive();
}

function dsbStopAutoRefresh(){
  var st=dsbState();
  if(st.autoRefreshTimerId){ clearInterval(st.autoRefreshTimerId); st.autoRefreshTimerId=null; }
  // Leaving the Dashboard / hiding the page also tears down any pending live
  // readiness retry so it cannot fire /market/live off-screen.
  if(typeof dsbCancelLiveEnrichRetry==='function')dsbCancelLiveEnrichRetry();
}

function dsbFindRow(symbol){
  try{
    var sym=_dsbSafeSym(symbol);
    if(!sym)return null;
    var src=dsbGetBackendSource();
    if(!src||!src.rows||!src.rows.length)return null;
    for(var i=0;i<src.rows.length;i++){
      if(src.rows[i]&&src.rows[i].ticker===sym)return src.rows[i];
    }
    return null;
  }catch(e){return null;}
}

function dsbScanRowShim(symbol){
  var r=dsbFindRow(symbol);
  if(!r)return null;
  return {
    ticker:r.ticker,
    name:r.name||r.ticker,
    price:(r.price!=null?String(r.price):null),
    candles:null,
    _priceSource:(r.priceIsLive===true?'DXLink':'BACKEND_SNAPSHOT'),
    _dsbBackendRow:true,
  };
}

function dsbTechnicalStateShim(symbol){
  var r=dsbFindRow(symbol);
  if(!r)return null;
  var price=_dsbNum(r.price);
  var ivr=null,ivrSource='TASTYTRADE_UNAVAILABLE';
  try{
    if(typeof getCanonicalIvr==='function'){
      var c=getCanonicalIvr(r.ticker);
      if(c){ivr=c.ivr;ivrSource=c.source;}
    }
  }catch(e){}
  return {
    ticker:r.ticker,
    price:price,
    priceSource:(r.priceIsLive===true?'DXLink_RTH':'BACKEND_SNAPSHOT'),
    rsi:(r.rsi!=null?+(+r.rsi).toFixed(1):null),
    rsiSource:'backend snapshot 1D',
    ma20:_dsbNum(r.ma20),
    ma30:_dsbNum(r.ma30),
    maSource:'backend snapshot 1D',
    pricevsSma20:(price!=null&&_dsbNum(r.ma20))?+((price-r.ma20)/r.ma20*100).toFixed(2):null,
    sma20AboveSma30:_dsbBool(r.sma20AboveSma30),
    rs:(r.rs!=null?r.rs*100:null),
    rsRising:_dsbBool(r.rsRising),
    squeeze:_dsbBool(r.squeeze),
    ivr:ivr,ivrSource:ivrSource,
    earningsDte:_dsbNum(r.earningsDte),
    earningsSource:(r.earningsDte!=null)?'backend snapshot':'unavailable',
    atrState:'N/A',
    candlesAvailable:false,
    _source:'BACKEND_DIRECTIONAL_SNAPSHOT',
  };
}

function apexDebugBackendDirectionalSnapshot(){
  var st=dsbState();
  var src=dsbGetBackendSource();
  return {
    featureOn:(typeof ffBackendDirectionalSnapshot==='function')?ffBackendDirectionalSnapshot():null,
    sourceMode:dsbSourceMode(),
    endpointSupported:st.endpointSupported,
    lastHttpStatus:st.lastHttpStatus,
    lastFetchAt:st.lastFetchAt,
    fetching:st.fetching,
    error:st.error,
    available:!!(src&&src.available),
    origin:src?src.origin:null,
    reason:src?src.reason:null,
    rowCount:(src&&src.rows)?src.rows.length:0,
    skippedCount:(src&&src.skipped)?src.skipped.length:0,
    generatedAt:src?src.generatedAt:null,
    ageMs:src?src.ageMs:null,
    stale:src?src.stale:null,
    // live-price patching + auto-refresh diagnostics
    autoRefreshActive:(typeof dsbAutoRefreshActive==='function')?dsbAutoRefreshActive():null,
    autoRefreshTimerOn:!!st.autoRefreshTimerId,
    liveEnriching:st.liveEnriching===true,
    lastLiveEnrichAt:st.lastLiveEnrichAt,
    livePriceReason:st.livePriceReason||null,
    liveReadiness:(typeof dsbLiveEnrichReadiness==='function')?(function(){var r=dsbLiveEnrichReadiness();return {ready:r.ready,active:r.active,reason:r.reason};})():null,
    liveRetryPending:!!st.liveRetryTimerId,
    liveEnrichCooldownUntil:st.liveEnrichCooldownUntil||null,
    priceCounts:(function(){
      var c={live:0,recent:0,close:0,unavailable:0};
      var rows=(src&&Array.isArray(src.rows))?src.rows:[];
      rows.forEach(function(r){ var k=(typeof dsbClassifyRowPrice==='function')?dsbClassifyRowPrice(r):'unavailable'; if(c[k]!=null)c[k]++; });
      return c;
    })(),
    rows:src?src.rows:[],
  };
}

function dsbNoteDirectionalChartOpen(symbol,ts){
  try{
    var sym=(typeof _dsbSafeSym==='function')?_dsbSafeSym(symbol):(symbol||null);
    if(!sym)return; // never hint on partial / unsafe input
    var row=(typeof dsbFindRow==='function')?dsbFindRow(sym):null;
    var price=(row&&row.price!=null)?row.price:((ts&&ts.price!=null)?ts.price:null);
    var ctx={
      lastSymbol:sym,
      lastPrice:(typeof price==='number'&&isFinite(price))?price:null,
      lastPriceSource:(row&&row.priceSource)||(ts&&ts.priceSource)||null,
      lastPriceUpdatedAt:(row&&row.priceUpdatedAt)||null,
      lastPriceIsLive:row?row.priceIsLive:null,
      candlesSource:'backend_candle_store',
      timeframes:['1D','4H','30M'],
      openedAt:Date.now()
    };
    dsbState().chartOpenContext=ctx;
    if(typeof postCandleContext==='function'){
      postCandleContext({reason:'directional_chart_open',contextType:'chart',activeSymbol:sym,timeframes:['1D','4H','30M']});
    }
  }catch(e){}
}

function apexDebugDirectionalBackendSnapshot(){
  var st=dsbState();
  var src=(typeof dsbGetBackendSource==='function')?dsbGetBackendSource():null;
  var rows=(src&&Array.isArray(src.rows))?src.rows:[];
  var staleWarnings=[];
  rows.forEach(function(r){
    if(!r)return;
    if(r.stale===true&&staleWarnings.length<20)staleWarnings.push(r.ticker+': stale');
    if(Array.isArray(r.warnings))r.warnings.forEach(function(w){ if(staleWarnings.length<20)staleWarnings.push(r.ticker+': '+w); });
  });
  if(src&&src.stale===true)staleWarnings.push('snapshot: stale');
  return {
    snapshotLoaded:!!(src&&src.available),
    snapshotGeneratedAt:src?src.generatedAt:null,
    endpoint:BACKEND+'/scanner/directional/snapshot',
    resultsCount:rows.length,
    skippedCount:(src&&src.skipped)?src.skipped.length:0,
    symbols:rows.map(function(r){return r&&r.ticker;}),
    lastFetchAt:st.lastFetchAt,
    source:'BACKEND_DIRECTIONAL_SNAPSHOT',
    fallbackUsed:src?(src.available===true&&src.origin!=='directional_snapshot'):null,
    staleWarnings:staleWarnings,
    sampleRows:rows.slice(0,3).map(function(r){return {ticker:r.ticker,direction:r.direction,score:r.score,price:r.price,priceSource:r.priceSource,priceIsLive:r.priceIsLive,stale:r.stale};}),
    chartOpenContext:st.chartOpenContext||null,
  };
}
