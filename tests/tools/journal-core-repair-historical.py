#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path('tests')
BRIDGE = "const POST_JOURNAL_MCX3_UNDO = require('./lib/post-journal-mcx-pr3-undo.js');"


def read(rel):
    return Path(rel).read_text(encoding='utf-8')


def write(rel, text):
    Path(rel).write_text(text, encoding='utf-8')


def repl(text, old, new, label, expected=1):
    n = text.count(old)
    if n != expected:
        raise SystemExit(f'REFUSE {label}: expected {expected} exact matches, got {n}')
    return text.replace(old, new, expected)


def regex_repl(text, pattern, replacement, label, expected=1, flags=0):
    out, n = re.subn(pattern, replacement, text, count=expected, flags=flags)
    if n != expected:
        raise SystemExit(f'REFUSE {label}: expected {expected} regex matches, got {n}')
    return out

# 1) Historical reconstruction must undo Journal Core before MCX3.
consumers = {
    'tests/eic-extraction-boundary-contract.test.js': 1,
    'tests/mcx-backend-candles-boundary-contract.test.js': 4,
    'tests/mcx-market-context-boundary-contract.test.js': 1,
    'tests/pess-extraction-boundary-contract.test.js': 1,
    'tests/pretrade-risk-modal-boundary-contract.test.js': 1,
    'tests/pretrade-risk-rules-boundary-contract.test.js': 1,
    'tests/pretrade-technicals-boundary-contract.test.js': 1,
    'tests/sfs-extraction-boundary-contract.test.js': 1,
}
for rel, expected_calls in consumers.items():
    text = read(rel)
    m = re.search(r"const\s+(\w+)\s*=\s*require\(['\"]\./lib/mcx-pr3-undo\.js['\"]\);", text)
    if not m:
        raise SystemExit(f'REFUSE {rel}: mcx-pr3 import not found')
    var = m.group(1)
    if BRIDGE not in text:
        insert_at = m.end()
        text = text[:insert_at] + '\n' + BRIDGE + text[insert_at:]
    pattern = re.escape(var) + r'\.undoMcxPr3\('
    text, n = re.subn(pattern, 'POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(', text)
    if n != expected_calls:
        raise SystemExit(f'REFUSE {rel}: expected {expected_calls} undoMcxPr3 calls, got {n}')
    write(rel, text)

# 2) Directional adapter — Journal Core is now the exact final external script.
rel = 'tests/backend-directional-adapter-boundary-contract.test.js'
t = read(rel)
t = repl(t,
"  eq(mcxBackendTagIdx, inlineTagIdx - 1, 'tag order: the MCX backend-candle owner is now the LAST external classic script before the inline monolith');",
"  const journalTagIdx = SCRIPT_TAGS.findIndex(function (t) { return /journal-core\\.js$/.test(String(t.src || '')); });\n  ok(journalTagIdx >= 0, 'tag order: the Journal Core owner is present');\n  eq(mcxBackendTagIdx, journalTagIdx - 1, 'tag order: the MCX backend-candle owner is immediately before Journal Core');\n  eq(journalTagIdx, inlineTagIdx - 1, 'tag order: Journal Core is the LAST external classic script before the inline monolith');",
'adapter tag tail')
t = repl(t,
"// owners (market context, then VIX market context) were appended after those,\n// shifting these two by eight each.\neq(PART_RANGES.indexOf(adapterPart[0]), PART_RANGES.length - 12,",
"// three MCX owners (market context, VIX market context, backend candles) and then\n// Journal Core were appended after those, shifting these two by nine each.\neq(PART_RANGES.indexOf(adapterPart[0]), PART_RANGES.length - 13,",
'adapter historical offset comment')
t = repl(t,
"eq(PART_RANGES.indexOf(previewPart[0]), PART_RANGES.length - 11,",
"eq(PART_RANGES.indexOf(previewPart[0]), PART_RANGES.length - 12,",
'adapter preview offset')
t = repl(t,
"  eq(PART_RANGES.indexOf(mcxBackendPart[0]), PART_RANGES.length - 2,\n     'ORDER: the MCX backend-candle owner is the last application script before the inline monolith');",
"  const journalPart = PART_RANGES.filter(function (r) { return /journal-core\\.js$/.test(r.src); });\n  eq(journalPart.length, 1, 'ORDER: the Journal Core owner is present exactly once');\n  eq(PART_RANGES.indexOf(mcxBackendPart[0]), PART_RANGES.indexOf(journalPart[0]) - 1,\n     'ORDER: the MCX backend-candle owner is immediately before Journal Core');\n  eq(PART_RANGES.indexOf(journalPart[0]), PART_RANGES.length - 2,\n     'ORDER: Journal Core is the last application script before the inline monolith');",
'adapter part tail')
write(rel, t)

