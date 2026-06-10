'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Greeks refresh totals — active legs only.
//
// Regression coverage for the Portfolio patch that keeps terminal Journal legs
// (CLOSED / expired) out of refreshed Portfolio risk totals while still keeping
// their historical records in the Journal.
//
// Run: node tests/portfolio-greeks-refresh-totals.test.js
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

(function aggregateTotalsUseActiveLegsOnly() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    isFinite, parseFloat, Math, String,
    normalizeGreekPoints(v) { return v; },
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn(HTML, 'aggregateGreeks'), ctx);

  const r = ctx.aggregateGreeks([
    {
      ticker: 'SPY', beta: 1, underlyingPrice: 500,
      // Stale position totals intentionally include terminal-leg exposure; active
      // legsLive must override them for open Portfolio risk totals.
      delta: 999, theta: 999, gamma: 999, vega: 999,
      legs: [
        { type: 'CALL', side: 'LONG',  qty: 50, status: 'CLOSED', entryPrice: 1 },
        { type: 'PUT',  side: 'SHORT', qty: 2,  status: 'OPEN',   entryPrice: 3 },
      ],
      // Active-leg order: the lone item belongs to the open PUT, not the closed CALL.
      legsLive: [{ delta: 7, theta: -2, gamma: 0.3, vega: 4 }],
    },
  ], 500);

  assert(r.totalDelta === -14, 'aggregate totalDelta excludes terminal legs and uses active sign×qty');
  assert(r.totalTheta === 4, 'aggregate totalTheta excludes terminal legs and uses active sign×qty');
  assert(Math.abs(r.totalGamma + 0.6) < 1e-9, 'aggregate totalGamma excludes terminal legs and uses active sign×qty');
  assert(r.totalVega === -8, 'aggregate totalVega excludes terminal legs and uses active sign×qty');
  assert(r.vegaCall === null, 'aggregate vegaCall excludes closed CALL exposure');
  assert(r.vegaPut === -8, 'aggregate vegaPut keeps only open PUT exposure');
  assert(r.putShortVegaAbs === 8, 'aggregate short-put absolute vega uses only active legs');
  assert(r.avgBeta === 1, 'avgBeta notional denominator uses active open-leg notional only');
  assert(r.betaWeightedDelta === -14, 'betaWeightedDelta uses active delta total only');
  console.log('✓ aggregateGreeks totals are active-leg only');
})();

(function refreshCodeFiltersTerminalLegs() {
  const refreshSrc = extractFn(HTML, 'refreshPositionsLive');
  assert(/var allLegs = pos\.legs \|\| \[\];\s*var legs = allLegs\.filter\(legIsOpen\);/.test(refreshSrc),
    'refreshPositionsLive filters pos.legs through legIsOpen before pricing/Greek totals');
  assert(/skippedTerminalLegs/.test(refreshSrc) && /active-leg refresh only/.test(refreshSrc),
    'refreshPositionsLive includes active-leg diagnostics for skipped terminal legs');
  assert(/\(pos\.legs \|\| \[\]\)\.filter\(legIsOpen\)\.forEach\(function\(leg\)/.test(refreshSrc),
    'backend option symbol collection ignores terminal legs');
  console.log('✓ refreshPositionsLive filters terminal legs and exposes diagnostics');
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed')
                            : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
