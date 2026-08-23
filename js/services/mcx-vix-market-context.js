function _vixFamilyTimestampMs(vf) {
  if (!vf) return null;
  var t = vf.timestamp;
  if (t == null) return null;
  if (typeof t === 'number') return isFinite(t) ? t : null;
  var ms = Date.parse(t);
  return isFinite(ms) ? ms : null;
}

// Applies a freshly resolved VIX family under a freshness guard so an OLDER
// (e.g. late-arriving cached / backend-snapshot) value can never overwrite a
// NEWER one already in S.vixFamily (req #5/#6 — do not show stale VIX as fresh,
// never overwrite a newer value with an older one). The guard only blocks when
// the existing value carries a real VIX spot AND both timestamps are known AND
// the incoming timestamp is strictly older. Returns true when S.vixFamily was
// updated, false when the newer existing value was kept.
// True when the VIX family object carries at least one real (finite, non-null)
// index value. Used to reject all-null DXLink results (e.g. a websocket that
// opened and closed before authorization/subscription/data) so they never get
// stored as a fresh valid family. NOTE: an explicit `v != null` test is required
// because Number(null) === 0 (finite), which would otherwise mark all-null as valid.
function _vixFamilyHasAnyValue(vf) {
  return !!vf && [vf.vix, vf.vix9d, vf.vix3m, vf.vix6m].some(function (v) {
    return v != null && Number.isFinite(Number(v));
  });
}

function _applyFreshVixFamily(newVf) {
  if (!newVf) return false;
  var prev = S.vixFamily;
  // Never overwrite an existing valid VIX family with an all-null incoming one
  // (req #1/#4). An incoming object with no finite index value is an
  // incomplete/failed fetch — keep whatever (valid or not) we already have and
  // do NOT store the empty result as a fresh family.
  if (!_vixFamilyHasAnyValue(newVf)) {
    if (prev && prev.vix != null) {
      console.log('[VIX-FAMILY] rejected all-null update — kept previous valid family vix=' + prev.vix);
    } else {
      console.log('[VIX-FAMILY] rejected all-null update — no previous valid family to keep');
    }
    return false;
  }
  if (prev && prev.vix != null && newVf.vix != null) {
    var prevMs = _vixFamilyTimestampMs(prev);
    var newMs  = _vixFamilyTimestampMs(newVf);
    if (prevMs != null && newMs != null && newMs < prevMs) {
      console.log('[VIX-FAMILY] freshness-guard kept newer value; incoming=' +
        newVf.timestamp + ' (' + (newVf.source || '?') + ') older than cached=' +
        prev.timestamp + ' (' + (prev.source || '?') + ')');
      return false;
    }
  }
  S.vixFamily = newVf;
  return true;
}

