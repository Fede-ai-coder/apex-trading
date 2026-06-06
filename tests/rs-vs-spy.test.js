'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// RS vs SPY scanner — price-pipeline validation.
//
// These tests extract the REAL RS functions from index.html (no copies, so they
// cannot drift) and run them in a vm sandbox with synthetic DXLink candle
// buffers. They prove the hard requirements of the audit:
//   • no RS code path reaches Yahoo / cached scanData candles
//   • a closed market never updates the RS ranking (frozen snapshot)
//   • an open-market DXLink tick updates a symbol's price + RS
//   • a SPY tick updates RS for all rows
//   • a stale SPY invalidates RS for every row
//   • a stale individual symbol invalidates only that row
//   • half-day early closes are respected
//   • provider failure → unavailable/stale, never a Yahoo fallback
//
// Run: node tests/rs-vs-spy.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level `function NAME(...) {...}` by brace-matching. Skips braces
// inside strings, template literals, regex and comments so nested bodies are safe.
function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}

const FNS = [
  'smA', 'calcRSIWilder', 'getUsEquityMarketSession',
  '_rsNow', '_rsSession', '_rsMarketState', '_rsApprovedDaily',
  '_rsPriceMetaFrom', '_rsPriceMeta', '_rsExcessReturns', '_rsComputeAll',
  '_rsAvgVol', '_rsQualityCheck', '_rsAtrStateFrom', '_rsLastNonNull',
  '_rsBuildDiag', 'computeRsCandidates', '_rsGetDailyCandles',
  '_cSym', '_cSubEntry', '_rsLive1DSymbols', '_rsEnsure1DSub',
  '_rsEnsureUniverseSubs', '_rsRestoreLiveSubscriptions',
  '_rsSpyInvalidReason', '_rsSpyDiagReason', '_rsVsSpyLabel',
  // Persistent UI flags (local-only) — RS vs SPY scanner list.
  '_rsFlagStorageKey', '_rsNormSym', '_rsLoadFlaggedSymbols',
  '_rsSaveFlaggedSymbols', '_rsIsFlaggedSymbol', '_rsToggleFlaggedSymbol',
  '_rsGetFlagFilter', '_rsApplyFlagFilter', '_rsApplySort', '_rsSortBy',
  '_rsPanelScrollEl', '_rsCapturePanelScroll', '_rsRestorePanelScroll', '_rsOnFlagClick',
];

// ── Sandbox ──────────────────────────────────────────────────────────────────
const sandbox = {
  console, Intl, Date, Math, JSON, Number, isFinite, parseFloat, parseInt,
  RS_STALE_MS: 15000,
  RS_DEBUG: false,
  _rsSessionOverride: null,
  _rsNowOverride: null,
  _rsLastResult: null,
  _rsFrozen: null,
  _candleBuffer: {},
  _candleLastTickAt: {},
  // Candle-stream subscription pipeline state (mirrors index.html globals).
  _CANDLE_TF: { '1D': { period: '1d', lookbackMs: 0 }, '5M': { period: '5m', lookbackMs: 0 } },
  _candleWsState: 'READY',
  _candleWs: null,
  _candleQueue: [],
  _candleSubscribed: new Set(),
  _initCandleStreamCalls: 0,
  _initCandleStream: function () { sandbox._initCandleStreamCalls++; },
  // Subscription-diagnostics recorder — a fire-and-forget side-channel the RS
  // subscription helpers call for telemetry; stubbed no-op here since it is
  // outside the behavior under test (covered by candle-subscription-diagnostics.test.js).
  _recordCandleSubscriptionRequest: function () {},
  S: null,
  // Approved IVR source (Tastytrade) — never Yahoo.
  getCanonicalIvr: function () { return { source: 'TASTYTRADE', ivr: 50 }; },
  // Flag-state globals + a minimal in-memory localStorage for flag persistence.
  RS_FLAG_LS_KEY: 'apex_rs_spy_flagged_symbols',
  _rsFlagFilter: 'all',
  localStorage: (function () {
    let store = {};
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      _reset: () => { store = {}; },
      _setRaw: (k, v) => { store[k] = v; },
    };
  })(),
  // Minimal DOM + rAF mocks mirroring the real structure: the RS list scrolls
  // inside an inner .dss-tbl-scroll element (recreated on every innerHTML
  // rebuild); the outer .panel wrapper is the parentElement fallback.
  document: (function () {
    const outerPanel = { scrollTop: 0 };                  // .panel (fallback)
    const panelContent = {
      parentElement: outerPanel,
      innerHTML: '',
      _inner: { scrollTop: 0 },                           // .dss-tbl-scroll
      querySelector: function (sel) {
        return sel === '.dss-tbl-scroll' ? this._inner : null;
      },
    };
    return {
      _outerPanel: outerPanel,
      _panelContent: panelContent,
      // Simulate the innerHTML rebuild: a fresh .dss-tbl-scroll (scrollTop 0).
      _rebuildList: () => { panelContent._inner = { scrollTop: 0 }; },
      // Toggle whether a list scroller exists (empty/frozen/invalid branches).
      _setListPresent: (present) => { panelContent._inner = present ? { scrollTop: 0 } : null; },
      getElementById: (id) => (id === 'panelContent' ? panelContent : null),
    };
  })(),
  // Synchronous rAF so the restore runs within the test (no real timers).
  requestAnimationFrame: (cb) => { cb(); return 1; },
  _renderRsScannerCalls: [],
  // Mirrors renderRsScanner's real _setPanel contract: a re-render replaces
  // innerHTML (recreating .dss-tbl-scroll with scrollTop 0), and when
  // preserveScroll is on (keepScroll||keepDetail) it captures before and
  // restores after via the real _rsCapturePanelScroll/_rsRestorePanelScroll
  // helpers extracted from index.html. requestAnimationFrame is synchronous here.
  renderRsScanner: function (opts) {
    opts = opts || {};
    sandbox._renderRsScannerCalls.push(opts);
    const preserve = !!(opts.keepScroll || opts.keepDetail);
    const saved = preserve ? sandbox._rsCapturePanelScroll() : null;
    sandbox.document._rebuildList(); // innerHTML rebuild → new scroller at top
    if (preserve) sandbox._rsRestorePanelScroll(saved);
  },
  renderRsCharts: function () {},
};
vm.createContext(sandbox);
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── Test harness ───────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── Fixtures ───────────────────────────────────────────────────────────────
const T = Date.UTC(2024, 5, 12, 16, 0); // fixed "now" (regular hours, weekday)
const OPEN = { isRegularSession: true, reason: 'regular session', isHoliday: false, isEarlyClose: false };
const CLOSED = { isRegularSession: false, reason: 'weekend', isHoliday: false, isEarlyClose: false };

