// ══════════════════════════════════════════════════════════════
// MARKET CONTEXT AGENT (MCX)
// ══════════════════════════════════════════════════════════════

var _mcxOverlay          = {bb: false, kc: false, sma8: true};
var _mcxSqzState         = {};
var _mcxSpy4hTimer       = null; var _mcxSpy4hCount  = 0;
var _mcxVi3m4hTimer      = null; var _mcxVi3m4hCount = 0;
var _mcxAutoRefreshTimer = null;
var _mcxRefreshBusy      = false;
var _mcxResizeObs        = null;
var _mcxLiveCache        = {}; // wrapId → {sqzLabel}
var _mcxLiveThrottle     = {}; // wrapId → setTimeout handle
var _mcxBackendFetchInFlight = {}; // symbol → Promise — pending guard against overlapping refreshes
var _mcxSpySqzCache = { spy1d: null, spy4h: null }; // populated after _mcxRenderCharts builds ctxMap

// ── MCX intrabar live-update ─────────────────────────────────────────────
// Called from _onCandleData for every candle buffer update.
// Schedules a throttled single-chart redraw (max 1/2s per chart) so the
// last candle stays current without hammering the full render pipeline.

function _mcxOnCandleTick(ticker, tf) {
  if (_activeView !== 'mcx') return;
  var vi3mSym = _mcxVi3mSym();
  var wrapId;
  if (ticker === 'SPY') {
    if (tf === '1D')                   wrapId = 'mcx-wrap-spy-1d';
    else if (tf === '4H' || tf === '30M') wrapId = 'mcx-wrap-spy-4h';
  } else if (vi3mSym && ticker === vi3mSym) {
    if (tf === '1D')                   wrapId = 'mcx-wrap-vi3m-1d';
    else if (tf === '4H' || tf === '30M') wrapId = 'mcx-wrap-vi3m-4h';
  }
  if (!wrapId || !_mcxLiveCache[wrapId]) return; // chart not yet drawn
  if (_mcxLiveThrottle[wrapId]) return;           // redraw already pending
  _mcxLiveThrottle[wrapId] = setTimeout(function() {
    _mcxLiveThrottle[wrapId] = null;
    _mcxLiveDrawOne(wrapId);
  }, 2000);
}

function _mcxLiveDrawOne(wrapId) {
  if (_activeView !== 'mcx') return;
  var cached = _mcxLiveCache[wrapId];
  if (!cached) return;
  var vi3mSym = _mcxVi3mSym();
  var candles, src;
  if      (wrapId === 'mcx-wrap-spy-1d')  { candles = getDailyCandles('SPY');      src = getCandleDataSource('SPY','1D'); }
  else if (wrapId === 'mcx-wrap-spy-4h')  { candles = getFourHourCandles('SPY');   src = getCandleDataSource('SPY','4H'); }
  else if (wrapId === 'mcx-wrap-vi3m-1d') { candles = getDailyCandles(vi3mSym);    src = getCandleDataSource(vi3mSym,'1D'); }
  else if (wrapId === 'mcx-wrap-vi3m-4h') { candles = getFourHourCandles(vi3mSym); src = getCandleDataSource(vi3mSym,'4H'); }
  if (!candles || !candles.length) return;
  if (wrapId.indexOf('spy') !== -1) candles = _patchLivePrice(candles, 'SPY');
  var ind = computeCandleIndicators(candles);
  _mcxDrawOne(wrapId, candles, ind, src, cached.sqzLabel);
}

function _mcxStopLiveUpdates() {
  Object.keys(_mcxLiveThrottle).forEach(function(k) {
    clearTimeout(_mcxLiveThrottle[k]);
    _mcxLiveThrottle[k] = null;
  });
}

// ── ResizeObserver ───────────────────────────────────────────────────────
// Attach a ResizeObserver to the chart grid so charts repaint when the
// container actually gets its CSS dimensions (handles flex/grid layout delay).
function _mcxAttachResizeObserver() {
  if (!window.ResizeObserver) return;
  if (_mcxResizeObs) { _mcxResizeObs.disconnect(); _mcxResizeObs = null; }
  var grid = document.getElementById('view-mcx');
  if (!grid) return;
  var pending = false;
  _mcxResizeObs = new ResizeObserver(function() {
    if (_activeView !== 'mcx') return;
    if (pending) return;
    pending = true;
    requestAnimationFrame(function() {
      pending = false;
      _mcxRenderCharts();
    });
  });
  _mcxResizeObs.observe(grid);
}

// Returns the DXLink symbol string for VI3M (e.g. '$VIX3M.X')
function _mcxVi3mSym() {
  var sf = S.vixFamily;
  if (sf && sf.symbolsUsed && sf.symbolsUsed.vix3m) return sf.symbolsUsed.vix3m;
  return '$VIX3M.X';
}

// Compute human-readable technical context from candles + indicators
function _mcxTechCtx(candles, ind) {
  if (!candles || !ind) return null;
  var last  = candles[candles.length - 1];
  if (!last) return null;
  function lnn(arr){ if(!arr)return null; for(var i=arr.length-1;i>=0;i--){if(arr[i]!=null)return arr[i];}return null; }
  var price = last.close;
  var sma20 = lnn(ind.sma20);
  var sma30 = lnn(ind.sma30);
  var smaRel = (sma20!=null&&sma30!=null) ? (sma20>sma30?'Bull':'Bear') : '—';
  var vs20   = (price!=null&&sma20!=null)  ? (price>sma20?'Above':'Below') : '—';
  var vs30   = (price!=null&&sma30!=null)  ? (price>sma30?'Above':'Below') : '—';
  var structure = '—';
  if (price!=null&&sma20!=null&&sma30!=null) {
    if      (price>sma20&&sma20>sma30)  structure='Strong Bull';
    else if (price>sma20&&sma20<=sma30) structure='Weak Bull';
    else if (price<sma20&&sma20>=sma30) structure='Weak Bear';
    else                                structure='Strong Bear';
  }
  return { smaRel:smaRel, vs20:vs20, vs30:vs30, structure:structure, sqz:ind.lastSqueeze };
}

