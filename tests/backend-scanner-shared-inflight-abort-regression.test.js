'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND SCANNER SNAPSHOT — SHARED IN-FLIGHT + ABORT REGRESSION
//
// WHAT THIS PROTECTS
//   Two coordinated defects, both reproducible end-to-end from real application source:
//
//   (A) CONCURRENT READER DISCARDED.
//       bssFetchStatus / bssFetchSnapshot / bssFetchCoverage guarded themselves with a
//       plain boolean. A second caller saw `fetching* === true` and returned `undefined`
//       IMMEDIATELY, before any data existed. In production that second caller was the
//       Swing panel: the 60s poll had /scanner/snapshot in flight, the operator opened
//       Swing, `await bssFetchSnapshot()` returned instantly with nothing, hydration
//       classified a perfectly healthy pipeline as "empty", and when the real snapshot
//       landed in S.backendScanner nothing re-hydrated the tabs.
//       FIXED BY: a SINGLE-FLIGHT JOIN. The first caller stores the completion Promise on
//       S.backendScanner.{statusPromise,snapshotPromise,coveragePromise}; concurrent
//       callers return that same completion. One request, one commit, one render — and no
//       caller finishes before the request it joined.
//
//   (B) ABORT TREATED AS AN EMPTY SNAPSHOT.
//       An AbortError / AbortSignal.timeout is a CLIENT-side condition. It was funnelled
//       into the hydration "empty" branch, which wiped S.swing.backendByTab and rendered
//       "Backend snapshot empty/stale — last updated … [The operation was aborted.].
//        Use RUN FULL SCAN to rebuild." — a destructive, misleading verdict built partly
//       from a /scanner/status timestamp for a snapshot that never arrived.
//       FIXED BY: a distinct `aborted` hydration status driven by the SHARED
//       _swingIsAbortError detector, preserving the previous tabs (same object and array
//       references), preserving the last genuinely-received timestamp (or null), and
//       rendering the exact copy the coverage panel already used.
//
// METHOD
//   • Application source is loaded ONLY through tests/lib/load-app-source.js.
//   • Real top-level `function` / `async function` declarations are extracted verbatim and
//     run in a `vm` sandbox. NO implementation is copied into this file.
//   • Fully offline and deterministic: fetch, document, localStorage, the clock and all
//     timers are test doubles. No network, no real timers, no npm dependency.
//   • Concurrency is driven by explicit deferreds — never by wall-clock waits.
//   • Aborts use a real `DOMException(message, 'AbortError')`.
//
// Run: node tests/backend-scanner-shared-inflight-abort-regression.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const { loadAppJavaScriptSource, extractFunctionSource } = require('./lib/load-app-source');

const SRC = loadAppJavaScriptSource();
function fn(name) { return extractFunctionSource(name, { source: SRC }); }

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++; failures.push(msg);
  console.log('  ✗ ' + msg);
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  ok(a === e, msg + ' (expected ' + e + ', got ' + a + ')');
}
function section(t) { console.log('\n── ' + t); }

// ═════════════════════════════════════════════════════════════════════════════
// Test doubles
// ═════════════════════════════════════════════════════════════════════════════
function deferred() {
  const d = {};
  d.promise = new Promise((res, rej) => { d.resolve = res; d.reject = rej; });
  return d;
}
// A real AbortError, exactly as produced by a fetch aborted through an AbortSignal.
function realAbortError(message) {
  return new DOMException(message == null ? 'The operation was aborted.' : message, 'AbortError');
}
// Lets the microtask chains inside the extracted async functions settle.
const settle = () => new Promise((r) => setImmediate(r));
// True once `p` has settled, without ever awaiting it.
function watch(p) {
  const w = { done: false, rejected: false, error: null };
  p.then(() => { w.done = true; }, (e) => { w.done = true; w.rejected = true; w.error = e; });
  return w;
}

// Controlled clock: setTimeout / setInterval / clear* + Date.now, driven by tick().
function makeClock(startMs) {
  let now = startMs == null ? 1700000000000 : startMs;
  let seq = 1;
  const timers = new Map();
  return {
    now: () => now,
    pending: () => timers.size,
    intervals: () => [...timers.values()].filter(t => t.repeat).map(t => t.every),
    api: {
      setTimeout(cb, ms) { const id = seq++; timers.set(id, { cb, every: ms || 0, due: now + (ms || 0), repeat: false }); return id; },
      setInterval(cb, ms) { const id = seq++; timers.set(id, { cb, every: ms || 0, due: now + (ms || 0), repeat: true }); return id; },
      clearTimeout(id) { timers.delete(id); },
      clearInterval(id) { timers.delete(id); },
    },
    tick(ms) {
      const target = now + ms;
      let guard = 0;
      for (;;) {
        let next = null;
        for (const [id, t] of timers) if (t.due <= target && (next === null || t.due < next[1].due)) next = [id, t];
        if (!next || ++guard > 1000) break;
        const [id, t] = next;
        now = t.due;
        if (t.repeat) t.due = now + t.every; else timers.delete(id);
        t.cb();
      }
      now = target;
    },
  };
}

// Minimal DOM double. Elements exist only when declared in `ids`.
function makeDom(ids) {
  const els = {};
  (ids || []).forEach((id) => {
    els[id] = {
      id, innerHTML: '', textContent: '', disabled: false, style: {}, scrollTop: 0, _attrs: {},
      setAttribute(k, v) { this._attrs[k] = v; },
      removeAttribute(k) { delete this._attrs[k]; },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    };
  });
  return { els, getElementById(id) { return Object.prototype.hasOwnProperty.call(els, id) ? els[id] : null; } };
}

// Programmable fetch double. Routes match on URL substring; each route is a queue of
// responders consumed in order (the last one repeats).
function makeFetch() {
  const calls = [];
  const routes = new Map();
  function respond(body, init) {
    const i = init || {};
    return {
      ok: i.status == null ? true : (i.status >= 200 && i.status < 300),
      status: i.status == null ? 200 : i.status,
      json: () => (i.jsonRejects ? Promise.reject(new SyntaxError('Unexpected token < in JSON')) : Promise.resolve(body)),
    };
  }
  const f = function (url, options) {
    calls.push({ url: String(url), options: options || {} });
    for (const [key, queue] of routes) {
      if (String(url).indexOf(key) >= 0) {
        const responder = queue.length > 1 ? queue.shift() : queue[0];
        return responder(String(url), options || {});
      }
    }
    return Promise.resolve(respond({ ok: true }));
  };
  f.calls = calls;
  f.route = (key, ...responders) => { routes.set(key, responders.slice()); return f; };
  f.json = (body, init) => () => Promise.resolve(respond(body, init));
  f.status = (code) => () => Promise.resolve(respond({ error: 'boom' }, { status: code }));
  f.badJson = () => () => Promise.resolve(respond(null, { jsonRejects: true }));
  f.reject = (err) => () => Promise.reject(err);
  f.syncThrow = (err) => () => { throw (err || new TypeError('synchronous fetch failure')); };
  f.deferred = (d) => () => d.promise;
  f.count = (needle) => calls.filter(c => c.url.indexOf(needle) >= 0).length;
  return f;
}

