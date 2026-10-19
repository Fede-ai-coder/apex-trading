'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL EXPIRY AUDIT — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [866308,868400) in monolith coordinates — 2,092 units raw and
// 2,091 of body, TWO owners, both synchronous — now lives in
// js/services/journal-expiry-audit.js. `_journalExpiryAuditEnabled` reads the two
// switches that turn the diagnostic on, `window.APEX_DEBUG_JOURNAL_EXPIRY === true`
// and a localStorage entry of the same name equal to '1', and answers false when
// neither holds or when reading either throws. `journalTradeLegExpiryAudit` is the
// diagnostic itself: when the switch is on it dumps a trade's id, ticker, expiry and
// every leg's expiry fields and option symbols through console.debug, and it swallows
// its own failures. The block opens on the `// ── [JOURNAL-EXPIRY-AUDIT]` banner and
// the nine comment lines under it, and the blank line above the banner stayed behind.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #512 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT FIRST, AND IT STOOD ─
// ── ALONE ─────────────────────────────────────────────────────────────────────
//
// The contract before this layer published its four best other openings, and this
// was the first of them: one of a two-way tie at the best score the screen can state,
// the other row being the cut that contract shipped, so the tie went with it. Over the
// screen and the pass over its sub-floor runs together, §4 counts no row with a
// byConsumerSplit below 2 and exactly ONE row AT 2, this one, with a raw nine of 7. The
// best other rows sat at 3. The claim is scoped to the two enumerations.
//
// ── PART TWO: THE SCREEN HELD IT, BECAUSE IT IS THE FIRST OWNER OF ITS REGION ──
//
// Measured from its declaration the block was 1,410 units, under the 1,500 floor. The
// screen measures the first owner of a region from the region's start instead, and
// this block was the first owner of its region, whose start is the banner it opens on:
// measured from there it is 2,091, and the shipped screen enumerated it. The pass over
// sub-floor runs held none for it. The two runs inside the block, one function each,
// are legal seams because a blank line stands between the owners; §5 prices both.
//
// ── PART THREE: SEVEN CALLS FROM TWO CONSUMERS, ALL TO ONE OWNER, NO DEPENDENCY ─
//
// The raw nine is 7, all of it inbound: `journalManager`, a `var` that holds an
// immediately-invoked function of 27,165 units, calls `journalTradeLegExpiryAudit` six
// times, and `submitTrade`, a function of 12,259 units, calls it once. All seven
// references are calls: none is an object key or a bare reference. Nothing outside the
// block names `_journalExpiryAuditEnabled`. The block reads no monolith name, writes
// nothing and deletes nothing; it touches the host only through `window`, `localStorage`
// and `console`, and it reaches the first two behind `typeof` guards, so it loads in a
// bare VM.
//
// ── PART FOUR: THE LOAD ORDER IS LOAD-BEARING, AND IT IS MEASURED TWICE ───────
//
// One of the seven calls runs while the monolith is still being evaluated: the first
// of `journalManager`'s, in the initialiser that loads the stored trades, which sits in
// a `try` whose `catch(e) { _trades = []; }` EMPTIES the in-memory journal on any error.
// §3 evaluates that initialiser against stubs with one stored trade, on the
// reconstructed base: with the audit function defined, the journal holds the trade and
// the call is recorded exactly once; with it ABSENT, the ReferenceError is swallowed and
// the journal holds none. §9 repeats the evaluation on the SHIPPED document, whose
// monolith no longer declares the function: with the shipped module loaded first the
// journal holds the trade, and with the module loaded after the monolith it holds none.
// §9 also pins the tag as the last local script, immediately before the inline monolith.
//
// ── PART FIVE: THIRTEEN OPENINGS WERE LEGAL, TWELVE PARSE, ONE IS A BLANK LINE ─
//
// The seam rule admits thirteen line starts between the owner above and the
// declaration: that owner's closing brace, the blank line after it, the ten comment
// lines (the banner and nine under it) and the declaration. The brace does not parse
// as a script. The blank line does, and is the only opening that is an empty line. The
// cut takes the whole comment block the programme's own blockAbove rule finds, banner
// included, and leaves the blank line, so the monolith keeps `}` + blank line +
// `function optionLegScalarDiagnostics(`, a join it held once at the END of the block
// and holds once at the place the cut was made. Opening at the declaration would have
// left ten comment lines against `optionLegScalarDiagnostics`, which they do not
// describe, and opening at the blank line would have fused the brace onto it. The next
// function has no comment block of its own, so the cut ends where its declaration begins.
//
// ── PART SIX: THE CUT TOOK ITS REGION'S BANNER, AND THE OWNERS BELOW FELL ─────
// ── UNDER THE BANNER ABOVE ────────────────────────────────────────────────────
//
// The banner the block opens on headed a region of five owners; the cut is the first
// two. Leaving the banner behind would have headed three option owners with a title
// that describes code that has moved, so the cut took it, and §5 measures the
// consequence: the three remaining owners are no longer under a banner of their own and
// fall into the region above, which opens on the ADD POSITION FORM banner, so the
// document's owner regions dropped by one. §5 prices EVERY owner below and all three
// were worse than the cut on both the raw nine and byConsumerSplit.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED, NOT ASSUMED ────────────────────────
//
// §7 loads the SHIPPED module in a VM with NOTHING defined and drives the gate through
// a table of window and localStorage states, then drives the audit against a fake
// console: the payload's key order, every fallback in the id, ticker and expiry chains,
// the legs' null handling, and the swallowed failures. It also shows that nothing but
// console.debug is ever written to.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// §8 ranks it by size against the fifty-nine layers the chain now holds: it is the
// fourteenth smallest, which §8 measures against every layer rather than asserting. Its
// body holds five non-ASCII characters, all in comments, so it is not pure ASCII and the
// pure-ASCII count did not move; it opens on a `// ── ` banner, so the banner count
// moved, by one; and it pins an empty monolith dependency, so the count of layers that
// pin a non-empty one did not move. §8 measures all three.
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
const UNDO = require('./lib/journal-expiry-audit-undo.js');
const PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U = require('./lib/portfolio-backend-squeeze-extract-undo.js');
const PORTFOLIO_REGIME_BADGE_HTML_U = require('./lib/portfolio-regime-badge-html-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/services/journal-expiry-audit.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = 'de12940';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = 'f3f4ac0';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '4f4f91c';
const BASE_CHARS = 1425802;
const BASE_UTF8 = 1454275;
const BASE_LF = 24628;
const BASE_SHA256 = 'a273e56af564eebce397b378ef5c4f559e1f3f05ef36672192cdb96593298f06';
const LOCAL_SCRIPTS = 102;
const TEST_FILE_COUNT = 190;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-journal-expiry-audit-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/journal-expiry-audit-audit.spec.js';
const CONTRACT_REL = 'tests/journal-expiry-audit-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/journal-expiry-audit-contract.spec.js';
const UNDO_REL = 'tests/lib/journal-expiry-audit-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = 'f3f4ac0';
const CONTRACT_SPEC_MUTANTS = 184;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 52;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/portfolio-stale-mark-squeeze-state-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 181;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/journal-expiry-audit-audit.spec.js';
const RETIRED_MUTANTS = 175;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116162;
const CODE_CHARS = 1309614;
const TOP_LEVEL_DECLS = 892;
const OWNER_REGIONS = 116;

// ── The region ───────────────────────────────────────────────────────────────
// It opens on the `// ── [JOURNAL-EXPIRY-AUDIT]` banner, the first of ten comment
// lines directly above the first declaration, and the blank line above the banner
// stayed behind as the separator.
const RAW_AT_IN_CODE = 866308;
const DECL_AT_IN_CODE = 866989;
const RAW_END_IN_CODE = 868400;
const BODY_END_IN_CODE = 868399;
const RAW_CHARS = 2092;
const BODY_CHARS = 2091;
const BODY_UTF8 = 2101;
const BODY_LF = 40;
const BODY_SHA256 = 'b6baccb9afc12ad7163c46720b70b8a0bb5aea0ff8443b86e5ff6f5094032ec9';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// ── [JOURNAL-EXPIRY-AUDIT] — gated expiry/option-symbol preservation diagnostics ─';
const DECL_FIRST_LINE = 'function _journalExpiryAuditEnabled() {';
const EM_DASHES = 2;
const BOX_DRAWING_CHARS = 3;
const NON_ASCII_CHARS = 5;
const NON_ASCII_LINES = 2;
const NEXT_DECL = 'optionLegScalarDiagnostics';

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['_journalExpiryAuditEnabled', 'journalTradeLegExpiryAudit'];
const OWNER_SIZES = [315, 1092];
const ENABLED = '_journalExpiryAuditEnabled';
const AUDIT = 'journalTradeLegExpiryAudit';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 40;
const CODE_LINES = 27;
const COMMENT_LINES = 12;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
const OWNER_BEFORE = 'normalizeTradeOptionLegAliases';
const BRACE_OPENING = 866305;
const BLANK_OPENING = 866307;
const DOC_TAKEN = 681;
const DOC_TAKEN_LINES = 10;
const SEAM_LEGAL_OPENINGS = 13;
const PARSING_OPENINGS = 12;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 866306;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 1410;
const CANDIDATES_AT_DECLARATION = 0;
const CANDIDATES_AT_CUT = 1;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut left behind: the closing brace of the owner above, one blank line, and
// the declaration of the next function — the join the monolith already held, once, at the end of the pair.
const NEXT_DECL_PREFIX = 'function optionLegScalarDiagnostics(';
const FUSED_IF_BLANK_TAKEN = '}\nfunction optionLegScalarDiagnostics(';
const JOIN_AFTER_CUT = '}\n\nfunction optionLegScalarDiagnostics(';
const JOIN_AS_BEFORE = '}\n\n// ── [JOURNAL-EXPIRY-AUDIT]';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 866308;
const REGION_END = 874826;
const REGION_CHARS = 8518;
const REGION_OWNERS = 5;
const OWNER_POSITION = 1;
const BANNER_LINE_PREFIX = '// ── [JOURNAL-EXPIRY-AUDIT]';
const WHOLE_REGION_NINE = 27;
const WHOLE_REGION_BCS = 10;
const WHOLE_REGION_CONSUMERS = 4;
const WHOLE_REGION_DEPS = 3;
const WHOLE_REGION_SIB = 3;
// WHAT TAKING THE BANNER DOES TO THE REGIONS. The three owners left under it fall into
// the region above, which opens on its own banner and held nine owners before the cut.
const REGION_ABOVE_AT = 859397;
const REGION_ABOVE_BANNER_PREFIX = '// ── ADD POSITION FORM';
const REGION_ABOVE_OWNERS = 9;
const LEFT_OWNERS = ['optionLegScalarDiagnostics', 'subscribeBackendOptionLive', 'fetchBackendOptionLive'];
const BANNER_MARKS = 217;
const BANNER_MARKS_AFTER_CUT = 216;
const REGIONS_AFTER_CUT = 115;

// ── Taking more, priced: the owners above; the owners below ──────────────────
// The block is the FIRST owner of its region, so no owner stands above it.
const EXTENSIONS_UP = [];
const OWNERS_ABOVE = 0;
// Below: THREE owners stay in the region and all three are pinned in full, as
// [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['optionLegScalarDiagnostics', 869385, 3077, 13, 5, 1],
  ['subscribeBackendOptionLive', 870477, 4169, 19, 7, 1],
  ['fetchBackendOptionLive', 874825, 8517, 27, 10, 3],
];
const OWNERS_BELOW = 3;
// How many of the three are real seams, how many are worse than the cut on both measures,
// and how many do NOT run clean at load.
const DOWN_LEGAL = 3;
const DOWN_WORSE = 3;
const DOWN_NOT_CLEAN = 0;
const DOWN_LOWEST_NINE = 13;
const DOWN_LOWEST_BCS = 5;
// THE THREE RUNS the two owners make between them, one of which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites] — or the
// refusal the seam rule gives when the run ends inside the block.
const OWN_RUNS = [
  ['_journalExpiryAuditEnabled', '_journalExpiryAuditEnabled', 866308, 867305, 997, 1, 1, [], 1],
  ['_journalExpiryAuditEnabled', 'journalTradeLegExpiryAudit', 866308, 868399, 2091, 7, 2, [], 7],
  ['journalTradeLegExpiryAudit', 'journalTradeLegExpiryAudit', 867306, 868399, 1093, 8, 3, ['_journalExpiryAuditEnabled'], 7],
];
const OWN_RUNS_LEGAL = 3;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 2;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 7;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const CONSUMERS = ['journalManager', 'submitTrade'];
const CONSUMER_SITES = 7;
const CONSUMER_SITES_AT = [1212168, 1216495, 1216736, 1218248, 1219335, 1219618, 1290945];
const SITE_HOSTS = ['journalManager', 'journalManager', 'journalManager', 'journalManager', 'journalManager', 'journalManager', 'submitTrade'];
const CONSUMER_JM_AT = 1207692;
const CONSUMER_JM_END = 1234856;
const CONSUMER_JM_CHARS = 27165;
const CONSUMER_ST_AT = 1285817;
const CONSUMER_ST_END = 1298075;
const CONSUMER_ST_CHARS = 12259;
// THE CALL THAT RUNS WHILE THE MONOLITH IS STILL BEING EVALUATED, recorded by evaluating
// journalManager's initialiser against stubs with ONE stored trade: [label, trade id].
const EVAL_TIME_CALLS = [['after initial storage load', 1]];
const JOURNAL_TRADES_WITH_AUDIT = 1;
const JOURNAL_TRADES_WITHOUT_AUDIT = 0;
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
const HOST_GLOBAL_MENTIONS = 2;
const HOST_STORAGE_MENTIONS = 2;
const HOST_CONSOLE_MENTIONS = 1;
const EVALUATION_TIME_READS = [];
// THE SCAN THIS FILE INHERITED needs no correction here: on this block the inherited and the
// corrected scan agree and both find nothing, and both are shown to find a planted write.
const UNCORRECTED_SCAN_NAMES = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_journalExpiryAuditEnabled', 'journalTradeLegExpiryAudit'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7169;
const SEAM_REJECTED = 2091;
const CANDIDATES = 2814;
const CLEAN_CANDIDATES = 1685;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 1;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor. THIS CUT IS NOT ONE OF THEM: the screen holds it, as the
// first owner of its region.
const HIDDEN_ROWS = 35;
const HIDDEN_CLEAN_ROWS = 34;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 0;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [];
const OPENINGS_AT_TWO_OR_BELOW = 1;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit].
const BEST_TIER_ROWS = [
  [866308, 868399, 7, 2],
];
const BEST_NINE = 7;
// THE ROWS AT THE NEXT SCORE, counted over the screen and the pass together.
const ROWS_AT_THREE = 14;
const ROWS_AT_THREE_SCREEN = 11;
const ROWS_AT_THREE_HIDDEN = 3;
const LOWEST_NINE_AT_THREE = 3;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [68905, 3, 3, 2030],
  [910324, 3, 3, 2086],
  [908620, 3, 3, 3790],
  [760226, 3, 4, 1690],
];
// The shipped cut changed the screen: the previous contract's figures less the
// ones measured here. They are POSITIVE, because that cut took two owners out
// of the monolith and the runs that contained them with it.
const DELTA_RAW_RUNS = 45;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = 42;
const DELTA_CLEAN = 16;
const PREVIOUS_RAW_CHARS = 1700;
const PREVIOUS_RAW_AT = 736655;
// The previous contract's published list, with where each entry sat relative to
// the cut it shipped.
const PREVIOUS_RUNNERS_UP = [
  [868008, 2, 7, 2091],
  [68905, 3, 3, 2030],
  [912024, 3, 3, 2086],
  [910320, 3, 3, 3790],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. §8 measures the smallest layer at SMALLEST_LAYER_CHARS.
const CHAIN_LENGTH = 59;
const SMALLEST_LAYER_CHARS = 1559;
const SIZE_RANK = 14;
const LAYERS_SMALLER_THAN_THIS_CUT = 13;
const LAYERS_LARGER_THAN_THIS_CUT = 45;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 8;
const PRIOR_LAYERS_OPENING_ON_BANNER = 25;
const LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_WITH_A_DEPENDENCY = 23;
// The later layer that pins a NON-EMPTY list instead: it IS among the contracts counted,
// and is set aside to recover the figure at this layer.
const LATER_CONTRACTS_WITH_A_DEPENDENCY = ['portfolio-regime-badge-html-boundary-contract.test.js', 'portfolio-backend-squeeze-extract-boundary-contract.test.js'];

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 2030;
const INDEX_AFTER = 1423772;
const RESIDUAL_MONOLITH = 1307522;
const LOCAL_SCRIPTS_AFTER = 103;
// The tag's position among the local scripts, zero-based: the last of 103.
const TAG_LOCAL_INDEX = 102;

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


console.log('JOURNAL EXPIRY AUDIT — PERMANENT BOUNDARY CONTRACT');
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
const LIVE_INDEX = PORTFOLIO_REGIME_BADGE_HTML_U.isApplied(PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT)
  ? PORTFOLIO_REGIME_BADGE_HTML_U.undoPortfolioRegimeBadgeHtml(
      PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-regime-badge-html.js'), 'utf8'))
  : PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoJournalExpiryAudit(LIVE_INDEX, MODULE);

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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the portfolio
// stale mark and squeeze state predicted the document, the residual monolith and the script
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
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the banner');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dashes…');
eq((BODY.match(/─/g) || []).length, BOX_DRAWING_CHARS, '…and BOX_DRAWING_CHARS box-drawing characters, the banner\'s rule…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII characters in all…');
eq(EM_DASHES + BOX_DRAWING_CHARS, NON_ASCII_CHARS, '…those two kinds being the whole of them');
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
  eq(next.start, RAW_END_IN_CODE, '…beginning exactly where the cut ends…');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DECL_PREFIX.length), NEXT_DECL_PREFIX,
    '…its first characters being NEXT_DECL_PREFIX…');
  eq(blockAbove(next), null,
    '…and it has no comment block above it, so the cut ends at a declaration and nothing of any documentation is cut off');
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
  eq(OPENINGS[1], BLANK_OPENING, '…the next the blank line that separates that brace from the banner…');
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…the next the banner, the first comment line, the cut…');
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