// Non-intrusive toast + persistent log entry for squeeze state changes
function _mcxSqzToast(label, active) {
  // Floating toast
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:60px;right:20px;z-index:9999;padding:8px 14px;border-radius:8px;'+
    'font-family:var(--M);font-size:10px;font-weight:700;letter-spacing:.05em;pointer-events:none;'+
    'opacity:1;transition:opacity .5s;'+(active
      ?'background:#2d0b12;border:1px solid #e8445a;color:#e8445a;'
      :'background:#071f14;border:1px solid #00d48a;color:#00d48a;');
  t.textContent = (active ? '■ SQUEEZE ON' : '▶ SQUEEZE FIRED') + ' · ' + label;
  document.body.appendChild(t);
  setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ if(t.parentNode)t.parentNode.removeChild(t); },600); },4000);
  // Persistent log in the MCX alerts card
  var log = document.getElementById('mcx-alerts-log');
  if (log) {
    var placeholder = log.querySelector('div[style*="var(--tx3)"]');
    if (placeholder) log.removeChild(placeholder);
    var entry = document.createElement('div');
    entry.style.cssText = 'font-family:var(--M);font-size:9px;padding:5px 8px;border-radius:5px;flex-shrink:0;'+
      (active ? 'background:#2d0b12;border:1px solid rgba(232,68,90,.3);color:#e8445a;'
              : 'background:#071f14;border:1px solid rgba(0,212,138,.3);color:#00d48a;');
    entry.textContent = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})+
      ' · '+(active?'■ SQUEEZE ON':'▶ SQUEEZE FIRED')+' · '+label;
    log.insertBefore(entry, log.firstChild);
    while (log.children.length > 8) log.removeChild(log.lastChild);
  }
}
function _mcxCheckSqz(label, sqz) {
  if (sqz==null) return;
  var prev = _mcxSqzState[label];
  if (prev !== undefined && prev !== sqz) _mcxSqzToast(label, sqz);
  _mcxSqzState[label] = sqz;
}

// Draw RSI(14) sub-panel. rsiSeries = full ind.rsi array; viewLen = candles in view.
function _mcxDrawRsi(rsiWrapId, rsiSeries, viewLen) {
  var wrap = document.getElementById(rsiWrapId);
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!rsiSeries || !viewLen) return;
  var view = rsiSeries.slice(-viewLen);
  var lastVal = null;
  for (var i = view.length - 1; i >= 0; i--) { if (view[i] != null) { lastVal = view[i]; break; } }

  var cv = document.createElement('canvas');
  cv.style.cssText = 'width:100%;height:100%;display:block;';
  wrap.appendChild(cv);
  var hd  = prepareHiDPICanvas(cv, wrap.offsetWidth || 280, wrap.offsetHeight || 56);
  var ctx = hd.ctx;

  var W = hd.width, H = hd.height;
  var PAD = {top:14, right:30, bottom:4, left:10};
  var plotW = W - PAD.left - PAD.right;
  var plotH = H - PAD.top  - PAD.bottom;
  var nv = view.length;
  var yMin = 0, yMax = 100;

  ctx.fillStyle = '#0e0e18';
  ctx.fillRect(0, 0, W, H);

  function xOf(i){ return PAD.left + (i / (nv - 1 || 1)) * plotW; }
  function yOf(v){ return PAD.top  + (1 - (v - yMin) / (yMax - yMin)) * plotH; }

  // Reference lines at 40 (red-tinted) and 60 (green-tinted)
  [[60,'rgba(0,212,138,.2)','rgba(0,212,138,.35)'], [40,'rgba(232,68,90,.2)','rgba(232,68,90,.35)']].forEach(function(r){
    ctx.strokeStyle = r[1]; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(PAD.left, yOf(r[0])); ctx.lineTo(W - PAD.right, yOf(r[0])); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = r[2]; ctx.font = '8px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r[0], W - 2, yOf(r[0]) + 3);
  });

  // RSI line — segment color based on midpoint value
  ctx.lineWidth = 1.5; ctx.setLineDash([]);
  var started = false, px = null, py = null, pv = null;
  view.forEach(function(v, i){
    if (v == null) { started = false; px = null; py = null; pv = null; return; }
    var x = xOf(i), y = yOf(v);
    if (!started) { started = true; px = x; py = y; pv = v; return; }
    var mid = (pv + v) / 2;
    ctx.strokeStyle = mid > 60 ? 'rgba(0,212,138,.9)' : mid < 40 ? 'rgba(232,68,90,.9)' : 'rgba(124,111,255,.75)';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    px = x; py = y; pv = v;
  });

  // Label
  var lc = lastVal != null ? (lastVal > 60 ? '#00d48a' : lastVal < 40 ? '#e8445a' : '#7c6fff') : '#6e6e8a';
  ctx.font = '9px monospace'; ctx.fillStyle = lc; ctx.textAlign = 'left';
  ctx.fillText('RSI(14): ' + (lastVal != null ? lastVal.toFixed(1) : '—'), PAD.left + 2, 10);
}

// Draw one MCX chart; returns tech context object or null
function _mcxDrawOne(wrapId, candles, ind, src, sqzLabel) {
  var rsiId = wrapId.replace('mcx-wrap-', 'mcx-rsi-');
  if (candles && ind) {
    // Guard: skip and retry if container has no layout yet
    var wrap = document.getElementById(wrapId);
    if (wrap) {
      var rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setTimeout(function() {
          if (_activeView === 'mcx') _mcxDrawOne(wrapId, candles, ind, src, sqzLabel);
        }, 50);
        return null;
      }
    }
    _drawCandleChart(wrapId, candles, ind, {
      showSMA8: _mcxOverlay.sma8, lastSma8: ind.lastSma8,
      showBB: _mcxOverlay.bb, showKC: _mcxOverlay.kc,
      source: src, rsi: ind.lastRsi,
    });
    _mcxLiveCache[wrapId] = {sqzLabel: sqzLabel};
    _mcxCheckSqz(sqzLabel, ind.lastSqueeze);
    _mcxDrawRsi(rsiId, ind.rsi, Math.min(75, candles.length));
    return _mcxTechCtx(candles, ind);
  }
  var wrap = document.getElementById(wrapId);
  if (wrap) wrap.innerHTML = '<div class="dss-no-data">' + (src || 'Data unavailable') + '</div>';
  var rsiWrap = document.getElementById(rsiId);
  if (rsiWrap) rsiWrap.innerHTML = '';
  return null;
}

