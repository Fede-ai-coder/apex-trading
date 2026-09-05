// ═══════════════════════════════════════════════════════════════
// BACKEND CANDLE STORE CHART EXPERIMENT (feature-flagged)
// ═══════════════════════════════════════════════════════════════
var APEX_FF_BACKEND_CANDLE_STORE_CHART = 'apex_ff_backend_candle_store_chart';
var _BACKEND_CANDLE_STORE_CHART_SOURCE = {
  BACKEND: 'BACKEND_CANDLE_STORE',
  FALLBACK: 'CURRENT_FALLBACK'
};
var _BACKEND_CANDLE_STORE_CHART_TF = {
  '1D':  { backendTimeframe: '1D',  limit: 300, minRequired: 50 },
  '30M': { backendTimeframe: '30M', limit: 500, minRequired: 50 },
  '4H':  { backendTimeframe: '4H',  limit: 300, minRequired: 20 }
};

function ffBackendCandleStoreChart() {
  try { return localStorage.getItem(APEX_FF_BACKEND_CANDLE_STORE_CHART) === '1'; }
  catch (e) { return false; }
}

function _backendCandleStoreChartTimeframe(tf) {
  var t = String(tf || '1D').trim().toUpperCase().replace(/\s+/g, '');
  return _BACKEND_CANDLE_STORE_CHART_TF[t] ? t : '1D';
}

function _backendCandleStoreChartLog(eventName, diag) {
  diag = diag || {};
  console.log('[CANDLE_STORE_CHART] ' + eventName, {
    symbol: diag.symbol || null,
    timeframe: diag.timeframe || null,
    source: diag.source || null,
    backendCount: diag.backendCount != null ? diag.backendCount : 0,
    minRequired: diag.minRequired != null ? diag.minRequired : null,
    usedBackend: diag.usedBackend === true,
    fallbackReason: diag.fallbackReason || null,
    missingReason: diag.missingReason || null,
    lastTimestamp: diag.lastTimestamp || null,
    derivation: diag.derivation || null
  });
}

function _backendCandleStoreChartNormTime(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') {
    if (!isFinite(raw) || raw <= 0) return null;
    return raw < 1e12 ? Math.round(raw * 1000) : Math.round(raw);
  }
  var s = String(raw).trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    var n = parseFloat(s);
    if (!isFinite(n) || n <= 0) return null;
    return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
  }
  var ms = Date.parse(s);
  return isFinite(ms) ? ms : null;
}

function _backendCandleStoreChartNormCandle(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var t = _backendCandleStoreChartNormTime(
    raw.time != null ? raw.time :
    raw.timestamp != null ? raw.timestamp :
    raw.t != null ? raw.t :
    raw.date != null ? raw.date :
    raw.datetime != null ? raw.datetime : null
  );
  var o = parseFloat(raw.open != null ? raw.open : raw.o);
  var h = parseFloat(raw.high != null ? raw.high : raw.h);
  var l = parseFloat(raw.low != null ? raw.low : raw.l);
  var c = parseFloat(raw.close != null ? raw.close : raw.c);
  var v = parseFloat(raw.volume != null ? raw.volume : raw.v);
  if (t == null || !isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c)) return null;
  return { time: t, timestamp: t, open: o, high: h, low: l, close: c, volume: isFinite(v) ? v : 0 };
}

function _backendCandleStoreChartExtractDerivation(json) {
  if (!json || typeof json !== 'object') return null;
  return json.derivation || json.derivedFrom || json.aggregation ||
    (json.diagnostics && (json.diagnostics.derivation || json.diagnostics.derivedFrom)) || null;
}