// Build a 40-bar daily series with upward drift + alternating pullback so RSI
// lands inside the STRONG band (45..82) and SMA20 > SMA30.
function series(base, up, dn) {
  const out = [];
  let c = base;
  for (let i = 0; i < 40; i++) {
    c += (i % 2 === 0) ? up : -dn;
    out.push({ o: c, h: c + 0.05, l: c - 0.05, c: c, v: 1e6, t: T - (40 - i) * 86400000 });
  }
  return out;
}

function resetState() {
  sandbox._rsSessionOverride = OPEN;
  sandbox._rsNowOverride = T;
  sandbox._rsLastResult = null;
  sandbox._rsFrozen = null;
  sandbox._candleBuffer = {
    SPY: { '1D': series(400, 0.40, 0.16) },   // mild uptrend benchmark
    AAA: { '1D': series(100, 1.00, 0.40) },   // strong outperformer
    BBB: { '1D': series(50, 0.80, 0.32) },    // also outperforms SPY
  };
  sandbox._candleLastTickAt = { 'SPY:1D': T, 'AAA:1D': T, 'BBB:1D': T };
  sandbox._candleWsState = 'READY';
  sandbox._candleQueue = [];
  sandbox._candleSubscribed = new Set(['SPY:1D', 'AAA:1D', 'BBB:1D']);
  sandbox._candleWs = { sent: [], send: function (s) { this.sent.push(JSON.parse(s)); } };
  sandbox._initCandleStreamCalls = 0;
  sandbox.S = {
    ttConnected: true,
    rsScanner: { mode: 'STRONG', tf: '20D', sortCol: null, sortDir: 'desc', requireAdx5: false },
    rsScannerFilters: { minVol: 0, minPrice: 0, minIvr: 0, sma20: 'any', rsi: 'any' },
    scanData: [{ ticker: 'SPY' }, { ticker: 'AAA', name: 'A Co' }, { ticker: 'BBB', name: 'B Co' }],
    rsLiveDiag: null,
  };
}
const compute = () => sandbox.computeRsCandidates();
const result = () => sandbox._rsLastResult;

// ── 0. sanity: a clean open-market pass produces ranked DXLink rows ──────────
section('0. baseline open-market pass');
resetState();
let ranked = compute();
ok(ranked.length >= 2, 'ranks the outperformers (got ' + ranked.length + ')');
ok(ranked.every((r) => r.source === 'DXLink'), 'every ranked row source = DXLink');
ok(ranked.every((r) => r.priceTimestamp != null && r.priceAgeMs != null && r.marketState === 'REGULAR'),
   'every row carries source/timestamp/ageMs/marketState');
ok(result().spy && result().spy.source === 'DXLink' && result().spy.valid,
   'SPY price meta is DXLink + valid');

// ── 1. no Yahoo path reachable by RS ─────────────────────────────────────────
// Strip comments first: explanatory "// no Yahoo" notes are allowed; what must
// never appear is an actual Yahoo/cached-candle data access in executable code.
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}
section('1. no Yahoo / cached-candle path in RS source');
['computeRsCandidates', '_rsApprovedDaily', '_rsGetDailyCandles', '_rsExcessReturns', '_rsComputeAll', '_rsQualityCheck']
  .forEach((n) => {
    const body = stripComments(extractFn(HTML, n));
    ok(!/yahoo/i.test(body), n + ' executable code contains no "yahoo"');
    ok(!/\bd\.candles\b/.test(body) && !/\.scanData[^;]*\.candles/.test(body),
       n + ' never reads scanData/Yahoo candles');
  });
