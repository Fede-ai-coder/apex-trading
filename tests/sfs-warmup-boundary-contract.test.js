'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SFS WARMUP — coordinator BOUNDARY contract / pre-extraction pin.
//
// WHY THIS EXISTS
//   The SFS warmup batch coordinator is the next candidate for extraction out of
//   index.html (the pattern already applied to the backend client / backend
//   config / candle normalization / auth gate / provenance / store client /
//   dxlink client / sfs candle predicates). BEFORE any code moves, this test
//   freezes the REAL observable behaviour of the warmup surface — the transport,
//   the batch cap, the debounce, the queue, the drain, the shared state, the
//   diagnostics, the timestamp mutation and the auth asymmetry — so a later
//   extraction PR can only pass if it preserves that behaviour at the seams.
//
//   Its single job is to determine the true boundary between:
//     (1) DXLink warmup transport,      (6) overflow-symbol handling,
//     (2) batch normalization + cap,    (7) queueing,
//     (3) diagnostics,                  (8) timed drain,
//     (4) debounce,                     (9) shared state.
//     (5) last-sent timestamp update,
//   and to answer whether `_sfsWarmupBatch` can be lifted verbatim while leaving
//   queue / state / constants in the monolith, or whether it is too coupled to
//   the coordinator to move on its own.
//
// GOVERNING RULE
//   Protect the CURRENT behaviour, INCLUDING its asymmetries. Do NOT correct it.
//   This test adds NO auth gate to warmup, changes NO cap / debounce / waitMs /
//   timeout / payload / queue / diagnostics / return shape, and does NOT move the
//   `_sfsWarmupLastSentAt` write. It DESCRIBES; it does not refactor.
//
// HOW
//   The REAL functions are loaded from the reconstructed application source via
//   tests/lib/load-app-source.js and executed in a `vm` sandbox with controlled
//   dependencies. Implementations are NEVER copied. There is NO real network
//   (every fetch is a mock), NO real timers (setTimeout is recorded, not fired),
//   NO long real waits, and NO npm dependencies. A fake monotonic clock drives
//   `Date.now()`; fetch is a Promise the test resolves/rejects explicitly.
//
// Run: node tests/sfs-warmup-boundary-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const loader = require('./lib/load-app-source');
const HTML = loader.loadAppJavaScriptSource();

// ── Brace-matching extractor (mirrors the helper used across the suite) ───────
function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0 && (start < 0 || k < start)) start = k; }
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
function section(t) { console.log('\n' + t); }
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + '  [got ' + JSON.stringify(a) + ']'); }

