'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Tastytrade login robustness — tolerant timeout + single retry + single-flight,
// no retry on bad credentials, retry clears ONLY the stale TT session, and DXLink
// is only brought up after a valid TT session.
//
// Extracts the REAL functions from index.html and runs them in a vm sandbox.
// Run: node tests/tt-login-robust.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated: ' + name);
}
function extractAsyncFn(src, name) {
  const sig = 'async function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('async function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated: ' + name);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

function timeoutErr() { const e = new Error('The operation timed out.'); e.name = 'TimeoutError'; return e; }
function resp(status, bodyObj) { return { ok: status >= 200 && status < 300, status: status, text: async () => JSON.stringify(bodyObj) }; }
function ok200() { return resp(200, { sessionId: 'sess-abc12345', accounts: [{ number: 'ACC1' }] }); }

function makeLoginSandbox() {
  const logs = [];
  const removed = [];
  const store = { apex_tt_session: 'STALE-SESSION', apex_portfolio: '{}', apex_journal_trades: '[]', apex_positions: '[]', apex_backend_key: 'BK' };
  const sb = {
    console: { log: (...a) => logs.push(a.join(' ')), warn: () => {}, error: () => {} },
    Date, JSON, Promise, Object, String, Number, isFinite,
    BACKEND: 'https://backend.test',
    AbortSignal: { timeout: () => undefined },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { removed.push(k); delete store[k]; }
    },
    S: { ttSessionId: 'STALE-SESSION', _ttSessionSource: 'localStorage', ttConnected: false, ttAccounts: [] },
    fetch: async () => ok200(),
    _logs: logs, _removed: removed, _store: store
  };
  // module-level vars referenced by the functions
  vm.createContext(sb);
  vm.runInContext('var _ttLoginInFlight = false;', sb);
  // pull TT_LOGIN_TIMEOUT_MS from the file so the sandbox mirrors index.html
  const tm = HTML.match(/var TT_LOGIN_TIMEOUT_MS\s*=\s*(\d+)/);
  vm.runInContext('var TT_LOGIN_TIMEOUT_MS = ' + (tm ? tm[1] : '28000') + ';', sb);
  vm.runInContext(extractFn(HTML, '_ttIsRetryableLoginError'), sb);
  vm.runInContext(extractAsyncFn(HTML, '_ttLoginOnce'), sb);
  vm.runInContext(extractAsyncFn(HTML, '_ttAuthLogin'), sb);
  return sb;
}

