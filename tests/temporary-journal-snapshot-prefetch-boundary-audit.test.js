'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL SNAPSHOT PREFETCH — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. The targeted DXLink fetch for Journal snapshots,
// [1267671,1278339): 10,668 units in TWO async owners. It has been the
// recorded runner-up in two consecutive audits (#431 and #433) and is now the
// best remaining region on the screen.
//
//     2 external executable edges, one per owner, both at call time
//     0 references from generated markup
//     0 inbound writes
//     3 outbound writes, ALL property writes on `S` — see below
//     0 top-level statement lines, and `evaluationTimeReads` is EMPTY
//     it loads in a COMPLETELY empty VM, defining exactly its two owners
//
// THE OUTBOUND SHAPE IS NOT THE ONE THE LAST CYCLE HAD, and saying "all by
// key" would be false. §5 measures all three: ONE is a GUARDED LAZY INIT,
// `if (!S.greeksCache) S.greeksCache = {};`, and the other two are keyed
// writes into that cache. §7b drives the difference rather than describing it:
// on a host with no cache the guard creates one, and on a host that already
// has entries they are PRESERVED. `S` itself is never rebound — every write is
// a property write, which §5 also asserts.
//
// A CANDIDATE THIS AUDIT REJECTS, proposed before it was measured. The
// FF_BACKEND_CANDLES_SCANNER_CHARTS helper is the sibling of the region #434
// extracted and carries the IDENTICAL debug-block shape, so the same narrow-cut
// judgement looked like it should transfer. It does not, and §6 pins why:
// `assertSeam` REFUSES the narrow boundary outright, and the body does not even
// parse in a VM. The transferable thing was the shape, not the cut.
//
// AND A LIMIT OF THE SCREEN ITSELF, worth recording because it nearly hid the
// above. That scanner banner region scores 53 crossings — but it is not one
// feature: the banner-to-banner span has swept up ELEVEN unrelated owners
// including submitTrade, deleteTrade and `escHtml`, and escHtml alone — 134
// units, a shared HTML escaper — contributes FORTY of the region's fifty edges.
// A region's screen score can be dominated by one tiny utility that would never
// move, so the score ranks REGIONS and does not describe the feature inside
// them. §6 asserts that decomposition.
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APP_LOADER = require('./lib/load-app-source.js');
const {
  maskLiterals,
  stripComments,
  scanTopLevelDeclarations,
  functionBodyRanges,
} = require('./lib/eic-contract-guards.js');
const {
  isBlankOrComment, snapBodyEnd, assertSeam,
  topLevelBanners, bindingNames, evaluationTimeReads,
} = require('./lib/extraction-boundary.js');

// ── The base this audit measures ─────────────────────────────────────────────
const BASE_SHA = '6a16ec6bb5acdecca2a883b29867ee962b156224';
const BASE_CHARS = 1594508;
const BASE_SHA256 = '37703d19026490a5d830caa20f6afa9e08f859b5db749acc378c51bfa4865d00';
const CODE_AT = 113773;
const CODE_CHARS = 1480709;
const LOCAL_SCRIPT_COUNT = 66;
// This audit is the 150th file. Phase 2 replaces it one for one.
const TEST_FILE_COUNT = 150;

// ── The region ───────────────────────────────────────────────────────────────
const RAW_AT = 1267671;
const RAW_END = 1278340;
const RAW_CHARS = 10669;
const BODY_END = 1278339;
const MODULE_CHARS = 10668;
const MODULE_SHA256 = '29105fdc435029a35aba08de1d7c7caca4891d0f2791da550139cc86d9856f82';
const OWNERS_EXPECTED = [
  { name: '_prefetchDXLinkForSnapshot', chars: 5153, start: 489 },
  { name: 'prefetchJournalSnapshotFromBackendDxlink', chars: 5023, start: 5644 },
];
const OWNER_COUNT = 2;

