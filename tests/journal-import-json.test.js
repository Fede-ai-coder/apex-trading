'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MANUAL JOURNAL TRADE IMPORT — apexImportJournalTradesJson(jsonOrArray, opts).
//
// Console-only cross-host migration: paste main-production's apex_trades and
// upload them to the (empty) dev backend so Portfolio reconciliation has data.
// Reuses jSaveRemote + _tradeForBackend; never auto-runs; never mutates
// portfolioId; never clears/removes localStorage.
//
//   1. Accepts a JSON string AND a plain array (and rejects non-array/bad JSON).
//   2. Preserves id and portfolioId exactly on the POSTed body.
//   3. Never mutates the input trade.portfolioId.
//   4. Function body never calls localStorage.clear/removeItem.
//   5. Not referenced from Portfolio open (showView / _portfolioOpenBackendLoad).
//   6. Not referenced from Journal open (showView journal branch).
//   7. After import it GETs /journal/trades and populates journalManager.
//   8. Reconciliation links via String(trade.portfolioId) === String(portfolio.id).
//   9. Function body references no risk/greeks/scanner/candle/MCX APIs, and never
//      calls jMigrateApexTradesToBackend(). Duplicates are skipped, not re-created.
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

// Stateful mock backend: POST stores a trade, GET returns the store.
function makeBackend(initial) {
  const store = new Map();
  (initial || []).forEach(t => store.set(String(t.id), t));
  const calls = [];
  const router = function(p, o) {
    o = o || {};
    const method = o.method || 'GET';
    calls.push({ path: p, method, body: o.body });
    if (p === '/journal/trades' && method === 'GET') return { trades: Array.from(store.values()) };
    if (p === '/journal/trades' && method === 'POST') {
      const b = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
      store.set(String(b.id), b);
      return { id: b.id };
    }
    return {};
  };
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
  const backend = opts.backend || makeBackend([]);
  const jm = opts.journalManager || makeJournalManager([]);
  const calls = [];
  const ttCall = async function(p, o) { o = o || {}; calls.push({ path: p, method: o.method || 'GET', body: o.body }); return backend(p, o); };
  let renderCount = 0;
  const toasts = [];
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object, Promise, Set, RegExp, Math,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    _activeView: opts.activeView || 'portfolio',
    ttCall,
    journalManager: jm,
    portfolioManager: { getAll: () => (opts.portfolios || []).slice() },
    ffBackendOffloadV1: () => false,
    renderPortfolioView() { renderCount++; },
    showToast: (m, k) => toasts.push([k, m]),
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'isApexPreviewOrLocalEnv'),
    extractFn(HTML, 'isApexLocalDevEnv'),
    extractFn(HTML, 'getPortfolioJournalReconciliation'),
    extractFn(HTML, '_tradeForBackend'),
    extractFn(HTML, 'jSaveRemote'),
    extractFn(HTML, '_jSyncJournalFromBackend'),
    extractFn(HTML, 'apexImportJournalTradesJson'),
  ].join('\n'), ctx);
  ctx._backend = backend;
  ctx._ttCalls = calls;
  ctx._jm = jm;
  ctx._renderCount = () => renderCount;
  return ctx;
}

