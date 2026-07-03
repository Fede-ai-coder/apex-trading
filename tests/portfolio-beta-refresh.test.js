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
    S: { portfolioData: opts.portfolioData || null, scanData: opts.scanData || [], backendKey: 'k', ttConnected: opts.ttConnected === true },
    _spyPrice: opts.spyPrice !== undefined ? opts.spyPrice : null,
    _spyPriceSource: opts.spyPriceSource !== undefined ? opts.spyPriceSource : null,
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
  if (opts.ttCall) ctx.ttCall = opts.ttCall;
  if (opts.fetchCandles) ctx.fetchCandles = opts.fetchCandles;
  vm.createContext(ctx);
  const src = [
    extractFn(HTML, '_portfolioTradeIsOpenForRisk'),
    extractFn(HTML, '_portfolioIdEq'),
    extractFn(HTML, '_portfolioPositionBelongsToPortfolio'),
    extractFn(HTML, 'getOpenPortfolioRiskPositions'),
    extractFn(HTML, '_portfolioLegStatusForRisk'),
    extractFn(HTML, '_portfolioFirstFiniteField'),
    extractFn(HTML, '_portfolioLegExplicitOpenQty'),
    extractFn(HTML, '_portfolioLegHasExplicitOpenQty'),
    extractFn(HTML, '_portfolioLegEffectiveQty'),
    extractFn(HTML, '_portfolioLegHasCloseMarker'),
    extractFn(HTML, '_isTerminalPortfolioLeg'),
    extractFn(HTML, 'isActivePortfolioLeg'),
    extractFn(HTML, '_isActivePortfolioLeg'),
    extractFn(HTML, 'getActivePortfolioLegs'),
    extractFn(HTML, '_portfolioNetGreekFromActiveLegs'),
    extractFn(HTML, '_resolveSpyPrice'),
    extractFn(HTML, '_scanDataField'),
    extractFn(HTML, 'computeRowBetaWeightedDelta'),
    extractFn(HTML, 'aggregateGreeks'),
    extractFn(HTML, '_portfolioTotalsSnapshot'),
    extractFn(HTML, '_betaMissingReasonLabel'),
    extractFn(HTML, '_aggregateBetaWtdMissingReason'),
    extractFn(HTML, '_deltaThetaRatioMissingReason'),
    extractFn(HTML, 'resolvePortfolioLivePrice'),
    extractFn(HTML, '_portfolioRiskDebugEnabled'),
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
    // NEW: SPY missing no longer blanks βΔ — base delta×beta = -99.93×1.08 is used.
    assert(approx(row.betaWeightedDelta, -99.93 * 1.08) && row.spyPrice === null, 'C: βΔ = base delta×beta without SPY, got ' + row.betaWeightedDelta);
    assert(row.usedForTotals === true, 'C: base βΔ still feeds totals');
    // The normalization diagnostic breadcrumb is preserved (spy price is missing).
    assert(row.reasonIfMissing === 'spy_price_missing', 'C: debug still reports spy_price_missing (normalization note), got ' + row.reasonIfMissing);
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

  // ── G. fetch failure → non-fatal, reason 'backend_fetch_failed' ─────────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({ positionManager: pm, spyPrice: 500, fetchError: 'network down', response: null });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(diag.responseOk === false, 'G: fetch failure marks responseOk=false');
    assert(diag.warnings.some(w => String(w).indexOf('fetch_failed') === 0), 'G: fetch failure recorded in warnings');
    assert(diag.appliedToPositions[0].reasonIfMissing === 'backend_fetch_failed', 'G: rows report backend_fetch_failed');
    assert(pm._store[0].live.beta === undefined, 'G: no beta written on failure');
  }

  // ── H. wiring + console log guards ─────────────────────────────────────────
  {
    assert(HTML.includes("await refreshPortfolioBetas(positionManager.getByPortfolio(portfolioId), portfolioId, { skipRender: true });"),
      'H: refreshPositionsLive awaits refreshPortfolioBetas before totals recalc');
    const wiringIdx = HTML.indexOf('await refreshPortfolioBetas(positionManager.getByPortfolio(portfolioId)');
    const afterTotalsIdx = HTML.indexOf('var afterTotals = _portfolioTotalsSnapshot(positionManager.getByPortfolio(portfolioId), _spyPrice);');
    assert(wiringIdx > -1 && afterTotalsIdx > wiringIdx, 'H: beta refresh runs BEFORE the afterTotals recalc + render');
    assert(HTML.includes('window.apexDebugPortfolioBetas'), 'H: window.apexDebugPortfolioBetas exists');
    assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.betaRefresh = _apexPortfolioBetaDiag'),
      'H: apexDebugPortfolioGreeksRefresh integrates beta diag');
    ['start', 'backend response', 'applied', 'missing', 'totals before', 'totals after', 'completed'].forEach(label => {
      assert(HTML.includes("'[PORTFOLIO BETA REFRESH] " + label + "'"), 'H: log present: [PORTFOLIO BETA REFRESH] ' + label);
    });
    assert(!/yahoo/i.test(extractFn(HTML, 'refreshPortfolioBetas')), 'H: no Yahoo usage in beta refresh');
  }

  // ── I. delta/theta ratio numeric + per-row debug fields ────────────────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, theta: -12, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    const td = diag.totalsDebug;
    const expectedBwd = -99.93 * 1.08 * (200 / 500);
    assert(td.totalsSource === 'updatedPositionsAfterPriceAndBetaRefresh', 'I: totalsSource = updatedPositionsAfterPriceAndBetaRefresh');
    assert(approx(td.deltaThetaRatio, expectedBwd / Math.abs(-12)),
      'I: delta/theta ratio numeric, got ' + td.deltaThetaRatio);
    assert(td.deltaThetaRatioMissingReason === null, 'I: no ratio missing reason when computable');
    assert(td.betaWeightedDeltaMissingReason === null, 'I: no aggregate βΔ missing reason');
    assert(td.staleSnapshotDetected === true, 'I: stale-snapshot avoided (pre-update array would have blanked βΔ)');
    const row = diag.appliedToPositions[0];
    assert(row.theta === -12, 'I: per-row theta exposed in debug');
    assert(row.usedForTotals === true, 'I: per-row usedForTotals true when βΔ feeds the total');
    assert(row.betaWeightedDeltaMissingReason === null, 'I: per-row βΔ reason null when computed');
  }

  // ── J. delta/theta ratio reason = total_theta_zero ─────────────────────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, theta: 0, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    const td = diag.totalsDebug;
    assert(td.deltaThetaRatio === null, 'J: ratio null when total theta ~ 0');
    assert(td.deltaThetaRatioMissingReason === 'total_theta_zero', 'J: reason total_theta_zero, got ' + td.deltaThetaRatioMissingReason);
    assert(approx(td.betaWeightedDelta, -99.93 * 1.08 * (200 / 500)), 'J: βΔ still computed even when ratio is blocked by theta');
  }

  // ── K. ratio reason cascades from missing SPY (spy_price_missing) ──────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, theta: -12, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: null,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    const td = diag.totalsDebug;
    // NEW: SPY missing → base βΔ (delta×beta) is computed, so the aggregate is a
    // number (not null) and carries no "missing" reason; only the per-row
    // normalization breadcrumb remains.
    assert(approx(td.betaWeightedDelta, -99.93 * 1.08) && td.betaWeightedDeltaMissingReason === null,
      'K: aggregate βΔ = base, no missing reason, got ' + td.betaWeightedDelta + ' / ' + td.betaWeightedDeltaMissingReason);
    assert(td.deltaThetaRatio !== null && td.deltaThetaRatioMissingReason === null,
      'K: ratio computable from base βΔ, got ' + td.deltaThetaRatio + ' / ' + td.deltaThetaRatioMissingReason);
    assert(diag.appliedToPositions[0].betaWeightedDeltaMissingReason === 'spy_price_missing',
      'K: per-row normalization breadcrumb = spy_price_missing');
    assert(diag.appliedToPositions[0].usedForTotals === true, 'K: base βΔ row IS used for totals');
  }

  // ── L. underlying price missing → reason underlying_price_missing ──────────
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, theta: -12 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    const row = diag.appliedToPositions[0];
    assert(row.newBeta === 1.08, 'L: beta still applied');
    // Underlying price missing → base βΔ used; per-row keeps the normalization
    // breadcrumb, but the aggregate βΔ is computed so its reason is null.
    assert(row.betaWeightedDeltaMissingReason === 'underlying_price_missing',
      'L: per-row normalization breadcrumb underlying_price_missing, got ' + row.betaWeightedDeltaMissingReason);
    assert(approx(row.betaWeightedDelta, -99.93 * 1.08), 'L: base βΔ computed, got ' + row.betaWeightedDelta);
    assert(diag.totalsDebug.betaWeightedDeltaMissingReason === null,
      'L: aggregate βΔ computed (base) → no missing reason, got ' + diag.totalsDebug.betaWeightedDeltaMissingReason);
  }

  // ── M. no stale snapshot: totals use the post-update store, not the array ──
  {
    const pm = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, theta: -12, underlyingPrice: 200 },
    }]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    // Pass a deliberately STALE positions array (beta null) — totalsAfter must
    // still be numeric because it re-reads positionManager.getByPortfolio.
    const stale = pm.getByPortfolio('p1');
    const diag = await ctx.refreshPortfolioBetas(stale, 'p1', { skipRender: true });
    assert(diag.totalsBefore.betaWeightedDelta === null, 'M: stale snapshot has no βΔ before refresh');
    assert(diag.totalsAfter.betaWeightedDelta !== null, 'M: totalsAfter numeric from fresh store, not stale array');
    assert(diag.totalsDebug.staleSnapshotDetected === true, 'M: staleSnapshotDetected flags the avoided bug');
  }

  // ── N. debug + log guards for the βΔ / delta-theta diagnostics ─────────────
  {
    assert(HTML.includes("'[PORTFOLIO BETA-WTD DEBUG] row'"), 'N: log [PORTFOLIO BETA-WTD DEBUG] row present');
    assert(HTML.includes("'[PORTFOLIO BETA-WTD DEBUG] totals'"), 'N: log [PORTFOLIO BETA-WTD DEBUG] totals present');
    assert(HTML.includes("'[PORTFOLIO DELTA-THETA DEBUG] inputs'"), 'N: log [PORTFOLIO DELTA-THETA DEBUG] inputs present');
    assert(HTML.includes("'[PORTFOLIO TOTALS RECALC] source=updatedPositionsAfterPriceAndBetaRefresh'"),
      'N: log [PORTFOLIO TOTALS RECALC] source=updatedPositionsAfterPriceAndBetaRefresh present');
    // refreshPositionsLive resolves _spyPrice (no new fetch) before the recalc.
    assert(HTML.includes('var _resolvedSpy = _resolveSpyPrice(_spyPrice);'),
      'N: refreshPositionsLive resolves _spyPrice from existing sources before recalc');
  }

  // ── O. live Tastytrade price wiring: SPY + symbols in the quote batch ──────
  {
    // SPY is always added to the live quote symbols (it is not a position).
    assert(HTML.includes("if (quoteSymbols.indexOf('SPY') === -1) quoteSymbols.push('SPY');"),
      'O: SPY always added to quoteSymbols');
    assert(HTML.includes("await ttCall('/scanner?symbols=' + quoteSymbols.join(','))"),
      'O: Tastytrade quote batch uses quoteSymbols (SPY + position tickers)');
    assert(HTML.includes('var dxMissing = quoteSymbols.filter(function(t) {'),
      'O: DXLink fallback also covers SPY via quoteSymbols');
    // SPY price is resolved through the unified resolver (live → fallback chain).
    assert(HTML.includes("var _spyRes = await resolvePortfolioLivePrice('SPY', priceMap, aggregatedResp, {"),
      'O: refreshPositionsLive resolves SPY via resolvePortfolioLivePrice');
    // The SAME resolver is applied per position underlying.
    assert(HTML.includes('await resolvePortfolioLivePrice(_p.ticker, priceMap, aggregatedResp, {'),
      'O: same resolver applied to each position underlying');
    ['resolve start', 'resolved price=', 'missing reason='].forEach(label => {
      assert(HTML.includes("'[PORTFOLIO SPY PRICE] " + label), 'O: log [PORTFOLIO SPY PRICE] ' + label + ' present');
    });
    ['start symbols=', 'attempt symbol=', 'resolved symbol=', 'missing symbol='].forEach(label => {
      assert(HTML.includes("'[PORTFOLIO PRICE RESOLVER] " + label), 'O: log [PORTFOLIO PRICE RESOLVER] ' + label + ' present');
    });
    // scanData is a fallback source, never primary.
    assert(HTML.includes("'SCAN_DATA_FALLBACK'") && HTML.includes("'CANDLE_CLOSE_FALLBACK'"),
      'O: scanData/candle are explicit *_FALLBACK sources');
    // Per-symbol underlying price is persisted with its source through the store.
    assert(HTML.includes('if (data.underlyingPriceSource !== undefined) trade.live.underlyingPriceSource = data.underlyingPriceSource;'),
      'O: updateLive persists underlyingPriceSource');
    assert(HTML.includes('underlyingPriceSource: live.underlyingPriceSource !== undefined ? live.underlyingPriceSource : null,'),
      'O: position projection exposes underlyingPriceSource');
    ['start symbols=', 'applied symbol=', 'spy old='].forEach(label => {
      assert(HTML.includes("'[PORTFOLIO PRICE REFRESH] " + label), 'O: log [PORTFOLIO PRICE REFRESH] ' + label + ' present');
    });
  }

  // ── P. TT-connected reasons + source fields in the debug ───────────────────
  {
    // SPY price missing while TT is connected → tastytrade_spy_price_missing
    const pm1 = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, theta: -12, underlyingPrice: 200 },
    }]);
    const ctx1 = makeCtx({
      positionManager: pm1, spyPrice: null, ttConnected: true,
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const d1 = await ctx1.refreshPortfolioBetas(pm1.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(d1.appliedToPositions[0].betaWeightedDeltaMissingReason === 'tastytrade_spy_price_missing',
      'P: TT-connected SPY miss → tastytrade_spy_price_missing, got ' + d1.appliedToPositions[0].betaWeightedDeltaMissingReason);

    // Underlying price missing while TT is connected → tastytrade_symbol_price_missing
    const pm2 = makePositionManager([{
      id: 't1', portfolioId: 'p1', ticker: 'AAPL', qty: 1, entryPrice: 5,
      live: { delta: -99.93, theta: -12 },
    }]);
    const ctx2 = makeCtx({
      positionManager: pm2, spyPrice: 500, ttConnected: true, spyPriceSource: 'TASTYTRADE',
      response: { ok: true, items: [{ symbol: 'AAPL', beta: 1.08 }, { symbol: 'SPY', beta: 1 }] },
    });
    const d2 = await ctx2.refreshPortfolioBetas(pm2.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(d2.appliedToPositions[0].betaWeightedDeltaMissingReason === 'tastytrade_symbol_price_missing',
      'P: TT-connected underlying miss → tastytrade_symbol_price_missing, got ' + d2.appliedToPositions[0].betaWeightedDeltaMissingReason);
    assert(d2.spyPriceSource === 'TASTYTRADE' && d2.totalsDebug.spyPriceSource === 'TASTYTRADE',
      'P: spyPriceSource surfaced in diag + totalsDebug');
    assert('underlyingPriceSource' in d2.appliedToPositions[0] && 'spyPriceSource' in d2.appliedToPositions[0],
      'P: per-row source fields present');
  }

  // ── Q. resolvePortfolioLivePrice unified fallback chain (SPY + symbols) ─────
  {
    // Q-A: live price from priceMap wins (preferred over a candle close).
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]), response: {},
        fetchCandles: () => Promise.resolve([{ c: 111 }]),  // would give 111 if reached
      });
      const res = await ctx.resolvePortfolioLivePrice('SPY', { SPY: { price: 500, underlyingPriceSource: 'TASTYTRADE_QUOTE_BATCH' } }, null, { allowLiveFetch: false });
      assert(res.price === 500 && res.isLive === true && res.source === 'TASTYTRADE_QUOTE_BATCH', 'Q-A: live priceMap SPY used');
      assert(res.attempts.every(a => a.source !== 'CANDLE_CLOSE_FALLBACK'), 'Q-A: candle close not reached when live present');
    }

    // Q-A2: SAME resolver works for a portfolio symbol (AAPL).
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
      const res = await ctx.resolvePortfolioLivePrice('AAPL', { AAPL: { price: 292.315, underlyingPriceSource: 'BACKEND_PORTFOLIO_REFRESH' } }, null, { allowLiveFetch: false });
      assert(res.symbol === 'AAPL' && res.price === 292.315 && res.isLive === true, 'Q-A2: resolver resolves a position symbol from priceMap');
    }

    // Q-B: live fetch aborts (NS_BINDING_ABORTED) → falls back to scanData, no crash.
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]),
        scanData: [{ ticker: 'SPY', price: 498 }],
        fetchError: 'NS_BINDING_ABORTED',
      });
      const res = await ctx.resolvePortfolioLivePrice('SPY', {}, null, { ttConnected: false });
      assert(res.price === 498 && res.source === 'SCAN_DATA_FALLBACK' && res.isLive === false, 'Q-B: scanData fallback after aborted live fetch, got ' + res.source);
      assert(res.attempts.some(a => a.source === 'BACKEND_LIVE_QUOTE' && a.ok === false), 'Q-B: aborted backend live quote recorded as failed attempt');
    }

    // Q-C: previous cached price kept when refresh finds nothing live (SPY + symbol).
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
      const spy = await ctx.resolvePortfolioLivePrice('SPY', {}, null, { previousPrice: 505, allowScanData: false });
      assert(spy.price === 505 && spy.source === 'CACHE_PREVIOUS_SPY_PRICE' && spy.isLive === false && spy.fallbackUsed === true,
        'Q-C: previous SPY cache kept, never nulled, got ' + spy.source);
      const sym = await ctx.resolvePortfolioLivePrice('AAPL', {}, null, { previousPrice: 292.315, allowScanData: false });
      assert(sym.price === 292.315 && sym.source === 'CACHE_PREVIOUS_PRICE' && sym.isLive === false,
        'Q-C: previous symbol cache kept with CACHE_PREVIOUS_PRICE, got ' + sym.source);
    }

    // Q-D: nothing available → null + precise reason (no crash).
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
      const spy = await ctx.resolvePortfolioLivePrice('SPY', {}, null, {});
      assert(spy.price === null && spy.reason === 'spy_price_missing', 'Q-D: SPY missing → spy_price_missing');
      const sym = await ctx.resolvePortfolioLivePrice('NVDA', {}, null, {});
      assert(sym.price === null && sym.reason === 'underlying_price_missing', 'Q-D: symbol missing → underlying_price_missing');
    }

    // Q-E: backend aggregated response provides the price when priceMap misses.
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
      const res = await ctx.resolvePortfolioLivePrice('SPY', {}, { underlyings: { SPY: { price: 512 } } }, { allowLiveFetch: false });
      assert(res.price === 512 && res.source === 'BACKEND_PORTFOLIO_REFRESH' && res.isLive === true, 'Q-E: backend aggregated used');
    }

    // Q-F: candle close only as the final fallback (stale, non-live).
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]), response: {},
        fetchCandles: () => Promise.resolve([{ c: 480 }, { c: 495 }]),
      });
      const res = await ctx.resolvePortfolioLivePrice('SPY', {}, null, { allowLiveFetch: false, allowScanData: false });
      assert(res.price === 495 && res.source === 'CANDLE_CLOSE_FALLBACK' && res.isLive === false, 'Q-F: candle close last-resort non-live, got ' + res.source);
    }

    // Q-I: no scanner UI dependency — works with S.scanData empty.
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), scanData: [], response: {} });
      const res = await ctx.resolvePortfolioLivePrice('SPY', { SPY: { price: 600 } }, null, { allowLiveFetch: false });
      assert(res.price === 600 && res.source !== 'SCAN_DATA_FALLBACK', 'Q-I: resolves without scanData; scanData never primary');
    }

    // Q-J: backend /market/quotes live source resolves SPY as BACKEND_LIVE_QUOTE.
    // /market/live carries no usable price ({quotes:…} has no top-level/nested quote
    // mark), so the resolver falls through to /market/quotes — the same reliable
    // endpoint fetchPortfolioData() uses — and resolves a LIVE backend price.
    // This is the real-log fix: previously SPY fell to CANDLE_CLOSE_FALLBACK.
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]),
        response: { quotes: [{ symbol: 'SPY', price: 533.21 }] },  // returned for both /market/live and /market/quotes
        fetchCandles: () => Promise.resolve([{ c: 741.75 }]),       // would be the stale fallback if reached
      });
      const res = await ctx.resolvePortfolioLivePrice('SPY', {}, null, { allowLiveFetch: true, ttConnected: false });
      assert(res.price === 533.21 && res.source === 'BACKEND_LIVE_QUOTE' && res.isLive === true,
        'Q-J: SPY resolved from backend /market/quotes as live BACKEND_LIVE_QUOTE, got ' + res.source + ' price=' + res.price);
      assert(res.attempts.every(a => a.source !== 'CANDLE_CLOSE_FALLBACK'),
        'Q-J: candle close fallback never reached when backend live quote present');
      assert(res.attempts.some(a => a.source === 'BACKEND_LIVE_QUOTE' && a.ok === true),
        'Q-J: BACKEND_LIVE_QUOTE recorded as a successful attempt');
    }

    // Q-K: /market/live DXLINK mid (bid/ask) is honored when no top-level price.
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]),
        response: { source: 'DXLINK', quote: { bidPrice: 532, askPrice: 534 } },
      });
      const res = await ctx.resolvePortfolioLivePrice('SPY', {}, null, { allowLiveFetch: true, ttConnected: false });
      assert(res.price === 533 && res.source === 'BACKEND_LIVE_QUOTE' && res.isLive === true,
        'Q-K: /market/live mid(bid,ask) used as live price, got ' + res.source + ' price=' + res.price);
    }
  }

  console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
  process.exit(failed ? 1 : 0);
})();
