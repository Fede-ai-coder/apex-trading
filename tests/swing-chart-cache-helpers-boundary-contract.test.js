'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SWING CHART CACHE HELPERS — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [574609,576169) in monolith coordinates — 1,560 units raw and
// 1,559 of body, THREE owners, all synchronous functions — now lives in
// js/services/swing-chart-cache-helpers.js. They sit in the middle of the Swing
// chart-cache region and are the three small helpers between its cache writer and
// its chart resolver: `_swingInvalidateChartCacheSymbol` drops every entry of the
// chart cache that belongs to one symbol, `_swingLogChartCache` prints one compact
// line for a cache decision, and `_swingBackendOutcome` maps a backend reader's
// failure reason onto a provenance code. The block has no documentation above its
// first function, and no blank line stood above it either: the closing brace of
// the owner above was the line directly before it.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #504 is now proved by the
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
// first was this one. The cut that contract shipped sat BEFORE this opening in
// the monolith, so this opening was earlier than the one it published by that
// cut's raw length, 2,153 units: of the other three, one sat before that cut and
// did not move, and two sat after it and moved by the same amount. §4 checks the
// published list against the reconstructed base.
//
// ── PART TWO: A THREE-WAY TIE AT THE BEST SCORE THE SCREEN COULD STATE ─────
//
// Over the screen and the pass over its sub-floor runs together, §4 counts no row
// whose byConsumerSplit is below 2, and exactly THREE rows at 2 whose raw nine is
// 6, the lowest raw nine at that score: this opening, the four-owner `bbPos` group
// at the top of the file, and the Directional Chart 1D renderer pair. They tied on
// both measures the score carries. The counts the score does not carry differ
// between them, and §4 pins the differences. The audit did not invent a measure to
// break a tie the measures do not break: it took the order the screen itself
// publishes — byConsumerSplit, then raw nine, then length ascending — which put
// this opening first, and published the other two as the next candidates. The
// claim is scoped to the two enumerations.
//
// ── PART THREE: THE SCREEN HELD THIS ROW, AND IT HAS NO DOCUMENTATION ──────
//
// 1,559 units from the declaration, over the 1,500 floor by 59, and with no
// comment lines above it the declaration is also where the cut opens. §2 measures
// that the screen enumerates exactly one run opening there and ending where the
// cut ends, and that the pass over sub-floor runs holds none.
//
// ── PART FOUR: THE FIRST OWNER HAS NO CALLER, AND THE ONLY DELETE IS INVISIBLE ─
//
// `_swingInvalidateChartCacheSymbol` is referenced nowhere in the monolith outside
// its own declaration: not in code, not in generated markup, not in a sibling
// module. The profile's five inbound sites are all the consumer's, four calls to
// the logger and one to the outcome classifier. And the block changes shared
// state: the invalidator removes entries from `S.swing.chartCache` with
// `delete`, which an outbound scan that looks for assignments cannot see. §3 measures it with a scan for `delete`, with
// a control that finds a planted one, and shows who else writes that object: a
// resident writer that assigns entries and a resident invalidator that deletes one
// entry, both of which stayed.
//
// ── PART FIVE: THE SIBLING ABOVE IS PRICED, AND FIVE SMALLER RUNS SCORE BETTER ─
// ── BELOW THE FLOOR ────────────────────────────────────────────────────────
//
// `_swingInvalidateChartCacheEntry`, directly above, is the entry-scoped twin of
// the symbol-scoped invalidator, and the comment above it describes both. The cut
// left it, and the comment, in the monolith. §5 prices taking it along and prices
// EVERY owner above it in the region: none is better. §5 then prices the six runs
// that the three owners make between them, one of which is the cut. The other five
// are all under the floor, all score a lower raw nine than the cut, and four of
// them score 1 on byConsumerSplit, a score neither enumeration holds. The cut took
// the one the screen holds. That was the floor's choice, not a statement that the
// coupling is lowest there, and the paragraph says so.
//
// ── PART SIX: THE CUT FUSED TWO LINES THE MONOLITH KEPT APART ──────────────
//
// The seam accepts TWO line starts between the owner above and the first
// declaration: that owner's closing brace, which does not parse, and the
// declaration. With no blank line above the block, the single structural
// separator that left with it is the blank line BELOW it, so the closing brace of
// the owner above ends up on the line directly before the next function's
// documentation. §2 measures the join and that the reconstructed monolith held it
// nowhere.
//
// ── PART SEVEN: ONE MONOLITH DEPENDENCY, ONE TRY, AND A TABLE ──────────────
//
// The invalidator reads the monolith's shared state `S`, a top-level `const` with
// 969 references in 201 functions, so it is the one owner that THROWS a
// ReferenceError when called bare. The logger swallows everything, including a
// console that throws. The classifier is pure. §7 runs the SHIPPED module against
// fakes, not a slice of the reconstruction, and walks every branch, including the
// classifier's whole decision table.
//
// ── NO LOAD-ORDER CONSTRAINT, STATED AT THE LEVEL IT HOLDS ─────────────────
//
// The module loads in a bare VM; only CALLING the invalidator needs `S` in scope,
// and the one consumer, `_swingGetChartCandles`, is an async function declaration
// that stays in the monolith. §7 shows those facts. §9 pins where the tag sits all
// the same — after every other local script and immediately before the inline
// monolith.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// §8 ranks it by size against the fifty-five layers the chain now holds: it is the
// SMALLEST of them, which §8 measures against every layer rather than asserting.
// Its body is pure ASCII, so the pure-ASCII count DID move, by one; it does not
// open on a banner, so that count did NOT; and the count of layers that pin a
// non-empty monolith dependency DID move, by one. §8 measures all three.
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
const UNDO = require('./lib/swing-chart-cache-helpers-undo.js');
// The layer cut AFTER this one, peeled off before this layer's own document is
// reconstructed. Newest-first, which is the rule the whole chain follows.
const PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U = require('./lib/portfolio-backend-squeeze-extract-undo.js');
const PORTFOLIO_REGIME_BADGE_HTML_U = require('./lib/portfolio-regime-badge-html-undo.js');
const JOURNAL_EXPIRY_AUDIT_U = require('./lib/journal-expiry-audit-undo.js');
const PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U = require('./lib/portfolio-stale-mark-squeeze-state-undo.js');
const SCANNER_DSS_1D_CHART_U = require('./lib/scanner-dss-1d-chart-undo.js');
const SCANNER_STOCK_SCORING_U = require('./lib/scanner-stock-scoring-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/services/swing-chart-cache-helpers.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = 'ec323ea';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'b514317';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '0036e3c';
const BASE_CHARS = 1434053;
const BASE_UTF8 = 1462538;
const BASE_LF = 24757;
const BASE_SHA256 = '2152be03332cf4f65cec3e209f4ba03ba90bdbf84160b27d98c7647d31116261';
const LOCAL_SCRIPTS = 98;
const TEST_FILE_COUNT = 189;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-swing-chart-cache-helpers-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/swing-chart-cache-helpers-audit.spec.js';
const CONTRACT_REL = 'tests/swing-chart-cache-helpers-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/swing-chart-cache-helpers-contract.spec.js';
const UNDO_REL = 'tests/lib/swing-chart-cache-helpers-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'b514317';
const CONTRACT_SPEC_MUTANTS = 158;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 51;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/scanner-dss-chart-load-guard-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 156;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/swing-chart-cache-helpers-audit.spec.js';
const RETIRED_MUTANTS = 150;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115899;
const CODE_CHARS = 1318128;
const TOP_LEVEL_DECLS = 903;
const OWNER_REGIONS = 116;

// ── The region ───────────────────────────────────────────────────────────────
// It opens on the declaration: these functions have no documentation above the
// first of them. No blank line stood above it either.
const RAW_AT_IN_CODE = 574609;
const DECL_AT_IN_CODE = 574609;
const RAW_END_IN_CODE = 576169;
const BODY_END_IN_CODE = 576168;
const RAW_CHARS = 1560;
const BODY_CHARS = 1559;
const BODY_UTF8 = 1559;
const BODY_LF = 31;
const BODY_SHA256 = '6ac31c9157421092c0170a7d94865c1d2050c18409380e9475dd35ba8f338282';
const BODY_ENDING = '}\n';
const DECL_FIRST_LINE = 'function _swingInvalidateChartCacheSymbol(symbol) {';
const EM_DASHES = 0;
const NON_ASCII_CHARS = 0;
const NEXT_DECL = '_swingGetChartCandles';

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 3;
const OWNERS_EXPECTED = ['_swingInvalidateChartCacheSymbol', '_swingLogChartCache', '_swingBackendOutcome'];
const OWNER_SIZES = [343, 159, 750];
const INVALIDATOR = '_swingInvalidateChartCacheSymbol';
const LOGGER = '_swingLogChartCache';
const CLASSIFIER = '_swingBackendOutcome';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 31;
const CODE_LINES = 21;
const COMMENT_LINES = 8;
const BLANK_LINES = 2;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the owner above and the declaration the seam accepts TWO line starts:
// that owner's closing brace, which is not valid JavaScript, and the declaration.
// There is no blank line and there is no documentation.
const OWNER_BEFORE = '_swingInvalidateChartCacheEntry';
const BRACE_OPENING = 574607;
const MID_LINE_OPENING = 574608;
const SEAM_LEGAL_OPENINGS = 2;
const PARSING_OPENINGS = 1;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 0;
const CANDIDATES_AT_CUT = 1;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut left behind: the closing brace of the owner above ends up
// directly before the next function's documentation, because the one blank line
// that left with the block is the one BELOW it.
const JOIN_AFTER_CUT = '}\n// Backend-first chart resolver WITH the freshness';
const JOIN_AS_BEFORE = '}\n\n// Backend-first chart resolver WITH the freshness';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 563370;
const REGION_END = 590436;
const REGION_CHARS = 27066;
const REGION_OWNERS = 18;
const OWNER_POSITION = 11;
const BANNER_LINE_PREFIX = '// ─── Swing chart cache + neighbor prefetch';
const WHOLE_REGION_NINE = 24;
const WHOLE_REGION_BCS = 19;
const WHOLE_REGION_CONSUMERS = 6;
const WHOLE_REGION_DEPS = 9;
const WHOLE_REGION_SIB = 2;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies]. The first four of the
// ten owners above it in the region; §5 prices all ten.
const EXTENSIONS_UP = [
  ['_swingInvalidateChartCacheEntry', 574099, 2070, 7, 3, 2],
  ['_swingChartCachePut', 571003, 5166, 13, 8, 6],
  ['_swingChartCacheEvaluate', 569111, 7058, 17, 10, 8],
  ['_swingSeriesSessionDate', 568771, 7398, 19, 11, 8],
];
const OWNERS_ABOVE = 10;
// Below: the five owners of the region under the block. Every end the seam rule
// could take at one of them is refused.
const OWNERS_BELOW = 5;
const DOWN_REFUSED = ['_swingGetChartCandles', '_swingPrefetchNeighbors', '_swingCandleTimeMs', '_swingRowPriceObservedAt', '_swingResolveRenderPrice'];
const REFUSAL_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
// THE SIX RUNS the three owners make between them, one of which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['_swingInvalidateChartCacheSymbol', '_swingInvalidateChartCacheSymbol', 574609, 574953, 344, 1, 1, ['S'], 0],
  ['_swingInvalidateChartCacheSymbol', '_swingLogChartCache', 574609, 575280, 671, 5, 2, ['S'], 4],
  ['_swingInvalidateChartCacheSymbol', '_swingBackendOutcome', 574609, 576168, 1559, 6, 2, ['S'], 5],
  ['_swingLogChartCache', '_swingLogChartCache', 574954, 575280, 326, 4, 1, [], 4],
  ['_swingLogChartCache', '_swingBackendOutcome', 574954, 576168, 1214, 5, 1, [], 5],
  ['_swingBackendOutcome', '_swingBackendOutcome', 575281, 576168, 887, 1, 1, [], 1],
];
const OWN_RUNS_UNDER_FLOOR = 5;
const OWN_RUNS_BELOW_ON_NINE = 5;
const OWN_RUNS_AT_ONE_ON_BCS = 4;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 6;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = '_swingGetChartCandles';
const CONSUMER_SITES = 5;
const CONSUMER_SITES_AT = [577512, 578577, 579458, 581063, 581911];
// Which owner each of the five sites reaches, in order.
const CONSUMER_SITE_OWNERS = [LOGGER, CLASSIFIER, LOGGER, LOGGER, LOGGER];
const CONSUMER_AT = 577108;
const CONSUMER_END = 582403;
const CONSUMER_CHARS = 5296;
const MONOLITH_DEPENDENCIES = ['S'];
const DEPENDENCY_REFERENCES = 5;
const DEPENDENCY_AT = 1067;
const DEPENDENCY_END = 3597;
const DEPENDENCY_CHARS = 2531;
const DEPENDENCY_REFERENCES_IN_MONOLITH = 969;
const DEPENDENCY_HOSTS_IN_MONOLITH = 201;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 5;
const OUTBOUND_MODULE_REFERENCES = 0;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// The scan this file inherited reads only the first name of a `var` list as
// local. This block declares no such list, so it reports nothing here; the
// controls in §3 show it still does where one exists.
const UNCORRECTED_SCAN_HITS = 0;
// THE DELETE. The block removes entries from the chart cache with `delete`.
const BODY_DELETES = 1;
const DELETE_TARGET = 'S.swing.chartCache';
const CACHE_WRITERS = [['_swingChartCachePut', 'assign'], ['_swingInvalidateChartCacheEntry', 'delete'], [INVALIDATOR, 'delete']];
const INVALIDATOR_REFERENCES = 1;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_swingInvalidateChartCacheSymbol', '_swingLogChartCache', '_swingBackendOutcome'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7292;
const SEAM_REJECTED = 2109;
const CANDIDATES = 2896;
const CLEAN_CANDIDATES = 1741;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 5;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor. THIS CUT IS NOT ONE OF THEM: the screen holds it.
const HIDDEN_ROWS = 35;
const HIDDEN_CLEAN_ROWS = 34;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 1;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [743469, 745168, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 6;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit].
const BEST_TIER_ROWS = [
  [71214, 72907, 6, 2],
  [574609, 576168, 6, 2],
  [618165, 621489, 6, 2],
  [70936, 72907, 7, 2],
  [743469, 745168, 7, 2],
  [874822, 876913, 7, 2],
];
const BEST_NINE = 6;
const SECOND_BEST_NINE = 7;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [71214, 2, 6, 1693],
  [618165, 2, 6, 3324],
  [743469, 2, 7, 1699],
  [70936, 2, 7, 1971],
];
// THE TIE: the three rows at the best score, with the counts the score does not
// carry. [opening, closing, units, owners, inbound reference sites, consumers,
// monolith dependencies, foundation references].
const TIE_ROWS = [
  [574609, 576168, 1559, 3, 5, 1, 1, 0],
  [71214, 72907, 1693, 4, 6, 2, 0, 0],
  [618165, 621489, 3324, 2, 0, 0, 2, 4],
];
const TIE_ORDER_BY_UNITS = [574609, 71214, 618165];
// The shipped cut changed the screen: the previous contract's figures less the
// ones measured here. They are NEGATIVE, because the cut took the banner of its
// region and the eight owners it left behind joined the region above, whose runs
// the screen now enumerates.
const DELTA_RAW_RUNS = -98;
const DELTA_SEAM_REJECTED = -64;
const DELTA_CANDIDATES = -36;
const DELTA_CLEAN = 10;
const PREVIOUS_RAW_CHARS = 2153;
const PREVIOUS_RAW_AT = 182656;
// The previous contract's published list, with where each entry sat relative to
// the cut it shipped.
const PREVIOUS_RUNNERS_UP = [
  [576762, 2, 6, 1559],
  [71214, 2, 6, 1693],
  [620318, 2, 6, 3324],
  [745622, 2, 7, 1699],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. The previous smallest layer is now second.
const CHAIN_LENGTH = 55;
const SMALLEST_LAYER_CHARS = 1587;
const SIZE_RANK = 1;
const LAYERS_SMALLER_THAN_THIS_CUT = 0;
const LAYERS_LARGER_THAN_THIS_CUT = 54;
const PRIOR_PURE_ASCII_LAYERS = 6;
const PURE_ASCII_LAYERS = 7;
const LAYERS_OPENING_ON_BANNER = 25;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 21;
const LAYERS_WITH_A_DEPENDENCY = 22;
// The count above is the figure AT THIS LAYER. A layer cut after it could add to the
// live count, so the later contracts are named here and §8 asserts what they pin
// rather than assuming it: the figure that is true of one layer's commit, compared
// with a number that has moved on, is the drift this list exists to prevent.
const LATER_CONTRACTS = ['scanner-stock-scoring-boundary-contract.test.js'];
// The later layers that pin a NON-EMPTY list instead: they ARE among the contracts counted,
// and are set aside to recover the figure at this layer.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['scanner-dss-1d-chart-boundary-contract.test.js', 'portfolio-regime-badge-html-boundary-contract.test.js', 'portfolio-backend-squeeze-extract-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1493;
const INDEX_AFTER = 1432560;
const RESIDUAL_MONOLITH = 1316568;
const LOCAL_SCRIPTS_AFTER = 99;
// The tag's position among the local scripts, zero-based: the last of 99.
const TAG_LOCAL_INDEX = 98;

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



console.log('SWING CHART CACHE HELPERS — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT = PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.undoPortfolioBackendSqueezeExtract(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-backend-squeeze-extract.js'), 'utf8'))
  : HEAD_INDEX;