// The BSS orchestration core (real declarations, extracted verbatim).
const BSS_CORE = [
  'ffBackendScannerSnapshot', 'bssState',
  'bssParseStatus', 'bssParseSnapshot', 'bssIsNoSnapshot', 'bssFreshness',
  'bssFetchStatus', 'bssFetchSnapshot', 'bssFetchCoverage',
  'bssRefresh', 'bssStartPolling', 'bssStopPolling',
];
// The Swing consumer chain needed to hydrate AND render real rows.
const SWING_FNS = [
  '_swingScannerLabel', '_swingFilterCandidates', '_swingTrendCellColor', '_swingFmtPct', '_swingRenderCapInfo',
  '_swingCapInfoLabel', '_swingTabCandidatesRaw', '_swingTabCandidates', '_swingHasUsableScannerData',
  '_swingSnapshotRsValue', '_swingSqueezeBlock', '_swingSnapshotSqueezeOperational',
  '_swingSnapshotHasSqueezeDiagnostics', '_swingSnapshotInSqueeze', '_swingSnapshotHasSqueezeField',
  '_swingBackendSqueezeAvailable', '_swingResolveDirectionRaw', '_swingNormDir',
  '_swingSnapshotCandidatesForDisplay', '_swingMapSnapshotToTabs',
  '_swingFmtWhen', '_swingOtherTabsHint', '_swingNonEmptyOtherTabLabels', '_swingAdoptHydratedTab',
  '_swingSetCandidateScope', '_swingRenderScopeToggle', '_swingSetTab',
  '_swingDirRank', '_swingSortCandidates', '_swingToggleSort', '_swingSortArrow', '_swingRowEnriched',
  '_swingEnrichCell', '_swingScoreCell', '_swingRsCell', '_swingOperationalRsMap', '_swingOperationalRsState',
  '_swingApplyOperationalRsJoin', '_swingRowSourceBias', '_swingSwingDirRank', '_swingBiasProvAbbrev',
  '_swingBiasCell', '_swingDirectionCell', '_swingSwingDirColor', '_swingRenderTable',
  '_swingRenderTabBadges', '_swingCovNum', '_swingCovCount', '_swingCovFirst', '_swingCovFirstCount',
  '_swingLogCoveragePaths', '_swingResolveProcessedLastRun', '_swingIsAbortError',
  '_swingComputeCandleCoverage', '_swingComputeCoverage', '_swingRenderCoverage',
  '_swingHydrateFromBackend',
];
// The Directional adapter — used only to prove BDSP is untouched by this change.
const BDS_FNS = [
  '_bdsNum', '_bdsBoolOrNull', '_bdsStrOrNull',
  'bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow',
  'bdsSortBackendDirectionalRows', 'bdsDeriveBackendDirectionalRows', 'bdsBackendDirectionalSummary',
];

const SWING_DOM_IDS = [
  'swing-tbl-body', 'swing-cap-info', 'swing-coverage', 'swing-tab-label',
  'swing-tab-squeeze', 'swing-tab-rs', 'swing-tab-directional',
  'swing-tab-badge-squeeze', 'swing-tab-badge-rs', 'swing-tab-badge-directional',
  'swing-scope-window', 'swing-scope-all', 'swing-tab-scope-note',
  'swing-coverage-refresh', 'swing-coverage-refresh-status', 'bss-refresh',
];

function freshSwingState() {
  return {
    active: true, running: false, activeTab: 'directional', candidateScope: 'window',
    candidates: [], candidatesByTab: { squeeze: [], rs: [], directional: [] },
    selectedByTab: { squeeze: null, rs: null, directional: null },
    selectedSymbol: null, selectedIndex: null, candidatesTotal: 0, sort: null,
    backendByTab: { squeeze: [], rs: [], directional: [] },
    backendHydration: null, _hydrating: false, _hydrateAttempts: 0, _hydrateRetryTimer: null,
    status: { phase: 'idle', byTab: { squeeze: null, rs: null, directional: null } },
  };
}

// Builds a sandbox containing the REAL extracted functions plus the doubles.
function makeEnv(opts) {
  const o = opts || {};
  const clock = makeClock(o.now);
  const fetchDouble = makeFetch();
  const dom = makeDom(o.domIds || []);
  const store = Object.assign({}, o.localStorage || {});
  const renders = [];
  const logs = [];

  const sandbox = {
    console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    Date: new Proxy(Date, { construct: (T, a) => new T(...a), apply: () => clock.now(), get: (T, p) => (p === 'now' ? clock.now : T[p]) }),
    Math, JSON, Object, Array, String, Number, Boolean, isFinite, isNaN, parseFloat, parseInt,
    Promise, Error, RegExp, DOMException, AbortController, AbortSignal, SyntaxError, TypeError,
    setTimeout: clock.api.setTimeout, clearTimeout: clock.api.clearTimeout,
    setInterval: clock.api.setInterval, clearInterval: clock.api.clearInterval,
    fetch: fetchDouble,
    document: dom,
    window: {},
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    BACKEND: o.backend == null ? 'https://backend.test' : o.backend,
    _activeView: o.activeView == null ? 'dashboard' : o.activeView,
    S: o.S || { backendKey: 'test-key-123' },
    SWING_EAGER_ENRICH_4H: 30, SWING_HYDRATE_RETRY_MS: 700, SWING_HYDRATE_MAX_RETRIES: 8,
    _backendAuthHeaders: function (extra) {
      const h = Object.assign({}, extra || {});
      if (sandbox.S && sandbox.S.backendKey) h['x-api-key'] = sandbox.S.backendKey;
      return h;
    },
    escHtml: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    // Recording render seam for the BSS panel (the panel renderer itself is not under test).
    bssRender: function () { renders.push(clock.now()); },
    bdspRender: function () {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  (o.fns || []).forEach((name) => { vm.runInContext(fn(name), sandbox); });
  if (o.extra) vm.runInContext(o.extra, sandbox);

  return {
    sandbox, clock, fetch: fetchDouble, dom, renders, logs,
    bss: () => sandbox.S.backendScanner,
    swing: () => sandbox.S.swing,
    hyd: () => sandbox.S.swing.backendHydration,
    body: () => dom.els['swing-tbl-body'].innerHTML,
    run: (code) => vm.runInContext(code, sandbox),
  };
}

// Collaborators outside the audited boundary, declared as doubles.
const SWING_EXTRA = [
  'function _backendCandleGateOpen(){ return true; }',
  'function _backendCandleGateReason(){ return "ready"; }',
  'function _swingClearCharts(){}',
  'function _swingRenderSelectedRow(){}',
].join('\n');

function makeSwingEnv(over) {
  const S = Object.assign({
    backendKey: 'k',
    scanData: [{ symbol: 'FRONTEND_ONLY' }],
    rsScannerData: [],
    squeezeFireScanner: { results: [], chartCacheCandles: {} },
    swing: freshSwingState(),
  }, over || {});
  return makeEnv({ fns: BSS_CORE.concat(SWING_FNS), domIds: SWING_DOM_IDS, S, extra: SWING_EXTRA });
}

function okStatus(over) {
  return Object.assign({ ok: true, schedulerEnabled: true, running: false, staleMs: 300000,
    lastSnapshotUpdatedAt: '2026-07-26T10:00:00.000Z' }, over || {});
}
function okSnapshot(over) {
  return Object.assign({
    ok: true, stale: false, ageMs: 30000, staleMs: 300000, updatedAt: '2026-07-26T10:00:00.000Z',
    candidates: [
      { symbol: 'AAPL', relativeStrengthVsSpy: 1.2, directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.7 } },
      { symbol: 'MSFT', relativeStrengthVsSpy: 0.8, directionDiagnostics: { candidateDirection: 'SHORT', confidence: 0.6 } },
    ],
    diagnostics: {},
  }, over || {});
}
const resolveWith = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });

