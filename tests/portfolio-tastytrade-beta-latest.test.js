'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio ← Tastytrade backend beta (GET /market/betas/latest).
//
// Proves the Portfolio consumes the beta the backend saved from Tastytrade, with
// the new response schema (status / stale / source / rawBeta / missing / staleCount):
//
//   1. Portfolio calls GET /market/betas/latest with the OPEN tickers (+ SPY).
//   2. AMD numeric beta (status ok, not stale) is applied and shown.
//   3. SPY beta=1 with status ok (and self_benchmark) is ACCEPTED, never discarded.
//   4. beta null / missing / invalid → pos.beta stays null, row shows "--", βΔ null.
//   5. stale=true does NOT overwrite a valid, more-recent beta already on the row.
//   6. βΔ WTD is computed only when a beta is present.
//   7. entrySnapshot.beta fallback stays valid; backend latest beta outranks it.
//   8. Journal snapshot (_buildRichSnapshot) saves beta + source + fetch time when the
//      backend latest beta is available (static wiring guards).
//   9. No IVR regression (102.3 / 104 normalization).
//  10. No SQZ regression (false → OFF).
//  11. No backend-aware save regression (static wiring guards).
//
// Run: node tests/portfolio-tastytrade-beta-latest.test.js
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

// Position manager mock — same read/write semantics as portfolio-beta-refresh.test.js:
// getByPortfolio projects trade.live onto the snapshot, updateLive writes into live.
function makePositionManager(trades) {
  const store = trades.map(t => Object.assign({}, t, { live: Object.assign({}, t.live || {}) }));
  return {
    _store: store,
    getByPortfolio(pid) {
      return store.filter(t => t.portfolioId === pid).map(t => ({
        id: t.id, portfolioId: t.portfolioId, ticker: t.ticker,
        legs: t.legs || [], legsLive: t.live.legsLive || t.legsLive || [],
        qty: t.qty, entryPrice: t.entryPrice, entrySnapshot: t.entrySnapshot || null,
        delta: t.live.delta !== undefined ? t.live.delta : (t.delta !== undefined ? t.delta : null),
        theta: t.live.theta !== undefined ? t.live.theta : (t.theta !== undefined ? t.theta : null),
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
    console: { log() {}, warn() {}, error() {}, debug() {} },
    S: { portfolioData: opts.portfolioData || null, scanData: opts.scanData || [], backendKey: 'k', ttConnected: opts.ttConnected === true },
    _spyPrice: opts.spyPrice !== undefined ? opts.spyPrice : null,
    _spyPriceSource: null, _apexLatestBetaBySymbol: opts.latestBetaSeed || {},
    _activePanelPortfolioId: null, _lastPortfolioMetricsSig: null,
    BACKEND: 'https://backend.test',
    _backendAuthHeaders(extra) { return Object.assign({}, extra || {}); },
    AbortSignal: { timeout() { return undefined; } },
    positionManager: opts.positionManager,
    _apexPortfolioGreeksRefreshDiag: { currentTotals: null },
    isFinite, parseFloat, Math, String, Date, Object, Array, encodeURIComponent,
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
    extractFn(HTML, '_portfolioLatestBackendBetaEntry'),
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

  // ── 1. Portfolio calls /market/betas/latest with the OPEN tickers (+ SPY) ────
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD',  qty: 1, live: { delta: 10, underlyingPrice: 140 } },
      { id: 't2', portfolioId: 'p1', ticker: 'NVDA', qty: 1, live: { delta: 5,  underlyingPrice: 120 } },
    ]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [
        { symbol: 'AMD',  beta: 3.014956, source: 'tastytrade', status: 'ok', rawBeta: 3.014956, stale: false },
        { symbol: 'NVDA', beta: 1.9,      source: 'tastytrade', status: 'ok', rawBeta: 1.9,      stale: false },
        { symbol: 'SPY',  beta: 1,        source: 'tastytrade', status: 'ok', rawBeta: 1,        stale: false },
      ], missing: [], staleCount: 0 },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(ctx._fetchCalls[0] === 'https://backend.test/market/betas/latest?symbols=AMD,NVDA,SPY',
      '1: GET /market/betas/latest?symbols=AMD,NVDA,SPY, got ' + ctx._fetchCalls[0]);
    assert(diag.requestedSymbols.join(',') === 'AMD,NVDA,SPY', '1: open tickers + SPY requested');
    assert(Array.isArray(diag.missing) && diag.missing.length === 0 && diag.staleCount === 0,
      '1: top-level missing[] / staleCount captured into diag');
  }

  // ── 2. AMD numeric beta (status ok, not stale) applied + shown ───────────────
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', qty: 1, live: { delta: 10.95, underlyingPrice: 140 } },
    ]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 620,
      response: { ok: true, items: [
        { symbol: 'AMD', beta: 3.014956, source: 'tastytrade', status: 'ok', rawBeta: 3.014956, stale: false },
        { symbol: 'SPY', beta: 1, source: 'tastytrade', status: 'ok', rawBeta: 1, stale: false },
      ], missing: [], staleCount: 0 },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(approx(pm._store[0].live.beta, 3.014956), '2: AMD pos.beta = 3.014956 applied');
    assert(approx(diag.betaBySymbol.AMD, 3.014956) && diag.betaSourceBySymbol.AMD === 'tastytrade',
      '2: betaBySymbol + source(tastytrade) recorded');
    assert(approx(ctx._apexLatestBetaBySymbol.AMD.beta, 3.014956) && ctx._apexLatestBetaBySymbol.AMD.source === 'tastytrade',
      '2: latest-beta cache holds AMD with source');
    // The row renders the beta and computes βΔ from it.
    const row = ctx.computeRowBetaWeightedDelta(pm.getByPortfolio('p1')[0], 620);
    assert(approx(row.beta, 3.014956), '2: row Beta column shows 3.014956');
    assert(approx(row.betaWeightedDelta, 10.95 * 3.014956 * (140 / 620)), '2: βΔ WTD computed from AMD beta');
  }

  // ── 3. SPY beta=1 (status ok AND self_benchmark) accepted, never discarded ───
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'SPY', qty: 1, live: { delta: 3, underlyingPrice: 500 } },
    ]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [
        { symbol: 'SPY', beta: 1, source: 'tastytrade', status: 'ok', rawBeta: 1, stale: false },
      ], missing: [], staleCount: 0 },
    });
    const d = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(d.betaBySymbol.SPY === 1, '3: SPY beta=1 status ok accepted (not discarded)');
    assert(pm._store[0].live.beta === 1, '3: SPY pos.beta = 1 applied');

    // self_benchmark is equally trusted.
    const pm2 = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'SPY', qty: 1, live: { delta: 3, underlyingPrice: 500 } },
    ]);
    const ctx2 = makeCtx({
      positionManager: pm2, spyPrice: 500,
      response: { ok: true, items: [
        { symbol: 'SPY', beta: 1, source: 'tastytrade', status: 'self_benchmark', rawBeta: 1, stale: false },
      ], missing: [], staleCount: 0 },
    });
    const d2 = await ctx2.refreshPortfolioBetas(pm2.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(d2.betaBySymbol.SPY === 1, '3: SPY beta=1 status self_benchmark accepted');
    assert(ctx2._apexLatestBetaBySymbol.SPY.status === 'self_benchmark', '3: self_benchmark status preserved in cache');
  }

  // ── 4. beta null / missing / invalid → null, "--", βΔ null (never 0) ─────────
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'XYZ', qty: 1, live: { delta: 10, underlyingPrice: 50 } },
    ]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [
        { symbol: 'XYZ', beta: null, source: 'tastytrade', status: 'fetch_error', stale: false },
        { symbol: 'SPY', beta: 1, source: 'tastytrade', status: 'ok', stale: false },
      ], missing: ['XYZ'], staleCount: 0 },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.beta === undefined, '4: null beta never written to pos');
    assert(!('XYZ' in ctx._apexLatestBetaBySymbol), '4: invalid beta not cached');
    const row = ctx.computeRowBetaWeightedDelta(pm.getByPortfolio('p1')[0], 500);
    assert(row.beta === null && row.betaWeightedDelta === null, '4: row shows "--" (beta null, βΔ null, never 0)');
    assert(diag.appliedToPositions[0].reasonIfMissing === 'beta_missing', '4: reason beta_missing');
  }

  // ── 5. stale=true does NOT overwrite a valid, more-recent beta on the row ─────
  {
    const pm = makePositionManager([
      // The row already carries a fresh valid beta (e.g. from a prior refresh).
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', qty: 1, live: { delta: 10, underlyingPrice: 140, beta: 1.08 } },
    ]);
    const ctx = makeCtx({
      positionManager: pm, spyPrice: 500,
      response: { ok: true, items: [
        { symbol: 'AMD', beta: 2.5, source: 'tastytrade', status: 'ok', rawBeta: 2.5, stale: true },
        { symbol: 'SPY', beta: 1, source: 'tastytrade', status: 'ok', stale: false },
      ], missing: [], staleCount: 1 },
    });
    const diag = await ctx.refreshPortfolioBetas(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.beta === 1.08, '5: stale beta did NOT overwrite the valid 1.08 (kept, not nulled)');
    assert(!('AMD' in diag.betaBySymbol), '5: stale beta not accepted into betaBySymbol');
    assert(diag.warnings.some(w => String(w).indexOf('rejected_beta:AMD') === 0 && /stale/.test(w)),
      '5: stale rejection recorded in warnings');
    assert(diag.staleCount === 1, '5: staleCount surfaced from backend payload');
  }

  // ── 6. βΔ WTD computed only when a beta is present ───────────────────────────
  {
    const ctx = makeCtx({ positionManager: makePositionManager([]), response: {} });
    const withBeta = ctx.computeRowBetaWeightedDelta({ ticker: 'X', delta: 5, beta: 1.1, underlyingPrice: 100, legs: [], entrySnapshot: {} }, 500);
    assert(withBeta.betaWeightedDelta !== null, '6: βΔ computed when beta present');
    const noBeta = ctx.computeRowBetaWeightedDelta({ ticker: 'X', delta: 5, beta: null, underlyingPrice: 100, legs: [], entrySnapshot: {} }, 500);
    assert(noBeta.beta === null && noBeta.betaWeightedDelta === null, '6: βΔ null when beta absent');
  }

  // ── 7. entrySnapshot.beta fallback valid; backend latest outranks it ─────────
  {
    // No live beta, no cache → entrySnapshot.beta used.
    const ctxSnap = makeCtx({ positionManager: makePositionManager([]), response: {} });
    const rowSnap = ctxSnap.computeRowBetaWeightedDelta(
      { ticker: 'AMD', delta: 10.95, beta: null, underlyingPrice: 140, legs: [], entrySnapshot: { beta: 1.85 } }, 620);
    assert(approx(rowSnap.beta, 1.85), '7: entrySnapshot.beta fallback still valid');

    // Backend latest beta (cache) outranks entrySnapshot but not live pos.beta.
    const ctxLatest = makeCtx({ positionManager: makePositionManager([]), response: {}, latestBetaSeed: { AMD: { beta: 2.0, source: 'tastytrade', fetchedAt: 'now' } } });
    const rowLatest = ctxLatest.computeRowBetaWeightedDelta(
      { ticker: 'AMD', delta: 10.95, beta: null, underlyingPrice: 140, legs: [], entrySnapshot: { beta: 1.85 } }, 620);
    assert(approx(rowLatest.beta, 2.0), '7: backend latest beta outranks entrySnapshot.beta');
    const rowLive = ctxLatest.computeRowBetaWeightedDelta(
      { ticker: 'AMD', delta: 10.95, beta: 1.2, underlyingPrice: 140, legs: [], entrySnapshot: { beta: 1.85 } }, 620);
    assert(approx(rowLive.beta, 1.2), '7: live pos.beta wins over backend latest + snapshot');
  }

  // ── 8. Journal snapshot saves beta + source + fetch time (static wiring) ─────
  {
    const snap = extractFn(HTML, '_buildRichSnapshot');
    assert(/_portfolioLatestBackendBetaEntry\(ticker\)/.test(snap),
      '8: _buildRichSnapshot consults the backend latest beta');
    assert(/betaFetchedAt:\s*_snapBeta != null \? _snapBetaFetchedAt : null/.test(HTML),
      '8: snapshot persists betaFetchedAt');
    assert(/betaUpdatedAt:\s*_snapBeta != null \? _snapBetaFetchedAt : null/.test(HTML),
      '8: snapshot persists betaUpdatedAt');
    assert(/betaSource:\s*_snapBeta != null \? \(_snapBetaSource/.test(HTML),
      '8: snapshot betaSource uses the resolved source');
  }

  // ── 9. IVR regression guard (102.3 / 104 normalization) ─────────────────────
  {
    const sb = { console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, 'normalizeIvrPercent'), sb);
    assert(approx(sb.normalizeIvrPercent(1.023), 102.3), '9: 1.023 → 102.3');
    assert(approx(sb.normalizeIvrPercent(1.04), 104),    '9: 1.04 → 104');
    assert(approx(sb.normalizeIvrPercent(102.3), 102.3), '9: 102.3 stays 102.3 (idempotent)');
  }

  // ── 10. SQZ regression guard (false → OFF, not "--") ────────────────────────
  {
    const sb = { console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_snapshotSqueezeState'), sb);
    assert(sb._snapshotSqueezeState({ tech1d: { squeeze: false } }) === 'OFF', '10: squeeze:false → OFF');
    assert(sb._snapshotSqueezeState({ tech1d: { squeeze: true } }) === 'ACTIVE', '10: squeeze:true → ACTIVE');
  }

  // ── 11. Backend-aware save regression guard (static wiring) ─────────────────
  {
    // The gate + trust logic in refreshPortfolioBetas leaves the backend-aware save
    // path untouched: jSaveRemote still POSTs /journal/trades and records the outcome.
    assert(/function jSaveRemote/.test(HTML), '11: jSaveRemote present');
    assert(/_recordJournalBackendSave/.test(HTML), '11: backend-save recorder present');
    assert(HTML.indexOf("console.warn('[PORTFOLIO BETA REFRESH] invalid beta ignored'") !== -1,
      '11: invalid-beta warn string preserved (no console regression)');
  }

  console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
  process.exit(failed ? 1 : 0);
})();
