'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// computeVegaMonitorRatios — additive Vega monitor ratios validation.
//
// Extracts the REAL helper from index.html and runs it in a vm sandbox. Proves
// the three display-only ratios are pure quotients of values the Portfolio
// already holds, and that each falls back to null (renderer shows "N/A") when a
// numerator is missing or a denominator is missing / zero / non-finite:
//   bwdOverVegaLongPut        = BWD          / VegaLongPut      (ag.putLongVega)
//   vegaLongPutOverShortPut   = VegaLongPut  / |VegaShortPut|   (ag.putShortVegaAbs)
//   vegaLongCallOverShortCall = VegaLongCall / |VegaShortCall|  (ag.callShortVegaAbs)
//
// Run: node tests/portfolio-vega-monitor-ratios.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
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
  }
  throw new Error('function not found: ' + name);
}

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ ' + msg); }
}
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

function makeCtx() {
  const ctx = { isFinite: isFinite, Math: Math };
  vm.createContext(ctx);
  vm.runInContext(extractFn(HTML, 'computeVegaMonitorRatios'), ctx);
  return ctx;
}

// ── 1. Full data → all three ratios computed exactly ────────────────────────
(function() {
  const ctx = makeCtx();
  // ag mirrors aggregateGreeks: shorts already stored as absolute values.
  const ag = { putLongVega: 4, putShortVegaAbs: 2, callLongVega: 9, callShortVegaAbs: 3 };
  const r = ctx.computeVegaMonitorRatios(12, ag);
  assert(approx(r.bwdOverVegaLongPut, 3),        '1: BWD/VLP = 12/4 = 3, got ' + r.bwdOverVegaLongPut);
  assert(approx(r.vegaLongPutOverShortPut, 2),   '1: VLP/|VSP| = 4/2 = 2, got ' + r.vegaLongPutOverShortPut);
  assert(approx(r.vegaLongCallOverShortCall, 3), '1: VLC/|VSC| = 9/3 = 3, got ' + r.vegaLongCallOverShortCall);
  console.log('✓ 1 full data → exact quotients of existing values');
})();

// ── 2. Zero denominators → null (renderer shows "N/A") ──────────────────────
(function() {
  const ctx = makeCtx();
  const r1 = ctx.computeVegaMonitorRatios(12, { putLongVega: 0, putShortVegaAbs: 2, callLongVega: 9, callShortVegaAbs: 3 });
  assert(r1.bwdOverVegaLongPut === null, '2: VegaLongPut=0 → BWD/VLP null');

  const r2 = ctx.computeVegaMonitorRatios(12, { putLongVega: 4, putShortVegaAbs: 0, callLongVega: 9, callShortVegaAbs: 3 });
  assert(r2.vegaLongPutOverShortPut === null, '2: VegaShortPut=0 → VLP/|VSP| null');

  const r3 = ctx.computeVegaMonitorRatios(12, { putLongVega: 4, putShortVegaAbs: 2, callLongVega: 9, callShortVegaAbs: 0 });
  assert(r3.vegaLongCallOverShortCall === null, '2: VegaShortCall=0 → VLC/|VSC| null');
  console.log('✓ 2 zero denominator → null (N/A) per spec');
})();

// ── 3. Missing numerator / denominator → null, others still compute ─────────
(function() {
  const ctx = makeCtx();
  // BWD missing → only the first ratio blanks; the put/call ratios still resolve.
  const r = ctx.computeVegaMonitorRatios(null, { putLongVega: 4, putShortVegaAbs: 2, callLongVega: 9, callShortVegaAbs: 3 });
  assert(r.bwdOverVegaLongPut === null,          '3: missing BWD → BWD/VLP null');
  assert(approx(r.vegaLongPutOverShortPut, 2),   '3: VLP/|VSP| unaffected = 2');
  assert(approx(r.vegaLongCallOverShortCall, 3), '3: VLC/|VSC| unaffected = 3');

  // Missing breakdown values blank only their own ratio.
  const r2 = ctx.computeVegaMonitorRatios(12, { putLongVega: null, putShortVegaAbs: null, callLongVega: 9, callShortVegaAbs: 3 });
  assert(r2.bwdOverVegaLongPut === null,      '3: putLongVega null → BWD/VLP null');
  assert(r2.vegaLongPutOverShortPut === null, '3: putLongVega null → VLP/|VSP| null');
  assert(approx(r2.vegaLongCallOverShortCall, 3), '3: call side still computes = 3');
  console.log('✓ 3 a missing input blanks only its own ratio, never the others');
})();

// ── 4. Empty / undefined ag never throws; all three null ────────────────────
(function() {
  const ctx = makeCtx();
  const r = ctx.computeVegaMonitorRatios(null, undefined);
  assert(r.bwdOverVegaLongPut === null && r.vegaLongPutOverShortPut === null && r.vegaLongCallOverShortCall === null,
    '4: undefined ag → all null, no throw');
  console.log('✓ 4 undefined aggregate tolerated → all N/A');
})();

// ── 5. Negative BWD flows through (sign preserved, not abs) ──────────────────
(function() {
  const ctx = makeCtx();
  const r = ctx.computeVegaMonitorRatios(-8, { putLongVega: 4, putShortVegaAbs: 2, callLongVega: 9, callShortVegaAbs: 3 });
  assert(approx(r.bwdOverVegaLongPut, -2), '5: negative BWD preserved: -8/4 = -2, got ' + r.bwdOverVegaLongPut);
  console.log('✓ 5 ratios preserve sign (pure quotient, no extra transform)');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed')
                            : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