// ═════════════════════════════════════════════════════════════════════════════
(async function main() {

// ───────────────────────────────────────────────────────────────────────────
section('1. shared in-flight — /scanner/status');
// ───────────────────────────────────────────────────────────────────────────
// Matrix applied identically to all three readers: two concurrent callers, ONE request,
// the second caller still pending, success unblocks both, exactly ONE render, both state
// fields released, and a third call afterwards starting a genuinely new request.
async function sharedMatrix(label, call, ep, flag, field, firstBody, secondBody) {
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  const d = deferred();
  env.fetch.route(ep, env.fetch.deferred(d), env.fetch.json(secondBody));

  const pA = env.run(call);
  const wA = watch(pA);
  await settle();
  eq(env.fetch.count(ep), 1, label + ': the first caller issued exactly one request');
  ok(env.bss()[flag] === true, label + ': the fetching flag is latched');
  ok(env.bss()[field] != null, label + ': the completion Promise is stored on bssState().' + field);

  const pB = env.run(call);
  const wB = watch(pB);
  await settle(); await settle(); await settle();
  eq(env.fetch.count(ep), 1, label + ': the concurrent caller issued NO second request');
  ok(wB.done === false, label + ': the concurrent caller is STILL PENDING (not dropped with an early undefined)');
  ok(wA.done === false, label + ': the originating caller is still pending too');
  eq(env.renders.length, 0, label + ': the concurrent caller performed no render of its own');

  d.resolve(resolveWith(firstBody));
  const bValue = await pB;
  await pA; await settle();
  ok(wA.done && wB.done, label + ': BOTH callers unblock together, when the real request completes');
  ok(bValue === undefined, label + ': the joined caller still resolves with undefined');
  eq(env.renders.length, 1, label + ': exactly ONE render served both callers');
  eq([env.bss()[flag], env.bss()[field]], [false, null], label + ': cleanup — flag cleared and Promise field released');

  await env.run(call);
  eq(env.fetch.count(ep), 2, label + ': a third call AFTER completion starts a NEW request');
  return env;
}
{
  const env = await sharedMatrix('STATUS', 'bssFetchStatus()', '/scanner/status', 'fetchingStatus', 'statusPromise',
    okStatus({ universeCount: 111 }), okStatus({ universeCount: 222 }));
  eq(env.bss().status.universeCount, 222, 'STATUS: the subsequent request commits normally');
  eq(env.bss().statusError, null, 'STATUS: no error after a clean sequence');
}

// ───────────────────────────────────────────────────────────────────────────
section('2. shared in-flight — /scanner/snapshot');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = await sharedMatrix('SNAPSHOT', 'bssFetchSnapshot()', '/scanner/snapshot', 'fetchingSnapshot', 'snapshotPromise',
    okSnapshot({ updatedAt: 'FIRST' }), okSnapshot({ updatedAt: 'SECOND' }));
  eq(env.bss().snapshot.updatedAt, 'SECOND', 'SNAPSHOT: the subsequent request commits normally');
  eq(env.bss().snapshot.candidates.length, 2, 'SNAPSHOT: candidates parsed as before');
}
// The two endpoints join independently — one never blocks the other.
{
  const env = makeEnv({ fns: BSS_CORE });
  const dStatus = deferred();
  env.fetch.route('/scanner/status', env.fetch.deferred(dStatus));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.run('bssFetchStatus()');
  await settle();
  await env.run('bssFetchSnapshot()');
  ok(env.bss().snapshot != null && env.bss().status === null, 'INDEPENDENT: snapshot completes while status is still in flight');
  ok(env.bss().statusPromise != null && env.bss().snapshotPromise === null, 'INDEPENDENT: each endpoint owns its own completion field');
  dStatus.resolve(resolveWith(okStatus()));
  await settle();
}

// ───────────────────────────────────────────────────────────────────────────
section('3. shared in-flight — /scanner/coverage/status (+ 404 latch, abort, cache)');
// ───────────────────────────────────────────────────────────────────────────
{
  const S = { backendKey: 'k', swing: freshSwingState() };
  const env = makeEnv({ fns: BSS_CORE.concat(['_swingIsAbortError']), S });
  const d = deferred();
  env.fetch.route('/scanner/coverage/status', env.fetch.deferred(d), env.fetch.json({ ok: true, gen: 2 }));

  const pA = env.run('bssFetchCoverage()'), wA = watch(pA);
  await settle();
  const pB = env.run('bssFetchCoverage()'), wB = watch(pB);
  await settle(); await settle(); await settle();
  eq(env.fetch.count('/scanner/coverage/status'), 1, 'COVERAGE: one request for two concurrent callers');
  ok(wB.done === false && wA.done === false, 'COVERAGE: both callers pending until the real request completes');
  eq(env.renders.length, 0, 'COVERAGE: the joined caller renders nothing on its own');

  d.resolve(resolveWith({ ok: true, gen: 1 }));
  await pB; await pA; await settle();
  ok(wA.done && wB.done, 'COVERAGE: both callers unblock together');
  eq(env.renders.length, 1, 'COVERAGE: exactly one render for the shared operation');
  eq([env.bss().fetchingCoverage, env.bss().coveragePromise], [false, null], 'COVERAGE: cleanup complete');
  eq(env.bss().coverage.gen, 1, 'COVERAGE: the real response is committed');
  eq(env.sandbox.S.swing.lastGoodCoverageStatus.gen, 1, 'COVERAGE: last-known-good cache on S.swing is unchanged behaviour');
  await env.run('bssFetchCoverage()');
  eq(env.fetch.count('/scanner/coverage/status'), 2, 'COVERAGE: a later call starts a new request');
}
// 404 latch survives the join: one request, remembered absent, never retried.
{
  const env = makeEnv({ fns: BSS_CORE.concat(['_swingIsAbortError']), S: { backendKey: 'k', swing: freshSwingState() } });
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  await env.run('bssFetchCoverage()');
  ok(env.bss().coverageEndpointAbsent === true, 'COVERAGE 404: the absent-endpoint latch is set');
  eq(env.bss().coverageError, 'HTTP 404', 'COVERAGE 404: error recorded');
  eq(env.renders.length, 1, 'COVERAGE 404: one render');
  const joined = await env.run('Promise.all([bssFetchCoverage(), bssFetchCoverage()])');
  eq(env.fetch.count('/scanner/coverage/status'), 1, 'COVERAGE 404: the latch permanently stops re-fetching, join included');
  eq(joined, [undefined, undefined], 'COVERAGE 404: latched calls still resolve undefined');
  eq(env.renders.length, 1, 'COVERAGE 404: a latched call renders nothing');
}
// Abort → coverage nulled (UNCHANGED, out of scope) but the last-known-good cache survives
// and both the originator and the joined caller observe the same outcome.
{
  const S = { backendKey: 'k', swing: freshSwingState() };
  const env = makeEnv({ fns: BSS_CORE.concat(['_swingIsAbortError']), S });
  env.fetch.route('/scanner/coverage/status', env.fetch.json({ ok: true, gen: 'GOOD' }), env.fetch.reject(realAbortError('The operation timed out.')));
  await env.run('bssFetchCoverage()');
  eq(env.sandbox.S.swing.lastGoodCoverageStatus.gen, 'GOOD', 'COVERAGE ABORT: a valid payload is cached first');
  const d = deferred();
  env.fetch.route('/scanner/coverage/status', env.fetch.deferred(d));
  const pA = env.run('bssFetchCoverage()'), pB = env.run('bssFetchCoverage()');
  const wA = watch(pA), wB = watch(pB);
  await settle();
  eq(env.fetch.count('/scanner/coverage/status'), 2, 'COVERAGE ABORT: still one request per operation');
  ok(wB.done === false, 'COVERAGE ABORT: the joined caller waits for the aborting request');
  d.reject(realAbortError('The operation timed out.'));
  await pA; await pB; await settle();
  ok(wA.done && wB.done && !wA.rejected && !wB.rejected, 'COVERAGE ABORT: both callers resolve (a handled error never rejects)');
  ok(env.bss().coverage === null, 'COVERAGE ABORT: st.coverage nulled on abort — UNCHANGED, deliberately out of scope');
  eq(env.bss().coverageError, 'The operation timed out.', 'COVERAGE ABORT: the abort text is recorded');
  eq(env.sandbox.S.swing.lastGoodCoverageStatus.gen, 'GOOD', 'COVERAGE ABORT: last-known-good is preserved');
  eq([env.bss().fetchingCoverage, env.bss().coveragePromise], [false, null], 'COVERAGE ABORT: cleanup complete');
  ok(env.logs.some(l => /timed out/.test(l)), 'COVERAGE ABORT: the existing timeout warning still fires');
  eq(env.renders.length, 2, 'COVERAGE ABORT: one render per operation (two operations so far)');
}

// ───────────────────────────────────────────────────────────────────────────
section('4. error cleanup matrix — every reader × every failure mode');
// ───────────────────────────────────────────────────────────────────────────
// No failure may leave a reader permanently locked: the Promise field returns to null, the
// fetching flag returns to false, and a retry issues a genuinely new request.
{
  const READERS = [
    { call: 'bssFetchStatus()', ep: '/scanner/status', flag: 'fetchingStatus', field: 'statusPromise', good: okStatus() },
    { call: 'bssFetchSnapshot()', ep: '/scanner/snapshot', flag: 'fetchingSnapshot', field: 'snapshotPromise', good: okSnapshot() },
    { call: 'bssFetchCoverage()', ep: '/scanner/coverage/status', flag: 'fetchingCoverage', field: 'coveragePromise', good: { ok: true } },
  ];
  const MODES = [
    ['HTTP 500', (f) => f.status(500)],
    ['AbortError', (f) => f.reject(realAbortError())],
    ['timeout', (f) => f.reject(realAbortError('The operation timed out.'))],
    ['network reject', (f) => f.reject(new TypeError('Failed to fetch'))],
    ['JSON parse reject', (f) => f.badJson()],
    ['fetch throws synchronously', (f) => f.syncThrow()],
  ];
  for (const rd of READERS) {
    for (const [label, mk] of MODES) {
      const tag = rd.call + ' + ' + label;
      const env = makeEnv({ fns: BSS_CORE.concat(['_swingIsAbortError']), S: { backendKey: 'k', swing: freshSwingState() } });
      env.fetch.route(rd.ep, mk(env.fetch), env.fetch.json(rd.good));
      const w = watch(env.run(rd.call));
      await settle(); await settle(); await settle();
      ok(w.done && !w.rejected, tag + ' → the handled failure resolves, it never rejects');
      eq([env.bss()[rd.flag], env.bss()[rd.field]], [false, null], tag + ' → CLEANUP: flag cleared, Promise field released');
      eq(env.renders.length, 1, tag + ' → exactly one render for the failed operation');
      const before = env.fetch.count(rd.ep);
      await env.run(rd.call);
      eq(env.fetch.count(rd.ep), before + 1, tag + ' → RETRY: a new request really starts');
    }
  }
}
// The renderer throwing is the one case that propagates: cleanup must ALREADY have happened,
// every joined caller must see a coherent rejection, and no retry/backoff/silent catch is added.
{
  for (const rd of [
    { call: 'bssFetchStatus()', ep: '/scanner/status', flag: 'fetchingStatus', field: 'statusPromise', good: okStatus() },
    { call: 'bssFetchSnapshot()', ep: '/scanner/snapshot', flag: 'fetchingSnapshot', field: 'snapshotPromise', good: okSnapshot() },
    { call: 'bssFetchCoverage()', ep: '/scanner/coverage/status', flag: 'fetchingCoverage', field: 'coveragePromise', good: { ok: true } },
  ]) {
    const tag = rd.call + ' + renderer throws';
    const env = makeEnv({ fns: BSS_CORE.concat(['_swingIsAbortError']), S: { backendKey: 'k', swing: freshSwingState() } });
    const d = deferred();
    env.fetch.route(rd.ep, env.fetch.deferred(d), env.fetch.json(rd.good));
    let renderCalls = 0, stateAtRender = null;
    env.sandbox.bssRender = function () {
      renderCalls++;
      stateAtRender = [env.bss()[rd.flag], env.bss()[rd.field]];
      throw new Error('render exploded');
    };
    const wA = watch(env.run(rd.call));
    await settle();
    const wB = watch(env.run(rd.call));      // joins the same operation
    await settle();
    d.resolve(resolveWith(rd.good));
    await settle(); await settle(); await settle();
    eq(renderCalls, 1, tag + ' → the renderer ran exactly once');
    eq(stateAtRender, [false, null], tag + ' → CLEANUP HAPPENED BEFORE the renderer was invoked');
    ok(wA.rejected && wB.rejected, tag + ' → BOTH the originator and the joined caller observe a rejection');
    eq([wA.error.message, wB.error.message], ['render exploded', 'render exploded'], tag + ' → the rejection is coherent for both');
    eq([env.bss()[rd.flag], env.bss()[rd.field]], [false, null], tag + ' → the reader is left clean');
    env.sandbox.bssRender = function () { renderCalls++; };
    const before = env.fetch.count(rd.ep);
    await env.run(rd.call);
    eq(env.fetch.count(rd.ep), before + 1, tag + ' → the reader is immediately usable again');
  }
}

// ───────────────────────────────────────────────────────────────────────────
section('5. polling → Swing SUCCESS race (the defect this PR closes)');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeSwingEnv();
  const dSnap = deferred();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dSnap));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));

  env.run('bssStartPolling()');                 // dashboard poll: snapshot read in flight
  await settle();
  eq(env.fetch.count('/scanner/snapshot'), 1, 'RACE: the poll issued the snapshot read');
  ok(env.bss().snapshotPromise != null, 'RACE: the poll owns the shared completion');

  const wHyd = watch(env.run('_swingHydrateFromBackend({ reason: "panel_open" })'));   // operator opens Swing
  await settle(); await settle(); await settle();
  eq(env.fetch.count('/scanner/snapshot'), 1, 'RACE: hydration issued NO second snapshot request — it JOINED the poll');
  ok(wHyd.done === false, 'RACE: hydration is STILL PENDING — it no longer resumes without the snapshot');
  eq(env.hyd().status, 'loading', 'RACE: while waiting, the panel keeps its honest loading state');

  dSnap.resolve(resolveWith(okSnapshot()));
  await settle(); await settle(); await settle(); await settle();
  ok(wHyd.done === true, 'RACE: hydration resumes exactly when the joined request completes');
  ok(env.bss().snapshot != null && env.bss().snapshot.candidates.length === 2, 'RACE: the poll committed the snapshot');
  eq(env.hyd().status, 'ready', 'RACE: hydration used THAT snapshot — status "ready", never "empty"');
  ok(env.hyd().reason == null, 'RACE: no null/ambiguous "empty" reason is produced');
  eq(env.swing().backendByTab.directional.length, 2, 'RACE: the Directional tab is populated from the joined snapshot');
  eq(env.swing().backendByTab.rs.length, 2, 'RACE: the RS tab is populated too');
  ok(/swing-row-AAPL/.test(env.body()), 'RACE: the table renders the hydrated rows');
  ok(!/RUN FULL SCAN/.test(env.body()), 'RACE: no RUN FULL SCAN prompt for a healthy pipeline');
  eq(env.fetch.count('/scanner/snapshot'), 1, 'RACE: recovery needed no retry, no artificial polling, no second request');
  eq(env.clock.intervals(), [60000], 'RACE: the 60s poll interval is untouched');
  env.run('bssStopPolling()');
}

