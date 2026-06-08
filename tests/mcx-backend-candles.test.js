'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FF_BACKEND_CANDLES_MCX_CHARTS — pure-helper validation.
//
// Tests prove:
//   1.  flag default false (no localStorage)
//   2.  flag true only when localStorage key is '1'
//   3.  backend read response maps to MCX chart candle shape
//   4.  backend 4H uses read endpoint only after 30M warmup
//   5.  backend failure returns fallbackReason
//   6.  unsupported VIX/VI3M symbol falls back safely
//   7.  no /market/candles string in the new backend MCX helper
//   8.  no Yahoo string in the new backend MCX helper
//   9.  no new WebSocket usage
//   10. flag false leaves legacy MCX path unchanged
//   11. MCX cache does not use or mutate _pfBackendCandleCache
//
// Run: node tests/mcx-backend-candles.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extracts a named function (async or sync) from source.
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
  fetch: null,
  Object, Array, Promise,
  // _pfBackendCandleCache sentinel — must never be touched by MCX helpers
  _pfBackendCandleCache: null,
  _MCX_BACKEND_CACHE_TTL: 60000,
  _mcxBackendCandleCache: {},
};
vm.createContext(sandbox);

const FNS = [
  '_extractBackend4hDiag',
  'ffPreferBackendCandlesForCharts',
  'ffBackendCandlesMcxCharts',
  'ffBackendCandlesPortfolioCharts',
  '_apexParityNormCandleArray', '_apexParityNormCandle', '_apexParityNormTime',
  '_apexParityExtractBackendCandles',
  '_mcxGetBackendCandleEntry',
  '_mcxGetCachedBackendCandles',
  '_mcxCandlesLookStale',
  '_mcxFetchBackendCandlesForChart',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// Build N synthetic daily bars in internal {t,o,h,l,c,v} shape, ending ~now so
// the conservative staleness check (_mcxCandlesLookStale) treats them as FRESH.
function bars(n, base) {
  const out = [];
  const ms0 = Date.now() - n * 86400000; // last bar ≈ 1 day old → not stale
  for (let i = 0; i < n; i++) {
    const c = base + i * 0.5;
    out.push({ t: ms0 + i * 86400000, o: c - 0.1, h: c + 0.5, l: c - 0.5, c, v: 1000 });
  }
  return out;
}

// Build N synthetic daily bars ending well in the past so _mcxCandlesLookStale
// flags them as STALE (used to prove staleness triggers a warmup without force).
function staleBars(n, base) {
  const out = [];
  const ms0 = Date.now() - (n + 30) * 86400000; // last bar ≈ 30 days old → stale
  for (let i = 0; i < n; i++) {
    const c = base + i * 0.5;
    out.push({ t: ms0 + i * 86400000, o: c - 0.1, h: c + 0.5, l: c - 0.5, c, v: 1000 });
  }
  return out;
}

// Convert internal bars to backend ISO-timestamp shape.
function toBackendShape(rawBars) {
  return rawBars.map((c) => ({
    time: new Date(c.t).toISOString(),
    open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v,
  }));
}

// Mock fetch that consumes responses in order.
function makeFetch(responses) {
  let idx = 0;
  return function() {
    const resp = responses[idx++] || { ok: true, status: 200, body: {} };
    const isOk = resp.ok !== false;
    return Promise.resolve({
      ok:   isOk,
      status: resp.status || (isOk ? 200 : 500),
      json: () => Promise.resolve(resp.body || {}),
    });
  };
}

// URL-aware fetch router that records call counts per endpoint kind.
// routes: { read1d: [resp, ...], read4h: [...], warmup: [...] }
// Each kind consumes its response list in order (last entry repeats).
// This lets read-first tests assert whether/when /warmup was called.
function makeRouter(routes) {
  const calls = { read1d: 0, read4h: 0, warmup: 0, other: 0, urls: [] };
  const fn = function(url /*, opts */) {
    calls.urls.push(url);
    let kind = 'other';
    if (/\/warmup/.test(url))            kind = 'warmup';
    else if (/timeframe=1D/.test(url))   kind = 'read1d';
    else if (/timeframe=4H/.test(url))   kind = 'read4h';
    calls[kind]++;
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

// Capture fetch calls to inspect URLs.
function makeCaptureFetch(responses) {
  const calls = [];
  let idx = 0;
  const fn = function(url) {
    calls.push(url);
    const resp = responses[idx++] || { ok: true, status: 200, body: {} };
    const isOk = resp.ok !== false;
    return Promise.resolve({
      ok: isOk,
      status: resp.status || (isOk ? 200 : 500),
      json: () => Promise.resolve(resp.body || {}),
    });
  };
  fn.calls = calls;
  return fn;
}

(async () => {

// ── 1. flag defaults to the global chart policy (DEFAULT ON) ───────────────────
section('1. FF_BACKEND_CANDLES_MCX_CHARTS delegates to global policy (default ON)');
ok(sandbox.ffPreferBackendCandlesForCharts() === true, '1: global chart policy defaults ON');
ok(sandbox.ffBackendCandlesMcxCharts() === true, '1: returns true (global default) with no per-surface key');

// ── 2. per-surface override: "1" forces ON, "0" forces OFF ────────────────────
section('2. per-surface override via localStorage');
sandbox.localStorage.setItem('apex_ff_backend_candles_mcx_charts', '1');
ok(sandbox.ffBackendCandlesMcxCharts() === true,  '2: returns true when key==="1"');
sandbox.localStorage.setItem('apex_ff_backend_candles_mcx_charts', '0');
ok(sandbox.ffBackendCandlesMcxCharts() === false, '2: returns false when key==="0" (explicit per-surface disable)');
sandbox.localStorage.removeItem('apex_ff_backend_candles_mcx_charts');
ok(sandbox.ffBackendCandlesMcxCharts() === true, '2: returns true (global default) after key removed');

section('2b. non-"0"/"1" values fall through to the global policy (ON)');
['true', 'yes', '', 'false'].forEach((v) => {
  sandbox.localStorage.setItem('apex_ff_backend_candles_mcx_charts', v);
  ok(sandbox.ffBackendCandlesMcxCharts() === true, '2b: follows global default when value="' + v + '"');
});
sandbox.localStorage.removeItem('apex_ff_backend_candles_mcx_charts');

section('2c. global disable propagates to the per-surface flag');
sandbox.localStorage.setItem('apex_ff_prefer_backend_candles_charts', '0');
ok(sandbox.ffBackendCandlesMcxCharts() === false, '2c: per-surface follows global OFF with no override');
sandbox.localStorage.setItem('apex_ff_backend_candles_mcx_charts', '1');
ok(sandbox.ffBackendCandlesMcxCharts() === true, '2c: per-surface "1" still forces ON even when global OFF');
sandbox.localStorage.removeItem('apex_ff_backend_candles_mcx_charts');
sandbox.localStorage.removeItem('apex_ff_prefer_backend_candles_charts');

// ── 3. backend read response maps to MCX chart candle shape ───────────────────
//      (read-first: warm cache → cached GETs only, no /warmup)
section('3. backend read response maps to MCX chart candle shape');
{
  const raw1d = bars(25, 500);
  const raw4h = bars(22, 480);
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(raw1d) } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(raw4h) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,                           '3: result.ok is true');
  ok(r.source === 'BACKEND_DXLINK_CANDLES',   '3: source is BACKEND_DXLINK_CANDLES');
  ok(Array.isArray(r.candles1d),              '3: candles1d is an array');
  ok(r.candles1d.length === 25,               '3: candles1d has 25 bars');
  ok(f.calls.warmup === 0,                    '3: warm cache → /warmup NOT called');

  // MCX chart renderer expects {time, open, high, low, close, volume, source}
  const c0 = r.candles1d[0];
  ok(typeof c0.time   === 'number',  '3: candle.time is epoch-ms number');
  ok(typeof c0.open   === 'number',  '3: candle.open is number');
  ok(typeof c0.high   === 'number',  '3: candle.high is number');
  ok(typeof c0.low    === 'number',  '3: candle.low is number');
  ok(typeof c0.close  === 'number',  '3: candle.close is number');
  ok(typeof c0.volume === 'number',  '3: candle.volume is number');
  ok(c0.source === 'BACKEND_DXLINK_CANDLES', '3: candle.source === BACKEND_DXLINK_CANDLES');

  ok(Array.isArray(r.candles4h) && r.candles4h.length >= 20, '3: candles4h populated');
  ok(r.candles4h[0].source === 'BACKEND_DXLINK_CANDLES',     '3: 4H candle.source correct');
}
{
  // Normalization sorts ascending by time even when backend returns reversed order.
  const raw = bars(30, 400);
  const reversed = toBackendShape([...raw].reverse());
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: reversed } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(raw.slice(-20)) } }], // newest 20 → fresh
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok && r.candles1d[0].time < r.candles1d[r.candles1d.length - 1].time,
    '3: candles1d sorted ascending by time');
  ok(f.calls.warmup === 0, '3: warm cache (sorted) → /warmup NOT called');
}

