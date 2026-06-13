'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MANUAL JOURNAL TRADE IMPORT — apexImportJournalTradesJson(jsonOrArray, opts).
//
// Console-only cross-host migration: paste main-production's apex_trades and
// upload them to the (empty) dev backend so Portfolio reconciliation has data.
// This suite reproduces the verified bug — a backend that persists the portfolio
// link under snake_case `portfolio_id` and drops camelCase `portfolioId` — and
// proves the end-to-end fix: portfolioId is sent under every alias, normalized on
// read, and existing trades missing a portfolioId are REPAIRED (PUT), not skipped.
//
//   1. Import sends portfolioId in the POST body (under aliases).
//   2. GET after import + normalization yields a populated trade.portfolioId.
//   3. Re-import of an existing trade missing portfolioId UPDATES it (PUT).
//   4. A duplicate that already has the correct portfolioId stays `duplicate`.
//   5. Reconciliation links via String(trade.portfolioId) === String(portfolio.id).
//   6. No mutation of portfolio/trade ids; input objects untouched.
//   7. No localStorage writes; no migration/formula/scanner/candle refs; no auto-calls.
//
// Run: node tests/journal-import-json.test.js
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

// Stateful SNAKE-CASE backend reproducing the bug: it persists the portfolio link
// only under `portfolio_id` and never echoes camelCase `portfolioId`. POST creates,
// PUT /journal/trades/:id merges (used by the portfolioId repair), GET returns all.
function makeSnakeBackend(initial) {
  const store = new Map();
  const calls = [];
  function persist(b) {
    const rec = Object.assign({}, b);
    if (rec.portfolio_id == null && rec.portfolioId != null) rec.portfolio_id = rec.portfolioId;
    delete rec.portfolioId;            // backend schema has no camelCase column
    delete rec.portfolio;              // and no scalar alias column
    rec.id = String(rec.id);
    return rec;
  }
  const router = function(p, o) {
    o = o || {};
    const method = o.method || 'GET';
    const body = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
    calls.push({ path: p, method, body });
    if (p === '/journal/trades' && method === 'GET') return { trades: Array.from(store.values()).map(x => Object.assign({}, x)) };
    if (p === '/journal/trades' && method === 'POST') { const r = persist(body); store.set(r.id, r); return { id: r.id }; }
    const m = p.match(/^\/journal\/trades\/(.+)$/);
    if (m && method === 'PUT') {
      const id = decodeURIComponent(m[1]);
      // Backend PUT is a FULL replace and enforces NOT NULL trades.ticker — a
      // partial { portfolioId } body must be rejected (reproduces the bug).
      if (!body || body.ticker == null) throw new Error('NOT NULL constraint failed: trades.ticker');
      const r = persist(Object.assign({}, body, { id }));
      store.set(id, r);
      return { id, ok: true };
    }
    return {};
  };
  // seed (already persisted shape)
  (initial || []).forEach(t => { const r = persist(t); store.set(r.id, r); });
  router._store = store;
  router._calls = calls;
  return router;
}

function makeJournalManager(initial) {
  let arr = (initial || []).slice();
  return {
    getAll() { return arr.slice(); },
    loadFromBackend(bt) {
      const map = {}; arr.forEach(t => map[String(t.id)] = t);
      let ch = 0; (bt || []).forEach(b => { map[String(b.id)] = b; ch++; });
      arr = Object.values(map); return ch;
    },
  };
}

function makeCtx(opts) {
  opts = opts || {};
  const backend = opts.backend || makeSnakeBackend([]);
  const jm = opts.journalManager || makeJournalManager([]);
  const calls = [];
  const ttCall = async function(p, o) { o = o || {}; calls.push({ path: p, method: o.method || 'GET', body: o.body }); return backend(p, o); };
  let renderCount = 0;
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object, Promise, Set, RegExp, Math, encodeURIComponent, decodeURIComponent,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    _activeView: opts.activeView || 'portfolio',
    ttCall,
    journalManager: jm,
    portfolioManager: { getAll: () => (opts.portfolios || []).slice() },
    ffBackendOffloadV1: () => false,
    renderPortfolioView() { renderCount++; },
    showToast() {},
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'isApexPreviewOrLocalEnv'),
    extractFn(HTML, 'isApexLocalDevEnv'),
    extractFn(HTML, 'getPortfolioJournalReconciliation'),
    extractFn(HTML, '_resolveTradePortfolioId'),
    extractFn(HTML, '_normalizeBackendTradePortfolioId'),
    extractFn(HTML, '_tradeForBackend'),
    extractFn(HTML, 'jSaveRemote'),
    extractFn(HTML, '_jSyncJournalFromBackend'),
    extractFn(HTML, '_journalImportPayload'),
    extractFn(HTML, '_journalRepairPortfolioIdRemote'),
    extractFn(HTML, 'apexImportJournalTradesJson'),
  ].join('\n'), ctx);
  ctx._backend = backend;
  ctx._ttCalls = calls;
  ctx._jm = jm;
  ctx._renderCount = () => renderCount;
  return ctx;
}

