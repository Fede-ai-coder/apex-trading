'use strict';

// Permanent boundary contract for the Journal Manual Import classic service.
// It proves byte identity against the merged #403 audit, declarations-only
// ownership, classic load order, unchanged inline window-exposure timing,
// runtime import behavior, exact undo, and separation from Backup/Restore UI.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '47391e8522c2d7a0c27b853d12d87350754a38b9';
const BASE_TREE = '4510c2abf604eb781216571772f115b9f8a2ac16';
const AUDIT_REL = 'tests/temporary-journal-manual-import-audit.test.js';
const MODULE_REL = 'js/services/journal-manual-import.js';
const MODULE_TAG = '<script src="./js/services/journal-manual-import.js"></script>';
const CONTRACT_REL = 'tests/journal-manual-import-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-manual-import-undo.js';
const MIGRATION_TAG = '<script src="./js/services/journal-migration.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

const MANUAL_MARKER =
  '// ── Manual, console-only cross-host Journal trade import ──────────────────────\n';
const BACKUP_MARKER =
  '// ══════════════════════════════════════════════════════════════\n' +
  '// BACKUP / RESTORE PANEL\n';
const EXPOSURE_PREFIX = 'try {\n  window.apexImportJournalTradesJson = apexImportJournalTradesJson;\n';

const EXPECTED_SHAPE = [
  { name: '_journalImportPayload', form: 'function', isAsync: false, chars: 379 },
  { name: '_journalRepairPortfolioIdRemote', form: 'function', isAsync: true, chars: 369 },
  { name: 'apexImportJournalTradesJson', form: 'function', isAsync: true, chars: 4413 },
];
const EXPECTED_DEPENDENCIES = [
  'Array',
  'BACKEND',
  'JSON',
  'Object',
  'S',
  'String',
  '_activeView',
  '_jSyncJournalFromBackend',
  '_resolveTradePortfolioId',
  '_tradeForBackend',
  'console',
  'encodeURIComponent',
  'jSaveRemote',
  'renderPortfolioView',
  'showToast',
  'ttCall',
];

const INDEX = APP_LOADER.loadIndexHtml();
const MCX_CHARTS_U = require('./lib/mcx-charts-undo.js');
const MCX_MACRO_CHECK_U = require('./lib/mcx-macro-check-undo.js');
const BACKUP_RESTORE_U = require('./lib/journal-backup-restore-undo.js');
const MCX_CHARTS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-charts.js'), 'utf8');
const MCX_MACRO_CHECK_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-macro-check.js'), 'utf8');
const BACKUP_RESTORE_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-backup-restore.js'), 'utf8');
// Backup/Restore is the seventh Journal owner and was extracted after this one.
// Undoing it yields the index exactly as THIS extraction shipped it, so every
// Manual-Import-layer assertion below stays pinned to its own byte identity.
// The MCX charts/lifecycle owner is the newest layer of all, sitting on top of
// the MCX macro-check owner, which sits on top of Backup/Restore: peel them
// NEWEST-FIRST, so each undo below still sees the exact document it was cut
// against. Every helper re-verifies what it hands back by length and SHA-256,
// so each hop is proved, not assumed.
const preMcxCharts = MCX_CHARTS_U.undoMcxCharts(INDEX, MCX_CHARTS_MODULE);
const preMcxMacroCheck = MCX_MACRO_CHECK_U.undoMcxMacroCheck(preMcxCharts, MCX_MACRO_CHECK_MODULE);
const POST_MANUAL_INDEX = BACKUP_RESTORE_U.undoJournalBackupRestore(preMcxMacroCheck, BACKUP_RESTORE_MODULE);
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const U = require('./lib/journal-manual-import-undo.js');
const MIGRATION_U = require('./lib/journal-migration-undo.js');
const MIGRATION_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-migration.js'), 'utf8');
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const manualAt = BASE.indexOf(MANUAL_MARKER);
const backupAt = BASE.indexOf(BACKUP_MARKER);
const inlineCloseAt = BASE.indexOf('</script>', backupAt);
const indexDeclarations = scanTopLevelDeclarations(BASE);
const lastDeclaration = indexDeclarations.find((entry) => entry.name === 'apexImportJournalTradesJson');
const candidateEnd = lastDeclaration.end + 2; // Include the closing brace and its LF.
const exposureEnd = backupAt - 1; // Keep one separator LF with Backup/Restore.
const CANDIDATE = BASE.slice(manualAt, candidateEnd);
const EXPOSURE = BASE.slice(candidateEnd, exposureEnd);
const WHOLE_MANUAL = BASE.slice(manualAt, exposureEnd);
const BACKUP_ONLY = BASE.slice(backupAt, inlineCloseAt);
const currentExposureAt = POST_MANUAL_INDEX.indexOf(EXPOSURE_PREFIX);
const currentBackupAt = POST_MANUAL_INDEX.indexOf(BACKUP_MARKER);

