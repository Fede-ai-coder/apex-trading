'use strict';

// Read-only audit for the next extraction after Journal UI (#396).
//
// This file deliberately changes no production source. It proves the exact
// inert prefix of JOURNAL REMOTE PERSISTENCE that can move next, inventories
// its state/dependencies/consumers/test fallout, and rejects the adjacent
// wrapper layer because that layer performs load-time reads and reassignments.
// The audit is temporary: the extraction PR must replace it with a permanent
// boundary contract and a byte-exact undo helper.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '8dd5ef9e53fe6637e852ddc58e905cc5aa2e2c9b';
const BASE_TREE = '9eeddc89012bd44762aef7294f589a86055d203c';
const AUDIT_REL = 'tests/temporary-journal-remote-post-ui-audit.test.js';
const FUTURE_MODULE_REL = 'js/services/journal-remote-persistence.js';
const FUTURE_TAG = '<script src="./js/services/journal-remote-persistence.js"></script>';
const UI_TAG = '<script src="./js/ui/journal-ui.js"></script>';

const REMOTE_MARKER =
  '// ══════════════════════════════════════════════════════════════\n' +
  '// JOURNAL REMOTE PERSISTENCE — v1\n';
const WRAPPER_MARKER =
  '// ── Patched wrappers: extend existing functions with remote calls ──\n';
const MANAGER_MARKER =
  '// ═══════════════════════════════════════════════════════════════════\n' +
  '// journalManager → Backend Sync Layer\n';

const STATE = ['jSyncing', 'jLastSync'];
const FUNCTIONS = [
  'jSaveRemote',
  'jEnrichedDryRun',
  'jUpdateRemote',
  'jDeleteRemote',
  'jSyncToBackend',
  'jLoadFromBackend',
];
const MANIFEST = STATE.concat(FUNCTIONS);

const EXPECTED_EXTERNAL_IDENTIFIERS = [
  'AbortSignal',
  'Array',
  'BACKEND',
  'Date',
  'JSON',
  'Math',
  'Object',
  'S',
  'String',
  '_apexBackendOffloadDiag',
  '_httpStatusFromError',
  '_recordBackendApiAuthResult',
  '_recordJournalBackendSave',
  'console',
  'encodeURIComponent',
  'fetch',
  'ffBackendOffloadV1',
  'isApexLocalDevEnv',
  'jLoad',
  'jSave',
  'ttCall',
].sort();

const APP_DEPENDENCIES = [
  'BACKEND',
  'S',
  '_apexBackendOffloadDiag',
  '_httpStatusFromError',
  '_recordBackendApiAuthResult',
  '_recordJournalBackendSave',
  'ffBackendOffloadV1',
  'isApexLocalDevEnv',
  'jLoad',
  'jSave',
  'ttCall',
].sort();

const INTRINSICS = [
  'AbortSignal', 'Array', 'Date', 'JSON', 'Math', 'Object', 'String',
  'console', 'encodeURIComponent', 'fetch',
].sort();

const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const INDEX = APP_LOADER.loadIndexHtml();
const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    kind: part.kind,
    code: part.code,
  }));

let pass = 0;
function ok(value, message) {
  assert.ok(value, message);
  pass++;
}
function eq(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
  pass++;
}
function section(title) {
  console.log('\n' + title);
}
function sha256(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}
function countLiteral(source, needle) {
  let count = 0;
  let at = 0;
  while ((at = source.indexOf(needle, at)) >= 0) {
    count++;
    at += needle.length;
  }
  return count;
}
function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Length-preserving lexical masker. Identifier ownership must ignore comments,
// strings, template payloads and regex bodies (notably /\b404\b|not found/i in
// jDeleteRemote), while keeping source offsets and line numbers exact.
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

