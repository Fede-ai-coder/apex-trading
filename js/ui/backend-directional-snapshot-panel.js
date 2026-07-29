// BACKEND DIRECTIONAL SNAPSHOT — PANEL / RENDERING
//
// Classic synchronous script loaded after the DSB adapter and service and before
// the inline monolith.
//
// Owns formatting, controls, row HTML and backend-directional panel rendering.
//
// All shared dependencies are resolved inside function bodies at call time.
// No rendering, DOM access, state access or other execution occurs at load time.

function dsbFmtAge(ms){
  if(typeof bssFmtAgeMs==='function')return bssFmtAgeMs(ms);
  if(ms==null||!isFinite(ms)||ms<0)return '—';
  var s=Math.floor(ms/1000);
  if(s<60)return s+'s';
  var m=Math.floor(s/60);
  if(m<60)return m+'m';
  return Math.floor(m/60)+'h '+(m%60)+'m';
}

function dsbFmtClock(iso){
  if(typeof bssFmtClock==='function')return bssFmtClock(iso);
  if(iso==null||iso==='')return '—';
  var t=(typeof iso==='number')?iso:Date.parse(iso);
  if(!isFinite(t))return '—';
  var d=new Date(t),p=function(n){return (n<10?'0':'')+n;};
  return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
}

function dsbFreshnessBadgeHtml(src){
  if(src.stale===true)return '<span style="font-size:8px;font-family:var(--M);font-weight:800;background:rgba(220,50,50,.15);color:var(--rd);border-radius:3px;padding:1px 5px">STALE</span>';
  if(src.stale===false)return '<span style="font-size:8px;font-family:var(--M);font-weight:800;background:rgba(0,212,138,.12);color:var(--gr);border-radius:3px;padding:1px 5px">FRESH</span>';
  return '<span style="font-size:8px;font-family:var(--M);background:rgba(255,255,255,.06);color:var(--tx3);border-radius:3px;padding:1px 5px">AGE '+escHtml(dsbFmtAge(src.ageMs))+'</span>';
}

function dsbBannerHtml(src,modeCount){
  var total=src.rows.length,liveN=0,recentN=0,closeN=0,naN=0;
  src.rows.forEach(function(r){
    var cls=dsbClassifyRowPrice(r);
    if(cls==='live')liveN++;
    else if(cls==='recent')recentN++;
    else if(cls==='close')closeN++;
    else naN++;
  });
  var nonLive=total-liveN;
  var originLabel=(src.origin==='legacy_operational')?'backend scanner snapshot (legacy)':'backend directional snapshot';
  // Keep the canonical "X live / Y cached/close" line, then a finer breakdown so
  // live / recent-quote / cached-close / unavailable are all distinguishable.
  var reason=null; try{ reason=dsbState().livePriceReason; }catch(e){}
  var html='<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-bottom:5px;line-height:1.7">'+
    '<span style="color:var(--gr)">&#9679;</span> '+escHtml(originLabel)+
    ' &middot; updated '+escHtml(dsbFmtClock(src.generatedAt))+' ('+escHtml(dsbFmtAge(src.ageMs))+' ago) '+dsbFreshnessBadgeHtml(src)+
    ' &middot; '+total+' result'+(total!==1?'s':'')+' ('+modeCount+' '+(_dssMode==='SHORT'?'short':'long')+')'+
    (src.skipped&&src.skipped.length?(' &middot; '+src.skipped.length+' skipped'):'')+
    ' &middot; prices: '+liveN+' live / '+nonLive+' cached/close'+
    ' ('+recentN+' recent &middot; '+closeN+' close &middot; '+naN+' n/a)'+
    ((liveN===0&&reason)?(' &middot; <span style="color:var(--am)" title="why live prices are unavailable">live unavailable: '+escHtml(reason)+'</span>'):'')+
    '</div>';
  if(src.warnings&&src.warnings.length){
    html+='<div style="font-size:8px;font-family:var(--M);color:var(--am);margin-bottom:5px">&#9888; '+
      src.warnings.slice(0,4).map(function(w){return escHtml(String(w));}).join(' &middot; ')+
      (src.warnings.length>4?(' +'+(src.warnings.length-4)):'')+'</div>';
  }
  if(src.skipped&&src.skipped.length){
    var skTxt=src.skipped.slice(0,8).map(function(s){
      return escHtml(s.symbol+(s.reason?(' ('+s.reason+(s.queuedWarmup===true?', warmup queued':'')+')'):''));
    }).join(', ');
    html+='<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-bottom:6px">skipped: '+skTxt+
      (src.skipped.length>8?(' +'+(src.skipped.length-8)):'')+'</div>';
  }
  return html;
}

