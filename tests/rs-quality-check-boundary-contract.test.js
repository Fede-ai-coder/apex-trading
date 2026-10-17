'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// RS QUALITY CHECK — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [283556,285544) in monolith coordinates — 1,988 units raw and
// 1,987 of body, ONE owner, a synchronous function — now lives in
// js/services/rs-quality-check.js. `_rsQualityCheck` is the hard quality gate the
// relative-strength scan puts a symbol's approved DXLink daily candles through:
// fewer than 32 candles, a price under the floor, an average volume under the
// floor, a quote spread wider than 0.6%, a jump of more than 20% in any of the
// last three sessions, a distance from the 20-session mean beyond 40% in the
// mode's direction, a 20- and 30-session mean that disagree with the mode, or an
// RSI outside the mode's band each fail it, and a symbol that survives gets back
// its means, volume, score and RSI. The first 252 units are the three comment
// lines that document it.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #496 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT FIRST ────────────
//
// The contract before this layer published its four best other openings, and the
// first was this one. The cut that contract shipped sat entirely BEFORE this
// opening in the monolith, so every offset here was earlier than the one it
// published by that cut's raw length, 3,035 units, and §4 checks the published
// list against the reconstructed base: the first of the four is this opening,
// moved, the other three were the top of the list that remained, and the list
// gained a fourth entry from beneath.
//
// ── PART TWO: A TIE AT THE BEST SCORE THE SCREEN CAN STATE ─────────────────
//
// With the layer that held the lead shipped, §4 counts no row in the screen or
// the pass over its sub-floor runs whose byConsumerSplit is below 2, and none of
// the rows at 2 has a raw nine below 4. At byConsumerSplit 2 and raw nine 4 there
// were TWO openings, this one and `fetchBackendPortfolioPositionsEnriched`, and
// they tied on everything the score carries and on the count of references to
// foundation modules, which byConsumerSplit leaves out: two each. The audit did
// not invent a measure to break a tie that the measures do not break. It took the
// order the screen itself publishes, byConsumerSplit, then raw nine, then length
// ascending, which put this opening first by 13 units. The other is published as
// the next candidate. The claim is scoped to the two enumerations §4 measures.
//
// ── PART THREE: THE SCAN WAS WRONG HERE, THE FUNCTION WAS NOT ──────────────
//
// A direct scan for assignment to anything the body does not own reports one hit
// on this function, to `sma30`. It is a name the body declares in the
// comma-separated list `var sma20=smA(closes,20)[n], sma30=smA(closes,30)[n];`,
// and the scan treated only the first name of a list as local. §3 measures the
// false positive, then the corrected scan, and plants a violation each is run
// against.
//
// ── PART FOUR: ONE CALL BACK INTO THE MONOLITH, ONE OUT TO A FOUNDATION ────
//
// The body calls `_rsAvgVol`, which stays in the monolith, and calls `smA` twice,
// which lives in a module that already shipped, js/utils/indicators.js, and which
// byConsumerSplit does not count but §3 measures by name. `_rsAvgVol` is the
// whole of the raw nine's ninth direction. Both are reached only when the
// function is CALLED, never when it loads, so the module loads in a bare VM. The
// body is wrapped in a `try`, so §7 shows what a bare call does with the shipped
// module: it does not throw, it answers `{pass:false}`, which is indistinguishable
// from a rejection; the same call with the two dependencies supplied passes. §7
// then walks the gates the body applies, one by one.
//
// ── PART FIVE: THE BOUNDARY IS A JUDGEMENT, AND THERE IS NO BLANK LINE ─────
//
// The seam accepts FIVE line starts between the previous function's closing
// brace and the declaration: that brace, each of the three documentation lines,
// and the declaration. Four parse; the brace does not. There is no blank line
// among them, because the documentation sits directly against the brace above it,
// so removing the cut left that brace directly against the banner of the NEXT
// function with no blank line between them; §2 measures that consequence. The
// screen visits the declaration, 1,735 units long and over its floor, and the cut
// opens three lines above it, on the documentation.
//
// ── PART SIX: THE CUT CLOSES ITS REGION, AND THE FOUR BELOW IT CANNOT END ──
//
// This is the last of the five owners of its banner region, so the cut closed the
// region and took nothing from the banner above it. Below it, four consecutive
// owners end directly against whatever follows them, so no cut can end at any of
// them, and §5 asserts the refusal by name; the first end the seam rule admits is
// further down.
//
// ── NO LOAD-ORDER CONSTRAINT, STATED AT THE LEVEL IT HOLDS ─────────────────
//
// The module loads in a bare VM; only CALLING it needs `_rsAvgVol` and `smA` in
// scope, and the one call site sits inside the body of `computeRsCandidates`, a
// function declaration, so reaching it takes a call to `computeRsCandidates`. §3
// and §7 show those facts. §9 pins where the tag sits all the same — after every
// other local script and immediately before the inline monolith — and the call
// site stays in the monolith.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// The seventh smallest of the fifty-one layers the chain now holds, six being
// smaller and forty-four larger; §8 asserts the rank by measurement. The module
// holds non-ASCII text, so the pure-ASCII count did not move, and it does not open
// on a banner, so that count did not either. The count of layers that pin a
// non-empty monolith dependency DID move, by one, and §8 measures it.
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
const UNDO = require('./lib/rs-quality-check-undo.js');
// The layer cut AFTER this one, peeled off before this layer's own document is
// reconstructed. Newest-first, which is the rule the whole chain follows.
const SCANNER_STOCK_SCORING_U = require('./lib/scanner-stock-scoring-undo.js');
const SWING_CHART_CACHE_HELPERS_U = require('./lib/swing-chart-cache-helpers-undo.js');
const SCANNER_DSS_CHART_LOAD_GUARD_U = require('./lib/scanner-dss-chart-load-guard-undo.js');
const OPTION_STREAMER_DIAGNOSTICS_U = require('./lib/option-streamer-diagnostics-undo.js');
const BACKEND_POSITIONS_ENRICHED_U = require('./lib/backend-positions-enriched-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while
// the cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/services/rs-quality-check.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '3526809';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '0a9dc6d';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'cbee8f8';
const BASE_CHARS = 1441539;
const BASE_UTF8 = 1470064;
const BASE_LF = 24909;
const BASE_SHA256 = '6340bcbd6507c40c113fe19dd2b078196d8770099c853273e65020a95f1ebc89';
const LOCAL_SCRIPTS = 94;
const TEST_FILE_COUNT = 185;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-rs-quality-check-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/rs-quality-check-audit.spec.js';
const CONTRACT_REL = 'tests/rs-quality-check-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/rs-quality-check-contract.spec.js';
const UNDO_REL = 'tests/lib/rs-quality-check-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'cbee8f8';
const CONTRACT_SPEC_MUTANTS = 142;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 47;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/scanner-dxlink-prices-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 141;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the
// outgoing contract's spec went in Phase 1, which is the rhythm. §10 asserts
// the arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/rs-quality-check-audit.spec.js';
const RETIRED_MUTANTS = 135;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115622;
const CODE_CHARS = 1325891;
const TOP_LEVEL_DECLS = 909;
const OWNER_REGIONS = 117;

// ── The region ───────────────────────────────────────────────────────────────
// It opens on the three comment lines that document the function, which sat
// directly against the closing brace of the function above them. The screen
// visits the declaration, not these lines.
const RAW_AT_IN_CODE = 283556;
const DECL_AT_IN_CODE = 283808;
const RAW_END_IN_CODE = 285544;
const BODY_END_IN_CODE = 285543;
const RAW_CHARS = 1988;
const BODY_CHARS = 1987;
const BODY_UTF8 = 1989;
const BODY_LF = 42;
const BODY_SHA256 = '87af1cfc9d25934530a033b1cdcc69f8754411cc27209fee9578a906ee2b1466';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// Hard quality gate over APPROVED DXLink daily candles. rsi is computed from the';
const DECL_FIRST_LINE =
  'function _rsQualityCheck(candles,mode,price,f,rsi,bid,ask){';
const EM_DASHES = 1;
const NON_ASCII_CHARS = 1;
const NEXT_DECL = '_rsCalcADXFull';
const NEXT_DOC_PREFIX = '// ── ADX (5m)';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_rsQualityCheck'];
const OWNER_SIZES = [1734];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 42;
const CODE_LINES = 34;
const COMMENT_LINES = 8;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous function's closing brace and the declaration the seam
// accepts FIVE line starts. One is that closing brace and is not valid
// JavaScript; three are the lines of the documentation; the last is the
// declaration. There is no blank line among them.
const BRACE_OPENING = 283554;
const MID_LINE_OPENING = 283555;
const SEAM_LEGAL_OPENINGS = 5;
const PARSING_OPENINGS = 4;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 252;
const DOC_TAKEN_LINES = 3;
const DECL_UNITS_FROM_DECLARATION = 1735;
const CANDIDATES_AT_DECLARATION = 1;
const CANDIDATES_AT_CUT = 0;
const FUSED_AFTER_CUT = '}\n// ── ADX (5m)';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 282389;
const REGION_END = 285544;
const REGION_CHARS = 3155;
const REGION_OWNERS = 5;
const OWNER_POSITION = 5;
const OWNER_BEFORE = '_rsComputeAll';
const BANNER_LINE_PREFIX = '// ── Helpers';
const WHOLE_REGION_NINE = 10;
const WHOLE_REGION_BCS = 4;
const WHOLE_REGION_CONSUMERS = 3;
const WHOLE_REGION_DEPS = 1;
const WHOLE_REGION_SIB = 0;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies]. They sit in the same
// banner region as the cut.
const EXTENSIONS_UP = [
  ['_rsComputeAll', 283270, 2274, 6, 3, 2],
  ['_rsValSpan', 282946, 2598, 9, 4, 2],
  ['_rsFmtVol', 282727, 2817, 11, 5, 2],
];
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies]. The four owners between the cut
// and these are not here: no cut can end at any of them, which §5 asserts by name.
const EXTENSIONS_DOWN = [
  ['_rsClear5mSubs', 6789, 25, 20, 14],
  ['_rsFrozen', 7128, 42, 25, 14],
];
const SEAM_ILLEGAL_DOWN = ['_rsCalcADXFull', '_rs5mAdx', '_rsEnsure5MSubscription', '_rs5mUnsubscribe'];
const SEAM_ILLEGAL_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 4;
const BY_CONSUMER = 4;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = 'computeRsCandidates';
const CONSUMER_SITES = 1;
const CONSUMER_SITE_AT = 293871;
const CONSUMER_AT = 292228;
const CONSUMER_END = 295976;
const CONSUMER_CHARS = 3749;
const MONOLITH_DEPENDENCIES = ['_rsAvgVol'];
const AVGVOL_REFERENCES = 1;
const AVGVOL_AT = 282468;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 1;
const OUTBOUND_MODULE_REFERENCES = 2;
const FOUNDATION_MODULE = 'js/utils/indicators.js';
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 2;
const FOUNDATION_NAMES = ['smA'];
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// The scan this file inherited reads only the first name of a `var` list as
// local, so the name below reads as a global being written. It is a name the
// body declares in its one comma-separated list.
const UNCORRECTED_SCAN_HITS = 1;
const UNCORRECTED_SCAN_NAMES = ['sma30'];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_rsQualityCheck'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7248;
const SEAM_REJECTED = 2045;
const CANDIDATES = 2913;
const CLEAN_CANDIDATES = 1779;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 8;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION. A function whose documentation lifts it over the floor
// was therefore never enumerated. This pass keeps every run the screen skipped
// for being short, re-measures it from the start of its documentation, and
// keeps those that then clear the floor.
const HIDDEN_ROWS = 36;
const HIDDEN_CLEAN_ROWS = 35;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 2;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [893619, 895367, 1375, 1748, 4, 2, ['fetchBackendPortfolioPositionsEnriched']],
  [747610, 749309, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 10;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit]. The first is the screen's
