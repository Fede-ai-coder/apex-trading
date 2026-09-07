'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO BACKEND CANDLES — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. `_portfolioFetchBackendCandlesForChart`,
// [1441121,1448939): 7,818 units in ONE owner — a single async function that
// fetches backend candle-store candles for the Portfolio inline charts.
//
//     2 external executable edges, over ONE name, both at call time
//     0 references from generated markup
//     0 inbound writes
//     0 outbound writes — ZERO coupling in both directions
//     0 top-level statement lines, and `evaluationTimeReads` is EMPTY
//     exactly ONE monolith dependency
//     it loads in a COMPLETELY empty VM
//
// AND THE FINDING THAT MATTERS MORE: THE SCREEN AND THE BOUNDARY DISAGREE
// HERE, AND THE SCREEN IS WRONG.
//
// The banner-to-banner region this cut sits inside, [1441121,1449999), scores
// TWO crossings fewer than anything else on the screen — one, the lowest of all
// 41 screened regions. It is also UNEXTRACTABLE. Its last 1,060 units are a
// dev-only console helper introduced by a TOP-LEVEL `if` that CALLS two
// monolith-declared functions, `ffBackendCandlesPortfolioCharts()` and
// `ffBackendCandleParityDebug()`. Module tags load BEFORE the inline monolith,
// so that `if` would throw at load. §3 shows the whole region failing in an
// empty VM with that exact message, and §7 shows the chosen cut loading in one.
//
// So the boundary is the judgement CLAUDE.md says it is, and here it is worth
// exactly one extra edge: narrowing to the declaration turns the debug block's
// internal call into an external one (1 edge → 2) and buys extractability.
// Narrowing ALSO drops the monolith dependencies from three to one, because
// the two feature-flag functions were referenced only by the block left behind.
//
// A SEAM THAT IS NOT A BANNER IS NOT NEW — measured, not assumed. §6 peels the
// chain and finds that of the TEN layers recording a single raw range, EIGHT
// have a banner seam and TWO do not: tt-reconnect and apex-post-auth-init. What
// differs here is the REASON. Those two are followed immediately by another
// feature's code; this one is followed by its OWN feature's debug block, which
// cannot move because it runs at load.
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
const BASE_SHA = '4f5c959aa0472e585a16d9fa20ef15084bb294f3';
const BASE_CHARS = 1602259;
const BASE_SHA256 = '6db6f8fd99da797003ca89e022ead159524bfbd4febbe0b54b0523f4fd001fa1';
const CODE_AT = 113705;
const CODE_CHARS = 1488528;
const LOCAL_SCRIPT_COUNT = 65;
// This audit is the 149th file. Phase 2 replaces it one for one.
const TEST_FILE_COUNT = 149;

// ── The region ───────────────────────────────────────────────────────────────
// Monolith coordinates. RAW_AT is the `// ── ` banner that opens the feature.
// RAW_END is NOT the next banner: it is one past the single declaration, chosen
// by judgement — see ENCLOSING_BANNER_END below.
const RAW_AT = 1441121;
const RAW_END = 1448940;
const RAW_CHARS = 7819;
const BODY_END = 1448939;
const MODULE_CHARS = 7818;
const MODULE_SHA256 = '8d16bf8512f35a144bb5867cc135fba011636a199edeadf0cb5451ec8db3c8d8';
const OWNER = '_portfolioFetchBackendCandlesForChart';
const OWNER_CHARS = 6905;
const OWNER_START = 912;
const OWNER_COUNT = 1;

// ── The part deliberately LEFT INLINE, and why ───────────────────────────────
const ENCLOSING_BANNER_END = 1450000;
const TRAILING_BLOCK_CHARS = 1060;
const TRAILING_BLOCK_CALLS = ['ffBackendCandlesPortfolioCharts', 'ffBackendCandleParityDebug'];
const WHOLE_REGION_LOAD_ERROR = 'ffBackendCandlesPortfolioCharts is not defined';
const WHOLE_REGION_EDGES = 1;

// ── What the screen saw ──────────────────────────────────────────────────────
const TOP_LEVEL_BANNERS = 189;
const SCREEN_FLOOR = 8000;
const SCREENED_REGIONS = 41;