// ── 1/2/5/6. fresh import end-to-end: sent under alias, normalized, reconciled ─
(async function() {
  const trades = [
    { id: 'm1', portfolioId: '101', status: 'OPEN',   ticker: 'AAA', createdAt: '2025-01-01', legs: [{ k: 1 }] },
    { id: 'm2', portfolioId: 202,   status: 'CLOSED', symbol: 'BBB', createdAt: '2025-02-02' },
    { id: 'm3', portfolioId: 303,   status: 'OPEN',   ticker: 'CCC', live: { transient: true } },
  ];
  const input = JSON.parse(JSON.stringify(trades));
  const inputSnapshot = J(input);
  const ctx = makeCtx({ portfolios: [{ id: 101 }, { id: 202 }, { id: 303 }] });
  const rep = await ctx.apexImportJournalTradesJson(JSON.stringify(input));

  // 1: POST body carried the portfolio link under aliases (backend kept portfolio_id)
  const posts = ctx._backend._calls.filter(c => c.path === '/journal/trades' && c.method === 'POST');
  assert(posts.length === 3, '1: 3 trades POSTed');
  assert(posts[0].body.portfolioId === '101' && posts[0].body.portfolio_id === '101', '1: POST body includes portfolioId + portfolio_id aliases');
  assert(ctx._backend._store.get('m1').portfolio_id === '101', '1: backend persisted portfolio_id from the import');
  assert(!('portfolioId' in ctx._backend._store.get('m1')), '1: backend (snake-only) dropped camelCase, reproducing the bug');
  assert(!('live' in ctx._backend._store.get('m3')), '1: transient .live dropped');

  // 2: GET + normalization repopulated trade.portfolioId in journalManager
  assert(ctx._jm.getAll().length === 3, '2: journalManager populated');
  ctx._jm.getAll().forEach(t => assert(t.portfolioId != null, '2: ' + t.id + ' has normalized portfolioId after sync'));
  assert(rep.backendTradeCount === 3, '2: backendTradeCount = 3');
  assert(rep.tradesMissingPortfolioIdAfterImport === 0, '2: no backend trade missing portfolioId after import');

  // 5: reconciliation links the normalized trades
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 3 && rec.unassignedTradeCount === 0, '5: all 3 assigned via tolerant matching');
  assert(rec.perPortfolio['101'].linkedTradeCount === 1 && rec.perPortfolio['101'].openLinked === 1, '5: Live linked/open > 0');

  // 6: input objects not mutated
  assert(J(input) === inputSnapshot, '6: input trade objects untouched');
  assert(rep.imported === 3 && rep.updated === 0 && rep.duplicate === 0, '6: report counts (imported=3)');
  console.log('✓ 1/2/5/6 fresh import: alias send, normalize, reconcile, no mutation');
})();

