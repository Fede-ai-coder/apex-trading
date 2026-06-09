'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Market Scanner — symbol lookup row + search visibility.
//
// Tests prove:
//   1. feature flag gating: lookup row only when FF_BACKEND_CANDLES_SCANNER_CHARTS is ON
//      (in dev-clean the flag delegates to ffPreferBackendCandlesForCharts, default ON)
//   2. searchTicker shows lookup row for a ticker-like query not in S.scanData (flag ON)
//   3. searchTicker shows no lookup row when flag is explicitly OFF
//   4. searchTicker shows lookup row even when S.scanData is empty (no scan run)
//   5. searchTicker shows lookup row when symbol not in scanner results
//   6. searchTicker shows NO lookup row when exact symbol IS in scanner results
//   7. searchTicker collapses #bdsp-control while query is active
//   8. searchTicker restores #bdsp-control when query is cleared
//   9. openChartForSymbolLookup is a function present in source
//  10. openChartForSymbolLookup uses _scannerFetchBackendCandlesForChart
//  11. openChartForSymbolLookup is gated behind ffBackendCandlesScannerCharts
//  12. no backend URL hardcoded in openChartForSymbolLookup
//  13. no API key hardcoded in openChartForSymbolLookup
//  14. no Yahoo reference in openChartForSymbolLookup
//  15. lookup row markup contains openChartForSymbolLookup call (clicking opens correct path)
//
// Run: node tests/scanner-symbol-lookup.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── shared helpers ─────────────────────────────────────────────────────────

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

function stripComments(src) {
  let out = '', inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = 0; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      out += c;
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

// ── harness ────────────────────────────────────────────────────────────────

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── build sandbox with minimal DOM ─────────────────────────────────────────

function makeDom() {
  const elements = {};
  function makeEl(id) {
    return {
      _id: id, innerHTML: '', textContent: '', style: { display: '' },
      querySelector: function() { return null; },
      scrollIntoView: function() {},
    };
  }
  return {
    getElementById: function(id) {
      if (!elements[id]) elements[id] = makeEl(id);
      return elements[id];
    },
    _elements: elements,
  };
}

// Loads flag functions + searchTicker into a fresh sandbox.
// opts.flagOn:  true  → apex_ff_backend_candles_scanner_charts = '1'
// opts.flagOn:  false → apex_ff_backend_candles_scanner_charts = '0'  (explicit OFF)
// opts.flagOn:  undefined → no per-surface key (uses global default, which is ON in dev-clean)
function buildSandbox(opts) {
  opts = opts || {};
  const mockLS = {};
  const dom = makeDom();
  const S = { scanData: opts.scanData || [], sortKey: 'score', sortDir: -1, activeFilter: 'all' };

  const sandbox = {
    console,
    Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    Promise, Object, Array,
    _backendAuthHeaders: (extra) => Object.assign({ 'X-Test': '1' }, extra || {}),
    _recordCandleSubscriptionRequest: () => {},
    _apexParityNormCandleArray: function(arr) { return arr || []; },
    _apexParityNormCandle: function(c) { return c; },
    _apexParityNormTime: function(t) { return typeof t === 'string' ? new Date(t).getTime() : t; },
    _apexParityExtractBackendCandles: function(j) { return (j && j.candles) ? j.candles : []; },
    fetch: opts.fetch || null,
    S: S,
    localStorage: {
      getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
      setItem:    (k, v) => { mockLS[k] = v; },
      removeItem: (k) => { delete mockLS[k]; },
    },
    document: dom,
    // stubs for functions called by searchTicker / openChartForSymbolLookup
    renderScanResults: function() {
      if (dom._elements.scanResults) dom._elements.scanResults.innerHTML = '__renderScanResults__';
    },
    scannerIvrTag:   function() { return ''; },
    scannerIvrColor: function() { return 'var(--tx3)'; },
    scannerIvrValue: function() { return '—'; },
    showDetail:              function() {},
    openScannerChart:        function() {},
    openChartForSymbolLookup: function() {},
  };

  vm.createContext(sandbox);

  // Load both flag functions: ffBackendCandlesScannerCharts delegates to
  // ffPreferBackendCandlesForCharts in dev-clean, so both must be present.
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts'),
    sandbox
  );
  vm.runInContext(extractFn(HTML, 'searchTicker'), sandbox);

  // Apply the requested flag state
  if (opts.flagOn === true) {
    sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
  } else if (opts.flagOn === false) {
    // Explicit per-surface OFF (overrides global default)
    sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '0');
  }
  // opts.flagOn === undefined → no per-surface key, global default applies (ON in dev-clean)

  return { sandbox, dom, mockLS, S };
}