# 3) Directional preview — same exact tail, both parsed-src and raw-tag views.
rel = 'tests/backend-directional-preview-boundary-contract.test.js'
t = read(rel)
t = repl(t,
"  eq(iMcxBackend, srcs.length - 2, 'ORDER: the MCX backend-candle owner is the LAST external script before the inline monolith');",
"  const iJournal = srcs.indexOf('./js/services/journal-core.js');\n  ok(iJournal >= 0, 'index.html loads the Journal Core script');\n  eq(iMcxBackend, iJournal - 1, 'ORDER: the MCX backend-candle owner is immediately before Journal Core');\n  eq(iJournal, srcs.length - 2, 'ORDER: Journal Core is the LAST external script before the inline monolith');",
'preview src tail')
t = repl(t,
"  eq(mcxBackendTagIdx, inlineTagIdx - 1, 'tag order: the MCX backend-candle owner is the LAST script tag before the inline monolith');",
"  const journalTagIdx = TAGS.findIndex(function (t) { return /journal-core\\.js$/.test(clean(t.src)); });\n  ok(journalTagIdx >= 0, 'tag order: the Journal Core owner is present');\n  eq(mcxBackendTagIdx, journalTagIdx - 1, 'tag order: the MCX backend-candle owner is immediately before Journal Core');\n  eq(journalTagIdx, inlineTagIdx - 1, 'tag order: Journal Core is the LAST script tag before the inline monolith');",
'preview raw tag tail')
write(rel, t)

