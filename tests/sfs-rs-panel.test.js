'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Squeeze Fire RS-vs-SPY panel — SPY resolved without frontend Candle subscriptions
// and with precise failure reasons.
//
// Regression fixed here: a previous revision proactively WARMED SPY 1D/4H on every
// SFS chart open (and from the RS panel), which opened DXLink Candle subscriptions
// and breached the feed limit ("Your subscription size for event type 'Candle' is
// too big") — starving even the SPY 1D benchmark buffer so BOTH 1D and 4H RS
// failed.
//
// Now: SFS never opens frontend Candle subscriptions for SPY. _sfsDrawRsPanel resolves SPY via _sfsSpyReadOnly
//   (1) in-memory SFS cache / live DXLink buffer (sync, no network), then
//   (2) ONE deduped + cooldown-gated read of the centralized backend candle cache, then
//   (3) at most ONE safe single-symbol backend warmup for SPY (30M for 4H).
// If SPY is unavailable, it shows a precise 'RS: SPY <tf> not loaded' and does not
// retry-storm. The candle-chart 1D/4H price parity (via _sfsResolveRenderPrice) is
// independent of all this and unaffected.
//
// These tests extract the REAL functions and drive them in a vm sandbox. Stubs for
// _sfsEnsureTfCandles / _sfsWarmupBatch RECORD calls so the tests can prove SFS
// never opens frontend Candle subscriptions for SPY.
//
// Run: node tests/sfs-rs-panel.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
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
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }
const flush = () => new Promise((r) => setTimeout(r, 0));

function series(lastClose, n) {
  n = n || 40; const arr = []; let prev = lastClose - n;
  for (let i = 0; i < n; i++) {
    const c = (i === n - 1) ? lastClose : prev + 1;
    if (i !== n - 1) prev = c;
    arr.push({ time: i + 1, open: c - 0.3, high: c + 1, low: c - 1, close: c, volume: 1000 });
  }
  return arr;
}
const lastClose = (a) => a[a.length - 1].close;

// ── Sandbox: real read-only RS stack + RECORDING stubs ───────────────────────
const els = {};
const pfCalls = [];        // _pfDrawRsPanel
const getCalls = [];       // _sfsFetchBackendCandles  (pure GET — allowed)
const ensureCalls = [];    // _sfsEnsureTfCandles      (warmup path — must NOT fire for SPY)
const warmupCalls = [];    // _sfsWarmupBatch          (subscription — must NOT fire for SPY)
const diagCalls = [];      // _recordCandleSubscriptionRequest diagnostics

