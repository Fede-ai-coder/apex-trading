'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING chart — on-demand candle load for ANY selectable candidate (Current window
// OR All snapshot). Regression: selecting an "All snapshot" symbol that is NOT in the
// current rotating DXLink window (e.g. V) showed a false "no backend candles available"
// even though the persisted store (coverage) held it. Root cause: the chart did a single
// candles-dxlink READ (cold live buffer → empty) and treated that empty read as absent
// backend data, never doing the bounded on-demand warmup+re-read the SFS/DSS charts use.
//
// This proves the REAL _swingGetChartCandles out of index.html: a cache/window miss ALWAYS
// triggers the backend fetch + (active-symbol, bounded) warmup, and "no backend candles"
// appears ONLY for a completed backend response that is still empty (a genuine true-empty).
// Run: node tests/swing-chart-candle-load.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  let start = src.indexOf('async ' + sig); if (start < 0) start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } }
function eq(a, b, m) { ok(a === b, m + '  (got ' + JSON.stringify(a) + ')'); }
function section(t) { console.log('\n' + t); }
const bars = (n) => { const a = []; for (let i = 0; i < n; i++) a.push({ time: 1e12 + i * 86400000, open: 100, high: 101, low: 99, close: 100 + i, volume: 1 }); return a; };

// ── Sandbox ──────────────────────────────────────────────────────────────────
const loadLogs = [];
let directCalls = [], warmupCalls = [];
let directReadImpl = async () => ({ ok: false, candles: [], source: 'NONE', count: 0, reason: 'empty' });
let warmupImpl = async () => null;

const sandbox = {
  console: { log: function (m) { if (/^\[SWING-CHART-LOAD\]/.test(String(m))) loadLogs.push(String(m)); }, warn: function () {}, error: function () {}, debug: function () {} },
  Math, JSON, Object, String, Number, isFinite, parseFloat, parseInt, NaN, Array, Promise, Date,
  _swingGetCandles: function (sym, tf) { directCalls.push([sym, tf]); return directReadImpl(sym, tf); },
  _sfsEnsureTfCandles: function (sym, tf) { warmupCalls.push([sym, tf]); return warmupImpl(sym, tf); },
  _sfsLastFailReason: {},
  S: { swing: { chartCache: {}, selectedSymbol: null, chartRequestId: 1, candidateScope: 'window' },
       squeezeFireScanner: { chartCacheCandles: {} } },
};
vm.createContext(sandbox);
vm.runInContext(
  ['_swingNormSym', '_swingChartCacheKey', '_swingChartLoadLog', '_swingChartScopeLabel',
   '_swingCurrentChartSymbol', '_swingIsLatestChartRequest', '_swingIsHardFailure', '_swingChartFailMsg',
   '_swingGetChartCandles'].map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);
const call = (sym, tf, reqId) => vm.runInContext(
  '_swingGetChartCandles(' + JSON.stringify(sym) + ',' + JSON.stringify(tf) + (reqId != null ? ',' + reqId : '') + ')', sandbox);
const S = sandbox.S;
function reset() {
  loadLogs.length = 0; directCalls = []; warmupCalls = []; sandbox._sfsLastFailReason = {};
  directReadImpl = async () => ({ ok: false, candles: [], source: 'NONE', count: 0, reason: 'empty' });
  warmupImpl = async () => null;
  S.swing = { chartCache: {}, selectedSymbol: null, chartRequestId: 1, candidateScope: 'window' };
  S.squeezeFireScanner = { chartCacheCandles: {} };
}
const failMsg = (tf, res) => vm.runInContext('_swingChartFailMsg(' + JSON.stringify(tf) + ',' + JSON.stringify(res) + ')', sandbox);