// WHAT THE CUT TAKES is the whole comment block above the first function, banner included, and nothing else:
// ten comment lines directly above the declaration, with the blank line above THEM left behind. The second
// function has no block of its own; its two comment lines sit INSIDE its body.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the comment block taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  ok(/^\/\/ ── /.test(doc), '…the first of them a `// ── ` banner, so this cut OPENS on one…');
  eq((doc.match(/^\/\/ ── /gm) || []).length, 1, '…and it is the only banner line in the block');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[1])), null,
    'the second owner has NO comment block above it: it follows the first owner\'s closing brace and one blank line…');
  const secondBody = CODE.slice(BY_NAME.get(OWNERS_EXPECTED[1]).start, BY_NAME.get(OWNERS_EXPECTED[1]).end + 1);
  eq(secondBody.split('\n').filter((l) => l.trim().startsWith('//')).length, 2, '…its two comment lines being inside its body…');
  eq(COMMENT_LINES, DOC_TAKEN_LINES + 2, '…so the body\'s twelve comment lines are the ten at the top and those two');
  ok(doc.indexOf('It is DISABLED by default') >= 0 && doc.indexOf('APEX_DEBUG_JOURNAL_EXPIRY') >= 0,
    '…and the block says the diagnostic is disabled by default and names its switch, a claim §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the banner is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE COMMENT BLOCK WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DECL_PREFIX) >= 0,
    'cutting at the declaration would have left the ten comment lines, the banner among them, directly above ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith held nowhere before the cut, once there');
}
// WHAT THE CUT LEFT. The brace of the owner above, one blank line, then the next function's declaration: the very
// join the monolith held at the END of the block, so the cut moves it and the document gains no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith holds the join `}` blank line `' + NEXT_DECL_PREFIX + '` once before the cut, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the second owner…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of the banner is held once before the cut, and is gone after it…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the banner leaving with the block');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this comment block or declaration is left behind');
}
// THE SCREEN HOLDS THIS RUN, AND NOT BY ITS DECLARATION. The screen floors a run at RUN_FLOOR units measured from the
// DECLARATION, except that the first owner of a region is measured from the region's start. Measured from the
// declaration this block is DECL_UNITS_FROM_DECLARATION, under the floor; it is the first owner of its region, so the
// screen measures it from the banner instead.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION < RUN_FLOOR, '…UNDER RUN_FLOOR, so a run measured there would not be held…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the screen enumerates CANDIDATES_AT_DECLARATION run that opens at the declaration and ends where this cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does, at the region\'s start…');
ok(BODY_END_IN_CODE - RAW_AT_IN_CODE >= RUN_FLOOR, '…which measured from there is at or above RUN_FLOOR…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…so the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT rows for it: it has nothing to find here');