// ── 1/2/3/7. JSON-string import: preserves id+portfolioId, populates manager ──
(async function() {
  const trades = [
    { id: 'm1', portfolioId: '101', status: 'OPEN',   ticker: 'AAA', createdAt: '2025-01-01', legs: [{ k: 1 }] },
    { id: 'm2', portfolioId: 202,   status: 'CLOSED', symbol: 'BBB', createdAt: '2025-02-02' },
    { id: 'm3', portfolioId: 303,   status: 'OPEN',   ticker: 'CCC', createdAt: '2025-03-03', live: { transient: true } },
  ];
  const input = JSON.parse(JSON.stringify(trades));        // what the user pastes
  const inputSnapshot = J(input);
  const ctx = makeCtx({ portfolios: [{ id: 101 }, { id: 202 }, { id: 303 }] });
  const rep = await ctx.apexImportJournalTradesJson(JSON.stringify(input));

  assert(rep.imported === 3 && rep.duplicate === 0 && rep.failed === 0, '1: 3 imported from JSON string');
  // 2: ids + portfolioIds preserved exactly in the backend store
  const store = ctx._backend._store;
  assert(store.get('m1').portfolioId === '101' && store.get('m1').id === 'm1', '2: id + string portfolioId preserved');
  assert(store.get('m2').portfolioId === 202, '2: numeric portfolioId preserved');
  assert(store.get('m1').createdAt === '2025-01-01' && J(store.get('m1').legs) === J([{ k: 1 }]), '2: createdAt/legs preserved');
  assert(!('live' in store.get('m3')), '2: transient .live dropped by _tradeForBackend');
  // 3: input objects not mutated
  assert(J(input) === inputSnapshot, '3: input trade objects (portfolioId) untouched');
  // 7: journalManager populated via GET /journal/trades after import
  assert(ctx._jm.getAll().length === 3, '7: journalManager populated from backend after import');
  assert(rep.backendTradeCount === 3, '7: report backendTradeCount reflects backend GET');
  console.log('✓ 1/2/3/7 JSON import preserves id/portfolioId, drops .live, populates journalManager');
})();

// ── 1b. accepts a plain array; validates non-array / bad JSON ─────────────────
(async function() {
  const ctx = makeCtx({});
  const rep = await ctx.apexImportJournalTradesJson([{ id: 'z1', portfolioId: 1, status: 'OPEN' }]);
  assert(rep.imported === 1, '1b: accepts a plain array');
  const bad = await ctx.apexImportJournalTradesJson('{"not":"array"}');
  assert(bad.ok === false && bad.imported === 0, '1b: rejects non-array JSON');
  const badStr = await ctx.apexImportJournalTradesJson('not json{');
  assert(badStr.ok === false, '1b: rejects invalid JSON string');
  console.log('✓ 1b array input + non-array/bad-JSON validation');
})();

// ── duplicate handling: same id already on backend is not re-created ──────────
(async function() {
  const backend = makeBackend([{ id: 'dup', portfolioId: 1, status: 'OPEN' }]);
  const ctx = makeCtx({ backend });
  const rep = await ctx.apexImportJournalTradesJson([
    { id: 'dup', portfolioId: 1, status: 'OPEN' },   // already present
    { id: 'new', portfolioId: 1, status: 'OPEN' },   // new
  ]);
  const posts = ctx._ttCalls.filter(c => c.path === '/journal/trades' && c.method === 'POST');
  assert(rep.duplicate === 1 && rep.imported === 1, 'duplicate counted, new imported');
  assert(posts.length === 1, 'duplicate id is NOT re-POSTed');
  console.log('✓ duplicate handling: existing id skipped, not re-created');
})();

// ── 8. reconciliation tolerant matching over imported backend trades ─────────
(async function() {
  const portfolios = [{ id: 101, name: 'Live' }, { id: 202, name: 'Testing' }];
  const ctx = makeCtx({ portfolios });
  await ctx.apexImportJournalTradesJson([
    { id: 't1', portfolioId: '101', status: 'OPEN' },    // string pid vs numeric id
    { id: 't2', portfolioId: 101,   status: 'CLOSED' },
    { id: 't3', portfolioId: '202', status: 'OPEN' },
    { id: 't4', portfolioId: '999', status: 'OPEN' },    // dangling -> unassigned
  ]);
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 3 && rec.unassignedTradeCount === 1, '8: tolerant matching (3 assigned / 1 unassigned)');
  assert(rec.perPortfolio['101'].linkedTradeCount === 2 && rec.perPortfolio['101'].openLinked === 1 && rec.perPortfolio['101'].closedLinked === 1,
    '8: Live card linked/open/closed > 0');
  console.log('✓ 8 reconciliation links imported trades with tolerant string matching');
})();

