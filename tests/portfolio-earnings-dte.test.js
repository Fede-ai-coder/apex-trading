'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — Next earnings date + earnings DTE.
//
//   1. upcoming date → positive DTE (calendar days from today)
//   2. DTE computed correctly for a known offset
//   3. missing / null date → null (renders "--")
//   4. PAST earnings date → NEGATIVE DTE (NOT shown as a next earnings)
//      — computeEarningsDte is SIGNED, unlike computeDTE which clamps to 0
//   5. entrySnapshot earnings fallback (_positionFieldsFromSnapshot) works
//   6. no fake earnings — absent date is never invented
//   7. render (static guard): past date hidden, present-but-unparseable shows date + DTE --
//
// Dates are built relative to "today" so the suite is stable on any run date.
//
// Run: node tests/portfolio-earnings-dte.test.js
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

const ctx = { console: { log() {}, warn() {} }, Number, Math, isFinite, parseFloat, String, Object, Date, isNaN };
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, 'normalizeGreekPoints'),
  extractFn(HTML, 'normalizeIvrPercent'),
  extractFn(HTML, '_snapshotSqueezeState'),
  extractFn(HTML, '_positionFieldsFromSnapshot'),
  extractFn(HTML, 'computeEarningsDte'),
].join('\n'), ctx);

function isoOffset(days) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── 1. upcoming date → positive DTE ──────────────────────────────────────────
(function() {
  const dte = ctx.computeEarningsDte(isoOffset(30));
  assert(dte === 30, '1: +30d date → DTE 30 (got ' + dte + ')');
  console.log('✓ 1 upcoming earnings date → positive DTE');
})();

// ── 2. DTE computed correctly for several offsets ────────────────────────────
(function() {
  assert(ctx.computeEarningsDte(isoOffset(0)) === 0, '2a: today → 0');
  assert(ctx.computeEarningsDte(isoOffset(1)) === 1, '2b: tomorrow → 1');
  assert(ctx.computeEarningsDte(isoOffset(7)) === 7, '2c: +7d → 7');
  assert(ctx.computeEarningsDte(isoOffset(120)) === 120, '2d: +120d → 120');
  console.log('✓ 2 DTE computed correctly (calendar days)');
})();

// ── 3. missing / null / unparseable → null ───────────────────────────────────
(function() {
  assert(ctx.computeEarningsDte(null) === null, '3a: null → null');
  assert(ctx.computeEarningsDte(undefined) === null, '3b: undefined → null');
  assert(ctx.computeEarningsDte('') === null, '3c: empty string → null');
  assert(ctx.computeEarningsDte('not-a-date') === null, '3d: unparseable → null');
  console.log('✓ 3 missing / unparseable earnings → null (--)');
})();

// ── 4. PAST date → negative DTE (not a next earnings) ────────────────────────
(function() {
  const dte = ctx.computeEarningsDte(isoOffset(-5));
  assert(dte === -5, '4a: -5d past date → DTE -5 (signed, NOT clamped to 0)');
  assert(ctx.computeEarningsDte(isoOffset(-1)) === -1, '4b: yesterday → -1');
  // The render only shows DTE >= 0, so a negative result is hidden — proven here by sign.
  assert(ctx.computeEarningsDte(isoOffset(-90)) < 0, '4c: -90d clearly negative (hidden as next)');
  console.log('✓ 4 past earnings date → negative DTE (hidden, never shown as next)');
})();

// ── 5. entrySnapshot earnings fallback ───────────────────────────────────────
(function() {
  const future = isoOffset(45);
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: { nextEarnings: future } }).nextEarnings === future,
    '5a: nextEarnings from snapshot');
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: { earningsDate: future } }).nextEarnings === future,
    '5b: earningsDate alias used when nextEarnings absent');
  // DTE derivable from the fallback date.
  assert(ctx.computeEarningsDte(ctx._positionFieldsFromSnapshot({ entrySnapshot: { nextEarnings: future } }).nextEarnings) === 45,
    '5c: DTE computed from snapshot fallback date');
  console.log('✓ 5 entrySnapshot earnings fallback + DTE from it');
})();

// ── 6. no fake earnings — absent never invented ──────────────────────────────
(function() {
  assert(!('nextEarnings' in ctx._positionFieldsFromSnapshot({ entrySnapshot: { nextEarnings: null, earningsDate: null } })),
    '6a: absent earnings → field omitted (row shows --)');
  assert(!('nextEarnings' in ctx._positionFieldsFromSnapshot({ entrySnapshot: {} })), '6b: empty snapshot → no earnings');
  console.log('✓ 6 no fake earnings (absent stays absent)');
})();

// ── 7. render static guards ──────────────────────────────────────────────────
(function() {
  const i = HTML.indexOf('var earnDays = computeEarningsDte(pos.nextEarnings);');
  assert(i !== -1, '7a: render uses computeEarningsDte (signed) — not the clamped computeDTE');
  const block = HTML.slice(i - 120, i + 900);
  assert(/earnDays >= 0/.test(block), '7b: only shows DTE >= 0 (upcoming)');
  assert(/earnDays === null/.test(block), '7c: handles unparseable date (DTE null → show date + --)');
  assert(block.indexOf('&middot; --') !== -1, '7d: present-but-uncomputable renders date + "--"');
  // Snapshot builder evicts past earnings (dte < 0 → not persisted as next).
  assert(HTML.indexOf('[EARNINGS] date is past') !== -1, '7e: _buildRichSnapshot skips past earnings dates');
  console.log('✓ 7 render: past hidden, unparseable shows date + DTE --, builder evicts past');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
