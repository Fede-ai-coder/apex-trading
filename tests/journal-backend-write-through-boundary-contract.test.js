'use strict';

// Permanent contract for the Journal backend write-through extraction after
// the merged read-only audit (#399). One exact classic-script bridge owns the
// legacy Journal CRUD wrappers, backend payload normalization, and terminal
// journalManager patches. Migration later moved to its own module; manual import
// and backup UI remain inline as separate policy/UI owners.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');
const U = require('./lib/journal-backend-write-through-undo.js');
const REMOTE_U = require('./lib/journal-remote-persistence-undo.js');
const MIGRATION_U = require('./lib/journal-migration-undo.js');
const MANUAL_U = require('./lib/journal-manual-import-undo.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '9dc2148f91e0ae12aa405f2488b16ab9e03922ef';
const BASE_TREE = '0769a850de8cbd4c5d93c915ce10081fc23a8438';
const MODULE_REL = 'js/services/journal-backend-write-through.js';
const MODULE_TAG = '<script src="./js/services/journal-backend-write-through.js"></script>';
const MIGRATION_TAG = '<script src="./js/services/journal-migration.js"></script>';
const MANUAL_TAG = '<script src="./js/services/journal-manual-import.js"></script>';

const CORE_TAG = '<script src="./js/services/journal-core.js"></script>';
const UI_TAG = '<script src="./js/ui/journal-ui.js"></script>';
const REMOTE_TAG = '<script src="./js/services/journal-remote-persistence.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

const WRAPPER_MARKER =
  '// ── Patched wrappers: extend existing functions with remote calls ──\n';
const MANAGER_MARKER =
  '// ═══════════════════════════════════════════════════════════════════\n' +
  '// journalManager → Backend Sync Layer\n';
const MIGRATION_MARKER =
  '// ── One-time migration: apex_trades → backend ─────────────────────\n';
const MANUAL_IMPORT_MARKER =
  '// ── Manual, console-only cross-host Journal trade import ──────────────────────\n';
const BACKUP_MARKER =
  '// ══════════════════════════════════════════════════════════════\n' +
  '// BACKUP / RESTORE PANEL\n';

const TOP_LEVEL_OWNERS = [
  '_jAddTradeOrig',
  '_jUpdateTradeOrig',
  '_jDeleteTradeOrig',
  '_tradeForBackend',
];
const LEGACY_PATCHES = ['jAddTrade', 'jUpdateTrade', 'jDeleteTrade'];
const MANAGER_PATCHES = [
  'add',
  'update',
  'close',
  'closeLegs',
  'setExitSnapshot',
  'setAdjustmentSnapshot',
  'patchSnapshotTech',
  'remove',
  'removeByPortfolio',
];
const EXPECTED_FREE_IDENTIFIERS = [
  'Array',
  'Object',
  'String',
  '_resolveTradePortfolioId',
  'console',
  'jAddTrade',
  'jDeleteRemote',
  'jDeleteTrade',
  'jLoad',
  'jSaveRemote',
  'jUpdateRemote',
  'jUpdateTrade',
  'journalManager',
  'normalizeTradeOptionLegAliases',
];

const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const REMOTE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-remote-persistence.js'), 'utf8');
const MIGRATION_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
const MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-manual-import.js'), 'utf8');
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

const wrapperAt = BASE.indexOf(WRAPPER_MARKER);
const managerAt = BASE.indexOf(MANAGER_MARKER);
const migrationAt = BASE.indexOf(MIGRATION_MARKER);
const manualImportAt = BASE.indexOf(MANUAL_IMPORT_MARKER);
const backupAt = BASE.indexOf(BACKUP_MARKER);
const candidateEnd = migrationAt - 1; // Keep one separator LF with migration.
const CANDIDATE = BASE.slice(wrapperAt, candidateEnd);
const OUTSIDE_BASE = BASE.slice(0, wrapperAt) + BASE.slice(candidateEnd);

const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    code: part.src === './js/services/journal-backend-write-through.js' ? '\n' : part.code,
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
function identifierCountMasked(masked, name) {
  const re = new RegExp(
    '(?:^|[^A-Za-z0-9_$])' + escapeRegExp(name) + '(?![A-Za-z0-9_$])',
    'gm'
  );
  return (masked.match(re) || []).length;
}
function externalUsage(name) {
  return APP_PARTS.map((part) => ({
    where: part.name,
    refs: identifierCountMasked(maskLiterals(part.code), name),
  })).filter((entry) => entry.refs > 0);
}
function topLevelShape(source) {
  return scanTopLevelDeclarations(source).map((entry) => ({
    name: entry.name,
    form: entry.form,
    isAsync: entry.isAsync,
  }));
}
function legacyPatchNames(source) {
  const masked = maskLiterals(source);
  const names = [];
  const re = /^(jAddTrade|jUpdateTrade|jDeleteTrade)\s*=\s*function\s*\(/gm;
  let match;
  while ((match = re.exec(masked))) names.push(match[1]);
  return names;
}
function managerPatchNames(source) {
  const masked = maskLiterals(source);
  const names = [];
  const re = /^\s{2}jm\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function\s*\(/gm;
  let match;
  while ((match = re.exec(masked))) names.push(match[1]);
  return names;
}
function directEffects(source) {
  const masked = maskLiterals(source);
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
  return Object.fromEntries(Object.entries(patterns).map(([name, re]) => [
    name,
    (masked.match(re) || []).length,
  ]));
}

const JS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof',
  'in', 'of', 'this', 'null', 'true', 'false', 'void', 'delete', 'throw',
  'try', 'catch', 'finally', 'default', 'yield', 'await', 'async', 'class',
  'extends', 'super', 'undefined',
]);

function freeIdentifiers(source) {
  const masked = maskLiterals(source);
  const declared = new Set();
  let match;

  const functionRe = /\bfunction\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((match = functionRe.exec(masked))) {
    if (match[1]) declared.add(match[1]);
    match[2].split(',').map((part) => part.trim()).filter(Boolean).forEach((param) => {
      declared.add(param.replace(/[^A-Za-z0-9_$].*$/, ''));
    });
  }
  const declarationRe = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((match = declarationRe.exec(masked))) declared.add(match[1]);
  const catchRe = /\bcatch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((match = catchRe.exec(masked))) declared.add(match[1]);

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

function makeManager() {
  const methods = {
    add(trade) { return trade; },
    update() { return 'updated'; },
    close() { return 'closed'; },
    closeLegs() { return 'legs-closed'; },
    setExitSnapshot() { return 'exit-snapshot'; },
    setAdjustmentSnapshot() { return 'adjustment-snapshot'; },
    patchSnapshotTech(tradeId, snapshotKey, techData) { return techData !== 'skip'; },
    remove() { return 'removed'; },
    removeByPortfolio() { return 'portfolio-removed'; },
    getById(id) { return { id, ticker: 'SPY', portfolioId: 'P1' }; },
    getByPortfolio() { return [{ id: 'P1-A' }, { id: 'P1-B' }]; },
  };
  return methods;
}

function loadCandidate(source, omitted) {
  const legacy = {
    jAddTrade(trade) { return trade.id; },
    jUpdateTrade() { return 'legacy-updated'; },
    jDeleteTrade() { return 'legacy-deleted'; },
  };
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    jAddTrade: legacy.jAddTrade,
    jUpdateTrade: legacy.jUpdateTrade,
    jDeleteTrade: legacy.jDeleteTrade,
    jLoad() { return []; },
    journalManager: makeManager(),
  };
  if (omitted) delete sandbox[omitted];
  try {
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: MODULE_REL });
    return { ok: true, error: null, sandbox, legacy };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error), sandbox, legacy };
  }
}

