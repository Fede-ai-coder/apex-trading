'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER DSS 1D CHART — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [614676,618236) in monolith coordinates — 3,560 units raw and
// 3,559 of body, TWO owners, both synchronous — now lives in js/ui/scanner-dss-1d-chart.js.
// They are the directional setup card's daily price-line chart: `_dssRender1DChart`
// draws the last 90 closes with two moving averages and optional Bollinger and
// Keltner overlays through Chart.js, replacing the last close with a live DXLink
// mark in the regular session, and `_dssRedrawCharts` calls it when the symbol's
// scan row and the chart element both exist. The block opens on the three comment
// lines that document the renderer, and the blank line above them stayed behind.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #508 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT, AND IT STOOD ALONE ─
//
// The contract before this layer published its four best other openings, and this
// was the first of them: the other row of a two-way tie at the best score the screen
// could state. The cut that contract shipped was the row it tied with, so the tie
// went with it. §4 counts, over the screen and the pass over its sub-floor runs
// together, no row with a byConsumerSplit below 2, three rows AT 2, and exactly ONE
// of the three with a raw nine of 6, the lowest: this one. The next two sit at 7.
// The claim is scoped to the two enumerations.
//
// ── PART TWO: NOTHING CALLS EITHER OWNER, AND THE ELEMENT IT LOOKS UP IS NOT THERE ─
//
// The profile found no consumer, and §3 measures that a second way: on the
// reconstructed base each name occurs in the document only inside the block, the
// renderer twice (its declaration and its one call, inside the redraw) and the
// redraw once, and in no local script at all. The three element ids the renderer
// looks up, `dss-chart-1d`, `dss-bb` and `dss-kc`, occur only inside the block and in
// no local script, in no markup attribute and in no concatenation; the overlay
// checkboxes the page does have are `dss-big-bb` and `dss-big-kc`, which this block
// never reads. So the score was all outbound, and a call returns at its element guard.
// The programme ranks by coupling, not by liveness, which is why a block nothing
// reaches scored as it did; whether it should be deleted instead is a separate
// decision this contract does not make. §9 holds the shipped document to the same
// facts: after the move NOTHING in the document names either owner.
//
// ── PART THREE: TWO MONOLITH NAMES, THREE FOUNDATION FUNCTIONS, TWO HOST NAMES ─
//
// The raw nine is 6, all of it outbound: `S` and `getUsEquityMarketSession`, two
// monolith names read only inside function bodies, so only when a function is called,
// and four references to `smA`, `calcBB` and `calcKC` in js/utils/indicators.js, whose
// tag precedes the inline monolith. byConsumerSplit is 2, the two dependencies. The
// block also needs `document` and the Chart.js global, which no application script
// declares and the document loads from a CDN before its first local script. It runs
// nothing at load: §7 loads the SHIPPED module in a VM with NOTHING defined, and it
// declares exactly its two owners.
//
// ── PART FOUR: SIX OPENINGS WERE LEGAL, FIVE PARSE, AND ONE IS A BLANK LINE ──
//
// The seam rule admits six line starts between the owner above and the declaration:
// that owner's closing brace, the blank line after it, the three documentation lines
// and the declaration. The brace does not parse as a script. The blank line does, and
// is the only opening that is an empty line. The cut takes the documentation, the
// whole comment block the programme's own blockAbove rule finds, and leaves the blank
// line, so the monolith keeps `}` + blank line + `function showDetail`, a join it held
// once at the END of the block and holds once at the place the cut was made.
// Opening at the declaration would have left three comment lines standing above
// `showDetail`, which they do not describe, and opening at the blank line would have
// fused the brace onto it.
//
// ── PART FIVE: THE INHERITED OUTBOUND SCAN IS WRONG ABOUT ONE ASSIGNMENT ─────
//
// The scan this file inherited reads only the first name of a `var` list as local. The
// renderer declares `var ma20arr=smA(closes,20),ma30arr=smA(closes,30);`, so it
// reports an assignment to `ma30arr`, a local. The corrected scan finds none, and §3
// pins both answers with controls.
//
// ── PART SIX: A BLOCK IN THE MIDDLE OF ITS REGION, UNDER A BANNER THAT IS NOT ITS OWN ─
//
// The region opens on the banner of the END of the Swing trading screen and held five
// owners: the cut was owners 3 and 4, with two above it and `showDetail` below. §5
// prices EVERY owner above and the owner below, and all three are worse than the cut
// on both the raw nine and byConsumerSplit. It prices the three runs the two owners
// make: the renderer alone is worse on both, because the redraw that calls it would
// become a consumer; the redraw alone is better on the raw nine and level on
// byConsumerSplit, but 196 units and under the floor, and neither the screen nor the
// pass over sub-floor runs holds it.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED ON THE SHIPPED MODULE ──────────────
//
// §7 drives both owners of the SHIPPED module against a fake page and a fake Chart:
// the guards, the label choice, all six overlay states, the live-mark rule on both
// sides of the half-cent threshold, and where a failure is swallowed relative to what
// was already written.
//
// ── LOAD ORDER, STATED AT THE LEVEL IT HOLDS ───────────────────────────────
//
// The module loads in a bare VM and reads the monolith only inside function bodies.
// §9 pins where the tag sits all the same — after every other local script and
// immediately before the inline monolith, so every name it reads exists before any
// call can be made.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// §8 ranks it by size against the fifty-seven layers the chain now holds: it is the
// eighteenth smallest, which §8 measures against every layer rather than asserting.
// Its body holds one em dash, in a comment, so it is not pure ASCII and the pure-ASCII
// count did NOT move; it does not open on a banner, so that count did not move either;
// and it pins a NON-EMPTY monolith dependency, so the count of layers that pin one DID
// move, by one. §8 measures all three.
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
const UNDO = require('./lib/scanner-dss-1d-chart-undo.js');
const PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U = require('./lib/portfolio-stale-mark-squeeze-state-undo.js');
const PORTFOLIO_UNREALIZED_PNL_U = require('./lib/portfolio-unrealized-pnl-undo.js');
const SWING_CHART_CACHE_EVALUATE_U = require('./lib/swing-chart-cache-evaluate-undo.js');
const APEX_PARITY_BACKEND_FETCH_U = require('./lib/apex-parity-backend-fetch-undo.js');
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
const MODULE_REL = 'js/ui/scanner-dss-1d-chart.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = 'c4ecc25';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'd6f27c1';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = 'a60efc2';
const BASE_CHARS = 1430929;
const BASE_UTF8 = 1459414;
const BASE_LF = 24722;
const BASE_SHA256 = '68d8ba6231f83b162d1d05201ccb8d7c5e458766320c0acbb3ec3fa286288afe';
const LOCAL_SCRIPTS = 100;
const TEST_FILE_COUNT = 197;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-scanner-dss-1d-chart-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/scanner-dss-1d-chart-audit.spec.js';
const CONTRACT_REL = 'tests/scanner-dss-1d-chart-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/scanner-dss-1d-chart-contract.spec.js';
const UNDO_REL = 'tests/lib/scanner-dss-1d-chart-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'd6f27c1';
const CONTRACT_SPEC_MUTANTS = 165;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 59;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/scanner-stock-scoring-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 164;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/scanner-dss-1d-chart-audit.spec.js';
const RETIRED_MUTANTS = 158;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116029;
const CODE_CHARS = 1314874;
const TOP_LEVEL_DECLS = 896;
const OWNER_REGIONS = 116;

