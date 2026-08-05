// ─────────────────────────────────────────────────────────────────────────────
// BACKEND CLIENT — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith. Contains ONLY the six
// function declarations below and their associated comments — no top-level
// execution, no requests, no timers, no side effects at load time.
//
// Runtime dependencies (BACKEND, S, _backendApiAuthState, _backendCandleAuth,
// _BACKEND_CANDLE_BACKOFF_MS, _candleDiagNowIso) remain declared in index.html
// and are resolved lexically at call time — never read while this file loads.
//
// The window.* exports for _isTransientFetchError / _ttCallWithRetry stay in
// index.html to preserve their exact original timing.
// ─────────────────────────────────────────────────────────────────────────────

async function ttCall(path,opts){
  opts=opts||{};
  var body=opts.body?(typeof opts.body==='string'?opts.body:JSON.stringify(opts.body)):undefined;
  var headers={};
  if(body)headers['Content-Type']='application/json';
  if(S.ttSessionId)headers['x-session-id']=S.ttSessionId;
  if(S.backendKey)headers['x-api-key']=S.backendKey;
  console.log('[APEX AUTH STATE]',JSON.stringify({
    endpoint:path.split('?')[0],
    hasSessionId:!!S.ttSessionId,
    sessionSource:S._ttSessionSource||'missing',
    requestHasAuthHeader:!!headers['x-session-id'],
  }));
  // The composed signal owns two listeners when a caller signal is supplied, and
  // they are released in `finally` — on success, on a caller abort, on a timeout
  // and on a transport failure alike. Without that, a long-lived caller signal
  // reused across many requests accumulates one listener per call and never
  // drops them, which is a leak that grows exactly as fast as the feature is used.
  var _sig=_ttCallSignal(opts.signal);
  var r;
  try{
    r=await fetch(BACKEND+path,{method:opts.method||'GET',headers:headers,body:body,signal:_sig.signal});
  }finally{
    _sig.cleanup();
  }
  console.log('[APEX AUTH STATE]',JSON.stringify({endpoint:path.split('?')[0],responseStatus:r.status}));
  // Feed the shared backend API-auth validity state from EVERY authenticated call
  // (/quote-token, /market-context/snapshot, /scanner, …). A 401/403 here proves the
  // x-api-key is invalid and latches the candle gate closed BEFORE candles fan out.
  if(typeof _recordBackendApiAuthResult==='function')_recordBackendApiAuthResult(path.split('?')[0],r.status);
  var raw=await r.text();
  var data;
  try{data=JSON.parse(raw);}catch(e){throw new Error('Backend non-JSON (HTTP '+r.status+'): '+raw.substring(0,80));}
  if(!r.ok){var _em=data.error||data.hint||'HTTP '+r.status;if(data.rejectCode&&!_em.includes(data.rejectCode))_em=data.rejectCode+': '+_em;throw new Error(_em);}
  return data;
}

// The abort signal ttCall gives fetch, plus the cleanup that releases it.
//
// Returns { signal, cleanup }. WITHOUT a caller signal the signal is exactly what
// it always was — AbortSignal.timeout(20000) — and cleanup is a no-op, so every
// existing call site keeps its behaviour byte-for-byte.
//
// WITH a caller signal, the request is cancelled by EITHER the caller or the
// same 20s timeout, whichever fires first. Callers that need to cancel a long
// backend call (the Portfolio Stress run is the first) would otherwise have to
// bring their own fetch, which would mean a second HTTP owner with its own URL,
// auth and error handling — the duplication the transport owner exists to avoid.
//
// WHY cleanup EXISTS. The two `abort` listeners are attached to signals this
// function does not own: the timeout signal is discarded with the request, but
// the CALLER's signal can outlive many requests. One AbortController per call
// is fine; one permanently-attached listener per call on a shared signal is a
// leak. `once: true` only fires-and-forgets on abort — a request that completes
// normally never aborts, so the listener would stay forever. ttCall calls
// cleanup() in `finally`, so it runs on success, abort, timeout and failure.
//
// Composed with an AbortController rather than AbortSignal.any() so the browser
// baseline is unchanged.
function _ttCallSignal(callerSignal) {
  var timeout = AbortSignal.timeout(20000);
  if (!callerSignal) return { signal: timeout, cleanup: function () {} };
  var ctrl = new AbortController();
  var onCaller = function () { try { ctrl.abort(callerSignal.reason); } catch (e) { ctrl.abort(); } };
  var onTimeout = function () { try { ctrl.abort(timeout.reason); } catch (e) { ctrl.abort(); } };
  var cleanup = function () {
    try { callerSignal.removeEventListener('abort', onCaller); } catch (e) {}
    try { timeout.removeEventListener('abort', onTimeout); } catch (e) {}
  };
  if (callerSignal.aborted) { onCaller(); return { signal: ctrl.signal, cleanup: function () {} }; }
  if (timeout.aborted) { onTimeout(); return { signal: ctrl.signal, cleanup: function () {} }; }
  callerSignal.addEventListener('abort', onCaller, { once: true });
  timeout.addEventListener('abort', onTimeout, { once: true });
  return { signal: ctrl.signal, cleanup: cleanup };
}

