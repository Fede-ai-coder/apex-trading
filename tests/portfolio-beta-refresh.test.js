'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// refreshPortfolioBetas — backend beta loading for the Portfolio.
//
// Extracts the REAL function (plus its helpers) from index.html and runs it in
// a vm sandbox with a mocked backend fetch + positionManager. Proves:
//   A. backend beta available  → pos.beta updated via updateLive, βΔ computed
//   B. backend missing a beta  → beta stays null, debug reason 'beta_missing'
//   C. SPY price missing       → βΔ null, debug reason 'spy_price_missing'
//   D. totals recalc           → β AVG BETA / βΔ BETA-WTD change after refresh
//   E. terminal legs           → excluded from the delta feeding βΔ
//   F. repeated refresh        → recomputed from scratch, never accumulated
//   G. wiring/log guards       → refreshPositionsLive integration + console logs
//
// Run: node tests/portfolio-beta-refresh.test.js
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
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ ' + msg); }
}
function approx(a, b, eps) { return a != null && Math.abs(a - b) <= (eps || 1e-6); }

// Minimal positionManager mock with the same read/write semantics as the real
// adapter: getByPortfolio projects trade.live onto the position snapshot, and
// updateLive writes into trade.live.
function makePositionManager(trades) {
  const store = trades.map(t => Object.assign({}, t, { live: Object.assign({}, t.live || {}) }));
  return {
    _store: store,
    getByPortfolio(pid) {
      return store.filter(t => t.portfolioId === pid).map(t => ({
        id: t.id, portfolioId: t.portfolioId, ticker: t.ticker,
        legs: t.legs || [], legsLive: t.live.legsLive || t.legsLive || [],
        qty: t.qty, entryPrice: t.entryPrice,
        delta: t.live.delta !== undefined ? t.live.delta : (t.delta !== undefined ? t.delta : null),
        theta: t.live.theta !== undefined ? t.live.theta : (t.theta !== undefined ? t.theta : null),
        gamma: t.live.gamma !== undefined ? t.live.gamma : (t.gamma !== undefined ? t.gamma : null),
        vega:  t.live.vega  !== undefined ? t.live.vega  : (t.vega  !== undefined ? t.vega  : null),
        beta:  t.live.beta  !== undefined ? t.live.beta  : (t.beta  !== undefined ? t.beta  : null),
        underlyingPrice: t.live.underlyingPrice !== undefined ? t.live.underlyingPrice
                          : (t.underlyingPrice !== undefined ? t.underlyingPrice : null),
      }));
    },
    updateLive(id, data) {
      const t = store.find(x => x.id === id);
      if (!t) return;
      ['beta','delta','theta','gamma','vega','underlyingPrice','legsLive'].forEach(k => {
        if (data[k] !== undefined) t.live[k] = data[k];
      });
    },
  };
}

function makeCtx(opts) {
  opts = opts || {};
  const fetchCalls = [];
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    S: { portfolioData: opts.portfolioData || null, scanData: opts.scanData || [], backendKey: 'k' },
    _spyPrice: opts.spyPrice !== undefined ? opts.spyPrice : null,
    _activePanelPortfolioId: null,
    _lastPortfolioMetricsSig: null,
    BACKEND: 'https://backend.test',
    _backendAuthHeaders(extra) { return Object.assign({}, extra || {}); },
    AbortSignal: { timeout() { return undefined; } },
    positionManager: opts.positionManager,
    _apexPortfolioGreeksRefreshDiag: { currentTotals: null },
    isFinite, parseFloat, Math, String, Date, Object, Array,
    encodeURIComponent,
    normalizeGreekPoints(v) { const n = parseFloat(v); return isFinite(n) && Math.abs(n) <= 1 ? n * 100 : n; },
    _fetchCalls: fetchCalls,
    fetch(url) {
      fetchCalls.push(url);
      if (opts.fetchError) return Promise.reject(new Error(opts.fetchError));
      return Promise.resolve({
        ok: opts.httpOk !== false,
        status: opts.httpOk !== false ? 200 : 500,
        json: () => Promise.resolve(opts.response),
        text: () => Promise.resolve(''),
      });
    },
  };
  if (opts.renderSpy) ctx.renderPositionsPanel = opts.renderSpy;
  vm.createContext(ctx);
  const src = [
    extractFn(HTML, '_isTerminalPortfolioLeg'),
    extractFn(HTML, '_isActivePortfolioLeg'),
    extractFn(HTML, '_resolveSpyPrice'),
    extractFn(HTML, '_scanDataField'),
    extractFn(HTML, 'computeRowBetaWeightedDelta'),
    extractFn(HTML, 'aggregateGreeks'),
    extractFn(HTML, '_portfolioTotalsSnapshot'),
    extractFn(HTML, '_betaMissingReasonLabel'),
    extractFn(HTML, 'refreshPortfolioBetas'),
  ].join('\n');
  vm.runInContext(src, ctx);
  return ctx;
}

