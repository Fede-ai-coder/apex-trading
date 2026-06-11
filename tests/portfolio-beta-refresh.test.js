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
    extractFn(HTML, '_isTerminalPortfolioLeg'),
    extractFn(HTML, '_isActivePortfolioLeg'),
    extractFn(HTML, '_resolveSpyPrice'),
    extractFn(HTML, '_scanDataField'),
    extractFn(HTML, 'computeRowBetaWeightedDelta'),
    extractFn(HTML, 'aggregateGreeks'),
    extractFn(HTML, '_portfolioTotalsSnapshot'),
    extractFn(HTML, '_betaMissingReasonLabel'),
    extractFn(HTML, '_aggregateBetaWtdMissingReason'),
    extractFn(HTML, '_deltaThetaRatioMissingReason'),
    extractFn(HTML, 'resolvePortfolioSpyPrice'),
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
    assert(td.betaWeightedDelta === null && td.betaWeightedDeltaMissingReason === 'spy_price_missing',
      'K: aggregate βΔ reason = spy_price_missing, got ' + td.betaWeightedDeltaMissingReason);
    assert(td.deltaThetaRatio === null && td.deltaThetaRatioMissingReason === 'spy_price_missing',
      'K: ratio reason cascades to spy_price_missing, got ' + td.deltaThetaRatioMissingReason);
    assert(diag.appliedToPositions[0].betaWeightedDeltaMissingReason === 'spy_price_missing',
      'K: per-row βΔ reason = spy_price_missing');
    assert(diag.appliedToPositions[0].usedForTotals === false, 'K: row not used for totals when βΔ blank');
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
    assert(row.betaWeightedDeltaMissingReason === 'underlying_price_missing',
      'L: per-row reason underlying_price_missing, got ' + row.betaWeightedDeltaMissingReason);
    assert(diag.totalsDebug.betaWeightedDeltaMissingReason === 'underlying_price_missing',
      'L: aggregate reason underlying_price_missing');
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
    // SPY price is resolved through the robust resolver (live → fallback chain).
    assert(HTML.includes('var _spyRes = await resolvePortfolioSpyPrice(priceMap, aggregatedResp, {'),
      'O: refreshPositionsLive resolves SPY via resolvePortfolioSpyPrice');
    ['resolve start', 'resolved price=', 'missing reason='].forEach(label => {
      assert(HTML.includes("'[PORTFOLIO SPY PRICE] " + label), 'O: log [PORTFOLIO SPY PRICE] ' + label + ' present');
    });
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

  // ── Q. resolvePortfolioSpyPrice fallback chain ─────────────────────────────
  {
    // Q-A: live price from priceMap wins (and is preferred over a candle close).
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]),
        response: {},
        fetchCandles: () => Promise.resolve([{ c: 111 }]),  // would give 111 if reached
      });
      const res = await ctx.resolvePortfolioSpyPrice({ SPY: { price: 500, underlyingPriceSource: 'TASTYTRADE_SCANNER_BATCH' } }, null, { allowLiveFetch: false });
      assert(res.price === 500 && res.isLive === true, 'Q-A: live priceMap SPY used');
      assert(res.source === 'TASTYTRADE_SCANNER_BATCH', 'Q-A: source is the live price-map source');
      assert(res.attempts.every(a => a.source !== 'CANDLE_CLOSE'), 'Q-A: candle close not reached when live present');
    }

    // Q-B: /market/live/SPY aborts → falls back to scanData, no crash.
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]),
        scanData: [{ ticker: 'SPY', price: 498 }],
        fetchError: 'NS_BINDING_ABORTED',
      });
      const res = await ctx.resolvePortfolioSpyPrice({}, null, { ttConnected: false });
      assert(res.price === 498 && res.source === 'SCAN_DATA' && res.isLive === false, 'Q-B: scanData fallback after aborted live fetch, got ' + res.source);
      assert(res.attempts.some(a => a.source === 'MARKET_LIVE_SPY' && a.ok === false), 'Q-B: aborted /market/live/SPY recorded as failed attempt');
    }

    // Q-C: previous cached _spyPrice kept when refresh finds nothing live.
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
      const res = await ctx.resolvePortfolioSpyPrice({}, null, { previousSpyPrice: 505 });
      assert(res.price === 505 && res.source === 'CACHE_PREVIOUS_SPY_PRICE' && res.isLive === false,
        'Q-C: previous cache kept, never nulled, got ' + res.source);
      assert(res.fallbackUsed === true, 'Q-C: fallbackUsed flagged for cache');
    }

    // Q-D: nothing available → null + reason spy_price_missing (no crash).
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
      const res = await ctx.resolvePortfolioSpyPrice({}, null, {});
      assert(res.price === null && res.reason === 'spy_price_missing', 'Q-D: missing → reason spy_price_missing');
    }

    // Q-E: backend aggregated response provides SPY when priceMap misses.
    {
      const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
      const res = await ctx.resolvePortfolioSpyPrice({}, { underlyings: { SPY: { price: 512 } } }, { allowLiveFetch: false });
      assert(res.price === 512 && res.source === 'BACKEND_PORTFOLIO_REFRESH' && res.isLive === true, 'Q-E: backend aggregated SPY used');
    }

    // Q-F: candle close only as the final fallback (stale, non-live).
    {
      const ctx = makeCtx({
        positionManager: makePositionManager([]),
        response: {},
        fetchCandles: () => Promise.resolve([{ c: 480 }, { c: 495 }]),
      });
      const res = await ctx.resolvePortfolioSpyPrice({}, null, { allowLiveFetch: false });
      assert(res.price === 495 && res.source === 'CANDLE_CLOSE' && res.isLive === false, 'Q-F: candle close last-resort, marked non-live, got ' + res.source);
    }
  }

  console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
  process.exit(failed ? 1 : 0);
})();
