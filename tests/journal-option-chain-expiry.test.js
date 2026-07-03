'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL OPTION-CHAIN EXPIRY LOADER — reliability audit/fix.
//
// Symptom (preview #287): logging a SHORT PUT on AMD, the Expiry dropdown stayed
// empty. Runtime logs showed /option-chains/A, /AM and /AMD all fired, the partials
// returning 200 (ignored as stale), AMD timing out/500, and a bogus
// "stale response ignored ticker=AMD current=AMD".
//
// Root causes fixed here:
//   1. The Journal ticker input fetched the chain on EVERY keystroke (oninput), so
//      "AMD" fired /option-chains/A and /AM. Chain fetch now runs only on ticker
//      CONFIRM (onchange/blur).
//   2. The stale guard keyed on a global monotonic seq; a duplicate trigger for the
//      SAME confirmed ticker bumped the seq and mislabelled the valid AMD response
//      "stale ticker=AMD current=AMD". Staleness is now decided purely by the
//      current input ticker.
//   3. On timeout/500 the loader silently returned null → mute empty date input.
//      It now records a per-form error surfaced as an "unavailable — Retry" banner,
//      never falling back to a previous ticker's expirations.
//
// Run: node tests/journal-option-chain-expiry.test.js
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

// AMD chain fixture (shape mirrors /option-chains/:t/nested)
function amdChain() {
  return { data: { items: [{ expirations: [
    { 'expiration-date': '2026-07-17', strikes: [
      { 'strike-price': '340', put: { 'streamer-symbol': '.AMD260717P340' }, call: { 'streamer-symbol': '.AMD260717C340' } },
      { 'strike-price': '350', put: { 'streamer-symbol': '.AMD260717P350' }, call: { 'streamer-symbol': '.AMD260717C350' } },
    ] },
    { 'expiration-date': '2026-08-21', strikes: [
      { 'strike-price': '350', put: { 'streamer-symbol': '.AMD260821P350' }, call: null },
    ] },
  ] }] } };
}

function makeCtx(opts) {
  opts = opts || {};
  const logs = [];
  const ttCalls = [];
  const renders = { ap: 0, jt: 0 };
  // Controllable debounce timers
  let tid = 0; const timers = new Map();
  const tickerBox = { value: opts.ticker || '' };

  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), warn: () => {}, error: () => {} },
    JSON, Array, Date, String, Object, Promise, Math, parseFloat, isFinite, encodeURIComponent,
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
      return opts.router ? opts.router(t, p) : amdChain();
    },
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, '_fetchOptionChain'),
    extractFn(HTML, '_currentChainTicker'),
    extractFn(HTML, '_fetchAndRenderChain'),
  ].join('\n'), ctx);

  ctx._logs = logs;
  ctx._ttCalls = ttCalls;
  ctx._renders = renders;
  ctx._setTicker = (v) => { tickerBox.value = v; };
  ctx._flushTimers = () => { const fns = [...timers.values()]; timers.clear(); fns.forEach(fn => fn()); };
  ctx._chainPaths = () => ttCalls.slice();
  return ctx;
}

// ── 1 + 2. confirmed AMD fetches /option-chains/AMD once; never A or AM ──────
(async function() {
  const ctx = makeCtx({ ticker: 'AMD' });
  ctx._fetchAndRenderChain('jt');   // simulates onchange after the ticker is committed
  ctx._flushTimers();               // debounce fires
  await micro(); await micro();
  const paths = ctx._chainPaths();
  assert(paths.length === 1 && paths[0] === '/option-chains/AMD/nested',
    '1/2: confirmed AMD fetches /option-chains/AMD/nested exactly once');
  assert(!paths.some(p => p === '/option-chains/A/nested' || p === '/option-chains/AM/nested'),
    '1: partial tickers A / AM are never fetched');
  assert(ctx._renders.jt === 1, '2: leg table re-rendered once after load');
  console.log('✓ 1/2 confirmed AMD -> single /option-chains/AMD/nested, no partials');
})();

