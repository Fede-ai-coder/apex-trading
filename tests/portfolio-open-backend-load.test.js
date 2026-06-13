'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO OPEN — combined backend READ (portfolios + journal trades).
//
// Opening the Portfolio tab must populate BOTH portfolios and journalManager from
// the backend before the final card re-render, so linkedTradeCount/openLinked/
// closedLinked are non-zero on a deploy preview. Both loads are pure READS — no
// upload, no jMigrateApexTradesToBackend(), no trade.portfolioId mutation.
//
//   1. Portfolio open on a deploy preview calls GET /portfolios AND GET /journal/trades.
//   2. journalManager.getAll() contains the backend trades after the load.
//   3. getPortfolioJournalReconciliation() links trades to portfolios with tolerant
//      matching: String(trade.portfolioId) === String(portfolio.id).
//   4. No auto-upload of local trades from the preview (no POST/PUT/DELETE issued).
//   5. trade.portfolioId is never mutated.
//   6. The open-time helper references no risk/greeks/scanner/candle/MCX APIs.
//   7. localhost stays offline (neither endpoint called) but still re-renders.
//
// Run: node tests/portfolio-open-backend-load.test.js
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
  const fn = async function(p, opts) {
    opts = opts || {};
    calls.push({ path: p, method: opts.method || 'GET', body: opts.body });
    return router(p, opts);
  };
  fn._calls = calls;
  return fn;
}

function makePortfolioManager(initial) {
  let list = (initial || []).slice();
  let source = 'local_fallback';
  return {
    getAll() { return list.slice(); },
    getById(id) { const s = String(id); return list.find(p => String(p.id) === s) || null; },
    getSource() { return source; },
    _setSource(s) { if (s) source = s; },
    setFromBackend(l) { if (!Array.isArray(l)) return false; list = l.slice(); source = 'backend'; return true; },
  };
}

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
  const pm = makePortfolioManager(opts.portfolios || []);
  const jm = makeJournalManager(opts.trades || []);
  const ttCall = opts.ttCall;
  let renderCount = 0;
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object, Promise, Set, RegExp,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    _activeView: 'portfolio',
    _portfolioBackendSyncInFlight: false,
    ttCall,
    portfolioManager: pm,
    journalManager: jm,
    renderPortfolioView() { renderCount++; },
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'isApexPreviewOrLocalEnv'),
    extractFn(HTML, 'isApexLocalDevEnv'),
    extractFn(HTML, 'getPortfolioJournalReconciliation'),
    extractFn(HTML, 'backendListPortfolios'),
    extractFn(HTML, '_portfolioBackendUsable'),
    extractFn(HTML, '_syncPortfoliosFromBackend'),
    extractFn(HTML, '_resolveTradePortfolioId'),
    extractFn(HTML, '_normalizeBackendTradePortfolioId'),
    extractFn(HTML, '_jSyncJournalFromBackend'),
    extractFn(HTML, '_portfolioOpenBackendLoad'),
  ].join('\n'), ctx);
  ctx._ttCall = ttCall;
  ctx._pm = pm;
  ctx._jm = jm;
  ctx._renderCount = () => renderCount;
  return ctx;
}

// Backend fixtures mirroring the real preview: Live / Testing / LIVE Beta.
const PF = [
  { id: 101, name: 'Live',      type: 'options' },
  { id: 202, name: 'Testing',   type: 'paper'   },
  { id: 303, name: 'LIVE Beta', type: 'mixed'   },
];
const TR = [
  { id: 'a1', portfolioId: '101', status: 'OPEN',   ticker: 'AAA' },  // string pid vs numeric id
  { id: 'a2', portfolioId: 101,   status: 'CLOSED', ticker: 'BBB' },
  { id: 'b1', portfolioId: '202', status: 'OPEN',   ticker: 'CCC' },
  { id: 'c1', portfolioId: 303,   status: 'OPEN',   ticker: 'DDD' },
  { id: 'z9', portfolioId: '999', status: 'OPEN',   ticker: 'ZZZ' },  // dangling -> unassigned
];

function previewRouter(p, o) {
  o = o || {};
  if (p === '/portfolios' && (o.method || 'GET') === 'GET') return { ok: true, portfolios: PF.map(x => Object.assign({}, x)), count: PF.length };
  if (p === '/journal/trades' && (o.method || 'GET') === 'GET') return { trades: TR.map(x => Object.assign({}, x)) };
  return { ok: false };
}