// ───────────────────────────────────────────────────────────────────────────
section('3. Coupling: two consumers, seven calls to one owner, no dependency, and a load order that matters');
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
  eq(REC.sites.map((at) => OWNERS_EXPECTED.filter((n) => MASKED.startsWith(n, at))[0]), REC.sites.map(() => AUDIT),
    '…every one of which names journalTradeLegExpiryAudit…');
  eq(refSites(MASKED, ENABLED).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, 0,
    '…while _journalExpiryAuditEnabled is named nowhere outside the block, its only reference being the call inside the audit function…');
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), ENABLED).length, 2,
    '…the declaration and that one call: two occurrences in all');
  ok(REC.sites.every((at) => /^\s*\(/.test(CODE.slice(at + AUDIT.length))),
    '…every one of the seven followed by an opening parenthesis: all seven are CALLS, none an object key or a bare reference…');
  eq(REC.sites.map((at) => hostOf(at).name), SITE_HOSTS, '…each inside the enclosing declaration SITE_HOSTS names');
  const jm = BY_NAME.get('journalManager'), st = BY_NAME.get('submitTrade');
  ok(jm.start >= RAW_END_IN_CODE && st.start >= RAW_END_IN_CODE, 'journalManager and submitTrade both sit outside the cut, below it…');
  eq([jm.start, jm.end, jm.chars, jm.form], [CONSUMER_JM_AT, CONSUMER_JM_END, CONSUMER_JM_CHARS, 'var'],
    '…journalManager opening at CONSUMER_JM_AT, ending at CONSUMER_JM_END, CONSUMER_JM_CHARS units long, a `var`…');
  eq([st.start, st.end, st.chars, st.form], [CONSUMER_ST_AT, CONSUMER_ST_END, CONSUMER_ST_CHARS, 'function'],
    '…and submitTrade opening at CONSUMER_ST_AT, ending at CONSUMER_ST_END, CONSUMER_ST_CHARS units long, a declared function…');
  ok(CODE.slice(jm.start).startsWith('var journalManager = (function() {'),
    '…the `var` holding an immediately-invoked function, which RUNS while the monolith is evaluated…');
  ok(/^async function /.test(firstLineOf(CODE.slice(st.start))), '…and submitTrade an async function, which calls the synchronous audit as a plain call and does not run at load.');
}
// THE LOAD ORDER IS LOAD-BEARING. One of the seven calls is in journalManager's INITIALISER, which loads the stored
// trades inside a `try` whose `catch(e) { _trades = []; }` empties the in-memory journal on ANY error. The
// initialiser is evaluated here against stubs for the few host functions it reaches, with one stored trade.
{
  const jm = BY_NAME.get('journalManager');
  const initSource = CODE.slice(jm.start, jm.end + 1);
  const run = (withAudit, stored) => {
    const calls = [];
    const ctx = vm.createContext({
      console: { log() {}, warn() {}, error() {}, debug() {} },
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      apexStorageKey: (k) => k,
      apexStorageKeyVariants: (k) => [k],
      apexNonDestructiveLoadArray: () => ({ arr: stored.map((id) => ({ id, legs: [] })), usedFallback: false }),
      _apexReadArray: () => [],
      _apexWriteArray: () => {},
      apexCreateBackup: () => {},
    });
    if (withAudit) ctx.journalTradeLegExpiryAudit = (label, trade) => { calls.push([label, trade && trade.id]); };
    vm.runInContext(initSource, ctx);
    return { calls, trades: vm.runInContext('journalManager.getAll().length', ctx) };
  };
  const withIt = run(true, [1]);
  eq(withIt.calls, EVAL_TIME_CALLS,
    'evaluating journalManager\'s initialiser with the audit function DEFINED and one stored trade calls it exactly EVAL_TIME_CALLS: once, with the label of the initial load…');
  eq(withIt.trades, JOURNAL_TRADES_WITH_AUDIT, '…and the journal holds that trade');
  eq(run(true, [1, 2]).calls, [[EVAL_TIME_CALLS[0][0], 1], [EVAL_TIME_CALLS[0][0], 2]],
    '…once per stored trade, with two stored trades two calls, so it is the initial-load call and no other that runs at evaluation time…');
  eq(run(true, []).calls, [], '…and none at all when nothing is stored');
  const without = run(false, [1]);
  eq(without.calls, [], 'with the audit function ABSENT the initialiser records no call…');
  eq(without.trades, JOURNAL_TRADES_WITHOUT_AUDIT,
    '…and the journal holds NO trade: the ReferenceError is swallowed by `catch(e) { _trades = []; }`, so a module loaded AFTER the monolith would start the journal empty');
  {
    const tryAt = initSource.indexOf("try {\n    var _load = apexNonDestructiveLoadArray('apex_trades');");
    const catchAt = initSource.indexOf('} catch(e) { _trades = []; }', tryAt);
    const siteAt = REC.sites[0] - jm.start;
    ok(tryAt >= 0 && catchAt > tryAt && siteAt > tryAt && siteAt < catchAt,
      '…the call sitting between the `try` that loads the stored trades and the `catch(e) { _trades = []; }` that closes it, read from the source rather than assumed');
    ok(initSource.slice(siteAt, siteAt + 80).indexOf("'" + EVAL_TIME_CALLS[0][0] + "'") >= 0,
      '…and that call is the FIRST of the seven, the one that carries the label of the initial load');
  }
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, so byConsumerSplit leaves nothing out…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…and is BY_CONSUMER_SPLIT, the same as byConsumer');
}
// NOTHING IS READ OR WRITTEN OUTSIDE THE BLOCK EXCEPT THE HOST: nothing is deleted or awaited, and the host is reached
// only through window and localStorage behind typeof guards, and console.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: two function declarations only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(await|yield|new|this)\b/g) || []).length, 0, '…no await, no yield, no `new` and no `this`…');
  eq((bodyMasked.match(/\b(globalThis|self|document|setTimeout|setInterval|fetch)\b/g) || []).length, 0,
    '…no globalThis, self, document, timer or fetch…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all…');
  eq((bodyMasked.match(/\blocalStorage\b/g) || []).length, HOST_STORAGE_MENTIONS, '…HOST_STORAGE_MENTIONS of localStorage…');
  eq((bodyMasked.match(/\bconsole\b/g) || []).length, HOST_CONSOLE_MENTIONS, '…and HOST_CONSOLE_MENTIONS of console…');
  eq((bodyMasked.match(/\blocalStorage\s*\.\s*\w+/g) || []).map((s) => s.replace(/\s+/g, '')), ['localStorage.getItem'],
    '…localStorage being only ever READ: the one method called on it is getItem, never setItem or removeItem…');
  eq((bodyMasked.match(/\bconsole\s*\.\s*\w+/g) || []).map((s) => s.replace(/\s+/g, '')), ['console.debug'],
    '…and console only ever through debug, never log');
  eq((bodyMasked.match(/\btypeof\s+(window|localStorage)\b/g) || []).length, 2,
    '…both host objects reached behind a `typeof` guard, which is what lets the block load and run with neither defined');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region that declares no top-level
