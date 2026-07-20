'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — SQZ / SQUEEZE display contract (regression guard for #287/#289).
//
//   1. entrySnapshot.tech1d.squeeze=false → OFF   (false is a REAL state, not "--")
//   2. entrySnapshot.tech1d.squeeze=true  → ACTIVE (ON)
//   3. missing squeeze → null (renders "--")
//   4. flat squeeze1d/squeeze4h fields are honored (backend round-trip resilience)
//   5. 1D preferred over 4H; 4H used when 1D absent
//   6. NON-REGRESSION: SQZ false must never collapse to "--"
//   7. live squeeze overrides the snapshot in _tradeAsPosition (static wiring guard)
//   8. render maps ACTIVE→ON, OFF→OFF, null→-- (static guard)
//
// Run: node tests/portfolio-squeeze-display.test.js
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
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }

const ctx = { console: { log() {}, warn() {} }, Number, Math, isFinite, String, Object };
vm.createContext(ctx);
vm.runInContext(extractFn(HTML, '_snapshotSqueezeState'), ctx);
const sq = ctx._snapshotSqueezeState;

// ── 1. tech1d.squeeze=false → OFF ────────────────────────────────────────────
assert(sq({ tech1d: { squeeze: false } }) === 'OFF', '1: tech1d false → OFF');
// ── 2. tech1d.squeeze=true → ACTIVE ──────────────────────────────────────────
assert(sq({ tech1d: { squeeze: true } }) === 'ACTIVE', '2: tech1d true → ACTIVE');
// ── 3. missing squeeze → null (--) ───────────────────────────────────────────
assert(sq({}) === null, '3a: no squeeze flag → null');
assert(sq(null) === null, '3b: no snapshot → null');
assert(sq({ tech1d: {} }) === null, '3c: tech1d without boolean → null');
// ── 4. flat squeeze1d/squeeze4h honored ──────────────────────────────────────
assert(sq({ squeeze1d: false }) === 'OFF', '4a: flat squeeze1d=false → OFF');
assert(sq({ squeeze1d: true }) === 'ACTIVE', '4b: flat squeeze1d=true → ACTIVE');
assert(sq({ squeeze4h: false }) === 'OFF', '4c: flat squeeze4h=false → OFF (1D absent)');
// nested tech object still wins over the flat field
assert(sq({ tech1d: { squeeze: true }, squeeze1d: false }) === 'ACTIVE', '4d: nested tech1d wins over flat');
// ── 5. 1D preferred; 4H fallback ─────────────────────────────────────────────
assert(sq({ tech1d: { squeeze: false }, tech4h: { squeeze: true } }) === 'OFF', '5a: 1D preferred (OFF) over 4H (ON)');
assert(sq({ tech4h: { squeeze: true } }) === 'ACTIVE', '5b: 4H used when 1D absent');
// ── 6. NON-REGRESSION: false never "--" ──────────────────────────────────────
assert(sq({ tech1d: { squeeze: false }, tech4h: { squeeze: false } }) === 'OFF', '6: both false → OFF (never --)');
console.log('✓ 1-6 squeeze snapshot state: false=OFF, true=ACTIVE, missing=--, flat fallback');

// ── 7. live squeeze overrides snapshot in _tradeAsPosition (static wiring) ────
(function() {
  const proj = HTML.slice(HTML.indexOf('function _tradeAsPosition(t)'), HTML.indexOf('function _tradeAsPosition(t)') + 3200);
  assert(/squeeze:\s*\(live\.squeeze != null\)/.test(proj), '7a: squeeze uses (live.squeeze != null) — false=OFF preserved, no `|| null` collapse');
  assert(proj.indexOf('snap.squeeze != null') !== -1, '7b: snapshot squeeze fallback also tests != null');
  console.log('✓ 7 live squeeze overrides snapshot; false never collapses to --');
})();

// ── 8. render maps ACTIVE→ON, OFF→OFF, null→-- (static guard) ─────────────────
(function() {
  const i = HTML.indexOf("var sqzHtml = '<span class=\"live-stub\">--</span>';");
  assert(i !== -1, '8a: sqz render defaults to -- stub');
  const block = HTML.slice(i, i + 900);
  assert(/pos\.squeeze === 'ACTIVE'/.test(block), '8b: ACTIVE branch present');
  assert(/pos\.squeeze === 'OFF'/.test(block), '8c: OFF branch present (dimmed OFF, not --)');
  assert(block.indexOf('>ON<') !== -1 && block.indexOf('>OFF<') !== -1, '8d: renders ON and OFF badges');
  console.log('✓ 8 render: ACTIVE→ON, OFF→OFF, null→--');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