// ── 1/2/3/5. deploy-preview open loads both; trades populate; tolerant recon ──
(async function() {
  const tt = makeTtCall(previewRouter);
  const ctx = makeCtx({ ttCall: tt, host: 'deploy-preview-256--apex.netlify.app', portfolios: [], trades: [] });
  const tradesInputSnapshot = J(TR);   // ensure we don't mutate the backend payload pids

  await ctx._portfolioOpenBackendLoad();

  // 1. both endpoints hit
  assert(tt._calls.some(c => c.path === '/portfolios' && c.method === 'GET'), '1: GET /portfolios called on Portfolio open');
  assert(tt._calls.some(c => c.path === '/journal/trades' && c.method === 'GET'), '1: GET /journal/trades called on Portfolio open');

  // 2. journalManager populated from backend
  assert(ctx._jm.getAll().length === 5, '2: journalManager contains the 5 backend trades');
  assert(ctx._pm.getSource() === 'backend', '2: portfolioSource is backend after open');
  assert(ctx._pm.getAll().length === 3, '2: 3 backend portfolios loaded');

  // 3. reconciliation links with tolerant matching
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 4 && rec.unassignedTradeCount === 1, '3: 4 assigned / 1 unassigned via tolerant matching');
  assert(rec.perPortfolio['101'].linkedTradeCount === 2 && rec.perPortfolio['101'].openLinked === 1 && rec.perPortfolio['101'].closedLinked === 1,
    '3: Live card linked/open/closed > 0');
  assert(rec.perPortfolio['202'].linkedTradeCount === 1 && rec.perPortfolio['202'].openLinked === 1, '3: Testing card linked/open > 0');
  assert(rec.perPortfolio['303'].linkedTradeCount === 1 && rec.perPortfolio['303'].openLinked === 1, '3: LIVE Beta card linked/open > 0');

  // 5. no portfolioId mutated anywhere
  assert(J(TR) === tradesInputSnapshot, '5: backend trade payload portfolioIds untouched');
  ctx._jm.getAll().forEach(function(t) {
    const orig = TR.find(x => x.id === t.id);
    assert(orig && String(orig.portfolioId) === String(t.portfolioId), '5: trade ' + t.id + ' portfolioId unchanged');
  });
  console.log('✓ 1/2/3/5 deploy-preview open: portfolios + trades loaded, tolerant recon, no pid mutation');
})();

// ── 4. no auto-upload of local trades from the preview ───────────────────────
(async function() {
  const tt = makeTtCall(previewRouter);
  const ctx = makeCtx({ ttCall: tt, host: 'deploy-preview-256--apex.netlify.app',
    portfolios: [], trades: [{ id: 'LOCALONLY', portfolioId: 101, status: 'OPEN' }] });
  await ctx._portfolioOpenBackendLoad();
  // pure reads only: no write verbs at all
  assert(!tt._calls.some(c => c.method === 'POST' || c.method === 'PUT' || c.method === 'DELETE'),
    '4: Portfolio open issues no POST/PUT/DELETE (no upload/migration)');
  assert(!tt._calls.some(c => c.path === '/journal/sync'), '4: never calls /journal/sync from Portfolio open');
  console.log('✓ 4 no auto-upload / migration from Portfolio open');
})();

// ── 6. open-time helper references no formula/scanner/candle/MCX APIs ─────────
(function() {
  const body = extractFn(HTML, '_portfolioOpenBackendLoad');
  // must NOT call the migration/upload path
  assert(body.indexOf('jMigrateApexTradesToBackend') === -1, '6: open helper never calls jMigrateApexTradesToBackend');
  ['aggregateGreeks', 'computePortfolioRisk', 'portfolioRiskMetrics', 'calcVega', 'calcTheta',
   'betaWeightedDelta', 'computeBWD', 'jSyncToBackend', 'jSaveRemote', 'runScanner', 'candleStore',
   'marketContext', 'mcxSnapshot']
    .forEach(fn => assert(body.indexOf(fn) === -1, '6: open helper does not reference ' + fn));
  console.log('✓ 6 open helper is read-only: no migration/formula/scanner/candle/MCX refs');
})();

// ── 7. localhost stays offline but still re-renders ──────────────────────────
(async function() {
  const tt = makeTtCall(previewRouter);
  const ctx = makeCtx({ ttCall: tt, host: 'localhost', portfolios: [{ id: 1, name: 'Saxo' }], trades: [] });
  await ctx._portfolioOpenBackendLoad();
  assert(tt._calls.length === 0, '7: localhost calls neither /portfolios nor /journal/trades');
  assert(ctx._renderCount() >= 1, '7: localhost still re-renders the Portfolio view');
  assert(ctx._pm.getSource() === 'local_fallback', '7: localhost source stays local_fallback');
  console.log('✓ 7 localhost: offline, no backend calls, still renders');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 120);