// ── DXLink live fetch for VIX family index values ──
// Subscribes to spot index symbols (VIX, VIX9D, VIX3M, VIX6M) and both ^ variants.
// Uses Quote (bid/ask mid) and Trade (last price) events so indices without spread still resolve.
// Stores result in S.vixFamily. Does NOT fall back to futures (/VX, /VXM).
async function fetchVixFamily(){
  console.log('[VIX-FAMILY] fetch started; ttConnected=', S.ttConnected);
  if(!S.ttConnected)return null;
  // Skip the VIX-family /quote-token auto-refresh once the key is known invalid.
  if(typeof backendApiAuthKnownInvalid==='function' && backendApiAuthKnownInvalid()){ _apexAuthSkip('/quote-token'); return null; }
  var tokenResp=await ttCall('/quote-token');
  if(!tokenResp||!tokenResp.token){ console.log('[VIX-FAMILY] /quote-token failed'); return null; }
  var token=tokenResp.token;
  var wsUrl=tokenResp.dxlinkUrl||'wss://tasty-openapi-ws.dxfeed.com/realtime';
  console.log('[VIX-FAMILY] opening WS →', wsUrl);

  // Priority-ordered candidates per index (first hit wins).
  // dxfeed CBOE cash index format is $SYMBOL.X — tried first; plain/Yahoo formats as fallback.
  // VIX3M: CBOE relabelled VXMT → VIX3M, so try both dxfeed forms.
  var groups={
    vix:   ['$VIX.X',   'VIX',   '^VIX'],
    vix9d: ['$VIX9D.X', 'VIX9D', '^VIX9D'],
    vix3m: ['$VIX3M.X', '$VXMT.X', 'VIX3M', '^VIX3M'],
    vix6m: ['$VIX6M.X', 'VIX6M', '^VIX6M'],
  };
  var allCandidates=[];
  Object.keys(groups).forEach(function(k){allCandidates=allCandidates.concat(groups[k]);});

  var startedAt = Date.now();

  // One websocket attempt. Resolves with a diagnostics object {priceMap, wsOpened,
  // setupReceived, authorized, feedChannelRequested, subscribed, anyPriceReceived,
  // closeCode, closeReason, closeWasClean, reason}. Never rejects. A premature
  // close (before auth/subscription/data) resolves with an empty/partial priceMap
  // and reason='ws_closed_before_data' — the caller decides whether to retry and
  // never treats this as a fresh valid family.
  function _vixFamilyAttempt(){
    return new Promise(function(resolve){
      var ws, channelId=1;
      var priceMap={};
      var resolved=false;
      var wsOpened=false, setupReceived=false, authorized=false,
          feedChannelRequested=false, subscribed=false, anyPriceReceived=false;
      var timeoutId;
      function finish(reason, ev){
        if(resolved)return;
        resolved=true;
        clearTimeout(timeoutId);
        try{ if(ws) ws.close(); }catch(e){}
        resolve({
          priceMap:priceMap, reason:reason,
          wsOpened:wsOpened, setupReceived:setupReceived, authorized:authorized,
          feedChannelRequested:feedChannelRequested, subscribed:subscribed,
          anyPriceReceived:anyPriceReceived,
          closeCode: ev ? ev.code : null,
          closeReason: ev ? ev.reason : null,
          closeWasClean: ev ? ev.wasClean : null
        });
      }
      // Timeout: acceptAggregationPeriod is 0 (immediate delivery), so the server
      // should not batch beyond this 12 s window.
      timeoutId=setTimeout(function(){
        console.log('[VIX-FAMILY] timeout — priceMap so far:', JSON.stringify(priceMap));
        finish('timeout', null);
      },12000);
      try{ws=new WebSocket(wsUrl);}catch(e){
        console.log('[VIX-FAMILY] WebSocket() threw:', e.message);
        finish('ws_construct_threw', null);
        return;
      }
      ws.onopen=function(){
        wsOpened=true;
        console.log('[VIX-FAMILY] ws opened');
        ws.send(JSON.stringify({type:'SETUP',channel:0,version:'0.1',keepaliveTimeout:60,acceptKeepaliveTimeout:60}));
      };
      ws.onmessage=function(ev){
        var msg;try{msg=JSON.parse(ev.data);}catch(e){return;}
        if(!msg)return;
        if(msg.type==='SETUP'){
          setupReceived=true;
          ws.send(JSON.stringify({type:'AUTH',channel:0,token:token}));
        }else if(msg.type==='AUTH_STATE'&&msg.state==='AUTHORIZED'){
          authorized=true;
          console.log('[VIX-FAMILY] authorized; requesting FEED channel');
          ws.send(JSON.stringify({type:'CHANNEL_REQUEST',channel:channelId,service:'FEED',parameters:{contract:'AUTO'}}));
          feedChannelRequested=true;
        }else if(msg.type==='CHANNEL_OPENED'&&msg.channel===channelId){
          // acceptAggregationPeriod:0 → server sends data immediately, no batching delay
          ws.send(JSON.stringify({type:'FEED_SETUP',channel:channelId,
            acceptAggregationPeriod:0,acceptDataFormat:'FULL',
            acceptEventFields:{
              Quote:['eventSymbol','bidPrice','askPrice'],
              Trade:['eventSymbol','price'],
            }
          }));
          var subPayload=allCandidates.flatMap(function(sym){
            return [{type:'Quote',symbol:sym},{type:'Trade',symbol:sym}];
          });
          console.log('[VIX-FAMILY] subscribing', allCandidates.length, 'symbols:', JSON.stringify(allCandidates));
          ws.send(JSON.stringify({type:'FEED_SUBSCRIPTION',channel:channelId,add:subPayload}));
          subscribed=true;
        }else if(msg.type==='FEED_DATA'&&msg.channel===channelId){
          debugLog('vix', '[VIX-FAMILY] FEED_DATA received, events:', (msg.data||[]).length);
          (msg.data||[]).forEach(function(ev2){
            var sym=ev2.eventSymbol;
            if(!sym||priceMap[sym]!=null)return;
            var val=null;
            // Quote: prefer mid of bid/ask; accept either side if the other is missing
            if(ev2.bidPrice!=null&&ev2.askPrice!=null){
              var mid=(ev2.bidPrice+ev2.askPrice)/2;
              if(mid>0)val=Math.round(mid*100)/100;
            }else if(ev2.bidPrice!=null&&ev2.bidPrice>0){
              val=Math.round(ev2.bidPrice*100)/100;
            }else if(ev2.askPrice!=null&&ev2.askPrice>0){
              val=Math.round(ev2.askPrice*100)/100;
            }
            // Trade: last price (indices often publish only here)
            if(val==null&&ev2.price!=null&&ev2.price>0){
              val=Math.round(ev2.price*100)/100;
            }
            // Log every raw event so symbol format and field values can be verified
            debugLog('vix', '[VIX-FAMILY] FEED_DATA sym=' + sym +
              ' bid=' + ev2.bidPrice + ' ask=' + ev2.askPrice + ' price=' + ev2.price + ' → parsed=' + val);
            if(val!=null){priceMap[sym]=val;anyPriceReceived=true;}
          });
          // Early resolve: all four index families have at least one value — no need to
          // wait for the full timeout.  This ensures S.vixFamily is assigned before
          // the 4 s race in _buildRichSnapshot expires.
          var _allCovered = [groups.vix, groups.vix9d, groups.vix3m, groups.vix6m]
            .every(function(g) { return g.some(function(s) { return priceMap[s] != null; }); });
          if (_allCovered && !resolved) {
            console.log('[VIX-FAMILY] all 4 indices covered — resolving early:', JSON.stringify(priceMap));
            finish('covered', null);
          }
        }else if(msg.type==='KEEPALIVE'){
          ws.send(JSON.stringify({type:'KEEPALIVE',channel:0}));
        }
      };
      ws.onerror=function(e){
        console.log('[VIX-FAMILY] ws error');
        finish('ws_error', null);
      };
      ws.onclose=function(ev){
        ev = ev || {};
        var pk = Object.keys(priceMap);
        console.log('[VIX-FAMILY] ws closed code=' + ev.code + ' reason=' + ev.reason +
          ' clean=' + ev.wasClean + ' authorized=' + authorized + ' subscribed=' + subscribed +
          ' setup=' + setupReceived + ' feed=' + feedChannelRequested +
          ' priceMapKeys=' + JSON.stringify(pk));
        finish(anyPriceReceived ? 'ws_closed_after_data' : 'ws_closed_before_data', ev);
      };
    });
  }

  var diag = await _vixFamilyAttempt();
  // Bounded single retry: only when the socket died before auth/subscription/data
  // (a flaky early close), never after we already received useful prices and never
  // looping. The _vixFamilyPending lock (held by the caller for this whole promise)
  // guarantees no concurrent second websocket.
  var prematureClose = !diag.anyPriceReceived && !diag.subscribed &&
    (diag.reason === 'ws_closed_before_data' || diag.reason === 'ws_error' || diag.reason === 'ws_construct_threw');
  if (prematureClose) {
    console.log('[VIX-FAMILY] premature ws close before auth/subscription/data (reason=' +
      diag.reason + ') — retrying once after 1200ms');
    await new Promise(function(r){ setTimeout(r, 1200); });
    diag = await _vixFamilyAttempt();
  }

  var result = diag.priceMap || {};

  // Pick first available symbol in priority order for each index
  function _pick(candidates){
    for(var i=0;i<candidates.length;i++){
      if(result[candidates[i]]!=null)return{val:result[candidates[i]],sym:candidates[i]};
    }
    return null;
  }
  var vixPick   =_pick(groups.vix);
  var vix9dPick =_pick(groups.vix9d);
  var vix3mPick =_pick(groups.vix3m);
  var vix6mPick =_pick(groups.vix6m);

  var symbolsUsed={};
  if(vixPick)   symbolsUsed.vix   =vixPick.sym;
  if(vix9dPick) symbolsUsed.vix9d =vix9dPick.sym;
  if(vix3mPick) symbolsUsed.vix3m =vix3mPick.sym;
  if(vix6mPick) symbolsUsed.vix6m =vix6mPick.sym;

  var vixFamily={
    vix:        vixPick   ?vixPick.val   :null,
    vix9d:      vix9dPick ?vix9dPick.val :null,
    vix3m:      vix3mPick ?vix3mPick.val :null,
    vix6m:      vix6mPick ?vix6mPick.val :null,
    timestamp:  new Date().toISOString(),
    source:     'DXLink',
    symbolsUsed:symbolsUsed,
  };

  var hasVix = _vixFamilyHasAnyValue(vixFamily);

  // Richer diagnostics for inspection from the console (window._vixFamilyLastDiag).
  try {
    if (typeof window !== 'undefined') {
      window._vixFamilyLastDiag = {
        startedAt: startedAt,
        endedAt: Date.now(),
        ok: hasVix,
        reason: diag.reason || null,
        wsOpened: diag.wsOpened,
        setupReceived: diag.setupReceived,
        authorized: diag.authorized,
        feedChannelRequested: diag.feedChannelRequested,
        subscribed: diag.subscribed,
        anyPriceReceived: diag.anyPriceReceived,
        closeCode: diag.closeCode,
        closeReason: diag.closeReason,
        closeWasClean: diag.closeWasClean,
        priceMapKeys: Object.keys(result),
        symbolsUsed: symbolsUsed,
        result: vixFamily
      };
    }
  } catch(e) {}

  // No usable VIX value: this is a failed / incomplete fetch. Do NOT store an
  // all-null DXLink object as a fresh valid family — return null so the caller
  // keeps any previously valid S.vixFamily (req #1/#2/#4).
  if (!hasVix) {
    console.log('[VIX-FAMILY] fetch failed/incomplete; keeping previous VIX family' +
      ' (reason=' + (diag.reason || '?') + ' authorized=' + diag.authorized +
      ' subscribed=' + diag.subscribed + ' anyPrice=' + diag.anyPriceReceived + ')');
    logEv('vix','VIX family fetch incomplete (reason=' + (diag.reason || '?') +
      ') — kept previous VIX family','warn');
    return null;
  }

  _applyFreshVixFamily(vixFamily); // freshness guard: never overwrite a newer VIX
  console.log('[VIX-FAMILY] resolved object → S.vixFamily now set:', JSON.stringify(vixFamily));
  logEv('vix','VIX family: VIX='+(vixFamily.vix||'n/a')+
    ' VIX9D='+(vixFamily.vix9d||'n/a')+
    ' VIX3M='+(vixFamily.vix3m||'n/a')+
    ' VIX6M='+(vixFamily.vix6m||'n/a')+
    ' | symbols: '+JSON.stringify(symbolsUsed),'ok');
  return vixFamily;
}