ok(/_candleBuffer/.test(extractFn(HTML, '_rsApprovedDaily')), '_rsApprovedDaily reads only the DXLink buffer');
ok(JSON.stringify(result()).toLowerCase().indexOf('yahoo') === -1, 'computed result mentions no Yahoo source');

// ── 2. closed market freezes ranking (no after-hours/closed recompute) ───────
section('2. closed market freezes ranking');
resetState();
const openRanked = compute().map((r) => r.ticker);
sandbox._rsSessionOverride = CLOSED;
// Mutate the buffer so a recompute *would* change order — it must NOT.
sandbox._candleBuffer.BBB['1D'] = series(50, 5.0, 0.1);
const closedRanked = compute();
ok(result().frozen === true, 'closed pass is marked frozen');
ok(result().marketState !== 'REGULAR', 'marketState reflects closed (' + result().marketState + ')');
ok(JSON.stringify(closedRanked.map((r) => r.ticker)) === JSON.stringify(openRanked),
   'ranking unchanged while closed (no live/AH update)');

// ── 3. open-market DXLink tick updates a symbol's price + RS ─────────────────
section('3. open tick updates symbol price + RS');
resetState();
let r0 = compute().find((r) => r.ticker === 'AAA');
const price0 = r0.price, rs0 = r0.rs20;
// Simulate a DXLink tick: forming bar close jumps up + fresh tick time.
const aBuf = sandbox._candleBuffer.AAA['1D'];
aBuf[aBuf.length - 1] = { o: price0, h: price0 + 3, l: price0, c: price0 + 3, v: 1e6, t: aBuf[aBuf.length - 1].t };
sandbox._candleLastTickAt['AAA:1D'] = T;
let r1 = compute().find((r) => r.ticker === 'AAA');
ok(r1.price > price0, 'symbol price rose after tick (' + price0.toFixed(2) + ' → ' + r1.price.toFixed(2) + ')');
ok(r1.rs20 !== rs0, 'symbol RS recomputed after its own tick');

// ── 4. SPY tick recomputes RS for all rows ───────────────────────────────────
section('4. SPY tick recomputes all rows');
resetState();
const before = {}; compute().forEach((r) => { before[r.ticker] = r.rs20; });
const sBuf = sandbox._candleBuffer.SPY['1D'];
const sLast = sBuf[sBuf.length - 1];
// SPY ticks DOWN — every symbol's excess return vs SPY must rise.
sBuf[sBuf.length - 1] = { o: sLast.c, h: sLast.c, l: sLast.c - 5, c: sLast.c - 5, v: 1e6, t: sLast.t };
const after = {}; compute().forEach((r) => { after[r.ticker] = r.rs20; });
ok(Object.keys(before).length >= 2, 'multiple rows present');
const common = Object.keys(before).filter((t) => after[t] != null);
ok(common.length === Object.keys(before).length, 'all rows still ranked after SPY tick');
ok(common.every((t) => after[t] !== before[t]), 'RS changed for every row after SPY tick');
ok(common.every((t) => after[t] > before[t]), 'RS rose for all rows (SPY underperformed)');

// ── 5. stale SPY invalidates RS for all rows ─────────────────────────────────
section('5. stale SPY invalidates all rows');
resetState();
sandbox._candleLastTickAt['SPY:1D'] = T - 20000; // 20s old > RS_STALE_MS
const r5 = compute();
ok(result().spyInvalid === true, 'result flagged spyInvalid');
ok(r5.length === 0, 'no rows ranked when SPY is stale');
ok(result().spy.reason === 'STALE', 'SPY meta reason = STALE');

// ── 6. stale individual symbol invalidates only that row ─────────────────────
section('6. stale single symbol → only that row excluded');
resetState();
sandbox._candleLastTickAt['AAA:1D'] = T - 20000; // AAA stale, SPY + BBB fresh
const r6 = compute();
ok(r6.some((r) => r.ticker === 'BBB'), 'fresh BBB still ranked');
ok(!r6.some((r) => r.ticker === 'AAA'), 'stale AAA excluded from ranking');
ok((result().stale || []).some((r) => r.ticker === 'AAA' && r.rsReason === 'STALE'),
   'AAA appears in stale list with reason STALE');

// ── 7. half-day early close is respected ─────────────────────────────────────
section('7. half-day (early close) respected');
sandbox._rsSessionOverride = null; // use the real session helper
// 2024-07-03 (Wed) is a NYSE early close (1:00pm ET). EDT = UTC-4.
const half2pm = sandbox.getUsEquityMarketSession(Date.UTC(2024, 6, 3, 18, 0)); // 14:00 ET
const half11am = sandbox.getUsEquityMarketSession(Date.UTC(2024, 6, 3, 15, 0)); // 11:00 ET
ok(half2pm.isEarlyClose === true, 'July 3 detected as early close');
ok(half2pm.isRegularSession === false, '14:00 ET on half-day is CLOSED');
ok(half11am.isRegularSession === true, '11:00 ET on half-day is OPEN');
ok(sandbox._rsMarketState(half2pm) === 'CLOSED_EARLY', 'marketState = CLOSED_EARLY after early close');
const sat = sandbox.getUsEquityMarketSession(Date.UTC(2024, 5, 15, 16, 0)); // Saturday
ok(sandbox._rsMarketState(sat) === 'CLOSED_WEEKEND', 'weekend → CLOSED_WEEKEND');

