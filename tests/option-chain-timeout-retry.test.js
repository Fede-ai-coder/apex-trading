'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OPTION-CHAIN ONE-SHOT TIMEOUT/ABORT RETRY (frontend mitigation).
//
// Symptom: /option-chains/SPY/nested can time out / abort ONCE at the ~20s
// frontend timeout even though auth is fine —
//   XHR GET /option-chains/SPY/nested → NS_BINDING_ABORTED
//   [OPTION CHAIN ERROR] SPY timeout
//   [OPTION CHAIN] error ticker=SPY timeout requestId=1
//
// Fix under test: a first-attempt timeout/abort schedules EXACTLY ONE clean
// retry (fresh request, new requestId, standalone — never reusing the aborted
// S._optChainPending[ticker] promise) after a short delay. On recovery the chain
// renders; on a second timeout the existing classified banner remains. Repeated
// timeout handlers / clicks / blur-change re-fires never stack a second retry,
// and OptionChainPriority is cleared for BOTH attempts.
//
// Run: node tests/option-chain-timeout-retry.test.js
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
  }
  throw new Error('function not found: ' + name);
}

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }
const micro = () => new Promise(res => setImmediate(res));
async function settle() { for (let i = 0; i < 6; i++) await micro(); }

// SPY chain fixture (shape mirrors /option-chains/:t/nested)
function spyChain() {
  return { data: { items: [{ expirations: [
    { 'expiration-date': '2026-07-17', strikes: [
      { 'strike-price': '540', put: { 'streamer-symbol': '.SPY260717P540' }, call: { 'streamer-symbol': '.SPY260717C540' } },
      { 'strike-price': '545', put: { 'streamer-symbol': '.SPY260717P545' }, call: { 'streamer-symbol': '.SPY260717C545' } },
    ] },
    { 'expiration-date': '2026-08-21', strikes: [
      { 'strike-price': '550', put: { 'streamer-symbol': '.SPY260821P550' }, call: null },
    ] },
  ] }] } };
}
// A frontend timeout/abort surfaces as a thrown NS_BINDING_ABORTED / timeout error.
function abortError() { throw new Error('NS_BINDING_ABORTED'); }

function makeCtx(opts) {
  opts = opts || {};
  const logs = [];
  const ttCalls = [];
  const renders = { ap: 0, jt: 0 };
  let tid = 0; const timers = new Map();
  const tickerBox = { value: opts.ticker || '' };
  const perf = { optionChainDedupHits: 0, optionChainStaleIgnored: 0, optionChainDebounced: 0,
                 lastOptionChainRequested: null, lastOptionChainApplied: null };

  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), warn: () => {}, error: () => {}, debug: () => {} },
    JSON, Array, Date, String, Object, Promise, Math, parseFloat, isFinite, encodeURIComponent, RegExp,
    document: { getElementById: (id) => (id === 'jtTicker' || id === 'apTicker') ? tickerBox : null },
    setTimeout: (fn) => { const id = ++tid; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    S: { ttSessionId: 'sess-1', _optChainPending: {}, optionChainPriorityPending: {}, portfolioRefreshAfterOptionChain: false },
    _optChainCache: {},
    _optChainLastError: {},
    _chainDebounceTimers: { ap: null, jt: null },
    _chainRequestId: { ap: 0, jt: 0 },
    _chainLatestTicker: { ap: null, jt: null },
    _chainError: { ap: null, jt: null },
    _CHAIN_DEBOUNCE_MS: 250,
    _CHAIN_MIN_TICKER_LEN: 1,
    // one-shot retry bookkeeping (declared with `var` in index.html; supplied here)
    _CHAIN_TIMEOUT_RETRY_DELAY_MS: 700,
    _chainRetryPending: { ap: null, jt: null },
    _chainRetryDone:    { ap: null, jt: null },
    _chainRetryTimers:  { ap: null, jt: null },
    // Trailing-refresh dependencies (mocked)
    _activePanelPortfolioId: 'pf-1',
    isPortfolioViewActive: () => true,
    refreshPositionsLive: () => {},
    _ensurePerfDiag: () => perf,
    renderLegsTable: () => { renders.ap++; },
    _renderJtLegsTable: () => { renders.jt++; },
    ttCall: async (p) => {
      ttCalls.push(p);
      const t = (p.match(/\/option-chains\/([^/]+)\/nested/) || [])[1];
      return opts.router ? opts.router(t, p, ttCalls.length) : spyChain();
    },
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, '_optionChainPriorityActive'),
    extractFn(HTML, '_setOptionChainPriorityPending'),
    extractFn(HTML, '_notePortfolioFallbackDeferred'),
    extractFn(HTML, '_pausePortfolioFallbackForOptionChain'),
    extractFn(HTML, '_runTrailingPortfolioRefreshIfPending'),
    extractFn(HTML, '_optionChainStructuredTimeout'),
    extractFn(HTML, '_fetchOptionChain'),
    extractFn(HTML, '_isChainTimeoutShape'),
    extractFn(HTML, '_scheduleChainTimeoutRetry'),
    extractFn(HTML, '_currentChainTicker'),
    extractFn(HTML, '_fetchAndRenderChain'),
  ].join('\n'), ctx);

  ctx._logs = logs;
  ctx._ttCalls = ttCalls;
  ctx._renders = renders;
  ctx._setTicker = (v) => { tickerBox.value = v; };
  ctx._pendingTimerCount = () => timers.size;
  ctx._flushTimers = () => { const fns = [...timers.values()]; timers.clear(); fns.forEach(fn => fn()); };
  ctx._logCount = (re) => logs.filter(l => re.test(l)).length;
  return ctx;
}

