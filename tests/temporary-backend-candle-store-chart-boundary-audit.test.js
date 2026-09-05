'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND CANDLE STORE CHART + MAIN CHART — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// THE RECOMMENDATION IS ANOTHER JOINT CUT — AND THE REASON IS NOT THE ONE
// #427 FOUND. It would be easy to read that cycle as "adjacent regions are
// coupled, so take them together". This audit measured TWO neighbouring
// families the same way, and the generalisation is false for one of them: §6
// records that joining the Journal snapshot family costs ELEVEN AND A HALF
// TIMES more, 69 edges against 6. The rule is not "join neighbours"; it is
// "measure the split before choosing", and the answer differs per family.
//
// WHAT IS RECOMMENDED. The backend-candle-store chart experiment together with
// the main CHART section it feeds, [713744,739006):
//
//     BACKEND CANDLE STORE CHART EXPERIMENT   14 owners,   8,656 units
//     CHART                                    8 owners,  16,607 units
//
// Split at the `// ══ CHART` header between them:
//
//     taken separately   32 external executable edges over 11 names
//     taken together      8 external executable edges over  2 names
//
// That is 24 edges saved — a factor of four — and the region carries ZERO
// state coupling in both
// directions: nothing outside writes a binding it owns, and it writes no
// binding it does not own.
//
// IT IS NOT FREE, AND THE PRICE IS STATED HERE RATHER THAN DISCOVERED IN
// REVIEW. The block performs ONE top-level statement:
//
//     window.apexSetBackendCandleStoreChartTimeframe = setBackendCandleStoreChartTimeframe;
//
// so the module would be the SECOND to assign to `window` at evaluation time.
// The backend-directional-snapshot contract currently pins that exactly one
// does. §7 measures what that statement actually reads — `window`, and a
// function the block itself declares — and nothing the monolith owns, so it is
// a relocation of an exposure that already exists, the same case the first one
// was. Phase 2 must restate that invariant as TWO modules, both by relocation.
// A consequence of the same statement: this block does NOT load in a completely
// empty VM. It needs `window` and nothing else, which §7 shows.
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
const BASE_SHA = '7fb407be9f6592eeaea798b228cf6eb3f91ea3a8';
const BASE_CHARS = 1643350;
const BASE_SHA256 = '63dbe633ddb5edaa2a2343c161120b78275eac20a0bfc41b1f1fa1bd6127206f';
const CODE_AT = 113580;
const CODE_CHARS = 1529744;
const LOCAL_SCRIPT_COUNT = 63;
// This audit is the 147th file. Phase 2 replaces it one for one.
const TEST_FILE_COUNT = 147;

// ── The region, as a judgement ───────────────────────────────────────────────
// Monolith coordinates. RAW_AT is the column-0 `// ══` ruler that opens the
// experiment's title block; RAW_END is the first unit of the `// ══ FUNDAMENTALS`
// header that opens the next feature.
const RAW_AT = 713744;
const RAW_END = 739007;
const RAW_CHARS = 25263;
const BODY_END = 739006;
const MODULE_CHARS = 25262;
const MODULE_SHA256 = '83a0d62098cd092f120e8438af0ba886fd47e1f9c84009f6f4615843f34e483e';
const OWNER_COUNT = 22;
const OWNER_SPAN_SUM = 24080;
const ASYNC_OWNERS = 6;
const OWNED_BINDINGS = ['APEX_FF_BACKEND_CANDLE_STORE_CHART', '_BACKEND_CANDLE_STORE_CHART_SOURCE',
  '_BACKEND_CANDLE_STORE_CHART_TF', 'CHART_STATE'];
// The header the region spans, which is why no banner rule finds this boundary.
const SPANNED_HEADER_AT = 722400;
const SPLIT_HEADER_TITLE = '// CHART';

// ── What the screen saw ──────────────────────────────────────────────────────
const TOP_LEVEL_BANNERS = 194;
const SCREEN_FLOOR = 8000;
const SCREENED_REGIONS = 44;