// ── 8. provider failure → unavailable/stale, never Yahoo ─────────────────────
section('8. provider failure never falls back to Yahoo');
resetState();
sandbox._rsSessionOverride = OPEN;
delete sandbox._candleBuffer.SPY;  // DXLink SPY data unavailable
delete sandbox._candleBuffer.AAA;
const r8 = compute();
ok(r8.length === 0, 'no rows when approved DXLink data is unavailable');
ok(result().spy.reason === 'NO_APPROVED_DATA' && result().spyInvalid,
   'SPY unavailable → NO_APPROVED_DATA (not Yahoo)');
ok(JSON.stringify(result()).toLowerCase().indexOf('yahoo') === -1, 'failure result mentions no Yahoo');

// ── 9. reconnect-safe subscription restore (DXLink 1D only) ──────────────────
section('9. reconnect restore re-subscribes SPY 1D + universe 1D');
// Helper: pull the symbols added across all FEED_SUBSCRIPTION messages sent.
function addedSymbols() {
  const out = [];
  sandbox._candleWs.sent.forEach((m) => {
    if (m && m.type === 'FEED_SUBSCRIPTION' && Array.isArray(m.add)) {
      m.add.forEach((e) => out.push(e.symbol));
    }
  });
  return out;
}
resetState();
const spy1d = sandbox._cSym('SPY', '1D');
const aaa1d = sandbox._cSym('AAA', '1D');
const bbb1d = sandbox._cSym('BBB', '1D');
// Simulate a reconnect: dedupe set still holds stale keys, but the NEW socket has
// no live subscriptions. _rsEnsure1DSub alone would early-return → permanent STALE.
sandbox._rsRestoreLiveSubscriptions('candle_reconnect_ready');
let added = addedSymbols();
ok(added.indexOf(spy1d) >= 0, 'restore re-subscribes SPY 1D');
ok(added.indexOf(aaa1d) >= 0 && added.indexOf(bbb1d) >= 0, 'restore re-subscribes active RS universe 1D');
ok(sandbox._candleWs.sent.every((m) => /Candle/.test(JSON.stringify(m)) && !/yahoo/i.test(JSON.stringify(m))),
   'restore sends only DXLink Candle subscriptions (no Yahoo)');

// Dedupe within and across calls: no batch ever lists the same symbol twice.
sandbox._rsRestoreLiveSubscriptions('again');
const dupFree = sandbox._candleWs.sent.every((m) => {
  if (!m.add) return true;
  const syms = m.add.map((e) => e.symbol);
  return syms.length === new Set(syms).size;
});
ok(dupFree, 'each restore batch is deduped (no duplicate symbols)');

// Universe-change safety: a new ticker is picked up; SPY always present.
resetState();
sandbox.S.scanData = [{ ticker: 'AAA' }, { ticker: 'CCC' }];
const syms2 = sandbox._rsLive1DSymbols();
ok(syms2[0] === 'SPY', '_rsLive1DSymbols always includes SPY first');
ok(syms2.indexOf('CCC') >= 0 && syms2.indexOf('AAA') >= 0, 'universe symbols included after change');
ok(syms2.length === new Set(syms2).size, '_rsLive1DSymbols is deduped');

// Non-READY fallback: a queued SPY entry for a DIFFERENT timeframe must NOT
// suppress the required SPY 1D queue entry (dedupe by full identity, not symbol).
resetState();
sandbox._candleWsState = 'CONNECTING';
sandbox._candleQueue = [sandbox._cSubEntry('SPY', '5M')];
sandbox._rsRestoreLiveSubscriptions('reconnect_while_connecting');
ok(sandbox._candleQueue.some((q) => q.symbol === spy1d),
   'SPY 1D queued even when SPY 5M already queued (full-identity dedupe)');
ok(sandbox._candleQueue.filter((q) => q.symbol === spy1d).length === 1,
   'SPY 1D queued exactly once (still deduped within identity)');

// READY handler wiring: restore is invoked on reconnect when RS is active.
const readyIx = HTML.indexOf("READY; flushing");
const readyBlock = HTML.slice(readyIx, HTML.indexOf("FEED_DATA", readyIx));
ok(/_rsActive/.test(readyBlock) && /_rsRestoreLiveSubscriptions\('candle_reconnect_ready'\)/.test(readyBlock),
   'candle stream READY handler calls _rsRestoreLiveSubscriptions when _rsActive');

