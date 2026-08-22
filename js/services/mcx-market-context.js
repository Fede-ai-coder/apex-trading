function _mcxFiniteNum(x){ return typeof x === 'number' && isFinite(x); }

// Applies a backend snapshot result onto state. Returns true when the backend VIX
// family was valid and bridged into S.vixFamily (so the frontend DXLink VIX fetch
// can be skipped); false means the caller should fall back to the existing flow.
function _mcxApplyBackendSnapshot(snap){
  var st = S.marketContextSnapshot;
  if (!snap || !snap.ok || !snap.data) {
    st.error = (snap && snap.error) || 'unavailable';
    st.pending = false;
    return false;
  }
  var d = snap.data;
  st.data = d;
  st.updatedAt = new Date().toISOString();
  st.source = d.source || 'BACKEND';
  st.error = null;
  // Term structure: store the shape for a low-risk label; do not rewrite curve rendering.
  if (d.termStructure) { st.termShape = d.termStructure.shape || null; }
  // Regime: store for low-risk context; do not touch existing frontend alert logic.
  if (d.regime) { st.volatilityBucket = d.regime.volatilityBucket || null; st.regimeSummary = d.regime.summary || null; }
  // Technicals: store only for inspection/logging in V1 (no chart migration here).
  if (d.technicals) {
    st.technicals = d.technicals;
    try { console.log('[MCX-SNAPSHOT] technicals stored for:', Object.keys(d.technicals).join(',')); } catch (e) {}
  }

  // VIX family bridge.
  var vf = d.vixFamily;
  if (vf && vf.source !== 'UNAVAILABLE' &&
      _mcxFiniteNum(vf.vix9d) && _mcxFiniteNum(vf.vix) && _mcxFiniteNum(vf.vi3m) && _mcxFiniteNum(vf.vix6m)) {
    var prevSymbols = (S.vixFamily && S.vixFamily.symbolsUsed) || {};
    // Freshness guard: a late-arriving backend snapshot must not overwrite a newer
    // (e.g. live DXLink) VIX already in S.vixFamily (req #5/#6). _applyFreshVixFamily
    // only keeps the existing value when its timestamp is strictly newer.
    _applyFreshVixFamily({
      vix:   vf.vix,
      vix9d: vf.vix9d,
      vix3m: vf.vi3m,   // frontend convention is vix3m; backend sends vi3m
      vi3m:  vf.vi3m,   // keep backend name too, harmless
      vix6m: vf.vix6m,
      timestamp: vf.updatedAt || st.updatedAt,
      source: 'BACKEND_SNAPSHOT',
      vixSource: vf.source || d.source || null,
      symbolsUsed: prevSymbols
    });
    st.vixSource = vf.source || null;
    console.log('[MCX-SNAPSHOT] VIX family bridged from backend',
      JSON.stringify({ vix9d:vf.vix9d, vix:vf.vix, vix3m:vf.vi3m, vix6m:vf.vix6m, source:vf.source }));
    return true;
  }
  console.log('[MCX-SNAPSHOT] backend vixFamily missing/incomplete - keeping frontend VIX fallback');
  st.vixSource = null;
  return false;
}