// ── Coupling, both directions ────────────────────────────────────────────────
const EXTERNAL_EDGES = { _backendCandleStoreChartNormTime: 4, CHART_STATE: 4 };
const EXTERNAL_EDGE_TOTAL = 8;
const MARKUP_REFERENCES = { openChart: 1 };
const INBOUND_WRITES = 0;
const OUTBOUND_WRITES = 0;
const TOP_LEVEL_STATEMENT = 'window.apexSetBackendCandleStoreChartTimeframe=setBackendCandleStoreChartTimeframe;';
const WINDOW_TARGET = 'apexSetBackendCandleStoreChartTimeframe';

// ── The split, and the two families where joining is WRONG ───────────────────
// The split point IS the spanned header, and the halves ARE the region's own
// endpoints. Written as separate constants they duplicated those offsets and a
// one-unit shift of either survived mutation — pins that checked nothing.
const SPLIT_A = [RAW_AT, SPANNED_HEADER_AT];
const SPLIT_B = [SPANNED_HEADER_AT, RAW_END];
const SPLIT_A_CHARS = 8656;
const SPLIT_B_CHARS = 16607;
const SPLIT_EDGE_TOTAL = 32;
const SPLIT_EDGE_NAMES = 11;
// Journal snapshot family: joining makes it worse, not better.
const SNAPSHOT_HELPER = [1279977, 1290772];
const SNAPSHOT_HELPER_EDGES = 6;
const SNAPSHOT_JOINED = [1279977, 1321110];
const SNAPSHOT_JOINED_EDGES = 69;

// ── Dependencies ─────────────────────────────────────────────────────────────
const MONOLITH_DEPENDENCIES = ['S', '_loadBackendChartCandles', 'fetchCandles',
  'ffPreferBackendCandlesForCharts', 'postCandleContext', 'resolveLatestDisplayPrice', 'showToast'];
const SIBLING_DEPENDENCIES = {
  'js/api/backend-client.js': ['ttCall'],
  'js/config/backend-config.js': ['BACKEND'],
  'js/services/candle-provenance.js': ['_recordCandleProvenance', '_recordBackendCandleProvenance'],
};
const SIBLING_POSITIONS = { 'js/api/backend-client.js': 4, 'js/config/backend-config.js': 5,
  'js/services/candle-provenance.js': 20 };
const MODULE_POSITION = 64;
const VM_GLOBALS = 22;

// ── The modelled extraction ──────────────────────────────────────────────────
const MODULE_REL = 'js/ui/backend-candle-store-chart.js';
const TAG = '<script src="./js/ui/backend-candle-store-chart.js"></script>\n';
const TAG_CHARS = 62;
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-traffic-light.js"></script>\n';
const EXTRACTED_CHARS = 1618149;
const EXTRACTED_SHA256 = '67a94fd413e30fd970a6aee717d5a563a3fc662668ea4fb01efce21b9f05bb9e';
// The one module that already assigns to window at evaluation time.
const EXISTING_WINDOW_MODULE = 'js/portfolio/backend-portfolios.js';

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