const sandbox = {
  console, JSON, Object, Math, isFinite, parseFloat, NaN, Promise, Date, setTimeout: (fn) => { fn(); return 1; },
  document: { getElementById: (id) => (els[id] || (els[id] = { innerHTML: '', appendChild() {}, offsetWidth: 280, offsetHeight: 48 })) },
  debugLog() {}, debugWarn() {},
  isRTHOpen: () => true,
  S: { scanData: [], dxlinkStatus: {}, squeezeFireScanner: { chartSymbol: 'MSFT', chartCacheCandles: {} } },
  // Module-level state declared alongside _sfsSpyReadOnly in index.html.
  _sfsSpyReadInflight: {}, _sfsSpyReadCooldown: {}, SFS_SPY_READ_COOLDOWN_MS: 30000, SFS_SPY_WARM_COOLDOWN_MS: 120000, SFS_SPY_POST_WARM_READ_ATTEMPTS: 4, SFS_SPY_POST_WARM_RETRY_DELAY_MS: 0,
  // Controllable in-memory SPY buffers (the always-on benchmark sources).
  __spy1dBuf: null, __spy4hBuf: null,
  _rsGetDailyCandles: (sym) => (sym === 'SPY' ? sandbox.__spy1dBuf : null),
  getFourHourCandles: (sym) => (sym === 'SPY' ? sandbox.__spy4hBuf : null),
  // Controllable centralized backend candle cache READ (pure GET — never subscribes).
  __backendRead: { ok: true, candles: [] },
  _sfsFetchBackendCandles: function (sym, tf) {
    getCalls.push(sym + '|' + tf);
    if (Array.isArray(sandbox.__backendRead)) return Promise.resolve(sandbox.__backendRead.shift() || { ok: true, candles: [] });
    return Promise.resolve(sandbox.__backendRead);
  },
  // These MUST NOT be called for SPY by the RS path — recorded to prove it.
  _sfsEnsureTfCandles: function (sym, tf) { ensureCalls.push(sym + '|' + tf); return Promise.resolve(null); },
  _sfsWarmupBatch: function (syms, tfs, opts) { warmupCalls.push({ syms: syms || [], tfs: tfs || [], opts: opts || {} }); return Promise.resolve({ ok: true }); },
  _recordCandleSubscriptionRequest: function (m) { diagCalls.push(m); },
  _sfsCandleSubLimitActive: function () { return false; },
  _pfDrawRsPanel: function (rsId, candles, spy, viewLen) { pfCalls.push({ rsId, candles, spy, viewLen }); },
};
vm.createContext(sandbox);
// The SPY read-only resolver functions (_sfsSpyDiag / _sfsPromoteSpyCandles /
// _sfsSpyReadResultContext / _sfsSpyReadOnly) were extracted VERBATIM to
// js/services/sfs-candle-spy-read.js; the resolver STATE (_sfsSpyReadInflight /
// _sfsSpyReadCooldown), the SFS_SPY_* constants and the shared _sfsSleep helper stay in
// the monolith. Rebuild the block from the monolith state+constants+_sfsSleep slice plus
// the four resolver functions BY NAME — same code, only its physical location moved.
const spyReadBlock = [
  HTML.slice(HTML.indexOf('var _sfsSpyReadInflight'), HTML.indexOf('// Draw the RS-vs-SPY panel')),
  extractFn(HTML, '_sfsSpyDiag'),
  extractFn(HTML, '_sfsPromoteSpyCandles'),
  extractFn(HTML, '_sfsSpyReadResultContext'),
  extractFn(HTML, '_sfsSpyReadOnly'),
].join('\n');
vm.runInContext(
  ['patchLastCandleWithLivePrice', '_patchLivePrice', '_sfsCandlesUsable',
   '_sfsCandlesFromSyncSource', '_sfsRsPanelMsg'].map((n) => extractFn(HTML, n)).join('\n') +
   '\n' + spyReadBlock + '\n' + extractFn(HTML, '_sfsDrawRsPanel'),
  sandbox
);

function reset() {
  pfCalls.length = 0; getCalls.length = 0; ensureCalls.length = 0; warmupCalls.length = 0; diagCalls.length = 0;
  for (const k in els) delete els[k];
  sandbox.S.squeezeFireScanner.chartSymbol = 'MSFT';
  sandbox.S.squeezeFireScanner.chartCacheCandles = {};
  sandbox.__spy1dBuf = null; sandbox.__spy4hBuf = null;
  sandbox.__backendRead = { ok: true, candles: [] };
  sandbox._sfsSpyReadInflight = {}; sandbox._sfsSpyReadCooldown = {}; sandbox.SFS_SPY_POST_WARM_RETRY_DELAY_MS = 0; sandbox.SFS_SPY_POST_WARM_READ_ATTEMPTS = 4;
}
const msgOf = (rsId) => (els[rsId] ? els[rsId].innerHTML : '');

