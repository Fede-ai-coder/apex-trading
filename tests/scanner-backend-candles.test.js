'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FF_BACKEND_CANDLES_SCANNER_CHARTS — pure-helper validation.
//
// First backend-migration slice: the Directional Setup Scanner (DSS) detail
// charts (reason=scanner_chart) read backend cached candles instead of opening
// direct DXLink Candle subscriptions.
//
// Tests prove:
//   1. flag default false (no localStorage)
//   2. flag true only when localStorage key is '1'
//   3. backend read response maps to scanner chart candle shape
//   4. backend 4H uses read endpoint only; warmup uses 30M not 4H
//   5. backend failure returns fallbackReason
//   6. /market/candles endpoints used in new backend scanner chart helper
//   7. no Yahoo string in the new backend scanner chart helper
//   8. no new WebSocket usage in the scanner chart helper
//   9. flag false leaves legacy getDailyCandles / getFourHourCandles path unchanged
//  10. scanner_chart DXLink subscription is gated behind the flag in _dssRenderLargeCharts
//
// Run: node tests/scanner-backend-candles.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extracts a named function (async or sync) from source, preserving async prefix.
function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
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
  }
  throw new Error('function not found: ' + name);
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

// Removes fire-and-forget _recordCandleSubscriptionRequest(...) telemetry calls so
// the structural source assertions below match the real request logic (warmup
// timeframes, /warmup count) rather than diagnostic metadata strings that the
// observability layer embeds (e.g. timeframes:['1D','4H'], 'POST .../warmup').
function stripCandleDiag(src) {
  const marker = '_recordCandleSubscriptionRequest(';
  let out = src, idx;
  while ((idx = out.indexOf(marker)) >= 0) {
    let depth = 0, inS = null, esc = false, end = -1;
    for (let j = idx + marker.length - 1; j < out.length; j++) {
      const c = out[j];
      if (inS) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inS) inS = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end < 0) break; // unbalanced — leave source intact rather than corrupt it
    let tail = end + 1;
    if (out[tail] === ';') tail++;
    out = out.slice(0, idx) + out.slice(tail);
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
  // Subscription-diagnostics recorder — a fire-and-forget side-channel the fetch
  // helpers call for telemetry; stubbed no-op here since it is outside the
  // behavior under test (covered by tests/candle-subscription-diagnostics.test.js).
  _recordCandleSubscriptionRequest: () => {},
  // Backend auth gate stubs — open by default so the fetch-behavior tests exercise the GET/warmup path.
  _backendCandleGateOpen: () => true,
  _backendCandleGateReason: () => 'open',
  _noteBackendCandleFailure: () => {},
  _noteBackendCandleSuccess: () => {},
  _recordCandleProvenance: () => {},
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
  '_extractBackend4hDiag',
  'ffPreferBackendCandlesForCharts',
  'ffBackendCandlesScannerCharts',
  '_apexParityNormCandleArray', '_apexParityNormCandle', '_apexParityNormTime',
  '_apexParityExtractBackendCandles',
  '_scannerFetchBackendCandlesForChart',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// Build N synthetic daily bars (normalized {t,o,h,l,c,v} shape).
function bars(n, base) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = base + i * 0.5;
    out.push({ t: ms0 + i * 86400000, o: c - 0.1, h: c + 0.5, l: c - 0.5, c, v: 1000 });
  }
  return out;
}

// Convert internal {t,o,h,l,c,v} bars to backend ISO-timestamp shape.
function toBackendShape(rawBars) {
  return rawBars.map((c) => ({
    time: new Date(c.t).toISOString(),
    open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v,
  }));
}