(async () => {

// ── 1. feature flag ON by default (delegates to global policy, default ON) ─
section('1. ffBackendCandlesScannerCharts default ON in dev-clean (global policy default)');
{
  const { sandbox } = buildSandbox();
  ok(sandbox.ffBackendCandlesScannerCharts() === true,
    '1: flag returns true by default (global policy ffPreferBackendCandlesForCharts is ON)');
  // Explicitly disabling the per-surface key turns it OFF
  sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '0');
  ok(sandbox.ffBackendCandlesScannerCharts() === false,
    '1: flag returns false when per-surface key is "0"');
  // Explicitly enabling overrides even if global were OFF
  sandbox.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
  ok(sandbox.ffBackendCandlesScannerCharts() === true,
    '1: flag returns true when per-surface key is "1"');
}

// ── 2. lookup row appears when flag ON and symbol not in S.scanData ─────────
section('2. lookup row shown when flag=ON, query ticker-like, symbol not in scanData');
{
  const { sandbox, dom } = buildSandbox({ scanData: [], flagOn: true });
  sandbox.searchTicker('SPY');
  const html = dom._elements.scanResults.innerHTML;
  ok(/sl-lookup-row/.test(html),                   '2: lookup row class present in output');
  ok(/openChartForSymbolLookup/.test(html),         '2: lookup row calls openChartForSymbolLookup');
  ok(/backend candle store/i.test(html),            '2: "backend candle store" label present');
  ok(/SPY/.test(html),                              '2: symbol name present in output');
}

// ── 3. no lookup row when flag is explicitly OFF ────────────────────────────
section('3. no lookup row when flag explicitly OFF (per-surface key "0")');
{
  const { sandbox, dom } = buildSandbox({ scanData: [], flagOn: false });
  sandbox.searchTicker('SPY');
  const html = dom._elements.scanResults.innerHTML;
  ok(!/sl-lookup-row/.test(html),                   '3: no lookup row when flag explicitly OFF');
  ok(!/openChartForSymbolLookup/.test(html),         '3: no openChartForSymbolLookup call when flag OFF');
}

// ── 4. lookup row when S.scanData is empty (no scan run yet) ────────────────
section('4. lookup row shown even when S.scanData is empty (no scan run)');
{
  const { sandbox, dom } = buildSandbox({ scanData: [], flagOn: true });
  sandbox.searchTicker('AAPL');
  const html = dom._elements.scanResults.innerHTML;
  ok(/sl-lookup-row/.test(html),                   '4: lookup row shown with empty scanData');
  ok(/AAPL/.test(html),                            '4: symbol in lookup row output');
}

// ── 5. lookup row shown alongside scanner results when symbol not in them ──
section('5. lookup row appended when exact symbol not in scanner results');
{
  const scanData = [
    { ticker:'MSFT', name:'Microsoft', price:'420.00', score:72, signal:'STRONG BUY', rsi:60,
      change:'+1.2%', squeeze:'OFF', squeezeFired:false, nextEarnings:null, hvRank:55, ma200dist:5 },
  ];
  const { sandbox, dom } = buildSandbox({ scanData, flagOn: true });
  sandbox.searchTicker('SPY');
  const html = dom._elements.scanResults.innerHTML;
  ok(/sl-lookup-row/.test(html),                   '5: lookup row shown when no scanner match');
  ok(/openChartForSymbolLookup/.test(html),         '5: openChartForSymbolLookup call in lookup row');
}

// ── 6. NO lookup row when exact symbol IS in scanner results ────────────────
section('6. no lookup row when exact symbol already in scanner results');
{
  const scanData = [
    { ticker:'SPY', name:'S&P 500 ETF', price:'580.00', score:65, signal:'MODERATE BUY', rsi:55,
      change:'+0.5%', squeeze:'OFF', squeezeFired:false, nextEarnings:null, hvRank:40, ma200dist:3 },
  ];
  const { sandbox, dom } = buildSandbox({ scanData, flagOn: true });
  sandbox.searchTicker('SPY');
  const html = dom._elements.scanResults.innerHTML;
  ok(!/sl-lookup-row/.test(html),                  '6: no lookup row when symbol already in results');
  ok(/SPY/.test(html),                             '6: scanner row for SPY is present');
}

// ── 7. searchTicker hides #bdsp-control when query is active ───────────────
section('7. searchTicker hides #bdsp-control while query is active');
{
  // BDSP hiding is unconditional — happens regardless of flag state
  const { sandbox, dom } = buildSandbox({ scanData: [] });
  dom._elements['bdsp-control'] = { style: { display: '' } };
  sandbox.searchTicker('SPY');
  ok(dom._elements['bdsp-control'].style.display === 'none',
    '7: bdsp-control hidden during active search');
}

// ── 8. searchTicker restores #bdsp-control on empty query ──────────────────
section('8. searchTicker restores #bdsp-control when query cleared');
{
  const { sandbox, dom } = buildSandbox({ scanData: [] });
  dom._elements['bdsp-control'] = { style: { display: 'none' } };
  sandbox.searchTicker('');
  ok(dom._elements['bdsp-control'].style.display === '',
    '8: bdsp-control display restored to "" on empty query');
}

// ── 9. openChartForSymbolLookup exists in source ───────────────────────────
section('9. openChartForSymbolLookup function exists in index.html');
{
  let fnSrc;
  try { fnSrc = extractFn(HTML, 'openChartForSymbolLookup'); } catch(e) { fnSrc = null; }
  ok(fnSrc !== null, '9: openChartForSymbolLookup extracted from source');
  ok(/async function openChartForSymbolLookup/.test(fnSrc || ''),
    '9: function is declared async');
}

// ── 10. openChartForSymbolLookup uses _scannerFetchBackendCandlesForChart ───
section('10. openChartForSymbolLookup uses _scannerFetchBackendCandlesForChart');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(/_scannerFetchBackendCandlesForChart/.test(src),
    '10: calls _scannerFetchBackendCandlesForChart');
  ok(/_schartDrawTf/.test(src),
    '10: calls _schartDrawTf to render the chart');
}

// ── 11. openChartForSymbolLookup gated behind ffBackendCandlesScannerCharts ─
section('11. openChartForSymbolLookup gated behind ffBackendCandlesScannerCharts');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(/ffBackendCandlesScannerCharts/.test(src),
    '11: flag check present in openChartForSymbolLookup');
  const flagIdx  = src.indexOf('ffBackendCandlesScannerCharts');
  const fetchIdx = src.indexOf('_scannerFetchBackendCandlesForChart');
  ok(flagIdx >= 0 && fetchIdx >= 0 && flagIdx < fetchIdx,
    '11: flag guard precedes the fetch call');
}

// ── 12. no hardcoded backend URL in openChartForSymbolLookup ───────────────
section('12. no hardcoded backend URL in openChartForSymbolLookup');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(!/https?:\/\//.test(src),
    '12: no hardcoded http/https URL in openChartForSymbolLookup');
}

// ── 13. no hardcoded API key in openChartForSymbolLookup ───────────────────
section('13. no hardcoded API key in openChartForSymbolLookup');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(!/api[_-]?key\s*[:=]\s*['"]/i.test(src),
    '13: no hardcoded API key string');
  ok(!/Authorization\s*:\s*['"](Bearer|Token)\s+[A-Za-z0-9]/i.test(src),
    '13: no hardcoded Authorization header value');
}

// ── 14. no Yahoo reference in openChartForSymbolLookup ─────────────────────
section('14. no Yahoo reference in openChartForSymbolLookup');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(!/yahoo/i.test(src), '14: no Yahoo reference in openChartForSymbolLookup');
}

// ── 15. lookup row HTML button calls openChartForSymbolLookup ───────────────
section('15. lookup row HTML button calls openChartForSymbolLookup');
{
  const src = extractFn(HTML, 'searchTicker');
  ok(/openChartForSymbolLookup/.test(src),
    '15: searchTicker source references openChartForSymbolLookup in lookup row button');
  const stripped = stripComments(src);
  ok(/onclick[^>]*openChartForSymbolLookup/.test(stripped),
    '15: openChartForSymbolLookup is in an onclick attribute (not just a comment)');
}