// Deduplicating wrapper around fetchVixFamily.
// Shares a single in-flight promise so concurrent callers (prefetch, snapshot, login timer)
// never open more than one WebSocket connection simultaneously.
// Only treats S.vixFamily as "good" when at least vix spot is non-null — an all-null
// result from a previous timeout is transparently retried.
var _vixFamilyPending = null;
// ===== MCX Backend Snapshot bridge (V1) - behind apex_ff_mcx_backend_snapshot =====
// _cachePortfolioMarketContextSnapshot — store the latest /market-context/snapshot
// payload on S.marketContextSnapshot ADDITIVELY (data + updatedAt + source only). It
// never touches the VIX-family bridge fields (vixSource / termShape / regime / the
// separately-mirrored technicals), so existing VIX behavior and the MCX-view apply path
// (_mcxApplyBackendSnapshot, which re-reads this same payload) are unaffected. Its sole
// purpose is to stop the snapshot from being discarded by the VIX-only prefetch path so
// non-MCX consumers — the Portfolio SPY freshness resolver's market_context source — can
// reuse the SPY price/technicals the backend already returned. Never throws.
function _cachePortfolioMarketContextSnapshot(data){
  try {
    if (!data || typeof S === 'undefined' || !S) return;
    if (!S.marketContextSnapshot) S.marketContextSnapshot = { data:null, updatedAt:null, source:null, error:null };
    S.marketContextSnapshot.data = data;
    S.marketContextSnapshot.updatedAt = new Date().toISOString();
    S.marketContextSnapshot.source = data.source || S.marketContextSnapshot.source || 'BACKEND';
    S.marketContextSnapshot.error = null;
  } catch (e) { /* snapshot cache must never break VIX family or the render loop */ }
}

