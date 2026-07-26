'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SFS DETAIL 4H — BOUNDARY CONTRACT (audit only, zero behaviour change).
//
// WHY THIS FILE EXISTS
//   _sfsEnsureDetail4hCandles is the LAST SFS candle orchestrator still living in
//   the inline monolith. Everything around it (predicates, warmup coordinator,
//   generic ensure, chart hydration, SPY read-only resolver, the low-level DXLink
//   read) has already been extracted into js/services/*. Before deciding whether
//   the detail-4H block can move — and if so, as ONE module or as a core/UI pair —
//   the exact CURRENT boundary has to be pinned with dynamic evidence:
//
//     • which functions are pure, which read global state, which touch the DOM;
//     • which state maps are owned by the orchestrator and which are SHARED with
//       the already-extracted generic ensure (cooldown / last-fail-reason);
//     • whether the orchestrator itself renders (it does — one call, at the
//       'warming' transition) or whether rendering is caller-only (it is not);
//     • the exact result shape, source enum, reason enum and UI copy;
//     • the exact read/warmup/sleep/reread ordering, attempt count and delays;
//     • where the stale-symbol guard lives (orchestrator, NOT the cache writer);
//     • which failure paths write the cooldown and which deliberately do not.
//
//   This test PROTECTS the present behaviour, including every asymmetry. It does
//   not fix, normalize or unify anything. If a future extraction changes any of
//   the pinned facts, this file fails.
//
// METHOD
//   The real application source is reconstructed through tests/lib/load-app-source
//   (inline monolith + external local <script> files, in document order). The real
//   function declarations and the real `var` declarations for state/constants are
//   extracted verbatim and executed in a `vm` sandbox with recording stubs for the
//   DOM, the clock, the backend read, the warmup POST and the sleep. No
//   implementation is copied, no network is touched, no long real timer is used,
//   and no npm dependency is added.
//
// Run: node tests/sfs-detail-4h-boundary-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const loader = require('./lib/load-app-source');
const APP = loader.loadAppJavaScriptSource();

const ROOT = path.resolve(__dirname, '..');
// The inline monolith script, isolated from the already-extracted external files —
// this is what "still lives in index.html" means for the manifest below.
const SCRIPTS = loader.loadOrderedScriptSources();
const MONOLITH = SCRIPTS.filter((s) => s.kind === 'inline' && s.isAppJs).map((s) => s.code).join('\n');

// ── Tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; failures.push(msg); console.log('  FAIL  ' + msg); }
}
function eq(actual, expected, msg) {
  const good = Object.is(actual, expected);
  ok(good, msg + (good ? '' : '  [expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ']'));
}
function section(t) { console.log('\n' + t); }

// ── Source extraction (brace matcher, string/comment aware) ──────────────────
function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const sig of sigs) { const k = src.indexOf(sig); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
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
// String/template/regex-aware comment stripper. A naive regex stripper is NOT safe
// on a 2.3 MB source: `//` inside a URL string literal and `/*` inside a string or
// regex would swallow hundreds of KB of real code and silently zero out the call-site
// census below. This walks the source instead, so only genuine comments are removed.
function stripComments(src) {
  let out = '', i = 0, prev = '';
  const n = src.length;
  const REGEX_OK = /[(,=:[!&|?{};+\-*%~^<>]$/;
  const KW = /\b(return|typeof|case|in|of|new|delete|void|throw|do|else|instanceof|yield|await)$/;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += c; i++;
      while (i < n) {
        const e = src[i]; out += e; i++;
        if (e === '\\') { if (i < n) { out += src[i]; i++; } continue; }
        if (e === q) break;
      }
      prev = q; continue;
    }
    if (c === '/' && (prev === '' || REGEX_OK.test(prev) || KW.test(prev))) {
      out += c; i++;
      let inClass = false;
      while (i < n) {
        const e = src[i]; out += e; i++;
        if (e === '\\') { if (i < n) { out += src[i]; i++; } continue; }
        if (e === '[') inClass = true;
        else if (e === ']') inClass = false;
        else if (e === '/' && !inClass) break;
        else if (e === '\n') break;
      }
      prev = '/'; continue;
    }
    out += c;
    if (!/\s/.test(c)) prev = (prev + c).slice(-12);
    i++;
  }
  return out;
}
// Self-check: the stripper must never lose real code.
(function assertStripperSane() {
  const s = stripComments(APP);
  for (const f of ['_sfsDetail4hBaseResult', '_sfsMapDetail4hReason', '_sfs4hDetailMessage',
                   '_sfsRender4hDetailState', '_sfsStoreDetail4h', '_sfsEnsureDetail4hCandles']) {
    if (s.indexOf(f) < 0) throw new Error('comment stripper destroyed real code near ' + f);
  }
})();
// Real top-level `var NAME = <literal>;` declaration line, verbatim.
function extractVarDecl(src, name) {
  const re = new RegExp('^var\\s+' + name + '\\s*=[^;\\n]*;', 'm');
  const m = src.match(re);
  if (!m) throw new Error('var declaration not found: ' + name);
  return m[0];
}
function fnIndex(src, name) {
  const a = src.indexOf('async function ' + name + '(');
  const b = src.indexOf('function ' + name + '(');
  return a >= 0 ? a : b;
}

// ═════════════════════════════════════════════════════════════════════════════
// STRUCTURAL MANIFEST — what belongs to the detail-4H boundary today
//
// OWNERSHIP AFTER THE CORE EXTRACTION (Option B of this audit)
//   The FOUR core declarations moved VERBATIM to js/services/sfs-candle-detail-4h.js;
//   the UI pair, the phase/result/in-flight state, the two detail constants and every
//   shared helper/state stayed in the inline monolith. Only the physical location of
//   four function declarations changed — every behavioural section below is unchanged
//   and still pins the same bytes, the same reasons, the same delays and all twelve
//   documented asymmetries.
//
//     DETAIL_4H_CORE_MODULE     → js/services/sfs-candle-detail-4h.js
//     DETAIL_4H_UI_MONOLITH     → index.html (inline monolith)
//     DETAIL_4H_STATE_MONOLITH  → index.html (inline monolith)
//     DETAIL_4H_CONSTANTS_MONOLITH → index.html (inline monolith)
//     SHARED_MONOLITH           → index.html, shared with the extracted generic ensure
// ═════════════════════════════════════════════════════════════════════════════
const DETAIL_4H_RESULT_HELPERS = ['_sfsDetail4hBaseResult', '_sfsMapDetail4hReason'];
const DETAIL_4H_CACHE_HELPER   = ['_sfsStoreDetail4h'];
const DETAIL_4H_UI             = ['_sfs4hDetailMessage', '_sfsRender4hDetailState'];
const DETAIL_4H_ORCHESTRATOR   = ['_sfsEnsureDetail4hCandles'];
const DETAIL_4H_STATE          = ['_sfsDetail4hInflight', '_sfsDetail4hPhase', '_sfsDetail4hResult'];
const DETAIL_4H_CONSTANTS      = ['SFS_DETAIL_4H_POST_WARM_ATTEMPTS', 'SFS_DETAIL_4H_POST_WARM_DELAY_MS'];
// The four CORE declarations now owned by the extracted module, in their original
// relative source order (base result → reason mapper → cache writer → orchestrator).
const DETAIL_4H_CORE_MODULE    = []
  .concat(DETAIL_4H_RESULT_HELPERS, DETAIL_4H_CACHE_HELPER, DETAIL_4H_ORCHESTRATOR);
const DETAIL_4H_MODULE_REL     = 'js/services/sfs-candle-detail-4h.js';
const DETAIL_4H_MODULE_TAG     = './js/services/sfs-candle-detail-4h.js';
// Helpers/state the detail flow uses but does NOT own — already shared with other
// flows (SPY read-only resolver, generic ensure, RS panel).
const SHARED_HELPERS           = ['_sfsCandlesFromSyncSource', '_sfsSleep'];
const SHARED_STATE             = ['_sfsWarmupCooldown', '_sfsLastFailReason'];
const SHARED_CONSTANTS         = ['SFS_WARMUP_COOLDOWN_MS'];
// Callers of detail-4H symbols that live OUTSIDE the detail block.
const EXTERNAL_CALLERS         = ['_sfsOpenChart', '_sfsDrawOneTf', 'apexDebugSfsDetailChart'];
// Already extracted — must stay free of every detail-4H symbol.
const EXCLUDED = [
  'js/services/sfs-candle-predicates.js',
  'js/services/sfs-candle-warmup.js',
  'js/services/sfs-candle-generic-ensure.js',
  'js/services/sfs-candle-chart-hydration.js',
  'js/services/sfs-candle-spy-read.js',
  'js/services/candle-dxlink-client.js',
];
// Functions owned by the sibling extracted modules — the detail-4H core module must
// not duplicate, proxy or re-declare any of them.
const SIBLING_OWNED = [
  '_sfsSpyDiag', '_sfsPromoteSpyCandles', '_sfsSpyReadResultContext', '_sfsSpyReadOnly',
  '_sfsEnsureTfCandles', '_sfsEnsureChartData',
  '_sfsWarmupDiag', '_sfsWarmupBatch', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue',
  '_sfsCandlesUsable', '_sfsCandleSubLimitActive', '_sfsFetchBackendCandles',
];
const DETAIL_SYMBOLS = []
  .concat(DETAIL_4H_RESULT_HELPERS, DETAIL_4H_CACHE_HELPER, DETAIL_4H_UI,
          DETAIL_4H_ORCHESTRATOR, DETAIL_4H_STATE, DETAIL_4H_CONSTANTS);

// ═════════════════════════════════════════════════════════════════════════════
// SANDBOX — real functions + real state/constant declarations, stubbed edges
// ═════════════════════════════════════════════════════════════════════════════
const els = {};                 // id → fake element (created lazily)
const missingEls = new Set();   // ids that getElementById must report as absent
const readCalls = [];           // every _sfsFetchBackendCandles(symbol, tf)
const readQueue = [];           // queued read results / thrown errors (FIFO)
const warmupCalls = [];         // every _sfsWarmupBatch(symbols, timeframes, opts)
const sleepCalls = [];          // every _sfsSleep(ms)
const logCalls = [];            // debugLog / debugWarn

function fakeEl() {
  return {
    innerHTML: '', textContent: '', style: {},
    __canvas: false,
    querySelector(sel) { return (this.__canvas && sel === 'canvas') ? { tagName: 'CANVAS' } : null; },
  };
}
function el(id) {
  if (missingEls.has(id)) return null;
  return els[id] || (els[id] = fakeEl());
}

// >= 22 bars ending on a finite close (the _sfsCandlesUsable minimum).
function series(n) {
  n = n == null ? 25 : n;
  const arr = [];
  for (let i = 0; i < n; i++) arr.push({ time: i + 1, open: 10 + i, high: 12 + i, low: 9 + i, close: 11 + i, volume: 100 });
  return arr;
}
function seriesBadClose(n) { const a = series(n); a[a.length - 1].close = null; return a; }

const sandbox = {
  console, JSON, Object, Math, String, Number, Array, isFinite, parseFloat, Promise, RegExp, Error,
  __now: 1000000,
  Date: { now: () => sandbox.__now },
  setTimeout: (fn, ms) => { sandbox.__setTimeoutMs.push(ms); fn(); return 1; },
  __setTimeoutMs: [],
  window: {},
  document: { getElementById: (id) => el(id) },
  S: { squeezeFireScanner: { chartSymbol: 'CAT', chartCacheCandles: {} }, dxlinkStatus: null },
  debugLog: (ns, m) => logCalls.push(['log', ns, m]),
  debugWarn: (ns, m) => logCalls.push(['warn', ns, m]),

  // ── controllable edges ────────────────────────────────────────────────────
  __sync: null,             // value returned by the _sfsCandlesFromSyncSource stub
  __syncThrows: false,
  __subLimit: false,
  __onSleep: null,          // hook fired inside the sleep stub (symbol flips, …)
  __onRead: null,           // hook fired inside the read stub
  __warmupImpl: null,       // override for the warmup stub
  __rsGetDailyCandles: null,
  __getFourHourCandles: null,

  _sfsCandlesFromSyncSource: (sym, tf) => {
    if (sandbox.__syncThrows) throw new Error('sync boom');
    return sandbox.__sync;
  },
  _sfsCandleSubLimitActive: () => sandbox.__subLimit,
  _sfsSleep: (ms) => { sleepCalls.push(ms); if (sandbox.__onSleep) sandbox.__onSleep(sleepCalls.length); return Promise.resolve(); },
  _sfsFetchBackendCandles: (sym, tf) => {
    readCalls.push(sym + '|' + tf);
    if (sandbox.__onRead) sandbox.__onRead(readCalls.length);
    const next = readQueue.length ? readQueue.shift() : { ok: true, status: 200, count: 0, candles: [], reason: 'empty' };
    if (next && next.__throw) return Promise.reject(next.__throw);
    if (next && next.__syncThrow) throw next.__syncThrow;
    return Promise.resolve(next);
  },
  _sfsWarmupBatch: (syms, tfs, opts) => {
    warmupCalls.push({ syms: syms || [], tfs: tfs || [], opts: opts || {} });
    if (sandbox.__warmupImpl) return sandbox.__warmupImpl(syms, tfs, opts);
    return Promise.resolve({ ok: true, status: 200, sentSymbols: syms });
  },
};
vm.createContext(sandbox);

// Load the REAL declarations: shared predicate + shared sync source + shared sleep
// + the detail-4H state/constants + the six detail-4H functions. Everything is
// extracted verbatim from the reconstructed application source.
const REAL_SOURCE_PIECES = [
  extractFn(APP, '_sfsCandlesUsable'),
  extractFn(APP, '_sfsCandlesFromSyncSource'),   // shadows the stub below on purpose (re-bound per test)
  DETAIL_4H_STATE.map((n) => extractVarDecl(APP, n)).join('\n'),
  SHARED_STATE.map((n) => extractVarDecl(APP, n)).join('\n'),
  SHARED_CONSTANTS.concat(DETAIL_4H_CONSTANTS).map((n) => extractVarDecl(APP, n)).join('\n'),
  extractFn(APP, '_sfsDetail4hBaseResult'),
  extractFn(APP, '_sfsMapDetail4hReason'),
  extractFn(APP, '_sfs4hDetailMessage'),
  extractFn(APP, '_sfsRender4hDetailState'),
  extractFn(APP, '_sfsStoreDetail4h'),
  extractFn(APP, '_sfsEnsureDetail4hCandles'),
];
vm.runInContext(REAL_SOURCE_PIECES.join('\n\n'), sandbox);

// The REAL _sfsCandlesFromSyncSource is kept aside for its own contract section;
// the orchestrator sections drive the controllable stub instead.
const realCandlesFromSyncSource = sandbox._sfsCandlesFromSyncSource;
sandbox._sfsCandlesFromSyncSource = (sym, tf) => {
  if (sandbox.__syncThrows) throw new Error('sync boom');
  return sandbox.__sync;
};
// Real _sfsSleep kept aside too (driven with the instrumented setTimeout).
const realSleepSrc = extractFn(APP, '_sfsSleep');
vm.runInContext('var __realSleep = (' + realSleepSrc.replace(/^function\s+_sfsSleep/, 'function') + ');', sandbox);

function reset() {
  readCalls.length = 0; readQueue.length = 0; warmupCalls.length = 0;
  sleepCalls.length = 0; logCalls.length = 0;
  sandbox.__setTimeoutMs.length = 0;
  for (const k of Object.keys(els)) delete els[k];
  missingEls.clear();
  sandbox.__now = 1000000;
  sandbox.__sync = null; sandbox.__syncThrows = false; sandbox.__subLimit = false;
  sandbox.__onSleep = null; sandbox.__onRead = null; sandbox.__warmupImpl = null;
  sandbox.S.squeezeFireScanner = { chartSymbol: 'CAT', chartCacheCandles: {} };
  sandbox.S.dxlinkStatus = null;
  vm.runInContext(
    '_sfsDetail4hInflight = {}; _sfsDetail4hPhase = {}; _sfsDetail4hResult = {};' +
    '_sfsWarmupCooldown = {}; _sfsLastFailReason = {};', sandbox);
}
const state = (n) => vm.runInContext(n, sandbox);

// Read result fixtures matching the REAL _sfsFetchBackendCandles return shape.
const READ = {
  usable: (n) => ({ ok: true, status: 200, count: (n == null ? 25 : n), candles: series(n), reason: null }),
  empty: () => ({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' }),
  short: (n) => ({ ok: true, status: 200, count: n, candles: series(n), reason: null }),
  invalidClose: () => ({ ok: true, status: 200, count: 25, candles: seriesBadClose(25), reason: null }),
  bodyReason: (r) => ({ ok: true, status: 200, count: 0, candles: [], reason: r }),
  http: (code) => ({ ok: false, status: code, count: 0, reason: 'http_' + code }),
  gateClosed: (r) => ({ ok: false, status: 0, count: 0, reason: r }),
  networkFail: (m) => ({ ok: false, status: 0, count: 0, reason: 'fetch:' + m }),
  malformed: () => null,
};

async function main() {

// ═════════════════════════════════════════════════════════════════════════════
section('§1  MANIFEST — four core declarations extracted, UI + state + shared stay inline');
// ═════════════════════════════════════════════════════════════════════════════
{
  const inlineOnly = stripComments(MONOLITH);
  const MODULE_PATH = path.join(ROOT, DETAIL_4H_MODULE_REL);
  const MODULE_SRC  = fs.existsSync(MODULE_PATH) ? fs.readFileSync(MODULE_PATH, 'utf8') : '';
  const MODULE_CODE = stripComments(MODULE_SRC);
  const rawIndex = loader.loadIndexHtml();
  const localTags = SCRIPTS.filter((s) => s.kind === 'local').map((s) => s.src);
  const modEntry   = SCRIPTS.filter((s) => s.kind === 'local' && s.src === DETAIL_4H_MODULE_TAG)[0];
  const spyEntry   = SCRIPTS.filter((s) => s.kind === 'local' && s.src === './js/services/sfs-candle-spy-read.js')[0];
  const firstInline = SCRIPTS.filter((s) => s.kind === 'inline' && s.isAppJs)[0];

  ok(MONOLITH.length > 1000000, '1: the inline monolith is still the bulk of the application source');

  // (1) the extracted core module exists.
  ok(fs.existsSync(MODULE_PATH), '1: ' + DETAIL_4H_MODULE_REL + ' exists');

  // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
  const modTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-detail-4h\.js["'][^>]*>/gi) || [];
  ok(modTags.length === 1, '1: exactly one sfs-candle-detail-4h.js <script> tag in index.html');
  ok(modTags.length === 1 && !/\btype\s*=/.test(modTags[0]), '1: the <script> tag is classic (no type= attribute)');
  ok(modTags.length === 1 && !/\basync\b/.test(modTags[0]) && !/\bdefer\b/.test(modTags[0]),
     '1: the <script> tag has no async/defer (synchronous classic load)');

  // (5)(6) load order: AFTER sfs-candle-spy-read.js, BEFORE the inline monolith.
  ok(!!modEntry && !!spyEntry && spyEntry.order < modEntry.order, '1: the core module loads AFTER sfs-candle-spy-read.js');
  ok(!!modEntry && !!firstInline && modEntry.order < firstInline.order, '1: the core module loads BEFORE the inline monolith');

  // (7) the shared loader includes the module in the reconstructed application source.
  ok(localTags.indexOf(DETAIL_4H_MODULE_TAG) !== -1, '1: the loader parses sfs-candle-detail-4h.js as a local script');

  // (8)(9)(10) the four core functions: present in the module, ABSENT from the residual
  // monolith, exactly ONE overall definition each in the reconstructed source.
  for (const fn of DETAIL_4H_CORE_MODULE) {
    const reAll = new RegExp('(?:async\\s+)?function\\s+' + fn + '\\s*\\(', 'g');
    ok((MODULE_CODE.match(reAll) || []).length === 1, '1: ' + fn + ' is declared in the extracted core module');
    ok((inlineOnly.match(reAll) || []).length === 0, '1: ' + fn + ' is NO LONGER declared in the residual monolith');
    ok((stripComments(APP).match(reAll) || []).length === 1, '1: exactly one overall definition of ' + fn);
  }

  // (11) the two UI functions STAY classic global declarations in the monolith.
  for (const fn of DETAIL_4H_UI) {
    ok(new RegExp('(?:async\\s+)?function\\s+' + fn + '\\s*\\(').test(inlineOnly),
       '1: UI stays declared inside index.html (monolith): ' + fn);
    ok(MODULE_CODE.indexOf('function ' + fn + '(') === -1, '1: UI NOT (re)declared in the core module: ' + fn);
  }

  // (12) detail state + detail constants stay declared in the monolith, not in the module.
  for (const s of DETAIL_4H_STATE.concat(DETAIL_4H_CONSTANTS)) {
    ok(new RegExp('^var\\s+' + s + '\\s*=', 'm').test(inlineOnly), '1: ' + s + ' is declared inside index.html');
    ok(!new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b').test(MODULE_SRC),
       '1: ' + s + ' NOT (re)declared in the core module');
  }

  for (const rel of EXCLUDED) {
    const src = stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const hits = DETAIL_SYMBOLS.filter((s) => src.indexOf(s) >= 0);
    ok(hits.length === 0, '1: ' + rel + ' contains NO detail-4H symbol (found: ' + (hits.join(',') || 'none') + ')');
  }

  // (19)(20) no detail-4H UI module, no aggregate orchestrator/state/service module was
  // created — the extraction produced exactly ONE new file.
  for (const mod of ['js/services/sfs-candle-detail-4h-ui.js',
                     'js/services/sfs-candle-detail-4h-helpers.js', 'js/ui/sfs-detail-4h-ui.js',
                     'js/services/sfs-candle-orchestrator.js', 'js/services/candle-state.js',
                     'js/services/candle-service.js']) {
    ok(!fs.existsSync(path.join(ROOT, mod)), '1: ' + mod + ' does NOT exist');
  }

  // (13) The shared cooldown/reason maps and their constant are still monolith-declared
  // and genuinely shared with the ALREADY-EXTRACTED generic ensure — the extraction did
  // NOT duplicate, split or move them into the new module.
  const generic = stripComments(fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-generic-ensure.js'), 'utf8'));
  for (const s of SHARED_STATE.concat(SHARED_CONSTANTS)) {
    ok(new RegExp('^var\\s+' + s + '\\s*=', 'm').test(inlineOnly), '1: shared ' + s + ' is declared in index.html');
    ok(generic.indexOf(s) >= 0, '1: shared ' + s + ' is ALSO used by the extracted generic ensure module');
    ok(!new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b').test(MODULE_SRC),
       '1: shared ' + s + ' NOT (re)declared in the core module');
  }
  for (const h of SHARED_HELPERS) {
    ok(new RegExp('function\\s+' + h + '\\s*\\(').test(inlineOnly), '1: shared helper ' + h + ' is declared in index.html');
    ok(MODULE_CODE.indexOf('function ' + h + '(') === -1, '1: shared helper ' + h + ' NOT duplicated in the core module');
  }
  const spy = stripComments(fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-spy-read.js'), 'utf8'));
  ok(spy.indexOf('_sfsSleep') >= 0 && spy.indexOf('_sfsCandlesFromSyncSource') >= 0,
     '1: the extracted SPY read-only resolver consumes BOTH shared helpers (they are not detail-owned)');

  // (14)(15) the module is DECLARATIONS ONLY: strip comments, remove the four bodies and
  // nothing executable is left — no top-level call, Promise, timer, cache write or DOM read
  // can run at load time, and no state/constant is (re)declared there.
  let residual = MODULE_CODE;
  for (const fn of DETAIL_4H_CORE_MODULE) residual = residual.replace(stripComments(extractFn(MODULE_SRC, fn)), '');
  ok(residual.trim() === '', '1: the core module contains ONLY the four declarations + comments (no top-level code)');
  ok((MODULE_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 4,
     '1: the core module has exactly four named function declarations');
  ok(!/\b(?:var|let|const)\s+\w/.test(residual), '1: the core module declares no top-level state/constants');
  ok(!/\bnew\s+Promise\b|\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(residual),
     '1: the core module creates no top-level Promise/timer');

  // (16) no direct transport — reads still go through the _sfsFetchBackendCandles primitive.
  ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest/.test(MODULE_CODE), '1: the core module performs NO direct transport');
  ok(/_sfsFetchBackendCandles\s*\(/.test(MODULE_CODE), '1: the core module reads via the _sfsFetchBackendCandles primitive');

  // (17) no NEW DOM implementation: the module renders only by calling the monolith's
  // renderer globally — it never touches the document itself.
  ok(!/\bdocument\b|getElementById|querySelector|innerHTML|addEventListener/.test(MODULE_CODE),
     '1: the core module implements NO DOM access of its own');
  ok(/_sfsRender4hDetailState\s*\(/.test(MODULE_CODE),
     '1: the core module still calls the GLOBAL renderer (no callback, no injected dependency)');
  ok(!/typeof\s+_sfsRender4hDetailState/.test(MODULE_CODE) && !/_sfsRender4hDetailState\s*(?:\?\.|&&)/.test(MODULE_CODE),
     '1: the renderer call kept its unguarded global form (no typeof/optional-chaining guard added)');

  // (18) no SPY / generic-ensure / warmup / predicate function was duplicated here.
  for (const n of SIBLING_OWNED) {
    ok(MODULE_CODE.indexOf('function ' + n + '(') === -1, '1: sibling-owned function NOT (re)declared in the core module: ' + n);
  }

  // Classic-script hygiene: no wrapper, pragma, module syntax or global re-assignment.
  ok(MODULE_SRC.indexOf("'use strict'") === -1 && MODULE_SRC.indexOf('"use strict"') === -1,
     '1: the core module has no "use strict" pragma');
  ok(!/\bimport\b/.test(MODULE_SRC) && !/\bexport\b/.test(MODULE_SRC), '1: the core module has no import/export');
  ok(MODULE_SRC.indexOf('require(') === -1, '1: the core module has no require(');
  ok(!/window\.\w+\s*=/.test(MODULE_SRC), '1: the core module makes no window.* assignment');
  ok(!/\(function\s*\(/.test(MODULE_CODE), '1: the core module wraps nothing in an IIFE');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§2  PHYSICAL ORDER, SIGNATURES AND CALL GRAPH');
// ═════════════════════════════════════════════════════════════════════════════
{
  const order = ['_sfsDetail4hBaseResult', '_sfsMapDetail4hReason', '_sfs4hDetailMessage',
                 '_sfsRender4hDetailState', '_sfsStoreDetail4h', '_sfsEnsureDetail4hCandles'];
  const idx = order.map((n) => fnIndex(APP, n));
  // The four CORE declarations now live in js/services/sfs-candle-detail-4h.js, which is
  // concatenated BEFORE the inline monolith, so in the reconstructed source they precede
  // the two UI declarations that stayed behind. Inside the module their RELATIVE order is
  // unchanged from the original monolith block (base → mapReason → store → ensure), and
  // the UI pair keeps its original relative order (message → render) in the monolith.
  const coreIdx = DETAIL_4H_CORE_MODULE.map((n) => fnIndex(APP, n));
  const uiIdx   = DETAIL_4H_UI.map((n) => fnIndex(APP, n));
  ok(coreIdx.every((v, i) => i === 0 || v > coreIdx[i - 1]),
     '2: core module declaration order is base → mapReason → store → ensure (original relative order)');
  ok(uiIdx.every((v, i) => i === 0 || v > uiIdx[i - 1]),
     '2: monolith UI declaration order is message → render (original relative order)');
  ok(Math.max.apply(null, coreIdx) < Math.min.apply(null, uiIdx),
     '2: the whole core module precedes the residual monolith UI in the reconstructed source');
  // Hoisted function declarations, so the order is documentation, not a constraint, but the
  // orchestrator is LAST inside its own module and everything it declares locally is above it.
  ok(coreIdx[3] === Math.max.apply(null, coreIdx), '2: the orchestrator is the last declaration in the core module');
  ok(idx.length === 6 && idx.every((v) => v >= 0), '2: all six detail-4H declarations are present exactly once in the reconstructed source');

  eq(sandbox._sfsDetail4hBaseResult.length, 1, '2: _sfsDetail4hBaseResult(symbol) — arity 1');
  eq(sandbox._sfsMapDetail4hReason.length, 2, '2: _sfsMapDetail4hReason(internal, read) — arity 2');
  eq(sandbox._sfs4hDetailMessage.length, 1, '2: _sfs4hDetailMessage(symbol) — arity 1');
  eq(sandbox._sfsRender4hDetailState.length, 1, '2: _sfsRender4hDetailState(symbol) — arity 1');
  eq(sandbox._sfsStoreDetail4h.length, 2, '2: _sfsStoreDetail4h(symbol, candles) — arity 2');
  eq(sandbox._sfsEnsureDetail4hCandles.length, 1, '2: _sfsEnsureDetail4hCandles(symbol) — arity 1');
  ok(/^async function _sfsEnsureDetail4hCandles/.test(extractFn(APP, '_sfsEnsureDetail4hCandles')),
     '2: the orchestrator is declared `async` (always returns a promise)');
  ok(!/^async/.test(extractFn(APP, '_sfsStoreDetail4h')), '2: the cache writer is synchronous');

  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles'));
  const calls = ['_sfsDetail4hBaseResult', '_sfsCandlesFromSyncSource', '_sfsCandlesUsable',
                 '_sfsFetchBackendCandles', '_sfsCandleSubLimitActive', '_sfsMapDetail4hReason',
                 '_sfsWarmupBatch', '_sfsSleep', '_sfsStoreDetail4h', '_sfsRender4hDetailState',
                 'debugLog', 'debugWarn'];
  for (const c of calls) ok(orch.indexOf(c + '(') >= 0, '2: call graph — orchestrator calls ' + c);
  // The orchestrator RENDERS. This is the single fact that makes a naive core/UI
  // split require a wrapper, so it is pinned explicitly.
  eq((orch.match(/_sfsRender4hDetailState\(/g) || []).length, 1,
     '2: the orchestrator calls the DOM renderer EXACTLY once (at the warming transition)');
  ok(/_sfsDetail4hPhase\[symbol\]\s*=\s*'warming';\s*_sfsRender4hDetailState\(symbol\)/.test(orch.replace(/\s+/g, ' ')),
     '2: the render call immediately follows the phase → warming write');
  ok(orch.indexOf('document') < 0, '2: the orchestrator itself never touches `document` directly');
  ok(orch.indexOf('_recordCandleProvenance') < 0, '2: the orchestrator records NO candle provenance');
  ok(orch.indexOf('_sfs4hDetailMessage') < 0, '2: the orchestrator never builds UI copy itself');

  const render = stripComments(extractFn(APP, '_sfsRender4hDetailState'));
  ok(render.indexOf('_sfs4hDetailMessage(') >= 0, '2: the renderer derives its copy from _sfs4hDetailMessage');
  ok(render.indexOf('_sfsDetail4hPhase') < 0 && render.indexOf('_sfsDetail4hResult') < 0,
     '2: the renderer reads phase/result only INDIRECTLY, through the message helper');
  ok(!/_sfsRender4hDetailState\s*\(\s*symbol\s*,/.test(APP),
     '2: the renderer takes NO result/phase parameter — it re-reads global state by symbol');
  const msg = stripComments(extractFn(APP, '_sfs4hDetailMessage'));
  ok(msg.indexOf('_sfsDetail4hPhase[symbol]') >= 0 && msg.indexOf('_sfsDetail4hResult[symbol]') >= 0,
     '2: _sfs4hDetailMessage reads BOTH global maps (it is not a pure function of its argument)');
  ok(msg.indexOf('document') < 0, '2: _sfs4hDetailMessage performs no DOM access (copy only)');

  const store = stripComments(extractFn(APP, '_sfsStoreDetail4h'));
  ok(store.indexOf('chartSymbol') < 0,
     '2: the cache writer holds NO stale-symbol guard — the guard belongs to the orchestrator');
  ok(store.indexOf('_sfsCandlesUsable') < 0, '2: the cache writer does not re-validate the candles');
  ok(store.indexOf('return') < 0, '2: the cache writer returns nothing (undefined)');
  ok(store.indexOf('source') < 0 && store.indexOf('_recordCandleProvenance') < 0 &&
     store.indexOf('_sfsWarmupCooldown') < 0 && store.indexOf('_sfsLastFailReason') < 0,
     '2: the cache writer sets no source, no provenance, no cooldown/reason reset');
  eq((stripComments(APP).match(/_sfsStoreDetail4h\(/g) || []).length, 3,
     '2: _sfsStoreDetail4h has exactly 3 occurrences (1 declaration + 2 orchestrator call sites)');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§3  EXTERNAL CALLERS — the detail block is NOT self-contained');
// ═════════════════════════════════════════════════════════════════════════════
{
  const open = stripComments(extractFn(APP, '_sfsOpenChart'));
  ok(open.indexOf('_sfsDetail4hPhase[symbol] = \'loading\'') >= 0,
     '3: _sfsOpenChart (UI caller) WRITES _sfsDetail4hPhase directly — state is not orchestrator-owned');
  eq((open.match(/_sfsRender4hDetailState\(/g) || []).length, 2,
     '3: _sfsOpenChart calls the renderer twice (initial paint + failure re-paint)');
  ok(open.indexOf('_sfsEnsureDetail4hCandles(symbol)') >= 0, '3: _sfsOpenChart kicks the orchestrator');
  ok(/chartSymbol\s*!==\s*symbol/.test(open), '3: _sfsOpenChart re-checks chartSymbol before rendering the result');

  const drawOne = stripComments(extractFn(APP, '_sfsDrawOneTf'));
  ok(/typeof\s+_sfs4hDetailMessage\s*===\s*'function'/.test(drawOne),
     '3: _sfsDrawOneTf consumes _sfs4hDetailMessage behind a typeof guard');
  ok(/tf\s*===\s*'4H'/.test(drawOne), '3: _sfsDrawOneTf routes ONLY the 4H empty state through the detail copy');

  const dbg = stripComments(extractFn(APP, 'apexDebugSfsDetailChart'));
  for (const s of DETAIL_4H_STATE) ok(dbg.indexOf(s) >= 0, '3: apexDebugSfsDetailChart reads ' + s);

  // Full external call-site census over the reconstructed source.
  const bare = stripComments(APP);
  const census = {
    _sfs4hDetailMessage: (bare.match(/_sfs4hDetailMessage/g) || []).length,
    _sfsRender4hDetailState: (bare.match(/_sfsRender4hDetailState/g) || []).length,
    _sfsStoreDetail4h: (bare.match(/_sfsStoreDetail4h/g) || []).length,
    _sfsEnsureDetail4hCandles: (bare.match(/_sfsEnsureDetail4hCandles/g) || []).length,
  };
  eq(census._sfs4hDetailMessage, 4, '3: _sfs4hDetailMessage — 4 refs (decl + renderer + 2 in _sfsDrawOneTf)');
  eq(census._sfsRender4hDetailState, 4, '3: _sfsRender4hDetailState — 4 refs (decl + orchestrator + 2 in _sfsOpenChart)');
  eq(census._sfsStoreDetail4h, 3, '3: _sfsStoreDetail4h — 3 refs (decl + 2 orchestrator call sites)');
  eq(census._sfsEnsureDetail4hCandles, 2, '3: _sfsEnsureDetail4hCandles — 2 refs (decl + _sfsOpenChart)');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§4  CONSTANTS — real values and real sharing');
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(state('SFS_DETAIL_4H_POST_WARM_ATTEMPTS'), 3, '4: SFS_DETAIL_4H_POST_WARM_ATTEMPTS === 3');
  eq(state('SFS_DETAIL_4H_POST_WARM_DELAY_MS'), 1200, '4: SFS_DETAIL_4H_POST_WARM_DELAY_MS === 1200');
  eq(state('SFS_WARMUP_COOLDOWN_MS'), 30000, '4: SFS_WARMUP_COOLDOWN_MS === 30000');
  eq(typeof state('SFS_DETAIL_4H_POST_WARM_ATTEMPTS'), 'number', '4: attempts is a number literal');
  eq(typeof state('SFS_DETAIL_4H_POST_WARM_DELAY_MS'), 'number', '4: delay is a number literal');
  // SPY delays are DIFFERENT constants — the detail flow must never borrow them.
  eq(extractVarDecl(APP, 'SFS_SPY_POST_WARM_READ_ATTEMPTS').match(/=\s*(\d+)/)[1], '4',
     '4: the SPY resolver uses 4 attempts (distinct from the detail 3)');
  eq(extractVarDecl(APP, 'SFS_SPY_POST_WARM_RETRY_DELAY_MS').match(/=\s*(\d+)/)[1], '900',
     '4: the SPY resolver uses a 900ms base delay (distinct from the detail 1200)');
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles'));
  ok(orch.indexOf('SFS_SPY_') < 0, '4: the detail orchestrator never references any SPY constant');
  // The detail constants are used nowhere else.
  const bare = stripComments(APP);
  eq((bare.match(/SFS_DETAIL_4H_POST_WARM_ATTEMPTS/g) || []).length, 2, '4: attempts constant — decl + 1 use, detail-exclusive');
  eq((bare.match(/SFS_DETAIL_4H_POST_WARM_DELAY_MS/g) || []).length, 2, '4: delay constant — decl + 1 use, detail-exclusive');
  ok((bare.match(/SFS_WARMUP_COOLDOWN_MS/g) || []).length > 3,
     '4: SFS_WARMUP_COOLDOWN_MS is used by MORE than the detail flow (shared with generic ensure)');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§5  STATE — initial types, key formats, ownership');
// ═════════════════════════════════════════════════════════════════════════════
{
  reset();
  for (const s of DETAIL_4H_STATE.concat(SHARED_STATE)) {
    const v = state(s);
    ok(v && typeof v === 'object' && !Array.isArray(v), '5: ' + s + ' initialises to a plain object map');
  }
  // Detail maps are keyed by BARE SYMBOL; the shared maps by `symbol|4H`.
  sandbox.__sync = null;
  readQueue.push(READ.usable(25));
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  ok(Object.prototype.hasOwnProperty.call(state('_sfsDetail4hPhase'), 'CAT'), '5: _sfsDetail4hPhase keyed by bare symbol');
  ok(Object.prototype.hasOwnProperty.call(state('_sfsDetail4hResult'), 'CAT'), '5: _sfsDetail4hResult keyed by bare symbol');

  reset();
  readQueue.push(READ.bodyReason('subscription limit reached'));
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(Object.keys(state('_sfsWarmupCooldown'))[0], 'CAT|4H', '5: _sfsWarmupCooldown keyed `symbol|4H`');
  eq(Object.keys(state('_sfsLastFailReason'))[0], 'CAT|4H', '5: _sfsLastFailReason keyed `symbol|4H`');

  // In-flight is keyed by BARE symbol → cannot collide with the generic ensure map.
  reset();
  const generic = stripComments(fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-generic-ensure.js'), 'utf8'));
  ok(/_sfsTfFetchInflight\[\s*key\s*\]/.test(generic) && /var key\s*=\s*sym\s*\+\s*'\|'\s*\+\s*tf/.test(generic),
     '5: the generic ensure dedupes on `_sfsTfFetchInflight[symbol|tf]` — a DIFFERENT map and key space');
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles'));
  ok(/_sfsDetail4hInflight\[\s*symbol\s*\]/.test(orch) && orch.indexOf('_sfsTfFetchInflight') < 0,
     '5: the detail orchestrator dedupes on `_sfsDetail4hInflight[symbol]` only');
  // But the cooldown/reason key space DOES overlap generic ensure for tf === 4H.
  ok(/_sfsWarmupCooldown\[key\]/.test(generic), '5: generic ensure writes the SAME cooldown map (shared, cross-flow)');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§6  RESULT SHAPE — base result and every return path');
// ═════════════════════════════════════════════════════════════════════════════
const BASE_FIELDS = ['ok', 'symbol', 'timeframe', 'candles', 'source', 'reason',
                     'warmupAttempted', 'warmupResponse', 'error', 'status', 'count'];
{
  reset();
  const b = sandbox._sfsDetail4hBaseResult('CAT');
  eq(Object.keys(b).join(','), BASE_FIELDS.join(','), '6: base result has EXACTLY 11 fields, in declaration order');
  eq(b.ok, false, '6: base.ok === false');
  eq(b.symbol, 'CAT', '6: base.symbol echoes the argument');
  eq(b.timeframe, '4H', '6: base.timeframe === "4H" (literal)');
  eq(b.candles, null, '6: base.candles === null (NOT [] — the array|null asymmetry is intentional)');
  eq(b.source, null, '6: base.source === null');
  eq(b.reason, null, '6: base.reason === null');
  eq(b.warmupAttempted, false, '6: base.warmupAttempted === false');
  eq(b.warmupResponse, null, '6: base.warmupResponse === null');
  eq(b.error, null, '6: base.error === null');
  eq(b.status, null, '6: base.status === null');
  eq(b.count, 0, '6: base.count === 0');
  ok(sandbox._sfsDetail4hBaseResult('CAT') !== sandbox._sfsDetail4hBaseResult('CAT'),
     '6: base result is a FRESH object per call (no shared singleton)');
  eq(sandbox._sfsDetail4hBaseResult(undefined).symbol, undefined, '6: base echoes undefined symbols verbatim');
  eq(sandbox._sfsDetail4hBaseResult('').symbol, '', '6: base echoes the empty symbol verbatim');

  // Every scenario keeps the SAME 11 keys — no path adds or removes a field.
  const scenarios = [];
  reset(); scenarios.push(['empty symbol', await sandbox._sfsEnsureDetail4hCandles('')]);
  reset(); sandbox.__sync = { candles: series(25), path: 'sfsCache' };
  scenarios.push(['sync cache', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); sandbox.__sync = { candles: series(25), path: 'dxlinkBuffer' };
  scenarios.push(['dxlink buffer', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push(READ.usable(25));
  scenarios.push(['first read ok', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push(READ.http(404));
  scenarios.push(['404', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push(READ.http(500));
  scenarios.push(['500', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); sandbox.__subLimit = true; readQueue.push(READ.empty());
  scenarios.push(['sub limit', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push(READ.empty());
  vm.runInContext('_sfsWarmupCooldown["CAT|4H"] = 1000000 + 5000; _sfsLastFailReason["CAT|4H"] = "FETCH_ERROR";', sandbox);
  scenarios.push(['cooldown', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push(READ.empty(), READ.empty(), READ.usable(30));
  scenarios.push(['reread success', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  scenarios.push(['exhaustion', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push(READ.empty()); sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; };
  scenarios.push(['symbol changed', await sandbox._sfsEnsureDetail4hCandles('CAT')]);
  reset(); readQueue.push({ __throw: new Error('boom') });
  scenarios.push(['rejection', await sandbox._sfsEnsureDetail4hCandles('CAT')]);

  for (const [name, r] of scenarios) {
    eq(Object.keys(r).sort().join(','), BASE_FIELDS.slice().sort().join(','),
       '6: [' + name + '] result keeps exactly the 11 base fields');
    eq(r.timeframe, '4H', '6: [' + name + '] timeframe stays "4H"');
  }
  // Field-by-field truth table for the pinned scenarios.
  const by = Object.fromEntries(scenarios);
  const row = (n) => [by[n].ok, by[n].source, by[n].reason, by[n].status, by[n].count, by[n].warmupAttempted,
                      Array.isArray(by[n].candles) ? 'array' : by[n].candles].map(String).join('|');
  eq(row('empty symbol'), 'false|null|null|null|0|false|null', '6: empty symbol → untouched base result');
  eq(row('sync cache'), 'true|SFS_CACHE|null|null|25|false|array', '6: sync cache hit → ok, SFS_CACHE, status stays null');
  eq(row('dxlink buffer'), 'true|DXLINK_BUFFER|null|null|25|false|array', '6: dxlink buffer hit → ok, DXLINK_BUFFER');
  eq(row('first read ok'), 'true|BACKEND_DXLINK_CANDLE_CACHE|null|200|25|false|array', '6: first read ok → backend source, no warmup');
  eq(row('404'), 'false|null|ENDPOINT_UNAVAILABLE|404|0|false|null', '6: 404 → ENDPOINT_UNAVAILABLE, candles stay null');
  eq(row('500'), 'false|null|FETCH_ERROR|500|0|false|null', '6: 500 → FETCH_ERROR');
  eq(row('sub limit'), 'false|null|SUBSCRIPTION_LIMIT_BACKOFF|200|0|false|null', '6: sub limit → BACKOFF, warmup NOT attempted');
  eq(row('cooldown'), 'false|null|FETCH_ERROR|200|0|false|null', '6: cooldown → last reason replayed through the mapper');
  eq(row('reread success'), 'true|BACKEND_DXLINK_CANDLE_CACHE|null|200|30|true|array', '6: reread success → backend source, warmupAttempted true');
  eq(row('exhaustion'), 'false|null|CANDLES_NOT_READY|200|0|true|null', '6: exhaustion → CANDLES_NOT_READY');
  eq(row('symbol changed'), 'false|null|SYMBOL_CHANGED|200|0|true|null', '6: symbol changed → SYMBOL_CHANGED');
  eq(row('rejection'), 'false|null|FETCH_ERROR|null|0|false|null', '6: rejection → FETCH_ERROR with status left null');
  eq(by['rejection'].error, 'boom', '6: rejection records error message on result.error');
  eq(by['404'].error, null, '6: a classified HTTP failure leaves result.error null');
  eq(by['reread success'].warmupResponse.ok, true, '6: warmupResponse is stored verbatim on the result');
  eq(by['first read ok'].warmupResponse, null, '6: no warmup → warmupResponse stays null');

  // Source enum closure.
  const sources = new Set(scenarios.map(([, r]) => r.source));
  ok([...sources].every((s) => s === null || s === 'SFS_CACHE' || s === 'DXLINK_BUFFER' || s === 'BACKEND_DXLINK_CANDLE_CACHE'),
     '6: source enum is exactly {null, SFS_CACHE, DXLINK_BUFFER, BACKEND_DXLINK_CANDLE_CACHE}');
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles'));
  eq((orch.match(/source\s*=\s*'[A-Z_]+'/g) || []).length, 2, '6: the orchestrator assigns a literal source on exactly 2 paths');
  ok(/sync\.path\s*===\s*'dxlinkBuffer'\s*\?\s*'DXLINK_BUFFER'\s*:\s*'SFS_CACHE'/.test(orch),
     '6: any sync path other than "dxlinkBuffer" is reported as SFS_CACHE');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§7  SYNC-SOURCE CONTRACT — real _sfsCandlesFromSyncSource');
// ═════════════════════════════════════════════════════════════════════════════
{
  reset();
  const cache = sandbox.S.squeezeFireScanner.chartCacheCandles;
  const cached = series(25);
  cache.CAT = { '4H': cached };
  const hit = realCandlesFromSyncSource.call(sandbox, 'CAT', '4H');
  eq(hit.path, 'sfsCache', '7: SFS cache hit reports path "sfsCache"');
  ok(hit.candles === cached, '7: SFS cache hit returns the ORIGINAL array reference (no copy)');

  reset();
  sandbox.S.squeezeFireScanner.chartCacheCandles.CAT = { '4H': series(21) };
  eq(realCandlesFromSyncSource.call(sandbox, 'CAT', '4H'), null, '7: a 21-bar cache entry is NOT a hit (< 22)');

  reset();
  sandbox.S.squeezeFireScanner.chartCacheCandles.CAT = { '4H': seriesBadClose(25) };
  eq(realCandlesFromSyncSource.call(sandbox, 'CAT', '4H'), null, '7: a cache entry with a non-finite last close is NOT a hit');

  // Buffer promotion (4H → getFourHourCandles).
  reset();
  const buf = series(30);
  vm.runInContext('var getFourHourCandles = function(s) { return __buf; };', sandbox);
  sandbox.__buf = buf;
  const bh = realCandlesFromSyncSource.call(sandbox, 'CAT', '4H');
  eq(bh.path, 'dxlinkBuffer', '7: DXLink buffer hit reports path "dxlinkBuffer"');
  ok(bh.candles === buf, '7: buffer hit returns the original buffer reference');
  ok(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT['4H'] === buf,
     '7: a buffer hit is PROMOTED into the SFS chart cache (side effect — not a pure read)');

  reset(); sandbox.__buf = series(21);
  eq(realCandlesFromSyncSource.call(sandbox, 'CAT', '4H'), null, '7: a short buffer is not a hit');
  ok(!sandbox.S.squeezeFireScanner.chartCacheCandles.CAT, '7: a rejected buffer is NOT promoted into the cache');
  reset(); sandbox.__buf = seriesBadClose(25);
  eq(realCandlesFromSyncSource.call(sandbox, 'CAT', '4H'), null, '7: a buffer with an invalid last close is not a hit');
  reset(); sandbox.__buf = null;
  eq(realCandlesFromSyncSource.call(sandbox, 'CAT', '4H'), null, '7: no cache and no buffer → null');

  const syncSrc = stripComments(extractFn(APP, '_sfsCandlesFromSyncSource'));
  ok(/tf\s*===\s*'1D'/.test(syncSrc) && syncSrc.indexOf('_rsGetDailyCandles') >= 0 && syncSrc.indexOf('getFourHourCandles') >= 0,
     '7: the shared helper routes 1D → _rsGetDailyCandles and everything else → getFourHourCandles');
  ok(syncSrc.indexOf('fetch') < 0 && syncSrc.indexOf('await') < 0, '7: the shared helper performs no network and is synchronous');

  // Orchestrator-side sync contract: no in-flight key, no read, no warmup, no store.
  reset();
  sandbox.__sync = { candles: series(25), path: 'sfsCache' };
  vm.runInContext('_sfsLastFailReason["CAT|4H"] = "FETCH_ERROR"; _sfsWarmupCooldown["CAT|4H"] = 9;', sandbox);
  const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(readCalls.length, 0, '7: sync hit performs ZERO backend reads');
  eq(warmupCalls.length, 0, '7: sync hit performs ZERO warmups');
  eq(sleepCalls.length, 0, '7: sync hit performs ZERO sleeps');
  eq(Object.keys(state('_sfsDetail4hInflight')).length, 0, '7: sync hit NEVER creates an in-flight key');
  eq(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT, undefined,
     '7: sync hit does NOT call the cache writer (the sync source already owns promotion)');
  eq(state('_sfsDetail4hPhase').CAT, null, '7: sync hit sets phase to null synchronously');
  ok(state('_sfsDetail4hResult').CAT === r, '7: sync hit stores the returned result object itself');
  eq(state('_sfsLastFailReason')['CAT|4H'], 'FETCH_ERROR', '7: sync hit does NOT clear a stale last-fail reason (asymmetry)');
  eq(state('_sfsWarmupCooldown')['CAT|4H'], 9, '7: sync hit does NOT clear an existing cooldown (asymmetry)');
  ok(r.candles === sandbox.__sync.candles, '7: sync hit returns the original candle array reference');

  // A sync object whose candles are unusable falls THROUGH to the backend read.
  reset();
  sandbox.__sync = { candles: series(10), path: 'sfsCache' };
  readQueue.push(READ.usable(25));
  const r2 = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(readCalls.length, 1, '7: an unusable sync payload falls through to the backend read');
  eq(r2.source, 'BACKEND_DXLINK_CANDLE_CACHE', '7: fall-through result carries the backend source');

  // The helper is consumed behind a typeof guard.
  ok(/typeof\s+_sfsCandlesFromSyncSource\s*===\s*'function'/.test(stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles'))),
     '7: the orchestrator guards the shared helper with a typeof check (survives load-order gaps)');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§8  FIRST-READ CONTRACT — classification and the no-cooldown asymmetry');
// ═════════════════════════════════════════════════════════════════════════════
{
  const firstRead = async (readResult) => {
    reset();
    readQueue.push(readResult);
    // Force the bounded loop to terminate fast when the path continues past the read.
    readQueue.push(READ.empty(), READ.empty(), READ.empty());
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    return { r, reads: readCalls.length, warms: warmupCalls.length,
             cooldown: state('_sfsWarmupCooldown')['CAT|4H'], lastFail: state('_sfsLastFailReason')['CAT|4H'] };
  };

  let o = await firstRead(READ.usable(25));
  eq(o.r.ok, true, '8: usable first read → ok');
  eq(o.reads, 1, '8: usable first read performs exactly ONE read');
  eq(o.warms, 0, '8: usable first read fires NO warmup');
  eq(o.cooldown, undefined, '8: success DELETES the cooldown entry');
  eq(o.lastFail, undefined, '8: success DELETES the last-fail reason');

  for (const [name, fixture, reason] of [
    ['404', READ.http(404), 'ENDPOINT_UNAVAILABLE'],
    ['401', READ.http(401), 'FETCH_ERROR'],
    ['403', READ.http(403), 'FETCH_ERROR'],
    ['429', READ.http(429), 'FETCH_ERROR'],
    ['500', READ.http(500), 'FETCH_ERROR'],
    ['gate closed', READ.gateClosed('auth_not_ready'), 'FETCH_ERROR'],
    ['network reject', READ.networkFail('The operation timed out'), 'FETCH_ERROR'],
    ['json parse', { ok: false, status: 200, count: 0, reason: 'json_parse' }, 'FETCH_ERROR'],
  ]) {
    o = await firstRead(fixture);
    eq(o.r.reason, reason, '8: first-read ' + name + ' → ' + reason);
    eq(o.reads, 1, '8: first-read ' + name + ' short-circuits after ONE read');
    eq(o.warms, 0, '8: first-read ' + name + ' fires NO warmup');
    eq(o.r.warmupAttempted, false, '8: first-read ' + name + ' leaves warmupAttempted false');
    eq(o.lastFail, reason, '8: first-read ' + name + ' records the classified reason in _sfsLastFailReason');
    eq(o.cooldown, undefined, '8: first-read ' + name + ' writes NO cooldown (hard-failure asymmetry)');
    eq(o.r.status, fixture.status, '8: first-read ' + name + ' propagates the HTTP status onto the result');
  }

  // The 404 discriminator matches the reason BODY, not the status field.
  o = await firstRead({ ok: false, status: 502, count: 0, reason: 'fetch: upstream said 404 somewhere' });
  eq(o.r.reason, 'ENDPOINT_UNAVAILABLE', '8: ASYMMETRY — any reason body containing "404" maps to ENDPOINT_UNAVAILABLE, whatever the status');
  o = await firstRead({ ok: false, status: 404, count: 0, reason: 'not_found' });
  eq(o.r.reason, 'FETCH_ERROR', '8: ASYMMETRY — HTTP 404 whose reason body omits "404" maps to FETCH_ERROR');

  // ok:true bodies fall through to the warmup branch, not to the hard-failure branch.
  for (const [name, fixture] of [['empty', READ.empty()], ['short', READ.short(10)], ['invalid close', READ.invalidClose()]]) {
    reset();
    readQueue.push(fixture, READ.empty(), READ.empty(), READ.empty());
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    eq(warmupCalls.length, 1, '8: soft first read (' + name + ') proceeds to the ONE controlled warmup');
    eq(r.warmupAttempted, true, '8: soft first read (' + name + ') sets warmupAttempted');
  }

  // A malformed (null) read result is soft: status/count fall back to null/0.
  reset();
  sandbox.__subLimit = true;                       // stop right after the first read
  readQueue.push(READ.malformed());
  let rm = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(rm.status, null, '8: a null read leaves status null');
  eq(rm.count, 0, '8: a null read leaves count 0');
  reset();
  readQueue.push(READ.malformed(), READ.empty(), READ.empty(), READ.empty());
  rm = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 1, '8: a null read is treated as soft and proceeds to warmup');
  eq(rm.status, 200, '8: each reread OVERWRITES status/count — the LAST read wins on the result');

  // A synchronous throw from the read primitive is caught by the outer try.
  reset();
  readQueue.push({ __syncThrow: new Error('sync read boom') });
  const rs = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(rs.reason, 'FETCH_ERROR', '8: a synchronous throw from the read primitive is classified FETCH_ERROR');
  eq(rs.error, 'sync read boom', '8: the thrown message lands on result.error');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§9  SUBSCRIPTION LIMIT');
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) live predicate
  reset();
  sandbox.__subLimit = true;
  readQueue.push(READ.empty());
  let r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'SUBSCRIPTION_LIMIT_BACKOFF', '9: live predicate → SUBSCRIPTION_LIMIT_BACKOFF');
  eq(warmupCalls.length, 0, '9: live predicate → NO warmup');
  eq(sleepCalls.length, 0, '9: live predicate → NO sleep');
  eq(readCalls.length, 1, '9: live predicate → NO reread');
  eq(state('_sfsLastFailReason')['CAT|4H'], 'SUBSCRIPTION_LIMIT',
     '9: ASYMMETRY — _sfsLastFailReason stores "SUBSCRIPTION_LIMIT", the result says "SUBSCRIPTION_LIMIT_BACKOFF"');
  eq(state('_sfsWarmupCooldown')['CAT|4H'], 1000000 + 30000, '9: live predicate writes now + 30000 into the cooldown');
  eq(state('_sfsDetail4hPhase').CAT, null, '9: phase settles back to null');
  ok(state('_sfsDetail4hResult').CAT === r, '9: the final result is memoised');

  // (b) body reason
  reset();
  readQueue.push(READ.bodyReason('Candle SUBSCRIPTION limit reached'));
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'SUBSCRIPTION_LIMIT_BACKOFF', '9: a body reason containing "subscription" (any case) → BACKOFF');
  eq(warmupCalls.length, 0, '9: body-reason detection also skips the warmup');

  // (c) detected mid-reread → aborts the remaining attempts
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.bodyReason('subscription limit'), READ.usable(30));
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'SUBSCRIPTION_LIMIT_BACKOFF', '9: sub limit surfacing during a reread → BACKOFF');
  eq(readCalls.length, 3, '9: sub limit during reread ABORTS the remaining attempt (3 reads, not 4)');
  eq(warmupCalls.length, 1, '9: still exactly ONE warmup');
  eq(state('_sfsWarmupCooldown')['CAT|4H'], 1000000 + 30000, '9: the reread sub-limit branch also writes the cooldown');
  eq(state('_sfsLastFailReason')['CAT|4H'], 'SUBSCRIPTION_LIMIT', '9: and stores the same internal reason');

  // (d) UI copy for the backoff state
  reset();
  vm.runInContext('_sfsDetail4hResult.CAT = { reason: "SUBSCRIPTION_LIMIT_BACKOFF" };', sandbox);
  const m = sandbox._sfs4hDetailMessage('CAT');
  eq(m.label, '4H — subscription cap', '9: backoff label copy');
  eq(m.msg, 'DXLink Candle subscription cap/backoff active.<br>4H will warm when capacity frees up.', '9: backoff message copy');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§10  COOLDOWN — key, threshold, writers and non-writers');
// ═════════════════════════════════════════════════════════════════════════════
{
  // absent
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 1, '10: no cooldown entry → the warmup runs');

  // fresh (now < until) → skip warmup entirely
  reset();
  readQueue.push(READ.empty());
  vm.runInContext('_sfsWarmupCooldown["CAT|4H"] = 1000001; _sfsLastFailReason["CAT|4H"] = "SUBSCRIPTION_LIMIT";', sandbox);
  let r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 0, '10: a fresh cooldown skips the warmup');
  eq(sleepCalls.length, 0, '10: a fresh cooldown skips every reread');
  eq(r.warmupAttempted, false, '10: a fresh cooldown leaves warmupAttempted false');
  eq(r.reason, 'SUBSCRIPTION_LIMIT_BACKOFF', '10: the stored internal reason is replayed through the mapper');
  eq(state('_sfsWarmupCooldown')['CAT|4H'], 1000001, '10: the cooldown branch does NOT extend the existing deadline');
  eq(state('_sfsLastFailReason')['CAT|4H'], 'SUBSCRIPTION_LIMIT', '10: the cooldown branch does NOT rewrite the last-fail reason');

  // expired
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  vm.runInContext('_sfsWarmupCooldown["CAT|4H"] = 999999;', sandbox);
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 1, '10: an expired cooldown (until < now) allows the warmup');

  // EXACTLY at the threshold — `Date.now() < until` is strict, so now === until warms.
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  vm.runInContext('_sfsWarmupCooldown["CAT|4H"] = 1000000;', sandbox);
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 1, '10: at the exact threshold (now === until) the guard is OPEN — strict `<` comparison');

  // a falsy 0 deadline is treated as absent
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  vm.runInContext('_sfsWarmupCooldown["CAT|4H"] = 0;', sandbox);
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 1, '10: a 0 deadline is falsy and therefore ignored');

  // duration and writers
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  sandbox.__now = 5000000;
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(state('_sfsWarmupCooldown')['CAT|4H'], 5030000, '10: exhaustion writes now + 30000 exactly');

  // the cooldown map is shared with the generic ensure for the SAME key space
  reset();
  vm.runInContext('_sfsWarmupCooldown["CAT|4H"] = 1000500;', sandbox);   // as if written by _sfsEnsureTfCandles
  readQueue.push(READ.empty());
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 0,
     '10: CROSS-FLOW — a cooldown written by the generic ensure for CAT|4H suppresses the DETAIL warmup');
  eq(r.reason, 'CANDLES_NOT_READY', '10: with no stored internal reason the cooldown branch maps to CANDLES_NOT_READY');

  // paths that must NOT write the cooldown
  const noWrite = async (setup) => {
    reset(); setup();
    await sandbox._sfsEnsureDetail4hCandles('CAT');
    return state('_sfsWarmupCooldown')['CAT|4H'];
  };
  eq(await noWrite(() => { sandbox.__sync = { candles: series(25), path: 'sfsCache' }; }), undefined, '10: sync hit writes no cooldown');
  eq(await noWrite(() => { readQueue.push(READ.usable(25)); }), undefined, '10: first-read success writes no cooldown');
  eq(await noWrite(() => { readQueue.push(READ.http(500)); }), undefined, '10: first-read hard failure writes no cooldown');
  eq(await noWrite(() => { readQueue.push(READ.http(404)); }), undefined, '10: a 404 writes no cooldown');
  eq(await noWrite(() => { readQueue.push({ __throw: new Error('x') }); }), undefined, '10: an exception writes no cooldown');
  eq(await noWrite(() => {
    readQueue.push(READ.empty()); sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; };
  }), undefined, '10: SYMBOL_CHANGED writes no cooldown');
  eq(await noWrite(() => { readQueue.push(READ.empty(), READ.empty(), READ.usable(30)); }), undefined,
     '10: a successful reread DELETES the cooldown rather than writing one');
  ok(!Object.prototype.hasOwnProperty.call(state('_sfsWarmupCooldown'), 'CAT'),
     '10: the cooldown is NEVER keyed by the bare symbol — only `symbol|4H`');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§11  WARMUP — exact opts, exactly once, failure tolerance');
// ═════════════════════════════════════════════════════════════════════════════
{
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(warmupCalls.length, 1, '11: exactly ONE warmup per orchestrator run');
  const w = warmupCalls[0];
  eq(JSON.stringify(w.syms), '["CAT"]', '11: warmup symbols === [symbol] (single symbol)');
  eq(JSON.stringify(w.tfs), '["30M"]', '11: warmup timeframes === ["30M"] (never 4H, never 1D)');
  eq(w.opts.reason, 'squeeze_fire_detail_chart', '11: warmup opts.reason === "squeeze_fire_detail_chart"');
  eq(w.opts.context.singleSymbol, true, '11: warmup opts.context.singleSymbol === true');
  eq(w.opts.context.requestedTimeframe, '4H', '11: warmup opts.context.requestedTimeframe === "4H"');
  eq(Object.keys(w.opts).sort().join(','), 'context,reason', '11: warmup opts carry EXACTLY {reason, context}');
  eq(Object.keys(w.opts.context).sort().join(','), 'requestedTimeframe,singleSymbol', '11: context carries EXACTLY 2 keys');
  eq(w.opts.priority, undefined, '11: NO `priority` flag — the detail warmup is not privileged');
  eq(w.opts.staged, undefined, '11: NO `staged` flag');

  // warmup outcomes — the loop continues regardless.
  const outcomes = [
    ['ok', () => Promise.resolve({ ok: true, status: 200 })],
    ['http error', () => Promise.resolve({ ok: false, status: 500 })],
    ['cooldown_blocked', () => Promise.resolve({ ok: false, reason: 'cooldown_blocked', queued: 1 })],
    ['no_symbols_or_timeframes', () => Promise.resolve({ ok: false, reason: 'no_symbols_or_timeframes' })],
    ['malformed null', () => Promise.resolve(null)],
    ['malformed string', () => Promise.resolve('nope')],
    ['network reject', () => Promise.reject(new Error('warmup net down'))],
    ['sync throw', () => { throw new Error('warmup sync boom'); }],
  ];
  for (const [name, impl] of outcomes) {
    reset();
    sandbox.__warmupImpl = impl;
    readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    eq(warmupCalls.length, 1, '11: warmup ' + name + ' → still exactly one warmup');
    eq(readCalls.length, 4, '11: warmup ' + name + ' → the bounded rereads STILL run (1 + 3 reads)');
    eq(sleepCalls.length, 3, '11: warmup ' + name + ' → all three sleeps still happen');
    eq(r.warmupAttempted, true, '11: warmup ' + name + ' → warmupAttempted stays true');
    eq(r.reason, 'CANDLES_NOT_READY', '11: warmup ' + name + ' → the final reason comes from the READS, not the warmup');
  }

  // Rejections/throws are wrapped into a synthetic warmupResponse.
  reset();
  sandbox.__warmupImpl = () => Promise.reject(new Error('warmup net down'));
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  let r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.warmupResponse.ok, false, '11: a rejected warmup yields warmupResponse.ok === false');
  eq(r.warmupResponse.reason, 'warmup_exception:warmup net down', '11: the rejection is wrapped as "warmup_exception:<message>"');
  reset();
  sandbox.__warmupImpl = () => { throw new Error('warmup sync boom'); };
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.warmupResponse.reason, 'warmup_exception:warmup sync boom', '11: a SYNCHRONOUS warmup throw is wrapped identically');
  eq(r.reason, 'CANDLES_NOT_READY', '11: a warmup throw never escapes as FETCH_ERROR — it is contained by the inner try');

  // warmupAttempted is set BEFORE the call, so it is true even for a throwing warmup.
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles')).replace(/\s+/g, ' ');
  ok(orch.indexOf('result.warmupAttempted = true; try { result.warmupResponse = await _sfsWarmupBatch(') >= 0,
     '11: warmupAttempted is assigned BEFORE the warmup call, inside its own try/catch');

  // Paths that must fire NO warmup at all.
  const noWarm = async (setup) => { reset(); setup(); await sandbox._sfsEnsureDetail4hCandles('CAT'); return warmupCalls.length; };
  eq(await noWarm(() => {}), 1, '11: control — the default empty-read path DOES warm');
  eq(await noWarm(() => { sandbox.__sync = { candles: series(25), path: 'sfsCache' }; }), 0, '11: sync hit → no warmup');
  eq(await noWarm(() => { readQueue.push(READ.usable(25)); }), 0, '11: first-read success → no warmup');
  eq(await noWarm(() => { readQueue.push(READ.http(500)); }), 0, '11: hard HTTP failure → no warmup');
  eq(await noWarm(() => { sandbox.__subLimit = true; }), 0, '11: subscription cap → no warmup');
  eq(await noWarm(() => { vm.runInContext('_sfsWarmupCooldown["CAT|4H"] = 1000001;', sandbox); }), 0, '11: cooldown → no warmup');
  reset(); eq((await sandbox._sfsEnsureDetail4hCandles('')) && warmupCalls.length, 0, '11: empty symbol → no warmup');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§12  BOUNDED REREAD — 3 attempts, 1200/2400/3600, sleep BEFORE each read');
// ═════════════════════════════════════════════════════════════════════════════
{
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(sleepCalls.length, 3, '12: exactly 3 post-warmup sleeps');
  eq(sleepCalls.join(','), '1200,2400,3600', '12: delays are DELAY_MS × attempt → 1200, 2400, 3600');
  eq(readCalls.length, 4, '12: at most FOUR reads in total (1 first read + 3 rereads)');
  eq(readCalls.join(','), 'CAT|4H,CAT|4H,CAT|4H,CAT|4H', '12: every read targets `symbol, "4H"`');

  // Ordering: sleep strictly before its reread.
  const order = [];
  reset();
  sandbox.__onSleep = () => order.push('sleep');
  sandbox.__onRead = () => order.push('read');
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(order.join(','), 'read,sleep,read,sleep,read,sleep,read', '12: the sequence is read → (sleep, read) × 3');

  for (const [attempt, queue, expectSleeps, expectReads] of [
    [1, [READ.empty(), READ.usable(30)], 1, 2],
    [2, [READ.empty(), READ.empty(), READ.usable(30)], 2, 3],
    [3, [READ.empty(), READ.empty(), READ.empty(), READ.usable(30)], 3, 4],
  ]) {
    reset();
    readQueue.push.apply(readQueue, queue);
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    eq(r.ok, true, '12: success on reread attempt ' + attempt);
    eq(sleepCalls.length, expectSleeps, '12: attempt ' + attempt + ' → ' + expectSleeps + ' sleep(s)');
    eq(readCalls.length, expectReads, '12: attempt ' + attempt + ' → ' + expectReads + ' read(s), loop stops immediately');
    eq(warmupCalls.length, 1, '12: attempt ' + attempt + ' → still exactly ONE warmup');
    eq(r.count, 30, '12: attempt ' + attempt + ' → count comes from the usable array length');
  }

  for (const [name, filler] of [
    ['all empty', READ.empty],
    ['short series', () => READ.short(10)],
    ['invalid close', READ.invalidClose],
  ]) {
    reset();
    readQueue.push(filler(), filler(), filler(), filler());
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    eq(readCalls.length, 4, '12: ' + name + ' → the full bounded 4 reads');
    eq(warmupCalls.length, 1, '12: ' + name + ' → exactly one warmup');
    ok(r.ok === false, '12: ' + name + ' → not ok');
  }

  // A hard HTTP failure DURING a reread does NOT short-circuit the loop.
  reset();
  readQueue.push(READ.empty(), READ.http(500), READ.http(500), READ.usable(30));
  let r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.ok, true, '12: ASYMMETRY — a hard HTTP failure inside the reread loop is NOT classified; the loop keeps going');
  eq(readCalls.length, 4, '12: the loop still consumed all 3 rereads before succeeding');

  reset();
  readQueue.push(READ.empty(), READ.http(500), READ.http(500), READ.http(404));
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'CANDLES_NOT_READY',
     '12: ASYMMETRY — reread HTTP failures end as CANDLES_NOT_READY, not ENDPOINT_UNAVAILABLE/FETCH_ERROR');
  eq(r.status, 404, '12: the LAST reread status wins on the result');

  // A rejection during a reread escapes to the outer catch.
  reset();
  readQueue.push(READ.empty(), READ.empty(), { __throw: new Error('reread down') });
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'FETCH_ERROR', '12: a rejection during a reread → FETCH_ERROR via the outer catch');
  eq(r.error, 'reread down', '12: the reread rejection message lands on result.error');
  eq(state('_sfsWarmupCooldown')['CAT|4H'], undefined, '12: a reread rejection writes NO cooldown');
  eq(state('_sfsDetail4hPhase').CAT, null, '12: a reread rejection still settles phase to null');

  // Real _sfsSleep contract (shared helper) with an instrumented setTimeout.
  reset();
  await vm.runInContext('__realSleep(1200)', sandbox);
  eq(sandbox.__setTimeoutMs[0], 1200, '12: the shared _sfsSleep passes the delay straight to setTimeout');
  await vm.runInContext('__realSleep(-5)', sandbox);
  eq(sandbox.__setTimeoutMs[1], 0, '12: the shared _sfsSleep clamps negative delays to 0');
  await vm.runInContext('__realSleep()', sandbox);
  eq(sandbox.__setTimeoutMs[2], 0, '12: the shared _sfsSleep treats a missing delay as 0');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§13  STALE-SYMBOL GUARD — where it fires and what it prevents');
// ═════════════════════════════════════════════════════════════════════════════
{
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles')).replace(/\s+/g, ' ');
  eq((orch.match(/chartSymbol !== symbol/g) || []).length, 2,
     '13: the orchestrator holds EXACTLY two stale-symbol checks — both inside the reread loop');
  ok(orch.indexOf("result.reason = 'SYMBOL_CHANGED'; return result; } await _sfsSleep(") >= 0,
     '13: check #1 runs BEFORE the sleep');
  ok(orch.indexOf("result.reason = 'SYMBOL_CHANGED'; return result; } lastRead = await _sfsFetchBackendCandles(") >= 0,
     '13: check #2 runs AFTER the sleep and BEFORE the read');
  ok(!/chartSymbol !== symbol[\s\S]*?_sfsStoreDetail4h/.test(
       orch.slice(orch.lastIndexOf('lastRead = await _sfsFetchBackendCandles'))),
     '13: there is NO guard between the reread and the cache write — a symbol change DURING the fetch still stores');
  ok(orch.indexOf('_sfsCandlesFromSyncSource') < orch.indexOf('chartSymbol'),
     '13: neither the sync path nor the first read is guarded — the guard exists only after the warmup');

  // (a) change BEFORE the first reread (before the first sleep)
  reset();
  readQueue.push(READ.empty(), READ.usable(30));
  sandbox.__warmupImpl = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; return Promise.resolve({ ok: true }); };
  let r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'SYMBOL_CHANGED', '13(a): a change before attempt 1 → SYMBOL_CHANGED');
  eq(sleepCalls.length, 0, '13(a): no sleep is performed');
  eq(readCalls.length, 1, '13(a): no reread is performed');
  eq(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT, undefined, '13(a): nothing is written into the cache');

  // (b) change DURING the sleep
  reset();
  readQueue.push(READ.empty(), READ.usable(30));
  sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; };
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'SYMBOL_CHANGED', '13(b): a change during the sleep → SYMBOL_CHANGED (post-sleep check)');
  eq(sleepCalls.length, 1, '13(b): exactly one sleep happened before the abort');
  eq(readCalls.length, 1, '13(b): the reread is never issued');
  eq(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT, undefined, '13(b): no stale cache write');

  // (c) change DURING the fetch, with a usable payload → the guard does NOT re-run
  reset();
  readQueue.push(READ.empty(), READ.usable(30));
  sandbox.__onRead = (n) => { if (n === 2) sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; };
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.ok, true, '13(c): ASYMMETRY — a symbol change DURING the reread fetch is not detected');
  ok(!!sandbox.S.squeezeFireScanner.chartCacheCandles.CAT,
     '13(c): ASYMMETRY — the candles ARE written into CAT\'s cache even though the user moved to IBM');
  eq(r.reason, null, '13(c): the result reports success, not SYMBOL_CHANGED');

  // (d) change on the SECOND attempt only
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.usable(30));
  sandbox.__onSleep = (n) => { if (n === 2) sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; };
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'SYMBOL_CHANGED', '13(d): a change on attempt 2 → SYMBOL_CHANGED');
  eq(readCalls.length, 2, '13(d): only the first reread was issued');

  // (e) the whole scanner object disappearing is treated as a symbol change
  reset();
  readQueue.push(READ.empty(), READ.usable(30));
  sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner = null; };
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'SYMBOL_CHANGED', '13(e): a missing S.squeezeFireScanner is treated as SYMBOL_CHANGED (no throw)');

  // final state after a stale abort
  reset();
  readQueue.push(READ.empty(), READ.usable(30));
  sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; };
  r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(state('_sfsDetail4hPhase').CAT, null, '13: SYMBOL_CHANGED still settles phase to null');
  ok(state('_sfsDetail4hResult').CAT === r, '13: SYMBOL_CHANGED still memoises the result');
  eq(state('_sfsDetail4hInflight').CAT, undefined, '13: SYMBOL_CHANGED still cleans the in-flight entry');
  eq(state('_sfsLastFailReason')['CAT|4H'], undefined, '13: SYMBOL_CHANGED writes no last-fail reason');
  // SYMBOL_CHANGED has no dedicated copy — it falls into the default message.
  eq(sandbox._sfs4hDetailMessage('CAT').msg, '4H warming pending — data not ready yet.',
     '13: SYMBOL_CHANGED has NO dedicated UI copy — it hits the default branch');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§14  CACHE WRITER — _sfsStoreDetail4h');
// ═════════════════════════════════════════════════════════════════════════════
{
  reset();
  const arr = series(25);
  sandbox._sfsStoreDetail4h('CAT', arr);
  const cache = sandbox.S.squeezeFireScanner.chartCacheCandles;
  ok(cache.CAT && typeof cache.CAT === 'object', '14: creates chartCacheCandles[symbol] when missing');
  ok(cache.CAT['4H'] === arr, '14: writes the ORIGINAL array reference under ["4H"] (no copy, no normalisation)');
  eq(sandbox._sfsStoreDetail4h('CAT', arr), undefined, '14: returns undefined');

  reset();
  sandbox.S.squeezeFireScanner.chartCacheCandles.CAT = { '1D': series(30) };
  sandbox._sfsStoreDetail4h('CAT', series(25));
  eq(Object.keys(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT).sort().join(','), '1D,4H',
     '14: an existing symbol bucket is preserved — only the 4H slot is replaced');

  reset();
  sandbox._sfsStoreDetail4h('CAT', series(5));
  eq(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT['4H'].length, 5,
     '14: ASYMMETRY — the writer stores UNUSABLE candles without validating them');
  reset();
  sandbox._sfsStoreDetail4h('CAT', null);
  eq(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT['4H'], null, '14: the writer stores null verbatim');

  reset();
  sandbox.S.squeezeFireScanner.chartSymbol = 'IBM';
  sandbox._sfsStoreDetail4h('CAT', series(25));
  ok(!!sandbox.S.squeezeFireScanner.chartCacheCandles.CAT,
     '14: the writer has NO stale-symbol guard — it writes for a symbol that is no longer selected');

  reset();
  sandbox.S.squeezeFireScanner = null;
  let threw = null;
  try { sandbox._sfsStoreDetail4h('CAT', series(25)); } catch (e) { threw = e; }
  ok(threw !== null, '14: the writer THROWS when S.squeezeFireScanner is missing (no defensive guard)');

  // …and that throw is swallowed by the orchestrator's outer catch → FETCH_ERROR.
  reset();
  sandbox.S.squeezeFireScanner = { chartSymbol: 'CAT', get chartCacheCandles() { throw new Error('cache gone'); } };
  readQueue.push(READ.usable(25));
  const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.reason, 'FETCH_ERROR', '14: a cache-writer throw is contained by the orchestrator and reported as FETCH_ERROR');
  eq(r.error, 'cache gone', '14: the writer throw message reaches result.error');
  eq(r.ok, false, '14: a writer throw prevents the ok flag from surviving');

  // Both orchestrator call sites store BEFORE flipping ok/source.
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles')).replace(/\s+/g, ' ');
  eq((orch.match(/_sfsStoreDetail4h\(symbol, (?:read|lastRead)\.candles\);\s*result\.ok = true/g) || []).length, 2,
     '14: both success paths call the writer BEFORE marking the result ok');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§15  PHASE / RESULT TIMELINE');
// ═════════════════════════════════════════════════════════════════════════════
{
  // synchronous phase write happens BEFORE the first await
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  const pending = sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(state('_sfsDetail4hPhase').CAT, 'loading', '15: phase is "loading" SYNCHRONOUSLY, before the first await resolves');
  ok(!!state('_sfsDetail4hInflight').CAT, '15: the in-flight promise is registered synchronously');
  eq(state('_sfsDetail4hResult').CAT, undefined, '15: no result is memoised while the run is in flight');
  await pending;
  eq(state('_sfsDetail4hPhase').CAT, null, '15: the finally block resets phase to null');
  eq(state('_sfsDetail4hInflight').CAT, undefined, '15: the finally block deletes the in-flight entry');

  // the warming transition
  const timeline = [];
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  sandbox.__warmupImpl = () => { timeline.push('warmup:' + state('_sfsDetail4hPhase').CAT); return Promise.resolve({ ok: true }); };
  sandbox.__onSleep = () => timeline.push('sleep:' + state('_sfsDetail4hPhase').CAT);
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(timeline.join(','), 'warmup:warming,sleep:warming,sleep:warming,sleep:warming',
     '15: phase is "warming" from just before the warmup until the finally block');

  // sync hit sets phase null and stores the result WITHOUT ever passing through "loading"
  reset();
  sandbox.__sync = { candles: series(25), path: 'sfsCache' };
  const rs = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(state('_sfsDetail4hPhase').CAT, null, '15: sync hit → phase null');
  ok(state('_sfsDetail4hResult').CAT === rs, '15: sync hit → result memoised on the sync path itself (not the finally)');
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles')).replace(/\s+/g, ' ');
  ok(orch.indexOf("_sfsDetail4hResult[symbol] = hit; return Promise.resolve(hit);") >= 0,
     '15: the sync path returns Promise.resolve(hit) after writing phase/result itself');

  // empty symbol touches NO state at all
  reset();
  await sandbox._sfsEnsureDetail4hCandles('');
  eq(Object.keys(state('_sfsDetail4hPhase')).length, 0, '15: an empty symbol writes no phase');
  eq(Object.keys(state('_sfsDetail4hResult')).length, 0, '15: an empty symbol memoises no result');
  eq(Object.keys(state('_sfsDetail4hInflight')).length, 0, '15: an empty symbol registers no in-flight entry');

  // every terminal path settles the same way
  const terminals = [
    ['success', () => readQueue.push(READ.usable(25))],
    ['404', () => readQueue.push(READ.http(404))],
    ['sub limit', () => { sandbox.__subLimit = true; readQueue.push(READ.empty()); }],
    ['cooldown', () => { readQueue.push(READ.empty()); vm.runInContext('_sfsWarmupCooldown["CAT|4H"]=1000001;', sandbox); }],
    ['exhaustion', () => readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty())],
    ['symbol changed', () => { readQueue.push(READ.empty()); sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; }; }],
    ['exception', () => readQueue.push({ __throw: new Error('x') })],
  ];
  for (const [name, setup] of terminals) {
    reset(); setup();
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    eq(state('_sfsDetail4hPhase').CAT, null, '15: [' + name + '] final phase is null');
    ok(state('_sfsDetail4hResult').CAT === r, '15: [' + name + '] the returned object IS the memoised result');
    eq(state('_sfsDetail4hInflight').CAT, undefined, '15: [' + name + '] the in-flight entry is cleaned up');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('§16  IN-FLIGHT AND CONCURRENCY');
// ═════════════════════════════════════════════════════════════════════════════
{
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  const a = sandbox._sfsEnsureDetail4hCandles('CAT');
  const b = sandbox._sfsEnsureDetail4hCandles('CAT');
  const [ra, rb] = await Promise.all([a, b]);
  ok(ra === rb, '16: two concurrent calls for the same symbol resolve to the SAME result object');
  eq(readCalls.length, 4, '16: the deduped second call issues no extra read');
  eq(warmupCalls.length, 1, '16: the deduped second call issues no extra warmup');

  reset();
  readQueue.push(READ.usable(25), READ.usable(26));
  const [rc, rd] = await Promise.all([
    sandbox._sfsEnsureDetail4hCandles('CAT'),
    sandbox._sfsEnsureDetail4hCandles('IBM'),
  ]);
  ok(rc !== rd, '16: two different symbols run independently');
  eq(rc.symbol + '/' + rd.symbol, 'CAT/IBM', '16: each run keeps its own symbol');
  eq(readCalls.length, 2, '16: two symbols → two reads');

  // after cleanup a NEW call really re-runs
  reset();
  readQueue.push(READ.usable(25), READ.usable(25));
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(state('_sfsDetail4hInflight').CAT, undefined, '16: the in-flight entry is gone after settlement');
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(readCalls.length, 2, '16: a subsequent call re-runs the flow (no result-level memoisation)');

  // cleanup happens on every failure path
  for (const [name, setup] of [
    ['404', () => readQueue.push(READ.http(404))],
    ['sub limit', () => { sandbox.__subLimit = true; readQueue.push(READ.empty()); }],
    ['exception', () => readQueue.push({ __throw: new Error('x') })],
    ['symbol changed', () => { readQueue.push(READ.empty()); sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; }; }],
  ]) {
    reset(); setup();
    await sandbox._sfsEnsureDetail4hCandles('CAT');
    eq(Object.keys(state('_sfsDetail4hInflight')).length, 0, '16: [' + name + '] the in-flight map is emptied');
  }

  // a concurrent call while chartSymbol flips still shares the SAME promise
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; };
  const p1 = sandbox._sfsEnsureDetail4hCandles('CAT');
  const p2 = sandbox._sfsEnsureDetail4hCandles('CAT');
  const [x1, x2] = await Promise.all([p1, p2]);
  ok(x1 === x2 && x1.reason === 'SYMBOL_CHANGED',
     '16: a concurrent duplicate shares the outcome even when the symbol changes mid-flight');

  // the detail map and the generic map never collide
  reset();
  vm.runInContext('_sfsTfFetchInflight = { "CAT|4H": Promise.resolve(null) };', sandbox);
  readQueue.push(READ.usable(25));
  const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(r.ok, true, '16: a generic in-flight entry for CAT|4H does NOT dedupe the detail loader');
  eq(readCalls.length, 1, '16: the detail loader issued its own read regardless of the generic map');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§17  REASON MAPPING — _sfsMapDetail4hReason');
// ═════════════════════════════════════════════════════════════════════════════
{
  const map = sandbox._sfsMapDetail4hReason;
  eq(map('ENDPOINT_UNAVAILABLE', null), 'ENDPOINT_UNAVAILABLE', '17: ENDPOINT_UNAVAILABLE passes through');
  eq(map('FETCH_ERROR', null), 'FETCH_ERROR', '17: FETCH_ERROR passes through');
  eq(map('SUBSCRIPTION_LIMIT', null), 'SUBSCRIPTION_LIMIT_BACKOFF', '17: SUBSCRIPTION_LIMIT → SUBSCRIPTION_LIMIT_BACKOFF');
  eq(map('SUBSCRIPTION_LIMIT_BACKOFF', null), 'SUBSCRIPTION_LIMIT_BACKOFF', '17: SUBSCRIPTION_LIMIT_BACKOFF passes through');
  eq(map(null, { reason: 'candle subscription limit', count: 0 }), 'SUBSCRIPTION_LIMIT_BACKOFF', '17: /subscription/i in the read body → BACKOFF');
  eq(map(null, { reason: 'SUBSCRIPTION', count: 0 }), 'SUBSCRIPTION_LIMIT_BACKOFF', '17: the subscription probe is case-insensitive');
  eq(map(null, { reason: 'no_cache', count: 0 }), 'NO_CACHE', '17: "no_cache" → NO_CACHE');
  eq(map(null, { reason: 'no-cache', count: 0 }), 'NO_CACHE', '17: "no-cache" → NO_CACHE');
  eq(map(null, { reason: 'nocache', count: 0 }), 'NO_CACHE', '17: "nocache" → NO_CACHE');
  eq(map(null, { reason: 'not_cached', count: 0 }), 'NO_CACHE', '17: "not_cached" → NO_CACHE');
  eq(map(null, { reason: 'notcached', count: 0 }), 'NO_CACHE', '17: "notcached" → NO_CACHE');
  eq(map(null, { reason: 'empty', count: 0 }), 'CANDLES_NOT_READY', '17: an empty read → CANDLES_NOT_READY');
  eq(map(null, { reason: null, count: 1 }), 'INSUFFICIENT_30M_CANDLES', '17: count 1 → INSUFFICIENT_30M_CANDLES');
  eq(map(null, { reason: null, count: 21 }), 'INSUFFICIENT_30M_CANDLES', '17: count 21 → INSUFFICIENT_30M_CANDLES');
  eq(map(null, { reason: null, count: 22 }), 'CANDLES_NOT_READY', '17: count 22 is NOT insufficient (strict < 22 upper bound)');
  eq(map(null, { reason: null, count: 0 }), 'CANDLES_NOT_READY', '17: count 0 is NOT insufficient (strict > 0 lower bound)');
  eq(map(null, null), 'CANDLES_NOT_READY', '17: a null read → CANDLES_NOT_READY');
  eq(map(undefined, undefined), 'CANDLES_NOT_READY', '17: undefined/undefined → CANDLES_NOT_READY');
  eq(map('WHATEVER', null), 'CANDLES_NOT_READY', '17: an unknown internal reason falls through to CANDLES_NOT_READY');
  eq(map('nocache_internal', null), 'NO_CACHE', '17: the internal reason is probed too when no read body is present');
  eq(map(null, { count: null }), 'CANDLES_NOT_READY', '17: a null count is normalised to 0');
  // precedence
  eq(map('ENDPOINT_UNAVAILABLE', { reason: 'subscription', count: 5 }), 'ENDPOINT_UNAVAILABLE',
     '17: the internal reason takes precedence over the read body');
  eq(map(null, { reason: 'subscription no_cache', count: 5 }), 'SUBSCRIPTION_LIMIT_BACKOFF',
     '17: subscription is probed before no_cache');
  eq(map(null, { reason: 'no_cache', count: 5 }), 'NO_CACHE', '17: no_cache is probed before the count heuristic');

  // closure: the mapper emits exactly six values
  const outputs = new Set();
  for (const i of [null, undefined, 'ENDPOINT_UNAVAILABLE', 'FETCH_ERROR', 'SUBSCRIPTION_LIMIT', 'SUBSCRIPTION_LIMIT_BACKOFF', 'x'])
    for (const rd of [null, { reason: 'empty', count: 0 }, { reason: 'no_cache', count: 0 }, { reason: 'subscription', count: 0 }, { reason: null, count: 5 }])
      outputs.add(map(i, rd));
  eq([...outputs].sort().join(','),
     'CANDLES_NOT_READY,ENDPOINT_UNAVAILABLE,FETCH_ERROR,INSUFFICIENT_30M_CANDLES,NO_CACHE,SUBSCRIPTION_LIMIT_BACKOFF',
     '17: the mapper reason enum is exactly these six values');

  // the mapper is pure
  reset();
  const before = JSON.stringify({ p: state('_sfsDetail4hPhase'), r: state('_sfsDetail4hResult'),
                                  c: state('_sfsWarmupCooldown'), f: state('_sfsLastFailReason') });
  map('SUBSCRIPTION_LIMIT', { reason: 'x', count: 3 });
  eq(JSON.stringify({ p: state('_sfsDetail4hPhase'), r: state('_sfsDetail4hResult'),
                      c: state('_sfsWarmupCooldown'), f: state('_sfsLastFailReason') }), before,
     '17: the mapper mutates no global state (pure)');
  const src = stripComments(extractFn(APP, '_sfsMapDetail4hReason'));
  ok(src.indexOf('document') < 0 && src.indexOf('S.') < 0 && src.indexOf('await') < 0,
     '17: the mapper touches no DOM, no S, and is synchronous');

  // SYMBOL_CHANGED is orchestrator-only — the mapper never produces it.
  ok(!/SYMBOL_CHANGED/.test(src), '17: the mapper NEVER emits SYMBOL_CHANGED (it is assigned inline by the orchestrator)');
  const orchSrc = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles'));
  eq((orchSrc.match(/'SYMBOL_CHANGED'/g) || []).length, 2, '17: SYMBOL_CHANGED is assigned at exactly 2 orchestrator sites');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§18  UI COPY — _sfs4hDetailMessage (exact strings, byte for byte)');
// ═════════════════════════════════════════════════════════════════════════════
{
  const say = (phase, reason) => {
    reset();
    if (phase !== undefined) vm.runInContext('_sfsDetail4hPhase.CAT = ' + JSON.stringify(phase) + ';', sandbox);
    if (reason !== undefined) vm.runInContext('_sfsDetail4hResult.CAT = { reason: ' + JSON.stringify(reason) + ' };', sandbox);
    return sandbox._sfs4hDetailMessage('CAT');
  };
  const COPY = [
    ['loading', 'loading', undefined, 'Loading 4H…', '4H — loading'],
    ['warming', 'warming', undefined,
      'Warming 4H (deriving from backend 30M candles)…<br>This can take a few seconds.', '4H — warming pending'],
    ['subscription cap', null, 'SUBSCRIPTION_LIMIT_BACKOFF',
      'DXLink Candle subscription cap/backoff active.<br>4H will warm when capacity frees up.', '4H — subscription cap'],
    ['insufficient 30M', null, 'INSUFFICIENT_30M_CANDLES',
      'Insufficient 30M candles to build 4H yet.<br>Backend is still backfilling history.', '4H — insufficient 30M'],
    ['cache not ready', null, 'NO_CACHE',
      'Backend 4H cache not ready for CAT.<br>Try again shortly.', '4H — cache not ready'],
    ['endpoint unavailable', null, 'ENDPOINT_UNAVAILABLE',
      '4H backend endpoint unavailable.', '4H — endpoint unavailable'],
    ['fetch error', null, 'FETCH_ERROR',
      'Could not reach the backend candle cache for CAT 4H.<br>Check the connection and reopen.', '4H — fetch error'],
    ['candles not ready', null, 'CANDLES_NOT_READY',
      '4H warming pending — backend cache not ready yet.<br>Try again in a moment.', '4H — warming pending'],
    ['symbol changed → default', null, 'SYMBOL_CHANGED',
      '4H warming pending — data not ready yet.', '4H — warming pending'],
    ['unknown reason → default', null, 'TOTALLY_UNKNOWN',
      '4H warming pending — data not ready yet.', '4H — warming pending'],
    ['no result at all → default', undefined, undefined,
      '4H warming pending — data not ready yet.', '4H — warming pending'],
    ['null reason → default', null, null,
      '4H warming pending — data not ready yet.', '4H — warming pending'],
  ];
  for (const [name, phase, reason, msg, label] of COPY) {
    const st = say(phase, reason);
    eq(st.msg, msg, '18: [' + name + '] message copy is exact');
    eq(st.label, label, '18: [' + name + '] label copy is exact');
    eq(Object.keys(st).sort().join(','), 'label,msg', '18: [' + name + '] the helper returns exactly { msg, label }');
  }
  // phase wins over a stored reason
  reset();
  vm.runInContext('_sfsDetail4hPhase.CAT = "loading"; _sfsDetail4hResult.CAT = { reason: "FETCH_ERROR" };', sandbox);
  eq(sandbox._sfs4hDetailMessage('CAT').msg, 'Loading 4H…', '18: an active phase takes precedence over the last reason');
  vm.runInContext('_sfsDetail4hPhase.CAT = "warming";', sandbox);
  eq(sandbox._sfs4hDetailMessage('CAT').label, '4H — warming pending', '18: "warming" also outranks the stored reason');
  vm.runInContext('_sfsDetail4hPhase.CAT = "bogus";', sandbox);
  eq(sandbox._sfs4hDetailMessage('CAT').msg,
     'Could not reach the backend candle cache for CAT 4H.<br>Check the connection and reopen.',
     '18: an unrecognised phase falls through to the reason branch');
  // symbol interpolation
  reset();
  vm.runInContext('_sfsDetail4hResult.ZZZ = { reason: "NO_CACHE" };', sandbox);
  eq(sandbox._sfs4hDetailMessage('ZZZ').msg, 'Backend 4H cache not ready for ZZZ.<br>Try again shortly.',
     '18: NO_CACHE interpolates the requested symbol');
  eq(sandbox._sfs4hDetailMessage('UNKNOWN_SYM').msg, '4H warming pending — data not ready yet.',
     '18: an untracked symbol yields the default copy without throwing');
  // no "Run scan first" anywhere in the detail copy
  ok(!/Run scan first/i.test(extractFn(APP, '_sfs4hDetailMessage')), '18: the detail copy never says "Run scan first"');
  // labels all start with "4H"
  reset();
  for (const [, , , , label] of COPY) ok(label.indexOf('4H') === 0, '18: label "' + label + '" is 4H-scoped');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§19  DOM RENDERING — _sfsRender4hDetailState');
// ═════════════════════════════════════════════════════════════════════════════
{
  const render = stripComments(extractFn(APP, '_sfsRender4hDetailState'));
  const ids = [...new Set((render.match(/getElementById\('([^']+)'\)/g) || []).map((s) => s.slice(16, -2)))];
  eq(ids.sort().join(','), 'sfs-big-wrap-4h,sfs-sqzlbl-4h', '19: the renderer touches EXACTLY two DOM ids');
  ok(render.indexOf('innerHTML') >= 0 && render.indexOf('textContent') >= 0 && render.indexOf('style.color') >= 0,
     '19: mutations are limited to innerHTML, textContent and style.color');
  ok(!/classList|setAttribute|style\.display|style\.visibility|removeChild|appendChild/.test(render),
     '19: the renderer changes NO classes, attributes, display or visibility, and adds/removes no nodes');

  // happy path
  reset();
  vm.runInContext('_sfsDetail4hPhase.CAT = "loading";', sandbox);
  sandbox._sfsRender4hDetailState('CAT');
  eq(els['sfs-big-wrap-4h'].innerHTML, '<div class="dss-no-data">Loading 4H…</div>',
     '19: the wrap receives the message inside a .dss-no-data div');
  eq(els['sfs-sqzlbl-4h'].textContent, '4H — loading', '19: the squeeze label receives the label copy');
  eq(els['sfs-sqzlbl-4h'].style.color, 'var(--tx3)', '19: the squeeze label colour is set to var(--tx3)');

  // stale symbol → no DOM touch at all
  reset();
  sandbox.S.squeezeFireScanner.chartSymbol = 'IBM';
  sandbox._sfsRender4hDetailState('CAT');
  eq(Object.keys(els).length, 0, '19: a stale symbol short-circuits BEFORE getElementById (zero DOM access)');

  // missing scanner → guarded, no throw
  reset();
  sandbox.S.squeezeFireScanner = null;
  let threw = null;
  try { sandbox._sfsRender4hDetailState('CAT'); } catch (e) { threw = e; }
  eq(threw, null, '19: a missing S.squeezeFireScanner is guarded — the renderer does not throw');
  eq(Object.keys(els).length, 0, '19: …and touches no DOM');

  // missing wrap → returns early, label untouched
  reset();
  missingEls.add('sfs-big-wrap-4h');
  threw = null;
  try { sandbox._sfsRender4hDetailState('CAT'); } catch (e) { threw = e; }
  eq(threw, null, '19: a missing wrap element does not throw');
  eq(els['sfs-sqzlbl-4h'], undefined, '19: a missing wrap stops the renderer BEFORE the label is touched');

  // partial DOM: wrap present, label missing
  reset();
  missingEls.add('sfs-sqzlbl-4h');
  vm.runInContext('_sfsDetail4hResult.CAT = { reason: "FETCH_ERROR" };', sandbox);
  threw = null;
  try { sandbox._sfsRender4hDetailState('CAT'); } catch (e) { threw = e; }
  eq(threw, null, '19: a missing label element does not throw');
  ok(els['sfs-big-wrap-4h'].innerHTML.indexOf('Could not reach the backend candle cache') >= 0,
     '19: the wrap is still painted when only the label is missing');

  // an already-drawn chart is never overwritten
  reset();
  el('sfs-big-wrap-4h').__canvas = true;
  els['sfs-big-wrap-4h'].innerHTML = '<canvas></canvas>';
  vm.runInContext('_sfsDetail4hPhase.CAT = "warming";', sandbox);
  sandbox._sfsRender4hDetailState('CAT');
  eq(els['sfs-big-wrap-4h'].innerHTML, '<canvas></canvas>', '19: a wrap already containing a <canvas> is LEFT ALONE');
  eq(els['sfs-sqzlbl-4h'], undefined, '19: …and the label is not touched either');

  // no result, no phase → default copy still renders
  reset();
  sandbox._sfsRender4hDetailState('CAT');
  eq(els['sfs-big-wrap-4h'].innerHTML, '<div class="dss-no-data">4H warming pending — data not ready yet.</div>',
     '19: with no phase and no result the default copy is rendered');

  // idempotent on repeat
  reset();
  vm.runInContext('_sfsDetail4hResult.CAT = { reason: "ENDPOINT_UNAVAILABLE" };', sandbox);
  sandbox._sfsRender4hDetailState('CAT');
  const once = els['sfs-big-wrap-4h'].innerHTML;
  sandbox._sfsRender4hDetailState('CAT');
  eq(els['sfs-big-wrap-4h'].innerHTML, once, '19: repeated calls are idempotent (full innerHTML replacement)');

  // the orchestrator's single render call, observed live
  reset();
  const renders = [];
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  sandbox.__warmupImpl = () => { renders.push(els['sfs-big-wrap-4h'] ? els['sfs-big-wrap-4h'].innerHTML : null); return Promise.resolve({ ok: true }); };
  await sandbox._sfsEnsureDetail4hCandles('CAT');
  eq(renders[0], '<div class="dss-no-data">Warming 4H (deriving from backend 30M candles)…<br>This can take a few seconds.</div>',
     '19: the orchestrator paints the "warming" copy before firing the warmup');

  // a throwing DOM is swallowed by the orchestrator and becomes FETCH_ERROR
  reset();
  readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty());
  sandbox.document = { getElementById: () => { throw new Error('dom exploded'); } };
  const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
  sandbox.document = { getElementById: (id) => el(id) };
  eq(r.reason, 'FETCH_ERROR', '19: ASYMMETRY — a renderer throw is caught by the orchestrator and reported as FETCH_ERROR');
  eq(r.error, 'dom exploded', '19: the DOM error message reaches result.error');
  eq(warmupCalls.length, 0, '19: a renderer throw aborts the run BEFORE the warmup is fired');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§20  FAILURE MATRIX — one row per scenario, fully observed');
// ═════════════════════════════════════════════════════════════════════════════
{
  const ROWS = [
    ['empty symbol',        () => {},                                                                    ''],
    ['sync hit',            () => { sandbox.__sync = { candles: series(25), path: 'sfsCache' }; },        'CAT'],
    ['backend success',     () => readQueue.push(READ.usable(25)),                                       'CAT'],
    ['404',                 () => readQueue.push(READ.http(404)),                                        'CAT'],
    ['500',                 () => readQueue.push(READ.http(500)),                                        'CAT'],
    ['gate closed',         () => readQueue.push(READ.gateClosed('auth_not_ready')),                     'CAT'],
    ['subscription limit',  () => { sandbox.__subLimit = true; readQueue.push(READ.empty()); },           'CAT'],
    ['cooldown active',     () => { readQueue.push(READ.empty()); vm.runInContext('_sfsWarmupCooldown["CAT|4H"]=1000001;', sandbox); }, 'CAT'],
    ['warmup http failure', () => { sandbox.__warmupImpl = () => Promise.resolve({ ok: false, status: 500 });
                                    readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty()); }, 'CAT'],
    ['warmup net reject',   () => { sandbox.__warmupImpl = () => Promise.reject(new Error('net'));
                                    readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty()); }, 'CAT'],
    ['reread success',      () => readQueue.push(READ.empty(), READ.empty(), READ.usable(30)),           'CAT'],
    ['reread exhaustion',   () => readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty()), 'CAT'],
    ['reread reject',       () => readQueue.push(READ.empty(), { __throw: new Error('boom') }),           'CAT'],
    ['symbol changed',      () => { readQueue.push(READ.empty()); sandbox.__onSleep = () => { sandbox.S.squeezeFireScanner.chartSymbol = 'IBM'; }; }, 'CAT'],
    ['DOM missing',         () => { missingEls.add('sfs-big-wrap-4h'); missingEls.add('sfs-sqzlbl-4h');
                                    readQueue.push(READ.empty(), READ.empty(), READ.empty(), READ.empty()); }, 'CAT'],
    ['logger throws',       () => { sandbox.debugLog = () => { throw new Error('log boom'); };
                                    readQueue.push(READ.usable(25)); },                                  'CAT'],
    ['sync helper throws',  () => { sandbox.__syncThrows = true; },                                      'CAT'],
    ['read helper rejects', () => readQueue.push({ __throw: new Error('read down') }),                   'CAT'],
  ];
  const matrix = [];
  for (const [name, setup, sym] of ROWS) {
    reset(); setup();
    let out = null, threw = null;
    try { out = await sandbox._sfsEnsureDetail4hCandles(sym); } catch (e) { threw = e; }
    sandbox.debugLog = (ns, m) => logCalls.push(['log', ns, m]);
    matrix.push({
      name, threw: threw ? String(threw.message) : null,
      reads: readCalls.length, warms: warmupCalls.length, sleeps: sleepCalls.length,
      cacheWrite: !!(sandbox.S.squeezeFireScanner && sandbox.S.squeezeFireScanner.chartCacheCandles &&
                     sandbox.S.squeezeFireScanner.chartCacheCandles[sym] &&
                     sandbox.S.squeezeFireScanner.chartCacheCandles[sym]['4H']),
      cooldown: state('_sfsWarmupCooldown')[sym + '|4H'] !== undefined,
      phase: sym ? state('_sfsDetail4hPhase')[sym] : undefined,
      reason: out ? out.reason : 'THREW', ok: out ? out.ok : 'THREW',
    });
  }
  const row = (n) => matrix.find((m) => m.name === n);
  const sig = (n) => { const m = row(n);
    return [m.reads, m.warms, m.sleeps, m.cacheWrite, m.cooldown, m.phase, m.reason, m.ok, m.threw].map(String).join('|'); };

  eq(sig('empty symbol'),        '0|0|0|false|false|undefined|null|false|null',                  '20: empty symbol');
  eq(sig('sync hit'),            '0|0|0|false|false|null|null|true|null',                        '20: sync hit');
  eq(sig('backend success'),     '1|0|0|true|false|null|null|true|null',                         '20: backend success');
  eq(sig('404'),                 '1|0|0|false|false|null|ENDPOINT_UNAVAILABLE|false|null',       '20: 404');
  eq(sig('500'),                 '1|0|0|false|false|null|FETCH_ERROR|false|null',                '20: 500');
  eq(sig('gate closed'),         '1|0|0|false|false|null|FETCH_ERROR|false|null',                '20: gate closed');
  eq(sig('subscription limit'),  '1|0|0|false|true|null|SUBSCRIPTION_LIMIT_BACKOFF|false|null',  '20: subscription limit');
  eq(sig('cooldown active'),     '1|0|0|false|true|null|CANDLES_NOT_READY|false|null',           '20: cooldown active');
  eq(sig('warmup http failure'), '4|1|3|false|true|null|CANDLES_NOT_READY|false|null',           '20: warmup http failure');
  eq(sig('warmup net reject'),   '4|1|3|false|true|null|CANDLES_NOT_READY|false|null',           '20: warmup net reject');
  eq(sig('reread success'),      '3|1|2|true|false|null|null|true|null',                         '20: reread success');
  eq(sig('reread exhaustion'),   '4|1|3|false|true|null|CANDLES_NOT_READY|false|null',           '20: reread exhaustion');
  eq(sig('reread reject'),       '2|1|1|false|false|null|FETCH_ERROR|false|null',                '20: reread reject');
  eq(sig('symbol changed'),      '1|1|1|false|false|null|SYMBOL_CHANGED|false|null',             '20: symbol changed');
  eq(sig('DOM missing'),         '4|1|3|false|true|null|CANDLES_NOT_READY|false|null',           '20: DOM missing is survivable');
  eq(sig('logger throws'),       '1|0|0|true|false|null|FETCH_ERROR|true|null',
     '20: ASYMMETRY — a debugLog throw after a SUCCESSFUL read yields a self-contradictory result: ok stays true while reason becomes FETCH_ERROR, and the candles are already in the cache');
  eq(sig('sync helper throws'),  '0|0|0|false|false|undefined|THREW|THREW|sync boom',
     '20: ASYMMETRY — a throw from the shared sync helper ESCAPES: it runs before the try block, so the promise rejects');
  eq(sig('read helper rejects'), '1|0|0|false|false|null|FETCH_ERROR|false|null',                '20: read helper rejects');

  ok(matrix.filter((m) => m.threw).length === 1,
     '20: exactly ONE scenario escapes as a rejection — the pre-try sync-source throw');
  ok(matrix.filter((m) => m.name !== 'empty symbol' && m.name !== 'sync helper throws').every((m) => m.phase === null),
     '20: every scenario that enters the loader settles phase to null');
}

// ═════════════════════════════════════════════════════════════════════════════
section('§21  NO SCOPE CREEP — the loader stays inside its documented envelope');
// ═════════════════════════════════════════════════════════════════════════════
{
  const block = stripComments(
    [extractFn(APP, '_sfsDetail4hBaseResult'), extractFn(APP, '_sfsMapDetail4hReason'),
     extractFn(APP, '_sfs4hDetailMessage'), extractFn(APP, '_sfsRender4hDetailState'),
     extractFn(APP, '_sfsStoreDetail4h'), extractFn(APP, '_sfsEnsureDetail4hCandles')].join('\n'));
  for (const [pat, label] of [
    [/scanner\/run|_sfsRunScan/, 'no /scanner/run trigger'],
    [/yahoo/i, 'no Yahoo source'],
    [/new\s+WebSocket/, 'no WebSocket'],
    [/_ensureCandleSubscription|_ensure30MSubscription/, 'no frontend Candle subscription'],
    [/fetch\s*\(/, 'no direct fetch (reads go through _sfsFetchBackendCandles)'],
    [/localStorage|sessionStorage/, 'no storage access'],
    [/setInterval/, 'no interval timer'],
    [/'1D'|"1D"/, 'no 1D timeframe handling'],
  ]) ok(!pat.test(block), '21: ' + label);
  ok(!/_sfsEnsureTfCandles|_sfsSpyReadOnly|_sfsEnsureChartData/.test(block),
     '21: the detail block never delegates to the generic ensure, the SPY resolver or the chart hydrator');
  const orch = stripComments(extractFn(APP, '_sfsEnsureDetail4hCandles'));
  eq((orch.match(/_sfsWarmupBatch\(/g) || []).length, 1, '21: exactly one warmup call site in the source');
  eq((orch.match(/_sfsFetchBackendCandles\(/g) || []).length, 2, '21: exactly two read call sites in the source');
  eq((orch.match(/_sfsSleep\(/g) || []).length, 1, '21: exactly one sleep call site in the source');
}

// ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('\nFAILURES:\n  - ' + failures.join('\n  - ')); }
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
