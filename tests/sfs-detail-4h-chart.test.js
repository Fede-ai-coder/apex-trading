'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Squeeze Fire DETAIL CHART — 4H on-demand loader.
//
// Root issue fixed: opening a Squeeze Fire detail chart for a symbol whose 4H
// series is not yet in the backend candle cache showed a misleading
// "Backend candles unavailable for <SYM> 4H. Run scan first or data not ready."
// 1D comes warm from the scan/snapshot, but backend 4H is derived server-side from
// 30M candles ON DEMAND and can lag the warmup response. The old path warmed once
// then did a SINGLE immediate re-read (too early) and set a 30s cooldown.
//
// The new _sfsEnsureDetail4hCandles is single-symbol, deduped per symbol, reads the
// backend cache (GET, no subscription), fires AT MOST one controlled single-symbol
// 30M warmup (only when the Candle subscription cap/backoff is NOT active — PR #116
// safety), then re-reads a BOUNDED number of times with backoff, and classifies a
// precise reason on failure. It never triggers /scanner/run, never warms the
// universe, opens no frontend subscription, and adds no REST/Yahoo fallback.
//
// These tests extract the REAL loader block and drive it in a vm sandbox with
// recording stubs for the backend read/warmup so we can prove the contract.
//
// Run: node tests/sfs-detail-4h-chart.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

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
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// >= 22 usable candles (the _sfsCandlesUsable minimum) ending on a finite close.
function series(n) {
  n = n || 25; const arr = [];
  for (let i = 0; i < n; i++) arr.push({ time: i + 1, open: 10 + i, high: 12 + i, low: 9 + i, close: 11 + i, volume: 100 });
  return arr;
}

// ── Sandbox: real loader block + recording backend stubs ─────────────────────
const els = {};
const readQueue = [];      // queued _sfsFetchBackendCandles results (FIFO)
const readCalls = [];      // every backend GET
const warmupCalls = [];    // every _sfsWarmupBatch (controlled subscription)

function fakeEl() { return { innerHTML: '', textContent: '', style: {}, querySelector: () => null }; }