function maskSource(source) {
  const out = source.split(''); // UTF-16 units: preserves offsets after emoji.
  let at = 0;
  let lastSignificant = '';
  let lastSignificantAt = -1;

  function regexAllowed() {
    if (lastSignificant === '') return true;
    if (/[A-Za-z0-9_$]/.test(lastSignificant)) {
      let start = lastSignificantAt;
      while (start >= 0 && /[A-Za-z0-9_$]/.test(source[start])) start--;
      return REGEX_PRECEDING_KEYWORDS.has(source.slice(start + 1, lastSignificantAt + 1));
    }
    return !/[)\]'"`]/.test(lastSignificant);
  }

  while (at < source.length) {
    const c = source[at];
    const next = source[at + 1];

    if (c === '/' && next === '/') {
      let end = at;
      while (end < source.length && source[end] !== '\n') out[end++] = ' ';
      at = end;
      continue;
    }

    if (c === '/' && next === '*') {
      let end = at;
      out[end++] = ' ';
      out[end++] = ' ';
      while (end < source.length && !(source[end] === '*' && source[end + 1] === '/')) {
        if (source[end] !== '\n') out[end] = ' ';
        end++;
      }
      if (end < source.length) {
        out[end++] = ' ';
        out[end++] = ' ';
      }
      at = end;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      let end = at + 1;
      while (end < source.length) {
        if (source[end] === '\\') {
          out[end] = ' ';
          if (end + 1 < source.length && source[end + 1] !== '\n') out[end + 1] = ' ';
          end += 2;
          continue;
        }
        if (source[end] === quote) {
          end++;
          break;
        }
        out[end] = source[end] === '\n' ? '\n' : ' ';
        end++;
      }
      at = end;
      lastSignificant = quote;
      lastSignificantAt = at - 1;
      continue;
    }

    if (c === '`') {
      let end = at + 1;
      while (end < source.length) {
        if (source[end] === '\\') {
          out[end] = ' ';
          if (end + 1 < source.length && source[end + 1] !== '\n') out[end + 1] = ' ';
          end += 2;
          continue;
        }
        if (source[end] === '`') {
          end++;
          break;
        }
        // No template expressions occur in the selected boundary. Masking the
        // complete payload is conservative for dependency counting.
        out[end] = source[end] === '\n' ? '\n' : ' ';
        end++;
      }
      at = end;
      lastSignificant = '`';
      lastSignificantAt = at - 1;
      continue;
    }

    if (c === '/' && regexAllowed()) {
      let end = at + 1;
      let inClass = false;
      let closed = false;
      while (end < source.length) {
        const rc = source[end];
        if (rc === '\n') break;
        if (rc === '\\') {
          end += 2;
          continue;
        }
        if (rc === '[') inClass = true;
        else if (rc === ']') inClass = false;
        else if (rc === '/' && !inClass) {
          closed = true;
          end++;
          break;
        }
        end++;
      }
      if (closed) {
        while (end < source.length && /[a-z]/i.test(source[end])) end++;
        for (let i = at; i < end; i++) out[i] = ' ';
        at = end;
        lastSignificant = 'x';
        lastSignificantAt = at - 1;
        continue;
      }
    }

    if (!/\s/.test(c)) {
      lastSignificant = c;
      lastSignificantAt = at;
    }
    at++;
  }

  return out.join('');
}

function verifyMask(source) {
  const masked = maskSource(source);
  assert.strictEqual(masked.length, source.length, 'mask changed UTF-16 length');
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') assert.strictEqual(masked[i], '\n', 'mask changed newline at ' + i);
  }
  return masked;
}

function topLevelDeclarations(source, maskedSource) {
  const masked = maskedSource || maskSource(source);
  const declarations = [];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(|^var\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gm;
  let match;
  while ((match = re.exec(masked))) {
    declarations.push({
      name: match[1] || match[2],
      kind: match[1] ? (/^async\s+/.test(match[0]) ? 'async function' : 'function') : 'var',
      offset: match.index,
    });
  }
  return declarations;
}

function identifierCountMasked(masked, name) {
  const escaped = escapeRegExp(name);
  const re = new RegExp('(?:^|[^A-Za-z0-9_$])' + escaped + '(?![A-Za-z0-9_$])', 'gm');
  return (masked.match(re) || []).length;
}

function identifierCount(source, name) {
  return identifierCountMasked(maskSource(source), name);
}

function writeCountMasked(masked, name) {
  const escaped = escapeRegExp(name);
  const target = escaped + '(?:\\s*\\[[^\\]\\n]+\\]|\\.[A-Za-z_$][A-Za-z0-9_$]*)?';
  const re = new RegExp('(?:^|[^A-Za-z0-9_$])' + target + '\\s*(?:=|\\+=|-=|\\+\\+|--)', 'gm');
  return (masked.match(re) || []).length;
}

function writeCount(source, name) {
  return writeCountMasked(maskSource(source), name);
}

const JS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof',
  'in', 'of', 'this', 'null', 'true', 'false', 'void', 'delete', 'throw',
  'try', 'catch', 'finally', 'default', 'yield', 'await', 'async', 'class',
  'extends', 'super', 'undefined',
]);

