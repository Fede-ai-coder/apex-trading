'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO ← backend earnings latest (GET /market/earnings/latest).
//
// Proves the Portfolio maps next-earnings from the dedicated backend endpoint,
// INDEPENDENTLY of the technical-refresh formula-parity gate (earnings are
// Tastytrade symbol metadata — they must not be blocked when the technical
// mapping is skipped for formula_parity_not_confirmed).
//
//   1. GET /market/earnings/latest?symbols=<open tickers>; AMD ok is mapped.
//   2. earnings mapping runs OUTSIDE the parity gate (works with no technicals).
//   3. status missing → not written → pos.nextEarnings null (row "--").
//   4. SPY missing does NOT block AMD.
//   5. entrySnapshot earnings fallback stays valid (missing backend → snap wins).
//   6. scanData earnings fallback stays valid (not clobbered when backend missing).
//   7. PAST earnings date → skipped (never shown as a next earnings).
//   8. no invented earnings — absent/missing stays null.
//   9. Unrealized P&L formula intact (crafted -345.50 leg P&L unchanged).
//  10. βΔ WTD / βΔ SPY-EQ helpers unchanged (static wiring).
//  11. SQZ mapping/fallback unchanged (false → OFF).
//  12. IVR / Beta unchanged (normalization + backend beta refresh intact).
//
// Dates are built relative to "today" so the suite is stable on any run date.
//
// Run: node tests/portfolio-earnings-latest-mapping.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

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
function approx(a, b, eps) { return a != null && Math.abs(a - b) <= (eps || 1e-6); }

