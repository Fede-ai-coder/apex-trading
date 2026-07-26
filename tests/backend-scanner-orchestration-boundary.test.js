'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND SCANNER SNAPSHOT — ORCHESTRATION BOUNDARY CONTRACT (audit / pin only)
//
// WHY THIS FILE EXISTS
//   The read-only backend pipeline
//
//       GET /scanner/status  ─┐
//       GET /scanner/snapshot ┴→ S.backendScanner (bssState)
//                                 → bds* adapter  → BDSP preview
//                                 → _swingHydrateFromBackend → Swing tabs
//
//   is still fully inline in index.html. Before ANY of it is extracted into
//   js/services/*, this file pins the ORCHESTRATION that the existing suites do
//   not cover. The existing tests protect the PURE layer:
//
//     tests/backend-scanner-snapshot.test.js    → bss* pure helpers + parsers
//     tests/backend-directional-adapter.test.js → bds* pure row/summary adapter
//     tests/backend-directional-preview.test.js → bdsp* enable/render/escaping
//     tests/rs-vs-spy.test.js                   → RS scanner data sources
//
//   Nothing pins the moving parts: transport options, commit order, in-flight
//   dedup, abort/timeout handling, last-valid-snapshot preservation, polling
//   lifecycle, and the provenance of the operator-visible abort copy.
//
// THE OPERATIONAL CONDITION THIS PINS
//   Reported: the backend held hundreds of candidates while the Directional tab
//   showed
//       "Backend snapshot empty/stale — last updated … [The operation was
//        aborted.]. Use RUN FULL SCAN to rebuild."
//   §11 reconstructs that exact string end-to-end from real application source
//   and proves every hop of its provenance. This file MEASURES the behaviour —
//   it does not change it. No fix is attempted here.
//
// METHOD
//   • Application source is loaded ONLY through tests/lib/load-app-source.js.
//   • Real top-level `function` declarations are extracted verbatim and run in a
//     `vm` sandbox. No implementation is copied into this file.
//   • Fully offline: `fetch`, `document`, `localStorage`, `setInterval` /
//     `setTimeout` and the clock are test doubles. No real timers, no network.
//   • Concurrency is driven by explicit deferreds, never by wall-clock waits.
//   • Aborts use a real `DOMException(..., 'AbortError')` and a real aborted
//     `AbortController` signal reason.
//
// SEAMS (documented, deliberate)
//   `bssRender` is used both ways: §1-§10 install a RECORDING SEAM so render
//   ordering is observable, and §10 additionally executes the REAL `bssRender`
//   + `bssRenderHeadBadges` against a DOM double to prove the BSS→BDSP hop.
//
// Run: node tests/backend-scanner-orchestration-boundary.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const { loadAppJavaScriptSource, extractFunctionSource } = require('./lib/load-app-source');

const SRC = loadAppJavaScriptSource();

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

// Strips // and /* */ comments (string/template aware) so source-level guards
// inspect real CODE only — the module comments intentionally mention POST paths.
function stripComments(src) {
  let out = '', inS = null, esc = false, inLine = false, inBlock = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
    if (inS) {
      out += c;
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

function fn(name) { return extractFunctionSource(name, { source: SRC }); }

// ═════════════════════════════════════════════════════════════════════════════
// Test doubles
// ═════════════════════════════════════════════════════════════════════════════

function deferred() {
  const d = {};
  d.promise = new Promise((res, rej) => { d.resolve = res; d.reject = rej; });
  return d;
}

// A real AbortError, as produced by a fetch aborted through AbortSignal.
function realAbortError(message) {
  return new DOMException(message == null ? 'The operation was aborted.' : message, 'AbortError');
}
// The reason a genuinely-aborted AbortController carries in this runtime.
function realAbortedControllerReason() {
  const c = new AbortController();
  c.abort();
  return c.signal.reason;
}

// Controlled clock: setTimeout / setInterval / clear* + Date.now, driven by tick().
function makeClock(startMs) {
  let now = startMs == null ? 1700000000000 : startMs;
  let seq = 1;
  const timers = new Map();
  return {
    now: () => now,
    setAt: (t) => { now = t; },
    pending: () => timers.size,
    intervals: () => [...timers.values()].filter(t => t.repeat).map(t => t.every),
    timeouts: () => [...timers.values()].filter(t => !t.repeat).map(t => t.every),
    api: {
      setTimeout(cb, ms) { const id = seq++; timers.set(id, { cb, every: ms || 0, due: now + (ms || 0), repeat: false }); return id; },
      setInterval(cb, ms) { const id = seq++; timers.set(id, { cb, every: ms || 0, due: now + (ms || 0), repeat: true }); return id; },
      clearTimeout(id) { timers.delete(id); },
      clearInterval(id) { timers.delete(id); },
    },
    // Advance the clock, firing every timer whose deadline is reached.
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
      id, innerHTML: '', disabled: false, style: {}, scrollTop: 0,
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    };
  });
  return { els, getElementById(id) { return Object.prototype.hasOwnProperty.call(els, id) ? els[id] : null; } };
}

// Programmable fetch double. Routes are matched on URL substring; each route is
// a queue of responders consumed in order (the last one repeats).
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
  f.deferred = (d) => () => d.promise;
  f.urls = () => calls.map(c => c.url);
  f.count = (needle) => calls.filter(c => c.url.indexOf(needle) >= 0).length;
  return f;
}

