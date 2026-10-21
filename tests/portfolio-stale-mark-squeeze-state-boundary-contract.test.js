'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO STALE MARK + SQUEEZE STATE — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [736655,738355) in monolith coordinates — 1,700 units raw and
// 1,699 of body, TWO owners, both synchronous and pure — now lives in
// js/portfolio/portfolio-stale-mark-squeeze-state.js. `_backendCacheStaleMark` reads
// the stale quote of a backend option cache entry: a stale mark first, then the mid of
// a stale bid and ask, then a single stale side, and null when none is a positive
// number. `_squeezeToState` normalises the many shapes a squeeze flag arrives in into
// the three answers the portfolio row renders: ACTIVE, OFF and null. The block opens on
// the five comment lines that document the first function, and the blank line above
// them stayed behind; the second function's own six-line block sits inside the body.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #510 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT FIRST, AND IT TIED ──
// ── ONE OTHER ROW ON EVERY COUNT THE SCORE DOES NOT CARRY ────────────────────
//
// The contract before this layer published its four best other openings, and this
// was the first of them. Over the screen and the pass over its sub-floor runs
// together, §4 counts no row with a byConsumerSplit below 2 and exactly TWO rows AT
// 2, both with a raw nine of 7: this one and the journal expiry audit pair. They tied
// on the score, and §4 shows they were EQUAL on every other count measured here —
// owners, inbound reference sites, consumers, monolith dependencies and foundation
// references — and differed in length alone, 1,699 against 2,091 units. The audit did
// not invent a measure to break a tie the measures do not break: it took the order
// the screen itself publishes — byConsumerSplit, then raw nine, then length
// ascending — which put this row first. The claim is scoped to the two enumerations.
//
// ── PART TWO: THE FLOOR HID THIS RUN, AND THE RUNS INSIDE IT SCORE BETTER ─────
//
// Measured from its declaration the block was 1,278 units, under the 1,500 floor, so
// the shipped screen did not hold it; measured from its documentation it is 1,699, and
// it was the pass over sub-floor runs that found it. The two runs inside it, each one
// function, are legal seams, because a blank line stands between the owners, and both
// score better than the pair on the raw nine and no worse on byConsumerSplit: the
// stale-mark function alone scores 1 on both measures. They are 840 and 858 units,
// under the floor on any reading, so it was the floor and not the coupling that made
// the pair the candidate. §5 says so and does not claim otherwise.
//
// ── PART THREE: SEVEN CALLS FROM TWO CONSUMERS, NO DEPENDENCY, TWO PURE ───────
// ── FUNCTIONS ─────────────────────────────────────────────────────────────────
//
// The raw nine is 7, all of it inbound: `_technicalTfSqueezeState`, the very next
// declaration after the cut and a synchronous function, calls the adapter once, and
// `refreshPositionsLive`, an async function of 138,483 units far below, calls the
// adapter five times and the stale-mark function once. All seven references are
// calls: none is an object key or a bare reference. The block reads no monolith name,
// no host global and no shared state, writes nothing and deletes nothing, so it loads
// in a bare VM and calling either function needs nothing from the monolith.
//
// ── PART FOUR: EIGHT OPENINGS WERE LEGAL, SEVEN PARSE, AND ONE IS A BLANK LINE ─
//
// The seam rule admits eight line starts between the owner above and the declaration:
// that owner's closing brace, the blank line after it, the five documentation lines and
// the declaration. The brace does not parse as a script. The blank line does, and is
// the only opening that is an empty line. The cut takes the documentation, the whole
// comment block the programme's own blockAbove rule finds, and leaves the blank line, so
// the monolith keeps `}` + blank line + the next function's documentation, a join it held
// once at the END of the block and holds once at the place the cut was made. Opening at
// the declaration would have left five comment lines against the documentation of
// `_technicalTfSqueezeState`, which they do not describe, and opening at the blank line
// would have fused the brace onto it. The cut ends where that documentation begins.
//
// ── PART FIVE: THE INHERITED OUTBOUND SCAN IS WRONG ABOUT ONE ASSIGNMENT ──────
//
// The scan this file inherited reads only the first name of a `var` list as local. The
// stale-mark function declares `var b = f(entry.staleBid), a = f(entry.staleAsk);`, so
// it reports an assignment to `a`, a local. The corrected scan finds none, and §3 pins
// both answers with controls.
//
// ── PART SIX: A BLOCK IN THE MIDDLE OF A 23-OWNER REGION ──────────────────────
//
// The region opens on the UNREALIZED P&L banner and held 23 owners: the cut was owners
// 5 and 6, with four above it and seventeen below. §5 prices EVERY owner above and
// EVERY owner below, and all twenty-one are worse than the cut on both the raw nine and
// byConsumerSplit, the nearest owner below, the synchronous caller, included.
//
// ── PART SEVEN: BOTH FUNCTIONS ARE PURE, AND THE TABLES ARE MEASURED ──────────
//
// §7 loads the SHIPPED module in a VM with NOTHING defined and drives both functions
// through decision tables: every rung of the stale-quote ladder and every kind of
// non-number the entry can hold, including the lenient `parseFloat` reading of `'7abc'`,
// and every spelling of the squeeze states, with the numbers 1 and 0 shown NOT to be
// states.
//
// ── LOAD ORDER, STATED AT THE LEVEL IT HOLDS ───────────────────────────────
//
// The module loads in a bare VM and none of its functions needs anything from the
// monolith. §9 pins where the tag sits all the same — after every other local script and
// immediately before the inline monolith, whose two consumers stay behind.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// §8 ranks it by size against the fifty-eight layers the chain now holds: it is the
// sixth smallest, which §8 measures against every layer rather than asserting. Its body
// holds an em dash and four arrows, all in comments, so it is not pure ASCII and the
// pure-ASCII count did not move; it does not open on a banner, so that count did not
// move either; and it pins an empty monolith dependency, so the count of layers that pin
// a non-empty one did not move. §8 measures all three.
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
const UNDO = require('./lib/portfolio-stale-mark-squeeze-state-undo.js');
const SWING_TREND_CONTEXT_U = require('./lib/swing-trend-context-undo.js');
const APEX_PARITY_COMPARE_U = require('./lib/apex-parity-compare-undo.js');
const AI_SCAN_CONTEXT_U = require('./lib/ai-scan-context-undo.js');
const OPTION_CHAIN_ERROR_HELPERS_U = require('./lib/option-chain-error-helpers-undo.js');
const PORTFOLIO_BETA_MISSING_REASON_U = require('./lib/portfolio-beta-missing-reason-undo.js');
const PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U = require('./lib/portfolio-backend-squeeze-extract-undo.js');
const PORTFOLIO_REGIME_BADGE_HTML_U = require('./lib/portfolio-regime-badge-html-undo.js');
const JOURNAL_EXPIRY_AUDIT_U = require('./lib/journal-expiry-audit-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/portfolio-stale-mark-squeeze-state.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '218f886';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = '4f4f91c';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = 'd6f27c1';
const BASE_CHARS = 1427425;
const BASE_UTF8 = 1455908;
const BASE_LF = 24661;
const BASE_SHA256 = '6cc34d058d7688d64606e0f8f6f71a3d6f49bed623650c2ece38864a6fdb8548';
const LOCAL_SCRIPTS = 101;
const TEST_FILE_COUNT = 194;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-stale-mark-squeeze-state-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-stale-mark-squeeze-state-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-stale-mark-squeeze-state-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-stale-mark-squeeze-state-contract.spec.js';
const UNDO_REL = 'tests/lib/portfolio-stale-mark-squeeze-state-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = '4f4f91c';
const CONTRACT_SPEC_MUTANTS = 166;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 56;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/scanner-dss-1d-chart-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 165;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-stale-mark-squeeze-state-audit.spec.js';
const RETIRED_MUTANTS = 159;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116085;
const CODE_CHARS = 1311314;
const TOP_LEVEL_DECLS = 894;
const OWNER_REGIONS = 116;

// ── The region ───────────────────────────────────────────────────────────────
// It opens on the first of five documentation lines directly above the stale-mark
// function, and the blank line above THOSE stayed behind as the separator.
const RAW_AT_IN_CODE = 736655;
const DECL_AT_IN_CODE = 737076;
const RAW_END_IN_CODE = 738355;
const BODY_END_IN_CODE = 738354;
const RAW_CHARS = 1700;
const BODY_CHARS = 1699;
const BODY_UTF8 = 1709;
const BODY_LF = 33;
const BODY_SHA256 = '1f2ca084c40252c94ac7080beb044695399b582d5bb10b8698e90024c9de2fe2';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// Stale-quote mark for a backend option cache entry (market-closed refresh where the';
const DECL_FIRST_LINE = 'function _backendCacheStaleMark(entry) {';
const EM_DASHES = 1;
const NON_ASCII_CHARS = 5;
const NEXT_DECL = '_technicalTfSqueezeState';

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['_backendCacheStaleMark', '_squeezeToState'];
const OWNER_SIZES = [418, 416];
const STALE_MARK = '_backendCacheStaleMark';
const SQUEEZE = '_squeezeToState';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 33;
const CODE_LINES = 21;
const COMMENT_LINES = 11;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
const OWNER_BEFORE = 'computeEarningsDte';
const BRACE_OPENING = 736652;
const BLANK_OPENING = 736654;
const DOC_TAKEN = 421;
const DOC_TAKEN_LINES = 5;
const SEAM_LEGAL_OPENINGS = 8;
const PARSING_OPENINGS = 7;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 736653;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 1278;
const CANDIDATES_AT_DECLARATION = 0;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 1;
// What the cut left behind: the closing brace of the owner above, one blank line, and
// the documentation of the next function — the join the monolith already held, once, at the end of the pair.
const NEXT_DOC_PREFIX = '// Extract a squeeze state for a single timeframe technical object from a backend';
const FUSED_IF_BLANK_TAKEN = '}\n// Extract a squeeze state for a single timeframe';
const JOIN_AFTER_CUT = '}\n\n// Extract a squeeze state for a single timeframe technical object from a backend';
const JOIN_AS_BEFORE = '}\n\n// Stale-quote mark for a backend option cache entry';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 732823;
const REGION_END = 789819;
const REGION_CHARS = 56996;
const REGION_OWNERS = 23;
const OWNER_POSITION = 5;
const BANNER_LINE_PREFIX = '// ── UNREALIZED P&L';
const WHOLE_REGION_NINE = 148;
const WHOLE_REGION_BCS = 62;
const WHOLE_REGION_CONSUMERS = 8;
const WHOLE_REGION_DEPS = 20;
const WHOLE_REGION_SIB = 4;

// ── Taking more, priced: the owners above; the owners below ──────────────────
// [name of the first owner taken, opening, raw units to the cut's raw end, raw
// nine, byConsumerSplit, monolith dependencies]. All four owners above it in
// the region; §5 prices all of them.
const EXTENSIONS_UP = [
  ['computeEarningsDte', 736043, 2312, 12, 5, 0],
  ['computePortfolioUnrealizedPnL', 735436, 2919, 14, 6, 1],
  ['computePositionUnrealizedPnL', 734093, 4262, 16, 8, 2],
  ['_legUnrealizedPnL', 732823, 5532, 18, 8, 2],
];
const OWNERS_ABOVE = 4;
// Below: SEVENTEEN owners stay in the region. The nearest three are pinned in full, as
// [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies];
// all seventeen are priced and counted in §5.
const EXTENSIONS_DOWN_NEAREST = [
  ['_technicalTfSqueezeState', 738854, 2199, 10, 4, 0],
  ['aggregateGreeks', 747130, 10475, 23, 14, 5],
  ['_lastPortfolioMetricsSig', 747405, 10750, 26, 16, 5],
];
const OWNERS_BELOW = 17;
// How many of the seventeen are real seams, how many are worse than the cut on both measures,
// and how many do NOT run clean at load.
const DOWN_LEGAL = 17;
const DOWN_WORSE = 17;
const DOWN_NOT_CLEAN = 12;
const DOWN_LOWEST_NINE = 10;
const DOWN_LOWEST_BCS = 4;
// THE THREE RUNS the two owners make between them, one of which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites] — or the
// refusal the seam rule gives when the run ends inside the block.
const OWN_RUNS = [
  ['_backendCacheStaleMark', '_backendCacheStaleMark', 736655, 737495, 840, 1, 1, [], 1],
  ['_backendCacheStaleMark', '_squeezeToState', 736655, 738354, 1699, 7, 2, [], 7],
  ['_squeezeToState', '_squeezeToState', 737496, 738354, 858, 6, 2, [], 6],
];
const OWN_RUNS_LEGAL = 3;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 2;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 7;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const CONSUMERS = ['_technicalTfSqueezeState', 'refreshPositionsLive'];
const CONSUMER_SITES = 7;
const CONSUMER_SITES_AT = [738830, 1026555, 1026613, 1026671, 1027526, 1027616, 1073809];
// Which owner each of the seven sites names, in order.
const CONSUMER_SITE_OWNERS = [SQUEEZE, SQUEEZE, SQUEEZE, SQUEEZE, SQUEEZE, SQUEEZE, STALE_MARK];
const SITE_HOSTS = ['_technicalTfSqueezeState', 'refreshPositionsLive', 'refreshPositionsLive', 'refreshPositionsLive', 'refreshPositionsLive', 'refreshPositionsLive', 'refreshPositionsLive'];
const CONSUMER_SYNC_AT = 738524;
const CONSUMER_SYNC_END = 738852;
const CONSUMER_SYNC_CHARS = 329;
const CONSUMER_REFRESH_AT = 966237;
const CONSUMER_REFRESH_END = 1104719;
const CONSUMER_REFRESH_CHARS = 138483;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 7;
const OUTBOUND_MODULE_REFERENCES = 0;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// THE SCAN THIS FILE INHERITED READS ONLY THE FIRST NAME OF A `var` LIST AS
// LOCAL: the stale-mark function declares `var b = f(...), a = f(...)`, and the
// scan takes the second declarator for a global.
const UNCORRECTED_SCAN_NAMES = ['a'];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_backendCacheStaleMark', '_squeezeToState'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7214;
const SEAM_REJECTED = 2091;
const CANDIDATES = 2856;
const CLEAN_CANDIDATES = 1701;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 1;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor. THIS CUT IS ONE OF THEM: the screen does not hold it.
const HIDDEN_ROWS = 35;
const HIDDEN_CLEAN_ROWS = 34;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 1;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [736655, 738354, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 2;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit].
const BEST_TIER_ROWS = [
  [736655, 738354, 7, 2],
  [868008, 870099, 7, 2],
];
const BEST_NINE = 7;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [868008, 2, 7, 2091],
  [68905, 3, 3, 2030],
  [912024, 3, 3, 2086],
  [910320, 3, 3, 3790],
];
// THE TIE: the two rows at the best score, with the counts the score does not
// carry. [opening, closing, units, owners, inbound reference sites, consumers,
// monolith dependencies, foundation references].
const TIE_ROWS = [
  [736655, 738354, 1699, 2, 7, 2, 0, 0],
  [868008, 870099, 2091, 2, 7, 2, 0, 0],
];
const TIE_ORDER_BY_UNITS = [736655, 868008];
// The shipped cut changed the screen: the previous contract's figures less the
// ones measured here. They are POSITIVE, because that cut took two owners out
// of the monolith and the runs that contained them with it.
const DELTA_RAW_RUNS = 9;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = 8;
const DELTA_CLEAN = 8;
const PREVIOUS_RAW_CHARS = 3560;
const PREVIOUS_RAW_AT = 614676;
// The previous contract's published list, with where each entry sat relative to
// the cut it shipped.
const PREVIOUS_RUNNERS_UP = [
  [740215, 2, 7, 1699],
  [871568, 2, 7, 2091],
  [68905, 3, 3, 2030],
  [915584, 3, 3, 2086],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. §8 measures the smallest layer at SMALLEST_LAYER_CHARS.
const CHAIN_LENGTH = 58;
const SMALLEST_LAYER_CHARS = 1559;
const SIZE_RANK = 6;
const LAYERS_SMALLER_THAN_THIS_CUT = 5;
const LAYERS_LARGER_THAN_THIS_CUT = 52;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 8;
const LAYERS_OPENING_ON_BANNER = 25;
const LAYERS_WITH_A_DEPENDENCY = 23;
// The contract of the layer cut after this one. It pins an empty MONOLITH_DEPENDENCIES, so the live count
// of layers that pin a dependency equals the figure above; §8 asserts both halves of that.
const LATER_CONTRACT = 'tests/journal-expiry-audit-boundary-contract.test.js';
// The later layer that pins a NON-EMPTY list instead: it IS among the contracts counted,
// and is set aside to recover the figure at this layer.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['portfolio-regime-badge-html-boundary-contract.test.js', 'portfolio-backend-squeeze-extract-boundary-contract.test.js', 'option-chain-error-helpers-boundary-contract.test.js', 'ai-scan-context-boundary-contract.test.js', 'apex-parity-compare-boundary-contract.test.js', 'swing-trend-context-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1623;
const INDEX_AFTER = 1425802;
const RESIDUAL_MONOLITH = 1309614;
const LOCAL_SCRIPTS_AFTER = 102;
// The tag's position among the local scripts, zero-based: the last of 102.
const TAG_LOCAL_INDEX = 101;

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


console.log('PORTFOLIO STALE MARK + SQUEEZE STATE — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_SWING_TREND_CONTEXT = SWING_TREND_CONTEXT_U.isApplied(HEAD_INDEX)
  ? SWING_TREND_CONTEXT_U.undoSwingTrendContext(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/swing-trend-context.js'), 'utf8'))
  : HEAD_INDEX;
const PRE_APEX_PARITY_COMPARE = APEX_PARITY_COMPARE_U.isApplied(PRE_SWING_TREND_CONTEXT)
  ? APEX_PARITY_COMPARE_U.undoApexParityCompare(
      PRE_SWING_TREND_CONTEXT, fs.readFileSync(path.join(ROOT, 'js/services/apex-parity-compare.js'), 'utf8'))
  : PRE_SWING_TREND_CONTEXT;
const PRE_AI_SCAN_CONTEXT = AI_SCAN_CONTEXT_U.isApplied(PRE_APEX_PARITY_COMPARE)
  ? AI_SCAN_CONTEXT_U.undoAiScanContext(
      PRE_APEX_PARITY_COMPARE, fs.readFileSync(path.join(ROOT, 'js/services/ai-scan-context.js'), 'utf8'))
  : PRE_APEX_PARITY_COMPARE;
const PRE_OPTION_CHAIN_ERROR_HELPERS = OPTION_CHAIN_ERROR_HELPERS_U.isApplied(PRE_AI_SCAN_CONTEXT)
  ? OPTION_CHAIN_ERROR_HELPERS_U.undoOptionChainErrorHelpers(
      PRE_AI_SCAN_CONTEXT, fs.readFileSync(path.join(ROOT, 'js/services/option-chain-error-helpers.js'), 'utf8'))
  : PRE_AI_SCAN_CONTEXT;
const PRE_PORTFOLIO_BETA_MISSING_REASON = PORTFOLIO_BETA_MISSING_REASON_U.isApplied(PRE_OPTION_CHAIN_ERROR_HELPERS)
  ? PORTFOLIO_BETA_MISSING_REASON_U.undoPortfolioBetaMissingReason(
      PRE_OPTION_CHAIN_ERROR_HELPERS, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-beta-missing-reason.js'), 'utf8'))
  : PRE_OPTION_CHAIN_ERROR_HELPERS;
const PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT = PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.isApplied(PRE_PORTFOLIO_BETA_MISSING_REASON)
  ? PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.undoPortfolioBackendSqueezeExtract(
      PRE_PORTFOLIO_BETA_MISSING_REASON, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-backend-squeeze-extract.js'), 'utf8'))
  : PRE_PORTFOLIO_BETA_MISSING_REASON;
const PRE_PORTFOLIO_REGIME_BADGE_HTML = PORTFOLIO_REGIME_BADGE_HTML_U.isApplied(PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT)
  ? PORTFOLIO_REGIME_BADGE_HTML_U.undoPortfolioRegimeBadgeHtml(
      PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-regime-badge-html.js'), 'utf8'))
  : PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT;
const LIVE_INDEX = JOURNAL_EXPIRY_AUDIT_U.isApplied(PRE_PORTFOLIO_REGIME_BADGE_HTML)
  ? JOURNAL_EXPIRY_AUDIT_U.undoJournalExpiryAudit(
      PRE_PORTFOLIO_REGIME_BADGE_HTML, fs.readFileSync(path.join(ROOT, 'js/services/journal-expiry-audit.js'), 'utf8'))
  : PRE_PORTFOLIO_REGIME_BADGE_HTML;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX, MODULE);

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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the scanner
// DSS 1D chart predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the eight openings the seam admits');
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
  '…and NON_ASCII_CHARS non-ASCII characters in all: the em dash and four arrows…');
eq((BODY.match(/→/g) || []).length, NON_ASCII_CHARS - EM_DASHES, '…the other four being `→`…');
ok(BODY.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => l.trim().startsWith('//')),
  '…every one of them inside a comment line, never in code or in a string the functions return');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * NON_ASCII_CHARS,
  '…three bytes in UTF-8 for one UTF-16 unit each, which is the whole of the gap between its UTF-8 and UTF-16 lengths');
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
    '…the comment that begins where the cut ends being NEXT_DOC_PREFIX…');
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…which is the comment block directly above NEXT_DECL, so the cut ends exactly where the next function\'s documentation begins and nothing of it is cut off');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits eight openings.
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
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…the next the first documentation line, the cut…');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES documentation lines are each an opening of their own…');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last being the declaration');
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the eight…');
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
    '…so PARSING_OPENINGS of the eight are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the whole comment block documenting the first function, and nothing else:
