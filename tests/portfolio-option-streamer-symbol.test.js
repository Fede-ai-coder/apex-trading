'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio option streamer-symbol contract test.
//
// Pins the EXACT DXLink/Tastytrade option symbol the frontend generates for
// portfolio option legs, so the backend (apex-backend PR #140,
// `buildDxlinkOptionStreamerSymbol()` + POST /portfolio/:id/positions/enriched)
// can be validated 1:1 against it.
//
// The frontend keys `aggregatedResp.options[sym]` by the output of
// getPreferredOptionDxlinkSymbol() — which resolves to
// buildCompactOptionDxlinkSymbol(). If the backend emits a different key
// (padded OCC form, stripped dotted root, or .500 fractional strike), the
// frontend lookup in refreshPositionsLive() silently misses and Greeks stay
// empty. This test extracts the REAL functions from index.html and asserts
// their output for real tickers.
//
// Run: node tests/portfolio-option-streamer-symbol.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
function eq(actual, expected, msg) {
  if (actual === expected) { passed++; }
  else { failed++; console.error('  ✗ ' + msg + '\n      expected: ' + JSON.stringify(expected) + '\n      got:      ' + JSON.stringify(actual)); }
}
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); }
}

// ── Load the REAL symbol builders from index.html into a sandbox ──────────────
const ctx = { console, S: { debugPortfolioRefresh: false } };
vm.createContext(ctx);
[
  'buildStreamerSymbol',
  'buildCompactOptionDxlinkSymbol',
  'buildOptionDxlinkSymbolCandidate',
  'isOptionStreamerSymbolConsistent',
  'getPreferredOptionDxlinkSymbol',
  'parseCompactOptionDxlinkSymbol',
  'normalizeOptionLegSymbolAliases',
  'optionLegScalarDiagnostics',
  'buildPortfolioLiveRefreshPayload',
].forEach(function (n) { vm.runInContext(extractFn(HTML, n), ctx); });

function leg(type, strike, expiry) {
  return { type: type, strike: strike, expiry: expiry, expiration: expiry };
}

// ── 1. Canonical streamer symbol for real tickers ────────────────────────────
// These are the EXACT keys the backend `options` map MUST use.
console.log('\n[1] Canonical option symbol — real tickers (SPY/IWM/CSCO/BABA/QQQ)');
const REAL_CASES = [
  // ticker, type, strike, expiry, expected canonical symbol
  ['SPY',  'CALL', 825,   '2026-06-19', '.SPY260619C825'],
  ['SPY',  'PUT',  500,   '2026-04-20', '.SPY260420P500'],
  ['IWM',  'PUT',  210,   '2026-01-16', '.IWM260116P210'],
  ['CSCO', 'CALL', 55,    '2026-03-20', '.CSCO260320C55'],
  ['BABA', 'CALL', 120,   '2026-09-18', '.BABA260918C120'],
  ['ABBV', 'PUT',  210,   '2026-07-17', '.ABBV260717P210'],
  ['QQQ',  'PUT',  480,   '2026-06-19', '.QQQ260619P480'],
];
REAL_CASES.forEach(function (c) {
  const ticker = c[0], type = c[1], strike = c[2], expiry = c[3], expected = c[4];
  const side = type === 'CALL' ? 'C' : 'P';
  eq(ctx.buildStreamerSymbol(ticker, expiry, strike, side), expected,
     'buildStreamerSymbol ' + ticker + ' ' + type + ' ' + strike);
  eq(ctx.buildCompactOptionDxlinkSymbol(ticker, leg(type, strike, expiry)), expected,
     'buildCompactOptionDxlinkSymbol ' + ticker + ' ' + type + ' ' + strike);
  // getPreferredOptionDxlinkSymbol is what keys aggregatedResp.options[sym]
  eq(ctx.getPreferredOptionDxlinkSymbol(ticker, leg(type, strike, expiry)), expected,
     'getPreferredOptionDxlinkSymbol (cache key) ' + ticker + ' ' + type + ' ' + strike);
});

// ── 2. Fractional strike: decimal preserved, trailing zeros stripped ─────────
console.log('\n[2] Fractional strike formatting');
eq(ctx.getPreferredOptionDxlinkSymbol('QQQ', leg('PUT', 480.5, '2026-06-19')), '.QQQ260619P480.5',
   'fractional strike 480.5 -> .QQQ260619P480.5 (NOT 480.500 / 480500)');
eq(ctx.getPreferredOptionDxlinkSymbol('SPY', leg('CALL', 825.5, '2026-06-19')), '.SPY260619C825.5',
   'fractional strike 825.5 -> .SPY260619C825.5');