// Builds a sandbox containing the REAL extracted functions plus doubles.
function makeEnv(opts) {
  const o = opts || {};
  const clock = makeClock(o.now);
  const fetchDouble = makeFetch();
  const dom = makeDom(o.domIds || []);
  const store = Object.assign({}, o.localStorage || {});
  const renders = [];      // recording render seam
  const bdspRenders = [];
  const logs = [];

  const sandbox = {
    console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    Date: new Proxy(Date, { construct: (T, a) => new T(...a), apply: () => clock.now(), get: (T, p) => (p === 'now' ? clock.now : T[p]) }),
    Math, JSON, Object, Array, String, Number, Boolean, isFinite, isNaN, Promise, Error, RegExp,
    DOMException, AbortController, AbortSignal, SyntaxError, TypeError,
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
    // Auth header helper is a separate already-extracted module (js/api/backend-client.js);
    // the double records what the pipeline asks for without pulling in auth state.
    _backendAuthHeaders: function (extra) {
      const h = Object.assign({}, extra || {});
      if (sandbox.S && sandbox.S.backendKey) h['x-api-key'] = sandbox.S.backendKey;
      return h;
    },
    escHtml: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    // Recording render seam (replaced by the REAL bssRender in §10).
    bssRender: function () { renders.push({ at: clock.now(), status: sandbox.S.backendScanner && sandbox.S.backendScanner.status, snapshot: sandbox.S.backendScanner && sandbox.S.backendScanner.snapshot }); },
    bdspRender: function () { bdspRenders.push(clock.now()); },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  (o.fns || []).forEach((name) => { vm.runInContext(fn(name), sandbox); });
  if (o.extra) vm.runInContext(o.extra, sandbox);

  return { sandbox, clock, fetch: fetchDouble, dom, store, renders, bdspRenders, logs,
           bss: () => sandbox.S.backendScanner,
           run: (code) => vm.runInContext(code, sandbox) };
}

// The BSS orchestration core: state + parsers + the two GET readers + refresh +
// polling. Pure formatting/rendering helpers are NOT loaded here (they are
// already pinned by tests/backend-scanner-snapshot.test.js).
const BSS_CORE = [
  'ffBackendScannerSnapshot', 'bssState',
  'bssParseStatus', 'bssParseSnapshot', 'bssIsNoSnapshot', 'bssFreshness',
  'bssFetchStatus', 'bssFetchSnapshot', 'bssFetchCoverage',
  'bssRefresh', 'bssStartPolling', 'bssStopPolling',
];

// Lets microtask chains inside the extracted async functions settle.
const settle = () => new Promise((r) => setImmediate(r));
// Advance the controlled clock and let the reads it triggers run to completion.
async function tickSettled(env, ms) { env.clock.tick(ms); await settle(); await settle(); }

function okSnapshot(over) {
  return Object.assign({
    ok: true, stale: false, ageMs: 30000, staleMs: 300000,
    updatedAt: '2026-07-26T10:00:00.000Z',
    candidates: [
      { symbol: 'AAPL', direction: 'bullish', scoreDiagnostics: { scorePreview: 80 }, directionDiagnostics: { d: 1 } },
      { symbol: 'MSFT', direction: 'bearish', scoreDiagnostics: { scorePreview: 70 }, directionDiagnostics: { d: 1 } },
    ],
    diagnostics: {},
  }, over || {});
}
function okStatus(over) {
  return Object.assign({ ok: true, schedulerEnabled: true, running: false, staleMs: 300000, lastSnapshotUpdatedAt: '2026-07-26T10:00:00.000Z' }, over || {});
}

// ═════════════════════════════════════════════════════════════════════════════
(async function main() {

// ───────────────────────────────────────────────────────────────────────────
section('1. symbol inventory — the real closure exists under the audited names');
// ───────────────────────────────────────────────────────────────────────────
const INVENTORY = [
  'ffBackendScannerSnapshot', 'bssState', 'bssFetchStatus', 'bssFetchSnapshot',
  'bssRefresh', 'bssStartPolling', 'bssStopPolling', 'bssInit', 'bssRender',
  'bdspRefresh', 'bdspRender', 'bdspMaybeRenderScannerResults',
  'bdsGetBackendDirectionalSourceState',
];
INVENTORY.forEach((name) => {
  let src = null;
  try { src = fn(name); } catch (e) { /* reported below */ }
  ok(src != null && src.indexOf('function ' + name + '(') >= 0, 'inventory: `' + name + '` is a real top-level function declaration');
});
// Names the brief listed as "eventual" — both turn out to exist.
ok(SRC.indexOf('function bssInit(') >= 0, 'inventory: `bssInit` EXISTS (mount/lifecycle entry point)');
ok(SRC.indexOf('function bssRender(') >= 0, 'inventory: `bssRender` EXISTS (single render seam)');
// A THIRD reader lives in the same closure and is NOT named in the brief.
ok(SRC.indexOf('async function bssFetchCoverage(') >= 0,
   'inventory: `bssFetchCoverage` EXISTS — a THIRD GET reader (/scanner/coverage/status) in the same closure');

// State shape is created by bssState() and is the single owner of the pipeline.
{
  const env = makeEnv({ fns: ['bssState'] });
  const st = env.run('bssState()');
  const keys = Object.keys(st).sort();
  eq(keys, ['coverage', 'coverageEndpointAbsent', 'coverageError', 'collapsed', 'fetchingCoverage',
            'fetchingSnapshot', 'fetchingStatus', 'lastCoverageAt', 'lastSnapshotAt', 'lastStatusAt',
            'snapshot', 'snapshotError', 'status', 'statusError', 'timerId'].sort(),
     'bssState() owns exactly the audited field set');
  ok(env.run('bssState() === bssState()'), 'bssState() is an idempotent singleton on S.backendScanner');
  ok(env.run('bssState() === S.backendScanner'), 'bssState() is stored on S.backendScanner (no private module state)');
  eq([st.status, st.snapshot, st.statusError, st.snapshotError, st.lastStatusAt, st.lastSnapshotAt, st.timerId],
     [null, null, null, null, null, null, null], 'initial state: no status/snapshot/error/timestamp/timer');
  eq([st.fetchingStatus, st.fetchingSnapshot, st.fetchingCoverage], [false, false, false], 'initial in-flight flags are false');
  ok(st.collapsed === true, 'panel starts collapsed');
}
// There is NO generation/request token and NO shared AbortController anywhere in
// the two readers — this is the measured fact the race sections build on.
{
  const code = stripComments(fn('bssFetchStatus') + '\n' + fn('bssFetchSnapshot') + '\n' + fn('bssRefresh'));
  ok(!/generation|_gen\b|reqId|requestId|token/i.test(code), 'MEASURED: no generation / request-token in the readers');
  ok(code.indexOf('new AbortController') < 0, 'MEASURED: no AbortController — abort is timeout-only');
  ok(!/\.abort\s*\(/.test(code), 'MEASURED: nothing ever calls .abort() — a previous request is never cancelled');
  ok(!/inFlight|_promise|pendingPromise/i.test(code), 'MEASURED: no shared in-flight Promise is stored or reused');
}

// ───────────────────────────────────────────────────────────────────────────
section('2. transport — exact GET contract for /scanner/status + /scanner/snapshot');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  await env.run('Promise.all([bssFetchStatus(), bssFetchSnapshot()])');

  const statusCall = env.fetch.calls.find(c => c.url.indexOf('/scanner/status') >= 0);
  const snapCall = env.fetch.calls.find(c => c.url.indexOf('/scanner/snapshot') >= 0);

  eq(statusCall.url, 'https://backend.test/scanner/status', 'status URL is BACKEND + "/scanner/status"');
  eq(snapCall.url, 'https://backend.test/scanner/snapshot', 'snapshot URL is BACKEND + "/scanner/snapshot"');
  ok(statusCall.options.method === undefined, 'status uses the default verb (GET) — no method option');
  ok(snapCall.options.method === undefined, 'snapshot uses the default verb (GET) — no method option');
  ok(statusCall.options.body === undefined && snapCall.options.body === undefined, 'neither reader sends a body');
  eq(statusCall.options.headers, { 'x-api-key': 'test-key-123' }, 'status sends _backendAuthHeaders() → x-api-key only');
  eq(snapCall.options.headers, { 'x-api-key': 'test-key-123' }, 'snapshot sends _backendAuthHeaders() → x-api-key only');
  ok(statusCall.options.cache === undefined, 'MEASURED: status sets NO `cache` mode (no no-store, unlike the RS/candle readers)');
  ok(snapCall.options.cache === undefined, 'MEASURED: snapshot sets NO `cache` mode');
  ok(statusCall.options.signal instanceof AbortSignal, 'status passes a real AbortSignal');
  ok(snapCall.options.signal instanceof AbortSignal, 'snapshot passes a real AbortSignal');
  ok(statusCall.options.signal !== snapCall.options.signal, 'MEASURED: the two reads use SEPARATE signals — no shared controller');
}
// Timeouts are literal AbortSignal.timeout values, asserted at source level so a
// silent retune is caught.
{
  const s = stripComments(fn('bssFetchStatus'));
  const p = stripComments(fn('bssFetchSnapshot'));
  const c = stripComments(fn('bssFetchCoverage'));
  ok(/AbortSignal\.timeout\(\s*8000\s*\)/.test(s), 'status timeout is AbortSignal.timeout(8000)');
  ok(/AbortSignal\.timeout\(\s*9000\s*\)/.test(p), 'snapshot timeout is AbortSignal.timeout(9000)');
  ok(/AbortSignal\.timeout\(\s*18000\s*\)/.test(c), 'coverage timeout is AbortSignal.timeout(18000) — deliberately more tolerant');
  ok(s.indexOf('await r.json()') >= 0 && p.indexOf('await r.json()') >= 0, 'both readers parse with r.json()');
  ok(/if\s*\(\s*!r\.ok\s*\)\s*throw new Error\('HTTP '/.test(s), "status maps non-2xx to throw new Error('HTTP ' + status)");
  ok(/if\s*\(\s*!r\.ok\s*\)\s*throw new Error\('HTTP '/.test(p), "snapshot maps non-2xx to throw new Error('HTTP ' + status)");
}
// Read-only guarantee across the WHOLE audited closure.
{
  const closure = stripComments([
    fn('bssFetchStatus'), fn('bssFetchSnapshot'), fn('bssFetchCoverage'),
    fn('bssRefresh'), fn('bssStartPolling'), fn('bssStopPolling'), fn('bssInit'), fn('bssRender'),
    fn('bdspRefresh'), fn('bdspRender'), fn('bdspRenderScannerResultsOverride'), fn('bdspMaybeRenderScannerResults'),
  ].join('\n'));
  ok(closure.indexOf('/scanner/run') < 0, 'closure CODE never references POST /scanner/run');
  ok(!/method\s*:\s*['"]POST['"]/.test(closure), 'closure issues no POST of any kind');
  ok(!/new WebSocket|subscribe-quotes|subscribeDxlink/.test(closure), 'closure opens no WebSocket / market-data subscription');
  const gets = (closure.match(/fetch\(/g) || []).length;
  eq(gets, 3, 'the closure performs exactly 3 fetch() calls (status, snapshot, coverage)');
}

// ───────────────────────────────────────────────────────────────────────────
section('3. refresh contract — call graph, return shape, ordering, non-atomicity');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  const dStatus = deferred(), dSnap = deferred();
  env.fetch.route('/scanner/status', env.fetch.deferred(dStatus));
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dSnap));

  const ret = env.run('bssRefresh()');
  ok(ret === undefined, 'MEASURED: bssRefresh() returns undefined — it is NOT awaitable and exposes no completion signal');
  eq(env.fetch.urls().map(u => u.split('/scanner/')[1]), ['status', 'snapshot'],
     'bssRefresh fires status FIRST, then snapshot — both started, neither awaited (parallel, not sequential)');
  ok(env.dom.els['bss-refresh'].disabled === true, 'refresh button is disabled immediately');
  eq(env.clock.timeouts(), [1500], 'button re-enable is a single 1500ms setTimeout');
  env.clock.tick(1500);
  ok(env.dom.els['bss-refresh'].disabled === false, 'button re-enables after 1500ms');
  ok(env.bss().status === null && env.bss().snapshot === null, 'MEASURED: the 1500ms re-enable is decoupled from request completion');

  // Snapshot lands FIRST, status second → commits are independent, not atomic.
  dSnap.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot()) });
  await settle(); await settle();
  ok(env.bss().snapshot != null && env.bss().status === null,
     'MEASURED: snapshot commits ALONE — status/snapshot are committed SEPARATELY, never atomically');
  eq(env.renders.length, 1, 'each reader renders independently → 1 render after the first landing');
  dStatus.resolve({ ok: true, status: 200, json: () => Promise.resolve(okStatus()) });
  await settle(); await settle();
  eq(env.renders.length, 2, 'MEASURED: one full refresh produces TWO renders (one per reader), not one coalesced render');
  ok(env.bss().status != null && env.bss().snapshot != null, 'both halves eventually present');
}
// Mutation order inside a single successful read.
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  const order = [];
  env.sandbox.bssRender = function () {
    const s = env.bss();
    order.push('render(fetching=' + s.fetchingSnapshot + ',snap=' + (s.snapshot ? 'set' : 'null') +
               ',err=' + (s.snapshotError === null ? 'null' : String(s.snapshotError)) +
               ',at=' + (s.lastSnapshotAt ? 'set' : 'null') + ')');
  };
  env.run('bssState().fetchingSnapshot');
  await env.run('bssFetchSnapshot()');
  eq(order, ['render(fetching=false,snap=set,err=null,at=set)'],
     'ORDER: guard → parse → snapshot → snapshotError=null → lastSnapshotAt → flag cleared → render (render sees the committed state)');
  const st = env.bss();
  ok(st.fetchingSnapshot === false, 'in-flight flag cleared in finally');
  ok(st.lastSnapshotAt === env.clock.now(), 'lastSnapshotAt stamped with Date.now() on success only');
}
// bssRefresh reads NOTHING and returns NOTHING — it is a pure fan-out.
{
  const body = stripComments(fn('bssRefresh'));
  ok(body.indexOf('bssFetchStatus()') >= 0 && body.indexOf('bssFetchSnapshot()') >= 0, 'bssRefresh call graph = bssFetchStatus + bssFetchSnapshot');
  ok(body.indexOf('bssFetchCoverage') < 0, 'MEASURED: bssRefresh does NOT refresh coverage (only _swingHydrateFromBackend does)');
  ok(body.indexOf('await') < 0 && !/return\s+[^;\s}]/.test(body), 'MEASURED: bssRefresh neither awaits nor returns a promise');
}

