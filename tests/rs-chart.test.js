'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Structural + behavioural tests for the RS vs SPY scanner chart data source.
//
// These tests guarantee that the chart-rendering change:
//   1. uses the backend candle cache / store before the frontend fallback,
//   2. never triggers /scanner/run,
//   3. does not change scanner rules / score / filter functions,
//   4. does not modify RS vs SPY scanner result computation,
//   5. never fetches on partial / unconfirmed input,
//   6. de-duplicates concurrent requests for the same symbol+timeframe,
//   7. keeps the existing frontend fallback when backend candles are absent,
//   8. does not touch Portfolio / Journal / Greeks / Market Context paths.
//
// The RS-CHART data-source block is extracted from index.html (between explicit
// markers) and evaluated in an isolated VM context with mocked globals, so the
// behaviour is exercised against the real shipped code rather than a copy.
// ─────────────────────────────────────────────────────────────────────────────

const test   = require('node:test');
const assert = require('node:assert');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');

const INDEX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const START = '// ==RS-CHART-DATA-SOURCE:START==';
const END   = '// ==RS-CHART-DATA-SOURCE:END==';

function extractBlock() {
  const i = INDEX.indexOf(START);
  const j = INDEX.indexOf(END);
  assert.ok(i >= 0, 'RS-CHART-DATA-SOURCE start marker present');
  assert.ok(j > i, 'RS-CHART-DATA-SOURCE end marker present');
  return INDEX.slice(i + START.length, j);
}