// own row for this function, which opens at its declaration.
const BEST_TIER_ROWS = [
  [283808, 285543, 4, 2],
  [893619, 895367, 4, 2],
  [182656, 184808, 5, 2],
  [939019, 940891, 5, 2],
  [71214, 72907, 6, 2],
  [578750, 580309, 6, 2],
  [622306, 625630, 6, 2],
  [70936, 72907, 7, 2],
  [747610, 749309, 7, 2],
  [878963, 881054, 7, 2],
];
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [893619, 2, 4, 1748],
  [939019, 2, 5, 1872],
  [182656, 2, 5, 2152],
  [578750, 2, 6, 1559],
];
const TIE_NAME = 'fetchBackendPortfolioPositionsEnriched';
const TIE_OPENING = 893619;
const TIE_UNITS = 1748;
const TIE_FOUNDATION_OUTBOUND = 2;
const TIE_FOUNDATION_NAMES = ['BACKEND', '_backendAuthHeaders'];
const PREVIOUS_RAW_CHARS = 3035;
const PREVIOUS_RAW_AT = 61214;

// ── Where it sits ────────────────────────────────────────────────────────────
const CHAIN_LENGTH = 51;
const SMALLEST_LAYER_CHARS = 1587;
const SIZE_RANK = 7;
const LAYERS_SMALLER_THAN_THIS_CUT = 6;
const LAYERS_LARGER_THAN_THIS_CUT = 44;
const PURE_ASCII_LAYERS = 4;
const LAYERS_OPENING_ON_BANNER = 24;
const LAYERS_WITH_A_DEPENDENCY = 18;
// The count above is the figure AT THIS LAYER. Layers cut after it that also pin a
// non-empty MONOLITH_DEPENDENCIES add to the live count, so they are named here and
// set aside rather than left to make the figure drift: a count over the suite
// that is true of one layer's commit and compared with a number that has moved on.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = [
  'backend-positions-enriched-boundary-contract.test.js',
  'option-streamer-diagnostics-boundary-contract.test.js',
  'scanner-dss-chart-load-guard-boundary-contract.test.js',
  'swing-chart-cache-helpers-boundary-contract.test.js',
];
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 17;

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1930;
const INDEX_AFTER = 1439609;
const RESIDUAL_MONOLITH = 1323903;
const LOCAL_SCRIPTS_AFTER = 95;
// The tag's position among the local scripts, zero-based: the last of 95.
const TAG_LOCAL_INDEX = 94;

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