function laterGlobalPatchCount(source) {
  const masked = maskLiterals(source);
  const re = /^(?:jAddTrade|jUpdateTrade|jDeleteTrade)\s*=\s*function\s*\(/gm;
  return (masked.match(re) || []).length;
}

function boundaryViolations(source, outsideSource) {
  const violations = [];
  const expectedShape = [
    { name: '_jAddTradeOrig', form: 'var', isAsync: false },
    { name: '_jUpdateTradeOrig', form: 'var', isAsync: false },
    { name: '_jDeleteTradeOrig', form: 'var', isAsync: false },
    { name: '_tradeForBackend', form: 'function', isAsync: false },
  ];
  if (JSON.stringify(topLevelShape(source)) !== JSON.stringify(expectedShape)) violations.push('manifest');
  if (JSON.stringify(legacyPatchNames(source)) !== JSON.stringify(LEGACY_PATCHES)) violations.push('legacy-patches');
  if (JSON.stringify(managerPatchNames(source)) !== JSON.stringify(MANAGER_PATCHES)) violations.push('manager-patches');
  if (Object.values(directEffects(source)).some((count) => count !== 0)) violations.push('foreign-direct-effect');
  if (!loadCandidate(source).ok) violations.push('load-contract');
  if (source.includes(MIGRATION_MARKER) || source.includes(MANUAL_IMPORT_MARKER)) violations.push('owner-overreach');
  if (laterGlobalPatchCount(outsideSource) !== 0) violations.push('later-global-patch');
  return violations;
}

function futureOrderViolations(html) {
  const violations = [];
  if (countLiteral(html, MODULE_TAG) !== 1) violations.push('tag-count');
  const coreAt = html.indexOf(CORE_TAG);
  const uiAt = html.indexOf(UI_TAG);
  const remoteAt = html.indexOf(REMOTE_TAG);
  const futureAt = html.indexOf(MODULE_TAG);
  const migrationAt = html.indexOf(MIGRATION_TAG);
  const manualAt = html.indexOf(MANUAL_TAG);
  const inlineAt = html.indexOf(INLINE_OPEN);
  if (!(coreAt >= 0 && coreAt < uiAt && uiAt < remoteAt && remoteAt < futureAt &&
        futureAt < migrationAt && migrationAt < manualAt && manualAt < inlineAt)) {
    violations.push('load-order');
  }
  const tag = APP_LOADER.parseScriptTags(html).find((entry) => entry.src === './js/services/journal-backend-write-through.js');
  if (!tag || /\b(?:async|defer)\b|\btype\s*=/i.test(tag.attrs)) violations.push('classic-tag');
  return violations;
}

console.log('JOURNAL BACKEND WRITE-THROUGH BOUNDARY CONTRACT');
console.log('base=' + BASE_SHA);

section('1. Pinned audit base and exact contiguous relocation identity');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_SHA, 'merged #399 audit base resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_TREE, 'merged #399 audit tree resolves exactly');
eq(BASE.length, U.BASE_CHARS, 'audit-base UTF-16 length matches undo pin');
eq(sha256(BASE), U.BASE_SHA256, 'audit-base SHA-256 matches undo pin');

section('2. Exact selected write-through boundary');
for (const marker of [WRAPPER_MARKER, MANAGER_MARKER, MIGRATION_MARKER, MANUAL_IMPORT_MARKER, BACKUP_MARKER]) {
  eq(countLiteral(BASE, marker), 1, 'audit-base boundary marker is unique: ' + marker.split('\n')[0]);
}
ok(wrapperAt < managerAt && managerAt < migrationAt && migrationAt < manualImportAt && manualImportAt < backupAt,
  'physical order is wrappers -> manager patches -> migration -> manual import -> backup UI');
eq(wrapperAt, 1932553, 'candidate starts at exact post-#398 offset');
eq(candidateEnd, 1940536, 'candidate ends at exact post-#398 offset');
eq(lineAt(BASE, wrapperAt), 34026, 'candidate starts on line 34026');
eq(lineAt(BASE, candidateEnd), 34221, 'candidate ends on line 34221');
eq(CANDIDATE.length, 7983, 'candidate has exact UTF-16 length');
eq(sha256(CANDIDATE), '6d2bc369ed33d45e9f4eb99ab85a597e59fba4f84c4642431f5a413206857d1d',
  'candidate byte identity is pinned');
ok(CANDIDATE.endsWith('})();\n'), 'candidate ends with the complete manager patch IIFE and one LF');
eq(BASE.slice(candidateEnd, migrationAt + MIGRATION_MARKER.length), '\n' + MIGRATION_MARKER,
  'one separator LF and the migration marker stay inline');
eq(MODULE.length, U.MODULE_CHARS, 'module length matches the audited slice');
eq(sha256(MODULE), U.MODULE_SHA256, 'module SHA-256 matches the audited slice');
eq(MODULE, CANDIDATE, 'module is byte-for-byte the complete audited slice');
eq(topLevelShape(CANDIDATE), [
  { name: '_jAddTradeOrig', form: 'var', isAsync: false },
  { name: '_jUpdateTradeOrig', form: 'var', isAsync: false },
  { name: '_jDeleteTradeOrig', form: 'var', isAsync: false },
  { name: '_tradeForBackend', form: 'function', isAsync: false },
], 'candidate owns exactly three legacy aliases and one payload normalizer');
eq(legacyPatchNames(CANDIDATE), LEGACY_PATCHES,
  'candidate owns the three legacy CRUD reassignments in physical order');
eq(managerPatchNames(CANDIDATE), MANAGER_PATCHES,
  'candidate owns exactly the nine terminal journalManager patches in physical order');
eq(freeIdentifiers(CANDIDATE), EXPECTED_FREE_IDENTIFIERS,
  'candidate dependency inventory is exact');
eq(directEffects(CANDIDATE), {
  document: 0,
  fetch: 0,
  ttCall: 0,
  setTimeout: 0,
  setInterval: 0,
  WebSocket: 0,
  addEventListener: 0,
  localStorage: 0,
}, 'bridge delegates transport and owns no DOM/timer/storage/listener/network primitive');
const candidateMasked = maskLiterals(CANDIDATE);
eq((candidateMasked.match(/\bjSaveRemote\s*\(/g) || []).length, 2, 'two save delegations are exact');
eq((candidateMasked.match(/\bjUpdateRemote\s*\(/g) || []).length, 2, 'two update delegations are exact');
eq((candidateMasked.match(/\bjDeleteRemote\s*\(/g) || []).length, 3, 'three delete delegations are exact');
eq((candidateMasked.match(/\.bind\s*\(/g) || []).length, 9, 'all nine original manager methods are bound before patching');
eq((candidateMasked.match(/\(function\s*\(\)\s*\{/g) || []).length, 1, 'one load-time manager patch IIFE is exact');

section('3. Intentional load-time effects and exact classic slot');
const load = loadCandidate(MODULE);
ok(load.ok, 'module loads with the exact Journal Core surface: ' + load.error);
eq(load.sandbox._jAddTradeOrig, load.legacy.jAddTrade, 'legacy add alias captures the original function');
eq(load.sandbox._jUpdateTradeOrig, load.legacy.jUpdateTrade, 'legacy update alias captures the original function');
eq(load.sandbox._jDeleteTradeOrig, load.legacy.jDeleteTrade, 'legacy delete alias captures the original function');
for (const required of ['jAddTrade', 'jUpdateTrade', 'jDeleteTrade', 'journalManager']) {
  ok(!loadCandidate(MODULE, required).ok, 'classic load fails closed when required Core symbol is absent: ' + required);
}
ok(loadCandidate(MODULE).ok,
  'Journal Remote delegates are call-time dependencies and need not be mocked for classic evaluation');

const baseWithoutCandidate = BASE.slice(0, wrapperAt) + BASE.slice(candidateEnd);
const expectedIndex = baseWithoutCandidate.replace(
  REMOTE_TAG + '\n<script>',
  REMOTE_TAG + '\n' + MODULE_TAG + '\n<script>'
);
const preManualIndex = MANUAL_U.undoJournalManualImport(INDEX, MANUAL_MODULE);
const preMigrationIndex = MIGRATION_U.undoJournalMigration(preManualIndex, MIGRATION_MODULE);
eq(preMigrationIndex, expectedIndex,
  'undoing the later Migration extraction yields exactly audit base minus slice plus one Write-through tag');
eq(INDEX.length, 1944246, 'current post-Manual-Import index UTF-16 length is pinned');
eq(sha256(INDEX), '0bc8f2904a47b84a345ca9c35a18c17208082c7f447fe358d3dd19cd2dba4790',
  'current post-Manual-Import index SHA-256 is pinned');
eq(futureOrderViolations(INDEX), [],
  'order is Core -> UI -> Remote -> Write-through -> Migration -> Manual Import -> inline');
eq(countLiteral(INDEX, WRAPPER_MARKER), 0, 'legacy wrapper marker has zero inline residue');
eq(countLiteral(INDEX, MANAGER_MARKER), 0, 'manager patch marker has zero inline residue');
eq(countLiteral(INDEX, MIGRATION_MARKER), 0, 'migration marker has zero inline residue after its later extraction');
eq(countLiteral(MIGRATION_MODULE, MIGRATION_MARKER), 1, 'migration marker lives in its later module exactly once');
eq(countLiteral(INDEX, MANUAL_IMPORT_MARKER), 0, 'manual import marker has zero inline residue');
eq(countLiteral(MANUAL_MODULE, MANUAL_IMPORT_MARKER), 1, 'manual import marker lives in its module exactly once');
eq(countLiteral(INDEX, BACKUP_MARKER), 1, 'backup UI marker remains inline exactly once');

section('4. External ownership and consumers');
eq(externalUsage('_jAddTradeOrig'), [], 'legacy add alias has no outside consumer');
eq(externalUsage('_jUpdateTradeOrig'), [], 'legacy update alias has no outside consumer');
eq(externalUsage('_jDeleteTradeOrig'), [], 'legacy delete alias has no outside consumer');
eq(externalUsage('_tradeForBackend'), [
  { where: './js/services/journal-migration.js', refs: 1 },
  { where: './js/services/journal-manual-import.js', refs: 1 },
], 'payload normalizer has one Migration-module consumer and one Manual-Import-module consumer');
eq(externalUsage('jAddTrade'), [
  { where: './js/services/journal-core.js', refs: 1 },
  { where: './js/ui/journal-ui.js', refs: 1 },
], 'legacy add owner and UI consumer remain explicit');
eq(externalUsage('jUpdateTrade'), [
  { where: './js/services/journal-core.js', refs: 1 },
  { where: './js/ui/journal-ui.js', refs: 2 },
], 'legacy update owner and UI consumers remain explicit');
eq(externalUsage('jDeleteTrade'), [
  { where: './js/services/journal-core.js', refs: 1 },
  { where: './js/ui/journal-ui.js', refs: 1 },
], 'legacy delete owner and UI consumer remain explicit');
eq(laterGlobalPatchCount(OUTSIDE_BASE), 0,
  'no later inline reassignment competes with the selected write-through bridge');

section('5. Real bridge behavior through mocks');
async function verifyBehavior() {
  const legacyCalls = [];
  const remoteCalls = [];
  const originalManagerCalls = [];
  const localTrades = [{ id: 'L1', ticker: 'SPY', portfolioId: 'P1' }];
  const managerTrades = {
    M1: { id: 'M1', ticker: 'QQQ', portfolioId: 'P2' },
    M2: { id: 'M2', ticker: 'IWM', portfolioId: 'P3' },
  };
  const originals = {
    add(trade) { originalManagerCalls.push('add'); managerTrades[trade.id] = trade; return trade; },
    update() { originalManagerCalls.push('update'); return 'updated'; },
    close() { originalManagerCalls.push('close'); return 'closed'; },
    closeLegs() { originalManagerCalls.push('closeLegs'); return 'legs-closed'; },
    setExitSnapshot() { originalManagerCalls.push('setExitSnapshot'); return 'exit-snapshot'; },
    setAdjustmentSnapshot() { originalManagerCalls.push('setAdjustmentSnapshot'); return 'adjustment-snapshot'; },
    patchSnapshotTech(tradeId, snapshotKey, techData) {
      originalManagerCalls.push('patchSnapshotTech');
      return techData !== 'skip';
    },
    remove() { originalManagerCalls.push('remove'); return 'removed'; },
    removeByPortfolio() { originalManagerCalls.push('removeByPortfolio'); return 'portfolio-removed'; },
  };
  const jm = {
    add: originals.add,
    update: originals.update,
    close: originals.close,
    closeLegs: originals.closeLegs,
    setExitSnapshot: originals.setExitSnapshot,
    setAdjustmentSnapshot: originals.setAdjustmentSnapshot,
    patchSnapshotTech: originals.patchSnapshotTech,
    remove: originals.remove,
    removeByPortfolio: originals.removeByPortfolio,
    getById(id) { return managerTrades[id] || null; },
    getByPortfolio() { return [{ id: 'PF-A' }, { id: 'PF-B' }]; },
  };
  function legacyAdd(trade) { legacyCalls.push(['add', trade.id]); return trade.id; }
  function legacyUpdate(id) { legacyCalls.push(['update', id]); return 'legacy-updated'; }
  function legacyDelete(id) { legacyCalls.push(['delete', id]); return 'legacy-deleted'; }
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    jAddTrade: legacyAdd,
    jUpdateTrade: legacyUpdate,
    jDeleteTrade: legacyDelete,
    jLoad() { return localTrades; },
    jSaveRemote(trade) {
      remoteCalls.push({ op: 'save', id: trade && trade.id, trade });
      return Promise.resolve({ ok: true, op: 'save' });
    },
    jUpdateRemote(id, trade) {
      remoteCalls.push({ op: 'update', id, trade });
      return Promise.resolve({ ok: true, op: 'update' });
    },
    jDeleteRemote(id) {
      remoteCalls.push({ op: 'delete', id });
      return Promise.resolve(true);
    },
    _resolveTradePortfolioId(trade) {
      return trade.portfolioId != null ? trade.portfolioId : trade.portfolio_id;
    },
    normalizeTradeOptionLegAliases(trade, leg) {
      return Object.assign({}, leg);
    },
    journalManager: jm,
  };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });

  eq(sandbox._jAddTradeOrig, legacyAdd, 'runtime alias keeps the original legacy add function');
  eq(sandbox._jUpdateTradeOrig, legacyUpdate, 'runtime alias keeps the original legacy update function');
  eq(sandbox._jDeleteTradeOrig, legacyDelete, 'runtime alias keeps the original legacy delete function');
  eq(sandbox.jAddTrade({ id: 'L1' }), 'L1', 'legacy add return value is preserved');
  eq(sandbox.jUpdateTrade('L1', { notes: 'x' }), 'legacy-updated', 'legacy update return value is preserved');
  eq(sandbox.jDeleteTrade('L1'), 'legacy-deleted', 'legacy delete return value is preserved');
  eq(legacyCalls, [['add', 'L1'], ['update', 'L1'], ['delete', 'L1']],
    'each legacy original is invoked exactly once');
  eq(remoteCalls.slice(0, 3).map((entry) => [entry.op, entry.id]),
    [['save', 'L1'], ['update', 'L1'], ['delete', 'L1']],
    'legacy CRUD delegates to the matching remote operation');

  const payloadInput = {
    id: 7,
    portfolio_id: 'PF7',
    live: { delta: 0.3 },
    legs: [{ type: 'PUT', expiry: '2027-01-15', strike: 100, side: 'SELL', qty: 2, streamerSymbol: '.SPY' }],
  };
  const payloadSnapshot = JSON.stringify(payloadInput);
  const payload = sandbox._tradeForBackend(payloadInput);
  eq(JSON.stringify(payloadInput), payloadSnapshot, 'payload normalization never mutates the source trade');
  ok(!Object.prototype.hasOwnProperty.call(payload, 'live'), 'payload normalization drops volatile live data');
  eq(payload.id, '7', 'payload normalization stringifies the trade id');
  eq([payload.portfolioId, payload.portfolio_id], ['PF7', 'PF7'], 'payload normalization writes both portfolio aliases');
  eq([
    payload.legs[0].option_type,
    payload.legs[0].expiration_date,
    payload.legs[0].strike_price,
    payload.legs[0].action,
    payload.legs[0].quantity,
  ], ['PUT', '2027-01-15', 100, 'SELL', 2], 'leg aliases are normalized for the backend');

  const patchedRefs = Object.fromEntries(MANAGER_PATCHES.map((name) => [name, jm[name]]));
  for (const name of MANAGER_PATCHES) ok(patchedRefs[name] !== originals[name], 'manager method is patched: ' + name);
  eq(jm.add(managerTrades.M1), managerTrades.M1, 'manager add return value is preserved');
  ok(jm._lastBackendWrite && typeof jm._lastBackendWrite.then === 'function',
    'manager add exposes the backend write promise');
  await jm._lastBackendWrite;
  eq(jm.update('M1', {}), 'updated', 'manager update return value is preserved');
  await jm._lastBackendWrite;
  eq(jm.patchSnapshotTech('M1', 'entrySnapshot', 'skip'), false,
    'false snapshot patch result remains false');
  const updatesBeforePatch = remoteCalls.filter((entry) => entry.op === 'update').length;
  eq(jm.patchSnapshotTech('M1', 'entrySnapshot', 'apply'), true,
    'true snapshot patch result remains true');
  eq(remoteCalls.filter((entry) => entry.op === 'update').length, updatesBeforePatch + 1,
    'only a successful snapshot patch triggers backend update');
  eq(jm.remove('M2'), 'removed', 'manager remove return value is preserved');
  eq(jm.removeByPortfolio('P9'), 'portfolio-removed', 'manager portfolio removal return value is preserved');
  ok(remoteCalls.some((entry) => entry.op === 'delete' && entry.id === 'M2'),
    'manager remove delegates the exact string id');
  eq(remoteCalls.filter((entry) => entry.op === 'delete' && /^PF-/.test(entry.id)).map((entry) => entry.id),
    ['PF-A', 'PF-B'], 'portfolio removal snapshots and delegates both trade ids');
  ok(originalManagerCalls.includes('add') && originalManagerCalls.includes('update') &&
    originalManagerCalls.includes('patchSnapshotTech') && originalManagerCalls.includes('remove') &&
    originalManagerCalls.includes('removeByPortfolio'),
  'patched manager paths preserve their original method calls');
}

section('6. Rejected adjacent owners and extraction fallout');
const wrapperOnly = BASE.slice(wrapperAt, managerAt - 1);
const managerOnly = BASE.slice(managerAt, candidateEnd);
const migrationOnly = BASE.slice(migrationAt, manualImportAt - 1);
const manualOnly = BASE.slice(manualImportAt, backupAt - 1);
eq(legacyPatchNames(wrapperOnly), LEGACY_PATCHES, 'wrapper-only slice has all three legacy patches');
eq(managerPatchNames(wrapperOnly), [], 'wrapper-only slice omits all manager terminal patches');
eq(legacyPatchNames(managerOnly), [], 'manager-only slice omits all legacy patches');
eq(managerPatchNames(managerOnly), MANAGER_PATCHES, 'manager-only slice has all nine manager patches');
ok(topLevelShape(migrationOnly).some((entry) => entry.name === 'jMigrateApexTradesToBackend'),
  'adjacent migration owns a separate login-triggered async policy');
ok(maskLiterals(migrationOnly).includes('isApexPreviewOrLocalEnv'),
  'migration alone owns the preview/local auto-upload gate');
ok(maskLiterals(manualOnly).includes('window.apexImportJournalTradesJson'),
  'manual import alone owns an explicit console/window exposure');
eq(boundaryViolations(MODULE, OUTSIDE_BASE), [], 'extracted module passes every semantic ownership gate');

const loaderAwareConsumers = [
  'tests/journal-import-json.test.js',
  'tests/portfolio-backend-first-regression.test.js',
];
for (const rel of loaderAwareConsumers) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('load-app-source'), rel + ' already follows external modules through the app loader');
  ok(source.includes('_tradeForBackend'), rel + ' explicitly exercises the payload normalizer');
}
const contractsToAdvance = [
  'tests/journal-remote-persistence-boundary-contract.test.js',
  'tests/journal-ui-boundary-contract.test.js',
  'tests/journal-core-boundary-contract.test.js',
  'tests/mcx-regime-policy-boundary-contract.test.js',
  'tests/mcx-backend-candles-boundary-contract.test.js',
];
for (const rel of contractsToAdvance) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('journal-backend-write-through.js'), rel + ' advances to the current classic-script tail');
}
const directInlineContract = fs.readFileSync(path.join(ROOT, 'tests/journal-backend-save-confirm.test.js'), 'utf8');
ok(directInlineContract.includes('load-app-source') && directInlineContract.includes('journal-backend-write-through.js'),
  'save-confirm contract reads the extracted write-through module explicitly');
