'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL OPTION-CHAIN — TIMEOUT / RETRY-STORM / PARTIAL-TICKER MISMATCH (fix A).
//
// Anti-regression for the deploy-preview-292 audit (frontend-only fix). Symptoms:
//   • "stale ignored ticker=FTNT current=FTN" dropped a valid confirmed-ticker chain
//     because the resolution guard re-read the raw mutable input at settle time.
//   • manual Retry spammed requestId 7…12 that all deduped onto ONE pending request,
//     each attaching its own final handler → duplicated timeout logs / re-renders.
//   • the Retry button had no pending state and the ticker onblur fired an extra
//     non-forced fetch when the button stole focus.
//
// Fixes proven here (all in _fetchAndRenderChain / _renderJtLegsTable):
//   1. staleness keyed on the committed snapshot (_chainLatestTicker + per-form
//      requestId), NEVER the live DOM → a transient FTN never stale-ignores FTNT.
//   2. ONE in-flight request per confirmed ticker (S._optChainPending guard): a
//      trigger for a ticker already being fetched attaches no new requestId and no
//      new final handler.
//   3. manual Retry while pending → ignored with diagnostic retry_ignored_pending;
//      the Retry button renders disabled ("RETRYING…") while pending.
//   4. the stray onblur fetch is cancelled (blur-then-click) or skipped (click-then-
//      blur, skip_pending) → no duplicate requestId from clicking Retry.
//   5. manual expiry/strike inputs + AUTO streamer symbol remain usable with no chain.
//
// Run: node tests/journal-option-chain-timeout-retry.test.js
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

// Minimal nested-chain fixture for any ticker (shape mirrors /option-chains/:t/nested).
function chainFor(t) {
  return { data: { items: [{ expirations: [
    { 'expiration-date': '2026-07-17', strikes: [
      { 'strike-price': '100', put: { 'streamer-symbol': '.' + t + '260717P100' }, call: { 'streamer-symbol': '.' + t + '260717C100' } },
    ] },
  ] }] } };
}

function makeCtx(opts) {
  opts = opts || {};
  const logs = [];
  const ttCalls = [];
  const renders = { ap: 0, jt: 0 };
  let tid = 0; const timers = new Map();
  const tickerBox = { value: opts.ticker || '' };

  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), warn: () => {}, error: () => {} },
    JSON, Array, Date, String, Object, Promise, Math, parseFloat, isFinite, encodeURIComponent, RegExp,
    document: { getElementById: (id) => (id === 'jtTicker' || id === 'apTicker') ? tickerBox : null },
    setTimeout: (fn) => { const id = ++tid; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    S: { ttSessionId: 'sess-1', _optChainPending: {} },
    _optChainCache: {},
    _optChainLastError: {},
    _chainDebounceTimers: { ap: null, jt: null },
    _chainRequestId: { ap: 0, jt: 0 },
    _chainLatestTicker: { ap: null, jt: null },
    _chainError: { ap: null, jt: null },
    _CHAIN_DEBOUNCE_MS: 250,
    _CHAIN_MIN_TICKER_LEN: 1,
    _ensurePerfDiag: () => ({}),
    renderLegsTable: () => { renders.ap++; },
    _renderJtLegsTable: () => { renders.jt++; },
    ttCall: async (p) => {
      ttCalls.push(p);
      const t = (p.match(/\/option-chains\/([^/]+)\/nested/) || [])[1];
      return opts.router ? opts.router(t, p) : chainFor(t);
    },
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, '_fetchOptionChain'),
    extractFn(HTML, '_currentChainTicker'),
    extractFn(HTML, '_fetchAndRenderChain'),
  ].join('\n'), ctx);

  ctx._logs = logs;
  ctx._renders = renders;
  ctx._setTicker = (v) => { tickerBox.value = v; };
  ctx._flushTimers = () => { const fns = [...timers.values()]; timers.clear(); fns.forEach(fn => fn()); };
  ctx._chainPaths = () => ttCalls.slice();
  ctx._count = (needle) => logs.filter(l => l.indexOf(needle) !== -1).length;
  return ctx;
}

