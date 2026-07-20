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

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

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
  // The renderer now resolves once via dssResolveChartLivePrice(symbol), the
  // display-only wrapper that prefers the live/recent backend-snapshot row price
  // (backend-only symbols absent from S.scanData) and otherwise delegates to
  // resolveLatestDisplayPrice. Resolve-once / patch-both contract is unchanged.
  ok(/dssResolveChartLivePrice\(symbol\)/.test(src), '9: resolves the price once via dssResolveChartLivePrice(symbol)');
  const patchCalls = src.match(/patchLastCandleWithLivePrice\(\s*\w+\s*,\s*_dssLive\.price\s*\)/g) || [];
  ok(patchCalls.length >= 2, '9: patches BOTH datasets with the SAME _dssLive.price (>=2 call sites)');
  ok(!/_patchLivePrice\(/.test(src), '9: no longer uses the RTH-gated _patchLivePrice in the DSS path');
  // Preserve the scanner-backend-candles contract (legacy candle path intact).
  ok(/getDailyCandles/.test(src) && /getFourHourCandles/.test(src),
     '9: still falls back to getDailyCandles / getFourHourCandles');
  ok(/\[DSS-CHART-LIVE-PATCH\]/.test(src), '9: emits the [DSS-CHART-LIVE-PATCH] debug line');

  // ORDER: the candle must be patched BEFORE its indicators are computed, so the
  // close, SMA/RSI/RS and labels all derive from the same final patched candle.
  const patch1d = src.indexOf('patchLastCandleWithLivePrice(daily');
  const ind1d   = src.indexOf('computeCandleIndicators(daily)');
  ok(patch1d >= 0 && ind1d >= 0 && patch1d < ind1d,
     '9: 1D — patchLastCandleWithLivePrice(daily,…) precedes computeCandleIndicators(daily)');
  const patch4h = src.indexOf('patchLastCandleWithLivePrice(four');
  const ind4h   = src.indexOf('computeCandleIndicators(four)');
  ok(patch4h >= 0 && ind4h >= 0 && patch4h < ind4h,
     '9: 4H — patchLastCandleWithLivePrice(four,…) precedes computeCandleIndicators(four)');

  // The cold-buffer (first-open) 4H poll is handed the SAME render-scoped price.
  ok(/_dss4hStartPoll\(\s*symbol\s*,\s*_dssLive\.price\s*\)/.test(src),
     '9: cold-buffer 4H poll is started with _dssLive.price (first-open parity)');
}

