// BACKEND DIRECTIONAL SNAPSHOT — PURE ADAPTER + CONSTANTS
//
// Classic synchronous script loaded after the existing BSS/directional modules
// and before the inline monolith.
//
// Owns only the eight DSB_* numeric var bindings and the eleven side-effect-free
// normalization/classification helpers measured by the DSB boundary contract.
//
// No state ownership, DOM, storage, network, timers, subscriptions, bootstrap,
// window exposure or load-time shared-global access.
//
// Every declaration below was relocated BYTE-FOR-BYTE out of the inline monolith:
// identical names, identical `var` binding form, identical signatures, identical
// bodies and identical relative physical order. Nothing here was rewritten, and
// the surrounding explanatory comments stayed inline where they were.
// ─────────────────────────────────────────────────────────────────────────────

// ── the eight DSB_* tuning constants (var bindings, values unchanged) ────────
var DSB_SNAPSHOT_TTL_MS = 60000;
var DSB_AUTO_REFRESH_MS = 600000;
var DSB_LIVE_ENRICH_TTL_MS = 30000;
var DSB_LIVE_SYMBOL_CAP = 30;
var DSB_PRICE_FRESH_MS = 300000;
var DSB_LIVE_RETRY_MS = 3000;
var DSB_LIVE_ABORT_COOLDOWN_MS = 8000;
var DSB_CHART_LIVE_TTL_MS = 5000;

