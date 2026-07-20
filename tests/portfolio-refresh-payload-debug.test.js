'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// [PortfolioRefreshPayload] verbose-log gating contract test.
//
// buildPortfolioLiveRefreshPayload() used to print full per-position and
// per-leg JSON to console.log on every Portfolio refresh, flooding the preview
// console. This test pins the cleanup behavior:
//   • verbose payload output is OFF by default (no console.log / console.debug),
//   • the verbose dumps are gated behind APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD
//     and use console.debug (never console.log),
//   • an unresolved option symbol still surfaces via console.warn even when the
//     debug flag is off,
//   • the built payload is identical regardless of the flag (logging only).
//
// Run: node tests/portfolio-refresh-payload-debug.test.js
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
    S: {}, // S.debugPortfolioRefresh is unset → that branch stays quiet
    JSON: JSON,
  };
  ctx._capturedConsole = capturing;
  vm.createContext(ctx);
  [
    'buildStreamerSymbol',
    'buildOptionDxlinkSymbolCandidate',
    'buildCompactOptionDxlinkSymbol',
    'isOptionStreamerSymbolConsistent',
    'getPreferredOptionDxlinkSymbol',
    'parseCompactOptionDxlinkSymbol',
    'normalizeOptionLegSymbolAliases',
    'optionLegScalarDiagnostics',
    '_portfolioRefreshPayloadDebugEnabled',
    'buildPortfolioLiveRefreshPayload',
  ].forEach(function (n) { vm.runInContext(extractFn(HTML, n), ctx); });
  return ctx;
}

function fakeLocalStorage(map) {
  map = map || {};
  return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; } };
}

// A clean, well-formed multi-leg position with resolvable streamer symbols.
function cleanPositions() {
  return [{
    id: 'p1',
    ticker: 'SPY',
    strategy: 'STRADDLE',
    legs: [
      { type: 'CALL', strike: 825, expiry: '2026-06-19', qty: 1, streamerSymbol: '.SPY260619C825' },
      { type: 'PUT',  strike: 500, expiry: '2026-04-20', qty: 1, streamerSymbol: '.SPY260420P500' },
    ],
  }];
}

// ── 1. Debug flag detection ───────────────────────────────────────────────────
console.log('\n[1] _portfolioRefreshPayloadDebugEnabled() reads window + localStorage flags');
(function () {
  eq(buildCtx({})._portfolioRefreshPayloadDebugEnabled(), false, 'disabled with no flags');
  eq(buildCtx({ window: { APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD: true } })._portfolioRefreshPayloadDebugEnabled(), true,
     'enabled via window.APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD === true');
  eq(buildCtx({ window: { APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD: 'yes' } })._portfolioRefreshPayloadDebugEnabled(), false,
     'window flag must be strictly true');
  eq(buildCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD: '1' }) })._portfolioRefreshPayloadDebugEnabled(), true,
     "enabled via localStorage APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD === '1'");
  eq(buildCtx({ localStorage: fakeLocalStorage({ APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD: '0' }) })._portfolioRefreshPayloadDebugEnabled(), false,
     "localStorage flag '0' does not enable");
})();

// ── 2. Quiet by default: building the payload logs NOTHING verbose ────────────
console.log('\n[2] Payload build is silent when debug flag is off');
(function () {
  const ctx = buildCtx({});
  ctx.buildPortfolioLiveRefreshPayload(cleanPositions());
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'no console.log (no full JSON spam)');
  eq(c.debug.length, 0, 'no console.debug when flag off');
  eq(c.warn.length, 0, 'no console.warn for resolvable legs');
})();

// ── 3. Verbose mode: dumps go to console.debug, never console.log ─────────────
console.log('\n[3] Debug flag on → verbose payload via console.debug');
(function () {
  const ctx = buildCtx({ window: { APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD: true } });
  ctx.buildPortfolioLiveRefreshPayload(cleanPositions());
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'still no console.log even when verbose');
  ok(c.debug.length >= 4, 'verbose dumps emitted via console.debug (>=4 lines)');
  const tags = c.debug.map(function (a) { return String(a[0]); });
  ok(tags.indexOf('[PortfolioRefreshPayload] active position input') >= 0, 'active position input logged');
  ok(tags.indexOf('[PortfolioRefreshPayload] leg scalar before normalize') >= 0, 'leg scalar before normalize logged');
  ok(tags.indexOf('[PortfolioRefreshPayload] leg scalar after normalize') >= 0, 'leg scalar after normalize logged');
  ok(tags.indexOf('[PortfolioRefreshPayload] option symbol resolved') >= 0, 'option symbol resolved logged');
})();

// ── 4. Unresolved option symbol still warns with debug OFF ────────────────────
console.log('\n[4] Unresolved option symbol still surfaces via console.warn (flag off)');
(function () {
  const ctx = buildCtx({});
  // Option leg with no resolvable symbol (no strike/expiry/streamerSymbol).
  ctx.buildPortfolioLiveRefreshPayload([{ id: 'p2', ticker: 'IWM', legs: [{ type: 'CALL' }] }]);
  const c = ctx._capturedConsole.calls;
  eq(c.log.length, 0, 'no console.log');
  eq(c.debug.length, 0, 'no verbose debug dump');
  ok(c.warn.length >= 1, 'unresolved option symbol warning still fires');
  ok(String(c.warn[0][0]).indexOf('[PortfolioRefreshPayload] option symbol unresolved') === 0, 'tagged unresolved warning');
})();

// ── 5. Logging does not change the built payload ──────────────────────────────
console.log('\n[5] Built payload is identical regardless of debug flag');
(function () {
  const off = buildCtx({}).buildPortfolioLiveRefreshPayload(cleanPositions());
  const on  = buildCtx({ window: { APEX_DEBUG_PORTFOLIO_REFRESH_PAYLOAD: true } }).buildPortfolioLiveRefreshPayload(cleanPositions());
  eq(JSON.stringify(off), JSON.stringify(on), 'payload unaffected by logging flag');
  eq(off.optionSymbols.length, 2, 'both option symbols resolved into payload');
})();

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