// ── 10. specific SPY-staleness diagnostics ───────────────────────────────────
section('10. SPY invalid reason is specific');
const approvedOk = { closes: new Array(25).fill(1), lastTickAt: T };
ok(sandbox._rsSpyInvalidReason(false, true, approvedOk, T) === 'CANDLE_WS_NOT_READY',
   'CANDLE_WS_NOT_READY when feed not ready');
ok(sandbox._rsSpyInvalidReason(true, false, approvedOk, T) === 'SPY_1D_NOT_SUBSCRIBED',
   'SPY_1D_NOT_SUBSCRIBED when SPY 1D missing from registry');
ok(sandbox._rsSpyInvalidReason(true, true, null, T) === 'SPY_NO_APPROVED_DATA',
   'SPY_NO_APPROVED_DATA when buffer missing');
ok(sandbox._rsSpyInvalidReason(true, true, { closes: new Array(5).fill(1), lastTickAt: T }, T) === 'SPY_NO_APPROVED_DATA',
   'SPY_NO_APPROVED_DATA when buffer too short');
ok(sandbox._rsSpyInvalidReason(true, true, { closes: new Array(25).fill(1), lastTickAt: null }, T) === 'SPY_NO_TICK_TIME',
   'SPY_NO_TICK_TIME when last tick timestamp missing');
ok(sandbox._rsSpyInvalidReason(true, true, { closes: new Array(25).fill(1), lastTickAt: T - 20000 }, T) === 'SPY_STALE_TICK',
   'SPY_STALE_TICK when age exceeds RS_STALE_MS');
ok(sandbox._rsSpyInvalidReason(true, true, approvedOk, T) === null,
   'no reason when SPY 1D is fresh and valid');

// Live wrapper + diag surface the reason. Stale SPY tick → SPY_STALE_TICK.
resetState();
sandbox._candleLastTickAt['SPY:1D'] = T - 20000;
compute();
ok(result().spyInvalid && result().spyInvalidReason === 'SPY_STALE_TICK',
   'computeRsCandidates surfaces spyInvalidReason = SPY_STALE_TICK');
ok(sandbox.S.rsLiveDiag.spyInvalidReason === 'SPY_STALE_TICK', 'S.rsLiveDiag exposes spyInvalidReason');
// WS down → CANDLE_WS_NOT_READY takes precedence.
resetState();
sandbox._candleWsState = 'CLOSED';
sandbox._candleLastTickAt['SPY:1D'] = T - 20000;
compute();
ok(result().spyInvalidReason === 'CANDLE_WS_NOT_READY', 'WS not ready → CANDLE_WS_NOT_READY in diag');
// SPY 1D not in registry → SPY_1D_NOT_SUBSCRIBED.
resetState();
sandbox._candleSubscribed = new Set(['AAA:1D', 'BBB:1D']);
sandbox._candleLastTickAt['SPY:1D'] = T - 20000;
compute();
ok(result().spyInvalidReason === 'SPY_1D_NOT_SUBSCRIBED', 'missing SPY 1D sub → SPY_1D_NOT_SUBSCRIBED');

// No Yahoo/scanData/Railway leaked into any new code path.
['_rsRestoreLiveSubscriptions', '_rsEnsureUniverseSubs', '_rsEnsure1DSub', '_rsLive1DSymbols', '_rsSpyInvalidReason', '_rsSpyDiagReason']
  .forEach((n) => {
    const body = stripComments(extractFn(HTML, n));
    ok(!/yahoo/i.test(body) && !/\.candles\b/.test(body) && !/\/market\//.test(body),
       n + ' contains no Yahoo/Railway/scanData-candle fallback');
  });

// ── 11. RS vs SPY overlay label helper ───────────────────────────────────────
section('11. _rsVsSpyLabel chart-overlay formatting');
ok(sandbox._rsVsSpyLabel(3.6)    === 'RS vs SPY: +3.6%',  'positive RS formats with +');
ok(sandbox._rsVsSpyLabel(-11.5)  === 'RS vs SPY: -11.5%', 'negative RS formats with -');
ok(sandbox._rsVsSpyLabel(0)      === 'RS vs SPY: +0.0%',  'zero RS formats with +');
ok(sandbox._rsVsSpyLabel(null)   === 'RS vs SPY: N/A',    'null RS → N/A');
ok(sandbox._rsVsSpyLabel(undefined) === 'RS vs SPY: N/A', 'undefined RS → N/A');
ok(sandbox._rsVsSpyLabel(NaN)    === 'RS vs SPY: N/A',    'NaN RS → N/A');
ok(sandbox._rsVsSpyLabel(-11.52) === 'RS vs SPY: -11.5%', 'one-decimal rounding matches lower RS panel');
// The overlay helper introduces no Yahoo/Railway/scanData candle fallback.
(function () {
  const body = stripComments(extractFn(HTML, '_rsVsSpyLabel'));
  ok(!/yahoo/i.test(body) && !/\.candles\b/.test(body) && !/\/market\//.test(body) && !/fetchCandles/.test(body),
     '_rsVsSpyLabel contains no Yahoo/Railway/scanData candle fallback');
})();

// ── 12. persistent UI flags + flag filter (local-only) ───────────────────────
section('12. persistent UI flags + flagged filter');
const LS = sandbox.localStorage;

