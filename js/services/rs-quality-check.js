// Hard quality gate over APPROVED DXLink daily candles. rsi is computed from the
// same approved closes (never the Yahoo-derived d.rsi). bid/ask are the optional
// DXLink quote spread inputs. Returns {pass,sma20,sma30,avgVol,score} or {pass:false}.
function _rsQualityCheck(candles,mode,price,f,rsi,bid,ask){
  var fail={pass:false};
  try{
    var cs=candles;
    if(!cs||cs.length<32)return fail;
    var closes=cs.map(function(c){return c.c;});
    var n=closes.length-1;
    if(price<(f.minPrice||0))return fail;                    // microcap / penny floor
    var avgVol=_rsAvgVol(cs);
    if(avgVol==null||avgVol<(f.minVol||0))return fail;       // illiquid
    // bid/ask spread (only when a DXLink quote is present)
    if(bid!=null&&ask!=null&&bid>0&&ask>0){
      var mid=(bid+ask)/2;
      if(mid>0&&(ask-bid)/mid>0.006)return fail;             // >0.6% spread
    }
    // anti-spike: reject erratic single-session jumps in last 3 sessions
    for(var i=Math.max(1,n-2);i<=n;i++){
      var r=(closes[i]-closes[i-1])/closes[i-1];
      if(Math.abs(r)>0.20)return fail;
    }
    var sma20=smA(closes,20)[n], sma30=smA(closes,30)[n];
    if(sma20==null||sma30==null)return fail;
    var dist=(price-sma20)/sma20;
    // exploded / over-extended squeeze
    if(mode==='STRONG'&&dist>0.40)return fail;
    if(mode==='WEAK'&&dist<-0.40)return fail;
    // structure / trend continuity
    if(mode==='STRONG'){ if(!(sma20>sma30&&price>sma30))return fail; }
    else { if(!(sma20<sma30&&price<sma30))return fail; }
    // RSI sanity (avoid exhaustion / dead names) — RSI from approved closes
    if(rsi!=null){
      if(mode==='STRONG'&&(rsi<45||rsi>82))return fail;
      if(mode==='WEAK'  &&(rsi>55||rsi<18))return fail;
    }
    var score=Math.min(30,Math.log10(Math.max(avgVol,1))*5)+
              (mode==='STRONG'?(sma20-sma30)/sma30:(sma30-sma20)/sma30)*100;
    return {pass:true,sma20:sma20,sma30:sma30,avgVol:avgVol,score:score,rsi:rsi};
  }catch(e){return fail;}
}