// URL-aware fetch router that records call counts per endpoint kind.
// routes: { read1d: [resp, ...], read4h: [...], warmup: [...] }
// Each kind consumes its response list in order (last entry repeats).
// This lets read-first tests assert whether/when /ensure was called.
function makeRouter(routes) {
  const calls = { read1d: 0, read4h: 0, warmup: 0, other: 0, urls: [] };
  const fn = function(url, opts) {
    calls.urls.push(url);
    let kind = 'other';
    if (/\/ensure/.test(url))            kind = 'warmup';
    else if (/timeframe=1D/.test(url))   kind = 'read1d';
    else if (/timeframe=4H/.test(url))   kind = 'read4h';
    calls[kind]++;
    if (kind === 'warmup' && opts) calls.lastWarmupOpts = opts;
    const list = routes[kind] || [];
    const resp = list[Math.min(calls[kind] - 1, list.length - 1)] || { ok: true, body: {} };
    const isOk = resp.ok !== false;
    return Promise.resolve({
      ok:     isOk,
      status: resp.status || (isOk ? 200 : 500),
      json:   () => Promise.resolve(resp.body || {}),
    });
  };
  fn.calls = calls;
  return fn;
}

(async () => {

// ── 1. flag defaults to the global chart policy (DEFAULT ON) ───────────────────
section('1. FF_BACKEND_CANDLES_SCANNER_CHARTS delegates to global policy (default ON)');
ok(sandbox.ffPreferBackendCandlesForCharts() === true, 'global chart policy defaults ON');
ok(sandbox.ffBackendCandlesScannerCharts() === true, 'returns true (global default) with no per-surface key');

// ── 2. per-surface override: "1" forces ON, "0" forces OFF ────────────────────
section('2. per-surface override via localStorage');
sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
ok(sandbox.ffBackendCandlesScannerCharts() === true,  'returns true when key==="1"');
sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '0');
ok(sandbox.ffBackendCandlesScannerCharts() === false, 'returns false when key==="0" (explicit per-surface disable)');
sandbox.localStorage.removeItem('apex_ff_backend_candles_scanner_charts');
ok(sandbox.ffBackendCandlesScannerCharts() === true, 'returns true (global default) after key removed');

section('2b. non-"0"/"1" values fall through to the global policy (ON)');
['true', 'yes', '', 'false'].forEach((v) => {
  sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', v);
  ok(sandbox.ffBackendCandlesScannerCharts() === true, 'follows global default when value="' + v + '"');
});
sandbox.localStorage.removeItem('apex_ff_backend_candles_scanner_charts');

// global disable propagates to the per-surface flag (unless overridden to "1")
section('2c. global disable propagates to the per-surface flag');
sandbox.localStorage.setItem('apex_ff_prefer_backend_candles_charts', '0');
ok(sandbox.ffPreferBackendCandlesForCharts() === false, 'global policy OFF when key==="0"');
ok(sandbox.ffBackendCandlesScannerCharts() === false, 'per-surface follows global OFF with no override');
sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
ok(sandbox.ffBackendCandlesScannerCharts() === true, 'per-surface "1" still forces ON even when global OFF');
sandbox.localStorage.removeItem('apex_ff_backend_candles_scanner_charts');
sandbox.localStorage.removeItem('apex_ff_prefer_backend_candles_charts');

// ── 3. backend read response maps to scanner chart candle shape ────────────────
//      (read-first: warm cache → cached GETs only, no /warmup)
section('3. backend read response maps to scanner chart candle shape');
{
  const raw1d = bars(25, 500);
  const raw4h = bars(22, 480);
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: toBackendShape(raw1d) } }],
    read4h: [{ ok: true, body: { ok: true, candles: toBackendShape(raw4h) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === true,                           '3: result.ok is true');
  ok(r.source === 'BACKEND_CANDLE_STORE',     '3: source is BACKEND_CANDLE_STORE');
  ok(Array.isArray(r.candles1d),              '3: candles1d is an array');
  ok(r.candles1d.length === 25,               '3: candles1d has 25 bars');
  ok(f.calls.warmup === 0,                    '3: warm cache → /ensure NOT called');

  // Scanner chart renderer (_drawCandleChart/computeCandleIndicators) expects
  // {time, open, high, low, close, volume, source}
  const c0 = r.candles1d[0];
  ok(typeof c0.time   === 'number',  '3: candle.time is epoch-ms number');
  ok(typeof c0.open   === 'number',  '3: candle.open is number');
  ok(typeof c0.high   === 'number',  '3: candle.high is number');
  ok(typeof c0.low    === 'number',  '3: candle.low is number');
  ok(typeof c0.close  === 'number',  '3: candle.close is number');
  ok(typeof c0.volume === 'number',  '3: candle.volume is number');
  ok(c0.source === 'BACKEND_CANDLE_STORE',    '3: candle.source === BACKEND_CANDLE_STORE');

  ok(Array.isArray(r.candles4h) && r.candles4h.length >= 20, '3: candles4h populated');
  ok(r.candles4h[0].source === 'BACKEND_CANDLE_STORE',       '3: 4H candle.source correct');
}
{
  // Verify normalization sorts ascending by time even when backend returns reversed order.
  const raw = bars(30, 400);
  const reversed = toBackendShape([...raw].reverse());
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: reversed } }],
    read4h: [{ ok: true, body: { ok: true, candles: toBackendShape(raw.slice(0, 20)) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('NVDA');
  ok(r.ok && r.candles1d[0].time < r.candles1d[r.candles1d.length - 1].time,
    '3: candles1d sorted ascending by time');
  ok(f.calls.warmup === 0, '3: warm cache (sorted) → /ensure NOT called');
}

// ── 4. candle store endpoints; ensure uses 1D+4H; read-first ──────────────────
section('4. uses /market/candles endpoints; /ensure is warmup; read-first contract');
{
  // Strip diagnostics telemetry so these checks see only the real request logic.
  const src = stripCandleDiag(stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart')));

  ok(/\/market\/candles/.test(src), '4: uses /market/candles endpoint');
  ok(/\?.*timeframe=4H/.test(src),  '4: 4H read uses timeframe=4H query param');
  ok(/\?.*timeframe=1D/.test(src),  '4: 1D read uses timeframe=1D query param');

  // Ensure endpoint referenced at least once (also appears in error-log strings).
  const ensureCount = (src.match(/\/market\/candles\/ensure/g) || []).length;
  ok(ensureCount >= 1, '4: /market/candles/ensure referenced in function (warmup call present)');

  // Ensure warmup explicitly requests the backend's 1D + 30M + derived 4H set.
  ok(/_ensureTf\(symbol,\s*\['1D','30M','4H'\]/.test(src),
    '4: ensure warmup requests 1D, 30M, and 4H timeframes');

  // read-first: the 1D read endpoint must appear in source BEFORE /ensure.
  const read1dIdx = src.indexOf('timeframe=1D');
  const ensureIdx = src.indexOf('/market/candles/ensure');
  ok(read1dIdx >= 0 && ensureIdx >= 0 && read1dIdx < ensureIdx,
    '4: 1D cached read is positioned before /ensure (read-first)');

  ok(!/\/dev\/market\/candles-dxlink/.test(src),
    '4: no old /dev/market/candles-dxlink/ endpoints in function');
}

// ── 5. backend failure returns fallbackReason ─────────────────────────────────
section('5. backend failure returns fallbackReason');
{
  // 1D read empty (insufficient) → warmup attempted → warmup HTTP error.
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: [] } }],
    read4h: [{ ok: true, body: { ok: true, candles: [] } }],
    warmup: [{ ok: false, status: 503 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === false,                          '5: ok false on warmup HTTP failure');
  ok(typeof r.fallbackReason === 'string',    '5: fallbackReason is a string');
  ok(/ensure/.test(r.fallbackReason),         '5: fallbackReason mentions ensure');
  ok(/503/.test(r.fallbackReason),            '5: fallbackReason includes HTTP status');
  ok(f.calls.warmup === 1,                    '5: warmup attempted once when 1D missing');
}
{
  // 1D read returns HTTP error both before and after warmup → 1D_http_.
  const f = makeRouter({
    read1d: [{ ok: false, status: 404 }, { ok: false, status: 404 }],
    read4h: [{ ok: true, body: { ok: true, candles: [] } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === false,              '5: ok false on persistent 1D HTTP failure');
  ok(/1D/.test(r.fallbackReason), '5: fallbackReason mentions 1D');
  ok(f.calls.warmup === 1,        '5: warmup attempted once when 1D read non-OK');
}
{
  // 1D read returns <20 bars before and after warmup → 1D_insufficient.
  const fewBars = toBackendShape(bars(10, 100));
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: fewBars } }, { ok: true, body: { ok: true, candles: fewBars } }],
    read4h: [{ ok: true, body: { ok: true, candles: [] } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === false,                          '5: ok false when 1D insufficient after warmup');
  ok(/1D_insufficient/.test(r.fallbackReason), '5: fallbackReason is 1D_insufficient');
  ok(f.calls.warmup === 1,                    '5: warmup attempted once when 1D insufficient');
}
{
  // 1D usable on first read; 4H read fails → non-fatal, ok true; ensure is attempted for 4H.
  const good1d = toBackendShape(bars(25, 400));
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: good1d } }],
    read4h: [{ ok: false, status: 500 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === true,             '5: ok true even when 4H fails (non-fatal)');
  ok(r.candles4h === null,      '5: candles4h null when 4H HTTP fails');
  ok(r.candles1d.length >= 20,  '5: candles1d still populated when 4H fails');
  ok(f.calls.warmup === 1,      '5: usable 1D → ensure attempted for missing 4H');
}

// ── 5b. read-first / warm-only-if-needed behavior ─────────────────────────────
section('5b. read-first: warm cache skips warmup; cold cache warms once then re-reads');
{
  // Warm cache: usable 1D + 4H on first read → return immediately, no warmup.
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: toBackendShape(bars(25, 300)) } }],
    read4h: [{ ok: true, body: { ok: true, candles: toBackendShape(bars(21, 290)) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('TSLA');
  ok(r.ok === true,            '5b: warm cache → ok true');
  ok(f.calls.warmup === 0,     '5b: warm cache → /warmup NOT called');
  ok(f.calls.read1d === 1,     '5b: warm cache → 1D read exactly once (no re-read)');
  ok(r.diagnostics.warmed === false, '5b: diagnostics.warmed is false for warm cache');
}
{
  // Cold cache: 1D empty first, warmup once, then 1D+4H usable on re-read.
  const good1d = toBackendShape(bars(25, 300));
  const good4h = toBackendShape(bars(22, 290));
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: [] } },        // cold first read
             { ok: true, body: { ok: true, candles: good1d } }],   // re-read after warmup
    read4h: [{ ok: true, body: { ok: true, candles: [] } },
             { ok: true, body: { ok: true, candles: good4h } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('DELL');
  ok(r.ok === true,            '5b: cold cache → ok true after warmup+re-read');
  ok(f.calls.warmup === 1,     '5b: cold cache → /warmup called exactly once');
  ok(f.calls.read1d === 2,     '5b: cold cache → 1D read twice (read-first + re-read)');
  ok(r.candles1d.length === 25, '5b: cold cache → 1D candles populated after re-read');
  ok(r.candles4h && r.candles4h.length === 22, '5b: cold cache → 4H re-read populated');
  ok(r.diagnostics.warmed === true, '5b: diagnostics.warmed is true after warmup');
}

{
  // Acceptance: 1D exists, first 4H is missing_30m_for_4h/source30mCount=0;
  // ensure is called with scanner_chart_lookup, then 4H is re-read and populated.
  const good1d = toBackendShape(bars(25, 300));
  const good4h = toBackendShape(bars(22, 290));
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: good1d } }],
    read4h: [
      { ok: true, body: { ok: true, candles: [], count: 0, source30mCount: 0, missingReason: 'missing_30m_for_4h' } },
      { ok: true, body: { ok: true, candles: good4h } },
    ],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('QQQ');
  const body = JSON.parse(f.calls.lastWarmupOpts.body);
  ok(f.calls.warmup === 1, '5b: 1D usable + 4H missing → POST /market/candles/ensure called');
  ok(body.symbol === 'QQQ' && body.reason === 'scanner_chart_lookup', '5b: ensure body includes symbol and scanner_chart_lookup reason');
  ok(Array.isArray(body.timeframes) && body.timeframes.indexOf('1D') >= 0 && body.timeframes.indexOf('4H') >= 0,
    '5b: ensure body includes 1D and 4H timeframes');
  ok(f.calls.read4h === 2, '5b: 4H is re-read after ensure');
  ok(r.ok === true, '5b: result.ok remains true when 1D exists and 4H warms successfully');
  ok(r.candles1d && r.candles1d.length === 25, '5b: 1D remains populated');
  ok(r.candles4h && r.candles4h.length === 22, '5b: 4H populated after post-ensure re-read');
}
{
  // Acceptance: 1D exists, 4H remains empty after ensure → still ok true and 1D usable.
  const good1d = toBackendShape(bars(25, 300));
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: good1d } }],
    read4h: [
      { ok: true, body: { ok: true, candles: [], count: 0, source30mCount: 0, missingReason: 'missing_30m_for_4h' } },
      { ok: true, body: { ok: true, candles: [], count: 0, source30mCount: 0, missingReason: 'missing_30m_for_4h' } },
    ],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('QQQ');
  ok(f.calls.warmup === 1, '5b: 4H-still-empty path calls ensure exactly once');
  ok(f.calls.read4h === 3, '5b: 4H-still-empty path re-reads 4H twice after ensure');
  ok(r.ok === true, '5b: result.ok remains true when 4H is still unavailable');
  ok(r.candles1d && r.candles1d.length === 25, '5b: candles1d remains populated when 4H is still unavailable');
  ok(!r.candles4h, '5b: candles4h remains null/empty when backend still has no 4H');
}
{
  // 1D read throws on first attempt → fatal 1D_error, NO warmup (avoid waste).
  const f = makeRouter({}); // overridden below
  let n = 0;
  const throwing = function(url) {
    if (/timeframe=1D/.test(url)) { n++; return Promise.reject(new Error('neterr')); }
    if (/\/ensure/.test(url)) { throwing.warmupCalled = true; }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  };
  sandbox.fetch = throwing;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AAPL');
  ok(r.ok === false,             '5b: 1D transport throw → ok false');
  ok(/1D_error/.test(r.fallbackReason), '5b: fallbackReason is 1D_error on throw');
  ok(!throwing.warmupCalled,     '5b: 1D transport throw → warmup NOT called');
}

