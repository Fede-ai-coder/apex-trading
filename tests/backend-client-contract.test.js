'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND CLIENT CONTRACT — pin the REAL behaviour before extraction.
//
// WHY THIS EXISTS
//   The next roadmap block moves the backend client out of index.html into
//   js/api/backend-client.js. Before that move this test freezes the *observable
//   contract* of the six functions that make up the client so the extraction can
//   be proven behaviour-preserving:
//
//       ttCall, _backendAuthHeaders, _recordBackendApiAuthResult,
//       _ttCallWithRetry, _isTransientFetchError, _httpStatusFromError
//
//   Every expectation below was derived from the CURRENT source, not from any
//   external convention. Where the real code differs from a naive assumption the
//   test pins the REAL behaviour (documented inline):
//     • ttCall builds only three headers and IGNORES opts.headers.
//     • ttCall uses AbortSignal.timeout(20000) — no manual AbortController /
//       setTimeout / clearTimeout.
//     • ttCall errors carry NO `.status` property; message is
//       data.error || data.hint || ('HTTP ' + status).
//     • An empty / 204 body THROWS "Backend non-JSON (HTTP <status>): ".
//     • _httpStatusFromError parses e.message||e.name — it never reads e.status.
//     • _isTransientFetchError matches message/name substrings only — it has NO
//       HTTP-status logic (a 500/429/408 error string is NOT transient).
//     • _recordBackendApiAuthResult mutates _backendApiAuthState /
//       _backendCandleAuth — NOT the global S.
//
//   The real functions are extracted from the reconstructed application source
//   via tests/lib/load-app-source.js (NOT copied) and executed in a vm sandbox
//   with controlled dependencies. No real network request and no real timer wait
//   ever happen: fetch, AbortSignal.timeout and setTimeout are all stubbed.
//
// Run: node tests/backend-client-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const path = require('path');
const fs = require('fs');
const loader = require('./lib/load-app-source');

// Reconstruct the application JavaScript exactly as the browser would execute it
// (index.html today, js/api/backend-client.js transparently after extraction).
const APP_SRC = loader.loadAppJavaScriptSource();
const ex = (name) => loader.extractFunctionSource(name, { source: APP_SRC });

// ── tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  ok(a === e, msg + (a === e ? '' : ' — got ' + a + ', expected ' + e));
}
function section(t) { console.log('\n' + t); }

// A minimal Response double: only the surface ttCall actually touches.
function resp(status, ok_, bodyText) {
  return { status, ok: ok_, text: async () => bodyText };
}
function jsonResp(status, obj) {
  return resp(status, status >= 200 && status < 300, JSON.stringify(obj));
}

// ── ttCall sandbox ───────────────────────────────────────────────────────────
// Records the fetch arguments, the [APEX AUTH STATE] logs, the auth-gate calls
// and the AbortSignal.timeout durations. fetch/AbortSignal.timeout are stubs, so
// nothing hits the network and no real 20s timer is ever created.
function makeTtCallSandbox(opts) {
  opts = opts || {};
  const logs = [];
  const authGate = [];
  const abortDurations = [];
  const sb = {
    console: { log: (...a) => logs.push(a), warn: () => {}, error: () => {} },
    JSON, Math, Number, String, Object, Array, parseInt, parseFloat, Promise, Error,
    BACKEND: opts.BACKEND != null ? opts.BACKEND : 'https://backend.test',
    S: opts.S || {},
    AbortSignal: { timeout: (ms) => { abortDurations.push(ms); return { __abortSignal: ms }; } },
    _recordBackendApiAuthResult: (endpoint, status) => { authGate.push([endpoint, status]); },
    __logs: logs, __authGate: authGate, __abortDurations: abortDurations, __fetch: null,
  };
  sb.fetch = (url, init) => {
    sb.__fetch = { url, init };
    return Promise.resolve(opts.fetchImpl ? opts.fetchImpl(url, init) : jsonResp(200, {}));
  };
  vm.createContext(sb);
  vm.runInContext(ex('ttCall'), sb);
  return sb;
}