// five comment lines directly above the declaration, with the blank line above THEM left behind. The
// second function brings its own six-line block, which sits INSIDE the body.
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
  const second = blockAbove(BY_NAME.get(OWNERS_EXPECTED[1]));
  ok(second !== null && second.start > BY_NAME.get(OWNERS_EXPECTED[0]).end && second.start < BY_NAME.get(OWNERS_EXPECTED[1]).start,
    'the second owner has a comment block of its own, between the two functions…');
  eq(second.text.split('\n').filter(Boolean).length, 6, '…SIX lines of it…');
  eq(COMMENT_LINES, DOC_TAKEN_LINES + 6, '…so the body\'s eleven comment lines are the five at the top and those six');
  ok(doc.indexOf('Returns a positive number') >= 0,
    '…and the first block says what the first function returns, a claim §7 measures rather than trusts');
  ok(second.text.indexOf("'ACTIVE'") >= 0 && second.text.indexOf('never "--"') >= 0,
    '…and the second says what the adapter returns and that OFF is a real state, which §7 also measures');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the documentation is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE DOCUMENTATION WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would have left the five comment lines directly against the documentation of ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto the documentation of ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith held nowhere before the cut, once there');
}
// WHAT THE CUT LEFT. The brace of the owner above, one blank line, then the next function's documentation: the very
// join the monolith held at the END of the block, so the cut moves it and the document gains no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith holds the join `}` blank line `' + NEXT_DOC_PREFIX.slice(0, 16) + '…` once before the cut, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the second owner…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of the first documentation is held once before the cut, and is gone after it…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the documentation leaving with the block');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this documentation or declaration is left behind');
}
// THE FLOOR HIDES THIS RUN. The screen floors a run at RUN_FLOOR units measured from the DECLARATION, and measured
// there this block is DECL_UNITS_FROM_DECLARATION, under it. Measured from the documentation it clears the floor.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION < RUN_FLOOR, '…UNDER RUN_FLOOR, so the shipped screen does not hold it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and enumerates CANDIDATES_AT_DECLARATION run that ends where this cut does and opens at its declaration…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does…');
ok(BODY_END_IN_CODE - RAW_AT_IN_CODE >= RUN_FLOOR, '…while measured from the documentation it is at or above RUN_FLOOR…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…and the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT row for it: the pass exists for exactly this run');