// ───────────────────────────────────────────────────────────────────────────
section('6. polling → Swing ABORT race with previously hydrated rows');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeSwingEnv();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  // Seed: a real, successful hydration populates the tabs.
  await env.run('_swingHydrateFromBackend({ reason: "seed" })');
  eq(env.hyd().status, 'ready', 'ABORT RACE: seeded from a valid snapshot');
  const byTabRef = env.swing().backendByTab;
  const sqRef = byTabRef.squeeze, rsRef = byTabRef.rs, dirRef = byTabRef.directional;
  const dirLen = dirRef.length, rsLen = rsRef.length;
  const scanDataRef = env.sandbox.S.scanData;
  const seededUpdatedAt = env.hyd().updatedAt;
  ok(/swing-row-AAPL/.test(env.body()), 'ABORT RACE: rows are on screen before the abort');

  // The next snapshot read aborts and commits nothing, while /scanner/status DID refresh.
  env.sandbox.S.backendScanner.snapshot = null;      // the aborted read leaves nothing usable
  const dSnap = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dSnap));
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: '2026-07-26T13:30:00.000Z' })));
  env.run('bssFetchSnapshot()');                     // poll tick starts the read
  await settle();
  const wHyd = watch(env.run('_swingHydrateFromBackend({ reason: "panel_open" })'));
  await settle(); await settle(); await settle();
  eq(env.fetch.count('/scanner/snapshot'), 2, 'ABORT RACE: hydration joined the poll — no third request');
  ok(wHyd.done === false, 'ABORT RACE: hydration waits for the real request even though it will fail');

  dSnap.reject(realAbortError('The operation was aborted.'));
  await settle(); await settle(); await settle(); await settle();
  ok(wHyd.done === true, 'ABORT RACE: hydration resumes when the joined request aborts');
  eq(env.bss().snapshotError, 'The operation was aborted.', 'ABORT RACE: the reader recorded the abort text');
  eq(env.hyd().status, 'aborted', 'ABORT RACE: status is "aborted" — never "empty"/"stale"/"NO_SNAPSHOT"/"backend_empty"');
  eq(env.hyd().reason, 'The operation was aborted.', 'ABORT RACE: the exact abort reason is preserved');
  eq(env.hyd().updatedAt, seededUpdatedAt, 'ABORT RACE: updatedAt is the last genuinely-received snapshot timestamp');
  ok(env.hyd().updatedAt !== '2026-07-26T13:30:00.000Z', 'ABORT RACE: the freshly-received /scanner/status timestamp is NOT adopted');
  ok(env.swing().backendByTab === byTabRef, 'ABORT RACE: S.swing.backendByTab keeps its exact object reference');
  ok(env.swing().backendByTab.squeeze === sqRef && env.swing().backendByTab.rs === rsRef && env.swing().backendByTab.directional === dirRef,
     'ABORT RACE: the three arrays keep their exact references — not replaced, not emptied, not remapped');
  eq([env.swing().backendByTab.directional.length, env.swing().backendByTab.rs.length], [dirLen, rsLen],
     'ABORT RACE: the preserved rows are untouched');
  eq(env.hyd().counts, { squeeze: 0, rs: rsLen, directional: dirLen }, 'ABORT RACE: the reported totals match the preserved tabs');
  ok(env.sandbox.S.scanData === scanDataRef, 'ABORT RACE: S.scanData is untouched');
  eq(env.sandbox.S.scanData, [{ symbol: 'FRONTEND_ONLY' }], 'ABORT RACE: the frontend candidates are untouched');
  ok(/swing-row-AAPL/.test(env.body()), 'ABORT RACE: the previously hydrated rows are STILL rendered');
  ok(!/RUN FULL SCAN/.test(env.body()), 'ABORT RACE: no "RUN FULL SCAN" invitation');
  ok(!/Backend snapshot empty\/stale/.test(env.body()), 'ABORT RACE: no "Backend snapshot empty/stale"');
  eq([env.bss().snapshotPromise, env.bss().fetchingSnapshot], [null, false], 'ABORT RACE: the reader is released after the abort');
}

