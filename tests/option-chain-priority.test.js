'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OPTION-CHAIN PRIORITY — Portfolio fallback starvation guard (preview #293).
//
// Symptom: opening Journal > Log Trade and searching MRVL right after Portfolio
// loaded its 5 positions timed out —
//   [OPTION CHAIN ERROR] MRVL timeout
//   GET /option-chains/MRVL/nested → NS_BINDING_ABORTED
// while the frontend simultaneously fanned out PortfolioRefresh fallbacks
//   GET /market/candles/DELL?days=300 (+CVS, TEAM, AMD, …)
//   GET /options/ivr/…
// The chain request lost the network/backend budget to the fallback burst.
//
// Fix under test: while an option-chain request is pending, the non-critical
// Portfolio fallback fan-out (days=300 valuation candles + /options/ivr) is
// paused; existing Greeks/prices are never nulled; and exactly one trailing
// PortfolioRefresh runs once the chain settles.
//
// Run: node tests/option-chain-priority.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

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

// MRVL chain fixture (shape mirrors /option-chains/:t/nested)
function mrvlChain() {
  return { data: { items: [{ expirations: [
    { 'expiration-date': '2026-07-17', strikes: [
      { 'strike-price': '70', put: { 'streamer-symbol': '.MRVL260717P70' }, call: { 'streamer-symbol': '.MRVL260717C70' } },
      { 'strike-price': '75', put: { 'streamer-symbol': '.MRVL260717P75' }, call: { 'streamer-symbol': '.MRVL260717C75' } },
    ] },
    { 'expiration-date': '2026-08-21', strikes: [
      { 'strike-price': '75', put: { 'streamer-symbol': '.MRVL260821P75' }, call: null },
    ] },
  ] }] } };
}

function makeCtx(opts) {
  opts = opts || {};
  const logs = [];
  const ttCalls = [];
  const renders = { ap: 0, jt: 0 };
  const refreshCalls = [];
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
    // one-shot timeout/abort retry bookkeeping (declared with `var` in index.html)
    _CHAIN_TIMEOUT_RETRY_DELAY_MS: 700,
    _chainRetryPending: { ap: null, jt: null },
    _chainRetryDone:    { ap: null, jt: null },
    _chainRetryTimers:  { ap: null, jt: null },
    // Trailing-refresh dependencies (mocked)
    _activePanelPortfolioId: 'pf-1',
    isPortfolioViewActive: () => true,
    refreshPositionsLive: (id, o) => { refreshCalls.push({ id: id, opts: o }); },
    _ensurePerfDiag: () => perf,
    renderLegsTable: () => { renders.ap++; },
    _renderJtLegsTable: () => { renders.jt++; },
    ttCall: async (p) => {
      ttCalls.push(p);
      const t = (p.match(/\/option-chains\/([^/]+)\/nested/) || [])[1];
      return opts.router ? opts.router(t, p) : mrvlChain();
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
  ctx._refreshCalls = refreshCalls;
  ctx._setTicker = (v) => { tickerBox.value = v; };
  ctx._flushTimers = () => { const fns = [...timers.values()]; timers.clear(); fns.forEach(fn => fn()); };
  ctx._chainPaths = () => ttCalls.slice();
  return ctx;
}

// ── 1. pending flag is SET before fetch and CLEARED in finally ───────────────
(async function() {
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'MRVL', router: async (t) => { if (t === 'MRVL') await gate; return mrvlChain(); } });
  const p = ctx._fetchOptionChain('MRVL', false, 2);   // priority set synchronously up to first await
  await micro();
  assert(ctx.S.optionChainPriorityPending.MRVL === true, '1: S.optionChainPriorityPending[MRVL] set true before fetch resolves');
  assert(ctx._optionChainPriorityActive() === true, '1: priority reported active while MRVL pending');
  assert(ctx._logs.some(l => /\[OptionChainPriority\] pending ticker=MRVL requestId=2/.test(l)),
    '1: [OptionChainPriority] pending ticker=MRVL requestId=2 logged');
  release(); await p; await micro();
  assert(!ctx.S.optionChainPriorityPending.MRVL, '1: pending flag cleared after fetch settles');
  assert(ctx._optionChainPriorityActive() === false, '1: priority inactive once MRVL settled');
  assert(ctx._logs.some(l => /\[OptionChainPriority\] cleared ticker=MRVL durationMs=/.test(l)),
    '1: [OptionChainPriority] cleared ticker=MRVL durationMs=… logged in finally');
  assert(ctx._optChainCache['MRVL'] && ctx._optChainCache['MRVL'].expirations.length === 2, '1: MRVL chain still loads + caches');
  console.log('✓ 1 pending flag set before fetch, cleared in finally');
})();