function isoOffset(days) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Position manager mock — updateLive writes into live; getByPortfolio projects the
// live earnings fields the same way _tradeAsPosition does (live.nextEarnings ||
// snap.nextEarnings). Records updateLive calls for assertion.
function makePositionManager(trades) {
  const store = trades.map(t => Object.assign({}, t, { live: Object.assign({}, t.live || {}) }));
  const calls = [];
  return {
    _store: store,
    _calls: calls,
    getByPortfolio(pid) {
      return store.filter(t => t.portfolioId === pid).map(t => {
        const snap = (t.entrySnapshot && (t.entrySnapshot.nextEarnings || t.entrySnapshot.earningsDate)) || null;
        return {
          id: t.id, portfolioId: t.portfolioId, ticker: t.ticker,
          legs: t.legs || [], entrySnapshot: t.entrySnapshot || null,
          // Mirror _tradeAsPosition: live wins, else snapshot fallback.
          nextEarnings: t.live.nextEarnings || snap || null,
          earningsDte: t.live.earningsDte !== undefined ? t.live.earningsDte : null,
          earningsSource: t.live.earningsSource !== undefined ? t.live.earningsSource : null,
          earningsUpdatedAt: t.live.earningsUpdatedAt !== undefined ? t.live.earningsUpdatedAt : null,
        };
      });
    },
    updateLive(id, data) {
      const t = store.find(x => x.id === id);
      if (!t) return;
      calls.push({ id, data });
      ['nextEarnings','earningsDte','earningsSource','earningsFetchedAt','earningsUpdatedAt'].forEach(k => {
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
    BACKEND: 'https://backend.test',
    _backendAuthHeaders(extra) { return Object.assign({}, extra || {}); },
    AbortSignal: { timeout() { return undefined; } },
    positionManager: opts.positionManager,
    _apexLatestEarningsBySymbol: {},
    _apexPortfolioEarningsDiag: {},
    _apexPortfolioGreeksRefreshDiag: {},
    isFinite, parseFloat, Math, String, Date, Object, Array, isNaN, encodeURIComponent,
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
  vm.runInContext([
    extractFn(HTML, '_portfolioRiskDebugEnabled'),
    extractFn(HTML, 'computeEarningsDte'),
    extractFn(HTML, '_normalizeEarningsDate'),
    extractFn(HTML, 'refreshPortfolioEarnings'),
  ].join('\n'), ctx);
  return ctx;
}

(async function run() {

  const future = isoOffset(32);  // AMD-style: 2026-08-04 relative to today

  // ── 1. GET with open tickers; AMD ok mapped onto the position ────────────────
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      response: { AMD: { nextEarningsDate: future, earningsDte: 32, source: 'TASTYTRADE', status: 'ok', updatedAt: '2026-06-10T02:15:52.895Z' } },
    });
    const diag = await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(ctx._fetchCalls[0] === 'https://backend.test/market/earnings/latest?symbols=AMD',
      '1: GET /market/earnings/latest?symbols=AMD, got ' + ctx._fetchCalls[0]);
    assert(pm._store[0].live.nextEarnings === future, '1: AMD pos.nextEarnings mapped to ' + future);
    assert(pm._store[0].live.earningsSource === 'TASTYTRADE', '1: earningsSource persisted');
    assert(pm._store[0].live.earningsUpdatedAt === '2026-06-10T02:15:52.895Z', '1: earningsUpdatedAt persisted');
    assert(diag.earningsBySymbol.AMD && diag.earningsBySymbol.AMD.earningsDte === 32, '1: DTE 32 in diag');
    // DTE the render computes matches the backend's 32.
    assert(ctx.computeEarningsDte(pm._store[0].live.nextEarnings) === 32, '1: computed DTE 32 (render parity)');
  }

  // ── 2. Runs OUTSIDE the parity gate — maps with NO technicals present ────────
  {
    // refreshPortfolioEarnings takes only positions + the earnings response; it has
    // no technicalResult / formulaParity input at all, so a parity-skipped technical
    // refresh cannot block it.
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      response: { items: [{ symbol: 'AMD', nextEarningsDate: future, earningsDte: 32, source: 'TASTYTRADE', status: 'ok' }] },
    });
    await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.nextEarnings === future, '2: earnings mapped with zero technical data');
    // Static: the fn body references neither formula parity nor technical gating.
    const body = extractFn(HTML, 'refreshPortfolioEarnings');
    assert(!/formulaParity|parityGate|required1DParity|technicalResult|formula_parity/.test(body),
      '2: refreshPortfolioEarnings has no parity/technical dependency');
    // Static: the call site sits after refreshPortfolioBetas, not inside a parity branch.
    const callIdx = HTML.indexOf('await refreshPortfolioEarnings(positionManager.getByPortfolio(portfolioId)');
    assert(callIdx !== -1, '2: refreshPortfolioEarnings invoked in the refresh loop');
    const betaIdx = HTML.indexOf('await refreshPortfolioBetas(positionManager.getByPortfolio(portfolioId)');
    assert(callIdx > betaIdx && betaIdx !== -1, '2: earnings refresh runs after beta refresh (outside tech gate)');
  }

  // ── 3. status missing → not written → nextEarnings null (--) ─────────────────
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'SPY', legs: [], live: {} },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      response: { SPY: { status: 'missing', reason: 'no_expected_report_date' } },
    });
    await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.nextEarnings === undefined, '3: missing status never writes nextEarnings');
    assert(pm._calls.length === 0, '3: no updateLive call for a missing symbol');
    assert(pm.getByPortfolio('p1')[0].nextEarnings === null, '3: row nextEarnings null → "--"');
  }

  // ── 4. SPY missing does NOT block AMD ────────────────────────────────────────
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} },
      { id: 't2', portfolioId: 'p1', ticker: 'SPY', legs: [], live: {} },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      response: {
        AMD: { nextEarningsDate: future, earningsDte: 32, source: 'TASTYTRADE', status: 'ok' },
        SPY: { status: 'missing', reason: 'no_expected_report_date' },
      },
    });
    await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(ctx._fetchCalls[0] === 'https://backend.test/market/earnings/latest?symbols=AMD,SPY',
      '4: both symbols requested');
    assert(pm._store[0].live.nextEarnings === future, '4: AMD mapped despite SPY missing');
    assert(pm._store[1].live.nextEarnings === undefined, '4: SPY left unset (missing)');
  }

  // ── 5. entrySnapshot earnings fallback stays valid ───────────────────────────
  {
    const snapDate = isoOffset(45);
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {}, entrySnapshot: { nextEarnings: snapDate } },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      response: { AMD: { status: 'missing', reason: 'no_expected_report_date' } },
    });
    await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    // Backend missing → no live write → the entrySnapshot fallback still surfaces.
    assert(pm.getByPortfolio('p1')[0].nextEarnings === snapDate,
      '5: entrySnapshot earnings fallback survives a missing backend result');
    // _positionFieldsFromSnapshot still resolves the snapshot date.
    const sb = { console: { log() {} }, normalizeGreekPoints: v => v, normalizeIvrPercent: v => v,
                 _snapshotSqueezeState: () => null, isFinite, Number, parseFloat, String, Object };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_positionFieldsFromSnapshot'), sb);
    assert(sb._positionFieldsFromSnapshot({ entrySnapshot: { nextEarnings: snapDate } }).nextEarnings === snapDate,
      '5: _positionFieldsFromSnapshot resolves snapshot earnings');
  }

  // ── 6. scanData earnings fallback stays valid (not clobbered when missing) ────
  {
    const scanDate = isoOffset(20);
    const pm = makePositionManager([
      // live.nextEarnings pre-seeded from the scanData→priceMap path earlier in refresh.
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: { nextEarnings: scanDate } },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      response: { AMD: { status: 'missing' } },
    });
    await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.nextEarnings === scanDate, '6: scanData earnings not clobbered by a missing backend result');
    // Static: the scanData→priceMap earnings fold is untouched.
    assert(/if \(!pm\.nextEarnings\s+&& sd\.nextEarnings\)\s+pm\.nextEarnings = sd\.nextEarnings;/.test(HTML),
      '6: scanData→priceMap earnings fold preserved');
  }

  // ── 7. PAST earnings date → skipped (never shown as next) ────────────────────
  {
    const pastDate = isoOffset(-5);
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      // A stale/past date, even with status ok, must NOT be applied.
      response: { AMD: { nextEarningsDate: pastDate, status: 'ok', source: 'TASTYTRADE' } },
    });
    const diag = await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.nextEarnings === undefined, '7: past date not written');
    assert(diag.warnings.some(w => w.indexOf('past_or_uncomputable:AMD') === 0), '7: past date recorded in warnings');
    assert(pm.getByPortfolio('p1')[0].nextEarnings === null, '7: row shows "--" for a past date');
  }

  // ── 8. no invented earnings — absent/null/unparseable stays null ─────────────
  {
    const pm = makePositionManager([
      { id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} },
      { id: 't2', portfolioId: 'p1', ticker: 'NVDA', legs: [], live: {} },
    ]);
    const ctx = makeCtx({
      positionManager: pm,
      response: {
        AMD:  { nextEarningsDate: null, status: 'ok' },      // ok but no date → skipped
        NVDA: { nextEarningsDate: 'not-a-date', status: 'ok' }, // unparseable → skipped
      },
    });
    await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm._store[0].live.nextEarnings === undefined, '8: null date not invented for AMD');
    assert(pm._store[1].live.nextEarnings === undefined, '8: unparseable date not invented for NVDA');
    // Fetch failure never fabricates either.
    const pm2 = makePositionManager([{ id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} }]);
    const ctx2 = makeCtx({ positionManager: pm2, fetchError: 'boom' });
    const d2 = await ctx2.refreshPortfolioEarnings(pm2.getByPortfolio('p1'), 'p1', { skipRender: true });
    assert(pm2._store[0].live.nextEarnings === undefined, '8: fetch failure never writes earnings');
    assert(d2.warnings.some(w => String(w).indexOf('fetch_failed') === 0), '8: fetch failure recorded');
  }

  // ── 9. Unrealized P&L formula intact (crafted -345.50) ───────────────────────
  {
    const sb = { console: { log() {} }, isFinite, parseFloat, Math, Object };
    vm.createContext(sb);
    vm.runInContext([
      extractFn(HTML, '_portfolioQuantityFieldPresent'),
  extractFn(HTML, '_portfolioStrictQuantity'),
  extractFn(HTML, '_portfolioReadQuantityField'),
  extractFn(HTML, '_portfolioResidualQuantityFields'),
  extractFn(HTML, '_portfolioGrossQuantityFields'),
  extractFn(HTML, '_portfolioResolveLegQuantity'),
      extractFn(HTML, '_portfolioLegExplicitOpenQty'),
      extractFn(HTML, '_portfolioLegEffectiveQty'),
      extractFn(HTML, '_legUnrealizedPnL'),
    ].join('\n'), sb);
    // LONG option, entry 10.00, mark 6.545, qty 1 → +1 * (6.545 - 10) * 1 * 100 = -345.50
    const pnl = sb._legUnrealizedPnL({ side: 'LONG', type: 'CALL', qty: 1, entryPrice: 10.00 }, 6.545);
    assert(approx(pnl, -345.50, 1e-6), '9: leg P&L still -345.50 (formula unchanged), got ' + pnl);
    assert(/sign \* \(mark - entry\) \* qty \* mult/.test(HTML), '9: P&L formula string preserved');
  }

  // ── 10. βΔ WTD / βΔ SPY-EQ helpers unchanged (static wiring) ─────────────────
  {
    assert(/function computeRowBetaWeightedDelta/.test(HTML), '10: computeRowBetaWeightedDelta present');
    assert(/function _portfolioTotalsSnapshot/.test(HTML), '10: _portfolioTotalsSnapshot present');
    assert(/betaWeightedDelta/.test(HTML), '10: βΔ WTD field preserved');
  }

  // ── 11. SQZ mapping/fallback unchanged (false → OFF) ─────────────────────────
  {
    const sb = { console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_snapshotSqueezeState'), sb);
    assert(sb._snapshotSqueezeState({ tech1d: { squeeze: false } }) === 'OFF', '11: squeeze:false → OFF (no regression)');
    assert(sb._snapshotSqueezeState({ tech1d: { squeeze: true } }) === 'ACTIVE', '11: squeeze:true → ACTIVE');
  }

  // ── 12. IVR / Beta unchanged (normalization + backend beta refresh intact) ───
  {
    const sb = { console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, 'normalizeIvrPercent'), sb);
    assert(approx(sb.normalizeIvrPercent(1.04), 104), '12: IVR 1.04 → 104 (unchanged)');
    assert(approx(sb.normalizeIvrPercent(102.3), 102.3), '12: IVR 102.3 idempotent');
    assert(/async function refreshPortfolioBetas/.test(HTML), '12: refreshPortfolioBetas untouched');
    assert(HTML.indexOf('/market/betas/latest?symbols=') !== -1, '12: beta source endpoint unchanged');
  }

  console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
  process.exit(failed ? 1 : 0);
})();