// ── 16. price resolution: source code uses three-tier fallback ─────────────
section('16. openChartForSymbolLookup price resolution — three-tier fallback');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  // Tier 1: scanData path
  ok(/resolveLatestDisplayPrice/.test(src),
    '16: tier-1 resolveLatestDisplayPrice call present');
  // Tier 2: live RTH mark via fetchLiveQuote, gated by isRTHOpen
  ok(/fetchLiveQuote/.test(src),
    '16: tier-2 fetchLiveQuote call present for symbol not in scanData');
  ok(/isRTHOpen/.test(src),
    '16: isRTHOpen RTH gate present — live mark only during regular session');
  // Tier 3: last close from backend candles
  ok(/candles1d\[/.test(src) || /candles1d\.length/.test(src),
    '16: tier-3 falls back to last candle close from already-fetched 1D series');
  // Tier 2 guard must come after the scanData tier (livePrice == null check)
  const tier1Idx = src.indexOf('resolveLatestDisplayPrice');
  const tier2Idx = src.indexOf('fetchLiveQuote');
  ok(tier1Idx >= 0 && tier2Idx >= 0 && tier1Idx < tier2Idx,
    '16: tier-2 (fetchLiveQuote) is positioned after tier-1 (resolveLatestDisplayPrice)');
  // Tier 2 must be guarded by RTH check (no AH/PM marks)
  const rthIdx   = src.indexOf('isRTHOpen');
  ok(rthIdx >= 0 && rthIdx < tier2Idx,
    '16: isRTHOpen guard precedes fetchLiveQuote call');
}

// ── 17. no Yahoo in the price-resolution path ──────────────────────────────
section('17. price resolution introduces no Yahoo reference');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(!/yahoo/i.test(src), '17: no Yahoo reference in updated openChartForSymbolLookup');
}

// ── 18. no hardcoded URL or key in the price-resolution path ───────────────
section('18. price resolution introduces no hardcoded URL or API key');
{
  const src = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(!/https?:\/\//.test(src),
    '18: no hardcoded http/https URL in openChartForSymbolLookup after price fix');
  ok(!/api[_-]?key\s*[:=]\s*['"]/i.test(src),
    '18: no hardcoded API key string after price fix');
}

// ── 19. no new WebSocket in price resolution ───────────────────────────────
section('19. price resolution opens no new WebSocket');
{
  const src = extractFn(HTML, 'openChartForSymbolLookup');
  ok(!/new WebSocket/.test(src),
    '19: openChartForSymbolLookup opens no WebSocket');
}

// ── 20. functional: live mark used when RTH open and fetchLiveQuote returns price
section('20. functional: live mark patched when RTH open and fetchLiveQuote resolves');
{
  // Build a sandbox that can run openChartForSymbolLookup end-to-end.
  const dom = makeDom();
  const mockLS = {};
  const S = { scanData: [], sortKey: 'score', sortDir: -1, activeFilter: 'all' };
  const calls = { fetchLiveQuote: [], schartDrawTf: [] };

  // Backend candle response: 25 bars, last close = 450.00
  function bars(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: ms0 + i * 86400000, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_DXLINK_CANDLES' });
    }
    return out;
  }
  const candles1d = bars(25, 440);  // last close ≈ 452.00
  const candles4h = bars(22, 430);

  const sb = {
    console,
    Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    Promise, Object, Array,
    _backendAuthHeaders: () => ({ 'X-Test': '1' }),
    _recordCandleSubscriptionRequest: () => {},
    fetch: null, // not needed — _scannerFetchBackendCandlesForChart is stubbed
    S,
    localStorage: {
      getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
      setItem:    (k, v) => { mockLS[k] = v; },
      removeItem: (k) => { delete mockLS[k]; },
    },
    document: dom,
    _scannerChartSymbol: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    // Flag helpers
    ffPreferBackendCandlesForCharts: null, // loaded below
    ffBackendCandlesScannerCharts:   null, // loaded below
    // Stubs
    resolveLatestDisplayPrice: function() { return { price: null, source: null }; }, // d is null
    isRTHOpen: function() { return true; }, // market is open
    fetchLiveQuote: async function(sym) {
      calls.fetchLiveQuote.push(sym);
      return 590.25; // live DXLink mark
    },
    _scannerFetchBackendCandlesForChart: async function(sym) {
      return { ok: true, source: 'BACKEND_DXLINK_CANDLES', candles1d, candles4h, diagnostics: {} };
    },
    _schartDrawTf: function(tf, sym, candleArr, src, price) {
      calls.schartDrawTf.push({ tf, sym, src, price });
    },
    setTimeout: function(fn) { fn(); }, // no-op timer for scrollIntoView stub
    setTimeout: function(fn) { fn(); },
    patchLastCandleWithLivePrice: function(c) { return c; }, // passthrough for this test
    showDetail: function() {},
  };
  vm.createContext(sb);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts'),
    sb
  );
  vm.runInContext(extractFn(HTML, 'openChartForSymbolLookup'), sb);
  sb.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');

  await sb.openChartForSymbolLookup('SPY');

  ok(calls.fetchLiveQuote.length === 1 && calls.fetchLiveQuote[0] === 'SPY',
    '20: fetchLiveQuote called once for SPY (not in scanData, RTH open)');
  ok(calls.schartDrawTf.some(function(c){ return c.tf === '1D' && c.price === 590.25; }),
    '20: _schartDrawTf 1D called with live DXLink mark (590.25)');
  ok(calls.schartDrawTf.some(function(c){ return c.tf === '4H' && c.price === 590.25; }),
    '20: _schartDrawTf 4H called with same live price');
}

// ── 21. functional: falls back to last-candle close when RTH closed ─────────
section('21. functional: last-candle close used when RTH is closed (no live mark)');
{
  const dom2 = makeDom();
  const mockLS2 = {};
  const S2 = { scanData: [], sortKey: 'score', sortDir: -1, activeFilter: 'all' };
  const calls2 = { fetchLiveQuote: [], schartDrawTf: [] };

  function bars2(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: ms0 + i * 86400000, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_DXLINK_CANDLES' });
    }
    return out;
  }
  const candles1d2 = bars2(25, 570); // last close = 570 + 24*0.5 = 582.00
  const candles4h2 = bars2(22, 560);

  const sb2 = {
    console,
    Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    Promise, Object, Array,
    _backendAuthHeaders: () => ({ 'X-Test': '1' }),
    _recordCandleSubscriptionRequest: () => {},
    fetch: null,
    S: S2,
    localStorage: {
      getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS2, k) ? mockLS2[k] : null,
      setItem:    (k, v) => { mockLS2[k] = v; },
      removeItem: (k) => { delete mockLS2[k]; },
    },
    document: dom2,
    _scannerChartSymbol: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    ffPreferBackendCandlesForCharts: null,
    ffBackendCandlesScannerCharts:   null,
    resolveLatestDisplayPrice: function() { return { price: null, source: null }; },
    isRTHOpen: function() { return false; }, // market CLOSED
    fetchLiveQuote: async function(sym) {
      calls2.fetchLiveQuote.push(sym);
      return 590.25; // should NOT be called
    },
    _scannerFetchBackendCandlesForChart: async function() {
      return { ok: true, source: 'BACKEND_DXLINK_CANDLES', candles1d: candles1d2, candles4h: candles4h2, diagnostics: {} };
    },
    _schartDrawTf: function(tf, sym, candleArr, src, price) {
      calls2.schartDrawTf.push({ tf, sym, src, price });
    },
    setTimeout: function(fn) { fn(); },
    patchLastCandleWithLivePrice: function(c) { return c; },
    showDetail: function() {},
  };
  vm.createContext(sb2);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts'),
    sb2
  );
  vm.runInContext(extractFn(HTML, 'openChartForSymbolLookup'), sb2);
  sb2.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');

  await sb2.openChartForSymbolLookup('SPY');

  ok(calls2.fetchLiveQuote.length === 0,
    '21: fetchLiveQuote NOT called when RTH is closed');
  const expectedClose = candles1d2[candles1d2.length - 1].close;
  ok(calls2.schartDrawTf.some(function(c){ return c.tf === '1D' && c.price === expectedClose; }),
    '21: _schartDrawTf 1D called with last backend candle close (RTH close, market closed)');
}