function dsbControlsHtml(isShort){
  var modeHtml=
    '<div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">'+
    '<span style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-right:2px">MODE</span>'+
    '<button onclick="dssSetMode(\'LONG\')" style="font-size:8px;font-family:var(--M);padding:2px 8px;border-radius:4px;cursor:pointer;'+
      'border:1px solid '+(isShort?'var(--b1)':'var(--pu)')+';background:'+(isShort?'transparent':'rgba(124,111,255,.15)')+';color:'+(isShort?'var(--tx3)':'var(--pu)')+'">LONG</button>'+
    '<button onclick="dssSetMode(\'SHORT\')" style="font-size:8px;font-family:var(--M);padding:2px 8px;border-radius:4px;cursor:pointer;'+
      'border:1px solid '+(isShort?'var(--rd)':'var(--b1)')+';background:'+(isShort?'rgba(220,50,50,.12)':'transparent')+';color:'+(isShort?'var(--rd)':'var(--tx3)')+'">SHORT</button>'+
    '</div>';
  var flagHtml='';
  if(typeof _dssGetFlagFilter==='function'&&typeof _dssSetFlagFilter==='function'){
    var ff=_dssGetFlagFilter();
    var fbtn=function(val,label){
      var on=ff===val;
      return '<button onclick="_dssSetFlagFilter(\''+val+'\')" style="font-size:8px;font-family:var(--M);padding:2px 7px;border-radius:4px;cursor:pointer;'+
        'border:1px solid '+(on?'var(--am)':'var(--b1)')+';background:'+(on?'rgba(240,185,11,.15)':'transparent')+';color:'+(on?'var(--am)':'var(--tx3)')+'">'+label+'</button>';
    };
    flagHtml='<div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">'+
      '<span style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-right:2px">FLAGS</span>'+
      fbtn('all','ALL')+fbtn('flagged','&#9873; FLAGGED')+fbtn('unflagged','UNFLAGGED')+'</div>';
  }
  var srcHtml=
    '<div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;flex-wrap:wrap">'+
    '<span style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-right:2px">SOURCE</span>'+
    '<button onclick="dsbSetSourceMode(\'auto\')" style="font-size:8px;font-family:var(--M);padding:2px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--pu);background:rgba(124,111,255,.15);color:var(--pu)">BACKEND</button>'+
    '<button onclick="dsbSetSourceMode(\'frontend\')" style="font-size:8px;font-family:var(--M);padding:2px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--b1);background:transparent;color:var(--tx3)">FRONTEND</button>'+
    '<button id="dsb-refresh" onclick="dsbRefreshClicked()" title="Re-fetch GET /scanner/directional/snapshot (read-only; never triggers a backend scan run)" '+
      'style="font-size:8px;font-family:var(--M);padding:2px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--b1);background:transparent;color:var(--tx3)">&#x21bb; REFRESH</button>'+
    '</div>';
  return modeHtml+flagHtml+srcHtml;
}

