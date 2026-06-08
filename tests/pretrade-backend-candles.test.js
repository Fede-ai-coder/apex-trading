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
  // Backend auth gate stubs — open so the existing pretrade fetch tests run.
  _backendCandleGateOpen: () => true,
  _backendCandleGateReason: () => 'open',
  _noteBackendCandleFailure: () => {},
  _noteBackendCandleSuccess: () => {},
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
  // 'rma' + 'calcKC' are real index.html technicals: calcKCSnap delegates to
  // calcKC, and calcKC uses rma — both must be loaded so the extracted
  // _calcTechnicalsFromCandles resolves them (no formula change, just inclusion).
  'rma', 'smA', 'emA', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcKCSnap', 'calcSqueeze',
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

// ── 9. ensurePreTradeTechnicals structure ─────────────────────────────────────
section('9. ensurePreTradeTechnicals source structure');
{
  const src = stripComments(extractFn(HTML, 'ensurePreTradeTechnicals'));
  ok(/fetchCandles/.test(src),          'fetchCandles preserved for legacy flag-false path');
  ok(/ffBackendCandlesPretradeSnapshot/.test(src), 'flag check present');
  ok(/BACKEND_DXLINK_CANDLES[^_]/.test(src),       'BACKEND_DXLINK_CANDLES success marker present');
  ok(/BACKEND_DXLINK_CANDLES_UNAVAILABLE/.test(src), 'BACKEND_DXLINK_CANDLES_UNAVAILABLE marker present');
  ok(/technicalFallbackReason/.test(src), 'technicalFallbackReason diagnostic field present');
}

// ── 10. structural: early return before fetchCandles when flag is true ────────
section('10. flag-true failure path returns BEFORE legacy fetchCandles block');
{
  const src = stripComments(extractFn(HTML, 'ensurePreTradeTechnicals'));

  // Positions of key tokens.
  const flagBlockStart   = src.indexOf('if (ffBackendCandlesPretradeSnapshot())');
  const unavailIdx       = src.indexOf('BACKEND_DXLINK_CANDLES_UNAVAILABLE');
  const fetchCandlesIdx  = src.indexOf('fetchCandles(');
  const warnNoYahooIdx   = src.indexOf('no Yahoo fallback because FF_BACKEND_CANDLES_PRETRADE_SNAPSHOT');

  ok(flagBlockStart  > 0, 'flag block located in source');
  ok(unavailIdx      > 0, 'BACKEND_DXLINK_CANDLES_UNAVAILABLE located in source');
  ok(fetchCandlesIdx > 0, 'fetchCandles located in source (legacy path preserved)');
  ok(warnNoYahooIdx  > 0, 'no-Yahoo warning message present');

  // BACKEND_DXLINK_CANDLES_UNAVAILABLE must appear BEFORE the legacy fetchCandles call,
  // proving the early return exits the flag block before Yahoo is ever reached.
  ok(unavailIdx < fetchCandlesIdx,
    'BACKEND_DXLINK_CANDLES_UNAVAILABLE return precedes legacy fetchCandles call');

  // The no-Yahoo warning must also appear before fetchCandles.
  ok(warnNoYahooIdx < fetchCandlesIdx,
    'no-Yahoo warning precedes legacy fetchCandles call');

  // Both the UNAVAILABLE return and the warning are inside the flag block
  // (i.e. after its opening and before fetchCandles which is outside).
  ok(unavailIdx > flagBlockStart,
    'BACKEND_DXLINK_CANDLES_UNAVAILABLE is inside the flag block');
  ok(warnNoYahooIdx > flagBlockStart,
    'no-Yahoo warning is inside the flag block');
}