ok(!directInlineContract.includes("HTML.indexOf('journalManager → Backend Sync Layer')"),
  'save-confirm contract no longer depends on an inline marker window');

section('7. Byte-exact undo, cumulative history and negative controls');
const rebuilt = U.undoJournalBackendWriteThrough(preMigrationIndex, MODULE);
eq(rebuilt, BASE, 'write-through undo reconstructs merged #399 base byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
const preRemote = REMOTE_U.undoJournalRemotePersistence(rebuilt, REMOTE_MODULE);
eq(preRemote.length, REMOTE_U.BASE_CHARS, 'cumulative undo reaches the pre-Remote base');
eq(sha256(preRemote), REMOTE_U.BASE_SHA256, 'cumulative undo hash matches the pre-Remote base');
assert.throws(() => U.undoJournalBackendWriteThrough(preMigrationIndex, MODULE + ' '), /MODULE_IDENTITY/);
pass++;
assert.throws(() => U.undoJournalBackendWriteThrough(
  preMigrationIndex.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /TAG_IDENTITY/);
pass++;
assert.throws(() => U.undoJournalBackendWriteThrough(preMigrationIndex.replace(MODULE_TAG, ''), MODULE), /TAG_IDENTITY/);
pass++;

ok(boundaryViolations(MODULE.replace('var _jAddTradeOrig = jAddTrade;\n', ''), OUTSIDE_BASE).includes('manifest'),
  'missing legacy alias mutant is rejected');
ok(boundaryViolations(MODULE.replace('jm.remove = function(id)', 'jm.removeTrade = function(id)'), OUTSIDE_BASE)
  .includes('manager-patches'), 'renamed manager patch mutant is rejected');
ok(boundaryViolations(MODULE + '\nfunction foreignWriteThroughOwner() {}\n', OUTSIDE_BASE).includes('manifest'),
  'foreign top-level owner mutant is rejected');
ok(boundaryViolations(MODULE + '\ndocument.body;\n', OUTSIDE_BASE).includes('foreign-direct-effect'),
  'foreign DOM effect mutant is rejected');
ok(boundaryViolations(MODULE + '\njSaveRemote({});\n', OUTSIDE_BASE).includes('load-contract'),
  'top-level remote invocation mutant is rejected by minimal classic load');
ok(boundaryViolations(MODULE + '\n' + migrationOnly, OUTSIDE_BASE).includes('owner-overreach'),
  'migration overreach mutant is rejected');
ok(boundaryViolations(MODULE, OUTSIDE_BASE + '\njAddTrade = function() {};\n').includes('later-global-patch'),
  'competing later legacy patch mutant is rejected');
ok(sha256(MODULE.replace('delete t.live;', 'delete t.notes;')) !== sha256(MODULE),
  'same-length payload mutation is rejected by the identity pin');

ok(futureOrderViolations(INDEX.replace(MODULE_TAG + '\n', '')).includes('tag-count'),
  'missing module tag mutant is rejected');
ok(futureOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)).includes('tag-count'),
  'duplicate module tag mutant is rejected');