// ── The region ───────────────────────────────────────────────────────────────
// It opens on the first of three documentation lines directly above the
// renderer, and the blank line above THOSE stayed behind as the separator.
const RAW_AT_IN_CODE = 614676;
const DECL_AT_IN_CODE = 614911;
const RAW_END_IN_CODE = 618236;
const BODY_END_IN_CODE = 618235;
const RAW_CHARS = 3560;
const BODY_CHARS = 3559;
const BODY_UTF8 = 3561;
const BODY_LF = 61;
const BODY_SHA256 = 'dcc0d033e8e99dea2bb65ed3265aa87ee97d3c189dc874c001cd4c04b9c17eb1';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// Renders a price-line chart from the daily candle buffer (Railway/Yahoo).';
const DECL_FIRST_LINE = 'function _dssRender1DChart(symbol){';
const EM_DASHES = 1;
const NON_ASCII_CHARS = 1;
const NEXT_DECL = 'showDetail';

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['_dssRender1DChart', '_dssRedrawCharts'];
const OWNER_SIZES = [3126, 195];
const RENDERER = '_dssRender1DChart';
const REDRAW = '_dssRedrawCharts';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 61;
const CODE_LINES = 55;
const COMMENT_LINES = 5;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
const OWNER_BEFORE = 'openDirectionalSetupDetail';
const BRACE_OPENING = 614673;
const BLANK_OPENING = 614675;
const DOC_TAKEN = 235;
const DOC_TAKEN_LINES = 3;
const SEAM_LEGAL_OPENINGS = 6;
const PARSING_OPENINGS = 5;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 614674;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 3324;
const CANDIDATES_AT_DECLARATION = 1;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut left behind: the closing brace of the owner above, one blank line, and
// the next function — the join the monolith already held, once, at the end of the pair.
const JOIN_AFTER_CUT = '}\n\nfunction showDetail(ticker){';
const NEXT_DECL_FIRST_LINE = 'function showDetail(ticker){';
const FUSED_IF_BLANK_TAKEN = '}\nfunction showDetail(ticker){';
const JOIN_AS_BEFORE = '}\n\n// Renders a price-line chart from the daily candle buffer (Railway/Yahoo).';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 607321;
const REGION_END = 624283;
const REGION_CHARS = 16962;
const REGION_OWNERS = 5;
const OWNER_POSITION = 3;
const REGION_OWNER_NAMES = ['_swingFetchOperationalSnapshot', 'openDirectionalSetupDetail', '_dssRender1DChart', '_dssRedrawCharts', 'showDetail'];
const BANNER_LINE_PREFIX = '// ═══';
const BANNER_NAME_LINE = '// END SWING TRADING SCREEN';
const WHOLE_REGION_NINE = 45;
const WHOLE_REGION_BCS = 29;
const WHOLE_REGION_CONSUMERS = 6;
const WHOLE_REGION_DEPS = 12;
const WHOLE_REGION_SIB = 0;

// ── Taking more, priced: the owners above; the owner below ───────────────────
// [name of the first owner taken, opening, raw units to the cut's raw end, raw
// nine, byConsumerSplit, monolith dependencies]. Both owners above it in the
// region; §5 prices all of them.
const EXTENSIONS_UP = [
  ['openDirectionalSetupDetail', 608340, 9896, 21, 9, 8],
  ['_swingFetchOperationalSnapshot', 607516, 10720, 25, 10, 8],
];
const OWNERS_ABOVE = 2;
// Below: ONE owner stays in the region, `showDetail`. Taking it is a real seam and is priced.
// [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['showDetail', 624282, 9606, 28, 23, 7],
];
const OWNERS_BELOW = 1;
// The first declarations after the cut: [name, 'LEGAL' | 'REFUSED'].
const DOWN_AFTER = [['showDetail', 'LEGAL'], ['selAgentById', 'REFUSED'], ['selAgent', 'LEGAL'], ['appendMsg', 'REFUSED'], ['appendAgentMsg', 'REFUSED'], ['appendSysMsg', 'REFUSED'], ['appendTyping', 'REFUSED'], ['removeEl', 'REFUSED']];
const DOWN_AFTER_COUNT = 8;
const REFUSAL_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
// THE THREE RUNS the two owners make between them, one of which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites] — or the
// refusal the seam rule gives when the run ends inside the block.
const OWN_RUNS = [
  ['_dssRender1DChart', '_dssRender1DChart', 614676, 618038, 3362, 7, 3, ['S', 'getUsEquityMarketSession'], 1],
  ['_dssRender1DChart', '_dssRedrawCharts', 614676, 618235, 3559, 6, 2, ['S', 'getUsEquityMarketSession'], 0],
  ['_dssRedrawCharts', '_dssRedrawCharts', 618039, 618235, 196, 2, 2, ['S', '_dssRender1DChart'], 0],
];
const OWN_RUNS_LEGAL = 3;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 1;
// The runs the shipped screen opens at the renderer's declaration, by length: the renderer alone, the pair, and the pair with the
// region's last owner, `showDetail`.
const RUNS_OPENING_AT_DECLARATION_UNITS = [3127, 3324, 9371];

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 6;
const BY_CONSUMER = 6;
const BY_CONSUMER_SPLIT = 2;
const CONSUMERS = [];
const INBOUND_REFERENCES = 0;
const MONOLITH_DEPENDENCIES = ['S', 'getUsEquityMarketSession'];
const DEP_S_AT = 1067;
const DEP_S_END = 3597;
const DEP_MARKET_AT = 141323;
const DEP_MARKET_END = 145022;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const OUTBOUND_MODULE_REFERENCES = 4;
const FOUNDATION_NAMES = ['calcBB', 'calcKC', 'smA'];
const FOUNDATION_MODULE = 'js/utils/indicators.js';
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 4;
const NON_LOCAL_ASSIGNMENTS = 0;
const UNCORRECTED_SCAN_NAMES = ['ma30arr'];
const HOST_GLOBAL_MENTIONS = 7;
const EVALUATION_TIME_READS = [];
// WHERE THE NAMES OCCUR. The renderer is named twice in the document (its declaration and the one
// call, inside the redraw) and the redraw once (its declaration): nothing outside the block names either.
const NAME_OCCURRENCES_IN_DOCUMENT = [2, 1];
const NAME_OCCURRENCES_IN_MODULES = [0, 0];
// THE THREE ELEMENT IDS the renderer looks up, and how often each occurs in the document and in every
// local script: [id, occurrences in the document, occurrences in the local scripts].
const ELEMENT_IDS = [
  ['dss-chart-1d', 2, 0],
  ['dss-bb', 2, 0],
  ['dss-kc', 2, 0],
];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_dssRender1DChart', '_dssRedrawCharts'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7223;
const SEAM_REJECTED = 2091;
const CANDIDATES = 2864;
const CLEAN_CANDIDATES = 1709;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 2;
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
  [740215, 741914, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 3;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit].
const BEST_TIER_ROWS = [
  [614911, 618235, 6, 2],
  [740215, 741914, 7, 2],
  [871568, 873659, 7, 2],
];
const BEST_NINE = 6;
const SECOND_BEST_NINE = 7;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [740215, 2, 7, 1699],
  [871568, 2, 7, 2091],
  [68905, 3, 3, 2030],
  [915584, 3, 3, 2086],
];
// The shipped cut changed the screen: the previous contract's figures less the
// ones measured here. They are POSITIVE, because that cut took four owners out
// of the monolith and the runs that contained them with it.
const DELTA_RAW_RUNS = 18;
const DELTA_SEAM_REJECTED = 3;
const DELTA_CANDIDATES = 3;
const DELTA_CLEAN = 3;
const PREVIOUS_RAW_CHARS = 1694;
const PREVIOUS_RAW_AT = 71214;
// The previous contract's published list, with where each entry sat relative to
// the cut it shipped.
const PREVIOUS_RUNNERS_UP = [
  [616605, 2, 6, 3324],
  [741909, 2, 7, 1699],
  [873262, 2, 7, 2091],
  [68905, 3, 3, 2030],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. §8 measures the smallest layer at SMALLEST_LAYER_CHARS.
const CHAIN_LENGTH = 57;
const SMALLEST_LAYER_CHARS = 1559;
const SIZE_RANK = 18;
const LAYERS_SMALLER_THAN_THIS_CUT = 17;
const LAYERS_LARGER_THAN_THIS_CUT = 39;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 8;
const LAYERS_OPENING_ON_BANNER = 25;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 22;
const LAYERS_WITH_A_DEPENDENCY = 23;
// The contract of the layer cut after this one. It pins an empty MONOLITH_DEPENDENCIES, so the live count
// of layers that pin a dependency equals the figure above; §8 asserts both halves of that.
const LATER_CONTRACT = 'tests/portfolio-stale-mark-squeeze-state-boundary-contract.test.js';
// The later layer that pins a NON-EMPTY list instead: it IS among the contracts counted,
// and is set aside to recover the figure at this layer.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['portfolio-regime-badge-html-boundary-contract.test.js', 'portfolio-backend-squeeze-extract-boundary-contract.test.js', 'option-chain-error-helpers-boundary-contract.test.js', 'ai-scan-context-boundary-contract.test.js', 'apex-parity-compare-boundary-contract.test.js', 'swing-trend-context-boundary-contract.test.js', 'apex-parity-backend-fetch-boundary-contract.test.js', 'swing-chart-cache-evaluate-boundary-contract.test.js', 'portfolio-unrealized-pnl-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 3504;
const INDEX_AFTER = 1427425;
const RESIDUAL_MONOLITH = 1311314;
const LOCAL_SCRIPTS_AFTER = 101;
// The tag's position among the local scripts, zero-based: the last of 101.
const TAG_LOCAL_INDEX = 100;

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


console.log('SCANNER DSS 1D CHART — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_PORTFOLIO_UNREALIZED_PNL = PORTFOLIO_UNREALIZED_PNL_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_UNREALIZED_PNL_U.undoPortfolioUnrealizedPnl(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-unrealized-pnl.js'), 'utf8'))
  : HEAD_INDEX;
