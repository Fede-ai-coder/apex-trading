'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO UNREALIZED P&L EXTRACTION — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [727014,728964) in monolith coordinates — 1,950 units raw and
// 1,949 of body, TWO owners, both synchronous — into js/portfolio/portfolio-unrealized-pnl.js.
// `computePositionUnrealizedPnL(position)` totals the unrealized P&L of a position across its ACTIVE
// legs, each leg valued at the live mark at its own index, and answers null as soon as one active leg
// cannot be valued, so the row shows "--" rather than a partial number. `computePortfolioUnrealizedPnL(positions)`
// sums the per-row figure over a list of positions, skipping the rows that have none. The block opens on
// the SEVEN comment lines that document the first (579 units), carries the THREE that document the second
// between the two, and ends on the closing brace of the second; the blank line AFTER it, in front of the
// comment block of `computeEarningsDte`, is the separator.
//
// ── THE FINDING, PART ONE: THE OTHER ROW OF THE LAST TIE LEADS ALONE, AND ONLY THE ──
// ── PASS OVER SUB-FLOOR RUNS CAN SEE IT ──────────────────────────────────────────
//
// The contract before this layer published a tie at (byConsumerSplit, raw nine) = (4, 4) and shipped the
// shorter row. The other one was this block, and it stays in the document untouched by that cut: the last
// cut sat entirely above it, so its coordinates shifted toward the start of the document by exactly the length of what shipped. Measured on
// the base that cut left, 12 rows hold 4 on byConsumerSplit, 9 in the screen and 3 in the pass over
// sub-floor runs, and ONE of them holds the lowest raw nine, 4: this block's. There is no tie for the key to
// break this time; the next row at the same byConsumerSplit is a step behind on the raw nine. And the
// shipped screen never lists it: measured from its first declaration it is 1,370 units, under RUN_FLOOR
// by 130, and it clears the floor only once its documentation is counted, 1,949 against 1,500. §4 pins
// the row in full and §2 the units.
//
// ── PART TWO: THE FLOOR REMOVES TWO RUNS THAT SCORE NO WORSE ────────────────────
//
// The two owners make three runs between them. The cut is the only one that reaches the floor: the first
// owner alone is 1,342 units, counted from its documentation, and scores EXACTLY what the cut scores,
// (4, 4); the second alone is 606 and scores (2, 2), better on both measures, because it is reached from one
// consumer and reads one binding — the first owner, which would then have to stay behind. The floor is a
// gate on SIZE and not on coupling, and the audit says so rather than leaving it to be found: §5 measures all
// three runs, and the second alone would be a layer of less than half of the smallest the programme has
// shipped.
//
// ── PART THREE: ONE CALL APIECE FROM TWO CONSUMERS, TWO DEPENDENCIES, NOTHING FROM A MODULE ──
//
// The raw nine is 4: two inbound references, two dependencies and nothing from a shipped module. The
// references are CALLS, one to each owner: `positionManager`, a `var` holding an immediately invoked
// function, calls the first from a helper of its pattern, two function bodies deep, and
// `renderPositionsPanel`, a declared function, calls the second. The first is declared ABOVE the block and
// the second BELOW it. The two dependencies are declared functions that STAY in the monolith,
// `_legUnrealizedPnL` and `isActivePortfolioLeg`, each called once by the first owner, in a loop over the
// legs; the second owner calls neither, and calls the FIRST once per row that carries no figure of its own,
// from a callback. The block writes no monolith name, deletes nothing and reaches for nothing but the
// language's own `isFinite`.
//
// ── PART FOUR: IT LOADS BARE, AND EVERY BRANCH OF BOTH IS MEASURED ───────────────
//
// Neither call site is outside a function body, and the block reads nothing as it is evaluated, so it loads
// in a bare VM declaring exactly its two functions. §7 drives them there and beside recording stand-ins for
// the two dependencies: called with nothing both answer null without touching a dependency, a position with
// a leg throws ReferenceError for the leg filter the moment it reaches the leg, and an inactive leg is
// filtered out before the per-leg figure is ever read. §7 pins where the marks come from, a placeholder, a
// missing price and a missing entry giving a null mark while a price of ZERO is a mark, the loop stopping at
// the first leg it cannot value, the fallback of the second owner and its handling of non-finite rows, and
// one quirk it leaves alone: a P&L carried as a numeric STRING is finite, so it concatenates onto the zero
// the total starts from and the sum becomes the string "05".
//
// ── PART FIVE: TEN OPENINGS WERE LEGAL, AND THE DOCUMENTATION GOES WITH THE BLOCK ──
//
// The seam rule admits ten line starts between the owner above and the first declaration, nine of which
// parse as a program: the brace, the blank line, the seven lines of documentation and the declaration.
// Cutting at the declaration would leave seven comment lines directly above the comment block of
// `computeEarningsDte`, which they do not describe, and cutting at the blank line would fuse the brace
// above onto that comment block. The cut opens on the first documentation line, and the join it leaves is a
// shape the monolith already holds 189 times and holds 187 times afterwards, two fewer: §2 counts it.
//
// ── PART SIX: THE CUT SITS INSIDE ITS REGION, AND TAKES NO BANNER ───────────────
//
// The block is owners 2 and 3 of the nineteen of a `// ───` section, so the cut takes no banner: the
// document's top-level banner marks stay at 214 and its owner regions at 113. §5 prices every owner on each
// side in turn. The one above, `_legUnrealizedPnL`, is the first of the region and so extends up to the
// region's own banner, and scores (5, 6) over three consumers, worse on both measures. All sixteen below
// land on a real seam and every one scores worse, ten of them also running something at load. The whole region
// scores (67, 145) over seven consumers and is not a candidate at all. The cut that shipped changed the screen
// by -15 raw runs, -6 seam rejections, -9 candidates and -9 clean candidates, and §6 derives the first from the
// owners the region lost.
//
// ── PRICED, AND WHERE IT WOULD SIT ──────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-eight layers the chain holds: it would rank eighteenth, with
// seventeen layers smaller and fifty-one larger, measured against every layer. Its body is NOT pure ASCII
// (a sigma, an em dash and two arrows in its comments, and a second sigma), so the pure-ASCII count would not
// move; it opens on a comment block and not on a banner, so neither banner count would; and it pins a non-empty
// monolith dependency list, so the count of layers that pin one WOULD move, by one. §8 measures all four.
//
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
  maskLiterals, stripComments, scanTopLevelDeclarations, functionBodyRanges,
} = require('./lib/eic-contract-guards.js');
const {
  isBlankOrComment, snapBodyEnd, assertSeam,
  topLevelBanners, evaluationTimeReads, literalView, isPropertyWriteAt,
} = require('./lib/extraction-boundary.js');

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-unrealized-pnl.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'ce1d3b5';
const BASE_CHARS = 1406907;
const BASE_UTF8 = 1435218;
const BASE_LF = 24268;
const BASE_SHA256 = '75b43a83d0b007b551c3ea852e10cea6b759d50c781b23bfd5fde40da3c0c15c';
const LOCAL_SCRIPTS = 112;
const TEST_FILE_COUNT = 197;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-unrealized-pnl-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-unrealized-pnl-audit.spec.js';
const RATCHETED_CONTRACTS = 59;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/swing-chart-cache-evaluate-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 245;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/swing-chart-cache-evaluate-contract.spec.js';
const RETIRED_MUTANTS = 239;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116824;
const CODE_CHARS = 1290057;
const TOP_LEVEL_DECLS = 877;
const OWNER_REGIONS = 113;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the first line of the documentation of `computePositionUnrealizedPnL`, seven comment lines, then the declaration,
// and runs through the closing brace of `computePortfolioUnrealizedPnL`, which carries its own three comment lines in front of it
// and sits one blank line below the first. The blank line above the block stays behind; the blank line AFTER it, in front of the
// comment block of `computeEarningsDte`, is the structural separator.
const RAW_AT_IN_CODE = 727014;
const DECL_AT_IN_CODE = 727593;
const RAW_END_IN_CODE = 728964;
const BODY_END_IN_CODE = 728963;
const RAW_CHARS = 1950;
const BODY_CHARS = 1949;
const BODY_UTF8 = 1957;
const BODY_LF = 40;
const BODY_SHA256 = '9f6db5d92f235a357c83545d1e025a0335a523e915d602b7c3ed53ce3251acb2';
const BODY_ENDING = '}\n';
const NON_ASCII_CHARS = 5;
const NON_ASCII_EXTRA_BYTES = 8;
const DOC_FIRST_LINE = '// Position-level unrealized P&L = Σ leg-level P&L across ACTIVE legs, each leg using';
const DECL_FIRST_LINE = 'function computePositionUnrealizedPnL(position) {';
const SECOND_DOC_FIRST_LINE = '// Portfolio-level total = Σ per-row P&L. Rows with a missing mark (null) are skipped';
const SECOND_DECL_FIRST_LINE = 'function computePortfolioUnrealizedPnL(positions) {';
const NEXT_DECL = 'computeEarningsDte';
const NEXT_DOC_PREFIX = '// Earnings DTE = calendar days from today to the earnings date. UNLIKE computeDTE';

// ── Its owners ──────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['computePositionUnrealizedPnL', 'computePortfolioUnrealizedPnL'];
const OWNER_SIZES = [762, 350];
const OWNER = 'computePositionUnrealizedPnL';
const SECOND_OWNER = 'computePortfolioUnrealizedPnL';
const OWNER_BEFORE = '_legUnrealizedPnL';

// ── Its shape ───────────────────────────────────────────────────────────────
const SPLIT_LINES = 40;
const CODE_LINES = 29;
const COMMENT_LINES = 10;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;
// Where the ten comment lines are: seven document the first owner, three the second, and none sit inside a body.
const FIRST_DOC_LINES = 7;
const SECOND_DOC_LINES = 3;
const BODY_COMMENT_LINES = 0;

// ── The boundary judgement: the openings the seam admits ─────────────────────
const BRACE_OPENING = 727011;
const BLANK_OPENING = 727013;
const DOC_TAKEN = 579;
const DOC_TAKEN_LINES = 7;
const SEAM_LEGAL_OPENINGS = 10;
const PARSING_OPENINGS = 9;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 727012;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 1370;
const CANDIDATES_AT_DECLARATION = 0;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 1;
// What the cut leaves behind: the closing brace of the owner above, one blank line, and the comment block of the NEXT owner,
// a join the monolith already holds, once, at the end of the block; and what it removes: the join of that brace against
// this block's own documentation. Taking the blank line as well would fuse the brace straight onto that comment block.
const JOIN_AFTER_CUT = '}\n\n' + NEXT_DOC_PREFIX;
const JOIN_AS_BEFORE = '}\n\n// Position-level unrealized P&L';
const FUSED_IF_BLANK_TAKEN = '}\n' + NEXT_DOC_PREFIX;
const JOINS_LIKE_THE_CUT_BEFORE = 189;

// ── The banner region it sits inside ─────────────────────────────────────────
// A `// ───` section of NINETEEN owners, the unrealized P&L, the portfolio totals and the risk metrics: the cut is its owners 2 and 3.
const REGION_AT = 725744;
const REGION_END = 779349;
const REGION_CHARS = 53605;
const REGION_OWNERS = 19;
const OWNER_POSITION = 2;
const REGION_LINE_PREFIX = '// ─';
const BANNER_MARKS = 214;
const BANNER_MARKS_AFTER = 214;
const OWNER_REGIONS_AFTER = 113;

