'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Frontend concurrency & request-dedupe (preview #293 backend-flood fix).
//
// Goal of the change under test: reduce frontend fan-out and duplicated requests
// during PortfolioRefresh WITHOUT changing any backend contract. This suite drives
// the REAL primitives extracted out of index.html (no copies, so they cannot drift)
// and asserts on the real call-site SOURCE to prove the wiring stays connected.
//
// Coverage (task-required):
//   1. in-flight dedupe returns the same Promise (factory runs once, released on settle)
//   2. concurrency cap <= 2 (_createConcurrencyLimiter / _mapLimited)
//   3. trailing refresh runs exactly once after the current refresh, latest intent
//   4. dxlink/status TTL freshness avoids duplicate calls within the window
//   5. option-chain pending pauses heavy PortfolioRefresh
//   6. /portfolio/technical-refresh duplicate suppressed (shared in-flight POST)
//   + call-site wiring assertions for every endpoint touched.
//
// Run: node tests/frontend-concurrency-dedupe.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level `function NAME(...) {...}` by brace-matching. Skips braces
// inside strings, template literals, regex and comments so nested bodies are safe.
function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Sandbox: load the real primitives ────────────────────────────────────────
const capturedLogs = [];
const recordingConsole = {
  log: (...a) => { capturedLogs.push(a.map(String).join(' ')); },
  warn: () => {}, debug: () => {}, error: () => {}, table: () => {},
};
const sandbox = {
  console: recordingConsole,
  JSON, Object, String, Math, Array, Number, Boolean,
  isFinite, parseFloat, parseInt, NaN, Infinity,
  Promise, Date, setTimeout, clearTimeout,
};
vm.createContext(sandbox);
// extractFn returns the `function NAME(...){}` slice WITHOUT any leading `async`;
// preserve it so async bodies (which use await) stay valid in the sandbox.
function loadFn(name) {
  let src = extractFn(HTML, name);
  if (new RegExp('async\\s+function\\s+' + name + '\\s*\\(').test(HTML)) src = 'async ' + src;
  vm.runInContext(src, sandbox);
}
[
  '_createRequestDedupe',
  '_createConcurrencyLimiter',
  '_mapLimited',
  '_dxlinkStatusAgeMs',
  '_dxlinkStatusIsFresh',
  '_isOptionChainPending',
  '_portfolioRefreshQueueTrailing',
  '_portfolioRefreshTakeTrailing',
  '_technicalRefreshBatchKey',
  '_fetchPortfolioTechnicalBatch',
  '_fetchPortfolioTechnicalBatchRaw',
].forEach(loadFn);

// Globals the extracted functions reference from module scope.
vm.runInContext('var _DXLINK_STATUS_TTL_MS = 20000;', sandbox);
vm.runInContext('var _dxlinkStatusCache = { data: null, fetchedAt: 0 };', sandbox);
vm.runInContext('var S = { _optChainPending: {} };', sandbox);