// ───────────────────────────────────────────────────────────────────────────
section('4. in-flight dedup — measured semantics: FIRST-STARTED wins, later DROPPED');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  const d1 = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(d1), env.fetch.json(okSnapshot({ updatedAt: 'SECOND' })));

  const pA = env.run('bssFetchSnapshot()');           // A starts, hangs
  await settle();
  eq(env.fetch.count('/scanner/snapshot'), 1, 'A issued one snapshot request');
  ok(env.bss().fetchingSnapshot === true, 'in-flight flag latched by A');

  const pB = env.run('bssFetchSnapshot()');           // B while A in flight
  const bResult = await pB;
  eq(env.fetch.count('/scanner/snapshot'), 1, 'MEASURED: B issued NO request — the LATER request is DROPPED, not queued and not aborted');
  ok(bResult === undefined, 'the dropped call resolves undefined — the caller cannot tell it was a no-op');
  eq(env.renders.length, 0, 'MEASURED: the dropped call does NOT render (early return precedes the try/finally)');

  d1.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot({ updatedAt: 'FIRST' })) });
  await pA; await settle();
  eq(env.bss().snapshot.updatedAt, 'FIRST', 'MEASURED semantics = LATEST-STARTED-LOSES / FIRST-STARTED-WINS (opposite of latest-request-wins)');
  eq(env.renders.length, 1, 'only the surviving request rendered');
}
// Consequence: a manual refresh during an in-flight poll is a silent no-op that
// still gives positive button feedback.
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  const dS = deferred(), dP = deferred();
  env.fetch.route('/scanner/status', env.fetch.deferred(dS));
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dP));
  env.run('bssFetchStatus(); bssFetchSnapshot();');   // poll tick in flight
  await settle();
  env.run('bssRefresh()');                            // user clicks Refresh
  await settle();
  eq([env.fetch.count('/scanner/status'), env.fetch.count('/scanner/snapshot')], [1, 1],
     'MEASURED: manual refresh during an in-flight poll issues ZERO new requests');
  ok(env.dom.els['bss-refresh'].disabled === true,
     'MEASURED: the button still shows "working" feedback for a refresh that did nothing (false affordance)');
  dS.resolve({ ok: true, status: 200, json: () => Promise.resolve(okStatus()) });
  dP.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot()) });
  await settle(); await settle();
}
// Status and snapshot dedup independently — one endpoint never blocks the other.
{
  const env = makeEnv({ fns: BSS_CORE });
  const dS = deferred();
  env.fetch.route('/scanner/status', env.fetch.deferred(dS));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.run('bssFetchStatus()');
  await settle();
  await env.run('bssFetchSnapshot()');
  ok(env.bss().snapshot != null, 'snapshot completes while status is still in flight — independent guards');
  ok(env.bss().status === null, 'status still pending — the two reads have no join point');
  dS.resolve({ ok: true, status: 200, json: () => Promise.resolve(okStatus()) });
  await settle();
}
// After a read settles the guard is released even on failure (no permanent lock).
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError()), env.fetch.json(okSnapshot()));
  await env.run('bssFetchSnapshot()');
  ok(env.bss().fetchingSnapshot === false, 'guard released after a rejected read');
  await env.run('bssFetchSnapshot()');
  ok(env.bss().snapshot != null, 'a subsequent read is allowed and succeeds — the guard never latches permanently');
}

// ───────────────────────────────────────────────────────────────────────────
section('5. race matrix — old vs new responses, and what a race can actually do here');
// ───────────────────────────────────────────────────────────────────────────
// R1: two refreshes back-to-back where the FIRST is still in flight.
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  const dA = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dA), env.fetch.json(okSnapshot({ updatedAt: 'B-NEW' })));
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.run('bssRefresh()');            // A
  await settle();
  env.run('bssRefresh()');            // B — dropped for snapshot
  await settle();
  dA.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot({ updatedAt: 'A-OLD' })) });
  await settle(); await settle();
  eq(env.bss().snapshot.updatedAt, 'A-OLD',
     'RACE R1: B never ran, so the OLD in-flight response is the committed one — staleness comes from DROPPING, not from overwriting');
}
// R2: sequential generations — a genuinely older response can NEVER land after a
// newer one, because the guard forbids overlap. Verified by construction.
{
  const env = makeEnv({ fns: BSS_CORE });
  const d1 = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(d1), env.fetch.json(okSnapshot({ updatedAt: 'GEN2' })));
  const p1 = env.run('bssFetchSnapshot()');
  await settle();
  d1.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot({ updatedAt: 'GEN1' })) });
  await p1; await settle();
  await env.run('bssFetchSnapshot()');
  eq(env.bss().snapshot.updatedAt, 'GEN2', 'RACE R2: generations are strictly serialised — no out-of-order commit is reachable per endpoint');
  ok(env.bss().fetchingSnapshot === false, 'guard consistent after serialised generations');
}
// R3: cross-endpoint interleave — status can commit between snapshot start/commit.
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  const dSnap = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dSnap));
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: 'FROM-STATUS' })));
  env.run('bssRefresh()');
  await settle(); await settle();
  ok(env.bss().status != null && env.bss().snapshot === null,
     'RACE R3: a status-only intermediate state is REACHABLE and renders — status is fresh while snapshot is still absent');
  eq(env.renders.length, 1, 'that intermediate half-state is rendered to the user');
  dSnap.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot()) });
  await settle(); await settle();
  eq(env.renders.length, 2, 'second render completes the pair');
}
// R4: abort of A while B is dropped — the pipeline ends with NO snapshot at all.
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  const dA = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dA), env.fetch.json(okSnapshot()));
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.run('bssRefresh()');
  await settle();
  env.run('bssRefresh()');            // dropped
  await settle();
  dA.reject(realAbortError());
  await settle(); await settle();
  ok(env.bss().snapshot === null, 'RACE R4: A aborted and B was dropped → first load ends with NO snapshot even though two refreshes were requested');
  eq(env.bss().snapshotError, 'The operation was aborted.', 'RACE R4: snapshotError carries the abort message');
  ok(env.bss().status != null, 'RACE R4: status still succeeded → the classic "status fresh, snapshot missing" shape');
}
// R5: polling tick and manual refresh started in the same turn.
{
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.run('bssStartPolling(); bssRefresh();');
  await settle(); await settle(); await settle();
  eq([env.fetch.count('/scanner/status'), env.fetch.count('/scanner/snapshot')], [1, 1],
     'RACE R5: simultaneous poll-mount + manual refresh collapse to ONE request per endpoint (dedup absorbs the overlap)');
  env.run('bssStopPolling()');
}

// ───────────────────────────────────────────────────────────────────────────
section('6. preservation of the last valid snapshot — the central contract');
// ───────────────────────────────────────────────────────────────────────────
// Seed a good snapshot, then fail the next read in every distinct way.
async function seedThenFail(responder) {
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()), responder);
  await env.run('bssFetchSnapshot()');
  const before = env.bss().snapshot;
  const beforeAt = env.bss().lastSnapshotAt;
  env.clock.setAt(env.clock.now() + 60000);
  await env.run('bssFetchSnapshot()');
  await settle();
  return { env, before, beforeAt, after: env.bss().snapshot, st: env.bss() };
}
const PRESERVING = [
  ['client abort (AbortError)', makeFetch().reject(realAbortError()), 'The operation was aborted.'],
  ['aborted-controller reason', makeFetch().reject(realAbortedControllerReason()), 'This operation was aborted'],
  ['HTTP 500', makeFetch().status(500), 'HTTP 500'],
  ['HTTP 401', makeFetch().status(401), 'HTTP 401'],
  ['network reject (TypeError)', makeFetch().reject(new TypeError('Failed to fetch')), 'Failed to fetch'],
  ['malformed body (json() rejects)', makeFetch().badJson(), 'Unexpected token < in JSON'],
];
for (const [label, responder, expectedErr] of PRESERVING) {
  const r = await seedThenFail(responder);
  ok(r.after === r.before, 'PRESERVED on ' + label + ': st.snapshot is the SAME object — the last valid snapshot survives');
  // Null-safe on purpose: if a future change starts wiping the snapshot, every
  // assertion below must REPORT rather than crash the run.
  eq(r.after && r.after.candidates ? r.after.candidates.length : null, 2, 'PRESERVED on ' + label + ': candidates are NOT zeroed');
  eq(r.st.snapshotError, expectedErr, 'PRESERVED on ' + label + ': only snapshotError is written');
  eq(r.st.lastSnapshotAt, r.beforeAt, 'PRESERVED on ' + label + ': lastSnapshotAt is NOT advanced (age keeps growing honestly)');
  ok(r.st.snapshot != null && r.st.snapshot.stale === false, 'PRESERVED on ' + label + ': the failure does NOT mark the surviving snapshot stale');
}
// The two paths that DO replace a valid snapshot — HTTP 200 bodies.
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()), env.fetch.json({ ok: false, reason: 'NO_SNAPSHOT' }));
  await env.run('bssFetchSnapshot()');
  eq(env.bss().snapshot.candidates.length, 2, 'seeded with 2 candidates');
  await env.run('bssFetchSnapshot()');
  ok(env.bss().snapshot.ok === false && env.bss().snapshot.noSnapshot === true,
     'REPLACED: an HTTP-200 NO_SNAPSHOT body OVERWRITES a previously valid snapshot');
  eq(env.bss().snapshot.candidates, [], 'REPLACED: candidates are zeroed by NO_SNAPSHOT');
  eq(env.bss().snapshotError, null, 'REPLACED: snapshotError is CLEARED — NO_SNAPSHOT is a success at transport level');
}
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()), env.fetch.json('not-an-object'));
  await env.run('bssFetchSnapshot()');
  await env.run('bssFetchSnapshot()');
  ok(env.bss().snapshot._empty === true && env.bss().snapshot.ok === false,
     'ASYMMETRY: a 200 with a NON-OBJECT body replaces a valid snapshot with the empty shape…');
  eq(env.bss().snapshotError, null, '…and clears snapshotError, so nothing reports the corruption');
  eq(env.bss().snapshot.candidates, [], 'ASYMMETRY: candidates zeroed by a malformed 200 body');
}
// Status side behaves identically.
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()), env.fetch.reject(realAbortError()));
  await env.run('bssFetchStatus()');
  const before = env.bss().status;
  await env.run('bssFetchStatus()');
  ok(env.bss().status === before, 'PRESERVED: an aborted status read keeps the previous parsed status');
  eq(env.bss().statusError, 'The operation was aborted.', 'status abort writes statusError only');
}
// Coverage is the ONE reader that behaves differently — it WIPES on failure.
{
  const env = makeEnv({ fns: BSS_CORE, S: { backendKey: 'k', swing: {} } });
  env.fetch.route('/scanner/coverage/status', env.fetch.json({ ok: true, universe: { total: 500 } }), env.fetch.reject(realAbortError()));
  await env.run('bssFetchCoverage()');
  ok(env.bss().coverage != null, 'coverage seeded');
  ok(env.sandbox.S.swing.lastGoodCoverageStatus != null, 'coverage keeps an explicit last-known-good cache on S.swing');
  await env.run('bssFetchCoverage()');
  ok(env.bss().coverage === null,
     'INCONSISTENCY (measured, not fixed): bssFetchCoverage NULLS st.coverage on abort while status/snapshot PRESERVE theirs');
  ok(env.sandbox.S.swing.lastGoodCoverageStatus != null, 'coverage compensates with a separate last-known-good cache that status/snapshot do NOT have');
}
{
  const env = makeEnv({ fns: BSS_CORE, S: { backendKey: 'k', swing: {} } });
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404), env.fetch.json({ ok: true }));
  await env.run('bssFetchCoverage()');
  ok(env.bss().coverageEndpointAbsent === true, 'a 404 latches coverageEndpointAbsent');
  await env.run('bssFetchCoverage()');
  eq(env.fetch.count('/scanner/coverage/status'), 1, 'the 404 latch permanently stops re-fetching the missing endpoint');
}

