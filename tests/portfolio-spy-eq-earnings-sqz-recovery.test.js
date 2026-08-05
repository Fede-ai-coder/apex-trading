'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — βΔ SPY-EQ / Earnings / SQZ recovery (restore missing wiring).
//
// Guards the minimal, frontend-only fixes that restore three Portfolio columns
// that were rendering "-"/"--" even though the backend was delivering (or could
// deliver) the data:
//
//   SQZ  — squeeze is candle-derived and INDEPENDENT of the RSI/SMA/Bollinger
//          formula-parity gate. _extractBackendSqueezeByTicker maps it even when
//          formulaParity is empty/unconfirmed (the buildBackend… early return
//          would otherwise discard it), and records an explicit no-data reason.
//   EARN — next-earnings is embedded per symbol in /portfolio/technical-refresh
//          (row.earnings). _applyTechnicalRefreshEarnings applies it from data the
//          Portfolio already fetched (no extra, timeout-prone call), and the
//          dedicated call's timeout is non-fatal + surfaced as EARNINGS_TIMEOUT.
//   SPY-EQ— diagnostic only: the missing input is surfaced (MISSING_SPY_PRICE …)
//          instead of a silent "—"; the formula is UNCHANGED and a fallback
//          (CANDLE_CLOSE_FALLBACK) SPY price is still accepted.
//
//   1. SQZ maps from technical['1D'].squeeze aliases with EMPTY formulaParity.
//   2. SQZ false → OFF (never dropped); 1D preferred, 4H fallback.
//   3. SQZ no-data → explicit reason (no_1d_candles / backend oneDReason).
//   4. Earnings applied from technical-refresh embedded row.earnings (map + array).
//   5. Earnings past/rejected date → not applied (no invented earnings).
//   6. `earnings` survives the batch merge (ingest whitelist) — static guard.
//   7. Earnings timeout → EARNINGS_TIMEOUT reason, other fields untouched.
//   8. Pre-existing earnings (from technical-refresh) → dedicated timeout clears reason.
//   9. βΔ SPY-EQ formula UNCHANGED; missingReason still delta/beta/underlyingPrice/spyPrice.
//  10. βΔ SPY-EQ accepts a fallback (positive, non-live) SPY price — no source gate.
//  11. Render/static guards: inline MISSING_* codes + reason tooltips wired.
//
// Run: node tests/portfolio-spy-eq-earnings-sqz-recovery.test.js
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
function near(a, b, eps, msg) { assert(a != null && Math.abs(a - b) < (eps || 0.01), msg + ' (got ' + a + ')'); }
function isoOffset(days) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

const future = isoOffset(32);
const past   = isoOffset(-6);

