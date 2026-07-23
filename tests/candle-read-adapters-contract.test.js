'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// CANDLE READ ADAPTERS — contract / boundary pin (PRE-EXTRACTION AUDIT).
//
// WHY THIS EXISTS
//   The candle *read adapters* (the functions that read / ensure / warm / map the
//   backend candles consumed by Scanner, Portfolio, Market Context, Pre-trade,
//   SFS/Swing and the shared chart loader) are the next slice being considered for
//   extraction from index.html. Several of them LOOK like duplicates but each
//   carries at least one behavioural difference — a different endpoint family, a
//   different auth posture, a different warmup, a different cache, a different
//   response shape, a different source label or a different fallback.
//
//   This test freezes the REAL observable behaviour of those adapters BEFORE any
//   code moves, so a later extraction PR can only pass if it preserves every
//   asymmetry byte-for-byte at the seams. It is a companion to
//   tests/candle-service-contract.test.js (which pins the shared normalization /
//   auth-gate / provenance / warmup core); here the focus is exclusively the
//   per-consumer READ adapters and the differences that must NOT be unified.
//
// GUIDING RULE (from the audit brief)
//   Document the differences that exist today — do NOT correct them, do NOT remove
//   them, do NOT unify them. When two adapters look like duplicates but differ in
//   even one behaviour, protect BOTH variants.
//
// WHAT IT PINS
//   • the manifest of read-adapter symbols and where each lives in the reconstructed
//     source: the five low-level candle-store primitives are now extracted to
//     js/services/candle-store-client.js, while the read-first orchestrators, the
//     DXLink read primitive and the per-feature adapters stay in the inline monolith;
//     and the fact that NO candle-read-adapters / candle-dxlink-client / candle-transport
//     / candle-service module exists yet;
//   • the exact endpoint family per adapter (candle store /market/candles vs
//     DXLink /dev/market/candles-dxlink vs legacy public /market/candles/:ticker);
//   • the transport per adapter (fetch + _backendAuthHeaders + gate vs ttCall vs
//     _runLimited-wrapped public fetch);
//   • the auth-gate posture matrix (preventive gate? provenance? which error codes
//     latch the backoff?);
//   • the exact return shape per adapter (structured object vs technicals vs sorted
//     array vs throw);
//   • the mapper + per-candle source label asymmetry
//     (BACKEND_DXLINK_CANDLES vs BACKEND_CANDLE_STORE vs no label);
//   • the scanner session cache (key / TTL / <20-bar skip / hit / miss / write);
//   • ensure (POST /market/candles/ensure) vs warmup
//     (POST /dev/market/candles-dxlink/warmup) — kept SEPARATE, never treated as
//     synonyms;
//   • read-first orchestration: scanner (parallel reads + bounded polled re-reads)
//     vs portfolio (sequential reads + a single re-read) — explicitly compared;
//   • the _loadBackendChartCandles alias delegation (must never be re-pointed to a
//     different adapter family);
//   • concurrency ownership: the SFS read primitive holds NO in-flight/cooldown
//     state itself (that lives in the external orchestrator).
//
// HOW
//   Real functions are loaded from the reconstructed application source via
//   tests/lib/load-app-source.js and executed in a `vm` sandbox with controlled
//   dependencies. NO real network (every fetch/ttCall is a mock), NO real long
//   timers (setTimeout fires synchronously so bounded re-read waits never block),
//   NO npm dependencies. Implementations are NEVER copied into the test — only
//   loaded and executed.
//
// Run: node tests/candle-read-adapters-contract.test.js
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
function loadReal(sandbox, names) {
  vm.runInContext(names.map((n) => extractFn(HTML, n)).join('\n'), sandbox);
}

// ── Assertion harness ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── Fixtures / helpers ────────────────────────────────────────────────────────
// Backend candle rows in the {time,open,high,low,close,volume} shape the loaders
// map from. `endMs` lets a test choose an old series (default) or a fresh one so
// the MCX staleness check can be steered.
function backendBars(n, endMs) {
  const out = [];
  const step = 86400000;
  const base = (endMs != null ? endMs : Date.UTC(2024, 0, 2)) - (n - 1) * step;
  for (let i = 0; i < n; i++) {
    const c = 100 + i * 0.5;
    out.push({ time: new Date(base + i * step).toISOString(), open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000 });
  }
  return out;
}
// A fresh series ending "now" so _mcxCandlesLookStale() reports NOT stale.
function freshBars(n) { return backendBars(n, Date.now()); }

