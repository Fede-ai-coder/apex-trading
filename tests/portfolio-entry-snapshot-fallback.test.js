'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO ENTRY-SNAPSHOT FALLBACK — greeks/IVR/beta/earnings/squeeze mapping.
//
// Regression: after a backend-OK save, a Portfolio position lost Beta, βΔ WTD,
// IVR precision, Earnings and (critically) SQZ, and could blank greeks whenever
// live DXLink/underlying enrichment was unavailable. Root cause: _tradeAsPosition
// projected greeks/beta/IVR/earnings/squeeze ONLY from t.live (and top-level
// t.*), NEVER from the entrySnapshot that _buildRichSnapshot had correctly
// captured at entry — and `squeeze: live.squeeze || null` collapsed the real
// state `false` ("OFF") to null ("--").
//
// This suite pins the fallback contract (pure helpers _positionFieldsFromSnapshot
// + _snapshotSqueezeState), reusing the app's existing scale/format helpers:
//   • delta/theta → normalizeGreekPoints (per-share aggregate → net, ×100 for ≤1)
//   • gamma/vega  → raw (aggregateGreeks adds these un-normalized)
//   • ivRank      → normalizeIvrPercent (ratios < 2 scale ×100: 1.04 → 104,
//                   0.65 → 65 — see the "IVR: 1" fix pinned by
//                   tests/portfolio-ivr-beta-normalization.test.js)
//   • squeeze     → boolean tech1d/tech4h → 'ACTIVE'/'OFF' ('false' is OFF, not --)
//   • beta/earnings → passed through; NEVER invented (absent stays absent)
//
// Run: node tests/portfolio-entry-snapshot-fallback.test.js
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

const ctx = { console: { log() {}, warn() {} }, Number, Math, isFinite, String, Object };
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, 'normalizeGreekPoints'),
  extractFn(HTML, 'normalizeIvrPercent'),
  extractFn(HTML, '_snapshotSqueezeState'),
  extractFn(HTML, '_positionFieldsFromSnapshot'),
].join('\n'), ctx);

// The exact AMD SHORT PUT entry snapshot from the runtime report.
function amdSnapshot(over) {
  return Object.assign({
    delta: 0.1094924982372116,
    theta: 0.393302801926938,
    gamma: -0.001542473577948491,
    vega:  -0.273817444709586,
    vegaPut: -0.273817444709586,
    beta:  null,
    ivr:   1.04,
    ivSource: 'TASTYTRADE',
    ivrSource: 'TASTYTRADE',
    nextEarnings: null,
    earningsDate: null,
    tech1d: { squeeze: false },
    tech4h: { squeeze: false },
  }, over || {});
}

// ── 1. greeks: delta/theta net (×100), gamma/vega raw — matches the live path ─
(function() {
  const f = ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot() });
  near(f.delta, 10.94924982372116, 0.001, '1: delta 0.1094 → 10.95 net (normalizeGreekPoints ×100)');
  near(f.theta, 39.3302801926938, 0.001, '1: theta 0.3933 → 39.33 net (×100)');
  near(f.gamma, -0.001542473577948491, 1e-9, '1: gamma stays RAW (aggregateGreeks adds it un-normalized)');
  near(f.vega,  -0.273817444709586, 1e-9, '1: vega stays RAW');
  console.log('✓ 1 greeks: delta/theta ×100 net, gamma/vega raw (parity with live aggregation)');
})();

// ── 2. IVR uses the app's normalizer (ratio < 2 → ×100, documented convention) ─
(function() {
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot() }).ivRank === 104,
    '2: ivr 1.04 → 104 via normalizeIvrPercent (ratio < 2 scales ×100, never truncated to 1)');
  // 0–1 fraction form also normalizes to 0–100 with the same helper.
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot({ ivr: 0.65 }) }).ivRank === 65,
    '2: fractional ivr 0.65 → 65');
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot({ ivr: 42 }) }).ivRank === 42,
    '2: integer ivr 42 → 42');
  console.log('✓ 2 IVR normalized with the existing formatter (no truncation surprise)');
})();

