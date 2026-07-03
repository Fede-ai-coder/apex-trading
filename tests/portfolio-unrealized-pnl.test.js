'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — UNREALIZED P&L (single source of truth).
//
// Extracts the REAL helpers from index.html and runs them in a vm sandbox to prove
// the position P&L is computed from each leg's OWN current mark (never the
// underlying price for an option leg), with the correct side/qty/multiplier:
//
//   SHORT: (entryPrice - mark) * qty * 100      LONG: (mark - entryPrice) * qty * 100
//
//   1. short put entry 3.87, mark 2.00, qty 1 → +187
//   2. short put entry 3.87, mark 5.00, qty 1 → -113
//   3. long  call entry 2.00, mark 3.50, qty 1 → +150
//   4. multi-leg (short put spread) sums leg-level P&L
//   5. missing current mark → null (row shows "--")
//   6. option P&L uses the LEG mark, NOT the underlying price
//   7. equity leg uses multiplier 1
//   8. portfolio total = Σ per-row P&L, skips rows with a missing mark
//
// Run: node tests/portfolio-unrealized-pnl.test.js
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
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }
function near(a, b, eps, msg) { assert(a !== null && a !== undefined && Math.abs(a - b) < (eps || 0.001), msg + ' (got ' + a + ', want ' + b + ')'); }

const ctx = { console: { log() {}, warn() {}, debug() {} }, Number, Math, isFinite, parseFloat, String, Object };
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, '_portfolioFirstFiniteField'),
  extractFn(HTML, '_portfolioLegExplicitOpenQty'),
  extractFn(HTML, '_portfolioLegHasExplicitOpenQty'),
  extractFn(HTML, '_portfolioLegEffectiveQty'),
  extractFn(HTML, '_portfolioLegStatusForRisk'),
  extractFn(HTML, '_portfolioLegHasCloseMarker'),
  extractFn(HTML, '_isTerminalPortfolioLeg'),
  extractFn(HTML, '_portfolioTradeIsOpenForRisk'),
  extractFn(HTML, 'isActivePortfolioLeg'),
  extractFn(HTML, '_legUnrealizedPnL'),
  extractFn(HTML, 'computePositionUnrealizedPnL'),
  extractFn(HTML, 'computePortfolioUnrealizedPnL'),
].join('\n'), ctx);

function pos(over) {
  return Object.assign({ status: 'OPEN', legs: [], legsLive: [] }, over || {});
}

// ── 1. short put entry 3.87, mark 2.00, qty 1 → +187 ─────────────────────────
(function() {
  const p = pos({ legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }], legsLive: [{ currentPrice: 2.00 }] });
  near(ctx.computePositionUnrealizedPnL(p), 187, 0.001, '1: SHORT put 3.87→2.00 = +187');
  near(ctx._legUnrealizedPnL(p.legs[0], 2.00), 187, 0.001, '1: _legUnrealizedPnL SHORT put = +187');
  console.log('✓ 1 short put entry 3.87, mark 2.00 → +187');
})();

// ── 2. short put entry 3.87, mark 5.00, qty 1 → -113 ─────────────────────────
(function() {
  const p = pos({ legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }], legsLive: [{ currentPrice: 5.00 }] });
  near(ctx.computePositionUnrealizedPnL(p), -113, 0.001, '2: SHORT put 3.87→5.00 = -113 (loss when mark rises)');
  console.log('✓ 2 short put entry 3.87, mark 5.00 → -113');
})();

// ── 3. long call entry 2.00, mark 3.50, qty 1 → +150 ─────────────────────────
(function() {
  const p = pos({ legs: [{ type: 'CALL', side: 'LONG', entryPrice: 2.00, qty: 1 }], legsLive: [{ currentPrice: 3.50 }] });
  near(ctx.computePositionUnrealizedPnL(p), 150, 0.001, '3: LONG call 2.00→3.50 = +150');
  console.log('✓ 3 long call entry 2.00, mark 3.50 → +150');
})();

// ── 4. multi-leg: short put spread sums leg-level P&L ─────────────────────────
(function() {
  // Short 3.87 → 2.00 (+187), Long protective 1.20 → 0.60 (-60). Net = +127.
  const p = pos({
    legs: [
      { type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 },
      { type: 'PUT', side: 'LONG',  entryPrice: 1.20, qty: 1 },
    ],
    legsLive: [{ currentPrice: 2.00 }, { currentPrice: 0.60 }],
  });
  near(ctx.computePositionUnrealizedPnL(p), 127, 0.001, '4: spread sum = +187 + (-60) = +127');
  console.log('✓ 4 multi-leg sums leg-level P&L (+127)');
})();

