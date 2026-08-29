'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL REMOTE PERSISTENCE — inert service extraction boundary.
//
// Audited base: dev-clean @ b82d2c8c616e91eff7197faf017ebc1451ced723
// Scope: relocation only. Two state bindings and six async functions move as
// one contiguous byte-identical slice. The adjacent CRUD wrappers and the
// journalManager/backend sync layer later moved together into their own
// ordered classic-script bridge because they perform load-time patching.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const U = require('./lib/journal-remote-persistence-undo.js');
const JOURNAL_UI_U = require('./lib/journal-ui-undo.js');
const WRITE_U = require('./lib/journal-backend-write-through-undo.js');
const MIGRATION_U = require('./lib/journal-migration-undo.js');
const APEX_POST_AUTH_U = require('./lib/apex-post-auth-init-undo.js');
const MCX_CHARTS_U = require('./lib/mcx-charts-undo.js');
const MCX_MACRO_CHECK_U = require('./lib/mcx-macro-check-undo.js');
const BACKUP_RESTORE_U = require('./lib/journal-backup-restore-undo.js');
const MANUAL_U = require('./lib/journal-manual-import-undo.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = 'b82d2c8c616e91eff7197faf017ebc1451ced723';
const MODULE_REL = 'js/services/journal-remote-persistence.js';
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const JOURNAL_UI_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-ui.js'), 'utf8');
const WRITE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-backend-write-through.js'), 'utf8');
const MIGRATION_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
const INDEX = APP_LOADER.loadIndexHtml();
const APP = APP_LOADER.loadAppJavaScriptSource();
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});

const STATE = ['jSyncing', 'jLastSync'];
const FUNCTIONS = [
  'jSaveRemote', 'jEnrichedDryRun', 'jUpdateRemote', 'jDeleteRemote',
  'jSyncToBackend', 'jLoadFromBackend',
];
const MANIFEST = STATE.concat(FUNCTIONS);

const MCX1_TAG = '<script src="./js/services/mcx-market-context.js"></script>';
const MCX2_TAG = '<script src="./js/services/mcx-vix-market-context.js"></script>';
const MCX3_TAG = '<script src="./js/services/mcx-backend-candles.js"></script>';
const JOURNAL_CORE_TAG = '<script src="./js/services/journal-core.js"></script>';
const REGIME_TAG = '<script src="./js/services/mcx-regime-policy.js"></script>';
const JOURNAL_UI_TAG = '<script src="./js/ui/journal-ui.js"></script>';
const REMOTE_TAG = '<script src="./js/services/journal-remote-persistence.js"></script>';
const WRITE_TAG = '<script src="./js/services/journal-backend-write-through.js"></script>';
const MIGRATION_TAG = '<script src="./js/services/journal-migration.js"></script>';
const MANUAL_TAG = '<script src="./js/services/journal-manual-import.js"></script>';
const BACKUP_RESTORE_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>';
const MCX_MACRO_CHECK_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>';
const MCX_CHARTS_TAG = '<script src="./js/ui/mcx-charts.js"></script>';
const APEX_POST_AUTH_TAG = '<script src="./js/services/apex-post-auth-init.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';
const REMOTE_MARKER =
  '// ══════════════════════════════════════════════════════════════\n' +
  '// JOURNAL REMOTE PERSISTENCE — v1\n';
const WRAPPER_MARKER =
  '// ── Patched wrappers: extend existing functions with remote calls ──\n';
const MANAGER_MARKER =
  '// ═══════════════════════════════════════════════════════════════════\n' +
  '// journalManager → Backend Sync Layer\n';