function dsbRowHtml(r,isShort){
  var flagged=(typeof _dssIsFlaggedSymbol==='function')?_dssIsFlaggedSymbol(r.ticker):false;
  var flagIcon=(typeof _dssOnFlagClick==='function')
    ?('<span onclick="return _dssOnFlagClick(event,\''+r.ticker+'\')" title="'+(flagged?'Unflag symbol':'Flag symbol')+'" '+
      'style="cursor:pointer;font-size:10px;margin-right:4px;color:'+(flagged?'var(--am)':'var(--tx3)')+';opacity:'+(flagged?'1':'.55')+'">&#9873;</span>')
    :'';
  var warnIcon=(r.warnings&&r.warnings.length)
    ?('<span title="'+escHtml(r.warnings.join('; '))+'" style="color:var(--am);font-size:8px;margin-left:3px">&#9888;</span>')
    :'';
  var live=r.priceIsLive===true;
  var priceCls=dsbClassifyRowPrice(r);
  var priceCurrent=(priceCls==='live'||priceCls==='recent');
  var pTitle='Last price source: '+(r.priceSource||'backend')+
    (r.priceUpdatedAt?(' · updated '+r.priceUpdatedAt):'')+
    (live?' · LIVE':(priceCls==='recent'?' · recent quote':' · not live'))+
    (r.priceStaleReason?(' · '+r.priceStaleReason):'');
  var priceDot='<span style="color:'+(priceCurrent?'var(--gr)':'var(--tx3)')+';font-size:7px" title="'+escHtml(pTitle)+'">&#9679;</span>';
  // Price-freshness warning triangle: shown ONLY while the row is NOT using a
  // live/current price (cleared automatically once a live mark is patched in).
  var priceWarn=priceCurrent?'':('<span title="Price not live — '+escHtml(priceCls==='unavailable'?'no price available':('using '+(r.priceSource||'cached/close')))+'" style="color:var(--am);font-size:8px;margin-left:2px">&#9888;</span>');
  var staleMark=r.stale===true?'<span style="color:var(--am);font-size:8px" title="Backend marks this row stale">!</span>':'';
  var priceStr=(r.price!=null)?('$'+(+r.price).toFixed(2)):'—';
  var sc=_dsbNum(r.score);
  var scColor=sc==null?'var(--tx3)':sc>=70?'var(--gr)':sc>=45?'var(--am)':'var(--rd)';
  var rsiStr=(r.rsi!=null)?String(Math.round(r.rsi*10)/10):'—';
  var rsiColor=(r.rsi==null)?'var(--tx3)':isShort?(r.rsi<30?'var(--am)':'var(--gr)'):(r.rsi>70?'var(--am)':'var(--gr)');
  var smaOk=isShort?(r.sma20AboveSma30===false):(r.sma20AboveSma30===true);
  var smaBad=isShort?(r.sma20AboveSma30===true):(r.sma20AboveSma30===false);
  var smaCell=smaOk?('<span style="color:'+(isShort?'var(--rd)':'var(--gr)')+'">&#10003;</span>')
    :smaBad?'<span style="color:var(--am)" title="SMA20/SMA30 relation disagrees with direction">&#10007;</span>'
    :'<span style="color:var(--tx3)">—</span>';
  var rsArrow=r.rsRising===true?' <span style="color:var(--gr)">&#8593;</span>':r.rsRising===false?' <span style="color:var(--rd)">&#8595;</span>':'';
  var rsLabel=(r.rs!=null)?(((r.rs>=0?'+':'')+(Math.round(r.rs*1000)/10))+'%'+rsArrow):'—';
  var ivrStr='N/A';
  try{
    if(typeof getCanonicalIvr==='function'){
      var civ=getCanonicalIvr(r.ticker);
      if(civ&&civ.source==='TASTYTRADE'&&civ.ivr!=null&&isFinite(civ.ivr))ivrStr=Math.round(civ.ivr)+'%';
    }
  }catch(e){}
  var dteStr=(r.earningsDte!=null&&r.earningsDte>=0)?(r.earningsDte+'d'):'—';
  var t4=r.tf4h,t4Cell='<span style="color:var(--tx3)">—</span>';
  if(t4&&(t4.count!=null||t4.source!=null)){
    t4Cell=String(t4.count!=null?t4.count:'?');
    if(t4.derivedFrom30M===true)t4Cell+='<span style="color:var(--bl)" title="4H derived server-side from 30M'+(t4.derivationReason?(': '+escHtml(t4.derivationReason)):'')+'">&middot;D</span>';
    if(t4.stale===true)t4Cell+='<span style="color:var(--am)" title="4H data stale">!</span>';
  }
  return '<tr data-ticker="'+r.ticker+'" onclick="openDirectionalSetupDetail(\''+r.ticker+'\')" title="'+escHtml(r.name||r.ticker)+'">'+
    '<td>'+flagIcon+escHtml(r.ticker)+warnIcon+'</td>'+
    '<td style="color:var(--tx2)">'+priceDot+priceStr+priceWarn+staleMark+'</td>'+
    '<td style="color:'+scColor+'">'+(sc!=null?Math.round(sc):'—')+'</td>'+
    '<td style="color:'+rsiColor+'">'+rsiStr+'</td>'+
    '<td>'+smaCell+'</td>'+
    '<td style="color:var(--tx2)">'+rsLabel+'</td>'+
    '<td>'+ivrStr+'</td>'+
    '<td style="color:'+(r.earningsDte!=null&&r.earningsDte>=0&&r.earningsDte<=14?'var(--am)':'var(--tx2)')+'">'+dteStr+'</td>'+
    '<td style="font-size:8px;color:var(--tx3)">'+t4Cell+'</td>'+
    '</tr>';
}