// ── 1. first timeout triggers EXACTLY ONE clean retry (fresh request) ─────────
(async function() {
  // First attempt aborts; retry (call #2) succeeds.
  const ctx = makeCtx({ ticker: 'SPY', router: async (t, p, n) => (n === 1 ? abortError() : spyChain()) });
  ctx._fetchAndRenderChain('jt');                 // onchange for SPY → debounce
  ctx._flushTimers();                             // debounce fires → attempt #1 (requestId=1)
  await settle();

  assert(ctx._ttCalls.length === 1, '1: only ONE option-chain request before the retry fires');
  assert(ctx._chainRetryPending.jt === 'SPY', '1: retry marked pending for SPY after first timeout');
  assert(ctx._logCount(/\[OPTION CHAIN\] timeout retry scheduled ticker=SPY attempt=2/) === 1,
    '1: exactly one "timeout retry scheduled ticker=SPY attempt=2" log');
  assert(ctx._logs.some(l => /\[OPTION CHAIN\] error ticker=SPY timeout requestId=1/.test(l)),
    '1: first attempt logged as classified timeout (requestId=1)');

  ctx._flushTimers();                             // retry timer fires → attempt #2 (fresh)
  await settle();

  assert(ctx._ttCalls.length === 2, '1: exactly two option-chain requests total (one clean retry, no storm)');
  // The retry is a FRESH forced request, not a reuse of the aborted pending promise.
  assert(ctx._ttCalls[1] === '/option-chains/SPY/nested?refresh=1',
    '1: retry is a fresh forced request (?refresh=1), not the reused aborted promise');
  assert(!ctx.S._optChainPending['SPY'],
    '1: retry never attaches to (or leaves) a stale S._optChainPending[SPY] entry');
  assert(ctx._chainRequestId.jt === 2, '1: retry used a new requestId (2), not attempt #1\'s');
  console.log('✓ 1 first timeout → exactly one clean retry with a fresh request');
})();

// ── 2. if the retry SUCCEEDS, the chain renders and the banner clears ─────────
(async function() {
  const ctx = makeCtx({ ticker: 'SPY', router: async (t, p, n) => (n === 1 ? abortError() : spyChain()) });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await settle();   // attempt #1 fails
  ctx._flushTimers(); await settle();                                    // retry succeeds

  assert(ctx._optChainCache['SPY'] && ctx._optChainCache['SPY'].expirations.length === 2,
    '2: SPY chain loaded + cached after the retry');
  assert(ctx._chainError.jt === null, '2: failure banner cleared once the retry recovered the chain');
  assert(ctx._logs.some(l => l === '[OPTION CHAIN] timeout retry success ticker=SPY'),
    '2: "timeout retry success ticker=SPY" logged');
  assert(ctx._chainRetryDone.jt === 'SPY' && ctx._chainRetryPending.jt === null,
    '2: one-shot budget spent (done) and pending slot released after recovery');
  assert(ctx._renders.jt >= 1, '2: leg table re-rendered with the recovered chain');
  console.log('✓ 2 retry success → chain renders, banner clears');
})();

