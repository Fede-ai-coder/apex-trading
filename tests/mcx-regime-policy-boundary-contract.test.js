'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX REGIME POLICY — pure policy-core extraction boundary.
//
// Audited base: dev-clean @ 72a2c5759e17a3fd0477f62724d6fd4490be1c8f
// Scope: relocation only. One contiguous ten-owner policy core moves out of the
// monolith. Transition persistence, renderers, squeeze state, chart lifecycle
// and refresh orchestration deliberately remain inline.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const U = require('./lib/mcx-regime-policy-undo.js');
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
const BASE_SHA = '72a2c5759e17a3fd0477f62724d6fd4490be1c8f';
const MODULE_REL = 'js/services/mcx-regime-policy.js';
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const JOURNAL_UI_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-ui.js'), 'utf8');
const REMOTE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-remote-persistence.js'), 'utf8');
const WRITE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-backend-write-through.js'), 'utf8');
const MIGRATION_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
const INDEX = APP_LOADER.loadIndexHtml();
const APP = APP_LOADER.loadAppJavaScriptSource();
// The MCX charts/lifecycle owner is the NEWEST layer on this document, sitting
// on top of the MCX macro-check owner, which sits on top of Backup/Restore. It
// carries the regime transition/render owners this extraction deliberately left
// behind, so both the ownership section and the undo chain below need it: peel
// NEWEST-FIRST so every later undo sees the exact document it was cut against.
// The helper re-verifies what it hands back by length and SHA-256, so this hop
// is proved, not assumed.
const TRADE_DETAIL_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-detail.js'), 'utf8');
const TRADE_FORMS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-forms.js'), 'utf8');
const CLOSE_LEGS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-close-legs.js'), 'utf8');
const TT_RECONNECT_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/tt-reconnect.js'), 'utf8');
const APEX_POST_AUTH_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/apex-post-auth-init.js'), 'utf8');
const MCX_CHARTS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-charts.js'), 'utf8');
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
// No assertions here: this peel runs before the harness is initialised. The
// undo helper verifies the reconstruction's length and SHA-256 itself and
// throws on any mismatch, so the hop is proved rather than assumed.
const preApexPostAuth = APEX_POST_AUTH_U.undoApexPostAuthInit(preTtReconnect, APEX_POST_AUTH_MODULE);
const preMcxCharts = MCX_CHARTS_U.undoMcxCharts(preApexPostAuth, MCX_CHARTS_MODULE);
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});

