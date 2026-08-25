'use strict';

// Read-only audit for the next extraction after Journal Backend Write-through
// (#400). This file deliberately changes no production source. It selects the
// login-triggered Journal migration owner, proves its classic-script contract
// and runtime policy, inventories extraction fallout, and rejects the adjacent
// console-only import and Backup/Restore UI as separate owners.
//
// The extraction PR must replace this temporary audit with a permanent boundary
// contract plus a byte-exact undo helper.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '7ac9fdfa020203cd379070a45d271cfd9885cf06';
const BASE_TREE = '3b95424432aaea2b14e8ad70e82cdfa9a05cc4b3';
const AUDIT_REL = 'tests/temporary-journal-migration-audit.test.js';
const FUTURE_MODULE_REL = 'js/services/journal-migration.js';
const FUTURE_TAG = '<script src="./js/services/journal-migration.js"></script>';

const CORE_TAG = '<script src="./js/services/journal-core.js"></script>';
const UI_TAG = '<script src="./js/ui/journal-ui.js"></script>';
const REMOTE_TAG = '<script src="./js/services/journal-remote-persistence.js"></script>';
const WRITE_TAG = '<script src="./js/services/journal-backend-write-through.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

const MIGRATION_MARKER =
  '// ── One-time migration: apex_trades → backend ─────────────────────\n';
const MANUAL_IMPORT_MARKER =
  '// ── Manual, console-only cross-host Journal trade import ──────────────────────\n';
const BACKUP_MARKER =
  '// ══════════════════════════════════════════════════════════════\n' +
  '// BACKUP / RESTORE PANEL\n';

const EXPECTED_SHAPE = [
  { name: '_jMigrationDone', form: 'var', isAsync: false },
  { name: 'jMigrateApexTradesToBackend', form: 'function', isAsync: true },
];
const EXPECTED_DEPENDENCIES = [
  'Array',
  'JSON',
  'Object',
  'S',
  'Set',
  'String',
  '_jRecordBackendSnapshot',
  '_normalizeBackendTradePortfolioId',
  '_tradeForBackend',
  '_ttCallWithRetry',
  'console',
  'isApexPreviewOrLocalEnv',
  'jSaveRemote',
  'journalManager',
  'ttCall',
];

const INDEX = APP_LOADER.loadIndexHtml();
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

const migrationAt = INDEX.indexOf(MIGRATION_MARKER);
const manualImportAt = INDEX.indexOf(MANUAL_IMPORT_MARKER);
const backupAt = INDEX.indexOf(BACKUP_MARKER);
const inlineCloseAt = INDEX.indexOf('</script>', backupAt);
const candidateEnd = manualImportAt - 1; // Keep one separator LF with manual import.
const manualEnd = backupAt - 1;
const CANDIDATE = INDEX.slice(migrationAt, candidateEnd);
const MANUAL_ONLY = INDEX.slice(manualImportAt, manualEnd);
const BACKUP_ONLY = INDEX.slice(backupAt, inlineCloseAt);

const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    code: part.kind === 'inline' ? part.code.replace(CANDIDATE, '\n') : part.code,
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
function jsonEq(actual, expected, message) {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected), message);
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
function topLevelShape(source) {
  return scanTopLevelDeclarations(source).map((entry) => ({
    name: entry.name,
    form: entry.form,
    isAsync: entry.isAsync,
  }));
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
    retryTransport: /\b_ttCallWithRetry\s*\(/g,
    jSaveRemote: /\bjSaveRemote\s*\(/g,
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
    state: (masked.match(/^\s*var\s+_jMigrationDone\b/gm) || []).length,
    migrate: (masked.match(/^\s*async\s+function\s+jMigrateApexTradesToBackend\s*\(/gm) || []).length,
  };
}

function loadCandidate(source) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: FUTURE_MODULE_REL });
    return { ok: true, error: null, sandbox };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error), sandbox };
  }
}