// ── What the screen saw ──────────────────────────────────────────────────────
const TOP_LEVEL_BANNERS = 188;
const SCREEN_FLOOR = 8000;
const SCREENED_REGIONS = 40;

// ── Coupling, both directions ────────────────────────────────────────────────
const EXTERNAL_EDGES = { _prefetchDXLinkForSnapshot: 1, prefetchJournalSnapshotFromBackendDxlink: 1 };
const EXTERNAL_EDGE_TOTAL = 2;
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
const OUTBOUND_BINDING = 'S';
const OUTBOUND_WRITES = 3;
const OUTBOUND_LAZY_INIT = 'if (!S.greeksCache) S.greeksCache = {};';
const OUTBOUND_KEYED = 2;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The rejected candidate, and the screen's own limit ───────────────────────
const SCANNER_REGION = [1442181, 1478573];
const SCANNER_OWNERS = 11;
const SCANNER_EDGES = 50;
const SCANNER_OUTBOUND = 3;
const SCANNER_TOP_EDGE_NAME = 'escHtml';
const SCANNER_TOP_EDGE_COUNT = 40;
const SCANNER_TOP_EDGE_CHARS = 134;
// Derived, not pinned loose: one past the declaration the narrow cut would
// have ended on. An arbitrary offset here survived mutation in the first
// pass — the same shape as the survivors in #429 through #433.
const SCANNER_NARROW_OWNER = '_scannerFetchBackendCandlesForChart';
const SCANNER_NARROW_OWNER_END = 1453624;
const SCANNER_NARROW_SEAM_ERROR = 'EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED';
// The other recorded candidate, unchanged since #431 measured it.
const HELPER = [1254714, 1265508];
const HELPER_EDGES = 6;
const HELPER_OUTBOUND = 0;

// ── Dependencies ─────────────────────────────────────────────────────────────
const MONOLITH_DEPENDENCIES = ['S', '_saveGreeksCache', 'fetchBackendOptionLive', 'fetchLiveQuote',
  'getPreferredOptionDxlinkSymbol', 'subscribeBackendOptionLive', 'subscribeDxlinkQuotes'];
const SIBLING_DEPENDENCIES = { 'js/api/backend-client.js': ['ttCall'] };
const SIBLING_POSITIONS = { 'js/api/backend-client.js': 4 };
const MODULE_POSITION = 67;
const VM_GLOBALS = 2;

