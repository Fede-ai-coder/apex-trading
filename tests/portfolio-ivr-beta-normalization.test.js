'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio / Journals — IVR normalization + Beta fallback audit.
//
// Extracts the REAL helpers from index.html and runs them in a vm sandbox to prove
// the IVR=1 regression is fixed and beta falls back to the entry snapshot:
//
//   A. normalizeIvrPercent scales a Tastytrade ratio > 1 to percent
//        1.023 → 102.3, 1.04 → 104, 0.52 → 52   (NOT truncated to 1)
//   B. normalizeIvrPercent does NOT re-multiply an already-formatted percent
//        102.3 → 102.3, 65 → 65, 12 → 12
//   C. backend-mangled AMD value 1.02 renders ~102, never 1
//   D. non-finite / null input → null
//   E. computeRowBetaWeightedDelta uses entrySnapshot.beta when live beta is missing
//   F. beta missing everywhere → beta null, βΔ null (renderer shows "—", never 0)
//   G. βΔ WTD is computed only when beta is present
//   H. static guards: _buildRichSnapshot persists a normalized entrySnapshot.ivr,
//      and the Portfolio row renders entrySnapshot.ivr as an IVR fallback.
//
// Run: node tests/portfolio-ivr-beta-normalization.test.js
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
function approx(a, b, eps) { return a != null && Math.abs(a - b) <= (eps || 1e-9); }

// ── Build a sandbox with the two extracted helpers + minimal stubs ──────────────
const sandbox = {
  console,
  // computeRowBetaWeightedDelta references these; with no legs / snapshot beta they
  // are never reached, but define safe stubs so the function body evaluates.
  _portfolioNetGreekFromActiveLegs: function () { return null; },
  isActivePortfolioLeg: function () { return true; },
  _scanDataField: function () { return null; },
};
vm.createContext(sandbox);
vm.runInContext(extractFn(HTML, 'normalizeIvrPercent'), sandbox);
vm.runInContext(extractFn(HTML, 'computeRowBetaWeightedDelta'), sandbox);
const { normalizeIvrPercent, computeRowBetaWeightedDelta } = sandbox;

// ── A. Tastytrade ratio > 1 → percent (the IVR=1 regression) ────────────────────
assert(approx(normalizeIvrPercent(1.023), 102.3), 'A1: 1.023 → 102.3 (got ' + normalizeIvrPercent(1.023) + ')');
assert(approx(normalizeIvrPercent(1.04), 104),    'A2: 1.04 → 104 (got ' + normalizeIvrPercent(1.04) + ')');
assert(approx(normalizeIvrPercent(0.52), 52),     'A3: 0.52 → 52 (got ' + normalizeIvrPercent(0.52) + ')');
assert(normalizeIvrPercent(1.04) !== 1,           'A4: 1.04 is NOT truncated to 1');
assert(normalizeIvrPercent(1.023) > 100,          'A5: 1.023 normalizes above 100, not to ~1');

// ── B. Already-formatted percent must not be re-multiplied ──────────────────────
assert(approx(normalizeIvrPercent(102.3), 102.3), 'B1: 102.3 stays 102.3 (got ' + normalizeIvrPercent(102.3) + ')');
assert(approx(normalizeIvrPercent(65), 65),       'B2: 65 stays 65');
assert(approx(normalizeIvrPercent(12), 12),       'B3: 12 stays 12 (0–100 source preserved)');
assert(approx(normalizeIvrPercent(85.5), 85.5),   'B4: 85.5 stays 85.5');

// ── C. Backend-mangled AMD (normalizeIvRank kept 1.023 as ~1.02) → ~102, never 1 ─
assert(normalizeIvrPercent(1.02) > 100,           'C1: backend-mangled 1.02 → ~102, never 1 (got ' + normalizeIvrPercent(1.02) + ')');
assert(normalizeIvrPercent(1.02) !== 1,           'C2: 1.02 not rendered as 1');

