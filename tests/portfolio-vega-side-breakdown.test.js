'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// aggregateGreeks — Vega long/short breakdown by put/call side.
//
// Extracts the REAL aggregateGreeks helper from index.html and runs it in a vm
// sandbox. Proves the additive Vega breakdown:
//   putLongVega       — sum of vega for all long  put  legs
//   putShortVegaAbs   — |sum of vega for all short put  legs|
//   callLongVega      — sum of vega for all long  call legs
//   callShortVegaAbs  — |sum of vega for all short call legs|
// and that the existing vegaPut / vegaCall / totalVega remain net values.
//
// Run: node tests/portfolio-vega-side-breakdown.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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

function makeCtx() {
  const ctx = {
    console: { log: function() {}, warn: function() {}, error: function() {} },
    isFinite: isFinite, parseFloat: parseFloat, Math: Math, String: String,
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn(HTML, 'aggregateGreeks'), ctx);
  return ctx;
}

// ── 1. Spec portfolio: long put +2, short put -3, long call +4, short call -5 ──
(function() {
  const ctx = makeCtx();
  // legsLive carries the per-leg DXLink vega (always positive); the SHORT side
  // flips the sign so a short leg's exposure is negative.
  const positions = [
    { delta: null, theta: null, gamma: null, vega: 2,  beta: null,
      legs: [{ type: 'PUT',  side: 'LONG',  qty: 1 }], legsLive: [{ vega: 2 }] },
    { delta: null, theta: null, gamma: null, vega: -3, beta: null,
      legs: [{ type: 'PUT',  side: 'SHORT', qty: 1 }], legsLive: [{ vega: 3 }] },
    { delta: null, theta: null, gamma: null, vega: 4,  beta: null,
      legs: [{ type: 'CALL', side: 'LONG',  qty: 1 }], legsLive: [{ vega: 4 }] },
    { delta: null, theta: null, gamma: null, vega: -5, beta: null,
      legs: [{ type: 'CALL', side: 'SHORT', qty: 1 }], legsLive: [{ vega: 5 }] },
  ];
  const r = ctx.aggregateGreeks(positions, null);
  assert(r.putLongVega === 2,      '1: putLongVega = 2, got ' + r.putLongVega);
  assert(r.putShortVegaAbs === 3,  '1: putShortVegaAbs = 3, got ' + r.putShortVegaAbs);
  assert(r.callLongVega === 4,     '1: callLongVega = 4, got ' + r.callLongVega);
  assert(r.callShortVegaAbs === 5, '1: callShortVegaAbs = 5, got ' + r.callShortVegaAbs);
  // Existing metrics stay NET (long + short, signed).
  assert(r.vegaPut === -1,  '1: vegaPut net = 2 + (-3) = -1, got ' + r.vegaPut);
  assert(r.vegaCall === -1, '1: vegaCall net = 4 + (-5) = -1, got ' + r.vegaCall);
  assert(r.totalVega === -2, '1: totalVega net = -2, got ' + r.totalVega);
  console.log('✓ 1 spec portfolio: long/short put/call breakdown + net metrics intact');
})();

// ── 2. Multiple legs per side accumulate; shorts reported as positive abs ─────
(function() {
  const ctx = makeCtx();
  const positions = [
    { delta: null, theta: null, gamma: null, vega: null, beta: null,
      legs: [
        { type: 'PUT',  side: 'LONG',  qty: 2 }, // +1.5 × 2 = 3
        { type: 'PUT',  side: 'SHORT', qty: 1 }, // -2
        { type: 'CALL', side: 'LONG',  qty: 1 }, // +1
        { type: 'CALL', side: 'SHORT', qty: 3 }, // -0.5 × 3 = -1.5
      ],
      legsLive: [{ vega: 1.5 }, { vega: 2 }, { vega: 1 }, { vega: 0.5 }] },
  ];
  const r = ctx.aggregateGreeks(positions, null);
  assert(Math.abs(r.putLongVega - 3) < 1e-9,       '2: putLongVega = 3, got ' + r.putLongVega);
  assert(Math.abs(r.putShortVegaAbs - 2) < 1e-9,   '2: putShortVegaAbs = 2, got ' + r.putShortVegaAbs);
  assert(Math.abs(r.callLongVega - 1) < 1e-9,      '2: callLongVega = 1, got ' + r.callLongVega);
  assert(Math.abs(r.callShortVegaAbs - 1.5) < 1e-9,'2: callShortVegaAbs = 1.5, got ' + r.callShortVegaAbs);
  console.log('✓ 2 multi-leg accumulation with qty scaling; shorts as positive abs');
})();

// ── 3. Missing/invalid leg vega is skipped, never breaks the breakdown ────────
(function() {
  const ctx = makeCtx();
  const positions = [
    { delta: null, theta: null, gamma: null, vega: null, beta: null,
      legs: [{ type: 'PUT', side: 'LONG', qty: 1 }], legsLive: [{ vega: null }] },
  ];
  const r = ctx.aggregateGreeks(positions, null);
  // No usable vega anywhere → all four stay null (same as vegaPut/vegaCall).
  assert(r.putLongVega === null,      '3: putLongVega null when leg vega missing');
  assert(r.putShortVegaAbs === null,  '3: putShortVegaAbs null when no short data');
  assert(r.callLongVega === null,     '3: callLongVega null when no call data');
  assert(r.callShortVegaAbs === null, '3: callShortVegaAbs null when no call data');
  console.log('✓ 3 missing leg vega skipped — breakdown stays null, no crash');
})();

// ── 4. Terminal legs are ignored; active legsLive is active-leg ordered ───────
(function() {
  const ctx = makeCtx();
  const positions = [
    { delta: 999, theta: 999, gamma: 999, vega: 999, beta: null,
      legs: [
        { type: 'CALL', side: 'LONG', qty: 100, status: 'CLOSED' },
        { type: 'PUT',  side: 'LONG', qty: 2, status: 'OPEN' },
      ],
      // refreshPositionsLive stores active legs only, so index 0 belongs to the open PUT.
      legsLive: [{ delta: 5, theta: -1, gamma: 0.2, vega: 3 }] },
  ];
  const r = ctx.aggregateGreeks(positions, null);
  assert(r.totalDelta === 10, '4: totalDelta uses active leg only, got ' + r.totalDelta);
  assert(r.totalTheta === -2, '4: totalTheta uses active leg only, got ' + r.totalTheta);
  assert(Math.abs(r.totalGamma - 0.4) < 1e-9, '4: totalGamma uses active leg only, got ' + r.totalGamma);
  assert(r.totalVega === 6, '4: totalVega uses active leg only, got ' + r.totalVega);
  assert(r.vegaCall === null, '4: closed CALL excluded from vegaCall, got ' + r.vegaCall);
  assert(r.vegaPut === 6, '4: open PUT contributes to vegaPut, got ' + r.vegaPut);
  assert(r.putLongVega === 6, '4: open PUT contributes to putLongVega, got ' + r.putLongVega);
  console.log('✓ 4 terminal legs ignored; active legsLive order drives totals');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed')
                            : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