console.log('RS QUALITY CHECK — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_SCANNER_STOCK_SCORING = SCANNER_STOCK_SCORING_U.isApplied(HEAD_INDEX)
  ? SCANNER_STOCK_SCORING_U.undoScannerStockScoring(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/scanner-stock-scoring.js'), 'utf8'))
  : HEAD_INDEX;
const PRE_SWING_CHART_CACHE_HELPERS = SWING_CHART_CACHE_HELPERS_U.isApplied(PRE_SCANNER_STOCK_SCORING)
  ? SWING_CHART_CACHE_HELPERS_U.undoSwingChartCacheHelpers(
      PRE_SCANNER_STOCK_SCORING, fs.readFileSync(path.join(ROOT, 'js/services/swing-chart-cache-helpers.js'), 'utf8'))
  : PRE_SCANNER_STOCK_SCORING;
const PRE_SCANNER_DSS_CHART_LOAD_GUARD = SCANNER_DSS_CHART_LOAD_GUARD_U.isApplied(PRE_SWING_CHART_CACHE_HELPERS)
  ? SCANNER_DSS_CHART_LOAD_GUARD_U.undoScannerDssChartLoadGuard(
      PRE_SWING_CHART_CACHE_HELPERS, fs.readFileSync(path.join(ROOT, 'js/services/scanner-dss-chart-load-guard.js'), 'utf8'))
  : PRE_SWING_CHART_CACHE_HELPERS;
const PRE_OPTION_STREAMER_DIAGNOSTICS = OPTION_STREAMER_DIAGNOSTICS_U.isApplied(PRE_SCANNER_DSS_CHART_LOAD_GUARD)
  ? OPTION_STREAMER_DIAGNOSTICS_U.undoOptionStreamerDiagnostics(
      PRE_SCANNER_DSS_CHART_LOAD_GUARD, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-option-streamer-diagnostics.js'), 'utf8'))
  : PRE_SCANNER_DSS_CHART_LOAD_GUARD;
const LIVE_INDEX = BACKEND_POSITIONS_ENRICHED_U.isApplied(PRE_OPTION_STREAMER_DIAGNOSTICS)
  ? BACKEND_POSITIONS_ENRICHED_U.undoBackendPositionsEnriched(
      PRE_OPTION_STREAMER_DIAGNOSTICS, fs.readFileSync(path.join(ROOT, 'js/portfolio/backend-positions-enriched.js'), 'utf8'))
  : PRE_OPTION_STREAMER_DIAGNOSTICS;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoRsQualityCheck(LIVE_INDEX, MODULE);

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
// not only the first. The shipped scan above is kept so the contract can measure
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the
// missing underlyings gate predicted the document, the residual monolith and the
// script count this contract measures, so the two cycles are joined by numbers.
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
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single LF');
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest');
ok(BODY.endsWith(BODY_ENDING), '…ending on a real line of code');
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the documentation');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dash…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…and NON_ASCII_CHARS non-ASCII character in all, so the em dash is the whole of it: the RSI sanity comment…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * NON_ASCII_CHARS,
  '…three bytes in UTF-8, which is the whole of the gap between its UTF-8 and UTF-16 lengths');
eq(INDEX.indexOf(BODY), CODE_AT + RAW_AT_IN_CODE,
  '…and it occurs in the document at the offset the monolith coordinate implies');
eq(count(INDEX, BODY), 1, '…exactly once, so the fragment is not ambiguous');

// THE SEAM IS MECHANICAL, and it is checked before anything else is claimed.
eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
  'assertSeam accepts the chosen boundary and returns RAW_END_IN_CODE');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(next.name, NEXT_DECL, '…and the declaration immediately after the cut is NEXT_DECL');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DOC_PREFIX.length), NEXT_DOC_PREFIX,
    '…the comment that begins where the cut ends being NEXT_DOC_PREFIX, a `// ── ` banner…');
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…which is the comment block directly above NEXT_DECL, so the cut ends exactly where the next function\'s documentation begins');
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
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the previous function\'s closing brace');
  eq(OPENINGS[1], RAW_AT_IN_CODE,
    '…the next the first documentation line, the cut: no blank line stands between the brace and the documentation');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last the declaration');
  eq(OPENINGS.slice(1, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES documentation lines are each an opening of their own');
  ok(OPENINGS.every((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() !== ''),
    '…none of them an empty line');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    'while the one position in between that starts mid-line is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what
  // loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the previous function\'s closing brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the five are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the whole comment block documenting the
// function, and nothing else: three comment lines directly above the declaration.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  ok(!/^\/\/ ── /.test(doc), '…and none a `// ── ` banner, so the cut does not open on one');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  ok(doc.indexOf('Returns {pass,sma20,sma30,avgVol,score} or {pass:false}.') >= 0,
    '…and which states what it returns, a claim §7 measures rather than trusts');
}
// WHAT LEAVING IT WOULD HAVE STRANDED. Cutting at the declaration would have left
// the three comment lines behind, fused to the next function's banner with no
// blank line between them.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would have left the documentation fused to the next function\'s own');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '}\n',
    'and the documentation already stands directly against the closing brace above it, with no blank line…');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(clean, FUSED_AFTER_CUT), 1,
    '…so the cut that shipped left that closing brace directly against the next function\'s banner, once');
  eq(clean.indexOf(FUSED_AFTER_CUT), RAW_AT_IN_CODE - 2,
    '…at the place the cut was made, with no blank line between them');
  ok(clean.indexOf(DOC_FIRST_LINE) < 0 && clean.indexOf(DECL_FIRST_LINE) < 0,
    '…and no line of this documentation or declaration behind');
}
// THE SCREEN SAW THE DECLARATION, not the documentation. The screen floors a run
// at RUN_FLOOR units measured from the DECLARATION; this function measures
// DECL_UNITS_FROM_DECLARATION that way, which clears the floor, and the opening
// the screen takes for it is the declaration, three lines below the cut.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION >= RUN_FLOOR, '…at or above RUN_FLOOR, so the floor does not hide it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the shipped screen enumerates exactly CANDIDATES_AT_DECLARATION run that ends where this cut does and opens at its declaration…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does, so the cut was a refinement of a row the screen has');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one call back, one foundation reference, both directions measured');
// ─────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a function, so this layer ships no mutable binding');
  ok(!/^async function /.test(DECL_FIRST_LINE), '…a SYNCHRONOUS one');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES reference from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly the one name _rsAvgVol');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in: CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call site');