// ── 22. functional: scanData path still resolves price (regression) ─────────
section('22. functional: scanData path still works (regression guard)');
{
  const dom3 = makeDom();
  const mockLS3 = {};
  const scanData3 = [
    { ticker: 'AAPL', name: 'Apple', price: '225.00', score: 70, signal: 'STRONG BUY', rsi: 55,
      change: '+0.8%', squeeze: 'OFF', squeezeFired: false, nextEarnings: null, hvRank: 45, ma200dist: 4,
      _priceSource: 'DXLink', candles: [] },
  ];
  const calls3 = { fetchLiveQuote: [], schartDrawTf: [] };

  function bars3(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: ms0 + i * 86400000, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_DXLINK_CANDLES' });
    }
    return out;
  }

  const sb3 = {
    console,
    Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    Promise, Object, Array,
    _backendAuthHeaders: () => ({ 'X-Test': '1' }),
    _recordCandleSubscriptionRequest: () => {},
    fetch: null,
    S: { scanData: scanData3 },
    localStorage: {
      getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS3, k) ? mockLS3[k] : null,
      setItem:    (k, v) => { mockLS3[k] = v; },
      removeItem: (k) => { delete mockLS3[k]; },
    },
    document: dom3,
    _scannerChartSymbol: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    ffPreferBackendCandlesForCharts: null,
    ffBackendCandlesScannerCharts:   null,
    // resolveLatestDisplayPrice returns 225.00 for AAPL (from scanData)
    resolveLatestDisplayPrice: function(sym, row) {
      if (row && row.price) return { price: parseFloat(row.price), source: 'row' };
      return { price: null, source: null };
    },
    isRTHOpen: function() { return true; },
    fetchLiveQuote: async function(sym) {
      calls3.fetchLiveQuote.push(sym);
      return 999; // should NOT be reached since scanData resolves a price
    },
    _scannerFetchBackendCandlesForChart: async function() {
      return { ok: true, source: 'BACKEND_DXLINK_CANDLES',
               candles1d: bars3(25, 200), candles4h: bars3(22, 190), diagnostics: {} };
    },
    _schartDrawTf: function(tf, sym, candleArr, src, price) {
      calls3.schartDrawTf.push({ tf, sym, src, price });
    },
    setTimeout: function(fn) { fn(); },
    patchLastCandleWithLivePrice: function(c) { return c; },
    showDetail: function() {},
  };
  vm.createContext(sb3);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts'),
    sb3
  );
  vm.runInContext(extractFn(HTML, 'openChartForSymbolLookup'), sb3);
  sb3.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');

  await sb3.openChartForSymbolLookup('AAPL');

  ok(calls3.fetchLiveQuote.length === 0,
    '22: fetchLiveQuote NOT called when scanData row resolves price (tier-1 wins)');
  ok(calls3.schartDrawTf.some(function(c){ return c.tf === '1D' && c.price === 225; }),
    '22: _schartDrawTf 1D uses scanData-resolved price (225.00), not fetchLiveQuote result');
}



// ── 23. lookup chart state: overlay rerender uses lookup path ──────────────
section('23. lookup chart state persists across overlay rerenders');
{
  const dom4 = makeDom();
  const mockLS4 = {};
  const calls4 = { fetch: [], draw: [] };
  function bars4(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: ms0 + i * 86400000, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_DXLINK_CANDLES' });
    }
    return out;
  }
  const sb4 = {
    console,
    Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    Promise, Object, Array,
    document: dom4,
    localStorage: {
      getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS4, k) ? mockLS4[k] : null,
      setItem:    (k, v) => { mockLS4[k] = v; },
      removeItem: (k) => { delete mockLS4[k]; },
    },
    S: { scanData: [] },
    _scannerChartSymbol: null,
    _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function() {},
    ffPreferBackendCandlesForCharts: null,
    ffBackendCandlesScannerCharts: null,
    resolveLatestDisplayPrice: function() { return { price: null, source: null }; },
    isRTHOpen: function() { return false; },
    fetchLiveQuote: async function() { throw new Error('must not fetch live mark while closed'); },
    _scannerFetchBackendCandlesForChart: async function(sym) {
      calls4.fetch.push(sym);
      return { ok: true, source: 'BACKEND_DXLINK_CANDLES', candles1d: bars4(25, 400), candles4h: bars4(22, 390), diagnostics: {} };
    },
    _schartDrawTf: function(tf, sym, candleArr, src, price) {
      calls4.draw.push({ tf, sym, src, price });
    },
    setTimeout: function(fn) { fn(); },
    showDetail: function() {},
  };
  vm.createContext(sb4);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, 'rerenderActiveScannerChart') + '\n' +
    extractFn(HTML, '_scannerChartRedraw') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb4
  );
  sb4.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');

  await sb4.openChartForSymbolLookup('SPY');
  dom4.getElementById('schart-sma8').checked = true;
  sb4._scannerChartRedraw();
  await new Promise(function(resolve){ setImmediate(resolve); });

  ok(sb4._scannerChartSymbol === 'SPY' && sb4._scannerChartSource === 'lookup',
    '23: active scanner chart state remains SPY/lookup after SMA8 toggle');
  ok(mockLS4.apex_scanner_chart_symbol === 'SPY' && mockLS4.apex_scanner_chart_source === 'lookup',
    '23: active lookup chart symbol/source persisted to localStorage');
  ok(calls4.fetch.length === 2 && calls4.fetch.every(function(sym){ return sym === 'SPY'; }),
    '23: overlay rerender fetched backend candles for SPY again (does not require S.scanData)');
  ok(calls4.draw.filter(function(c){ return c.sym === 'SPY' && c.tf === '1D'; }).length >= 2,
    '23: lookup chart redraw path rendered SPY 1D again');
}