// ───────────────────────────────────────────────────────────────────────────
section('7. freshness — the states the UI must be able to tell apart');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ fns: ['bssParseSnapshot', 'bssIsNoSnapshot', 'bssFreshness'] });
  const f = (raw) => env.run('bssFreshness(bssParseSnapshot(' + JSON.stringify(raw) + '))');
  eq(f({ ok: true, stale: false }).state, 'fresh', 'explicit stale:false → fresh');
  eq(f({ ok: true, stale: true }).state, 'stale', 'explicit stale:true → stale (wins over ageMs)');
  eq(f({ ok: true, stale: true, ageMs: 1, staleMs: 999999 }).state, 'stale', 'explicit stale flag beats the age computation');
  eq(f({ ok: true, ageMs: 400000, staleMs: 300000 }).state, 'stale', 'ageMs > staleMs → stale');
  eq(f({ ok: true, ageMs: 300000, staleMs: 300000 }).state, 'fresh', 'BOUNDARY: ageMs === staleMs → FRESH (strict >)');
  eq(f({ ok: true, ageMs: 299999, staleMs: 300000 }).state, 'fresh', 'just under the threshold → fresh');
  eq(f({ ok: true }).state, 'unknown', 'no stale flag and no ages → "unknown", distinct from stale');
  eq(f({ ok: true, updatedAt: null }).state, 'unknown', 'snapshot without timestamp → unknown, never "stale"');
  eq(f({ ok: true, ageMs: 'nope', staleMs: 300000 }).state, 'unknown', 'invalid ageMs type → unknown (no NaN comparison leak)');
  eq(f({ ok: false, reason: 'NO_SNAPSHOT' }).state, 'none', 'NO_SNAPSHOT → "none"');
  eq(f(null).state, 'none', 'absent payload → "none"');
  eq(env.run('bssFreshness(null).state'), 'none', 'null snapshot → "none"');
  // Five operator-distinguishable conditions must not collapse into one another.
  const distinct = {
    unavailable: env.run('bssParseSnapshot(null)'),
    noSnapshot: env.run('bssParseSnapshot({ok:false,reason:"NO_SNAPSHOT"})'),
    validEmpty: env.run('bssParseSnapshot({ok:true,stale:false,candidates:[]})'),
    validStale: env.run('bssParseSnapshot({ok:true,stale:true,candidates:[{symbol:"A"}]})'),
  };
  ok(distinct.unavailable._empty === true && distinct.unavailable.noSnapshot === false, 'unavailable ≠ NO_SNAPSHOT (_empty distinguishes them)');
  ok(distinct.noSnapshot.noSnapshot === true, 'NO_SNAPSHOT is explicitly flagged');
  ok(distinct.validEmpty.ok === true && distinct.validEmpty.candidates.length === 0, 'valid-but-empty keeps ok:true (≠ unavailable)');
  ok(distinct.validStale.ok === true && distinct.validStale.stale === true && distinct.validStale.candidates.length === 1,
     'valid-but-stale keeps its candidates (stale ≠ empty)');
  ok(env.run('bssIsNoSnapshot(bssParseSnapshot({ok:true,stale:false,candidates:[]}))') === false,
     'a valid EMPTY snapshot is NOT reported as NO_SNAPSHOT');
}
// Status-fresh / snapshot-stale (and vice versa) are tracked on independent fields.
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: 'NOW' })));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot({ stale: true })));
  await env.run('Promise.all([bssFetchStatus(), bssFetchSnapshot()])');
  ok(env.bss().status.lastSnapshotUpdatedAt === 'NOW' && env.bss().snapshot.stale === true,
     'MEASURED: a FRESH status and a STALE snapshot coexist — no reconciliation, no cross-check');
  eq(env.bss().lastStatusAt, env.bss().lastSnapshotAt, 'both client-side stamps use the same Date.now() source');
}

// ───────────────────────────────────────────────────────────────────────────
section('8. polling lifecycle — interval, duplicates, gates, teardown');
// ───────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.run('bssStartPolling()');
  await settle(); await settle();
  eq(env.clock.intervals(), [60000], 'polling interval is exactly 60000ms');
  eq([env.fetch.count('/scanner/status'), env.fetch.count('/scanner/snapshot')], [1, 1],
     'bssStartPolling fetches ONCE immediately on mount (in addition to arming the timer)');
  env.run('bssStartPolling(); bssStartPolling();');
  await settle(); await settle();
  eq(env.clock.intervals(), [60000], 'repeated bssStartPolling never stacks a second interval (timerId guard)');
  eq(env.fetch.count('/scanner/snapshot'), 2,
     'MEASURED: the timerId guard protects only the TIMER — the unconditional mount fetch still re-runs on every bssStartPolling ' +
     '(the 2nd and 3rd calls landed in one turn, so the in-flight guard collapsed them to a single extra read)');
  await tickSettled(env, 60000);
  eq(env.fetch.count('/scanner/snapshot'), 3, 'one tick → one snapshot read');
  await tickSettled(env, 60000);
  await tickSettled(env, 60000);
  await tickSettled(env, 60000);
  eq(env.fetch.count('/scanner/snapshot'), 6, 'three more ticks → three more reads (no drift, no catch-up burst)');
  const before = env.fetch.count('/scanner/snapshot');
  env.run('bssStopPolling()');
  eq(env.clock.pending(), 0, 'bssStopPolling clears the interval — ZERO pending timers after teardown');
  ok(env.bss().timerId === null, 'timerId is nulled so a later start can re-arm');
  await tickSettled(env, 600000);
  eq(env.fetch.count('/scanner/snapshot'), before, 'no request fires after teardown');
  env.run('bssStopPolling()');
  ok(env.bss().timerId === null, 'bssStopPolling is idempotent');
}
// Feature-flag and active-view gates.
{
  const off = makeEnv({ fns: BSS_CORE, localStorage: { apex_ff_backend_scanner_snapshot: '0' } });
  off.run('bssStartPolling()');
  eq(off.clock.pending(), 0, 'FF off → no timer armed');
  eq(off.fetch.calls.length, 0, 'FF off → no immediate fetch either');

  const away = makeEnv({ fns: BSS_CORE, activeView: 'portfolio' });
  away.run('bssStartPolling()');
  eq(away.clock.pending(), 0, 'active view ≠ dashboard → no timer armed');
  eq(away.fetch.calls.length, 0, 'active view ≠ dashboard → no immediate fetch');
}
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.run('bssStartPolling()');
  await settle(); await settle();
  env.sandbox._activeView = 'swing';               // user leaves the dashboard
  await tickSettled(env, 60000);
  eq(env.fetch.count('/scanner/snapshot'), 1, 'a tick outside the dashboard performs no read');
  eq(env.clock.pending(), 0, 'MEASURED: the tick SELF-STOPS the interval when the view changed (no orphan timer)');
  ok(env.bss().timerId === null, 'timerId cleared by the self-stop path');
}
// Re-opening the panel after a teardown re-arms exactly one timer.
{
  const env = makeEnv({ fns: BSS_CORE });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  env.run('bssStartPolling()'); await settle(); await settle();
  env.run('bssStopPolling()');
  env.run('bssStartPolling()'); await settle(); await settle();
  eq(env.clock.intervals(), [60000], 'panel reopen → exactly one interval');
  eq(env.fetch.count('/scanner/snapshot'), 2, 'reopen refetches once (mount fetch)');
  env.run('bssStopPolling()');
}
// Teardown while a request is in flight: the response still commits and renders.
{
  const env = makeEnv({ fns: BSS_CORE });
  const d = deferred();
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(d));
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.run('bssStartPolling()');
  await settle();
  env.run('bssStopPolling()');
  eq(env.clock.pending(), 0, 'timer gone at teardown');
  d.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot({ updatedAt: 'AFTER-TEARDOWN' })) });
  await settle(); await settle();
  eq(env.bss().snapshot.updatedAt, 'AFTER-TEARDOWN',
     'MEASURED: teardown does NOT abort an in-flight read — it still commits and renders after stop (no cancellation ownership)');
  ok(env.renders.length > 0, 'the post-teardown response still triggers a render');
}

