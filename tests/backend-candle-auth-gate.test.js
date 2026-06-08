'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend candle AUTH-READY gate + 401 BACKOFF — behavior + anti-regression.
//
// Proves the fix for the login-time 401 storm:
//   • backend-first candle GET is SKIPPED when backend/auth is not ready;
//   • a 401 response activates a backoff that prevents further GET fan-out;
//   • visible_rows_change / scanner render does NOT call the candle GET loader
//     (only POST /context prewarm);
//   • chart_open uses the backend GET once auth is ready;
//   • gate-closed reasons are distinguished so surfaces never convert them into a
//     browser subscription burst.
//
// Run: node tests/backend-candle-auth-gate.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
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

function bars(n) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = 100 + i * 0.5;
    out.push({ time: new Date(ms0 + i * 86400000).toISOString(), open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000 });
  }
  return out;
}

// Build a sandbox with the REAL gate + fetcher functions and a counting fetch mock.
function buildSandbox(fetchImpl) {
  const provLog = [];
  const sb = {
    console, Date, JSON, Math, Number, Boolean, isFinite, parseFloat, parseInt,
    encodeURIComponent, Object, Array, Promise, String,
    BACKEND: 'https://backend.test',
    AbortSignal: { timeout: () => ({}) },
    S: { backendKey: '', ttConnected: false, ttSessionId: null },
    _backendCandleAuth: { backoffUntil: 0, lastStatus: null, last401At: null, lastError: null, recentFailures: [] },
    _BACKEND_CANDLE_BACKOFF_MS: 60000,
    _BACKEND_CANDLE_FAIL_MAX: 30,
    _candleDiagNowIso: () => new Date().toISOString(),
    _backendAuthHeaders: (extra) => Object.assign({}, extra || {}),
    _recordCandleSubscriptionRequest: () => {},
    _recordCandleProvenance: (source, ctx) => { provLog.push({ source, ctx }); },
    __fetchCount: 0,
    __provLog: provLog,
  };
  sb.fetch = function(url, opts) { sb.__fetchCount++; return fetchImpl(url, opts); };
  vm.createContext(sb);
  vm.runInContext([
    '_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray', '_apexParityExtractBackendCandles',
    '_backendCandleAuthReady', '_backendCandleBackoffActive', '_backendCandleGateOpen', '_backendCandleGateReason',
    '_noteBackendCandleFailure', '_noteBackendCandleSuccess', '_isBackendGateClosedReason',
    '_scannerFetchBackendCandlesForChart', '_loadBackendChartCandles',
  ].map((n) => extractFn(HTML, n)).join('\n'), sb);
  return sb;
}