// ─────────────────────────────────────────────────────────────────────────────
// 1-3. SQZ — parity-independent extraction + explicit no-data reason
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  const sb = { console: { log() {}, warn() {}, debug() {} }, String, Object, Array, isFinite, Number };
  vm.createContext(sb);
  vm.runInContext([
    extractFn(HTML, '_squeezeToState'),
    extractFn(HTML, '_technicalTfSqueezeState'),
    extractFn(HTML, '_portfolioTechnicalRowMapFromResponse'),
    extractFn(HTML, '_extractBackendSqueezeByTicker'),
  ].join('\n'), sb);
  const X = sb._extractBackendSqueezeByTicker;

  // 1. EMPTY formulaParity — squeeze from technical['1D'].squeeze still maps (ACTIVE).
  const r1 = X(['AMD'], { formulaParity: {}, symbols: [{ symbol: 'AMD', technical: { '1D': { squeeze: true, rsi14: 50 } } }] }, 'T');
  assert(r1.byTicker.AMD && r1.byTicker.AMD.squeeze === 'ACTIVE', '1a: squeeze ACTIVE with empty formulaParity (symbols[])');
  assert(r1.byTicker.AMD.squeezeOnly === true, '1b: marked squeezeOnly (does not masquerade as full technical)');
  const r1b = X(['AMD'], { technicalsBySymbol: { AMD: { technical: { '1D': { squeezeOn: true } } } } }, 'T');
  assert(r1b.byTicker.AMD && r1b.byTicker.AMD.squeeze === 'ACTIVE', '1c: squeezeOn alias via technicalsBySymbol map');

  // 2. false → OFF (never dropped); 1D preferred, 4H fallback.
  const r2 = X(['AMD'], { symbols: [{ symbol: 'AMD', technical: { '1D': { squeeze: false } } }] }, 'T');
  assert(r2.byTicker.AMD && r2.byTicker.AMD.squeeze === 'OFF', '2a: squeeze:false → OFF (never "--")');
  const r2b = X(['AMD'], { symbols: [{ symbol: 'AMD', technical: { '1D': { squeeze: false }, '4H': { squeeze: true } } }] }, 'T');
  assert(r2b.byTicker.AMD.squeeze === 'OFF', '2b: 1D preferred (OFF) over 4H (ON)');
  const r2c = X(['AMD'], { symbols: [{ symbol: 'AMD', technical: { '4H': { squeeze: true } } }] }, 'T');
  assert(r2c.byTicker.AMD.squeeze === 'ACTIVE' && r2c.byTicker.AMD.squeeze4h === 'ACTIVE', '2c: 4H used when 1D absent');

  // 3. no squeeze data → explicit reason (never a silent "--").
  const r3a = X(['AMD'], { symbols: [{ symbol: 'AMD', technical: { '1D': { rsi14: 50 } }, oneDStatus: 'unavailable', oneDReason: 'DXLINK_1D_CANDLE_CACHE_EMPTY' }] }, 'T');
  assert(!r3a.byTicker.AMD, '3a: no squeeze row emitted when squeeze absent');
  assert(r3a.reasonByTicker.AMD === 'DXLINK_1D_CANDLE_CACHE_EMPTY', '3a: backend oneDReason surfaced');
  const r3b = X(['AMD'], { symbols: [] }, 'T');
  assert(r3b.reasonByTicker.AMD === 'no_1d_candles', '3b: no row at all → no_1d_candles');
  const r3c = X(['AMD'], { symbols: [{ symbol: 'AMD', technical: {}, oneDStatus: 'partial' }] }, 'T');
  assert(r3c.reasonByTicker.AMD === 'insufficient_candles', '3c: partial 1D → insufficient_candles');
  console.log('✓ 1-3 SQZ maps parity-independently (empty formulaParity) + explicit no-data reason');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 4-5. Earnings — applied from technical-refresh embedded row.earnings
// ─────────────────────────────────────────────────────────────────────────────
function makePositionManager(trades) {
  const store = trades.map(t => Object.assign({}, t, { live: Object.assign({}, t.live || {}) }));
  const calls = [];
  return {
    _store: store, _calls: calls,
    getByPortfolio(pid) {
      return store.filter(t => t.portfolioId === pid).map(t => ({
        id: t.id, portfolioId: t.portfolioId, ticker: t.ticker, legs: t.legs || [],
        entrySnapshot: t.entrySnapshot || null,
        nextEarnings: t.live.nextEarnings || (t.entrySnapshot && t.entrySnapshot.nextEarnings) || null,
        earningsDte: t.live.earningsDte !== undefined ? t.live.earningsDte : null,
        earningsSource: t.live.earningsSource !== undefined ? t.live.earningsSource : null,
        earningsUpdatedAt: t.live.earningsUpdatedAt !== undefined ? t.live.earningsUpdatedAt : null,
        delta: t.live.delta !== undefined ? t.live.delta : (t.delta !== undefined ? t.delta : null),
        beta:  t.live.beta  !== undefined ? t.live.beta  : (t.beta  !== undefined ? t.beta  : null),
      }));
    },
    updateLive(id, data) {
      const t = store.find(x => x.id === id); if (!t) return; calls.push({ id, data });
      Object.keys(data).forEach(k => { if (data[k] !== undefined) t.live[k] = data[k]; });
    },
  };
}