// ───────────────────────────────────────────────────────────────────────────
section('9. status × snapshot matrix — measured end state for every combination');
// ───────────────────────────────────────────────────────────────────────────
async function matrix(statusResponder, snapResponder, seed) {
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  if (seed) {
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
    await env.run('Promise.all([bssFetchStatus(), bssFetchSnapshot()])');
    env.clock.setAt(env.clock.now() + 60000);
  }
  env.fetch.route('/scanner/status', statusResponder);
  env.fetch.route('/scanner/snapshot', snapResponder);
  env.run('bssRefresh()');
  await settle(); await settle(); await settle();
  const st = env.bss();
  return {
    env, st,
    shape: {
      status: st.status ? 'set' : 'null',
      snapshot: st.snapshot ? (st.snapshot.ok === true ? 'ok' : (st.snapshot.noSnapshot ? 'no_snapshot' : 'not_ok')) : 'null',
      candidates: st.snapshot && Array.isArray(st.snapshot.candidates) ? st.snapshot.candidates.length : null,
      statusError: st.statusError, snapshotError: st.snapshotError,
      renders: env.renders.length,
    },
  };
}
const F = makeFetch();
{
  const r = await matrix(F.json(okStatus()), F.json(okSnapshot()));
  eq(r.shape, { status: 'set', snapshot: 'ok', candidates: 2, statusError: null, snapshotError: null, renders: 2 }, 'M1  success × fresh success → normal state, 2 renders');
}
{
  const r = await matrix(F.json(okStatus()), F.json(okSnapshot({ stale: true })));
  ok(r.st.snapshot.ok === true && r.st.snapshot.stale === true && r.st.snapshot.candidates.length === 2, 'M2  success × stale success → stale but candidates INTACT');
}
{
  const r = await matrix(F.json(okStatus()), F.json({ ok: false, reason: 'NO_SNAPSHOT' }));
  eq(r.shape.snapshot, 'no_snapshot', 'M3  success × NO_SNAPSHOT → no_snapshot, no error');
  eq(r.shape.snapshotError, null, 'M3  NO_SNAPSHOT is not an error condition');
}
{
  const r = await matrix(F.json(okStatus()), F.json(okSnapshot({ candidates: [] })));
  eq(r.shape.snapshot, 'ok', 'M4  success × empty candidates → a VALID snapshot that happens to be empty');
  eq(r.shape.candidates, 0, 'M4  candidate count is 0, ok stays true');
}
{
  const r = await matrix(F.json(okStatus()), F.status(500));
  eq(r.shape, { status: 'set', snapshot: 'null', candidates: null, statusError: null, snapshotError: 'HTTP 500', renders: 2 }, 'M5  success × HTTP error → PARTIAL commit: status kept, snapshot absent');
}
{
  const r = await matrix(F.status(503), F.json(okSnapshot()));
  eq(r.shape.snapshot, 'ok', 'M6  HTTP error × success → the snapshot IS still used; a status failure does not veto it');
  eq(r.shape.statusError, 'HTTP 503', 'M6  statusError recorded independently');
  eq(r.shape.candidates, 2, 'M6  candidates survive a status failure');
}
{
  const r = await matrix(F.status(500), F.status(500));
  eq(r.shape, { status: 'null', snapshot: 'null', candidates: null, statusError: 'HTTP 500', snapshotError: 'HTTP 500', renders: 2 }, 'M7  HTTP error × HTTP error → total error, still 2 renders');
}
{
  const r = await matrix(F.reject(realAbortError()), F.json(okSnapshot()));
  eq(r.shape.snapshot, 'ok', 'M8  abort × success → PARTIAL COMMIT: the snapshot half commits normally');
  eq(r.shape.statusError, 'The operation was aborted.', 'M8  only the status half records the abort');
}
{
  const r = await matrix(F.json(okStatus()), F.reject(realAbortError()), true);
  eq(r.shape.snapshot, 'ok', 'M9  success × abort (with a previously valid snapshot) → PREVIOUS SNAPSHOT PRESERVED');
  eq(r.shape.candidates, 2, 'M9  candidates preserved through the abort');
  eq(r.shape.snapshotError, 'The operation was aborted.', 'M9  snapshotError set alongside the preserved snapshot');
}
{
  const r = await matrix(F.json(okStatus()), F.reject(realAbortError()));
  eq(r.shape.snapshot, 'null', 'M10 success × abort on FIRST LOAD → no snapshot at all (nothing to preserve)');
  eq(r.shape.statusError, null, 'M10 status still fresh — this is the reported production shape');
}
{
  const r = await matrix(F.json('garbage'), F.json(okSnapshot()));
  ok(r.st.status._empty === true && r.st.status.ok === false, 'M11 malformed status × success → status degrades to the empty shape without throwing');
  eq(r.shape.snapshot, 'ok', 'M11 a malformed status never blocks the snapshot');
  eq(r.shape.statusError, null, 'M11 MEASURED: a malformed 200 body sets NO error — it is silently accepted');
}
{
  const r = await matrix(F.badJson(), F.badJson());
  eq(r.shape.status, 'null', 'M12 unparseable × unparseable → nothing committed');
  ok(/Unexpected token/.test(String(r.shape.snapshotError)), 'M12 JSON parse failure surfaces as an error string');
}

// ───────────────────────────────────────────────────────────────────────────
section('10. BDSP integration — reads bssState only, delegates refresh, never fetches');
// ───────────────────────────────────────────────────────────────────────────
// The REAL bssRender executed against a DOM double: proves the BSS→BDSP hop.
{
  const env = makeEnv({
    fns: ['ffBackendScannerSnapshot', 'bssState', 'bssParseStatus', 'bssParseSnapshot', 'bssIsNoSnapshot',
          'bssFreshness', 'bssFmtAgeMs', 'bssBadge', 'bssRenderHeadBadges', 'bssRender',
          'bssFetchStatus', 'bssFetchSnapshot'],
    domIds: ['bss-panel', 'bss-head-badges'],
  });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  await env.run('Promise.all([bssFetchStatus(), bssFetchSnapshot()])');
  eq(env.bdspRenders.length, 2, 'REAL bssRender delegates to bdspRender on EVERY commit (once per reader)');
  ok(env.dom.els['bss-head-badges'].innerHTML.indexOf('2 cand') >= 0, 'REAL bssRender renders the live candidate count from bssState');
  ok(env.dom.els['bss-head-badges'].innerHTML.indexOf('FRESH') >= 0, 'REAL bssRender renders freshness from the committed snapshot');
}
{
  const env = makeEnv({
    fns: ['ffBackendScannerSnapshot', 'bssState', 'bssRender'],
    domIds: [], localStorage: { apex_ff_backend_scanner_snapshot: '0' },
  });
  env.run('bssRender()');
  eq(env.bdspRenders.length, 0, 'REAL bssRender is FF-gated before it reaches bdspRender');
}
// Source-level ownership of the BDSP layer.
{
  const bdspClosure = stripComments([
    fn('bdspState'), fn('bdspRefresh'), fn('bdspRender'), fn('bdspGetRowsForScannerResults'),
    fn('bdspRenderScannerResultsOverride'), fn('bdspMaybeRenderScannerResults'),
    fn('bdspRenderBackendResultEmptyState'), fn('bdspIsScannerSourceActive'),
  ].join('\n'));
  ok(bdspClosure.indexOf('fetch(') < 0, 'BDSP performs NO fetch of its own');
  ok(bdspClosure.indexOf('/scanner/') < 0, 'BDSP references no backend endpoint');
  ok(bdspClosure.indexOf('bssRefresh()') >= 0, 'bdspRefresh DELEGATES to bssRefresh — one refresh lifecycle, not two');
  ok(!/new WebSocket|subscribe/.test(bdspClosure), 'BDSP opens no subscription / WebSocket');
  ok(bdspClosure.indexOf('bssState()') >= 0, 'BDSP reads bssState() as its only data source');
  ok(!/S\.scanData\s*=/.test(bdspClosure), 'BDSP never ASSIGNS S.scanData');
  ok(!/S\.backendScanner\s*\.\s*\w+\s*=/.test(bdspClosure) && !/bssState\(\)\s*\.\s*\w+\s*=/.test(bdspClosure),
     'BDSP never writes back into bssState — read-only consumer');
  ok(bdspClosure.indexOf('RUN FULL SCAN') < 0,
     'KEY: the BDSP layer NEVER emits "RUN FULL SCAN" — its unavailable copy is "switch back to Frontend Scanner or wait for scheduler"');
}
// BDSP distinguishes "snapshot not ok" from "valid but zero candidates"…
{
  const env = makeEnv({
    fns: ['bdsGetBackendDirectionalSourceState', '_bdsBoolOrNull', '_bdsNum', '_bdsStrOrNull'],
  });
  const call = (snap, status) => env.run('bdsGetBackendDirectionalSourceState(' + JSON.stringify(snap) + ',' + JSON.stringify(status) + ')');
  eq(call(null, null).reason, 'no_snapshot', 'BDSP reason: absent snapshot → no_snapshot');
  eq(call({ ok: false, reason: 'NO_SNAPSHOT', candidates: [] }, null).reason, 'snapshot_not_ok', 'BDSP reason: NO_SNAPSHOT → snapshot_not_ok (distinct from no_candidates)');
  eq(call({ ok: true, candidates: [] }, null).reason, 'no_candidates', 'BDSP reason: valid-but-empty → no_candidates (distinct from snapshot_not_ok)');
  const withCands = { ok: true, candidates: [{ symbol: 'A', scoreDiagnostics: {}, directionDiagnostics: {} }] };
  eq(call(withCands, null).available, true, 'BDSP available with diagnostics-complete candidates');
  eq(call(withCands, { snapshotError: 'The operation was aborted.' }).reason, 'status_error',
     'MEASURED: a stale snapshotError on the status object flips a fully-populated snapshot to reason "status_error"');
  eq(call(withCands, { snapshotError: 'The operation was aborted.' }).available, false,
     'MEASURED: …and marks the backend UNAVAILABLE even though the candidates are present and ok');
  eq(call({ ok: true, stale: true, candidates: withCands.candidates }, null).stale, true, 'BDSP surfaces stale without discarding rows');
}
// …but the source state passed in production is bssState(), whose `status` is a
// PARSED status object that never carries snapshotError — measure the real wiring.
{
  const src = stripComments(fn('bdspGetRowsForScannerResults'));
  ok(/status\s*=\s*state\s*&&\s*typeof state\s*===\s*'object'\s*\?\s*state\.status/.test(src.replace(/\s+/g, ' ')),
     'MEASURED: BDSP passes bssState().status (the PARSED payload), not bssState() itself');
  ok(stripComments(fn('bssParseStatus')).indexOf('snapshotError') < 0,
     'MEASURED: the parsed status has no snapshotError field → the status_error branch above is UNREACHABLE from the BDSP wiring');
}
// bdspRefresh call graph and S.scanData immutability under a full refresh.
{
  const env = makeEnv({
    fns: BSS_CORE.concat(['bdspState', 'bdspIsEnabled', 'bdspRefresh']),
    domIds: ['bss-refresh'],
    S: { backendKey: 'k', scanData: { frontend: true } },
  });
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  const scanDataBefore = env.sandbox.S.scanData;
  env.run('bdspRefresh()');
  await settle(); await settle();
  eq([env.fetch.count('/scanner/status'), env.fetch.count('/scanner/snapshot')], [1, 1],
     'bdspRefresh issues exactly the two GETs via bssRefresh — no third request, no POST');
  ok(env.sandbox.S.scanData === scanDataBefore, 'S.scanData reference is UNTOUCHED by a backend refresh');
  eq(env.sandbox.S.scanData, { frontend: true }, 'S.scanData contents unchanged');
  // Here `bssRender` is the recording seam, so the BSS→BDSP hop is not re-counted:
  // the single render observed is bdspRefresh's OWN direct call, fired synchronously
  // BEFORE either GET has resolved.
  eq(env.bdspRenders.length, 1,
     'MEASURED: bdspRefresh renders EAGERLY (synchronously, on the pre-refresh state) and never awaits the reads it triggered');
}

