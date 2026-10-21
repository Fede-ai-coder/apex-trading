'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// APEX PARITY COMPARE — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [1174787,1177179) in monolith coordinates — 2,392 units raw and
// 2,391 of body, ONE owner, synchronous — now lives in js/services/apex-parity-compare.js.
// `_apexCompareCandleArrays(frontCandles, backCandles, opts)` is the pure comparison at the
// heart of the backend-candle parity debug tool: it normalizes two candle arrays, takes the last
// `tail` (twenty by default) of each, pairs them by time and counts the pairs that agree within a
// tolerance, the ones that do not and the times present on one side only. It returns the counts, the
// four largest absolute differences and one record per mismatch. The block opened on the first of its
// TWO comment lines, which the cut took with it, directly under the closing brace of
// `_apexParityNormTimeframe`, which stayed behind, and the blank line AFTER the block, in front of the
// documentation of `_apexParityFrontendCandles`, stayed behind as the separator.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #524 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: ONE ROW STOOD ALONE AT THE BEST SCORE ────────────────
//
// The contract before this layer published two rows tied at (byConsumerSplit, raw nine) = (3, 5).
// One of them shipped. §4 reads that contract's own tables back out of it and shows that the other
// was THIS block, moved by the size of the cut that left; measured on the base that cut left, it was the
// only row at (3, 5) over the screen and the pass together, so the published key
// (byConsumerSplit, raw nine, units ascending) had no length tie-break to make. The next lowest raw
// nine at the best score was 8, three higher. §4 pins the row in full, counts no row below 3 over
// the two enumerations, and runs the key over every row.
//
// ── PART TWO: IT WAS A ROW OF THE SCREEN, AND THE CUT TOOK MORE THAN THE ROW ────
//
// From its declaration the block was 2,252 units, a row of the screen proper, so the pass over
// sub-floor runs held nothing for it. The cut was 2,391: it also took the two comment lines in
// front of the declaration, 139 units, which the screen never measures. §5 prices both and shows
// the cut was the one run this owner makes.
//
// ── PART THREE: TWO REFERENCES FROM TWO CONSUMERS, ONE DEPENDENCY, ONE MODULE ───
//
// The raw nine was 5. The two inbound references came from two consumers: the async
// `apexDebugCompareCandles` calls the function from its own body, and a top-level
// `if (typeof window !== 'undefined')` statement names it as a property of the object it assigns to
// `window.apexParityHelpers`. The block reads ONE monolith binding, `APEX_PARITY_TOL`, a `var`
// declared above it, only as the default of its `tol` and only when it runs; and it calls
// `_apexParityNormCandleArray` of the shipped js/services/candle-normalization.js twice, also only
// when it runs. It writes no monolith name, deletes nothing, touches the host through none of
// window, document, storage, console, timers or fetch, and uses the language's own `Date`, `Math`,
// `Number` and `Object`. The body is pure ASCII.
//
// ── PART FOUR: ONE OF THE TWO REFERENCES IS EVALUATED AS THE MONOLITH LOADS ─────
//
// That second reference is not inside any function body: it is a property value in an object
// literal that the top-level statement builds as the monolith evaluates, so the function must be
// defined by then. §3 runs that statement in a VM with the function omitted, where it throws
// ReferenceError for it, and with it defined, where it works; §9 runs it against the SHIPPED
// document's own script order, where the module is defined before the inline monolith and the
// statement works, and against the order with the module after the monolith, where it throws. The
// tag therefore stands BEFORE the inline monolith, and here the position is load-bearing and
// not a convention. The first reference is inside an async function body and runs only when the
// debug tool is called.
//
// ── PART FIVE: FIVE OPENINGS WERE LEGAL ─────────────────────────────────────────
//
// The seam rule admitted five line starts between the owner above and the declaration: the closing
// brace of `_apexParityNormTimeframe`, the blank line after it, the two comment lines and the
// declaration. Four of them parse as a program; the one on the brace does not. The cut took the
// documentation, so the join it left, the brace directly against the documentation of
// `_apexParityFrontendCandles` across one blank line, is a shape the monolith already held. §2
// counts it, and shows that cutting at the blank line instead would have fused that brace onto the
// documentation, a join the document held nowhere before the cut.
//
// ── PART SIX: IT IS OWNER 4 OF 14 IN THE PARITY TOOL'S REGION, AND TOOK NO BANNER ─
//
// The region opens on the `// ═` banner of the tool and holds fourteen owners; the block is the
// fourth. §5 prices EVERY owner above (three) and below (ten) as the cut extended to the end of
// that owner: of the three above, one ties on byConsumerSplit and is worse on the raw nine and two
// are worse on both; all ten below are worse on both, and the first of them is the function right
// after the cut, which holds no reference to the block. Five of the ten also run something at load.
// The cut took no banner, so the document's banners and regions did not move.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED ON THE SHIPPED MODULE ─────────────────
//
// §7 loads the SHIPPED MODULE in a VM with nothing defined, shows that it loads there and that calling it
// raises ReferenceError, then loads it beside the REAL normalizer module and the monolith's own
// `var APEX_PARITY_TOL` declaration and drives it: the empty and non-array inputs, identical and
// mismatching candles with the full shape of a mismatch, frozen input, the tolerance boundary and its
// default read at call time, zero and NaN tolerances, the tail window with its default, zero,
// negative and string values, the union of the two windows, the normalizer's shapes, ordering and
// duplicates. It pins two quirks without fixing them: a tail of zero compares everything, because
// `slice(-0)` is `slice(0)`, and a NaN tolerance makes even identical candles mismatch.
//
// ── PRICED, AND WHERE IT SITS ───────────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-five layers the chain now holds: it is the twentieth, with
// forty-five layers larger, so it is not the smallest: the smallest is 1,540 units. Its body is
// pure ASCII, so the pure-ASCII count DID move, by one; it does not open on a `// ── ` banner, so
// neither banner count moved; and it pins a NON-EMPTY monolith dependency list, so the count of
// layers that pin one DID move, by one. §8 measures all three.
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
const UNDO = require('./lib/apex-parity-compare-undo.js');
const SWING_TREND_CONTEXT_U = require('./lib/swing-trend-context-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/services/apex-parity-compare.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '3e65643';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '6c463df';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'bcd932e';
const BASE_CHARS = 1414221;
const BASE_UTF8 = 1442586;
const BASE_LF = 24431;
const BASE_SHA256 = '464dba5a0d8aecdb0d7ace6aa396874c3ce6e72b4ad59402d60669ad6ac6fdf8';
const LOCAL_SCRIPTS = 108;
const TEST_FILE_COUNT = 194;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-apex-parity-compare-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/apex-parity-compare-audit.spec.js';
const CONTRACT_REL = 'tests/apex-parity-compare-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/apex-parity-compare-contract.spec.js';
const UNDO_REL = 'tests/lib/apex-parity-compare-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'bcd932e';
const CONTRACT_SPEC_MUTANTS = 240;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 56;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/ai-scan-context-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 236;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/apex-parity-compare-audit.spec.js';
const RETIRED_MUTANTS = 230;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116567;
const CODE_CHARS = 1297628;
const TOP_LEVEL_DECLS = 882;
const OWNER_REGIONS = 114;

// ── The region ───────────────────────────────────────────────────────────────
// It opened on the first of two comment lines directly above the declaration. The blank line above them stayed
// behind; the blank line AFTER the block, in front of the comment block of the next function,
// was the structural separator.
const RAW_AT_IN_CODE = 1174787;
const DECL_AT_IN_CODE = 1174926;
const RAW_END_IN_CODE = 1177179;
const BODY_END_IN_CODE = 1177178;
const RAW_CHARS = 2392;
const BODY_CHARS = 2391;
const BODY_UTF8 = 2391;
const BODY_LF = 68;
const BODY_SHA256 = '07dd6a2ecd646975116af8ccd28feb8821f5b2f0aef02ba24d439d58f6d4ea86';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// Pure parity comparison over two raw candle arrays. Compares the last `tail`';
const DECL_FIRST_LINE = 'function _apexCompareCandleArrays(frontCandles, backCandles, opts) {';
const NON_ASCII_CHARS = 0;
const NEXT_DECL = '_apexParityFrontendCandles';
const NEXT_DOC_PREFIX = '// Read frontend candles from the EXISTING DXLink state only:';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_apexCompareCandleArrays'];
const OWNER_SIZES = [2251];
const OWNER = '_apexCompareCandleArrays';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 68;
const CODE_LINES = 60;
const COMMENT_LINES = 2;
const BLANK_LINES = 6;
const TOP_LEVEL_STATEMENT_LINES = 0;
// Where the two comment lines are: both document the function from above, none sits inside its body.
const BODY_COMMENT_LINES = 0;

// ── The boundary judgement: the openings the seam admits ─────────────────────
const OWNER_BEFORE = '_apexParityNormTimeframe';
const BRACE_OPENING = 1174784;
const BLANK_OPENING = 1174786;
const DOC_TAKEN = 139;
const DOC_TAKEN_LINES = 2;
const SEAM_LEGAL_OPENINGS = 5;
const PARSING_OPENINGS = 4;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 1174785;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 2252;
const CANDIDATES_AT_DECLARATION = 1;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut left behind: the closing brace of the owner above, one blank line, and the comment block of the
// next function, the join the monolith already held, once, at the end of the block; and what it removed: the join
// of that brace against this block's documentation. Taking the blank line as well would have fused the brace straight
// onto the next function's documentation.
const JOIN_AFTER_CUT = '}\n\n' + NEXT_DOC_PREFIX;
const JOIN_AS_BEFORE = '}\n\n// Pure parity comparison';
const FUSED_IF_BLANK_TAKEN = '}\n' + NEXT_DOC_PREFIX;
const JOINS_LIKE_THE_CUT_BEFORE = 192;

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 1173177;
const REGION_END = 1194541;
const REGION_CHARS = 21364;
const REGION_OWNERS = 14;
const OWNER_POSITION = 4;
const BANNER_LINE_PREFIX = '// ═';
const WHOLE_REGION_NINE = 84;
const WHOLE_REGION_BCS = 41;
const WHOLE_REGION_CONSUMERS = 13;
const WHOLE_REGION_DEPS = 17;
const WHOLE_REGION_SIB = 10;
// THE CUT TOOK NO BANNER, so the document's top-level banners and owner regions did not move.
const BANNER_MARKS = 215;

// ── Taking more, priced: the owners above; the owners below ──────────────────
// Above: THREE owners stand above the cut in its region. Each row is the cut extended UP to
// the start of that owner's documentation: [name, opening, units, raw nine, byConsumerSplit,
// monolith dependencies, runs nothing at load].
const EXTENSIONS_UP = [
  ['_apexParityNormTimeframe', 1174444, 2734, 8, 4, 1, true],
  ['_apexParityNormSymbol', 1174341, 2837, 11, 4, 1, true],
  ['APEX_PARITY_TOL', 1173177, 4001, 10, 3, 0, true],
];
const OWNERS_ABOVE = 3;
// Below: TEN owners stay in the region and are pinned in full, as
// [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['_apexParityFrontendCandles', 1178544, 3757, 12, 8, 5],
  ['_apexParityWarmupTimeframes', 1178768, 3981, 14, 9, 5],
  ['_apexParityWarmupBackend', 1180001, 5214, 17, 9, 6],
  ['_apexParityFetchBackend', 1180440, 5653, 20, 9, 6],
  ['apexDebugCompareCandles', 1184168, 9381, 21, 9, 7],
  ['_ensureCandleSubscription', 1188539, 13752, 49, 29, 17],
  ['_ensure30MSubscription', 1191270, 16483, 73, 33, 17],
  ['_getIntradayTech', 1192525, 17738, 76, 36, 18],
  ['_getTechForTF', 1192920, 18133, 85, 40, 18],
  ['_scheduleSnapshotTechRetry', 1194540, 19753, 87, 44, 20],
];
const OWNERS_BELOW = 10;
const UP_LEGAL = 3;
const UP_TIES = 0;
const UP_TIES_BCS = 1;
const UP_WORSE = 2;
const UP_NOT_CLEAN = 0;
const DOWN_LEGAL = 10;
const DOWN_REFUSED = 0;
const DOWN_WORSE = 10;
const DOWN_TIES_BCS = 0;
const DOWN_NOT_CLEAN = 5;
// THE ONE RUN the owner made, which is the cut itself:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['_apexCompareCandleArrays', '_apexCompareCandleArrays', 1174787, 1177178, 2391, 5, 3, ['APEX_PARITY_TOL'], 2],
];
const OWN_RUNS_LEGAL = 1;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 0;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 5;
const BY_CONSUMER = 5;
const BY_CONSUMER_SPLIT = 3;
const CONSUMERS = ['(TOP LEVEL)', 'apexDebugCompareCandles'];
const CONSUMER_SITES = 2;
const CONSUMER_SITES_AT = [1183687, 1184631];
// What each of the two sites is: [site, the text written there]. The first is a CALL inside a function body;
// the second is a PROPERTY of an object literal in a top-level `if` statement, which the monolith evaluates as it loads.
const SITE_TEXTS = [
  [1183687, '_apexCompareCandleArrays(frontNorm, backNorm, { tail: tail })'],
  [1184631, '_apexCompareCandleArrays,'],
];
const CALL_SITE_AT = 1183687;
const LOAD_SITE_AT = 1184631;
// The declared consumer that holds the call.
const CONSUMER_DECLS = [
  ['apexDebugCompareCandles', 1180576, 1184166, 3591],
];
const MONOLITH_DEPENDENCIES = ['APEX_PARITY_TOL'];
// [name, start, end, chars, form] of each monolith dependency.
const DEPENDENCY_DECLS = [
  ['APEX_PARITY_TOL', 1174271, 1174299, 29],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 2;
const OUTBOUND_MODULE_REFERENCES = 2;
const OUTBOUND_MODULE = 'js/services/candle-normalization.js';
const OUTBOUND_MODULE_NAME = '_apexParityNormCandleArray';
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 2;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_apexCompareCandleArrays'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7074;
const SEAM_REJECTED = 2077;
const CANDIDATES = 2749;
const CLEAN_CANDIDATES = 1645;
const SCORE_TWO_OR_BELOW = 0;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor.
const HIDDEN_ROWS = 31;
const HIDDEN_CLEAN_ROWS = 30;
const HIDDEN_SCORE_TWO_OR_BELOW = 0;
// THE ROWS AT THE BEST SCORE, 3, over the screen and the pass together.
const ROWS_AT_THREE = 5;
const ROWS_AT_THREE_SCREEN = 5;
const ROWS_AT_THREE_HIDDEN = 0;
const LOWEST_NINE_AT_THREE = 5;
// THE ONE ROW AT (byConsumerSplit, raw nine) = (3, 5), pinned in full, in the SCREEN's coordinates, which open at the
// declaration: [opening, closing, units, consumers, monolith dependencies].
const ALONE_AT_BEST = [
  [1174926, 1177178, 2252, 2, 1],
];
// The best four OTHER openings over the screen and the hidden pass together,
// as [opening, byConsumerSplit, raw nine, units], by the published key.
const RUNNERS_UP = [
  [388872, 3, 8, 1614],
  [1178769, 3, 8, 1671],
  [1178625, 3, 8, 1815],
  [565695, 4, 4, 1582],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
// They are NEGATIVE, because that cut took no banner and its region lost two owners, and a region of fewer
// owners makes fewer runs.
const DELTA_RAW_RUNS = -21;
const DELTA_SEAM_REJECTED = -4;
const DELTA_CANDIDATES = -11;
const DELTA_CLEAN = -11;
const PREVIOUS_RAW_CHARS = 1541;
const PREVIOUS_RAW_AT = 628563;
// The previous contract's published list, in the coordinates of the document BEFORE the cut that
// shipped, which sat above this block.
const PREVIOUS_RUNNERS_UP = [
  [1176467, 3, 5, 2252],
  [388872, 3, 8, 1614],
  [1180310, 3, 8, 1671],
  [1180166, 3, 8, 1815],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. SMALLEST_LAYER_CHARS is the smallest layer of the chain, and is not this one.
const CHAIN_LENGTH = 65;
const SMALLEST_LAYER_CHARS = 1540;
const SIZE_RANK = 20;
const LAYERS_SMALLER_THAN_THIS_CUT = 19;
const LAYERS_LARGER_THAN_THIS_CUT = 45;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 9;
const PRIOR_LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_BANNER = 26;
const PRIOR_LAYERS_OPENING_ON_WIDE_BANNER = 29;
const LAYERS_OPENING_ON_WIDE_BANNER = 29;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 27;
const LAYERS_WITH_A_DEPENDENCY = 28;
// The count above is the figure AT THIS LAYER. The later layer that pins a NON-EMPTY list
// instead IS among the contracts counted over the suite, and is set aside to recover the
// figure at this layer rather than left to make it drift.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['swing-trend-context-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 2331;
const INDEX_AFTER = 1411890;
const RESIDUAL_MONOLITH = 1295236;
const LOCAL_SCRIPTS_AFTER = 109;
// The tag's position among the local scripts, zero-based: the last of 109.
const TAG_LOCAL_INDEX = 108;
// The top-level statement that holds the load-time site, and the names it reads as the monolith evaluates.
const LOAD_STMT_AT = 1184235;
const LOAD_STMT_NAMES = [
  'ffBackendCandleParityDebug', '_apexParityNormSymbol', '_apexParityNormTimeframe', '_apexParityNormTime', '_apexParityNormCandle',
  '_apexParityNormCandleArray', '_apexCompareCandleArrays', '_apexParityFrontendCandles', '_apexParityWarmupTimeframes',
];
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


console.log('APEX PARITY COMPARE — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const LIVE_INDEX = SWING_TREND_CONTEXT_U.isApplied(HEAD_INDEX)
  ? SWING_TREND_CONTEXT_U.undoSwingTrendContext(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/swing-trend-context.js'), 'utf8'))
  : HEAD_INDEX;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoApexParityCompare(LIVE_INDEX, MODULE);

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

const REC = profileOf([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
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
// not only the first. The shipped scan above is kept so this contract can measure
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the AI scan context
// builders predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the five openings the seam admits');
// ─────────────────────────────────────────────────────────────────────────────
eq(RAW_END_IN_CODE - RAW_AT_IN_CODE, RAW_CHARS, 'the raw fragment is RAW_CHARS units');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE, BODY_CHARS, '…BODY_CHARS of which are body');
eq(RAW_CHARS - BODY_CHARS, 1, '…the difference being the one structural separator');
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single LF, the blank line between the block and the documentation of ' + NEXT_DECL);
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest');
ok(BODY.endsWith(BODY_ENDING), '…ending on a real line of code');
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the first line of its documentation');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII characters: the body is PURE ASCII, so its UTF-8 and UTF-16 lengths are the same number…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 0, '…with no gap between them to pin');
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
    '…its own comment block beginning exactly where the cut ends, so the cut ended where that documentation begins and took none of it…');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DOC_PREFIX.length), NEXT_DOC_PREFIX,
    '…its first characters being NEXT_DOC_PREFIX');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits five openings.
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
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…the next the first comment line, the cut…');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES comment lines are each an opening of their own…');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last being the declaration');
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the five…');
  ok(OPENINGS.filter((at) => at !== BLANK_OPENING).every((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() !== ''),
    '…every other opening being a line with something on it');
  eq(CODE[BRACE_OPENING], '}', 'the opening before it is the brace itself…');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    '…and the position between the brace and the blank line starts mid-line and is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the five are even candidates, counted rather than listed');
}

// WHAT THE CUT TOOK is the whole comment block above the function and nothing else: two comment lines directly
// above the declaration, with the blank line above THEM left behind.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the comment block taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut took prose and no code');
  ok(!/^\/\/ ─{2,}/m.test(doc) && !/^\/\/ ═{2,}/m.test(doc), '…none of them a banner of either kind, so the cut took no section heading with it');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNER)).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  const fn = BY_NAME.get(OWNER);
  const commentsIn = (text) => text.split('\n').filter((l) => l.trim().startsWith('//')).length;
  eq(commentsIn(CODE.slice(fn.start, fn.end + 1)), BODY_COMMENT_LINES, 'the function holds BODY_COMMENT_LINES comment lines inside its body…');
  eq(DOC_TAKEN_LINES + BODY_COMMENT_LINES, COMMENT_LINES, '…so the block\'s COMMENT_LINES are the two at the top and none inside');
  ok(doc.indexOf('Pure parity comparison') >= 0 && doc.indexOf('Compares the last `tail`') >= 0,
    '…and the block promises a PURE comparison of the last `tail` candles, a claim §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the documentation is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE COMMENT BLOCK WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would have left the two comment lines directly above the comment block of ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would have fused the brace of the owner above straight onto the documentation of ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith held nowhere before the cut, once there');
}
// WHAT THE CUT LEFT. The brace of the owner above, one blank line, then the next function's documentation: the very
// join the monolith held at the END of the block, so the cut moved it and the document gained no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith held the join `}` blank line `' + NEXT_DOC_PREFIX + '` once before the cut, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the function…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of the documentation was held once before the cut, and is gone after it…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the documentation leaving with the block');
  eq(count(CODE, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE, 'and a brace, a blank line and a comment is a shape the document holds JOINS_LIKE_THE_CUT_BEFORE times…');
  eq(count(atCut, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE - 1, '…one fewer after the cut, which removes the join in front of the documentation and keeps the other');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this comment block or declaration is left behind');
}
// THE SCREEN MEASURES THIS RUN FROM ITS DECLARATION, and holds it there: the run clears the floor without its documentation, so the
// pass over runs the screen skipped for being short has nothing to re-measure.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION >= RUN_FLOOR, '…at or over RUN_FLOOR, so the screen enumerates it without help from the pass over sub-floor runs…');
eq(DECL_UNITS_FROM_DECLARATION - RUN_FLOOR, 752, '…by 752 units…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the screen enumerates CANDIDATES_AT_DECLARATION run that opens at the declaration and ends where this cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that open where the cut does, two lines higher: the screen never measures a run from its documentation…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, HIDDEN_ROWS_AT_CUT,
  '…and the pass over sub-floor runs holds HIDDEN_ROWS_AT_CUT rows for it, because it only keeps runs that were SHORT from the declaration');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE - DECL_UNITS_FROM_DECLARATION, DOC_TAKEN,
  '…the cut being the screen\'s row plus exactly the DOC_TAKEN units of documentation above it');
// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one function, two references from two consumers, one dependency and one module read at call time');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this one name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a declared function, so this layer ships no mutable binding');
  ok(own.every((d) => !d.isAsync), '…SYNCHRONOUS');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, 1 + 6,
    '…holding six function expressions inside it besides itself, the callbacks of its five `forEach` calls and its one `sort`, all anonymous and all called synchronously by the array methods (its `map(Number)` takes a built-in)…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the one owner');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one, among them the reference from a shipped module: no module names the function');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from the monolith outside the block…');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: ONE monolith binding, APEX_PARITY_TOL');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: two inbound references, one dependency and two references to a shipped module');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer, which counts the module references too, is BY_CONSUMER: two consumers, one dependency and two module references…');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'TWO consumers reach in from the monolith: CONSUMERS, one of them the monolith\'s own top level');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const outside = (at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE;
  eq(refSites(MASKED, OWNER).filter(outside), CONSUMER_SITES_AT, 'both of those references are to ' + OWNER + '…');
  eq(refSites(STRINGS, OWNER).filter(outside).length, 0,
    '…and the name appears in no string or generated markup outside the block');
  eq(count(STATIC_MARKUP, OWNER), 0, '…nor in the static markup, so no inline handler names it');
  eq(SIB_REFS.get(OWNER), { n: 0, who: [] }, '…and no shipped module names it, so the chain of layers already extracted does not reach the block');
  // WHAT EACH OF THE TWO SITES IS, as written.
  eq(SITE_TEXTS.map(([at]) => at), CONSUMER_SITES_AT, 'SITE_TEXTS pins the same two sites…');
  eq(SITE_TEXTS.map(([at, text]) => CODE.slice(at, at + text.length)), SITE_TEXTS.map(([, text]) => text),
    '…each exactly the text written there');
  eq(CODE.slice(CALL_SITE_AT).match(/^_apexCompareCandleArrays\([^;]*\);/)[0], SITE_TEXTS[0][1] + ';',
    '…the first a CALL, matched through its closing parenthesis and the semicolon that ends its statement, so the pinned text is not a prefix of a longer one: two candle arrays and an options object holding only the tail…');
  eq(CODE.slice(LOAD_SITE_AT).match(/^_apexCompareCandleArrays,\n/)[0], SITE_TEXTS[1][1] + '\n',
    '…the second a PROPERTY VALUE in an object literal, `compareCandleArrays: _apexCompareCandleArrays,`, not a call');
  eq(CODE.slice(LOAD_SITE_AT - 'compareCandleArrays: '.length, LOAD_SITE_AT), 'compareCandleArrays: ', '…under the key `compareCandleArrays`');
}
// WHERE EACH SITE IS: the call is inside a function body; the other is NOT.
{
  const innermost = (at) => FN_BODIES.filter((r) => at >= r.start && at <= r.end).sort((a, b) => b.start - a.start)[0];
  const body = innermost(CALL_SITE_AT);
  const host = BY_NAME.get('apexDebugCompareCandles');
  ok(body && body.start >= host.start && body.end <= host.end, 'the call is inside a function body of apexDebugCompareCandles…');
  eq((hostOf(CALL_SITE_AT) || {}).name, 'apexDebugCompareCandles', '…its host');
  eq(CONSUMER_DECLS.map(([name]) => name), ['apexDebugCompareCandles'], 'the one declared consumer is CONSUMER_DECLS…');
  for (const [name, start, end, chars] of CONSUMER_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function opening at ' + start + ', ' + chars + ' units long');
    ok(d.start > RAW_END_IN_CODE, '…outside the block, BELOW it');
    ok(d.isAsync === true, '…an ASYNC function, which calls the pure comparison from its own body once it has fetched both sides');
  }
  ok(insideFunction(CALL_SITE_AT), '…so the call is not a statement the monolith evaluates as it loads');
  eq(insideFunction(LOAD_SITE_AT), false,
    'while the SECOND site is in NO function body at all: it is evaluated as the monolith loads, a read of the binding at LOAD time…');
  eq((hostOf(LOAD_SITE_AT) || { name: '(TOP LEVEL)' }).name, '(TOP LEVEL)', '…which is why the screen files it under the top level');
  const stmtAt = CODE.lastIndexOf("if (typeof window !== 'undefined') {", LOAD_SITE_AT);
  eq(stmtAt, LOAD_STMT_AT, '…inside the top-level `if (typeof window !== \'undefined\')` statement that opens at LOAD_STMT_AT…');
  eq(CODE.slice(LOAD_STMT_AT, LOAD_STMT_AT + 200).split('\n')[1], '  window.apexDebugCompareCandles = apexDebugCompareCandles;', '…whose first assignment exposes the debug entry point on `window`…');
  ok(CODE.slice(LOAD_STMT_AT, LOAD_SITE_AT).indexOf('window.apexParityHelpers = {') > 0, '…and whose second builds the `apexParityHelpers` object that holds this site');
  // THE LOAD-TIME READ, MEASURED: run that statement in a VM. Without the function defined it throws; with it defined it works.
  const stmtEnd = CODE.indexOf('\n}\n', LOAD_SITE_AT) + 3;
  const stmt = CODE.slice(LOAD_STMT_AT, stmtEnd);
  const names = Array.from(new Set((stmt.match(/:\s*([A-Za-z_$][\w$]*),?\s*$/gm) || []).map((m) => m.replace(/^:\s*/, '').replace(/[,\s]+$/, ''))));
  eq(names.length, LOAD_STMT_NAMES.length, 'the statement reads LOAD_STMT_NAMES.length names as it evaluates, every property value of the object…');
  eq(names.slice().sort(), LOAD_STMT_NAMES.slice().sort(), '…LOAD_STMT_NAMES, one of them ' + OWNER);
  const withAll = (omit) => {
    const ctx = vm.createContext({ window: {} });
    for (const n of LOAD_STMT_NAMES.concat(['apexDebugCompareCandles'])) if (n !== omit) vm.runInContext('var ' + n + ' = function ' + n + '() {};', ctx);
    return ctx;
  };
  const err = (ctx) => { try { vm.runInContext(stmt, ctx); return null; } catch (e) { return e.name + ': ' + e.message; } };
  eq(err(withAll(OWNER)), 'ReferenceError: ' + OWNER + ' is not defined',
    'with every other name defined and ' + OWNER + ' MISSING, the statement throws ReferenceError as it evaluates — so now that the function has left the monolith, the script that defines it has to load BEFORE the inline monolith, and the tag position is load-bearing here…');
  eq(err(withAll(null)), null, '…and with all of them defined it runs clean');
  {
    const ok2 = withAll(null);
    vm.runInContext(stmt, ok2);
    eq(vm.runInContext('window.apexParityHelpers.compareCandleArrays === ' + OWNER, ok2), true, '…the helper object then holding the function itself, by identity');
  }
  eq(err(withAll('_apexParityNormTime')), 'ReferenceError: _apexParityNormTime is not defined',
    'control — omitting a DIFFERENT name from the same statement throws for that name, so the failure above is the function\'s own absence and not any omission');
}
// THE DEPENDENCY, with its declaration, where the block reads it, and a CONTROL.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  for (const [name, start, end, chars] of DEPENDENCY_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'var'],
      name + ' is a top-level `var` opening at ' + start + ', ' + chars + ' units long: a global binding the monolith assigns as it evaluates, `var ' + name + ' = 0.0001;`');
    ok(d.end < RAW_AT_IN_CODE, '…declared ABOVE the block, ' + (RAW_AT_IN_CODE - d.end) + ' units above it');
  }
  eq(CODE.slice(DEPENDENCY_DECLS[0][1], DEPENDENCY_DECLS[0][2] + 1), 'var APEX_PARITY_TOL = 0.0001;', '…`var APEX_PARITY_TOL = 0.0001;`, a numeric tolerance');
  const useSites = refSites(bodyMasked, 'APEX_PARITY_TOL');
  eq(useSites.length, 1, 'the block names APEX_PARITY_TOL at ONE place…');
  ok(useSites.every((p) => FN_BODIES.some((r) => p + RAW_AT_IN_CODE >= r.start && p + RAW_AT_IN_CODE <= r.end)),
    '…inside the function body, so the dependency is read when the function runs and not as the block is evaluated…');
  eq(bodyMasked.slice(useSites[0] - 'var tol = opts.tol != null ? opts.tol : '.length, useSites[0] + 'APEX_PARITY_TOL'.length), 'var tol = opts.tol != null ? opts.tol : APEX_PARITY_TOL',
    '…as the DEFAULT of `tol`, read only when the caller passes no tolerance of its own: `var tol = opts.tol != null ? opts.tol : APEX_PARITY_TOL`');
  ok(!/\bAPEX_PARITY_TOL\s*(=(?!=)|\+\+|--|\+=|-=)/.test(bodyMasked), '…and never as the target of an assignment');
  eq(refSites(MASKED, 'APEX_PARITY_TOL').filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, 1,
    'control — APEX_PARITY_TOL is named exactly once elsewhere in the monolith, its own declaration, so the count of 1 above is the block\'s own and not every mention in the file');
  const wider = EXTENSIONS_DOWN[0];
  eq(profileOf([RAW_AT_IN_CODE, wider[1]]).deps.length, wider[5],
    'control — the same profile finds ' + wider[5] + ' dependencies on the cut widened to include ' + wider[0] + ', so the single one above is a measurement');
}
// THE MODULE IT CALLS: two references to a function of a SHIPPED module, both inside the function body.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  const at = refSites(bodyMasked, OUTBOUND_MODULE_NAME);
  eq(at.length, OUTBOUND_MODULE_REFERENCES, 'the block names ' + OUTBOUND_MODULE_NAME + ' ' + OUTBOUND_MODULE_REFERENCES + ' times…');
  ok(at.every((p) => /^\s*\(/.test(bodyMasked.slice(p + OUTBOUND_MODULE_NAME.length))), '…both as a CALL, one for each candle array…');
  eq(MODULE_OWNERS.get(OUTBOUND_MODULE_NAME), OUTBOUND_MODULE, '…a function declared in ' + OUTBOUND_MODULE + '…');
  ok(LOCALS.indexOf(OUTBOUND_MODULE) >= 0, '…one of the local scripts loaded BEFORE the inline monolith, so it is already defined when the function runs and the move changes nothing about it');
  eq(BY_NAME.get(OUTBOUND_MODULE_NAME), undefined, '…and not declared in the monolith');
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
  eq((bodyMasked.match(/\bnew\s+\w+/g) || []), ['new Date'], '…`new` once, `new Date`, the language\'s own constructor…');
  eq((bodyMasked.match(/\b(Math|Object|Number|Date)\b/g) || []).sort(), ['Date', 'Math', 'Math', 'Math', 'Math', 'Math', 'Math', 'Math', 'Math', 'Number', 'Object'],
    '…and the intrinsics `Math`, `Object`, `Number` and `Date` named eleven times in all, `Math` eight of them, four `abs` and four `max`, which any context supplies and which are not the monolith\'s…');
  eq((bodyMasked.match(/\b(globalThis|self|window|document|localStorage|console|setTimeout|setInterval|fetch)\b/g) || []).length, 0,
    '…and no window, document, storage, console, timer or fetch');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all, comments included');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND…');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND references to a foundation module, the two calls above, which byConsumerSplit leaves out because the module is not part of the chain…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…so byConsumerSplit is BY_CONSUMER_SPLIT: two consumers and one dependency');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means.
{
  const INHERITED_SCAN_FALSE_HITS = ['backByTime', 'backByTime', 'matched', 'mismatched', 'missingFrontend', 'missingBackend', 'maxH', 'maxL', 'maxC',
    'dH', 'dL', 'dC', 'maxH', 'maxL', 'maxC', 'matched', 'mismatched', 'missingBackend', 'missingFrontend'];
  eq(nonLocalAssignmentsUncorrected(BODY), INHERITED_SCAN_FALSE_HITS,
    'the inherited scan reports ' + INHERITED_SCAN_FALSE_HITS.length + ' names as assigned that the block does not own, and not one is foreign: each is a later declarator of a `var` list, or a write to one, which that scan reads as a global…');
  ok(INHERITED_SCAN_FALSE_HITS.every((n) => declaredNamesIn(BODY).has(n)), '…every one of them a name the block DECLARES with `var`, which the corrected scan below knows…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan, which counts every declarator of a list as local, finds NON_LOCAL_ASSIGNMENTS: the block assigns only its own locals and its `opts` parameter');
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { APEX_PARITY_TOL = 1; }'), ['APEX_PARITY_TOL'],
    'control — a write to the dependency the block reads is found: the zero above is not blind to the one name that matters here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}
// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: one row stood alone at (3, 5), and the tie the last contract recorded was gone');
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
  ok(PREVIOUS_RAW_AT < DECL_AT_IN_CODE,
    '…and it sat entirely BEFORE this block, so everything this contract measures after it moved down by exactly that many units and everything before it did not, as read from the rows below');
  const moved = (at) => (at >= PREVIOUS_RAW_AT ? at - PREVIOUS_RAW_CHARS : at);
  // THE TIE THE PREVIOUS AUDIT FOUND, and what became of it.
  const tied = listOf('TIED_AT_BEST');
  eq(tied.length, 2, 'the previous contract recorded TWO rows at the best score and the lowest raw nine…');
  eq([moved(tied[1][0]), moved(tied[1][1]), tied[1][2], tied[1][3], tied[1][4]], ALONE_AT_BEST[0],
    '…the second of them being THIS block, moved by that rule to where it stands now: the row it tied with is the block that shipped, and it is gone from the document…');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, '…and the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq([moved(listed[0][0]), listed[0][1], listed[0][2], listed[0][3]], [DECL_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, DECL_UNITS_FROM_DECLARATION],
    '…the FIRST of them being THIS block, moved by the same rule, with the same byConsumerSplit and raw nine and the same length from its declaration: it sat after the cut that shipped, so only its position changed…');
  eq(listed.slice(1).map((r) => [moved(r[0]), r[1], r[2], r[3]]), RUNNERS_UP.slice(0, 3),
    '…and the other three, moved by the same rule, are exactly this contract\'s first three runners-up');
  ok(listed.some((r) => r[0] < PREVIOUS_RAW_AT) && listed.some((r) => r[0] >= PREVIOUS_RAW_AT),
    '…the rule having moved some of them and left others where they were, both cases present among the four');
  ok(!listed.some((r) => moved(r[0]) === RUNNERS_UP[3][0]),
    '…the fourth of this contract\'s runners-up being a row the previous contract did not list');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= BY_CONSUMER_SPLIT - 1).length, SCORE_TWO_OR_BELOW,
    'the shipped screen counts SCORE_TWO_OR_BELOW clean candidates at 2 or below…');
  eq(hiddenRows.length, HIDDEN_ROWS, 'the pass over runs the screen skipped for being short has HIDDEN_ROWS rows…');
  const hiddenClean = hiddenRows.filter((c) => runsNothingAtLoad(c.load));
  eq(hiddenClean.length, HIDDEN_CLEAN_ROWS, '…HIDDEN_CLEAN_ROWS of which run nothing at load');
  ok(hiddenRows.every((c) => c.unitsDecl < RUN_FLOOR && c.unitsDoc >= RUN_FLOOR),
    '…every one below RUN_FLOOR from its declaration and at or above it from its documentation');
  ok(hiddenRows.every((c) => !candidateRuns.some((s) => s.lo === c.lo && s.hi === c.hi)),
    '…and not one of them is a row the shipped screen already has');
  eq(hiddenClean.filter((c) => c.bcs <= BY_CONSUMER_SPLIT - 1).length, HIDDEN_SCORE_TWO_OR_BELOW,
    'HIDDEN_SCORE_TWO_OR_BELOW of them score 2 or below on byConsumerSplit: neither enumeration holds a row below 3…');
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units, c }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc, c, hidden: true })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    '…so in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit, which is the best score there is…');
  const atBest = rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT);
  eq(atBest.length, ROWS_AT_THREE, 'and BY_CONSUMER_SPLIT is held by ROWS_AT_THREE rows over the two enumerations…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_SCREEN,
    '…ROWS_AT_THREE_SCREEN of them in the shipped screen…');
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_HIDDEN, '…and ROWS_AT_THREE_HIDDEN in the pass over sub-floor runs, so this tier is the screen\'s own…');
  eq(Math.min.apply(null, atBest.map((r) => r.nine)), LOWEST_NINE_AT_THREE,
    '…the lowest raw nine among them being LOWEST_NINE_AT_THREE, which is this block\'s FULL_NINE: nothing at the best score has a lower one…');
  // THE ROW AT THE BEST SCORE AND THE LOWEST RAW NINE, pinned in full: it is ALONE.
  const aloneRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const alone = aloneRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(alone, ALONE_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE) are exactly ALONE_AT_BEST: ONE row, this block, so there is no tie for length to decide…');
  ok(aloneRows[0].hidden !== true, '…that row one of the SCREEN\'s own, not of the pass\'s, and measured from the declaration, not from the documentation the cut also takes…');
  eq(aloneRows[0].c.p.names, OWNERS_EXPECTED, '…its one owner being this block\'s…');
  const nextNine = Math.min.apply(null, atBest.filter((r) => r.nine > LOWEST_NINE_AT_THREE).map((r) => r.nine));
  eq(nextNine, LOWEST_NINE_AT_THREE + 3, 'the next lowest raw nine at the best score is THREE higher, LOWEST_NINE_AT_THREE + 3: the margin is wide, and it is a real one, not a tie-break…');
  eq(atBest.filter((r) => r.nine === nextNine).length, 3, '…held by three rows, which are the first three runners-up below');
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
  eq(rankedAll.slice(0, 2).map((r) => [r.lo, r.bcs, r.nine, r.units]), [[DECL_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, DECL_UNITS_FROM_DECLARATION], RUNNERS_UP[0]],
    'the published key puts this block FIRST over every row, and the first runner-up second…');
  // WHAT IS PUBLISHED FOR THE NEXT CYCLE, over the screen and the hidden pass
  // together, skipping anything that overlaps the cut.
  const overlaps = (lo, hi) => lo < RAW_END_IN_CODE && hi > RAW_AT_IN_CODE;
  const pool = rows.filter((r) => !overlaps(r.lo, r.hi));
  const bestPer = new Map();
  for (const r of pool) {
    const b = bestPer.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPer.set(r.lo, r);
  }
  const ranked = [...bestPer.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units)
    .slice(0, RUNNERS_UP.length).map((r) => [r.lo, r.bcs, r.nine, r.units]);
  eq(ranked, RUNNERS_UP,
    '…and with this block\'s own rows set aside, the four best other openings, by (byConsumerSplit, nine, units), are exactly RUNNERS_UP');
  ok(ranked.slice(0, 3).every((r) => r[1] === BY_CONSUMER_SPLIT) && ranked.slice(0, 3).every((r) => r[2] > FULL_NINE),
    '…the first three at ' + BY_CONSUMER_SPLIT + ', the same score, with a WORSE raw nine than this block\'s, and the fourth one step behind on byConsumerSplit with a LOWER raw nine');
  eq(ranked[3].slice(1, 3), [BY_CONSUMER_SPLIT + 1, 4], '…which is the ordering the key means by putting byConsumerSplit first');
}
// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: every owner above, every owner below, the one run, and the banner it leaves alone');
// ───────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const OWNERS_UP = REGION_OWNER_LIST.slice(0, OWNER_POSITION - 1).reverse();
const OWNERS_DOWN = REGION_OWNER_LIST.slice(OWNER_POSITION - 1 + OWNER_COUNT);
const upStart = (d) => (blockAbove(d) || { start: d.start }).start;
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
const priceUp = (d) => {
  const lo = upStart(d);
  const p = profileOf([lo, BODY_END_IN_CODE]);
  const l = loadTimeProfile(lo, BODY_END_IN_CODE);
  let seam = null; try { seam = assertSeam(CODE, lo, BODY_END_IN_CODE); } catch (e) { seam = null; }
  return { lo, p, bcs: byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), clean: runsNothingAtLoad(l), seam };
};
const priceDown = (d) => {
  const hb = downEnd(d);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  const l = loadTimeProfile(RAW_AT_IN_CODE, hb);
  let seam = null, refusal = null; try { seam = assertSeam(CODE, RAW_AT_IN_CODE, hb); } catch (e) { seam = null; refusal = e.message; }
  return { hb, p, bcs: byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), clean: runsNothingAtLoad(l), seam, refusal };
};
eq(REGION_OWNER_LIST.findIndex((d) => d.name === OWNER) + 1, OWNER_POSITION, 'the cut starts at owner number OWNER_POSITION of its region…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and takes the next OWNER_COUNT, which is its one');
eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…of REGION_OWNERS in the region');
// EVERY OWNER ABOVE IT IN THE REGION. Each is priced as the cut extended UP to the start of that owner's documentation.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut…');
{
  const priced = OWNERS_UP.map((d) => Object.assign({ name: d.name }, priceUp(d)));
  eq(priced.filter((r) => r.seam !== null).length, UP_LEGAL, '…UP_LEGAL of the extensions at real seams, all of them…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine === FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES,
    '…UP_TIES of them TYING the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, UP_WORSE,
    '…UP_WORSE worse than the cut on BOTH the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES_BCS,
    '…and UP_TIES_BCS tying it on byConsumerSplit while worse on the raw nine, so no extension upward is better than the cut or as good on both…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…and not one better on either measure');
  eq(priced.filter((r) => !r.clean).length, UP_NOT_CLEAN, '…UP_NOT_CLEAN of them also running something at load…');
  eq(priced.map((r) => [r.name, r.lo, BODY_END_IN_CODE - r.lo, r.p.nine, r.bcs, r.p.deps.length, r.clean]),
    EXTENSIONS_UP, 'all three are exactly EXTENSIONS_UP, pinned in full');
  ok(EXTENSIONS_UP.every((e) => e[2] === BODY_END_IN_CODE - e[1]), '…each pinned opening agreeing with its pinned length');
  ok(priced[0].name === OWNER_BEFORE && priced[0].lo === upStart(BY_NAME.get(OWNER_BEFORE)),
    '…the first of them OWNER_BEFORE, opening at the start of its own documentation');
  eq(candidateRuns.filter((c) => c.lo === BY_NAME.get(OWNER_BEFORE).start && c.hi === BODY_END_IN_CODE).map((c) => c.units),
    [BODY_END_IN_CODE - BY_NAME.get(OWNER_BEFORE).start],
    '…while the shipped screen\'s own row for that pair opens at OWNER_BEFORE\'s declaration, a documentation-exclusive opening, and is shorter than the extension priced here');
  const tolRow = priced[priced.length - 1];
  eq([tolRow.name, tolRow.p.deps.length, tolRow.bcs], ['APEX_PARITY_TOL', 0, BY_CONSUMER_SPLIT],
    '…the last of them APEX_PARITY_TOL, the dependency itself: taking it removes the dependency from the count and ties the cut on byConsumerSplit, yet its raw nine is WORSE for the references to it that come with it');
}
// EVERY OWNER BELOW IT IN THE REGION. Each is priced as the cut extended down to the end of that owner.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the block…');
{
  const priced = OWNERS_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL of the ends at real seams, all of them…');
  eq(priced.filter((r) => r.seam === null).length, DOWN_REFUSED,
    '…and DOWN_REFUSED of them REFUSED by the seam rule…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, DOWN_TIES_BCS,
    '…and DOWN_TIES_BCS of them tying it on byConsumerSplit while worse on the raw nine, so none is better and none is as good on both…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…not one better on either measure, the refused ones priced all the same…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load');
  eq(priced.map((r) => [r.name, r.hb, r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length]),
    EXTENSIONS_DOWN, 'all ten are exactly EXTENSIONS_DOWN, pinned in full');
  ok(EXTENSIONS_DOWN.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…each pinned closing agreeing with its pinned length');
  eq(priced[0].name, NEXT_DECL, '…the first of them the function right after the cut, which holds no reference to the block: extending down to it takes a neighbour along and nothing it needs');
  eq(priced.filter((r) => !r.clean).map((r) => r.name), ['_ensureCandleSubscription', '_ensure30MSubscription', '_getIntradayTech', '_getTechForTF', '_scheduleSnapshotTechRetry'].slice(0, DOWN_NOT_CLEAN),
    '…and the DOWN_NOT_CLEAN that also run something at load are the last five, which sit past the parity tool: the extension has left the debug code and entered the candle subscription code');
  const consumer = priced.find((r) => r.name === CONSUMER_DECLS[0][0]);
  ok(consumer && consumer.hb > CONSUMER_DECLS[0][2], '…the extension that reaches the block\'s one declared consumer, ' + CONSUMER_DECLS[0][0] + ', taking its call site along while the top-level site in the statement below still reaches in from outside');
  // THE LAST OWNER BELOW ENDS THE REGION, apart from blank lines before the next banner.
  const last = priced[priced.length - 1];
  const trailing = CODE.slice(last.hb, REGION.end);
  ok(last.hb <= REGION.end, '…the extensions all ending inside the region…');
  eq(trailing.replace(/\n+$/, ''), '', '…the last of them leaving only blank lines before the next banner after it: the region\'s last owner is its last code');
  ok(/^\/\/ [═─]/.test(lineAt(REGION.end)), '…that banner being the next region\'s, which this cut does not touch');
}
// THE ONE RUN the single owner makes, which is the cut.
const CLUSTER = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
const AFTER_CLUSTER = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
const ownRun = (i, j) => {
  const lo = i === 0 ? RAW_AT_IN_CODE : (blockAbove(CLUSTER[i]) || { start: CLUSTER[i].start }).start;
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
  eq(measured, OWN_RUNS, 'the one owner makes exactly the one run OWN_RUNS, which is the cut');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them a real seam…');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR: the cut clears it with its documentation and without…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[DECL_AT_IN_CODE, BODY_END_IN_CODE]],
    '…the shipped screen enumerating exactly ONE run inside the block, from the declaration, the cut less its documentation…');
  eq(hiddenRows.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [],
    '…and the pass over sub-floor runs none');
}
// THE BANNER REGION it sits inside. The cut was owner number 4 of 14 and the banner is far above it, so the cut took NO banner
// and the document's banners and owner regions do not move — which the regions are recomputed on the text without the block to show.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, far above the cut…');
  ok(reg.start < RAW_AT_IN_CODE && reg.end > RAW_END_IN_CODE, '…and ends at REGION_END, below it, the cut sitting wholly inside');
  eq(reg.end, REGION_END, '…at REGION_END');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the BANNER_LINE_PREFIX banner…');
  ok(CODE.slice(reg.start).split('\n')[1].startsWith('// DEV-ONLY: backend'), '…whose title line, the next, opens `// DEV-ONLY: backend`…');
  eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…and holding REGION_OWNERS owners');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB references from sibling modules');
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
  eq([before.marks.length, after.marks.length], [BANNER_MARKS, BANNER_MARKS],
    'the cut took NO banner: the document\'s top-level banners stay at BANNER_MARKS…');
  eq([before.regions.length, after.regions.length], [OWNER_REGIONS, OWNER_REGIONS],
    '…and its owner regions at OWNER_REGIONS…');
  eq(after.regions.filter((r) => r.start === reg.start).map((r) => r.end), [reg.end - RAW_CHARS],
    '…the region simply shorter by RAW_CHARS, still opening on the same banner');
  eq(after.decls.filter((d) => d.start >= reg.start && d.end < reg.end - RAW_CHARS).length, REGION_OWNERS - OWNER_COUNT,
    '…and holding REGION_OWNERS less OWNER_COUNT owners');
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
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — all negative, so the screen SHRANK');
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs. That cut took no banner, so its
  // region simply lost the owners it held, and the region went from n to n less that many owners.
  const tri = (n) => n * (n + 1) / 2;
  const own = prevNum('REGION_OWNERS'), left = own - prevNum('OWNER_COUNT');
  eq(tri(left) - tri(own), DELTA_RAW_RUNS,
    '…and the raw-run change is exactly what that loss predicts: a region of ' + left + ' owners makes ' + tri(left) + ' runs where one of ' + own + ' made ' + tri(own) + ', a difference of DELTA_RAW_RUNS');
  ok(DELTA_RAW_RUNS < 0 && DELTA_SEAM_REJECTED < 0 && DELTA_CANDIDATES < 0 && DELTA_CLEAN < 0,
    '…the seam rejections and candidate counts shrinking with it, which this contract measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
  '…and the screen enumerates NO run that opens at the first comment line: it measures this owner from its declaration, so every run that includes it opens there instead…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).map((c) => c.hi).sort((a, b) => a - b).indexOf(BODY_END_IN_CODE), 0,
  '…the shortest of those the one that ends where the cut does, the cut less its documentation…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).length > 1, true,
  '…alongside runs that open there and run on past the cut into the next functions, which are not the cut');