(async () => {
  // 1) Current-window symbol WITH cache → served from cache, no network, no warmup.
  section('1. Current-window symbol WITH cache — cache hit, no fetch, no warmup');
  {
    reset(); S.swing.selectedSymbol = 'AAPL';
    S.swing.chartCache['AAPL|1D'] = { candles: bars(60), origin: 'backend' };
    S.swing.chartCache['AAPL|4H'] = { candles: bars(60), origin: 'prefetch' };
    const d = await call('AAPL', '1D', 1);
    eq(d.state, 'cache_hit', '1: 1D served from cache');
    eq(d.source, 'SWING_CHART_CACHE', '1: backend-origin cache → SWING_CHART_CACHE');
    const h = await call('AAPL', '4H', 1);
    eq(h.source, 'PREFETCH_CACHE', '1: prefetch-origin cache → PREFETCH_CACHE');
    eq(directCalls.length, 0, '1: NO backend read on a cache hit');
    eq(warmupCalls.length, 0, '1: NO warmup on a cache hit');
    ok(loadLogs.some((l) => /cache symbol=AAPL tf=1D hit=true/.test(l)), '1: logged cache hit');
  }

  // 2) All-snapshot symbol WITHOUT cache → empty read → on-demand warmup hydrates + caches.
  section('2. All snapshot symbol WITHOUT cache — empty read triggers warmup, hydrates 1D & 4H');
  {
    reset(); S.swing.selectedSymbol = 'V'; S.swing.candidateScope = 'all'; S.swing.chartRequestId = 12;
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async (sym, tf) => bars(tf === '4H' ? 40 : 120);
    const d = await call('V', '1D', 12);
    eq(d.ok, true, '2: 1D ok after warmup');
    eq(d.state, 'backend_success_warmed', '2: 1D state = backend_success_warmed');
    eq(d.source, 'BACKEND_WARMUP', '2: 1D provenance = BACKEND_WARMUP');
    ok(d.candles.length >= 5, '2: 1D returned usable candles (' + d.candles.length + ')');
    ok(!!S.swing.chartCache['V|1D'], '2: warmed 1D cached for instant reopen');
    const h = await call('V', '4H', 12);
    eq(h.state, 'backend_success_warmed', '2: 4H also hydrated via warmup');
    ok(!!S.swing.chartCache['V|4H'], '2: warmed 4H cached');
    ok(warmupCalls.length === 2, '2: warmup fired exactly once per timeframe (on-demand, active symbol)');
    ok(loadLogs.some((l) => /backend_fetch_success symbol=V tf=1D count=\d+ source=BACKEND_WARMUP/.test(l)), '2: logged the warmed success');
  }

  // 3) Coverage positive + cache miss → the loader must NOT use coverage to skip the fetch.
  section('3. Coverage-positive + cache miss — loader still fetches (coverage is diagnostic only)');
  {
    reset(); S.swing.selectedSymbol = 'V';
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async () => bars(80);
    const d = await call('V', '1D', 1);
    eq(d.ok, true, '3: fetch+warmup ran and produced candles (coverage never short-circuits the load)');
    eq(directCalls.length, 1, '3: the direct backend read WAS issued');
    eq(warmupCalls.length, 1, '3: the warmup WAS issued');
    const src = stripComments(extractFn(HTML, '_swingGetChartCandles'));
    ok(!/coverage|operational/i.test(src), '3: _swingGetChartCandles never consults coverage/operational to build or skip candles');
  }

  // 4) Partial cache — 1D cached, 4H missing → only 4H fetches/warms.
  section('4. Partial cache — 1D cached, 4H absent → only 4H is fetched');
  {
    reset(); S.swing.selectedSymbol = 'V';
    S.swing.chartCache['V|1D'] = { candles: bars(120), origin: 'backend' };
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async () => bars(40);
    const d = await call('V', '1D', 1);
    eq(d.state, 'cache_hit', '4: 1D from cache (no refetch)');
    const h = await call('V', '4H', 1);
    eq(h.state, 'backend_success_warmed', '4: 4H fetched on demand');
    eq(directCalls.length, 1, '4: exactly one backend read (4H only)');
    eq(warmupCalls.length, 1, '4: exactly one warmup (4H only)');
  }

  // 5) True empty — completed read, warmup still empty → the ONLY case that says "no backend candles".
  section('5. True empty — read + warmup both empty → "no backend candles available" (and NOT cached)');
  {
    reset(); S.swing.selectedSymbol = 'ZZZ';
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async (sym, tf) => { sandbox._sfsLastFailReason[sym + '|' + tf] = 'EMPTY'; return null; };
    const d = await call('ZZZ', '1D', 1);
    eq(d.ok, false, '5: not ok');
    eq(d.state, 'true_empty', '5: state = true_empty');
    eq(failMsg('1D', d), '1D — no backend candles available', '5: message is the genuine no-data copy');
    ok(!S.swing.chartCache['ZZZ|1D'], '5: an empty result is NEVER cached');
  }

  // 6) Cache miss is NOT concluded empty before the backend responds.
  section('6. Cache miss — the fetch is issued; empty is never concluded from the miss alone');
  {
    reset(); S.swing.selectedSymbol = 'V';
    let resolved = false;
    directReadImpl = () => new Promise((r) => setTimeout(() => { resolved = true; r({ ok: true, candles: bars(60), source: 'BACKEND', count: 60, reason: null }); }, 5));
    const p = call('V', '1D', 1);
    ok(loadLogs.some((l) => /backend_fetch_start symbol=V tf=1D/.test(l)) && !loadLogs.some((l) => /true_empty/.test(l)),
       '6: backend_fetch_start logged, NO empty conclusion before the response');
    const d = await p;
    ok(resolved && d.ok && d.state === 'backend_success', '6: once the backend responds, the candles load (no false empty)');
    // The panel shows a loading state up-front (in _swingSelectCandidate), not an empty state.
    const sel = stripComments(extractFn(HTML, '_swingSelectCandidate'));
    ok(/Loading backend candles/.test(sel), '6: selection sets a Loading state before the render resolves');
  }

  // 7) Rapid navigation — a superseded symbol is dropped; the FINAL symbol loads.
  section('7. Rapid navigation GOOGL→…→V — superseded reads dropped, final V loads');
  {
    reset(); S.swing.selectedSymbol = 'V'; S.swing.chartRequestId = 12; // V is the latest selection
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async () => bars(90);
    // A late GOOGL load (its request id 8) is now stale (chartRequestId moved to 12).
    const stale = await call('GOOGL', '1D', 8);
    eq(stale.state, 'superseded', '7: the stale GOOGL request is dropped');
    eq(warmupCalls.length, 0, '7: a superseded symbol never warms up (no wasted subscription)');
    // The final V loads normally.
    const v = await call('V', '1D', 12);
    eq(v.state, 'backend_success_warmed', '7: the final selected symbol V loads');
    eq(failMsg('1D', stale), '1D — loading backend candles…', '7: a superseded state never reads as "no candles"');
  }

  // 8) Out-of-order — a previous symbol's warmup resolves AFTER selection moved → ignored, not cached.
  section('8. Out-of-order — warmup that completes after the selection moved is ignored');
  {
    reset(); S.swing.selectedSymbol = 'AAPL'; S.swing.chartRequestId = 5;
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    // While AAPL warms up, a newer selection (V, request 12) lands.
    warmupImpl = async () => { S.swing.selectedSymbol = 'V'; S.swing.chartRequestId = 12; return bars(90); };
    const d = await call('AAPL', '1D', 5);
    eq(d.state, 'superseded', '8: the out-of-order AAPL result is ignored');
    ok(!S.swing.chartCache['AAPL|1D'], '8: the stale AAPL candles are NOT cached (current symbol is V)');
  }

  // 9) Reselection — an aborted/failed load can be retried and then succeeds.
  section('9. Reselection — a failed load is retried and then succeeds');
  {
    reset(); S.swing.selectedSymbol = 'V';
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async (sym, tf) => { sandbox._sfsLastFailReason[sym + '|' + tf] = 'FETCH_ERROR'; return null; };
    const first = await call('V', '1D', 1);
    eq(first.state, 'network_error', '9: first attempt fails as a network error (not "no candles")');
    ok(!S.swing.chartCache['V|1D'], '9: the failed attempt is not cached');
    // Re-select the same symbol → a working warmup now hydrates it (re-selection bumps the generation).
    warmupImpl = async () => bars(90);
    S.swing.chartRequestId = 2;
    const second = await call('V', '1D', 2);
    eq(second.state, 'backend_success_warmed', '9: the retry re-runs the fetch and succeeds');
    ok(!!S.swing.chartCache['V|1D'], '9: the successful retry caches the candles');
  }

  // 10) Quote lease is untouched by the candle load; warmup is delegated (no direct subscription here).
  section('10. Candle load is independent of the quote lease');
  {
    const src = stripComments(extractFn(HTML, '_swingGetChartCandles'));
    ok(!/acquireSwingChartQuote|releaseSwingChartQuote|releaseAllSwingChartQuotes|subscribeDxlinkQuotes/.test(src),
       '10: the candle loader never touches the quote lease / quote subscription');
    ok(/_sfsEnsureTfCandles\(/.test(src), '10: on-demand hydration is DELEGATED to the shared bounded warmup helper');
    ok(!/\bfetch\s*\(/.test(src) && !/setInterval/.test(src), '10: no direct fetch / no interval in the loader');
  }

  // 11) Scope difference — identical result for the same symbol from Current window vs All snapshot.
  section('11. Scope difference — identical load for the same symbol regardless of scope');
  {
    reset(); S.swing.selectedSymbol = 'V';
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async () => bars(90);
    S.swing.candidateScope = 'window';
    const w = await call('V', '1D', 1); S.swing.chartCache = {};
    S.swing.candidateScope = 'all';
    const a = await call('V', '1D', 1);
    eq(w.state, a.state, '11: same state under both scopes');
    eq(w.ok, a.ok, '11: same ok under both scopes');
    const src = stripComments(extractFn(HTML, '_swingGetChartCandles'));
    ok(!/candidateScope/.test(src), '11: the loader logic never branches on candidateScope (scope is a log label only)');
  }

  // 12) A genuinely missing symbol (dotted) — true empty handled without crashing.
  section('12. Genuinely missing symbol (BRK.B) — true empty handled cleanly, no crash');
  {
    reset(); S.swing.selectedSymbol = 'BRK.B';
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async (sym, tf) => { sandbox._sfsLastFailReason[sym + '|' + tf] = 'EMPTY'; return null; };
    const d = await call('BRK.B', '1D', 1);
    eq(d.state, 'true_empty', '12: dotted missing symbol → true_empty');
    eq(S.swing.selectedSymbol, 'BRK.B', '12: no crash, state intact');
    eq(failMsg('1D', d), '1D — no backend candles available', '12: honest true-empty message');
  }

  // 13) _swingChartFailMsg maps every state honestly — only true-empty says "no backend candles".
  section('13. Message mapping — only true-empty says "no backend candles available"');
  {
    eq(failMsg('1D', { reason: 'http_503' }), '1D — backend candle fetch failed (http_503)', '13: HTTP error → hard failure copy');
    eq(failMsg('1D', { state: 'subscription_limit' }), '1D — backend candle subscription limit — retry shortly', '13: subscription cap → transient copy');
    eq(failMsg('1D', { state: 'network_error' }), '1D — backend candle fetch failed (network)', '13: network error → transient copy');
    eq(failMsg('1D', { state: 'superseded' }), '1D — loading backend candles…', '13: superseded → loading copy');
    eq(failMsg('4H', { state: 'true_empty', reason: 'insufficient_backend_candles' }), '4H — insufficient backend candles', '13: short series → insufficient copy');
    eq(failMsg('1D', { state: 'true_empty', reason: 'true_empty' }), '1D — no backend candles available', '13: TRUE empty → the only "no candles" copy');
  }

  // 14) Warmup is gated to the active chart symbol and to 1D/4H (1W derives from 1D).
  section('14. Warmup gating — active symbol + 1D/4H only');
  {
    reset(); S.swing.selectedSymbol = 'AAPL'; // active symbol is AAPL, not V
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async () => bars(90);
    const other = await call('V', '1D'); // V is not the active chart symbol (no reqId → isolate the active-symbol gate)
    eq(warmupCalls.length, 0, '14: a NON-active symbol never warms up (on-demand = active symbol only)');
    eq(other.state, 'true_empty', '14: a non-active empty read resolves without warmup');
    // 1W never warms up independently (derived from 1D).
    reset(); S.swing.selectedSymbol = 'V';
    directReadImpl = async () => ({ ok: true, candles: [], source: 'BACKEND', count: 0, reason: 'empty' });
    warmupImpl = async () => bars(90);
    await call('V', '1W', 1);
    eq(warmupCalls.length, 0, '14: 1W does not trigger an independent warmup (weekly is derived)');
  }

  // 15) Render wiring — start/complete/aborted diagnostics + reqId threading.
  section('15. Render wiring — SWING-CHART-LOAD start/complete/aborted + reqId threading');
  {
    const r = stripComments(extractFn(HTML, '_swingRenderCharts'));
    ok(/_swingChartLoadLog\('start symbol=/.test(r), '15: logs a per-render start with scope + generation');
    ok(/_swingChartLoadLog\('complete symbol=/.test(r), '15: logs a per-render complete');
    ok(/_swingChartLoadLog\('aborted symbol=/.test(r), '15: logs an aborted on a superseded render');
    ok(/_swingGetChartCandles\(symbol, '1D', reqId\)/.test(r) && /_swingGetChartCandles\(symbol, '4H', reqId\)/.test(r),
       '15: threads the generation (reqId) into the candle load so a late warmup can be dropped');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