// ───────────────────────────────────────────────────────────────────────────
section('11. PROVENANCE of "The operation was aborted." — end-to-end, real source');
// ───────────────────────────────────────────────────────────────────────────
// The reported string is NOT built by BSS and NOT by BDSP. It is assembled by the
// SWING hydration layer, which is a THIRD consumer of the same two GETs. This
// section reconstructs the full chain from real application source.
{
  ok(stripComments(fn('bssFetchSnapshot')).indexOf('RUN FULL SCAN') < 0, 'HOP 0: the BSS reader contains no "RUN FULL SCAN" copy');
  ok(stripComments(fn('bdspRenderBackendResultEmptyState')).indexOf('RUN FULL SCAN') < 0, 'HOP 0: the BDSP empty state contains no "RUN FULL SCAN" copy');
  ok(stripComments(fn('_swingRenderTable')).indexOf('Use RUN FULL SCAN to rebuild.') >= 0,
     'HOP 0: the string lives in _swingRenderTable — the SWING table, not the BSS panel and not the BDSP preview');
}
{
  const S = {
    backendKey: 'k',
    swing: { active: true, activeTab: 'directional', candidates: [], candidatesByTab: { squeeze: [], rs: [], directional: [] },
             backendByTab: { squeeze: [], rs: [], directional: [] }, candidateScope: 'window', sort: null, status: { byTab: {} } },
  };
  const env = makeEnv({
    fns: BSS_CORE.concat([
      '_swingMapSnapshotToTabs', '_swingSnapshotCandidatesForDisplay', '_swingNormDir', '_swingResolveDirectionRaw',
      '_swingSnapshotRsValue', '_swingSnapshotHasSqueezeDiagnostics', '_swingSnapshotHasSqueezeField',
      '_swingSnapshotSqueezeOperational', '_swingBackendSqueezeAvailable', '_swingTabCandidates', '_swingTabCandidatesRaw',
      '_swingScannerLabel', '_swingOtherTabsHint', '_swingNonEmptyOtherTabLabels',
      '_swingHydrateFromBackend', '_swingRenderTable',
    ]),
    domIds: ['swing-tbl-body'],
    S,
    // Collaborators outside the audited boundary, as declared doubles.
    extra: [
      'var SWING_HYDRATE_RETRY_MS = 700, SWING_HYDRATE_MAX_RETRIES = 8;',
      'function _backendCandleGateOpen(){ return true; }',
      'function _backendCandleGateReason(){ return "ready"; }',
      'function _swingFilterCandidates(c){ return c || []; }',
      'function _swingSortCandidates(c){ return c || []; }',
      'function _swingSortArrow(){ return ""; }',
      'function _swingFmtWhen(x){ return x ? "10:00:00" : null; }',
      'function _swingAdoptHydratedTab(){}',
      'function _swingRenderCoverage(){}',
      'function _swingRenderTabBadges(){}',
      'function _swingLogCoveragePaths(){}',
      'function _swingSetTab(){}',
    ].join('\n'),
  });
  // Production shape: /scanner/status succeeds (so an updatedAt exists), the
  // snapshot read is aborted by its 9s timeout.
  env.fetch.route('/scanner/status', env.fetch.json(okStatus({ lastSnapshotUpdatedAt: '2026-07-26T10:00:00.000Z' })));
  env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError('The operation was aborted.')));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));

  await env.run('_swingHydrateFromBackend()');
  await settle();

  eq(env.bss().snapshotError, 'The operation was aborted.',
     'HOP 1: bssFetchSnapshot catch → st.snapshotError = error.message (a real DOMException AbortError)');
  ok(env.bss().snapshot === null, 'HOP 1: st.snapshot stays null on first load — BSS preserved nothing because there was nothing to preserve');

  const hyd = env.sandbox.S.swing.backendHydration;
  eq(hyd.status, 'empty', 'HOP 2: _swingHydrateFromBackend classifies !snapOk → status "empty" (an ABORT is reported as EMPTY)');
  eq(hyd.reason, 'The operation was aborted.',
     'HOP 2: reason falls back to `bs.snapshotError` — the CLIENT abort text is copied into the hydration reason');
  eq(hyd.updatedAt, '2026-07-26T10:00:00.000Z',
     'HOP 2: updatedAt comes from the SUCCESSFUL status (lastSnapshotUpdatedAt) → "last updated …" is shown for a snapshot never received');
  eq(env.sandbox.S.swing.backendByTab, { squeeze: [], rs: [], directional: [] },
     'HOP 2: the empty branch UNCONDITIONALLY zeroes S.swing.backendByTab — an abort DOES wipe the Swing candidate lists');

  const html = env.dom.els['swing-tbl-body'].innerHTML;
  ok(html.indexOf('Backend snapshot empty/stale') >= 0, 'HOP 3: _swingRenderTable emits "Backend snapshot empty/stale"');
  ok(html.indexOf('— last updated 10:00:00') >= 0, 'HOP 3: … + " — last updated <when>" from the status timestamp');
  ok(html.indexOf('[The operation was aborted.]') >= 0, 'HOP 3: … + " [" + hyd.reason + "]" — UI CONCATENATION of the abort text');
  ok(html.indexOf('Use RUN FULL SCAN to rebuild.') >= 0, 'HOP 3: … + ". Use RUN FULL SCAN to rebuild."');
  ok(html.indexOf('Backend snapshot empty/stale — last updated 10:00:00 [The operation was aborted.]. Use RUN FULL SCAN to rebuild.') >= 0,
     'PROVENANCE PROVEN: the exact reported string is reproduced end-to-end from real source');
}
// Provenance verdict, pinned as explicit assertions.
{
  const hydrate = stripComments(fn('_swingHydrateFromBackend'));
  ok(/reason:\s*\(snap && snap\.reason\)\s*\|\|\s*\(bs && bs\.snapshotError\)/.test(hydrate.replace(/\s+/g, ' ')),
     'ORIGIN: reason = snapshot.reason || bs.snapshotError — a BACKEND reason and a CLIENT abort share one field');
  ok(hydrate.indexOf("status: 'empty'") >= 0, 'ORIGIN: there is NO distinct "aborted" hydration status — abort collapses into "empty"');
  ok(!/_swingIsAbortError/.test(hydrate),
     'INCONSISTENCY (measured, not fixed): _swingHydrateFromBackend does NOT consult _swingIsAbortError, although _swingRenderCoverage does');
  const cov = stripComments(fn('_swingRenderCoverage'));
  ok(cov.indexOf('_swingIsAbortError') >= 0 || cov.indexOf('snapshotAborted') >= 0,
     'CONTRAST: the coverage panel DOES branch on abort and suppresses "RUN FULL SCAN"');
  ok(cov.indexOf('The requests timed out / were aborted — retry shortly.') >= 0,
     'CONTRAST: the coverage panel has abort-aware copy that the Swing table lacks');
  const detector = stripComments(fn('_swingIsAbortError'));
  ok(/operation was aborted/i.test(detector), 'the abort detector already recognises "operation was aborted" — it is simply not wired into hydration');
}
// Single-flight of the hydration layer mirrors the BSS dedup (drop, not queue).
{
  const hydrate = stripComments(fn('_swingHydrateFromBackend'));
  ok(hydrate.indexOf('if (S.swing._hydrating) return;') >= 0, 'hydration is single-flight: a concurrent call is DROPPED');
  ok(hydrate.indexOf('if (S.swing.running) return;') >= 0, 'hydration never fights an in-progress scan');
  ok(/await bssFetchStatus\(\)/.test(hydrate) && /await bssFetchSnapshot\(\)/.test(hydrate),
     'MEASURED: hydration awaits the two readers SEQUENTIALLY (status → snapshot → coverage), unlike bssRefresh which fans out in parallel');
  ok(hydrate.indexOf('/scanner/') < 0, 'hydration performs no fetch of its own — it reuses the BSS readers');
}
// The dedup drop is observable across consumers: hydration can await a reader that
// returns instantly without having fetched anything.
{
  const S = {
    backendKey: 'k',
    swing: { active: true, activeTab: 'directional', candidates: [], candidatesByTab: { squeeze: [], rs: [], directional: [] },
             backendByTab: { squeeze: [], rs: [], directional: [] }, candidateScope: 'window', status: { byTab: {} } },
  };
  const env = makeEnv({
    fns: BSS_CORE.concat(['_swingMapSnapshotToTabs', '_swingSnapshotCandidatesForDisplay', '_swingNormDir',
      '_swingResolveDirectionRaw', '_swingSnapshotRsValue', '_swingSnapshotHasSqueezeDiagnostics',
      '_swingSnapshotHasSqueezeField', '_swingSnapshotSqueezeOperational', '_swingBackendSqueezeAvailable',
      '_swingTabCandidates', '_swingTabCandidatesRaw', '_swingHydrateFromBackend']),
    S,
    extra: [
      'var SWING_HYDRATE_RETRY_MS = 700, SWING_HYDRATE_MAX_RETRIES = 8;',
      'function _backendCandleGateOpen(){ return true; }',
      'function _backendCandleGateReason(){ return "ready"; }',
      'function _swingRenderTable(){}', 'function _swingRenderCoverage(){}',
      'function _swingRenderTabBadges(){}', 'function _swingLogCoveragePaths(){}',
      'function _swingAdoptHydratedTab(){}', 'function _swingSetTab(){}',
    ].join('\n'),
  });
  const dSnap = deferred();
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.deferred(dSnap));
  env.fetch.route('/scanner/coverage/status', env.fetch.status(404));
  env.run('bssFetchSnapshot()');                    // a poll tick is already in flight
  await settle();
  await env.run('_swingHydrateFromBackend()');      // panel opens
  eq(env.fetch.count('/scanner/snapshot'), 1,
     'CROSS-CONSUMER RACE: hydration awaited bssFetchSnapshot() but the poll had it in flight → the await returned WITHOUT data');
  eq(env.sandbox.S.swing.backendHydration.status, 'empty',
     'CROSS-CONSUMER RACE: hydration therefore classifies a healthy pipeline as "empty" purely from request timing');
  eq(env.sandbox.S.swing.backendHydration.reason, null,
     'CROSS-CONSUMER RACE: with no error to report the reason is null — the "empty" verdict has no explanation at all');
  dSnap.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot()) });
  await settle(); await settle();
  ok(env.bss().snapshot != null && env.bss().snapshot.candidates.length === 2,
     'CROSS-CONSUMER RACE: the snapshot DOES arrive afterwards into bssState…');
  eq(env.sandbox.S.swing.backendHydration.status, 'empty',
     '…but nothing re-hydrates the Swing tabs, so the "empty" verdict PERSISTS while BSS holds valid candidates');
}