function freeIdentifiers(source) {
  const masked = maskSource(source);
  const declared = new Set(topLevelDeclarations(source, masked).map((entry) => entry.name));
  let match;

  const functionRe = /function\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((match = functionRe.exec(masked))) {
    if (match[1]) declared.add(match[1]);
    match[2].split(',').map((part) => part.trim()).filter(Boolean).forEach((param) => {
      declared.add(param.replace(/[^A-Za-z0-9_$].*$/, ''));
    });
  }

  const catchRe = /catch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((match = catchRe.exec(masked))) declared.add(match[1]);

  const declarationRe = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((match = declarationRe.exec(masked))) declared.add(match[1]);

  const free = new Set();
  const identifierRe = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b\s*(:?)/g;
  while ((match = identifierRe.exec(masked))) {
    if (match[1] === '.') continue;
    const name = match[2];
    if (JS_KEYWORDS.has(name) || declared.has(name)) continue;
    if (match[3] === ':' && /[{,]\s*$/.test(masked.slice(Math.max(0, match.index - 40), match.index))) continue;
    free.add(name);
  }
  return Array.from(free).sort();
}

function vmLoad(source, label) {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  try {
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: label + '.js' });
    return { ok: true, error: null, globals: Object.keys(sandbox).sort() };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error), globals: Object.keys(sandbox).sort() };
  }
}