// ── The modelled extraction ──────────────────────────────────────────────────
const MODULE_REL = 'js/services/journal-snapshot-prefetch.js';
const TAG = '<script src="./js/services/journal-snapshot-prefetch.js"></script>\n';
const TAG_CHARS = 67;
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-backend-candles.js"></script>\n';
const EXTRACTED_CHARS = 1583906;
const EXTRACTED_SHA256 = '77e3e862c6f4d496b9d90f0256ccf22ad9ed510868d704f2bfae5041d29158e6';

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = []; let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function lexicalViews(src) {
  const masked = maskLiterals(src);
  const noComments = stripComments(src);
  const build = (keep) => { const o = new Array(src.length);
    for (let i = 0; i < src.length; i++) o[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return o.join(''); };
  return { code: masked, strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]) };
}
function isWriteAt(text, at, name) {
  const after = text.slice(at + name.length, at + name.length + 30);
  return /^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after) ||
    /^\s*(?:\[[^\]]*\]|\.[A-Za-z0-9_$]+)+\s*=[^=]/.test(after);
}
function statementLines(src, decls) {
  const ch = Array.from(src);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
  return ch.join('').split('\n').filter((l) => !isBlankOrComment(l));
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('JOURNAL SNAPSHOT PREFETCH — TEMPORARY BOUNDARY AUDIT');

const INDEX = APP_LOADER.loadIndexHtml();
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const VIEWS = lexicalViews(CODE);
const BODY = CODE.slice(RAW_AT, BODY_END);
const OWNERS = scanTopLevelDeclarations(BODY);
const OWNED = new Set(OWNERS.map((d) => d.name));
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(Array.from(INDEX).length, BASE_CHARS, 'index.html is 1,594,508 units');
eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned digest');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at the pinned offset');
eq(Array.from(CODE).length, CODE_CHARS, '…and is 1,480,709 units');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-six local scripts precede it');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 150 files — this audit is the one that was added');
{
  // Counted the same way before and after committing: a `git diff` alone
  // reports nothing while the file is untracked — the #427 failure exactly.
  const committedAdds = git(['diff', '--name-only', '--diff-filter=A', BASE_SHA]).split('\n').filter(Boolean);
  const untracked = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter((l) => /^(\?\?|A )/.test(l)).map((l) => l.slice(3));
  eq(Array.from(new Set(committedAdds.concat(untracked))).sort(),
    ['tests/temporary-journal-snapshot-prefetch-boundary-audit.test.js'],
    '…and it is the ONLY file this PR adds, whether or not it is committed yet');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The screen');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, FN_BODIES);
  eq(marks.length, TOP_LEVEL_BANNERS, '188 banners sit at top level');
  const all = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m; while ((m = re.exec(CODE))) all.push(m.index);
  }
  ok(all.length > marks.length,
    'control — the unfiltered count is strictly larger, so the top-level filter does work');
  ok(marks.indexOf(RAW_AT) >= 0, 'the chosen region opens on one of them');
  ok(marks.indexOf(RAW_END) >= 0, '…and its seam is another');

  let screened = 0;
  for (let i = 0; i < marks.length; i++) {
    const end = (i + 1 < marks.length ? marks[i + 1] : CODE.length);
    if (end - marks[i] >= SCREEN_FLOOR && scanTopLevelDeclarations(CODE.slice(marks[i], end)).length) screened++;
  }
  eq(screened, SCREENED_REGIONS, '40 banner-to-banner regions clear the floor and own declarations');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE.slice(RAW_AT, RAW_AT + 100).indexOf('Targeted DXLink fetch') > 0,
    'the region opens on the feature’s own banner');
  ok(CODE.slice(RAW_END, RAW_END + 200).indexOf('SNAPSHOT') > 0 ||
     CODE.slice(RAW_END, RAW_END + 200).indexOf('── ') >= 0,
    'and what follows the seam is a different region');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 10,669 units');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 10,668');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', 'the raw block is the body plus one LF');
  eq(BODY.slice(-2), '}\n', 'the body ends on a closing brace and a newline');

  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Two async owners, and nothing else');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares exactly two names at top level');
  eq(OWNERS.map((d) => ({ name: d.name, chars: d.chars, start: d.start })), OWNERS_EXPECTED,
    '…at their pinned spans');
  eq(OWNERS.every((d) => d.isAsync), true, 'both are async');
  eq(OWNERS.every((d) => d.form === 'function'), true, '…both function declarations, no bindings');
  eq(bindingNames(OWNERS), [], 'the region owns no binding at all');
  eq(OWNERS[0].start + OWNERS[0].chars + 2, OWNERS[1].start,
    'the two declarations are separated by one blank line');
  eq(OWNERS[1].start + OWNERS[1].chars + 1, MODULE_CHARS,
    'banner + both declarations + the trailing newline is the whole body');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling in BOTH directions — and the outbound shape');
