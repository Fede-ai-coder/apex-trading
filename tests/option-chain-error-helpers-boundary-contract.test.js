'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// OPTION-CHAIN ERROR HELPERS — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [930261,931969) in monolith coordinates — 1,709 units raw and
// 1,708 of body, TWO owners, synchronous — now lives in
// js/services/option-chain-error-helpers.js. `_optionChainStructuredTimeout` reads a
// backend option-chain response and returns the canonical code `option_chain_timeout`
// when the response says the provider timed out, or null for a normal response.
// `_optionChainErrorText` turns a failed chain load's code into the sentence the banner
// shows, escaping the ticker with the monolith's `escHtml`. Only the second reads anything
// of the monolith, and only when it is called. The block opens on the three comment lines
// that document the first; the owner above it ends on a brace that is directly against
// them, with no blank line, and the blank line AFTER the block, in front of
// `async function _fetchOptionChain`, stayed behind as the separator.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #520 is now proved by the
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
// The contract before this layer recorded two rows at (byConsumerSplit, raw nine) = (3, 4) and
// put the block that shipped first by length. This block is the other row it tied with, and
// measured on the base the shipped cut left it was the ONLY row at (3, 4) over the screen and the
// pass over sub-floor runs together; the next lowest raw nine at the best score was 5, held by two
// rows. The published ranking key (byConsumerSplit, raw nine, units ascending) therefore put it
// first on the raw nine and not on length, a margin of a single unit of the raw nine, which §4
// pins rather than asserts.
//
// ── PART TWO: ONLY THE PASS OVER SUB-FLOOR RUNS FOUND IT ───────────────────────
//
// Measured from its declaration the block is 1,474 units, under the 1,500 floor, so the screen
// enumerated no run for it, either at the declaration or at the cut. The pass over runs the screen
// skipped for being short re-measures them from the start of their documentation, and from there
// the block is 1,708 units and clears the floor: it was one row of that pass. §2 counts all three.
// Each owner ALONE is smaller still, 748 and 959 units, with a lower raw nine than the pair, 2 and 2
// against 4; both are under the floor, so neither entered either enumeration, and §5 prices them as
// the runs they are.
//
// ── PART THREE: TWO REFERENCES FROM ONE CONSUMER, ONE DEPENDENCY, ONE MODULE ───
//
// The raw nine is 4: two inbound references, one dependency and one reference from a shipped module.
// The two inbound references are one statement in `_fetchOptionChain`, `var _structTimeout = (typeof
// _optionChainStructuredTimeout === 'function') ? _optionChainStructuredTimeout(resp) : null;`: a
// `typeof` probe and the call it guards, so a document without the function gets null from it. The
// second function is named nowhere in the monolith outside the block: its one inbound reference is a
// call inside a function of `js/ui/journal-trade-forms.js`, a module that loads before the inline
// monolith. The one dependency is `escHtml`, read at two places inside the second function. The block
// writes no monolith name, deletes nothing and touches the host through none of window, document,
// storage, console, timers or fetch. Its two em dashes are in CODE, inside string literals the second
// function returns to the operator, which §2 shows and which makes the encoding of the file part of
// what the move must preserve.
//
// ── PART FOUR: WHAT THE LOAD ORDER DEPENDS ON, AND WHAT IS NOT MEASURED ───────
//
// Both sites in the monolith sit inside one function body and the module reference sits inside
// another, and the dependency is read only when the second function runs. §3 measures where the
// sites are. It does NOT measure what calls `_fetchOptionChain` or the module's function, so it does
// not show that none of them runs while the monolith is being evaluated. The tag sits directly in
// front of the inline monolith, which makes the question moot rather than answered here; §9 pins
// that position.
//
// ── PART FIVE: FIVE OPENINGS WERE LEGAL, FOUR PARSE, AND THERE WAS NO BLANK LINE ─
//
// The seam rule admitted five line starts between the owner above and the first declaration: that
// owner's closing brace, the three comment lines and the declaration. There was no blank line between
// the brace and the documentation, so no blank line was an opening of its own, and the brace does not
// parse as a script. The cut took the whole comment block the programme's blockAbove rule finds. What
// it left is the brace of the owner above directly against `async function _fetchOptionChain`, a join
// the monolith held nowhere before the cut but of a shape it held seventeen times already; §2 counts both.
//
// ── PART SIX: IT IS NOT THE FIRST OWNER OF ITS REGION, AND THE CUT TOOK NO ────
// ── BANNER ───────────────────────────────────────────────────────────────────
//
// The block is owners number 6 and 7 of 14 in the `OPTION-CHAIN PRIORITY` region. §5 prices EVERY
// owner above and EVERY owner below as the cut extended to the end of that owner: of the five above,
// all five are worse on both measures; of the seven below, five are refused by the seam rule outright,
// for want of a blank line after them, and the two that are not are worse on both. The first owner
// below is the block's own consumer, so extending the cut downward would have taken its only caller
// along. The cut took no banner, so the document's top-level banners and owner regions did not move.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED ON THE SHIPPED MODULE ───────────────
//
// §7 loads the SHIPPED MODULE in a VM with nothing defined and calls the first owner there, which
// works, and shows that the second cannot be called there: it raises ReferenceError for escHtml. It
// then runs both with the monolith's own escHtml and with a counting stand-in, and drives the detector
// through its fields, its strictness and its failures and the text function through every code it
// knows, the default and the escaping in each branch. It ties the text function to the code set the
// consumer records: the six distinct codes `_fetchOptionChain` assigns are exactly the six the text
// function words.
//
// ── PRICED, AND WHERE IT SITS ──────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-three layers the chain now holds: it is the eighth smallest,
// which §8 measures against every layer rather than asserting. Its body holds two non-ASCII characters,
// both in string literals, so it is not pure ASCII and the pure-ASCII count did not move; it does not
// open on a `// ── ` banner, so the banner count did not move either; and it pins a NON-EMPTY monolith
// dependency list, one function, so the count of layers that pin a non-empty one DID move, by one.
// §8 measures all three.
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
const UNDO = require('./lib/option-chain-error-helpers-undo.js');
const SWING_TREND_CONTEXT_U = require('./lib/swing-trend-context-undo.js');
const APEX_PARITY_COMPARE_U = require('./lib/apex-parity-compare-undo.js');
const AI_SCAN_CONTEXT_U = require('./lib/ai-scan-context-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/services/option-chain-error-helpers.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '710abf3';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = 'b79e36a';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'bbe841d';
const BASE_CHARS = 1417346;
const BASE_UTF8 = 1445717;
const BASE_LF = 24468;
const BASE_SHA256 = '4b05416012f0250f389feb0d08fa3bf023a0092d9d0dd58e2a7153eff1594414';
const LOCAL_SCRIPTS = 106;
const TEST_FILE_COUNT = 194;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-option-chain-error-helpers-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/option-chain-error-helpers-audit.spec.js';
const CONTRACT_REL = 'tests/option-chain-error-helpers-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/option-chain-error-helpers-contract.spec.js';
const UNDO_REL = 'tests/lib/option-chain-error-helpers-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'bbe841d';
const CONTRACT_SPEC_MUTANTS = 208;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 56;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/portfolio-beta-missing-reason-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 204;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/option-chain-error-helpers-audit.spec.js';
const RETIRED_MUTANTS = 198;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116442;
const CODE_CHARS = 1300878;
const TOP_LEVEL_DECLS = 886;
const OWNER_REGIONS = 114;

// ── The region ───────────────────────────────────────────────────────────────
// It opened on the first of three comment lines directly above the first declaration. The line above
// them was the closing brace of the owner before, with NO blank line between: there was no separator to
// leave behind on this side. The blank line AFTER the block was the structural separator.
const RAW_AT_IN_CODE = 930261;
const DECL_AT_IN_CODE = 930495;
const RAW_END_IN_CODE = 931970;
const BODY_END_IN_CODE = 931969;
const RAW_CHARS = 1709;
const BODY_CHARS = 1708;
const BODY_UTF8 = 1712;
const BODY_LF = 35;
const BODY_SHA256 = '67c3cce7b89779265309f8696488be7cc731c13cbb6fade030f6b55a677c55de';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// Detects a structured backend option-chain timeout (backend #204) so the UI can show';
const DECL_FIRST_LINE = 'function _optionChainStructuredTimeout(resp) {';
const EM_DASHES = 2;
const NON_ASCII_CHARS = 2;
const NEXT_DECL = '_fetchOptionChain';

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['_optionChainStructuredTimeout', '_optionChainErrorText'];
const OWNER_SIZES = [513, 725];
const OWNER = '_optionChainStructuredTimeout';
const OWNER_LAST = '_optionChainErrorText';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 35;
const CODE_LINES = 28;
const COMMENT_LINES = 6;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;
// Where the six comment lines are: three document the first function, three the second, none sits inside a body.
const FIRST_BODY_COMMENT_LINES = 0;
const SECOND_DOC_LINES = 3;
const SECOND_BODY_COMMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
const OWNER_BEFORE = '_runTrailingPortfolioRefreshIfPending';
const BRACE_OPENING = 930259;
const DOC_TAKEN = 234;
const DOC_TAKEN_LINES = 3;
const SEAM_LEGAL_OPENINGS = 5;
const PARSING_OPENINGS = 4;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 930260;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 1474;
const CANDIDATES_AT_DECLARATION = 0;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 1;
// What the cut left behind: the closing brace of the owner above directly against the next function, with no blank
// line between, a join the monolith already held elsewhere; and what it removed: the join of that brace against the
// documentation of the block, which existed only here.
const JOIN_AFTER_CUT_PREFIX = '}\nasync function ';
const JOIN_AFTER_CUT = '}\nasync function _fetchOptionChain';
const JOIN_BEFORE_CUT = '}\n// Detects a structured';
const JOINS_LIKE_THE_CUT_BEFORE = 17;

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 927348;
const REGION_END = 938290;
const REGION_CHARS = 10942;
const REGION_OWNERS = 14;
const OWNER_POSITION = 6;
const BANNER_LINE_PREFIX = '// ── OPTION-CHAIN PRIORITY';
const WHOLE_REGION_NINE = 41;
const WHOLE_REGION_BCS = 23;
const WHOLE_REGION_CONSUMERS = 3;
const WHOLE_REGION_DEPS = 8;
const WHOLE_REGION_SIB = 3;
// THE CUT TAKES NO BANNER, so the document's top-level banners and owner regions do not move.
const BANNER_MARKS = 215;

// ── Taking more, priced: the owners above; the owners below ──────────────────
// Above: FIVE owners stand above the cut in its region. Each row is the cut extended UP to
// the start of that owner's documentation: [name, opening, units, raw nine, byConsumerSplit,
// monolith dependencies, runs nothing at load].
const EXTENSIONS_UP = [
  ['_runTrailingPortfolioRefreshIfPending', 929274, 2695, 12, 9, 6, true],
  ['_pausePortfolioFallbackForOptionChain', 928730, 3239, 17, 11, 7, true],
  ['_notePortfolioFallbackDeferred', 928353, 3616, 16, 10, 6, true],
  ['_setOptionChainPriorityPending', 928057, 3912, 20, 10, 6, true],
  ['_optionChainPriorityActive', 927348, 4621, 19, 9, 5, true],
];
const OWNERS_ABOVE = 5;
// Below: SEVEN owners stay in the region and all are pinned in full, as
// [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['_fetchOptionChain', 937589, 7328, 12, 11, 7],
  ['_chainDebounceTimers', 937937, 7676, 20, 14, 7],
  ['_chainRequestId', 937975, 7714, 21, 14, 7],
  ['_chainLatestTicker', 938022, 7761, 27, 16, 7],
  ['_chainError', 938228, 7967, 33, 20, 7],
  ['_CHAIN_DEBOUNCE_MS', 938258, 7997, 34, 20, 7],
  ['_CHAIN_MIN_TICKER_LEN', 938289, 8028, 35, 20, 7],
];
const OWNERS_BELOW = 7;
const UP_LEGAL = 5;
const UP_TIES = 0;
const UP_WORSE = 5;
const UP_NOT_CLEAN = 0;
const DOWN_LEGAL = 2;
const DOWN_REFUSED = 5;
const DOWN_REFUSAL = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
const DOWN_WORSE = 2;
const DOWN_TIES_BCS = 0;
const DOWN_NOT_CLEAN = 0;
// THE THREE RUNS the two owners make: each owner alone, and the pair, which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['_optionChainStructuredTimeout', '_optionChainStructuredTimeout', 930261, 931009, 748, 2, 1, [], 2],
  ['_optionChainStructuredTimeout', '_optionChainErrorText', 930261, 931969, 1708, 4, 3, ['escHtml'], 2],
  ['_optionChainErrorText', '_optionChainErrorText', 931010, 931969, 959, 2, 2, ['escHtml'], 0],
];
const OWN_RUNS_LEGAL = 3;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 2;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 4;
const BY_CONSUMER = 3;
const BY_CONSUMER_SPLIT = 3;
const CONSUMERS = ['_fetchOptionChain'];
const CONSUMER_SITES = 2;
const CONSUMER_SITES_AT = [933862, 933910];
// What each of the two sites is: the first a `typeof` probe that is NOT a call, the second the call.
const PROBE_SITE_AT = 933862;
const CALL_SITE_AT = 933910;
// [site, host, start, end, chars of the INNERMOST function body that holds it].
const SITE_BODIES = [
  [933862, '_fetchOptionChain', 932908, 937278, 4370],
  [933910, '_fetchOptionChain', 932908, 937278, 4370],
];
// [name, start, end, chars] of each declared consumer.
const CONSUMER_DECLS = [
  ['_fetchOptionChain', 931970, 937587, 5618],
];
const MONOLITH_DEPENDENCIES = ['escHtml'];
// [name, start, end, chars] of each monolith dependency.
const DEPENDENCY_DECLS = [
  ['escHtml', 1298396, 1298529, 134],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
// The ONE reference from a shipped module: a call inside a function body, to the second owner.
const SIBLING_REFERENCES = 1;
const SIBLING_MODULE = 'js/ui/journal-trade-forms.js';
const INBOUND_REFERENCES = 2;
const OUTBOUND_MODULE_REFERENCES = 0;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];

