'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX-2 VIX / market-context data-service extraction boundary contract.
//
// Audited base: dev-clean @ a3111a13ad1586e54ebef0d3c079fd8966ba3d03
// Scope: relocation only. The 13 declarations below move from index.html into
// one classic-script service while the two MCX-1 owners already extracted by
// PR #386 stay in js/services/mcx-market-context.js.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { loadIndexHtml, loadAppJavaScriptSource } = require('./lib/load-app-source');

const BASE_SHA = 'a3111a13ad1586e54ebef0d3c079fd8966ba3d03';
const MODULE_REL = 'js/services/mcx-vix-market-context.js';
const MCX1_REL = 'js/services/mcx-market-context.js';
const MCX3_REL = 'js/services/mcx-backend-candles.js';
const REGIME_REL = 'js/services/mcx-regime-policy.js';
const JOURNAL_UI_REL = 'js/ui/journal-ui.js';
const JOURNAL_REMOTE_REL = 'js/services/journal-remote-persistence.js';
const JOURNAL_WRITE_THROUGH_REL = 'js/services/journal-backend-write-through.js';
const JOURNAL_MIGRATION_REL = 'js/services/journal-migration.js';
const JOURNAL_MANUAL_IMPORT_REL = 'js/services/journal-manual-import.js';
const JOURNAL_BACKUP_RESTORE_REL = 'js/ui/journal-backup-restore.js';
const MCX_MACRO_CHECK_REL = 'js/ui/mcx-macro-check.js';
const MCX_CHARTS_REL = 'js/ui/mcx-charts.js';
const EXPECTED_MODULE_GIT_BLOB = '33234d066296387ec72eb2f6fb43a876784111f0';
const MODULE = fs.readFileSync(path.join(__dirname, '..', MODULE_REL), 'utf8');
const INDEX = loadIndexHtml();
const APP = loadAppJavaScriptSource();

const ORDER = [
  '_vixFamilyTimestampMs',
  '_vixFamilyHasAnyValue',
  '_applyFreshVixFamily',
  'fetchVixFamily',
  '_vixFamilyPending',
  '_cachePortfolioMarketContextSnapshot',
  'fetchMarketContextSnapshotFromBackend',
  'fetchMarketContextVixFamilyFromBackend',
  '_normalizeBackendVixFamily',
  '_applyNormalizedVixFamily',
  '_applyBackendVixFamily',
  '_fetchVixFamilyBackendFirst',
  '_vixFamilyDirectWsFallbackAllowed',
];

const MCX1_OWNERS = [
  '_mcxFiniteNum',
  '_mcxApplyBackendSnapshot',
];

const OUTSIDE = [
  ...MCX1_OWNERS,
  '_mcxUpdateSnapshotStatus',
  '_mcxBackendTech',
  '_mcxFormatTechValue',
  '_mcxTechBiasLabel',
  '_mcxPriceVsSmaLabel',
  '_mcxSqueezeLabel',
  '_mcxRenderBackendTechnicalSummary',
  '_mcxRefreshVixData',
  '_ensureVixFamily',
  'refreshSharedMarketRegime',
  'computeMarketRegime',
  'ffMcxBackendSnapshot',
];

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log('  PASS  ' + msg);
  } else {
    failed++;
    console.log('  FAIL  ' + msg);
  }
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from('blob ' + body.length + '\0', 'utf8'))
    .update(body)
    .digest('hex');
}

function functionCount(src, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g');
  return (src.match(re) || []).length;
}

function extractFunctionSpan(src, name) {
  const prefixes = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const prefix of prefixes) {
    const at = src.indexOf(prefix);
    if (at >= 0 && (start < 0 || at < start)) start = at;
  }
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  if (open < 0) return null;

  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; i++; }
      continue;
    }
    if (stringQuote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === stringQuote) stringQuote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === "'" || c === '"' || c.charCodeAt(0) === 96) { stringQuote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        return { name, start, end: i + 1, source: src.slice(start, i + 1) };
      }
    }
  }
  return null;
}

function pendingSpan(src) {
  const re = /\bvar\s+_vixFamilyPending\s*=\s*null\s*;/g;
  const matches = Array.from(src.matchAll(re));
  if (matches.length !== 1) return null;
  const m = matches[0];
  return { name: '_vixFamilyPending', start: m.index, end: m.index + m[0].length, source: m[0] };
}