// ── 5c. acceptance: 4H missing is non-fatal; ensure only when needed ───────
section('5c. acceptance: 4H missing is non-fatal and ensure is conditional');
{
  const good1d = toBackendShape(bars(25, 500));
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: good1d } }],
    read4h: [
      { ok: true, body: { ok: true, candles: [], count: 0, source30mCount: 0, missingReason: 'missing_30m_for_4h' } },
      { ok: true, body: { ok: true, candles: [], count: 0, source30mCount: 0, missingReason: 'missing_30m_for_4h' } },
    ],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AMD');
  ok(r.ok === true, '5c: result remains ok:true when 1D is usable and 4H is missing');
  ok(r.candles1d && r.candles1d.length === 25, '5c: result still returns candles1d when 4H is missing');
  ok(!r.candles4h, '5c: missing 4H stays absent after ensure/re-read when backend still lacks it');
  ok(f.calls.warmup === 1 && f.calls.read4h === 3, '5c: missing 4H triggers exactly one ensure and two bounded 4H re-reads');
}
{
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: toBackendShape(bars(25, 500)) } }],
    read4h: [{ ok: true, body: { ok: true, candles: toBackendShape(bars(22, 490)) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AMD');
  ok(r.ok === true && r.candles1d && r.candles4h, '5c: full warm cache returns both timeframes');
  ok(f.calls.warmup === 0, '5c: /market/candles/ensure is not called when 1D and 4H are already usable');
}
{
  const f = makeRouter({
    read1d: [{ ok: true, body: { ok: true, candles: [] } }, { ok: true, body: { ok: true, candles: toBackendShape(bars(25, 500)) } }],
    read4h: [{ ok: true, body: { ok: true, candles: [] } }, { ok: true, body: { ok: true, candles: toBackendShape(bars(22, 490)) } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._scannerFetchBackendCandlesForChart('AMD');
  ok(r.ok === true && r.candles1d && r.candles4h, '5c: insufficient 1D warms and re-reads both timeframes');
  ok(f.calls.warmup === 1, '5c: /market/candles/ensure is called once when 1D is missing/insufficient');
}

// ── 6. /market/candles endpoints used in new backend scanner chart helper ──────
section('6. /market/candles endpoints used in _scannerFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart'));
  ok(/\/market\/candles/.test(src),
    '6: uses /market/candles endpoint');
  ok(/\/market\/candles\/ensure/.test(src),
    '6: /market/candles/ensure warmup present');
  ok(!/\/dev\/market\/candles-dxlink/.test(src),
    '6: no old DXLink candles path in helper');
}

// ── 7. no Yahoo string in the new backend scanner chart helper ─────────────────
section('7. no Yahoo in _scannerFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_scannerFetchBackendCandlesForChart'));
  ok(!/yahoo/i.test(src), '7: no Yahoo reference in scanner backend helper');
}

// ── 8. no new WebSocket usage ─────────────────────────────────────────────────
section('8. no new WebSocket in _scannerFetchBackendCandlesForChart');
{
  const src = extractFn(HTML, '_scannerFetchBackendCandlesForChart');
  ok(!/new WebSocket/.test(src), '8: helper opens no WebSocket');
}

// ── 9. flag false leaves legacy getDailyCandles / getFourHourCandles path ──────
section('9. flag false: legacy getDailyCandles / getFourHourCandles path unchanged');
{
  const src = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/getDailyCandles/.test(src),        '9: _dssRenderLargeCharts still calls getDailyCandles');
  ok(/getFourHourCandles/.test(src),     '9: _dssRenderLargeCharts still calls getFourHourCandles');
  ok(/ffBackendCandlesScannerCharts/.test(src), '9: flag check present in _dssRenderLargeCharts');

  // getDailyCandles must appear as a fallback — after the flag check
  const flagIdx    = src.indexOf('ffBackendCandlesScannerCharts');
  const dailyIdx   = src.lastIndexOf('getDailyCandles');
  ok(dailyIdx > flagIdx, '9: getDailyCandles fallback is positioned after flag check');

  sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '0');
  ok(sandbox.ffBackendCandlesScannerCharts() === false,
    '9: explicit per-surface "0" → legacy path is active');
  sandbox.localStorage.removeItem('apex_ff_backend_candles_scanner_charts');
}
{
  const src = stripComments(extractFn(HTML, 'ffBackendCandlesScannerCharts'));
  ok(/localStorage/.test(src), '9: flag reads localStorage');
  ok(/ffPreferBackendCandlesForCharts\(\)/.test(src), '9: flag delegates to the global chart policy');
}

// ── 10. scanner_chart subscription is gated behind the flag ───────────────────
section('10. scanner_chart DXLink subscription gated behind FF in _dssRenderLargeCharts');
{
  const src = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));

  // The scanner_chart subscription must still exist (legacy path) ...
  ok(/'scanner_chart'/.test(src) || /"scanner_chart"/.test(src),
    '10: scanner_chart reason still present for legacy path');

  // ... but it must be guarded by a negated flag check (skipped in backend mode).
  ok(/!ffBackendCandlesScannerCharts\(\)/.test(src),
    '10: a !ffBackendCandlesScannerCharts() guard is present');

  // The negated guard appears before the scanner_chart subscription call.
  const guardIdx = src.indexOf('!ffBackendCandlesScannerCharts()');
  const subIdx   = src.indexOf('scanner_chart');
  ok(guardIdx >= 0 && subIdx >= 0 && guardIdx < subIdx,
    '10: !flag guard precedes the scanner_chart subscription');
}

// ── summary ───────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);

})();