function boundaryViolations(source, outsideSource) {
  const violations = [];
  if (JSON.stringify(topLevelShape(source)) !== JSON.stringify(EXPECTED_SHAPE)) violations.push('manifest');
  if (JSON.stringify(freeIdentifiers(source)) !== JSON.stringify(EXPECTED_DEPENDENCIES)) violations.push('dependencies');
  const effects = directEffects(source);
  const forbidden = [
    'document', 'fetch', 'setTimeout', 'setInterval', 'WebSocket',
    'addEventListener', 'localStorage', 'window', 'confirm',
  ];
  if (forbidden.some((name) => effects[name] !== 0)) violations.push('foreign-direct-effect');
  if (effects.ttCall !== 1 || effects.retryTransport !== 1 || effects.jSaveRemote !== 1) {
    violations.push('delegation-shape');
  }
  if (countLiteral(maskLiterals(source), 'isApexPreviewOrLocalEnv()') !== 1) violations.push('preview-gate');
  if (!loadCandidate(source).ok) violations.push('load-contract');
  if (source.includes(MANUAL_IMPORT_MARKER) || source.includes(BACKUP_MARKER)) violations.push('owner-overreach');
  const later = ownerDeclarationCounts(outsideSource);
  if (later.state !== 0 || later.migrate !== 0) violations.push('competing-owner');
  return violations;
}

function futureOrderViolations(html) {
  const violations = [];
  if (countLiteral(html, FUTURE_TAG) !== 1) violations.push('tag-count');
  const coreAt = html.indexOf(CORE_TAG);
  const uiAt = html.indexOf(UI_TAG);
  const remoteAt = html.indexOf(REMOTE_TAG);
  const writeAt = html.indexOf(WRITE_TAG);
  const futureAt = html.indexOf(FUTURE_TAG);
  const inlineAt = html.indexOf(INLINE_OPEN);
  if (!(coreAt >= 0 && coreAt < uiAt && uiAt < remoteAt && remoteAt < writeAt &&
        writeAt < futureAt && futureAt < inlineAt)) {
    violations.push('load-order');
  }
  const tags = APP_LOADER.parseScriptTags(html)
    .filter((entry) => entry.src === './js/services/journal-migration.js');
  if (tags.length !== 1 || tags[0].attrs.trim() !== 'src="./js/services/journal-migration.js"') {
    violations.push('classic-tag');
  }
  return violations;
}

function makeMigrationContext(options) {
  const opts = options || {};
  let trades = (opts.localTrades || []).map((trade) => Object.assign({}, trade));
  const stats = {
    gateCalls: 0,
    fallbackCalls: 0,
    retryCalls: 0,
    getAllCalls: 0,
    merged: [],
    snapshots: [],
    saves: [],
    logs: [],
  };
  const outcomes = (opts.saveOutcomes || []).slice();
  const transport = async function(pathname) {
    if (opts.useRetry) stats.retryCalls++; else stats.fallbackCalls++;
    if (opts.backendError) throw opts.backendError;
    ok(pathname === '/journal/trades', 'runtime transport requests only /journal/trades');
    return opts.backendResponse !== undefined
      ? opts.backendResponse
      : { trades: (opts.backendTrades || []).map((trade) => Object.assign({}, trade)) };
  };
  const sandbox = {
    console: {
      log(...args) { stats.logs.push(args.map(String).join(' ')); },
      warn(...args) { stats.logs.push(args.map(String).join(' ')); },
      error(...args) { stats.logs.push(args.map(String).join(' ')); },
    },
    JSON,
    Array,
    Object,
    String,
    Set,
    Promise,
    S: { backendKey: opts.backendKey === undefined ? 'key-1' : opts.backendKey },
    isApexPreviewOrLocalEnv() {
      stats.gateCalls++;
      return !!opts.preview;
    },
    ttCall: transport,
    _normalizeBackendTradePortfolioId(trade) {
      const normalized = Object.assign({}, trade);
      if (normalized.portfolioId == null && normalized.portfolio_id != null) {
        normalized.portfolioId = normalized.portfolio_id;
      }
      return normalized;
    },
    _jRecordBackendSnapshot(normalized) {
      stats.snapshots.push(JSON.parse(JSON.stringify(normalized)));
    },
    _tradeForBackend(trade) {
      const payload = Object.assign({}, trade, { id: String(trade.id) });
      delete payload.live;
      return payload;
    },
    async jSaveRemote(trade) {
      stats.saves.push(JSON.parse(JSON.stringify(trade)));
      return outcomes.length ? outcomes.shift() : true;
    },
    journalManager: {
      getAll() {
        stats.getAllCalls++;
        return trades.slice();
      },
      loadFromBackend(normalized) {
        const incoming = JSON.parse(JSON.stringify(normalized));
        stats.merged.push(incoming);
        let changed = 0;
        incoming.forEach((trade) => {
          const index = trades.findIndex((local) => String(local.id) === String(trade.id));
          if (index >= 0) trades[index] = trade;
          else { trades.push(trade); changed++; }
        });
        return changed;
      },
    },
  };
  if (opts.useRetry) sandbox._ttCallWithRetry = transport;
  vm.createContext(sandbox);
  vm.runInContext(CANDIDATE, sandbox, { filename: FUTURE_MODULE_REL });
  sandbox.__stats = stats;
  sandbox.__trades = () => trades.slice();
  return sandbox;
}