// `var` scores a perfect zero inbound while writing globals it does not own, so the profile's answer is not
// left standing alone. Neither owner declares a `var` list, so the inherited scan needs no correction here.
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
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the previous contract named it first, and it now stands alone at the best score');
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
    '…the FIRST of them being THIS block\'s row, at its banner moved up by PREVIOUS_RAW_CHARS, with the same byConsumerSplit and raw nine and a length of BODY_CHARS: nothing about it changed…');
  eq(listed.slice(1).filter((r) => r[0] > PREVIOUS_RAW_AT).map((r) => r[0] - PREVIOUS_RAW_CHARS),
    [RUNNERS_UP[1][0], RUNNERS_UP[2][0]],
    '…two of the other three sitting AFTER that cut and moved down by PREVIOUS_RAW_CHARS into this contract\'s second and third runners-up…');
  eq(listed.slice(1).filter((r) => r[0] < PREVIOUS_RAW_AT).map((r) => r[0]), [RUNNERS_UP[0][0]],
    '…and one before it, which did not move: the first of this contract\'s');
  ok(listed.every((r) => r[0] !== RUNNERS_UP[3][0]),
    '…the fourth of this contract\'s runners-up being a row the previous contract did not list');
  // THE BEST TIER the previous contract recorded had two rows: the cut that shipped and THIS block.
  eq(listOf('BEST_TIER_ROWS').slice(1).map((r) => [r[0] - PREVIOUS_RAW_CHARS, r[1] - PREVIOUS_RAW_CHARS, r[2], r[3]]), BEST_TIER_ROWS,
    'the best tier the previous contract recorded was the cut that shipped plus ONE more row, and that row, moved down by PREVIOUS_RAW_CHARS, is exactly BEST_TIER_ROWS here');
  eq(listOf('BEST_TIER_ROWS').length, 1 + BEST_TIER_ROWS.length, '…so the tie that tier recorded left with the cut that shipped');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidate at 2…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2 && c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 1,
    '…and that one IS this block: the screen holds it');
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
    HIDDEN_SCORE_TWO_ROWS, '…the pass holding exactly HIDDEN_SCORE_TWO_ROWS, none');
  // EVERY ROW AT THE BEST TIER, over the screen and the pass together.
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units, c }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc, c })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    'in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit…');
  const best = rows.filter((r) => r.bcs <= BY_CONSUMER_SPLIT).map((r) => [r.lo, r.hi, r.nine, r.bcs])
    .sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
  eq(best, BEST_TIER_ROWS, '…and the rows AT it are exactly BEST_TIER_ROWS: this block, ALONE');
  eq(new Set(best.map((r) => r[0])).size, OPENINGS_AT_TWO_OR_BELOW,
    '…over OPENINGS_AT_TWO_OR_BELOW distinct opening');
  eq(best.length, OPENINGS_AT_TWO_OR_BELOW, '…counted over the rows as well as the openings, so a second row at one opening could not hide');
  eq(Math.min.apply(null, best.map((r) => r[2])), BEST_NINE, '…its raw nine being BEST_NINE');
  // THE NEXT SCORE, counted the same way, so "alone" means something: the rows one step behind.
  const atThree = rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT + 1);
  eq(atThree.length, ROWS_AT_THREE, 'the next score up, 3, is held by ROWS_AT_THREE rows over the two enumerations…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT + 1).length, ROWS_AT_THREE_SCREEN,
    '…ROWS_AT_THREE_SCREEN of them in the shipped screen…');
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT + 1).length, ROWS_AT_THREE_HIDDEN, '…and ROWS_AT_THREE_HIDDEN in the pass over sub-floor runs…');
  eq(Math.min.apply(null, atThree.map((r) => r.nine)), LOWEST_NINE_AT_THREE,
    '…the lowest raw nine among them being LOWEST_NINE_AT_THREE, BELOW this block\'s BEST_NINE: the ranking key puts byConsumerSplit first, so a lower raw nine at 3 does not outrank it');
  ok(LOWEST_NINE_AT_THREE < BEST_NINE, '…which IS below BEST_NINE, so the order depends on the key and not on the raw nine alone');
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
  ok(ranked.every((r) => r[1] === BY_CONSUMER_SPLIT + 1), '…every one of them at 3, none at the best score: this block has no second');
}