// ── Coupling, both directions ────────────────────────────────────────────────
const EXTERNAL_EDGES = { _portfolioFetchBackendCandlesForChart: 2 };
const EXTERNAL_EDGE_TOTAL = 2;
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
const OUTBOUND_WRITES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── What it was chosen over, and the family split ────────────────────────────
const RUNNER_UP = [1267671, 1278339];
const RUNNER_UP_CHARS = 10668;
const RUNNER_UP_OWNERS = 2;
const RUNNER_UP_EDGES = 2;
const RUNNER_UP_OUTBOUND = 3;
const HELPER = [1254714, 1265508];
const HELPER_EDGES = 6;
const HELPER_OUTBOUND = 0;
// The neighbour on the other side of the enclosing banner.
const NEXT_REGION = [1450000, 1486393];
const NEXT_REGION_OWNERS = 11;
const NEXT_REGION_CROSSINGS = 53;
const JOINED_CROSSINGS = 54;

// ── Seams over the chain, measured by peeling ────────────────────────────────
const SEAM_LAYERS_MEASURED = 10;
const SEAM_IS_BANNER = 8;
const SEAM_NOT_BANNER = ['tt-reconnect', 'apex-post-auth-init'];

// ── Dependencies ─────────────────────────────────────────────────────────────
const MONOLITH_DEPENDENCIES = ['_recordCandleSubscriptionRequest'];
const SIBLING_DEPENDENCIES = {
  'js/api/backend-client.js': ['_backendAuthHeaders'],
  'js/config/backend-config.js': ['BACKEND'],
  'js/services/candle-normalization.js': ['_apexParityNormCandleArray', '_apexParityExtractBackendCandles'],
  'js/services/candle-auth-gate.js': ['_backendCandleGateOpen', '_backendCandleGateReason',
    '_noteBackendCandleFailure', '_noteBackendCandleSuccess', '_backendGateProvenanceSource'],
  'js/services/candle-provenance.js': ['_extractBackend4hDiag', '_recordCandleProvenance'],
};
const SIBLING_POSITIONS = {
  'js/api/backend-client.js': 4,
  'js/config/backend-config.js': 5,
  'js/services/candle-normalization.js': 18,
  'js/services/candle-auth-gate.js': 19,
  'js/services/candle-provenance.js': 20,
};
const MODULE_POSITION = 66;
const VM_GLOBALS = 1;