// storage key is APEX-namespaced + specific.
ok(sandbox._rsFlagStorageKey() === 'apex_rs_spy_flagged_symbols', 'flag storage key is apex_rs_spy_flagged_symbols');

// empty storage → empty list (no throw).
LS._reset();
ok(Array.isArray(sandbox._rsLoadFlaggedSymbols()) && sandbox._rsLoadFlaggedSymbols().length === 0,
   'empty localStorage → empty flag list');

// corrupt storage → safe fallback to empty.
LS._setRaw('apex_rs_spy_flagged_symbols', '{not json');
ok(sandbox._rsLoadFlaggedSymbols().length === 0, 'corrupt JSON → empty list (no throw)');
LS._setRaw('apex_rs_spy_flagged_symbols', '42');
ok(sandbox._rsLoadFlaggedSymbols().length === 0, 'non-array/object JSON → empty list');

// toggle adds, normalizes uppercase, persists.
LS._reset();
ok(sandbox._rsToggleFlaggedSymbol('uvxy') === true, 'toggle returns true when flagging');
ok(sandbox._rsIsFlaggedSymbol('UVXY') === true, 'symbol flagged after toggle');
ok(sandbox._rsIsFlaggedSymbol('uvxy') === true, 'isFlagged is case-insensitive');
ok(sandbox._rsLoadFlaggedSymbols()[0] === 'UVXY', 'stored ticker normalized to uppercase');

// toggle again removes.
ok(sandbox._rsToggleFlaggedSymbol('UVXY') === false, 'toggle returns false when unflagging');
ok(sandbox._rsIsFlaggedSymbol('UVXY') === false, 'symbol unflagged after second toggle');

// no duplicates even from a dirty array / mixed case input.
LS._reset();
sandbox._rsSaveFlaggedSymbols(['hca', 'HCA', ' de ', 'DE', '']);
const saved = sandbox._rsLoadFlaggedSymbols();
ok(saved.length === 2 && saved.indexOf('HCA') >= 0 && saved.indexOf('DE') >= 0,
   'save dedupes + normalizes + drops blanks (' + JSON.stringify(saved) + ')');

// mapping form {SYM:true} is also accepted on load.
LS._setRaw('apex_rs_spy_flagged_symbols', JSON.stringify({ AAA: true, BBB: false }));
const mapLoad = sandbox._rsLoadFlaggedSymbols();
ok(mapLoad.length === 1 && mapLoad[0] === 'AAA', 'map form loads only truthy keys');

// filter: ALL shows everything; FLAGGED shows only flagged; UNFLAGGED inverse.
const cands = [{ ticker: 'AAA' }, { ticker: 'BBB' }, { ticker: 'CCC' }];
LS._reset();
sandbox._rsSaveFlaggedSymbols(['BBB']);
sandbox._rsFlagFilter = 'all';
ok(sandbox._rsApplyFlagFilter(cands).length === 3, 'ALL filter shows every candidate');
sandbox._rsFlagFilter = 'flagged';
let fl = sandbox._rsApplyFlagFilter(cands);
ok(fl.length === 1 && fl[0].ticker === 'BBB', 'FLAGGED filter shows only flagged symbol');
sandbox._rsFlagFilter = 'unflagged';
let unfl = sandbox._rsApplyFlagFilter(cands).map((c) => c.ticker);
ok(unfl.length === 2 && unfl.indexOf('AAA') >= 0 && unfl.indexOf('CCC') >= 0, 'UNFLAGGED filter shows only unflagged');
sandbox._rsFlagFilter = 'all'; // restore default for any later code

// filter never mutates the source list.
ok(cands.length === 3, '_rsApplyFlagFilter does not mutate input list');

// filter preserves the existing RS sort order, never the flag-storage order.
const ordered = [{ ticker: 'AAA' }, { ticker: 'BBB' }, { ticker: 'CCC' }, { ticker: 'DDD' }];
LS._reset();
sandbox._rsSaveFlaggedSymbols(['CCC', 'AAA']); // stored in a different order on purpose
sandbox._rsFlagFilter = 'flagged';
const flOrder = sandbox._rsApplyFlagFilter(ordered).map((c) => c.ticker);
ok(flOrder.join(',') === 'AAA,CCC', 'FLAGGED keeps scanner order (AAA,CCC) not flag-storage order');
sandbox._rsFlagFilter = 'unflagged';
const unflOrder = sandbox._rsApplyFlagFilter(ordered).map((c) => c.ticker);
ok(unflOrder.join(',') === 'BBB,DDD', 'UNFLAGGED keeps scanner order (BBB,DDD)');
sandbox._rsFlagFilter = 'all';
const allOrder = sandbox._rsApplyFlagFilter(ordered).map((c) => c.ticker);
ok(allOrder.join(',') === 'AAA,BBB,CCC,DDD', 'ALL keeps full scanner order unchanged');