(async () => {
  // ── 1. auth-ready predicate ─────────────────────────────────────────────────
  section('1. _backendCandleAuthReady requires backend URL + api key + TT session');
  {
    const sb = buildSandbox(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: bars(25) }) }));
    ok(sb._backendCandleAuthReady() === false, '1: not ready with no backendKey / TT session');
    sb.S.backendKey = 'KEY';
    ok(sb._backendCandleAuthReady() === false, '1: still not ready without TT session');
    sb.S.ttConnected = true; sb.S.ttSessionId = 'sess';
    ok(sb._backendCandleAuthReady() === true, '1: ready with backendKey + TT session');
  }

  // ── 2. gate closed when auth not ready → no fetch, no fan-out ───────────────
  section('2. backend candle GET is skipped when auth is not ready');
  {
    const sb = buildSandbox(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: bars(25) }) }));
    const r = await sb._loadBackendChartCandles('NVDA');
    ok(r.ok === false && r.fallbackReason === 'backend_auth_not_ready', '2: returns backend_auth_not_ready');
    ok(sb.__fetchCount === 0, '2: NO fetch fired (no 401 storm)');
    ok(sb.__provLog.some((p) => p.source === 'backend_auth_not_ready'), '2: provenance records backend_auth_not_ready');
  }

  // ── 3. 401 response arms backoff and halts further GET fan-out ──────────────
  section('3. a 401 activates backoff; subsequent calls skip without fetching');
  {
    const sb = buildSandbox(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }));
    sb.S.backendKey = 'KEY'; sb.S.ttConnected = true; sb.S.ttSessionId = 'sess';
    ok(sb._backendCandleGateOpen() === true, '3: gate open before the first call');
    const r1 = await sb._loadBackendChartCandles('NVDA');
    ok(r1.ok === false, '3: first call fails on 401');
    ok(sb.__fetchCount >= 1, '3: first call did hit the network');
    ok(sb._backendCandleBackoffActive() === true, '3: 401 armed the backoff');
    ok(sb._backendCandleAuth.last401At != null, '3: last401At recorded');
    const countAfter1 = sb.__fetchCount;
    const r2 = await sb._loadBackendChartCandles('AAPL');
    ok(r2.ok === false && r2.fallbackReason === 'backend_backoff_active', '3: second call short-circuits with backend_backoff_active');
    ok(sb.__fetchCount === countAfter1, '3: second call fired NO additional fetch (no fan-out storm)');
  }

  // ── 4. success path works once auth is ready and clears backoff ─────────────
  section('4. chart_open uses the backend GET once auth is ready');
  {
    const sb = buildSandbox((url) => {
      // 1D returns 25 bars; 4H returns 22 bars; both OK.
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: bars(/timeframe=4H/.test(url) ? 22 : 25) }) });
    });
    sb.S.backendKey = 'KEY'; sb.S.ttConnected = true; sb.S.ttSessionId = 'sess';
    const r = await sb._loadBackendChartCandles('SNOW');
    ok(r.ok === true, '4: backend GET succeeds when auth ready');
    ok(r.candles1d && r.candles1d.length >= 20, '4: returns 1D candles');
    ok(sb.__fetchCount >= 1, '4: network was used');
    ok(sb._backendCandleBackoffActive() === false, '4: success keeps backoff clear');
  }

  // ── 5. gate-closed reason classifier ────────────────────────────────────────
  section('5. _isBackendGateClosedReason distinguishes gate-closed from data failures');
  {
    const sb = buildSandbox(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    ok(sb._isBackendGateClosedReason('backend_auth_not_ready') === true, '5: auth-not-ready is gate-closed');
    ok(sb._isBackendGateClosedReason('backend_backoff_active') === true, '5: backoff-active is gate-closed');
    ok(sb._isBackendGateClosedReason('1D_insufficient:0') === false, '5: data failure is NOT gate-closed');
    ok(sb._isBackendGateClosedReason('warmup_http_500') === false, '5: warmup failure is NOT gate-closed');
  }

  // ── 6. scanner render fires only POST /context, never the candle GET loader ──
  section('6. visible_rows_change / scanner render does not fan out candle GETs');
  {
    ['renderScanResults', 'renderDirectionalSetupScanner'].forEach((name) => {
      const src = stripComments(extractFn(HTML, name));
      ok(/postCandleContext\(/.test(src), '6: ' + name + ' issues a postCandleContext prewarm hint');
      ok(!/_loadBackendChartCandles\(|_scannerFetchBackendCandlesForChart\(|_portfolioFetchBackendCandlesForChart\(|_mcxFetchBackendCandlesForChart\(/.test(src),
        '6: ' + name + ' never calls a backend candle GET loader (no visible-row fan-out)');
    });
  }

  // ── 7. surfaces suppress browser fallback when the gate is closed ───────────
  section('7. gate-closed reasons do not convert into a browser subscription');
  {
    const scn = stripComments(extractFn(HTML, '_scannerLoadBackendCandlesForInlineChart'));
    ok(/_isBackendGateClosedReason\(/.test(scn), '7: scanner loader checks _isBackendGateClosedReason');
    const scnGuard = scn.indexOf('_isBackendGateClosedReason');
    const scnFallback = scn.indexOf('_scannerInlineChartBrowserFallback(symbol, _scReason)');
    ok(scnGuard >= 0 && scnFallback >= 0 && scnGuard < scnFallback, '7: scanner gate-closed branch precedes the browser fallback');

    const rs = stripComments(extractFn(HTML, '_rsLoadBackendCandlesForChart'));
    ok(/_isBackendGateClosedReason\(/.test(rs), '7: RS loader checks _isBackendGateClosedReason');
  }

  // ── 8. apexDebugCandleSubscriptions exposes auth/backoff diagnostics ─────────
  section('8. apexDebugCandleSubscriptions exposes backend auth/backoff state');
  {
    const src = stripComments(extractFn(HTML, 'apexDebugCandleSubscriptions'));
    ['backendCandleAuthReady', 'backendCandleBackoffActive', 'lastBackendCandleStatus', 'lastBackendCandleError', 'recentBackendCandleFailures']
      .forEach((k) => ok(new RegExp(k).test(src), '8: exposes ' + k));
  }

  console.log('\n' + (fail === 0 ? 'All ' + pass + ' tests passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  process.exit(fail ? 1 : 0);
})();