const FUNCTIONS = [
  '_mcxRegimeOf',
  '_regimeDynForbidden',
  '_regimeCompactVixNotes',
];
const STATE = [
  '_REGIME_ADJ_RULES',
  '_REGIME_CONTENT',
  '_REGIME_LABEL',
  '_VIX_NAKED_CALL_MAX',
  '_REGIME_OVEREXT_FORBIDDEN',
  '_VIX_AVOID_NAKED_PUT_MAX',
  '_VIX_LOW_IV_STRATEGY_MAX',
];
const MANIFEST = [
  '_REGIME_ADJ_RULES',
  '_REGIME_CONTENT',
  '_mcxRegimeOf',
  '_REGIME_LABEL',
  '_VIX_NAKED_CALL_MAX',
  '_REGIME_OVEREXT_FORBIDDEN',
  '_regimeDynForbidden',
  '_VIX_AVOID_NAKED_PUT_MAX',
  '_VIX_LOW_IV_STRATEGY_MAX',
  '_regimeCompactVixNotes',
];
// The regime transition / render / state owners this extraction deliberately
// did NOT pull into the policy core. They were inline when this contract was
// written; the later MCX charts/lifecycle relocation moved every one of them,
// unchanged, into js/ui/mcx-charts.js. What this contract pins is unchanged and
// is checked more strictly below: the policy core owns none of them, and each
// still has exactly ONE declaration app-wide — now in the charts owner.
const OUTSIDE_TRANSITION = [
  '_regimeReadState', '_regimeWriteState', '_regimeDayStart',
  '_regimeUpdateTransition', '_regimeTransitionStatus', '_regimeRenderTransition',
];
const OUTSIDE_RENDER = [
  '_regimeSections', '_regimeRenderMain', '_regimeRenderCompact', '_regimeRefresh',
  '_mcxSpySqzBadgeHtml', '_mcxRenderSpySqzBadge', '_mcxRenderCharts', '_mcxInit',
];
const OUTSIDE_STATE = [
  '_REGIME_LS_KEY', '_regimeMainKey', '_regimeCompactKey', '_regimeTransKey',
  '_mcxSpySqzCache', '_mcxBackendFetchInFlight',
];

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
function fnCount(src, name) { return (src.match(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g')) || []).length; }
function varDeclCount(src, name) { return (src.match(new RegExp('(?:^|\\n)\\s*var\\s+' + name + '\\s*=', 'g')) || []).length; }
function topLevelNames(src) {
  const out = [];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^var\s+([A-Za-z_$][\w$]*)\s*=/gm;
  let m; while ((m = re.exec(src))) out.push(m[1] || m[2]);
  return out;
}
function throws(fn, msg) { let threw = false; try { fn(); } catch (_) { threw = true; } ok(threw, msg); }
function externalWriteCount(src, name) {
  const e = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (src.match(new RegExp('\\b' + e + '(?:\\.[A-Za-z_$][\\w$]*|\\[[^\\]\\n]+\\])?\\s*(?:=|\\+=|-=|\\+\\+|--)', 'g')) || []).length;
}

console.log('MCX Regime Policy boundary contract');
console.log('base=' + BASE_SHA);

section('1. pinned base and exact contiguous relocation identity');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_SHA,
  'BASE_SHA resolves to the audited post-Journal commit');
eq(BASE.length, U.BASE_CHARS, 'Node UTF-16 base length matches undo pin');
eq(sha256(BASE), U.BASE_SHA256, 'base SHA-256 matches undo pin');
eq(MODULE.length, U.MODULE_CHARS, 'module length matches audited extraction');
eq(sha256(MODULE), U.MODULE_SHA256, 'module SHA-256 matches audited extraction');
const baseSlice = BASE.slice(U.SLICE_AT, U.SLICE_AT + U.SLICE_CHARS);
eq(baseSlice.length, U.SLICE_CHARS, 'base slice has the pinned UTF-16 length');
eq(sha256(baseSlice), U.SLICE_SHA256, 'base slice has the pinned SHA-256');
eq(MODULE, baseSlice, 'module is byte-for-byte the audited base slice, including one terminal newline');
same(topLevelNames(MODULE), MANIFEST, 'module declares exactly the ten intended owners in physical order');
eq(BASE.slice(U.SLICE_AT + U.SLICE_CHARS, U.SLICE_AT + U.SLICE_CHARS + 1), '\n',
  'one separator newline remains in the monolith after the moved terminal newline');

section('2. ownership — zero inline residue and one app-wide declaration');
for (const name of FUNCTIONS) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(fnCount(MODULE, name), 1, name + ' is declared once in mcx-regime-policy');
  eq(fnCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
for (const name of STATE) {
  eq(varDeclCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(varDeclCount(MODULE, name), 1, name + ' is declared once in mcx-regime-policy');
  eq(varDeclCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
const baseOutsideSlice = BASE.slice(0, U.SLICE_AT) + BASE.slice(U.SLICE_AT + U.SLICE_CHARS);
for (const name of STATE.concat(FUNCTIONS)) {
  eq(externalWriteCount(baseOutsideSlice, name), 0, name + ' had no write/reassignment outside the policy slice at audited base');
}

section('3. exact classic load slot and intentionally retained owners');
const mcx1At = INDEX.indexOf(MCX1_TAG), mcx2At = INDEX.indexOf(MCX2_TAG), mcx3At = INDEX.indexOf(MCX3_TAG);
const journalAt = INDEX.indexOf(JOURNAL_TAG), regimeAt = INDEX.indexOf(REGIME_TAG);
const journalUiAt = INDEX.indexOf(JOURNAL_UI_TAG), remoteAt = INDEX.indexOf(REMOTE_TAG);
const writeAt = INDEX.indexOf(WRITE_TAG);
const migrationAt = INDEX.indexOf(MIGRATION_TAG);
const inlineAt = INDEX.indexOf(INLINE_OPEN);
eq(count(INDEX, REGIME_TAG), 1, 'exactly one MCX Regime Policy script tag');
eq(INDEX.slice(mcx1At, inlineAt),
  MCX1_TAG + '\n' + MCX2_TAG + '\n' + MCX3_TAG + '\n' + JOURNAL_TAG + '\n' + REGIME_TAG + '\n' + JOURNAL_UI_TAG + '\n' + REMOTE_TAG + '\n' + WRITE_TAG + '\n' + MIGRATION_TAG + '\n' + MANUAL_TAG + '\n' + BACKUP_RESTORE_TAG + '\n' + MCX_MACRO_CHECK_TAG + '\n' + MCX_CHARTS_TAG + '\n' + APEX_POST_AUTH_TAG + '\n' + TT_RECONNECT_TAG + '\n' + CLOSE_LEGS_TAG + '\n' + TRADE_FORMS_TAG + '\n' + TRADE_DETAIL_TAG + '\n',
  'service tail ends Regime -> UI -> Remote -> Write-through -> Migration -> Manual Import -> Backup/Restore -> MCX macro check -> MCX charts -> Apex post-auth -> TT reconnect -> Journal Close Legs -> Journal trade forms -> Journal trade detail -> inline');
ok(mcx1At >= 0 && mcx2At > mcx1At && mcx3At > mcx2At && journalAt > mcx3At && regimeAt > journalAt &&
  journalUiAt > regimeAt && remoteAt > journalUiAt && writeAt > remoteAt &&
  migrationAt > writeAt && INDEX.indexOf(MANUAL_TAG) > migrationAt &&
  INDEX.indexOf(BACKUP_RESTORE_TAG) > INDEX.indexOf(MANUAL_TAG) &&
  inlineAt > INDEX.indexOf(BACKUP_RESTORE_TAG),
  'Regime Policy loads before Journal UI / Journal Remote / Write-through / Migration / residual inline code');
ok(!/\b(?:async|defer|type)\s*=/.test(REGIME_TAG), 'Regime Policy tag is classic synchronous src-only form');
for (const name of OUTSIDE_TRANSITION.concat(OUTSIDE_RENDER)) {
  eq(fnCount(MODULE, name), 0, name + ' is not pulled into the policy core');
  eq(fnCount(APP, name), 1, name + ' still has exactly one declaration app-wide');
  eq(fnCount(MCX_CHARTS_MODULE, name), 1,
    name + ' now lives in the MCX charts owner, unchanged, exactly once');
  eq(fnCount(INDEX, name), 0, name + ' has zero inline residue after the MCX charts relocation');
  eq(fnCount(preMcxCharts, name), 1,
    name + ' was inline exactly once before the MCX charts relocation');
}
for (const name of OUTSIDE_STATE) {
  eq(varDeclCount(MODULE, name), 0, name + ' state is not pulled into the policy core');
  eq(varDeclCount(APP, name), 1, name + ' state still has exactly one declaration app-wide');
  eq(varDeclCount(MCX_CHARTS_MODULE, name), 1,
    name + ' state now lives in the MCX charts owner, unchanged, exactly once');
  eq(varDeclCount(INDEX, name), 0, name + ' state has zero inline residue after the MCX charts relocation');
  eq(varDeclCount(preMcxCharts, name), 1,
    name + ' state was inline exactly once before the MCX charts relocation');
}

section('4. classic-script evaluation and side-effect boundary');
try {
  const sandbox = { console: { log() {}, warn() {}, error() {} }, isNaN };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(MANIFEST.every((name) => name in sandbox), 'all ten policy globals exist after classic-script evaluation');
  eq(sandbox._VIX_NAKED_CALL_MAX, 20, 'VIX naked-call threshold remains 20');
  eq(sandbox._VIX_AVOID_NAKED_PUT_MAX, 19, 'VIX naked-put threshold remains 19');
  eq(sandbox._VIX_LOW_IV_STRATEGY_MAX, 18.5, 'low-IV strategy threshold remains 18.5');
} catch (e) {
  console.log(e && e.stack || e);
  ok(false, 'module evaluates without touching call-time globals');
  ok(false, 'all ten policy globals exist after evaluation');
}
ok(!/\bdocument\s*\./.test(MODULE), 'policy core owns no DOM access');
ok(!/\bfetch\s*\(/.test(MODULE), 'policy core owns no fetch');
ok(!/\bttCall\s*\(/.test(MODULE), 'policy core owns no backend ttCall');
ok(!/\bset(?:Timeout|Interval)\s*\(/.test(MODULE), 'policy core creates no timers');
ok(!/\b(?:new\s+)?WebSocket\b/.test(MODULE), 'policy core owns no WebSocket');
ok(!/\baddEventListener\s*\(/.test(MODULE), 'policy core owns no event listeners');
ok(!/\blocalStorage\s*\./.test(MODULE), 'transition persistence/localStorage stays inline');
ok(!/\bResizeObserver\b/.test(MODULE), 'chart resize ownership stays inline');
ok(!/\brequestAnimationFrame\s*\(/.test(MODULE), 'animation ownership stays inline');

section('5. regime classification and conditional-risk semantics are unchanged');
{
  const sb = { console: { log() {}, warn() {}, error() {} }, isNaN };
  vm.createContext(sb);
  vm.runInContext(MODULE, sb, { filename: MODULE_REL });
  eq(sb._mcxRegimeOf(null), null, 'null VIX has no regime');
  eq(sb._mcxRegimeOf(18.49), 'LOW', 'VIX 18.49 remains LOW');
  eq(sb._mcxRegimeOf(18.5), 'MID', 'VIX 18.50 remains MID');
  eq(sb._mcxRegimeOf(30), 'MID', 'VIX 30 remains MID');
  eq(sb._mcxRegimeOf(30.01), 'HIGH', 'VIX above 30 remains HIGH');

  const below20 = Array.from(sb._regimeDynForbidden(19.99));
  ok(below20.includes('No naked calls'), 'VIX < 20 still adds No naked calls');
  ok(below20.some((x) => x && x.text === 'Do not sell naked calls or short call ratios if overextended'),
    'standing overextension warning remains present');
  const at20 = Array.from(sb._regimeDynForbidden(20));
  ok(!at20.includes('No naked calls'), 'VIX = 20 still removes conditional naked-call prohibition');
  ok(at20.some((x) => x && x.text === 'Do not sell naked calls or short call ratios if overextended'),
    'standing overextension warning remains present at VIX 20');

  eq(Array.from(sb._regimeCompactVixNotes(18.49)).length, 6, 'VIX 18.49 still emits six compact notes');
  eq(Array.from(sb._regimeCompactVixNotes(18.5)).length, 2, 'VIX 18.50 still emits only naked-call/put notes');
  eq(Array.from(sb._regimeCompactVixNotes(19)).length, 1, 'VIX 19 still emits only naked-call note');
  eq(Array.from(sb._regimeCompactVixNotes(20)).length, 0, 'VIX 20 still emits no low-VIX notes');

  const lowForbidden = Array.from(sb._REGIME_CONTENT.LOW.forbidden);
  ok(lowForbidden.some((x) => x && x.text === 'Put ratio spreads'), 'LOW regime still forbids put ratio spreads');
  eq(sb._REGIME_LABEL.LOW, 'LOW VOL', 'LOW regime label unchanged');
  eq(sb._REGIME_LABEL.MID, 'MID VOL', 'MID regime label unchanged');
  eq(sb._REGIME_LABEL.HIGH, 'HIGH VOL', 'HIGH regime label unchanged');
}

section('6. byte-exact undo and mutation-sensitive negative controls');
const MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-manual-import.js'), 'utf8');
const MCX_MACRO_CHECK_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-macro-check.js'), 'utf8');
const BACKUP_RESTORE_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-backup-restore.js'), 'utf8');
// The seventh Journal owner is the newest layer: peel Backup/Restore before Manual Import.
const preMcxMacroCheck = MCX_MACRO_CHECK_U.undoMcxMacroCheck(preMcxCharts, MCX_MACRO_CHECK_MODULE);
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
const rebuilt = U.undoMcxRegimePolicy(preJournalUi, MODULE);
eq(rebuilt, BASE, 'Regime Policy undo reconstructs audited base byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
throws(() => U.undoMcxRegimePolicy(preJournalUi, MODULE + ' '), 'module-byte mutant is rejected');
throws(() => U.undoMcxRegimePolicy(preJournalUi.replace(REGIME_TAG, REGIME_TAG + '\n' + REGIME_TAG), MODULE),
  'duplicate-tag mutant is rejected');
throws(() => U.undoMcxRegimePolicy(preJournalUi.replace(REGIME_TAG, ''), MODULE), 'missing-tag mutant is rejected');
same(topLevelNames(MODULE + '\nfunction foreignRegimeOwner(){}'), MANIFEST.concat(['foreignRegimeOwner']),
  'manifest scanner exposes a foreign top-level owner mutant');
ok(varDeclCount(INDEX + '\n' + baseSlice, '_REGIME_CONTENT') > 0, 'inline-duplication mutant is visible to zero-residue guard');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('MCX REGIME POLICY BOUNDARY CONTRACT: OK');