// ── 3. RE-IMPORT REPAIR: existing trades without portfolioId get updated (PUT) ─
(async function() {
  // Backend already holds 3 trades imported WITHOUT any portfolio link (the
  // verified 96-trade situation, scaled down). Re-import with portfolioId.
  const backend = makeSnakeBackend([
    { id: 'r1', status: 'OPEN',   ticker: 'AAA' },   // no portfolio_id
    { id: 'r2', status: 'CLOSED', ticker: 'BBB' },
    { id: 'r3', status: 'OPEN',   ticker: 'CCC' },
  ]);
  // sanity: seeded trades have no portfolio link
  assert(Array.from(backend._store.values()).every(t => t.portfolio_id == null), 'pre: seeded trades lack portfolio_id');

  const ctx = makeCtx({ backend, portfolios: [{ id: 101, name: 'Live' }, { id: 202, name: 'Testing' }] });
  const rep = await ctx.apexImportJournalTradesJson([
    { id: 'r1', portfolioId: 101, status: 'OPEN',   ticker: 'AAA' },
    { id: 'r2', portfolioId: 101, status: 'CLOSED', ticker: 'BBB' },
    { id: 'r3', portfolioId: 202, status: 'OPEN',   ticker: 'CCC' },
  ]);

  const puts = backend._calls.filter(c => c.method === 'PUT');
  assert(puts.length === 3, '3: 3 PUT repairs issued for existing trades missing portfolioId');
  // CRITICAL: repair must send a COMPLETE trade, not a partial { portfolioId } body
  // (the NOT NULL trades.ticker backend would otherwise reject it).
  assert(puts.every(c => c.body && c.body.ticker != null), '3: repair PUT body includes ticker (full payload, not partial)');
  assert(puts[0].body.status != null && (puts[0].body.portfolioId != null || puts[0].body.portfolio_id != null),
    '3: repair PUT body carries status + portfolioId aliases');
  assert(rep.updated === 3 && rep.imported === 0 && rep.duplicate === 0 && rep.failed === 0, '3: report updated=3, failed=0, not duplicate');
  assert(backend._store.get('r1').portfolio_id === 101 && backend._store.get('r1').ticker === 'AAA', '3: backend trade repaired with portfolio_id, ticker preserved');
  assert(rep.tradesMissingPortfolioIdAfterImport === 0, '3: nothing missing portfolioId after repair');

  // reconciliation now links the repaired trades
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 3 && rec.unassignedTradeCount === 0, '3: reconciliation links repaired trades');
  assert(rec.perPortfolio['101'].linkedTradeCount === 2, '3: Live linkedTradeCount = 2 after repair');
  console.log('✓ 3 re-import repairs existing trades missing portfolioId (PUT, counted updated)');
})();

// ── 4. duplicate that ALREADY has portfolioId stays duplicate (no PUT/POST) ───
(async function() {
  const backend = makeSnakeBackend([{ id: 'd1', portfolioId: 101, status: 'OPEN' }]);   // seeded WITH link
  assert(backend._store.get('d1').portfolio_id === 101, 'pre: seeded duplicate has portfolio_id');
  const ctx = makeCtx({ backend, portfolios: [{ id: 101 }] });
  const rep = await ctx.apexImportJournalTradesJson([{ id: 'd1', portfolioId: 101, status: 'OPEN' }]);
  assert(rep.duplicate === 1 && rep.updated === 0 && rep.imported === 0, '4: counted duplicate, not updated/imported');
  assert(backend._calls.filter(c => c.method === 'POST' || c.method === 'PUT').length === 0, '4: no POST/PUT for an already-linked duplicate');
  console.log('✓ 4 duplicate with correct portfolioId stays duplicate (no write)');
})();

// ── mixed re-import: some already-linked (duplicate), some repaired (updated) ─
(async function() {
  // Mirrors the real preview: backend has all trades; some already carry the
  // portfolio link, the rest are missing it and must be repaired.
  const seed = [];
  for (let i = 1; i <= 5; i++) seed.push({ id: 'L' + i, status: 'OPEN', ticker: 'T' + i, portfolioId: 101 }); // already linked
  for (let i = 1; i <= 3; i++) seed.push({ id: 'M' + i, status: 'OPEN', ticker: 'U' + i });                    // missing link
  const backend = makeSnakeBackend(seed);
  const ctx = makeCtx({ backend, portfolios: [{ id: 101, name: 'Live' }, { id: 202, name: 'Testing' }] });

  const input = []
    .concat(seed.filter(t => t.id[0] === 'L').map(t => ({ id: t.id, status: 'OPEN', ticker: t.ticker, portfolioId: 101 })))
    .concat([
      { id: 'M1', status: 'OPEN', ticker: 'U1', portfolioId: 101 },
      { id: 'M2', status: 'OPEN', ticker: 'U2', portfolioId: 202 },
      { id: 'M3', status: 'OPEN', ticker: 'U3', portfolioId: 202 },
    ]);
  const rep = await ctx.apexImportJournalTradesJson(input);
  assert(rep.imported === 0, 'mixed: nothing newly imported (all ids already exist)');
  assert(rep.updated === 3, 'mixed: 3 repaired (the previously unlinked trades)');
  assert(rep.duplicate === 5, 'mixed: 5 already-linked stay duplicate');
  assert(rep.failed === 0, 'mixed: 0 failed (full payload satisfies NOT NULL ticker)');
  assert(rep.tradesMissingPortfolioIdAfterImport === 0, 'mixed: 0 missing portfolioId after repair');
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.perPortfolio['101'].linkedTradeCount === 6, 'mixed: Live linked = 5 + 1 repaired');
  assert(rec.perPortfolio['202'].linkedTradeCount === 2, 'mixed: Testing linked = 2 repaired');
  assert(rec.unassignedTradeCount === 0, 'mixed: nothing unassigned after repair');
  console.log('✓ mixed re-import: duplicates kept, missing repaired, report + reconciliation correct');
})();