async function ensureBackendCandleStoreSymbol(symbol, timeframes) {
  var sym = String(symbol || '').trim().toUpperCase();
  var tfs = Array.isArray(timeframes) && timeframes.length ? timeframes : ['1D', '30M', '4H'];
  if (!ffBackendCandleStoreChart()) return { ok: false, missingReason: 'feature_flag_off' };
  _backendCandleStoreChartLog('ensure_started', { symbol: sym, timeframe: tfs.join(','), usedBackend: false });
  try {
    var json = await ttCall('/market/candles/ensure', {
      method: 'POST',
      body: { symbol: sym, timeframes: tfs, reason: 'chart_opened' }
    });
    _backendCandleStoreChartLog('ensure_result', {
      symbol: sym,
      timeframe: tfs.join(','),
      backendCount: json && json.count,
      usedBackend: !!(json && json.ok),
      missingReason: json && json.missingReason,
      lastTimestamp: json && json.lastTimestamp,
      derivation: json && json.derivation
    });
    return json || { ok: false, missingReason: 'empty_response' };
  } catch (e) {
    _backendCandleStoreChartLog('ensure_error', { symbol: sym, timeframe: tfs.join(','), usedBackend: false, fallbackReason: (e && e.message) || String(e) });
    return { ok: false, missingReason: 'ensure_error', error: (e && e.message) || String(e) };
  }
}

async function fetchBackendCandleStoreCandles(symbol, timeframe, limit) {
  var sym = String(symbol || '').trim().toUpperCase();
  var tf = _backendCandleStoreChartTimeframe(timeframe);
  var cfg = _BACKEND_CANDLE_STORE_CHART_TF[tf];
  var lim = limit || cfg.limit;
  if (!ffBackendCandleStoreChart()) return { ok: false, source: _BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND, candles: [], count: 0, missingReason: 'feature_flag_off', derivation: null, lastTimestamp: null };
  try {
    var json = await ttCall('/market/candles?symbol=' + encodeURIComponent(sym) + '&timeframe=' + encodeURIComponent(cfg.backendTimeframe) + '&limit=' + encodeURIComponent(lim));
    if (!json || json.ok !== true) {
      return { ok: false, source: _BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND, candles: [], count: 0, missingReason: (json && (json.missingReason || json.reason)) || 'backend_not_ok', derivation: _backendCandleStoreChartExtractDerivation(json), lastTimestamp: json && json.lastTimestamp };
    }
    if (!Array.isArray(json.candles)) {
      return { ok: false, source: _BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND, candles: [], count: 0, missingReason: 'candles_not_array', derivation: _backendCandleStoreChartExtractDerivation(json), lastTimestamp: json.lastTimestamp || null };
    }
    var candles = json.candles.map(_backendCandleStoreChartNormCandle).filter(Boolean).sort(function(a, b) { return a.timestamp - b.timestamp; });
    var last = candles.length ? candles[candles.length - 1].timestamp : (json.lastTimestamp || null);
    return {
      ok: true,
      source: _BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND,
      candles: candles,
      count: candles.length,
      missingReason: json.missingReason || null,
      derivation: _backendCandleStoreChartExtractDerivation(json),
      lastTimestamp: last
    };
  } catch (e) {
    return { ok: false, source: _BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND, candles: [], count: 0, missingReason: 'fetch_error:' + ((e && e.message) || String(e)), derivation: null, lastTimestamp: null };
  }
}

async function fetchBackendCandleStoreReadiness(symbol) {
  var sym = String(symbol || '').trim().toUpperCase();
  if (!ffBackendCandleStoreChart()) return { ok: false, missingReason: 'feature_flag_off' };
  try { return await ttCall('/market/candles/readiness?symbol=' + encodeURIComponent(sym)); }
  catch (e) { return { ok: false, missingReason: 'readiness_error:' + ((e && e.message) || String(e)) }; }
}

function _backendCandleStoreChartToMainCandles(candles) {
  return (candles || []).map(function(c) {
    return { t: Math.round(c.timestamp / 1000), o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume || 0 };
  });
}

