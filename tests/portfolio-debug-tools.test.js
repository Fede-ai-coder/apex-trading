'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Non-destructive Portfolio AUDIT TOOLS — validation.
//
// Extracts the REAL helpers from index.html (apexDumpStorageKeys,
// apexDebugPortfolioState, getPortfolioJournalReconciliation) and runs them in a
// vm sandbox with a mock localStorage + stub managers. Proves the safety
// guarantees the audit prompt requires:
//
//   1. The debug tools modify NO data (storage byte-identical before/after).
//   2. The read-storage path creates NO destructive fallback (no setItem at all).
//   3. Portfolios are NOT overwritten when localStorage is empty.
//   4. assigned/unassigned use the SAME criterion as the rendering path
//      (getPortfolioJournalReconciliation) — parity, not a re-implementation.
//   5. Orphan positions are only REPORTED, never deleted.
//   6. Trades with no portfolioId are only REPORTED, never mutated.
//   7. The tools touch no Greeks / Theta / Vega / BWD / risk-metric source.
//
// Run: node tests/portfolio-debug-tools.test.js
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
function assert(cond, msg) {
  if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); }
}

// localStorage mock that records every mutating call so we can prove the tools
// never write or delete.
function makeStorage(seed) {
  const map = new Map(Object.entries(seed || {}));
  const writes = [];
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { writes.push(['set', k]); map.set(k, String(v)); },
    removeItem(k) { writes.push(['remove', k]); map.delete(k); },
    clear() { writes.push(['clear']); map.clear(); },
    key(i) { return Array.from(map.keys())[i]; },
    get length() { return map.size; },
    _dump() { return Object.fromEntries(map); },
    _writes() { return writes; },
  };
}

const J = (a) => JSON.stringify(a);

// Build a sandbox containing the real audit functions + stub managers.
function makeCtx(seed, state) {
  state = state || {};
  const storage = makeStorage(seed);
  const portfolios = state.portfolios || [];
  const trades     = state.trades || [];
  // positions = OPEN trades projected (mirrors the real positionManager adapter)
  const openTrades = () => trades.filter(t => t.status === 'OPEN' || t.status === 'PARTIAL');

  const ctx = {
    window: { location: { hostname: state.host || 'app.example.com' } },
    document: { lastModified: 'Fri, 12 Jun 2026 00:00:00 GMT' },
    localStorage: storage,
    console: { log() {}, warn() {}, error() {}, table() {} },
    JSON, Array, Date, String, Object, Promise,
    APEX_BUILD_TAG: 'test-build',
    BACKEND: '',                 // unconfigured → no probe
    S: { backendKey: '' },
    _activePanelPortfolioId: state.activePanelPortfolioId != null ? state.activePanelPortfolioId : null,
    isApexPreviewOrLocalEnv: () => false,
    portfolioManager: { getAll: () => portfolios.slice() },
    journalManager:   { getAll: () => trades.slice() },
    positionManager:  { getAll: () => openTrades().map(t => ({
                          id: t.id, portfolioId: t.portfolioId, ticker: t.ticker, status: t.status })) },
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'getPortfolioJournalReconciliation'),
    extractFn(HTML, 'apexDumpStorageKeys'),
    extractFn(HTML, 'apexDebugPortfolioState'),
  ].join('\n'), ctx);
  ctx._storage = storage;
  ctx._trades  = trades;
  ctx._portfolios = portfolios;
  return ctx;
}