// Small, subtle source/status indicator injected next to the existing #mcx-ts label.
// No-op (and self-removes) when the flag is OFF so flag-off DOM matches current main.
function _mcxUpdateSnapshotStatus(){
  try {
    var tsEl = document.getElementById('mcx-ts');
    if (!tsEl || !tsEl.parentNode) return;
    var el = document.getElementById('mcx-snapshot-src');
    if (!ffMcxBackendSnapshot()) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
    if (!el) {
      el = document.createElement('span');
      el.id = 'mcx-snapshot-src';
      el.style.cssText = 'font-size:8px;font-family:var(--M);color:var(--tx3);margin-left:8px;';
      tsEl.parentNode.insertBefore(el, tsEl.nextSibling);
    }
    var st = S.marketContextSnapshot;
    if (st && st.data && !st.error) {
      var bits = ['MCX source: Backend Snapshot'];
      if (st.vixSource) bits.push('VIX: ' + st.vixSource);
      if (st.termShape) bits.push('Term: ' + st.termShape);
      if (st.volatilityBucket) bits.push('Vol: ' + st.volatilityBucket);
      // Subtle extension: note when at least one backend technical row is in use.
      var techUsed = _mcxBackendTech('SPY','1D') || _mcxBackendTech('SPY','4H') ||
                     _mcxBackendTech('VI3M','1D') || _mcxBackendTech('VI3M','4H');
      if (techUsed) bits.push('Technicals: Backend Snapshot');
      el.textContent = bits.join(' · ');
      el.style.color = 'var(--tx3)';
    } else {
      el.textContent = 'MCX source: Frontend fallback' + (st && st.error ? ' (backend snapshot unavailable)' : '');
      el.style.color = 'var(--am)';
    }
  } catch (e) { /* status indicator must never break MCX */ }
}

// ===== MCX Backend Technical Summary (V1) ==========================================
// Renders a compact technical-summary card row from S.marketContextSnapshot.data.technicals
// for SPY 1D/4H and VI3M 1D/4H. Pure-ish: only touches its own dedicated DOM container.
// Defensive: accepts missing/null data, never throws into the render loop, never migrates
// charts. Gated by apex_ff_mcx_backend_snapshot + backend snapshot availability.

// Returns a backend technical row {symbol}{timeframe} only when it is usable:
// the timeframe object exists, ok !== false, and it carries enough finite fields.
// Returns null otherwise (caller keeps existing frontend display / shows N/A).
function _mcxBackendTech(symbol, timeframe){
  try {
    if (!ffMcxBackendSnapshot()) return null;
    var st = S.marketContextSnapshot;
    if (!st || !st.data || !st.data.technicals) return null;
    var bySym = st.data.technicals[symbol];
    if (!bySym) return null;
    var row = bySym[timeframe];
    if (!row || row.ok === false) return null;
    // Require enough finite fields to be meaningful (at least close + one SMA or RSI).
    var finiteCount = 0;
    var keys = ['close','sma8','sma20','sma30','sma200','rsi14'];
    for (var i = 0; i < keys.length; i++) { if (_mcxFiniteNum(row[keys[i]])) finiteCount++; }
    if (finiteCount < 2) return null;
    return row;
  } catch (e) { return null; }
}

// Formats a numeric tech value defensively; returns 'N/A' for missing/non-finite input.
function _mcxFormatTechValue(value, decimals){
  if (!_mcxFiniteNum(value)) return 'N/A';
  var d = (typeof decimals === 'number' && decimals >= 0) ? decimals : 2;
  try { return value.toFixed(d); } catch (e) { return 'N/A'; }
}

// SMA20 vs SMA30 structural bias. Prefers the finite SMA values; falls back to the
// backend-provided sma20VsSma30 hint. Returns a {label,color} pair.
function _mcxTechBiasLabel(row){
  if (!row) return { label:'N/A', color:'var(--tx3)' };
  var a = row.sma20, b = row.sma30;
  if (_mcxFiniteNum(a) && _mcxFiniteNum(b)) {
    if (a > b) return { label:'Bullish', color:'var(--gr)' };
    if (a < b) return { label:'Bearish', color:'var(--rd)' };
    return { label:'Neutral', color:'var(--tx3)' };
  }
  var hint = row.sma20VsSma30;
  if (typeof hint === 'string') {
    var h = hint.toLowerCase();
    if (h.indexOf('above') !== -1 || h.indexOf('bull') !== -1 || h === '>') return { label:'Bullish', color:'var(--gr)' };
    if (h.indexOf('below') !== -1 || h.indexOf('bear') !== -1 || h === '<') return { label:'Bearish', color:'var(--rd)' };
    return { label:'Neutral', color:'var(--tx3)' };
  }
  return { label:'N/A', color:'var(--tx3)' };
}

