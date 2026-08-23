from pathlib import Path
import re

TARGETS = [
    'tests/eic-extraction-boundary-contract.test.js',
    'tests/pretrade-risk-modal-boundary-contract.test.js',
    'tests/pretrade-technicals-boundary-contract.test.js',
    'tests/pretrade-risk-rules-boundary-contract.test.js',
    'tests/mcx-market-context-boundary-contract.test.js',
    'tests/sfs-extraction-boundary-contract.test.js',
    'tests/pess-extraction-boundary-contract.test.js',
    'tests/backend-directional-snapshot-boundary-contract.test.js',
]

def one_replace(s, old, new, label):
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {n}')
    return s.replace(old, new, 1)

def add_require(s, alias='MCX_UNDO2'):
    old = f"const {alias} = require('./lib/mcx-pr2-undo.js');"
    new_alias = 'MCX_UNDO3' if alias == 'MCX_UNDO2' else 'MCX3_UNDO_SPANS'
    new = f"const {new_alias} = require('./lib/mcx-pr3-undo.js');\n" + old
    return one_replace(s, old, new, 'require ' + alias)

def patch_direct(path, old_var):
    p = Path(path); s = p.read_text()
    s = add_require(s)
    pat = re.compile(
        r"const\s+" + re.escape(old_var) + r"\s*=\s*MCX_UNDO2\.isApplied\(liveIndex\)\n"
        r"\s*\?\s*MCX_UNDO2\.undoMcxPr2\(liveIndex,\s*([^\n]+)\)\n"
        r"\s*:\s*liveIndex;"
    )
    m = pat.search(s)
    if not m:
        raise SystemExit(f'{path}: direct MCX2 reconstruction block not found')
    second = m.group(1)
    block = (
        "const at392 = MCX_UNDO3.isApplied(liveIndex)\n"
        "  ? MCX_UNDO3.undoMcxPr3(liveIndex, fs.readFileSync(path.join(ROOT,'js/services/mcx-backend-candles.js'),'utf8'))\n"
        "  : liveIndex;\n"
        f"const {old_var} = MCX_UNDO2.isApplied(at392)\n"
        f"  ? MCX_UNDO2.undoMcxPr2(at392, {second})\n"
        "  : at392;"
    )
    s = s[:m.start()] + block + s[m.end():]
    p.write_text(s)

# Three PRETRADE contracts plus the older MCX-1 contract share this direct shape.
patch_direct('tests/pretrade-risk-modal-boundary-contract.test.js', 'at386')
patch_direct('tests/pretrade-technicals-boundary-contract.test.js', 'at386')
patch_direct('tests/pretrade-risk-rules-boundary-contract.test.js', 'at386')
patch_direct('tests/mcx-market-context-boundary-contract.test.js', 'index')

# EIC uses named source variables and a functional reconstruction chain.
p = Path('tests/eic-extraction-boundary-contract.test.js'); s = p.read_text(); s = add_require(s)
s = one_replace(
    s,
    "const MCX2_SRC = fs.readFileSync(path.join(ROOT, 'js/services/mcx-vix-market-context.js'), 'utf8');\nconst POST_MCX2_HTML = MCX_UNDO2.isApplied(LIVE_HTML)\n  ? MCX_UNDO2.undoMcxPr2(LIVE_HTML, MCX2_SRC)\n  : LIVE_HTML;",
    "const MCX2_SRC = fs.readFileSync(path.join(ROOT, 'js/services/mcx-vix-market-context.js'), 'utf8');\nconst MCX3_SRC = fs.readFileSync(path.join(ROOT, 'js/services/mcx-backend-candles.js'), 'utf8');\nconst POST_MCX3_HTML = MCX_UNDO3.isApplied(LIVE_HTML)\n  ? MCX_UNDO3.undoMcxPr3(LIVE_HTML, MCX3_SRC)\n  : LIVE_HTML;\nconst POST_MCX2_HTML = MCX_UNDO2.isApplied(POST_MCX3_HTML)\n  ? MCX_UNDO2.undoMcxPr2(POST_MCX3_HTML, MCX2_SRC)\n  : POST_MCX3_HTML;",
    'EIC newest-first chain'
)
p.write_text(s)

