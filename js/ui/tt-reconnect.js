// ── TT RECONNECT panel (accessible after launch) ─────────────
function showReconnectPanel(){
  setPanel('RECONNECT TASTYTRADE',
    '<div class="ptitle">CONNETTI TASTYTRADE</div>'+
    (location.protocol==='file:'?
      '<div class="dc" style="margin-bottom:10px;border-color:var(--rd)">'+
        '<div style="font-size:10px;font-family:var(--M);color:var(--rd);margin-bottom:6px">&#9650; PROBLEMA RILEVATO: stai usando file://</div>'+
        '<div style="font-size:10px;color:var(--tx2);line-height:1.75">'+
          'Il browser blocca le chiamate CORS da <code>file://</code>.<br>'+
          '<strong style="color:var(--am)">Soluzione rapida:</strong><br>'+
          '1. Vai su <strong>github.com</strong> → crea repo → carica apex-v4.html<br>'+
          '2. Settings → Pages → Branch: main → Save<br>'+
          '3. Apri <code>https://TUO-USERNAME.github.io/REPO/apex-v4.html</code><br>'+
          '<em style="color:var(--tx3)">Oppure: python3 -m http.server 8080 e apri localhost:8080</em>'+
        '</div>'+
      '</div>':
      '<div class="dc" style="margin-bottom:10px">'+
        '<div style="font-size:11px;color:var(--tx2);line-height:1.7">'+
          'Inserisci le credenziali Tastytrade per abilitare IVR reale, earnings e posizioni.'+
        '</div>'+
      '</div>'
    )+
    '<div style="margin-bottom:8px">'+
      '<label class="llb">USERNAME</label>'+
      '<input id="rtu" class="li" type="text" placeholder="Tastytrade username" style="margin-top:4px">'+
    '</div>'+
    '<div style="margin-bottom:12px">'+
      '<label class="llb">PASSWORD</label>'+
      '<input id="rtp" class="li" type="password" placeholder="password Tastytrade" style="margin-top:4px">'+
    '</div>'+
    '<div id="rttStatus" style="font-size:10px;font-family:var(--M);margin-bottom:8px;min-height:20px"></div>'+
    '<button onclick="doReconnectTT()" style="width:100%;background:var(--am);color:var(--bg);border:none;border-radius:7px;padding:10px;font-family:var(--M);font-size:10px;font-weight:700;cursor:pointer">&#9670; CONNETTI ORA</button>'
  );
}

async function doReconnectTT(){
  var tu=(document.getElementById('rtu').value||'').trim();
  var tp=(document.getElementById('rtp').value||'').trim();
  var st=document.getElementById('rttStatus');
  if(!tu||!tp){st.style.color='var(--rd)';st.textContent='Inserisci username e password';return;}
  st.style.color='var(--am)';st.textContent='Connessione in corso...';
  console.log('[APEX] Reconnect TT attempt:', tu);
  try{
    // Same robust path as the main login: tolerant timeout + single retry on
    // timeout/network (not on bad credentials) + single-flight.
    var recRes=await _ttAuthLogin(tu,tp);
    if(!recRes.ok)throw new Error(recRes.error||'reconnect failed');
    console.log('[APEX] Reconnect status:', recRes.status);
    var data=recRes.data;
    S.ttSessionId=data.sessionId;
    S._ttSessionSource='memory';
    try{localStorage.setItem('apex_tt_session',data.sessionId);}catch(e){}
    S.ttAccounts=data.accounts||[];
    S.ttConnected=true;
    // Update UI
    document.getElementById('ttPill').style.display='flex';
    document.getElementById('accBtn').style.display='inline-block';
    document.getElementById('reconnectTTBtn').style.display='none';
    document.getElementById('dataPill').innerHTML='DATA: <span style="color:var(--gr)">&#9670; TASTYTRADE LIVE</span>';
    st.style.color='var(--gr)';
    st.textContent='\u2713 Connesso! '+S.ttAccounts.length+' account. sessionId: '+data.sessionId.substring(0,8)+'...';
    logEv('data-fetcher','Tastytrade connesso. sessionId: '+data.sessionId.substring(0,8)+'... Accounts: '+S.ttAccounts.map(function(a){return a.number;}).join(', '),'ok');
    logEv('ivr','IVR reale Tastytrade ora disponibile. Riesegui lo scan.','ok');
    showToast('Tastytrade connesso! '+S.ttAccounts.length+' account trovati.','ok');
    setAS('ivr','ok','Tastytrade connected');
    // A successful reconnect after an initial login timeout must behave like a
    // clean login: replay the FULL post-auth init (auth-state reset, quote-token/
    // DXLink bring-up, VIX family, Market Context, dashboard context prewarm,
    // scanner refresh + Directional live-price enrichment). Idempotent.
    _apexPostAuthInit('reconnect');
    // Immediately enrich existing scan data if available
    if(S.scanData.length>0){
      setTimeout(enrichWithTT,500);
      setTimeout(function(){
        fetchEarningsForAll(S.scanData.map(function(d){return d.ticker;}));
      },1500);
    }
  }catch(e){
    console.error('[APEX] Reconnect FAILED:', e);
    st.style.color='var(--rd)';
    st.textContent='\u2715 Errore: '+e.message;
    S.ttConnected=false;
    logEv('data-fetcher','TT reconnect failed: '+e.message,'err');
  }
}