(async function run() {

  // ── A. backend beta available → pos.beta applied + βΔ computed ─────────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      delta: null, theta: null, gamma: null, vega: null, beta: null,
      live: { delta: -99.93, theta: -12, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.beta === 1.08, 'A: pos.beta updated to 1.08 via positionManager.updateLive');
    assert(diag.responseOk === true && diag.itemsCount === 2, 'A: response ok with 2 items');
    assert(diag.betaBySymbol.AAPL === 1.08 && diag.betaBySymbol.SPY === 1, 'A: betaBySymbol map built');
    assert(diag.requestedSymbols.join(',') === 'AAPL,SPY', 'A: requested unique uppercase symbols incl. SPY');
    assert(ctx._fetchCalls[0] === 'https://backend.test/market/betas/latest?symbols=AAPL,SPY',
      'A: calls GET /market/betas/latest with symbols, got ' + ctx._fetchCalls[0]);
    const row = diag.appliedToPositions[0];
    assert(row.oldBeta === null && row.newBeta === 1.08, 'A: appliedToPositions records old/new beta');
    assert(approx(row.betaWeightedDelta, -99.93 * 1.08 * (200 / 500)),
      'A: βΔ = delta × beta × (price/spy), got ' + row.betaWeightedDelta);
    assert(row.reasonIfMissing === null, 'A: no missing reason when all inputs available');
  }

  // ── B. backend missing a beta → beta stays null + reason 'beta_missing' ────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'XYZ', qty: 1, entryPrice: 5,
      live: { delta: 10, underlyingPrice: 50 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.beta === undefined, 'B: beta never written when backend has no value');
    const row = diag.appliedToPositions[0];
    assert(row.newBeta === null && row.reasonIfMissing === 'beta_missing', 'B: debug reports beta_missing');
    assert(row.betaWeightedDelta === null, 'B: βΔ stays null (UI shows "--")');
    // UI path: computeRowBetaWeightedDelta on the un-enriched position renders dash
    const ui = ctx.computeRowBetaWeightedDelta(pm.getByPortfolio('p1')[0], 500);
    assert(ui.beta === null && ui.betaWeightedDelta === null, 'B: BETA column input stays null');
  }

  // ── C. SPY price missing → βΔ null + reason 'spy_price_missing' ─────────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: null,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.beta === 1.08, 'C: beta still applied');
    const row = diag.appliedToPositions[0];
    assert(row.betaWeightedDelta === null && row.spyPrice === null, 'C: βΔ null without SPY price');
    assert(row.reasonIfMissing === 'spy_price_missing', 'C: debug reports spy_price_missing, got ' + row.reasonIfMissing);
  }

  // ── D. totals recalc: avgBeta / βΔ totals change from null to numeric ───────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      delta: null, theta: null, gamma: null, vega: null,
      live: { delta: -99.93, theta: -12, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(diag.totalsBefore.avgBeta === null && diag.totalsBefore.betaWeightedDelta === null,
      'D: totals before refresh have no beta data');
    assert(approx(diag.totalsAfter.avgBeta, 1.08), 'D: β AVG BETA recalculated, got ' + diag.totalsAfter.avgBeta);
    assert(approx(diag.totalsAfter.betaWeightedDelta, -99.93 * 1.08 * (200 / 500)),
      'D: βΔ BETA-WTD total recalculated, got ' + diag.totalsAfter.betaWeightedDelta);
  }

  // ── E. terminal legs excluded from the delta feeding βΔ ────────────────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'MSFT',
      legs: [
        { type: 'CALL', side: 'LONG', qty: 1, entryPrice: 2 },
        { type: 'PUT', side: 'SHORT', qty: 1, entryPrice: 1, status: 'CLOSED' },
      ],
      live: {
        delta: 999, underlyingPrice: 500,
        legsLive: [
          { delta: 0.20, theta: -0.03 },
          { delta: -0.90, theta: -0.90, priceSource: 'terminal_leg_placeholder' },
        ],
      },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 400,
      response: { ok: true, items: [{ symbol: 'MSFT', beta: 1.2 }, { symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    // active leg only: 0.20 → 20 points; βΔ = 20 × 1.2 × (500/400) = 30
    assert(approx(diag.totalsAfter.betaWeightedDelta, 30),
      'E: terminal legs excluded from βΔ total, got ' + diag.totalsAfter.betaWeightedDelta);
  }

  // ── F. repeated refresh recomputes from scratch (no accumulation) ───────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      delta: null, theta: null, gamma: null, vega: null,
      live: { delta: -99.93, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const d1 = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    const d2 = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(approx(d2.totalsAfter.betaWeightedDelta, d1.totalsAfter.betaWeightedDelta),
      'F: βΔ identical across repeated refreshes (recomputed, not accumulated)');
    assert(approx(d2.appliedToPositions[0].betaWeightedDelta, d1.appliedToPositions[0].betaWeightedDelta),
      'F: row βΔ identical across repeated refreshes');
    assert(pm._store[0].live.beta === 1.08, 'F: beta stable across refreshes');
  }

  // ── fetch failure → non-fatal, reason 'backend_fetch_failed' ────────────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({ positionManager: pm, spyPrice: 500, fetchError: 'network down', response: null });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(diag.responseOk === false, 'X: fetch failure marks responseOk=false');
    assert(diag.warnings.some(w => String(w).indexOf('fetch_failed') === 0), 'X: fetch failure recorded in warnings');
    assert(diag.appliedToPositions[0].reasonIfMissing === 'backend_fetch_failed', 'X: rows report backend_fetch_failed');
    assert(pm._store[0].live.beta === undefined, 'X: no beta written on failure');
  }

  // ── G. wiring + console log guards ─────────────────────────────────────────
  {
    assert(HTML.includes("await refreshPortfolioBetas(positionManager.getByPortfolio(portfolioId), portfolioId, { skipRender: true });"),
      'G: refreshPositionsLive awaits refreshPortfolioBetas before totals recalc');
    const wiringIdx = HTML.indexOf('await refreshPortfolioBetas(positionManager.getByPortfolio(portfolioId)');
    const afterTotalsIdx = HTML.indexOf('var afterTotals = _portfolioTotalsSnapshot(positionManager.getByPortfolio(portfolioId), _spyPrice);');
    assert(wiringIdx > -1 && afterTotalsIdx > wiringIdx, 'G: beta refresh runs BEFORE the afterTotals recalc + render');
    assert(HTML.includes('window.apexDebugPortfolioBetas'), 'G: window.apexDebugPortfolioBetas exists');
    assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.betaRefresh = _apexPortfolioBetaDiag'),
      'G: apexDebugPortfolioGreeksRefresh integrates beta diag');
    ['start', 'backend response', 'applied', 'missing', 'totals before', 'totals after', 'completed'].forEach(label => {
      assert(HTML.includes("'[PORTFOLIO BETA REFRESH] " + label + "'"), 'G: log present: [PORTFOLIO BETA REFRESH] ' + label);
    });
    assert(!/yahoo/i.test(extractFn(HTML, 'refreshPortfolioBetas')), 'G: no Yahoo usage in beta refresh');
  }

  console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
  process.exit(failed ? 1 : 0);
})();
