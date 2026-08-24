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
function regexOne(src, re, replacement, label){
  const m = src.match(re);
  if (!m || m.length !== 1) throw new Error(label + ': expected one regex match');
  return src.replace(re, replacement);
}

function addRegimeToNamedExtractionInventory(file){
  const before = read(file);
  let src = before;
  const journalDecl = "const JOURNAL_EXTRACTION_SCRIPTS = ['./js/services/journal-core.js'];";
  if (src.includes(journalDecl) && !src.includes('REGIME_POLICY_EXTRACTION_SCRIPTS')) {
    src = one(src, journalDecl,
      journalDecl + "\nconst REGIME_POLICY_EXTRACTION_SCRIPTS = ['./js/services/mcx-regime-policy.js'];",
      file + ':journal inventory');
  }
  if (src.includes('REGIME_POLICY_EXTRACTION_SCRIPTS') && src.includes('.concat(JOURNAL_EXTRACTION_SCRIPTS);')) {
    src = one(src, '.concat(JOURNAL_EXTRACTION_SCRIPTS);',
      '.concat(JOURNAL_EXTRACTION_SCRIPTS)\n  .concat(REGIME_POLICY_EXTRACTION_SCRIPTS);',
      file + ':declared concat');
  }
  // Some older boundaries name the postdating inventory differently but still
  // carry one exact Journal Core literal in the relevant explicit list.
  if (src === before && src.includes("'./js/services/journal-core.js'")) {
    const re = /(const\s+[A-Z0-9_]*(?:SCRIPT|MODULE)[A-Z0-9_]*\s*=\s*\[[\s\S]{0,2400}?'\.\/js\/services\/journal-core\.js'\s*,?)([\s\S]{0,400}?\];)/;
    const m = src.match(re);
    if (m && !m[0].includes('mcx-regime-policy.js')) {
      src = src.replace(re, '$1\n  \'./js/services/mcx-regime-policy.js\',$2');
    }
  }
  write(file, src, before);
}

function patchJournal(){
  const file = 'tests/journal-core-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "const U = require('./lib/journal-core-undo.js');",
    "const U = require('./lib/journal-core-undo.js');\nconst REGIME_U = require('./lib/mcx-regime-policy-undo.js');",
    'journal undo require');
  src = one(src,
    "const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');",
    "const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');\nconst REGIME_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/mcx-regime-policy.js'), 'utf8');",
    'journal regime module');
  src = one(src,
    "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';",
    "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';\nconst REGIME_TAG = '<script src=\"./js/services/mcx-regime-policy.js\"></script>';",
    'journal regime tag');
  src = one(src,
    "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n',",
    "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n' + REGIME_TAG + '\\n',",
    'journal tail');
  src = one(src,
    "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> inline');",
    "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> Regime Policy -> inline');",
    'journal tail message');
  src = one(src,
    'const rebuilt = U.undoJournalCore(INDEX, MODULE);',
    'const preRegime = REGIME_U.undoRegimePolicy(INDEX, REGIME_MODULE);\nconst rebuilt = U.undoJournalCore(preRegime, MODULE);',
    'journal newest-first undo');
  write(file, src, before);
}

function patchRegimeNakedCalls(){
  const file = 'tests/regime-naked-calls.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();",
    "const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();\nconst REGIME_POLICY = fs.readFileSync(path.join(__dirname, '..', 'js/services/mcx-regime-policy.js'), 'utf8');",
    'regime harness module');
  src = one(src,
    "const code = extractBlock(HTML, 'var _REGIME_ADJ_RULES', 'function _mcxDrawVixCurve');",
    "const code = REGIME_POLICY + '\\n' + extractBlock(HTML, 'var _REGIME_LS_KEY', 'function _mcxDrawVixCurve');",
    'regime harness source');
  write(file, src, before);
}

function patchMcx3(){
  const file = 'tests/mcx-backend-candles-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';",
    "const JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';\nconst REGIME_TAG = '<script src=\"./js/services/mcx-regime-policy.js\"></script>';",
    'mcx3 regime tag');
  src = one(src,
    "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n',",
    "MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n' + REGIME_TAG + '\\n',",
    'mcx3 tail');
  src = one(src,
    "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> inline');",
    "'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> Regime Policy -> inline');",
    'mcx3 tail message');
  write(file, src, before);
}

