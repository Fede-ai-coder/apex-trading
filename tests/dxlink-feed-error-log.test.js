'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DXLink feedChannelLastError logging guard.
//
// /dxlink/status returns feedChannelLastError as the backend's STICKY "last error
// ever seen" on the feed channel (it is not cleared backend-side). pollDxlinkStatus
// runs every 12s, so the old code re-printed the SAME stale error on every poll —
// e.g. an 08:38 "Candle subscription too big" still console.warn'd at 08:59, long
// after the offending warmups stopped.
//
// The guard (extracted REAL from index.html and run in a vm sandbox):
//   • _dxlinkFeedErrSig(err) — stable signature (time|message) for dedup;
//   • _dxlinkFeedErrIsStale(err) — true when the error predates this frontend
//     DXLink session (a pre-session leftover, not a new failure);
//   • pollDxlinkStatus logs each DISTINCT error at most once: stale → debug, new →
//     one console.warn WITH context; startDxlinkConnectOnce resets the dedup marker
//     and stamps the session start so a new session re-evaluates.
//
// Run: node tests/dxlink-feed-error-log.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  // Prefer the `async function NAME(` form so the `async` keyword is included
  // (matching `function NAME(` first would strip it and break `await` in the body).
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

const SESSION = Date.parse('2026-06-03T08:59:00.000Z');
const STALE_ERR = { time: '2026-06-03T08:38:17.929Z', message: "Your subscription size for event type 'Candle' is too big" };
const NEW_ERR   = { time: '2026-06-03T09:01:00.000Z', message: "Your subscription size for event type 'Candle' is too big" };
const NEW_ERR2  = { time: '2026-06-03T09:03:30.000Z', message: 'feed reset' };

// ── Sandbox: real guard + poll/connect, capturing console + debug ────────────
const warns = [];    // console.warn (fresh, alarming)
const dwarns = [];    // debugWarn('dxlink', …) (stale / behind scope)
const sandbox = {
  JSON, Date, isFinite, parseFloat, Object,
  BACKEND: '',
  AbortSignal: { timeout: () => undefined },
  _backendAuthHeaders: () => ({}),
  _renderDxlinkDiag: () => {},
  debugLog: () => {},
  debugWarn: (scope) => { if (scope === 'dxlink') dwarns.push(Array.prototype.slice.call(arguments, 1)); },
  console: { warn: function () { warns.push(Array.prototype.slice.call(arguments)); }, log: () => {}, error: () => {} },
  S: { dxlinkConnectStarted: false, dxlinkStatus: null, backendKey: null },
  _dxlinkLoggedFeedErrSig: null,
  _dxlinkSessionStartedAt: null,
  _candleSubDiagLog: [],
  _candleSubscribed: new Set(),
  _candleQueue: [],
  _CANDLE_SUB_DIAG_MAX: 200,
  __diagDumps: [],
  _logRecentCandleDiagnosticsForFeedError: function(feedErr) { sandbox.__diagDumps.push(feedErr); },
  __statusData: {},
};
// debugWarn/console.warn need the right `arguments` — define as real fns in-context.
sandbox.debugWarn = function (scope) { if (scope === 'dxlink') dwarns.push(Array.prototype.slice.call(arguments, 1)); };
sandbox.console.warn = function () { warns.push(Array.prototype.slice.call(arguments)); };
sandbox.fetch = function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve(sandbox.__statusData); } }); };
// pollDxlinkStatus now delegates its logic to _pollDxlinkStatusOnce, wrapped by the
// storm-control coalescer. This test awaits each poll sequentially, so a pass-through
// coalescer preserves the once-per-distinct-error logging behavior under test.
sandbox._coalesceDxStatus = function (fn) { return fn(); };
vm.createContext(sandbox);
vm.runInContext(
  ['_dxlinkFeedErrSig', '_dxlinkFeedErrIsStale', 'startDxlinkConnectOnce', '_pollDxlinkStatusOnce', 'pollDxlinkStatus']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);

function reset(sessionAt) {
  warns.length = 0; dwarns.length = 0; sandbox.__diagDumps.length = 0;
  sandbox._dxlinkLoggedFeedErrSig = null;
  sandbox._dxlinkSessionStartedAt = sessionAt != null ? sessionAt : SESSION;
}
const warnText = () => warns.map((a) => a.map(String).join(' ')).join(' || ');

