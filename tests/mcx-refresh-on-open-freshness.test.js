#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Market Context — refresh-on-open freshness guards (stale VIX/SPY fix).
//
// Proves the dashboard always renders the freshest available VIX + SPY data and
// never lets an OLDER cached/backend value overwrite a NEWER one already loaded.
//
// Tests:
//   1. Opening Market Context / Dashboard triggers a forced VIX + SPY refresh.
//   2. Fresh values replace stale cached values (VIX family + SPY 1D candles).
//   3. Older cached values cannot overwrite newer refreshed values (both guards).
//   4. SMA20 Rising Defense Rule uses the refreshed SPY 1D data (not stale candles).
//   5. VIX regime rules use the refreshed VIX value (not an old cached value).
//   6. Missing / failing refresh does not crash the dashboard.
//   7. No duplicate refresh loops / timers are created on repeated dashboard opens.
//
// index.html is a single monolithic file; these tests extract the REAL helpers
// from source (no copies — they cannot drift) and run them in a vm sandbox.
//
// Run: node tests/mcx-refresh-on-open-freshness.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failures.push(name); console.log('  FAIL ' + name); }
}
function section(t) { console.log('\n' + t); }

// Extract a top-level function (async or sync) by brace-matching, skipping
// braces inside strings / template literals / comments.
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

// Build a sandbox holding the real freshness-guard helpers + their dependencies.
function makeSandbox(extra) {
  const sandbox = Object.assign({
    console: { log: function () {}, warn: function () {} },
    Date, Math, JSON, isFinite, isNaN, parseFloat, parseInt,
    Object, Array, Number,
    S: { vixFamily: null },
    _mcxBackendCandleCache: {},
    _MCX_BACKEND_CACHE_TTL: 600000, // large → never stale within a test
    ffBackendCandlesMcxCharts: function () { return true; },
    getDailyCandles: function () { return null; }, // backend cache is the source under test
  }, extra || {});
  vm.createContext(sandbox);
  const code = [
    extractFn(SRC, '_vixFamilyTimestampMs'),
    extractFn(SRC, '_vixFamilyHasAnyValue'),
    extractFn(SRC, '_applyFreshVixFamily'),
    extractFn(SRC, '_mcxNewestBarTime'),
    extractFn(SRC, '_mcxStoreBackendCandleEntry'),
    extractFn(SRC, '_mcxGetBackendCandleEntry'),
    extractFn(SRC, '_mcxGetCachedBackendCandles'),
    extractFn(SRC, 'smA'),
    extractFn(SRC, '_mcxSpy1dSma20Rising'),
    extractFn(SRC, '_mcxRegimeOf'),
  ].join('\n\n');
  vm.runInContext(code, sandbox);
  return sandbox;
}

// Daily candles with strictly increasing closes (→ rising SMA20) and increasing
// times. baseTime lets us make one series "newer" than another by bar time.
function risingCandles(n, baseTime) {
  baseTime = baseTime || 1700000000000;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ time: baseTime + i * 86400000, close: 400 + i });
  return out;
}
function fallingCandles(n, baseTime) {
  baseTime = baseTime || 1700000000000;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ time: baseTime + i * 86400000, close: 500 - i });
  return out;
}

console.log('MCX refresh-on-open freshness guards - tests');