function span(src, name) {
  return name === '_vixFamilyPending' ? pendingSpan(src) : extractFunctionSpan(src, name);
}

console.log('MCX-2 VIX market-context boundary contract');
console.log('base=' + BASE_SHA);

// 1. Whole-file identity pins the exact moved bytes as one immutable artifact.
ok(gitBlobSha(MODULE) === EXPECTED_MODULE_GIT_BLOB,
  'MCX-2 service module Git blob identity matches audited extraction');

// 2. Script ownership / load order. MCX-1 must load first because MCX-2 calls its
// shared owners at runtime. MCX3 now follows MCX2; the residual inline app follows MCX3.
const mcx1Tag = '<script src="./' + MCX1_REL + '"></script>';
const tag = '<script src="./' + MODULE_REL + '"></script>';
const mcx3Tag = '<script src="./' + MCX3_REL + '"></script>';
const journalTag = '<script src="./js/services/journal-core.js"></script>';
const regimeTag = '<script src="./' + REGIME_REL + '"></script>';
const journalUiTag = '<script src="./' + JOURNAL_UI_REL + '"></script>';
const journalRemoteTag = '<script src="./' + JOURNAL_REMOTE_REL + '"></script>';
const journalWriteThroughTag = '<script src="./' + JOURNAL_WRITE_THROUGH_REL + '"></script>';
const journalMigrationTag = '<script src="./' + JOURNAL_MIGRATION_REL + '"></script>';
const journalManualImportTag = '<script src="./' + JOURNAL_MANUAL_IMPORT_REL + '"></script>';
ok((INDEX.split(mcx1Tag).length - 1) === 1, 'exactly one MCX-1 script tag exists');
ok((INDEX.split(tag).length - 1) === 1, 'exactly one MCX-2 service script tag exists');
ok((INDEX.split(mcx3Tag).length - 1) === 1, 'exactly one MCX-3 service script tag exists');
ok((INDEX.split(journalTag).length - 1) === 1, 'exactly one Journal Core script tag exists');
ok((INDEX.split(regimeTag).length - 1) === 1, 'exactly one Regime Policy script tag exists');
ok((INDEX.split(journalUiTag).length - 1) === 1, 'exactly one Journal UI script tag exists');
ok((INDEX.split(journalRemoteTag).length - 1) === 1, 'exactly one Journal Remote script tag exists');
ok((INDEX.split(journalWriteThroughTag).length - 1) === 1, 'exactly one Journal Write-through script tag exists');
ok((INDEX.split(journalMigrationTag).length - 1) === 1, 'exactly one Journal Migration script tag exists');
ok((INDEX.split(journalManualImportTag).length - 1) === 1, 'exactly one Journal Manual Import script tag exists');
const mcx1At = INDEX.indexOf(mcx1Tag);
const tagAt = INDEX.indexOf(tag);
const nextScriptAt = INDEX.indexOf('<script', tagAt + tag.length);
const nextScriptEnd = nextScriptAt >= 0 ? INDEX.indexOf('>', nextScriptAt) : -1;
const nextTag = nextScriptEnd >= 0 ? INDEX.slice(nextScriptAt, nextScriptEnd + 1) : '';
const mcx3At = INDEX.indexOf(mcx3Tag);
const afterMcx3At = INDEX.indexOf('<script', mcx3At + mcx3Tag.length);
const afterMcx3End = afterMcx3At >= 0 ? INDEX.indexOf('>', afterMcx3At) : -1;
const afterMcx3Tag = afterMcx3End >= 0 ? INDEX.slice(afterMcx3At, afterMcx3End + 1) : '';
ok(mcx1At >= 0 && tagAt > mcx1At, 'MCX-1 loads before MCX-2');
ok(nextTag === '<script src="./' + MCX3_REL + '">', 'MCX-2 loads immediately before MCX-3');
ok(mcx3At > tagAt && afterMcx3Tag === '<script src="./js/services/journal-core.js">',
  'MCX-3 loads immediately before Journal Core');
const journalAt = INDEX.indexOf(journalTag);
const afterJournalAt = INDEX.indexOf('<script', journalAt + journalTag.length);
const afterJournalEnd = afterJournalAt >= 0 ? INDEX.indexOf('>', afterJournalAt) : -1;
const afterJournalTag = afterJournalEnd >= 0 ? INDEX.slice(afterJournalAt, afterJournalEnd + 1) : '';
ok(journalAt > mcx3At && afterJournalTag === '<script src="./' + REGIME_REL + '">',
  'Journal Core loads immediately before Regime Policy');