// What the text function answers for each code it knows, as [code, sentence with {tk} for the escaped ticker].
const ERROR_TEXTS = [
  ['option_chain_timeout', 'Option chain for {tk} timed out (provider slow).'],
  ['timeout', 'Option chain for {tk} timed out (provider slow).'],
  ['option_chain_auth_unavailable', 'Tastytrade session unavailable for {tk} — reconnect and retry.'],
  ['option_chain_not_found', 'No option chain found for {tk}.'],
  ['option_chain_malformed_response', 'Option chain provider error for {tk}.'],
  ['option_chain_upstream_error', 'Option chain provider error for {tk}.'],
];
// The distinct codes _fetchOptionChain assigns to the message it records, in the order its source tries them,
// and how many assignments there are in all: two of the codes are assigned from two branches each.
const PRODUCER_CODES = ['option_chain_timeout', 'option_chain_auth_unavailable', 'option_chain_not_found', 'option_chain_malformed_response', 'option_chain_upstream_error', 'timeout'];
const PRODUCER_ASSIGNMENTS = 8;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_optionChainStructuredTimeout', '_optionChainErrorText'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7122;
const SEAM_REJECTED = 2091;
const CANDIDATES = 2773;
const CLEAN_CANDIDATES = 1669;
const SCORE_TWO_OR_BELOW = 0;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor. THIS CUT IS ONE OF THEM, and the only row the screen and the pass together hold for it.
const HIDDEN_ROWS = 33;
const HIDDEN_CLEAN_ROWS = 32;
const HIDDEN_SCORE_TWO_OR_BELOW = 0;
// THE ROWS AT THE BEST SCORE, 3, over the screen and the pass together.
const ROWS_AT_THREE = 8;
const ROWS_AT_THREE_SCREEN = 7;
const ROWS_AT_THREE_HIDDEN = 1;
const LOWEST_NINE_AT_THREE = 4;
// THE ONE ROW AT (byConsumerSplit, raw nine) = (3, 4), pinned in full:
// [opening, closing, units, consumers, monolith dependencies].
const ALONE_AT_BEST = [
  [930261, 931969, 1708, 1, 1],
];
// The best four OTHER openings over the screen and the hidden pass together,
// as [opening, byConsumerSplit, raw nine, units], by the published key.
const RUNNERS_UP = [
  [628563, 3, 5, 1540],
  [1178176, 3, 5, 2252],
  [388872, 3, 8, 1614],
  [628451, 3, 8, 1652],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
// They are NEGATIVE, because that cut took no banner and its region lost an owner, and a region of fewer
// owners makes fewer runs.
const DELTA_RAW_RUNS = -41;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = -37;
const DELTA_CLEAN = -17;
const PREVIOUS_RAW_CHARS = 1691;
const PREVIOUS_RAW_AT = 758195;
// The previous contract's published list. Its first entry is THIS block, in the coordinates
// of the document BEFORE the cut that shipped, which sat above it.
const PREVIOUS_RUNNERS_UP = [
  [931952, 3, 4, 1708],
  [628563, 3, 5, 1540],
  [1179867, 3, 5, 2252],
  [388872, 3, 8, 1614],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. §8 measures the smallest layer at SMALLEST_LAYER_CHARS.
const CHAIN_LENGTH = 63;
const SMALLEST_LAYER_CHARS = 1559;
const SIZE_RANK = 8;
const LAYERS_SMALLER_THAN_THIS_CUT = 7;
const LAYERS_LARGER_THAN_THIS_CUT = 55;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 8;
const PRIOR_LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_BANNER = 26;
const PRIOR_LAYERS_OPENING_ON_WIDE_BANNER = 29;
const LAYERS_OPENING_ON_WIDE_BANNER = 29;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 25;
const LAYERS_WITH_A_DEPENDENCY = 26;
// The count above is the figure AT THIS LAYER. The later layer that pins a NON-EMPTY list
// instead IS among the contracts counted over the suite, and is set aside to recover the
// figure at this layer rather than left to make it drift.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['ai-scan-context-boundary-contract.test.js', 'apex-parity-compare-boundary-contract.test.js', 'swing-trend-context-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1641;
const INDEX_AFTER = 1415705;
const RESIDUAL_MONOLITH = 1299169;
const LOCAL_SCRIPTS_AFTER = 107;
// The tag's position among the local scripts, zero-based: the last of 107.
const TAG_LOCAL_INDEX = 106;
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


console.log('OPTION-CHAIN ERROR HELPERS — PERMANENT BOUNDARY CONTRACT');
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
const LIVE_INDEX = AI_SCAN_CONTEXT_U.isApplied(PRE_APEX_PARITY_COMPARE)
  ? AI_SCAN_CONTEXT_U.undoAiScanContext(
      PRE_APEX_PARITY_COMPARE, fs.readFileSync(path.join(ROOT, 'js/services/ai-scan-context.js'), 'utf8'))
  : PRE_APEX_PARITY_COMPARE;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoOptionChainErrorHelpers(LIVE_INDEX, MODULE);

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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the beta missing-reason
// functions predicted the document, the residual monolith and the script
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
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single LF, the blank line between the block and ' + NEXT_DECL);
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest');
ok(BODY.endsWith(BODY_ENDING), '…ending on a real line of code');
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the first line of its documentation');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dashes…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII characters in all, the em dashes being the whole of them…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * EM_DASHES,
  '…three bytes in UTF-8 for an em dash and one UTF-16 unit, which is the whole of the gap between its UTF-8 and UTF-16 lengths');
// THE EM DASHES ARE IN CODE, not in comments: each is inside a string literal the second function RETURNS to the user.
ok(BODY.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => !l.trim().startsWith('//')),
  '…and unlike a character in a comment, every one is on a line of CODE…');
