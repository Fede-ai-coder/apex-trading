'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// [JOURNAL-EXPIRY-AUDIT] verbose-log gating contract test.
//
// journalTradeLegExpiryAudit() dumped full per-leg expiry + option symbol JSON
// on every localStorage write/read and every trade add/submit, flooding the
// preview console (PR #275 follow-up). This test pins the cleanup behavior:
//   • verbose output is OFF by default (no console.log / console.debug spam),
//   • the dump is gated behind APEX_DEBUG_JOURNAL_EXPIRY (window or localStorage),
//   • when enabled it uses console.debug (not console.log),
//   • the payload still carries tradeId / ticker / tradeExpiry / per-leg expiry
//     + option symbols so it remains useful when manually turned on.
//
// It does NOT exercise Journal persistence or localStorage behavior — only the
// logging gate. Run: node tests/journal-expiry-audit-debug.test.js
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
    '_journalExpiryAuditEnabled',
    'journalTradeLegExpiryAudit',
  ].forEach(function (n) { vm.runInContext(extractFn(HTML, n), ctx); });
  return ctx;
}

function fakeLocalStorage(map) {
  map = map || {};
  return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; } };
}

// A clean, well-formed multi-leg trade.
const TRADE = {
  id: 't1',
  ticker: 'SPY',
  expiry: '2026-06-19',
  legs: [
    { expiry: '2026-06-19', expiration: '2026-06-19', streamerSymbol: '.SPY260619C825', optionSymbol: 'SPY260619C825' },
    { expiry: '2026-04-20', expiration: '2026-04-20', streamerSymbol: '.SPY260420P500', optionSymbol: 'SPY260420P500' },
  ],
};

// ── 1. Debug flag detection ───────────────────────────────────────────────────
console.log('\n[1] _journalExpiryAuditEnabled() reads window + localStorage flags');
(function () {
  eq(buildCtx({})._journalExpiryAuditEnabled(), false, 'disabled with no flags');
  eq(buildCtx({ window: { APEX_DEBUG_JOURNAL_EXPIRY: true } })._journalExpiryAuditEnabled(), true,
     'enabled via window.APEX_DEBUG_JOURNAL_EXPIRY === true');
  eq(buildCtx({ window: { APEX_DEBUG_JOURNAL_EXPIRY: 'yes' } })._journalExpiryAuditEnabled(), false,
     'window flag must be strictly true');
  eq(buildCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_JOURNAL_EXPIRY: '1' }) })._journalExpiryAuditEnabled(), true,
     "enabled via localStorage APEX_DEBUG_JOURNAL_EXPIRY === '1'");
  eq(buildCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_JOURNAL_EXPIRY: '0' }) })._journalExpiryAuditEnabled(), false,
     "localStorage flag '0' does not enable");
})();

// ── 2. Silent by default: no logging when the flag is off ─────────────────────
console.log('\n[2] Audit is silent when debug flag is off');
(function () {
  const ctx = buildCtx({});
  ctx.journalTradeLegExpiryAudit('before localStorage write', TRADE);
  ctx.journalTradeLegExpiryAudit('after localStorage write/read', TRADE);
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'no console.log (no full JSON spam)');
  eq(c.debug.length, 0, 'no console.debug when flag off');
  eq(c.warn.length, 0, 'no console.warn');
  eq(c.error.length, 0, 'no console.error');
})();

// ── 3. Verbose mode (window flag): dump goes to console.debug, never console.log ─
console.log('\n[3] window flag on → verbose audit via console.debug');
(function () {
  const ctx = buildCtx({ window: { APEX_DEBUG_JOURNAL_EXPIRY: true } });
  ctx.journalTradeLegExpiryAudit('before localStorage write', TRADE);
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'still no console.log even when verbose');
  eq(c.debug.length, 1, 'exactly one console.debug audit line');
  ok(String(c.debug[0][0]).indexOf('[JOURNAL-EXPIRY-AUDIT] before localStorage write') === 0, 'tagged + labelled audit line');
  const payload = JSON.parse(c.debug[0][1]);
  eq(payload.tradeId, 't1', 'payload carries tradeId');
  eq(payload.ticker, 'SPY', 'payload carries ticker');
  eq(payload.tradeExpiry, '2026-06-19', 'payload carries tradeExpiry');
  ok(Array.isArray(payload.legs) && payload.legs.length === 2, 'payload carries per-leg expiry data');
  eq(payload.legs[0].streamerSymbol, '.SPY260619C825', 'leg streamerSymbol preserved in dump');
  eq(payload.legs[0].optionSymbol, 'SPY260619C825', 'leg optionSymbol preserved in dump');
})();

// ── 4. Verbose mode (localStorage flag) also routes to console.debug ──────────
console.log('\n[4] localStorage flag on → verbose audit via console.debug');
(function () {
  const ctx = buildCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_JOURNAL_EXPIRY: '1' }) });
  ctx.journalTradeLegExpiryAudit('after localStorage write/read', TRADE);
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'no console.log');
  eq(c.debug.length, 1, 'one console.debug audit line');
})();

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
