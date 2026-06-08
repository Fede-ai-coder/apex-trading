#!/usr/bin/env node
/*
 * Static guardrails for the experimental Backend Candle Store chart path.
 * The feature must remain frontend-only, additive, feature-flagged OFF by default,
 * authenticated through existing helpers, and fully fallback-safe.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let failures = 0;
function ok(cond, msg) {
  if (cond) console.log('✓ ' + msg);
  else { failures++; console.error('✗ ' + msg); }
}
function bodyOf(name) {
  const start = SRC.indexOf('function ' + name + '(');
  if (start < 0) return '';
  let depth = 0, seen = false;
  for (let i = start; i < SRC.length; i++) {
    if (SRC[i] === '{') { depth++; seen = true; }
    else if (SRC[i] === '}') {
      depth--;
      if (seen && depth === 0) return SRC.slice(start, i + 1);
    }
  }
  return '';
}
function beforeInBody(name, before, after) {
  const b = bodyOf(name);
  const bi = b.indexOf(before);
  const ai = b.indexOf(after);
  return bi >= 0 && ai >= 0 && bi < ai;
}

const flagFn = bodyOf('ffBackendCandleStoreChart');
const ensureFn = bodyOf('ensureBackendCandleStoreSymbol');
const fetchFn = bodyOf('fetchBackendCandleStoreCandles');
const readinessFn = bodyOf('fetchBackendCandleStoreReadiness');
const tryFn = bodyOf('_tryBackendCandleStoreChart');
const openFn = bodyOf('openChart');
const helperRegion = SRC.slice(SRC.indexOf('BACKEND CANDLE STORE CHART EXPERIMENT'), SRC.indexOf('// CHART', SRC.indexOf('BACKEND CANDLE STORE CHART EXPERIMENT')));

ok(SRC.includes('apex_ff_backend_candle_store_chart'), 'feature flag apex_ff_backend_candle_store_chart is present');
ok(/localStorage\.getItem\(APEX_FF_BACKEND_CANDLE_STORE_CHART\) === '1'/.test(flagFn), 'feature flag defaults OFF and only enables on localStorage value "1"');

ok(beforeInBody('ensureBackendCandleStoreSymbol', 'if (!ffBackendCandleStoreChart())', "ttCall('/market/candles/ensure'"), 'POST /market/candles/ensure is gated inside ensureBackendCandleStoreSymbol');
ok(beforeInBody('fetchBackendCandleStoreCandles', 'if (!ffBackendCandleStoreChart())', "ttCall('/market/candles?symbol="), 'GET /market/candles?symbol= is gated inside fetchBackendCandleStoreCandles');
ok(beforeInBody('fetchBackendCandleStoreReadiness', 'if (!ffBackendCandleStoreChart())', "ttCall('/market/candles/readiness?symbol="), 'GET /market/candles/readiness?symbol= is gated inside fetchBackendCandleStoreReadiness');
ok(beforeInBody('openChart', 'if(ffBackendCandleStoreChart())', 'ensureBackendCandleStoreSymbol'), 'chart integration calls ensure only when flag is ON');
ok(beforeInBody('openChart', 'if(ffBackendCandleStoreChart())', '_tryBackendCandleStoreChart'), 'chart integration reads backend store only when flag is ON');

ok(fetchFn.includes('json.ok !== true'), 'fetch helper validates ok === true');
ok(fetchFn.includes('Array.isArray(json.candles)'), 'fetch helper validates candles array');
ok(fetchFn.includes('_backendCandleStoreChartNormCandle') && fetchFn.includes('.filter(Boolean)') && fetchFn.includes('.sort(function(a, b) { return a.timestamp - b.timestamp; })'), 'fetch helper normalizes, filters invalid OHLC candles, and sorts ascending');
ok(tryFn.includes('backendCount >= cfg.minRequired'), 'backend candles must pass per-timeframe minimum threshold');
ok(tryFn.includes("source: _BACKEND_CANDLE_STORE_CHART_SOURCE.FALLBACK") && openFn.includes('await fetchCandles(ticker)') && openFn.includes('d.candles&&d.candles.length'), 'fallback to the current chart pipeline remains in place for insufficient/error backend candles');

ok(!/https?:\/\//.test(helperRegion), 'new Candle Store helper region contains no hardcoded backend URL');
ok(!/(api[_-]?key|x-api-key)\s*[:=]\s*['\"][A-Za-z0-9_\-]{12,}/i.test(helperRegion), 'new Candle Store helper region contains no hardcoded API key');
ok(ensureFn.includes('ttCall(') && fetchFn.includes('ttCall(') && readinessFn.includes('ttCall('), 'Candle Store helpers use existing ttCall auth/backend helper');

ok(SRC.includes('[CANDLE_STORE_CHART] backend_used') || SRC.includes("_backendCandleStoreChartLog('backend_used'"), 'backend_used diagnostic log is wired');
ok(SRC.includes('[CANDLE_STORE_CHART] fallback_used') || SRC.includes("_backendCandleStoreChartLog('fallback_used'"), 'fallback_used diagnostic log is wired');
ok(SRC.includes('source: '+ '(_diag.source') || SRC.includes('source: '+"'+(_diag.source"), 'chart diagnostic source/count/lastTimestamp text is rendered when flag is ON');

if (failures) {
  console.error('\n' + failures + ' backend candle store chart static assertion(s) failed.');
  process.exit(1);
}
console.log('\nAll backend candle store chart static assertions passed.');