// ───────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: nothing above, every owner below, the three runs the block makes, the region and its banner');
// ───────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const OWNERS_UP = REGION_OWNER_LIST.slice(0, OWNER_POSITION - 1).reverse();
const OWNERS_DOWN = REGION_OWNER_LIST.slice(OWNER_POSITION - 1 + OWNER_COUNT);
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
const priceDown = (d) => {
  const hb = downEnd(d);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  const l = loadTimeProfile(RAW_AT_IN_CODE, hb);
  let seam = null; try { seam = assertSeam(CODE, RAW_AT_IN_CODE, hb); } catch (e) { seam = null; }
  return { hb, p, bcs: byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), clean: runsNothingAtLoad(l), seam };
};
eq(REGION_OWNER_LIST.findIndex((d) => d.name === ENABLED) + 1, OWNER_POSITION, 'the cut opens on owner number OWNER_POSITION of its region…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and takes the next OWNER_COUNT, which are its two: the FIRST owners of their region, with nothing above them and owners below');
// NOTHING ABOVE IT IN THE REGION: it is the first owner, so extending upward would cross the banner into another region.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut, so there is nothing above to take…');
eq(EXTENSIONS_UP, [], '…and no row to price: the pinned list is empty, and the control below shows the pricing is not a function returning nothing');
eq(REGION.start, RAW_AT_IN_CODE, '…the region opening exactly where the cut does, at the banner');
{
  // CONTROL: the same slicing, for a cut that opened on owner number 2 of this region, finds the one owner above it,
  // so an empty list above is the position of THIS cut and not a slice that returns nothing.
  eq(REGION_OWNER_LIST.slice(0, 2 - 1).reverse().map((d) => d.name), [ENABLED],
    'control — had the cut opened on owner number 2, the same slicing would find exactly one owner above it: ' + ENABLED);
}
// EVERY OWNER BELOW IT IN THE REGION. Here there are three. Each is priced as the cut extended down to the end of that owner.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the block…');
{
  const priced = OWNERS_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL of the ends at them real seams, every owner below being separated from the next by a blank line…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit, so no stopping point below is better or ties…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load…');
  eq(Math.min.apply(null, priced.map((r) => r.p.nine)), DOWN_LOWEST_NINE, '…the lowest raw nine among them being DOWN_LOWEST_NINE…');
  eq(Math.min.apply(null, priced.map((r) => r.bcs)), DOWN_LOWEST_BCS, '…and the lowest byConsumerSplit DOWN_LOWEST_BCS, both above the cut\'s');
  eq(priced.map((r) => [r.name, r.hb, r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length]),
    EXTENSIONS_DOWN, 'all three are exactly EXTENSIONS_DOWN, pinned in full');
  ok(EXTENSIONS_DOWN.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…each pinned closing agreeing with its pinned length');
  eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).map((c) => c.units), [BODY_CHARS].concat(EXTENSIONS_DOWN.map((e) => e[2])),
    '…and the shipped screen enumerates exactly four runs that open at the banner: the cut and these three, so the screen has priced the same ones');
  // THE LAST OWNER BELOW ENDS THE REGION, so taking all three is taking the whole region.
  const last = priced[priced.length - 1];
  const whole = profileOf([REGION.start, REGION.end]);
  eq([last.p.nine, last.bcs], [whole.nine, byConsumerSplit(whole, outboundSplit(REGION.start, REGION.end))],
    '…the last of them scoring exactly what the WHOLE region scores, because it is the whole region');
}
// THE THREE RUNS THE TWO OWNERS MAKE. The enabled check alone, the audit function alone and the pair. A blank line stands
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
  eq(legal.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR,
    '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR, the cut being the one that clears it…');
  ok(candidateRuns.filter((c) => legal.filter((r) => r[4] < RUN_FLOOR).some((r) => r[2] === c.lo && r[3] === c.hi)).length === 0 &&
    hiddenRows.filter((c) => legal.filter((r) => r[4] < RUN_FLOOR).some((r) => r[2] === c.lo && r[3] === c.hi)).length === 0,
  '…and neither the shipped screen nor the pass over its sub-floor runs holds either of them…');
  eq(legal.filter((r) => r[4] < RUN_FLOOR).map((r) => [r[0], r[5], r[6], r[7].length]),
    [[ENABLED, 1, 1, 0], [AUDIT, 8, 3, 1]],
    '…the enabled check alone scoring 1 on both measures and the audit function alone scoring worse than the pair on both, with one dependency: the enabled check it would leave behind…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[RAW_AT_IN_CODE, BODY_END_IN_CODE]],
    '…and the shipped screen enumerating exactly ONE run inside the block, the cut itself');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner region" would forbid cutting any of
