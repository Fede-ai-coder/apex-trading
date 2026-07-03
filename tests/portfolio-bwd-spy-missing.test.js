'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — βΔ WTD vs βΔ SPY-EQ are TWO distinct metrics (never mixed).
//
//   βΔ WTD    = delta × beta                              (needs delta + beta only;
//                                                          independent of SPY price)
//   βΔ SPY-EQ = delta × beta × (underlyingPrice / spyPrice)  (needs ALL four inputs;
//                                                          "--" when SPY missing,
//                                                          NO fallback to βΔ WTD)
//
//   1. beta 3.014956, delta 10.94, SPY missing → βΔ WTD = 32.98
//   2. same case                               → βΔ SPY-EQ = --
//   3. beta 3.014956, delta 10.94, underlying 519, SPY 625 → βΔ SPY-EQ ≈ 27.4
//   4. beta missing  → BOTH --
//   5. delta missing → BOTH --
//   6. the two fields never substitute for each other (same field, one formula)
//   7. SQZ mapping + non-destructive updateLive guards (unchanged from prior fix)
//
// Run: node tests/portfolio-bwd-spy-missing.test.js
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
function near(a, b, eps, msg) { assert(a !== null && a !== undefined && Math.abs(a - b) < (eps || 0.01), msg + ' (got ' + a + ', want ' + b + ')'); }

const ctx = { console: { log() {}, warn() {}, debug() {} }, Number, Math, isFinite, parseFloat, String, Object, Array, S: { scanData: [] } };
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
  extractFn(HTML, 'normalizeGreekPoints'),
  extractFn(HTML, '_portfolioNetGreekFromActiveLegs'),
  extractFn(HTML, '_scanDataField'),
  extractFn(HTML, 'computeRowBetaWeightedDelta'),
  extractFn(HTML, '_squeezeToState'),
  extractFn(HTML, '_technicalTfSqueezeState'),
].join('\n'), ctx);

const BETA = 3.014956, DELTA = 10.94;
const WTD = DELTA * BETA;                    // 32.98…
const row = (over, spy) => ctx.computeRowBetaWeightedDelta(Object.assign({ ticker: 'AMD' }, over), spy);

// ── 1. βΔ WTD = delta × beta, SPY missing → 32.98 ────────────────────────────
(function() {
  const r = row({ delta: DELTA, beta: BETA, underlyingPrice: 519 }, null);
  near(r.betaWeightedDeltaWtd, WTD, 0.01, '1: βΔ WTD = delta×beta = 32.98 (SPY missing)');
  near(r.betaWeightedDeltaWtd, 32.98, 0.01, '1: numeric 32.98');
  assert(r.wtdMissingReason === null, '1: βΔ WTD not missing');
  console.log('✓ 1 βΔ WTD = 32.98 with SPY missing');
})();

// ── 2. same case → βΔ SPY-EQ = -- ────────────────────────────────────────────
(function() {
  const r = row({ delta: DELTA, beta: BETA, underlyingPrice: 519 }, null);
  assert(r.betaWeightedDeltaSpyEq === null, '2: βΔ SPY-EQ null when SPY missing');
  assert(r.betaWeightedDelta === null, '2: alias betaWeightedDelta (SPY-EQ) also null');
  assert(r.missingReason === 'spyPrice', '2: SPY-EQ missingReason = spyPrice');
  console.log('✓ 2 βΔ SPY-EQ = -- with SPY missing (no fallback to βΔ WTD)');
})();

// ── 3. underlying 519, SPY 625 → βΔ SPY-EQ ≈ 27.4 ────────────────────────────
(function() {
  const r = row({ delta: DELTA, beta: BETA, underlyingPrice: 519 }, 625);
  near(r.betaWeightedDeltaSpyEq, WTD * (519 / 625), 0.01, '3: βΔ SPY-EQ = delta×beta×(519/625) ≈ 27.4');
  near(r.betaWeightedDeltaSpyEq, 27.39, 0.05, '3: numeric ≈ 27.4');
  // βΔ WTD is unchanged by SPY — still the simple product.
  near(r.betaWeightedDeltaWtd, WTD, 0.01, '3: βΔ WTD still = delta×beta (32.98)');
  console.log('✓ 3 βΔ SPY-EQ ≈ 27.4 (underlying 519, SPY 625); βΔ WTD unchanged');
})();