eq((maskLiterals(BODY).match(/[^\x00-\x7F]/g) || []).length, 0,
  '…inside a string literal, since the literal-masked text holds no non-ASCII at all: they are part of the text the banner shows, so a move that mangled the encoding would change what the operator reads…');
ok(/<meta\s+charset=["']?utf-8/i.test(INDEX.slice(0, INDEX.indexOf('<script'))),
  '…and the document declares UTF-8 in its head, which is the encoding a classic script loaded by src is decoded with');
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
  eq(blockAbove(next), null,
    '…which has NO comment block directly above it, so the separator is followed immediately by the declaration itself…');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + 'async function '.length + NEXT_DECL.length), 'async function ' + NEXT_DECL,
    '…an async function, so the cut ends right in front of `async function ' + NEXT_DECL + '`');
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
    '…and SEAM_LEGAL_OPENINGS line starts between it and the first declaration are accepted');
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the closing brace of the owner above');
  eq(CODE.slice(BRACE_OPENING, RAW_AT_IN_CODE), '}\n',
    '…which is followed DIRECTLY by the first comment line: there is NO blank line between the owner above and this block, so no blank line is an opening of its own…');
  eq(OPENINGS[1], RAW_AT_IN_CODE, '…the next opening the first comment line, the cut…');
  eq(OPENINGS.slice(1, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES comment lines are each an opening of their own…');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last being the declaration');
  ok(OPENINGS.every((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() !== ''),
    '…every opening a line with something on it, none an empty line');
  eq(CODE[BRACE_OPENING], '}', 'the opening before the comments is the brace itself…');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    '…and the position right after the brace, the newline that ends its line, starts mid-line and is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the five are even candidates, counted rather than listed');
}

// WHAT THE CUT TOOK is the whole comment block above the first function and nothing else: three comment lines directly
// above the declaration. The three comment lines of the second function are BETWEEN the two functions, so they are inside it.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the comment block taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut took prose and no code');
  ok(!/^\/\/ ─{2,}/m.test(doc), '…none of them a banner, so the cut took no section heading with it');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNER)).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  const first = BY_NAME.get(OWNER), second = BY_NAME.get(OWNER_LAST);
  const commentsIn = (text) => text.split('\n').filter((l) => l.trim().startsWith('//')).length;
  eq(commentsIn(CODE.slice(first.start, first.end + 1)), FIRST_BODY_COMMENT_LINES,
    'the first function holds FIRST_BODY_COMMENT_LINES comment lines inside its body…');
  const between = CODE.slice(first.end + 1, second.start);
  ok(new RegExp('^\\n\\n(\\/\\/[^\\n]*\\n){' + SECOND_DOC_LINES + '}$').test(between),
    '…the two functions are separated by exactly ONE blank line and then SECOND_DOC_LINES comment lines, the second function\'s own documentation, taken whole because it sits between the two…');
  eq(blockAbove(second).start, first.end + 3, '…its comment block beginning right after that blank line, inside the cut');
  eq(commentsIn(CODE.slice(second.start, second.end + 1)), SECOND_BODY_COMMENT_LINES, '…while the second function\'s body holds none');
  eq(DOC_TAKEN_LINES + FIRST_BODY_COMMENT_LINES + SECOND_DOC_LINES + SECOND_BODY_COMMENT_LINES, COMMENT_LINES,
    '…so the block\'s COMMENT_LINES are the three at the top and the three of the second, none inside a body');
  ok(doc.indexOf('or null for a normal chain response') >= 0 && between.indexOf('Distinguishes') >= 0,
    '…and the two blocks promise that the first function answers null for a normal response and that the second distinguishes its cases, claims §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '}\n',
    'the documentation is preceded DIRECTLY by the brace of the owner above, with no blank line, so the cut left nothing of its own on that side');
}
// WHAT LEAVING THE COMMENT BLOCK WOULD HAVE STRANDED.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + 'async function ' + NEXT_DECL) >= 0,
    'cutting at the declaration would have left the three comment lines directly above `async function ' + NEXT_DECL + '`, a function they do not describe');
}
// WHAT THE CUT LEFT. The brace of the owner above directly against the next function: a join of a shape the monolith already held.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 0, 'the monolith holds the join `}` newline `async function ' + NEXT_DECL + '` NOWHERE before the cut, a blank line and a block standing between them…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 2, '…at the brace of the owner above, where the cut was made…');
  eq(count(CODE, JOIN_AFTER_CUT_PREFIX), JOINS_LIKE_THE_CUT_BEFORE,
    '…but a closing brace directly against an async function is a shape the document held JOINS_LIKE_THE_CUT_BEFORE times already, so the cut added a join of a kind it had…');
  eq(count(atCut, JOIN_AFTER_CUT_PREFIX), JOINS_LIKE_THE_CUT_BEFORE + 1, '…one more after the cut');
  eq(count(CODE, JOIN_BEFORE_CUT), 1, 'while the join of that brace against the documentation of THIS block exists once, at the cut…');
  eq(count(atCut, JOIN_BEFORE_CUT), 0, '…and is gone after it, leaving with the block');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this comment block or declaration is left behind');
}
// THE SCREEN CANNOT HOLD THIS RUN, AND ONLY THE PASS OVER SUB-FLOOR RUNS DOES. The block is not the first owner of its region, so the
// screen measures it from the DECLARATION: DECL_UNITS_FROM_DECLARATION units, UNDER the floor, so it enumerates nothing for it. The pass
// over runs the screen skipped for being short re-measures them from their documentation, and from there the block clears the floor.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION < RUN_FLOOR, '…under RUN_FLOOR, so the floor is what holds it back from the screen…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the screen enumerates CANDIDATES_AT_DECLARATION runs that open at the declaration and end where this cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that open where the cut does, three lines higher…');
{
  const hidden = hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE);
  eq(hidden.length, HIDDEN_ROWS_AT_CUT, '…while the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT row for it…');
  eq([hidden[0].unitsDecl, hidden[0].unitsDoc], [DECL_UNITS_FROM_DECLARATION, BODY_CHARS],
    '…measured as DECL_UNITS_FROM_DECLARATION from the declaration and as BODY_CHARS from the documentation, which clears RUN_FLOOR');
}
ok(BODY_CHARS >= RUN_FLOOR, 'the cut clears RUN_FLOOR measured from its documentation, as the pass requires');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE - DECL_UNITS_FROM_DECLARATION, DOC_TAKEN,
  '…the difference between the two measurements being exactly the DOC_TAKEN units of documentation');
// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, two references, one dependency read at call time, one reference from a shipped module');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these two names');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names, in that order');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…both declared functions, so this layer ships no mutable binding');
  ok(own.every((d) => !/^async function /.test(firstLineOf(CODE.slice(d.start)))), '…SYNCHRONOUS');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, OWNER_COUNT,
    '…with no function expression inside either, so the block holds nothing but the two owners…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the two owners');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'six of the nine directions are ZERO, measured one by one');
eq(REC.sib, SIBLING_REFERENCES, '…the seventh being SIBLING_REFERENCES reference from a shipped module…');
eq(REC.sibWho, [SIBLING_MODULE], '…the module being SIBLING_MODULE…');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from the monolith outside the block…');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: ONE monolith function, escHtml');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: two inbound references, one dependency and one reference from a module');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER: one consumer, one dependency and one module reference');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'ONE consumer reaches in from the monolith: CONSUMERS');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const outside = (at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE;
  eq(refSites(MASKED, OWNER).filter(outside), CONSUMER_SITES_AT,
    'every one of those references is to the FIRST owner, ' + OWNER + '…');
  eq(refSites(MASKED, OWNER_LAST).filter(outside), [],
    '…and the SECOND owner, ' + OWNER_LAST + ', is not named anywhere in the monolith outside the block: its one inbound reference is the module below…');
  // WHAT EACH OF THE TWO SITES IS. The first is a `typeof` probe, not a call; the second is the call it guards.
  eq(CODE.slice(PROBE_SITE_AT - 7, PROBE_SITE_AT), 'typeof ', 'the first site is the operand of a `typeof`, a PROBE and not a call…');
  eq(CODE.slice(CALL_SITE_AT, CALL_SITE_AT + OWNER.length + '(resp)'.length), OWNER + '(resp)', '…the second the CALL, with the response as its one argument…');
  const stmt = "var _structTimeout = (typeof " + OWNER + " === 'function') ? " + OWNER + '(resp) : null;';
  eq(CODE.slice(PROBE_SITE_AT - 'var _structTimeout = (typeof '.length, PROBE_SITE_AT - 'var _structTimeout = (typeof '.length + stmt.length), stmt,
    '…the two being ONE statement, `' + stmt + '`: the call is GUARDED, so a document in which the function is not defined gets null from it rather than a ReferenceError…');
  eq(refSites(STRINGS, OWNER).concat(refSites(STRINGS, OWNER_LAST)).filter(outside).length, 0,
    '…and neither name appears in any string or generated markup outside the block');
  eq(count(STATIC_MARKUP, OWNER) + count(STATIC_MARKUP, OWNER_LAST), 0, '…nor in the static markup, so no inline handler names either');
  eq([SIB_REFS.get(OWNER), SIB_REFS.get(OWNER_LAST)], [{ n: 0, who: [] }, { n: SIBLING_REFERENCES, who: [SIBLING_MODULE] }],
    '…the one shipped module that names either naming the second, and no module naming the first');
}
// THE MODULE REFERENCE, read where it is: a call inside a function body of an already-extracted layer, so it runs when that function runs.
{
  const sib = SIBLINGS.find((s) => s.rel === SIBLING_MODULE);
  const at = refSites(sib.masked, OWNER_LAST);
  eq(at.length, SIBLING_REFERENCES, SIBLING_MODULE + ' names ' + OWNER_LAST + ' ' + SIBLING_REFERENCES + ' time…');
  const bodies = functionBodyRanges(sib.src);
  ok(at.every((p) => bodies.some((r) => p >= r.start && p <= r.end)), '…inside a function body, so nothing evaluates it as that module loads…');
  ok(at.every((p) => /^\s*\(/.test(sib.src.slice(p + OWNER_LAST.length))), '…as a CALL…');
  ok(sib.src.indexOf('var _cMsg = ' + OWNER_LAST + '(ticker, _cErr.message);') >= 0,
    '…`var _cMsg = ' + OWNER_LAST + '(ticker, _cErr.message);`, a ticker and the message of a recorded chain error…');
  ok(LOCALS.indexOf(SIBLING_MODULE) >= 0 && LOCALS.indexOf(SIBLING_MODULE) < LOCALS.length,
    '…the module being one of the local scripts loaded BEFORE the inline monolith, which the tag for this block now follows. THAT is as far as this contract goes: it does not measure when that function runs');
}
// WHERE EACH SITE IS: which host holds it, and the INNERMOST function body around it.
{
  const innermost = (at) => FN_BODIES.filter((r) => at >= r.start && at <= r.end).sort((a, b) => b.start - a.start)[0];
  eq(REC.sites.map((at) => { const b = innermost(at); return [at, (hostOf(at) || { name: '(TOP LEVEL)' }).name, b.start, b.end, b.end - b.start]; }),
    SITE_BODIES, 'the two sites are in SITE_BODIES: the host, and the innermost function body around each');
  ok(REC.sites.every((at) => insideFunction(at)),
    '…both INSIDE a function body, so neither is a statement the monolith evaluates as it loads…');
  for (const [name, start, end, chars] of CONSUMER_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function opening at ' + start + ', ' + chars + ' units long, immediately below the cut');
    ok(d.start >= RAW_END_IN_CODE, '…outside the block, after it');
    eq(d.start, RAW_END_IN_CODE, '…its declaration beginning exactly where the cut ends');
    ok(/^async function /.test(firstLineOf(CODE.slice(d.start))), '…an ASYNC function…');
  }
  ok(REC.sites.every((at) => at > CONSUMER_DECLS[0][1] && at < CONSUMER_DECLS[0][2]),
    '…both sites within that one consumer\'s own text…');
  ok(/var _pending = \(async function\(\) \{\s*$/.test(CODE.slice(SITE_BODIES[0][2] - 50, SITE_BODIES[0][2] + 2)),
    '…inside the async function expression it assigns to `_pending` and awaits, the innermost body around both. THAT is as far as this contract goes: it measures where the sites are, and does NOT measure what calls _fetchOptionChain');
}
// THE ONE DEPENDENCY, with its declaration, where the block reads it, and a CONTROL.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  for (const [name, start, end, chars] of DEPENDENCY_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function opening at ' + start + ', ' + chars + ' units long…');
    ok(d.start > RAW_END_IN_CODE, '…far BELOW the cut, so the tag in front of the monolith puts the block before its dependency in document order');
  }
  const useSites = refSites(bodyMasked, 'escHtml');
  eq(useSites.length, 2, 'the block calls escHtml at TWO places…');
  const second = BY_NAME.get(OWNER_LAST);
  ok(useSites.every((p) => p + RAW_AT_IN_CODE >= second.start && p + RAW_AT_IN_CODE <= second.end),
    '…both inside the second owner, ' + OWNER_LAST + ', and none in the first…');
  ok(useSites.every((p) => FN_BODIES.some((r) => p + RAW_AT_IN_CODE >= r.start && p + RAW_AT_IN_CODE <= r.end)),
    '…inside its function body, so the dependency is read when that function runs and not as the block is evaluated…');
  eq(refSites(MASKED.slice(BY_NAME.get(OWNER).start, BY_NAME.get(OWNER).end + 1), 'escHtml').length, 0,
    '…the first owner reading nothing of the monolith at all');
  const wider = EXTENSIONS_DOWN[0];
  eq(profileOf([RAW_AT_IN_CODE, wider[1]]).deps.length, wider[5],
    'control — the same profile finds ' + wider[5] + ' dependencies on the cut widened to include ' + wider[0] + ', so the single one above is a measurement');
}
// WHAT RUNS AT LOAD. Nothing: the block holds two function declarations and no statement.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: two function declarations only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(await|yield|this|new)\b/g) || []).length, 0, '…no await, no yield, no `this` and no `new`…');
  eq((bodyMasked.match(/\b(globalThis|self|window|document|localStorage|console|setTimeout|setInterval|fetch)\b/g) || []).length, 0,
    '…and no window, document, storage, console, timer or fetch');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all, comments included');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, so byConsumerSplit leaves nothing out…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…and is BY_CONSUMER_SPLIT, the same as byConsumer');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region that declares no top-level