// ── 12c. sort by SYM (ticker) column ─────────────────────────────────────────
section('12c. _rsApplySort sorts by ticker symbol asc/desc');
sandbox.S = sandbox.S || {};
sandbox.S.rsScanner = { sortCol: 'ticker', sortDir: 'asc' };
const symInput = [{ ticker: 'DE' }, { ticker: 'AAPL' }, { ticker: 'HCA' }, { ticker: 'UVXY' }];
const ascSorted = sandbox._rsApplySort(symInput).map((c) => c.ticker);
ok(ascSorted.join(',') === 'AAPL,DE,HCA,UVXY', 'SYM ascending sorts A→Z');
ok(symInput.map((c) => c.ticker).join(',') === 'DE,AAPL,HCA,UVXY', '_rsApplySort does not mutate input order');
sandbox.S.rsScanner.sortDir = 'desc';
const descSorted = sandbox._rsApplySort(symInput).map((c) => c.ticker);
ok(descSorted.join(',') === 'UVXY,HCA,DE,AAPL', 'SYM descending sorts Z→A');

// symbol sort composes with the view-only flag filter without altering it:
// filter first (view), then sort the visible subset by ticker.
LS._reset();
sandbox._rsSaveFlaggedSymbols(['UVXY', 'DE']);
sandbox._rsFlagFilter = 'flagged';
sandbox.S.rsScanner = { sortCol: 'ticker', sortDir: 'asc' };
const flaggedThenSorted = sandbox._rsApplySort(sandbox._rsApplyFlagFilter(symInput)).map((c) => c.ticker);
ok(flaggedThenSorted.join(',') === 'DE,UVXY', 'FLAGGED + SYM sort: only flagged rows, A→Z');
sandbox._rsFlagFilter = 'unflagged';
const unflaggedThenSorted = sandbox._rsApplySort(sandbox._rsApplyFlagFilter(symInput)).map((c) => c.ticker);
ok(unflaggedThenSorted.join(',') === 'AAPL,HCA', 'UNFLAGGED + SYM sort: only unflagged rows, A→Z');
sandbox._rsFlagFilter = 'all';
sandbox.S.rsScanner = { mode: 'STRONG', tf: '20D', sortCol: null, sortDir: 'desc', requireAdx5: false };

// _rsSortBy: first SYM click → A→Z (asc), second click toggles to Z→A (desc);
// numeric columns still default to desc; toggle stays consistent.
sandbox._rsSortBy('ticker');
ok(sandbox.S.rsScanner.sortCol === 'ticker' && sandbox.S.rsScanner.sortDir === 'asc',
   'first SYM click sorts ascending (A→Z)');
sandbox._rsSortBy('ticker');
ok(sandbox.S.rsScanner.sortDir === 'desc', 'second SYM click toggles to descending (Z→A)');
sandbox._rsSortBy('rs');
ok(sandbox.S.rsScanner.sortCol === 'rs' && sandbox.S.rsScanner.sortDir === 'desc',
   'numeric column still defaults to descending');
sandbox.S.rsScanner = { mode: 'STRONG', tf: '20D', sortCol: null, sortDir: 'desc', requireAdx5: false };

// ── 12b. scroll preservation across re-renders ───────────────────────────────
section('12b. RS scanner scroll position survives live/passive re-renders');

// helpers target the inner .dss-tbl-scroll list scroller when present.
sandbox.document._setListPresent(true);
sandbox.document._panelContent._inner.scrollTop = 555;
ok(sandbox._rsPanelScrollEl() === sandbox.document._panelContent._inner,
   '_rsPanelScrollEl targets inner .dss-tbl-scroll when present');
ok(sandbox._rsCapturePanelScroll() === 555, '_rsCapturePanelScroll reads inner list scrollTop');
sandbox.document._panelContent._inner.scrollTop = 0;
sandbox._rsRestorePanelScroll(555);
ok(sandbox.document._panelContent._inner.scrollTop === 555, '_rsRestorePanelScroll restores inner list scrollTop (rAF)');

// fallback: when no list table exists, scroll helpers use the outer .panel.
sandbox.document._setListPresent(false);
ok(sandbox._rsPanelScrollEl() === sandbox.document._outerPanel, '_rsPanelScrollEl falls back to .panel when no list table');
sandbox.document._outerPanel.scrollTop = 120;
ok(sandbox._rsCapturePanelScroll() === 120, 'capture reads .panel fallback when no list table');
sandbox.document._setListPresent(true); // restore list scroller for remaining tests

// passive live re-render ({keepScroll:true}) must NOT jump to top.
sandbox.document._panelContent._inner.scrollTop = 900;
sandbox.renderRsScanner({ keepScroll: true });
ok(sandbox.document._panelContent._inner.scrollTop === 900, 'live re-render with keepScroll preserves inner list scroll');

// a plain manual re-render (no opts) is allowed to reset to top.
sandbox.document._panelContent._inner.scrollTop = 900;
sandbox.renderRsScanner();
ok(sandbox.document._panelContent._inner.scrollTop === 0, 'manual re-render (no opts) resets scroll — current behaviour');

