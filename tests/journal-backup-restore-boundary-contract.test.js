'use strict';

// Permanent boundary contract for the Journal Backup/Restore classic UI owner.
// It proves byte identity against the merged #404 base, declarations-only
// ownership of the nine terminal Backup/Restore functions, classic load order
// behind Manual Import, unchanged modal markup and inline onclick consumers,
// full create/list/restore/delete runtime behavior (endpoints, methods, request
// body, confirmation-before-transport, timers, sync/render/toast), exact undo,
// and the exact production scope of the relocation.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '08e64712da3ee6af8c92d2f55a1db6220ecd0203';
const BASE_TREE = '1c2b4d8842f7dced871e4c63c259d2bad0c9c034';
const AUDIT_REL = 'tests/temporary-journal-backup-restore-audit.test.js';
const MODULE_REL = 'js/ui/journal-backup-restore.js';
const MODULE_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>';
const CONTRACT_REL = 'tests/journal-backup-restore-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-backup-restore-undo.js';
const MANUAL_IMPORT_TAG = '<script src="./js/services/journal-manual-import.js"></script>';
const MIGRATION_TAG = '<script src="./js/services/journal-migration.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

const BACKUP_MARKER =
  '// ══════════════════════════════════════════════════════════════\n' +
  '// BACKUP / RESTORE PANEL\n';

const OWNER_NAMES = [
  'showBackupPanel',
  'closeBackupPanel',
  'loadBackupList',
  '_bkFmtBytes',
  '_bkFmtDate',
  'renderBackupList',
  'createBackup',
  'restoreBackup',
  'deleteBackup',
];

const EXPECTED_SHAPE = [
  { name: 'showBackupPanel', form: 'function', isAsync: false, chars: 115 },
  { name: 'closeBackupPanel', form: 'function', isAsync: false, chars: 96 },
  { name: 'loadBackupList', form: 'function', isAsync: true, chars: 1348 },
  { name: '_bkFmtBytes', form: 'function', isAsync: false, chars: 217 },
  { name: '_bkFmtDate', form: 'function', isAsync: false, chars: 222 },
  { name: 'renderBackupList', form: 'function', isAsync: false, chars: 2783 },
  { name: 'createBackup', form: 'function', isAsync: true, chars: 1210 },
  { name: 'restoreBackup', form: 'function', isAsync: true, chars: 4024 },
  { name: 'deleteBackup', form: 'function', isAsync: true, chars: 655 },
];

const EXPECTED_DEPENDENCIES = [
  'Array',
  'Date',
  'JSON',
  'Object',
  '_jSyncJournalFromBackend',
  'console',
  'document',
  'encodeURIComponent',
  'journalManager',
  'renderPortfolioJournalView',
  'setTimeout',
  'showToast',
  'ttCall',
  'window',
];

const EXPECTED_EFFECTS = {
  document: 9,
  fetch: 0,
  ttCall: 8,
  sync: 1,
  render: 1,
  toast: 2,
  setTimeout: 4,
  setInterval: 0,
  WebSocket: 0,
  addEventListener: 0,
  localStorage: 0,
  window: 3,
  confirm: 3,
  innerHTML: 4,
};

// Modal markup that must stay in index.html, with its exact inline consumers.
const MARKUP_IDS = ['backupModal', 'backupStatus', 'createBackupBtn', 'backupList'];
const MARKUP_HANDLERS = [
  'onclick="showBackupPanel()"',
  'onclick="if(event.target===this)closeBackupPanel()"',
  'onclick="closeBackupPanel()"',
  'onclick="createBackup()"',
];

const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const TRADE_FORMS_U = require('./lib/journal-trade-forms-undo.js');
const CLOSE_LEGS_U = require('./lib/journal-close-legs-undo.js');
const TT_RECONNECT_U = require('./lib/tt-reconnect-undo.js');
const TRADE_FORMS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-forms.js'), 'utf8');
const CLOSE_LEGS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-close-legs.js'), 'utf8');
const TT_RECONNECT_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/tt-reconnect.js'), 'utf8');
const APEX_POST_AUTH_U = require('./lib/apex-post-auth-init-undo.js');
const APEX_POST_AUTH_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/apex-post-auth-init.js'), 'utf8');
const MCX_CHARTS_U = require('./lib/mcx-charts-undo.js');
const MCX_CHARTS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-charts.js'), 'utf8');
const MCX_MACRO_U = require('./lib/mcx-macro-check-undo.js');
const MCX_MACRO_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-macro-check.js'), 'utf8');
// THE DOCUMENT THIS CONTRACT PINS is index.html as THIS extraction left it.
// Three later owners now sit on top of it: peel them NEWEST-FIRST — Apex
// post-auth init, MCX charts, then MCX macro check — so each undo sees the
// exact document it was cut against. Every helper re-verifies its output by
// length and SHA-256.
// The TT reconnect UI owner is the newest layer of all and sits on top of
// the Apex post-auth owner: peel it FIRST so the Apex undo below still sees
// the exact document it was cut against.
// The Journal Close Legs owner is the newest layer of all and sits on top of
// the TT reconnect owner: peel it FIRST so the TT reconnect undo below still
// sees the exact document it was cut against.
// The Journal trade-forms owner is a later layer than this one: peel it after
// every undo below still sees the exact document it was cut against.
// The Journal trade-detail owner is the newest layer of all: peel it FIRST so
// every undo below still sees the exact document it was cut against. Its helper
// re-verifies its own output by length and SHA-256, so the hop is proved.
const TRADE_DETAIL_U = require('./lib/journal-trade-detail-undo.js');
const TRADE_DETAIL_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-detail.js'), 'utf8');
// The Portfolio data-fetch owner is the newest layer of all: peel it FIRST so
// every undo below still sees the exact document it was cut against. Its helper
// re-verifies its own output by length and SHA-256, so the hop is proved.
const EXPIRY_MANUAL_U = require('./lib/portfolio-expiry-manual-undo.js');
const BACKEND_PORTFOLIOS_U = require('./lib/backend-portfolios-undo.js');
const EXPIRY_MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-expiry-manual.js'), 'utf8');
const BACKEND_PORTFOLIOS_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/backend-portfolios.js'), 'utf8');
const PORTFOLIO_U = require('./lib/portfolio-data-fetch-undo.js');
const PORTFOLIO_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-data-fetch.js'), 'utf8');
// Backend portfolios is now the NEWEST layer of all: peel it first so every
// undo below still sees the exact document it was cut against.
const PRE_EXPIRY_MANUAL = EXPIRY_MANUAL_U.isApplied(LIVE_INDEX)
  ? EXPIRY_MANUAL_U.undoPortfolioExpiryManual(LIVE_INDEX, EXPIRY_MANUAL_MODULE)
  : LIVE_INDEX;