const PRE_PORTFOLIO_REGIME_BADGE_HTML = PORTFOLIO_REGIME_BADGE_HTML_U.isApplied(PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT)
  ? PORTFOLIO_REGIME_BADGE_HTML_U.undoPortfolioRegimeBadgeHtml(
      PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-regime-badge-html.js'), 'utf8'))
  : PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT;
const PRE_JOURNAL_EXPIRY_AUDIT = JOURNAL_EXPIRY_AUDIT_U.isApplied(PRE_PORTFOLIO_REGIME_BADGE_HTML)
  ? JOURNAL_EXPIRY_AUDIT_U.undoJournalExpiryAudit(
      PRE_PORTFOLIO_REGIME_BADGE_HTML, fs.readFileSync(path.join(ROOT, 'js/services/journal-expiry-audit.js'), 'utf8'))
  : PRE_PORTFOLIO_REGIME_BADGE_HTML;
const PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE = PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.isApplied(PRE_JOURNAL_EXPIRY_AUDIT)
  ? PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.undoPortfolioStaleMarkSqueezeState(
      PRE_JOURNAL_EXPIRY_AUDIT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-stale-mark-squeeze-state.js'), 'utf8'))
  : PRE_JOURNAL_EXPIRY_AUDIT;
const PRE_SCANNER_DSS_1D_CHART = SCANNER_DSS_1D_CHART_U.isApplied(PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE)
  ? SCANNER_DSS_1D_CHART_U.undoScannerDss1dChart(
      PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE, fs.readFileSync(path.join(ROOT, 'js/ui/scanner-dss-1d-chart.js'), 'utf8'))
  : PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE;
const LIVE_INDEX = SCANNER_STOCK_SCORING_U.isApplied(PRE_SCANNER_DSS_1D_CHART)
  ? SCANNER_STOCK_SCORING_U.undoScannerStockScoring(
      PRE_SCANNER_DSS_1D_CHART, fs.readFileSync(path.join(ROOT, 'js/services/scanner-stock-scoring.js'), 'utf8'))
  : PRE_SCANNER_DSS_1D_CHART;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoSwingChartCacheHelpers(LIVE_INDEX, MODULE);

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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the DSS
// chart load guard predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the two openings the seam admits');
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
eq(firstLineOf(BODY), DECL_FIRST_LINE, '…and opening on DECL_FIRST_LINE, the declaration itself');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…holding NON_ASCII_CHARS non-ASCII characters, so it is pure ASCII…');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…and EM_DASHES em dashes');
eq(Buffer.byteLength(BODY, 'utf8'), BODY.length, '…which is why its UTF-8 and UTF-16 lengths are the same number');
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
  eq(next.name, NEXT_DECL, '…and the owner after the cut is NEXT_DECL, the consumer');
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…whose own documentation begins exactly where the cut ends, so nothing of it is cut off from it');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits two openings.
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
  eq(OPENINGS[0], BRACE_OPENING, '…the first being that owner\'s closing brace…');
  eq(OPENINGS[1], RAW_AT_IN_CODE, '…and the last the declaration, which is the cut: it has no documentation to open on');
  eq(RAW_AT_IN_CODE, DECL_AT_IN_CODE, '…so the cut and the declaration are the same position');
  eq(OPENINGS.filter((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() === '').length, 0,
    '…NO blank line standing among them: the brace is directly above the declaration');
  eq(MID_LINE_OPENING, BRACE_OPENING + 1, 'a position one unit past the brace…');
  ok(CODE[MID_LINE_OPENING - 1] !== '\n' && !OPENINGS.includes(MID_LINE_OPENING), '…is mid-line, and not among them…');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    '…and is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what
  // loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the closing brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the two is even a candidate, counted rather than listed');
}
// THE FUNCTIONS HAVE NO DOCUMENTATION. The programme's own rule finds no comment
// block above the declaration, and the line above it is code.
{
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])), null, 'the programme\'s blockAbove rule finds NO comment block above the first declaration…');
  eq(DECL_AT_IN_CODE - RAW_AT_IN_CODE, DOC_TAKEN, '…so the cut takes DOC_TAKEN units of documentation…');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '}\n', '…the line above the declaration being the closing brace of the owner above…');
  eq([LOGGER, CLASSIFIER].map((n) => { const b = blockAbove(BY_NAME.get(n)); return b && [b.start >= RAW_AT_IN_CODE, b.text.split('\n').length - 1]; }),
    [[true, 2], [true, 2]], '…while the other two owners each carry a two-line comment block of their own directly above them, and both blocks are INSIDE the cut');
  eq(blockAbove(BY_NAME.get(INVALIDATOR)), null, '…the invalidator being the one with none');
  eq(BODY.split('\n').filter((l) => l.startsWith('//')).length, 4, '…the four column-0 comment lines of the body being those two blocks');
}
// WHAT THE CUT LEFT. The closing brace of the owner above is directly followed
// by the next function's documentation, because the one blank line that left
// with the block is the one below it. The reconstructed monolith held that join nowhere.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(atCut, JOIN_AFTER_CUT), 1, 'the cut left the closing brace directly above the next function\'s documentation, once…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), BRACE_OPENING, '…at the place the cut was made…');
  eq(count(CODE, JOIN_AFTER_CUT), 0, '…a join the reconstructed monolith did not hold, at that place or any other…');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…the reconstructed monolith keeping a blank line between the same two lines, once');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0, 'and no line of the first declaration is left behind');
}
// THE SCREEN HOLDS THIS RUN. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, and this block clears it; with no documentation the
// declaration is also where the cut opens.
ok(BODY_END_IN_CODE - DECL_AT_IN_CODE >= RUN_FLOOR, 'measured from the declaration the run is at or above RUN_FLOOR, so the floor does not hide it…');
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE - RUN_FLOOR, 59, '…by 59 units');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and the shipped screen enumerates exactly CANDIDATES_AT_CUT run that opens at the declaration and ends where the cut does…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…while the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT rows for it, since it skipped nothing here');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one shared-state dependency, one delete the profile cannot see');
// ─────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these three names, in this order');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…all of them functions, so this layer ships no mutable binding');
  ok(own.every((d) => !/^async function /.test(firstLineOf(CODE.slice(d.start)))), '…every one SYNCHRONOUS');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly the one name S');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in: CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  eq(REC.sites.map((at) => OWNERS_EXPECTED.filter((n) => MASKED.startsWith(n, at))[0]), CONSUMER_SITE_OWNERS,
    '…which reach, in order, the logger, the classifier, and the logger three more times');
  eq(OWNERS_EXPECTED.map((n) => REC.sites.filter((at) => MASKED.startsWith(n, at)).length), [0, 4, 1],
    '…so the invalidator is reached by NONE of them, the logger four times and the classifier once');
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.start >= RAW_END_IN_CODE, '…the consumer sitting outside the cut, below it');
  ok(REC.sites.every((at) => at > keeper.start && at < keeper.end), '…all five sites inside its body');
  ok(REC.sites.every((at) => hostOf(at) && hostOf(at).name === CONSUMER), '…each with the consumer as its enclosing declaration');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
  eq(keeper.start, DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0].start, '…and it is the very next function after the cut');
  ok(/^async function /.test(firstLineOf(CODE.slice(keeper.start))), '…an async function, which awaits the backend reader');
}
// THE FIRST OWNER HAS NO CALLER. Nothing in the monolith, its generated markup, its
// static markup or any shipped module names the invalidator outside its own
// declaration.
{
  eq(refSites(MASKED, INVALIDATOR).length, INVALIDATOR_REFERENCES,
    'the invalidator is named INVALIDATOR_REFERENCES time in the monolith\'s code: its own declaration…');
  eq(refSites(STRINGS, INVALIDATOR).length, 0, '…not at all in its string and template literals…');
  eq(refSites(STATIC_MARKUP, INVALIDATOR).length, 0, '…not at all in the static markup…');
  eq(SIBLINGS.filter((s) => s.owners.indexOf(INVALIDATOR) >= 0 || refSites(s.masked, INVALIDATOR).length > 0).length, 0,
    '…and in none of the shipped modules');
  eq(refSites(MASKED, INVALIDATOR)[0], DECL_AT_IN_CODE + 'function '.length, '…that one reference being the name in the declaration line');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, so byConsumerSplit leaves nothing out…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…and is BY_CONSUMER_SPLIT, the same as byConsumer');
}
// THE ONE DEPENDENCY IS REACHED WHEN THE INVALIDATOR IS CALLED, never when it
// loads. It is the monolith's shared state, declared far above the cut.
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MONOLITH_DEPENDENCIES[0]).length, DEPENDENCY_REFERENCES,
    'the body names S at DEPENDENCY_REFERENCES places, every one in the invalidator…');
  eq(refSites(MASKED.slice(BY_NAME.get(LOGGER).start, BY_NAME.get(CLASSIFIER).end), 'S').length, 0,
    '…the logger and the classifier naming it NOT AT ALL…');
  eq(dep.form, 'const', 'S is a top-level `const` of the monolith…');
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT…');
  eq(dep.end, DEPENDENCY_END, '…ending at DEPENDENCY_END…');
  eq(dep.chars, DEPENDENCY_CHARS, '…DEPENDENCY_CHARS units long…');
  ok(dep.end < REGION_AT, '…far above the banner region the cut sits in, so the monolith still owns it after the move…');
  const sites = refSites(MASKED, MONOLITH_DEPENDENCIES[0]);
  eq(sites.length, DEPENDENCY_REFERENCES_IN_MONOLITH, '…referenced DEPENDENCY_REFERENCES_IN_MONOLITH times in the monolith…');
  eq(new Set(sites.map((at) => (hostOf(at) || { name: '(TOP LEVEL)' }).name)).size, DEPENDENCY_HOSTS_IN_MONOLITH,
    '…from DEPENDENCY_HOSTS_IN_MONOLITH distinct enclosing declarations or the top level: the shared state of the whole application…');
  const users = SIBLINGS.filter((s) => !s.bound.has('S') && refSites(s.masked, 'S').length > 0);
  ok(users.length > 0, '…and shipped modules ALREADY read it at call time, so the pattern has precedent');
  eq(users.filter((s) => CHAIN_SET.has(s.rel)).length + users.filter((s) => !CHAIN_SET.has(s.rel)).length, users.length,
    '…which is a count over every shipped module, chain layers and foundation alike');
  eq(propertyWriteBases(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).filter((b) => b === 'S').length, 0,
    'and the body ASSIGNS nothing on S: its one mutation of it is a delete');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time, S included');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: three function declarations only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE STATE THE OUTBOUND SCANS CANNOT SEE. Both outbound scans in this file look
