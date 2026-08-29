'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL UI — complete UI/export/forms extraction boundary.
//
// Audited base: dev-clean @ 395f19575cdc543b3a370e2168e2e6cfb823a4a7
// Scope: relocation only. One contiguous 42-owner block moves out of the
// monolith. Journal Core remains in its service; remote persistence later moved
// to its own service, while wrapper/sync/migration effects and the HTML entry
// point deliberately remain outside this UI owner. The module is a classic
// synchronous script and is inert at load time.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const U = require('./lib/journal-ui-undo.js');
const REMOTE_U = require('./lib/journal-remote-persistence-undo.js');
const WRITE_U = require('./lib/journal-backend-write-through-undo.js');
const MIGRATION_U = require('./lib/journal-migration-undo.js');
const TT_RECONNECT_U = require('./lib/tt-reconnect-undo.js');
const APEX_POST_AUTH_U = require('./lib/apex-post-auth-init-undo.js');
const MCX_CHARTS_U = require('./lib/mcx-charts-undo.js');
const MCX_MACRO_CHECK_U = require('./lib/mcx-macro-check-undo.js');
const BACKUP_RESTORE_U = require('./lib/journal-backup-restore-undo.js');
const MANUAL_U = require('./lib/journal-manual-import-undo.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '395f19575cdc543b3a370e2168e2e6cfb823a4a7';
const MODULE_REL = 'js/ui/journal-ui.js';
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const REMOTE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-remote-persistence.js'), 'utf8');
const WRITE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-backend-write-through.js'), 'utf8');
const MIGRATION_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
const INDEX = APP_LOADER.loadIndexHtml();
const APP = APP_LOADER.loadAppJavaScriptSource();
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});

const STATE = ['jView', 'jFilter', 'jDetailId', 'jEditLeg', 'J_LEG_TEMPLATES'];
const FUNCTIONS = [
  'runJournalPanel', 'renderJournalView', 'jStat', 'jTradeCard', 'jSelectFilter',
  'renderJournalList', 'showJournalExportModal', 'runJournalExport', '_loadSheetJS',
  '_jexNum', '_jexStr', '_jexBool', '_jexTradesSummary', '_jexLegs',
  '_jexAdjustments', '_jexSnapshots', '_jexDataQuality', '_doJournalExcelExport',
  '_doJournalCSVFallback', 'jField', 'jFieldSelect', 'jFieldArea', 'jSelect',
  'jInput', 'jPill', 'jAnalyticCard', 'jOnStrategyChange', 'renderJournalAdd',
  'jSubmitAdd', 'renderJournalEdit', 'jSubmitEdit', 'renderJournalDetail',
  'jCloseTrade', 'renderJournalAnalytics', 'jQuickCapture', 'jDecisionColor',
  'jGradeColor',
];
const MANIFEST = [
  'jView', 'jFilter', 'jDetailId', 'jEditLeg',
  'runJournalPanel', 'renderJournalView', 'jStat', 'jTradeCard', 'jSelectFilter',
  'renderJournalList', 'showJournalExportModal', 'runJournalExport', '_loadSheetJS',
  '_jexNum', '_jexStr', '_jexBool', '_jexTradesSummary', '_jexLegs',
  '_jexAdjustments', '_jexSnapshots', '_jexDataQuality', '_doJournalExcelExport',
  '_doJournalCSVFallback', 'jField', 'jFieldSelect', 'jFieldArea', 'jSelect',
  'jInput', 'jPill', 'jAnalyticCard', 'J_LEG_TEMPLATES', 'jOnStrategyChange',
  'renderJournalAdd', 'jSubmitAdd', 'renderJournalEdit', 'jSubmitEdit',
  'renderJournalDetail', 'jCloseTrade', 'renderJournalAnalytics', 'jQuickCapture',
  'jDecisionColor', 'jGradeColor',
];
const REMOTE_FUNCTIONS = [
  'jSaveRemote', 'jEnrichedDryRun', 'jUpdateRemote', 'jDeleteRemote', 'jSyncToBackend', 'jLoadFromBackend',
];
const REMOTE_STATE = ['jSyncing', 'jLastSync'];

