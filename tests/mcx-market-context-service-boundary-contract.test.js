'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX Market Context / VIX service extraction boundary contract.
//
// Audited base: dev-clean @ 34bc48ae33bf3b0044572457615f7e6efda547c0
// Scope: relocation only. The service module is pinned as the exact file produced
// from that base, while MCX presentation and orchestration must stay outside it.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { loadIndexHtml, loadAppJavaScriptSource } = require('./lib/load-app-source');

const BASE_SHA = '34bc48ae33bf3b0044572457615f7e6efda547c0';
const MODULE_REL = 'js/services/mcx-market-context-service.js';
const EXPECTED_MODULE_GIT_BLOB = 'ccf5b85fc33c2181e9087622654b34927a08416e';
const MODULE = fs.readFileSync(path.join(__dirname, '..', MODULE_REL), 'utf8');
const INDEX = loadIndexHtml();
const APP = loadAppJavaScriptSource();

const ORDER = [
  '_vixFamilyTimestampMs',
  '_vixFamilyHasAnyValue',
  '_applyFreshVixFamily',
  'fetchVixFamily',
  '_vixFamilyPending',
  '_cachePortfolioMarketContextSnapshot',
  'fetchMarketContextSnapshotFromBackend',
  '_mcxFiniteNum',
  'fetchMarketContextVixFamilyFromBackend',
  '_normalizeBackendVixFamily',
  '_applyNormalizedVixFamily',
  '_applyBackendVixFamily',
  '_fetchVixFamilyBackendFirst',
  '_vixFamilyDirectWsFallbackAllowed',
  '_mcxApplyBackendSnapshot',
];

const OUTSIDE = [
  '_mcxUpdateSnapshotStatus',
  '_mcxBackendTech',
  '_mcxFormatTechValue',
  '_mcxTechBiasLabel',
  '_mcxPriceVsSmaLabel',
  '_mcxSqueezeLabel',
  '_mcxRenderBackendTechnicalSummary',
  '_mcxRefreshVixData',
  '_ensureVixFamily',
  'refreshSharedMarketRegime',
  'computeMarketRegime',
  'ffMcxBackendSnapshot',
];

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log('  PASS  ' + msg);
  } else {
    failed++;
    console.log('  FAIL  ' + msg);
  }
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from('blob ' + body.length + '\0', 'utf8'))
    .update(body)
    .digest('hex');
}

function functionCount(src, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g');
  return (src.match(re) || []).length;
}

function extractFunctionSpan(src, name) {
  const prefixes = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const prefix of prefixes) {
    const at = src.indexOf(prefix);
    if (at >= 0 && (start < 0 || at < start)) start = at;
  }
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  if (open < 0) return null;

  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; i++; }
      continue;
    }
    if (stringQuote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === stringQuote) stringQuote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === "'" || c === '"' || c.charCodeAt(0) === 96) { stringQuote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        return { name, start, end: i + 1, source: src.slice(start, i + 1) };
      }
    }
  }
  return null;
}

function pendingSpan(src) {
  const re = /\bvar\s+_vixFamilyPending\s*=\s*null\s*;/g;
  const matches = Array.from(src.matchAll(re));
  if (matches.length !== 1) return null;
  const m = matches[0];
  return { name: '_vixFamilyPending', start: m.index, end: m.index + m[0].length, source: m[0] };
}

function span(src, name) {
  return name === '_vixFamilyPending' ? pendingSpan(src) : extractFunctionSpan(src, name);
}

console.log('MCX market-context service boundary contract');
console.log('base=' + BASE_SHA);

// 1. Whole-file identity: this pins every moved declaration byte-for-byte as one
// immutable artifact produced from the audited base, including declaration order.
ok(gitBlobSha(MODULE) === EXPECTED_MODULE_GIT_BLOB,
  'service module Git blob identity matches audited extraction');
ok(MODULE.includes('Extracted from dev-clean @ ' + BASE_SHA),
  'module records the exact audited base SHA');

