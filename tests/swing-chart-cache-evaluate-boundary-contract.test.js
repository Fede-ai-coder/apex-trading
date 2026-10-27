'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SWING CHART CACHE EVALUATE — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [563771,565663) in monolith coordinates — 1,892 units raw and
// 1,891 of body, ONE owner, synchronous — now lives in js/services/swing-chart-cache-evaluate.js.
// `_swingChartCacheEvaluate(entry, symbol, tf, nowMs)` decides whether a cached candle series may be
// served as fresh and answers a structured verdict, `{ usable, decision, ageMs, cachedSession,
// expectedSession }`, so that the caller and the diagnostic agree on the reason. It has six
// decisions, tried in a fixed order: a miss, an invalid entry, an identity mismatch, a session
// mismatch, an expired entry and a fresh hit. Two functions of the swing chart loader call it.
// The block opened on the FOUR comment lines that document the function (309 units) and ended on
// its closing brace; the blank line AFTER it, in front of the comment block of `_swingChartCachePut`,
// stayed behind as the separator.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #530 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: TWO ROWS TIED AT (4, 4), AND THE KEY ORDERED THEM BY LENGTH ──
// ── ALONE ───────────────────────────────────────────────────────────────────────
//
// The contract before this layer published this block as the first of four runners-up. The cut it
// shipped scored (3, 8), and nothing was left at that score, so the best score over the screen and
// the pass together was (4, 4) on (byConsumerSplit, raw nine): 13 rows held 4 on byConsumerSplit,
// 10 in the screen and 3 in the pass over sub-floor runs, and TWO of them also held the lowest raw
// nine, 4. The published key (byConsumerSplit, raw nine, units ascending) ordered those two by
// LENGTH ALONE: this block, measured the screen's way from its declaration, was 1,582 units against
// 1,949 for the other; with its documentation taken it was 1,891, which is still shorter. The other
// row was a run of two consumers and two dependencies as well, and it came from the pass, which
// clears the floor only once measured from the start of its documentation. §4 pins both rows in full.
//
// ── PART TWO: ONE FUNCTION, TWO CALLS FROM TWO CONSUMERS, TWO DEPENDENCIES ───────
//
// The raw nine was 4: two inbound references, two dependencies and nothing from a shipped
// module. The two references are CALLS inside the bodies of two consumers, `_swingGetChartCandles`,
// which is async and serves a cached series or fetches one, and `_swingPrefetchNeighbors`, which
// is not. The two dependencies stay in the monolith: `SWING_CHART_CACHE_TTL_MS`, a `var` holding
// 180000, and `_swingExpectedNewestSessionDate`, a declared function; both are declared above the
// block and read once each, inside the function body, never assigned. The block writes no monolith
// name, deletes nothing and reaches for nothing but the language's own `Date` and `isFinite`.
//
// ── PART THREE: IT LOADS BARE, AND ITS TWO DEPENDENCIES ARE READ IN A FIXED ORDER ──
//
// Neither call site is outside a function body, and the block reads nothing as it is evaluated, so
// it loads in a bare VM declaring exactly its one function. §7 drives the SHIPPED MODULE there and
// beside stand-ins: calling it bare throws ReferenceError for `_swingExpectedNewestSessionDate`
// before anything is decided, even for an empty entry, while the age limit is read LAST and only by
// an entry that passed every other check. §7 pins each of the six decisions, the age limit at its
// boundary (an age equal to the limit is fresh, one millisecond more is expired) and re-read at call
// time, the order in which the checks win over each other, and two quirks it leaves alone: a clock
// reading of ZERO is a finite reading and does not fall back to the clock, and a numeric string is
// accepted and handed to the session-date function as the string it is.
//
// ── PART FOUR: SEVEN OPENINGS WERE LEGAL, AND THE DOCUMENTATION WENT WITH THE BLOCK ──
//
// The seam rule admitted seven line starts between the owner above and the declaration, six of which
// parse as a program. Cutting at the declaration would have left the four comment lines of the
// documentation directly above the comment block of `_swingChartCachePut`, which they do not
// describe, and cutting at the blank line would have fused the brace above onto that comment block.
// The cut opened on the first documentation line, and the join it left, a brace, a blank line and a
// comment block, is a shape the monolith already held 190 times and holds 189 times afterwards: §2
// counts it. The shipped screen enumerated one run ending where the cut does, opening at the
// declaration, 309 units below the cut; §2 measures the difference.
//
// ── PART FIVE: THE CUT SAT INSIDE ITS REGION, AND TOOK NO BANNER ────────────────
//
// The block was owner 8 of the fifteen of a `// ───` section, so the cut took no banner: the
// document's top-level banner marks stayed at 214 and its owner regions at 113. §5 prices every owner
// on each side in turn. All seven above, each extended up from the cut, scored worse than it on
// both measures and none tied; of the seven below, six were refused by the seam rule and the one that
// was not, the cache write, scored worse too. The run the owner makes on its own is the cut, and the
// whole region scored (24, 29) on that key, over six consumers.
//
// ── PRICED, AND WHERE IT SITS ───────────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-eight layers the chain now holds: it is the seventeenth
// smallest, with sixteen layers smaller and fifty-one larger, measured against every layer. Its body
// is NOT pure ASCII (three em dashes in comments), so the pure-ASCII count did not move; it opens on
// a comment block and not on a banner, so neither banner count moved; and it pins a non-empty monolith
// dependency list, so the count of layers that pin one DID move, by one. §8 measures all four.
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
const UNDO = require('./lib/swing-chart-cache-evaluate-undo.js');
const PORTFOLIO_UNREALIZED_PNL_U = require('./lib/portfolio-unrealized-pnl-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/services/swing-chart-cache-evaluate.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '57a115b';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '2f65a6f';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'ce1d3b5';
const BASE_CHARS = 1408731;
const BASE_UTF8 = 1437048;
const BASE_LF = 24301;
const BASE_SHA256 = '599c9561c24d1c197a82f036c903d8078444c5b9389c73726d8d7c160b999ac8';
const LOCAL_SCRIPTS = 111;
const TEST_FILE_COUNT = 197;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-swing-chart-cache-evaluate-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/swing-chart-cache-evaluate-audit.spec.js';
const CONTRACT_REL = 'tests/swing-chart-cache-evaluate-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/swing-chart-cache-evaluate-contract.spec.js';
const UNDO_REL = 'tests/lib/swing-chart-cache-evaluate-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'ce1d3b5';
const CONTRACT_SPEC_MUTANTS = 239;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 59;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/apex-parity-backend-fetch-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 236;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/swing-chart-cache-evaluate-audit.spec.js';
const RETIRED_MUTANTS = 230;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116756;
const CODE_CHARS = 1291949;
const TOP_LEVEL_DECLS = 878;
const OWNER_REGIONS = 113;

// ── The region ───────────────────────────────────────────────────────────────
// It opened on the first line of the documentation of `_swingChartCacheEvaluate`, four comment lines, then the declaration, and
// ran through the closing brace of the function. The blank line above it stayed behind; the blank line AFTER the block, in
// front of the comment block of `_swingChartCachePut`, was the structural separator.
const RAW_AT_IN_CODE = 563771;
const DECL_AT_IN_CODE = 564080;
const RAW_END_IN_CODE = 565663;
const BODY_END_IN_CODE = 565662;
const RAW_CHARS = 1892;
const BODY_CHARS = 1891;
const BODY_UTF8 = 1897;
const BODY_LF = 33;
const BODY_SHA256 = 'a13bca7ee2d2e1929e80600dc3a07f45ddab2181c6fe7abe3f7d2add2a036480';
const BODY_ENDING = '}\n';
const NON_ASCII_CHARS = 3;
const DOC_FIRST_LINE = '// Decide whether a cache entry may be served as FRESH. Returns a structured verdict so the';
const DECL_FIRST_LINE = 'function _swingChartCacheEvaluate(entry, symbol, tf, nowMs) {';
const NEXT_DECL = '_swingChartCachePut';
const NEXT_DOC_PREFIX = '// Validated write. Returns the decision so the caller can log why a write was skipped.';

// ── Its owner ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_swingChartCacheEvaluate'];
const OWNER_SIZES = [1581];
const OWNER = '_swingChartCacheEvaluate';
const OWNER_BEFORE = '_swingSeriesSessionDate';

// ── Its shape ───────────────────────────────────────────────────────────────
const SPLIT_LINES = 33;
const CODE_LINES = 23;
const COMMENT_LINES = 10;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;
// Where the ten comment lines are: four document the function from above, six sit inside its body.
const BODY_COMMENT_LINES = 6;

// ── The boundary judgement: the openings the seam admits ─────────────────────
const BRACE_OPENING = 563768;
const BLANK_OPENING = 563770;
const DOC_TAKEN = 309;
const DOC_TAKEN_LINES = 4;
const SEAM_LEGAL_OPENINGS = 7;
const PARSING_OPENINGS = 6;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 563769;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 1582;
const CANDIDATES_AT_DECLARATION = 1;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut leaves behind: the closing brace of the owner above, one blank line, and the comment block of the NEXT owner,
// a join the monolith already holds, once, at the end of the block; and what it removes: the join of that brace against
// this block's own documentation. Taking the blank line as well would have fused the brace straight onto that comment block.
const JOIN_AFTER_CUT = '}\n\n' + NEXT_DOC_PREFIX;
const JOIN_AS_BEFORE = '}\n\n// Decide whether a cache entry';
const FUSED_IF_BLANK_TAKEN = '}\n' + NEXT_DOC_PREFIX;
const JOINS_LIKE_THE_CUT_BEFORE = 190;

// ── The banner region it sits inside ─────────────────────────────────────────
// A `// ───` section of FIFTEEN owners, the swing chart cache and its neighbour prefetch: the cut is its owner 8.
const REGION_AT = 558030;
const REGION_END = 583536;
const REGION_CHARS = 25506;
const REGION_OWNERS = 15;
const OWNER_POSITION = 8;
const REGION_LINE_PREFIX = '// ─';
const BANNER_MARKS = 214;
const BANNER_MARKS_AFTER = 214;
const OWNER_REGIONS_AFTER = 113;

// ── Taking more or less, priced: the owners above in the region, the owners below ──
// Above, one step at a time up the region: [name, opening, units, raw nine, byConsumerSplit, consumers, monolith dependencies, runs nothing at load].
const EXTENSIONS_UP = [
  ['_swingSeriesSessionDate', 563431, 2231, 8, 7, 4, 3, true],
  ['_swingExpectedNewestSessionDate', 561411, 4251, 12, 9, 4, 5, true],
  ['_swingCloneCandleSeries', 560947, 4715, 17, 10, 5, 5, true],
  ['_swingChartCacheBeginRequest', 560653, 5009, 24, 15, 5, 8, true],
  ['_swingChartCacheAuthorizedSeq', 560570, 5092, 24, 13, 5, 7, true],
  ['_swingChartCacheSeq', 560055, 5607, 22, 11, 5, 6, true],
  ['_swingChartCacheKey', 558030, 7632, 25, 11, 6, 5, true],
];
const UP_LEGAL = 7;
const UP_TIES = 0;
const UP_WORSE = 7;
const UP_TIES_BCS = 0;
const UP_NOT_CLEAN = 0;
// The shipped screen's own runs that end where the cut does and open above it, in this region.
const UP_SCREEN_ROWS = [558030, 560499, 560570, 560653, 561214, 562340, 563611];
// Below: [name, closing, units from the cut's opening, raw nine, byConsumerSplit, consumers, monolith dependencies, runs nothing at load].
const EXTENSIONS_DOWN = [
  ['_swingChartCachePut', 568758, 4987, 12, 10, 2, 8, true],
  ['_swingInvalidateChartCacheEntry', 569269, 5498, 12, 10, 2, 8, true],
  ['_swingGetChartCandles', 575505, 11734, 21, 18, 2, 11, true],
  ['_swingPrefetchNeighbors', 577093, 13322, 20, 18, 2, 11, true],
  ['_swingCandleTimeMs', 578129, 14358, 25, 23, 4, 10, true],
  ['_swingRowPriceObservedAt', 581062, 17291, 26, 23, 4, 10, true],
  ['_swingResolveRenderPrice', 583536, 19765, 28, 25, 4, 12, true],
];
const DOWN_LEGAL = 1;
const DOWN_REFUSED = 6;
const DOWN_WORSE = 1;
const DOWN_TIES_BCS = 0;
const DOWN_NOT_CLEAN = 0;
// THE ONE RUN the owner makes: [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['_swingChartCacheEvaluate', '_swingChartCacheEvaluate', 563771, 565662, 1891, 4, 4, ['SWING_CHART_CACHE_TTL_MS', '_swingExpectedNewestSessionDate'], 2],
];
const OWN_RUNS_LEGAL = 1;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 0;
// THE WHOLE REGION, taken as one cut.
const WHOLE_REGION_NINE = 29;
const WHOLE_REGION_BCS = 24;
const WHOLE_REGION_CONSUMERS = 6;
const WHOLE_REGION_DEPS = 9;
const WHOLE_REGION_SIB = 2;
const WHOLE_REGION_CLEAN = true;

