'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const BASE_SHA = '34bc48ae33bf3b0044572457615f7e6efda547c0';
const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/services/mcx-market-context-service.js';
const MODULE_PATH = path.join(ROOT, MODULE_REL);
const TEST_PATH = path.join(ROOT, 'tests/mcx-market-context-service-boundary-contract.test.js');
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

function fail(msg) { throw new Error('MCX contract bootstrap: ' + msg); }
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

function extractFunction(src, name) {
  const prefixes = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const prefix of prefixes) {
    const i = src.indexOf(prefix);
    if (i >= 0 && (start < 0 || i < start)) start = i;
  }
  if (start < 0) fail('function not found: ' + name);
  const open = src.indexOf('{', start);
  if (open < 0) fail('body not found: ' + name);
  let depth = 0, str = null, esc = false, line = false, block = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
    if (str) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === '/' && n === '/') { line = true; i++; continue; }
    if (c === '/' && n === '*') { block = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { str = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  fail('unterminated function: ' + name);
}

function extractPending(src) {
  const re = /\bvar\s+_vixFamilyPending\s*=\s*null\s*;/g;
  const m = Array.from(src.matchAll(re));
  if (m.length !== 1) fail('expected one _vixFamilyPending declaration, got ' + m.length);
  return m[0][0];
}

function declaration(src, name) {
  return name === '_vixFamilyPending' ? extractPending(src) : extractFunction(src, name);
}

const moduleSource = fs.readFileSync(MODULE_PATH, 'utf8');
const baseIndex = cp.execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});

const manifest = ORDER.map((name) => {
  const before = declaration(baseIndex, name);
  const after = declaration(moduleSource, name);
  if (before !== after) fail('byte identity failed for ' + name);
  return { name, chars: before.length, sha256: sha256(before) };
});

const test = `'use strict';
// MCX Market Context / VIX service extraction boundary contract.
// Base identity: ${BASE_SHA}
// This test protects a relocation only: the 15 declarations below must remain
// byte-identical to the audited base while UI/orchestration stays outside.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { loadIndexHtml, loadAppJavaScriptSource } = require('./lib/load-app-source');

const BASE_SHA = '${BASE_SHA}';
const MODULE_REL = '${MODULE_REL}';
const MODULE = fs.readFileSync(path.join(__dirname, '..', MODULE_REL), 'utf8');
const INDEX = loadIndexHtml();
const APP = loadAppJavaScriptSource();
const ORDER = ${JSON.stringify(ORDER, null, 2)};
const MANIFEST = ${JSON.stringify(manifest, null, 2)};

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function hash(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function escRe(s) { return s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'); }

function extractFunctionSpan(src, name) {
  const prefixes = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const prefix of prefixes) {
    const i = src.indexOf(prefix);
    if (i >= 0 && (start < 0 || i < start)) start = i;
  }
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  let depth = 0, str = null, esc = false, line = false, block = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (line) { if (c === '\\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
    if (str) {
      if (esc) { esc = false; continue; }
      if (c === '\\\\') { esc = true; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === '/' && n === '/') { line = true; i++; continue; }
    if (c === '/' && n === '*') { block = true; i++; continue; }
    if (c === "'" || c === '"' || c === '\\`') { str = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { name, start, end: i + 1, source: src.slice(start, i + 1) };
    }
  }
  return null;
}

function extractPendingSpan(src) {
  const re = /\\bvar\\s+_vixFamilyPending\\s*=\\s*null\\s*;/g;
  const m = Array.from(src.matchAll(re));
  if (m.length !== 1) return null;
  return { name: '_vixFamilyPending', start: m[0].index, end: m[0].index + m[0][0].length, source: m[0][0] };
}
function span(src, name) { return name === '_vixFamilyPending' ? extractPendingSpan(src) : extractFunctionSpan(src, name); }
function functionCount(src, name) {
  return (src.match(new RegExp('(?:async\\\\s+)?function\\\\s+' + escRe(name) + '\\\\s*\\\\(', 'g')) || []).length;
}

console.log('MCX market-context service boundary contract');
console.log('base=' + BASE_SHA);

const tag = '<script src="./' + MODULE_REL + '"></script>';
ok((INDEX.split(tag).length - 1) === 1, 'module has exactly one classic script tag');
const tagAt = INDEX.indexOf(tag);
const nextScriptAt = INDEX.indexOf('<script', tagAt + tag.length);
const nextScriptEnd = nextScriptAt >= 0 ? INDEX.indexOf('>', nextScriptAt) : -1;
const nextTag = nextScriptEnd >= 0 ? INDEX.slice(nextScriptAt, nextScriptEnd + 1) : '';
ok(tagAt >= 0 && nextScriptAt > tagAt && !/\\bsrc\\s*=/i.test(nextTag), 'module loads immediately before the residual inline application script');
ok(!/\\b(?:async|defer|type)\\s*=/i.test(tag), 'module tag is classic and synchronous');