// ───────────────────────────────────────────────────────────────────────────
section('6b. abort with the PREVIOUS BSS snapshot still committed (nothing nulled)');
// ───────────────────────────────────────────────────────────────────────────
// The realistic shape: bssFetchSnapshot PRESERVES the last valid snapshot when a read aborts,
// so S.backendScanner.snapshot is still a perfectly parseable ok:true payload with candidates.
// It was NOT received by this request, so hydration must NOT re-map it as a fresh success —
// the abort verdict is decided before snapOk/total are consulted at all.
{
  const env = makeSwingEnv();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot({ updatedAt: '2026-07-26T10:00:00.000Z' })));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  await env.run('_swingHydrateFromBackend({ reason: "seed" })');
  eq(env.hyd().status, 'ready', 'PRESERVED SNAPSHOT: seeded from a valid snapshot');
  const byTabRef = env.swing().backendByTab;
  const sqRef = byTabRef.squeeze, rsRef = byTabRef.rs, dirRef = byTabRef.directional;
  const dirLen = dirRef.length, rsLen = rsRef.length;
  const seededUpdatedAt = env.hyd().updatedAt;
  const scanDataRef = env.sandbox.S.scanData;

  // The next read aborts. NOTHING is nulled by the test: the real reader keeps st.snapshot.
  env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError('The operation was aborted.')));
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: '2026-07-26T13:30:00.000Z' })));
  await env.run('_swingHydrateFromBackend({ reason: "abort_with_preserved" })');
  await settle();

  ok(env.bss().snapshot != null && env.bss().snapshot.ok === true && env.bss().snapshot.candidates.length === 2,
     'PRESERVED SNAPSHOT: bssFetchSnapshot kept the previous VALID snapshot committed (unchanged reader behaviour)');
  eq(env.bss().snapshotError, 'The operation was aborted.', 'PRESERVED SNAPSHOT: the abort is recorded alongside it');
  eq(env.hyd().status, 'aborted',
     'PRESERVED SNAPSHOT: status is "aborted" — a preserved snapshot is NOT republished as a fresh success');
  eq(env.hyd().reason, 'The operation was aborted.', 'PRESERVED SNAPSHOT: the exact abort reason is kept');
  eq(env.hyd().updatedAt, seededUpdatedAt, 'PRESERVED SNAPSHOT: updatedAt stays that of the last successful hydration');
  ok(env.hyd().updatedAt !== '2026-07-26T13:30:00.000Z', 'PRESERVED SNAPSHOT: the fresh /scanner/status timestamp is NOT adopted');
  ok(env.swing().backendByTab === byTabRef, 'PRESERVED SNAPSHOT: S.swing.backendByTab keeps its exact object reference');
  ok(env.swing().backendByTab.squeeze === sqRef && env.swing().backendByTab.rs === rsRef && env.swing().backendByTab.directional === dirRef,
     'PRESERVED SNAPSHOT: the three arrays keep their exact references');
  eq([env.swing().backendByTab.directional.length, env.swing().backendByTab.rs.length], [dirLen, rsLen],
     'PRESERVED SNAPSHOT: the rows are untouched');
  ok(env.sandbox.S.scanData === scanDataRef, 'PRESERVED SNAPSHOT: S.scanData is untouched');
  ok(/swing-row-AAPL/.test(env.body()), 'PRESERVED SNAPSHOT: the rows stay on screen');
  ok(!/RUN FULL SCAN/.test(env.body()), 'PRESERVED SNAPSHOT: no "RUN FULL SCAN"');

  // Retry: the next real snapshot is adopted normally.
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot({
    updatedAt: '2026-07-26T15:00:00.000Z',
    candidates: [
      { symbol: 'NVDA', relativeStrengthVsSpy: 1.4, directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.8 } },
      { symbol: 'AMD', relativeStrengthVsSpy: 1.1, directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.6 } },
      { symbol: 'TSLA', relativeStrengthVsSpy: 0.7, directionDiagnostics: { candidateDirection: 'SHORT', confidence: 0.5 } },
    ],
  })));
  await env.run('_swingHydrateFromBackend({ reason: "retry" })');
  await settle();
  eq(env.hyd().status, 'ready', 'PRESERVED SNAPSHOT: the retry returns to the normal success status');
  ok(env.hyd().reason == null, 'PRESERVED SNAPSHOT: the abort reason is cleared on recovery');
  eq(env.hyd().updatedAt, '2026-07-26T15:00:00.000Z', 'PRESERVED SNAPSHOT: the new timestamp is adopted');
  eq(env.swing().backendByTab.directional.length, 3, 'PRESERVED SNAPSHOT: the new rows are adopted normally');
  ok(/swing-row-NVDA/.test(env.body()) && !/swing-row-AAPL/.test(env.body()), 'PRESERVED SNAPSHOT: the table shows the new data');
}
// Same preserved-snapshot shape, but the Swing tabs were never hydrated: the transient copy
// must be shown rather than back-filling the tabs from a snapshot this request never received.
{
  const env = makeSwingEnv();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: '2026-07-26T13:30:00.000Z' })));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()), env.fetch.reject(realAbortError('The operation was aborted.')));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  // A dashboard poll committed a valid snapshot; Swing itself has never hydrated.
  await env.run('bssFetchSnapshot()');
  ok(env.bss().snapshot != null && env.bss().snapshot.ok === true, 'PRESERVED / NO ROWS: the poll committed a valid snapshot');
  eq(env.swing().backendByTab, { squeeze: [], rs: [], directional: [] }, 'PRESERVED / NO ROWS: the Swing tabs are still empty');

  await env.run('_swingHydrateFromBackend({ reason: "panel_open" })');   // its own read aborts
  await settle();
  eq(env.bss().snapshotError, 'The operation was aborted.', 'PRESERVED / NO ROWS: this request aborted');
  ok(env.bss().snapshot != null && env.bss().snapshot.ok === true, 'PRESERVED / NO ROWS: the older valid snapshot is still committed');
  eq(env.hyd().status, 'aborted', 'PRESERVED / NO ROWS: status is "aborted", not "ready"');
  eq(env.hyd().reason, 'The operation was aborted.', 'PRESERVED / NO ROWS: the abort reason is reported');
  eq(env.hyd().updatedAt, null, 'PRESERVED / NO ROWS: no successful hydration behind it → updatedAt is null');
  eq(env.swing().backendByTab, { squeeze: [], rs: [], directional: [] },
     'PRESERVED / NO ROWS: the snapshot this request never received is NOT re-mapped into the tabs');
  const html = env.body();
  ok(html.indexOf('The requests timed out / were aborted — retry shortly.') >= 0, 'PRESERVED / NO ROWS: the transient copy is shown');
  ok(!/RUN FULL SCAN/.test(html), 'PRESERVED / NO ROWS: no "RUN FULL SCAN"');
  ok(!/last updated/.test(html), 'PRESERVED / NO ROWS: no "last updated" borrowed from the preserved snapshot or the status read');
  ok(!/swing-row-/.test(html), 'PRESERVED / NO ROWS: no rows are invented from the older snapshot');
}