// ── 5. missing current mark → null (row shows "--") ──────────────────────────
(function() {
  const p = pos({ legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }], legsLive: [{ currentPrice: null }] });
  assert(ctx.computePositionUnrealizedPnL(p) === null, '5a: null currentPrice → null (--)');
  const p2 = pos({ legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }], legsLive: [] });
  assert(ctx.computePositionUnrealizedPnL(p2) === null, '5b: no legsLive entry → null (--)');
  // One leg with a mark, one without → incomplete → null (never a partial number).
  const p3 = pos({
    legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }, { type: 'PUT', side: 'LONG', entryPrice: 1.2, qty: 1 }],
    legsLive: [{ currentPrice: 2.00 }, { currentPrice: null }],
  });
  assert(ctx.computePositionUnrealizedPnL(p3) === null, '5c: one leg missing mark → null (no partial)');
  assert(ctx._legUnrealizedPnL({ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }, null) === null, '5d: _legUnrealizedPnL null mark → null');
  assert(ctx._legUnrealizedPnL({ type: 'PUT', side: 'SHORT', qty: 1 }, 2.00) === null, '5e: missing entryPrice → null');
  console.log('✓ 5 missing current mark → -- (null, never partial/invented)');
})();

// ── 6. option P&L uses the LEG mark, NOT the underlying price ─────────────────
(function() {
  // Underlying is 250 but the option leg mark is 2.00. Result must reflect the 2.00
  // option mark (+187), proving the underlying price is never used for option P&L.
  const p = pos({
    legs: [{ type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 }],
    legsLive: [{ currentPrice: 2.00 }],
    underlyingPrice: 250, underlyingPriceSource: 'DXLink',
  });
  const r = ctx.computePositionUnrealizedPnL(p);
  near(r, 187, 0.001, '6: uses option mark 2.00 → +187');
  assert(Math.abs(r) < 1000, '6: result is option-scale, not underlying-scale (250 would blow up)');
  console.log('✓ 6 option P&L uses the leg mark, never the underlying price');
})();

// ── 7. equity leg uses multiplier 1 ──────────────────────────────────────────
(function() {
  // Long 100 shares entry 100 → mark 105 = +5 * 100sh * 1 = +500.
  const p = pos({ legs: [{ type: 'EQUITY', side: 'LONG', entryPrice: 100, qty: 100 }], legsLive: [{ currentPrice: 105 }] });
  near(ctx.computePositionUnrealizedPnL(p), 500, 0.001, '7: equity mult=1 → +500');
  // Same numbers as an option would be ×100 the shares — confirm equity is NOT ×100.
  near(ctx._legUnrealizedPnL({ type: 'CALL', side: 'LONG', entryPrice: 100, qty: 100 }, 105), 50000, 0.001, '7: option mult=100 (contrast)');
  console.log('✓ 7 equity multiplier 1 (options ×100)');
})();

// ── 8. portfolio total = Σ per-row P&L, skips rows with a missing mark ────────
(function() {
  const rows = [
    { unrealizedPnL: 187 },
    { unrealizedPnL: -113 },
    { unrealizedPnL: null },        // missing mark → skipped
  ];
  near(ctx.computePortfolioUnrealizedPnL(rows), 74, 0.001, '8: total 187 + (-113) = +74 (null skipped)');
  assert(ctx.computePortfolioUnrealizedPnL([{ unrealizedPnL: null }, {}]) === null, '8: all-missing → null (--)');
  assert(ctx.computePortfolioUnrealizedPnL([]) === null, '8: empty → null');
  console.log('✓ 8 portfolio total sums rows, skips missing, null when none');
})();

// ── 9. inactive / terminal legs excluded from position P&L ───────────────────
(function() {
  // A CLOSED leg must not contribute; only the active leg counts.
  const p = pos({
    legs: [
      { type: 'PUT', side: 'SHORT', entryPrice: 3.87, qty: 1 },
      { type: 'PUT', side: 'SHORT', entryPrice: 9.99, qty: 1, status: 'CLOSED' },
    ],
    legsLive: [{ currentPrice: 2.00 }, { currentPrice: 1.00, priceSource: 'terminal_leg_placeholder' }],
  });
  near(ctx.computePositionUnrealizedPnL(p), 187, 0.001, '9: terminal leg excluded → +187 only');
  console.log('✓ 9 terminal/inactive legs excluded from P&L');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