// ── 1b. debounce collapses AM→AMD to a single AMD fetch (no partial AM) ──────
(async function() {
  const ctx = makeCtx({ ticker: 'AM' });
  ctx._fetchAndRenderChain('jt');          // AM scheduled
  ctx._setTicker('AMD'); ctx._fetchAndRenderChain('jt');   // supersedes → AMD scheduled, AM timer cleared
  ctx._flushTimers();
  await micro(); await micro();
  const paths = ctx._chainPaths();
  assert(paths.length === 1 && paths[0] === '/option-chains/AMD/nested',
    '1b: rapid AM→AMD collapses to one AMD fetch (AM never hits network)');
  console.log('✓ 1b debounce collapses AM→AMD, AM suppressed');
})();

// ── 3. genuinely stale response (ticker changed mid-flight) is ignored ───────
(async function() {
  // Gate AMD's resolution so we can flip the ticker before it resolves.
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'AMD', router: async (t) => { if (t === 'AMD') { await gate; } return amdChain(); } });
  ctx._fetchAndRenderChain('jt');
  ctx._flushTimers();                 // starts AMD fetch (awaiting gate)
  ctx._setTicker('TSLA');             // user changed ticker while AMD in flight
  release(); await micro(); await micro(); await micro();
  assert(ctx._logs.some(l => l.indexOf('[OPTION CHAIN] stale ignored ticker=AMD current=TSLA') !== -1),
    '3: response for AMD ignored as stale once the input changed to TSLA');
  assert(ctx._renders.jt === 0, '3: stale response does not re-render with wrong-ticker data');
  console.log('✓ 3 stale response (ticker changed mid-flight) ignored');
})();

// ── 4. SAME-ticker double trigger must NOT be flagged stale (the anomaly) ────
(async function() {
  const ctx = makeCtx({ ticker: 'AMD' });
  ctx._fetchAndRenderChain('jt');            // onchange
  ctx._fetchAndRenderChain('jt');            // blur — duplicate trigger, same ticker
  ctx._flushTimers();
  await micro(); await micro(); await micro();
  assert(!ctx._logs.some(l => l.indexOf('stale ignored ticker=AMD current=AMD') !== -1),
    '4: AMD with ticker===current is NEVER marked stale (bug fixed)');
  assert(ctx._optChainCache['AMD'] && ctx._optChainCache['AMD'].expirations.length === 2,
    '4: AMD chain loaded and cached');
  assert(ctx._chainError.jt === null, '4: no error state on a successful load');
  console.log('✓ 4 same-ticker double trigger not mislabelled stale');
})();

// ── 5. timeout/500 for AMD records a form error, keeps ticker, no fallback ───
(async function() {
  const ctx = makeCtx({ ticker: 'AMD', router: async () => { throw new Error('The operation was aborted due to timeout'); } });
  ctx._fetchAndRenderChain('jt');
  ctx._flushTimers();
  await micro(); await micro();
  assert(ctx._chainError.jt && ctx._chainError.jt.ticker === 'AMD' && ctx._chainError.jt.message === 'timeout',
    '5: AMD timeout recorded as { ticker:AMD, message:timeout } for the form banner');
  assert(!ctx._optChainCache['AMD'], '5: no chain cached on failure (no invented expirations)');
  assert(ctx._logs.some(l => l.indexOf('[OPTION CHAIN] error ticker=AMD timeout') !== -1), '5: tagged error log emitted');
  assert(ctx._renders.jt === 1, '5: table re-rendered so the error banner shows');
  console.log('✓ 5 AMD timeout -> form error state, no silent empty dropdown');
})();

