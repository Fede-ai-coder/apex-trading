'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND SQUEEZE EXTRACT — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [905366,908287) in monolith coordinates — 2,922 units raw and
// 2,921 of body, ONE owner, synchronous — now lives in
// js/portfolio/portfolio-backend-squeeze-extract.js. `_extractBackendSqueezeByTicker`
// takes a list of tickers, a technical-refresh response and a source tag, and returns
// `{ byTicker, reasonByTicker }`: for each ticker the squeeze the backend itself emitted
// inside `technical['1D'|'4H']`, or the backend's OWN reason when none was sourced. It
// computes nothing, reads two functions of the monolith and writes nothing. The block
// opens on the ten comment lines that document it and the blank line above them stayed
// behind.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #516 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: TWO ROWS TIED AT THE BEST SCORE, AND ONE CONTAINED THE ─
// ── OTHER ───────────────────────────────────────────────────────────────────────
//
// The contract before this layer published its four best other openings, and this was
// the FIRST of them, in a three-way tie at (byConsumerSplit, raw nine) = (3, 3) with the
// block that contract shipped and with the pair this one sits in. The shipped cut left,
// and two rows were at (3, 3) afterwards: this block, and the same block taken together
// with `_portfolioTechnicalRowMapFromResponse` directly above it. The second CONTAINED
// the first and ended where it ended, so they were one function with and without its
// neighbour, not two unrelated places. They were not equal on the other counts: this
// block has one consumer and TWO dependencies, the pair has TWO consumers and one. The
// published ranking key (byConsumerSplit, raw nine, units ascending) put them in order
// by LENGTH ALONE, and this was the shorter. §4 pins both rows in full and counts no row
// below 3 over the screen and the pass over its sub-floor runs together.
//
// ── PART TWO: THE SCREEN HELD IT AT ITS DECLARATION, NOT AT THE CUT ────────────
//
// Measured from its declaration the block is 2,086 units, over the 1,500 floor, so the
// screen enumerated a run that opened at the DECLARATION and ended where this cut does.
// The cut itself opened ten comment lines higher, at 2,921 units, and the screen did not
// enumerate that run: only runs under the floor are re-measured from their documentation,
// and this one was not under it. §2 counts all three. The choice of the higher opening is
// the programme's own blockAbove judgement, defended there.
//
// ── PART THREE: ONE CALL FROM ONE CONSUMER, TWO DEPENDENCIES READ AT CALL TIME ─
//
// The raw nine is 3. `refreshPositionsLive`, a function of 138,483 units, calls the
// function once, from a callback, and nothing else names it. The two dependencies are
// functions declared in the monolith, `_portfolioTechnicalRowMapFromResponse` (867
// units, directly above the block) and `_technicalTfSqueezeState` (329 units, far
// above), both read inside the body at CALL time. The block runs no top-level
// statement and reads nothing at evaluation time; it writes no monolith name, deletes
// nothing and touches the host through none of window, document, storage, console,
// timers or fetch. Nothing outside it names it as an object key or in markup.
//
// ── PART FOUR: WHAT THE LOAD ORDER DEPENDS ON, AND WHAT IS NOT MEASURED ───────
//
// The single reference sits inside a function body and the block reads its
// dependencies only when called. §3 measures where that site is. It does NOT measure
// what calls `refreshPositionsLive`, so it does not show that it is not called while the
// monolith is being evaluated. The tag sits last of the local scripts, directly in front
// of the inline monolith, which makes the question moot rather than answered here; §9
// pins that position.
//
// ── PART FIVE: THIRTEEN OPENINGS WERE LEGAL, TWELVE PARSE, ONE IS A BLANK LINE ─
//
// The seam rule admitted thirteen line starts between the owner above and the
// declaration: that owner's closing brace, the blank line after it, the ten comment
// lines and the declaration. The brace does not parse as a script. The cut took the
// whole comment block the programme's blockAbove rule finds and left the blank line,
// so the monolith kept `}` + blank line + the comment block of
// `_applyTechnicalRefreshEarnings`, a join it held once at the END of the block and
// holds once at the place the cut was made. Opening at the declaration would have left
// ten comment lines against that function, which they do not describe.
//
// ── PART SIX: IT IS NOT THE FIRST OWNER OF ITS REGION, AND THE CUT TOOK NO ────
// ── BANNER ──────────────────────────────────────────────────────────────────────
//
// The block is owner number 10 of 23 in the `[PortfolioRefreshPayload]` region. §5
// prices EVERY owner above and EVERY owner below as the cut extended to the end of
// that owner: of the nine above, one tied the cut on both measures and eight were worse;
// of the thirteen below, all thirteen were worse. The cut took no banner, so the
// document's top-level banners and owner regions did not move.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED, NOT ASSUMED ────────────────────────
//
// §7 loads the SHIPPED module in a VM, bare, then with RECORDING STUBS for the two
// dependencies, and drives it through a table: every way the response and the rows can
// be absent, the 1D/4H/aggregate precedence, what counts as a squeeze that is present,
// the order of the reason chain, the default source tag, the keys and their order, and
// that the inputs are never written to. It then runs the module once more with the REAL
// text of both dependencies, read out of the reconstructed monolith, and the shipped
// module that holds the helper `_technicalTfSqueezeState` calls, over the four places a
// row can come from.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-one layers the chain now holds: it is the
// seventeenth smallest, which §8 measures against every layer rather than asserting. Its
// body holds two non-ASCII characters, both em dashes in comments, so it is not pure ASCII
// and the pure-ASCII count did not move; it does not open on a `// ── ` banner, so the
// banner count did not move either; and it pins a NON-EMPTY monolith dependency, so the
// count of layers that pin one moved, by one. §8 measures all three.
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
const UNDO = require('./lib/portfolio-backend-squeeze-extract-undo.js');
const OPTION_CHAIN_ERROR_HELPERS_U = require('./lib/option-chain-error-helpers-undo.js');
const PORTFOLIO_BETA_MISSING_REASON_U = require('./lib/portfolio-beta-missing-reason-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/portfolio-backend-squeeze-extract.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '4779e2c';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'd458ab6';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = 'd64e232';
const BASE_CHARS = 1421811;
const BASE_UTF8 = 1450200;
const BASE_LF = 24556;
const BASE_SHA256 = '7bbcab4dbc71b14d408b529cb3364b9bae3228a52063f13868e317f7a9b6f5e2';
const LOCAL_SCRIPTS = 104;
const TEST_FILE_COUNT = 191;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-backend-squeeze-extract-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/backend-squeeze-extract-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-backend-squeeze-extract-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-backend-squeeze-extract-contract.spec.js';
const UNDO_REL = 'tests/lib/portfolio-backend-squeeze-extract-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'd458ab6';
const CONTRACT_SPEC_MUTANTS = 192;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 53;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/portfolio-regime-badge-html-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 188;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/backend-squeeze-extract-audit.spec.js';
const RETIRED_MUTANTS = 182;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116294;
const CODE_CHARS = 1305491;
const TOP_LEVEL_DECLS = 889;
const OWNER_REGIONS = 114;

// ── The region ───────────────────────────────────────────────────────────────
// It opened on the first of ten comment lines directly above the declaration, and the
// blank line above them stayed behind as the separator.
const RAW_AT_IN_CODE = 905366;
const DECL_AT_IN_CODE = 906201;
const RAW_END_IN_CODE = 908288;
const BODY_END_IN_CODE = 908287;
const RAW_CHARS = 2922;
const BODY_CHARS = 2921;
const BODY_UTF8 = 2925;
const BODY_LF = 54;
const BODY_SHA256 = 'd3b178447969a3034c674827ceec7e4825e539ba9b5828711a5a7b689800f49c';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// SQZ is candle-derived (BB-inside-KC compression) and INDEPENDENT of the SMA/RSI/';
const DECL_FIRST_LINE = 'function _extractBackendSqueezeByTicker(tickers, technicalResp, sourceTag) {';
const EM_DASHES = 2;
const NON_ASCII_CHARS = 2;
const NEXT_DECL = '_applyTechnicalRefreshEarnings';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_extractBackendSqueezeByTicker'];
const OWNER_SIZES = [2085];
const OWNER = '_extractBackendSqueezeByTicker';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 54;
const CODE_LINES = 42;
const COMMENT_LINES = 12;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
const OWNER_BEFORE = '_portfolioTechnicalRowMapFromResponse';
const BRACE_OPENING = 905363;
const BLANK_OPENING = 905365;
const DOC_TAKEN = 835;
const DOC_TAKEN_LINES = 10;
const SEAM_LEGAL_OPENINGS = 13;
const PARSING_OPENINGS = 12;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 905364;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 2086;
const CANDIDATES_AT_DECLARATION = 1;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut left behind: the closing brace of the owner above, one blank line, and
// the comment block of the next function — the join the monolith already held, once, at the end of the block.
const NEXT_DOC_PREFIX = '// Apply next-earnings that the backend';
const FUSED_IF_BLANK_TAKEN = '}\n// Apply next-earnings that the backend';
const JOIN_AFTER_CUT = '}\n\n// Apply next-earnings that the backend';
const JOIN_AS_BEFORE = '}\n\n// SQZ is candle-derived';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 870703;
const REGION_END = 931549;
const REGION_CHARS = 60846;
const REGION_OWNERS = 23;
const OWNER_POSITION = 10;
const BANNER_LINE_PREFIX = '// ── [PortfolioRefreshPayload]';
const WHOLE_REGION_NINE = 122;
const WHOLE_REGION_BCS = 53;
const WHOLE_REGION_CONSUMERS = 9;
const WHOLE_REGION_DEPS = 23;
const WHOLE_REGION_SIB = 5;
// THE CUT TAKES NO BANNER, so the document's top-level banners and owner regions do not move.
const BANNER_MARKS = 215;

// ── Taking more, priced: the owners above; the owners below ──────────────────
// Above: NINE owners stand above the cut in its region. Each row is the cut extended UP to
// the start of that owner's documentation: [name, opening, units, raw nine, byConsumerSplit,
// monolith dependencies, runs nothing at load].
const EXTENSIONS_UP = [
  ['_portfolioTechnicalRowMapFromResponse', 904183, 4104, 3, 3, 1, true],
  ['_mergePreviousPortfolioTechnicalsForPartialRefresh', 902996, 5291, 7, 4, 2, true],
  ['fetchPortfolioLiveRefresh', 897177, 11110, 21, 13, 10, true],
  ['fetchPortfolioFullRefresh', 880639, 27648, 26, 15, 11, true],
  ['_resolveLegGreeksDisplay', 876841, 31446, 27, 15, 11, false],
  ['buildPortfolioLiveRefreshPayload', 872984, 35303, 31, 17, 12, false],
  ['_portfolioTechnicalDebugEnabled', 872381, 35906, 41, 20, 12, false],
  ['_portfolioRiskDebugEnabled', 871730, 36557, 86, 25, 11, false],
  ['_portfolioRefreshPayloadDebugEnabled', 870703, 37584, 85, 24, 10, false],
];
const OWNERS_ABOVE = 9;
// Below: THIRTEEN owners stay in the region and all are pinned in full, as
// [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['_applyTechnicalRefreshEarnings', 911228, 5862, 11, 9, 7],
  ['fetchPortfolioTechnicalRefresh', 920491, 15125, 20, 16, 9],
  ['logOptionStreamerDiagnostics', 920786, 15420, 24, 20, 11],
  ['updateStreamerPreview', 921841, 16475, 25, 20, 11],
  ['renderAddPositionForm', 923970, 18604, 38, 32, 16],
  ['renderLegsTable', 929469, 24103, 60, 54, 18],
  ['onStrategyChange', 929781, 24415, 59, 53, 18],
  ['updateLegField', 929882, 24516, 51, 45, 17],
  ['addCustomLeg', 930043, 24677, 49, 43, 17],
  ['removeLeg', 930158, 24792, 47, 41, 17],
  ['_deriveLegStreamer', 930503, 25137, 50, 42, 16],
  ['updateLegStreamer', 931446, 26080, 48, 40, 17],
  ['refreshAllLegStreamers', 931548, 26182, 46, 38, 17],
];
const OWNERS_BELOW = 13;
const UP_LEGAL = 9;
const UP_TIES = 1;
const UP_WORSE = 8;
const UP_NOT_CLEAN = 5;
const DOWN_LEGAL = 13;
const DOWN_WORSE = 13;
const DOWN_NOT_CLEAN = 0;
// THE ONE RUN the single owner makes, which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['_extractBackendSqueezeByTicker', '_extractBackendSqueezeByTicker', 905366, 908287, 2921, 3, 3,
    ['_portfolioTechnicalRowMapFromResponse', '_technicalTfSqueezeState'], 1],
];
const OWN_RUNS_LEGAL = 1;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 0;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 3;
const BY_CONSUMER = 3;
const BY_CONSUMER_SPLIT = 3;
const CONSUMERS = ['refreshPositionsLive'];
const CONSUMER_SITES = 1;
const CONSUMER_SITES_AT = [999774];
const CONSUMER_AT = 960414;
const CONSUMER_END = 1098896;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = ['_portfolioTechnicalRowMapFromResponse', '_technicalTfSqueezeState'];
// [name, start, end, chars] of each dependency, both declared functions of the monolith.
const DEPENDENCY_DECLS = [
  ['_portfolioTechnicalRowMapFromResponse', 904497, 905363, 867],
  ['_technicalTfSqueezeState', 734793, 735121, 329],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 1;
const OUTBOUND_MODULE_REFERENCES = 0;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// THE SCAN THIS FILE INHERITED needs no correction here: on this block the inherited and the
// corrected scan agree and both find nothing, and both are shown to find a planted write.
const UNCORRECTED_SCAN_NAMES = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_extractBackendSqueezeByTicker'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7186;
const SEAM_REJECTED = 2091;
const CANDIDATES = 2833;
const CLEAN_CANDIDATES = 1704;
const SCORE_TWO_OR_BELOW = 0;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor. THIS CUT IS NOT ONE OF THEM.
const HIDDEN_ROWS = 35;
const HIDDEN_CLEAN_ROWS = 34;
const HIDDEN_SCORE_TWO_OR_BELOW = 0;
// THE ROWS AT THE BEST SCORE, 3, over the screen and the pass together.
const ROWS_AT_THREE = 13;
const ROWS_AT_THREE_SCREEN = 10;
const ROWS_AT_THREE_HIDDEN = 3;
const LOWEST_NINE_AT_THREE = 3;
// THE ROWS AT (byConsumerSplit, raw nine) = (3, 3), each pinned in full:
// [opening, closing, units, consumers, monolith dependencies].
const TIED_AT_BEST = [
  [906201, 908287, 2086, 1, 2],
  [904497, 908287, 3790, 2, 1],
];
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [758195, 3, 4, 1690],
  [934874, 3, 4, 1708],
  [628563, 3, 5, 1540],
  [1182789, 3, 5, 2252],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
// They are NEGATIVE, because that cut took its region's banner and the owner it left behind
// joined a region that held one owner, which makes fewer runs than two regions did.
const DELTA_RAW_RUNS = -1;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = -1;
const DELTA_CLEAN = -1;
const PREVIOUS_RAW_CHARS = 2031;
const PREVIOUS_RAW_AT = 68905;
// The previous contract's published list, with where each entry sat relative to
// the cut it shipped.
const PREVIOUS_RUNNERS_UP = [
  [908232, 3, 3, 2086],
  [906528, 3, 3, 3790],
  [760226, 3, 4, 1690],
  [936905, 3, 4, 1708],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. §8 measures the smallest layer at SMALLEST_LAYER_CHARS.
const CHAIN_LENGTH = 61;
const SMALLEST_LAYER_CHARS = 1559;
const SIZE_RANK = 17;
const LAYERS_SMALLER_THAN_THIS_CUT = 16;
const LAYERS_LARGER_THAN_THIS_CUT = 44;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 8;
const PRIOR_LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_BANNER = 26;
const PRIOR_LAYERS_OPENING_ON_WIDE_BANNER = 29;
const LAYERS_OPENING_ON_WIDE_BANNER = 29;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 24;
const LAYERS_WITH_A_DEPENDENCY = 25;
// The count above is the figure AT THIS LAYER. The later layer that pins a NON-EMPTY list
// instead IS among the contracts counted over the suite, and is set aside to recover the
// figure at this layer rather than left to make it drift.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['option-chain-error-helpers-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 2846;
const INDEX_AFTER = 1418965;
const RESIDUAL_MONOLITH = 1302569;
const LOCAL_SCRIPTS_AFTER = 105;
// The tag's position among the local scripts, zero-based: the last of 105.
const TAG_LOCAL_INDEX = 104;

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


console.log('BACKEND SQUEEZE EXTRACT — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_OPTION_CHAIN_ERROR_HELPERS = OPTION_CHAIN_ERROR_HELPERS_U.isApplied(HEAD_INDEX)
  ? OPTION_CHAIN_ERROR_HELPERS_U.undoOptionChainErrorHelpers(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/option-chain-error-helpers.js'), 'utf8'))
  : HEAD_INDEX;
const LIVE_INDEX = PORTFOLIO_BETA_MISSING_REASON_U.isApplied(PRE_OPTION_CHAIN_ERROR_HELPERS)
  ? PORTFOLIO_BETA_MISSING_REASON_U.undoPortfolioBetaMissingReason(
      PRE_OPTION_CHAIN_ERROR_HELPERS, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-beta-missing-reason.js'), 'utf8'))
  : PRE_OPTION_CHAIN_ERROR_HELPERS;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX, MODULE);

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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the regime badge
// HTML predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the thirteen openings the seam admits');
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
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the first line of its documentation');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dashes…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII characters in all, the em dashes being the whole of them…');
ok(BODY.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => l.trim().startsWith('//')),
  '…every one of them inside a comment line, never in code or in a string the function returns');
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
    'snapping the end of the span up to the next declaration back to the last line of code lands on BODY_END_IN_CODE');
  eq(next.name, NEXT_DECL, '…and the declaration after the cut is NEXT_DECL…');
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…its own comment block beginning exactly where the cut ends, so the cut ends where that documentation begins and takes none of it…');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DOC_PREFIX.length), NEXT_DOC_PREFIX,
    '…its first characters being NEXT_DOC_PREFIX');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits thirteen openings.
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
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the thirteen…');
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
    '…so PARSING_OPENINGS of the thirteen are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the whole comment block above the function and nothing else: ten comment lines directly
