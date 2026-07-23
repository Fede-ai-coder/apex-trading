// ─────────────────────────────────────────────────────────────────────────────
// CANDLE AUTH GATE — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith and AFTER the other
// already-extracted modules (including candle-normalization.js). Contains ONLY the
// eleven backend candle AUTH-READY gate + 401-BACKOFF function declarations below
// and their associated comments — no state, no constants, no top-level execution,
// no requests, no timers, no DOM access, no side effects at load time.
//
// The shared state and constants these functions read/mutate STAY declared in
// index.html: _backendCandleAuth, _backendApiAuthState, _apexAuthSkipLogged and the
// backoff constants _BACKEND_CANDLE_BACKOFF_MS / _BACKEND_CANDLE_FAIL_MAX, plus the
// BACKEND / S globals and the _candleDiagNowIso / _recordBackendApiAuthResult
// helpers. Every such symbol is resolved LEXICALLY as a global at CALL time (never
// read while this file loads), exactly as when these functions lived inline, so the
// earlier load order does not create a TDZ.
//
// Provenance recorders, transport/fetch, warmup and SFS orchestration stay in
// index.html — none of them moved here. _recordBackendApiAuthResult stays in
// js/api/backend-client.js and is only CALLED (never redefined) from here.
// ─────────────────────────────────────────────────────────────────────────────

// True when the existing frontend auth state is valid enough to call the backend
// candle/context endpoints without a guaranteed 401: backend URL configured,
// x-api-key PRESENT, a TT session available (candles are DXLink-backed), AND the
// key is not KNOWN-INVALID (a prior authenticated call has not been rejected).
// Conservative first-call: before any authenticated failure, invalidApiKey is
// false, so the very first call is allowed (that is what validates the key).
function _backendCandleAuthReady() {
  try {
    if (typeof BACKEND === 'undefined' || !BACKEND) return false;
    if (!S.backendKey) return false;                       // x-api-key required
    if (!S.ttConnected || !S.ttSessionId) return false;    // DXLink-backed → needs TT session
    if (_backendApiAuthState.invalidApiKey) return false;  // key present but proven invalid
    return true;
  } catch (e) { return false; }
}
function _backendCandleBackoffActive() {
  return Date.now() < (_backendCandleAuth.backoffUntil || 0);
}
// Single choke point: open only when auth is ready AND we are not in 401 backoff.
function _backendCandleGateOpen() {
  return _backendCandleAuthReady() && !_backendCandleBackoffActive();
}
// Reason string for a closed gate. Order: missing prerequisites → known-invalid key
// → backoff. Lets diagnostics distinguish backend_auth_not_ready /
// backend_api_key_invalid / backend_backoff_active / open.
function _backendCandleGateReason() {
  try {
    if (typeof BACKEND === 'undefined' || !BACKEND) return 'backend_auth_not_ready';
    if (!S.backendKey) return 'backend_auth_not_ready';
    if (!S.ttConnected || !S.ttSessionId) return 'backend_auth_not_ready';
    if (_backendApiAuthState.invalidApiKey) return 'backend_api_key_invalid';
    if (_backendCandleBackoffActive()) return 'backend_backoff_active';
    return 'open';
  } catch (e) { return 'backend_auth_not_ready'; }
}
// Record a backend candle/context failure. A 401/403 arms a short backoff so a
// single failure cannot become a fan-out storm or a tight retry loop, and feeds
// the shared API-auth validity state (a candle 401 also proves the key invalid).
function _noteBackendCandleFailure(kind, status, detail) {
  try {
    var nowIso = _candleDiagNowIso();
    _backendCandleAuth.lastStatus = (status != null) ? status : _backendCandleAuth.lastStatus;
    if (detail != null) _backendCandleAuth.lastError = String(detail);
    if (status === 401 || status === 403) {
      _backendCandleAuth.last401At = nowIso;
      _backendCandleAuth.backoffUntil = Date.now() + _BACKEND_CANDLE_BACKOFF_MS;
    }
    _backendCandleAuth.recentFailures.push({ timestamp: nowIso, kind: kind || 'candle', status: (status != null) ? status : null, detail: (detail != null) ? String(detail) : null });
    if (_backendCandleAuth.recentFailures.length > _BACKEND_CANDLE_FAIL_MAX) {
      _backendCandleAuth.recentFailures.splice(0, _backendCandleAuth.recentFailures.length - _BACKEND_CANDLE_FAIL_MAX);
    }
    if (status != null) _recordBackendApiAuthResult('candle:' + (kind || 'candle'), status);
  } catch (e) {}
}
// Record a successful backend candle call (clears backoff AND the invalid-key latch).
function _noteBackendCandleSuccess(status) {
  _backendCandleAuth.lastStatus = (status != null) ? status : 200;
  _backendCandleAuth.backoffUntil = 0;
  _recordBackendApiAuthResult('candle', (status != null) ? status : 200);
}
// True when a loader's fallbackReason means the AUTH/BACKOFF gate was closed (not a
// genuine per-symbol data failure). Surfaces must NOT open a browser Candle
// subscription in this case — doing so per browsed symbol would recreate the burst.
function _isBackendGateClosedReason(reason) {
  return reason === 'backend_auth_not_ready' || reason === 'backend_api_key_invalid' || reason === 'backend_backoff_active';
}
// Map a closed-gate reason to its provenance source label so diagnostics can tell
// backend_auth_not_ready / backend_api_key_invalid / backend_backoff apart.
function _backendGateProvenanceSource(reason) {
  if (reason === 'backend_backoff_active') return 'backend_backoff';
  if (reason === 'backend_api_key_invalid') return 'backend_api_key_invalid';
  return 'backend_auth_not_ready';
}
// Public, generic predicate: has the backend proven the x-api-key invalid (401/403)?
// Used to suppress noisy AUTHENTICATED auto-refresh / polling calls (not just
// candles) once we know the key is bad — so they stop looping 401s. Never blocks
// /auth/login (that path does not use the x-api-key) and never blocks user-initiated
// reconnect: _resetBackendApiAuthState() re-opens the door on (re)login / key update.
function backendApiAuthKnownInvalid() {
  try { return _backendApiAuthState.invalidApiKey === true; } catch (e) { return false; }
}
// Clear the invalid-key latch (and skip-log throttle) so the next authenticated call
// is allowed to re-validate. Called when the user (re)logs in or updates the API key.
function _resetBackendApiAuthState() {
  try { _backendApiAuthState.invalidApiKey = false; _apexAuthSkipLogged = {}; _backendCandleAuth.backoffUntil = 0; } catch (e) {}
}
function _apexAuthSkip(endpoint) {
  if (!_apexAuthSkipLogged[endpoint]) {
    _apexAuthSkipLogged[endpoint] = true;
    try { console.log('[APEX AUTH] skipped ' + endpoint + ' — backend_api_key_invalid'); } catch (e) {}
  }
  return true;
}
