'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FF_BACKEND_CANDLES_PRETRADE_SNAPSHOT — pure-helper validation.
//
// Tests prove:
//   1. flag default false (no localStorage)
//   2. flag true when localStorage key is '1'
//   3. backend candle read response mapping (various shapes normalize correctly)
//   4. fallback when 1D candles are missing / insufficient
//   5. _calcTechnicalsFromCandles output shape matches expected snapshot fields
//   6. no /market/candles string in the new backend snapshot path
//   7. no Yahoo string in the new backend snapshot path
//   8. _fetchPretradeBackendCandles uses /dev/market/candles-dxlink/ only
//
// Run: node tests/pretrade-backend-candles.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  const sig   = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
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
  throw new Error('unterminated body: ' + name);
}

function stripComments(src) {
  let out = '', inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = 0; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      out += c;
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

// ── build sandbox ─────────────────────────────────────────────────────────────
const mockLS = {};
const sandbox = {
  console,
  Date, Math, JSON, Number, Boolean,
  isFinite, parseFloat, parseInt, encodeURIComponent,
  AbortSignal: { timeout: () => ({}) },
  BACKEND: 'https://api.test',
  _backendAuthHeaders: (extra) => Object.assign({ 'X-Test': '1' }, extra || {}),
  _candleBuffer: {},
  APEX_PARITY_TOL: 0.0001,
  localStorage: {
    getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
    setItem:    (k, v) => { mockLS[k] = v; },
    removeItem: (k) => { delete mockLS[k]; },
  },
  fetch: null, // overridden per-test
  Object,
  Array,
  Promise,
};
vm.createContext(sandbox);

const FNS = [
  'ffBackendCandlesPretradeSnapshot',
  '_apexParityNormCandleArray', '_apexParityNormCandle', '_apexParityNormTime',
  '_apexParityExtractBackendCandles',
  'smA', 'emA', 'calcRSIWilder', 'calcBB', 'calcKCSnap', 'calcSqueeze',
  '_calcTechnicalsFromCandles',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

function bars(n, base) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = base + i * 0.5;
    out.push({ t: ms0 + i * 86400000, o: c - 0.1, h: c + 0.5, l: c - 0.5, c: c, v: 1000 });
  }
  return out;
}

// ── 1. flag default false ─────────────────────────────────────────────────────
section('1. FF_BACKEND_CANDLES_PRETRADE_SNAPSHOT default false');
ok(sandbox.ffBackendCandlesPretradeSnapshot() === false, 'returns false with no localStorage key');

// ── 2. flag true when key === "1" ─────────────────────────────────────────────
section('2. flag enabled via localStorage');
sandbox.localStorage.setItem('apex_ff_backend_candles_pretrade_snapshot', '1');
ok(sandbox.ffBackendCandlesPretradeSnapshot() === true, 'returns true when key==="1"');
sandbox.localStorage.removeItem('apex_ff_backend_candles_pretrade_snapshot');
ok(sandbox.ffBackendCandlesPretradeSnapshot() === false, 'returns false after key removed');

// ── 3. flag never true for other values ──────────────────────────────────────
section('3. flag falsy for non-"1" values');
['0', 'true', 'yes', '', 'false'].forEach((v) => {
  sandbox.localStorage.setItem('apex_ff_backend_candles_pretrade_snapshot', v);
  ok(!sandbox.ffBackendCandlesPretradeSnapshot(), 'flag false when value="' + v + '"');
});
sandbox.localStorage.removeItem('apex_ff_backend_candles_pretrade_snapshot');

// ── 4. backend candle response mapping ───────────────────────────────────────
section('4. backend candle read response mapping');
{
  // backend returns { candles: [...] } with ISO timestamps + open/close keys
  const rawBars = bars(25, 500);
  const backendShape = rawBars.map((c) => ({
    time: new Date(c.t).toISOString(),
    open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v,
  }));
  const json = { candles: backendShape };
  const extracted = sandbox._apexParityExtractBackendCandles(json);
  ok(Array.isArray(extracted) && extracted.length === 25, 'extracted 25 bars from {candles:[...]}');
  const normed = sandbox._apexParityNormCandleArray(extracted);
  ok(normed.length === 25, 'all 25 bars normalized');
  ok(normed[0].t != null && typeof normed[0].c === 'number', 'normalized shape has t and c');
  ok(normed[0].t < normed[normed.length - 1].t, 'sorted ascending by time');
}
{
  // backend returns bare array
  const rawBars = bars(22, 200);
  const extracted = sandbox._apexParityExtractBackendCandles(rawBars);
  ok(Array.isArray(extracted) && extracted.length === 22, 'bare array extracted correctly');
}
{
  // backend returns { bars: [...] }
  const rawBars = bars(20, 300);
  const json = { bars: rawBars };
  const extracted = sandbox._apexParityExtractBackendCandles(json);
  ok(Array.isArray(extracted) && extracted.length === 20, 'extracted from {bars:[...]}');
}
{
  // null / empty responses
  ok(sandbox._apexParityExtractBackendCandles(null).length === 0, 'null → []');
  ok(sandbox._apexParityExtractBackendCandles({}).length === 0, '{} → []');
}