// ── 24. source guard: unified rerender exists and search does not clear chart ─
section('24. scanner lookup state source guards');
{
  const redrawSrc = stripComments(extractFn(HTML, '_scannerChartRedraw'));
  const rerenderSrc = stripComments(extractFn(HTML, 'rerenderActiveScannerChart'));
  const lookupSrc = stripComments(extractFn(HTML, 'openChartForSymbolLookup'));
  ok(/rerenderActiveScannerChart/.test(redrawSrc),
    '24: overlay handler delegates to unified rerenderActiveScannerChart');
  ok(/_scannerChartSource\s*===\s*['"]lookup['"]/.test(rerenderSrc) && /openChartForSymbolLookup/.test(rerenderSrc),
    '24: unified rerender sends lookup charts back through openChartForSymbolLookup');
  ok(/_scannerSetActiveChart\(symbol,\s*['"]lookup['"]\)/.test(lookupSrc) || /_scannerChartSource\s*=\s*['"]lookup['"]/.test(lookupSrc),
    '24: openChartForSymbolLookup marks the active chart source as lookup');

  const { sandbox } = buildSandbox({ flagOn: true, scanData: [] });
  sandbox._scannerChartSymbol = 'SPY';
  sandbox._scannerChartSource = 'lookup';
  sandbox.searchTicker('QQQ');
  ok(sandbox._scannerChartSymbol === 'SPY' && sandbox._scannerChartSource === 'lookup',
    '24: searchTicker result rerender does not clear active SPY lookup chart state');
}


// ── 25. lookup chart keeps 1D when backend 4H is warming ──────────────────
section('25. lookup chart keeps 1D and shows warming message when 4H missing');
{
  const dom5 = makeDom();
  const mockLS5 = {};
  const calls5 = { draw: [] };
  function bars5(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: ms0 + i * 86400000, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_CANDLE_STORE' });
    }
    return out;
  }
  const sb5 = {
    console,
    Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) },
    BACKEND: 'https://api.test',
    Promise, Object, Array,
    document: dom5,
    localStorage: {
      getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS5, k) ? mockLS5[k] : null,
      setItem:    (k, v) => { mockLS5[k] = v; },
      removeItem: (k) => { delete mockLS5[k]; },
    },
    S: { scanData: [] },
    _scannerChartSymbol: null,
    _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function() {},
    ffPreferBackendCandlesForCharts: null,
    ffBackendCandlesScannerCharts: null,
    resolveLatestDisplayPrice: function() { return { price: null, source: null }; },
    isRTHOpen: function() { return false; },
    fetchLiveQuote: async function() { throw new Error('must not fetch live mark while closed'); },
    _scannerFetchBackendCandlesForChart: async function() {
      return { ok: true, source: 'BACKEND_CANDLE_STORE', candles1d: bars5(25, 400), candles4h: null, diagnostics: {} };
    },
    _schartDrawTf: function(tf, sym, candleArr, src, price) {
      calls5.draw.push({ tf, sym, src, price, count: candleArr.length });
    },
    setTimeout: function(fn) { fn(); },
    showDetail: function() {},
  };
  vm.createContext(sb5);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb5
  );
  sb5.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');

  await sb5.openChartForSymbolLookup('QQQ');

  ok(calls5.draw.some(function(c){ return c.tf === '1D' && c.sym === 'QQQ' && c.count === 25; }),
    '25: 1D is rendered when 4H is missing');
  ok(!calls5.draw.some(function(c){ return c.tf === '4H'; }),
    '25: 4H renderer is not called with missing candles');
  ok(/4H warming up — try again shortly/.test(dom5.getElementById('schart-big-wrap-4h').innerHTML),
    '25: 4H panel shows warming message');
  ok(!/No scanner result \/ backend candles not ready/.test(dom5.getElementById('schart-big-wrap-4h').innerHTML),
    '25: 4H panel does not show total backend failure');
}


// ── 26. progressive lookup render: 1D paints before slower 4H ──────────────
section('26. progressive lookup render: 1D paints before slower 4H');
{
  const dom6 = makeDom();
  const mockLS6 = {};
  const calls6 = { draw: [], ensure4h: [] };
  function bars6(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: ms0 + i * 86400000, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_CANDLE_STORE' });
    }
    return out;
  }
  let resolve1d, resolve4h;
  const p1 = new Promise(function(resolve){ resolve1d = resolve; });
  const p4 = new Promise(function(resolve){ resolve4h = resolve; });
  const sb6 = {
    console, Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test', Promise, Object, Array,
    document: dom6,
    localStorage: {
      getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS6, k) ? mockLS6[k] : null,
      setItem: (k, v) => { mockLS6[k] = v; },
      removeItem: (k) => { delete mockLS6[k]; },
    },
    S: { scanData: [] },
    _scannerChartSymbol: null, _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function(){},
    ffPreferBackendCandlesForCharts: null, ffBackendCandlesScannerCharts: null,
    _scannerGetCachedBackendTfCandles: function(){ return null; },
    _scannerReadBackendCandlesTf: function(sym, tf){ return tf === '1D' ? p1 : p4; },
    _scannerEnsureBackendCandles: async function(){ calls6.ensure4h.push('ensure'); return { ok: true }; },
    _scannerEnsure4hThenUpdateActiveChart: function(sym){ calls6.ensure4h.push(sym); return Promise.resolve(null); },
    _scannerLookupRender4h: function(sym, candles, src, price){ calls6.draw.push({ tf:'4H', sym, count:candles.length, price }); },
    _schartDrawTf: function(tf, sym, candleArr, src, price){ calls6.draw.push({ tf, sym, count:candleArr.length, price }); },
    resolveLatestDisplayPrice: function(){ return { price: null, source: null }; },
    isRTHOpen: function(){ return false; },
    setTimeout: function(fn){ fn(); },
    showDetail: function(){},
  };
  vm.createContext(sb6);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, '_scannerLookupResolveLivePrice') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb6
  );
  sb6.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');

  const openPromise = sb6.openChartForSymbolLookup('MSFT');
  resolve1d({ ok: true, candles: bars6(25, 400), diag: null });
  await Promise.resolve();
  await Promise.resolve();

  ok(calls6.draw.some(function(c){ return c.tf === '1D' && c.sym === 'MSFT'; }),
    '26: 1D chart renders as soon as 1D candles resolve');
  ok(!calls6.draw.some(function(c){ return c.tf === '4H'; }),
    '26: 4H has not rendered while its promise is still pending');
  ok(/loading 4H/.test(dom6.getElementById('schart-big-wrap-4h').innerHTML),
    '26: 4H panel remains in loading state while slower 4H read is pending');

  resolve4h({ ok: true, candles: bars6(22, 390), diag: null });
  await openPromise;
  ok(calls6.draw.some(function(c){ return c.tf === '4H' && c.sym === 'MSFT'; }),
    '26: 4H renders after slower 4H candles arrive');
}