# 4) BSS UI current load-order and exact named inventory.
rel = 'tests/backend-scanner-snapshot-ui-boundary-contract.test.js'
t = read(rel)
t = repl(t,
"  const MCX_BACKEND_REL = './js/services/mcx-backend-candles.js';",
"  const MCX_BACKEND_REL = './js/services/mcx-backend-candles.js';\n  const JOURNAL_CORE_REL = './js/services/journal-core.js';",
'bss journal rel first')
t = repl(t,
"  eq(idx(MCX_BACKEND_REL), SCRIPT_ORDER.length - 2, 'the MCX backend-candle owner is the last external script before the monolith');",
"  eq(idx(MCX_BACKEND_REL), idx(JOURNAL_CORE_REL) - 1, 'the MCX backend-candle owner is immediately before Journal Core');\n  eq(idx(JOURNAL_CORE_REL), SCRIPT_ORDER.length - 2, 'Journal Core is the last external script before the monolith');",
'bss tail last')
t = repl(t,
"[SERVICE_REL, PANEL_REL, ADAPTER_REL, PREVIEW_REL, DSB_ADAPTER_REL, DSB_SERVICE_REL, DSB_PANEL_REL, PRETRADE_REL, PRETRADE_TECH_REL, PRETRADE_MODAL_REL, MCX_REL, MCX_VIX_REL, MCX_BACKEND_REL, '(inline)']",
"[SERVICE_REL, PANEL_REL, ADAPTER_REL, PREVIEW_REL, DSB_ADAPTER_REL, DSB_SERVICE_REL, DSB_PANEL_REL, PRETRADE_REL, PRETRADE_TECH_REL, PRETRADE_MODAL_REL, MCX_REL, MCX_VIX_REL, MCX_BACKEND_REL, JOURNAL_CORE_REL, '(inline)']",
'bss exact tail array')
t = repl(t,
"'ORDER 1 (9), EXACT: historical chain remains contiguous and is followed only by the three PRETRADE owners and both MCX owners before inline'",
"'ORDER 1 (9), EXACT: historical chain remains contiguous through PRETRADE, all three MCX owners and Journal Core before inline'",
'bss tail wording')
t = repl(t,
"  const DECLARED_BEYOND = STRESS_COMPANION_SCRIPTS\n    .concat(PESS_EXTRACTION_SCRIPTS)\n    .concat(EIC_EXTRACTION_SCRIPTS)\n    .concat(PRETRADE_EXTRACTION_SCRIPTS)\n    .concat(MCX_EXTRACTION_SCRIPTS);",
"  const JOURNAL_EXTRACTION_SCRIPTS = ['./js/services/journal-core.js'];\n  const DECLARED_BEYOND = STRESS_COMPANION_SCRIPTS\n    .concat(PESS_EXTRACTION_SCRIPTS)\n    .concat(EIC_EXTRACTION_SCRIPTS)\n    .concat(PRETRADE_EXTRACTION_SCRIPTS)\n    .concat(MCX_EXTRACTION_SCRIPTS)\n    .concat(JOURNAL_EXTRACTION_SCRIPTS);",
'bss declared inventory')
t = repl(t,
"  MCX_EXTRACTION_SCRIPTS.forEach(function (src) {",
"  JOURNAL_EXTRACTION_SCRIPTS.forEach(function (src) {\n    ok(localSrcs.indexOf(src) >= 0, 'the declared Journal Core extraction module is loaded: ' + src);\n  });\n  MCX_EXTRACTION_SCRIPTS.forEach(function (src) {",
'bss journal inventory check')
write(rel, t)

# 5) DSB exact named inventory and total local script count.
rel = 'tests/backend-directional-snapshot-boundary-contract.test.js'
t = read(rel)
t = repl(t,
"const DECLARED_NON_DSB_SCRIPTS = STRESS_COMPANION_SCRIPTS\n  .concat(PESS_EXTRACTION_SCRIPTS)\n  .concat(EIC_EXTRACTION_SCRIPTS)\n  .concat(PRETRADE_EXTRACTION_SCRIPTS)\n  .concat(MCX_EXTRACTION_SCRIPTS);",
"const JOURNAL_EXTRACTION_SCRIPTS = ['./js/services/journal-core.js'];\nconst DECLARED_NON_DSB_SCRIPTS = STRESS_COMPANION_SCRIPTS\n  .concat(PESS_EXTRACTION_SCRIPTS)\n  .concat(EIC_EXTRACTION_SCRIPTS)\n  .concat(PRETRADE_EXTRACTION_SCRIPTS)\n  .concat(MCX_EXTRACTION_SCRIPTS)\n  .concat(JOURNAL_EXTRACTION_SCRIPTS);",
'dsb declared inventory')
t = repl(t,
"eq(LOCAL_SCRIPTS.length + DECLARED_NON_DSB_SCRIPTS.length, 44,\n   'index.html loads 26 local application scripts plus the named Stress, PESS, EIC, PRETRADE and three MCX extraction modules before the inline monolith');",
"eq(LOCAL_SCRIPTS.length + DECLARED_NON_DSB_SCRIPTS.length, 45,\n   'index.html loads 26 local application scripts plus the named Stress, PESS, EIC, PRETRADE, three MCX and Journal Core extraction modules before the inline monolith');",
'dsb current local count')
write(rel, t)

