'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// AI SCAN CONTEXT — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [628563,630103) in monolith coordinates — 1,541 units raw and
// 1,540 of body, TWO owners, synchronous — now lives in js/services/ai-scan-context.js.
// `scanCtx(limit)` turns the first rows of the scan results, six when no limit is given,
// into the lines of the prompt the chat sends to the model; `tickerCtx(ticker)` does the
// same, at full width, for one ticker. Each notes an upcoming earnings date and flags it
// when it falls within 45 days. Both read `S.scanData` and nothing else of the monolith,
// and only when they are called. Neither owner has a comment line, and each is ONE line
// of source; the block opens on the declaration of the first, directly under the one-line
// declaration of `rulesCtx`, which stayed behind, and the blank line AFTER the block, in
// front of `async function sendMsg`, stayed behind as the separator.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #522 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: TWO ROWS TIED AT THE BEST SCORE, AND THE KEY ORDERED ─
// ── THEM BY LENGTH ──────────────────────────────────────────────────────────────
//
// The contract before this layer published this block as the first of its four runners-up,
// with a single function in the parity code second. Measured again on the base that cut
// left, the two still tied at (byConsumerSplit, raw nine) = (3, 5), and they were not the
// same place with and without a neighbour: this block has two consumers, one dependency
// and no sibling reference; the other row is one function with a different dependency in a
// different place. The published ranking key (byConsumerSplit, raw nine, units ascending)
// put this block first by LENGTH ALONE, 1,540 units against 2,252, and the audit said so
// rather than presenting a margin that was not there. Behind the tie the next lowest raw
// nine at the best score was 8, so the pair was clear of every other row. §4 pins both rows
// in full and counts no row below 3 over the screen and the pass together.
//
// ── PART TWO: THE FLOOR WAS CLEARED NARROWLY, AND BY THE SCREEN ITSELF ──────────
//
// The block is 1,540 units, 40 over the 1,500 floor. Neither owner has documentation, so
// the screen measured it from its declaration and from the cut alike, and it was a row of
// the screen proper: the pass over sub-floor runs held nothing for it. Each owner ALONE is
// smaller still. The first alone is not a run at all, since the seam rule refuses it for
// want of a blank line between it and the second; the second alone is 864 units with a raw
// nine of 3, under the floor. §5 prices both.
//
// ── PART THREE: FOUR CALLS FROM TWO CONSUMERS, AND ONE DEPENDENCY ───────────────
//
// The raw nine is 5, all of it inbound and one dependency: four call sites and `S`. The two
// consumers, `sendMsg` and `orchestratedAnalysis`, each call BOTH functions, `scanCtx()` with
// no argument and `tickerCtx` with a ticker, so the pair travels together. The block writes no
// monolith name, deletes nothing, has no reference from a shipped module and touches the host
// through none of window, document, storage, console, timers or fetch; it uses the language's
// own `Date` and `Math`. Its one em dash is in CODE, inside the string literal `tickerCtx`
// returns for a flagged earnings date, which makes the encoding of the file part of what the
// move must preserve.
//
// ── PART FOUR: WHAT THE LOAD ORDER DEPENDS ON, AND WHAT IS NOT MEASURED ─────────
//
// `S` is a `const` at the top of the monolith, a global lexical binding which a later classic
// script reads by name, and the block reads it only inside its function bodies. All four sites
// are inside function bodies too. §3 measures where the sites are. It does NOT measure what
// calls `sendMsg` or `orchestratedAnalysis`, so it does not show that neither runs while the
// monolith is being evaluated. The tag sits directly in front of the inline monolith, which
// makes the question moot rather than answered here; §9 pins that position.
//
// ── PART FIVE: ONE OPENING WAS LEGAL ────────────────────────────────────────────
//
// The seam rule admitted ONE line start between the owner above and the first declaration, the
// declaration itself: there was no comment line and no blank line in between, so there was no
// opening to weigh. What the cut left is the closing brace of `rulesCtx` directly against `async
// function sendMsg`, a join the monolith held nowhere before the cut but of a shape it held
// eighteen times already; §2 counts both.
//
// ── PART SIX: IT IS NOT THE FIRST OWNER OF ITS REGION, AND THE CUT TOOK NO ────
// ── BANNER ──────────────────────────────────────────────────────────────────────
//
// The block is owners number 9 and 10 of 11 in the `CHAT` region. §5 prices EVERY owner above and
// the one below as the cut extended to the end of that owner: of the eight above, one ties on
// byConsumerSplit and is worse on the raw nine, and seven are worse on both; the one below is the
// block's own first consumer, so extending the cut downward would have taken a caller along. The
// cut took no banner, so the document's top-level banners and owner regions did not move.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED ON THE SHIPPED MODULE ───────────────
//
// §7 loads the SHIPPED MODULE in a VM with nothing defined, shows that it loads there and that
// calling either function raises ReferenceError for `S`, then drives both through a state object
// that records every access: the empty cases, the full line written out literally, the limit and
// its fallbacks, the earnings note with its 45-day boundary, its rounding, a date that does not
// parse and every falsy value, the Bollinger bounds and their truthiness fallback, the IVR and beta
// tail of the second function, and which row a ticker finds. It pins two quirks without fixing them:
// a negative limit counts from the end of the list, and a string IVR throws from `toFixed`.
//
// ── PRICED, AND WHERE IT SITS ──────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-four layers the chain now holds: it is the smallest, 19
// units under the layer that was smallest before it, which §8 measures against every layer rather
// than asserting. Its body holds one non-ASCII character, in a string literal, so it is not pure
// ASCII and the pure-ASCII count did not move; it does not open on a `// ── ` banner, so the banner
// count did not move either; and it pins a NON-EMPTY monolith dependency list, `S`, so the count of
// layers that pin a non-empty one DID move, by one. §8 measures all three.
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
const UNDO = require('./lib/ai-scan-context-undo.js');
const SWING_TREND_CONTEXT_U = require('./lib/swing-trend-context-undo.js');
const APEX_PARITY_COMPARE_U = require('./lib/apex-parity-compare-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/services/ai-scan-context.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = 'aa76d50';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = 'bbe841d';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = '6c463df';
const BASE_CHARS = 1415705;
const BASE_UTF8 = 1444072;
const BASE_LF = 24433;
const BASE_SHA256 = '8b550d8a4d6b7cd583276eacb5f156aa169321a1f6e02eb96573034aa1ed7215';
const LOCAL_SCRIPTS = 107;
const TEST_FILE_COUNT = 194;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-ai-scan-context-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/ai-scan-context-audit.spec.js';
const CONTRACT_REL = 'tests/ai-scan-context-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/ai-scan-context-contract.spec.js';
const UNDO_REL = 'tests/lib/ai-scan-context-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = '6c463df';
const CONTRACT_SPEC_MUTANTS = 227;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 56;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/option-chain-error-helpers-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 223;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/ai-scan-context-audit.spec.js';
const RETIRED_MUTANTS = 217;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116510;
const CODE_CHARS = 1299169;
const TOP_LEVEL_DECLS = 884;
const OWNER_REGIONS = 114;

// ── The region ───────────────────────────────────────────────────────────────
// It opened on the declaration of the first function: neither owner has a comment line above it, and the line
// above the block was the one-line declaration of `rulesCtx`, with NO blank line between. The blank line AFTER
// the block, in front of `async function sendMsg`, was the structural separator.
const RAW_AT_IN_CODE = 628563;
const DECL_AT_IN_CODE = 628563;
const RAW_END_IN_CODE = 630104;
const BODY_END_IN_CODE = 630103;
const RAW_CHARS = 1541;
const BODY_CHARS = 1540;
const BODY_UTF8 = 1542;
const BODY_LF = 2;
const BODY_SHA256 = 'c942a06b30dc2306ceb53fa7cf27574366ca5e241d6acdb04d097f8905a05e17';
const BODY_ENDING = '}\n';
const DECL_FIRST_LINE_PREFIX = 'function scanCtx(limit){limit=limit||6;';
const SECOND_FIRST_LINE_PREFIX = 'function tickerCtx(ticker){var d=S.scanData.find(';
const EM_DASHES = 1;
const NON_ASCII_CHARS = 1;
const NEXT_DECL = 'sendMsg';

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['scanCtx', 'tickerCtx'];
const OWNER_SIZES = [675, 863];
const OWNER = 'scanCtx';
const OWNER_LAST = 'tickerCtx';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 2;
const CODE_LINES = 2;
const COMMENT_LINES = 0;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam admits ─────────────────────
const OWNER_BEFORE = 'rulesCtx';
const SEAM_LEGAL_OPENINGS = 1;
const PARSING_OPENINGS = 1;
const MID_LINE_OPENING = 628562;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const CANDIDATES_AT_DECLARATION = 1;
// What the cut left behind: the closing brace of `rulesCtx` directly against the next function, with no blank
// line between, a join the monolith already held elsewhere; and what it removed: the join of that brace against
// the first owner, which existed only here.
const JOIN_AFTER_CUT_PREFIX = '}\nasync function ';
const JOIN_AFTER_CUT = '}\nasync function sendMsg';
const JOIN_BEFORE_CUT = '}\nfunction scanCtx';
const JOINS_LIKE_THE_CUT_BEFORE = 18;

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 626129;
const REGION_END = 633618;
const REGION_CHARS = 7489;
const REGION_OWNERS = 11;
const OWNER_POSITION = 9;
const BANNER_LINE_PREFIX = '// ═';
const WHOLE_REGION_NINE = 48;
const WHOLE_REGION_BCS = 27;
const WHOLE_REGION_CONSUMERS = 3;
const WHOLE_REGION_DEPS = 5;
const WHOLE_REGION_SIB = 16;
// THE CUT TAKES NO BANNER, so the document's top-level banners and owner regions do not move.
const BANNER_MARKS = 215;

// ── Taking more, priced: the owners above; the owner below ───────────────────
// Above: EIGHT owners stand above the cut in its region. Each row is the cut extended UP to
// the start of that owner's documentation: [name, opening, units, raw nine, byConsumerSplit,
// monolith dependencies, runs nothing at load].
const EXTENSIONS_UP = [
  ['rulesCtx', 628451, 1652, 8, 3, 1, true],
  ['quickAsk', 628374, 1729, 16, 6, 2, true],
  ['hk', 628294, 1809, 17, 7, 2, true],
  ['removeEl', 628220, 1883, 18, 7, 2, true],
  ['appendTyping', 627726, 2377, 20, 8, 3, true],
  ['appendSysMsg', 627378, 2725, 39, 14, 3, true],
  ['appendAgentMsg', 626727, 3376, 59, 24, 3, true],
  ['appendMsg', 626129, 3974, 60, 24, 3, true],
];
const OWNERS_ABOVE = 8;
// Below: ONE owner stays in the region and is pinned in full, as
// [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['sendMsg', 633617, 5054, 17, 16, 11],
];
const OWNERS_BELOW = 1;
const UP_LEGAL = 8;
const UP_TIES = 0;
const UP_TIES_BCS = 1;
const UP_WORSE = 7;
const UP_NOT_CLEAN = 0;
const DOWN_LEGAL = 1;
const DOWN_REFUSED = 0;
const DOWN_WORSE = 1;
const DOWN_TIES_BCS = 0;
const DOWN_NOT_CLEAN = 0;
// THE THREE RUNS the two owners make: each owner alone, and the pair, which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites], or, for a run the seam rule refuses,
// [first owner, last owner, opening, closing, units of body, 'REFUSED', the refusal].
const OWN_RUNS = [
  ['scanCtx', 'scanCtx', 628563, 629239, 676, 'REFUSED', 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR'],
  ['scanCtx', 'tickerCtx', 628563, 630103, 1540, 5, 3, ['S'], 4],
  ['tickerCtx', 'tickerCtx', 629239, 630103, 864, 3, 3, ['S'], 2],
];
const OWN_RUNS_LEGAL = 2;
const OWN_RUNS_REFUSED = 1;
const OWN_RUNS_UNDER_FLOOR = 2;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 5;
const BY_CONSUMER = 3;
const BY_CONSUMER_SPLIT = 3;
const CONSUMERS = ['orchestratedAnalysis', 'sendMsg'];
const CONSUMER_SITES = 4;
const CONSUMER_SITES_AT = [632410, 632449, 635340, 637631];
// What each of the four sites is: [site, the call as written]. Two consumers, each calling both functions.
const CALL_ARGS = [
  [632410, 'scanCtx()'],
  [632449, 'tickerCtx(tm)'],
  [635340, 'tickerCtx(ticker)'],
  [637631, 'scanCtx()'],
];
// [site, host, start, end, chars of the INNERMOST function body that holds it].
const SITE_BODIES = [
  [632410, 'sendMsg', 630128, 633615, 3487],
  [632449, 'sendMsg', 630128, 633615, 3487],
  [635340, 'orchestratedAnalysis', 635010, 637921, 2911],
  [637631, 'orchestratedAnalysis', 635010, 637921, 2911],
];
// [name, start, end, chars] of each declared consumer.
const CONSUMER_DECLS = [
  ['sendMsg', 630104, 633615, 3512],
  ['orchestratedAnalysis', 634967, 637921, 2955],
];
const MONOLITH_DEPENDENCIES = ['S'];
// [name, start, end, chars] of each monolith dependency.
const DEPENDENCY_DECLS = [
  ['S', 1067, 3597, 2531],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 4;
const OUTBOUND_MODULE_REFERENCES = 0;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// The reads of `S` inside the block: the property each names, in source order.
const STATE_READS = ['scanData', 'scanData', 'scanData'];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['scanCtx', 'tickerCtx'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7095;
const SEAM_REJECTED = 2081;
const CANDIDATES = 2760;
const CLEAN_CANDIDATES = 1656;
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
const ROWS_AT_THREE = 7;
const ROWS_AT_THREE_SCREEN = 7;
const ROWS_AT_THREE_HIDDEN = 0;
const LOWEST_NINE_AT_THREE = 5;
// THE ROWS AT (byConsumerSplit, raw nine) = (3, 5), pinned in full, in the order the published key puts them:
// [opening, closing, units, consumers, monolith dependencies].
const TIED_AT_BEST = [
  [628563, 630103, 1540, 2, 1],
  [1176467, 1178719, 2252, 2, 1],
];
// The best four OTHER openings over the screen and the hidden pass together,
// as [opening, byConsumerSplit, raw nine, units], by the published key.
const RUNNERS_UP = [
  [1176467, 3, 5, 2252],
  [388872, 3, 8, 1614],
  [1180310, 3, 8, 1671],
  [1180166, 3, 8, 1815],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
// They are NEGATIVE, because that cut took no banner and its region lost two owners, and a region of fewer
// owners makes fewer runs.
const DELTA_RAW_RUNS = -27;
const DELTA_SEAM_REJECTED = -10;
const DELTA_CANDIDATES = -13;
const DELTA_CLEAN = -13;
const PREVIOUS_RAW_CHARS = 1709;
const PREVIOUS_RAW_AT = 930261;
// The previous contract's published list, in the coordinates of the document BEFORE the cut that
// shipped, which sat below this block.
const PREVIOUS_RUNNERS_UP = [
  [628563, 3, 5, 1540],
  [1178176, 3, 5, 2252],
  [388872, 3, 8, 1614],
  [628451, 3, 8, 1652],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. SMALLEST_LAYER_CHARS is the layer that was smallest BEFORE this one.
const CHAIN_LENGTH = 64;
const SMALLEST_LAYER_CHARS = 1559;
const SIZE_RANK = 1;
const LAYERS_SMALLER_THAN_THIS_CUT = 0;
const LAYERS_LARGER_THAN_THIS_CUT = 63;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 8;
const PRIOR_LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_BANNER = 26;
const PRIOR_LAYERS_OPENING_ON_WIDE_BANNER = 29;
const LAYERS_OPENING_ON_WIDE_BANNER = 29;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 26;
const LAYERS_WITH_A_DEPENDENCY = 27;
// The count above is the figure AT THIS LAYER. The later layer that pins a NON-EMPTY list
// instead IS among the contracts counted over the suite, and is set aside to recover the
// figure at this layer rather than left to make it drift.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['apex-parity-compare-boundary-contract.test.js', 'swing-trend-context-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1484;
const INDEX_AFTER = 1414221;
const RESIDUAL_MONOLITH = 1297628;
const LOCAL_SCRIPTS_AFTER = 108;
// The tag's position among the local scripts, zero-based: the last of 108.
const TAG_LOCAL_INDEX = 107;
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


console.log('AI SCAN CONTEXT — PERMANENT BOUNDARY CONTRACT');
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
const LIVE_INDEX = APEX_PARITY_COMPARE_U.isApplied(PRE_SWING_TREND_CONTEXT)
  ? APEX_PARITY_COMPARE_U.undoApexParityCompare(
      PRE_SWING_TREND_CONTEXT, fs.readFileSync(path.join(ROOT, 'js/services/apex-parity-compare.js'), 'utf8'))
  : PRE_SWING_TREND_CONTEXT;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoAiScanContext(LIVE_INDEX, MODULE);

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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the option-chain error
// helpers predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the one opening the seam admits');
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
ok(BODY.startsWith(DECL_FIRST_LINE_PREFIX), '…and opening on the declaration of ' + OWNER + ', with no documentation above it: DECL_FIRST_LINE_PREFIX');
eq(BODY.split('\n')[1].slice(0, SECOND_FIRST_LINE_PREFIX.length), SECOND_FIRST_LINE_PREFIX, '…its second line the declaration of ' + OWNER_LAST + ', SECOND_FIRST_LINE_PREFIX');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dash…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII character in all, the em dash being the whole of them…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * EM_DASHES,
  '…three bytes in UTF-8 for an em dash and one UTF-16 unit, which is the whole of the gap between its UTF-8 and UTF-16 lengths');
// THE EM DASH IS IN CODE, not in a comment: it is inside a string literal the second function RETURNS, into a prompt.
ok(BODY.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => !l.trim().startsWith('//')),
  '…and unlike a character in a comment, it is on a line of CODE…');
eq((maskLiterals(BODY).match(/[^\x00-\x7F]/g) || []).length, 0,
  '…inside a string literal, since the literal-masked text holds no non-ASCII at all: it is part of the text the model is sent, so a move that mangled the encoding would change the prompt…');
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

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT, and here it leaves almost no choice: the owner above ends on its
// closing brace and the first function of the block begins on the very next line, so there is ONE line start
// between them. No comment line and no blank line stands in between, so there is no opening to weigh.
const OPENINGS = [];
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  eq(prevOwner.name, OWNER_BEFORE, 'the owner before the cut is OWNER_BEFORE…');
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    '…and SEAM_LEGAL_OPENINGS line start between it and the first declaration is accepted…');
  eq(OPENINGS[0], RAW_AT_IN_CODE, '…the declaration itself, which is the cut');
  eq(DECL_AT_IN_CODE, RAW_AT_IN_CODE, '…the declaration and the opening being the same position: the block has no documentation to take');
  eq(CODE.slice(prevOwner.end + 1, RAW_AT_IN_CODE), '\n',
    '…the closing brace of ' + OWNER_BEFORE + ' followed by nothing but the newline that ends its line: NO blank line and NO comment line sits between that owner and this block…');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    '…and the position of that newline, one unit short of the cut, starts mid-line and is refused with its own error');
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…and the one opening parses as a standalone script, which is what loading it would do: PARSING_OPENINGS of the SEAM_LEGAL_OPENINGS');
}