console.log('BACKEND CANDLE STORE CHART + MAIN CHART — TEMPORARY BOUNDARY AUDIT');

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
eq(Array.from(INDEX).length, BASE_CHARS, 'index.html is 1,643,350 units');
eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned digest');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at the pinned offset');
eq(Array.from(CODE).length, CODE_CHARS, '…and is 1,529,744 units');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-three local scripts precede it');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 147 files — this audit is the one that was added');
eq(git(['diff', '--name-only', '--diff-filter=A', BASE_SHA]).split('\n').filter(Boolean),
  ['tests/temporary-backend-candle-store-chart-boundary-audit.test.js'],
  '…and it is the ONLY file this PR adds');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The screen, run with the corrected rules');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, functionBodyRanges(CODE));
  eq(marks.length, TOP_LEVEL_BANNERS, '194 banners sit at top level');
  const all = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m; while ((m = re.exec(CODE))) all.push(m.index);
  }
  ok(all.length > marks.length,
    'control — the unfiltered count is strictly larger, so the top-level filter does work');
  ok(marks.indexOf(RAW_AT) >= 0, 'the chosen region opens on one of them');
  ok(marks.indexOf(SPANNED_HEADER_AT) >= 0, '…and SPANS another one');
  ok(marks.indexOf(RAW_END) >= 0, '…and ends on a third');

  let screened = 0;
  for (let i = 0; i < marks.length; i++) {
    const end = (i + 1 < marks.length ? marks[i + 1] : CODE.length);
    if (end - marks[i] >= SCREEN_FLOOR && scanTopLevelDeclarations(CODE.slice(marks[i], end)).length) screened++;
  }
  eq(screened, SCREENED_REGIONS, '44 banner-to-banner regions clear the floor and own declarations');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary is a judgement — this one spans a header too');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(SPANNED_HEADER_AT > RAW_AT && SPANNED_HEADER_AT < BODY_END,
    'a `// ══` header sits INSIDE the chosen region');
  eq(CODE.slice(SPANNED_HEADER_AT, SPANNED_HEADER_AT + 5), '// ══', '…at column 0');
  ok(CODE.slice(SPANNED_HEADER_AT, SPANNED_HEADER_AT + 140).indexOf(SPLIT_HEADER_TITLE) > 0,
    '…and it is the CHART header');
  ok(CODE.slice(RAW_AT, RAW_AT + 140).indexOf('BACKEND CANDLE STORE CHART EXPERIMENT') > 0,
    'the region opens on the experiment’s own title block');
  ok(CODE.slice(RAW_END, RAW_END + 140).indexOf('FUNDAMENTALS') > 0,
    'and what follows the seam is a different feature');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END,
    'snapBodyEnd lands one unit short of the next header — the trailing blank line');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END,
    'assertSeam accepts the boundary and resumes at the next feature');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 25,263 units');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 25,262');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', 'the raw block is the body plus one LF');

  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the header is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The twenty-two owners');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares twenty-two names at top level');
  eq(OWNERS.reduce((a, d) => a + d.chars, 0), OWNER_SPAN_SUM, '…spanning 24,080 units');
  eq(bindingNames(OWNERS), OWNED_BINDINGS, 'four of them are bindings; the rest are functions');
  eq(OWNERS.filter((d) => d.form === 'function').length, OWNER_COUNT - OWNED_BINDINGS.length,
    'eighteen function declarations');
  eq(OWNERS.filter((d) => d.isAsync).length, ASYNC_OWNERS, 'six owners are async');
  eq(OWNERS.filter((d) => d.isAsync).length > 0, true,
    '…so a module carrying async owners is nothing new here');
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
  eq(edges, EXTERNAL_EDGES, 'eight external executable edges, over TWO names');
  eq(total, EXTERNAL_EDGE_TOTAL, '…eight references in total');

  const spans = scanTopLevelDeclarations(CODE).map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of Object.keys(EXTERNAL_EDGES)) {
    for (const p of refSites(VIEWS.code, n)) if ((p < RAW_AT || p >= BODY_END) && outside(p)) evalTime++;
  }
  eq(evalTime, 0, 'every one of the eight sits inside a declaration — call time');

  const markup = {};
  for (const n of OWNED) {
    const hits = refSites(VIEWS.strings, n).filter((p) => p < RAW_AT || p >= BODY_END);
    if (hits.length) markup[n] = hits.length;
  }
  eq(markup, MARKUP_REFERENCES, 'exactly one owner is named inside a string the monolith builds');
  ok(refSites(VIEWS.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that count is a measurement');

  // Controls for the write detector: this region performs NO write of either
  // shape, so both zeros below would survive a detector that had lost a branch.
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  const ownedBindings = new Set(bindingNames(OWNERS));
  let inbound = 0;
  for (const n of ownedBindings) {
    for (const p of refSites(VIEWS.code, n)) {
      if ((p < RAW_AT || p >= BODY_END) && isWriteAt(VIEWS.code, p, n)) inbound++;
    }
  }
  eq(inbound, INBOUND_WRITES, 'nothing outside writes any of the four bindings it owns');

  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S, so it is not var-only');
  const bodyMasked = VIEWS.code.slice(RAW_AT, BODY_END);
  const outbound = {};
  let outboundTotal = 0;
  for (const n of monolithBindings) {
    if (ownedBindings.has(n)) continue;
    for (const p of refSites(bodyMasked, n)) {
      if (isWriteAt(bodyMasked, p, n)) { outbound[n] = (outbound[n] || 0) + 1; outboundTotal++; }
    }
  }
  eq(outbound, {}, 'and it writes NO binding it does not own');
  eq(outboundTotal, OUTBOUND_WRITES, '…zero in that direction too');
  // `{}` is what a broken scan returns as well, so pin what the scan saw.
  ok(monolithBindings.size > 200, '…measured against the whole binding set, not an empty one');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. THE SPLIT — and the generalisation that does NOT hold');
// ─────────────────────────────────────────────────────────────────────────────
{
  function edges(at, end) {
    const decls = scanTopLevelDeclarations(CODE.slice(at, end));
    const names = new Set(decls.map((d) => d.name));
    const seen = {};
    let total = 0;
    for (const n of names) {
      for (const p of refSites(VIEWS.code, n)) {
        if (p < at || p >= end) { seen[n] = (seen[n] || 0) + 1; total++; }
      }
    }
    return { owners: decls.length, names: Object.keys(seen).length, total };
  }
  const A = edges(SPLIT_A[0], SPLIT_A[1]);
  const B = edges(SPLIT_B[0], SPLIT_B[1]);
  eq(A.owners + B.owners, OWNER_COUNT, 'the two halves account for every owner');
  eq(SPLIT_A[1] - SPLIT_A[0], SPLIT_A_CHARS, 'the experiment half is 8,656 units');
  eq(SPLIT_B[1] - SPLIT_B[0], SPLIT_B_CHARS, '…and the CHART half 16,607');
  eq(SPLIT_A_CHARS + SPLIT_B_CHARS, RAW_CHARS, '…and together they are the whole raw block');
  eq(A.total + B.total, SPLIT_EDGE_TOTAL, 'split at the CHART header the pair costs THIRTY-TWO edges');
  eq(A.names + B.names, SPLIT_EDGE_NAMES, '…over eleven distinct names');
  eq(EXTERNAL_EDGE_TOTAL, 8, 'together it costs eight');
  ok(A.total + B.total > EXTERNAL_EDGE_TOTAL * 3, 'the split costs more than three times the joint cut');

  // AND THE POINT OF THIS SECTION: joining neighbours is NOT a rule. #427 found
  // a family where it paid; here is one where it does not, measured the same way.
  // Both endpoints of the counter-example must be real top-level marks, or a
  // one-unit shift of either would change nothing and pin nothing.
  const marks = topLevelBanners(CODE, functionBodyRanges(CODE));
  for (const at of [SNAPSHOT_HELPER[0], SNAPSHOT_HELPER[1], SNAPSHOT_JOINED[1]]) {
    ok(marks.indexOf(at) >= 0, 'the snapshot counter-example is bounded by real banners at ' + at);
  }
  const helper = edges(SNAPSHOT_HELPER[0], SNAPSHOT_HELPER[1]);
  const joined = edges(SNAPSHOT_JOINED[0], SNAPSHOT_JOINED[1]);
  eq(helper.total, SNAPSHOT_HELPER_EDGES, 'the Journal snapshot helper alone costs six edges');
  eq(joined.total, SNAPSHOT_JOINED_EDGES,
    '…and joined with its three neighbours it costs SIXTY-NINE, not fewer');
  ok(joined.total > helper.total * 10,
    'so "take adjacent regions together" is not a rule — it is a measurement, per family');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. The price: one top-level statement, and what it reads');
// ─────────────────────────────────────────────────────────────────────────────
{
  const stmts = statementLines(BODY, OWNERS);
  eq(stmts.length, 1, 'the region performs exactly ONE top-level statement');
  eq(stmts[0].trim(), TOP_LEVEL_STATEMENT, '…and this is it');
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 1,
    'control — the same counter finds many in the monolith as a whole');

  // What it reads at evaluation time: `window`, and a function this block
  // declares. NOT one name the monolith owns — which is the test that matters.
  const reads = evaluationTimeReads(BODY, OWNERS, maskLiterals);
  eq(reads, ['window'], 'at evaluation time it reads `window` and nothing else');
  const monolithNames = new Set(scanTopLevelDeclarations(CODE).map((d) => d.name));
  eq(reads.filter((n) => monolithNames.has(n) && !OWNED.has(n)), [],
    '…so NOT one monolith-declared name is read at load');
  ok(OWNED.has('setBackendCandleStoreChartTimeframe'),
    'the value it assigns is a function the block itself declares');
  const probe = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals),
    ['elsewhere', 'window'], 'control — a region that reads a foreign name at load reports it');

  // Consequence 1: it does NOT load in a completely empty VM.
  const bare = (() => {
    const sandbox = {};
    try { vm.createContext(sandbox); vm.runInContext(BODY, sandbox, { filename: MODULE_REL }); return null; }
    catch (e) { return String(e.message); }
  })();
  eq(bare, 'window is not defined', 'an empty VM rejects it, and says why');
  const hosted = {};
  hosted.window = {};
  vm.createContext(hosted);
  vm.runInContext(BODY, hosted, { filename: MODULE_REL });
  eq(Object.keys(hosted).length - 1, VM_GLOBALS, '…and `window` alone is enough to load it');
  eq(Object.keys(hosted.window), [WINDOW_TARGET], '…exposing exactly one name on window');
  eq(typeof hosted.window[WINDOW_TARGET], 'function', '…and it is the function, not a value');

  // Consequence 2: this would be the SECOND module assigning to window at load.
  // The DSB contract pins that exactly one does; Phase 2 must restate it.
  const WINDOW_ASSIGN = /window\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/;
  const already = LOCALS.filter((rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const decls = scanTopLevelDeclarations(src);
    return WINDOW_ASSIGN.test(statementLines(src, decls).join('\n'));
  });
  eq(already, [EXISTING_WINDOW_MODULE], 'today exactly ONE shipped module does it');
  ok(WINDOW_ASSIGN.test(stmts.join('\n')), '…and this block would be the second');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Dependencies, and the load order that makes them safe');
// ─────────────────────────────────────────────────────────────────────────────
{
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
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on five names from three sibling modules');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < MODULE_POSITION, '…which is before this module would');
  }
  eq(LOCAL_SCRIPT_COUNT + 1, MODULE_POSITION, 'the new module would load 64th');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The extraction Phase 2 must reproduce, and production untouched');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag is 62 units');
  ok(INDEX.indexOf(ANCHOR_TAG) > 0, 'the anchor tag — the newest layer — is present');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT present: this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');

  const at = INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const withTag = INDEX.slice(0, at) + TAG + INDEX.slice(at);
  const raw = CODE.slice(RAW_AT, RAW_END);
  eq(withTag.split(raw).length - 1, 1, 'the raw block occurs exactly once in the document');
  const extracted = withTag.replace(raw, '');
  eq(Array.from(extracted).length, EXTRACTED_CHARS, 'index.html would become 1,618,149 units');
  eq(sha256(extracted), EXTRACTED_SHA256, '…hashing to the digest Phase 2 must match');
  eq(BASE_CHARS - EXTRACTED_CHARS, RAW_CHARS - TAG_CHARS, 'the arithmetic closes: 25,263 out, 62 in');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src)).length,
    MODULE_POSITION, 'sixty-four local scripts afterwards');

  const restored = extracted.replace(TAG, '');
  const back = restored.slice(0, CODE_AT + RAW_AT) + raw + restored.slice(CODE_AT + RAW_AT);
  eq(sha256(back), BASE_SHA256, 'and the reverse transform reproduces the base byte for byte');

  // Production is byte-identical to the base.
  const isAncestor = (a, b) => {
    try { git(['merge-base', '--is-ancestor', a, b]); return true; } catch (e) { return false; }
  };
  ok(isAncestor(BASE_SHA, 'HEAD'), 'the pinned base is an ancestor of HEAD');
  // The control must not depend on whether this audit is committed yet: before
  // the commit HEAD IS the base, and a commit is its own ancestor. Compare the
  // base against its own parent instead, which is false in every state.
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
