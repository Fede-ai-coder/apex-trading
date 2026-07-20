#!/usr/bin/env node
/*
 * Tests for the SMA20 Rising Defense Rule in the Market Context / VIX Dashboard.
 *
 * index.html is a single monolithic file. These tests extract the REAL rule
 * helpers (_mcxSpy1dSma20Rising / _mcxRenderSma20DefenseRule) plus their data
 * dependency (smA) straight from the source (no copies, so they cannot drift)
 * and run them in a vm sandbox with a minimal fake DOM. This gives genuine
 * behavioral coverage of the rendered rule without a browser.
 *
 * Run: node tests/mcx-sma20-rising-defense-rule.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { loadAppJavaScriptSource, loadIndexHtml } = require('./lib/load-app-source');
// Application JS for function extraction/behaviour checks; raw document for the
// static container-markup / ordering assertions below.
const SRC = loadAppJavaScriptSource();
const DOC = loadIndexHtml();

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failures.push(name); console.log('  FAIL ' + name); }
}

// Extract a top-level `function NAME(...) {...}` by brace-matching, skipping
// braces inside strings / template literals / comments so nested bodies are safe.
function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
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
  throw new Error('unterminated body: ' + name);
}

console.log('MCX SMA20 Rising Defense Rule - tests\n');

// ── Build a sandbox with the real helpers + a minimal fake DOM ───────────────
function makeSandbox(opts) {
  opts = opts || {};
  const host = { innerHTML: 'SENTINEL', style: { display: 'block' } };
  const sandbox = {
    console: { log: function () {} },
    isFinite: isFinite,
    // Data sources are stubbed per-test. Default: no candles available.
    _mcxGetCachedBackendCandles: function () { return opts.backend || null; },
    getDailyCandles: function () { return opts.daily || null; },
    document: {
      getElementById: function (id) { return id === 'mcx-sma20-defense-rule' ? (opts.noHost ? null : host) : null; },
    },
    __host: host,
  };
  vm.createContext(sandbox);
  const code = [
    extractFn(SRC, 'smA'),
    extractFn(SRC, '_mcxSpy1dSma20Rising'),
    extractFn(SRC, '_mcxRenderSma20DefenseRule'),
  ].join('\n\n');
  vm.runInContext(code, sandbox);
  return sandbox;
}

// Daily candles whose SMA20 is rising (monotonically increasing closes).
function risingCandles(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ close: 400 + i }); // strictly increasing → SMA20 rising
  return out;
}
// Daily candles whose SMA20 is falling (monotonically decreasing closes).
function fallingCandles(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ close: 400 - i }); // strictly decreasing → SMA20 falling
  return out;
}

// 1. Rising SMA20 → full rule rendered ----------------------------------------
{
  const sb = makeSandbox({ daily: risingCandles(40) });
  const info = sb._mcxSpy1dSma20Rising();
  check('1. _mcxSpy1dSma20Rising detects rising (current > previous)', !!info && info.rising === true);
  sb._mcxRenderSma20DefenseRule();
  const html = sb.__host.innerHTML;
  check('1. rule rendered (container populated, made visible)',
    html.includes('SMA20 Rising Defense Rule') && sb.__host.style.display === '');

  // 2. Includes "Do not open new bear call spreads" ---------------------------
  check('2. includes "Do not open new bear call spreads"',
    html.includes('Do not open new bear call spreads'));

  // 3. Includes "Do not use short calls as a primary portfolio defense" -------
  check('3. includes "Do not use short calls as a primary portfolio defense"',
    html.includes('Do not use short calls as a primary portfolio defense'));

  // 4. Includes the preferred risk-reduction alternatives ---------------------
  check('4a. preferred alt: partial position closures', html.includes('partial position closures'));
  check('4b. preferred alt: reducing overall portfolio size', html.includes('reducing overall portfolio size'));
  check('4c. preferred alt: rolling threatened puts', html.includes('rolling threatened puts'));
  check('4d. preferred alt: long puts / protective long-vega structures',
    html.includes('long puts') && html.includes('protective long-vega'));
  check('4e. preferred alt: taking profits to lower net exposure',
    html.includes('taking profits') && html.includes('lower net exposure'));

  // Also surfaces the "consider short calls only when" conditions + rationale.
  check('4f. short-call conditions present (VIX elevated / broken below SMA20 / flattening / momentum)',
    html.includes('VIX is elevated') &&
    html.includes('clearly broken below SMA20') &&
    html.includes('flattening or declining') &&
    html.includes('downside momentum is confirmed'));
  check('4g. rationale present', html.includes('Rationale') && html.includes('rising SMA20 indicates an underlying bullish trend'));
}

// 5a. SMA20 missing / no candle data → no crash, no rule ----------------------
{
  const sb = makeSandbox({}); // no backend, no daily
  let threw = false;
  try { sb._mcxRenderSma20DefenseRule(); } catch (e) { threw = true; }
  check('5a. missing SMA20 data does not crash render', !threw);
  check('5a. missing SMA20 data renders no rule (container cleared, hidden)',
    sb.__host.innerHTML === '' && sb.__host.style.display === 'none');
  check('5a. _mcxSpy1dSma20Rising returns null on missing data', sb._mcxSpy1dSma20Rising() === null);
}

// 5b. Too few bars for SMA20 → no crash, returns null -------------------------
{
  const sb = makeSandbox({ daily: risingCandles(10) }); // < 21 bars
  let threw = false;
  try { sb._mcxRenderSma20DefenseRule(); } catch (e) { threw = true; }
  check('5b. insufficient bars does not crash', !threw);
  check('5b. insufficient bars returns null', sb._mcxSpy1dSma20Rising() === null);
  check('5b. insufficient bars renders no rule', sb.__host.innerHTML === '');
}

// 5c. SMA20 not rising (falling) → no rule, no crash --------------------------
{
  const sb = makeSandbox({ daily: fallingCandles(40) });
  const info = sb._mcxSpy1dSma20Rising();
  check('5c. falling SMA20 detected as not rising', !!info && info.rising === false);
  sb._mcxRenderSma20DefenseRule();
  check('5c. falling SMA20 renders no rule (container cleared, hidden)',
    sb.__host.innerHTML === '' && sb.__host.style.display === 'none');
}

// 5d. Missing container element → silent no-op (dashboard / other views) ------
{
  const sb = makeSandbox({ daily: risingCandles(40), noHost: true });
  let threw = false;
  try { sb._mcxRenderSma20DefenseRule(); } catch (e) { threw = true; }
  check('5d. absent container is a silent no-op (no crash)', !threw);
}

// 6. Existing VIX regime rules continue to render unchanged -------------------
// The new rule lives in its OWN container and rendering path. Assert the regime
// rendering helpers + content map are untouched and that the new rule does not
// write into the regime alert container.
check('6. _REGIME_CONTENT map still present', SRC.includes('_REGIME_CONTENT'));
check('6. _regimeSections renderer still present', SRC.includes('function _regimeSections'));
check('6. _regimeRenderMain still renders into #mcx-regime-alert',
  extractFn(SRC, '_regimeRenderMain').includes('mcx-regime-alert'));
check('6. SMA20 rule targets its own container only (#mcx-sma20-defense-rule)',
  extractFn(SRC, '_mcxRenderSma20DefenseRule').includes('mcx-sma20-defense-rule') &&
  !extractFn(SRC, '_mcxRenderSma20DefenseRule').includes('mcx-regime-alert'));
check('6. _regimeRefresh wires in the SMA20 rule (auto-updates on Market Context refresh)',
  extractFn(SRC, '_regimeRefresh').includes('_mcxRenderSma20DefenseRule()'));

// Integration: container exists in the MCX HTML, near the regime alert --------
check('container #mcx-sma20-defense-rule exists in MCX HTML', DOC.includes('id="mcx-sma20-defense-rule"'));
check('container placed after the regime transition (near VIX regime rules)',
  DOC.indexOf('id="mcx-regime-transition"') < DOC.indexOf('id="mcx-sma20-defense-rule"') &&
  DOC.indexOf('id="mcx-sma20-defense-rule"') < DOC.indexOf('Row 1: VIX curve'));

// Reuse contract: no new fetch / socket introduced by the rule helpers --------
{
  const region = extractFn(SRC, '_mcxSpy1dSma20Rising') + '\n' + extractFn(SRC, '_mcxRenderSma20DefenseRule');
  check('reuses existing candle sources (backend cache + getDailyCandles)',
    region.includes('_mcxGetCachedBackendCandles') && region.includes('getDailyCandles'));
  check('no new fetch in rule helpers', !region.includes('fetch('));
  check('no new WebSocket in rule helpers', !region.includes('new WebSocket'));
  check('rule helpers are defensive (try/catch)',
    extractFn(SRC, '_mcxSpy1dSma20Rising').includes('try') &&
    extractFn(SRC, '_mcxRenderSma20DefenseRule').includes('catch'));
}

// ---------------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('ALL TESTS PASSED');