// ── 2. Portfolio CANDLE fallback is skipped while option-chain pending ───────
(function() {
  const ctx = makeCtx({ ticker: 'MRVL' });
  ctx._setOptionChainPriorityPending('MRVL', true);
  const priceMap = { DELL: { price: 120.5, beta: 1.1, greeks: { delta: 0.42 } }, CVS: { price: 60.0, ivRank: 33 } };
  const missing = ['DELL', 'CVS', 'TEAM', 'AMD'];
  const fetchCandlesCalls = [];
  const fakeFetchCandles = (t) => { fetchCandlesCalls.push(t); return [{ c: 999 }]; };
  // Faithful replica of the Path B2 loop body (real gate from index.html):
  for (let i = 0; i < missing.length; i++) {
    if (ctx._pausePortfolioFallbackForOptionChain(missing[i], 'candle')) continue;
    const candles = fakeFetchCandles(missing[i]);
    if (candles && candles.length) priceMap[missing[i]] = { price: candles[candles.length - 1].c, beta: null };
  }
  assert(fetchCandlesCalls.length === 0, '2: no /market/candles days=300 fallback fires while MRVL chain pending');
  assert(ctx._logs.some(l => l.indexOf('[OptionChainPriority] paused portfolio candle fallback ticker=DELL reason=option_chain_pending') !== -1),
    '2: candle-fallback pause logged for DELL');
  assert(ctx.S.portfolioRefreshAfterOptionChain === true, '2: trailing refresh flagged after a fallback was skipped');
  console.log('✓ 2 portfolio candle fallback skipped while option-chain pending');
})();

// ── 3. aggregated IVR fallback is skipped while option-chain pending ─────────
(function() {
  const ctx = makeCtx({ ticker: 'MRVL' });
  ctx._setOptionChainPriorityPending('MRVL', true);
  const tickers = ['DELL', 'CVS'];
  const ivrCalls = [];
  const fakeIvrFetch = (t) => { ivrCalls.push(t); return 40; };
  for (let i = 0; i < tickers.length; i++) {
    if (ctx._pausePortfolioFallbackForOptionChain(tickers[i], 'IVR')) continue;
    fakeIvrFetch(tickers[i]);   // /options/ivr/:ticker
  }
  assert(ivrCalls.length === 0, '3: no /options/ivr fallback fires while MRVL chain pending');
  assert(ctx._logs.some(l => l.indexOf('[OptionChainPriority] paused portfolio IVR fallback ticker=DELL reason=option_chain_pending') !== -1),
    '3: IVR-fallback pause logged for DELL');
  console.log('✓ 3 IVR fallback skipped while option-chain pending');
})();

// ── 4. existing Greeks/prices are NOT cleared when fallback is skipped ───────
(function() {
  const ctx = makeCtx({ ticker: 'MRVL' });
  ctx._setOptionChainPriorityPending('MRVL', true);
  const priceMap = { DELL: { price: 120.5, greeks: { delta: 0.42, theta: -0.03 } } };
  const before = JSON.stringify(priceMap.DELL);
  const missing = ['DELL'];
  for (let i = 0; i < missing.length; i++) {
    if (ctx._pausePortfolioFallbackForOptionChain(missing[i], 'candle')) continue;
    priceMap[missing[i]] = { price: null, beta: null };   // would clobber if not skipped
  }
  assert(JSON.stringify(priceMap.DELL) === before, '4: DELL price + Greeks untouched (never overwritten with null)');
  assert(priceMap.DELL.greeks && priceMap.DELL.greeks.delta === 0.42, '4: existing Greeks preserved');
  console.log('✓ 4 existing Greeks/prices preserved when fallback skipped');
})();