// ─────────────────────────────────────────────────────────────────────────────
section('7. The SHIPPED module loads bare, needs the normalizer to run, and every branch of the comparison is measured');
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
  const NORMALIZER = fs.readFileSync(path.join(ROOT, OUTBOUND_MODULE), 'utf8');
  const TOL_DECL = CODE.slice(DEPENDENCY_DECLS[0][1], DEPENDENCY_DECLS[0][2] + 1);
  const thrown = (f) => { try { f(); return null; } catch (e) { return e.name; } };
  // A context holding the block, the REAL normalizer module it calls, and the monolith's own tolerance declaration.
  const fresh = () => {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(NORMALIZER, ctx);
    vm.runInContext(TOL_DECL, ctx);
    vm.runInContext(MODULE, ctx);
    return {
      ctx,
      // Results are copied out through JSON: objects built inside the VM have that realm's prototypes, which a deep
      // equality in this one would refuse. Every value the function returns is a number, string, boolean or plain
      // container, so the copy loses nothing — except NaN, which none of the cases below expects to see in a result.
      cmp: (front, back, opts) => { ctx.__f = front; ctx.__b = back; ctx.__o = opts; return JSON.parse(vm.runInContext('JSON.stringify(_apexCompareCandleArrays(__f, __b, __o))', ctx)); },
      cmp2: (front, back) => { ctx.__f = front; ctx.__b = back; return JSON.parse(vm.runInContext('JSON.stringify(_apexCompareCandleArrays(__f, __b))', ctx)); },
      norm: (arr) => { ctx.__a = arr; return JSON.parse(vm.runInContext('JSON.stringify(_apexParityNormCandleArray(__a))', ctx)); },
    };
  };
  const T0 = Date.UTC(2026, 0, 15, 14, 30);
  const tt = (i) => T0 + i * 30 * 60 * 1000;
  const cd = (i, o, h, l, c) => ({ t: tt(i), o, h, l, c });
  const flat = (i, v) => cd(i, v, v, v, v);
  const PARITY0 = { compared: 0, matched: 0, mismatched: 0, missingFrontend: 0, missingBackend: 0,
    maxAbsCloseDiff: 0, maxAbsOpenDiff: 0, maxAbsHighDiff: 0, maxAbsLowDiff: 0, timeAlignment: 'ok' };
  const P = (extra) => Object.assign({}, PARITY0, extra);
  const run = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

  // LOADING needs nothing; CALLING needs the normalizer, and the tolerance only when the caller gives none.
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its one owner');
  eq(vm.runInContext(OWNER + '.constructor.name', bare), 'Function', '…an ordinary synchronous function');
  eq(vm.runInContext(OWNER + '.length', bare), 3, '…taking three arguments, two candle arrays and an options object');
  eq(thrown(() => vm.runInContext(OWNER + '([], [])', bare)), 'ReferenceError',
    '…and CALLING it there throws ReferenceError, because ' + OUTBOUND_MODULE_NAME + ' is not defined: loading needs nothing, calling needs the normalizer module');
  eq(thrown(() => vm.runInContext('(function () { return notDefinedAnywhere; })()', bare)), 'ReferenceError',
    'control — the same bare VM raises ReferenceError for any function that reads a name it does not have, so the failure above is the reason claimed');
  {
    const withNorm = vm.createContext(Object.create(null));
    vm.runInContext(NORMALIZER, withNorm);
    vm.runInContext(MODULE, withNorm);
    eq(vm.runInContext(OWNER + '([], [], { tol: 0.5 }).parity.timeAlignment', withNorm), 'ok',
      'with the normalizer defined but APEX_PARITY_TOL NOT, a caller that passes its own tolerance never reads the binding: the call succeeds…');
    eq(thrown(() => vm.runInContext(OWNER + '([], [], {})', withNorm)), 'ReferenceError',
      '…and one that passes none throws, so the dependency is read at CALL time and only as the default');
  }

  // THE EMPTY AND DEGENERATE INPUTS.
  {
    const h = fresh();
    const EMPTY = { parity: PARITY0, mismatches: [] };
    eq(h.cmp([], []), EMPTY, 'two empty arrays give all-zero counts and timeAlignment `ok`: an empty comparison is called aligned…');
    eq([null, undefined, 'x', 5, {}, true].map((v) => h.cmp(v, v)), Array(6).fill(EMPTY),
      '…as are inputs that are not arrays at all — null, undefined, a string, a number, an object, a boolean — which the normalizer turns into empty arrays');
    eq(h.cmp2([], []), EMPTY, '…and a call with no options object at all');
    eq(h.cmp([], [], null), EMPTY, '…or a null one');
    eq(Object.keys(h.cmp([], [])), ['parity', 'mismatches'], 'the result has exactly the keys parity and mismatches, in that order…');
    eq(Object.keys(h.cmp([], []).parity), ['compared', 'matched', 'mismatched', 'missingFrontend', 'missingBackend',
      'maxAbsCloseDiff', 'maxAbsOpenDiff', 'maxAbsHighDiff', 'maxAbsLowDiff', 'timeAlignment'],
    '…and the parity object ten keys in a fixed order');
  }
  // MATCHING, MISMATCHING AND THE SHAPE OF A MISMATCH.
  {
    const h = fresh();
    const A = [cd(0, 10, 11, 9, 10.5), cd(1, 10.5, 12, 10, 11), cd(2, 11, 11.5, 10.5, 11.25)];
    eq(h.cmp(A, A.map((c) => Object.assign({}, c))), { parity: P({ compared: 3, matched: 3 }), mismatches: [] },
      'three identical candles on both sides give compared 3, matched 3 and no mismatch…');
    const B = [cd(0, 10, 11, 9, 10.5), cd(1, 10.5, 12, 10, 11.5), cd(2, 11, 11.5, 10.5, 11.25)];
    const out = h.cmp(A, B);
    eq(out.parity, P({ compared: 3, matched: 2, mismatched: 1, maxAbsCloseDiff: 0.5 }),
      '…and a close that differs by 0.5 in the middle one makes it mismatched, the other counts and the other maxima untouched…');
    eq(out.mismatches, [{
      time: new Date(tt(1)).toISOString(),
      frontend: { open: 10.5, high: 12, low: 10, close: 11 },
      backend: { open: 10.5, high: 12, low: 10, close: 11.5 },
      diffs: { open: 0, high: 0, low: 0, close: 0.5 },
    }], '…the mismatch recorded with its ISO time, both candles under the names open/high/low/close, and the four absolute differences');
    const FA = Object.freeze(A.map((c) => Object.freeze(Object.assign({}, c))));
    const FB = Object.freeze(B.map((c) => Object.freeze(Object.assign({}, c))));
    eq(h.cmp(FA, FB), out, 'with both arrays and every candle in them FROZEN the comparison gives the same answer: it writes to nothing it is handed');
    eq(h.cmp(A, B), out, '…and the same call twice gives the same answer, so it keeps no state between calls');
    // Each field can differ on its own, and the four maxima are tracked separately and are absolute values.
    const F = [cd(0, 10, 11, 9, 10), cd(1, 20, 21, 19, 20), cd(2, 30, 31, 29, 30)];
    const K = [cd(0, 10.25, 11.5, 8, 10.75), cd(1, 19.875, 21, 19, 20), cd(2, 30, 31, 29, 31.5)];
    const o3 = h.cmp(F, K);
    eq(o3.parity, P({ compared: 3, matched: 0, mismatched: 3, maxAbsOpenDiff: 0.25, maxAbsHighDiff: 0.5, maxAbsLowDiff: 1, maxAbsCloseDiff: 1.5 }),
      'three candles each off in different fields give the four maxima separately, from different candles, as ABSOLUTE values (the middle open is BELOW its counterpart)…');
    eq(o3.mismatches.map((m) => m.diffs), [
      { open: 0.25, high: 0.5, low: 1, close: 0.75 },
      { open: 0.125, high: 0, low: 0, close: 0 },
      { open: 0, high: 0, low: 0, close: 1.5 },
    ], '…and each mismatch carrying its own four differences, never negative');
    // Maxima are over COMPARED candles only: a candle present on one side never contributes.
    eq(h.cmp([flat(0, 1), flat(5, 1000)], [flat(0, 1)], { tail: 20 }).parity,
      P({ compared: 1, matched: 1, missingBackend: 1, timeAlignment: 'partial' }),
      'a candle that exists on one side only adds to the missing count and to NO maximum');
  }
  // THE TOLERANCE: inclusive, per field, optional, and the default is read when the call runs.
  {
    const h = fresh();
    const lo = [cd(0, 10, 10, 10, 10)], hi = [cd(0, 10.5, 10.5, 10.5, 10.5)];
    eq(h.cmp(lo, hi, { tol: 0.5 }).parity.matched, 1, 'a difference EXACTLY equal to the tolerance matches: the comparison is `<=`…');
    eq(h.cmp(lo, hi, { tol: 0.25 }).parity.mismatched, 1, '…and one over it does not');
    const one = [cd(0, 10, 10, 10, 10)], dOne = [cd(0, 10, 10, 10, 10.375)];
    eq([h.cmp(one, dOne, { tol: 0.375 }).parity.matched, h.cmp(one, dOne, { tol: 0.25 }).parity.matched], [1, 0],
      '…and every one of the four fields must be within it: a close alone beyond the tolerance mismatches the candle');
    eq(h.cmp(one, dOne, { tol: 0 }).parity.mismatched, 1, 'a tolerance of ZERO is used as given (`!= null`, not truthiness), so any difference mismatches…');
    eq(h.cmp(one, one, { tol: 0 }).parity.matched, 1, '…and identical candles still match, zero being within zero');
    eq(h.cmp(one, one, { tol: NaN }).parity.mismatched, 1, 'a NaN tolerance is used as given too: every comparison with it is false, so even identical candles MISMATCH, a quirk pinned and not fixed');
    eq(h.cmp(one, [cd(0, 10, 10, 10, 10.00005)], { tol: null }).parity.matched, 1, 'a null tolerance falls back to the default…');
    // THE DEFAULT, read at CALL time from the binding.
    const near = [cd(0, 10, 10, 10, 10.00005)], far = [cd(0, 10, 10, 10, 10.0002)];
    eq([h.cmp2(one, near).parity.matched, h.cmp2(one, far).parity.matched], [1, 0],
      'with no tolerance given the default 0.0001 applies: a difference of 0.00005 matches and one of 0.0002 does not…');
    vm.runInContext('APEX_PARITY_TOL = 1;', h.ctx);
    eq(h.cmp2(one, far).parity.matched, 1, '…and once the binding is reassigned the SAME call matches, the default being read when the function runs, not when it loads');
  }
  // THE TAIL WINDOW.
  {
    const h = fresh();
    const S25 = run(25, (i) => flat(i, i + 1));
    eq(h.cmp2(S25, S25).parity.compared, 20, 'the default window is the last TWENTY candles of each side: 25 identical candles compare 20…');
    eq([3, 5, 25, 100].map((n) => h.cmp(S25, S25, { tail: n }).parity.compared), [3, 5, 25, 25], '…a given tail narrows it, and one larger than the arrays takes them whole…');
    eq(h.cmp(S25, S25, { tail: 0 }).parity.compared, 25, '…a tail of ZERO compares EVERYTHING, because `slice(-0)` is `slice(0)`, a quirk pinned and not fixed…');
    eq(h.cmp(S25, S25, { tail: -2 }).parity.compared, 23, '…and a NEGATIVE tail drops that many candles from the FRONT instead…');
    eq(h.cmp(S25, S25, { tail: '3' }).parity.compared, 3, '…while a numeric string is used as a number');
    // The window is taken on EACH side separately and the two sets of times are united.
    const front = run(10, (i) => flat(i, 1)), back = run(10, (i) => flat(i + 5, 1));
    eq(h.cmp(front, back, { tail: 3 }).parity, P({ compared: 3, matched: 3, missingFrontend: 3, timeAlignment: 'partial' }),
      'the last three of each side are united: the front\'s t7..t9 are also in the back, the back\'s t12..t14 are not in the front, so 3 compared and 3 missing from the frontend…');
    eq(h.cmp(back, front, { tail: 3 }).parity, P({ compared: 3, matched: 3, missingBackend: 3, timeAlignment: 'partial' }),
      '…and the mirror image gives 3 missing from the backend');
    eq(h.cmp([flat(1, 1)], [flat(2, 1)]).parity, P({ missingFrontend: 1, missingBackend: 1, timeAlignment: 'misaligned' }),
      'two sides with no time in common compare nothing and are `misaligned`, where one with some in common and some not is `partial`, and one with none missing is `ok`');
  }
  // NORMALIZATION: what the function accepts as a candle.
  {
    const h = fresh();
    const F = [cd(0, 10, 11, 9, 10.5), cd(1, 10.5, 12, 10, 11)];
    const backendShape = [
      { time: new Date(tt(0)).toISOString(), open: '10', high: '11', low: '9', close: '10.5' },
      { timestamp: tt(1) / 1000, open: 10.5, high: 12, low: 10, close: 11 },
    ];
    eq(h.cmp(F, backendShape).parity, P({ compared: 2, matched: 2 }),
      'a backend-shaped array — ISO time strings and epoch SECONDS as well as milliseconds, open/high/low/close names, numeric strings — compares equal to the frontend\'s {t,o,h,l,c}…');
    eq(h.cmp([{ t: tt(0), c: 10 }], [flat(0, 10)]).parity.matched, 1, '…a candle with only a close takes it for the open, high and low…');
    eq(h.cmp([{ t: tt(0) }, flat(1, 1)], [flat(0, 1), flat(1, 1)]).parity, P({ compared: 1, matched: 1, missingFrontend: 1, timeAlignment: 'partial' }),
      '…and a candle with no close, or no time, is DROPPED by the normalizer, which the comparison then reports as missing on that side');
    const rawF = [cd(2, 3, 4, 2, 3), cd(0, 1, 2, 0, 1)], rawB = [cd(0, 1, 2, 0, 1), cd(2, 3, 5, 2, 3)];
    eq(h.cmp(rawF, rawB).mismatches.map((m) => m.time), [new Date(tt(2)).toISOString()], 'input that is NOT in time order is sorted first, so order does not matter to the pairing…');
    const rawF2 = [cd(2, 3, 4, 2, 4), cd(0, 1, 2, 0, 2), cd(1, 2, 3, 1, 3)], rawB2 = [flat(0, 9), flat(1, 9), flat(2, 9)];
    eq(h.cmp(rawF2, rawB2).mismatches.map((m) => m.time), [0, 1, 2].map((i) => new Date(tt(i)).toISOString()),
      '…and the mismatches come out in ASCENDING time whatever order the input had');
    // Re-normalizing already normalized candles changes nothing, which is how the monolith calls it.
    eq(h.cmp(h.norm(backendShape), h.norm(F)), h.cmp(backendShape, F),
      'handing the function candles that were ALREADY normalized gives the same answer as handing it the raw ones: the monolith calls it on frontNorm and backNorm');
    // DUPLICATES: the last candle at a time wins, and a duplicate takes a slot of the tail window.
    const dup = [flat(0, 1), flat(1, 5), flat(1, 6)];
    eq(h.cmp(dup, [flat(0, 1), flat(1, 6)]).parity, P({ compared: 2, matched: 2 }), 'two candles at one time collapse to the LAST one…');
    eq(h.cmp(dup, [flat(0, 1), flat(1, 6)], { tail: 1 }).parity.compared, 1, '…while both count toward the tail window, so a window of one sees only the duplicated time');
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
  // THE THREE CHAIN-WIDE COUNTS, and the audit forecast that the dependency count and the
  // pure-ASCII count would move and that the banner counts would not. The shape counts are asserted as comparisons between two
  // measurements, over the chain before this layer and over the whole chain,
  // rather than carried forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s2) => !/[^\x00-\x7F]/.test(s2);
  const banner = (s2) => /^\s*\/\/ ── /.test(s2.split('\n')[0]);
  const wide = (s2) => /^\s*\/\/ ─{2,}[ \t]+\S/.test(s2.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(ascii(MODULE), '…and this module IS, asserted of the module directly: it holds NON_ASCII_CHARS non-ASCII characters…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS + 1, '…one HIGHER: it moved, as the audit forecast');
  eq(prior.filter(banner).length, PRIOR_LAYERS_OPENING_ON_BANNER,
    'PRIOR_LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: its first line is a comment line, not a banner…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is LAYERS_OPENING_ON_BANNER…');
  eq(LAYERS_OPENING_ON_BANNER, PRIOR_LAYERS_OPENING_ON_BANNER, '…the SAME number: it did not move, as the audit forecast…');
  eq(prior.filter(wide).length, PRIOR_LAYERS_OPENING_ON_WIDE_BANNER,
    '…while PRIOR_LAYERS_OPENING_ON_WIDE_BANNER of the chain before it open on a banner of two or more dashes, the reading topLevelBanners uses…');
  ok(!wide(MODULE), '…this module does not open on one of those either…');
  eq(sources.filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER, '…the count over the whole chain being LAYERS_OPENING_ON_WIDE_BANNER…');
  eq(LAYERS_OPENING_ON_WIDE_BANNER, PRIOR_LAYERS_OPENING_ON_WIDE_BANNER, '…the SAME number: neither shape count moved, as the audit forecast');
  // THE THIRD CHAIN-WIDE COUNT, and the one that moved: layers whose
  // contract pins a non-empty MONOLITH_DEPENDENCIES. Counted over the suite with
  // this contract in it, then compared with the figure the contract that carries
  // it pins. This contract pins one monolith function, so it is among them.
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
  eq(MONOLITH_DEPENDENCIES.length, 1, '…it pinning the non-empty list of its one monolith binding, `APEX_PARITY_TOL`, which is why the count moved, as the audit forecast…');
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
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  // THE AUDIT ASSERTED THAT NOTHING MOVED. The phase that shipped this layer moved exactly the audited
  // bytes and nothing else, so the claim was inverted rather than dropped: the document and the new module,
  // and no third. It now reads against a base that a LATER layer has also moved past, so the footprint is
  // the document, this layer's module, and the module of every layer cut after it.
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL, 'js/services/swing-trend-context.js'].sort(),
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
  eq(MODULE.split('\n')[2], DECL_FIRST_LINE, '…its third line the declaration of ' + OWNER + ', the two comment lines being the two above it…');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 0, '…its UTF-8 length equal to its UTF-16 length…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…because it holds NON_ASCII_CHARS non-ASCII characters: the file is pure ASCII, so the encoding of the file is not part of what the move must preserve');
}
// THE TAG'S POSITION, and here it is LOAD-BEARING: the shipped monolith evaluates a top-level statement that
// reads the function as the monolith loads (§3 ran that statement with the function missing). The tag sits last
// of the local scripts, immediately before the inline monolith.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/services/ai-scan-context.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumers call it, the very next script');
  }
  ok(LIVE_LOCALS.indexOf(OUTBOUND_MODULE) >= 0 && LIVE_LOCALS.indexOf(OUTBOUND_MODULE) < tagIndex,
    '…and ' + OUTBOUND_MODULE + ', whose function it calls at call time, loads BEFORE it');
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES THE FUNCTION at the two sites in the two consumers: the block's own text left,
  // the references did not.
  eq(refSites(LIVE_MONOLITH, OWNER).length, CONSUMER_SITES,
    '…while the shipped monolith names ' + OWNER + ' at the CONSUMER_SITES sites that stayed…');
  eq(refSites(MASKED, OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, CONSUMER_SITES,
    '…the same CONSUMER_SITES the reconstructed base held from outside the block…');
  // The module itself names it, the control that makes the counts below measurements.
  ok(refSites(MODULE, OWNER).length >= 1, 'control — the same count over the module itself finds the name…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t2, rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return t2 + refSites(src, OWNER).length;
  }, 0), 0,
  '…and not one other local script names the function, so the module is reached only from the monolith');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its one owner and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => MONOLITH_DEPENDENCIES.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    MONOLITH_DEPENDENCIES.slice().sort(), '…and so does the one binding the module reads at call time, `APEX_PARITY_TOL`');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMER_DECLS.some((c) => c[0] === d.name)).map((d) => d.name),
    CONSUMER_DECLS.map((c) => c[0]), '…and its one declared consumer, which calls the module\'s function');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, stays too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the closing brace of ' + OWNER_BEFORE + ' against the documentation of ' + NEXT_DECL + ' across one blank line, once…');
  eq(LIVE_MONOLITH.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…at the place the cut was made…');
  eq(count(LIVE_MONOLITH, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE - 1,
    '…one fewer of a brace, a blank line and a comment than the JOINS_LIKE_THE_CUT_BEFORE the base held, the join in front of the block\'s documentation having left with it…');
  eq(count(LIVE_MONOLITH, JOIN_AS_BEFORE), 0, '…and the join of that brace against this block\'s documentation gone with the block');
  // THE LOAD-TIME READ, MEASURED AGAINST THE SHIPPED ORDER. The statement is taken from the shipped monolith and run
  // in a VM twice: once with the SHIPPED MODULE evaluated first, which is what the tag order does, and once with it
  // evaluated after, which is what a tag after the monolith would do. The second throws.
  {
    const sAt = LIVE_MONOLITH.lastIndexOf("if (typeof window !== 'undefined') {", LIVE_MONOLITH.indexOf('compareCandleArrays: ' + OWNER));
    const sEnd = LIVE_MONOLITH.indexOf('\n}\n', LIVE_MONOLITH.indexOf('compareCandleArrays: ' + OWNER)) + 3;
    const stmt = LIVE_MONOLITH.slice(sAt, sEnd);
    ok(sAt >= 0 && stmt.indexOf('window.apexParityHelpers = {') > 0, 'the statement is found in the SHIPPED monolith, building the helper object that names ' + OWNER + '…');
    const others = LOAD_STMT_NAMES.concat(['apexDebugCompareCandles']).filter((n) => n !== OWNER);
    const prepared = () => {
      const ctx = vm.createContext({ window: {} });
      for (const n of others) vm.runInContext('var ' + n + ' = function ' + n + '() {};', ctx);
      return ctx;
    };
    const run = (ctx, code) => { try { vm.runInContext(code, ctx); return null; } catch (e) { return e.name + ': ' + e.message; } };
    const before = prepared();
    eq(run(before, MODULE), null, '…the shipped module evaluates in a context that has nothing else of the monolith…');
    eq(run(before, stmt), null, '…and with it evaluated BEFORE the statement, the order the tag gives, the statement runs clean…');
    eq(vm.runInContext('window.apexParityHelpers.compareCandleArrays === ' + OWNER, before), true, '…the helper object holding the module\'s function by identity');
    const after = prepared();
    eq(run(after, stmt), 'ReferenceError: ' + OWNER + ' is not defined',
      'control — with the statement evaluated BEFORE the module, the order a tag after the monolith would give, it throws ReferenceError for the function, so the position is load-bearing…');
    eq(run(after, MODULE), null, '…and the module itself is not what failed');
  }
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
  const E = 'APEX_PARITY_COMPARE_UNDO_';
  throwsWith(() => UNDO.undoApexParityCompare(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 2,392 units, not 2,391 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('frontByTime', 'frontByTimE');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoApexParityCompare(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoApexParityCompare(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoApexParityCompare(INDEX, MODULE),
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
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/apex-parity-compare-undo.js'),
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
console.log('APEX_PARITY_COMPARE_CONTRACT_OK');
}

main();
