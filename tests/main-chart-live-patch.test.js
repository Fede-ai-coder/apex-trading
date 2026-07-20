'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Main "▽ CHART" (openChart / renderCharts) last-price parity.
//
// Background: the full-screen main chart opened from a scanner row was the ONE
// chart surface that never reconciled to a single resolved display price. Its
// header showed the raw scanner-row price (`d.price`, the live DXLink mark) while
// renderCharts() plotted the raw candle-store closes — so the header number could
// disagree with where the price line ends (e.g. header 299.50 live, but the line
// ends on a stale last daily close). Every sibling chart (DSS, scanner-inline, RS,
// MCX, Portfolio) already fixed this via resolveLatestDisplayPrice +
// patchLastCandleWithLivePrice.
//
// The fix resolves the price ONCE in openChart (resolveLatestDisplayPrice), stores
// it on CHART_STATE.displayPrice, renders it in the header, and renderCharts()
// reconciles the final plotted candle to it via _mainChartPatchLastClose — the
// short-key ({t,o,h,l,c,v}) sibling of patchLastCandleWithLivePrice used by the
// main-chart candle shape. Outside RTH resolveLatestDisplayPrice yields the last
// RTH close, so no after-hours / pre-market movement is ever fabricated.
//
// All proofs read the REAL functions out of index.html (no copies, so they cannot
// drift) and either assert on their source or drive them in a vm sandbox.
//
// Run: node tests/main-chart-live-patch.test.js
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

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── Sandbox: the real short-key patch helper ─────────────────────────────────
const sandbox = { console, JSON, Object, String, Math, isFinite, parseFloat, NaN, Infinity };
vm.createContext(sandbox);
vm.runInContext(extractFn(HTML, '_mainChartPatchLastClose'), sandbox);

// Main-chart candle shape is short-key {t,o,h,l,c,v}.
const mainCandles = () => ([
  { t: 1, o: 290, h: 295, l: 289, c: 294 },
  { t: 2, o: 294, h: 300, l: 293, c: 299.50 }, // ends at 299.50 (stale last close)
]);

// ── 1. _mainChartPatchLastClose — validation guards ──────────────────────────
section('1. _mainChartPatchLastClose rejects invalid prices (never paints null/NaN/stale)');
{
  const c = mainCandles();
  ok(sandbox._mainChartPatchLastClose(c, null) === c, 'null price → returns input unchanged (same ref)');
  ok(sandbox._mainChartPatchLastClose(c, NaN) === c, 'NaN price → unchanged');
  ok(sandbox._mainChartPatchLastClose(c, 'abc') === c, 'non-numeric price → unchanged');
  ok(sandbox._mainChartPatchLastClose(c, 0) === c, 'zero price → unchanged (not > 0)');
  ok(sandbox._mainChartPatchLastClose(c, -5) === c, 'negative price → unchanged');
  ok(sandbox._mainChartPatchLastClose(c, Infinity) === c, 'Infinity price → unchanged');
  ok(sandbox._mainChartPatchLastClose([], 100) !== undefined, 'empty array tolerated');
  ok(sandbox._mainChartPatchLastClose(null, 100) === null, 'null candles → returns null');
}

// ── 2. _mainChartPatchLastClose — patches close + clamps high/low ────────────
section('2. _mainChartPatchLastClose patches the final close and clamps wicks');
{
  const c = mainCandles();
  const up = sandbox._mainChartPatchLastClose(c, 310); // above prior high 300
  ok(up !== c, 'returns a NEW array (pure — does not mutate input)');
  ok(c[c.length - 1].c === 299.50, 'original last close untouched (input not mutated)');
  ok(up[up.length - 1].c === 310, 'patched last close = live price');
  ok(up[up.length - 1].h === 310, 'high clamped UP to live price when live > high');
  ok(up[up.length - 1].l === 293, 'low unchanged when live > low');
  ok(up.length === c.length, 'array length unchanged');
  ok(up[0] === c[0], 'prior candles kept by reference (only last replaced)');

  const down = sandbox._mainChartPatchLastClose(mainCandles(), 280); // below prior low 293
  ok(down[down.length - 1].c === 280, 'patched close = live (downward)');
  ok(down[down.length - 1].l === 280, 'low clamped DOWN to live price when live < low');
  ok(down[down.length - 1].h === 300, 'high unchanged when live < high');
}

// ── 3. _mainChartPatchLastClose — no realloc when already current ────────────
section('3. _mainChartPatchLastClose no-ops when price already equals last close');
{
  const c = mainCandles();
  ok(sandbox._mainChartPatchLastClose(c, 299.50) === c, 'exact match → same ref (no realloc)');
  ok(sandbox._mainChartPatchLastClose(c, 299.5004) === c, 'within 0.001 → same ref');
  ok(sandbox._mainChartPatchLastClose(c, 299.52) !== c, '> 0.001 away → patched (new array)');
}

// ── 4. openChart resolves the display price ONCE and shows it in the header ───
section('4. openChart resolves one display price and stores it on CHART_STATE');
{
  const src = stripComments(extractFn(HTML, 'openChart'));
  ok(/resolveLatestDisplayPrice\(\s*ticker\s*,\s*d\s*\)/.test(src),
    'openChart resolves via resolveLatestDisplayPrice(ticker, d)');
  ok(/CHART_STATE\.displayPrice\s*=/.test(src),
    'openChart stores the resolved price on CHART_STATE.displayPrice');
  ok(/chartTitle[\s\S]*CHART_STATE\.displayPrice/.test(src),
    'the header reads CHART_STATE.displayPrice (not the raw row price alone)');
}

// ── 5. renderCharts reconciles the plotted line to the resolved price ────────
section('5. renderCharts patches the last plotted candle BEFORE slicing');
{
  const src = stripComments(extractFn(HTML, 'renderCharts'));
  const patchIdx = src.search(/_mainChartPatchLastClose\s*\(\s*candles\s*,\s*CHART_STATE\.displayPrice\s*\)/);
  const sliceIdx = src.indexOf('candles.slice(-period)');
  ok(patchIdx >= 0, 'renderCharts applies _mainChartPatchLastClose(candles, CHART_STATE.displayPrice)');
  ok(sliceIdx >= 0, 'renderCharts slices candles by period');
  ok(patchIdx >= 0 && sliceIdx >= 0 && patchIdx < sliceIdx,
    'the patch runs BEFORE the slice, so the drawn window ends on the resolved price');
}

// ── 6. CHART_STATE declares displayPrice ─────────────────────────────────────
section('6. CHART_STATE carries the displayPrice field');
{
  ok(/var CHART_STATE\s*=\s*\{[^}]*displayPrice\s*:/.test(HTML),
    'CHART_STATE initializer declares displayPrice');
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'ALL PASS (' + pass + ')'
  : pass + ' passed, ' + fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
