'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — price resolver cascade must exhaust frontend-side sources before it
// marks a ticker `underlying_price_missing`.
//
// Regression for deploy-preview-301: even after #301 suppressed the candle
// fan-out on `missing_underlyings`, resolvePortfolioLivePrice() still logged
//   [PORTFOLIO PRICE RESOLVER] missing symbol=MRVL reason=underlying_price_missing
// for MRVL / FTNT / DELL / CVS / TEAM / AMD, because its cascade never consulted
// the #301 last-known price cache and read the row's own price only via whatever
// the caller happened to pass.
//
// The resolver (invoked with allowLiveFetch:false, allowCandle:false for
// positions — no /market/live or /market/candles fan-out) now resolves, in order:
//   1. live priceMap[symbol]                         (this refresh)
//   2. backend aggregated underlyings[symbol]
//   3. row previous price  (CACHE_PREVIOUS_PRICE)    ← _portfolioRowUnderlyingPrice
//   3b. _lastKnownUnderlyingPrice cache  (LAST_KNOWN_UNDERLYING_PRICE)   ← NEW
//   4. scanData            (SCAN_DATA_FALLBACK)
//   → only then underlying_price_missing
//
// Run: node tests/portfolio-price-resolver-cascade.test.js
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
function near(a, b, msg) { assert(a != null && Math.abs(a - b) < 0.001, msg + ' (got ' + a + ', want ' + b + ')'); }