console.log('JOURNAL MIGRATION EXTRACTION AUDIT');
console.log('base=' + BASE_SHA);

section('1. Pinned merged base and read-only production scope');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_SHA, 'merged #400 base resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_TREE, 'merged #400 tree resolves exactly');
eq(INDEX, BASE, 'audit leaves production index.html byte-identical to #400');
eq(INDEX.length, 1956363, 'post-#400 index UTF-16 length is pinned');
eq(sha256(INDEX), 'f6f7cc5518e8744bca359c47ec24e40f1c206b988e10ab1a4ae2c824f8b607bc',
  'post-#400 index SHA-256 is pinned');
eq(changedPaths(), [AUDIT_REL], 'audit changes exactly one temporary test file');
ok(!fs.existsSync(path.join(ROOT, FUTURE_MODULE_REL)), 'audit creates no runtime module');
eq(countLiteral(INDEX, FUTURE_TAG), 0, 'audit adds no production script tag');

section('2. Exact selected migration boundary');
for (const marker of [MIGRATION_MARKER, MANUAL_IMPORT_MARKER, BACKUP_MARKER]) {
  eq(countLiteral(INDEX, marker), 1, 'boundary marker is unique: ' + marker.split('\n')[0]);
}
ok(migrationAt < manualImportAt && manualImportAt < backupAt && backupAt < inlineCloseAt,
  'physical order is migration -> manual import -> Backup/Restore UI');
eq(migrationAt, 1932625, 'candidate starts at exact post-#400 offset');
eq(candidateEnd, 1937086, 'candidate ends at exact post-#400 offset');
eq(lineAt(INDEX, migrationAt), 34028, 'candidate starts on line 34028');
eq(lineAt(INDEX, candidateEnd), 34110, 'candidate ends on line 34110');
eq(CANDIDATE.length, 4461, 'candidate has exact UTF-16 length');
eq(sha256(CANDIDATE), '65f3b31825f3cf8aa9e68755d4d517f8ccd4b58cc3e9d90d838a5b6b33b95ecb',
  'candidate byte identity is pinned');
ok(CANDIDATE.endsWith('}\n'), 'candidate ends with the complete async migration and one LF');
eq(INDEX.slice(candidateEnd, manualImportAt + MANUAL_IMPORT_MARKER.length), '\n' + MANUAL_IMPORT_MARKER,
  'one separator LF and the manual-import marker stay inline');
eq(topLevelShape(CANDIDATE), EXPECTED_SHAPE,
  'candidate owns exactly one session latch and one async migration function');
eq(freeIdentifiers(CANDIDATE), EXPECTED_DEPENDENCIES,
  'candidate call-time dependency inventory is exact');