// ───────────────────────────────────────────────────────────────────────────
section('3. Coupling: two consumers, seven calls, no dependency, two pure functions');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these two names, in this order');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…both of them functions, so this layer ships no mutable binding');
  ok(own.every((d) => !/^async function /.test(firstLineOf(CODE.slice(d.start)))), '…every one SYNCHRONOUS');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is EMPTY: no monolith name is read');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE, all of it inbound');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'TWO consumers reach in: CONSUMERS');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  eq(REC.sites.map((at) => OWNERS_EXPECTED.filter((n) => MASKED.startsWith(n, at))[0]), CONSUMER_SITE_OWNERS,
    '…which name, in order, the adapter six times and the stale-mark function once');
  eq(OWNERS_EXPECTED.map((n) => REC.sites.filter((at) => MASKED.startsWith(n, at)).length), [1, 6],
    '…so the stale-mark function is named once and the squeeze adapter six times');
  ok(REC.sites.every((at) => /^\s*\(/.test(CODE.slice(at + OWNERS_EXPECTED.filter((n) => MASKED.startsWith(n, at))[0].length))),
    '…every one of the seven followed by an opening parenthesis: all seven are CALLS, none an object key or a bare reference…');
  eq(REC.sites.map((at) => hostOf(at).name), SITE_HOSTS, '…each inside the enclosing declaration SITE_HOSTS names');
  const sync = BY_NAME.get('_technicalTfSqueezeState'), refresh = BY_NAME.get('refreshPositionsLive');
  ok(sync.start >= RAW_END_IN_CODE && refresh.start >= RAW_END_IN_CODE, '_technicalTfSqueezeState and refreshPositionsLive both sit outside the cut, below it…');
  eq([sync.start, sync.end, sync.chars], [CONSUMER_SYNC_AT, CONSUMER_SYNC_END, CONSUMER_SYNC_CHARS],
    '…_technicalTfSqueezeState opening at CONSUMER_SYNC_AT, ending at CONSUMER_SYNC_END, CONSUMER_SYNC_CHARS units long…');
  eq([refresh.start, refresh.end, refresh.chars], [CONSUMER_REFRESH_AT, CONSUMER_REFRESH_END, CONSUMER_REFRESH_CHARS],
    '…and refreshPositionsLive opening at CONSUMER_REFRESH_AT, ending at CONSUMER_REFRESH_END, CONSUMER_REFRESH_CHARS units long');
  ok(!/^async function /.test(firstLineOf(CODE.slice(sync.start))) && /^async function /.test(firstLineOf(CODE.slice(refresh.start))),
    '…the first a synchronous function and the second an async one, which awaits its own fetches and which the cut does not touch');
  eq(sync.start, DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0].start, '…the first being the very next declaration after the cut');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, so byConsumerSplit leaves nothing out…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…and is BY_CONSUMER_SPLIT, the same as byConsumer');
}
// PURE FUNCTIONS: nothing outside the block is read, written, deleted or awaited.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: two function declarations only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(await|yield|new|this)\b/g) || []).length, 0, '…no await, no yield, no `new` and no `this`…');
  eq((bodyMasked.match(/\b(window|globalThis|self|document|console|localStorage|setTimeout|fetch)\b/g) || []).length, 0,
    '…and no host global, timer, storage or fetch of any kind');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region that declares no top-level