const PRE_SWING_CHART_CACHE_EVALUATE = SWING_CHART_CACHE_EVALUATE_U.isApplied(PRE_PORTFOLIO_UNREALIZED_PNL)
  ? SWING_CHART_CACHE_EVALUATE_U.undoSwingChartCacheEvaluate(
      PRE_PORTFOLIO_UNREALIZED_PNL, fs.readFileSync(path.join(ROOT, 'js/services/swing-chart-cache-evaluate.js'), 'utf8'))
  : PRE_PORTFOLIO_UNREALIZED_PNL;
const PRE_APEX_PARITY_BACKEND_FETCH = APEX_PARITY_BACKEND_FETCH_U.isApplied(PRE_SWING_CHART_CACHE_EVALUATE)
  ? APEX_PARITY_BACKEND_FETCH_U.undoApexParityBackendFetch(
      PRE_SWING_CHART_CACHE_EVALUATE, fs.readFileSync(path.join(ROOT, 'js/services/apex-parity-backend-fetch.js'), 'utf8'))
  : PRE_SWING_CHART_CACHE_EVALUATE;
const PRE_SWING_TREND_CONTEXT = SWING_TREND_CONTEXT_U.isApplied(PRE_APEX_PARITY_BACKEND_FETCH)
  ? SWING_TREND_CONTEXT_U.undoSwingTrendContext(
      PRE_APEX_PARITY_BACKEND_FETCH, fs.readFileSync(path.join(ROOT, 'js/services/swing-trend-context.js'), 'utf8'))
  : PRE_APEX_PARITY_BACKEND_FETCH;
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
const PRE_JOURNAL_EXPIRY_AUDIT = JOURNAL_EXPIRY_AUDIT_U.isApplied(PRE_PORTFOLIO_REGIME_BADGE_HTML)
  ? JOURNAL_EXPIRY_AUDIT_U.undoJournalExpiryAudit(
      PRE_PORTFOLIO_REGIME_BADGE_HTML, fs.readFileSync(path.join(ROOT, 'js/services/journal-expiry-audit.js'), 'utf8'))
  : PRE_PORTFOLIO_REGIME_BADGE_HTML;
const LIVE_INDEX = PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.isApplied(PRE_JOURNAL_EXPIRY_AUDIT)
  ? PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.undoPortfolioStaleMarkSqueezeState(
      PRE_JOURNAL_EXPIRY_AUDIT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-stale-mark-squeeze-state.js'), 'utf8'))
  : PRE_JOURNAL_EXPIRY_AUDIT;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoScannerDss1dChart(LIVE_INDEX, MODULE);

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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the scanner
// stock scoring predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the six openings the seam admits');
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
  '…and NON_ASCII_CHARS non-ASCII character in all, so the em dash is the whole of it…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * NON_ASCII_CHARS,
  '…three bytes in UTF-8 for one UTF-16 unit, which is the whole of the gap between its UTF-8 and UTF-16 lengths');
ok(BODY.split('\n').filter((l) => /—/.test(l)).every((l) => l.trim().startsWith('//')),
  '…and that dash sits in a comment, never in code or in a string the renderer hands to the chart');
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
  eq(next.start, RAW_END_IN_CODE, '…which begins exactly where the cut ends: no comment, banner or blank line stands between them…');
  eq(blockAbove(next), null, '…and the programme\'s blockAbove rule finds no documentation above it, so nothing of it is cut off');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits six openings.
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
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the six…');
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
    '…so PARSING_OPENINGS of the six are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the whole comment block documenting the renderer, and nothing else:
// three comment lines directly above the declaration, with the blank line above THEM left behind.
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
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[1])), null,
    '…while the second owner has no comment block of its own');
  ok(doc.indexOf('This is a line chart, NOT fake OHLC.') >= 0,
    '…and which says it draws a LINE chart from closes, a claim §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the documentation is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE DOCUMENTATION WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DECL_FIRST_LINE) >= 0,
    'cutting at the declaration would have left the three comment lines standing directly above ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the reconstructed monolith held nowhere, once there');
}
// WHAT THE CUT LEFT. The brace of the owner above, one blank line, then the next function: the very join the
// reconstructed monolith held at the END of the block, so the cut moved it and the document gained no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the reconstructed monolith held the join `}` blank line `' + NEXT_DECL + '` once, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the second owner…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of the documentation was held once, and is gone after the cut…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the documentation leaving with the block');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this documentation or declaration is left behind');
}
// THE SCREEN SAW THE DECLARATION, not the documentation. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, and the opening it takes for this run is the declaration, three lines below the cut.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION >= RUN_FLOOR, '…at or above RUN_FLOOR, so the floor does not hide it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the shipped screen enumerates exactly CANDIDATES_AT_DECLARATION run that ends where this cut does and opens at its declaration…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does, so the cut is a refinement of a row the screen has: three documentation lines further up');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…and the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT rows for it, since it skipped nothing here');

