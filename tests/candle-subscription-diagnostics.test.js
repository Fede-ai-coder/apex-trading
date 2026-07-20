'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Candle subscription diagnostics — static/behavior anti-regression checks.
// Run: node tests/candle-subscription-diagnostics.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
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
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

section('1. diagnostics API and ring-buffer helpers exist');
{
  ok(/var _candleSubDiagLog\s*=\s*\[\]/.test(HTML), '1: _candleSubDiagLog exists');
  ok(/function _recordCandleSubscriptionRequest\(/.test(HTML), '1: _recordCandleSubscriptionRequest exists');
  ok(/function _candleDiagSubscriptionState\(/.test(HTML), '1: _candleDiagSubscriptionState exists');
  ok(/function _candleDiagSymbolsPreview\(/.test(HTML), '1: _candleDiagSymbolsPreview exists');
  ok(/window\.apexDebugCandleSubscriptions\s*=\s*apexDebugCandleSubscriptions/.test(HTML), '1: window.apexDebugCandleSubscriptions is exposed');
}

section('2. _ensureCandleSubscription preserves send/queue/dedupe behavior');
{
  const code = [
    'var _CANDLE_TF={"1H":{period:"h",lookbackMs:1},"4H":{period:"4h",lookbackMs:1},"1D":{period:"d",lookbackMs:1},"30M":{period:"30m",lookbackMs:1}};',
    'var _candleSubscribed=new Set(), _candleQueue=[], _candleWsState="CLOSED", _candleWs=null, __sent=[];',
    'var S={ttConnected:true}; function ffPortfolioCandleAutoRefreshEnabled(){return true;} function debugLog(){} function _initCandleStream(){}',
    'function _scannerGuardBlockCandleSub(){return false;} function _cSym(ticker,tf){return ticker+"{="+_CANDLE_TF[tf].period+"}";} function _cSubEntry(ticker,tf){return {type:"Candle",symbol:_cSym(ticker,tf),fromTime:Date.now()-_CANDLE_TF[tf].lookbackMs};}',
    'function _recordCandleSubscriptionRequest(meta){__diag.push(meta);}',
    'var __diag=[];',
    extractFn(HTML, '_ensureCandleSubscription')
  ].join('\n');
  const sb = { Date, JSON };
  vm.createContext(sb); vm.runInContext(code, sb);
  sb._ensureCandleSubscription('AAPL', 'test');
  ok(sb._candleQueue.length === 6, '2: CLOSED socket queues AAPL+SPY across 1H/4H/1D (6 entries)');
  sb._ensureCandleSubscription('AAPL', 'test');
  ok(sb._candleQueue.length === 6 && sb._candleSubscribed.size === 6, '2: second call dedupes without adding queue entries');
  sb._candleWsState = 'READY'; sb._candleWs = { send: (payload) => sb.__sent.push(payload) };
  sb._ensureCandleSubscription('MSFT', 'test');
  ok(sb.__sent.length === 1 && /MSFT/.test(sb.__sent[0]), '2: READY socket sends new add payload for not-yet-subscribed target');
}

section('3. _ensure30MSubscription preserves send/queue/dedupe behavior');
{
  const code = [
    'var _CANDLE_TF={"30M":{period:"30m",lookbackMs:1}};',
    'var _candleSubscribed=new Set(), _candleQueue=[], _candleWsState="CLOSED", _candleWs=null, __sent=[], __diag=[];',
    'var S={ttConnected:true}; function ffPortfolioCandleAutoRefreshEnabled(){return true;} function _initCandleStream(){} function _scannerGuardBlockCandleSub(){return false;} function _cSym(ticker,tf){return ticker+"{="+_CANDLE_TF[tf].period+"}";} function _cSubEntry(ticker,tf){return {type:"Candle",symbol:_cSym(ticker,tf),fromTime:Date.now()-_CANDLE_TF[tf].lookbackMs};} function _recordCandleSubscriptionRequest(meta){__diag.push(meta);}',
    extractFn(HTML, '_ensure30MSubscription')
  ].join('\n');
  const sb = { Date, JSON, console: { log(){} } };
  vm.createContext(sb); vm.runInContext(code, sb);
  sb._ensure30MSubscription('AAPL', 'test');
  ok(sb._candleQueue.length === 2, '3: CLOSED socket queues AAPL+SPY 30M');
  sb._ensure30MSubscription('AAPL', 'test');
  ok(sb._candleQueue.length === 2 && sb._candleSubscribed.size === 2, '3: second call dedupes 30M entries');
  sb._candleWsState = 'READY'; sb._candleWs = { send: (payload) => sb.__sent.push(payload) };
  sb._ensure30MSubscription('MSFT', 'test');
  ok(sb.__sent.length === 1 && /MSFT/.test(sb.__sent[0]), '3: READY socket sends new 30M entry');
}

section('4. diagnostic dump is wired into existing stale/new DXLink guard only for Candle limit errors');
{
  // poll logic now lives in _pollDxlinkStatusOnce (pollDxlinkStatus is a storm-control
  // coalescing wrapper around it).
  const poll = stripComments(extractFn(HTML, '_pollDxlinkStatusOnce'));
  ok(/_dxlinkFeedErrSig\(_feedErr\)/.test(poll) && /_dxlinkFeedErrIsStale\(_feedErr\)/.test(poll), '4: existing signature/stale guard remains in the dxlink poll');
  ok(/_logRecentCandleDiagnosticsForFeedError\(_feedErr\)/.test(poll), '4: new non-stale Candle limit path calls diagnostic dump');
  ok(/Candle[\s\S]*subscription\|limit\|too big/.test(poll), '4: diagnostic dump is scoped to Candle subscription-limit-like messages');
}

section('5. scanner rule/ranking/filter functions are not instrumented');
{
  ['_sfsAnalyzeSymbolTimeframe', '_sfsGetFilteredResults', '_sfsSortResults', 'computeRsCandidates'].forEach((name) => {
    const src = stripComments(extractFn(HTML, name));
    ok(!/_recordCandleSubscriptionRequest|_candleSubDiagLog|apexDebugCandleSubscriptions/.test(src), '5: ' + name + ' has no Candle diagnostic instrumentation');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