ok(futureOrderViolations(INDEX.replace(
  REMOTE_TAG + '\n' + MODULE_TAG,
  MODULE_TAG + '\n' + REMOTE_TAG
)).includes('load-order'), 'module tag before Journal Remote mutant is rejected');
ok(futureOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' defer>')))
  .includes('classic-tag'), 'deferred module tag mutant is rejected');
eq(identifierCountMasked(maskLiterals('// _tradeForBackend\n"_tradeForBackend"; _tradeForBackendCopy;'), '_tradeForBackend'), 0,
  'identifier inventory ignores comments, strings and suffix collisions');

section('8. Production scope and temporary-audit replacement');
const committedChanged = execFileSync('git', ['diff', '--name-only', BASE_SHA], {
  cwd: ROOT, encoding: 'utf8',
}).trim().split(/\r?\n/).filter(Boolean);
const statusChanged = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
  cwd: ROOT, encoding: 'utf8',
}).split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
const changed = Array.from(new Set(committedChanged.concat(statusChanged))).sort();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort();
eq(changedProduction, [
  'index.html', MODULE_REL, 'js/services/journal-migration.js',
  'js/services/journal-manual-import.js'
].sort(), 'production footprint is index.html plus Write-through, Migration, and Manual Import');
ok(!changed.some((rel) => rel.startsWith('.github/') || rel.startsWith('scripts/')),
  'no workflow or bootstrap script changed');