// ── input validation + array acceptance + backend-unavailable abort ──────────
(async function() {
  const ctx = makeCtx({});
  assert((await ctx.apexImportJournalTradesJson([{ id: 'a1', portfolioId: 1, status: 'OPEN' }])).imported === 1, 'accepts a plain array');
  assert((await ctx.apexImportJournalTradesJson('{"not":"array"}')).ok === false, 'rejects non-array JSON');
  assert((await ctx.apexImportJournalTradesJson('nope{')).ok === false, 'rejects invalid JSON string');
  const off = makeCtx({ backendKey: '' });
  const r = await off.apexImportJournalTradesJson([{ id: 'a', portfolioId: 1 }]);
  assert(r.ok === false && r.errors[0] === 'backend_unavailable', 'aborts when backend unusable');
  console.log('✓ validation: array/JSON/bad-input + backend-unavailable abort');
})();

// ── normalization helper: fills from aliases, never overwrites ───────────────
(function() {
  const ctx = makeCtx({});
  assert(ctx._resolveTradePortfolioId({ portfolio_id: 7 }) === 7, 'resolve: snake_case');
  assert(ctx._resolveTradePortfolioId({ portfolio: '9' }) === '9', 'resolve: scalar portfolio');
  assert(ctx._resolveTradePortfolioId({ portfolioId: 1, portfolio_id: 2 }) === 1, 'resolve: camelCase wins when present');
  const a = { id: 'x', portfolio_id: 5 };
  const out = ctx._normalizeBackendTradePortfolioId(a);
  assert(out.portfolioId === 5 && a.portfolioId === undefined, 'normalize: fills clone, does not mutate source');
  const b = { id: 'y', portfolioId: 3, portfolio_id: 99 };
  assert(ctx._normalizeBackendTradePortfolioId(b).portfolioId === 3, 'normalize: never overwrites an existing portfolioId');
  console.log('✓ normalization fills from aliases and never overwrites');
})();

// ── static guards: non-destructive, read-only, no auto-call sites ────────────
(function() {
  const body = extractFn(HTML, 'apexImportJournalTradesJson') + '\n' +
               extractFn(HTML, '_journalImportPayload') + '\n' +
               extractFn(HTML, '_journalRepairPortfolioIdRemote') + '\n' +
               extractFn(HTML, '_normalizeBackendTradePortfolioId') + '\n' +
               extractFn(HTML, '_resolveTradePortfolioId');
  assert(body.indexOf('localStorage.clear') === -1, 'no localStorage.clear');
  assert(body.indexOf('localStorage.removeItem') === -1 && body.indexOf('removeItem(') === -1, 'no removeItem');
  assert(body.indexOf('localStorage.setItem') === -1, 'never writes localStorage');
  const codeOnly = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(codeOnly.indexOf('jMigrateApexTradesToBackend') === -1, 'never calls jMigrateApexTradesToBackend');
  ['aggregateGreeks', 'computePortfolioRisk', 'portfolioRiskMetrics', 'calcVega', 'calcTheta',
   'betaWeightedDelta', 'computeBWD', 'runScanner', 'candleStore', 'marketContext', 'vixFamily']
    .forEach(fn => assert(codeOnly.indexOf(fn) === -1, 'does not reference ' + fn));
  // only the import repair PUT may assign portfolio_id; it never reassigns an
  // existing camelCase trade.portfolioId on the input (mutation guard).
  assert(codeOnly.indexOf('t.portfolioId =') === -1 && codeOnly.indexOf('t.portfolioId=') === -1, 'never assigns input t.portfolioId');

  const showView = extractFn(HTML, 'showView');
  const openLoad = extractFn(HTML, '_portfolioOpenBackendLoad');
  assert(showView.indexOf('apexImportJournalTradesJson') === -1, 'showView never calls apexImportJournalTradesJson');
  assert(openLoad.indexOf('apexImportJournalTradesJson') === -1, 'Portfolio open helper never calls it');
  assert((HTML.match(/function\s+apexImportJournalTradesJson\s*\(/g) || []).length === 1, 'exactly one definition');
  console.log('✓ static guards: non-destructive, read-only, no auto-call sites');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 150);
