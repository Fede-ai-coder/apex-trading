from pathlib import Path
import os
import re
import subprocess

BASE_SHA = os.environ.get('BASE_SHA', '2b61bbd1ed11f227032529e9147c82434b5720b2')
INDEX = Path('index.html')
MODULE = Path('js/services/mcx-backend-candles.js')

src = INDEX.read_text()
base = subprocess.check_output(['git', 'show', BASE_SHA + ':index.html'], text=True)
if src != base:
    raise SystemExit('index.html drifted from pinned MCX3 base before relocation')


def fn_span(text, name):
    pat = re.compile(r'(?m)^(?:async\s+)?function\s+' + re.escape(name) + r'\(')
    matches = list(pat.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f'{name}: expected one top-level declaration, got {len(matches)}')
    start = matches[0].start()
    open_at = text.find('{', start)
    depth = 0
    quote = None
    esc = False
    line = False
    block = False
    i = open_at
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if line:
            if c == '\n': line = False
            i += 1
            continue
        if block:
            if c == '*' and n == '/':
                block = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if esc:
                esc = False
                i += 1
                continue
            if c == '\\':
                esc = True
                i += 1
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c == '/' and n == '/':
            line = True
            i += 2
            continue
        if c == '/' and n == '*':
            block = True
            i += 2
            continue
        if c in ("'", '"', '`'):
            quote = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    raise SystemExit(name + ': unterminated function')


def var_span(text, name):
    pat = re.compile(r'(?m)^var\s+' + re.escape(name) + r'\s*=.*?;[^\n]*(?:\n|$)')
    matches = list(pat.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f'{name}: expected one var declaration, got {len(matches)}')
    return matches[0].start(), matches[0].end()


header = '// ── FF_BACKEND_CANDLES_MCX_CHARTS helpers ─────────────────────────────────────'
first_start, _ = fn_span(src, '_mcxGetBackendCandleEntry')
_, fetch_end = fn_span(src, '_mcxFetchBackendCandlesForChart')
func_start = src.rfind(header, 0, first_start)
if func_start < 0:
    raise SystemExit('MCX3 family header not found')
if src[fetch_end:fetch_end + 2] != '\n\n':
    raise SystemExit('MCX3 function-family suffix changed')
func_slice = src[func_start:fetch_end]

state_start, cache_end = var_span(src, '_mcxBackendCandleCache')
ttl_start, state_end = var_span(src, '_MCX_BACKEND_CACHE_TTL')
if cache_end != ttl_start:
    raise SystemExit('MCX3 cache state is no longer contiguous')
state_slice = src[state_start:state_end]
if not (func_start < fetch_end < state_start < state_end):
    raise SystemExit('MCX3 two-slice ordering changed')

# The state assignments move earlier when the new classic script loads. That is
# safe only while the cache vars remain private to this family and no call in the
# intervening top-level region executes an owner before the original assignment.
private_state = ['_mcxBackendCandleCache', '_MCX_BACKEND_CACHE_TTL']
candidate = func_slice + '\n\n' + state_slice
for name in private_state:
    if src.count(name) != candidate.count(name):
        raise SystemExit(name + ': reference escaped the candidate owner family')

gap = src[fetch_end:state_start]
# Known pre-state references are declarations/closures only: the dev helper
# installs an async function but does not invoke the fetcher during evaluation.
for name in ['_mcxGetBackendCandleEntry', '_mcxGetCachedBackendCandles', '_mcxNewestBarTime',
             '_mcxStoreBackendCandleEntry', '_mcxCandlesLookStale']:
    if name in gap:
        raise SystemExit(name + ': unexpected pre-state reference would make state timing observable')
expected_fetch_ref = 'var r = await _mcxFetchBackendCandlesForChart(sym);'
if gap.count('_mcxFetchBackendCandlesForChart') != 1 or expected_fetch_ref not in gap:
    raise SystemExit('pre-state fetcher reference changed; temporal-safety proof must be re-audited')
assign_at = gap.find('window.apexDebugLoadMcxBackendCandles = async function(symbol) {')
fetch_ref_at = gap.find(expected_fetch_ref)
if not (0 <= assign_at < fetch_ref_at):
    raise SystemExit('pre-state fetcher reference is no longer inside the installed async debug closure')

MODULE.parent.mkdir(parents=True, exist_ok=True)
MODULE.write_text(candidate)

# Delete later slice first so the audited base offsets remain valid.
out = src[:state_start] + src[state_end:]
out = out[:func_start] + out[fetch_end + 2:]
anchor = '<script src="./js/services/mcx-vix-market-context.js"></script>\n'
tag = '<script src="./js/services/mcx-backend-candles.js"></script>\n'
if out.count(anchor) != 1:
    raise SystemExit('MCX VIX script anchor is not unique')
if tag in out:
    raise SystemExit('MCX3 script tag already present')
insert_at = out.index(anchor) + len(anchor)
out = out[:insert_at] + tag + out[insert_at:]
INDEX.write_text(out)

# Structural postconditions.
for name in ['_mcxGetBackendCandleEntry', '_mcxGetCachedBackendCandles', '_mcxNewestBarTime',
             '_mcxStoreBackendCandleEntry', '_mcxCandlesLookStale', '_mcxFetchBackendCandlesForChart']:
    pat = re.compile(r'(?m)^(?:async\s+)?function\s+' + re.escape(name) + r'\(')
    if len(pat.findall(candidate)) != 1 or pat.search(out):
        raise SystemExit(name + ': owner relocation postcondition failed')
for name in private_state:
    pat = re.compile(r'(?m)^var\s+' + re.escape(name) + r'\s*=')
    if len(pat.findall(candidate)) != 1 or pat.search(out):
        raise SystemExit(name + ': state relocation postcondition failed')
if out.count(tag) != 1:
    raise SystemExit('MCX3 script tag postcondition failed')
if '_mcxBackendFetchInFlight' in candidate:
    raise SystemExit('renderer in-flight state leaked into MCX3 owner')
if 'function ffBackendCandlesMcxCharts' in candidate:
    raise SystemExit('feature-flag owner leaked into MCX3 owner')

print('MCX3 relocation prepared')
print('function slice:', func_start, len(func_slice))
print('state slice:', state_start, len(state_slice))
print('module chars:', len(candidate))
print('index chars:', len(src), '->', len(out))
print('temporal-safety: private state + one closure-only pre-state fetch reference')