const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    code: part.src === './js/services/journal-manual-import.js' ? '\n' : part.code,
  }));
const OUTSIDE_APP = APP_PARTS.map((part) => part.code).join('\n');

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
function changedPaths() {
  const committed = execFileSync('git', ['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean);
  const statusOutput = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const status = statusOutput.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
  return Array.from(new Set(committed.concat(status))).sort();
}
function topLevelShape(source) {
  return scanTopLevelDeclarations(source).map((entry) => ({
    name: entry.name,
    form: entry.form,
    isAsync: entry.isAsync,
    chars: entry.chars,
  }));
}
function topLevelResidue(source) {
  const declarations = scanTopLevelDeclarations(source);
  const chars = Array.from(source);
  declarations.forEach((entry) => {
    for (let i = entry.start; i <= entry.end; i++) chars[i] = ' ';
  });
  return chars.join('')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
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
  const commaDeclarationRe = /,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  while ((match = commaDeclarationRe.exec(masked))) declared.add(match[1]);
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

function directEffects(source) {
  const masked = maskLiterals(source);
  const patterns = {
    document: /\bdocument\s*\./g,
    fetch: /\bfetch\s*\(/g,
    ttCall: /\bttCall\s*\(/g,
    jSaveRemote: /\bjSaveRemote\s*\(/g,
    sync: /\b_jSyncJournalFromBackend\s*\(/g,
    render: /\brenderPortfolioView\s*\(/g,
    toast: /\bshowToast\s*\(/g,
    setTimeout: /\bsetTimeout\s*\(/g,
    setInterval: /\bsetInterval\s*\(/g,
    WebSocket: /\b(?:new\s+)?WebSocket\b/g,
    addEventListener: /\baddEventListener\s*\(/g,
    localStorage: /\blocalStorage\s*\./g,
    window: /\bwindow\s*\./g,
    confirm: /\b(?:window\.)?confirm\s*\(/g,
  };
  return Object.fromEntries(Object.entries(patterns).map(([name, re]) => [
    name,
    (masked.match(re) || []).length,
  ]));
}

function ownerDeclarationCounts(source) {
  const masked = maskLiterals(source);
  return {
    payload: (masked.match(/^\s*function\s+_journalImportPayload\s*\(/gm) || []).length,
    repair: (masked.match(/^\s*async\s+function\s+_journalRepairPortfolioIdRemote\s*\(/gm) || []).length,
    importJson: (masked.match(/^\s*async\s+function\s+apexImportJournalTradesJson\s*\(/gm) || []).length,
  };
}

function loadCandidate(source) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: MODULE_REL });
    return { ok: true, error: null, sandbox };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error), sandbox };
  }
}

function observeTopLevel(source) {
  const events = [];
  const sandbox = {
    window: {},
    console: {
      log() { events.push('console.log'); },
      warn() { events.push('console.warn'); },
      error() { events.push('console.error'); },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'manual-import-strategy.js' });
  if (Object.prototype.hasOwnProperty.call(sandbox.window, 'apexImportJournalTradesJson')) {
    events.unshift('window.apexImportJournalTradesJson');
  }
  return events;
}

function boundaryViolations(source, outsideSource) {
  const violations = [];
  if (JSON.stringify(topLevelShape(source)) !== JSON.stringify(EXPECTED_SHAPE)) violations.push('manifest');
  if (JSON.stringify(freeIdentifiers(source)) !== JSON.stringify(EXPECTED_DEPENDENCIES)) violations.push('dependencies');
  if (topLevelResidue(source) !== '') violations.push('top-level-effect');
  const effects = directEffects(source);
  const forbidden = [
    'document', 'fetch', 'setTimeout', 'setInterval', 'WebSocket',
    'addEventListener', 'localStorage', 'window', 'confirm',
  ];
  if (forbidden.some((name) => effects[name] !== 0)) violations.push('foreign-direct-effect');
  if (effects.ttCall !== 3 || effects.jSaveRemote !== 1 || effects.sync !== 1 ||
      effects.render !== 1 || effects.toast !== 1) violations.push('delegation-shape');
  if (maskLiterals(source).includes('jMigrateApexTradesToBackend')) violations.push('migration-coupling');
  if (source.includes(EXPOSURE_PREFIX) || source.includes(BACKUP_MARKER)) violations.push('owner-overreach');
  const later = ownerDeclarationCounts(outsideSource);
  if (later.payload !== 0 || later.repair !== 0 || later.importJson !== 0) violations.push('competing-owner');
  if (!loadCandidate(source).ok) violations.push('load-contract');
  return violations;
}

function moduleOrderViolations(html) {
  const violations = [];
  if (countLiteral(html, MODULE_TAG) !== 1) violations.push('tag-count');
  const migrationAt = html.indexOf(MIGRATION_TAG);
  const futureAt = html.indexOf(MODULE_TAG);
  const inlineAt = html.indexOf(INLINE_OPEN);
  if (!(migrationAt >= 0 && migrationAt < futureAt && futureAt < inlineAt)) violations.push('load-order');
  if (countLiteral(html, MIGRATION_TAG + '\n' + MODULE_TAG + '\n<script>') !== 1) {
    violations.push('adjacency');
  }
  const tags = APP_LOADER.parseScriptTags(html)
    .filter((entry) => entry.src === './js/services/journal-manual-import.js');
  if (tags.length !== 1 || tags[0].attrs.trim() !== 'src="./js/services/journal-manual-import.js"') {
    violations.push('classic-tag');
  }
  return violations;
}

console.log('JOURNAL MANUAL-IMPORT BOUNDARY CONTRACT');
console.log('base=' + BASE_SHA);

section('1. Pinned post-#403 base and exact extracted artifacts');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_SHA, 'merged #403 audit base resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_TREE, 'merged #403 audit tree resolves exactly');
eq(BASE.length, 1951961, 'base index UTF-16 length is pinned');
eq(sha256(BASE), 'fe514b8183fc8fbde428062ad050bf7f78577dd32a887025ed9caf1fddb566c4',
  'base index SHA-256 is pinned');
eq(POST_MANUAL_INDEX.length, 1944246, 'extracted index UTF-16 length is exact');
eq(INDEX.length, 1884429, 'current index UTF-16 length is the post-MCX-charts value');
eq(sha256(INDEX), 'b5f6dd5b2fad6e1d3e0ce3fee4abf5cfb561c19de714e20f86874e49e10a857e',
  'current index SHA-256 is the post-MCX-charts value');
// The post-MCX-macro-check document those two lines used to pin is still
// pinned, one layer down, on the peeled preMcxCharts reconstruction.
eq(preMcxCharts.length, 1928890, 'post-MCX-macro-check index UTF-16 length is still pinned');
eq(sha256(preMcxCharts), '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96',
  'post-MCX-macro-check index SHA-256 is still pinned');
// The post-Backup/Restore document is still pinned, one layer further down,
// on the peeled preMcxMacroCheck reconstruction.
eq(preMcxMacroCheck.length, 1933458, 'post-Backup/Restore index UTF-16 length is still pinned');
eq(sha256(preMcxMacroCheck), '71064f2cb772a0555d5abcf14496e9c87830e1974be1544dcc08ec841047e529',
  'post-Backup/Restore index SHA-256 is still pinned');
eq(countLiteral(INDEX, '<script src="./js/ui/mcx-macro-check.js"></script>'), 1,
  'the MCX macro-check owner loads exactly once in the current index');
eq(countLiteral(INDEX, '<script src="./js/ui/journal-backup-restore.js"></script>'), 1,
  'the seventh Journal owner loads exactly once in the current index');
eq(sha256(POST_MANUAL_INDEX), '0bc8f2904a47b84a345ca9c35a18c17208082c7f447fe358d3dd19cd2dba4790',
  'extracted index SHA-256 is the audited prediction');
eq(MODULE, CANDIDATE, 'module is byte-identical to the audited declaration slice');

section('2. Exact residual boundaries and ownership shape');
eq(countLiteral(BASE, MANUAL_MARKER), 1, 'manual-import marker is unique in the audit base');
eq(countLiteral(POST_MANUAL_INDEX, MANUAL_MARKER), 0, 'manual-import declaration marker has zero inline residue');
eq(countLiteral(POST_MANUAL_INDEX, BACKUP_MARKER), 1, 'Backup/Restore marker is unique');
ok(manualAt >= 0 && manualAt < candidateEnd && candidateEnd < backupAt && backupAt < inlineCloseAt,
  'physical order is declarations -> exposure glue -> Backup/Restore UI');
eq(manualAt, 1932685, 'candidate starts at exact post-#402 offset');
eq(candidateEnd, 1940463, 'candidate ends at exact post-#402 offset');
eq(lineAt(BASE, manualAt), 34030, 'candidate starts on line 34030 of the audit base');
eq(lineAt(BASE, candidateEnd), 34170, 'candidate ends on line 34170 of the audit base');
eq(MODULE.length, 7778, 'module has exact UTF-16 length');
eq(Buffer.byteLength(MODULE, 'utf8'), 7840, 'module has exact UTF-8 byte length');
eq(sha256(MODULE), 'fc4ba6dcbe9869c99018754a870172f4ac9a24463964bf51a3061fe5c0918536',
  'module byte identity is pinned');
ok(MODULE.endsWith('  return report;\n}\n'), 'module ends with the complete async importer and one LF');
eq(topLevelShape(MODULE), EXPECTED_SHAPE,
  'module owns exactly three declarations with pinned forms and sizes');
eq(topLevelResidue(MODULE), '',
  'module is declarations plus comments/whitespace only: no executable top-level residue');

section('3. Window strategy is derived, not assumed');
eq(EXPOSURE.length, 625, 'inline window/bootstrap glue has exact UTF-16 length');
eq(sha256(EXPOSURE), 'a7f3e7b14bc08a333e52b038b62c0f796cb7fdc4f4c5c3df3941e717c47b3051',
  'inline window/bootstrap glue byte identity is pinned');
ok(EXPOSURE.startsWith(EXPOSURE_PREFIX), 'exposure slice starts at the explicit window assignment');
ok(topLevelResidue(WHOLE_MANUAL).includes('window.apexImportJournalTradesJson = apexImportJournalTradesJson') &&
   topLevelResidue(WHOLE_MANUAL).includes('console.log('),
  'moving the whole adjacent block would also move the executable window/log exposure glue');
eq(observeTopLevel(MODULE), [], 'declarations-only module performs zero load-time action');
eq(observeTopLevel(WHOLE_MANUAL), ['window.apexImportJournalTradesJson', 'console.log'],
  'whole-block strategy advances one window write and one console log into the module');
eq(directEffects(EXPOSURE).window, 1, 'exposure glue owns exactly one window write');
eq((maskLiterals(EXPOSURE).match(/\bconsole\s*\.\s*log\s*\(/g) || []).length, 1,
  'exposure glue owns exactly one availability log');
eq(POST_MANUAL_INDEX.slice(currentExposureAt, currentBackupAt - 1), EXPOSURE,
  'exposure glue remains byte-exactly inline after extraction');
eq(POST_MANUAL_INDEX.slice(currentBackupAt, currentBackupAt + BACKUP_MARKER.length), BACKUP_MARKER,
  'the adjacent Backup/Restore marker remains byte-exact');

const indexWithoutCandidate = BASE.slice(0, manualAt) + BASE.slice(candidateEnd);
const EXTRACTED_INDEX = indexWithoutCandidate.replace(
  MIGRATION_TAG + '\n<script>',
  MIGRATION_TAG + '\n' + MODULE_TAG + '\n<script>'
);
eq(EXTRACTED_INDEX, POST_MANUAL_INDEX, 'audited extraction algorithm reproduces the shipped index byte-for-byte');
eq(countLiteral(POST_MANUAL_INDEX, EXPOSURE_PREFIX), 1, 'inline monolith retains the exposure exactly once');
eq(moduleOrderViolations(POST_MANUAL_INDEX), [],
  'classic service loads after Migration and immediately before the inline monolith');
const extractedWithoutTag = POST_MANUAL_INDEX.replace(MODULE_TAG + '\n', '');
eq(extractedWithoutTag.slice(0, manualAt) + MODULE + extractedWithoutTag.slice(manualAt), BASE,
  'tag removal plus byte-exact declaration insertion reconstructs #403');

section('4. Dependency, side-effect, and consumer boundary');
eq(freeIdentifiers(MODULE), EXPECTED_DEPENDENCIES,
  'module call-time dependency inventory is exact');
eq(directEffects(MODULE), {
  document: 0,
  fetch: 0,
  ttCall: 3,
  jSaveRemote: 1,
  sync: 1,
  render: 1,
  toast: 1,
  setTimeout: 0,
  setInterval: 0,
  WebSocket: 0,
  addEventListener: 0,
  localStorage: 0,
  window: 0,
  confirm: 0,
}, 'owner delegates transport/sync/render/toast and owns no DOM, raw fetch, storage, timer, listener, or window primitive');
eq(ownerDeclarationCounts(OUTSIDE_APP), { payload: 0, repair: 0, importJson: 0 },
  'no competing declaration remains elsewhere after the simulated cut');
eq(externalUsage('_journalImportPayload'), [], 'payload helper has no outside consumer');
eq(externalUsage('_journalRepairPortfolioIdRemote'), [], 'repair helper has no outside consumer');
eq(externalUsage('apexImportJournalTradesJson'), [{ where: 'index.html:inline', refs: 2 }],
  'public importer is consumed only by its inline window exposure (property plus value)');
eq((maskLiterals(OUTSIDE_APP).match(/(?<![A-Za-z0-9_$.])apexImportJournalTradesJson\s*\(/g) || []).length, 0,
  'application source outside the owner never auto-invokes the manual importer');
ok(!maskLiterals(MODULE).includes('jMigrateApexTradesToBackend'),
  'manual importer has zero coupling to automatic Journal Migration');
const load = loadCandidate(MODULE);
ok(load.ok, 'module evaluates before its call-time dependencies exist: ' + load.error);
eq(typeof load.sandbox.apexImportJournalTradesJson, 'function', 'classic evaluation exposes the importer declaration');

section('5. Existing behavioral proof is loader-aware and green');
const runtimeTest = fs.readFileSync(path.join(ROOT, 'tests/journal-import-json.test.js'), 'utf8');
ok(runtimeTest.includes("require('./lib/load-app-source').loadAppJavaScriptSource()"),
  'existing 63-assertion runtime suite reconstructs external classic modules through the loader');
const runtimeOutput = execFileSync(process.execPath, ['tests/journal-import-json.test.js'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 4 * 1024 * 1024,
});
ok(runtimeOutput.includes('ALL PASSED (63 assertions)'),
  'existing import/repair/duplicate/normalization/non-destructive runtime contract is green');

section('6. Adjacent Backup/Restore is a rejected separate owner');
eq(WHOLE_MANUAL.length, 8403, 'whole adjacent manual block length is pinned');
eq(sha256(WHOLE_MANUAL), 'a8eef486e6ac6e3bf2b6ff5e97ccff2a6ef9a0d83e19aee9b8eeff3074f7943b',
  'whole adjacent manual block identity is pinned');
eq(WHOLE_MANUAL, CANDIDATE + EXPOSURE, 'manual block partitions exactly into declarations plus exposure glue');
eq(BACKUP_ONLY.length, 10846, 'Backup/Restore adjacent slice length is pinned');
eq(sha256(BACKUP_ONLY), '62f04ee1e720eb098b9d17e4a1fdeff90d1b5ccbbbc12d564ce558ce175fc1c2',
  'Backup/Restore adjacent byte identity is pinned');
eq(topLevelShape(BACKUP_ONLY).map((entry) => entry.name), [
  'showBackupPanel', 'closeBackupPanel', 'loadBackupList', '_bkFmtBytes', '_bkFmtDate',
  'renderBackupList', 'createBackup', 'restoreBackup', 'deleteBackup',
], 'Backup/Restore owns nine separate UI/transport declarations');
eq(directEffects(BACKUP_ONLY).document, 9, 'Backup/Restore owns its DOM mutations');
eq(directEffects(BACKUP_ONLY).setTimeout, 4, 'Backup/Restore owns delayed status/recheck timers');
eq(directEffects(BACKUP_ONLY).confirm, 3, 'Backup/Restore owns destructive-action confirmations');
eq(boundaryViolations(MODULE, OUTSIDE_APP), [],
  'selected declarations-only owner passes every semantic boundary gate');

section('7. Extraction fallout inventory');
const contractsToAdvance = [
  'tests/backend-directional-adapter-boundary-contract.test.js',
  'tests/backend-directional-preview-boundary-contract.test.js',
  'tests/backend-directional-snapshot-boundary-contract.test.js',
  'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
  'tests/journal-backend-write-through-boundary-contract.test.js',
  'tests/journal-core-boundary-contract.test.js',
  'tests/journal-migration-boundary-contract.test.js',
  'tests/journal-remote-persistence-boundary-contract.test.js',
  'tests/journal-ui-boundary-contract.test.js',
  'tests/mcx-backend-candles-boundary-contract.test.js',
  'tests/mcx-market-context-boundary-contract.test.js',
  'tests/mcx-regime-policy-boundary-contract.test.js',
  'tests/mcx-vix-market-context-boundary-contract.test.js',
  'tests/pess-extraction-boundary-contract.test.js',
  'tests/pretrade-risk-modal-boundary-contract.test.js',
  'tests/pretrade-risk-rules-boundary-contract.test.js',
  'tests/pretrade-technicals-boundary-contract.test.js',
  'tests/sfs-extraction-boundary-contract.test.js',
];
for (const rel of contractsToAdvance) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('journal-manual-import.js') ||
     source.includes('journal-manual-import\\.js') ||
     source.includes('six Journal owners') ||
     source.includes('journal-backup-restore.js') ||
     source.includes('journal-backup-restore\\.js') ||
     source.includes('seven Journal owners'),
     rel + ' recognizes the sixth or seventh Journal owner, or the current classic-script tail');
}
eq(preMcxCharts.length, MCX_CHARTS_U.BASE_CHARS,
  'peeling the MCX charts layer reaches the pinned post-#406 index length');
eq(sha256(preMcxCharts), MCX_CHARTS_U.BASE_SHA256,
  'peeling the MCX charts layer reaches the pinned post-#406 index hash');
ok(MCX_CHARTS_U.isApplied(INDEX),
  'the shipped index really does carry the MCX charts layer being peeled');
ok(!MCX_CHARTS_U.isApplied(preMcxCharts),
  'the peeled document no longer carries the MCX charts tag');
eq(preMcxMacroCheck.length, MCX_MACRO_CHECK_U.BASE_CHARS,
  'peeling the MCX macro-check layer reaches the pinned post-#405 index length');
eq(sha256(preMcxMacroCheck), MCX_MACRO_CHECK_U.BASE_SHA256,
  'peeling the MCX macro-check layer reaches the pinned post-#405 index hash');
ok(MCX_MACRO_CHECK_U.isApplied(preMcxCharts),
  'the charts-peeled index really does carry the MCX macro-check layer being peeled');
ok(!MCX_MACRO_CHECK_U.isApplied(preMcxMacroCheck),
  'the peeled document no longer carries the MCX macro-check tag');
ok(fs.readFileSync(path.join(ROOT, 'tests/lib/post-journal-mcx-pr3-undo.js'), 'utf8')
  .includes('undoJournalManualImport'),
  'cumulative historical helper starts by undoing Manual Import');

section('8. Byte-exact undo and mutation-sensitive negative controls');
const rebuilt = U.undoJournalManualImport(POST_MANUAL_INDEX, MODULE);
eq(rebuilt, BASE, 'Manual Import undo reconstructs merged #403 byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
const preMigration = MIGRATION_U.undoJournalMigration(rebuilt, MIGRATION_MODULE);
eq(preMigration.length, MIGRATION_U.BASE_CHARS, 'cumulative undo reaches the pre-Migration base');
eq(sha256(preMigration), MIGRATION_U.BASE_SHA256, 'cumulative undo hash matches the pre-Migration base');
assert.throws(() => U.undoJournalManualImport(POST_MANUAL_INDEX, MODULE + ' '), /MODULE_IDENTITY/);
pass++;
assert.throws(() => U.undoJournalManualImport(POST_MANUAL_INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /TAG_IDENTITY/);
pass++;
assert.throws(() => U.undoJournalManualImport(POST_MANUAL_INDEX.replace(MODULE_TAG, ''), MODULE), /TAG_IDENTITY/);
pass++;

ok(boundaryViolations(MODULE.replace(
  /function _journalImportPayload[\s\S]*?\n}\n\n\/\/ PUT/,
  '// PUT'
), OUTSIDE_APP).includes('manifest'), 'missing payload-helper mutant is rejected');
ok(boundaryViolations(
  MODULE.replace(
    'async function apexImportJournalTradesJson',
    'async function apexImportJournalTradesJsonV2'
  ), OUTSIDE_APP
).includes('manifest'), 'renamed public importer mutant is rejected');
ok(boundaryViolations(MODULE + '\ndocument.body;\n', OUTSIDE_APP).includes('top-level-effect'),
  'foreign top-level DOM mutant is rejected');
ok(boundaryViolations(MODULE + EXPOSURE, OUTSIDE_APP).includes('owner-overreach'),
  'whole-block/window-exposure strategy is rejected');
ok(boundaryViolations(MODULE + '\n' + BACKUP_ONLY, OUTSIDE_APP).includes('owner-overreach'),
  'Backup/Restore overreach mutant is rejected');
ok(boundaryViolations(
  MODULE,
  OUTSIDE_APP + '\nasync function apexImportJournalTradesJson() {}\n'
).includes('competing-owner'), 'competing later importer owner mutant is rejected');
ok(sha256(MODULE.replace('var imported = 0', 'var imported = 1')) !== sha256(MODULE),
  'same-length behavior mutation is rejected by the identity pin');
ok(moduleOrderViolations(POST_MANUAL_INDEX.replace(MODULE_TAG + '\n', '')).includes('tag-count'),
  'missing module tag mutant is rejected');
ok(moduleOrderViolations(POST_MANUAL_INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG))
  .includes('tag-count'), 'duplicate module tag mutant is rejected');
ok(moduleOrderViolations(POST_MANUAL_INDEX.replace(
  MIGRATION_TAG + '\n' + MODULE_TAG,
  MODULE_TAG + '\n' + MIGRATION_TAG
)).includes('load-order'), 'Manual-Import-before-Migration mutant is rejected');
ok(moduleOrderViolations(POST_MANUAL_INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' defer>')))
  .includes('classic-tag'), 'deferred module tag mutant is rejected');

section('9. Exact production scope');
const changed = changedPaths();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
eq(changedProduction, ['index.html', MODULE_REL, 'js/ui/journal-backup-restore.js', 'js/ui/mcx-charts.js', 'js/ui/mcx-macro-check.js'],
  'production footprint is exactly index.html plus the Journal Manual Import, Backup/Restore, MCX charts and MCX macro-check owners');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'permanent Manual Import contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'byte-exact Manual Import undo helper is part of the change');
ok(changed.indexOf(AUDIT_REL) >= 0, 'temporary audit removal is visible in the change set');
ok(!changed.some((rel) => rel.startsWith('.github/')),
  'no workflow or bootstrap script changed');

const report = {
  base: {
    commit: BASE_SHA,
    tree: BASE_TREE,
    indexChars: BASE.length,
    indexSha256: sha256(BASE),
  },
  selected: {
    module: MODULE_REL,
    strategy: 'declarations-only; keep window exposure inline',
    start: manualAt,
    end: candidateEnd,
    startLine: lineAt(BASE, manualAt),
    endLine: lineAt(BASE, candidateEnd),
    chars: MODULE.length,
    sha256: sha256(MODULE),
    owners: EXPECTED_SHAPE.map((entry) => entry.name),
    externalConsumers: externalUsage('apexImportJournalTradesJson'),
  },
  retainedInline: {
    role: 'window exposure and availability log at unchanged inline-evaluation timing',
    chars: EXPOSURE.length,
    sha256: sha256(EXPOSURE),
  },
  rejected: {
    wholeManualBlock: 'would advance one window write and one console log into module evaluation',
    backupPanel: 'separate DOM UI, destructive confirmation, timers, and backup transport owner',
  },
  extractionContract: {
    productionFiles: ['index.html', MODULE_REL],
    permanentContract: CONTRACT_REL,
    undoHelper: UNDO_REL,
    indexChars: POST_MANUAL_INDEX.length,
    indexSha256: sha256(POST_MANUAL_INDEX),
    contractsToAdvance,
    loaderAwareConsumer: 'tests/journal-import-json.test.js',
  },
};

console.log('\nJOURNAL_MANUAL_IMPORT_BOUNDARY_BEGIN');
console.log(JSON.stringify(report, null, 2));
console.log('JOURNAL_MANUAL_IMPORT_BOUNDARY_END');
console.log('\n' + pass + ' assertions passed');
console.log('JOURNAL_MANUAL_IMPORT_BOUNDARY_OK');