// `var` scores a perfect zero inbound while writing globals it does not own, so the profile's answer is not
// left standing alone.
//
// THE SCAN THIS FILE INHERITED READS ONLY THE FIRST NAME OF A `var` LIST AS LOCAL. The stale-mark function
// declares `var b = f(entry.staleBid), a = f(entry.staleAsk);`, so the scan takes the second declarator for a
// global and reports an assignment to `a`, a local. The corrected scan reads every declarator.
{
  eq(nonLocalAssignmentsUncorrected(BODY), UNCORRECTED_SCAN_NAMES,
    'the inherited scan reports UNCORRECTED_SCAN_NAMES, assignments to names it takes for globals…');
  ok(nonLocalAssignmentsUncorrected(BODY).every((n) => declaredNamesIn(BODY).has(n)),
    '…every one a name this very block declares in a `var` list, so none is a global');
  eq(BODY.split('\n').filter((l) => l.indexOf('var b = f(entry.staleBid), a = f(entry.staleAsk);') >= 0).length, 1,
    '…the declaration being the stale-mark function\'s bid-and-ask line');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the block does not own');
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
section('4. THE FINDING: the previous contract named it first, and it ties one other row on every count, ordered by length alone');
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
  ok(PREVIOUS_RAW_AT < RAW_AT_IN_CODE,
    '…and it sat entirely BEFORE this block, so everything this contract measures at or after it moved down by exactly that many units');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, 'the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq(listed[0], [RAW_AT_IN_CODE + PREVIOUS_RAW_CHARS, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the FIRST of them being THIS block\'s row, at its documentation moved up by PREVIOUS_RAW_CHARS, with the same byConsumerSplit and raw nine and a length of BODY_CHARS, measured from the documentation: nothing about it changed…');
  eq(listed.slice(1).filter((r) => r[0] > PREVIOUS_RAW_AT).map((r) => r[0] - PREVIOUS_RAW_CHARS),
    [RUNNERS_UP[0][0], RUNNERS_UP[2][0]],
    '…two of the other three sitting AFTER that cut and moved down by PREVIOUS_RAW_CHARS into this contract\'s first and third runners-up…');
  eq(listed.slice(1).filter((r) => r[0] < PREVIOUS_RAW_AT).map((r) => r[0]), [RUNNERS_UP[1][0]],
    '…and one before it, which did not move: the second of this contract\'s');
  // THE BEST TIER the previous contract recorded had three rows: the cut that shipped and these two.
  eq(listOf('BEST_TIER_ROWS').slice(1).map((r) => [r[0] - PREVIOUS_RAW_CHARS, r[1] - PREVIOUS_RAW_CHARS, r[2], r[3]]), BEST_TIER_ROWS,
    'the best tier the previous contract recorded was the cut that shipped plus two more rows, and those two, moved down by PREVIOUS_RAW_CHARS, are exactly BEST_TIER_ROWS here');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidate at 2…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2 && c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 0,
    '…and that one is NOT this block: the screen does not hold it');
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
    HIDDEN_SCORE_TWO_ROWS, '…that one being exactly HIDDEN_SCORE_TWO_ROWS, and it IS this block');
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
  eq(best.filter((r) => r[2] === BEST_NINE).map((r) => r[0]), TIE_ORDER_BY_UNITS,
    '…and BOTH rows are AT it, this block and one other: a tie on both measures the score carries');
  // THE TIE, MEASURED ON WHAT THE SCORE DOES NOT CARRY, and shown to be equal on all of it.
  const tieMeasured = TIE_ROWS.map((t) => {
    const r = rows.filter((x) => x.lo === t[0] && x.hi === t[1])[0];
    const p = r.c.p, split = r.c.split;
    return [t[0], t[1], r.units, p.names.length, p.inbound, consumersOf(p).length, p.deps.length, split.foundation];
  });
  eq(tieMeasured, TIE_ROWS, 'the two rows are TIE_ROWS: the pinned length, owners, inbound sites, consumers, monolith dependencies and foundation references each');
  ok(TIE_ROWS.every((t) => t.slice(3).join() === TIE_ROWS[0].slice(3).join()),
    '…EQUAL on every count the score does not carry: the owners, the inbound sites, the consumers, the dependencies and the foundation references…');
  ok(new Set(TIE_ROWS.map((t) => t[2])).size === 2, '…and differing in LENGTH alone');
  // THE ORDER THE SCREEN PUBLISHES breaks the tie, and only its third key does.
  const bestPerAll = new Map();
  for (const r of rows) {
    const b = bestPerAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPerAll.set(r.lo, r);
  }
  const rankedAll = [...bestPerAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq(rankedAll.slice(0, 2).map((r) => r.lo), TIE_ORDER_BY_UNITS,
    'ranked by (byConsumerSplit, nine, units), the order the screen publishes, the two come in the order TIE_ORDER_BY_UNITS, this block first…');
  eq(rankedAll.slice(0, 2).map((r) => r.units), TIE_ROWS.map((t) => t[2]).sort((a, b) => a - b),
    '…the whole of the ordering being the length key, ascending: the shorter row first');
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
  eq(ranked[0][0], TIE_ORDER_BY_UNITS[1], '…the first being the other row of the tie');
}