// Rebuild the technical context table
function _mcxUpdateTable(ctxMap) {
  var el = document.getElementById('mcx-tech-table');
  if (!el) return;
  var rows = [{key:'SPY-1D',label:'SPY 1D'},{key:'SPY-4H',label:'SPY 4H'},{key:'VI3M-1D',label:'VI3M 1D'},{key:'VI3M-4H',label:'VI3M 4H'}];
  function strCol(s){ return s==='Strong Bull'?'var(--gr)':s==='Weak Bull'?'#34d399':s==='Weak Bear'?'var(--am)':s==='Strong Bear'?'var(--rd)':'var(--tx3)'; }
  function boolCol(v,good){ return v===good?'var(--gr)':v==='—'?'var(--tx3)':'var(--rd)'; }
  function sqzCol(s){ return s===true?'#e8445a':s===false?'var(--tx3)':'var(--tx3)'; }
  function sqzLbl(s){
    if(s===true)  return '<span style="background:#2d0b12;color:#e8445a;border:1px solid rgba(232,68,90,.4);border-radius:3px;padding:1px 5px;font-size:7px">ON</span>';
    if(s===false) return '<span style="color:var(--tx3)">OFF</span>';
    return '—';
  }
  var th='<th style="color:var(--tx3);padding:4px 3px;border-bottom:1px solid var(--b1);text-align:center">';
  var html='<table style="width:100%;border-collapse:collapse;font-size:8px;font-family:var(--M)"><thead><tr>'+
    '<th style="color:var(--tx3);padding:4px 3px;border-bottom:1px solid var(--b1);text-align:left">ASSET</th>'+
    th+'20>30</th>'+th+'vs20</th>'+th+'vs30</th>'+
    th+'STRUCTURE</th>'+th+'SQZ</th></tr></thead><tbody>';
  rows.forEach(function(r){
    var c=ctxMap[r.key];
    var td='style="padding:4px 3px;border-bottom:1px solid var(--b0);text-align:center"';
    if(!c){
      html+='<tr><td style="text-align:left;color:var(--tx2);padding:4px 3px;border-bottom:1px solid var(--b0)">'+r.label+'</td><td colspan="5" '+td+' style="color:var(--tx3)">—</td></tr>';
      return;
    }
    html+='<tr>'+
      '<td style="text-align:left;color:var(--tx2);padding:4px 3px;border-bottom:1px solid var(--b0);font-weight:700">'+r.label+'</td>'+
      '<td '+td+' style="color:'+boolCol(c.smaRel,'Bull')+'">'+c.smaRel+'</td>'+
      '<td '+td+' style="color:'+boolCol(c.vs20,'Above')+'">'+c.vs20+'</td>'+
      '<td '+td+' style="color:'+boolCol(c.vs30,'Above')+'">'+c.vs30+'</td>'+
      '<td '+td+' style="color:'+strCol(c.structure)+'">'+c.structure+'</td>'+
      '<td '+td+' style="color:'+sqzCol(c.sqz)+'">'+sqzLbl(c.sqz)+'</td>'+
    '</tr>';
  });
  el.innerHTML=html+'</tbody></table>';
}

// Draw VIX term structure as a canvas sparkline
// ── MARKET REGIME ALERT — content + renderer ────────────────────
// Behavioral / risk-control layer. Reads live S.vixFamily.vix ONLY.
// Renders guidance for the CURRENT regime exclusively (never all regimes).
// Section order per regime: FORBIDDEN → EXPERIMENTAL/CAUTION → FAVORED → TECHNICAL → ADJUSTMENT RULES.