// ── Taking more or less, priced: the owners above in the region, the owners below ──
const EXTENSIONS_UP = [
  ['_legUnrealizedPnL', 725744, 3219, 6, 5, 3, 2, true],
];
const UP_LEGAL = 1;
const UP_TIES = 0;
const UP_WORSE = 1;
const UP_TIES_BCS = 0;
const UP_NOT_CLEAN = 0;
const UP_SCREEN_ROWS = [725744];
const EXTENSIONS_DOWN = [
  ['computeEarningsDte', 729575, 2561, 9, 6, 4, 2, true],
  ['_technicalTfSqueezeState', 730075, 3061, 14, 11, 4, 2, true],
  ['aggregateGreeks', 738351, 11337, 26, 19, 7, 6, true],
  ['_lastPortfolioMetricsSig', 738626, 11612, 29, 21, 8, 6, true],
  ['_apexPortfolioGreeksRefreshDiag', 738856, 11842, 118, 58, 11, 6, true],
  ['_portfolioTotalsSnapshot', 739344, 12330, 125, 60, 10, 9, true],
  ['_resolveSpyPrice', 741956, 14942, 122, 61, 10, 13, false],
  ['_scanDataField', 742465, 15451, 126, 63, 12, 13, false],
  ['computeRowBetaWeightedDelta', 747533, 20519, 129, 64, 11, 15, false],
  ['computePortfolioRiskMetrics', 753146, 26132, 126, 63, 10, 16, false],
  ['_deltaThetaRatioMissingReason', 753853, 26839, 127, 62, 10, 15, false],
  ['resolvePortfolioLivePrice', 764449, 37435, 134, 63, 9, 17, false],
  ['_apexLatestBetaBySymbol', 764979, 37965, 138, 64, 10, 16, false],
  ['_portfolioLatestBackendBetaEntry', 765370, 38356, 138, 64, 9, 16, false],
  ['_apexPortfolioBetaDiag', 765747, 38733, 151, 64, 9, 15, false],
  ['refreshPortfolioBetas', 778171, 51157, 148, 68, 8, 21, false],
];
const DOWN_LEGAL = 16;
const DOWN_REFUSED = 0;
const DOWN_WORSE = 16;
const DOWN_TIES_BCS = 0;
const DOWN_NOT_CLEAN = 10;
// THE RUNS the two owners make: [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['computePositionUnrealizedPnL', 'computePositionUnrealizedPnL', 727014, 728356, 1342, 4, 4, ['_legUnrealizedPnL', 'isActivePortfolioLeg'], 2],
  ['computePositionUnrealizedPnL', 'computePortfolioUnrealizedPnL', 727014, 728963, 1949, 4, 4, ['_legUnrealizedPnL', 'isActivePortfolioLeg'], 2],
  ['computePortfolioUnrealizedPnL', 'computePortfolioUnrealizedPnL', 728357, 728963, 606, 2, 2, ['computePositionUnrealizedPnL'], 1],
];
const OWN_RUNS_LEGAL = 3;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 2;
// THE WHOLE REGION, taken as one cut.
const WHOLE_REGION_NINE = 145;
const WHOLE_REGION_BCS = 67;
const WHOLE_REGION_CONSUMERS = 7;
const WHOLE_REGION_DEPS = 20;
const WHOLE_REGION_SIB = 6;
const WHOLE_REGION_CLEAN = false;

// ── Coupling ───────────────────────────────────────────────────────────────
const FULL_NINE = 4;
const BY_CONSUMER = 4;
const BY_CONSUMER_SPLIT = 4;
const CONSUMERS = ['positionManager', 'renderPositionsPanel'];
const CONSUMER_SITES = 2;
const CONSUMER_SITES_AT = [697988, 810890];
// What each of the two sites is: [site, the text written there].
const SITE_TEXTS = [
  [697988, 'computePositionUnrealizedPnL({ legs: legs, legsLive: (live.legsLive || []), status: t.stat'],
  [810890, 'computePortfolioUnrealizedPnL(positions)'],
];
// The declared consumers that hold the calls: [name, start, end, chars].
const CONSUMER_DECLS = [
  ['positionManager', 696755, 702438, 5684],
  ['renderPositionsPanel', 800683, 834202, 33520],
];
const CONSUMER_FORMS = ['var', 'function'];
const OTHER_DEPENDENCY_MENTIONS = [3, 14];
const MONOLITH_DEPENDENCIES = ['_legUnrealizedPnL', 'isActivePortfolioLeg'];
// [name, start, end, chars, form] of each monolith dependency.
const DEPENDENCY_DECLS = [
  ['_legUnrealizedPnL', 726537, 727011, 475, 'function'],
  ['isActivePortfolioLeg', 723952, 724289, 338, 'function'],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 2;
const OUTBOUND_MODULE_REFERENCES = 0;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['computePositionUnrealizedPnL', 'computePortfolioUnrealizedPnL'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7019;
const SEAM_REJECTED = 2071;
const CANDIDATES = 2703;
const CLEAN_CANDIDATES = 1617;
const SCORE_BELOW_BEST = 0;
// Screen runs that open at the declaration, the shortest being the screen's row of the cut.
const RUNS_OPENING_HERE = 16;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor.
const HIDDEN_ROWS = 31;
const HIDDEN_CLEAN_ROWS = 30;
const HIDDEN_SCORE_BELOW_BEST = 0;
// THE ROWS AT THE BEST SCORE, 4, over the screen and the pass together.
const ROWS_AT_BEST = 12;
const ROWS_AT_BEST_SCREEN = 9;
const ROWS_AT_BEST_HIDDEN = 3;
const LOWEST_NINE_AT_BEST = 4;
const ROWS_OVERLAPPING_THE_CUT = 17;
// THE ROW AT (byConsumerSplit, raw nine) = (4, 4), pinned in full, in the SCREEN's coordinates:
// [opening, closing, units, consumers, monolith dependencies]. ONE row holds it, and it is the cut.
const TIED_AT_BEST = [
  [727014, 728963, 1949, 2, 2],
];
// The best four OTHER openings over the screen and the hidden pass together, skipping every row that overlaps the cut,
// as [opening, byConsumerSplit, raw nine, units], by the published key.
const RUNNERS_UP = [
  [722362, 4, 5, 1589],
  [156267, 4, 6, 1967],
  [719176, 4, 6, 2014],
  [896257, 4, 6, 2369],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
const DELTA_RAW_RUNS = -15;
const DELTA_SEAM_REJECTED = -6;
const DELTA_CANDIDATES = -9;
const DELTA_CLEAN = -9;
const PREVIOUS_RAW_CHARS = 1892;
const PREVIOUS_RAW_AT = 563771;
// The previous contract's published list, in the coordinates of the document BEFORE the cut that
// shipped, which sat ABOVE every row of it.
const PREVIOUS_RUNNERS_UP = [
  [728906, 4, 4, 1949],
  [724254, 4, 5, 1589],
  [156267, 4, 6, 1967],
  [721068, 4, 6, 2014],
];

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 68;
const SMALLEST_LAYER_CHARS = 1540;
const SIZE_RANK_IF_CUT = 18;
const LAYERS_SMALLER_THAN_THIS_CUT = 17;
const LAYERS_LARGER_THAN_THIS_CUT = 51;
const PURE_ASCII_LAYERS = 10;
const LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_WIDE_BANNER = 30;
const LAYERS_WITH_A_DEPENDENCY = 31;

// ── If cut ────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/portfolio/portfolio-unrealized-pnl.js"></script>\n';
const NET_REDUCTION = 1883;
const INDEX_AFTER = 1405024;
const RESIDUAL_MONOLITH = 1288107;
const LOCAL_SCRIPTS_AFTER = 113;
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name.replace(/\$/g, '\\$') + ')\\b', 'g');
  const out = []; let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function propertyWriteBases(masked) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(masked))) out.push(m[1]);
  return out;
}
function locallyBound(src) {
  const out = new Set(); let m;
  const decl = /\b(?:var|let|const|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = decl.exec(src))) out.add(m[1]);
  const params = /\bfunction\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
  while ((m = params.exec(src))) for (const p of m[1].split(',')) {
    const n = p.trim().replace(/=.*$/, '').trim();
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) out.add(n);
  }
  return out;
}
function codeLines(src) { return src.split('\n').filter((l) => !isBlankOrComment(l)).length; }
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });


console.log('PORTFOLIO UNREALIZED P&L EXTRACTION — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. Phase 2 puts a peel here and this
// becomes the reconstruction the permanent contract runs against.
const INDEX = APP_LOADER.loadIndexHtml();

const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const MASKED = maskLiterals(CODE);
const STRINGS = literalView(CODE, maskLiterals, stripComments);
const DECLS = scanTopLevelDeclarations(CODE);
const BY_NAME = new Map(DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const MARKS = topLevelBanners(CODE, FN_BODIES);

const SIBLINGS = LOCALS.map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return {
    rel, src, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
    bound: locallyBound(src), owners: scanTopLevelDeclarations(src).map((d) => d.name),
  };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');
const OTHER_INLINE = TAGS.filter((t) => !t.src && t.inline !== CODE).map((t) => t.inline).join('\n');
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

function occurrenceIndex(text) {
  const idx = new Map();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const at = m.index + m[1].length;
    const bucket = idx.get(m[2]);
    if (bucket) bucket.push(at); else idx.set(m[2], [at]);
  }
  return idx;
}
const OCC_CODE = occurrenceIndex(MASKED);
const OCC_STRINGS = occurrenceIndex(STRINGS);
const OCC_MARKUP = occurrenceIndex(STATIC_MARKUP);
const SIB_REFS = new Map();
{
  const per = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked), rel: s.rel }));
  for (const d of DECLS) {
    let n = 0; const who = [];
    for (const m of per) {
      if (m.bound.has(d.name)) continue;
      const k = (m.idx.get(d.name) || []).length;
      n += k; if (k) who.push(m.rel);
    }
    SIB_REFS.set(d.name, { n, who });
  }
}
const at0 = (idx, n) => idx.get(n) || [];
function lowerBound(sorted, x) {
  let a = 0, b = sorted.length;
  while (a < b) { const m = (a + b) >> 1; if (sorted[m] < x) a = m + 1; else b = m; }
  return a;
}
const countIn = (sites, lo, hi) => lowerBound(sites, hi) - lowerBound(sites, lo);