eq(fs.existsSync(path.join(ROOT, 'tests/temporary-journal-backend-write-through-audit.test.js')), false,
  'temporary audit is removed by the extraction');

const report = {
  base: {
    commit: BASE_SHA,
    tree: BASE_TREE,
    indexChars: BASE.length,
    indexSha256: sha256(BASE),
  },
  selected: {
    module: MODULE_REL,
    start: wrapperAt,
    end: candidateEnd,
    startLine: lineAt(BASE, wrapperAt),
    endLine: lineAt(BASE, candidateEnd),
    chars: CANDIDATE.length,
    sha256: sha256(CANDIDATE),
    topLevelOwners: TOP_LEVEL_OWNERS,
    legacyPatches: LEGACY_PATCHES,
    managerPatches: MANAGER_PATCHES,
    externalPayloadConsumers: externalUsage('_tradeForBackend'),
  },
  rejected: {
    migration: 'login-triggered auto-upload policy with preview/local gate',
    manualImport: 'explicit console-only cross-host repair surface',
    backupPanel: 'DOM UI and backup transport owner',
  },
  extractionContract: {
    productionFiles: ['index.html', MODULE_REL],
    permanentTest: 'tests/journal-backend-write-through-boundary-contract.test.js',
    undoHelper: 'tests/lib/journal-backend-write-through-undo.js',
    currentIndexChars: INDEX.length,
    currentIndexSha256: sha256(INDEX),
    contractsToAdvance,
    loaderAwareConsumers,
  },
};

verifyBehavior().then(() => {
  console.log('\nJOURNAL_BACKEND_WRITE_THROUGH_CONTRACT_BEGIN');
  console.log(JSON.stringify(report, null, 2));
  console.log('JOURNAL_BACKEND_WRITE_THROUGH_CONTRACT_END');
  console.log('\n' + pass + ' assertions passed');
  console.log('JOURNAL_BACKEND_WRITE_THROUGH_BOUNDARY_CONTRACT_OK');
}).catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