// ─────────────────────────────────────────────────────────────────────────────
{
  const edges = {};
  let total = 0;
  for (const n of OWNED) {
    for (const p of refSites(VIEWS.code, n)) {
      if (p < RAW_AT || p >= BODY_END) { edges[n] = (edges[n] || 0) + 1; total++; }
    }
  }
  eq(edges, EXTERNAL_EDGES, 'two external executable edges, one per owner');
  eq(total, EXTERNAL_EDGE_TOTAL, '…two references in total');
  const sites = [];
  for (const n of OWNED) for (const p of refSites(VIEWS.code, n)) if (p < RAW_AT || p >= BODY_END) sites.push(p);
  eq(sites.filter((p) => insideFunction(p)).length, EXTERNAL_EDGE_TOTAL,
    'both sit inside a function body — call time');
  ok(FN_BODIES.length > 100, 'control — the function-body index is populated, so that is a measurement');

  let markup = 0;
  for (const n of OWNED) {
    for (const p of refSites(VIEWS.strings, n)) if (p < RAW_AT || p >= BODY_END) markup++;
  }
  eq(markup, MARKUP_REFERENCES, 'no owner is named inside a string the monolith builds');
  ok(refSites(VIEWS.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x.k = 1;', 0, 'x'), true, 'control — a dotted assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  eq(bindingNames(OWNERS).length, 0, 'the region owns no binding, so inbound is vacuous');
  let inbound = 0;
  for (const n of bindingNames(OWNERS)) {
    for (const p of refSites(VIEWS.code, n)) {
      if ((p < RAW_AT || p >= BODY_END) && isWriteAt(VIEWS.code, p, n)) inbound++;
    }
  }
  eq(inbound, INBOUND_WRITES, '…and the count over an empty set is zero');

  // OUTBOUND is what constrains this cut, and its SHAPE is not the last one's.
  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S');
  ok(monolithBindings.size > 200, '…and is the whole set, not an empty one');
  const bodyMasked = VIEWS.code.slice(RAW_AT, BODY_END);
  const outbound = {};
  let outboundTotal = 0;
  for (const n of monolithBindings) {
    if (OWNED.has(n)) continue;
    for (const p of refSites(bodyMasked, n)) {
      if (isWriteAt(bodyMasked, p, n)) { outbound[n] = (outbound[n] || 0) + 1; outboundTotal++; }
    }
  }
  eq(Object.keys(outbound), [OUTBOUND_BINDING], 'it writes exactly ONE binding it does not own');
  eq(outboundTotal, OUTBOUND_WRITES, '…three times');

  // "All by key" would be FALSE here — one is a dotted lazy init. Measured.
  const shapes = refSites(bodyMasked, OUTBOUND_BINDING)
    .filter((p) => isWriteAt(bodyMasked, p, OUTBOUND_BINDING))
    .map((p) => BODY.slice(p, p + 40).replace(/\s+/g, ' '));
  eq(shapes.filter((s) => /^S\.greeksCache\[/.test(s)).length, OUTBOUND_KEYED,
    'TWO of the three are keyed writes into the cache');
  eq(shapes.filter((s) => /^S\.greeksCache =/.test(s)).length, 1,
    '…and ONE is a dotted assignment, so "all by key" would be false');
  // A substring match cannot tell a guard from a reset: 'S.greeksCache = {};'
  // is a substring of the guarded form, so it would pass either way. Measure
  // the guard — every dotted write must be preceded by its `if (!…)` test.
  {
    const dotted = refSites(bodyMasked, OUTBOUND_BINDING)
      .filter((p) => isWriteAt(bodyMasked, p, OUTBOUND_BINDING))
      .filter((p) => /^S\.greeksCache =/.test(BODY.slice(p, p + 20)));
    eq(dotted.length, 1, 'there is exactly ONE dotted write to guard');
    const line = BODY.slice(BODY.lastIndexOf('\n', dotted[0]) + 1,
                            BODY.indexOf('\n', dotted[0])).trim();
    eq(line, OUTBOUND_LAZY_INIT, 'and its whole LINE is the guarded lazy init, guard included');
    ok(/^if \(!S\.greeksCache\)/.test(line),
      '…so the assignment cannot run when a cache already exists');
    eq(/^if \(!S\.greeksCache\)/.test('S.greeksCache = {};'), false,
      'control — the unguarded form would fail that test, which a substring match did not');
  }
  eq(/(^|[^.\w$])S\s*=[^=]/.test(bodyMasked), false,
    'and `S` itself is NEVER rebound — every write is a property write');
  eq(scanTopLevelDeclarations(CODE).filter((d) => d.name === 'S')[0].form, 'const',
    'control — S is a const, so a rebinding could not have been written anyway');

  eq(statementLines(BODY, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'the region is two declarations and nothing else — zero top-level statement lines');
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 0,
    'control — the same counter finds statements in the monolith as a whole');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. What it was chosen over — including a candidate this audit REJECTS');
// ─────────────────────────────────────────────────────────────────────────────
{
  function measure(at, end) {
    const ds = scanTopLevelDeclarations(CODE.slice(at, end));
    const names = new Set(ds.map((d) => d.name));
    const per = {};
    let edges = 0;
    for (const n of names) {
      for (const p of refSites(VIEWS.code, n)) if (p < at || p >= end) { per[n] = (per[n] || 0) + 1; edges++; }
    }
    const bm = VIEWS.code.slice(at, end);
    let out = 0;
    for (const n of new Set(bindingNames(scanTopLevelDeclarations(CODE)))) {
      if (names.has(n)) continue;
      for (const p of refSites(bm, n)) if (isWriteAt(bm, p, n)) out++;
    }
    return { owners: ds.length, per, edges, out, crossings: edges + out };
  }
  eq(measure(RAW_AT, BODY_END).crossings, EXTERNAL_EDGE_TOTAL + OUTBOUND_WRITES,
    'the recommended region costs FIVE crossings');

  // Anchored to real marks, so a one-unit shift of either end cannot pass.
  const marks = topLevelBanners(CODE, FN_BODIES);
  ok(marks.indexOf(HELPER[0]) >= 0, 'the snapshot helper opens on a real banner');
  ok(marks.indexOf(HELPER[1] + 1) >= 0, '…and its seam is the banner one unit past its end');
  eq(snapBodyEnd(CODE, HELPER[0], HELPER[1] + 1), HELPER[1], '…so snapBodyEnd reproduces that end');
  const helper = measure(HELPER[0], HELPER[1]);
  eq(helper.edges, HELPER_EDGES, 'the Journal snapshot helper costs six edges');
  eq(helper.out, HELPER_OUTBOUND, '…and zero outbound');
  eq(helper.crossings, 6, '…six crossings against this candidate’s five, as #431 recorded');

  // THE REJECTED CANDIDATE. The scanner-charts helper is the sibling of the
  // region #434 extracted and carries the identical debug-block shape, so the
  // narrow-cut judgement looked transferable. It is not.
  ok(marks.indexOf(SCANNER_REGION[0]) >= 0, 'the scanner region opens on a real banner');
  ok(marks.indexOf(SCANNER_REGION[1] + 1) >= 0, '…and its seam is the banner one past its end');
  const scanner = measure(SCANNER_REGION[0], SCANNER_REGION[1]);
  eq(scanner.owners, SCANNER_OWNERS, 'the scanner banner region holds ELEVEN owners');
  eq(scanner.edges, SCANNER_EDGES, '…fifty external edges');
  eq(scanner.out, SCANNER_OUTBOUND, '…and three outbound writes');
  {
    const owner = scanTopLevelDeclarations(CODE.slice(SCANNER_REGION[0], SCANNER_REGION[1]))
      .filter((d) => d.name === SCANNER_NARROW_OWNER)[0];
    ok(owner, 'the scanner fetch owner is found inside that region');
    const end = SCANNER_REGION[0] + owner.start + owner.chars;
    eq(end, SCANNER_NARROW_OWNER_END, 'its declaration ends at the pinned offset');
    throwsWith(() => assertSeam(CODE, SCANNER_REGION[0], snapBodyEnd(CODE, SCANNER_REGION[0], end + 2)),
      SCANNER_NARROW_SEAM_ERROR,
      'and assertSeam REFUSES the narrow cut outright — the shape transferred, the cut did not');
  }

  // THE SCREEN'S OWN LIMIT: that 53 does not describe a feature. One shared
  // utility contributes most of it.
  eq(scanner.per[SCANNER_TOP_EDGE_NAME], SCANNER_TOP_EDGE_COUNT,
    'escHtml alone contributes FORTY of the region’s fifty edges');
  ok(SCANNER_TOP_EDGE_COUNT > SCANNER_EDGES * 0.75,
    '…more than three quarters of them');
  const esc = scanTopLevelDeclarations(CODE.slice(SCANNER_REGION[0], SCANNER_REGION[1]))
    .filter((d) => d.name === SCANNER_TOP_EDGE_NAME)[0];
  eq(esc.chars, SCANNER_TOP_EDGE_CHARS, '…and it is 134 units — a shared escaper, not the feature');
  ok(Object.keys(scanner.per).length < scanner.owners,
    'most of the eleven owners have NO external edge at all, which the region score hides');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Can it be a module');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(BODY, OWNERS, maskLiterals), [],
    'NOTHING is read at evaluation time — the list is empty');
  const probe = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals),
    ['elsewhere', 'window'], 'control — a region that reads a foreign name at load reports it');

  const monolith = new Map(scanTopLevelDeclarations(CODE).map((d) => [d.name, d.form]));
  const masked = maskLiterals(BODY);
  const referenced = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) if (!OWNED.has(m[2])) referenced.add(m[2]);
  eq(Array.from(referenced).filter((n) => monolith.has(n)).sort(), MONOLITH_DEPENDENCIES,
    'it depends on exactly these seven monolith names');
  eq(monolith.get('S'), 'const', 'S among them is the const no module can supply');
  const spans = OWNERS.map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of MONOLITH_DEPENDENCIES) for (const p of refSites(masked, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'not one of them is read at evaluation time');

  const fromModules = {};
  for (const rel of LOCALS) {
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on one name from one sibling module');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < MODULE_POSITION, '…which is before this module would');
  }
  eq(LOCAL_SCRIPT_COUNT + 1, MODULE_POSITION, 'the new module would load 67th');

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(BODY, sandbox, { filename: MODULE_REL });
  eq(Object.keys(sandbox).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(sandbox).sort(), OWNERS_EXPECTED.map((o) => o.name).sort(), '…defining exactly its two owners');
  eq(Object.keys(sandbox).every((k) => sandbox[k].constructor.name === 'AsyncFunction'), true,
    '…both async functions');
}