async function _tryBackendCandleStoreChart(symbol, timeframe) {
  var tf = _backendCandleStoreChartTimeframe(timeframe);
  var cfg = _BACKEND_CANDLE_STORE_CHART_TF[tf];
  _backendCandleStoreChartLog('flag_on', { symbol: symbol, timeframe: tf, minRequired: cfg.minRequired, usedBackend: false });
  _backendCandleStoreChartLog('backend_fetch_started', { symbol: symbol, timeframe: tf, minRequired: cfg.minRequired, usedBackend: false });
  var r = await fetchBackendCandleStoreCandles(symbol, tf, cfg.limit);
  var backendCount = r && r.count ? r.count : 0;
  var okToUse = !!(r && r.ok && Array.isArray(r.candles) && backendCount >= cfg.minRequired);
  var fallbackReason = okToUse ? null : (r && r.missingReason) || ('insufficient_backend_candles:' + backendCount);
  _backendCandleStoreChartLog('backend_fetch_result', {
    symbol: symbol, timeframe: tf, source: r && r.source, backendCount: backendCount,
    minRequired: cfg.minRequired, usedBackend: okToUse, fallbackReason: fallbackReason,
    missingReason: r && r.missingReason, lastTimestamp: r && r.lastTimestamp,
    derivation: tf === '4H' ? (r && r.derivation) : null
  });
  if (!okToUse) return { ok: false, source: _BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK, fallbackReason: fallbackReason, backend: r, timeframe: tf };
  return { ok: true, source: _BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND, candles: r.candles, count: backendCount, lastTimestamp: r.lastTimestamp, derivation: r.derivation, timeframe: tf, minRequired: cfg.minRequired };
}

