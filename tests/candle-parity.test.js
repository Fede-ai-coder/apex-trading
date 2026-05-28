'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Dev-only candle parity / debug tool — pure-helper validation.
//
// These tests extract the REAL parity helpers from index.html (no copies, so
// they cannot drift) and run them in a vm sandbox. They prove:
//   • symbol / timeframe normalization
//   • candle-time normalization (ISO strings + numeric ms/seconds)
//   • identical candle arrays compare as fully matched
//   • OHLC mismatch beyond tolerance is detected
//   • missing backend / missing frontend candles are counted
//   • warmup timeframe mapping (4H → 30M; never warms 4H directly)
//   • frontend 4H falls back to the existing RTH aggregation and returns a
//     clear "unavailable" reason when it can't be built (no invented logic)
//   • anti-regression: the parity helpers never reference Yahoo or /market/candles
//
// Run: node tests/candle-parity.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level `function NAME(...) {...}` by brace-matching. Skips braces
// inside strings, template literals, regex and comments so nested bodies are safe.
function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
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
  throw new Error('unterminated body: ' + name);
}

function stripComments(src) {
  let out = '', inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = 0; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      out += c;
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

const FNS = [
  '_apexParityNormSymbol', '_apexParityNormTimeframe', '_apexParityNormTime',
  '_apexParityNormCandle', '_apexParityNormCandleArray', '_apexCompareCandleArrays',
  '_apexParityFrontendCandles', '_apexParityWarmupTimeframes',
  '_buildRth4hCandles',
];

const sandbox = {
  console, Date, Math, JSON, Number, isFinite, parseFloat, parseInt,
  APEX_PARITY_TOL: 0.0001,
  _candleBuffer: {},
};
vm.createContext(sandbox);
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

// ── Test harness ───────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── 1. symbol normalization ──────────────────────────────────────────────────
section('1. symbol normalization');
ok(sandbox._apexParityNormSymbol(' spy ') === 'SPY', 'trims + uppercases');
ok(sandbox._apexParityNormSymbol('qqq') === 'QQQ', 'lowercases → upper');
ok(sandbox._apexParityNormSymbol(null) === '', 'null → empty string');

// ── 2. timeframe normalization ───────────────────────────────────────────────
section('2. timeframe normalization');
ok(sandbox._apexParityNormTimeframe('1d') === '1D', '1d → 1D');
ok(sandbox._apexParityNormTimeframe(' Daily ') === '1D', 'Daily → 1D');
ok(sandbox._apexParityNormTimeframe('30m') === '30M', '30m → 30M');
ok(sandbox._apexParityNormTimeframe('4h') === '4H', '4h → 4H');
ok(sandbox._apexParityNormTimeframe('1h') === null, '1H is not a supported parity TF → null');
ok(sandbox._apexParityNormTimeframe('') === null, 'empty → null');

// ── 3. candle-time normalization ─────────────────────────────────────────────
section('3. candle-time normalization');
const ms = Date.UTC(2024, 5, 12, 16, 0);
ok(sandbox._apexParityNormTime(ms) === ms, 'ms number passes through');
ok(sandbox._apexParityNormTime(Math.floor(ms / 1000)) === ms, 'seconds number → ms');
ok(sandbox._apexParityNormTime(String(ms)) === ms, 'numeric ms string → ms');
ok(sandbox._apexParityNormTime('2024-06-12T16:00:00.000Z') === ms, 'ISO string → ms');
ok(sandbox._apexParityNormTime('not-a-date') === null, 'garbage → null');
ok(sandbox._apexParityNormTime(null) === null, 'null → null');

// ── Fixtures ─────────────────────────────────────────────────────────────────
function bars(n, base) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = base + i;
    out.push({ t: ms + i * 86400000, o: c, h: c + 0.5, l: c - 0.5, c: c, v: 1000 });
  }
  return out;
}

// ── 4. identical arrays → fully matched ──────────────────────────────────────
section('4. identical candle arrays compare as matched');
{
  const a = bars(25, 100);
  const b = bars(25, 100);
  const r = sandbox._apexCompareCandleArrays(a, b, { tail: 20 });
  ok(r.parity.compared === 20, 'compared last 20');
  ok(r.parity.matched === 20, 'all 20 matched');
  ok(r.parity.mismatched === 0, 'no mismatches');
  ok(r.parity.missingFrontend === 0 && r.parity.missingBackend === 0, 'nothing missing');
  ok(r.parity.timeAlignment === 'ok', 'time alignment ok');
  ok(r.parity.maxAbsCloseDiff === 0, 'max close diff 0');
  ok(r.mismatches.length === 0, 'mismatch list empty');
}

// ── 5. OHLC mismatch beyond tolerance is detected ────────────────────────────
section('5. OHLC mismatch detected');
{
  const a = bars(25, 100);
  const b = bars(25, 100);
  b[b.length - 1].c = b[b.length - 1].c + 0.25; // perturb latest close
  const r = sandbox._apexCompareCandleArrays(a, b, { tail: 20 });
  ok(r.parity.mismatched === 1, 'one mismatch detected');
  ok(r.parity.matched === 19, '19 still matched');
  ok(Math.abs(r.parity.maxAbsCloseDiff - 0.25) < 1e-9, 'max close diff = 0.25');
  ok(r.mismatches.length === 1 && r.mismatches[0].diffs.close > 0.0001, 'mismatch row carries close diff');
}