(async () => {
  // ───────────────────────────────────────────────────────────────────────────
  section('0. structural manifest — extraction candidates for js/api/backend-client.js');
  // This does NOT require js/api/backend-client.js to exist yet. It records the
  // functions the next PR will move and proves they are all reachable through the
  // shared loader today — the invariant that keeps this test working AFTER the
  // move (the loader will then read js/api/backend-client.js instead of index.html).
  {
    const BACKEND_CLIENT_EXTRACTION_CANDIDATES = [
      'ttCall',
      '_backendAuthHeaders',
      '_recordBackendApiAuthResult',
      '_ttCallWithRetry',
      '_isTransientFetchError',
      '_httpStatusFromError',
    ];
    BACKEND_CLIENT_EXTRACTION_CANDIDATES.forEach((name) => {
      let found = false;
      try { found = typeof ex(name) === 'string' && ex(name).length > 0; } catch (e) { found = false; }
      ok(found, '0: candidate "' + name + '" is extractable from the reconstructed app source (loader-based)');
    });
    // Documents the non-goal of THIS PR: the target module is not created yet.
    const targetModule = path.resolve(__dirname, '..', 'js', 'api', 'backend-client.js');
    ok(!fs.existsSync(targetModule), '0: js/api/backend-client.js is NOT created in this PR (test-only, extraction deferred)');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('1. ttCall — request construction (URL, method, body, Content-Type)');
  {
    // 1.1 URL = BACKEND + path, verbatim (no slash normalization, query kept)
    let sb = makeTtCallSandbox({ S: { ttSessionId: 'sess', backendKey: 'KEY' } });
    await sb.ttCall('/scanner?symbols=AAPL,MSFT');
    eq(sb.__fetch.url, 'https://backend.test/scanner?symbols=AAPL,MSFT', '1.1: URL is BACKEND + path exactly');

    // 1.1b no slash normalization — a double slash in path survives unchanged
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('//weird//path');
    eq(sb.__fetch.url, 'https://backend.test//weird//path', '1.1b: ttCall does not normalize slashes');

    // 1.2 default method is GET
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x');
    eq(sb.__fetch.init.method, 'GET', '1.2: default HTTP method is GET');

    // 1.3 explicit method is preserved
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x', { method: 'POST' });
    eq(sb.__fetch.init.method, 'POST', '1.3: explicit method is preserved');
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x', { method: 'DELETE' });
    eq(sb.__fetch.init.method, 'DELETE', '1.3b: DELETE method is preserved');

    // 1.4 object body is JSON.stringify'd; string body passes through verbatim
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x', { method: 'POST', body: { hello: 'world', n: 2 } });
    eq(sb.__fetch.init.body, JSON.stringify({ hello: 'world', n: 2 }), '1.4: object body is JSON.stringify serialized');
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x', { method: 'POST', body: 'already-a-string' });
    eq(sb.__fetch.init.body, 'already-a-string', '1.4b: string body is passed through unchanged');

    // 1.5 no body on a GET without opts.body -> undefined (no empty body synthesized)
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x');
    ok(sb.__fetch.init.body === undefined, '1.5: absent body stays undefined (GET has no body)');
    // A GET WITH opts.body still sends the body (real behaviour: body is not gated by method)
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x', { body: { a: 1 } });
    eq(sb.__fetch.init.body, JSON.stringify({ a: 1 }), '1.5b: opts.body is sent regardless of method (GET included)');

    // 1.6 Content-Type is added ONLY when there is a body
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x');
    ok(!('Content-Type' in sb.__fetch.init.headers), '1.6: no Content-Type header when there is no body');
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x', { method: 'POST', body: { a: 1 } });
    eq(sb.__fetch.init.headers['Content-Type'], 'application/json', '1.6b: Content-Type application/json set with a body');

    // 1.7 ttCall builds only its own headers — caller opts.headers are IGNORED.
    // (Pinning the REAL contract: ttCall never reads opts.headers.)
    sb = makeTtCallSandbox({ S: { ttSessionId: 'sess', backendKey: 'KEY' } });
    await sb.ttCall('/x', { headers: { 'X-Custom': 'v', 'x-session-id': 'HACK' } });
    ok(!('X-Custom' in sb.__fetch.init.headers), '1.7: caller opts.headers are ignored (X-Custom not forwarded)');
    eq(sb.__fetch.init.headers['x-session-id'], 'sess', '1.7b: x-session-id comes from S, not from opts.headers');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('2. ttCall — authentication headers');
  {
    // 2.1 session id present -> x-session-id from S.ttSessionId
    let sb = makeTtCallSandbox({ S: { ttSessionId: 'SESSION123', backendKey: 'KEY' } });
    await sb.ttCall('/x');
    eq(sb.__fetch.init.headers['x-session-id'], 'SESSION123', '2.1: x-session-id header set from S.ttSessionId');
    eq(sb.__fetch.init.headers['x-api-key'], 'KEY', '2.4: x-api-key header set from S.backendKey');

    // 2.2 session id absent -> no x-session-id header at all
    sb = makeTtCallSandbox({ S: { backendKey: 'KEY' } });
    await sb.ttCall('/x');
    ok(!('x-session-id' in sb.__fetch.init.headers), '2.2: no x-session-id header when S.ttSessionId is absent');

    // 2.3 backend key absent -> no x-api-key header
    sb = makeTtCallSandbox({ S: { ttSessionId: 'S' } });
    await sb.ttCall('/x');
    ok(!('x-api-key' in sb.__fetch.init.headers), '2.5: no x-api-key header when S.backendKey is absent');

    // 2.3b nothing present -> only-a-fresh-empty header object (no auth)
    sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x');
    eq(sb.__fetch.init.headers, {}, '2.3: no session and no key -> empty header set');

    // 2.6 header NAMES are exactly x-session-id / x-api-key (derived from source)
    sb = makeTtCallSandbox({ S: { ttSessionId: 'S', backendKey: 'K' } });
    await sb.ttCall('/x', { method: 'POST', body: { a: 1 } });
    eq(Object.keys(sb.__fetch.init.headers).sort(), ['Content-Type', 'x-api-key', 'x-session-id'],
      '2.6: exact header name set is {Content-Type, x-api-key, x-session-id}');

    // 2.7 no header ever carries undefined/null/invalid string values
    Object.keys(sb.__fetch.init.headers).forEach((k) => {
      const v = sb.__fetch.init.headers[k];
      ok(typeof v === 'string' && v.length > 0, '2.7: header ' + k + ' has a valid non-empty string value (' + JSON.stringify(v) + ')');
    });

    // 2.8 requestHasAuthHeader in the log matches the actual x-session-id presence
    sb = makeTtCallSandbox({ S: { ttSessionId: 'S', backendKey: 'K' } });
    await sb.ttCall('/x');
    let pre = JSON.parse(sb.__logs[0][1]);
    eq(pre.requestHasAuthHeader, true, '2.8: requestHasAuthHeader true when x-session-id is sent');
    sb = makeTtCallSandbox({ S: { backendKey: 'K' } });
    await sb.ttCall('/x');
    pre = JSON.parse(sb.__logs[0][1]);
    eq(pre.requestHasAuthHeader, false, '2.8b: requestHasAuthHeader false when x-session-id is not sent');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('3. ttCall — timeout via AbortSignal.timeout(20000)');
  {
    // 3.1 the configured timeout is exactly 20000ms (confirmed from source)
    let sb = makeTtCallSandbox({ S: {} });
    await sb.ttCall('/x');
    eq(sb.__abortDurations, [20000], '3.1: AbortSignal.timeout is created with 20000ms');

    // 3.2/3.3 the abort signal is created and passed to fetch as `signal`
    ok(sb.__fetch.init.signal != null, '3.2: an abort signal is created');
    eq(sb.__fetch.init.signal, { __abortSignal: 20000 }, '3.3: the abort signal is passed to fetch');

    // 3.4/3.5/3.6 the real code uses AbortSignal.timeout (no manual
    // AbortController / setTimeout / clearTimeout). On timeout, fetch rejects and
    // ttCall propagates that rejection unchanged (name + message preserved).
    const srcNoComments = ex('ttCall').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    ok(/AbortSignal\.timeout\(\s*20000\s*\)/.test(srcNoComments), '3.4: source uses AbortSignal.timeout(20000) (not a manual controller)');
    ok(!/clearTimeout|new AbortController/.test(srcNoComments), '3.5: no manual AbortController/clearTimeout (timer cancellation is intrinsic to AbortSignal.timeout)');

    const timeoutErr = new Error('The operation timed out');
    timeoutErr.name = 'TimeoutError';
    sb = makeTtCallSandbox({ S: {}, fetchImpl: () => { throw timeoutErr; } });
    let caught = null;
    try { await sb.ttCall('/x'); } catch (e) { caught = e; }
    ok(caught === timeoutErr, '3.6: a fetch/timeout rejection propagates unchanged (same name + message)');
    eq(caught && caught.name, 'TimeoutError', '3.6b: propagated error keeps its name');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('4. ttCall — positive response handling');
  {
    // 4.1/4.2/4.3 200 -> JSON parsed -> returned
    let sb = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(200, { quotes: [1, 2], ok: true }) });
    let out = await sb.ttCall('/scanner');
    eq(out, { quotes: [1, 2], ok: true }, '4.1-4.3: 200 response JSON is parsed and returned');

    // 4.4 response status log
    const post = JSON.parse(sb.__logs[1][1]);
    eq(post.responseStatus, 200, '4.4: response-status log records status 200');

    // 4.5 auth gate is called with the response status and the query-stripped endpoint
    sb = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(200, {}) });
    await sb.ttCall('/scanner?symbols=AAPL');
    eq(sb.__authGate, [['/scanner', 200]], '4.5: _recordBackendApiAuthResult called with (endpoint-without-query, status)');

    // 4.6 empty / 204 body — the REAL behaviour THROWS (JSON.parse('') fails).
    // There is NO 204/empty-body support; pin it so the extraction cannot add one.
    sb = makeTtCallSandbox({ S: {}, fetchImpl: () => resp(204, true, '') });
    let threw = null;
    try { await sb.ttCall('/x'); } catch (e) { threw = e; }
    ok(threw != null, '4.6: an empty/204 body throws (no silent empty-body support)');
    eq(threw && threw.message, 'Backend non-JSON (HTTP 204): ', '4.6b: empty-body error message is "Backend non-JSON (HTTP 204): "');
    // even on the throwing 204, the auth gate still saw the status first
    eq(sb.__authGate, [['/x', 204]], '4.6c: auth gate still recorded the 204 before the parse throw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('5. ttCall — non-2xx HTTP responses');
  {
    for (const status of [400, 401, 403, 404, 500]) {
      const sb = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(status, {}) });
      let err = null;
      try { await sb.ttCall('/x'); } catch (e) { err = e; }
      ok(err instanceof Error, '5.' + status + ': non-2xx (' + status + ') throws an Error (no silent success)');
      eq(err && err.message, 'HTTP ' + status, '5.' + status + 'b: default error message is exactly "HTTP ' + status + '"');
      ok(!('status' in err), '5.' + status + 'c: error carries NO `.status` property (real contract)');
      eq(sb.__authGate, [['/x', status]], '5.' + status + 'd: auth gate recorded the ' + status + ' status');
    }

    // 5.7 compatibility with _httpStatusFromError: the "HTTP <status>" message is
    // exactly what _httpStatusFromError parses back to a number.
    const hsSb = { JSON, String, Object, Number, parseInt };
    vm.createContext(hsSb);
    vm.runInContext(ex('_httpStatusFromError'), hsSb);
    const errSb = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(401, {}) });
    let httpErr = null;
    try { await errSb.ttCall('/x'); } catch (e) { httpErr = e; }
    eq(hsSb._httpStatusFromError(httpErr), 401, '5.7: ttCall HTTP-error message round-trips through _httpStatusFromError');

    // 5.8 body-provided error/hint/rejectCode shape the message (real contract)
    let sb = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(400, { error: 'Bad thing' }) });
    let e1 = null; try { await sb.ttCall('/x'); } catch (e) { e1 = e; }
    eq(e1.message, 'Bad thing', '5.8: data.error becomes the error message (overrides HTTP <status>)');

    sb = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(400, { hint: 'try later' }) });
    let e2 = null; try { await sb.ttCall('/x'); } catch (e) { e2 = e; }
    eq(e2.message, 'try later', '5.8b: data.hint is used when there is no data.error');

    sb = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(400, { error: 'Bad', rejectCode: 'RC1' }) });
    let e3 = null; try { await sb.ttCall('/x'); } catch (e) { e3 = e; }
    eq(e3.message, 'RC1: Bad', '5.8c: rejectCode is prefixed when not already in the message');

    // 5.9 non-JSON body on a non-2xx surfaces the "Backend non-JSON" parse error
    sb = makeTtCallSandbox({ S: {}, fetchImpl: () => resp(500, false, '<html>err</html>') });
    let e4 = null; try { await sb.ttCall('/x'); } catch (e) { e4 = e; }
    eq(e4.message, 'Backend non-JSON (HTTP 500): <html>err</html>', '5.9: non-JSON error body throws the parse-error contract');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('6. ttCall — [APEX AUTH STATE] logs (shape + logical order)');
  {
    const sb = makeTtCallSandbox({
      S: { ttSessionId: 'SESS', backendKey: 'KEY', _ttSessionSource: 'memory' },
      fetchImpl: () => jsonResp(200, {}),
    });
    await sb.ttCall('/market-context/snapshot?x=1');

    // exactly two [APEX AUTH STATE] logs, pre-request then response
    const authLogs = sb.__logs.filter((a) => a[0] === '[APEX AUTH STATE]');
    eq(authLogs.length, 2, '6: exactly two [APEX AUTH STATE] logs (pre-request + response)');

    const pre = JSON.parse(authLogs[0][1]);
    eq(pre.endpoint, '/market-context/snapshot', '6.1: pre-request log endpoint is query-stripped');
    eq(pre.hasSessionId, true, '6.2: pre-request log reports session presence');
    eq(pre.sessionSource, 'memory', '6.3: pre-request log reports the session source (S._ttSessionSource)');
    eq(pre.requestHasAuthHeader, true, '6.4: pre-request log reports whether the auth header is sent');
    eq(Object.keys(pre).sort(), ['endpoint', 'hasSessionId', 'requestHasAuthHeader', 'sessionSource'],
      '6.5: pre-request log has exactly the four documented fields');

    const post = JSON.parse(authLogs[1][1]);
    eq(post.endpoint, '/market-context/snapshot', '6.6: response log endpoint is query-stripped');
    eq(post.responseStatus, 200, '6.7: response log carries responseStatus');
    eq(Object.keys(post).sort(), ['endpoint', 'responseStatus'], '6.8: response log has exactly {endpoint, responseStatus}');

    // sessionSource defaults to 'missing' when S._ttSessionSource is absent
    const sb2 = makeTtCallSandbox({ S: {}, fetchImpl: () => jsonResp(200, {}) });
    await sb2.ttCall('/x');
    eq(JSON.parse(sb2.__logs[0][1]).sessionSource, 'missing', '6.9: sessionSource falls back to "missing"');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('7. _backendAuthHeaders');
  {
    function makeBah(S) {
      const sb = { Object, S };
      vm.createContext(sb);
      vm.runInContext(ex('_backendAuthHeaders'), sb);
      return sb;
    }
    // 7.1 backend key present -> x-api-key added
    let sb = makeBah({ backendKey: 'KEY' });
    eq(sb._backendAuthHeaders(), { 'x-api-key': 'KEY' }, '7.1: adds x-api-key from S.backendKey');

    // 7.2 extra headers are merged and preserved
    sb = makeBah({ backendKey: 'KEY' });
    eq(sb._backendAuthHeaders({ 'Content-Type': 'application/json' }),
      { 'Content-Type': 'application/json', 'x-api-key': 'KEY' }, '7.2: merges caller extra headers');

    // 7.3 backend key absent -> no x-api-key (only the extra passed in)
    sb = makeBah({ backendKey: '' });
    eq(sb._backendAuthHeaders({ 'X': '1' }), { 'X': '1' }, '7.3: no x-api-key when S.backendKey is falsy');

    // 7.4 _backendAuthHeaders does NOT add x-session-id (unlike ttCall)
    sb = makeBah({ backendKey: 'KEY', ttSessionId: 'SESS' });
    ok(!('x-session-id' in sb._backendAuthHeaders()), '7.4: never adds x-session-id (distinct from ttCall)');

    // 7.5 the passed-in `extra` object is not mutated (fresh object returned)
    sb = makeBah({ backendKey: 'KEY' });
    const extra = { 'Content-Type': 'application/json' };
    const result = sb._backendAuthHeaders(extra);
    ok(!('x-api-key' in extra), '7.5: caller extra object is not mutated');
    ok(result !== extra, '7.5b: returns a fresh object (Object.assign copy)');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('8. _recordBackendApiAuthResult — auth gate');
  {
    function makeGate() {
      const sb = {
        JSON, Math, Number, String, Object, Array, Date,
        _backendApiAuthState: { lastStatus: null, lastOkAt: null, last401At: null, lastEndpoint: null, invalidApiKey: false },
        _backendCandleAuth: { backoffUntil: 0 },
        _BACKEND_CANDLE_BACKOFF_MS: 60000,
        _candleDiagNowIso: () => '2026-07-22T00:00:00.000Z',
      };
      vm.createContext(sb);
      vm.runInContext(ex('_recordBackendApiAuthResult'), sb);
      return sb;
    }

    // 8.1 2xx counts as success: clears the latch, records lastOkAt, no backoff
    let g = makeGate();
    g._recordBackendApiAuthResult('/scanner', 200);
    eq(g._backendApiAuthState.invalidApiKey, false, '8.1: 200 keeps invalidApiKey false');
    eq(g._backendApiAuthState.lastStatus, 200, '8.1b: lastStatus recorded');
    eq(g._backendApiAuthState.lastEndpoint, '/scanner', '8.1c: lastEndpoint recorded');
    ok(g._backendApiAuthState.lastOkAt != null, '8.1d: lastOkAt set on success');
    eq(g._backendCandleAuth.backoffUntil, 0, '8.1e: success does not arm the candle backoff');
    // 2xx boundary: 299 is success, 200 is success
    g = makeGate(); g._recordBackendApiAuthResult('/x', 299);
    eq(g._backendApiAuthState.invalidApiKey, false, '8.1f: 299 is treated as success');

    // 8.2 401 latches invalidApiKey, sets last401At, arms candle backoff
    g = makeGate();
    const t0 = Date.now();
    g._recordBackendApiAuthResult('/quote-token', 401);
    eq(g._backendApiAuthState.invalidApiKey, true, '8.2: 401 latches invalidApiKey true');
    ok(g._backendApiAuthState.last401At != null, '8.2b: last401At recorded on 401');
    ok(g._backendCandleAuth.backoffUntil >= t0 + 60000 - 50, '8.2c: 401 arms the candle backoff (now + BACKOFF_MS)');

    // 8.3 403 behaves like 401
    g = makeGate();
    g._recordBackendApiAuthResult('/x', 403);
    eq(g._backendApiAuthState.invalidApiKey, true, '8.3: 403 latches invalidApiKey true');
    ok(g._backendCandleAuth.backoffUntil > 0, '8.3b: 403 arms the candle backoff');

    // 8.4 latch reset after a later success (the anti-repetition latch clears)
    g = makeGate();
    g._recordBackendApiAuthResult('/x', 401);
    eq(g._backendApiAuthState.invalidApiKey, true, '8.4: latched invalid after 401');
    g._recordBackendApiAuthResult('/scanner', 200);
    eq(g._backendApiAuthState.invalidApiKey, false, '8.4b: a subsequent 2xx clears the latch');

    // 8.5 a "neither" status (e.g. 404, 500) updates only lastStatus/lastEndpoint
    g = makeGate();
    g._recordBackendApiAuthResult('/x', 500);
    eq(g._backendApiAuthState.invalidApiKey, false, '8.5: 500 does not latch invalidApiKey');
    eq(g._backendApiAuthState.lastStatus, 500, '8.5b: 500 still records lastStatus');
    eq(g._backendApiAuthState.lastOkAt, null, '8.5c: 500 does not set lastOkAt');
    eq(g._backendApiAuthState.last401At, null, '8.5d: 500 does not set last401At');
    // 8.5e a 404 after a 401 does NOT clear the invalid latch
    g = makeGate();
    g._recordBackendApiAuthResult('/x', 401);
    g._recordBackendApiAuthResult('/x', 404);
    eq(g._backendApiAuthState.invalidApiKey, true, '8.5e: 404 after 401 keeps the invalid latch');

    // 8.6 null / undefined status is a no-op (guards against garbage)
    g = makeGate();
    const before = JSON.stringify(g._backendApiAuthState);
    g._recordBackendApiAuthResult('/x', null);
    eq(JSON.stringify(g._backendApiAuthState), before, '8.6: null status is a no-op');
    g._recordBackendApiAuthResult('/x', undefined);
    eq(JSON.stringify(g._backendApiAuthState), before, '8.6b: undefined status is a no-op');

    // 8.7 the gate mutates _backendApiAuthState / _backendCandleAuth — NOT S.
    const src = ex('_recordBackendApiAuthResult').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    ok(!/\bS\./.test(src), '8.7: gate never reads or writes the global S');
    ok(/_backendApiAuthState/.test(src) && /_backendCandleAuth/.test(src), '8.7b: gate mutates _backendApiAuthState & _backendCandleAuth');

    // 8.8 the gate itself produces NO console output (logging lives in ttCall)
    let logged = 0;
    g = makeGate();
    g.console = { log: () => { logged++; }, warn: () => { logged++; }, error: () => { logged++; } };
    vm.runInContext(ex('_recordBackendApiAuthResult'), g);
    g._recordBackendApiAuthResult('/x', 401);
    g._recordBackendApiAuthResult('/x', 200);
    eq(logged, 0, '8.8: the auth gate emits no logs (no duplicated logging)');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('9. _httpStatusFromError');
  {
    const sb = { JSON, String, Object, Number, parseInt };
    vm.createContext(sb);
    vm.runInContext(ex('_httpStatusFromError'), sb);
    const hs = (e) => sb._httpStatusFromError(e);

    eq(hs(new Error('HTTP 401')), 401, '9.1: "HTTP 401" message -> 401');
    eq(hs(new Error('HTTP 500')), 500, '9.2: "HTTP 500" message -> 500');
    eq(hs(new Error('HTTP 400')), 400, '9.2b: "HTTP 400" message -> 400');
    // REAL contract: e.status is NOT consulted — status derives from message/name.
    eq(hs({ status: 401 }), null, '9.3: error with ONLY a .status property -> null (status prop ignored)');
    eq(hs({ status: 404, message: '' }), null, '9.3b: .status is ignored even alongside an empty message');
    // bare numeric codes: only the narrow fallback list matches; 400 is NOT in it
    eq(hs(new Error('500')), 500, '9.4: bare "500" matches the fallback code list');
    eq(hs(new Error('400')), null, '9.4b: bare "400" is NOT in the fallback list -> null');
    eq(hs(null), null, '9.5: null -> null');
    eq(hs(undefined), null, '9.5b: undefined -> null');
    // anomalous inputs: a raw string has no .message/.name -> ''
    eq(hs('HTTP 403'), null, '9.6: a raw string (no .message/.name) -> null');
    eq(hs({ name: 'TimeoutError' }), null, '9.6b: name without an HTTP code -> null');
    eq(hs(new Error('Unauthorized')), null, '9.6c: a message with no HTTP code -> null');
    // name is consulted when message is absent
    eq(hs({ name: 'HTTP 429 Too Many Requests' }), 429, '9.6d: falls back to e.name when message is absent');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('10. _isTransientFetchError');
  {
    const sb = { JSON, String, Object };
    vm.createContext(sb);
    vm.runInContext(ex('_isTransientFetchError'), sb);
    const tr = (e) => sb._isTransientFetchError(e);

    // transient: network + timeout/abort message substrings
    eq(tr(new Error('Failed to fetch')), true, '10.1: "Failed to fetch" is transient');
    eq(tr(new Error('net::ERR_NETWORK_CHANGED')), true, '10.1b: ERR_NETWORK_CHANGED is transient');
    eq(tr(new Error('A network error occurred')), true, '10.1c: "network error" is transient');
    eq(tr(new Error('network timeout exceeded')), true, '10.2: "network timeout" is transient');
    eq(tr(new Error('The operation was aborted')), true, '10.2b: "aborted" is transient');
    eq(tr({ name: 'AbortError' }), true, '10.2c: AbortError (by name) is transient');
    eq(tr({ name: 'TimeoutError' }), true, '10.2d: TimeoutError (by name) is transient');
    eq(tr(new Error('Load failed')), true, '10.2e: Safari "Load failed" is transient');

    // NOT transient: the function has NO HTTP-status logic — a status-coded
    // message string is never treated as transient. Pin the whole matrix.
    eq(tr(new Error('HTTP 408')), false, '10.3: HTTP 408 is NOT transient (no status logic)');
    eq(tr(new Error('HTTP 429')), false, '10.3b: HTTP 429 is NOT transient (no status logic)');
    eq(tr(new Error('HTTP 500')), false, '10.3c: HTTP 500 is NOT transient (no status logic)');
    eq(tr(new Error('HTTP 400')), false, '10.3d: HTTP 400 is NOT transient');
    eq(tr(new Error('HTTP 401')), false, '10.3e: HTTP 401 is NOT transient');
    eq(tr(new Error('HTTP 403')), false, '10.3f: HTTP 403 is NOT transient');
    eq(tr(new Error('HTTP 404')), false, '10.3g: HTTP 404 is NOT transient');

    // edges
    eq(tr(new Error('')), false, '10.4: empty message is NOT transient');
    eq(tr(null), false, '10.4b: null is NOT transient');
    eq(tr(undefined), false, '10.4c: undefined is NOT transient');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('11. _ttCallWithRetry — retries, backoff, propagation');
  {
    // Sandbox: real _isTransientFetchError + _ttCallWithRetry, a stub ttCall we
    // count, and a setTimeout that runs synchronously while recording the delay —
    // so backoffs are asserted without any real wait.
    function makeRetry(ttImpl) {
      const delays = [];
      const warns = [];
      const forwarded = [];
      const sb = {
        console: { log: () => {}, warn: (...a) => warns.push(a.join(' ')) },
        JSON, Math, Number, String, Object, Array, Promise, Error,
        ttCall: (...args) => { forwarded.push(args); return ttImpl(...args); },
        setTimeout: (fn, ms) => { delays.push(ms); fn(); return 0; },
        __delays: delays, __warns: warns, __forwarded: forwarded,
      };
      vm.createContext(sb);
      vm.runInContext([ex('_isTransientFetchError'), ex('_ttCallWithRetry')].join('\n'), sb);
      return sb;
    }

    // 11.1 success on the first attempt -> one call, no backoff
    let calls = 0;
    let sb = makeRetry(async () => { calls++; return { ok: 1 }; });
    let r = await sb._ttCallWithRetry('/j');
    eq(calls, 1, '11.1: success on first attempt calls ttCall exactly once');
    eq(sb.__delays, [], '11.1b: no backoff on immediate success');
    eq(r, { ok: 1 }, '11.1c: returns the ttCall result unchanged');

    // 11.2 transient error then success
    calls = 0;
    sb = makeRetry(async () => { calls++; if (calls < 3) throw new Error('Failed to fetch'); return { ok: 1 }; });
    r = await sb._ttCallWithRetry('/j');
    eq(calls, 3, '11.2: retries transient errors then succeeds (3 calls)');
    eq(sb.__delays, [400, 800], '11.2b: backoff sequence before success is 400, 800');

    // 11.3 exhausted retries (default 3) -> 4 calls, backoff 400/800/1600, last error thrown
    calls = 0;
    sb = makeRetry(async () => { calls++; throw new Error('network timeout ' + calls); });
    let thrown = null;
    try { await sb._ttCallWithRetry('/j'); } catch (e) { thrown = e; }
    eq(calls, 4, '11.3: default 3 retries -> up to 4 ttCall calls total');
    eq(sb.__delays, [400, 800, 1600], '11.3b: full backoff sequence is 400, 800, 1600');
    eq(thrown && thrown.message, 'network timeout 4', '11.3c: the LAST error is propagated');

    // 11.4 non-transient error -> no retry (single call), thrown immediately
    calls = 0;
    sb = makeRetry(async () => { calls++; throw new Error('HTTP 401'); });
    thrown = null;
    try { await sb._ttCallWithRetry('/j'); } catch (e) { thrown = e; }
    eq(calls, 1, '11.4: non-transient error is not retried (one call)');
    eq(sb.__delays, [], '11.4b: no backoff on a non-transient error');
    eq(thrown && thrown.message, 'HTTP 401', '11.4c: the non-transient error is re-thrown');

    // 11.5 explicit maxRetries respected
    calls = 0;
    sb = makeRetry(async () => { calls++; throw new Error('aborted'); });
    try { await sb._ttCallWithRetry('/j', undefined, 1); } catch (e) {}
    eq(calls, 2, '11.5: maxRetries=1 -> 2 calls');
    eq(sb.__delays, [400], '11.5b: maxRetries=1 -> one 400ms backoff');
    calls = 0;
    sb = makeRetry(async () => { calls++; throw new Error('aborted'); });
    try { await sb._ttCallWithRetry('/j', undefined, 0); } catch (e) {}
    eq(calls, 1, '11.5c: maxRetries=0 -> a single call (no retry)');
    eq(sb.__delays, [], '11.5d: maxRetries=0 -> no backoff');

    // 11.6 (path, opts) are forwarded to ttCall unchanged on every attempt
    calls = 0;
    sb = makeRetry(async () => { calls++; if (calls < 2) throw new Error('Failed to fetch'); return {}; });
    await sb._ttCallWithRetry('/path/x', { method: 'POST', body: { a: 1 } });
    eq(sb.__forwarded, [['/path/x', { method: 'POST', body: { a: 1 } }], ['/path/x', { method: 'POST', body: { a: 1 } }]],
      '11.6: (path, opts) forwarded verbatim on every attempt');

    // 11.7 no extra retry after a success on a retried call
    calls = 0;
    sb = makeRetry(async () => { calls++; if (calls === 1) throw new Error('Failed to fetch'); return { ok: 1 }; });
    await sb._ttCallWithRetry('/j');
    eq(calls, 2, '11.7: stops calling ttCall as soon as it succeeds (no trailing retry)');

    // 11.8 the retry warn line format is preserved
    calls = 0;
    sb = makeRetry(async () => { calls++; throw new Error('Failed to fetch'); });
    try { await sb._ttCallWithRetry('/journal/trades', undefined, 1); } catch (e) {}
    eq(sb.__warns[0], '[JOURNAL SYNC] transient error on /journal/trades (attempt 1/2) — retrying in 400ms: Failed to fetch',
      '11.8: transient retry warn line matches the current contract');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('12. window exports (used by other blocks / tests)');
  {
    // Only these two are published on window in the current source; pin that so
    // the extraction preserves the exact public surface.
    const src = APP_SRC;
    ok(/window\._isTransientFetchError\s*=\s*_isTransientFetchError/.test(src), '12.1: window._isTransientFetchError is exported');
    ok(/window\._ttCallWithRetry\s*=\s*_ttCallWithRetry/.test(src), '12.2: window._ttCallWithRetry is exported');
    // ttCall / _backendAuthHeaders / _recordBackendApiAuthResult / _httpStatusFromError
    // are NOT assigned onto window today (called via lexical scope / typeof guards).
    ok(!/window\.ttCall\s*=/.test(src), '12.3: ttCall is NOT published on window (internal binding)');
    ok(!/window\._httpStatusFromError\s*=/.test(src), '12.4: _httpStatusFromError is NOT published on window');
  }

  // ── summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + (fail === 0 ? 'All ' + pass + ' assertions passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
