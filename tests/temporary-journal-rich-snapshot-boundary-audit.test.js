'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// RICH ASYNC SNAPSHOT — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. `_buildRichSnapshot`, [1377622,1393574): 15,952 units in
// ONE owner — a single async function that fetches 1D candles and computes
// every indicator for a journal snapshot.
//
//     3 external executable edges, over ONE name, all at call time
//     0 references from generated markup
//     0 inbound writes
//     2 outbound writes, both BY KEY on `_ivrCache`
//     0 top-level statement lines, and `evaluationTimeReads` is EMPTY
//     it loads in a COMPLETELY empty VM
//
// A ONE-OWNER MODULE IS NOT NEW, and two drafts of this header got the scope
// wrong before §4 was written to measure it. Over the TWENTY monolith-extraction
// layers, exactly one has a single owner — js/services/apex-post-auth-init.js,
// 4,470 units — so this would be the second there, and the larger of the two.
// Over ALL SIXTY-FOUR local scripts the count is SIX, and one of them
// (js/ui/pess-batch-panel.js, 24,542 units) is larger than this candidate. Both
// sets are asserted in §4; neither number is offered as a reason to cut here.
//
// WHAT IT WAS CHOSEN OVER, measured the same way. The Journal snapshot helper
// at [1254714,1265509) is the runner-up: 10,795 units, THREE owners, six edges
// over two names and — better than this candidate — ZERO outbound writes. It
// loses on total crossings (6 against 5) and on size, and §6 records both so
// the comparison is not re-litigated from memory next cycle.
//
// AND THE SPLIT RULE FROM #429/#430 STILL APPLIES PER FAMILY. §6 re-measures
// the snapshot family: the helper joined with its neighbours costs 11 edges
// over 6 names against 6 over 2 alone, so it stays alone. This candidate has
// no neighbour to join — the region that follows is the JOURNAL MANAGER
// header, and joining it changes nothing, which §6 also shows.
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
const BASE_SHA = 'b23aa9bbaa4b4c5828f09d16a48200e9ce3b64df';
const BASE_CHARS = 1618149;
const BASE_SHA256 = '67a94fd413e30fd970a6aee717d5a563a3fc662668ea4fb01efce21b9f05bb9e';
const CODE_AT = 113642;
const CODE_CHARS = 1504481;
const LOCAL_SCRIPT_COUNT = 64;
// This audit is the 148th file. Phase 2 replaces it one for one.
const TEST_FILE_COUNT = 148;

// ── The region ───────────────────────────────────────────────────────────────
// Monolith coordinates. RAW_AT is the `// ── ` banner that opens the feature;
// RAW_END is the first unit of the `// ══ JOURNAL MANAGER` header after it.
const RAW_AT = 1377622;
const RAW_END = 1393575;
const RAW_CHARS = 15953;
const BODY_END = 1393574;
const MODULE_CHARS = 15952;
const MODULE_SHA256 = 'a34e9fd794f5d0f40aa70bb30b94e04a84652aeac1e9aed11408e56fbb29dda2';
const OWNER = '_buildRichSnapshot';
const OWNER_CHARS = 15778;
const OWNER_COUNT = 1;

// A one-owner module already exists. Named, not counted from a partial look.
const EXISTING_ONE_OWNER = 'js/services/apex-post-auth-init.js';
const EXISTING_ONE_OWNER_CHARS = 4470;
const CHAIN_LENGTH = 20;
const ALL_ONE_OWNER_COUNT = 6;
const LARGEST_ONE_OWNER = 'js/ui/pess-batch-panel.js';
const LARGEST_ONE_OWNER_CHARS = 24542;
// The twenty layers cut out of the inline monolith, oldest first. NOT the same
// set as "every local script", which is what §4(b) measures separately.
const EXTRACTION_CHAIN = [
  'js/services/journal-core.js', 'js/services/mcx-regime-policy.js', 'js/ui/journal-ui.js',
  'js/services/journal-remote-persistence.js', 'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js', 'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js', 'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js', 'js/ui/tt-reconnect.js', 'js/ui/journal-close-legs.js',
  'js/ui/journal-trade-forms.js', 'js/ui/journal-trade-detail.js',
  'js/portfolio/portfolio-data-fetch.js', 'js/portfolio/backend-portfolios.js',
  'js/portfolio/portfolio-expiry-manual.js', 'js/portfolio/portfolio-traffic-light.js',
  'js/ui/backend-candle-store-chart.js',
];