eq(directEffects(CANDIDATE), {
  document: 0,
  fetch: 0,
  ttCall: 1,
  retryTransport: 1,
  jSaveRemote: 1,
  setTimeout: 0,
  setInterval: 0,
  WebSocket: 0,
  addEventListener: 0,
  localStorage: 0,
  window: 0,
  confirm: 0,
}, 'migration delegates transport/save and owns no DOM, timer, storage, listener, or raw-fetch primitive');
eq(countLiteral(maskLiterals(CANDIDATE), 'isApexPreviewOrLocalEnv()'), 1,
  'auto-upload owns exactly one broad preview/local safety gate');
eq(ownerDeclarationCounts(OUTSIDE_APP), { state: 0, migrate: 0 },
  'no competing migration owner remains elsewhere in application source');

section('3. Inert classic evaluation and deterministic future slot');
const load = loadCandidate(CANDIDATE);
ok(load.ok, 'candidate evaluates with zero call-time dependencies present: ' + load.error);
eq(load.sandbox._jMigrationDone, false, 'classic evaluation initializes only the false session latch');
eq(typeof load.sandbox.jMigrateApexTradesToBackend, 'function', 'classic evaluation exposes the async owner');

eq(countLiteral(INDEX, WRITE_TAG + '\n<script>'), 1,
  'Write-through currently loads immediately before the residual inline script');
const indexWithoutCandidate = INDEX.slice(0, migrationAt) + INDEX.slice(candidateEnd);
const FUTURE_INDEX = indexWithoutCandidate.replace(
  WRITE_TAG + '\n<script>',
  WRITE_TAG + '\n' + FUTURE_TAG + '\n<script>'
);
eq(FUTURE_INDEX.length, 1951961, 'future index UTF-16 length is deterministic');
eq(sha256(FUTURE_INDEX), 'fe514b8183fc8fbde428062ad050bf7f78577dd32a887025ed9caf1fddb566c4',
  'future post-extraction index SHA-256 is deterministic');
eq(futureOrderViolations(FUTURE_INDEX), [],
  'future order is Core -> UI -> Remote -> Write-through -> Migration -> inline, with one classic tag');
const futureWithoutTag = FUTURE_INDEX.replace(
  WRITE_TAG + '\n' + FUTURE_TAG + '\n<script>',
  WRITE_TAG + '\n<script>'
);
eq(futureWithoutTag.slice(0, migrationAt) + CANDIDATE + futureWithoutTag.slice(migrationAt), INDEX,
  'future tag removal plus byte-exact slice insertion reconstructs #400');

section('4. External ownership and consumers');
eq(externalUsage('_jMigrationDone'), [], 'session latch has no outside consumer');
eq(externalUsage('jMigrateApexTradesToBackend'), [{ where: 'index.html:inline', refs: 2 }],
  'migration function has one guarded outside call (typeof guard plus invocation) in post-auth initialization');
const postAuthSource = APP_LOADER.extractFunctionSource('_apexPostAuthInit');
eq(identifierCountMasked(maskLiterals(postAuthSource), 'jMigrateApexTradesToBackend'), 2,
  'post-auth initialization owns exactly one typeof-guarded migration invocation');