// Price vs an SMA (smaKey e.g. 'sma20'/'sma30'): above / below / near. "near" when the
// price is within ~0.2% of the SMA. Returns a {label,color} pair.
function _mcxPriceVsSmaLabel(row, smaKey){
  if (!row) return { label:'N/A', color:'var(--tx3)' };
  var price = row.close, sma = row[smaKey];
  if (!_mcxFiniteNum(price) || !_mcxFiniteNum(sma) || sma === 0) {
    return { label:'N/A', color:'var(--tx3)' };
  }
  var rel = (price - sma) / Math.abs(sma);
  if (Math.abs(rel) < 0.002) return { label:'Near', color:'var(--tx3)' };
  if (rel > 0) return { label:'Above', color:'var(--gr)' };
  return { label:'Below', color:'var(--rd)' };
}

// Squeeze state: ON / OFF / Unknown. Returns a {label,color} pair.
function _mcxSqueezeLabel(row){
  if (!row || typeof row.squeeze === 'undefined' || row.squeeze === null) {
    return { label:'Unknown', color:'var(--tx3)' };
  }
  if (row.squeeze === true)  return { label:'ON', color:'#e8445a' };
  if (row.squeeze === false) return { label:'OFF', color:'var(--tx3)' };
  return { label:'Unknown', color:'var(--tx3)' };
}

// Renders the compact backend technical summary into #mcx-backend-tech-summary.
// No-op (and clears its container) when the flag is OFF, so flag-OFF DOM/layout matches
// current dev-clean. Never throws into the render loop; never touches charts or other views.
function _mcxRenderBackendTechnicalSummary(){
  try {
    var host = document.getElementById('mcx-backend-tech-summary');
    if (!host) return;
    if (!ffMcxBackendSnapshot()) { host.innerHTML = ''; return; }

    var rows = [
      { sym:'SPY',  tf:'1D', label:'SPY 1D' },
      { sym:'SPY',  tf:'4H', label:'SPY 4H' },
      { sym:'VI3M', tf:'1D', label:'VI3M 1D' },
      { sym:'VI3M', tf:'4H', label:'VI3M 4H' },
    ];

    var st = S.marketContextSnapshot;
    var snapshotAvailable = !!(st && st.data && st.data.technicals);
    if (!snapshotAvailable) {
      // Subtle unavailable notice only — do not clutter or disturb layout.
      host.innerHTML = '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);'+
        'padding:6px 2px">Backend technicals unavailable</div>';
      return;
    }

    var freshness = (st.data.freshness && st.data.freshness.generatedAt) || st.updatedAt || null;
    var usedBackend = 0;
    var cards = '';

    rows.forEach(function(r){
      var row = _mcxBackendTech(r.sym, r.tf);
      var cardStyle = 'flex:1 1 160px;min-width:150px;background:var(--bg3);border:1px solid var(--b1);'+
        'border-radius:6px;padding:8px 10px;font-family:var(--M)';
      var titleStyle = 'font-size:9px;font-weight:700;color:var(--tx2);letter-spacing:.04em;margin-bottom:5px';
      if (!row) {
        cards += '<div style="'+cardStyle+'">'+
          '<div style="'+titleStyle+'">'+r.label+'</div>'+
          '<div style="font-size:8px;color:var(--tx3)">N/A</div></div>';
        return;
      }
      usedBackend++;
      var bias  = _mcxTechBiasLabel(row);
      var vs20  = _mcxPriceVsSmaLabel(row, 'sma20');
      var vs30  = _mcxPriceVsSmaLabel(row, 'sma30');
      var sqz   = _mcxSqueezeLabel(row);
      var closeStr = _mcxFormatTechValue(row.close, 2);
      var rsiStr   = _mcxFormatTechValue(row.rsi14, 1);
      // Optional distances if already present and finite.
      var dist20 = _mcxFiniteNum(row.distFromSma20) ? _mcxFormatTechValue(row.distFromSma20, 2) + '%' : null;
      var dist30 = _mcxFiniteNum(row.distFromSma30) ? _mcxFormatTechValue(row.distFromSma30, 2) + '%' : null;

      function line(k, v, color){
        return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:8px;line-height:1.6">'+
          '<span style="color:var(--tx3)">'+k+'</span>'+
          '<span style="color:'+(color||'var(--tx2)')+';font-weight:600">'+v+'</span></div>';
      }

      cards += '<div style="'+cardStyle+'">'+
        '<div style="'+titleStyle+'">'+r.label+'</div>'+
        line('Close', closeStr)+
        line('RSI14', rsiStr)+
        line('Structure', bias.label, bias.color)+
        line('vs SMA20', vs20.label + (dist20 ? ' ('+dist20+')' : ''), vs20.color)+
        line('vs SMA30', vs30.label + (dist30 ? ' ('+dist30+')' : ''), vs30.color)+
        line('Squeeze', sqz.label, sqz.color)+
        '</div>';
    });

    var headerSrc = usedBackend > 0 ? 'Backend Snapshot' : 'unavailable';
    var freshStr = '';
    if (freshness) {
      try { freshStr = ' · ' + new Date(freshness).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); }
      catch (e) { freshStr = ''; }
    }
    // No usable backend rows (e.g. backend returned ok:false / null technicals for all
    // timeframes): keep the container visually minimal — a single subtle waiting line
    // rather than four N/A cards. Behavior is unchanged once at least one row is valid.
    if (usedBackend === 0) {
      host.innerHTML = '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);'+
        'padding:6px 2px">Backend technical summary unavailable — waiting for backend technicals</div>';
      return;
    }
    host.innerHTML =
      '<div style="margin-top:10px">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'+
          '<span style="font-size:10px;font-weight:700;letter-spacing:.04em;color:var(--tx2)">BACKEND TECHNICAL SUMMARY</span>'+
          '<span style="font-size:7px;font-family:var(--M);color:var(--tx3)">Technicals: '+headerSrc+freshStr+'</span>'+
        '</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+cards+'</div>'+
      '</div>';

    if (usedBackend > 0) {
      console.log('[MCX-SNAPSHOT] backend technical summary rendered', JSON.stringify({ rows: usedBackend }));
    }
  } catch (e) {
    // Summary must never break MCX or the render loop.
    try { console.log('[MCX-SNAPSHOT] backend technical summary error', (e && e.message) || e); } catch (e2) {}
  }
}