// ───────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: the owners above, every owner below, the three runs the block makes, the region');
// ───────────────────────────────────────────────────────────────────────────
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
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
const priceDown = (d) => {
  const hb = downEnd(d);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  const l = loadTimeProfile(RAW_AT_IN_CODE, hb);
  let seam = null; try { seam = assertSeam(CODE, RAW_AT_IN_CODE, hb); } catch (e) { seam = null; }
  return { hb, p, bcs: byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), clean: runsNothingAtLoad(l), seam };
};
eq(REGION_OWNER_LIST.findIndex((d) => d.name === STALE_MARK) + 1, OWNER_POSITION, 'the cut opens on owner number OWNER_POSITION of its region…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and takes the next OWNER_COUNT, which are its two: a block in the MIDDLE of its region, with owners on both sides');
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  const r = priceUp(d);
  eq(r.lo, lo, 'taking ' + name + ' with its documentation, if it has any, opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  eq([RAW_END_IN_CODE - lo, r.p.nine, r.bcs, r.p.deps.length], [units, nine, bcs, deps],
    '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine AND on byConsumerSplit');
}
// EVERY OWNER ABOVE IT IN THE REGION, not the nearest few. Here there are four.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut…');
eq(EXTENSIONS_UP.map((e) => e[0]), OWNERS_UP.map((d) => d.name),
  '…the pinned rows being all of them, nearest first…');
{
  const priced = OWNERS_UP.map(priceUp);
  ok(priced.every((r) => assertSeam(CODE, r.lo, BODY_END_IN_CODE) === RAW_END_IN_CODE), '…every one a real seam…');
  ok(priced.every((r) => r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT),
    '…and EVERY one of them worse than the cut on both the raw nine and byConsumerSplit, so no stopping point above is better or ties…');
  ok(priced.every((r) => r.clean), '…and every one of those runs also runs nothing at load');
}
// EVERY OWNER BELOW IT IN THE REGION, not the nearest few. Here there are seventeen, and the first of them is the
// squeeze adapter's only synchronous caller. Each is priced as the cut extended down to the end of that owner.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the block…');
{
  const priced = OWNERS_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL of the ends at them real seams, every owner below being separated from the next by a blank line…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit, so no stopping point below is better or ties…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load, which the cut does not…');
  eq(Math.min.apply(null, priced.map((r) => r.p.nine)), DOWN_LOWEST_NINE, '…the lowest raw nine among them being DOWN_LOWEST_NINE…');
  eq(Math.min.apply(null, priced.map((r) => r.bcs)), DOWN_LOWEST_BCS, '…and the lowest byConsumerSplit DOWN_LOWEST_BCS, both above the cut\'s');
  eq(priced.slice(0, EXTENSIONS_DOWN_NEAREST.length).map((r) => [r.name, r.hb, r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length]),
    EXTENSIONS_DOWN_NEAREST, 'the nearest three are exactly EXTENSIONS_DOWN_NEAREST, the first of them taking the synchronous caller along');
  ok(EXTENSIONS_DOWN_NEAREST.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…each pinned closing agreeing with its pinned length');
}
// THE THREE RUNS THE TWO OWNERS MAKE. The stale-mark function alone, the adapter alone and the pair. A blank line stands
// between the two owners, so none of the three is refused. Priced by the same profile, and each tested against the screen.
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
  eq(measured, OWN_RUNS, 'the two owners make exactly the three runs OWN_RUNS');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them real seams, because a blank line stands between the owners…');
  const legal = measured.filter((r) => r[5] !== 'REFUSED');
  eq(legal.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR even measured from their documentation, the cut being the one that clears it…');
  ok(legal.filter((r) => r[4] < RUN_FLOOR).every((r) => r[5] < FULL_NINE && r[6] <= BY_CONSUMER_SPLIT),
    '…and BOTH of those scoring a lower raw nine than the cut and no worse on byConsumerSplit, so it is the floor, not the coupling, that makes the pair the candidate: the stale-mark function alone scores 1 on both measures, and is 840 units…');
  ok(legal.filter((r) => r[4] < RUN_FLOOR).every((r) => candidateRuns.filter((c) => c.lo === r[2] && c.hi === r[3]).length === 0 &&
    hiddenRows.filter((c) => c.lo === r[2] && c.hi === r[3]).length === 0),
  '…and neither the shipped screen nor the pass over its sub-floor runs holds either of them');
  eq(hiddenRows.filter((c) => legal.some((r) => r[2] === c.lo && r[3] === c.hi)).map((c) => [c.lo, c.hi]), [[RAW_AT_IN_CODE, BODY_END_IN_CODE]],
    '…the pass over sub-floor runs holding exactly ONE of the three, the cut');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).length, 0,
    '…and the shipped screen enumerating none of the runs inside the block');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner region" would forbid cutting any of