# SFS mutates HEAD_HTML through the chain.
p = Path('tests/sfs-extraction-boundary-contract.test.js'); s = p.read_text(); s = add_require(s)
s = one_replace(
    s,
    "  const mcx2Src = fs.readFileSync(path.join(ROOT, 'js/services/mcx-vix-market-context.js'), 'utf8');\n  if (MCX_UNDO2.isApplied(HEAD_HTML)) {",
    "  const mcx2Src = fs.readFileSync(path.join(ROOT, 'js/services/mcx-vix-market-context.js'), 'utf8');\n  const mcx3Src = fs.readFileSync(path.join(ROOT, 'js/services/mcx-backend-candles.js'), 'utf8');\n  if (MCX_UNDO3.isApplied(HEAD_HTML)) {\n    HEAD_HTML = MCX_UNDO3.undoMcxPr3(HEAD_HTML, mcx3Src);\n    ok(true, '11.-6 MCX backend-candle service is undone byte-exactly before the MCX VIX link');\n  }\n  if (MCX_UNDO2.isApplied(HEAD_HTML)) {",
    'SFS newest-first chain'
)
p.write_text(s)

# PESS mutates RECON_HTML through the chain.
p = Path('tests/pess-extraction-boundary-contract.test.js'); s = p.read_text(); s = add_require(s)
s = one_replace(
    s,
    "// The MCX VIX extraction (PR #389) is the newest hop; it is undone before the\n// MCX snapshot extraction it was cut against.\nif (MCX_UNDO2.isApplied(RECON_HTML)) {",
    "// MCX PR 3 is newer still: undo the backend-candle extraction before the\n// VIX and snapshot links so every older offset sees its own historical document.\nif (MCX_UNDO3.isApplied(RECON_HTML)) {\n  const mcx3Src = fs.readFileSync(path.join(ROOT, 'js/services/mcx-backend-candles.js'), 'utf8');\n  RECON_HTML = MCX_UNDO3.undoMcxPr3(RECON_HTML, mcx3Src);\n  ok(true, '13.-6 MCX backend-candle service is undone byte-exactly before the MCX VIX link');\n}\n// The MCX VIX extraction (PR #389) is then undone before the snapshot link.\nif (MCX_UNDO2.isApplied(RECON_HTML)) {",
    'PESS newest-first chain'
)
p.write_text(s)

# DSB snapshot does not reconstruct here: it derives the exact amount removed
# above two historical declaration offsets. Add MCX3's two-slice contribution
# from the PR3 helper instead of restating an untracked magic number.
p = Path('tests/backend-directional-snapshot-boundary-contract.test.js'); s = p.read_text()
s = one_replace(
    s,
    "  const MCX2_UNDO_SPANS = require('./lib/mcx-pr2-undo.js');\n  const MCX2_RELOCATED_ABOVE = MCX2_UNDO_SPANS.CUT_CHARS;\n  eq(MCX2_RELOCATED_ABOVE, 24690, 'the MCX VIX relocation removed exactly 24,690 chars from the monolith');\n  const RELOCATED_ABOVE = MCX_RELOCATED_ABOVE + MCX2_RELOCATED_ABOVE;",
    "  const MCX2_UNDO_SPANS = require('./lib/mcx-pr2-undo.js');\n  const MCX2_RELOCATED_ABOVE = MCX2_UNDO_SPANS.CUT_CHARS;\n  eq(MCX2_RELOCATED_ABOVE, 24690, 'the MCX VIX relocation removed exactly 24,690 chars from the monolith');\n  const MCX3_UNDO_SPANS = require('./lib/mcx-pr3-undo.js');\n  const MCX3_RELOCATED_ABOVE = MCX3_UNDO_SPANS.FUNC_CHARS + MCX3_UNDO_SPANS.SEPARATOR.length + MCX3_UNDO_SPANS.STATE_CHARS;\n  eq(MCX3_RELOCATED_ABOVE, 12006, 'the MCX backend-candle relocation removed exactly 12,006 chars from the monolith');\n  const RELOCATED_ABOVE = MCX_RELOCATED_ABOVE + MCX2_RELOCATED_ABOVE + MCX3_RELOCATED_ABOVE;",
    'DSB MCX3 relocated-above accounting'
)
p.write_text(s)

for path in TARGETS:
    text = Path(path).read_text()
    if path != 'tests/backend-directional-snapshot-boundary-contract.test.js':
        if "mcx-pr3-undo.js" not in text:
            raise SystemExit(path + ': PR3 helper missing after patch')
print('MCX3 reconstruction repair prepared for', len(TARGETS), 'contracts')