// Consumes GET /market-context/snapshot. Does NOT replace the DXLink VIX fetch,
// the candle/chart pipeline, or the regime engine - it only bridges data when the
// flag is on and the backend payload is valid, otherwise the existing frontend
// flow remains the fallback. Never throws into the render loop.
async function fetchMarketContextSnapshotFromBackend(){
  // Skip the MCX snapshot auto-refresh once the x-api-key is known invalid — it would
  // only repeat 401s. Cleared on (re)login / key update via _resetBackendApiAuthState().
  if (typeof backendApiAuthKnownInvalid === 'function' && backendApiAuthKnownInvalid()) {
    _apexAuthSkip('/market-context/snapshot');
    return { ok:false, error:'backend_api_key_invalid', data:null };
  }
  try {
    // ttCall() applies the BACKEND base URL + existing x-api-key (S.backendKey) and
    // x-session-id headers, parses JSON, and throws on non-2xx / network errors.
    var data = await ttCall('/market-context/snapshot');
    if (!data || data.ok === false) {
      return { ok:false, error:(data && (data.error || data.hint)) || 'snapshot ok:false', data: data || null };
    }
    // Additively cache the FULL snapshot at this single fetch choke point so EVERY
    // caller (incl. the VIX-only prefetch _fetchVixFamilyBackendFirst, which otherwise
    // extracts vixFamily and discards the rest) leaves the SPY price/technicals reusable
    // by the Portfolio SPY resolver. VIX-family application below is unchanged. The typeof
    // guard keeps this fetch resilient in isolated sandboxes where the helper is absent.
    if (typeof _cachePortfolioMarketContextSnapshot === 'function') _cachePortfolioMarketContextSnapshot(data);
    return { ok:true, data:data };
  } catch (e) {
    var msg = (e && e.message) ? String(e.message) : 'network error';
    console.log('[MCX-SNAPSHOT] fetch failed:', msg);
    return { ok:false, error:msg, data:null };
  }
}

