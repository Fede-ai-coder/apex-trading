'use strict';

// Permanent boundary contract for the terminal MCX macro-check UI owner.
//
// It replaces the temporary pre-implementation audit and proves, permanently:
// byte identity against the merged #405 base; a declarations-only relocation of
// exactly three owners; zero inline residue and no competing declaration
// anywhere in the application; the exact free-dependency inventory and measured
// effect surface; the exact JavaScript and inline-markup consumers; a single
// synchronous src-only classic tag loaded immediately after Backup/Restore and
// immediately before the inline monolith; load-time inertness in an empty VM; a
// byte-exact forward transform and reverse reconstruction of #405; the full
// runtime behavior of the legacy routing stub, the macro button, prompt
// construction, the success transcript, risk classification and colors, and the
// failure path; the MCX and Journal owners that deliberately stay inline; a set
// of mutation-sensitive negative controls; and the exact production scope of
// the relocation.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '90118f5c36f0675e8d6aface275ece4f09cccd31';
const BASE_TREE = '77c3827c6295cf8bd0846b89684bd96329f45b30';
const BASE_SUBJECT = 'refactor(journal): extract backup restore UI (#405)';
const AUDIT_REL = 'tests/temporary-mcx-macro-check-audit.test.js';
const MODULE_REL = 'js/ui/mcx-macro-check.js';
const MODULE_SRC = './js/ui/mcx-macro-check.js';
const MODULE_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>';
const CONTRACT_REL = 'tests/mcx-macro-check-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/mcx-macro-check-undo.js';
const BACKUP_RESTORE_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>';
const MANUAL_IMPORT_TAG = '<script src="./js/services/journal-manual-import.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

// Pinned slice geometry in the merged #405 base.
const SLICE_AT = 1926678;
const SLICE_END = 1931297;
const SLICE_START_LINE = 33910;
const SLICE_END_LINE = 33997;
const SLICE_HEAD = '// Backward-compat stub: selAgent still routes here from old code paths\n';
const SLICE_TAIL = "    console.log('[MCX] macro check error:', e.message);\n  }\n}\n\n";
// The last character of the removed range is the blank-line SEPARATOR between
// the macro-check block and the EIC banner: document structure, not module
// content. index.html gives up the whole range; the module carries all of it
// but that one character, so it ends on a real line of code and `git diff
// --check` sees no blank line at EOF. Reconstruction re-inserts it.
const SEPARATOR = '\n';
const MODULE_TAIL = "    console.log('[MCX] macro check error:', e.message);\n  }\n}\n";
const EIC_MARKER = '// ══════════════════════════════════════════════════════════════\n// EARNINGS IRON CONDOR AGENT (EIC)\n';

const BASE_CHARS = 1933458;
const BASE_UTF8 = 1968899;
const BASE_INDEX_SHA256 = '71064f2cb772a0555d5abcf14496e9c87830e1974be1544dcc08ec841047e529';
const INDEX_CHARS = 1928890;
const INDEX_UTF8 = 1964320;
const INDEX_SHA256 = '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96';
const SLICE_CHARS = 4619;
const SLICE_UTF8 = 4630;
const SLICE_LF = 87;
const SLICE_SHA256 = '22ccdf6e93dd73a3503973520955d345b8081a34cbdcba77ae57d247ed881ec7';
const MODULE_CHARS = 4618;
const MODULE_UTF8 = 4629;
const MODULE_LF = 86;
const MODULE_SHA256 = '3615d8cc98cd282b96fa8ba46d07665d52b48f6bf31523ab66009a950777fc49';
const LOCAL_SCRIPT_COUNT = 53;

const OWNER_NAMES = ['runMarketContextPanel', '_mcxRunMacroCheck', 'runMarketContextAnalysis'];

const EXPECTED_SHAPE = [
  { name: 'runMarketContextPanel', form: 'function', isAsync: false, chars: 53 },
  { name: '_mcxRunMacroCheck', form: 'function', isAsync: false, chars: 212 },
  { name: 'runMarketContextAnalysis', form: 'function', isAsync: true, chars: 4186 },
];

const EXPECTED_DEPENDENCIES = [
  'Date',
  'Math',
  'S',
  'appendAgentMsg',
  'appendSysMsg',
  'callAgent',
  'console',
  'document',
  'logEv',
  'setAS',
  'showView',
];

const EXPECTED_EFFECTS = {
  document: 4,
  callAgent: 1,
  setAS: 3,
  appendSysMsg: 1,
  appendAgentMsg: 1,
  logEv: 1,
  showView: 1,
  console: 3,
  innerHTML: 4,
  dataset: 1,
  stateWrite: 4,
  setTimeout: 0,
  setInterval: 0,
  addEventListener: 0,
  removeEventListener: 0,
  localStorage: 0,
  window: 0,
  fetch: 0,
  WebSocket: 0,
};

// MCX owners that deliberately stay in the inline monolith.
const RETAINED_INLINE_OWNERS = [
  '_mcxInit',
  '_mcxRenderCharts',
  '_regimeRefresh',
  '_mcxDrawVixCurve',
  '_mcxAttachResizeObserver',
];
const RETAINED_INLINE_MARKERS = [
  '// ── ResizeObserver ───────────────────────────────────────────────────────',
  '// ══════════════════════════════════════════════════════════════\n// EARNINGS IRON CONDOR AGENT (EIC)\n// ══════════════════════════════════════════════════════════════\n',
  '// DXLINK ON-DEMAND — real-time option data for EIC deep dive',
  '// TRADE JOURNAL — v1',
];
const EXPOSURE_GLUE = '  window.apexImportJournalTradesJson = apexImportJournalTradesJson;\n';

const MARKUP_IDS = ['mcxResults', 'mcx-ts', 'mcx-risk-badge'];
const MARKUP_HANDLER = 'onclick="_mcxRunMacroCheck()"';

const RISK_COLORS = {
  CRITICAL: 'var(--rd)',
  HIGH: 'var(--am)',
  MODERATE: '#f97316',
  NONE: 'var(--gr)',
};

const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const U = require('./lib/mcx-macro-check-undo.js');
const BACKUP_U = require('./lib/journal-backup-restore-undo.js');
const BACKUP_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-backup-restore.js'), 'utf8');
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

// Derive the slice from the base rather than assuming it: it runs from the
// backward-compat stub comment to the blank line before the EIC marker.
const stubAt = BASE.indexOf(SLICE_HEAD);
const eicAt = BASE.indexOf(EIC_MARKER, stubAt);
const SLICE = BASE.slice(stubAt, eicAt);
const CANDIDATE = SLICE.slice(0, -SEPARATOR.length);

const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    code: part.src === MODULE_SRC ? '\n' : part.code,
  }));
const OUTSIDE_APP = APP_PARTS.map((part) => part.code).join('\n');
const INLINE_PART = APP_PARTS.filter((part) => part.name === 'index.html:inline')[0];