// ── 1. Open triggers a forced VIX + SPY refresh (static wiring) ──────────────
section('1. Opening Market Context / Dashboard triggers a fresh VIX + SPY refresh');
{
  const initBody = extractFn(SRC, '_mcxInit');
  check('1: _mcxInit forces a real VIX-family refresh on open (refreshSharedMarketRegime force:true)',
    /refreshSharedMarketRegime\(\s*['"]mcx_open['"]\s*,\s*\{\s*force:\s*true\s*\}\s*\)/.test(initBody));
  check('1: _mcxInit forces a fresh SPY/candle render on open (_mcxRenderCharts forceRefresh:true)',
    /_mcxRenderCharts\(\s*\{\s*forceRefresh:\s*true[^}]*\}\s*\)/.test(initBody));

  const showBody = extractFn(SRC, 'showView');
  check('1: showView forces a VIX-family refresh on Dashboard open',
    /name\s*===\s*['"]dashboard['"]\s*\)\s*refreshSharedMarketRegime\(\s*['"]dashboard_open['"]\s*,\s*\{\s*force:\s*true\s*\}\s*\)/.test(showBody));

  // The forced path must actually re-fetch (not just reuse the cached S.vixFamily).
  const sharedBody = extractFn(SRC, 'refreshSharedMarketRegime');
  // Backend-first: the forced re-fetch now goes through _fetchVixFamilyBackendFirst()
  // (GET /market-context/vix-family/live, with fetchVixFamily as a bounded fallback).
  check('1: forced refresh re-fetches VIX via _fetchVixFamilyBackendFirst (bypasses cached reuse)',
    sharedBody.includes('_fetchVixFamilyBackendFirst('));
  check('1: forced refresh repaints the regime UI after the fetch (_regimeRefresh)',
    sharedBody.includes('_regimeRefresh'));
}

// ── 2. Fresh values replace stale cached values ─────────────────────────────
section('2. Fresh values replace stale cached values');
{
  // VIX: a newer timestamp replaces the stale value.
  const sb = makeSandbox();
  sb.S.vixFamily = { vix: 14.0, timestamp: '2026-06-19T14:00:00.000Z', source: 'BACKEND_SNAPSHOT' };
  const applied = sb._applyFreshVixFamily({ vix: 22.5, timestamp: '2026-06-19T15:00:00.000Z', source: 'DXLink' });
  check('2: newer VIX is applied (returns true)', applied === true);
  check('2: S.vixFamily now holds the fresh VIX value', sb.S.vixFamily.vix === 22.5);
  check('2: S.vixFamily source updated to the fresh source', sb.S.vixFamily.source === 'DXLink');

  // SPY 1D: a newer-bar candle set replaces the stale cache.
  sb._mcxBackendCandleCache['SPY'] = { candles1d: risingCandles(25, 1700000000000), candles4h: [], source: 'OLD', fetchedAt: Date.now() };
  const fresh = { candles1d: risingCandles(25, 1700000000000 + 5 * 86400000), candles4h: [], source: 'FRESH', fetchedAt: Date.now() };
  const stored = sb._mcxStoreBackendCandleEntry('SPY', fresh);
  check('2: newer SPY 1D candles replace the cached entry', stored === fresh && sb._mcxBackendCandleCache['SPY'].source === 'FRESH');
  check('2: cached newest bar advanced to the fresh series',
    sb._mcxNewestBarTime(sb._mcxBackendCandleCache['SPY'].candles1d) === 1700000000000 + 29 * 86400000);
}

// ── 3. Older cached values cannot overwrite newer refreshed values ──────────
section('3. Older cached values cannot overwrite newer refreshed values');
{
  // VIX: an OLDER incoming timestamp must NOT overwrite the newer cached value.
  const sb = makeSandbox();
  sb.S.vixFamily = { vix: 22.5, timestamp: '2026-06-19T15:00:00.000Z', source: 'DXLink' };
  const applied = sb._applyFreshVixFamily({ vix: 14.0, timestamp: '2026-06-19T14:00:00.000Z', source: 'BACKEND_SNAPSHOT' });
  check('3: stale (older) VIX is rejected (returns false)', applied === false);
  check('3: S.vixFamily keeps the newer VIX value', sb.S.vixFamily.vix === 22.5);
  check('3: S.vixFamily keeps the newer source', sb.S.vixFamily.source === 'DXLink');

  // Equal timestamp still applies (latest wins; not a stale-overwrite).
  const eq = sb._applyFreshVixFamily({ vix: 23.1, timestamp: '2026-06-19T15:00:00.000Z', source: 'DXLink' });
  check('3: equal-timestamp VIX is applied (not treated as stale)', eq === true && sb.S.vixFamily.vix === 23.1);

  // Missing timestamps cannot prove staleness → applied (preserves legacy behaviour).
  sb.S.vixFamily = { vix: 22.5, source: 'DXLink' }; // no timestamp
  const noTs = sb._applyFreshVixFamily({ vix: 12.0, source: 'BACKEND_SNAPSHOT' });
  check('3: when staleness cannot be proven (no timestamps) the value is applied', noTs === true && sb.S.vixFamily.vix === 12.0);

  // SPY 1D: an OLDER-bar candle set must NOT overwrite the newer cache.
  const newer = { candles1d: risingCandles(25, 1700000000000 + 5 * 86400000), candles4h: [], source: 'NEWER', fetchedAt: Date.now() };
  sb._mcxBackendCandleCache['SPY'] = newer;
  const older = { candles1d: risingCandles(25, 1700000000000), candles4h: [], source: 'OLDER', fetchedAt: Date.now() + 1000 };
  const stored = sb._mcxStoreBackendCandleEntry('SPY', older);
  check('3: stale (older-bar) SPY 1D candles are rejected', stored === newer && sb._mcxBackendCandleCache['SPY'].source === 'NEWER');
  check('3: cache still exposes the newer SPY 1D series',
    sb._mcxNewestBarTime(sb._mcxBackendCandleCache['SPY'].candles1d) === 1700000000000 + 29 * 86400000);
  check('3: guard refreshes fetchedAt so TTL does not immediately re-warm the kept entry',
    sb._mcxBackendCandleCache['SPY'].fetchedAt === older.fetchedAt);
}

// ── 4. SMA20 Rising Defense Rule uses the refreshed SPY 1D data ─────────────
section('4. SMA20 Rising Defense Rule uses the refreshed SPY 1D data');
{
  const sb = makeSandbox();
  // Stale cache: FALLING SMA20 → rule would be inactive.
  sb._mcxStoreBackendCandleEntry('SPY', { candles1d: fallingCandles(40, 1700000000000), candles4h: [], source: 'STALE', fetchedAt: Date.now() });
  const before = sb._mcxSpy1dSma20Rising();
  check('4: stale SPY 1D (falling SMA20) → rule sees NOT rising', !!before && before.rising === false);

  // Refresh with newer SPY 1D whose SMA20 is rising.
  sb._mcxStoreBackendCandleEntry('SPY', { candles1d: risingCandles(40, 1700000000000 + 50 * 86400000), candles4h: [], source: 'FRESH', fetchedAt: Date.now() });
  const after = sb._mcxSpy1dSma20Rising();
  check('4: refreshed SPY 1D (rising SMA20) → rule reads the fresh data (rising=true)', !!after && after.rising === true);

  // A late stale candle set must not flip the rule back.
  sb._mcxStoreBackendCandleEntry('SPY', { candles1d: fallingCandles(40, 1700000000000), candles4h: [], source: 'LATE_STALE', fetchedAt: Date.now() });
  const guarded = sb._mcxSpy1dSma20Rising();
  check('4: a late OLDER candle set cannot revert the rule to stale data (still rising)', !!guarded && guarded.rising === true);
}

// ── 5. VIX regime rules use the refreshed VIX value ─────────────────────────
section('5. VIX regime rules use the refreshed VIX value');
{
  const sb = makeSandbox();
  sb.S.vixFamily = { vix: 12.0, timestamp: '2026-06-19T14:00:00.000Z', source: 'CACHE' }; // LOW
  check('5: stale cached VIX maps to LOW regime', sb._mcxRegimeOf(sb.S.vixFamily.vix) === 'LOW');

  // Fresh VIX arrives (MID regime) → regime computed from the refreshed value.
  sb._applyFreshVixFamily({ vix: 24.0, timestamp: '2026-06-19T15:00:00.000Z', source: 'DXLink' });
  check('5: refreshed VIX value is stored', sb.S.vixFamily.vix === 24.0);
  check('5: regime rule uses the refreshed VIX (MID), not the stale LOW value',
    sb._mcxRegimeOf(sb.S.vixFamily.vix) === 'MID');

  // _regimeRefresh reads S.vixFamily.vix (source wiring) — guards against drift.
  const refreshBody = extractFn(SRC, '_regimeRefresh');
  check('5: _regimeRefresh derives the regime from S.vixFamily.vix',
    refreshBody.includes('S.vixFamily') && refreshBody.includes('_mcxRegimeOf'));
}

// ── 6. Missing / failing refresh does not crash the dashboard ───────────────
section('6. Missing / failing refresh does not crash the dashboard');
{
  const sb = makeSandbox();
  let threw = false;
  try {
    check('6: _applyFreshVixFamily(null) returns false without throwing', sb._applyFreshVixFamily(null) === false);
    check('6: _applyFreshVixFamily(undefined) returns false', sb._applyFreshVixFamily(undefined) === false);
    // Storing a null entry must not throw and must not corrupt the cache read path.
    sb._mcxStoreBackendCandleEntry('SPY', null);
    check('6: _mcxNewestBarTime tolerates null / empty candle arrays',
      sb._mcxNewestBarTime(null) === null && sb._mcxNewestBarTime([]) === null);
    // No candle data at all → rule returns null (caller fails silently), no throw.
    sb._mcxBackendCandleCache = {};
    check('6: SMA20 rule returns null when no SPY data is available', sb._mcxSpy1dSma20Rising() === null);
  } catch (e) { threw = true; }
  check('6: freshness guards never throw on missing / failing refresh inputs', threw === false);
}

// ── 7. No duplicate refresh loops / timers on repeated opens ────────────────
section('7. No duplicate refresh loops / timers are created on repeated dashboard opens');
{
  // Single-flight + idempotent-timer guards must all be present in source.
  check('7: dashboard regime timer starts by first clearing any prior timer (no stacking)',
    extractFn(SRC, '_startDashboardRegimeRefresh').includes('_stopDashboardRegimeRefresh()'));
  check('7: dashboard refresh has a single-flight pending guard',
    extractFn(SRC, '_startDashboardRegimeRefresh').includes('_dashboardRegimeRefreshPending'));
  check('7: MCX auto-refresh clears any prior interval before re-arming',
    extractFn(SRC, '_mcxStartAutoRefresh').includes('_mcxStopAutoRefresh()'));
  check('7: MCX refresh is single-flight (_mcxRefreshBusy guard)',
    extractFn(SRC, '_mcxRefresh').includes('_mcxRefreshBusy'));
  check('7: forced VIX refresh dedupes a concurrent in-flight fetch (_vixFamilyPending)',
    extractFn(SRC, 'refreshSharedMarketRegime').includes('_vixFamilyPending'));

  // Per-symbol in-flight guard coalesces overlapping backend candle fetches.
  const renderBody = extractFn(SRC, '_mcxRenderCharts');
  check('7: _mcxRenderCharts coalesces overlapping backend candle fetches (_mcxBackendFetchInFlight)',
    renderBody.includes('_mcxBackendFetchInFlight'));
  check('7: showView toggles the dashboard timer off when leaving the dashboard (no orphan loop)',
    extractFn(SRC, 'showView').includes('_stopDashboardRegimeRefresh'));

  // Freshness guards introduce NO new fetch / socket / timer of their own.
  const guardRegion = extractFn(SRC, '_applyFreshVixFamily') + '\n' +
                      extractFn(SRC, '_mcxStoreBackendCandleEntry') + '\n' +
                      extractFn(SRC, '_mcxNewestBarTime') + '\n' +
                      extractFn(SRC, '_vixFamilyTimestampMs');
  check('7: freshness guards open no new fetch', !guardRegion.includes('fetch('));
  check('7: freshness guards open no new WebSocket', !guardRegion.includes('new WebSocket'));
  check('7: freshness guards start no new timer', !/set(Interval|Timeout)\(/.test(guardRegion));
}

// ── summary ──────────────────────────────────────────────────────────────────
console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('ALL TESTS PASSED');
