'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL TRANSIENT-SYNC RESILIENCE
//
// A flaky network (Chrome net::ERR_NETWORK_CHANGED / "Failed to fetch" /
// request timeout) must NEVER make a persisted portfolio render with zero
// positions when the backend DB has trades. This test pins:
//
//   1. _isTransientFetchError() classifies network errors vs. real app errors.
//   2. _ttCallWithRetry() retries transient errors with backoff, then succeeds;
//      non-transient errors re-throw on the first attempt (no retry).
//   3. _jSyncJournalFromBackend() on transient failure:
//        • returns false, sets _journalSyncFailed = true,
//        • does NOT clear existing local trades,
//        • re-merges last-known-good when the local journal is empty.
//   4. jMigrateApexTradesToBackend() MERGES backend trades it observes into
//      journalManager (not just into the "already migrated" id set) and records
//      them as last-known-good.
//   5. Acceptance: a successful sync (count=1) records a snapshot; a later
//      transient failure keeps positions at 1 (never collapses to zero).
//
// Run: node tests/journal-transient-sync-resilience.test.js
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

function makeJournalManager(initial) {
  let arr = (initial || []).slice();
  return {
    getAll() { return arr.slice(); },
    loadFromBackend(bt) {
      const map = {}; arr.forEach(t => map[String(t.id)] = t);
      let ch = 0;
      (bt || []).forEach(b => { const k = String(b.id); if (!map[k]) ch++; map[k] = b; });
      arr = Object.values(map);
      return ch;
    },
  };
}

function makeCtx(opts) {
  opts = opts || {};
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: 'https:' } },
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object, Promise, Set, RegExp,
    BACKEND: 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    ttCall: opts.ttCall,
    journalManager: opts.journalManager || makeJournalManager(opts.trades || []),
    portfolioManager: { getAll: () => (opts.portfolios || []).slice() },
    _jLastKnownGoodTrades: null,
    _jLastKnownGoodCount: 0,
    _journalSyncFailed: false,
    _jMigrationDone: false,
    setTimeout: (fn) => fn(),
    showToast: function() { ctx._toasts = (ctx._toasts || 0) + 1; },
    jSaveRemote: async function() { return true; },
    _tradeForBackend: function(t) { return t; },
    renderPortfolioJournalView: function() {},
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'isApexPreviewOrLocalEnv'),
    extractFn(HTML, 'isApexLocalDevEnv'),
    extractFn(HTML, '_resolveTradePortfolioId'),
    extractFn(HTML, '_normalizeBackendTradePortfolioId'),
    extractFn(HTML, '_isTransientFetchError'),
    extractFn(HTML, '_ttCallWithRetry'),
    extractFn(HTML, '_jRecordBackendSnapshot'),
    extractFn(HTML, '_jSyncJournalFromBackend'),
    extractFn(HTML, 'jMigrateApexTradesToBackend'),
  ].join('\n'), ctx);
  return ctx;
}

// ── 1. transient error classification ────────────────────────────────────────
(function() {
  const ctx = makeCtx({});
  const isT = (m) => vm.runInContext('_isTransientFetchError(new Error(' + JSON.stringify(m) + '))', ctx);
  assert(isT('Failed to fetch') === true, '1: "Failed to fetch" is transient');
  assert(isT('net::ERR_NETWORK_CHANGED') === true, '1: ERR_NETWORK_CHANGED is transient');
  assert(isT('network timeout exceeded') === true, '1: network timeout is transient');
  assert(isT('The operation was aborted') === true, '1: aborted (timeout) is transient');
  assert(isT('Load failed') === true, '1: "Load failed" (Safari) is transient');
  assert(isT('api-key invalid') === false, '1: auth error is NOT transient');
  assert(isT('HTTP 500: server error') === false, '1: HTTP 500 is NOT transient');
  assert(isT('') === false, '1: empty message is NOT transient');
  console.log('✓ 1 transient classification');
})();