// it. This cut is the FIRST TWO owners of a region of five: it takes the banner with it, and what it leaves is
// three owners that no longer have a banner of their own.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, where the cut does');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
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
  // WHAT THE CUT LEAVES BEHIND. The banner goes with the block, so the owners left in the region lose their heading.
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
  eq([before.marks.length, after.marks.length], [BANNER_MARKS, BANNER_MARKS_AFTER_CUT],
    'the cut takes ONE banner with it: the document\'s top-level banners go from BANNER_MARKS to BANNER_MARKS_AFTER_CUT…');
  eq([before.regions.length, after.regions.length], [OWNER_REGIONS, REGIONS_AFTER_CUT],
    '…and its owner regions from OWNER_REGIONS to REGIONS_AFTER_CUT…');
  const above = before.regions.filter((r) => r.end === reg.start)[0];
  eq(above.start, REGION_ABOVE_AT, '…the region directly above it opening at REGION_ABOVE_AT…');
  ok(lineAt(above.start).startsWith(REGION_ABOVE_BANNER_PREFIX), '…on the REGION_ABOVE_BANNER_PREFIX banner…');
  eq(before.decls.filter((d) => d.start >= above.start && d.end < above.end).length, REGION_ABOVE_OWNERS, '…and holding REGION_ABOVE_OWNERS owners before the cut…');
  const aboveAfter = after.regions.filter((r) => r.start === REGION_ABOVE_AT)[0];
  eq(after.decls.filter((d) => d.start >= aboveAfter.start && d.end < aboveAfter.end).length, REGION_ABOVE_OWNERS + LEFT_OWNERS.length,
    '…and that many plus the owners left behind after the cut');
  eq(after.decls.filter((d) => d.start >= aboveAfter.start && d.end < aboveAfter.end).slice(-LEFT_OWNERS.length).map((d) => d.name), LEFT_OWNERS,
    '…the last LEFT_OWNERS.length of them being exactly LEFT_OWNERS: the three option-live owners, now under the ADD POSITION FORM banner');
  ok(!clean.includes(DOC_FIRST_LINE), '…the banner of the cut block appearing nowhere in what remains');
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
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).length, 0,
  '…and the screen enumerates NO run that opens there: the first owner of a region is measured from the region\'s start, so every run that includes this block opens at the banner instead');