// ── 27. cached lookup candles are reused on reopen ─────────────────────────
section('27. cached lookup candles are reused on reopening the same symbol');
{
  const dom7 = makeDom();
  const mockLS7 = {};
  const calls7 = { draw: [], read: [], revalidate: [] };
  function bars7(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) {
      const c = base + i * 0.5;
      out.push({ time: ms0 + i * 86400000, open: c - 0.1, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_CANDLE_STORE' });
    }
    return out;
  }
  const cache = {
    'QQQ|1D': { candles: bars7(25, 300), timestamp: Date.now(), diag: null },
    'QQQ|4H': { candles: bars7(22, 290), timestamp: Date.now(), diag: null },
  };
  const sb7 = {
    console, Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test', Promise, Object, Array,
    document: dom7,
    localStorage: {
      getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS7, k) ? mockLS7[k] : null,
      setItem: (k, v) => { mockLS7[k] = v; },
      removeItem: (k) => { delete mockLS7[k]; },
    },
    S: { scanData: [] },
    _scannerChartSymbol: null, _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function(){},
    ffPreferBackendCandlesForCharts: null, ffBackendCandlesScannerCharts: null,
    _scannerGetCachedBackendTfCandles: function(sym, tf){ return cache[String(sym).toUpperCase() + '|' + tf] || null; },
    _scannerReadBackendCandlesTf: function(sym, tf){ calls7.read.push(sym + '|' + tf); return Promise.resolve({ ok: false }); },
    _scannerRevalidateBackendCandlesForChart: function(sym){ calls7.revalidate.push(sym); },
    _scannerEnsure4hThenUpdateActiveChart: function(){ throw new Error('cached 4H should avoid ensure path'); },
    _schartDrawTf: function(tf, sym, candleArr){ calls7.draw.push({ tf, sym, count:candleArr.length }); },
    resolveLatestDisplayPrice: function(){ return { price: null, source: null }; },
    isRTHOpen: function(){ return false; },
    setTimeout: function(fn){ fn(); },
    showDetail: function(){},
  };
  vm.createContext(sb7);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, '_scannerLookupResolveLivePrice') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb7
  );
  sb7.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');

  await sb7.openChartForSymbolLookup('QQQ');
  await sb7.openChartForSymbolLookup('QQQ');

  ok(calls7.read.length === 0,
    '27: reopening a fresh cached lookup symbol does not block on new 1D/4H reads');
  ok(calls7.draw.filter(function(c){ return c.tf === '1D' && c.sym === 'QQQ'; }).length === 2,
    '27: cached 1D renders immediately on both opens');
  ok(calls7.draw.filter(function(c){ return c.tf === '4H' && c.sym === 'QQQ'; }).length === 2,
    '27: cached 4H renders immediately on both opens');
  ok(calls7.revalidate.length === 2 && calls7.revalidate.every(function(sym){ return sym === 'QQQ'; }),
    '27: cached opens still schedule background revalidation');
}

// ── 28. BB / KC overlay toggles keep active lookup symbol ──────────────────
section('28. BB and KC overlay toggles keep the active lookup symbol');
{
  const redrawSrc = stripComments(extractFn(HTML, '_scannerChartRedraw'));
  ok(/schart-bb/.test(redrawSrc) && /_scannerChartOverlay\.bb/.test(redrawSrc),
    '28: BB checkbox is persisted through scanner chart overlay redraw');
  ok(/schart-kc/.test(redrawSrc) && /_scannerChartOverlay\.kc/.test(redrawSrc),
    '28: KC checkbox is persisted through scanner chart overlay redraw');
  ok(/rerenderActiveScannerChart/.test(redrawSrc),
    '28: overlay toggles rerender through the active chart source dispatcher');
  const rerenderSrc = stripComments(extractFn(HTML, 'rerenderActiveScannerChart'));
  ok(/_scannerChartSource\s*===\s*['"]lookup['"][\s\S]*openChartForSymbolLookup\(_scannerChartSymbol\)/.test(rerenderSrc),
    '28: lookup source dispatch preserves the active lookup symbol for SMA8 / BB / KC toggles');
}

// ── 29. lookup path introduces no Yahoo, WebSocket, or candle subscriptions ─
section('29. lookup performance path has no Yahoo, WebSocket, or frontend candle subscriptions');
{
  const src = [
    extractFn(HTML, 'openChartForSymbolLookup'),
    extractFn(HTML, '_scannerReadBackendCandlesTf'),
    extractFn(HTML, '_scannerEnsureBackendCandles'),
    extractFn(HTML, '_scannerPrefetchLookupCandles'),
    extractFn(HTML, '_scannerScheduleLookupPrefetch'),
  ].map(stripComments).join('\n');
  ok(!/yahoo/i.test(src), '29: lookup path contains no Yahoo reference');
  ok(!/new\s+WebSocket/.test(src), '29: lookup path opens no frontend WebSocket');
  ok(!/_ensureCandleSubscription|_ensure30MSubscription/.test(src),
    '29: lookup path opens no frontend candle subscriptions');
}

// ── 30. lookup progressive branch renders fast backend 1D/4H ───────────────
section('30. lookup progressive branch renders fast backend 1D/4H');
{
  const dom = makeDom();
  const mockLS = {};
  const calls = { draw: [] };
  function bars(n, base) {
    const out = [];
    const ms0 = Date.UTC(2024, 0, 2);
    for (let i = 0; i < n; i++) out.push({ time: ms0 + i * 86400000, open: base + i, high: base + i + 1, low: base + i - 1, close: base + i + 0.5, volume: 1000 });
    return out;
  }
  const sb = {
    console, Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test', Promise, Object, Array,
    document: dom,
    localStorage: { getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null, setItem: (k, v) => { mockLS[k] = v; }, removeItem: (k) => { delete mockLS[k]; } },
    S: { scanData: [] },
    _scannerChartSymbol: null, _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function(){},
    ffPreferBackendCandlesForCharts: null, ffBackendCandlesScannerCharts: null,
    _scannerGetCachedBackendTfCandles: function(){ return null; },
    _scannerReadBackendCandlesTf: function(sym, tf){ return Promise.resolve({ ok: true, candles: tf === '1D' ? bars(25, 100) : bars(22, 90) }); },
    _scannerEnsureBackendCandles: async function(){ throw new Error('ensure should not block successful fast reads'); },
    _scannerEnsure4hThenUpdateActiveChart: function(){ throw new Error('ensure 4H should not run when fast 4H succeeds'); },
    _schartDrawTf: function(tf, sym, candleArr){ calls.draw.push({ tf, sym, count: candleArr.length }); dom.getElementById('schart-big-wrap-' + tf.toLowerCase()).innerHTML = '<canvas data-symbol="' + sym + '" data-tf="' + tf + '"></canvas>'; },
    resolveLatestDisplayPrice: function(){ return { price: null, source: null }; },
    isRTHOpen: function(){ return false; },
    setTimeout: function(fn){ fn(); },
    showDetail: function(){},
  };
  vm.createContext(sb);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, '_scannerLookupResolveLivePrice') + '\n' +
    extractFn(HTML, '_scannerLookupRender4h') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb
  );
  sb.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
  await sb.openChartForSymbolLookup('TSLA');
  ok(calls.draw.some(function(c){ return c.tf === '1D' && c.sym === 'TSLA' && c.count === 25; }),
    '30: fast 1D backend read calls _schartDrawTf for the lookup symbol');
  ok(!/checking backend/.test(dom.getElementById('schart-big-wrap-1d').innerHTML),
    '30: 1D wrapper no longer contains the checking backend placeholder after fast 1D render');
  ok(calls.draw.some(function(c){ return c.tf === '4H' && c.sym === 'TSLA' && c.count === 22; }),
    '30: fast 4H backend read renders automatically');
}