// above the declaration, with the blank line above THEM left behind. Two more comment lines sit INSIDE the body.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the comment block taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  ok(!/^\/\/ ─{2,}/m.test(doc), '…none of them a banner, so the cut takes no section heading with it');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNER)).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  const own = BY_NAME.get(OWNER);
  eq(CODE.slice(own.start, own.end + 1).split('\n').filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES - DOC_TAKEN_LINES,
    'the function holds COMMENT_LINES less DOC_TAKEN_LINES comment lines inside its body: the two that explain its fallbacks…');
  eq(COMMENT_LINES, DOC_TAKEN_LINES + 2, '…so the body\'s twelve comment lines are the ten at the top and those two');
  ok(doc.indexOf('parity-independent') >= 0 && doc.indexOf('never a silent') >= 0,
    '…and the block says the pass is parity-independent and never leaves a silent gap, claims §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the documentation is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE COMMENT BLOCK WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would have left the ten comment lines directly above the comment block of ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto the documentation of ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith held nowhere before the cut, once there');
}
// WHAT THE CUT LEFT. The brace of the owner above, one blank line, then the next function's documentation: the very
// join the monolith held at the END of the block, so the cut moved it and the document gained no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith holds the join `}` blank line `' + NEXT_DOC_PREFIX + '` once before the cut, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the function…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of the documentation is held once before the cut, and is gone after it…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the documentation leaving with the block');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this comment block or declaration is left behind');
}
// THE SCREEN HOLDS THIS RUN AT ITS DECLARATION, AND NOT AT THE CUT. The screen measures a run that is not the first owner of its
// region from the DECLARATION, so the run it enumerates opens at DECL_AT_IN_CODE and is DECL_UNITS_FROM_DECLARATION units, over
// the floor. The pass over sub-floor runs, which is the only one that re-measures from the documentation, skips it for that reason.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION >= RUN_FLOOR, '…at or over RUN_FLOOR, so the floor is not what holds it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the screen enumerates CANDIDATES_AT_DECLARATION run that opens at the declaration and ends where this cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does, ten lines higher: the cut is the documentation-inclusive judgement, not a screen row…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…and the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT rows for it, the run not being short');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE - DECL_UNITS_FROM_DECLARATION, DOC_TAKEN,
  '…the difference between the two measurements being exactly the DOC_TAKEN units of documentation');