section('5. Real migration behavior through mocks');
async function verifyBehavior() {
  const inert = makeMigrationContext({ localTrades: [{ id: 'L0' }] });
  eq(inert.__stats.gateCalls, 0, 'module evaluation does not evaluate the environment gate');
  eq(inert.__stats.fallbackCalls + inert.__stats.retryCalls, 0, 'module evaluation performs no backend read');
  eq(inert.__stats.saves.length, 0, 'module evaluation performs no backend write');

  const preview = makeMigrationContext({ preview: true, localTrades: [{ id: 'P1' }] });
  await preview.jMigrateApexTradesToBackend();
  eq(preview.__stats.gateCalls, 1, 'preview path evaluates the broad safety gate once');
  eq(preview.__stats.fallbackCalls + preview.__stats.retryCalls, 0, 'preview path performs no backend read');
  eq(preview.__stats.saves.length, 0, 'preview path never auto-uploads local trades');
  eq(preview._jMigrationDone, false, 'preview skip leaves the session latch retryable');

  const noKey = makeMigrationContext({ backendKey: '', localTrades: [{ id: 'K1' }] });
  await noKey.jMigrateApexTradesToBackend();
  eq(noKey.__stats.fallbackCalls + noKey.__stats.retryCalls, 0, 'missing-key path performs no backend read');
  eq(noKey.__stats.saves.length, 0, 'missing-key path performs no backend write');
  eq(noKey._jMigrationDone, false, 'missing-key skip leaves the session latch retryable');

  const merge = makeMigrationContext({
    useRetry: true,
    backendTrades: [{ id: 'B1', portfolio_id: 7, ticker: 'SPY' }],
    localTrades: [],
  });
  await merge.jMigrateApexTradesToBackend();
  eq(merge.__stats.retryCalls, 1, 'migration prefers the retrying backend transport when available');
  eq(merge.__stats.fallbackCalls, 0, 'retry transport suppresses the fallback call');
  jsonEq(merge.__stats.merged, [[{ id: 'B1', portfolio_id: 7, ticker: 'SPY', portfolioId: 7 }]],
    'backend trades observed during migration are normalized and merged locally');
  jsonEq(merge.__stats.snapshots, [[{ id: 'B1', portfolio_id: 7, ticker: 'SPY', portfolioId: 7 }]],
    'backend trades observed during migration become the last-known-good snapshot');
  eq(merge.__stats.saves.length, 0, 'an observed backend id is never POSTed again');
  eq(merge._jMigrationDone, true, 'successful merge latches migration complete');

  const writes = makeMigrationContext({
    backendTrades: [{ id: 'B1', ticker: 'SPY' }],
    localTrades: [
      { id: 'B1', ticker: 'SPY' },
      { id: 22, ticker: 'QQQ', live: { delta: 0.2 } },
      { id: 'L3', ticker: 'IWM' },
    ],
    saveOutcomes: [true, { ok: false, source: 'local' }],
  });
  await writes.jMigrateApexTradesToBackend();
  eq(writes.__stats.fallbackCalls, 1, 'migration falls back to ttCall when retry transport is absent');
  eq(writes.__stats.saves.map((trade) => trade.id), ['22', 'L3'],
    'migration POSTs only ids missing from the backend, in local order');
  ok(!Object.prototype.hasOwnProperty.call(writes.__stats.saves[0], 'live'),
    'each POST passes through the write-through payload normalizer');
  ok(writes.__stats.logs.some((line) => line.includes('migrated: 1, failed: 1')),
    'bare-boolean success and structured failure share one exact outcome counter');
  eq(writes._jMigrationDone, true, 'completed writes latch the session even when an individual save fails');
  const callsBeforeRepeat = writes.__stats.fallbackCalls + writes.__stats.saves.length;
  await writes.jMigrateApexTradesToBackend();
  eq(writes.__stats.fallbackCalls + writes.__stats.saves.length, callsBeforeRepeat,
    'session latch makes a second migration call fully idempotent');

  const structured = makeMigrationContext({
    localTrades: [{ id: 'S1' }, { id: 'S2' }],
    backendTrades: [],
    saveOutcomes: [true, { ok: true, source: 'backend' }],
  });
  await structured.jMigrateApexTradesToBackend();
  ok(structured.__stats.logs.some((line) => line.includes('migrated: 2, failed: 0')),
    'bare-boolean and structured success outcomes are both accepted');

  const unauthorized = makeMigrationContext({
    useRetry: true,
    backendError: new Error('Unauthorized (HTTP 401): api-key invalid'),
    localTrades: [{ id: 'R1' }],
  });
  await unauthorized.jMigrateApexTradesToBackend();
  eq(unauthorized.__stats.retryCalls, 1, 'auth-not-ready path attempts exactly one delegated read');
  eq(unauthorized.__stats.getAllCalls, 0, '401 returns before reading local trades');
  eq(unauthorized.__stats.saves.length, 0, '401 never uploads local trades');
  eq(unauthorized._jMigrationDone, false, '401 leaves the latch false for the next login');

  const transient = makeMigrationContext({
    backendError: new Error('Failed to fetch'),
    localTrades: [{ id: 'T1' }],
  });
  await transient.jMigrateApexTradesToBackend();
  eq(transient.__stats.saves.map((trade) => trade.id), ['T1'],
    'non-auth read failure preserves the legacy best-effort local upload policy');
  eq(transient._jMigrationDone, true, 'best-effort completion latches after a non-auth read failure');
}