// ───────────────────────────────────────────────────────────────────────────
section('3. Coupling: no consumer anywhere, two monolith names read at call time, three foundation functions');
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
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth, the inbound references from outside, is ZERO too: INBOUND_REFERENCES…');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…the ninth, the dependency direction, is MONOLITH_DEPENDENCIES: two monolith names are read');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…and OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE, all of it outbound: two dependencies and four foundation references');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), CONSUMERS, 'NO consumer reaches in: CONSUMERS is empty…');
eq(REC.sites, [], '…at no site at all');
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation references, which byConsumerSplit leaves out…');
  eq(split.foundationNames, FOUNDATION_NAMES, '…they are the three indicator functions FOUNDATION_NAMES…');
  eq(split.foundationNames.map((n) => MODULE_OWNERS.get(n)), [FOUNDATION_MODULE, FOUNDATION_MODULE, FOUNDATION_MODULE],
    '…all three owned by FOUNDATION_MODULE…');
  const fTag = '<script src="./' + FOUNDATION_MODULE + '"></script>';
  ok(count(INDEX, fTag) === 1 && INDEX.indexOf(fTag) < CODE_AT,
    '…whose tag occurs once and PRECEDES the inline monolith, so the three functions exist before any call can be made…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…so byConsumerSplit is BY_CONSUMER_SPLIT, the two dependencies and nothing else');
  eq(BY_CONSUMER - FOUNDATION_OUTBOUND, BY_CONSUMER_SPLIT, '…which is byConsumer less the foundation references');
}
// THE DEPENDENCIES, and when they are read. `S` is a `const` at the top of the monolith and
// `getUsEquityMarketSession` a function declaration. Both are read inside a function body, so only
// when the renderer or the redraw is CALLED, which is long after the monolith has evaluated.
{
  const S = BY_NAME.get('S'), market = BY_NAME.get('getUsEquityMarketSession');
  eq([S.start, S.end, S.form], [DEP_S_AT, DEP_S_END, 'const'], '`S` is a `const` declared at DEP_S_AT, ending at DEP_S_END…');
  eq([market.start, market.end, market.form], [DEP_MARKET_AT, DEP_MARKET_END, 'function'],
    '…and `getUsEquityMarketSession` a function declared at DEP_MARKET_AT, ending at DEP_MARKET_END');
  ok(S.start < RAW_AT_IN_CODE && market.start < RAW_AT_IN_CODE, 'both are declared ABOVE the block, in the monolith that stays…');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  const reads = (name) => refSites(bodyMasked, name).map((at) => RAW_AT_IN_CODE + at);
  eq([reads('S').length, reads('getUsEquityMarketSession').length], [2, 1],
    '…`S` read twice, once by each owner, and the market session once, by the renderer…');
  ok(reads('S').concat(reads('getUsEquityMarketSession')).every((at) => FN_BODIES.some((r) => at >= r.start && at <= r.end)),
    '…every read inside a function body, so none is an evaluation-time read');
  ok(/^\s*\.scanData\b/.test(bodyMasked.slice(refSites(bodyMasked, 'S')[0] + 1)), '…and `S` is used only as `S.scanData`, a read of a property');
  eq(BODY.split('\n').filter((l) => /\bS\.scanData\b/.test(l)).length, 2, '…on two lines of the block, both a `.find(...)` over the scan rows');
}
// THE HOST. The renderer needs a document with three elements, the Chart.js global and a canvas context. Chart is
// declared by no application script: it is the CDN library the document loads before its first local script.
{
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, 'the block mentions `document` HOST_GLOBAL_MENTIONS times and window, globalThis and self never…');
  ok(!BY_NAME.has('Chart') && !MODULE_OWNERS.has('Chart'), '…and `Chart`, which it constructs, is declared by neither the monolith nor any shipped module…');
  ok(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/Chart\.js\/[\d.]+\/chart\.umd\.min\.js"><\/script>/.test(INDEX.slice(0, INDEX.indexOf('<script src="./'))),
    '…being the Chart.js library the document loads from a CDN in its head, before the first local script');
  eq(count(BODY, 'new Chart('), 1, '…constructed once, by the renderer');
}
// NOTHING NAMES EITHER OWNER BUT THE BLOCK ITSELF. The profile finds zero outside references to the two
// names in the monolith, in static markup, in generated markup and in the shipped modules. That is a zero from a
// word scan, so it is measured a second, different way: every occurrence of either name in the whole document and
// in every local script, wherever it sits.
{
  const everywhere = (name) => refSites(INDEX, name);
  eq(OWNERS_EXPECTED.map((n) => everywhere(n).length), NAME_OCCURRENCES_IN_DOCUMENT,
    'the renderer occurs in the whole document NAME_OCCURRENCES_IN_DOCUMENT times — its declaration and the one call — and the redraw once, its declaration…');
  ok(OWNERS_EXPECTED.every((n) => everywhere(n).every((at) => at - CODE_AT >= RAW_AT_IN_CODE && at - CODE_AT < RAW_END_IN_CODE)),
    '…every occurrence inside the block, so nothing outside it names either owner…');
  eq(OWNERS_EXPECTED.map((n) => SIBLINGS.reduce((t, s) => t + refSites(s.src, n).length, 0)), NAME_OCCURRENCES_IN_MODULES,
    '…and none in any local script, comments and strings included');
  const call = refSites(BODY, RENDERER).filter((at) => BODY.slice(at, at + RENDERER.length + 1) === RENDERER + '(' &&
    BODY.slice(at - 'function '.length, at) !== 'function ');
  eq(call.map((at) => hostOf(RAW_AT_IN_CODE + at).name), [REDRAW],
    '…the one call to the renderer sitting inside the redraw, which nothing calls');
  // IT IS NOT BUILT AT RUN TIME EITHER: no name is assembled from parts, nor looked up as a string.
  ok(!/_dssRender1DChart|_dssRedrawCharts\b/.test(INDEX.replace(BODY, '')),
    'neither name occurs anywhere in the document once the block is removed, so no handler, attribute or template can reach them');
  ok(/_dssRedrawLargeCharts\b/.test(INDEX) && !/_dssRedrawCharts\b/.test(INDEX.replace(BODY, '')),
    '…the overlay checkboxes calling `_dssRedrawLargeCharts`, a different function with a different name, so the second owner is not what they reach');
}
// THE THREE ELEMENT IDS the renderer looks up. They occur nowhere but inside the block: not in the markup,
// not in any template the monolith generates and not in any local script. The 4-hour and 1-day charts the
// document does draw live under other ids.
{
  eq(ELEMENT_IDS.map(([id]) => count(INDEX, id)), ELEMENT_IDS.map(([, d]) => d),
    'the three ids the renderer looks up occur in the whole document ELEMENT_IDS counts of times…');
  eq(ELEMENT_IDS.map(([id]) => SIBLINGS.reduce((t, s) => t + count(s.src, id), 0)), ELEMENT_IDS.map(([, , m]) => m),
    '…and in the local scripts never…');
  ok(ELEMENT_IDS.every(([id]) => CODE.indexOf(id) >= RAW_AT_IN_CODE && CODE.lastIndexOf(id) < RAW_END_IN_CODE),
    '…every occurrence inside the block…');
  ok(!/id\s*=\s*["']dss-(?:chart-1d|bb|kc)["']/.test(INDEX) && !/["']dss-chart-["']\s*\+|["']dss-["']\s*\+/.test(INDEX),
    '…none of them a markup attribute, and none assembled by concatenation anywhere in the document…');
  eq(count(INDEX, 'dss-canvas-1d'), 2, '…the canvas id the renderer writes into its element occurring only in the block, as the writer and the reader…');
  eq(['dss-big-bb', 'dss-big-kc'].map((id) => count(INDEX, 'id="' + id + '"')), [1, 1],
    '…while the overlay checkboxes the document does have are `dss-big-bb` and `dss-big-kc`, which this block never reads');
  eq(['dss-big-bb', 'dss-big-kc'].map((id) => count(BODY, id)), [0, 0], '…as the count of them inside the block shows');
}
// TWO OF THE NINE DIRECTIONS NEED A SECOND MEASUREMENT. Pure functions: nothing outside the block is
// written, deleted or awaited. The renderer DOES write to the page: its element's innerHTML.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: two function declarations only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(await|yield|this)\b/g) || []).length, 0, '…no await, no yield and no `this`…');
  eq((bodyMasked.match(/\b(window|globalThis|self|console|localStorage|setTimeout|setInterval|fetch)\b/g) || []).length, 0,
    '…and no window, timer, storage, console or fetch of any kind');
  eq((bodyMasked.match(/\binnerHTML\s*=/g) || []).length, 1, '…its only write to the page being the one `innerHTML` assignment on the element it looked up');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region that declares no top-level