// ── 6. manual retry refetches ONLY AMD (bypasses cache), then succeeds ───────
(async function() {
  let mode = 'fail';
  const ctx = makeCtx({ ticker: 'AMD', router: async (t) => {
    if (mode === 'fail') throw new Error('HTTP 500');
    return amdChain();
  } });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await micro(); await micro();
  assert(ctx._chainError.jt && ctx._chainError.jt.ticker === 'AMD', '6: first attempt failed (error set)');
  const before = ctx._chainPaths().length;
  mode = 'ok';
  ctx._fetchAndRenderChain('jt', true);   // manual retry (force) — runs immediately, no debounce
  await micro(); await micro();
  const after = ctx._chainPaths().slice(before);
  assert(after.length === 1 && after[0] === '/option-chains/AMD/nested', '6: retry hits only /option-chains/AMD/nested');
  assert(ctx._chainError.jt === null && ctx._optChainCache['AMD'], '6: retry success clears the error and caches the chain');
  console.log('✓ 6 manual retry refetches only AMD and recovers');
})();

// ── 7. expirations render source is populated when the chain is OK ───────────
(async function() {
  const ctx = makeCtx({ ticker: 'AMD' });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await micro(); await micro();
  const chain = ctx._optChainCache['AMD'];
  assert(chain && JSON.stringify(chain.expirations) === JSON.stringify(['2026-07-17', '2026-08-21']),
    '7: AMD expirations available (sorted) for the dropdown');
  assert(chain.byExp['2026-07-17'].some(s => s.strikePrice === 350 && s.put.streamerSymbol === '.AMD260717P350'),
    '7: strikes + streamer symbols parsed for the selected expiry');
  console.log('✓ 7 expirations + strikes populated for a good AMD chain');
})();

// ── 8. selecting an expiry updates the leg (real handler) ────────────────────
(function() {
  const ctx = {
    console: { log() {} }, JSON, Object, Array,
    _jtFormLegs: [{ type: 'PUT', side: 'SHORT', qty: 1, strike: 350, expiry: null, entryPrice: 1.2, streamerSymbol: null }],
    _renderJtLegsTable: function() {},
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn(HTML, '_onJtLegExpChange'), ctx);
  ctx._onJtLegExpChange(0, '2026-07-17');
  assert(ctx._jtFormLegs[0].expiry === '2026-07-17' && ctx._jtFormLegs[0].expiration === '2026-07-17'
    && ctx._jtFormLegs[0].expirationDate === '2026-07-17',
    '8: _onJtLegExpChange sets leg.expiry + expiration aliases');
  console.log('✓ 8 selecting expiry updates leg.expiry');
})();

// ── 9. streamer symbol generated when ticker/type/strike/expiry complete ─────
//     (works even without chain data — the date-input fallback path).
(function() {
  const tickerBox = { value: 'AMD' };
  const ctx = {
    console: { log() {} }, JSON, String, Date, Math, parseFloat, isFinite, RegExp,
    document: { getElementById: () => tickerBox },
    _jtFormLegs: [{ type: 'PUT', side: 'SHORT', qty: 1, strike: 350, expiry: null, entryPrice: 1.2 }],
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'buildCompactOptionDxlinkSymbol'),
    extractFn(HTML, '_deriveJtLegStreamer'),
  ].join('\n'), ctx);
  assert(ctx._deriveJtLegStreamer(0) === null, '9: no streamer while expiry is missing (stays AUTO)');
  ctx._jtFormLegs[0].expiry = '2026-07-17';
  assert(ctx._deriveJtLegStreamer(0) === '.AMD260717P350',
    '9: streamer symbol generated once ticker/type/strike/expiry are all present');
  console.log('✓ 9 streamer symbol generated when inputs complete (no chain required)');
})();