// ── 10. 4H poll path uses the RENDER-SCOPED price, never re-resolves ─────────
// First-open race fix: the late-arriving 4H series must be patched with the
// EXACT price the 1D chart used in the same render cycle. If the poll resolved
// its own price (a moment later) it could diverge — the first-open bug where 1D
// showed 311.01 but 4H showed 310.83.
section('10. late-arriving 4H (poll) reuses the render-scoped price, no re-resolve');
{
  const src = stripComments(extractFn(HTML, '_dss4hStartPoll'));
  // Accepts the render-scoped price as a parameter.
  ok(/function _dss4hStartPoll\(\s*symbol\s*,\s*resolvedPrice\s*\)/.test(src),
     '10: _dss4hStartPoll(symbol, resolvedPrice) accepts the render-scoped price');
  // Patches 4H with that captured price — NOT an independently re-resolved one.
  ok(/patchLastCandleWithLivePrice\(\s*four\s*,\s*pollPrice\s*\)/.test(src),
     '10: poll patches 4H with the captured render-scoped pollPrice');
  ok(!/resolveLatestDisplayPrice\s*\(/.test(src),
     '10: poll does NOT call resolveLatestDisplayPrice — cannot resolve a divergent price');
  ok(!/_patchLivePrice\(/.test(src), '10: poll path no longer uses RTH-gated _patchLivePrice');

  // ORDER: patch the late-arriving 4H series BEFORE computing its indicators.
  const patch4h = src.indexOf('patchLastCandleWithLivePrice(four');
  const ind4h   = src.indexOf('computeCandleIndicators(four)');
  ok(patch4h >= 0 && ind4h >= 0 && patch4h < ind4h,
     '10: poll — patchLastCandleWithLivePrice(four,…) precedes computeCandleIndicators(four)');
  // The poll patch must precede the draw (no unpatched dataset drawn first).
  const draw4h = src.indexOf("_drawCandleChart('dss-big-wrap-4h'");
  ok(patch4h >= 0 && draw4h >= 0 && patch4h < draw4h,
     '10: poll — patch precedes _drawCandleChart (no unpatched first draw)');
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

// ── 13. RUNTIME: indicators reflect the patched close (computed AFTER patch) ──
// Static ordering (sections 9/10) proves the source order; this proves the
// *effect*: the same final candle that sets the visible price also drives the
// SMA/RSI, so chart and indicators can't end on different closes.
section('13. computeCandleIndicators run on the patched dataset reflects the patch');
{
  // Pull in the real indicator stack (no copies) so the proof can't drift.
  vm.runInContext(
    ['smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze', 'computeCandleIndicators']
      .map((n) => extractFn(HTML, n)).join('\n'),
    sandbox
  );
  // 30 OSCILLATING candles (alternating +2 gain / -1 loss) so RSI stays mid-range
  // — a monotonic series would pin RSI at 100 and hide the effect. SMA8/RSI both
  // depend on the last close. Last raw close = 316.
  const base = [];
  let prev = 300;
  for (let i = 0; i < 30; i++) {
    const c = (i === 0) ? 300 : prev + (i % 2 === 1 ? 2 : -1);
    prev = c;
    base.push({ time: i + 1, open: c - 0.5, high: c + 2, low: c - 2, close: c, volume: 1000 });
  }
  sandbox.__base = base;
  // Compute on RAW vs a clearly different patched close (316 → 380).
  const out = vm.runInContext(`(function(){
    var raw = __base.map(function(c){return Object.assign({}, c);});
    var rawInd = computeCandleIndicators(raw);
    var patched = patchLastCandleWithLivePrice(__base.map(function(c){return Object.assign({}, c);}), 380);
    var patInd = computeCandleIndicators(patched);
    return {
      rawClose: raw[raw.length-1].close,
      patClose: patched[patched.length-1].close,
      rawSma8: rawInd.lastSma8, patSma8: patInd.lastSma8,
      rawRsi: rawInd.lastRsi,   patRsi: patInd.lastRsi
    };
  })()`, sandbox);

  ok(out.patClose === 380 && out.rawClose === 316,
     '13: patched dataset ends at the live price 380 (raw ended at 316)');
  ok(out.patSma8 > out.rawSma8,
     '13: lastSma8 computed on the PATCHED dataset is higher — indicators saw the patch (' +
     out.rawSma8.toFixed(2) + ' → ' + out.patSma8.toFixed(2) + ')');
  ok(out.rawRsi < 100 && out.patRsi > out.rawRsi,
     '13: lastRsi rises on the PATCHED dataset — RSI also reflects the patched close (' +
     out.rawRsi.toFixed(1) + ' → ' + out.patRsi.toFixed(1) + ')');
}

// ── 14. OPEN/REOPEN FRESHNESS: re-resolve every render, no stale _dssLive ─────
// Every open/reopen of a Directional Scanner detail must re-resolve the latest
// price at THAT moment and never reuse a value from a prior opening. The guard is
// structural: _dssLive is a function-LOCAL var inside _dssRenderLargeCharts, so a
// fresh dssResolveChartLivePrice(symbol) runs on every invocation.
section('14. open/reopen re-resolves price; _dssLive is never a stale module global');
{
  const fnSrc = extractFn(HTML, '_dssRenderLargeCharts');
  const cleanFn = stripComments(fnSrc);

  // (a) _dssLive is re-resolved INSIDE the render path on every call (local var).
  ok(/var\s+_dssLive\s*=\s*dssResolveChartLivePrice\(\s*symbol\s*\)/.test(cleanFn),
     '14: _dssLive is a function-local var = dssResolveChartLivePrice(symbol), evaluated each render');

  // (b) _dssLive is USED only inside _dssRenderLargeCharts — no module-global decl,
  //     no other function reading a cached value. Count on comment-stripped code so
  //     a doc-comment mentioning the name elsewhere doesn't count as a reference.
  const totalLive = (stripComments(HTML).match(/_dssLive\b/g) || []).length;
  const fnLive    = (cleanFn.match(/_dssLive\b/g) || []).length;
  ok(fnLive >= 3 && totalLive === fnLive,
     '14: every _dssLive code reference (' + totalLive + ') is local to _dssRenderLargeCharts — no stale global reuse');
  ok(!/(^|[\n;{])\s*(var|let|const)\s+_dssLive\b[^=]*$/m.test(stripComments(HTML).replace(cleanFn, '')),
     '14: no top-level/module-scope _dssLive declaration outside the render function');

  // (c) The open/reopen handler always (re)renders via _dssRenderLargeCharts(symbol).
  const openSrc = stripComments(extractFn(HTML, 'openDirectionalSetupDetail'));
  ok(/_dssRenderLargeCharts\(\s*symbol\s*\)/.test(openSrc),
     '14: openDirectionalSetupDetail re-invokes _dssRenderLargeCharts(symbol) on open/reopen');
  ok(!/\bif\s*\(\s*symbol\s*===?\s*_dssDetailSymbol\s*\)\s*return/.test(openSrc),
     '14: no same-symbol early-return that would skip re-render on reopen');

  // (d) RUNTIME: resolveLatestDisplayPrice is NOT memoized — a second open after a
  //     live price change returns the NEW price (proves reopen freshness).
  sandbox._isRegular = true;
  sandbox.S.scanData = [{ ticker: 'FSLR', _priceSource: 'DXLink', price: '299.50', bid: 1, ask: 2,
                          candles: [{ c: 299.50 }] }];
  const first = sandbox.resolveLatestDisplayPrice('FSLR').price;           // first open
  sandbox.S.scanData[0].price = '305.00';                                  // APEX updates 5 min later
  const second = sandbox.resolveLatestDisplayPrice('FSLR').price;          // reopen
  ok(first === 299.50 && second === 305.00,
     '14: reopen re-resolves the CURRENT price (299.50 → 305.00), not the first-open value');
  sandbox.S.scanData = [];
}

// ── 15. FIRST-OPEN RACE: cold-buffer 4H poll uses the render price, not a drift ─
// On first open the 30M buffer is cold, so the 4H takes the poll path and draws a
// few seconds after the 1D. If the poll re-resolved its OWN price it could drift
// (e.g. the row momentarily resolves to the daily RTH close instead of the live
// mark) — the reported FSLR bug: 1D=311.01 but 4H=310.83. The fix captures the
// render-scoped price and patches the late 4H with that exact value.
section('15. first-open 4H poll patches with the captured render price (no drift)');
{
  // 1D render resolves the live mark 311.01.
  sandbox._isRegular = true;
  sandbox.S.scanData = [{ ticker: 'FSLR', _priceSource: 'DXLink', price: '311.01', bid: 1, ask: 2,
                          candles: [{ c: 310.83 }] }]; // daily last close (RTH_CLOSE) = 310.83
  const renderPrice = sandbox.resolveLatestDisplayPrice('FSLR').price; // == _dssLive.price
  ok(renderPrice === 311.01, '15: render resolves the live mark 311.01 (used by 1D and handed to the poll)');

  // Simulate the moment the poll fires LATER, when a re-resolution would DRIFT:
  // the row momentarily loses its DXLink mark, so resolveLatestDisplayPrice now
  // returns the daily RTH close 310.83 instead of 311.01.
  sandbox.S.scanData[0]._priceSource = 'RTH_CLOSE';
  const driftedNow = sandbox.resolveLatestDisplayPrice('FSLR').price;
  ok(driftedNow === 310.83, '15: a fresh re-resolve at poll time would DRIFT to 310.83 (the old bug source)');

  // The fixed poll uses the captured renderPrice (311.01), NOT driftedNow.
  const four = sandbox.patchLastCandleWithLivePrice(fourHCandles(), renderPrice);
  ok(four[four.length - 1].close === 311.01,
     '15: late 4H poll patches to the captured render price 311.01 — matches 1D, not the drifted 310.83');

  // Contrast: had the poll re-resolved (the bug), 4H would have shown 310.83 ≠ 1D.
  const buggy = sandbox.patchLastCandleWithLivePrice(fourHCandles(), driftedNow);
  ok(buggy[buggy.length - 1].close === 310.83 && buggy[buggy.length - 1].close !== renderPrice,
     '15: re-resolving (old behavior) would have diverged from the 1D price — this is what the fix prevents');
  sandbox.S.scanData = [];
}

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