// ── 3. if the retry ALSO times out, the classified timeout banner remains ─────
(async function() {
  const ctx = makeCtx({ ticker: 'SPY', router: async () => abortError() });   // both attempts abort
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await settle();   // attempt #1 fails → retry scheduled
  ctx._flushTimers(); await settle();                                    // retry ALSO fails

  assert(ctx._ttCalls.length === 2, '3: no third attempt — retries stop after one');
  assert(ctx._chainError.jt && ctx._chainError.jt.ticker === 'SPY' && ctx._chainError.jt.message === 'timeout',
    '3: classified timeout banner remains after the retry also fails');
  assert(ctx._logs.some(l => l === '[OPTION CHAIN] timeout retry failed ticker=SPY'),
    '3: "timeout retry failed ticker=SPY" logged');
  assert(ctx._chainRetryDone.jt === 'SPY', '3: one-shot budget spent — no further retries for SPY');
  assert(!ctx._optChainCache['SPY'], '3: no invented chain cached on a double timeout');
  console.log('✓ 3 retry failure → classified timeout banner remains');
})();

// ── 4. repeated timeout handlers / clicks / blur-change never stack a 2nd retry
(async function() {
  const ctx = makeCtx({ ticker: 'SPY', router: async () => abortError() });   // always times out
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await settle();  // attempt #1 fails → one retry scheduled
  // Repeated failure handlers fire again for the SAME ticker (as repeated
  // blur/change/click would): each calls the scheduler. All must be no-ops.
  ctx._scheduleChainTimeoutRetry('jt', 'SPY');
  ctx._scheduleChainTimeoutRetry('jt', 'SPY');
  assert(ctx._logCount(/\[OPTION CHAIN\] timeout retry scheduled ticker=SPY attempt=2/) === 1,
    '4: only ONE retry scheduled despite repeated handlers (pending guard)');
  assert(ctx._pendingTimerCount() === 1, '4: only one pending retry timer, not three');

  ctx._flushTimers(); await settle();          // the single retry fires and also fails
  assert(ctx._ttCalls.length === 2, '4: exactly one retry request hit the network (attempt #1 + one retry)');
  // After the budget is spent, further handlers for the SAME ticker are no-ops.
  ctx._scheduleChainTimeoutRetry('jt', 'SPY');
  assert(ctx._logCount(/\[OPTION CHAIN\] timeout retry scheduled ticker=SPY attempt=2/) === 1,
    '4: no new retry scheduled after the one-shot budget is spent (done guard)');
  assert(ctx._pendingTimerCount() === 0, '4: no lingering retry timer after budget spent');
  console.log('✓ 4 repeated handlers converge on a single retry (no storm)');
})();

// ── 5. OptionChainPriority is cleared for BOTH attempts ───────────────────────
(async function() {
  const ctx = makeCtx({ ticker: 'SPY', router: async (t, p, n) => (n === 1 ? abortError() : spyChain()) });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await settle();   // attempt #1
  ctx._flushTimers(); await settle();                                    // retry
  assert(ctx._logCount(/\[OptionChainPriority\] cleared ticker=SPY durationMs=/) === 2,
    '5: priority cleared once per attempt — both attempts (attempt #1 + retry)');
  assert(!ctx.S.optionChainPriorityPending['SPY'] && ctx._optionChainPriorityActive() === false,
    '5: no residual option-chain priority flag left set after both attempts settle');
  console.log('✓ 5 OptionChainPriority cleared for both attempts');
})();

