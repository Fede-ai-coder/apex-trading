// ─── REGIME BADGE HTML — used in Portfolio panel ─────────────────────────────
function regimeHTML(){
  var r=S.marketRegime;
  var vColor={LOW:'var(--bl)',NORMAL:'var(--tx2)',HIGH:'var(--am)',ELEVATED:'var(--rd)'}[(r&&r.volatility)||'']||'var(--tx2)';
  var label=r?r.label:'Run scan to detect';
  var src=r?(r.ivrSource==='TASTYTRADE'?'TASTYTRADE':'TASTYTRADE_UNAVAILABLE'):'';
  var time=r&&r.computedAt?r.computedAt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';

  // VIX family row — only shown when S.vixFamily has at least one live value
  var vf=S.vixFamily;
  var vfHTML='';
  if(vf&&(vf.vix!=null||vf.vix9d!=null||vf.vix3m!=null||vf.vix6m!=null)){
    function vfCell(label,val){
      return '<span style="margin-right:10px"><span style="color:var(--tx3)">'+label+'</span> '+
        (val!=null?'<strong>'+val.toFixed(2)+'</strong>':'<span style="color:var(--tx3)">—</span>')+
      '</span>';
    }
    var vfTime=vf.timestamp?new Date(vf.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
    vfHTML='<div style="font-size:9px;font-family:var(--M);margin-top:6px;padding-top:6px;border-top:1px solid var(--b1)">'+
      vfCell('VIX',vf.vix)+vfCell('9D',vf.vix9d)+vfCell('3M',vf.vix3m)+vfCell('6M',vf.vix6m)+
      (vfTime?'<span style="color:var(--tx3);font-size:8px">· '+vfTime+'</span>':'')+
    '</div>';
  }

  return '<div style="background:var(--bg3);border:1px solid var(--b1);border-radius:8px;padding:10px 12px;margin-bottom:10px">'+
    '<div class="ptitle" style="margin-bottom:4px">MARKET REGIME</div>'+
    '<div style="font-size:13px;font-family:var(--M);font-weight:700;color:'+vColor+';letter-spacing:.03em;margin-bottom:4px">'+label+'</div>'+
    (r?'<div style="font-size:8px;font-family:var(--M);color:var(--tx3)">Source: '+src+(time?' · '+time:'')+'</div>':'')+
    vfHTML+
    '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-top:4px;font-style:italic">Context only — validate each underlying setup separately.</div>'+
    '</div>';
}