// ── 1. partial ticker: confirmed FTNT is NOT stale-ignored when the raw input ─
//      momentarily reads FTN at settle time (the reported bug). ────────────────
(async function() {
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'FTNT', router: async (t) => { await gate; return chainFor(t); } });
  ctx._fetchAndRenderChain('jt');            // FTNT confirmed → latest=FTNT, requestId=1
  ctx._flushTimers();                        // FTNT fetch starts (awaiting gate)
  ctx._setTicker('FTN');                     // raw input momentarily shorter (mid-edit) — NOT confirmed
  release(); await micro(); await micro(); await micro();
  assert(!ctx._logs.some(l => l.indexOf('stale ignored ticker=FTNT') !== -1),
    '1: confirmed FTNT is NOT stale-ignored because the raw input transiently reads FTN');
  assert(ctx._optChainCache['FTNT'] && ctx._optChainCache['FTNT'].expirations.length === 1,
    '1: the FTNT chain is applied and cached');
  assert(ctx._chainError.jt === null, '1: no error banner for a successful confirmed FTNT load');
  assert(ctx._logs.some(l => l.indexOf('[OPTION CHAIN] loaded ticker=FTNT') !== -1), '1: FTNT logged as loaded');
  console.log('✓ 1 FTN→FTNT: transient raw input does not stale-ignore the confirmed FTNT chain');
})();

// ── 2. manual retry while pending creates NO extra requestId / network request ─
(async function() {
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'FTNT', router: async (t) => { await gate; return chainFor(t); } });
  ctx._fetchAndRenderChain('jt');            // auto request (non-force)
  ctx._flushTimers();                        // starts request → pending set, requestId=1
  for (let i = 0; i < 5; i++) ctx._fetchAndRenderChain('jt', true);   // mash Retry while pending
  assert(ctx._chainPaths().length === 1, '2: exactly one network request despite 5 retry clicks while pending');
  assert(ctx._chainRequestId.jt === 1, '2: requestId is NOT bumped by retries that attach to the pending request');
  assert(ctx._count('[OPTION CHAIN] request start') === 1, '2: exactly one "request start" log');
  assert(ctx._count('retry_ignored_pending') === 5, '2: each retry-while-pending is ignored with retry_ignored_pending');
  release(); await micro(); await micro();
  console.log('✓ 2 retry storm collapsed: 5 clicks → 1 request, 1 requestId, 5×retry_ignored_pending');
})();

// ── 3. one backend timeout = ONE frontend error log + ONE banner (no dup handlers) ─
(async function() {
  let release;
  const gate = new Promise((res, rej) => { release = () => rej(new Error('The operation was aborted due to timeout')); });
  const ctx = makeCtx({ ticker: 'FTNT', router: async () => { await gate; } });
  ctx._fetchAndRenderChain('jt');            // auto request (non-force)
  ctx._flushTimers();                        // starts request → pending
  for (let i = 0; i < 4; i++) ctx._fetchAndRenderChain('jt', true);   // retries while pending (ignored)
  release(); await micro(); await micro(); await micro();
  assert(ctx._count('[OPTION CHAIN] error ticker=FTNT timeout') === 1,
    '3: exactly ONE tagged final error log for a single timed-out request');
  assert(ctx._count('[OPTION CHAIN ERROR]') === 1, '3: exactly ONE network-level error log (no duplicate handlers)');
  assert(ctx._chainError.jt && ctx._chainError.jt.ticker === 'FTNT' && ctx._chainError.jt.message === 'timeout',
    '3: a single error banner state is recorded for FTNT');
  assert(ctx._renders.jt === 1, '3: the banner is rendered exactly once (no re-render storm)');
  console.log('✓ 3 one timeout → one error log + one banner, retries do not multiply handlers');
})();

