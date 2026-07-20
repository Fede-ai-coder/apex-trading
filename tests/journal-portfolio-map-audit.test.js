'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// [JOURNAL-PORTFOLIO-MAP-AUDIT] gating + anomaly contract test.
//
// PR #273 added a verbose per-leg mapping audit that printed full trade/legs
// JSON on every Portfolio render / Greeks refresh / chart open. This test pins
// the cleanup behavior:
//   • verbose output is OFF by default (no console.log / console.debug spam),
//   • the verbose dump is gated behind APEX_DEBUG_JOURNAL_MAP and uses
//     console.debug (not console.log),
//   • anomalies (missing portfolioId / expiry / streamerSymbol / optionType,
//     built-vs-selected symbol mismatch, unsupported leg shape) still surface
//     even when the debug flag is off,
//   • the compact summary carries the required fields.
//
// Run: node tests/journal-portfolio-map-audit.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
function eq(actual, expected, msg) {
  if (actual === expected) { passed++; }
  else { failed++; console.error('  ✗ ' + msg + '\n      expected: ' + JSON.stringify(expected) + '\n      got:      ' + JSON.stringify(actual)); }
}
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); }
}

// ── Capturing console so we can assert on log levels ──────────────────────────
function makeConsole() {
  const calls = { log: [], debug: [], warn: [], error: [] };
  return {
    calls,
    log:   function () { calls.log.push(Array.from(arguments)); },
    debug: function () { calls.debug.push(Array.from(arguments)); },
    warn:  function () { calls.warn.push(Array.from(arguments)); },
    error: function () { calls.error.push(Array.from(arguments)); },
  };
}

// ── Build a sandbox with the REAL functions from index.html ───────────────────
function buildCtx(env) {
  env = env || {};
  const capturing = makeConsole();
  const ctx = {
    console: capturing,
    window: env.window || {},
    localStorage: env.localStorage || null,
  };
  ctx._capturedConsole = capturing;
  vm.createContext(ctx);
  [
    'buildStreamerSymbol',
    'buildCompactOptionDxlinkSymbol',
    'buildOptionDxlinkSymbolCandidate',
    'isOptionStreamerSymbolConsistent',
    'getPreferredOptionDxlinkSymbol',
    'optionLegScalarDiagnostics',
    '_journalMapAuditEnabled',
    '_journalMapAuditSummarize',
    '_journalMapAudit',
  ].forEach(function (n) { vm.runInContext(extractFn(HTML, n), ctx); });
  return ctx;
}

function fakeLocalStorage(map) {
  map = map || {};
  return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; } };
}

// A clean, well-formed multi-leg trade (the normal #273 happy path).
const CLEAN_TRADE = {
  id: 't1',
  ticker: 'SPY',
  portfolioId: 'pf-1',
  legs: [
    { type: 'CALL', optionType: 'CALL', right: 'C', strike: 825, expiry: '2026-06-19', expiration: '2026-06-19', streamerSymbol: '.SPY260619C825' },
    { type: 'PUT',  optionType: 'PUT',  right: 'P', strike: 500, expiry: '2026-04-20', expiration: '2026-04-20', streamerSymbol: '.SPY260420P500' },
  ],
};

// ── 1. Debug flag detection ───────────────────────────────────────────────────
console.log('\n[1] _journalMapAuditEnabled() reads window + localStorage flags');
(function () {
  eq(buildCtx({})._journalMapAuditEnabled(), false, 'disabled with no flags');
  eq(buildCtx({ window: { APEX_DEBUG_JOURNAL_MAP: true } })._journalMapAuditEnabled(), true,
     'enabled via window.APEX_DEBUG_JOURNAL_MAP === true');
  eq(buildCtx({ window: { APEX_DEBUG_JOURNAL_MAP: 'yes' } })._journalMapAuditEnabled(), false,
     'window flag must be strictly true');
  eq(buildCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_JOURNAL_MAP: '1' }) })._journalMapAuditEnabled(), true,
     "enabled via localStorage APEX_DEBUG_JOURNAL_MAP === '1'");
  eq(buildCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_JOURNAL_MAP: '0' }) })._journalMapAuditEnabled(), false,
     "localStorage flag '0' does not enable");
})();

