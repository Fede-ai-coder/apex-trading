#!/usr/bin/env python3
import hashlib
import json
import subprocess
from pathlib import Path

BASE = 'dfb8433e8e7b0403fca5a23874dfbc600f5069c4'
INDEX = Path('index.html')
MODULE = Path('js/services/journal-core.js')
REPORT = Path('tests/tools/journal-core-extraction-pins.json')
ANCHOR = '<script src="./js/services/mcx-backend-candles.js"></script>\n'
TAG = '<script src="./js/services/journal-core.js"></script>\n'
START = "var JOURNAL_KEY = 'apex_journal_v1';"
UI_MARKER = (
    '// ══════════════════════════════════════════════════════════════\n'
    '// JOURNAL UI\n'
    '// ══════════════════════════════════════════════════════════════'
)
OWNERS = [
    'JOURNAL_KEY',
    'jLoad',
    'jSave',
    'jAddTrade',
    'jUpdateTrade',
    'jDeleteTrade',
    'jBuildSnapshot',
    'jAutoTags',
    'jComputeStats',
]


def sha256_utf8(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def utf16_len(s: str) -> int:
    return len(s.encode('utf-16-le')) // 2


def git(*args: str) -> str:
    return subprocess.check_output(['git', *args], text=True).strip()


def main() -> None:
    branch = git('rev-parse', '--abbrev-ref', 'HEAD')
    if branch != 'agent/extract-journal-core-service':
        raise SystemExit(f'REFUSE: wrong branch {branch!r}')

    # This tool is intentionally one-shot. A follow-up push caused by its own
    # extraction commit must be a clean no-op rather than a second extraction.
    current = INDEX.read_text(encoding='utf-8')
    if TAG in current:
        if MODULE.exists():
            print('journal-core already extracted; no-op')
            return
        raise SystemExit('REFUSE: journal-core tag exists but module is missing')

    # The branch may contain only temporary tooling before the relocation.
    # Production index.html itself MUST still be byte-identical to the pinned base.
    base_index = subprocess.check_output(['git', 'show', f'{BASE}:index.html']).decode('utf-8')
    if current != base_index:
        raise SystemExit('REFUSE: working index.html is not byte-identical to pinned base')
    if MODULE.exists():
        raise SystemExit('REFUSE: journal-core module already exists before extraction')

    if current.count(START) != 1:
        raise SystemExit(f'REFUSE: expected exactly one Journal core start, got {current.count(START)}')
    if current.count(UI_MARKER) != 1:
        raise SystemExit(f'REFUSE: expected exactly one JOURNAL UI marker, got {current.count(UI_MARKER)}')
    if current.count(ANCHOR) != 1:
        raise SystemExit(f'REFUSE: expected exactly one MCX3 script anchor, got {current.count(ANCHOR)}')

    start_cp = current.index(START)
    end_cp = current.index(UI_MARKER, start_cp)
    if end_cp <= start_cp:
        raise SystemExit('REFUSE: invalid Journal core slice ordering')

    moved = current[start_cp:end_cp]
    # Strong content sanity: every owner declaration must be in the moved slice,
    # and the UI boundary must not be.
    declaration_needles = [
        "var JOURNAL_KEY = 'apex_journal_v1';",
        'function jLoad()',
        'function jSave(trades)',
        'function jAddTrade(trade)',
        'function jUpdateTrade(id, updates)',
        'function jDeleteTrade(id)',
        'function jBuildSnapshot(ticker)',
        'function jAutoTags(d)',
        'function jComputeStats(trades)',
    ]
    missing = [n for n in declaration_needles if n not in moved]
    if missing:
        raise SystemExit('REFUSE: moved slice is missing declarations: ' + ', '.join(missing))
    if 'function runJournalPanel()' in moved or '// JOURNAL UI' in moved:
        raise SystemExit('REFUSE: Journal UI leaked into core slice')

    without_core = current[:start_cp] + current[end_cp:]
    updated = without_core.replace(ANCHOR, ANCHOR + TAG, 1)
    if updated.count(TAG) != 1:
        raise SystemExit('REFUSE: failed to install exactly one journal-core script tag')

    MODULE.parent.mkdir(parents=True, exist_ok=True)
    MODULE.write_text(moved, encoding='utf-8')
    INDEX.write_text(updated, encoding='utf-8')

    report = {
        'base_commit': BASE,
        'base_index_utf16_chars': utf16_len(current),
        'base_index_sha256': sha256_utf8(current),
        'slice_start_utf16': utf16_len(current[:start_cp]),
        'slice_utf16_chars': utf16_len(moved),
        'slice_sha256': sha256_utf8(moved),
        'module_utf16_chars': utf16_len(moved),
        'module_sha256': sha256_utf8(moved),
        'post_index_utf16_chars': utf16_len(updated),
        'post_index_sha256': sha256_utf8(updated),
        'tag': TAG.rstrip('\n'),
        'anchor': ANCHOR.rstrip('\n'),
        'owners': OWNERS,
    }
    REPORT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')

    print(json.dumps(report, indent=2))
    print('Journal core extraction prepared successfully.')


if __name__ == '__main__':
    main()