// whole-dollar strike supplied as float must collapse to integer
eq(ctx.getPreferredOptionDxlinkSymbol('SPY', leg('CALL', 825.0, '2026-06-19')), '.SPY260619C825',
   'whole-dollar 825.0 -> .SPY260619C825 (no trailing .0)');

// ── 3. Dotted root (BRK.B) — the dot MUST be preserved ───────────────────────
console.log('\n[3] Dotted root (BRK.B)');
eq(ctx.getPreferredOptionDxlinkSymbol('BRK.B', leg('CALL', 440, '2026-06-19')), '.BRK.B260619C440',
   'BRK.B keeps the dot (NOT .BRKB260619C440)');

// ── 4. Padded OCC form is FALLBACK only, never the canonical key ──────────────
console.log('\n[4] Padded candidate is a fallback, not the key');
eq(ctx.buildOptionDxlinkSymbolCandidate('SPY', leg('CALL', 825, '2026-06-19')), '.SPY   260619C00825000',
   'buildOptionDxlinkSymbolCandidate produces the padded OCC form');
ok(ctx.getPreferredOptionDxlinkSymbol('SPY', leg('CALL', 825, '2026-06-19')).indexOf(' ') === -1,
   'preferred symbol never contains padding spaces');

// ── 5. Consistency guard accepts compact, rejects padded/x100 stored values ──
console.log('\n[5] isOptionStreamerSymbolConsistent guard');
ok(ctx.isOptionStreamerSymbolConsistent('SPY', leg('CALL', 825, '2026-06-19'), '.SPY260619C825'),
   'compact symbol is consistent');
ok(!ctx.isOptionStreamerSymbolConsistent('SPY', leg('CALL', 825, '2026-06-19'), '.SPY260619C82500'),
   'x100-encoded stored symbol is rejected (.SPY260619C82500)');
// A stored streamerSymbol that disagrees with the leg must be replaced by compact
eq(ctx.getPreferredOptionDxlinkSymbol('SPY',
     { type: 'CALL', strike: 825, expiry: '2026-06-19', expiration: '2026-06-19', streamerSymbol: '.SPY260619C82500' }),
   '.SPY260619C825',
   'stale x100 streamerSymbol is re-derived to canonical compact');
// A stored streamerSymbol that AGREES is passed through verbatim
eq(ctx.getPreferredOptionDxlinkSymbol('SPY',
     { type: 'CALL', strike: 825, expiry: '2026-06-19', expiration: '2026-06-19', streamerSymbol: '.SPY260619C825' }),
   '.SPY260619C825',
   'consistent stored streamerSymbol is preserved');

// ── 6. type/side aliases normalize identically ───────────────────────────────
console.log('\n[6] type/optionType/right aliases + C/P/CALL/PUT');
eq(ctx.getPreferredOptionDxlinkSymbol('IWM', { optionType: 'P', strike: 210, expiration: '2026-01-16' }), '.IWM260116P210',
   'optionType:"P" resolves to PUT');
eq(ctx.getPreferredOptionDxlinkSymbol('IWM', { right: 'call', strike: 210, expiration: '2026-01-16' }), '.IWM260116C210',
   'right:"call" resolves to CALL');

// ── 7. Backend `options` map key parity (the contract that makes Greeks work) ─
// refreshPositionsLive() reads aggregatedResp.options[ getPreferredOptionDxlinkSymbol(ticker, leg) ].
// This proves a backend payload keyed by the canonical symbol is reachable.
console.log('\n[7] Backend options-map key parity');
(function () {
  const positions = [
    { ticker: 'SPY',  legs: [leg('CALL', 825, '2026-06-19'), leg('PUT', 500, '2026-04-20')] },
    { ticker: 'IWM',  legs: [leg('PUT', 210, '2026-01-16')] },
    { ticker: 'CSCO', legs: [leg('CALL', 55, '2026-03-20')] },
    { ticker: 'BABA', legs: [leg('CALL', 120, '2026-09-18')] },
    { ticker: 'QQQ',  legs: [leg('PUT', 480.5, '2026-06-19')] },
  ];
  // Simulate the backend `options` map the way #140 must shape it.
  const backendOptions = {};
  positions.forEach(function (p) {
    p.legs.forEach(function (lg) {
      const key = ctx.getPreferredOptionDxlinkSymbol(p.ticker, lg);
      backendOptions[key] = {
        greeks: { delta: 0.5, theta: -0.1, gamma: 0.02, vega: 0.3, volatility: 0.21 },
        quote:  { bidPrice: 1.2, askPrice: 1.4, mark: 1.3, lastPrice: 1.3 },
        greeksStale: false,
        quoteStale: false,
      };
    });
  });
  // The consumer re-derives the same key and must hit every leg.
  let hits = 0, total = 0;
  positions.forEach(function (p) {
    p.legs.forEach(function (lg) {
      total++;
      const key = ctx.getPreferredOptionDxlinkSymbol(p.ticker, lg);
      if (backendOptions[key]) hits++;
    });
  });
  eq(hits, total, 'every leg resolves against a backend options map keyed by canonical symbol (' + hits + '/' + total + ')');
})();