// ───────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one call, two dependencies read at call time');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a declared function, so this layer ships no mutable binding');
  ok(own.every((d) => !/^async function /.test(firstLineOf(CODE.slice(d.start)))), '…SYNCHRONOUS');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, 2,
    '…with one more function expression INSIDE it, the callback it hands `forEach`, which is not a top-level owner…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the owner');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES reference from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: two monolith functions');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: one inbound reference and two dependencies');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'ONE consumer reaches in: CONSUMERS');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES place');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  ok(REC.sites.every((at) => /^\s*\(/.test(CODE.slice(at + OWNER.length))),
    'the reference is followed by an opening parenthesis: it is a CALL, not an object key or a bare reference…');
  const site = REC.sites[0];
  const rpl = BY_NAME.get('refreshPositionsLive');
  ok(rpl.start >= RAW_END_IN_CODE, 'refreshPositionsLive sits outside the cut, below it…');
  eq([rpl.start, rpl.end, rpl.chars, rpl.form], [CONSUMER_AT, CONSUMER_END, CONSUMER_CHARS, 'function'],
    '…opening at CONSUMER_AT, ending at CONSUMER_END, CONSUMER_CHARS units long, a declared function');
  eq(hostOf(site).name, CONSUMERS[0], '…and it is the declaration that holds the one reference');
  ok(insideFunction(site) && site > rpl.start && site < rpl.end,
    '…inside a function body, that of the declared function above. THAT is as far as this contract goes: it measures where the site is, and does NOT measure what calls refreshPositionsLive');
  ok(/_sqSources\.forEach\(function\(_sqResp\) \{\s*var _sqOut = $/.test(CODE.slice(site - 90, site)),
    '…from the callback of a `forEach` over its squeeze sources, which is what makes the call run once per source');
  eq(refSites(STRINGS, OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, 0,
    '…and the name appears in no string or generated markup outside the block');
  eq(count(STATIC_MARKUP, OWNER), 0, '…nor in the static markup, so no inline handler names it');
  eq(SIB_REFS.get(OWNER), { n: 0, who: [] }, '…nor in any shipped module');
}
// THE TWO DEPENDENCIES, both declared functions of the monolith, read inside the body at CALL time.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  for (const [name, start, end, chars] of DEPENDENCY_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function of the monolith, opening at ' + start + ' and ' + chars + ' units long…');
    eq(d.isAsync, false, '…synchronous…');
    const sites = refSites(bodyMasked, name);
    ok(sites.length > 0 && sites.every((at) => /^\s*\(/.test(bodyMasked.slice(at + name.length))), '…and the block only ever CALLS it…');
    ok(sites.every((at) => RAW_AT_IN_CODE + at > DECL_AT_IN_CODE + DECL_FIRST_LINE.length), '…always inside the function body, never in the signature, so it is read when the function is called');
    ok(insideFunction(RAW_AT_IN_CODE + sites[0]) === true, '…and the monolith declares it at its top level, so a later classic script sees it as a global');
  }
  eq(DEPENDENCY_DECLS.map((d) => refSites(bodyMasked, d[0]).length), [1, 2],
    'the row-map function is called once in the block and the squeeze-state function twice, once for each timeframe');
  ok(BY_NAME.get('_portfolioTechnicalRowMapFromResponse').end < RAW_AT_IN_CODE && BY_NAME.get('_technicalTfSqueezeState').end < RAW_AT_IN_CODE,
    '…both declared ABOVE the cut, so neither moves with it and neither is left behind by it');
  eq(DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop().name, DEPENDENCY_DECLS[0][0],
    '…the first of them being the owner immediately above the cut');
}
// WHAT RUNS AT LOAD. Nothing: the block holds one function declaration and no statement.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: one function declaration only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(await|yield|this|new)\b/g) || []).length, 0, '…no await, no yield, no `this` and no `new`…');
  eq((bodyMasked.match(/\b(globalThis|self|window|document|localStorage|console|setTimeout|setInterval|fetch)\b/g) || []).length, 0,
    '…and no window, document, storage, console, timer or fetch');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all');
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
  eq(nonLocalAssignmentsUncorrected(BODY), UNCORRECTED_SCAN_NAMES,
    'the inherited scan reports UNCORRECTED_SCAN_NAMES, assignments to names it takes for globals: none…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the block does not own');
  // CONTROLS: both scans DO find a planted violation, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { _technicalTfSqueezeState = 1; }'), ['_technicalTfSqueezeState'],
    'control — a write to one of the block\'s own dependencies is found: the zero above is not blind to the names that matter here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────
section('4. THE FINDING: two rows tie at (3, 3), one contains the other, and the length alone orders them');
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
    '…and it sat entirely BEFORE this block, so everything this contract measures at or after it moved down by exactly that many units, as read from the rows below');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, 'the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq(listed[0], [DECL_AT_IN_CODE + PREVIOUS_RAW_CHARS, BY_CONSUMER_SPLIT, FULL_NINE, DECL_UNITS_FROM_DECLARATION],
    '…the FIRST of them being THIS block\'s screen row, at its declaration moved up by PREVIOUS_RAW_CHARS, with the same byConsumerSplit and raw nine and a length of DECL_UNITS_FROM_DECLARATION: nothing about it changed…');
  eq(listed[1].slice(1, 3), [BY_CONSUMER_SPLIT, FULL_NINE],
    '…the SECOND being a row at the same score…');
  eq(listed.slice(1).map((r) => r[0] - PREVIOUS_RAW_CHARS), [TIED_AT_BEST[1][0], RUNNERS_UP[0][0], RUNNERS_UP[1][0]],
    '…and that row, with the other two, sitting AFTER the cut that shipped, every one of the four having moved down by PREVIOUS_RAW_CHARS into this contract\'s second tied row and first and second runners-up');
  eq(listed.slice(2).map((r) => r[3]), [RUNNERS_UP[0][3], RUNNERS_UP[1][3]],
    '…with the lengths of those two unchanged');
  // THE TIE the previous contract recorded had THREE rows: the cut that shipped, and these two.
  const tiedThen = listOf('TIED_AT_BEST');
  eq(tiedThen.length, 1 + TIED_AT_BEST.length,
    'the tie the previous contract recorded was three rows, the cut that shipped plus these two…');
  eq(tiedThen.slice(1).map((r) => [r[0] - PREVIOUS_RAW_CHARS, r[1] - PREVIOUS_RAW_CHARS, r[2], r[3], r[4]]), TIED_AT_BEST,
    '…and the other two, moved by PREVIOUS_RAW_CHARS, are exactly TIED_AT_BEST here: the tie lost the row that shipped and kept the rest');
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
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc, c })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    '…so in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit, which is the best score there is…');
  const atBest = rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT);
  eq(atBest.length, ROWS_AT_THREE, 'and BY_CONSUMER_SPLIT is held by ROWS_AT_THREE rows over the two enumerations…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_SCREEN,
    '…ROWS_AT_THREE_SCREEN of them in the shipped screen…');
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_HIDDEN, '…and ROWS_AT_THREE_HIDDEN in the pass over sub-floor runs…');
  eq(Math.min.apply(null, atBest.map((r) => r.nine)), LOWEST_NINE_AT_THREE,
    '…the lowest raw nine among them being LOWEST_NINE_AT_THREE, which is this block\'s FULL_NINE: nothing at the best score has a lower one…');
  // THE TIE, pinned in full: every row at the best score AND the lowest raw nine.
  const tiedRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const tied = tiedRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(tied, TIED_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE) are exactly TIED_AT_BEST, two of them, this block the SHORTER…');
  eq(new Set(tied.map((r) => r[0])).size, tied.length, '…at two distinct openings…');
  ok(tied[1][1] === tied[0][1] && tied[1][0] < tied[0][0],
    '…the second ending exactly where the first does and opening higher up: the first is wholly inside the second, so they are the SAME function with and without the one above it, not two unrelated places…');
  eq(tied[1][0], BY_NAME.get(OWNER_BEFORE).start, '…the one above it being OWNER_BEFORE, whose declaration is where the second opens');
  // THE TIE IS NOT AN EQUALITY OF THE PARTS. The two rows total the same raw nine from different directions.
  eq(tied.map((r) => [r[3], r[4]]), [[1, 2], [2, 1]],
    '…and the two are NOT equal on the parts: one consumer and two dependencies for this block, two consumers and one dependency for the pair…');
  eq(tiedRows.map((r) => r.c.p.sib), [0, 0], '…neither spending any of its nine on a sibling-module reference…');
  ok(tied[0][3] !== tied[1][3] && tied[0][4] !== tied[1][4],
    '…so the order within the tie is decided by LENGTH, which the published key (byConsumerSplit, raw nine, units ascending) puts last, and by nothing else');
  // THE NEXT SCORE, counted the same way, so "no row below" means something: the rows one step behind.
  eq(rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT + 1).length > 0, true,
    'control — rows DO exist one step behind at ' + (BY_CONSUMER_SPLIT + 1) + ', so the zero below ' + BY_CONSUMER_SPLIT + ' is a measurement and not a screen that returns nothing');
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
  ok(ranked.every((r) => r[1] === BY_CONSUMER_SPLIT && r[2] > FULL_NINE),
    '…every one of them at ' + BY_CONSUMER_SPLIT + ', the same score, but with a WORSE raw nine: this block has no second, because the other row at its score contains it and so overlaps the cut');
}