// ── Coupling ───────────────────────────────────────────────────────────────
const FULL_NINE = 4;
const BY_CONSUMER = 4;
const BY_CONSUMER_SPLIT = 4;
const CONSUMERS = ['_swingGetChartCandles', '_swingPrefetchNeighbors'];
const CONSUMER_SITES = 2;
const CONSUMER_SITES_AT = [570511, 576349];
// What each of the two sites is: [site, the text written there]. Both are CALLS inside function bodies.
const SITE_TEXTS = [
  [570511, '_swingChartCacheEvaluate(entry, symbol, tf, now)'],
  [576349, '_swingChartCacheEvaluate(S.swing.chartCache[key], sym, tf)'],
];
// The declared consumers that hold the calls: [name, start, end, chars].
const CONSUMER_DECLS = [
  ['_swingGetChartCandles', 570208, 575503, 5296],
  ['_swingPrefetchNeighbors', 575763, 577091, 1329],
];
// How many other places name each dependency: its own declaration and the places that call or read it. Measured, not assumed.
const OTHER_DEPENDENCY_MENTIONS = [1, 3];
const MONOLITH_DEPENDENCIES = ['SWING_CHART_CACHE_TTL_MS', '_swingExpectedNewestSessionDate'];
// [name, start, end, chars, form] of each monolith dependency.
const DEPENDENCY_DECLS = [
  ['SWING_CHART_CACHE_TTL_MS', 383901, 383938, 38, 'var'],
  ['_swingExpectedNewestSessionDate', 562340, 563428, 1089, 'function'],
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
const VM_GLOBALS = ['_swingChartCacheEvaluate'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7034;
const SEAM_REJECTED = 2077;
const CANDIDATES = 2712;
const CLEAN_CANDIDATES = 1626;
const SCORE_BELOW_BEST = 0;
// Screen runs that open at the declaration, the shortest being the screen's row of the cut.
const RUNS_OPENING_HERE = 2;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor.
const HIDDEN_ROWS = 31;
const HIDDEN_CLEAN_ROWS = 30;
const HIDDEN_SCORE_BELOW_BEST = 0;
// THE ROWS AT THE BEST SCORE, 4, over the screen and the pass together.
const ROWS_AT_BEST = 13;
const ROWS_AT_BEST_SCREEN = 10;
const ROWS_AT_BEST_HIDDEN = 3;
const LOWEST_NINE_AT_BEST = 4;
// Rows of the screen and the pass together that overlap the cut: set aside before the next cycle's list is drawn.
const ROWS_OVERLAPPING_THE_CUT = 16;
// THE ROWS AT (byConsumerSplit, raw nine) = (4, 4), pinned in full, in the SCREEN's coordinates:
// [opening, closing, units, consumers, monolith dependencies]. TWO rows tie, and the published key orders them by units.
const TIED_AT_BEST = [
  [564080, 565662, 1582, 2, 2],
  [728906, 730855, 1949, 2, 2],
];
// The best four OTHER openings over the screen and the hidden pass together, skipping every row that overlaps the cut,
// as [opening, byConsumerSplit, raw nine, units], by the published key.
const RUNNERS_UP = [
  [728906, 4, 4, 1949],
  [724254, 4, 5, 1589],
  [156267, 4, 6, 1967],
  [721068, 4, 6, 2014],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
const DELTA_RAW_RUNS = -25;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = -22;
const DELTA_CLEAN = -10;
const PREVIOUS_RAW_CHARS = 1672;
const PREVIOUS_RAW_AT = 1174762;
// The previous contract's published list, in the coordinates of the document BEFORE the cut that
// shipped, which sat BELOW every row of it.
const PREVIOUS_RUNNERS_UP = [
  [564080, 4, 4, 1582],
  [728906, 4, 4, 1949],
  [724254, 4, 5, 1589],
  [156267, 4, 6, 1967],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. SMALLEST_LAYER_CHARS is the smallest layer of the chain, and is not this one.
const CHAIN_LENGTH = 68;
const SMALLEST_LAYER_CHARS = 1540;
const SIZE_RANK = 17;
const LAYERS_SMALLER_THAN_THIS_CUT = 16;
const LAYERS_LARGER_THAN_THIS_CUT = 51;
const PRIOR_PURE_ASCII_LAYERS = 10;
const PURE_ASCII_LAYERS = 10;
const PRIOR_LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_BANNER = 26;
const PRIOR_LAYERS_OPENING_ON_WIDE_BANNER = 30;
const LAYERS_OPENING_ON_WIDE_BANNER = 30;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 30;
const LAYERS_WITH_A_DEPENDENCY = 31;
// The count above is the figure AT THIS LAYER. The later layer that pins a NON-EMPTY list
// instead IS among the contracts counted over the suite, and is set aside to recover the
// figure at this layer rather than left to make it drift.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['portfolio-unrealized-pnl-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1824;
const INDEX_AFTER = 1406907;
const RESIDUAL_MONOLITH = 1290057;
const LOCAL_SCRIPTS_AFTER = 112;
// The tag's position among the local scripts, zero-based: the last of 112.
const TAG_LOCAL_INDEX = 111;
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


console.log('SWING CHART CACHE EVALUATE — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const LIVE_INDEX = PORTFOLIO_UNREALIZED_PNL_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_UNREALIZED_PNL_U.undoPortfolioUnrealizedPnl(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-unrealized-pnl.js'), 'utf8'))
  : HEAD_INDEX;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX, MODULE);

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


// CHAIN, chronological, oldest first — this cycle's own literal, as the audit
// said Phase 2 would give it. Reading it off the previous newest contract was
// right while this layer had not shipped; now this file IS the newest, so the
// list ends at its own layer and the next cycle reads it from here.
const CHAIN = [
  'js/services/journal-core.js',
  'js/services/mcx-regime-policy.js',
  'js/ui/journal-ui.js',
  'js/services/journal-remote-persistence.js',
  'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js',
  'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js',
  'js/ui/mcx-macro-check.js',
  'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js',
  'js/ui/tt-reconnect.js',
  'js/ui/journal-close-legs.js',
  'js/ui/journal-trade-forms.js',
  'js/ui/journal-trade-detail.js',
  'js/portfolio/portfolio-data-fetch.js',
  'js/portfolio/backend-portfolios.js',
  'js/portfolio/portfolio-expiry-manual.js',
  'js/portfolio/portfolio-traffic-light.js',
  'js/ui/backend-candle-store-chart.js',
  'js/services/journal-rich-snapshot.js',
  'js/portfolio/portfolio-backend-candles.js',
  'js/services/journal-snapshot-prefetch.js',
  'js/portfolio/portfolio-dxlink-greeks.js',
  'js/config/strategy-templates.js',
  'js/portfolio/portfolio-vega-monitor.js',
  'js/services/scanner-ivr-throttle.js',
  'js/services/scanner-earnings-throttle.js',
  'js/ui/chart-interactions.js',
  'js/services/journal-snapshot-helpers.js',
  'js/services/swing-weekly-candles.js',
  'js/services/swing-direction.js',
  'js/portfolio/backend-positions-aggregate.js',
  'js/portfolio/portfolio-technical-merge.js',
  'js/portfolio/portfolio-technical-alignment-debug.js',
  'js/services/journal-map-audit.js',
  'js/services/dxlink-greeks-fetch.js',
  'js/portfolio/portfolio-technical-parity.js',
  'js/portfolio/portfolio-spy-price.js',
  'js/services/apex-storage-recovery.js',
  'js/portfolio/portfolio-leg-quantity.js',
  'js/portfolio/backend-full-refresh-validation.js',
  'js/portfolio/portfolio-snapshot-fallback.js',
  'js/portfolio/portfolio-technical-batch-fetch.js',
  'js/ui/rs-skip-breakdown-html.js',
  'js/portfolio/portfolio-greeks-freshness.js',
  'js/portfolio/portfolio-underlying-fallback-plan.js',
  'js/portfolio/portfolio-price-freshness.js',
  'js/portfolio/portfolio-missing-underlyings-gate.js',
  'js/services/scanner-dxlink-prices.js',
  'js/services/rs-quality-check.js',
  'js/portfolio/backend-positions-enriched.js',
  'js/portfolio/portfolio-option-streamer-diagnostics.js',
  'js/services/scanner-dss-chart-load-guard.js',
  'js/services/swing-chart-cache-helpers.js',
  'js/services/scanner-stock-scoring.js',
  'js/ui/scanner-dss-1d-chart.js',
  'js/portfolio/portfolio-stale-mark-squeeze-state.js',
  'js/services/journal-expiry-audit.js',
  'js/portfolio/portfolio-regime-badge-html.js',
  'js/portfolio/portfolio-backend-squeeze-extract.js',
  'js/portfolio/portfolio-beta-missing-reason.js',
  'js/services/option-chain-error-helpers.js',
  'js/services/ai-scan-context.js',
  'js/services/apex-parity-compare.js',
  'js/services/swing-trend-context.js',
  'js/services/apex-parity-backend-fetch.js',
  'js/services/swing-chart-cache-evaluate.js',
];

// THE SELF-INCLUSION GUARD. CHAIN now ends at THIS layer and this file is its
// contract, so any census over CHAIN that reads contracts would count this cut as
// evidence for a claim about the layers that preceded it. Every such census runs
// over PRIOR_LAYERS and asserts this layer's own half separately.
const PRIOR_LAYERS = CHAIN.slice(0, CHAIN.length - 1);
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
eq(sha256(git(['show', AUDIT_BASE_SHA + ':index.html'])), BASE_SHA256,
  '…and the same digest as the document at AUDIT_BASE_SHA, where the audit measured it: Phase 1 moved no byte');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and is CODE_CHARS units of residual code');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it holds TOP_LEVEL_DECLS top-level declarations');
