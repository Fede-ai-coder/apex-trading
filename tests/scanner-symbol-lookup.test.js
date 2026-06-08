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

// ── summary ────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);