// `var` scores a perfect zero inbound while writing globals it does not own, so the profile's answer is not
// left standing alone.
//
// THE SCAN THIS FILE INHERITED READS ONLY THE FIRST NAME OF A `var` LIST AS LOCAL. The renderer declares
// `var ma20arr=smA(closes,20),ma30arr=smA(closes,30);`, so it takes the second name for a global and reports
// an assignment to a name that is a local. The corrected scan reads every declarator.
{
  eq(nonLocalAssignmentsUncorrected(BODY), UNCORRECTED_SCAN_NAMES,
    'the inherited scan reports UNCORRECTED_SCAN_NAMES, assignments to names it takes for globals…');
  ok(nonLocalAssignmentsUncorrected(BODY).every((n) => declaredNamesIn(BODY).has(n)),
    '…every one a name this very block declares in a `var` list, so none is a global');
  eq(BODY.split('\n').filter((l) => l.indexOf('var ma20arr=smA(closes,20),ma30arr=smA(closes,30);') >= 0).length, 1,
    '…the declaration being the renderer\'s two-moving-average line');
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
section('4. THE FINDING: the previous contract named it, and it now stands ALONE at the best score the screen states');
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
  ok(PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS <= RAW_AT_IN_CODE + PREVIOUS_RAW_CHARS && PREVIOUS_RAW_AT < RAW_AT_IN_CODE,
    '…and it sat entirely BEFORE this block, so everything this contract measures at or after it moved down by exactly that many units');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, 'the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq(listed[0], [DECL_AT_IN_CODE + PREVIOUS_RAW_CHARS, BY_CONSUMER_SPLIT, FULL_NINE, DECL_UNITS_FROM_DECLARATION],
    '…the FIRST of them being THIS block\'s row, at the declaration moved up by PREVIOUS_RAW_CHARS, with the same byConsumerSplit, raw nine and length: nothing about it changed…');
  eq(listed.slice(1).filter((r) => r[0] > PREVIOUS_RAW_AT).map((r) => r[0] - PREVIOUS_RAW_CHARS),
    [RUNNERS_UP[0][0], RUNNERS_UP[1][0]],
    '…two of the other three sitting AFTER that cut and moved down by PREVIOUS_RAW_CHARS into this contract\'s first two runners-up…');
  eq(listed.slice(1).filter((r) => r[0] < PREVIOUS_RAW_AT).map((r) => r[0]), [RUNNERS_UP[2][0]],
    '…and one before it, which did not move: the third of this contract\'s');
  // THE TIE THE PREVIOUS CONTRACT RECORDED IS GONE, and the row it tied with is the cut that shipped.
  ok(prevText.indexOf('TIE_ROWS') >= 0, 'the previous contract recorded a TIE_ROWS of two rows at the best score…');
  eq(listOf('TIE_ROWS').map((t) => t[0]), [PREVIOUS_RAW_AT, DECL_AT_IN_CODE + PREVIOUS_RAW_CHARS],
    '…the cut that shipped and this block, in that order, tied on both measures the score carries…');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidates at 2, this block\'s row among them…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2 && c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 1,
    '…exactly one of them being this block');
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
    HIDDEN_SCORE_TWO_ROWS, '…that one being exactly HIDDEN_SCORE_TWO_ROWS, and not this block');
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
  eq(atBestNine.map((r) => r[0]), [DECL_AT_IN_CODE],
    '…and exactly ONE row is AT it: this block\'s. The tie the previous contract recorded is gone with the cut that shipped, and nothing else ties');
  eq(Math.min.apply(null, best.filter((r) => r[2] !== BEST_NINE).map((r) => r[2])), SECOND_BEST_NINE,
    '…every other row at 2 having a raw nine of SECOND_BEST_NINE or more');
  eq(best.filter((r) => r[2] === SECOND_BEST_NINE).length, 2, '…TWO rows sitting at SECOND_BEST_NINE, neither this block');
  // THE ORDER THE SCREEN PUBLISHES agrees with the measure, so no tie-break is used.
  const bestPerAll = new Map();
  for (const r of rows) {
    const b = bestPerAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPerAll.set(r.lo, r);
  }
  const rankedAll = [...bestPerAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq(rankedAll[0].lo, DECL_AT_IN_CODE,
    'ranked by (byConsumerSplit, nine, units), the order the screen publishes, this block\'s row comes FIRST…');
  ok(rankedAll[0].nine < rankedAll[1].nine && rankedAll[0].bcs <= rankedAll[1].bcs,
    '…ahead of the second row on the raw nine, so the length key, the third, decides nothing here');
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
}

// ───────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would have cost: the owners above, the owner below, the three runs the block makes, the region');
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
  return { hb, p, bcs: byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), clean: runsNothingAtLoad(l) };
};
eq(REGION_OWNER_LIST.map((d) => d.name), REGION_OWNER_NAMES, 'the region holds exactly REGION_OWNER_NAMES, in this order…');
eq(REGION_OWNER_LIST.findIndex((d) => d.name === RENDERER) + 1, OWNER_POSITION, '…the cut opening on owner number OWNER_POSITION of them…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and taking the next OWNER_COUNT, which are its two: a block in the MIDDLE of its region, with owners on both sides');
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  const r = priceUp(d);
  eq(r.lo, lo, 'taking ' + name + ' with its documentation, if it has any, opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  eq([RAW_END_IN_CODE - lo, r.p.nine, r.bcs, r.p.deps.length], [units, nine, bcs, deps],
    '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine AND on byConsumerSplit');
}
// EVERY OWNER ABOVE IT IN THE REGION, not the nearest few. Here there are two.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut…');
eq(EXTENSIONS_UP.map((e) => e[0]), OWNERS_UP.map((d) => d.name),
  '…the pinned rows being all of them, nearest first…');
{
  const priced = OWNERS_UP.map(priceUp);
  ok(priced.every((r) => assertSeam(CODE, r.lo, BODY_END_IN_CODE) === RAW_END_IN_CODE), '…every one a real seam…');
  ok(priced.every((r) => r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT),
    '…and EVERY one of them worse than the cut on both the raw nine and byConsumerSplit, so no stopping point above is better or ties…');
  ok(priced.every((r) => r.clean), '…and every one of those runs also runs nothing at load');
  ok(priced.every((r) => r.p.deps.length > MONOLITH_DEPENDENCIES.length),
    '…each reading more monolith names than the cut\'s two');
}
// THE OWNER BELOW. `showDetail` is the last owner of the region, directly after the block, and it IS the
// consumer of the card the page opens. Taking it makes a real seam, and it is priced.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owner below the block…');
eq(OWNERS_DOWN.map((d) => d.name), EXTENSIONS_DOWN.map((e) => e[0]), '…the pinned row being that owner…');
for (const [name, closing, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const r = priceDown(BY_NAME.get(name));
  eq(r.hb, closing, 'taking ' + name + ' as well ends the cut at the pinned offset…');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, r.hb) > r.hb, true, '…a real seam…');
  eq([r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length], [units, nine, bcs, deps],
    '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT && r.clean, '…worse than the cut on the raw nine AND on byConsumerSplit, and it also runs nothing at load');
}
// THE FIRST DECLARATIONS AFTER THE CUT. Some of the ends the seam rule could take there are refused (no structural
// separator between adjacent one-line functions), and the ones it accepts are priced.
eq(DECLS.filter((d) => d.start >= RAW_END_IN_CODE).slice(0, DOWN_AFTER_COUNT).map((d) => [d.name, (() => {
  try { assertSeam(CODE, RAW_AT_IN_CODE, downEnd(d)); return 'LEGAL'; } catch (e) { return e.message === REFUSAL_ERROR ? 'REFUSED' : e.message; }
})()]), DOWN_AFTER,
'the first DOWN_AFTER_COUNT declarations after the cut are DOWN_AFTER: each end the seam rule refuses, it refuses with REFUSAL_ERROR, and the rest are real seams');
for (const d of DECLS.filter((x) => x.start >= RAW_END_IN_CODE).slice(0, DOWN_AFTER_COUNT)) {
  let legal = true; try { assertSeam(CODE, RAW_AT_IN_CODE, downEnd(d)); } catch (e) { legal = false; }
  if (!legal) continue;
  const r = priceDown(d);
  ok(r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT, 'ending the cut at ' + d.name + ' is legal and WORSE than the cut on the raw nine and on byConsumerSplit');
}
// THE THREE RUNS THE TWO OWNERS MAKE. The renderer alone, the redraw alone and the pair. A blank line stands
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
  eq(legal.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, 'one of them, the redraw alone, is under RUN_FLOOR…');
  ok(legal.filter((r) => r[4] < RUN_FLOOR).every((r) => r[5] < FULL_NINE && r[6] <= BY_CONSUMER_SPLIT),
    '…and scores better than the cut on the raw nine and no worse on byConsumerSplit, so it is the floor, not the coupling, that rules it out: it is 196 units and calls the renderer, which the cut would then have to leave behind…');
  ok(legal.filter((r) => r[4] >= RUN_FLOOR && r[1] === RENDERER).every((r) => r[5] > FULL_NINE && r[6] > BY_CONSUMER_SPLIT),
    '…while the renderer alone clears the floor and is WORSE than the pair on both, because the redraw that calls it would become a consumer…');
  ok(legal.filter((r) => r[4] < RUN_FLOOR).every((r) => candidateRuns.filter((c) => c.lo === r[2] && c.hi === r[3]).length === 0 &&
    hiddenRows.filter((c) => c.lo === r[2] && c.hi === r[3]).length === 0),
  '…and neither the shipped screen nor the pass over its sub-floor runs holds the run under the floor');
  eq(candidateRuns.filter((c) => c.lo >= DECL_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).length, 2,
    '…the screen enumerating two of the runs inside the block, the renderer alone and the pair');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner region" would forbid cutting any of