// ── 5. fallback when 1D candles missing or insufficient ──────────────────────
section('5. fallback when 1D candles missing / stale');
{
  // fewer than 20 bars → technicals empty object
  const tooFew = bars(10, 100);
  const r = sandbox._calcTechnicalsFromCandles(tooFew, null, 110);
  ok(r.rsi14 === null, '<20 bars → rsi14 null');
  ok(r.sma20 === null, '<20 bars → sma20 null');
}
{
  // null candles → empty shape
  const r = sandbox._calcTechnicalsFromCandles(null, null, 100);
  ok(r.rsi14 === null && r.sma20 === null, 'null candles → empty shape');
}
{
  // empty array → empty shape
  const r = sandbox._calcTechnicalsFromCandles([], null, 100);
  ok(r.rsi14 === null && r.sma20 === null, 'empty array → empty shape');
}

// ── 6. output shape matches existing snapshot expected fields ────────────────
section('6. _calcTechnicalsFromCandles output shape matches expected snapshot fields');
{
  const candles = bars(250, 400);
  const r = sandbox._calcTechnicalsFromCandles(candles, null, 524);

  const REQUIRED_FIELDS = [
    'rsi14', 'sma8', 'sma13', 'sma20', 'sma30', 'sma200',
    'distFromSma8', 'distFromSma13', 'distFromSma20', 'distFromSma30', 'distFromSma200',
    'bbUpper', 'bbMiddle', 'bbLower',
    'kcUpper', 'kcMiddle', 'kcLower',
    'squeeze', 'insideBB', 'aboveUpperBB', 'belowLowerBB',
    'insideKC', 'aboveUpperKC', 'belowLowerKC',
    'priceBetweenKCandBB', 'relStrengthVsSpy',
  ];
  REQUIRED_FIELDS.forEach((f) => {
    ok(Object.prototype.hasOwnProperty.call(r, f), 'output has field: ' + f);
  });
  ok(r.rsi14 !== null && r.rsi14 >= 0 && r.rsi14 <= 100, 'rsi14 in [0,100] range');
  ok(r.sma20 !== null && r.sma20 > 0, 'sma20 is a positive number');
  ok(r.sma200 !== null && r.sma200 > 0, 'sma200 computed with 250 bars');
  ok(r.squeeze === true || r.squeeze === false, 'squeeze is boolean');
}
{
  // With only 30 bars: sma200 is null, others populated where enough data exists
  const candles = bars(30, 100);
  const r = sandbox._calcTechnicalsFromCandles(candles, null, 114);
  ok(r.sma200 === null, 'sma200 null when <200 bars');
  ok(r.sma20 !== null, 'sma20 present with 30 bars');
  ok(r.sma30 !== null, 'sma30 present with 30 bars');
  ok(r.rsi14 !== null, 'rsi14 present with 30 bars');
}

// ── 7. no /market/candles string in new backend snapshot functions ────────────
section('7. new backend snapshot path contains no /market/candles or Yahoo');
{
  const fetchFn   = stripComments(extractFn(HTML, '_fetchPretradeBackendCandles'));
  const flagFn    = stripComments(extractFn(HTML, 'ffBackendCandlesPretradeSnapshot'));
  const combined  = fetchFn + flagFn;

  // /market/candles is banned; /dev/market/candles-dxlink/ is allowed
  ok(!/\/market\/candles(?!-dxlink)/.test(combined),
    '_fetchPretradeBackendCandles never calls /market/candles');
  ok(!/yahoo/i.test(combined),
    '_fetchPretradeBackendCandles contains no Yahoo reference');
  ok(!/new WebSocket/.test(combined),
    '_fetchPretradeBackendCandles opens no WebSocket');
}

// ── 8. backend access restricted to /dev/market/candles-dxlink/ ──────────────
section('8. _fetchPretradeBackendCandles uses /dev/market/candles-dxlink/ endpoints only');
{
  const src = stripComments(extractFn(HTML, '_fetchPretradeBackendCandles'));
  ok(/\/dev\/market\/candles-dxlink\//.test(src),
    'uses /dev/market/candles-dxlink/ for candle reads');
  ok(/\/dev\/market\/candles-dxlink\/warmup/.test(src),
    'uses /dev/market/candles-dxlink/warmup for warmup');
  // Must not call the non-dev endpoint
  const forbidden = src.match(/['"`]\/market\/candles[^-]/);
  ok(!forbidden, 'does not reference /market/candles (non-dev)');
}

// ── 9. ensurePreTradeTechnicals fallback path still uses Yahoo  ───────────────
section('9. ensurePreTradeTechnicals existing Yahoo path is untouched');
{
  const src = stripComments(extractFn(HTML, 'ensurePreTradeTechnicals'));
  ok(/fetchCandles/.test(src), 'existing fetchCandles call preserved in fallback path');
  ok(/ffBackendCandlesPretradeSnapshot/.test(src), 'flag check present');
  ok(/BACKEND_DXLINK_CANDLES/.test(src), 'new source marker present');
  ok(/technicalFallbackReason/.test(src), 'technicalFallbackReason diagnostic field present');
}

// ── done ──────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
