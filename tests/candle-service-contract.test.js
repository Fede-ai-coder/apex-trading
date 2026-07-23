'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// CANDLE SERVICE — contract / boundary pin (PRE-EXTRACTION AUDIT).
//
// WHY THIS EXISTS
//   The candle logic is the next candidate to be extracted from index.html into
//   js/services/candle-service.js (the pattern already applied to the backend
//   client / backend config). Before ANY code moves, this test freezes the REAL
//   observable behaviour of the candle surface so a later extraction PR can only
//   pass if it preserves that behaviour byte-for-byte at the seams.
//
//   Analogous to tests/backend-client-contract.test.js (written before the
//   backend-client extraction), this test does NOT modify, simplify or unify the
//   application. It DESCRIBES and PROTECTS the current behaviour — including the
//   asymmetries between flows (4H detail vs generic timeframe, the two backend
//   endpoint families, the public vs gated read paths). Where two flows differ,
//   the test pins the difference rather than erasing it.
//
// WHAT IT PINS
//   • the structural manifest of candle symbols (still in index.html today) and
//     the fact that js/services/candle-service.js does NOT yet exist;
//   • the auth-ready / 401-backoff gate contract;
//   • the backend read contract (dxlink + market/candles families);
//   • the response normalization contract (parity extractor/normalizer + mappers);
//   • the warmup / ensure contract (SFS batch cap + scanner/mcx/pretrade payloads);
//   • throttling / in-flight dedupe;
//   • the 4H-detail vs generic-timeframe re-read semantics (explicitly compared);
//   • provenance + diagnostics ([CANDLE-PROVENANCE] recorder, classifier, gate map);
//   • the per-consumer boundary (which wrapper hits which endpoint family).
//
// HOW
//   Real functions are loaded from the reconstructed application source via
//   tests/lib/load-app-source.js and executed in a `vm` sandbox with controlled
//   dependencies. NO real network (every fetch is a mock), NO real timers (sleeps
//   and setTimeout are neutralised or recorded), NO npm dependencies.
//
// Run: node tests/candle-service-contract.test.js
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
// Backend candle rows in the {time,open,high,low,close,volume} shape the loaders map from.
function backendBars(n) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = 100 + i * 0.5;
    out.push({ time: new Date(ms0 + i * 86400000).toISOString(), open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000 });
  }
  return out;
}
// SFS-usable series (>= 22 bars, finite last close) in the {time,open,...} chart shape.
function series(n) {
  n = n || 25; const arr = [];
  for (let i = 0; i < n; i++) arr.push({ time: i + 1, open: 10 + i, high: 12 + i, low: 9 + i, close: 11 + i, volume: 100 });
  return arr;
}
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
function recordingFetch(handler) {
  const calls = [];
  const fn = function (url, options) {
    let body = null;
    try { body = options && options.body ? JSON.parse(options.body) : null; } catch (e) { body = options && options.body; }
    calls.push({ url: url, method: (options && options.method) || 'GET', headers: (options && options.headers) || {}, body: body });
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
// Loads the REAL auth gate, normalization, provenance and the dxlink read fn.
function newCore(overrides) {
  overrides = overrides || {};
  const cap = makeConsole();
  const subReqs = [];
  const sandbox = {
    console: cap.console, Date, JSON, Math, Number, Boolean, isFinite, parseFloat, parseInt,
    encodeURIComponent, Object, Array, Promise, String, RegExp, Set,
    BACKEND: 'https://backend.test',
    AbortSignal: { timeout: () => ({ __abort: true }) },
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
    _recordCandleSubscriptionRequest: (m) => { subReqs.push(m); return m; },
    __subReqs: subReqs,
    __logs: cap.logs,
  };
  Object.assign(sandbox, overrides.globals || {});
  vm.createContext(sandbox);
  loadReal(sandbox, [
    '_candleDiagNowIso',
    '_backendAuthHeaders', '_recordBackendApiAuthResult',
    '_backendCandleAuthReady', '_backendCandleBackoffActive', '_backendCandleGateOpen', '_backendCandleGateReason',
    '_noteBackendCandleFailure', '_noteBackendCandleSuccess',
    '_isBackendGateClosedReason', '_backendGateProvenanceSource',
    'backendApiAuthKnownInvalid', '_resetBackendApiAuthState', '_apexAuthSkip',
    '_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray', '_apexParityExtractBackendCandles',
    '_sfsExtractBackendCandles', '_mapBackendCandlesForChart', '_scannerMapBackendCandlesForChart',
    '_classifyBackendCandleProvenance', '_extractBackend4hDiag',
    '_recordCandleProvenance', '_recordBackendCandleProvenance',
    '_sfsFetchBackendCandles',
  ]);
  return sandbox;
}
function authReady(sb) { sb.S.backendKey = 'KEY'; sb.S.ttConnected = true; sb.S.ttSessionId = 'sess'; }

(async () => {
  // ═══════════════════════════════════════════════════════════════════════════
  section('0. STRUCTURAL — shared candle normalization extracted; rest of candle service still in monolith');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 0a. The FULL candle-service module must still NOT exist (only the shared
    // normalization closure was extracted, not the service), and index.html must
    // not load a candle-service module.
    const svcPath = path.resolve(__dirname, '..', 'js', 'services', 'candle-service.js');
    ok(fs.existsSync(svcPath) === false, '0: js/services/candle-service.js does NOT exist (only normalization extracted)');
    const rawIndex = loader.loadIndexHtml();
    ok(/candle-service/.test(rawIndex) === false, '0: index.html does not reference candle-service anywhere');
    const ordered = loader.loadOrderedScriptSources();
    const scriptTags = ordered.filter((s) => s.kind === 'local').map((s) => s.src);
    ok(scriptTags.indexOf('./js/services/candle-service.js') === -1, '0: no <script src> loads a candle-service module');
    // The already-extracted modules (now seven, incl. candle-normalization and the
    // candle auth gate) are still loaded.
    ['./js/utils/indicators.js', './js/utils/option-symbols.js', './js/utils/normalizers.js',
      './js/api/backend-client.js', './js/config/backend-config.js',
      './js/services/candle-normalization.js', './js/services/candle-auth-gate.js'].forEach((s) => {
      ok(scriptTags.indexOf(s) !== -1, '0: extracted module still loaded: ' + s);
    });

    // 0a-EXTRACTION. The new shared normalization module exists and is wired as a
    // classic script loaded AFTER the other extracted modules and BEFORE the
    // inline monolith. It must contain ONLY the seven shared functions + comments,
    // with no transport / auth / provenance / orchestration and no top-level code.
    const NORM_PATH = path.resolve(__dirname, '..', 'js', 'services', 'candle-normalization.js');
    const NORM_TAG = './js/services/candle-normalization.js';
    const SEVEN = ['_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray',
      '_apexParityExtractBackendCandles', '_sfsExtractBackendCandles',
      '_mapBackendCandlesForChart', '_scannerMapBackendCandlesForChart'];
    const inlineMonolith = ordered.filter((s) => s.kind === 'inline' && s.isAppJs).map((s) => s.code).join('\n');

    // (1) module file exists.
    ok(fs.existsSync(NORM_PATH), '0: js/services/candle-normalization.js exists');
    const MODULE_SRC = fs.existsSync(NORM_PATH) ? fs.readFileSync(NORM_PATH, 'utf8') : '';

    // (2) exactly one <script src> tag for it in index.html.
    const normTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/candle-normalization\.js["'][^>]*>/gi) || [];
    ok(normTags.length === 1, '0: exactly one candle-normalization.js <script> tag in index.html');
    const theTag = normTags[0] || '';

    // (3)(4) the tag is a classic script: no type=module, no async, no defer.
    ok(!/type\s*=\s*["']?module/i.test(theTag), '0: candle-normalization tag is classic (no type=module)');
    ok(!/\basync\b/i.test(theTag), '0: candle-normalization tag has no async attribute');
    ok(!/\bdefer\b/i.test(theTag), '0: candle-normalization tag has no defer attribute');

    // (5) load order: after the already-extracted modules, before the inline monolith.
    const normEntry = ordered.filter((s) => s.kind === 'local' && s.src === NORM_TAG)[0];
    const cfgEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/config/backend-config.js')[0];
    const firstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
    ok(!!normEntry, '0: candle-normalization.js is a local classic script in the load order');
    ok(!!cfgEntry && !!normEntry && cfgEntry.order < normEntry.order, '0: candle-normalization.js loads AFTER backend-config.js');
    ok(!!normEntry && !!firstInline && normEntry.order < firstInline.order, '0: candle-normalization.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(NORM_TAG) !== -1, '0: loader parses candle-normalization.js as a local script');

    // (7)(8)(9) each of the seven functions: present in the module, absent from the
    // residual inline monolith, and exactly one definition overall.
    SEVEN.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((MODULE_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in candle-normalization.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (10) the module contains ONLY the seven declarations + comments — no
    // top-level executable code. Strip comments, remove the seven bodies, expect
    // nothing but whitespace left.
    let residual = stripComments(MODULE_SRC);
    SEVEN.forEach((n) => { residual = residual.replace(stripComments(extractFn(MODULE_SRC, n)), ''); });
    ok(residual.trim() === '', '0: module contains ONLY the seven declarations + comments (no top-level executable code)');

    // (11) no transport / timers / DOM in the module.
    ok(!/\bfetch\s*\(/.test(MODULE_SRC), '0: module contains no fetch(');
    ok(!/\bttCall\s*\(/.test(MODULE_SRC), '0: module contains no ttCall(');
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(MODULE_SRC), '0: module contains no timers');
    ok(!/\bdocument\b|\bwindow\b|getElementById|querySelector|addEventListener/.test(MODULE_SRC), '0: module contains no DOM access');

    // (12) no auth gate in the module.
    ok(!/_backendCandleGateOpen|_backendCandleAuth|_noteBackendCandle|_backendAuthHeaders|backendApiAuthKnownInvalid/.test(MODULE_SRC),
      '0: module contains no auth gate');
    // (13) no provenance recorder in the module.
    ok(!/_recordCandleProvenance|_recordBackendCandleProvenance|_classifyBackendCandleProvenance|CANDLE-PROVENANCE/.test(MODULE_SRC),
      '0: module contains no provenance recorder');
    // (14) no SFS orchestration in the module.
    ok(!/_sfsEnsure|_sfsWarmup|_sfsDrain|_sfsQueue|_sfsFetchBackendCandles|_sfsSpyReadOnly/.test(MODULE_SRC),
      '0: module contains no SFS orchestration');

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(MODULE_SRC.indexOf("'use strict'") === -1 && MODULE_SRC.indexOf('"use strict"') === -1, '0: module has no "use strict" pragma');
    ok(!/\bimport\b/.test(MODULE_SRC), '0: module has no import');
    ok(!/\bexport\b/.test(MODULE_SRC), '0: module has no export');
    ok(MODULE_SRC.indexOf('require(') === -1, '0: module has no require(');
    ok(!/window\.\w+\s*=/.test(MODULE_SRC), '0: module has no window.* export');

    // 0a-EXTRACTION-GATE. The candle AUTH-READY gate + 401-BACKOFF functions are now a
    // separate classic module js/services/candle-auth-gate.js, loaded AFTER
    // candle-normalization.js and BEFORE the inline monolith. It must contain ONLY the
    // eleven approved gate functions + comments — NO state, NO constants, NO transport,
    // NO timers, NO DOM, NO provenance recorder, NO SFS orchestration, NO top-level code.
    // The state (_backendCandleAuth / _backendApiAuthState / _apexAuthSkipLogged) and the
    // backoff constants STAY in the monolith; _recordBackendApiAuthResult stays in
    // js/api/backend-client.js and is only CALLED (never redefined) from the gate module.
    const GATE_PATH = path.resolve(__dirname, '..', 'js', 'services', 'candle-auth-gate.js');
    const GATE_TAG = './js/services/candle-auth-gate.js';
    const ELEVEN = ['_backendCandleAuthReady', '_backendCandleBackoffActive', '_backendCandleGateOpen',
      '_backendCandleGateReason', '_noteBackendCandleFailure', '_noteBackendCandleSuccess',
      '_isBackendGateClosedReason', '_backendGateProvenanceSource', 'backendApiAuthKnownInvalid',
      '_resetBackendApiAuthState', '_apexAuthSkip'];

    // (1) module file exists.
    ok(fs.existsSync(GATE_PATH), '0: js/services/candle-auth-gate.js exists');
    const GATE_SRC = fs.existsSync(GATE_PATH) ? fs.readFileSync(GATE_PATH, 'utf8') : '';

    // (2) exactly one <script src> tag for it in index.html.
    const gateTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/candle-auth-gate\.js["'][^>]*>/gi) || [];
    ok(gateTags.length === 1, '0: exactly one candle-auth-gate.js <script> tag in index.html');
    const theGateTag = gateTags[0] || '';

    // (3)(4) the tag is a classic script: no type=module, no async, no defer.
    ok(!/type\s*=\s*["']?module/i.test(theGateTag), '0: candle-auth-gate tag is classic (no type=module)');
    ok(!/\basync\b/i.test(theGateTag), '0: candle-auth-gate tag has no async attribute');
    ok(!/\bdefer\b/i.test(theGateTag), '0: candle-auth-gate tag has no defer attribute');

    // (5) load order: AFTER candle-normalization.js, BEFORE the inline monolith.
    const gateEntry = ordered.filter((s) => s.kind === 'local' && s.src === GATE_TAG)[0];
    ok(!!gateEntry, '0: candle-auth-gate.js is a local classic script in the load order');
    ok(!!normEntry && !!gateEntry && normEntry.order < gateEntry.order, '0: candle-auth-gate.js loads AFTER candle-normalization.js');
    ok(!!gateEntry && !!firstInline && gateEntry.order < firstInline.order, '0: candle-auth-gate.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(GATE_TAG) !== -1, '0: loader parses candle-auth-gate.js as a local script');

    // (7)(8)(9) each of the eleven functions: present in the module, absent from the
    // residual inline monolith, and exactly one definition overall.
    ELEVEN.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((GATE_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in candle-auth-gate.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (10)(11) the module contains ONLY the eleven declarations + comments — no
    // top-level executable code (no state, no constants). Strip comments, remove the
    // eleven bodies, expect nothing but whitespace left.
    let gateResidual = stripComments(GATE_SRC);
    ELEVEN.forEach((n) => { gateResidual = gateResidual.replace(stripComments(extractFn(GATE_SRC, n)), ''); });
    ok(gateResidual.trim() === '', '0: gate module contains ONLY the eleven declarations + comments (no top-level executable code)');

    // (12) no transport in the module.
    ok(!/\bfetch\s*\(/.test(GATE_SRC), '0: gate module contains no fetch(');
    ok(!/\bttCall\s*\(/.test(GATE_SRC), '0: gate module contains no ttCall(');
    // (13) no timers in the module.
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(GATE_SRC), '0: gate module contains no timers');
    // (14) no DOM in the module.
    ok(!/\bdocument\b|\bwindow\b|getElementById|querySelector|addEventListener/.test(GATE_SRC), '0: gate module contains no DOM access');
    // (15) no provenance recorder in the module.
    ok(!/_recordCandleProvenance|_recordBackendCandleProvenance|_classifyBackendCandleProvenance|CANDLE-PROVENANCE/.test(GATE_SRC),
      '0: gate module contains no provenance recorder');
    // (16) no SFS orchestration in the module.
    ok(!/_sfsEnsure|_sfsWarmup|_sfsDrain|_sfsQueue|_sfsFetchBackendCandles|_sfsSpyReadOnly/.test(GATE_SRC),
      '0: gate module contains no SFS orchestration');

    // (17)(18)(19) NO state / constant DECLARATIONS in the module (the functions may
    // reference these globals — they must not declare them).
    ok(!/\bvar\s+_backendCandleAuth\s*=/.test(GATE_SRC), '0: gate module does NOT declare _backendCandleAuth');
    ok(!/\bvar\s+_backendApiAuthState\s*=/.test(GATE_SRC), '0: gate module does NOT declare _backendApiAuthState');
    ok(!/\bvar\s+_apexAuthSkipLogged\s*=/.test(GATE_SRC), '0: gate module does NOT declare _apexAuthSkipLogged');
    ok(!/\b(?:var|const|let)\s+_BACKEND_CANDLE_BACKOFF_MS\b/.test(GATE_SRC), '0: gate module does NOT declare _BACKEND_CANDLE_BACKOFF_MS');
    ok(!/\b(?:var|const|let)\s+_BACKEND_CANDLE_FAIL_MAX\b/.test(GATE_SRC), '0: gate module does NOT declare _BACKEND_CANDLE_FAIL_MAX');

    // (20) the state + constants STAY declared in the residual inline monolith.
    ok(/\bvar\s+_backendCandleAuth\s*=/.test(inlineMonolith), '0: _backendCandleAuth stays declared in the monolith');
    ok(/\bvar\s+_backendApiAuthState\s*=/.test(inlineMonolith), '0: _backendApiAuthState stays declared in the monolith');
    ok(/\bvar\s+_apexAuthSkipLogged\s*=/.test(inlineMonolith), '0: _apexAuthSkipLogged stays declared in the monolith');
    ok(/\bvar\s+_BACKEND_CANDLE_BACKOFF_MS\b/.test(inlineMonolith), '0: _BACKEND_CANDLE_BACKOFF_MS stays declared in the monolith');
    ok(/\bvar\s+_BACKEND_CANDLE_FAIL_MAX\b/.test(inlineMonolith), '0: _BACKEND_CANDLE_FAIL_MAX stays declared in the monolith');

    // (21) _recordBackendApiAuthResult stays EXCLUSIVELY in js/api/backend-client.js:
    // only CALLED from the gate module, never redefined there or in the monolith.
    const BACKEND_CLIENT_SRC = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'api', 'backend-client.js'), 'utf8');
    ok(/(?:async\s+)?function\s+_recordBackendApiAuthResult\s*\(/.test(BACKEND_CLIENT_SRC), '0: _recordBackendApiAuthResult defined in backend-client.js');
    ok(!/(?:async\s+)?function\s+_recordBackendApiAuthResult\s*\(/.test(GATE_SRC), '0: _recordBackendApiAuthResult NOT defined in candle-auth-gate.js');
    ok(!/(?:async\s+)?function\s+_recordBackendApiAuthResult\s*\(/.test(inlineMonolith), '0: _recordBackendApiAuthResult NOT defined in the residual monolith');

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(GATE_SRC.indexOf("'use strict'") === -1 && GATE_SRC.indexOf('"use strict"') === -1, '0: gate module has no "use strict" pragma');
    ok(!/\bimport\b/.test(GATE_SRC), '0: gate module has no import');
    ok(!/\bexport\b/.test(GATE_SRC), '0: gate module has no export');
    ok(GATE_SRC.indexOf('require(') === -1, '0: gate module has no require(');
    ok(!/window\.\w+\s*=/.test(GATE_SRC), '0: gate module has no window.* export');

    // (22) separation: candle-normalization.js keeps ONLY normalization (no gate fn
    // leaked in), and the gate module has NO normalization fn.
    ELEVEN.forEach((n) => { ok(MODULE_SRC.indexOf(n) === -1, '0: gate fn NOT present in candle-normalization.js: ' + n); });
    SEVEN.forEach((n) => { ok(GATE_SRC.indexOf(n) === -1, '0: normalization fn NOT present in candle-auth-gate.js: ' + n); });

    // (23) js/services/candle-service.js still does NOT exist (guarded in 0a above).

    // 0b. Manifest of candle symbols grouped by ownership. Presence here documents
    // where each behaviour lives in the RECONSTRUCTED source. The CANDLE_CORE_SHARED
    // group now lives in js/services/candle-normalization.js and the CANDLE_AUTH_GATE
    // group now lives in js/services/candle-auth-gate.js (both asserted above); every
    // other group is still inside the inline monolith (asserted below in 0c).
    const manifest = {
      // Shared normalization core — now extracted to js/services/candle-normalization.js
      // (pure; its only dependency closure is the group itself + JS builtins).
      CANDLE_CORE_SHARED: [
        '_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray',
        '_apexParityExtractBackendCandles', '_sfsExtractBackendCandles',
        '_mapBackendCandlesForChart', '_scannerMapBackendCandlesForChart',
      ],
      // Backend candle auth gate — now extracted to js/services/candle-auth-gate.js
      // (its state + backoff constants stay declared in the monolith).
      CANDLE_AUTH_GATE: [
        '_backendCandleAuthReady', '_backendCandleBackoffActive', '_backendCandleGateOpen',
        '_backendCandleGateReason', '_noteBackendCandleFailure', '_noteBackendCandleSuccess',
        '_isBackendGateClosedReason', '_backendGateProvenanceSource',
        'backendApiAuthKnownInvalid', '_resetBackendApiAuthState',
      ],
      CANDLE_PROVENANCE: [
        '_classifyBackendCandleProvenance', '_extractBackend4hDiag',
        '_recordCandleProvenance', '_recordBackendCandleProvenance',
      ],
      // SFS-specific orchestration (drags in S.squeezeFireScanner + DOM + cooldowns).
      SFS_ORCHESTRATION: [
        '_sfsFetchBackendCandles', '_sfsEnsureChartData', '_sfsEnsureTfCandles',
        '_sfsEnsureDetail4hCandles', '_sfsSpyReadOnly', '_sfsWarmupBatch',
        '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue', '_sfsNormSymbolList',
        '_sfsNormTimeframes', '_sfsCandlesUsable', '_sfsCandleSubLimitActive',
      ],
      // Per-feature adapters (endpoint family + source label differ per surface).
      FEATURE_ADAPTER: [
        '_scannerReadBackendCandlesTf', '_scannerEnsureBackendCandles',
        '_scannerFetchBackendCandlesForChart', '_loadBackendChartCandles',
        '_portfolioFetchBackendCandlesForChart', '_mcxFetchBackendCandlesForChart',
        '_fetchPretradeBackendCandles',
      ],
      // Already extracted / shared backend client (must NOT be re-owned by candles).
      SHARED_BACKEND_CLIENT: [
        'ttCall', '_backendAuthHeaders', '_recordBackendApiAuthResult',
      ],
      // Legacy public fetch (no auth gate) — a documented outlier.
      LEGACY_PUBLIC_READ: ['fetchBackendCandles', 'fetchCandles'],
    };
    let manifestCount = 0;
    Object.keys(manifest).forEach((cat) => {
      manifest[cat].forEach((name) => {
        manifestCount++;
        const present = HTML.indexOf('function ' + name + '(') >= 0 || HTML.indexOf('function ' + name + ' (') >= 0;
        ok(present, '0: [' + cat + '] real function present in reconstructed source: ' + name);
      });
    });
    // Module-level state that any extraction must carry or keep shared.
    ['_backendCandleAuth', '_backendApiAuthState', '_candleProvenanceStats', '_candleProvenanceLog',
      '_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsDetail4hInflight', '_sfsWarmupQueue',
      '_sfsSpyReadInflight'].forEach((s) => {
      ok(new RegExp('\\b' + s + '\\b').test(HTML), '0: shared candle state declared: ' + s);
    });
    console.log('  NOTE  manifest candidate symbols asserted: ' + manifestCount);

    // 0c. Every remaining non-extracted candle candidate stays in the residual inline
    // monolith and did NOT leak into the extracted normalization module. CANDLE_AUTH_GATE
    // is excluded here because it has now been extracted to candle-auth-gate.js (asserted
    // in 0a-EXTRACTION-GATE above); this loop guards that provenance, SFS orchestration,
    // per-feature adapters and the legacy public read stay in the monolith.
    ['CANDLE_PROVENANCE', 'SFS_ORCHESTRATION', 'FEATURE_ADAPTER', 'LEGACY_PUBLIC_READ'].forEach((cat) => {
      manifest[cat].forEach((name) => {
        const reDef = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
        ok(reDef.test(inlineMonolith), '0: [' + cat + '] stays defined in the residual inline monolith: ' + name);
        ok(MODULE_SRC.indexOf(name) === -1, '0: [' + cat + '] NOT present in candle-normalization.js: ' + name);
      });
    });
    // The pure utilities test must NOT own candle logic (candles stay in the monolith).
    const pureUtils = fs.readFileSync(path.join(__dirname, 'pure-utils-extraction.test.js'), 'utf8');
    ok(/candle-service/.test(pureUtils) === false, '0: pure-utils test does not reference candle-service');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('1. AUTH GATE CONTRACT — 12 scenarios (real gate functions)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 1) backend URL not available
    let sb = newCore({ globals: { BACKEND: '' } });
    sb.S.backendKey = 'KEY'; sb.S.ttConnected = true; sb.S.ttSessionId = 'sess';
    ok(sb._backendCandleAuthReady() === false, '1.1: no BACKEND → not ready');
    ok(sb._backendCandleGateReason() === 'backend_auth_not_ready', '1.1: reason backend_auth_not_ready');

    // 2) backend key missing
    sb = newCore(); sb.S.ttConnected = true; sb.S.ttSessionId = 'sess';
    ok(sb._backendCandleAuthReady() === false, '1.2: no backendKey → not ready');
    ok(sb._backendCandleGateReason() === 'backend_auth_not_ready', '1.2: reason backend_auth_not_ready');

    // 3) session not ready
    sb = newCore(); sb.S.backendKey = 'KEY';
    ok(sb._backendCandleAuthReady() === false, '1.3: no TT session → not ready');

    // 4) auth valid
    sb = newCore(); authReady(sb);
    ok(sb._backendCandleAuthReady() === true, '1.4: valid prerequisites → ready');
    ok(sb._backendCandleGateOpen() === true, '1.4: gate open');
    ok(sb._backendCandleGateReason() === 'open', '1.4: reason open');

    // 5) invalidApiKey already latched
    sb = newCore(); authReady(sb); sb._backendApiAuthState.invalidApiKey = true;
    ok(sb._backendCandleAuthReady() === false, '1.5: latched invalid key → not ready');
    ok(sb._backendCandleGateReason() === 'backend_api_key_invalid', '1.5: reason backend_api_key_invalid');

    // 6) candle backoff still active
    sb = newCore(); authReady(sb); sb._backendCandleAuth.backoffUntil = Date.now() + 30000;
    ok(sb._backendCandleBackoffActive() === true, '1.6: backoff active');
    ok(sb._backendCandleGateOpen() === false, '1.6: gate closed during backoff');
    ok(sb._backendCandleGateReason() === 'backend_backoff_active', '1.6: reason backend_backoff_active');

    // 7) backoff expired
    sb = newCore(); authReady(sb); sb._backendCandleAuth.backoffUntil = Date.now() - 1000;
    ok(sb._backendCandleBackoffActive() === false, '1.7: expired backoff is inactive');
    ok(sb._backendCandleGateOpen() === true, '1.7: gate re-opens after backoff expiry');

    // 8) last auth response 401 → latch + backoff
    sb = newCore(); authReady(sb);
    sb._recordBackendApiAuthResult('/quote-token', 401);
    ok(sb._backendApiAuthState.invalidApiKey === true, '1.8: 401 latches invalidApiKey');
    ok(sb._backendCandleBackoffActive() === true, '1.8: 401 also arms candle backoff');
    ok(sb._backendApiAuthState.last401At != null, '1.8: last401At recorded');

    // 9) last auth response 403
    sb = newCore(); authReady(sb);
    sb._recordBackendApiAuthResult('/scanner', 403);
    ok(sb._backendApiAuthState.invalidApiKey === true, '1.9: 403 latches invalidApiKey');
    ok(sb._backendCandleGateReason() === 'backend_api_key_invalid', '1.9: gate reason invalid on 403');

    // 10) a later 2xx frees the latch
    sb = newCore(); authReady(sb);
    sb._recordBackendApiAuthResult('/quote-token', 401);
    ok(sb._backendCandleAuthReady() === false, '1.10: not ready while latched');
    sb._recordBackendApiAuthResult('/scanner', 200);
    ok(sb._backendApiAuthState.invalidApiKey === false, '1.10: 2xx clears the latch');
    ok(sb._backendApiAuthState.lastOkAt != null, '1.10: lastOkAt recorded on success');
    ok(sb._backendCandleAuthReady() === true, '1.10: ready again after key restored');

    // 11) 404/429/500 do NOT arm the candle backoff / do NOT latch the key
    sb = newCore(); authReady(sb);
    [404, 429, 500].forEach((st) => sb._noteBackendCandleFailure('candle', st, 'x'));
    ok(sb._backendCandleBackoffActive() === false, '1.11: 404/429/500 do not arm backoff (only 401/403)');
    ok(sb._backendApiAuthState.invalidApiKey === false, '1.11: 404/429/500 do not latch the key invalid');
    ok(sb._backendCandleGateOpen() === true, '1.11: gate stays open after non-auth failures');
    ok(sb._backendCandleAuth.recentFailures.length === 3, '1.11: failures recorded in the ring buffer');

    // 12) unknown auth state (fresh) is permissive on the very first call
    sb = newCore(); authReady(sb);
    ok(sb._backendApiAuthState.invalidApiKey === false, '1.12: fresh state is not-yet-invalid');
    ok(sb._backendCandleAuthReady() === true, '1.12: first call allowed (conservative first-call validates the key)');

    // gate-closed reason classifier + provenance-source map
    sb = newCore();
    ok(sb._isBackendGateClosedReason('backend_auth_not_ready') === true, '1.x: auth_not_ready is gate-closed');
    ok(sb._isBackendGateClosedReason('backend_api_key_invalid') === true, '1.x: api_key_invalid is gate-closed');
    ok(sb._isBackendGateClosedReason('backend_backoff_active') === true, '1.x: backoff_active is gate-closed');
    ok(sb._isBackendGateClosedReason('1D_insufficient:0') === false, '1.x: a data failure is NOT gate-closed');
    ok(sb._backendGateProvenanceSource('backend_backoff_active') === 'backend_backoff', '1.x: backoff → backend_backoff provenance');
    ok(sb._backendGateProvenanceSource('backend_api_key_invalid') === 'backend_api_key_invalid', '1.x: invalid → invalid provenance');
    ok(sb._backendGateProvenanceSource('backend_auth_not_ready') === 'backend_auth_not_ready', '1.x: not_ready → not_ready provenance');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('2. BACKEND READ CONTRACT — dxlink GET via real _sfsFetchBackendCandles');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // gate closed → NO fetch, provenance recorded, structured skip.
    let sb = newCore();
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    const skipped = await sb._sfsFetchBackendCandles('NVDA', '1D');
    ok(sb.fetch.calls.length === 0, '2: gate closed → zero fetches (no 401 storm)');
    ok(skipped.ok === false && skipped.reason === 'backend_auth_not_ready', '2: gate-closed read returns the gate reason');
    ok(sb._candleProvenanceLog.some((r) => r.source === 'backend_auth_not_ready'), '2: gate-closed read records provenance');

    // normal symbol, gate open → exact URL / method / headers / timeout.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    const okRead = await sb._sfsFetchBackendCandles('AAPL', '4H');
    ok(sb.fetch.calls.length === 1, '2: gate open → exactly one GET');
    const call = sb.fetch.calls[0];
    ok(call.url === 'https://backend.test/dev/market/candles-dxlink/AAPL?timeframe=4H', '2: dxlink read URL (symbol + timeframe query)');
    ok(call.method === 'GET', '2: read is a GET');
    ok(call.headers['x-api-key'] === 'KEY', '2: read carries x-api-key auth header');
    ok(okRead.ok === true && okRead.count === 25, '2: valid response → ok with mapped count');
    ok(okRead.candles[0].time != null && okRead.candles[0].close != null, '2: mapped candle shape {time,open,high,low,close,volume}');

    // symbol needing URL-encoding.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: backendBars(25) }));
    await sb._sfsFetchBackendCandles('BRK.B', '1D');
    ok(sb.fetch.calls[0].url.indexOf('candles-dxlink/BRK.B?timeframe=1D') !== -1, '2: symbol with a dot is encoded into the path');

    // empty array on 200 → ok:true but reason "empty".
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: [] }));
    const empty = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(empty.ok === true && empty.count === 0 && empty.reason === 'empty', '2: empty 200 → ok:true count:0 reason:empty');

    // backend-reported error on a 200 body → surfaced as reason.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, { candles: [], error: 'subscription limit' }));
    const bodyErr = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(bodyErr.ok === true && bodyErr.reason === 'subscription limit', '2: backend error on a 200 body is surfaced as reason');

    // non-JSON body → reason json_parse.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => resp(200, 'not json', { badJson: true }));
    const badJson = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(badJson.ok === false && badJson.reason === 'json_parse', '2: unparseable body → reason json_parse');

    // HTTP errors → reason http_<status> + failure recorded; 401/403 arm backoff.
    for (const st of [401, 403, 404, 429, 500]) {
      sb = newCore(); authReady(sb);
      sb.fetch = recordingFetch(() => resp(st, {}));
      const r = await sb._sfsFetchBackendCandles('AAPL', '1D');
      ok(r.ok === false && r.status === st && r.reason === 'http_' + st, '2: HTTP ' + st + ' → reason http_' + st);
      const armed = sb._backendCandleBackoffActive();
      ok((st === 401 || st === 403) ? armed === true : armed === false, '2: HTTP ' + st + ' backoff armed=' + (st === 401 || st === 403));
    }

    // network throw / abort → reason fetch:<message>.
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => { throw new Error('Failed to fetch'); });
    const netErr = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(netErr.ok === false && /^fetch:/.test(netErr.reason), '2: network throw → reason fetch:<message>');
    sb = newCore(); authReady(sb);
    sb.fetch = recordingFetch(() => ({ __throw: Object.assign(new Error('aborted'), { name: 'AbortError' }) }));
    const abortErr = await sb._sfsFetchBackendCandles('AAPL', '1D');
    ok(abortErr.ok === false && /^fetch:/.test(abortErr.reason), '2: abort → reason fetch:<message>');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('3. NORMALIZATION CONTRACT — real parity extractor / normalizer / mappers');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const sb = newCore();
    // accepted payload shapes (list derived from _apexParityExtractBackendCandles).
    const arr = [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }];
    ok(sb._apexParityExtractBackendCandles(arr).length === 1, '3: direct array accepted');
    ok(sb._apexParityExtractBackendCandles({ candles: arr }).length === 1, '3: {candles} accepted');
    ok(sb._apexParityExtractBackendCandles({ bars: arr }).length === 1, '3: {bars} accepted');
    ok(sb._apexParityExtractBackendCandles({ data: arr }).length === 1, '3: {data} accepted');
    ok(sb._apexParityExtractBackendCandles({ result: { candles: arr } }).length === 1, '3: {result.candles} accepted');
    ok(sb._apexParityExtractBackendCandles({ nope: arr }).length === 0, '3: unrecognized shape → [] (no new formats invented)');
    // timeframe-keyed roots via the SFS extractor.
    ok(sb._sfsExtractBackendCandles({ timeframes: { '4H': arr } }, '4H').length === 1, '3: {timeframes:{4H:[...]}} accepted by SFS extractor');
    ok(sb._sfsExtractBackendCandles({ derived: { '30M': arr } }, '30M').length === 1, '3: {derived:{30M:[...]}} accepted by SFS extractor');

    // field names + fallbacks.
    let n = sb._apexParityNormCandle({ time: '2024-01-02', open: 10, high: 12, low: 9, close: 11 });
    ok(n && n.t === Date.parse('2024-01-02') && n.c === 11, '3: backend {time,open,high,low,close} → {t,o,h,l,c}');
    n = sb._apexParityNormCandle({ t: 1700000000, c: 5 });
    ok(n && n.o === 5 && n.h === 5 && n.l === 5, '3: missing OHLC fall back to close');
    ok(sb._apexParityNormCandle({ t: 1000 }) === null, '3: missing close → null (dropped)');
    ok(sb._apexParityNormCandle({ c: 5 }) === null, '3: missing time → null (dropped)');
    // seconds vs ms.
    ok(sb._apexParityNormTime(1700000000) === 1700000000000, '3: second timestamps scaled to ms');
    ok(sb._apexParityNormTime(1700000000000) === 1700000000000, '3: ms timestamps preserved');
    ok(sb._apexParityNormTime('2024-01-02') === Date.parse('2024-01-02'), '3: ISO string parsed to ms');
    ok(sb._apexParityNormTime('garbage') === null, '3: unparseable time → null');

    // array normalization: filter invalid, sort ascending, keep duplicates (NO dedup).
    const mixed = [
      { t: 3000, c: 3 }, { t: 1000, c: 1 }, { bad: true }, { t: 2000 }, { t: 2000, c: 2 }, { t: 2000, c: 2 },
    ];
    const normed = sb._apexParityNormCandleArray(mixed);
    ok(normed.length === 4, '3: invalid rows dropped ({bad} and the no-close row)');
    ok(normed[0].t <= normed[1].t && normed[1].t <= normed[2].t, '3: output sorted ascending by time');
    // t=2000s normalizes to 2000*1000ms; both duplicate rows survive (no dedup step).
    ok(normed.filter((c) => c.t === sb._apexParityNormTime(2000)).length === 2, '3: duplicate timestamps are PRESERVED (current behaviour — no dedup)');
    ok(sb._apexParityNormCandleArray(null).length === 0, '3: non-array input → []');

    // mappers: <20 bars → null; source labels differ per family.
    ok(sb._mapBackendCandlesForChart(sb._apexParityNormCandleArray(backendBars(19))) === null, '3: dxlink mapper returns null under 20 bars');
    const mapped = sb._mapBackendCandlesForChart(sb._apexParityNormCandleArray(backendBars(25)));
    ok(mapped && mapped.length === 25 && mapped[0].source === 'BACKEND_DXLINK_CANDLES', '3: dxlink mapper source label = BACKEND_DXLINK_CANDLES');
    const smapped = sb._scannerMapBackendCandlesForChart(sb._apexParityNormCandleArray(backendBars(25)));
    ok(smapped && smapped[0].source === 'BACKEND_CANDLE_STORE', '3: scanner mapper source label = BACKEND_CANDLE_STORE');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('4. WARMUP / ENSURE CONTRACT — SFS batch cap + scanner ensure payloads');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 4a. Real _sfsWarmupBatch: endpoint, payload, cap 3, dedupe/upper, return shape.
    function newWarmup() {
      const subReqs = [];
      const sb = {
        console: makeConsole().console, Date, JSON, Math, Object, Array, Promise, String, Boolean, isFinite,
        BACKEND: 'https://backend.test',
        AbortSignal: { timeout: () => ({}) },
        _backendAuthHeaders: (extra) => Object.assign({ 'x-api-key': 'KEY' }, extra || {}),
        _recordCandleSubscriptionRequest: (m) => { subReqs.push(m); return m; },
        SFS_WARMUP_BATCH_CAP: 3, SFS_WARMUP_DEBOUNCE_MS: 10000,
        _sfsWarmupLastSentAt: 0, _sfsWarmupQueue: [], _sfsWarmupQueuedKeys: {}, _sfsWarmupDrainTimer: null,
        setTimeout: () => 1, // neutralised: queue drain never fires a real timer
        __subReqs: subReqs,
      };
      vm.createContext(sb);
      loadReal(sb, ['_sfsNormSymbolList', '_sfsNormTimeframes', '_sfsWarmupDiag', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue', '_sfsWarmupBatch']);
      return sb;
    }
    let sb = newWarmup();
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    const w = await sb._sfsWarmupBatch(['aapl', 'AAPL', 'msft'], ['1d', '1D'], { reason: 'unit_test', priority: true });
    ok(sb.fetch.calls.length === 1, '4: warmup fires exactly one POST');
    const wc = sb.fetch.calls[0];
    ok(wc.url === 'https://backend.test/dev/market/candles-dxlink/warmup', '4: warmup endpoint POST /dev/market/candles-dxlink/warmup');
    ok(wc.method === 'POST', '4: warmup is a POST');
    ok(JSON.stringify(wc.body.symbols) === JSON.stringify(['AAPL', 'MSFT']), '4: symbols normalized (upper + dedupe)');
    ok(JSON.stringify(wc.body.timeframes) === JSON.stringify(['1D']), '4: timeframes normalized (upper + dedupe)');
    ok(wc.body.waitMs === 15000, '4: warmup body carries waitMs=15000');
    ok(w.ok === true && JSON.stringify(w.sentSymbols) === JSON.stringify(['AAPL', 'MSFT']), '4: return shape {ok,status,sentSymbols,deferredSymbols}');

    // cap 3: 5 symbols → send 3, defer 2 into the queue (deferred count pinned).
    sb = newWarmup();
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    const wc5 = await sb._sfsWarmupBatch(['A', 'B', 'C', 'D', 'E'], ['1D'], { priority: true });
    ok(sb.fetch.calls[0].body.symbols.length === 3, '4: batch capped at SFS_WARMUP_BATCH_CAP=3 symbols per POST');
    ok(JSON.stringify(wc5.deferredSymbols) === JSON.stringify(['D', 'E']), '4: overflow symbols reported as deferred');
    ok(sb._sfsWarmupQueue.length >= 1, '4: deferred symbols queued (drained gradually, not sent immediately)');

    // empty request → skipped, no fetch.
    sb = newWarmup();
    sb.fetch = recordingFetch(() => resp(200, {}));
    const wEmpty = await sb._sfsWarmupBatch([], ['1D'], {});
    ok(sb.fetch.calls.length === 0 && wEmpty.ok === false && wEmpty.reason === 'no_symbols_or_timeframes', '4: empty symbols → skipped, no POST');

    // warmup HTTP error → ok:false with reason preserved.
    sb = newWarmup();
    sb.fetch = recordingFetch(() => resp(500, {}));
    const wErr = await sb._sfsWarmupBatch(['AAPL'], ['1D'], { priority: true });
    ok(wErr.ok === false && wErr.status === 500, '4: warmup HTTP 500 → ok:false status:500');

    // 4b. Real scanner ensure: endpoint + payload {symbol,timeframes,reason}, gate-checked.
    function newScannerEnsure() {
      const sb = newCore(); authReady(sb);
      loadReal(sb, ['_scannerEnsureBackendCandles']);
      return sb;
    }
    sb = newScannerEnsure();
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    const ens = await sb._scannerEnsureBackendCandles('AAPL', ['1D', '30M', '4H'], 'scanner_chart_lookup');
    ok(sb.fetch.calls[0].url === 'https://backend.test/market/candles/ensure', '4: scanner ensure endpoint POST /market/candles/ensure');
    ok(sb.fetch.calls[0].method === 'POST', '4: scanner ensure is a POST');
    ok(JSON.stringify(sb.fetch.calls[0].body) === JSON.stringify({ symbol: 'AAPL', timeframes: ['1D', '30M', '4H'], reason: 'scanner_chart_lookup' }), '4: scanner ensure payload {symbol,timeframes,reason}');
    ok(ens.ok === true, '4: scanner ensure ok on 200');
    // ensure is gate-checked: closed gate → no fetch.
    sb = newCore(); loadReal(sb, ['_scannerEnsureBackendCandles']);
    sb.fetch = recordingFetch(() => resp(200, { ok: true }));
    const ensClosed = await sb._scannerEnsureBackendCandles('AAPL', ['1D'], 'x');
    ok(sb.fetch.calls.length === 0 && ensClosed.ok === false && ensClosed.fallbackReason === 'backend_auth_not_ready', '4: scanner ensure short-circuits when gate closed');
    // ensure HTTP error → ensure_http_<status>.
    sb = newScannerEnsure();
    sb.fetch = recordingFetch(() => resp(503, {}));
    const ensErr = await sb._scannerEnsureBackendCandles('AAPL', ['1D'], 'x');
    ok(ensErr.ok === false && ensErr.fallbackReason === 'ensure_http_503', '4: scanner ensure HTTP 503 → ensure_http_503');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('5. THROTTLING / IN-FLIGHT CONTRACT — dedupe key + shared promise');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Real _sfsEnsureTfCandles with controllable leaf fetch/warmup stubs.
    function newTf() {
      const readCalls = [];
      const warmCalls = [];
      let deferred = null;
      const sb = {
        console: makeConsole().console, JSON, Object, Array, Promise, String, Number, Math, isFinite, Date,
        debugLog() {}, debugWarn() {},
        S: { squeezeFireScanner: { chartSymbol: 'CAT', chartCacheCandles: {} } },
        _sfsTfFetchInflight: {}, _sfsWarmupCooldown: {}, _sfsLastFailReason: {}, SFS_WARMUP_COOLDOWN_MS: 30000,
        __subLimit: false,
        _sfsCandleSubLimitActive: () => sb.__subLimit,
        _recordCandleProvenance: () => {},
        _sfsFetchBackendCandles: (sym, tf) => {
          readCalls.push(sym + '|' + tf);
          if (sb.__deferNextRead) { deferred = {}; deferred.promise = new Promise((res) => { deferred.resolve = res; }); return deferred.promise; }
          return Promise.resolve(sb.__readQueue.length ? sb.__readQueue.shift() : { ok: true, status: 200, count: 0, candles: [], reason: 'empty' });
        },
        _sfsWarmupBatch: (syms, tfs, opts) => { warmCalls.push({ syms, tfs, opts }); return Promise.resolve({ ok: true, status: 200, sentSymbols: syms }); },
        __readQueue: [], __deferNextRead: false,
        __readCalls: readCalls, __warmCalls: warmCalls, __getDeferred: () => deferred,
      };
      vm.createContext(sb);
      loadReal(sb, ['_sfsCandlesUsable', '_sfsEnsureTfCandles']);
      return sb;
    }

    // two concurrent calls for the same sym|tf share ONE in-flight promise + ONE read.
    let sb = newTf();
    sb.__deferNextRead = true;
    const p1 = sb._sfsEnsureTfCandles('CAT', '1D');
    const p2 = sb._sfsEnsureTfCandles('CAT', '1D');
    ok(sb.__readCalls.length === 1, '5: concurrent same sym|tf → only ONE backend read (deduped)');
    ok(sb._sfsTfFetchInflight['CAT|1D'] != null, '5: in-flight promise registered under key sym|tf');
    // resolve the deferred read with usable candles.
    sb.__getDeferred().resolve({ ok: true, status: 200, count: 25, candles: series(25) });
    const [r1, r2] = await Promise.all([p1, p2]);
    ok(r1 === r2, '5: both callers receive the same shared result');
    ok(sb._sfsTfFetchInflight['CAT|1D'] === undefined, '5: in-flight entry cleaned up on success');

    // different sym or tf → separate reads (not deduped together).
    sb = newTf();
    sb.__readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });
    sb.__readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });
    await Promise.all([sb._sfsEnsureTfCandles('CAT', '1D'), sb._sfsEnsureTfCandles('DOG', '1D')]);
    ok(sb.__readCalls.length === 2, '5: different symbols are NOT deduped together');

    // failure path also cleans up the in-flight map (documenting current cleanup).
    sb = newTf();
    sb.__subLimit = true;
    sb.__readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'subscription limit' });
    const rFail = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(rFail === null, '5: subscription-limit read (empty) resolves to null');
    ok(sb._sfsTfFetchInflight['CAT|1D'] === undefined, '5: in-flight entry cleaned up after a failed attempt');
    ok(sb._sfsWarmupCooldown['CAT|1D'] > Date.now(), '5: a warmup cooldown is armed (throttles repeat warmups)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('6. 4H DETAIL vs GENERIC TIMEFRAME RE-READ — explicitly compared, NOT unified');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Shared sandbox running BOTH the real generic (_sfsEnsureTfCandles) and the
    // real bounded 4H detail loader (_sfsEnsureDetail4hCandles) against the same
    // recording leaf stubs, so their re-read semantics can be compared side by side.
    function fakeEl() { return { innerHTML: '', textContent: '', style: {}, querySelector: () => null }; }
    function newBoth() {
      const els = {};
      const readCalls = [];
      const warmCalls = [];
      const sleeps = [];
      const sb = {
        console: makeConsole().console, JSON, Object, Array, Promise, String, Number, Math, isFinite, Date,
        debugLog() {}, debugWarn() {},
        window: {}, document: { getElementById: (id) => (els[id] || (els[id] = fakeEl())) },
        S: { squeezeFireScanner: { chartSymbol: 'CAT', chartCacheCandles: {} } },
        _sfsTfFetchInflight: {}, _sfsWarmupCooldown: {}, _sfsLastFailReason: {}, SFS_WARMUP_COOLDOWN_MS: 30000,
        _sfsDetail4hInflight: {}, _sfsDetail4hPhase: {}, _sfsDetail4hResult: {},
        SFS_DETAIL_4H_POST_WARM_ATTEMPTS: 3, SFS_DETAIL_4H_POST_WARM_DELAY_MS: 1200,
        __subLimit: false, __sync: null,
        _sfsCandleSubLimitActive: () => sb.__subLimit,
        _sfsCandlesFromSyncSource: () => sb.__sync,
        _recordCandleProvenance: () => {},
        _sfsSleep: (ms) => { sleeps.push(ms); return Promise.resolve(); }, // recorded, never real
        _sfsFetchBackendCandles: (sym, tf) => { readCalls.push(sym + '|' + tf); return Promise.resolve(sb.__readQueue.length ? sb.__readQueue.shift() : { ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); },
        _sfsWarmupBatch: (syms, tfs, opts) => { warmCalls.push({ syms, tfs, opts }); return Promise.resolve({ ok: true, status: 200, sentSymbols: syms }); },
        __readQueue: [], __readCalls: readCalls, __warmCalls: warmCalls, __sleeps: sleeps,
      };
      vm.createContext(sb);
      // Generic loader + usable predicate, then the whole real 4H-detail block.
      const detailBlock = HTML.slice(HTML.indexOf('var _sfsDetail4hInflight'), HTML.indexOf('// Synchronous candle source for RS:'));
      vm.runInContext(extractFn(HTML, '_sfsCandlesUsable') + '\n' + extractFn(HTML, '_sfsEnsureTfCandles') + '\n' + detailBlock, sb);
      return sb;
    }

    // GENERIC timeframe: empty read → ONE warmup → a SINGLE immediate re-read (no sleep).
    let sb = newBoth();
    sb.__readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); // pre-warm read
    sb.__readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });          // single re-read
    const gen = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(Array.isArray(gen) && gen.length === 25, '6: generic tf resolves candles after warm+reread');
    ok(sb.__readCalls.length === 2, '6: GENERIC does exactly 2 reads (1 pre-warm + 1 immediate re-read)');
    ok(sb.__warmCalls.length === 1, '6: GENERIC warms exactly once');
    ok(sb.__sleeps.length === 0, '6: GENERIC uses NO backoff sleep between reads (single immediate re-read)');

    // 4H DETAIL: empty read → ONE warmup → BOUNDED polled re-reads with backoff sleeps.
    sb = newBoth();
    for (let i = 0; i < 6; i++) sb.__readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' });
    const det = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(det.ok === false && det.warmupAttempted === true, '6: 4H detail attempted a warmup');
    ok(sb.__warmCalls.length === 1, '6: 4H detail warms exactly once (single controlled 30M warmup)');
    ok(sb.__warmCalls[0].tfs.join(',') === '30M', '6: 4H detail warms 30M (backend derives 4H from 30M)');
    ok(sb.__readCalls.length === 1 + 3, '6: 4H detail does 1 pre-warm read + up to 3 BOUNDED re-reads');
    ok(sb.__sleeps.length === 3, '6: 4H detail sleeps between each bounded re-read (backoff present)');
    ok(JSON.stringify(sb.__sleeps) === JSON.stringify([1200, 2400, 3600]), '6: 4H detail backoff sequence = delay*attempt (1200,2400,3600)');

    // 4H detail: candles appearing on the 2nd bounded poll → success bounded (not just first read).
    sb = newBoth();
    sb.__readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); // pre-warm
    sb.__readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); // poll 1
    sb.__readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });          // poll 2 → data
    const det2 = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(det2.ok === true && det2.count === 25, '6: 4H detail succeeds when data appears on a later bounded poll');
    ok(sb.__readCalls.length === 3, '6: 4H detail stops polling as soon as usable data arrives');

    // EXPLICIT non-uniformity assertion: the two flows differ and are BOTH preserved.
    ok(true, '6: DOCUMENTED — 4H detail = bounded re-read w/ backoff; generic tf = single immediate re-read (NOT unified)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('7. PROVENANCE + DIAGNOSTICS — classifier, gate map, [CANDLE-PROVENANCE] log');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const sb = newCore();
    // classifier: full / 4h_missing / partial.
    ok(sb._classifyBackendCandleProvenance(25, 25, null).source === 'backend_cache_full', '7: 1D>=min & 4H>=min → backend_cache_full');
    const miss = sb._classifyBackendCandleProvenance(25, 0, { missingReason: 'NO_30M_SOURCE_CANDLES', derivationReason: 'lag' });
    ok(miss.source === 'backend_4h_missing' && /NO_30M/.test(miss.detail), '7: 1D ok & 4H=0 w/ backend diag → backend_4h_missing (detail carries reason)');
    ok(sb._classifyBackendCandleProvenance(25, 5, null).source === 'backend_cache_partial', '7: 1D ok & 4H short → backend_cache_partial');

    // 4H derivation diag extraction (top-level and nested timeframes shape).
    ok(sb._extractBackend4hDiag({ source30mCount: 40, derivationReason: 'ok' }).source30mCount === 40, '7: top-level 4H diag extracted');
    ok(sb._extractBackend4hDiag({ timeframes: { '4H': { missingReason: 'x' } } }).missingReason === 'x', '7: nested timeframes[4H] diag extracted');
    ok(sb._extractBackend4hDiag({ candles: [] }) === null, '7: no diag fields → null');

    // recorder: mutates stats, appends to the ring-buffer log, emits the [CANDLE-PROVENANCE] line.
    sb.__logs.length = 0;
    const rec = sb._recordCandleProvenance('backend_cache_full', { symbol: 'AAPL', view: 'mcx_chart', candles1d: 25, candles4h: 22, detail: 'x' });
    ok(rec && rec.source === 'backend_cache_full' && rec.symbol === 'AAPL', '7: recorder returns a structured record');
    ok(sb._candleProvenanceStats.backendCacheFull === 1 && sb._candleProvenanceStats.backendCache === 1, '7: recorder increments provenance stats');
    ok(sb._candleProvenanceLog[sb._candleProvenanceLog.length - 1] === rec, '7: record appended to the provenance ring buffer');
    ok(sb.__logs.some((l) => l.indexOf('[CANDLE-PROVENANCE]') === 0), '7: emits a [CANDLE-PROVENANCE] log line');
    ok(sb.__logs.some((l) => /source=backend_cache_full/.test(l) && /symbol=AAPL/.test(l)), '7: log carries source + symbol (stable fields, not timestamps)');

    // convenience recorder classifies + records in one call.
    const src = sb._recordBackendCandleProvenance('portfolio_chart', 'MSFT', 25, 25, null);
    ok(src === 'backend_cache_full', '7: _recordBackendCandleProvenance returns the classified source');

    // browser-fallback + gate sources feed dedicated counters.
    sb._recordCandleProvenance('browser_dxlink_fallback', { symbol: 'AAPL' });
    ok(sb._candleProvenanceStats.browserDxlinkFallback === 1, '7: browser_dxlink_fallback counted separately');
    sb._recordCandleProvenance('backend_auth_not_ready', { symbol: 'AAPL', view: 'sfs_chart' });
    ok(sb._candleProvenanceLog[sb._candleProvenanceLog.length - 1].source === 'backend_auth_not_ready', '7: gate-closed provenance recorded (source preserved)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('8. CONSUMER BOUNDARY — which wrapper hits which endpoint family (asymmetries pinned)');
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // 8a. DYNAMIC: scanner READ hits the /market/candles?symbol= family (gate-checked).
    let sb = newCore(); authReady(sb);
    sb._scannerGetCachedBackendTfCandles = () => null;
    sb._scannerPutCachedBackendTfCandles = () => {};
    loadReal(sb, ['_scannerReadBackendCandlesTf']);
    sb.fetch = recordingFetch(() => resp(200, { ok: true, candles: backendBars(25) }));
    const sr = await sb._scannerReadBackendCandlesTf('AAPL', '1D');
    ok(sb.fetch.calls[0].url === 'https://backend.test/market/candles?symbol=AAPL&timeframe=1D&limit=300', '8: scanner read → GET /market/candles?symbol=&timeframe=&limit=300');
    ok(sr.ok === true, '8: scanner read maps candles on success');

    // 8b. STATIC: each adapter's endpoint family + source label + gate posture.
    const bodies = {};
    ['_mcxFetchBackendCandlesForChart', '_fetchPretradeBackendCandles', '_portfolioFetchBackendCandlesForChart',
      '_scannerFetchBackendCandlesForChart', '_loadBackendChartCandles', 'fetchBackendCandles',
      '_sfsFetchBackendCandles', '_scannerEnsureBackendCandles', '_mcxFetchBackendCandlesForChart'].forEach((n) => {
      bodies[n] = stripComments(extractFn(HTML, n));
    });

    // dxlink family: SFS, MCX, pretrade.
    ok(/\/dev\/market\/candles-dxlink\//.test(bodies._sfsFetchBackendCandles), '8: SFS reads the candles-dxlink family');
    ok(/\/dev\/market\/candles-dxlink\//.test(bodies._mcxFetchBackendCandlesForChart) && !/\/market\/candles\?/.test(bodies._mcxFetchBackendCandlesForChart), '8: MCX uses candles-dxlink family (NOT market/candles)');
    ok(/candles-dxlink\/warmup/.test(bodies._fetchPretradeBackendCandles), '8: pretrade warms via candles-dxlink/warmup');
    ok(/source: 'BACKEND_DXLINK_CANDLES'/.test(bodies._mcxFetchBackendCandlesForChart), '8: MCX source label = BACKEND_DXLINK_CANDLES');

    // market/candles family: scanner + portfolio.
    ok(/\/market\/candles\?symbol=/.test(bodies._portfolioFetchBackendCandlesForChart) && /\/market\/candles\/ensure/.test(bodies._portfolioFetchBackendCandlesForChart), '8: portfolio uses market/candles read + ensure family');
    ok(/BACKEND_CANDLE_STORE/.test(bodies._portfolioFetchBackendCandlesForChart), '8: portfolio source label = BACKEND_CANDLE_STORE');
    ok(/\/market\/candles\/ensure/.test(bodies._scannerEnsureBackendCandles), '8: scanner ensure uses /market/candles/ensure');

    // shared loader alias: _loadBackendChartCandles delegates to the scanner fetcher.
    ok(/_scannerFetchBackendCandlesForChart\(/.test(bodies._loadBackendChartCandles), '8: _loadBackendChartCandles delegates to _scannerFetchBackendCandlesForChart (shared read-first loader)');

    // legacy public read: /market/candles/:ticker?days=300 and — documented — NO auth gate.
    ok(/\/market\/candles\/'\+ticker\+'\?days=300/.test(bodies.fetchBackendCandles) || /\/market\/candles\/.*days=300/.test(bodies.fetchBackendCandles), '8: legacy fetchBackendCandles hits /market/candles/:ticker?days=300');
    ok(/_backendCandleGateOpen/.test(bodies.fetchBackendCandles) === false, '8: DOCUMENTED asymmetry — legacy fetchBackendCandles does NOT consult the auth gate');

    // gated adapters DO consult the gate.
    ['_sfsFetchBackendCandles', '_mcxFetchBackendCandlesForChart', '_fetchPretradeBackendCandles',
      '_portfolioFetchBackendCandlesForChart', '_scannerFetchBackendCandlesForChart'].forEach((n) => {
      ok(/_backendCandleGateOpen/.test(bodies[n] || stripComments(extractFn(HTML, n))), '8: gated adapter consults _backendCandleGateOpen: ' + n);
    });

    // main-chart candle store uses ttCall (a DIFFERENT transport) for ensure/readiness.
    const storeEnsure = stripComments(HTML.slice(HTML.indexOf('async function ' + '_backendCandleStoreChartEnsure') >= 0
      ? HTML.indexOf('_backendCandleStoreChartEnsure') : 0, 0) || '');
    // Locate whichever store function issues ttCall('/market/candles/ensure').
    const anyTtEnsure = /ttCall\('\/market\/candles\/ensure'/.test(HTML) || /ttCall\("\/market\/candles\/ensure"/.test(HTML);
    ok(anyTtEnsure === true, '8: DOCUMENTED asymmetry — the main-chart candle store ensures via ttCall (not fetch)');
    void storeEnsure;
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + (fail === 0 ? 'All ' + pass + ' tests passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