// ───────────────────────────────────────────────────────────────────────────
section('6c. OPERATION-SCOPED verdict — the coverage window cannot flip the classification');
// ───────────────────────────────────────────────────────────────────────────
// S.backendScanner is shared, and _swingHydrateFromBackend awaits bssFetchCoverage() (up to
// 18s) between its snapshot read and the moment it classifies. An INDEPENDENT bssFetchSnapshot()
// — a 60s poll tick — can land inside that window and rewrite snapshot/snapshotError. The
// hydration's verdict must belong to the snapshot operation IT awaited, in BOTH directions.
const snapshotA = okSnapshot({
  updatedAt: '2026-07-26T10:00:00.000Z',
  candidates: [
    { symbol: 'AAPL', relativeStrengthVsSpy: 1.2, directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.7 } },
    { symbol: 'MSFT', relativeStrengthVsSpy: 0.8, directionDiagnostics: { candidateDirection: 'SHORT', confidence: 0.6 } },
  ],
});
const snapshotB = okSnapshot({
  updatedAt: '2026-07-26T16:00:00.000Z',
  candidates: [
    { symbol: 'NVDA', relativeStrengthVsSpy: 1.4, directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.8 } },
    { symbol: 'AMD', relativeStrengthVsSpy: 1.1, directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.6 } },
    { symbol: 'TSLA', relativeStrengthVsSpy: 0.7, directionDiagnostics: { candidateDirection: 'SHORT', confidence: 0.5 } },
  ],
});

// ── SCENARIO A — hydration snapshot SUCCEEDS, a later poll read ABORTS during the coverage.
{
  const env = makeSwingEnv();
  const dCov = deferred();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  // 1st snapshot read (the hydration's) succeeds with A; 2nd (the poll's) aborts.
  env.fetch.route('/scanner/snapshot', env.fetch.json(snapshotA), env.fetch.reject(realAbortError('The operation was aborted.')));
  env.fetch.route('/scanner/coverage/status', env.fetch.deferred(dCov));

  const wHyd = watch(env.run('_swingHydrateFromBackend({ reason: "H" })'));
  await settle(); await settle(); await settle();
  eq(env.fetch.count('/scanner/snapshot'), 1, 'SCENARIO A: the hydration issued its own snapshot read');
  ok(env.bss().snapshot != null && env.bss().snapshot.updatedAt === '2026-07-26T10:00:00.000Z',
     'SCENARIO A: the hydration\'s snapshot A is committed');
  eq(env.bss().snapshotError, null, 'SCENARIO A: no error at the moment the hydration captured its state');
  ok(env.bss().coveragePromise != null && wHyd.done === false, 'SCENARIO A: the hydration is parked on the pending coverage read');

  // An INDEPENDENT poll tick lands inside the coverage window and aborts.
  await env.run('bssFetchSnapshot()');
  await settle();
  eq(env.fetch.count('/scanner/snapshot'), 2, 'SCENARIO A: the poll issued a genuinely new snapshot read');
  eq(env.bss().snapshotError, 'The operation was aborted.',
     'SCENARIO A: the GLOBAL snapshotError is now an abort — re-reading it after the coverage would say "aborted"');
  ok(env.bss().snapshot != null, 'SCENARIO A: snapshot A is still preserved by the reader');

  dCov.resolve(resolveWith({ ok: true }));
  await settle(); await settle(); await settle();
  ok(wHyd.done === true, 'SCENARIO A: the hydration resumes once its coverage read completes');
  eq(env.hyd().status, 'ready',
     'SCENARIO A: the verdict is READY — the later abort belongs to another operation and cannot flip it');
  ok(env.hyd().status !== 'aborted', 'SCENARIO A: never "aborted"');
  eq(env.hyd().updatedAt, '2026-07-26T10:00:00.000Z', 'SCENARIO A: the timestamp is snapshot A\'s');
  ok(env.hyd().reason == null, 'SCENARIO A: no abort reason leaks into a successful hydration');
  eq([env.swing().backendByTab.directional.length, env.swing().backendByTab.rs.length], [2, 2],
     'SCENARIO A: the tabs are mapped from snapshot A');
  ok(/swing-row-AAPL/.test(env.body()) && /swing-row-MSFT/.test(env.body()), 'SCENARIO A: snapshot A\'s rows are rendered');
  ok(env.body().indexOf('The requests timed out / were aborted') < 0, 'SCENARIO A: the abort copy is absent');
  ok(!/RUN FULL SCAN/.test(env.body()), 'SCENARIO A: the poll\'s abort causes no RUN FULL SCAN prompt');
  // The discriminator, stated explicitly: a post-coverage re-read WOULD have said "aborted".
  ok(env.bss().snapshotError === 'The operation was aborted.' && env.hyd().status === 'ready',
     'SCENARIO A: DISCRIMINATOR — the global error says abort while the hydration says ready; a post-coverage re-read would fail this');
}

// ── SCENARIO B — hydration snapshot ABORTS, a later poll read SUCCEEDS during the coverage.
{
  const env = makeSwingEnv();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(snapshotA));
  env.fetch.route('/scanner/coverage/status', env.fetch.json({ ok: true }));   // seed: not a 404, so no latch
  await env.run('_swingHydrateFromBackend({ reason: "seed" })');
  eq(env.hyd().status, 'ready', 'SCENARIO B: seeded from snapshot A');
  const byTabRef = env.swing().backendByTab;
  const sqRef = byTabRef.squeeze, rsRef = byTabRef.rs, dirRef = byTabRef.directional;
  const seededUpdatedAt = env.hyd().updatedAt;

  const dCov = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError('The operation timed out.')), env.fetch.json(snapshotB));
  env.fetch.route('/scanner/coverage/status', env.fetch.deferred(dCov));
  const wHyd = watch(env.run('_swingHydrateFromBackend({ reason: "H" })'));
  await settle(); await settle(); await settle();
  eq(env.bss().snapshotError, 'The operation timed out.', 'SCENARIO B: the hydration\'s own snapshot read aborted');
  ok(wHyd.done === false, 'SCENARIO B: the hydration is parked on the pending coverage read');

  // An INDEPENDENT poll tick succeeds inside the coverage window: it commits B and CLEARS the error.
  await env.run('bssFetchSnapshot()');
  await settle();
  eq(env.bss().snapshotError, null, 'SCENARIO B: the GLOBAL snapshotError was cleared by the later successful read');
  eq(env.bss().snapshot.updatedAt, '2026-07-26T16:00:00.000Z',
     'SCENARIO B: the GLOBAL snapshot is now B — re-reading it after the coverage would publish B as this hydration\'s success');

  dCov.resolve(resolveWith({ ok: true }));
  await settle(); await settle(); await settle();
  ok(wHyd.done === true, 'SCENARIO B: the hydration resumes once its coverage read completes');
  eq(env.hyd().status, 'aborted', 'SCENARIO B: the verdict stays ABORTED — it belongs to the hydration\'s own snapshot operation');
  ok(env.hyd().status !== 'ready' && env.hyd().status !== 'stale' && env.hyd().status !== 'empty',
     'SCENARIO B: never ready / stale / empty');
  eq(env.hyd().reason, 'The operation timed out.', 'SCENARIO B: the reason is the hydration\'s own abort error');
  eq(env.hyd().updatedAt, seededUpdatedAt, 'SCENARIO B: updatedAt stays that of the last successful hydration');
  ok(env.swing().backendByTab === byTabRef, 'SCENARIO B: backendByTab keeps its exact reference');
  ok(env.swing().backendByTab.squeeze === sqRef && env.swing().backendByTab.rs === rsRef && env.swing().backendByTab.directional === dirRef,
     'SCENARIO B: the three arrays keep their exact references');
  eq(env.swing().backendByTab.directional.length, 2, 'SCENARIO B: snapshot B was NOT adopted — the seeded rows are intact');
  ok(/swing-row-AAPL/.test(env.body()) && !/swing-row-NVDA/.test(env.body()),
     'SCENARIO B: the table still shows A\'s rows, never B\'s');
  ok(!/RUN FULL SCAN/.test(env.body()), 'SCENARIO B: no "RUN FULL SCAN"');
  ok(env.bss().snapshot.updatedAt === '2026-07-26T16:00:00.000Z' && env.hyd().status === 'aborted',
     'SCENARIO B: DISCRIMINATOR — the global snapshot is B while the hydration stays aborted; a post-coverage re-read would fail this');

  // A LATER hydration adopts B normally.
  env.fetch.route('/scanner/snapshot', env.fetch.json(snapshotB));
  env.fetch.route('/scanner/coverage/status', env.fetch.json({ ok: true }));
  await env.run('_swingHydrateFromBackend({ reason: "H2" })');
  await settle();
  eq(env.hyd().status, 'ready', 'SCENARIO B: the next hydration returns to the normal success status');
  ok(env.hyd().reason == null, 'SCENARIO B: the abort reason is cleared');
  eq(env.hyd().updatedAt, '2026-07-26T16:00:00.000Z', 'SCENARIO B: H2 adopts snapshot B\'s timestamp');
  eq(env.swing().backendByTab.directional.length, 3, 'SCENARIO B: H2 adopts snapshot B\'s rows');
  ok(/swing-row-NVDA/.test(env.body()), 'SCENARIO B: the table finally shows B');
}