function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0, sib = 0, mkp = 0;
  const sites = []; const sibWho = new Set();
  for (const n of names) {
    for (const at of at0(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += at0(OCC_STRINGS, n).filter(outside).length;
    const sr = SIB_REFS.get(n); sib += sr.n; for (const w of sr.who) sibWho.add(w);
    mkp += at0(OCC_MARKUP, n).length;
  }
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  const local = locallyBound(CODE.slice(range[0], range[1]));
  const bodyIdx = occurrenceIndex(bodyMasked);
  const deps = new Set();
  for (const [n] of bodyIdx) if (!nameSet.has(n) && !local.has(n) && BY_NAME.has(n)) deps.add(n);
  let outModule = 0;
  for (const [n, pos] of bodyIdx) {
    if (nameSet.has(n) || local.has(n)) continue;
    if (MODULE_OWNERS.has(n)) outModule += pos.length;
  }
  let outGen = 0;
  for (const d of DECLS) {
    if (nameSet.has(d.name)) continue;
    outGen += countIn(at0(OCC_STRINGS, d.name), range[0], range[1]);
  }
  const seven = inbound + inWrites + inPropWrites + outWrites.length + deps.size + sib + mkp + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp, outWrites,
    sibWho: Array.from(sibWho).sort(),
    deps: Array.from(deps).sort(), sites: sites.sort((a, b) => a - b),
    outGen, outModule, seven, nine: seven + outGen + outModule,
  };
}
function mergedRegions(marks) {
  const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : CODE.length }));
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    let r = raw[i];
    while (i + 1 < raw.length &&
      !CODE.slice(r.start, raw[i + 1].start).split('\n').some((l) => !isBlankOrComment(l))) {
      r = { start: r.start, end: raw[i + 1].end }; i++;
    }
    out.push(r);
  }
  return out.filter((x) => DECLS.some((d) => d.start >= x.start && d.end < x.end));
}
const PROFILE_CACHE = new Map();
const profileOf = (range) => {
  const key = range[0] + ':' + range[1];
  let hit = PROFILE_CACHE.get(key);
  if (!hit) { hit = profile(range); PROFILE_CACHE.set(key, hit); }
  return hit;
};
function loadTimeProfile(lo, hi) {
  const body = CODE.slice(lo, hi);
  const decls = scanTopLevelDeclarations(body);
  const blanked = Array.from(body);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) blanked[i] = ' ';
  return {
    stmtLines: codeLines(blanked.join('')),
    reads: evaluationTimeReads(body, decls, maskLiterals),
  };
}
const runsNothingAtLoad = (p) => p.stmtLines === 0 && p.reads.length === 0;
const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
function consumersOf(p) {
  return Array.from(new Set(p.sites.map((i) => (hostOf(i) || { name: '(TOP LEVEL)' }).name))).sort();
}
const byConsumer = (p) => consumersOf(p).length + p.inWrites + p.inPropWrites +
  p.outWrites.length + p.deps.length + p.sib + p.mkp + p.gen + p.outGen + p.outModule;
const SORTED_MARKS = MARKS.slice().sort((a, b) => a - b);
const lineAt = (at) => CODE.slice(at, CODE.indexOf('\n', at));
const firstLineOf = (text) => text.slice(0, text.indexOf('\n'));
const nextMarkAfter = (m) => {
  const n = SORTED_MARKS.filter((x) => x > m)[0];
  return n === undefined ? CODE.length : n;
};
const namesIt = (text, name) =>
  new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(text);
function blockAbove(d) {
  let at = CODE.lastIndexOf('\n', d.start - 1) + 1;
  let first = null;
  while (at > 0) {
    const ls = CODE.lastIndexOf('\n', at - 2) + 1;
    if (/^\s*\/\//.test(CODE.slice(ls, at - 1))) { first = ls; at = ls; } else break;
  }
  return first === null ? null : { start: first, text: CODE.slice(first, d.start) };
}

const REGIONS = mergedRegions(MARKS);

// ── The screen, run ONCE and reused by §2, §4, §5 and §6 ─────────────────────────────
const candidateRuns = [];
let rawRunCount = 0, seamRejectedCount = 0;
{
  const seen = new Set();
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        rawRunCount++;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo || be - lo < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo, be); } catch (e) { seamRejectedCount++; continue; }
        const key = lo + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        candidateRuns.push({ lo, hi: be, units: be - lo });
      }
    }
  }
  for (const c of candidateRuns) { c.p = profileOf([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
}






async function main() {


// CHAIN, read off the newest contract rather than written here: that file
// carries the list ending at its own layer, and copying it would be a second
// place to drift. Phase 2 gives this cycle its own literal.
const CHAIN = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8')
  .match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
  .map((l) => l.replace(/^'|',?$/g, ''));
const CHAIN_SET = new Set(CHAIN);
const OWNER_KIND = new Map();
for (const s of SIBLINGS) {
  for (const n of s.owners) if (!OWNER_KIND.has(n)) OWNER_KIND.set(n, CHAIN_SET.has(s.rel) ? 'chain' : 'foundation');
}
for (const s of SIBLINGS) {
  for (const n of s.owners) if (!OWNER_KIND.has(n)) OWNER_KIND.set(n, CHAIN_SET.has(s.rel) ? 'chain' : 'foundation');
}
function outboundSplit(lo, hi) {
  const body = MASKED.slice(lo, hi);
  const local = locallyBound(CODE.slice(lo, hi));
  const names = new Set(DECLS.filter((d) => d.start >= lo && d.end < hi).map((d) => d.name));
  let chain = 0, foundation = 0;
  const chainNames = new Set(), foundationNames = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(body))) {
    const n = m[2];
    if (names.has(n) || local.has(n)) continue;
    const kind = OWNER_KIND.get(n);
    if (kind === 'chain') { chain++; chainNames.add(n); }
    else if (kind === 'foundation') { foundation++; foundationNames.add(n); }
  }
  return { chain, foundation, chainNames: [...chainNames].sort(), foundationNames: [...foundationNames].sort() };
}
const byConsumerSplit = (p, split) => byConsumer(p) - p.outModule + split.chain;
for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }

const cleanRuns = candidateRuns.filter((c) => runsNothingAtLoad(c.load));

// ── THE PASS THE FLOOR HIDES ────────────────────────────────────────────────
// The screen above floors a run at RUN_FLOOR units measured from the
// DECLARATION. This pass takes every run the screen skipped for being short,
// re-measures it from the start of its documentation, and keeps those that then
// clear the floor and are at a real seam.
const hiddenRows = [];
{
  const seen = new Set();
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo) continue;
        const ba = i === 0 ? null : blockAbove(own[i]);
        const lo2 = (i === 0 || !ba) ? lo : ba.start;
        if (be - lo >= RUN_FLOOR || be - lo2 < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo2, be); } catch (e) { continue; }
        const key = lo2 + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        const p = profileOf([lo2, be]);
        const split = outboundSplit(lo2, be);
        hiddenRows.push({
          lo: lo2, hi: be, unitsDecl: be - lo, unitsDoc: be - lo2, p, split,
          load: loadTimeProfile(lo2, be), nine: p.nine, bcs: byConsumerSplit(p, split),
        });
      }
    }
  }
}

// A direct scan for assignment to anything the text does not own, kept apart
// from profile() so the outbound direction is measured twice by two different
// means. A metric whose true value is zero needs a control on an input where
// the answer differs, so this function is also run on a planted violation.
function nonLocalAssignmentsUncorrected(text) {
  const masked = maskLiterals(text);
  const local = locallyBound(text);
  const owned = new Set(scanTopLevelDeclarations(text).map((d) => d.name));
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]{1,60}\])*\s*(?:=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) if (!local.has(m[2]) && !owned.has(m[2])) out.push(m[2]);
  return out;
}
// The corrected scan: every declarator of a `var`/`let`/`const` list is local,
// not only the first. The shipped scan above is kept so the audit can measure
// what it got wrong.
function declaredNamesIn(text) {
  const masked = maskLiterals(text);
  const out = new Set();
  const re = /\b(?:var|let|const)\s+/g;
  let m;
  while ((m = re.exec(masked))) {
    let depth = 0, seg = '';
    const segs = [];
    for (let i = re.lastIndex; i < masked.length; i++) {
      const ch = masked[i];
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) { if (depth === 0) break; depth--; }
      if (depth === 0 && ch === ';') break;
      if (depth === 0 && ch === ',') { segs.push(seg); seg = ''; continue; }
      seg += ch;
    }
    segs.push(seg);
    for (const sg of segs) { const n = sg.trim().match(/^([A-Za-z_$][\w$]*)/); if (n) out.add(n[1]); }
  }
  return out;
}
function nonLocalAssignmentsIn(text) {
  const masked = maskLiterals(text);
  const local = new Set([...locallyBound(text), ...declaredNamesIn(text)]);
  const owned = new Set(scanTopLevelDeclarations(text).map((d) => d.name));
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]{1,60}\])*\s*(?:=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) if (!local.has(m[2]) && !owned.has(m[2])) out.push(m[2]);
  return out;
}
const hostGlobalMentions = (text) => (maskLiterals(text).match(/\b(window|globalThis|self|document)\b/g) || []).length;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, BASE_CHARS, 'index.html is BASE_CHARS units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…BASE_UTF8 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…BASE_LF line feeds');
eq(sha256(INDEX), BASE_SHA256, '…and this digest');
eq(sha256(git(['show', BASE_SHA + ':index.html'])), BASE_SHA256,
  '…which is the digest of the BASE_SHA commit\'s index.html, read out of git, so the base '
  + 'is a commit and not a remembered number');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and is CODE_CHARS units of residual code');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it holds TOP_LEVEL_DECLS top-level declarations');
eq(REGIONS.length, OWNER_REGIONS, '…across OWNER_REGIONS owner regions');
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the swing chart
// cache evaluate predicted the document, the residual monolith and the script
// count this audit measures, so the two cycles are joined by numbers.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  eq(CODE.length, Number(prev.match(/^const RESIDUAL_MONOLITH = (\d+);$/m)[1]),
    '…which is exactly the RESIDUAL_MONOLITH the previous contract forecast');
  eq(INDEX.length, Number(prev.match(/^const INDEX_AFTER = (\d+);$/m)[1]),
    '…and the document is exactly the INDEX_AFTER it forecast');
  eq(LOCALS.length, Number(prev.match(/^const LOCAL_SCRIPTS_AFTER = (\d+);$/m)[1]),
    '…with exactly the LOCAL_SCRIPTS_AFTER it forecast');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The region, its seam, and the ten openings the seam admits');
// ─────────────────────────────────────────────────────────────────────────────
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
const REC = profileOf([RAW_AT_IN_CODE, BODY_END_IN_CODE]);
eq(RAW_END_IN_CODE - RAW_AT_IN_CODE, RAW_CHARS, 'the raw fragment is RAW_CHARS units');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE, BODY_CHARS, '…BODY_CHARS of which are body');
eq(RAW_CHARS - BODY_CHARS, 1, '…the difference being the one structural separator');
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single LF, the blank line between the block and the comment block of ' + NEXT_DECL);
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest');
ok(BODY.endsWith(BODY_ENDING), '…ending on a real line of code');
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the first line of its documentation');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII characters: the body is NOT pure ASCII, so its UTF-8 and UTF-16 lengths are two numbers to pin…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, NON_ASCII_EXTRA_BYTES,
  '…NON_ASCII_EXTRA_BYTES bytes apart, not two for each of them: the sigmas take two bytes in UTF-8 and the arrows and the dash three…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).join(''), 'Σ—→→Σ', '…a sigma, an em dash, two arrows and a sigma, in that order…');
eq((stripComments(BODY).match(/[^\x00-\x7F]/g) || []).length, 0,
  '…and every one of them inside a COMMENT, the full lines of documentation and one trailing note, none in code: the encoding of the file matters for prose only');
eq(INDEX.indexOf(BODY), CODE_AT + RAW_AT_IN_CODE,
  '…and it occurs in the document at the offset the monolith coordinate implies');
eq(count(INDEX, BODY), 1, '…exactly once, so the fragment is not ambiguous');