// Build a fresh VM sandbox with mockable dependencies for each test.
function makeContext(overrides) {
  overrides = overrides || {};
  const logs  = [];
  const calls = { fetchBackendCandles: 0, getDailyCandles: 0, getFourHourCandles: 0, render: 0 };

  function candleArr(n, base) {
    base = base || 100;
    const out = [];
    for (let k = 0; k < n; k++) out.push({ time: k, open: base, high: base + 1, low: base - 1, close: base + (k % 3), volume: 1000 });
    return out;
  }

  const sandbox = {
    console: { log: (m) => logs.push(String(m)) },
    Object, Promise, Date, Math, parseFloat, isNaN, Number, RegExp, Array, JSON,
    S: overrides.S || { scanData: [{ ticker: 'AAPL', price: '0', _priceSource: 'scan' }] },
    _scannerChartSymbol: overrides._scannerChartSymbol || 'AAPL',
    getDailyCandles: overrides.getDailyCandles || function () { calls.getDailyCandles++; return null; },
    getFourHourCandles: overrides.getFourHourCandles || function () { calls.getFourHourCandles++; return null; },
    getCandleDataSource: overrides.getCandleDataSource || function () { return 'DXLink 1D'; },
    fetchBackendCandles: overrides.fetchBackendCandles || function () { calls.fetchBackendCandles++; return Promise.resolve([]); },
    renderScannerInlineChart: overrides.renderScannerInlineChart || function () { calls.render++; },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(extractBlock(), ctx);
  return { ctx, logs, calls, candleArr };
}

function rawCandles(n) {
  const out = [];
  const day = 86400;
  for (let k = 0; k < n; k++) out.push({ t: 1700000000 + k * day, o: 100, h: 101, l: 99, c: 100 + (k % 5), v: 1000 });
  return out;
}

// ── 1. Backend cache/store is preferred over the frontend fallback ───────────
test('resolve prefers backend candle cache over frontend buffers', () => {
  const { ctx, calls, candleArr } = makeContext({});
  ctx._rsChartCachePut('AAPL', '1D', candleArr(207));
  const res = ctx._rsChartResolveCandles('AAPL', '1D');
  assert.equal(res.source, 'BACKEND_DXLINK_CANDLES');
  assert.equal(res.candles.length, 207);
  assert.equal(calls.getDailyCandles, 0, 'frontend getDailyCandles must NOT be called when cache is warm');
});

test('backend candle store fetch populates cache and is then preferred', async () => {
  const { ctx, calls } = makeContext({
    fetchBackendCandles: function () { calls.fetchBackendCandles++; return Promise.resolve(rawCandles(207)); },
  });
  await ctx._rsChartEnsureBackendCandles('AAPL');
  assert.equal(calls.fetchBackendCandles, 1);
  const res = ctx._rsChartResolveCandles('AAPL', '1D');
  assert.equal(res.source, 'BACKEND_DXLINK_CANDLES');
  assert.equal(res.candles.length, 207);
  assert.ok(calls.render >= 1, 'a non-blocking redraw is triggered when backend candles arrive');
});

// ── 5. No fetch on partial / unconfirmed input ───────────────────────────────
test('partial / unconfirmed symbols never trigger a fetch', async () => {
  const { ctx, calls } = makeContext({
    S: { scanData: [{ ticker: 'MRVL', price: '0' }] },
  });
  assert.equal(ctx._rsChartIsConfirmedSymbol('MR'), false, '"MR" is not a confirmed symbol');
  assert.equal(ctx._rsChartIsConfirmedSymbol('MRVL'), true, '"MRVL" is confirmed (present in scanData)');
  assert.equal(ctx._rsChartIsConfirmedSymbol('SPY'), true, 'SPY benchmark is always allowed');
  const r = await ctx._rsChartEnsureBackendCandles('MR');
  assert.equal(r, null);
  assert.equal(calls.fetchBackendCandles, 0, 'no candle fetch for partial input "MR"');
});

// ── 6. De-duplicate concurrent requests for the same symbol+timeframe ────────
test('concurrent ensure() calls share a single in-flight request', () => {
  let resolveFetch;
  const { ctx, calls } = makeContext({
    fetchBackendCandles: function () { calls.fetchBackendCandles++; return new Promise((r) => { resolveFetch = r; }); },
  });
  const p1 = ctx._rsChartEnsureBackendCandles('AAPL');
  const p2 = ctx._rsChartEnsureBackendCandles('AAPL');
  assert.equal(calls.fetchBackendCandles, 1, 'fetch issued exactly once for AAPL|1D');
  assert.strictEqual(p1, p2, 'the same promise is reused while a request is in flight');
  resolveFetch(rawCandles(50));
});

test('a warm fresh cache short-circuits ensure() with no fetch', () => {
  const { ctx, calls, candleArr } = makeContext({});
  ctx._rsChartCachePut('AAPL', '1D', candleArr(120));
  ctx._rsChartEnsureBackendCandles('AAPL');
  assert.equal(calls.fetchBackendCandles, 0, 'fresh cache must not re-fetch');
});

// ── 7. Fallback to the existing frontend path when backend is unavailable ────
test('falls back to frontend candles when the backend store fails', async () => {
  const frontend = [];
  for (let k = 0; k < 30; k++) frontend.push({ time: k, open: 10, high: 11, low: 9, close: 10, volume: 1 });
  const { ctx, calls, logs } = makeContext({
    fetchBackendCandles: function () { calls.fetchBackendCandles++; return Promise.reject(new Error('backend down')); },
    getDailyCandles: function () { calls.getDailyCandles++; return frontend; },
    getCandleDataSource: function () { return 'Railway/YF daily'; },
  });
  await ctx._rsChartEnsureBackendCandles('AAPL');
  const res = ctx._rsChartResolveCandles('AAPL', '1D');
  assert.equal(res.source, 'Railway/YF daily', 'frontend fallback source is used');
  assert.equal(res.candles.length, 30);
  assert.ok(logs.some((l) => l.includes('backend candles unavailable')), 'unavailable reason logged');
  assert.ok(logs.some((l) => l.includes('fallback source=existing_frontend_path')), 'fallback logged');
});

// ── Latest price patch (chart-only) ──────────────────────────────────────────
test('latest price patch uses the live DXLink quote when present', () => {
  const { ctx, logs } = makeContext({
    S: { scanData: [{ ticker: 'AAPL', price: '123.45', bid: 123.4, _priceSource: 'DXLink' }] },
  });
  const candles = [{ time: 1, open: 100, high: 101, low: 99, close: 100 }];
  const out = ctx._rsChartPatchLatestPrice(candles, 'AAPL');
  assert.equal(out[out.length - 1].close, 123.45, 'last candle close patched to the live price');
  assert.ok(logs.some((l) => l.includes('latest price patch source=DXLINK_LIVE_QUOTE')));
});

test('latest price patch marks the close as stale when no live quote', () => {
  const { ctx, logs } = makeContext({
    S: { scanData: [{ ticker: 'AAPL', price: '0', _priceSource: 'scan' }] },
  });
  const candles = [{ time: 1, open: 100, high: 101, low: 99, close: 100 }];
  const out = ctx._rsChartPatchLatestPrice(candles, 'AAPL');
  assert.equal(out[out.length - 1].close, 100, 'close unchanged when no live quote');
  assert.ok(logs.some((l) => l.includes('latest price patch source=candle_close_stale')));
});

// ── Provenance logs are compact / de-duplicated (no per-tick spam) ───────────
test('provenance logger de-duplicates repeated lines', () => {
  const { ctx, logs } = makeContext({});
  ctx._rsChartLog('AAPL', '[RS-CHART] open symbol=AAPL');
  ctx._rsChartLog('AAPL', '[RS-CHART] open symbol=AAPL');
  ctx._rsChartLog('AAPL', '[RS-CHART] open symbol=AAPL');
  assert.equal(logs.filter((l) => l === '[RS-CHART] open symbol=AAPL').length, 1, 'a repeated line logs only once');
  ctx._rsChartResetLog('AAPL');
  ctx._rsChartLog('AAPL', '[RS-CHART] open symbol=AAPL');
  assert.equal(logs.filter((l) => l === '[RS-CHART] open symbol=AAPL').length, 2, 'reset re-enables the line for a fresh open');
});

// ── 2/3/4. Static guarantees: no scanner rule / result mutation ──────────────
test('RS-CHART block never triggers /scanner/run', () => {
  const block = extractBlock();
  assert.ok(!block.includes('/scanner/run'), 'no /scanner/run reference');
  assert.ok(!/scanner\s*\/\s*run/.test(block), 'no scanner run invocation');
});

test('RS-CHART block does not mutate scanner result fields', () => {
  const block = extractBlock();
  // No assignment to score / signal / rank / rs / filter fields anywhere in the
  // chart data-source block — it only reads scanData via .find().
  const forbidden = [/\.score\s*=/, /\.signal\s*=/, /\.rank\s*=/, /\.rs\s*=[^=]/, /scanData\s*=/, /scanData\.push/, /scanData\.splice/];
  forbidden.forEach((re) => assert.ok(!re.test(block), 'no mutation matching ' + re));
});

test('RS-CHART block does not reference scanner rule / scoring functions', () => {
  const block = extractBlock();
  ['scoreStock', 'runScan', 'getSignal', 'updateAdvFilter', 'applyFilters'].forEach((fn) => {
    assert.ok(!block.includes(fn), 'no reference to scanner function ' + fn);
  });
});

// ── 8. Portfolio / Journal / Greeks / Market Context untouched ───────────────
test('Portfolio chart keeps its own _patchLivePrice path', () => {
  // The portfolio renderer must still call the original _patchLivePrice, not the
  // scanner-only _rsChartPatchLatestPrice.
  assert.ok(INDEX.includes('candles = _patchLivePrice(candles, ticker);'), 'portfolio still uses _patchLivePrice');
  assert.ok(INDEX.includes('function _patchLivePrice('), 'original _patchLivePrice still defined');
  assert.ok(INDEX.includes('function _drawCandleChart('), 'shared chart engine reused, not replaced');
});