const sandbox = {
  console, JSON, Object, Math, String, Number, isFinite, parseFloat, Date, Promise,
  setTimeout: (fn) => { fn(); return 1; },
  debugLog() {}, debugWarn() {},
  window: {},
  document: { getElementById: (id) => (els[id] || (els[id] = fakeEl())) },
  S: { squeezeFireScanner: { chartSymbol: 'CAT', chartCacheCandles: {} } },
  // module-level state the loader block reads/writes (also declared inside the block,
  // but provided here so other extracted helpers share the same objects)
  _sfsLastFailReason: {}, _sfsWarmupCooldown: {}, SFS_WARMUP_COOLDOWN_MS: 30000,
  _sfsTfFetchInflight: {},
  // controllable externs
  __sync: null,
  __subLimit: false,
  __flipOnSleep: null,
  _sfsCandlesFromSyncSource: () => sandbox.__sync,
  _sfsCandleSubLimitActive: () => sandbox.__subLimit,
  _sfsSleep: () => { if (sandbox.__flipOnSleep) { sandbox.S.squeezeFireScanner.chartSymbol = sandbox.__flipOnSleep; sandbox.__flipOnSleep = null; } return Promise.resolve(); },
  _sfsFetchBackendCandles: (sym, tf) => { readCalls.push(sym + '|' + tf); return Promise.resolve(readQueue.length ? readQueue.shift() : { ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); },
  _sfsWarmupBatch: (syms, tfs, opts) => { warmupCalls.push({ syms: syms || [], tfs: tfs || [], opts: opts || {} }); return Promise.resolve({ ok: true, status: 200, sentSymbols: syms }); },
};
vm.createContext(sandbox);

// Real _sfsCandlesUsable (>= 22 bars, finite last close) + the whole detail-4H block.
//
// The four detail-4H CORE functions (_sfsDetail4hBaseResult / _sfsMapDetail4hReason /
// _sfsStoreDetail4h / _sfsEnsureDetail4hCandles) were extracted VERBATIM to
// js/services/sfs-candle-detail-4h.js, so the monolith slice below no longer holds
// them. The detail STATE (_sfsDetail4hInflight / _sfsDetail4hPhase /
// _sfsDetail4hResult) and the two SFS_DETAIL_4H_POST_WARM_* constants now live in
// js/services/sfs-config-state.js and are taken from there, anchored on the first
// and last declaration of the detail group so the slice stays correct wherever that
// group lives. The monolith slice still provides the detail UI (_sfs4hDetailMessage /
// _sfsRender4hDetailState), which stays inline, and the `window.apexDebugSfsDetailChart`
// EXPOSURE statement, which also stays inline. The apexDebugSfsDetailChart DECLARATION
// is non-DOM and was relocated VERBATIM to js/services/sfs-scan-service.js, so it is no
// longer inside that slice and is pulled BY NAME instead — the exposure statement in the
// slice still resolves it, because function declarations hoist across the joined block.
// The core declarations are likewise pulled BY NAME from the reconstructed application
// source, so the code under test is the real shipping code either way: only the physical
// location of these declarations moved, behaviour is unchanged.
const detailBlock = [
  HTML.slice(HTML.indexOf('var _sfsDetail4hInflight'),
    HTML.indexOf('\n', HTML.indexOf('var SFS_DETAIL_4H_POST_WARM_DELAY_MS')) + 1),
  HTML.slice(HTML.indexOf('function _sfs4hDetailMessage'), HTML.indexOf('// Synchronous candle source for RS:')),
  extractFn(HTML, 'apexDebugSfsDetailChart'),
  extractFn(HTML, '_sfsDetail4hBaseResult'),
  extractFn(HTML, '_sfsMapDetail4hReason'),
  extractFn(HTML, '_sfsStoreDetail4h'),
  extractFn(HTML, '_sfsEnsureDetail4hCandles'),
].join('\n');
vm.runInContext(extractFn(HTML, '_sfsCandlesUsable') + '\n' + detailBlock, sandbox);

function reset() {
  readQueue.length = 0; readCalls.length = 0; warmupCalls.length = 0;
  for (const k in els) delete els[k];
  sandbox.__sync = null; sandbox.__subLimit = false; sandbox.__flipOnSleep = null;
  sandbox.S.squeezeFireScanner.chartSymbol = 'CAT';
  sandbox.S.squeezeFireScanner.chartCacheCandles = {};
  sandbox._sfsLastFailReason = {}; sandbox._sfsWarmupCooldown = {};
  sandbox._sfsDetail4hInflight = {}; sandbox._sfsDetail4hPhase = {}; sandbox._sfsDetail4hResult = {};
}

async function main() {
  // ── Runtime behaviour ──────────────────────────────────────────────────────
  section('1. synchronous SFS-cache hit → no network, no warmup');
  {
    reset();
    sandbox.__sync = { candles: series(25), path: 'sfsCache' };
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === true && r.source === 'SFS_CACHE', '1: cache hit returns ok with source SFS_CACHE');
    ok(readCalls.length === 0 && warmupCalls.length === 0, '1: zero backend reads and zero warmups on a sync hit');
    ok(r.warmupAttempted === false, '1: warmupAttempted is false on a cache hit');
  }

  section('2. backend READ hit → renderer gets backend candles, NO warmup (case 3)');
  {
    reset();
    readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === true && r.source === 'BACKEND_DXLINK_CANDLE_CACHE', '2: ok with backend cache source');
    ok(readCalls.length === 1 && warmupCalls.length === 0, '2: exactly one GET, no warmup when the read already has candles');
    ok(sandbox.S.squeezeFireScanner.chartCacheCandles.CAT['4H'].length === 25, '2: backend candles stored into the SFS chart cache');
  }

  section('3. empty READ → ONE 30M warmup → bounded re-read succeeds (cases 1 & 3)');
  {
    reset();
    readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); // pre-warmup
    readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });          // post-warmup poll
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === true && r.warmupAttempted === true, '3: ok=true after a single controlled warmup + poll');
    ok(warmupCalls.length === 1, '3: exactly ONE warmup fired');
    ok(warmupCalls[0].syms.length === 1 && warmupCalls[0].syms[0] === 'CAT', '3: warmup is single-symbol (CAT only)');
    ok(warmupCalls[0].tfs.join(',') === '30M', '3: warmup requests 30M (backend derives 4H)');
    ok(warmupCalls[0].opts.reason === 'squeeze_fire_detail_chart', '3: warmup reason tags the detail chart');
    ok(r.warmupResponse && r.warmupResponse.ok === true, '3: structured result carries the warmup response');
  }

  section('4. empty READ → warmup → all polls empty → CANDLES_NOT_READY + cooldown (case 5)');
  {
    reset();
    for (let i = 0; i < 5; i++) readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' });
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === false && r.reason === 'CANDLES_NOT_READY', '4: precise reason CANDLES_NOT_READY (not "Run scan first")');
    ok(warmupCalls.length === 1, '4: still only one warmup despite multiple bounded re-reads');
    ok(readCalls.length >= 2 && readCalls.length <= 5, '4: bounded number of reads (1 pre + up to 3 polls)');
    ok(sandbox._sfsWarmupCooldown['CAT|4H'] > Date.now(), '4: a cooldown is armed so browsing does not spam warmups');
  }

  section('5. subscription cap/backoff active → NO warmup, precise reason (PR #116 safety, case)');
  {
    reset();
    sandbox.__subLimit = true;
    readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' });
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === false && r.reason === 'SUBSCRIPTION_LIMIT_BACKOFF', '5: reason SUBSCRIPTION_LIMIT_BACKOFF');
    ok(warmupCalls.length === 0, '5: NO warmup fired while the Candle subscription cap/backoff is active');
    ok(r.warmupAttempted === false, '5: warmupAttempted stays false under cap');
  }

  section('6. repeated CHART clicks dedupe the in-flight request (case 4)');
  {
    reset();
    readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); // pre-warmup
    readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });          // one poll hit
    const c1 = sandbox._sfsEnsureDetail4hCandles('CAT');
    const c2 = sandbox._sfsEnsureDetail4hCandles('CAT');  // synchronous second click — must reuse
    const [r1, r2] = await Promise.all([c1, c2]);
    ok(r1.ok === true && r2.ok === true, '6: both calls resolve ok');
    ok(warmupCalls.length === 1, '6: only ONE warmup despite two concurrent CHART clicks');
    ok(readCalls.length === 2, '6: reads are not doubled (deduped in-flight)');
  }

  section('7. symbol switch during pending poll → no stale data into the wrong panel (case 5)');
  {
    reset();
    readQueue.push({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' }); // pre-warmup
    readQueue.push({ ok: true, status: 200, count: 25, candles: series(25) });          // would-be hit (must NOT be used)
    sandbox.__flipOnSleep = 'MSFT';  // user navigates to MSFT during the post-warmup wait
    const r = await sandbox._sfsEnsureDetail4hCandles('CAT');
    ok(r.reason === 'SYMBOL_CHANGED', '7: loader bails with SYMBOL_CHANGED when the selection changes mid-poll');
    ok(!sandbox.S.squeezeFireScanner.chartCacheCandles.CAT || !sandbox.S.squeezeFireScanner.chartCacheCandles.CAT['4H'],
       '7: no 4H candles stored for the deselected symbol (no stale render)');
    ok(readQueue.length === 1, '7: the post-switch read was never consumed');
  }

  // ── Pure helpers ───────────────────────────────────────────────────────────
  section('8. _sfsMapDetail4hReason maps to precise external reasons');
  {
    const m = sandbox._sfsMapDetail4hReason;
    ok(m('ENDPOINT_UNAVAILABLE') === 'ENDPOINT_UNAVAILABLE', '8: endpoint unavailable preserved');
    ok(m('FETCH_ERROR') === 'FETCH_ERROR', '8: fetch error preserved');
    ok(m('SUBSCRIPTION_LIMIT') === 'SUBSCRIPTION_LIMIT_BACKOFF', '8: internal subscription limit → backoff');
    ok(m(null, { count: 10 }) === 'INSUFFICIENT_30M_CANDLES', '8: a short series → INSUFFICIENT_30M_CANDLES');
    ok(m(null, { count: 0 }) === 'CANDLES_NOT_READY', '8: empty → CANDLES_NOT_READY');
    ok(m(null, { reason: 'no_cache' }) === 'NO_CACHE', '8: backend no_cache reason → NO_CACHE');
    ok(m(null, { reason: 'subscription too big' }) === 'SUBSCRIPTION_LIMIT_BACKOFF', '8: subscription body reason → backoff');
  }

  section('9. _sfs4hDetailMessage is precise and NEVER says "Run scan first"');
  {
    sandbox._sfsDetail4hPhase = { CAT: 'loading' }; sandbox._sfsDetail4hResult = {};
    let s = sandbox._sfs4hDetailMessage('CAT');
    ok(/Loading 4H/.test(s.msg) && s.label === '4H — loading', '9: loading phase → "Loading 4H…"');
    sandbox._sfsDetail4hPhase = { CAT: 'warming' };
    s = sandbox._sfs4hDetailMessage('CAT');
    ok(/warming/i.test(s.msg) && /warming pending/.test(s.label), '9: warming phase → warming pending');
    sandbox._sfsDetail4hPhase = {}; sandbox._sfsDetail4hResult = { CAT: { reason: 'SUBSCRIPTION_LIMIT_BACKOFF' } };
    s = sandbox._sfs4hDetailMessage('CAT');
    ok(/subscription cap/.test(s.label), '9: subscription backoff → "subscription cap" label');
    sandbox._sfsDetail4hResult = { CAT: { reason: 'INSUFFICIENT_30M_CANDLES' } };
    s = sandbox._sfs4hDetailMessage('CAT');
    ok(/insufficient 30M/i.test(s.label), '9: insufficient 30M → precise label');
    // Exhaustively assert no state ever yields the old misleading copy.
    const reasons = [null, 'CANDLES_NOT_READY', 'NO_CACHE', 'ENDPOINT_UNAVAILABLE', 'FETCH_ERROR', 'SUBSCRIPTION_LIMIT_BACKOFF', 'INSUFFICIENT_30M_CANDLES'];
    let anyRunScan = false;
    ['loading', 'warming', null].forEach((ph) => reasons.forEach((rs) => {
      sandbox._sfsDetail4hPhase = ph ? { CAT: ph } : {};
      sandbox._sfsDetail4hResult = rs ? { CAT: { reason: rs } } : {};
      if (/Run scan first/i.test(sandbox._sfs4hDetailMessage('CAT').msg)) anyRunScan = true;
    }));
    ok(!anyRunScan, '9: NO phase/reason combination ever shows "Run scan first"');
  }

  section('10. apexDebugSfsDetailChart returns the documented diagnostics shape');
  {
    reset();
    sandbox.S.squeezeFireScanner.chartCacheCandles = { CAT: { '1D': series(30), '4H': series(28) } };
    sandbox._sfsDetail4hResult = { CAT: { ok: true, status: 200, count: 28, reason: null, source: 'BACKEND_DXLINK_CANDLE_CACHE', warmupAttempted: true, warmupResponse: { ok: true }, error: null } };
    const d = sandbox.apexDebugSfsDetailChart('CAT');
    const keys = ['selectedSymbol', 'has1d', 'has4h', 'backend4hReadStatus', 'warmupAttempted', 'warmupResponse', 'last4hError', 'candleCounts', 'inFlightKeys'];
    ok(keys.every((k) => k in d), '10: result has all documented keys');
    ok(d.has1d === true && d.has4h === true, '10: has1d / has4h reflect the cache');
    ok(d.candleCounts['1D'] === 30 && d.candleCounts['4H'] === 28, '10: candleCounts report cached lengths');
    ok(d.warmupAttempted === true && d.warmupResponse && d.warmupResponse.ok === true, '10: surfaces warmup attempt/response');
    ok(d.inFlightKeys && Array.isArray(d.inFlightKeys.detail4h), '10: inFlightKeys lists in-flight loaders');
    ok(typeof sandbox.window.apexDebugSfsDetailChart === 'function', '10: exposed on window for console use');
  }

  // ── Static wiring (drift-proof) ─────────────────────────────────────────────
  section('11. STATIC: render integration, single-symbol, no scanner run / Yahoo / WebSocket');
  {
    const open = stripComments(extractFn(HTML, '_sfsOpenChart'));
    ok(/_sfsEnsureChartData\(\s*symbol\s*\)[\s\S]*_sfsDrawCharts\(\s*symbol\s*\)/.test(open),
       '11: _sfsOpenChart renders 1D via _sfsEnsureChartData → _sfsDrawCharts');
    ok(/_sfsEnsureDetail4hCandles\(\s*symbol\s*\)/.test(open), '11: _sfsOpenChart kicks the background 4H loader');
    ok(!/_sfsRunScan|scanner\/run/.test(open), '11: _sfsOpenChart triggers NO scanner run for the 4H chart');

    const ensure = stripComments(extractFn(HTML, '_sfsEnsureChartData'));
    ok(/var tfs\s*=\s*\[\s*'1D'\s*\]/.test(ensure) && !/'4H'/.test(ensure),
       '11: _sfsEnsureChartData ensures ONLY 1D immediately (4H decoupled to the background loader)');

    const loader = stripComments(extractFn(HTML, '_sfsEnsureDetail4hCandles'));
    ok(/_sfsWarmupBatch\(\s*\[\s*symbol\s*\]\s*,\s*\[\s*'30M'\s*\]/.test(loader), '11: loader warms a single symbol, 30M only');
    ok(!/_sfsRunScan|scanner\/run/.test(loader), '11: loader triggers NO /scanner/run');
    ok(!/yahoo/i.test(loader), '11: loader introduces no Yahoo source');
    ok(!/new\s+WebSocket/.test(loader), '11: loader opens no new WebSocket');
    ok(!/\.direction\s*=|\.score\s*=/.test(loader), '11: loader never makes candidate.direction / candidate.score operational');
    ok(/_sfsCandleSubLimitActive\(\)/.test(loader) && /_sfsWarmupCooldown/.test(loader),
       '11: loader preserves PR #116 cap/backoff + cooldown gating before warming');

    const draw = stripComments(extractFn(HTML, '_sfsDrawOneTf'));
    ok(!/Run scan first/i.test(draw), '11: _sfsDrawOneTf no longer shows "Run scan first"');

    ok(/window\.apexDebugSfsDetailChart\s*=\s*apexDebugSfsDetailChart/.test(HTML),
       '11: window.apexDebugSfsDetailChart is exposed');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