const MCX1_TAG = '<script src="./js/services/mcx-market-context.js"></script>';
const MCX2_TAG = '<script src="./js/services/mcx-vix-market-context.js"></script>';
const MCX3_TAG = '<script src="./js/services/mcx-backend-candles.js"></script>';
const JOURNAL_CORE_TAG = '<script src="./js/services/journal-core.js"></script>';
const REGIME_TAG = '<script src="./js/services/mcx-regime-policy.js"></script>';
const UI_TAG = '<script src="./js/ui/journal-ui.js"></script>';
const REMOTE_TAG = '<script src="./js/services/journal-remote-persistence.js"></script>';
const WRITE_TAG = '<script src="./js/services/journal-backend-write-through.js"></script>';
const MIGRATION_TAG = '<script src="./js/services/journal-migration.js"></script>';
const MANUAL_TAG = '<script src="./js/services/journal-manual-import.js"></script>';
const BACKUP_RESTORE_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>';
const MCX_MACRO_CHECK_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>';
const MCX_CHARTS_TAG = '<script src="./js/ui/mcx-charts.js"></script>';
const APEX_POST_AUTH_TAG = '<script src="./js/services/apex-post-auth-init.js"></script>';
const TT_RECONNECT_TAG = '<script src="./js/ui/tt-reconnect.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';
const UI_MARKER = '// ══════════════════════════════════════════════════════════════\n// JOURNAL UI\n// ══════════════════════════════════════════════════════════════\n\n';
const EXPORT_MARKER = '// ── JOURNAL EXCEL EXPORT ──────────────────────────────────────────\n';
const HELPERS_MARKER = '// ── UI HELPERS ────────────────────────────────────────────────────\n';
const QUICK_MARKER = '// ── Quick capture: pre-fill ADD form from current EIC analysis ──────\n';
const REMOTE_MARKER = '// ══════════════════════════════════════════════════════════════\n// JOURNAL REMOTE PERSISTENCE — v1\n';

let pass = 0, fail = 0;
function ok(v, msg) { if (v) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + (a === b ? '' : ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')')); }
function same(a, b, msg) { eq(JSON.stringify(a), JSON.stringify(b), msg); }
function section(s) { console.log('\n' + s); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(src, needle) { let n = 0, p = 0; while ((p = src.indexOf(needle, p)) >= 0) { n++; p += needle.length; } return n; }
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function identifierCount(src, name) {
  return (src.match(new RegExp('(?:^|[^A-Za-z0-9_$])' + esc(name) + '(?![A-Za-z0-9_$])', 'gm')) || []).length;
}
function fnCount(src, name) { return (src.match(new RegExp('(?:async\\s+)?function\\s+' + esc(name) + '\\s*\\(', 'g')) || []).length; }
function varDeclCount(src, name) { return (src.match(new RegExp('(?:^|\\n)\\s*var\\s+' + esc(name) + '\\s*=', 'g')) || []).length; }
function writeCount(src, name) {
  const target = esc(name) + '(?:\\s*\\[[^\\]\\n]+\\]|\\.[A-Za-z_$][A-Za-z0-9_$]*)?';
  return (src.match(new RegExp('(?:^|[^A-Za-z0-9_$])' + target + '\\s*(?:=|\\+=|-=|\\+\\+|--)', 'gm')) || []).length;
}
function topLevelNames(src) {
  const out = [];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^var\s+([A-Za-z_$][\w$]*)\s*=/gm;
  let m; while ((m = re.exec(src))) out.push(m[1] || m[2]);
  return out;
}
function throws(fn, msg) { let threw = false; try { fn(); } catch (_) { threw = true; } ok(threw, msg); }

console.log('Journal UI boundary contract');
console.log('base=' + BASE_SHA);

section('1. pinned base, audited winner and exact contiguous relocation identity');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_SHA,
  'BASE_SHA resolves to the merged post-#395 audit commit');