// ── SCENARIO C — same as B but the Swing tabs were never hydrated.
{
  const env = makeSwingEnv();
  const dCov = deferred();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: '2026-07-26T13:30:00.000Z' })));
  env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError('The operation was aborted.')), env.fetch.json(snapshotB));
  env.fetch.route('/scanner/coverage/status', env.fetch.deferred(dCov));

  const wHyd = watch(env.run('_swingHydrateFromBackend({ reason: "H" })'));
  await settle(); await settle(); await settle();
  eq(env.bss().snapshotError, 'The operation was aborted.', 'SCENARIO C: the hydration\'s snapshot read aborted');
  ok(env.bss().snapshot === null, 'SCENARIO C: nothing was ever committed at capture time');
  ok(wHyd.done === false, 'SCENARIO C: the hydration is parked on the pending coverage read');

  await env.run('bssFetchSnapshot()');            // an independent read succeeds meanwhile
  await settle();
  ok(env.bss().snapshot != null && env.bss().snapshot.candidates.length === 3 && env.bss().snapshotError === null,
     'SCENARIO C: the GLOBAL state now holds a perfectly valid snapshot B and no error');

  dCov.resolve(resolveWith({ ok: true }));
  await settle(); await settle(); await settle();
  ok(wHyd.done === true, 'SCENARIO C: the hydration resumes');
  eq(env.hyd().status, 'aborted', 'SCENARIO C: the verdict stays ABORTED even with a valid global snapshot available');
  eq(env.hyd().reason, 'The operation was aborted.', 'SCENARIO C: the hydration\'s own abort reason');
  eq(env.hyd().updatedAt, null, 'SCENARIO C: no previous successful hydration → updatedAt is null');
  eq(env.swing().backendByTab, { squeeze: [], rs: [], directional: [] },
     'SCENARIO C: the tabs stay empty — snapshot B is never mapped by a hydration that did not receive it');
  const cHtml = env.body();
  ok(cHtml.indexOf('The requests timed out / were aborted — retry shortly.') >= 0, 'SCENARIO C: the exact transient copy is shown');
  ok(!/RUN FULL SCAN/.test(cHtml), 'SCENARIO C: no "RUN FULL SCAN"');
  ok(!/last updated/.test(cHtml), 'SCENARIO C: no "last updated"');
  ok(!/swing-row-/.test(cHtml), 'SCENARIO C: no rows are invented from snapshot B');
  // And the next hydration adopts B normally.
  env.fetch.route('/scanner/coverage/status', env.fetch.json({ ok: true }));
  await env.run('_swingHydrateFromBackend({ reason: "H2" })');
  await settle();
  eq(env.hyd().status, 'ready', 'SCENARIO C: the next hydration adopts snapshot B normally');
  eq(env.swing().backendByTab.directional.length, 3, 'SCENARIO C: H2 populates the tabs from B');
}

// ───────────────────────────────────────────────────────────────────────────
section('7. FIRST-LOAD abort — no previous rows at all');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeSwingEnv();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: '2026-07-26T10:00:00.000Z' })));
  env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError('The operation timed out.')));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  await env.run('_swingHydrateFromBackend({ reason: "first_load" })');
  await settle();

  eq(env.hyd().status, 'aborted', 'FIRST LOAD: a timeout on the very first read is "aborted", not "empty"');
  eq(env.hyd().reason, 'The operation timed out.', 'FIRST LOAD: the exact timeout reason is preserved');
  eq(env.hyd().updatedAt, null, 'FIRST LOAD: updatedAt is null — no snapshot was ever received');
  eq(env.swing().backendByTab, { squeeze: [], rs: [], directional: [] }, 'FIRST LOAD: the empty tabs are left as they are');
  const html = env.body();
  ok(html.indexOf('The requests timed out / were aborted — retry shortly.') >= 0,
     'FIRST LOAD: shows exactly "The requests timed out / were aborted — retry shortly."');
  ok(!/RUN FULL SCAN/.test(html), 'FIRST LOAD: no "RUN FULL SCAN"');
  ok(!/last updated/.test(html), 'FIRST LOAD: no false "last updated" derived from the status just received');
  ok(!/Backend snapshot empty\/stale|NO_SNAPSHOT|Use RUN/.test(html), 'FIRST LOAD: never reported as empty/stale/NO_SNAPSHOT');
  eq([env.bss().snapshotPromise, env.bss().fetchingSnapshot], [null, false], 'FIRST LOAD: the reader is released, a retry is possible');
}

// ───────────────────────────────────────────────────────────────────────────
section('8. recovery after an abort');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeSwingEnv();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError()), env.fetch.json(okSnapshot({ updatedAt: '2026-07-26T14:00:00.000Z' })));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  await env.run('_swingHydrateFromBackend({ reason: "first_load" })');
  eq(env.hyd().status, 'aborted', 'RECOVERY: the first attempt aborted');
  eq([env.bss().statusPromise, env.bss().snapshotPromise, env.bss().coveragePromise], [null, null, null],
     'RECOVERY: all three Promise fields are null after the abort');
  eq([env.bss().fetchingStatus, env.bss().fetchingSnapshot, env.bss().fetchingCoverage], [false, false, false],
     'RECOVERY: all three fetching flags are false');

  const before = env.fetch.count('/scanner/snapshot');
  await env.run('_swingHydrateFromBackend({ reason: "retry" })');
  await settle();
  eq(env.fetch.count('/scanner/snapshot'), before + 1, 'RECOVERY: a new request really starts');
  eq(env.hyd().status, 'ready', 'RECOVERY: the hydration status returns to the normal success value');
  ok(env.hyd().reason == null, 'RECOVERY: the abort reason is gone');
  eq(env.hyd().updatedAt, '2026-07-26T14:00:00.000Z', 'RECOVERY: the normal refreshed timestamp is adopted');
  eq(env.swing().backendByTab.directional.length, 2, 'RECOVERY: the new snapshot replaces the preserved tabs');
  ok(/swing-row-AAPL/.test(env.body()), 'RECOVERY: rows render again');
  ok(env.body().indexOf('The requests timed out / were aborted — retry shortly.') < 0, 'RECOVERY: the abort copy disappears');
}