const PRE_BACKEND_PORTFOLIOS = BACKEND_PORTFOLIOS_U.isApplied(PRE_EXPIRY_MANUAL)
  ? BACKEND_PORTFOLIOS_U.undoBackendPortfolios(PRE_EXPIRY_MANUAL, BACKEND_PORTFOLIOS_MODULE)
  : PRE_EXPIRY_MANUAL;
const PRE_PORTFOLIO = PORTFOLIO_U.isApplied(PRE_BACKEND_PORTFOLIOS)
  ? PORTFOLIO_U.undoPortfolioDataFetch(PRE_BACKEND_PORTFOLIOS, PORTFOLIO_MODULE)
  : PRE_BACKEND_PORTFOLIOS;
const PRE_TRADE_DETAIL = TRADE_DETAIL_U.isApplied(PRE_PORTFOLIO)
  ? TRADE_DETAIL_U.undoJournalTradeDetail(PRE_PORTFOLIO, TRADE_DETAIL_MODULE)
  : PRE_PORTFOLIO;
const PRE_TRADE_FORMS = TRADE_FORMS_U.isApplied(PRE_TRADE_DETAIL)
  ? TRADE_FORMS_U.undoJournalTradeForms(PRE_TRADE_DETAIL, TRADE_FORMS_MODULE)
  : PRE_TRADE_DETAIL;
const PRE_CLOSE_LEGS = CLOSE_LEGS_U.isApplied(PRE_TRADE_FORMS)
  ? CLOSE_LEGS_U.undoJournalCloseLegs(PRE_TRADE_FORMS, CLOSE_LEGS_MODULE)
  : PRE_TRADE_FORMS;
const PRE_TT_RECONNECT = TT_RECONNECT_U.isApplied(PRE_CLOSE_LEGS)
  ? TT_RECONNECT_U.undoTtReconnect(PRE_CLOSE_LEGS, TT_RECONNECT_MODULE)
  : PRE_CLOSE_LEGS;
const PRE_APEX_POST_AUTH = APEX_POST_AUTH_U.isApplied(PRE_TT_RECONNECT)
  ? APEX_POST_AUTH_U.undoApexPostAuthInit(PRE_TT_RECONNECT, APEX_POST_AUTH_MODULE)
  : PRE_TT_RECONNECT;
const PRE_MCX_CHARTS = MCX_CHARTS_U.isApplied(PRE_APEX_POST_AUTH)
  ? MCX_CHARTS_U.undoMcxCharts(PRE_APEX_POST_AUTH, MCX_CHARTS_MODULE)
  : PRE_APEX_POST_AUTH;
const INDEX = MCX_MACRO_U.isApplied(PRE_MCX_CHARTS)
  ? MCX_MACRO_U.undoMcxMacroCheck(PRE_MCX_CHARTS, MCX_MACRO_MODULE)
  : PRE_MCX_CHARTS;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const U = require('./lib/journal-backup-restore-undo.js');
const MANUAL_U = require('./lib/journal-manual-import-undo.js');
const MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/journal-manual-import.js'), 'utf8');
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

// Derive the owner slice from the base rather than assuming it: the block runs
// from the Backup/Restore banner to the terminal </script> of the monolith.
const backupAt = BASE.indexOf(BACKUP_MARKER);
const inlineCloseAt = BASE.indexOf('</script>', backupAt);
const CANDIDATE = BASE.slice(backupAt, inlineCloseAt);
const baseDeclarations = scanTopLevelDeclarations(BASE);
const lastDeclaration = baseDeclarations[baseDeclarations.length - 1];