// ── The REAL warmup coordinator ───────────────────────────────────────────────
// The four warmup functions (_sfsWarmupDiag / _sfsQueueWarmupSymbols /
// _sfsDrainWarmupQueue / _sfsWarmupBatch) were extracted VERBATIM to
// js/services/sfs-candle-warmup.js and are loaded BY NAME from the reconstructed
// source below. The mutable STATE (_sfsWarmupLastSentAt / _sfsWarmupQueue /
// _sfsWarmupQueuedKeys / _sfsWarmupDrainTimer) and the CAP/DEBOUNCE constants stay
// declared in the monolith and are sliced from there (constants through just before
// _sfsAnalyzeSymbolTimeframe). _sfsNormSymbolList / _sfsNormTimeframes live in
// js/services/sfs-candle-predicates.js; _backendAuthHeaders in js/api/backend-client.js
// — all loaded by name, never re-implemented here. WARMUP_BLOCK reconstructs the full
// coordinator (state + constants + the four functions) for the structural text checks
// and for the sandbox — the observable behaviour is identical to the pre-extraction slice.
const WARMUP_STATE = HTML.slice(HTML.indexOf('var SFS_WARMUP_BATCH_CAP'), HTML.indexOf('function _sfsAnalyzeSymbolTimeframe'));
const WARMUP_FNS = ['_sfsWarmupDiag', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue', '_sfsWarmupBatch']
  .map(function (n) { return extractFn(HTML, n); }).join('\n');
const WARMUP_BLOCK = WARMUP_STATE + '\n' + WARMUP_FNS;
const REAL_SOURCE =
  extractFn(HTML, '_backendAuthHeaders') + '\n' +
  extractFn(HTML, '_sfsNormSymbolList') + '\n' +
  extractFn(HTML, '_sfsNormTimeframes') + '\n' +
  WARMUP_BLOCK;

// A fresh, fully-isolated sandbox running the REAL coordinator with controlled deps.
//   config.startNow   → initial fake clock value (Date.now)
//   config.S          → backend auth state (default { backendKey:'APIKEY' })
//   config.BACKEND    → base URL (default 'https://backend.test')
//   config.respond    → (call, state) => Promise for fetch; default resolves 200 ok
//   config.recordDiag → override the diagnostics recorder (default records to array)
//   config.gateOpen   → when set, defines _backendCandleGateOpen/Reason in the
//                       sandbox to prove warmup does NOT consult them.
function makeSandbox(config) {
  config = config || {};
  const state = {
    clock: { now: config.startNow != null ? config.startNow : 0 },
    fetchCalls: [], abortTimeouts: [], diagCalls: [], timers: [],
  };
  const fetchImpl = function (url, opts) {
    const call = {
      url: url,
      method: opts && opts.method,
      headers: opts && opts.headers,
      cache: opts && opts.cache,
      signal: opts && opts.signal,
      rawBody: opts && opts.body,
      body: (opts && typeof opts.body === 'string') ? JSON.parse(opts.body) : null,
    };
    state.fetchCalls.push(call);
    if (typeof config.respond === 'function') return config.respond(call, state);
    return Promise.resolve(config.response || { ok: true, status: 200 });
  };
  const sandbox = {
    JSON: JSON, Object: Object, Math: Math,
    Date: { now: function () { return state.clock.now; } },
    BACKEND: config.BACKEND !== undefined ? config.BACKEND : 'https://backend.test',
    S: config.S !== undefined ? config.S : { backendKey: 'APIKEY' },
    AbortSignal: { timeout: function (ms) { state.abortTimeouts.push(ms); return { __abortTimeout: ms }; } },
    _recordCandleSubscriptionRequest: config.recordDiag || function (m) { state.diagCalls.push(m); return null; },
    setTimeout: function (fn, ms) { state.timers.push({ fn: fn, ms: ms }); return state.timers.length; },
    clearTimeout: function () {},
    fetch: fetchImpl,
  };
  if (config.gateOpen !== undefined) {
    sandbox._backendCandleGateOpen = function () { return config.gateOpen; };
    sandbox._backendCandleGateReason = function () { return config.gateReason || 'gate_closed'; };
  }
  vm.createContext(sandbox);
  vm.runInContext(REAL_SOURCE, sandbox);
  state.sandbox = sandbox;
  return state;
}
function diagActions(state) { return state.diagCalls.map(function (d) { return d.action; }); }
function flush() { return new Promise(function (r) { setImmediate(r); }); }
// Realistic epoch base for the fake clock. The debounce compares now against
// _sfsWarmupLastSentAt (initial 0); in production Date.now() (~1.7e12) is always
// >> the 10000ms window, so the FIRST large batch always sends. Seeding the fake
// clock well above the window reproduces that; deltas from BASE_NOW then exercise
// the cooldown boundary exactly.
const BASE_NOW = 1700000000000;

// ─────────────────────────────────────────────────────────────────────────────
// PREPARATORY MANIFEST — the boundary this PR pins (NOT the extraction itself).
// Every symbol below is asserted (location + non-existence of future modules) in
// section 0. Categories mirror the audit taxonomy.
// ─────────────────────────────────────────────────────────────────────────────
const MANIFEST = {
  PREDICATES_MODULE: {   // already extracted → js/services/sfs-candle-predicates.js
    file: 'js/services/sfs-candle-predicates.js',
    symbols: ['_sfsNormSymbolList', '_sfsNormTimeframes', '_sfsCandlesUsable', '_sfsCandleSubLimitActive'],
  },
  WARMUP_DIAGNOSTIC: { category: 'DIAGNOSTIC_HELPER', symbols: ['_sfsWarmupDiag'] },       // sfs-candle-warmup.js
  WARMUP_BATCH:      { category: 'BATCH_COORDINATOR', symbols: ['_sfsWarmupBatch'] },      // sfs-candle-warmup.js
  QUEUE:             { category: 'QUEUE', symbols: ['_sfsQueueWarmupSymbols'] },           // sfs-candle-warmup.js
  QUEUE_DRAIN:       { category: 'QUEUE_DRAIN', symbols: ['_sfsDrainWarmupQueue'] },       // sfs-candle-warmup.js
  STATE:             { category: 'STATE', symbols: ['_sfsWarmupLastSentAt', '_sfsWarmupQueue', '_sfsWarmupQueuedKeys', '_sfsWarmupDrainTimer'] }, // monolith
  CONSTANTS:         { category: 'CONSTANT', symbols: ['SFS_WARMUP_BATCH_CAP', 'SFS_WARMUP_DEBOUNCE_MS'] }, // monolith
  EXCLUDED:          { note: 'NOT referenced by the warmup block — deliberately absent', symbols: ['_backendCandleGateOpen', '_backendCandleGateReason', '_sfsWarmupRunning', 'debugLog', 'debugWarn'] },
};
// Modules that must NOT exist (this PR extracts ONLY the warmup coordinator into
// js/services/sfs-candle-warmup.js; no leaf HTTP client, orchestrator, service or
// state module is introduced).
const FUTURE_MODULES = [
  'js/services/candle-warmup-client.js',
  'js/services/sfs-candle-orchestrator.js',
  'js/services/candle-service.js',
  'js/services/candle-state.js',
];

async function main() {
  const ordered = loader.loadOrderedScriptSources();
  const inlineMonolith = ordered.filter(function (s) { return s.kind === 'inline' && s.isAppJs; }).map(function (s) { return s.code; }).join('\n');
  const localTags = ordered.filter(function (s) { return s.kind === 'local'; }).map(function (s) { return s.src; });
  const PRED_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-predicates.js');
  const PRED_SRC = fs.readFileSync(PRED_PATH, 'utf8');
  const rawIndex = loader.loadIndexHtml();

  // ═══════════════════════════════════════════════════════════════════════════
  section('0. STRUCTURAL MANIFEST — coordinator extracted to sfs-candle-warmup.js; state + constants stay in the monolith');
  // ═══════════════════════════════════════════════════════════════════════════
  // 0a. No OTHER future/application module has been created by this PR (leaf HTTP
  //     client / orchestrator / service / state module all still absent).
  FUTURE_MODULES.forEach(function (rel) {
    const p = path.resolve(__dirname, '..', rel);
    ok(fs.existsSync(p) === false, '0: ' + rel + ' does NOT exist');
    const base = path.basename(rel);
    ok(rawIndex.indexOf(base) === -1, '0: index.html does not reference ' + base);
    ok(localTags.indexOf('./' + rel) === -1, '0: no <script src> loads ' + rel);
  });

  // 0b. The four predicates live in the already-extracted predicates module…
  MANIFEST.PREDICATES_MODULE.symbols.forEach(function (name) {
    ok(PRED_SRC.indexOf('function ' + name + '(') !== -1, '0: predicate ' + name + ' lives in sfs-candle-predicates.js');
    ok(inlineMonolith.indexOf('function ' + name + '(') === -1, '0: predicate ' + name + ' NOT duplicated in monolith');
  });
  ok(localTags.indexOf('./js/services/sfs-candle-predicates.js') !== -1, '0: predicates module is loaded by index.html');

  // 0c. EXTRACTION — the four warmup functions now live in a classic module
  //     js/services/sfs-candle-warmup.js, loaded AFTER sfs-candle-predicates.js and
  //     BEFORE the inline monolith. The move is PHYSICAL only: state + constants stay
  //     in the monolith (0d); endpoint / payload / diagnostics / return shapes unchanged.
  const WARMUP_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-warmup.js');
  const WARMUP_TAG = './js/services/sfs-candle-warmup.js';
  const WARMUP_FOUR = ['_sfsWarmupDiag', '_sfsWarmupBatch', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue'];

  // (1) module file exists.
  ok(fs.existsSync(WARMUP_PATH), '0: js/services/sfs-candle-warmup.js exists');
  const WARMUP_SRC = fs.existsSync(WARMUP_PATH) ? fs.readFileSync(WARMUP_PATH, 'utf8') : '';

  // (2) exactly one <script src> tag for it in index.html.
  const warmupTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-warmup\.js["'][^>]*>/gi) || [];
  ok(warmupTags.length === 1, '0: exactly one sfs-candle-warmup.js <script> tag in index.html');
  const theWarmupTag = warmupTags[0] || '';

  // (3)(4) the tag is a classic script: no type=module, no async, no defer.
  ok(!/type\s*=\s*["']?module/i.test(theWarmupTag), '0: sfs-candle-warmup tag is classic (no type=module)');
  ok(!/\basync\b/i.test(theWarmupTag), '0: sfs-candle-warmup tag has no async attribute');
  ok(!/\bdefer\b/i.test(theWarmupTag), '0: sfs-candle-warmup tag has no defer attribute');

  // (5)(6)(7) load order: AFTER sfs-candle-predicates.js, BEFORE the inline monolith; loader includes it.
  const warmupEntry = ordered.filter(function (s) { return s.kind === 'local' && s.src === WARMUP_TAG; })[0];
  const predEntry = ordered.filter(function (s) { return s.kind === 'local' && s.src === './js/services/sfs-candle-predicates.js'; })[0];
  const firstInline = ordered.filter(function (s) { return s.kind === 'inline' && s.isAppJs; })[0];
  ok(!!warmupEntry, '0: sfs-candle-warmup.js is a local classic script in the load order');
  ok(!!predEntry && !!warmupEntry && predEntry.order < warmupEntry.order, '0: sfs-candle-warmup.js loads AFTER sfs-candle-predicates.js');
  ok(!!warmupEntry && !!firstInline && warmupEntry.order < firstInline.order, '0: sfs-candle-warmup.js loads BEFORE the inline monolith');
  ok(localTags.indexOf(WARMUP_TAG) !== -1, '0: loader includes sfs-candle-warmup.js in the reconstructed source');

  // (8)(9)(10) each of the four functions: present in the module, absent from the residual
  //            inline monolith, exactly one overall definition, and NOT in the predicates module.
  WARMUP_FOUR.forEach(function (name) {
    const reAll = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g');
    ok((WARMUP_SRC.match(reAll) || []).length === 1, '0: ' + name + ' defined in sfs-candle-warmup.js');
    ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + name + ' NOT defined in the residual inline monolith');
    ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + name + ' in reconstructed source');
    ok(PRED_SRC.indexOf('function ' + name + '(') === -1, '0: ' + name + ' NOT in predicates module');
  });

  // (12) the module declares NO warmup state or constants — they stay in the monolith.
  ok(!/\bvar\s+_sfsWarmup\w*\s*=/.test(WARMUP_SRC) && !/\bvar\s+SFS_WARMUP_\w+\s*=/.test(WARMUP_SRC),
     '0: sfs-candle-warmup.js declares NO warmup state or CAP/DEBOUNCE constants (they stay in the monolith)');

  // (13) the module contains ONLY the four declarations + comments — no top-level executable
  //      code. Strip comments, remove the four bodies, expect only whitespace.
  const WARMUP_SRC_NC = stripComments(WARMUP_SRC);
  let warmupResidual = WARMUP_SRC_NC;
  WARMUP_FOUR.forEach(function (name) { warmupResidual = warmupResidual.replace(extractFn(WARMUP_SRC_NC, name), ''); });
  ok(warmupResidual.trim() === '', '0: sfs-candle-warmup.js has ONLY the four declarations + comments (no top-level executable code)');

  // (14) no UI / DOM access in the module.
  ok(!/\bdocument\.|\bwindow\.|querySelector|innerHTML|addEventListener|getElementById/.test(WARMUP_SRC),
     '0: sfs-candle-warmup.js has no UI / DOM access');

  // (15) no generic / detail-4H / SPY read orchestrators (or the read primitive) leaked into the module.
  ['_sfsEnsureChartData', '_sfsEnsureTfCandles', '_sfsEnsureDetail4hCandles', '_sfsSpyReadOnly', '_sfsFetchBackendCandles'].forEach(function (n) {
    ok(WARMUP_SRC.indexOf('function ' + n + '(') === -1, '0: sfs-candle-warmup.js does NOT contain read orchestrator/primitive: ' + n);
  });

  // Classic-script hygiene: no module syntax, no pragma, no require, no window.* export.
  ok(WARMUP_SRC.indexOf("'use strict'") === -1 && WARMUP_SRC.indexOf('"use strict"') === -1, '0: sfs-candle-warmup.js has no "use strict" pragma');
  ok(!/\bimport\b/.test(WARMUP_SRC) && !/\bexport\b/.test(WARMUP_SRC), '0: sfs-candle-warmup.js has no import/export');
  ok(WARMUP_SRC.indexOf('require(') === -1, '0: sfs-candle-warmup.js has no require(');
  ok(!/window\.\w+\s*=/.test(WARMUP_SRC), '0: sfs-candle-warmup.js has no window.* export');

  // 0d. Constants + state declarations still in the monolith, not in predicates.
  MANIFEST.CONSTANTS.symbols.concat(MANIFEST.STATE.symbols).forEach(function (name) {
    ok(new RegExp('var\\s+' + name + '\\s*=').test(inlineMonolith), '0: ' + name + ' declared (var) in the monolith');
    ok(new RegExp('var\\s+' + name + '\\s*=').test(PRED_SRC) === false, '0: ' + name + ' NOT declared in predicates module');
  });

  // 0e. EXCLUDED symbols are genuinely absent from the warmup block body.
  const BLOCK_NC = stripComments(WARMUP_BLOCK);
  MANIFEST.EXCLUDED.symbols.forEach(function (name) {
    ok(BLOCK_NC.indexOf(name) === -1, '0: EXCLUDED symbol ' + name + ' is NOT referenced by the warmup block');
  });
  // The read primitive DOES gate — pin the asymmetry structurally (block absence vs read presence).
  ok(stripComments(extractFn(HTML, '_sfsFetchBackendCandles')).indexOf('_backendCandleGateOpen') !== -1,
     '0: read primitive _sfsFetchBackendCandles DOES reference the auth gate (asymmetry baseline)');

  // ═══════════════════════════════════════════════════════════════════════════
  section('1. INPUT CONTRACT — normalization delegated to the extracted predicates');
  // ═══════════════════════════════════════════════════════════════════════════
  // The warmup block must NOT re-implement normalization (no trim/uppercase of its own).
  ok(/_sfsNormSymbolList\(\s*symbols\s*\)/.test(BLOCK_NC), '1: _sfsWarmupBatch calls _sfsNormSymbolList(symbols)');
  ok(/_sfsNormTimeframes\(\s*timeframes\s*\)/.test(BLOCK_NC), '1: _sfsWarmupBatch calls _sfsNormTimeframes(timeframes)');
  ok(BLOCK_NC.indexOf('toUpperCase') === -1 && BLOCK_NC.indexOf('.trim(') === -1, '1: warmup block does NOT duplicate normalization logic');

  async function sentSymbolsFor(symbols, timeframes, opts) {
    const h = makeSandbox({});
    const r = await h.sandbox._sfsWarmupBatch(symbols, timeframes, opts);
    return { r: r, fetch: h.fetchCalls, diag: h.diagCalls };
  }
  { const o = await sentSymbolsFor('spy', '1d'); eq(o.fetch[0].body.symbols, ['SPY'], '1: single string symbol → ["SPY"] (upper)'); eq(o.fetch[0].body.timeframes, ['1D'], '1: single tf "1d" → ["1D"]'); }
  { const o = await sentSymbolsFor(['a', 'b'], ['1D', '30M']); eq(o.fetch[0].body.symbols, ['A', 'B'], '1: array symbols normalized'); eq(o.fetch[0].body.timeframes, ['1D', '30M'], '1: multiple timeframes preserved in order'); }
  { const o = await sentSymbolsFor(null, ['1D']); ok(o.fetch.length === 0 && o.r.reason === 'no_symbols_or_timeframes', '1: null symbols → skip, no fetch'); }
  { const o = await sentSymbolsFor(undefined, ['1D']); ok(o.fetch.length === 0 && o.r.reason === 'no_symbols_or_timeframes', '1: undefined symbols → skip'); }
  { const o = await sentSymbolsFor([], ['1D']); ok(o.fetch.length === 0 && o.r.reason === 'no_symbols_or_timeframes', '1: empty array → skip'); }
  { const o = await sentSymbolsFor(['  ', '', null], ['1D']); ok(o.fetch.length === 0, '1: all-blank symbols → skip'); }
  { const o = await sentSymbolsFor(['AAA'], []); ok(o.fetch.length === 0 && o.r.reason === 'no_symbols_or_timeframes', '1: empty timeframes → skip'); }
  { const o = await sentSymbolsFor([' spy ', 'SPY', 'spy'], '1D'); eq(o.fetch[0].body.symbols, ['SPY'], '1: trim + dedup + upper collapses duplicates'); }
  { const o = await sentSymbolsFor(['b', 'a', 'c'], '1D'); eq(o.fetch[0].body.symbols, ['B', 'A', 'C'], '1: symbol order is preserved (not sorted)'); }
  { const o = await sentSymbolsFor(['brk.b'], '1D'); eq(o.fetch[0].body.symbols, ['BRK.B'], '1: dotted symbol preserved'); }
  { const o = await sentSymbolsFor(['^vix'], '1D'); eq(o.fetch[0].body.symbols, ['^VIX'], '1: caret symbol preserved'); }
  { const o = await sentSymbolsFor([123, true], '1D'); eq(o.fetch[0].body.symbols, ['123', 'TRUE'], '1: non-string symbols coerced via String()'); }
  { const o = await sentSymbolsFor('SPY', ['1D', '1d']); eq(o.fetch[0].body.timeframes, ['1D'], '1: duplicate timeframes deduped'); }
  { const o = await sentSymbolsFor('SPY', ['XYZ']); eq(o.fetch[0].body.timeframes, ['XYZ'], '1: UNKNOWN timeframe kept verbatim (no validation)'); }
  { const o1 = await sentSymbolsFor('SPY', '1D'); ok(o1.r.ok === true, '1: opts absent → ok'); }
  { const o2 = await sentSymbolsFor('SPY', '1D', null); ok(o2.r.ok === true, '1: opts null → ok (opts = opts || {})'); }
  { const o3 = await sentSymbolsFor('SPY', '1D', {}); ok(o3.r.ok === true, '1: opts {} → ok'); }
  { const o = await sentSymbolsFor('SPY', '1D', { reason: 'my_reason', extra: 1 }); const s = o.diag.find(function (d) { return d.action === 'sent'; }); ok(s && s.reason === 'my_reason', '1: opts.reason threads to diagnostics; extra props ignored'); }

  // ═══════════════════════════════════════════════════════════════════════════
  section('2. BATCH CAP CONTRACT — SFS_WARMUP_BATCH_CAP read from code, then pinned');
  // ═══════════════════════════════════════════════════════════════════════════
  const CAP = makeSandbox({}).sandbox.SFS_WARMUP_BATCH_CAP;
  ok(CAP === 3, '2: SFS_WARMUP_BATCH_CAP (read from code) === 3');
  async function capCase(n) {
    const syms = Array.from({ length: n }, function (_, i) { return 'S' + i; });
    const h = makeSandbox({});
    const r = await h.sandbox._sfsWarmupBatch(syms, ['1D'], { priority: true }); // priority → immediate, isolates cap from debounce
    return { r: r, fetch: h.fetchCalls };
  }
  { const c = await capCase(0); ok(c.fetch.length === 0, '2: 0 symbols → no fetch'); }
  { const c = await capCase(1); eq(c.fetch[0].body.symbols, ['S0'], '2: 1 symbol → sent [S0]'); eq(c.r.sentSymbols, ['S0'], '2: 1 → sentSymbols [S0]'); eq(c.r.deferredSymbols, [], '2: 1 → no deferred'); }
  { const c = await capCase(2); eq(c.r.sentSymbols, ['S0', 'S1'], '2: 2 symbols → both sent'); eq(c.r.deferredSymbols, [], '2: 2 → no deferred'); }
  { const c = await capCase(3); eq(c.r.sentSymbols, ['S0', 'S1', 'S2'], '2: 3 symbols → all 3 sent (at cap)'); eq(c.r.deferredSymbols, [], '2: 3 → no deferred'); }
  { const c = await capCase(4); eq(c.r.sentSymbols, ['S0', 'S1', 'S2'], '2: 4 symbols → first 3 sent'); eq(c.r.deferredSymbols, ['S3'], '2: 4 → 1 deferred'); eq(c.fetch[0].body.symbols, ['S0', 'S1', 'S2'], '2: 4 → POST carries only 3'); }
  { const c = await capCase(6); eq(c.r.sentSymbols, ['S0', 'S1', 'S2'], '2: 6 symbols → first 3 sent'); eq(c.r.deferredSymbols, ['S3', 'S4', 'S5'], '2: 6 → 3 deferred, in order'); }
  { const c = await capCase(7); eq(c.r.sentSymbols, ['S0', 'S1', 'S2'], '2: 7 symbols → first 3 sent'); eq(c.r.deferredSymbols, ['S3', 'S4', 'S5', 'S6'], '2: 7 → 4 deferred, in order'); }
  { // duplicates dropping below cap → no deferral, no lost/dup symbol
    const h = makeSandbox({});
    const r = await h.sandbox._sfsWarmupBatch(['A', 'A', 'B', 'b', 'C'], ['1D'], { priority: true });
    eq(r.sentSymbols, ['A', 'B', 'C'], '2: dup-collapsed set (5→3 unique) all sent, none lost/dup');
    eq(r.deferredSymbols, [], '2: dup-collapsed set has no deferral');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('3. DEBOUNCE CONTRACT — SFS_WARMUP_DEBOUNCE_MS read from code; controlled clock');
  // ═══════════════════════════════════════════════════════════════════════════
  const DEBOUNCE = makeSandbox({}).sandbox.SFS_WARMUP_DEBOUNCE_MS;
  ok(DEBOUNCE === 10000, '3: SFS_WARMUP_DEBOUNCE_MS (read from code) === 10000');
  // Only LARGE (>cap) non-priority batches with >=2 capped symbols are debounced.
  async function twoLargeAt(gapMs) {
    const h = makeSandbox({ startNow: BASE_NOW });
    const big = ['A', 'B', 'C', 'D']; // 4 > cap → large
    const r1 = await h.sandbox._sfsWarmupBatch(big, ['1D']);
    h.clock.now = BASE_NOW + gapMs;
    const r2 = await h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D']);
    return { h: h, r1: r1, r2: r2 };
  }
  { const t = await twoLargeAt(0); ok(t.r1.ok === true && t.h.fetchCalls.length === 1, '3: first large batch sends immediately'); ok(t.r2.reason === 'cooldown_blocked', '3: immediate follow-up large batch → cooldown_blocked'); ok(t.h.fetchCalls.length === 1, '3: cooldown-blocked batch does NOT fetch'); }
  { const t = await twoLargeAt(9999); ok(t.r2.reason === 'cooldown_blocked', '3: 1ms before threshold (9999<10000) → still blocked'); }
  { const t = await twoLargeAt(10000); ok(t.r2.ok === true && t.h.fetchCalls.length === 2, '3: exactly at threshold (>=10000) → allowed'); }
  { const t = await twoLargeAt(10001); ok(t.r2.ok === true, '3: 1ms after threshold → allowed'); }
  { // small batch is never debounced regardless of recent send
    const h = makeSandbox({ startNow: BASE_NOW });
    await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); // large → sets lastSentAt
    const r = await h.sandbox._sfsWarmupBatch(['X', 'Y'], ['1D']); // small (<=cap) inside window
    ok(r.ok === true && h.fetchCalls.length === 2, '3: small batch inside cooldown window still sends (debounce is large-only)');
  }
  { // priority bypasses debounce
    const h = makeSandbox({ startNow: BASE_NOW });
    await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']);
    const r = await h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D'], { priority: true });
    ok(r.ok === true && h.fetchCalls.length === 2, '3: priority large batch bypasses debounce');
  }
  { // debounce is GLOBAL — a different reason / different symbols / different tf is still blocked
    const h = makeSandbox({ startNow: BASE_NOW });
    await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], { reason: 'r1' });
    const rSym = await h.sandbox._sfsWarmupBatch(['W', 'X', 'Y', 'Z'], ['1D'], { reason: 'r1' });
    ok(rSym.reason === 'cooldown_blocked', '3: different symbols, same window → still blocked (debounce not per-symbol)');
    const h2 = makeSandbox({ startNow: BASE_NOW });
    await h2.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], { reason: 'r1' });
    const rReason = await h2.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D'], { reason: 'r2' });
    ok(rReason.reason === 'cooldown_blocked', '3: different reason, same window → still blocked (debounce not per-reason)');
    const h3 = makeSandbox({ startNow: BASE_NOW });
    await h3.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']);
    const rTf = await h3.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['30M']);
    ok(rTf.reason === 'cooldown_blocked', '3: different timeframe, same window → still blocked (debounce not per-timeframe)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('4. TRANSPORT CONTRACT — endpoint / method / headers / body / cache / timeout');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const h = makeSandbox({ S: { backendKey: 'APIKEY' } });
    await h.sandbox._sfsWarmupBatch(['a', 'b', 'c', 'd'], ['1D', '30M'], { priority: true });
    const c = h.fetchCalls[0];
    ok(c.url === 'https://backend.test/dev/market/candles-dxlink/warmup', '4: endpoint = BACKEND + /dev/market/candles-dxlink/warmup');
    ok(c.method === 'POST', '4: method POST');
    ok(c.headers['Content-Type'] === 'application/json', '4: Content-Type: application/json header');
    ok(c.headers['x-api-key'] === 'APIKEY', '4: real _backendAuthHeaders adds x-api-key when S.backendKey present');
    ok(c.cache === 'no-store', "4: cache: 'no-store'");
    ok(c.signal && c.signal.__abortTimeout === 30000, '4: AbortSignal.timeout(30000) — real fetch timeout is 30000ms');
    ok(h.abortTimeouts.length === 1 && h.abortTimeouts[0] === 30000, '4: exactly one AbortSignal.timeout(30000)');
    eq(Object.keys(c.body).sort(), ['symbols', 'timeframes', 'waitMs'], '4: payload keys are exactly {symbols,timeframes,waitMs} — no extra fields');
    eq(c.body.symbols, ['A', 'B', 'C'], '4: payload symbols are the capped set');
    eq(c.body.timeframes, ['1D', '30M'], '4: payload timeframes preserved');
    ok(c.body.waitMs === 15000 && typeof c.body.waitMs === 'number', '4: payload waitMs === 15000 (number) — distinct from the 30000ms timeout');
    ok(h.fetchCalls.length === 1, '4: exactly one fetch per send');
  }
  { // no fetch when skipped / debounced
    const skip = makeSandbox({}); await skip.sandbox._sfsWarmupBatch([], ['1D']); ok(skip.fetchCalls.length === 0, '4: skipped input → zero fetch');
    const cd = makeSandbox({ startNow: BASE_NOW }); await cd.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); await cd.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D']); ok(cd.fetchCalls.length === 1, '4: debounced batch adds no fetch (first sends, second blocked)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('5. AUTH ASYMMETRY — warmup POST has NO gate; the read primitive DOES (pinned, not fixed)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Warmup: gate defined in sandbox but CLOSED → warmup still fetches (ignores gate).
    const h = makeSandbox({ gateOpen: false, gateReason: 'backend_auth_not_ready' });
    const r = await h.sandbox._sfsWarmupBatch(['A', 'B', 'C'], ['1D']);
    ok(h.fetchCalls.length === 1 && r.ok === true, '5: warmup POST fetches even when _backendCandleGateOpen()===false (no gate)');
  }
  {
    // Read primitive: same closed gate → returns early, NO fetch.
    const readSandbox = {
      JSON: JSON, Object: Object, Math: Math, Number: Number, isFinite: isFinite, parseFloat: parseFloat,
      Date: { now: function () { return 0; } },
      BACKEND: 'https://backend.test',
      AbortSignal: { timeout: function () { return undefined; } },
      _backendAuthHeaders: function () { return {}; },
      _backendCandleGateOpen: function () { return false; },
      _backendCandleGateReason: function () { return 'backend_auth_not_ready'; },
      // _recordCandleProvenance intentionally undefined → guarded call is skipped.
      fetch: function () { readFetches++; return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({}); } }); },
    };
    var readFetches = 0;
    vm.createContext(readSandbox);
    vm.runInContext(extractFn(HTML, '_sfsFetchBackendCandles'), readSandbox);
    const rr = await readSandbox._sfsFetchBackendCandles('SPY', '1D');
    ok(readFetches === 0, '5: read primitive _sfsFetchBackendCandles does NOT fetch when gate is closed');
    ok(rr.ok === false && rr.reason === 'backend_auth_not_ready', '5: read primitive returns the gate reason instead of fetching');
  }
  { // missing credentials → warmup still fetches; header simply omits x-api-key (no gate, no throw)
    const h = makeSandbox({ S: {} });
    const r = await h.sandbox._sfsWarmupBatch(['A'], ['1D']);
    ok(h.fetchCalls.length === 1 && r.ok === true, '5: warmup fetches with missing backendKey');
    ok(!('x-api-key' in h.fetchCalls[0].headers), '5: header omits x-api-key when S.backendKey absent');
  }
  { // 401 / 403 from warmup are passed through (ok:false, status) — no auth-state latching, no throw
    const h401 = makeSandbox({ response: { ok: false, status: 401 } });
    const r401 = await h401.sandbox._sfsWarmupBatch(['A'], ['1D']);
    eq({ ok: r401.ok, status: r401.status }, { ok: false, status: 401 }, '5: warmup 401 → {ok:false,status:401} (no gate side-effects)');
    const h403 = makeSandbox({ response: { ok: false, status: 403 } });
    const r403 = await h403.sandbox._sfsWarmupBatch(['A'], ['1D']);
    eq({ ok: r403.ok, status: r403.status }, { ok: false, status: 403 }, '5: warmup 403 → {ok:false,status:403}');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('6. DIAGNOSTIC CONTRACT — _sfsWarmupDiag fields + the exact set of actions');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const h = makeSandbox({});
    await h.sandbox._sfsWarmupBatch(['a', 'b', 'c', 'd', 'e'], ['1D', '30M'], { priority: true, reason: 'chart_open', context: { view: 'sfs' } });
    const sent = h.diagCalls.find(function (d) { return d.action === 'sent'; });
    const queued = h.diagCalls.find(function (d) { return d.action === 'queued'; });
    ok(sent.requester === '_sfsWarmupBatch', '6: diag.requester === _sfsWarmupBatch');
    ok(sent.reason === 'chart_open', '6: diag.reason threads opts.reason');
    ok(sent.eventType === 'Candle', "6: diag.eventType === 'Candle'");
    eq(sent.symbols, ['A', 'B', 'C'], '6: diag.symbols = capped set');
    eq(sent.timeframes, ['1D', '30M'], '6: diag.timeframes preserved');
    ok(sent.requestedSymbolsCount === 3, '6: diag.requestedSymbolsCount = capped length');
    ok(sent.detail === 'POST /dev/market/candles-dxlink/warmup', '6: sent.detail records the endpoint');
    ok(sent.context.originalRequestedSymbolsCount === 5 && sent.context.cap === 3 && sent.context.deferredSymbolCount === 2, '6: sent.context carries original/cap/deferred counts');
    ok(sent.context.view === 'sfs', '6: caller context is merged into diag.context');
    ok(queued && /capped_to_3; deferred=2; queued=/.test(queued.detail), '6: queued.detail records cap + deferred + queued counts');
  }
  { // the ONLY actions emitted are skipped / queued / cooldown_blocked / sent
    const emitted = {};
    const sk = makeSandbox({}); await sk.sandbox._sfsWarmupBatch([], ['1D']); diagActions(sk).forEach(function (a) { emitted[a] = 1; });
    const se = makeSandbox({}); await se.sandbox._sfsWarmupBatch(['A'], ['1D']); diagActions(se).forEach(function (a) { emitted[a] = 1; });
    const lg = makeSandbox({ startNow: BASE_NOW }); await lg.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); await lg.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D']); diagActions(lg).forEach(function (a) { emitted[a] = 1; });
    eq(Object.keys(emitted).sort(), ['cooldown_blocked', 'queued', 'sent', 'skipped'], '6: exact action set = {skipped,queued,cooldown_blocked,sent} — no success/error/drain action');
    ok('skipped' in emitted, '6: empty input emits action=skipped');
  }
  { // NO diagnostics AFTER the fetch resolves/rejects (success and error alike)
    const okc = makeSandbox({ response: { ok: true, status: 200 } });
    await okc.sandbox._sfsWarmupBatch(['A'], ['1D']);
    ok(diagActions(okc).indexOf('sent') !== -1 && diagActions(okc).filter(function (a) { return a === 'sent'; }).length === 1, '6: success path records exactly one sent (no post-fetch success diag)');
    const errc = makeSandbox({ respond: function () { return Promise.reject(new Error('boom')); } });
    await errc.sandbox._sfsWarmupBatch(['A'], ['1D']);
    ok(diagActions(errc).length === 1 && diagActions(errc)[0] === 'sent', '6: network error records NO extra diag (only the pre-fetch sent)');
  }
  { // real recorder is internally guarded → a failing diag dependency cannot throw
    const guardSandbox = { JSON: JSON, Object: Object, Date: { now: function () { return 0; } }, _candleDiagSubscriptionState: function () { throw new Error('inner'); }, _candleDiagSymbolsPreview: function () { return { symbols: [], truncated: false, total: 0 }; }, _candleDiagNowIso: function () { return 'iso'; }, _candleSubDiagLog: [], _CANDLE_SUB_DIAG_MAX: 100 };
    vm.createContext(guardSandbox);
    vm.runInContext(extractFn(HTML, '_recordCandleSubscriptionRequest'), guardSandbox);
    let threw = false, ret;
    try { ret = guardSandbox._recordCandleSubscriptionRequest({ action: 'sent' }); } catch (e) { threw = true; }
    ok(threw === false && ret === null, '6: real _recordCandleSubscriptionRequest swallows internal errors (returns null, never throws)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('7. HTTP + ERROR CONTRACT — status pass-through; body NEVER parsed; errors NOT unified with reads');
  // ═══════════════════════════════════════════════════════════════════════════
  ok(BLOCK_NC.indexOf('.json(') === -1 && BLOCK_NC.indexOf('.text(') === -1, '7: warmup never reads the response body (no .json()/.text())');
  async function httpCase(status, extra) {
    const resp = Object.assign({ ok: status >= 200 && status < 300, status: status }, extra || {});
    const h = makeSandbox({ response: resp });
    const r = await h.sandbox._sfsWarmupBatch(['A', 'B'], ['1D'], { priority: true });
    return { r: r, h: h };
  }
  const twoXX = [200, 202, 204];
  for (const st of twoXX) { const c = await httpCase(st); eq({ ok: c.r.ok, status: c.r.status }, { ok: true, status: st }, '7: HTTP ' + st + ' → {ok:true,status:' + st + '}'); ok(!('reason' in c.r), '7: HTTP ' + st + ' carries no reason field'); eq(c.r.sentSymbols, ['A', 'B'], '7: HTTP ' + st + ' sentSymbols pinned'); }
  const errXX = [400, 401, 403, 404, 429, 500, 503];
  for (const st of errXX) { const c = await httpCase(st); eq({ ok: c.r.ok, status: c.r.status }, { ok: false, status: st }, '7: HTTP ' + st + ' → {ok:false,status:' + st + '} (NO throw, NO reason)'); ok(!('reason' in c.r), '7: HTTP ' + st + ' has no reason (not unified with read http_' + st + ')'); eq(c.r.deferredSymbols, [], '7: HTTP ' + st + ' deferredSymbols pinned'); }
  { // valid JSON / invalid JSON / empty body all behave identically (body ignored)
    const good = await httpCase(200, { json: function () { return Promise.resolve({ any: 1 }); } });
    const bad = await httpCase(200, { json: function () { throw new Error('parse'); } });
    const empty = await httpCase(204, {});
    eq({ ok: good.r.ok, status: good.r.status }, { ok: true, status: 200 }, '7: valid-JSON body → unchanged (body not read)');
    eq({ ok: bad.r.ok, status: bad.r.status }, { ok: true, status: 200 }, '7: invalid-JSON body → unchanged (body not read → no json_parse reason)');
    eq({ ok: empty.r.ok, status: empty.r.status }, { ok: true, status: 204 }, '7: empty body (204) → unchanged');
  }
  { // network error / abort / timeout → caught, reason = warmup:<message>
    const net = makeSandbox({ respond: function () { return Promise.reject(new Error('network down')); } });
    const rn = await net.sandbox._sfsWarmupBatch(['A', 'B'], ['1D'], { priority: true });
    eq({ ok: rn.ok, reason: rn.reason }, { ok: false, reason: 'warmup:network down' }, '7: network reject → {ok:false, reason:"warmup:network down"}');
    eq(rn.sentSymbols, ['A', 'B'], '7: network error still reports sentSymbols');
    const ab = makeSandbox({ respond: function () { return Promise.reject(new Error('The operation was aborted')); } });
    const ra = await ab.sandbox._sfsWarmupBatch(['A'], ['1D'], { priority: true });
    ok(ra.ok === false && ra.reason === 'warmup:The operation was aborted', '7: abort/timeout → warmup:<abort message>');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('8. RETURN SHAPE CONTRACT — every real shape pinned, no common envelope');
  // ═══════════════════════════════════════════════════════════════════════════
  { const h = makeSandbox({}); const r = await h.sandbox._sfsWarmupBatch([], ['1D']); eq(Object.keys(r).sort(), ['ok', 'reason'], '8: skip shape = {ok,reason} only'); ok(r.ok === false && r.reason === 'no_symbols_or_timeframes', '8: skip → {ok:false, reason:no_symbols_or_timeframes}'); }
  { const h = makeSandbox({ startNow: BASE_NOW }); await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); const r = await h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D']); eq(Object.keys(r).sort(), ['ok', 'queued', 'reason'], '8: cooldown shape = {ok,reason,queued}'); ok(r.ok === false && r.reason === 'cooldown_blocked' && typeof r.queued === 'number', '8: cooldown → {ok:false, reason:cooldown_blocked, queued:number}'); }
  { const h = makeSandbox({ response: { ok: true, status: 200 } }); const r = await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], { priority: true }); eq(Object.keys(r).sort(), ['deferredSymbols', 'ok', 'sentSymbols', 'status'], '8: http shape = {ok,status,sentSymbols,deferredSymbols}'); }
  { const h = makeSandbox({ respond: function () { return Promise.reject(new Error('x')); } }); const r = await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], { priority: true }); eq(Object.keys(r).sort(), ['deferredSymbols', 'ok', 'reason', 'sentSymbols'], '8: network shape = {ok,reason,sentSymbols,deferredSymbols}'); ok(!('status' in r), '8: network shape has NO status'); }

  // ═══════════════════════════════════════════════════════════════════════════
  section('9. TIMESTAMP MUTATION — _sfsWarmupLastSentAt written BEFORE fetch, on the send path only');
  // ═══════════════════════════════════════════════════════════════════════════
  ok(makeSandbox({}).sandbox._sfsWarmupLastSentAt === 0, '9: _sfsWarmupLastSentAt initial value is 0');
  { const h = makeSandbox({ startNow: 4242 }); await h.sandbox._sfsWarmupBatch(['A'], ['1D']); ok(h.sandbox._sfsWarmupLastSentAt === 4242, '9: small send updates timestamp to Date.now()'); }
  { // updated BEFORE fetch: capture the value while the fetch promise is still pending
    let seenAtFetch = null;
    const h = makeSandbox({ startNow: 777, respond: function (call, st) { seenAtFetch = st.sandbox._sfsWarmupLastSentAt; return Promise.resolve({ ok: true, status: 200 }); } });
    await h.sandbox._sfsWarmupBatch(['A'], ['1D']);
    ok(seenAtFetch === 777, '9: timestamp is already updated when fetch is invoked (write precedes fetch)');
  }
  { const h = makeSandbox({ startNow: 999, response: { ok: false, status: 500 } }); await h.sandbox._sfsWarmupBatch(['A'], ['1D']); ok(h.sandbox._sfsWarmupLastSentAt === 999, '9: HTTP non-2xx still leaves timestamp updated (written before fetch)'); }
  { const h = makeSandbox({ startNow: 555, respond: function () { return Promise.reject(new Error('e')); } }); await h.sandbox._sfsWarmupBatch(['A'], ['1D']); ok(h.sandbox._sfsWarmupLastSentAt === 555, '9: network error still leaves timestamp updated'); }
  { const h = makeSandbox({ startNow: 100 }); await h.sandbox._sfsWarmupBatch([], ['1D']); ok(h.sandbox._sfsWarmupLastSentAt === 0, '9: skipped input does NOT update timestamp'); }
  { const h = makeSandbox({ startNow: BASE_NOW }); await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); const before = h.sandbox._sfsWarmupLastSentAt; h.clock.now = BASE_NOW + 500; await h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D']); ok(h.sandbox._sfsWarmupLastSentAt === before, '9: cooldown-blocked call does NOT update timestamp'); }
  { const h = makeSandbox({ startNow: 321 }); await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], { priority: true }); ok(h.sandbox._sfsWarmupLastSentAt === 321, '9: priority send updates timestamp'); }

  // ═══════════════════════════════════════════════════════════════════════════
  section('10. QUEUE INTERACTION — when _sfsWarmupBatch calls _sfsQueueWarmupSymbols; key format');
  // ═══════════════════════════════════════════════════════════════════════════
  { // overflow (deferred) path enqueues the deferred symbols; fast path with no overflow does not
    const h = makeSandbox({});
    await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D', 'E'], ['1D'], { priority: true });
    ok(h.sandbox._sfsWarmupQueue.length === 1, '10: overflow enqueues the deferred remainder');
    eq(h.sandbox._sfsWarmupQueue[0].symbols, ['D', 'E'], '10: queued item holds the deferred symbols (chunked by cap)');
    eq(h.sandbox._sfsWarmupQueue[0].timeframes, ['1D'], '10: queued item holds normalized timeframes');
  }
  { const h = makeSandbox({}); await h.sandbox._sfsWarmupBatch(['A', 'B', 'C'], ['1D'], { priority: true }); ok(h.sandbox._sfsWarmupQueue.length === 0, '10: at-cap batch (no overflow) does NOT enqueue'); }
  { const h = makeSandbox({}); await h.sandbox._sfsWarmupBatch(['A'], ['1D'], { priority: true }); ok(h.sandbox._sfsWarmupQueue.length === 0, '10: small fast-path send does NOT enqueue'); }
  { // cooldown-blocked path re-enqueues the capped batch
    const h = makeSandbox({ startNow: BASE_NOW });
    await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); // sends; deferred D queued
    const qlenBefore = h.sandbox._sfsWarmupQueue.length; // 1 (deferred D)
    const r = await h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D']); // within window → blocked
    ok(r.reason === 'cooldown_blocked' && r.queued >= 0, '10: cooldown_blocked returns numeric queued count');
    ok(h.sandbox._sfsWarmupQueue.length > qlenBefore, '10: cooldown-blocked capped batch is re-enqueued');
  }
  { // no queue call on HTTP or network error (post-fetch)
    const errc = makeSandbox({ respond: function () { return Promise.reject(new Error('x')); } });
    await errc.sandbox._sfsWarmupBatch(['A', 'B', 'C'], ['1D'], { priority: true });
    ok(errc.sandbox._sfsWarmupQueue.length === 0, '10: network error does NOT enqueue (queue interaction is pre-fetch only)');
  }
  { // queue key format: symbols,join | timeframes,join | reason  (reason included)
    const h = makeSandbox({});
    h.sandbox._sfsQueueWarmupSymbols(['a', 'b'], ['1D', '30M'], 'my_reason', null);
    const keys = Object.keys(h.sandbox._sfsWarmupQueuedKeys);
    ok(keys.length === 1 && keys[0] === 'A,B|1D,30M|my_reason', '10: queue key = "SYMS|TFS|reason" with normalized upper symbols');
    ok(h.sandbox._sfsWarmupQueue[0].key === 'A,B|1D,30M|my_reason', '10: queued item.key matches the dedup key');
  }
  { // default reason in key when omitted
    const h = makeSandbox({});
    h.sandbox._sfsQueueWarmupSymbols(['a'], ['1D'], null, null);
    ok(Object.keys(h.sandbox._sfsWarmupQueuedKeys)[0] === 'A|1D|squeeze_fire_chart_warmup', '10: omitted reason defaults to squeeze_fire_chart_warmup in the key');
  }
  { // dedup: identical key not queued twice
    const h = makeSandbox({});
    const q1 = h.sandbox._sfsQueueWarmupSymbols(['A'], ['1D'], 'r', null);
    const q2 = h.sandbox._sfsQueueWarmupSymbols(['A'], ['1D'], 'r', null);
    ok(q1 === 1 && q2 === 0, '10: identical key deduped (second enqueue returns 0)');
    ok(h.sandbox._sfsWarmupQueue.length === 1, '10: dedup keeps a single queue entry');
  }
  { // chunking: >cap symbols split into cap-sized chunks
    const h = makeSandbox({});
    const q = h.sandbox._sfsQueueWarmupSymbols(['A', 'B', 'C', 'D', 'E', 'F', 'G'], ['1D'], 'r', null);
    ok(q === 7 && h.sandbox._sfsWarmupQueue.length === 3, '10: 7 symbols chunk into 3 queue items (3+3+1)');
    eq(h.sandbox._sfsWarmupQueue.map(function (i) { return i.symbols.length; }), [3, 3, 1], '10: chunk sizes 3,3,1');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('11. QUEUE STATE + DRAIN — item shape, FIFO, timer as handle+guard, reschedule');
  // ═══════════════════════════════════════════════════════════════════════════
  { // item shape
    const h = makeSandbox({});
    h.sandbox._sfsQueueWarmupSymbols(['A'], ['1D'], 'r', { view: 'x' });
    eq(Object.keys(h.sandbox._sfsWarmupQueue[0]).sort(), ['context', 'key', 'reason', 'symbols', 'timeframes'], '11: queue item shape = {symbols,timeframes,reason,context,key}');
    ok(h.sandbox._sfsWarmupQueue[0].reason === 'r' && h.sandbox._sfsWarmupQueue[0].context.view === 'x', '11: queue item preserves reason + context');
  }
  { // drain timer scheduled on first enqueue; used as a guard (single timer)
    const h = makeSandbox({});
    ok(h.sandbox._sfsWarmupDrainTimer === null, '11: _sfsWarmupDrainTimer initial value is null');
    h.sandbox._sfsQueueWarmupSymbols(['A'], ['1D'], 'r', null);
    ok(h.sandbox._sfsWarmupDrainTimer !== null && h.timers.length === 1, '11: enqueue schedules exactly one drain timer');
    ok(h.timers[0].ms === 10000, '11: drain timer delay = SFS_WARMUP_DEBOUNCE_MS (10000)');
    h.sandbox._sfsQueueWarmupSymbols(['B'], ['1D'], 'r', null); // adds item while timer pending
    ok(h.timers.length === 1, '11: a second enqueue while a timer is pending does NOT schedule another (timer is the guard)');
  }
  { // FIFO drain: shift first item, run it, clear its key, reschedule if more remain
    const h = makeSandbox({});
    h.sandbox._sfsQueueWarmupSymbols(['A'], ['1D'], 'r', null);
    h.sandbox._sfsQueueWarmupSymbols(['B'], ['1D'], 'r', null);
    ok(h.sandbox._sfsWarmupQueue.length === 2, '11: two distinct items queued');
    const firstItem = h.sandbox._sfsWarmupQueue[0];
    h.sandbox._sfsDrainWarmupQueue(); // fires the timer body manually (no real timer)
    await flush();
    ok(h.sandbox._sfsWarmupQueue.length === 1, '11: drain shifts exactly one item (FIFO)');
    ok(h.sandbox._sfsWarmupQueue[0] !== firstItem, '11: the FIRST-enqueued item is the one drained (FIFO order)');
    ok(!(firstItem.key in h.sandbox._sfsWarmupQueuedKeys), '11: drained item key removed from dedup set');
    ok(h.fetchCalls.length === 1 && h.fetchCalls[0].body.symbols[0] === 'A', '11: drained item is POSTed (A first)');
    ok(h.timers.length >= 2, '11: a follow-up drain timer is rescheduled while the queue is non-empty');
  }
  { // staged flag stamped on drained batches
    const h = makeSandbox({});
    h.sandbox._sfsQueueWarmupSymbols(['A'], ['1D'], 'r', { view: 'v' });
    h.sandbox._sfsDrainWarmupQueue();
    await flush();
    const sent = h.diagCalls.find(function (d) { return d.action === 'sent'; });
    ok(sent && sent.context.staged === true, '11: drained batch runs with staged:true context');
  }
  { // drain on empty queue is a no-op (timer nulled, no fetch)
    const h = makeSandbox({});
    h.sandbox._sfsDrainWarmupQueue();
    ok(h.sandbox._sfsWarmupDrainTimer === null && h.fetchCalls.length === 0, '11: drain on empty queue → timer null, no fetch');
  }
  { // reschedule survives a rejected drained batch (finally runs on error)
    const h = makeSandbox({ respond: function () { return Promise.reject(new Error('drain-fail')); } });
    h.sandbox._sfsQueueWarmupSymbols(['A'], ['1D'], 'r', null);
    h.sandbox._sfsQueueWarmupSymbols(['B'], ['1D'], 'r', null);
    const timersBefore = h.timers.length;
    h.sandbox._sfsDrainWarmupQueue();
    await flush();
    ok(h.timers.length > timersBefore, '11: a rejected drained batch still reschedules the next drain (.finally)');
  }
  { // no _sfsWarmupRunning guard exists in the coordinator
    ok(WARMUP_BLOCK.indexOf('_sfsWarmupRunning') === -1, '11: no _sfsWarmupRunning in-flight guard exists (timer is the only guard)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('12. PRIORITY + STAGED — priority bypasses debounce (not cap); staged bypasses NOTHING');
  // ═══════════════════════════════════════════════════════════════════════════
  { // priority still caps + still defers overflow
    const h = makeSandbox({});
    const r = await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D', 'E'], ['1D'], { priority: true });
    eq(r.sentSymbols, ['A', 'B', 'C'], '12: priority still enforces the cap');
    eq(r.deferredSymbols, ['D', 'E'], '12: priority still defers overflow');
    ok(h.sandbox._sfsWarmupQueue.length === 1, '12: priority still queues the deferred remainder');
  }
  { // staged does NOT bypass debounce: a staged large batch inside cooldown is still blocked
    const h = makeSandbox({ startNow: 0 });
    await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); // establishes cooldown
    const r = await h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D'], { staged: true });
    ok(r.reason === 'cooldown_blocked', '12: staged large batch inside cooldown is STILL blocked (staged is not a bypass)');
    ok(makeSandbox({}).sandbox && WARMUP_BLOCK.indexOf('opts.staged') !== -1 && /allowImmediate\s*=\s*!!opts\.priority/.test(BLOCK_NC), '12: allowImmediate keys on opts.priority, never on opts.staged');
  }
  { // staged only affects the diagnostic context flag
    const h = makeSandbox({});
    await h.sandbox._sfsWarmupBatch(['A'], ['1D'], { staged: true });
    const sent = h.diagCalls.find(function (d) { return d.action === 'sent'; });
    ok(sent.context.staged === true, '12: staged surfaces as context.staged=true only');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('13. CONCURRENCY — no in-flight dedupe, no shared promise; global timestamp arbitrates');
  // ═══════════════════════════════════════════════════════════════════════════
  { // two small batches concurrently → two independent fetches
    const h = makeSandbox({ respond: function () { return new Promise(function () {}); } }); // never resolves
    const p1 = h.sandbox._sfsWarmupBatch(['A'], ['1D']);
    const p2 = h.sandbox._sfsWarmupBatch(['B'], ['1D']);
    ok(h.fetchCalls.length === 2, '13: two concurrent small batches → two fetches (no dedupe)');
    ok(p1 !== p2, '13: each call returns its own promise (no shared promise)');
  }
  { // two large batches concurrently (frozen clock) → first sends, second cooldown-blocked
    const h = makeSandbox({ startNow: BASE_NOW, respond: function () { return new Promise(function () {}); } });
    const p1 = h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']);
    const r2 = await h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D']);
    ok(h.fetchCalls.length === 1, '13: two concurrent large batches → only one fetch (second is cooldown-blocked)');
    ok(r2.reason === 'cooldown_blocked', '13: the second concurrent large batch is cooldown-blocked');
    void p1;
  }
  { // two concurrent priority large batches → both fetch (priority ignores cooldown)
    const h = makeSandbox({ respond: function () { return new Promise(function () {}); } });
    h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], { priority: true });
    h.sandbox._sfsWarmupBatch(['E', 'F', 'G', 'H'], ['1D'], { priority: true });
    ok(h.fetchCalls.length === 2, '13: two concurrent priority large batches → two fetches');
  }
  { // two identical small batches → two fetches (dedup lives only in the QUEUE, not the send path)
    const h = makeSandbox({ respond: function () { return new Promise(function () {}); } });
    h.sandbox._sfsWarmupBatch(['A'], ['1D']);
    h.sandbox._sfsWarmupBatch(['A'], ['1D']);
    ok(h.fetchCalls.length === 2, '13: two identical small batches → two fetches (no send-path dedupe)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('14. FAILURE MATRIX — fetch / queue / timestamp / diag / return per scenario');
  // ═══════════════════════════════════════════════════════════════════════════
  async function scenario(name, symbols, tfs, opts, cfg) {
    const h = makeSandbox(cfg || {});
    let threw = false, r = null;
    try { r = await h.sandbox._sfsWarmupBatch(symbols, tfs, opts); } catch (e) { threw = true; r = { error: (e && e.message) }; }
    await flush();
    return {
      scenario: name,
      fetch: h.fetchCalls.length,
      queue: h.sandbox._sfsWarmupQueue.length,
      tsUpdated: h.sandbox._sfsWarmupLastSentAt !== 0, // fresh sandbox starts at 0; a send writes startNow (!=0)
      diag: diagActions(h),
      ret: r,
      threw: threw,
    };
  }
  // large_debounced is intrinsically a TWO-call scenario: a first large send, then a
  // second large batch INSIDE the 10s window. We measure only the second (blocked) call.
  async function debouncedRow() {
    const h = makeSandbox({ startNow: BASE_NOW, response: { ok: true, status: 200 } });
    await h.sandbox._sfsWarmupBatch(['P', 'Q', 'R', 'S'], ['1D']); // first send at BASE_NOW
    h.clock.now = BASE_NOW + 5000; // still within the window
    const fetchBefore = h.fetchCalls.length, tsBefore = h.sandbox._sfsWarmupLastSentAt, diagBefore = h.diagCalls.length;
    const r = await h.sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D']); // blocked
    await flush();
    return { scenario: 'large_debounced', fetch: h.fetchCalls.length - fetchBefore, queue: h.sandbox._sfsWarmupQueue.length,
      tsUpdated: h.sandbox._sfsWarmupLastSentAt !== tsBefore, diag: diagActions(h).slice(diagBefore), ret: r, threw: false };
  }
  const matrix = [];
  matrix.push(await scenario('empty_input', [], ['1D'], {}, { startNow: 0 }));
  matrix.push(await scenario('small_success', ['A'], ['1D'], {}, { startNow: 1 }));
  matrix.push(await scenario('large_success', ['A', 'B', 'C', 'D'], ['1D'], { priority: true }, { startNow: 1 }));
  matrix.push(await debouncedRow());
  matrix.push(await scenario('priority_success', ['A', 'B', 'C', 'D', 'E'], ['1D'], { priority: true }, { startNow: 1 }));
  matrix.push(await scenario('http_401', ['A'], ['1D'], {}, { startNow: 1, response: { ok: false, status: 401 } }));
  matrix.push(await scenario('http_429', ['A'], ['1D'], {}, { startNow: 1, response: { ok: false, status: 429 } }));
  matrix.push(await scenario('http_503', ['A'], ['1D'], {}, { startNow: 1, response: { ok: false, status: 503 } }));
  matrix.push(await scenario('network_reject', ['A'], ['1D'], {}, { startNow: 1, respond: function () { return Promise.reject(new Error('down')); } }));
  matrix.push(await scenario('abort', ['A'], ['1D'], {}, { startNow: 1, respond: function () { return Promise.reject(new Error('The operation was aborted')); } }));
  matrix.push(await scenario('malformed_response', ['A'], ['1D'], {}, { startNow: 1, response: { ok: true, status: 200, json: function () { throw new Error('parse'); } } }));
  matrix.push(await scenario('diag_dependency_throw', ['A'], ['1D'], {}, { startNow: 1, recordDiag: function () { throw new Error('diag'); } }));
  matrix.push(await scenario('auth_headers_throw', ['A'], ['1D'], {}, { startNow: 1, S: null })); // S=null → _backendAuthHeaders reads S.backendKey → TypeError, caught by warmup try

  console.table ? console.table(matrix.map(function (m) { return { scenario: m.scenario, fetch: m.fetch, queue: m.queue, diag: m.diag.join('+'), threw: m.threw, ret: JSON.stringify(m.ret) }; })) : matrix.forEach(function (m) { console.log('  ', m.scenario, JSON.stringify(m)); });

  const byName = {}; matrix.forEach(function (m) { byName[m.scenario] = m; });
  ok(byName.empty_input.fetch === 0 && byName.empty_input.ret.reason === 'no_symbols_or_timeframes' && byName.empty_input.threw === false, '14: empty_input → no fetch, skip reason, no throw');
  ok(byName.small_success.fetch === 1 && byName.small_success.ret.ok === true, '14: small_success → 1 fetch, ok');
  ok(byName.large_success.fetch === 1 && byName.large_success.ret.ok === true && byName.large_success.queue === 1, '14: large_success (priority) → 1 fetch, deferred queued');
  ok(byName.large_debounced.fetch === 0 && byName.large_debounced.tsUpdated === false && byName.large_debounced.ret.reason === 'cooldown_blocked' && byName.large_debounced.threw === false, '14: large_debounced (2nd large batch within window) → NO new fetch, timestamp unchanged, cooldown_blocked, no throw');
  ok(byName.priority_success.fetch === 1 && byName.priority_success.ret.deferredSymbols.length === 2, '14: priority_success → 1 fetch, 2 deferred');
  ok(byName.http_401.fetch === 1 && byName.http_401.ret.ok === false && byName.http_401.ret.status === 401 && byName.http_401.threw === false, '14: http_401 → 1 fetch, ok:false status:401, no throw');
  ok(byName.http_429.ret.status === 429 && byName.http_429.threw === false, '14: http_429 → status 429, no throw');
  ok(byName.http_503.ret.status === 503 && byName.http_503.threw === false, '14: http_503 → status 503, no throw');
  ok(byName.network_reject.fetch === 1 && byName.network_reject.ret.reason === 'warmup:down' && byName.network_reject.threw === false, '14: network_reject → caught, reason warmup:down, no throw');
  ok(byName.abort.ret.reason === 'warmup:The operation was aborted' && byName.abort.threw === false, '14: abort → caught as warmup:<abort>, no throw');
  ok(byName.malformed_response.ret.ok === true && byName.malformed_response.ret.status === 200 && byName.malformed_response.threw === false, '14: malformed_response → body ignored, ok:true');
  ok(byName.diag_dependency_throw.threw === true, '14: diag_dependency_throw → PROPAGATES (warmup diag has no local try/catch); real recorder is guarded so unreachable in prod');
  ok(byName.diag_dependency_throw.fetch === 0, '14: diag_dependency_throw throws at the FIRST diag (sent), before fetch');
  ok(byName.auth_headers_throw.threw === false && byName.auth_headers_throw.ret.ok === false && /^warmup:/.test(byName.auth_headers_throw.ret.reason), '14: auth_headers_throw (S=null) → caught by warmup try, reason warmup:<msg>, no throw');

  // ═══════════════════════════════════════════════════════════════════════════
  section('15. CLOSURE / BOUNDARY — the real dependency set of _sfsWarmupBatch');
  // ═══════════════════════════════════════════════════════════════════════════
  const BATCH_NC = stripComments(extractFn(HTML, '_sfsWarmupBatch'));
  const LEAF = ['fetch', 'BACKEND', '_backendAuthHeaders', 'AbortSignal', 'JSON', 'Object', 'Math', 'Date'];
  LEAF.forEach(function (dep) { ok(BATCH_NC.indexOf(dep) !== -1, '15: _sfsWarmupBatch references leaf dependency: ' + dep); });
  const COORD = ['_sfsQueueWarmupSymbols', '_sfsWarmupDiag', '_sfsWarmupLastSentAt', 'SFS_WARMUP_BATCH_CAP', 'SFS_WARMUP_DEBOUNCE_MS', '_sfsNormSymbolList', '_sfsNormTimeframes'];
  COORD.forEach(function (dep) { ok(BATCH_NC.indexOf(dep) !== -1, '15: _sfsWarmupBatch references coordinator dependency: ' + dep); });
  // _sfsWarmupBatch does NOT touch the queue's own internals directly (only via _sfsQueueWarmupSymbols)
  ['_sfsWarmupQueue', '_sfsWarmupQueuedKeys', '_sfsWarmupDrainTimer'].forEach(function (dep) { ok(BATCH_NC.indexOf(dep) === -1, '15: _sfsWarmupBatch does NOT reference queue state directly: ' + dep); });
  ok(BATCH_NC.indexOf('setTimeout') === -1, '15: _sfsWarmupBatch schedules no timer itself (drain scheduling lives in the queue)');
  ok(BATCH_NC.indexOf('fetch') !== -1, '15: _sfsWarmupBatch owns the single POST fetch');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(1); });

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT FINDINGS (derived from the REAL code above; recorded for the extraction PR)
// ═════════════════════════════════════════════════════════════════════════════
//
// CALL GRAPH (general)
//   caller
//   → _sfsWarmupBatch(symbols, timeframes, opts)
//   → _sfsNormSymbolList / _sfsNormTimeframes (predicates)            [normalize]
//   → empty check → { ok:false, reason:'no_symbols_or_timeframes' }   [+ diag 'skipped']
//   → capped = requested.slice(0,CAP); deferred = requested.slice(CAP)
//   → if deferred.length: _sfsQueueWarmupSymbols(deferred,…)          [+ diag 'queued']
//   → now = Date.now()
//   → allowImmediate = !!opts.priority || capped.length<=1 || !isLarge || (now-lastSent>=DEBOUNCE)
//   → if !allowImmediate: _sfsQueueWarmupSymbols(capped,…) → return {ok:false,reason:'cooldown_blocked',queued}  [+ diag 'cooldown_blocked']
//   → _sfsWarmupLastSentAt = now                                      [state write — BEFORE fetch]
//   → diag 'sent'
//   → try: fetch(POST warmup, _backendAuthHeaders, waitMs:15000, AbortSignal.timeout(30000))
//        → return { ok:r.ok, status:r.status, sentSymbols:capped, deferredSymbols:deferred }
//   → catch: return { ok:false, reason:'warmup:'+msg, sentSymbols:capped, deferredSymbols:deferred }
//   NOTE: NO diagnostics AFTER the fetch (no success/http-error/network-error/drain action).
//
//   Small immediate (1–3 syms): !isLarge → allowImmediate → 1 POST, NO queue.
//   Large non-priority (>3):    deferred queued; capped sent iff cooldown elapsed, else re-queued + cooldown_blocked.
//   Priority (opts.priority):   bypasses DEBOUNCE only — cap + deferral + queue still apply.
//   Staged (opts.staged):       bypasses NOTHING (not in allowImmediate); only stamps context.staged=true.
//                               Drained items are always <=CAP, so in practice they take the small path.
//
// STATE OWNERSHIP
//   | State                 | Init | Readers                  | Writers                         | Write moment          | Cleanup                         |
//   | _sfsWarmupLastSentAt  | 0    | _sfsWarmupBatch (debounce)| _sfsWarmupBatch                 | = now, BEFORE fetch    | none (monotonic)                |
//   | _sfsWarmupQueue       | []   | drain, batch(len)        | queue(push), drain(shift)       | on overflow/cooldown   | shift on drain                  |
//   | _sfsWarmupQueuedKeys  | {}   | queue(dedup)             | queue(set), drain(delete)       | on enqueue             | delete on drain (per item)      |
//   | _sfsWarmupDrainTimer  | null | queue(guard), drain      | queue(set), drain(null→reset)   | on enqueue / reschedule| nulled at drain start           |
//   _sfsWarmupLastSentAt: single global clock (Date.now); NOT per-symbol/timeframe/reason. Updated on
//   send only (skip & cooldown_blocked do NOT update); stays updated on HTTP non-2xx and network error
//   (written before the fetch). No _sfsWarmupRunning in-flight flag exists — the timer is the only guard.
//   _sfsWarmupQueue item shape: { symbols, timeframes, reason, context, key }; FIFO (push/shift).
//   _sfsWarmupQueuedKeys key: `SYMS.join(',')|TFS.join(',')|reason` (upper-cased syms, reason INCLUDED,
//   default 'squeeze_fire_chart_warmup'); dedup drops repeats; key removed when its item is drained.
//
// CLOSURE OF _sfsWarmupBatch
//   | Dependency               | Type        | Needed in a future module | Can stay global | Risk |
//   | fetch / AbortSignal      | leaf builtin| yes (lexical)             | yes             | low  |
//   | BACKEND                  | leaf const  | yes                       | yes             | low  |
//   | _backendAuthHeaders      | leaf fn     | yes                       | yes             | low  |
//   | _sfsNormSymbolList/Tf    | leaf pred   | yes (already extracted)   | yes             | low  |
//   | _sfsWarmupDiag           | coordinator | yes (co-move candidate)   | yes             | low  |
//   | _sfsQueueWarmupSymbols   | coordinator | yes (queue call)          | yes (if left)   | MED — batch↔queue↔drain cycle |
//   | _sfsWarmupLastSentAt     | coordinator STATE | reads+writes a module global | yes | MED — cross-module mutable state |
//   | SFS_WARMUP_BATCH_CAP/MS  | coordinator const | read                | yes             | low  |
//   _sfsWarmupBatch does NOT reference _sfsWarmupQueue/_sfsWarmupQueuedKeys/_sfsWarmupDrainTimer or
//   setTimeout directly — queue internals + drain scheduling are reached ONLY through _sfsQueueWarmupSymbols.
//
// AUTH ASYMMETRY (pinned, NOT fixed)
//   Read primitive _sfsFetchBackendCandles gates on _backendCandleGateOpen() (no fetch when closed).
//   Warmup POST _sfsWarmupBatch has NO gate: it fetches even when a (simulated) gate would be closed,
//   uses _backendAuthHeaders (x-api-key when present), and on 401/403 just returns {ok:false,status}
//   with no auth-state latching and no throw. This asymmetry is protected here, not corrected.
//
// FAILURE MATRIX (section 14, from real execution)
//   empty_input           fetch0 queue0 ts- diag[skipped]        ret{ok:false,no_symbols_or_timeframes}  throw:no
//   small_success         fetch1 queue0 ts+ diag[sent]           ret{ok:true,status:200,sent,deferred[]}  throw:no
//   large_success(prio)   fetch1 queue1 ts+ diag[queued,sent]    ret{ok:true,status,sent3,deferred1}       throw:no
//   large_debounced       fetch0 queue+ ts- diag[queued,cooldown_blocked] ret{ok:false,cooldown_blocked,queued} throw:no
//   priority_success      fetch1 queue1 ts+ diag[queued,sent]    ret{…,deferred2}                          throw:no
//   http_401/429/503      fetch1 queue0 ts+ diag[sent]           ret{ok:false,status:401/429/503,sent,def} throw:no
//   network_reject        fetch1 queue0 ts+ diag[sent]           ret{ok:false,reason:'warmup:down',sent,def} throw:no
//   abort/timeout         fetch1 queue0 ts+ diag[sent]           ret{ok:false,reason:'warmup:<abort>'}      throw:no
//   malformed_response    fetch1 queue0 ts+ diag[sent]           ret{ok:true,status:200} (body never read)  throw:no
//   diag_dependency_throw fetch0 queue0 ts+ diag[]               (propagates)                              throw:YES
//   auth_headers_throw    fetch0 queue0 ts+ diag[sent]           ret{ok:false,reason:'warmup:<msg>'}        throw:no
//   (Real _recordCandleSubscriptionRequest is internally try/catch-guarded → never throws in prod, so the
//    diag_dependency_throw path is unreachable there; _sfsWarmupDiag itself has NO local try/catch.)
//
// DISCOVERED INCONSISTENCIES (recorded, deliberately NOT corrected — protect current behavior)
//   • `capped.length <= 1` in allowImmediate is redundant given `!isLarge` (capped<=1 ⟹ requested<=1 ⟹ !isLarge).
//   • The 'queued' diag for deferred fires BEFORE the cooldown decision, so a cooldown-blocked large batch
//     emits diag order [queued, cooldown_blocked] and re-queues the capped set separately from the deferred set.
//   • Warmup has NO auth gate and NO in-flight/running guard, unlike the read primitive — asymmetric by design here.
//
// RECOMMENDATION → OPTION C (extract the full coordinator), as a LATER PR — NOT in this one.
//   Extract together, verbatim: _sfsWarmupDiag, _sfsWarmupBatch, _sfsQueueWarmupSymbols, _sfsDrainWarmupQueue
//   into js/services/sfs-candle-warmup.js. LEAVE in the monolith the mutable STATE declarations
//   (_sfsWarmupLastSentAt, _sfsWarmupQueue, _sfsWarmupQueuedKeys, _sfsWarmupDrainTimer) and the CONSTANTS
//   (SFS_WARMUP_BATCH_CAP, SFS_WARMUP_DEBOUNCE_MS) as global `var`s resolved lexically at call time — the
//   established pattern (backend-client / candle-* modules). Script order: load sfs-candle-warmup.js AFTER
//   sfs-candle-predicates.js and BEFORE the inline monolith. Rationale: batch↔queue↔drain form ONE mutually
//   recursive cycle (drain calls batch; batch calls queue; queue schedules drain), so lifting _sfsWarmupBatch
//   alone (Option B) would split that cycle across a module boundary and leave batch calling back into the
//   monolith's queue — a misleading boundary. Option A (diag only) is cosmetic. Option D (leave as-is) is
//   viable but defers the win. Option E (a leaf HTTP primitive around the POST) is a genuine behavioral/
//   structural refactor (new function, new seam) — it must be its own dedicated PR, never a relocation here.
//   Tests to update on that PR: this file's section 0 module-existence assertions + sfs-warmup-throttle's
//   block slice. Timing risk: keep the _sfsWarmupLastSentAt write BEFORE the fetch and the state as globals.
// ═════════════════════════════════════════════════════════════════════════════