// The behavioural half runs asynchronously; assertions are counted the same way.
const behaviour = (async () => {
  section('7b. The lazy init, driven rather than described');
  const load = (S) => {
    const h = {
      console: { log() {}, warn() {}, error() {} }, S,
      ttCall: async () => null, fetchLiveQuote: async () => null,
      fetchBackendOptionLive: async () => null,
      subscribeDxlinkQuotes: () => {}, subscribeBackendOptionLive: () => {},
      getPreferredOptionDxlinkSymbol: () => null, _saveGreeksCache: () => {},
      Date, Math, JSON, Object, Array, Promise, String, Number, isNaN, parseFloat,
      setTimeout, clearTimeout,
    };
    vm.createContext(h);
    vm.runInContext(BODY, h, { filename: MODULE_REL });
    return h;
  };
  const OWNER = 'prefetchJournalSnapshotFromBackendDxlink';

  // Every dependency resolves at CALL time: the empty VM loads it, and only
  // calling it fails — naming the monolith const it reaches first.
  const empty = {};
  vm.createContext(empty);
  vm.runInContext(BODY, empty, { filename: MODULE_REL });
  const rejected = await empty[OWNER]('SPY', []).then(() => null, (e) => e);
  // Not `instanceof`: the error is constructed inside the VM, so a cross-realm
  // instanceof is false even for exactly the expected error.
  eq(rejected.constructor.name, 'ReferenceError',
    'calling it in the empty VM REJECTS — it does not fail at load');
  eq(rejected.message, 'S is not defined', '…naming the monolith const it reaches first');

  // The guard CREATES a cache when there is none…
  const fresh = load({ ttSessionId: null });
  eq(fresh.S.greeksCache, undefined, 'control — the host starts with no greeks cache');
  const summary = await fresh[OWNER]('SPY', []);
  eq(typeof fresh.S.greeksCache, 'object', 'the guarded lazy init creates one');
  eq(summary.source, 'BACKEND_DXLINK_PREFETCH', '…and the call returns its own summary shape');
  eq(summary.ticker, 'SPY', '…carrying the ticker it was given');

  // …and PRESERVES one that already exists. This is the assertion that
  // separates a lazy init from a reset, and no static read of the source
  // distinguishes them as plainly.
  const warm = load({ ttSessionId: null, greeksCache: { AAPL: { keep: 1 } } });
  await warm[OWNER]('SPY', []);
  eq(warm.S.greeksCache.AAPL, { keep: 1 }, 'a pre-existing cache entry is PRESERVED, not reset');
})();