// ───────────────────────────────────────────────────────────────────────────
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
  let seam = null; try { seam = assertSeam(CODE, RAW_AT_IN_CODE, hb); } catch (e) { seam = null; }
  return { hb, p, bcs: byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), clean: runsNothingAtLoad(l), seam };
};
eq(REGION_OWNER_LIST.findIndex((d) => d.name === OWNER) + 1, OWNER_POSITION, 'the cut is owner number OWNER_POSITION of its region…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and takes the next OWNER_COUNT, which is its one');
eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…of REGION_OWNERS in the region');
// EVERY OWNER ABOVE IT IN THE REGION. Each is priced as the cut extended UP to the start of that owner's documentation.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut…');
{
  const priced = OWNERS_UP.map((d) => Object.assign({ name: d.name }, priceUp(d)));
  eq(priced.filter((r) => r.seam !== null).length, UP_LEGAL, '…UP_LEGAL of the extensions at real seams, every owner above being separated from the next by a blank line…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine === FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES,
    '…UP_TIES of them TYING the cut on both the raw nine and byConsumerSplit: the owner directly above, whose extension is the pair of §4…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, UP_WORSE,
    '…UP_WORSE worse than the cut on BOTH, so no extension upward is better than the cut and only one is as good…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…and not one better on either measure');
  eq(priced.filter((r) => !r.clean).length, UP_NOT_CLEAN, '…UP_NOT_CLEAN of them also running something at load…');
  eq(priced.map((r) => [r.name, r.lo, BODY_END_IN_CODE - r.lo, r.p.nine, r.bcs, r.p.deps.length, r.clean]),
    EXTENSIONS_UP, 'all nine are exactly EXTENSIONS_UP, pinned in full');
  ok(EXTENSIONS_UP.every((e) => e[2] === BODY_END_IN_CODE - e[1]), '…each pinned opening agreeing with its pinned length');
  ok(priced[0].name === OWNER_BEFORE && priced[0].lo === upStart(BY_NAME.get(OWNER_BEFORE)),
    '…the first of them OWNER_BEFORE, opening at the start of its own documentation');
  // THE TIE ABOVE IS NOT THE SCREEN'S ROW: the screen's row for the pair opens at OWNER_BEFORE's declaration, a documentation-exclusive opening.
  eq(candidateRuns.filter((c) => c.lo === BY_NAME.get(OWNER_BEFORE).start && c.hi === BODY_END_IN_CODE).map((c) => c.units), [TIED_AT_BEST[1][2]],
    '…while the screen\'s own row for that pair opens at OWNER_BEFORE\'s declaration and is TIED_AT_BEST\'s second row, a shorter span than the extension priced here');
}
// EVERY OWNER BELOW IT IN THE REGION. Each is priced as the cut extended down to the end of that owner.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the block…');
{
  const priced = OWNERS_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL of the ends at them real seams…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit, so no stopping point below is better or ties…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load…');
  eq(priced.map((r) => [r.name, r.hb, r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length]),
    EXTENSIONS_DOWN, 'all thirteen are exactly EXTENSIONS_DOWN, pinned in full');
  ok(EXTENSIONS_DOWN.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…each pinned closing agreeing with its pinned length');
  // THE LAST OWNER BELOW ENDS THE REGION, so taking all thirteen is taking everything from the cut to the region's end.
  const last = priced[priced.length - 1];
  eq(REGION.end - 1 <= CODE.indexOf('\n', OWNERS_DOWN[OWNERS_DOWN.length - 1].end) + 1, true, '…the last of them the last owner of the region…');
  ok(last.hb <= REGION.end, '…its extension ending inside the region');
}
// THE ONE RUN the single owner makes. A function alone is one run, and it is the cut.
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
  eq(measured, OWN_RUNS, 'the one owner makes exactly the one run OWN_RUNS');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them a real seam…');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR, the cut clearing it…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[DECL_AT_IN_CODE, BODY_END_IN_CODE]],
    '…and the shipped screen enumerating exactly ONE run inside the block, the same function opening at its declaration');
}
// THE BANNER REGION it sits inside. The cut is owner number 10 of 23 and the banner is far above it, so the cut takes NO banner
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
    'the cut takes NO banner: the document\'s top-level banners stay at BANNER_MARKS…');
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
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs. That cut took its region's
  // banner, so the owner it left behind joined the region above, and two regions of runs became one.
  const tri = (n) => n * (n + 1) / 2;
  const above = prevNum('REGION_ABOVE_OWNERS'), own = prevNum('REGION_OWNERS'), left = own - prevNum('OWNER_COUNT');
  eq(tri(above + left) - tri(above) - tri(own), DELTA_RAW_RUNS,
    '…and the raw-run change is exactly what that merge predicts: one region of ' + (above + left) + ' owners makes ' + tri(above + left) + ' runs where regions of ' + above + ' and ' + own + ' made ' + (tri(above) + tri(own)) + ', a difference of DELTA_RAW_RUNS — here it is negative because the region above held a single owner');
  ok(DELTA_RAW_RUNS < 0 && DELTA_CANDIDATES < 0,
    '…the candidate counts shrinking with it, which this contract measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
  '…and the screen enumerates NO run that opens at the first comment line: it measures this owner from its declaration, so every run that includes it opens there instead');