// ── main ─────────────────────────────────────────────────────────────────────
(async function main() {

  // ── 1. In-flight dedupe returns the SAME Promise ───────────────────────────
  section('1. in-flight dedupe — concurrent callers share one Promise, factory runs once');
  {
    const d = sandbox._createRequestDedupe({});
    let calls = 0;
    const factory = () => new Promise((res) => setTimeout(() => { calls++; res('v'); }, 5));

    const p1 = d.run('K', factory);
    const p2 = d.run('K', factory);
    ok(p1 === p2, 'same key while in-flight → identical Promise reference');
    ok(d.pendingCount() === 1, 'only one in-flight entry for the shared key');

    const [v1, v2] = await Promise.all([p1, p2]);
    ok(calls === 1, 'factory executed exactly once for two concurrent callers');
    ok(v1 === 'v' && v2 === 'v', 'both callers resolve to the same value');
    ok(d.diag.hits === 1 && d.diag.misses === 1, 'diag counted one miss + one hit');

    // Key is a coalescer, not a cache: released once settled → next call re-runs.
    const p3 = d.run('K', factory);
    ok(p3 !== p1, 'after settle the key is released → a fresh Promise');
    await p3;
    ok(calls === 2, 'a post-settle call re-invokes the factory (no stale caching)');

    // Distinct keys never collide.
    let aCalls = 0, bCalls = 0;
    await Promise.all([
      d.run('A', () => { aCalls++; return Promise.resolve(1); }),
      d.run('B', () => { bCalls++; return Promise.resolve(2); }),
    ]);
    ok(aCalls === 1 && bCalls === 1, 'different keys run independently');

    // A rejecting factory releases the key too (no permanent poisoning).
    let rejected = false;
    try { await d.run('E', () => Promise.reject(new Error('boom'))); } catch (e) { rejected = true; }
    ok(rejected, 'rejection propagates to caller');
    ok(!d.pending('E'), 'key released after rejection');
  }

  // ── 2. Concurrency cap <= 2 ────────────────────────────────────────────────
  section('2. concurrency cap — never more than 2 heavy requests in flight');
  {
    let active = 0, maxActive = 0;
    const items = [1, 2, 3, 4, 5, 6, 7];
    const results = await sandbox._mapLimited(items, 2, (x) => new Promise((res) => {
      active++; maxActive = Math.max(maxActive, active);
      setTimeout(() => { active--; res(x * 10); }, 5);
    }));
    ok(maxActive <= 2, 'peak concurrency never exceeded the cap of 2 (peak=' + maxActive + ')');
    ok(maxActive === 2, 'the cap of 2 was actually saturated');
    ok(JSON.stringify(results) === JSON.stringify([10, 20, 30, 40, 50, 60, 70]),
      'results preserve input order despite bounded concurrency');

    // Limiter reports its own bound and drains its queue.
    const lim = sandbox._createConcurrencyLimiter(2);
    ok(lim.maxConcurrent === 2, 'limiter exposes maxConcurrent=2');
    let lp = 0, lmax = 0;
    await Promise.all([0, 0, 0, 0].map(() => lim.run(() => new Promise((res) => {
      lp++; lmax = Math.max(lmax, lp);
      setTimeout(() => { lp--; res(); }, 3);
    }))));
    ok(lmax <= 2, 'limiter caps active tasks at 2 (peak=' + lmax + ')');
    ok(lim.activeCount() === 0 && lim.queuedCount() === 0, 'limiter fully drained');

    // A cap of 1 fully serialises.
    let s = 0, smax = 0;
    await sandbox._mapLimited([1, 2, 3], 1, () => new Promise((res) => {
      s++; smax = Math.max(smax, s); setTimeout(() => { s--; res(); }, 2);
    }));
    ok(smax === 1, 'limit=1 serialises completely');

    ok((await sandbox._mapLimited([], 2, () => Promise.resolve(1))).length === 0,
      'empty input resolves to []');
  }

  // ── 3. Trailing refresh runs exactly once after the current one ────────────
  section('3. trailing coalesce — one trailing run after current, carrying latest intent');
  {
    const state = { portfolioRefreshInFlight: false, portfolioRefreshTrailing: null };
    const runs = [];
    let completeCurrent = null;
    function fakeRefresh(id, opts) {
      if (state.portfolioRefreshInFlight) {
        sandbox._portfolioRefreshQueueTrailing(state, id, opts);
        return;
      }
      state.portfolioRefreshInFlight = true;
      runs.push({ id, opts });
      completeCurrent = function () {
        state.portfolioRefreshInFlight = false;
        const t = sandbox._portfolioRefreshTakeTrailing(state);
        if (t) fakeRefresh(t.portfolioId, t.opts);
      };
    }

    capturedLogs.length = 0;
    fakeRefresh(7, { reason: 'a' });           // starts run #1
    fakeRefresh(7, { reason: 'b' });           // overlaps → queue trailing (b)
    fakeRefresh(7, { reason: 'c' });           // overlaps again → keep LATEST (c)
    ok(runs.length === 1, 'only one refresh runs while in flight (no duplicates)');
    ok(state.portfolioRefreshTrailing && state.portfolioRefreshTrailing.opts.reason === 'c',
      'trailing intent keeps the latest requested refresh');
    ok(capturedLogs.some((l) => l.includes('[PortfolioRefresh] queued trailing refresh')),
      'logs [PortfolioRefresh] queued trailing refresh on first overlap');
    ok(capturedLogs.some((l) => l.includes('[PortfolioRefresh] deduped in-flight')),
      'logs [PortfolioRefresh] deduped in-flight on subsequent overlap');

    completeCurrent();                          // current settles → one trailing run
    ok(runs.length === 2, 'exactly one trailing refresh runs after the current finishes');
    ok(runs[1].opts.reason === 'c', 'the trailing run carried the latest intent (c)');
    ok(state.portfolioRefreshTrailing === null, 'no further trailing queued after it ran');

    completeCurrent();                          // settling again → nothing left
    ok(runs.length === 2, 'no extra runs — trailing fires at most once');
  }

  // ── 4. dxlink/status TTL freshness ─────────────────────────────────────────
  section('4. dxlink/status freshness window — reuse recent status within TTL');
  {
    vm.runInContext('_dxlinkStatusCache = { data: { state: "ready" }, fetchedAt: 1000 };', sandbox);
    ok(sandbox._dxlinkStatusAgeMs(1000 + 5000) === 5000, 'ageMs computed from fetchedAt');
    ok(sandbox._dxlinkStatusIsFresh(20000, 1000 + 5000) === true, 'fresh 5s into a 20s TTL');
    ok(sandbox._dxlinkStatusIsFresh(20000, 1000 + 19999) === true, 'fresh just under the TTL');
    ok(sandbox._dxlinkStatusIsFresh(20000, 1000 + 20000) === false, 'stale exactly at the TTL');
    ok(sandbox._dxlinkStatusIsFresh(20000, 1000 + 25000) === false, 'stale after the TTL');

    vm.runInContext('_dxlinkStatusCache = { data: null, fetchedAt: 0 };', sandbox);
    ok(sandbox._dxlinkStatusAgeMs(5000) === Infinity, 'never-fetched → age Infinity');
    ok(sandbox._dxlinkStatusIsFresh(20000, 999999) === false, 'no cached data → never fresh (forces a real fetch)');

    // Default TTL is in the required 15–30s band.
    const ttlMatch = HTML.match(/_DXLINK_STATUS_TTL_MS\s*=\s*(\d+)/);
    ok(!!ttlMatch, '_DXLINK_STATUS_TTL_MS default is declared');
    const ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : -1;
    ok(ttl >= 15000 && ttl <= 30000, 'default TTL is within 15–30s (' + ttl + 'ms)');
  }

  // ── 5. Option-chain pending pauses heavy PortfolioRefresh ──────────────────
  section('5. option-chain pending pauses heavy PortfolioRefresh');
  {
    vm.runInContext('S._optChainPending = {};', sandbox);
    ok(sandbox._isOptionChainPending() === false, 'no pending chain → not pending');
    vm.runInContext('S._optChainPending = { AAPL: Promise.resolve() };', sandbox);
    ok(sandbox._isOptionChainPending() === true, 'a pending chain entry → pending');
    vm.runInContext('S._optChainPending = {}; S._optChainPending.MRVL = null;', sandbox);
    ok(sandbox._isOptionChainPending() === false, 'a settled/deleted entry (null) → not pending');

    const src = stripComments(extractFn(HTML, 'refreshPositionsLive'));
    ok(/!opts\.userInitiated\s*&&\s*_isOptionChainPending\(\)/.test(src),
      'refreshPositionsLive pauses only NON-user refreshes while a chain is pending');
    ok(src.includes('[OptionChain] heavy refresh paused while pending'),
      'refreshPositionsLive logs the option-chain pause diagnostic');
    // The pause must NOT touch the option-chain fetch path itself (UX stays responsive).
    const ocSrc = stripComments(extractFn(HTML, '_fetchOptionChain'));
    ok(!/portfolioRefresh|refreshPositionsLive/i.test(ocSrc),
      'the option-chain fetch path is not entangled with PortfolioRefresh (stays responsive)');
  }

  // ── 6. technical-refresh duplicate suppressed ──────────────────────────────
  section('6. /portfolio/technical-refresh — duplicate concurrent POST suppressed');
  {
    // 6a. Signature key: order- and case-insensitive over symbols + timeframes.
    const k1 = sandbox._technicalRefreshBatchKey(['msft', 'aapl'], ['1D']);
    const k2 = sandbox._technicalRefreshBatchKey(['AAPL', 'MSFT'], ['1D']);
    ok(k1 === k2, 'same symbol set + timeframe → identical key regardless of order/case');
    ok(k1.startsWith('/portfolio/technical-refresh:'), 'key is namespaced to the endpoint');
    ok(sandbox._technicalRefreshBatchKey(['AAPL'], ['1D']) !==
       sandbox._technicalRefreshBatchKey(['AAPL'], ['4H']),
      'different timeframe set → different key (1D vs 4H never collide)');
    ok(sandbox._technicalRefreshBatchKey(['AAPL'], ['1D']) !==
       sandbox._technicalRefreshBatchKey(['AAPL', 'MSFT'], ['1D']),
      'different symbol set → different key');

    // 6b. Two concurrent identical batches share ONE POST.
    vm.runInContext('_reqDedupe = _createRequestDedupe({});', sandbox);
    let fetchCount = 0;
    let releaseFetch = null;
    sandbox.BACKEND = 'https://backend.test';
    sandbox._backendAuthHeaders = (h) => h || {};
    sandbox.AbortSignal = { timeout: () => ({}) };
    sandbox.fetch = function () {
      fetchCount++;
      return new Promise((res) => {
        releaseFetch = () => res({
          ok: true, status: 200,
          json: () => Promise.resolve({ ok: true, technicalsBySymbol: {} }),
        });
      });
    };

    const a = sandbox._fetchPortfolioTechnicalBatch(['AAPL', 'MSFT'], ['1D'], 7000, () => true);
    const b = sandbox._fetchPortfolioTechnicalBatch(['MSFT', 'AAPL'], ['1D'], 7000, () => true);
    ok(fetchCount === 1, 'two concurrent identical-signature batches issue ONE POST, not two');

    releaseFetch();
    const [ra, rb] = await Promise.all([a, b]);
    ok(ra === rb, 'both callers receive the same shared result object');
    ok(ra && ra.ok === true, 'the shared result is the real batch response');

    // After settle, a genuinely new call is free to POST again.
    const c = sandbox._fetchPortfolioTechnicalBatch(['AAPL', 'MSFT'], ['1D'], 7000, () => true);
    ok(fetchCount === 2, 'a post-settle identical batch re-POSTs (dedupe is in-flight only)');
    releaseFetch();
    await c;
  }

  // ── 7. Call-site wiring — the primitives are actually connected ────────────
  section('7. call-site wiring — endpoints route through the dedupe/limiter layer');
  {
    const liveSrc = stripComments(extractFn(HTML, 'fetchLiveQuote'));
    ok(/_reqDedupe\.run\(\s*['"]\/market\/live\//.test(liveSrc),
      'fetchLiveQuote dedupes /market/live/:symbol');

    const candSrc = stripComments(extractFn(HTML, 'fetchBackendCandles'));
    ok(/_reqDedupe\.run\(\s*['"]\/market\/candles\//.test(candSrc),
      'fetchBackendCandles dedupes /market/candles/:symbol?days');

    const pollSrc = stripComments(extractFn(HTML, 'pollDxlinkStatus'));
    ok(/_dxlinkStatusIsFresh\(/.test(pollSrc), 'pollDxlinkStatus consults the freshness window');
    ok(pollSrc.includes('[DxlinkStatus] cache hit ageMs='), 'pollDxlinkStatus logs cache hit ageMs');
    ok(pollSrc.includes('[DxlinkStatus] cache miss ageMs='), 'pollDxlinkStatus logs cache miss ageMs');
    ok(/_reqDedupe\.run\(\s*['"]\/dxlink\/status['"]/.test(pollSrc),
      'pollDxlinkStatus coalesces concurrent /dxlink/status calls');

    const startSrc = stripComments(extractFn(HTML, 'startDxlinkStatusPolling'));
    ok(/pollDxlinkStatus\(\s*\{\s*force:\s*true\s*\}\s*\)/.test(startSrc),
      'the 12s heartbeat forces past the TTL so the periodic poll is never suppressed');

    const batchSrc = stripComments(extractFn(HTML, '_fetchPortfolioTechnicalBatch'));
    ok(/_reqDedupe\.run\(\s*_technicalRefreshBatchKey\(/.test(batchSrc),
      '_fetchPortfolioTechnicalBatch routes through the dedupe registry by signature');

    // /options/ivr direct callers routed through the deduped ttCall wrapper.
    ok(/_dedupeTtCall\(\s*['"]\/options\/ivr\//.test(HTML),
      'direct /options/ivr callers go through _dedupeTtCall (shared in-flight)');

    // Heavy portfolio fan-out capped at 2.
    ok(/_mapLimited\(\s*dxMissing\s*,\s*2\s*,/.test(HTML),
      'Path B /market/live fan-out is capped at 2 concurrent');
    ok(/_mapLimited\(\s*symbols\s*,\s*2\s*,/.test(HTML),
      'enrichPortfolioWithLiveQuotes fan-out is capped at 2 concurrent');

    // Trailing coalesce wired into the real refresh (entry + finally).
    const refSrc = stripComments(extractFn(HTML, 'refreshPositionsLive'));
    ok(refSrc.includes('_portfolioRefreshQueueTrailing(S,'),
      'refreshPositionsLive queues a trailing intent on overlap/pause');
    ok(refSrc.includes('_portfolioRefreshTakeTrailing(S)'),
      'refreshPositionsLive consumes+runs the trailing intent when it settles');
    ok(refSrc.includes('[PortfolioRefresh] skipped overlapping refresh'),
      'refreshPositionsLive keeps the skipped-overlapping diagnostic');
  }

  // ── 8. No backend contract drift ───────────────────────────────────────────
  section('8. no backend contract drift — endpoints/payloads unchanged');
  {
    // The technical-refresh POST body shape is untouched (symbols/benchmark/timeframes).
    const rawSrc = extractFn(HTML, '_fetchPortfolioTechnicalBatchRaw');
    ok(/BACKEND\s*\+\s*['"]\/portfolio\/technical-refresh['"]/.test(rawSrc),
      'technical-refresh still POSTs to the same endpoint');
    ok(/symbols:\s*batchSymbols,\s*benchmark:\s*['"]SPY['"],\s*timeframes:\s*timeframes/.test(rawSrc),
      'technical-refresh payload shape unchanged (symbols, benchmark, timeframes)');
    // /market/candles still requests days=300.
    ok(/\/market\/candles\/'\+ticker\+'\?days=300/.test(HTML),
      '/market/candles still requests days=300 (candle formula untouched)');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + (fail === 0
    ? 'ALL PASS (' + pass + ')'
    : pass + ' passed, ' + fail + ' FAILED'));
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
