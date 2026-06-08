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
    _backendApiAuthState: { lastStatus: null, lastOkAt: null, last401At: null, lastEndpoint: null, invalidApiKey: false },
    _apexAuthSkipLogged: {},
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
    '_recordBackendApiAuthResult', '_backendGateProvenanceSource',
    'backendApiAuthKnownInvalid', '_resetBackendApiAuthState', '_apexAuthSkip',
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
    // The 401 both arms the backoff AND latches the invalid-key state; either way the
    // gate is closed and the second call must short-circuit without a new fetch.
    ok(r2.ok === false && sb._isBackendGateClosedReason(r2.fallbackReason), '3: second call short-circuits with a gate-closed reason (' + r2.fallbackReason + ')');
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

  // ── 5b. x-api-key PRESENT but INVALID (a 401 from any authed endpoint) ──────
  section('5b. present-but-invalid x-api-key closes the gate (no candle calls)');
  {
    const sb = buildSandbox(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: bars(25) }) }));
    sb.S.backendKey = 'BADKEY'; sb.S.ttConnected = true; sb.S.ttSessionId = 'sess';
    ok(sb._backendCandleAuthReady() === true, '5b: ready before any auth failure (conservative first call)');
    // Simulate /quote-token returning 401 (an authenticated, non-candle endpoint).
    sb._recordBackendApiAuthResult('/quote-token', 401);
    ok(sb._backendApiAuthState.invalidApiKey === true, '5b: 401 from /quote-token latches invalidApiKey');
    ok(sb._backendCandleAuthReady() === false, '5b: gate not ready once key is known-invalid');
    ok(sb._backendCandleGateReason() === 'backend_api_key_invalid', '5b: gate reason is backend_api_key_invalid');
    // A candle GET must now be skipped without firing the network.
    const r = await sb._loadBackendChartCandles('NVDA');
    ok(r.ok === false && r.fallbackReason === 'backend_api_key_invalid', '5b: candle GET skipped with backend_api_key_invalid');
    ok(sb.__fetchCount === 0, '5b: NO candle fetch after known-invalid key');
    ok(sb._isBackendGateClosedReason('backend_api_key_invalid') === true, '5b: invalid-key is a gate-closed reason (no browser sub)');
    // One successful authenticated call clears the invalid latch.
    sb._recordBackendApiAuthResult('/scanner', 200);
    ok(sb._backendApiAuthState.invalidApiKey === false, '5b: a later 2xx clears invalidApiKey');
    ok(sb._backendApiAuthState.lastOkAt != null, '5b: lastOkAt recorded on success');
    ok(sb._backendCandleAuthReady() === true, '5b: gate ready again after key restored');
  }

  // ── 5c. a candle 401 also proves the key invalid (shared state) ─────────────
  section('5c. a candle/context 401 feeds the shared API-auth validity state');
  {
    const sb = buildSandbox(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }));
    sb.S.backendKey = 'KEY'; sb.S.ttConnected = true; sb.S.ttSessionId = 'sess';
    await sb._loadBackendChartCandles('NVDA');
    ok(sb._backendApiAuthState.invalidApiKey === true, '5c: candle 401 latched invalidApiKey via shared recorder');
    ok(sb._backendCandleGateReason() === 'backend_api_key_invalid', '5c: gate reason reflects invalid key');
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
    ['backendCandleAuthReady', 'backendCandleBackoffActive', 'backendCandleGateReason',
     'lastBackendCandleStatus', 'lastBackendCandleError', 'recentBackendCandleFailures',
     'backendApiAuthKnownInvalid', 'backendApiAuthLastStatus', 'backendApiAuthLastEndpoint',
     'backendApiAuthLast401At', 'backendApiAuthLastOkAt']
      .forEach((k) => ok(new RegExp(k).test(src), '8: exposes ' + k));
  }

  // ── 9. central authenticated endpoints feed the API-auth validity state ──────
  section('9. ttCall / dxlink-status feed _recordBackendApiAuthResult (not only candles)');
  {
    const ttCallSrc = stripComments(extractFn(HTML, 'ttCall'));
    ok(/_recordBackendApiAuthResult\(/.test(ttCallSrc), '9: ttCall records API-auth result for every authenticated call');
    const pollSrc = stripComments(extractFn(HTML, 'pollDxlinkStatus'));
    ok(/_recordBackendApiAuthResult\(/.test(pollSrc), '9: pollDxlinkStatus records API-auth result for /dxlink/status');
    const flushSrc = stripComments(extractFn(HTML, '_candleCtxFlush'));
    ok(/_backendCandleGateOpen\(\)/.test(flushSrc), '9: /context flush consults the gate (skips after known 401)');
  }

  // ── 10. backendApiAuthKnownInvalid predicate + reset behavior ───────────────
  section('10. backendApiAuthKnownInvalid() predicate + _resetBackendApiAuthState()');
  {
    const sb = buildSandbox(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    ok(sb.backendApiAuthKnownInvalid() === false, '10: false before any failure');
    sb._recordBackendApiAuthResult('/quote-token', 401);
    ok(sb.backendApiAuthKnownInvalid() === true, '10: true after a 401');
    sb._resetBackendApiAuthState();
    ok(sb.backendApiAuthKnownInvalid() === false, '10: reset clears it (reconnect / key update)');
  }

  // ── 11. noisy authenticated auto-refresh callers are guarded ────────────────
  section('11. noisy authenticated callers skip when the key is known invalid');
  {
    const checks = [
      ['pollDxlinkStatus', '/dxlink/status'],
      ['fetchMarketContextSnapshotFromBackend', '/market-context/snapshot'],
      ['fetchVixFamily', '/quote-token'],
      ['_initCandleStream', '/quote-token'],
    ];
    checks.forEach(([fn, ep]) => {
      const src = stripComments(extractFn(HTML, fn));
      ok(/backendApiAuthKnownInvalid\(\)/.test(src), '11: ' + fn + ' guards on backendApiAuthKnownInvalid()');
      // the guard must precede the authenticated network call
      const guardIdx = src.indexOf('backendApiAuthKnownInvalid()');
      const callIdx = Math.min(...['ttCall(', 'fetch('].map((s) => { const k = src.indexOf(s); return k < 0 ? Infinity : k; }));
      ok(guardIdx >= 0 && guardIdx < callIdx, '11: ' + fn + ' guard precedes the ' + ep + ' call');
    });
  }

  // ── 12. login / reconnect is NOT blocked and CLEARS the invalid latch ───────
  section('12. /auth/login is not gated; (re)login resets the invalid latch');
  {
    // The launch handler performs /auth/login via a raw fetch (not ttCall) and must
    // not be guarded by backendApiAuthKnownInvalid; it also resets the auth latch.
    const launch = HTML.slice(HTML.indexOf("S.apiKey=k;S.backendKey=bk"), HTML.indexOf("S.apiKey=k;S.backendKey=bk") + 4000);
    ok(/_resetBackendApiAuthState\(\)/.test(launch), '12: launch resets backend API auth latch on (re)login / key update');
    const loginCall = HTML.slice(HTML.indexOf("/auth/login") - 200, HTML.indexOf("/auth/login") + 200);
    ok(!/backendApiAuthKnownInvalid\(\)/.test(loginCall), '12: /auth/login is not gated by the invalid-key check');
  }

  console.log('\n' + (fail === 0 ? 'All ' + pass + ' tests passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
  process.exit(fail ? 1 : 0);
})();