// it. This cut is owners 5 and 6 of 23, the MIDDLE of its region, so it leaves the banner, four owners above and
// seventeen below.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, above the cut');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
  ok(reg.start < RAW_AT_IN_CODE && reg.end > RAW_END_IN_CODE, '…so the cut sits INSIDE its region, in the middle of it');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the BANNER_LINE_PREFIX banner…');
  eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…and holding REGION_OWNERS owners');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  // WHAT THE CUT LEAVES BEHIND. The banner is above the cut, so the owners left in the region keep it.
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
  // THE CUT THAT SHIPPED CHANGED THE SCREEN, and the screen SHRANK: the
  // figures the previous contract pinned less the figures measured here.
  eq([prevNum('RAW_RUNS') - RAW_RUNS, prevNum('SEAM_REJECTED') - SEAM_REJECTED, prevNum('CANDIDATES') - CANDIDATES,
    prevNum('CLEAN_CANDIDATES') - CLEAN_CANDIDATES], [DELTA_RAW_RUNS, DELTA_SEAM_REJECTED, DELTA_CANDIDATES, DELTA_CLEAN],
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — non-negative, so the screen did not grow');
  ok(DELTA_RAW_RUNS > 0 && DELTA_CANDIDATES > 0,
    '…because that cut took two owners out of the monolith and every run that contained one of them with it');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => c.hi > BODY_END_IN_CODE),
  '…and every run the screen opens there ends BELOW the cut, taking ' + NEXT_DECL + ' along or more: the cut itself is not among them');