# 6) PESS exact current tail/count + mutation guard.
rel = 'tests/pess-extraction-boundary-contract.test.js'
t = read(rel)
t = repl(t, "// 44 once MCX PR3 added js/services/mcx-backend-candles.js.\nconst LOCAL_SCRIPT_COUNT = 44;",
"// 44 once MCX PR3 added js/services/mcx-backend-candles.js.\n// 45 once Journal Core moved to js/services/journal-core.js.\nconst LOCAL_SCRIPT_COUNT = 45;", 'pess local count const')
old_tail = """eq(A.localSrcs[A.localSrcs.length - 7], './js/ui/backend-directional-snapshot-panel.js',
  '9.11a the DSB panel remains immediately before the three PRETRADE owners and all three MCX owners');
eq(A.localSrcs[A.localSrcs.length - 6], './js/services/pretrade-risk-rules.js',
  '9.11b the PRETRADE risk-rules owner is immediately before the PRETRADE technicals owner');
eq(A.localSrcs[A.localSrcs.length - 5], './js/services/pretrade-technicals.js',
  '9.11c the PRETRADE technicals owner is immediately before the PRETRADE risk-modal owner');
eq(A.localSrcs[A.localSrcs.length - 4], './js/ui/pretrade-risk-modal.js',
  '9.11d the PRETRADE risk-modal owner is immediately before the MCX market-context owner');
eq(A.localSrcs[A.localSrcs.length - 3], './js/services/mcx-market-context.js',
  '9.11e the MCX market-context owner is immediately before the MCX VIX owner');
eq(A.localSrcs[A.localSrcs.length - 2], './js/services/mcx-vix-market-context.js',
  '9.11f the MCX VIX owner is immediately before the MCX backend-candle owner');
eq(A.localSrcs[A.localSrcs.length - 1], './js/services/mcx-backend-candles.js',
  '9.11g the MCX backend-candle owner is the newest local script before the monolith');
eq(A.localSrcs.length, LOCAL_SCRIPT_COUNT, '9.12 index.html now loads 44 local application scripts, including all three PRETRADE owners and all three MCX owners');"""
new_tail = """eq(A.localSrcs[A.localSrcs.length - 8], './js/ui/backend-directional-snapshot-panel.js',
  '9.11a the DSB panel remains immediately before the three PRETRADE owners, all three MCX owners and Journal Core');
eq(A.localSrcs[A.localSrcs.length - 7], './js/services/pretrade-risk-rules.js',
  '9.11b the PRETRADE risk-rules owner is immediately before the PRETRADE technicals owner');
eq(A.localSrcs[A.localSrcs.length - 6], './js/services/pretrade-technicals.js',
  '9.11c the PRETRADE technicals owner is immediately before the PRETRADE risk-modal owner');
eq(A.localSrcs[A.localSrcs.length - 5], './js/ui/pretrade-risk-modal.js',
  '9.11d the PRETRADE risk-modal owner is immediately before the MCX market-context owner');
eq(A.localSrcs[A.localSrcs.length - 4], './js/services/mcx-market-context.js',
  '9.11e the MCX market-context owner is immediately before the MCX VIX owner');
eq(A.localSrcs[A.localSrcs.length - 3], './js/services/mcx-vix-market-context.js',
  '9.11f the MCX VIX owner is immediately before the MCX backend-candle owner');
eq(A.localSrcs[A.localSrcs.length - 2], './js/services/mcx-backend-candles.js',
  '9.11g the MCX backend-candle owner is immediately before Journal Core');
eq(A.localSrcs[A.localSrcs.length - 1], './js/services/journal-core.js',
  '9.11h Journal Core is the newest local script before the monolith');
eq(A.localSrcs.length, LOCAL_SCRIPT_COUNT, '9.12 index.html now loads 45 local application scripts, including PRETRADE, MCX and Journal Core owners');"""
t = repl(t, old_tail, new_tail, 'pess exact tail')
old_guard = """['dsb-tail-preserved', (r) => r.localSrcs[r.localSrcs.length - 7] === './js/ui/backend-directional-snapshot-panel.js' &&
    r.localSrcs[r.localSrcs.length - 6] === './js/services/pretrade-risk-rules.js' &&
    r.localSrcs[r.localSrcs.length - 5] === './js/services/pretrade-technicals.js' &&
    r.localSrcs[r.localSrcs.length - 4] === './js/ui/pretrade-risk-modal.js' &&
    r.localSrcs[r.localSrcs.length - 3] === './js/services/mcx-market-context.js' &&
    r.localSrcs[r.localSrcs.length - 2] === './js/services/mcx-vix-market-context.js' &&
    r.localSrcs[r.localSrcs.length - 1] === './js/services/mcx-backend-candles.js'],"""
