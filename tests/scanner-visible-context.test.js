'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Visible-scanner context notification (backend PR #121 priority manager).
//
// Frontend PR #218 follow-up: in addition to the active-chart backend warmup/read,
// the frontend now tells the backend which scanner is visible, which symbols are on
// screen, and which symbol is actively opened — via a fire-and-forget POST to
// /dev/market/candles-dxlink/context — so the backend can prewarm SPY + the visible
// symbols BEFORE a chart is opened (fixes cold tab/scanner switches).
//
// This proves: the helper POSTs the right payload, uses auth headers, is fire-and-
// forget (never blocks/throws), throttles/dedupes, never sends the full universe;
// every scanner surface (open* + render) is wired; and NO old subscription/poll/
// scanner-run/Yahoo/REST/WebSocket behavior is reintroduced.
//
// Run: node tests/scanner-visible-context.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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
      if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
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
    if (inS) { out += c; if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── Sandbox running the real context helpers ─────────────────────────────────
function makeCtxSandbox() {
  const calls = [];   // { url, opts, body }
  const sb = {
    console, Date, Math, JSON, Object, Array, String, Boolean, Number, isFinite, parseInt,
    setTimeout: (fn) => { fn(); return 1; },   // trailing-edge fires instantly in tests
    clearTimeout: () => {},
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    _backendAuthHeaders: (extra) => Object.assign({ 'X-Auth': 'tok' }, extra || {}),
    debugLog: () => {},
    // Module-level constants + state the helpers read/write.
    BACKEND_VISIBLE_CONTEXT_NOTIFY_ENABLED: true,
    BACKEND_VISIBLE_CONTEXT_MAX_SYMBOLS: 10,
    BACKEND_VISIBLE_CONTEXT_THROTTLE_MS: 1500,
    BACKEND_VISIBLE_CONTEXT_TIMEOUT_MS: 6000,
    _visibleContextLastKey: null,
    _visibleContextLastSentAt: 0,
    _visibleContextPendingTimer: null,
    _backendChartDiag: {
      lastVisibleContextSentAt: null, lastVisibleContextScanner: null, lastVisibleContextSymbols: null,
      lastVisibleContextActiveSymbol: null, lastVisibleContextKey: null, lastVisibleContextStatus: null,
      lastVisibleContextError: null, visibleContextSkippedReason: null, visibleContextNotifyCount: 0,
    },
    fetch: function (url, opts) {
      const body = (opts && opts.body) ? JSON.parse(opts.body) : null;
      calls.push({ url: url, opts: opts, body: body });
      return Promise.resolve({ ok: true, status: 200 });
    },
  };
  vm.createContext(sb);
  vm.runInContext(
    [extractFn(HTML, '_visibleScannerSymbols'), extractFn(HTML, '_visibleContextSend'),
     extractFn(HTML, '_notifyBackendVisibleScannerContext')].join('\n'),
    sb
  );
  sb.__calls = calls;
  return sb;
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — context endpoint payload + behavior (runtime)
// ═════════════════════════════════════════════════════════════════════════════
section('1. POSTs the correct payload to /dev/market/candles-dxlink/context');
{
  const sb = makeCtxSandbox();
  sb._notifyBackendVisibleScannerContext({ scanner: 'directional', symbols: ['aapl', 'MSFT', 'nvda'], activeSymbol: 'aapl' });
  const c = sb.__calls[0];
  ok(sb.__calls.length === 1, '1: exactly one POST sent');
  ok(/\/dev\/market\/candles-dxlink\/context$/.test(c.url), '1: POSTs to /dev/market/candles-dxlink/context');
  ok(c.opts.method === 'POST', '1: method is POST');
  ok(c.opts.cache === 'no-store', '1: cache: no-store');
  ok(c.body.contextType === 'visible_scanner', '2: contextType "visible_scanner"');
  ok(c.body.scanner === 'directional', '3: scanner echoed');
  ok(Array.isArray(c.body.symbols) && c.body.symbols.indexOf('AAPL') >= 0 && c.body.symbols.indexOf('NVDA') >= 0, '4: symbols normalized uppercase');
  ok(c.body.activeSymbol === 'AAPL', '5: activeSymbol normalized uppercase');
  ok(c.body.needsBenchmark === true, '6: needsBenchmark true');
  ok(JSON.stringify(c.body.timeframes) === JSON.stringify(['30M']), '7: timeframes ["30M"]');
  ok(c.opts.headers && c.opts.headers['X-Auth'] === 'tok', '8: uses backend auth headers');
}

section('2. Caps symbols (never the full universe)');
{
  const sb = makeCtxSandbox();
  // A large set of VALID (letter-only) tickers to prove the cap (never the universe).
  const universe = Array.from({ length: 50 }, (_, i) => 'Q' + String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));
  sb._notifyBackendVisibleScannerContext({ scanner: 'market_scanner', symbols: universe, activeSymbol: null });
  ok(sb.__calls[0].body.symbols.length <= 10, '12: symbols capped to BACKEND_VISIBLE_CONTEXT_MAX_SYMBOLS (' + sb.__calls[0].body.symbols.length + ')');
}

section('3. Fire-and-forget: a fetch that throws does NOT throw out of the helper');
{
  const sb = makeCtxSandbox();
  sb.fetch = function () { throw new Error('network down'); };
  let threw = false;
  try { sb._notifyBackendVisibleScannerContext({ scanner: 'rs_vs_spy', symbols: ['AAPL'], activeSymbol: 'AAPL' }); }
  catch (e) { threw = true; }
  ok(!threw, '10: helper swallows the fetch error (never throws to the caller)');
  ok(sb._backendChartDiag.lastVisibleContextStatus === 'throw' || sb._backendChartDiag.lastVisibleContextError, '10: error recorded in diagnostics');
}

section('4. Throttle/dedupe: identical context within the window sends only once');
{
  const sb = makeCtxSandbox();
  sb._notifyBackendVisibleScannerContext({ scanner: 'squeeze_fire', symbols: ['AAPL', 'MSFT'], activeSymbol: 'AAPL' });
  sb._notifyBackendVisibleScannerContext({ scanner: 'squeeze_fire', symbols: ['AAPL', 'MSFT'], activeSymbol: 'AAPL' });
  sb._notifyBackendVisibleScannerContext({ scanner: 'squeeze_fire', symbols: ['AAPL', 'MSFT'], activeSymbol: 'AAPL' });
  ok(sb.__calls.length === 1, '11: 3 identical contexts → exactly ONE POST (deduped/throttled)');
  ok(sb._backendChartDiag.visibleContextSkippedReason === 'throttled_duplicate', '11: skip reason recorded');
}

section('5. Disabled flag → no POST');
{
  const sb = makeCtxSandbox();
  sb.BACKEND_VISIBLE_CONTEXT_NOTIFY_ENABLED = false;
  sb._notifyBackendVisibleScannerContext({ scanner: 'directional', symbols: ['AAPL'], activeSymbol: 'AAPL' });
  ok(sb.__calls.length === 0 && sb._backendChartDiag.visibleContextSkippedReason === 'disabled', '5: disabled → no POST');
}

section('6. _visibleScannerSymbols: caps, dedupes, uppercases, drops invalids; accepts rows or tickers');
{
  const sb = makeCtxSandbox();
  const out = sb._visibleScannerSymbols(['aapl', 'AAPL', '', null, { symbol: 'msft' }, { ticker: 'nvda' }, '123', 'TOOLONGSYMBOLXYZ', 'GE'], 10);
  ok(out.indexOf('AAPL') >= 0 && out.filter((s) => s === 'AAPL').length === 1, '6: dedupes + uppercases AAPL');
  ok(out.indexOf('MSFT') >= 0 && out.indexOf('NVDA') >= 0, '6: extracts .symbol / .ticker from row objects');
  ok(out.indexOf('') < 0 && out.indexOf('123') < 0, '6: drops empties / non-equity labels');
  ok(out.indexOf('GE') >= 0, '6: keeps short valid tickers');
}

section('7. Diagnostics updated on a real send');
{
  const sb = makeCtxSandbox();
  sb._notifyBackendVisibleScannerContext({ scanner: 'directional', symbols: ['AAPL', 'MSFT'], activeSymbol: 'AAPL' });
  const d = sb._backendChartDiag;
  ok(d.visibleContextNotifyCount === 1, '7: visibleContextNotifyCount incremented');
  ok(d.lastVisibleContextScanner === 'directional', '7: lastVisibleContextScanner recorded');
  ok(d.lastVisibleContextActiveSymbol === 'AAPL', '7: lastVisibleContextActiveSymbol recorded');
  ok(Array.isArray(d.lastVisibleContextSymbols) && d.lastVisibleContextSymbols.indexOf('AAPL') >= 0, '7: lastVisibleContextSymbols recorded');
  ok(d.lastVisibleContextKey && /directional\|AAPL/.test(d.lastVisibleContextKey), '7: lastVisibleContextKey recorded');
}

section('8. context helper opens NO subscription / poll / scanner-run / Yahoo / REST / WebSocket');
{
  const notify = stripComments(extractFn(HTML, '_notifyBackendVisibleScannerContext'));
  const send   = stripComments(extractFn(HTML, '_visibleContextSend'));
  const both = notify + '\n' + send;
  ok(!/_ensureCandleSubscription|_ensure30MSubscription|subscribeCandles/.test(both), '8: no frontend Candle subscription openers');
  ok(!/_schart4hStartPoll|_rs4hStartPoll|_dss4hStartPoll/.test(both), '8: no frontend 4H pollers');
  ok(!/\/scanner\/run/i.test(both), '8: no /scanner/run');
  ok(!/\/warmup/.test(both), '8: context helper never calls /warmup directly');
  ok(!/yahoo/i.test(both), '8: no Yahoo');
  ok(!/\/market\/candles(?!-dxlink)/.test(both), '8: no REST /market/candles');
  ok(!/new\s+WebSocket/.test(both), '8: no new WebSocket');
  ok(/\/dev\/market\/candles-dxlink\/context/.test(send), '8: only the /context endpoint');
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — wiring into every scanner surface (source, drift-proof)
// ═════════════════════════════════════════════════════════════════════════════
section('9. open* chart paths notify visible context with activeSymbol = symbol');
{
  const cases = [
    ['openDirectionalSetupDetail', 'directional'],
    ['openScannerChart', 'market_scanner'],
    ['openRsChart', 'rs_vs_spy'],
    ['_sfsOpenChart', 'squeeze_fire'],
  ];
  cases.forEach(function (cc) {
    const src = stripComments(extractFn(HTML, cc[0]));
    ok(/_notifyBackendVisibleScannerContext\(/.test(src), '9: ' + cc[0] + ' notifies visible context');
    ok(new RegExp("scanner: ?'" + cc[1] + "'").test(src), '9: ' + cc[0] + " uses scanner '" + cc[1] + "'");
    ok(/activeSymbol: ?symbol/.test(src), '9: ' + cc[0] + ' passes activeSymbol: symbol');
  });
}

section('10. scanner render/refresh paths notify visible context with visible symbols');
{
  const cases = [
    ['renderDirectionalSetupScanner', 'directional', '_dssCandidateList'],
    ['renderRsScanner', 'rs_vs_spy', '_rsCandidateList'],
    ['_sfsRender', 'squeeze_fire', '_sfsCandidateList'],
  ];
  cases.forEach(function (cc) {
    const src = stripComments(extractFn(HTML, cc[0]));
    ok(/_notifyBackendVisibleScannerContext\(/.test(src), '10: ' + cc[0] + ' notifies visible context on render');
    ok(new RegExp("scanner: ?'" + cc[1] + "'").test(src), '10: ' + cc[0] + " uses scanner '" + cc[1] + "'");
    ok(src.indexOf(cc[2]) >= 0, '10: ' + cc[0] + ' sends its visible symbol list (' + cc[2] + ')');
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 3 — constraints unchanged + diagnostics exposed
// ═════════════════════════════════════════════════════════════════════════════
section('11. No old subscription/poll storm reintroduced by the context wiring');
{
  // The whole file still has zero scanner_chart/rs_chart subscription calls.
  const lines = stripComments(HTML).split('\n');
  ok(lines.filter((l) => /_ensure(?:Candle|30M)Subscription\s*\(/.test(l) && /(scanner_chart|rs_chart)/.test(l)).length === 0,
    '11: no _ensure*Subscription(..., scanner_chart/rs_chart) anywhere');
  // The render/open paths still do not START the frontend 4H pollers.
  ['openScannerChart', 'openRsChart', 'openDirectionalSetupDetail', '_sfsOpenChart',
   'renderDirectionalSetupScanner', 'renderRsScanner', '_sfsRender'].forEach(function (fn) {
    const src = stripComments(extractFn(HTML, fn));
    ok(!/_schart4hStartPoll\(|_rs4hStartPoll\(|_dss4hStartPoll\(|_dss4hStartSpyPoll\(/.test(src), '11: ' + fn + ' starts no frontend 4H poll');
    ok(!/\/scanner\/run/i.test(src), '11: ' + fn + ' triggers no /scanner/run');
  });
}

section('12. Active-chart warmup path preserved (complementary, not replaced)');
{
  // The dedicated active loader + read/warmup helpers still exist.
  ['_ensureActiveChart4hCandles', '_ensureBackendChartCandles', '_backendChartActiveMsg'].forEach(function (fn) {
    let found = true; try { extractFn(HTML, fn); } catch (e) { found = false; }
    ok(found, '12: ' + fn + ' still present');
  });
  // The open paths still drive the render orchestrators (active warmup).
  ok(/renderScannerInlineChart\(symbol\)/.test(stripComments(extractFn(HTML, 'openScannerChart'))), '12: openScannerChart still renders the inline chart');
  ok(/_dssRenderLargeCharts\(symbol\)/.test(stripComments(extractFn(HTML, 'openDirectionalSetupDetail'))), '12: openDirectionalSetupDetail still renders DSS large charts');
}

section('13. apexDebugScannerChartBackendCandles exposes visible-context fields (preserves prior fields)');
{
  const i = HTML.indexOf('window.apexDebugScannerChartBackendCandles');
  const body = HTML.slice(i, HTML.indexOf('return out;', i));
  ['visibleContextNotifyEnabled', 'lastVisibleContextSentAt', 'lastVisibleContextScanner', 'lastVisibleContextSymbols',
   'lastVisibleContextActiveSymbol', 'lastVisibleContextKey', 'lastVisibleContextStatus', 'lastVisibleContextError',
   'visibleContextSkippedReason', 'visibleContextNotifyCount'].forEach(function (k) {
    ok(new RegExp(k).test(body), '13: diagnostic exposes ' + k);
  });
  // Prior fields preserved.
  ['selectedSymbol', 'activeSymbol', 'spy4hRequested', 'spy4hCount', 'active4hWarmupAttempted',
   'active4hFinalCount', 'frontendStreamFallbackCount', 'cacheKeys'].forEach(function (k) {
    ok(new RegExp(k).test(body), '13: prior diagnostic field preserved: ' + k);
  });
  // backend PR #120 read detail surfaced.
  ok(/active4hBackendDetail/.test(body), '13: diagnostic exposes active4hBackendDetail (PR #120 fields)');
}

console.log('\n' + (fail === 0 ? 'All ' + pass + ' tests passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
process.exit(fail ? 1 : 0);
