'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND STORM CONTROL — backend-unreachable circuit breaker, per-endpoint
// concurrency limits, /dxlink/status coalescing, /dxlink/subscribe-quotes dedup,
// and the controlled "backend unavailable / technical partial" UI state.
//
// Opening Portfolio while the backend was briefly unreachable used to fan out
// dozens of parallel /market/live + /market/candles + /dxlink/status calls, which
// saturated the backend and produced the very CORS/status:null errors it reacted
// to. These guards break that loop.
//
// Run: node tests/frontend-storm-control.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
      if (c === '/' && n === '/') { inLine = true; j++; continue; }
      if (c === '/' && n === '*') { inBlock = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
  }
  throw new Error('function not found: ' + name);
}
// The whole self-contained storm-control block (between its markers).
function stormBlock(src) {
  const s = src.indexOf('// >>> STORM_CONTROL_START');
  const e = src.indexOf('// <<< STORM_CONTROL_END');
  if (s < 0 || e < 0) throw new Error('STORM_CONTROL markers not found');
  return src.slice(s, e);
}

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }
const micro = () => new Promise(res => setImmediate(res));

// Build a fresh sandbox with the storm block loaded. `nowRef.t` is the fake clock.
function makeCtx(extra) {
  const nowRef = { t: 1_000_000 };
  const RealDate = Date;
  const ctx = Object.assign({
    Date: class extends RealDate { constructor(...a) { super(...a); } static now() { return nowRef.t; } },
    Promise, Set, Array, Object, JSON, String, Math, isFinite, parseFloat, encodeURIComponent,
    console: { log() {}, warn() {}, error() {}, debug() {} },
    escHtml: (s) => String(s),
    S: { dxlinkSubscribedSymbols: {} },
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(stormBlock(HTML), ctx);
  ctx._nowRef = nowRef;
  return ctx;
}

// ── 1. backend-unreachable detection ────────────────────────────────────────
(function() {
  const ctx = makeCtx();
  assert(ctx._isBackendUnreachable(new TypeError('Failed to fetch')) === true, '1: TypeError/Failed to fetch → unreachable');
  assert(ctx._isBackendUnreachable('network_error') === true, '1: network_error reason → unreachable');
  assert(ctx._isBackendUnreachable('CORS request did not succeed') === true, '1: CORS text → unreachable');
  assert(ctx._isBackendUnreachable(null, 0) === true, '1: status 0 → unreachable');
  assert(ctx._isBackendUnreachable('http_not_ok', 500) === false, '1: a 500 is NOT "unreachable" (reachable but erroring)');
  assert(ctx._isBackendUnreachable('timeout') === false, '1: plain timeout is not classified unreachable');
  console.log('✓ 1 backend-unreachable classification');
})();

// ── 2. circuit breaker opens after threshold, cools down, resets on success ──
(function() {
  const ctx = makeCtx();
  assert(ctx._backendCircuitOpen() === false, '2: closed initially');
  ctx._noteBackendUnreachable();
  assert(ctx._backendCircuitOpen() === false, '2: still closed after 1 failure (threshold 2)');
  ctx._noteBackendUnreachable();
  assert(ctx._backendCircuitOpen() === true, '2: open after 2 consecutive failures');
  ctx._nowRef.t += 21000; // past STORM_CIRCUIT_OPEN_MS (20s)
  assert(ctx._backendCircuitOpen() === false, '2: half-open after cooldown elapses');
  ctx._noteBackendUnreachable(); ctx._noteBackendUnreachable();
  assert(ctx._backendCircuitOpen() === true, '2: re-opens on renewed failures');
  ctx._noteBackendReachable();
  assert(ctx._backendCircuitOpen() === false, '2: a reachable success closes the breaker');
  console.log('✓ 2 circuit breaker open/cooldown/reset');
})();

// ── 3. concurrency limiter caps active in-flight per pool ────────────────────
(async function() {
  const ctx = makeCtx();
  let active = 0, maxActive = 0;
  const releases = [];
  const make = () => ctx._runLimited('market_live', () => new Promise((resolve) => {
    active++; maxActive = Math.max(maxActive, active);
    releases.push(() => { active--; resolve('ok'); });
  }));
  const ps = [];
  for (let i = 0; i < 10; i++) ps.push(make());
  await micro(); await micro();
  assert(maxActive === 4, '3: market_live never exceeds the pool limit of 4 (got ' + maxActive + ')');
  assert(releases.length === 4, '3: exactly 4 started, 6 queued');
  // Drain: releasing one starts exactly one queued task.
  releases.shift()(); await micro(); await micro();
  assert(releases.length === 4, '3: draining one starts one queued task (steady-state 4 active)');
  while (releases.length) { releases.shift()(); await micro(); await micro(); }
  await Promise.all(ps);
  assert(maxActive === 4, '3: concurrency ceiling held for the whole run');
  console.log('✓ 3 concurrency limiter caps in-flight per pool');
})();

// ── 4. /dxlink/status coalescing (never overlap polls) ──────────────────────
(async function() {
  const ctx = makeCtx();
  let calls = 0, release;
  const gate = new Promise(r => { release = r; });
  const fn = () => { calls++; return gate; };
  const a = ctx._coalesceDxStatus(fn);
  const b = ctx._coalesceDxStatus(fn);
  assert(a === b, '4: overlapping polls share one in-flight promise');
  await micro(); // fn runs on a microtask (Promise.resolve().then(fn))
  assert(calls === 1, '4: underlying poll ran once for both callers');
  release('done'); await a; await micro();
  ctx._coalesceDxStatus(fn); await micro();
  assert(calls === 2, '4: a new poll after the previous settled runs again');
  console.log('✓ 4 dxlink status coalescing');
})();

// ── 5. subscribe-quotes dedup (allowed filter: pending + recently-failed) ────
(function() {
  const ctx = makeCtx();
  assert(JSON.stringify(ctx._subscribeAllowed(['A', 'B'])) === JSON.stringify(['A', 'B']), '5: fresh symbols allowed');
  ctx._markSubscribePending(['A'], true);
  assert(JSON.stringify(ctx._subscribeAllowed(['A', 'B'])) === JSON.stringify(['B']), '5: in-flight symbol A skipped');
  ctx._markSubscribePending(['A'], false);
  ctx._markSubscribeFailed(['B']);
  assert(JSON.stringify(ctx._subscribeAllowed(['A', 'B'])) === JSON.stringify(['A']), '5: recently-failed B skipped (cooldown)');
  ctx._nowRef.t += 16000; // past STORM_SUB_FAIL_COOLDOWN_MS (15s)
  assert(JSON.stringify(ctx._subscribeAllowed(['A', 'B'])) === JSON.stringify(['A', 'B']), '5: B allowed again after cooldown');
  ctx._markSubscribeFailed(['B']); ctx._markSubscribeSucceeded(['B']);
  assert(JSON.stringify(ctx._subscribeAllowed(['B'])) === JSON.stringify(['B']), '5: success clears the failed cooldown');
  console.log('✓ 5 subscribe dedup (pending + failed cooldown)');
})();

// ── 6. subscribeDxlinkQuotes: concurrent calls do not double-POST a symbol ───
(async function() {
  const posts = [];
  let release;
  const gate = new Promise(r => { release = r; });
  const ctx = makeCtx({
    BACKEND: 'http://b',
    _backendAuthHeaders: () => ({}),
    fetch: async (url, opts) => { posts.push(JSON.parse(opts.body).symbols); await gate; return { ok: true, json: async () => ({ subscribed: JSON.parse(opts.body).symbols }) }; },
    AbortSignal: { timeout: () => undefined },
  });
  vm.runInContext(extractFn(HTML, 'isAbortLikeError') + '\n' + extractFn(HTML, 'subscribeDxlinkQuotes'), ctx);
  const p1 = ctx.subscribeDxlinkQuotes(['AAPL', 'MSFT']);
  const p2 = ctx.subscribeDxlinkQuotes(['AAPL', 'MSFT']); // concurrent duplicate
  await micro();
  release();
  await Promise.all([p1, p2]);
  const flat = posts.flat();
  assert(posts.length === 1 && flat.length === 2, '6: concurrent duplicate subscribe issues ONE POST for AAPL,MSFT (got ' + JSON.stringify(posts) + ')');
  console.log('✓ 6 concurrent duplicate subscribe collapses to one POST');
})();

// ── 7. technical-partial state + banner lines ───────────────────────────────
(function() {
  const ctx = makeCtx();
  assert(ctx._stormBannerLines().length === 0, '7: no banner when healthy');
  ctx._noteTechnicalRefreshPartial('4h_warming_up');
  let lines = ctx._stormBannerLines();
  assert(lines.length === 1 && /4H warming up/.test(lines[0]), '7: partial 4H warmup → warming-up banner line');
  ctx._noteBackendUnreachable(); ctx._noteBackendUnreachable();
  lines = ctx._stormBannerLines();
  assert(lines.length === 2 && /temporarily unavailable/.test(lines[0]), '7: circuit open adds the backend-unavailable line');
  ctx._clearTechnicalRefreshPartial(); ctx._noteBackendReachable();
  assert(ctx._stormBannerLines().length === 0, '7: banner clears once healthy again');
  console.log('✓ 7 technical-partial + backend-unavailable banner lines');
})();

// ── 8. static wiring guards ─────────────────────────────────────────────────
(function() {
  const live = extractFn(HTML, 'fetchLiveQuote');
  assert(/_runLimited\('market_live'/.test(live), '8: /market/live wrapped in the market_live concurrency pool');
  const candles = extractFn(HTML, 'fetchBackendCandles');
  assert(/_runLimited\('market_candles'/.test(candles), '8: /market/candles?days=300 wrapped in the market_candles pool');
  const poll = extractFn(HTML, 'pollDxlinkStatus');
  assert(/_coalesceDxStatus\(/.test(poll), '8: /dxlink/status poll coalesced');
  assert(/backend_unreachable_circuit_open/.test(HTML), '8: per-symbol live fallback gated by the open circuit');
  assert(/if \(typeof _updateStormBanner === 'function'\) _updateStormBanner\(\);/.test(HTML), '8: portfolio render updates the storm banner');
  assert(/if \(typeof _isBackendUnreachable === 'function' && _isBackendUnreachable\(/.test(HTML), '8: live-refresh failure trips the breaker on unreachable');
  assert(/if \(typeof _noteBackendReachable === 'function'\) _noteBackendReachable\(\);/.test(HTML), '8: live-refresh success closes the breaker');
  console.log('✓ 8 static wiring guards');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 300);