// ── 4. Retry is disabled/ignored while pending (functional + static render) ───
(async function() {
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'FTNT', router: async (t) => { await gate; return chainFor(t); } });
  ctx._fetchAndRenderChain('jt', true);      // manual retry starts a request → pending
  ctx._fetchAndRenderChain('jt', true);      // second click while pending → ignored
  assert(ctx._chainPaths().length === 1 && ctx._count('retry_ignored_pending') === 1,
    '4: a second Retry click while pending is ignored (one request only)');
  release(); await micro(); await micro();

  // Static: the banner renders a disabled RETRYING… button gated on the pending map.
  const render = extractFn(HTML, '_renderJtLegsTable');
  assert(/_optChainPending\s*&&\s*S\._optChainPending\[ticker\]/.test(render) || render.indexOf('_optChainPending[ticker]') !== -1,
    '4: the Retry banner reads S._optChainPending[ticker] to decide the pending state');
  assert(render.indexOf('disabled') !== -1 && render.indexOf('RETRYING') !== -1,
    '4: the banner renders a disabled "RETRYING…" button while a request is pending');
  assert(render.indexOf('RETRY OPTION CHAIN') !== -1,
    '4: the enabled "RETRY OPTION CHAIN" button is still rendered when not pending');
  console.log('✓ 4 Retry disabled/ignored while pending (guard + disabled render)');
})();

// ── 5. clicking Retry does not spawn a duplicate fetch via the ticker onblur ──
(async function() {
  // (a) blur-then-click: browsers fire blur on mousedown, BEFORE the button click.
  //     The forced retry clears the blur's pending debounce timer.
  let releaseA; const gateA = new Promise(res => { releaseA = res; });
  const a = makeCtx({ ticker: 'FTNT', router: async (t) => { await gateA; return chainFor(t); } });
  a._chainError.jt = { ticker: 'FTNT', message: 'timeout' };  // banner is showing
  a._fetchAndRenderChain('jt');              // onblur (non-force) → schedules a debounced run
  a._fetchAndRenderChain('jt', true);        // Retry click (force) → clears that timer, runs now
  a._flushTimers();                          // no-op: the blur timer was cancelled
  await micro(); await micro();
  assert(a._chainPaths().length === 1, '5a: blur-then-click → exactly one request (blur timer cancelled by force retry)');
  assert(a._count('[OPTION CHAIN] request start') === 1 && a._logs.some(l => l.indexOf('(manual retry)') !== -1),
    '5a: the single request is the manual retry (no stray auto request start)');
  releaseA(); await micro(); await micro();

  // (b) click-then-blur: the stray onblur run is skipped because a request is pending.
  let releaseB; const gateB = new Promise(res => { releaseB = res; });
  const b = makeCtx({ ticker: 'FTNT', router: async (t) => { await gateB; return chainFor(t); } });
  b._chainError.jt = { ticker: 'FTNT', message: 'timeout' };
  b._fetchAndRenderChain('jt', true);        // Retry click (force) → runs now, pending set
  b._fetchAndRenderChain('jt');              // onblur (non-force) → schedules debounce
  b._flushTimers();                          // blur run fires → guard sees pending → skip_pending
  await micro(); await micro();
  assert(b._chainPaths().length === 1, '5b: click-then-blur → exactly one request (stray onblur skipped)');
  assert(b._logs.some(l => l.indexOf('skip_pending ticker=FTNT') !== -1), '5b: the onblur fetch is logged as skip_pending');
  releaseB(); await micro(); await micro();
  console.log('✓ 5 Retry click does not create a duplicate onblur fetch (either event order)');
})();