let pass = 0, fail = 0;
function ok(value, message) {
  if (value) { pass++; console.log('  PASS  ' + message); }
  else { fail++; console.log('  FAIL  ' + message); }
}
function eq(actual, expected, message) {
  ok(actual === expected, message + (actual === expected ? '' :
    ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')'));
}
function same(actual, expected, message) {
  eq(JSON.stringify(actual), JSON.stringify(expected), message);
}
function section(title) { console.log('\n' + title); }
function sha256(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}
function count(source, needle) {
  let total = 0, at = 0;
  while ((at = source.indexOf(needle, at)) >= 0) {
    total++;
    at += needle.length;
  }
  return total;
}
function esc(value) { return value.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'); }
function identifierCount(source, name) {
  return (source.match(new RegExp('(?:^|[^A-Za-z0-9_$])' + esc(name) + '(?![A-Za-z0-9_$])', 'gm')) || []).length;
}
function fnCount(source, name) {
  return (source.match(new RegExp('(?:async\\s+)?function\\s+' + esc(name) + '\\s*\\(', 'g')) || []).length;
}
function varDeclCount(source, name) {
  return (source.match(new RegExp('(?:^|\\n)\\s*var\\s+' + esc(name) + '\\s*=', 'g')) || []).length;
}
function writeCount(source, name) {
  const target = esc(name) + '(?:\\s*\\[[^\\]\\n]+\\]|\\.[A-Za-z_$][A-Za-z0-9_$]*)?';
  return (source.match(new RegExp('(?:^|[^A-Za-z0-9_$])' + target + '\\s*(?:=|\\+=|-=|\\+\\+|--)', 'gm')) || []).length;
}
function topLevelNames(source) {
  const names = [];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^var\s+([A-Za-z_$][\w$]*)\s*=/gm;
  let match;
  while ((match = re.exec(source))) names.push(match[1] || match[2]);
  return names;
}
function throws(fn, message) {
  let didThrow = false;
  try { fn(); } catch (_) { didThrow = true; }
  ok(didThrow, message);
}

console.log('Journal Remote Persistence boundary contract');
console.log('base=' + BASE_SHA);

section('1. pinned base and exact contiguous relocation identity');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_SHA, 'merged #397 audit base resolves exactly');
eq(BASE.length, U.BASE_CHARS, 'base UTF-16 length matches undo pin');
eq(sha256(BASE), U.BASE_SHA256, 'base SHA-256 matches undo pin');
const remoteAt = BASE.indexOf(REMOTE_MARKER);
const wrapperAt = BASE.indexOf(WRAPPER_MARKER);
const managerAt = BASE.indexOf(MANAGER_MARKER);
eq(count(BASE, REMOTE_MARKER), 1, 'base remote marker is unique');
eq(count(BASE, WRAPPER_MARKER), 1, 'base wrapper marker is unique');
eq(count(BASE, MANAGER_MARKER), 1, 'base manager marker is unique');
ok(remoteAt < wrapperAt && wrapperAt < managerAt, 'base order is service -> wrappers -> manager layer');
eq(remoteAt, U.SLICE_AT, 'audited service slice starts at pinned offset');
eq(wrapperAt - 1 - remoteAt, U.SLICE_CHARS, 'audited service slice has pinned length');
eq(BASE[wrapperAt - 1], '\n', 'one separator LF remains with inline wrappers');
const baseSlice = BASE.slice(remoteAt, wrapperAt - 1);
eq(sha256(baseSlice), U.SLICE_SHA256, 'audited service slice SHA-256 matches');
eq(MODULE.length, U.MODULE_CHARS, 'module length matches audited extraction');
eq(sha256(MODULE), U.MODULE_SHA256, 'module SHA-256 matches audited extraction');
eq(MODULE, baseSlice, 'module is byte-for-byte the complete audited base slice');
same(topLevelNames(MODULE), MANIFEST, 'module declares exactly the eight intended owners in physical order');