section('6. Rejected adjacent owners and extraction fallout');
eq(MANUAL_ONLY.length, 8403, 'manual-import adjacent slice length is pinned');
eq(sha256(MANUAL_ONLY), 'a8eef486e6ac6e3bf2b6ff5e97ccff2a6ef9a0d83e19aee9b8eeff3074f7943b',
  'manual-import adjacent byte identity is pinned');
eq(topLevelShape(MANUAL_ONLY), [
  { name: '_journalImportPayload', form: 'function', isAsync: false },
  { name: '_journalRepairPortfolioIdRemote', form: 'function', isAsync: true },
  { name: 'apexImportJournalTradesJson', form: 'function', isAsync: true },
], 'manual import owns three separate repair/console functions');
eq(directEffects(MANUAL_ONLY).window, 1, 'manual import owns the explicit window console exposure');
eq(directEffects(MANUAL_ONLY).ttCall, 3, 'manual import owns its own GET/PUT verification transport');

eq(BACKUP_ONLY.length, 10846, 'Backup/Restore adjacent slice length is pinned');
eq(sha256(BACKUP_ONLY), '62f04ee1e720eb098b9d17e4a1fdeff90d1b5ccbbbc12d564ce558ce175fc1c2',
  'Backup/Restore adjacent byte identity is pinned');
eq(topLevelShape(BACKUP_ONLY).map((entry) => entry.name), [
  'showBackupPanel', 'closeBackupPanel', 'loadBackupList', '_bkFmtBytes', '_bkFmtDate',
  'renderBackupList', 'createBackup', 'restoreBackup', 'deleteBackup',
], 'Backup/Restore owns nine UI/transport functions');
eq(directEffects(BACKUP_ONLY).document, 9, 'Backup/Restore owns its DOM mutations');
eq(directEffects(BACKUP_ONLY).setTimeout, 4, 'Backup/Restore owns its delayed status/recheck timers');
eq(directEffects(BACKUP_ONLY).confirm, 3, 'Backup/Restore owns its destructive-action confirmations');
eq(boundaryViolations(CANDIDATE, OUTSIDE_APP), [],
  'selected migration passes every semantic ownership gate');

const loaderAwareConsumers = [
  'tests/journal-backend-save-confirm.test.js',
  'tests/journal-transient-sync-resilience.test.js',
  'tests/journal-backend-sync-preview.test.js',
  'tests/post-auth-reconnect-init.test.js',
];
for (const rel of loaderAwareConsumers) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('load-app-source'), rel + ' already follows external modules through the app loader');
  ok(source.includes('jMigrateApexTradesToBackend'), rel + ' explicitly exercises the migration contract');
}
const contractsToAdvance = [
  'tests/backend-directional-preview-boundary-contract.test.js',
  'tests/backend-directional-snapshot-boundary-contract.test.js',
  'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
  'tests/journal-backend-write-through-boundary-contract.test.js',
  'tests/journal-core-boundary-contract.test.js',
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
];
for (const rel of contractsToAdvance) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('journal-backend-write-through.js'), rel + ' pins the current classic-script tail');
}

section('7. Mutation-sensitive negative controls');
ok(boundaryViolations(CANDIDATE.replace('var _jMigrationDone = false;\n', ''), OUTSIDE_APP).includes('manifest'),
  'missing session-latch mutant is rejected');
ok(boundaryViolations(
  CANDIDATE.replace('jMigrateApexTradesToBackend', 'jMigrateApexTradesToBackendV2'), OUTSIDE_APP
).includes('manifest'), 'renamed migration owner mutant is rejected');
ok(boundaryViolations(CANDIDATE + '\nfunction foreignMigrationOwner() {}\n', OUTSIDE_APP).includes('manifest'),
  'foreign top-level owner mutant is rejected');
