'use strict';
const fs = require('fs');

const changed = [];
function read(file){ return fs.readFileSync(file, 'utf8'); }
function write(file, src, before){
  if (src === before) throw new Error('NO_CHANGE:' + file);
  fs.writeFileSync(file, src);
  changed.push(file);
}
function one(src, needle, replacement, label){
  const n = src.split(needle).length - 1;
  if (n !== 1) throw new Error(label + ': expected 1 exact match, got ' + n);
  return src.replace(needle, replacement);
}
function replaceChecked(src, re, replacement, label, expected){
  const m = src.match(re) || [];
  if (m.length !== expected) throw new Error(label + ': expected ' + expected + ' matches, got ' + m.length);
  return src.replace(re, replacement);
}

function patchAdapter(){
  const file = 'tests/backend-directional-adapter-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "eq(journalTagIdx, inlineTagIdx - 1, 'tag order: Journal Core is the LAST external classic script before the inline monolith');",
    "const regimeTagIdx = SCRIPT_TAGS.findIndex(function (t) { return /mcx-regime-policy\\.js$/.test(String(t.src || '')); });\n  ok(regimeTagIdx >= 0, 'tag order: the Regime Policy owner is present');\n  eq(journalTagIdx, regimeTagIdx - 1, 'tag order: Journal Core is immediately before Regime Policy');\n  eq(regimeTagIdx, inlineTagIdx - 1, 'tag order: Regime Policy is the LAST external classic script before the inline monolith');",
    'adapter tag tail');
  src = one(src, 'PART_RANGES.length - 13', 'PART_RANGES.length - 14', 'adapter part offset');
  src = one(src, 'PART_RANGES.length - 12', 'PART_RANGES.length - 13', 'preview part offset');
  src = one(src,
    "eq(PART_RANGES.indexOf(journalPart[0]), PART_RANGES.length - 2,\n     'ORDER: Journal Core is the last application script before the inline monolith');",
    "const regimePart = PART_RANGES.filter(function (r) { return /mcx-regime-policy\\.js$/.test(r.src); });\n  eq(regimePart.length, 1, 'ORDER: the Regime Policy owner is present exactly once');\n  eq(PART_RANGES.indexOf(journalPart[0]), PART_RANGES.indexOf(regimePart[0]) - 1,\n     'ORDER: Journal Core is immediately before Regime Policy');\n  eq(PART_RANGES.indexOf(regimePart[0]), PART_RANGES.length - 2,\n     'ORDER: Regime Policy is the last application script before the inline monolith');",
    'adapter part tail');
  write(file, src, before);
}

function patchPreview(){
  const file = 'tests/backend-directional-preview-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "eq(iJournal, srcs.length - 2, 'ORDER: Journal Core is the LAST external script before the inline monolith');",
    "const iRegime = srcs.indexOf('./js/services/mcx-regime-policy.js');\n  ok(iRegime >= 0, 'index.html loads the Regime Policy script');\n  eq(iJournal, iRegime - 1, 'ORDER: Journal Core is immediately before Regime Policy');\n  eq(iRegime, srcs.length - 2, 'ORDER: Regime Policy is the LAST external script before the inline monolith');",
    'preview source tail');
  src = one(src,
    "eq(journalTagIdx, inlineTagIdx - 1, 'tag order: Journal Core is the LAST script tag before the inline monolith');",
    "const regimeTagIdx = TAGS.findIndex(function (t) { return /mcx-regime-policy\\.js$/.test(clean(t.src)); });\n  ok(regimeTagIdx >= 0, 'tag order: the Regime Policy owner is present');\n  eq(journalTagIdx, regimeTagIdx - 1, 'tag order: Journal Core is immediately before Regime Policy');\n  eq(regimeTagIdx, inlineTagIdx - 1, 'tag order: Regime Policy is the LAST script tag before the inline monolith');",
    'preview tag tail');
  write(file, src, before);
}