// ── 31. lookup 1D render does not wait for slower 4H ──────────────────────
section('31. lookup 1D render does not wait for slower 4H');
{
  const dom = makeDom();
  const mockLS = {};
  const calls = { draw: [] };
  function bars(n, base) { return Array.from({ length: n }, function(_, i){ return { time: Date.UTC(2024,0,2) + i * 86400000, open: base+i, high: base+i+1, low: base+i-1, close: base+i+0.5, volume: 1000 }; }); }
  let resolve4h;
  const p4 = new Promise(function(resolve){ resolve4h = resolve; });
  const sb = {
    console, Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test', Promise, Object, Array,
    document: dom,
    localStorage: { getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null, setItem: (k, v) => { mockLS[k] = v; }, removeItem: (k) => { delete mockLS[k]; } },
    S: { scanData: [] },
    _scannerChartSymbol: null, _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function(){},
    ffPreferBackendCandlesForCharts: null, ffBackendCandlesScannerCharts: null,
    _scannerGetCachedBackendTfCandles: function(){ return null; },
    _scannerReadBackendCandlesTf: function(sym, tf){ return tf === '1D' ? Promise.resolve({ ok: true, candles: bars(25, 200) }) : p4; },
    _scannerEnsureBackendCandles: async function(){ return { ok: true }; },
    _scannerEnsure4hThenUpdateActiveChart: function(){ return Promise.resolve(null); },
    _schartDrawTf: function(tf, sym, candleArr){ calls.draw.push({ tf, sym, count: candleArr.length }); dom.getElementById('schart-big-wrap-' + tf.toLowerCase()).innerHTML = '<canvas data-symbol="' + sym + '" data-tf="' + tf + '"></canvas>'; },
    resolveLatestDisplayPrice: function(){ return { price: null, source: null }; },
    isRTHOpen: function(){ return false; },
    setTimeout: function(fn){ fn(); },
    showDetail: function(){},
  };
  vm.createContext(sb);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, '_scannerLookupResolveLivePrice') + '\n' +
    extractFn(HTML, '_scannerLookupRender4h') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb
  );
  sb.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
  const openPromise = sb.openChartForSymbolLookup('BABA');
  await Promise.resolve(); await Promise.resolve();
  ok(calls.draw.length === 1 && calls.draw[0].tf === '1D' && calls.draw[0].sym === 'BABA',
    '31: 1D renders before the pending 4H read resolves');
  resolve4h({ ok: true, candles: bars(22, 190) });
  await openPromise;
  ok(calls.draw.length === 2 && calls.draw[1].tf === '4H' && calls.draw[1].sym === 'BABA',
    '31: 4H renders automatically when its slower promise resolves');
}

// ── 32. lookup cache renders synchronously without placeholder overwrite ───
section('32. lookup cache renders synchronously without placeholder overwrite');
{
  const dom = makeDom();
  const mockLS = {};
  const calls = { draw: [], read: [], revalidate: [] };
  function bars(n, base) { return Array.from({ length: n }, function(_, i){ return { time: Date.UTC(2024,0,2) + i * 86400000, open: base+i, high: base+i+1, low: base+i-1, close: base+i+0.5, volume: 1000 }; }); }
  const cache = { 'NVDA|1D': { candles: bars(25, 500) }, 'NVDA|4H': { candles: bars(22, 490) } };
  const sb = {
    console, Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test', Promise, Object, Array,
    document: dom,
    localStorage: { getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null, setItem: (k, v) => { mockLS[k] = v; }, removeItem: (k) => { delete mockLS[k]; } },
    S: { scanData: [] },
    _scannerChartSymbol: null, _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function(){},
    ffPreferBackendCandlesForCharts: null, ffBackendCandlesScannerCharts: null,
    _scannerGetCachedBackendTfCandles: function(sym, tf){ return cache[sym + '|' + tf] || null; },
    _scannerReadBackendCandlesTf: function(sym, tf){ calls.read.push(sym + '|' + tf); return Promise.resolve({ ok:false }); },
    _scannerRevalidateBackendCandlesForChart: function(sym){ calls.revalidate.push(sym); return Promise.resolve(null); },
    _scannerEnsure4hThenUpdateActiveChart: function(){ throw new Error('cached 4H should not need ensure'); },
    _schartDrawTf: function(tf, sym, candleArr){ calls.draw.push({ tf, sym, count: candleArr.length }); dom.getElementById('schart-big-wrap-' + tf.toLowerCase()).innerHTML = '<canvas data-symbol="' + sym + '" data-tf="' + tf + '"></canvas>'; },
    resolveLatestDisplayPrice: function(){ return { price: null, source: null }; },
    isRTHOpen: function(){ return false; },
    setTimeout: function(fn){ fn(); },
    showDetail: function(){},
  };
  vm.createContext(sb);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, '_scannerLookupResolveLivePrice') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb
  );
  sb.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
  const ret = sb.openChartForSymbolLookup('NVDA');
  ok(calls.draw.length === 2 && calls.draw[0].tf === '1D' && calls.draw[1].tf === '4H',
    '32: cached 1D and 4H render synchronously before awaiting openChartForSymbolLookup');
  ok(calls.read.length === 0 && calls.revalidate.length === 1,
    '32: cached render skips blocking reads but preserves background revalidation');
  ok(!/checking backend|loading 4H/.test(dom.getElementById('schart-big-wrap-1d').innerHTML + dom.getElementById('schart-big-wrap-4h').innerHTML),
    '32: cache-rendered wrappers are not overwritten by loading placeholders');
  await ret;
}

