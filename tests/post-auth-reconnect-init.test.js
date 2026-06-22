'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Post-authentication initialization lifecycle — _apexPostAuthInit(reason)
//
// Bug: after an initial TT login TIMEOUT followed by a successful RECONNECT, the
// Dashboard stayed half-initialised — VIX never fetched, quote-token/DXLink not
// restarted, dashboard context prewarm still blocked by a pre-auth
// backend_auth_not_ready latch, scanner context not refreshed. A reconnect must
// replay the SAME post-auth pipeline as a clean login.
//
// This extracts the REAL _apexPostAuthInit from index.html (no copy, can't drift)
// and runs it in a vm sandbox with spy stubs for every step it orchestrates, plus
// a static check that BOTH the launch and reconnect paths call it.
//
// Run: node tests/post-auth-reconnect-init.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Brace-matching extractor (skips strings / comments) — same shape as the other suites.
function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
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
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── build a fresh sandbox per case so call counts don't leak ─────────────────
function makeSandbox(over) {
  over = over || {};
  const calls = {
    resetAuth: 0, dxConnect: 0, dxConnectNoop: 0, dxPoll: 0, dxPollNoop: 0, dxDiag: 0,
    regime: [], ensureVix: 0, fetchVix: 0, postCtx: [], bss: 0, bssNoop: 0,
    dsbAuto: 0, dsbAutoNoop: 0, dsbEnrich: 0, jMigrate: 0,
  };
  const S = {
    ttConnected: over.ttConnected !== undefined ? over.ttConnected : true,
    dxlinkConnectStarted: over.dxlinkConnectStarted !== undefined ? over.dxlinkConnectStarted : true,
    dxlinkStatus: over.dxlinkStatus !== undefined ? over.dxlinkStatus : { state: 'ready' },
    vixFamily: over.vixFamily !== undefined ? over.vixFamily : { vix: 18.2 },
    // a pre-auth transient failure latch the reconnect must clear
    _authInvalid: !!over.authInvalid,
  };
  // single-flight VIX (mimics _vixFamilyPending behaviour)
  let vixPending = false;
  const sandbox = {
    console, JSON, Object, String, Math, Boolean,
    S,
    _activeView: over.activeView !== undefined ? over.activeView : 'dashboard',
    _resetBackendApiAuthState: () => { calls.resetAuth++; S._authInvalid = false; },
    // once-guard like the real startDxlinkConnectOnce
    startDxlinkConnectOnce: () => { if (S.dxlinkConnectStarted) { calls.dxConnectNoop++; return; } S.dxlinkConnectStarted = true; calls.dxConnect++; },
    startDxlinkStatusPolling: () => { if (sandbox._dxPollTimer) { calls.dxPollNoop++; return; } sandbox._dxPollTimer = 1; calls.dxPoll++; },
    _dxPollTimer: over.dxPollRunning ? 1 : 0,
    _renderDxlinkDiag: () => { calls.dxDiag++; },
    refreshSharedMarketRegime: (reason) => {
      calls.regime.push(reason);
      // non-force path ensures VIX when missing + connected (mirrors real impl)
      if (S.ttConnected && (!S.vixFamily || S.vixFamily.vix == null)) sandbox._ensureVixFamily();
    },
    _ensureVixFamily: () => {
      calls.ensureVix++;
      if (S.vixFamily && S.vixFamily.vix != null) return;        // cached
      if (vixPending) return;                                    // single-flight
      vixPending = true; calls.fetchVix++;                       // would call fetchVixFamily
    },
    postCandleContext: (o) => { calls.postCtx.push(o); },
    bssStartPolling: () => { if (sandbox._bssTimer) { calls.bssNoop++; return; } sandbox._bssTimer = 1; calls.bss++; },
    _bssTimer: 0,
    dsbStartAutoRefresh: () => { if (sandbox._dsbTimer) { calls.dsbAutoNoop++; return; } sandbox._dsbTimer = 1; calls.dsbAuto++; },
    _dsbTimer: 0,
    dsbEnrichVisibleRowsLive: () => { calls.dsbEnrich++; },
    jMigrateApexTradesToBackend: () => { calls.jMigrate++; },
  };
  sandbox.__calls = calls;
  vm.createContext(sandbox);
  vm.runInContext(extractFn(HTML, '_apexPostAuthInit'), sandbox);
  return sandbox;
}

