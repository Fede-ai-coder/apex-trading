'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX PR 3 — backend-candle cache/fetch extraction boundary contract.
//
// Audited base: dev-clean @ 2b61bbd1ed11f227032529e9147c82434b5720b2
// Scope: relocation only. Six helpers/fetch declarations plus two private cache
// state bindings move from two non-contiguous slices in index.html into one
// classic synchronous service. Renderer orchestration, feature flags and the
// shared in-flight map deliberately remain inline.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const U = require('./lib/mcx-pr3-undo.js');
const POST_JOURNAL_MCX3_UNDO = require('./lib/post-journal-mcx-pr3-undo.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '2b61bbd1ed11f227032529e9147c82434b5720b2';
const MODULE_REL = 'js/services/mcx-backend-candles.js';
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const INDEX = APP_LOADER.loadIndexHtml();
const APP = APP_LOADER.loadAppJavaScriptSource();
const MCX_CHARTS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-charts.js'), 'utf8');
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});

const FUNCTIONS = [
  '_mcxGetBackendCandleEntry',
  '_mcxGetCachedBackendCandles',
  '_mcxNewestBarTime',
  '_mcxStoreBackendCandleEntry',
  '_mcxCandlesLookStale',
  '_mcxFetchBackendCandlesForChart',
];
const STATE = ['_mcxBackendCandleCache', '_MCX_BACKEND_CACHE_TTL'];
const MANIFEST = FUNCTIONS.concat(STATE);
const OUTSIDE_INLINE = ['_mcxBackendFetchInFlight', 'ffBackendCandlesMcxCharts'];

const MCX1_TAG = '<script src="./js/services/mcx-market-context.js"></script>';
const MCX2_TAG = '<script src="./js/services/mcx-vix-market-context.js"></script>';
const MCX3_TAG = '<script src="./js/services/mcx-backend-candles.js"></script>';
const JOURNAL_TAG = '<script src="./js/services/journal-core.js"></script>';
const REGIME_TAG = '<script src="./js/services/mcx-regime-policy.js"></script>';
const JOURNAL_UI_TAG = '<script src="./js/ui/journal-ui.js"></script>';
const JOURNAL_REMOTE_TAG = '<script src="./js/services/journal-remote-persistence.js"></script>';
const JOURNAL_WRITE_THROUGH_TAG = '<script src="./js/services/journal-backend-write-through.js"></script>';
const JOURNAL_MIGRATION_TAG = '<script src="./js/services/journal-migration.js"></script>';
const JOURNAL_MANUAL_IMPORT_TAG = '<script src="./js/services/journal-manual-import.js"></script>';
const JOURNAL_BACKUP_RESTORE_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>';
const MCX_MACRO_CHECK_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>';
const MCX_CHARTS_TAG = '<script src="./js/ui/mcx-charts.js"></script>';
const APEX_POST_AUTH_TAG = '<script src="./js/services/apex-post-auth-init.js"></script>';
const TT_RECONNECT_TAG = '<script src="./js/ui/tt-reconnect.js"></script>';
const CLOSE_LEGS_TAG = '<script src="./js/ui/journal-close-legs.js"></script>';
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
function stripComments(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

console.log('MCX PR3 backend-candle boundary contract');
console.log('base=' + BASE_SHA);

section('1. pinned base, two-slice identity and exact owner artifact');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_SHA,
  'BASE_SHA resolves to the audited commit');
eq(BASE.length, U.BASE_CHARS, 'Node UTF-16 base length matches PR3 undo pin');
eq(sha256(BASE), U.BASE_SHA256, 'base SHA-256 matches PR3 undo pin');
eq(MODULE.length, U.MODULE_CHARS, 'module length matches audited extraction');
eq(sha256(MODULE), U.MODULE_SHA256, 'module SHA-256 matches audited extraction');
const baseFuncSlice = BASE.slice(U.FUNC_AT, U.FUNC_AT + U.FUNC_CHARS);
const baseStateSlice = BASE.slice(U.STATE_AT, U.STATE_AT + U.STATE_CHARS);
eq(sha256(baseFuncSlice), U.FUNC_SHA256, 'first relocated slice is the audited helper/fetch slice');
eq(sha256(baseStateSlice), U.STATE_SHA256, 'second relocated slice is the audited private-state slice');
eq(MODULE, baseFuncSlice + U.SEPARATOR + baseStateSlice,
  'whole module is exactly function slice + two-newline joiner + state slice');
same(topLevelNames(MODULE), MANIFEST, 'module declares exactly the eight intended owners, in physical order');