const spans = ORDER.map((name) => span(MODULE, name));
ok(spans.every(Boolean), 'all 15 declarations exist in the module');
const actualOrder = spans.filter(Boolean).slice().sort((a,b) => a.start - b.start).map(x => x.name);
ok(JSON.stringify(actualOrder) === JSON.stringify(ORDER), 'relative declaration order is 15/15 preserved');

for (const expected of MANIFEST) {
  const s = span(MODULE, expected.name);
  ok(!!s && s.source.length === expected.chars, expected.name + ' character identity');
  ok(!!s && hash(s.source) === expected.sha256, expected.name + ' SHA-256 identity');
  if (expected.name === '_vixFamilyPending') {
    ok(!/\\bvar\\s+_vixFamilyPending\\s*=\\s*null\\s*;/.test(INDEX), '_vixFamilyPending has no residual inline declaration');
    ok((APP.match(/\\bvar\\s+_vixFamilyPending\\s*=\\s*null\\s*;/g) || []).length === 1, '_vixFamilyPending has one app-wide declaration');
  } else {
    ok(functionCount(INDEX, expected.name) === 0, expected.name + ' has no residual inline definition');
    ok(functionCount(APP, expected.name) === 1, expected.name + ' has one app-wide definition');
  }
}

let remainder = MODULE;
for (const s of spans.filter(Boolean).slice().sort((a,b) => b.start - a.start)) {
  remainder = remainder.slice(0, s.start) + remainder.slice(s.end);
}
remainder = remainder.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/^\\s*\\/\\/.*$/gm, '').trim();
ok(remainder === '', 'module contains declarations/comments only; no bootstrap statement');
try {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(sandbox._vixFamilyPending === null, 'module evaluates inertly and initializes only the existing pending state');
} catch (e) {
  console.log('  load-time error:', e && e.stack || e);
  ok(false, 'module evaluates inertly');
}

const OUTSIDE = [
  '_mcxUpdateSnapshotStatus', '_mcxBackendTech', '_mcxFormatTechValue',
  '_mcxTechBiasLabel', '_mcxPriceVsSmaLabel', '_mcxSqueezeLabel',
  '_mcxRenderBackendTechnicalSummary', '_mcxRefreshVixData', '_ensureVixFamily',
  'refreshSharedMarketRegime', 'computeMarketRegime', 'ffMcxBackendSnapshot'
];
for (const name of OUTSIDE) {
  ok(!new RegExp('(?:async\\\\s+)?function\\\\s+' + escRe(name) + '\\\\s*\\\\(').test(MODULE), name + ' stays outside the service module');
  ok(new RegExp('(?:async\\\\s+)?function\\\\s+' + escRe(name) + '\\\\s*\\\\(').test(APP), name + ' remains available app-wide');
}

const cascade = span(MODULE, '_fetchVixFamilyBackendFirst').source;
const iSnapshot = cascade.indexOf('fetchMarketContextSnapshotFromBackend(');
const iDedicated = cascade.indexOf('fetchMarketContextVixFamilyFromBackend(');
const iDxlink = cascade.indexOf('fetchVixFamily(');
ok(iSnapshot >= 0 && iDedicated > iSnapshot && iDxlink > iDedicated, 'VIX source cascade remains snapshot -> dedicated backend -> DXLink');
const normalizer = span(MODULE, '_normalizeBackendVixFamily').source;
ok(normalizer.includes('vf.vix3m != null ? vf.vix3m : vf.vi3m'), 'vi3m -> vix3m compatibility remains intact');
const freshness = span(MODULE, '_applyFreshVixFamily').source;
ok(freshness.indexOf('_vixFamilyHasAnyValue(newVf)') >= 0 && freshness.indexOf('_vixFamilyHasAnyValue(newVf)') < freshness.indexOf('S.vixFamily = newVf'), 'all-null guard still precedes VIX-family assignment');
const ensure = span(APP, '_ensureVixFamily').source;
ok(ensure.includes('_vixFamilyPending'), 'inline orchestrator still consumes the moved single-flight state');
ok(!MODULE.includes('document.'), 'service module owns no DOM access');
ok(!MODULE.includes('_mcxDraw'), 'service module owns no MCX rendering');

console.log('\\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('ALL TESTS PASSED');
`;

fs.writeFileSync(TEST_PATH, test, 'utf8');
console.log('generated ' + path.relative(ROOT, TEST_PATH));
console.log('manifest declarations=' + manifest.length);
for (const x of manifest) console.log(x.name + ' chars=' + x.chars + ' sha256=' + x.sha256);
