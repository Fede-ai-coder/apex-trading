// Renders a price-line chart from the daily candle buffer (Railway/Yahoo).
// If DXLink mark price is available it is injected as the last data point
// so the line ends at the current live price. This is a line chart, NOT fake OHLC.
function _dssRender1DChart(symbol){
  try{
    var d=S.scanData.find(function(x){return x.ticker===symbol;});
    if(!d||!d.candles||d.candles.length<30)return;
    var el=document.getElementById('dss-chart-1d');
    if(!el)return;
    var showBB=document.getElementById('dss-bb')?document.getElementById('dss-bb').checked:true;
    var showKC=document.getElementById('dss-kc')?document.getElementById('dss-kc').checked:false;
    var candles=d.candles.slice(-90);
    var closes=candles.map(function(c){return c.c;});
    var labels=candles.map(function(c){return c.date||new Date(c.t*1000).toISOString().substring(5,10);});
    // Inject live DXLink mark as the final point when fresher than candle close —
    // only during the regular session (never an AH/PM mark on a DSS chart).
    if(getUsEquityMarketSession().isRegularSession&&d._priceSource==='DXLink'&&d.price&&d.bid!=null){
      var liveMk=parseFloat(d.price);
      if(!isNaN(liveMk)&&liveMk>0&&Math.abs(liveMk-closes[closes.length-1])>0.005){
        closes=closes.slice();closes[closes.length-1]=liveMk; // replace last close with live mark
      }
    }
    var ma20arr=smA(closes,20),ma30arr=smA(closes,30);
    var datasets=[
      {label:'Price (close / live mark)',data:closes,borderColor:'#e8e8f0',borderWidth:1.5,fill:false,pointRadius:0,tension:0},
      {label:'SMA20',data:ma20arr,borderColor:'#00d48a',borderWidth:1,fill:false,pointRadius:0,tension:0},
      {label:'SMA30',data:ma30arr,borderColor:'#ffb340',borderWidth:1,fill:false,pointRadius:0,tension:0,borderDash:[4,3]}
    ];
    if(showBB){
      var B=calcBB(closes);
      datasets.push({label:'BB+',data:B.upper,borderColor:'rgba(124,111,255,.5)',borderWidth:1,fill:false,pointRadius:0,tension:0,borderDash:[2,2]});
      datasets.push({label:'BB-',data:B.lower,borderColor:'rgba(124,111,255,.5)',borderWidth:1,fill:false,pointRadius:0,tension:0,borderDash:[2,2]});
    }
    if(showKC){
      var K=calcKC(candles);
      datasets.push({label:'KC+',data:K.upper,borderColor:'rgba(0,212,200,.4)',borderWidth:1,fill:false,pointRadius:0,tension:0,borderDash:[3,3]});
      datasets.push({label:'KC-',data:K.lower,borderColor:'rgba(0,212,200,.4)',borderWidth:1,fill:false,pointRadius:0,tension:0,borderDash:[3,3]});
    }
    el.innerHTML='<canvas id="dss-canvas-1d" style="width:100%;height:104px"></canvas>';
    var ctx=document.getElementById('dss-canvas-1d').getContext('2d');
    new Chart(ctx,{
      type:'line',
      data:{labels:labels,datasets:datasets},
      options:{
        responsive:true,maintainAspectRatio:false,animation:{duration:0},
        plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a24',borderColor:'rgba(255,255,255,.1)',borderWidth:1,titleColor:'#e8e8f0',bodyColor:'#8888a8',padding:6}},
        scales:{
          x:{ticks:{color:'#4a4a6a',font:{size:7},maxTicksLimit:5},grid:{color:'rgba(255,255,255,.04)'}},
          y:{position:'right',ticks:{color:'#4a4a6a',font:{size:7},maxTicksLimit:4},grid:{color:'rgba(255,255,255,.04)'}}
        }
      }
    });
  }catch(e){/* chart render failure is non-fatal */}
}

function _dssRedrawCharts(symbol){
  try{
    if(S.scanData.find(function(x){return x.ticker===symbol;})&&document.getElementById('dss-chart-1d'))
      _dssRender1DChart(symbol);
  }catch(e){}
}