async function main() {
  const symCandles = series(441.31);

  section('1. SPY already in the SFS cache → RS draws instantly, ZERO network/warmup');
  {
    reset();
    sandbox.S.squeezeFireScanner.chartCacheCandles = { SPY: { '4H': series(500) } };
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush();
    ok(pfCalls.length === 1 && lastClose(pfCalls[0].candles) === 441.31,
       '1: RS drawn with the patched symbol candles');
    ok(getCalls.length === 0, '1: no backend GET (in-memory cache hit)');
    ok(ensureCalls.length === 0 && warmupCalls.length === 0, '1: no ensure, no warmup');
  }

  section('2. SPY in the live DXLink buffer → RS draws, no GET / warmup');
  {
    reset();
    sandbox.__spy4hBuf = series(500);
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush();
    ok(pfCalls.length === 1 && getCalls.length === 0 && warmupCalls.length === 0,
       '2: drawn from the buffer; no backend GET, no warmup');
  }

  section('3. SPY missing → precise message NOW, then upgrade via ONE backend cache GET');
  {
    reset();
    sandbox.__backendRead = { ok: true, candles: series(500) };   // backend cache HAS SPY 4H
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    ok(/RS: SPY 4H not loaded/.test(msgOf('sfs-rs-4h')),
       '3: shows precise "RS: SPY 4H not loaded" immediately (no "loading"/warmup implication)');
    await flush();
    ok(getCalls.length === 1 && getCalls[0] === 'SPY|4H', '3: exactly ONE backend cache GET for SPY 4H');
    ok(ensureCalls.length === 0 && warmupCalls.length === 0, '3: cache hit needs no warmup or frontend subscription');
    ok(pfCalls.length === 1 && lastClose(pfCalls[0].candles) === 441.31,
       '3: upgrades to RS once the cached SPY arrives (patched symbol candles)');
    // Promoted into the SFS cache → a later draw is a pure sync hit (no 2nd GET).
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush();
    ok(getCalls.length === 1, '3: SPY promoted to the SFS cache → redraw needs no further GET');
  }

  section('4. SPY truly unavailable → tiny SPY-only warmup, precise message, and NO retry storm');
  {
    reset();
    sandbox.__backendRead = { ok: true, candles: [] };           // backend cache empty too
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush(); await flush();
    ok(pfCalls.length === 0, '4: RS not drawn (SPY unavailable after safe attempt)');
    ok(/RS: SPY 4H not loaded/.test(msgOf('sfs-rs-4h')), '4: precise "RS: SPY 4H not loaded"');
    ok(ensureCalls.length === 0, '4: no frontend ensure/subscription call');
    ok(warmupCalls.length === 1 && warmupCalls[0].syms.join(',') === 'SPY' && warmupCalls[0].tfs.join(',') === '30M',
       '4: missing 4H uses exactly one SPY-only 30M backend warmup');
    ok(diagCalls.some((d) => d.action === 'backend_reread' && d.context && d.context.phase === 'post_warmup'),
       '4: post-warmup SPY 4H reread attempts are diagnosed');
    ok(diagCalls.some((d) => d.detail === 'final_null' && d.context && d.context.finalReason),
       '4: final unavailable reason is recorded in diagnostics');
    const afterGet = getCalls.length, afterWarm = warmupCalls.length;
    // Redraw immediately (cooldown active) → must NOT issue another GET or warmup (no storm).
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush();
    ok(getCalls.length === afterGet && warmupCalls.length === afterWarm, '4: cooldown-gated — redraw issues no new GET/warmup');
  }

  section('5. SPY 4H appears on a later post-warmup reread → promote and redraw');
  {
    reset();
    sandbox.__backendRead = [
      { ok: true, status: 200, count: 0, candles: [], reason: 'empty' },
      { ok: true, status: 200, count: 0, candles: [], reason: 'empty' },
      { ok: true, status: 200, count: 40, candles: series(500) }
    ];
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush(); await flush(); await flush();
    ok(warmupCalls.length === 1 && warmupCalls[0].syms.join(',') === 'SPY' && warmupCalls[0].tfs.join(',') === '30M',
       '5: delayed availability still uses exactly one SPY-only 30M backend warmup');
    ok(getCalls.filter((x) => x === 'SPY|4H').length >= 3,
       '5: performs first read plus post-warmup reread attempts for SPY 4H');
    ok(sandbox.S.squeezeFireScanner.chartCacheCandles.SPY && sandbox.S.squeezeFireScanner.chartCacheCandles.SPY['4H'] &&
       lastClose(sandbox.S.squeezeFireScanner.chartCacheCandles.SPY['4H']) === 500,
       '5: successful SPY 4H candles are promoted into SFS cache');
    ok(pfCalls.length === 1 && lastClose(pfCalls[0].spy) === 500,
       '5: _sfsDrawRsPanel redraws the 4H RS panel after delayed SPY 4H availability');
    ok(diagCalls.some((d) => d.action === 'promoted' && d.context && d.context.path === 'post_warmup_reread_attempt_2'),
       '5: diagnostics identify which post-warmup reread promoted SPY 4H');
  }

  section('6. In-flight dedup: two near-simultaneous draws share ONE GET');
  {
    reset();
    sandbox.__backendRead = { ok: true, candles: series(500) };
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);   // before the first resolves
    await flush();
    ok(getCalls.length === 1, '6: concurrent draws deduplicate to a single backend GET');
  }

  section('7. Symbol 4H series too short → precise "RS: symbol 4H not loaded", no GET at all');
  {
    reset();
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', series(441.31, 10), 60);
    await flush();
    ok(pfCalls.length === 0 && /symbol 4H not loaded/.test(msgOf('sfs-rs-4h')),
       '7: precise symbol-missing reason');
    ok(getCalls.length === 0 && ensureCalls.length === 0 && warmupCalls.length === 0,
       '7: short symbol series wastes no GET / ensure / warmup');
  }

  section('8. Nav guard: navigating away before the GET resolves → no late draw');
  {
    reset();
    sandbox.__backendRead = { ok: true, candles: series(500) };
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    sandbox.S.squeezeFireScanner.chartSymbol = 'AAPL';
    await flush();
    ok(pfCalls.length === 0, '8: the late SPY arrival does not draw RS for the abandoned symbol');
  }

  section('9. 1D path: same read-only behavior (SPY 1D from the benchmark buffer)');
  {
    reset();
    sandbox.__spy1dBuf = series(500);
    sandbox._sfsDrawRsPanel('MSFT', '1D', 'sfs-rs-1d', symCandles, 60);
    await flush();
    ok(pfCalls.length === 1 && getCalls.length === 0 && warmupCalls.length === 0,
       '9: 1D RS draws from the SPY 1D buffer with no GET/warmup');
  }

  section('10. STATIC: SFS never opens frontend Candle subscriptions for SPY');
  {
    const ensureChartData = HTML.slice(HTML.indexOf('async function _sfsEnsureChartData'),
                                       HTML.indexOf('async function _sfsEnsureChartData') + 1400);
    const draw = stripComments(extractFn(HTML, '_sfsDrawRsPanel'));
    const readOnly = stripComments(extractFn(HTML, '_sfsSpyReadOnly'));
    ok(!/_sfsEnsureTfCandles\(\s*'SPY'/.test(ensureChartData),
       '10: _sfsEnsureChartData does NOT frontend-ensure SPY');
    ok(!/_sfsEnsureTfCandles|_ensureCandleSubscription|_ensure30MSubscription/.test(draw),
       '10: _sfsDrawRsPanel never calls frontend ensure/subscription helpers');
    ok(!/_sfsEnsureTfCandles|_ensureCandleSubscription|_ensure30MSubscription/.test(readOnly),
       '10: _sfsSpyReadOnly never opens frontend Candle subscriptions');
    ok(/_sfsFetchBackendCandles\(\s*'SPY'/.test(readOnly) && /_sfsWarmupBatch\(\s*\[\s*'SPY'\s*\]/.test(readOnly) && /_sfsSpyReadCooldown/.test(readOnly),
       '10: _sfsSpyReadOnly uses deduped GET plus SPY-only cooldown-gated backend warmup');
    ok(!/yahoo/i.test(readOnly), '10: no Yahoo / external source introduced');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