async function main() {
  // ── 1. _dxlinkFeedErrSig — stable dedup signature ──────────────────────────
  section('1. _dxlinkFeedErrSig: stable signature for dedup');
  {
    ok(sandbox._dxlinkFeedErrSig(STALE_ERR) === sandbox._dxlinkFeedErrSig({ time: STALE_ERR.time, message: STALE_ERR.message }),
       '1: identical error → identical signature');
    ok(sandbox._dxlinkFeedErrSig(STALE_ERR) !== sandbox._dxlinkFeedErrSig(NEW_ERR),
       '1: different time → different signature');
    ok(sandbox._dxlinkFeedErrSig('plain string') === 'plain string', '1: string error supported');
    ok(sandbox._dxlinkFeedErrSig(null) === null, '1: null → null signature');
  }

  // ── 2. _dxlinkFeedErrIsStale — timestamp vs session ────────────────────────
  section('2. _dxlinkFeedErrIsStale: pre-session timestamp ⇒ stale');
  {
    sandbox._dxlinkSessionStartedAt = SESSION;
    ok(sandbox._dxlinkFeedErrIsStale(STALE_ERR) === true, '2: 08:38 error < 08:59 session → stale');
    ok(sandbox._dxlinkFeedErrIsStale(NEW_ERR) === false, '2: 09:01 error ≥ session → not stale');
    ok(sandbox._dxlinkFeedErrIsStale({ message: 'no time' }) === false, '2: no timestamp → not treated as stale');
    sandbox._dxlinkSessionStartedAt = null;
    ok(sandbox._dxlinkFeedErrIsStale(STALE_ERR) === false, '2: no session start → cannot classify as stale');
  }

  // ── 3. STALE error repeated across polls → NOT re-spammed ──────────────────
  section('3. stale feedChannelLastError is logged at most once (no 12s re-spam)');
  {
    reset(SESSION);
    sandbox.__statusData = { state: 'ready', feedChannelState: 'ready', feedChannelLastError: STALE_ERR };
    await sandbox.pollDxlinkStatus();
    await sandbox.pollDxlinkStatus();
    await sandbox.pollDxlinkStatus();   // 3 polls, same sticky stale error
    ok(warns.length === 0, '3: stale error never hits console.warn (not shown as a new failure)');
    ok(dwarns.length === 1, '3: stale error surfaced exactly ONCE under the dxlink debug scope (not 3×)');
  }

  // ── 4. NEW error → ONE console.warn with context, no re-spam ───────────────
  section('4. a new (this-session) error logs once, with context');
  {
    reset(SESSION);
    sandbox.__statusData = { state: 'ready', feedChannelState: 'error', quoteSubscriptionsCount: 42,
      subscriptionLimitStatus: { candle: 'over' }, feedChannelLastError: NEW_ERR };
    await sandbox.pollDxlinkStatus();
    await sandbox.pollDxlinkStatus();
    await sandbox.pollDxlinkStatus();   // 3 polls, same new error
    ok(warns.length === 1, '4: new error console.warn’d exactly ONCE across 3 polls');
    ok(/feedChannelLastError \(new\)/.test(warnText()), '4: tagged as (new)');
    ok(/ctx state=ready/.test(warnText()) && /quoteSubs=42/.test(warnText()) && /subLimit=/.test(warnText()),
       '4: includes context (state / quoteSubs / subLimit) to identify the source');
    ok(sandbox.__diagDumps.length === 1 && sandbox.__diagDumps[0] === NEW_ERR,
       '4: new non-stale Candle subscription-limit error triggers Candle diagnostic dump once');
  }

  // ── 5. Two distinct new errors → logged once EACH (real errors not hidden) ─
  section('5. distinct new errors each log once (real errors are not hidden)');
  {
    reset(SESSION);
    sandbox.__statusData = { state: 'ready', feedChannelLastError: NEW_ERR };
    await sandbox.pollDxlinkStatus();
    sandbox.__statusData = { state: 'ready', feedChannelLastError: NEW_ERR2 };  // different error
    await sandbox.pollDxlinkStatus();
    await sandbox.pollDxlinkStatus();
    ok(warns.length === 2, '5: two different errors → two console.warns (one per distinct error)');
  }

  // ── 6. Fresh connect resets the dedup marker + stamps the session ──────────
  section('6. startDxlinkConnectOnce resets the dedup marker and session start');
  {
    sandbox._dxlinkLoggedFeedErrSig = 'something|old';
    sandbox._dxlinkSessionStartedAt = 1;
    sandbox.S.dxlinkConnectStarted = false;
    sandbox.startDxlinkConnectOnce();   // sync portion runs before the awaited fetch
    ok(sandbox._dxlinkLoggedFeedErrSig === null, '6: dedup marker reset to null on connect');
    ok(sandbox._dxlinkSessionStartedAt > 1, '6: session start stamped (Date.now())');
  }

  // ── 7. After reset (reconnect), the same error is allowed to log again ─────
  section('7. reconnect re-enables logging (does not permanently swallow errors)');
  {
    reset(SESSION);
    sandbox.__statusData = { state: 'ready', feedChannelLastError: NEW_ERR };
    await sandbox.pollDxlinkStatus();
    ok(warns.length === 1, '7: new error logged once');
    await sandbox.pollDxlinkStatus();
    ok(warns.length === 1, '7: …and not again while the marker is unchanged');
    sandbox._dxlinkLoggedFeedErrSig = null;   // simulate reconnect reset
    await sandbox.pollDxlinkStatus();
    ok(warns.length === 2, '7: after a reset, the error logs again (errors are never permanently swallowed)');
  }

  // ── 8. STATIC: Squeeze Fire RS path never warms/ensures/subscribes SPY ─────
  section('8. SFS RS path adds no frontend SPY subscriptions (anti-regression)');
  {
    const ensureChart = HTML.slice(HTML.indexOf('async function _sfsEnsureChartData'),
                                   HTML.indexOf('async function _sfsEnsureChartData') + 1400);
    const draw = stripComments(extractFn(HTML, '_sfsDrawRsPanel'));
    const readOnly = stripComments(extractFn(HTML, '_sfsSpyReadOnly'));
    ok(!/_sfsEnsureTfCandles\(\s*'SPY'/.test(ensureChart), '8: _sfsEnsureChartData does not frontend-ensure SPY');
    ok(!/_sfsEnsureTfCandles|_ensureCandleSubscription|_ensure30MSubscription/.test(draw), '8: _sfsDrawRsPanel never opens frontend Candle subscriptions');
    ok(!/_sfsEnsureTfCandles|_ensureCandleSubscription|_ensure30MSubscription/.test(readOnly), '8: _sfsSpyReadOnly never opens frontend Candle subscriptions');
    ok(/_sfsFetchBackendCandles\(\s*'SPY'/.test(readOnly) && /_sfsWarmupBatch\(\s*\[\s*'SPY'\s*\]/.test(readOnly), '8: SPY resolved via backend GET plus tiny SPY-only backend warmup when needed');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