// ===== Backend VIX Family (PRIMARY source) ====================================
// The backend already holds the stable DXLink connection (see /dxlink/status), so
// VIX family is fetched there and consumed here — instead of opening a SECOND
// frontend DXLink websocket. fetchVixFamily() (direct frontend WS) is kept only as
// a bounded, diagnostic fallback (see _vixFamilyDirectWsFallbackAllowed).
// Endpoint contract: BACKEND_VIX_FAMILY_LIVE_CONTRACT.md. Never throws into the caller.
async function fetchMarketContextVixFamilyFromBackend(){
  // Skip once the x-api-key is known invalid — it would only repeat 401s.
  if (typeof backendApiAuthKnownInvalid === 'function' && backendApiAuthKnownInvalid()) {
    _apexAuthSkip('/market-context/vix-family/live');
    return { ok:false, reason:'backend_api_key_invalid', data:null };
  }
  try {
    // ttCall() applies the BACKEND base URL + x-api-key (S.backendKey) + x-session-id
    // headers, parses JSON, and throws on non-2xx / network errors.
    var data = await ttCall('/market-context/vix-family/live');
    if (!data || data.ok === false) {
      return { ok:false,
        reason:(data && (data.reason || data.error || data.status)) || 'vix_family_ok_false',
        data: data || null };
    }
    return { ok:true, data:data };
  } catch (e) {
    var msg = (e && e.message) ? String(e.message) : 'network error';
    console.log('[VIX-FAMILY] backend fetch failed:', msg);
    return { ok:false, reason:msg, data:null };
  }
}