new_guard = """['dsb-tail-preserved', (r) => r.localSrcs[r.localSrcs.length - 8] === './js/ui/backend-directional-snapshot-panel.js' &&
    r.localSrcs[r.localSrcs.length - 7] === './js/services/pretrade-risk-rules.js' &&
    r.localSrcs[r.localSrcs.length - 6] === './js/services/pretrade-technicals.js' &&
    r.localSrcs[r.localSrcs.length - 5] === './js/ui/pretrade-risk-modal.js' &&
    r.localSrcs[r.localSrcs.length - 4] === './js/services/mcx-market-context.js' &&
    r.localSrcs[r.localSrcs.length - 3] === './js/services/mcx-vix-market-context.js' &&
    r.localSrcs[r.localSrcs.length - 2] === './js/services/mcx-backend-candles.js' &&
    r.localSrcs[r.localSrcs.length - 1] === './js/services/journal-core.js'],"""
t = repl(t, old_guard, new_guard, 'pess mutation tail')
write(rel, t)

# 7) SFS exact current local-script count.
rel = 'tests/sfs-extraction-boundary-contract.test.js'
t = read(rel)
t = repl(t,
"  eq(local.length, 44, '4.9 index.html loads 44 local application scripts, including the three PRETRADE owners and all three MCX owners');",
"  eq(local.length, 45, '4.9 index.html loads 45 local application scripts, including PRETRADE, all three MCX owners and Journal Core');",
'sfs local count')
write(rel, t)

# 8) MCX2 current successor is Journal Core after MCX3, not inline.
rel = 'tests/mcx-vix-market-context-boundary-contract.test.js'
t = read(rel)
t = repl(t,
"const mcx3Tag = '<script src=\"./' + MCX3_REL + '\"></script>';",
"const mcx3Tag = '<script src=\"./' + MCX3_REL + '\"></script>';\nconst journalTag = '<script src=\"./js/services/journal-core.js\"></script>';",
'mcx2 journal tag')
t = repl(t,
"ok((INDEX.split(mcx3Tag).length - 1) === 1, 'exactly one MCX-3 service script tag exists');",
"ok((INDEX.split(mcx3Tag).length - 1) === 1, 'exactly one MCX-3 service script tag exists');\nok((INDEX.split(journalTag).length - 1) === 1, 'exactly one Journal Core script tag exists');",
'mcx2 journal tag count')
t = repl(t,
"ok(mcx3At > tagAt && afterMcx3At > mcx3At && !/\\bsrc\\s*=/i.test(afterMcx3Tag),\n  'MCX-3 loads immediately before the residual inline application script');",
"ok(mcx3At > tagAt && afterMcx3Tag === '<script src=\"./js/services/journal-core.js\">',\n  'MCX-3 loads immediately before Journal Core');\nconst journalAt = INDEX.indexOf(journalTag);\nconst afterJournalAt = INDEX.indexOf('<script', journalAt + journalTag.length);\nconst afterJournalEnd = afterJournalAt >= 0 ? INDEX.indexOf('>', afterJournalAt) : -1;\nconst afterJournalTag = afterJournalEnd >= 0 ? INDEX.slice(afterJournalAt, afterJournalEnd + 1) : '';\nok(journalAt > mcx3At && afterJournalAt > journalAt && !/\\bsrc\\s*=/i.test(afterJournalTag),\n  'Journal Core loads immediately before the residual inline application script');",
'mcx2 successor')
write(rel, t)

