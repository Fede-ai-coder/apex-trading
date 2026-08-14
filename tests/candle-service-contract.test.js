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

// The four detail-4H CORE declarations, extracted VERBATIM to their own classic module
// js/services/sfs-candle-detail-4h.js (asserted in 0a-EXTRACTION-DETAIL-4H below), listed
// in their original relative source order. The detail UI, the phase/result/in-flight state
// and the two SFS_DETAIL_4H_POST_WARM_* constants stay declared in the inline monolith.
const SFS_DETAIL_4H_CORE = ['_sfsDetail4hBaseResult', '_sfsMapDetail4hReason',
  '_sfsStoreDetail4h', '_sfsEnsureDetail4hCandles'];
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
  section('0. STRUCTURAL — candle normalization + auth gate + provenance + store client extracted; rest of candle service still in monolith');
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
    // The already-extracted modules (now eleven, incl. candle-normalization, the candle
    // auth gate, candle provenance, the candle-store client, the candle-dxlink client and
    // the SFS candle predicates) are still loaded.
    ['./js/utils/indicators.js', './js/utils/option-symbols.js', './js/utils/normalizers.js',
      './js/api/backend-client.js', './js/config/backend-config.js',
      './js/services/candle-normalization.js', './js/services/candle-auth-gate.js',
      './js/services/candle-provenance.js', './js/services/candle-store-client.js',
      './js/services/candle-dxlink-client.js', './js/services/sfs-candle-predicates.js'].forEach((s) => {
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
    // The extracted SFS config/state module. The SFS in-flight / cooldown / queue STATE and
    // the SFS_* constants used to be declared in the monolith; they were relocated verbatim
    // to js/services/sfs-config-state.js. The ownership assertions below therefore point at
    // this module AND additionally require the monolith to no longer declare them — a
    // strictly stronger check than the single-sided "stays in the monolith" it replaces.
    const CONFIG_STATE_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-config-state.js');
    const CONFIG_STATE_SRC = fs.readFileSync(CONFIG_STATE_PATH, 'utf8');
    // The extracted SFS scan-service module. The shared non-DOM helpers (_sfsSleep,
    // _sfsCandlesFromSyncSource) and the console diagnostics (apexDebugSfsDetailChart)
    // used to be declared in the monolith; they were relocated verbatim to
    // js/services/sfs-scan-service.js. As with the config/state module above, the
    // ownership assertions point at this module AND additionally require the monolith
    // to no longer declare them — strictly stronger than the single-sided
    // "stays in the monolith" they replace.
    const SCAN_SERVICE_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-scan-service.js');
    const SCAN_SERVICE_SRC = fs.existsSync(SCAN_SERVICE_PATH) ? fs.readFileSync(SCAN_SERVICE_PATH, 'utf8') : '';
    // The extracted detail-4H core module (asserted in 0a-EXTRACTION-DETAIL-4H below); read here
    // so the earlier ownership assertions can point at it instead of the monolith.
    const DETAIL_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-detail-4h.js');
    const DETAIL_SRC = fs.existsSync(DETAIL_PATH) ? fs.readFileSync(DETAIL_PATH, 'utf8') : '';
    // The SFS UI panel module (SFS PR 3). The detail-4H UI pair used to be declared in the
    // monolith; it was relocated verbatim here. Same two-sided treatment as the scan
    // service above: declared in this module AND no longer declared in the monolith.
    const UI_PANEL_PATH = path.resolve(__dirname, '..', 'js', 'ui', 'sfs-panel.js');
    const UI_PANEL_SRC = fs.existsSync(UI_PANEL_PATH) ? fs.readFileSync(UI_PANEL_PATH, 'utf8') : '';

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

    // 0a-EXTRACTION-PROVENANCE. The candle PROVENANCE classifier / 4H-diag extractor /
    // recorder / convenience recorder are now a separate classic module
    // js/services/candle-provenance.js, loaded AFTER candle-auth-gate.js and BEFORE the
    // inline monolith. It must contain ONLY the four approved provenance functions +
    // comments — NO state, NO constants, NO transport, NO timers, NO DOM, NO auth-gate
    // function, NO normalization function, NO SFS orchestration, NO top-level code. The
    // provenance state (_candleProvenanceStats / _candleProvenanceLog) and its constants
    // (_CANDLE_PROVENANCE_MAX / _CANDLE_USABLE_MIN) STAY declared in the monolith, and
    // _backendGateProvenanceSource stays EXCLUSIVELY in js/services/candle-auth-gate.js
    // (only CALLED from the monolith, never redefined in the provenance module).
    const PROV_PATH = path.resolve(__dirname, '..', 'js', 'services', 'candle-provenance.js');
    const PROV_TAG = './js/services/candle-provenance.js';
    const FOUR_PROV = ['_classifyBackendCandleProvenance', '_extractBackend4hDiag',
      '_recordCandleProvenance', '_recordBackendCandleProvenance'];

    // (1) module file exists.
    ok(fs.existsSync(PROV_PATH), '0: js/services/candle-provenance.js exists');
    const PROV_SRC = fs.existsSync(PROV_PATH) ? fs.readFileSync(PROV_PATH, 'utf8') : '';

    // (2) exactly one <script src> tag for it in index.html.
    const provTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/candle-provenance\.js["'][^>]*>/gi) || [];
    ok(provTags.length === 1, '0: exactly one candle-provenance.js <script> tag in index.html');
    const theProvTag = provTags[0] || '';

    // (3)(4) the tag is a classic script: no type=module, no async, no defer.
    ok(!/type\s*=\s*["']?module/i.test(theProvTag), '0: candle-provenance tag is classic (no type=module)');
    ok(!/\basync\b/i.test(theProvTag), '0: candle-provenance tag has no async attribute');
    ok(!/\bdefer\b/i.test(theProvTag), '0: candle-provenance tag has no defer attribute');

    // (5) load order: AFTER candle-auth-gate.js, BEFORE the inline monolith.
    const provEntry = ordered.filter((s) => s.kind === 'local' && s.src === PROV_TAG)[0];
    ok(!!provEntry, '0: candle-provenance.js is a local classic script in the load order');
    ok(!!gateEntry && !!provEntry && gateEntry.order < provEntry.order, '0: candle-provenance.js loads AFTER candle-auth-gate.js');
    ok(!!provEntry && !!firstInline && provEntry.order < firstInline.order, '0: candle-provenance.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(PROV_TAG) !== -1, '0: loader parses candle-provenance.js as a local script');

    // (7)(8)(9) each of the four functions: present in the module, absent from the
    // residual inline monolith, and exactly one definition overall.
    FOUR_PROV.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((PROV_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in candle-provenance.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (10)(11) the module contains ONLY the four declarations + comments — no top-level
    // executable code (no state, no constants). Strip comments, remove the four bodies,
    // expect nothing but whitespace left.
    let provResidual = stripComments(PROV_SRC);
    FOUR_PROV.forEach((n) => { provResidual = provResidual.replace(stripComments(extractFn(PROV_SRC, n)), ''); });
    ok(provResidual.trim() === '', '0: provenance module contains ONLY the four declarations + comments (no top-level executable code)');

    // (12) no transport in the module.
    ok(!/\bfetch\s*\(/.test(PROV_SRC), '0: provenance module contains no fetch(');
    ok(!/\bttCall\s*\(/.test(PROV_SRC), '0: provenance module contains no ttCall(');
    // (13) no timers in the module.
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(PROV_SRC), '0: provenance module contains no timers');
    // (14) no DOM in the module.
    ok(!/\bdocument\b|\bwindow\b|getElementById|querySelector|addEventListener/.test(PROV_SRC), '0: provenance module contains no DOM access');
    // (15) no auth gate in the module (incl. _backendGateProvenanceSource, which stays in the gate module).
    ok(!/_backendCandleGateOpen|_backendCandleAuth|_noteBackendCandle|_backendAuthHeaders|backendApiAuthKnownInvalid|_backendGateProvenanceSource/.test(PROV_SRC),
      '0: provenance module contains no auth gate function');
    // (16) no normalization in the module.
    ok(!/_apexParityNorm|_sfsExtractBackendCandles|_mapBackendCandlesForChart|_scannerMapBackendCandlesForChart/.test(PROV_SRC),
      '0: provenance module contains no normalization function');
    // (17) no SFS orchestration in the module.
    ok(!/_sfsEnsure|_sfsWarmup|_sfsDrain|_sfsQueue|_sfsFetchBackendCandles|_sfsSpyReadOnly/.test(PROV_SRC),
      '0: provenance module contains no SFS orchestration');

    // (18)(19) NO provenance state / constant DECLARATIONS in the module (the functions
    // may reference these globals — they must not declare them).
    ok(!/\b(?:var|let|const)\s+_candleProvenanceStats\b/.test(PROV_SRC), '0: provenance module does NOT declare _candleProvenanceStats');
    ok(!/\b(?:var|let|const)\s+_candleProvenanceLog\b/.test(PROV_SRC), '0: provenance module does NOT declare _candleProvenanceLog');
    ok(!/\b(?:var|let|const)\s+_CANDLE_PROVENANCE_MAX\b/.test(PROV_SRC), '0: provenance module does NOT declare _CANDLE_PROVENANCE_MAX');
    ok(!/\b(?:var|let|const)\s+_CANDLE_USABLE_MIN\b/.test(PROV_SRC), '0: provenance module does NOT declare _CANDLE_USABLE_MIN');

    // (20)(21) the provenance state + constants STAY declared in the residual inline monolith.
    ok(/\bvar\s+_candleProvenanceStats\s*=/.test(inlineMonolith), '0: _candleProvenanceStats stays declared in the monolith');
    ok(/\bvar\s+_candleProvenanceLog\s*=/.test(inlineMonolith), '0: _candleProvenanceLog stays declared in the monolith');
    ok(/\bvar\s+_CANDLE_PROVENANCE_MAX\b/.test(inlineMonolith), '0: _CANDLE_PROVENANCE_MAX stays declared in the monolith');
    ok(/\bvar\s+_CANDLE_USABLE_MIN\b/.test(inlineMonolith), '0: _CANDLE_USABLE_MIN stays declared in the monolith');

    // (22) _backendGateProvenanceSource stays EXCLUSIVELY in js/services/candle-auth-gate.js:
    // defined there, never redefined in the provenance module or the residual monolith.
    ok(/(?:async\s+)?function\s+_backendGateProvenanceSource\s*\(/.test(GATE_SRC), '0: _backendGateProvenanceSource defined in candle-auth-gate.js');
    ok(!/(?:async\s+)?function\s+_backendGateProvenanceSource\s*\(/.test(PROV_SRC), '0: _backendGateProvenanceSource NOT defined in candle-provenance.js');
    ok(!/(?:async\s+)?function\s+_backendGateProvenanceSource\s*\(/.test(inlineMonolith), '0: _backendGateProvenanceSource NOT defined in the residual monolith');

    // (23) separation: candle-auth-gate.js and candle-normalization.js keep NO provenance
    // fn (no leak), confirming those modules stay unchanged by this extraction.
    FOUR_PROV.forEach((n) => {
      ok(GATE_SRC.indexOf(n) === -1, '0: provenance fn NOT present in candle-auth-gate.js: ' + n);
      ok(MODULE_SRC.indexOf(n) === -1, '0: provenance fn NOT present in candle-normalization.js: ' + n);
    });

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(PROV_SRC.indexOf("'use strict'") === -1 && PROV_SRC.indexOf('"use strict"') === -1, '0: provenance module has no "use strict" pragma');
    ok(!/\bimport\b/.test(PROV_SRC), '0: provenance module has no import');
    ok(!/\bexport\b/.test(PROV_SRC), '0: provenance module has no export');
    ok(PROV_SRC.indexOf('require(') === -1, '0: provenance module has no require(');
    ok(!/window\.\w+\s*=/.test(PROV_SRC), '0: provenance module has no window.* export');

    // 0a-EXTRACTION-STORE. The five low-level candle-store primitives (the three scanner
    // session-cache helpers + the GET /market/candles read and POST /market/candles/ensure
    // transport functions) are now a separate classic module js/services/candle-store-client.js,
    // loaded AFTER candle-provenance.js and BEFORE the inline monolith. It must contain ONLY
    // the five approved functions + comments — NO cache STATE, NO TTL constant, NO orchestration,
    // NO DXLink read, NO ttCall transport, NO timers, NO DOM, NO top-level code. The cache state
    // (_scannerChartCandleSessionCache) and the _SCANNER_CHART_CANDLE_CACHE_TTL_MS constant STAY
    // declared in the monolith; only the FUNCTIONS moved. This extraction changes the physical
    // location of the five functions only — endpoints, cache, auth, source labels, return shapes
    // and the read-first orchestration (which stays in the monolith) are unchanged.
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

    // (5) load order: AFTER candle-provenance.js, BEFORE the inline monolith.
    const storeEntry = ordered.filter((s) => s.kind === 'local' && s.src === STORE_TAG)[0];
    ok(!!storeEntry, '0: candle-store-client.js is a local classic script in the load order');
    ok(!!provEntry && !!storeEntry && provEntry.order < storeEntry.order, '0: candle-store-client.js loads AFTER candle-provenance.js');
    ok(!!storeEntry && !!firstInline && storeEntry.order < firstInline.order, '0: candle-store-client.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(STORE_TAG) !== -1, '0: loader parses candle-store-client.js as a local script');

    // (7)(8)(9) each of the five functions: present in the module, absent from the
    // residual inline monolith, and exactly one definition overall.
    STORE_FIVE.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((STORE_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in candle-store-client.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (10)(11) the module contains ONLY the five declarations + comments — no top-level
    // executable code (no cache state, no TTL constant). Strip comments, remove the five
    // bodies, expect nothing but whitespace left.
    let storeResidual = stripComments(STORE_SRC);
    STORE_FIVE.forEach((n) => { storeResidual = storeResidual.replace(stripComments(extractFn(STORE_SRC, n)), ''); });
    ok(storeResidual.trim() === '', '0: store-client module contains ONLY the five declarations + comments (no top-level executable code)');

    // (12)(13)(14) no ttCall transport, no timers, no DOM in the module.
    ok(!/\bttCall\s*\(/.test(STORE_SRC), '0: store-client module contains no ttCall(');
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(STORE_SRC), '0: store-client module contains no timers');
    ok(!/\bdocument\b|\bwindow\b|getElementById|querySelector|addEventListener/.test(STORE_SRC), '0: store-client module contains no DOM access');
    // (15) no read-first orchestration in the module.
    ok(!/_scannerFetchBackendCandlesForChart|_loadBackendChartCandles|_scannerRevalidateBackendCandlesForChart|_scannerBackendCandleWait|_sfsEnsure|_sfsWarmup|_sfsDrain/.test(STORE_SRC),
      '0: store-client module contains no read-first orchestration');
    // (16) no DXLink read primitive in the module.
    ok(!/_sfsFetchBackendCandles|candles-dxlink/.test(STORE_SRC), '0: store-client module contains no DXLink read primitive');

    // (17)(18) NO cache state / TTL constant DECLARATIONS in the module (the functions may
    // reference these globals — they must not declare them).
    ok(!/\b(?:var|let|const)\s+_scannerChartCandleSessionCache\b/.test(STORE_SRC), '0: store-client module does NOT declare _scannerChartCandleSessionCache');
    ok(!/\b(?:var|let|const)\s+_SCANNER_CHART_CANDLE_CACHE_TTL_MS\b/.test(STORE_SRC), '0: store-client module does NOT declare _SCANNER_CHART_CANDLE_CACHE_TTL_MS');

    // (19)(20) the cache state + TTL constant STAY declared in the residual inline monolith.
    ok(/\bvar\s+_scannerChartCandleSessionCache\s*=/.test(inlineMonolith), '0: _scannerChartCandleSessionCache stays declared in the monolith');
    ok(/\bvar\s+_SCANNER_CHART_CANDLE_CACHE_TTL_MS\s*=/.test(inlineMonolith), '0: _SCANNER_CHART_CANDLE_CACHE_TTL_MS stays declared in the monolith');

    // (21) separation: candle-normalization.js / candle-auth-gate.js / candle-provenance.js
    // keep NO store-client fn (no leak), confirming those modules are untouched by this extraction.
    STORE_FIVE.forEach((n) => {
      ok(MODULE_SRC.indexOf(n) === -1, '0: store-client fn NOT present in candle-normalization.js: ' + n);
      ok(GATE_SRC.indexOf(n) === -1, '0: store-client fn NOT present in candle-auth-gate.js: ' + n);
      ok(PROV_SRC.indexOf(n) === -1, '0: store-client fn NOT present in candle-provenance.js: ' + n);
    });

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(STORE_SRC.indexOf("'use strict'") === -1 && STORE_SRC.indexOf('"use strict"') === -1, '0: store-client module has no "use strict" pragma');
    ok(!/\bimport\b/.test(STORE_SRC), '0: store-client module has no import');
    ok(!/\bexport\b/.test(STORE_SRC), '0: store-client module has no export');
    ok(STORE_SRC.indexOf('require(') === -1, '0: store-client module has no require(');
    ok(!/window\.\w+\s*=/.test(STORE_SRC), '0: store-client module has no window.* export');

    // 0a-EXTRACTION-DXLINK. The single low-level DXLink candle read primitive
    // (_sfsFetchBackendCandles) is now a separate classic module
    // js/services/candle-dxlink-client.js, loaded AFTER candle-store-client.js and BEFORE
    // the inline monolith. It must contain ONLY that one function + comments — NO state,
    // NO response cache, NO in-flight/cooldown/queue, NO warmup, NO timers, NO DOM, NO
    // ttCall transport, NO candle-store endpoint and NO top-level code. Every SFS in-flight
    // / cooldown / queue / warmup STATE and every orchestrator stay in the monolith; only
    // the one FUNCTION moved. This extraction changes the physical location of that function
    // only — endpoint, headers, timeout, auth gate, normalization, provenance, error reasons
    // and return shape are unchanged.
    const DX_PATH = path.resolve(__dirname, '..', 'js', 'services', 'candle-dxlink-client.js');
    const DX_TAG = './js/services/candle-dxlink-client.js';

    // (1) module file exists.
    ok(fs.existsSync(DX_PATH), '0: js/services/candle-dxlink-client.js exists');
    const DX_SRC = fs.existsSync(DX_PATH) ? fs.readFileSync(DX_PATH, 'utf8') : '';

    // (2) exactly one <script src> tag for it in index.html.
    const dxTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/candle-dxlink-client\.js["'][^>]*>/gi) || [];
    ok(dxTags.length === 1, '0: exactly one candle-dxlink-client.js <script> tag in index.html');
    const theDxTag = dxTags[0] || '';

    // (3)(4) the tag is a classic script: no type=module, no async, no defer.
    ok(!/type\s*=\s*["']?module/i.test(theDxTag), '0: candle-dxlink-client tag is classic (no type=module)');
    ok(!/\basync\b/i.test(theDxTag), '0: candle-dxlink-client tag has no async attribute');
    ok(!/\bdefer\b/i.test(theDxTag), '0: candle-dxlink-client tag has no defer attribute');

    // (5) load order: AFTER candle-store-client.js, BEFORE the inline monolith.
    const dxEntry = ordered.filter((s) => s.kind === 'local' && s.src === DX_TAG)[0];
    ok(!!dxEntry, '0: candle-dxlink-client.js is a local classic script in the load order');
    ok(!!storeEntry && !!dxEntry && storeEntry.order < dxEntry.order, '0: candle-dxlink-client.js loads AFTER candle-store-client.js');
    ok(!!dxEntry && !!firstInline && dxEntry.order < firstInline.order, '0: candle-dxlink-client.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(DX_TAG) !== -1, '0: loader parses candle-dxlink-client.js as a local script');

    // (7)(8)(9) the one function: present in the module, absent from the residual inline
    // monolith, exactly one definition overall.
    {
      const reAll = /(?:async\s+)?function\s+_sfsFetchBackendCandles\s*\(/g;
      ok((DX_SRC.match(reAll) || []).length === 1, '0: _sfsFetchBackendCandles defined in candle-dxlink-client.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: _sfsFetchBackendCandles NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of _sfsFetchBackendCandles in reconstructed source');
    }

    // (10)(11) the module contains ONLY the one declaration + comments — no top-level
    // executable code. Strip comments, remove the one body, expect only whitespace.
    const dxResidual = stripComments(DX_SRC).replace(stripComments(extractFn(DX_SRC, '_sfsFetchBackendCandles')), '');
    ok(dxResidual.trim() === '', '0: dxlink-client module contains ONLY the one declaration + comments (no top-level executable code)');
    ok((stripComments(DX_SRC).match(/function\s+\w+\s*\(/g) || []).length === 1, '0: dxlink-client module has exactly one named function declaration');

    // (12) the module owns NO application state and NO concurrency state (declares none).
    // Construct checks run against comment-stripped CODE so verbatim prose (which
    // legitimately contains English words like "window" in "backoff window") never trips them.
    const DX_CODE = stripComments(DX_SRC);
    ok(!/\b(?:var|let|const)\s+\w/.test(dxResidual), '0: dxlink-client module declares no top-level state/constants');
    ok(!/SessionCache|_pfBackendCandleCache|_scannerChartCandleSessionCache/.test(DX_CODE), '0: dxlink-client module keeps NO response cache');
    ok(!/Inflight|InFlight|_sfsTfFetchInflight|_sfsDetail4hInflight|_sfsSpyReadInflight/.test(DX_CODE), '0: dxlink-client module holds NO in-flight dedupe state');
    ok(!/[Cc]ooldown/.test(DX_CODE), '0: dxlink-client module holds NO cooldown state');
    ok(!/[Qq]ueue/.test(DX_CODE), '0: dxlink-client module holds NO queue');
    ok(!/[Ww]armup/.test(DX_CODE), '0: dxlink-client module contains NO warmup');

    // (13)(14) no timers, no DOM.
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(DX_CODE), '0: dxlink-client module contains no timers');
    ok(!/\bdocument\b|\bwindow\b|getElementById|querySelector|addEventListener/.test(DX_CODE), '0: dxlink-client module contains no DOM access');

    // (15)(16)(17) transport isolation: DXLink GET family only — NO ttCall, NO candle-store
    // endpoint; the /dev/market/candles-dxlink/ family + 15000ms timeout are preserved.
    ok(!/\bttCall\s*\(/.test(DX_CODE), '0: dxlink-client module contains no ttCall transport');
    ok(!/\/market\/candles\?|\/market\/candles\/ensure/.test(DX_CODE), '0: dxlink-client module hits NO candle-store endpoint');
    ok(/\/dev\/market\/candles-dxlink\//.test(DX_CODE), '0: dxlink-client module reads the /dev/market/candles-dxlink/ family');
    ok(/AbortSignal\.timeout\(15000\)/.test(DX_CODE), '0: dxlink-client module preserves the 15000ms read timeout');

    // (18) separation: the sibling extracted candle modules keep NO dxlink primitive (no leak).
    ok(MODULE_SRC.indexOf('_sfsFetchBackendCandles') === -1, '0: _sfsFetchBackendCandles NOT present in candle-normalization.js');
    ok(GATE_SRC.indexOf('_sfsFetchBackendCandles') === -1, '0: _sfsFetchBackendCandles NOT present in candle-auth-gate.js');
    ok(PROV_SRC.indexOf('_sfsFetchBackendCandles') === -1, '0: _sfsFetchBackendCandles NOT present in candle-provenance.js');
    ok(STORE_SRC.indexOf('_sfsFetchBackendCandles') === -1, '0: _sfsFetchBackendCandles NOT present in candle-store-client.js');

    // (19) the SFS detail-4H read orchestrator + the per-feature adapters STAY in the
    // monolith and did NOT leak into the dxlink-client module. The four warmup coordinator
    // functions (_sfsWarmupDiag / _sfsWarmupBatch / _sfsQueueWarmupSymbols / _sfsDrainWarmupQueue)
    // were extracted to js/services/sfs-candle-warmup.js — asserted in 0a-EXTRACTION-WARMUP below;
    // the generic-timeframe ensure (_sfsEnsureTfCandles) was extracted to
    // js/services/sfs-candle-generic-ensure.js — asserted in 0a-EXTRACTION-GENERIC-ENSURE below;
    // the self-sufficient 1D chart hydration (_sfsEnsureChartData) was extracted to
    // js/services/sfs-candle-chart-hydration.js — asserted in 0a-EXTRACTION-CHART-HYDRATION below;
    // the SPY read-only resolver (_sfsSpyReadOnly + its three exclusive helpers) was extracted
    // to js/services/sfs-candle-spy-read.js — asserted in 0a-EXTRACTION-SPY-READ below; and the
    // detail-4H core (_sfsEnsureDetail4hCandles + its three exclusive helpers) was extracted to
    // js/services/sfs-candle-detail-4h.js — asserted in 0a-EXTRACTION-DETAIL-4H below. After
    // that LAST extraction NO SFS read orchestrator remains in the monolith; only the per-feature
    // adapters below do.
    ['_mcxFetchBackendCandlesForChart', '_fetchPretradeBackendCandles'].forEach((n) => {
      const reDef = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(');
      ok(reDef.test(inlineMonolith), '0: feature adapter stays in the monolith: ' + n);
      ok(DX_SRC.indexOf(n) === -1, '0: orchestrator NOT present in candle-dxlink-client.js: ' + n);
    });
    ['_sfsEnsureDetail4hCandles', '_sfsEnsureTfCandles', '_sfsEnsureChartData', '_sfsSpyReadOnly'].forEach((n) => {
      const reDef = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(');
      ok(!reDef.test(inlineMonolith), '0: no SFS read orchestrator left in the monolith: ' + n);
      ok(DX_SRC.indexOf(n) === -1, '0: orchestrator NOT present in candle-dxlink-client.js: ' + n);
    });

    // (20) the SFS in-flight / cooldown / queue STATE is declared in the SFS config/state
    // module (no longer in the monolith) and is NOT referenced by the read primitive's
    // module (concurrency ownership stays external).
    ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsDetail4hInflight', '_sfsWarmupQueue', '_sfsSpyReadInflight'].forEach((s) => {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
      ok(reDecl.test(CONFIG_STATE_SRC), '0: SFS state declared in sfs-config-state.js: ' + s);
      ok(!reDecl.test(inlineMonolith), '0: SFS state no longer declared in the monolith: ' + s);
      ok(DX_SRC.indexOf(s) === -1, '0: SFS state NOT referenced in candle-dxlink-client.js: ' + s);
    });

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(DX_SRC.indexOf("'use strict'") === -1 && DX_SRC.indexOf('"use strict"') === -1, '0: dxlink-client module has no "use strict" pragma');
    ok(!/\bimport\b/.test(DX_SRC), '0: dxlink-client module has no import');
    ok(!/\bexport\b/.test(DX_SRC), '0: dxlink-client module has no export');
    ok(DX_SRC.indexOf('require(') === -1, '0: dxlink-client module has no require(');
    ok(!/window\.\w+\s*=/.test(DX_SRC), '0: dxlink-client module has no window.* export');

    // 0a-EXTRACTION-PREDICATES. The four read-only SFS candle predicates / normalizers now
    // live in js/services/sfs-candle-predicates.js — a classic script loaded AFTER the other
    // extracted candle modules and BEFORE the inline monolith. It must contain ONLY the four
    // function declarations + comments: no state, no constants, no warmup / orchestration, no
    // transport / DOM / timers, and no top-level code.
    const PRED_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-predicates.js');
    const PRED_TAG = './js/services/sfs-candle-predicates.js';
    const PREDS = ['_sfsNormSymbolList', '_sfsNormTimeframes', '_sfsCandlesUsable', '_sfsCandleSubLimitActive'];

    // (1) module file exists.
    ok(fs.existsSync(PRED_PATH), '0: js/services/sfs-candle-predicates.js exists');
    const PRED_SRC = fs.existsSync(PRED_PATH) ? fs.readFileSync(PRED_PATH, 'utf8') : '';
    const PRED_CODE = stripComments(PRED_SRC);

    // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
    const predTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-predicates\.js["'][^>]*>/gi) || [];
    ok(predTags.length === 1, '0: exactly one sfs-candle-predicates.js <script> tag in index.html');
    ok(predTags.length === 1 && !/\btype\s*=/.test(predTags[0]), '0: sfs-candle-predicates.js tag is classic (no type= attribute)');
    ok(predTags.length === 1 && !/\basync\b/.test(predTags[0]) && !/\bdefer\b/.test(predTags[0]), '0: sfs-candle-predicates.js tag has no async/defer');

    // (5) load order: AFTER candle-dxlink-client.js, BEFORE the inline monolith.
    const predEntry = ordered.filter((s) => s.kind === 'local' && s.src === PRED_TAG)[0];
    const dxEntryP = ordered.filter((s) => s.kind === 'local' && s.src === DX_TAG)[0];
    const firstInlineP = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
    ok(!!predEntry, '0: sfs-candle-predicates.js is a local classic script in the load order');
    ok(!!predEntry && !!dxEntryP && dxEntryP.order < predEntry.order, '0: sfs-candle-predicates.js loads AFTER candle-dxlink-client.js');
    ok(!!predEntry && !!firstInlineP && predEntry.order < firstInlineP.order, '0: sfs-candle-predicates.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(PRED_TAG) !== -1, '0: loader parses sfs-candle-predicates.js as a local script');

    // (7)(8)(9) each predicate: present in the module, absent from the residual inline
    // monolith, exactly one definition overall in the reconstructed source.
    PREDS.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((PRED_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in sfs-candle-predicates.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (10)(11) the module contains ONLY the four declarations + comments — no top-level code.
    let predResidual = PRED_CODE;
    PREDS.forEach((n) => { predResidual = predResidual.replace(stripComments(extractFn(PRED_SRC, n)), ''); });
    ok(predResidual.trim() === '', '0: predicates module contains ONLY the four declarations + comments (no top-level executable code)');
    ok((PRED_CODE.match(/function\s+\w+\s*\(/g) || []).length === 4, '0: predicates module has exactly four named function declarations');

    // (12) the module owns NO state / constants and NO orchestration / warmup / transport.
    ok(!/\b(?:var|let|const)\s+\w/.test(predResidual), '0: predicates module declares no top-level state/constants');
    ok(!/[Ww]armup/.test(PRED_CODE), '0: predicates module contains NO warmup');
    ok(!/[Qq]ueue/.test(PRED_CODE), '0: predicates module contains NO queue');
    ok(!/[Cc]ooldown/.test(PRED_CODE), '0: predicates module contains NO cooldown');
    ok(!/Inflight|InFlight/.test(PRED_CODE), '0: predicates module holds NO in-flight dedupe state');
    ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest/.test(PRED_CODE), '0: predicates module performs NO network');
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(PRED_CODE), '0: predicates module creates NO timers');
    ok(!/\bdocument\b|getElementById|querySelector|addEventListener/.test(PRED_CODE), '0: predicates module touches NO DOM');
    // _sfsCandleSubLimitActive may READ S but must NOT declare it.
    ok(/\bS\.dxlinkStatus\b/.test(PRED_CODE), '0: predicates module reads S.dxlinkStatus at call time (subscription-limit classifier)');
    ok(!/\b(?:var|let|const)\s+S\b/.test(PRED_CODE), '0: predicates module does NOT declare S (resolves it lexically from the monolith)');

    // (13) the SFS in-flight / cooldown / queue STATE + constants are declared in the SFS
    // config/state module, NOT in the monolith and NOT in the predicates module.
    ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsLastFailReason', '_sfsWarmupQueue',
      '_sfsWarmupQueuedKeys', '_sfsWarmupDrainTimer', '_sfsWarmupLastSentAt'].forEach((s) => {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
      ok(reDecl.test(CONFIG_STATE_SRC), '0: SFS state declared in sfs-config-state.js: ' + s);
      ok(!reDecl.test(inlineMonolith), '0: SFS state no longer declared in the monolith: ' + s);
      ok(PRED_SRC.indexOf(s) === -1, '0: SFS state NOT referenced in sfs-candle-predicates.js: ' + s);
    });
    ['SFS_WARMUP_BATCH_CAP', 'SFS_WARMUP_DEBOUNCE_MS', 'SFS_WARMUP_COOLDOWN_MS'].forEach((c) => {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + c + '\\b');
      ok(reDecl.test(CONFIG_STATE_SRC), '0: SFS constant declared in sfs-config-state.js: ' + c);
      ok(!reDecl.test(inlineMonolith), '0: SFS constant no longer declared in the monolith: ' + c);
      ok(PRED_SRC.indexOf(c) === -1, '0: SFS constant NOT referenced in sfs-candle-predicates.js: ' + c);
    });

    // (14) separation: the sibling extracted candle modules do NOT own the predicates (no leak),
    // and the predicates module does NOT own the normalization core or the dxlink read primitive.
    PREDS.forEach((n) => {
      ok(MODULE_SRC.indexOf(n) === -1, '0: ' + n + ' NOT present in candle-normalization.js');
      ok(DX_SRC.indexOf(n) === -1, '0: ' + n + ' NOT present in candle-dxlink-client.js');
    });
    ok(PRED_SRC.indexOf('_sfsFetchBackendCandles') === -1, '0: predicates module does NOT own the dxlink read primitive');
    ok(PRED_SRC.indexOf('_apexParityNormCandle') === -1, '0: predicates module does NOT own the normalization core');

    // (15) js/services/candle-service.js still does NOT exist (guarded in 0a above; re-asserted).
    ok(fs.existsSync(svcPath) === false, '0: js/services/candle-service.js STILL does NOT exist after predicates extraction');

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(PRED_SRC.indexOf("'use strict'") === -1 && PRED_SRC.indexOf('"use strict"') === -1, '0: predicates module has no "use strict" pragma');
    ok(!/\bimport\b/.test(PRED_SRC), '0: predicates module has no import');
    ok(!/\bexport\b/.test(PRED_SRC), '0: predicates module has no export');
    ok(PRED_SRC.indexOf('require(') === -1, '0: predicates module has no require(');
    ok(!/window\.\w+\s*=/.test(PRED_SRC), '0: predicates module has no window.* export');

    // 0a-EXTRACTION-WARMUP. The four SFS warmup coordinator functions
    // (_sfsWarmupDiag / _sfsWarmupBatch / _sfsQueueWarmupSymbols / _sfsDrainWarmupQueue) now
    // live in js/services/sfs-candle-warmup.js — a classic script loaded AFTER
    // sfs-candle-predicates.js and BEFORE the inline monolith. It must contain ONLY the four
    // function declarations + comments: no warmup state, no CAP/DEBOUNCE constants, no DOM, and
    // no top-level code. setTimeout / fetch / Date.now / the global warmup state appear ONLY
    // inside the function bodies (the real behaviour) — never at module top level.
    const WARMUP_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-warmup.js');
    const WARMUP_TAG = './js/services/sfs-candle-warmup.js';
    const WARMUP_FOUR = ['_sfsWarmupDiag', '_sfsWarmupBatch', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue'];

    // (1) module file exists.
    ok(fs.existsSync(WARMUP_PATH), '0: js/services/sfs-candle-warmup.js exists');
    const WARMUP_SRC = fs.existsSync(WARMUP_PATH) ? fs.readFileSync(WARMUP_PATH, 'utf8') : '';
    const WARMUP_CODE = stripComments(WARMUP_SRC);

    // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
    const warmupTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-warmup\.js["'][^>]*>/gi) || [];
    ok(warmupTags.length === 1, '0: exactly one sfs-candle-warmup.js <script> tag in index.html');
    ok(warmupTags.length === 1 && !/\btype\s*=/.test(warmupTags[0]), '0: sfs-candle-warmup.js tag is classic (no type= attribute)');
    ok(warmupTags.length === 1 && !/\basync\b/.test(warmupTags[0]) && !/\bdefer\b/.test(warmupTags[0]), '0: sfs-candle-warmup.js tag has no async/defer');

    // (5) load order: AFTER sfs-candle-predicates.js, BEFORE the inline monolith.
    const warmupEntry = ordered.filter((s) => s.kind === 'local' && s.src === WARMUP_TAG)[0];
    const predEntryW = ordered.filter((s) => s.kind === 'local' && s.src === PRED_TAG)[0];
    const firstInlineW = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
    ok(!!warmupEntry, '0: sfs-candle-warmup.js is a local classic script in the load order');
    ok(!!warmupEntry && !!predEntryW && predEntryW.order < warmupEntry.order, '0: sfs-candle-warmup.js loads AFTER sfs-candle-predicates.js');
    ok(!!warmupEntry && !!firstInlineW && warmupEntry.order < firstInlineW.order, '0: sfs-candle-warmup.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(WARMUP_TAG) !== -1, '0: loader parses sfs-candle-warmup.js as a local script');

    // (7)(8)(9) each function: present in the module, absent from the residual inline monolith,
    // exactly one definition overall in the reconstructed source.
    WARMUP_FOUR.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((WARMUP_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in sfs-candle-warmup.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (10)(11) the module contains ONLY the four declarations + comments — no top-level code.
    let warmupResidual = WARMUP_CODE;
    WARMUP_FOUR.forEach((n) => { warmupResidual = warmupResidual.replace(stripComments(extractFn(WARMUP_SRC, n)), ''); });
    ok(warmupResidual.trim() === '', '0: warmup module contains ONLY the four declarations + comments (no top-level executable code)');
    ok((WARMUP_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 4, '0: warmup module has exactly four named function declarations');

    // (12) the module owns NO warmup state or CAP/DEBOUNCE constants — they stay in the monolith,
    // and it touches NO DOM. (setTimeout / fetch / Date.now live INSIDE the bodies only.)
    ok(!/\bvar\s+_sfsWarmup\w*\s*=/.test(WARMUP_SRC) && !/\bvar\s+SFS_WARMUP_\w+\s*=/.test(WARMUP_SRC),
       '0: warmup module declares NO warmup state or CAP/DEBOUNCE constants');
    ok(!/\bdocument\b|getElementById|querySelector|addEventListener/.test(WARMUP_CODE), '0: warmup module touches NO DOM');

    // (13) no read orchestrator / read primitive leaked into the warmup module.
    ['_sfsEnsureChartData', '_sfsEnsureTfCandles', '_sfsEnsureDetail4hCandles', '_sfsSpyReadOnly', '_sfsFetchBackendCandles'].forEach((n) => {
      ok(WARMUP_SRC.indexOf('function ' + n + '(') === -1, '0: warmup module does NOT contain read orchestrator/primitive: ' + n);
    });

    // (14) separation: the warmup coordinator is NOT re-owned by the sibling candle modules.
    ok(DX_SRC.indexOf('_sfsWarmupBatch') === -1, '0: dxlink-client module does NOT own the warmup coordinator');
    ok(PRED_SRC.indexOf('_sfsWarmupBatch') === -1, '0: predicates module does NOT own the warmup coordinator');

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(WARMUP_SRC.indexOf("'use strict'") === -1 && WARMUP_SRC.indexOf('"use strict"') === -1, '0: warmup module has no "use strict" pragma');
    ok(!/\bimport\b/.test(WARMUP_SRC), '0: warmup module has no import');
    ok(!/\bexport\b/.test(WARMUP_SRC), '0: warmup module has no export');
    ok(WARMUP_SRC.indexOf('require(') === -1, '0: warmup module has no require(');
    ok(!/window\.\w+\s*=/.test(WARMUP_SRC), '0: warmup module has no window.* export');

    // 0a-EXTRACTION-GENERIC-ENSURE. The SFS generic-timeframe candle ensure
    // (_sfsEnsureTfCandles) now lives in js/services/sfs-candle-generic-ensure.js — a classic
    // script loaded AFTER sfs-candle-warmup.js and BEFORE the inline monolith. It must contain
    // ONLY the single function declaration + comments: no in-flight / cooldown / last-failure
    // state, no SFS_WARMUP_COOLDOWN_MS constant, no DOM, no direct transport, no timers, and no
    // top-level code. The state (_sfsTfFetchInflight / _sfsWarmupCooldown / _sfsLastFailReason)
    // and the SFS_WARMUP_COOLDOWN_MS constant stay declared in the monolith and are resolved
    // globally at call time; only the FUNCTION moved.
    const GEN_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-generic-ensure.js');
    const GEN_TAG = './js/services/sfs-candle-generic-ensure.js';

    // (1) module file exists.
    ok(fs.existsSync(GEN_PATH), '0: js/services/sfs-candle-generic-ensure.js exists');
    const GEN_SRC = fs.existsSync(GEN_PATH) ? fs.readFileSync(GEN_PATH, 'utf8') : '';
    const GEN_CODE = stripComments(GEN_SRC);

    // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
    const genTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-generic-ensure\.js["'][^>]*>/gi) || [];
    ok(genTags.length === 1, '0: exactly one sfs-candle-generic-ensure.js <script> tag in index.html');
    ok(genTags.length === 1 && !/\btype\s*=/.test(genTags[0]), '0: sfs-candle-generic-ensure.js tag is classic (no type= attribute)');
    ok(genTags.length === 1 && !/\basync\b/.test(genTags[0]) && !/\bdefer\b/.test(genTags[0]), '0: sfs-candle-generic-ensure.js tag has no async/defer');

    // (5) load order: AFTER sfs-candle-warmup.js, BEFORE the inline monolith.
    const genEntry = ordered.filter((s) => s.kind === 'local' && s.src === GEN_TAG)[0];
    const warmupEntryG = ordered.filter((s) => s.kind === 'local' && s.src === WARMUP_TAG)[0];
    const firstInlineG = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
    ok(!!genEntry, '0: sfs-candle-generic-ensure.js is a local classic script in the load order');
    ok(!!genEntry && !!warmupEntryG && warmupEntryG.order < genEntry.order, '0: sfs-candle-generic-ensure.js loads AFTER sfs-candle-warmup.js');
    ok(!!genEntry && !!firstInlineG && genEntry.order < firstInlineG.order, '0: sfs-candle-generic-ensure.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(GEN_TAG) !== -1, '0: loader parses sfs-candle-generic-ensure.js as a local script');

    // (7)(8)(9) the function: present in the module, absent from the residual inline monolith,
    // exactly one definition overall in the reconstructed source.
    {
      const reAll = /(?:async\s+)?function\s+_sfsEnsureTfCandles\s*\(/g;
      ok((GEN_SRC.match(reAll) || []).length === 1, '0: _sfsEnsureTfCandles defined in sfs-candle-generic-ensure.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: _sfsEnsureTfCandles NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of _sfsEnsureTfCandles in reconstructed source');
    }

    // (10)(11) the module contains ONLY the single declaration + comments — no top-level code.
    let genResidual = GEN_CODE.replace(stripComments(extractFn(GEN_SRC, '_sfsEnsureTfCandles')), '');
    ok(genResidual.trim() === '', '0: generic-ensure module contains ONLY the single declaration + comments (no top-level executable code)');
    ok((GEN_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 1, '0: generic-ensure module has exactly one named function declaration');

    // (12) the module declares NO state / constants, touches NO DOM, does NO direct transport
    // and creates NO timers. (_sfsFetchBackendCandles / _sfsWarmupBatch / the state maps are
    // REFERENCED inside the body but declared elsewhere.)
    ok(!/\b(?:var|let|const)\s+\w/.test(genResidual), '0: generic-ensure module declares no top-level state/constants');
    ok(!/\bdocument\b|getElementById|querySelector|addEventListener/.test(GEN_CODE), '0: generic-ensure module touches NO DOM');
    ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest/.test(GEN_CODE), '0: generic-ensure module performs NO direct transport (delegates to _sfsFetchBackendCandles)');
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(GEN_CODE), '0: generic-ensure module creates NO timers');

    // (13) the SFS in-flight / cooldown / last-failure STATE + the SFS_WARMUP_COOLDOWN_MS constant
    // are declared in the SFS config/state module, NOT in the monolith and NOT (re)declared
    // in the extracted module.
    ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsLastFailReason'].forEach((s) => {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
      ok(reDecl.test(CONFIG_STATE_SRC), '0: SFS state declared in sfs-config-state.js: ' + s);
      ok(!reDecl.test(inlineMonolith), '0: SFS state no longer declared in the monolith: ' + s);
      ok(!reDecl.test(GEN_SRC), '0: SFS state NOT (re)declared in sfs-candle-generic-ensure.js: ' + s);
    });
    ok(/\b(?:var|let|const)\s+SFS_WARMUP_COOLDOWN_MS\b/.test(CONFIG_STATE_SRC), '0: SFS_WARMUP_COOLDOWN_MS constant declared in sfs-config-state.js');
    ok(!/\b(?:var|let|const)\s+SFS_WARMUP_COOLDOWN_MS\b/.test(inlineMonolith), '0: SFS_WARMUP_COOLDOWN_MS constant no longer declared in the monolith');
    ok(!/\b(?:var|let|const)\s+SFS_WARMUP_COOLDOWN_MS\b/.test(GEN_SRC), '0: SFS_WARMUP_COOLDOWN_MS constant NOT (re)declared in sfs-candle-generic-ensure.js');

    // (14) separation: neither the detail-4H / SPY read orchestrators nor their helpers, and
    // no low-level primitive, are (re)declared in the generic-ensure module (no leak).
    ['_sfsEnsureDetail4hCandles', '_sfsSpyReadOnly', '_sfsSleep', '_sfsFetchBackendCandles',
      '_sfsWarmupBatch', '_sfsCandlesUsable', '_sfsCandleSubLimitActive'].forEach((n) => {
      ok(GEN_SRC.indexOf('function ' + n + '(') === -1, '0: generic-ensure module does NOT (re)declare: ' + n);
    });

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(GEN_SRC.indexOf("'use strict'") === -1 && GEN_SRC.indexOf('"use strict"') === -1, '0: generic-ensure module has no "use strict" pragma');
    ok(!/\bimport\b/.test(GEN_SRC), '0: generic-ensure module has no import');
    ok(!/\bexport\b/.test(GEN_SRC), '0: generic-ensure module has no export');
    ok(GEN_SRC.indexOf('require(') === -1, '0: generic-ensure module has no require(');
    ok(!/window\.\w+\s*=/.test(GEN_SRC), '0: generic-ensure module has no window.* export');

    // 0a-EXTRACTION-CHART-HYDRATION. The SFS self-sufficient 1D chart hydration
    // (_sfsEnsureChartData) now lives in js/services/sfs-candle-chart-hydration.js — a classic
    // script loaded AFTER sfs-candle-generic-ensure.js and BEFORE the inline monolith. It must
    // contain ONLY the single function declaration + comments: no state, no constants, no DOM,
    // no direct transport, no direct warmup, no timers, no detail-4H / SPY logic, and no
    // top-level code. It delegates ONLY to _sfsEnsureTfCandles (the generic-timeframe ensure);
    // all read/warmup/cache orchestration stays owned by sfs-candle-generic-ensure.js and the
    // detail-4H / SPY read orchestrators stay in the monolith. Only the FUNCTION moved.
    const HYD_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-chart-hydration.js');
    const HYD_TAG = './js/services/sfs-candle-chart-hydration.js';

    // (1) module file exists.
    ok(fs.existsSync(HYD_PATH), '0: js/services/sfs-candle-chart-hydration.js exists');
    const HYD_SRC = fs.existsSync(HYD_PATH) ? fs.readFileSync(HYD_PATH, 'utf8') : '';
    const HYD_CODE = stripComments(HYD_SRC);

    // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
    const hydTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-chart-hydration\.js["'][^>]*>/gi) || [];
    ok(hydTags.length === 1, '0: exactly one sfs-candle-chart-hydration.js <script> tag in index.html');
    ok(hydTags.length === 1 && !/\btype\s*=/.test(hydTags[0]), '0: sfs-candle-chart-hydration.js tag is classic (no type= attribute)');
    ok(hydTags.length === 1 && !/\basync\b/.test(hydTags[0]) && !/\bdefer\b/.test(hydTags[0]), '0: sfs-candle-chart-hydration.js tag has no async/defer');

    // (5) load order: AFTER sfs-candle-generic-ensure.js, BEFORE the inline monolith.
    const hydEntry = ordered.filter((s) => s.kind === 'local' && s.src === HYD_TAG)[0];
    const genEntryH = ordered.filter((s) => s.kind === 'local' && s.src === GEN_TAG)[0];
    const firstInlineH = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
    ok(!!hydEntry, '0: sfs-candle-chart-hydration.js is a local classic script in the load order');
    ok(!!hydEntry && !!genEntryH && genEntryH.order < hydEntry.order, '0: sfs-candle-chart-hydration.js loads AFTER sfs-candle-generic-ensure.js');
    ok(!!hydEntry && !!firstInlineH && hydEntry.order < firstInlineH.order, '0: sfs-candle-chart-hydration.js loads BEFORE the inline monolith');

    // (6) the shared loader includes the new script in the reconstructed source.
    ok(scriptTags.indexOf(HYD_TAG) !== -1, '0: loader parses sfs-candle-chart-hydration.js as a local script');

    // (7)(8)(9) the function: present in the module, absent from the residual inline monolith,
    // exactly one definition overall in the reconstructed source.
    {
      const reAll = /(?:async\s+)?function\s+_sfsEnsureChartData\s*\(/g;
      ok((HYD_SRC.match(reAll) || []).length === 1, '0: _sfsEnsureChartData defined in sfs-candle-chart-hydration.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: _sfsEnsureChartData NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of _sfsEnsureChartData in reconstructed source');
    }

    // (10)(11) the module contains ONLY the single declaration + comments — no top-level code.
    let hydResidual = HYD_CODE.replace(stripComments(extractFn(HYD_SRC, '_sfsEnsureChartData')), '');
    ok(hydResidual.trim() === '', '0: chart-hydration module contains ONLY the single declaration + comments (no top-level executable code)');
    ok((HYD_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 1, '0: chart-hydration module has exactly one named function declaration');

    // (12) the module declares NO state / constants, touches NO DOM, does NO direct transport,
    // creates NO timers and performs NO direct warmup. (_sfsEnsureTfCandles is REFERENCED inside
    // the body but declared in the generic-ensure module.)
    ok(!/\b(?:var|let|const)\s+\w/.test(hydResidual), '0: chart-hydration module declares no top-level state/constants');
    ok(!/\bdocument\b|getElementById|querySelector|addEventListener/.test(HYD_CODE), '0: chart-hydration module touches NO DOM');
    ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest|_sfsFetchBackendCandles/.test(HYD_CODE), '0: chart-hydration module performs NO direct transport (delegates to _sfsEnsureTfCandles)');
    ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(HYD_CODE), '0: chart-hydration module creates NO timers');
    ok(!/[Ww]armup/.test(HYD_CODE) && !/_sfsWarmupBatch/.test(HYD_CODE), '0: chart-hydration module performs NO direct warmup');
    ok(/_sfsEnsureTfCandles\s*\(/.test(HYD_CODE), '0: chart-hydration module delegates to _sfsEnsureTfCandles');

    // (13) the SFS in-flight / cooldown / last-failure STATE + the SFS_WARMUP_COOLDOWN_MS constant
    // are declared in the SFS config/state module, NOT in the monolith and NOT (re)declared
    // in the extracted module.
    ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsLastFailReason'].forEach((s) => {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
      ok(reDecl.test(CONFIG_STATE_SRC), '0: SFS state declared in sfs-config-state.js: ' + s);
      ok(!reDecl.test(inlineMonolith), '0: SFS state no longer declared in the monolith: ' + s);
      ok(!reDecl.test(HYD_SRC), '0: SFS state NOT (re)declared in sfs-candle-chart-hydration.js: ' + s);
    });
    ok(!/\b(?:var|let|const)\s+SFS_WARMUP_COOLDOWN_MS\b/.test(HYD_SRC), '0: SFS_WARMUP_COOLDOWN_MS constant NOT (re)declared in sfs-candle-chart-hydration.js');

    // (14) separation: neither the detail-4H / SPY read orchestrators nor their helpers, and no
    // low-level primitive or the generic ensure, are (re)declared in the chart-hydration module.
    ['_sfsEnsureDetail4hCandles', '_sfsSpyReadOnly', '_sfsSleep', '_sfsFetchBackendCandles',
      '_sfsWarmupBatch', '_sfsEnsureTfCandles', '_sfsCandlesUsable', '_sfsCandleSubLimitActive'].forEach((n) => {
      ok(HYD_SRC.indexOf('function ' + n + '(') === -1, '0: chart-hydration module does NOT (re)declare: ' + n);
    });

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(HYD_SRC.indexOf("'use strict'") === -1 && HYD_SRC.indexOf('"use strict"') === -1, '0: chart-hydration module has no "use strict" pragma');
    ok(!/\bimport\b/.test(HYD_SRC), '0: chart-hydration module has no import');
    ok(!/\bexport\b/.test(HYD_SRC), '0: chart-hydration module has no export');
    ok(HYD_SRC.indexOf('require(') === -1, '0: chart-hydration module has no require(');
    ok(!/window\.\w+\s*=/.test(HYD_SRC), '0: chart-hydration module has no window.* export');

    // 0a-EXTRACTION-SPY-READ. The SPY read-only benchmark resolver (_sfsSpyReadOnly) and its
    // THREE EXCLUSIVE helpers (_sfsSpyDiag / _sfsPromoteSpyCandles / _sfsSpyReadResultContext)
    // now live in js/services/sfs-candle-spy-read.js — a classic script loaded AFTER
    // sfs-candle-chart-hydration.js and BEFORE the inline monolith. It must contain ONLY the
    // four function declarations + comments: no state, no constants, no DOM, no direct
    // transport, no timers, no detail-4H logic and no top-level code. ONLY the FUNCTIONS moved:
    // the resolver STATE (_sfsSpyReadInflight / _sfsSpyReadCooldown, which deliberately carries
    // BOTH the '<tf>' read-cooldown keys and the 'SPY|<tf>' warm-cooldown keys), the four
    // SFS_SPY_* constants and the shared helpers (_sfsSleep, _sfsCandlesFromSyncSource — the
    // latter also feeds the detail-4H flow) stay declared in the monolith.
    const SPY_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-spy-read.js');
    const SPY_TAG = './js/services/sfs-candle-spy-read.js';
    const SPY_READ_FNS = ['_sfsSpyDiag', '_sfsPromoteSpyCandles', '_sfsSpyReadResultContext', '_sfsSpyReadOnly'];

    // (1) module file exists.
    ok(fs.existsSync(SPY_PATH), '0: js/services/sfs-candle-spy-read.js exists');
    const SPY_SRC = fs.existsSync(SPY_PATH) ? fs.readFileSync(SPY_PATH, 'utf8') : '';
    const SPY_CODE = stripComments(SPY_SRC);

    // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
    const spyTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-spy-read\.js["'][^>]*>/gi) || [];
    ok(spyTags.length === 1, '0: exactly one sfs-candle-spy-read.js <script> tag in index.html');
    ok(spyTags.length === 1 && !/\btype\s*=/.test(spyTags[0]), '0: sfs-candle-spy-read.js tag is classic (no type= attribute)');
    ok(spyTags.length === 1 && !/\basync\b/.test(spyTags[0]) && !/\bdefer\b/.test(spyTags[0]), '0: sfs-candle-spy-read.js tag has no async/defer');

    // (5)(6) load order: AFTER sfs-candle-chart-hydration.js, BEFORE the inline monolith.
    const spyEntry = ordered.filter((s) => s.kind === 'local' && s.src === SPY_TAG)[0];
    const hydEntryS = ordered.filter((s) => s.kind === 'local' && s.src === HYD_TAG)[0];
    const firstInlineS = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
    ok(!!spyEntry, '0: sfs-candle-spy-read.js is a local classic script in the load order');
    ok(!!spyEntry && !!hydEntryS && hydEntryS.order < spyEntry.order, '0: sfs-candle-spy-read.js loads AFTER sfs-candle-chart-hydration.js');
    ok(!!spyEntry && !!firstInlineS && spyEntry.order < firstInlineS.order, '0: sfs-candle-spy-read.js loads BEFORE the inline monolith');
    ok(scriptTags.indexOf(SPY_TAG) !== -1, '0: loader parses sfs-candle-spy-read.js as a local script');

    // (7)(8)(9) each function: in the module, absent from the residual monolith, one def overall.
    SPY_READ_FNS.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((SPY_SRC.match(reAll) || []).length === 1, '0: ' + n + ' defined in sfs-candle-spy-read.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n + ' in reconstructed source');
    });

    // (10)(11) the module contains ONLY the four declarations + comments — no top-level code.
    let spyResidual = SPY_CODE;
    SPY_READ_FNS.forEach((n) => { spyResidual = spyResidual.replace(stripComments(extractFn(SPY_SRC, n)), ''); });
    ok(spyResidual.trim() === '', '0: spy-read module contains ONLY the four declarations + comments (no top-level executable code)');
    ok((SPY_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 4, '0: spy-read module has exactly four named function declarations');
    ok(!/\b(?:var|let|const)\s+\w/.test(spyResidual), '0: spy-read module declares no top-level state/constants');
    ok(!/\bnew\s+Promise\b|\bset(?:Timeout|Interval)\s*\(/.test(spyResidual), '0: spy-read module creates no top-level Promise/timer');

    // (12) no DOM (the RS panel UI stays in the monolith) and no direct transport: the module
    // reads through _sfsFetchBackendCandles and warms through _sfsWarmupBatch only.
    ok(!/\bdocument\b|getElementById|querySelector|innerHTML|addEventListener/.test(SPY_CODE), '0: spy-read module touches NO DOM');
    ok(!/_sfsDrawRsPanel|_pfDrawRsPanel|_sfsRsPanelMsg/.test(SPY_CODE), '0: spy-read module calls NO RS panel rendering helper');
    ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest|candles-dxlink|\/market\/candles/.test(SPY_CODE), '0: spy-read module performs NO direct transport');
    ok(/_sfsFetchBackendCandles\s*\(\s*'SPY'/.test(SPY_CODE), '0: spy-read module reads via the _sfsFetchBackendCandles primitive');
    ok(/_sfsWarmupBatch\s*\(\s*\[\s*'SPY'\s*\]/.test(SPY_CODE), '0: spy-read module warms via the _sfsWarmupBatch coordinator (SPY only)');

    // (13) the resolver STATE + the four SFS_SPY_* constants are declared in the SFS
    // config/state module, NOT in the monolith and NOT (re)declared in the extracted module.
    ['_sfsSpyReadInflight', '_sfsSpyReadCooldown', 'SFS_SPY_READ_COOLDOWN_MS', 'SFS_SPY_WARM_COOLDOWN_MS',
      'SFS_SPY_POST_WARM_READ_ATTEMPTS', 'SFS_SPY_POST_WARM_RETRY_DELAY_MS'].forEach((s) => {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
      ok(reDecl.test(CONFIG_STATE_SRC), '0: SPY state/constant declared in sfs-config-state.js: ' + s);
      ok(!reDecl.test(inlineMonolith), '0: SPY state/constant no longer declared in the monolith: ' + s);
      ok(!reDecl.test(SPY_SRC), '0: SPY state/constant NOT (re)declared in sfs-candle-spy-read.js: ' + s);
    });

    // (14) shared helpers are owned by the extracted scan service — not duplicated,
    //      proxied or wrapped here, and no longer declared in the monolith.
    ['_sfsSleep', '_sfsCandlesFromSyncSource'].forEach((n) => {
      const reDef = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(');
      ok(reDef.test(SCAN_SERVICE_SRC), '0: shared helper declared in sfs-scan-service.js: ' + n);
      ok(!reDef.test(inlineMonolith), '0: shared helper no longer declared in the monolith: ' + n);
      ok(SPY_SRC.indexOf('function ' + n + '(') === -1, '0: shared helper NOT (re)declared in sfs-candle-spy-read.js: ' + n);
    });

    // (15) separation from the sibling SFS modules: the SPY resolver is distinct from the
    // generic ensure, the warmup coordinator and the chart hydration, and carries no detail-4H.
    ['_sfsEnsureTfCandles', '_sfsEnsureChartData', '_sfsWarmupBatch', '_sfsWarmupDiag',
      '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue', '_sfsFetchBackendCandles',
      '_sfsCandlesUsable', '_sfsCandleSubLimitActive'].forEach((n) => {
      ok(SPY_SRC.indexOf('function ' + n + '(') === -1, '0: spy-read module does NOT (re)declare: ' + n);
    });
    SPY_READ_FNS.forEach((n) => {
      ok(GEN_SRC.indexOf('function ' + n + '(') === -1, '0: SPY resolver function NOT in sfs-candle-generic-ensure.js: ' + n);
      ok(WARMUP_SRC.indexOf('function ' + n + '(') === -1, '0: SPY resolver function NOT in sfs-candle-warmup.js: ' + n);
      ok(HYD_SRC.indexOf('function ' + n + '(') === -1, '0: SPY resolver function NOT in sfs-candle-chart-hydration.js: ' + n);
    });
    ['_sfsEnsureDetail4hCandles', '_sfsDetail4hBaseResult', '_sfsMapDetail4hReason', '_sfs4hDetailMessage',
      '_sfsStoreDetail4h', '_sfsRender4hDetailState', '_sfsDetail4hInflight', '_sfsDetail4hPhase',
      '_sfsDetail4hResult'].forEach((n) => {
      ok(SPY_CODE.indexOf(n) === -1, '0: no detail-4H symbol in the spy-read module: ' + n);
    });
    ok(new RegExp('(?:async\\s+)?function\\s+_sfsEnsureDetail4hCandles\\s*\\(').test(DETAIL_SRC), '0: the detail-4H orchestrator lives in sfs-candle-detail-4h.js');

    // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
    ok(SPY_SRC.indexOf("'use strict'") === -1 && SPY_SRC.indexOf('"use strict"') === -1, '0: spy-read module has no "use strict" pragma');
    ok(!/\bimport\b/.test(SPY_SRC), '0: spy-read module has no import');
    ok(!/\bexport\b/.test(SPY_SRC), '0: spy-read module has no export');
    ok(SPY_SRC.indexOf('require(') === -1, '0: spy-read module has no require(');
    ok(!/window\.\w+\s*=/.test(SPY_SRC), '0: spy-read module has no window.* export');

    // 0a-EXTRACTION-DETAIL-4H. The SFS detail-chart 4H CORE — _sfsDetail4hBaseResult /
    // _sfsMapDetail4hReason / _sfsStoreDetail4h / _sfsEnsureDetail4hCandles — now lives in
    // js/services/sfs-candle-detail-4h.js, a classic script loaded AFTER sfs-candle-spy-read.js
    // and BEFORE the inline monolith. This is the LAST SFS read orchestrator to leave the
    // monolith, so after this extraction NO SFS read orchestrator remains inline.
    //
    // What this extraction deliberately did NOT take, and where each of those has since
    // come to rest:
    //   • the detail UI (_sfs4hDetailMessage / _sfsRender4hDetailState) — relocated again,
    //     VERBATIM, to js/ui/sfs-panel.js in SFS PR 3. The extracted orchestrator still
    //     calls _sfsRender4hDetailState GLOBALLY, once, immediately after the
    //     phase → 'warming' write, with no wrapper, callback, emitter or injected renderer;
    //     that call is resolved at CALL time and is unaffected by which script declares it;
    //   • the phase/result/in-flight state (_sfsDetail4hPhase / _sfsDetail4hResult /
    //     _sfsDetail4hInflight) and the two SFS_DETAIL_4H_POST_WARM_* constants, now in
    //     js/services/sfs-config-state.js;
    //   • the SHARED cooldown/last-fail maps (_sfsWarmupCooldown / _sfsLastFailReason) and
    //     SFS_WARMUP_COOLDOWN_MS, which remain shared with the extracted generic ensure — they
    //     were NOT duplicated, split or turned into detail-private maps;
    //   • the shared _sfsSleep / _sfsCandlesFromSyncSource helpers.
    {
      const DETAIL_CODE = stripComments(DETAIL_SRC);
      const DETAIL_TAG = './js/services/sfs-candle-detail-4h.js';
      const detailTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-detail-4h\.js["'][^>]*>/gi) || [];
      const detEntry = ordered.filter((s) => s.kind === 'local' && s.src === DETAIL_TAG)[0];
      const detSpyEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/sfs-candle-spy-read.js')[0];
      const detFirstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];

      // (1) module file exists and is one of the extracted scripts index.html loads.
      ok(fs.existsSync(DETAIL_PATH), '0: js/services/sfs-candle-detail-4h.js exists');
      ok(scriptTags.indexOf(DETAIL_TAG) !== -1, '0: loader parses sfs-candle-detail-4h.js as a local script');
      // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
      ok(detailTags.length === 1, '0: exactly one sfs-candle-detail-4h.js <script> tag in index.html');
      ok(detailTags.length === 1 && !/\btype\s*=/.test(detailTags[0]), '0: sfs-candle-detail-4h.js tag is classic (no type= attribute)');
      ok(detailTags.length === 1 && !/\basync\b/.test(detailTags[0]) && !/\bdefer\b/.test(detailTags[0]), '0: sfs-candle-detail-4h.js tag has no async/defer');
      // (5)(6) load order: AFTER sfs-candle-spy-read.js, BEFORE the inline monolith.
      ok(!!detEntry && !!detSpyEntry && detSpyEntry.order < detEntry.order, '0: sfs-candle-detail-4h.js loads AFTER sfs-candle-spy-read.js');
      ok(!!detEntry && !!detFirstInline && detEntry.order < detFirstInline.order, '0: sfs-candle-detail-4h.js loads BEFORE the inline monolith');
      // (7)(8)(9) the four core functions: in the module, gone from the monolith, one definition overall.
      SFS_DETAIL_4H_CORE.forEach((n) => {
        const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
        ok((DETAIL_CODE.match(reAll) || []).length === 1, '0: ' + n + ' defined in sfs-candle-detail-4h.js');
        ok((inlineMonolith.match(reAll) || []).length === 0, '0: ' + n + ' NOT defined in the residual inline monolith');
        ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n);
      });
      // (10)(11) the module contains ONLY the four declarations + comments — no top-level code.
      let detResidual = DETAIL_CODE;
      SFS_DETAIL_4H_CORE.forEach((n) => { detResidual = detResidual.replace(stripComments(extractFn(DETAIL_SRC, n)), ''); });
      ok(detResidual.trim() === '', '0: detail-4h module contains ONLY the four declarations + comments (no top-level executable code)');
      ok((DETAIL_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 4, '0: detail-4h module has exactly four named function declarations');
      ok(!/\b(?:var|let|const)\s+\w/.test(detResidual), '0: detail-4h module declares no top-level state/constants');
      ok(!/\bnew\s+Promise\b|\bset(?:Timeout|Interval)\s*\(/.test(detResidual), '0: detail-4h module creates no top-level Promise/timer');
      // (12) the detail UI is owned by js/ui/sfs-panel.js (SFS PR 3) — this module did not
      //      grow a detail UI of its own, and the monolith no longer declares one either.
      {
        const PANEL_CODE = stripComments(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'ui', 'sfs-panel.js'), 'utf8'));
        ['_sfs4hDetailMessage', '_sfsRender4hDetailState'].forEach((n) => {
          const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
          ok((PANEL_CODE.match(reAll) || []).length === 1, '0: detail-4H UI is declared in js/ui/sfs-panel.js: ' + n);
          ok((inlineMonolith.match(reAll) || []).length === 0, '0: detail-4H UI is NO LONGER declared in the monolith: ' + n);
          ok((HTML.match(reAll) || []).length === 1, '0: exactly one overall definition of ' + n);
          ok(DETAIL_CODE.indexOf('function ' + n + '(') === -1, '0: detail-4H UI NOT (re)declared in sfs-candle-detail-4h.js: ' + n);
        });
      }
      // (13) NO DOM of its own: the module renders through the monolith's global renderer only.
      ok(!/\bdocument\b|getElementById|querySelector|innerHTML|addEventListener/.test(DETAIL_CODE), '0: detail-4h module touches NO DOM');
      ok(/_sfsRender4hDetailState\s*\(/.test(DETAIL_CODE), '0: detail-4h module calls the GLOBAL renderer (no injected dependency)');
      // (14) no DIRECT transport: reads via _sfsFetchBackendCandles, warms via _sfsWarmupBatch.
      ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest|candles-dxlink|\/market\/candles/.test(DETAIL_CODE), '0: detail-4h module performs NO direct transport');
      ok(/_sfsFetchBackendCandles\s*\(/.test(DETAIL_CODE), '0: detail-4h module reads via the _sfsFetchBackendCandles primitive');
      ok(/_sfsWarmupBatch\s*\(\s*\[\s*symbol\s*\]\s*,\s*\[\s*'30M'\s*\]/.test(DETAIL_CODE), '0: detail-4h module warms a single symbol, 30M only');
      // (15) detail state + constants are declared in the SFS config/state module.
      ['_sfsDetail4hInflight', '_sfsDetail4hPhase', '_sfsDetail4hResult',
        'SFS_DETAIL_4H_POST_WARM_ATTEMPTS', 'SFS_DETAIL_4H_POST_WARM_DELAY_MS'].forEach((s) => {
        const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
        ok(reDecl.test(CONFIG_STATE_SRC), '0: detail state/constant declared in sfs-config-state.js: ' + s);
        ok(!reDecl.test(inlineMonolith), '0: detail state/constant no longer declared in the monolith: ' + s);
        ok(!reDecl.test(DETAIL_SRC), '0: detail state/constant NOT (re)declared in sfs-candle-detail-4h.js: ' + s);
      });
      // (16) the SHARED cooldown / last-fail state + constant stay in the monolith and stay
      //      SHARED with the extracted generic ensure — not duplicated into a detail-private map.
      ['_sfsWarmupCooldown', '_sfsLastFailReason', 'SFS_WARMUP_COOLDOWN_MS'].forEach((s) => {
        const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
        ok(reDecl.test(CONFIG_STATE_SRC), '0: shared cooldown state declared in sfs-config-state.js: ' + s);
        ok(!reDecl.test(inlineMonolith), '0: shared cooldown state no longer declared in the monolith: ' + s);
        ok(!reDecl.test(DETAIL_SRC), '0: shared cooldown state NOT (re)declared in sfs-candle-detail-4h.js: ' + s);
        ok(GEN_SRC.indexOf(s) >= 0 && DETAIL_CODE.indexOf(s) >= 0, '0: shared cooldown state used by BOTH the generic ensure and the detail core: ' + s);
      });
      // (17) shared helpers are owned by the extracted scan service — not duplicated,
      //      proxied or wrapped here, and no longer declared in the monolith.
      ['_sfsSleep', '_sfsCandlesFromSyncSource'].forEach((n) => {
        const reDef = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(');
        ok(reDef.test(SCAN_SERVICE_SRC), '0: shared helper declared in sfs-scan-service.js: ' + n);
        ok(!reDef.test(inlineMonolith), '0: shared helper no longer declared in the monolith: ' + n);
        ok(DETAIL_CODE.indexOf('function ' + n + '(') === -1, '0: shared helper NOT (re)declared in sfs-candle-detail-4h.js: ' + n);
      });
      // (18) separation from the sibling extracted SFS modules — nothing duplicated either way.
      ['_sfsEnsureTfCandles', '_sfsEnsureChartData', '_sfsSpyReadOnly', '_sfsWarmupBatch',
        '_sfsWarmupDiag', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue',
        '_sfsFetchBackendCandles', '_sfsCandlesUsable', '_sfsCandleSubLimitActive'].forEach((n) => {
        ok(DETAIL_CODE.indexOf('function ' + n + '(') === -1, '0: detail-4h module does NOT (re)declare: ' + n);
      });
      SFS_DETAIL_4H_CORE.forEach((n) => {
        ok(GEN_SRC.indexOf('function ' + n + '(') === -1, '0: detail core function NOT in sfs-candle-generic-ensure.js: ' + n);
        ok(WARMUP_SRC.indexOf('function ' + n + '(') === -1, '0: detail core function NOT in sfs-candle-warmup.js: ' + n);
        ok(HYD_SRC.indexOf('function ' + n + '(') === -1, '0: detail core function NOT in sfs-candle-chart-hydration.js: ' + n);
        ok(SPY_SRC.indexOf('function ' + n + '(') === -1, '0: detail core function NOT in sfs-candle-spy-read.js: ' + n);
      });
      // (19)(20) no detail UI / helper / aggregate module was created by this extraction.
      ['sfs-candle-detail-4h-ui.js', 'sfs-candle-detail-4h-helpers.js', 'sfs-candle-orchestrator.js',
        'candle-state.js', 'candle-service.js'].forEach((f) => {
        ok(fs.existsSync(path.resolve(__dirname, '..', 'js', 'services', f)) === false, '0: js/services/' + f + ' does NOT exist');
      });
      ok(fs.existsSync(path.resolve(__dirname, '..', 'js', 'ui', 'sfs-detail-4h-ui.js')) === false, '0: js/ui/sfs-detail-4h-ui.js does NOT exist');
      // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
      ok(DETAIL_SRC.indexOf("'use strict'") === -1 && DETAIL_SRC.indexOf('"use strict"') === -1, '0: detail-4h module has no "use strict" pragma');
      ok(!/\bimport\b/.test(DETAIL_SRC), '0: detail-4h module has no import');
      ok(!/\bexport\b/.test(DETAIL_SRC), '0: detail-4h module has no export');
      ok(DETAIL_SRC.indexOf('require(') === -1, '0: detail-4h module has no require(');
      ok(!/window\.\w+\s*=/.test(DETAIL_SRC), '0: detail-4h module has no window.* export');
    }

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
      // Candle provenance — now extracted to js/services/candle-provenance.js
      // (its state _candleProvenanceStats / _candleProvenanceLog and the
      // _CANDLE_PROVENANCE_MAX / _CANDLE_USABLE_MIN constants stay declared in the monolith).
      CANDLE_PROVENANCE: [
        '_classifyBackendCandleProvenance', '_extractBackend4hDiag',
        '_recordCandleProvenance', '_recordBackendCandleProvenance',
      ],
      // Low-level candle-store client — now extracted to js/services/candle-store-client.js
      // (the three scanner session-cache helpers + the GET /market/candles read and POST
      // /market/candles/ensure transport primitives). The cache STATE
      // _scannerChartCandleSessionCache and the _SCANNER_CHART_CANDLE_CACHE_TTL_MS constant
      // stay declared in the monolith; only the FUNCTIONS moved.
      CANDLE_STORE_CLIENT: [
        '_scannerChartCandleCacheKey', '_scannerGetCachedBackendTfCandles',
        '_scannerPutCachedBackendTfCandles', '_scannerReadBackendCandlesTf',
        '_scannerEnsureBackendCandles',
      ],
      // Low-level DXLink candle read primitive — GET /dev/market/candles-dxlink/:sym
      // ?timeframe= — now extracted to js/services/candle-dxlink-client.js. It owns no
      // application state; the SFS in-flight / cooldown / queue / warmup state and every
      // orchestrator that dedupes around it stay in the monolith (SFS_ORCHESTRATION below).
      CANDLE_DXLINK_CLIENT: ['_sfsFetchBackendCandles'],
      // Read-only SFS candle predicates / normalizers — now extracted to
      // js/services/sfs-candle-predicates.js (asserted in 0a-EXTRACTION-PREDICATES).
      // Pure normalizers + the usability predicate + the read-only subscription-limit
      // classifier (reads S.dxlinkStatus, mutates nothing). No state or constants moved.
      SFS_CANDLE_PREDICATES: [
        '_sfsNormSymbolList', '_sfsNormTimeframes',
        '_sfsCandlesUsable', '_sfsCandleSubLimitActive',
      ],
      // SFS detail-chart 4H CORE — now extracted to js/services/sfs-candle-detail-4h.js
      // (asserted in 0a-EXTRACTION-DETAIL-4H above). The four FUNCTIONS moved VERBATIM; this
      // was the LAST SFS read orchestrator in the monolith, so no SFS read orchestrator remains
      // inline. What stays declared in the monolith: the detail UI (_sfs4hDetailMessage /
      // _sfsRender4hDetailState — the extracted orchestrator still calls the renderer GLOBALLY),
      // the phase/result/in-flight state (_sfsDetail4hPhase / _sfsDetail4hResult /
      // _sfsDetail4hInflight), the two SFS_DETAIL_4H_POST_WARM_* constants, and the cooldown /
      // last-fail maps + SFS_WARMUP_COOLDOWN_MS which remain SHARED with the generic ensure.
      SFS_DETAIL_4H_CORE: SFS_DETAIL_4H_CORE,
      // Detail-4H UI — relocated VERBATIM to js/ui/sfs-panel.js by SFS PR 3, and asserted
      // two-sided in 0c-UI-PANEL below. The console diagnostics helper
      // apexDebugSfsDetailChart used to sit here too; it is non-DOM, so PR 2 relocated its
      // DECLARATION to js/services/sfs-scan-service.js. It is asserted separately in
      // 0c-SCAN-SERVICE below, two-sided. The window EXPOSURE statement that publishes it
      // stays inline and is unaffected by either relocation.
      SFS_DETAIL_4H_UI_PANEL: [
        '_sfs4hDetailMessage', '_sfsRender4hDetailState',
      ],
      // SFS scan service — relocated VERBATIM to js/services/sfs-scan-service.js by PR 2.
      SFS_SCAN_SERVICE: [
        'apexDebugSfsDetailChart', '_sfsCandlesFromSyncSource', '_sfsSleep',
        '_sfsAnalyzeSymbolTimeframe', '_sfsRunScan', '_sfsCancelScan',
        '_sfsGetFilteredResults', '_sfsSortResults', '_sfsResolveRenderPrice',
      ],
      // SFS SPY read-only benchmark resolver — now extracted to
      // js/services/sfs-candle-spy-read.js (asserted in 0a-EXTRACTION-SPY-READ above). The four
      // FUNCTIONS moved VERBATIM; the resolver state (_sfsSpyReadInflight / _sfsSpyReadCooldown —
      // the latter deliberately holding BOTH '<tf>' read-cooldown and 'SPY|<tf>' warm-cooldown
      // keys), the four SFS_SPY_* constants and the shared _sfsSleep / _sfsCandlesFromSyncSource
      // helpers stay declared in the monolith.
      SFS_SPY_READ: [
        '_sfsSpyDiag', '_sfsPromoteSpyCandles',
        '_sfsSpyReadResultContext', '_sfsSpyReadOnly',
      ],
      // SFS self-sufficient 1D chart hydration — now extracted to
      // js/services/sfs-candle-chart-hydration.js (asserted in 0a-EXTRACTION-CHART-HYDRATION
      // above). The FUNCTION moved VERBATIM; it owns no state and delegates ONLY to
      // _sfsEnsureTfCandles (a single 1D ensure) — the in-flight / cooldown / last-failure state
      // stays declared in the monolith.
      SFS_CHART_HYDRATION: [
        '_sfsEnsureChartData',
      ],
      // SFS generic-timeframe candle ensure — now extracted to
      // js/services/sfs-candle-generic-ensure.js (asserted in 0a-EXTRACTION-GENERIC-ENSURE
      // above). The FUNCTION moved VERBATIM; the in-flight / cooldown / last-failure state
      // (_sfsTfFetchInflight / _sfsWarmupCooldown / _sfsLastFailReason) and the
      // SFS_WARMUP_COOLDOWN_MS constant stay declared in the monolith.
      SFS_GENERIC_ENSURE: [
        '_sfsEnsureTfCandles',
      ],
      // SFS warmup coordinator — now extracted to js/services/sfs-candle-warmup.js
      // (asserted in 0a-EXTRACTION-WARMUP above). The batch/queue/drain/diag cycle moved
      // VERBATIM; the warmup STATE (_sfsWarmupLastSentAt / _sfsWarmupQueue / _sfsWarmupQueuedKeys /
      // _sfsWarmupDrainTimer) and the SFS_WARMUP_BATCH_CAP / SFS_WARMUP_DEBOUNCE_MS constants
      // stay declared in the monolith.
      SFS_CANDLE_WARMUP: [
        '_sfsWarmupDiag', '_sfsWarmupBatch',
        '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue',
      ],
      // Per-feature read-first adapters + orchestrators (endpoint family + source label
      // differ per surface). These STAY in the monolith — the low-level candle-store
      // primitives they call (_scannerReadBackendCandlesTf / _scannerEnsureBackendCandles)
      // are now in the CANDLE_STORE_CLIENT group above.
      FEATURE_ADAPTER: [
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
    // monolith and did NOT leak into the extracted normalization module. CANDLE_AUTH_GATE,
    // CANDLE_PROVENANCE and CANDLE_STORE_CLIENT are excluded here because they have now
    // been extracted to candle-auth-gate.js / candle-provenance.js / candle-store-client.js
    // (asserted in 0a-EXTRACTION-GATE, 0a-EXTRACTION-PROVENANCE and 0a-EXTRACTION-STORE
    // above); this loop guards that the per-feature read-first adapters and the legacy
    // public read stay in the monolith. SFS_DETAIL_4H_CORE is excluded here because it has
    // now been extracted to sfs-candle-detail-4h.js (asserted in 0a-EXTRACTION-DETAIL-4H
    // above), and SFS_DETAIL_4H_UI_PANEL because SFS PR 3 relocated it to
    // js/ui/sfs-panel.js — it is asserted two-sided in 0c-UI-PANEL below instead, which is
    // strictly stronger than the single-sided membership of this loop.
    ['FEATURE_ADAPTER', 'LEGACY_PUBLIC_READ'].forEach((cat) => {
      manifest[cat].forEach((name) => {
        const reDef = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
        ok(reDef.test(inlineMonolith), '0: [' + cat + '] stays defined in the residual inline monolith: ' + name);
        ok(MODULE_SRC.indexOf(name) === -1, '0: [' + cat + '] NOT present in candle-normalization.js: ' + name);
      });
    });
    // 0c-SCAN-SERVICE. The nine SFS scan-service declarations were relocated verbatim by
    // PR 2. Two-sided: each is declared in the scan-service module AND no longer declared
    // in the residual inline monolith, so a re-introduction inline fails here by name.
    manifest.SFS_SCAN_SERVICE.forEach((name) => {
      const reDef = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
      ok(reDef.test(SCAN_SERVICE_SRC), '0: [SFS_SCAN_SERVICE] declared in sfs-scan-service.js: ' + name);
      ok(!reDef.test(inlineMonolith), '0: [SFS_SCAN_SERVICE] no longer declared in the residual inline monolith: ' + name);
      ok(MODULE_SRC.indexOf(name) === -1, '0: [SFS_SCAN_SERVICE] NOT present in candle-normalization.js: ' + name);
    });
    // 0c-UI-PANEL. The detail-4H UI pair was relocated verbatim by SFS PR 3. Two-sided,
    // for the same reason: declared in the panel module AND no longer declared in the
    // residual inline monolith, so a re-introduction inline fails here by name. It must
    // also not have been cross-filed into the detail-4H core or scan-service modules.
    manifest.SFS_DETAIL_4H_UI_PANEL.forEach((name) => {
      const reDef = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
      ok(reDef.test(UI_PANEL_SRC), '0: [SFS_UI_PANEL] declared in js/ui/sfs-panel.js: ' + name);
      ok(!reDef.test(inlineMonolith), '0: [SFS_UI_PANEL] no longer declared in the residual inline monolith: ' + name);
      ok(!reDef.test(DETAIL_SRC), '0: [SFS_UI_PANEL] NOT cross-filed into sfs-candle-detail-4h.js: ' + name);
      ok(!reDef.test(SCAN_SERVICE_SRC), '0: [SFS_UI_PANEL] NOT cross-filed into sfs-scan-service.js: ' + name);
      ok(MODULE_SRC.indexOf(name) === -1, '0: [SFS_UI_PANEL] NOT present in candle-normalization.js: ' + name);
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
      // Generic loader + usable predicate, then the whole real 4H-detail block. The four
      // detail-4H CORE functions were extracted VERBATIM to js/services/sfs-candle-detail-4h.js
      // and the detail STATE + the two SFS_DETAIL_4H_POST_WARM_* constants to
      // js/services/sfs-config-state.js, and SFS PR 3 then relocated the detail UI pair to
      // js/ui/sfs-panel.js — so no physical monolith slice can carry the detail block any
      // more. The state slice is anchored on the first and last declaration of the detail
      // group, so it stays correct wherever that group lives; every FUNCTION is pulled BY
      // NAME from the reconstructed source, which is what makes this harness immune to the
      // next relocation. Same real shipping code either way.
      const detailBlock = [
        HTML.slice(HTML.indexOf('var _sfsDetail4hInflight'),
          HTML.indexOf('\n', HTML.indexOf('var SFS_DETAIL_4H_POST_WARM_DELAY_MS')) + 1),
      ].concat(['_sfs4hDetailMessage', '_sfsRender4hDetailState'].map((n) => extractFn(HTML, n)))
       .concat(SFS_DETAIL_4H_CORE.map((n) => extractFn(HTML, n))).join('\n');
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