// ─────────────────────────────────────────────────────────────────────────────
section('8. The extraction Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag is 67 units');
  eq(TAG, '<script src="./' + MODULE_REL + '"></script>\n', 'the tag names exactly this module path');
  ok(INDEX.indexOf(ANCHOR_TAG) > 0, 'the anchor tag — the newest layer — is present');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT present: this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');

  const at = INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const withTag = INDEX.slice(0, at) + TAG + INDEX.slice(at);
  const raw = CODE.slice(RAW_AT, RAW_END);
  eq(withTag.split(raw).length - 1, 1, 'the raw block occurs exactly once in the document');
  const extracted = withTag.replace(raw, '');
  eq(Array.from(extracted).length, EXTRACTED_CHARS, 'index.html would become 1,583,906 units');
  eq(sha256(extracted), EXTRACTED_SHA256, '…hashing to the digest Phase 2 must match');
  eq(BASE_CHARS - EXTRACTED_CHARS, RAW_CHARS - TAG_CHARS, 'the arithmetic closes: 10,669 out, 67 in');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src)).length,
    MODULE_POSITION, 'sixty-seven local scripts afterwards');

  const restored = extracted.replace(TAG, '');
  const back = restored.slice(0, CODE_AT + RAW_AT) + raw + restored.slice(CODE_AT + RAW_AT);
  eq(sha256(back), BASE_SHA256, 'and the reverse transform reproduces the base byte for byte');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  const isAncestor = (a, b) => {
    try { git(['merge-base', '--is-ancestor', a, b]); return true; } catch (e) { return false; }
  };
  ok(isAncestor(BASE_SHA, 'HEAD'), 'the pinned base is an ancestor of HEAD');
  eq(isAncestor(BASE_SHA, BASE_SHA + '^'), false,
    'control — the relation is directional, so the check is not vacuously true');
  const changed = git(['diff', '--name-only', BASE_SHA]).split('\n').filter(Boolean);
  eq(changed.filter((f) => !/^tests\//.test(f)), [],
    'not one file outside tests/ differs from the base');
  eq(git(['show', BASE_SHA + ':index.html']), INDEX, 'index.html is byte-identical to the base');
  for (const rel of LOCALS) {
    eq(git(['show', BASE_SHA + ':' + rel]), fs.readFileSync(path.join(ROOT, rel), 'utf8'),
      rel + ' is byte-identical to the base');
  }
}

behaviour.then(() => {
  console.log('\n' + pass + ' assertions passed.');
}, (e) => {
  console.error(e);
  process.exit(1);
});