// ── The modelled extraction ──────────────────────────────────────────────────
const MODULE_REL = 'js/portfolio/portfolio-backend-candles.js';
const TAG = '<script src="./js/portfolio/portfolio-backend-candles.js"></script>\n';
const TAG_CHARS = 68;
const ANCHOR_TAG = '<script src="./js/services/journal-rich-snapshot.js"></script>\n';
const EXTRACTED_CHARS = 1594508;
const EXTRACTED_SHA256 = '37703d19026490a5d830caa20f6afa9e08f859b5db749acc378c51bfa4865d00';

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
function loadsBare(src, filename) {
  const sandbox = {};
  try { vm.createContext(sandbox); vm.runInContext(src, sandbox, { filename }); return null; }
  catch (e) { return String(e.message); }
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('PORTFOLIO BACKEND CANDLES — TEMPORARY BOUNDARY AUDIT');

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
eq(Array.from(INDEX).length, BASE_CHARS, 'index.html is 1,602,259 units');
eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned digest');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at the pinned offset');
eq(Array.from(CODE).length, CODE_CHARS, '…and is 1,488,528 units');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-five local scripts precede it');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 149 files — this audit is the one that was added');
// Added files must be counted the same way before and after committing: a
// `git diff` alone reports nothing while the file is still untracked, so this
// would pass only in one of the two states — the #427 failure exactly.
{
  const committedAdds = git(['diff', '--name-only', '--diff-filter=A', BASE_SHA]).split('\n').filter(Boolean);
  const untracked = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter((l) => /^(\?\?|A )/.test(l)).map((l) => l.slice(3));
  eq(Array.from(new Set(committedAdds.concat(untracked))).sort(),
    ['tests/temporary-portfolio-backend-candles-boundary-audit.test.js'],
    '…and it is the ONLY file this PR adds, whether or not it is committed yet');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The screen');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, FN_BODIES);
  eq(marks.length, TOP_LEVEL_BANNERS, '189 banners sit at top level');
  const all = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m; while ((m = re.exec(CODE))) all.push(m.index);
  }
  ok(all.length > marks.length,
    'control — the unfiltered count is strictly larger, so the top-level filter does work');
  ok(marks.indexOf(RAW_AT) >= 0, 'the chosen region opens on one of them');
  eq(marks.indexOf(RAW_END), -1, '…but its seam is NOT one, which §3 explains');
  ok(marks.indexOf(ENCLOSING_BANNER_END) >= 0, 'the enclosing banner region ends on one');

  let screened = 0;
  for (let i = 0; i < marks.length; i++) {
    const end = (i + 1 < marks.length ? marks[i + 1] : CODE.length);
    if (end - marks[i] >= SCREEN_FLOOR && scanTopLevelDeclarations(CODE.slice(marks[i], end)).length) screened++;
  }
  eq(screened, SCREENED_REGIONS, '41 banner-to-banner regions clear the floor and own declarations');
  ok(MODULE_CHARS < SCREEN_FLOOR,
    'the CHOSEN cut is below the screening floor — the screen picks regions, judgement picks the cut');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary is a JUDGEMENT — and the banner region cannot move');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE.slice(RAW_AT, RAW_AT + 100).indexOf('FF_BACKEND_CANDLES_PORTFOLIO_CHARTS') > 0,
    'the region opens on the feature’s own banner');

  // The whole banner-to-banner region: it scores BEST on the screen and is
  // UNEXTRACTABLE. Both halves of that are asserted, because either alone
  // would be a misleading fact.
  const whole = CODE.slice(RAW_AT, ENCLOSING_BANNER_END - 1);
  const wholeDecls = scanTopLevelDeclarations(whole);
  eq(wholeDecls.length, OWNER_COUNT, 'the whole region declares the same single owner');
  ok(statementLines(whole, wholeDecls).length > 0, '…but it also carries top-level statements');
  eq(loadsBare(whole, 'whole-region.js'), WHOLE_REGION_LOAD_ERROR,
    'and an empty VM REJECTS it, naming the monolith function its top-level `if` calls');
  for (const name of TRAILING_BLOCK_CALLS) {
    const decl = scanTopLevelDeclarations(CODE).filter((d) => d.name === name);
    eq(decl.length, 1, name + ' is declared in the monolith, which loads AFTER any module');
    ok(refSites(maskLiterals(whole), name).some((p) => !insideFunction(RAW_AT + p)),
      '…and the region calls it OUTSIDE any function body, i.e. at load');
  }
  // The list must be COMPLETE, not merely non-empty. Iterating it proves each
  // entry belongs; only measuring the trailing block proves none is missing —
  // and dropping an entry survived until this assertion existed.
  {
    const trailing = CODE.slice(RAW_END, ENCLOSING_BANNER_END - 1);
    const trailingMasked = maskLiterals(trailing);
    const atLoad = new Set();
    for (const d of scanTopLevelDeclarations(CODE)) {
      for (const p of refSites(trailingMasked, d.name)) {
        if (!insideFunction(RAW_END + p)) atLoad.add(d.name);
      }
    }
    eq(Array.from(atLoad).sort(), TRAILING_BLOCK_CALLS.slice().sort(),
      'those two are ALL the monolith names the trailing block reaches at load');
    ok(refSites(trailingMasked, OWNER).length > 0,
      'control — the block does reference the owner too…');
    eq(refSites(trailingMasked, OWNER).every((p) => insideFunction(RAW_END + p)), true,
      '…but only inside a function body, which is why it is not in that list');
  }
  eq(ENCLOSING_BANNER_END - RAW_END, TRAILING_BLOCK_CHARS,
    'the block that must stay behind is 1,060 units');

  // The chosen cut: the same banner, stopping after the single declaration.
  // NOT "regions end at their last declaration" — that rule is pinned as DEAD
  // in §6 of the seam contract. The reason here is specific: what follows runs
  // at load and depends on the monolith.
  const chosenLimit = RAW_AT + OWNERS[0].start + OWNERS[0].chars + 2;
  eq(snapBodyEnd(CODE, RAW_AT, chosenLimit), BODY_END,
    'snapBodyEnd snaps the body end once the last construct is chosen');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 7,819 units');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 7,818');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', 'the raw block is the body plus one LF');
  eq(BODY.slice(-2), '}\n', 'the body ends on a closing brace and a newline');

  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the comment is refused');

  // What narrowing COSTS and what it BUYS, both measured.
  const wholeEdges = refSites(VIEWS.code, OWNER)
    .filter((p) => p < RAW_AT || p >= ENCLOSING_BANNER_END - 1).length;
  eq(wholeEdges, WHOLE_REGION_EDGES, 'the whole region would cost ONE external edge');
  eq(EXTERNAL_EDGE_TOTAL - wholeEdges, 1, '…so narrowing costs exactly one more');
  eq(loadsBare(BODY, MODULE_REL), null, '…and buys a body that loads in an empty VM');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. ONE owner');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares exactly one name at top level');
  eq(OWNERS[0].name, OWNER, '…and it is _portfolioFetchBackendCandlesForChart');
  eq(OWNERS[0].chars, OWNER_CHARS, '…spanning 6,905 of the 7,818 units');
  eq(OWNERS[0].start, OWNER_START, '…after 912 units of banner and comment');
  eq(OWNERS[0].isAsync, true, '…and it is async');
  eq(OWNERS[0].form, 'function', '…a function declaration, not a binding');
  eq(bindingNames(OWNERS), [], 'it owns no binding at all');
  eq(OWNER_START + OWNER_CHARS + 1, MODULE_CHARS,
    'banner + declaration + the single trailing newline is the whole body');
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
  eq(edges, EXTERNAL_EDGES, 'two external executable edges, over ONE name');
  eq(total, EXTERNAL_EDGE_TOTAL, '…two references in total');

  // Call time is decided by FUNCTION BODY containment, not by declaration spans:
  // one of the two sits inside a function EXPRESSION assigned by a top-level
  // `if`, which a declaration-span test would wrongly call evaluation time.
  const sites = refSites(VIEWS.code, OWNER).filter((p) => p < RAW_AT || p >= BODY_END);
  eq(sites.filter((p) => insideFunction(p)).length, EXTERNAL_EDGE_TOTAL,
    'both sit inside a function body — call time');
  ok(sites.some((p) => p > BODY_END && p < ENCLOSING_BANNER_END),
    '…and one of them is the debug block this cut leaves behind');
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
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  // Inbound is vacuous — the region owns no binding. That is exactly why the
  // outbound direction is measured too, and here it is genuinely zero.
  eq(bindingNames(OWNERS).length, 0, 'the region owns no binding, so inbound is vacuous');
  let inbound = 0;
  for (const n of bindingNames(OWNERS)) {
    for (const p of refSites(VIEWS.code, n)) {
      if ((p < RAW_AT || p >= BODY_END) && isWriteAt(VIEWS.code, p, n)) inbound++;
    }
  }
  eq(inbound, INBOUND_WRITES, '…and the count over an empty set is zero');

  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S, so it is not var-only');
  ok(monolithBindings.size > 200, '…and is the whole set, not an empty one');
  const bodyMasked = VIEWS.code.slice(RAW_AT, BODY_END);
  const outbound = {};
  for (const n of monolithBindings) {
    if (OWNED.has(n)) continue;
    for (const p of refSites(bodyMasked, n)) {
      if (isWriteAt(bodyMasked, p, n)) outbound[n] = (outbound[n] || 0) + 1;
    }
  }
  eq(outbound, {}, 'it writes NO binding it does not own — zero in BOTH directions');
  eq(Object.keys(outbound).length, OUTBOUND_WRITES, '…which is the figure Phase 2 must reproduce');

  eq(statementLines(BODY, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'the body is one declaration and nothing else — zero top-level statement lines');
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 0,
    'control — the same counter finds statements in the monolith as a whole');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. What it was chosen over, the family split, and the seam shape');
