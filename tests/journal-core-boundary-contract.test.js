'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL CORE — storage/snapshot/tagging/analytics extraction boundary.
//
// Audited base: dev-clean @ dfb8433e8e7b0403fca5a23874dfbc600f5069c4
// Scope: relocation only. One contiguous nine-owner core moves out of the
// monolith. Journal UI/export and the inert remote-persistence service later
// moved to their own modules; wrapper/sync/migration effects and portfolio
// integration deliberately remain inline.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const U = require('./lib/journal-core-undo.js');
const REGIME_U = require('./lib/mcx-regime-policy-undo.js');
const JOURNAL_UI_U = require('./lib/journal-ui-undo.js');
const REMOTE_U = require('./lib/journal-remote-persistence-undo.js');
const WRITE_U = require('./lib/journal-backend-write-through-undo.js');
const MIGRATION_U = require('./lib/journal-migration-undo.js');
const TRADE_DETAIL_U = require('./lib/journal-trade-detail-undo.js');
const TRADE_FORMS_U = require('./lib/journal-trade-forms-undo.js');
const CLOSE_LEGS_U = require('./lib/journal-close-legs-undo.js');
const TT_RECONNECT_U = require('./lib/tt-reconnect-undo.js');
const APEX_POST_AUTH_U = require('./lib/apex-post-auth-init-undo.js');
const MCX_CHARTS_U = require('./lib/mcx-charts-undo.js');
const MCX_MACRO_CHECK_U = require('./lib/mcx-macro-check-undo.js');
const BACKUP_RESTORE_U = require('./lib/journal-backup-restore-undo.js');
const MANUAL_U = require('./lib/journal-manual-import-undo.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = 'dfb8433e8e7b0403fca5a23874dfbc600f5069c4';
const MODULE_REL = 'js/services/journal-core.js';
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const REGIME_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/mcx-regime-policy.js'), 'utf8');
const JOURNAL_UI_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-ui.js'), 'utf8');
const REMOTE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-remote-persistence.js'), 'utf8');
const WRITE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-backend-write-through.js'), 'utf8');
const MIGRATION_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
const INDEX = APP_LOADER.loadIndexHtml();
const APP = APP_LOADER.loadAppJavaScriptSource();
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});

const FUNCTIONS = [
  'jLoad',
  'jSave',
  'jAddTrade',
  'jUpdateTrade',
  'jDeleteTrade',
  'jBuildSnapshot',
  'jAutoTags',
  'jComputeStats',
];
const STATE = ['JOURNAL_KEY'];
const MANIFEST = ['JOURNAL_KEY'].concat(FUNCTIONS);
const LATER_UI = ['runJournalPanel', 'renderJournalView', 'renderJournalList', 'renderJournalDetail', 'renderJournalAnalytics'];
const LATER_REMOTE_FUNCTIONS = [
  'jSaveRemote', 'jEnrichedDryRun', 'jUpdateRemote', 'jDeleteRemote',
  'jSyncToBackend', 'jLoadFromBackend',
];
const LATER_REMOTE_STATE = ['jSyncing', 'jLastSync'];

const MCX1_TAG = '<script src="./js/services/mcx-market-context.js"></script>';
const MCX2_TAG = '<script src="./js/services/mcx-vix-market-context.js"></script>';
const MCX3_TAG = '<script src="./js/services/mcx-backend-candles.js"></script>';
const JOURNAL_TAG = '<script src="./js/services/journal-core.js"></script>';
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
const TT_RECONNECT_TAG = '<script src="./js/ui/tt-reconnect.js"></script>';
const CLOSE_LEGS_TAG = '<script src="./js/ui/journal-close-legs.js"></script>';
const TRADE_FORMS_TAG = '<script src="./js/ui/journal-trade-forms.js"></script>';
const TRADE_DETAIL_TAG = '<script src=\"./js/ui/journal-trade-detail.js\"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