// ── Regime transition tracking — persistent 5-day alert ─────────
// State persists across reloads in localStorage. A transition is recorded
// ONLY when the volatility bucket (LOW/MID/HIGH) actually changes — small
// intra-regime VIX movements never retrigger the alert.
var _REGIME_LS_KEY='apex_regime_transition_v1';
function _regimeReadState(){ try{ return JSON.parse(localStorage.getItem(_REGIME_LS_KEY)||'null'); }catch(e){ return null; } }
function _regimeWriteState(st){ try{ localStorage.setItem(_REGIME_LS_KEY,JSON.stringify(st)); }catch(e){} }
function _regimeDayStart(ts){ var d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
// Detect bucket changes and persist. Returns nothing — read via _regimeTransitionStatus().
function _regimeUpdateTransition(regime){
  if(!regime) return;                         // no live VIX → never touch stored state
  var st=_regimeReadState();
  if(!st || !st.lastRegime){
    _regimeWriteState({lastRegime:regime,prevRegime:null,newRegime:null,transitionTs:null});
    return;
  }
  if(st.lastRegime!==regime){
    _regimeWriteState({lastRegime:regime,prevRegime:st.lastRegime,newRegime:regime,transitionTs:Date.now()});
    if(typeof logEv==='function') logEv('monitor','VIX regime change: '+st.lastRegime+' → '+regime,'warn');
  }
}
// {active, day(1..5), prev, cur} for an in-window transition (<= 5 calendar days).
function _regimeTransitionStatus(){
  var st=_regimeReadState();
  if(!st || !st.transitionTs || !st.prevRegime) return {active:false};
  var day=Math.floor((_regimeDayStart(Date.now())-_regimeDayStart(st.transitionTs))/86400000)+1;
  if(day<1 || day>5) return {active:false};
  return {active:true,day:day,prev:st.prevRegime,cur:st.newRegime};
}

// ── Renderers (shared content + logic, per-target render-key guards) ──
function _regimeSections(c){
  // Items may be a plain string, or an object {text, sub:[...]} for a parent
  // bullet whose sub-conditions render nested (indented) under it.
  function liOf(item){
    if(item && typeof item==='object'){
      var subs=(item.sub||[]).map(function(s){return '<li>'+s+'</li>';}).join('');
      return '<li class="regime-li-parent">'+item.text+
        (subs?'<ul class="regime-subitems">'+subs+'</ul>':'')+'</li>';
    }
    return '<li>'+item+'</li>';
  }
  function sect(klass,heading,items){
    if(!items||!items.length)return '';
    return '<div class="regime-section '+klass+'"><div class="regime-section-h">'+heading+'</div><ul>'+
      items.map(liOf).join('')+'</ul></div>';
  }
  return sect('regime-forbidden','⛔ FORBIDDEN',c.forbidden)+
    sect('regime-caution','⚠ EXPERIMENTAL / CAUTION',c.caution)+
    sect('regime-favored','✓ FAVORED',c.favored)+
    sect('regime-tech','◆ TECHNICAL PRIORITY',c.tech)+
    sect('regime-adj','⚙ ADJUSTMENT RULES',c.adj);
}

// ── SPY squeeze badge helpers ────────────────────────────────────────────────
// Returns badge HTML using _mcxSpySqzCache. compact=true → smaller variant for Dashboard.
function _mcxSpySqzBadgeHtml(compact) {
  var s1 = _mcxSpySqzCache.spy1d, s4 = _mcxSpySqzCache.spy4h;
  if (!s1 && !s4) return '';
  var label = (s4 && s1) ? '4H + 1D' : (s4 ? '4H' : '1D');
  if (compact) return '<div class="mcx-spy-sqz-badge mcx-spy-sqz-compact">SQZ ' + label + '</div>';
  return '<div class="mcx-spy-sqz-badge">&#9650; SPY SQUEEZE: ' + label + '</div>';
}
function _mcxRenderSpySqzBadge() {
  var el = document.getElementById('mcx-spy-sqz-badge');
  if (el) el.innerHTML = _mcxSpySqzBadgeHtml();
}

var _regimeMainKey=null;
function _regimeRenderMain(vix,regime){
  var el=document.getElementById('mcx-regime-alert');
  if(!el)return;
  var key=(regime||'NA')+'|'+(vix!=null?vix.toFixed(2):'na');
  if(key===_regimeMainKey)return;            // skip rebuild when nothing changed
  _regimeMainKey=key;
  if(!regime){
    el.className='regime-alert regime-na';
    el.querySelector('.regime-vix-value').textContent='--';
    el.querySelector('.regime-title').textContent='AWAITING VIX';
    el.querySelector('.regime-range').innerHTML='Connect Tastytrade to load live VIX&hellip;';
    el.querySelector('.regime-sections').innerHTML='<div class="regime-na-msg">Regime guidance appears once a live VIX value is available.</div>';
    return;
  }
  var c=_REGIME_CONTENT[regime];
  // Layer VIX/overextension-conditional forbidden rules on top of the static
  // regime content without mutating _REGIME_CONTENT (shallow copy + new array).
  var extraForb=_regimeDynForbidden(vix);
  var cc=extraForb.length?Object.assign({},c,{forbidden:extraForb.concat(c.forbidden||[])}):c;
  el.className='regime-alert '+c.cls;
  el.querySelector('.regime-vix-value').textContent=vix.toFixed(1);
  el.querySelector('.regime-title').textContent=c.title;
  el.querySelector('.regime-range').innerHTML=c.range;
  el.querySelector('.regime-sections').innerHTML=_regimeSections(cc);
}

// Persistent contextual reminder rendered immediately beside the Dashboard VIX
// value. Kept as a constant so every re-render of the regime card re-emits it
// (the badge survives Dashboard refreshes). Pure UI — no effect on VIX/MCX data.
var _VIX_CTX_BADGE='<span class="vix-ctx-badge" tabindex="0" role="note" aria-label="Market conditions can change quickly. Review Market Context several times during the trading session before opening, adjusting or closing positions."><span aria-hidden="true">&#9888; READ MARKET CONTEXT MULTIPLE TIMES A DAY</span><span class="vix-ctx-tip" role="tooltip">Market conditions can change quickly. Review Market Context several times during the trading session before opening, adjusting or closing positions.</span></span>';
var _regimeCompactKey=null;
function _regimeRenderCompact(vix,regime){
  var el=document.getElementById('dash-regime-alert');
  if(!el)return;
  var sqzTag=(_mcxSpySqzCache.spy1d?'1':'0')+(_mcxSpySqzCache.spy4h?'1':'0');
  var key=(regime||'NA')+'|'+(vix!=null?vix.toFixed(2):'na')+'|'+sqzTag;
  if(key===_regimeCompactKey)return;
  _regimeCompactKey=key;
  if(!regime){
    el.className='regime-compact regime-na';
    el.innerHTML='<div class="regime-compact-vixwrap"><div class="regime-compact-vix"><div class="regime-compact-lbl">VIX</div><div class="regime-compact-val">--</div></div>'+_VIX_CTX_BADGE+'</div>'+
      '<div class="regime-compact-body"><div class="regime-compact-tag">&#9888; MARKET REGIME</div><div class="regime-compact-title">AWAITING VIX</div></div>';
    return;
  }
  var c=_REGIME_CONTENT[regime];
  // Low-VIX operative notes (avoid naked calls/puts, low-IV strategy rules).
  var vixNotes=_regimeCompactVixNotes(vix);
  var notesHtml=vixNotes.length
    ? '<div class="regime-compact-notes">'+vixNotes.map(function(n){
        return '<div class="regime-compact-naked">&#9888; '+n+'</div>';
      }).join('')+'</div>'
    : '';
  el.className='regime-compact '+c.cls;
  el.innerHTML='<div class="regime-compact-vixwrap"><div class="regime-compact-vix"><div class="regime-compact-lbl">VIX · LIVE</div><div class="regime-compact-val">'+vix.toFixed(1)+'</div>'+_mcxSpySqzBadgeHtml(true)+'</div>'+_VIX_CTX_BADGE+'</div>'+
    '<div class="regime-compact-body"><div class="regime-compact-tag">&#9888; MARKET REGIME ALERT</div>'+
    '<div class="regime-compact-title">'+(_REGIME_LABEL[regime]||regime)+'</div>'+
    '<div class="regime-compact-sub">'+c.range+'</div>'+notesHtml+'</div>';
}

var _regimeTransKey={};
function _regimeRenderTransition(id){
  var el=document.getElementById(id);
  if(!el)return;
  var t=_regimeTransitionStatus();
  var key=t.active?(t.day+'|'+t.prev+'|'+t.cur):'off';
  if(key===_regimeTransKey[id])return;
  _regimeTransKey[id]=key;
  if(!t.active){ el.style.display='none'; el.innerHTML=''; return; }
  var prev=_REGIME_LABEL[t.prev]||t.prev, cur=_REGIME_LABEL[t.cur]||t.cur;
  el.style.display='';
  el.className='regime-transition';
  el.innerHTML=
    '<div class="regime-trans-h">&#9888; REGIME TRANSITION ALERT — DAY '+t.day+'/5</div>'+
    '<div class="regime-trans-line"><span class="regime-trans-k">Previous regime:</span> <strong>'+prev+'</strong>'+
      ' &nbsp;&middot;&nbsp; <span class="regime-trans-k">Current regime:</span> <strong>'+cur+'</strong></div>'+
    '<div class="regime-trans-body">REGIME CHANGE ACTIVE — Day '+t.day+'/5. Review <strong>all open positions</strong> from the previous regime. '+
      'Old-regime positions may no longer be valid.'+
      '<ul class="regime-trans-list">'+
        '<li>Do <strong>NOT</strong> only evaluate new trades.</li>'+
        '<li>Review existing open positions.</li>'+
        '<li>Positions opened under the previous regime may now be structurally wrong.</li>'+
        '<li>Consider <strong>closing, reducing, hedging, or adjusting</strong> old-regime trades that do not match the new volatility environment.</li>'+
      '</ul>'+
      '<span class="regime-trans-never">Positions are never closed automatically — you decide.</span></div>';
}

// Master entry — shared by MCX + Dashboard. Lightweight & idempotent.
function _regimeRefresh(){
  var vix=(S.vixFamily&&S.vixFamily.vix!=null)?S.vixFamily.vix:null;
  var regime=_mcxRegimeOf(vix);
  _regimeUpdateTransition(regime);            // bucket-change only — no false retriggers
  _regimeRenderMain(vix,regime);              // MCX (no-op if element absent)
  _regimeRenderCompact(vix,regime);           // Dashboard (no-op if element absent)
  _regimeRenderTransition('mcx-regime-transition');
  _regimeRenderTransition('dash-regime-transition');
  _mcxRenderSma20DefenseRule();               // SMA20 Rising Defense Rule (MCX-only; no-op if element absent)
}

// ── SMA20 Rising Defense Rule ──────────────────────────────────────────────
// Determines whether SPY's 1D SMA20 is rising (sma20_current > sma20_previous).
// Reuses SPY 1D candle data already loaded for the MCX charts — prefers the
// backend candle cache, then the shared daily-candle source. Never triggers a
// new fetch. Returns { rising, current, previous } or null when data is
// unavailable / insufficient (caller fails silently).
function _mcxSpy1dSma20Rising(){
  try {
    var candles = null;
    try { candles = _mcxGetCachedBackendCandles('SPY', '1D'); } catch (e) {}
    if (!candles || !candles.length) { try { candles = getDailyCandles('SPY'); } catch (e2) {} }
    if (!candles || candles.length < 21) return null; // need >=21 bars for SMA20 + a prior point
    var closes = candles.map(function(c){ return (c && typeof c.close === 'number') ? c.close : (c ? c.c : null); });
    var sma = smA(closes, 20);
    if (!sma || !sma.length) return null;
    // Last two finite SMA20 values (current bar vs the bar before it).
    var current = null, previous = null;
    for (var i = sma.length - 1; i >= 0; i--) {
      var v = sma[i];
      if (v == null || !isFinite(v)) continue;
      if (current === null) { current = v; continue; }
      previous = v; break;
    }
    if (current === null || previous === null) return null;
    return { rising: current > previous, current: current, previous: previous };
  } catch (e) { return null; }
}

// Renders the SMA20 Rising Defense Rule into #mcx-sma20-defense-rule. Always shows
// the FULL rule when SPY 1D SMA20 is rising; clears/hides the container otherwise.
// Never throws into the render loop; a no-op when the container is absent.
function _mcxRenderSma20DefenseRule(){
  try {
    var host = document.getElementById('mcx-sma20-defense-rule');
    if (!host) return; // dashboard / other views have no container — silent no-op
    var info = _mcxSpy1dSma20Rising();
    // Fail silently when SMA20 data is unavailable, or when SMA20 is not rising.
    if (!info || info.rising !== true) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = '';
    host.innerHTML =
      '<div class="sma20-defense">'+
        '<div class="sma20-defense-h"><span class="sma20-defense-tag">&#9650; SMA20</span>SMA20 Rising Defense Rule</div>'+
        '<div class="sma20-defense-lead">If SMA20 is rising:</div>'+
        '<ul class="sma20-defense-list">'+
          '<li>Do not open new bear call spreads.</li>'+
          '<li>Do not use short calls as a primary portfolio defense.</li>'+
          '<li>Prefer risk reduction through:'+
            '<ul class="sma20-defense-sublist">'+
              '<li>partial position closures;</li>'+
              '<li>reducing overall portfolio size;</li>'+
              '<li>rolling threatened puts;</li>'+
              '<li>long puts or other protective long-vega structures;</li>'+
              '<li>taking profits on winning positions to lower net exposure.</li>'+
            '</ul>'+
          '</li>'+
        '</ul>'+
        '<div class="sma20-defense-when">Short-call defenses should be considered only when:</div>'+
        '<ul class="sma20-defense-cond">'+
          '<li>VIX is elevated;</li>'+
          '<li>market structure has clearly broken below SMA20;</li>'+
          '<li>SMA20 is flattening or declining;</li>'+
          '<li>downside momentum is confirmed.</li>'+
        '</ul>'+
        '<div class="sma20-defense-rationale"><strong>Rationale:</strong> A rising SMA20 indicates an underlying bullish trend. '+
          'In this environment, short-call adjustments often become the largest source of losses during sharp rebounds. '+
          'Risk reduction should therefore be achieved primarily through position reduction, rolling, and put-side protection '+
          'rather than through additional bearish exposure.</div>'+
      '</div>';
  } catch (e) {
    try { console.log('[MCX] SMA20 rising defense rule error', (e && e.message) || e); } catch (e2) {}
  }
}

function _mcxDrawVixCurve() {
  _regimeRefresh();
  var wrap = document.getElementById('mcx-vix-curve');
  if (!wrap) return;
  var vf = S.vixFamily;
  var pts = [
    {label:'9D', val:vf?vf.vix9d:null},
    {label:'VIX',val:vf?vf.vix:null},
    {label:'3M', val:vf?vf.vix3m:null},
    {label:'6M', val:vf?vf.vix6m:null},
  ];
  var avail = pts.filter(function(p){return p.val!=null;});
  wrap.innerHTML='';
  if (!avail.length) {
    wrap.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:9px;font-family:var(--M);color:var(--tx3)">VIX curve unavailable — connect TT</div>';
    return;
  }
  var cv=document.createElement('canvas');
  cv.style.cssText='width:100%;height:100%;display:block;';
  wrap.appendChild(cv);
  var hd=prepareHiDPICanvas(cv, wrap.offsetWidth||280, wrap.offsetHeight||90);
  var ctx=hd.ctx;
  var PAD={top:12,right:20,bottom:22,left:38}, W=hd.width, H=hd.height;
  var plotW=W-PAD.left-PAD.right, plotH=H-PAD.top-PAD.bottom;
  ctx.fillStyle='#0e0e18'; ctx.fillRect(0,0,W,H);
  var vals=avail.map(function(p){return p.val;});
  var minV=Math.min.apply(null,vals), maxV=Math.max.apply(null,vals);
  var sp=maxV-minV; if(sp<2){minV-=1;maxV+=1;sp=maxV-minV;}
  minV-=sp*0.12; maxV+=sp*0.12;
  function xOf(i){return PAD.left+(i/(pts.length-1))*plotW;}
  function yOf(v){return PAD.top+(1-(v-minV)/(maxV-minV))*plotH;}
  // Grid
  [0,0.5,1].forEach(function(f){
    ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD.left,PAD.top+f*plotH); ctx.lineTo(W-PAD.right,PAD.top+f*plotH); ctx.stroke();
  });
  // Curve color: upward slope = backwardation (red/amber for risk), downward = contango (green)
  var first=avail[0].val, last2=avail[avail.length-1].val;
  var curveColor = last2>first ? 'rgba(0,212,138,.8)' : 'rgba(232,68,90,.85)';
  // Draw line
  ctx.beginPath(); ctx.strokeStyle=curveColor; ctx.lineWidth=2; ctx.setLineDash([]);
  var started=false;
  pts.forEach(function(p,i){
    if(p.val==null){started=false;return;}
    var x=xOf(i),y=yOf(p.val);
    if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
  });
  ctx.stroke();
  // Dots + value labels
  ctx.font='9px monospace';
  pts.forEach(function(p,i){
    var x=xOf(i);
    if(p.val!=null){
      ctx.beginPath(); ctx.arc(x,yOf(p.val),3,0,Math.PI*2); ctx.fillStyle=curveColor; ctx.fill();
      ctx.fillStyle='#e8e8f0'; ctx.textAlign='center'; ctx.fillText(p.val.toFixed(1),x,yOf(p.val)-6);
    }
    ctx.fillStyle='#6e6e8a'; ctx.textAlign='center'; ctx.fillText(p.label,x,H-4);
  });
  // Y axis
  ctx.fillStyle='#6e6e8a'; ctx.textAlign='right'; ctx.font='8px monospace';
  ctx.fillText(maxV.toFixed(1),PAD.left-3,PAD.top+8);
  ctx.fillText(minV.toFixed(1),PAD.left-3,H-PAD.bottom+2);
}