// ── the eleven measured-pure normalization / classification helpers ──────────
function _dsbNum(v){ return (typeof v==='number'&&isFinite(v))?v:null; }
function _dsbStr(v){ return (typeof v==='string'&&v.length>0)?v:null; }
function _dsbBool(v){ return v===true?true:(v===false?false:null); }
function _dsbObj(v){ return (v&&typeof v==='object'&&!Array.isArray(v))?v:null; }
function _dsbSafeSym(v){
  if(v==null)return null;
  var s=String(v).trim().toUpperCase();
  if(!s||/[^A-Z0-9._\/:-]/.test(s))return null;
  return s;
}
function dsbClassifyRowPrice(r){
  if(!r)return 'unavailable';
  if(r.priceIsLive===true)return 'live';
  if(r.price==null||!isFinite(+r.price))return 'unavailable';
  if(!r.priceStaleReason&&r.priceUpdatedAt){
    var t=Date.parse(r.priceUpdatedAt);
    if(isFinite(t)){
      var age=Date.now()-t;
      if(age>=0&&age<DSB_PRICE_FRESH_MS)return 'recent';
    }
  }
  return 'close';
}
function dsbRowPriceIsCurrent(r){
  var cls=dsbClassifyRowPrice(r);
  return cls==='live'||cls==='recent';
}
function dsbNormalizeResultRow(r){
  var c=_dsbObj(r)||{};
  var warnings=[];
  if(Array.isArray(c.warnings))c.warnings.forEach(function(w){ if(_dsbStr(w))warnings.push(w); });
  var ticker=_dsbSafeSym(c.symbol!=null?c.symbol:c.ticker);

  var dirRaw=(typeof c.direction==='string')?c.direction.toLowerCase():null;
  var direction=(dirRaw==='bullish'||dirRaw==='long')?'bullish'
    :(dirRaw==='bearish'||dirRaw==='short')?'bearish':null;
  if(direction===null)warnings.push('missing_operational_direction');

  var price=_dsbNum(c.lastPrice);
  if(price===null)price=_dsbNum(c.price);

  var tf1=_dsbObj(c.timeframe1D),tf4=_dsbObj(c.timeframe4H);
  var ind1=(tf1&&_dsbObj(tf1.indicators))||{};
  var ind4=(tf4&&_dsbObj(tf4.indicators))||{};
  var rsi=_dsbNum(ind1.rsi14); if(rsi===null)rsi=_dsbNum(c.rsi14); if(rsi===null)rsi=_dsbNum(c.rsi);
  var ma20=_dsbNum(ind1.sma20); if(ma20===null)ma20=_dsbNum(c.sma20);
  var ma30=_dsbNum(ind1.sma30); if(ma30===null)ma30=_dsbNum(c.sma30);
  var sma20AboveSma30=_dsbBool(ind1.sma20AboveSma30);
  if(sma20AboveSma30===null&&ma20!==null&&ma30!==null)sma20AboveSma30=ma20>ma30;
  var rs=_dsbNum(ind1.relativeStrengthVsSpy); if(rs===null)rs=_dsbNum(c.relativeStrengthVsSpy);
  var rsRising=_dsbBool(ind1.rsRising); if(rsRising===null)rsRising=_dsbBool(c.rsRising);
  var squeeze=_dsbBool(ind1.squeeze); if(squeeze===null)squeeze=_dsbBool(ind1.squeezeState); if(squeeze===null)squeeze=_dsbBool(c.squeezeState);

  function tfSummary(tf,ind){
    if(!tf)return null;
    return {
      count:_dsbNum(tf.candlesCount)!==null?_dsbNum(tf.candlesCount):_dsbNum(tf.candleCount),
      lastTimestamp:(tf.lastTimestamp!=null)?tf.lastTimestamp:null,
      updatedAt:_dsbStr(tf.updatedAt),
      source:_dsbStr(tf.source),
      derivedFrom30M:_dsbBool(tf.derivedFrom30M),
      derivationReason:_dsbStr(tf.derivationReason),
      stale:_dsbBool(tf.stale),
      indicators:ind||null,
    };
  }
  var tf1d=tfSummary(tf1,ind1),tf4h=tfSummary(tf4,ind4);
  var staleFlags=_dsbObj(c.staleFlags);
  var rowStale=(tf1d&&tf1d.stale===true)||(tf4h&&tf4h.stale===true)||_dsbBool(c.stale)===true;
  if(!rowStale&&staleFlags){
    for(var k in staleFlags){ if(staleFlags[k]===true){rowStale=true;break;} }
  }
  var reasons=[];
  if(Array.isArray(c.reasons))c.reasons.forEach(function(x){ if(_dsbStr(x))reasons.push(x); });

  return {
    ticker:ticker,
    name:_dsbStr(c.name)||ticker,
    direction:direction,
    score:_dsbNum(c.score),
    price:price,
    priceSource:_dsbStr(c.lastPriceSource)||_dsbStr(c.priceSource),
    priceIsLive:_dsbBool(c.lastPriceIsLive),
    priceUpdatedAt:_dsbStr(c.lastPriceUpdatedAt),
    priceStaleReason:_dsbStr(c.lastPriceStaleReason),
    rsi:rsi,ma20:ma20,ma30:ma30,
    sma20AboveSma30:sma20AboveSma30,
    rs:rs,rsRising:rsRising,squeeze:squeeze,
    earningsDte:_dsbNum(c.earningsDte),
    tf1d:tf1d,tf4h:tf4h,
    stale:rowStale===true,
    staleFlags:staleFlags,
    reasons:reasons,
    warnings:warnings,
    backendResult:_dsbObj(r),
  };
}
function dsbParseSnapshot(raw){
  var empty={ok:false,reason:'empty_payload',generatedAt:null,ageMs:null,stale:null,
    dataSource:null,results:[],skipped:[],warnings:[],diagnostics:null,
    symbolsScanned:null,symbolsPassed:null,symbolsSkipped:null};
  var p=_dsbObj(raw);
  if(!p)return empty;
  var ok=p.ok===true;
  var fresh=_dsbObj(p.freshness);
  var generatedAt=_dsbStr(p.generatedAt)||(fresh&&_dsbStr(fresh.generatedAt))||_dsbStr(p.updatedAt)||null;
  var ageMs=_dsbNum(p.ageMs);
  var stale=_dsbBool(p.stale); if(stale===null&&fresh)stale=_dsbBool(fresh.stale);
  var results=[];
  if(Array.isArray(p.results)){
    p.results.forEach(function(r){
      var row=dsbNormalizeResultRow(r);
      if(row.ticker)results.push(row);
    });
  }
  var skipped=[];
  if(Array.isArray(p.skipped)){
    p.skipped.forEach(function(s){
      var so=_dsbObj(s)||{};
      var sym=_dsbSafeSym(so.symbol!=null?so.symbol:so.ticker);
      if(!sym)return;
      skipped.push({symbol:sym,reason:_dsbStr(so.reason),missingData:so.missingData!=null?so.missingData:null,
        queuedWarmup:_dsbBool(so.queuedWarmup)});
    });
  }
  var warnings=[];
  [p.warnings,fresh&&fresh.warnings,_dsbObj(p.diagnostics)&&p.diagnostics.warnings].forEach(function(list){
    if(Array.isArray(list))list.forEach(function(w){ if(_dsbStr(w)&&warnings.length<12)warnings.push(w); });
  });
  return {
    ok:ok,
    reason:ok?null:(_dsbStr(p.reason)||'snapshot_not_ok'),
    generatedAt:generatedAt,ageMs:ageMs,stale:stale,
    dataSource:_dsbStr(p.dataSource),
    results:results,skipped:skipped,warnings:warnings,
    diagnostics:_dsbObj(p.diagnostics),
    symbolsScanned:_dsbNum(p.symbolsScanned),
    symbolsPassed:_dsbNum(p.symbolsPassed),
    symbolsSkipped:_dsbNum(p.symbolsSkipped),
  };
}
function dsbSnapshotAgeMs(st){
  var p=st&&st.parsed;
  if(!p)return null;
  if(p.generatedAt){
    var t=Date.parse(p.generatedAt);
    if(isFinite(t))return Math.max(0,Date.now()-t);
  }
  if(typeof p.ageMs==='number'&&isFinite(p.ageMs)){
    return p.ageMs+(st.lastFetchAt?Math.max(0,Date.now()-st.lastFetchAt):0);
  }
  return null;
}
function dsbRowsForMode(rows,mode){
  var want=(mode==='SHORT')?'bearish':'bullish';
  var out=[];
  (rows||[]).forEach(function(r){ if(r&&r.direction===want)out.push(r); });
  // Default order: backend score desc (nulls last, stable → preserves backend rank).
  return out.slice().sort(function(a,b){
    var as=_dsbNum(a.score),bs=_dsbNum(b.score);
    if(as===null&&bs===null)return 0;
    if(as===null)return 1;
    if(bs===null)return -1;
    return bs-as;
  });
}