function patchDsb(){
  const file = 'tests/backend-directional-snapshot-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "const JOURNAL_EXTRACTION_SCRIPTS = ['./js/services/journal-core.js'];",
    "const JOURNAL_EXTRACTION_SCRIPTS = ['./js/services/journal-core.js'];\nconst REGIME_POLICY_EXTRACTION_SCRIPTS = ['./js/services/mcx-regime-policy.js'];",
    'dsb regime inventory');
  src = one(src,
    '.concat(JOURNAL_EXTRACTION_SCRIPTS);',
    '.concat(JOURNAL_EXTRACTION_SCRIPTS)\n  .concat(REGIME_POLICY_EXTRACTION_SCRIPTS);',
    'dsb inventory concat');
  write(file, src, before);
}

function patchBss(){
  const file = 'tests/backend-scanner-snapshot-ui-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "const JOURNAL_CORE_REL = './js/services/journal-core.js';",
    "const JOURNAL_CORE_REL = './js/services/journal-core.js';\n  const REGIME_POLICY_REL = './js/services/mcx-regime-policy.js';",
    'bss order regime rel');
  src = one(src,
    "eq(idx(JOURNAL_CORE_REL), SCRIPT_ORDER.length - 2, 'Journal Core is the last external script before the monolith');",
    "eq(idx(JOURNAL_CORE_REL), idx(REGIME_POLICY_REL) - 1, 'Journal Core is immediately before Regime Policy');\n  eq(idx(REGIME_POLICY_REL), SCRIPT_ORDER.length - 2, 'Regime Policy is the last external script before the monolith');",
    'bss order tail');
  src = one(src,
    '[SERVICE_REL, PANEL_REL, ADAPTER_REL, PREVIEW_REL, DSB_ADAPTER_REL, DSB_SERVICE_REL, DSB_PANEL_REL, PRETRADE_REL, PRETRADE_TECH_REL, PRETRADE_MODAL_REL, MCX_REL, MCX_VIX_REL, MCX_BACKEND_REL, JOURNAL_CORE_REL, \'(inline)\']',
    '[SERVICE_REL, PANEL_REL, ADAPTER_REL, PREVIEW_REL, DSB_ADAPTER_REL, DSB_SERVICE_REL, DSB_PANEL_REL, PRETRADE_REL, PRETRADE_TECH_REL, PRETRADE_MODAL_REL, MCX_REL, MCX_VIX_REL, MCX_BACKEND_REL, JOURNAL_CORE_REL, REGIME_POLICY_REL, \'(inline)\']',
    'bss exact chain');
  src = one(src,
    "const JOURNAL_EXTRACTION_SCRIPTS = ['./js/services/journal-core.js'];",
    "const JOURNAL_EXTRACTION_SCRIPTS = ['./js/services/journal-core.js'];\n  const REGIME_POLICY_EXTRACTION_SCRIPTS = ['./js/services/mcx-regime-policy.js'];",
    'bss regime inventory');
  src = one(src,
    '.concat(JOURNAL_EXTRACTION_SCRIPTS);',
    '.concat(JOURNAL_EXTRACTION_SCRIPTS)\n    .concat(REGIME_POLICY_EXTRACTION_SCRIPTS);',
    'bss inventory concat');
  src = one(src,
    "JOURNAL_EXTRACTION_SCRIPTS.forEach(function (src) {\n    ok(localSrcs.indexOf(src) >= 0, 'the declared Journal Core extraction module is loaded: ' + src);\n  });",
    "JOURNAL_EXTRACTION_SCRIPTS.forEach(function (src) {\n    ok(localSrcs.indexOf(src) >= 0, 'the declared Journal Core extraction module is loaded: ' + src);\n  });\n  REGIME_POLICY_EXTRACTION_SCRIPTS.forEach(function (src) {\n    ok(localSrcs.indexOf(src) >= 0, 'the declared Regime Policy extraction module is loaded: ' + src);\n  });",
    'bss inventory proof');
  write(file, src, before);
}

function patchJournal(){
  const file = 'tests/journal-core-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src, "const U = require('./lib/journal-core-undo.js');", "const U = require('./lib/journal-core-undo.js');\nconst REGIME_U = require('./lib/mcx-regime-policy-undo.js');", 'journal undo require');
  src = one(src, "const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');", "const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');\nconst REGIME_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/mcx-regime-policy.js'), 'utf8');", 'journal regime module');
  src = one(src, "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';", "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';\nconst REGIME_TAG = '<script src=\"./js/services/mcx-regime-policy.js\"></script>';", 'journal regime tag');
  src = one(src, "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n',", "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n' + REGIME_TAG + '\\n',", 'journal tail');
  src = one(src, "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> inline');", "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> Regime Policy -> inline');", 'journal tail message');
  src = one(src, 'const rebuilt = U.undoJournalCore(INDEX, MODULE);', 'const preRegime = REGIME_U.undoRegimePolicy(INDEX, REGIME_MODULE);\nconst rebuilt = U.undoJournalCore(preRegime, MODULE);', 'journal newest-first undo');
  write(file, src, before);
}