// ── 5. exactly ONE trailing PortfolioRefresh runs after the chain settles ────
(async function() {
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'MRVL', router: async (t) => { if (t === 'MRVL') await gate; return mrvlChain(); } });
  const p = ctx._fetchOptionChain('MRVL', false, 1);
  await micro();
  // Portfolio fallback runs during the pending window and is paused → owes a refresh
  ctx._pausePortfolioFallbackForOptionChain('DELL', 'candle');
  assert(ctx.S.portfolioRefreshAfterOptionChain === true, '5: fallback pause set the trailing-refresh flag');
  assert(ctx._refreshCalls.length === 0, '5: no refresh runs while the chain is still pending');
  release(); await p; await micro();
  assert(ctx._refreshCalls.length === 1, '5: exactly one trailing PortfolioRefresh after MRVL settles');
  assert(ctx._refreshCalls[0].opts && ctx._refreshCalls[0].opts.reason === 'option_chain_priority_trailing',
    '5: trailing refresh tagged reason=option_chain_priority_trailing');
  assert(ctx._logs.some(l => l.indexOf('[OptionChainPriority] running trailing portfolio refresh') !== -1),
    '5: running-trailing-refresh log emitted');
  // Re-invoking must not double-run (flag consumed)
  ctx._runTrailingPortfolioRefreshIfPending();
  assert(ctx._refreshCalls.length === 1, '5: no second trailing refresh (flag consumed)');
  console.log('✓ 5 exactly one trailing PortfolioRefresh after settle');
})();

// ── 5b. trailing refresh waits until the LAST pending chain settles ──────────
(function() {
  const ctx = makeCtx({ ticker: 'MRVL' });
  ctx._setOptionChainPriorityPending('MRVL', true);
  ctx._setOptionChainPriorityPending('AMD', true);
  ctx.S.portfolioRefreshAfterOptionChain = true;
  ctx._setOptionChainPriorityPending('MRVL', false);   // one settles, AMD still pending
  ctx._runTrailingPortfolioRefreshIfPending();
  assert(ctx._refreshCalls.length === 0, '5b: no trailing refresh while another chain is still pending');
  ctx._setOptionChainPriorityPending('AMD', false);    // last one settles
  ctx._runTrailingPortfolioRefreshIfPending();
  assert(ctx._refreshCalls.length === 1, '5b: trailing refresh runs once the last chain settles');
  console.log('✓ 5b trailing refresh waits for the last pending chain');
})();

// ── 6. requestId stale guard still works (chain does not steal a changed ticker)
(async function() {
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'MRVL', router: async (t) => { if (t === 'MRVL') await gate; return mrvlChain(); } });
  ctx._fetchAndRenderChain('jt');       // onchange for MRVL
  ctx._flushTimers();                   // debounce fires → MRVL fetch (awaiting gate), requestId=1
  ctx._setTicker('AMD');                // user changed ticker while MRVL in flight
  release(); await micro(); await micro(); await micro();
  assert(ctx._logs.some(l => l.indexOf('[OPTION CHAIN] stale ignored ticker=MRVL current=AMD') !== -1),
    '6: stale MRVL response ignored once the input changed to AMD (requestId guard intact)');
  assert(ctx._renders.jt === 0, '6: stale response does not re-render with wrong-ticker data');
  console.log('✓ 6 requestId stale guard still works');
})();

// ── 7. MRVL symbol preserved — never replaced by partial/autocomplete text ───
(async function() {
  const ctx = makeCtx({ ticker: 'M' });
  ctx._fetchAndRenderChain('jt');                 // partial 'M' scheduled
  ctx._setTicker('MR');  ctx._fetchAndRenderChain('jt');
  ctx._setTicker('MRV'); ctx._fetchAndRenderChain('jt');
  ctx._setTicker('MRVL'); ctx._fetchAndRenderChain('jt');   // confirmed ticker supersedes all partials
  ctx._flushTimers();
  await micro(); await micro();
  const paths = ctx._chainPaths();
  assert(paths.length === 1 && paths[0] === '/option-chains/MRVL/nested',
    '7: only /option-chains/MRVL/nested is fetched (single request, full symbol)');
  assert(!paths.some(p => /\/option-chains\/(M|MR|MRV)\/nested/.test(p)),
    '7: partial autocomplete tickers M / MR / MRV never hit the network');
  assert(ctx._chainLatestTicker.jt === 'MRVL', '7: confirmed ticker preserved as MRVL');
  assert(ctx._optChainCache['MRVL'] && ctx._optChainCache['MRVL'].expirations.length === 2, '7: MRVL chain loaded + cached under MRVL');
  console.log('✓ 7 MRVL symbol preserved, not replaced by partial text');
})();