let pass = 0;
function ok(value, message) {
  assert.ok(value, message);
  pass++;
}
function eq(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
  pass++;
}
function throws(fn, re, message) {
  assert.throws(fn, re, message);
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
  const re = new RegExp('(?:^|[^A-Za-z0-9_$.])' + escapeRegExp(name) + '(?![A-Za-z0-9_$])', 'gm');
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
    callAgent: /\bcallAgent\s*\(/g,
    setAS: /\bsetAS\s*\(/g,
    appendSysMsg: /\bappendSysMsg\s*\(/g,
    appendAgentMsg: /\bappendAgentMsg\s*\(/g,
    logEv: /\blogEv\s*\(/g,
    showView: /\bshowView\s*\(/g,
    console: /\bconsole\s*\./g,
    innerHTML: /\.innerHTML\s*=/g,
    dataset: /\.dataset\s*\.\s*[A-Za-z0-9_$]+\s*=[^=]/g,
    stateWrite: /\bS\s*\.\s*marketContext(?:Risk|Summary|Timestamp|ValidMinutes)\s*=[^=]/g,
    setTimeout: /\bsetTimeout\s*\(/g,
    setInterval: /\bsetInterval\s*\(/g,
    addEventListener: /\baddEventListener\s*\(/g,
    removeEventListener: /\bremoveEventListener\s*\(/g,
    localStorage: /\blocalStorage\s*\./g,
    window: /\bwindow\s*\./g,
    fetch: /\bfetch\s*\(/g,
    WebSocket: /\b(?:new\s+)?WebSocket\b/g,
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
    return { ok: false, error: String((error && error.message) || error), sandbox };
  }
}

// ── Runtime harness: a minimal classic-global environment that records every
// observable effect the owner is allowed to have. Date is frozen so prompt and
// scan-age construction are deterministic. ──────────────────────────────────
const FIXED_NOW = Date.parse('2026-03-04T15:30:00.000Z');
function frozenDate(now) {
  class D extends Date {
    constructor(...args) {
      if (args.length === 0) super(now);
      else super(...args);
    }
    static now() { return now; }
  }
  return D;
}

function makeHarness(options) {
  const opts = options || {};
  const log = [];
  const els = {};
  function el(id) {
    if (!els[id]) {
      const state = { innerHTML: '', textContent: '' };
      const node = {
        id,
        dataset: new Proxy({}, {
          set(target, key, value) {
            target[key] = value;
            log.push({ t: 'dataset', id, key, value });
            return true;
          },
          get(target, key) { return target[key]; },
        }),
      };
      ['innerHTML', 'textContent'].forEach((prop) => {
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
  const S = opts.S || {
    scanData: [
      { ticker: 'SPY', price: 500, changePct: 1.2, rsi: 55 },
      { ticker: 'QQQ', price: 430, changePct: -0.3, rsi: 48 },
      { ticker: 'VIX', price: 15, changePct: 0.5, rsi: 42 },
    ],
    lastScan: FIXED_NOW - 5 * 60000,
  };
  const missing = opts.missingElements || [];
  const sandbox = {
    Date: frozenDate(FIXED_NOW), Math, JSON, Object, Array, Promise, Error, String, Number, Boolean, RegExp,
    S,
    document: {
      getElementById(id) {
        log.push({ t: 'getElementById', id });
        return missing.indexOf(id) >= 0 ? null : el(id);
      },
    },
    console: {
      log(...args) { log.push({ t: 'console', args }); },
      warn(...args) { log.push({ t: 'console.warn', args }); },
      error(...args) { log.push({ t: 'console.error', args }); },
    },
    showView(name) { log.push({ t: 'showView', name }); },
    setAS(agent, status, message) { log.push({ t: 'setAS', agent, status, message }); },
    callAgent(agent, context) {
      log.push({ t: 'callAgent', agent, context });
      return opts.callAgent ? opts.callAgent(agent, context) : Promise.resolve('');
    },
    appendSysMsg(message) { log.push({ t: 'sys', message }); },
    appendAgentMsg(agent, message) { log.push({ t: 'agent', agent, message }); },
    logEv(agent, message, kind) { log.push({ t: 'logEv', agent, message, kind }); },
  };
  vm.createContext(sandbox);
  vm.runInContext(opts.source || MODULE, sandbox, { filename: MODULE_REL });
  return {
    sandbox, log, el, S,
    of(kind) { return log.filter((entry) => entry.t === kind); },
    kinds() { return log.map((entry) => entry.t); },
    writes(id, prop) {
      return log.filter((entry) => entry.t === 'write' && entry.id === id && entry.prop === prop)
        .map((entry) => entry.value);
    },
    prompt() {
      const call = log.filter((entry) => entry.t === 'callAgent')[0];
      return call ? call.context : null;
    },
  };
}
async function settle(rounds) {
  for (let i = 0; i < (rounds || 8); i++) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < (rounds || 8); i++) await Promise.resolve();
}
function analysisFor(risk, body) {
  const head = risk === 'NONE' ? 'BINARY EVENT RISK: LOW' : 'BINARY EVENT RISK: ' + risk;
  return head + '\n' + (body == null ? '**alpha** beta\ngamma' : body);
}

// The retained MCX owners must stay inline. The module may only MENTION one of
// them, and only in the pre-existing `// prevent _mcxInit from overwriting`
// comment that the base slice already carried — the masker blanks comments, so
// any executable reference or re-declaration shows up here and is overreach.
function retainedOwnerOverreach(source) {
  const masked = maskLiterals(source);
  const redeclared = RETAINED_INLINE_OWNERS.some((name) => new RegExp(
    '(?:^|[^A-Za-z0-9_$.])(?:async\\s+)?function\\s+' + escapeRegExp(name) + '\\s*\\('
  ).test(masked));
  const referenced = RETAINED_INLINE_OWNERS.some((name) => identifierCountMasked(masked, name) > 0);
  const commentMentions = RETAINED_INLINE_OWNERS
    .filter((name) => name !== '_mcxInit')
    .some((name) => source.indexOf(name) >= 0);
  return redeclared || referenced || commentMentions;
}

// ── Semantic gates, expressed as a violation list so mutants can be checked
// against the exact gate they are supposed to trip. ──────────────────────────
function boundaryViolations(source, outsideSource) {
  const violations = [];
  if (JSON.stringify(topLevelShape(source)) !== JSON.stringify(EXPECTED_SHAPE)) violations.push('manifest');
  if (JSON.stringify(freeIdentifiers(source)) !== JSON.stringify(EXPECTED_DEPENDENCIES)) violations.push('dependencies');
  if (topLevelResidue(source) !== '') violations.push('top-level-effect');
  const effects = directEffects(source);
  const forbidden = ['setTimeout', 'setInterval', 'addEventListener', 'removeEventListener', 'localStorage', 'window', 'fetch', 'WebSocket'];
  if (forbidden.some((name) => effects[name] !== 0)) violations.push('foreign-direct-effect');
  if (effects.callAgent !== EXPECTED_EFFECTS.callAgent || effects.setAS !== EXPECTED_EFFECTS.setAS ||
      effects.appendSysMsg !== EXPECTED_EFFECTS.appendSysMsg ||
      effects.appendAgentMsg !== EXPECTED_EFFECTS.appendAgentMsg ||
      effects.logEv !== EXPECTED_EFFECTS.logEv || effects.showView !== EXPECTED_EFFECTS.showView ||
      effects.stateWrite !== EXPECTED_EFFECTS.stateWrite || effects.dataset !== EXPECTED_EFFECTS.dataset) {
    violations.push('delegation-shape');
  }
  if (retainedOwnerOverreach(source)) violations.push('owner-overreach');
  if (source.indexOf('apexImportJournalTradesJson') >= 0) violations.push('exposure-glue-overreach');
  const later = ownerDeclarationCounts(outsideSource);
  if (OWNER_NAMES.some((name) => later[name] !== 0)) violations.push('competing-owner');
  if (!loadCandidate(source).ok) violations.push('load-contract');
  const own = ownerDeclarationCounts(source);
  if (OWNER_NAMES.some((name) => own[name] !== 1)) violations.push('duplicate-owner');
  if (!/BINARY EVENT RISK: CRITICAL/.test(source) || !/BINARY EVENT RISK: HIGH/.test(source) ||
      !/BINARY EVENT RISK: MODERATE/.test(source) || !/USA IL WEB SEARCH/.test(source)) {
    violations.push('prompt-or-risk-mutation');
  }
  return violations;
}

function moduleOrderViolations(html) {
  const violations = [];
  if (countLiteral(html, MODULE_TAG) !== 1) violations.push('tag-count');
  const backupAt = html.indexOf(BACKUP_RESTORE_TAG);
  const ownAt = html.indexOf(MODULE_TAG);
  const inlineAt = html.indexOf(INLINE_OPEN);
  if (!(backupAt >= 0 && backupAt < ownAt && ownAt < inlineAt)) violations.push('load-order');
  if (countLiteral(html, BACKUP_RESTORE_TAG + '\n' + MODULE_TAG + '\n<script>') !== 1) {
    violations.push('adjacency');
  }
  const tags = APP_LOADER.parseScriptTags(html).filter((entry) => entry.src === MODULE_SRC);
  if (tags.length !== 1 || tags[0].attrs.trim() !== 'src="' + MODULE_SRC + '"') {
    violations.push('classic-tag');
  }
  return violations;
}

console.log('MCX MACRO-CHECK BOUNDARY CONTRACT');
console.log('base=' + BASE_SHA);

// ─────────────────────────────────────────────────────────────────────────────
section('1. Pinned #405 base identity and the exact extracted artifacts');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_SHA, 'merged #405 base commit resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_TREE, 'merged #405 base tree resolves exactly');
eq(execFileSync('git', ['log', '-1', '--format=%s', BASE_SHA], { cwd: ROOT, encoding: 'utf8' }).trim(),
  BASE_SUBJECT, 'merged #405 base subject is the pinned one');
eq(BASE.length, BASE_CHARS, 'base index UTF-16 length is pinned');
eq(Buffer.byteLength(BASE, 'utf8'), BASE_UTF8, 'base index UTF-8 byte length is pinned');
eq(sha256(BASE), BASE_INDEX_SHA256, 'base index SHA-256 is pinned');
eq(INDEX.length, INDEX_CHARS, 'extracted index UTF-16 length is the audited prediction');
eq(Buffer.byteLength(INDEX, 'utf8'), INDEX_UTF8, 'extracted index UTF-8 byte length is the audited prediction');
eq(sha256(INDEX), INDEX_SHA256, 'extracted index SHA-256 is the audited prediction');
eq(INDEX.length, BASE.length - SLICE_CHARS + MODULE_TAG.length + 1,
  'the whole index delta is exactly the removed range plus the one added tag line');
eq(MODULE, CANDIDATE,
  'module is byte-identical to the slice derived from the base, minus its trailing separator');
eq(MODULE + SEPARATOR, SLICE,
  'the module plus the one separator character is exactly the removed range');

// ─────────────────────────────────────────────────────────────────────────────
section('2. Exact source boundary, module bytes and three-owner manifest');
eq(countLiteral(BASE, SLICE_HEAD), 1, 'the backward-compat stub comment is unique in the base');
eq(stubAt, SLICE_AT, 'slice starts at the exact pinned base offset');
eq(eicAt, SLICE_END, 'slice ends at the exact pinned base offset, at the EIC marker');
eq(lineAt(BASE, stubAt), SLICE_START_LINE, 'slice starts on line 33910 of the base');
eq(lineAt(BASE, eicAt), SLICE_END_LINE, 'line 33997 of the base begins the EIC marker');
eq(SLICE.length, SLICE_CHARS, 'the removed range has the exact pinned UTF-16 length');
eq(Buffer.byteLength(SLICE, 'utf8'), SLICE_UTF8, 'the removed range has the exact pinned UTF-8 byte length');
eq(countLiteral(SLICE, '\n'), SLICE_LF, 'the removed range carries exactly 87 LF characters');
eq(sha256(SLICE), SLICE_SHA256, 'the removed range byte identity is pinned');
ok(SLICE.endsWith(SLICE_TAIL),
  'the removed range ends with the complete runMarketContextAnalysis error path and two LFs');
eq(SLICE.slice(-SEPARATOR.length), SEPARATOR,
  'the last character of the removed range is the structural separator');
eq(MODULE.length, MODULE_CHARS, 'module has the exact pinned UTF-16 length');
eq(Buffer.byteLength(MODULE, 'utf8'), MODULE_UTF8, 'module has the exact pinned UTF-8 byte length');
eq(countLiteral(MODULE, '\n'), MODULE_LF, 'module carries exactly 86 LF characters');
eq(sha256(MODULE), MODULE_SHA256, 'module byte identity is pinned');
ok(MODULE.startsWith(SLICE_HEAD), 'module starts at the backward-compat stub comment');
ok(MODULE.endsWith(MODULE_TAIL),
  'module ends with the complete runMarketContextAnalysis error path and its own final LF');
ok(MODULE.endsWith('}\n'), 'module ends on a real line of code, newline-terminated');
ok(!MODULE.endsWith('\n\n'),
  'module has NO blank line at EOF: the separator stays out, so git diff --check is clean');
eq(MODULE_CHARS, SLICE_CHARS - SEPARATOR.length,
  'module length is the removed range minus exactly the one separator character');
eq(topLevelShape(MODULE), EXPECTED_SHAPE,
  'module owns exactly three declarations with pinned order, forms and sizes');
eq(topLevelShape(MODULE).map((entry) => entry.name), OWNER_NAMES,
  'declaration manifest matches the mandated three-owner order');
eq(topLevelShape(MODULE).map((entry) => entry.chars), [53, 212, 4186],
  'each owner keeps its exact declaration size');
eq(topLevelShape(MODULE).filter((entry) => entry.isAsync).map((entry) => entry.name),
  ['runMarketContextAnalysis'], 'runMarketContextAnalysis is the only async owner');
eq(topLevelResidue(MODULE), '',
  'module is declarations plus comments/whitespace only: no executable top-level residue');
eq(countLiteral(MODULE, "'use strict'"), 0, 'module adds no strict-mode pragma');
eq(countLiteral(MODULE, '"use strict"'), 0, 'module adds no double-quoted strict-mode pragma');
eq(countLiteral(MODULE, 'module.exports'), 0, 'module adds no CommonJS export');
eq(countLiteral(MODULE, 'require('), 0, 'module adds no CommonJS require');
eq(countLiteral(MODULE, 'export '), 0, 'module adds no ES export');
eq(countLiteral(MODULE, 'import '), 0, 'module adds no ES import');
ok(!/^\s*\(function\s*\(/.test(MODULE) && !/^\s*!function/.test(MODULE),
  'module adds no IIFE or wrapper');
eq((maskLiterals(MODULE).match(/\bwindow\s*\./g) || []).length, 0,
  'module carries no window reference at all');
eq(countLiteral(MODULE, '\r'), 0, 'module carries no CR: the slice is LF-only, as in the base');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Zero inline residue and no competing declaration app-wide');
eq(countLiteral(INDEX, SLICE_HEAD), 0, 'the stub comment has zero inline residue after extraction');
eq(countLiteral(INDEX, SLICE_TAIL), 0, 'the error-path tail has zero inline residue after extraction');
eq(countLiteral(INDEX, MODULE_TAIL), 0, 'the module tail has zero inline residue after extraction');
OWNER_NAMES.forEach((name) => {
  eq((maskLiterals(INDEX).match(new RegExp('^\\s*(?:async\\s+)?function\\s+' + escapeRegExp(name) + '\\s*\\(', 'gm')) || []).length, 0,
    'index.html declares no inline ' + name);
});
eq(ownerDeclarationCounts(OUTSIDE_APP), { runMarketContextPanel: 0, _mcxRunMacroCheck: 0, runMarketContextAnalysis: 0 },
  'no competing declaration remains anywhere in the application after the simulated cut');
eq(ownerDeclarationCounts(MODULE), { runMarketContextPanel: 1, _mcxRunMacroCheck: 1, runMarketContextAnalysis: 1 },
  'the module declares each owner exactly once');
eq(APP_LOADER.loadOrderedScriptSources().filter((part) => part.src === MODULE_SRC).map((part) => part.code === MODULE),
  [true], 'the loader reconstructs the owner from disk exactly once, byte-for-byte');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Exact free dependencies and measured effect surface');
eq(freeIdentifiers(MODULE), EXPECTED_DEPENDENCIES, 'module call-time dependency inventory is exact (11 names)');
eq(freeIdentifiers(MODULE).length, 11, 'the dependency inventory has exactly eleven entries');
eq(directEffects(MODULE), EXPECTED_EFFECTS, 'measured source effects are exact');
['setTimeout', 'setInterval', 'addEventListener', 'removeEventListener', 'localStorage', 'window', 'fetch', 'WebSocket']
  .forEach((name) => {
    eq(directEffects(MODULE)[name], 0, 'module performs zero ' + name + ' effects');
  });
eq(countLiteral(maskLiterals(MODULE), 'S.marketContextRisk='), 1, 'exactly one S.marketContextRisk write');
eq(countLiteral(maskLiterals(MODULE), 'S.marketContextSummary='), 1, 'exactly one S.marketContextSummary write');
eq(countLiteral(maskLiterals(MODULE), 'S.marketContextTimestamp='), 1, 'exactly one S.marketContextTimestamp write');
eq(countLiteral(maskLiterals(MODULE), 'S.marketContextValidMinutes='), 1, 'exactly one S.marketContextValidMinutes write');
eq(countLiteral(maskLiterals(MODULE), 'vixD'), 1,
  'the deliberately unused vixD lookup survives relocation and is still referenced exactly once');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Exact JavaScript and inline-markup consumers');
eq(externalUsage('runMarketContextPanel'), [{ where: 'index.html:inline', refs: 1 }],
  'runMarketContextPanel has exactly one external JavaScript consumer, in the inline monolith');
eq(externalUsage('_mcxRunMacroCheck'), [],
  '_mcxRunMacroCheck has no JavaScript consumer at all — only the inline-markup handler');
eq(externalUsage('runMarketContextAnalysis'), [],
  'runMarketContextAnalysis has no consumer outside its own owner');
eq(countLiteral(INDEX, MARKUP_HANDLER), 1, 'markup keeps exactly one onclick="_mcxRunMacroCheck()" consumer');
eq(countLiteral(INDEX, '_mcxRunMacroCheck'), 1, '_mcxRunMacroCheck appears in index.html only in that handler');
eq(countLiteral(INDEX, 'runMarketContextPanel'), 1, 'runMarketContextPanel appears in index.html only at its call site');
eq(countLiteral(INDEX, 'runMarketContextAnalysis'), 0, 'runMarketContextAnalysis has no index.html occurrence at all');
eq((maskLiterals(MODULE).match(/(?<!function\s)\brunMarketContextAnalysis\s*\(/g) || []).length, 1,
  'runMarketContextAnalysis is invoked exactly once, from _mcxRunMacroCheck inside the owner');
ok(MODULE.indexOf('runMarketContextAnalysis();') > MODULE.indexOf('function _mcxRunMacroCheck()') &&
   MODULE.indexOf('runMarketContextAnalysis();') < MODULE.indexOf('async function runMarketContextAnalysis()'),
  'the only call site sits inside the _mcxRunMacroCheck body');
MARKUP_IDS.forEach((id) => {
  eq(countLiteral(INDEX, 'id="' + id + '"'), 1, 'markup keeps a single ' + id + ' element');
  ok(MODULE.indexOf("'" + id + "'") >= 0, 'owner reaches ' + id + ' only through a string id lookup');
});
ok(INDEX.indexOf(MARKUP_HANDLER) < INDEX.indexOf(MODULE_TAG) ||
   INDEX.indexOf(MARKUP_HANDLER) > INDEX.indexOf(MODULE_TAG),
  'the markup handler and the module tag both exist in the shipped document');

// ─────────────────────────────────────────────────────────────────────────────
section('6. One synchronous src-only classic tag, adjacency and load order');
eq(APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).length,
  LOCAL_SCRIPT_COUNT, 'index carries exactly 53 local application scripts');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'the new tag appears exactly once');
eq(moduleOrderViolations(INDEX), [],
  'the macro-check owner loads after Backup/Restore and immediately before the inline monolith');
eq(countLiteral(INDEX, BACKUP_RESTORE_TAG + '\n' + MODULE_TAG + '\n<script>'), 1,
  'exact three-line adjacency: Backup/Restore, macro check, then the inline monolith opens');
ok(INDEX.indexOf(MANUAL_IMPORT_TAG) < INDEX.indexOf(BACKUP_RESTORE_TAG),
  'Manual Import still precedes Backup/Restore');
const ownTag = APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src === MODULE_SRC)[0];
eq(ownTag.attrs.trim(), 'src="' + MODULE_SRC + '"', 'tag is src-only: no defer, async, type or inline code');
['defer', 'async', 'type=', 'nomodule', 'crossorigin', 'integrity'].forEach((attr) => {
  eq(ownTag.attrs.indexOf(attr), -1, 'tag carries no ' + attr + ' attribute');
});
eq(ownTag.code == null || ownTag.code === '', true, 'the tag has no inline body');
eq(APP_LOADER.parseScriptTags(INDEX).filter((entry) => entry.src && /^\.\//.test(entry.src)).map((e) => e.src).slice(-1),
  [MODULE_SRC], 'the macro-check owner is the LAST local application script before the monolith');

// ─────────────────────────────────────────────────────────────────────────────
section('7. Module evaluation is inert in an empty VM');
const bareLoad = loadCandidate(MODULE);
ok(bareLoad.ok, 'module evaluates in a completely empty context, before any dependency exists: ' + bareLoad.error);
OWNER_NAMES.forEach((name) => {
  eq(typeof bareLoad.sandbox[name], 'function', 'classic evaluation exposes global ' + name);
});
eq(Object.keys(bareLoad.sandbox).sort(), OWNER_NAMES.slice().sort(),
  'evaluation defines exactly the three owners and nothing else');
const inertHarness = makeHarness({});
eq(inertHarness.log, [],
  'loading the module performs no DOM, agent, state, log, view or console action');

// ─────────────────────────────────────────────────────────────────────────────
section('8. Byte-exact forward transform and reverse reconstruction of #405');
// index.html gives up the WHOLE range, separator included.
const withoutSlice = BASE.slice(0, SLICE_AT) + BASE.slice(SLICE_END);
const FORWARD = withoutSlice.replace(
  BACKUP_RESTORE_TAG + '\n<script>',
  BACKUP_RESTORE_TAG + '\n' + MODULE_TAG + '\n<script>'
);
eq(FORWARD, INDEX, 'the extraction algorithm reproduces the shipped index byte-for-byte');
eq(sha256(FORWARD), INDEX_SHA256, 'the forward transform hashes to the audited prediction');
const withoutTag = INDEX.replace(MODULE_TAG + '\n', '');
eq(withoutTag.slice(0, SLICE_AT) + MODULE + SEPARATOR + withoutTag.slice(SLICE_AT), BASE,
  'tag removal plus module plus the one separator character reconstructs #405');
ok(withoutTag.slice(0, SLICE_AT) + MODULE + withoutTag.slice(SLICE_AT) !== BASE,
  'reinserting the module WITHOUT the separator does not reconstruct #405 — the separator is load-bearing');
const rebuilt = U.undoMcxMacroCheck(INDEX, MODULE);
eq(rebuilt, BASE, 'the undo helper reconstructs merged #405 byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the pinned base hash');
eq(U.TAG, MODULE_TAG + '\n', 'undo helper pins the tag including its LF');
eq(U.ANCHOR_TAG, BACKUP_RESTORE_TAG + '\n', 'undo helper pins the Backup/Restore anchor tag');
eq(U.SLICE_AT, SLICE_AT, 'undo helper pins the exact reinsertion offset');
eq(U.SLICE_END, SLICE_END, 'undo helper pins the exact slice end offset');
eq(U.MODULE_CHARS, MODULE_CHARS, 'undo helper pins the module length');
eq(U.MODULE_SHA256, sha256(MODULE), 'undo helper pins the module hash');
eq(U.SEPARATOR, SEPARATOR, 'undo helper pins the one-character structural separator');
eq(U.SLICE_CHARS, SLICE_CHARS, 'undo helper pins the removed range length');
eq(U.SLICE_SHA256, SLICE_SHA256, 'undo helper pins the removed range hash');
eq(U.MODULE_CHARS + U.SEPARATOR.length, U.SLICE_CHARS,
  'undo helper module + separator accounts for the whole removed range');
eq(U.BASE_CHARS, BASE_CHARS, 'undo helper pins the base length');
eq(U.EXTRACTED_CHARS, INDEX.length, 'undo helper pins the extracted length');
eq(U.EXTRACTED_SHA256, sha256(INDEX), 'undo helper pins the extracted hash');
ok(U.isApplied(INDEX), 'undo helper detects the applied extraction');
ok(!U.isApplied(BASE), 'undo helper reports the base as not extracted');
// The cumulative bridge must peel this layer FIRST, then Backup/Restore.
const BRIDGE_SRC = fs.readFileSync(path.join(ROOT, 'tests/lib/post-journal-mcx-pr3-undo.js'), 'utf8');
ok(BRIDGE_SRC.indexOf('undoMcxMacroCheck') >= 0, 'the cumulative historical helper undoes MCX macro check');
ok(BRIDGE_SRC.indexOf('undoMcxMacroCheck') < BRIDGE_SRC.indexOf('undoJournalBackupRestore'),
  'the cumulative helper peels MCX macro check BEFORE Backup/Restore');
const preBackup = BACKUP_U.undoJournalBackupRestore(rebuilt, BACKUP_MODULE);
eq(preBackup.length, BACKUP_U.BASE_CHARS, 'the next layer down still reaches the pre-Backup/Restore base');
eq(sha256(preBackup), BACKUP_U.BASE_SHA256, 'the pre-Backup/Restore base hash is unchanged by this layer');

// ─────────────────────────────────────────────────────────────────────────────
section('9. Legacy routing and macro-button behavior');
const routeH = makeHarness({});
routeH.sandbox.runMarketContextPanel();
eq(routeH.of('showView'), [{ t: 'showView', name: 'mcx' }],
  'runMarketContextPanel routes to showView(\'mcx\') exactly once');
eq(routeH.kinds(), ['showView'], 'the routing stub performs no other action whatsoever');

const buttonH = makeHarness({ callAgent: () => new Promise(() => {}) });
buttonH.sandbox._mcxRunMacroCheck();
eq(buttonH.of('dataset'), [{ t: 'dataset', id: 'mcxResults', key: 'hasContent', value: '1' }],
  '_mcxRunMacroCheck marks mcxResults.dataset.hasContent = \'1\' so _mcxInit will not overwrite it');
eq(buttonH.of('callAgent').length, 1, '_mcxRunMacroCheck dispatches the analysis exactly once');
eq(buttonH.of('showView').length, 0, '_mcxRunMacroCheck never routes the view');

const noResultsH = makeHarness({ missingElements: ['mcxResults'], callAgent: () => new Promise(() => {}) });
noResultsH.sandbox._mcxRunMacroCheck();
eq(noResultsH.of('dataset'), [], 'a missing mcxResults node is tolerated: no dataset write');
eq(noResultsH.of('callAgent').length, 1, 'the analysis still dispatches when mcxResults is absent');

// Current duplicate-click behavior: no guard, so a second click runs a second
// analysis concurrently. Pinned as-is, deliberately not fixed here.
const dupH = makeHarness({ callAgent: () => new Promise(() => {}) });
dupH.sandbox._mcxRunMacroCheck();
dupH.sandbox._mcxRunMacroCheck();
eq(dupH.of('callAgent').length, 2, 'duplicate clicks currently dispatch two overlapping analyses (pinned, not fixed)');
eq(dupH.of('dataset').length, 2, 'duplicate clicks currently re-write the hasContent marker each time');
eq(dupH.of('setAS').filter((e) => e.status === 'busy').length, 2,
  'duplicate clicks currently raise the busy status twice');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Exact prompt construction and success transcript');
(async () => {
  const okH = makeHarness({ callAgent: () => Promise.resolve(analysisFor('HIGH')) });
  await okH.sandbox.runMarketContextAnalysis();
  await settle();
  const promptLines = okH.prompt().split('\n');
  eq(promptLines[0], '=== MARKET CONTEXT REQUEST ===', 'prompt opens with the market-context request banner');
  ok(/^Data: .+$/.test(promptLines[1]), 'prompt carries the locale-formatted date line');
  eq(promptLines.slice(2), [
    '',
    '=== DATI DISPONIBILI DALLO SCANNER ===',
    'SPY: $500 (1.2%) RSI:55 [scan: 5min ago]',
    'QQQ: $430 (-0.3%) RSI:48',
    '',
    '=== ISTRUZIONI ===',
    'Analizza il contesto macro attuale per un options trader.',
    'USA IL WEB SEARCH per trovare:',
    '1. Livello VIX e VIX3M oggi',
    '2. Eventuali eventi binari non-ordinari imminenti (escludi FOMC normale, earnings ordinari)',
    '   - Cerca: tariffe doganali, escalation geopolitica, sanzioni emergenziali, crisi valutarie',
    '3. Sentiment di mercato attuale (risk-on / risk-off)',
    '4. Qualsiasi warning che un desk di opzioni professionista emetterebbe oggi',
    '',
    'Produci un report strutturato nel formato richiesto.',
    'Sii diretto e operativo — il trader userà questo per decidere se aprire nuove posizioni.',
  ], 'the whole prompt body after the date line is byte-exact, including USA IL WEB SEARCH');
  eq(countLiteral(okH.prompt(), 'USA IL WEB SEARCH'), 1, 'the web-search instruction appears exactly once');
  eq(okH.of('callAgent')[0].agent, 'market-context', 'the prompt is sent to the market-context agent');
  ok(okH.prompt().indexOf('VIX:') < 0, 'the unused vixD lookup contributes nothing to the prompt');

  const noScanH = makeHarness({
    S: { scanData: [], lastScan: null },
    callAgent: () => Promise.resolve(analysisFor('HIGH')),
  });
  await noScanH.sandbox.runMarketContextAnalysis();
  await settle();
  const noScanLines = noScanH.prompt().split('\n');
  eq(noScanLines[4], 'SPY: N/A[no scan]', 'an empty scanner renders the exact SPY N/A + [no scan] form');
  eq(noScanLines[5], 'QQQ: N/A', 'an empty scanner renders the exact QQQ N/A form');

  const oldScanH = makeHarness({
    S: {
      scanData: [{ ticker: 'SPY', price: 1, changePct: 2, rsi: 3 }],
      lastScan: FIXED_NOW - 90 * 60000 - 29000,
    },
    callAgent: () => Promise.resolve(analysisFor('HIGH')),
  });
  await oldScanH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(oldScanH.prompt().split('\n')[4], 'SPY: $1 (2%) RSI:3 [scan: 90min ago]',
    'scan age is Math.round((now - lastScan) / 60000) minutes, exactly as before');

  eq(okH.kinds(), [
    'console', 'setAS', 'getElementById', 'write', 'callAgent', 'setAS',
    'getElementById', 'write', 'getElementById', 'write', 'write',
    'sys', 'agent', 'logEv', 'console',
  ], 'the success transcript is the exact pinned sequence of observable effects');
  eq(okH.of('setAS'), [
    { t: 'setAS', agent: 'market-context', status: 'busy', message: 'Analisi macro in corso...' },
    { t: 'setAS', agent: 'market-context', status: 'ok', message: 'Contesto aggiornato' },
  ], 'the exact busy and ok agent-status calls are made, in order');
  eq(okH.of('console').map((entry) => entry.args), [
    ['[MCX] macro check started'],
    ['[MCX] macro check completed — risk=HIGH'],
  ], 'the exact start and completion console logs are emitted');
  eq(okH.writes('mcxResults', 'innerHTML')[0],
    '<div style="font-size:10px;font-family:var(--M);color:var(--tx2)">' +
    '<div class="td2"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>' +
    ' Analisi contesto mercato con web search...</div>',
    'the loading state is rendered byte-exactly before the agent call');
  eq(okH.writes('mcxResults', 'innerHTML')[1],
    '<div class="stbox" style="border-color:var(--am);margin-top:8px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<div class="stitle" style="color:#8b5cf6">MARKET CONTEXT</div>' +
    '<div style="font-size:11px;font-weight:700;color:var(--am)">HIGH</div>' +
    '</div>' +
    '<div style="font-size:10px;font-family:var(--M);line-height:1.75">' +
    'BINARY EVENT RISK: HIGH<br><strong>alpha</strong> beta<br>gamma</div>' +
    '</div>',
    'the result HTML is rendered byte-exactly, with **bold** → <strong> and \\n → <br>');
  ok(/^Updated \d{2}:\d{2} (AM|PM)$/.test(okH.writes('mcx-ts', 'textContent')[0]),
    'the mcx-ts stamp is the exact "Updated hh:mm AM/PM" form');
  eq(okH.writes('mcx-risk-badge', 'innerHTML'),
    ['<span style="font-weight:700;color:var(--am)">HIGH</span>'],
    'the risk badge is rendered byte-exactly');
  eq(okH.of('sys'), [{ t: 'sys', message: '&#9670; Market Context aggiornato — Binary Event Risk: HIGH' }],
    'the system message is byte-exact, including the &#9670; entity');
  eq(okH.of('agent'), [{ t: 'agent', agent: 'market-context', message: analysisFor('HIGH') }],
    'the full, unmodified analysis is appended to the market-context agent transcript');
  eq(okH.of('logEv'), [{ t: 'logEv', agent: 'market-context', message: 'Context update: binary risk=HIGH', kind: 'ok' }],
    'the event log entry is byte-exact');
  eq(okH.of('getElementById').map((entry) => entry.id), ['mcxResults', 'mcx-ts', 'mcx-risk-badge'],
    'exactly three DOM lookups are performed, in the pinned order');
  eq(okH.S.marketContextRisk, 'HIGH', 'S.marketContextRisk publishes the parsed level');
  eq(okH.S.marketContextSummary, analysisFor('HIGH').substring(0, 400), 'S.marketContextSummary is the 400-char prefix');
  eq(okH.S.marketContextTimestamp, FIXED_NOW, 'S.marketContextTimestamp is Date.now() at publication');
  eq(okH.S.marketContextValidMinutes, 240, 'S.marketContextValidMinutes is the 240-minute (4h) validity');

  const longH = makeHarness({
    callAgent: () => Promise.resolve('BINARY EVENT RISK: HIGH\n' + 'x'.repeat(1000)),
  });
  await longH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(longH.S.marketContextSummary.length, 400, 'the summary is truncated to exactly 400 characters');
  eq(longH.S.marketContextSummary, ('BINARY EVENT RISK: HIGH\n' + 'x'.repeat(1000)).substring(0, 400),
    'the truncation is a plain substring(0, 400) of the raw analysis');
  eq(longH.of('agent')[0].message.length, 1024, 'the agent transcript keeps the untruncated analysis');

  const missingNodesH = makeHarness({
    missingElements: ['mcxResults', 'mcx-ts', 'mcx-risk-badge'],
    callAgent: () => Promise.resolve(analysisFor('HIGH')),
  });
  await missingNodesH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(missingNodesH.of('write'), [], 'absent DOM nodes are tolerated: nothing is written');
  eq(missingNodesH.S.marketContextRisk, 'HIGH', 'state publication happens even with no DOM nodes present');
  eq(missingNodesH.of('sys').length, 1, 'the system message is still raised with no DOM nodes present');

  // ───────────────────────────────────────────────────────────────────────────
  section('11. CRITICAL / HIGH / MODERATE / NONE classification and colors');
  for (const risk of ['CRITICAL', 'HIGH', 'MODERATE']) {
    const h = makeHarness({ callAgent: () => Promise.resolve(analysisFor(risk)) });
    await h.sandbox.runMarketContextAnalysis();
    await settle();
    eq(h.S.marketContextRisk, risk, risk + ' is parsed from "BINARY EVENT RISK: ' + risk + '"');
    eq(h.writes('mcx-risk-badge', 'innerHTML'),
      ['<span style="font-weight:700;color:' + RISK_COLORS[risk] + '">' + risk + '</span>'],
      risk + ' renders its exact color ' + RISK_COLORS[risk]);
    ok(h.writes('mcxResults', 'innerHTML')[1].indexOf('border-color:' + RISK_COLORS[risk]) >= 0,
      risk + ' colors the result box border');
    eq(h.of('sys')[0].message, '&#9670; Market Context aggiornato — Binary Event Risk: ' + risk,
      risk + ' is named in the system message');
    eq(h.of('logEv')[0].message, 'Context update: binary risk=' + risk, risk + ' is named in the event log');
  }
  const noneH = makeHarness({ callAgent: () => Promise.resolve(analysisFor('NONE')) });
  await noneH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(noneH.S.marketContextRisk, 'NONE', 'an unrecognized level falls back to NONE');
  eq(noneH.writes('mcx-risk-badge', 'innerHTML'),
    ['<span style="font-weight:700;color:' + RISK_COLORS.NONE + '">NONE</span>'],
    'NONE renders its exact fallback color var(--gr)');

  // Precedence and case sensitivity are pinned exactly as they are today.
  const precedenceH = makeHarness({
    callAgent: () => Promise.resolve('BINARY EVENT RISK: MODERATE and BINARY EVENT RISK: CRITICAL'),
  });
  await precedenceH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(precedenceH.S.marketContextRisk, 'CRITICAL', 'CRITICAL wins when several levels appear: the if-chain order is pinned');
  const highOverModerateH = makeHarness({
    callAgent: () => Promise.resolve('BINARY EVENT RISK: MODERATE / BINARY EVENT RISK: HIGH'),
  });
  await highOverModerateH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(highOverModerateH.S.marketContextRisk, 'HIGH', 'HIGH outranks MODERATE, matching the if-chain order');
  for (const lower of ['binary event risk: critical', 'Binary Event Risk: HIGH', 'BINARY EVENT RISK:CRITICAL']) {
    const h = makeHarness({ callAgent: () => Promise.resolve(lower) });
    await h.sandbox.runMarketContextAnalysis();
    await settle();
    eq(h.S.marketContextRisk, 'NONE',
      'parsing stays exact and case-sensitive: ' + JSON.stringify(lower) + ' classifies as NONE');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('12. Failure behavior and absence of success-side effects');
  const errH = makeHarness({ callAgent: () => Promise.reject(new Error('agent down')) });
  await errH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(errH.kinds(), ['console', 'setAS', 'getElementById', 'write', 'callAgent', 'write', 'setAS', 'console'],
    'the failure transcript is the exact pinned sequence of observable effects');
  eq(errH.writes('mcxResults', 'innerHTML')[1],
    '<div style="color:var(--rd);font-size:10px">Errore: agent down</div>',
    'the error state is rendered byte-exactly');
  eq(errH.of('setAS')[1], { t: 'setAS', agent: 'market-context', status: 'err', message: 'agent down' },
    'the exact error agent-status call is made');
  eq(errH.of('console').map((entry) => entry.args), [
    ['[MCX] macro check started'],
    ['[MCX] macro check error:', 'agent down'],
  ], 'the exact start and error console logs are emitted');
  eq(errH.of('sys'), [], 'a failed analysis appends no system message');
  eq(errH.of('agent'), [], 'a failed analysis appends no agent transcript entry');
  eq(errH.of('logEv'), [], 'a failed analysis writes no event-log entry');
  eq(errH.of('dataset'), [], 'a failed analysis writes no dataset marker');
  eq(errH.writes('mcx-ts', 'textContent'), [], 'a failed analysis stamps no timestamp');
  eq(errH.writes('mcx-risk-badge', 'innerHTML'), [], 'a failed analysis renders no risk badge');
  eq(errH.S.marketContextRisk, undefined, 'a failed analysis publishes no S.marketContextRisk');
  eq(errH.S.marketContextSummary, undefined, 'a failed analysis publishes no S.marketContextSummary');
  eq(errH.S.marketContextTimestamp, undefined, 'a failed analysis publishes no S.marketContextTimestamp');
  eq(errH.S.marketContextValidMinutes, undefined, 'a failed analysis publishes no S.marketContextValidMinutes');
  const errNoNodeH = makeHarness({
    missingElements: ['mcxResults'],
    callAgent: () => Promise.reject(new Error('boom')),
  });
  await errNoNodeH.sandbox.runMarketContextAnalysis();
  await settle();
  eq(errNoNodeH.of('write'), [], 'the failure path tolerates an absent mcxResults node');
  eq(errNoNodeH.of('setAS')[1].status, 'err', 'the error status is still raised with no DOM node present');

  // ───────────────────────────────────────────────────────────────────────────
  section('13. Retained inline MCX owners and retained Journal exposure glue');
  RETAINED_INLINE_OWNERS.forEach((name) => {
    ok(new RegExp('^\\s*(?:async\\s+)?function\\s+' + escapeRegExp(name) + '\\s*\\(', 'm').test(INDEX),
      name + ' is still declared inline in index.html');
    eq(identifierCountMasked(maskLiterals(MODULE), name), 0,
      name + ' has no executable reference in the module — it was not dragged in');
  });
  // The only retained-owner mention the slice carries is documentary: the
  // pre-existing `// prevent _mcxInit from overwriting during same session`
  // comment. It is code-inert, which is why _mcxInit is absent from the
  // eleven-name free-dependency inventory.
  eq(countLiteral(MODULE, '_mcxInit'), 1, 'the module mentions _mcxInit exactly once');
  eq(identifierCountMasked(maskLiterals(MODULE), '_mcxInit'), 0,
    'that single _mcxInit mention is inside a comment, not executable code');
  ok(MODULE.indexOf("// prevent _mcxInit from overwriting during same session") >= 0,
    'the _mcxInit mention is the pre-existing explanatory comment, carried over unchanged');
  RETAINED_INLINE_OWNERS.filter((name) => name !== '_mcxInit').forEach((name) => {
    eq(countLiteral(MODULE, name), 0, name + ' does not appear in the module at all');
  });
  ok(!retainedOwnerOverreach(MODULE), 'the shipped module trips no retained-owner overreach gate');
  RETAINED_INLINE_MARKERS.forEach((marker) => {
    ok(INDEX.indexOf(marker) >= 0, 'retained inline marker survives: ' + marker.split('\n')[0].slice(0, 60));
  });
  ok(/new ResizeObserver\(/.test(INDEX), 'the MCX resize listener stays inline');
  eq(countLiteral(MODULE, 'ResizeObserver'), 0, 'the module contains no resize-listener code');
  eq(countLiteral(INDEX, EXPOSURE_GLUE), 1,
    'the intentionally retained manual-import window exposure glue stays inline, exactly once');
  eq(countLiteral(MODULE, 'apexImportJournalTradesJson'), 0,
    'the exposure glue was not moved into the module');
  eq(countLiteral(INDEX, 'window.apexImportJournalTradesJson'), 2,
    'the exposure glue and its console hint both stay inline, unchanged');
  ok(INDEX.indexOf('// TRADE JOURNAL — v1') >= 0, 'the Journal markup comments stay inline');
  eq(countLiteral(BASE, EXPOSURE_GLUE), countLiteral(INDEX, EXPOSURE_GLUE),
    'the exposure glue count is identical to the base — this PR did not touch it');

  // ───────────────────────────────────────────────────────────────────────────
  section('14. Mutation-sensitive negative controls');
  eq(boundaryViolations(MODULE, OUTSIDE_APP), [], 'the shipped owner passes every semantic boundary gate');
  ok(boundaryViolations(MODULE.replace('function runMarketContextPanel', 'function runMarketContextPanelV2'), OUTSIDE_APP)
    .includes('manifest'), 'renamed runMarketContextPanel mutant is rejected');
  ok(boundaryViolations(MODULE.replace('function _mcxRunMacroCheck', 'function _mcxRunMacroCheck2'), OUTSIDE_APP)
    .includes('manifest'), 'renamed _mcxRunMacroCheck mutant is rejected');
  ok(boundaryViolations(MODULE.replace('async function runMarketContextAnalysis', 'function runMarketContextAnalysis'), OUTSIDE_APP)
    .includes('manifest'), 'de-async runMarketContextAnalysis mutant is rejected');
  ok(boundaryViolations(MODULE.replace(/^function runMarketContextPanel[^\n]*\n/m, ''), OUTSIDE_APP)
    .includes('manifest'), 'dropped runMarketContextPanel mutant is rejected');
  ok(boundaryViolations(MODULE + '\nrunMarketContextPanel();\n', OUTSIDE_APP).includes('top-level-effect'),
    'top-level invocation mutant is rejected');
  ok(boundaryViolations(MODULE + '\ndocument.body;\n', OUTSIDE_APP).includes('top-level-effect'),
    'top-level DOM mutant is rejected');
  ok(boundaryViolations(MODULE + '\nif (S.x) { runMarketContextPanel(); }\n', OUTSIDE_APP).includes('top-level-effect'),
    'top-level control-flow mutant is rejected');
  ok(boundaryViolations(MODULE + '\nvar mcxBoot = 1;\n', OUTSIDE_APP).includes('manifest'),
    'an extra top-level declaration mutant is rejected');
  ok(boundaryViolations(MODULE + '\nfunction runMarketContextPanel() { showView(\'mcx\'); }\n', OUTSIDE_APP)
    .includes('duplicate-owner'), 'duplicate runMarketContextPanel owner mutant is rejected');
  ok(boundaryViolations(MODULE, OUTSIDE_APP + '\nasync function runMarketContextAnalysis() {}\n')
    .includes('competing-owner'), 'a competing later runMarketContextAnalysis owner is rejected');
  ok(boundaryViolations(MODULE + '\nfunction _mcxInit() {}\n', OUTSIDE_APP).includes('owner-overreach'),
    'owner-overreach mutant that drags _mcxInit in is rejected');
  ok(boundaryViolations(MODULE + '\n// _regimeRefresh\n', OUTSIDE_APP).includes('owner-overreach'),
    'owner-overreach mutant that even mentions _regimeRefresh in a comment is rejected');
  ok(boundaryViolations(MODULE.replace('runMarketContextAnalysis();', '_mcxInit();'), OUTSIDE_APP)
    .includes('owner-overreach'), 'an executable _mcxInit call mutant is rejected even though the comment mention is legal');
  ok(boundaryViolations(MODULE + '\nwindow.apexImportJournalTradesJson = apexImportJournalTradesJson;\n', OUTSIDE_APP)
    .includes('exposure-glue-overreach'), 'exposure-glue overreach mutant is rejected');
  ok(boundaryViolations(MODULE.replace('setTimeout', 'x') + '\nsetTimeout(function(){},1);\n', OUTSIDE_APP)
    .includes('foreign-direct-effect'), 'a newly introduced timer mutant is rejected');
  ok(boundaryViolations(MODULE.replace('USA IL WEB SEARCH', 'USE WEB SEARCH'), OUTSIDE_APP)
    .includes('prompt-or-risk-mutation'), 'prompt mutation mutant is rejected');
  ok(boundaryViolations(MODULE.replace('BINARY EVENT RISK: MODERATE', 'BINARY EVENT RISK: MEDIUM'), OUTSIDE_APP)
    .includes('prompt-or-risk-mutation'), 'risk-label mutation mutant is rejected');
  ok(sha256(MODULE.replace('S.marketContextValidMinutes=240', 'S.marketContextValidMinutes=241')) !== MODULE_SHA256,
    'a same-length validity mutation is rejected by the identity pin');
  ok(sha256(MODULE.replace('substring(0,400)', 'substring(0,410)')) !== MODULE_SHA256,
    'a same-length truncation mutation is rejected by the identity pin');
  ok(sha256(MODULE.replace("var riskColor=riskLevel==='CRITICAL'?'var(--rd)'", "var riskColor=riskLevel==='CRITICAL'?'var(--am)'")) !== MODULE_SHA256,
    'a same-length risk-color mutation is rejected by the identity pin');
  // The separator must not drift back into the module, in either direction.
  throws(() => U.undoMcxMacroCheck(INDEX, MODULE + SEPARATOR), /MODULE_IDENTITY/,
    'a module that re-absorbed the separator is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX, MODULE.slice(0, -1)), /MODULE_IDENTITY/,
    'a module missing its own final LF is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG + '\n', '')).includes('tag-count'),
    'missing module tag mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)).includes('tag-count'),
    'duplicate module tag mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(
    BACKUP_RESTORE_TAG + '\n' + MODULE_TAG,
    MODULE_TAG + '\n' + BACKUP_RESTORE_TAG
  )).includes('adjacency'), 'macro-check-before-Backup/Restore reorder mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' defer>'))).includes('classic-tag'),
    'deferred module tag mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' async>'))).includes('classic-tag'),
    'async module tag mutant is rejected');
  ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' type="module">'))).includes('classic-tag'),
    'type="module" tag mutant is rejected');
  // The undo helper must fail closed on every degenerate state.
  throws(() => U.undoMcxMacroCheck(INDEX, MODULE + ' '), /MODULE_IDENTITY/, 'appended-byte module mutant is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX, MODULE.slice(0, -1)), /MODULE_IDENTITY/, 'truncated module mutant is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX, MODULE.replace('240', '241')), /MODULE_IDENTITY/,
    'same-length mutated module is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
    /TAG_IDENTITY/, 'duplicate-tag state is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX.replace(MODULE_TAG + '\n', ''), MODULE), /TAG_IDENTITY/,
    'missing-tag state is rejected');
  throws(() => U.undoMcxMacroCheck(
    INDEX.replace(BACKUP_RESTORE_TAG + '\n' + MODULE_TAG, MODULE_TAG + '\n' + BACKUP_RESTORE_TAG), MODULE),
    /TAG_ADJACENCY/, 'reordered-tag state is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX.replace('mcxResults', 'mcxResultZ'), MODULE), /BASE_IDENTITY/,
    'a same-length edit anywhere in the retained document is rejected');
  throws(() => U.undoMcxMacroCheck(BASE, MODULE), /TAG_IDENTITY/,
    'a partially applied state (module present, tag absent) is rejected');
  throws(() => U.undoMcxMacroCheck(withoutTag + MODULE_TAG + '\n', MODULE), /TAG_ADJACENCY/,
    'a tag appended in the wrong place is rejected');
  throws(() => U.undoMcxMacroCheck(null, MODULE), /BAD_INPUT/, 'a null document is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX, null), /BAD_INPUT/, 'a null module is rejected');
  throws(() => U.undoMcxMacroCheck(INDEX, BACKUP_MODULE), /MODULE_IDENTITY/,
    'a foreign module (Backup/Restore) is rejected');

  // ───────────────────────────────────────────────────────────────────────────
  section('15. Exact production scope and cumulative fallout inventory');
  const changed = changedPaths();
  const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
  eq(changedProduction, ['index.html', MODULE_REL],
    'production footprint is exactly index.html plus the MCX macro-check owner');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent macro-check contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact macro-check undo helper is part of the change');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary macro-check audit file is shipped: the permanent contract replaces it');
  ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
  ok(!changed.some((rel) => rel.endsWith('.md')), 'no documentation changed');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL || rel.startsWith('tests/')),
    'every other changed path is a test artifact');

  const contractsToAdvance = [
    'tests/backend-directional-adapter-boundary-contract.test.js',
    'tests/backend-directional-preview-boundary-contract.test.js',
    'tests/backend-directional-snapshot-boundary-contract.test.js',
    'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
    'tests/journal-backend-write-through-boundary-contract.test.js',
    'tests/journal-backup-restore-boundary-contract.test.js',
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
    ok(source.includes('mcx-macro-check') || source.includes('mcx-macro-check\\.js'),
      rel + ' recognizes the new MCX macro-check owner or the current classic-script tail');
  }

  const report = {
    base: {
      commit: BASE_SHA,
      tree: BASE_TREE,
      subject: BASE_SUBJECT,
      indexChars: BASE.length,
      indexUtf8Bytes: Buffer.byteLength(BASE, 'utf8'),
      indexSha256: sha256(BASE),
    },
    selected: {
      module: MODULE_REL,
      strategy: 'declarations-only relocation of the terminal MCX macro-check owner',
      start: SLICE_AT,
      end: SLICE_END,
      startLine: SLICE_START_LINE,
      endLine: SLICE_END_LINE - 1,
      removedRangeChars: SLICE.length,
      removedRangeUtf8Bytes: Buffer.byteLength(SLICE, 'utf8'),
      removedRangeLf: countLiteral(SLICE, '\n'),
      removedRangeSha256: sha256(SLICE),
      separator: 'the final LF of the removed range is the MCX/EIC structural separator, re-inserted on undo',
      chars: MODULE.length,
      utf8Bytes: Buffer.byteLength(MODULE, 'utf8'),
      lf: countLiteral(MODULE, '\n'),
      sha256: sha256(MODULE),
      owners: EXPECTED_SHAPE,
      dependencies: EXPECTED_DEPENDENCIES,
      effects: EXPECTED_EFFECTS,
    },
    consumers: {
      runMarketContextPanel: 'one inline JavaScript call site',
      _mcxRunMacroCheck: 'one static inline-markup onclick handler',
      runMarketContextAnalysis: 'called only by _mcxRunMacroCheck, inside the owner',
    },
    retainedInline: {
      mcxOwners: RETAINED_INLINE_OWNERS,
      resizeListener: true,
      emptyEicDxlinkMarkers: true,
      journalMarkupAndComments: true,
      manualImportExposureGlue: EXPOSURE_GLUE.trim(),
    },
    extractionContract: {
      productionFiles: ['index.html', MODULE_REL],
      permanentContract: CONTRACT_REL,
      undoHelper: UNDO_REL,
      indexChars: INDEX.length,
      indexUtf8Bytes: Buffer.byteLength(INDEX, 'utf8'),
      indexSha256: sha256(INDEX),
      localScriptCount: LOCAL_SCRIPT_COUNT,
      contractsToAdvance,
    },
    knownConcernsOutOfScope: [
      'agent output is formatted into innerHTML without HTML escaping',
      'risk parsing is exact and case-sensitive (CRITICAL/HIGH/MODERATE, else NONE)',
      'duplicate clicks dispatch overlapping analyses — no in-flight guard',
      'the vixD scanner lookup is computed and never used',
    ],
  };

  console.log('\nMCX_MACRO_CHECK_BOUNDARY_BEGIN');
  console.log(JSON.stringify(report, null, 2));
  console.log('MCX_MACRO_CHECK_BOUNDARY_END');
  console.log('\n' + pass + ' assertions passed');
  console.log('MCX_MACRO_CHECK_BOUNDARY_OK');
})().catch((error) => {
  console.error((error && error.stack) || error);
  process.exit(1);
});