// WHAT THE CUT TOOK is two lines and no documentation: neither function has a comment line above it, and the
// programme's blockAbove rule agrees.
{
  eq(blockAbove(BY_NAME.get(OWNER)), null, 'the programme\'s blockAbove rule finds NO comment block above ' + OWNER + '…');
  eq(blockAbove(BY_NAME.get(OWNER_LAST)), null, '…nor above ' + OWNER_LAST + ' …');
  eq(BODY.split('\n').filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES, '…and the body holds COMMENT_LINES comment lines in all…');
  const first = BY_NAME.get(OWNER), second = BY_NAME.get(OWNER_LAST);
  eq(CODE.slice(first.end + 1, second.start), '\n',
    '…the two functions separated by exactly the newline that ends the first one\'s line: they are ADJACENT LINES, with no blank line between them…');
  eq(first.end + 1 - first.start + 1 + (second.end + 1 - second.start) + 1, BODY_CHARS,
    '…so the body is the two lines and their two newlines, and nothing else');
}
// WHAT THE CUT LEFT. The brace of the owner above directly against the next function: a join of a shape the monolith already held.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 0, 'the monolith holds the join `}` newline `async function ' + NEXT_DECL + '` NOWHERE before the cut, a block and a blank line standing between them…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 2, '…at the closing brace of ' + OWNER_BEFORE + ', where the cut was made…');
  eq(count(CODE, JOIN_AFTER_CUT_PREFIX), JOINS_LIKE_THE_CUT_BEFORE,
    '…but a closing brace directly against an async function is a shape the document held JOINS_LIKE_THE_CUT_BEFORE times already, so the cut added a join of a kind it had…');
  eq(count(atCut, JOIN_AFTER_CUT_PREFIX), JOINS_LIKE_THE_CUT_BEFORE + 1, '…one more after the cut');
  eq(count(CODE, JOIN_BEFORE_CUT), 1, 'while the join of that brace against THIS block exists once, at the cut…');
  eq(count(atCut, JOIN_BEFORE_CUT), 0, '…and is gone after it, leaving with the block');
  ok(atCut.indexOf('function ' + OWNER + '(') < 0 && atCut.indexOf('function ' + OWNER_LAST + '(') < 0,
    '…and neither declaration is left behind');
  ok(atCut.indexOf('function ' + OWNER_BEFORE + '(') >= 0 && CODE.slice(0, RAW_AT_IN_CODE).endsWith('}\n'),
    '…while ' + OWNER_BEFORE + ' stays in the monolith, the line above the cut ending on its closing brace');
  ok(!CODE.slice(BY_NAME.get(OWNER_BEFORE).start, BY_NAME.get(OWNER_BEFORE).end + 1).includes('\n'),
    '…that owner a ONE-line declaration too, so the block sits directly under one line of source and not under the tail of a longer function');
}
// THE FLOOR IS CLEARED NARROWLY, AND BY THE SCREEN ITSELF. The block is not the first owner of its region, but it has no
// documentation, so the screen measures it from the declaration and from the cut alike: the same BODY_CHARS units.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, BODY_CHARS, 'measured from the declaration the run is BODY_CHARS units, the same as from the cut…');
ok(BODY_CHARS >= RUN_FLOOR, '…at or over RUN_FLOOR…');
eq(BODY_CHARS - RUN_FLOOR, 40, '…by 40 units, a margin of under three percent, so it is the screen\'s own row and not one the pass over sub-floor runs had to recover');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, CANDIDATES_AT_DECLARATION,
  '…and the screen enumerates CANDIDATES_AT_DECLARATION run that opens and closes where this cut does');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 0,
  '…while the pass over sub-floor runs holds no row for it, having nothing to re-measure');
// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: two consumers, four call sites, one dependency read at call time, no module reference');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these two names');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names, in that order');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…both declared functions, so this layer ships no mutable binding');
  ok(own.every((d) => !d.isAsync), '…SYNCHRONOUS');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, OWNER_COUNT + 2,
    '…with exactly TWO function expressions inside them besides the owners, the `map` callback of the first and the `find` callback of the second, both anonymous and both called synchronously by the array method…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the two owners');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one, among them the reference from a shipped module: no module names either function');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from the monolith outside the block…');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: ONE monolith binding, `S`');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: four inbound references and one dependency');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER: two consumers and one dependency');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'TWO consumers reach in from the monolith: CONSUMERS');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const outside = (at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE;
  eq(refSites(MASKED, OWNER).filter(outside), [CONSUMER_SITES_AT[0], CONSUMER_SITES_AT[3]],
    'two of those references are to the FIRST owner, ' + OWNER + ', one in each consumer…');
  eq(refSites(MASKED, OWNER_LAST).filter(outside), [CONSUMER_SITES_AT[1], CONSUMER_SITES_AT[2]],
    '…and the other two to the SECOND, ' + OWNER_LAST + ', one in each consumer as well: the two functions are always called together, from the same two places…');
  // WHAT EACH OF THE FOUR SITES IS, as written: a plain call. The match runs to the closing parenthesis, so a call text
  // that was a PREFIX of the real one cannot pass.
  eq(CALL_ARGS.map(([at]) => at), CONSUMER_SITES_AT, 'CALL_ARGS pins the same four sites…');
  eq(CALL_ARGS.map(([at]) => CODE.slice(at).match(/^[A-Za-z]+\([A-Za-z]*\)/)[0]), CALL_ARGS.map(([, text]) => text),
    '…and the call written at each is exactly the pinned text, matched through its closing parenthesis: `scanCtx()` takes no argument, so its `limit` is never passed and its default of six is the only one the program uses; `tickerCtx` is given the ticker');
  eq(CALL_ARGS.map(([at, text]) => CODE[at + text.length]), ['+', ':', ',', '\n'],
    '…each followed by the character that ends the call in its expression, so no pinned text is a prefix of a longer call');
  eq(refSites(STRINGS, OWNER).concat(refSites(STRINGS, OWNER_LAST)).filter(outside).length, 0,
    '…and neither name appears in any string or generated markup outside the block');
  eq(count(STATIC_MARKUP, OWNER) + count(STATIC_MARKUP, OWNER_LAST), 0, '…nor in the static markup, so no inline handler names either');
  eq([SIB_REFS.get(OWNER), SIB_REFS.get(OWNER_LAST)], [{ n: 0, who: [] }, { n: 0, who: [] }],
    '…and no shipped module names either, so the chain of layers already extracted does not reach the block');
}
// WHERE EACH SITE IS: which host holds it, and the INNERMOST function body around it.
{
  const innermost = (at) => FN_BODIES.filter((r) => at >= r.start && at <= r.end).sort((a, b) => b.start - a.start)[0];
  eq(REC.sites.map((at) => { const b = innermost(at); return [at, (hostOf(at) || { name: '(TOP LEVEL)' }).name, b.start, b.end, b.end - b.start]; }),
    SITE_BODIES, 'the four sites are in SITE_BODIES: the host, and the innermost function body around each');
  ok(REC.sites.every((at) => insideFunction(at)),
    '…all INSIDE a function body, so none is a statement the monolith evaluates as it loads…');
  for (const [name, start, end, chars] of CONSUMER_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function opening at ' + start + ', ' + chars + ' units long');
    ok(d.start >= RAW_END_IN_CODE, '…outside the block, after it');
    ok(/^async function /.test(firstLineOf(CODE.slice(d.start))), '…an ASYNC function…');
  }
  eq(CONSUMER_DECLS[0][1], RAW_END_IN_CODE, 'the first consumer, ' + NEXT_DECL + ', begins exactly where the cut ends…');
  eq(CONSUMER_DECLS.map((c) => REC.sites.filter((at) => at > c[1] && at < c[2]).length), [2, 2],
    '…and each consumer holds TWO of the four sites within its own text');
  ok(REC.sites.every((at) => SITE_BODIES.some((b) => b[0] === at && (hostOf(at) || {}).name === b[1])),
    '…THAT is as far as this contract goes: it measures where the sites are, and does NOT measure what calls ' + CONSUMERS.join(' or '));
}
// THE ONE DEPENDENCY, `S`: a `const` the monolith declares at its top, read inside the body at CALL time, with its declaration and a CONTROL.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  for (const [name, start, end, chars] of DEPENDENCY_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'const'],
      '`' + name + '` is a `const` opening at ' + start + ', ' + chars + ' units long: a global LEXICAL binding, which a later classic script reads by name');
    ok(d.end < RAW_AT_IN_CODE, '…declared far ABOVE the cut, at the top of the monolith, so the tag in front of the monolith cannot come before it in document order for the reason the other layers\' dependencies could');
  }
  eq((bodyMasked.match(/\bS\b/g) || []).length, STATE_READS.length, 'the body names `S` ' + STATE_READS.length + ' times…');
  eq((bodyMasked.match(/\bS\s*\.\s*\w+/g) || []).map((x) => x.replace(/\s+/g, '').slice(2)), STATE_READS,
    '…every one a property read of `S.scanData`, STATE_READS, in source order: the empty check and the slice in the first function, the find in the second…');
  ok(!/\bS\s*(\.\s*\w+\s*)?(=(?!=)|\+\+|--|\+=|-=)/.test(bodyMasked), '…and none is the target of an assignment');
  const first = BY_NAME.get(OWNER), second = BY_NAME.get(OWNER_LAST);
  ok(refSites(bodyMasked, 'S').every((p) => FN_BODIES.some((r) => p + RAW_AT_IN_CODE >= r.start && p + RAW_AT_IN_CODE <= r.end)),
    '…each inside a function body, so `S` is read when the function is called and not as the block is evaluated…');
  eq(refSites(bodyMasked, 'S').map((p) => (p + RAW_AT_IN_CODE <= first.end ? OWNER : OWNER_LAST)), [OWNER, OWNER, OWNER_LAST],
    '…two of the reads in ' + OWNER + ' and one in ' + OWNER_LAST);
  ok(refSites(MASKED, 'S').filter((at) => at < RAW_AT_IN_CODE).length > 0,
    'control — `S` is named elsewhere in the monolith, so the count above is the block\'s own and not every mention in the file');
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
  eq((bodyMasked.match(/\b(await|yield|this)\b/g) || []).length, 0, '…no await, no yield and no `this`…');
  eq((bodyMasked.match(/\bnew\s+\w+/g) || []), ['new Date', 'new Date'], '…`new` twice, both `new Date`, one in each function: the language\'s own Date and no constructor of the program\'s…');
  eq((bodyMasked.match(/\b(Date|Math)\b/g) || []).sort(), ['Date', 'Date', 'Date', 'Date', 'Math', 'Math'],
    '…the intrinsics `Date` and `Math` named six times in all (`new Date`, `Date.now` and `Math.round`, in each function), which any context supplies and which are not the monolith\'s…');
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
    '…and the corrected scan, which counts every declarator of a list as local, finds NON_LOCAL_ASSIGNMENTS of them either: the block assigns only its own locals and parameters (`limit=limit||6` assigns the first function\'s parameter)');
  // CONTROLS: both scans DO find a planted violation, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { S.scanData = []; }'), ['S'],
    'control — a write through the dependency the block reads is found: the zero above is not blind to the one name that matters here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}
// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: two rows tied at (3, 5), and the published key ordered them by length');
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
  ok(PREVIOUS_RAW_AT > RAW_AT_IN_CODE,
    '…and it sat entirely AFTER this block, so everything this contract measures before it did not move, and everything at or after it moved down by exactly that many units, as read from the rows below');
  const moved = (at) => (at >= PREVIOUS_RAW_AT ? at - PREVIOUS_RAW_CHARS : at);
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, 'the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq([moved(listed[0][0]), listed[0][1], listed[0][2], listed[0][3]], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the FIRST of them being THIS block, which sat before the cut that shipped and so did not move, with the same byConsumerSplit and raw nine and the same length: the cut that shipped changed nothing about it…');
  eq([moved(listed[1][0]), listed[1][1], listed[1][2], listed[1][3]], TIED_AT_BEST[1].slice(0, 1).concat([BY_CONSUMER_SPLIT, FULL_NINE, TIED_AT_BEST[1][2]]),
    '…the SECOND being the row it ties with, moved by that rule to where it stands now, since it sat after the cut that shipped…');
  eq([moved(listed[2][0]), listed[2][1], listed[2][2], listed[2][3]], RUNNERS_UP[1],
    '…the THIRD, moved by the same rule, is this contract\'s second runner-up…');
  ok(listed.some((r) => r[0] < PREVIOUS_RAW_AT) && listed.some((r) => r[0] >= PREVIOUS_RAW_AT),
    '…the rule having moved some of them and left others where they were, both cases present among the four');
  // THE FOURTH OVERLAPS THE CUT, so it cannot be a runner-up: it is the same lines plus the one above.
  ok(listed[3][0] < RAW_AT_IN_CODE && moved(listed[3][0]) + listed[3][3] > RAW_AT_IN_CODE,
    '…and the FOURTH is not a runner-up now because it OVERLAPS the cut: it opens ' + (RAW_AT_IN_CODE - listed[3][0]) + ' units above it and runs through it, the three lines rulesCtx, ' + OWNER + ' and ' + OWNER_LAST);
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
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_HIDDEN, '…and ROWS_AT_THREE_HIDDEN in the pass over sub-floor runs, so this tier is the screen\'s own and the pass adds nothing to it…');
  eq(Math.min.apply(null, atBest.map((r) => r.nine)), LOWEST_NINE_AT_THREE,
    '…the lowest raw nine among them being LOWEST_NINE_AT_THREE, which is this block\'s FULL_NINE: nothing at the best score has a lower one…');
  // THE ROWS AT THE BEST SCORE AND THE LOWEST RAW NINE, pinned in full: there are TWO, and this block is the shorter.
  const tiedRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const tied = tiedRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(tied, TIED_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE) are exactly TIED_AT_BEST: TWO rows, so the raw nine does not decide and the published key falls to length…');
  eq(tiedRows[0].lo, RAW_AT_IN_CODE, '…this block the shorter, ' + tiedRows[0].units + ' units against ' + tiedRows[1].units + ', so it is first by LENGTH ALONE and not by any measure of coupling…');
  ok(tiedRows.every((r) => r.hidden !== true), '…both rows the screen\'s own, neither found only by the pass over sub-floor runs…');
  eq(tiedRows[0].c.p.names, OWNERS_EXPECTED, '…this block\'s two owners being the first row\'s…');
  eq(tiedRows[1].c.p.names, ['_apexCompareCandleArrays'], '…and the other row a single function, `_apexCompareCandleArrays`, in a different place with different parts…');
  eq(tiedRows[0].c.p.deps.concat(tiedRows[1].c.p.deps), ['S', 'APEX_PARITY_TOL'], '…each with ONE dependency, and not the same one…');
  const nextNine = Math.min.apply(null, atBest.filter((r) => r.nine > LOWEST_NINE_AT_THREE).map((r) => r.nine));
  eq(nextNine, 8, 'the next lowest raw nine at the best score is EIGHT, three higher, so the margin over every other row is a real one and the only tie is the pair above…');
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
  ok(ranked.every((r) => r[1] === BY_CONSUMER_SPLIT),
    '…every one of them at ' + BY_CONSUMER_SPLIT + ', the same score');
  eq(ranked.map((r) => r[2] - FULL_NINE), [0, 3, 3, 3],
    '…the first of them the row this block ties with, level on the raw nine, and each of the other three WORSE than this block\'s by THREE: the gap behind the tie is wide');
}
// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: every owner above, the owner below, the three runs, and the banner it leaves alone');
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
    '…UP_WORSE worse than the cut on BOTH the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES_BCS,
    '…and UP_TIES_BCS tying it on byConsumerSplit while worse on the raw nine, so no extension upward is better than the cut or as good on both…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…and not one better on either measure');
  eq(priced.filter((r) => !r.clean).length, UP_NOT_CLEAN, '…UP_NOT_CLEAN of them also running something at load…');
  eq(priced.map((r) => [r.name, r.lo, BODY_END_IN_CODE - r.lo, r.p.nine, r.bcs, r.p.deps.length, r.clean]),
    EXTENSIONS_UP, 'all eight are exactly EXTENSIONS_UP, pinned in full');
  ok(EXTENSIONS_UP.every((e) => e[2] === BODY_END_IN_CODE - e[1]), '…each pinned opening agreeing with its pinned length');
  ok(priced[0].name === OWNER_BEFORE && priced[0].lo === upStart(BY_NAME.get(OWNER_BEFORE)),
    '…the first of them OWNER_BEFORE, opening at its own declaration, there being no documentation above it either');
  eq(candidateRuns.filter((c) => c.lo === BY_NAME.get(OWNER_BEFORE).start && c.hi === BODY_END_IN_CODE).map((c) => c.units),
    [BODY_END_IN_CODE - BY_NAME.get(OWNER_BEFORE).start],
    '…the shipped screen enumerating that very run, so this extension is a row of the screen, priced and ranked there as well');
  eq(priced[0].p.inbound - REC.inbound, 3,
    '…OWNER_BEFORE bringing THREE more inbound references with it than the block has, which is the whole of why the three-function run scores worse: it is called from the same two consumers, once more in one of them');
}
// EVERY OWNER BELOW IT IN THE REGION. Each is priced as the cut extended down to the end of that owner.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owner below the block…');
{
  const priced = OWNERS_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL of the ends at a real seam…');
  eq(priced.filter((r) => r.seam === null).length, DOWN_REFUSED,
    '…and DOWN_REFUSED of them REFUSED by the seam rule…');
  eq(Array.from(new Set(priced.filter((r) => r.seam === null).map((r) => r.refusal))), [],
    '…so no refusal of any kind among them…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, DOWN_TIES_BCS,
    '…and DOWN_TIES_BCS of them tying it on byConsumerSplit while worse on the raw nine, so none is better and none is as good on both…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…not one better on either measure, the refused ones priced all the same…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load');
  eq(priced.map((r) => [r.name, r.hb, r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length]),
    EXTENSIONS_DOWN, 'the one is exactly EXTENSIONS_DOWN, pinned in full');
  ok(EXTENSIONS_DOWN.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…its pinned closing agreeing with its pinned length');
  eq(priced[0].name, NEXT_DECL, '…it being the function right after the cut, which is also the first of the block\'s two consumers: extending down to it takes that consumer along');
  eq([priced[0].name], [CONSUMERS[1]], '…that name being the second in CONSUMERS, in sort order, so the extension turns one of the two inbound callers into part of the block and leaves the other, `orchestratedAnalysis`, outside, calling across');
  // THE ONE OWNER BELOW ENDS THE REGION, apart from the blank line that separates it from the next banner.
  const last = priced[priced.length - 1];
  const trailing = CODE.slice(last.hb, REGION.end);
  ok(last.hb <= REGION.end, '…the extension ending inside the region…');
  eq(trailing.replace(/\n+$/, ''), '', '…leaving only blank lines before the next banner after it: the region\'s last owner is its last code');
  eq(lineAt(REGION.end).startsWith(BANNER_LINE_PREFIX), true, '…that banner being the next region\'s, a `// ═` header of the same kind as this region\'s own, which this cut does not touch');
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
  eq(measured[0].slice(5), ['REFUSED', 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR'],
    '…the first owner alone being the one the seam rule REFUSES, for want of a blank line between it and the second, so it is not a run at all…');
  ok(measured[2][5] < FULL_NINE && measured[2][6] === BY_CONSUMER_SPLIT,
    '…and the second owner alone scoring a LOWER raw nine than the cut and the SAME byConsumerSplit, both functions being called from the same two consumers, which is what the floor, and not the score, keeps out of the screen: the floor is the screen\'s own and is applied unchanged here…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[RAW_AT_IN_CODE, BODY_END_IN_CODE]],
    '…the shipped screen enumerating exactly ONE run inside the block, the cut itself…');
  eq(hiddenRows.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [],
    '…and the pass over sub-floor runs none: neither owner has documentation to re-measure from');
}
// THE BANNER REGION it sits inside. The cut was owners number 9 and 10 of 11 and the banner is far above it, so the cut took NO banner
// and the document's banners and owner regions do not move — which the regions are recomputed on the text without the block to show.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, far above the cut…');
  ok(reg.start < RAW_AT_IN_CODE && reg.end > RAW_END_IN_CODE, '…and ends at REGION_END, below it, the cut sitting wholly inside');
  eq(reg.end, REGION_END, '…at REGION_END');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the BANNER_LINE_PREFIX banner…');
  eq(CODE.slice(reg.start).split('\n')[1], '// CHAT', '…whose title line, the next, reads `// CHAT`…');
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
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).map((c) => c.hi).sort((a, b) => a - b).indexOf(BODY_END_IN_CODE) >= 0, true,
  '…and the screen enumerates a run that opens there and closes where the cut does, the cut itself…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length > 1, true,
  '…alongside runs that open there and run on past the cut into the next function, which are not the cut');