// ── 4. 4H uses read endpoint; warmup timeframes are 1D+30M only; read-first ────
section('4. 4H uses read endpoint; warmup timeframes are 1D+30M only; read-first');
{
  // Strip diagnostics telemetry so these checks see only the real request logic.
  const src = stripCandleDiag(stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart')));

  ok(/30M/.test(src), '4: 30M present in warmup timeframes');

  const warmupBodyMatch = src.match(/timeframes\s*:\s*\[[^\]]+\]/);
  ok(warmupBodyMatch !== null, '4: timeframes array literal found');
  if (warmupBodyMatch) {
    ok(!/'4H'/.test(warmupBodyMatch[0]) && !/"4H"/.test(warmupBodyMatch[0]),
      '4: 4H not in warmup timeframes (derived server-side from 30M)');
  }

  ok(/\?timeframe=4H/.test(src), '4: 4H read uses ?timeframe=4H endpoint');
  ok(/\?timeframe=1D/.test(src), '4: 1D read uses ?timeframe=1D endpoint');

  const warmupCount = (src.match(/\/warmup/g) || []).length;
  ok(warmupCount === 1, '4: /warmup endpoint referenced exactly once');

  // read-first: the 1D read endpoint must appear in source BEFORE /warmup.
  const read1dIdx = src.indexOf('?timeframe=1D');
  const warmupIdx = src.indexOf('/warmup');
  ok(read1dIdx >= 0 && warmupIdx >= 0 && read1dIdx < warmupIdx,
    '4: 1D cached read is positioned before /warmup (read-first)');
}