eq(REGIONS.length, OWNER_REGIONS, '…across OWNER_REGIONS owner regions');
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the apex parity
// backend fetch predicted the document, the residual monolith and the script
// count this contract measures, so the two cycles are joined by numbers.
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
section('2. The region, its seam, and the seven openings the seam admits');
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
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * NON_ASCII_CHARS, '…each of them an em dash of three bytes in UTF-8 and one unit in UTF-16, two bytes apart');
ok(BODY.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => l.trim().startsWith('//')),
  '…and every one of them in a COMMENT line, none in code: the encoding of the file matters for prose only');
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
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the seven…');
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
    '…so PARSING_OPENINGS of the seven are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the whole documentation block above the function and nothing else: the four comment lines directly above
// the declaration, with the blank line above THEM left behind.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  eq((doc.match(/^\/\/ ─{2,}[ \t]+\S/gm) || []).length + (doc.match(/^\/\/ ═{2,}/gm) || []).length, 0,
    '…none of them a banner of either kind, so the cut takes NO section heading with it');
  eq(MARKS.filter((m) => m >= RAW_AT_IN_CODE && m < RAW_END_IN_CODE).length, 0,
    '…and no banner mark lies anywhere inside the cut: it sits in the MIDDLE of a banner region');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNER)).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  const fn = BY_NAME.get(OWNER);
  const commentsIn = (text) => text.split('\n').filter((l) => l.trim().startsWith('//')).length;
  eq(commentsIn(CODE.slice(fn.start, fn.end + 1)), BODY_COMMENT_LINES, 'the function holds BODY_COMMENT_LINES comment lines inside its body…');
  eq(DOC_TAKEN_LINES + BODY_COMMENT_LINES, COMMENT_LINES, '…so the block\'s COMMENT_LINES are the four at the top and six inside');
  ok(doc.indexOf('Decide whether a cache entry may be served as FRESH') >= 0 && doc.indexOf('CACHE_HIT_FRESH') >= 0,
    '…and the block documents the six decisions the function returns, which §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the documentation is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE COMMENT BLOCK WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would have left the four comment lines directly above the comment block of ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would have fused the brace of the owner above straight onto the comment block of ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith held nowhere before the cut, once there');
}
// WHAT THE CUT LEAVES. The brace of the owner above, one blank line, then the comment block of the next owner: the very join the
// monolith held at the END of the block, so the cut moved it and the document gained no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith held the join `}` blank line `' + NEXT_DOC_PREFIX + '` once before the cut, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the function…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of this block\'s own documentation was held once before the cut, and is gone after it…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the documentation leaving with the block');
  eq(count(CODE, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE, 'and a brace, a blank line and a comment is a shape the document holds JOINS_LIKE_THE_CUT_BEFORE times…');
  eq(count(atCut, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE - 1, '…one fewer after the cut, which removes the join in front of the documentation and keeps the other');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this comment block or declaration is left behind');
}
// THE SCREEN MEASURES THIS RUN FROM ITS DECLARATION, not from its documentation: it is not the first owner of its region, and it clears the
// floor without the documentation, so the screen's row opens DOC_TAKEN units below the cut.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION >= RUN_FLOOR, '…at or above RUN_FLOOR, by ' + (DECL_UNITS_FROM_DECLARATION - RUN_FLOOR) + ' units, with no help from its documentation…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…so the screen enumerates CANDIDATES_AT_DECLARATION run that opens at the declaration and ends where the cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, CANDIDATES_AT_CUT,
  '…and CANDIDATES_AT_CUT that opens where the cut does: the screen\'s row is the cut WITHOUT its documentation, and the audit recommended the cut WITH it…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE).length, HIDDEN_ROWS_AT_CUT,
  '…the pass over sub-floor runs holding HIDDEN_ROWS_AT_CUT rows for it, because only runs under the floor are re-measured from their documentation');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE - DECL_UNITS_FROM_DECLARATION, DOC_TAKEN,
  '…the cut being the screen\'s row plus exactly the DOC_TAKEN units of documentation above it');
// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one function, two calls from two consumers, two dependencies, nothing from a shipped module, all read at call time');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this one name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a declared function, so this layer ships no mutable binding');
  ok(own.every((d) => !d.isAsync), '…SYNCHRONOUS: it returns its verdict, it does not promise one');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, 1,
    '…holding NO function expression inside it besides itself: straight-line branches, no callbacks…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the one owner');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one, among them the reference from a shipped module: no module names the function');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from the monolith outside the block…');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: TWO monolith bindings, a `var` and a declared function');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted: the block calls nothing a module declares');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: two inbound references and two dependencies');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER: two consumers and two dependencies…');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'TWO consumers reach in from the monolith: CONSUMERS, both declared functions');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const outside = (at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE;
  eq(refSites(MASKED, OWNER).filter(outside), CONSUMER_SITES_AT, 'all of those references are to ' + OWNER + '…');
  eq(refSites(STRINGS, OWNER).filter(outside).length, 0,
    '…and the name appears in no string or generated markup outside the block');
  eq(count(STATIC_MARKUP, OWNER), 0, '…nor in the static markup, so no inline handler names it');
  eq(SIB_REFS.get(OWNER), { n: 0, who: [] }, '…and no shipped module names it, so the chain of layers already extracted does not reach the block');
  // WHAT EACH OF THE TWO SITES IS, as written.
  eq(SITE_TEXTS.map(([at]) => at), CONSUMER_SITES_AT, 'SITE_TEXTS pins the same two sites…');
  eq(SITE_TEXTS.map(([at, text]) => CODE.slice(at, at + text.length)), SITE_TEXTS.map(([, text]) => text),
    '…each exactly the text written there');
  eq(SITE_TEXTS.map(([at, text]) => CODE.slice(at + text.length, at + text.length + 8)), [';\n\n  if ', '.usable)'],
    '…each a CALL, the first a statement ending in a semicolon whose result is kept as the verdict and the second read straight through `.usable` in a condition: the verdict object is what both consumers use');
}
// WHERE EACH SITE IS: both are calls inside a function body; none is evaluated as the monolith loads.
{
  const innermost = (at) => FN_BODIES.filter((r) => at >= r.start && at <= r.end).sort((a, b) => b.start - a.start)[0];
  eq(CONSUMER_DECLS.map(([name]) => name), CONSUMERS, 'the declared consumers are CONSUMER_DECLS, both of CONSUMERS…');
  for (const [name, start, end, chars] of CONSUMER_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function opening at ' + start + ', ' + chars + ' units long');
    ok(d.start > RAW_END_IN_CODE, '…outside the block, BELOW it');
  }
  eq(CONSUMER_DECLS.map(([name]) => BY_NAME.get(name).isAsync), [true, false], '…the first ASYNC, the one that fetches and caches candles, and the second synchronous, the neighbour prefetch…');
  eq(CONSUMER_SITES_AT.map((at) => (hostOf(at) || {}).name), ['_swingGetChartCandles', '_swingPrefetchNeighbors'],
    '…one call in each');
  ok(CONSUMER_SITES_AT.every((at) => insideFunction(at)), '…every call inside a function body, so not one is a statement the monolith evaluates as it loads…');
  ok(CONSUMER_SITES_AT.every((at) => { const body = innermost(at); const host = BY_NAME.get(hostOf(at).name); return body && body.start >= host.start && body.end <= host.end; }),
    '…each within the body of its host');
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
  eq(DEPENDENCY_DECLS.map(([name]) => BY_NAME.get(name).form), ['var', 'function'],
    'one of them a `var` the monolith assigns as it evaluates and the other a declared function, in the order MONOLITH_DEPENDENCIES lists them…');
  eq(CODE.slice(DEPENDENCY_DECLS[0][1], DEPENDENCY_DECLS[0][2] + 1), 'var SWING_CHART_CACHE_TTL_MS = 180000;', '…the `var` holding `180000`, a number of milliseconds, three minutes');
  eq(DEPENDENCY_DECLS.map(([name]) => refSites(bodyMasked, name).length), [1, 1],
    'the block names each of the two at ONE place…');
  ok(DEPENDENCY_DECLS.every(([name]) => refSites(bodyMasked, name).every((p) => FN_BODIES.some((r) => p + RAW_AT_IN_CODE >= r.start && p + RAW_AT_IN_CODE <= r.end))),
    '…inside the function body, so the dependencies are read when the function runs and not as the block is evaluated…');
  ok(!/\b(SWING_CHART_CACHE_TTL_MS|_swingExpectedNewestSessionDate)\s*(=(?!=)|\+\+|--|\+=|-=)/.test(bodyMasked), '…and never as the target of an assignment');
  eq(bodyMasked.slice(refSites(bodyMasked, '_swingExpectedNewestSessionDate')[0] - 'var expected = '.length, refSites(bodyMasked, '_swingExpectedNewestSessionDate')[0] + '_swingExpectedNewestSessionDate(now)'.length),
    'var expected = _swingExpectedNewestSessionDate(now)', '…the function CALLED once with the current time, before anything else is decided…');
  eq(bodyMasked.slice(refSites(bodyMasked, 'SWING_CHART_CACHE_TTL_MS')[0] - 'out.ageMs > '.length, refSites(bodyMasked, 'SWING_CHART_CACHE_TTL_MS')[0] + 'SWING_CHART_CACHE_TTL_MS'.length),
    'out.ageMs > SWING_CHART_CACHE_TTL_MS', '…and the `var` READ once, as the age limit, only after the structural, identity and session checks have all passed');
  eq(DEPENDENCY_DECLS.map(([name]) => refSites(MASKED, name).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length), OTHER_DEPENDENCY_MENTIONS,
    'control — the two are named OTHER_DEPENDENCY_MENTIONS times elsewhere in the monolith, so the counts of 1 above are the block\'s own and not every mention in the file');
}
// NOTHING FROM A SHIPPED MODULE: the language's own `Date` and `isFinite` only.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\b(Math|Object|Number|Date|Array|String|Boolean|JSON|isFinite|fetch|AbortSignal)\b/g) || []).sort(), ['Date', 'isFinite', 'isFinite'],
    'the block reaches for the language\'s own `Date` once, for `Date.now`, and `isFinite` twice, which any context supplies and which are not the monolith\'s…');
  eq(MODULE_OWNERS.get('Date'), undefined, '…neither declared by a shipped module…');
  eq(OUTBOUND_MODULE_REFERENCES, 0, '…and OUTBOUND_MODULE_REFERENCES module references are made, which is why the reconstruction of this layer needs no foundation module to run');
}
// WHAT RUNS AT LOAD. Nothing: the block holds one function declaration and no statement.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: one function declaration only');
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
  eq(nonLocalAssignmentsUncorrected(BODY), [],
    'the inherited scan reports no name as assigned that the block does not own…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan, which counts every declarator of a list as local, finds NON_LOCAL_ASSIGNMENTS either: the block assigns only its own locals and the properties of its `out` object');
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { SWING_CHART_CACHE_TTL_MS = 1; }'), ['SWING_CHART_CACHE_TTL_MS'],
    'control — a write to the dependency the block reads is found: the zero above is not blind to the one name that matters here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}
// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: with the (3, 8) tier gone the best score is 4, two rows tie at (4, 4), and the published key orders them by length alone');
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
  ok(PREVIOUS_RAW_AT > BODY_END_IN_CODE,
    '…and it sat entirely BELOW this block, so every coordinate this contract measures above it did not move and the rule below leaves them where they were');
  const moved = (at) => (at >= PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS ? at - PREVIOUS_RAW_CHARS : at);
  // WHAT THE PREVIOUS CONTRACT RECORDED AT ITS BEST SCORE, and what became of it.
  const prevTied = listOf('TIED_AT_BEST');
  eq(prevTied.length, 2, 'the previous contract recorded TWO rows at its best score, (3, 8): the block that shipped and that block extended up by one owner, BOTH gone from the document…');
  ok(prevTied.every((r) => r[1] >= PREVIOUS_RAW_AT && r[0] <= PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS),
    '…each of them overlapping the cut that shipped, which is why neither survives it…');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, '…and it published exactly PREVIOUS_RUNNERS_UP behind them…');
  eq(listed.map((r) => moved(r[0])), listed.map((r) => r[0]), '…none of the four moved by the rule, every one lying above the cut that shipped…');
  eq(listed.slice(0, 2).map((r) => [r[0], r[1], r[2], r[3]]), TIED_AT_BEST.map((r) => [r[0], BY_CONSUMER_SPLIT, LOWEST_NINE_AT_BEST, r[2]]),
    '…the first TWO of them being exactly the rows that now tie at the best score, this block\'s row first…');
  eq(listed.slice(1).map((r) => [r[0], r[1], r[2], r[3]]), RUNNERS_UP.slice(0, 3),
    '…and the other three being this contract\'s first three runners-up…');
  ok(!listed.some((r) => r[0] === RUNNERS_UP[3][0]),
    '…this contract\'s fourth runner-up being a row the previous contract did not list');
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
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length, ROWS_AT_BEST_HIDDEN, '…and ROWS_AT_BEST_HIDDEN in the pass over sub-floor runs, so this tier is the screen\'s own…');
  eq(Math.min.apply(null, atBest.map((r) => r.nine)), LOWEST_NINE_AT_BEST,
    '…the lowest raw nine among them being LOWEST_NINE_AT_BEST, which is this block\'s FULL_NINE: nothing at the best score has a lower one…');
  // THE ROWS AT THE BEST SCORE AND THE LOWEST RAW NINE, pinned in full: TWO of them tie, and this block's is the shorter.
  const tiedRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_BEST)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const tied = tiedRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(tied, TIED_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_BEST) are exactly TIED_AT_BEST: TWO rows, every row at the best score among them…');
  eq(tiedRows.length, 2, '…the two rows being all there are at that raw nine…');
  eq(atBest.filter((r) => r.nine > LOWEST_NINE_AT_BEST).length, ROWS_AT_BEST - 2, '…every one of the other ROWS_AT_BEST less two rows at the best score carrying a HIGHER raw nine, so none of them can tie');
  ok(tied[0][2] < tied[1][2], 'their lengths differ, in strictly ascending order, so the third key column settles it without a further tie: ' + tied.map((r) => r[2]).join(' < '));
  eq(tied[1][2] - tied[0][2], 367, '…this block\'s row 367 units shorter than the other: it is first by LENGTH ALONE, and the audit says so rather than presenting a margin on the raw nine or on byConsumerSplit that is not there');
  ok(BODY_CHARS < tied[1][2], '…and with its four documentation lines taken the cut is BODY_CHARS units, still ' + (tied[1][2] - BODY_CHARS) + ' shorter than the other, whose figure already includes its own documentation, so the order does not depend on which way the first is measured');
  ok(tiedRows[0].hidden !== true, '…this block\'s row one of the SCREEN\'s own, enumerated from its declaration…');
  ok(tiedRows[1].hidden === true, '…and the other a row of the PASS over sub-floor runs, which clears the floor only once re-measured from the start of its documentation…');
  eq([tiedRows[1].c.unitsDecl < RUN_FLOOR, tiedRows[1].c.unitsDoc], [true, TIED_AT_BEST[1][2]], '…its declaration alone being under RUN_FLOOR and its documentation taking it to the length pinned for it…');
  eq(tiedRows[0].c.p.names, OWNERS_EXPECTED, '…this block\'s row holding its one owner…');
  eq(tiedRows[1].c.p.names, ['computePositionUnrealizedPnL', 'computePortfolioUnrealizedPnL'], '…while the other holds the two unrealised-PnL helpers of the portfolio code, a different region of the monolith…');
  ok(tiedRows[1].lo > RAW_END_IN_CODE, '…below this block and not touching it, so it survives the cut and is the first of the next cycle\'s runners-up.');
  // THE ROW THE SCREEN HOLDS IS THE CUT WITHOUT ITS DOCUMENTATION, and scores exactly what the cut scores.
  {
    const cutProfile = profileOf([RAW_AT_IN_CODE, BODY_END_IN_CODE]);
    eq([cutProfile.nine, byConsumerSplit(cutProfile, outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE))], [tiedRows[0].nine, tiedRows[0].bcs],
      'the cut itself, with its four comment lines, scores the same (byConsumerSplit, raw nine) as the screen\'s row without them: documentation adds no reference to the count…');
    eq(consumersOf(cutProfile), consumersOf(tiedRows[0].c.p), '…and carries the same consumers…');
    eq(cutProfile.deps, tiedRows[0].c.p.deps, '…and the same dependencies, the cut being the screen\'s row plus ' + DOC_TAKEN + ' units of prose');
  }
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
  eq(rankedAll.slice(0, 2).map((r) => [r.lo, r.bcs, r.nine, r.units]), TIED_AT_BEST.map((r) => [r[0], BY_CONSUMER_SPLIT, FULL_NINE, r[2]]),
    'the published key puts this block\'s row FIRST over every row, and the longer row of the tie second…');
  // WHAT IS PUBLISHED FOR THE NEXT CYCLE, over the screen and the hidden pass
  // together, skipping anything that overlaps the cut.
  const overlaps = (lo, hi) => lo < RAW_END_IN_CODE && hi > RAW_AT_IN_CODE;
  const pool = rows.filter((r) => !overlaps(r.lo, r.hi));
  eq(rows.length - pool.length, ROWS_OVERLAPPING_THE_CUT, '…the ROWS_OVERLAPPING_THE_CUT rows that overlap the cut being set aside…');
  ok(rows.filter((r) => overlaps(r.lo, r.hi)).some((r) => r.lo === DECL_AT_IN_CODE), '…among them the screen\'s own row for this block…');
  ok(pool.some((r) => r.lo === TIED_AT_BEST[1][0]), '…and not the other row of the tie, which stays in the pool…');
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
  eq(ranked.map((r) => r[2]), [4, 5, 6, 6], '…their raw nines 4, 5, 6 and 6, the first tying this block\'s and the others behind it, as the key orders them');
}
// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less cost: the owners above and below in its region, the one run the owner makes, and the whole region');
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
  '…and takes the next OWNER_COUNT, which is its one');
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
  eq(priced[0].name, NEXT_DECL, '…the first one the function right after the cut, the cache write');
  ok(priced[0].seam !== null && priced.slice(1).every((r) => r.seam === null), '…and that first one is the ONE of the seven that lands on a real seam: the other six are all refused');
}
// THE RUNS THE TWO OWNERS MAKE ON THEIR OWN, which are the cut and its two halves.
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
  eq(measured, OWN_RUNS, 'the one owner makes exactly the one run OWN_RUNS, which is the cut');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them a real seam…');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR: the cut clears it by ' + (BODY_CHARS - RUN_FLOOR) + ' units, and its documentation is not what gets it there…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[DECL_AT_IN_CODE, BODY_END_IN_CODE]],
    '…the shipped screen enumerating exactly ONE run inside the block, from the declaration, which is the cut without its documentation…');
  eq(hiddenRows.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [],
    '…and the pass over sub-floor runs none, the owner clearing the floor on its own');
  }