function _mcxStopPolls(){
  if(_mcxSpy4hTimer) {clearInterval(_mcxSpy4hTimer); _mcxSpy4hTimer=null;}
  if(_mcxVi3m4hTimer){clearInterval(_mcxVi3m4hTimer);_mcxVi3m4hTimer=null;}
  _mcxSpy4hCount=0; _mcxVi3m4hCount=0;
}

async function _mcxRenderCharts(opts) {
  var _forceRefresh = !!(opts && opts.forceRefresh === true);
  var _reason = (opts && opts.reason) || (_forceRefresh ? 'manual' : 'auto');
  _mcxStopPolls();
  _mcxStopLiveUpdates();   // cancel any pending per-chart throttle before full redraw
  _mcxLiveCache = {};      // full render will repopulate per-chart cache
  var vi3mSym = _mcxVi3mSym();
  var ctxMap  = {};

  // FF_BACKEND_CANDLES_MCX_CHARTS: pre-fetch backend candles for SPY and VI3M.
  // Symbols are fetched in parallel; stale/missing cache entries are refreshed.
  // On any failure the symbol falls back to the existing legacy path below.
  //
  // Refresh policy: a normal render reuses a fresh (<TTL) cache entry. A manual
  // MCX open (forceRefresh) bypasses that reuse so the helper warms before its
  // final read. A per-symbol in-flight guard prevents the layout double-pass /
  // ResizeObserver redraw from launching overlapping fetches for one symbol.
  if (ffBackendCandlesMcxCharts()) {
    var _mcxSyms = ['SPY'];
    if (vi3mSym) _mcxSyms.push(vi3mSym);
    await Promise.all(_mcxSyms.map(async function(_sym) {
      if (!_forceRefresh && _mcxGetBackendCandleEntry(_sym)) return; // still fresh — reuse
      // Coalesce concurrent fetches for the same symbol (pending guard).
      if (_mcxBackendFetchInFlight[_sym]) { try { await _mcxBackendFetchInFlight[_sym]; } catch (_e0) {} return; }
      var _p = (async function() {
        try {
          var _res = await _mcxFetchBackendCandlesForChart(_sym, { forceRefresh: _forceRefresh });
          if (_res && _res.ok) {
            // Freshness guard: never let an older backend candle set overwrite a
            // newer one already cached (req #5). A normal store when fresher/equal.
            _mcxStoreBackendCandleEntry(_sym, {
              candles1d: _res.candles1d,
              candles4h: _res.candles4h,
              source:    _res.source,
              fetchedAt: Date.now(),
            });
            _recordBackendCandleProvenance('market_context_chart', _sym,
              _res.diagnostics.candles1dCount, _res.diagnostics.candles4hCount, _res.diag4h);
            console.log('[MCX][BACKEND-CANDLES] symbol=' + _sym +
              ' 1D=' + _res.diagnostics.candles1dCount +
              ' 4H=' + _res.diagnostics.candles4hCount +
              ' source=' + _res.source);
            // [MCX][REFRESH]: emitted only on manual/forced opens or when we
            // actually warmed, to avoid spamming the lightweight auto-refresh.
            if (_forceRefresh || _res.diagnostics.warmed) {
              console.log('[MCX][REFRESH] reason=' + _reason + ' force=' + _forceRefresh +
                ' warmed=' + _res.diagnostics.warmed + ' symbol=' + _sym +
                ' 1D=' + _res.diagnostics.candles1dCount +
                ' 4H=' + _res.diagnostics.candles4hCount);
            }
          } else {
            console.warn('[MCX][BACKEND-CANDLES] fallback symbol=' + _sym +
              ' reason=' + ((_res && _res.fallbackReason) || 'unknown'));
          }
        } catch (_e) {
          console.warn('[MCX][BACKEND-CANDLES] fallback symbol=' + _sym +
            ' reason=threw:' + ((_e && _e.message) || _e));
        }
      })();
      _mcxBackendFetchInFlight[_sym] = _p;
      try { await _p; } finally { delete _mcxBackendFetchInFlight[_sym]; }
    }));
  }

  // ── SPY 1D ──────────────────────────────────────────────────
  var _spyBe1d = _mcxGetCachedBackendCandles('SPY', '1D');
  var spy1d = _spyBe1d || getDailyCandles('SPY');
  var src1d  = _spyBe1d ? 'BACKEND_DXLINK_CANDLES' : getCandleDataSource('SPY','1D');
  var el1d   = document.getElementById('mcx-src-spy-1d');
  if(el1d) el1d.textContent = src1d ? '· '+src1d : '';
  if(spy1d){ var i1=computeCandleIndicators(spy1d); spy1d=_patchLivePrice(spy1d,'SPY'); ctxMap['SPY-1D']=_mcxDrawOne('mcx-wrap-spy-1d',spy1d,i1,src1d,'SPY 1D'); }
  else{ var w=document.getElementById('mcx-wrap-spy-1d'); if(w)w.innerHTML='<div class="dss-no-data">Run scan to load SPY data.</div>'; }

  // ── SPY 4H ──────────────────────────────────────────────────
  var _spyBe4h = _mcxGetCachedBackendCandles('SPY', '4H');
  var spy4h = _spyBe4h || getFourHourCandles('SPY');
  var src4h  = _spyBe4h ? 'BACKEND_DXLINK_CANDLES' : getCandleDataSource('SPY','4H');
  var el4h   = document.getElementById('mcx-src-spy-4h');
  if(el4h) el4h.textContent = src4h ? '· '+src4h : '';
  if(spy4h){
    var i4=computeCandleIndicators(spy4h); spy4h=_patchLivePrice(spy4h,'SPY');
    ctxMap['SPY-4H']=_mcxDrawOne('mcx-wrap-spy-4h',spy4h,i4,src4h,'SPY 4H');
  } else if(ffBackendCandlesMcxCharts()){
    // Flag ON: backend 4H unavailable → neutral state, no DXLink fallback (req #6).
    var w4b=document.getElementById('mcx-wrap-spy-4h');
    if(w4b) w4b.innerHTML='<div class="dss-no-data">SPY 4H unavailable from backend.</div>';
  } else {
    var w4=document.getElementById('mcx-wrap-spy-4h');
    if(w4){ if(!S.ttConnected){ w4.innerHTML='<div class="dss-no-data">Connect Tastytrade for 4H candles.</div>'; }
      else { w4.innerHTML='<div class="dss-no-data">Waiting for DXLink 30M candles&hellip;</div>';
        _mcxSpy4hTimer=setInterval(function(){
          _mcxSpy4hCount++;
          var f=getFourHourCandles('SPY');
          if(f){ clearInterval(_mcxSpy4hTimer);_mcxSpy4hTimer=null;
            var fi=computeCandleIndicators(f); f=_patchLivePrice(f,'SPY');
            ctxMap['SPY-4H']=_mcxDrawOne('mcx-wrap-spy-4h',f,fi,getCandleDataSource('SPY','4H'),'SPY 4H');
            _mcxUpdateTable(ctxMap);
            _mcxSpySqzCache.spy4h=!!(ctxMap['SPY-4H']&&ctxMap['SPY-4H'].sqz);
            _mcxRenderSpySqzBadge();
            _regimeCompactKey=null;
            var _vxPoll=(S.vixFamily&&S.vixFamily.vix!=null)?S.vixFamily.vix:null;
            _regimeRenderCompact(_vxPoll,_mcxRegimeOf(_vxPoll));
          } else if(_mcxSpy4hCount>=18){ clearInterval(_mcxSpy4hTimer);_mcxSpy4hTimer=null;
            var we=document.getElementById('mcx-wrap-spy-4h');if(we)we.innerHTML='<div class="dss-no-data">4H unavailable. Market may be closed.</div>'; }
        },500);
      }
    }
  }

  // ── VI3M 1D ─────────────────────────────────────────────────
  var _vi3mBe1d = _mcxGetCachedBackendCandles(vi3mSym, '1D');
  var vi1d = _vi3mBe1d || getDailyCandles(vi3mSym);
  var vsrc1d= _vi3mBe1d ? 'BACKEND_DXLINK_CANDLES' : getCandleDataSource(vi3mSym,'1D');
  var ve1d  = document.getElementById('mcx-src-vi3m-1d');
  if(ve1d) ve1d.textContent = vsrc1d ? '· '+vsrc1d : '';
  if(vi1d){ var vi1=computeCandleIndicators(vi1d); ctxMap['VI3M-1D']=_mcxDrawOne('mcx-wrap-vi3m-1d',vi1d,vi1,vsrc1d,'VI3M 1D'); }
  else{ var wv1=document.getElementById('mcx-wrap-vi3m-1d'); if(wv1)wv1.innerHTML='<div class="dss-no-data">VI3M 1D'+(S.ttConnected?' — waiting for DXLink backfill&hellip;':' — connect Tastytrade.')+'</div>'; }

  // ── VI3M 4H ─────────────────────────────────────────────────
  var _vi3mBe4h = _mcxGetCachedBackendCandles(vi3mSym, '4H');
  var vi4h = _vi3mBe4h || getFourHourCandles(vi3mSym);
  var vsrc4h= _vi3mBe4h ? 'BACKEND_DXLINK_CANDLES' : getCandleDataSource(vi3mSym,'4H');
  var ve4h  = document.getElementById('mcx-src-vi3m-4h');
  if(ve4h) ve4h.textContent = vsrc4h ? '· '+vsrc4h : '';
  if(vi4h){ var vi4=computeCandleIndicators(vi4h); ctxMap['VI3M-4H']=_mcxDrawOne('mcx-wrap-vi3m-4h',vi4h,vi4,vsrc4h,'VI3M 4H'); }
  else if(ffBackendCandlesMcxCharts()){
    // Flag ON: backend 4H unavailable → neutral state, no DXLink fallback (req #6).
    var wv4b=document.getElementById('mcx-wrap-vi3m-4h');
    if(wv4b) wv4b.innerHTML='<div class="dss-no-data">VI3M 4H unavailable from backend.</div>';
  }
  else { var wv4=document.getElementById('mcx-wrap-vi3m-4h');
    if(wv4){ if(!S.ttConnected){ wv4.innerHTML='<div class="dss-no-data">VI3M 4H — connect Tastytrade.</div>'; }
      else { wv4.innerHTML='<div class="dss-no-data">VI3M 4H — waiting for DXLink&hellip;</div>';
        _mcxVi3m4hTimer=setInterval(function(){
          _mcxVi3m4hCount++;
          var f2=getFourHourCandles(vi3mSym);
          if(f2){ clearInterval(_mcxVi3m4hTimer);_mcxVi3m4hTimer=null;
            var fi2=computeCandleIndicators(f2);
            ctxMap['VI3M-4H']=_mcxDrawOne('mcx-wrap-vi3m-4h',f2,fi2,getCandleDataSource(vi3mSym,'4H'),'VI3M 4H');
            _mcxUpdateTable(ctxMap);
          } else if(_mcxVi3m4hCount>=18){ clearInterval(_mcxVi3m4hTimer);_mcxVi3m4hTimer=null;
            var we2=document.getElementById('mcx-wrap-vi3m-4h');if(we2)we2.innerHTML='<div class="dss-no-data">VI3M 4H unavailable.</div>'; }
        },500);
      }
    }
  }

  // Trigger DXLink subscriptions for SPY/VI3M candles if connected.
  // FF_BACKEND_CANDLES_MCX_CHARTS: when the flag is ON, MCX reads chart candles
  // from the backend cache (read-first) and must NOT open direct frontend Candle
  // subscriptions — not even as a fallback when backend 4H is unavailable. This
  // eliminates the "30M SPY reason=benchmark" / "30M VI3M reason=chart_open" spam.
  if(!ffBackendCandlesMcxCharts()){
    if(S.ttConnected&&typeof _ensureCandleSubscription==='function'){
      _ensureCandleSubscription('SPY', 'benchmark');
      _ensureCandleSubscription(vi3mSym, 'chart_open');
    }
    if(S.ttConnected&&typeof _ensure30MSubscription==='function'){
      _ensure30MSubscription('SPY', 'benchmark');
      _ensure30MSubscription(vi3mSym, 'chart_open');
    }
  }

  // Populate SPY squeeze cache from ctxMap before compact dashboard render.
  // _regimeRenderCompact (called via _mcxDrawVixCurve → _regimeRefresh) uses this cache.
  _mcxSpySqzCache.spy1d = !!(ctxMap['SPY-1D'] && ctxMap['SPY-1D'].sqz);
  _mcxSpySqzCache.spy4h = !!(ctxMap['SPY-4H'] && ctxMap['SPY-4H'].sqz);
  _regimeCompactKey = null; // force re-render with updated squeeze state

  _mcxDrawVixCurve();
  _mcxUpdateTable(ctxMap);
  _mcxRenderSpySqzBadge(); // update MCX VIX block badge after ctxMap is fully built
  _mcxRenderBackendTechnicalSummary();
}

