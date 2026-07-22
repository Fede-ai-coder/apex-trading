// ─────────────────────────────────────────────────────────────────────────────
// Pure technical-indicator math extracted verbatim from index.html.
//   • smA  (SMA)            • calcRSI / calcRSIWilder (RSI)
//   • emA  (EMA)            • calcBB  (Bollinger Bands + population stddev)
//   • rma  (Wilder RMA)     • calcKC / calcKCSnap (Keltner Channels + Wilder ATR)
//   • calcADX (ADX)         • calcMACD (MACD, uses emA)
//   • calcSqueeze (BB-in-KC) • calcHVR (historical-volatility rank)
// Operation order, precision, rounding, array alignment, warmup/edge handling and
// null/undefined/NaN behaviour are unchanged; only physical location moved. Loaded as a
// CLASSIC (non-module) script before the inline application script, so these stay global
// functions exactly as before. No top-level side effects.
//
// NOTE (scope): calcMACD, calcSqueeze and calcHVR are the pure residuals now completed by this
// extraction (moved verbatim from index.html); calcMACD calls the global emA, calcSqueeze consumes
// calcBB/calcKC outputs and calcHVR is self-contained math. computeMarketRegime (reads global S) stays.
// ─────────────────────────────────────────────────────────────────────────────
function smA(a,p){return a.map(function(_,i){if(i<p-1)return null;return a.slice(i-p+1,i+1).reduce(function(x,y){return x+y;},0)/p;});}
function emA(a,p){var k=2/(p+1),o=[],pv=null;a.forEach(function(v,i){if(v==null){o.push(null);return;}if(pv===null){if(i>=p-1){var s=a.slice(i-p+1,i+1).filter(function(x){return x!=null;});if(s.length===p){pv=s.reduce(function(x,y){return x+y;},0)/p;o.push(pv);}else o.push(null);}else o.push(null);}else{pv=v*k+pv*(1-k);o.push(pv);}});return o;}
// TradingView-compatible RMA / Wilder Moving Average (matches ta.atr internals):
// seed = SMA of first `length` values; next = (prev * (length-1) + current) / length
function rma(values,length){var out=values.map(function(){return null;});if(values.length<length)return out;var seed=0;for(var j=0;j<length;j++)seed+=values[j];out[length-1]=seed/length;for(var k=length;k<values.length;k++)out[k]=(out[k-1]*(length-1)+values[k])/length;return out;}
// FRONTEND RSI BASELINE (scanner / traffic lights / semafori compatibility note):
// - Function: calcRSI(c), period p=14, input series c = closes[] numeric prices.
// - Delta model: dv = c[i]-c[i-1]; gains=max(dv,0), losses=max(-dv,0).
// - Method: simple rolling-window RSI (NOT Wilder smoothing). For each index i>=14:
//   avgGain = sum(gains[i-14..i-1]) / 14; avgLoss = sum(losses[i-14..i-1]) / 14.
// - RSI formula: avgLoss===0 ? 100 : 100 - (100 / (1 + avgGain/avgLoss)).
// - Seed/warmup: no explicit seed state; first 14 output points are null (i < 14).
// - Insufficient candles: if c.length < 15, output is all null.
// - Rounding: none in calcRSI; callers may round/format later.
// - Null/NaN behavior: no sanitization inside calcRSI (non-numeric inputs can propagate NaN).
function calcRSI(c){var p=14,g=[],l=[];for(var i=1;i<c.length;i++){var dv=c[i]-c[i-1];g.push(dv>0?dv:0);l.push(dv<0?-dv:0);}return c.map(function(_,i){if(i<p)return null;var ag=g.slice(i-p,i).reduce(function(x,y){return x+y;},0)/p;var al=l.slice(i-p,i).reduce(function(x,y){return x+y;},0)/p;return al===0?100:100-(100/(1+ag/al));});}
// Wilder RSI — used for journal snapshots. Seed = SMA(14), then Wilder smoothing: avgGain = (prev*13 + gain) / 14.
// calcRSI above (simple rolling window) is kept for scanner scoring and is NOT changed.
function calcRSIWilder(c){var p=14;if(c.length<=p)return c.map(function(){return null;});var g=[],l=[];for(var i=1;i<c.length;i++){var d=c[i]-c[i-1];g.push(d>0?d:0);l.push(d<0?-d:0);}var res=c.map(function(){return null;});var ag=0,al=0;for(var j=0;j<p;j++){ag+=g[j];al+=l[j];}ag/=p;al/=p;res[p]=al===0?100:100-(100/(1+ag/al));for(var k=p+1;k<c.length;k++){ag=(ag*(p-1)+g[k-1])/p;al=(al*(p-1)+l[k-1])/p;res[k]=al===0?100:100-(100/(1+ag/al));}return res;}