// ── What the screen saw ──────────────────────────────────────────────────────
const TOP_LEVEL_BANNERS = 190;
const SCREEN_FLOOR = 8000;
const SCREENED_REGIONS = 42;

// ── Coupling, both directions ────────────────────────────────────────────────
const EXTERNAL_EDGES = { _buildRichSnapshot: 3 };
const EXTERNAL_EDGE_TOTAL = 3;
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
const OUTBOUND_BINDING = '_ivrCache';
const OUTBOUND_WRITES = 2;
const OUTBOUND_DECLARED_AT = 1290588;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The runner-up, and the family split ──────────────────────────────────────
const HELPER = [1254714, 1265509];
const HELPER_CHARS = 10795;
const HELPER_OWNERS = 3;
const HELPER_EDGES = 6;
const HELPER_EDGE_NAMES = 2;
const HELPER_OUTBOUND = 0;
const HELPER_JOINED = [1254714, 1278340];
const HELPER_JOINED_EDGES = 11;
const HELPER_JOINED_NAMES = 6;
// This candidate's own neighbour: joining it adds the JOURNAL MANAGER header
// and no owners, so nothing changes.
const WITH_NEXT_HEADER = 1393688;

// ── Dependencies ─────────────────────────────────────────────────────────────
const MONOLITH_DEPENDENCIES = ['S', '_calcTechnicalsFromCandles', '_earningsCache',
  '_ensureVixFamily', '_getIntradayTech', '_getTechForTF', '_ivrCache',
  '_portfolioLatestBackendBetaEntry'];
const SIBLING_DEPENDENCIES = {
  'js/utils/normalizers.js': ['normalizeIvrPercent'],
  'js/api/backend-client.js': ['ttCall'],
};
const SIBLING_POSITIONS = { 'js/utils/normalizers.js': 3, 'js/api/backend-client.js': 4 };
const MODULE_POSITION = 65;
const VM_GLOBALS = 1;

// ── The modelled extraction ──────────────────────────────────────────────────
const MODULE_REL = 'js/services/journal-rich-snapshot.js';
const TAG = '<script src="./js/services/journal-rich-snapshot.js"></script>\n';
const TAG_CHARS = 63;
const ANCHOR_TAG = '<script src="./js/ui/backend-candle-store-chart.js"></script>\n';
const EXTRACTED_CHARS = 1602259;
const EXTRACTED_SHA256 = '6db6f8fd99da797003ca89e022ead159524bfbd4febbe0b54b0523f4fd001fa1';

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

console.log('RICH ASYNC SNAPSHOT — TEMPORARY BOUNDARY AUDIT');