const regimeAt = INDEX.indexOf(regimeTag);
const afterRegimeAt = INDEX.indexOf('<script', regimeAt + regimeTag.length);
const afterRegimeEnd = afterRegimeAt >= 0 ? INDEX.indexOf('>', afterRegimeAt) : -1;
const afterRegimeTag = afterRegimeEnd >= 0 ? INDEX.slice(afterRegimeAt, afterRegimeEnd + 1) : '';
ok(regimeAt > journalAt && afterRegimeTag === '<script src="./' + JOURNAL_UI_REL + '">',
  'Regime Policy loads immediately before Journal UI');
const journalUiAt = INDEX.indexOf(journalUiTag);
const afterJournalUiAt = INDEX.indexOf('<script', journalUiAt + journalUiTag.length);
const afterJournalUiEnd = afterJournalUiAt >= 0 ? INDEX.indexOf('>', afterJournalUiAt) : -1;
const afterJournalUiTag = afterJournalUiEnd >= 0 ? INDEX.slice(afterJournalUiAt, afterJournalUiEnd + 1) : '';
ok(journalUiAt > regimeAt && afterJournalUiTag === '<script src="./' + JOURNAL_REMOTE_REL + '">',
  'Journal UI loads immediately before Journal Remote');
const journalRemoteAt = INDEX.indexOf(journalRemoteTag);
const afterJournalRemoteAt = INDEX.indexOf('<script', journalRemoteAt + journalRemoteTag.length);
const afterJournalRemoteEnd = afterJournalRemoteAt >= 0 ? INDEX.indexOf('>', afterJournalRemoteAt) : -1;
const afterJournalRemoteTag = afterJournalRemoteEnd >= 0 ? INDEX.slice(afterJournalRemoteAt, afterJournalRemoteEnd + 1) : '';
ok(journalRemoteAt > journalUiAt && afterJournalRemoteTag === '<script src="./' + JOURNAL_WRITE_THROUGH_REL + '">',
  'Journal Remote loads immediately before Journal Write-through');
const journalWriteThroughAt = INDEX.indexOf(journalWriteThroughTag);
const afterJournalWriteThroughAt = INDEX.indexOf('<script', journalWriteThroughAt + journalWriteThroughTag.length);
const afterJournalWriteThroughEnd = afterJournalWriteThroughAt >= 0 ? INDEX.indexOf('>', afterJournalWriteThroughAt) : -1;
const afterJournalWriteThroughTag = afterJournalWriteThroughEnd >= 0
  ? INDEX.slice(afterJournalWriteThroughAt, afterJournalWriteThroughEnd + 1) : '';
ok(journalWriteThroughAt > journalRemoteAt && afterJournalWriteThroughTag === '<script src="./' + JOURNAL_MIGRATION_REL + '">',
  'Journal Write-through loads immediately before Journal Migration');
const journalMigrationAt = INDEX.indexOf(journalMigrationTag);
const afterJournalMigrationAt = INDEX.indexOf('<script', journalMigrationAt + journalMigrationTag.length);
const afterJournalMigrationEnd = afterJournalMigrationAt >= 0 ? INDEX.indexOf('>', afterJournalMigrationAt) : -1;
const afterJournalMigrationTag = afterJournalMigrationEnd >= 0
  ? INDEX.slice(afterJournalMigrationAt, afterJournalMigrationEnd + 1) : '';
ok(journalMigrationAt > journalWriteThroughAt &&
   afterJournalMigrationTag === '<script src="./' + JOURNAL_MANUAL_IMPORT_REL + '">',
  'Journal Migration loads immediately before Journal Manual Import');
const journalManualImportAt = INDEX.indexOf(journalManualImportTag);
const afterManualAt = INDEX.indexOf('<script', journalManualImportAt + journalManualImportTag.length);
const afterManualEnd = afterManualAt >= 0 ? INDEX.indexOf('>', afterManualAt) : -1;
const afterManualTag = afterManualEnd >= 0 ? INDEX.slice(afterManualAt, afterManualEnd + 1) : '';
ok(journalManualImportAt > journalMigrationAt &&
   afterManualTag === '<script src="./' + JOURNAL_BACKUP_RESTORE_REL + '">',
  'Journal Manual Import loads immediately before Journal Backup/Restore');