// it. This cut is owners 3 and 4 of 5, the MIDDLE of its region, so it leaves the banner, two owners above and
// one below. The banner names the END of the Swing trading screen, which this block is not.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, above the cut');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
  ok(reg.start < RAW_AT_IN_CODE && reg.end > RAW_END_IN_CODE, '…so the cut sits INSIDE its region, in the middle of it');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on a `// ═══` banner rule…');
  eq(CODE.slice(reg.start, reg.start + 160).split('\n')[1], BANNER_NAME_LINE, '…whose title is BANNER_NAME_LINE: the end of another screen, not this block\'s subject…');
  eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…and holding REGION_OWNERS owners');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  // WHAT THE CUT LEAVES BEHIND. The banner is above the cut, so the three owners left in the region keep it.
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
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — positive, so the screen shrank');
  ok(DELTA_RAW_RUNS > 0 && DELTA_CANDIDATES > 0,
    '…because that cut took four owners out of the monolith and every run that contained one of them with it');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).map((c) => c.units).sort((a, b) => a - b), RUNS_OPENING_AT_DECLARATION_UNITS,
  '…and the runs the screen opens there are RUNS_OPENING_AT_DECLARATION_UNITS long: the renderer alone, the pair, and the pair with showDetail, so the cut is the middle one of three');

// ─────────────────────────────────────────────────────────────────────
section('7. The SHIPPED module loads bare, nothing runs at load, and the renderer and the redraw behave as the document uses them');
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
// A fake page, a fake Chart.js and fakes of the five names the block reads, so every branch can be driven and every
// call the block makes can be recorded. Nothing here is the real library: it records what it is given.
const plain = (v) => JSON.parse(JSON.stringify(v));
function world(opts) {
  opts = Object.assign({ regular: true, bb: undefined, kc: undefined, noElement: false, chartThrows: false, bbThrows: false }, opts || {});
  const log = { charts: [], smA: [], bb: [], kc: [], lookups: [], writes: [], ctxCalls: [] };
  const els = {};
  if (!opts.noElement) {
    els['dss-chart-1d'] = {
      set innerHTML(v) { log.writes.push(v); els['dss-canvas-1d'] = v.indexOf('id="dss-canvas-1d"') >= 0
        ? { getContext(kind) { log.ctxCalls.push(kind); return 'CTX:' + kind; } } : undefined; },
      get innerHTML() { return log.writes[log.writes.length - 1]; },
    };
  }
  if (opts.bb !== undefined) els['dss-bb'] = { checked: opts.bb };
  if (opts.kc !== undefined) els['dss-kc'] = { checked: opts.kc };
  const ctx = vm.createContext(Object.create(null));
  ctx.document = { getElementById(id) { log.lookups.push(id); return els[id] || null; } };
  ctx.Chart = function Chart(c, cfg) {
    if (opts.chartThrows) throw new Error('chart failed');
    log.charts.push({ c, cfg: plain(cfg) });
  };
  ctx.smA = (arr, n) => { log.smA.push([plain(arr), n]); return arr.map((_, i) => 'sma' + n + ':' + i); };
  ctx.calcBB = (closes) => { if (opts.bbThrows) throw new Error('bb failed'); log.bb.push(plain(closes)); return { upper: closes.map((_, i) => 'u' + i), lower: closes.map((_, i) => 'l' + i) }; };
  ctx.calcKC = (candles) => { log.kc.push(plain(candles)); return { upper: candles.map((_, i) => 'ku' + i), lower: candles.map((_, i) => 'kl' + i) }; };
  ctx.getUsEquityMarketSession = () => ({ isRegularSession: opts.regular });
  ctx.S = { scanData: [] };
  // THE SHIPPED MODULE is what loads here, not a slice of the reconstructed
  // monolith: §9 proves the two are the same bytes.
  vm.runInContext(MODULE, ctx);
  return { ctx, log, els };
}
const mkCandles = (n, withDate) => Array.from({ length: n }, (_, i) => Object.assign(
  { t: Date.UTC(2024, 0, 15 + (i % 10)) / 1000, c: i + 1, h: i + 2, l: i, o: i },
  withDate && i % 2 === 0 ? { date: 'D' + i } : {}));