// Normalizes a raw backend vixFamily object into the frontend shape. Critically it
// accepts BOTH `vix3m` and the backend snapshot's `vi3m` for the 3-month value, and
// coerces every index to a finite number or null (never a string / non-finite, and
// never a fabricated value). Returns null for a missing object.
function _normalizeBackendVixFamily(vf) {
  if (!vf) return null;
  function _n(x){ var v = (x == null ? null : Number(x)); return Number.isFinite(v) ? v : null; }
  return {
    vix:         _n(vf.vix),
    vix9d:       _n(vf.vix9d),
    vix3m:       _n(vf.vix3m != null ? vf.vix3m : vf.vi3m),  // accept vix3m OR vi3m
    vix6m:       _n(vf.vix6m),
    source:      vf.source || 'BACKEND_DXLINK',
    timestamp:   vf.timestamp || vf.updatedAt || vf.generatedAt || null,
    symbolsUsed: vf.symbolsUsed || {},
  };
}

// Validates a normalized family and applies it through the shared freshness +
// no-all-null guard (_applyFreshVixFamily). Returns true only when a real (finite)
// family was present. Defensive: an all-null family is never applied.
function _applyNormalizedVixFamily(vf){
  if (!vf || !_vixFamilyHasAnyValue(vf)) return false;
  if (!vf.timestamp) vf.timestamp = new Date().toISOString();
  // _applyFreshVixFamily may keep an even-newer cached value (freshness guard); either
  // way a valid family is present, so the backend path counts as satisfied.
  _applyFreshVixFamily(vf);
  return true;
}

// Applies a dedicated /market-context/vix-family/live response onto S.vixFamily.
// Returns true only when the backend supplied a real (finite) family — false on
// incomplete/missing, so the caller can try the next source in the cascade.
function _applyBackendVixFamily(resp){
  var d = resp && resp.ok && resp.data;
  if (!d) return false;
  var vf = _normalizeBackendVixFamily(d);
  if (!_applyNormalizedVixFamily(vf)) {
    console.log('[VIX-FAMILY] backend response carried no finite values — not applied');
    return false;
  }
  return true;
}