eq(REC.sites, [CONSUMER_SITE_AT], '…at CONSUMER_SITE_AT');
eq(CODE.slice(CONSUMER_SITE_AT - 'var q='.length, CONSUMER_SITE_AT), 'var q=',
  '…the consumer binding the result to `q` and testing `q.pass`, which is all it does with it');
ok(CODE.slice(CONSUMER_SITE_AT, CONSUMER_SITE_AT + 200).indexOf('if(!q.pass)return;') >= 0,
  '…a rejection ending that iteration of its scan');
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.end < RAW_AT_IN_CODE || keeper.start > RAW_END_IN_CODE, '…the consumer sitting outside the cut');
  ok(CONSUMER_SITE_AT > keeper.start && CONSUMER_SITE_AT < keeper.end, '…and its site inside its body');
  ok(hostOf(CONSUMER_SITE_AT) && hostOf(CONSUMER_SITE_AT).name === CONSUMER, '…with an enclosing declaration of its own');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, which byConsumerSplit leaves out…');
  eq(split.foundationNames, FOUNDATION_NAMES, '…all of them to the one name FOUNDATION_NAMES…');
  eq(MODULE_OWNERS.get(FOUNDATION_NAMES[0]), FOUNDATION_MODULE, '…declared in FOUNDATION_MODULE, which has shipped');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, two below the byConsumer');
}
// THE ONE CALL BACK INTO THE MONOLITH IS MADE WHEN THE FUNCTION IS CALLED, never
// when it loads.
{
  const avg = BY_NAME.get('_rsAvgVol');
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), '_rsAvgVol').length, AVGVOL_REFERENCES,
    'the body names _rsAvgVol at AVGVOL_REFERENCES place…');
  ok(BODY.indexOf('var avgVol=_rsAvgVol(cs);') >= 0, '…a plain call, its result tested for null and against a floor…');
  eq(avg.form, 'function', '_rsAvgVol is a top-level function of the monolith…');
  eq(avg.start, AVGVOL_AT, '…declared at AVGVOL_AT…');
  ok(avg.end < RAW_AT_IN_CODE, '…above the cut, so the monolith still owns it after the move…');
  ok(avg.start >= REGION_AT && avg.end < REGION_END, '…inside the very banner region the cut closes, one of the owners the cut leaves behind');
  eq(propertyWriteBases(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).filter((b) => b === '_rsAvgVol').length, 0,
    '…and the body only CALLS it: nothing is written to it');
  eq(propertyWriteBases('function f() { _rsAvgVol.cache = 1; }').filter((b) => b === '_rsAvgVol').length, 1,
    'control — the same scan finds a planted write to a property of it, so that zero is a measurement');
  ok(BODY.indexOf('smA(closes,20)[n]') >= 0 && BODY.indexOf('smA(closes,30)[n]') >= 0,
    'the two calls to smA are the foundation references, both inside the `try`…');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time, _rsAvgVol and smA included');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