const journalBackupRestoreTag = '<script src="./' + JOURNAL_BACKUP_RESTORE_REL + '"></script>';
const journalBackupRestoreAt = INDEX.indexOf(journalBackupRestoreTag);
const afterBackupAt = INDEX.indexOf('<script', journalBackupRestoreAt + journalBackupRestoreTag.length);
const afterBackupEnd = afterBackupAt >= 0 ? INDEX.indexOf('>', afterBackupAt) : -1;
const afterBackupTag = afterBackupEnd >= 0 ? INDEX.slice(afterBackupAt, afterBackupEnd + 1) : '';
ok(journalBackupRestoreAt > journalManualImportAt &&
   afterBackupTag === '<script src="./' + MCX_MACRO_CHECK_REL + '">',
  'Journal Backup/Restore loads immediately before the MCX macro-check owner');
const mcxMacroCheckTag = '<script src="./' + MCX_MACRO_CHECK_REL + '"></script>';
const mcxMacroCheckAt = INDEX.indexOf(mcxMacroCheckTag);
const afterMacroAt = INDEX.indexOf('<script', mcxMacroCheckAt + mcxMacroCheckTag.length);
const afterMacroEnd = afterMacroAt >= 0 ? INDEX.indexOf('>', afterMacroAt) : -1;
const afterMacroTag = afterMacroEnd >= 0 ? INDEX.slice(afterMacroAt, afterMacroEnd + 1) : '';
ok(mcxMacroCheckAt > journalBackupRestoreAt &&
   afterMacroTag === '<script src="./' + MCX_CHARTS_REL + '">',
  'the MCX macro-check owner loads immediately before the MCX charts owner');
const mcxChartsTag = '<script src="./' + MCX_CHARTS_REL + '"></script>';
const mcxChartsAt = INDEX.indexOf(mcxChartsTag);
const afterChartsAt = mcxChartsAt >= 0 ? INDEX.indexOf('<script', mcxChartsAt + mcxChartsTag.length) : -1;
const afterChartsEnd = afterChartsAt >= 0 ? INDEX.indexOf('>', afterChartsAt) : -1;
const afterChartsTag = afterChartsEnd >= 0 ? INDEX.slice(afterChartsAt, afterChartsEnd + 1) : '';
// The Apex shared post-auth owner now loads between the charts owner and the
// inline monolith. The invariant is unchanged — both later owners still precede
// the residual inline application script — and is asserted in its current form.
const apexPostAuthOpen = '<script src="./js/services/apex-post-auth-init.js">';
const apexPostAuthTag = apexPostAuthOpen + '</script>';
const afterApexAt = INDEX.indexOf('<script', INDEX.indexOf(apexPostAuthTag) + apexPostAuthTag.length);
const afterApexEnd = afterApexAt >= 0 ? INDEX.indexOf('>', afterApexAt) : -1;
const afterApexTag = afterApexEnd >= 0 ? INDEX.slice(afterApexAt, afterApexEnd + 1) : '';
ok(mcxChartsAt > mcxMacroCheckAt && afterChartsTag === apexPostAuthOpen,
  'the MCX charts owner loads immediately before the Apex shared post-auth owner');
const ttReconnectOpen = '<script src="./js/ui/tt-reconnect.js">';
const ttReconnectTag = ttReconnectOpen + '</script>';
const afterTtAt = INDEX.indexOf('<script', INDEX.indexOf(ttReconnectTag) + ttReconnectTag.length);
const afterTtEnd = afterTtAt >= 0 ? INDEX.indexOf('>', afterTtAt) : -1;
const afterTtTag = afterTtEnd >= 0 ? INDEX.slice(afterTtAt, afterTtEnd + 1) : '';
ok(INDEX.indexOf(apexPostAuthTag) > mcxChartsAt && afterApexTag === ttReconnectOpen,
  'the Apex post-auth owner loads immediately before the TT reconnect owner');
const closeLegsOpen = '<script src="./js/ui/journal-close-legs.js">';
const closeLegsTag = closeLegsOpen + '</script>';
const afterClAt = INDEX.indexOf('<script', INDEX.indexOf(closeLegsTag) + closeLegsTag.length);
const afterClEnd = INDEX.indexOf('>', afterClAt);
const afterClTag = afterClEnd >= 0 ? INDEX.slice(afterClAt, afterClEnd + 1) : '';
ok(INDEX.indexOf(ttReconnectTag) > INDEX.indexOf(apexPostAuthTag) && afterTtTag === closeLegsOpen,
  'the TT reconnect owner loads immediately before the Journal Close Legs owner');
