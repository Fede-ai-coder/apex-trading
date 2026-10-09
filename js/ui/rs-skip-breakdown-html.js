// Detailed skip-reason breakdown + near-miss list for the panel (replaces the
// generic "N skipped" note).
function rsbSkipBreakdownHtml(breakdown,nearMisses,spyStatus){
  if((!breakdown||!breakdown.total)&&(!nearMisses||!nearMisses.length))return '';
  var rows=(breakdown&&breakdown.byReason||[]).map(function(b){
    return '<div style="display:flex;justify-content:space-between;gap:8px"><span>'+escHtml(b.reason)+'</span><span style="color:var(--tx2)">'+b.count+'</span></div>';
  }).join('');
  var spyNote='';
  if(spyStatus){
    var s1=spyStatus.spy1d.cached?('1D ok ('+spyStatus.spy1d.candles+')'):'<span style="color:var(--am)">1D missing</span>';
    var s4=spyStatus.spy4h.cached?('4H ok ('+spyStatus.spy4h.candles+')'):'<span style="color:var(--am)">4H missing</span>';
    spyNote='<div style="margin-top:4px;color:var(--tx3)">SPY benchmark &middot; '+s1+' &middot; '+s4+'</div>';
  }
  var nm='';
  if(nearMisses&&nearMisses.length){
    nm='<div style="margin-top:5px;color:var(--tx3)">Top skipped by RS score (near misses):</div>'+
      nearMisses.map(function(m){
        var col=(m.score!=null&&m.score>=0)?'var(--gr)':'var(--rd)';
        return '<div style="display:flex;justify-content:space-between;gap:8px"><span>'+escHtml(m.ticker)+' <span style="color:var(--tx3)">'+escHtml(m.reason)+'</span></span><span style="color:'+col+'">'+(m.score!=null?((m.score>=0?'+':'')+m.score.toFixed(2)+'%'):'—')+'</span></div>';
      }).join('');
  }
  return '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-top:8px;padding:5px 7px;border:1px solid var(--b1);border-radius:4px;background:var(--bg2)">'+
    '<div style="color:var(--tx2);margin-bottom:3px">SKIPPED BREAKDOWN'+(breakdown?(' &middot; '+breakdown.total):'')+'</div>'+
    rows+spyNote+nm+'</div>';
}