const baseWithoutSlice = BASE.slice(0, remoteAt) + BASE.slice(wrapperAt - 1);
const expectedIndex = baseWithoutSlice.replace(
  JOURNAL_UI_TAG + '\n<script>',
  JOURNAL_UI_TAG + '\n' + REMOTE_TAG + '\n<script>'
);
const MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-manual-import.js'), 'utf8');
const APEX_POST_AUTH_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/apex-post-auth-init.js'), 'utf8');
const MCX_CHARTS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-charts.js'), 'utf8');
const MCX_MACRO_CHECK_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-macro-check.js'), 'utf8');
const BACKUP_RESTORE_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-backup-restore.js'), 'utf8');
// The seventh Journal owner is the newest layer: peel Backup/Restore before Manual Import.
// The MCX charts/lifecycle owner is the newest layer of all, sitting on top of
// the MCX macro-check owner, which sits on top of Backup/Restore: peel them
// NEWEST-FIRST, so each undo below still sees the exact document it was cut
// against. Every helper re-verifies what it hands back by length and SHA-256,
// so each hop is proved, not assumed.
// The Apex shared post-auth lifecycle owner is now the NEWEST layer of all,
// sitting on top of MCX charts: peel it first so the MCX charts undo below
// still sees the exact document it was cut against.
const preApexPostAuth = APEX_POST_AUTH_U.undoApexPostAuthInit(INDEX, APEX_POST_AUTH_MODULE);
eq(preApexPostAuth.length, APEX_POST_AUTH_U.BASE_CHARS,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index length');
eq(sha256(preApexPostAuth), APEX_POST_AUTH_U.BASE_SHA256,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index hash');
ok(APEX_POST_AUTH_U.isApplied(INDEX),
  'the shipped index really does carry the Apex post-auth layer being peeled');
ok(!APEX_POST_AUTH_U.isApplied(preApexPostAuth),
  'the peeled document no longer carries the Apex post-auth tag');
const preMcxCharts = MCX_CHARTS_U.undoMcxCharts(preApexPostAuth, MCX_CHARTS_MODULE);
const preMcxMacroCheck = MCX_MACRO_CHECK_U.undoMcxMacroCheck(preMcxCharts, MCX_MACRO_CHECK_MODULE);
eq(preMcxCharts.length, MCX_CHARTS_U.BASE_CHARS,
  'peeling the MCX charts layer reaches the pinned post-#406 index length');
eq(sha256(preMcxCharts), MCX_CHARTS_U.BASE_SHA256,
  'peeling the MCX charts layer reaches the pinned post-#406 index hash');
ok(MCX_CHARTS_U.isApplied(preApexPostAuth),
  'the post-#409 document really does carry the MCX charts layer being peeled');
ok(!MCX_CHARTS_U.isApplied(preMcxCharts),
  'the peeled document no longer carries the MCX charts tag');
const preBackupRestore = BACKUP_RESTORE_U.undoJournalBackupRestore(preMcxMacroCheck, BACKUP_RESTORE_MODULE);
eq(preMcxMacroCheck.length, MCX_MACRO_CHECK_U.BASE_CHARS,
  'peeling the MCX macro-check layer reaches the pinned post-#405 index length');
eq(sha256(preMcxMacroCheck), MCX_MACRO_CHECK_U.BASE_SHA256,
  'peeling the MCX macro-check layer reaches the pinned post-#405 index hash');
ok(MCX_MACRO_CHECK_U.isApplied(preMcxCharts),
  'the charts-peeled index really does carry the MCX macro-check layer being peeled');
ok(!MCX_MACRO_CHECK_U.isApplied(preMcxMacroCheck),
  'the peeled document no longer carries the MCX macro-check tag');

const preManualIndex = MANUAL_U.undoJournalManualImport(preBackupRestore, MANUAL_MODULE);
const preMigrationIndex = MIGRATION_U.undoJournalMigration(preManualIndex, MIGRATION_MODULE);
const preWriteIndex = WRITE_U.undoJournalBackendWriteThrough(preMigrationIndex, WRITE_MODULE);
eq(preWriteIndex, expectedIndex, 'newest undo reaches exactly base minus Remote slice plus its classic tag');
eq(preWriteIndex.length, 1964275, 'post-Remote/pre-Write-through index UTF-16 length is pinned');
eq(sha256(preWriteIndex), 'bf7ad9d7c3a7cc2e0975e6e06b1af0ef5383232433cab5e56b75cdac7fbac973',
  'post-Remote/pre-Write-through index SHA-256 is pinned');

section('2. ownership — zero inline residue and one app-wide declaration');
for (const name of FUNCTIONS) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(fnCount(MODULE, name), 1, name + ' is declared once in Journal Remote');
  eq(fnCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
for (const name of STATE) {
  eq(varDeclCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(varDeclCount(MODULE, name), 1, name + ' is declared once in Journal Remote');
  eq(varDeclCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
const baseOutside = BASE.slice(0, remoteAt) + BASE.slice(wrapperAt - 1);
eq(MANIFEST.reduce((sum, name) => sum + writeCount(baseOutside, name), 0), 0,
  'all eight owners have zero writes outside the audited slice');
eq(identifierCount(baseOutside, 'jSyncing'), 0, 'jSyncing has no outside consumer');
eq(writeCount(baseOutside, 'jLastSync'), 0, 'Journal UI reads but never writes jLastSync');

section('3. exact classic load slot and intentionally retained effects');
const mcx1At = INDEX.indexOf(MCX1_TAG), inlineAt = INDEX.indexOf(INLINE_OPEN);
eq(count(INDEX, REMOTE_TAG), 1, 'exactly one Journal Remote script tag');
eq(INDEX.slice(mcx1At, inlineAt),
  MCX1_TAG + '\n' + MCX2_TAG + '\n' + MCX3_TAG + '\n' + JOURNAL_CORE_TAG + '\n' +
  REGIME_TAG + '\n' + JOURNAL_UI_TAG + '\n' + REMOTE_TAG + '\n' + WRITE_TAG + '\n' + MIGRATION_TAG + '\n' + MANUAL_TAG + '\n' + BACKUP_RESTORE_TAG + '\n' + MCX_MACRO_CHECK_TAG + '\n' + MCX_CHARTS_TAG + '\n' + APEX_POST_AUTH_TAG + '\n',
  'service tail ends UI -> Remote -> Write-through -> Migration -> Manual Import -> Backup/Restore -> MCX macro check -> MCX charts -> Apex post-auth -> inline');
ok(INDEX.indexOf(JOURNAL_UI_TAG) < INDEX.indexOf(REMOTE_TAG) &&
  INDEX.indexOf(REMOTE_TAG) < INDEX.indexOf(WRITE_TAG) &&
  INDEX.indexOf(WRITE_TAG) < INDEX.indexOf(MIGRATION_TAG) &&
  INDEX.indexOf(MIGRATION_TAG) < INDEX.indexOf(MANUAL_TAG) &&
  INDEX.indexOf(MANUAL_TAG) < INDEX.indexOf(BACKUP_RESTORE_TAG) &&
  INDEX.indexOf(BACKUP_RESTORE_TAG) < inlineAt,
  'Journal Remote loads synchronously before Write-through, Migration, Manual Import, and inline consumers');
ok(!/\b(?:async|defer|type)\s*=/.test(REMOTE_TAG), 'Journal Remote tag is classic synchronous src-only form');
eq(count(INDEX, REMOTE_MARKER), 0, 'remote service marker has zero inline residue');
eq(count(MODULE, REMOTE_MARKER), 1, 'remote service marker belongs to the module exactly once');
eq(count(INDEX, WRAPPER_MARKER), 0, 'CRUD wrapper marker has zero inline residue');
eq(count(INDEX, MANAGER_MARKER), 0, 'journalManager sync marker has zero inline residue');
eq(count(WRITE_MODULE, WRAPPER_MARKER), 1, 'CRUD wrapper marker moved once into Write-through');
eq(count(WRITE_MODULE, MANAGER_MARKER), 1, 'manager sync marker moved once into Write-through');
for (const name of ['_jAddTradeOrig', '_jUpdateTradeOrig', '_jDeleteTradeOrig']) {
  eq(varDeclCount(INDEX, name), 0, name + ' load-time alias has zero inline residue');
  eq(varDeclCount(MODULE, name), 0, name + ' is excluded from the service');
  eq(varDeclCount(WRITE_MODULE, name), 1, name + ' moved once into Write-through');
}
for (const name of ['jAddTrade', 'jUpdateTrade', 'jDeleteTrade']) {
  eq((INDEX.match(new RegExp('(?:^|\\n)' + name + '\\s*=\\s*function', 'g')) || []).length, 0,
    name + ' reassignment has zero inline residue');
  eq((WRITE_MODULE.match(new RegExp('(?:^|\\n)' + name + '\\s*=\\s*function', 'g')) || []).length, 1,
    name + ' reassignment moved exactly once into Write-through');
}

section('4. classic load is inert; transport effects remain call-time only');
try {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(MANIFEST.every((name) => name in sandbox), 'all eight globals exist after classic-script evaluation');
  eq(sandbox.jSyncing, false, 'initial sync lock remains false');
  eq(sandbox.jLastSync, null, 'initial last-sync timestamp remains null');
} catch (error) {
  console.log(error && error.stack || error);
  ok(false, 'module evaluates without touching call-time globals');
  ok(false, 'all eight globals exist after evaluation');
}
eq((MODULE.match(/\bttCall\s*\(/g) || []).length, 5, 'five backend ttCall sites remain inside functions');
eq((MODULE.match(/\bfetch\s*\(/g) || []).length, 1, 'one DELETE fetch remains inside jDeleteRemote');
eq((MODULE.match(/\bdocument\s*\./g) || []).length, 0, 'service owns no DOM access');
eq((MODULE.match(/\blocalStorage\s*\./g) || []).length, 0, 'service owns no direct localStorage access');
eq((MODULE.match(/\bset(?:Timeout|Interval)\s*\(/g) || []).length, 0, 'service creates no timers');
eq((MODULE.match(/\baddEventListener\s*\(/g) || []).length, 0, 'service registers no listeners');
eq((MODULE.match(/\b(?:new\s+)?WebSocket\b/g) || []).length, 0, 'service opens no WebSocket');

section('5. real async service behavior remains callable through mocks');
async function verifyBehavior() {
  const calls = [];
  const records = [];
  let saved = null;
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    BACKEND: 'https://backend.example',
    S: { backendKey: 'key', ttSessionId: 'session' },
    AbortSignal: { timeout(ms) { return { ms }; } },
    _apexBackendOffloadDiag: {},
    ffBackendOffloadV1() { return false; },
    _httpStatusFromError() { return 500; },
    _recordBackendApiAuthResult() {},
    _recordJournalBackendSave(entry) { records.push(entry); },
    isApexLocalDevEnv() { return false; },
    jLoad() {
      return [{ id: 'A', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }];
    },
    jSave(trades) { saved = trades; return true; },
    async ttCall(route, options) {
      calls.push({ route, options: options || null });
      if (route === '/journal/trades' && options && options.method === 'POST') return { id: 'N' };
      if (route === '/journal/trades/A' && options && options.method === 'PUT') return { id: 'A' };
      if (route === '/journal/sync') return { total: 1, created: 1, updated: 0 };
      if (route === '/journal/trades') {
        return { trades: [{ id: 'B', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' }] };
      }
      throw new Error('unexpected route ' + route);
    },
    async fetch(route, options) {
      calls.push({ route, options });
      return { status: 404, ok: false, async text() { return ''; } };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });

  const created = await sandbox.jSaveRemote({ id: 'N' });
  eq(created.ok, true, 'jSaveRemote preserves backend-confirmed structured outcome');
  eq(created.source, 'backend', 'jSaveRemote outcome source remains backend');
  const updated = await sandbox.jUpdateRemote('A', { ticker: 'SPY' });
  eq(updated.ok, true, 'jUpdateRemote preserves backend-confirmed outcome');
  eq(await sandbox.jDeleteRemote('gone'), true, 'jDeleteRemote still treats 404 as already deleted');
  await sandbox.jSyncToBackend();
  eq(sandbox.jSyncing, false, 'bulk sync always releases its lock');
  ok(/^\d{4}-\d{2}-\d{2}T/.test(sandbox.jLastSync), 'bulk sync updates the ISO timestamp');
  eq(await sandbox.jLoadFromBackend(), true, 'backend pull succeeds');
  eq(saved.length, 2, 'backend pull merges the remote row with local state');
  eq(saved[0].id, 'B', 'merged rows keep descending created-date behavior');
  ok(calls.some((call) => call.route === '/journal/trades' && call.options && call.options.method === 'POST'),
    'save still uses POST /journal/trades');
  ok(calls.some((call) => call.route === '/journal/trades/A' && call.options && call.options.method === 'PUT'),
    'update still uses PUT /journal/trades/:id');
  ok(calls.some((call) => call.route === '/journal/sync'), 'bulk sync still uses /journal/sync');
  ok(records.some((entry) => entry.op === 'save' && entry.ok), 'save diagnostic remains recorded');
}

section('6. byte-exact undo, cumulative history and negative controls');
const rebuilt = U.undoJournalRemotePersistence(preWriteIndex, MODULE);
eq(rebuilt, BASE, 'Journal Remote undo reconstructs merged #397 base byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
const preJournalUi = JOURNAL_UI_U.undoJournalUi(rebuilt, JOURNAL_UI_MODULE);
eq(preJournalUi.length, JOURNAL_UI_U.BASE_CHARS, 'cumulative undo reaches the pre-Journal-UI base');
eq(sha256(preJournalUi), JOURNAL_UI_U.BASE_SHA256, 'cumulative undo hash matches pre-Journal-UI base');
throws(() => U.undoJournalRemotePersistence(preWriteIndex, MODULE + ' '), 'module-byte mutant is rejected');
throws(() => U.undoJournalRemotePersistence(preWriteIndex.replace(REMOTE_TAG, REMOTE_TAG + '\n' + REMOTE_TAG), MODULE),
  'duplicate-tag mutant is rejected');
throws(() => U.undoJournalRemotePersistence(preWriteIndex.replace(REMOTE_TAG, ''), MODULE),
  'missing-tag mutant is rejected');
same(topLevelNames(MODULE + '\nfunction foreignRemoteOwner(){}'), MANIFEST.concat(['foreignRemoteOwner']),
  'manifest scanner exposes a foreign owner mutant');
ok(fnCount(INDEX + '\n' + baseSlice, 'jSaveRemote') > 0,
  'inline-duplication mutant is visible to zero-residue guard');
ok(writeCount(baseOutside + '\njSyncing = true;\n', 'jSyncing') > 0,
  'foreign-state-write mutant is visible to ownership guard');
const wrappers = BASE.slice(wrapperAt, managerAt - 1);
let wrapperLoadFailed = false;
try { vm.runInNewContext(wrappers, { console: { log() {}, warn() {}, error() {} } }); }
catch (_) { wrapperLoadFailed = true; }
ok(wrapperLoadFailed, 'wrapper-overreach mutant fails standalone load-time evaluation');
eq(identifierCount('jLastSyncShadow; jLastSync; jLastSyncCopy;', 'jLastSync'), 1,
  'identifier guard ignores prefix/suffix collisions');

section('7. production scope');
const changed = execFileSync('git', ['diff', '--name-only', BASE_SHA], {
  cwd: ROOT, encoding: 'utf8',
}).trim().split(/\r?\n/).filter(Boolean);
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort();
same(changedProduction, [
  'index.html', MODULE_REL, 'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js', 'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js', 'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js',
].sort(), 'production footprint includes Journal Remote plus later Write-through, Migration, Manual Import, Backup/Restore, MCX macro-check and MCX charts modules');
ok(!changed.some((rel) => rel.startsWith('.github/') || rel.startsWith('scripts/')),
  'no workflow or bootstrap script changed');
eq(fs.existsSync(path.join(ROOT, 'tests/temporary-journal-remote-post-ui-audit.test.js')), false,
  'temporary audit is removed by the extraction');

verifyBehavior().then(function() {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
  console.log('JOURNAL REMOTE PERSISTENCE BOUNDARY CONTRACT: OK');
}).catch(function(error) {
  console.log(error && error.stack || error);
  process.exit(1);
});
