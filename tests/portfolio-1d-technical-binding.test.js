'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — expanded row 1D "Technical Analysis" panel binding (regression).
//
// Bug: the expanded Portfolio row 1D panel showed "QQQ 1D unavailable from
// backend." even though the aggregated PortfolioTechnical refresh had already
// mapped 1D technical fields for QQQ into S.backendTechnicalByTicker (logged as
// "[PortfolioTechnical] mapping applied count=12"). This is a frontend read/binding
// issue — the data was in memory but the panel never read it.
//
// This guards the binding/read-path correction (NOT a data-generation change):
//   1. ticker normalization: QQQ / qqq / ".QQQ250117C..." / "QQQ  250117C..." → QQQ
//   2. _pfBackendTechnical1D reads the mapped in-memory object for the row ticker
//   3. _pfRenderBackendTechnical1DPanel renders that mapped 1D data …
//   4. … and does NOT emit "QQQ 1D unavailable from backend"
//   5. when the cache truly lacks 1D data, it returns null (caller shows unavailable)
//   6. the read path opens NO fetch / DXLink subscription / candle fan-out
//
// Run: node tests/portfolio-1d-technical-binding.test.js
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

// ── Sandbox: mapped PortfolioTechnical state for QQQ with real 1D fields ───────
// Any call to fetch / a DXLink subscription / candle loaders throws, so the read
// path (req #6/#7/#8: in-memory only) is proven not to fan out on panel expansion.
function boom(name) { return function () { throw new Error('unexpected call: ' + name); }; }

const S = {
  backendTechnicalByTicker: {
    QQQ: {
      timeframe: '1D',
      rsi14: 57.3,
      sma8: 512.1, sma20: 505.4, sma200: 470.8,
      bbUpper: 520.0, bbMiddle: 505.4, bbLower: 490.8,
      squeeze1d: 'OFF',
      source: 'BACKEND_TECHNICAL_REFRESH'
    }
    // Note: no SPY, no MSFT — used to prove the "truly missing" fallback below.
  }
};

const ctx = {
  console: { log() {}, warn() {}, debug() {}, error() {} },
  Number, Math, isFinite, parseFloat, String, Object,
  S,
  fetch: boom('fetch'),
  ttCall: boom('ttCall'),
  getDailyCandles: boom('getDailyCandles'),
  getFourHourCandles: boom('getFourHourCandles'),
  postCandleContext: boom('postCandleContext'),
};
vm.createContext(ctx);

vm.runInContext(extractFn(HTML, '_pfNormalizeTechnicalTicker'), ctx);
vm.runInContext(extractFn(HTML, '_pfBackendTechnical1D'), ctx);
vm.runInContext(extractFn(HTML, '_pfFmtTechNum'), ctx);
vm.runInContext(extractFn(HTML, '_pfRenderBackendTechnical1DPanel'), ctx);

const norm   = ctx._pfNormalizeTechnicalTicker;
const read1d = ctx._pfBackendTechnical1D;
const render = ctx._pfRenderBackendTechnical1DPanel;

// ── 1. ticker normalization → QQQ ─────────────────────────────────────────────
assert(norm('QQQ') === 'QQQ',                    '1a: plain QQQ');
assert(norm('qqq') === 'QQQ',                    '1b: lowercase → uppercase');
assert(norm('  qqq  ') === 'QQQ',                '1c: trimmed');
assert(norm('.QQQ250117C00400000') === 'QQQ',    '1d: DXLink option streamer symbol → QQQ');
assert(norm('QQQ  250117C00400000') === 'QQQ',   '1e: OCC option symbol → QQQ');
assert(norm('QQQ250117P00400000') === 'QQQ',     '1f: compact option symbol → QQQ');

// ── 2. reads the mapped in-memory object for the row ticker ───────────────────
const t = read1d('QQQ');
assert(t && t.rsi14 === 57.3,   '2a: read1d("QQQ") returns the mapped object');
assert(read1d('.QQQ250117C00400000') === t, '2b: read via option streamer symbol resolves to QQQ');
assert(read1d('qqq') === t,     '2c: read via lowercase resolves to QQQ');

// ── 3. renders the mapped 1D data ─────────────────────────────────────────────
const html = render('QQQ');
assert(typeof html === 'string' && html.length > 0, '3a: render returns panel HTML');
assert(html.indexOf('RSI(14): 57.30') !== -1,       '3b: shows mapped RSI');
assert(html.indexOf('SMA20: 505.40') !== -1,        '3c: shows mapped SMA20');
assert(html.indexOf('490.80 / 520.00') !== -1,      '3d: shows mapped Bollinger band');
assert(html.indexOf('SQZ: OFF') !== -1,             '3e: shows mapped squeeze state (OFF is a real state)');
assert(html.indexOf('backend-derived') !== -1,      '3f: labels the source as backend-derived');

// ── 4. does NOT render the "unavailable" message when mapped data exists ──────
assert(html.indexOf('unavailable from backend') === -1, '4: no "unavailable from backend" when QQQ 1D is mapped');

// ── 5. truly-missing ticker → null (caller then shows unavailable) ────────────
assert(read1d('MSFT') === null,   '5a: read1d for un-mapped ticker → null');
assert(render('MSFT') === null,   '5b: render for un-mapped ticker → null (fallback to unavailable message)');
assert(read1d('') === null,       '5c: empty ticker → null');

// ── 6. read path opens no fetch / subscription / candle fan-out ───────────────
// The boom() stubs above throw if called; reaching here without a throw proves the
// binding is a pure in-memory read (req #6/#7/#8 — no new fetch on panel expansion).
let fannedOut = false;
try { render('QQQ'); read1d('QQQ'); norm('.QQQ250117C00400000'); }
catch (e) { fannedOut = true; }
assert(!fannedOut, '6: 1D panel binding triggers no fetch / DXLink / candle fan-out');

// ── 7. static guard: _pfDrawTf consults the read path before "unavailable" ────
const drawTf = extractFn(HTML, '_pfDrawTf');
const bindIdx  = drawTf.indexOf('_pfRenderBackendTechnical1DPanel');
const unavIdx  = drawTf.indexOf('1D unavailable from backend');
assert(bindIdx !== -1,             '7a: _pfDrawTf calls _pfRenderBackendTechnical1DPanel');
assert(bindIdx < unavIdx,          '7b: read path is consulted BEFORE the unavailable fallback');

console.log((failed === 0 ? '✓ PASS' : '✗ FAIL') + ' — portfolio-1d-technical-binding: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