function patchMcx2(){
  const file = 'tests/mcx-vix-market-context-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "const MCX3_REL = 'js/services/mcx-backend-candles.js';",
    "const MCX3_REL = 'js/services/mcx-backend-candles.js';\nconst REGIME_REL = 'js/services/mcx-regime-policy.js';",
    'mcx2 regime rel');
  src = one(src,
    "const journalTag = '<script src=\"./js/services/journal-core.js\"></script>';",
    "const journalTag = '<script src=\"./js/services/journal-core.js\"></script>';\nconst regimeTag = '<script src=\"./' + REGIME_REL + '\"></script>';",
    'mcx2 regime tag');
  src = one(src,
    "ok((INDEX.split(journalTag).length - 1) === 1, 'exactly one Journal Core script tag exists');",
    "ok((INDEX.split(journalTag).length - 1) === 1, 'exactly one Journal Core script tag exists');\nok((INDEX.split(regimeTag).length - 1) === 1, 'exactly one Regime Policy script tag exists');",
    'mcx2 regime count');
  const oldBlock = "const journalAt = INDEX.indexOf(journalTag);\nconst afterJournalAt = INDEX.indexOf('<script', journalAt + journalTag.length);\nconst afterJournalEnd = afterJournalAt >= 0 ? INDEX.indexOf('>', afterJournalAt) : -1;\nconst afterJournalTag = afterJournalEnd >= 0 ? INDEX.slice(afterJournalAt, afterJournalEnd + 1) : '';\nok(journalAt > mcx3At && afterJournalAt > journalAt && !/\\bsrc\\s*=/i.test(afterJournalTag),\n  'Journal Core loads immediately before the residual inline application script');";
  const newBlock = "const journalAt = INDEX.indexOf(journalTag);\nconst afterJournalAt = INDEX.indexOf('<script', journalAt + journalTag.length);\nconst afterJournalEnd = afterJournalAt >= 0 ? INDEX.indexOf('>', afterJournalAt) : -1;\nconst afterJournalTag = afterJournalEnd >= 0 ? INDEX.slice(afterJournalAt, afterJournalEnd + 1) : '';\nok(journalAt > mcx3At && afterJournalTag === '<script src=\"./' + REGIME_REL + '\">',\n  'Journal Core loads immediately before Regime Policy');\nconst regimeAt = INDEX.indexOf(regimeTag);\nconst afterRegimeAt = INDEX.indexOf('<script', regimeAt + regimeTag.length);\nconst afterRegimeEnd = afterRegimeAt >= 0 ? INDEX.indexOf('>', afterRegimeAt) : -1;\nconst afterRegimeTag = afterRegimeEnd >= 0 ? INDEX.slice(afterRegimeAt, afterRegimeEnd + 1) : '';\nok(regimeAt > journalAt && afterRegimeAt > regimeAt && !/\\bsrc\\s*=/i.test(afterRegimeTag),\n  'Regime Policy loads immediately before the residual inline application script');";
  src = one(src, oldBlock, newBlock, 'mcx2 successor block');
  write(file, src, before);
}

function patchProductionFootprint(file){
  const before = read(file); let src = before;
  if (!src.includes("const REGIME_POLICY_REL = 'js/services/mcx-regime-policy.js';")) {
    const re = /const\s+([A-Z0-9_]*JOURNAL[A-Z0-9_]*REL)\s*=\s*'js\/services\/journal-core\.js';/;
    const m = src.match(re);
    if (!m) throw new Error(file + ': journal rel constant not found');
    src = src.replace(re, m[0] + "\nconst REGIME_POLICY_REL = 'js/services/mcx-regime-policy.js';");
  }
  const reArray = /(same\(changedProduction,\s*\[)([^\]]*?)(\]\.sort\(\))/;
  const m2 = src.match(reArray);
  if (!m2) throw new Error(file + ': changedProduction expected array not found');
  if (!m2[2].includes('REGIME_POLICY_REL')) {
    const body = m2[2].replace(/\s*$/, '');
    const comma = body.trim().endsWith(',') ? '' : ',';
    src = src.replace(reArray, '$1' + body + comma + ' REGIME_POLICY_REL$3');
  }
  write(file, src, before);
}

function patchPess(){
  const file = 'tests/pess-extraction-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src, 'const LOCAL_SCRIPT_COUNT = 45;', 'const LOCAL_SCRIPT_COUNT = 46;', 'pess local count');
  src = src.replace(/localSrcs\.length - (8|7|6|5|4|3|2|1)/g, function(_, n){ return 'localSrcs.length - ' + (Number(n) + 1); });
  const journalAssert = "eq(A.localSrcs[A.localSrcs.length - 2], './js/services/journal-core.js',\n  '9.11h Journal Core is the newest local script before the monolith');";
  if (!src.includes(journalAssert)) throw new Error('pess shifted journal assertion not found');
  src = src.replace(journalAssert, journalAssert.replace('the newest local script before the monolith', 'immediately before Regime Policy') + "\neq(A.localSrcs[A.localSrcs.length - 1], './js/services/mcx-regime-policy.js',\n  '9.11i Regime Policy is the newest local script before the monolith');");
  src = src.replace(/45 local application scripts/g, '46 local application scripts');
  const guardNeedle = "r.localSrcs[r.localSrcs.length - 2] === './js/services/journal-core.js'";
  if (!src.includes(guardNeedle)) throw new Error('pess shifted journal guard not found');
  src = src.replace(guardNeedle, guardNeedle + " &&\n    r.localSrcs[r.localSrcs.length - 1] === './js/services/mcx-regime-policy.js'");
  write(file, src, before);
}

function patchSfs(){
  const file = 'tests/sfs-extraction-boundary-contract.test.js';
  const before = read(file); let src = before;
  let changedAny = false;
  const reps = [
    ['const LOCAL_SCRIPT_COUNT = 45;', 'const LOCAL_SCRIPT_COUNT = 46;'],
    ['const EXPECTED_LOCAL_SCRIPT_COUNT = 45;', 'const EXPECTED_LOCAL_SCRIPT_COUNT = 46;'],
    ['45 local application scripts', '46 local application scripts'],
  ];
  for (const [a,b] of reps) if (src.includes(a)) { src = src.split(a).join(b); changedAny = true; }
  // Direct assertion form used by some revisions.
  src = src.replace(/(4\.9 index\.html loads )45( local application scripts)/g, '$146$2');
  if (src !== before) changedAny = true;
  if (!changedAny) throw new Error('sfs local-script fixture not found');
  write(file, src, before);
}

// Four historical boundary suites failed only because the explicit list of
// postdating extraction modules stopped at Journal Core.
[
  'tests/backend-directional-adapter-boundary-contract.test.js',
  'tests/backend-directional-preview-boundary-contract.test.js',
  'tests/backend-directional-snapshot-boundary-contract.test.js',
  'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
].forEach(addRegimeToNamedExtractionInventory);

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

console.log('patched ' + changed.length + ' historical consumers');
for (const f of changed) console.log('  ' + f);