//
// THE SCAN THIS FILE INHERITED WAS WRONG HERE, and it was the scan, not the
// function. It treats only the first name of a `var` list as local, so
// `var sma20=smA(closes,20)[n], sma30=smA(closes,30)[n];` leaves `sma30` reading
// as a global being written. The hit is measured below, then the corrected scan,
// which reads every declarator. A zero from either needs a control that finds a
// violation.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignment to a name it takes for a global…');
  eq(nonLocalAssignmentsUncorrected(BODY), UNCORRECTED_SCAN_NAMES, '…to exactly UNCORRECTED_SCAN_NAMES…');
  ok(/var sma20=smA\(closes,20\)\[n\], sma30=smA\(closes,30\)\[n\];/.test(BODY),
    '…which the body declares in a comma-separated var list');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the body does not own…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document');
  // CONTROLS: the corrected scan DOES find a planted violation and still ignores
  // every declarator, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — it finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the previous contract named it, and two openings tied at the best score the screen states');
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
  ok(PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS < RAW_AT_IN_CODE,
    '…and it sat entirely BEFORE this cut, so every offset here is earlier than the one it published, by PREVIOUS_RAW_CHARS');
  const listed = listOf('RUNNERS_UP');
  eq(listed.length, RUNNERS_UP.length, 'the previous contract published as many runners-up as this contract does…');
  eq(listed[0], [DECL_AT_IN_CODE + PREVIOUS_RAW_CHARS, BY_CONSUMER_SPLIT, FULL_NINE, DECL_UNITS_FROM_DECLARATION],
    '…the first of them being THIS cut\'s row, at the same byConsumerSplit, raw nine and length, moved by PREVIOUS_RAW_CHARS…');
  eq(listed.slice(1).map((r) => [r[0] - PREVIOUS_RAW_CHARS, r[1], r[2], r[3]]), RUNNERS_UP.slice(0, 3),
    '…and the other three, moved the same way, being exactly the top of RUNNERS_UP now, which gains a fourth from beneath');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidates at 2, this cut\'s row among them');
  eq(hiddenRows.length, HIDDEN_ROWS, 'the pass over runs the screen skipped for being short has HIDDEN_ROWS rows…');
  const hiddenClean = hiddenRows.filter((c) => runsNothingAtLoad(c.load));
  eq(hiddenClean.length, HIDDEN_CLEAN_ROWS, '…HIDDEN_CLEAN_ROWS of which run nothing at load');
  ok(hiddenRows.every((c) => c.unitsDecl < RUN_FLOOR && c.unitsDoc >= RUN_FLOOR),
    '…every one below RUN_FLOOR from its declaration and at or above it from its documentation');
  ok(hiddenRows.every((c) => !candidateRuns.some((s) => s.lo === c.lo && s.hi === c.hi)),
    '…and not one of them is a row the shipped screen already has');
  eq(hiddenClean.filter((c) => c.bcs <= 1).length, HIDDEN_SCORE_ONE,
    'HIDDEN_SCORE_ONE of them score 1 on byConsumerSplit: neither enumeration holds a row at 1…');
  const atTwo = hiddenClean.filter((c) => c.bcs === 2).sort((a, b) => a.nine - b.nine || a.lo - b.lo || a.hi - b.hi);
  eq(atTwo.length, HIDDEN_SCORE_TWO, '…and HIDDEN_SCORE_TWO score 2');
  eq(atTwo.map((c) => [c.lo, c.hi, c.unitsDecl, c.unitsDoc, c.nine, c.bcs, c.p.names]),
    HIDDEN_SCORE_TWO_ROWS, '…those being exactly HIDDEN_SCORE_TWO_ROWS, none of them this cut, which the SCREEN holds');
  // EVERY ROW AT THE BEST TIER, over the screen and the pass together.
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    'in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit…');
  const best = rows.filter((r) => r.bcs <= BY_CONSUMER_SPLIT).map((r) => [r.lo, r.hi, r.nine, r.bcs])
    .sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
  eq(best, BEST_TIER_ROWS, '…and the rows AT it are exactly BEST_TIER_ROWS');
  eq(new Set(best.map((r) => r[0])).size, OPENINGS_AT_TWO_OR_BELOW,
    '…over OPENINGS_AT_TWO_OR_BELOW distinct openings');
  eq(best.length, OPENINGS_AT_TWO_OR_BELOW, '…counted over the rows as well as the openings, so a second row at one opening could not hide');
  ok(best.every((r) => r[2] >= FULL_NINE), '…not one of them with a raw nine below FULL_NINE');
  const atBestNine = best.filter((r) => r[2] === FULL_NINE);
  eq(atBestNine.map((r) => r[0]), [DECL_AT_IN_CODE, TIE_OPENING],
    '…and exactly TWO of them were AT FULL_NINE: this cut\'s row, and TIE_OPENING. That was a tie on both measures the score carries');
  // THE TIE, MEASURED ON THE COUNT byConsumerSplit LEAVES OUT, and on the rest.
  const tieRow = hiddenClean.filter((c) => c.lo === TIE_OPENING)[0];
  eq(tieRow.p.names, [TIE_NAME], 'the other opening is the one function TIE_NAME…');
  eq(tieRow.unitsDoc, TIE_UNITS, '…TIE_UNITS units measured from its documentation…');
  eq(tieRow.split.foundation, TIE_FOUNDATION_OUTBOUND,
    '…with TIE_FOUNDATION_OUTBOUND references to foundation modules, the count byConsumerSplit leaves out…');
  eq(tieRow.split.foundationNames, TIE_FOUNDATION_NAMES, '…to the names TIE_FOUNDATION_NAMES…');
  eq(tieRow.split.foundation, FOUNDATION_OUTBOUND,
    '…which is the same count as this cut\'s FOUNDATION_OUTBOUND, so that measure does not separate them either');
  eq(tieRow.p.deps.length, MONOLITH_DEPENDENCIES.length,
    '…and each has the same number of monolith dependencies, ONE');
  eq(consumersOf(tieRow.p).length, consumersOf(REC).length, '…and the same number of consumers, ONE');
  // THE ORDER THE SCREEN PUBLISHES breaks the tie, and nothing else does.
  const bestPerAll = new Map();
  for (const r of rows) {
    const b = bestPerAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPerAll.set(r.lo, r);
  }
  const rankedAll = [...bestPerAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq(rankedAll.slice(0, 2).map((r) => [r.lo, r.bcs, r.nine]),
    [[DECL_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE], [TIE_OPENING, BY_CONSUMER_SPLIT, FULL_NINE]],
    'ranked by (byConsumerSplit, nine, units), the order the screen publishes, this cut\'s row comes first and TIE_OPENING second…');
  eq(rankedAll[1].units - rankedAll[0].units, TIE_UNITS - DECL_UNITS_FROM_DECLARATION,
    '…the whole of the difference being the length key');
  eq(TIE_UNITS - DECL_UNITS_FROM_DECLARATION, 13, '…which is 13 units');
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
    'the four best other openings, by (byConsumerSplit, nine, units), are exactly RUNNERS_UP');
  eq(ranked[0][0], TIE_OPENING, '…the first being the opening this cut ties with');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would have cost: the owners above, the owners below, the region');
