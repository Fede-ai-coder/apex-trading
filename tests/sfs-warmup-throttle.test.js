'use strict';
// Squeeze Fire warmup throttling/capping tests.
// Run: node tests/sfs-warmup-throttle.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const sig of sigs) { const k = src.indexOf(sig); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
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
function section(t) { console.log('\n' + t); }
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }

const warmupBlock = HTML.slice(HTML.indexOf('var SFS_WARMUP_BATCH_CAP'), HTML.indexOf('function _sfsAnalyzeSymbolTimeframe'));
const fetchBodies = [];
const diag = [];
const sandbox = {
  JSON, Date, Object, Math,
  BACKEND: 'https://backend.test',
  AbortSignal: { timeout: () => undefined },
  _backendAuthHeaders: (h) => h || {},
  _recordCandleSubscriptionRequest: (m) => diag.push(m),
  setTimeout: () => 1,
  fetch: (url, opts) => { fetchBodies.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true, status: 200 }); },
};
vm.createContext(sandbox);
vm.runInContext(warmupBlock, sandbox);

async function main() {
  section('1. _sfsWarmupBatch caps large SFS warmups to 3 symbols');
  {
    const syms = Array.from({ length: 20 }, (_, i) => 'SYM' + i);
    const r = await sandbox._sfsWarmupBatch(syms, ['1D', '30M']);
    ok(r.ok === true, '1: capped warmup still sends a request');
    ok(fetchBodies.length === 1, '1: exactly one backend POST is sent immediately');
    ok(fetchBodies[0].symbols.length === 3, '1: backend POST has only 3 symbols');
    ok(fetchBodies[0].timeframes.join(',') === '1D,30M', '1: requested timeframes are preserved');
    const sent = diag.find((d) => d.action === 'sent');
    ok(sent && sent.requestedSymbolsCount === 3 && sent.context.originalRequestedSymbolsCount === 20 && sent.context.deferredSymbolCount === 17,
       '1: diagnostics show sent count=3, original=20, deferred=17');
  }

  section('2. repeated large warmup inside cooldown does not POST again');
  {
    const before = fetchBodies.length;
    await sandbox._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D', '30M']);
    ok(fetchBodies.length === before, '2: cooldown-blocked large follow-up sends no backend POST');
    ok(diag.some((d) => d.action === 'cooldown_blocked'), '2: diagnostics record cooldown_blocked');
  }

  section('3. SFS scan no longer bulk-warms scanner batches');
  {
    const scan = stripComments(extractFn(HTML, '_sfsRunScan'));
    ok(!/_sfsWarmupBatch\(\s*batch\s*,/.test(scan), '3: _sfsRunScan does not warm whole scan batches');
    ok(/bulk_scan_warmup_disabled_cache_reads_only/.test(scan), '3: _sfsRunScan records that scan uses cache reads only');
  }

  section('4. SFS chart hydration targets only the selected/open symbol');
  {
    const ensure = stripComments(extractFn(HTML, '_sfsEnsureChartData'));
    ok(/_sfsEnsureTfCandles\(\s*symbol\s*,\s*tf\s*\)/.test(ensure), '4: chart hydration ensures only the selected symbol parameter');
    ok(!/sfs\.results|S\.squeezeFireScanner\.results|WL\.map/.test(ensure), '4: chart hydration does not iterate SFS results or watchlist');
  }

  section('5. scanner rule/ranking/filter functions remain untouched');
  {
    ['_sfsAnalyzeSymbolTimeframe', '_sfsGetFilteredResults', '_sfsSortResults'].forEach((name) => {
      const src = stripComments(extractFn(HTML, name));
      ok(!/SFS_WARMUP_BATCH_CAP|_sfsWarmupBatch|_recordCandleSubscriptionRequest/.test(src), '5: ' + name + ' has no warmup instrumentation');
    });
  }


  section('6. SFS backend fetch can read backend-derived nested 4H candle fields');
  {
    const rawCandles = Array.from({ length: 25 }, (_, i) => ({ time: 1700000000000 + i * 1000, open: i + 1, high: i + 2, low: i, close: i + 1.5, volume: 10 }));
    const fetchSandbox = {
      Date, JSON, Number, isFinite, parseFloat, Math,
      BACKEND: 'https://backend.test',
      AbortSignal: { timeout: () => undefined },
      _backendAuthHeaders: () => ({}),
      // Backend auth gate stubs — open so the fetch path is exercised.
      _backendCandleGateOpen: () => true,
      _backendCandleGateReason: () => 'open',
      _noteBackendCandleFailure: () => {},
      _noteBackendCandleSuccess: () => {},
      _recordCandleProvenance: () => {},
      fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ timeframes: { '4H': { candles: rawCandles } } }) })
    };
    vm.createContext(fetchSandbox);
    vm.runInContext(
      ['_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray', '_apexParityExtractBackendCandles', '_sfsExtractBackendCandles', '_sfsFetchBackendCandles']
        .map((n) => extractFn(HTML, n)).join('\n'),
      fetchSandbox
    );
    const fetched = await fetchSandbox._sfsFetchBackendCandles('SPY', '4H');
    ok(fetched.ok === true && fetched.count === 25, '6: reads nested timeframes[4H].candles from backend response');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