ok(boundaryViolations(CANDIDATE + '\ndocument.body;\n', OUTSIDE_APP).includes('foreign-direct-effect'),
  'foreign DOM effect mutant is rejected');
ok(boundaryViolations(CANDIDATE + '\nttCall("/load-time");\n', OUTSIDE_APP).includes('load-contract'),
  'top-level backend invocation mutant is rejected by inert classic evaluation');
ok(boundaryViolations(CANDIDATE + '\n' + MANUAL_ONLY, OUTSIDE_APP).includes('owner-overreach'),
  'manual-import overreach mutant is rejected');
ok(boundaryViolations(
  CANDIDATE,
  OUTSIDE_APP + '\nasync function jMigrateApexTradesToBackend() {}\n'
).includes('competing-owner'), 'competing later migration owner mutant is rejected');
ok(sha256(CANDIDATE.replace('_jMigrationDone = true;', '_jMigrationDone = null;')) !== sha256(CANDIDATE),
  'same-length latch mutation is rejected by the identity pin');

ok(futureOrderViolations(FUTURE_INDEX.replace(FUTURE_TAG + '\n', '')).includes('tag-count'),
  'missing future tag mutant is rejected');
ok(futureOrderViolations(FUTURE_INDEX.replace(FUTURE_TAG, FUTURE_TAG + '\n' + FUTURE_TAG)).includes('tag-count'),
  'duplicate future tag mutant is rejected');
ok(futureOrderViolations(FUTURE_INDEX.replace(
  WRITE_TAG + '\n' + FUTURE_TAG,
  FUTURE_TAG + '\n' + WRITE_TAG
)).includes('load-order'), 'future migration before Write-through mutant is rejected');
ok(futureOrderViolations(FUTURE_INDEX.replace(FUTURE_TAG, FUTURE_TAG.replace('>', ' defer>')))
  .includes('classic-tag'), 'deferred future tag mutant is rejected');
eq(identifierCountMasked(maskLiterals(
  '// jMigrateApexTradesToBackend\n"jMigrateApexTradesToBackend"; jMigrateApexTradesToBackendCopy;'
), 'jMigrateApexTradesToBackend'), 0,
  'consumer inventory ignores comments, strings, and suffix collisions');

const report = {
  base: {
    commit: BASE_SHA,
    tree: BASE_TREE,
    indexChars: INDEX.length,
    indexSha256: sha256(INDEX),
  },
  selected: {
    futureModule: FUTURE_MODULE_REL,
    start: migrationAt,
    end: candidateEnd,
    startLine: lineAt(INDEX, migrationAt),
    endLine: lineAt(INDEX, candidateEnd),
    chars: CANDIDATE.length,
    sha256: sha256(CANDIDATE),
    topLevelOwners: EXPECTED_SHAPE.map((entry) => entry.name),
    externalConsumers: externalUsage('jMigrateApexTradesToBackend'),
  },
  rejected: {
    manualImport: 'explicit console/window cross-host repair policy',
    backupPanel: 'DOM UI, destructive confirmation, timers, and backup transport owner',
  },
  extractionContract: {
    productionFiles: ['index.html', FUTURE_MODULE_REL],
    permanentTest: 'tests/journal-migration-boundary-contract.test.js',
    undoHelper: 'tests/lib/journal-migration-undo.js',
    futureIndexChars: FUTURE_INDEX.length,
    futureIndexSha256: sha256(FUTURE_INDEX),
    contractsToAdvance,
    loaderAwareConsumers,
  },
};

verifyBehavior().then(() => {
  console.log('\nJOURNAL_MIGRATION_AUDIT_BEGIN');
  console.log(JSON.stringify(report, null, 2));
  console.log('JOURNAL_MIGRATION_AUDIT_END');
  console.log('\n' + pass + ' assertions passed');
  console.log('JOURNAL_MIGRATION_AUDIT_OK');
}).catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
