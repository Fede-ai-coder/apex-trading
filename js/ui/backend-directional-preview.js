// ── Backend Directional Preview (BDSP) — visible diagnostic preview ──────────
// Additive UI layer for the existing Market / Directional Scanner area. Reads
// bssState().status/snapshot and the pure bds* adapter only. It never fetches
// independently, never calls POST /scanner/run, never opens market-data
// subscriptions, and never mutates either backend candidates or S.scanData.
function bdspStorageKey(){ return 'apex_directional_backend_preview'; }
function bdspState(){
  if(!S.backendDirectionalPreview || typeof S.backendDirectionalPreview !== 'object'){
    S.backendDirectionalPreview = { enabled:false };
  }
  if(S.backendDirectionalPreview.enabled !== true) S.backendDirectionalPreview.enabled = false;
  return S.backendDirectionalPreview;
}
function bdspLoadPersistedEnabled(){
  try { return localStorage.getItem(bdspStorageKey()) === '1'; } catch(e) { return false; }
}
function bdspPersistEnabled(enabled){
  try { localStorage.setItem(bdspStorageKey(), enabled ? '1' : '0'); } catch(e) {}
}
function bdspIsEnabled(){ return bdspState().enabled === true; }
function bdspSetEnabled(enabled){
  var st = bdspState();
  st.enabled = enabled === true;
  if(st.enabled){
    st.scanDataReferenceAtEnable = S.scanData;
  }
  bdspPersistEnabled(st.enabled);
  bdspRender();
}
function bdspToggle(){ bdspSetEnabled(!bdspIsEnabled()); }
function bdspRefresh(){
  // Reuse PR #211 GET-only refresh lifecycle. This deliberately does not call
  // POST /scanner/run and does not create a second polling loop.
  if(typeof bssRefresh === 'function') bssRefresh();
  bdspRender();
}
function bdspBadge(label, cls){ return '<span class="bdsp-b '+(cls||'bss-b-muted')+'">'+escHtml(label == null ? '—' : String(label))+'</span>'; }
function bdspKV(k, vHtml){ return '<div class="bdsp-kv"><div class="bdsp-k">'+escHtml(k)+'</div><div class="bdsp-v">'+vHtml+'</div></div>'; }
function bdspFmtNum(v, digits){ return (typeof bssNum === 'function') ? bssNum(v, digits) : (v == null ? '—' : String(v)); }
function bdspFmtAge(ms){ return (typeof bssFmtAgeMs === 'function') ? bssFmtAgeMs(ms) : (ms == null ? '—' : String(ms)); }
function bdspFmtClock(v){ return (typeof bssFmtClock === 'function') ? bssFmtClock(v) : (v == null ? '—' : String(v)); }
function bdspFreshBadge(sourceState){
  if(!sourceState) return bdspBadge('—','bss-b-muted');
  if(sourceState.stale === true) return bdspBadge('STALE','bss-b-warn');
  if(sourceState.stale === false) return bdspBadge('FRESH','bss-b-ok');
  return bdspBadge('—','bss-b-muted');
}
function bdspDirBadge(dir){
  if(dir === 'bullish') return bdspBadge('BULLISH','bss-b-ok');
  if(dir === 'bearish') return bdspBadge('BEARISH','bss-b-err');
  return bdspBadge('—','bss-b-muted');
}
function bdspBucketBadge(bucket){
  var cls = bucket === 'A' ? 'bss-b-ok' : bucket === 'B' ? 'bss-b-info' : bucket === 'C' ? 'bss-b-warn' : bucket === 'D' ? 'bss-b-err' : 'bss-b-muted';
  return bdspBadge(bucket || '—', cls);
}
function bdspBoolBadge(v, yes, no){
  if(v === true) return bdspBadge(yes || 'yes','bss-b-ok');
  if(v === false) return bdspBadge(no || 'no','bss-b-muted');
  return bdspBadge('—','bss-b-muted');
}
function bdspParityBadge(r){
  if(r && r.parityComparable === false) return bdspBadge('n/c','bss-b-muted');
  if(r && r.parityMatches === true) return bdspBadge('match','bss-b-ok');
  if(r && r.parityComparable === true && r.parityMatches === false) return bdspBadge('mismatch','bss-b-err');
  return bdspBadge('—','bss-b-muted');
}
function bdspOperationalBadge(v){ return v == null ? bdspBadge('null / inactive','bss-b-muted') : bdspBadge(String(v),'bss-b-pu'); }
function bdspRenderSourceState(sourceState){
  if(!sourceState){
    return '<div class="bdsp-card"><div class="bdsp-empty">Backend snapshot panel not loaded yet.</div></div>';
  }
  var availableCls = sourceState.available ? 'bss-b-ok' : 'bss-b-warn';
  var schedCls = sourceState.schedulerEnabled === true ? 'bss-b-ok' : sourceState.schedulerEnabled === false ? 'bss-b-off' : 'bss-b-muted';
  return '<div class="bdsp-card"><div class="bdsp-head">'
    + '<span class="bdsp-title">Backend Preview source</span>'
    + bdspBadge('DIAGNOSTIC ONLY','bss-b-pu') + bdspBadge('NOT OPERATIONAL','bss-b-muted')
    + '</div><div class="bdsp-grid">'
    + bdspKV('Backend available', bdspBadge(sourceState.available ? 'yes' : 'no', availableCls))
    + bdspKV('Reason', escHtml(sourceState.reason || '—'))
    + bdspKV('Snapshot ok', bdspBoolBadge(sourceState.snapshotOk, 'ok', 'no'))
    + bdspKV('Scheduler', bdspBadge(sourceState.schedulerEnabled === true ? 'ON' : sourceState.schedulerEnabled === false ? 'OFF' : '—', schedCls))
    + bdspKV('Freshness', bdspFreshBadge(sourceState))
    + bdspKV('Age', escHtml(bdspFmtAge(sourceState.ageMs)))
    + bdspKV('Updated at', escHtml(bdspFmtClock(sourceState.updatedAt)))
    + bdspKV('Next run', escHtml(bdspFmtClock(sourceState.nextScheduledRunAt)))
    + '</div></div>';
}
function bdspRenderSummary(summary){
  summary = summary || bdsBackendDirectionalSummary([]);
  var top = (summary.topSymbols || []).length ? summary.topSymbols.map(function(s){ return bdspBadge(s, 'bss-b-pu'); }).join(' ') : escHtml('—');
  return '<div class="bdsp-card"><div class="bdsp-head"><span class="bdsp-title">Backend directional summary</span></div><div class="bdsp-grid">'
    + bdspKV('Total rows', escHtml(String(summary.total || 0)))
    + bdspKV('Bullish', bdspBadge(summary.bullish || 0, 'bss-b-ok'))
    + bdspKV('Bearish', bdspBadge(summary.bearish || 0, 'bss-b-err'))
    + bdspKV('Rank eligible', bdspBadge(summary.rankEligible || 0, 'bss-b-info'))
    + bdspKV('Buckets', escHtml('A '+((summary.bucketCounts&&summary.bucketCounts.A)||0)+' / B '+((summary.bucketCounts&&summary.bucketCounts.B)||0)+' / C '+((summary.bucketCounts&&summary.bucketCounts.C)||0)+' / D '+((summary.bucketCounts&&summary.bucketCounts.D)||0)))
    + bdspKV('Parity', escHtml('match '+(summary.parityMatches || 0)+' / mismatch '+(summary.parityMismatches || 0)))
    + bdspKV('Complete core', escHtml(String(summary.withCompleteTechnicals || 0)))
    + bdspKV('Top symbols', top)
    + '</div></div>';
}
function bdspRenderRows(rows){
  if(!Array.isArray(rows) || !rows.length){
    return '<div class="bdsp-card"><div class="bdsp-empty">No backend directional rows are currently eligible.</div></div>';
  }
  var head = ['Symbol','Source','Direction','Confidence','Score Preview','Bucket','Rank Eligible','Price','RSI14','RS vs SPY','SMA8/SMA20/SMA30','Dist SMA8/SMA20','Parity','Candles','Core Technicals','Operational Direction','Operational Score','Warnings']
    .map(function(h){ return '<th>'+escHtml(h)+'</th>'; }).join('');
  var body = rows.map(function(r){
    var sma = [r.sma8,r.sma20,r.sma30].map(function(v){ return bdspFmtNum(v, 2); }).join(' / ');
    var dist = bdspFmtNum(r.distFromSma8, 2)+' / '+bdspFmtNum(r.distFromSma20, 2);
    var candles = (r.candleCount == null ? '—' : String(r.candleCount)) + (r.candleSource ? (' · '+r.candleSource) : '') + (r.candleReason ? (' · '+r.candleReason) : '');
    var warnings = (Array.isArray(r.warnings) && r.warnings.length) ? r.warnings.join(', ') : '—';
    return '<tr>'
      + '<td><strong>'+escHtml(r.symbol || '—')+'</strong></td>'
      + '<td>'+bdspBadge('Backend Preview','bss-b-pu')+'</td>'
      + '<td>'+bdspDirBadge(r.direction)+'</td>'
      + '<td>'+escHtml(r.directionConfidence || '—')+'</td>'
      + '<td>'+bdspBadge(bdspFmtNum(r.scorePreview, 0)+' preview','bss-b-info')+'</td>'
      + '<td>'+bdspBucketBadge(r.scoreBucket)+'</td>'
      + '<td>'+bdspBoolBadge(r.rankEligible, 'eligible', 'no')+'</td>'
      + '<td>'+escHtml(bdspFmtNum(r.price, 2))+'</td>'
      + '<td>'+escHtml(bdspFmtNum(r.rsi14, 1))+'</td>'
      + '<td>'+escHtml(bdspFmtNum(r.relativeStrengthVsSpy, 2))+'</td>'
      + '<td>'+escHtml(sma)+'</td>'
      + '<td>'+escHtml(dist)+'</td>'
      + '<td>'+bdspParityBadge(r)+'</td>'
      + '<td>'+escHtml(candles)+'</td>'
      + '<td>'+bdspBoolBadge(r.completeCoreTechnicals, 'yes', 'no')+'</td>'
      + '<td>'+bdspOperationalBadge(r.operationalDirection)+'</td>'
      + '<td>'+bdspOperationalBadge(r.operationalScore)+'</td>'
      + '<td class="bdsp-warn">'+escHtml(warnings)+'</td>'
      + '</tr>';
  }).join('');
  return '<div class="bdsp-card"><div class="bdsp-head"><span class="bdsp-title">Backend-derived candidates</span>'
    + bdspBadge('Backend Preview rows','bss-b-info') + bdspBadge('Diagnostic only','bss-b-pu') + '</div><div class="bdsp-scroll"><table class="bdsp-table"><thead><tr>'
    + head + '</tr></thead><tbody>' + body + '</tbody></table></div></div>';
}
function bdspIsScannerSourceActive(){ return bdspIsEnabled(); }
function bdspGetRowsForScannerResults(){
  var state = (typeof bssState === 'function') ? bssState() : null;
  var snapshot = state && typeof state === 'object' ? state.snapshot : null;
  var status = state && typeof state === 'object' ? state.status : null;
  var sourceState = state && typeof state === 'object' ? bdsGetBackendDirectionalSourceState(snapshot, status) : null;
  var rows = snapshot ? bdsDeriveBackendDirectionalRows(snapshot, { includeNonEligible:false }) : [];
  return { state:state, snapshot:snapshot, status:status, sourceState:sourceState, rows:rows, summary:bdsBackendDirectionalSummary(rows) };
}
function bdspRenderBackendResultEmptyState(sourceState){
  var reason = sourceState && sourceState.reason ? ' Reason: '+sourceState.reason+'.' : '';
  return '<div class="bdsp-card"><div class="bdsp-empty"><strong>Backend snapshot unavailable — switch back to Frontend Scanner or wait for scheduler.</strong><br>'+escHtml(reason)+'</div></div>';
}
function bdspRenderBackendResultRows(rows){ return bdspRenderRows(rows); }
function bdspRenderScannerResultsOverride(){
  var scan = document.getElementById('scanResults');
  if(!scan) return false;
  var pack = bdspGetRowsForScannerResults();
  var sourceState = pack.sourceState;
  var rows = pack.rows;
  var st = bdspState();
  st.renderedInScannerResults = true;
  st.lastRenderAt = new Date().toISOString();
  st.lastRowCount = rows.length;
  st.rows = rows;
  scan.style.display = 'block';
  var unavailable = !sourceState || !pack.snapshot || pack.snapshot.ok !== true || !Array.isArray(rows) || rows.length === 0;
  var sourceStateHtml = sourceState ? bdspRenderSourceState(sourceState) : bdspRenderSourceState(null);
  scan.innerHTML = '<div class="bdsp-wrap" style="display:block;padding:10px 14px">'
    + '<div class="bdsp-head"><span class="bdsp-title">Backend Preview source active — diagnostic only</span>'
    + bdspBadge('NOT OPERATIONAL','bss-b-muted')
    + '<button class="bdsp-toggle" onclick="bdspRefresh()" title="Calls bssRefresh() GET-only. Does not run scanner.">&#x21bb; Refresh preview</button>'
    + '<span class="bdsp-note">RUN SCAN updates frontend scanner data; switch to Frontend Scanner to view it.</span></div>'
    + sourceStateHtml
    + (unavailable ? bdspRenderBackendResultEmptyState(sourceState) : bdspRenderSummary(pack.summary) + bdspRenderBackendResultRows(rows))
    + '</div>';
  return true;
}
function bdspMaybeRenderScannerResults(){
  if(!bdspIsScannerSourceActive()) return false;
  return bdspRenderScannerResultsOverride();
}
function bdspRestoreFrontendScannerResults(){
  var st = bdspState();
  st.renderedInScannerResults = false;
  st.lastRowCount = 0;
  var scan = document.getElementById('scanResults');
  if(scan) scan.style.display = 'block';
  if(typeof renderScanResults === 'function') renderScanResults();
  else if(scan) scan.innerHTML = '';
}
function bdspRender(){
  var enabled = bdspIsEnabled();
  var wrap = document.getElementById('bdsp-preview');
  var fb = document.getElementById('bdsp-frontend-btn');
  var bb = document.getElementById('bdsp-backend-btn');
  if(fb) fb.classList.toggle('on', !enabled);
  if(bb) bb.classList.toggle('on', enabled);
  if(wrap){ wrap.style.display = 'none'; wrap.innerHTML = ''; }
  if(enabled) bdspRenderScannerResultsOverride();
  else bdspRestoreFrontendScannerResults();
}
function bdspInit(){
  bdspState().enabled = bdspLoadPersistedEnabled() === true;
  bdspRender();
}
function apexDebugBackendDirectionalPreview(){
  var enabled = bdspIsEnabled();
  var state = (typeof bssState === 'function') ? bssState() : null;
  var snapshot = state && state.snapshot;
  var status = state && state.status;
  var sourceState = bdsGetBackendDirectionalSourceState(snapshot, status);
  var rows = bdsDeriveBackendDirectionalRows(snapshot, { includeNonEligible:false });
  var st = bdspState();
  var currentScanData = S.scanData;
  return { enabled: enabled, renderingScannerResults: st.renderedInScannerResults === true, sourceState: sourceState, summary: bdsBackendDirectionalSummary(rows), rowCount: rows.length, rows: rows, scanDataUntouched: !st.scanDataReferenceAtEnable || currentScanData === st.scanDataReferenceAtEnable };
}