// ─────────────────────────────────────────────────────────────────────
section('7. The SHIPPED module loads bare, the gate is read at call time, and the audit payload and failures are measured');
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
  const KEY = 'APEX_DEBUG_JOURNAL_EXPIRY';
  const mk = (globals) => {
    const c = vm.createContext(Object.assign(Object.create(null), globals || {}));
    vm.runInContext(MODULE, c);
    return c;
  };
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM and declares exactly its two owners');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.constructor.name', bare)), ['Function', 'Function'],
    '…ordinary synchronous functions');
  eq(VM_GLOBALS.map((n) => vm.runInContext(n + '.length', bare)), [0, 2], '…the gate taking nothing and the audit a label and a trade');
  eq(vm.runInContext(ENABLED + '()', bare), false, '…and in that bare VM, with no window and no localStorage, the gate answers FALSE: disabled by default');
  const gate = (globals) => vm.runInContext(ENABLED + '()', mk(globals));
  const ls = (value, rec) => ({ getItem(k) { if (rec) rec.push(k); return value; } });

  // THE GATE: window first, localStorage second, strict equality on both, and any read that throws counts as off.
  {
    const CASES = [
      [{}, false],
      [{ window: {} }, false],
      [{ window: { [KEY]: true } }, true],
      [{ window: { [KEY]: 1 } }, false], [{ window: { [KEY]: 'true' } }, false], [{ window: { [KEY]: false } }, false], [{ window: { [KEY]: undefined } }, false],
      [{ localStorage: ls('1') }, true],
      [{ localStorage: ls('0') }, false], [{ localStorage: ls('true') }, false], [{ localStorage: ls(1) }, false], [{ localStorage: ls(null) }, false], [{ localStorage: ls('') }, false],
      [{ window: { [KEY]: true }, localStorage: ls('0') }, true],
      [{ window: { [KEY]: false }, localStorage: ls('1') }, true],
      [{ window: { [KEY]: 1 }, localStorage: ls('0') }, false],
      [{ localStorage: { getItem() { throw new Error('storage blocked'); } } }, false],
      [{ localStorage: {} }, false],
      [{ window: { [KEY]: true }, localStorage: { getItem() { throw new Error('storage blocked'); } } }, true],
      [{ window: Object.defineProperty({}, KEY, { get() { throw new Error('getter'); } }), localStorage: ls('1') }, true],
      [{ window: Object.defineProperty({}, KEY, { get() { throw new Error('getter'); } }) }, false],
    ];
    eq(CASES.map(([g]) => gate(g)), CASES.map(([, want]) => want),
      'the gate answers the pinned value for each of ' + CASES.length + ' states of window and localStorage: strict `=== true` on window, strict `=== \'1\'` on storage, and a throw from either read is swallowed');
    ok(CASES.some(([, w]) => w) && CASES.some(([, w]) => !w), '…the table holding both answers, so it is not a table of one answer');
    // WHICH KEY IT ASKS FOR, and whether it asks at all.
    const asked = [];
    gate({ localStorage: ls(null, asked) });
    eq(asked, [KEY], 'the gate asks storage for exactly ' + KEY + ', once…');
    const askedWhenWindowOn = [];
    gate({ window: { [KEY]: true }, localStorage: ls('0', askedWhenWindowOn) });
    eq(askedWhenWindowOn, [], '…and does not ask at all when window already says yes');
    // READ AT CALL TIME: the switch is flipped after the block has loaded, which is what "enable it from the console" means.
    const w = {};
    const c = mk({ window: w });
    const now = () => vm.runInContext(ENABLED + '()', c);
    eq([now(), (w[KEY] = true, now()), (w[KEY] = false, now()), (delete w[KEY], now())], [false, true, false, false],
      '…and the switch is read at CALL time, not captured at load: flipping window.' + KEY + ' after load flips the answer both ways');
  }

  // THE AUDIT: a fake console records everything; the gate is a window flag.
  const harness = (extra) => {
    const rec = [];
    const store = [];
    const consoleStub = {
      debug(...a) { rec.push(['debug', a]); if (extra && extra.debugThrows) throw new Error('console broke'); },
      log(...a) { rec.push(['log', a]); }, info(...a) { rec.push(['info', a]); },
      warn(...a) { rec.push(['warn', a]); }, error(...a) { rec.push(['error', a]); },
    };
    const w = { [KEY]: !(extra && extra.off) };
    const c = mk({ window: w, console: consoleStub, localStorage: { getItem() { return null; }, setItem(k, v) { store.push([k, v]); }, removeItem(k) { store.push([k]); } } });
    return { rec, store, run: (label, trade) => { c.L = label; c.T = trade; return vm.runInContext(AUDIT + '(L, T)', c); } };
  };
  const payloadOf = (trade, label = 'lbl') => {
    const h = harness();
    const ret = h.run(label, trade);
    const debugs = h.rec.filter((r) => r[0] === 'debug');
    return { h, ret, debugs, others: h.rec.filter((r) => r[0] !== 'debug') };
  };
  // DISABLED: nothing is written and the trade is not even READ.
  {
    const trap = {};
    let reads = 0;
    ['id', 'tradeId', 'ticker', 'symbol', 'expiry', 'legs'].forEach((k) => Object.defineProperty(trap, k, { get() { reads++; throw new Error('read ' + k); } }));
    const h = harness({ off: true });
    const ret = h.run('lbl', trap);
    eq([ret, h.rec.length, h.store.length], [undefined, 0, 0],
      'with the switch OFF the audit returns undefined and writes NOTHING, to console or storage…');
    eq(reads, 0, '…and a trade whose every field throws on read was never read: the gate is the first thing the audit does');
    const on = harness();
    on.run('lbl', trap);
    ok(reads > 0, 'control — the same trap IS read once the switch is ON, so the zero above is a measurement and not a trap that cannot fire');
  }
  // ENABLED: the payload, key by key.
  {
    const trade = {
      id: 7, ticker: 'SPY', expiry: '2026-01-16',
      legs: [{ expiry: '2026-01-16', expiration: 'e2', expirationDate: 'e3', streamerSymbol: '.SPY260116C500', optionSymbol: 'SPY  260116C00500000', strike: 500, extra: 'ignored' }],
    };
    const snapshot = JSON.stringify(trade);
    const r = payloadOf(trade, 'journalManager.add input');
    eq([r.debugs.length, r.others.length, r.ret], [1, 0, undefined],
      'with the switch ON the audit makes exactly ONE console.debug call, no other console call of any kind, and returns undefined…');
    eq(r.debugs[0][1].length, 2, '…passing two arguments…');
    eq(r.debugs[0][1][0], '[JOURNAL-EXPIRY-AUDIT] journalManager.add input', '…the first the tag and the label…');
    const expected = {
      tradeId: 7, ticker: 'SPY', tradeExpiry: '2026-01-16',
      legs: [{ legIndex: 0, expiry: '2026-01-16', expiration: 'e2', expirationDate: 'e3', streamerSymbol: '.SPY260116C500', optionSymbol: 'SPY  260116C00500000' }],
    };
    eq(r.debugs[0][1][1], JSON.stringify(expected),
      '…and the second the exact JSON of the payload, byte for byte, which pins every key and the ORDER of the keys: tradeId, ticker, tradeExpiry, legs; legIndex, expiry, expiration, expirationDate, streamerSymbol, optionSymbol');
    eq(JSON.stringify(trade), snapshot, '…the trade it was handed unchanged afterwards, extra fields and all (strike and extra are not in the payload)');
    eq(r.h.store, [], '…and nothing written to storage');
    eq(payloadOf(Object.freeze({ id: 1, legs: Object.freeze([Object.freeze({})]) })).debugs.length, 1, '…and a frozen trade is read without writing to it');
    eq(payloadOf(trade, 5).debugs[0][1][0], '[JOURNAL-EXPIRY-AUDIT] 5', 'a non-string label is concatenated as it is: 5 becomes "5"');
    const omitted = harness();
    omitted.run(undefined, trade);
    eq(omitted.rec[0][1][0], '[JOURNAL-EXPIRY-AUDIT] undefined', '…and an omitted label becomes the text "undefined"');
  }
  // THE FALLBACK CHAINS, each alone and in priority order.
  {
    const one = (trade) => JSON.parse(payloadOf(trade).debugs[0][1][1]);
    eq([{ id: 1, tradeId: 2 }, { tradeId: 2 }, { id: 0, tradeId: 3 }, { id: '', tradeId: '' }, {}].map((t) => one(t).tradeId), [1, 2, 3, null, null],
      'tradeId is id, then tradeId, then null — an id of 0 or "" is FALSY and falls through, which the table shows');
    eq([{ ticker: 'A', symbol: 'B' }, { symbol: 'B' }, { ticker: '', symbol: 'B' }, { ticker: '', symbol: '' }, {}].map((t) => one(t).ticker), ['A', 'B', 'B', null, null],
      '…ticker is ticker, then symbol, then null by the same rule');
    eq([
      { expiry: 'a', expiryDate: 'b', expiration: 'c', expirationDate: 'd' },
      { expiryDate: 'b', expiration: 'c', expirationDate: 'd' },
      { expiration: 'c', expirationDate: 'd' },
      { expirationDate: 'd' },
      { expiry: '', expiryDate: '', expiration: '', expirationDate: '' },
      {},
    ].map((t) => one(t).tradeExpiry), ['a', 'b', 'c', 'd', null, null],
    '…and tradeExpiry is expiry, then expiryDate, then expiration, then expirationDate, then null');
    // THE LEGS: `!= null` keeps 0, "" and false; null and undefined become null.
    const legs = one({ legs: [null, undefined, {}, { expiry: 0, expiration: '', expirationDate: false, streamerSymbol: null, optionSymbol: undefined }, { optionSymbol: 'X' }] }).legs;
    eq(legs.map((l) => l.legIndex), [0, 1, 2, 3, 4], 'legIndex is the position in the array, holes in the data included…');
    eq(legs.slice(0, 3).map((l) => [l.expiry, l.expiration, l.expirationDate, l.streamerSymbol, l.optionSymbol]),
      [[null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null]],
      '…a null leg, an undefined leg and an empty leg each become all-null…');
    eq([legs[3].expiry, legs[3].expiration, legs[3].expirationDate, legs[3].streamerSymbol, legs[3].optionSymbol], [0, '', false, null, null],
      '…while 0, "" and false are KEPT (the test is `!= null`, not truthiness) and null and undefined become null…');
    eq(legs[4].optionSymbol, 'X', '…and a lone field is carried through');
    eq([{}, { legs: null }, { legs: undefined }, undefined, null, 0, ''].map((t) => one(t).legs), [[], [], [], [], [], [], []],
      'a trade with no legs, null legs, no trade, a null trade or a falsy trade gives an EMPTY legs array, never a failure');
    eq(one(undefined), { tradeId: null, ticker: null, tradeExpiry: null, legs: [] }, '…and the whole payload for no trade is all-null with an empty array');
  }
  // FAILURES ARE SWALLOWED, and where they happen relative to what was already written.
  {
    const circular = { id: {} }; circular.id.self = circular.id;
    const cases = [
      ['legs that is not an array (5)', { id: 1, legs: 5 }],
      ['legs that is a string', { id: 1, legs: 'ab' }],
      ['a getter that throws on read', Object.defineProperty({}, 'ticker', { get() { throw new Error('read'); } })],
      ['a value JSON cannot serialise (circular)', circular],
    ];
    for (const [what, trade] of cases) {
      const r = payloadOf(trade);
      eq([r.ret, r.debugs.length, r.others.length], [undefined, 0, 0], 'a trade with ' + what + ' raises nothing, returns undefined and writes NOTHING: the failure happens before the one console call');
    }
    const h = harness({ debugThrows: true });
    eq([h.run('lbl', { id: 1 }), h.rec.filter((x) => x[0] === 'debug').length], [undefined, 1],
      'and when console.debug ITSELF throws the audit still returns undefined, the failure being after the one call it made');
  }
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(), 'calling either function defines no global in the VM it runs in');
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
  // THE THREE CHAIN-WIDE COUNTS, and the audit forecast that the banner count ALONE
  // would move. The two shape counts are asserted as comparisons between two
  // measurements, over the chain before this layer and over the whole chain,
  // rather than carried forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is NOT, asserted of the module directly: it holds NON_ASCII_CHARS non-ASCII characters, two em dashes and three box-drawing characters, all in comments…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS, '…the SAME number: it did not move, as the audit forecast');
  eq(prior.filter(banner).length, PRIOR_LAYERS_OPENING_ON_BANNER,
    'PRIOR_LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(banner(MODULE), '…and this module DOES, asserted of the module directly: it opens on the `// ── [JOURNAL-EXPIRY-AUDIT]` banner…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is LAYERS_OPENING_ON_BANNER…');
  eq(LAYERS_OPENING_ON_BANNER, PRIOR_LAYERS_OPENING_ON_BANNER + 1, '…one more: it MOVED, by exactly the one the audit forecast, the only one of the shape counts that did');
  // THE THIRD CHAIN-WIDE COUNT, and one that did not move: layers whose
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
  // THE AUDIT ASSERTED THAT NOTHING MOVED. This phase moves exactly the audited
  // bytes and nothing else, so the claim is inverted rather than dropped: TWO
  // production paths, the document and the new module, and no third.
  const all = Array.from(new Set(changed.concat(status)));
  // The phase that shipped this layer moved exactly the audited bytes and nothing else. It now reads
  // against a base that a LATER layer has also moved past, so the footprint is the document, this
  // layer's module, and the module of every layer cut after it.
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-regime-badge-html.js', 'js/portfolio/portfolio-backend-squeeze-extract.js'].sort(),
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
    '…and OPENS on the banner, DOC_FIRST_LINE: the boundary §2 defends');
  eq(MODULE.slice(MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1, MODULE.indexOf('\n', MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1)), DECL_FIRST_LINE,
    '…with the declaration, DECL_FIRST_LINE, on the line after the ten comment lines…');
  eq(MODULE.indexOf(DECL_FIRST_LINE), DOC_TAKEN, '…at exactly DOC_TAKEN units in');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * NON_ASCII_CHARS,
    '…its UTF-8 length longer than its UTF-16 length by two bytes per non-ASCII character…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…of which it holds NON_ASCII_CHARS…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…EM_DASHES of them em dashes…');
  eq((MODULE.match(/─/g) || []).length, BOX_DRAWING_CHARS, '…and BOX_DRAWING_CHARS box-drawing characters, the rest…');
  eq(MODULE.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).map((l) => l.trim().startsWith('//')), Array(NON_ASCII_LINES).fill(true),
    '…on NON_ASCII_LINES lines, every one of them a comment line, so no non-ASCII character is code or sits inside a string');
}
// THE LOAD ORDER, WHICH IS LOAD-BEARING (§3): last of the local scripts, immediately before the inline
// monolith, whose two consumers stay behind, one of them calling the audit function while the monolith is still
// being evaluated.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/portfolio/portfolio-stale-mark-squeeze-state.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumers call it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES THE AUDIT FUNCTION, at the seven consumer sites and nowhere else: the
  // block's own text left, the calls did not. The enabled check is named nowhere at all any more.
  eq(OWNERS_EXPECTED.map((n) => refSites(LIVE_INDEX, n).length), [0, CONSUMER_SITES],
    '…while the shipped document names the enabled check NOWHERE and the audit function at the CONSUMER_SITES calls that stayed…');
  eq(refSites(MASKED, AUDIT).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, CONSUMER_SITES,
    '…the same CONSUMER_SITES the reconstructed base held from outside the block…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t, rel) => t + OWNERS_EXPECTED.reduce((u, n) =>
    u + refSites(fs.readFileSync(path.join(ROOT, rel), 'utf8'), n).length, 0), 0), 0,
  '…and no local script other than the module itself names either owner…');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its two owners and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMERS.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    CONSUMERS.slice().sort(), '…and so do both consumers, which call the module\'s audit function');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, stays too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the brace of the owner above, one blank line and the declaration of ' + NEXT_DECL + ', once…');
  eq(LIVE_MONOLITH.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…at the place the cut was made');
  // CONTROL: the same predicate fails on a document with the tag moved, so the
  // pin is a measurement and not a statement that is true of any document.
  const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
  const movedLocals = APP_LOADER.parseScriptTags(moved)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  ok(movedLocals.indexOf(MODULE_REL) !== TAG_LOCAL_INDEX && movedLocals[movedLocals.length - 1] !== MODULE_REL,
    'control — with the tag moved to the top of the document, both of those pins would fail');
}
// THE LOAD ORDER, EVALUATED ON THE SHIPPED DOCUMENT. §3 showed on the reconstructed base that journalManager's
// initialiser empties the journal when the audit function is missing. The same initialiser is taken from the SHIPPED
// monolith, which no longer declares the function, and evaluated with the shipped module loaded before it and after it.
{
  const jm = scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === 'journalManager')[0];
  const initSource = LIVE_MONOLITH.slice(jm.start, jm.end + 1);
  const evaluate = (moduleFirst) => {
    const debugs = [];
    const ctx = vm.createContext({
      console: { log() {}, warn() {}, error() {}, debug(...a) { debugs.push(a); } },
      window: { APEX_DEBUG_JOURNAL_EXPIRY: true },
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      apexStorageKey: (k) => k,
      apexStorageKeyVariants: (k) => [k],
      apexNonDestructiveLoadArray: () => ({ arr: [{ id: 1, legs: [] }], usedFallback: false }),
      _apexReadArray: () => [],
      _apexWriteArray: () => {},
      apexCreateBackup: () => {},
    });
    if (moduleFirst) vm.runInContext(MODULE, ctx);
    vm.runInContext(initSource, ctx);
    if (!moduleFirst) vm.runInContext(MODULE, ctx);
    return { debugs, trades: vm.runInContext('journalManager.getAll().length', ctx) };
  };
  const first = evaluate(true), after = evaluate(false);
  eq(first.trades, JOURNAL_TRADES_WITH_AUDIT, 'with the shipped module loaded BEFORE the monolith\'s initialiser the journal holds the stored trade…');
  eq(first.debugs.map((d) => d[0]), ['[JOURNAL-EXPIRY-AUDIT] ' + EVAL_TIME_CALLS[0][0]],
    '…and the audit ran once while it was evaluated, the diagnostic being switched on in this harness, under the label of the initial load…');
  eq(after.trades, JOURNAL_TRADES_WITHOUT_AUDIT,
    'with the module loaded AFTER the initialiser the journal holds NO trade: the order the tag pins is the difference between the two…');
  eq(after.debugs, [], '…and the audit did not run at all during evaluation');
}
// THE UNDO'S REACHABLE GUARDS, each driven by PLANTING the exact violation it
// claims to catch. A guard that is never made to fire is a guard nobody has
// checked, and its EXACT message is asserted so a mutant cannot pass by raising
// some other error. BASE_IDENTITY is deliberately absent: the helper's header
// states it is a redundant final gate, unreachable once the module digest and
// the whole-document digest have both passed.
{
  const E = 'JOURNAL_EXPIRY_AUDIT_UNDO_';
  throwsWith(() => UNDO.undoJournalExpiryAudit(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 2,092 units, not 2,091 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('legIndex', 'legIndeX');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoJournalExpiryAudit(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoJournalExpiryAudit(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoJournalExpiryAudit(INDEX, MODULE),
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
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/journal-expiry-audit-undo.js'),
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
console.log('JOURNAL_EXPIRY_AUDIT_CONTRACT_OK');
}

main();