eq(BASE.length, U.BASE_CHARS, 'Node UTF-16 base length matches undo pin');
eq(sha256(BASE), U.BASE_SHA256, 'base SHA-256 matches undo pin');
const uiAt = BASE.indexOf(UI_MARKER), exportAt = BASE.indexOf(EXPORT_MARKER);
const helpersAt = BASE.indexOf(HELPERS_MARKER), quickAt = BASE.indexOf(QUICK_MARKER);
const remoteAt = BASE.indexOf(REMOTE_MARKER);
ok(uiAt < exportAt && exportAt < helpersAt && helpersAt < quickAt && quickAt < remoteAt,
  'audited marker order remains UI -> export -> helpers -> quick -> remote persistence');
eq(uiAt, U.SLICE_AT, 'whole-UI slice starts at the pinned audited offset');
eq(remoteAt - 1 - uiAt, U.SLICE_CHARS, 'whole-UI slice has the pinned audited length, excluding the retained separator newline');
eq(BASE[remoteAt - 1], '\n', 'one separator newline remains with the residual monolith');
const baseSlice = BASE.slice(uiAt, remoteAt - 1);
eq(sha256(baseSlice), U.SLICE_SHA256, 'audited whole-UI slice SHA-256 matches');
eq(MODULE.length, U.MODULE_CHARS, 'module length matches audited extraction');
eq(sha256(MODULE), U.MODULE_SHA256, 'module SHA-256 matches audited extraction');
eq(MODULE, baseSlice, 'module is byte-for-byte the complete audited base slice');
same(topLevelNames(MODULE), MANIFEST, 'module declares exactly the 42 intended owners in physical order');
const baseOutside = BASE.slice(0, uiAt) + BASE.slice(remoteAt - 1);
eq(MANIFEST.reduce((n, name) => n + writeCount(baseOutside, name), 0), 0,
  'whole-UI owner set has zero external writes at the audited base');
const listOwners = topLevelNames(BASE.slice(uiAt, exportAt));
eq(listOwners.reduce((n, name) => n + writeCount(BASE.slice(0, uiAt) + '\n' + BASE.slice(exportAt), name), 0), 15,
  'rejected list/view sub-split remains measurably coupled by 15 external writes');