// Backend-first VIX family resolution. Source cascade:
//   1) GET /market-context/snapshot  → snapshot.vixFamily   (already deployed today)
//   2) GET /market-context/vix-family/live                  (future dedicated endpoint)
//   3) direct frontend DXLink websocket via fetchVixFamily()  (bounded, opt-in, diagnostic)
// Returns the resolved family or null; never the all-null object.
async function _fetchVixFamilyBackendFirst(){
  // ── 1. Primary: snapshot.vixFamily (the backend exposes VIX family here today) ──
  try {
    var snap = await fetchMarketContextSnapshotFromBackend();
    var snapVf = (snap && snap.ok && snap.data) ? _normalizeBackendVixFamily(snap.data.vixFamily) : null;
    if (snapVf && _vixFamilyHasAnyValue(snapVf)) {
      console.log('[VIX-FAMILY] backend snapshot source ready');
      _applyNormalizedVixFamily(snapVf);
      console.log('[VIX-FAMILY] applied backend snapshot VIX family');
      try { if (typeof window !== 'undefined') window._vixFamilyLastSource = 'BACKEND_SNAPSHOT'; } catch(e){}
      return S.vixFamily;
    }
    if (snap && snap.ok && snap.data) {
      console.log('[VIX-FAMILY] backend snapshot vixFamily incomplete', JSON.stringify(snapVf || {}));
      try { if (typeof window !== 'undefined') window._vixFamilySnapshotDiag = snapVf || null; } catch(e){}
    }
  } catch (e) {
    console.log('[VIX-FAMILY] backend snapshot error', e && e.message);
  }

  // ── 2. Future dedicated endpoint: GET /market-context/vix-family/live ──
  try {
    var resp = await fetchMarketContextVixFamilyFromBackend();
    if (resp && resp.ok) console.log('[VIX-FAMILY] backend source ready');
    if (_applyBackendVixFamily(resp)) {
      console.log('[VIX-FAMILY] applied backend VIX family');
      try { if (typeof window !== 'undefined') window._vixFamilyLastSource = 'BACKEND_DXLINK'; } catch(e){}
      return S.vixFamily;
    }
    var _why = (resp && resp.reason) || (resp && resp.data && resp.data.reason) || '?';
    console.log('[VIX-FAMILY] backend VIX family unavailable/incomplete (reason=' + _why + ')');
  } catch (e) {
    console.log('[VIX-FAMILY] backend VIX family error', e && e.message);
  }

  // ── 3. Diagnostic fallback: direct frontend DXLink websocket ──
  // Only when ttConnected AND explicitly allowed. Preserves the all-null guard +
  // bounded single retry inside fetchVixFamily().
  if (S.ttConnected && _vixFamilyDirectWsFallbackAllowed()) {
    console.log('[VIX-FAMILY] backend failed — using bounded direct DXLink websocket fallback (diagnostic)');
    try { if (typeof window !== 'undefined') window._vixFamilyLastSource = 'FRONTEND_DXLINK_FALLBACK'; } catch(e){}
    return fetchVixFamily();
  }
  console.log('[VIX-FAMILY] no backend VIX family and direct websocket fallback ' +
    (S.ttConnected ? 'disabled' : 'unavailable') + '; keeping previous VIX family');
  return (S.vixFamily && S.vixFamily.vix != null) ? S.vixFamily : null;
}

// Whether the direct frontend DXLink websocket (fetchVixFamily) may be used as a
// fallback when the backend VIX endpoint fails. Backend is the primary source; this
// websocket is a BOUNDED DIAGNOSTIC fallback only. Default: allowed (graceful during
// backend rollout). Disable once the backend endpoint is stable:
//   localStorage.setItem('apex_ff_vix_family_direct_ws_fallback','0')
function _vixFamilyDirectWsFallbackAllowed(){
  try {
    var v = localStorage.getItem('apex_ff_vix_family_direct_ws_fallback');
    if (v === '1') return true;
    if (v === '0') return false;
  } catch (e) {}
  return true;
}