function _backendAuthHeaders(extra) {
  var h = Object.assign({}, extra || {});
  if (S.backendKey) h['x-api-key'] = S.backendKey;
  return h;
}

// Central recorder: call after ANY authenticated backend response so the candle
// gate can see proof the key is (in)valid before it ever fans out. A 401/403
// proves the key is invalid (latch + arm candle backoff); a 2xx clears it.
function _recordBackendApiAuthResult(endpoint, status) {
  try {
    if (status == null) return;
    _backendApiAuthState.lastStatus = status;
    if (endpoint) _backendApiAuthState.lastEndpoint = endpoint;
    if (status === 401 || status === 403) {
      _backendApiAuthState.invalidApiKey = true;
      _backendApiAuthState.last401At = _candleDiagNowIso();
      // A proven-invalid key must also pause candle fan-out (shared backoff window).
      _backendCandleAuth.backoffUntil = Date.now() + _BACKEND_CANDLE_BACKOFF_MS;
    } else if (status >= 200 && status < 300) {
      _backendApiAuthState.invalidApiKey = false;
      _backendApiAuthState.lastOkAt = _candleDiagNowIso();
    }
  } catch (e) {}
}

// GET wrapper with exponential backoff (default ~400/800/1600ms) for transient
// network errors only. Non-transient errors (401/403/HTTP app errors) re-throw
// on the first attempt so the shared auth gate behaviour is unchanged.
async function _ttCallWithRetry(path, opts, maxRetries) {
  var attempts = (maxRetries == null ? 3 : maxRetries);
  var delay = 400;
  var lastErr = null;
  for (var i = 0; i <= attempts; i++) {
    try {
      return await ttCall(path, opts);
    } catch (e) {
      lastErr = e;
      if (!_isTransientFetchError(e) || i === attempts) throw e;
      console.warn('[JOURNAL SYNC] transient error on ' + path + ' (attempt ' + (i + 1) + '/' + (attempts + 1) + ') — retrying in ' + delay + 'ms: ' + (e && e.message));
      await new Promise(function(res) { setTimeout(res, delay); });
      delay *= 2;
    }
  }
  throw lastErr;
}

// Recognises transient/retryable network errors (vs. real 4xx/5xx app errors,
// which must surface immediately and are NOT retried).
function _isTransientFetchError(e) {
  var msg = ((e && (e.message || e.name)) || '').toString().toLowerCase();
  if (!msg) return false;
  return msg.indexOf('failed to fetch') !== -1
      || msg.indexOf('err_network_changed') !== -1
      || msg.indexOf('network changed') !== -1
      || msg.indexOf('networkerror') !== -1
      || msg.indexOf('network error') !== -1
      || msg.indexOf('network timeout') !== -1
      || msg.indexOf('timeout') !== -1
      || msg.indexOf('aborterror') !== -1
      || msg.indexOf('aborted') !== -1
      || msg.indexOf('load failed') !== -1;
}

// Best-effort HTTP status extraction from a ttCall() error. ttCall throws
// Error(message) where message may embed "HTTP 401" / "HTTP 500". Returns a
// number when parseable, else null (network / timeout / non-HTTP failure).
function _httpStatusFromError(e) {
  var msg = (e && (e.message || e.name) || '').toString();
  var m = msg.match(/\bHTTP\s+(\d{3})\b/) || msg.match(/\b(401|403|404|409|422|429|500|502|503|504)\b/);
  return m ? parseInt(m[1], 10) : null;
}
