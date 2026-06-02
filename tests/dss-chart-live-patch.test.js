'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Directional Scanner inline chart — 1D / 4H live-price parity.
//
// Background: opening a Directional Scanner symbol detail renders a 1D and a 4H
// chart. The two charts must always end on the SAME latest live/current price
// (the value shown on the scanner row / info-bar). A bug let the 4H chart keep a
// stale last-candle close (e.g. FSLR 1D=299.50 but 4H=303.64) because the live
// patch was gated to RTH and the 4H buffer's last close diverged from 1D.
//
// The fix centralizes two helpers — extracted REAL from index.html (no copies,
// so they cannot drift) and run in a vm sandbox:
//   • resolveLatestDisplayPrice(symbol, rowData) — one price, DXLink/row/cache,
//     never Yahoo / AH / PM, finite > 0 only.
//   • patchLastCandleWithLivePrice(candles, livePrice) — patch the final candle
//     close (clamp high/low), pure, finite-positive only, never null/NaN/stale.
//
// And it applies the SAME resolved price to BOTH the 1D and 4H datasets before
// drawing, so they can never disagree.
//
// Run: node tests/dss-chart-live-patch.test.js
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

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// ── Sandbox: the real helpers + their direct dependency (_dssResolvePrice) ───
// getUsEquityMarketSession is stubbed so the test controls RTH vs closed.
const sandbox = {
  console, JSON, Object, String, Math, isFinite, parseFloat, NaN,
  S: { scanData: [] },
  // Controlled market session — flip _isRegular between cases.
  _isRegular: true,
  getUsEquityMarketSession: function () { return { isRegularSession: sandbox._isRegular }; },
};
vm.createContext(sandbox);
vm.runInContext(
  ['_dssResolvePrice', 'resolveLatestDisplayPrice', 'patchLastCandleWithLivePrice']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

const dailyCandles = () => ([
  { time: 1, open: 290, high: 295, low: 289, close: 294 },
  { time: 2, open: 294, high: 300, low: 293, close: 299.50 }, // 1D ends at 299.50
]);
const fourHCandles = () => ([
  { time: 1, open: 300, high: 305, low: 299, close: 304 },
  { time: 2, open: 304, high: 305, low: 302, close: 303.64 }, // 4H ends at 303.64 (stale)
]);

// ── 1. patchLastCandleWithLivePrice — validation guards ──────────────────────
section('1. patchLastCandleWithLivePrice rejects invalid prices (never paints null/NaN/stale)');
{
  const c = dailyCandles();
  ok(sandbox.patchLastCandleWithLivePrice(c, null) === c, 'null price → returns input unchanged (same ref)');
  ok(sandbox.patchLastCandleWithLivePrice(c, NaN) === c, 'NaN price → unchanged');
  ok(sandbox.patchLastCandleWithLivePrice(c, 'abc') === c, 'non-numeric price → unchanged');
  ok(sandbox.patchLastCandleWithLivePrice(c, 0) === c, 'zero price → unchanged (not > 0)');
  ok(sandbox.patchLastCandleWithLivePrice(c, -5) === c, 'negative price → unchanged');
  ok(sandbox.patchLastCandleWithLivePrice(c, Infinity) === c, 'Infinity price → unchanged');
  ok(sandbox.patchLastCandleWithLivePrice([], 100) !== undefined, 'empty array tolerated');
  ok(sandbox.patchLastCandleWithLivePrice(null, 100) === null, 'null candles → returns null');
}

// ── 2. patchLastCandleWithLivePrice — patches close + clamps high/low ────────
section('2. patchLastCandleWithLivePrice patches the final close and clamps wicks');
{
  const c = dailyCandles();
  const up = sandbox.patchLastCandleWithLivePrice(c, 310); // above prior high 300
  ok(up !== c, 'returns a NEW array (pure — does not mutate input)');
  ok(c[c.length - 1].close === 299.50, 'original last close untouched (input not mutated)');
  ok(up[up.length - 1].close === 310, 'patched last close = live price');
  ok(up[up.length - 1].high === 310, 'high clamped UP to live price when live > high');
  ok(up[up.length - 1].low === 293, 'low unchanged when live > low');
  ok(up.length === c.length, 'array length unchanged');
  ok(up[0] === c[0], 'prior candles kept by reference (only last replaced)');

  const down = sandbox.patchLastCandleWithLivePrice(dailyCandles(), 280); // below prior low 293
  ok(down[down.length - 1].close === 280, 'patched close = live (downward)');
  ok(down[down.length - 1].low === 280, 'low clamped DOWN to live price when live < low');
  ok(down[down.length - 1].high === 300, 'high unchanged when live < high');
}

// ── 3. patchLastCandleWithLivePrice — no realloc when already current ────────
section('3. patchLastCandleWithLivePrice no-ops when price already equals last close');
{
  const c = dailyCandles();
  ok(sandbox.patchLastCandleWithLivePrice(c, 299.50) === c, 'exact match → same ref (no realloc)');
  ok(sandbox.patchLastCandleWithLivePrice(c, 299.5004) === c, 'within 0.001 → same ref');
  ok(sandbox.patchLastCandleWithLivePrice(c, 299.52) !== c, '> 0.001 away → patched (new array)');
}

// ── 4. resolveLatestDisplayPrice — DXLink mark wins during the regular session ─
section('4. resolveLatestDisplayPrice: live DXLink mark during RTH');
{
  sandbox._isRegular = true;
  const row = { ticker: 'FSLR', _priceSource: 'DXLink', price: '299.50', bid: 299.4, ask: 299.6,
                candles: [{ c: 303.64 }] };
  const r = sandbox.resolveLatestDisplayPrice('FSLR', row);
  ok(r.price === 299.50, 'RTH + DXLink row → uses live mark 299.50 (not the stale 303.64 candle)');
  ok(r.source === 'dxlink', 'source labelled dxlink');
}

// ── 5. resolveLatestDisplayPrice — RTH close outside regular session ─────────
section('5. resolveLatestDisplayPrice: last RTH close when market closed');
{
  sandbox._isRegular = false;
  const row = { ticker: 'FSLR', _priceSource: 'DXLink', price: '999', bid: 1, ask: 2,
                candles: [{ c: 294 }, { c: 299.50 }] }; // last RTH daily close
  const r = sandbox.resolveLatestDisplayPrice('FSLR', row);
  ok(r.price === 299.50, 'closed → ignores live mark, uses last RTH daily close 299.50');
  ok(r.source === 'row', 'source labelled row (RTH close shown on the row)');
}

// ── 6. resolveLatestDisplayPrice — non-DXLink row uses RTH close, never AH ───
section('6. resolveLatestDisplayPrice: non-DXLink row falls to RTH close');
{
  sandbox._isRegular = true;
  const row = { ticker: 'XYZ', _priceSource: 'RTH_CLOSE', price: '500', bid: null,
                candles: [{ c: 488 }, { c: 491.25 }] };
  const r = sandbox.resolveLatestDisplayPrice('XYZ', row);
  ok(r.price === 491.25, 'no DXLink mark → last candle close 491.25 (never the AH/other 500)');
}

// ── 7. resolveLatestDisplayPrice — lookup by symbol + missing-row safety ─────
section('7. resolveLatestDisplayPrice: scanData lookup + safe defaults');
{
  sandbox._isRegular = true;
  sandbox.S.scanData = [{ ticker: 'NVDA', _priceSource: 'DXLink', price: '123.45', bid: 1, ask: 2,
                          candles: [{ c: 120 }] }];
  const r = sandbox.resolveLatestDisplayPrice('NVDA'); // no rowData → looks up scanData
  ok(r.price === 123.45, 'looks up the row by symbol when rowData omitted');
  const miss = sandbox.resolveLatestDisplayPrice('NOPE');
  ok(miss.price === null && miss.source === null, 'unknown symbol → {price:null,source:null}');
  sandbox.S.scanData = [];
}

// ── 8. THE CORE GUARANTEE: 1D and 4H end on the SAME resolved price ──────────
section('8. 1D and 4H receive the identical resolved price (the bug fix)');
{
  sandbox._isRegular = true;
  const row = { ticker: 'FSLR', _priceSource: 'DXLink', price: '299.50', bid: 299.4, ask: 299.6,
                candles: [{ c: 299.50 }] };
  // Mirror the real _dssRenderLargeCharts flow: resolve ONCE, patch BOTH.
  const live = sandbox.resolveLatestDisplayPrice('FSLR', row).price;
  const d = sandbox.patchLastCandleWithLivePrice(dailyCandles(), live);
  const f = sandbox.patchLastCandleWithLivePrice(fourHCandles(), live);
  const d1 = d[d.length - 1].close, f1 = f[f.length - 1].close;
  ok(d1 === 299.50, '1D last close patched to resolved price 299.50');
  ok(f1 === 299.50, '4H last close patched to the SAME resolved price 299.50 (was stale 303.64)');
  ok(d1 === f1, '1D and 4H last closes are EQUAL — no divergence');
}
{
  // Same guarantee while the market is closed (the original failing scenario).
  sandbox._isRegular = false;
  const row = { ticker: 'FSLR', _priceSource: 'DXLink', price: '888', bid: 1, ask: 2,
                candles: [{ c: 299.50 }] }; // closed → RTH close 299.50
  const live = sandbox.resolveLatestDisplayPrice('FSLR', row).price;
  const d = sandbox.patchLastCandleWithLivePrice(dailyCandles(), live);
  const f = sandbox.patchLastCandleWithLivePrice(fourHCandles(), live);
  ok(d[d.length - 1].close === f[f.length - 1].close && f[f.length - 1].close === 299.50,
     'market closed: BOTH charts end on the last RTH close 299.50 (4H no longer stale)');
}

// ── 9. _dssRenderLargeCharts wiring — resolve once, patch both, no rthGate ───
section('9. _dssRenderLargeCharts applies one resolved price to both timeframes');
{
  const src = stripComments(extractFn(HTML, '_dssRenderLargeCharts'));
  ok(/resolveLatestDisplayPrice\(symbol\)/.test(src), '9: resolves the price once via resolveLatestDisplayPrice(symbol)');
  const patchCalls = src.match(/patchLastCandleWithLivePrice\(\s*\w+\s*,\s*_dssLive\.price\s*\)/g) || [];
  ok(patchCalls.length >= 2, '9: patches BOTH datasets with the SAME _dssLive.price (>=2 call sites)');
  ok(!/_patchLivePrice\(/.test(src), '9: no longer uses the RTH-gated _patchLivePrice in the DSS path');
  // Preserve the scanner-backend-candles contract (legacy candle path intact).
  ok(/getDailyCandles/.test(src) && /getFourHourCandles/.test(src),
     '9: still falls back to getDailyCandles / getFourHourCandles');
  ok(/\[DSS-CHART-LIVE-PATCH\]/.test(src), '9: emits the [DSS-CHART-LIVE-PATCH] debug line');
}

// ── 10. 4H poll path patches with the same resolver ──────────────────────────
section('10. late-arriving 4H (poll) uses resolveLatestDisplayPrice too');
{
  const src = stripComments(extractFn(HTML, '_dss4hStartPoll'));
  ok(/patchLastCandleWithLivePrice\(\s*four\s*,\s*resolveLatestDisplayPrice\(/.test(src),
     '10: poll path patches 4H with resolveLatestDisplayPrice (parity with 1D)');
  ok(!/_patchLivePrice\(/.test(src), '10: poll path no longer uses RTH-gated _patchLivePrice');
}

// ── 11. _patchLivePrice still delegates + preserves gating (MCX/PF/RS safe) ──
section('11. _patchLivePrice unchanged in behavior for MCX / Portfolio / RS callers');
{
  const src = stripComments(extractFn(HTML, '_patchLivePrice'));
  ok(/rthGate && !isRTHOpen\(\)/.test(src), '11: keeps the opt-in rthGate short-circuit');
  ok(/_priceSource !== 'DXLink'/.test(src), '11: keeps the DXLink-only source guard');
  ok(/row\.bid == null/.test(src), '11: keeps the bid-present guard');
  ok(/patchLastCandleWithLivePrice\(candles, live\)/.test(src),
     '11: delegates the actual patch to the centralized primitive');
}

// ── 12. anti-regression: helpers use only DXLink/Tastytrade state, no Yahoo ──
section('12. new helpers introduce no external / Yahoo fallback');
{
  ['resolveLatestDisplayPrice', 'patchLastCandleWithLivePrice'].forEach((n) => {
    const body = stripComments(extractFn(HTML, n));
    ok(!/yahoo/i.test(body), n + ' contains no "yahoo"');
    ok(!/\bfetch\b/.test(body), n + ' makes no fetch call (synchronous, cache-only)');
    ok(!/\/market\//.test(body), n + ' has no /market/ network access');
  });
}

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
