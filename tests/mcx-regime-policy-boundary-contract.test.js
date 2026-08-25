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

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '72a2c5759e17a3fd0477f62724d6fd4490be1c8f';
const MODULE_REL = 'js/services/mcx-regime-policy.js';
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const JOURNAL_UI_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-ui.js'), 'utf8');
const REMOTE_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-remote-persistence.js'), 'utf8');
const INDEX = APP_LOADER.loadIndexHtml();
const APP = APP_LOADER.loadAppJavaScriptSource();
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
const INLINE_TRANSITION = [
  '_regimeReadState', '_regimeWriteState', '_regimeDayStart',
  '_regimeUpdateTransition', '_regimeTransitionStatus', '_regimeRenderTransition',
];
const INLINE_RENDER = [
  '_regimeSections', '_regimeRenderMain', '_regimeRenderCompact', '_regimeRefresh',
  '_mcxSpySqzBadgeHtml', '_mcxRenderSpySqzBadge', '_mcxRenderCharts', '_mcxInit',
];
const INLINE_STATE = [
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
const inlineAt = INDEX.indexOf(INLINE_OPEN);
eq(count(INDEX, REGIME_TAG), 1, 'exactly one MCX Regime Policy script tag');
eq(INDEX.slice(mcx1At, inlineAt),
  MCX1_TAG + '\n' + MCX2_TAG + '\n' + MCX3_TAG + '\n' + JOURNAL_TAG + '\n' + REGIME_TAG + '\n' + JOURNAL_UI_TAG + '\n' + REMOTE_TAG + '\n',
  'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal -> Regime Policy -> Journal UI -> Journal Remote -> inline');
ok(mcx1At >= 0 && mcx2At > mcx1At && mcx3At > mcx2At && journalAt > mcx3At && regimeAt > journalAt && journalUiAt > regimeAt && remoteAt > journalUiAt && inlineAt > remoteAt,
  'Regime Policy loads synchronously after Journal Core and before Journal UI / Journal Remote / residual inline code');
ok(!/\b(?:async|defer|type)\s*=/.test(REGIME_TAG), 'Regime Policy tag is classic synchronous src-only form');
for (const name of INLINE_TRANSITION.concat(INLINE_RENDER)) {
  eq(fnCount(INDEX, name), 1, name + ' deliberately remains inline exactly once');
  eq(fnCount(MODULE, name), 0, name + ' is not pulled into the policy core');
}
for (const name of INLINE_STATE) {
  eq(varDeclCount(INDEX, name), 1, name + ' state deliberately remains inline exactly once');
  eq(varDeclCount(MODULE, name), 0, name + ' state is not pulled into the policy core');
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
const preRemote = REMOTE_U.undoJournalRemotePersistence(INDEX, REMOTE_MODULE);
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