// for assignment. The invalidator mutates the shared chart cache with `delete`,
// which is not an assignment, so both report nothing while the block writes to
// state it does not own. This scan looks for `delete`.
const deleteTargets = (masked) => {
  const re = /\bdelete\s+([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)/g;
  const out = []; let m;
  while ((m = re.exec(masked))) out.push(m[1].replace(/\s+/g, ''));
  return out;
};
{
  eq(deleteTargets(BODY), [DELETE_TARGET], 'the block contains exactly one `delete`, and it deletes from DELETE_TARGET…');
  eq(deleteTargets(BODY).length, BODY_DELETES, '…BODY_DELETES of them');
  // WHO ELSE WRITES THAT OBJECT, over the whole monolith.
  const writers = [];
  let m;
  const del = /\bdelete\s+S\.swing\.chartCache/g;
  while ((m = del.exec(MASKED))) writers.push([hostOf(m.index).name, 'delete']);
  const asg = /\bS\.swing\.chartCache\s*(?:\[[^\]\n]{1,60}\])?\s*=(?!=)/g;
  while ((m = asg.exec(MASKED))) writers.push([hostOf(m.index).name, 'assign']);
  const wkey = (w) => w.join(':');
  eq(writers.map(wkey).sort(), CACHE_WRITERS.map(wkey).sort(),
    '…and the cache has exactly three writers in the whole monolith: the entry writer that assigns, the entry invalidator that deletes, and this block\'s invalidator that deletes');
  eq(writers.filter((w) => w[0] === INVALIDATOR).length, 1, '…the block owning ONE of them');
  ok(writers.filter((w) => w[0] !== INVALIDATOR).every((w) => BY_NAME.get(w[0]).end < RAW_AT_IN_CODE),
    '…and the other two both ABOVE the cut and staying where they are');
  // CONTROLS.
  eq(deleteTargets('function f(k) { delete a.b[k]; delete c.d.e; delete x; }'), ['a.b', 'c.d.e', 'x'],
    'control — the delete scan finds three planted deletes, reading a computed key as the object it indexes');
  eq(nonLocalAssignmentsIn('function f(k) { delete S.swing.chartCache[k]; }').length, 0,
    'control — and the assignment scan reports NOTHING on the very statement the delete scan finds, which is why this scan exists');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
//
// THE SCAN THIS FILE INHERITED READS ONLY THE FIRST NAME OF A `var` LIST AS LOCAL.
// This block declares no comma-separated list, so it reports nothing here, and the
// corrected scan agrees. A zero from either needs a control that finds a
// violation.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignments to a name it takes for a global…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the block does not own…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document: the logger reaches `console` behind `typeof`');
  // CONTROLS: the corrected scan DOES find a planted violation and still ignores
  // every declarator, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — it finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the previous contract named it, and three rows tie at the best score the screen states');
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
    '…and it sat entirely BEFORE this cut, so this opening is earlier than the one it published, by PREVIOUS_RAW_CHARS');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, 'the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq(listed[0], [RAW_AT_IN_CODE + PREVIOUS_RAW_CHARS, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the first of them being THIS cut\'s row, at the same byConsumerSplit and raw nine and the same length, moved by PREVIOUS_RAW_CHARS…');
  eq(listed.slice(1).filter((r) => r[0] > PREVIOUS_RAW_AT).map((r) => r[0] - PREVIOUS_RAW_CHARS),
    [RUNNERS_UP[1][0], RUNNERS_UP[2][0]],
    '…two of the other three sitting AFTER that cut and moved by the same amount…');
  eq(listed.slice(1).filter((r) => r[0] < PREVIOUS_RAW_AT).map((r) => r[0]), [RUNNERS_UP[0][0]],
    '…and one before it, which did not move');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidates at 2, this cut\'s row among them…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2 && c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 1,
    '…exactly one of them being this cut');
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
    HIDDEN_SCORE_TWO_ROWS, '…that one being exactly HIDDEN_SCORE_TWO_ROWS, and not this cut');
  // EVERY ROW AT THE BEST TIER, over the screen and the pass together.
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units, c }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc, c })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    'in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit…');
  const best = rows.filter((r) => r.bcs <= BY_CONSUMER_SPLIT).map((r) => [r.lo, r.hi, r.nine, r.bcs])
    .sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
  eq(best, BEST_TIER_ROWS, '…and the rows AT it are exactly BEST_TIER_ROWS');
  eq(new Set(best.map((r) => r[0])).size, OPENINGS_AT_TWO_OR_BELOW,
    '…over OPENINGS_AT_TWO_OR_BELOW distinct openings');
  eq(best.length, OPENINGS_AT_TWO_OR_BELOW, '…counted over the rows as well as the openings, so a second row at one opening could not hide');
  eq(Math.min.apply(null, best.map((r) => r[2])), BEST_NINE, '…the lowest raw nine among them being BEST_NINE');
  const atBestNine = best.filter((r) => r[2] === BEST_NINE);
  eq(atBestNine.map((r) => r[0]).sort((a, b) => a - b), TIE_ORDER_BY_UNITS.slice().sort((a, b) => a - b),
    '…and exactly THREE of them are AT it: this cut\'s row and two others. This is a tie on both measures the score carries');
  eq(Math.min.apply(null, best.filter((r) => r[2] !== BEST_NINE).map((r) => r[2])), SECOND_BEST_NINE,
    '…every other row at 2 having a raw nine of SECOND_BEST_NINE or more');
  // THE TIE, MEASURED ON WHAT THE SCORE DOES NOT CARRY, and shown to differ.
  const tieMeasured = TIE_ROWS.map((t) => {
    const c = cleanRuns.filter((x) => x.lo === t[0] && x.hi === t[1])[0];
    return [t[0], t[1], c.units, c.p.names.length, c.p.inbound, consumersOf(c.p).length, c.p.deps.length, c.split.foundation];
  });
  eq(tieMeasured, TIE_ROWS, 'the three rows are TIE_ROWS: the pinned length, owners, inbound sites, consumers, monolith dependencies and foundation references each');
  ok(new Set(TIE_ROWS.map((t) => t[3])).size === 3 && new Set(TIE_ROWS.map((t) => t[4])).size === 3,
    '…the owner counts all different and the inbound-site counts all different: the counts the score does not carry do not rank them, they differ');
  ok(new Set(TIE_ROWS.map((t) => t[2])).size === 3, '…and so are the lengths');
  // THE ORDER THE SCREEN PUBLISHES breaks the tie, and nothing else does.
  const bestPerAll = new Map();
  for (const r of rows) {
    const b = bestPerAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPerAll.set(r.lo, r);
  }
  const rankedAll = [...bestPerAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq(rankedAll.slice(0, 3).map((r) => r.lo), TIE_ORDER_BY_UNITS,
    'ranked by (byConsumerSplit, nine, units), the order the screen publishes, the three come in the order TIE_ORDER_BY_UNITS, this cut\'s row first…');
  eq(rankedAll.slice(0, 3).map((r) => r.units), TIE_ROWS.map((t) => t[2]).sort((a, b) => a - b),
    '…the whole of the ordering being the length key, ascending');
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
  eq(ranked.slice(0, 2).map((r) => r[0]), TIE_ORDER_BY_UNITS.slice(1), '…the first two being the other two rows of the tie');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would have cost: the owners above, the six runs the block makes, the owners below, the region');
// ─────────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const OWNERS_UP = REGION_OWNER_LIST.slice(0, OWNER_POSITION - 1).reverse();
const OWNERS_DOWN = REGION_OWNER_LIST.slice(OWNER_POSITION - 1 + OWNER_COUNT);
const priceUp = (d) => {
  const lo = (blockAbove(d) || { start: d.start }).start;
  const p = profileOf([lo, BODY_END_IN_CODE]);
  const l = loadTimeProfile(lo, BODY_END_IN_CODE);
  return { lo, p, bcs: byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), clean: runsNothingAtLoad(l), stmt: l.stmtLines };
};
eq(REGION_OWNER_LIST.findIndex((d) => d.name === INVALIDATOR) + 1, OWNER_POSITION, 'the cut opens on owner number OWNER_POSITION of its region…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and takes the next OWNER_COUNT, which are its three');
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  const r = priceUp(d);
  eq(r.lo, lo, 'taking ' + name + ' with its documentation, if it has any, opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  eq([RAW_END_IN_CODE - lo, r.p.nine, r.bcs, r.p.deps.length], [units, nine, bcs, deps],
    '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine and on byConsumerSplit');
}
// EVERY OWNER ABOVE IT IN THE REGION, not the nearest few.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut…');
eq(EXTENSIONS_UP.map((e) => e[0]), OWNERS_UP.slice(0, EXTENSIONS_UP.length).map((d) => d.name),
  '…the pinned rows being the nearest ones, nearest first…');
{
  const priced = OWNERS_UP.map(priceUp);
  ok(priced.every((r) => assertSeam(CODE, r.lo, BODY_END_IN_CODE) === RAW_END_IN_CODE), '…every one a real seam…');
  ok(priced.every((r) => r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT),
    '…and EVERY one of them worse than the cut on the raw nine and on byConsumerSplit, so no stopping point above is better…');
  ok(priced.every((r) => r.clean), '…and every one of those runs also runs nothing at load');
}
// THE SIBLING ABOVE. The entry-scoped invalidator is directly above the cut, and
// the comment above it describes BOTH invalidators.
{
  const sib = BY_NAME.get(OWNER_BEFORE);
  const ba = blockAbove(sib);
  ok(ba && /entry- and symbol-scoped/.test(ba.text), 'the comment above ' + OWNER_BEFORE + ' says its invalidation is "entry- and symbol-scoped", which describes both functions…');
  eq(ba.start + ba.text.length, sib.start, '…and sits directly above the entry-scoped one only');
  ok(sib.end < RAW_AT_IN_CODE && CODE.slice(sib.end + 1, RAW_AT_IN_CODE).trim() === '', '…the cut leaving both the sibling and that comment in the monolith');
}
// THE SIX RUNS THE THREE OWNERS MAKE. Priced by the same profile, and each tested
// against the screen: five are under the floor and neither enumeration holds them.
const CLUSTER = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
const AFTER_CLUSTER = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
const ownRun = (i, j) => {
  const lo = i === 0 ? RAW_AT_IN_CODE : (blockAbove(CLUSTER[i]) || { start: CLUSTER[i].start }).start;
  const limit = j + 1 < CLUSTER.length ? CLUSTER[j + 1].start : AFTER_CLUSTER.start;
  const be = snapBodyEnd(CODE, lo, limit);
  return { lo, be, units: be - lo, seam: assertSeam(CODE, lo, be), p: profileOf([lo, be]), split: outboundSplit(lo, be), load: loadTimeProfile(lo, be) };
};
{
  const measured = [];
  for (let i = 0; i < CLUSTER.length; i++) {
    for (let j = i; j < CLUSTER.length; j++) {
      const r = ownRun(i, j);
      measured.push([CLUSTER[i].name, CLUSTER[j].name, r.lo, r.be, r.units, r.p.nine, byConsumerSplit(r.p, r.split), r.p.deps, r.p.inbound]);
    }
  }
  eq(measured, OWN_RUNS, 'the three owners make exactly the six runs OWN_RUNS, each a real seam');
  const runs = [];
  for (let i = 0; i < CLUSTER.length; i++) for (let j = i; j < CLUSTER.length; j++) runs.push(ownRun(i, j));
  ok(runs.every((r) => runsNothingAtLoad(r.load)), '…every one running nothing at load…');
  const under = runs.filter((r) => r.units < RUN_FLOOR);
  eq(under.length, OWN_RUNS_UNDER_FLOOR, '…FIVE of the six under RUN_FLOOR, the cut being the only one over it…');
  ok(under.every((r) => candidateRuns.filter((c) => c.lo === r.lo && c.hi === r.be).length === 0 &&
    hiddenRows.filter((c) => c.lo === r.lo && c.hi === r.be).length === 0),
  '…and neither the shipped screen nor the pass over its sub-floor runs holds any of the five');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).length, 1,
    '…the cut being the only run inside the block that the screen enumerates');
  eq(under.filter((r) => r.p.nine < FULL_NINE).length, OWN_RUNS_BELOW_ON_NINE, '…ALL FIVE scoring a lower raw nine than the cut…');
  eq(under.filter((r) => byConsumerSplit(r.p, r.split) <= 1).length, OWN_RUNS_AT_ONE_ON_BCS,
    '…and OWN_RUNS_AT_ONE_ON_BCS of them scoring 1 on byConsumerSplit, a score NEITHER enumeration holds anywhere in the document…');
  ok(rows_hold_no_score_one(), '…while the shipped screen and the pass hold no run at 1: the floor, not the coupling, decides which of these is a candidate');
}
function rows_hold_no_score_one() {
  return cleanRuns.every((c) => byConsumerSplit(c.p, c.split) > 1) &&
    hiddenRows.filter((c) => runsNothingAtLoad(c.load)).every((c) => c.bcs > 1);
}
// THE OWNERS BELOW, and the ends the seam rule refuses.
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the block…');
eq(OWNERS_DOWN.map((d) => d.name), DOWN_REFUSED, '…which are DOWN_REFUSED, the consumer first…');
eq(OWNERS_DOWN[0].name, CONSUMER, '…the first being the consumer, the very next function…');
for (const d of OWNERS_DOWN) {
  throwsWith(() => assertSeam(CODE, RAW_AT_IN_CODE, downEnd(d)), REFUSAL_ERROR,
    '…ending the cut at ' + d.name + ' is refused with REFUSAL_ERROR');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner
// region" would forbid cutting any of it. This cut is owners 11 to 13 of 18, so
// it sits in the middle of its region and leaves the banner and every other owner.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, above the cut');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
  ok(reg.end > RAW_END_IN_CODE && reg.start < RAW_AT_IN_CODE, '…so the cut sits strictly INSIDE its region');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the swing chart cache banner, which the cut leaves where it is');
  eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  // WHAT THE CUT LEAVES BEHIND. The banner is above the cut, so every owner left
  // in the region keeps it.
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(clean.slice(REGION_AT, REGION_AT + BANNER_LINE_PREFIX.length), BANNER_LINE_PREFIX,
    'after the cut the region\'s banner is where it was…');
  eq(scanTopLevelDeclarations(clean).filter((d) => d.start >= REGION_AT && d.end <= REGION_END - RAW_CHARS).length,
    REGION_OWNERS - OWNER_COUNT, '…over the REGION_OWNERS - OWNER_COUNT owners left in it');
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
  // THE CUT THAT SHIPPED CHANGED THE SCREEN, and this time the screen GREW: the
  // figures the previous contract pinned less the figures measured here.
  eq([prevNum('RAW_RUNS') - RAW_RUNS, prevNum('SEAM_REJECTED') - SEAM_REJECTED, prevNum('CANDIDATES') - CANDIDATES,
    prevNum('CLEAN_CANDIDATES') - CLEAN_CANDIDATES], [DELTA_RAW_RUNS, DELTA_SEAM_REJECTED, DELTA_CANDIDATES, DELTA_CLEAN],
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — negative, so the screen grew');
  ok(DELTA_RAW_RUNS < 0 && DELTA_CANDIDATES < 0,
    '…because that cut took its region\'s banner, and the eight owners it left behind joined the region above, whose runs the screen now enumerates');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => c.hi >= BODY_END_IN_CODE),
  '…and every run the screen opens there is at least as long as the cut, since the cut is one of them or contains it');