// ── 33. lookup pending promises do not render a stale symbol ───────────────
section('33. lookup pending promises do not render a stale symbol');
{
  const dom = makeDom();
  const mockLS = {};
  const calls = { draw: [] };
  function bars(n, base) { return Array.from({ length: n }, function(_, i){ return { time: Date.UTC(2024,0,2) + i * 86400000, open: base+i, high: base+i+1, low: base+i-1, close: base+i+0.5, volume: 1000 }; }); }
  const resolvers = {};
  const promises = {};
  ['TSLA|1D','TSLA|4H','BABA|1D','BABA|4H'].forEach(function(k){ promises[k] = new Promise(function(resolve){ resolvers[k] = resolve; }); });
  const sb = {
    console, Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test', Promise, Object, Array,
    document: dom,
    localStorage: { getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null, setItem: (k, v) => { mockLS[k] = v; }, removeItem: (k) => { delete mockLS[k]; } },
    S: { scanData: [] },
    _scannerChartSymbol: null, _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function(){},
    ffPreferBackendCandlesForCharts: null, ffBackendCandlesScannerCharts: null,
    _scannerGetCachedBackendTfCandles: function(){ return null; },
    _scannerReadBackendCandlesTf: function(sym, tf){ return promises[sym + '|' + tf]; },
    _scannerEnsureBackendCandles: async function(){ return { ok: true }; },
    _scannerEnsure4hThenUpdateActiveChart: function(){ return Promise.resolve(null); },
    _schartDrawTf: function(tf, sym, candleArr){ calls.draw.push({ tf, sym, count: candleArr.length }); dom.getElementById('schart-big-wrap-' + tf.toLowerCase()).innerHTML = '<canvas data-symbol="' + sym + '" data-tf="' + tf + '"></canvas>'; },
    resolveLatestDisplayPrice: function(){ return { price: null, source: null }; },
    isRTHOpen: function(){ return false; },
    setTimeout: function(fn){ fn(); },
    showDetail: function(){},
  };
  vm.createContext(sb);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, '_scannerLookupResolveLivePrice') + '\n' +
    extractFn(HTML, '_scannerLookupRender4h') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb
  );
  sb.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
  const staleOpen = sb.openChartForSymbolLookup('TSLA');
  const activeOpen = sb.openChartForSymbolLookup('BABA');
  resolvers['TSLA|1D']({ ok: true, candles: bars(25, 100) });
  resolvers['TSLA|4H']({ ok: true, candles: bars(22, 90) });
  await staleOpen;
  ok(!calls.draw.some(function(c){ return c.sym === 'TSLA'; }),
    '33: stale TSLA promises do not render after the active lookup symbol changes to BABA');
  resolvers['BABA|1D']({ ok: true, candles: bars(25, 200) });
  resolvers['BABA|4H']({ ok: true, candles: bars(22, 190) });
  await activeOpen;
  ok(calls.draw.some(function(c){ return c.sym === 'BABA' && c.tf === '1D'; }) && calls.draw.some(function(c){ return c.sym === 'BABA' && c.tf === '4H'; }),
    '33: the currently active BABA lookup panel still renders both timeframes');
}


// ── 34. lookup 4H miss renders after ensure/reread succeeds ───────────────
section('34. lookup 4H miss renders after ensure/reread succeeds');
{
  const dom = makeDom();
  const mockLS = {};
  const calls = { draw: [], ensure: [], read: [] };
  function bars(n, base) { return Array.from({ length: n }, function(_, i){ return { time: Date.UTC(2024,0,2) + i * 86400000, open: base+i, high: base+i+1, low: base+i-1, close: base+i+0.5, volume: 1000 }; }); }
  const sb = {
    console, Date, Math, JSON, Number, Boolean, String,
    isFinite, parseFloat, parseInt, encodeURIComponent,
    AbortSignal: { timeout: () => ({}) }, BACKEND: 'https://api.test', Promise, Object, Array,
    document: dom,
    localStorage: { getItem: (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null, setItem: (k, v) => { mockLS[k] = v; }, removeItem: (k) => { delete mockLS[k]; } },
    S: { scanData: [] },
    _scannerChartSymbol: null, _scannerChartSource: null,
    _scannerChartOverlay: { sma8: false, bb: false, kc: false, atr: false },
    _schart4hStopPoll: function(){},
    ffPreferBackendCandlesForCharts: null, ffBackendCandlesScannerCharts: null,
    _scannerGetCachedBackendTfCandles: function(){ return null; },
    _scannerReadBackendCandlesTf: function(sym, tf, opts){
      calls.read.push(sym + '|' + tf + '|' + (opts && opts.forceNetwork ? 'force' : 'cache'));
      if (tf === '1D') return Promise.resolve({ ok: true, candles: bars(25, 300) });
      if (opts && opts.forceNetwork) return Promise.resolve({ ok: true, candles: bars(22, 290) });
      return Promise.resolve({ ok: false, candles: null });
    },
    _scannerEnsureBackendCandles: async function(sym, tfs){ calls.ensure.push(sym + '|' + tfs.join(',')); return { ok: true }; },
    _schartDrawTf: function(tf, sym, candleArr){ calls.draw.push({ tf, sym, count: candleArr.length }); dom.getElementById('schart-big-wrap-' + tf.toLowerCase()).innerHTML = '<canvas data-symbol="' + sym + '" data-tf="' + tf + '"></canvas>'; },
    renderScannerInlineChart: function(){ throw new Error('lookup ensure path should not render scanner inline chart'); },
    resolveLatestDisplayPrice: function(){ return { price: null, source: null }; },
    isRTHOpen: function(){ return false; },
    setTimeout: function(fn){ fn(); },
    showDetail: function(){},
  };
  vm.createContext(sb);
  vm.runInContext(
    extractFn(HTML, 'ffPreferBackendCandlesForCharts') + '\n' +
    extractFn(HTML, 'ffBackendCandlesScannerCharts') + '\n' +
    extractFn(HTML, '_scannerPersistChartState') + '\n' +
    extractFn(HTML, '_scannerSetActiveChart') + '\n' +
    extractFn(HTML, '_scannerLookupResolveLivePrice') + '\n' +
    extractFn(HTML, '_scannerLookupRender4h') + '\n' +
    extractFn(HTML, '_scannerEnsure4hThenUpdateActiveChart') + '\n' +
    extractFn(HTML, 'openChartForSymbolLookup'),
    sb
  );
  sb.localStorage.setItem('apex_ff_backend_candles_scanner_charts', '1');
  await sb.openChartForSymbolLookup('AMD');
  ok(calls.ensure.length === 1 && calls.ensure[0] === 'AMD|1D,4H',
    '34: initial 4H miss triggers backend ensure for the lookup symbol');
  ok(calls.read.some(function(x){ return x === 'AMD|4H|force'; }),
    '34: 4H is re-read from the backend after ensure succeeds');
  ok(calls.draw.some(function(c){ return c.tf === '4H' && c.sym === 'AMD' && c.count === 22; }),
    '34: 4H renders automatically after ensure/reread returns usable candles');
}


// ── summary ────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);

})();
