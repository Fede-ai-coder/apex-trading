'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING chart — active-symbol live DXLink QUOTE lease + live-follow.
//
// PR #308/#309 fixed price PARITY but added no quote subscription. During RTH, opening a
// SWING candidate now leases a DXLink QUOTE (consumer 'swing-chart') for the active symbol,
// acquires the first fresh mark/mid/last, re-aligns the charts + row, and KEEPS FOLLOWING the
// market (throttled) while the chart stays open. QUOTE lifecycle only — no candle subscription.
// Release drops only our frontend consumer claim (never a global unsubscribe); a real backend
// consumer-scoped release is a documented follow-up (separate repo).
//
// Every proof reads the REAL functions out of index.html (no copies).
// Run: node tests/swing-chart-quote-lease.test.js
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
const constNum = (name) => Number((HTML.match(new RegExp('var ' + name + '\\s*=\\s*([0-9]+)')) || [])[1]);

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } }
function eq(a, b, m) { ok(a === b, m + '  (got ' + JSON.stringify(a) + ')'); }
function section(t) { console.log('\n' + t); }
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6;
const tick = () => new Promise((r) => setTimeout(r, 0));

// ── Sandbox ──────────────────────────────────────────────────────────────────
const quoteLogs = [];
let subscribeCalls = [], renderCalls = [], reanalyzeCalls = [];
let liveQuoteImpl = async () => null;

const sandbox = {
  console: { log: function () {}, warn: function () {}, error: function () {}, debug: function () {} },
  Math, JSON, Object, String, Number, isFinite, parseFloat, parseInt, NaN, Array, Promise, Date, encodeURIComponent,
  setTimeout: (fn) => setTimeout(fn, 0), clearTimeout: (id) => clearTimeout(id),
  AbortSignal: { timeout: () => null },
  SWING_QUOTE_CONSUMER: (HTML.match(/var SWING_QUOTE_CONSUMER\s*=\s*'([^']+)'/) || [])[1],
  SWING_QUOTE_MAX_READS: constNum('SWING_QUOTE_MAX_READS'),
  SWING_QUOTE_READ_INTERVAL_MS: constNum('SWING_QUOTE_READ_INTERVAL_MS'),
  SWING_QUOTE_FRESH_TTL_MS: constNum('SWING_QUOTE_FRESH_TTL_MS'),
  SWING_QUOTE_FOLLOW_INTERVAL_MS: constNum('SWING_QUOTE_FOLLOW_INTERVAL_MS'),
  SWING_QUOTE_MIN_MOVE: Number((HTML.match(/var SWING_QUOTE_MIN_MOVE\s*=\s*([0-9.]+)/) || [])[1]),
  _swingQuoteLog: function (msg) { quoteLogs.push(String(msg)); },
  _isRTH: true,
  isRTHOpen: function () { return sandbox._isRTH; },
  resolveLatestDisplayPrice: function () { return null; },
  subscribeDxlinkQuotes: function (syms) { subscribeCalls.push((syms || []).slice()); return Promise.resolve(); },
  _swingRenderCharts: async function (sym, gen) { renderCalls.push([sym, gen]); },
  _swingReanalyzeSelectedRow: async function (sym, gen) { reanalyzeCalls.push([sym, gen]); },
  fetchLiveQuote: function () { return liveQuoteImpl.apply(null, arguments); },
  _runLimited: (name, fn) => fn(), BACKEND: '', _backendAuthHeaders: () => ({}), fetch: async () => ({ ok: false }),
  S: { dxlinkSubscribedSymbols: {}, swing: { selectedSymbol: null, active: false, quote: null } },
};
vm.createContext(sandbox);
vm.runInContext(
  ['isAbortLikeError', '_backendCandleStoreChartNormTime', '_swingCandleTimeMs', '_swingNormSym', '_swingSafeErrorReason', '_swingQuoteState',
   'acquireSwingChartQuote', 'releaseSwingChartQuote', 'replaceSwingChartQuote', 'releaseAllSwingChartQuotes',
   '_swingActiveChartQuote', '_swingCurrentChartSymbol', '_swingAcquireChartLiveQuote',
   '_swingStopQuoteFollow', '_swingFollowActive', '_swingStartQuoteFollow', '_swingQuoteFollowTick',
   '_swingResolveRenderPrice', '_swingFmtClock', '_swingFmtAge', '_swingPriceProvenanceLabel',
   'fetchLiveQuote'].map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);