// ───────────────────────────────────────────────────────────────────────────
section('12. failure matrix — first load / refresh / overlap / teardown');
// ───────────────────────────────────────────────────────────────────────────
async function scenario(name, plan) {
  const env = makeEnv({ fns: BSS_CORE, domIds: ['bss-refresh'] });
  await plan(env);
  const st = env.bss();
  return {
    name, env, st,
    row: {
      snapshot: st.snapshot ? (st.snapshot.ok === true ? 'ok' : 'not_ok') : 'null',
      candidates: st.snapshot && Array.isArray(st.snapshot.candidates) ? st.snapshot.candidates.length : null,
      error: st.snapshotError,
      stale: st.snapshot ? st.snapshot.stale : null,
      renders: env.renders.length,
      timers: env.clock.pending(),
    },
  };
}
const seedOk = async (env) => {
  env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
  env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
  await env.run('Promise.all([bssFetchStatus(), bssFetchSnapshot()])');
};
{
  const r = await scenario('first load success', async (env) => { await seedOk(env); });
  eq(r.row, { snapshot: 'ok', candidates: 2, error: null, stale: false, renders: 2, timers: 0 }, 'FM01 first load success');
}
{
  const r = await scenario('first load abort', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError()));
    env.run('bssRefresh()'); await settle(); await settle();
  });
  eq(r.row, { snapshot: 'null', candidates: null, error: 'The operation was aborted.', stale: null, renders: 2, timers: 1 }, 'FM02 first load abort → nothing to show, abort text set');
}
{
  const r = await scenario('refresh success after valid snapshot', async (env) => {
    await seedOk(env);
    env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot({ candidates: [{ symbol: 'NVDA' }, { symbol: 'AMD' }, { symbol: 'TSLA' }] })));
    await env.run('bssFetchSnapshot()');
  });
  eq(r.row.candidates, 3, 'FM03 refresh success replaces the snapshot with the newer one');
  eq(r.row.error, null, 'FM03 error cleared on success');
}
{
  const r = await scenario('refresh abort after valid snapshot', async (env) => {
    await seedOk(env);
    env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError()));
    await env.run('bssFetchSnapshot()');
  });
  eq(r.row, { snapshot: 'ok', candidates: 2, error: 'The operation was aborted.', stale: false, renders: 3, timers: 0 }, 'FM04 refresh abort → snapshot PRESERVED, error annotated');
}
{
  const r = await scenario('timeout after valid snapshot', async (env) => {
    await seedOk(env);
    env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError('The operation timed out.')));
    await env.run('bssFetchSnapshot()');
  });
  eq(r.row.candidates, 2, 'FM05 timeout → snapshot preserved');
  eq(r.row.error, 'The operation timed out.', 'FM05 timeout text recorded verbatim');
}
{
  const r = await scenario('stale success', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot({ stale: true })));
    env.run('bssRefresh()'); await settle(); await settle();
  });
  eq(r.row, { snapshot: 'ok', candidates: 2, error: null, stale: true, renders: 2, timers: 1 }, 'FM06 stale success → stale flag set, candidates intact');
}
{
  const r = await scenario('empty success', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot({ candidates: [] })));
    env.run('bssRefresh()'); await settle(); await settle();
  });
  eq(r.row.snapshot, 'ok', 'FM07 empty success → still ok');
  eq(r.row.candidates, 0, 'FM07 zero candidates, no error');
}
{
  const r = await scenario('NO_SNAPSHOT', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.json({ ok: false, reason: 'NO_SNAPSHOT' }));
    env.run('bssRefresh()'); await settle(); await settle();
  });
  eq(r.row.snapshot, 'not_ok', 'FM08 NO_SNAPSHOT → not_ok');
  eq(r.row.error, null, 'FM08 NO_SNAPSHOT is not an error');
}
{
  const r = await scenario('status-only failure', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.status(500));
    env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
    env.run('bssRefresh()'); await settle(); await settle();
  });
  eq(r.row.candidates, 2, 'FM09 status-only failure → snapshot fully usable');
  eq(r.st.statusError, 'HTTP 500', 'FM09 statusError isolated to the status half');
}
{
  const r = await scenario('snapshot-only failure', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.status(502));
    env.run('bssRefresh()'); await settle(); await settle();
  });
  eq(r.row.snapshot, 'null', 'FM10 snapshot-only failure → no snapshot');
  ok(r.st.status != null, 'FM10 status half still committed (partial state)');
}
{
  const r = await scenario('both failure', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.reject(realAbortError()));
    env.fetch.route('/scanner/snapshot', env.fetch.reject(realAbortError()));
    env.run('bssRefresh()'); await settle(); await settle();
  });
  eq([r.st.statusError, r.st.snapshotError], ['The operation was aborted.', 'The operation was aborted.'], 'FM11 both failure → both errors, no state');
  eq(r.row.renders, 2, 'FM11 both halves still render their failure');
}
{
  const r = await scenario('manual/poll overlap', async (env) => {
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.json(okSnapshot()));
    env.run('bssStartPolling()'); env.run('bssRefresh()');
    await settle(); await settle();
    env.run('bssStopPolling()');
  });
  eq(r.env.fetch.count('/scanner/snapshot'), 1, 'FM12 overlap → deduped to one read');
  eq(r.row.timers, 1, 'FM12 after bssStopPolling ONE timer remains — the 1500ms button re-enable, which bssStopPolling does not own');
  eq(r.env.clock.intervals(), [], 'FM12 the polling interval itself is fully cleared');
  eq(r.env.clock.timeouts(), [1500], 'FM12 the surviving timer is exactly the refresh-button timeout');
}
{
  const r = await scenario('old response after new response', async (env) => {
    await seedOk(env);
    const dOld = deferred();
    env.fetch.route('/scanner/snapshot', env.fetch.deferred(dOld), env.fetch.json(okSnapshot({ updatedAt: 'NEWER' })));
    env.run('bssFetchSnapshot()'); await settle();
    env.run('bssFetchSnapshot()'); await settle();          // dropped
    dOld.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot({ updatedAt: 'OLDER' })) });
    await settle(); await settle();
  });
  eq(r.st.snapshot.updatedAt, 'OLDER',
     'FM13 the "old after new" hazard is UNREACHABLE — the newer request never started, so the older one is the only result');
}
{
  const r = await scenario('teardown during request', async (env) => {
    const d = deferred();
    env.fetch.route('/scanner/status', env.fetch.json(okStatus()));
    env.fetch.route('/scanner/snapshot', env.fetch.deferred(d));
    env.run('bssStartPolling()'); await settle();
    env.run('bssStopPolling()');
    d.resolve({ ok: true, status: 200, json: () => Promise.resolve(okSnapshot()) });
    await settle(); await settle();
  });
  eq(r.row.timers, 0, 'FM14 no timer survives teardown');
  eq(r.row.candidates, 2, 'FM14 the in-flight response still commits after teardown (not cancelled)');
}