(function() {
  const pm = makePositionManager([{ id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} }]);
  const sb = {
    console: { log() {}, warn() {}, debug() {} }, String, Object, Array, isFinite, Number, Math, Date,
    positionManager: pm, _apexLatestEarningsBySymbol: {}, _apexPortfolioEarningsReasonBySymbol: {},
  };
  vm.createContext(sb);
  vm.runInContext([
    extractFn(HTML, 'computeEarningsDte'),
    extractFn(HTML, '_normalizeEarningsDate'),
    extractFn(HTML, '_portfolioTechnicalRowMapFromResponse'),
    extractFn(HTML, '_applyTechnicalRefreshEarnings'),
  ].join('\n'), sb);

  // 4. embedded earnings (technical-refresh) applied — symbols[] shape.
  const applied = sb._applyTechnicalRefreshEarnings(['AMD'],
    { symbols: [{ symbol: 'AMD', earnings: { nextEarningsDate: future, status: 'ok', source: 'TASTYTRADE' } }] }, 'p1');
  assert(applied === 1, '4a: one earnings applied from technical-refresh');
  assert(pm._store[0].live.nextEarnings === future, '4b: AMD pos.nextEarnings mapped from embedded earnings');
  assert(sb._apexLatestEarningsBySymbol.AMD && sb._apexLatestEarningsBySymbol.AMD.nextEarningsDate === future, '4c: latest earnings cache populated');
  // technicalsBySymbol (merged) shape also works.
  const pm2 = makePositionManager([{ id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} }]);
  sb.positionManager = pm2;
  const applied2 = sb._applyTechnicalRefreshEarnings(['AMD'],
    { technicalsBySymbol: { AMD: { earnings: { nextEarningsDate: future, status: 'ok' } } } }, 'p1');
  assert(applied2 === 1 && pm2._store[0].live.nextEarnings === future, '4d: earnings applied from technicalsBySymbol (merged shape)');

  // 5. past / rejected → not applied (no invented earnings).
  const pm3 = makePositionManager([{ id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: {} }]);
  sb.positionManager = pm3;
  const a5a = sb._applyTechnicalRefreshEarnings(['AMD'], { symbols: [{ symbol: 'AMD', earnings: { nextEarningsDate: past, status: 'ok' } }] }, 'p1');
  assert(a5a === 0 && pm3._store[0].live.nextEarnings === undefined, '5a: past date not applied');
  const a5b = sb._applyTechnicalRefreshEarnings(['AMD'], { symbols: [{ symbol: 'AMD', earnings: { status: 'missing', reason: 'no_expected_report_date' } }] }, 'p1');
  assert(a5b === 0 && pm3._store[0].live.nextEarnings === undefined, '5b: status missing not applied');
  console.log('✓ 4-5 earnings applied from technical-refresh embedded row.earnings; past/missing skipped');
})();

// 6. `earnings` survives the batch merge (ingest whitelist) — static guard.
(function() {
  const ingest = HTML.slice(HTML.indexOf("['candles1DCount','candleCount1D'"), HTML.indexOf("['candles1DCount','candleCount1D'") + 700);
  assert(/'formulaParity','earnings'\]|,'earnings'\]/.test(ingest), "6: 'earnings' added to _ingestRowMap whitelist (survives batch merge)");
  console.log('✓ 6 earnings preserved through the technical batch merge');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 7-8. Earnings timeout → EARNINGS_TIMEOUT reason; other fields untouched