// ── 6. an OLD request failing AFTER a newer success is ignored (success wins) ─
(async function() {
  let releaseFtn;
  const gate = new Promise(res => { releaseFtn = res; });
  // FTN is gated then FAILS; FTNT resolves immediately with a good chain.
  const ctx = makeCtx({ ticker: 'FTN', router: async (t) => {
    if (t === 'FTN') { await gate; throw new Error('The operation was aborted due to timeout'); }
    return chainFor(t);
  } });
  ctx._fetchAndRenderChain('jt');            // FTN confirmed → requestId=1 (gated, will fail)
  ctx._flushTimers();
  ctx._setTicker('FTNT'); ctx._fetchAndRenderChain('jt');   // FTNT confirmed → requestId=2 (succeeds)
  ctx._flushTimers();
  await micro(); await micro();
  assert(ctx._chainError.jt === null && ctx._optChainCache['FTNT'], '6: FTNT success applied before the old FTN settles');
  releaseFtn(); await micro(); await micro(); await micro();
  assert(ctx._chainError.jt === null, '6: the late FTN failure does NOT overwrite the newer FTNT success (no error banner)');
  assert(ctx._logs.some(l => l.indexOf('[OPTION CHAIN] stale ignored ticker=FTN latest=FTNT') !== -1),
    '6: the superseded FTN failure is logged as stale and ignored');
  console.log('✓ 6 old failure after newer success is ignored (newer success preserved)');
})();

// ── 7. a single timeout surfaces exactly one banner + keeps the ticker ────────
(async function() {
  const ctx = makeCtx({ ticker: 'FTNT', router: async () => { throw new Error('The operation was aborted due to timeout'); } });
  ctx._fetchAndRenderChain('jt');
  ctx._flushTimers();
  await micro(); await micro();
  assert(ctx._chainError.jt && ctx._chainError.jt.ticker === 'FTNT' && ctx._chainError.jt.message === 'timeout',
    '7: one timeout → one { ticker:FTNT, message:timeout } banner state');
  assert(ctx._count('[OPTION CHAIN] error ticker=FTNT timeout') === 1, '7: exactly one error log');
  assert(ctx._renders.jt === 1, '7: banner rendered exactly once');
  assert(!ctx._optChainCache['FTNT'], '7: no chain cached on timeout (never invents expirations)');
  console.log('✓ 7 single timeout → exactly one banner, ticker preserved');
})();

// ── 8. manual expiry/strike + AUTO streamer remain usable with NO chain ───────
(function() {
  // Static: the leg table always renders a date-input Expiry + number-input Strike
  // fallback (in the no-chain `else` branches), wired to updateJtLegField so manual
  // entry edits the leg — never gated away by the chain-unavailable banner.
  const render = extractFn(HTML, '_renderJtLegsTable');
  assert(render.indexOf('type="date"') !== -1 && /updateJtLegField\([^)]*expiry/.test(render),
    '8: Expiry falls back to a usable date input wired to updateJtLegField(expiry) when no chain is present');
  assert(render.indexOf('type="number"') !== -1 && /updateJtLegField\([^)]*strike/.test(render),
    '8: Strike falls back to a usable number input wired to updateJtLegField(strike) when no chain is present');

  // Functional: AUTO streamer symbol is derived from manual inputs with no chain data.
  const tickerBox = { value: 'FTNT' };
  const ctx = {
    console: { log() {} }, JSON, String, Date, Math, parseFloat, isFinite, RegExp,
    document: { getElementById: () => tickerBox },
    _jtFormLegs: [{ type: 'PUT', side: 'SHORT', qty: 1, strike: 100, expiry: null, entryPrice: 1.2 }],
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'buildCompactOptionDxlinkSymbol'),
    extractFn(HTML, '_deriveJtLegStreamer'),
  ].join('\n'), ctx);
  assert(ctx._deriveJtLegStreamer(0) === null, '8: streamer stays AUTO until expiry is entered');
  ctx._jtFormLegs[0].expiry = '2026-07-17';   // user types expiry manually
  assert(ctx._deriveJtLegStreamer(0) === '.FTNT260717P100',
    '8: AUTO streamer symbol is derived from manual ticker/type/strike/expiry (no chain required)');
  console.log('✓ 8 manual expiry/strike + AUTO streamer remain usable when chain is unavailable');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 300);