const INDEX = APP_LOADER.loadIndexHtml();
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const VIEWS = lexicalViews(CODE);
const BODY = CODE.slice(RAW_AT, BODY_END);
const OWNERS = scanTopLevelDeclarations(BODY);
const OWNED = new Set(OWNERS.map((d) => d.name));

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(Array.from(INDEX).length, BASE_CHARS, 'index.html is 1,618,149 units');
eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned digest');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at the pinned offset');
eq(Array.from(CODE).length, CODE_CHARS, '…and is 1,504,481 units');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-four local scripts precede it');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 148 files — this audit is the one that was added');
eq(git(['diff', '--name-only', '--diff-filter=A', BASE_SHA]).split('\n').filter(Boolean),
  ['tests/temporary-journal-rich-snapshot-boundary-audit.test.js'],
  '…and it is the ONLY file this PR adds');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The screen');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, functionBodyRanges(CODE));
  eq(marks.length, TOP_LEVEL_BANNERS, '190 banners sit at top level');
  const all = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m; while ((m = re.exec(CODE))) all.push(m.index);
  }
  ok(all.length > marks.length,
    'control — the unfiltered count is strictly larger, so the top-level filter does work');
  ok(marks.indexOf(RAW_AT) >= 0, 'the chosen region opens on one of them');
  ok(marks.indexOf(RAW_END) >= 0, '…and ends on another');
  ok(marks.indexOf(HELPER[0]) >= 0 && marks.indexOf(HELPER[1]) >= 0,
    'so is the runner-up, at both ends');

  let screened = 0;
  for (let i = 0; i < marks.length; i++) {
    const end = (i + 1 < marks.length ? marks[i + 1] : CODE.length);
    if (end - marks[i] >= SCREEN_FLOOR && scanTopLevelDeclarations(CODE.slice(marks[i], end)).length) screened++;
  }
  eq(screened, SCREENED_REGIONS, '42 banner-to-banner regions clear the floor and own declarations');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE.slice(RAW_AT, RAW_AT + 100).indexOf('RICH ASYNC SNAPSHOT') > 0,
    'the region opens on the feature’s own banner');
  ok(CODE.slice(RAW_END, RAW_END + 200).indexOf('JOURNAL MANAGER') > 0,
    'and what follows the seam is a different feature');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END,
    'snapBodyEnd lands one unit short of the next header — the trailing blank line');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END,
    'assertSeam accepts the boundary and resumes at the next feature');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 15,953 units');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 15,952');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', 'the raw block is the body plus one LF');
  eq(BODY.slice(-2), '}\n', 'the body ends on a closing brace and a newline');

  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the header is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. ONE owner — and that is not new');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares exactly one name at top level');
  eq(OWNERS[0].name, OWNER, '…and it is _buildRichSnapshot');
  eq(OWNERS[0].chars, OWNER_CHARS, '…spanning 15,778 of the 15,952 units');
  eq(OWNERS[0].isAsync, true, '…and it is async');
  eq(bindingNames(OWNERS), [], 'it owns no binding at all');

  // TWO different sets, because the answer differs between them and a draft of
  // this file's header quantified over the wrong one.
  const owners = (rel) => scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length;

  // (a) the twenty monolith-extraction layers.
  eq(EXTRACTION_CHAIN.length, CHAIN_LENGTH, 'twenty layers have been extracted from the monolith');
  const chainOneOwner = EXTRACTION_CHAIN.filter((rel) => owners(rel) === 1);
  eq(chainOneOwner, [EXISTING_ONE_OWNER], 'exactly ONE of them has a single owner');
  eq(Array.from(fs.readFileSync(path.join(ROOT, EXISTING_ONE_OWNER), 'utf8')).length,
    EXISTING_ONE_OWNER_CHARS, '…and it is 4,470 units');
  ok(MODULE_CHARS > EXISTING_ONE_OWNER_CHARS,
    '…so this candidate would be the second there, and the larger of the two');

  // (b) every local script, where the answer is different.
  const allOneOwner = LOCALS.filter((rel) => owners(rel) === 1);
  eq(allOneOwner.length, ALL_ONE_OWNER_COUNT, 'across all sixty-four local scripts, SIX have one owner');
  const biggest = allOneOwner
    .map((rel) => ({ rel, n: Array.from(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length }))
    .sort((a, b) => b.n - a.n)[0];
  eq(biggest.rel, LARGEST_ONE_OWNER, '…and the largest of those is the PESS batch panel');
  eq(biggest.n, LARGEST_ONE_OWNER_CHARS, '…at 24,542 units');
  ok(biggest.n > MODULE_CHARS,
    '…which is LARGER than this candidate, so "the biggest one-owner module" would be false');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling, measured in BOTH directions');
// ─────────────────────────────────────────────────────────────────────────────
{
  const edges = {};
  let total = 0;
  for (const n of OWNED) {
    for (const p of refSites(VIEWS.code, n)) {
      if (p < RAW_AT || p >= BODY_END) { edges[n] = (edges[n] || 0) + 1; total++; }
    }
  }
  eq(edges, EXTERNAL_EDGES, 'three external executable edges, over ONE name');
  eq(total, EXTERNAL_EDGE_TOTAL, '…three references in total');

  const spans = scanTopLevelDeclarations(CODE).map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const p of refSites(VIEWS.code, OWNER)) {
    if ((p < RAW_AT || p >= BODY_END) && outside(p)) evalTime++;
  }
  eq(evalTime, 0, 'every one of the three sits inside a declaration — call time');

  let markup = 0;
  for (const n of OWNED) {
    for (const p of refSites(VIEWS.strings, n)) if (p < RAW_AT || p >= BODY_END) markup++;
  }
  eq(markup, MARKUP_REFERENCES, 'no owner is named inside a string the monolith builds');
  ok(refSites(VIEWS.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  // Write-detector controls: this region performs only KEYED writes, so the
  // direct-assignment branch is not exercised by the data.
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  eq(bindingNames(OWNERS).length, 0, 'the region owns no binding, so inbound writes are vacuous');
  let inbound = 0;
  for (const n of bindingNames(OWNERS)) {
    for (const p of refSites(VIEWS.code, n)) {
      if ((p < RAW_AT || p >= BODY_END) && isWriteAt(VIEWS.code, p, n)) inbound++;
    }
  }
  eq(inbound, INBOUND_WRITES, '…and there are none');

  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S, so it is not var-only');
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
  eq(Object.keys(outbound), [OUTBOUND_BINDING], 'it writes exactly one binding it does not own');
  eq(outboundTotal, OUTBOUND_WRITES, '…twice');
  const writes = refSites(bodyMasked, OUTBOUND_BINDING)
    .filter((p) => isWriteAt(bodyMasked, p, OUTBOUND_BINDING))
    .map((p) => BODY[p + OUTBOUND_BINDING.length]);
  eq(writes, ['[', '['], 'both writes are BY KEY, never rebindings of the name');
  const declared = scanTopLevelDeclarations(CODE).filter((d) => d.name === OUTBOUND_BINDING);
  eq(declared.length, 1, 'the cache is declared exactly once in the monolith');
  eq(declared[0].start, OUTBOUND_DECLARED_AT, '…at the pinned offset');
  ok(declared[0].start < RAW_AT, '…before this region, so the cut does not move it');
  eq(declared[0].form, 'var', '…as a var, so the module resolves it at call time');

  eq(statementLines(BODY, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'the region is one declaration and nothing else — zero top-level statement lines');
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 0,
    'control — the same counter finds statements in the monolith as a whole');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. What it was chosen over, and the split rule per family');
// ─────────────────────────────────────────────────────────────────────────────
{
  function edges(at, end) {
    const names = new Set(scanTopLevelDeclarations(CODE.slice(at, end)).map((d) => d.name));
    const seen = {};
    let total = 0;
    for (const n of names) {
      for (const p of refSites(VIEWS.code, n)) {
        if (p < at || p >= end) { seen[n] = (seen[n] || 0) + 1; total++; }
      }
    }
    return { owners: names.size, names: Object.keys(seen).length, total };
  }
  function outboundOf(at, end) {
    const owned = new Set(scanTopLevelDeclarations(CODE.slice(at, end)).map((d) => d.name));
    const bm = VIEWS.code.slice(at, end);
    let n = 0;
    for (const name of new Set(bindingNames(scanTopLevelDeclarations(CODE)))) {
      if (owned.has(name)) continue;
      for (const p of refSites(bm, name)) if (isWriteAt(bm, p, name)) n++;
    }
    return n;
  }

  // THE RUNNER-UP. Better on outbound, worse on total crossings and on size.
  const helper = edges(HELPER[0], HELPER[1]);
  eq(HELPER[1] - HELPER[0], HELPER_CHARS, 'the Journal snapshot helper is 10,795 units');
  eq(helper.owners, HELPER_OWNERS, '…with three owners');
  eq(helper.total, HELPER_EDGES, '…six external edges');
  eq(helper.names, HELPER_EDGE_NAMES, '…over two names');
  eq(outboundOf(HELPER[0], HELPER[1]), HELPER_OUTBOUND, '…and ZERO outbound writes');
  eq(helper.total + HELPER_OUTBOUND, 6, 'so the helper costs six crossings in total');
  eq(EXTERNAL_EDGE_TOTAL + OUTBOUND_WRITES, 5, '…and this candidate five');
  ok(MODULE_CHARS > HELPER_CHARS, '…while moving 5,157 more units');

  // The family split, re-measured: the helper stays ALONE.
  const joined = edges(HELPER_JOINED[0], HELPER_JOINED[1]);
  eq(joined.total, HELPER_JOINED_EDGES, 'joined with its neighbours the helper costs eleven edges');
  eq(joined.names, HELPER_JOINED_NAMES, '…over six names');
  ok(joined.total > helper.total, 'so joining is worse there, as #429 measured and #430 kept');

  // This candidate has no neighbour worth joining: the next region is a header.
  // The extension point must be a REAL top-level mark, or a one-unit shift of it
  // would change nothing and pin nothing — the survivor #429 and #430 both had.
  const marks = topLevelBanners(CODE, functionBodyRanges(CODE));
  ok(marks.indexOf(WITH_NEXT_HEADER) >= 0,
    'the extension point is a real top-level banner at ' + WITH_NEXT_HEADER);
  const withHeader = edges(RAW_AT, WITH_NEXT_HEADER);
  eq(withHeader.owners, OWNER_COUNT, 'extending to the next header adds no owner');
  eq(withHeader.total, EXTERNAL_EDGE_TOTAL, '…and no edge');
  ok(WITH_NEXT_HEADER > RAW_END, '…it only adds the JOURNAL MANAGER title block');
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
    'it depends on exactly these eight monolith names');
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
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on two names from two sibling modules');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < MODULE_POSITION, '…which is before this module would');
  }
  eq(LOCAL_SCRIPT_COUNT + 1, MODULE_POSITION, 'the new module would load 65th');

  // It loads bare — unlike the layer shipped last cycle, which needed `window`.
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(BODY, sandbox, { filename: MODULE_REL });
  eq(Object.keys(sandbox).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(sandbox), [OWNER], '…defining exactly its one owner');
  eq(typeof sandbox[OWNER], 'function', '…and it is callable');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The extraction Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag is 63 units');
  ok(INDEX.indexOf(ANCHOR_TAG) > 0, 'the anchor tag — the newest layer — is present');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT present: this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');

  const at = INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const withTag = INDEX.slice(0, at) + TAG + INDEX.slice(at);
  const raw = CODE.slice(RAW_AT, RAW_END);
  eq(withTag.split(raw).length - 1, 1, 'the raw block occurs exactly once in the document');
  const extracted = withTag.replace(raw, '');
  eq(Array.from(extracted).length, EXTRACTED_CHARS, 'index.html would become 1,602,259 units');
  eq(sha256(extracted), EXTRACTED_SHA256, '…hashing to the digest Phase 2 must match');
  eq(BASE_CHARS - EXTRACTED_CHARS, RAW_CHARS - TAG_CHARS, 'the arithmetic closes: 15,953 out, 63 in');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src)).length,
    MODULE_POSITION, 'sixty-five local scripts afterwards');

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
  // The control must hold whether or not this audit is committed yet, so it
  // compares the base against its own parent rather than against HEAD.
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

console.log('\n' + pass + ' assertions passed.');