// Any call to these is a backend fan-out and must NOT happen for the position pass.
const fanout = [];
const ctx = {
  console: { log() {}, warn() {}, debug() {} },
  S: { scanData: [] },
  isFinite, parseFloat, Math, String, Date, Object, Array, encodeURIComponent,
  BACKEND: 'https://backend.test',
  _backendAuthHeaders() { return {}; },
  AbortSignal: { timeout() { return undefined; } },
  fetch(url) { fanout.push('fetch:' + url); return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
  ttCall(url) { fanout.push('ttCall:' + url); return Promise.resolve({}); },
  fetchCandles(sym) { fanout.push('candle:' + sym); return Promise.resolve([]); },
};
vm.createContext(ctx);
vm.runInContext([
  extractFn(HTML, '_scanDataField'),
  extractFn(HTML, '_portfolioRowUnderlyingPrice'),
  extractFn(HTML, 'resolvePortfolioLivePrice'),
].join('\n'), ctx);

// Position-pass options: exactly how refreshPositionsLive() calls the resolver.
const POS = { allowLiveFetch: false, allowCandle: false, ttConnected: false };
const AGG_MISSING = { ok: true };   // ok:true, no underlyings map → the deploy-preview-301 state

function run() {
  // ── 1. _portfolioRowUnderlyingPrice reads every row price shape ─────────────
  (function() {
    near(ctx._portfolioRowUnderlyingPrice({ underlyingPrice: 75.5 }), 75.5, '1: reads camelCase underlyingPrice');
    near(ctx._portfolioRowUnderlyingPrice({ underlying_price: '92.1' }), 92.1, '1: reads snake_case underlying_price (string)');
    near(ctx._portfolioRowUnderlyingPrice({ live: { underlyingPrice: 133.4 } }), 133.4, '1: reads nested live.underlyingPrice');
    assert(ctx._portfolioRowUnderlyingPrice({ underlyingPrice: 0 }) === null, '1: ignores non-positive price');
    assert(ctx._portfolioRowUnderlyingPrice({ underlyingPrice: 'x' }) === null, '1: ignores non-numeric price');
    assert(ctx._portfolioRowUnderlyingPrice({}) === null, '1: null when the row carries no price');
    console.log('✓ 1 _portfolioRowUnderlyingPrice reads camelCase / snake_case / nested row prices');
  })();

  return Promise.resolve()
  // ── 2. aggregated underlyings win when present ──────────────────────────────
  .then(function() {
    return ctx.resolvePortfolioLivePrice('MRVL', {}, { ok: true, underlyings: { MRVL: { price: 75.5 } } }, POS)
      .then(function(r) {
        assert(r.source === 'BACKEND_PORTFOLIO_REFRESH' && r.reason == null, '2: aggregated underlyings resolve first');
        near(r.price, 75.5, '2: aggregated price');
        console.log('✓ 2 aggregated underlyings[ticker] resolves (backend price used)');
      });
  })
  // ── 3. missing_underlyings + row price → row price, NOT missing ─────────────
  .then(function() {
    return ctx.resolvePortfolioLivePrice('FTNT', {}, AGG_MISSING, Object.assign({ previousPrice: 92.1 }, POS))
      .then(function(r) {
        assert(r.reason == null, '3: not marked underlying_price_missing when row price exists');
        assert(r.source === 'CACHE_PREVIOUS_PRICE', '3: resolved from the row/previous price');
        near(r.price, 92.1, '3: row price returned');
        console.log('✓ 3 missing underlyings but row price present → resolver returns it (no missing)');
      });
  })
  // ── 4. missing_underlyings + no row price + last-known cache → last-known ───
  .then(function() {
    // Cache-ENTRY shape { price, at } (as _lastKnownUnderlyingPrice stores).
    return ctx.resolvePortfolioLivePrice('DELL', {}, AGG_MISSING, Object.assign({ lastKnownPrice: { price: 133.4, at: 1 } }, POS))
      .then(function(r) {
        assert(r.reason == null, '4: not marked missing when _lastKnownUnderlyingPrice has a price');
        assert(r.source === 'LAST_KNOWN_UNDERLYING_PRICE', '4: resolved from the #301 last-known cache');
        near(r.price, 133.4, '4: last-known price returned');
        console.log('✓ 4 missing underlyings + no row price → _lastKnownUnderlyingPrice used');
      });
  })
  // ── 4b. last-known accepts a bare number too ───────────────────────────────
  .then(function() {
    return ctx.resolvePortfolioLivePrice('DELL', {}, AGG_MISSING, Object.assign({ lastKnownPrice: 133.4 }, POS))
      .then(function(r) {
        assert(r.source === 'LAST_KNOWN_UNDERLYING_PRICE', '4b: bare-number last-known also resolves');
        near(r.price, 133.4, '4b: bare-number last-known price');
        console.log('✓ 4b last-known cache accepts a bare number as well as { price, at }');
      });
  })
  // ── 5. row price is preferred over last-known (cascade order) ───────────────
  .then(function() {
    return ctx.resolvePortfolioLivePrice('AMD', {}, AGG_MISSING, Object.assign({ previousPrice: 210.0, lastKnownPrice: { price: 199.9 } }, POS))
      .then(function(r) {
        assert(r.source === 'CACHE_PREVIOUS_PRICE', '5: row/previous price beats last-known cache');
        near(r.price, 210.0, '5: row price wins');
        console.log('✓ 5 cascade order: row price preferred over last-known cache');
      });
  })
  // ── 6. scanner cache used only when row + last-known absent ─────────────────
  .then(function() {
    ctx.S.scanData = [{ ticker: 'CVS', price: '58.2' }];
    return ctx.resolvePortfolioLivePrice('CVS', {}, AGG_MISSING, POS)
      .then(function(r) {
        ctx.S.scanData = [];
        assert(r.source === 'SCAN_DATA_FALLBACK', '6: scanner/market cache used after row + last-known');
        near(r.price, 58.2, '6: scanData price');
        console.log('✓ 6 scanner cache (scanData) resolves when row + last-known absent');
      });
  })
  // ── 7. underlying_price_missing ONLY when every source is absent ────────────
  .then(function() {
    return ctx.resolvePortfolioLivePrice('TEAM', {}, AGG_MISSING, POS)
      .then(function(r) {
        assert(r.price === null && r.reason === 'underlying_price_missing',
          '7: underlying_price_missing emitted only when priceMap/aggregated/row/last-known/scanData all absent');
        console.log('✓ 7 underlying_price_missing only when ALL frontend sources are absent');
      });
  })
  // ── 8. NO candle / live fan-out across the whole cascade ───────────────────
  .then(function() {
    assert(fanout.length === 0,
      '8: zero backend fan-out (no /market/candles, /market/live, /market/quotes, ttCall) — got ' + JSON.stringify(fanout));
    console.log('✓ 8 no per-symbol candle/live/quote fan-out triggered by the resolver cascade');
  })
  // ── 9. static wiring — refreshPositionsLive feeds the new sources ──────────
  .then(function() {
    const fn = extractFn(HTML, 'refreshPositionsLive');
    assert(/var oldP = _portfolioRowUnderlyingPrice\(_p\);/.test(fn),
      '9: position pass reads the row price via _portfolioRowUnderlyingPrice');
    assert(/lastKnownPrice: _lkEntry/.test(fn) && /_lastKnownUnderlyingPrice\[_p\.ticker\]/.test(fn),
      '9: position pass passes the _lastKnownUnderlyingPrice cache entry into the resolver');
    assert(/allowLiveFetch: false, allowCandle: false/.test(fn),
      '9: position pass keeps allowLiveFetch:false + allowCandle:false (no fan-out)');
    const res = extractFn(HTML, 'resolvePortfolioLivePrice');
    assert(/LAST_KNOWN_UNDERLYING_PRICE/.test(res) && /opts\.lastKnownPrice/.test(res),
      '9: resolver cascade consults opts.lastKnownPrice → LAST_KNOWN_UNDERLYING_PRICE');
    console.log('✓ 9 refreshPositionsLive wires row price + last-known cache into the resolver');
  });
}

run().then(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}).catch(function(e) { console.error(e); process.exit(1); });