// ═══════════════════════════════════════════════════════════════
// CHART
// ═══════════════════════════════════════════════════════════════
var CHART_STATE={ticker:null,candles:[],period:90,charts:[],timeframe:'1D',candleSourceDiagnostic:null,displayPrice:null};
function setBackendCandleStoreChartTimeframe(timeframe){
  CHART_STATE.timeframe=_backendCandleStoreChartTimeframe(timeframe);
  if(ffBackendCandleStoreChart()&&CHART_STATE.ticker) openChart(CHART_STATE.ticker);
  return CHART_STATE.timeframe;
}
window.apexSetBackendCandleStoreChartTimeframe=setBackendCandleStoreChartTimeframe;
function closeChart(){document.getElementById('chartWrap').style.display='none';CHART_STATE.charts.forEach(function(c){try{c.destroy();}catch(e){}});CHART_STATE.charts=[];}
async function openChart(ticker){
  var d=S.scanData.find(function(x){return x.ticker===ticker;});if(!d){showToast('No data for '+ticker,'warn');return;}
  // Resolve the single latest display price ONCE (same DXLink-mark-in-session /
  // last-RTH-close truth used by the scanner row, DSS, RS and MCX charts). The
  // header AND the plotted price line both reconcile to this value, so the main
  // "\u25bd CHART" can never show a header price that disagrees with where the line
  // ends. Falls back to the raw row price when the helper is unavailable.
  var _disp=(typeof resolveLatestDisplayPrice==='function')?resolveLatestDisplayPrice(ticker,d):null;
  var _dispPx=_disp?parseFloat(_disp.price):NaN;
  CHART_STATE.displayPrice=(isFinite(_dispPx)&&_dispPx>0)?_dispPx:null;
  document.getElementById('chartTitle').textContent=ticker+' \u2014 $'+(CHART_STATE.displayPrice!=null?CHART_STATE.displayPrice.toFixed(2):d.price);
  document.getElementById('chartSub').textContent='Score: '+d.score+'/100 \u00b7 '+d.signal+' \u00b7 RSI: '+d.rsi+' \u00b7 HVR: '+d.hvRank+'%';
  document.getElementById('chartWrap').style.display='block';
  document.getElementById('chartContainer').innerHTML='<div class="empty"><div class="big" style="animation:spin 1s linear infinite;display:inline-block">&#x27F3;</div><br>Loading chart...</div>';
  document.getElementById('chartWrap').scrollIntoView({behavior:'smooth'});
  CHART_STATE.ticker=ticker;CHART_STATE.charts.forEach(function(c){try{c.destroy();}catch(e){}});CHART_STATE.charts=[];
  // Prewarm priority: opening a chart needs 1D/30M/4H (4H derives from 30M) + SPY benchmark.
  try{postCandleContext({reason:'chart_open',contextType:'chart',activeSymbol:ticker,timeframes:['1D','30M','4H']});}catch(e){}
  CHART_STATE.candleSourceDiagnostic={source:_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK,count:0,lastTimestamp:null,fallbackReason:null};
  if(ffBackendCandleStoreChart()){
    var _bcscTf=_backendCandleStoreChartTimeframe(CHART_STATE.timeframe||'1D');
    ensureBackendCandleStoreSymbol(ticker,['1D','30M','4H']); // fire-and-forget: non-blocking ensure, errors handled internally
    try{ fetchBackendCandleStoreReadiness(ticker).catch(function(){}); }catch(e){}
    try{
      var _bcsc=await _tryBackendCandleStoreChart(ticker,_bcscTf);
      if(CHART_STATE.ticker!==ticker)return; // browsed to another chart mid-fetch
      if(_bcsc&&_bcsc.ok){
        CHART_STATE.candles=_backendCandleStoreChartToMainCandles(_bcsc.candles);
        CHART_STATE.candleSourceDiagnostic={source:_BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND,count:_bcsc.count,lastTimestamp:_bcsc.lastTimestamp,fallbackReason:null,derivation:_bcsc.derivation,timeframe:_bcsc.timeframe};
        _backendCandleStoreChartLog('backend_used',{symbol:ticker,timeframe:_bcsc.timeframe,source:_BACKEND_CANDLE_STORE_CHART_SOURCE.BACKEND,backendCount:_bcsc.count,minRequired:_bcsc.minRequired,usedBackend:true,lastTimestamp:_bcsc.lastTimestamp,derivation:_bcsc.timeframe==='4H'?_bcsc.derivation:null});
        await renderCharts();
        return;
      }
      CHART_STATE.candleSourceDiagnostic={source:_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK,count:(_bcsc&&_bcsc.backend&&_bcsc.backend.count)||0,lastTimestamp:(_bcsc&&_bcsc.backend&&_bcsc.backend.lastTimestamp)||null,fallbackReason:(_bcsc&&_bcsc.fallbackReason)||'backend_unavailable',timeframe:_bcscTf};
      _backendCandleStoreChartLog('fallback_used',{symbol:ticker,timeframe:_bcscTf,source:_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK,backendCount:CHART_STATE.candleSourceDiagnostic.count,minRequired:_BACKEND_CANDLE_STORE_CHART_TF[_bcscTf].minRequired,usedBackend:false,fallbackReason:CHART_STATE.candleSourceDiagnostic.fallbackReason,missingReason:_bcsc&&_bcsc.backend&&_bcsc.backend.missingReason,lastTimestamp:CHART_STATE.candleSourceDiagnostic.lastTimestamp,derivation:_bcscTf==='4H'&&_bcsc&&_bcsc.backend?_bcsc.backend.derivation:null});
    }catch(e){
      CHART_STATE.candleSourceDiagnostic={source:_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK,count:0,lastTimestamp:null,fallbackReason:'backend_store_error:'+((e&&e.message)||e),timeframe:_bcscTf};
      _backendCandleStoreChartLog('fallback_used',{symbol:ticker,timeframe:_bcscTf,source:_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK,backendCount:0,minRequired:_BACKEND_CANDLE_STORE_CHART_TF[_bcscTf].minRequired,usedBackend:false,fallbackReason:CHART_STATE.candleSourceDiagnostic.fallbackReason});
    }
  }
  // CANDLE SOURCE POLICY (cap relief): default → prefer backend DXLink candles
  // (GET /dev/market/candles-dxlink/:symbol?timeframe=1D) for the main daily chart.
  // The main chart never opened a browser Candle subscription (it used Railway/Yahoo
  // via fetchCandles), so the legacy fetchCandles path remains the fallback.
  if(ffPreferBackendCandlesForCharts()){
    try{
      var _mcbk=await _loadBackendChartCandles(ticker);
      if(CHART_STATE.ticker!==ticker)return; // browsed to another chart mid-fetch
      if(_mcbk&&_mcbk.ok&&_mcbk.candles1d&&_mcbk.candles1d.length>=20){
        CHART_STATE.candles=_mainChartMapBackendCandles(_mcbk.candles1d);
        _recordBackendCandleProvenance('main_chart',ticker,
          _mcbk.candles1d?_mcbk.candles1d.length:0,_mcbk.candles4h?_mcbk.candles4h.length:0,_mcbk.diag4h);
        await renderCharts();
        return;
      }
      console.warn('[MAIN-CHART][BACKEND-CANDLES] fallback ticker='+ticker+' reason='+((_mcbk&&_mcbk.fallbackReason)||'unknown'));
    }catch(e){ console.warn('[MAIN-CHART][BACKEND-CANDLES] fallback ticker='+ticker+' reason=threw:'+((e&&e.message)||e)); }
    _recordCandleProvenance('backend_unavailable',{symbol:ticker,view:'main_chart',detail:'using_legacy_yahoo_path'});
  }
  if(d.candles&&d.candles.length){CHART_STATE.candles=d.candles;CHART_STATE.candleSourceDiagnostic=Object.assign({},CHART_STATE.candleSourceDiagnostic||{},{source:_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK,count:d.candles.length,fallbackReason:(CHART_STATE.candleSourceDiagnostic&&CHART_STATE.candleSourceDiagnostic.fallbackReason)||'current_pipeline_scan_data'});await renderCharts();}
  else{try{console.log('[CandleAudit] Chart on-demand requesting candles', { ticker: ticker, reason: 'openChart' }); CHART_STATE.candles=await fetchCandles(ticker);CHART_STATE.candleSourceDiagnostic=Object.assign({},CHART_STATE.candleSourceDiagnostic||{},{source:_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK,count:CHART_STATE.candles.length,fallbackReason:(CHART_STATE.candleSourceDiagnostic&&CHART_STATE.candleSourceDiagnostic.fallbackReason)||'current_pipeline_fetchCandles'});await renderCharts();}catch(e){document.getElementById('chartContainer').innerHTML='<div class="empty"><div class="big">&#x2715;</div>'+e.message+'</div>';}}
}
// Map shared backend candle shape ({time:ms,open,high,low,close,volume}) to the
// main chart's CHART_STATE shape ({t:seconds,o,h,l,c,v}) used by renderCharts().
function _mainChartMapBackendCandles(candles1d){
  return (candles1d||[]).map(function(c){
    return {t:Math.round((c.time!=null?c.time:0)/1000),o:c.open,h:c.high,l:c.low,c:c.close,v:c.volume||0};
  });
}
// Short-key ({t,o,h,l,c,v}) sibling of patchLastCandleWithLivePrice for the main
// chart candle shape: reconcile the FINAL candle's close to the resolved display
// price so the plotted price line ends on the same value shown in the header.
// Pure (returns a NEW array; input never mutated); clamps high/low around the new
// close. Accepts a finite, strictly-positive price ONLY and no-ops (returns input
// untouched) on empty input, a non-positive/non-finite price, or a price already
// equal to the last close — so it can never paint null/NaN/stale values.
function _mainChartPatchLastClose(candles,livePrice){
  if(!candles||!candles.length)return candles;
  var live=parseFloat(livePrice);
  if(!isFinite(live)||live<=0)return candles;
  var last=candles[candles.length-1];
  if(!last)return candles;
  var lc=parseFloat(last.c);
  if(isFinite(lc)&&Math.abs(live-lc)<0.001)return candles; // already current
  var hi=parseFloat(last.h),lo=parseFloat(last.l);
  var patched=Object.assign({},last,{
    c:live,
    h:Math.max(isFinite(hi)?hi:live,live),
    l:Math.min(isFinite(lo)?lo:live,live)
  });
  return candles.slice(0,-1).concat([patched]);
}
function setChartPeriod(el,days){document.querySelectorAll('#cp90,#cp180,#cp252').forEach(function(b){b.classList.remove('on');});el.classList.add('on');CHART_STATE.period=days;if(CHART_STATE.candles.length)renderCharts();}
async function renderCharts(){
  var candles=CHART_STATE.candles,period=CHART_STATE.period;
  // Parity: end the plotted price line on the resolved display price shown in the
  // header (see openChart). No-op outside RTH / when no live price is resolved —
  // resolveLatestDisplayPrice yields the last RTH close there, so this never
  // fabricates after-hours/pre-market movement.
  if(CHART_STATE.displayPrice!=null)candles=_mainChartPatchLastClose(candles,CHART_STATE.displayPrice);
  var slice=candles.slice(-period);if(!slice.length)return;
  var container=document.getElementById('chartContainer');
  CHART_STATE.charts.forEach(function(c){try{c.destroy();}catch(e){}});CHART_STATE.charts=[];
  var d=S.scanData.find(function(x){return x.ticker===CHART_STATE.ticker;});
  if(ffBackendCandleStoreChart()){
    var _diag=CHART_STATE.candleSourceDiagnostic||{};
    var _sub=document.getElementById('chartSub');
    if(_sub&&d){
      _sub.textContent='Score: '+d.score+'/100 · '+d.signal+' · RSI: '+d.rsi+' · HVR: '+d.hvRank+'% · source: '+(_diag.source||_BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK)+' · count: '+(_diag.count || (CHART_STATE.candles ? CHART_STATE.candles.length : 0))+' · lastTimestamp: '+(_diag.lastTimestamp||'n/a')+(_diag.fallbackReason?' · fallbackReason: '+_diag.fallbackReason:'');
    }
  }
  var earningsHtml='';
  if(d&&d.nextEarnings){var dl=Math.round((new Date(d.nextEarnings)-Date.now())/86400000);var uc=dl<=7?'var(--rd)':dl<=21?'var(--am)':'var(--gr)';earningsHtml='<div class="chart-card" style="border-color:'+uc+'"><div class="chart-card-title" style="color:'+uc+'">EARNINGS</div><div style="font-size:13px;font-weight:700">'+d.nextEarnings+'</div><div style="font-size:11px;color:var(--tx2);margin-top:4px">tra <strong style="color:'+uc+'">'+dl+' giorni</strong></div></div>';}
  container.innerHTML='<div class="chart-card"><div class="chart-card-title">PRICE &middot; MA20 &middot; MA50 &middot; BOLLINGER BANDS</div><div style="position:relative;height:300px"><canvas id="cPrice"></canvas></div></div><div class="chart-card"><div class="chart-card-title">RSI (14) &mdash; Oversold &lt;30 &middot; Overbought &gt;70</div><div style="position:relative;height:130px"><canvas id="cRSI"></canvas></div></div><div class="chart-card"><div class="chart-card-title">VOLUME</div><div style="position:relative;height:100px"><canvas id="cVol"></canvas></div></div>'+earningsHtml;
  await new Promise(function(r){setTimeout(r,50);});
  var labels=slice.map(function(c){var dt=new Date(c.t*1000);return dt.toLocaleDateString('it-IT',{month:'2-digit',day:'2-digit'});});
  var closes=slice.map(function(c){return c.c;}),highs=slice.map(function(c){return c.h;}),lows=slice.map(function(c){return c.l;}),vols=slice.map(function(c){return c.v||0;});
  function sma2(arr,p){return arr.map(function(_,i){if(i<p-1)return null;return arr.slice(i-p+1,i+1).reduce(function(a,b){return a+b;},0)/p;});}
  var bm=sma2(closes,20);
  var bu=closes.map(function(_,i){if(!bm[i])return null;var s=closes.slice(Math.max(0,i-19),i+1),m=bm[i],st=Math.sqrt(s.reduce(function(a,v){return a+(v-m)*(v-m);},0)/s.length);return m+2*st;});
  var bl=closes.map(function(_,i){if(!bm[i])return null;var s=closes.slice(Math.max(0,i-19),i+1),m=bm[i],st=Math.sqrt(s.reduce(function(a,v){return a+(v-m)*(v-m);},0)/s.length);return m-2*st;});
  var ma20=sma2(closes,20),ma50=sma2(closes,50);
  var rsiArr=(function(c,p){var g=[],l=[];for(var i=1;i<c.length;i++){var dv=c[i]-c[i-1];g.push(dv>0?dv:0);l.push(dv<0?-dv:0);}return c.map(function(_,i){if(i<p)return null;var ag=g.slice(i-p,i).reduce(function(x,y){return x+y;},0)/p,al=l.slice(i-p,i).reduce(function(x,y){return x+y;},0)/p;return al===0?100:100-(100/(1+ag/al));});})(closes,14);
  var gc='rgba(255,255,255,.05)',tc='#8888a8',pu='#7c6fff',gr='#00d48a',rd='#ff4d6a',am='#ffb340',bl2='#4da6ff';
  var bOpts={responsive:true,maintainAspectRatio:false,animation:{duration:400},plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a24',borderColor:'rgba(255,255,255,.1)',borderWidth:1,titleColor:'#e8e8f0',bodyColor:'#8888a8',padding:8}},scales:{x:{grid:{color:gc},ticks:{color:tc,maxTicksLimit:10,font:{size:9}}},y:{grid:{color:gc},ticks:{color:tc,font:{size:9}},position:'right'}}};
  var priceCtx=document.getElementById('cPrice').getContext('2d');
  CHART_STATE.charts.push(new Chart(priceCtx,{type:'line',data:{labels:labels,datasets:[{label:'Price',data:closes,borderColor:pu,borderWidth:1.5,pointRadius:0,fill:false,tension:0.1,order:1},{label:'MA20',data:ma20,borderColor:am,borderWidth:1,pointRadius:0,fill:false,tension:0.1,order:2},{label:'MA50',data:ma50,borderColor:bl2,borderWidth:1,pointRadius:0,fill:false,tension:0.1,order:3},{label:'BB Upper',data:bu,borderColor:'rgba(0,212,138,.4)',borderWidth:0.8,pointRadius:0,fill:false,borderDash:[3,3],tension:0.1,order:4},{label:'BB Lower',data:bl,borderColor:'rgba(0,212,138,.4)',borderWidth:0.8,pointRadius:0,fill:'+1',backgroundColor:'rgba(0,212,138,.04)',borderDash:[3,3],tension:0.1,order:5},{label:'High',data:highs,borderColor:'rgba(255,255,255,.05)',borderWidth:0.5,pointRadius:0,fill:false,tension:0.1,order:6},{label:'Low',data:lows,borderColor:'rgba(255,255,255,.05)',borderWidth:0.5,pointRadius:0,fill:'-1',backgroundColor:'rgba(255,255,255,.02)',tension:0.1,order:7}]},options:Object.assign({},bOpts,{plugins:Object.assign({},bOpts.plugins,{tooltip:Object.assign({},bOpts.plugins.tooltip,{callbacks:{label:function(ctx){if(ctx.dataset.label==='Price')return 'Price: $'+ctx.parsed.y.toFixed(2);if(ctx.dataset.label==='MA20')return 'MA20: $'+ctx.parsed.y.toFixed(2);if(ctx.dataset.label==='MA50')return 'MA50: $'+ctx.parsed.y.toFixed(2);if(ctx.dataset.label==='BB Upper')return 'BB Upper: $'+(ctx.parsed.y||0).toFixed(2);if(ctx.dataset.label==='BB Lower')return 'BB Lower: $'+(ctx.parsed.y||0).toFixed(2);return null;}}})})}) }));
  var rsiCtx=document.getElementById('cRSI').getContext('2d');
  CHART_STATE.charts.push(new Chart(rsiCtx,{type:'line',data:{labels:labels,datasets:[{label:'RSI',data:rsiArr,borderColor:pu,borderWidth:1.5,pointRadius:0,fill:false,tension:0.1,segment:{borderColor:function(ctx){var v=ctx.p1.parsed.y;return v<30?gr:v>70?rd:pu;}}},{label:'OB',data:Array(labels.length).fill(70),borderColor:'rgba(255,77,106,.25)',borderWidth:0.8,pointRadius:0,fill:false,borderDash:[4,4]},{label:'OS',data:Array(labels.length).fill(30),borderColor:'rgba(0,212,138,.25)',borderWidth:0.8,pointRadius:0,fill:false,borderDash:[4,4]}]},options:Object.assign({},bOpts,{scales:{x:Object.assign({},bOpts.scales.x,{display:false}),y:Object.assign({},bOpts.scales.y,{min:0,max:100,ticks:Object.assign({},bOpts.scales.y.ticks,{maxTicksLimit:5})})}})}));
  var volCtx=document.getElementById('cVol').getContext('2d');
  var pc=[closes[0]].concat(closes.slice(0,-1));var vc=closes.map(function(c,i){return c>=pc[i]?'rgba(0,212,138,.5)':'rgba(255,77,106,.5)';});
  CHART_STATE.charts.push(new Chart(volCtx,{type:'bar',data:{labels:labels,datasets:[{label:'Volume',data:vols,backgroundColor:vc,borderWidth:0}]},options:Object.assign({},bOpts,{scales:{x:Object.assign({},bOpts.scales.x,{display:false}),y:Object.assign({},bOpts.scales.y,{ticks:Object.assign({},bOpts.scales.y.ticks,{maxTicksLimit:3,callback:function(v){return v>=1e6?(v/1e6).toFixed(0)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v;}})})}})}));
}