// THE SEAM IS MECHANICAL, and it is checked before anything else is claimed.
eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
  'assertSeam accepts the chosen boundary and returns RAW_END_IN_CODE');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the end of the span up to the next declaration back to the last line of code lands on BODY_END_IN_CODE');
  eq(next.name, NEXT_DECL, '…and the declaration after the cut is NEXT_DECL…');
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…its own comment block beginning exactly where the cut ends, so the cut ends where that documentation begins and takes none of it…');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DOC_PREFIX.length), NEXT_DOC_PREFIX,
    '…its first characters being NEXT_DOC_PREFIX');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits seven openings.
const OPENINGS = [];
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  eq(prevOwner.name, OWNER_BEFORE, 'the owner before the cut is OWNER_BEFORE…');
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    '…and SEAM_LEGAL_OPENINGS line starts between it and the declaration are accepted');
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the closing brace of the owner above');
  eq(OPENINGS[1], BLANK_OPENING, '…the next the blank line that separates that brace from the documentation…');
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…the next the first line of the documentation, the first line of the cut…');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES lines of documentation are each an opening of their own…');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last being the declaration');
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the ten…');
  ok(OPENINGS.filter((at) => at !== BLANK_OPENING).every((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() !== ''),
    '…every other opening being a line with something on it');
  eq(CODE[BRACE_OPENING], '}', 'the opening before it is the brace itself…');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    '…and the position between the brace and the blank line starts mid-line and is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what loading it does.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the ten are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the whole documentation block above the FIRST function, seven comment lines directly above its declaration, with the
// blank line above THEM left behind; the second function brings its own three, which sit between the two inside the cut.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken above the first owner is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  eq((doc.match(/^\/\/ ─{2,}[ \t]+\S/gm) || []).length + (doc.match(/^\/\/ ═{2,}/gm) || []).length, 0,
    '…none of them a banner of either kind, so the cut takes NO section heading with it');
  eq(MARKS.filter((m) => m >= RAW_AT_IN_CODE && m < RAW_END_IN_CODE).length, 0,
    '…and no banner mark lies anywhere inside the cut: it sits in the MIDDLE of a banner region');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  const first = BY_NAME.get(OWNER), second = BY_NAME.get(SECOND_OWNER);
  eq(blockAbove(first).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  const commentsIn = (text) => text.split('\n').filter((l) => l.trim().startsWith('//')).length;
  eq(commentsIn(CODE.slice(first.start, first.end + 1)) + commentsIn(CODE.slice(second.start, second.end + 1)), BODY_COMMENT_LINES,
    'neither function holds a FULL comment line inside its body, BODY_COMMENT_LINES of them: what notes they carry trail a line of code…');
  // THE SECOND OWNER'S OWN DOCUMENTATION.
  const between = CODE.slice(first.end + 1, second.start);
  eq(blockAbove(second).text, between.slice(between.indexOf('//')), 'the second owner has a comment block of its own, found by the same rule…');
  eq(blockAbove(second).text.split('\n').filter(Boolean).length, SECOND_DOC_LINES, '…SECOND_DOC_LINES lines of it…');
  eq(firstLineOf(CODE.slice(blockAbove(second).start)), SECOND_DOC_FIRST_LINE, '…opening on SECOND_DOC_FIRST_LINE…');
  eq(firstLineOf(CODE.slice(second.start)), SECOND_DECL_FIRST_LINE, '…directly above SECOND_DECL_FIRST_LINE…');
  eq(CODE.slice(first.end + 1, blockAbove(second).start), '\n\n', '…with exactly one blank line between the first function\'s brace and that comment block, inside the cut');
  eq(DOC_TAKEN_LINES + SECOND_DOC_LINES, COMMENT_LINES, '…so the block\'s COMMENT_LINES are the seven above the first owner and the three above the second');
  eq(FIRST_DOC_LINES, DOC_TAKEN_LINES, '…FIRST_DOC_LINES being the same seven');
  ok(doc.indexOf('Σ leg-level P&L across ACTIVE legs') >= 0 && blockAbove(second).text.indexOf('Σ per-row P&L') >= 0,
    '…and the two blocks document what the functions compute, which §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the documentation is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE COMMENT BLOCK WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would have left the seven comment lines directly above the comment block of ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto the comment block of ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith holds nowhere today, once there');
}
// WHAT THE CUT LEAVES. The brace of the owner above, one blank line, then the comment block of the next owner: the very join the
// monolith holds today at the END of the block, so the cut moves it and the document gains no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith holds the join `}` blank line `' + NEXT_DOC_PREFIX + '` once today, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the function…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of this block\'s own documentation is held once today, and is gone after the cut…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the documentation leaving with the block');
  eq(count(CODE, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE, 'and a brace, a blank line and a comment is a shape the document holds JOINS_LIKE_THE_CUT_BEFORE times…');
  eq(count(atCut, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE - 2, '…TWO fewer after the cut: it removes the join in front of the first documentation and the join between the two owners, and keeps the one in front of the next');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0 && atCut.indexOf(SECOND_DECL_FIRST_LINE) < 0 && atCut.indexOf(SECOND_DOC_FIRST_LINE) < 0,
    '…and no line of either comment block or declaration is left behind');
}
// THE SCREEN CANNOT SEE THIS RUN FROM ITS DECLARATION: measured there it is under the floor, and it clears RUN_FLOOR only once its documentation is counted.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION < RUN_FLOOR, '…UNDER RUN_FLOOR, by ' + (RUN_FLOOR - DECL_UNITS_FROM_DECLARATION) + ' units, so the shipped screen skips it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…enumerating CANDIDATES_AT_DECLARATION runs that open at the declaration and end where the cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, CANDIDATES_AT_CUT,
  '…and CANDIDATES_AT_CUT that open where the cut does: this block is reached only by the pass over sub-floor runs…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, HIDDEN_ROWS_AT_CUT,
  '…which holds HIDDEN_ROWS_AT_CUT row for it, re-measured from the start of its documentation');
{
  const row = hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE)[0];
  eq([row.unitsDecl, row.unitsDoc], [DECL_UNITS_FROM_DECLARATION, BODY_CHARS],
    '…at DECL_UNITS_FROM_DECLARATION from the declaration and BODY_CHARS from the documentation, ' + (BODY_CHARS - RUN_FLOOR) + ' units over the floor');
}
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE - DECL_UNITS_FROM_DECLARATION, DOC_TAKEN,
  '…the documentation above the first owner being exactly the DOC_TAKEN units that lift it over the floor');
// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: two functions, one call apiece from two consumers, two dependencies, nothing from a shipped module, all read at call time');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these two names');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…both declared functions, so this layer would ship no mutable binding');
  ok(own.every((d) => !d.isAsync), '…SYNCHRONOUS: each returns its number, it does not promise one');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, OWNER_COUNT + 1,
    '…holding ONE function expression besides the two declarations, the callback the second hands to `forEach`, which is a closure over its own local `total` and nothing of the monolith\'s…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the two owners, the callback not being top level');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one, among them the reference from a shipped module: no module names either function');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from the monolith outside the block…');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: TWO monolith bindings, both declared functions');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted: the block calls nothing a module declares');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: two inbound references, one to each owner, and two dependencies');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER: two consumers and two dependencies…');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'TWO consumers reach in from the monolith: CONSUMERS, one the `positionManager` module-pattern binding and one a declared function');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const outside = (at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE;
  eq(OWNERS_EXPECTED.map((name) => refSites(MASKED, name).filter(outside)), CONSUMER_SITES_AT.map((at) => [at]),
    'all of those references are one to each of the two owners, in the order they are declared…');
  eq(OWNERS_EXPECTED.map((name) => refSites(STRINGS, name).filter(outside).length), [0, 0],
    '…and neither name appears in any string or generated markup outside the block');
  eq(OWNERS_EXPECTED.map((name) => count(STATIC_MARKUP, name)), [0, 0], '…nor in the static markup, so no inline handler names either');
  eq(OWNERS_EXPECTED.map((name) => SIB_REFS.get(name)), [{ n: 0, who: [] }, { n: 0, who: [] }], '…and no shipped module names either, so the chain of layers already extracted does not reach the block');
  eq(OWNERS_EXPECTED.map((name) => refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), name).length), [2, 1],
    '…inside the block the first owner is named TWICE, by its own declaration and by the callback of the second, which calls it once per row, and the second ONCE, by its declaration: the pair is closed over itself and the first never calls the second…');
  // WHAT EACH OF THE TWO SITES IS, as written.
  eq(SITE_TEXTS.map(([at]) => at), CONSUMER_SITES_AT, 'SITE_TEXTS pins the same two sites…');
  eq(SITE_TEXTS.map(([at, text]) => CODE.slice(at, at + text.length)), SITE_TEXTS.map(([, text]) => text),
    '…each exactly the text written there');
  const FIRST_SITE_LEAD = '(t.unrealizedPnL !== undefined ? t.unrealizedPnL\n                       : ';
  eq(CODE.slice(CONSUMER_SITES_AT[0] - FIRST_SITE_LEAD.length, CONSUMER_SITES_AT[0]), FIRST_SITE_LEAD,
    '…the first a CALL in the else-branch of a conditional that prefers a P&L the trade already carries…');
  eq(CODE.slice(CONSUMER_SITES_AT[1] - 15, CONSUMER_SITES_AT[1]), 'var pnlTotal = ',
    '…and the second a CALL whose result is kept as `pnlTotal` and shown, the one number the positions panel adds up.');
}
// WHERE EACH SITE IS: both are calls inside a function body; none is evaluated as the monolith loads.
{
  const innermost = (at) => FN_BODIES.filter((r) => at >= r.start && at <= r.end).sort((a, b) => b.start - a.start)[0];
  eq(CONSUMER_DECLS.map(([name]) => name), CONSUMERS, 'the declared consumers are CONSUMER_DECLS, both of CONSUMERS…');
  eq(CONSUMER_DECLS.map(([name]) => BY_NAME.get(name).form), CONSUMER_FORMS, '…`positionManager` a `var` that holds an immediately invoked function and `renderPositionsPanel` a declared function…');
  for (const [name, start, end, chars] of CONSUMER_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars], [start, end, chars],
      name + ' opens at ' + start + ', ' + chars + ' units long');
  }
  eq(CONSUMER_DECLS.map(([name]) => BY_NAME.get(name).isAsync), [false, false], '…neither of them async…');
  ok(BY_NAME.get(CONSUMERS[0]).end < RAW_AT_IN_CODE && BY_NAME.get(CONSUMERS[1]).start > RAW_END_IN_CODE,
    '…the first declared ABOVE the block and the second BELOW it, so the cut has a consumer on each side and the join closes over neither');
  eq(CONSUMER_SITES_AT.map((at) => (hostOf(at) || {}).name), CONSUMERS, '…one call in each');
  ok(CONSUMER_SITES_AT.every((at) => insideFunction(at)), '…every call inside a function body, so not one is a statement the monolith evaluates as it loads…');
  ok(CONSUMER_SITES_AT.every((at) => { const body = innermost(at); const host = BY_NAME.get(hostOf(at).name); return body && body.start >= host.start && body.end <= host.end; }),
    '…each within the body of its host');
  eq(FN_BODIES.filter((r) => CONSUMER_SITES_AT[0] >= r.start && CONSUMER_SITES_AT[0] <= r.end).length, 2,
    '…the first one function DEEPER than the immediately invoked one, inside a helper of the pattern, so the call is not made by the pattern\'s own evaluation…');
  eq(CONSUMER_SITES_AT.filter((at) => !insideFunction(at)).length, 0, '…and none outside one: this block has no load-time reference, so the tag position is not shown to be load-bearing');
}
// THE DEPENDENCIES, with their declarations, where the block reads them, and CONTROLS.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  if (process.env.DUMP) console.log('DEPS', JSON.stringify(MONOLITH_DEPENDENCIES.map((n) => { const d = BY_NAME.get(n); return d && [n, d.start, d.end, d.chars, d.form]; })));
  for (const [name, start, end, chars, form] of DEPENDENCY_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form, d.isAsync], [start, end, chars, form, false],
      name + ' is a top-level ' + form + ' opening at ' + start + ', ' + chars + ' units long, which stays in the monolith');
    ok(d.end < RAW_AT_IN_CODE, '…declared ABOVE the block, ' + (RAW_AT_IN_CODE - d.end) + ' units above it');
  }
  eq(DEPENDENCY_DECLS.map(([name]) => BY_NAME.get(name).form), ['function', 'function'],
    'both of them declared synchronous functions, in the order MONOLITH_DEPENDENCIES lists them…');
  eq(DEPENDENCY_DECLS.map(([name]) => refSites(bodyMasked, name).length), [1, 1],
    'the block names each of the two at ONE place…');
  ok(DEPENDENCY_DECLS.every(([name]) => refSites(bodyMasked, name).every((p) => FN_BODIES.some((r) => p + RAW_AT_IN_CODE >= r.start && p + RAW_AT_IN_CODE <= r.end))),
    '…inside a function body, so the dependencies are called when the functions run and not as the block is evaluated…');
  ok(!/\b(_legUnrealizedPnL|isActivePortfolioLeg)\s*=(?!=)/.test(bodyMasked), '…and never as the target of an assignment');
  eq(bodyMasked.slice(refSites(bodyMasked, 'isActivePortfolioLeg')[0] - 'if (!'.length, refSites(bodyMasked, 'isActivePortfolioLeg')[0] + 'isActivePortfolioLeg(leg, position)'.length),
    'if (!isActivePortfolioLeg(leg, position)', '…`isActivePortfolioLeg` CALLED once per leg with the leg and its position, to skip the legs that are not active…');
  eq(bodyMasked.slice(refSites(bodyMasked, '_legUnrealizedPnL')[0] - 'var lp = '.length, refSites(bodyMasked, '_legUnrealizedPnL')[0] + '_legUnrealizedPnL(leg, mark)'.length),
    'var lp = _legUnrealizedPnL(leg, mark)', '…and `_legUnrealizedPnL` CALLED once per active leg with the leg and its current mark, in the FIRST owner only: the second owner reads neither dependency directly…');
  eq(DEPENDENCY_DECLS.map(([name]) => [OWNER, SECOND_OWNER].map((o) => refSites(MASKED.slice(BY_NAME.get(o).start, BY_NAME.get(o).end + 1), name).length)), [[1, 0], [1, 0]],
    '…both dependencies being the first owner\'s alone, once each');
  eq(DEPENDENCY_DECLS.map(([name]) => refSites(MASKED, name).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length), OTHER_DEPENDENCY_MENTIONS,
    'control — the two are named OTHER_DEPENDENCY_MENTIONS times elsewhere in the monolith, their own declarations and their other callers, so the counts of 1 above are the block\'s own and not every mention in the file');
}
// NOTHING FROM A SHIPPED MODULE: the language's own `isFinite` only.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\b(Math|Object|Number|Date|Array|String|Boolean|JSON|isFinite|fetch|AbortSignal|parseFloat)\b/g) || []).sort(), ['isFinite', 'isFinite'],
    'the block reaches for the language\'s own `isFinite` twice, both in the second owner, which any context supplies and which is not the monolith\'s…');
  eq(MODULE_OWNERS.get('isFinite'), undefined, '…not declared by a shipped module…');
  eq(OUTBOUND_MODULE_REFERENCES, 0, '…and OUTBOUND_MODULE_REFERENCES module references are made, which is why the reconstruction of this layer needs no foundation module to run');
}
// WHAT RUNS AT LOAD. Nothing: the block holds two function declarations and no statement.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: two function declarations only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(await|yield|this)\b/g) || []).length, 0, '…no await, no yield and no `this`…');
  eq((bodyMasked.match(/\bnew\s+\w+/g) || []), [], '…no `new` at all…');
  eq((bodyMasked.match(/\b(globalThis|self|window|document|localStorage|console|setTimeout|setInterval|fetch)\b/g) || []).length, 0,
    '…and no window, document, storage, console, timer or fetch');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all, comments included');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND…');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND references to a foundation module, so there is nothing for byConsumerSplit to leave out…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…and byConsumerSplit is BY_CONSUMER_SPLIT, equal to byConsumer: two consumers and two dependencies');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means.
{
  eq(nonLocalAssignmentsUncorrected(BODY), ['sawActive', 'sawActive'],
    'the inherited scan reports ONE name twice as assigned that the block does not own, `sawActive`: the second declarator of `var total = null, sawActive = false`, read as a global for its own initialiser and for the later write, the very shape the controls below plant…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan, which counts every declarator of a list as local, finds NON_LOCAL_ASSIGNMENTS: the block assigns only its own locals, so the two answers differ in exactly the way the controls say');
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { _legUnrealizedPnL = 1; }'), ['_legUnrealizedPnL'],
    'control — a write to a dependency the block calls is found: the zero above is not blind to the names that matter here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}
// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the other row of the previous tie leads ALONE at (4, 4), and only the pass over sub-floor runs can see it');
// ─────────────────────────────────────────────────────────────────────
// WHAT THE PREVIOUS CONTRACT PUBLISHED, read out of it.
const prevText = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
const listOf = (name) => prevText.match(new RegExp('^const ' + name + ' = \\[([\\s\\S]*?)^\\];', 'm'))[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
  .map((l) => JSON.parse(l.replace(/,$/, '').replace(/'/g, '"')));
const prevNum = (name) => Number(prevText.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
{
  eq(prevNum('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(prevNum('RAW_AT_IN_CODE'), PREVIOUS_RAW_AT, '…opening at PREVIOUS_RAW_AT…');
  ok(PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS <= RAW_AT_IN_CODE,
    '…and it sat entirely ABOVE this block, so every coordinate this audit measures below it shifted toward the start of the document by exactly its length, and the rule below applies that');
  const moved = (at) => (at >= PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS ? at - PREVIOUS_RAW_CHARS : at);
  // WHAT THE PREVIOUS CONTRACT RECORDED AT ITS BEST SCORE, and what became of it.
  const prevTied = listOf('TIED_AT_BEST');
  eq(prevTied.length, 2, 'the previous contract recorded TWO rows at its best score, (4, 4): the block that shipped and a second row, below it…');
  ok(prevTied[0][1] >= PREVIOUS_RAW_AT && prevTied[0][0] <= PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS,
    '…the first overlapping the cut that shipped, which is why it does not survive it…');
  eq(prevTied.map((r) => moved(r[0])).slice(1), TIED_AT_BEST.map((r) => r[0]),
    '…and the second, moved by the rule, being exactly the row that now stands alone at the best score…');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, '…and it published exactly PREVIOUS_RUNNERS_UP behind them…');
  eq(listed.map((r) => moved(r[0])), [TIED_AT_BEST[0][0]].concat(RUNNERS_UP.slice(0, 3).map((r) => r[0])),
    '…the list, moved by the rule, being this block and then the first three runners-up of this audit: the previous list\'s rows below the cut that shipped moved up by its length and the one above it did not.');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= BY_CONSUMER_SPLIT - 1).length, SCORE_BELOW_BEST,
    'the shipped screen counts SCORE_BELOW_BEST clean candidates below the best score…');
  eq(hiddenRows.length, HIDDEN_ROWS, 'the pass over runs the screen skipped for being short has HIDDEN_ROWS rows…');
  const hiddenClean = hiddenRows.filter((c) => runsNothingAtLoad(c.load));
  eq(hiddenClean.length, HIDDEN_CLEAN_ROWS, '…HIDDEN_CLEAN_ROWS of which run nothing at load');
  ok(hiddenRows.every((c) => c.unitsDecl < RUN_FLOOR && c.unitsDoc >= RUN_FLOOR),
    '…every one below RUN_FLOOR from its declaration and at or above it from its documentation');
  ok(hiddenRows.every((c) => !candidateRuns.some((s) => s.lo === c.lo && s.hi === c.hi)),
    '…and not one of them is a row the shipped screen already has');
  eq(hiddenClean.filter((c) => c.bcs <= BY_CONSUMER_SPLIT - 1).length, HIDDEN_SCORE_BELOW_BEST,
    'HIDDEN_SCORE_BELOW_BEST of them score below the best on byConsumerSplit: neither enumeration holds a row below ' + BY_CONSUMER_SPLIT + '…');
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units, c }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc, c, hidden: true })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    '…so in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit, which is the best score there is…');
  const atBest = rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT);
  if (process.env.DUMP) console.log('S4', atBest.length, cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT).length, hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length);
  eq(atBest.length, ROWS_AT_BEST, 'and BY_CONSUMER_SPLIT is held by ROWS_AT_BEST rows over the two enumerations…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT).length, ROWS_AT_BEST_SCREEN,
    '…ROWS_AT_BEST_SCREEN of them in the shipped screen…');
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length, ROWS_AT_BEST_HIDDEN, '…and ROWS_AT_BEST_HIDDEN in the pass over sub-floor runs…');
  eq(Math.min.apply(null, atBest.map((r) => r.nine)), LOWEST_NINE_AT_BEST,
    '…the lowest raw nine among them being LOWEST_NINE_AT_BEST, which is this block\'s FULL_NINE: nothing at the best score has a lower one…');
  // THE ROWS AT THE BEST SCORE AND THE LOWEST RAW NINE, pinned in full: ONE row, this block, and no tie to break.
  const tiedRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_BEST)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const tied = tiedRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(tied, TIED_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_BEST) are exactly TIED_AT_BEST: ONE row, so the published key has no tie to break this time…');
  eq(atBest.filter((r) => r.nine > LOWEST_NINE_AT_BEST).length, ROWS_AT_BEST - 1, '…every one of the other ROWS_AT_BEST less one rows at the best score carrying a HIGHER raw nine, so none of them can tie');
  ok(tiedRows[0].hidden === true, 'this block\'s row is a row of the PASS over sub-floor runs, which clears the floor only once re-measured from the start of its documentation…');
  eq([tiedRows[0].c.unitsDecl < RUN_FLOOR, tiedRows[0].c.unitsDecl, tiedRows[0].c.unitsDoc], [true, DECL_UNITS_FROM_DECLARATION, TIED_AT_BEST[0][2]],
    '…its declaration alone being DECL_UNITS_FROM_DECLARATION, under RUN_FLOOR, and its documentation taking it to the length pinned for it, so the shipped screen never lists it and the pass is what finds the leader…');
  eq(tiedRows[0].lo, RAW_AT_IN_CODE, '…it opening exactly where the cut does…');
  eq(tiedRows[0].c.p.names, OWNERS_EXPECTED, '…holding its two owners…');
  eq(consumersOf(tiedRows[0].c.p), CONSUMERS.slice().sort(), '…reached from two consumers…');
  eq(tiedRows[0].c.p.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and reading two bindings that stay in the monolith.');
  // THE NEXT SCORE, counted the same way, so "no row below" means something: the rows one step behind.
  eq(rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT + 1).length > 0, true,
    'control — rows DO exist one step behind at ' + (BY_CONSUMER_SPLIT + 1) + ', so the zero below ' + BY_CONSUMER_SPLIT + ' is a measurement and not a screen that returns nothing');
  // THE PUBLISHED KEY, run over everything: this block is FIRST.
  const bestAll = new Map();
  for (const r of rows) {
    const b = bestAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestAll.set(r.lo, r);
  }
  const rankedAll = [...bestAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq(rankedAll.slice(0, 1).map((r) => [r.lo, r.bcs, r.nine, r.units]), TIED_AT_BEST.map((r) => [r[0], BY_CONSUMER_SPLIT, FULL_NINE, r[2]]),
    'the published key puts this block\'s row FIRST over every row, on its raw nine and not on its length: the next row is a step behind on the raw nine…');
  ok(rankedAll[1].bcs === BY_CONSUMER_SPLIT && rankedAll[1].nine > FULL_NINE, '…the second row holding the same byConsumerSplit with a HIGHER raw nine.');
  // WHAT IS PUBLISHED FOR THE NEXT CYCLE, over the screen and the hidden pass
  // together, skipping anything that overlaps the cut.
  const overlaps = (lo, hi) => lo < RAW_END_IN_CODE && hi > RAW_AT_IN_CODE;
  const pool = rows.filter((r) => !overlaps(r.lo, r.hi));
  eq(rows.length - pool.length, ROWS_OVERLAPPING_THE_CUT, 'the ROWS_OVERLAPPING_THE_CUT rows that overlap the cut being set aside…');
  ok(rows.filter((r) => overlaps(r.lo, r.hi)).some((r) => r.lo === RAW_AT_IN_CODE), '…among them this block\'s own row…');
  const bestPer = new Map();
  for (const r of pool) {
    const b = bestPer.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPer.set(r.lo, r);
  }
  const ranked = [...bestPer.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units)
    .slice(0, RUNNERS_UP.length).map((r) => [r.lo, r.bcs, r.nine, r.units]);
  eq(ranked, RUNNERS_UP,
    '…and with this block\'s own rows set aside, the four best other openings, by (byConsumerSplit, nine, units), are exactly RUNNERS_UP');
  ok(ranked.every((r) => r[1] === BY_CONSUMER_SPLIT), '…every one at the SAME byConsumerSplit as this block, the best score there is…');
  ok(ranked.every((r) => r[2] > FULL_NINE), '…and every one behind it on the raw nine.');
}
// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: the owners above and below in its region, the runs the two owners make, and the whole region');
// ───────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const REGION_UP = REGION_OWNER_LIST.slice(0, OWNER_POSITION - 1).reverse();
const REGION_DOWN = REGION_OWNER_LIST.slice(OWNER_POSITION - 1 + OWNER_COUNT);
const upStart = (d) => (d === REGION_OWNER_LIST[0] ? REGION.start : (blockAbove(d) || { start: d.start }).start);
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
const priceRun = (lo, hi) => {
  const p = profileOf([lo, hi]);
  const l = loadTimeProfile(lo, hi);
  let seam = null, refusal = null; try { seam = assertSeam(CODE, lo, hi); } catch (e) { seam = null; refusal = e.message; }
  return { lo, hi, p, bcs: byConsumerSplit(p, outboundSplit(lo, hi)), clean: runsNothingAtLoad(l), seam, refusal };
};
const priceUp = (d) => priceRun(upStart(d), BODY_END_IN_CODE);
const priceDown = (d) => priceRun(RAW_AT_IN_CODE, downEnd(d));
eq(REGION_OWNER_LIST.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION, 'the cut starts at owner number OWNER_POSITION of its region…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and takes the next OWNER_COUNT, which are its two');
eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…of REGION_OWNERS in the region');
eq([REGION_UP.length, REGION_DOWN.length], [OWNER_POSITION - 1, REGION_OWNERS - OWNER_POSITION + 1 - OWNER_COUNT], '…so the region holds that many owners above the cut and that many below it');
// THE OWNERS ABOVE, one step at a time. Priced as the cut extended UP to the start of that owner's documentation.
{
  const priced = REGION_UP.map((d) => Object.assign({ name: d.name }, priceUp(d)));
  if (process.env.DUMP) console.log('UP', JSON.stringify(priced.map((r) => [r.name, r.lo, BODY_END_IN_CODE - r.lo, r.p.nine, r.bcs, consumersOf(r.p).length, r.p.deps.length, r.clean])), 'legal', priced.filter((r) => r.seam !== null).length, 'ties', priced.filter((r) => r.seam !== null && r.p.nine === FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, 'worse', priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, 'tiesbcs', priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, 'notclean', priced.filter((r) => !r.clean).length, 'screen', JSON.stringify(candidateRuns.filter((c) => c.lo < RAW_AT_IN_CODE && c.lo >= REGION.start && c.hi === BODY_END_IN_CODE).map((c) => c.lo)));
  eq(priced.length, EXTENSIONS_UP.length, 'every owner above is priced, EXTENSIONS_UP having a row for each');
  eq(priced.filter((r) => r.seam !== null).length, UP_LEGAL, '…UP_LEGAL of the extensions at a real seam…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine === FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES,
    '…UP_TIES of them TYING the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, UP_WORSE,
    '…UP_WORSE worse than the cut on BOTH the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES_BCS,
    '…UP_TIES_BCS tying it on byConsumerSplit while worse on the raw nine…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…and not one better on either measure');
  eq(priced.filter((r) => !r.clean).length, UP_NOT_CLEAN, '…UP_NOT_CLEAN of them also running something at load…');
  eq(priced.map((r) => [r.name, r.lo, BODY_END_IN_CODE - r.lo, r.p.nine, r.bcs, consumersOf(r.p).length, r.p.deps.length, r.clean]),
    EXTENSIONS_UP, 'the extensions are exactly EXTENSIONS_UP, pinned in full');
  ok(EXTENSIONS_UP.every((e) => e[2] === BODY_END_IN_CODE - e[1]), '…each pinned opening agreeing with its pinned length');
  ok(priced[0].name === OWNER_BEFORE && priced[0].lo === upStart(BY_NAME.get(OWNER_BEFORE)),
    '…the first one OWNER_BEFORE, opening at the start of its own documentation');
  eq(candidateRuns.filter((c) => c.lo < RAW_AT_IN_CODE && c.lo >= REGION.start && c.hi === BODY_END_IN_CODE).map((c) => c.lo), UP_SCREEN_ROWS,
    '…and the shipped screen enumerates UP_SCREEN_ROWS runs that end where the cut does and open above it, in this region, each from the owner\'s declaration');
}
// THE OWNERS BELOW, one step at a time. Priced as the cut extended down to the end of that owner.
{
  const priced = REGION_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  if (process.env.DUMP) console.log('DOWN', JSON.stringify(priced.map((r) => [r.name, r.hi, r.hi - RAW_AT_IN_CODE, r.p.nine, r.bcs, consumersOf(r.p).length, r.p.deps.length, r.clean])), 'legal', priced.filter((r) => r.seam !== null).length, 'refused', priced.filter((r) => r.seam === null).length, 'worse', priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, 'tiesbcs', priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, 'notclean', priced.filter((r) => !r.clean).length);
  eq(priced.length, EXTENSIONS_DOWN.length, 'every owner below is priced, EXTENSIONS_DOWN having a row for each');
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL of the extensions end at a real seam…');
  eq(priced.filter((r) => r.seam === null).length, DOWN_REFUSED,
    '…and DOWN_REFUSED of them are REFUSED by the seam rule…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, DOWN_TIES_BCS,
    '…and DOWN_TIES_BCS of them tying it on byConsumerSplit while worse on the raw nine…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…not one better on either measure…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load');
  eq(priced.map((r) => [r.name, r.hi, r.hi - RAW_AT_IN_CODE, r.p.nine, r.bcs, consumersOf(r.p).length, r.p.deps.length, r.clean]),
    EXTENSIONS_DOWN, 'the extensions are exactly EXTENSIONS_DOWN, pinned in full');
  ok(EXTENSIONS_DOWN.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…each pinned closing agreeing with its pinned length');
  eq(priced[0].name, NEXT_DECL, '…the first one the function right after the cut, the earnings day count');
}
// THE RUNS THE TWO OWNERS MAKE ON THEIR OWN, which are the cut and its two halves, each opening on the owner's own documentation.
const CLUSTER = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
const AFTER_CLUSTER = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
const ownRun = (i, j) => {
  const lo = (blockAbove(CLUSTER[i]) || { start: CLUSTER[i].start }).start;
  const limit = j + 1 < CLUSTER.length ? CLUSTER[j + 1].start : AFTER_CLUSTER.start;
  const be = snapBodyEnd(CODE, lo, limit);
  let seam = null, refusal = null;
  try { seam = assertSeam(CODE, lo, be); } catch (e) { refusal = e.message; }
  return { lo, be, units: be - lo, seam, refusal };
};
{
  const measured = [];
  for (let i = 0; i < CLUSTER.length; i++) {
    for (let j = i; j < CLUSTER.length; j++) {
      const r = ownRun(i, j);
      if (r.refusal) { measured.push([CLUSTER[i].name, CLUSTER[j].name, r.lo, r.be, r.units, 'REFUSED', r.refusal]); continue; }
      const p = profileOf([r.lo, r.be]);
      measured.push([CLUSTER[i].name, CLUSTER[j].name, r.lo, r.be, r.units, p.nine, byConsumerSplit(p, outboundSplit(r.lo, r.be)), p.deps, p.inbound]);
    }
  }
  if (process.env.DUMP) console.log('OWN', JSON.stringify(measured), measured.filter((r) => r[4] < RUN_FLOOR).length);
  eq(measured, OWN_RUNS, 'the two owners make exactly the three runs OWN_RUNS: the first alone, the second alone and both, which is the cut');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them a real seam…');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR even with their own documentation counted: only the two together clear it, by ' + (BODY_CHARS - RUN_FLOOR) + ' units…');
  // THE FLOOR REMOVES TWO RUNS THAT SCORE NO WORSE, and the audit says so rather than leaving it to be found: the floor is a gate on SIZE and not on coupling.
  ok(measured[0][4] < RUN_FLOOR && measured[2][4] < RUN_FLOOR, 'the two owners ALONE are both under RUN_FLOOR, ' + measured[0][4] + ' and ' + measured[2][4] + ' units, the first counted from its documentation…');
  eq([measured[0][5], measured[0][6]], [FULL_NINE, BY_CONSUMER_SPLIT], '…the first alone scoring EXACTLY what the cut scores, on the raw nine and on byConsumerSplit, in ' + (BODY_CHARS - measured[0][4]) + ' fewer units…');
  ok(measured[2][5] < FULL_NINE && measured[2][6] < BY_CONSUMER_SPLIT, '…and the second alone scoring BETTER on both, (' + measured[2][6] + ', ' + measured[2][5] + '), because it is reached from one consumer and reads one binding…');
  eq(measured[2][7], [OWNER], '…that one binding being the FIRST OWNER, which would then have to stay behind in the monolith…');
  ok(measured[2][4] * 2 < SMALLEST_LAYER_CHARS, '…and it would be a layer of less than half of the smallest the programme has shipped, ' + measured[2][4] + ' units against ' + SMALLEST_LAYER_CHARS + '.');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [],
    '…the shipped screen enumerating NO run inside the block, since measured from a declaration none reaches the floor…');
  eq(hiddenRows.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[RAW_AT_IN_CODE, BODY_END_IN_CODE]],
    '…and the pass over sub-floor runs exactly ONE, the cut itself.');
  }