// A fetch Response double supporting both .json() and .text() reads.
function resp(status, body, opts) {
  opts = opts || {};
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: () => opts.badJson ? Promise.reject(new Error('Unexpected token')) : Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}
// A recording fetch: handler(url, options, callIndex) → Response | throws.
// Records url / method / headers / parsed body / the AbortSignal.timeout(ms) value.
function recordingFetch(handler) {
  const calls = [];
  const fn = function (url, options) {
    let body = null;
    try { body = options && options.body ? JSON.parse(options.body) : null; } catch (e) { body = options && options.body; }
    calls.push({
      url: url,
      method: (options && options.method) || 'GET',
      headers: (options && options.headers) || {},
      body: body,
      cache: options && options.cache,
      timeout: (options && options.signal && options.signal.__timeout) || null,
    });
    let r;
    try { r = handler(url, options, calls.length); } catch (e) { return Promise.reject(e); }
    if (r && r.__throw) return Promise.reject(r.__throw);
    return Promise.resolve(r);
  };
  fn.calls = calls;
  return fn;
}
function makeConsole() {
  const logs = [];
  const rec = (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  return { logs, console: { log: rec, warn: rec, error: rec, info: rec, table: () => {} } };
}

// ── Core sandbox factory ──────────────────────────────────────────────────────
// Loads the REAL auth gate + normalization + provenance + backend auth headers +
// the scanner session cache + every candle READ ADAPTER, so the adapters execute
// end-to-end against mocked leaves (fetch / ttCall / timers) only.
function newCore(overrides) {
  overrides = overrides || {};
  const cap = makeConsole();
  const subReqs = [];
  const ttCalls = [];
  const sandbox = {
    console: cap.console, Date, JSON, Math, Number, Boolean, isFinite, parseFloat, parseInt,
    encodeURIComponent, Object, Array, Promise, String, RegExp, Set,
    // timers fire synchronously → bounded re-read waits resolve instantly (no real timer).
    setTimeout: (fn) => { try { fn(); } catch (e) { /* ignore */ } return 1; },
    clearTimeout: () => {},
    BACKEND: 'https://backend.test',
    // AbortSignal.timeout records the ms so tests can pin per-adapter timeouts.
    AbortSignal: { timeout: (ms) => ({ __timeout: ms }) },
    S: { backendKey: '', ttConnected: false, ttSessionId: null },
    _backendCandleAuth: { backoffUntil: 0, lastStatus: null, last401At: null, lastError: null, recentFailures: [] },
    _backendApiAuthState: { lastStatus: null, lastOkAt: null, last401At: null, lastEndpoint: null, invalidApiKey: false },
    _apexAuthSkipLogged: {},
    _BACKEND_CANDLE_BACKOFF_MS: 60000,
    _BACKEND_CANDLE_FAIL_MAX: 30,
    _candleProvenanceStats: {
      backendCache: 0, backendCacheFull: 0, backendCachePartial: 0, backend4hMissing: 0,
      browserDxlinkFallback: 0, browser4hFallbackStarted: 0, browser4hFallbackBlocked: 0,
      browser4hFallbackSymbolsRecent: [], lastSource: null, lastAt: null, lastSymbol: null,
    },
    _candleProvenanceLog: [],
    _CANDLE_PROVENANCE_MAX: 80,
    _CANDLE_USABLE_MIN: 20,
    // Scanner session cache state (referenced by the real cache helpers).
    _scannerChartCandleSessionCache: Object.create(null),
    _SCANNER_CHART_CANDLE_CACHE_TTL_MS: 3 * 60 * 1000,
    // Leaf stubs — downstream of the read-adapter contract, deliberately mocked.
    _recordCandleSubscriptionRequest: (m) => { subReqs.push(m); return m; },
    _calcTechnicalsFromCandles: (candles, spyCandles, price) => ({ __tech: true, bars: candles ? candles.length : 0, price: price }),
    _runLimited: (pool, fn) => fn(),
    ttCall: function (endpoint, options) { ttCalls.push({ endpoint: endpoint, options: options || {} }); return Promise.resolve(sandbox.__ttNext ? sandbox.__ttNext(endpoint, options) : { ok: true }); },
    __subReqs: subReqs,
    __ttCalls: ttCalls,
    __logs: cap.logs,
  };
  Object.assign(sandbox, overrides.globals || {});
  vm.createContext(sandbox);
  loadReal(sandbox, [
    // shared normalization
    '_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray', '_apexParityExtractBackendCandles',
    '_sfsExtractBackendCandles', '_mapBackendCandlesForChart', '_scannerMapBackendCandlesForChart',
    // auth gate
    '_candleDiagNowIso', '_backendAuthHeaders', '_recordBackendApiAuthResult',
    '_backendCandleAuthReady', '_backendCandleBackoffActive', '_backendCandleGateOpen', '_backendCandleGateReason',
    '_noteBackendCandleFailure', '_noteBackendCandleSuccess',
    '_isBackendGateClosedReason', '_backendGateProvenanceSource',
    'backendApiAuthKnownInvalid', '_resetBackendApiAuthState', '_apexAuthSkip',
    // provenance
    '_classifyBackendCandleProvenance', '_extractBackend4hDiag', '_recordCandleProvenance', '_recordBackendCandleProvenance',
    // scanner cache
    '_scannerChartCandleCacheKey', '_scannerGetCachedBackendTfCandles', '_scannerPutCachedBackendTfCandles',
    // candle store primitives + scanner orchestrator helpers
    '_scannerReadBackendCandlesTf', '_scannerEnsureBackendCandles',
    '_scannerBackendCandleRetryDelayMs', '_scannerBackendCandleFinalDelayMs', '_scannerBackendCandleWait',
    '_scannerFetchBackendCandlesForChart', '_loadBackendChartCandles',
    // feature adapters
    '_portfolioFetchBackendCandlesForChart',
    '_mcxFetchBackendCandlesForChart', '_mcxCandlesLookStale',
    '_fetchPretradeBackendCandles',
    // dxlink read primitive
    '_sfsFetchBackendCandles',
    // legacy public read (no gate, throws, sorted array)
    'fetchBackendCandles',
  ]);
  return sandbox;
}
function authReady(sb) { sb.S.backendKey = 'KEY'; sb.S.ttConnected = true; sb.S.ttSessionId = 'sess'; }

(async () => {
  // ═══════════════════════════════════════════════════════════════════════════
  section('0. MANIFEST + STORE-CLIENT EXTRACTION — five candle-store primitives extracted; orchestrators/DXLink/adapters stay in the monolith');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Manifest of read-adapter symbols grouped by their role. Presence here documents
    // that every symbol the audit reasons about is a REAL function in the reconstructed
    // source (executed below), not an invented name. The two CANDLE_STORE_PRIMITIVE and
    // three CACHE symbols are now EXTRACTED to js/services/candle-store-client.js (their
    // ownership is asserted in 0-EXTRACTION-STORE below); every other group stays in the
    // inline monolith. The extraction moved only the physical location of these five
    // functions — endpoints, cache, auth, source labels and return shapes are unchanged.
    const MANIFEST = {
      // DXLink read primitive — GET /dev/market/candles-dxlink/:sym?timeframe= (STAYS in the monolith)
      DXLINK_PRIMITIVE: ['_sfsFetchBackendCandles'],
      // Candle-store primitives — GET /market/candles?symbol= + POST /market/candles/ensure
      // (now EXTRACTED to js/services/candle-store-client.js)
      CANDLE_STORE_PRIMITIVE: ['_scannerReadBackendCandlesTf', '_scannerEnsureBackendCandles'],
      // Read-first orchestrators — read → ensure/warm-if-needed → re-read → map (STAY in the monolith)
      READ_ORCHESTRATOR: ['_scannerFetchBackendCandlesForChart', '_portfolioFetchBackendCandlesForChart', '_loadBackendChartCandles'],
      // Per-feature adapters — own endpoint family / warmup / source label (STAY in the monolith)
      FEATURE_ADAPTER: ['_mcxFetchBackendCandlesForChart', '_fetchPretradeBackendCandles'],
      // Scanner session cache helpers (now EXTRACTED to js/services/candle-store-client.js;
      // the cache STATE + TTL constant stay declared in the monolith)
      CACHE: ['_scannerChartCandleCacheKey', '_scannerGetCachedBackendTfCandles', '_scannerPutCachedBackendTfCandles'],
      // Legacy public read — no auth gate, throws, returns a sorted array
      LEGACY_PUBLIC_READ: ['fetchBackendCandles', 'fetchCandles'],
      // Intentionally EXCLUDED from the read-adapter family under audit:
      //   • the main-chart candle store uses a DIFFERENT transport (ttCall) and a
      //     DIFFERENT gate posture (ffBackendCandleStoreChart flag, not the auth gate);
      //   • the SFS orchestrator owns the in-flight/cooldown state, not the read primitive.
      EXCLUDED: ['fetchBackendCandleStoreCandles', 'ensureBackendCandleStoreSymbol', 'fetchBackendCandleStoreReadiness',
        '_sfsEnsureTfCandles', '_sfsEnsureDetail4hCandles', '_sfsWarmupBatch'],
    };
    let manifestCount = 0;
    Object.keys(MANIFEST).forEach((cat) => {
      MANIFEST[cat].forEach((name) => {
        manifestCount++;
        const present = HTML.indexOf('function ' + name + '(') >= 0 || HTML.indexOf('function ' + name + ' (') >= 0;
        ok(present, '0: [' + cat + '] real function present in reconstructed source: ' + name);
      });
    });
    console.log('  NOTE  read-adapter manifest symbols asserted: ' + manifestCount);

    const rawIndex = loader.loadIndexHtml();
    const ordered = loader.loadOrderedScriptSources();
    const localTags = ordered.filter((s) => s.kind === 'local').map((s) => s.src);
    const inlineMonolith = ordered.filter((s) => s.kind === 'inline' && s.isAppJs).map((s) => s.code).join('\n');

    // 0-EXTRACTION-STORE. The five candle-store primitives are now a separate classic
    // module js/services/candle-store-client.js, loaded AFTER candle-provenance.js and
    // BEFORE the inline monolith. It must contain ONLY the five approved functions +
    // comments (three scanner session-cache helpers + the two candle-store transport
    // primitives) — NO cache STATE, NO TTL constant, NO orchestration, NO DXLink read,
    // NO ttCall transport, NO timers, NO DOM, NO top-level code. The cache state
    // (_scannerChartCandleSessionCache) and the _SCANNER_CHART_CANDLE_CACHE_TTL_MS
    // constant STAY declared in the monolith; only the FUNCTIONS moved.
    const STORE_PATH = path.resolve(__dirname, '..', 'js', 'services', 'candle-store-client.js');
    const STORE_TAG = './js/services/candle-store-client.js';
    const STORE_FIVE = ['_scannerChartCandleCacheKey', '_scannerGetCachedBackendTfCandles',
      '_scannerPutCachedBackendTfCandles', '_scannerReadBackendCandlesTf', '_scannerEnsureBackendCandles'];

    // (1) module file exists.
    ok(fs.existsSync(STORE_PATH), '0: js/services/candle-store-client.js exists');
    const STORE_SRC = fs.existsSync(STORE_PATH) ? fs.readFileSync(STORE_PATH, 'utf8') : '';

    // (2) exactly one <script src> tag for it in index.html.
    const storeTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/candle-store-client\.js["'][^>]*>/gi) || [];
    ok(storeTags.length === 1, '0: exactly one candle-store-client.js <script> tag in index.html');
    const theStoreTag = storeTags[0] || '';

    // (3)(4) the tag is a classic script: no type=module, no async, no defer.
    ok(!/type\s*=\s*["']?module/i.test(theStoreTag), '0: candle-store-client tag is classic (no type=module)');
    ok(!/\basync\b/i.test(theStoreTag), '0: candle-store-client tag has no async attribute');
    ok(!/\bdefer\b/i.test(theStoreTag), '0: candle-store-client tag has no defer attribute');

    // (5)(6) load order: AFTER candle-provenance.js, BEFORE the inline monolith.
    const storeEntry = ordered.filter((s) => s.kind === 'local' && s.src === STORE_TAG)[0];
    const provEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/candle-provenance.js')[0];
    const firstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
    ok(!!storeEntry, '0: candle-store-client.js is a local classic script in the load order');
    ok(!!provEntry && !!storeEntry && provEntry.order < storeEntry.order, '0: candle-store-client.js loads AFTER candle-provenance.js');
    ok(!!storeEntry && !!firstInline && storeEntry.order < firstInline.order, '0: candle-store-client.js loads BEFORE the inline monolith');

    // (7) the shared loader includes the new script in the reconstructed source.
    ok(localTags.indexOf(STORE_TAG) !== -1, '0: loader parses candle-store-client.js as a local script');

    // (8)(9)(10) each of the five functions: present in the module, absent from the
    // residual inline monolith, and exactly one definition overall in reconstructed source.
    STORE_FIVE.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((STORE_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in candle-store-client.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (11) the module contains ONLY the five declarations + comments — no top-level
    // executable code. Strip comments, remove the five bodies, expect only whitespace.
    let storeResidual = stripComments(STORE_SRC);
    STORE_FIVE.forEach((n) => { storeResidual = storeResidual.replace(stripComments(extractFn(STORE_SRC, n)), ''); });
    ok(storeResidual.trim() === '', '0: store-client module contains ONLY the five declarations + comments (no top-level executable code)');

    // (12)(13)(14)(15)(16) module has NO orchestration, NO DXLink read, NO ttCall
    // transport, NO timers, NO DOM.
    ok(!/_scannerFetchBackendCandlesForChart|_loadBackendChartCandles|_scannerRevalidateBackendCandlesForChart|_scannerBackendCandleWait|_sfsEnsure|_sfsWarmup|_sfsDrain/.test(STORE_SRC),
      '0: store-client module contains no read-first orchestration');
    ok(!/_sfsFetchBackendCandles|candles-dxlink/.test(STORE_SRC), '0: store-client module contains no DXLink read primitive');
    ok(!/\bttCall\s*\(/.test(STORE_SRC), '0: store-client module contains no ttCall transport');
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(STORE_SRC), '0: store-client module contains no timers');
    ok(!/\bdocument\b|\bwindow\b|getElementById|querySelector|addEventListener/.test(STORE_SRC), '0: store-client module contains no DOM access');

    // (17) the cache STATE + TTL constant are NOT declared in the module (the functions
    // may reference these globals — they must not declare them) and DO stay declared in
    // the residual inline monolith.
    ok(!/\b(?:var|let|const)\s+_scannerChartCandleSessionCache\b/.test(STORE_SRC), '0: store-client module does NOT declare _scannerChartCandleSessionCache');
    ok(!/\b(?:var|let|const)\s+_SCANNER_CHART_CANDLE_CACHE_TTL_MS\b/.test(STORE_SRC), '0: store-client module does NOT declare _SCANNER_CHART_CANDLE_CACHE_TTL_MS');
    ok(/\bvar\s+_scannerChartCandleSessionCache\s*=/.test(inlineMonolith), '0: _scannerChartCandleSessionCache stays declared in the monolith');
    ok(/\bvar\s+_SCANNER_CHART_CANDLE_CACHE_TTL_MS\s*=/.test(inlineMonolith), '0: _SCANNER_CHART_CANDLE_CACHE_TTL_MS stays declared in the monolith');

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(STORE_SRC.indexOf("'use strict'") === -1 && STORE_SRC.indexOf('"use strict"') === -1, '0: store-client module has no "use strict" pragma');
    ok(!/\bimport\b/.test(STORE_SRC), '0: store-client module has no import');
    ok(!/\bexport\b/.test(STORE_SRC), '0: store-client module has no export');
    ok(STORE_SRC.indexOf('require(') === -1, '0: store-client module has no require(');
    ok(!/window\.\w+\s*=/.test(STORE_SRC), '0: store-client module has no window.* export');

    // 0-MONOLITH-RESIDENTS. The DXLink primitive, the read-first orchestrators and the
    // per-feature adapters were NOT moved: they stay defined in the residual inline
    // monolith and did NOT leak into the store-client module.
    ['DXLINK_PRIMITIVE', 'READ_ORCHESTRATOR', 'FEATURE_ADAPTER'].forEach((cat) => {
      MANIFEST[cat].forEach((name) => {
        const reDef = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
        ok(reDef.test(inlineMonolith), '0: [' + cat + '] stays defined in the residual inline monolith: ' + name);
        ok(STORE_SRC.indexOf(name) === -1, '0: [' + cat + '] NOT present in candle-store-client.js: ' + name);
      });
    });

    // (18) the OTHER candle modules still do NOT exist yet, and index.html does not
    // reference them (only candle-store-client.js has been extracted so far).
    ['candle-read-adapters.js', 'candle-dxlink-client.js', 'candle-transport.js', 'candle-service.js'].forEach((f) => {
      const p = path.resolve(__dirname, '..', 'js', 'services', f);
      ok(fs.existsSync(p) === false, '0: js/services/' + f + ' does NOT exist yet');
    });
    ['candle-read-adapters', 'candle-dxlink-client', 'candle-transport', 'candle-service'].forEach((mod) => {
      ok(rawIndex.indexOf(mod) === -1, '0: index.html does not reference ' + mod + ' yet');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('1. ENDPOINT FAMILY CONTRACT — each adapter hits its literal endpoint (dynamic)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 1a. SFS DXLink read primitive → GET /dev/market/candles-dxlink/:sym?timeframe=
    let sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    await sb._sfsFetchBackendCandles('AAPL', '4H');
    ok(sb.fetch.calls[0].url === 'https://backend.test/dev/market/candles-dxlink/AAPL?timeframe=4H', '1: SFS read URL = /dev/market/candles-dxlink/:sym?timeframe=');
    ok(sb.fetch.calls[0].method === 'GET' && sb.fetch.calls[0].timeout === 15000, '1: SFS read is GET with 15000ms timeout');

    // symbol encoding into the path segment.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    await sb._sfsFetchBackendCandles('BRK.B', '1D');
    ok(sb.fetch.calls[0].url.indexOf('candles-dxlink/BRK.B?timeframe=1D') !== -1, '1: SFS encodes symbol (dot) into the path');

    // 1b. Scanner candle-store read primitive → GET /market/candles?symbol=&timeframe=&limit=300
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    await sb._scannerReadBackendCandlesTf('AAPL', '1D', { forceNetwork: true });
    ok(sb.fetch.calls[0].url === 'https://backend.test/market/candles?symbol=AAPL&timeframe=1D&limit=300', '1: scanner read URL = /market/candles?symbol=&timeframe=&limit=300');
    ok(sb.fetch.calls[0].method === 'GET' && sb.fetch.calls[0].timeout === 15000, '1: scanner read is GET with 15000ms timeout');

    // 1c. Scanner candle-store ensure → POST /market/candles/ensure
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    await sb._scannerEnsureBackendCandles('AAPL', ['1D', '30M', '4H'], 'scanner_chart_lookup');
    ok(sb.fetch.calls[0].url === 'https://backend.test/market/candles/ensure', '1: scanner ensure URL = /market/candles/ensure');
    ok(sb.fetch.calls[0].method === 'POST' && sb.fetch.calls[0].timeout === 25000, '1: scanner ensure is POST with 25000ms timeout');

    // 1d. Portfolio read → same /market/candles read family (dynamic, first read).
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    await sb._portfolioFetchBackendCandlesForChart('AAPL');
    ok(sb.fetch.calls[0].url === 'https://backend.test/market/candles?symbol=AAPL&timeframe=1D&limit=300', '1: portfolio first read URL = /market/candles?symbol=&timeframe=1D&limit=300');
    ok(sb.fetch.calls.every((c) => c.url.indexOf('/dev/market/candles-dxlink/') === -1), '1: portfolio NEVER hits the dxlink family');

    // 1e. MCX read → DXLink family; warmup only when cold/stale/forced.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: freshBars(25) }));
    await sb._mcxFetchBackendCandlesForChart('SPY');
    ok(sb.fetch.calls[0].url === 'https://backend.test/dev/market/candles-dxlink/SPY?timeframe=1D', '1: MCX first read URL = /dev/market/candles-dxlink/:sym?timeframe=1D');
    ok(sb.fetch.calls.every((c) => c.url.indexOf('/market/candles?symbol=') === -1), '1: MCX NEVER hits the candle-store read family');

    // 1f. Pre-trade → DXLink warmup FIRST, then DXLink reads.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    await sb._fetchPretradeBackendCandles('AAPL', 123);
    ok(sb.fetch.calls[0].url === 'https://backend.test/dev/market/candles-dxlink/warmup', '1: pretrade FIRST call is the dxlink warmup POST');
    ok(sb.fetch.calls[1].url === 'https://backend.test/dev/market/candles-dxlink/AAPL?timeframe=1D', '1: pretrade then reads dxlink 1D');
    ok(sb.fetch.calls.every((c) => c.url.indexOf('/market/candles?symbol=') === -1 && c.url.indexOf('/market/candles/ensure') === -1), '1: pretrade NEVER hits the candle-store family');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('2. TRANSPORT CONTRACT — fetch+_backendAuthHeaders vs ttCall vs _runLimited (per adapter)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 2a. All gated adapters send x-api-key via _backendAuthHeaders and cache:'no-store'.
    let sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(sb.fetch.calls[0].headers['x-api-key'] === 'KEY', '2: SFS read carries x-api-key auth header');
    ok(sb.fetch.calls[0].cache === 'no-store', '2: SFS read is cache:no-store');

    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    await sb._scannerReadBackendCandlesTf('AAPL', '1D', { forceNetwork: true });
    ok(sb.fetch.calls[0].headers['x-api-key'] === 'KEY', '2: scanner read carries x-api-key auth header');

    // ensure/warmup POSTs also set Content-Type application/json.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    await sb._scannerEnsureBackendCandles('AAPL', ['1D'], 'x');
    ok(sb.fetch.calls[0].headers['Content-Type'] === 'application/json' && sb.fetch.calls[0].headers['x-api-key'] === 'KEY', '2: scanner ensure sets Content-Type + x-api-key');

    // 2b. STATIC — transport family per adapter (hard to observe on the happy path).
    const B = {};
    ['_sfsFetchBackendCandles', '_scannerReadBackendCandlesTf', '_scannerEnsureBackendCandles',
      '_portfolioFetchBackendCandlesForChart', '_mcxFetchBackendCandlesForChart', '_fetchPretradeBackendCandles',
      'fetchBackendCandles', 'fetchBackendCandleStoreCandles', 'ensureBackendCandleStoreSymbol'].forEach((n) => { B[n] = stripComments(extractFn(HTML, n)); });

    // gated adapters use fetch(+auth headers), NOT ttCall.
    ['_sfsFetchBackendCandles', '_scannerReadBackendCandlesTf', '_portfolioFetchBackendCandlesForChart', '_mcxFetchBackendCandlesForChart', '_fetchPretradeBackendCandles'].forEach((n) => {
      ok(/\bfetch\(/.test(B[n]) && /_backendAuthHeaders\(/.test(B[n]) && !/\bttCall\(/.test(B[n]), '2: gated read adapter uses fetch+_backendAuthHeaders (not ttCall): ' + n);
    });
    // main-chart candle store (EXCLUDED) uses ttCall — a DIFFERENT transport that is NOT the auth gate.
    ok(/\bttCall\(/.test(B.fetchBackendCandleStoreCandles) && !/\bfetch\(/.test(B.fetchBackendCandleStoreCandles), '2: DOCUMENTED asymmetry — main-chart store READ uses ttCall (not fetch)');
    ok(/\bttCall\(/.test(B.ensureBackendCandleStoreSymbol), '2: DOCUMENTED asymmetry — main-chart store ENSURE uses ttCall (not fetch)');
    ok(!/_backendCandleGateOpen/.test(B.fetchBackendCandleStoreCandles) && /ffBackendCandleStoreChart\(/.test(B.fetchBackendCandleStoreCandles), '2: main-chart store gates on the FF flag, not the candle auth gate');
    // legacy public read uses the _runLimited pool wrapper + no auth headers.
    ok(/_runLimited\(/.test(B.fetchBackendCandles) && !/_backendAuthHeaders/.test(B.fetchBackendCandles), '2: legacy fetchBackendCandles uses _runLimited pool + NO auth headers');
    ok(B.fetchBackendCandles.indexOf('AbortSignal.timeout(20000)') !== -1, '2: legacy fetchBackendCandles uses a 20000ms timeout (distinct from the 15000ms read adapters)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('3. AUTH GATE MATRIX — preventive gate / reason / provenance / error codes');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 3a. Gate CLOSED → zero fetches for every gated adapter (no 401 storm), each
    // returning its own gate-closed shape.
    const gatedProbes = [
      { name: '_sfsFetchBackendCandles', call: (sb) => sb._sfsFetchBackendCandles('NVDA', '1D'), reasonField: 'reason' },
      { name: '_scannerReadBackendCandlesTf', call: (sb) => sb._scannerReadBackendCandlesTf('NVDA', '1D', { forceNetwork: true }), reasonField: 'fallbackReason' },
      { name: '_scannerEnsureBackendCandles', call: (sb) => sb._scannerEnsureBackendCandles('NVDA', ['1D'], 'x'), reasonField: 'fallbackReason' },
      { name: '_portfolioFetchBackendCandlesForChart', call: (sb) => sb._portfolioFetchBackendCandlesForChart('NVDA'), reasonField: 'fallbackReason' },
      { name: '_mcxFetchBackendCandlesForChart', call: (sb) => sb._mcxFetchBackendCandlesForChart('NVDA'), reasonField: 'fallbackReason' },
      { name: '_fetchPretradeBackendCandles', call: (sb) => sb._fetchPretradeBackendCandles('NVDA', 1), reasonField: 'fallbackReason' },
    ];
    for (const p of gatedProbes) {
      const sb = newCore(); // gate CLOSED (no auth)
      sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
      const r = await p.call(sb);
      ok(sb.fetch.calls.length === 0, '3: gate closed → ZERO fetches: ' + p.name);
      ok(r && r[p.reasonField] === 'backend_auth_not_ready', '3: gate-closed reason surfaced (' + p.reasonField + '=backend_auth_not_ready): ' + p.name);
    }

    // 3b. Provenance recording on a closed gate is an ASYMMETRY — some record, some don't.
    let sb = newCore();
    await sb._sfsFetchBackendCandles('NVDA', '1D');
    ok(sb._candleProvenanceLog.some((r) => r.view === 'sfs_chart'), '3: SFS records provenance on gate-closed (view=sfs_chart)');
    sb = newCore();
    await sb._mcxFetchBackendCandlesForChart('NVDA');
    ok(sb._candleProvenanceLog.some((r) => r.view === 'market_context_chart'), '3: MCX records provenance on gate-closed (view=market_context_chart)');
    sb = newCore();
    await sb._portfolioFetchBackendCandlesForChart('NVDA');
    ok(sb._candleProvenanceLog.some((r) => r.view === 'portfolio_chart'), '3: portfolio records provenance on gate-closed (view=portfolio_chart)');
    sb = newCore();
    await sb._scannerFetchBackendCandlesForChart('NVDA');
    ok(sb._candleProvenanceLog.some((r) => r.view === 'backend_loader'), '3: scanner orchestrator records provenance on gate-closed (view=backend_loader)');
    // pretrade + scanner READ primitive do NOT record provenance on a closed gate.
    sb = newCore();
    await sb._fetchPretradeBackendCandles('NVDA', 1);
    ok(sb._candleProvenanceLog.length === 0, '3: DOCUMENTED asymmetry — pretrade does NOT record provenance on gate-closed');
    sb = newCore();
    await sb._scannerReadBackendCandlesTf('NVDA', '1D', { forceNetwork: true });
    ok(sb._candleProvenanceLog.length === 0, '3: DOCUMENTED asymmetry — scanner READ primitive does NOT record provenance on gate-closed');

    // 3c. HTTP status handling on the SFS read primitive: only 401/403 arm the backoff.
    for (const st of [401, 403, 404, 429, 500]) {
      sb = newCore(); authReady(sb);
      sb.fetch = recordingFetch(() => resp(st, {}));
      const r = await sb._sfsFetchBackendCandles('AAPL', '1D');
      ok(r.ok === false && r.status === st && r.reason === 'http_' + st, '3: SFS HTTP ' + st + ' → {ok:false, reason:http_' + st + '}');
      ok(sb._backendCandleBackoffActive() === ((st === 401 || st === 403)), '3: SFS HTTP ' + st + ' arms backoff = ' + (st === 401 || st === 403));
    }
    // network throw + abort → reason fetch:<message>.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => { throw new Error('Failed to fetch'); });
    let r = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(r.ok === false && /^fetch:/.test(r.reason), '3: SFS network throw → reason fetch:<message>');
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => ({ __throw: Object.assign(new Error('aborted'), { name: 'AbortError' }) }));
    r = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(r.ok === false && /^fetch:/.test(r.reason), '3: SFS abort → reason fetch:<message>');

    // 3d. STATIC — legacy public read consults NO gate at all (documented outlier).
    const legacy = stripComments(extractFn(HTML, 'fetchBackendCandles'));
    ok(/_backendCandleGateOpen/.test(legacy) === false, '3: DOCUMENTED asymmetry — legacy fetchBackendCandles does NOT consult the auth gate');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('4. RETURN SHAPE CONTRACT — each adapter returns its own shape (NOT unified)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 4a. SFS read primitive → { ok, status, count, candles, reason }
    let sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    let r = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(r.ok === true && r.status === 200 && r.count === 25 && Array.isArray(r.candles) && r.reason === null, '4: SFS success → {ok,status,count,candles,reason:null}');
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: [] }));
    r = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(r.ok === true && r.count === 0 && r.reason === 'empty', '4: SFS empty 200 → {ok:true,count:0,reason:empty}');
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, 'x', { badJson: true }));
    r = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(r.ok === false && r.reason === 'json_parse', '4: SFS unparseable body → {ok:false,reason:json_parse}');

    // 4b. Scanner READ primitive → { ok, candles, count, missingReason, diag } (+ fromSessionCache on a hit)
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    r = await sb._scannerReadBackendCandlesTf('AAPL', '1D', { forceNetwork: true });
    ok(r.ok === true && r.count === 25 && Array.isArray(r.candles) && ('missingReason' in r) && ('diag' in r), '4: scanner read success → {ok,candles,count,missingReason,diag}');
    ok(!('reason' in r) || r.reason === undefined, '4: scanner read success shape has no top-level reason field');
    // <20 bars → ok:false, candles:null, not cached.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(19) }));
    r = await sb._scannerReadBackendCandlesTf('AAPL', '1D', { forceNetwork: true });
    ok(r.ok === false && r.candles === null, '4: scanner read <20 bars → {ok:false,candles:null}');

    // 4c. Scanner ENSURE → { ok:true } | { ok:false, fallbackReason }
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    r = await sb._scannerEnsureBackendCandles('AAPL', ['1D'], 'x');
    ok(r.ok === true && Object.keys(r).join(',') === 'ok', '4: scanner ensure success → exactly {ok:true}');
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(503, {}));
    r = await sb._scannerEnsureBackendCandles('AAPL', ['1D'], 'x');
    ok(r.ok === false && r.fallbackReason === 'ensure_http_503', '4: scanner ensure 503 → {ok:false,fallbackReason:ensure_http_503}');

    // 4d. Portfolio orchestrator → { ok:true, source, candles1d, candles4h, diagnostics, diag4h }
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    r = await sb._portfolioFetchBackendCandlesForChart('AAPL');
    ok(r.ok === true && r.source === 'BACKEND_CANDLE_STORE' && Array.isArray(r.candles1d) && ('candles4h' in r) && r.diagnostics && ('diag4h' in r), '4: portfolio success → {ok,source:BACKEND_CANDLE_STORE,candles1d,candles4h,diagnostics,diag4h}');

    // 4e. MCX orchestrator → { ok:true, source:BACKEND_DXLINK_CANDLES, candles1d, candles4h, diagnostics(forceRefresh), diag4h }
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: freshBars(25) }));
    r = await sb._mcxFetchBackendCandlesForChart('SPY');
    ok(r.ok === true && r.source === 'BACKEND_DXLINK_CANDLES' && Array.isArray(r.candles1d) && r.diagnostics && ('forceRefresh' in r.diagnostics), '4: MCX success → {ok,source:BACKEND_DXLINK_CANDLES,...,diagnostics.forceRefresh}');

    // 4f. Pre-trade → { ok:true, technicals1d, technicals4h } (technicals, NOT candles — a distinct shape)
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch((url) => resp(200, { candles: backendBars(25) }));
    r = await sb._fetchPretradeBackendCandles('AAPL', 100);
    ok(r.ok === true && r.technicals1d && r.technicals1d.__tech === true && ('technicals4h' in r), '4: pretrade success → {ok,technicals1d,technicals4h} (NOT a candles envelope)');
    ok(!('candles1d' in r) && !('source' in r), '4: DOCUMENTED asymmetry — pretrade returns technicals, never a candles1d/source envelope');
    // 4h non-fatal: 1D ok but 4H short → technicals4h stays null, still ok:true.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch((url) => resp(200, { candles: url.indexOf('timeframe=4H') !== -1 ? backendBars(5) : backendBars(25) }));
    r = await sb._fetchPretradeBackendCandles('AAPL', 100);
    ok(r.ok === true && r.technicals4h === null, '4: pretrade 4H short → technicals4h:null, still ok:true (4H non-fatal)');

    // 4g. Legacy public read → sorted array of {t,date,c,h,l,o,v} on success; THROWS on failure.
    sb = newCore();
    sb.fetch = recordingFetch(() => resp(200, { candles: [
      { date: '2024-01-03', open: 2, high: 3, low: 1, close: 2.5, volume: 10 },
      { date: '2024-01-02', open: 1, high: 2, low: 0.5, close: 1.5, volume: 5 },
    ] }));
    const arr = await sb.fetchBackendCandles('AAPL');
    ok(Array.isArray(arr) && arr.length === 2 && arr[0].t <= arr[1].t && ('date' in arr[0]), '4: legacy success → sorted array of {t,date,c,h,l,o,v}');
    let threw = false;
    sb = newCore();
    sb.fetch = recordingFetch(() => resp(500, {}));
    try { await sb.fetchBackendCandles('AAPL'); } catch (e) { threw = true; }
    ok(threw === true, '4: DOCUMENTED asymmetry — legacy fetchBackendCandles THROWS on HTTP error (does not return a structured object)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('5. MAPPER + SOURCE LABEL — per-candle source labels differ, and are NOT unified');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 5a. SFS read primitive maps to {time,open,high,low,close,volume} with NO source label.
    let sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    let r = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(r.candles[0].time != null && r.candles[0].close != null && !('source' in r.candles[0]), '5: SFS candles carry NO per-candle source label');

    // 5b. Scanner READ primitive maps via _mapBackendCandlesForChart → source BACKEND_DXLINK_CANDLES,
    // even though it reads the candle STORE endpoint. DOCUMENTED asymmetry (label != endpoint family).
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    r = await sb._scannerReadBackendCandlesTf('AAPL', '1D', { forceNetwork: true });
    ok(r.candles[0].source === 'BACKEND_DXLINK_CANDLES', '5: DOCUMENTED asymmetry — scanner READ primitive labels store candles BACKEND_DXLINK_CANDLES');

    // 5c. Portfolio inner mapper → per-candle source BACKEND_CANDLE_STORE.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    r = await sb._portfolioFetchBackendCandlesForChart('AAPL');
    ok(r.candles1d[0].source === 'BACKEND_CANDLE_STORE', '5: portfolio candles carry per-candle source BACKEND_CANDLE_STORE');

    // 5d. MCX inner mapper → per-candle source BACKEND_DXLINK_CANDLES.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: freshBars(25) }));
    r = await sb._mcxFetchBackendCandlesForChart('SPY');
    ok(r.candles1d[0].source === 'BACKEND_DXLINK_CANDLES', '5: MCX candles carry per-candle source BACKEND_DXLINK_CANDLES');

    // 5e. Both shared mappers reject <20 bars with null (min threshold preserved).
    sb = newCore();
    ok(sb._mapBackendCandlesForChart(sb._apexParityNormCandleArray(backendBars(19))) === null, '5: dxlink mapper returns null under 20 bars');
    ok(sb._scannerMapBackendCandlesForChart(sb._apexParityNormCandleArray(backendBars(19))) === null, '5: scanner mapper returns null under 20 bars');
    ok(sb._mapBackendCandlesForChart(sb._apexParityNormCandleArray(backendBars(25)))[0].source === 'BACKEND_DXLINK_CANDLES', '5: _mapBackendCandlesForChart source = BACKEND_DXLINK_CANDLES');
    ok(sb._scannerMapBackendCandlesForChart(sb._apexParityNormCandleArray(backendBars(25)))[0].source === 'BACKEND_CANDLE_STORE', '5: _scannerMapBackendCandlesForChart source = BACKEND_CANDLE_STORE');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('6. CACHE CONTRACT — scanner session cache (key / TTL / <20 skip / hit / miss / write)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 6a. Cache key normalizes symbol + timeframe (trim + upper, "SYMBOL|TF").
    let sb = newCore();
    ok(sb._scannerChartCandleCacheKey(' aapl ', '1d') === 'AAPL|1D', '6: cache key = trimmed-upper SYMBOL|TF');

    // 6b. A successful scanner read WRITES the session cache; the next non-force read HITS it.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    await sb._scannerReadBackendCandlesTf('AAPL', '1D', { forceNetwork: true });
    ok(sb._scannerChartCandleSessionCache[sb._scannerChartCandleCacheKey('AAPL', '1D')] != null, '6: successful read WRITES the session cache');
    const before = sb.fetch.calls.length;
    const hit = await sb._scannerReadBackendCandlesTf('AAPL', '1D'); // no forceNetwork → cache hit
    ok(sb.fetch.calls.length === before && hit.fromSessionCache === true, '6: cache HIT → no new fetch, fromSessionCache:true');

    // 6c. forceNetwork bypasses the cache (miss even when cached).
    const before2 = sb.fetch.calls.length;
    await sb._scannerReadBackendCandlesTf('AAPL', '1D', { forceNetwork: true });
    ok(sb.fetch.calls.length === before2 + 1, '6: forceNetwork bypasses the cache (issues a fetch)');

    // 6d. <20 bars are NOT cached (write skipped).
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(19) }));
    await sb._scannerReadBackendCandlesTf('ZZZ', '1D', { forceNetwork: true });
    ok(sb._scannerGetCachedBackendTfCandles('ZZZ', '1D') === null, '6: <20-bar read is NOT written to the cache');

    // 6e. TTL expiry: an aged entry is treated as a miss.
    sb = newCore();
    const key = sb._scannerChartCandleCacheKey('AAPL', '1D');
    sb._scannerPutCachedBackendTfCandles('AAPL', '1D', backendBars(25).map((b) => ({ close: b.close })));
    ok(sb._scannerGetCachedBackendTfCandles('AAPL', '1D') != null, '6: fresh entry is a cache hit');
    sb._scannerChartCandleSessionCache[key].timestamp = Date.now() - (3 * 60 * 1000) - 1;
    ok(sb._scannerGetCachedBackendTfCandles('AAPL', '1D') === null, '6: entry older than the 3-min TTL is a MISS');

    // 6f. The DXLink read primitive (SFS) has NO response cache of its own (leaf read only).
    const sfsBody = stripComments(extractFn(HTML, '_sfsFetchBackendCandles'));
    ok(!/_scannerChartCandleSessionCache|_pfBackendCandleCache|SessionCache/.test(sfsBody), '6: DOCUMENTED asymmetry — the SFS read primitive keeps NO response cache (unlike the scanner store read)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('7. ENSURE vs WARMUP — different endpoints, payloads, and timeframes (NOT synonyms)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 7a. Candle-store ENSURE → POST /market/candles/ensure body {symbol,timeframes,reason}.
    let sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    await sb._scannerEnsureBackendCandles('AAPL', ['1D', '30M', '4H'], 'scanner_chart_lookup');
    let c = sb.fetch.calls[0];
    ok(c.url === 'https://backend.test/market/candles/ensure' && c.method === 'POST', '7: ENSURE endpoint = POST /market/candles/ensure');
    ok(JSON.stringify(c.body) === JSON.stringify({ symbol: 'AAPL', timeframes: ['1D', '30M', '4H'], reason: 'scanner_chart_lookup' }), '7: ENSURE body = {symbol,timeframes,reason}');
    ok(!('waitMs' in c.body), '7: ENSURE body has NO waitMs (distinct from warmup)');

    // 7b. DXLink WARMUP → POST /dev/market/candles-dxlink/warmup body {symbols,timeframes:['1D','30M'],waitMs:15000}.
    // Observed via MCX cold-cache path (1D missing → warmup fires).
    sb = newCore(); authReady(sb);
    let readN = 0;
    sb.fetch = recordingFetch((url, opts) => {
      if (url.indexOf('/warmup') !== -1) return resp(200, { ok: true });
      readN++;
      // first two reads (1D+4H) empty → forces warmup; post-warmup reads return data.
      return resp(200, { candles: readN <= 2 ? [] : freshBars(25) });
    });
    await sb._mcxFetchBackendCandlesForChart('SPY');
    const warm = sb.fetch.calls.filter((x) => x.url.indexOf('/warmup') !== -1)[0];
    ok(warm && warm.url === 'https://backend.test/dev/market/candles-dxlink/warmup' && warm.method === 'POST', '7: WARMUP endpoint = POST /dev/market/candles-dxlink/warmup');
    ok(JSON.stringify(warm.body.symbols) === JSON.stringify(['SPY']) && JSON.stringify(warm.body.timeframes) === JSON.stringify(['1D', '30M']), '7: WARMUP body symbols + timeframes=[1D,30M] (4H derived server-side, never requested)');
    ok(warm.body.waitMs === 15000, '7: WARMUP body carries waitMs:15000 (distinct from ensure)');

    // 7c. STATIC — the two families never cross endpoints.
    const ens = stripComments(extractFn(HTML, '_scannerEnsureBackendCandles'));
    const mcx = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));
    ok(/\/market\/candles\/ensure/.test(ens) && !/candles-dxlink\/warmup/.test(ens), '7: scanner ensure uses /market/candles/ensure and NOT the dxlink warmup');
    ok(/candles-dxlink\/warmup/.test(mcx) && !/\/market\/candles\/ensure/.test(mcx), '7: MCX warmup uses candles-dxlink/warmup and NOT /market/candles/ensure');

    // 7d. Pre-trade warms with the SAME dxlink warmup family + timeframes [1D,30M].
    const pt = stripComments(extractFn(HTML, '_fetchPretradeBackendCandles'));
    ok(/candles-dxlink\/warmup/.test(pt) && /\['1D', '30M'\]|\['1D','30M'\]/.test(pt), '7: pretrade warmup uses candles-dxlink/warmup with timeframes [1D,30M]');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('8. READ-FIRST ORCHESTRATION — scanner (parallel + polled) vs portfolio (sequential + single re-read)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 8a. SCANNER: warm cache miss, both 1D+4H usable on the FIRST parallel read →
    // no ensure, source BACKEND_CANDLE_STORE, exactly 2 reads.
    let sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    let r = await sb._scannerFetchBackendCandlesForChart('AAPL');
    const scannerReads = sb.fetch.calls.filter((x) => x.url.indexOf('/market/candles?') !== -1).length;
    const scannerEnsures = sb.fetch.calls.filter((x) => x.url.indexOf('/ensure') !== -1).length;
    ok(r.ok === true && r.source === 'BACKEND_CANDLE_STORE', '8: scanner happy path → ok, source BACKEND_CANDLE_STORE');
    ok(scannerReads === 2 && scannerEnsures === 0, '8: scanner reads 1D+4H in PARALLEL (2 reads) and does NOT ensure when both usable');

    // 8b. SCANNER cache-hit path → fromSessionCache + revalidating, no network read.
    sb = newCore(); authReady(sb);
    sb._scannerPutCachedBackendTfCandles('AAPL', '1D', backendBars(25).map((b) => ({ close: b.close, time: 1 })));
    sb._scannerPutCachedBackendTfCandles('AAPL', '4H', backendBars(25).map((b) => ({ close: b.close, time: 1 })));
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    r = await sb._scannerFetchBackendCandlesForChart('AAPL');
    ok(r.ok === true && r.fromSessionCache === true && r.revalidating === true, '8: scanner cache-hit → {ok,fromSessionCache:true,revalidating:true}');
    ok(sb.fetch.calls.length === 0, '8: scanner cache-hit performs NO synchronous network read');

    // 8c. SCANNER cold path → 1D empty first → ensure fires ONCE → bounded re-reads recover.
    sb = newCore(); authReady(sb);
    let sPhase = 0;
    sb.fetch = recordingFetch((url) => {
      if (url.indexOf('/ensure') !== -1) return resp(200, { ok: true });
      // first parallel pair empty; every subsequent read returns data.
      sPhase++;
      return resp(200, { ok: true, candles: sPhase <= 2 ? [] : backendBars(25) });
    });
    r = await sb._scannerFetchBackendCandlesForChart('AAPL');
    ok(r.ok === true && r.diagnostics.warmed === true, '8: scanner cold path → warms then recovers (diagnostics.warmed:true)');
    ok(sb.fetch.calls.filter((x) => x.url.indexOf('/ensure') !== -1).length === 1, '8: scanner cold path ensures EXACTLY once');

    // 8d. PORTFOLIO: reads are SEQUENTIAL (1D before 4H) — pin the ordering.
    sb = newCore(); authReady(sb);
    const order = [];
    sb.fetch = recordingFetch((url) => { if (url.indexOf('timeframe=1D') !== -1) order.push('1D'); if (url.indexOf('timeframe=4H') !== -1) order.push('4H'); return resp(200, { ok: true, candles: backendBars(25) }); });
    r = await sb._portfolioFetchBackendCandlesForChart('AAPL');
    ok(order.length === 2 && order[0] === '1D' && order[1] === '4H', '8: DOCUMENTED asymmetry — portfolio reads 1D then 4H SEQUENTIALLY (scanner reads them in parallel)');

    // 8e. PORTFOLIO cold path → ensure once then a SINGLE re-read pair (no bounded polling loop).
    sb = newCore(); authReady(sb);
    let pPhase = 0;
    sb.fetch = recordingFetch((url) => {
      if (url.indexOf('/ensure') !== -1) return resp(200, { ok: true });
      pPhase++;
      // first 1D read empty → ensure → second reads usable.
      return resp(200, { ok: true, candles: pPhase <= 2 ? [] : backendBars(25) });
    });
    r = await sb._portfolioFetchBackendCandlesForChart('AAPL');
    const pReads = sb.fetch.calls.filter((x) => x.url.indexOf('/market/candles?') !== -1).length;
    ok(r.ok === true && r.diagnostics.warmed === true, '8: portfolio cold path → warms then recovers');
    ok(sb.fetch.calls.filter((x) => x.url.indexOf('/ensure') !== -1).length === 1 && pReads === 4, '8: DOCUMENTED asymmetry — portfolio does ONE re-read pair after ensure (2 initial + 2 re-read = 4 reads), NOT a bounded polling loop');

    // 8f. STATIC — scanner has the bounded polling loop; portfolio does not.
    const sOrch = stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart'));
    const pOrch = stripComments(extractFn(HTML, '_portfolioFetchBackendCandlesForChart'));
    ok(/_scannerBackendCandleWait\(/.test(sOrch) && /attempt1\s*<=\s*2/.test(sOrch), '8: scanner orchestrator uses bounded polled re-reads with backoff waits');
    ok(!/_scannerBackendCandleWait\(/.test(pOrch) && /Promise\.allSettled/.test(sOrch) && !/Promise\.allSettled/.test(pOrch), '8: portfolio orchestrator has NO backoff-wait polling and reads sequentially (no Promise.allSettled)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('9. ALIAS _loadBackendChartCandles — delegates verbatim to the scanner orchestrator (never re-pointed)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 9a. DYNAMIC — the alias forwards its argument and returns the delegate's result
    // unchanged. A spy replaces the scanner orchestrator to prove the delegation seam.
    const spySb = {
      console: makeConsole().console, Promise, String,
      __arg: null,
      _scannerFetchBackendCandlesForChart: function (sym) { spySb.__arg = sym; return { __sentinel: true, sym: sym }; },
    };
    vm.createContext(spySb);
    loadReal(spySb, ['_loadBackendChartCandles']);
    const out = spySb._loadBackendChartCandles('AAPL');
    ok(spySb.__arg === 'AAPL', '9: _loadBackendChartCandles forwards its symbol argument to _scannerFetchBackendCandlesForChart');
    ok(out && out.__sentinel === true && out.sym === 'AAPL', '9: _loadBackendChartCandles returns the delegate result verbatim (no wrapping/defaulting)');

    // 9b. STATIC — the alias body ONLY delegates to the scanner fetcher, and to no
    // other family (guards against an accidental re-point to dxlink/portfolio/mcx/sfs).
    const aliasBody = stripComments(extractFn(HTML, '_loadBackendChartCandles'));
    ok(/_scannerFetchBackendCandlesForChart\(/.test(aliasBody), '9: alias body delegates to _scannerFetchBackendCandlesForChart');
    ok(!/candles-dxlink|_mcxFetchBackendCandlesForChart|_portfolioFetchBackendCandlesForChart|_sfsFetchBackendCandles|_fetchPretradeBackendCandles/.test(aliasBody), '9: alias body references NO other adapter family (cannot be silently re-pointed)');
    ok(!/\bfetch\(/.test(aliasBody), '9: alias body issues no fetch of its own (pure delegation)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('10. CONSUMER ISOLATION MATRIX — derived from the executed adapters');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Each consumer is exercised and its (read family, source label, gate posture,
    // ensure/warmup family, envelope shape) is asserted together so the whole row is
    // pinned as a unit. The matrix is intentionally NOT collapsed.
    async function probe(name, fn, body) {
      const sb = newCore(); authReady(sb);
      const urls = [];
      sb.fetch = recordingFetch((url) => { urls.push(url); return resp(200, body(url)); });
      sb.__ttNext = () => ({ ok: true });
      const r = await fn(sb);
      return { r, urls, sb };
    }
    // Scanner (via the shared orchestrator).
    let p = await probe('scanner', (sb) => sb._scannerFetchBackendCandlesForChart('AAPL'), () => ({ ok: true, candles: backendBars(25) }));
    ok(p.urls.every((u) => u.indexOf('/market/candles') !== -1) && p.r.source === 'BACKEND_CANDLE_STORE', '10: Scanner → candle-store family, source BACKEND_CANDLE_STORE');
    // Portfolio.
    p = await probe('portfolio', (sb) => sb._portfolioFetchBackendCandlesForChart('AAPL'), () => ({ ok: true, candles: backendBars(25) }));
    ok(p.urls.every((u) => u.indexOf('/market/candles') !== -1) && p.r.source === 'BACKEND_CANDLE_STORE', '10: Portfolio → candle-store family, source BACKEND_CANDLE_STORE');
    // Market Context.
    p = await probe('mcx', (sb) => sb._mcxFetchBackendCandlesForChart('SPY'), () => ({ candles: freshBars(25) }));
    ok(p.urls.every((u) => u.indexOf('/dev/market/candles-dxlink/') !== -1) && p.r.source === 'BACKEND_DXLINK_CANDLES', '10: Market Context → dxlink family, source BACKEND_DXLINK_CANDLES');
    // Pre-trade (technicals envelope).
    p = await probe('pretrade', (sb) => sb._fetchPretradeBackendCandles('AAPL', 100), () => ({ candles: backendBars(25) }));
    ok(p.urls.every((u) => u.indexOf('/dev/market/candles-dxlink/') !== -1) && p.r.ok === true && p.r.technicals1d, '10: Pre-trade → dxlink family, technicals envelope (warmup-first)');
    // SFS/Swing (read primitive).
    p = await probe('sfs', (sb) => sb._sfsFetchBackendCandles('AAPL', '1D'), () => ({ candles: backendBars(25) }));
    ok(p.urls.every((u) => u.indexOf('/dev/market/candles-dxlink/') !== -1) && Array.isArray(p.r.candles) && !('source' in p.r.candles[0]), '10: SFS/Swing → dxlink family, unlabeled candles, {ok,status,count,candles,reason} envelope');

    console.log('  NOTE  consumer isolation matrix (read family / source / ensure-warmup):');
    console.log('        Scanner    | /market/candles      | BACKEND_CANDLE_STORE  | ensure  /market/candles/ensure');
    console.log('        Portfolio  | /market/candles      | BACKEND_CANDLE_STORE  | ensure  /market/candles/ensure (sequential)');
    console.log('        MktContext | candles-dxlink       | BACKEND_DXLINK_CANDLES| warmup  candles-dxlink/warmup');
    console.log('        Pre-trade  | candles-dxlink       | (technicals)          | warmup-first candles-dxlink/warmup');
    console.log('        SFS/Swing  | candles-dxlink       | (unlabeled)           | warmup owned by the orchestrator');
    console.log('        MainChart* | ttCall /market/candles| BACKEND_CANDLE_STORE | ttCall ensure (EXCLUDED — different transport)');
    console.log('        Legacy*    | /market/candles/:t   | (raw)                 | none (EXCLUDED — public, no gate)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('11. CONCURRENCY — in-flight / cooldown belong to the SFS orchestrator, NOT the read primitive');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // The SFS read primitive is a pure leaf read: it neither reads nor writes the
    // in-flight dedupe map, the warmup cooldown, or any queue. Two concurrent calls
    // therefore issue TWO independent fetches (the dedupe lives in the external
    // _sfsEnsureTfCandles orchestrator, pinned by candle-service-contract.test.js).
    let sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    await Promise.all([sb._sfsFetchBackendCandles('CAT', '1D'), sb._sfsFetchBackendCandles('CAT', '1D')]);
    ok(sb.fetch.calls.length === 2, '11: two concurrent SFS reads issue TWO fetches (read primitive does NOT dedupe)');

    // STATIC — the read primitive references NONE of the orchestrator concurrency state.
    const sfsBody = stripComments(extractFn(HTML, '_sfsFetchBackendCandles'));
    ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsDetail4hInflight', '_sfsWarmupQueue', '_sfsSpyReadInflight'].forEach((s) => {
      ok(sfsBody.indexOf(s) === -1, '11: SFS read primitive does NOT reference orchestrator state: ' + s);
    });
    // The concurrency state IS declared elsewhere in the monolith (owned by the orchestrator).
    ok(/\bvar\s+_sfsTfFetchInflight\b/.test(HTML) && /\bvar\s+_sfsWarmupCooldown\b/.test(HTML), '11: orchestrator in-flight + cooldown state stays declared in the monolith (external to the read primitive)');

    // The candle-store read primitive likewise has no in-flight map of its own.
    const scanBody = stripComments(extractFn(HTML, '_scannerReadBackendCandlesTf'));
    ok(!/Inflight|inflight|InFlight/.test(scanBody), '11: scanner read primitive holds no in-flight dedupe map (the revalidate inflight lives in a separate function)');
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + (fail === 0 ? 'All ' + pass + ' tests passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