const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    code: part.src === './js/ui/journal-backup-restore.js' ? '\n' : part.code,
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
    sync: /\b_jSyncJournalFromBackend\s*\(/g,
    render: /\brenderPortfolioJournalView\s*\(/g,
    toast: /\bshowToast\s*\(/g,
    setTimeout: /\bsetTimeout\s*\(/g,
    setInterval: /\bsetInterval\s*\(/g,
    WebSocket: /\b(?:new\s+)?WebSocket\b/g,
    addEventListener: /\baddEventListener\s*\(/g,
    localStorage: /\blocalStorage\s*\./g,
    window: /\bwindow\s*\./g,
    confirm: /\b(?:window\.)?confirm\s*\(/g,
    innerHTML: /\.innerHTML\s*=/g,
  };
  return Object.fromEntries(Object.entries(patterns).map(([name, re]) => [
    name,
    (masked.match(re) || []).length,
  ]));
}

function ownerDeclarationCounts(source) {
  const masked = maskLiterals(source);
  const counts = {};
  OWNER_NAMES.forEach((name) => {
    const re = new RegExp('^\\s*(?:async\\s+)?function\\s+' + escapeRegExp(name) + '\\s*\\(', 'gm');
    counts[name] = (masked.match(re) || []).length;
  });
  return counts;
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

// ── Runtime harness: a minimal classic-global environment that records every
// observable effect the owner is allowed to have. ───────────────────────────
function makeHarness(options) {
  const opts = options || {};
  const log = [];
  const els = {};
  function el(id) {
    if (!els[id]) {
      const state = { innerHTML: '', textContent: '', disabled: false };
      const node = {
        id,
        style: new Proxy({}, {
          set(target, key, value) { target[key] = value; log.push({ t: 'style', id, k: key, v: value }); return true; },
          get(target, key) { return target[key]; },
        }),
      };
      ['innerHTML', 'textContent', 'disabled'].forEach((prop) => {
        Object.defineProperty(node, prop, {
          get() { return state[prop]; },
          set(value) { state[prop] = value; log.push({ t: 'write', id, prop, value }); },
          enumerable: true,
        });
      });
      els[id] = node;
    }
    return els[id];
  }
  const timers = [];
  const sandbox = {
    Array, JSON, Object, Date, encodeURIComponent, Promise, Error, String, Number, Boolean, Math, RegExp,
    document: { getElementById(id) { log.push({ t: 'getElementById', id }); return el(id); } },
    console: { log() {}, warn() {}, error() {} },
    window: {
      confirm(message) {
        const seq = log.filter((entry) => entry.t === 'confirm').length + 1;
        log.push({ t: 'confirm', seq, message });
        return opts.confirm ? opts.confirm(seq, message) : true;
      },
    },
    setTimeout(fn, ms) { log.push({ t: 'setTimeout', ms }); timers.push({ fn, ms }); return timers.length; },
    ttCall(endpoint, init) {
      log.push({ t: 'ttCall', endpoint, method: (init && init.method) || 'GET', body: init && init.body });
      return opts.ttCall ? opts.ttCall(endpoint, init) : Promise.resolve({});
    },
    showToast(message, kind) { log.push({ t: 'toast', message, kind }); },
    _jSyncJournalFromBackend() {
      log.push({ t: 'sync' });
      return opts.sync ? opts.sync() : Promise.resolve(true);
    },
    renderPortfolioJournalView() { log.push({ t: 'render' }); },
    journalManager: { getAll() { return opts.trades || []; } },
  };
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  return {
    sandbox, log, el, timers,
    of(kind) { return log.filter((entry) => entry.t === kind); },
    writes(id, prop) {
      return log.filter((entry) => entry.t === 'write' && entry.id === id && entry.prop === prop)
        .map((entry) => entry.value);
    },
    transport() { return log.filter((entry) => entry.t === 'ttCall').map((entry) => entry.method + ' ' + entry.endpoint); },
    delays() { return log.filter((entry) => entry.t === 'setTimeout').map((entry) => entry.ms); },
    runTimers() { timers.splice(0).forEach((entry) => entry.fn()); },
  };
}
async function settle(rounds) {
  for (let i = 0; i < (rounds || 8); i++) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < (rounds || 8); i++) await Promise.resolve();
}
function listResponder(extra) {
  return function (endpoint) {
    if (endpoint === '/journal/backups') return Promise.resolve({ backups: [] });
    if (endpoint === '/journal/trades') return Promise.resolve({ trades: [] });
    return (extra || function () { return Promise.resolve({}); })(endpoint);
  };
}

function boundaryViolations(source, outsideSource) {
  const violations = [];
  if (JSON.stringify(topLevelShape(source)) !== JSON.stringify(EXPECTED_SHAPE)) violations.push('manifest');
  if (JSON.stringify(freeIdentifiers(source)) !== JSON.stringify(EXPECTED_DEPENDENCIES)) violations.push('dependencies');
  if (topLevelResidue(source) !== '') violations.push('top-level-effect');
  const effects = directEffects(source);
  const forbidden = ['fetch', 'setInterval', 'WebSocket', 'addEventListener', 'localStorage'];
  if (forbidden.some((name) => effects[name] !== 0)) violations.push('foreign-direct-effect');
  if (effects.ttCall !== EXPECTED_EFFECTS.ttCall || effects.confirm !== EXPECTED_EFFECTS.confirm ||
      effects.setTimeout !== EXPECTED_EFFECTS.setTimeout || effects.sync !== EXPECTED_EFFECTS.sync ||
      effects.render !== EXPECTED_EFFECTS.render || effects.toast !== EXPECTED_EFFECTS.toast) {
    violations.push('delegation-shape');
  }
  if (source.includes('apexImportJournalTradesJson') || source.includes('jMigrateApexTradesToBackend')) {
    violations.push('owner-overreach');
  }
  const later = ownerDeclarationCounts(outsideSource);
  if (OWNER_NAMES.some((name) => later[name] !== 0)) violations.push('competing-owner');
  if (!loadCandidate(source).ok) violations.push('load-contract');
  return violations;
}

function moduleOrderViolations(html) {
  const violations = [];
  if (countLiteral(html, MODULE_TAG) !== 1) violations.push('tag-count');
  const manualAt = html.indexOf(MANUAL_IMPORT_TAG);
  const ownAt = html.indexOf(MODULE_TAG);
  const inlineAt = html.indexOf(INLINE_OPEN);
  if (!(manualAt >= 0 && manualAt < ownAt && ownAt < inlineAt)) violations.push('load-order');
  if (countLiteral(html, MANUAL_IMPORT_TAG + '\n' + MODULE_TAG + '\n<script>') !== 1) {
    violations.push('adjacency');
  }
  const tags = APP_LOADER.parseScriptTags(html)
    .filter((entry) => entry.src === './js/ui/journal-backup-restore.js');
  if (tags.length !== 1 || tags[0].attrs.trim() !== 'src="./js/ui/journal-backup-restore.js"') {
    violations.push('classic-tag');
  }
  return violations;
}

console.log('JOURNAL BACKUP/RESTORE BOUNDARY CONTRACT');
console.log('base=' + BASE_SHA);

section('1. Pinned post-#404 base and exact extracted artifacts');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_SHA, 'merged #404 base commit resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_TREE, 'merged #404 base tree resolves exactly');
eq(BASE.length, 1944246, 'base index UTF-16 length is pinned');
eq(sha256(BASE), '0bc8f2904a47b84a345ca9c35a18c17208082c7f447fe358d3dd19cd2dba4790',
  'base index SHA-256 is pinned');
// The MCX macro-check owner has since been cut from THIS extraction's output,
// so the document that carries the offsets and hashes below is reached by
// peeling that newest layer first — newest-first, exactly as the cumulative
// bridge does. The helper re-verifies what it hands back by length and SHA-256,
// so this hop is proved rather than assumed, and every assertion below keeps
// meaning exactly what it meant before the macro-check extraction existed.
eq(TT_RECONNECT_U.isApplied(LIVE_INDEX), true, 'the shipped index carries the newest TT reconnect layer');
eq(PRE_TT_RECONNECT.length, TT_RECONNECT_U.BASE_CHARS,
  'peeling the TT reconnect layer reaches the pinned post-#410 index length');
eq(sha256(PRE_TT_RECONNECT), TT_RECONNECT_U.BASE_SHA256,
  'peeling the TT reconnect layer reaches the pinned post-#410 index hash');
eq(APEX_POST_AUTH_U.isApplied(PRE_TT_RECONNECT), true, 'the post-#410 document carries the Apex post-auth layer');
eq(PRE_APEX_POST_AUTH.length, APEX_POST_AUTH_U.BASE_CHARS,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index length');
eq(sha256(PRE_APEX_POST_AUTH), APEX_POST_AUTH_U.BASE_SHA256,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index hash');
eq(MCX_CHARTS_U.isApplied(PRE_APEX_POST_AUTH), true, 'the post-#409 document carries the MCX charts layer');
eq(MCX_MACRO_U.isApplied(PRE_MCX_CHARTS), true, 'the charts-peeled index carries the MCX macro-check layer');
eq(INDEX.length, 1933458, 'extracted index UTF-16 length is exact');
eq(Buffer.byteLength(INDEX, 'utf8'), 1968899, 'extracted index UTF-8 byte length is exact');
eq(sha256(INDEX), '71064f2cb772a0555d5abcf14496e9c87830e1974be1544dcc08ec841047e529',
  'extracted index SHA-256 is the audited prediction');
eq(LIVE_INDEX.length, 1715096, 'current shipped index UTF-16 length is the post-expiry-manual value');
eq(sha256(LIVE_INDEX), '6592efa65f0d71ab12fce84e31ea6acf0f9f1868066107d87b16e2711f9376de',
  'current shipped index SHA-256 is the post-expiry-manual value');
// The post-Apex-post-auth document those two lines used to pin is still
// pinned, one layer down, by the TT reconnect peel assertions above.
// The post-MCX-charts document those two lines used to pin is still pinned,
// one layer down, by the Apex post-auth peel assertions above.
eq(PRE_MCX_CHARTS.length, 1928890, 'peeling MCX charts reaches the post-macro-check index UTF-16 length');
eq(sha256(PRE_MCX_CHARTS), '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96',
  'peeling MCX charts reaches the post-macro-check index SHA-256');
eq(MODULE, CANDIDATE, 'module is byte-identical to the derived terminal declaration slice');

section('2. Exact source boundary and nine-declaration ownership');
eq(countLiteral(BASE, BACKUP_MARKER), 1, 'Backup/Restore marker is unique in the base');
eq(countLiteral(INDEX, BACKUP_MARKER), 0, 'Backup/Restore marker has zero inline residue after extraction');
eq(backupAt, 1933374, 'slice starts at the exact pinned base offset');
eq(inlineCloseAt, 1944220, 'slice ends at the exact pinned base offset, before the terminal </script>');
eq(lineAt(BASE, backupAt), 34041, 'slice starts on line 34041 of the base');
eq(lineAt(BASE, inlineCloseAt), 34267, 'slice ends at the line-34267 boundary of the base');
eq(MODULE.length, 10846, 'module has exact UTF-16 length');
eq(Buffer.byteLength(MODULE, 'utf8'), 11108, 'module has exact UTF-8 byte length');
eq(MODULE.split('\n').length - 1, 226, 'module is exactly 226 LF-terminated lines');
eq(sha256(MODULE), '62f04ee1e720eb098b9d17e4a1fdeff90d1b5ccbbbc12d564ce558ce175fc1c2',
  'module byte identity is pinned');
ok(MODULE.startsWith(BACKUP_MARKER), 'module starts at the Backup/Restore banner');
ok(MODULE.endsWith("  setTimeout(function() { st.style.color = 'var(--tx2)'; }, 5000);\n}\n"),
  'module ends after the complete deleteBackup declaration and its final LF');
eq(lastDeclaration.name, 'deleteBackup', 'deleteBackup is the last top-level declaration of the base monolith');
eq(topLevelShape(MODULE), EXPECTED_SHAPE,
  'module owns exactly nine declarations with pinned order, forms and sizes');
eq(topLevelShape(MODULE).map((entry) => entry.name), OWNER_NAMES,
  'declaration manifest matches the mandated nine-owner order');
eq(topLevelResidue(MODULE), '',
  'module is declarations plus comments/whitespace only: no executable top-level residue');
eq(countLiteral(MODULE, "'use strict'"), 0, 'module adds no strict-mode pragma');
eq(countLiteral(MODULE, 'module.exports'), 0, 'module adds no CommonJS export');
eq((maskLiterals(MODULE).match(/\bwindow\s*\.\s*[A-Za-z0-9_$]+\s*=[^=]/g) || []).length, 0,
  'module adds no explicit window assignment');
eq((maskLiterals(MODULE).match(/\bwindow\s*\.\s*confirm\s*\(/g) || []).length, 3,
  'the only window usage is the three pre-existing confirmation reads');
ok(!/^\s*\(function\s*\(/.test(MODULE) && !/^\s*!function/.test(MODULE),
  'module adds no IIFE or wrapper');
eq(countLiteral(MODULE, 'import '), 0, 'module adds no ES import');

section('3. Dependency, side-effect, and classic-global visibility');
eq(freeIdentifiers(MODULE), EXPECTED_DEPENDENCIES, 'module call-time dependency inventory is exact');
eq(directEffects(MODULE), EXPECTED_EFFECTS,
  'owner keeps its own DOM/timer/confirm surface and delegates transport, sync, render and toast');
const load = loadCandidate(MODULE);
ok(load.ok, 'module evaluates before its call-time dependencies exist: ' + load.error);
OWNER_NAMES.forEach((name) => {
  eq(typeof load.sandbox[name], 'function', 'classic evaluation exposes global ' + name);
});
eq(ownerDeclarationCounts(OUTSIDE_APP),
  Object.fromEntries(OWNER_NAMES.map((name) => [name, 0])),
  'no competing declaration remains elsewhere after the simulated cut');
eq(APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.src === './js/ui/journal-backup-restore.js')
  .map((part) => part.code === MODULE), [true],
  'the loader reconstructs the owner from disk exactly once, byte-for-byte');

section('4. Modal markup and inline consumers stay in index.html');
MARKUP_IDS.forEach((id) => {
  eq(countLiteral(INDEX, "id=\"" + id + "\""), 1, 'markup keeps a single ' + id + ' element');
});
MARKUP_HANDLERS.forEach((handler) => {
  eq(countLiteral(INDEX, handler), 1, 'markup keeps inline handler ' + handler);
});
eq(countLiteral(INDEX, 'restoreBackup('), 0,
  'restore handlers exist only as owner-generated markup, never inline in index.html');
eq(countLiteral(INDEX, 'deleteBackup('), 0,
  'delete handlers exist only as owner-generated markup, never inline in index.html');
MARKUP_IDS.forEach((id) => {
  ok(maskLiterals(MODULE).indexOf(id) < 0 || MODULE.indexOf("'" + id + "'") >= 0,
    'owner reaches ' + id + ' only through a string id lookup');
});

section('5. Exact classic load order and src-only tag');
eq(APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).length, 52,
  'index carried exactly 52 local application scripts when this extraction landed');
eq(APP_LOADER.parseScriptTags(PRE_MCX_CHARTS).filter((entry) => entry.src && /^\.\//.test(entry.src)).length, 53,
  'peeling MCX charts restores the 53 local application scripts of the post-macro-check index');
eq(APP_LOADER.parseScriptTags(LIVE_INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).length, 62,
  'the current shipped index carries exactly 62 local application scripts');
eq(APP_LOADER.parseScriptTags(PRE_TT_RECONNECT).filter((entry) => entry.src && /^\.\//.test(entry.src)).length, 55,
  '…and peeling the TT reconnect layer returns it to the post-#410 55');
eq(APP_LOADER.parseScriptTags(PRE_APEX_POST_AUTH).filter((entry) => entry.src && /^\.\//.test(entry.src)).length, 54,
  '…and peeling the Apex post-auth layer returns it to the historical 54');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'the new tag appears exactly once');
eq(moduleOrderViolations(INDEX), [],
  'classic UI loads after Manual Import and immediately before the inline monolith');
ok(INDEX.indexOf(MIGRATION_TAG) < INDEX.indexOf(MANUAL_IMPORT_TAG),
  'Migration still precedes Manual Import');
const ownTag = APP_LOADER.parseScriptTags(INDEX)
  .filter((entry) => entry.src === './js/ui/journal-backup-restore.js')[0];
eq(ownTag.attrs.trim(), 'src="./js/ui/journal-backup-restore.js"',
  'tag is src-only: no defer, async, type or inline code');
['defer', 'async', 'type='].forEach((attr) => {
  eq(ownTag.attrs.indexOf(attr), -1, 'tag carries no ' + attr + ' attribute');
});

section('6. Byte-exact reconstruction of the extraction');
const indexWithoutCandidate = BASE.slice(0, backupAt) + BASE.slice(inlineCloseAt);
const EXTRACTED_INDEX = indexWithoutCandidate.replace(
  MANUAL_IMPORT_TAG + '\n<script>',
  MANUAL_IMPORT_TAG + '\n' + MODULE_TAG + '\n<script>'
);
eq(EXTRACTED_INDEX, INDEX, 'extraction algorithm reproduces the shipped index byte-for-byte');
const extractedWithoutTag = INDEX.replace(MODULE_TAG + '\n', '');
eq(extractedWithoutTag.slice(0, backupAt) + MODULE + extractedWithoutTag.slice(backupAt), BASE,
  'tag removal plus byte-exact declaration reinsertion reconstructs #404');

section('7. Module evaluation is inert');
const inertHarness = makeHarness({});
eq(inertHarness.log, [], 'loading the module performs no DOM, transport, confirm, timer, render or toast action');
OWNER_NAMES.forEach((name) => {
  eq(typeof inertHarness.sandbox[name], 'function', name + ' is a classic global after evaluation');
});

section('8. Panel open/close and list rendering behavior');
(async () => {
  const openH = makeHarness({
    ttCall: () => Promise.resolve([
      { filename: 'b-1.json', createdAt: '2026-01-02T03:04:05Z', fileSize: 2048, tradeCount: 7 },
    ]),
  });
  openH.sandbox.showBackupPanel();
  eq(openH.el('backupModal').style.display, 'flex', 'showBackupPanel opens the modal');
  await settle();
  eq(openH.transport(), ['GET /journal/backups'], 'showBackupPanel loads the list exactly once');
  eq(openH.el('backupStatus').textContent, '1 backup found', 'bare-array response is accepted and counted');
  ok(openH.el('backupList').innerHTML.includes("restoreBackup('b-1.json')"),
    'renderBackupList generates the inline restore handler');
  ok(openH.el('backupList').innerHTML.includes("deleteBackup('b-1.json')"),
    'renderBackupList generates the inline delete handler');
  openH.sandbox.closeBackupPanel();
  eq(openH.el('backupModal').style.display, 'none', 'closeBackupPanel hides the modal');

  const wrappedH = makeHarness({
    ttCall: () => Promise.resolve({ backups: [
      { name: 'b-2.json', createdAt: null, size: 512, tradeCount: null },
      { filename: 'b-3.json', createdAt: '2026-02-03T04:05:06Z', fileSize: 1048576 },
    ] }),
  });
  await wrappedH.sandbox.loadBackupList();
  await settle();
  eq(wrappedH.el('backupStatus').textContent, '2 backups found',
    'loadBackupList accepts the {backups: [...]} envelope and pluralizes');

  const emptyH = makeHarness({ ttCall: () => Promise.resolve({ backups: [] }) });
  await emptyH.sandbox.loadBackupList();
  await settle();
  eq(emptyH.el('backupStatus').textContent, '0 backups found', 'empty list reports zero backups');
  ok(emptyH.el('backupList').innerHTML.includes('No backups yet'), 'empty list renders the empty state');

  const failH = makeHarness({ ttCall: () => Promise.reject(new Error('boom')) });
  await failH.sandbox.loadBackupList();
  await settle();
  ok(failH.el('backupList').innerHTML.includes('Failed to load backups: boom'),
    'list failure renders the inline failure state');

  const loadingH = makeHarness({ ttCall: () => new Promise(() => {}) });
  loadingH.sandbox.loadBackupList();
  ok(loadingH.el('backupList').innerHTML.includes('Loading backups...'),
    'list render shows the loading state before transport resolves');

  eq(inertHarness.sandbox._bkFmtBytes(null), '—', '_bkFmtBytes renders the null placeholder');
  eq(inertHarness.sandbox._bkFmtBytes(512), '512 B', '_bkFmtBytes renders bytes');
  eq(inertHarness.sandbox._bkFmtBytes(2048), '2.0 KB', '_bkFmtBytes renders kilobytes');
  eq(inertHarness.sandbox._bkFmtBytes(1048576 * 3), '3.0 MB', '_bkFmtBytes renders megabytes');
  eq(inertHarness.sandbox._bkFmtDate(null), '—', '_bkFmtDate renders the null placeholder');
  ok(inertHarness.sandbox._bkFmtDate('2026-02-03T04:05:06Z').length > 0, '_bkFmtDate renders a date string');

  section('9. createBackup transport, list refresh, button restoration and timer');
  const createH = makeHarness({
    ttCall: (endpoint) => {
      if (endpoint === '/journal/backup') return Promise.resolve({ filename: 'new-backup.json' });
      if (endpoint === '/journal/backups') return Promise.resolve([]);
      return Promise.resolve({ trades: [] });
    },
  });
  await createH.sandbox.createBackup();
  await settle();
  eq(createH.transport(), [
    'GET /journal/trades',
    'POST /journal/backup',
    'GET /journal/backups',
  ], 'createBackup issues the diagnostic GET, the POST, then refreshes the list');
  eq(createH.delays(), [6000], 'createBackup arms exactly one 6000 ms status-color timer');
  eq(createH.el('createBackupBtn').disabled, false, 'createBackup re-enables the button');
  eq(createH.el('createBackupBtn').textContent, '+ CREATE BACKUP', 'createBackup restores the button label');

  const createFailH = makeHarness({
    ttCall: (endpoint) => {
      if (endpoint === '/journal/backup') return Promise.reject(new Error('nope'));
      return Promise.resolve({ trades: [] });
    },
  });
  await createFailH.sandbox.createBackup();
  await settle();
  eq(createFailH.el('backupStatus').textContent, 'Error creating backup: nope',
    'createBackup renders the failure status');
  eq(createFailH.transport(), ['GET /journal/trades', 'POST /journal/backup'],
    'createBackup does not refresh the list after a failed POST');
  eq(createFailH.el('createBackupBtn').disabled, false, 'createBackup re-enables the button after failure');
  eq(createFailH.delays(), [6000], 'createBackup arms its timer even after failure');

  section('10. restoreBackup double confirmation, transport and post-restore sync');
  const cancel1 = makeHarness({ confirm: () => false });
  await cancel1.sandbox.restoreBackup('b-1.json');
  await settle();
  eq(cancel1.of('confirm').length, 1, 'first cancellation stops after one confirmation');
  eq(cancel1.transport(), [], 'first cancellation performs no transport at all');
  eq(cancel1.delays(), [], 'first cancellation arms no timer');

  const cancel2 = makeHarness({ confirm: (seq) => seq === 1 });
  await cancel2.sandbox.restoreBackup('b-1.json');
  await settle();
  eq(cancel2.of('confirm').length, 2, 'second cancellation stops after exactly two confirmations');
  eq(cancel2.transport(), [], 'second cancellation performs no transport at all');
  eq(cancel2.delays(), [], 'second cancellation arms no timer');

  const restoreH = makeHarness({
    confirm: () => true,
    ttCall: (endpoint) => {
      if (endpoint === '/journal/restore') return Promise.resolve({ safetyBackup: 'safety-9.json' });
      if (endpoint === '/journal/backups') return Promise.resolve({ backups: [] });
      return Promise.resolve({ trades: [{}, {}] });
    },
  });
  await restoreH.sandbox.restoreBackup('b-1.json');
  await settle();
  eq(restoreH.of('confirm').length, 2, 'restore requires exactly two confirmations');
  const confirmIndex = restoreH.log.findIndex((entry) => entry.t === 'confirm');
  const firstTransportIndex = restoreH.log.findIndex((entry) => entry.t === 'ttCall');
  ok(confirmIndex >= 0 && confirmIndex < firstTransportIndex,
    'both confirmations precede any transport');
  eq(restoreH.transport(), [
    'GET /journal/trades',
    'POST /journal/restore',
    'GET /journal/backups',
    'GET /journal/trades',
  ], 'restore issues diagnostic GET, POST restore, list refresh, then the immediate re-check');
  const restoreBody = restoreH.log
    .filter((entry) => entry.t === 'ttCall' && entry.endpoint === '/journal/restore')[0].body;
  eq(JSON.parse(JSON.stringify(restoreBody)), { filename: 'b-1.json' },
    'restore POST body is exactly {filename: filename}');
  eq(Object.keys(restoreBody), ['filename'], 'restore POST body carries no extra key');
  eq(restoreH.delays(), [2000, 10000],
    'restore arms the 2000 ms delayed re-check and the 10000 ms status-color timer');
  eq(restoreH.of('sync').length, 1, 'restore calls _jSyncJournalFromBackend exactly once');
  eq(restoreH.of('render').length, 1, 'restore calls renderPortfolioJournalView after sync');
  const syncIndex = restoreH.log.findIndex((entry) => entry.t === 'sync');
  const renderIndex = restoreH.log.findIndex((entry) => entry.t === 'render');
  ok(syncIndex >= 0 && syncIndex < renderIndex, 'render follows the backend sync');
  eq(restoreH.of('toast'), [{ t: 'toast', message: 'Restore complete — safety backup: safety-9.json.', kind: 'ok' }],
    'restore success toast reports the safety backup');
  // Pre-existing, deliberately unchanged behavior (follow-up observation #3):
  // the success message is written, then cleared and replaced by the awaited
  // list refresh. The full write sequence is pinned rather than fixed.
  eq(restoreH.writes('backupStatus', 'textContent'), [
    'Restoring from backup...',
    'Restore complete. Safety backup: safety-9.json',
    '',
    '0 backups found',
  ], 'restore writes the safety-backup success status, which the awaited list refresh then overwrites');
  restoreH.runTimers();
  await settle();
  eq(restoreH.transport().filter((entry) => entry === 'GET /journal/trades').length, 3,
    'the delayed 2000 ms timer issues the third /journal/trades re-check');

  const restoreFailH = makeHarness({
    confirm: () => true,
    ttCall: (endpoint) => {
      if (endpoint === '/journal/restore') return Promise.reject(new Error('denied'));
      return Promise.resolve({ trades: [] });
    },
  });
  await restoreFailH.sandbox.restoreBackup('b-1.json');
  await settle();
  eq(restoreFailH.el('backupStatus').textContent, 'Restore failed: denied', 'restore failure status is rendered');
  eq(restoreFailH.of('toast'), [{ t: 'toast', message: 'Restore failed: denied', kind: 'err' }],
    'restore failure raises the error toast');
  eq(restoreFailH.of('sync').length, 0, 'failed restore never syncs the Journal');
  eq(restoreFailH.of('render').length, 0, 'failed restore never re-renders the Journal view');
  eq(restoreFailH.delays(), [10000], 'failed restore still arms only the 10000 ms status-color timer');

  section('11. deleteBackup single confirmation, encoding and timer');
  const deleteCancel = makeHarness({ confirm: () => false });
  await deleteCancel.sandbox.deleteBackup('b-1.json');
  await settle();
  eq(deleteCancel.of('confirm').length, 1, 'delete asks exactly one confirmation');
  eq(deleteCancel.transport(), [], 'delete cancellation performs no transport');
  eq(deleteCancel.delays(), [], 'delete cancellation arms no timer');

  const deleteH = makeHarness({ confirm: () => true, ttCall: listResponder() });
  await deleteH.sandbox.deleteBackup('a b/c.json');
  await settle();
  const deleteConfirmIndex = deleteH.log.findIndex((entry) => entry.t === 'confirm');
  const deleteTransportIndex = deleteH.log.findIndex((entry) => entry.t === 'ttCall');
  ok(deleteConfirmIndex >= 0 && deleteConfirmIndex < deleteTransportIndex,
    'the confirmation precedes any delete transport');
  eq(deleteH.transport(), [
    'DELETE /journal/backups/a%20b%2Fc.json',
    'GET /journal/backups',
  ], 'delete uses DELETE with encodeURIComponent(filename), then refreshes the list');
  eq(deleteH.el('backupStatus').textContent, '0 backups found',
    'delete refreshes the list after success');
  eq(deleteH.delays(), [5000], 'delete arms exactly one 5000 ms status-color timer');

  const deleteFailH = makeHarness({
    confirm: () => true,
    ttCall: (endpoint) => endpoint === '/journal/backups' ? Promise.resolve({ backups: [] })
      : Promise.reject(new Error('locked')),
  });
  await deleteFailH.sandbox.deleteBackup('b-1.json');
  await settle();
  eq(deleteFailH.el('backupStatus').textContent, 'Delete failed: locked', 'delete failure status is rendered');
  eq(deleteFailH.transport(), ['DELETE /journal/backups/b-1.json'],
    'delete does not refresh the list after a failed DELETE');
  eq(deleteFailH.delays(), [5000], 'delete arms its timer even after failure');

  section('12. Extraction fallout inventory');
  const contractsToAdvance = [
    'tests/backend-directional-adapter-boundary-contract.test.js',
    'tests/backend-directional-preview-boundary-contract.test.js',
    'tests/backend-directional-snapshot-boundary-contract.test.js',
    'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
    'tests/journal-backend-write-through-boundary-contract.test.js',
    'tests/journal-core-boundary-contract.test.js',
    'tests/journal-manual-import-boundary-contract.test.js',
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
    ok(source.includes('journal-backup-restore.js') ||
       source.includes('journal-backup-restore\\.js') ||
       source.includes('seven Journal owners'),
       rel + ' recognizes the seventh Journal owner or the current classic-script tail');
  }
  const bridgeSource = fs.readFileSync(path.join(ROOT, 'tests/lib/post-journal-mcx-pr3-undo.js'), 'utf8');
  ok(bridgeSource.includes('undoJournalBackupRestore'),
    'cumulative historical helper still undoes Backup/Restore');
  ok(bridgeSource.includes('undoMcxMacroCheck'),
    'cumulative historical helper also undoes the newer MCX macro-check layer');
  ok(bridgeSource.indexOf('undoMcxMacroCheck') < bridgeSource.indexOf('undoJournalBackupRestore'),
    'cumulative historical helper peels MCX macro check BEFORE Backup/Restore');

  section('13. Byte-exact undo and mutation-sensitive negative controls');
  const rebuilt = U.undoJournalBackupRestore(INDEX, MODULE);
  eq(rebuilt, BASE, 'Backup/Restore undo reconstructs merged #404 byte-for-byte');
  eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
  eq(U.TAG, MODULE_TAG + '\n', 'undo helper pins the tag including its LF');
  eq(U.SLICE_AT, 1933374, 'undo helper pins the exact reinsertion offset');
  eq(U.MODULE_CHARS, 10846, 'undo helper pins the module length');
  eq(U.MODULE_SHA256, sha256(MODULE), 'undo helper pins the module hash');
  ok(U.isApplied(INDEX), 'undo helper detects the applied extraction');
  ok(!U.isApplied(BASE), 'undo helper reports the base as not extracted');
  const preManual = MANUAL_U.undoJournalManualImport(rebuilt, MANUAL_MODULE);
  eq(preManual.length, MANUAL_U.BASE_CHARS, 'cumulative undo reaches the pre-Manual-Import base');
  eq(sha256(preManual), MANUAL_U.BASE_SHA256, 'cumulative undo hash matches the pre-Manual-Import base');
  assert.throws(() => U.undoJournalBackupRestore(INDEX, MODULE + ' '), /MODULE_IDENTITY/);
  pass++;
  assert.throws(() => U.undoJournalBackupRestore(INDEX, MODULE.slice(0, -1)), /MODULE_IDENTITY/);
  pass++;
  assert.throws(() => U.undoJournalBackupRestore(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
    /TAG_IDENTITY/);
  pass++;
  assert.throws(() => U.undoJournalBackupRestore(INDEX.replace(MODULE_TAG + '\n', ''), MODULE), /TAG_IDENTITY/);
  pass++;
  // A same-length edit anywhere in the retained index still breaks reconstruction.
  assert.throws(() => U.undoJournalBackupRestore(INDEX.replace('backupModal', 'backupModaL'), MODULE),
    /BASE_IDENTITY/);
  pass++;
  assert.throws(() => U.undoJournalBackupRestore(null, MODULE), /BAD_INPUT/);
  pass++;

  eq(boundaryViolations(MODULE, OUTSIDE_APP), [],
    'the shipped owner passes every semantic boundary gate');
  ok(boundaryViolations(MODULE.replace(/function _bkFmtBytes[\s\S]*?\n}\n\n/, ''), OUTSIDE_APP).includes('manifest'),
    'missing _bkFmtBytes mutant is rejected');
  ok(boundaryViolations(MODULE.replace('function renderBackupList', 'function renderBackupListV2'), OUTSIDE_APP)
    .includes('manifest'), 'renamed renderBackupList mutant is rejected');
  ok(boundaryViolations(MODULE.replace('async function deleteBackup', 'function deleteBackup'), OUTSIDE_APP)
    .includes('manifest'), 'de-async deleteBackup mutant is rejected');
  ok(boundaryViolations(MODULE + '\nshowBackupPanel();\n', OUTSIDE_APP).includes('top-level-effect'),
    'top-level invocation mutant is rejected');
  ok(boundaryViolations(MODULE + '\ndocument.body;\n', OUTSIDE_APP).includes('top-level-effect'),
    'top-level DOM mutant is rejected');
  ok(boundaryViolations(MODULE.replace('await ttCall(\'/journal/backups\')', 'await fetch(\'/journal/backups\')'), OUTSIDE_APP)
    .includes('foreign-direct-effect'), 'raw fetch mutant is rejected');
  ok(boundaryViolations(MODULE.replace('if (!ok1) return;', ''), OUTSIDE_APP).includes('manifest'),
    'dropped first-confirmation mutant is rejected');
  ok(boundaryViolations(MODULE, OUTSIDE_APP + '\nasync function restoreBackup() {}\n').includes('competing-owner'),
    'competing later restoreBackup owner mutant is rejected');
  ok(boundaryViolations(MODULE + '\n// apexImportJournalTradesJson\n', OUTSIDE_APP).includes('owner-overreach'),
    'Manual Import overreach mutant is rejected');
  ok(sha256(MODULE.replace('}, 5000);', '}, 5001);')) !== sha256(MODULE),
    'same-length timer mutation is rejected by the identity pin');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG + '\n', '')).includes('tag-count'),
    'missing module tag mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)).includes('tag-count'),
    'duplicate module tag mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(
    MANUAL_IMPORT_TAG + '\n' + MODULE_TAG,
    MODULE_TAG + '\n' + MANUAL_IMPORT_TAG
  )).includes('adjacency'), 'Backup/Restore-before-Manual-Import mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' defer>')))
    .includes('classic-tag'), 'deferred module tag mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' async>')))
    .includes('classic-tag'), 'async module tag mutant is rejected');

  section('14. Exact production scope');
  const changed = changedPaths();
  const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
  eq(changedProduction, ['index.html', 'js/portfolio/backend-portfolios.js', 'js/portfolio/portfolio-data-fetch.js', 'js/portfolio/portfolio-expiry-manual.js', 'js/services/apex-post-auth-init.js', MODULE_REL, 'js/ui/journal-close-legs.js', 'js/ui/journal-trade-detail.js', 'js/ui/journal-trade-forms.js', 'js/ui/mcx-charts.js', 'js/ui/mcx-macro-check.js', 'js/ui/tt-reconnect.js'],
    'production footprint is exactly index.html plus the Journal Backup/Restore owner and the later MCX macro-check, MCX charts, Apex post-auth, TT reconnect and Journal Close Legs owners');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'permanent Backup/Restore contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'byte-exact Backup/Restore undo helper is part of the change');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'the temporary Backup/Restore audit is absent after extraction');
  ok(!changed.some((rel) => rel.startsWith('.github/')),
    'no workflow or bootstrap script changed');
  ok(!changed.some((rel) => rel.endsWith('.md') && rel !== 'CLAUDE.md'),
    'no documentation changed, except the repository working notes');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');

  const report = {
    base: {
      commit: BASE_SHA,
      tree: BASE_TREE,
      indexChars: BASE.length,
      indexSha256: sha256(BASE),
    },
    selected: {
      module: MODULE_REL,
      strategy: 'declarations-only relocation of the terminal Backup/Restore owner',
      start: backupAt,
      end: inlineCloseAt,
      startLine: lineAt(BASE, backupAt),
      endLine: lineAt(BASE, inlineCloseAt),
      chars: MODULE.length,
      utf8Bytes: Buffer.byteLength(MODULE, 'utf8'),
      lines: MODULE.split('\n').length - 1,
      sha256: sha256(MODULE),
      owners: OWNER_NAMES,
      dependencies: EXPECTED_DEPENDENCIES,
      effects: EXPECTED_EFFECTS,
    },
    retainedInline: {
      role: 'Backup/Restore modal markup and its inline onclick handlers',
      ids: MARKUP_IDS,
      handlers: MARKUP_HANDLERS,
    },
    extractionContract: {
      productionFiles: ['index.html', MODULE_REL],
      permanentContract: CONTRACT_REL,
      undoHelper: UNDO_REL,
      indexChars: INDEX.length,
      indexUtf8Bytes: Buffer.byteLength(INDEX, 'utf8'),
      indexSha256: sha256(INDEX),
      localScriptCount: 52,
      currentLocalScriptCount: 53,
      contractsToAdvance,
    },
    followUpObservations: [
      'backend filenames are inserted into innerHTML without HTML escaping',
      'generated inline-handler escaping only handles apostrophes',
      'successful status messages may be overwritten by the awaited list refresh',
    ],
  };

  console.log('\nJOURNAL_BACKUP_RESTORE_BOUNDARY_BEGIN');
  console.log(JSON.stringify(report, null, 2));
  console.log('JOURNAL_BACKUP_RESTORE_BOUNDARY_END');
  console.log('\n' + pass + ' assertions passed');
  console.log('JOURNAL_BACKUP_RESTORE_BOUNDARY_OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
