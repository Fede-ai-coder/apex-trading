from pathlib import Path


def one(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{path}: {label}: expected one match, got {n}')
    p.write_text(s.replace(old, new, 1))

# PRETRADE cumulative production footprints: later MCX3 is now a named member of
# the measured current production diff. Historical base / reconstruction pins do
# not move.
path = 'tests/pretrade-risk-modal-boundary-contract.test.js'
one(path,
    "const MCX_VIX_MODULE_REL='js/services/mcx-vix-market-context.js';\nsame(changedProduction,['index.html',MODULE_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL].sort(),'production footprint is exactly index.html + the modal owner + both MCX owners');",
    "const MCX_VIX_MODULE_REL='js/services/mcx-vix-market-context.js';\nconst MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';\nsame(changedProduction,['index.html',MODULE_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL].sort(),'production footprint is exactly index.html + the modal owner + all three MCX owners');",
    'risk-modal production footprint')

path = 'tests/pretrade-technicals-boundary-contract.test.js'
one(path,
    "const MCX_VIX_MODULE_REL='js/services/mcx-vix-market-context.js';\nsame(changedProduction,['index.html',MODULE_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL].sort(),'production footprint is exactly index.html + technical owner + risk-modal owner + both MCX owners');",
    "const MCX_VIX_MODULE_REL='js/services/mcx-vix-market-context.js';\nconst MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';\nsame(changedProduction,['index.html',MODULE_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL].sort(),'production footprint is exactly index.html + technical owner + risk-modal owner + all three MCX owners');",
    'technicals production footprint')

path = 'tests/pretrade-risk-rules-boundary-contract.test.js'
one(path,
    "const MCX_VIX_MODULE_REL='js/services/mcx-vix-market-context.js';\nconst allowedProduction=['index.html',MODULE_REL,TECHNICALS_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL];\nconst changedProduction=changed.filter(p=>p==='index.html'||p.startsWith('js/')).sort();\nsame(changedProduction,allowedProduction.slice().sort(),'production footprint is exactly index.html + all three stacked PRETRADE owners + both MCX owners');",
    "const MCX_VIX_MODULE_REL='js/services/mcx-vix-market-context.js';\nconst MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';\nconst allowedProduction=['index.html',MODULE_REL,TECHNICALS_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL];\nconst changedProduction=changed.filter(p=>p==='index.html'||p.startsWith('js/')).sort();\nsame(changedProduction,allowedProduction.slice().sort(),'production footprint is exactly index.html + all three stacked PRETRADE owners + all three MCX owners');",
    'risk-rules production footprint')

# MCX PR1's cumulative production footprint now includes both later MCX owners.
path = 'tests/mcx-market-context-boundary-contract.test.js'
one(path,
    "  const VIX_MODULE_REL = 'js/services/mcx-vix-market-context.js';\n  same(changedProduction, ['index.html', MODULE_REL, VIX_MODULE_REL].sort(), 'production footprint is exactly index.html + the market-context owner + the MCX VIX owner');",
    "  const VIX_MODULE_REL = 'js/services/mcx-vix-market-context.js';\n  const BACKEND_CANDLES_REL = 'js/services/mcx-backend-candles.js';\n  same(changedProduction, ['index.html', MODULE_REL, VIX_MODULE_REL, BACKEND_CANDLES_REL].sort(), 'production footprint is exactly index.html + all three MCX owners');",
    'MCX1 cumulative production footprint')

# SFS current-app script inventory ratchet.
path = 'tests/sfs-extraction-boundary-contract.test.js'
one(path,
    "  eq(local.length, 43, '4.9 index.html loads 43 local application scripts, including the three PRETRADE owners and both MCX owners');",
    "  eq(local.length, 44, '4.9 index.html loads 44 local application scripts, including the three PRETRADE owners and all three MCX owners');",
    'SFS local script count')

# PESS current tail grew by exactly one named MCX owner. Historical PESS
# reconstruction remains newest-first from the already-added PR3 helper.
path = 'tests/pess-extraction-boundary-contract.test.js'
one(path,
    "// 43 once PR #389 added js/services/mcx-vix-market-context.js.\nconst LOCAL_SCRIPT_COUNT = 43;",
    "// 43 once PR #389 added js/services/mcx-vix-market-context.js.\n// 44 once MCX PR3 added js/services/mcx-backend-candles.js.\nconst LOCAL_SCRIPT_COUNT = 44;",
    'PESS local script count')
one(path,
    "eq(A.localSrcs[A.localSrcs.length - 6], './js/ui/backend-directional-snapshot-panel.js',\n  '9.11a the DSB panel remains immediately before the three PRETRADE owners and both MCX owners');\neq(A.localSrcs[A.localSrcs.length - 5], './js/services/pretrade-risk-rules.js',\n  '9.11b the PRETRADE risk-rules owner is immediately before the PRETRADE technicals owner');\neq(A.localSrcs[A.localSrcs.length - 4], './js/services/pretrade-technicals.js',\n  '9.11c the PRETRADE technicals owner is immediately before the PRETRADE risk-modal owner');\neq(A.localSrcs[A.localSrcs.length - 3], './js/ui/pretrade-risk-modal.js',\n  '9.11d the PRETRADE risk-modal owner is immediately before the MCX market-context owner');\neq(A.localSrcs[A.localSrcs.length - 2], './js/services/mcx-market-context.js',\n  '9.11e the MCX market-context owner is immediately before the MCX VIX owner');\neq(A.localSrcs[A.localSrcs.length - 1], './js/services/mcx-vix-market-context.js',\n  '9.11f the MCX VIX owner is the newest local script before the monolith');\neq(A.localSrcs.length, LOCAL_SCRIPT_COUNT, '9.12 index.html now loads 43 local application scripts, including all three PRETRADE owners and both MCX owner');",
    "eq(A.localSrcs[A.localSrcs.length - 7], './js/ui/backend-directional-snapshot-panel.js',\n  '9.11a the DSB panel remains immediately before the three PRETRADE owners and all three MCX owners');\neq(A.localSrcs[A.localSrcs.length - 6], './js/services/pretrade-risk-rules.js',\n  '9.11b the PRETRADE risk-rules owner is immediately before the PRETRADE technicals owner');\neq(A.localSrcs[A.localSrcs.length - 5], './js/services/pretrade-technicals.js',\n  '9.11c the PRETRADE technicals owner is immediately before the PRETRADE risk-modal owner');\neq(A.localSrcs[A.localSrcs.length - 4], './js/ui/pretrade-risk-modal.js',\n  '9.11d the PRETRADE risk-modal owner is immediately before the MCX market-context owner');\neq(A.localSrcs[A.localSrcs.length - 3], './js/services/mcx-market-context.js',\n  '9.11e the MCX market-context owner is immediately before the MCX VIX owner');\neq(A.localSrcs[A.localSrcs.length - 2], './js/services/mcx-vix-market-context.js',\n  '9.11f the MCX VIX owner is immediately before the MCX backend-candle owner');\neq(A.localSrcs[A.localSrcs.length - 1], './js/services/mcx-backend-candles.js',\n  '9.11g the MCX backend-candle owner is the newest local script before the monolith');\neq(A.localSrcs.length, LOCAL_SCRIPT_COUNT, '9.12 index.html now loads 44 local application scripts, including all three PRETRADE owners and all three MCX owners');",
    'PESS concrete tail')
one(path,
    "  ['dsb-tail-preserved', (r) => r.localSrcs[r.localSrcs.length - 6] === './js/ui/backend-directional-snapshot-panel.js' &&\n    r.localSrcs[r.localSrcs.length - 5] === './js/services/pretrade-risk-rules.js' &&\n    r.localSrcs[r.localSrcs.length - 4] === './js/services/pretrade-technicals.js' &&\n    r.localSrcs[r.localSrcs.length - 3] === './js/ui/pretrade-risk-modal.js' &&\n    r.localSrcs[r.localSrcs.length - 2] === './js/services/mcx-market-context.js' &&\n    r.localSrcs[r.localSrcs.length - 1] === './js/services/mcx-vix-market-context.js'],",
    "  ['dsb-tail-preserved', (r) => r.localSrcs[r.localSrcs.length - 7] === './js/ui/backend-directional-snapshot-panel.js' &&\n    r.localSrcs[r.localSrcs.length - 6] === './js/services/pretrade-risk-rules.js' &&\n    r.localSrcs[r.localSrcs.length - 5] === './js/services/pretrade-technicals.js' &&\n    r.localSrcs[r.localSrcs.length - 4] === './js/ui/pretrade-risk-modal.js' &&\n    r.localSrcs[r.localSrcs.length - 3] === './js/services/mcx-market-context.js' &&\n    r.localSrcs[r.localSrcs.length - 2] === './js/services/mcx-vix-market-context.js' &&\n    r.localSrcs[r.localSrcs.length - 1] === './js/services/mcx-backend-candles.js'],",
    'PESS mutant tail guard')

# DSB: remove the incorrect global offset subtraction (both outliers are ABOVE
# both MCX3 slices), but declare MCX3 in the exact current-app script inventory.
path = 'tests/backend-directional-snapshot-boundary-contract.test.js'
one(path,
    "  const MCX3_UNDO_SPANS = require('./lib/mcx-pr3-undo.js');\n  const MCX3_RELOCATED_ABOVE = MCX3_UNDO_SPANS.FUNC_CHARS + MCX3_UNDO_SPANS.SEPARATOR.length + MCX3_UNDO_SPANS.STATE_CHARS;\n  eq(MCX3_RELOCATED_ABOVE, 12006, 'the MCX backend-candle relocation removed exactly 12,006 chars from the monolith');\n  const RELOCATED_ABOVE = MCX_RELOCATED_ABOVE + MCX2_RELOCATED_ABOVE + MCX3_RELOCATED_ABOVE;",
    "  // MCX3's two cuts are BELOW both shared-price outliers, so they do not\n  // contribute to this piecewise 'relocated above' offset.\n  const RELOCATED_ABOVE = MCX_RELOCATED_ABOVE + MCX2_RELOCATED_ABOVE;",
    'DSB piecewise offset repair')
one(path,
    "// Same rule as every list above: a LIST, never an `mcx-*` pattern, so a second\n// MCX owner cannot appear without an exact reviewed entry.\nconst MCX_EXTRACTION_SCRIPTS = [\n  './js/services/mcx-market-context.js',\n  './js/services/mcx-vix-market-context.js',\n];",
    "// Same rule as every list above: a LIST, never an `mcx-*` pattern, so another\n// MCX owner cannot appear without an exact reviewed entry.\nconst MCX_EXTRACTION_SCRIPTS = [\n  './js/services/mcx-market-context.js',\n  './js/services/mcx-vix-market-context.js',\n  './js/services/mcx-backend-candles.js',\n];",
    'DSB MCX exact inventory')
one(path,
    "eq(LOCAL_SCRIPTS.length + DECLARED_NON_DSB_SCRIPTS.length, 43,\n   'index.html loads 26 local application scripts plus the 3 Stress companion modules, the 4 shipped PESS extraction modules, the 5 shipped EIC extraction modules and the 3 PRETRADE extraction modules before the inline monolith');",
    "eq(LOCAL_SCRIPTS.length + DECLARED_NON_DSB_SCRIPTS.length, 44,\n   'index.html loads 26 local application scripts plus the named Stress, PESS, EIC, PRETRADE and three MCX extraction modules before the inline monolith');",
    'DSB local script total')

# MCX2 remains a historical owner contract, but its CURRENT load successor is
# now MCX3 rather than the residual inline application.
path = 'tests/mcx-vix-market-context-boundary-contract.test.js'
one(path,
    "const MCX1_REL = 'js/services/mcx-market-context.js';",
    "const MCX1_REL = 'js/services/mcx-market-context.js';\nconst MCX3_REL = 'js/services/mcx-backend-candles.js';",
    'MCX2 MCX3 relation')
one(path,
    "// 2. Script ownership / load order. MCX-1 must load first because MCX-2 calls its\n// shared owners at runtime; MCX-2 then loads immediately before residual inline app.\nconst mcx1Tag = '<script src=\"./' + MCX1_REL + '\"></script>';\nconst tag = '<script src=\"./' + MODULE_REL + '\"></script>';\nok((INDEX.split(mcx1Tag).length - 1) === 1, 'exactly one MCX-1 script tag exists');\nok((INDEX.split(tag).length - 1) === 1, 'exactly one MCX-2 service script tag exists');\nconst mcx1At = INDEX.indexOf(mcx1Tag);\nconst tagAt = INDEX.indexOf(tag);\nconst nextScriptAt = INDEX.indexOf('<script', tagAt + tag.length);\nconst nextScriptEnd = nextScriptAt >= 0 ? INDEX.indexOf('>', nextScriptAt) : -1;\nconst nextTag = nextScriptEnd >= 0 ? INDEX.slice(nextScriptAt, nextScriptEnd + 1) : '';\nok(mcx1At >= 0 && tagAt > mcx1At, 'MCX-1 loads before MCX-2');\nok(tagAt >= 0 && nextScriptAt > tagAt && !/\\bsrc\\s*=/i.test(nextTag),\n  'MCX-2 loads immediately before the residual inline application script');\nok(!/\\b(?:async|defer|type)\\s*=/i.test(tag), 'MCX-2 tag is classic and synchronous');",
    "// 2. Script ownership / load order. MCX-1 must load first because MCX-2 calls its\n// shared owners at runtime. MCX3 now follows MCX2; the residual inline app follows MCX3.\nconst mcx1Tag = '<script src=\"./' + MCX1_REL + '\"></script>';\nconst tag = '<script src=\"./' + MODULE_REL + '\"></script>';\nconst mcx3Tag = '<script src=\"./' + MCX3_REL + '\"></script>';\nok((INDEX.split(mcx1Tag).length - 1) === 1, 'exactly one MCX-1 script tag exists');\nok((INDEX.split(tag).length - 1) === 1, 'exactly one MCX-2 service script tag exists');\nok((INDEX.split(mcx3Tag).length - 1) === 1, 'exactly one MCX-3 service script tag exists');\nconst mcx1At = INDEX.indexOf(mcx1Tag);\nconst tagAt = INDEX.indexOf(tag);\nconst nextScriptAt = INDEX.indexOf('<script', tagAt + tag.length);\nconst nextScriptEnd = nextScriptAt >= 0 ? INDEX.indexOf('>', nextScriptAt) : -1;\nconst nextTag = nextScriptEnd >= 0 ? INDEX.slice(nextScriptAt, nextScriptEnd + 1) : '';\nconst mcx3At = INDEX.indexOf(mcx3Tag);\nconst afterMcx3At = INDEX.indexOf('<script', mcx3At + mcx3Tag.length);\nconst afterMcx3End = afterMcx3At >= 0 ? INDEX.indexOf('>', afterMcx3At) : -1;\nconst afterMcx3Tag = afterMcx3End >= 0 ? INDEX.slice(afterMcx3At, afterMcx3End + 1) : '';\nok(mcx1At >= 0 && tagAt > mcx1At, 'MCX-1 loads before MCX-2');\nok(nextTag === '<script src=\"./' + MCX3_REL + '\">', 'MCX-2 loads immediately before MCX-3');\nok(mcx3At > tagAt && afterMcx3At > mcx3At && !/\\bsrc\\s*=/i.test(afterMcx3Tag),\n  'MCX-3 loads immediately before the residual inline application script');\nok(!/\\b(?:async|defer|type)\\s*=/i.test(tag), 'MCX-2 tag is classic and synchronous');",
    'MCX2 current load successor')

print('MCX3 structural repair prepared')
