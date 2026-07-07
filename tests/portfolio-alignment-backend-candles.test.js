'use strict';
// Portfolio expanded-row directional alignment must reuse already-loaded backend
// candle-store candles from _pfBackendCandleCache. This test intentionally stubs
// frontend candle buffers empty so it fails if alignment ignores the backend cache.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine) { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
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
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }
function bars(n, base, dir) {
  const out = [];
  const ms0 = Date.UTC(2024, 0, 2);
  for (let i = 0; i < n; i++) {
    const c = base + (dir || 1) * i * 0.5;
    out.push({ time: ms0 + i * 86400000, open: c - 0.2, high: c + 0.5, low: c - 0.5, close: c, volume: 1000, source: 'BACKEND_CANDLE_STORE' });
  }
  return out;
}

const elements = {};
const logs = [];
const sandbox = {
  console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: console.error },
  Date, Math, Number, String, Array, Object, RegExp, JSON, isFinite, parseFloat,
  document: { getElementById: (id) => (elements[id] || (elements[id] = { innerHTML: '', style: {}, textContent: '' })) },
  escHtml: (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c])),
  S: { vixFamily: {} },
  _pfDeltaLongThreshold: 10,
  _pfDeltaShortThreshold: -10,
  _pfAlignmentCache: {},
  _pfBackendCandleCache: { symbol: 'CSCO', candles1d: bars(40, 45, 1), candles4h: bars(40, 44, 1), source: 'BACKEND_CANDLE_STORE' },
  getDailyCandles: (sym) => sym === 'SPY' ? [] : [],
  getFourHourCandles: () => [],
  positionManager: { getById: () => ({ id: 7, ticker: 'CSCO', delta: 25, legs: [] }) },
  inferStructureCountForPosition: () => ({ count: 1, assumed: false }),
  getPortfolioUnderlyingIvr: () => null,
  evaluateVolatilityDeltaConsistency: () => ({ status: 'VOL_UNAVAILABLE', source: 'NONE', range: null, worstShortLegDelta: null }),
  evaluateDeltaRangeForBias: () => 'DELTA_OK',
  evaluateShortPremiumExitAlert: () => ({ status: 'EXIT_UNAVAILABLE' }),
  computePortfolioRowTrafficLight: () => ({ color: 'unchanged-test-stub' }),
  _pfBuildAlignmentRiskPanel: () => '',
  _pfUpdateRowTrafficLight: () => {},
  fetch: () => { throw new Error('alignment must not fetch'); },
  _portfolioFetchBackendCandlesForChart: () => { throw new Error('alignment must not call backend helper'); },
};
vm.createContext(sandbox);
vm.runInContext([
  extractFn(HTML, 'normalizeSymbol'),
  extractFn(HTML, '_pfNormalizeChartUnderlyingSymbol'),
  extractFn(HTML, 'smA'),
  extractFn(HTML, 'calcRSIWilder'),
  extractFn(HTML, 'computePortfolioDirectionalBias'),
  extractFn(HTML, 'classifyPortfolioDeltaExposure'),
  extractFn(HTML, 'evaluatePortfolioDirectionalAlignment'),
  extractFn(HTML, '_pfGetAlignmentCandleInputs'),
  extractFn(HTML, '_pfUpdateAlignment'),
].join('\n'), sandbox);

section('1. expanded-row alignment reuses backend candle-store cache');
sandbox._pfUpdateAlignment(7, 'csco');
const html = elements['pf-align-7'].innerHTML;
ok(!/INSUFFICIENT DATA/.test(html), 'alignment banner does not render INSUFFICIENT DATA when backend CSCO candles exist');
ok(/DIRECTIONAL ALIGNMENT/.test(html), 'alignment banner renders the normal directional alignment UI');
ok(logs.some((l) => /\[PORTFOLIO ALIGNMENT\] source=BACKEND_CANDLE_STORE symbol=CSCO 1D=40 4H=40/.test(l)), 'success diagnostic logs backend candle-store source and counts');
ok(!logs.some((l) => /insufficient_data symbol=CSCO/.test(l)), 'no insufficient-data diagnostic logged for valid backend candles');

section('2. no fetch, no SPY active substitution, no rule/label changes');
const inputs = sandbox._pfGetAlignmentCandleInputs('CSCO');
ok(inputs.candles1D === sandbox._pfBackendCandleCache.candles1d, 'alignment input uses CSCO backend 1D array by reference');
ok(inputs.candles4H === sandbox._pfBackendCandleCache.candles4h, 'alignment input uses CSCO backend 4H array by reference');
ok(inputs.candles1D !== sandbox.getDailyCandles('SPY'), 'SPY benchmark candles are not used as CSCO active candles');
ok(stripComments(extractFn(HTML, '_pfGetAlignmentCandleInputs')).indexOf('fetch(') === -1, 'alignment candle binding performs no backend fetch');
ok(sandbox.evaluatePortfolioDirectionalAlignment('LONG', 'LONG_DELTA').status === 'ALIGNED', 'directional classification label LONG/LONG_DELTA remains ALIGNED');
ok(sandbox.evaluatePortfolioDirectionalAlignment('LONG', 'SHORT_DELTA').status === 'MISALIGNED', 'directional classification label LONG/SHORT_DELTA remains MISALIGNED');
ok(sandbox.evaluatePortfolioDirectionalAlignment('NEUTRAL', 'LONG_DELTA').status === 'WARNING', 'directional classification label NEUTRAL/LONG_DELTA remains WARNING');
ok(!/computePortfolioRowTrafficLight/.test(stripComments(extractFn(HTML, '_pfGetAlignmentCandleInputs'))), 'new alignment candle binding does not modify semaphore/traffic-light code');

console.log('\n' + (fail === 0 ? 'All ' + pass + ' tests passed.' : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);