// ── 8. Journal-created legs preserve every option-symbol alias the backend may read ─
console.log('\n[8] Journal/portfolio payload preserves option symbol aliases (ABBV short put)');
(function () {
  const journalLeg = ctx.normalizeOptionLegSymbolAliases('ABBV', {
    type: 'PUT',
    side: 'SHORT',
    qty: 1,
    strike: 210,
    expiry: '2026-07-17',
    streamerSymbol: '.ABBV260717P210',
  });
  eq(journalLeg.streamerSymbol, '.ABBV260717P210', 'journal leg streamerSymbol preserved');
  eq(journalLeg.optionSymbol, '.ABBV260717P210', 'journal leg optionSymbol alias populated');
  eq(journalLeg.dxlinkSymbol, '.ABBV260717P210', 'journal leg dxlinkSymbol alias populated');
  eq(journalLeg.symbol, '.ABBV260717P210', 'journal leg generic symbol alias populated');
  ok(journalLeg.occSymbol && journalLeg.occSymbol.indexOf('.ABBV') === 0, 'journal leg OCC/padded fallback populated');

  const payload = ctx.buildPortfolioLiveRefreshPayload([
    { id: 1, ticker: 'ABBV', strategy: 'SHORT_PUT', legs: [journalLeg] },
  ]);
  const pLeg = payload.positions[0].legs[0];
  eq(payload.optionSymbols[0], '.ABBV260717P210', 'payload top-level optionSymbols includes ABBV');
  eq(pLeg.streamerSymbol, '.ABBV260717P210', 'payload streamerSymbol sent');
  eq(pLeg.optionSymbol, '.ABBV260717P210', 'payload optionSymbol sent');
  eq(pLeg.dxlinkSymbol, '.ABBV260717P210', 'payload dxlinkSymbol sent');
  eq(pLeg.symbol, '.ABBV260717P210', 'payload symbol sent');
  ok(!!pLeg.occSymbol, 'payload occSymbol sent');
})();

// ── 9. Backend-loaded / sparse legs can be reconstructed from aliases ───────
console.log('\n[9] Sparse backend-loaded legs reconstruct canonical fields');
(function () {
  const sparse = ctx.normalizeOptionLegSymbolAliases('ABBV', {
    option_symbol: '.ABBV260717P210',
    optionSymbol: '.ABBV260717P210',
    action: 'SHORT',
    quantity: 1,
  });
  eq(sparse.type, 'PUT', 'type reconstructed from option symbol');
  eq(sparse.right, 'P', 'right reconstructed from option symbol');
  eq(sparse.expiry, '2026-07-17', 'expiry reconstructed from option symbol');
  eq(sparse.expiration, '2026-07-17', 'expiration reconstructed from option symbol');
  eq(sparse.strike, 210, 'strike reconstructed from option symbol');
  eq(sparse.side, 'SHORT', 'side/action alias preserved');
  eq(ctx.getPreferredOptionDxlinkSymbol('ABBV', sparse), '.ABBV260717P210',
     'preferred symbol resolves after sparse-leg normalization');
  const diag = ctx.optionLegScalarDiagnostics('ABBV', 1, 0, sparse);
  eq(diag.preferredSymbol, '.ABBV260717P210', 'scalar diagnostics include preferredSymbol');
  eq(diag.builtCandidate, '.ABBV260717P210', 'scalar diagnostics include builtCandidate');
})();

// ── 10. Backend trade-leg date aliases preserve expiry into Portfolio ────────
console.log('\n[10] Backend trade date aliases preserve expiry/expiration');
(function () {
  const backendTradeLeg = ctx.normalizeOptionLegSymbolAliases('ABBV', {
    option_type: 'PUT',
    action: 'SHORT',
    quantity: 1,
    strike_price: 210,
    expiry_date: '2026-07-17',
  });
  eq(backendTradeLeg.expiry, '2026-07-17', 'expiry reconstructed from expiry_date');
  eq(backendTradeLeg.expiration, '2026-07-17', 'expiration reconstructed from expiry_date');
  eq(backendTradeLeg.expirationDate, '2026-07-17', 'expirationDate preserved');
  eq(ctx.getPreferredOptionDxlinkSymbol('ABBV', backendTradeLeg), '.ABBV260717P210',
     'preferred symbol builds from backend trade date aliases');
})();

// Response-shape / diagnostics assertions live in
// tests/portfolio-enriched-endpoint-shape.test.js (consumer-shape contract).

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