section('2. ownership — zero inline residue and one app-wide declaration');
for (const name of FUNCTIONS) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(fnCount(MODULE, name), 1, name + ' is declared once in journal-ui');
  eq(fnCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
for (const name of STATE) {
  eq(varDeclCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(varDeclCount(MODULE, name), 1, name + ' is declared once in journal-ui');
  eq(varDeclCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
eq(identifierCount(baseOutside, 'jFilter'), 0, 'jFilter has no true identifier reference outside the audited UI owner');
eq(count(baseOutside, 'jFilter'), 3, 'the three raw outside matches remain jFilterPortfolio collisions');
eq(count(BASE, 'jFilterPortfolio'), 3, 'jFilterPortfolio collision count is pinned independently');

section('3. classic load slot and the later remote-persistence owner');
const mcx1At = INDEX.indexOf(MCX1_TAG), inlineAt = INDEX.indexOf(INLINE_OPEN);
const regimeAt = INDEX.indexOf(REGIME_TAG), uiTagAt = INDEX.indexOf(UI_TAG);
const remoteTagAt = INDEX.indexOf(REMOTE_TAG);
const writeTagAt = INDEX.indexOf(WRITE_TAG);
const migrationTagAt = INDEX.indexOf(MIGRATION_TAG);
eq(count(INDEX, UI_TAG), 1, 'exactly one Journal UI script tag');
eq(INDEX.slice(mcx1At, inlineAt),
  MCX1_TAG + '\n' + MCX2_TAG + '\n' + MCX3_TAG + '\n' + JOURNAL_CORE_TAG + '\n' + REGIME_TAG + '\n' + UI_TAG + '\n' + REMOTE_TAG + '\n' + WRITE_TAG + '\n' + MIGRATION_TAG + '\n' + MANUAL_TAG + '\n' + BACKUP_RESTORE_TAG + '\n' + MCX_MACRO_CHECK_TAG + '\n' + MCX_CHARTS_TAG + '\n' + APEX_POST_AUTH_TAG + '\n' + TT_RECONNECT_TAG + '\n',
  'service tail ends UI -> Remote -> Write-through -> Migration -> Manual Import -> Backup/Restore -> MCX macro check -> MCX charts -> Apex post-auth -> TT reconnect -> inline');
ok(mcx1At >= 0 && regimeAt > mcx1At && uiTagAt > regimeAt && remoteTagAt > uiTagAt &&
  writeTagAt > remoteTagAt && migrationTagAt > writeTagAt && inlineAt > migrationTagAt,
  'Journal UI loads synchronously before later Remote + Write-through + Migration + inline consumers');
ok(!/\b(?:async|defer|type)\s*=/.test(UI_TAG), 'Journal UI tag is classic synchronous src-only form');
eq(count(INDEX, REMOTE_MARKER), 0, 'remote-persistence marker has zero inline residue after the later extraction');
eq(count(MODULE, REMOTE_MARKER), 0, 'remote persistence is not pulled into Journal UI');
eq(count(REMOTE_MODULE, REMOTE_MARKER), 1, 'remote persistence belongs to its later service exactly once');
for (const name of REMOTE_FUNCTIONS) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline residue after the later extraction');
  eq(fnCount(REMOTE_MODULE, name), 1, name + ' moved exactly once into Journal Remote');
  eq(fnCount(MODULE, name), 0, name + ' is not pulled into Journal UI');
  eq(fnCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
for (const name of REMOTE_STATE) {
  eq(varDeclCount(INDEX, name), 0, name + ' has zero inline residue after the later extraction');
  eq(varDeclCount(REMOTE_MODULE, name), 1, name + ' moved exactly once into Journal Remote');
  eq(varDeclCount(MODULE, name), 0, name + ' is not pulled into Journal UI');
  eq(varDeclCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
eq(identifierCount(MODULE, 'jLoadFromBackend'), 1, 'background load remains a call-time dependency');
eq(identifierCount(MODULE, 'jSyncToBackend'), 1, 'sync after import remains a call-time dependency');
eq(count(INDEX, 'onclick="showJournalExportModal()"'), 1, 'HTML export entry point remains unchanged outside the module');

section('4. classic-script evaluation is inert; UI effects remain call-time only');
try {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(MANIFEST.every((name) => name in sandbox), 'all 42 globals exist after classic-script evaluation');
  eq(sandbox.jView, 'list', 'initial Journal view remains list');
  same(sandbox.jFilter, { strategy:'all', status:'all', decision:'all', grade:'all' }, 'initial Journal filters are unchanged');
  eq(sandbox.jDetailId, null, 'initial detail id remains null');
  eq(sandbox.jEditLeg, null, 'initial edit leg remains null');
  same(Object.keys(sandbox.J_LEG_TEMPLATES),
    ['EIC','PESS','strangle','bull put spread','bear call spread','bear put spread','bull call spread','Custom'],
    'strategy template keys and order are unchanged');
  eq(sandbox._jexNum('1.235', 2), 1.24, 'Excel numeric normalizer remains callable');
  eq(sandbox._jexStr(null), '', 'Excel string normalizer preserves null handling');
  eq(sandbox._jexBool(0), 'false', 'Excel boolean normalizer preserves false handling');
  eq(sandbox.jDecisionColor('APPROVED'), 'var(--gr)', 'decision color policy remains callable');
  eq(sandbox.jGradeColor('WEAK'), 'var(--rd)', 'grade color policy remains callable');
} catch (e) {
  console.log(e && e.stack || e);
  ok(false, 'module evaluates without touching call-time DOM/backend globals');
}
eq((MODULE.match(/\bdocument\s*\./g) || []).length, 52, '52 DOM accesses remain inside function bodies');
eq((MODULE.match(/\bsetTimeout\s*\(/g) || []).length, 6, 'six timers remain inside function bodies');
eq((MODULE.match(/\baddEventListener\s*\(/g) || []).length, 6, 'six listener registrations remain inside function bodies');
eq((MODULE.match(/\bfetch\s*\(/g) || []).length, 0, 'Journal UI owns no fetch call');
eq((MODULE.match(/\bttCall\s*\(/g) || []).length, 0, 'Journal UI owns no backend transport call');
eq((MODULE.match(/\blocalStorage\s*\./g) || []).length, 0, 'Journal UI owns no direct localStorage access');
eq((MODULE.match(/\b(?:new\s+)?WebSocket\b/g) || []).length, 0, 'Journal UI owns no WebSocket');

section('5. byte-exact undo and mutation-sensitive negative controls');
const MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-manual-import.js'), 'utf8');
const TT_RECONNECT_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/tt-reconnect.js'), 'utf8');
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
// The TT reconnect UI owner is now the NEWEST layer of all, sitting on top of
// Apex post-auth: peel it first so the Apex undo below still sees the exact
// document it was cut against.
const preTtReconnect = TT_RECONNECT_U.undoTtReconnect(INDEX, TT_RECONNECT_MODULE);
const preApexPostAuth = APEX_POST_AUTH_U.undoApexPostAuthInit(preTtReconnect, APEX_POST_AUTH_MODULE);
eq(preTtReconnect.length, TT_RECONNECT_U.BASE_CHARS,
  'peeling the TT reconnect layer reaches the pinned post-#410 index length');
eq(sha256(preTtReconnect), TT_RECONNECT_U.BASE_SHA256,
  'peeling the TT reconnect layer reaches the pinned post-#410 index hash');
ok(TT_RECONNECT_U.isApplied(INDEX),
  'the shipped index really does carry the TT reconnect layer being peeled');
ok(!TT_RECONNECT_U.isApplied(preTtReconnect),
  'the peeled document no longer carries the TT reconnect tag');
eq(preApexPostAuth.length, APEX_POST_AUTH_U.BASE_CHARS,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index length');
eq(sha256(preApexPostAuth), APEX_POST_AUTH_U.BASE_SHA256,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index hash');
ok(APEX_POST_AUTH_U.isApplied(preTtReconnect),
  'the post-#410 document really does carry the Apex post-auth layer being peeled');
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

const preManual = MANUAL_U.undoJournalManualImport(preBackupRestore, MANUAL_MODULE);
const preMigration = MIGRATION_U.undoJournalMigration(preManual, MIGRATION_MODULE);
const preWrite = WRITE_U.undoJournalBackendWriteThrough(preMigration, WRITE_MODULE);
const preRemote = REMOTE_U.undoJournalRemotePersistence(preWrite, REMOTE_MODULE);
const rebuilt = U.undoJournalUi(preRemote, MODULE);
eq(rebuilt, BASE, 'Journal UI undo reconstructs the post-#395 base byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
throws(() => U.undoJournalUi(preRemote, MODULE + ' '), 'module-byte mutant is rejected');
throws(() => U.undoJournalUi(preRemote.replace(UI_TAG, UI_TAG + '\n' + UI_TAG), MODULE),
  'duplicate-tag mutant is rejected');
throws(() => U.undoJournalUi(preRemote.replace(UI_TAG, ''), MODULE), 'missing-tag mutant is rejected');
same(topLevelNames(MODULE + '\nfunction foreignJournalUiOwner(){}'), MANIFEST.concat(['foreignJournalUiOwner']),
  'manifest scanner exposes a foreign top-level owner mutant');
ok(fnCount(INDEX + '\n' + baseSlice, 'runJournalPanel') > 0, 'inline-duplication mutant is visible to zero-residue guard');

section('6. production scope');
const changed = execFileSync('git', ['diff', '--name-only', BASE_SHA], {
  cwd: ROOT, encoding: 'utf8',
}).trim().split(/\r?\n/).filter(Boolean);
const changedProduction = changed.filter((p) => p === 'index.html' || p.startsWith('js/')).sort();
same(changedProduction, [
  'index.html', MODULE_REL, 'js/services/journal-remote-persistence.js',
  'js/services/journal-backend-write-through.js', 'js/services/journal-migration.js',
  'js/services/journal-manual-import.js', 'js/ui/journal-backup-restore.js',
  'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js', 'js/services/apex-post-auth-init.js', 'js/ui/tt-reconnect.js',
].sort(), 'production footprint includes Journal UI plus later Remote, Write-through, Migration, Manual Import, Backup/Restore, MCX macro-check and MCX charts modules');
ok(!changed.some((p) => p.startsWith('.github/') || p.startsWith('scripts/')),
  'no workflow or bootstrap script changed');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('JOURNAL UI BOUNDARY CONTRACT: OK');
