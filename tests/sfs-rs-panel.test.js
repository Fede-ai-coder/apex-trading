'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Squeeze Fire 4H RS-vs-SPY panel — SPY hydration + precise failure reasons.
//
// Bug: the SFS 4H RS panel showed a generic "RS: not loaded". Root cause: SPY 4H
// (30M-derived) lives in NO no-subscription source, and _sfsEnsureChartData never
// hydrated SPY — so _sfsDrawRsPanel could not find a SPY 4H series. (1D worked only
// because SPY 1D sits in the always-on DXLink 1D benchmark buffer.)
//
// Fix: _sfsDrawRsPanel now (a) draws immediately when SPY is in a no-subscription
// source, (b) otherwise ENSURES SPY once through the existing pipeline
// (_sfsEnsureTfCandles) and redraws when it arrives (nav-guarded), and (c) reports
// a PRECISE reason ("RS: SPY 4H not loaded" / "RS: symbol 4H not loaded" /
// "RS: insufficient 4H overlap") instead of a generic placeholder.
//
// These tests extract the REAL functions from index.html and drive them in a vm
// sandbox with a controllable _sfsEnsureTfCandles stub and capturing _pfDrawRsPanel.
//
// Run: node tests/sfs-rs-panel.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }
const flush = () => new Promise((r) => setTimeout(r, 0));   // let vm .then() callbacks run

// ── Fixtures ─────────────────────────────────────────────────────────────────
function series(lastClose, n) {
  n = n || 40; const arr = []; let prev = lastClose - n;
  for (let i = 0; i < n; i++) {
    const c = (i === n - 1) ? lastClose : prev + 1;
    if (i !== n - 1) prev = c;
    arr.push({ time: i + 1, open: c - 0.3, high: c + 1, low: c - 1, close: c, volume: 1000 });
  }
  return arr;
}

// ── Sandbox: real RS-panel stack + controllable stubs ────────────────────────
const els = {};                 // id → { innerHTML }
const pfCalls = [];             // captured _pfDrawRsPanel(rsId, candles, spy, viewLen)
const ensureCalls = [];         // captured _sfsEnsureTfCandles(sym, tf)

const sandbox = {
  console, JSON, Object, Math, isFinite, parseFloat, NaN, Promise, setTimeout,
  document: { getElementById: (id) => (els[id] || (els[id] = { innerHTML: '', appendChild() {}, offsetWidth: 280, offsetHeight: 48 })) },
  debugLog() {}, debugWarn() {},
  isRTHOpen: () => true,
  S: {
    scanData: [],                                  // SPY benchmark row patch is best-effort
    squeezeFireScanner: { chartSymbol: 'MSFT', chartCacheCandles: {} },
  },
  _sfsLastFailReason: {},
  // Controllable SPY sources for _sfsCandlesFromSyncSource (DXLink buffers).
  __spy1dBuf: null, __spy4hBuf: null,
  _rsGetDailyCandles: (sym) => (sym === 'SPY' ? sandbox.__spy1dBuf : null),
  getFourHourCandles: (sym) => (sym === 'SPY' ? sandbox.__spy4hBuf : null),
  // Controllable ensure: resolves __ensureResult after a microtask (mimics async fetch).
  __ensureResult: null,
  _sfsEnsureTfCandles: function (sym, tf) { ensureCalls.push(sym + '|' + tf); return Promise.resolve(sandbox.__ensureResult); },
  // Capture the actual RS draw.
  _pfDrawRsPanel: function (rsId, candles, spy, viewLen) { pfCalls.push({ rsId, candles, spy, viewLen }); },
};
vm.createContext(sandbox);
vm.runInContext(
  ['patchLastCandleWithLivePrice', '_patchLivePrice', '_sfsCandlesUsable',
   '_sfsCandlesFromSyncSource', '_sfsRsPanelMsg', '_sfsDrawRsPanel']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);

function reset() {
  pfCalls.length = 0; ensureCalls.length = 0;
  for (const k in els) delete els[k];
  sandbox.S.squeezeFireScanner.chartSymbol = 'MSFT';
  sandbox.S.squeezeFireScanner.chartCacheCandles = {};
  sandbox.__spy1dBuf = null; sandbox.__spy4hBuf = null; sandbox.__ensureResult = null;
}
const msgOf = (rsId) => (els[rsId] ? els[rsId].innerHTML : '');
const lastClose = (a) => a[a.length - 1].close;

