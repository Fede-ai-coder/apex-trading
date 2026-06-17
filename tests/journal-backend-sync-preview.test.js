'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL BACKEND SYNC — deploy-preview gating.
//
// After the backend-backed Portfolio work, Journal backend READ sync must run on
// Netlify deploy previews (so /journal/trades is fetched and portfolio cards show
// linkedTradeCount/openLinked/closedLinked), while genuine local dev stays offline
// and local trades are NEVER auto-uploaded from a preview.
//
//   1. Deploy-preview host + backend/key  -> _jSyncJournalFromBackend NOT skipped
//                                            (GET /journal/trades is issued).
//   2. localhost / file://                -> read sync stays disabled (no fetch).
//   3. No auto-migration (upload) of local trades on a deploy preview, and none
//      on a normal host when the backend already has those trade ids.
//   4. getPortfolioJournalReconciliation uses the backend-loaded trades with
//      tolerant matching: String(trade.portfolioId) === String(portfolio.id).
//
// Run: node tests/journal-backend-sync-preview.test.js
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
const J = (a) => JSON.stringify(a);

function makeTtCall(router) {
  const calls = [];
  const fn = async function(path, opts) {
    opts = opts || {};
    calls.push({ path, method: opts.method || 'GET', body: opts.body });
    return router(path, opts);
  };
  fn._calls = calls;
  return fn;
}

// journalManager with a real backend-wins merge (mirrors the in-app contract).
function makeJournalManager(initial) {
  let arr = (initial || []).slice();
  return {
    getAll() { return arr.slice(); },
    loadFromBackend(bt) {
      const map = {}; arr.forEach(t => map[String(t.id)] = t);
      let ch = 0;
      (bt || []).forEach(b => { map[String(b.id)] = b; ch++; });
      arr = Object.values(map);
      return ch;
    },
  };
}

function makeCtx(opts) {
  opts = opts || {};
  const ttCall = opts.ttCall || makeTtCall(() => ({ trades: [] }));
  const jm = opts.journalManager || makeJournalManager(opts.trades || []);
  const saveRemoteCalls = [];
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object, Promise, Set, RegExp,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    ttCall,
    journalManager: jm,
    portfolioManager: { getAll: () => (opts.portfolios || []).slice() },
    // legacy jLoad/jSave store (used by jLoadFromBackend)
    _jstore: (opts.jstore || []).slice(),
    jLastSync: null,
    _jMigrationDone: false,
    // Journal transient-sync resilience state (module-level in index.html)
    _jLastKnownGoodTrades: null,
    _jLastKnownGoodCount: 0,
    _journalSyncFailed: false,
    setTimeout: (fn) => fn(),   // retry backoff resolves immediately in tests
    showToast: function() {},
    jSaveRemote: async function(t) { saveRemoteCalls.push(t); return true; },
    _tradeForBackend: function(t) { return t; },
    renderPortfolioJournalView: function() {},
  };
  ctx.jLoad = function() { return ctx._jstore.slice(); };
  ctx.jSave = function(arr) { ctx._jstore = arr.slice(); };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'isApexPreviewOrLocalEnv'),
    extractFn(HTML, 'isApexLocalDevEnv'),
    extractFn(HTML, 'getPortfolioJournalReconciliation'),
    extractFn(HTML, '_resolveTradePortfolioId'),
    extractFn(HTML, '_normalizeBackendTradePortfolioId'),
    extractFn(HTML, '_isTransientFetchError'),
    extractFn(HTML, '_ttCallWithRetry'),
    extractFn(HTML, '_jRecordBackendSnapshot'),
    extractFn(HTML, '_jSyncJournalFromBackend'),
    extractFn(HTML, 'jLoadFromBackend'),
    extractFn(HTML, 'jMigrateApexTradesToBackend'),
  ].join('\n'), ctx);
  ctx._ttCall = ttCall;
  ctx._saveRemoteCalls = saveRemoteCalls;
  ctx._jm = jm;
  return ctx;
}

// ── 1. deploy-preview + backend/key -> read sync NOT skipped ──────────────────
(async function() {
  const tt = makeTtCall((p) => p === '/journal/trades'
    ? { trades: [{ id: 't1', portfolioId: 1, status: 'OPEN', ticker: 'AAA' }] } : { });
  const ctx = makeCtx({ ttCall: tt, host: 'deploy-preview-256--apex.netlify.app' });
  const had = await ctx._jSyncJournalFromBackend();
  assert(tt._calls.some(c => c.path === '/journal/trades' && c.method === 'GET'),
    '1: deploy-preview issues GET /journal/trades (read sync not skipped)');
  assert(had === true, '1: returns true when backend has trades');
  assert(ctx._jm.getAll().length === 1, '1: backend trade merged into journalManager');
  console.log('✓ 1 deploy-preview: Journal read sync enabled');

  // jLoadFromBackend (legacy pull path) is also enabled on deploy preview
  const tt2 = makeTtCall((p) => p === '/journal/trades'
    ? { trades: [{ id: 'x9', portfolioId: '5', status: 'CLOSED', createdAt: '2025-01-01' }] } : {});
  const ctx2 = makeCtx({ ttCall: tt2, host: 'deploy-preview-256--apex.netlify.app', jstore: [] });
  const ok2 = await ctx2.jLoadFromBackend();
  assert(ok2 === true && tt2._calls.some(c => c.path === '/journal/trades'),
    '1: jLoadFromBackend pulls on deploy preview');
  assert(ctx2._jstore.length === 1, '1: jLoadFromBackend merged backend trade into local store');
  console.log('✓ 1 deploy-preview: jLoadFromBackend pull enabled');
})();