function _mcxRedraw() {
  var s8=document.getElementById('mcx-sma8'), bbEl=document.getElementById('mcx-bb'), kcEl=document.getElementById('mcx-kc');
  if(s8)  _mcxOverlay.sma8 = s8.checked;
  if(bbEl)_mcxOverlay.bb   = bbEl.checked;
  if(kcEl)_mcxOverlay.kc   = kcEl.checked;
  _mcxRenderCharts();
}

// Refresh charts/VIX/table — does NOT call Claude AI
function _mcxRefresh() {
  if (_mcxRefreshBusy) { console.log('[MCX] refresh skipped — already running'); return; }
  _mcxRefreshBusy = true;
  var tsEl = document.getElementById('mcx-ts');
  if (tsEl) tsEl.textContent = 'Refreshing…';
  var p = _mcxRefreshVixData();
  p.then(function(){
    return new Promise(function(res){ setTimeout(res, 0); });
  }).then(function(){
    return _mcxRenderCharts(); // async — return Promise so next .then waits
  }).then(function(){
    var tsEl2 = document.getElementById('mcx-ts');
    if (tsEl2) tsEl2.textContent = 'Updated ' + new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    _mcxRefreshBusy = false;
  }).catch(function(e){
    _mcxRefreshBusy = false;
    console.log('[MCX] refresh error:', e);
  });
}