// Refreshes MCX VIX data, preferring the backend snapshot when the flag is on and
// the payload is valid, otherwise using the existing DXLink VIX-family flow. Always
// resolves; never rejects into the render loop. Does not touch chart rendering.
function _mcxRefreshVixData(){
  var drawAndStatus = function(){
    try { _mcxDrawVixCurve(); } catch (e) { console.log('[MCX] drawVixCurve error', e); }
    _mcxUpdateSnapshotStatus();
    _mcxRenderBackendTechnicalSummary();
  };
  if (ffMcxBackendSnapshot()) {
    console.log('[MCX-SNAPSHOT] refresh requested');
    if (S.marketContextSnapshot.pending) { return Promise.resolve(drawAndStatus()); }
    S.marketContextSnapshot.pending = true;
    return fetchMarketContextSnapshotFromBackend().then(function(snap){
      S.marketContextSnapshot.pending = false;
      var bridged = _mcxApplyBackendSnapshot(snap);
      if (bridged) return drawAndStatus();
      if (S.ttConnected) return _ensureVixFamily().then(drawAndStatus, drawAndStatus);
      return drawAndStatus();
    }, function(){
      S.marketContextSnapshot.pending = false;
      if (S.ttConnected) return _ensureVixFamily().then(drawAndStatus, drawAndStatus);
      return drawAndStatus();
    });
  }
  // Flag OFF -> identical to current main behavior.
  if (S.ttConnected) return _ensureVixFamily().then(function(){ _mcxDrawVixCurve(); });
  return Promise.resolve(_mcxDrawVixCurve());
}