// ─────────────────────────────────────────────────────────────────────────────
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  eq((blockAbove(d) || { start: d.start }).start, lo, 'taking ' + name + ' with its documentation, if it has any, opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  const p = profileOf([lo, BODY_END_IN_CODE]);
  eq([RAW_END_IN_CODE - lo, p.nine, byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), p.deps.length],
    [units, nine, bcs, deps], '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(runsNothingAtLoad(loadTimeProfile(lo, BODY_END_IN_CODE)), '…and it too runs nothing at load');
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine and no better on byConsumerSplit');
}
eq(EXTENSIONS_UP.every((e, i) => i === 0 || (e[3] > EXTENSIONS_UP[i - 1][3] && e[2] > EXTENSIONS_UP[i - 1][2])), true,
  'each further owner taken above raises the raw nine and the length again, so no stopping point is better');
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
for (const [name, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const d = BY_NAME.get(name);
  const hb = downEnd(d);
  const hr = assertSeam(CODE, RAW_AT_IN_CODE, hb);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq([hr - RAW_AT_IN_CODE, p.nine, byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), p.deps.length],
    [units, nine, bcs, deps], 'running the cut down through ' + name + ' costs the pinned units, nine, byConsumerSplit and dependencies');
  ok(runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb)), '…a run that also runs nothing at load');
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…and is worse on the raw nine, and no better on byConsumerSplit');
}
// THE FOUR OWNERS DIRECTLY BELOW CANNOT BE TAKEN. Each ends directly against the
// declaration after it, so no cut can end there, and the refusal is asserted by
// name for every one of them.
{
  const below = DECLS.filter((d) => d.start >= RAW_END_IN_CODE).map((d) => d.name);
  eq(below.slice(0, SEAM_ILLEGAL_DOWN.length), SEAM_ILLEGAL_DOWN,
    'the owners directly below the cut are SEAM_ILLEGAL_DOWN, in that order…');
  eq(below[SEAM_ILLEGAL_DOWN.length], EXTENSIONS_DOWN[0][0],
    '…and the first owner after them is the first of EXTENSIONS_DOWN');
  eq(below[0], NEXT_DECL, '…the first of them being NEXT_DECL');
  for (const name of SEAM_ILLEGAL_DOWN) {
    const hb = downEnd(BY_NAME.get(name));
    throwsWith(() => assertSeam(CODE, RAW_AT_IN_CODE, hb), SEAM_ILLEGAL_ERROR,
      name + ' is not a legal end for this cut: the seam rule refuses it by name');
    eq(CODE.slice(hb - 2, hb), '}\n', '…it ends on its closing brace…');
    ok(CODE[hb] !== '\n', '…and what follows begins at once, with no blank line between them');
  }
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner
// region" would forbid cutting any of it. This cut is the LAST owner of its
// region, so it closes the region and leaves the banner and four owners above.
{
  const reg = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, above the cut');
  eq(reg.end, REGION_END, '…and ends at REGION_END, which is where the cut ends');
  eq(reg.end, RAW_END_IN_CODE, '…so the cut CLOSES its region');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the shared helpers banner, which the cut leaves where it is');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…this function being owner number OWNER_POSITION of them, the last');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…and OWNER_BEFORE the one above it');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependency');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  // WHAT THE CUT LEAVES BEHIND. The banner is above the cut, so every owner left
  // in the region keeps it.
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(clean.slice(REGION_AT, REGION_AT + BANNER_LINE_PREFIX.length), BANNER_LINE_PREFIX,
    'after the cut the region\'s banner is where it was…');
  eq(scanTopLevelDeclarations(clean).filter((d) => d.start >= REGION_AT && d.end <= RAW_AT_IN_CODE).length, REGION_OWNERS - 1,
    '…over the REGION_OWNERS - 1 owners left in it');
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
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  eq(CLEAN_CANDIDATES, Number(prev.match(/^const CLEAN_CANDIDATES = (\d+);$/m)[1]),
    '…the same number the previous contract counted, although a cut left the monolith between the two');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => c.hi >= BODY_END_IN_CODE),
  '…and every run the screen opens there is at least as long as the cut, since the cut is one of them or contains it');

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, calls _rsAvgVol and smA when called, and applies each gate in turn');
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
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const FLOORS = { minPrice: 5, minVol: 100000 };
  const flat = (n, close) => Array.from({ length: n }, () => ({ c: close === undefined ? 100 : close }));
  // A HARNESS: the function run in a fresh VM context whose _rsAvgVol and smA are
  // fakes this file controls and records. Nothing real is read.
  const harness = (opts = {}) => {
    const calls = { avg: [], sma: [] };
    const sandbox = {
      _rsAvgVol: (cs) => { calls.avg.push(cs); return opts.avgVol === undefined ? 1e6 : opts.avgVol; },
      smA: (arr, p) => {
        calls.sma.push(p);
        const v = p === 20 ? (opts.sma20 === undefined ? 105 : opts.sma20) : (opts.sma30 === undefined ? 100 : opts.sma30);
        return arr.map(() => v);
      },
    };
    const c = vm.createContext(sandbox);
    // THE SHIPPED MODULE is what loads here, not a slice of the reconstructed
    // monolith: §9 proves the two are the same bytes.
    vm.runInContext(MODULE, c);
    const fn = vm.runInContext(VM_GLOBALS[0], c);
    return { calls, check: (candles, mode, price, f, rsi, bid, ask) => plain(fn(candles, mode, price, f, rsi, bid, ask)) };
  };
  const passing = (opts, over) => {
    const h = harness(opts);
    const a = Object.assign({ candles: flat(40), mode: 'STRONG', price: 105, f: FLOORS, rsi: 60, bid: null, ask: null }, over || {});
    return Object.assign(h, { res: h.check(a.candles, a.mode, a.price, a.f, a.rsi, a.bid, a.ask) });
  };
  // LOADS BARE: declaring the function needs nothing.
  {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(MODULE, ctx);
    eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
      'it LOADS in a completely bare VM and declares exactly its one owner');
    const bare = plain(vm.runInContext(VM_GLOBALS[0], ctx)(flat(40), 'STRONG', 105, FLOORS, 60, null, null));
    eq(bare, { pass: false },
      '…and CALLED with neither _rsAvgVol nor smA it does not throw: the `try` turns the ReferenceError into {pass:false}…');
    eq(passing().res.pass, true,
      '…which is what a rejection looks like, so a missing dependency cannot be told from a failed gate; the same call with both supplied PASSES');
  }
  // THE RESULT OF A PASS, and the calls made to get it.
  {
    const r = passing();
    const expectScore = Math.min(30, Math.log10(Math.max(1e6, 1)) * 5) + ((105 - 100) / 100) * 100;
    eq(r.res, { pass: true, sma20: 105, sma30: 100, avgVol: 1e6, score: expectScore, rsi: 60 },
      'a passing symbol gets back its two means, its volume, its score and the rsi it was given…');
    eq(r.calls.sma, [20, 30], '…having asked smA for the 20-session mean and then the 30-session mean…');
    eq(r.calls.avg.length, 1, '…and _rsAvgVol once');
    const documented = ['pass', 'sma20', 'sma30', 'avgVol', 'score'];
    eq(Object.keys(r.res).filter((k) => documented.indexOf(k) < 0), ['rsi'],
      'the documentation names five of the six keys; the sixth is rsi, which the same comment says is computed from the approved closes');
    eq(passing({}, { mode: 'WEAK', rsi: 40 }).res.pass, false, 'in WEAK mode the same means are the wrong way round, and it fails…');
    const w = passing({ sma20: 95, sma30: 100 }, { mode: 'WEAK', price: 90, rsi: 40 }).res;
    eq(w.score, Math.min(30, Math.log10(1e6) * 5) + ((100 - 95) / 100) * 100,
      '…while WEAK numbers pass, scored on the 30-session mean over the 20-session mean');
    const low = passing({ avgVol: 1e5 }).res.score;
    eq(low, Math.min(30, Math.log10(1e5) * 5) + ((105 - 100) / 100) * 100, 'a smaller volume scores below the cap of 30 on the volume term…');
    ok(low < r.res.score, '…and the cap holds the larger volume at 30');
    const tiny = passing({ avgVol: 0.5 }, { f: {} }).res;
    eq([tiny.pass, tiny.avgVol, tiny.score], [true, 0.5, 0 + ((105 - 100) / 100) * 100],
      'a volume under 1 is clamped to 1 in the score only: it is returned as it was, and the floors default to zero');
  }
  // THE GATES, in the order the body applies them.
  {
    eq(passing({}, { candles: null }).res, { pass: false }, 'no candles fails…');
    eq(passing({}, { candles: flat(31) }).res, { pass: false }, '…and so do 31…');
    eq(passing({}, { candles: flat(32) }).res.pass, true, '…while 32 are enough');
    const lowPrice = passing({}, { price: 4.99 });
    eq(lowPrice.res, { pass: false }, 'a price under the floor fails…');
    eq([lowPrice.calls.avg.length, lowPrice.calls.sma.length], [0, 0], '…before _rsAvgVol or smA is called');
    const noVol = passing({ avgVol: null });
    eq([noVol.res, noVol.calls.sma.length], [{ pass: false }, 0], 'a null volume fails, before smA is called…');
    eq(passing({ avgVol: 99999 }).res, { pass: false }, '…and so does a volume under the floor…');
    eq(passing({ avgVol: 100000 }).res.pass, true, '…while one exactly at the floor passes');
    eq(passing({}, { bid: 100, ask: 101 }).res, { pass: false }, 'a quote spread over 0.6% of the mid fails…');
    eq(passing({}, { bid: 100, ask: 100.5 }).res.pass, true, '…one under it passes…');
    eq(passing({}, { bid: 100, ask: null }).res.pass, true, '…a quote missing one side is not checked…');
    eq(passing({}, { bid: 0, ask: 200 }).res.pass, true, '…and neither is one with a zero bid');
    const jump = (last, earlier) => {
      const cs = flat(40, 100);
      cs[39] = { c: last };
      if (earlier !== undefined) cs[36] = { c: earlier };
      return cs;
    };
    eq(passing({}, { candles: jump(121) }).res, { pass: false }, 'a jump of 21% in the last session fails…');
    eq(passing({}, { candles: jump(120) }).res.pass, true, '…one of exactly 20% passes…');
    {
      const cs = flat(40, 100); cs[37] = { c: 130 }; cs[38] = { c: 130 }; cs[39] = { c: 130 };
      eq(passing({}, { candles: cs }).res, { pass: false }, 'a jump into the third-last session still counts…');
      const old = flat(40, 100); old[36] = { c: 130 }; old[37] = { c: 130 }; old[38] = { c: 130 }; old[39] = { c: 130 };
      eq(passing({}, { candles: old }).res.pass, true, '…but a jump before the last three sessions does not');
    }
    eq(passing({ sma20: null }).res, { pass: false }, 'a missing 20-session mean fails…');
    eq(passing({ sma30: null }).res, { pass: false }, '…and so does a missing 30-session mean');
    eq(passing({ sma20: 100, sma30: 90 }, { price: 141 }).res, { pass: false }, 'in STRONG mode a price 41% over the 20-session mean fails…');
    eq(passing({ sma20: 100, sma30: 90 }, { price: 140 }).res.pass, true, '…and 40% over passes');
    eq(passing({ sma20: 100, sma30: 110 }, { mode: 'WEAK', price: 59, rsi: 40 }).res, { pass: false }, 'in WEAK mode a price 41% under fails…');
    eq(passing({ sma20: 100, sma30: 110 }, { mode: 'WEAK', price: 60, rsi: 40 }).res.pass, true, '…and 40% under passes');
    eq(passing({ sma20: 100, sma30: 100 }, { price: 105 }).res, { pass: false }, 'STRONG needs the 20-session mean above the 30-session mean, not equal to it…');
    eq(passing({ sma20: 105, sma30: 100 }, { price: 100 }).res, { pass: false }, '…and the price above the 30-session mean, not at it');
    eq(passing({ sma20: 105, sma30: 100 }, { mode: 'WEAK', price: 90, rsi: 40 }).res, { pass: false }, 'WEAK needs the opposite, and STRONG numbers fail it');
    eq(passing({ sma20: 95, sma30: 100 }, { mode: 'other', price: 90, rsi: 40 }).res.pass, true,
      'a mode that is neither takes the WEAK trend branch and meets no distance or RSI limit…');
    eq(passing({}, { mode: 'other', rsi: 40 }).res, { pass: false }, '…so STRONG numbers fail under it');
    eq([44, 45, 82, 83].map((rsi) => passing({}, { rsi }).res.pass), [false, true, true, false],
      'STRONG accepts an RSI from 45 to 82 inclusive…');
    const wk = (rsi) => passing({ sma20: 95, sma30: 100 }, { mode: 'WEAK', price: 90, rsi }).res.pass;
    eq([17, 18, 55, 56].map(wk), [false, true, true, false], '…WEAK from 18 to 55 inclusive…');
    const nr = passing({}, { rsi: null }).res;
    eq([nr.pass, nr.rsi], [true, null], '…and a missing RSI is not checked, and comes back as null');
    eq(passing({}, { candles: { length: 40 } }).res, { pass: false },
      'a candles value with no `map` throws inside the `try` and fails the same way');
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
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is still SMALLEST_LAYER_CHARS units, and it is not this one…');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, '…this module being larger than that…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    '…measured against every layer rather than inferred from the first: it ranks SIZE_RANK by size…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, LAYERS_SMALLER_THAN_THIS_CUT,
    '…with LAYERS_SMALLER_THAN_THIS_CUT layers smaller than it…');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…and LAYERS_LARGER_THAN_THIS_CUT layers larger…');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 1, '…none of the others exactly its size, the one at that length being itself…');
  eq(sizes[SIZE_RANK - 1], MODULE.length, '…the layer at that rank in size order being this module…');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in,
  // rather than being left to make the total drift by one forever.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  // THE TWO CHAIN-WIDE SHAPE COUNTS, over the whole chain AND over the chain
  // before this layer. The audit forecast that NEITHER would move; both are
  // asserted as comparisons between two measurements rather than carried forward
  // as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(prior.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is not, asserted of the module directly: it holds non-ASCII text…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is the same: it did not move');
  eq(prior.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: it opens on its documentation…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is the same: it did not move');
  // THE OTHER CHAIN-WIDE COUNT THAT MOVED: layers whose contract pins a non-empty
  // MONOLITH_DEPENDENCIES. Counted over the suite with this contract in it and
  // again without it, then compared with the figure the contract that carries it
  // pins.
  const contractsPinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => ({ f, src: fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8') }))
    .filter(({ src }) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    }).map((x) => x.f);
  ok(LATER_CONTRACTS_WITH_A_DEPENDENCY.every((f) => contractsPinning.indexOf(f) >= 0),
    'every layer cut after this one that pins a dependency is among the contracts counted…');
  const atThisLayer = contractsPinning.filter((f) => LATER_CONTRACTS_WITH_A_DEPENDENCY.indexOf(f) < 0);
  eq(atThisLayer.length, LAYERS_WITH_A_DEPENDENCY,
    '…and LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES at this layer, counted over the suite without them…');
  ok(atThisLayer.indexOf(path.basename(CONTRACT_REL)) >= 0, '…this contract being one of them…');
  eq(atThisLayer.length - 1, PRIOR_LAYERS_WITH_A_DEPENDENCY,
    '…so the count before this layer was PRIOR_LAYERS_WITH_A_DEPENDENCY, and it moved up by exactly one');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]),
  LAYERS_WITH_A_DEPENDENCY + LATER_CONTRACTS_WITH_A_DEPENDENCY.length,
  '…and the contract that carries the live figure pins it with the later layers included');
  ok(MONOLITH_DEPENDENCIES.length > 0, '…this layer pinning a non-empty list, which is why it moved');
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