// flag toggle: keepDetail re-render preserves inner list scroll + no jump to top.
LS._reset();
sandbox._renderRsScannerCalls = [];
sandbox.document._panelContent._inner.scrollTop = 742; // user scrolled down
sandbox.S = { rsChartState: null };
let stopped = false, prevented = false;
sandbox._rsOnFlagClick(
  { stopPropagation: () => { stopped = true; }, preventDefault: () => { prevented = true; } },
  'uvxy'
);
ok(stopped && prevented, 'flag click stops propagation + prevents default (no row select)');
ok(sandbox._renderRsScannerCalls.length === 1 && sandbox._renderRsScannerCalls[0].keepDetail === true,
   'renderRsScanner called once with keepDetail:true');
ok(sandbox.document._panelContent._inner.scrollTop === 742, 'inner list scrollTop restored after flag re-render (no jump to top)');
ok(sandbox._rsIsFlaggedSymbol('UVXY') === true, 'symbol flagged (uppercase normalized) after click');

// ── 13. anti-regression: flag helpers are pure local UI/state ────────────────
section('13. flag helpers contain no data-source code');
['_rsFlagStorageKey', '_rsNormSym', '_rsLoadFlaggedSymbols', '_rsSaveFlaggedSymbols',
 '_rsIsFlaggedSymbol', '_rsToggleFlaggedSymbol', '_rsGetFlagFilter', '_rsApplyFlagFilter',
 '_rsSetFlagFilter', '_rsOnFlagClick',
 '_rsPanelScrollEl', '_rsCapturePanelScroll', '_rsRestorePanelScroll']
  .forEach((n) => {
    const body = stripComments(extractFn(HTML, n));
    ok(!/yahoo/i.test(body), n + ' contains no "yahoo"');
    ok(!/\bfetch\b/.test(body), n + ' makes no fetch call');
    ok(!/\/market\//.test(body), n + ' has no /market/ data access');
    ok(!/\.candles\b/.test(body) && !/scanData/.test(body), n + ' never reads scanData/candles');
    ok(!/computeRsCandidates/.test(body), n + ' does not invoke computeRsCandidates');
    ok(!/DXLink|_candleBuffer|_candleWs/.test(body), n + ' touches no DXLink/candle pipeline');
  });

// ── 14. 1D/4H last-price parity (PR #207 extension) ──────────────────────────
// Opening an RS chart must end the 1D and 4H charts on the SAME latest APEX price
// resolved once for the render cycle. renderRsCharts resolves via
// resolveLatestDisplayPrice and threads that price into both _rsDrawTf calls and
// the late 4H poll; _rsDrawTf patches the final candle BEFORE computing indicators
// so SMA/RSI/RS/squeeze derive from the patched close. Full runtime proof lives in
// tests/scanner-chart-live-patch.test.js — these assert the wiring within RS scope.
section('14. RS charts patch one render-scoped price into both timeframes (1D/4H parity)');
{
  const render = stripComments(extractFn(HTML, 'renderRsCharts'));
  const drawTf = stripComments(extractFn(HTML, '_rsDrawTf'));
  const poll   = stripComments(extractFn(HTML, '_rs4hStartPoll'));

  ok((render.match(/resolveLatestDisplayPrice\(\s*symbol\s*\)/g) || []).length === 1,
     '14: renderRsCharts resolves the price exactly once');
  ok((render.match(/_rsDrawTf\([^;]*_rsLive\.price/g) || []).length >= 2,
     '14: renderRsCharts threads _rsLive.price into BOTH timeframe draws');
  // PR #218 follow-up: renderRsCharts loads 4H from the backend candle cache and must
  // NEVER start the frontend 30M poll (which fed the reason=rs_chart CANDLE-STREAM storm).
  ok(!/_rs4hStartPoll\(/.test(render),
     '14: renderRsCharts does NOT start the frontend 4H poll (backend-only; reason=rs_chart removed)');

  const patch = drawTf.indexOf('patchLastCandleWithLivePrice(candles');
  const ind   = drawTf.indexOf('computeCandleIndicators(candles)');
  const draw  = drawTf.indexOf('_drawCandleChart(');
  ok(patch >= 0 && ind >= 0 && patch < ind,
     '14: _rsDrawTf patches the final candle BEFORE computeCandleIndicators');
  ok(patch >= 0 && draw >= 0 && patch < draw,
     '14: _rsDrawTf patches BEFORE _drawCandleChart (no unpatched first draw)');
  ok(!/_patchLivePrice\(\s*candles\b/.test(drawTf),
     '14: _rsDrawTf no longer re-resolves per-timeframe via _patchLivePrice');

  ok(/function _rs4hStartPoll\(\s*symbol\s*,\s*resolvedPrice\s*\)/.test(poll),
     '14: _rs4hStartPoll accepts the render-scoped resolvedPrice');
  ok(/_rsDrawTf\('4H'[^;]*pollPrice\)/.test(poll),
     '14: _rs4hStartPoll hands the captured pollPrice to _rsDrawTf(\'4H\', …)');
  ok(!/resolveLatestDisplayPrice\s*\(/.test(poll),
     '14: _rs4hStartPoll does NOT re-resolve (cannot drift from the 1D render price)');
}

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