let pass = 0, fail = 0;
function ok(v, msg) { if (v) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + (a === b ? '' : ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')')); }
function same(a, b, msg) { eq(JSON.stringify(a), JSON.stringify(b), msg); }
function section(s) { console.log('\n' + s); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(src, needle) { let n = 0, p = 0; while ((p = src.indexOf(needle, p)) >= 0) { n++; p += needle.length; } return n; }
function fnCount(src, name) {
  return (src.match(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g')) || []).length;
}
function varDeclCount(src, name) {
  return (src.match(new RegExp('(?:^|\\n)\\s*var\\s+' + name + '\\s*=', 'g')) || []).length;
}
function topLevelNames(src) {
  const out = [];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^var\s+([A-Za-z_$][\w$]*)\s*=/gm;
  let m; while ((m = re.exec(src))) out.push(m[1] || m[2]);
  return out;
}
function throws(fn, msg) { let threw = false; try { fn(); } catch (_) { threw = true; } ok(threw, msg); }

console.log('Journal Core boundary contract');
console.log('base=' + BASE_SHA);

section('1. pinned base and exact contiguous relocation identity');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_SHA,
  'BASE_SHA resolves to the audited commit');
eq(BASE.length, U.BASE_CHARS, 'Node UTF-16 base length matches undo pin');
eq(sha256(BASE), U.BASE_SHA256, 'base SHA-256 matches undo pin');
eq(MODULE.length, U.MODULE_CHARS, 'module length matches audited extraction');
eq(sha256(MODULE), U.MODULE_SHA256, 'module SHA-256 matches audited extraction');
const baseSlice = BASE.slice(U.SLICE_AT, U.SLICE_AT + U.SLICE_CHARS);
eq(baseSlice.length, U.SLICE_CHARS, 'base slice has the pinned UTF-16 length');
eq(sha256(baseSlice), U.SLICE_SHA256, 'base slice has the pinned SHA-256');
eq(MODULE, baseSlice, 'module is byte-for-byte the single audited base slice');
same(topLevelNames(MODULE), MANIFEST, 'module declares exactly the nine intended owners in physical order');

section('2. ownership — zero inline residue and one app-wide declaration');
for (const name of FUNCTIONS) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(fnCount(MODULE, name), 1, name + ' is declared once in journal-core');
  eq(fnCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
for (const name of STATE) {
  eq(varDeclCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(varDeclCount(MODULE, name), 1, name + ' is declared once in journal-core');
  eq(varDeclCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
eq(count(BASE, 'JOURNAL_KEY'), count(baseSlice, 'JOURNAL_KEY'),
  'JOURNAL_KEY had no reference outside the extracted core at the audited base');
eq(count(BASE, 'jAutoTags'), count(baseSlice, 'jAutoTags'),
  'jAutoTags had no caller outside the extracted core at the audited base');

section('3. exact classic load slot and intentionally retained Journal owners');
const mcx1At = INDEX.indexOf(MCX1_TAG), mcx2At = INDEX.indexOf(MCX2_TAG), mcx3At = INDEX.indexOf(MCX3_TAG);
const journalAt = INDEX.indexOf(JOURNAL_TAG), inlineAt = INDEX.indexOf(INLINE_OPEN);
eq(count(INDEX, JOURNAL_TAG), 1, 'exactly one Journal Core script tag');
eq(INDEX.slice(mcx1At, inlineAt),
  MCX1_TAG + '\n' + MCX2_TAG + '\n' + MCX3_TAG + '\n' + JOURNAL_TAG + '\n' + REGIME_TAG + '\n' + JOURNAL_UI_TAG + '\n' + REMOTE_TAG + '\n' + WRITE_TAG + '\n' + MIGRATION_TAG + '\n' + MANUAL_TAG + '\n' + BACKUP_RESTORE_TAG + '\n' + MCX_MACRO_CHECK_TAG + '\n' + MCX_CHARTS_TAG + '\n' + APEX_POST_AUTH_TAG + '\n' + TT_RECONNECT_TAG + '\n' + CLOSE_LEGS_TAG + '\n' + TRADE_FORMS_TAG + '\n' + TRADE_DETAIL_TAG + '\n',
  'service tail ends Core -> Regime -> UI -> Remote -> Write-through -> Migration -> Manual Import -> Backup/Restore -> MCX macro check -> MCX charts -> Apex post-auth -> TT reconnect -> Journal Close Legs -> Journal trade forms -> Journal trade detail -> inline');
ok(mcx1At >= 0 && mcx2At > mcx1At && mcx3At > mcx2At && journalAt > mcx3At && inlineAt > journalAt,
  'Journal Core loads synchronously after existing services and before residual inline code');
ok(!/\b(?:async|defer|type)\s*=/.test(JOURNAL_TAG), 'Journal Core tag is classic synchronous src-only form');
for (const name of LATER_UI) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline residue after the later Journal UI extraction');
  eq(fnCount(JOURNAL_UI_MODULE, name), 1, name + ' moved exactly once into the later Journal UI owner');
  eq(fnCount(MODULE, name), 0, name + ' is not pulled into Journal Core');
}
for (const name of LATER_REMOTE_FUNCTIONS) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline residue after the later Remote extraction');
  eq(fnCount(REMOTE_MODULE, name), 1, name + ' moved exactly once into the later Remote owner');
  eq(fnCount(MODULE, name), 0, name + ' backend/sync owner is not pulled into Journal Core');
  eq(fnCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
for (const name of LATER_REMOTE_STATE) {
  eq(varDeclCount(INDEX, name), 0, name + ' has zero inline residue after the later Remote extraction');
  eq(varDeclCount(REMOTE_MODULE, name), 1, name + ' moved exactly once into the later Remote owner');
  eq(varDeclCount(MODULE, name), 0, name + ' state owner is not pulled into Journal Core');
  eq(varDeclCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}

section('4. classic-script evaluation has no top-level dependency access');
try {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(MANIFEST.every((name) => name in sandbox), 'all nine globals exist after classic-script evaluation');
  eq(sandbox.JOURNAL_KEY, 'apex_journal_v1', 'storage key value is unchanged');
} catch (e) {
  console.log(e && e.stack || e);
  ok(false, 'module evaluates without touching call-time globals');
  ok(false, 'all nine globals exist after evaluation');
}
ok(!/\bdocument\s*\./.test(MODULE), 'core owns no DOM access');
ok(!/\bfetch\s*\(/.test(MODULE), 'core owns no network fetch');
ok(!/\bttCall\s*\(/.test(MODULE), 'core owns no backend ttCall');
ok(!/\bset(?:Timeout|Interval)\s*\(/.test(MODULE), 'core creates no timers');
ok(!/\bnew\s+WebSocket\b/.test(MODULE), 'core opens no WebSocket');

section('5. storage CRUD semantics are unchanged by relocation');
{
  let raw = null;
  const toasts = [];
  const localStorage = {
    getItem(k) { return k === 'apex_journal_v1' ? raw : null; },
    setItem(k, v) { if (k !== 'apex_journal_v1') throw new Error('wrong key'); raw = String(v); },
  };
  const sandbox = {
    console: { log() {}, warn() {}, error() {} }, localStorage,
    JSON, Array, Object, Date, Math,
    showToast: (...args) => toasts.push(args),
  };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  same(Array.from(sandbox.jLoad()), [], 'empty store loads as []');
  ok(sandbox.jSave([{ id: 'A' }]) === true, 'jSave succeeds against the same localStorage key');
  eq(JSON.parse(raw)[0].id, 'A', 'jSave persists JSON payload unchanged');
  const id = sandbox.jAddTrade({ ticker: 'SPY', status: 'open' });
  ok(/^T\d+_[A-Z0-9]{4}$/.test(id), 'jAddTrade preserves generated id shape');
  let loaded = Array.from(sandbox.jLoad());
  eq(loaded.length, 2, 'jAddTrade prepends without dropping existing records');
  eq(loaded[0].ticker, 'SPY', 'jAddTrade persists the new trade');
  ok(sandbox.jUpdateTrade(id, { notes: 'kept' }) === true, 'jUpdateTrade succeeds for existing id');
  loaded = Array.from(sandbox.jLoad());
  eq(loaded.find((t) => t.id === id).notes, 'kept', 'jUpdateTrade preserves update payload');
  ok(sandbox.jDeleteTrade(id) === true, 'jDeleteTrade succeeds');
  eq(Array.from(sandbox.jLoad()).some((t) => t.id === id), false, 'jDeleteTrade removes exactly the selected id');
  eq(toasts.length, 0, 'happy-path CRUD emits no warning toast');
}

section('6. snapshot/tagging and analytics semantics remain callable from inline UI');
{
  const d = {
    ticker: 'SPY', ivRank: 65, iv: 0.22, hv30: 0.18, nextEarnings: '2026-09-01', squeeze: 'on',
    eicSetupResult: { setupScore: 8, setupGrade: 'STRONG', setupCapsTriggered: ['VIX'] },
    eicFinalDecision: { finalTradingDecision: 'TRADE', finalTradingReason: 'ok', decisionComponents: { a: 1 } },
    eicLegs: { executionVerdict: 'PASS', markVsTheo: { theoreticalCredit: 2.1, theoreticalConfidence: 'HIGH', marketCredit: 2.0, slippage: 0.1, slippagePct: 4.8, slippageGrade: 'A' } },
    eicLegsLive: { dxlinkConfidence: 'high', greeksLive: true, liveLegCount: 4 },
  };
  const sandbox = {
    console: { log() {}, warn() {}, error() {} }, JSON, Array, Object, Date, Math,
    S: { scanData: [d], marketContextRisk: 'LOW', marketContextTimestamp: 123 },
  };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  const snap = sandbox.jBuildSnapshot('SPY');
  eq(snap.setupScore, 8, 'snapshot keeps EIC setup score');
  eq(snap.finalTradingDecision, 'TRADE', 'snapshot keeps EIC decision');
  eq(snap.marketContextRisk, 'LOW', 'snapshot keeps market-context risk');
  eq(snap.ivr, 65, 'snapshot keeps Tastytrade IV rank');
  same(Array.from(snap.tags), ['earnings', 'high_ivr', 'squeeze', 'cap:VIX', 'decision:trade'], 'auto tags preserve exact rule order');

  const stats = sandbox.jComputeStats([
    { status: 'closed', pnl: 100, strategyType: 'EIC', snapshot: { marketContextRisk: 'LOW', setupGrade: 'STRONG', setupCapsTriggered: [] } },
    { status: 'closed', pnl: -50, strategyType: 'EIC', snapshot: { marketContextRisk: 'HIGH', setupGrade: 'WEAK', setupCapsTriggered: ['VIX'] } },
    { status: 'open', pnl: null, strategyType: 'EIC', snapshot: {} },
  ]);
  eq(stats.count, 3, 'analytics count remains total trades');
  eq(stats.closedCount, 2, 'analytics closed count unchanged');
  eq(stats.openCount, 1, 'analytics open count unchanged');
  eq(stats.totalPnl, 50, 'analytics total PnL unchanged');
  eq(stats.winRate, 50, 'analytics win rate unchanged');
  eq(stats.expectancy, 25, 'analytics expectancy unchanged');
}

section('7. byte-exact undo and mutation-sensitive negative controls');
const MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-manual-import.js'), 'utf8');
const TRADE_DETAIL_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-detail.js'), 'utf8');
const TRADE_FORMS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-forms.js'), 'utf8');
const CLOSE_LEGS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-close-legs.js'), 'utf8');
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
// The Journal Close Legs owner is now the NEWEST layer of all, sitting on top of
// TT reconnect: peel it first so the TT reconnect undo below still sees the
// exact document it was cut against.
// The Journal trade-forms owner is now the NEWEST layer of all, sitting on
// top of Close Legs: peel it first so every undo below still sees the exact
// document it was cut against.
// The Journal trade-detail owner is now the NEWEST layer of all, sitting on
// top of trade forms: peel it first so every undo below still sees the exact
// document it was cut against.
const preTradeDetail = TRADE_DETAIL_U.undoJournalTradeDetail(INDEX, TRADE_DETAIL_MODULE);
const preTradeForms = TRADE_FORMS_U.undoJournalTradeForms(preTradeDetail, TRADE_FORMS_MODULE);
const preCloseLegs = CLOSE_LEGS_U.undoJournalCloseLegs(preTradeForms, CLOSE_LEGS_MODULE);
const preTtReconnect = TT_RECONNECT_U.undoTtReconnect(preCloseLegs, TT_RECONNECT_MODULE);
eq(preCloseLegs.length, CLOSE_LEGS_U.BASE_CHARS,
  'peeling the Journal Close Legs layer reaches the pinned post-#412 index length');
eq(sha256(preCloseLegs), CLOSE_LEGS_U.BASE_SHA256,
  'peeling the Journal Close Legs layer reaches the pinned post-#412 index hash');
ok(CLOSE_LEGS_U.isApplied(INDEX),
  'the shipped index really does carry the Journal Close Legs layer being peeled');
ok(!CLOSE_LEGS_U.isApplied(preCloseLegs),
  'the peeled document no longer carries the Journal Close Legs tag');
const preApexPostAuth = APEX_POST_AUTH_U.undoApexPostAuthInit(preTtReconnect, APEX_POST_AUTH_MODULE);
eq(preTtReconnect.length, TT_RECONNECT_U.BASE_CHARS,
  'peeling the TT reconnect layer reaches the pinned post-#410 index length');
eq(sha256(preTtReconnect), TT_RECONNECT_U.BASE_SHA256,
  'peeling the TT reconnect layer reaches the pinned post-#410 index hash');
ok(TT_RECONNECT_U.isApplied(preCloseLegs),
  'the post-#412 document really does carry the TT reconnect layer being peeled');
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
const preJournalUi = JOURNAL_UI_U.undoJournalUi(preRemote, JOURNAL_UI_MODULE);
const preRegime = REGIME_U.undoMcxRegimePolicy(preJournalUi, REGIME_MODULE);
const rebuilt = U.undoJournalCore(preRegime, MODULE);
eq(rebuilt, BASE, 'Journal Core undo reconstructs audited base byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
throws(() => U.undoJournalCore(preRegime, MODULE + ' '), 'module-byte mutant is rejected');
throws(() => U.undoJournalCore(preRegime.replace(JOURNAL_TAG, JOURNAL_TAG + '\n' + JOURNAL_TAG), MODULE),
  'duplicate-tag mutant is rejected');
throws(() => U.undoJournalCore(preRegime.replace(JOURNAL_TAG, ''), MODULE), 'missing-tag mutant is rejected');
same(topLevelNames(MODULE + '\nfunction foreignJournalOwner(){}'), MANIFEST.concat(['foreignJournalOwner']),
  'manifest scanner exposes a foreign top-level owner mutant');
ok(fnCount(INDEX + '\n' + baseSlice, 'jLoad') > 0, 'inline-duplication mutant is visible to zero-residue guard');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('JOURNAL CORE BOUNDARY CONTRACT: OK');
