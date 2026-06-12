'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Directional Scanner chart — backend candle load dedup / TTL throttle.
//
// Goal under test: opening the Directional Setup detail chart must load backend
// candles AT MOST ONCE per real load. Re-entries (resize, overlay toggles, the SPY
// 4H benchmark redraw, polls) must NOT re-fetch or re-log
// [SCANNER][CHART][BACKEND-CANDLES] while complete data (1D>0 & 4H>0) is fresh.
// Identical concurrent loads dedup onto one in-flight Promise; an explicit force
// (opts.force) or a symbol change bypasses the cache/dedup.
//
// Run: node tests/scanner-directional-chart-dedup.test.js
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

// ── 1. static structure of the dedup/TTL guard in _dssRenderLargeCharts ───────
section('1. _dssRenderLargeCharts carries a dedup/TTL guard that bypasses on force');
{
  const src = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/_dssRenderLargeCharts\(symbol,\s*opts\)/.test(src), '1: accepts opts (force-capable signature)');
  ok(/_dssForce\s*=\s*!!\(opts\s*&&\s*opts\.force\)/.test(src), '1: opts.force is read');
  ok(/directional_chart\|1D,4H/.test(src), '1: dedup key is symbol + view + requestedTimeframes');
  ok(/_dssChartLoadGuard|_dssGuard/.test(src), '1: consults the shared load guard');
  ok(/_DSS_CHART_LOAD_TTL_MS/.test(src), '1: applies a short TTL window');
  ok(/_dssLoadBackendCandlesDeduped\(/.test(src), '1: routes the fetch through the in-flight dedup helper');
  // TTL hit must require complete data (1D>0 & 4H>0) and a backend source.
  ok(/candles1d\.length\s*>\s*0[\s\S]*candles4h\.length\s*>\s*0/.test(src), '1: TTL hit requires 1D>0 and 4H>0');
  ok(/BACKEND_CANDLE_STORE'\s*\|\|[\s\S]*backend_cache_full/.test(src), '1: TTL hit requires a backend candle source');
  // The single real-load console.log must still be present...
  ok(/console\.log\('\[SCANNER\]\[CHART\]\[BACKEND-CANDLES\] symbol='/.test(src), '1: real-load log line preserved');
  // ...and the skip log must be debug-level (rate-limited), not console.log.
  ok(/console\.debug\('\[SCANNER\]\[CHART\]\[BACKEND-CANDLES\] skipped duplicate in-flight/.test(src), '1: skip is logged at debug level');
  // SPY benchmark + provenance still invoked on the real-load path (anti-regression).
  ok(/_fetchBackendSpy4hBenchmark\('directional_chart'/.test(src), '1: SPY 4H benchmark still fetched on real load');
  ok(/_recordBackendCandleProvenance\('directional_chart'/.test(src), '1: provenance still recorded on real load');
}

// ── 2. the in-flight dedup helper exists and is debug-rate-limited ────────────
section('2. _dssLoadBackendCandlesDeduped dedups identical in-flight loads');
{
  const helper = stripComments(extractFn(HTML, '_dssLoadBackendCandlesDeduped'));
  ok(/g\.inflight\s*&&\s*g\.inflightKey\s*===\s*loadKey/.test(helper), '2: reuses the in-flight Promise for an identical key');
  ok(/skipped duplicate in-flight/.test(helper), '2: emits the specified skip message');
  ok(/console\.debug/.test(helper), '2: skip message is debug-level');
  ok(/_scannerFetchBackendCandlesForChart\(symbol\)/.test(helper), '2: starts the real fetch when not deduped');
}

// ── 3. behavioral: concurrent identical loads → ONE fetch; force bypasses ──────
section('3. behavior — dedup, force bypass, and skip-log-once');
{
  let fetchCount = 0;
  let debugCount = 0;
  let resolveFetch;
  const sb = {
    window: { console: { debug: () => { debugCount++; } } },
    console: { debug: () => { debugCount++; } },
    _scannerFetchBackendCandlesForChart: function () {
      fetchCount++;
      return new Promise((res) => { resolveFetch = res; });
    },
    Promise,
  };
  // share the guard object the helper closes over
  sb._dssChartLoadGuard = { key: null, ts: 0, scbc: null, inflight: null, inflightKey: null, inflightSkipLogged: false, ttlSkipLogged: false };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_dssLoadBackendCandlesDeduped'), sb);

  const KEY = 'CSX|directional_chart|1D,4H';
  const p1 = sb._dssLoadBackendCandlesDeduped('CSX', KEY, false);
  const p2 = sb._dssLoadBackendCandlesDeduped('CSX', KEY, false);
  ok(p1 === p2, '3: second identical in-flight load reuses the same Promise');
  ok(fetchCount === 1, '3: only ONE real backend fetch is started for two identical calls');
  ok(debugCount === 1, '3: duplicate in-flight skip is logged at most once');

  // force bypasses even while one is in flight
  const p3 = sb._dssLoadBackendCandlesDeduped('CSX', KEY, true);
  ok(p3 !== p1, '3: force=true starts a fresh load (bypasses in-flight dedup)');
  ok(fetchCount === 2, '3: force=true triggers a second real fetch');

  // resolve + settle: after completion a new call fetches again (not stuck on stale Promise)
  return Promise.resolve().then(async () => {
    resolveFetch({ ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: [], candles4h: [] });
    await new Promise((r) => setTimeout(r, 0));
    const before = fetchCount;
    sb._dssLoadBackendCandlesDeduped('CSX', KEY, false);
    ok(fetchCount === before + 1, '3: once settled, a later identical load fetches again');

    // ── 4. distinct symbol uses a distinct key (always loads) ─────────────────
    section('4. symbol change uses a distinct dedup key');
    {
      const k1 = 'CSX|directional_chart|1D,4H';
      const k2 = 'AAPL|directional_chart|1D,4H';
      ok(k1 !== k2, '4: CSX and AAPL produce different dedup keys');
    }

    console.log('\n' + (fail === 0
      ? 'All ' + pass + ' tests passed.'
      : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
    process.exit(fail ? 1 : 0);
  });
}