function _mcxStartAutoRefresh() {
  _mcxStopAutoRefresh();
  // The open-path snapshot trigger now lives in _mcxInit() via _mcxRefreshVixData();
  // this function only owns the single 60s interval (no duplicate timer, no double fetch).
  _mcxAutoRefreshTimer = setInterval(function(){
    if (_activeView === 'mcx') _mcxRefresh();
  }, 60000);
  console.log('[MCX] auto-refresh started (60s)');
}

function _mcxStopAutoRefresh() {
  if (_mcxAutoRefreshTimer) {
    clearInterval(_mcxAutoRefreshTimer);
    _mcxAutoRefreshTimer = null;
    console.log('[MCX] refresh stopped');
  }
  if (_mcxResizeObs) { _mcxResizeObs.disconnect(); _mcxResizeObs = null; }
  _mcxStopLiveUpdates();
}

// Initialise the MCX full-page view (called by showView('mcx'))
function _mcxInit() {
  console.log('[MCX] init');
  setAS('market-context','busy','Loading Market Context...');
  // Sync checkbox state to persisted overlay object
  var s8=document.getElementById('mcx-sma8'), bbEl=document.getElementById('mcx-bb'), kcEl=document.getElementById('mcx-kc');
  if(s8)  s8.checked  = _mcxOverlay.sma8;
  if(bbEl)bbEl.checked = _mcxOverlay.bb;
  if(kcEl)kcEl.checked = _mcxOverlay.kc;
  // Restore cached macro result or show placeholder
  var res = document.getElementById('mcxResults');
  if (res && !res.dataset.hasContent) {
    if (S.marketContextSummary) {
      var age = S.marketContextTimestamp ? Math.round((Date.now()-S.marketContextTimestamp)/60000) : null;
      var ageStr = age != null ? ' <span style="color:var(--tx3)">('+age+'m ago)</span>' : '';
      res.innerHTML = '<div style="font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7">' +
        '<span style="color:var(--tx3);font-size:9px">CACHED'+ageStr+'</span><br>' +
        S.marketContextSummary.replace(/\n/g,'<br>') + '</div>';
    } else {
      res.innerHTML = '<span style="color:var(--tx3);font-size:10px;font-family:var(--M)">No macro check run yet. Click RUN MACRO CHECK to analyse binary event risk.</span>';
    }
  }
  // Trigger VIX/MCX data refresh through the snapshot-aware path so the backend
  // snapshot bridge fires when MCX opens (flag ON). Flag OFF -> behavior is
  // identical to the previous direct VIX-family fetch + curve draw (see
  // _mcxRefreshVixData). Routing the open path here avoids the race where a
  // post-login VIX-family prefetch fills S.vixFamily with DXLink data and the
  // backend snapshot then never runs.
  _mcxRefreshVixData();
  // Force a real VIX-family refresh on MCX open so the regime alert (dashboard
  // compact + MCX) reflects fresh VIX, not a reused S.vixFamily (req D). Draws
  // no charts — chart freshness is handled by the forced render below.
  if (typeof refreshSharedMarketRegime === 'function') refreshSharedMarketRegime('mcx_open', { force: true });
  // Phase 1: RAF + timeout ensures CSS grid layout is fully computed before drawing.
  // First render forces a warmup+read so a manual open shows genuinely fresh
  // candles; the double-pass / ResizeObserver redraws reuse the now-fresh cache.
  requestAnimationFrame(function() {
    setTimeout(function() {
      _mcxRenderCharts({ forceRefresh: true, reason: 'mcx_open' });
      // Phase 3: double-pass — catches charts whose flex containers settled late
      setTimeout(_mcxRenderCharts, 100);
    }, 0);
  });
  // Phase 4: ResizeObserver catches any further layout shifts (e.g. scrollbar appearance)
  _mcxAttachResizeObserver();
  _mcxStartAutoRefresh();
  setAS('market-context','ok','Pronto');
}
