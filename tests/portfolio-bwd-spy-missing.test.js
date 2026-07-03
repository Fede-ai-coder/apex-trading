'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — βΔ WTD must survive a missing SPY price (+ SQZ mapping guards).
//
// Runtime regression (preview #290): AMD showed Beta 3.01 and Delta 10.9 but
// βΔ WTD "--" because GET /market/candles/SPY aborted → spyPrice missing → the
// SPY-normalized βΔ formula returned null. Fix: βΔ needs only delta AND beta; a
// missing SPY (or underlying) price falls back to the BASE βΔ = delta × beta.
//
//   1. beta 3.014956 + delta 10.94 + spyPrice missing → βΔ numeric (≈ 32.98)
//   2. beta missing + delta ok → βΔ null (--)
//   3. beta ok + delta missing → βΔ null (--)
//   4. SPY missing → base βΔ (unnormalized flag set), NOT null
//   5. normalized formula still used when both prices present
//   6. squeeze adapter: false→OFF, true→ACTIVE, missing→-- (technical-refresh)
//   7. static wiring: aggregateGreeks base fallback + priceMap squeeze + updateLive
//      non-destructive (a partial refresh never overwrites a valid value with null)
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

const AMD_BETA = 3.014956, AMD_DELTA = 10.94;

// ── 1. AMD: beta + delta present, SPY missing → βΔ numeric (base) ────────────
(function() {
  const row = ctx.computeRowBetaWeightedDelta({ ticker: 'AMD', delta: AMD_DELTA, beta: AMD_BETA, underlyingPrice: 165 }, null);
  near(row.betaWeightedDelta, AMD_DELTA * AMD_BETA, 0.01, '1: βΔ = base delta×beta ≈ 32.98');
  assert(row.betaWeightedDelta !== null, '1: βΔ is NOT -- when SPY missing');
  assert(row.beta === AMD_BETA, '1: AMD beta 3.014956 accepted (test 11)');
  console.log('✓ 1/11 beta 3.014956 + delta 10.94 + SPY missing → βΔ ≈ 32.98 (beta accepted)');
})();

// ── 2. beta missing + delta ok → βΔ -- ───────────────────────────────────────
(function() {
  const row = ctx.computeRowBetaWeightedDelta({ ticker: 'AMD', delta: AMD_DELTA, beta: null, underlyingPrice: 165 }, 500);
  assert(row.betaWeightedDelta === null && row.missingReason === 'beta', '2: beta missing → βΔ null + reason beta');
  console.log('✓ 2 beta missing + delta ok → βΔ -- (hard requirement)');
})();

// ── 3. beta ok + delta missing → βΔ -- ───────────────────────────────────────
(function() {
  const row = ctx.computeRowBetaWeightedDelta({ ticker: 'AMD', delta: null, beta: AMD_BETA, underlyingPrice: 165 }, 500);
  assert(row.betaWeightedDelta === null && row.missingReason === 'delta', '3: delta missing → βΔ null + reason delta');
  console.log('✓ 3 beta ok + delta missing → βΔ -- (hard requirement)');
})();

// ── 4. SPY missing → base βΔ, flagged unnormalized (not blanked) ─────────────
(function() {
  const noSpy = ctx.computeRowBetaWeightedDelta({ ticker: 'AMD', delta: AMD_DELTA, beta: AMD_BETA, underlyingPrice: 165 }, null);
  assert(noSpy.betaWeightedDeltaNormalized === false, '4: SPY missing → normalized flag false');
  assert(noSpy.spyMissing === true, '4: spyMissing flagged');
  assert(noSpy.spyPrice === null, '4: spyPrice echoes null');
  // Underlying missing (SPY present) also falls back to base.
  const noUnd = ctx.computeRowBetaWeightedDelta({ ticker: 'AMD', delta: AMD_DELTA, beta: AMD_BETA, underlyingPrice: null }, 500);
  near(noUnd.betaWeightedDelta, AMD_DELTA * AMD_BETA, 0.01, '4: underlying missing → base βΔ too');
  assert(noUnd.betaWeightedDeltaNormalized === false, '4: underlying missing → unnormalized');
  console.log('✓ 4 SPY/underlying missing → base βΔ, flagged unnormalized (only normalization degrades)');
})();

// ── 5. both prices present → SPY-normalized proprietary formula preserved ─────
(function() {
  // 10.94 × 3.014956 × (165/500) = base × 0.33 = 10.884…
  const row = ctx.computeRowBetaWeightedDelta({ ticker: 'AMD', delta: AMD_DELTA, beta: AMD_BETA, underlyingPrice: 165 }, 500);
  near(row.betaWeightedDelta, AMD_DELTA * AMD_BETA * (165 / 500), 0.01, '5: normalized formula = delta×beta×(price/spy)');
  assert(row.betaWeightedDeltaNormalized === true, '5: normalized flag true when both prices present');
  console.log('✓ 5 both prices present → SPY-normalized proprietary formula unchanged');
})();

// ── 6. squeeze adapter (technical-refresh) ───────────────────────────────────
(function() {
  assert(ctx._technicalTfSqueezeState({ squeeze: false }) === 'OFF', '6: technical squeeze=false → OFF');
  assert(ctx._technicalTfSqueezeState({ squeeze: true }) === 'ACTIVE', '6: technical squeeze=true → ACTIVE');
  assert(ctx._technicalTfSqueezeState({}) === null, '6: technical squeeze missing → -- (null)');
  assert(ctx._squeezeToState(false) === 'OFF', '6: false never collapses to --');
  console.log('✓ 6/7/8 technical-refresh squeeze: false=OFF, true=ACTIVE, missing=--');
})();

// ── 7. static wiring guards ──────────────────────────────────────────────────
(function() {
  // aggregateGreeks base fallback (SPY missing).
  assert(HTML.indexOf('activePositionDelta * pos.beta') !== -1, '7: aggregateGreeks has base βΔ fallback');
  assert(/betaWeightedDelta\s*=\s*delta\s*\*\s*beta/.test(HTML) || HTML.indexOf('betaWeightedDelta = delta * beta') !== -1, '7: row base βΔ = delta×beta');
  // Diagnostic log line the task asked for.
  assert(HTML.indexOf('[PORTFOLIO BWD] beta/delta ok but') !== -1, '7: BWD unnormalized diagnostic present');
  // priceMap squeeze from technical-refresh + centralized candle fallback.
  assert(HTML.indexOf('priceMap[t].squeeze   = sq;') !== -1, '7: technical-refresh squeeze → priceMap');
  assert(HTML.indexOf('_getTechForTF(t, ') !== -1, '7: centralized candle-buffer squeeze fallback wired');
  // updateLive non-destructive: only writes fields that are !== undefined.
  // Anchor on the real journalManager.updateLive body (the positionManager one is a
  // thin delegating wrapper) via a field only that body contains.
  const ulStart = HTML.indexOf('if (data.unrealizedPnL');
  const ul = HTML.slice(ulStart, ulStart + 1600).replace(/\s+/g, ' ');
  assert(ulStart !== -1, '7: updateLive method present');
  assert(/if \(data\.squeeze\s*!== undefined\) trade\.live\.squeeze\s*= data\.squeeze;/.test(ul), '7: updateLive squeeze guarded by !== undefined (partial refresh safe)');
  assert(/if \(data\.beta\s*!== undefined\) trade\.live\.beta\s*= data\.beta;/.test(ul), '7: updateLive beta guarded (aborted refresh never nulls a valid beta)');
  console.log('✓ 7 static wiring: aggregate base βΔ, diagnostic, priceMap squeeze, non-destructive updateLive');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
