'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING chart — active-symbol live QUOTE lease lifecycle.
//
// PR #308/#309 fixed price PARITY (charts + analysis end on one resolved price) but
// deliberately introduced no quote subscription. During RTH, opening a SWING candidate
// now leases a DXLink QUOTE for the active symbol, acquires the first fresh mark/mid/last,
// and re-aligns the charts + row to it. This is a QUOTE lifecycle ONLY — no candle sub.
//
// Every proof reads the REAL functions out of index.html (no copies) and drives them in a
// vm sandbox with stubbed subscribe/fetch/render seams.
//
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

// ── Sandbox ──────────────────────────────────────────────────────────────────
const quoteLogs = [];
let subscribeCalls = [];        // symbols passed to subscribeDxlinkQuotes
let renderCalls = [];           // (symbol, gen) passed to _swingRenderCharts
let reanalyzeCalls = [];        // (symbol, gen) passed to _swingReanalyzeSelectedRow
let liveQuoteImpl = async () => null; // controllable fetchLiveQuote for the acquisition tests

const sandbox = {
  console: { log: function () {}, warn: function () {}, error: function () {}, debug: function () {} },
  Math, JSON, Object, String, Number, isFinite, parseFloat, parseInt, NaN, Array, Promise, Date,
  encodeURIComponent,
  setTimeout: (fn) => setTimeout(fn, 0), // fast bounded reads
  AbortSignal: { timeout: () => null },
  SWING_QUOTE_CONSUMER: (HTML.match(/var SWING_QUOTE_CONSUMER\s*=\s*'([^']+)'/) || [])[1],
  SWING_QUOTE_MAX_READS: constNum('SWING_QUOTE_MAX_READS'),
  SWING_QUOTE_READ_INTERVAL_MS: constNum('SWING_QUOTE_READ_INTERVAL_MS'),
  SWING_QUOTE_FRESH_TTL_MS: constNum('SWING_QUOTE_FRESH_TTL_MS'),
  _swingQuoteLog: function (msg) { quoteLogs.push(String(msg)); },
  _isRTH: true,
  isRTHOpen: function () { return sandbox._isRTH; },
  resolveLatestDisplayPrice: function () { return null; }, // force the candle/lease path
  subscribeDxlinkQuotes: function (syms) { subscribeCalls.push((syms || []).slice()); return Promise.resolve(); },
  _swingRenderCharts: async function (sym, gen) { renderCalls.push([sym, gen]); },
  _swingReanalyzeSelectedRow: async function (sym, gen) { reanalyzeCalls.push([sym, gen]); },
  // fetchLiveQuote seam — swapped between the real (precedence test) and a controllable stub.
  fetchLiveQuote: function () { return liveQuoteImpl.apply(null, arguments); },
  // fetchLiveQuote internals (for the REAL-precedence test):
  _runLimited: (name, fn) => fn(),
  BACKEND: '',
  _backendAuthHeaders: () => ({}),
  fetch: async () => ({ ok: false }),
  S: { dxlinkSubscribedSymbols: {}, swing: { selectedSymbol: null, active: true, quote: null } },
};
vm.createContext(sandbox);
vm.runInContext(
  ['_backendCandleStoreChartNormTime', '_swingCandleTimeMs', '_swingNormSym', '_swingQuoteState',
   'acquireSwingChartQuote', 'releaseSwingChartQuote', 'replaceSwingChartQuote', 'releaseAllSwingChartQuotes',
   '_swingActiveChartQuote', '_swingCurrentChartSymbol', '_swingAcquireChartLiveQuote',
   '_swingResolveRenderPrice', '_swingFmtClock', '_swingFmtAge', '_swingPriceProvenanceLabel',
   'fetchLiveQuote'].map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);
const realFetchLiveQuote = sandbox.fetchLiveQuote; // the extracted real one
const st = () => sandbox._swingQuoteState();
function reset() {
  subscribeCalls = []; renderCalls = []; reanalyzeCalls = []; quoteLogs.length = 0;
  sandbox._isRTH = true; sandbox.S.dxlinkSubscribedSymbols = {};
  sandbox.S.swing = { selectedSymbol: null, active: true, quote: null };
  sandbox.fetchLiveQuote = function () { return liveQuoteImpl.apply(null, arguments); };
}