// ── 11. flag-false legacy path: fetchCandles is reachable ─────────────────────
section('11. legacy path (flag false) retains fetchCandles for Yahoo-backed fallback');
{
  const src = stripComments(extractFn(HTML, 'ensurePreTradeTechnicals'));
  // fetchCandles must appear in the function body at a position AFTER the flag block.
  const flagBlockStart  = src.indexOf('if (ffBackendCandlesPretradeSnapshot())');
  const fetchCandlesIdx = src.indexOf('fetchCandles(');
  ok(fetchCandlesIdx > flagBlockStart,
    'fetchCandles is positioned after the flag block (reachable when flag is false)');
  // Sanity: the legacy path comment is still present.
  ok(/Railway backend/.test(src) || /server-side Yahoo/.test(src) || /fetchCandles/.test(src),
    'legacy Yahoo-backed path comment/call present in function body');
}

// ── 12. _fetchPretradeBackendCandles contains no Yahoo / WebSocket / /market/candles ──
section('12. _fetchPretradeBackendCandles endpoint and data-source constraints');
{
  const src = stripComments(extractFn(HTML, '_fetchPretradeBackendCandles'));
  ok(!/yahoo/i.test(src),                            'no Yahoo reference');
  ok(!/new WebSocket/.test(src),                     'no new WebSocket');
  ok(!/\/market\/candles(?!-dxlink)/.test(src),      'no /market/candles (non-dev)');
  ok(/\/dev\/market\/candles-dxlink\/warmup/.test(src), 'warmup endpoint present');
  ok(/\/dev\/market\/candles-dxlink\//.test(src),    'candle read endpoint present');
}

// ── 13. source: argument normalization block present ─────────────────────────
section('13. argument normalization block present in source');
{
  const src = stripComments(extractFn(HTML, 'ensurePreTradeTechnicals'));
  ok(/typeof ticker === 'object'/.test(src),   'object-check for single-arg form present');
  ok(/snapshot\.ticker/.test(src),             'snapshot.ticker field lookup present');
  ok(/snapshot\.symbol/.test(src),             'snapshot.symbol fallback lookup present');
  ok(/snapshot\.underlyingPrice/.test(src),    'underlyingPrice price resolution present');
  ok(/snapshot\.price/.test(src),              'snapshot.price fallback resolution present');
  ok(/missing_ticker/.test(src),               'missing_ticker fallback reason present');
  // Normalization must precede the backend helper call.
  const normIdx    = src.indexOf("typeof ticker === 'object'");
  const backendIdx = src.indexOf('_fetchPretradeBackendCandles(');
  ok(normIdx < backendIdx, 'normalization precedes backend helper call');
}

// ── 14-20. async runtime tests for argument normalization ─────────────────────
vm.runInContext('async ' + extractFn(HTML, 'ensurePreTradeTechnicals'), sandbox);
sandbox.S = { scanData: [] };

async function runAsyncTests() {
  section('14. single-arg snapshot form: ticker resolved from snapshot.ticker');
  {
    let capturedArgs = null;
    sandbox._fetchPretradeBackendCandles = async function(t, p) {
      capturedArgs = [t, p];
      return { ok: true, technicals1d: { rsi14: 55 }, technicals4h: null };
    };
    sandbox.localStorage.setItem('apex_ff_backend_candles_pretrade_snapshot', '1');
    const snap = { ticker: 'SPY', underlyingPrice: 750,
                   indicatorSource: 'UNAVAILABLE', rsi14: null, sma20: null };
    const result = await sandbox.ensurePreTradeTechnicals(snap);
    ok(capturedArgs !== null,     'backend helper was called');
    ok(capturedArgs[0] === 'SPY', 'ticker arg is string "SPY", not the snapshot object');
    ok(capturedArgs[1] === 750,   'price resolved from snapshot.underlyingPrice');
    ok(result.technicalSource === 'BACKEND_DXLINK_CANDLES',
      'success path returns BACKEND_DXLINK_CANDLES');
    ok(result.rsi14 === 55, 'technicals1d merged into result');
  }

  section('15. single-arg snapshot: ticker resolved from snapshot.symbol, uppercased');
  {
    let capturedArgs = null;
    sandbox._fetchPretradeBackendCandles = async function(t, p) {
      capturedArgs = [t, p]; return { ok: true, technicals1d: {}, technicals4h: null };
    };
    const snap = { symbol: ' aapl ', underlyingPrice: 200,
                   indicatorSource: 'UNAVAILABLE', rsi14: null, sma20: null };
    await sandbox.ensurePreTradeTechnicals(snap);
    ok(capturedArgs[0] === 'AAPL', 'ticker resolved + trimmed + uppercased from snapshot.symbol');
    ok(capturedArgs[1] === 200,    'price from snapshot.underlyingPrice');
  }

  section('16. two-arg form (ticker, snapshot) works correctly');
  {
    let capturedArgs = null;
    sandbox._fetchPretradeBackendCandles = async function(t, p) {
      capturedArgs = [t, p]; return { ok: true, technicals1d: {}, technicals4h: null };
    };
    const snap = { underlyingPrice: 600,
                   indicatorSource: 'UNAVAILABLE', rsi14: null, sma20: null };
    await sandbox.ensurePreTradeTechnicals('msft', snap);
    ok(capturedArgs[0] === 'MSFT', 'string ticker arg normalized to uppercase');
    ok(capturedArgs[1] === 600,    'price from second-arg snapshot.underlyingPrice');
  }

  section('17. flag true + backend failure: no fetchCandles call, returns UNAVAILABLE');
  {
    let yahooCallCount = 0;
    sandbox._fetchPretradeBackendCandles = async function() {
      return { ok: false, fallbackReason: 'test_1D_http_404' };
    };
    sandbox.fetchCandles = async function() { yahooCallCount++; return []; };
    const snap = { ticker: 'SPY', underlyingPrice: 750,
                   indicatorSource: 'UNAVAILABLE', rsi14: null, sma20: null };
    const result = await sandbox.ensurePreTradeTechnicals(snap);
    ok(yahooCallCount === 0,
      'fetchCandles (Yahoo) never called when flag true and backend fails');
    ok(result.technicalSource === 'BACKEND_DXLINK_CANDLES_UNAVAILABLE',
      'returns BACKEND_DXLINK_CANDLES_UNAVAILABLE on backend failure');
    ok(result.technicalFallbackReason === 'test_1D_http_404',
      'fallbackReason propagated from backend helper');
  }

  section('18. missing ticker in snapshot: no crash, returns UNAVAILABLE when flag true');
  {
    const snap = { underlyingPrice: 500,
                   indicatorSource: 'UNAVAILABLE', rsi14: null, sma20: null };
    const result = await sandbox.ensurePreTradeTechnicals(snap);
    ok(result.technicalSource === 'BACKEND_DXLINK_CANDLES_UNAVAILABLE',
      'no ticker → BACKEND_DXLINK_CANDLES_UNAVAILABLE');
    ok(result.technicalFallbackReason === 'missing_ticker',
      'fallbackReason = missing_ticker');
  }

  section('19. price resolved from snapshot.price when underlyingPrice absent');
  {
    let capturedArgs = null;
    sandbox._fetchPretradeBackendCandles = async function(t, p) {
      capturedArgs = [t, p]; return { ok: true, technicals1d: {}, technicals4h: null };
    };
    const snap = { ticker: 'SPY', price: 800,
                   indicatorSource: 'UNAVAILABLE', rsi14: null, sma20: null };
    await sandbox.ensurePreTradeTechnicals(snap);
    ok(capturedArgs[1] === 800,
      'price resolved from snapshot.price when underlyingPrice absent');
  }

  section('20. flag false: fetchCandles called once (legacy Yahoo path unchanged)');
  {
    sandbox.localStorage.removeItem('apex_ff_backend_candles_pretrade_snapshot');
    let legacyCallCount = 0;
    sandbox.fetchCandles = async function() { legacyCallCount++; return []; };
    const snap = { ticker: 'SPY', underlyingPrice: 750,
                   indicatorSource: 'UNAVAILABLE', rsi14: null, sma20: null };
    await sandbox.ensurePreTradeTechnicals('SPY', snap);
    ok(legacyCallCount === 1,
      'fetchCandles invoked exactly once on legacy path (flag false)');
  }
}

runAsyncTests().then(function() {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}).catch(function(e) {
  console.error('Async test runner error:', e);
  process.exit(1);
});