function sideEffects(source) {
  const masked = maskSource(source);
  const patterns = {
    document: /\bdocument\s*\./g,
    fetch: /\bfetch\s*\(/g,
    ttCall: /\bttCall\s*\(/g,
    setTimeout: /\bsetTimeout\s*\(/g,
    setInterval: /\bsetInterval\s*\(/g,
    WebSocket: /\b(?:new\s+)?WebSocket\b/g,
    addEventListener: /\baddEventListener\s*\(/g,
    localStorage: /\blocalStorage\s*\./g,
  };
  return Object.fromEntries(Object.entries(patterns).map(([name, re]) => [name, (masked.match(re) || []).length]));
}

function externalOwnerUsage(candidateSource) {
  const parts = APP_PARTS.map((part) => ({
    name: part.name,
    masked: maskSource(part.kind === 'inline'
      ? part.code.replace(candidateSource, '\n')
      : part.code),
  }));
  return Object.fromEntries(MANIFEST.map((name) => [
    name,
    parts.map((part) => ({
      where: part.name,
      refs: identifierCountMasked(part.masked, name),
      writes: writeCountMasked(part.masked, name),
    })).filter((entry) => entry.refs || entry.writes),
  ]));
}

function ownerGate(source, outsideSource) {
  const violations = [];
  const sourceMasked = maskSource(source);
  const outsideMasked = maskSource(outsideSource);
  const names = topLevelDeclarations(source, sourceMasked).map((entry) => entry.name);
  if (JSON.stringify(names) !== JSON.stringify(MANIFEST)) violations.push('manifest');
  if (!vmLoad(source, 'candidate-mutant').ok) violations.push('load-time-effect');
  if (MANIFEST.some((name) => writeCountMasked(outsideMasked, name) > 0)) violations.push('external-write');
  return violations;
}

function extractFunction(source, name) {
  const masked = maskSource(source);
  const re = new RegExp('(?:async\\s+)?function\\s+' + escapeRegExp(name) + '\\s*\\(');
  const match = re.exec(masked);
  assert.ok(match, 'missing function ' + name);
  const open = masked.indexOf('{', match.index);
  let depth = 0;
  for (let at = open; at < masked.length; at++) {
    if (masked[at] === '{') depth++;
    else if (masked[at] === '}') {
      depth--;
      if (depth === 0) return source.slice(match.index, at + 1);
    }
  }
  throw new Error('unbalanced function ' + name);
}

function changedPaths() {
  const committed = execFileSync('git', ['diff', '--name-only', BASE_SHA + '...HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean);
  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
  return Array.from(new Set(committed.concat(status))).sort();
}

console.log('JOURNAL REMOTE POST-UI AUDIT');
console.log('base=' + BASE_SHA);

section('1. Pinned base and production scope');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_SHA,
  'post-#396 base resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_TREE,
  'post-#396 base tree resolves exactly');
eq(INDEX, BASE, 'audit leaves production index.html byte-identical to #396');
eq(INDEX.length, 1976502, 'base UTF-16 length is pinned');
eq(sha256(INDEX), '5c9742fd4f77c88542f0fd8681c4120243f0d6b7dfdb8f5ea9145acc44aee500',
  'base index SHA-256 is pinned');
eq(changedPaths(), [AUDIT_REL], 'the audit changes exactly one temporary test file');
ok(!fs.existsSync(path.join(ROOT, FUTURE_MODULE_REL)), 'audit creates no runtime module');
eq(countLiteral(INDEX, FUTURE_TAG), 0, 'audit adds no production script tag');

section('2. Exact selected boundary');
eq(countLiteral(INDEX, REMOTE_MARKER), 1, 'remote marker is unique');
eq(countLiteral(INDEX, WRAPPER_MARKER), 1, 'wrapper marker is unique');
eq(countLiteral(INDEX, MANAGER_MARKER), 1, 'manager marker is unique');
const remoteAt = INDEX.indexOf(REMOTE_MARKER);
const wrapperAt = INDEX.indexOf(WRAPPER_MARKER);
const managerAt = INDEX.indexOf(MANAGER_MARKER);
ok(remoteAt < wrapperAt && wrapperAt < managerAt, 'physical order is service -> wrappers -> manager sync layer');
const candidateEnd = wrapperAt - 1; // keep one separator LF with inline residue.
const candidate = INDEX.slice(remoteAt, candidateEnd);
eq(remoteAt, 1932484, 'candidate starts at exact post-#396 offset');
eq(candidateEnd, 1944779, 'candidate ends at exact post-#396 offset');
eq(lineAt(INDEX, remoteAt), 34024, 'candidate starts on line 34024');
eq(lineAt(INDEX, candidateEnd), 34268, 'candidate ends on line 34268');
eq(candidate.length, 12295, 'candidate has exact UTF-16 length');
eq(sha256(candidate), '220d90346d6d026acc96c404f10e2f0561e355972189301f8f56e77b10a817d3',
  'candidate byte identity is pinned');
ok(candidate.endsWith('}\n'), 'future module ends with one LF');
eq(INDEX.slice(candidateEnd, wrapperAt + WRAPPER_MARKER.length), '\n' + WRAPPER_MARKER,
  'one separator LF and the wrapper marker stay inline');
verifyMask(candidate);
eq(topLevelDeclarations(candidate).map((entry) => entry.name), MANIFEST,
  'candidate owns exactly two state bindings and six functions in physical order');
eq(topLevelDeclarations(candidate).map((entry) => entry.kind),
  ['var', 'var', 'async function', 'async function', 'async function', 'async function', 'async function', 'async function'],
  'binding forms are preserved exactly');

section('3. Load-time inertness and call-time dependencies');
const load = vmLoad(candidate, FUTURE_MODULE_REL);
ok(load.ok, 'candidate evaluates standalone without touching call-time globals: ' + load.error);
eq(load.globals.filter((name) => name !== 'console'), MANIFEST.slice().sort(),
  'standalone classic load creates only the eight intended globals');
eq(freeIdentifiers(candidate), EXPECTED_EXTERNAL_IDENTIFIERS,
  'static dependency inventory is exact and excludes locals/regex/comment text');
eq(EXPECTED_EXTERNAL_IDENTIFIERS.filter((name) => APP_DEPENDENCIES.includes(name)).sort(), APP_DEPENDENCIES,
  'eleven application dependencies are identified explicitly');
eq(EXPECTED_EXTERNAL_IDENTIFIERS.filter((name) => INTRINSICS.includes(name)).sort(), INTRINSICS,
  'ten platform/intrinsic dependencies are identified explicitly');
eq(sideEffects(candidate), {
  document: 0,
  fetch: 1,
  ttCall: 5,
  setTimeout: 0,
  setInterval: 0,
  WebSocket: 0,
  addEventListener: 0,
  localStorage: 0,
}, 'transport calls are present only inside function bodies; no DOM/timer/storage/listener owner crosses the boundary');

section('4. State ownership and external consumers');
eq(identifierCount(candidate, 'jSyncing'), 5, 'jSyncing has one guard plus four writes including declaration');
eq(writeCount(candidate, 'jSyncing'), 4, 'jSyncing write count is exact');
eq(identifierCount(candidate, 'jLastSync'), 3, 'jLastSync has declaration plus two timestamp writes');
eq(writeCount(candidate, 'jLastSync'), 3, 'jLastSync write count is exact');
const external = externalOwnerUsage(candidate);
eq(external, {
  jSyncing: [],
  jLastSync: [{ where: './js/ui/journal-ui.js', refs: 3, writes: 0 }],
  jSaveRemote: [{ where: 'index.html:inline', refs: 4, writes: 0 }],
  jEnrichedDryRun: [],
  jUpdateRemote: [{ where: 'index.html:inline', refs: 2, writes: 0 }],
  jDeleteRemote: [{ where: 'index.html:inline', refs: 3, writes: 0 }],
  jSyncToBackend: [{ where: './js/ui/journal-ui.js', refs: 1, writes: 0 }],
  jLoadFromBackend: [{ where: './js/ui/journal-ui.js', refs: 1, writes: 0 }],
}, 'every consumer is inventoried by real identifier reference, with zero external writes');
eq(MANIFEST.reduce((sum, name) => sum + external[name].reduce((n, row) => n + row.writes, 0), 0), 0,
  'all eight candidate owners have zero foreign writes');

section('5. Rejected adjacent and shell boundaries');
const wrappers = INDEX.slice(wrapperAt, managerAt - 1);
const wrappersMasked = maskSource(wrappers);
eq((wrappersMasked.match(/^var\s+_j(?:Add|Update|Delete)TradeOrig\s*=/gm) || []).length, 3,
  'wrapper layer has three load-time aliases of existing Journal Core functions');
eq((wrappersMasked.match(/^j(?:Add|Update|Delete)Trade\s*=\s*function/gm) || []).length, 3,
  'wrapper layer has three load-time reassignments');
ok(!vmLoad(wrappers, 'rejected-wrappers').ok,
  'wrapper-only slice cannot load standalone because it reads existing globals immediately');
ok(!vmLoad(INDEX.slice(remoteAt, managerAt - 1), 'rejected-whole-remote').ok,
  'overreaching through wrappers destroys load-time inertness');

const showView = extractFunction(INDEX, 'showView');
eq(showView.length, 5408, 'showView shell candidate size is pinned');
eq(sha256(showView), '864ac78f66555ee402f66a558d7190f4b217658490f3b5167e6cfb57569049b9',
  'showView shell identity is pinned');
eq(freeIdentifiers(showView).length, 34, 'showView has 34 direct lifecycle/data/UI dependencies');
eq(sideEffects(showView).document, 2, 'showView directly owns two DOM accesses');
eq(sideEffects(showView).setTimeout, 2, 'showView directly owns two timers');
for (const dependency of [
  '_jSyncJournalFromBackend', '_mcxInit', '_mcxStopPolls', '_pfStopChart',
  '_portfolioOpenBackendLoad', '_rsTeardown', '_swingInit', '_swingTeardown',
  'renderPortfolioJournalView', 'renderPortfolioView', 'startDxlinkConnectOnce',
  'stopPortfolioRefresh',
]) {
  ok(identifierCount(showView, dependency) > 0, 'showView lifecycle fan-out includes ' + dependency);
}
ok(freeIdentifiers(showView).length > APP_DEPENDENCIES.length * 3,
  'shell fan-out is more than triple the selected service application-dependency count');

section('6. Future loader slot and test fallout');
eq(countLiteral(INDEX, UI_TAG + '\n<script>'), 1,
  'Journal UI currently loads immediately before the residual inline script');
const futureLoad = INDEX.replace(UI_TAG + '\n<script>', UI_TAG + '\n' + FUTURE_TAG + '\n<script>');
eq(countLiteral(futureLoad, FUTURE_TAG), 1, 'future service tag would be unique');
ok(futureLoad.indexOf(UI_TAG) < futureLoad.indexOf(FUTURE_TAG) && futureLoad.indexOf(FUTURE_TAG) < futureLoad.indexOf('<script>\n// ═', futureLoad.indexOf(FUTURE_TAG)),
  'future classic tag slot is Journal UI -> Journal Remote -> residual inline');
ok(!/\b(?:async|defer|type)\s*=/.test(FUTURE_TAG), 'future tag is classic synchronous src-only form');

const ownershipContractsToAdvance = [
  'tests/journal-core-boundary-contract.test.js',
  'tests/journal-ui-boundary-contract.test.js',
];
for (const rel of ownershipContractsToAdvance) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('jSaveRemote'), rel + ' explicitly tracks the current inline owner and must advance in extraction');
  ok(source.includes('loadAppJavaScriptSource'), rel + ' already has the ordered app loader available');
}
const loaderAwareRuntimeTests = [
  'tests/journal-backend-save-confirm.test.js',
  'tests/journal-backend-sync-preview.test.js',
  'tests/journal-delete-404-local-removal.test.js',
  'tests/journal-import-json.test.js',
  'tests/portfolio-tastytrade-beta-latest.test.js',
];
for (const rel of loaderAwareRuntimeTests) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('loadAppJavaScriptSource'), rel + ' follows external modules through the ordered loader');
}

section('7. Mutation-sensitive negative controls');
const outside = INDEX.slice(0, remoteAt) + '\n' + INDEX.slice(candidateEnd);
eq(ownerGate(candidate, outside), [], 'real candidate passes all semantic ownership gates');
ok(ownerGate(candidate.replace('var jSyncing = false;\n', ''), outside).includes('manifest'),
  'missing-state-owner mutant is rejected');
ok(ownerGate(candidate + '\nfunction foreignRemoteOwner() {}\n', outside).includes('manifest'),
  'foreign-owner mutant is rejected');
ok(ownerGate(candidate + "\nttCall('/journal/trades');\n", outside).includes('load-time-effect'),
  'top-level invocation mutant is rejected by standalone load');
ok(ownerGate(INDEX.slice(remoteAt, managerAt - 1), outside).includes('load-time-effect'),
  'wrapper-overreach mutant is rejected by standalone load');
ok(ownerGate(candidate, outside + '\njSyncing = true;\n').includes('external-write'),
  'foreign-state-write mutant is rejected');
eq(identifierCount('var jLastSyncShadow = 1;\nfunction jSaveRemoteCopy(){}\njLastSync;', 'jLastSync'), 1,
  'identifier counter ignores prefix/suffix collisions');
eq(identifierCount('// jLastSync\n"jLastSync"; /jLastSync/.test(x);', 'jLastSync'), 0,
  'identifier counter ignores comments, strings and regex literals');
ok(countLiteral(INDEX.replace(REMOTE_MARKER, REMOTE_MARKER.replace('v1', 'v2')), REMOTE_MARKER) === 0,
  'marker-identity mutant is rejected');
ok(sha256(candidate.replace('var jLastSync = null;', 'var jLastSync = undefined;')) !== sha256(candidate),
  'same-length state-initializer mutant is rejected by the identity pin');

const report = {
  base: {
    commit: BASE_SHA,
    tree: BASE_TREE,
    indexChars: INDEX.length,
    indexSha256: sha256(INDEX),
  },
  selected: {
    futureModule: FUTURE_MODULE_REL,
    start: remoteAt,
    end: candidateEnd,
    startLine: lineAt(INDEX, remoteAt),
    endLine: lineAt(INDEX, candidateEnd),
    chars: candidate.length,
    sha256: sha256(candidate),
    owners: MANIFEST,
    applicationDependencies: APP_DEPENDENCIES,
    externalConsumers: external,
  },
  rejected: {
    wrapperLayer: 'load-time aliases + reassignments',
    showView: {
      chars: showView.length,
      dependencyCount: freeIdentifiers(showView).length,
      reason: 'cross-feature lifecycle shell; separate high-risk project',
    },
  },
  extractionContract: {
    productionFiles: ['index.html', FUTURE_MODULE_REL],
    permanentTest: 'tests/journal-remote-persistence-boundary-contract.test.js',
    undoHelper: 'tests/lib/journal-remote-persistence-undo.js',
    ownershipContractsToAdvance,
    loaderAwareRuntimeTests,
  },
};

console.log('\nJOURNAL_REMOTE_POST_UI_AUDIT_BEGIN');
console.log(JSON.stringify(report, null, 2));
console.log('JOURNAL_REMOTE_POST_UI_AUDIT_END');
console.log('\n' + pass + ' assertions passed');
console.log('JOURNAL_REMOTE_POST_UI_AUDIT_OK');