// ── 6. manual Retry button behaviour is intact (single shot, no auto-retry) ───
(async function() {
  const ctx = makeCtx({ ticker: 'SPY', router: async () => abortError() });   // times out
  ctx._fetchAndRenderChain('jt', true);        // manual Retry (force=true) runs immediately
  await settle();
  assert(ctx._ttCalls.length === 1 && ctx._ttCalls[0] === '/option-chains/SPY/nested?refresh=1',
    '6: manual Retry issues a single forced request');
  assert(ctx._logCount(/\[OPTION CHAIN\] timeout retry scheduled/) === 0,
    '6: manual Retry does NOT schedule an automatic follow-up retry');
  assert(ctx._chainRetryPending.jt === null && ctx._pendingTimerCount() === 0,
    '6: manual Retry leaves no pending auto-retry state');
  assert(ctx._chainError.jt && ctx._chainError.jt.message === 'timeout',
    '6: manual Retry still surfaces the classified timeout banner');
  console.log('✓ 6 manual Retry stays a single clean shot');
})();

// ── 7. a genuine ticker change re-opens a fresh one-shot retry budget ─────────
(async function() {
  const ctx = makeCtx({ ticker: 'SPY', router: async () => abortError() });   // everything times out
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await settle();   // SPY #1 → retry scheduled
  ctx._flushTimers(); await settle();                                    // SPY retry fails → budget spent
  assert(ctx._chainRetryDone.jt === 'SPY', '7: SPY budget spent');

  ctx._setTicker('QQQ');
  ctx._fetchAndRenderChain('jt');                                        // genuine ticker change
  assert(ctx._chainRetryDone.jt === null, '7: ticker change reset the spent budget');
  ctx._flushTimers(); await settle();                                    // QQQ #1 times out
  assert(ctx._chainRetryPending.jt === 'QQQ',
    '7: QQQ gets its own fresh retry (budget is per user-action/ticker)');
  assert(ctx._logCount(/\[OPTION CHAIN\] timeout retry scheduled ticker=QQQ attempt=2/) === 1,
    '7: exactly one retry scheduled for the new ticker QQQ');
  console.log('✓ 7 ticker change re-opens a fresh one-shot retry budget');
})();

// ── 8. non-timeout failures are NOT retried (auth / not-found) ────────────────
(async function() {
  const ctx = makeCtx({ ticker: 'SPY', router: async () => { throw new Error('unauthorized session'); } });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await settle();
  assert(ctx._chainError.jt && ctx._chainError.jt.message === 'option_chain_auth_unavailable',
    '8: auth failure classified as option_chain_auth_unavailable');
  assert(ctx._logCount(/\[OPTION CHAIN\] timeout retry scheduled/) === 0,
    '8: an auth failure is NOT auto-retried (only timeout/abort shapes are)');
  assert(ctx._chainRetryPending.jt === null, '8: no retry pending for a non-timeout failure');
  console.log('✓ 8 non-timeout failures are not auto-retried');
})();

// ── 9. static wiring guards — retry is wired into the fetch/render path ───────
(function() {
  const src = extractFn(HTML, '_fetchAndRenderChain');
  assert(/_scheduleChainTimeoutRetry\(formPrefix, requestedTicker\)/.test(src),
    '9: _fetchAndRenderChain schedules the one-shot retry on a first-attempt failure');
  assert(src.indexOf("!force && _isChainTimeoutShape(msg)") !== -1,
    '9: retry is gated to non-force (automatic) fetches with a timeout/abort shape');
  assert(src.indexOf('timeout retry success ticker=') !== -1 && src.indexOf('timeout retry failed ticker=') !== -1,
    '9: retry outcome is logged (success/failed)');
  const sched = extractFn(HTML, '_scheduleChainTimeoutRetry');
  assert(/_chainRetryPending\[formPrefix\] != null\) return;/.test(sched) && /_chainRetryDone\[formPrefix\] === ticker\) return;/.test(sched),
    '9: scheduler is idempotent (pending + done one-shot guards)');
  assert(/_fetchAndRenderChain\(formPrefix, true, \{ ticker: ticker \}\)/.test(sched),
    '9: retry issues a clean forced request (force=true, standalone)');
  console.log('✓ 9 static guards: retry wired into fetch lifecycle with one-shot guards');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 400);