// ─────────────────────────────────────────────────────────────────────
section('7. It loads bare, both functions are pure, and the decision tables hold');
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
  const ctx = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, ctx);
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM and declares exactly its two owners');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.constructor.name', ctx)), ['Function', 'Function'],
    '…ordinary synchronous functions');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.length', ctx)), [1, 1], '…each taking the one argument');
  const stale = vm.runInContext(STALE_MARK, ctx), squeeze = vm.runInContext(SQUEEZE, ctx);
  const before = Object.getOwnPropertyNames(ctx).sort();
  // THE STALE-QUOTE MARK: a stale mark first, then the mid of a stale bid and ask, then a single stale side; only a
  // positive finite number counts, and nothing else on the entry is read.
  {
    const CASES = [
      [{ staleMark: 10 }, 10], [{ staleMark: '10.5' }, 10.5], [{ staleMark: '1e3' }, 1000], [{ staleMark: ' 7 ' }, 7], [{ staleMark: '7abc' }, 7],
      [{ staleMark: 0 }, null], [{ staleMark: -1 }, null], [{ staleMark: 'abc' }, null], [{ staleMark: Infinity }, null], [{ staleMark: NaN }, null],
      [{ staleMark: null }, null], [{ staleMark: undefined }, null], [{ staleMark: '' }, null], [{ staleMark: true }, null],
      [{ staleBid: 2, staleAsk: 4 }, 3], [{ staleBid: '2', staleAsk: '4' }, 3], [{ staleBid: 1, staleAsk: 2 }, 1.5],
      [{ staleBid: 2 }, 2], [{ staleAsk: 4 }, 4],
      [{ staleBid: 0, staleAsk: 4 }, 4], [{ staleBid: -2, staleAsk: 4 }, 4], [{ staleBid: 2, staleAsk: 0 }, 2], [{ staleBid: 2, staleAsk: 'x' }, 2],
      [{ staleBid: 0, staleAsk: 0 }, null], [{ staleBid: 'x', staleAsk: '' }, null], [{ staleBid: Infinity, staleAsk: 4 }, 4],
      [{ staleMark: 5, staleBid: 2, staleAsk: 4 }, 5], [{ staleMark: 0, staleBid: 2, staleAsk: 4 }, 3], [{ staleMark: -3, staleBid: 2 }, 2],
      [{ mark: 9, bid: 1, ask: 2, price: 3 }, null], [{ mark: 9, staleBid: 6, staleAsk: 8 }, 7],
      [{}, null], [[], null], [{ 0: 1, length: 1 }, null],
    ];
    eq(CASES.map(([e]) => stale(e)), CASES.map(([, want]) => want),
      'the stale-quote mark answers the pinned value for each of ' + CASES.length + ' entries: every rung of the ladder, every kind of non-number, and the lenient `parseFloat` reading of `\'7abc\'`');
    ok(CASES.some(([, w]) => w === null) && CASES.some(([, w]) => w !== null), '…the table holding both answers, a number and null, so it is not a table of one answer');
    eq([null, undefined, 5, 'x', true, 0, ''].map((e) => stale(e)), [null, null, null, null, null, null, null],
      'anything that is not a non-null object answers null: null, undefined, a number, a string, a boolean, zero and the empty string');
    ok(stale(Object.freeze({ staleBid: 2, staleAsk: 4 })) === 3, '…and a frozen entry is read without writing to it');
    const e = { staleBid: 2, staleAsk: 4, staleMark: 0 };
    stale(e);
    eq(e, { staleBid: 2, staleAsk: 4, staleMark: 0 }, '…the entry it was handed unchanged afterwards');
  }
  // THE SQUEEZE ADAPTER: exactly three answers, ACTIVE, OFF and null; a string is trimmed and upper-cased first.
  {
    const ACTIVE = [true, 'ACTIVE', 'active', ' Active ', 'ON', 'on', 'TRUE', 'true', 'Yes', 'yes', '1', ' 1 ', 'FIRED', 'fired'];
    const OFF = [false, 'OFF', 'off', ' Off ', 'INACTIVE', 'inactive', 'FALSE', 'false', 'No', 'no', '0', ' 0 ', 'NONE', 'none'];
    const NULLS = [null, undefined, '', ' ', 'maybe', 'ac tive', 'ACTIVE!', 'onn', 'nope', 1, 0, 2, -1, NaN, {}, [], ['ACTIVE'], () => 'ACTIVE', Symbol.iterator, new String('ACTIVE')];
    eq(ACTIVE.map((v) => squeeze(v)), ACTIVE.map(() => 'ACTIVE'), 'the adapter answers ACTIVE for each of ' + ACTIVE.length + ' spellings: true, and the six words in any case with padding…');
    eq(OFF.map((v) => squeeze(v)), OFF.map(() => 'OFF'), '…OFF for each of ' + OFF.length + ' spellings of the other six…');
    eq(NULLS.map((v) => squeeze(v)), NULLS.map(() => null), '…and null for each of ' + NULLS.length + ' other values, numbers included: 1 and 0 as NUMBERS are not states, only the strings \'1\' and \'0\' are');
    eq(new Set(ACTIVE.concat(OFF, NULLS).map((v) => squeeze(v))), new Set(['ACTIVE', 'OFF', null]), '…so the adapter has exactly three possible answers');
    ok(squeeze(false) === 'OFF' && squeeze(null) === null && squeeze(undefined) === null,
      '…OFF being a real answer that is not the same as null: `false` is OFF and a missing value is null, which the comment above it says renders as "--"');
    eq(Object.getOwnPropertyNames(ctx).sort(), before, 'calling either function defines no global in the VM it runs in');
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
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  // THE THREE CHAIN-WIDE COUNTS, and the audit forecast that NONE would move. The
  // two shape counts are asserted as comparisons between two measurements, over
  // the chain before this layer and over the whole chain, rather than carried
  // forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is NOT, asserted of the module directly: it holds NON_ASCII_CHARS non-ASCII characters, an em dash and four arrows, all in comments…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS, '…the SAME number: it did not move, as the audit forecast');
  eq(prior.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: it opens on documentation…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is the SAME LAYERS_OPENING_ON_BANNER: it did not move, as the audit forecast');
  // THE THIRD CHAIN-WIDE COUNT, and one that did not move either: layers whose
  // contract pins a non-empty MONOLITH_DEPENDENCIES. Counted over the suite with
  // this contract in it, then compared with the figure the contract that carries
  // it pins. This contract pins an empty list, so it is not among them.
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
  ok(contractsPinning.indexOf(path.basename(CONTRACT_REL)) < 0, '…this contract not being one of them…');
  {
    const later = fs.readFileSync(path.join(ROOT, LATER_CONTRACT), 'utf8');
    eq(later.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m)[1], '[]',
      '…the contract of the layer cut after this one pinning an EMPTY dependency list as well, so it is not among them either and sets nothing aside…');
    eq(contractsPinning.indexOf(path.basename(LATER_CONTRACT)), -1, '…and it is indeed not among the contracts counted…');
  }
  eq(MONOLITH_DEPENDENCIES.length, 0, '…it pinning an EMPTY list, which is why the count did not move, as the audit forecast…');
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

// ─────────────────────────────────────────────────────────────────────
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
    ['index.html', MODULE_REL, 'js/services/journal-expiry-audit.js', 'js/portfolio/portfolio-regime-badge-html.js', 'js/portfolio/portfolio-backend-squeeze-extract.js', 'js/portfolio/portfolio-beta-missing-reason.js', 'js/services/option-chain-error-helpers.js', 'js/services/ai-scan-context.js', 'js/services/apex-parity-compare.js', 'js/services/swing-trend-context.js'].sort(),
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
    '…and OPENS on the documentation of its first owner, DOC_FIRST_LINE: the boundary §2 defends');
  eq(MODULE.slice(MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1, MODULE.indexOf('\n', MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1)), DECL_FIRST_LINE,
    '…with the declaration, DECL_FIRST_LINE, on the line after the five comment lines…');
  eq(MODULE.indexOf(DECL_FIRST_LINE), DOC_TAKEN, '…at exactly DOC_TAKEN units in');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * NON_ASCII_CHARS,
    '…its UTF-8 length longer than its UTF-16 length by two bytes per non-ASCII character…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…of which it holds NON_ASCII_CHARS…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…and EM_DASHES em dash, the rest being four arrows');
  eq((MODULE.match(/→/g) || []).length, NON_ASCII_CHARS - EM_DASHES, '…which are the four arrows…');
  eq(MODULE.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).map((l) => l.trim().startsWith('//')), [true, true, true, true],
    '…on four lines, every one of them a comment line, so no non-ASCII character is code or sits inside a string');
}
// THE LOAD ORDER. The module loads bare and needs nothing from the monolith (§7), so the tag's position is not
// load-bearing for loading. It is pinned all the same: last of the local scripts, immediately before the inline
// monolith, whose two consumers stay behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/ui/scanner-dss-1d-chart.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumers call it at run time, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES BOTH OWNERS, at the seven consumer sites and nowhere else: the
  // block's own text left, the calls did not. The stale-mark function is called once, the adapter six times.
  eq(OWNERS_EXPECTED.map((n) => refSites(LIVE_INDEX, n).length), [1, 6],
    '…while the shipped document names the stale-mark function once and the adapter six times, the CONSUMER_SITES calls that stayed…');
  eq(refSites(LIVE_INDEX, STALE_MARK).length + refSites(LIVE_INDEX, SQUEEZE).length, CONSUMER_SITES,
    '…seven in all, the same CONSUMER_SITES the reconstructed base held from outside the block…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t, rel) => t + OWNERS_EXPECTED.reduce((u, n) =>
    u + refSites(fs.readFileSync(path.join(ROOT, rel), 'utf8'), n).length, 0), 0), 0,
  '…and no local script other than the module itself names either owner…');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its two owners and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMERS.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    CONSUMERS.slice().sort(), '…and so do both consumers, which call the module\'s functions at run time');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, is one of them');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the brace of the owner above, one blank line and the documentation of ' + NEXT_DECL + ', once…');
  eq(LIVE_MONOLITH.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…at the place the cut was made');
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
  const E = 'PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_';
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,700 units, not 1,699 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('staleMark', 'staleMarX');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoPortfolioStaleMarkSqueezeState(INDEX, MODULE),
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/portfolio-stale-mark-squeeze-state-undo.js'),
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
console.log('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_CONTRACT_OK');
}

main();