// ── 2. retry/backoff: transient retries then succeeds; non-transient no retry ─
(async function() {
  let n = 0;
  const ttFlaky = async function() {
    n++;
    if (n < 3) throw new Error('Failed to fetch');
    return { trades: [{ id: 't1' }] };
  };
  const ctx = makeCtx({ ttCall: ttFlaky });
  const res = await vm.runInContext('_ttCallWithRetry("/journal/trades")', ctx);
  assert(n === 3 && res && res.trades.length === 1, '2: retries transient errors then succeeds (3 attempts)');

  let m = 0;
  const ttAuth = async function() { m++; throw new Error('api-key invalid'); };
  const ctx2 = makeCtx({ ttCall: ttAuth });
  let threw = false;
  try { await vm.runInContext('_ttCallWithRetry("/journal/trades")', ctx2); }
  catch (e) { threw = true; }
  assert(threw && m === 1, '2: non-transient error re-throws on first attempt (no retry)');
  console.log('✓ 2 retry/backoff');
})();

// ── 3. transient failure is non-destructive + restores last-known-good ───────
(async function() {
  // (a) existing local trades are NOT cleared on a transient sync failure
  const ttFail = async function() { throw new Error('Failed to fetch'); };
  const jm = makeJournalManager([{ id: 'L1', portfolioId: 1, status: 'OPEN' }]);
  const ctx = makeCtx({ ttCall: ttFail, journalManager: jm });
  const had = await ctx.journalManager && await vm.runInContext('_jSyncJournalFromBackend()', ctx);
  assert(had === false, '3a: sync returns false on transient failure');
  assert(ctx._journalSyncFailed === true, '3a: _journalSyncFailed latched true');
  assert(jm.getAll().length === 1, '3a: existing local trade NOT cleared on failure');

  // (b) journal started empty but a last-known-good snapshot exists -> restored
  const jm2 = makeJournalManager([]);
  const ctx2 = makeCtx({ ttCall: ttFail, journalManager: jm2 });
  vm.runInContext('_jRecordBackendSnapshot([{ id: "b1", portfolioId: 1, status: "OPEN", ticker: "AAA" }])', ctx2);
  assert(ctx2._jLastKnownGoodCount === 1, '3b: snapshot recorded count=1');
  await vm.runInContext('_jSyncJournalFromBackend()', ctx2);
  assert(jm2.getAll().length === 1, '3b: empty journal re-hydrated from last-known-good on failure');
  assert(ctx2._journalSyncFailed === true, '3b: failure flag set even after restore');
  console.log('✓ 3 transient failure is non-destructive');
})();

// ── 4. migration MERGES observed backend trades + records snapshot ───────────
(async function() {
  const tt = async function(p) {
    if (p === '/journal/trades') return { trades: [{ id: 'b1', portfolioId: 1, status: 'OPEN', ticker: 'AAA' }] };
    return {};
  };
  const jm = makeJournalManager([]);   // fresh browser: empty localStorage
  const ctx = makeCtx({ ttCall: tt, journalManager: jm });
  await vm.runInContext('jMigrateApexTradesToBackend()', ctx);
  assert(jm.getAll().length === 1, '4: migration merged the observed backend trade into journalManager');
  assert(ctx._jLastKnownGoodCount === 1, '4: migration recorded last-known-good snapshot');
  console.log('✓ 4 migration merges observed backend trades');
})();

// ── 5. acceptance: OK(count=1) then transient failure keeps positions at 1 ───
(async function() {
  let call = 0;
  const tt = async function(p) {
    if (p !== '/journal/trades') return {};
    call++;
    if (call === 1) return { trades: [{ id: 'b1', portfolioId: 7, status: 'OPEN', ticker: 'AAA' }] };
    throw new Error('net::ERR_NETWORK_CHANGED');   // later sync fails transiently
  };
  const jm = makeJournalManager([]);
  const ctx = makeCtx({ ttCall: tt, journalManager: jm });

  const first = await vm.runInContext('_jSyncJournalFromBackend()', ctx);
  assert(first === true, '5: first sync OK (had trades)');
  assert(jm.getAll().length === 1, '5: first sync merged 1 trade');
  assert(ctx._jLastKnownGoodCount === 1 && ctx._journalSyncFailed === false, '5: snapshot recorded, not failed');

  const second = await vm.runInContext('_jSyncJournalFromBackend()', ctx);
  assert(second === false, '5: second sync reports failure');
  assert(ctx._journalSyncFailed === true, '5: failure latched');
  assert(jm.getAll().length === 1, '5: positions NOT reduced to zero after transient failure');
  console.log('✓ 5 acceptance: transient failure never collapses positions to zero');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 200);
