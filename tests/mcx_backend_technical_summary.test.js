#!/usr/bin/env node
/*
 * Static source-level tests for the MCX Backend Technical Summary (V1).
 *
 * index.html is a single monolithic file (no module system / no DOM test harness),
 * so these are lightweight static assertions over the source text. They guard the
 * V1 scope contract for the technical summary: it reads the backend snapshot
 * technicals, supports the four required rows, is feature-flag gated, is defensive,
 * and does NOT migrate charts or introduce new data sources / sockets.
 *
 * Run: node tests/mcx_backend_technical_summary.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const { loadAppJavaScriptSource, loadIndexHtml } = require('./lib/load-app-source');
// Application JS for function extraction/behaviour checks; raw document for the
// single static container-markup assertion below.
const SRC = loadAppJavaScriptSource();
const DOC = loadIndexHtml();

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failures.push(name); console.log('  FAIL ' + name); }
}
// Extract a function body by brace matching, starting at `function <name>`.
function fnBody(name) {
  const start = SRC.indexOf('function ' + name);
  if (start === -1) return '';
  const open = SRC.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    const c = SRC[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return SRC.slice(start, i + 1); }
  }
  return SRC.slice(start);
}

console.log('MCX Backend Technical Summary (V1) - static tests\n');

// 1. Helpers exist ------------------------------------------------------------
const renderBody = fnBody('_mcxRenderBackendTechnicalSummary');
const techBody   = fnBody('_mcxBackendTech');
check('1. _mcxRenderBackendTechnicalSummary helper exists', renderBody.length > 0);
check('1. _mcxBackendTech helper exists', techBody.length > 0);
check('1. _mcxFormatTechValue helper exists', fnBody('_mcxFormatTechValue').length > 0);
check('1. _mcxTechBiasLabel helper exists', fnBody('_mcxTechBiasLabel').length > 0);
check('1. _mcxPriceVsSmaLabel helper exists', fnBody('_mcxPriceVsSmaLabel').length > 0);
check('1. _mcxSqueezeLabel helper exists', fnBody('_mcxSqueezeLabel').length > 0);

// 2. Reads from S.marketContextSnapshot.data.technicals ----------------------
check('2. _mcxBackendTech reads S.marketContextSnapshot', techBody.includes('S.marketContextSnapshot'));
check('2. _mcxBackendTech reads .data.technicals', techBody.includes('.data.technicals') || techBody.includes('data.technicals'));

// 3. Supports SPY 1D / SPY 4H / VI3M 1D / VI3M 4H ----------------------------
check('3. render supports SPY 1D', /sym:'SPY'[^]*?tf:'1D'/.test(renderBody));
check('3. render supports SPY 4H', /sym:'SPY'[^]*?tf:'4H'/.test(renderBody));
check('3. render supports VI3M 1D', /sym:'VI3M'[^]*?tf:'1D'/.test(renderBody));
check('3. render supports VI3M 4H', /sym:'VI3M'[^]*?tf:'4H'/.test(renderBody));

// 4. Does not modify _drawCandleChart ----------------------------------------
const summaryRegion = [renderBody, techBody, fnBody('_mcxFormatTechValue'),
  fnBody('_mcxTechBiasLabel'), fnBody('_mcxPriceVsSmaLabel'), fnBody('_mcxSqueezeLabel')].join('\n');
check('4. summary code does not call/alter _drawCandleChart', !summaryRegion.includes('_drawCandleChart'));
check('4. _drawCandleChart still present in source (unchanged pipeline)', SRC.includes('_drawCandleChart'));

// 5. No Yahoo ----------------------------------------------------------------
check('5. no Yahoo introduced by technical summary', !/yahoo/i.test(summaryRegion));

// 6. No new WebSocket --------------------------------------------------------
check('6. no new WebSocket created by technical summary', !summaryRegion.includes('new WebSocket'));

// 7. Preserves _ensureVixFamily fallback -------------------------------------
const refreshVixBody = fnBody('_mcxRefreshVixData');
check('7. _ensureVixFamily fallback preserved in _mcxRefreshVixData', refreshVixBody.includes('_ensureVixFamily'));
check('7. _ensureVixFamily still defined', SRC.includes('function _ensureVixFamily'));

// 8. Gated by apex_ff_mcx_backend_snapshot / snapshot availability -----------
check('8. _mcxBackendTech gated by ffMcxBackendSnapshot()', techBody.includes('ffMcxBackendSnapshot()'));
check('8. render gated by ffMcxBackendSnapshot()', renderBody.includes('ffMcxBackendSnapshot()'));
check('8. render clears its container when flag OFF',
  /ffMcxBackendSnapshot\(\)[^]*?host\.innerHTML\s*=\s*''/.test(renderBody));

// 9. Handles missing technicals defensively ----------------------------------
check('9. _mcxBackendTech wrapped in try/catch', techBody.includes('try') && techBody.includes('catch'));
check('9. _mcxBackendTech returns null on missing data', techBody.includes('return null'));
check('9. render wrapped in try/catch (never throws into render loop)',
  renderBody.includes('try') && renderBody.includes('catch'));
check('9. render handles snapshot unavailable (shows unavailable / N/A)',
  renderBody.includes('unavailable') || renderBody.includes('N/A'));
check('9. helpers tolerate missing rows (N/A guards present)',
  fnBody('_mcxFormatTechValue').includes("'N/A'") && fnBody('_mcxTechBiasLabel').includes("'N/A'"));
// Zero usable rows: a single subtle waiting line, NOT four N/A cards.
check('9. zero usable rows short-circuits (usedBackend === 0 early return)',
  /usedBackend === 0[^]*?host\.innerHTML[^]*?return;/.test(renderBody));
check('9. zero usable rows shows subtle "waiting for backend technicals" line',
  renderBody.includes('waiting for backend technicals'));

// Integration + UI container --------------------------------------------------
check('UI container #mcx-backend-tech-summary exists in MCX HTML',
  DOC.includes('id="mcx-backend-tech-summary"'));
check('summary rendered after charts (_mcxRenderCharts calls render)',
  fnBody('_mcxRenderCharts').includes('_mcxRenderBackendTechnicalSummary('));
check('summary rendered on refresh/init path (_mcxRefreshVixData drawAndStatus calls render)',
  refreshVixBody.includes('_mcxRenderBackendTechnicalSummary('));
check('emits "[MCX-SNAPSHOT] backend technical summary rendered" log',
  renderBody.includes('[MCX-SNAPSHOT] backend technical summary rendered'));
check('status indicator extended with "Technicals: Backend Snapshot"',
  SRC.includes('Technicals: Backend Snapshot'));

// Displayed fields ------------------------------------------------------------
check('displays close', renderBody.includes('Close'));
check('displays RSI14', renderBody.includes('RSI14'));
check('displays SMA20 vs SMA30 structure', renderBody.includes('Structure'));
check('displays price vs SMA20', renderBody.includes('vs SMA20'));
check('displays price vs SMA30', renderBody.includes('vs SMA30'));
check('displays squeeze', renderBody.includes('Squeeze'));

// Production backend guard unchanged -----------------------------------------
check('PROD_BACKEND points to production railway host (unchanged)',
  SRC.includes("const PROD_BACKEND = 'https://apex-tastytrade-backend-production.up.railway.app'"));
const resolveBody = fnBody('resolveBackendUrl');
check('resolveBackendUrl still defaults to PROD_BACKEND', resolveBody.includes('return PROD_BACKEND'));
check('summary code does not hardcode the dev backend URL',
  !summaryRegion.includes('backend-dev-production'));

// ---------------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('ALL TESTS PASSED');