// ───────────────────────────────────────────────────────────────────────────
section('13. ownership manifest + source guards for the extracted service');
// ───────────────────────────────────────────────────────────────────────────
// STRUCTURE AND OWNERSHIP ONLY. The twelve orchestration functions were moved
// verbatim out of index.html into js/services/backend-scanner-snapshot-service.js.
// Nothing about their behaviour changed, so every behavioural assertion in
// §1-§12 above is untouched and still passes against the reconstructed source.
// This section pins WHERE each layer now lives.
const OWNERSHIP_MANIFEST = {
  // The extracted service: flag, state accessor, pure parsers, the three GET
  // readers, manual refresh and the polling lifecycle.
  BACKEND_SCANNER_SNAPSHOT_SERVICE: [
    'ffBackendScannerSnapshot', 'bssState',
    'bssParseStatus', 'bssParseSnapshot', 'bssIsNoSnapshot', 'bssFreshness',
    'bssFetchStatus', 'bssFetchSnapshot', 'bssFetchCoverage',
    'bssRefresh', 'bssStartPolling', 'bssStopPolling',
  ],
  // Every BSS renderer / collapse / mount helper stays inline.
  BACKEND_SCANNER_SNAPSHOT_UI_MONOLITH: [
    'bssRender', 'bssRenderHeadBadges', 'bssInit', 'bssApplyCollapse', 'bssToggleCollapse',
  ],
  // The Directional adapter + preview stay inline in full.
  BACKEND_DIRECTIONAL_MONOLITH: [
    'bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow',
    'bdsSortBackendDirectionalRows', 'bdsDeriveBackendDirectionalRows',
    'bdsBackendDirectionalSummary', 'bdsGetBackendDirectionalSourceState',
    'bdspRefresh', 'bdspRender', 'bdspMaybeRenderScannerResults', 'bdspRenderScannerResultsOverride',
  ],
  // The Swing consumer stays inline.
  SWING_CONSUMER_MONOLITH: [
    '_swingHydrateFromBackend', '_swingRenderTable', '_swingRenderCoverage',
  ],
};
{
  const fs = require('fs');
  const path = require('path');
  const loader = require('./lib/load-app-source');
  const SERVICE_REL = 'js/services/backend-scanner-snapshot-service.js';
  const SERVICE_ABS = path.resolve(__dirname, '..', 'js', 'services', 'backend-scanner-snapshot-service.js');
  const SERVICE_FNS = OWNERSHIP_MANIFEST.BACKEND_SCANNER_SNAPSHOT_SERVICE;

  const cleanSrc = (s) => String(s == null ? '' : s).trim().replace(/[?#].*$/, '');
  const isServiceSrc = (s) => /(^|\/)js\/services\/backend-scanner-snapshot-service\.js$/.test(cleanSrc(s));
  const attrHas = (attrs, name) =>
    new RegExp('(?:^|[ \\t\\n\\f\\r])' + name + '(?=[ \\t\\n\\f\\r=/>]|$)', 'i').test(attrs || '');

  // (1) the new module exists on disk.
  ok(fs.existsSync(SERVICE_ABS), 'STRUCTURE: ' + SERVICE_REL + ' exists');

  const html = loader.loadIndexHtml();
  const tags = loader.parseScriptTags(html);
  const svcTags = tags.filter((t) => isServiceSrc(t.src));

  // (2) index.html references it EXACTLY once.
  eq(svcTags.length, 1, 'STRUCTURE: index.html has exactly one <script src="./' + SERVICE_REL + '"> tag');
  const svc = svcTags[0] || { attrs: '', type: null };

  // (3) it is a CLASSIC script, and (4) it is not a module and is neither async nor defer.
  const svcType = svc.type == null ? '' : String(svc.type).trim().toLowerCase();
  ok(svcType === '' || svcType === 'text/javascript' || svcType === 'application/javascript',
     'STRUCTURE: the service tag is a classic script (type="' + svcType + '")');
  ok(svcType !== 'module', 'STRUCTURE: the service tag is not type="module"');
  ok(!attrHas(svc.attrs, 'async'), 'STRUCTURE: the service tag has no async attribute');
  ok(!attrHas(svc.attrs, 'defer'), 'STRUCTURE: the service tag has no defer attribute');

  const scripts = loader.loadOrderedScriptSources();
  const svcEntry = scripts.find((s) => s.kind === 'local' && isServiceSrc(s.src));
  const inlineApp = scripts.find((s) => s.kind === 'inline' && s.isAppJs);
  const clientIdx = scripts.findIndex((s) => s.kind === 'local' && /backend-client\.js$/.test(String(s.src)));
  const configIdx = scripts.findIndex((s) => s.kind === 'local' && /backend-config\.js$/.test(String(s.src)));

  // (5) loaded AFTER both js/api/backend-client.js and js/config/backend-config.js …
  ok(clientIdx >= 0 && svcEntry && svcEntry.order > clientIdx,
     'ORDER: the service loads after js/api/backend-client.js (_backendAuthHeaders)');
  ok(configIdx >= 0 && svcEntry && svcEntry.order > configIdx,
     'ORDER: the service loads after js/config/backend-config.js (BACKEND)');
  // (6) … and BEFORE the inline monolith (which still owns bssRender / bssInit).
  ok(svcEntry && inlineApp && svcEntry.order < inlineApp.order,
     'ORDER: the service loads before the inline monolith');
  // (7) the loader includes it in the reconstructed application source.
  ok(svcEntry && svcEntry.isAppJs && typeof svcEntry.code === 'string' && svcEntry.code.length > 0,
     'LOADER: the reconstructed application source includes ' + SERVICE_REL);

  const moduleSrc = fs.readFileSync(SERVICE_ABS, 'utf8');
  const inlineSrc = inlineApp ? inlineApp.code : '';
  const defRe = (name) => new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g');

  SERVICE_FNS.forEach((name) => {
    // (8) present in the module, (9) absent from the residual monolith,
    // (10) exactly one definition across the whole application.
    ok((moduleSrc.match(defRe(name)) || []).length === 1,
       'OWNERSHIP (service): "' + name + '" is declared in ' + SERVICE_REL);
    eq((inlineSrc.match(defRe(name)) || []).length, 0,
       'OWNERSHIP (service): "' + name + '" is no longer declared in the inline monolith');
    eq((SRC.match(defRe(name)) || []).length, 1,
       'OWNERSHIP (service): "' + name + '" has exactly one definition application-wide');
  });

  // (11-13) everything else stayed exactly where it was: BSS UI, BDS/BDSP, Swing.
  [['BACKEND_SCANNER_SNAPSHOT_UI_MONOLITH', 'BSS UI'],
   ['BACKEND_DIRECTIONAL_MONOLITH', 'BDS/BDSP'],
   ['SWING_CONSUMER_MONOLITH', 'Swing consumer']].forEach(([group, label]) => {
    OWNERSHIP_MANIFEST[group].forEach((name) => {
      ok((inlineSrc.match(defRe(name)) || []).length === 1,
         'OWNERSHIP (' + label + '): "' + name + '" is still declared in the inline monolith');
      eq((moduleSrc.match(defRe(name)) || []).length, 0,
         'OWNERSHIP (' + label + '): "' + name + '" was NOT moved into the service');
    });
  });

  // (14-18) the module is declarations + comments only: removing every function
  // body must leave nothing executable — no state, no fetch, no timer, no DOM,
  // no localStorage at load time.
  let residue = moduleSrc;
  SERVICE_FNS.forEach((name) => {
    residue = residue.replace(loader.extractFunctionSource(name, { source: residue }), '');
  });
  const residueCode = residue
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, '').trim())
    .filter((l) => l.length > 0);
  eq(residueCode.length, 0,
     'TOP-LEVEL: the service has no top-level execution; unexpected: ' + JSON.stringify(residueCode.slice(0, 3)));
  ok(!/\b(?:var|let|const)\s+\w*[Ss]tate\b/.test(residueCode.join('\n')) &&
     !/new\s+(?:Map|WeakMap)\b/.test(residueCode.join('\n')),
     'TOP-LEVEL: no module-private state container (var/let/const, Map, WeakMap) — state stays on S.backendScanner');
  ok(!/\bfetch\s*\(/.test(residueCode.join('\n')), 'TOP-LEVEL: the service issues no fetch at load time');
  ok(!/\bset(?:Interval|Timeout)\s*\(/.test(residueCode.join('\n')), 'TOP-LEVEL: the service starts no timer at load time');
  ok(!/\bdocument\b/.test(residueCode.join('\n')), 'TOP-LEVEL: the service touches no DOM at load time');
  ok(!/\blocalStorage\b/.test(residueCode.join('\n')), 'TOP-LEVEL: the service reads no localStorage at load time');
  ok(!/\bbssState\s*\(/.test(residueCode.join('\n')), 'TOP-LEVEL: the service never calls bssState() at load time');

  const moduleCode = stripComments(moduleSrc);
  // (19-20) no cancellation and no shared in-flight Promise were introduced by the move.
  ok(moduleCode.indexOf('new AbortController') < 0, 'GUARD: the service introduces no AbortController');
  ok(!/\.abort\s*\(/.test(moduleCode), 'GUARD: the service never calls .abort() — first-started-wins is unchanged');
  ok(!/inFlight|_promise|pendingPromise|Promise\.all/i.test(moduleCode),
     'GUARD: the service stores/returns no shared in-flight Promise');
  ok(!/\b(?:import|export)\b/.test(moduleCode) && moduleCode.indexOf('require(') < 0 && moduleCode.indexOf('window.') < 0,
     'GUARD: the service is a plain classic script — no import/export/require/window.*');
  // (21) still GET-only: no POST /scanner/run anywhere in the module CODE.
  ok(moduleCode.indexOf('/scanner/run') < 0, 'GUARD: the service CODE never references /scanner/run');
  ok(moduleCode.indexOf("method: 'POST'") < 0 && moduleCode.indexOf('method:"POST"') < 0,
     'GUARD: the service issues no POST request');
  // (22) exactly THREE fetch call sites, inside the three reader bodies.
  eq((moduleCode.match(/(?:^|[^.\w])fetch\s*\(/g) || []).length, 3,
     'TRANSPORT: exactly three fetch call sites in the service (status, snapshot, coverage)');
  ['/scanner/status', '/scanner/snapshot', '/scanner/coverage/status'].forEach((ep) => {
    ok(moduleCode.indexOf(ep) >= 0, 'TRANSPORT: the service owns GET ' + ep);
  });

  // (23-24) the relocation created NO other module: no BSS UI module, no
  // Directional adapter module, no separate client/state module.
  [['js/ui/backend-scanner-snapshot-ui.js', 'no BSS UI module was created'],
   ['js/adapters/backend-directional-adapter.js', 'no Directional adapter module was created'],
   ['js/services/backend-scanner-snapshot-client.js', 'no separate snapshot client module was created'],
   ['js/services/backend-scanner-state.js', 'no separate state module was created']].forEach(([rel, msg]) => {
    ok(!fs.existsSync(path.resolve(__dirname, '..', rel)), 'SCOPE: ' + msg + ' (' + rel + ')');
  });

  // The dependency that made the extraction possible in the first place.
  ok(scripts.some((s) => s.kind === 'local' && /backend-client\.js$/.test(String(s.src))),
     'BOUNDARY: _backendAuthHeaders lives in js/api/backend-client.js — the service depends on it late-bound');
}
{
  // Ownership: bssState is the ONLY writer of S.backendScanner in the pipeline.
  const writers = [];
  ['bssFetchStatus', 'bssFetchSnapshot', 'bssFetchCoverage', 'bssRefresh', 'bssStartPolling', 'bssStopPolling', 'bssInit']
    .forEach((n) => { if (/S\.backendScanner\s*=/.test(stripComments(fn(n)))) writers.push(n); });
  eq(writers, [], 'OWNERSHIP: only bssState() assigns S.backendScanner — every other function mutates through it');
  const st = stripComments(fn('bssState'));
  ok(/S\.backendScanner\s*=\s*\{/.test(st), 'OWNERSHIP: bssState() is the single constructor of the pipeline state');
}
{
  // Timer ownership sits on the shared state object, not in a module-local variable.
  ok(/st\.timerId\s*=\s*setInterval/.test(stripComments(fn('bssStartPolling'))), 'OWNERSHIP: the polling timer id lives on bssState().timerId');
  ok(/clearInterval\(st\.timerId\)/.test(stripComments(fn('bssStopPolling'))), 'OWNERSHIP: teardown clears the same shared field');
  ok(stripComments(fn('bssInit')).indexOf('bssStartPolling()') >= 0, 'LIFECYCLE: bssInit is the mount entry point that starts polling');
}
{
  // Copy inventory — pin the operator-visible strings owned by each layer.
  const headBadges = stripComments(fn('bssRenderHeadBadges'));
  ['SCHED ON', 'SCHED OFF', 'STATUS ERR', 'NO SNAPSHOT', 'SNAP ERR'].forEach((s) => {
    ok(headBadges.indexOf("'" + s + "'") >= 0, 'COPY (BSS head badge): "' + s + '"');
  });
  const fresh = stripComments(fn('bssFreshness'));
  ok(fresh.indexOf("'STALE'") >= 0 && fresh.indexOf("'FRESH'") >= 0, 'COPY (BSS freshness): "FRESH" / "STALE"');
  const bdspEmpty = stripComments(fn('bdspRenderBackendResultEmptyState'));
  ok(bdspEmpty.indexOf('Backend snapshot unavailable — switch back to Frontend Scanner or wait for scheduler.') >= 0,
     'COPY (BDSP): "Backend snapshot unavailable — switch back to Frontend Scanner or wait for scheduler."');
  ok(stripComments(fn('bdspRenderRows')).indexOf('No backend directional rows are currently eligible.') >= 0,
     'COPY (BDSP): "No backend directional rows are currently eligible."');
  ok(stripComments(fn('bdspRenderSourceState')).indexOf('Backend snapshot panel not loaded yet.') >= 0,
     'COPY (BDSP): "Backend snapshot panel not loaded yet."');
  const table = stripComments(fn('_swingRenderTable'));
  ['Loading backend scanner snapshot…', 'Backend snapshot empty/stale', 'Use RUN FULL SCAN to rebuild.',
   'waiting for auth to be ready'].forEach((s) => {
    ok(table.indexOf(s) >= 0, 'COPY (Swing table): "' + s + '"');
  });
  ok(!/aborted|timed out/i.test(table),
     'COPY GAP (measured, not fixed): the Swing table has NO abort/timeout-specific copy — every failure reads as "empty/stale"');
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
console.log('ALL TESTS PASSED');

})().catch((e) => { console.error(e); process.exit(1); });