// ─────────────────────────────────────────────────────────────────────────────
section('7. The SHIPPED module loads bare, needs `S` to run, and every branch of both functions is measured');
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
  eq(lines.map((l) => l.length), OWNER_SIZES, '…the two lines being the two owners, one each, at OWNER_SIZES units');
}
{
  const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);
  const DAY = 86400000;
  const thrown = (f) => { try { f(); return null; } catch (e) { return e.name; } };
  // A context holding the block, a fixed clock and a state object that records every access made to it.
  const harness = (scanData, extra) => {
    const rec = { reads: [], writes: [] };
    const state = Object.assign({ scanData, tradingRules: { a: 1 } }, extra || {});
    const S = new Proxy(state, {
      get(t, k) { if (typeof k === 'string') rec.reads.push(k); return t[k]; },
      set(t, k, v) { rec.writes.push(['set', String(k)]); t[k] = v; return true; },
      defineProperty(t, k, d) { rec.writes.push(['define', String(k)]); return Reflect.defineProperty(t, k, d); },
      deleteProperty(t, k) { rec.writes.push(['delete', String(k)]); return delete t[k]; },
    });
    const ctx = vm.createContext(Object.assign(Object.create(null), { S }));
    vm.runInContext(MODULE, ctx);
    vm.runInContext('Date.now = function () { return ' + NOW + '; };', ctx);
    ctx.__rows = scanData;
    return {
      ctx, rec, state,
      scan: (limit) => { ctx.__l = limit; return vm.runInContext('scanCtx(__l)', ctx); },
      scanNoArg: () => vm.runInContext('scanCtx()', ctx),
      ticker: (t) => { ctx.__t = t; return vm.runInContext('tickerCtx(__t)', ctx); },
    };
  };
  // ONE FULL ROW, with every field a plain value, and the two sentences it must produce, written out in full.
  const ROW = () => ({
    ticker: 'AAPL', price: 190.5, change: 0.8, score: 77, signal: 'BUY', rsi: 55.2, macd: 0.4, bbUpper: 195, bbLower: 180,
    bbPos: 0.6, squeeze: true, hvRank: 42, ma20: 188, ma20dist: 1.2, ma50dist: 2.2, ma200dist: 3.1, ivRank: 33.4, beta: 1.2,
  });
  const SCAN_LINE = 'AAPL: price=$190.5 score=77 signal=BUY RSI=55.2 MACD=0.4 BB_upper=$195 BB_lower=$180 BB_pos=0.6 Squeeze=true HVR=42% MA200dist=3.1';
  const TICKER_LINE = 'FULL DATA AAPL: price=$190.5 change=0.8 score=77/100 signal=BUY RSI=55.2 MACD=0.4 BB_upper=$195 BB_SMA20=$188 BB_lower=$180 BB_pos=0.6 Squeeze=true HVR=42% vs_MA20=1.2 vs_MA50=2.2 vs_MA200=3.1 IVR_real=33 beta=1.2';
  const NO_SCAN = 'No scan data. Ask user to run scan first.';
  const NO_TICKER = 'Ticker not in scan data.';
  const FLAG_SCAN = ' ***EARNINGS WITHIN OPTIONS DTE***';
  const FLAG_TICKER = ' | ***EARNINGS WITHIN OPTIONS DTE — HIGH RISK***';
  const isoIn = (days) => new Date(NOW + days * DAY).toISOString();

  // LOADING needs nothing; CALLING needs `S`.
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its two owners');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.constructor.name', bare)), ['Function', 'Function'], '…both ordinary synchronous functions');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.length', bare)), [1, 1], '…each taking one argument, the first an optional limit and the second a ticker');
  eq(VM_GLOBALS.map((n) => thrown(() => vm.runInContext(n + '()', bare))), ['ReferenceError', 'ReferenceError'],
    '…and CALLING either there throws ReferenceError, because `S` is not defined: loading needs nothing, calling needs `S`');
  eq(thrown(() => vm.runInContext('(function () { return notDefinedAnywhere; })()', bare)), 'ReferenceError',
    'control — the same bare VM raises ReferenceError for any function that reads a name it does not have, so the failures above are the reason claimed');
  {
    const withS = vm.createContext(Object.assign(Object.create(null), { S: { scanData: [] } }));
    vm.runInContext(MODULE, withS);
    eq([vm.runInContext('scanCtx()', withS), vm.runInContext('tickerCtx("X")', withS)], [NO_SCAN, NO_TICKER],
      '…while with an empty `S.scanData` and nothing else defined both answer, so `S` is the only thing they need');
    eq(Object.getOwnPropertyNames(withS).sort(), VM_GLOBALS.concat(['S']).sort(), '…and leave no global of their own behind');
  }

  // THE EMPTY CASES.
  {
    const h = harness([]);
    eq([h.scanNoArg(), h.scan(3), h.scan(0)], [NO_SCAN, NO_SCAN, NO_SCAN], 'scanCtx with an empty scan answers the fixed sentence NO_SCAN whatever the limit…');
    eq(h.ticker('AAPL'), NO_TICKER, '…and tickerCtx the fixed sentence NO_TICKER');
    eq(h.rec.reads.filter((k) => k !== 'scanData'), [], 'both read nothing of `S` but scanData…');
    eq(h.rec.writes, [], '…and write nothing');
  }
  // THE FULL ROW, in both functions, against the literal text.
  {
    const h = harness([ROW()]);
    eq(h.scanNoArg(), SCAN_LINE, 'one full row gives exactly SCAN_LINE from scanCtx, written out in full…');
    eq(h.ticker('AAPL'), TICKER_LINE, '…and exactly TICKER_LINE from tickerCtx, with the ticker\'s extra fields and its IVR and beta tail');
    eq(h.rec.reads, ['scanData', 'scanData', 'scanData'], 'the reads of `S` are `scanData` three times in all: the empty check and the slice in scanCtx, then the find in tickerCtx…');
    eq(h.rec.writes, [], '…and nothing is written to `S`');
    eq(h.state.scanData[0], ROW(), '…nor to the row it holds');
  }
  // LIMIT.
  {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((t) => Object.assign(ROW(), { ticker: t }));
    const h = harness(rows);
    const tickersOf = (text) => text.split('\n').map((l) => l.split(':')[0]);
    eq(tickersOf(h.scanNoArg()), ['A', 'B', 'C', 'D', 'E', 'F'], 'with no limit scanCtx lists the first SIX rows, one per line…');
    eq([undefined, null, 0, '', false, NaN].map((v) => tickersOf(h.scan(v)).length), Array(6).fill(6), '…a falsy limit — undefined, null, zero, the empty string, false, NaN — falling back to six as well…');
    eq([1, 2, 8, 20].map((v) => tickersOf(h.scan(v)).length), [1, 2, 8, 8], '…any other positive limit giving that many rows, never more than the scan holds…');
    eq(tickersOf(h.scan('3')), ['A', 'B', 'C'], '…a numeric string being used as a number by slice…');
    eq(tickersOf(h.scan(-1)), ['A', 'B', 'C', 'D', 'E', 'F', 'G'], '…and a NEGATIVE limit counting from the end, so -1 drops the last row: a quirk of slice, pinned and not fixed…');
    eq(h.scan(2), h.scanNoArg().split('\n').slice(0, 2).join('\n'), '…each row\'s text not depending on its position');
    eq(h.scan(2).split('\n').length, 2, '…and the rows joined by a single line feed, with none at the end');
  }
  // EARNINGS: the note, the flag and its boundary, in both functions.
  {
    const mk = (nextEarnings) => Object.assign(ROW(), { nextEarnings });
    const tail = (text) => text.slice(text.indexOf('HVR=42%') + 'HVR=42%'.length);
    const SC = (note) => note + ' MA200dist=3.1';
    const check = (nextEarnings, dte, flagged) => {
      const h = harness([mk(nextEarnings)]);
      eq(tail(h.scanNoArg()), SC(' EARNINGS_DATE=' + nextEarnings + ' DAYS_TO_EARNINGS=' + dte + (flagged ? FLAG_SCAN : '')),
        'scanCtx with nextEarnings ' + JSON.stringify(nextEarnings) + ' notes ' + dte + ' days' + (flagged ? ' and FLAGS it' : ' and does not flag it'));
      const t = h.ticker('AAPL');
      eq(t.slice(t.indexOf('HVR=42%') + 'HVR=42%'.length, t.indexOf(' vs_MA20=')),
        ' | EARNINGS_DATE=' + nextEarnings + ' | DAYS_TO_EARNINGS=' + dte + (flagged ? FLAG_TICKER : ''), '…and tickerCtx the same, in its own wording');
    };
    check(isoIn(45), 45, true);
    check(isoIn(46), 46, false);
    check(isoIn(0), 0, true);
    check(isoIn(-3), -3, true);
    check(isoIn(200), 200, false);
    // ROUNDING: the day count is rounded, not truncated.
    check(new Date(NOW + 45.4 * DAY).toISOString(), 45, true);
    check(new Date(NOW + 45.6 * DAY).toISOString(), 46, false);
    // A DATE THE PARSER CANNOT READ gives NaN, which is not <= 45, so it is noted and never flagged.
    check('not a date', 'NaN', false);
    // A DATE WITHOUT A TIME is read as midnight UTC, and the clock is fixed at noon, so 2026-02-28 is 43.5 days off and rounds UP to 44.
    check('2026-02-28', 44, true);
    // ABSENT: every falsy value leaves no note at all.
    for (const v of [null, undefined, '', 0, false]) {
      const h = harness([mk(v)]);
      eq([h.scanNoArg(), h.ticker('AAPL')], [SCAN_LINE, TICKER_LINE], 'a falsy nextEarnings — ' + JSON.stringify(v) + ' — adds no note to either function');
    }
    eq(harness([ROW()]).scanNoArg().indexOf('EARNINGS'), -1, 'control — the plain row carries no EARNINGS text at all, so the notes above are the dates\'');
    // THE DASH: the flagged note of tickerCtx is the ONLY place the non-ASCII character is emitted.
    eq([harness([mk(isoIn(10))]).scanNoArg(), harness([mk(isoIn(10))]).ticker('AAPL')].map((x) => /—/.test(x)), [false, true],
      'the em dash reaches the model from tickerCtx\'s flagged note and never from scanCtx\'s');
    eq([harness([ROW()]).ticker('AAPL'), harness([mk(isoIn(100))]).ticker('AAPL')].map((x) => /—/.test(x)), [false, false],
      '…and not from an unflagged one, so the character is emitted on one path only');
  }
  // FIELD FALLBACKS: the bounds, and every field printed as it is.
  {
    const sparse = { ticker: 'ZZZ' };
    const h = harness([sparse]);
    eq(h.scanNoArg(), 'ZZZ: price=$undefined score=undefined signal=undefined RSI=undefined MACD=undefined BB_upper=$N/A BB_lower=$N/A BB_pos=undefined Squeeze=undefined HVR=undefined% MA200dist=undefined',
      'a row holding only its ticker prints the word undefined for every field the function prints as it is, and N/A for the two Bollinger bounds, which have a fallback…');
    eq(h.ticker('ZZZ'), 'FULL DATA ZZZ: price=$undefined change=undefined score=undefined/100 signal=undefined RSI=undefined MACD=undefined BB_upper=$N/A BB_SMA20=$N/A BB_lower=$N/A BB_pos=undefined Squeeze=undefined HVR=undefined% vs_MA20=undefined vs_MA50=undefined vs_MA200=undefined',
      '…tickerCtx doing the same and giving N/A to the middle band as well, with neither the IVR nor the beta tail');
    const falsy = Object.assign(ROW(), { bbUpper: 0, bbLower: '', ma20: null });
    const hf = harness([falsy]);
    ok(hf.scanNoArg().indexOf('BB_upper=$N/A BB_lower=$N/A') > 0 && hf.ticker('AAPL').indexOf('BB_upper=$N/A BB_SMA20=$N/A BB_lower=$N/A') > 0,
      'a bound of 0, the empty string or null is replaced by N/A: the fallback is on truthiness, so a genuine ZERO band prints as N/A');
    eq(harness([Object.assign(ROW(), { price: 0, score: 0, rsi: 0, macd: 0, bbPos: 0, hvRank: 0 })]).scanNoArg(),
      'AAPL: price=$0 score=0 signal=BUY RSI=0 MACD=0 BB_upper=$195 BB_lower=$180 BB_pos=0 Squeeze=true HVR=0% MA200dist=3.1',
      'while the fields printed as they are show a zero as 0, so the truthiness fallback is limited to the bounds');
  }
  // IVR AND BETA.
  {
    const ivr = (v) => { const t = harness([Object.assign(ROW(), { ivRank: v })]).ticker('AAPL'); return t.indexOf('IVR_real=') < 0 ? null : t.slice(t.indexOf('IVR_real='), t.indexOf(' beta=')); };
    eq([ivr(null), ivr(undefined)], [null, null], 'a null or undefined ivRank leaves the IVR out of tickerCtx…');
    eq([ivr(0), ivr(33.4), ivr(33.6), ivr(100)], ['IVR_real=0', 'IVR_real=33', 'IVR_real=34', 'IVR_real=100'],
      '…while ZERO is printed, the test being against null and undefined and not truthiness, and the value is formatted to whole numbers by toFixed(0)');
    eq(thrown(() => harness([Object.assign(ROW(), { ivRank: '33' })]).ticker('AAPL')), 'TypeError',
      '…and a string ivRank throws TypeError from toFixed: nothing in the function guards the type, a failure pinned and not fixed');
    const beta = (v) => { const t = harness([Object.assign(ROW(), { beta: v })]).ticker('AAPL'); return t.indexOf(' beta=') < 0 ? null : t.slice(t.indexOf(' beta=')); };
    eq([beta(0), beta(null), beta(undefined), beta('')], [null, null, null, null], 'a falsy beta, zero included, is left out…');
    eq([beta(1.2), beta(-0.5), beta('x')], [' beta=1.2', ' beta=-0.5', ' beta=x'], '…and any truthy beta is printed as it is, a negative one and a string included');
  }
  // WHICH ROW tickerCtx FINDS.
  {
    const rows = [Object.assign(ROW(), { ticker: 'AAPL', score: 1 }), Object.assign(ROW(), { ticker: 'AAPL', score: 2 }), Object.assign(ROW(), { ticker: 'MSFT', score: 3 })];
    const h = harness(rows);
    eq(h.ticker('AAPL').indexOf('score=1/100') > 0, true, 'tickerCtx finds the FIRST row of a ticker that appears twice…');
    eq([h.ticker('MSFT').indexOf('FULL DATA MSFT'), h.ticker('aapl'), h.ticker(' AAPL'), h.ticker(undefined), h.ticker(null)], [0, NO_TICKER, NO_TICKER, NO_TICKER, NO_TICKER],
      '…matching by strict equality: the case, a padded ticker, undefined and null find nothing…');
    eq(harness([Object.assign(ROW(), { ticker: 5 })]).ticker('5'), NO_TICKER, '…and a number does not match its string form, either way');
    eq(h.rec.writes, [], 'finding a row writes nothing');
  }
  // THE ROW IS NOT WRITTEN TO, even a frozen one.
  {
    const frozen = Object.freeze(Object.assign(ROW(), { nextEarnings: isoIn(5) }));
    const h = harness([frozen]);
    eq([h.scanNoArg().length > 0, h.ticker('AAPL').length > 0], [true, true], 'with a FROZEN row both functions still answer, so they write to nothing they are handed');
  }
  // WHAT THE CALLERS USE THESE FOR: the strings are concatenated into a prompt, so the text is the contract.
  {
    const hostile = Object.assign(ROW(), { ticker: 'A\nB' });
    eq(harness([hostile]).scanNoArg().split('\n').length, 2, 'a ticker holding a newline splits a scan line in two: nothing is escaped or sanitised on the way out');
    eq(vm.runInContext('scanCtx.toString().indexOf("escHtml") < 0 && tickerCtx.toString().indexOf("escHtml") < 0', bare), true,
      '…and neither function calls escHtml, the function the option-chain helpers needed, so the block has no dependency but `S`');
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
  eq(sizes[0], BODY_CHARS, 'the smallest shipped layer is THIS module, BODY_CHARS units, and it is the smallest of the whole chain…');
  eq(sizes[1], SMALLEST_LAYER_CHARS, '…the next smallest being SMALLEST_LAYER_CHARS, the previous smallest, which the audit forecast this module would pass by 19 units…');
  eq(sizes[1] - sizes[0], 19, '…19 units exactly…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    '…measured against every layer rather than inferred from the first: it ranks SIZE_RANK by size…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, LAYERS_SMALLER_THAN_THIS_CUT,
    '…with LAYERS_SMALLER_THAN_THIS_CUT layers smaller than it…');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…and LAYERS_LARGER_THAN_THIS_CUT layers larger…');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 1, '…none of the others exactly its size, the one at that length being itself…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, 0, '…and not one layer smaller, so the superlative is measured over the whole chain…');
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
  ok(!ascii(MODULE), '…and this module is NOT, asserted of the module directly: it holds NON_ASCII_CHARS non-ASCII character, one em dash in a string literal…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS, '…the SAME number: it did not move, as the audit forecast');
  eq(prior.filter(banner).length, PRIOR_LAYERS_OPENING_ON_BANNER,
    'PRIOR_LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: its first line is a function declaration…');
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
  eq(MONOLITH_DEPENDENCIES.length, 1, '…it pinning the non-empty list of its one monolith binding, `S`, which is why the count moved, as the audit forecast…');
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
    ['index.html', MODULE_REL, 'js/services/apex-parity-compare.js', 'js/services/swing-trend-context.js'].sort(),
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
  ok(MODULE.startsWith(DECL_FIRST_LINE_PREFIX),
    '…and OPENS on the declaration of ' + OWNER + ', DECL_FIRST_LINE_PREFIX, there being no documentation above it: the boundary §2 defends');
  eq(MODULE.split('\n')[1].slice(0, SECOND_FIRST_LINE_PREFIX.length), SECOND_FIRST_LINE_PREFIX,
    '…its second line the declaration of ' + OWNER_LAST + ', SECOND_FIRST_LINE_PREFIX');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * EM_DASHES,
    '…its UTF-8 length longer than its UTF-16 length by two bytes for each em dash…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…of which it holds NON_ASCII_CHARS…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…EM_DASHES of them an em dash, the whole of the non-ASCII…');
  ok(MODULE.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => !l.trim().startsWith('//')),
    '…every one on a line of CODE, inside the string literal `tickerCtx` returns for a flagged earnings date, so the move preserves what the model is sent, byte for byte');
}
// THE TAG'S POSITION. Nothing here shows the load order to be load-bearing (§3 says what it does not measure),
// and it is pinned all the same: last of the local scripts, immediately before the inline monolith, whose
// consumer stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/services/option-chain-error-helpers.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumer calls it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES BOTH FUNCTIONS at the four sites in the two consumers: the block's own text left, the
  // calls did not.
  eq(refSites(LIVE_MONOLITH, OWNER).length + refSites(LIVE_MONOLITH, OWNER_LAST).length, CONSUMER_SITES,
    '…while the shipped monolith names ' + OWNER + ' and ' + OWNER_LAST + ' at the CONSUMER_SITES sites that stayed, two each…');
  eq([refSites(LIVE_MONOLITH, OWNER).length, refSites(LIVE_MONOLITH, OWNER_LAST).length], [2, 2], '…two for each function…');
  eq(refSites(MASKED, OWNER).concat(refSites(MASKED, OWNER_LAST)).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, CONSUMER_SITES,
    '…the same CONSUMER_SITES the reconstructed base held from outside the block…');
  // The module itself names both, the control that makes the counts below measurements.
  ok(refSites(MODULE, OWNER).length >= 1 && refSites(MODULE, OWNER_LAST).length >= 1,
    'control — the same count over the module itself finds both names…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t2, rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return t2 + refSites(src, OWNER).length + refSites(src, OWNER_LAST).length;
  }, 0), 0,
  '…and not one other local script names either function, so the module is reached only from the monolith');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its two owners and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => MONOLITH_DEPENDENCIES.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    MONOLITH_DEPENDENCIES.slice().sort(), '…and so does the one binding the module reads at call time, `S`');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMERS.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    CONSUMERS.slice().sort(), '…and its two consumers, which call the module\'s functions');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, stays too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the closing brace of ' + OWNER_BEFORE + ' directly against `async function ' + NEXT_DECL + '`, once…');
  eq(LIVE_MONOLITH.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 2, '…at the place the cut was made…');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT_PREFIX), JOINS_LIKE_THE_CUT_BEFORE + 1,
    '…one more of a shape the document held JOINS_LIKE_THE_CUT_BEFORE times already…');
  eq(count(LIVE_MONOLITH, JOIN_BEFORE_CUT), 0, '…and the join of that brace against this block gone with the block');
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
  const E = 'AI_SCAN_CONTEXT_UNDO_';
  throwsWith(() => UNDO.undoAiScanContext(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,541 units, not 1,540 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('scanData', 'scanDatA');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoAiScanContext(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoAiScanContext(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoAiScanContext(INDEX, MODULE),
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/ai-scan-context-undo.js'),
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
console.log('AI_SCAN_CONTEXT_CONTRACT_OK');
}

main();