// ── 2. Quiet by default: clean trade logs NOTHING ─────────────────────────────
console.log('\n[2] Clean trade is silent when debug flag is off');
(function () {
  const ctx = buildCtx({});
  ctx._journalMapAudit(CLEAN_TRADE, CLEAN_TRADE.legs);
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'no console.log (no full JSON spam)');
  eq(c.debug.length, 0, 'no console.debug when flag off');
  eq(c.warn.length, 0, 'no console.warn for a clean mapping');
})();

// ── 3. Verbose mode: gated dump goes to console.debug, never console.log ───────
console.log('\n[3] Debug flag on → verbose audit via console.debug');
(function () {
  const ctx = buildCtx({ window: { APEX_DEBUG_JOURNAL_MAP: true } });
  ctx._journalMapAudit(CLEAN_TRADE, CLEAN_TRADE.legs);
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'still no console.log even when verbose');
  eq(c.debug.length, 1, 'exactly one console.debug audit line');
  ok(String(c.debug[0][0]).indexOf('[JOURNAL-PORTFOLIO-MAP-AUDIT]') === 0, 'tagged audit line');
  const payload = JSON.parse(c.debug[0][1]);
  ok(Array.isArray(payload.legs) && payload.legs.length === 2, 'verbose payload carries per-leg diagnostics');
  eq(payload.summary.legsCount, 2, 'summary legsCount present in verbose dump');
})();

// ── 4. Anomalies surface even with debug OFF (compact warn, no full JSON) ──────
console.log('\n[4] Anomalies surface with debug off');
(function () {
  const anomalousTrade = {
    id: 't2',
    ticker: 'IWM',
    portfolioId: null, // missing-portfolioId
    legs: [
      // missing expiry, missing streamerSymbol, missing optionType
      { strike: 210 },
    ],
  };
  const ctx = buildCtx({});
  ctx._journalMapAudit(anomalousTrade, anomalousTrade.legs);
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'no console.log');
  eq(c.debug.length, 0, 'no verbose debug dump');
  eq(c.warn.length, 1, 'one compact anomaly warning');
  const payload = JSON.parse(c.warn[0][1]);
  ok(!('legs' in payload), 'anomaly warning does NOT include full legs JSON');
  const kinds = payload.anomalies.map(function (a) { return a.kind; });
  ok(kinds.indexOf('missing-portfolioId') >= 0, 'flags missing portfolioId');
  ok(kinds.indexOf('missing-expiry') >= 0, 'flags missing expiry');
  ok(kinds.indexOf('missing-streamerSymbol') >= 0, 'flags missing streamerSymbol');
  ok(kinds.indexOf('missing-optionType') >= 0, 'flags missing optionType');
})();

// ── 5. Summary contract: required fields ──────────────────────────────────────
console.log('\n[5] _journalMapAuditSummarize() compact summary fields');
(function () {
  const ctx = buildCtx({});
  const diags = CLEAN_TRADE.legs.map(function (leg, i) {
    return ctx.optionLegScalarDiagnostics(CLEAN_TRADE.ticker, CLEAN_TRADE.id, i, leg);
  });
  const res = ctx._journalMapAuditSummarize(CLEAN_TRADE, diags);
  eq(res.summary.tradeId, 't1', 'summary.tradeId');
  eq(res.summary.ticker, 'SPY', 'summary.ticker');
  eq(res.summary.legsCount, 2, 'summary.legsCount');
  eq(res.summary.portfolioId, 'present', 'summary.portfolioId present');
  eq(res.summary.allLegsHaveExpiry, true, 'summary.allLegsHaveExpiry');
  eq(res.summary.allLegsHaveStreamerSymbol, true, 'summary.allLegsHaveStreamerSymbol');
  eq(res.summary.anomalyCount, 0, 'summary.anomalyCount = 0 for clean trade');
  eq(res.anomalies.length, 0, 'no anomalies for clean trade');
})();

// ── 6. Unsupported leg shape is flagged ───────────────────────────────────────
console.log('\n[6] Unsupported leg shape flagged');
(function () {
  const ctx = buildCtx({});
  const diags = [ctx.optionLegScalarDiagnostics('SPY', 't3', 0, { foo: 'bar' })];
  const res = ctx._journalMapAuditSummarize({ id: 't3', ticker: 'SPY', portfolioId: 'pf' }, diags);
  const kinds = res.anomalies.map(function (a) { return a.kind; });
  ok(kinds.indexOf('unsupported-leg-shape') >= 0, 'flags a leg with no option shape');
})();

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
