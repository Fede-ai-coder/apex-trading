#!/usr/bin/env node
// Static guardrails for frontend Candle subscription diagnostics.
// Run: node tests/candle-subscription-diagnostics.test.js

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function stripComments(src) {
  return String(src || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}
function extractFn(src, name) {
  const idx = src.indexOf('function ' + name + '(');
  assert(idx >= 0, 'function not found: ' + name);
  const brace = src.indexOf('{', idx);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(idx, i + 1);
    }
  }
  throw new Error('unterminated function: ' + name);
}
function ok(cond, msg) { assert.ok(cond, msg); console.log('ok - ' + msg); }
function section(name) { console.log('\n# ' + name); }

section('1. SFS RS remains read-only for SPY warmup/ensure');
{
  const body = stripComments(extractFn(HTML, '_sfsDrawRsPanel') + '\n' + extractFn(HTML, '_sfsEnsureTfCandles'));
  ok(!/_ensureCandleSubscription\s*\(/.test(body), 'SFS RS does not call _ensureCandleSubscription');
  ok(!/_ensure30MSubscription\s*\(/.test(body), 'SFS RS does not call _ensure30MSubscription');
  ok(!/_sfsWarmupBatch\s*\(\s*\[\s*['"]SPY['"]/.test(body), 'SFS RS does not warm SPY directly');
  ok(/_sfsCandlesFromSyncSource\(\s*['"]SPY['"]\s*,\s*tf\s*\)/.test(body), 'SFS RS reads SPY from sync cache/buffer only');
}

section('2. diagnostic wrapper records without changing subscription behavior');
{
  const ensure = stripComments(extractFn(HTML, '_ensureCandleSubscription'));
  const ensure30 = stripComments(extractFn(HTML, '_ensure30MSubscription'));
  ok(/_recordCandleSubscriptionRequest\s*\(/.test(ensure), '_ensureCandleSubscription records diagnostics');
  ok(/_recordCandleSubscriptionRequest\s*\(/.test(ensure30), '_ensure30MSubscription records diagnostics');
  ok(/_candleSubscribed\.has\(key\)/.test(ensure) && /_candleSubscribed\.add\(key\)/.test(ensure), '1H/4H/1D dedupe registry remains in place');
  ok(/FEED_SUBSCRIPTION/.test(ensure) && /add:\s*toAdd/.test(ensure), '1H/4H/1D still sends the original add payload');
  ok(/_candleQueue\s*=\s*_candleQueue\.concat\(toAdd\)/.test(ensure), '1H/4H/1D queue behavior is preserved');
  ok(/_candleSubscribed\.has\(key\)/.test(ensure30) && /_candleSubscribed\.add\(key\)/.test(ensure30), '30M dedupe registry remains in place');
  ok(/FEED_SUBSCRIPTION/.test(ensure30) && /add:\s*\[entry\]/.test(ensure30), '30M still sends the original single-entry add payload');
  ok(/_candleQueue\.push\(entry\)/.test(ensure30), '30M queue behavior is preserved');
}

section('3. new Candle feed limit error logs recent diagnostics once');
{
  const poll = stripComments(extractFn(HTML, 'pollDxlinkStatus'));
  const logger = stripComments(extractFn(HTML, '_logRecentCandleDiagnosticsForFeedError'));
  ok(/_dxlinkFeedErrSig\(data\)/.test(poll), 'status poll uses PR208 feed error signature helper');
  ok(/_dxlinkFeedErrIsStale\(data\)/.test(poll), 'status poll uses PR208 stale feed error helper');
  ok(/feedErr\s*&&\s*feedErrSig\s*&&\s*!feedErrStale\s*&&\s*feedErrSig\s*!==\s*_dxlinkLoggedFeedErrSig/.test(poll), 'status poll only logs genuinely new non-stale feed errors');
  ok(/_dxlinkLoggedFeedErrSig\s*=\s*feedErrSig/.test(poll), 'status poll updates PR208 logged signature');
  ok(/_logRecentCandleDiagnosticsForFeedError\(feedErr\)/.test(poll), 'new feed-error branch delegates to candle diagnostics');
  ok(/candle/i.test(logger) && /subscription/i.test(logger), 'logger filters to Candle subscription errors');
  ok(/_candleSubDiagLog\.slice\(-20\)/.test(logger), 'logger prints the last 20 diagnostic entries');
}

section('4. scanner rule/ranking/filter functions untouched by diagnostics');
{
  const guarded = [
    'computeRsCandidates',
    '_sfsAnalyzeSymbolTimeframe',
    '_sfsFindCandidates',
    '_sfsRankCandidates',
    '_sfsGetFilteredResults'
  ].filter((name) => HTML.indexOf('function ' + name + '(') >= 0);
  ok(guarded.length >= 2, 'found scanner rule/ranking/filter functions to guard');
  guarded.forEach((name) => {
    const body = stripComments(extractFn(HTML, name));
    ok(!/_recordCandleSubscriptionRequest|apexDebugCandleSubscriptions|CANDLE-DIAG/.test(body), name + ' contains no diagnostic instrumentation');
  });
}

section('5. all requested frontend Candle entry points are instrumented');
{
  [
    '_rsEnsure5MSubscription',
    '_rsEnsure1DSub',
    '_rsRestoreLiveSubscriptions',
    '_sfsWarmupBatch',
    '_fetchPretradeBackendCandles',
    '_portfolioFetchBackendCandlesForChart',
    '_scannerFetchBackendCandlesForChart',
    '_mcxFetchBackendCandlesForChart'
  ].forEach((name) => {
    const body = stripComments(extractFn(HTML, name));
    ok(/_recordCandleSubscriptionRequest\s*\(/.test(body), name + ' records Candle diagnostics');
  });
  ok(/window\.apexDebugCandleSubscriptions\s*=\s*apexDebugCandleSubscriptions/.test(HTML), 'debug helper is exposed on window');
}

console.log('\nAll candle subscription diagnostic tests passed.');