// ── 5b. within-tolerance diff still matches ──────────────────────────────────
section('5b. tiny diff within tolerance still matches');
{
  const a = bars(22, 100);
  const b = bars(22, 100);
  b[b.length - 1].c = b[b.length - 1].c + 0.00005; // < 0.0001 tol
  const r = sandbox._apexCompareCandleArrays(a, b, { tail: 20 });
  ok(r.parity.mismatched === 0, 'sub-tolerance diff is not a mismatch');
}

// ── 6. missing backend / missing frontend ────────────────────────────────────
section('6. missing backend / frontend candles counted');
{
  const front = bars(20, 100);
  const back = front.slice(0, 18); // backend missing the latest 2 bars
  const r = sandbox._apexCompareCandleArrays(front, back, { tail: 20 });
  ok(r.parity.missingBackend === 2, 'two bars present in frontend only');
  ok(r.parity.timeAlignment !== 'ok', 'time alignment flagged when bars missing');
}
{
  const back = bars(20, 100);
  const front = back.slice(0, 18); // frontend missing the latest 2 bars
  const r = sandbox._apexCompareCandleArrays(front, back, { tail: 20 });
  ok(r.parity.missingFrontend === 2, 'two bars present in backend only');
}

// ── 6b. mixed candle shapes (ISO + open/close keys) normalize and match ──────
section('6b. backend ISO/open-close shape normalizes against frontend buffer shape');
{
  const front = bars(3, 50); // {t,o,h,l,c}
  const back = front.map((c) => ({
    time: new Date(c.t).toISOString(),
    open: c.o, high: c.h, low: c.l, close: c.c,
  }));
  const r = sandbox._apexCompareCandleArrays(front, back, { tail: 20 });
  ok(r.parity.compared === 3 && r.parity.matched === 3, 'cross-shape candles align + match');
}

// ── 7. warmup timeframe mapping ──────────────────────────────────────────────
section('7. warmup timeframe mapping (never warms 4H directly)');
ok(JSON.stringify(sandbox._apexParityWarmupTimeframes('1D')) === '["1D"]', '1D → [1D]');
ok(JSON.stringify(sandbox._apexParityWarmupTimeframes('30M')) === '["30M"]', '30M → [30M]');
ok(JSON.stringify(sandbox._apexParityWarmupTimeframes('4H')) === '["30M"]', '4H → [30M] (no direct 4H warmup)');

// ── 8. frontend candle source (existing buffer / RTH aggregation) ────────────
section('8. frontend candle source reuses existing DXLink state');
{
  sandbox._candleBuffer = { SPY: { '1D': bars(5, 400), '30M': [] } };
  const d = sandbox._apexParityFrontendCandles('spy', '1d');
  ok(d.source === 'FRONTEND_DXLINK_BUFFER' && d.candles.length === 5, '1D reads _candleBuffer directly');
  const empty = sandbox._apexParityFrontendCandles('NOPE', '1D');
  ok(empty.candles.length === 0 && !empty.unavailable, 'missing symbol → empty (count 0), not unavailable');
}

// ── 8b. 4H unavailable returns a clear reason (no invented aggregation) ───────
section('8b. frontend 4H unavailable reason when RTH aggregation cannot build');
{
  sandbox._candleBuffer = { SPY: { '30M': [] } }; // not enough 30M bars for RTH 4H
  const r = sandbox._apexParityFrontendCandles('SPY', '4H');
  ok(r.unavailable === true, '4H marked unavailable');
  ok(r.source === 'FRONTEND_DXLINK_RTH_4H', '4H source labelled RTH');
  ok(/_buildRth4hCandles/.test(r.reason) || /RTH/.test(r.reason), 'reason references the existing RTH helper');
}

// ── 9. anti-regression: helpers never touch Yahoo or /market/candles ─────────
section('9. parity helpers contain no Yahoo / /market/candles data access');
[
  '_apexParityNormSymbol', '_apexParityNormTimeframe', '_apexParityNormTime',
  '_apexParityNormCandle', '_apexParityNormCandleArray', '_apexCompareCandleArrays',
  '_apexParityFrontendCandles', '_apexParityWarmupTimeframes',
].forEach((n) => {
  const body = stripComments(extractFn(HTML, n));
  ok(!/yahoo/i.test(body), n + ' contains no "yahoo"');
  ok(!/\/market\/candles/.test(body), n + ' never references /market/candles');
});

// The async orchestrator + fetch helpers may reference the dev endpoints only.
section('9b. backend access is restricted to the dev DXLink endpoints');
{
  const orch = stripComments(extractFn(HTML, 'apexDebugCompareCandles'))
    + stripComments(extractFn(HTML, '_apexParityFetchBackend'))
    + stripComments(extractFn(HTML, '_apexParityWarmupBackend'));
  ok(!/yahoo/i.test(orch), 'orchestrator contains no "yahoo"');
  // /market/candles is forbidden, but /dev/market/candles-dxlink/ is allowed.
  ok(!/\/market\/candles(?!-dxlink)/.test(orch), 'orchestrator never calls /market/candles');
  ok(/\/dev\/market\/candles-dxlink\//.test(orch), 'orchestrator uses /dev/market/candles-dxlink/');
  ok(!/new WebSocket/.test(orch), 'orchestrator opens no WebSocket');
}

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