// ─────────────────────────────────────────────────────────────────────
section('7. The SHIPPED module loads bare, the invalidator THROWS without S, the logger swallows everything, the classifier is a table');
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
  // A HARNESS: the block run in a fresh VM context whose `S` and `console` are
  // fakes this file controls and records. Nothing real is read, and either can
  // be left out to see what its absence does.
  const harness = (o = {}) => {
    const logs = [];
    const sandbox = Object.create(null);
    if (o.S !== undefined) sandbox.S = o.S;
    if (o.console !== false) sandbox.console = o.console || { log: (...a) => { logs.push(a); } };
    const ctx = vm.createContext(sandbox);
    // THE SHIPPED MODULE is what loads here, not a slice of the reconstructed
    // monolith: §9 proves the two are the same bytes.
    vm.runInContext(MODULE, ctx);
    return {
      ctx, logs,
      invalidate: vm.runInContext(INVALIDATOR, ctx),
      log: vm.runInContext(LOGGER, ctx),
      outcome: vm.runInContext(CLASSIFIER, ctx),
    };
  };
  // LOADS BARE: declaring the block needs nothing.
  {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(MODULE, ctx);
    eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
      'it LOADS in a completely bare VM and declares exactly its three owners');
    eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.constructor.name', ctx)), ['Function', 'Function', 'Function'],
      '…ordinary synchronous functions');
    const invalidate = vm.runInContext(INVALIDATOR, ctx);
    let err = null;
    try { invalidate('AAPL'); } catch (e) { err = e; }
    eq(err && err.name, 'ReferenceError', 'called bare the invalidator THROWS a ReferenceError, synchronously…');
    ok(err && err.message.indexOf('S') >= 0 && /not defined/.test(err.message), '…naming S as not defined…');
    err = null;
    try { invalidate(''); } catch (e) { err = e; }
    eq(err && err.name, 'ReferenceError', '…even for an empty symbol, because S is read before the symbol is');
    eq(vm.runInContext(CLASSIFIER + '(null)', ctx), 'BACKEND_ERROR', 'while the classifier answers in a bare VM…');
    eq(vm.runInContext('typeof ' + LOGGER + '({a: 1})', ctx), 'undefined', '…and the logger does too, doing nothing since there is no console to call');
  }
  // THE DEPENDENCY, TAKEN AWAY IN DEGREES.
  {
    for (const [label, S] of [['S with no swing', {}], ['S with a null swing', { swing: null }], ['S with a swing but no chart cache', { swing: {} }]]) {
      const h = harness({ S });
      eq(h.invalidate('AAA'), 0, label + ': the invalidator answers 0');
    }
    const cache = { 'AAA|1D|x': { symbol: 'AAA' } };
    const h = harness({ S: { swing: { chartCache: cache } } });
    eq([h.invalidate(''), h.invalidate(null), h.invalidate(undefined), h.invalidate(0)], [0, 0, 0, 0],
      'with a cache present, a falsy symbol answers 0…');
    eq(Object.keys(cache), ['AAA|1D|x'], '…and touches nothing');
  }
  // THE INVALIDATOR'S RULE.
  {
    const cache = {
      'AAA|1D|x': { symbol: 'AAA' },
      'AAA|4H|x': { symbol: 'AAA' },
      'AAAB|1D|x': { symbol: 'AAAB' },
      'BBB|1D|x': { symbol: 'BBB' },
      odd: { symbol: 'AAA' },
      AAA: { symbol: 'ZZZ' },
      'AAA|nullentry': null,
    };
    const S = { swing: { chartCache: cache, other: 7 }, keep: 1 };
    const h = harness({ S });
    eq(h.invalidate('AAA'), 4, 'the invalidator drops an entry whose symbol matches OR whose key begins with the symbol and a bar, and counts them: 4 here…');
    eq(Object.keys(S.swing.chartCache), ['AAAB|1D|x', 'BBB|1D|x', 'AAA'],
      '…the survivors being a longer symbol that merely shares the prefix, another symbol, and a key equal to the symbol with no bar and another symbol\'s entry…');
    eq([S.swing.other, S.keep], [7, 1], '…and nothing else on S is touched');
    eq(h.invalidate('AAA'), 0, 'a second call finds nothing and answers 0');
    eq(h.invalidate('aaa'), 0, '…and the match is case-sensitive: the lower-case symbol drops nothing');
    eq(h.invalidate('AA'), 0, '…and a shorter prefix does not match a longer symbol\'s key');
    eq(typeof h.invalidate('BBB'), 'number', 'the answer is a number…');
    eq(Object.keys(S.swing.chartCache), ['AAAB|1D|x', 'AAA'], '…and the other symbol\'s entries go when asked for');
  }
  // THE LOGGER.
  {
    const h = harness();
    const fields = { symbol: 'AAA', decision: 'HIT' };
    eq(h.log(fields), undefined, 'the logger returns nothing…');
    eq(h.logs.length, 1, '…and prints exactly one line…');
    eq(h.logs[0][0], '[SWING][CHART-CACHE]', '…tagged [SWING][CHART-CACHE]…');
    eq(h.logs[0][1] === fields, true, '…carrying the very object it was given, not a copy…');
    eq(h.logs[0].length, 2, '…and nothing else');
    const noConsole = harness({ console: false });
    eq(noConsole.log({ a: 1 }), undefined, 'with no console at all it does nothing and does not throw…');
    const noLog = harness({ console: {} });
    eq(noLog.log({ a: 1 }), undefined, '…nor with a console that has no log…');
    const throwing = harness({ console: { log: () => { throw new Error('boom'); } } });
    let err = null;
    try { throwing.log({ a: 1 }); } catch (e) { err = e; }
    eq(err, null, '…nor with a console whose log THROWS: the `try` swallows it');
    const getter = harness({ console: { get log() { throw new Error('getter'); } } });
    err = null;
    try { getter.log({}); } catch (e) { err = e; }
    eq(err, null, '…nor with a console whose `log` getter throws');
  }
  // THE CLASSIFIER, as a table.
  {
    const h = harness();
    const CASES = [
      [null, 'BACKEND_ERROR'], [undefined, 'BACKEND_ERROR'], [0, 'BACKEND_ERROR'], ['', 'BACKEND_ERROR'],
      [{ ok: true, candles: [1] }, 'BACKEND'], [{ ok: true, candles: 'x' }, 'BACKEND'],
      [{ ok: true, candles: [] }, 'BACKEND_ERROR'], [{ ok: true, candles: [], reason: 'store_empty' }, 'BACKEND_EMPTY'],
      [{ ok: false, candles: [1], reason: 'x' }, 'BACKEND_ERROR'], [{ ok: true }, 'BACKEND_ERROR'], [{}, 'BACKEND_ERROR'],
      [{ ok: false, reason: 'timeout' }, 'TIMEOUT'], [{ ok: false, reason: 'fetch:timeout' }, 'TIMEOUT'],
      [{ ok: false, reason: 'Request TIMED OUT' }, 'TIMEOUT'],
      [{ ok: false, reason: 'fetch:abort' }, 'ABORTED'], [{ ok: false, reason: 'AbortError' }, 'ABORTED'],
      [{ ok: false, reason: 'daily_empty' }, 'BACKEND_EMPTY'], [{ ok: false, reason: 'no_data' }, 'BACKEND_EMPTY'],
      [{ ok: false, reason: 'nodata' }, 'BACKEND_EMPTY'], [{ ok: false, reason: 'NO_DATA' }, 'BACKEND_EMPTY'],
      [{ ok: false, reason: 'http_500' }, 'BACKEND_ERROR'], [{ ok: false, reason: 404 }, 'BACKEND_ERROR'],
      [{ ok: false, reason: null }, 'BACKEND_ERROR'], [{ ok: false, reason: undefined }, 'BACKEND_ERROR'],
      // PRECEDENCE: timeout, then abort, then empty.
      [{ ok: false, reason: 'timeout_empty' }, 'TIMEOUT'], [{ ok: false, reason: 'aborted_empty' }, 'ABORTED'],
      [{ ok: false, reason: 'abort timeout' }, 'TIMEOUT'], [{ ok: false, reason: 'abort no_data' }, 'ABORTED'],
    ];
    eq(CASES.map(([res]) => h.outcome(res)), CASES.map(([, want]) => want),
      'the classifier answers the pinned code for each of ' + CASES.length + ' inputs, including precedence');
    eq(new Set(CASES.map(([, w]) => w)).size, 5, '…and all five codes occur in the table: BACKEND, TIMEOUT, ABORTED, BACKEND_EMPTY and BACKEND_ERROR');
    const input = Object.freeze({ ok: false, reason: 'timeout' });
    eq(h.outcome(input), 'TIMEOUT', 'it reads a frozen input without writing to it');
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
  eq(sizes[0], MODULE.length, 'the smallest shipped layer is THIS module, at MODULE.length units…');
  eq(sizes[1], SMALLEST_LAYER_CHARS, '…the layer that held that place before it, SMALLEST_LAYER_CHARS units, now second…');
  ok(BODY_CHARS < SMALLEST_LAYER_CHARS, '…this module being SMALLER than that…');
  eq(SMALLEST_LAYER_CHARS - BODY_CHARS, 28, '…by 28 units…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    '…measured against every layer rather than inferred from the first: it ranks SIZE_RANK by size…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, LAYERS_SMALLER_THAN_THIS_CUT,
    '…with LAYERS_SMALLER_THAN_THIS_CUT layers smaller than it…');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…and LAYERS_LARGER_THAN_THIS_CUT layers larger, which is every other one of them…');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 1, '…none of the others exactly its size, the one at that length being itself…');
  eq(sizes[SIZE_RANK - 1], MODULE.length, '…the layer at that rank in size order being this module…');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in,
  // rather than being left to make the total drift by one forever.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  // THE TWO CHAIN-WIDE SHAPE COUNTS, over the whole chain AND over the chain
  // before this layer. The audit forecast that the pure-ASCII count WOULD move
  // and the banner count would NOT; both are asserted as comparisons between two
  // measurements rather than carried forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(ascii(MODULE), '…and this module IS, asserted of the module directly: it holds no non-ASCII character…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS + 1, '…exactly one higher: it moved, as the audit forecast');
  eq(prior.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: it opens on a declaration…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is the SAME LAYERS_OPENING_ON_BANNER: it did not move, as the audit forecast');
  // THE OTHER CHAIN-WIDE COUNT THAT MOVED: layers whose contract pins a non-empty
  // MONOLITH_DEPENDENCIES. Counted over the suite with this contract in it and
  // again without it, then compared with the figure the contract that carries it
  // pins. One layer cut after this one pins an EMPTY list and one pins a non-empty
  // list, so the live count is the count at this layer plus the second — asserted
  // below, not assumed.
  const contractsPinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => ({ f, src: fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8') }))
    .filter(({ src }) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    }).map((x) => x.f);
  ok(LATER_CONTRACTS.every((f) => contractsPinning.indexOf(f) < 0 && fs.existsSync(path.join(ROOT, 'tests', f))),
    'every layer cut after this one exists and pins an EMPTY dependency list, so none of them is among the contracts counted…');
  ok(LATER_CONTRACTS_WITH_A_DEPENDENCY.every((f) => contractsPinning.indexOf(f) >= 0),
    'every later layer that pins a non-empty list is among the contracts counted…');
  const atThisLayer = contractsPinning.filter((f) => LATER_CONTRACTS_WITH_A_DEPENDENCY.indexOf(f) < 0);
  eq(atThisLayer.length, LAYERS_WITH_A_DEPENDENCY,
    '…and LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES at this layer, counted over the suite without them…');
  ok(atThisLayer.indexOf(path.basename(CONTRACT_REL)) >= 0, '…this contract being one of them…');
  eq(atThisLayer.length - 1, PRIOR_LAYERS_WITH_A_DEPENDENCY,
    '…so the count before this layer was PRIOR_LAYERS_WITH_A_DEPENDENCY, and it moved up by exactly one');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]), LAYERS_WITH_A_DEPENDENCY + LATER_CONTRACTS_WITH_A_DEPENDENCY.length,
  '…which is the figure the contract that carries the live count pins now, with the later layers included');
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
    ['index.html', MODULE_REL, 'js/services/scanner-stock-scoring.js', 'js/ui/scanner-dss-1d-chart.js', 'js/portfolio/portfolio-stale-mark-squeeze-state.js', 'js/services/journal-expiry-audit.js', 'js/portfolio/portfolio-regime-badge-html.js', 'js/portfolio/portfolio-backend-squeeze-extract.js'].sort(),
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
  eq(firstLineOf(MODULE), DECL_FIRST_LINE,
    '…and OPENS on the declaration of its first owner, DECL_FIRST_LINE, with no documentation above it: the boundary §2 defends');
  eq(Buffer.byteLength(MODULE, 'utf8'), MODULE.length,
    '…its UTF-8 length equal to its UTF-16 length…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…because it holds NON_ASCII_CHARS non-ASCII characters, so it is pure ASCII…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…and EM_DASHES em dashes');
}
// THE LOAD ORDER. The module loads bare and reaches `S` only when its invalidator is
// called (§7), so the tag's position is not load-bearing for loading. It is pinned
// all the same: last of the local scripts, immediately before the inline monolith,
// whose one consumer stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/services/scanner-dss-chart-load-guard.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, which calls it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  const liveMasked = maskLiterals(LIVE_MONOLITH);
  eq(OWNERS_EXPECTED.map((n) => refSites(liveMasked, n).length), [0, 4, 1],
    '…leaving the invalidator referenced nowhere, the logger four times and the classifier once behind');
  eq(OWNERS_EXPECTED.map((n) => refSites(liveMasked, n).length).reduce((a, b) => a + b, 0), CONSUMER_SITES,
    '…CONSUMER_SITES in all, every one inside the consumer');
  ok(OWNERS_EXPECTED.every((n) => refSites(liveMasked, n).every((at) => {
    const host = scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => at >= d.start && at <= d.end).pop();
    return host && host.name === CONSUMER;
  })), '…which is the consumer the contract names');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its three owners and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === MONOLITH_DEPENDENCIES[0]).length, 1,
    '…while S stays declared in the monolith, which owns it');
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
  const E = 'SWING_CHART_CACHE_HELPERS_UNDO_';
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,560 units, not 1,559 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('BACKEND_EMPTY', 'BACKEND_EMPTX');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: this module is pure ASCII, so its
    // UTF-8 and UTF-16 lengths are the same number today, and swapping a 1-byte
    // letter for a 2-byte one keeps the length and the line-feed count and moves
    // only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoSwingChartCacheHelpers(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoSwingChartCacheHelpers(INDEX, MODULE),
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/swing-chart-cache-helpers-undo.js'),
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
console.log('SWING_CHART_CACHE_HELPERS_CONTRACT_OK');
}

main();