// THE BANNER REGION it sits inside IS NOT THE CUT. The block is two of the nineteen owners of a `// ───` section, so the cut takes no banner:
// the document's banner marks and owner regions do not move, and the region shrinks by the cut and loses two owners — which the
// regions are recomputed on the text without the block to show.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT…');
  eq(reg.end, REGION_END, '…and ends at REGION_END…');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(REGION_LINE_PREFIX), '…opening on a header of the REGION_LINE_PREFIX kind, the dash kind and not the double-rule kind…');
  ok(reg.start < RAW_AT_IN_CODE && RAW_END_IN_CODE < reg.end, '…the cut lying strictly INSIDE it, with owners on both sides…');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  if (process.env.DUMP) console.log('WHOLE', whole.nine, byConsumerSplit(whole, wsplit), consumersOf(whole).length, whole.deps.length, whole.sib, runsNothingAtLoad(loadTimeProfile(reg.start, reg.end)));
  eq([whole.nine, byConsumerSplit(whole, wsplit)], [WHOLE_REGION_NINE, WHOLE_REGION_BCS], 'taking the whole region scores WHOLE_REGION_NINE on the raw nine and WHOLE_REGION_BCS on byConsumerSplit…');
  eq([consumersOf(whole).length, whole.deps.length, whole.sib], [WHOLE_REGION_CONSUMERS, WHOLE_REGION_DEPS, WHOLE_REGION_SIB],
    '…over WHOLE_REGION_CONSUMERS consumers, WHOLE_REGION_DEPS monolith dependencies and WHOLE_REGION_SIB references from sibling modules');
  eq(runsNothingAtLoad(loadTimeProfile(reg.start, reg.end)), WHOLE_REGION_CLEAN, '…and whether it runs nothing at load is WHOLE_REGION_CLEAN: it does not, the region holding top-level statements, so it is not a candidate of the kind the screen keeps, and it scores far worse than the cut on both measures besides');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  const regionsOf = (text) => {
    const marks = topLevelBanners(text, functionBodyRanges(text)).slice().sort((a, b) => a - b);
    const decls = scanTopLevelDeclarations(text);
    const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : text.length }));
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      let r = raw[i];
      while (i + 1 < raw.length &&
        !text.slice(r.start, raw[i + 1].start).split('\n').some((l) => !isBlankOrComment(l))) {
        r = { start: r.start, end: raw[i + 1].end }; i++;
      }
      out.push(r);
    }
    return { marks, decls, regions: out.filter((x) => decls.some((d) => d.start >= x.start && d.end < x.end)) };
  };
  const before = regionsOf(CODE), after = regionsOf(clean);
  eq([before.marks.length, after.marks.length], [BANNER_MARKS, BANNER_MARKS_AFTER],
    'the cut takes NO banner: the document\'s top-level banner marks stay at BANNER_MARKS…');
  eq([before.regions.length, after.regions.length], [OWNER_REGIONS, OWNER_REGIONS_AFTER],
    '…and its owner regions at OWNER_REGIONS…');
  const regAfter = after.regions.filter((r) => r.start === reg.start)[0];
  eq(regAfter.end - regAfter.start, REGION_CHARS - RAW_CHARS, '…the region itself shrinking by exactly the RAW_CHARS the cut takes…');
  eq(after.decls.filter((d) => d.start >= regAfter.start && d.end < regAfter.end).length, REGION_OWNERS - OWNER_COUNT, '…and holding OWNER_COUNT fewer owners');
  eq(after.decls.length, before.decls.length - OWNER_COUNT, '…the document holding OWNER_COUNT fewer top-level declarations');
}
// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and what it counts');
// ─────────────────────────────────────────────────────────────────────────────
eq(RUN_FLOOR, 1500, 'the screen floors runs at RUN_FLOOR units');
eq(rawRunCount, RAW_RUNS, 'it enumerates RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…of which assertSeam refuses SEAM_REJECTED');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
eq(cleanRuns.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
{
  // THE CUT THAT SHIPPED CHANGED THE SCREEN, and the screen SHRANK: the figures measured here less the
  // figures the previous contract pinned.
  eq([RAW_RUNS - prevNum('RAW_RUNS'), SEAM_REJECTED - prevNum('SEAM_REJECTED'), CANDIDATES - prevNum('CANDIDATES'),
    CLEAN_CANDIDATES - prevNum('CLEAN_CANDIDATES')], [DELTA_RAW_RUNS, DELTA_SEAM_REJECTED, DELTA_CANDIDATES, DELTA_CLEAN],
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — all four negative');
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs. That cut took no banner, so its region
  // simply lost the owners it held, and went from n to n less that many owners.
  const tri = (n) => n * (n + 1) / 2;
  const own = prevNum('REGION_OWNERS'), left = own - prevNum('OWNER_COUNT');
  eq(tri(left) - tri(own), DELTA_RAW_RUNS,
    '…and the raw-run change is exactly what that loss predicts: a region of ' + left + ' owners makes ' + tri(left) + ' runs where one of ' + own + ' made ' + tri(own) + ', a difference of DELTA_RAW_RUNS');
  ok(DELTA_RAW_RUNS < 0 && DELTA_SEAM_REJECTED < 0 && DELTA_CANDIDATES < 0 && DELTA_CLEAN < 0,
    '…the candidate counts and, this time, the seam rejections shrinking with it, which this audit measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the first declaration of the cut is a declaration start…');
{
  const opening = candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).map((c) => c.hi).sort((a, b) => a - b);
  eq(opening.length, RUNS_OPENING_HERE, '…and the screen enumerates RUNS_OPENING_HERE runs that open there…');
  ok(opening.every((hi) => hi > BODY_END_IN_CODE),
    '…every one of them ending BEYOND where the cut does, since the run that ends there is under the floor: the screen has no row for the cut, only the pass over sub-floor runs does…');
  ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => byConsumerSplit(c.p, c.split) > BY_CONSUMER_SPLIT),
    '…and not one of those longer runs scores as well as the cut on byConsumerSplit, measured and not assumed');
}
// ─────────────────────────────────────────────────────────────────────────────
section('7. The two functions load bare, reach their dependencies only when a leg needs them, and every branch of both is measured');
// ─────────────────────────────────────────────────────────────────────
{
  const lines = BODY.split('\n');
  lines.pop();
  eq(lines.length, SPLIT_LINES, 'the body is SPLIT_LINES lines');
  eq(lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length, CODE_LINES, '…CODE_LINES of code');
  eq(lines.filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES, '…COMMENT_LINES comment');
  eq(lines.filter((l) => !l.trim()).length, BLANK_LINES, '…and BLANK_LINES blank');
  eq(CODE_LINES + COMMENT_LINES + BLANK_LINES, SPLIT_LINES,
    '…the three summing to SPLIT_LINES, so none is unaccounted for');
}
{
  const thrown = (f) => { try { f(); return null; } catch (e) { return e.name + ': ' + e.message; } };
  // A context holding the block and, when asked for them, RECORDING stand-ins for its two dependencies: the leg filter answers `leg.active !== false`,
  // the per-leg P&L answers `leg.pnl` (or null when the leg has none), and both note what they were asked.
  const fresh = (deps) => {
    const ctx = vm.createContext(Object.create(null));
    ctx.__asked = [];
    if (deps === 'both' || deps === 'filter') {
      vm.runInContext('function isActivePortfolioLeg(leg, position) { __asked.push(["active", leg.id, position.tag]); return leg.active !== false; }', ctx);
    }
    if (deps === 'both') {
      vm.runInContext('function _legUnrealizedPnL(leg, mark) { __asked.push(["leg", leg.id, mark]); return leg.pnl === undefined ? null : leg.pnl; }', ctx);
    }
    vm.runInContext(BODY, ctx);
    const call = (fn, arg) => { ctx.__arg = arg; return vm.runInContext(fn + '(__arg)', ctx); };
    return {
      ctx, position: (p) => call('computePositionUnrealizedPnL', p), portfolio: (ps) => call('computePortfolioUnrealizedPnL', ps),
      asked: () => JSON.parse(JSON.stringify(ctx.__asked)), reset: () => { ctx.__asked.length = 0; },
    };
  };
  const leg = (id, pnl, over) => Object.assign({ id, pnl }, over || {});
  const live = (...prices) => prices.map((p) => (p === undefined ? undefined : { currentPrice: p }));

  // LOADING needs nothing, and the functions that need nothing run without anything.
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(BODY, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'they LOAD in a completely bare VM with nothing defined, and declare exactly their two owners');
  eq(OWNERS_EXPECTED.map((n) => vm.runInContext(n + '.constructor.name', bare)), ['Function', 'Function'], '…both ordinary synchronous functions');
  eq(OWNERS_EXPECTED.map((n) => vm.runInContext(n + '.length', bare)), [1, 1], '…each taking one argument, a position and a list of positions');
  eq([bare.__arg = null, vm.runInContext('computePositionUnrealizedPnL(__arg)', bare), vm.runInContext('computePortfolioUnrealizedPnL(__arg)', bare)], [null, null, null],
    'called bare with nothing, both answer null without touching a dependency…');
  eq(thrown(() => { bare.__arg = { legs: [{}] }; vm.runInContext('computePositionUnrealizedPnL(__arg)', bare); }), 'ReferenceError: isActivePortfolioLeg is not defined',
    '…while a position with a leg throws ReferenceError for the leg filter the moment it reaches the leg, the first dependency it needs…');
  eq(thrown(() => vm.runInContext('(function () { return notDefinedAnywhere; })()', bare)), 'ReferenceError: notDefinedAnywhere is not defined',
    'control — the same bare VM raises ReferenceError for any function that reads a name it does not have, so the failure above is the reason claimed');
  {
    const half = fresh('filter');
    eq(thrown(() => half.position({ legs: [leg(1, 5)], legsLive: live(2) })), 'ReferenceError: _legUnrealizedPnL is not defined',
      'with the filter defined but not the per-leg P&L, an ACTIVE leg throws ReferenceError for the per-leg P&L…');
    half.reset();
    eq([half.position({ legs: [leg(1, 5, { active: false })], legsLive: live(2) }), half.asked()], [null, [['active', 1, null]]],
      '…while an inactive leg is filtered out before the per-leg P&L is read, so a position of inactive legs needs only the filter');
  }

  // THE FIRST OWNER: a position's P&L.
  {
    const h = fresh('both');
    eq([null, undefined, 0, ''].map((p) => h.position(p)), [null, null, null, null], 'no position is null…');
    eq([{}, { legs: null }, { legs: [] }].map((p) => h.position(p)), [null, null, null], '…and so is a position with no legs, an empty list or none at all…');
    eq(h.asked(), [], '…none of them having asked either dependency anything.');
    eq(h.position({ tag: 'p', legs: [leg(1, 10), leg(2, -4)], legsLive: live(1.5, 2.5) }), 6, 'two active legs sum their P&L: 10 and -4 give 6…');
    eq(h.asked(), [['active', 1, 'p'], ['leg', 1, 1.5], ['active', 2, 'p'], ['leg', 2, 2.5]],
      '…the filter asked about each leg with its POSITION, then the per-leg P&L asked for each active leg with the mark at the SAME INDEX, in leg order.');
    h.reset();
    eq(h.position({ legs: [leg(1, 10), leg(2, 99, { active: false }), leg(3, 1)], legsLive: live(1, 2, 3) }), 11, 'an inactive leg is skipped and adds nothing…');
    eq(h.asked().filter((a) => a[0] === 'leg').map((a) => a[1]), [1, 3], '…the per-leg P&L never being asked about it…');
    eq(h.position({ legs: [leg(1, 10, { active: false })], legsLive: live(1) }), null, '…and a position whose every leg is inactive is null, not zero: nothing was active to sum.');
    h.reset();
    eq(h.position({ legs: [leg(1, 0)], legsLive: live(1) }), 0, 'a P&L of exactly zero is a total of zero, not null…');
    eq(h.position({ legs: [leg(1, 3), leg(2, undefined)], legsLive: live(1, 2) }), null, '…and ONE active leg with no P&L makes the whole position null, an incomplete total being shown as "--"…');
    h.reset();
    h.position({ legs: [leg(1, undefined), leg(2, 5)], legsLive: live(1, 2) });
    eq(h.asked().filter((a) => a[0] === 'leg').map((a) => a[1]), [1], '…the loop stopping at the first such leg without asking about the rest.');
    // WHERE THE MARKS COME FROM.
    h.reset();
    h.position({ legs: [leg(1, 1)], live: { legsLive: live(7) } });
    h.position({ legs: [leg(1, 1)], legsLive: live(8), live: { legsLive: live(9) } });
    h.position({ legs: [leg(1, 1)] });
    eq(h.asked().filter((a) => a[0] === 'leg').map((a) => a[2]), [7, 8, null],
      'the marks come from the position\'s own `legsLive`, else from `live.legsLive`, else from nowhere, in that order: 7, then 8 where both exist, then null…');
    h.reset();
    h.position({ legs: [leg(1, 1), leg(2, 1), leg(3, 1), leg(4, 1)],
      legsLive: [{ currentPrice: 1, priceSource: 'terminal_leg_placeholder' }, { currentPrice: null }, { currentPrice: 0 }, undefined] });
    eq(h.asked().filter((a) => a[0] === 'leg').map((a) => a[2]), [null, null, 0, null],
      '…a terminal-leg placeholder, a missing price and a leg with no live entry all giving a null mark, while a price of ZERO is a mark and is passed on as zero.');
  }
  // THE SECOND OWNER: the portfolio total.
  {
    const h = fresh('both');
    eq([null, undefined, []].map((ps) => h.portfolio(ps)), [null, null, null], 'no positions, none at all or an empty list give null…');
    eq(h.portfolio([{ unrealizedPnL: 5 }, { unrealizedPnL: -2 }]), 3, 'rows that carry a finite P&L are summed as they are: 5 and -2 give 3…');
    eq(h.asked(), [], '…the first owner not being called for them at all.');
    eq(h.portfolio([{ unrealizedPnL: 0 }]), 0, 'a row of zero gives a total of zero, not null…');
    eq(h.portfolio([{ unrealizedPnL: 1.5 }, { unrealizedPnL: -1.5 }]), 0, '…and rows that cancel give zero too.');
    h.reset();
    eq(h.portfolio([{ tag: 'r', legs: [leg(1, 4)], legsLive: live(1) }, { unrealizedPnL: 6 }]), 10,
      'a row without a P&L falls back to the first owner\'s answer for it: 4 and 6 give 10…');
    eq(h.asked().length, 2, '…through exactly the calls that fallback makes.');
    for (const bad of [null, undefined, NaN, Infinity, -Infinity]) {
      h.reset();
      eq(h.portfolio([{ unrealizedPnL: bad, legs: [leg(1, 4)], legsLive: live(1) }]), 4, 'a row whose P&L is ' + String(bad) + ' is recomputed by the fallback, not summed');
    }
    eq(h.portfolio([{ legs: [leg(1, undefined)], legsLive: live(1) }, { unrealizedPnL: 7 }]), 7, 'a row the fallback cannot value is skipped and does not blank the total…');
    eq(h.portfolio([{ legs: [leg(1, undefined)], legsLive: live(1) }, null, undefined, { legs: [] }]), null, '…and null only when NO row had a P&L: rows that are null, undefined or empty are skipped the same way.');
    eq(h.portfolio([{ unrealizedPnL: '5' }]), '05',
      'a numeric STRING is finite and so is summed as given, which CONCATENATES onto the zero the total starts from and gives the string "05" — a quirk pinned and not fixed…');
    eq(h.portfolio([{ unrealizedPnL: '5' }, { unrealizedPnL: 3 }]), '053', '…and carried on through every later row.');
  }
  // PURITY.
  {
    const h = fresh('both');
    const frozen = Object.freeze({ tag: 'p', legs: Object.freeze([Object.freeze(leg(1, 10)), Object.freeze(leg(2, 5))]), legsLive: Object.freeze(live(1, 2)) });
    const rows = Object.freeze([frozen, Object.freeze({ unrealizedPnL: 1 })]);
    eq([h.position(frozen), h.portfolio(rows)], [15, 16], 'with the position, its legs and the list FROZEN the answers are the same: the functions write to nothing they are handed…');
    eq([h.position(frozen), h.portfolio(rows)], [15, 16], '…and the same calls twice give the same answers, so they keep no state between calls.');
  }
}
// ─────────────────────────────────────────────────────────────────────
section('8. Where this layer would sit, and what it would change');
// ─────────────────────────────────────────────────────────────────────
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  ok(CHAIN.filter((rel) => path.dirname(rel) === path.dirname(MODULE_REL_IF_CUT)).length > 0 && fs.existsSync(path.join(ROOT, path.dirname(MODULE_REL_IF_CUT))), '…its directory, js/services, already holding layers of the chain');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, 'this cut is LARGER than that, by ' + (BODY_CHARS - SMALLEST_LAYER_CHARS) + ' units, so it would NOT be the smallest layer the chain holds…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, LAYERS_SMALLER_THAN_THIS_CUT,
    '…measured against every layer rather than inferred from the smallest: LAYERS_SMALLER_THAN_THIS_CUT layers are smaller than it…');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…and LAYERS_LARGER_THAN_THIS_CUT larger, counted over the whole set…');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 0, '…none of the same size…');
  eq(LAYERS_SMALLER_THAN_THIS_CUT + 1, SIZE_RANK_IF_CUT, '…so it would rank SIZE_RANK_IF_CUT by size…');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  // THE CHAIN-WIDE SHAPE COUNTS. This body carries NON_ASCII_CHARS non-ASCII characters, so the pure-ASCII count does NOT move; it opens
  // on a comment block and not a `── ` banner, so neither banner count moves.
  const ascii = (s2) => !/[^\x00-\x7F]/.test(s2);
  const banner = (s2) => /^\s*\/\/ ── /.test(s2.split('\n')[0]);
  const wide = (s2) => /^\s*\/\/ ─{2,}[ \t]+\S/.test(s2.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(!ascii(BODY), '…and this body is NOT, so that count would NOT move…');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS, '…measured with it included, which is the same count');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does NOT, opening on a documentation comment, so that count would NOT move…');
  eq(sources.concat([BODY]).filter(banner).length, LAYERS_OPENING_ON_BANNER, '…measured with it included, which is the same count');
  eq(sources.filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER,
    'while LAYERS_OPENING_ON_WIDE_BANNER open on a banner of two or more dashes, the reading topLevelBanners uses…');
  ok(!wide(BODY), '…and this body does not open on one of those either, so the wider count would NOT move…');
  eq(sources.concat([BODY]).filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER, '…measured with it included, which is the same count');
  // THE FOURTH CHAIN-WIDE COUNT, which WOULD move here: layers whose contract pins a non-empty MONOLITH_DEPENDENCIES.
  // Counted over the suite and then compared with the figure the contract that carries it pins.
  const pinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))
    .filter((src) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    });
  eq(pinning.length, LAYERS_WITH_A_DEPENDENCY,
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, counted over the suite…');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]), LAYERS_WITH_A_DEPENDENCY,
  '…which is the figure the contract that carries it pins');
  ok(MONOLITH_DEPENDENCIES.length > 0, '…and this cut pins a NON-EMPTY list, its two monolith bindings, both declared functions, so that count WOULD move to LAYERS_WITH_A_DEPENDENCY + 1: of the four chain-wide counts ONE moves, the layers with a dependency, and the pure-ASCII count and the two banner counts stay');
}
// WHAT THE CUT WOULD COST THE DOCUMENT, forecast here so Phase 2 can be held
// to it the way the last cycle held this one to its own forecast.
eq(TAG_IF_CUT.length, RAW_CHARS - NET_REDUCTION,
  'the tag it would add is RAW_CHARS less NET_REDUCTION units');