# 9) MCX3 boundary current tail now includes Journal Core.
rel = 'tests/mcx-backend-candles-boundary-contract.test.js'
t = read(rel)
t = repl(t,
"const MCX3_TAG = '<script src=\"./js/services/mcx-backend-candles.js\"></script>';",
"const MCX3_TAG = '<script src=\"./js/services/mcx-backend-candles.js\"></script>';\nconst JOURNAL_TAG = '<script src=\"./js/services/journal-core.js\"></script>';",
'mcx3 journal tag')
t = repl(t,
"eq(INDEX.slice(mcx1At, inlineAt), MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n',\n  'MCX tail is contiguous and ordered MCX1 -> MCX2 -> MCX3 -> inline');\nok(mcx1At >= 0 && mcx2At > mcx1At && mcx3At > mcx2At && inlineAt > mcx3At,\n  'MCX3 loads synchronously after its predecessors and before residual inline code');",
"eq(INDEX.slice(mcx1At, inlineAt), MCX1_TAG + '\\n' + MCX2_TAG + '\\n' + MCX3_TAG + '\\n' + JOURNAL_TAG + '\\n',\n  'service tail is contiguous MCX1 -> MCX2 -> MCX3 -> Journal Core -> inline');\nconst journalAt = INDEX.indexOf(JOURNAL_TAG);\nok(mcx1At >= 0 && mcx2At > mcx1At && mcx3At > mcx2At && journalAt > mcx3At && inlineAt > journalAt,\n  'MCX3 loads synchronously after its predecessors and immediately before Journal Core');",
'mcx3 current tail')
write(rel, t)

# 10) Cumulative production footprints in older extraction contracts must name
# the new production owner explicitly; lists remain exact, never wildcarded.
footprints = {
 'tests/mcx-market-context-boundary-contract.test.js': (
  "const BACKEND_CANDLES_REL = 'js/services/mcx-backend-candles.js';\nsame(changedProduction, ['index.html', MODULE_REL, VIX_MODULE_REL, BACKEND_CANDLES_REL].sort(), 'production footprint is exactly index.html + all three MCX owners');",
  "const BACKEND_CANDLES_REL = 'js/services/mcx-backend-candles.js';\nconst JOURNAL_CORE_REL = 'js/services/journal-core.js';\nsame(changedProduction, ['index.html', MODULE_REL, VIX_MODULE_REL, BACKEND_CANDLES_REL, JOURNAL_CORE_REL].sort(), 'production footprint is exactly index.html + all three MCX owners + Journal Core');"),
 'tests/pretrade-risk-modal-boundary-contract.test.js': (
  "const MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';\nsame(changedProduction,['index.html',MODULE_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL].sort(),'production footprint is exactly index.html + the modal owner + all three MCX owners');",
  "const MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';\nconst JOURNAL_CORE_REL='js/services/journal-core.js';\nsame(changedProduction,['index.html',MODULE_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL,JOURNAL_CORE_REL].sort(),'production footprint is exactly index.html + the modal owner + all three MCX owners + Journal Core');"),
 'tests/pretrade-technicals-boundary-contract.test.js': (
  "const MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';\nsame(changedProduction,['index.html',MODULE_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL].sort(),'production footprint is exactly index.html + technical owner + risk-modal owner + all three MCX owners');",
  "const MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';\nconst JOURNAL_CORE_REL='js/services/journal-core.js';\nsame(changedProduction,['index.html',MODULE_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL,JOURNAL_CORE_REL].sort(),'production footprint is exactly index.html + technical owner + risk-modal owner + all three MCX owners + Journal Core');"),
 'tests/pretrade-risk-rules-boundary-contract.test.js': (
  "const allowedProduction=['index.html',MODULE_REL,TECHNICALS_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL];",
  "const JOURNAL_CORE_REL='js/services/journal-core.js';\nconst allowedProduction=['index.html',MODULE_REL,TECHNICALS_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL,JOURNAL_CORE_REL];"),
}
for rel, (old, new) in footprints.items():
    t = read(rel)
    t = repl(t, old, new, rel + ' production footprint')
    write(rel, t)

print('Journal Core historical repair prepared successfully.')