// ── 1. apexDumpStorageKeys returns metadata only and mutates nothing ─────────
(function() {
  const ctx = makeCtx({
    'apex_portfolios': J([{ id: 1, name: 'Live' }]),
    'apex_trades': J([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    'apex_tt_session': 'opaque-session-token',
    'unrelated': 'x',
  });
  const before = J(ctx._storage._dump());
  const dump = ctx.apexDumpStorageKeys();
  assert(Array.isArray(dump), '1: returns an array');
  assert(dump.every(d => d.key.indexOf('apex') === 0), '1: only apex* keys');
  assert(dump.find(d => d.key === 'apex_trades').count === 3, '1: array count reported');
  assert(dump.find(d => d.key === 'apex_tt_session').count === null, '1: non-array count = null');
  // metadata only: no raw value field leaks the payload
  assert(dump.every(d => !('value' in d) && !('raw' in d)), '1: no raw payload leaked');
  assert(J(ctx._storage._dump()) === before, '1: storage byte-identical after dump');
  assert(ctx._storage._writes().length === 0, '1: zero writes/removes');
  console.log('✓ 1 apexDumpStorageKeys: metadata only, non-destructive');
})();

// ── 2 & 3. apexDebugPortfolioState writes nothing, even with EMPTY storage ───
(async function() {
  const ctx = makeCtx({}, { portfolios: [], trades: [] });
  const before = J(ctx._storage._dump());
  const res = await ctx.apexDebugPortfolioState({ probeBackend: false });
  assert(ctx._storage._writes().length === 0, '2: zero writes during debug');
  assert(J(ctx._storage._dump()) === before, '2: storage byte-identical after debug');
  // 3: empty localStorage must NOT cause a fallback/default portfolio to appear
  assert(res.portfoliosCount === 0, '3: no portfolio fabricated when storage empty');
  assert(res.portfolios.length === 0, '3: empty portfolios list preserved');
  console.log('✓ 2/3 apexDebugPortfolioState: non-destructive, no fabricated portfolios');
})();

// ── 4. assigned/unassigned PARITY with getPortfolioJournalReconciliation ─────
(async function() {
  const portfolios = [{ id: 100, name: 'Live', type: 'OPTIONS', createdAt: '2026-01-01' }];
  const trades = [
    { id: 't1', portfolioId: 100, ticker: 'AAA', status: 'OPEN' },
    { id: 't2', portfolioId: 100, ticker: 'BBB', status: 'CLOSED' },
    { id: 't3', portfolioId: 999, ticker: 'CCC', status: 'OPEN' },   // dangling FK
    { id: 't4', portfolioId: null, ticker: 'DDD', status: 'OPEN' },  // unassigned
  ];
  const ctx = makeCtx({}, { portfolios, trades });
  const rec = ctx.getPortfolioJournalReconciliation();
  const res = await ctx.apexDebugPortfolioState({ probeBackend: false });
  assert(res.assignedTradesCount === rec.assignedTradeCount, '4: assigned matches reconciliation');
  assert(res.unassignedTradesCount === rec.unassignedTradeCount, '4: unassigned matches reconciliation');
  assert(res.assignedTradesCount === 2 && res.unassignedTradesCount === 2,
    '4: dangling-FK trade counts as unassigned (2 assigned / 2 unassigned)');
  console.log('✓ 4 assigned/unassigned parity with rendering path');
})();

// ── 5 & 6. orphans only REPORTED — positions/trades never deleted or mutated ─
(async function() {
  const portfolios = [{ id: 100, name: 'Saxo', type: 'OPTIONS' }];
  const trades = [
    { id: 't1', portfolioId: 100, ticker: 'AAA', status: 'OPEN' },
    { id: 't2', portfolioId: 555, ticker: 'BBB', status: 'OPEN' },   // orphan position+trade
    { id: 't3', portfolioId: null, ticker: 'CCC', status: 'CLOSED' },// orphan trade, no pid
  ];
  const ctx = makeCtx({ 'apex_trades': J(trades) }, { portfolios, trades });
  const tradesSnapshot = J(ctx._trades);
  const before = J(ctx._storage._dump());
  const res = await ctx.apexDebugPortfolioState({ probeBackend: false });

  assert(res.orphanTradesCount === 2, '6: two orphan trades reported');
  assert(res.orphanPositionsCount === 1, '5: one orphan position reported (only the OPEN one)');
  // the orphan with no portfolioId is preserved as-is (not backfilled)
  const t3 = res.orphanTrades.find(t => t.id === 't3');
  assert(t3 && t3.portfolioId === null, '6: missing portfolioId reported as null, not backfilled');
  // CRITICAL: nothing deleted/mutated
  assert(J(ctx._trades) === tradesSnapshot, '5/6: in-memory trades array untouched');
  assert(J(ctx._storage._dump()) === before, '5/6: storage byte-identical');
  assert(ctx._storage._writes().length === 0, '5/6: zero writes/removes');
  console.log('✓ 5/6 orphans reported, never deleted or mutated');
})();

// ── 7. Static guarantee: the audit tools touch no storage-write or formula API
(function() {
  const dump  = extractFn(HTML, 'apexDumpStorageKeys');
  const debug = extractFn(HTML, 'apexDebugPortfolioState');
  const body  = dump + '\n' + debug;
  assert(body.indexOf('setItem') === -1, '7: no setItem in audit tools');
  assert(body.indexOf('removeItem') === -1, '7: no removeItem in audit tools');
  assert(body.indexOf('.clear(') === -1, '7: no storage clear in audit tools');
  // does not CALL loadFromBackend (would merge/persist backend trades). Strip
  // comments first so a mention in a doc-comment doesn't trip the check.
  const codeOnly = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(codeOnly.indexOf('loadFromBackend(') === -1, '7: never merges backend into local');
  // touches no risk/greeks formula entry points
  ['aggregateGreeks', 'computePortfolioRisk', 'portfolioRiskMetrics', 'calcVega', 'calcTheta']
    .forEach(fn => assert(body.indexOf(fn) === -1, '7: does not call ' + fn));
  console.log('✓ 7 audit tools are write-free and formula-free by construction');
})();

// ── summary ──────────────────────────────────────────────────────────────────
setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') +
    ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 50);