// ── 2. localhost / file:// -> read sync stays disabled ───────────────────────
(async function() {
  const ttLocal = makeTtCall(() => ({ trades: [{ id: 't1' }] }));
  const ctxLocal = makeCtx({ ttCall: ttLocal, host: 'localhost' });
  const r1 = await ctxLocal._jSyncJournalFromBackend();
  assert(r1 === false && ttLocal._calls.length === 0, '2: localhost skips _jSyncJournalFromBackend (no fetch)');

  const ttFile = makeTtCall(() => ({ trades: [{ id: 't1' }] }));
  const ctxFile = makeCtx({ ttCall: ttFile, host: '', protocol: 'file:' });
  const r2 = await ctxFile._jSyncJournalFromBackend();
  assert(r2 === false && ttFile._calls.length === 0, '2: file:// skips _jSyncJournalFromBackend (no fetch)');

  const ttPull = makeTtCall(() => ({ trades: [{ id: 't1' }] }));
  const ctxPull = makeCtx({ ttCall: ttPull, host: '127.0.0.1' });
  const r3 = await ctxPull.jLoadFromBackend();
  assert(r3 === false && ttPull._calls.length === 0, '2: 127.0.0.1 skips jLoadFromBackend (no fetch)');
  console.log('✓ 2 localhost/127.0.0.1/file: Journal backend sync stays disabled');
})();

// ── 3. no auto-upload of local trades ────────────────────────────────────────
(async function() {
  // (a) deploy preview NEVER auto-migrates (uploads) local trades
  const ttPrev = makeTtCall((p) => p === '/journal/trades' ? { trades: [] } : {});
  const ctxPrev = makeCtx({
    ttCall: ttPrev, host: 'deploy-preview-256--apex.netlify.app',
    journalManager: makeJournalManager([{ id: 'L1', portfolioId: 1, status: 'OPEN' }]),
  });
  await ctxPrev.jMigrateApexTradesToBackend();
  assert(ctxPrev._saveRemoteCalls.length === 0, '3a: deploy preview does NOT auto-upload local trades');
  assert(ttPrev._calls.length === 0, '3a: deploy preview migration is skipped entirely (no calls)');

  // (b) on a normal host, when the backend already has the trade ids, nothing is
  //     re-uploaded at startup
  const ttProd = makeTtCall((p) => p === '/journal/trades'
    ? { trades: [{ id: 'L1' }, { id: 'L2' }] } : {});
  const ctxProd = makeCtx({
    ttCall: ttProd, host: 'app.example.com',
    journalManager: makeJournalManager([
      { id: 'L1', portfolioId: 1, status: 'OPEN' },
      { id: 'L2', portfolioId: 1, status: 'CLOSED' },
    ]),
  });
  await ctxProd.jMigrateApexTradesToBackend();
  assert(ctxProd._saveRemoteCalls.length === 0, '3b: no re-upload when backend already has the trade ids');
  console.log('✓ 3 no auto-upload of local trades (preview skipped; existing ids not re-sent)');
})();

// ── 4. reconciliation uses backend-loaded trades, tolerant string matching ───
(async function() {
  const portfolios = [{ id: 1717171717, name: 'Live', type: 'options' }];   // numeric id
  // Backend returns trades whose portfolioId is a STRING — must still reconcile.
  const tt = makeTtCall((p) => p === '/journal/trades' ? { trades: [
    { id: 'b1', portfolioId: '1717171717', status: 'OPEN', ticker: 'AAA' },   // string pid
    { id: 'b2', portfolioId: 1717171717, status: 'CLOSED', ticker: 'BBB' },   // numeric pid
    { id: 'b3', portfolioId: '999', status: 'OPEN', ticker: 'CCC' },          // dangling
  ] } : {});
  const jm = makeJournalManager([]);   // starts empty; backend is the source
  const ctx = makeCtx({ ttCall: tt, host: 'deploy-preview-256--apex.netlify.app', journalManager: jm, portfolios });
  await ctx._jSyncJournalFromBackend();   // loads backend trades into journalManager
  assert(ctx._jm.getAll().length === 3, '4: backend trades loaded into journalManager');
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 2, '4: tolerant matching assigns numeric+string pid backend trades');
  assert(rec.unassignedTradeCount === 1, '4: dangling pid stays unassigned');
  const slot = rec.perPortfolio['1717171717'];
  assert(slot && slot.linkedTradeCount === 2 && slot.openLinked === 1 && slot.closedLinked === 1,
    '4: portfolio card counts (linked/open/closed) reflect backend trades');
  console.log('✓ 4 reconciliation uses backend-loaded trades with tolerant matching');
})();

// ── static guard: only the migration (upload) path keeps the broad predicate ─
(function() {
  const readSync = extractFn(HTML, '_jSyncJournalFromBackend');
  const pull     = extractFn(HTML, 'jLoadFromBackend');
  const migrate  = extractFn(HTML, 'jMigrateApexTradesToBackend');
  assert(readSync.indexOf('isApexLocalDevEnv()') !== -1 && readSync.indexOf('isApexPreviewOrLocalEnv()') === -1,
    'guard: read sync gates on isApexLocalDevEnv only');
  assert(pull.indexOf('isApexLocalDevEnv()') !== -1 && pull.indexOf('isApexPreviewOrLocalEnv()') === -1,
    'guard: pull gates on isApexLocalDevEnv only');
  assert(migrate.indexOf('isApexPreviewOrLocalEnv()') !== -1,
    'guard: upload/migration keeps broad preview-or-local predicate (no auto-upload from preview)');
  console.log('✓ guard: read paths use local-dev predicate; upload path stays preview-gated');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 100);