const row = (extra) => Object.assign({ ticker: 'AAA', candles: mkCandles(120), price: '120', bid: 119.9, _priceSource: 'DXLink' }, extra || {});
{
  // LOADING. A completely bare VM, with NOTHING defined: if the block read `S`, `document` or `Chart` while
  // loading, this would throw a ReferenceError.
  const ctx = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, ctx);
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM and declares exactly its two owners');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.constructor.name', ctx)), ['Function', 'Function'],
    '…ordinary synchronous functions');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.length', ctx)), [1, 1], '…each taking the one symbol');
  // CALLED WITH NOTHING DEFINED, both swallow the ReferenceError and answer undefined: neither can break the page.
  eq([vm.runInContext("_dssRender1DChart('AAA')", ctx), vm.runInContext("_dssRedrawCharts('AAA')", ctx)], [undefined, undefined],
    '…and called with `S`, `document` and `Chart` all undefined they each swallow the failure and answer undefined: neither can break a page');
}
{
  // THE RENDERER, branch by branch.
  const NONE = '…draws nothing';
  {
    const w = world(); w.ctx.S.scanData = [row()];
    eq(w.ctx._dssRender1DChart('ZZZ'), undefined, 'a symbol with no scan row draws nothing…');
    eq([w.log.charts.length, w.log.writes.length, w.log.lookups], [0, 0, []], NONE + ' and does not even look at the page');
  }
  {
    const w = world(); w.ctx.S.scanData = [row({ candles: undefined })];
    w.ctx._dssRender1DChart('AAA');
    eq(w.log.charts.length, 0, 'a row with no candles draws nothing…');
    w.ctx.S.scanData = [row({ candles: mkCandles(29) })];
    w.ctx._dssRender1DChart('AAA');
    eq(w.log.charts.length, 0, '…nor does one with 29 of them…');
    w.ctx.S.scanData = [row({ candles: mkCandles(30) })];
    w.ctx._dssRender1DChart('AAA');
    eq(w.log.charts.length, 1, '…while 30 is enough');
  }
  {
    const w = world({ noElement: true }); w.ctx.S.scanData = [row()];
    eq(w.ctx._dssRender1DChart('AAA'), undefined, 'with no `dss-chart-1d` element on the page it draws nothing and looks up only that element…');
    eq(w.log.lookups, ['dss-chart-1d'], '…which is the case in the real document, where no such element exists');
  }
  // THE DRAW.
  {
    const w = world(); w.ctx.S.scanData = [row()];
    eq(w.ctx._dssRender1DChart('AAA'), undefined, 'a full draw answers undefined…');
    eq(w.log.writes, ['<canvas id="dss-canvas-1d" style="width:100%;height:104px"></canvas>'],
      '…writes one canvas into the element, once…');
    eq(w.log.ctxCalls, ['2d'], '…asks it for a 2d context…');
    eq(w.log.charts.length, 1, '…and constructs ONE chart');
    const cfg = w.log.charts[0].cfg;
    eq(w.log.charts[0].c, 'CTX:2d', '…on that context…');
    eq(cfg.type, 'line', '…a LINE chart…');
    eq(cfg.data.labels.length, 90, '…of the last 90 candles of 120…');
    eq(cfg.data.datasets[0].data.slice(0, 2).concat(cfg.data.datasets[0].data.slice(-1)), [31, 32, 120.0],
      '…whose first points are the closes of candles 31 and 32 and whose last is 120 (the live mark equals it, so nothing is replaced)');
    eq(cfg.options.animation, { duration: 0 }, '…with animation off…');
    eq([cfg.options.responsive, cfg.options.maintainAspectRatio, cfg.options.plugins.legend], [true, false, { display: false }], '…responsive, free of aspect ratio and with no legend…');
    eq(cfg.options.scales.y.position, 'right', '…and the price axis on the right');
    eq(w.log.lookups, ['dss-chart-1d', 'dss-bb', 'dss-kc', 'dss-canvas-1d'], 'the page is read in a fixed order: the element, the two checkboxes, then the canvas it just wrote');
  }
  // LABELS: the candle\'s own `date` when it has one, else month-day from its timestamp.
  {
    const w = world(); w.ctx.S.scanData = [row({ candles: mkCandles(40, true) })];
    w.ctx._dssRender1DChart('AAA');
    const labels = w.log.charts[0].cfg.data.labels;
    eq(labels.slice(0, 3), ['D0', '01-16', 'D2'], 'labels are the candle\'s `date` where it has one and `MM-DD` of its timestamp where it does not…');
    eq(labels.length, 40, '…one per candle');
    const bad = world(); bad.ctx.S.scanData = [row({ candles: mkCandles(40).map((c, i) => (i === 5 ? { c: 5 } : c)) })];
    eq(bad.ctx._dssRender1DChart('AAA'), undefined, 'a candle with neither a date nor a timestamp makes `toISOString` throw a RangeError, which the renderer swallows…');
    eq([bad.log.writes.length, bad.log.charts.length], [0, 0], '…having drawn nothing and written nothing');
  }
  // THE OVERLAYS. A missing `dss-bb` checkbox means ON and a missing `dss-kc` means OFF.
  {
    const names = (w) => w.log.charts[0].cfg.data.datasets.map((d) => d.label);
    const CASES = [
      [{}, ['Price (close / live mark)', 'SMA20', 'SMA30', 'BB+', 'BB-']],
      [{ bb: false }, ['Price (close / live mark)', 'SMA20', 'SMA30']],
      [{ bb: true }, ['Price (close / live mark)', 'SMA20', 'SMA30', 'BB+', 'BB-']],
      [{ kc: true }, ['Price (close / live mark)', 'SMA20', 'SMA30', 'BB+', 'BB-', 'KC+', 'KC-']],
      [{ bb: false, kc: true }, ['Price (close / live mark)', 'SMA20', 'SMA30', 'KC+', 'KC-']],
      [{ kc: false }, ['Price (close / live mark)', 'SMA20', 'SMA30', 'BB+', 'BB-']],
    ];
    eq(CASES.map(([o]) => { const w = world(o); w.ctx.S.scanData = [row()]; w.ctx._dssRender1DChart('AAA'); return names(w); }), CASES.map(([, want]) => want),
      'the datasets drawn for each of ' + CASES.length + ' checkbox states are the pinned ones: BB defaults ON, KC defaults OFF, and the price and both averages are always there');
    const w = world({ bb: true, kc: true }); w.ctx.S.scanData = [row()]; w.ctx._dssRender1DChart('AAA');
    const ds = w.log.charts[0].cfg.data.datasets;
    eq(ds.map((d) => [d.borderColor, d.borderWidth, d.borderDash || null]), [
      ['#e8e8f0', 1.5, null], ['#00d48a', 1, null], ['#ffb340', 1, [4, 3]],
      ['rgba(124,111,255,.5)', 1, [2, 2]], ['rgba(124,111,255,.5)', 1, [2, 2]], ['rgba(0,212,200,.4)', 1, [3, 3]], ['rgba(0,212,200,.4)', 1, [3, 3]]],
    '…each with the pinned colour, width and dash');
    ok(ds.every((d) => d.fill === false && d.pointRadius === 0 && d.tension === 0), '…none filled, pointed or curved: a plain line');
    eq(ds[1].data[0], 'sma20:0', 'the averages come from `smA` over the closes…');
    eq(w.log.smA.map(([a, n]) => [a.length, n]), [[90, 20], [90, 30]], '…over all 90, at 20 and at 30…');
    eq([w.log.bb.length, w.log.bb[0].length, w.log.kc.length, w.log.kc[0].length], [1, 90, 1, 90],
      '…the bands from `calcBB` over the 90 closes and the channel from `calcKC` over the 90 CANDLES, each called once and only when its overlay is on');
    eq(w.log.kc[0][0], { t: Date.UTC(2024, 0, 15) / 1000, c: 31, h: 32, l: 30, o: 30 }, '…the channel receiving the candle objects themselves, not closes');
    const off = world({ bb: false }); off.ctx.S.scanData = [row()]; off.ctx._dssRender1DChart('AAA');
    eq([off.log.bb.length, off.log.kc.length], [0, 0], 'with both overlays off neither `calcBB` nor `calcKC` is called');
  }
  // THE LIVE MARK. It replaces the LAST close only inside the regular session, from DXLink, with a price and a bid
  // present, a positive number and more than half a cent from the close.
  {
    const lastClose = (o, session) => {
      const w = world(Object.assign({ regular: session === undefined ? true : session }, {}));
      w.ctx.S.scanData = [row(o)];
      w.ctx._dssRender1DChart('AAA');
      const d = w.log.charts[0].cfg.data.datasets[0].data;
      return { last: d[d.length - 1], prev: d[d.length - 2], bbSawLast: w.log.bb[0][w.log.bb[0].length - 1], smaSawLast: w.log.smA[0][0][89] };
    };
    const base = lastClose({});
    eq([base.last, base.prev], [120, 119], 'with the live mark equal to the last close nothing is replaced: the last two closes are 120 and 119');
    const CASES = [
      [{ price: '120.5' }, 120.5], [{ price: 125 }, 125], [{ price: '120.006' }, 120.006], [{ price: '119.994' }, 119.994],
      [{ price: '120.0051' }, 120.0051], [{ price: '119.9949' }, 119.9949],
      [{ price: '120.004' }, 120], [{ price: '119.996' }, 120], [{ price: '120.0049' }, 120], [{ price: '119.9951' }, 120],
      [{ price: 'abc' }, 120], [{ price: '-5' }, 120], [{ price: '0' }, 120], [{ price: 0 }, 120], [{ price: undefined }, 120], [{ price: '' }, 120],
      [{ price: '130', bid: null }, 120], [{ price: '130', bid: undefined }, 120], [{ price: '130', bid: 0 }, 130],
      [{ price: '130', _priceSource: 'Yahoo' }, 120], [{ price: '130', _priceSource: undefined }, 120],
    ];
    eq(CASES.map(([o]) => lastClose(o).last), CASES.map(([, want]) => want),
      'the last close after each of ' + CASES.length + ' live-mark readings is the pinned one — on both sides of the half-cent threshold, for non-numbers, zero and negatives, for a missing bid and for another source');
    eq(lastClose({ price: '130' }, false).last, 120, '…and outside the regular session a fresh DXLink mark is never injected');
    const inj = lastClose({ price: '130' });
    eq([inj.bbSawLast, inj.smaSawLast], [130, 130], '…the replaced close is the one the bands and the averages are computed from');
    const w = world(); const r = row({ price: '130' }); w.ctx.S.scanData = [r];
    const before = JSON.stringify(r);
    w.ctx._dssRender1DChart('AAA');
    eq(JSON.stringify(r), before, '…and the scan row and its candles are untouched: the replacement is made on a copy');
  }
  // FAILURES ARE SWALLOWED, and WHERE they happen decides what was written.
  {
    const a = world({ chartThrows: true }); a.ctx.S.scanData = [row()];
    eq(a.ctx._dssRender1DChart('AAA'), undefined, 'a chart constructor that throws is swallowed…');
    eq(a.log.writes.length, 1, '…AFTER the canvas was written, so the element is left holding an empty canvas');
    const b = world({ bbThrows: true }); b.ctx.S.scanData = [row()];
    eq(b.ctx._dssRender1DChart('AAA'), undefined, 'a band calculation that throws is swallowed…');
    eq(b.log.writes.length, 0, '…BEFORE anything was written, so the element is untouched');
  }
}
{
  // THE REDRAW. It draws only when the row AND the element both exist, by calling the renderer, and swallows everything else.
  const spied = (o) => {
    const w = world(o); const calls = [];
    w.ctx._dssRender1DChart = function (s) { calls.push(s); return 'rendered'; };
    return { w, calls };
  };
  {
    const { w, calls } = spied(); w.ctx.S.scanData = [row()];
    eq([w.ctx._dssRedrawCharts('AAA'), calls], [undefined, ['AAA']], 'the redraw answers undefined and calls the renderer ONCE with the symbol when the row and the element both exist…');
  }
  {
    const { w, calls } = spied(); w.ctx.S.scanData = [row()];
    w.ctx._dssRedrawCharts('ZZZ');
    eq(calls, [], '…not when there is no row for the symbol…');
    const n = spied({ noElement: true }); n.w.ctx.S.scanData = [row()];
    n.w.ctx._dssRedrawCharts('AAA');
    eq(n.calls, [], '…and not when the element is missing — which is every call in the real document');
    const lk = spied({ noElement: true }); lk.w.ctx.S.scanData = [row()]; lk.w.ctx._dssRedrawCharts('AAA');
    eq(lk.w.log.lookups, ['dss-chart-1d'], '…the element being looked up once and no other');
    const t = spied(); t.w.ctx.S = null;
    eq([t.w.ctx._dssRedrawCharts('AAA'), t.calls], [undefined, []], '…and a broken `S` is swallowed');
    const e = world(); e.ctx.S.scanData = [row()];
    e.ctx._dssRender1DChart = function () { throw new Error('renderer failed'); };
    eq(e.ctx._dssRedrawCharts('AAA'), undefined, '…as is a renderer that throws');
  }
  {
    const w = world({ bb: false }); w.ctx.S.scanData = [row()];
    w.ctx._dssRedrawCharts('AAA');
    eq([w.log.charts.length, w.log.charts[0].cfg.data.datasets.length], [1, 3], 'composed with the real renderer the redraw draws the chart the renderer draws: one chart of three datasets with the bands off');
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
  // before this layer. The audit forecast that the pure-ASCII count WOULD move
  // and the banner count would NOT; both are asserted as comparisons between two
  // measurements rather than carried forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is NOT, asserted of the module directly: it holds NON_ASCII_CHARS non-ASCII character, an em dash in a comment…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS, '…the SAME number: it did not move, as the audit forecast');
  eq(prior.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: it opens on documentation…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is the SAME LAYERS_OPENING_ON_BANNER: it did not move, as the audit forecast');
  // THE THIRD CHAIN-WIDE COUNT, and the ONE THAT MOVED: layers whose contract pins a
  // non-empty MONOLITH_DEPENDENCIES. Counted over the suite with this contract in it
  // and again without it, then compared with the figure the contract that carries it
  // pins. A layer cut after this one that also pinned a dependency would be set aside
  // by name; the one that has been cut pins an empty list, which is asserted.
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
  {
    const later = fs.readFileSync(path.join(ROOT, LATER_CONTRACT), 'utf8');
    eq(later.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m)[1], '[]',
      '…the contract of the layer cut after this one pinning an EMPTY dependency list, so it is not among them and sets nothing aside…');
    eq(contractsPinning.indexOf(path.basename(LATER_CONTRACT)), -1, '…and it is indeed not among the contracts counted…');
  }
  eq(atThisLayer.length - 1, PRIOR_LAYERS_WITH_A_DEPENDENCY,
    '…so the count before this layer was PRIOR_LAYERS_WITH_A_DEPENDENCY, and it moved up by exactly one, as the audit forecast…');
  ok(MONOLITH_DEPENDENCIES.length > 0, '…this layer pinning a non-empty list, which is why it moved…');
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

section('9. The relocation is the whole of the production change');
// ─────────────────────────────────────────────────────────────────────
{
  const changed = require('./lib/extraction-change-scope').historicalChangedFiles(git, BASE_SHA, __filename).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  // THE AUDIT ASSERTED THAT NOTHING MOVED. The phase that shipped this layer
  // moved exactly the audited bytes and nothing else, so the claim is inverted
  // rather than dropped. It now reads against a base that a LATER layer has also
  // moved past, so the footprint is the document, this layer's module, and the
  // module of every layer cut after it.
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-stale-mark-squeeze-state.js', 'js/services/journal-expiry-audit.js', 'js/portfolio/portfolio-regime-badge-html.js', 'js/portfolio/portfolio-backend-squeeze-extract.js', 'js/portfolio/portfolio-beta-missing-reason.js', 'js/services/option-chain-error-helpers.js', 'js/services/ai-scan-context.js', 'js/services/apex-parity-compare.js', 'js/services/swing-trend-context.js', 'js/services/apex-parity-backend-fetch.js', 'js/services/swing-chart-cache-evaluate.js', 'js/portfolio/portfolio-unrealized-pnl.js'].sort(),
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
    '…and OPENS on the documentation of its first owner, DOC_FIRST_LINE: the boundary §2 defends');
  eq(MODULE.slice(MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1, MODULE.indexOf('\n', MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1)), DECL_FIRST_LINE,
    '…with the declaration, DECL_FIRST_LINE, on the line after the three comment lines…');
  eq(MODULE.indexOf(DECL_FIRST_LINE), DOC_TAKEN, '…at exactly DOC_TAKEN units in');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * NON_ASCII_CHARS,
    '…its UTF-8 length longer than its UTF-16 length by two bytes per non-ASCII character…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…of which it holds NON_ASCII_CHARS…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…and EM_DASHES em dash, the whole of it');
}
// THE LOAD ORDER. The module loads bare and needs nothing from the monolith (§7), so the tag's position is not load-bearing for loading. It is pinned
// all the same: last of the local scripts, immediately before the inline monolith,
// whose two consumers stay behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/services/scanner-stock-scoring.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose names it reads at call time, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // NOTHING IN THE SHIPPED DOCUMENT NAMES EITHER OWNER NOW. The reconstructed base named the renderer
  // twice and the redraw once, all inside the block; with the block gone the document names neither,
  // and no local script but the module does.
  eq(OWNERS_EXPECTED.map((n) => refSites(LIVE_INDEX, n).length), [0, 0],
    '…and the shipped document names NEITHER owner anywhere, the reconstructed base having named them only inside the block…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t, rel) => t + OWNERS_EXPECTED.reduce((u, n) =>
    u + refSites(fs.readFileSync(path.join(ROOT, rel), 'utf8'), n).length, 0), 0), 0,
  '…nor does any local script other than the module itself…');
  eq(ELEMENT_IDS.map(([id]) => count(LIVE_INDEX, id)), [0, 0, 0],
    '…and the three element ids the renderer looks up occur nowhere in the shipped document, as before: they were never in its markup');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its two owners and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => MONOLITH_DEPENDENCIES.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    MONOLITH_DEPENDENCIES.slice().sort(), '…and so do the two monolith names the module reads at call time, which it did not take with it');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, stays too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the brace of the owner above, one blank line and ' + NEXT_DECL + ', once…');
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
  const E = 'SCANNER_DSS_1D_CHART_UNDO_';
  throwsWith(() => UNDO.undoScannerDss1dChart(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 3,560 units, not 3,559 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('SMA30', 'SMA3O');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoScannerDss1dChart(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoScannerDss1dChart(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoScannerDss1dChart(INDEX, MODULE),
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/scanner-dss-1d-chart-undo.js'),
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
console.log('SCANNER_DSS_1D_CHART_CONTRACT_OK');
}

main();