// `var` scores a perfect zero inbound while writing globals it does not own, so the profile's answer is not
// left standing alone.
{
  eq(nonLocalAssignmentsUncorrected(BODY), [], 'the inherited scan finds no assignment to anything the block does not own…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan, which counts every declarator of a list as local, finds NON_LOCAL_ASSIGNMENTS of them either: the block assigns only its own locals');
  // CONTROLS: both scans DO find a planted violation, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { escHtml = 1; }'), ['escHtml'],
    'control — a write to the dependency the block reads is found: the zero above is not blind to the one name that matters here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}
// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: one row stood alone at (3, 4), and it was found only by the pass over sub-floor runs');
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
    '…and it sat entirely BEFORE this block, so everything this contract measures before it did not move, and everything at or after it moved down by exactly that many units, as read from the rows below');
  const moved = (at) => (at >= PREVIOUS_RAW_AT ? at - PREVIOUS_RAW_CHARS : at);
  // THE TIE THE PREVIOUS AUDIT FOUND, and what became of it.
  const tied = listOf('TIED_AT_BEST');
  eq(tied.length, 2, 'the previous contract recorded TWO rows at the best score and the lowest raw nine…');
  eq([moved(tied[1][0]), moved(tied[1][1]), tied[1][2], tied[1][3], tied[1][4]], ALONE_AT_BEST[0],
    '…the second of them being THIS block, moved by that rule to where it stands now: the row it tied with is the block that shipped, and it is gone from the document…');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, '…and the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq([moved(listed[0][0]), listed[0][1], listed[0][2], listed[0][3]], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the FIRST of them being THIS block, moved by the same rule, with the same byConsumerSplit and raw nine and the same length: it sat after the cut that shipped, so only its position changed…');
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
  ok(hiddenClean.some((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE),
    '…this block being one of the clean ones');
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
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_HIDDEN, '…and ROWS_AT_THREE_HIDDEN in the pass over sub-floor runs, which is this block…');
  eq(Math.min.apply(null, atBest.map((r) => r.nine)), LOWEST_NINE_AT_THREE,
    '…the lowest raw nine among them being LOWEST_NINE_AT_THREE, which is this block\'s FULL_NINE: nothing at the best score has a lower one…');
  // THE ROW AT THE BEST SCORE AND THE LOWEST RAW NINE, pinned in full: it is ALONE.
  const aloneRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const alone = aloneRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(alone, ALONE_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE) are exactly ALONE_AT_BEST: ONE row, this block, so there is no tie for length to decide…');
  ok(aloneRows[0].hidden === true, '…and that row is one of the pass\'s, not of the shipped screen\'s…');
  eq(aloneRows[0].c.p.names, OWNERS_EXPECTED, '…its two owners being this block\'s…');
  const nextNine = Math.min.apply(null, atBest.filter((r) => r.nine > LOWEST_NINE_AT_THREE).map((r) => r.nine));
  eq(nextNine, LOWEST_NINE_AT_THREE + 1, 'the next lowest raw nine at the best score is one HIGHER, LOWEST_NINE_AT_THREE + 1: the margin is a single unit of the raw nine, and it is a real one, not a tie-break…');
  eq(atBest.filter((r) => r.nine === nextNine).length, 2, '…held by two rows, which are the first two runners-up below');
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
  eq(rankedAll.slice(0, 2).map((r) => [r.lo, r.bcs, r.nine, r.units]), [[RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS], RUNNERS_UP[0]],
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
  ok(ranked.every((r) => r[1] === BY_CONSUMER_SPLIT) && ranked.every((r) => r[2] > FULL_NINE),
    '…every one of them at ' + BY_CONSUMER_SPLIT + ', the same score, and every one with a WORSE raw nine than this block\'s');
}
// ───────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: every owner above, every owner below, the three runs, and the banner it leaves alone');
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
  '…and takes the next OWNER_COUNT, which are its two');
eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…of REGION_OWNERS in the region');
// EVERY OWNER ABOVE IT IN THE REGION. Each is priced as the cut extended UP to the start of that owner's documentation.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut…');
{
  const priced = OWNERS_UP.map((d) => Object.assign({ name: d.name }, priceUp(d)));
  eq(priced.filter((r) => r.seam !== null).length, UP_LEGAL, '…UP_LEGAL of the extensions at real seams, all of them…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine === FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES,
    '…UP_TIES of them TYING the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, UP_WORSE,
    '…UP_WORSE worse than the cut on BOTH, so no extension upward is better than the cut or as good…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…and not one better on either measure');
  eq(priced.filter((r) => !r.clean).length, UP_NOT_CLEAN, '…UP_NOT_CLEAN of them also running something at load…');
  eq(priced.map((r) => [r.name, r.lo, BODY_END_IN_CODE - r.lo, r.p.nine, r.bcs, r.p.deps.length, r.clean]),
    EXTENSIONS_UP, 'all five are exactly EXTENSIONS_UP, pinned in full');
  ok(EXTENSIONS_UP.every((e) => e[2] === BODY_END_IN_CODE - e[1]), '…each pinned opening agreeing with its pinned length');
  ok(priced[0].name === OWNER_BEFORE && priced[0].lo === upStart(BY_NAME.get(OWNER_BEFORE)),
    '…the first of them OWNER_BEFORE, opening at the start of its own documentation');
  eq(candidateRuns.filter((c) => c.lo === BY_NAME.get(OWNER_BEFORE).start && c.hi === BODY_END_IN_CODE).map((c) => c.units),
    [BODY_END_IN_CODE - BY_NAME.get(OWNER_BEFORE).start],
    '…while the shipped screen\'s own row for that pair opens at OWNER_BEFORE\'s declaration, a documentation-exclusive opening, and is shorter than the extension priced here');
}
// EVERY OWNER BELOW IT IN THE REGION. Each is priced as the cut extended down to the end of that owner.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the block…');
{
  const priced = OWNERS_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL of the ends at real seams…');
  eq(priced.filter((r) => r.seam === null).length, DOWN_REFUSED,
    '…and DOWN_REFUSED of them REFUSED by the seam rule, the declarations that sit directly against the next line with no blank line after them…');
  eq(Array.from(new Set(priced.filter((r) => r.seam === null).map((r) => r.refusal))), [DOWN_REFUSAL],
    '…every refusal the one error, DOWN_REFUSAL, so none is refused for a reason of its own…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, DOWN_TIES_BCS,
    '…and DOWN_TIES_BCS of them tying it on byConsumerSplit while worse on the raw nine, so none is better and none is as good on both…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…not one better on either measure, the refused ones priced all the same…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load');
  eq(priced.map((r) => [r.name, r.hb, r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length]),
    EXTENSIONS_DOWN, 'all seven are exactly EXTENSIONS_DOWN, pinned in full');
  ok(EXTENSIONS_DOWN.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…each pinned closing agreeing with its pinned length');
  eq(priced[0].name, NEXT_DECL, '…the first of them the function right after the cut, which is also the block\'s one consumer: extending down to it takes the consumer along');
  eq([priced[0].name], CONSUMERS, '…CONSUMERS being that one name, so that extension turns the block\'s only inbound caller into part of the block');
  // THE LAST OWNER BELOW ENDS THE REGION, apart from the one blank line that separates it from the next banner.
  const last = priced[priced.length - 1];
  const trailing = CODE.slice(last.hb, REGION.end);
  ok(last.hb <= REGION.end, '…the extensions all ending inside the region…');
  eq(trailing, '\n', '…the last of them leaving only the blank line before the next banner after it: the region\'s last owner is its last code');
  eq(lineAt(REGION.end).startsWith('// ── OPTION-CHAIN ONE-SHOT'), true, '…that banner being the next region\'s, which this cut does not touch');
}
// THE THREE RUNS the two owners make: each alone, and the pair, which is the cut.
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
  eq(measured, OWN_RUNS, 'the two owners make exactly the three runs OWN_RUNS: the first alone, the pair, and the second alone');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them real seams…');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR, the pair, which is the cut, clearing it…');
  ok(measured[0][5] < FULL_NINE && measured[0][6] < BY_CONSUMER_SPLIT && measured[2][5] < FULL_NINE && measured[2][6] < BY_CONSUMER_SPLIT,
    '…each owner alone scoring better than the cut on BOTH measures, which is what the floor, and not the score, keeps out of both enumerations: the floor is the screen\'s own and is applied unchanged here…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [],
    '…the shipped screen enumerating NO run inside the block at all…');
  eq(hiddenRows.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi, c.unitsDecl, c.unitsDoc]),
    [[RAW_AT_IN_CODE, BODY_END_IN_CODE, DECL_UNITS_FROM_DECLARATION, BODY_CHARS]],
    '…and the pass over sub-floor runs holding exactly ONE row inside it, the cut itself');
}
// THE BANNER REGION it sits inside. The cut was owners number 6 and 7 of 14 and the banner is far above it, so the cut took NO banner
// and the document\'s banners and owner regions do not move — which the regions are recomputed on the text without the block to show.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, far above the cut…');
  ok(reg.start < RAW_AT_IN_CODE && reg.end > RAW_END_IN_CODE, '…and ends at REGION_END, below it, the cut sitting wholly inside');
  eq(reg.end, REGION_END, '…at REGION_END');
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
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — negative, so the screen SHRANK');
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs. That cut took no banner, so its
  // region simply lost the owner it held, and the region went from n to n less that many owners.
  const tri = (n) => n * (n + 1) / 2;
  const own = prevNum('REGION_OWNERS'), left = own - prevNum('OWNER_COUNT');
  eq(tri(left) - tri(own), DELTA_RAW_RUNS,
    '…and the raw-run change is exactly what that loss predicts: a region of ' + left + ' owners makes ' + tri(left) + ' runs where one of ' + own + ' made ' + tri(own) + ', a difference of DELTA_RAW_RUNS');
  ok(DELTA_RAW_RUNS < 0 && DELTA_CANDIDATES < 0 && DELTA_CLEAN < 0,
    '…the candidate counts shrinking with it, which this contract measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
  '…and the screen enumerates NO run that opens at the first comment line: it measures this owner from its declaration, so every run that includes it opens there instead');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).map((c) => [c.hi, c.units]).sort((a, b) => a[0] - b[0]).length > 0, true,
  '…runs that DO open at the declaration exist, but they run on past the cut into the next function, so none of them is the cut');
