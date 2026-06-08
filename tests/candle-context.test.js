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
    // Backend auth gate stubs — open by default so the existing flush/POST tests run.
    _backendCandleGateOpen: () => true,
    _backendCandleGateReason: () => 'open',
    _noteBackendCandleFailure: () => {},
    _noteBackendCandleSuccess: () => {},
    _recordCandleProvenance: () => {},
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

section('6. merge pending payloads — a later low-priority call must not drop a pending active symbol');
{
  const sb = makeSandbox();
  // 1. high-priority chart open for SNOW (no flush yet)
  sb.postCandleContext({ reason: 'chart_open', activeSymbol: 'SNOW', timeframes: ['1D', '30M', '4H'] });
  // 2. before flushing, a low-priority portfolio call with NO active symbol
  sb.postCandleContext({ reason: 'portfolio_symbols', portfolioSymbols: ['AAPL'], timeframes: ['1D', '30M', '4H'] });
  // 3. flush → exactly one coalesced POST
  sb.__flush();
  ok(sb.__fetches.length === 1, '6: merged pending → still exactly one POST (no extra frequency)');
  const p = sb.__fetches[0].body;
  // 4. assertions: SNOW preserved, AAPL present, SPY first
  ok(p.symbols[0] === 'SPY', '6: SPY remains first after merge');
  ok(p.symbols.indexOf('SNOW') !== -1, '6: pending active symbol SNOW NOT lost');
  ok(p.activeSymbol === 'SNOW', '6: pending activeSymbol preserved when new call has none');
  ok(p.portfolioSymbols.indexOf('AAPL') !== -1, '6: new portfolioSymbols (AAPL) merged in');
  ok(p.timeframes.indexOf('4H') !== -1 && p.timeframes.indexOf('30M') !== -1, '6: merged timeframes keep 4H+30M');
}

section('7. merge with two differing active symbols — both kept, newest promoted after SPY');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'chart_open', activeSymbol: 'SNOW', visibleSymbols: ['SNOW'], timeframes: ['1D', '4H'] });
  sb.postCandleContext({ reason: 'symbol_change', activeSymbol: 'TSLA', visibleSymbols: ['TSLA'], timeframes: ['1D', '4H'] });
  sb.__flush();
  ok(sb.__fetches.length === 1, '7: two pre-flush calls → one POST');
  const p = sb.__fetches[0].body;
  ok(p.symbols[0] === 'SPY', '7: SPY first');
  ok(p.symbols[1] === 'TSLA', '7: newest active (TSLA) promoted right after SPY');
  ok(p.symbols.indexOf('SNOW') !== -1, '7: prior active (SNOW) still included');
  ok(p.activeSymbol === 'TSLA', '7: activeSymbol is the newest');
}

section('8. debug helper surface');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'chart_open', activeSymbol: 'SNOW', visibleSymbols: ['SNOW'], timeframes: ['4H'] });
  sb.__flush();
  const d = sb.apexDebugCandleContext();
  ok(d.lastReason === 'chart_open', '8: lastReason');
  ok(d.lastTimestamp === '2026-06-07T00:00:00.000Z', '8: lastTimestamp');
  ok(Array.isArray(d.lastSymbols) && d.lastSymbols[0] === 'SPY', '8: lastSymbols');
  ok(Array.isArray(d.lastTimeframes) && d.lastTimeframes.indexOf('30M') !== -1, '8: lastTimeframes (30M present for 4H)');
  ok(Array.isArray(d.recent) && d.recent.length === 1, '8: recent history captured');
  ok(d.endpoint === 'https://backend.test/dev/market/candles-dxlink/context', '8: endpoint reported');
}

section('9. cooldown — repeated visible_rows_change within window sends only one POST');
{
  const sb = makeSandbox();
  // 3 re-renders of the same scanner with order-only-different symbol sets.
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['AAPL', 'MSFT', 'NVDA'], timeframes: ['1D'] });
  sb.__flush();
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['NVDA', 'AAPL', 'MSFT'], timeframes: ['1D'] });
  sb.__flush();
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['MSFT', 'NVDA', 'AAPL'], timeframes: ['1D'] });
  sb.__flush();
  ok(sb.__fetches.length === 1, '9: repeated visible_rows_change within cooldown → only one POST');
  ok(sb.apexDebugCandleContext().counts.cooldownSkipped >= 2, '9: cooldown skips counted (>=2)');
}

section('10. cooldown — chart_open is NOT suppressed by a visible_rows_change cooldown');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['AAPL'], timeframes: ['1D'] });
  sb.__flush();                          // POST #1 — arms the visible cooldown
  sb.postCandleContext({ reason: 'chart_open', activeSymbol: 'SNOW', timeframes: ['1D', '30M', '4H'] });
  sb.__flush();                          // high-priority → must flush despite cooldown
  ok(sb.__fetches.length === 2, '10: chart_open flushes through the cooldown');
  ok(sb.__fetches[1].body.symbols.indexOf('SNOW') !== -1, '10: chart_open POST carries SNOW');
}

section('11. cooldown — materially different visible symbols still send within the window');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['AAPL', 'MSFT'], timeframes: ['1D'] });
  sb.__flush();                          // POST #1
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA'], timeframes: ['1D'] });
  sb.__flush();                          // material change → bypasses cooldown
  ok(sb.__fetches.length === 2, '11: materially different symbol set sends a second POST');
  ok(sb.__fetches[1].body.symbols.indexOf('TSLA') !== -1, '11: new material symbol present');
}

section('12. cooldown — order-only symbol changes do NOT bypass the cooldown');
{
  const sb = makeSandbox();
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['AAPL', 'MSFT'], timeframes: ['1D'] });
  sb.__flush();                          // POST #1
  sb.postCandleContext({ reason: 'visible_rows_change', scanner: 'live', visibleSymbols: ['MSFT', 'AAPL'], timeframes: ['1D'] });
  sb.__flush();                          // same set, different order → skipped
  ok(sb.__fetches.length === 1, '12: order-only change does not produce a second POST');
  const skipped = sb.apexDebugCandleContext().recentSkipped;
  ok(skipped.length >= 1 && skipped[skipped.length - 1].reason === 'visible_rows_change', '12: cooldown skip recorded for order-only change');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