// ── D. Non-finite input → null (Number(null)===0 is finite → 0, as before) ──────
assert(normalizeIvrPercent(null) === 0,           'D1: null → 0 (Number(null) is finite 0, unchanged behavior)');
assert(normalizeIvrPercent(undefined) === null,   'D2: undefined → null');
assert(normalizeIvrPercent(NaN) === null,         'D3: NaN → null');
assert(normalizeIvrPercent('abc') === null,       'D4: "abc" → null');
assert(approx(normalizeIvrPercent('1.04'), 104),  'D5: numeric string "1.04" → 104');

// ── E. Beta falls back to entrySnapshot.beta when live beta is missing ──────────
const posSnapBeta = {
  ticker: 'AMD', delta: 10.95, beta: null, underlyingPrice: 140,
  legs: [], entrySnapshot: { beta: 1.85 },
};
const rowSnap = computeRowBetaWeightedDelta(posSnapBeta, 620);
assert(approx(rowSnap.beta, 1.85),                'E1: entrySnapshot.beta used when live beta null (got ' + rowSnap.beta + ')');
assert(rowSnap.missingReason === null,            'E2: no missing reason when snapshot beta present');
assert(approx(rowSnap.betaWeightedDelta, 10.95 * 1.85 * (140 / 620)),
                                                  'E3: βΔ = delta × beta × (price/spy) using snapshot beta');

// Live beta always wins over the snapshot fallback.
const posLiveBeta = Object.assign({}, posSnapBeta, { beta: 1.20 });
assert(approx(computeRowBetaWeightedDelta(posLiveBeta, 620).beta, 1.20),
                                                  'E4: live pos.beta wins over entrySnapshot.beta');

// ── F. Beta missing everywhere → beta null, βΔ null (never 0) ────────────────────
const posNoBeta = { ticker: 'AMD', delta: 10.95, beta: null, underlyingPrice: 140, legs: [], entrySnapshot: {} };
const rowNoBeta = computeRowBetaWeightedDelta(posNoBeta, 620);
assert(rowNoBeta.beta === null,                   'F1: beta null when no live/snapshot/scanData source');
assert(rowNoBeta.betaWeightedDelta === null,      'F2: βΔ null (renderer shows "—", never 0)');
assert(rowNoBeta.missingReason === 'beta',        'F3: missingReason names beta');

// ── G. βΔ WTD computed only when beta present ───────────────────────────────────
assert(computeRowBetaWeightedDelta({ ticker: 'X', delta: 5, beta: 1.1, underlyingPrice: 100, legs: [], entrySnapshot: {} }, 500).betaWeightedDelta !== null,
                                                  'G1: βΔ computed when beta present');
assert(computeRowBetaWeightedDelta({ ticker: 'X', delta: 5, beta: null, underlyingPrice: 100, legs: [], entrySnapshot: {} }, 500).betaWeightedDelta === null,
                                                  'G2: βΔ null when beta absent');

// ── H. Static guards on the source paths not reachable via the sandbox ──────────
// _buildRichSnapshot must persist a NORMALIZED entrySnapshot.ivr.
assert(/ivr:\s*ivr\s*!=\s*null\s*\?\s*normalizeIvrPercent\(ivr\)\s*:\s*null/.test(HTML),
                                                  'H1: _buildRichSnapshot stores normalizeIvrPercent(ivr) as entrySnapshot.ivr');
assert(/ivrRaw:\s*ivr/.test(HTML),                'H2: _buildRichSnapshot keeps ivrRaw for traceability');
// Portfolio row falls back to entrySnapshot.ivr when live pos.ivRank is missing.
assert(/pos\.entrySnapshot\s*&&\s*pos\.entrySnapshot\.ivr\s*!=\s*null\s*\?\s*normalizeIvrPercent\(pos\.entrySnapshot\.ivr\)/.test(HTML),
                                                  'H3: Portfolio row renders entrySnapshot.ivr fallback (normalized)');
// computeRowBetaWeightedDelta reads entrySnapshot.beta as a fallback.
assert(/pos\.entrySnapshot\.beta\s*!=\s*null\s*&&\s*isFinite\(pos\.entrySnapshot\.beta\)/.test(HTML),
                                                  'H4: computeRowBetaWeightedDelta reads entrySnapshot.beta fallback');

// ── Summary ─────────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES') + ` — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