// THE BANNER REGION it sits inside IS NOT THE CUT. The block is one of the fifteen owners of a `// ───` section, so the cut takes no banner:
// the document's banner marks and owner regions do not move, and the region shrinks by the cut and loses one owner — which the
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
  eq(runsNothingAtLoad(loadTimeProfile(reg.start, reg.end)), WHOLE_REGION_CLEAN, '…and whether it runs nothing at load is WHOLE_REGION_CLEAN: it does, so it was a candidate of the kind the screen keeps, but it scored far worse than the cut, on both measures, and is REGION_CHARS units');
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
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — three negative and the seam rejections unmoved');
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs. That cut took no banner, so its region
  // simply lost the owners it held, and went from n to n less that many owners.
  const tri = (n) => n * (n + 1) / 2;
  const own = prevNum('REGION_OWNERS'), left = own - prevNum('OWNER_COUNT');
  eq(tri(left) - tri(own), DELTA_RAW_RUNS,
    '…and the raw-run change is exactly what that loss predicts: a region of ' + left + ' owners makes ' + tri(left) + ' runs where one of ' + own + ' made ' + tri(own) + ', a difference of DELTA_RAW_RUNS');
  ok(DELTA_RAW_RUNS < 0 && DELTA_SEAM_REJECTED === 0 && DELTA_CANDIDATES < 0 && DELTA_CLEAN < 0,
    '…the candidate counts shrinking with it and the seam rejections not moving, which this contract measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
{
  const opening = candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).map((c) => c.hi).sort((a, b) => a - b);
  eq(opening[0], BODY_END_IN_CODE, '…and the screen enumerates runs that open there, the SHORTEST of them being the screen\'s row of the cut, which ends where the cut does…');
  eq(opening.length, RUNS_OPENING_HERE, '…of which there are RUNS_OPENING_HERE, the others going on further down the region and each longer');
  ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi > BODY_END_IN_CODE).every((c) => byConsumerSplit(c.p, c.split) > BY_CONSUMER_SPLIT),
    '…measured, not assumed: not one of the longer runs from this opening scores as well as the cut on byConsumerSplit');
}
// ─────────────────────────────────────────────────────────────────────────────
section('7. The function loads bare, needs its two dependencies only when it reaches them, and every one of its six decisions is measured');
// ─────────────────────────────────────────────────────────────────────
{
  const lines = MODULE.split('\n');
  lines.pop();
  eq(lines.length, SPLIT_LINES, 'the body is SPLIT_LINES lines');
  eq(lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length, CODE_LINES, '…CODE_LINES of code');
  eq(lines.filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES, '…COMMENT_LINES comment');
  eq(lines.filter((l) => !l.trim()).length, BLANK_LINES, '…and BLANK_LINES blank');
  eq(CODE_LINES + COMMENT_LINES + BLANK_LINES, SPLIT_LINES,
    '…the three summing to SPLIT_LINES, so none is unaccounted for');
}
{
  const TTL_DECL = CODE.slice(DEPENDENCY_DECLS[0][1], DEPENDENCY_DECLS[0][2] + 1);
  const thrown = (f) => { try { f(); return null; } catch (e) { return e.name + ': ' + e.message; } };
  const NOW = 1700000000000;
  // A context holding the block, the monolith's own declaration of the age limit, a stand-in for the session-date function that RECORDS
  // what it is asked and answers what it is told to, and a fixed clock.
  const fresh = (expected) => {
    const ctx = vm.createContext(Object.create(null));
    ctx.__asked = [];
    ctx.__expected = expected === undefined ? null : expected;
    vm.runInContext(TTL_DECL, ctx);
    vm.runInContext('function _swingExpectedNewestSessionDate(now) { __asked.push(now); return __expected; }', ctx);
    vm.runInContext('Date = { now: function () { return ' + NOW + '; } };', ctx);
    vm.runInContext(MODULE, ctx);
    return {
      ctx,
      // Results are copied out through JSON: objects built inside the VM have that realm's prototypes, which a deep equality in this
      // one would refuse. Every value the function returns is a string, a number, a boolean or null.
      ev: (entry, symbol, tf, nowMs) => { ctx.__e = entry; ctx.__s = symbol; ctx.__t = tf; ctx.__n = nowMs;
        return JSON.parse(vm.runInContext('JSON.stringify(_swingChartCacheEvaluate(__e, __s, __t, __n))', ctx)); },
      asked: () => JSON.parse(JSON.stringify(ctx.__asked)),
    };
  };
  const entry = (over) => Object.assign({ symbol: 'SPY', timeframe: '1D', candles: [{ c: 1 }], fetchedAt: NOW - 1000, lastSessionDate: '2026-10-21' }, over || {});
  const verdict = (usable, decision, ageMs, cachedSession, expectedSession) => ({ usable, decision, ageMs, cachedSession, expectedSession });

  // LOADING needs nothing; CALLING needs the session-date function at once, and the age limit only at the very end.
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its one owner');
  eq(vm.runInContext(OWNER + '.constructor.name', bare), 'Function', '…an ordinary synchronous function');
  eq(vm.runInContext(OWNER + '.length', bare), 4, '…taking four arguments, an entry, a symbol, a timeframe and a clock reading');
  eq(thrown(() => vm.runInContext(OWNER + '(null, "SPY", "1D", 1)', bare)), 'ReferenceError: _swingExpectedNewestSessionDate is not defined',
    '…and CALLING it there throws ReferenceError for the session-date function EVEN FOR AN EMPTY ENTRY, because that call comes first: the dependency is read at CALL time and before anything is decided…');
  eq(thrown(() => vm.runInContext('(function () { return notDefinedAnywhere; })()', bare)), 'ReferenceError: notDefinedAnywhere is not defined',
    'control — the same bare VM raises ReferenceError for any function that reads a name it does not have, so the failure above is the reason claimed');
  {
    const noTtl = vm.createContext(Object.create(null));
    noTtl.__expected = null;
    vm.runInContext('function _swingExpectedNewestSessionDate(now) { return __expected; }', noTtl);
    vm.runInContext(MODULE, noTtl);
    eq(JSON.parse(vm.runInContext('JSON.stringify(' + OWNER + '(null, "SPY", "1D", 5))', noTtl)).decision, 'CACHE_MISS',
      'with the session-date function defined but not the age limit, an empty entry is still a plain miss: the age limit is not touched…');
    noTtl.__expected = '2026-10-21';
    const early = [
      { symbol: 'SPY', timeframe: '1D', candles: [], fetchedAt: 1, lastSessionDate: '2026-10-21' },
      { symbol: 'QQQ', timeframe: '1D', candles: [1], fetchedAt: 1, lastSessionDate: '2026-10-21' },
      { symbol: 'SPY', timeframe: '1D', candles: [1], fetchedAt: 1, lastSessionDate: '2026-10-20' },
    ];
    eq(early.map((e) => { noTtl.__e = e; return JSON.parse(vm.runInContext('JSON.stringify(' + OWNER + '(__e, "SPY", "1D", 100))', noTtl)).decision; }),
      ['CACHE_INVALID', 'CACHE_IDENTITY_MISMATCH', 'CACHE_SESSION_MISMATCH'],
      '…and so are the invalid, the identity-mismatched and the session-mismatched entries, each decided without the age limit being touched: all four of the decisions before the last are reached with it undefined…');
    noTtl.__expected = null;
    noTtl.__e = { symbol: 'SPY', timeframe: '1D', candles: [1], fetchedAt: 1, lastSessionDate: 'x' };
    eq(thrown(() => vm.runInContext(OWNER + '(__e, "SPY", "1D", 100)', noTtl)), 'ReferenceError: SWING_CHART_CACHE_TTL_MS is not defined',
      '…while an entry that passes every check reaches it and throws ReferenceError for it: the age limit is read LAST, as the audit found');
  }

  // THE RESULT AND ITS SHAPE.
  {
    const h = fresh('2026-10-21');
    eq(h.ev(entry(), 'SPY', '1D', NOW), verdict(true, 'CACHE_HIT_FRESH', 1000, '2026-10-21', '2026-10-21'),
      'a good entry is usable: `CACHE_HIT_FRESH`, its age in milliseconds, the session it carries and the session the market has produced…');
    eq(Object.keys(h.ev(entry(), 'SPY', '1D', NOW)), ['usable', 'decision', 'ageMs', 'cachedSession', 'expectedSession'], '…the five keys in a fixed order…');
    eq(h.asked(), [NOW, NOW], '…the session-date function having been asked the clock reading, once per call.');
  }
  // CACHE_MISS.
  {
    const h = fresh('2026-10-21');
    eq([null, undefined, 0, ''].map((e) => h.ev(e, 'SPY', '1D', NOW)), Array(4).fill(verdict(false, 'CACHE_MISS', null, null, '2026-10-21')),
      'no entry — null, undefined, zero, an empty string — is a MISS that still reports the session the market has produced…');
  }
  // CACHE_INVALID.
  {
    const h = fresh('2026-10-21');
    eq([{ candles: null }, { candles: [] }, { candles: undefined }].map((o) => h.ev(entry(o), 'SPY', '1D', NOW).decision), Array(3).fill('CACHE_INVALID'),
      'an entry with no candles, an empty list or none at all is INVALID, never a silent hit…');
    eq([{ fetchedAt: null }, { fetchedAt: undefined }, { fetchedAt: NaN }, { fetchedAt: 'soon' }, { fetchedAt: Infinity }].map((o) => h.ev(entry(o), 'SPY', '1D', NOW)),
      Array(5).fill(verdict(false, 'CACHE_INVALID', null, '2026-10-21', '2026-10-21')),
      '…and so is one whose fetch time is missing, not a number or not finite, which leaves no age to judge…');
    eq(h.ev(entry({ fetchedAt: NOW + 1 }), 'SPY', '1D', NOW), verdict(false, 'CACHE_INVALID', -1, '2026-10-21', '2026-10-21'),
      '…and one fetched in the FUTURE, whose age comes out negative and is reported as it is.');
  }
  // CACHE_IDENTITY_MISMATCH.
  {
    const h = fresh('2026-10-21');
    eq([h.ev(entry(), 'QQQ', '1D', NOW).decision, h.ev(entry(), 'SPY', '1W', NOW).decision, h.ev(entry({ symbol: 'QQQ' }), 'SPY', '1D', NOW).decision],
      ['CACHE_IDENTITY_MISMATCH', 'CACHE_IDENTITY_MISMATCH', 'CACHE_IDENTITY_MISMATCH'],
      'an entry that names another symbol or another timeframe than the one asked for is an IDENTITY mismatch, from either side…');
    eq(h.ev(entry(), 'spy', '1D', NOW).decision, 'CACHE_IDENTITY_MISMATCH', '…the comparison strict and case-sensitive.');
  }
  // CACHE_SESSION_MISMATCH and the cases that skip it.
  {
    const h = fresh('2026-10-21');
    eq(h.ev(entry({ lastSessionDate: '2026-10-20' }), 'SPY', '1D', NOW), verdict(false, 'CACHE_SESSION_MISMATCH', 1000, '2026-10-20', '2026-10-21'),
      'an entry whose newest candle predates the session the market has already produced is a SESSION mismatch, however recent it is…');
    eq([{ lastSessionDate: null }, { lastSessionDate: undefined }, { lastSessionDate: '' }].map((o) => h.ev(entry(o), 'SPY', '1D', NOW).decision), Array(3).fill('CACHE_SESSION_MISMATCH'),
      '…and so is one that carries no session at all, an unprovable one being a mismatch and never a pass…');
    eq([h.ev(entry({ lastSessionDate: '2026-10-21' }), 'SPY', '1D', NOW).decision, h.ev(entry({ lastSessionDate: '2026-10-22' }), 'SPY', '1D', NOW).decision], ['CACHE_HIT_FRESH', 'CACHE_HIT_FRESH'],
      '…while one holding the expected session or a LATER one passes it.');
    const none = fresh(null);
    eq([{ lastSessionDate: null }, { lastSessionDate: '1999-01-01' }].map((o) => none.ev(entry(o), 'SPY', '1D', NOW).decision), ['CACHE_HIT_FRESH', 'CACHE_HIT_FRESH'],
      'with NO expected session — the session-date function answering null — the session check is skipped altogether, and an entry with no session or an ancient one is judged on its age alone.');
  }
  // CACHE_EXPIRED, and its boundary.
  {
    const h = fresh('2026-10-21');
    const TTL = 180000;
    eq([h.ev(entry({ fetchedAt: NOW - TTL }), 'SPY', '1D', NOW).decision, h.ev(entry({ fetchedAt: NOW - TTL - 1 }), 'SPY', '1D', NOW).decision, h.ev(entry({ fetchedAt: NOW }), 'SPY', '1D', NOW).decision],
      ['CACHE_HIT_FRESH', 'CACHE_EXPIRED', 'CACHE_HIT_FRESH'],
      'an entry exactly as old as the age limit is still fresh and one a millisecond older is EXPIRED, the comparison being strictly greater than, an age of zero being fresh too…');
    eq(h.ev(entry({ fetchedAt: NOW - TTL - 1 }), 'SPY', '1D', NOW), verdict(false, 'CACHE_EXPIRED', TTL + 1, '2026-10-21', '2026-10-21'), '…the verdict carrying the age that decided it…');
    vm.runInContext('SWING_CHART_CACHE_TTL_MS = 10;', h.ctx);
    eq([h.ev(entry({ fetchedAt: NOW - 10 }), 'SPY', '1D', NOW).decision, h.ev(entry({ fetchedAt: NOW - 11 }), 'SPY', '1D', NOW).decision], ['CACHE_HIT_FRESH', 'CACHE_EXPIRED'],
      '…and once the age limit is reassigned the SAME calls move their line, the limit being read when the function runs and not when it loads.');
  }
  // THE ORDER OF THE CHECKS: each earlier check wins over every later one.
  {
    const h = fresh('2026-10-21');
    const stale = { candles: [], symbol: 'QQQ', lastSessionDate: '2026-10-01', fetchedAt: 1 };
    eq(h.ev(entry(stale), 'SPY', '1D', NOW).decision, 'CACHE_INVALID', 'an entry that is invalid, of another symbol, of an old session and expired is reported INVALID: structure first…');
    eq(h.ev(entry({ symbol: 'QQQ', lastSessionDate: '2026-10-01', fetchedAt: 1 }), 'SPY', '1D', NOW).decision, 'CACHE_IDENTITY_MISMATCH', '…then identity…');
    eq(h.ev(entry({ lastSessionDate: '2026-10-01', fetchedAt: 1 }), 'SPY', '1D', NOW).decision, 'CACHE_SESSION_MISMATCH', '…then the session…');
    eq(h.ev(entry({ fetchedAt: 1 }), 'SPY', '1D', NOW).decision, 'CACHE_EXPIRED', '…and the age last.');
  }
  // THE CLOCK READING.
  {
    const h = fresh('2026-10-21');
    eq([null, undefined, NaN, Infinity, 'abc'].map((n) => h.ev(entry({ fetchedAt: NOW - 5 }), 'SPY', '1D', n).ageMs), Array(5).fill(5),
      'a clock reading that is missing, NaN, infinite or not a number falls back to the clock, and the age is measured against it…');
    eq(h.asked().slice(-5), Array(5).fill(NOW), '…the session-date function being asked THAT reading, not the one passed in.');
    eq(h.ev(entry({ fetchedAt: NOW - 5 }), 'SPY', '1D', NOW + 7).ageMs, 12, 'a finite reading is used as given…');
    eq(h.ev(entry({ fetchedAt: 5 }), 'SPY', '1D', 0).decision, 'CACHE_INVALID', '…and ZERO is a finite reading, so it does NOT fall back to the clock: an entry fetched after it is a negative age, and invalid — a quirk pinned and not fixed…');
    const q = fresh('2026-10-21');
    eq(q.ev(entry({ fetchedAt: 4 }), 'SPY', '1D', '10').ageMs, 6, '…and a numeric STRING passes the finite test and is used, subtracting as a number…');
    eq(q.asked(), ['10'], '…while the session-date function is handed the STRING, unconverted, another quirk pinned and not fixed.');
  }
  // PURITY.
  {
    const h = fresh('2026-10-21');
    const frozen = Object.freeze(entry({ candles: Object.freeze([Object.freeze({ c: 1 })]) }));
    eq(h.ev(frozen, 'SPY', '1D', NOW), h.ev(entry(), 'SPY', '1D', NOW), 'with the entry and its candles FROZEN the verdict is the same: the function writes to nothing it is handed…');
    eq(h.ev(frozen, 'SPY', '1D', NOW), h.ev(frozen, 'SPY', '1D', NOW), '…and the same call twice gives the same verdict, so it keeps no state between calls.');
  }
}
// ─────────────────────────────────────────────────────────────────────
section('8. Where this layer sits, and what it changed');
// ─────────────────────────────────────────────────────────────────────
{
  // THE AUDIT ASSERTED THE OPPOSITE of the first two: while the cut was still a
  // recommendation this module was absent from the chain and from disk. It
  // ships now, so the claims are INVERTED rather than deleted — an assertion
  // that stops being made is the way this programme loses coverage.
  ok(CHAIN.indexOf(MODULE_REL) >= 0, 'this module is IN the chain now');
  eq(CHAIN[CHAIN.length - 1], MODULE_REL, '…as its newest layer, at the end of the list');
  ok(fs.existsSync(path.join(ROOT, MODULE_REL)), '…and its path exists');
  ok(CHAIN.filter((rel) => path.dirname(rel) === path.dirname(MODULE_REL)).length > 1,
    '…in js/services, beside the other services layers');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units, and it is not this module…');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, '…which is LARGER than that, by ' + (BODY_CHARS - SMALLEST_LAYER_CHARS) + ' units, as the audit found…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    '…measured against every layer rather than inferred from the smallest: it ranks SIZE_RANK by size…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, LAYERS_SMALLER_THAN_THIS_CUT,
    '…with LAYERS_SMALLER_THAN_THIS_CUT layers smaller than it…');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…and LAYERS_LARGER_THAN_THIS_CUT layers larger…');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 1, '…none of the others exactly its size, the one at that length being itself…');
  eq(sizes[SIZE_RANK - 1], MODULE.length, '…the layer at that rank in size order being this module…');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  // THE CHAIN-WIDE COUNTS, and the audit forecast that the dependency count would move and that neither
  // the pure-ASCII count nor the banner counts would. The shape counts are asserted as comparisons between two
  // measurements, over the chain before this layer and over the whole chain,
  // rather than carried forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s2) => !/[^\x00-\x7F]/.test(s2);
  const banner = (s2) => /^\s*\/\/ ── /.test(s2.split('\n')[0]);
  const wide = (s2) => /^\s*\/\/ ─{2,}[ \t]+\S/.test(s2.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is NOT, asserted of the module directly: it holds non-ASCII characters…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS, '…the SAME number: the pure-ASCII count did not move, as the audit forecast');
  eq(prior.filter(banner).length, PRIOR_LAYERS_OPENING_ON_BANNER,
    'PRIOR_LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: its first line is a documentation comment…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is LAYERS_OPENING_ON_BANNER…');
  eq(LAYERS_OPENING_ON_BANNER, PRIOR_LAYERS_OPENING_ON_BANNER, '…the SAME number: it did not move, as the audit forecast…');
  eq(prior.filter(wide).length, PRIOR_LAYERS_OPENING_ON_WIDE_BANNER,
    '…while PRIOR_LAYERS_OPENING_ON_WIDE_BANNER of the chain before it open on a banner of two or more dashes, the reading topLevelBanners uses…');
  ok(!wide(MODULE), '…and this module does not open on one of those either…');
  eq(sources.filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER, '…the count over the whole chain being LAYERS_OPENING_ON_WIDE_BANNER…');
  eq(LAYERS_OPENING_ON_WIDE_BANNER, PRIOR_LAYERS_OPENING_ON_WIDE_BANNER, '…the SAME number as well: neither banner count moved, as the audit forecast');
  // THE FOURTH CHAIN-WIDE COUNT, and the other one that moved: layers whose
  // contract pins a non-empty MONOLITH_DEPENDENCIES. Counted over the suite with
  // this contract in it, then compared with the figure the contract that carries
  // it pins. This contract pins two monolith bindings, so it is among them.
  const contractsPinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => ({ f, src: fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8') }))
    .filter(({ src }) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    }).map((x) => x.f);
  ok(LATER_CONTRACTS_WITH_A_DEPENDENCY.every((f) => contractsPinning.indexOf(f) >= 0),
    'every later layer that pins a non-empty list is among the contracts counted…');
  const atThisLayer = contractsPinning.filter((f) => LATER_CONTRACTS_WITH_A_DEPENDENCY.indexOf(f) < 0);
  eq(atThisLayer.length, LAYERS_WITH_A_DEPENDENCY,
    '…and LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES at this layer, counted over the suite without them…');
  ok(contractsPinning.indexOf(path.basename(CONTRACT_REL)) >= 0, '…this contract being one of them…');
  eq(MONOLITH_DEPENDENCIES.length, 2, '…it pinning the non-empty list of its two monolith bindings, a `var` and a function, which is why the count moved, as the audit forecast…');
  eq(atThisLayer.filter((f) => f !== path.basename(CONTRACT_REL)).length, PRIOR_LAYERS_WITH_A_DEPENDENCY,
    '…PRIOR_LAYERS_WITH_A_DEPENDENCY of the others pinning one, so it is the next of them and the count is one higher…');
  eq(LAYERS_WITH_A_DEPENDENCY, PRIOR_LAYERS_WITH_A_DEPENDENCY + 1, '…by exactly one…');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]), LAYERS_WITH_A_DEPENDENCY + LATER_CONTRACTS_WITH_A_DEPENDENCY.length,
  '…and the figure the contract that carries the live count pins now, with the later layers included');
}
// WHAT THE RELOCATION COST THE DOCUMENT — the audit forecast these before
// anything moved, and §9 holds the shipped document to them.
eq(UNDO.TAG.length, RAW_CHARS - NET_REDUCTION,
  'the tag it added is RAW_CHARS less NET_REDUCTION units');