// ─────────────────────────────────────────────────────────────────────────────
function makeEarnCtx(opts) {
  opts = opts || {};
  const ctx = {
    console: { log() {}, warn() {}, error() {}, debug() {} },
    BACKEND: 'https://backend.test', _backendAuthHeaders() { return {}; },
    AbortSignal: { timeout() { return undefined; } },
    positionManager: opts.positionManager,
    _apexLatestEarningsBySymbol: {}, _apexPortfolioEarningsReasonBySymbol: opts.reasonMap || {},
    _apexPortfolioEarningsDiag: {}, _apexPortfolioGreeksRefreshDiag: {},
    isFinite, parseFloat, Math, String, Date, Object, Array, isNaN, encodeURIComponent,
    fetch() {
      if (opts.abort) { const e = new Error('The operation timed out.'); e.name = 'AbortError'; return Promise.reject(e); }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(opts.response || {}), text: () => Promise.resolve('') });
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

(async function() {
  // 7. Abort → EARNINGS_TIMEOUT; delta/beta never touched; no earnings written.
  const pm = makePositionManager([{ id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: { delta: 10.9, beta: 3.01 } }]);
  const reasonMap = {};
  const ctx = makeEarnCtx({ positionManager: pm, abort: true, reasonMap });
  await ctx.refreshPortfolioEarnings(pm.getByPortfolio('p1'), 'p1', { skipRender: true });
  assert(reasonMap.AMD === 'EARNINGS_TIMEOUT', '7a: aborted fetch → EARNINGS_TIMEOUT reason');
  assert(pm._store[0].live.nextEarnings === undefined, '7b: no earnings written on timeout');
  assert(pm._store[0].live.delta === 10.9 && pm._store[0].live.beta === 3.01, '7c: delta/beta untouched (other fields not blanked)');
  const earnKeyWrites = pm._calls.filter(c => Object.keys(c.data).some(k => /earnings|nextEarnings/i.test(k)));
  assert(earnKeyWrites.length === 0, '7d: updateLive never wrote an earnings field on timeout');

  // 8. Pre-existing earnings (already applied via technical-refresh) → timeout clears reason.
  const pm2 = makePositionManager([{ id: 't1', portfolioId: 'p1', ticker: 'AMD', legs: [], live: { nextEarnings: future } }]);
  const reasonMap2 = { AMD: 'stale' };
  const ctx2 = makeEarnCtx({ positionManager: pm2, abort: true, reasonMap: reasonMap2 });
  await ctx2.refreshPortfolioEarnings(pm2.getByPortfolio('p1'), 'p1', { skipRender: true });
  assert(reasonMap2.AMD === undefined, '8: pre-existing earnings → no unavailable reason even on dedicated-call timeout');
  console.log('✓ 7-8 earnings timeout is non-fatal + EARNINGS_TIMEOUT provenance; existing earnings preserved');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 9-10. βΔ SPY-EQ — formula UNCHANGED; fallback SPY price accepted
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  const ctx = { console: { log() {}, warn() {}, debug() {} }, Number, Math, isFinite, parseFloat, String, Object, Array, S: { scanData: [] } };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, '_portfolioNetGreekFromActiveLegs'),
    extractFn(HTML, 'isActivePortfolioLeg'),
    extractFn(HTML, '_portfolioLegEffectiveQty'),
    extractFn(HTML, '_portfolioLegExplicitOpenQty'),
    extractFn(HTML, '_portfolioLegHasExplicitOpenQty'),
    extractFn(HTML, '_portfolioLegStatusForRisk'),
    extractFn(HTML, '_portfolioLegCloseMarkerFields'),
  extractFn(HTML, '_portfolioLegHasCloseMarker'),
    extractFn(HTML, '_isTerminalPortfolioLeg'),
    extractFn(HTML, '_portfolioQuantityFieldPresent'),
  extractFn(HTML, '_portfolioStrictQuantity'),
  extractFn(HTML, '_portfolioReadQuantityField'),
  extractFn(HTML, '_portfolioResidualQuantityFields'),
  extractFn(HTML, '_portfolioGrossQuantityFields'),
  extractFn(HTML, '_portfolioResolveLegQuantity'),
    extractFn(HTML, 'normalizeGreekPoints'),
    extractFn(HTML, '_scanDataField'),
    extractFn(HTML, 'computeRowBetaWeightedDelta'),
  ].join('\n'), ctx);
  const row = (over, spy) => ctx.computeRowBetaWeightedDelta(Object.assign({ ticker: 'AMD' }, over), spy);
  const BETA = 3.014956, DELTA = 10.94;

  // 9. formula unchanged: SPY missing → SPY-EQ null with missingReason 'spyPrice'; WTD intact.
  const rMissing = row({ delta: DELTA, beta: BETA, underlyingPrice: 519 }, null);
  assert(rMissing.betaWeightedDeltaSpyEq === null && rMissing.missingReason === 'spyPrice', '9a: SPY missing → SPY-EQ null, reason spyPrice');
  near(rMissing.betaWeightedDeltaWtd, DELTA * BETA, 0.01, '9b: βΔ WTD unchanged (delta×beta) when SPY missing');
  assert(row({ delta: null, beta: BETA, underlyingPrice: 519 }, 625).missingReason === 'delta', '9c: delta missing → reason delta');
  assert(row({ delta: DELTA, beta: null, underlyingPrice: 519 }, 625).missingReason === 'beta', '9d: beta missing → reason beta');
  assert(row({ delta: DELTA, beta: BETA, underlyingPrice: null }, 625).missingReason === 'underlyingPrice', '9e: underlying missing → reason underlyingPrice');

  // 10. a fallback (positive, non-live) SPY price is accepted — no source gate.
  const rFallback = row({ delta: DELTA, beta: BETA, underlyingPrice: 519 }, 625);   // 625 = CANDLE_CLOSE_FALLBACK value
  near(rFallback.betaWeightedDeltaSpyEq, DELTA * BETA * (519 / 625), 0.01, '10: βΔ SPY-EQ computes from a fallback SPY price (accepts CANDLE_CLOSE_FALLBACK)');
  console.log('✓ 9-10 βΔ SPY-EQ formula unchanged; fallback SPY price accepted (no source/isLive gate)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 11. Render / static wiring guards
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  // SPY-EQ inline missing codes + no formula substitution.
  assert(HTML.indexOf('MISSING_SPY_PRICE') !== -1 && HTML.indexOf('MISSING_UNDERLYING_PRICE') !== -1, '11a: βΔ SPY-EQ inline MISSING_* codes rendered');
  assert(HTML.indexOf('_spyEqBarReason') !== -1 && HTML.indexOf('SPY_PRICE_UNAVAILABLE') !== -1, '11b: aggregate βΔ SPY-EQ reason wired');
  assert(HTML.indexOf('rowBwd.betaWeightedDeltaSpyEq') !== -1, '11c: SPY-EQ cell still renders the normalized field (no formula swap)');
  // SQZ reason tooltip + parity-independent application call.
  assert(HTML.indexOf('_apexPortfolioSqueezeReasonBySymbol') !== -1, '11d: SQZ reason map wired');
  assert(HTML.indexOf('_extractBackendSqueezeByTicker(tickers, _sqResp') !== -1, '11e: parity-independent squeeze extractor invoked in refresh');
  assert(HTML.indexOf('SQZ unavailable: ') !== -1, '11f: SQZ cell renders explicit unavailable reason');
  // Earnings: technical-refresh apply invoked + reason tooltip.
  assert(HTML.indexOf('_applyTechnicalRefreshEarnings(tickers, technicalResp') !== -1, '11g: technical-refresh earnings applied before dedicated call');
  assert(HTML.indexOf('Next earnings unavailable: ') !== -1 && HTML.indexOf('EARNINGS_TIMEOUT') !== -1, '11h: earnings unavailable reason + EARNINGS_TIMEOUT wired');
  // Hard-rule guards: no Yahoo / no new provider in the touched portfolio metadata paths.
  const sqFn = extractFn(HTML, '_extractBackendSqueezeByTicker') + extractFn(HTML, '_applyTechnicalRefreshEarnings');
  assert(!/yahoo|query1|query2|finance\.yahoo/i.test(sqFn), '11i: no Yahoo/new provider in the new SQZ/earnings helpers');
  console.log('✓ 11 render + wiring guards (SPY-EQ codes, SQZ/earnings reasons, no Yahoo)');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
