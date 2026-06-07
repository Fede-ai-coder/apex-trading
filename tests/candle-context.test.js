'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Candle context priority — POST /dev/market/candles-dxlink/context
// Verifies the fire-and-forget, deduped, debounced prewarm helper:
//   • SPY benchmark is always prioritised; active symbol promoted near the top
//   • visible scanner symbols are included; full universe is never sent
//   • 4H implies 30M (backend derives 4H from 30M)
//   • identical payloads are deduped; rapid bursts are debounced into one POST
//   • debug helper exposes last payload/reason/timestamp/symbols/timeframes/history
// Run: node tests/candle-context.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── 1. static wiring ─────────────────────────────────────────────────────────
section('1. helper, debug API and trigger points are wired');
{
  ok(/function postCandleContext\(/.test(HTML), '1: postCandleContext helper exists');
  ok(/window\.apexDebugCandleContext\s*=\s*apexDebugCandleContext/.test(HTML), '1: window.apexDebugCandleContext exposed');
  ok(/\/dev\/market\/candles-dxlink\/context/.test(HTML), '1: POSTs to /dev/market/candles-dxlink/context');
  ok(/_backendAuthHeaders\(\{\s*'Content-Type': 'application\/json'\s*\}\)/.test(HTML), '1: preserves auth headers on context POST');
  ['chart_open', 'symbol_change', 'scanner_change', 'visible_rows_change', 'portfolio_symbols', 'dashboard_init'].forEach(function(r) {
    ok(new RegExp("reason:'" + r + "'").test(HTML), '1: trigger reason wired: ' + r);
  });
}

// ── 2. behavioural: build the module slice and run it in a sandbox ───────────
const moduleSrc = HTML.slice(
  HTML.indexOf('var _candleCtxLog = [];'),
  HTML.indexOf('window.apexDebugCandleContext = apexDebugCandleContext;') + 'window.apexDebugCandleContext = apexDebugCandleContext;'.length
);

function makeSandbox() {
  const timers = [];                       // captured debounce callbacks
  const fetches = [];                      // captured fetch payloads
  const sb = {
    JSON, Date, Object, Math, Array, String,
    BACKEND: 'https://backend.test',
    AbortSignal: { timeout: () => undefined },
    _backendAuthHeaders: (h) => Object.assign({ 'x-api-key': 'KEY' }, h || {}),
    _candleDiagNowIso: () => '2026-06-07T00:00:00.000Z',
    S: { selectedTicker: null, portfolioData: { positions: [] } },
    console: { log() {}, warn() {} },
    document: { querySelectorAll: () => [] },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    fetch: (url, opts) => { fetches.push({ url, body: JSON.parse(opts.body), headers: opts.headers }); return Promise.resolve({ ok: true, status: 200 }); },
    window: {},
    __timers: timers, __fetches: fetches,
  };
  vm.createContext(sb);
  vm.runInContext(moduleSrc, sb);
  // flush: drain every captured debounce callback (debounce coalesces to one)
  sb.__flush = () => { while (sb.__timers.length) { const fn = sb.__timers.shift(); fn(); } };
  return sb;
}

section('2. SPY benchmark + active symbol priority, visible symbols, 4H→30M');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'symbol_change', activeSymbol: 'snow', visibleSymbols: ['AAPL', 'snow', 'MSFT'], timeframes: ['1D', '4H'] });
  sb.__flush();
  ok(sb.__fetches.length === 1, '2: exactly one POST after debounce flush');
  const p = sb.__fetches[0].body;
  ok(sb.__fetches[0].url === 'https://backend.test/dev/market/candles-dxlink/context', '2: correct endpoint URL');
  ok(p.symbols[0] === 'SPY', '2: SPY prioritised first');
  ok(p.symbols[1] === 'SNOW', '2: active symbol promoted near top + normalised uppercase');
  ok(p.needsBenchmark === true, '2: needsBenchmark flag set');
  ok(p.activeSymbol === 'SNOW', '2: activeSymbol normalised');
  ok(p.timeframes.indexOf('4H') !== -1 && p.timeframes.indexOf('30M') !== -1, '2: 4H request also carries 30M');
  ok(p.symbols.filter((s) => s === 'SNOW').length === 1, '2: symbols deduped');
  ok(sb.__fetches[0].headers['x-api-key'] === 'KEY', '2: auth header preserved on POST');
}

section('3. dedupe identical payloads');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'symbol_change', activeSymbol: 'AAPL', visibleSymbols: ['AAPL'], timeframes: ['1D'] });
  sb.__flush();
  sb.postCandleContext({ reason: 'symbol_change', activeSymbol: 'AAPL', visibleSymbols: ['AAPL'], timeframes: ['1D'] });
  sb.__flush();
  ok(sb.__fetches.length === 1, '3: identical payload not re-POSTed');
  ok(sb.apexDebugCandleContext().lastDeduped === true, '3: debug reports last call deduped');
  // a changed payload is sent again
  sb.postCandleContext({ reason: 'symbol_change', activeSymbol: 'TSLA', visibleSymbols: ['TSLA'], timeframes: ['1D'] });
  sb.__flush();
  ok(sb.__fetches.length === 2, '3: changed payload IS re-POSTed');
}

section('4. debounce coalesces a rapid burst into a single POST');
{
  const sb = makeSandbox();
  for (let i = 0; i < 5; i++) sb.postCandleContext({ reason: 'visible_rows_change', visibleSymbols: ['AAPL', 'MSFT'], timeframes: ['1D'] });
  // many calls scheduled, only the latest pending payload should flush
  sb.__flush();
  ok(sb.__fetches.length === 1, '4: 5 rapid calls → 1 POST');
}

section('5. never sends the full universe (symbol cap)');
{
  const sb = makeSandbox();
  const big = [];
  for (let i = 0; i < 200; i++) big.push('SYM' + i);
  sb.postCandleContext({ reason: 'visible_rows_change', visibleSymbols: big, timeframes: ['1D'] });
  sb.__flush();
  ok(sb.__fetches[0].body.symbols.length <= 40, '5: symbol list capped (<=40), not the full universe');
  ok(sb.__fetches[0].body.symbols[0] === 'SPY', '5: SPY still first after capping');
}

section('6. debug helper surface');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'chart_open', activeSymbol: 'SNOW', visibleSymbols: ['SNOW'], timeframes: ['4H'] });
  sb.__flush();
  const d = sb.apexDebugCandleContext();
  ok(d.lastReason === 'chart_open', '6: lastReason');
  ok(d.lastTimestamp === '2026-06-07T00:00:00.000Z', '6: lastTimestamp');
  ok(Array.isArray(d.lastSymbols) && d.lastSymbols[0] === 'SPY', '6: lastSymbols');
  ok(Array.isArray(d.lastTimeframes) && d.lastTimeframes.indexOf('30M') !== -1, '6: lastTimeframes (30M present for 4H)');
  ok(Array.isArray(d.recent) && d.recent.length === 1, '6: recent history captured');
  ok(d.endpoint === 'https://backend.test/dev/market/candles-dxlink/context', '6: endpoint reported');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