// ─────────────────────────────────────────────────────────────────────
section('7. In the SHIPPED module the first owner loads and RUNS bare, the second needs escHtml, and the detection, the texts, the producer\'s codes and the failures are measured');
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
  const escDecl = BY_NAME.get('escHtml');
  const REAL_ESC = CODE.slice(escDecl.start, escDecl.end + 1);
  // A context holding the block and, when asked, the monolith's own escHtml or a counting stand-in.
  const fresh = (esc) => {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(MODULE, ctx);
    if (esc === 'real') vm.runInContext(REAL_ESC, ctx);
    else if (esc) { ctx.__calls = []; ctx.escHtml = (s) => { ctx.__calls.push(s); return '[' + s + ']'; }; }
    return {
      ctx,
      timeout: (resp) => { ctx.RESP = resp; return vm.runInContext('_optionChainStructuredTimeout(RESP)', ctx); },
      text: (t, c) => { ctx.T = t; ctx.C = c; return vm.runInContext('_optionChainErrorText(T, C)', ctx); },
    };
  };
  const thrown = (f) => { try { f(); return null; } catch (e) { return e.name; } };
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its two owners');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.constructor.name', bare)), ['Function', 'Function'], '…both ordinary synchronous functions');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.length', bare)), [1, 2], '…taking a response, and a ticker and a code');
  eq(vm.runInContext('_optionChainStructuredTimeout({ option_chain_timeout: true })', bare), 'option_chain_timeout',
    '…the FIRST can be CALLED there, with nothing defined, because it reads nothing of the monolith…');
  eq(thrown(() => vm.runInContext('_optionChainErrorText("AAPL", "timeout")', bare)), 'ReferenceError',
    '…while the SECOND cannot: it raises ReferenceError for escHtml, the one name it reads, so it needs that function defined before it is CALLED, though not before it is loaded…');
  {
    // THE CONSUMER'S OWN GUARDED STATEMENT, taken out of the monolith as written and run.
    const from = PROBE_SITE_AT - 'var _structTimeout = (typeof '.length;
    const real = CODE.slice(from, CODE.indexOf(';', from) + 1);
    eq(real.startsWith('var _structTimeout = (typeof ' + OWNER + " === 'function')"), true, 'the statement the consumer runs, taken verbatim from the monolith, is the guarded one…');
    eq(vm.runInContext('var resp = { option_chain_timeout: true }; ' + real + ' _structTimeout', vm.createContext(Object.create(null))), null,
      '…and run where the function is NOT defined it yields null and not a ReferenceError…');
    eq(vm.runInContext(MODULE + '\nvar resp = { option_chain_timeout: true }; ' + real + ' _structTimeout', vm.createContext(Object.create(null))), 'option_chain_timeout',
      '…while run where the block is loaded it yields the canonical code for a timeout response');
  }
  eq(thrown(() => vm.runInContext('(function () { return notDefinedAnywhere; })()', bare)), 'ReferenceError',
    'control — the same bare VM raises ReferenceError for any function that reads a name it does not have, so the call that succeeds above is a measurement');
  eq(vm.runInContext('_optionChainErrorText.toString().indexOf("escHtml(") >= 0', bare), true,
    'control — and the failing call fails for the reason claimed: the function\'s own text calls escHtml');

  // THE DETECTOR: what it accepts, what it returns, and what it ignores.
  {
    const f = fresh();
    const CODE_OUT = 'option_chain_timeout';
    eq([null, undefined, 0, '', false, 'option_chain_timeout', 5, true, Symbol('x')].map((v) => f.timeout(v)), Array(9).fill(null),
      'a response that is not an object — null, undefined, a falsy value, a string even one holding the code, a number, a boolean, a symbol — gives null…');
    eq(vm.runInContext('_optionChainStructuredTimeout(function () {})', f.ctx), null, '…and a FUNCTION gives null too, `typeof` being "function"…');
    eq(vm.runInContext('(function () { var g = function () {}; g.option_chain_timeout = true; return _optionChainStructuredTimeout(g); })()', f.ctx), null,
      '…even one that carries the flag');
    eq([f.timeout({ option_chain_timeout: true }), f.timeout({ optionChainTimeout: true })], [CODE_OUT, CODE_OUT],
      'the two flags, option_chain_timeout and optionChainTimeout, set to exactly true give the canonical code…');
    eq([f.timeout({ option_chain_timeout: 'true' }), f.timeout({ option_chain_timeout: 1 }), f.timeout({ optionChainTimeout: 'yes' }), f.timeout({ option_chain_timeout: false })],
      Array(4).fill(null), '…and a truthy value that is not exactly true does not: the comparison is strict');
    eq(['reason', 'error', 'code', 'rejectCode', 'status', 'message'].map((k) => { const o = {}; o[k] = 'x option_chain_timeout y'; return f.timeout(o); }),
      Array(6).fill(CODE_OUT), 'the code found inside any of six fields — reason, error, code, rejectCode, status or message — gives the canonical code, whatever surrounds it…');
    eq([f.timeout({ reason: 'OPTION_CHAIN_TIMEOUT' }), f.timeout({ code: 'Backend_Option_Chain_Timeout_V2' })], [CODE_OUT, CODE_OUT],
      '…in any letter case…');
    eq(f.timeout({ reason: 'backend_option_chain_timeout' }), CODE_OUT, '…the answer always the CANONICAL string and never the text that matched');
    eq([f.timeout({ detail: 'option_chain_timeout' }), f.timeout({ data: { reason: 'option_chain_timeout' } }), f.timeout({ error: { reason: 'option_chain_timeout' } })],
      [null, null, null], 'a field that is not one of the six, and a response nested one level down, are not looked at: a match must be in one of those six, as a string');
    eq([f.timeout({ reason: 'option chain timeout' }), f.timeout({ reason: 'timeout' }), f.timeout({ reason: 'option_chain_time' }), f.timeout({ reason: 504 }), f.timeout({ reason: false }), f.timeout({ reason: 0 })],
      Array(6).fill(null), 'near misses, the bare word timeout and non-matching values — a number, false, zero — give null: only that exact substring counts');
    eq([f.timeout({ reason: null, error: undefined }), f.timeout({}), f.timeout([]), f.timeout([CODE_OUT])], Array(4).fill(null),
      '…null and undefined fields are skipped, an empty object gives null, and an ARRAY is an object with none of the fields, even one holding the code');
    eq([f.timeout({ reason: [CODE_OUT] }), f.timeout({ code: { toString() { return 'a option_chain_timeout'; } } })], [CODE_OUT, CODE_OUT],
      'the fields are converted with String(), so an array holding the code, or an object whose toString returns it, matches…');
    eq(f.timeout({ reason: { a: 1 } }), null, '…while a plain object becomes "[object Object]" and does not');
    eq(f.timeout(vm.runInContext('new Error("upstream said option_chain_timeout")', f.ctx)), CODE_OUT,
      'an Error object counts: its message field is one of the six');
    eq(f.timeout({ reason: 'ok', error: 'ok', code: 'ok', rejectCode: 'ok', status: 'ok', message: 'option_chain_timeout' }), CODE_OUT,
      'the LAST field is reached after five that do not match: every field is tried');
    eq(thrown(() => f.timeout({ reason: { toString() { throw new RangeError('x'); } } })), 'RangeError',
      'and an error thrown while converting a field propagates out of the function: nothing in it catches');
    eq(thrown(() => f.timeout({ reason: Symbol('s') })), null, '…a symbol field being convertible by String() and simply not matching');
    // NOTHING IS WRITTEN to the response.
    const writes = [];
    const watched = new Proxy({ reason: 'ok', code: 'option_chain_timeout' }, {
      set(t, k, v) { writes.push(['set', String(k)]); t[k] = v; return true; },
      defineProperty(t, k, d) { writes.push(['define', String(k)]); return Reflect.defineProperty(t, k, d); },
      deleteProperty(t, k) { writes.push(['delete', String(k)]); return delete t[k]; },
    });
    eq(f.timeout(watched), CODE_OUT, 'with the response watched for writes, a detection produces its answer…');
    eq(writes, [], '…and records NO write to it');
  }

  // THE TEXT FUNCTION: each case, with the monolith's OWN escHtml.
  {
    const f = fresh('real');
    const tk = 'AAPL';
    eq(ERROR_TEXTS.map(([code]) => f.text(tk, code)), ERROR_TEXTS.map(([, tpl]) => tpl.split('{tk}').join(tk)),
      'with the monolith\'s own escHtml, each of the codes in ERROR_TEXTS gives its pinned sentence naming the ticker…');
    eq(ERROR_TEXTS.map(([code]) => code), ['option_chain_timeout', 'timeout', 'option_chain_auth_unavailable', 'option_chain_not_found', 'option_chain_malformed_response', 'option_chain_upstream_error'],
      '…six codes, in the order the function\'s own switch lists them…');
    eq(f.text(tk, 'option_chain_timeout'), f.text(tk, 'timeout'), '…the first two giving the SAME sentence, and the last two sharing theirs…');
    eq(f.text(tk, 'option_chain_malformed_response'), f.text(tk, 'option_chain_upstream_error'), '…so four distinct sentences serve six codes');
    eq(new Set(ERROR_TEXTS.map(([, tpl]) => tpl)).size, 4, '…four of them, counted');
    // THE DEFAULT, and its second escape.
    eq(f.text(tk, 'something_else'), 'Option chain unavailable for AAPL — something_else.', 'any other code gives the generic sentence with that code in it…');
    eq([null, undefined, '', 0, false].map((c) => f.text(tk, c)), Array(5).fill('Option chain unavailable for AAPL — unknown.'),
      '…and a missing or falsy code is reported as "unknown"…');
    eq([f.text(tk, 'TIMEOUT'), f.text(tk, ' timeout'), f.text(tk, 'timeout '), f.text(tk, 'Option_Chain_Timeout')].map((t) => t.startsWith('Option chain unavailable')), [true, true, true, true],
      '…and the match is on the exact string, case and spaces included: upper case or padded codes fall to the default');
    eq([f.text(tk, 504), f.text(tk, { a: 1 }), f.text(tk, ['timeout'])],
      ['Option chain unavailable for AAPL — 504.', 'Option chain unavailable for AAPL — [object Object].', 'Option chain for AAPL timed out (provider slow).'],
      'a number or an object code is converted with String(), so an array holding a known code reaches that code\'s sentence…');
    // THE TICKER.
    eq([null, undefined, '', 0, false].map((t) => f.text(t, 'timeout')), Array(5).fill('Option chain for  timed out (provider slow).'),
      'a falsy ticker is an empty string in the sentence…');
    eq(f.text(5, 'timeout'), 'Option chain for 5 timed out (provider slow).', '…and a number is converted…');
    // ESCAPING, in every branch.
    {
      const hostile = '<b>&"x';
      const escaped = '&lt;b&gt;&amp;&quot;x';
      eq(f.text(hostile, 'timeout'), 'Option chain for ' + escaped + ' timed out (provider slow).', 'a ticker holding markup is ESCAPED by escHtml in the sentence…');
      eq(ERROR_TEXTS.map(([code]) => f.text(hostile, code).indexOf('<b>') < 0 && f.text(hostile, code).indexOf(escaped) >= 0), Array(ERROR_TEXTS.length).fill(true),
        '…in every one of the six cases…');
      eq(f.text(hostile, 'x').indexOf('<b>') < 0 && f.text(hostile, 'x').indexOf(escaped) >= 0, true, '…and in the default');
      eq(f.text('A', '<i>&"'), 'Option chain unavailable for A — &lt;i&gt;&amp;&quot;.', 'the default also escapes the CODE it prints, a second call to escHtml…');
      eq(f.text('A', 'timeout').indexOf('timeout'), -1, '…while a known code is never printed at all, only its sentence');
    }
  }
  // WHAT IT CALLS escHtml WITH, through a counting stand-in.
  {
    const f = fresh('stub');
    eq([f.text('AAPL', 'timeout'), f.ctx.__calls.slice()], ['Option chain for [AAPL] timed out (provider slow).', ['AAPL']],
      'with a stand-in escHtml that records its arguments, a known code calls it ONCE, with the ticker as a string…');
    f.ctx.__calls.length = 0;
    eq([f.text(7, 'weird'), f.ctx.__calls.slice()], ['Option chain unavailable for [7] — [weird].', ['7', 'weird']],
      '…and the default calls it TWICE, the ticker first and then the code, each already converted to a string…');
    f.ctx.__calls.length = 0;
    f.text(null, null);
    eq(f.ctx.__calls.slice(), ['', 'unknown'], '…a missing ticker passing the empty string and a missing code the word unknown');
  }
  {
    const g = vm.createContext(Object.create(null));
    vm.runInContext(MODULE, g);
    vm.runInContext(REAL_ESC, g);
    vm.runInContext('_optionChainErrorText("A", "x"); _optionChainErrorText("A", "timeout"); _optionChainStructuredTimeout({ code: "option_chain_timeout" }); _optionChainStructuredTimeout(null);', g);
    eq(Object.getOwnPropertyNames(g).sort(), VM_GLOBALS.concat(['escHtml']).sort(),
      'and after calls of both, the VM holds no global beyond the two owners and the escHtml it was given');
  }

  // THE PRODUCER'S CODES: what _fetchOptionChain records is what the text function words.
  {
    const fo = BY_NAME.get('_fetchOptionChain');
    const src = CODE.slice(fo.start, fo.end + 1);
    eq(Array.from(new Set((src.match(/em = '([^']*)'/g) || []).map((m) => m.slice(m.indexOf("'") + 1, -1)))), PRODUCER_CODES,
      'the consumer, _fetchOptionChain, assigns exactly PRODUCER_CODES to the message it records, in the order its source tries them…');
    eq((src.match(/em = '([^']*)'/g) || []).length, PRODUCER_ASSIGNMENTS, '…in PRODUCER_ASSIGNMENTS assignments in all, two codes being assigned from two branches each…');
    const f = fresh('real');
    ok(PRODUCER_CODES.every((c) => !f.text('X', c).startsWith('Option chain unavailable')),
      '…and every one of them reaches a SPECIFIC sentence, none falling to the default: the producer and the text function agree on all of them…');
    eq(PRODUCER_CODES.slice().sort(), ERROR_TEXTS.map(([c]) => c).sort(), '…the same six codes the text function lists, so neither side has a code the other lacks');
    ok(src.indexOf("_optChainLastError[t] = _structTimeout;") >= 0 && PRODUCER_CODES.indexOf(f.timeout({ option_chain_timeout: true })) >= 0,
      'and the detector\'s own answer is one of those codes, the one the consumer records when it fires');
    eq((src.match(/_optChainLastError\[t\] = em;/g) || []).length, 1, 'while the catch block records `em` in ONE place, whatever it holds after the patterns, so a message that matches none of them is recorded as it came');
  }

  // WHAT EACH CALL PASSES, as the source reads at each site, so the module's input contract is on record.
  {
    eq(CODE.slice(CALL_SITE_AT, CALL_SITE_AT + OWNER.length + '(resp) : null;'.length), OWNER + '(resp) : null;',
      'the detector is called with the backend response itself, `' + OWNER + '(resp)`, and nothing else…');
    ok(/var resp = await ttCall\(_path\);\s*\n\s*if \(!resp\) return null;/.test(CODE.slice(CALL_SITE_AT - 700, CALL_SITE_AT)),
      '…the response having come from `await ttCall(_path)` and been checked for falsiness a few lines above…');
    ok(/_optionChainErrorText\(ticker, _cErr\.message\)/.test(fs.readFileSync(path.join(ROOT, SIBLING_MODULE), 'utf8')),
      'and the text function is called by ' + SIBLING_MODULE + ' with a ticker and the message of a recorded chain error. WHAT IS NOT MEASURED: whether that message is always one of PRODUCER_CODES or the raw text of an error; the default sentence is therefore shown to exist, not shown to be reached');
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
    '…in js/portfolio, beside the other portfolio layers');
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
  // THE THREE CHAIN-WIDE COUNTS, and the audit forecast that the dependency count would
  // move and that the pure-ASCII and banner counts would not. The shape counts are asserted as comparisons between two
  // measurements, over the chain before this layer and over the whole chain,
  // rather than carried forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s2) => !/[^\x00-\x7F]/.test(s2);
  const banner = (s2) => /^\s*\/\/ ── /.test(s2.split('\n')[0]);
  const wide = (s2) => /^\s*\/\/ ─{2,}[ \t]+\S/.test(s2.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is NOT, asserted of the module directly: it holds NON_ASCII_CHARS non-ASCII characters, two em dashes in comments…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS, '…the SAME number: it did not move, as the audit forecast');
  eq(prior.filter(banner).length, PRIOR_LAYERS_OPENING_ON_BANNER,
    'PRIOR_LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: its first line is a plain comment line…');
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
  eq(MONOLITH_DEPENDENCIES.length, 1, '…it pinning the non-empty list of its one monolith function, which is why the count moved, as the audit forecast…');
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
    ['index.html', MODULE_REL, 'js/services/ai-scan-context.js', 'js/services/apex-parity-compare.js', 'js/services/swing-trend-context.js'].sort(),
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
    '…and OPENS on the first line of its documentation, DOC_FIRST_LINE: the boundary §2 defends');
  eq(MODULE.indexOf(DECL_FIRST_LINE), DOC_TAKEN,
    '…with the declaration, DECL_FIRST_LINE, at exactly DOC_TAKEN units in, after the three comment lines');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * EM_DASHES,
    '…its UTF-8 length longer than its UTF-16 length by two bytes for each em dash…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…of which it holds NON_ASCII_CHARS…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…EM_DASHES of them em dashes, the whole of the non-ASCII…');
  ok(MODULE.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => !l.trim().startsWith('//')),
    '…every one on a line of CODE, inside a string literal the second function returns to the operator, so the move preserves what the banner shows, byte for byte');
}
// THE TAG'S POSITION. Nothing here shows the load order to be load-bearing (§3 says what it does not measure),
// and it is pinned all the same: last of the local scripts, immediately before the inline monolith, whose
// consumer stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/portfolio/portfolio-beta-missing-reason.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumer calls it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES THE FIRST FUNCTION at its two sites and the second nowhere in the monolith: the block's
  // own text left, the guarded statement did not.
  eq(refSites(LIVE_MONOLITH, OWNER).length, CONSUMER_SITES,
    '…while the shipped monolith names ' + OWNER + ' at the CONSUMER_SITES sites that stayed, the probe and the call…');
  eq(refSites(LIVE_MONOLITH, OWNER_LAST).length, 0, '…and ' + OWNER_LAST + ' nowhere at all…');
  eq(refSites(MASKED, OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, CONSUMER_SITES,
    '…the same CONSUMER_SITES the reconstructed base held from outside the block…');
  // The module itself names both, the control that makes the counts below measurements.
  ok(refSites(MODULE, OWNER).length >= 1 && refSites(MODULE, OWNER_LAST).length >= 1,
    'control — the same count over the module itself finds both names…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t2, rel) =>
    t2 + refSites(fs.readFileSync(path.join(ROOT, rel), 'utf8'), OWNER).length, 0), 0,
  '…and not one other local script names the first function…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).map((rel) => [rel, refSites(fs.readFileSync(path.join(ROOT, rel), 'utf8'), OWNER_LAST).length])
    .filter((x) => x[1] > 0), [[SIBLING_MODULE, SIBLING_REFERENCES]],
  '…while exactly ONE other local script names the second, SIBLING_MODULE, SIBLING_REFERENCES time: the call that loads before this module and runs after it');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its two owners and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => MONOLITH_DEPENDENCIES.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    MONOLITH_DEPENDENCIES.slice().sort(), '…and so does the one function the module reads at call time, escHtml');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMERS.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    CONSUMERS.slice().sort(), '…and its consumer, which calls the module\'s first function');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, stays too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the brace of the owner above directly against `async function ' + NEXT_DECL + '`, once…');
  eq(LIVE_MONOLITH.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 2, '…at the place the cut was made…');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT_PREFIX), JOINS_LIKE_THE_CUT_BEFORE + 1,
    '…one more of a shape the document held JOINS_LIKE_THE_CUT_BEFORE times already…');
  eq(count(LIVE_MONOLITH, JOIN_BEFORE_CUT), 0, '…and the join of that brace against this block\'s documentation gone with the block');
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
  const E = 'OPTION_CHAIN_ERROR_HELPERS_UNDO_';
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,709 units, not 1,708 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('option_chain_timeout', 'option_chain_timeouT');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoOptionChainErrorHelpers(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoOptionChainErrorHelpers(INDEX, MODULE),
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/option-chain-error-helpers-undo.js'),
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
console.log('OPTION_CHAIN_ERROR_HELPERS_CONTRACT_OK');
}

main();