// ── 10. manual retry bypasses a still-pending auto request ─────────────────
(async function() {
  let releaseAuto;
  const gate = new Promise(res => { releaseAuto = res; });
  let calls = 0;
  const ctx = makeCtx({ ticker: 'CVS', router: async () => {
    calls++;
    if (calls === 1) { await gate; throw new Error('The operation was aborted due to timeout'); }
    return amdChain();
  } });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await micro();
  ctx._fetchAndRenderChain('jt', true); // force retry while first request is still pending
  await micro(); await micro();
  const paths = ctx._chainPaths();
  assert(paths.length === 2 && paths.every(p => p === '/option-chains/CVS/nested'),
    '10: manual retry bypasses pending dedup and sends one fresh backend request');
  assert(ctx._logs.some(l => l.indexOf('force retry bypass pending ticker=CVS') !== -1),
    '10: force retry logs pending bypass');
  releaseAuto(); await micro(); await micro();
  assert(!ctx.S._optChainPending.CVS, '10: pending dedup entry is removed after timeout/error completion');
  console.log('✓ 10 manual retry bypasses stale pending request and cleans up');
})();

// ── 11. duplicate automatic same-ticker calls dedup normally ────────────────
(async function() {
  let release;
  const gate = new Promise(res => { release = res; });
  const ctx = makeCtx({ ticker: 'TEAM', router: async () => { await gate; return amdChain(); } });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await micro();
  ctx._fetchAndRenderChain('jt', false); ctx._flushTimers(); await micro();
  assert(ctx._chainPaths().length === 1, '11: duplicate automatic TEAM request dedups to one backend call');
  assert(ctx._logs.some(l => l.indexOf('option-chain dedup hit ticker=TEAM') !== -1),
    '11: normal dedup logs a dedup hit');
  release(); await micro(); await micro();
  console.log('✓ 11 automatic duplicate requests still dedup');
})();

// ── 12. stale cache fallback is explicit and ticker-specific ────────────────
(async function() {
  let fail = false;
  const ctx = makeCtx({ ticker: 'CVS', router: async () => { if (fail) throw new Error('timeout'); return amdChain(); } });
  ctx._fetchAndRenderChain('jt'); ctx._flushTimers(); await micro(); await micro();
  fail = true;
  ctx._fetchAndRenderChain('jt', true); await micro(); await micro();
  const cached = ctx._optChainCache.CVS;
  assert(cached && cached.source === 'OPTION_CHAIN_CACHE_STALE' && cached.isStale,
    '12: stale cache fallback marks provenance explicitly');
  assert(ctx._chainError.jt && ctx._chainError.jt.stale === true,
    '12: UI state marks stale cache instead of silent live data');
  console.log('✓ 12 stale cache fallback is explicit');
})();

// ── 13. static wiring guards ─────────────────────────────────────────────────
(function() {
  const idx = HTML.indexOf("id=\"jtTicker\"");
  const jtInput = HTML.slice(idx, idx + 1200);   // spans the multi-line concatenated attrs + comments
  assert(jtInput.indexOf("oninput=\"refreshAllJtLegStreamers()\"") !== -1,
    '13: jtTicker oninput does local streamer refresh only (no chain fetch on keystroke)');
  assert(jtInput.indexOf("onchange=\"refreshAllJtLegStreamers();_fetchAndRenderChain(") !== -1,
    '13: jtTicker fetches the chain on onchange (confirm)');
  // The oninput attribute value must not contain a chain fetch (source escapes quotes as \'jt\').
  assert(!/oninput="[^"]*_fetchAndRenderChain/.test(jtInput),
    '13: jtTicker oninput does NOT call _fetchAndRenderChain (no per-keystroke partials)');

  const render = extractFn(HTML, '_renderJtLegsTable');
  assert(render.indexOf('_chainError') !== -1 && render.indexOf('RETRY OPTION CHAIN') !== -1,
    '13: leg table renders the chain error + Retry banner');

  // #287 regression guard: the backend-save confirmation path is untouched.
  const submit = extractFn(HTML, 'submitTrade');
  assert(submit.indexOf('_awaitJournalBackendWrite') !== -1 && submit.indexOf('_journalOutcomeToast') !== -1,
    '13: #287 backend-save-confirm flow still wired in submitTrade');
  console.log('✓ 13 static guards: ticker wiring, error banner, #287 intact');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 200);