// ── 4. beta missing → BOTH -- ────────────────────────────────────────────────
(function() {
  const r = row({ delta: DELTA, beta: null, underlyingPrice: 519 }, 625);
  assert(r.betaWeightedDeltaWtd === null && r.wtdMissingReason === 'beta', '4: βΔ WTD -- (beta)');
  assert(r.betaWeightedDeltaSpyEq === null && r.missingReason === 'beta', '4: βΔ SPY-EQ -- (beta)');
  console.log('✓ 4 beta missing → both βΔ WTD and βΔ SPY-EQ = --');
})();

// ── 5. delta missing → BOTH -- ───────────────────────────────────────────────
(function() {
  const r = row({ delta: null, beta: BETA, underlyingPrice: 519 }, 625);
  assert(r.betaWeightedDeltaWtd === null && r.wtdMissingReason === 'delta', '5: βΔ WTD -- (delta)');
  assert(r.betaWeightedDeltaSpyEq === null && r.missingReason === 'delta', '5: βΔ SPY-EQ -- (delta)');
  console.log('✓ 5 delta missing → both = --');
})();

// ── 6. the fields never substitute for each other ────────────────────────────
(function() {
  // With SPY present the two values DIFFER (WTD is the un-normalized product); the
  // WTD field is never silently replaced by SPY-EQ or vice-versa.
  const r = row({ delta: DELTA, beta: BETA, underlyingPrice: 519 }, 625);
  assert(Math.abs(r.betaWeightedDeltaWtd - r.betaWeightedDeltaSpyEq) > 1, '6: WTD ≠ SPY-EQ (distinct formulas)');
  near(r.betaWeightedDeltaWtd, WTD, 0.01, '6: WTD is the simple product regardless of SPY availability');
  console.log('✓ 6 βΔ WTD and βΔ SPY-EQ are distinct fields, never mixed');
})();

// ── 7. SQZ mapping + non-destructive updateLive (carried forward) ─────────────
(function() {
  assert(ctx._technicalTfSqueezeState({ squeeze: false }) === 'OFF', '7: technical squeeze false → OFF');
  assert(ctx._technicalTfSqueezeState({ squeeze: true }) === 'ACTIVE', '7: technical squeeze true → ACTIVE');
  assert(ctx._technicalTfSqueezeState({}) === null, '7: technical squeeze missing → --');
  assert(HTML.indexOf('priceMap[t].squeeze   = sq;') !== -1, '7: technical-refresh squeeze → priceMap');
  assert(HTML.indexOf('_getTechForTF(t, ') !== -1, '7: centralized candle-buffer squeeze fallback wired');
  const ulStart = HTML.indexOf('if (data.unrealizedPnL');
  const ul = HTML.slice(ulStart, ulStart + 1600).replace(/\s+/g, ' ');
  assert(/if \(data\.squeeze\s*!== undefined\) trade\.live\.squeeze\s*= data\.squeeze;/.test(ul), '7: updateLive squeeze guarded (partial refresh safe)');
  assert(/if \(data\.beta\s*!== undefined\) trade\.live\.beta\s*= data\.beta;/.test(ul), '7: updateLive beta guarded (aborted refresh never nulls a valid beta)');
  console.log('✓ 7 SQZ mapping + non-destructive updateLive intact');
})();

// ── 8. render/UI static guards: two distinct columns + summary cards ─────────
(function() {
  assert(HTML.indexOf('>βΔ WTD</th>') !== -1 || HTML.indexOf('βΔ WTD</th>') !== -1, '8: βΔ WTD column header present');
  assert(HTML.indexOf('βΔ SPY-EQ</th>') !== -1, '8: βΔ SPY-EQ column header present');
  assert(HTML.indexOf('rowBwd.betaWeightedDeltaWtd') !== -1, '8: WTD column renders the simple field');
  assert(HTML.indexOf('rowBwd.betaWeightedDeltaSpyEq') !== -1, '8: SPY-EQ column renders the normalized field');
  assert(HTML.indexOf('totalBetaWeightedDeltaWtd') !== -1, '8: summary βΔ WTD total wired');
  console.log('✓ 8 distinct βΔ WTD + βΔ SPY-EQ columns/cards wired');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
