// Backward-compat stub: selAgent still routes here from old code paths
function runMarketContextPanel() { showView('mcx'); }

// Called by "RUN MACRO CHECK" button — wraps the AI call, marks result as user-initiated
function _mcxRunMacroCheck() {
  var res = document.getElementById('mcxResults');
  if (res) res.dataset.hasContent = '1';  // prevent _mcxInit from overwriting during same session
  runMarketContextAnalysis();
}

async function runMarketContextAnalysis(){
  console.log('[MCX] macro check started');
  setAS('market-context','busy','Analisi macro in corso...');
  var res=document.getElementById('mcxResults');
  if(res)res.innerHTML='<div style="font-size:10px;font-family:var(--M);color:var(--tx2)">'+
    '<div class="td2"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>'+
    ' Analisi contesto mercato con web search...</div>';

  // Build context from scan data + S state
  var vixD=S.scanData.find(function(d){return d.ticker==='VIX'||d.ticker==='^VIX';});
  var spyD=S.scanData.find(function(d){return d.ticker==='SPY';});
  var qqq=S.scanData.find(function(d){return d.ticker==='QQQ';});

  var ctx=[
    '=== MARKET CONTEXT REQUEST ===',
    'Data: '+new Date().toLocaleDateString('it-IT',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),
    '',
    '=== DATI DISPONIBILI DALLO SCANNER ===',
    'SPY: '+(spyD?'$'+spyD.price+' ('+spyD.changePct+'%) RSI:'+spyD.rsi:'N/A')+
      (S.lastScan?' [scan: '+Math.round((Date.now()-S.lastScan)/60000)+'min ago]':'[no scan]'),
    'QQQ: '+(qqq?'$'+qqq.price+' ('+qqq.changePct+'%) RSI:'+qqq.rsi:'N/A'),
    '',
    '=== ISTRUZIONI ===',
    'Analizza il contesto macro attuale per un options trader.',
    'USA IL WEB SEARCH per trovare:',
    '1. Livello VIX e VIX3M oggi',
    '2. Eventuali eventi binari non-ordinari imminenti (escludi FOMC normale, earnings ordinari)',
    '   - Cerca: tariffe doganali, escalation geopolitica, sanzioni emergenziali, crisi valutarie',
    '3. Sentiment di mercato attuale (risk-on / risk-off)',
    '4. Qualsiasi warning che un desk di opzioni professionista emetterebbe oggi',
    '',
    'Produci un report strutturato nel formato richiesto.',
    'Sii diretto e operativo — il trader userà questo per decidere se aprire nuove posizioni.',
  ].join('\n');

  try{
    var analysis=await callAgent('market-context',ctx);
    setAS('market-context','ok','Contesto aggiornato');
    // Stamp timestamp + risk badge in MCX full-page view
    var tsEl=document.getElementById('mcx-ts'); if(tsEl)tsEl.textContent='Updated '+new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    var rbEl=document.getElementById('mcx-risk-badge');

    // Parse for binary event risk level
    var riskLevel='NONE';
    if(analysis.includes('BINARY EVENT RISK: CRITICAL'))riskLevel='CRITICAL';
    else if(analysis.includes('BINARY EVENT RISK: HIGH'))riskLevel='HIGH';
    else if(analysis.includes('BINARY EVENT RISK: MODERATE'))riskLevel='MODERATE';

    var riskColor=riskLevel==='CRITICAL'?'var(--rd)':riskLevel==='HIGH'?'var(--am)':riskLevel==='MODERATE'?'#f97316':'var(--gr)';
    if(rbEl)rbEl.innerHTML='<span style="font-weight:700;color:'+riskColor+'">'+riskLevel+'</span>';
    var formatted=analysis.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split('\n').join('<br>');

    var html='<div class="stbox" style="border-color:'+riskColor+';margin-top:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
        '<div class="stitle" style="color:#8b5cf6">MARKET CONTEXT</div>'+
        '<div style="font-size:11px;font-weight:700;color:'+riskColor+'">'+riskLevel+'</div>'+
      '</div>'+
      '<div style="font-size:10px;font-family:var(--M);line-height:1.75">'+formatted+'</div>'+
    '</div>';
    if(res)res.innerHTML=html;
    appendSysMsg('&#9670; Market Context aggiornato — Binary Event Risk: '+riskLevel);
    appendAgentMsg('market-context',analysis);

    // Store globally so other agents can read it — with timestamp for staleness check
    S.marketContextRisk=riskLevel;
    S.marketContextSummary=analysis.substring(0,400);
    S.marketContextTimestamp=Date.now();
    S.marketContextValidMinutes=240; // 4h validity
    logEv('market-context','Context update: binary risk='+riskLevel,'ok');
    console.log('[MCX] macro check completed — risk='+riskLevel);
  }catch(e){
    if(res)res.innerHTML='<div style="color:var(--rd);font-size:10px">Errore: '+e.message+'</div>';
    setAS('market-context','err',e.message);
    console.log('[MCX] macro check error:', e.message);
  }
}