function dsbRenderBackendDirectional(src){
  var mode=_dssMode,isShort=mode==='SHORT';
  var modeRows=dsbRowsForMode(src.rows,mode);
  var modeCount=modeRows.length;
  var candidates=(typeof _dssApplyFlagFilter==='function')?_dssApplyFlagFilter(modeRows):modeRows;
  candidates=(typeof _dssApplySort==='function')?_dssApplySort(candidates):candidates;
  _dssCandidateList=candidates.map(function(r){return r.ticker;});

  var header=dsbControlsHtml(isShort)+dsbBannerHtml(src,modeCount);
  var html;
  if(!candidates.length){
    html=header+
      '<div style="padding:12px 0;font-size:10px;color:var(--tx2);text-align:center">No backend directional candidates for the current mode/filters.<br>'+
      '<span style="font-size:9px;font-family:var(--M);color:var(--tx3)">Direction, score and filters are computed backend-side from the backend candle store.</span></div>';
  }else{
    var rowsHtml=candidates.map(function(r){return dsbRowHtml(r,isShort);}).join('');
    var smaColLabel=isShort?'20&lt;30':'20&gt;30';
    var thFn=(typeof _dssTh==='function')?_dssTh:function(col,label){return '<th>'+label+'</th>';};
    html=header+
      '<div style="font-size:9px;font-family:var(--M);color:var(--tx3);margin-bottom:6px">'+candidates.length+' setup'+(candidates.length!==1?'s':'')+' &middot; click to inspect</div>'+
      '<div class="dss-tbl-scroll"><table class="dss-tbl">'+
      '<thead><tr>'+
      '<th>SYM</th>'+thFn('price','PRICE')+'<th>SCORE</th>'+thFn('rsi','RSI')+'<th>'+smaColLabel+'</th>'+thFn('rs','REL STR')+thFn('ivr','IVR')+thFn('earn','EARN')+'<th>4H</th>'+
      '</tr></thead>'+
      '<tbody>'+rowsHtml+'</tbody></table></div>';
  }
  var hdrEl=document.getElementById('panelHeader');
  if(hdrEl)hdrEl.textContent='DIRECTIONAL SCANNER';
  var ct=document.getElementById('panelContent');
  if(ct)ct.innerHTML=html;
  // Visible backend-driven rows changed → prewarm the visible setups (hint only).
  try{postCandleContext({reason:'visible_rows_change',contextType:'visible_scanner',scanner:'directional',visibleSymbols:candidates.map(function(r){return r.ticker;}),timeframes:['1D','30M','4H']});}catch(e){}
}

function dsbMaybeRenderBackendDirectional(){
  try{
    if(typeof ffBackendDirectionalSnapshot==='function'&&!ffBackendDirectionalSnapshot())return false;
    if(dsbSourceMode()==='frontend')return false;
    dsbFetchSnapshot(); // TTL-deduped kick; repaint arrives via fetch completion
    var src=dsbGetBackendSource();
    if(!src||src.available!==true)return false;
    dsbRenderBackendDirectional(src);
    // Visible rows are now known → patch them with live marks (TTL-guarded, so
    // repeated renders/tab switches never start a quote storm).
    try{ dsbEnrichVisibleRowsLive(); }catch(e){}
    return true;
  }catch(e){return false;}
}

function dsbSourceNoticeHtml(){
  try{
    if(typeof ffBackendDirectionalSnapshot==='function'&&!ffBackendDirectionalSnapshot())return '';
    var src=dsbGetBackendSource();
    var btn=function(label,call){
      return '<button onclick="'+call+'" style="font-size:8px;font-family:var(--M);padding:1px 6px;border-radius:4px;cursor:pointer;border:1px solid var(--b1);background:transparent;color:var(--tx3)">'+label+'</button>';
    };
    if(dsbSourceMode()==='frontend'){
      return '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-bottom:6px">SOURCE: frontend scan data'+
        (src&&src.available?' &middot; backend snapshot available ':' ')+btn('USE BACKEND',"dsbSetSourceMode('auto')")+'</div>';
    }
    var reason=src?src.reason:'no_snapshot';
    var txt=
      reason==='fetching'?'loading backend snapshot…':
      reason==='endpoint_unsupported'?'backend endpoint not deployed':
      reason==='diagnostic_only'?'backend snapshot is diagnostic-only (no operational direction yet)':
      reason==='fetch_error'?('fetch failed: '+(dsbState().error||'unknown')):
      reason==='no_snapshot'?'no backend snapshot yet':
      String(reason||'unavailable');
    return '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-bottom:6px">BACKEND SOURCE UNAVAILABLE — '+escHtml(txt)+
      ' &middot; using frontend scan data <button id="dsb-refresh" onclick="dsbRefreshClicked()" style="font-size:8px;font-family:var(--M);padding:1px 6px;border-radius:4px;cursor:pointer;border:1px solid var(--b1);background:transparent;color:var(--tx3)">&#x21bb; RETRY</button></div>';
  }catch(e){return '';}
}