eq(UNDO.TAG, '<script src="./' + MODULE_REL + '"></script>\n',
  '…and names the module this layer shipped');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html lands at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
eq(LOCAL_SCRIPTS + 1, LOCAL_SCRIPTS_AFTER, '…and LOCAL_SCRIPTS_AFTER local scripts');
eq(count(INDEX, UNDO.TAG), 0,
  '…and the RECONSTRUCTED base carries no such tag, which is what makes it the base');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The relocation is the whole of the production change');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = require('./lib/extraction-change-scope').historicalChangedFiles(git, BASE_SHA, __filename).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  // THE AUDIT ASSERTED THAT NOTHING MOVED. The phase that shipped this layer moved exactly the audited
  // bytes and nothing else, so the claim was inverted rather than dropped: the document and the new module,
  // and no third. It now reads against a base that a LATER layer has also moved past, so the footprint is
  // the document, this layer's module, and the module of every layer cut after it.
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-unrealized-pnl.js'].sort(),
    'the production footprint is index.html, this layer\'s module, and the module of every '
    + 'layer cut after it');
  eq(git(['show', BASE_SHA + ':index.html']).length, BASE_CHARS,
    '…and the base commit\'s index.html is the length the reconstruction reproduces');
  eq(sha256(git(['show', BASE_SHA + ':index.html'])), sha256(INDEX),
    '…byte for byte: the reconstruction IS that document, not a copy of its numbers');
  ok(!git(['show', BASE_SHA + ':index.html']).includes(UNDO.TAG),
    '…and the base carried no tag for this module');
  ok(fs.existsSync(path.join(ROOT, MODULE_REL)),
    '…while the module the audit recommended is now written');

  // THE SHIPPED DOCUMENT is what the audit predicted, to the byte.
  eq(LIVE_INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index.html is the extracted length');
  eq(Buffer.byteLength(LIVE_INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…its byte length');
  eq((LIVE_INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…its line-feed count');
  eq(sha256(LIVE_INDEX), UNDO.EXTRACTED_SHA256, '…and its digest');
  eq(LIVE_INDEX.length, INDEX_AFTER,
    '…which is INDEX_AFTER, the figure the audit forecast before anything moved');
  eq(LIVE_MONOLITH.length, RESIDUAL_MONOLITH,
    '…and the residual inline monolith is RESIDUAL_MONOLITH, the other forecast');
  eq(LIVE_LOCALS.length, UNDO.EXTRACTED_LOCAL_SCRIPTS,
    '…carrying one more local script than the base');
  eq(LOCALS.length + 1, LIVE_LOCALS.length,
    '…exactly one more, measured against the reconstruction rather than against a pin');
  eq(count(LIVE_INDEX, UNDO.TAG), 1, 'exactly one tag for this module');
  eq(count(LIVE_INDEX, UNDO.ANCHOR_TAG + UNDO.TAG + UNDO.INLINE_OPEN), 1,
    '…immediately after the previous layer and immediately before the inline monolith');

  // THE MODULE IS THE AUDITED BLOCK VERBATIM — asserted as bytes, not numbers.
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the shipped module is MODULE_CHARS units');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…its byte length');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…its line-feed count');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and its digest');
  eq(MODULE, CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
    'the module IS the audited block of the reconstructed monolith, byte for byte — not a '
    + 'copy of its measurements');
  eq(sha256(MODULE), BODY_SHA256,
    '…and its digest is the BODY_SHA256 the audit pinned before the move');
  eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + UNDO.SEPARATOR,
    '…with the raw fragment being the module plus the one structural separator');
  ok(MODULE.endsWith(BODY_ENDING) && !MODULE.endsWith('\n\n'),
    '…and the module ends on a real line of code, not on the separator it gave up');
  eq(MODULE.split('\n')[0], DOC_FIRST_LINE,
    '…and OPENS on DOC_FIRST_LINE, the first line of its documentation, which is the boundary §2 defends…');
  eq(MODULE.split('\n')[DOC_TAKEN_LINES], DECL_FIRST_LINE,
    '…with the declaration of its owner on the line right after the DOC_TAKEN_LINES lines of documentation…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…and holds NON_ASCII_CHARS non-ASCII characters, the three em dashes of its comments, so the move preserves a file that is not pure ASCII…');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * NON_ASCII_CHARS, '…its UTF-8 length longer than its UTF-16 length by two bytes for each of them');
}
// THE TAG'S POSITION. Nothing here shows the load order to be load-bearing (§3 says what it does not measure), and it is
// pinned all the same: last of the local scripts, immediately before the inline monolith, whose consumer stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/services/apex-parity-backend-fetch.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumer calls it, the very next script');
  }
  ok(DEPENDENCY_DECLS.every(([name]) => LIVE_MONOLITH.indexOf(name) >= 0),
    '…and the two bindings the module reads at call time, which stay in the inline monolith, are read there once the module runs');
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES THE OWNER at the two sites in the two consumers: the block's own text left, the
  // calls did not — and not one of them is outside a function body, so none runs as the monolith loads.
  eq(OWNERS_EXPECTED.map((name) => refSites(maskLiterals(LIVE_MONOLITH), name).length), [CONSUMER_SITES],
    '…while the shipped monolith names it in CODE at the CONSUMER_SITES sites that stayed, one in each consumer — a comment that mentions it is not a site…');
  ok(refSites(LIVE_MONOLITH, OWNERS_EXPECTED[0]).length > CONSUMER_SITES,
    '…the unmasked count being higher, because a comment still names it: why the sites are counted on the masked text');
  {
    const liveBodies = functionBodyRanges(LIVE_MONOLITH);
    const liveMasked = maskLiterals(LIVE_MONOLITH);
    ok(OWNERS_EXPECTED.every((name) => refSites(liveMasked, name).every((at) => liveBodies.some((r) => at >= r.start && at <= r.end))),
      '…every one of them inside a function body of the SHIPPED monolith, so none is evaluated as it loads');
  }
  eq(OWNERS_EXPECTED.reduce((t2, name) => t2 + refSites(MASKED, name).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, 0), CONSUMER_SITES,
    '…the same CONSUMER_SITES the reconstructed base held from outside the block…');
  // The module itself names them, the control that makes the counts below measurements.
  ok(OWNERS_EXPECTED.every((name) => refSites(MODULE, name).length >= 1), 'control — the same count over the module itself finds the name…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t2, rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return t2 + OWNERS_EXPECTED.reduce((t3, name) => t3 + refSites(src, name).length, 0);
  }, 0), 0,
  '…and not one other local script names the function, so the module is reached only from the monolith');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its one owner and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => MONOLITH_DEPENDENCIES.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    MONOLITH_DEPENDENCIES.slice().sort(), '…and so do the two bindings the module reads at call time, the `var` and the function');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMER_DECLS.some((c) => c[0] === d.name)).map((d) => d.name),
    CONSUMER_DECLS.map((c) => c[0]), '…and its two declared consumers, which call the module\'s function');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…the owner that follows the cut, ' + NEXT_DECL + ', staying declared too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the closing brace of ' + OWNER_BEFORE + ' against the comment block of the next owner across one blank line, once…');
  eq(LIVE_MONOLITH.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…at the place the cut was made…');
  eq(count(LIVE_MONOLITH, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE - 1,
    '…one fewer of a brace, a blank line and a comment than the JOINS_LIKE_THE_CUT_BEFORE the base held: the join after the block moved up to the owner above, and the join in front of its documentation left with it…');
  eq(count(LIVE_MONOLITH, JOIN_AS_BEFORE), 0, '…the join of that brace against this block\'s first declaration gone with the block');
  // THE BANNERS, counted on the shipped monolith: the cut took none.
  eq(topLevelBanners(LIVE_MONOLITH, functionBodyRanges(LIVE_MONOLITH)).length, BANNER_MARKS_AFTER,
    'the shipped monolith holds BANNER_MARKS_AFTER top-level banner marks, the same as the BANNER_MARKS the base held: the cut took no banner with it');
  // CONTROL: the same predicate fails on a document with the tag moved, so the
  // pin is a measurement and not a statement that is true of any document.
  const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
  const movedLocals = APP_LOADER.parseScriptTags(moved)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  ok(movedLocals.indexOf(MODULE_REL) !== TAG_LOCAL_INDEX && movedLocals[movedLocals.length - 1] !== MODULE_REL,
    'control — with the tag moved to the top of the document, both of those pins would fail');
}
// THE UNDO'S REACHABLE GUARDS, each driven by PLANTING the exact violation it
// claims to catch. A guard that is never made to fire is a guard nobody has
// checked, and its EXACT message is asserted so a mutant cannot pass by raising
// some other error. BASE_IDENTITY is deliberately absent: the helper's header
// states it is a redundant final gate, unreachable once the module digest and
// the whole-document digest have both passed.
{
  const E = 'SWING_CHART_CACHE_EVALUATE_UNDO_';
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,892 units, not 1,891 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX, MODULE + '\n'),
    E + 'MODULE_IDENTITY', '…so SIZE refuses it, before the separator gate is reached');
  {
    // THE SEPARATOR GATE, reached on its own terms: a module of the RIGHT length
    // and the RIGHT line-feed count that still does not end on a line of code.
    // The naive mutant — swap the trailing `}\n` for `\n\n` — does NOT reach it:
    // that moves the line-feed count and gate 1 refuses it first. One LF is
    // traded away elsewhere to keep the count, which is what makes the probe
    // land on this gate rather than on the one above it.
    const blankEnded = MODULE.slice(0, -2).replace('\n', ' ') + '\n\n';
    eq(blankEnded.length, MODULE.length, 'control — the blank-ended module is the right length');
    eq(Buffer.byteLength(blankEnded, 'utf8'), Buffer.byteLength(MODULE, 'utf8'), '…the right byte length');
    eq((blankEnded.match(/\n/g) || []).length, (MODULE.match(/\n/g) || []).length,
      '…and has the same line-feed count, so only the separator gate can refuse it');
    ok(blankEnded.endsWith('\n\n'), '…and it really does end on a blank line');
    throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('CACHE_MISS', 'CACHE_MISX');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoSwingChartCacheEvaluate(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoSwingChartCacheEvaluate(INDEX, MODULE),
    E + 'TAG_IDENTITY',
    'and the ALREADY-UNEXTRACTED document is refused too: undoing twice is not a no-op');
  // isApplied is ROUTING, not safety — the helper's header says so.
  eq(UNDO.isApplied(LIVE_INDEX), true, 'isApplied is true for the shipped document');
  eq(UNDO.isApplied(INDEX), false, '…and false once this layer is peeled off');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = require('./lib/extraction-change-scope').historicalChangedFiles(git, BASE_SHA, __filename).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  // THE AUDIT IS GONE, AND THIS FILE IS WHAT REPLACED IT — one for one, which
  // is the rhythm. The audit asserted AUDIT_REL was its own path; that claim is
  // inverted here rather than dropped.
  ok(all.indexOf(AUDIT_REL) >= 0, 'the audit is part of the change — as a deletion');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)), '…and its path no longer exists');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]), '',
    '…while the base commit DID carry it, so the deletion is of something real');
  eq(CONTRACT_REL, path.relative(ROOT, __filename),
    'CONTRACT_REL is the path of THIS file, which is what the audit became');
  ok(all.indexOf(CONTRACT_REL) >= 0, '…and it is part of the change');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)), 'the audit\'s spec is gone too');
  ok(fs.existsSync(path.join(ROOT, UNDO_REL)), 'and the undo helper ships');
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/swing-chart-cache-evaluate-undo.js'),
    '…and UNDO_REL is the very file this contract loads its reconstruction from, not merely a helper that exists');
  eq(all.filter((rel) => !rel.startsWith('tests/') && rel !== 'index.html'
    && !rel.startsWith('js/')), [],
  '…with every remaining changed path being a test artifact, the document or a module');
  // THE RATCHET. The audit left and this contract arrived, so the suite file
  // count is UNCHANGED — which is asserted against git rather than assumed from
  // the fact that a rename happened.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files');
  {
    const countAt = (sha) => git(['ls-tree', '-r', '--name-only', sha, 'tests/'])
      .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length;
    eq(countAt(BASE_SHA), countAt(SHIPPED_SHA),
      '…and the commit that shipped this layer carries the SAME count as the base, read out of '
      + 'git for both, because renaming the audit into this contract moves no files');
  }
  const RATCHETED = /^const TEST_FILE_COUNT = \d+;$/m;
  const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js') &&
      RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS files pin the suite file count');
  ok(contracts.every((f) => new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm')
    .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
  '…and every one of them pins the same value, this contract included');
  ok(contracts.indexOf(path.basename(CONTRACT_REL)) >= 0,
    '…this contract being one of them, so it ratchets itself rather than exempting itself');
  // THE BUDGET.
  // READ OUT OF THE REVISION THAT LAST CARRIED IT: `require` would throw now.
  const contractSpecAt = git(['show', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]);
  eq((contractSpecAt.match(/\n    \{ id: /g) || []).length, CONTRACT_SPEC_MUTANTS,
    'this contract\'s spec carried CONTRACT_SPEC_MUTANTS mutants, one per pin');
  ok(contractSpecAt.indexOf("target: '" + CONTRACT_REL + "'") >= 0,
    '…and it targeted this contract');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  // THE ARITHMETIC IS A FACT ABOUT THE COMMIT THAT SHIPPED THIS LAYER, read out
  // of git. Against the LIVE total it held only until the next cycle retired
  // this contract's spec and landed its own audit — the pattern is always the
  // same: a phase's arithmetic belongs to that phase's commit.
  eq(Number(git(['show', SPEC_RETIRED_FROM + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]),
  BASE_DECLARED_MUTANTS + CONTRACT_SPEC_MUTANTS - RETIRED_MUTANTS,
  '…and at the commit that shipped this layer the total was the base, LESS the audit spec '
  + 'that phase retired, PLUS this contract\'s own');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at MUTANT_BUDGET');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  // ABSENCE ALONE IS NOT A PIN.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the AUDIT\'s spec is retired, in Phase 2 as the rhythm runs');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely one that never existed');
  eq(RETIRED_SPEC_REL, AUDIT_SPEC_REL,
    'the retired path IS the audit\'s spec: the retirement is in phase order, and it is the '
    + 'outgoing CONTRACT\'s spec that went in Phase 1 instead');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + AUDIT_REL + "'") >= 0,
    '…and it is the audit that retired spec TARGETED, not merely a file that existed');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  ok(!fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)),
    '…and this contract\'s own spec is retired now too, by the next cycle\'s Phase 1');
  ok(layerSpecs.indexOf(path.basename(CONTRACT_SPEC_REL)) < 0,
    '…so it is not the one non-coverage spec that is committed');
  eq(git(['cat-file', '-e', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]), '',
    '…a path the commit that shipped this layer really carried, so its absence is a retirement');
}

console.log('\n' + pass + ' assertions passed.');
console.log('SWING_CHART_CACHE_EVALUATE_CONTRACT_OK');
}

main();
