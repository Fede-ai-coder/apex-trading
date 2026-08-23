#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path('tests')
OUT = Path('tests/tools/journal-core-historical-report.txt')
lines = []

def emit(s=''):
    lines.append(s)

emit('JOURNAL CORE HISTORICAL DIAGNOSTIC')
emit()

consumers = []
for p in sorted(ROOT.glob('*.test.js')):
    text = p.read_text(encoding='utf-8')
    if 'mcx-pr3-undo' in text or 'undoMcxPr3' in text:
        consumers.append(p)

emit('=== mcx-pr3-undo consumers ===')
for p in consumers:
    text = p.read_text(encoding='utf-8')
    imports = re.findall(r"const\s+(\w+)\s*=\s*require\(['\"]\./lib/mcx-pr3-undo\.js['\"]\);", text)
    calls = [(i + 1, line.strip()) for i, line in enumerate(text.splitlines()) if 'undoMcxPr3' in line]
    emit(str(p))
    emit('  imports=' + repr(imports))
    for n, line in calls:
        emit(f'  L{n}: {line}')
emit()

patterns = [
    ('mcx3-last', re.compile(r'mcxBackend.*inline|MCX backend-candle.*LAST|mcx-backend-candles.*inline', re.I)),
    ('mcx-tail', re.compile(r'three MCX owners|all three MCX|MCX owners|MCX3|mcx-backend-candle', re.I)),
    ('local-count', re.compile(r'(?:(?:43|44|45).{0,60}local|local.{0,60}(?:43|44|45)|length\s*,\s*(?:43|44|45))', re.I)),
]
for title, rx in patterns:
    emit(f'=== {title} ===')
    for p in sorted(ROOT.glob('*.test.js')):
        text = p.read_text(encoding='utf-8')
        for i, line in enumerate(text.splitlines(), 1):
            if rx.search(line):
                emit(f'{p}:L{i}: {line.strip()}')
    emit()

# Give exact context around assertions that explicitly make an external script
# immediately precede the inline monolith.
emit('=== exact inlineTagIdx predecessor contexts ===')
for p in sorted(ROOT.glob('*.test.js')):
    ls = p.read_text(encoding='utf-8').splitlines()
    for i, line in enumerate(ls):
        if 'inlineTagIdx - 1' in line or 'inlineIdx - 1' in line:
            emit(f'--- {p}:L{i+1} ---')
            for j in range(max(0, i-6), min(len(ls), i+7)):
                emit(f'{j+1}: {ls[j]}')
            emit()

OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'wrote {OUT} ({len(lines)} lines)')