// 2. Script ownership / load order.
const tag = '<script src="./' + MODULE_REL + '"></script>';
ok((INDEX.split(tag).length - 1) === 1, 'exactly one classic service script tag exists');
const tagAt = INDEX.indexOf(tag);
const nextScriptAt = INDEX.indexOf('<script', tagAt + tag.length);
const nextScriptEnd = nextScriptAt >= 0 ? INDEX.indexOf('>', nextScriptAt) : -1;
const nextTag = nextScriptEnd >= 0 ? INDEX.slice(nextScriptAt, nextScriptEnd + 1) : '';
ok(tagAt >= 0 && nextScriptAt > tagAt && !/\bsrc\s*=/i.test(nextTag),
  'service loads immediately before the residual inline application script');
ok(!/\b(?:async|defer|type)\s*=/i.test(tag),
  'service tag is classic and synchronous');

// 3. Exact declaration inventory and order.
const spans = ORDER.map((name) => span(MODULE, name));
ok(spans.every(Boolean), 'all 15 service declarations are present');
const actualOrder = spans.filter(Boolean).slice().sort((a, b) => a.start - b.start).map((x) => x.name);
ok(JSON.stringify(actualOrder) === JSON.stringify(ORDER), 'relative order is preserved 15/15');

for (const name of ORDER) {
  if (name === '_vixFamilyPending') {
    ok(!/\bvar\s+_vixFamilyPending\s*=\s*null\s*;/.test(INDEX),
      '_vixFamilyPending has no residual inline declaration');
    ok((APP.match(/\bvar\s+_vixFamilyPending\s*=\s*null\s*;/g) || []).length === 1,
      '_vixFamilyPending has exactly one app-wide declaration');
  } else {
    ok(functionCount(INDEX, name) === 0, name + ' has no residual inline definition');
    ok(functionCount(APP, name) === 1, name + ' has exactly one app-wide definition');
  }
}

// 4. Load-time safety: declarations + the pre-existing pending=null state may be
// evaluated before the monolith without touching S, DOM, storage, network or UI.
try {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(sandbox._vixFamilyPending === null, 'load-time evaluation preserves pending=null');
  ok(ORDER.every((name) => name in sandbox), 'all 15 globals are available after classic-script evaluation');
} catch (e) {
  console.log(e && e.stack || e);
  ok(false, 'service evaluates without load-time dependency access');
  ok(false, 'all 15 globals are available after evaluation');
}
ok(!MODULE.includes('document.'), 'service owns no DOM access');
ok(!MODULE.includes('_mcxDraw'), 'service owns no MCX rendering');
ok(!MODULE.includes('setInterval('), 'service creates no recurring timer');

// 5. Presentation and orchestration remain deliberately outside MCX-1.
for (const name of OUTSIDE) {
  ok(functionCount(MODULE, name) === 0, name + ' stays outside the service module');
  ok(functionCount(APP, name) === 1, name + ' remains available app-wide');
}

// 6. Critical behaviour invariants of the relocated service.
const cascade = span(MODULE, '_fetchVixFamilyBackendFirst').source;
const iSnapshot = cascade.indexOf('fetchMarketContextSnapshotFromBackend(');
const iDedicated = cascade.indexOf('fetchMarketContextVixFamilyFromBackend(');
const iDxlink = cascade.indexOf('fetchVixFamily(');
ok(iSnapshot >= 0 && iDedicated > iSnapshot && iDxlink > iDedicated,
  'VIX source cascade remains snapshot -> dedicated backend -> DXLink');

const normalizer = span(MODULE, '_normalizeBackendVixFamily').source;
ok(normalizer.includes('vf.vix3m != null ? vf.vix3m : vf.vi3m'),
  'vi3m -> vix3m compatibility remains unchanged');

const freshness = span(MODULE, '_applyFreshVixFamily').source;
const guardAt = freshness.indexOf('_vixFamilyHasAnyValue(newVf)');
const writeAt = freshness.indexOf('S.vixFamily = newVf');
ok(guardAt >= 0 && writeAt > guardAt,
  'all-null guard still runs before S.vixFamily assignment');

const ensure = span(APP, '_ensureVixFamily');
ok(!!ensure && ensure.source.includes('_vixFamilyPending'),
  'inline orchestrator still consumes moved single-flight state');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('ALL TESTS PASSED');