section('2. relocation ownership — zero inline residue, exactly one app-wide owner');
for (const name of FUNCTIONS) {
  eq(fnCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(fnCount(MODULE, name), 1, name + ' is declared once in MCX3');
  eq(fnCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
for (const name of STATE) {
  eq(varDeclCount(INDEX, name), 0, name + ' has zero inline declarations');
  eq(varDeclCount(MODULE, name), 1, name + ' is declared once in MCX3');
  eq(varDeclCount(APP, name), 1, name + ' has exactly one app-wide declaration');
}
// Private-state timing is unobservable to other source owners: every identifier
// occurrence from the audited base belongs to the two slices now owned by MCX3.
for (const name of STATE) {
  eq(count(BASE, name), count(baseFuncSlice + U.SEPARATOR + baseStateSlice, name),
    name + ' had no references outside the extracted family at the audited base');
}

section('3. exact classic load slot and deliberately retained inline owners');
eq(count(INDEX, MCX1_TAG), 1, 'exactly one MCX1 tag');
eq(count(INDEX, MCX2_TAG), 1, 'exactly one MCX2 tag');
eq(count(INDEX, MCX3_TAG), 1, 'exactly one MCX3 tag');
const mcx1At = INDEX.indexOf(MCX1_TAG), mcx2At = INDEX.indexOf(MCX2_TAG), mcx3At = INDEX.indexOf(MCX3_TAG);
const inlineAt = INDEX.indexOf(INLINE_OPEN);
eq(INDEX.slice(mcx1At, inlineAt), MCX1_TAG + '\n' + MCX2_TAG + '\n' + MCX3_TAG + '\n' + JOURNAL_TAG + '\n' + REGIME_TAG + '\n' + JOURNAL_UI_TAG + '\n' + JOURNAL_REMOTE_TAG + '\n' + JOURNAL_WRITE_THROUGH_TAG + '\n' + JOURNAL_MIGRATION_TAG + '\n' + JOURNAL_MANUAL_IMPORT_TAG + '\n' + JOURNAL_BACKUP_RESTORE_TAG + '\n' + MCX_MACRO_CHECK_TAG + '\n' + MCX_CHARTS_TAG + '\n' + APEX_POST_AUTH_TAG + '\n' + TT_RECONNECT_TAG + '\n' + CLOSE_LEGS_TAG + '\n',
  'service tail ends Journal Remote -> Write-through -> Migration -> Manual Import -> Backup/Restore -> MCX macro check -> MCX charts -> Apex post-auth -> TT reconnect -> Journal Close Legs -> inline');
const journalAt = INDEX.indexOf(JOURNAL_TAG);
ok(mcx1At >= 0 && mcx2At > mcx1At && mcx3At > mcx2At && journalAt > mcx3At && inlineAt > journalAt,
  'MCX3 loads synchronously after its predecessors and immediately before Journal Core');
ok(!/\b(?:async|defer|type)\s*=/.test(MCX3_TAG), 'MCX3 tag is classic synchronous src-only form');
// _mcxBackendFetchInFlight was inline when this contract was written; the later
// MCX charts/lifecycle relocation moved it, unchanged, into js/ui/mcx-charts.js
// with the chart functions that read and write it. What this contract pins is
// unchanged: MCX3 does not own it, and it still has exactly ONE declaration
// app-wide.
eq(varDeclCount(MODULE, '_mcxBackendFetchInFlight'), 0, '_mcxBackendFetchInFlight is not pulled into MCX3');
eq(varDeclCount(MCX_CHARTS_MODULE, '_mcxBackendFetchInFlight'), 1,
  '_mcxBackendFetchInFlight now lives in the MCX charts owner exactly once');
eq(varDeclCount(APP, '_mcxBackendFetchInFlight'), 1,
  '_mcxBackendFetchInFlight still has exactly one declaration app-wide');
eq(varDeclCount(INDEX, '_mcxBackendFetchInFlight'), 0,
  '_mcxBackendFetchInFlight has zero inline residue after the MCX charts relocation');
eq(fnCount(INDEX, 'ffBackendCandlesMcxCharts'), 1, 'feature flag remains inline exactly once');
eq(fnCount(MODULE, 'ffBackendCandlesMcxCharts'), 0, 'feature flag is not redeclared by MCX3');

section('4. classic-script load safety and ownership surface');
try {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(MANIFEST.every((name) => name in sandbox), 'all eight globals exist after classic-script evaluation');
  eq(Object.keys(sandbox._mcxBackendCandleCache).length, 0, 'private cache starts empty');
  eq(sandbox._MCX_BACKEND_CACHE_TTL, 60000, 'private cache TTL stays 60 seconds');
} catch (e) {
  console.log(e && e.stack || e);
  ok(false, 'MCX3 evaluates without touching call-time dependencies');
  ok(false, 'all eight globals exist after evaluation');
  ok(false, 'private state initializes identically');
}
ok(!/\bdocument\s*\./.test(MODULE), 'MCX3 owns no DOM access');
ok(!/\bsetInterval\s*\(/.test(MODULE), 'MCX3 creates no recurring timer');
ok(!/\bnew\s+WebSocket\b/.test(MODULE), 'MCX3 opens no frontend WebSocket');

section('5. backend candle source policy is unchanged');
const CODE = stripComments(MODULE);
ok(CODE.includes("BACKEND + '/dev/market/candles-dxlink/'"), 'backend reads stay on /dev/market/candles-dxlink/:symbol');
ok(CODE.includes("BACKEND + '/dev/market/candles-dxlink/warmup'"), 'warmup stays on the DXLink warmup endpoint');
ok(!/\/market\/candles(?!-dxlink)/.test(CODE), 'legacy non-DXLink /market/candles remains forbidden');
ok(!/yahoo/i.test(CODE), 'executable MCX3 source remains Yahoo-free');
ok(CODE.includes("body: JSON.stringify({ symbols: [symbol], timeframes: ['1D', '30M'], waitMs: 15000 })"),
  'warmup still requests exactly 1D + 30M so 4H remains server-derived');
ok(CODE.includes("?timeframe=1D") && CODE.includes("?timeframe=4H"),
  'read-first path still reads both 1D and server-derived 4H');

section('6. cache freshness / staleness semantics are preserved by execution');
{
  const logs = [];
  const sandbox = { console: { log: (...a) => logs.push(a.join(' ')), warn() {}, error() {} }, Date, isFinite };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  const newer = { candles1d: [{ time: 200 }], candles4h: [], source: 'BACKEND_DXLINK_CANDLES', fetchedAt: Date.now() };
  const older = { candles1d: [{ time: 100 }], candles4h: [], source: 'BACKEND_DXLINK_CANDLES', fetchedAt: Date.now() + 1 };
  sandbox._mcxStoreBackendCandleEntry('SPY', newer);
  const kept = sandbox._mcxStoreBackendCandleEntry('SPY', older);
  eq(kept.candles1d[0].time, 200, 'older 1D backend set cannot overwrite newer cached candles');
  eq(sandbox._mcxBackendCandleCache.SPY.candles1d[0].time, 200, 'freshness guard keeps the newer cached object active');
  ok(logs.some((s) => s.includes('freshness-guard kept newer cache')), 'older-write rejection preserves its diagnostic');
  const fresher = { candles1d: [{ time: 300 }], candles4h: [], source: 'BACKEND_DXLINK_CANDLES', fetchedAt: Date.now() };
  sandbox._mcxStoreBackendCandleEntry('SPY', fresher);
  eq(sandbox._mcxBackendCandleCache.SPY.candles1d[0].time, 300, 'newer backend candles replace the cache normally');
  ok(!!sandbox._mcxGetBackendCandleEntry('SPY'), 'fresh TTL entry is reusable');
  sandbox._mcxBackendCandleCache.SPY.fetchedAt = Date.now() - 60001;
  eq(sandbox._mcxGetBackendCandleEntry('SPY'), null, 'entry expires after the unchanged 60-second TTL');
  const DAY = 86400000, now = Date.now();
  eq(sandbox._mcxCandlesLookStale([{ time: now - 5 * DAY }], '1D'), true, '1D older than four days is stale');
  eq(sandbox._mcxCandlesLookStale([{ time: now - 3 * DAY }], '1D'), false, '1D within four days remains usable');
  eq(sandbox._mcxCandlesLookStale([{ time: now - 3 * DAY }], '4H'), true, '4H older than two days is stale');
}

section('7. byte-exact newest-first undo and mutation-sensitive guards');
const rebuilt = POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(INDEX, MODULE);
eq(rebuilt, BASE, 'PR3 undo reconstructs audited base byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
throws(() => POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(INDEX, MODULE + ' '), 'module-byte mutant is rejected by identity guard');
throws(() => POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(INDEX.replace(MCX3_TAG, MCX3_TAG + '\n' + MCX3_TAG), MODULE),
  'duplicate-tag mutant is rejected');
throws(() => POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(INDEX.replace(MCX3_TAG, ''), MODULE), 'missing-tag mutant is rejected');
same(topLevelNames(MODULE + '\nfunction foreignMcx3Owner(){}'), MANIFEST.concat(['foreignMcx3Owner']),
  'manifest scanner exposes a foreign top-level owner mutant');
ok(fnCount(INDEX + '\n' + baseFuncSlice, '_mcxGetBackendCandleEntry') > 0,
  'inline-duplication mutant is visible to the zero-residue guard');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('MCX PR3 BACKEND-CANDLE BOUNDARY CONTRACT: OK');