// ─────────────────────────────────────────────────────────────────────────────
{
  function measure(at, end) {
    const ds = scanTopLevelDeclarations(CODE.slice(at, end));
    const names = new Set(ds.map((d) => d.name));
    let edges = 0;
    for (const n of names) {
      for (const p of refSites(VIEWS.code, n)) if (p < at || p >= end) edges++;
    }
    const bm = VIEWS.code.slice(at, end);
    let out = 0;
    for (const n of new Set(bindingNames(scanTopLevelDeclarations(CODE)))) {
      if (names.has(n)) continue;
      for (const p of refSites(bm, n)) if (isWriteAt(bm, p, n)) out++;
    }
    return { owners: ds.length, edges, out, crossings: edges + out };
  }

  eq(measure(RAW_AT, BODY_END).crossings, EXTERNAL_EDGE_TOTAL + OUTBOUND_WRITES,
    'the recommended cut costs TWO crossings');

  // THE RUNNER-UP, and the one behind it. Both are cleaner than most of the
  // screen and both lose on crossings.
  const runner = measure(RUNNER_UP[0], RUNNER_UP[1]);
  eq(RUNNER_UP[1] - RUNNER_UP[0], RUNNER_UP_CHARS, 'the targeted DXLink fetch is 10,668 units');
  eq(runner.owners, RUNNER_UP_OWNERS, '…with two owners');
  eq(runner.edges, RUNNER_UP_EDGES, '…two external edges');
  eq(runner.out, RUNNER_UP_OUTBOUND, '…and three outbound writes');
  eq(runner.crossings, 5, 'so the runner-up costs five crossings against this candidate’s two');
  // Both comparison ranges must be anchored to REAL top-level marks, or a
  // one-unit shift of either end changes nothing and the constant pins nothing.
  // That survivor has now appeared in #429, #430, #431 and here; it is anchored
  // rather than merely re-measured.
  const anchors = topLevelBanners(CODE, FN_BODIES);
  for (const [lo, hi, what] of [[RUNNER_UP[0], RUNNER_UP[1], 'the runner-up'],
                                [HELPER[0], HELPER[1], 'the snapshot helper']]) {
    ok(anchors.indexOf(lo) >= 0, what + ' opens on a real top-level banner at ' + lo);
    ok(anchors.indexOf(hi + 1) >= 0, '…and its seam is the banner one unit past ' + hi);
    eq(snapBodyEnd(CODE, lo, hi + 1), hi, '…so snapBodyEnd reproduces that end exactly');
  }
  const helper = measure(HELPER[0], HELPER[1]);
  eq(HELPER[1] - HELPER[0], 10794, 'the Journal snapshot helper is 10,794 units');
  eq(helper.edges, HELPER_EDGES, '…costing six edges');
  eq(helper.out, HELPER_OUTBOUND, '…and zero outbound');
  eq(helper.crossings, 6, '…six crossings, the same figure #431 recorded for it');

  // THE SPLIT RULE, per family: joining here is catastrophically worse.
  const marks = topLevelBanners(CODE, FN_BODIES);
  for (const at of [NEXT_REGION[0], NEXT_REGION[1]]) {
    ok(marks.indexOf(at) >= 0, 'the neighbour is bounded by a real top-level banner at ' + at);
  }
  const next = measure(NEXT_REGION[0], NEXT_REGION[1]);
  eq(next.owners, NEXT_REGION_OWNERS, 'the next region owns eleven names');
  eq(next.crossings, NEXT_REGION_CROSSINGS, '…and costs fifty-three crossings alone');
  const joined = measure(RAW_AT, NEXT_REGION[1]);
  eq(joined.crossings, JOINED_CROSSINGS, 'joined with it the cut would cost fifty-four');
  ok(joined.crossings > measure(RAW_AT, BODY_END).crossings * 25,
    'so joining is more than twenty-five times worse — measured, not assumed');

  // THE SEAM SHAPE, measured over the chain by peeling rather than recalled.
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const CHAIN = [
    ['journal-rich-snapshot', 'journal-rich-snapshot-undo.js', 'js/services/journal-rich-snapshot.js', 'undoJournalRichSnapshot', true],
    ['backend-candle-store-chart', 'backend-candle-store-chart-undo.js', 'js/ui/backend-candle-store-chart.js', 'undoBackendCandleStoreChart', true],
    ['portfolio-traffic-light', 'portfolio-traffic-light-undo.js', 'js/portfolio/portfolio-traffic-light.js', 'undoPortfolioTrafficLight', true],
    ['portfolio-expiry-manual', 'portfolio-expiry-manual-undo.js', 'js/portfolio/portfolio-expiry-manual.js', 'undoPortfolioExpiryManual', true],
    ['backend-portfolios', 'backend-portfolios-undo.js', 'js/portfolio/backend-portfolios.js', 'undoBackendPortfolios', true],
    ['portfolio-data-fetch', 'portfolio-data-fetch-undo.js', 'js/portfolio/portfolio-data-fetch.js', 'undoPortfolioDataFetch', true],
    ['journal-trade-detail', 'journal-trade-detail-undo.js', 'js/ui/journal-trade-detail.js', 'undoJournalTradeDetail', true],
    ['journal-trade-forms', 'journal-trade-forms-undo.js', 'js/ui/journal-trade-forms.js', 'undoJournalTradeForms', false],
    ['journal-close-legs', 'journal-close-legs-undo.js', 'js/ui/journal-close-legs.js', 'undoJournalCloseLegs', true],
    ['tt-reconnect', 'tt-reconnect-undo.js', 'js/ui/tt-reconnect.js', 'undoTtReconnect', true],
    ['apex-post-auth-init', 'apex-post-auth-init-undo.js', 'js/services/apex-post-auth-init.js', 'undoApexPostAuthInit', true],
  ];
  let doc = INDEX;
  let measured = 0, bannerSeam = 0;
  const notBanner = [];
  for (const [name, undoFile, modRel, fn, records] of CHAIN) {
    const U = require('./lib/' + undoFile);
    doc = U[fn](doc, read(modRel));
    if (!records) continue;
    const code = APP_LOADER.parseScriptTags(doc).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
    const codeAt = doc.indexOf(code);
    const m = topLevelBanners(code, functionBodyRanges(code));
    measured++;
    ok(m.indexOf(U.RAW_AT - codeAt) >= 0, name + ' opens on a top-level banner');
    if (m.indexOf(U.RAW_END - codeAt) >= 0) bannerSeam++; else notBanner.push(name);
  }
  eq(measured, SEAM_LAYERS_MEASURED, 'ten layers record a single raw range and were measured');
  eq(bannerSeam, SEAM_IS_BANNER, 'EIGHT of them have a seam that IS a top-level banner');
  eq(notBanner, SEAM_NOT_BANNER, '…and the two that do not are tt-reconnect and apex-post-auth-init');
  ok(notBanner.length > 0,
    'so a non-banner seam is NOT new here — what is new is the reason, which §3 states');
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
    'it depends on exactly ONE monolith name');
  // Narrowing the cut is what made that one: the two feature-flag functions are
  // referenced only by the block left inline.
  for (const name of TRAILING_BLOCK_CALLS) {
    eq(referenced.has(name), false, name + ' is NOT referenced by the chosen body');
    ok(monolith.has(name), '…though the monolith does declare it');
  }
  let evalTime = 0;
  const spans = OWNERS.map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  for (const n of MONOLITH_DEPENDENCIES) for (const p of refSites(masked, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'and it is not read at evaluation time');

  const fromModules = {};
  for (const rel of LOCALS) {
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on eleven names from five sibling modules');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < MODULE_POSITION, '…which is before this module would');
  }
  eq(LOCAL_SCRIPT_COUNT + 1, MODULE_POSITION, 'the new module would load 66th');

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(BODY, sandbox, { filename: MODULE_REL });
  eq(Object.keys(sandbox).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(sandbox), [OWNER], '…defining exactly its one owner');
  eq(sandbox[OWNER].constructor.name, 'AsyncFunction', '…an async function');
  eq(sandbox[OWNER].length, 1, '…of arity one');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The extraction Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag is 68 units');
  // The tag and the module path are two separate literals and can disagree:
  // changing MODULE_REL alone survived until this tied them together.
  eq(TAG, '<script src="./' + MODULE_REL + '"></script>\n', 'the tag names exactly this module path');
  ok(/^js\/portfolio\//.test(MODULE_REL), '…which sits with the other portfolio modules');
  ok(INDEX.indexOf(ANCHOR_TAG) > 0, 'the anchor tag — the newest layer — is present');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT present: this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');

  const at = INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const withTag = INDEX.slice(0, at) + TAG + INDEX.slice(at);
  const raw = CODE.slice(RAW_AT, RAW_END);
  eq(withTag.split(raw).length - 1, 1, 'the raw block occurs exactly once in the document');
  const extracted = withTag.replace(raw, '');
  eq(Array.from(extracted).length, EXTRACTED_CHARS, 'index.html would become 1,594,508 units');
  eq(sha256(extracted), EXTRACTED_SHA256, '…hashing to the digest Phase 2 must match');
  eq(BASE_CHARS - EXTRACTED_CHARS, RAW_CHARS - TAG_CHARS, 'the arithmetic closes: 7,819 out, 68 in');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src)).length,
    MODULE_POSITION, 'sixty-six local scripts afterwards');

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