// ── 3. squeeze: false → OFF, true → ACTIVE, missing → null ───────────────────
(function() {
  assert(ctx._snapshotSqueezeState({ tech1d: { squeeze: false } }) === 'OFF', '3: 1D false → OFF');
  assert(ctx._snapshotSqueezeState({ tech1d: { squeeze: true } })  === 'ACTIVE', '3: 1D true → ACTIVE');
  assert(ctx._snapshotSqueezeState({ tech4h: { squeeze: true } })  === 'ACTIVE', '3: falls back to 4H when 1D absent');
  assert(ctx._snapshotSqueezeState({}) === null, '3: no squeeze flag → null (renders "--")');
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot() }).squeeze === 'OFF',
    '3: AMD snapshot squeeze:false surfaces as OFF, not --');
  console.log('✓ 3 squeeze: false=OFF, true=ACTIVE, missing=--');
})();

// ── 4. beta: present passes through; absent NEVER invented ───────────────────
(function() {
  assert(!('beta' in ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot() })),
    '4: null beta is NOT emitted (row shows "—", not 0)');
  near(ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot({ beta: 1.23 }) }).beta, 1.23, 0.0001,
    '4: real beta passes through unchanged');
  console.log('✓ 4 beta present→used, absent→omitted (never invented)');
})();

// ── 5. earnings: present passes through; absent omitted ──────────────────────
(function() {
  assert(!('nextEarnings' in ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot() })),
    '5: absent earnings → omitted (row shows --)');
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot({ nextEarnings: '2026-08-05' }) }).nextEarnings === '2026-08-05',
    '5: nextEarnings passes through');
  assert(ctx._positionFieldsFromSnapshot({ entrySnapshot: amdSnapshot({ nextEarnings: null, earningsDate: '2026-08-06' }) }).nextEarnings === '2026-08-06',
    '5: earningsDate alias used when nextEarnings missing');
  console.log('✓ 5 earnings present→used (incl. earningsDate alias), absent→omitted');
})();

// ── 6. no snapshot / snake_case alias handling ───────────────────────────────
(function() {
  assert(JSON.stringify(ctx._positionFieldsFromSnapshot({})) === '{}', '6: no snapshot → empty (all fields fall through to null in _tradeAsPosition)');
  assert(ctx._positionFieldsFromSnapshot({ entry_snapshot: amdSnapshot() }).ivRank === 104,
    '6: snake_case entry_snapshot alias is read too (backend round-trip safety)');
  console.log('✓ 6 missing snapshot + entry_snapshot alias handled');
})();

// ── 7. static wiring guards on _tradeAsPosition + #287 intact ────────────────
(function() {
  const proj = HTML.slice(HTML.indexOf('function _tradeAsPosition(t)'), HTML.indexOf('function _tradeAsPosition(t)') + 2600);
  assert(proj.indexOf('_positionFieldsFromSnapshot(t)') !== -1, '7: _tradeAsPosition seeds snap from _positionFieldsFromSnapshot');
  assert(/squeeze:\s*\(live\.squeeze != null\)/.test(proj), '7: squeeze test uses != null (false=OFF preserved, no `|| null` collapse)');
  assert(proj.indexOf('snap.beta') !== -1 && proj.indexOf('snap.ivRank') !== -1 && proj.indexOf('snap.nextEarnings') !== -1,
    '7: beta/ivRank/nextEarnings fall back to snapshot');
  assert(proj.indexOf('snap.delta') !== -1 && proj.indexOf('snap.theta') !== -1 && proj.indexOf('snap.gamma') !== -1 && proj.indexOf('snap.vega') !== -1,
    '7: greeks fall back to snapshot');
  // live precedence must be preserved (live wins over snapshot)
  assert(/delta:\s*live\.delta\s*!== undefined \? live\.delta/.test(proj), '7: live greeks still win over snapshot');

  // #287 backend-save-confirm path untouched.
  const submit = extractFn(HTML, 'submitTrade');
  assert(submit.indexOf('_awaitJournalBackendWrite') !== -1 && submit.indexOf('_journalOutcomeToast') !== -1,
    '7: #287 backend-save-confirm flow still wired');
  console.log('✓ 7 static guards: snapshot wiring, false=OFF, live precedence, #287 intact');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