// ───────────────────────────────────────────────────────────────────────────
section('9. non-regression — valid empty / NO_SNAPSHOT / stale / hard failure / malformed');
// ───────────────────────────────────────────────────────────────────────────
async function hydrateWith(snapshotResponder, statusOver) {
  const env = makeSwingEnv();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus(statusOver)));
  env.fetch.route('/scanner/snapshot', snapshotResponder(env.fetch));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  await env.run('_swingHydrateFromBackend({ reason: "test" })');
  await settle();
  return env;
}
{
  const env = await hydrateWith((f) => f.json(okSnapshot({ candidates: [] })));
  eq(env.hyd().status, 'empty', 'VALID EMPTY: unchanged → status "empty"');
  eq(env.swing().backendByTab, { squeeze: [], rs: [], directional: [] }, 'VALID EMPTY: unchanged → tabs cleared as before');
  ok(/Backend snapshot empty\/stale/.test(env.body()) && /Use RUN FULL SCAN to rebuild\./.test(env.body()),
     'VALID EMPTY: unchanged copy, RUN FULL SCAN still offered');
}
{
  const env = await hydrateWith((f) => f.json({ ok: false, reason: 'NO_SNAPSHOT' }));
  eq(env.hyd().status, 'empty', 'NO_SNAPSHOT: unchanged → status "empty"');
  eq(env.hyd().reason, 'NO_SNAPSHOT', 'NO_SNAPSHOT: unchanged reason');
  eq(env.bss().snapshotError, null, 'NO_SNAPSHOT: it is an HTTP 200 body, not a transport error');
  ok(/Use RUN FULL SCAN to rebuild\./.test(env.body()), 'NO_SNAPSHOT: unchanged copy');
}
{
  const env = await hydrateWith((f) => f.json(okSnapshot({ stale: true })));
  eq(env.hyd().status, 'stale', 'STALE: unchanged → status "stale"');
  eq(env.swing().backendByTab.directional.length, 2, 'STALE: a stale snapshot still populates the tabs');
}
{
  const env = await hydrateWith((f) => f.status(500));
  eq(env.hyd().status, 'empty', 'HARD FAILURE (HTTP 500): unchanged → the existing "empty" branch');
  eq(env.hyd().reason, 'HTTP 500', 'HARD FAILURE: the reason is surfaced as before');
  ok(/Use RUN FULL SCAN to rebuild\./.test(env.body()), 'HARD FAILURE: still invites RUN FULL SCAN (unchanged)');
  ok(env.body().indexOf('The requests timed out / were aborted') < 0, 'HARD FAILURE: the transient copy is reserved for aborts only');
}
{
  const env = await hydrateWith((f) => f.reject(new TypeError('Failed to fetch')));
  eq(env.hyd().status, 'empty', 'UNCLASSIFIED NETWORK FAILURE: unchanged → "empty" (it is not an abort)');
  eq(env.hyd().reason, 'Failed to fetch', 'UNCLASSIFIED NETWORK FAILURE: reason preserved');
}
{
  const env = await hydrateWith((f) => f.json('not-an-object'));
  eq(env.hyd().status, 'empty', 'MALFORMED HTTP 200: unchanged → accepted as "empty" (measured, deliberately out of scope)');
  eq(env.bss().snapshot._empty, true, 'MALFORMED HTTP 200: the parser still marks it _empty');
}
// The Directional preview adapter reads bssState only and is entirely unaffected.
{
  const env = makeEnv({
    fns: BSS_CORE.concat(BDS_FNS).concat(['bdsGetBackendDirectionalSourceState']),
    S: { backendKey: 'k', scanData: { frontend: true }, swing: freshSwingState() },
  });
  // A BDSP-eligible candidate (usable + rankEligible + score + direction + cache + coverage).
  const bdspCandidate = (symbol, dir) => ({
    symbol,
    scoreDiagnostics: { usable: true, rankEligible: true, scorePreview: 80 },
    directionDiagnostics: { candidateDirection: dir, confidence: 0.7 },
    cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 500 },
    technicalCoverage: { completeCoreTechnicals: true },
  });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot({
    candidates: [bdspCandidate('AAPL', 'bullish'), bdspCandidate('MSFT', 'bearish')],
  })));
  const scanDataRef = env.sandbox.S.scanData;
  await env.run('Promise.all([bssFetchStatus(), bssFetchSnapshot()])');
  const rowsBefore = env.run('bdsDeriveBackendDirectionalRows(bssState().snapshot)');
  const stateBefore = env.run('bdsGetBackendDirectionalSourceState()');
  eq(rowsBefore.length, 2, 'BDSP: the adapter still derives its rows from bssState()');
  // A joined concurrent read changes nothing for BDSP.
  await env.run('Promise.all([bssFetchSnapshot(), bssFetchSnapshot(), bssFetchSnapshot()])');
  const rowsAfter = env.run('bdsDeriveBackendDirectionalRows(bssState().snapshot)');
  eq(rowsAfter.length, rowsBefore.length, 'BDSP: unchanged after concurrent joined reads');
  eq(env.run('bdsGetBackendDirectionalSourceState()').state, stateBefore.state, 'BDSP: source state unchanged');
  ok(env.sandbox.S.scanData === scanDataRef, 'BDSP: S.scanData reference untouched by the backend pipeline');
  eq(env.sandbox.S.scanData, { frontend: true }, 'BDSP: S.scanData contents untouched');
}

// ───────────────────────────────────────────────────────────────────────────
section('10. transport / polling / refresh invariants preserved');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'], S: { backendKey: 'k', swing: freshSwingState() } });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.fetch.route('/scanner/coverage/status', env.fetch.json({ ok: true }));
  await env.run('Promise.all([bssFetchStatus(), bssFetchSnapshot(), bssFetchCoverage()])');
  const byEp = (needle) => env.fetch.calls.find(c => c.url.indexOf(needle) >= 0);
  eq(byEp('/scanner/status').url, 'https://backend.test/scanner/status', 'TRANSPORT: status URL unchanged');
  eq(byEp('/scanner/snapshot').url, 'https://backend.test/scanner/snapshot', 'TRANSPORT: snapshot URL unchanged');
  eq(byEp('/scanner/coverage/status').url, 'https://backend.test/scanner/coverage/status', 'TRANSPORT: coverage URL unchanged');
  ['/scanner/status', '/scanner/snapshot', '/scanner/coverage/status'].forEach((ep) => {
    const c = byEp(ep);
    ok(c.options.method === undefined, 'TRANSPORT: ' + ep + ' uses the implicit GET verb');
    ok(c.options.body === undefined, 'TRANSPORT: ' + ep + ' sends no body');
    ok(c.options.cache === undefined, 'TRANSPORT: ' + ep + ' sets no cache mode');
    ok(c.options.headers && c.options.headers['x-api-key'] === 'k', 'TRANSPORT: ' + ep + ' uses _backendAuthHeaders()');
    ok(c.options.signal != null, 'TRANSPORT: ' + ep + ' carries its own AbortSignal.timeout');
  });
  const signals = ['/scanner/status', '/scanner/snapshot', '/scanner/coverage/status'].map(ep => byEp(ep).options.signal);
  ok(signals[0] !== signals[1] && signals[1] !== signals[2] && signals[0] !== signals[2],
     'TRANSPORT: the three reads use SEPARATE signals — no shared controller was introduced');
  ok(!env.fetch.calls.some(c => /\/scanner\/run/.test(c.url)), 'TRANSPORT: no POST /scanner/run anywhere');
}
// bssRefresh stays sync, returns undefined, fans out to status + snapshot only, and keeps
// its independent 1500ms button timeout even when it joins in-flight operations.
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'], S: { backendKey: 'k', swing: freshSwingState() } });
  const dS = deferred(), dP = deferred();
  env.fetch.route('/scanner/status', env.fetch.deferred(dS));
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dP));
  env.run('bssFetchStatus(); bssFetchSnapshot();');      // poll tick in flight
  await settle();
  const ret = env.run('bssRefresh()');
  ok(ret === undefined, 'REFRESH: bssRefresh() is still sync and returns undefined');
  eq([env.fetch.count('/scanner/status'), env.fetch.count('/scanner/snapshot')], [1, 1],
     'REFRESH: during an in-flight read it starts no second fetch — it attaches to the existing operations');
  eq(env.fetch.count('/scanner/coverage/status'), 0, 'REFRESH: bssRefresh never touches coverage');
  ok(env.dom.els['bss-refresh'].disabled === true, 'REFRESH: the button is disabled immediately');
  env.clock.tick(1500);
  ok(env.dom.els['bss-refresh'].disabled === false, 'REFRESH: the button re-enables after 1500ms, independently of completion (unchanged)');
  ok(env.bss().snapshot === null, 'REFRESH: the 1500ms re-enable is still decoupled from the request — deliberately out of scope');
  dS.resolve(resolveWith(okStatus())); dP.resolve(resolveWith(okSnapshot()));
  await settle(); await settle();
  eq(env.renders.length, 2, 'REFRESH: one render per endpoint operation — no extra render for the joined caller');
}
// Polling lifecycle: 60s interval, no duplicate timers, immediate mount fetch, clean stop.
{
  const env = makeEnv({ fns: BSS_CORE, S: { backendKey: 'k', swing: freshSwingState() } });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.run('bssStartPolling()');
  await settle(); await settle();
  eq(env.clock.intervals(), [60000], 'POLLING: the 60000ms interval is unchanged');
  eq([env.fetch.count('/scanner/status'), env.fetch.count('/scanner/snapshot')], [1, 1], 'POLLING: one immediate fetch per endpoint on mount');
  eq(env.fetch.count('/scanner/coverage/status'), 0, 'POLLING: coverage is not polled');
  env.run('bssStartPolling()');
  eq(env.clock.intervals(), [60000], 'POLLING: a second start stacks no duplicate timer');
  await settle(); await settle();
  eq(env.fetch.count('/scanner/snapshot'), 2,
     'POLLING: a repeated start still repeats the immediate mount fetch (measured, deliberately out of scope)');
  env.clock.tick(60000);
  await settle(); await settle();
  eq(env.fetch.count('/scanner/snapshot'), 3, 'POLLING: one tick → one snapshot read');
  env.run('bssStopPolling()');
  eq(env.clock.pending(), 0, 'POLLING: teardown clears the interval');
  env.run('bssStopPolling()');
  eq(env.clock.pending(), 0, 'POLLING: stop is idempotent');
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
console.log('ALL TESTS PASSED');

})().catch((e) => { console.error(e); process.exit(1); });