// ── backend-unavailable + render gating ──────────────────────────────────────
(async function() {
  const ctx = makeCtx({ backendKey: '' });
  const rep = await ctx.apexImportJournalTradesJson([{ id: 'a', portfolioId: 1 }]);
  assert(rep.ok === false && rep.errors[0] === 'backend_unavailable', 'aborts cleanly when backend unusable');

  const ctx2 = makeCtx({ activeView: 'journal' });
  await ctx2.apexImportJournalTradesJson([{ id: 'a', portfolioId: 1, status: 'OPEN' }]);
  assert(ctx2._renderCount() === 0, 'does not re-render Portfolio when active view is not portfolio');
  console.log('✓ backend-unavailable abort + portfolio re-render gating');
})();

// ── 4/9. static guards: non-destructive, read-only, no auto-call sites ────────
(function() {
  const body = extractFn(HTML, 'apexImportJournalTradesJson');
  // 4: never clears/removes/writes localStorage (the only textual "localStorage" is
  // inside a help-message string; there is no localStorage API call).
  assert(body.indexOf('localStorage.clear') === -1, '4: no localStorage.clear');
  assert(body.indexOf('localStorage.removeItem') === -1, '4: no localStorage.removeItem');
  assert(body.indexOf('localStorage.setItem') === -1, '4: never writes localStorage');
  assert(body.indexOf('removeItem(') === -1 && body.indexOf('.clear(') === -1, '4: no removeItem()/clear() calls');
  // 9: no migration / formula / scanner / candle / MCX references
  const codeOnly = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(codeOnly.indexOf('jMigrateApexTradesToBackend') === -1, '9: never calls jMigrateApexTradesToBackend');
  ['aggregateGreeks', 'computePortfolioRisk', 'portfolioRiskMetrics', 'calcVega', 'calcTheta',
   'betaWeightedDelta', 'computeBWD', 'runScanner', 'candleStore', 'marketContext', 'vixFamily']
    .forEach(fn => assert(codeOnly.indexOf(fn) === -1, '9: does not reference ' + fn));
  // never mutates a trade's portfolioId
  assert(codeOnly.indexOf('.portfolioId =') === -1 && codeOnly.indexOf('.portfolioId=') === -1, '9: never assigns trade.portfolioId');

  // 5/6: not invoked from Portfolio open or Journal open
  const showView = extractFn(HTML, 'showView');
  const openLoad = extractFn(HTML, '_portfolioOpenBackendLoad');
  assert(showView.indexOf('apexImportJournalTradesJson') === -1, '6: showView (Portfolio/Journal open) never calls apexImportJournalTradesJson');
  assert(openLoad.indexOf('apexImportJournalTradesJson') === -1, '5: Portfolio open helper never calls apexImportJournalTradesJson');
  assert(extractFn(HTML, 'renderPortfolioView').indexOf('apexImportJournalTradesJson') === -1, '5: renderPortfolioView never calls it');
  assert(extractFn(HTML, '_jSyncJournalFromBackend').indexOf('apexImportJournalTradesJson') === -1, '6: journal read-sync never calls it');
  // The only `apexImportJournalTradesJson(` invocation in the whole file is its own
  // function definition; the window export uses `= apexImportJournalTradesJson;`
  // (no paren) and every other mention is inside a doc-comment/log string.
  const invocations = (HTML.match(/apexImportJournalTradesJson\s*\(/g) || []).length;        // def + 2 string mentions w/ "("
  const defs        = (HTML.match(/function\s+apexImportJournalTradesJson\s*\(/g) || []).length;
  assert(defs === 1, 'exactly one function definition');
  assert(invocations <= 3, 'no executable call sites beyond definition + string mentions');
  console.log('✓ 4/9/5/6 non-destructive, read-only, no auto-call sites');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 150);