ok(INDEX.indexOf(closeLegsTag) > INDEX.indexOf(ttReconnectTag) && !/\bsrc\s*=/i.test(afterClTag),
  'the Journal Close Legs owner loads immediately before the residual inline application script');
ok(!/\b(?:async|defer|type)\s*=/i.test(tag), 'MCX-2 tag is classic and synchronous');

// 3. Exact moved declaration inventory and order.
const spans = ORDER.map((name) => span(MODULE, name));
ok(spans.every(Boolean), 'all 13 MCX-2 declarations are present');
const actualOrder = spans.filter(Boolean).slice().sort((a, b) => a.start - b.start).map((x) => x.name);
ok(JSON.stringify(actualOrder) === JSON.stringify(ORDER), 'relative order is preserved 13/13');

for (const name of ORDER) {
  if (name === '_vixFamilyPending') {
    ok(!/\bvar\s+_vixFamilyPending\s*=\s*null\s*;/.test(INDEX),
      '_vixFamilyPending has no residual inline declaration');
    ok((APP.match(/\bvar\s+_vixFamilyPending\s*=\s*null\s*;/g) || []).length === 1,
      '_vixFamilyPending has exactly one app-wide declaration');
  } else {
    ok(functionCount(INDEX, name) === 0, name + ' has no residual inline definition');
    ok(functionCount(APP, name) === 1, name + ' has exactly one app-wide definition');
  }
}

// 4. MCX-1 ownership must not be duplicated by MCX-2.
for (const name of MCX1_OWNERS) {
  ok(functionCount(MODULE, name) === 0, name + ' is not redeclared by MCX-2');
  ok(functionCount(APP, name) === 1, name + ' remains exactly one app-wide MCX-1 owner');
}

// 5. Load-time safety: declarations + pending=null evaluate without touching S,
// DOM, storage, network, UI or the MCX-1 runtime owners.
try {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  ok(sandbox._vixFamilyPending === null, 'load-time evaluation preserves pending=null');
  ok(ORDER.every((name) => name in sandbox), 'all 13 MCX-2 globals exist after classic-script evaluation');
} catch (e) {
  console.log(e && e.stack || e);
  ok(false, 'MCX-2 evaluates without load-time dependency access');
  ok(false, 'all 13 MCX-2 globals exist after evaluation');
}
ok(!MODULE.includes('document.'), 'MCX-2 owns no DOM access');
ok(!MODULE.includes('_mcxDraw'), 'MCX-2 owns no MCX rendering');
ok(!MODULE.includes('setInterval('), 'MCX-2 creates no recurring timer');

// 6. Presentation/orchestration/shared MCX-1 owners deliberately stay outside.
for (const name of OUTSIDE) {
  ok(functionCount(MODULE, name) === 0, name + ' stays outside MCX-2');
  ok(functionCount(APP, name) === 1, name + ' remains available app-wide');
}

// 7. Critical behaviour invariants of the verbatim-relocated service.
const cascade = span(MODULE, '_fetchVixFamilyBackendFirst').source;
const iSnapshot = cascade.indexOf('fetchMarketContextSnapshotFromBackend(');
const iDedicated = cascade.indexOf('fetchMarketContextVixFamilyFromBackend(');
const iDxlink = cascade.indexOf('fetchVixFamily(');
ok(iSnapshot >= 0 && iDedicated > iSnapshot && iDxlink > iDedicated,
  'VIX source cascade remains snapshot -> dedicated backend -> DXLink');

const normalizer = span(MODULE, '_normalizeBackendVixFamily').source;
ok(normalizer.includes('vf.vix3m != null ? vf.vix3m : vf.vi3m'),
  'vi3m -> vix3m compatibility remains unchanged');

const freshness = span(MODULE, '_applyFreshVixFamily').source;
const guardAt = freshness.indexOf('_vixFamilyHasAnyValue(newVf)');
const writeAt = freshness.indexOf('S.vixFamily = newVf');
ok(guardAt >= 0 && writeAt > guardAt,
  'all-null guard still runs before S.vixFamily assignment');

const ensure = span(APP, '_ensureVixFamily');
ok(!!ensure && ensure.source.includes('_vixFamilyPending'),
  'inline orchestrator still consumes moved single-flight state');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('ALL TESTS PASSED');