(async () => {
  console.log('TT login robustness — tests\n');

  // ── 1. static wiring ────────────────────────────────────────────────────────
  console.log('1) tolerant timeout + helpers wired');
  const tmMatch = HTML.match(/var TT_LOGIN_TIMEOUT_MS\s*=\s*(\d+)/);
  ok(tmMatch && Number(tmMatch[1]) >= 25000 && Number(tmMatch[1]) <= 30000, '1: TT login timeout is 25–30s (got ' + (tmMatch ? tmMatch[1] : 'none') + ')');
  ok(/signal:\s*AbortSignal\.timeout\(TT_LOGIN_TIMEOUT_MS\)/.test(HTML), '1: /auth/login uses the tolerant timeout constant');
  ok(/var loginRes=await _ttAuthLogin\(tu,tp\)/.test(HTML), '1: the launch login uses the robust _ttAuthLogin helper');
  ok(/var recRes=await _ttAuthLogin\(tu,tp\)/.test(HTML), '1: reconnect uses the robust _ttAuthLogin helper');
  ok(!/console\.log\([^\n]*password/i.test(HTML.slice(HTML.indexOf('async function _ttAuthLogin'), HTML.indexOf('async function _ttAuthLogin') + 1200)), '1: helper never logs the password');

  // ── 2. timeout → clears ONLY apex_tt_session and retries once → success ──────
  console.log('2) timeout → clear stale session + single retry → success');
  {
    const sb = makeLoginSandbox();
    let calls = 0;
    sb.fetch = async () => { calls++; if (calls === 1) throw timeoutErr(); return ok200(); };
    const res = await vm.runInContext('_ttAuthLogin("federicogra85","secret")', sb);
    eq(calls, 2, '2: exactly ONE retry after a timeout (2 fetches total)');
    ok(res.ok === true, '2: the retry succeeds');
    eq(res.data.sessionId, 'sess-abc12345', '2: session returned to the caller');
    ok(sb._removed.indexOf('apex_tt_session') >= 0, '2: stale apex_tt_session cleared before the retry');
    ok(sb._removed.indexOf('apex_portfolio') < 0 && sb._removed.indexOf('apex_journal_trades') < 0 && sb._removed.indexOf('apex_positions') < 0, '2: NO other user data cleared');
    ok(sb._store.apex_portfolio === '{}' && sb._store.apex_journal_trades === '[]' && sb._store.apex_positions === '[]', '2: portfolio / journal / positions keys intact');
    ok(sb._logs.some(l => /TT login retry 1\/1 after clearing stale local session/.test(l)), '2: compact retry log emitted');
    ok(sb._logs.some(l => /TT login timeout after \d+ms/.test(l)), '2: compact timeout log emitted');
  }

  // ── 3. 401 → NO retry, error surfaced ───────────────────────────────────────
  console.log('3) bad credentials (401) → no retry');
  {
    const sb = makeLoginSandbox();
    let calls = 0;
    sb.fetch = async () => { calls++; return resp(401, { error: 'invalid credentials' }); };
    const res = await vm.runInContext('_ttAuthLogin("u","wrong")', sb);
    eq(calls, 1, '3: 401 makes exactly ONE request (no retry)');
    ok(res.ok === false && res.status === 401, '3: 401 surfaced as a failure');
    ok(sb._removed.indexOf('apex_tt_session') < 0, '3: 401 does NOT clear the local session');
  }

  // ── 3b. 403 → NO retry ──────────────────────────────────────────────────────
  {
    const sb = makeLoginSandbox();
    let calls = 0;
    sb.fetch = async () => { calls++; return resp(403, { error: 'forbidden' }); };
    const res = await vm.runInContext('_ttAuthLogin("u","x")', sb);
    eq(calls, 1, '3b: 403 → no retry');
    ok(res.ok === false && res.status === 403, '3b: 403 surfaced');
  }

  // ── 4. concurrent login → single /auth/login (single-flight) ────────────────
  console.log('4) concurrent login is coalesced (single-flight)');
  {
    const sb = makeLoginSandbox();
    let calls = 0, resolveFetch = null;
    sb.fetch = () => new Promise(res => { calls++; resolveFetch = () => res(ok200()); });
    const p1 = vm.runInContext('_ttAuthLogin("u","p")', sb); // in flight (fetch pending)
    const p2 = vm.runInContext('_ttAuthLogin("u","p")', sb); // while p1 in flight
    const r2 = await p2;
    ok(r2.inFlight === true && r2.ok === false, '4: second concurrent login is a coalesced no-op');
    eq(calls, 1, '4: only ONE /auth/login request is in flight');
    resolveFetch(); const r1 = await p1;
    ok(r1.ok === true, '4: the first login still completes normally');
  }

  // ── 5. retry exhausts after a single retry (no infinite loop) ───────────────
  console.log('5) bounded retry — at most one');
  {
    const sb = makeLoginSandbox();
    let calls = 0;
    sb.fetch = async () => { calls++; throw timeoutErr(); }; // always times out
    const res = await vm.runInContext('_ttAuthLogin("u","p")', sb);
    eq(calls, 2, '5: original + exactly one retry, then stop (no infinite loop)');
    ok(res.ok === false && res.timedOut === true, '5: returns the final timeout failure');
  }

  // ── 6. DXLink only after a valid TT session ─────────────────────────────────
  console.log('6) DXLink brought up only after a valid TT session');
  {
    function postAuthSandbox() {
      const sb = {
        console: { log: () => {}, warn: () => {}, error: () => {} },
        Date, JSON, Promise, Object, String,
        S: { ttConnected: false, ttSessionId: null, dxlinkStatus: null, scanData: [] },
        _dxCalls: 0
      };
      sb.startDxlinkConnectOnce = function () { sb._dxCalls++; };
      vm.createContext(sb);
      vm.runInContext(extractFn(HTML, '_apexPostAuthInit'), sb);
      return sb;
    }
    // login with NO valid session → no DXLink
    let sb = postAuthSandbox();
    sb.S.ttConnected = false; sb.S.ttSessionId = null; sb._dxCalls = 0;
    vm.runInContext('_apexPostAuthInit("login")', sb);
    eq(sb._dxCalls, 0, '6: login with no valid TT session does NOT bring up DXLink');
    // login WITH a valid session → DXLink
    sb = postAuthSandbox();
    sb.S.ttConnected = true; sb.S.ttSessionId = 'sess'; sb._dxCalls = 0;
    vm.runInContext('_apexPostAuthInit("login")', sb);
    eq(sb._dxCalls, 1, '6: login with a valid TT session brings up DXLink');
    // reconnect → DXLink regardless (it always passes a validated session)
    sb = postAuthSandbox();
    sb.S.ttConnected = true; sb.S.ttSessionId = 'sess'; sb._dxCalls = 0;
    vm.runInContext('_apexPostAuthInit("reconnect")', sb);
    eq(sb._dxCalls, 1, '6: reconnect brings up DXLink');
  }

  // ── 7. no backend/scanner/candle endpoints touched by the login helpers ──────
  console.log('7) login helpers are auth-only');
  {
    const helperSrc = (extractAsyncFn(HTML, '_ttAuthLogin') + extractAsyncFn(HTML, '_ttLoginOnce'))
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    ok(/\/auth\/login/.test(helperSrc), '7: helper calls /auth/login');
    ok(!/\/market\/candles|\/scanner\/|\/dxlink\/|runScan|warmup|new WebSocket|setInterval/.test(helperSrc),
      '7: helper never touches candles/scanner/dxlink/warmup/sockets/timers');
  }

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