// FRONTEND BOLLINGER BASELINE (scanner / portfolio traffic lights / semafori compatibility note):
// - Function: calcBB(c), where c is closes[] numeric prices for the active timeframe.
// - Period + multiplier: p=20, m=2.
// - Middle band: simple moving average via smA(c,20).
// - Standard deviation window: last 20 closes at each index i => c[i-19..i].
// - Stddev method: POPULATION stddev (divide by p=20, not p-1).
//   st = sqrt( sum((v-mid[i])^2) / 20 ).
// - Bands: upper = mid + 2*st, lower = mid - 2*st.
// - Warmup/insufficient candles: smA outputs null for i<19, and calcBB returns null bands for those indexes.
// - Null/NaN behavior: no sanitization; non-numeric inputs propagate NaN through smA/stddev math.
// - Edge guard detail: `if(!mid[i]) return null` treats 0 as falsy, so an exact mid=0 would also return null.
// - Rounding: none inside calcBB; callers round/format later (for example with toFixed(2) or round2).
// Keep this logic unchanged unless scanner/portfolio/semafori are updated together.
function calcBB(c){var p=20,m=2,mid=smA(c,p);return{mid:mid,upper:c.map(function(_,i){if(!mid[i])return null;var s=c.slice(i-p+1,i+1),st=Math.sqrt(s.reduce(function(a,v){return a+(v-mid[i])*(v-mid[i]);},0)/p);return mid[i]+m*st;}),lower:c.map(function(_,i){if(!mid[i])return null;var s=c.slice(i-p+1,i+1),st=Math.sqrt(s.reduce(function(a,v){return a+(v-mid[i])*(v-mid[i]);},0)/p);return mid[i]-m*st;})};}
// TradingView-compatible BB/KC squeeze baseline:
// BB = SMA(close,20) ± 2 * stdev(close,20)
// KC = SMA(close,20) ± 1.5 * ta.atr(20)
// ta.atr = Wilder/RMA smoothing of True Range
// Squeeze = BB fully inside KC
// Diagnostic: APEX BB/KC uses TradingView-compatible formula — length 20, BB mult 2, KC mult 1.5, KC basis SMA20, ATR20 Wilder/RMA.
function calcKC(candles){var p=20,m=1.5;var c=candles.map(function(x){return x.c;});var tr=candles.map(function(x,i){return i===0?x.h-x.l:Math.max(x.h-x.l,Math.abs(x.h-c[i-1]),Math.abs(x.l-c[i-1]));});var atr=rma(tr,p),basis=smA(c,p);return{mid:basis,upper:basis.map(function(b,i){return b!=null&&atr[i]!=null?b+m*atr[i]:null;}),lower:basis.map(function(b,i){return b!=null&&atr[i]!=null?b-m*atr[i]:null;})};}
// calcKCSnap is now an alias for calcKC (TradingView-compatible SMA20 basis + RMA ATR20).
// Previously used EMA(20) basis; unified here so snapshot squeeze matches scanner/chart squeeze.
function calcKCSnap(candles){return calcKC(candles);}

// ─── ADX (Wilder, period=14) — used by computeMarketRegime ──────────────────
function calcADX(candles,period){
  period=period||14;
  var n=candles.length;
  if(n<2*period+2)return null;
  var tr=[],pdm=[],mdm=[];
  for(var i=1;i<n;i++){
    var c=candles[i],p=candles[i-1];
    tr.push(Math.max(c.h-c.l,Math.abs(c.h-p.c),Math.abs(c.l-p.c)));
    var up=c.h-p.h,dn=p.l-c.l;
    pdm.push(up>dn&&up>0?up:0);
    mdm.push(dn>up&&dn>0?dn:0);
  }
  // Wilder's smoothing: first = sum of first `period`, then = prev - prev/period + current
  function ws(arr){
    var res=[],s=0,j;
    for(j=0;j<period;j++)s+=arr[j];
    res.push(s);
    for(j=period;j<arr.length;j++)res.push(res[res.length-1]-res[res.length-1]/period+arr[j]);
    return res;
  }
  var satr=ws(tr),sp=ws(pdm),sm=ws(mdm),dx=[];
  for(var k=0;k<satr.length;k++){
    if(satr[k]===0){dx.push(0);continue;}
    var pdi=100*sp[k]/satr[k],mdi=100*sm[k]/satr[k],dsum=pdi+mdi;
    dx.push(dsum>0?100*Math.abs(pdi-mdi)/dsum:0);
  }
  var adx=ws(dx);
  return Math.round(adx[adx.length-1]*10)/10;
}

// ─── Completed pure residuals (MACD / BB-in-KC squeeze / HV rank) ────────────
// calcMACD uses the global emA; calcSqueeze consumes calcBB/calcKC outputs; calcHVR is
// self-contained math. Bodies, signatures and behaviour are unchanged — location only.
function calcMACD(c){var e12=emA(c,12),e26=emA(c,26);var ml=e12.map(function(v,i){return v!=null&&e26[i]!=null?v-e26[i]:null;});var vld=ml.filter(function(v){return v!=null;});var sg=emA(vld,9);var si=0;var sf=ml.map(function(v){return v!=null&&si<sg.length?sg[si++]:null;});return{ml:ml,sf:sf,hist:ml.map(function(v,i){return v!=null&&sf[i]!=null?v-sf[i]:null;})};}
function calcSqueeze(B,K){return B.upper.map(function(u,i){return u!=null&&K.upper[i]!=null?u<K.upper[i]&&B.lower[i]>K.lower[i]:false;});}
function calcHVR(closes){var hv=[];for(var i=20;i<closes.length;i++){var sl=closes.slice(i-20,i),lr=sl.map(function(v,j){return j>0?Math.log(v/sl[j-1]):0;}).slice(1);var mn=lr.reduce(function(a,b){return a+b;},0)/lr.length;hv.push(Math.sqrt(lr.reduce(function(a,v){return a+(v-mn)*(v-mn);},0)/lr.length*252)*100);}if(!hv.length)return 50;var cur=hv[hv.length-1],mn=Math.min.apply(null,hv),mx=Math.max.apply(null,hv);return mx===mn?50:Math.round((cur-mn)/(mx-mn)*100);}