const realFetchLiveQuote = sandbox.fetchLiveQuote;
const st = () => sandbox._swingQuoteState();
function reset() {
  subscribeCalls = []; renderCalls = []; reanalyzeCalls = []; quoteLogs.length = 0;
  sandbox._isRTH = true; sandbox.S.dxlinkSubscribedSymbols = {};
  sandbox.S.swing = { selectedSymbol: null, active: false, quote: null }; // active:false → follow off unless a test enables it
  sandbox.fetchLiveQuote = function () { return liveQuoteImpl.apply(null, arguments); };
}

(async () => {
  section('1. Acquire — subscribes once; acquired logged AFTER subscribe SUCCEEDS; returns a promise');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD';
    const p = sandbox.acquireSwingChartQuote('amd');
    ok(p && typeof p.then === 'function', '1: acquireSwingChartQuote returns a promise (chart still renders without awaiting)');
    ok(st().leases.AMD && st().leases.AMD['swing-chart'] === true, '1: AMD lease under consumer swing-chart');
    ok(quoteLogs.some((l) => /acquire symbol=AMD consumer=swing-chart/.test(l)), '1: logged acquire');
    ok(!quoteLogs.some((l) => /^acquired/.test(l)), '1: "acquired" NOT logged synchronously (waits for the subscribe request)');
    await p;
    eq(subscribeCalls.length, 1, '1: subscribeDxlinkQuotes called once');
    eq(subscribeCalls[0][0], 'AMD', '1: subscribed AMD (normalized)');
    ok(quoteLogs.some((l) => /acquired symbol=AMD alreadySubscribed=false/.test(l)), '1: acquired logged after the subscribe SUCCEEDED');
  }

  section('1b. Acquire FAILURE — logs acquire_failed with a reason, never "acquired"');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD';
    sandbox.subscribeDxlinkQuotes = function (syms) { subscribeCalls.push((syms || []).slice()); return Promise.reject(new Error('HTTP 503')); };
    await sandbox.acquireSwingChartQuote('AMD');
    ok(quoteLogs.some((l) => /acquire_failed symbol=AMD reason=HTTP 503/.test(l)), '1b: logged acquire_failed with the real reason');
    ok(!quoteLogs.some((l) => /^acquired /.test(l)), '1b: did NOT log a misleading "acquired" on failure');
    // restore the default subscribe stub
    sandbox.subscribeDxlinkQuotes = function (syms) { subscribeCalls.push((syms || []).slice()); return Promise.resolve(); };
    // Safe reason helper: aborts are classified, long messages are truncated.
    ok(sandbox._swingSafeErrorReason(null) === 'unknown', '1b: _swingSafeErrorReason(null) → "unknown"');
    ok(sandbox._swingSafeErrorReason({ name: 'AbortError' }) === 'aborted', '1b: abort-like error → "aborted"');
  }

  section('2. Same-symbol idempotency — no duplicate subscribe / lease');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD'); sandbox.acquireSwingChartQuote('AMD'); sandbox.acquireSwingChartQuote('AMD');
    await tick();
    eq(subscribeCalls.length, 1, '2: three acquires → ONE subscribe');
    eq(Object.keys(st().leases.AMD).length, 1, '2: one consumer on the AMD lease');
  }

  section('3. Already-backend-subscribed → no re-subscribe (dedup); acquired synchronous');
  {
    reset(); sandbox.S.dxlinkSubscribedSymbols['AMD'] = true;
    sandbox.acquireSwingChartQuote('AMD');
    eq(subscribeCalls.length, 0, '3: AMD already subscribed → subscribe NOT called');
    ok(quoteLogs.some((l) => /acquired symbol=AMD alreadySubscribed=true/.test(l)), '3: acquired alreadySubscribed=true');
  }

  section('4. First fresh quote accepted (bounded reads) → re-aligns charts + row');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 7;
    let calls = 0; liveQuoteImpl = async () => (++calls >= 3 ? 561.23 : null);
    await sandbox._swingAcquireChartLiveQuote('AMD', 7);
    eq(calls, 3, '4: bounded reads until first fresh (3)');
    ok(st().active && st().active.symbol === 'AMD' && near(st().active.price, 561.23) && st().active.source === 'dxlink', '4: active = { AMD, 561.23, dxlink }');
    ok(renderCalls.some((c) => c[0] === 'AMD' && c[1] === 7), '4: re-rendered charts (AMD, gen 7)');
    ok(reanalyzeCalls.some((c) => c[0] === 'AMD' && c[1] === 7), '4: re-analyzed the row (AMD, gen 7)');
    ok(quoteLogs.some((l) => /first_fresh symbol=AMD price=561.23 source=dxlink/.test(l)), '4: logged first_fresh');
    ok(st().followTimer == null, '4: no live-follow scheduled while S.swing.active=false');
  }

  section('5. Immediate cached-price path — first read already fresh');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 1;
    let calls = 0; liveQuoteImpl = async () => { calls++; return 100.5; };
    await sandbox._swingAcquireChartLiveQuote('AMD', 1);
    eq(calls, 1, '5: accepted on the FIRST read');
    ok(near(st().active.price, 100.5), '5: active price = 100.5');
  }

  section('6. Lease price injected into _swingResolveRenderPrice; no cross-symbol leak');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD';
    st().active = { symbol: 'AMD', price: 561.23, source: 'dxlink', ts: Date.now(), gen: 1 };
    eq(sandbox._swingActiveChartQuote('AMD'), 561.23, '6: _swingActiveChartQuote(AMD) → 561.23');
    const r = sandbox._swingResolveRenderPrice('AMD', [{ time: 1e12, close: 500 }], [{ time: 2e12, close: 505 }]);
    ok(near(r.price, 561.23) && r.source === 'dxlink', '6: resolver → live 561.23 over candle closes');
    const r2 = sandbox._swingResolveRenderPrice('NET', [{ time: 1e12, close: 500 }], [{ time: 2e12, close: 505 }]);
    ok(near(r2.price, 505) && /backend/.test(r2.source), '6: NON-active symbol falls back to candle (no leak)');
  }

  section('7. Market CLOSED → lease ignored; acquisition does nothing');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; sandbox._isRTH = false;
    st().active = { symbol: 'AMD', price: 561.23, source: 'dxlink', ts: Date.now(), gen: 1 };
    eq(sandbox._swingActiveChartQuote('AMD'), null, '7: closed → _swingActiveChartQuote null');
    const r = sandbox._swingResolveRenderPrice('AMD', [{ time: 1e12, close: 500 }], [{ time: 2e12, close: 505 }]);
    ok(near(r.price, 505) && /backend/.test(r.source), '7: closed → freshest backend candle (#308/#309 fallback)');
    let calls = 0; liveQuoteImpl = async () => { calls++; return 999; };
    await sandbox._swingAcquireChartLiveQuote('AMD', 1);
    eq(calls, 0, '7: closed → NO reads');
  }

  section('8. Stale / gone-stale quote → rejected');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 4;
    let calls = 0; liveQuoteImpl = async () => { calls++; return null; };
    await sandbox._swingAcquireChartLiveQuote('AMD', 4);
    eq(calls, sandbox.SWING_QUOTE_MAX_READS, '8: no fresh → bounded budget then stop');
    ok(!st().active, '8: nothing accepted (no stale/invalid patch)');
    st().active = { symbol: 'AMD', price: 500, source: 'dxlink', ts: Date.now() - (sandbox.SWING_QUOTE_FRESH_TTL_MS + 1000), gen: 1 };
    eq(sandbox._swingActiveChartQuote('AMD'), null, '8: accepted quote older than TTL → stale → null');
  }

  section('9. AMD → NET handoff — acquire NET before releasing AMD');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD'); await tick();
    subscribeCalls = []; quoteLogs.length = 0;
    sandbox.replaceSwingChartQuote('AMD', 'NET');
    ok(st().leases.NET && st().leases.NET['swing-chart'], '9: NET lease acquired');
    ok(!st().leases.AMD, '9: AMD lease released');
    ok(quoteLogs.some((l) => /handoff from=AMD to=NET/.test(l)), '9: logged handoff');
    ok(quoteLogs.some((l) => /release symbol=AMD remainingConsumers=0/.test(l)), '9: logged AMD release');
  }

  section('10. Late AMD result can NEVER patch NET (generation + symbol guard)');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 10;
    liveQuoteImpl = async () => { sandbox.S.swing.selectedSymbol = 'NET'; st().gen = 11; return 561.23; };
    await sandbox._swingAcquireChartLiveQuote('AMD', 10);
    ok(!(st().active && st().active.symbol === 'AMD'), '10: AMD not accepted after selection moved to NET');
    ok(!renderCalls.some((c) => c[0] === 'AMD'), '10: no AMD chart re-render');
    ok(quoteLogs.some((l) => /stale_result_ignored symbol=AMD selected=NET/.test(l)), '10: logged stale_result_ignored');
  }

  section('11. Reference-count safety — a co-owning consumer keeps the quote; backend sub never torn down');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD'); st().leases.AMD['portfolio'] = true;
    sandbox.releaseSwingChartQuote('AMD');
    ok(st().leases.AMD && st().leases.AMD['portfolio'] === true, '11: Portfolio consumer survives the SWING release');
    ok(!st().leases.AMD['swing-chart'], '11: only the swing-chart claim dropped');
    ok(quoteLogs.some((l) => /release symbol=AMD remainingConsumers=1/.test(l)), '11: remainingConsumers=1');
    reset(); sandbox.S.dxlinkSubscribedSymbols['AMD'] = true; sandbox.acquireSwingChartQuote('AMD');
    sandbox.releaseSwingChartQuote('AMD');
    ok(sandbox.S.dxlinkSubscribedSymbols['AMD'] === true, '11: release never removes the shared backend subscription');
  }

  section('12. releaseAll — panel leave / logout / disconnect drops all leases + stops follow');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD'); sandbox.acquireSwingChartQuote('NET');
    st().active = { symbol: 'NET', price: 1, source: 'dxlink', ts: Date.now() };
    st().followTimer = 12345; const genBefore = st().gen;
    sandbox.releaseAllSwingChartQuotes();
    ok(!st().leases.AMD && !st().leases.NET, '12: all SWING leases released');
    ok(st().active === null, '12: active quote cleared');
    ok(st().followTimer === null, '12: live-follow stopped');
    ok(st().gen === genBefore + 1, '12: generation bumped');
    ok(quoteLogs.some((l) => /panel_release symbol=NET/.test(l)), '12: logged panel_release');
  }

  section('13. fetchLiveQuote precedence: mark > midpoint > last; stale/non-DXLINK → null');
  {
    const withQuote = (p) => { sandbox.fetch = async () => ({ ok: true, json: async () => p }); };
    sandbox.fetchLiveQuote = realFetchLiveQuote;
    withQuote({ source: 'DXLINK', isStale: false, quote: { mark: 100, bidPrice: 98, askPrice: 102, lastPrice: 99 } });
    eq(await sandbox.fetchLiveQuote('AMD'), 100, '13: mark wins');
    withQuote({ source: 'DXLINK', isStale: false, quote: { bidPrice: 98, askPrice: 102, lastPrice: 99 } });
    eq(await sandbox.fetchLiveQuote('AMD'), 100, '13: no mark → midpoint 100');
    withQuote({ source: 'DXLINK', isStale: false, quote: { lastPrice: 99 } });
    eq(await sandbox.fetchLiveQuote('AMD'), 99, '13: only last → 99');
    withQuote({ source: 'DXLINK', isStale: true, quote: { mark: 100 } });
    eq(await sandbox.fetchLiveQuote('AMD'), null, '13: isStale → null');
    withQuote({ source: 'BACKEND', quote: { mark: 100 } });
    eq(await sandbox.fetchLiveQuote('AMD'), null, '13: non-DXLINK → null');
    sandbox.fetchLiveQuote = function () { return liveQuoteImpl.apply(null, arguments); };
  }

  section('14. Provenance label describes the PRICE');
  {
    const t = Date.UTC(2026, 6, 13, 12, 34, 56);
    ok(/^LIVE · DXLink · updated /.test(sandbox._swingPriceProvenanceLabel({ source: 'dxlink', price: 561.23, ts: t, now: t })), '14: dxlink → LIVE …');
    eq(sandbox._swingPriceProvenanceLabel({ source: 'backend 4H', price: 210.93, candleTimeMs: Date.now() - 120000, now: Date.now() }), 'BACKEND 4H · 2m old', '14: backend 4H · 2m old');
    eq(sandbox._swingPriceProvenanceLabel({ source: null, price: null }), '', '14: no price → empty');
  }

  section('15. LIVE-FOLLOW — keeps the open chart tracking; re-aligns only on a real move; stops on lifecycle');
  {
    // Capturing timer so the self-rescheduling loop does not spin — we drive ticks manually.
    let captured = []; const realST = sandbox.setTimeout, realCT = sandbox.clearTimeout;
    sandbox.setTimeout = (fn) => { captured.push(fn); return captured.length; };
    sandbox.clearTimeout = () => {};
    reset(); sandbox.S.swing.active = true; sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 5;
    st().active = { symbol: 'AMD', price: 500, source: 'dxlink', ts: Date.now() - 8000, gen: 5 };
    // (a) moved price → re-align + reschedule.
    liveQuoteImpl = async () => 505.0;
    await sandbox._swingQuoteFollowTick('AMD', 5);
    ok(near(st().active.price, 505.0), '15a: follow updated the active price to 505.00 on a real move');
    ok(renderCalls.some((c) => c[0] === 'AMD') && reanalyzeCalls.some((c) => c[0] === 'AMD'), '15a: re-aligned charts + row on the move');
    ok(quoteLogs.some((l) => /refresh symbol=AMD price=505.00/.test(l)), '15a: logged refresh');
    ok(captured.length >= 1, '15a: rescheduled the follow (still open)');
    // (b) sub-threshold move → refresh freshness stamp only, NO re-align.
    renderCalls = []; reanalyzeCalls = []; captured = [];
    const tsBefore = st().active.ts; liveQuoteImpl = async () => 505.0 + sandbox.SWING_QUOTE_MIN_MOVE / 2;
    await sandbox._swingQuoteFollowTick('AMD', 5);
    ok(renderCalls.length === 0 && reanalyzeCalls.length === 0, '15b: sub-threshold move → NO redraw');
    ok(st().active.ts >= tsBefore, '15b: freshness stamp refreshed (lease stays live, no revert to backend)');
    ok(captured.length >= 1, '15b: still rescheduled');
    // (c) selection moved → tick stops (no reschedule).
    renderCalls = []; captured = []; sandbox.S.swing.selectedSymbol = 'NET';
    await sandbox._swingQuoteFollowTick('AMD', 5);
    ok(renderCalls.length === 0 && captured.length === 0, '15c: selection moved to NET → follow stops (no reschedule, no AMD redraw)');
    // (d) panel inactive → tick stops.
    sandbox.S.swing.selectedSymbol = 'AMD'; sandbox.S.swing.active = false; captured = [];
    await sandbox._swingQuoteFollowTick('AMD', 5);
    ok(captured.length === 0, '15d: panel inactive → follow stops');
    sandbox.setTimeout = realST; sandbox.clearTimeout = realCT;
  }

  // ── Static guards ────────────────────────────────────────────────────────────
  section('16. QUOTE lifecycle ONLY — no candle sub, no direct fetch, no setInterval, no store mutation');
  {
    const leaseSrc = ['acquireSwingChartQuote', 'releaseSwingChartQuote', 'replaceSwingChartQuote',
      'releaseAllSwingChartQuotes', '_swingActiveChartQuote', '_swingAcquireChartLiveQuote',
      '_swingReanalyzeSelectedRow', '_swingStartQuoteFollow', '_swingQuoteFollowTick', '_swingStopQuoteFollow']
      .map((n) => stripComments(extractFn(HTML, n))).join('\n');
    ok(!/subscribe-candles|subscribe-30m|subscribe-1d|subscribe-4h|_sfsEnsureTfCandles|warmup/i.test(leaseSrc), '16: no candle subscription / warmup (QUOTE only)');
    ok(!/\bfetch\s*\(/.test(leaseSrc), '16: no direct backend fetch (delegated to shared subscribeDxlinkQuotes / fetchLiveQuote)');
    ok(!/setInterval\s*\(/.test(leaseSrc), '16: no setInterval (live-follow is a self-rescheduling one-shot timer)');
    ok(/for \(var i = 0; i < SWING_QUOTE_MAX_READS/.test(stripComments(extractFn(HTML, '_swingAcquireChartLiveQuote'))), '16: first-fresh is a bounded for-loop');
    ok(!/S\.scanData\s*=|chartCacheCandles\s*=|\.candles\s*=\s*|S\.swing\.chartCache\s*=/.test(leaseSrc), '16: never mutates scanner stores / candle caches');
    ok(!/yahoo/i.test(leaseSrc), '16: no Yahoo');
    ok(!/unsubscribe|\/dxlink\/[a-z-]*release/i.test(stripComments(extractFn(HTML, 'releaseSwingChartQuote')) + stripComments(extractFn(HTML, 'releaseAllSwingChartQuotes'))), '16: release issues NO backend unsubscribe');
  }

  section('17. Wiring — selection acquires/handoffs + retries; teardown/clear release; Prev/Next reuse');
  {
    const sel = stripComments(extractFn(HTML, '_swingSelectCandidate'));
    ok(/replaceSwingChartQuote\(_prevSelected, symbol\)/.test(sel), '17: hands off the lease prev → new');
    ok(/_swingAcquireChartLiveQuote\(symbol, reqId\)/.test(sel), '17: kicks the bounded live-quote acquisition');
    ok(/_swingActiveChartQuote\(symbol\) == null[\s\S]*_swingAcquireChartLiveQuote\(symbol, S\.swing\.chartRequestId\)/.test(sel),
       '17: re-selecting the same symbol RETRIES acquisition when no fresh quote is held');
    ok(/releaseAllSwingChartQuotes\(\)/.test(stripComments(extractFn(HTML, '_swingTeardown'))), '17: _swingTeardown releases');
    ok(/releaseAllSwingChartQuotes\(\)/.test(stripComments(extractFn(HTML, '_swingClearCharts'))), '17: _swingClearCharts releases');
    ok(/_swingSelectCandidate\(/.test(stripComments(extractFn(HTML, '_swingSelectNextCandidate'))) &&
       /_swingSelectCandidate\(/.test(stripComments(extractFn(HTML, '_swingSelectPrevCandidate'))), '17: Prev/Next reuse _swingSelectCandidate');
  }

  section('18. No per-event log storm — one first_fresh + no per-tick log for unchanged quotes');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 1;
    let calls = 0; liveQuoteImpl = async () => (++calls >= 2 ? 500 : null);
    await sandbox._swingAcquireChartLiveQuote('AMD', 1);
    eq(quoteLogs.filter((l) => /first_fresh/.test(l)).length, 1, '18: exactly ONE first_fresh for the acquisition');
    ok(quoteLogs.length <= 3, '18: only a couple of transition logs (no per-quote storm), got ' + quoteLogs.length);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