// ── 8. structured backend option_chain_timeout is surfaced, not opaque ───────
(async function() {
  // 8a — HTTP-200 structured timeout body
  const ctxA = makeCtx({ ticker: 'MRVL', router: async () => ({ ok: false, reason: 'option_chain_timeout', message: 'option chain timed out' }) });
  await ctxA._fetchOptionChain('MRVL', false, 3);
  assert(ctxA._optChainLastError['MRVL'] === 'option_chain_timeout',
    '8a: structured 200 timeout body surfaced as option_chain_timeout (not opaque "timeout")');
  assert(!ctxA._optChainCache['MRVL'], '8a: no invented chain cached on a structured timeout');
  // 8b — thrown structured timeout (non-2xx propagated by ttCall)
  const ctxB = makeCtx({ ticker: 'MRVL', router: async () => { throw new Error('option_chain_timeout'); } });
  await ctxB._fetchOptionChain('MRVL', false, 4);
  assert(ctxB._optChainLastError['MRVL'] === 'option_chain_timeout',
    '8b: thrown option_chain_timeout preserved (not collapsed to "timeout")');
  // 8c — a plain transport timeout is still normalised to the concise "timeout"
  const ctxC = makeCtx({ ticker: 'MRVL', router: async () => { throw new Error('The operation was aborted due to timeout'); } });
  await ctxC._fetchOptionChain('MRVL', false, 5);
  assert(ctxC._optChainLastError['MRVL'] === 'timeout', '8c: opaque transport timeout still normalises to "timeout"');
  console.log('✓ 8 structured option_chain_timeout surfaced; plain timeout still concise');
})();

// ── 9. the option-chain request itself is NEVER paused ───────────────────────
(async function() {
  const ctx = makeCtx({ ticker: 'MRVL' });
  ctx._setOptionChainPriorityPending('MRVL', true);   // MRVL already flagged pending
  await ctx._fetchOptionChain('MRVL', false, 6);      // must still run immediately
  assert(ctx._ttCalls.some(p => p === '/option-chains/MRVL/nested'),
    '9: option-chain request runs immediately even while priority is active (never self-paused)');
  console.log('✓ 9 option-chain request is never paused by its own priority flag');
})();

// ── 10. static wiring guards — the real loops + fetch use the priority gate ───
(function() {
  const S_LITERAL = HTML.slice(HTML.indexOf('_optChainPending:{}'), HTML.indexOf('_optChainPending:{}') + 400);
  assert(S_LITERAL.indexOf('optionChainPriorityPending') !== -1 && S_LITERAL.indexOf('portfolioRefreshAfterOptionChain') !== -1,
    '10: S state carries optionChainPriorityPending + portfolioRefreshAfterOptionChain');

  const fetchSrc = extractFn(HTML, '_fetchOptionChain');
  assert(fetchSrc.indexOf("_setOptionChainPriorityPending(t, true)") !== -1, '10: _fetchOptionChain sets the pending flag');
  assert(fetchSrc.indexOf("_setOptionChainPriorityPending(t, false)") !== -1 && fetchSrc.indexOf('finally') !== -1,
    '10: _fetchOptionChain clears the pending flag in finally');
  assert(fetchSrc.indexOf('_runTrailingPortfolioRefreshIfPending()') !== -1, '10: _fetchOptionChain runs the trailing refresh in finally');
  assert(fetchSrc.indexOf('_optionChainStructuredTimeout(resp)') !== -1, '10: _fetchOptionChain checks for a structured backend timeout');

  const refreshSrc = extractFn(HTML, 'refreshPositionsLive');
  assert(/_pausePortfolioFallbackForOptionChain\(missing\[i\], 'candle'\)\)\s*continue;/.test(refreshSrc),
    '10: candle fallback loop is gated by the option-chain priority pause');
  assert(/_pausePortfolioFallbackForOptionChain\(_ivrTicker, 'IVR'\)\)\s*continue;/.test(refreshSrc),
    '10: IVR fallback loop is gated by the option-chain priority pause');
  console.log('✓ 10 static guards: state, fetch lifecycle, candle + IVR loop gates wired');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 300);