(async () => {
  section('1. Acquire — registers the lease and subscribes the (shared) quote once');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD';
    sandbox.acquireSwingChartQuote('amd'); // normalizes
    ok(st().leases.AMD && st().leases.AMD['swing-chart'] === true, '1: AMD lease registered under consumer swing-chart');
    eq(subscribeCalls.length, 1, '1: subscribeDxlinkQuotes called once');
    eq(subscribeCalls[0][0], 'AMD', '1: subscribed the normalized symbol AMD');
    ok(quoteLogs.some((l) => /acquire symbol=AMD consumer=swing-chart/.test(l)), '1: logged acquire transition');
    ok(quoteLogs.some((l) => /acquired symbol=AMD alreadySubscribed=false/.test(l)), '1: logged acquired (alreadySubscribed=false)');
  }

  section('2. Same-symbol idempotency — no duplicate subscribe / lease');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD'); sandbox.acquireSwingChartQuote('AMD'); sandbox.acquireSwingChartQuote('AMD');
    eq(subscribeCalls.length, 1, '2: three acquires of AMD → ONE subscribe (idempotent)');
    eq(Object.keys(st().leases.AMD).length, 1, '2: exactly one consumer on the AMD lease');
  }

  section('3. Already-backend-subscribed → no re-subscribe (dedup)');
  {
    reset(); sandbox.S.dxlinkSubscribedSymbols['AMD'] = true;
    sandbox.acquireSwingChartQuote('AMD');
    eq(subscribeCalls.length, 0, '3: AMD already in S.dxlinkSubscribedSymbols → subscribeDxlinkQuotes NOT called');
    ok(quoteLogs.some((l) => /acquired symbol=AMD alreadySubscribed=true/.test(l)), '3: logged alreadySubscribed=true');
  }

  section('4. First fresh quote is accepted (bounded reads) and re-aligns charts + row');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 7;
    let calls = 0; liveQuoteImpl = async () => (++calls >= 3 ? 561.23 : null); // fresh on the 3rd read
    await sandbox._swingAcquireChartLiveQuote('AMD', 7);
    eq(calls, 3, '4: fetchLiveQuote polled (bounded) until the first fresh price (3 reads)');
    ok(st().active && st().active.symbol === 'AMD' && near(st().active.price, 561.23) && st().active.source === 'dxlink',
       '4: active quote = { AMD, 561.23, dxlink }');
    ok(renderCalls.some((c) => c[0] === 'AMD' && c[1] === 7), '4: re-rendered charts for (AMD, gen 7)');
    ok(reanalyzeCalls.some((c) => c[0] === 'AMD' && c[1] === 7), '4: re-analyzed the selected row for (AMD, gen 7)');
    ok(quoteLogs.some((l) => /first_fresh symbol=AMD price=561.23 source=dxlink/.test(l)), '4: logged first_fresh');
  }

  section('5. Immediate cached-price path — first read already fresh');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 1;
    let calls = 0; liveQuoteImpl = async () => { calls++; return 100.5; };
    await sandbox._swingAcquireChartLiveQuote('AMD', 1);
    eq(calls, 1, '5: a fresh cached price is accepted on the FIRST read (no waiting)');
    ok(near(st().active.price, 100.5), '5: active price = 100.5');
  }

  section('6. _swingActiveChartQuote injects the live price into _swingResolveRenderPrice');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD';
    st().active = { symbol: 'AMD', price: 561.23, source: 'dxlink', ts: Date.now(), gen: 1 };
    eq(sandbox._swingActiveChartQuote('AMD'), 561.23, '6: _swingActiveChartQuote(AMD) → 561.23 (RTH + fresh)');
    const r = sandbox._swingResolveRenderPrice('AMD', [{ time: 1e12, close: 500 }], [{ time: 2e12, close: 505 }]);
    ok(near(r.price, 561.23) && r.source === 'dxlink', '6: _swingResolveRenderPrice → live 561.23 (source dxlink), over the candle closes');
    // Only the ACTIVE symbol gets the lease price; a different symbol falls through to candles.
    const r2 = sandbox._swingResolveRenderPrice('NET', [{ time: 1e12, close: 500 }], [{ time: 2e12, close: 505 }]);
    ok(near(r2.price, 505) && /backend/.test(r2.source), '6: a NON-active symbol falls back to the freshest candle (no cross-symbol leak)');
  }

  section('7. Market CLOSED → lease price is ignored; acquisition does nothing (backend fallback intact)');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; sandbox._isRTH = false;
    st().active = { symbol: 'AMD', price: 561.23, source: 'dxlink', ts: Date.now(), gen: 1 };
    eq(sandbox._swingActiveChartQuote('AMD'), null, '7: market closed → _swingActiveChartQuote returns null');
    const r = sandbox._swingResolveRenderPrice('AMD', [{ time: 1e12, close: 500 }], [{ time: 2e12, close: 505 }]);
    ok(near(r.price, 505) && /backend/.test(r.source), '7: closed → resolver uses the freshest backend candle (#308/#309 fallback)');
    let calls = 0; liveQuoteImpl = async () => { calls++; return 999; };
    await sandbox._swingAcquireChartLiveQuote('AMD', 1);
    eq(calls, 0, '7: closed → _swingAcquireChartLiveQuote performs NO reads (does not wait for a live quote)');
  }

  section('8. Stale / gone-stale quote → rejected');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD';
    // fetchLiveQuote returns null for stale/non-DXLINK (tested in §13); acquisition never accepts null.
    let calls = 0; liveQuoteImpl = async () => { calls++; return null; };
    st().gen = 4;
    await sandbox._swingAcquireChartLiveQuote('AMD', 4);
    eq(calls, sandbox.SWING_QUOTE_MAX_READS, '8: no fresh quote → bounded budget of SWING_QUOTE_MAX_READS reads, then stop');
    ok(!st().active, '8: nothing accepted (active stays null) — no stale/invalid patch');
    // A previously-accepted quote older than the TTL is treated as stale.
    st().active = { symbol: 'AMD', price: 500, source: 'dxlink', ts: Date.now() - (sandbox.SWING_QUOTE_FRESH_TTL_MS + 1000), gen: 1 };
    eq(sandbox._swingActiveChartQuote('AMD'), null, '8: an accepted quote older than the TTL is stale → null');
  }

  section('9. AMD → NET handoff — acquire NET before releasing AMD; AMD lease dropped');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD');
    subscribeCalls = []; quoteLogs.length = 0;
    sandbox.replaceSwingChartQuote('AMD', 'NET');
    ok(st().leases.NET && st().leases.NET['swing-chart'], '9: NET lease acquired');
    ok(!st().leases.AMD, '9: AMD lease released (no consumers left)');
    ok(quoteLogs.some((l) => /handoff from=AMD to=NET/.test(l)), '9: logged handoff AMD→NET');
    ok(quoteLogs.some((l) => /release symbol=AMD remainingConsumers=0/.test(l)), '9: logged AMD release');
  }

  section('10. Late AMD result can NEVER patch NET (generation + symbol guard)');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 10;
    // While the AMD read is in flight, the selection moves to NET (gen bumped) → AMD result ignored.
    liveQuoteImpl = async () => { sandbox.S.swing.selectedSymbol = 'NET'; st().gen = 11; return 561.23; };
    await sandbox._swingAcquireChartLiveQuote('AMD', 10);
    ok(!(st().active && st().active.symbol === 'AMD'), '10: AMD quote NOT accepted after selection moved to NET');
    ok(!renderCalls.some((c) => c[0] === 'AMD'), '10: no AMD chart re-render triggered');
    ok(quoteLogs.some((l) => /stale_result_ignored symbol=AMD selected=NET/.test(l)), '10: logged stale_result_ignored');
  }

  section('11. Reference-count safety — a co-owning consumer keeps the quote after SWING releases');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD');
    st().leases.AMD['portfolio'] = true;                 // Portfolio co-owns the same symbol
    sandbox.releaseSwingChartQuote('AMD');
    ok(st().leases.AMD && st().leases.AMD['portfolio'] === true, '11: Portfolio consumer survives the SWING release');
    ok(!st().leases.AMD['swing-chart'], '11: only the swing-chart claim was dropped');
    ok(quoteLogs.some((l) => /release symbol=AMD remainingConsumers=1/.test(l)), '11: logged remainingConsumers=1');
    // Backend subscription is never globally torn down (there is no unsubscribe endpoint / call).
    reset(); sandbox.S.dxlinkSubscribedSymbols['AMD'] = true; sandbox.acquireSwingChartQuote('AMD');
    sandbox.releaseSwingChartQuote('AMD');
    ok(sandbox.S.dxlinkSubscribedSymbols['AMD'] === true, '11: releasing never removes the shared backend subscription (Portfolio-owned AMD stays live)');
  }

  section('12. releaseAll — panel leave / logout / disconnect drops all SWING leases');
  {
    reset(); sandbox.acquireSwingChartQuote('AMD'); sandbox.acquireSwingChartQuote('NET');
    st().active = { symbol: 'NET', price: 1, source: 'dxlink', ts: Date.now() };
    const genBefore = st().gen;
    sandbox.releaseAllSwingChartQuotes();
    ok(!st().leases.AMD && !st().leases.NET, '12: all SWING leases released');
    ok(st().active === null, '12: active quote cleared');
    ok(st().gen === genBefore + 1, '12: generation bumped (abandons any in-flight read)');
    ok(quoteLogs.some((l) => /panel_release symbol=NET/.test(l)), '12: logged panel_release');
  }

  section('13. fetchLiveQuote precedence: mark > midpoint > last; stale/non-DXLINK → null');
  {
    const withQuote = (payload) => { sandbox.fetch = async () => ({ ok: true, json: async () => payload }); };
    sandbox.fetchLiveQuote = realFetchLiveQuote; // use the REAL helper
    withQuote({ source: 'DXLINK', isStale: false, quote: { mark: 100, bidPrice: 98, askPrice: 102, lastPrice: 99 } });
    eq(await sandbox.fetchLiveQuote('AMD'), 100, '13: mark wins');
    withQuote({ source: 'DXLINK', isStale: false, quote: { bidPrice: 98, askPrice: 102, lastPrice: 99 } });
    eq(await sandbox.fetchLiveQuote('AMD'), 100, '13: no mark → midpoint (98+102)/2 = 100');
    withQuote({ source: 'DXLINK', isStale: false, quote: { lastPrice: 99 } });
    eq(await sandbox.fetchLiveQuote('AMD'), 99, '13: only last → last 99');
    withQuote({ source: 'DXLINK', isStale: true, quote: { mark: 100 } });
    eq(await sandbox.fetchLiveQuote('AMD'), null, '13: isStale → null (rejected)');
    withQuote({ source: 'BACKEND', quote: { mark: 100 } });
    eq(await sandbox.fetchLiveQuote('AMD'), null, '13: non-DXLINK source → null (rejected)');
    sandbox.fetchLiveQuote = function () { return liveQuoteImpl.apply(null, arguments); }; // restore stub seam
  }

  section('14. Provenance label describes the PRICE, not just the candle source');
  {
    const t = Date.UTC(2026, 6, 13, 12, 34, 56);
    ok(/^LIVE · DXLink · updated /.test(sandbox._swingPriceProvenanceLabel({ source: 'dxlink', price: 561.23, ts: t, now: t })),
       '14: dxlink → "LIVE · DXLink · updated …"');
    eq(sandbox._swingPriceProvenanceLabel({ source: 'backend 4H', price: 210.93, candleTimeMs: Date.now() - 120000, now: Date.now() }),
       'BACKEND 4H · 2m old', '14: backend 4H → "BACKEND 4H · 2m old"');
    eq(sandbox._swingPriceProvenanceLabel({ source: null, price: null }), '', '14: no price → empty label');
  }

  // ── Static guards ────────────────────────────────────────────────────────────
  section('15. QUOTE lifecycle ONLY — no candle subscription, no unbounded polling, transition-only logs');
  {
    const leaseSrc = ['acquireSwingChartQuote', 'releaseSwingChartQuote', 'replaceSwingChartQuote',
      'releaseAllSwingChartQuotes', '_swingActiveChartQuote', '_swingAcquireChartLiveQuote', '_swingReanalyzeSelectedRow']
      .map((n) => stripComments(extractFn(HTML, n))).join('\n');
    ok(!/subscribe-candles|subscribe-30m|subscribe-1d|subscribe-4h|candles-dxlink[^']*subscribe|_sfsEnsureTfCandles|warmup/i.test(leaseSrc),
       '15: no candle subscription / warmup in the quote-lease code (QUOTE only)');
    ok(!/setInterval\s*\(/.test(leaseSrc), '15: no setInterval (no unbounded polling)');
    // The only iteration is the bounded for-loop capped by SWING_QUOTE_MAX_READS.
    ok(/for \(var i = 0; i < SWING_QUOTE_MAX_READS/.test(stripComments(extractFn(HTML, '_swingAcquireChartLiveQuote'))),
       '15: first-fresh acquisition is a bounded for-loop capped by SWING_QUOTE_MAX_READS');
    // Never mutates scanner stores or backend candle caches.
    ok(!/S\.scanData\s*=|S\.scanData\[[^\]]*\]\s*=|chartCacheCandles\s*=|\.candles\s*=\s*|S\.swing\.chartCache\s*=/.test(leaseSrc),
       '15: quote-lease code never mutates scanner stores / candle caches');
    ok(!/yahoo/i.test(leaseSrc), '15: no Yahoo provider');
    // No global unsubscribe endpoint is ever called (there is none).
    ok(!/unsubscribe|\/dxlink\/[a-z-]*release|subscribe-quotes/i.test(stripComments(extractFn(HTML, 'releaseSwingChartQuote')) + stripComments(extractFn(HTML, 'releaseAllSwingChartQuotes'))),
       '15: release path issues NO backend unsubscribe (never starves Portfolio/scanner quotes)');
  }

  section('16. Wiring — selection acquires/handoffs, teardown + clear release');
  {
    const sel = stripComments(extractFn(HTML, '_swingSelectCandidate'));
    ok(/replaceSwingChartQuote\(_prevSelected, symbol\)/.test(sel), '16: _swingSelectCandidate hands off the lease (prev → new)');
    ok(/_swingAcquireChartLiveQuote\(symbol, reqId\)/.test(sel), '16: _swingSelectCandidate kicks the bounded live-quote acquisition');
    ok(/S\.swing\.selectedSymbol === symbol[\s\S]*return Promise\.resolve\(\)/.test(sel), '16: re-selecting the same symbol short-circuits (idempotent)');
    ok(/releaseAllSwingChartQuotes\(\)/.test(stripComments(extractFn(HTML, '_swingTeardown'))), '16: _swingTeardown releases the lease (panel leave)');
    ok(/releaseAllSwingChartQuotes\(\)/.test(stripComments(extractFn(HTML, '_swingClearCharts'))), '16: _swingClearCharts releases the lease');
    // Prev/Next go through the same _swingSelectCandidate lifecycle.
    ok(/_swingSelectCandidate\(/.test(stripComments(extractFn(HTML, '_swingSelectNextCandidate'))) &&
       /_swingSelectCandidate\(/.test(stripComments(extractFn(HTML, '_swingSelectPrevCandidate'))),
       '16: Prev/Next reuse _swingSelectCandidate (same lease lifecycle as row click)');
  }

  section('17. No per-event log storm — logs are transition-only, bounded');
  {
    reset(); sandbox.S.swing.selectedSymbol = 'AMD'; st().gen = 1;
    let calls = 0; liveQuoteImpl = async () => (++calls >= 2 ? 500 : null);
    await sandbox._swingAcquireChartLiveQuote('AMD', 1);
    const firstFresh = quoteLogs.filter((l) => /first_fresh/.test(l)).length;
    eq(firstFresh, 1, '17: exactly ONE first_fresh log for the whole acquisition (not one per read)');
    ok(quoteLogs.length <= 3, '17: acquisition emits only a couple of transition logs (no per-quote storm), got ' + quoteLogs.length);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
