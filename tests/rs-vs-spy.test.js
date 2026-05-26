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
];

// ── Sandbox ──────────────────────────────────────────────────────────────────
const sandbox = {
  console, Intl, Date, Math, JSON, isFinite, parseFloat, parseInt,
  RS_STALE_MS: 15000,
  RS_DEBUG: false,
  _rsSessionOverride: null,
  _rsNowOverride: null,
  _rsLastResult: null,
  _rsFrozen: null,
  _candleBuffer: {},
  _candleLastTickAt: {},
  S: null,
  // Approved IVR source (Tastytrade) — never Yahoo.
  getCanonicalIvr: function () { return { source: 'TASTYTRADE', ivr: 50 }; },
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
  sandbox.S = {
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

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