function patchRegimeNakedCalls(){
  const file = 'tests/regime-naked-calls.test.js';
  const before = read(file); let src = before;
  src = one(src, "const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();", "const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();\nconst REGIME_POLICY = fs.readFileSync(path.join(__dirname, '..', 'js/services/mcx-regime-policy.js'), 'utf8');", 'regime harness module');
  src = one(src, "const code = extractBlock(HTML, 'var _REGIME_ADJ_RULES', 'function _mcxDrawVixCurve');", "const code = REGIME_POLICY + '\\n' + extractBlock(HTML, 'var _REGIME_LS_KEY', 'function _mcxDrawVixCurve');", 'regime harness source');
  write(file, src, before);
}

function patchMcx3(){
  const file = 'tests/mcx-backend-candles-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src, "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';", "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';\nconst REGIME_TAG = '<script src=\"./js/services/mcx-regime-policy.js\"></script>';", 'mcx3 regime tag');
  src = one(src, "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n',", "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n' + REGIME_TAG + '\\n',", 'mcx3 tail');
  src = one(src, "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> inline');", "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> Regime Policy -> inline');", 'mcx3 tail message');
  write(file, src, before);
}

function patchMcx2(){
  const file = 'tests/mcx-vix-market-context-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src, "const MCX3_REL = 'js/services/mcx-backend-candles.js';", "const MCX3_REL = 'js/services/mcx-backend-candles.js';\nconst REGIME_REL = 'js/services/mcx-regime-policy.js';", 'mcx2 regime rel');
  src = one(src, "const journalTag = '<script src=\"./js/services/journal-core.js\"></script>';", "const journalTag = '<script src=\"./js/services/journal-core.js\"></script>';\nconst regimeTag = '<script src=\"./' + REGIME_REL + '\"></script>';", 'mcx2 regime tag');
  src = one(src, "ok((INDEX.split(journalTag).length - 1) === 1, 'exactly one Journal Core script tag exists');", "ok((INDEX.split(journalTag).length - 1) === 1, 'exactly one Journal Core script tag exists');\nok((INDEX.split(regimeTag).length - 1) === 1, 'exactly one Regime Policy script tag exists');", 'mcx2 regime count');
  const oldBlock = "const journalAt = INDEX.indexOf(journalTag);\nconst afterJournalAt = INDEX.indexOf('<script', journalAt + journalTag.length);\nconst afterJournalEnd = afterJournalAt >= 0 ? INDEX.indexOf('>', afterJournalAt) : -1;\nconst afterJournalTag = afterJournalEnd >= 0 ? INDEX.slice(afterJournalAt, afterJournalEnd + 1) : '';\nok(journalAt > mcx3At && afterJournalAt > journalAt && !/\\bsrc\\s*=/i.test(afterJournalTag),\n  'Journal Core loads immediately before the residual inline application script');";
  const newBlock = "const journalAt = INDEX.indexOf(journalTag);\nconst afterJournalAt = INDEX.indexOf('<script', journalAt + journalTag.length);\nconst afterJournalEnd = afterJournalAt >= 0 ? INDEX.indexOf('>', afterJournalAt) : -1;\nconst afterJournalTag = afterJournalEnd >= 0 ? INDEX.slice(afterJournalAt, afterJournalEnd + 1) : '';\nok(journalAt > mcx3At && afterJournalTag === '<script src=\"./' + REGIME_REL + '\">',\n  'Journal Core loads immediately before Regime Policy');\nconst regimeAt = INDEX.indexOf(regimeTag);\nconst afterRegimeAt = INDEX.indexOf('<script', regimeAt + regimeTag.length);\nconst afterRegimeEnd = afterRegimeAt >= 0 ? INDEX.indexOf('>', afterRegimeAt) : -1;\nconst afterRegimeTag = afterRegimeEnd >= 0 ? INDEX.slice(afterRegimeAt, afterRegimeEnd + 1) : '';\nok(regimeAt > journalAt && afterRegimeAt > regimeAt && !/\\bsrc\\s*=/i.test(afterRegimeTag),\n  'Regime Policy loads immediately before the residual inline application script');";
  src = one(src, oldBlock, newBlock, 'mcx2 successor block');
  write(file, src, before);
}