// ── 1. static wiring: BOTH launch and reconnect call _apexPostAuthInit ───────
section('1. launch + reconnect both replay the shared post-auth init');
{
  ok(/function _apexPostAuthInit\(/.test(HTML), '1: _apexPostAuthInit defined');
  // launch is an anonymous launchBtn click handler — assert the call exists in
  // the same launch sequence (next to the LAUNCH log line).
  const noComments = stripComments(HTML);
  ok(/_apexPostAuthInit\(\s*'login'\s*\)/.test(noComments), '1: launch sequence calls _apexPostAuthInit("login")');
  const reconnect = stripComments(extractFn(HTML, 'doReconnectTT'));
  ok(/_apexPostAuthInit\(\s*'reconnect'\s*\)/.test(reconnect), '1: doReconnectTT calls _apexPostAuthInit("reconnect")');
  // reconnect sets the session live before replaying the init
  ok(/S\.ttConnected\s*=\s*true/.test(reconnect) && reconnect.indexOf('S.ttConnected=true') < reconnect.indexOf("_apexPostAuthInit('reconnect')"),
    '1: reconnect marks ttConnected before _apexPostAuthInit');
}

// ── 2. normal login triggers the full post-auth pipeline ─────────────────────
section('2. normal login → full post-auth pipeline');
{
  const sb = makeSandbox({});
  sb._apexPostAuthInit('login');
  const c = sb.__calls;
  ok(c.dxConnectNoop + c.dxConnect >= 1, '2: DXLink connect invoked');
  ok(c.dxPoll === 1, '2: DXLink status polling started');
  ok(c.regime.length === 1 && c.regime[0] === 'launch', '2: Market Context refresh (launch)');
  ok(c.ensureVix >= 1, '2: VIX family ensured');
  ok(c.postCtx.some((o) => o && o.reason === 'dashboard_init'), '2: dashboard context prewarm posted');
  ok(c.bss === 1 && c.dsbAuto === 1 && c.dsbEnrich === 1, '2: scanner snapshot + directional enrichment kicked');
  ok(c.jMigrate === 1, '2: journal migration invoked');
}

// ── 3. login timeout → reconnect replays the SAME pipeline ───────────────────
section('3. login timeout then reconnect → same post-auth pipeline');
{
  // simulate: initial login timed out (not connected, VIX never fetched, DXLink
  // connect ran pre-auth so the once-guard is set but the feed is NOT ready),
  // then reconnect succeeds (ttConnected true).
  const sb = makeSandbox({ ttConnected: true, dxlinkConnectStarted: true, dxlinkStatus: { state: 'connecting' }, vixFamily: null, authInvalid: true });
  sb._apexPostAuthInit('reconnect');
  const c = sb.__calls;
  ok(c.resetAuth === 1 && sb.S._authInvalid === false, '3: prior backend_auth_not_ready latch cleared on reconnect');
  ok(c.regime.length === 1 && c.regime[0] === 'reconnect', '3: Market Context refreshed (reconnect)');
  ok(c.fetchVix >= 1, '3: VIX family actually fetched (was missing)');
  ok(c.postCtx.some((o) => o && o.reason === 'dashboard_init'), '3: dashboard context prewarm retried after auth');
  ok(c.bss === 1 && c.dsbAuto === 1 && c.dsbEnrich === 1, '3: scanner + directional enrichment resumed');
}

// ── 4. DXLink reconnect logic: re-arm when NOT ready, leave alone when ready ──
section('4. quote-token / DXLink restart only when not already ready');
{
  // not ready on reconnect → once-guard re-armed → a fresh connect runs
  const notReady = makeSandbox({ dxlinkConnectStarted: true, dxlinkStatus: { state: 'connecting' } });
  notReady._apexPostAuthInit('reconnect');
  ok(notReady.__calls.dxConnect === 1, '4: DXLink not ready → a single fresh connect runs');

  // already ready on reconnect → guard NOT re-armed → no unnecessary reconnect
  const ready = makeSandbox({ dxlinkConnectStarted: true, dxlinkStatus: { state: 'ready' } });
  ready._apexPostAuthInit('reconnect');
  ok(ready.__calls.dxConnect === 0 && ready.__calls.dxConnectNoop === 1 && ready.S.dxlinkConnectStarted === true,
    '4: DXLink already ready → no reconnect (once-guard left intact)');
}

// ── 5. idempotency: repeated reconnects make no duplicates ───────────────────
section('5. repeated reconnect success → no duplicate timers/sockets/VIX');
{
  const sb = makeSandbox({ dxlinkStatus: { state: 'ready' }, vixFamily: { vix: 17.1 } });
  sb._apexPostAuthInit('reconnect');
  sb._apexPostAuthInit('reconnect');
  sb._apexPostAuthInit('reconnect');
  const c = sb.__calls;
  ok(c.dxPoll === 1, '5: DXLink poll timer created once across repeated reconnects');
  ok(c.bss === 1 && c.dsbAuto === 1, '5: scanner snapshot + auto-refresh timers created once (idempotent)');
  ok(c.fetchVix === 0, '5: VIX not re-fetched when already present (single-flight/cached)');
  ok(c.dxConnect === 0, '5: no extra DXLink connect when already ready');
}

// ── 6. scanner/directional steps are gated on the Dashboard being active ─────
section('6. scanner + directional steps run only while Dashboard is active');
{
  const off = makeSandbox({ activeView: 'journal' });
  off._apexPostAuthInit('reconnect');
  const c = off.__calls;
  ok(c.bss === 0 && c.dsbAuto === 0 && c.dsbEnrich === 0, '6: off-dashboard → no scanner refresh / directional enrichment');
  // but auth-level bring-up still happens (VIX / DXLink / Market Context)
  ok(c.dxPoll === 1 && c.regime.length === 1, '6: auth-level VIX/DXLink/Market Context still initialised off-dashboard');
}

// ── 7. directional live-price enrichment resumes after reconnect ─────────────
section('7. Directional live-price enrichment retry resumes after reconnect');
{
  const sb = makeSandbox({ activeView: 'dashboard' });
  sb._apexPostAuthInit('reconnect');
  ok(sb.__calls.dsbEnrich === 1, '7: dsbEnrichVisibleRowsLive invoked (PR 265 readiness-gated retry resumes)');
}

// ── 8. anti-regression: init never throws even if optionals are missing ──────
section('8. init is defensive — missing optional functions never throw');
{
  const sandbox = { console, JSON, Object, String, Math, Boolean, S: { ttConnected: true, dxlinkStatus: null }, _activeView: 'dashboard' };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(HTML, '_apexPostAuthInit'), sandbox);
  let threw = false;
  try { sandbox._apexPostAuthInit('reconnect'); } catch (e) { threw = true; }
  ok(!threw, '8: _apexPostAuthInit tolerates a bare environment (all calls typeof-guarded)');
}

// ── summary ───────────────────────────────────────────────────────────────────
console.log('\nResult: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('ALL TESTS PASSED');