section('9. The relocation is the whole of the production change');
// ─────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  // THE AUDIT ASSERTED THAT NOTHING MOVED. The phase that shipped this layer
  // moved exactly the audited bytes and nothing else, so the claim is inverted
  // rather than dropped. It now reads against a base that a LATER layer has also
  // moved past, so the footprint is the document, this layer's module, and the
  // module of every layer cut after it.
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL, 'js/portfolio/backend-positions-enriched.js', 'js/portfolio/portfolio-option-streamer-diagnostics.js', 'js/services/scanner-dss-chart-load-guard.js', 'js/services/swing-chart-cache-helpers.js', 'js/services/scanner-stock-scoring.js'].sort(),
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
  eq(firstLineOf(MODULE), DOC_FIRST_LINE,
    '…and OPENS on the documentation, DOC_FIRST_LINE, the boundary §2 defends');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * NON_ASCII_CHARS,
    '…its UTF-8 length exceeding its UTF-16 length by two bytes for each of its NON_ASCII_CHARS three-byte characters, since it is not pure ASCII');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…and that one character is an em dash: EM_DASHES of them');
}
// THE LOAD ORDER. The module loads bare and calls _rsAvgVol and smA only when
// called (§7), so the tag's position is not load-bearing for loading. It is pinned
// all the same: last of the local scripts, immediately before the inline monolith,
// whose one call site stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/services/scanner-dxlink-prices.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, which calls it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name), 0, 'the declaration of ' + name + ' has left the monolith…');
  }
  eq(OWNERS_EXPECTED.map((n) => (LIVE_MONOLITH.match(new RegExp('\\b' + n + '\\(', 'g')) || []).length),
    [1], '…leaving exactly one call site for it behind');
  eq(OWNERS_EXPECTED.length, CONSUMER_SITES, '…CONSUMER_SITES in all');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its one owner and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === '_rsAvgVol').length, 1,
    '…while _rsAvgVol stays declared in the monolith, which owns it');
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
  const E = 'RS_QUALITY_CHECK_UNDO_';
  throwsWith(() => UNDO.undoRsQualityCheck(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,988 units, not 1,987 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('0.006', '0.007');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: this module holds one three-byte
    // character, so its UTF-8 and UTF-16 lengths already differ, and swapping a 1-byte letter
    // for a 2-byte one keeps the length and the line-feed count and moves only
    // the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoRsQualityCheck(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoRsQualityCheck(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoRsQualityCheck(INDEX, MODULE),
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
console.log('RS_QUALITY_CHECK_CONTRACT_OK');
}

main();