function patchProductionFootprint(file){
  const before = read(file); let src = before;
  const anchor = 'same(changedProduction, [';
  const start = src.indexOf(anchor);
  if (start < 0 || src.indexOf(anchor, start + 1) >= 0) throw new Error(file + ': unique changedProduction assertion not found');
  const end = src.indexOf('].sort()', start);
  if (end < 0) throw new Error(file + ': changedProduction array end not found');
  const body = src.slice(start + anchor.length, end);
  if (body.includes('mcx-regime-policy.js')) throw new Error(file + ': regime footprint already present');
  const trimmed = body.replace(/\s+$/, '');
  const comma = trimmed.trim().endsWith(',') ? '' : ',';
  src = src.slice(0, start + anchor.length) + trimmed + comma + " 'js/services/mcx-regime-policy.js'" + src.slice(end);
  write(file, src, before);
}

function patchPess(){
  const file = 'tests/pess-extraction-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src, 'const LOCAL_SCRIPT_COUNT = 45;', 'const LOCAL_SCRIPT_COUNT = 46;', 'pess local count');
  for (let n = 8; n >= 1; n--) {
    src = one(src, 'A.localSrcs[A.localSrcs.length - ' + n + ']', 'A.localSrcs[A.localSrcs.length - ' + (n + 1) + ']', 'pess tail A -' + n);
  }
  src = one(src,
    "eq(A.localSrcs[A.localSrcs.length - 2], './js/services/journal-core.js',\n  '9.11h Journal Core is the newest local script before the monolith');",
    "eq(A.localSrcs[A.localSrcs.length - 2], './js/services/journal-core.js',\n  '9.11h Journal Core is immediately before Regime Policy');\neq(A.localSrcs[A.localSrcs.length - 1], './js/services/mcx-regime-policy.js',\n  '9.11i Regime Policy is the newest local script before the monolith');",
    'pess journal/regime tail');
  src = src.split('45 local application scripts').join('46 local application scripts');
  for (let n = 8; n >= 1; n--) {
    const needle = 'r.localSrcs[r.localSrcs.length - ' + n + ']';
    const count = src.split(needle).length - 1;
    if (count !== 1) throw new Error('pess guard -' + n + ': expected 1, got ' + count);
    src = src.replace(needle, 'r.localSrcs[r.localSrcs.length - ' + (n + 1) + ']');
  }
  src = one(src,
    "r.localSrcs[r.localSrcs.length - 2] === './js/services/journal-core.js'",
    "r.localSrcs[r.localSrcs.length - 2] === './js/services/journal-core.js' &&\n    r.localSrcs[r.localSrcs.length - 1] === './js/services/mcx-regime-policy.js'",
    'pess regime guard');
  write(file, src, before);
}

function patchSfs(){
  const file = 'tests/sfs-extraction-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "eq(local.length, 45, '4.9 index.html loads 45 local application scripts, including PRETRADE, all three MCX owners and Journal Core');",
    "eq(local.length, 46, '4.9 index.html loads 46 local application scripts, including PRETRADE, all three MCX owners, Journal Core and Regime Policy');",
    'sfs local script count');
  write(file, src, before);
}

patchAdapter();
patchPreview();
patchDsb();
patchBss();
patchJournal();
patchMcx3();
patchMcx2();
patchRegimeNakedCalls();
patchPess();
patchSfs();
[
  'tests/mcx-market-context-boundary-contract.test.js',
  'tests/pretrade-risk-modal-boundary-contract.test.js',
  'tests/pretrade-risk-rules-boundary-contract.test.js',
  'tests/pretrade-technicals-boundary-contract.test.js',
].forEach(patchProductionFootprint);

if (changed.length !== 14) throw new Error('EXPECTED_14_CONSUMERS_GOT_' + changed.length);
console.log('patched ' + changed.length + ' historical consumers');
for (const f of changed) console.log('  ' + f);