// ─────────────────────────────────────────────────────────────────────
section('7. The SHIPPED module loads bare, it calls its two dependencies at call time, and the output, the fallbacks and the failures are measured');
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
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its one owner');
  eq(vm.runInContext(OWNER + '.constructor.name', bare), 'Function', '…an ordinary synchronous function');
  eq(vm.runInContext(OWNER + '.length', bare), 3, '…taking the tickers, the response and the source tag');
  {
    let err = null;
    try { vm.runInContext(OWNER + '([], {}, "x")', bare); } catch (e) { err = e.name; }
    eq(err, 'ReferenceError', '…and CALLING it there throws ReferenceError even for an empty list, because the row map is built first and its function is not defined: loading needs nothing, calling needs the dependencies');
  }

  // A HARNESS with the two dependencies as RECORDING STUBS, so what the block asks of them is measured.
  const DEFAULT_STATE = (tf) => (tf && tf.s !== undefined ? tf.s : null);
  const harness = (opts) => {
    const o = Object.assign({ rowMap: (resp) => (resp && resp.rows) || {} }, opts || {});
    o.state = o.state || DEFAULT_STATE;
    const rec = { rowMapArgs: [], stateArgs: [] };
    const ctx = vm.createContext(Object.create(null));
    ctx._portfolioTechnicalRowMapFromResponse = (resp) => { rec.rowMapArgs.push(resp); return o.rowMap(resp); };
    ctx._technicalTfSqueezeState = (tf) => { rec.stateArgs.push(tf); return o.state(tf); };
    vm.runInContext(MODULE, ctx);
    return { rec, ctx, call: (tickers, resp, tag) => { ctx.T = tickers; ctx.R = resp; ctx.G = tag; return vm.runInContext(OWNER + '(T, R, G)', ctx); } };
  };
  const plain = (x) => JSON.parse(JSON.stringify(x));
  const TAG = 'BACKEND_TECHNICAL_REFRESH_SQUEEZE';

  // THE SHAPE, and what it asks of the dependencies.
  {
    const h = harness();
    const r = h.call([], {}, 'x');
    eq(plain(r), { byTicker: {}, reasonByTicker: {} }, 'with no tickers it returns two EMPTY maps and nothing else…');
    eq(Object.keys(r), ['byTicker', 'reasonByTicker'], '…in that key order…');
    eq(h.rec.rowMapArgs.length, 1, '…having asked the row-map function exactly once…');
    eq(h.rec.stateArgs.length, 0, '…and the squeeze-state function not at all');
    const resp = { rows: {} };
    const h2 = harness();
    h2.call(['A'], resp, 'x');
    ok(h2.rec.rowMapArgs[0] === resp, 'the row map is built from the response OBJECT ITSELF, not a copy of it');
    eq([undefined, null, 0, '', false].map((v) => { const hh = harness(); hh.call([], v, 'x'); return JSON.stringify(hh.rec.rowMapArgs[0]); }), ['{}', '{}', '{}', '{}', '{}'],
      'a missing or falsy response is replaced by a fresh empty object before the row map is built');
    ok(h.call([], {}, 'x') !== h.call([], {}, 'x'), 'every call returns a fresh object, so a caller\'s mutation of one result cannot leak into the next');
    eq([undefined, null, 0, '', false].map((v) => plain(harness().call(v, {}, 'x'))), Array(5).fill({ byTicker: {}, reasonByTicker: {} }),
      'a missing or falsy ticker list is treated as an empty one');
    eq((() => { try { harness().call('AAPL', {}, 'x'); return null; } catch (e) { return e.name; } })(), 'TypeError',
      'while a truthy list that is not an array (a string) THROWS TypeError out of the function: nothing in it catches');
  }

  // THE KEYS: normalised, empty ones skipped, duplicates collapsed.
  {
    const h = harness({ rowMap: () => ({ AAPL: { technical: { '1D': { s: 'ACTIVE' } } } }) });
    eq(Object.keys(plain(h.call([' aapl ', 'AAPL', 'aApL'], {}, 'x').byTicker)), ['AAPL'],
      'tickers are trimmed and upper-cased, and three spellings of one symbol collapse to ONE key');
    eq(plain(harness().call([null, undefined, '', '  ', 0, false], {}, 'x')), { byTicker: {}, reasonByTicker: {} },
      'a null, undefined, empty, blank, zero or false ticker is skipped without a trace — no key, no reason, no dependency call');
    const hh = harness();
    hh.call([null, '', 'zz'], {}, 'x');
    eq(hh.rec.stateArgs.length, 2, 'while a real ticker with no row asks the squeeze-state function twice, once for each timeframe, with null both times…');
    eq(hh.rec.stateArgs, [null, null], '…the empty ones never reaching it');
    eq(Object.keys(hh.call(['b', 'a'], {}, 'x').reasonByTicker), ['B', 'A'], 'keys appear in the order the tickers are given');
  }

  // THE SQUEEZE: precedence, the exact object, and what counts as "present".
  {
    const row = (d1, d4h, extra) => Object.assign({ technical: { '1D': d1, '4H': d4h } }, extra || {});
    const one = (r, resp, tag, state) => {
      const h = harness({ rowMap: () => ({ X: r }), state });
      return plain(h.call(['x'], resp || {}, tag));
    };
    eq(one(row({ s: 'ACTIVE' }, { s: 'OFF' }, { timestamp: 'row-ts' }), { timestamp: 'resp-ts' }, 'T').byTicker.X,
      { timeframe: '1D', timestamp: 'row-ts', source: 'T', squeezeOnly: true, squeeze1d: 'ACTIVE', squeeze4h: 'OFF', squeeze: 'ACTIVE' },
      'with both timeframes present the entry is EXACTLY timeframe 1D, the ROW\'s timestamp, the given source, squeezeOnly, squeeze1d, squeeze4h and squeeze, the aggregate being the 1D value');
    eq(Object.keys(one(row({ s: 'ACTIVE' }, { s: 'OFF' }), {}, 'T').byTicker.X),
      ['timeframe', 'timestamp', 'source', 'squeezeOnly', 'squeeze1d', 'squeeze4h', 'squeeze'], '…the keys in exactly that order');
    eq(one(row({ s: null }, { s: 'OFF' }), {}, 'T').byTicker.X,
      { timeframe: '1D', timestamp: null, source: 'T', squeezeOnly: true, squeeze4h: 'OFF', squeeze: 'OFF' },
      'with only the 4H present the entry has squeeze4h and an aggregate equal to it, no squeeze1d key at all, and a null timestamp when neither row nor response has one');
    eq(one(row({ s: 'ACTIVE' }, { s: null }), { timestamp: 'resp-ts' }, 'T').byTicker.X,
      { timeframe: '1D', timestamp: 'resp-ts', source: 'T', squeezeOnly: true, squeeze1d: 'ACTIVE', squeeze: 'ACTIVE' },
      'with only the 1D present it has squeeze1d and the aggregate, no squeeze4h key, and the RESPONSE\'s timestamp when the row has none');
    eq(one(row({ s: 'ACTIVE' }, null), {}, undefined).byTicker.X.source, TAG, 'an omitted source tag becomes the default BACKEND_TECHNICAL_REFRESH_SQUEEZE…');
    eq(['', null, 0, false].map((t) => one(row({ s: 'ACTIVE' }, null), {}, t).byTicker.X.source), Array(4).fill(TAG), '…as does an empty, null, zero or false one, the test being on truthiness');
    eq(one(row({ s: 'ACTIVE' }, null), {}, 'custom').byTicker.X.source, 'custom', '…and any truthy tag is carried through as it is');
    // WHAT COUNTS AS PRESENT: `!= null`, so false, zero and the empty string are squeezes of their own.
    eq([false, 0, ''].map((v) => one(row({ s: v }, { s: null }), {}, 'T').byTicker.X.squeeze1d), [false, 0, ''],
      'a state of false, 0 or "" is PRESENT — the test is `!= null`, not truthiness — and is carried through unchanged');
    eq([false, 0, ''].map((v) => one(row({ s: v }, { s: 'OFF' }), {}, 'T').byTicker.X.squeeze), [false, 0, ''],
      '…and a falsy 1D state still wins over a present 4H one, the aggregate being the 1D value whenever it is not null or undefined');
    eq(one(row({ s: undefined }, { s: 'OFF' }), {}, 'T').byTicker.X.squeeze, 'OFF', 'while undefined is absent, like null');
    eq(Object.keys(plain(harness({ rowMap: () => ({ X: row({ s: 'A' }, null) }) }).call(['x', 'y'], {}, 'T').byTicker)), ['X'],
      'and only the tickers with a squeeze appear in byTicker');
    // WHICH VALUES ARE HANDED TO THE STATE FUNCTION: the 1D then the 4H node of the row\'s technical object.
    const d1 = { s: 'A' }, d4 = { s: 'B' };
    const hh = harness({ rowMap: () => ({ X: row(d1, d4) }) });
    hh.call(['x'], {}, 'T');
    ok(hh.rec.stateArgs.length === 2 && hh.rec.stateArgs[0] === d1 && hh.rec.stateArgs[1] === d4,
      'the squeeze-state function is asked for the 1D node and then the 4H node, the very objects the row holds');
    {
      const stateArgsFor = (r) => { const h3 = harness({ rowMap: () => ({ X: r }) }); h3.call(['x'], {}, 'T'); return h3.rec.stateArgs; };
      eq([{ technical: 'text' }, { technical: null }, { technical: 5 }, {}].map(stateArgsFor), Array(4).fill([null, null]),
        'a row whose `technical` is a string, null, a number or missing is treated as having none: both nodes are null');
      eq(stateArgsFor({ technical: { '1D': { s: 1 } } }), [{ s: 1 }, undefined], '…while a row with an object `technical` that has only a 1D node asks for that node and then UNDEFINED for the missing 4H, the null being only for a `technical` that is not an object');
      ok(Array.isArray(stateArgsFor({ technical: [] })) && stateArgsFor({ technical: [] }).every((x) => x === undefined),
        'and an ARRAY counts as an object — `typeof` is all the test looks at — so its missing nodes are undefined, not null');
    }
  }

  // THE REASON, in the order the block tries them, for a row that carried no squeeze.
  {
    const reasonFor = (row, resp) => {
      const h = harness({ rowMap: () => ({ X: row }), state: () => null });
      return h.call(['x'], resp || {}, 'T').reasonByTicker.X;
    };
    eq(reasonFor({ technical: {}, oneDReason: 'R1', reason: 'R2', oneDStatus: 'unavailable' }), 'R1', 'the first reason is the row\'s oneDReason…');
    eq(reasonFor({ technical: {}, reason: 'R2', oneDStatus: 'unavailable' }), 'R2', '…then its `reason`…');
    eq(reasonFor({ technical: {}, candleDiagnostics: { '1D': { candleMissingReason: 'R3' } }, oneDStatus: 'unavailable' }, { candleDiagnostics: { X: { '1D': { candleMissingReason: 'R3r' } } } }),
      'R3r', '…then the candleMissingReason of the RESPONSE\'s diagnostics for that ticker, which wins over the row\'s own diagnostics…');
    eq(reasonFor({ technical: {}, candleDiagnostics: { '1D': { candleMissingReason: 'R3' } }, oneDStatus: 'unavailable' }), 'R3', '…which in turn win over the status…');
    eq(reasonFor({ technical: {}, oneDStatus: 'unavailable' }), 'no_1d_candles', '…then `no_1d_candles` for a status of unavailable…');
    eq(reasonFor({ technical: {}, oneDStatus: 'partial' }), 'insufficient_candles', '…`insufficient_candles` for partial…');
    eq(reasonFor({ technical: { '1D': {} } }), 'squeeze_unavailable', '…`squeeze_unavailable` when there is a 1D node that carried no squeeze…');
    eq(reasonFor({ technical: {} }), 'no_1d_candles', '…and `no_1d_candles` when there is not');
    eq(reasonFor({ technical: { '1D': {} }, oneDStatus: 'ready' }), 'squeeze_unavailable', 'an unrecognised status falls through to the last rule');
    eq(reasonFor({ technical: {}, oneDReason: '', reason: 0, candleDiagnostics: { '1D': { candleMissingReason: '' } } }), 'no_1d_candles', 'and falsy reasons of every kind fall through too');
    eq(reasonFor({ technical: {} }, { candleDiagnostics: { Y: { '1D': { candleMissingReason: 'other' } } } }), 'no_1d_candles', 'a diagnostic for a DIFFERENT ticker is ignored');
    eq(reasonFor({ technical: {} }, { candleDiagnostics: { X: {} } }), 'no_1d_candles', 'and so is a diagnostic with no 1D entry');
    // NO ROW AT ALL.
    const noRow = (resp) => harness({ rowMap: () => ({}), state: () => null }).call(['x'], resp, 'T');
    eq(plain(noRow({ reasons: { X: 'cold_store' } })), { byTicker: {}, reasonByTicker: { X: 'cold_store' } }, 'with no row for the ticker the reason is the response\'s own reasons entry…');
    eq(plain(noRow({ reasons: {} })).reasonByTicker.X, 'no_1d_candles', '…or `no_1d_candles` when it has none…');
    eq([{ reasons: { X: '' } }, { reasons: { X: null } }, {}, undefined].map((r) => plain(noRow(r)).reasonByTicker.X), Array(4).fill('no_1d_candles'),
      '…which an empty or null entry, a missing map or a missing response all lead to');
    const hh = harness({ rowMap: () => ({}), state: () => null });
    hh.call(['x'], {}, 'T');
    eq(hh.rec.stateArgs, [null, null], 'the squeeze-state function is still asked twice, with null, for a ticker with no row');
    eq(plain(harness({ rowMap: () => ({ X: 0 }), state: () => null }).call(['x'], {}, 'T')).reasonByTicker.X, 'no_1d_candles', 'and a falsy row counts as no row');
  }

  // NOTHING IS WRITTEN: the response, the tickers, the row and the nodes are watched for any write.
  {
    const writes = [];
    const watch = (o, name) => new Proxy(o, {
      set(t, k, v) { writes.push([name, 'set', String(k)]); t[k] = v; return true; },
      defineProperty(t, k, d) { writes.push([name, 'define', String(k)]); return Reflect.defineProperty(t, k, d); },
      deleteProperty(t, k) { writes.push([name, 'delete', String(k)]); return delete t[k]; },
    });
    const d1 = watch({ s: 'ACTIVE' }, 'd1'), d4 = watch({ s: 'OFF' }, 'd4h');
    const row = watch({ technical: watch({ '1D': d1, '4H': d4 }, 'technical'), timestamp: 't' }, 'row');
    const resp = watch({ timestamp: 'r', rows: { X: row }, reasons: watch({}, 'reasons') }, 'response');
    const tickers = watch(['x', ' y '], 'tickers');
    const h = harness();
    const out = h.call(tickers, resp, 'T');
    eq(Object.keys(plain(out.byTicker)), ['X'], 'with the response, the tickers, the row and both nodes watched, a full call produces its result…');
    eq(writes, [], '…and records NO write to any of them: the block reads its inputs and builds its own two objects');
    eq(Object.getOwnPropertyNames(h.ctx).sort(), ['T', 'G', 'R', OWNER, '_portfolioTechnicalRowMapFromResponse', '_technicalTfSqueezeState'].sort(),
      'and it defines no global in the VM it runs in beyond the ones the harness itself set');
  }

  // THE REAL DEPENDENCIES, end to end: the two monolith functions and the module that holds the squeeze-state helper they call.
  {
    const ctx = vm.createContext(Object.create(null));
    const squeezeModule = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-stale-mark-squeeze-state.js'), 'utf8');
    vm.runInContext(squeezeModule, ctx);
    for (const [name] of DEPENDENCY_DECLS) { const d = BY_NAME.get(name); vm.runInContext(CODE.slice(d.start, d.end + 1), ctx); }
    vm.runInContext(MODULE, ctx);
    const run = (tickers, resp, tag) => { ctx.T = tickers; ctx.R = resp; ctx.G = tag; return plain(vm.runInContext(OWNER + '(T, R, G)', ctx)); };
    const state = (tf) => { ctx.F = tf; return vm.runInContext('_technicalTfSqueezeState(F)', ctx); };
    const resp = { technicalsBySymbol: { aapl: { technical: { '1D': { squeeze: true }, '4H': { sqz: false } }, timestamp: 'ts1' } } };
    eq(run(['AAPL'], resp, 'T').byTicker.AAPL,
      { timeframe: '1D', timestamp: 'ts1', source: 'T', squeezeOnly: true, squeeze1d: state({ squeeze: true }), squeeze4h: state({ sqz: false }), squeeze: state({ squeeze: true }) },
      'with the REAL helpers the 1D and 4H states are exactly what `_technicalTfSqueezeState` answers for the same nodes, the aliases `squeeze` and `sqz` included');
    ok(state({ squeeze: true }) !== null && state({ sqz: false }) !== null, '…both of them present, so the entry above is not an empty comparison');
    const shapes = [
      ['technicalsBySymbol map', { technicalsBySymbol: { AAPL: { technical: { '1D': { squeeze: true } } } } }],
      ['technicals map', { technicals: { AAPL: { technical: { '1D': { squeeze: true } } } } }],
      ['technicals array', { technicals: [{ symbol: 'aapl', technical: { '1D': { squeeze: true } } }] }],
      ['symbols array', { symbols: [{ ticker: 'AAPL', technical: { '1D': { squeeze: true } } }] }],
    ];
    eq(shapes.map(([, r]) => run(['AAPL'], r, 'T').byTicker.AAPL.squeeze1d), Array(4).fill(state({ squeeze: true })),
      'and the row can come from any of the four places the row-map function reads — a map by symbol, a technicals map, a technicals array, a symbols array — with the same result');
    eq(run(['AAPL'], {}, 'T'), { byTicker: {}, reasonByTicker: { AAPL: 'no_1d_candles' } }, 'while an empty response gives the explicit no_1d_candles reason, never a silent gap');
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
  // it pins. This contract pins two monolith functions, so it is among them.
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
  eq(MONOLITH_DEPENDENCIES.length, 2, '…it pinning the non-empty list of its two monolith functions, which is why the count moved, as the audit forecast…');
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
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-beta-missing-reason.js', 'js/services/option-chain-error-helpers.js'].sort(),
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
    '…with the declaration, DECL_FIRST_LINE, at exactly DOC_TAKEN units in, after the ten comment lines');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * EM_DASHES,
    '…its UTF-8 length longer than its UTF-16 length by two bytes for each em dash…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…of which it holds NON_ASCII_CHARS…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…EM_DASHES of them em dashes, the whole of the non-ASCII…');
  ok(MODULE.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => l.trim().startsWith('//')),
    '…every one inside a comment line, so the move keeps prose and no markup');
}
// THE TAG'S POSITION. Nothing here shows the load order to be load-bearing (§3 says what it does not measure),
// and it is pinned all the same: last of the local scripts, immediately before the inline monolith, whose
// consumer stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/portfolio/portfolio-regime-badge-html.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumer calls it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES THE FUNCTION, at the one consumer site and nowhere else: the block's own
  // text left, the call did not.
  eq(refSites(LIVE_INDEX, OWNER).length, CONSUMER_SITES,
    '…while the shipped document names ' + OWNER + ' at the CONSUMER_SITES call that stayed…');
  eq(refSites(MASKED, OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, CONSUMER_SITES,
    '…the same CONSUMER_SITES the reconstructed base held from outside the block…');
  // No sibling names it: the count over every OTHER local script is zero, and the control is that the
  // module itself, counted by the same function, DOES name it — so the zero is a measurement.
  eq(refSites(MODULE, OWNER).length, 1, 'control — the same count over the module itself finds its one declaration…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t2, rel) =>
    t2 + refSites(fs.readFileSync(path.join(ROOT, rel), 'utf8'), OWNER).length, 0), 0,
  '…and not one other local script names the function');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its one owner and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => MONOLITH_DEPENDENCIES.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    MONOLITH_DEPENDENCIES.slice().sort(), '…and so do both of the functions the module reads at call time');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMERS.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    CONSUMERS.slice().sort(), '…and its consumer, which calls the module\'s function');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, stays too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the brace of the owner above, one blank line and the comment block of ' + NEXT_DECL + ', once…');
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
  const E = 'PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_';
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 2,922 units, not 2,921 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('reasonByTicker', 'reasonByTickex');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoPortfolioBackendSqueezeExtract(INDEX, MODULE),
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/portfolio-backend-squeeze-extract-undo.js'),
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
console.log('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_CONTRACT_OK');
}

main();