async function main() {
  const symCandles = series(441.31);   // the patched symbol 4H series (>=22 bars)

  section('1. SPY 4H already in the SFS cache → RS draws immediately with both series');
  {
    reset();
    sandbox.S.squeezeFireScanner.chartCacheCandles = { SPY: { '4H': series(500) } };
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush();
    ok(pfCalls.length === 1, '1: _pfDrawRsPanel called once (RS drawn)');
    ok(pfCalls[0] && lastClose(pfCalls[0].candles) === 441.31,
       '1: RS panel received the PATCHED symbol candles (end 441.31)');
    ok(pfCalls[0] && pfCalls[0].spy && pfCalls[0].spy.length >= 22,
       '1: RS panel received a valid SPY 4H series');
    ok(ensureCalls.length === 0, '1: no ensure needed (cache hit) — no added subscription pressure');
  }

  section('2. SPY 4H in the live DXLink buffer → RS draws without an ensure');
  {
    reset();
    sandbox.__spy4hBuf = series(500);                 // getFourHourCandles('SPY')
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush();
    ok(pfCalls.length === 1 && ensureCalls.length === 0,
       '2: RS drawn from the DXLink buffer, no ensure call');
  }

  section('3. SPY 4H missing → ensure ONCE through the existing pipeline, then redraw');
  {
    reset();
    sandbox.__ensureResult = series(500);             // ensure resolves a usable SPY 4H
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    // Before the ensure resolves, a precise transient message is shown (not generic).
    ok(/SPY 4H loading/.test(msgOf('sfs-rs-4h')), '3: shows precise "RS: SPY 4H loading…" while ensuring');
    await flush();
    ok(ensureCalls.length === 1 && ensureCalls[0] === 'SPY|4H',
       '3: ensured SPY 4H exactly once via _sfsEnsureTfCandles (existing pipeline)');
    ok(pfCalls.length === 1 && lastClose(pfCalls[0].candles) === 441.31 && pfCalls[0].spy.length >= 22,
       '3: after SPY arrives, RS redraws with patched symbol candles + SPY 4H');
  }

  section('4. SPY 4H truly unavailable → PRECISE "RS: SPY 4H not loaded" (not generic)');
  {
    reset();
    sandbox.__ensureResult = null;                    // ensure fails
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    await flush();
    ok(ensureCalls.length === 1, '4: attempted the ensure once');
    ok(pfCalls.length === 0, '4: RS not drawn (no SPY)');
    ok(/SPY 4H not loaded/.test(msgOf('sfs-rs-4h')) && !/^.*RS: not loaded.*$/.test(msgOf('sfs-rs-4h').replace('SPY 4H', '')),
       '4: shows "RS: SPY 4H not loaded" — names the missing dataset, not a generic message');
  }

  section('5. Symbol 4H series too short → PRECISE "RS: symbol 4H not loaded"');
  {
    reset();
    sandbox.S.squeezeFireScanner.chartCacheCandles = { SPY: { '4H': series(500) } };
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', series(441.31, 10) /* <22 bars */, 60);
    await flush();
    ok(pfCalls.length === 0, '5: RS not drawn (symbol series too short)');
    ok(/symbol 4H not loaded/.test(msgOf('sfs-rs-4h')),
       '5: shows "RS: symbol 4H not loaded" (distinct from the SPY-missing reason)');
    ok(ensureCalls.length === 0, '5: does not waste an ensure when the symbol series itself is short');
  }

  section('6. Nav guard: user navigates away before SPY arrives → no late draw');
  {
    reset();
    sandbox.__ensureResult = series(500);
    sandbox._sfsDrawRsPanel('MSFT', '4H', 'sfs-rs-4h', symCandles, 60);
    sandbox.S.squeezeFireScanner.chartSymbol = 'AAPL';   // navigated away mid-flight
    await flush();
    ok(pfCalls.length === 0, '6: the late SPY arrival does NOT draw RS for the abandoned symbol');
  }

  section('7. 1D path unaffected: SPY 1D from the benchmark buffer still draws RS');
  {
    reset();
    sandbox.__spy1dBuf = series(500);                  // _rsGetDailyCandles('SPY')
    sandbox._sfsDrawRsPanel('MSFT', '1D', 'sfs-rs-1d', symCandles, 60);
    await flush();
    ok(pfCalls.length === 1 && ensureCalls.length === 0, '7: 1D RS draws from the SPY 1D buffer, no ensure');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