// ── 5. backend failure returns fallbackReason ─────────────────────────────────
section('5. backend failure returns fallbackReason');
{
  // 1D read empty (insufficient) → warmup attempted → warmup HTTP error.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: [] } }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: false, status: 503 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,                        '5: ok false on warmup HTTP failure');
  ok(typeof r.fallbackReason === 'string',  '5: fallbackReason is a string');
  ok(/warmup/.test(r.fallbackReason),       '5: fallbackReason mentions warmup');
  ok(/503/.test(r.fallbackReason),          '5: fallbackReason includes HTTP status');
  ok(f.calls.warmup === 1,                  '5: warmup attempted once when 1D missing');
}
{
  // 1D read returns HTTP error both before and after warmup → 1D_http_.
  const f = makeRouter({
    read1d: [{ ok: false, status: 404 }, { ok: false, status: 404 }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,             '5: ok false on persistent 1D HTTP failure');
  ok(/1D/.test(r.fallbackReason), '5: fallbackReason mentions 1D');
  ok(f.calls.warmup === 1,        '5: warmup attempted once when 1D read non-OK');
}
{
  // 1D returns fewer than 20 bars before and after warmup → 1D_insufficient.
  const fewBars = toBackendShape(bars(10, 100));
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: fewBars } }, { ok: true, body: { candles: fewBars } }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === false,                           '5: ok false when 1D insufficient after warmup');
  ok(/1D_insufficient/.test(r.fallbackReason), '5: fallbackReason is 1D_insufficient');
  ok(f.calls.warmup === 1,                     '5: warmup attempted once when 1D insufficient');
}
{
  // 1D usable on first read; 4H read fails → non-fatal, ok true, no warmup.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(bars(25, 400)) } }],
    read4h: [{ ok: false, status: 500 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,            '5: ok true even when 4H fails (non-fatal)');
  ok(r.candles4h === null,     '5: candles4h null when 4H HTTP fails');
  ok(r.candles1d.length >= 20, '5: candles1d still populated when 4H fails');
  ok(f.calls.warmup === 0,     '5: usable 1D → no warmup even if 4H fails');
}

// ── 5b. read-first / warm-only-if-needed behavior ─────────────────────────────
section('5b. read-first: warm cache skips warmup; cold cache warms once then re-reads');
{
  // Warm cache: usable 1D + 4H on first read → return immediately, no warmup.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(bars(25, 300)) } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(bars(21, 290)) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,                  '5b: warm cache → ok true');
  ok(f.calls.warmup === 0,           '5b: warm cache → /warmup NOT called');
  ok(f.calls.read1d === 1,           '5b: warm cache → 1D read exactly once (no re-read)');
  ok(r.diagnostics.warmed === false, '5b: diagnostics.warmed is false for warm cache');
}
{
  // Cold cache: 1D empty first, warmup once, then 1D+4H usable on re-read.
  const good1d = toBackendShape(bars(25, 300));
  const good4h = toBackendShape(bars(22, 290));
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: [] } },        // cold first read
             { ok: true, body: { candles: good1d } }],   // re-read after warmup
    read4h: [{ ok: true, body: { candles: [] } },
             { ok: true, body: { candles: good4h } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('VI3M');
  ok(r.ok === true,                 '5b: cold cache → ok true after warmup+re-read');
  ok(f.calls.warmup === 1,          '5b: cold cache → /warmup called exactly once');
  ok(f.calls.read1d === 2,          '5b: cold cache → 1D read twice (read-first + re-read)');
  ok(r.candles1d.length === 25,     '5b: cold cache → 1D candles populated after re-read');
  ok(r.candles4h && r.candles4h.length === 22, '5b: cold cache → 4H re-read populated');
  ok(r.diagnostics.warmed === true, '5b: diagnostics.warmed is true after warmup');
}

// ── 6. unsupported VIX/VI3M symbol falls back safely ─────────────────────────
section('6. unsupported VI3M symbol falls back safely');
{
  // Empty backend cache + warmup failing for a VIX-style symbol (503).
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: [] } }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: false, status: 503 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('$VIX3M.X');
  ok(r.ok === false,                    '6: ok false for unsupported VI3M warmup failure');
  ok(typeof r.fallbackReason === 'string', '6: fallbackReason is a string');
  ok(r.fallbackReason.length > 0,       '6: fallbackReason is non-empty');
}
{
  // 1D stays empty even after warmup for VIX-style symbol → 1D_insufficient.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: [] } }, { ok: true, body: { candles: [] } }],
    read4h: [{ ok: true, body: { candles: [] } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('$VIX3M.X');
  ok(r.ok === false,                           '6: ok false when 1D empty for VI3M');
  ok(/1D_insufficient/.test(r.fallbackReason), '6: fallbackReason is 1D_insufficient');
}

// ── 7. no /market/candles in _mcxFetchBackendCandlesForChart ──────────────────
section('7. no /market/candles in _mcxFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));
  ok(!/\/market\/candles(?!-dxlink)/.test(src),
    '7: no /market/candles (non-dev) in MCX helper');
  ok(/\/dev\/market\/candles-dxlink\//.test(src),
    '7: uses /dev/market/candles-dxlink/ endpoints');
  ok(/\/dev\/market\/candles-dxlink\/warmup/.test(src),
    '7: warmup endpoint present');
}

// ── 8. no Yahoo in _mcxFetchBackendCandlesForChart ────────────────────────────
section('8. no Yahoo in _mcxFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));
  ok(!/yahoo/i.test(src), '8: no Yahoo reference in MCX backend helper');
}

// ── 9. no new WebSocket in _mcxFetchBackendCandlesForChart ────────────────────
section('9. no new WebSocket in _mcxFetchBackendCandlesForChart');
{
  const src = extractFn(HTML, '_mcxFetchBackendCandlesForChart');
  ok(!/new WebSocket/.test(src), '9: helper opens no WebSocket');
}

// ── 10. flag false leaves legacy MCX render path unchanged ────────────────────
section('10. flag false: legacy MCX path unchanged');
{
  const src = stripComments(extractFn(HTML, '_mcxRenderCharts'));
  ok(/getDailyCandles/.test(src),     '10: _mcxRenderCharts still calls getDailyCandles');
  ok(/getFourHourCandles/.test(src),  '10: _mcxRenderCharts still calls getFourHourCandles');
  ok(/ffBackendCandlesMcxCharts/.test(src), '10: flag check present in _mcxRenderCharts');

  // Legacy candle getters must appear after the flag check
  const flagIdx  = src.indexOf('ffBackendCandlesMcxCharts');
  const dailyIdx = src.lastIndexOf('getDailyCandles');
  ok(dailyIdx > flagIdx, '10: getDailyCandles fallback positioned after flag check');

  sandbox.localStorage.setItem('apex_ff_backend_candles_mcx_charts', '0');
  ok(sandbox.ffBackendCandlesMcxCharts() === false,
    '10: explicit per-surface "0" → legacy path is active');
  sandbox.localStorage.removeItem('apex_ff_backend_candles_mcx_charts');
}
{
  const src = stripComments(extractFn(HTML, 'ffBackendCandlesMcxCharts'));
  ok(/localStorage/.test(src),        '10: flag reads localStorage');
  ok(/ffPreferBackendCandlesForCharts\(\)/.test(src), '10: flag delegates to the global chart policy');
}

// ── 11. MCX cache does not use or mutate _pfBackendCandleCache ────────────────
section('11. MCX cache isolation from _pfBackendCandleCache');
{
  const mcxFetchSrc = stripComments(extractFn(HTML, '_mcxFetchBackendCandlesForChart'));
  ok(!/_pfBackendCandleCache/.test(mcxFetchSrc),
    '11: _mcxFetchBackendCandlesForChart does not reference _pfBackendCandleCache');

  // Cache entry helpers also must not reference portfolio cache
  const entrySrc  = stripComments(extractFn(HTML, '_mcxGetBackendCandleEntry'));
  const cachedSrc = stripComments(extractFn(HTML, '_mcxGetCachedBackendCandles'));
  ok(!/_pfBackendCandleCache/.test(entrySrc),
    '11: _mcxGetBackendCandleEntry does not reference _pfBackendCandleCache');
  ok(!/_pfBackendCandleCache/.test(cachedSrc),
    '11: _mcxGetCachedBackendCandles does not reference _pfBackendCandleCache');

  // Portfolio cache variable must be untouched in sandbox
  ok(sandbox._pfBackendCandleCache === null,
    '11: sandbox _pfBackendCandleCache is still null after all MCX calls');

  // MCX cache is separate: uses _mcxBackendCandleCache
  const renderSrc = stripComments(extractFn(HTML, '_mcxRenderCharts'));
  ok(/_mcxBackendCandleCache/.test(renderSrc) || /ffBackendCandlesMcxCharts/.test(renderSrc),
    '11: _mcxRenderCharts references MCX-specific cache or flag');
}

// ── 12. flag ON: MCX opens no direct frontend Candle subscriptions ────────────
section('12. flag ON gates frontend Candle subscriptions out of _mcxRenderCharts');
{
  const src = stripComments(extractFn(HTML, '_mcxRenderCharts'));

  // The benchmark/chart_open subscription calls must still exist (legacy path)…
  ok(/_ensure30MSubscription\(\s*'SPY'\s*,\s*'benchmark'\s*\)/.test(src),
    '12: legacy 30M SPY benchmark subscription still present (flag OFF path)');
  ok(/_ensureCandleSubscription\(\s*'SPY'\s*,\s*'benchmark'\s*\)/.test(src),
    '12: legacy SPY benchmark candle subscription still present (flag OFF path)');

  // …but every subscription call must sit behind a !ffBackendCandlesMcxCharts() guard.
  // Verify the guard appears before the first subscription call in source order.
  const guardIdx = src.indexOf('!ffBackendCandlesMcxCharts()');
  const subIdx   = src.indexOf("_ensureCandleSubscription('SPY', 'benchmark')");
  const sub30Idx = src.indexOf("_ensure30MSubscription('SPY', 'benchmark')");
  ok(guardIdx >= 0, '12: _mcxRenderCharts contains a !ffBackendCandlesMcxCharts() subscription guard');
  ok(guardIdx >= 0 && subIdx   >= 0 && guardIdx < subIdx,
    '12: candle subscription is gated behind !ffBackendCandlesMcxCharts()');
  ok(guardIdx >= 0 && sub30Idx >= 0 && guardIdx < sub30Idx,
    '12: 30M subscription is gated behind !ffBackendCandlesMcxCharts()');

  // Flag ON must show a neutral backend-unavailable 4H state (no DXLink fallback).
  ok(/unavailable from backend/i.test(src),
    '12: neutral backend-unavailable 4H state present for flag ON');
}

// ── 13. forceRefresh: warm BEFORE final read even when cache is already warm ──
section('13. forceRefresh warms a warm cache, then re-reads 1D + 4H');
{
  // Warm cache (usable 1D + 4H on first read). Without force this would NOT warm
  // (proven in test 3/5b). With forceRefresh:true it must warm, then re-read.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(bars(25, 300)) } },   // read-first
             { ok: true, body: { candles: toBackendShape(bars(26, 300)) } }],  // re-read after warmup
    read4h: [{ ok: true, body: { candles: toBackendShape(bars(21, 290)) } },
             { ok: true, body: { candles: toBackendShape(bars(22, 290)) } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY', { forceRefresh: true });
  ok(r.ok === true,                       '13: ok true with forceRefresh on warm cache');
  ok(f.calls.warmup === 1,                '13: forceRefresh warms even though cache was warm');
  ok(f.calls.read1d === 2,                '13: 1D re-read after forced warmup (read-first + re-read)');
  ok(f.calls.read4h === 2,                '13: 4H re-read after forced warmup');
  ok(r.candles1d.length === 26,           '13: 1D reflects post-warmup re-read');
  ok(r.candles4h && r.candles4h.length === 22, '13: 4H reflects post-warmup re-read');
  ok(r.diagnostics.warmed === true,       '13: diagnostics.warmed true after forced warmup');
  ok(r.diagnostics.forceRefresh === true, '13: diagnostics.forceRefresh true');
}
{
  // Default (no opts / forceRefresh:false) must remain read-first on a warm cache.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(bars(25, 300)) } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(bars(21, 290)) } }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY');
  ok(r.ok === true,                        '13: default read-first ok on warm cache');
  ok(f.calls.warmup === 0,                 '13: default → no warmup (read-first unchanged)');
  ok(r.diagnostics.warmed === false,       '13: default diagnostics.warmed false');
  ok(r.diagnostics.forceRefresh === false, '13: default diagnostics.forceRefresh false');
}

// ── 14. forceRefresh keeps 4H non-fatal; warmup failure non-fatal on warm 1D ──
section('14. forceRefresh: 4H stays non-fatal; warmup failure non-fatal with usable 1D');
{
  // Forced warmup succeeds, but the 4H re-read fails → ok true, 1D still charted.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(bars(25, 400)) } },
             { ok: true, body: { candles: toBackendShape(bars(25, 400)) } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(bars(21, 390)) } },
             { ok: false, status: 500 }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY', { forceRefresh: true });
  ok(r.ok === true,            '14: ok true even when 4H re-read fails under force');
  ok(r.candles1d.length >= 20, '14: 1D still populated when 4H re-read fails');
  ok(f.calls.warmup === 1,     '14: warmup attempted once under force');
}
{
  // Warm 1D but the forced warmup itself fails (503) → non-fatal: chart cached 1D.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(bars(25, 400)) } }],
    read4h: [{ ok: true, body: { candles: toBackendShape(bars(21, 390)) } }],
    warmup: [{ ok: false, status: 503 }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY', { forceRefresh: true });
  ok(r.ok === true,                  '14: warmup failure non-fatal when 1D already usable');
  ok(r.candles1d.length === 25,      '14: cached 1D charted despite warmup failure');
  ok(r.diagnostics.warmed === false, '14: warmed false when forced warmup failed');
  ok(f.calls.read1d === 1,           '14: no 1D re-read after failed warmup (kept cached)');
}

// ── 15. staleness: evidently old cache warms even without forceRefresh ────────
section('15. _mcxCandlesLookStale triggers warmup without forceRefresh');
{
  ok(sandbox._mcxCandlesLookStale(null, '1D') === false,            '15: null candles → not stale');
  ok(sandbox._mcxCandlesLookStale([], '1D') === false,             '15: empty candles → not stale');
  const freshMapped = toBackendShape(bars(25, 100)).map((c) => ({ time: new Date(c.time).getTime() }));
  ok(sandbox._mcxCandlesLookStale(freshMapped, '1D') === false,    '15: ~1-day-old bars → fresh');
  const staleMapped = staleBars(25, 100).map((c) => ({ time: c.t }));
  ok(sandbox._mcxCandlesLookStale(staleMapped, '1D') === true,     '15: ~30-day-old bars → stale (1D)');
  ok(sandbox._mcxCandlesLookStale(staleMapped, '4H') === true,     '15: ~30-day-old bars → stale (4H)');
}
{
  // 1D read returns a usable-but-STALE series → warmup fires even though 1D has
  // ≥20 bars and forceRefresh is false. After warmup the re-read returns fresh.
  const f = makeRouter({
    read1d: [{ ok: true, body: { candles: toBackendShape(staleBars(25, 300)) } }, // stale, but ≥20
             { ok: true, body: { candles: toBackendShape(bars(25, 300)) } }],     // fresh re-read
    read4h: [{ ok: true, body: { candles: toBackendShape(staleBars(21, 290)) } },
             { ok: true, body: { candles: toBackendShape(bars(21, 290)) } }],
    warmup: [{ ok: true, body: {} }],
  });
  sandbox.fetch = f;
  const r = await sandbox._mcxFetchBackendCandlesForChart('SPY'); // no force
  ok(r.ok === true,                 '15: ok true after stale-triggered warmup');
  ok(f.calls.warmup === 1,          '15: stale cache → warmup fired without forceRefresh');
  ok(f.calls.read1d === 2,          '15: stale cache → 1D re-read after warmup');
  ok(r.diagnostics.warmed === true, '15: diagnostics.warmed true after stale warmup');
}

// ── 16. no /market/candles, Yahoo, or WebSocket reachable via new code paths ──
section('16. data-source policy preserved after refresh changes');
{
  const fetchSrc = extractFn(HTML, '_mcxFetchBackendCandlesForChart');
  const fetchClean = stripComments(fetchSrc);
  ok(!/\/market\/candles(?!-dxlink)/.test(fetchClean), '16: no legacy /market/candles in fetch helper');
  ok(!/yahoo/i.test(fetchClean),                       '16: no Yahoo in fetch helper');
  ok(!/new WebSocket/.test(fetchSrc),                  '16: fetch helper opens no WebSocket');
  // warmup timeframes are still 1D+30M only (never 4H) after the refactor.
  // (stripCandleDiag drops telemetry metadata so we match the real warmup body.)
  const warmupBodyMatch = stripCandleDiag(fetchClean).match(/timeframes\s*:\s*\[[^\]]+\]/);
  ok(warmupBodyMatch && !/4H/.test(warmupBodyMatch[0]), '16: warmup timeframes are 1D+30M (no 4H)');
  // _mcxRenderCharts must not open frontend Candle subscriptions when flag is ON.
  const renderClean = stripComments(extractFn(HTML, '_mcxRenderCharts'));
  const guardIdx = renderClean.indexOf('!ffBackendCandlesMcxCharts()');
  const subIdx   = renderClean.indexOf("_ensureCandleSubscription('SPY', 'benchmark')");
  ok(guardIdx >= 0 && subIdx >= 0 && guardIdx < subIdx,
    '16: candle subscriptions still gated behind !ffBackendCandlesMcxCharts()');
}

// ── summary ───────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);

})();