eq(TAG_IF_CUT, '<script src="./' + MODULE_REL_IF_CUT + '"></script>\n',
  '…and names the module this audit recommends');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html would land at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
eq(LOCAL_SCRIPTS + 1, LOCAL_SCRIPTS_AFTER, '…and LOCAL_SCRIPTS_AFTER local scripts');
eq(count(INDEX, TAG_IF_CUT), 0, '…and no such tag exists yet');
eq(LOCALS[LOCALS.length - 1], 'js/services/swing-chart-cache-evaluate.js',
  '…the tag would follow the newest local script, which is the previous layer');
// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NOT ONE production file differs from the base: this PR measures, it does not move');
  eq(git(['show', BASE_SHA + ':index.html']).length, BASE_CHARS,
    '…and the base commit\'s index.html is the length measured above');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)),
    '…with the module this audit recommends not yet written');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  ok(all.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  eq(fs.readFileSync(path.join(ROOT, AUDIT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and AUDIT_REL is the path of THIS file, byte for byte');
  ok(all.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  ok(all.every((rel) => rel.startsWith('tests/')), '…and every changed path is a test artifact');
  // THE RATCHET.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this audit in it');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, TEST_FILE_COUNT - 1,
  '…one more than the base commit carried, read out of git');
  const RATCHETED = /^const TEST_FILE_COUNT = \d+;$/m;
  const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js') &&
      RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS files pin the suite file count');
  ok(contracts.every((f) => new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm')
    .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
  '…and every one of them now pins the ratcheted value, this audit included');
  ok(contracts.indexOf(path.basename(AUDIT_REL)) >= 0,
    '…this audit being one of them, so it ratchets itself rather than exempting itself');
  // THE BUDGET.
  const auditSpec = require(path.join(ROOT, AUDIT_SPEC_REL));
  eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length - RETIRED_MUTANTS,
    '…and the live total is the base, LESS the spec this cycle retires, PLUS this audit\'s own '
    + '— the arithmetic of the change rather than the total it happens to reach');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at MUTANT_BUDGET');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  // ABSENCE ALONE IS NOT A PIN.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the outgoing CONTRACT\'s spec is retired, in Phase 1 as the rhythm runs');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely one that never existed');
  ok(fs.existsSync(path.join(ROOT, PREVIOUS_CONTRACT)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + PREVIOUS_CONTRACT + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(AUDIT_SPEC_REL)], '…and during Phase 1 it is THIS audit\'s');
}



console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_UNREALIZED_PNL_AUDIT_OK');
}

main();
