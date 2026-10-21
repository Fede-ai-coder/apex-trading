'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// APEX PARITY BACKEND FETCH EXTRACTION — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [1174762,1176434) in monolith coordinates — 1,672 units raw and
// 1,671 of body, TWO owners, both async — into js/services/apex-parity-backend-fetch.js.
// `_apexParityWarmupBackend(symbol, timeframe, waitMs)` asks the backend to start streaming candles
// for a symbol and a timeframe: it maps the timeframe to the ones the backend can warm, records the
// request, POSTs it and answers the status and the reply. `_apexParityFetchBackend(symbol, timeframe)`
// reads the candles back with a plain GET. Both belong to the dev-only candle-parity tool, and both
// are called from ONE place, its console entry point `apexDebugCompareCandles`. The block has no
// documentation of its own: it opens on the first declaration, with a blank line above it, and the
// blank line AFTER it, in front of the comment block of the console entry point, is the separator.
//
// ── THE FINDING, PART ONE: TWO ROWS TIE AT THE BEST SCORE, AND THE KEY ORDERS THEM ──
// ── BY LENGTH ALONE ───────────────────────────────────────────────────────────
//
// The contract before this layer published this block as the first of four runners-up, with the
// next row at the same (byConsumerSplit, raw nine) = (3, 8) behind it, the two of them tied with
// the block that led them at (3, 8), which has shipped. Measured again on the base that cut left,
// those two rows still TIE at (3, 8) over the screen and the pass together. The published key (byConsumerSplit,
// raw nine, units ascending) puts this block first by LENGTH ALONE, 1,671 units against 1,815. The
// other row is this block EXTENDED UP by one owner, `_apexParityWarmupTimeframes`, and what the
// extra owner changes is where the eight comes from: this block carries one consumer and two
// dependencies, the other two consumers and one, the second consumer being a TOP-LEVEL statement of
// the monolith. §4 measures both rows and §3 the statement. No row scores below 3, and the next
// rows behind them are one step behind on byConsumerSplit with a LOWER raw nine, which §4 shows is
// the ordering the key means.
//
// ── PART TWO: THE FLOOR REMOVES TWO RUNS THAT SCORE BETTER ──────────────────────
//
// The two owners make three runs between them. The cut is the only one that clears the screen's
// RUN_FLOOR of 1,500 units: the warm-up alone is 1,232 units and scores (3, 5), the fetch alone is
// 438 and scores (1, 3). Both score no worse than the cut on byConsumerSplit and better on the raw
// nine, and the floor is a gate on SIZE and not on coupling. The audit says so rather than leaving
// it to be found: §5 measures all three runs, and the fetch alone would be a layer of less than a
// third of the smallest the programme has shipped. The cut is the SHORTEST run that opens at its
// declaration and clears the floor; §6 counts the seven runs that open there.
//
// ── PART THREE: TWO CALLS FROM ONE CONSUMER, TWO DEPENDENCIES, FOUR FOUNDATION READS ──
//
// The raw nine is 8: two inbound references, two dependencies and four references to shipped
// foundation modules. The two references are CALLS, each awaited inside the body of the one
// consumer. The two dependencies are declared synchronous functions that STAY in the monolith:
// `_apexParityWarmupTimeframes`, called once, and `_recordCandleSubscriptionRequest`, called
// twice, both from the warm-up owner; the fetch owner records nothing. The foundation references
// are `BACKEND` and `_backendAuthHeaders`, twice each, from js/config/backend-config.js and
// js/api/backend-client.js, both loaded before the inline monolith and neither a layer of the chain.
// The block writes no monolith name, deletes nothing, touches the host through none of window,
// document, storage, console or timers, and uses the host's `fetch`, `AbortSignal`, `JSON`, `Math`
// and `encodeURIComponent`.
//
// ── PART FOUR: NOTHING IS EVALUATED AS THE MONOLITH LOADS, AND BOTH CALLS ARE MEASURED ──
//
// Neither site is outside a function body, and the block reads nothing as it is
// evaluated, so it loads in a bare VM, where calling either owner returns a promise that REJECTS
// with ReferenceError for the first thing it reads. §3 measures where the sites are. It does NOT
// measure what calls the consumer, so it does not show that nothing runs it while the monolith is
// being evaluated; Phase 2 puts the tag directly in front of the inline monolith, which makes the
// question moot rather than answered here. §7 drives both owners in a VM beside the REAL
// `_apexParityWarmupTimeframes` and recording stand-ins for the base URL, the auth headers, the
// recorder, the timeout and `fetch`, and pins every branch, among them three quirks it leaves
// alone: the skip record has a different SHAPE from the request record, a wait passed as a numeric
// string concatenates into a timeout of 500,010,000 ms, and a missing symbol is encoded as the
// word `undefined`.
//
// ── PART FIVE: THREE OPENINGS WERE LEGAL, AND THE BLANK LINE STAYS ──────────────
//
// The seam rule admits three line starts between the owner above and the first declaration: the
// closing brace of `_apexParityWarmupTimeframes`, the blank line after it and the declaration. Two
// of them parse as a program; the one on the brace does not. The cut opens on the declaration, so
// the join it leaves, the brace of `_apexParityWarmupTimeframes` against the comment block of the
// console entry point across one blank line, is a shape the monolith already holds 190 times and
// holds the same number of times afterwards; §2 counts it, and shows that cutting at the blank line
// instead would fuse that brace onto the comment block.
//
// ── PART SIX: THE CUT SITS INSIDE ITS REGION, AND TAKES NO BANNER ───────────────
//
// The block is owners 6 and 7 of the thirteen of a `// ═══` region, so the cut takes no banner: the
// document's top-level banner marks stay at 214 and its owner regions at 113, and the region shrinks
// by the 1,672 units the cut takes and loses two owners. §5 prices every owner on each side in
// turn: the first one above, `_apexParityWarmupTimeframes` with its comment block, TIES the cut on
// the raw nine and on byConsumerSplit and the four beyond it are worse; all six below are worse, and
// the five past the console entry point also run something at load.
//
// ── PRICED, AND WHERE IT WOULD SIT ──────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-six layers the chain holds: it would rank sixth, with five
// layers smaller and sixty-one larger, measured against every layer. Its body is pure ASCII, so the
// pure-ASCII count WOULD move; it opens on a declaration and not on a banner, so neither banner
// count would; and it pins a NON-EMPTY monolith dependency list, so the count of layers that pin
// one WOULD move, by one. §8 measures all four.
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

const MODULE_REL_IF_CUT = 'js/services/apex-parity-backend-fetch.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'ddf0897';
const BASE_CHARS = 1410336;
const BASE_UTF8 = 1438653;
const BASE_LF = 24329;
const BASE_SHA256 = 'cadfe025fdb363cb702a0f285ca9c53b1b464f321f08c1ab38ece5c62908d3f3';
const LOCAL_SCRIPTS = 110;
const TEST_FILE_COUNT = 195;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-apex-parity-backend-fetch-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/apex-parity-backend-fetch-audit.spec.js';
const RATCHETED_CONTRACTS = 57;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/swing-trend-context-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 246;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/swing-trend-context-contract.spec.js';
const RETIRED_MUTANTS = 240;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116689;
const CODE_CHARS = 1293621;
const TOP_LEVEL_DECLS = 880;
const OWNER_REGIONS = 113;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the declaration line of `_apexParityWarmupBackend`, which has no documentation of its own, and runs through the
// closing brace of `_apexParityFetchBackend`. The blank line above it stays behind; the blank line AFTER the block, in front of
// the comment block of `apexDebugCompareCandles`, is the structural separator.
const RAW_AT_IN_CODE = 1174762;
const DECL_AT_IN_CODE = 1174762;
const RAW_END_IN_CODE = 1176434;
const BODY_END_IN_CODE = 1176433;
const RAW_CHARS = 1672;
const BODY_CHARS = 1671;
const BODY_UTF8 = 1671;
const BODY_LF = 28;
const BODY_SHA256 = '6ddc6c3ed057e05b9373ae687d18338bfc65b8a51012238333e9dce8a02468cf';
const BODY_ENDING = '}\n';
const DECL_FIRST_LINE = 'async function _apexParityWarmupBackend(symbol, timeframe, waitMs) {';
const NEXT_DECL = 'apexDebugCompareCandles';
const NEXT_DOC_PREFIX = '// window.apexDebugCompareCandles(symbol, timeframe, options)';

// ── Its owners ──────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['_apexParityWarmupBackend', '_apexParityFetchBackend'];
const OWNER_SIZES = [1231, 437];
const OWNER_BEFORE = '_apexParityWarmupTimeframes';

// ── Its shape ───────────────────────────────────────────────────────────────
const SPLIT_LINES = 28;
const CODE_LINES = 27;
const COMMENT_LINES = 0;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam admits ─────────────────────
const BRACE_OPENING = 1174759;
const BLANK_OPENING = 1174761;
const SEAM_LEGAL_OPENINGS = 3;
const PARSING_OPENINGS = 2;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 1174760;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const CANDIDATES_AT_CUT = 1;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut leaves behind: the closing brace of the owner above, one blank line, and the comment block of the NEXT owner,
// a join the monolith already holds, once, at the end of the block; and what it removes: the join of that brace against
// this block's own first declaration. Taking the blank line as well would fuse the brace straight onto that comment block.
const JOIN_AFTER_CUT = '}\n\n' + NEXT_DOC_PREFIX;
const JOIN_AS_BEFORE = '}\n\nasync function _apexParityWarmupBackend';
const FUSED_IF_BLANK_TAKEN = '}\n' + NEXT_DOC_PREFIX;
const JOINS_LIKE_THE_CUT_BEFORE = 190;
const ASYNC_JOINS_BEFORE = 14;

// ── The banner region it sits inside ─────────────────────────────────────────
// A `// ═══` header region of THIRTEEN owners, the dev-only candle-parity tool: the cut is its owners 6 and 7.
const REGION_AT = 1171562;
const REGION_END = 1190534;
const REGION_CHARS = 18972;
const REGION_OWNERS = 13;
const OWNER_POSITION = 6;
const REGION_LINE_PREFIX = '// ═══';
const BANNER_MARKS = 214;
const BANNER_MARKS_AFTER = 214;
const OWNER_REGIONS_AFTER = 113;

// ── Taking more or less, priced: the owners above in the region, the owners below ──
// Above, one step at a time up the region: [name, opening, units, raw nine, byConsumerSplit, consumers, monolith dependencies, runs nothing at load].
const EXTENSIONS_UP = [
  ['_apexParityWarmupTimeframes', 1174538, 1895, 8, 3, 2, 1, true],
  ['_apexParityFrontendCandles', 1173172, 3261, 15, 8, 2, 5, true],
  ['_apexParityNormTimeframe', 1172829, 3604, 16, 7, 2, 4, true],
  ['_apexParityNormSymbol', 1172726, 3707, 17, 6, 2, 3, true],
  ['APEX_PARITY_TOL', 1171562, 4871, 18, 7, 2, 3, true],
];
const UP_LEGAL = 5;
const UP_TIES = 1;
const UP_WORSE = 4;
const UP_TIES_BCS = 0;
const UP_NOT_CLEAN = 0;
// The shipped screen's own runs that end where the cut does and open above it, in this region: one per owner above, each from
// the owner's DECLARATION except the first owner of the region, which is measured from the region's start.
const UP_SCREEN_ROWS = [1171562, 1172726, 1172829, 1173500, 1174618];
// Below: [name, closing, units from the cut's opening, raw nine, byConsumerSplit, consumers, monolith dependencies, runs nothing at load].
const EXTENSIONS_DOWN = [
  ['apexDebugCompareCandles', 1180161, 5399, 15, 8, 1, 6, true],
  ['_ensureCandleSubscription', 1184532, 9770, 47, 29, 8, 16, false],
  ['_ensure30MSubscription', 1187263, 12501, 71, 33, 9, 16, false],
  ['_getIntradayTech', 1188518, 13756, 75, 37, 10, 18, false],
  ['_getTechForTF', 1188913, 14151, 84, 41, 12, 18, false],
  ['_scheduleSnapshotTechRetry', 1190533, 15771, 86, 45, 13, 20, false],
];
const DOWN_LEGAL = 6;
const DOWN_REFUSED = 0;
const DOWN_WORSE = 6;
const DOWN_TIES_BCS = 0;
const DOWN_NOT_CLEAN = 5;
// THE RUNS the two owners make on their own: [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['_apexParityWarmupBackend', '_apexParityWarmupBackend', 1174762, 1175994, 1232, 5, 3, ['_apexParityWarmupTimeframes', '_recordCandleSubscriptionRequest'], 1],
  ['_apexParityWarmupBackend', '_apexParityFetchBackend', 1174762, 1176433, 1671, 8, 3, ['_apexParityWarmupTimeframes', '_recordCandleSubscriptionRequest'], 2],
  ['_apexParityFetchBackend', '_apexParityFetchBackend', 1175995, 1176433, 438, 3, 1, [], 1],
];
const OWN_RUNS_LEGAL = 3;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 2;
// THE WHOLE REGION, taken as one cut.
const WHOLE_REGION_NINE = 85;
const WHOLE_REGION_BCS = 44;
const WHOLE_REGION_CONSUMERS = 13;
const WHOLE_REGION_DEPS = 17;
const WHOLE_REGION_SIB = 11;
const WHOLE_REGION_CLEAN = false;

// ── Coupling ───────────────────────────────────────────────────────────────�
const FULL_NINE = 8;
const BY_CONSUMER = 7;
const BY_CONSUMER_SPLIT = 3;
const CONSUMERS = ['apexDebugCompareCandles'];
const CONSUMER_SITES = 2;
const CONSUMER_SITES_AT = [1177531, 1177729];
const SITE_TEXTS = [
  [1177531, '_apexParityWarmupBackend(sym, tf, waitMs)'],
  [1177729, '_apexParityFetchBackend(sym, tf)'],
];
const CONSUMER_DECLS = [
  ['apexDebugCompareCandles', 1176569, 1180159, 3591],
];
// How many other places name each dependency: its own declaration and the places that call it. Measured, not assumed.
const OTHER_DEPENDENCY_MENTIONS = [2, 33];
const MONOLITH_DEPENDENCIES = ['_apexParityWarmupTimeframes', '_recordCandleSubscriptionRequest'];
const DEPENDENCY_DECLS = [
  ['_apexParityWarmupTimeframes', 1174618, 1174759, 142],
  ['_recordCandleSubscriptionRequest', 1139500, 1140731, 1232],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 2;
const OUTBOUND_MODULE_REFERENCES = 4;
const FOUNDATION_MODULES = { BACKEND: 'js/config/backend-config.js', _backendAuthHeaders: 'js/api/backend-client.js' };
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 4;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_apexParityFetchBackend', '_apexParityWarmupBackend'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7059;
const SEAM_REJECTED = 2077;
const CANDIDATES = 2734;
const CLEAN_CANDIDATES = 1636;
const SCORE_TWO_OR_BELOW = 0;
// Screen runs that open at the cut's declaration, the cut being the shortest.
const RUNS_OPENING_HERE = 7;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor.
const HIDDEN_ROWS = 31;
const HIDDEN_CLEAN_ROWS = 30;
const HIDDEN_SCORE_TWO_OR_BELOW = 0;
// THE ROWS AT THE BEST SCORE, 3, over the screen and the pass together.
const ROWS_AT_THREE = 2;
const ROWS_AT_THREE_SCREEN = 2;
const ROWS_AT_THREE_HIDDEN = 0;
const LOWEST_NINE_AT_THREE = 8;
// Rows of the screen and the pass together that overlap the cut: set aside before the next cycle's list is drawn.
const ROWS_OVERLAPPING_THE_CUT = 10;
// THE ROWS AT (byConsumerSplit, raw nine) = (3, 8), pinned in full, in the SCREEN's coordinates:
// [opening, closing, units, consumers, monolith dependencies]. TWO rows tie, and the published key orders them by units.
const TIED_AT_BEST = [
  [1174762, 1176433, 1671, 1, 2],
  [1174618, 1176433, 1815, 2, 1],
];
// The best four OTHER openings over the screen and the hidden pass together, skipping every row that overlaps the cut,
// as [opening, byConsumerSplit, raw nine, units], by the published key.
const RUNNERS_UP = [
  [564080, 4, 4, 1582],
  [728906, 4, 4, 1949],
  [724254, 4, 5, 1589],
  [156267, 4, 6, 1967],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
const DELTA_RAW_RUNS = -1;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = -1;
const DELTA_CLEAN = -1;
const PREVIOUS_RAW_CHARS = 1615;
const PREVIOUS_RAW_AT = 388872;
// The previous contract's published list, in the coordinates of the document BEFORE the cut that
// shipped, which sat ABOVE every row of it.
const PREVIOUS_RUNNERS_UP = [
  [1176377, 3, 8, 1671],
  [1176233, 3, 8, 1815],
  [565695, 4, 4, 1582],
  [730521, 4, 4, 1949],
];

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 66;
const SMALLEST_LAYER_CHARS = 1540;
const SIZE_RANK_IF_CUT = 6;
const LAYERS_SMALLER_THAN_THIS_CUT = 5;
const LAYERS_LARGER_THAN_THIS_CUT = 61;
const PURE_ASCII_LAYERS = 9;
const LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_WIDE_BANNER = 30;
const LAYERS_WITH_A_DEPENDENCY = 29;

// ── If cut ────────────────────────────────────────────────────────────────�
const TAG_IF_CUT = '<script src="./js/services/apex-parity-backend-fetch.js"></script>\n';
const NET_REDUCTION = 1605;
const INDEX_AFTER = 1408731;
const RESIDUAL_MONOLITH = 1291949;
const LOCAL_SCRIPTS_AFTER = 111;
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


console.log('APEX PARITY BACKEND FETCH EXTRACTION — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. Phase 2 puts a peel here and this
// becomes the reconstruction the permanent contract runs against.
const INDEX = APP_LOADER.loadIndexHtml();

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


// CHAIN, read off the newest contract rather than written here: that file
// carries the list ending at its own layer, and copying it would be a second
// place to drift. Phase 2 gives this cycle its own literal.
const CHAIN = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8')
  .match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
  .map((l) => l.replace(/^'|',?$/g, ''));
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
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and is CODE_CHARS units of residual code');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it holds TOP_LEVEL_DECLS top-level declarations');
eq(REGIONS.length, OWNER_REGIONS, '…across OWNER_REGIONS owner regions');
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the swing trend
// context predicted the document, the residual monolith and the script
// count this audit measures, so the two cycles are joined by numbers.
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
section('2. The region, its seam, and the three openings the seam admits');
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
eq(firstLineOf(BODY), DECL_FIRST_LINE, '…and opening on DECL_FIRST_LINE, the declaration of its first owner');
eq(BODY_UTF8, BODY_CHARS, '…and the body is PURE ASCII: its UTF-8 and UTF-16 lengths are one number, there being no non-ASCII character in it…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, 0, '…counted, not inferred from the two lengths agreeing');
eq(INDEX.indexOf(BODY), CODE_AT + RAW_AT_IN_CODE,
  '…and it occurs in the document at the offset the monolith coordinate implies');
eq(count(INDEX, BODY), 1, '…exactly once, so the fragment is not ambiguous');
eq(count(INDEX, BODY + '\n'), 1, '…and exactly once followed by its separator');

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

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits three openings.
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
  eq(OPENINGS[1], BLANK_OPENING, '…the next the blank line that separates that brace from the declaration…');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last being the declaration, there being no documentation between the blank line and it for a fourth opening to stand on');
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the three…');
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
    '…so PARSING_OPENINGS of the three are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is two declarations and the blank line between them, and no documentation: neither owner has a comment
// block above it, so the declaration is the first line of the cut.
{
  const owners = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(blockAbove(owners[0]), null, 'the first owner has NO comment block above it: the line above its declaration is blank…');
  eq(blockAbove(owners[1]), null, '…and neither has the second, the line above THAT being the closing brace of the first and a blank line between…');
  eq(CODE.slice(owners[1].start - 3, owners[1].start), '}\n\n', '…the two owners separated by a brace and exactly ONE blank line, which is the only blank line in the body…');
  eq(BODY.split('\n').slice(0, -1).filter((l) => !l.trim()).length, BLANK_LINES, '…BLANK_LINES of them in all');
  eq(BODY.split('\n').filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES, '…and the body holds COMMENT_LINES comment lines: there is no prose in it for the cut to strand or to take');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the declaration is preceded by the brace of the owner above and ONE blank line, which stays');
  eq(MARKS.filter((m) => m > RAW_AT_IN_CODE && m < RAW_END_IN_CODE).length, 0,
    '…and no banner mark lies inside the cut, so it takes no section heading with it');
  eq(MARKS.indexOf(RAW_AT_IN_CODE), -1, '…nor does it open on one: the cut sits in the MIDDLE of a banner region');
}
// WHAT TAKING THE BLANK LINE WOULD HAVE FUSED.
{
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto the comment block of ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith holds nowhere today, once there');
}
// WHAT THE CUT LEAVES. The brace of the owner above, one blank line, then the comment block of the next owner: the very join the
// monolith holds today at the END of the block, so the cut moves it and the document gains no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith holds the join `}` blank line `' + NEXT_DOC_PREFIX + '` once today, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the last owner…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of this block\'s own first declaration is held once today, and is gone after the cut…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the declaration leaving with the block');
  eq(count(CODE, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE, 'and a brace, a blank line and a comment is a shape the document holds JOINS_LIKE_THE_CUT_BEFORE times…');
  eq(count(atCut, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE, '…the SAME number after the cut, which swaps the join after the block for the identical join after the owner above');
  eq(count(CODE, '}\n\nasync function '), ASYNC_JOINS_BEFORE, 'while a brace, a blank line and an async declaration is held ASYNC_JOINS_BEFORE times…');
  eq(count(atCut, '}\n\nasync function '), ASYNC_JOINS_BEFORE - 2, '…two fewer after it: the join in front of the block and the one between its two owners both leave');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf('async function _apexParityFetchBackend') < 0,
    '…and no declaration of either owner is left behind');
}
// THE SCREEN MEASURES THIS RUN FROM ITS DECLARATION: it is not the first owner of its region.
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(BODY_CHARS >= RUN_FLOOR, '…the run clearing RUN_FLOOR from the declaration, by ' + (BODY_CHARS - RUN_FLOOR) + ' units, with no help from documentation…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and the screen enumerates CANDIDATES_AT_CUT run that opens at the declaration and ends where this cut does…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, HIDDEN_ROWS_AT_CUT,
  '…and the pass over sub-floor runs holds HIDDEN_ROWS_AT_CUT rows for it, because the screen already has it');
// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: two async owners, two calls from one consumer, two dependencies and four foundation references, all read at call time');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these two names');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…declared functions, so this layer would ship no mutable binding');
  ok(own.every((d) => d.isAsync), '…both ASYNC: each returns a promise, so a failure inside either is a REJECTION and not a throw');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, OWNER_COUNT,
    '…holding NO function expression inside either besides themselves: no callbacks…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the two owners');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one, among them the reference from a shipped module: no module names either function');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from the monolith outside the block…');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: TWO monolith bindings, both declared functions');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to shipped modules are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: two inbound references, two dependencies and four references to shipped modules');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer, which counts the module references too, is BY_CONSUMER: one consumer, two dependencies and four module references…');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'ONE consumer reaches in from the monolith: CONSUMERS, a declared function');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const outside = (at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE;
  eq(OWNERS_EXPECTED.map((n) => refSites(MASKED, n).filter(outside)).reduce((a, b) => a.concat(b), []).sort((a, b) => a - b), CONSUMER_SITES_AT,
    'all of those references are to the two owners…');
  eq(OWNERS_EXPECTED.map((n) => refSites(STRINGS, n).filter(outside).length), [0, 0],
    '…and neither name appears in any string or generated markup outside the block');
  eq(OWNERS_EXPECTED.map((n) => count(STATIC_MARKUP, n)), [0, 0], '…nor in the static markup, so no inline handler names either');
  eq(OWNERS_EXPECTED.map((n) => SIB_REFS.get(n)), [{ n: 0, who: [] }, { n: 0, who: [] }], '…and no shipped module names either, so the chain of layers already extracted does not reach the block');
  // WHAT EACH OF THE TWO SITES IS, as written.
  eq(SITE_TEXTS.map(([at]) => at), CONSUMER_SITES_AT, 'SITE_TEXTS pins the same two sites…');
  eq(SITE_TEXTS.map(([at, text]) => CODE.slice(at, at + text.length)), SITE_TEXTS.map(([, text]) => text),
    '…each exactly the text written there');
  eq(SITE_TEXTS.map(([at]) => CODE.slice(at).match(/^_apexParity\w+\([^;]*\);/)[0]),
    SITE_TEXTS.map(([, text]) => text + ';'),
    '…every one a CALL, matched through its closing parenthesis and the semicolon that ends its statement: the warm-up takes a symbol, a timeframe and a wait, the fetch a symbol and a timeframe');
  eq(SITE_TEXTS.map(([at]) => CODE.slice(at - 'await '.length, at)), ['await ', 'await '],
    '…and each one AWAITED, so the consumer sees the rejection of either as a throw it can catch');
}
// WHERE EACH SITE IS: both are calls inside the body of the consumer; neither is evaluated as the monolith loads.
{
  const innermost = (at) => FN_BODIES.filter((r) => at >= r.start && at <= r.end).sort((a, b) => b.start - a.start)[0];
  eq(CONSUMER_DECLS.map(([name]) => name), CONSUMERS, 'the declared consumer is CONSUMER_DECLS, the one of CONSUMERS…');
  for (const [name, start, end, chars] of CONSUMER_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function opening at ' + start + ', ' + chars + ' units long');
    ok(d.start > RAW_END_IN_CODE, '…outside the block, BELOW it');
  }
  eq(CONSUMER_DECLS.map(([name]) => BY_NAME.get(name).isAsync), [true], '…ASYNC, the console entry point of the candle-parity tool…');
  eq(CONSUMER_SITES_AT.map((at) => (hostOf(at) || {}).name), ['apexDebugCompareCandles', 'apexDebugCompareCandles'],
    '…holding both calls');
  ok(CONSUMER_SITES_AT.every((at) => insideFunction(at)), '…every call inside a function body, so not one is a statement the monolith evaluates as it loads…');
  ok(CONSUMER_SITES_AT.every((at) => { const body = innermost(at); const host = BY_NAME.get(hostOf(at).name); return body && body.start >= host.start && body.end <= host.end; }),
    '…each within the body of its host');
  eq(CONSUMER_SITES_AT.filter((at) => !insideFunction(at)).length, 0, '…and none outside one: this block has no load-time reference, so the tag position is not shown to be load-bearing');
  // WHAT THE MONOLITH DOES WITH THE CONSUMER AT LOAD: it publishes it on `window`, inside a guard. That statement names the CONSUMER,
  // which stays, and not either owner of the block.
  const publish = CODE.indexOf('window.apexDebugCompareCandles = apexDebugCompareCandles;');
  ok(publish > RAW_END_IN_CODE && !insideFunction(publish), 'the consumer is published on `window` by a top-level statement BELOW the block, which runs as the monolith loads…');
  ok(CODE.slice(publish, publish + 800).split('};')[0].indexOf('_apexParityWarmupBackend') < 0 && CODE.slice(publish, publish + 800).split('};')[0].indexOf('_apexParityFetchBackend') < 0,
    '…and the object it publishes beside it names NEITHER owner: the block is reached through the consumer only');
}
// THE DEPENDENCIES, with their declarations, where the block reads them, and CONTROLS.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  for (const [name, start, end, chars] of DEPENDENCY_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form, d.isAsync], [start, end, chars, 'function', false],
      name + ' is a declared SYNCHRONOUS function opening at ' + start + ', ' + chars + ' units long, which stays in the monolith');
    ok(d.end < RAW_AT_IN_CODE, '…declared ABOVE the block, ' + (RAW_AT_IN_CODE - d.end) + ' units above it');
  }
  eq(DEPENDENCY_DECLS.map(([name]) => refSites(bodyMasked, name).length), [1, 2],
    'the block names the two dependencies at 1 and 2 places…');
  ok(DEPENDENCY_DECLS.every(([name]) => refSites(bodyMasked, name).every((p) => FN_BODIES.some((r) => p + RAW_AT_IN_CODE >= r.start && p + RAW_AT_IN_CODE <= r.end)
    && /^\s*\(/.test(bodyMasked.slice(p + name.length)))),
  '…every one a CALL inside a function body, so the dependencies are read when an owner runs and not as the block is evaluated…');
  ok(!/\b(_apexParityWarmupTimeframes|_recordCandleSubscriptionRequest)\s*(=(?!=)|\+\+|--|\+=|-=)/.test(bodyMasked), '…and never as the target of an assignment');
  eq(OWNERS_EXPECTED.map((n) => refSites(MASKED.slice(BY_NAME.get(n).start, BY_NAME.get(n).end + 1), '_recordCandleSubscriptionRequest').length), [2, 0],
    '…both inside the warm-up owner, the fetch owner recording nothing');
  eq(DEPENDENCY_DECLS.map(([name]) => refSites(MASKED, name).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length), OTHER_DEPENDENCY_MENTIONS,
    'control — the two are named OTHER_DEPENDENCY_MENTIONS times elsewhere in the monolith, so the counts of 1 and 2 above are the block\'s own and not every mention in the file');
  // THE NEIGHBOUR'S ONE TOP-LEVEL MENTION, which belongs to the OTHER row of the tie and not to this one.
  const neighbour = BY_NAME.get('_apexParityWarmupTimeframes');
  const topMentions = refSites(MASKED, '_apexParityWarmupTimeframes').filter((at) => !insideFunction(at) && !(at >= neighbour.start && at <= neighbour.end));
  eq(topMentions.length, 1, 'the owner above, `_apexParityWarmupTimeframes`, is mentioned by ONE top-level statement outside its own declaration, the object published on `window`…');
  ok(topMentions[0] > RAW_END_IN_CODE, '…below the block…');
  const wider = profileOf([TIED_AT_BEST[1][0], BODY_END_IN_CODE]);
  eq(consumersOf(wider).sort(), ['(TOP LEVEL)', 'apexDebugCompareCandles'],
    'control — the same profile finds TWO consumers on the cut widened up to include that owner, one of them the top-level statement: the extra consumer the other row of the tie carries is that statement, which a cut at the declaration does not have');
}
// THE FOUNDATION IT CALLS: four references to shipped modules, all inside the bodies.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  const names = Object.keys(FOUNDATION_MODULES);
  eq(names.map((n) => refSites(bodyMasked, n).length), [2, 2], 'the block names BACKEND and _backendAuthHeaders twice each…');
  eq(names.map((n) => MODULE_OWNERS.get(n)), names.map((n) => FOUNDATION_MODULES[n]), '…the first declared in js/config/backend-config.js and the second in js/api/backend-client.js…');
  ok(names.every((n) => LOCALS.indexOf(FOUNDATION_MODULES[n]) >= 0), '…both local scripts loaded BEFORE the inline monolith, so they are already defined when an owner runs and the move changes nothing about them…');
  eq(names.map((n) => BY_NAME.get(n)), [undefined, undefined], '…neither declared in the monolith…');
  ok(names.every((n) => CHAIN.indexOf(FOUNDATION_MODULES[n]) < 0), '…and both FOUNDATION modules, not layers this programme has extracted, which is why byConsumerSplit leaves their four references out');
  ok(refSites(bodyMasked, '_backendAuthHeaders').every((p) => /^\s*\(/.test(bodyMasked.slice(p + '_backendAuthHeaders'.length))), 'the auth-headers function is CALLED, both times…');
  ok(refSites(bodyMasked, 'BACKEND').every((p) => /^\s*\+/.test(bodyMasked.slice(p + 'BACKEND'.length))), '…and BACKEND is READ as the front of a URL, both times, never written');
}
// WHAT RUNS AT LOAD. Nothing: the block holds two function declarations and no statement.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: two function declarations only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(yield|this)\b/g) || []).length, 0, '…no yield and no `this`…');
  eq((bodyMasked.match(/\bawait\b/g) || []).length, 4, '…four awaits, two of them on `fetch` and two on the body of the response…');
  eq((bodyMasked.match(/\bnew\s+\w+/g) || []), [], '…no `new` at all…');
  eq((bodyMasked.match(/\b(Math|Object|Number|Date|Array|String|Boolean|JSON|isFinite|encodeURIComponent|AbortSignal|fetch)\b/g) || []).sort(),
    ['AbortSignal', 'AbortSignal', 'JSON', 'Math', 'encodeURIComponent', 'encodeURIComponent', 'fetch', 'fetch'],
    '…and the language\'s and the host\'s own `fetch` twice, `AbortSignal` twice for the two timeouts, `JSON` once, `Math` once and `encodeURIComponent` twice, none of them the monolith\'s…');
  eq((bodyMasked.match(/\b(globalThis|self|window|document|localStorage|console|setTimeout|setInterval)\b/g) || []).length, 0,
    '…and no window, document, storage, console or timer');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all, comments included');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND…');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND references to a foundation module, the four above, which byConsumerSplit leaves out because the modules are not part of the chain…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…so byConsumerSplit is BY_CONSUMER_SPLIT: one consumer and two dependencies');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means.
{
  eq(nonLocalAssignmentsUncorrected(BODY), [],
    'the inherited scan reports no name as assigned that the block does not own…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan, which counts every declarator of a list as local, finds NON_LOCAL_ASSIGNMENTS either: the block assigns only its own locals');
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('async function f() { _recordCandleSubscriptionRequest = 1; }'), ['_recordCandleSubscriptionRequest'],
    'control — a write to a dependency the block reads is found: the zero above is not blind to the names that matter here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}
// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: two rows tie at (3, 8), and the published key orders them by length alone');
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
    '…and it sat entirely ABOVE this block, so everything this audit measures moved down by exactly that many units, as read from the rows below');
  const moved = (at) => (at >= PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS ? at - PREVIOUS_RAW_CHARS : at);
  // WHAT THE PREVIOUS CONTRACT RECORDED AT THE BEST SCORE, and what became of it.
  const prevTied = listOf('TIED_AT_BEST');
  eq(prevTied.length, 3, 'the previous contract recorded THREE rows at the best score and the lowest raw nine, the first being the block that shipped, which is gone from the document…');
  eq(prevTied[0].slice(0, 3), [PREVIOUS_RAW_AT, PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS - 1, prevNum('BODY_CHARS')], '…and the other two being the rows that remain, which this audit finds at the same best score…');
  eq(prevTied.slice(1).map((r) => [moved(r[0]), moved(r[1]), r[2], r[3], r[4]]), TIED_AT_BEST,
    '…moved by the same rule, EXACTLY TIED_AT_BEST: two rows now, not three, each with the units, the consumers and the dependencies it had');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, '…and it published exactly PREVIOUS_RUNNERS_UP behind it…');
  eq(listed.slice(0, 2).map((r) => [moved(r[0]), r[1], r[2], r[3]]), TIED_AT_BEST.map((r) => [r[0], BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE, r[2]]),
    '…its first TWO being the rows that now tie at the best score, moved by the same rule…');
  eq(listed.slice(2).map((r) => [moved(r[0]), r[1], r[2], r[3]]), RUNNERS_UP.slice(0, 2),
    '…and its other two this audit\'s first two runners-up, moved by the same rule…');
  ok(listed.every((r) => r[0] >= PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS),
    '…every one of the four having sat BELOW the cut that shipped, so the rule moved all of them and none was left where it was');
  ok(!listed.some((r) => RUNNERS_UP.slice(2).some((u) => moved(r[0]) === u[0])),
    '…and this audit\'s last two runners-up being rows the previous contract did not list');
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
  // THE ROWS AT THE BEST SCORE AND THE LOWEST RAW NINE, pinned in full: TWO of them tie, and this block is the shorter.
  const tiedRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const tied = tiedRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(tied, TIED_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE) are exactly TIED_AT_BEST: TWO rows, every row at the best score among them…');
  eq(tiedRows.length, ROWS_AT_THREE, '…so there is no row at the best score with a worse raw nine than the two that tie');
  ok(tied[0][2] < tied[1][2], 'their lengths differ, in strictly ascending order, so the third key column settles it without a further tie: ' + tied.map((r) => r[2]).join(' < '));
  eq(tied[1][2] - tied[0][2], 144, '…this block 144 units shorter than the other: it is first by LENGTH ALONE, and the audit says so rather than presenting a margin on the raw nine or on byConsumerSplit that is not there');
  ok(tiedRows[0].hidden !== true && tiedRows[1].hidden !== true, '…both rows the SCREEN\'s own, not the pass\'s…');
  eq(tiedRows[0].c.p.names, OWNERS_EXPECTED, '…this block\'s row holding its two owners…');
  eq(tiedRows[1].c.p.names, [OWNER_BEFORE].concat(OWNERS_EXPECTED), '…and the other row holding THREE: the same two with the owner above them, `_apexParityWarmupTimeframes`, added at the front…');
  eq(tiedRows[1].hi, tiedRows[0].hi, '…the two rows closing at the same place, so the other is this block EXTENDED UP by one owner and not a neighbour of it…');
  ok(tiedRows[1].lo < tiedRows[0].lo, '…and opening above it');
  // THE SAME TWO ROWS DIFFER IN WHAT THEY CARRY: the split of the eight.
  eq([consumersOf(tiedRows[0].c.p).length, tiedRows[0].c.p.deps.length, consumersOf(tiedRows[1].c.p).length, tiedRows[1].c.p.deps.length], [1, 2, 2, 1],
    '…this block carrying one consumer and two dependencies where the other carries two consumers and one: they are the same score reached by moving a reference from the dependency column to the consumer column, which is the only thing the owner above does to the numbers…');
  eq(consumersOf(tiedRows[1].c.p), ['(TOP LEVEL)', NEXT_DECL], '…the extra consumer being a top-level statement of the monolith, not a function');
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
  eq(rankedAll.slice(0, 2).map((r) => [r.lo, r.bcs, r.nine, r.units]), [[RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS], [TIED_AT_BEST[1][0], BY_CONSUMER_SPLIT, FULL_NINE, TIED_AT_BEST[1][2]]],
    'the published key puts this block FIRST over every row, and the longer row of the tie second…');
  // WHAT IS PUBLISHED FOR THE NEXT CYCLE, over the screen and the hidden pass
  // together, skipping anything that overlaps the cut.
  const overlaps = (lo, hi) => lo < RAW_END_IN_CODE && hi > RAW_AT_IN_CODE;
  const pool = rows.filter((r) => !overlaps(r.lo, r.hi));
  eq(rows.length - pool.length, ROWS_OVERLAPPING_THE_CUT, '…the ROWS_OVERLAPPING_THE_CUT rows that overlap the cut being set aside…');
  ok(rows.filter((r) => overlaps(r.lo, r.hi)).some((r) => r.lo === TIED_AT_BEST[1][0]), '…among them the longer row of the tie…');
  const bestPer = new Map();
  for (const r of pool) {
    const b = bestPer.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPer.set(r.lo, r);
  }
  const ranked = [...bestPer.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units)
    .slice(0, RUNNERS_UP.length).map((r) => [r.lo, r.bcs, r.nine, r.units]);
  eq(ranked, RUNNERS_UP,
    '…and with this block\'s own rows set aside, the four best other openings, by (byConsumerSplit, nine, units), are exactly RUNNERS_UP');
  ok(ranked.every((r) => r[1] === BY_CONSUMER_SPLIT + 1 && r[2] < FULL_NINE),
    '…every one a step behind on byConsumerSplit with a LOWER raw nine than this block\'s, which is the ordering the key means by putting byConsumerSplit first');
  eq(ranked.map((r) => r[2]), [4, 4, 5, 6], '…their raw nines 4, 4, 5 and 6, rising down the list as the key orders them');
}
// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: the owners above and below in its region, the runs the two owners make, and the whole region');
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
  '…and takes the next OWNER_COUNT, which are its two');
eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…of REGION_OWNERS in the region');
eq([REGION_UP.length, REGION_DOWN.length], [OWNER_POSITION - 1, REGION_OWNERS - OWNER_POSITION + 1 - OWNER_COUNT], '…so the region holds that many owners above the cut and that many below it');
// THE OWNERS ABOVE, one step at a time. Priced as the cut extended UP to the start of that owner's documentation.
{
  const priced = REGION_UP.map((d) => Object.assign({ name: d.name }, priceUp(d)));
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
  ok(priced[0].lo < TIED_AT_BEST[1][0], '…which is ABOVE the other row of the tie, whose opening is the declaration: the screen\'s row leaves that owner\'s documentation out and this pricing takes it');
  eq(priced[0].p.nine, FULL_NINE, '…with the SAME raw nine as that row, the comment block adding nothing to a count of references');
  eq(candidateRuns.filter((c) => c.lo < RAW_AT_IN_CODE && c.lo >= REGION.start && c.hi === BODY_END_IN_CODE).map((c) => c.lo), UP_SCREEN_ROWS,
    '…and the shipped screen enumerates UP_SCREEN_ROWS runs that end where the cut does and open above it, in this region');
}
// THE OWNERS BELOW, one step at a time. Priced as the cut extended down to the end of that owner.
{
  const priced = REGION_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
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
  eq(priced[0].name, NEXT_DECL, '…the first one the function right after the cut: extending down to it takes the block\'s one consumer along');
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
  eq(measured, OWN_RUNS, 'the two owners make exactly the three runs OWN_RUNS: each alone and both together, which is the cut');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them a real seam…');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR: neither owner clears it alone, and the two together clear it by ' + (BODY_CHARS - RUN_FLOOR) + ' units…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[RAW_AT_IN_CODE, BODY_END_IN_CODE]],
    '…the shipped screen enumerating exactly ONE run inside the block, which is the cut itself…');
  eq(hiddenRows.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [],
    '…and the pass over sub-floor runs none, neither owner having documentation to be re-measured from');
  eq(measured.filter((r) => r[5] !== 'REFUSED').map((r) => r[5]), OWN_RUNS.map((r) => r[5]), '…the three scoring as OWN_RUNS records');
  // THE FLOOR REMOVES TWO RUNS THAT SCORE BETTER, and the audit says so rather than leaving it to be found: this is the screen's own
  // size gate at work, and it is a gate on SIZE, not on coupling.
  ok(measured.filter((r) => r[4] < RUN_FLOOR).every((r) => r[6] <= BY_CONSUMER_SPLIT && r[5] < FULL_NINE),
    'MEASURED, NOT HIDDEN: both runs the floor removes score no worse than the cut on byConsumerSplit and strictly better on the raw nine, the warm-up alone at (3, 5) over ' + measured[0][4] + ' units and the fetch alone at (1, 3) over ' + measured[2][4] + ' — the screen\'s RUN_FLOOR keeps them out, and the cut is the smallest run opening at its declaration that clears it');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).map((r) => RUN_FLOOR - r[4]), [RUN_FLOOR - 1232, RUN_FLOOR - 438], '…short of the floor by ' + (RUN_FLOOR - 1232) + ' and ' + (RUN_FLOOR - 438) + ' units…');
  ok(measured[2][4] * 3 < SMALLEST_LAYER_CHARS, '…the fetch alone, at ' + measured[2][4] + ' units, being less than a third of SMALLEST_LAYER_CHARS, the smallest layer the programme has shipped, so it would be a layer of a size it has never had');
}
// THE BANNER REGION it sits inside IS NOT THE CUT. The block is two of the thirteen owners of a `// ═══` region, so the cut takes no banner:
// the document's banner marks and owner regions do not move, and the region shrinks by the cut and loses two owners — which the
// regions are recomputed on the text without the block to show.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT…');
  eq(reg.end, REGION_END, '…and ends at REGION_END…');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(REGION_LINE_PREFIX), '…opening on a header of the REGION_LINE_PREFIX kind, the double-rule kind and not the dash kind…');
  ok(reg.start < RAW_AT_IN_CODE && RAW_END_IN_CODE < reg.end, '…the cut lying strictly INSIDE it, with owners on both sides…');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq([whole.nine, byConsumerSplit(whole, wsplit)], [WHOLE_REGION_NINE, WHOLE_REGION_BCS], 'taking the whole region scores WHOLE_REGION_NINE on the raw nine and WHOLE_REGION_BCS on byConsumerSplit…');
  eq([consumersOf(whole).length, whole.deps.length, whole.sib], [WHOLE_REGION_CONSUMERS, WHOLE_REGION_DEPS, WHOLE_REGION_SIB],
    '…over WHOLE_REGION_CONSUMERS consumers, WHOLE_REGION_DEPS monolith dependencies and WHOLE_REGION_SIB references from sibling modules');
  eq(runsNothingAtLoad(loadTimeProfile(reg.start, reg.end)), WHOLE_REGION_CLEAN, '…and whether it runs nothing at load is WHOLE_REGION_CLEAN: the region carries the `window` publication, a top-level statement');
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
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs, and that cut was a region of its own,
  // banner and all, so the whole region left the document.
  const tri = (n) => n * (n + 1) / 2;
  eq(-tri(prevNum('REGION_OWNERS')), DELTA_RAW_RUNS,
    '…and the raw-run change is exactly what that loss predicts: the region it took held ' + prevNum('REGION_OWNERS') + ' owner and so made ' + tri(prevNum('REGION_OWNERS')) + ' run, which left with it');
  ok(DELTA_RAW_RUNS < 0 && DELTA_SEAM_REJECTED === 0 && DELTA_CANDIDATES < 0 && DELTA_CLEAN < 0,
    '…the candidate counts shrinking with it and the seam rejections not moving, which this audit measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
{
  const opening = candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).map((c) => c.hi).sort((a, b) => a - b);
  eq(opening[0], BODY_END_IN_CODE, '…and the screen enumerates runs that open there, the SHORTEST of them being the cut itself…');
  eq(opening.length, RUNS_OPENING_HERE, '…of which there are RUNS_OPENING_HERE, the others going on further down the region and each longer than the cut');
  ok(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi > BODY_END_IN_CODE).every((c) => byConsumerSplit(c.p, c.split) > BY_CONSUMER_SPLIT),
    '…measured, not assumed: not one of the longer runs from this opening scores as well as the cut on byConsumerSplit');
}
// ─────────────────────────────────────────────────────────────────────────────
section('7. The block loads bare, rejects without its dependencies, and every branch of both calls is measured');
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
  const WARMUP_TF = CODE.slice(BY_NAME.get(OWNER_BEFORE).start, BY_NAME.get(OWNER_BEFORE).end + 1);
  const outcome = async (p) => {
    try { return { value: JSON.parse(JSON.stringify(await p)) }; } catch (e) { return { error: e.name + ': ' + e.message }; }
  };
  // A context holding the block, the REAL neighbour it calls to map a timeframe, and recording stand-ins for everything it
  // reaches for: the base URL, the auth headers, the recorder, the timeout and `fetch`.
  const fresh = (reply) => {
    const ctx = vm.createContext(Object.create(null));
    const calls = { fetch: [], record: [], headers: [], signal: [] };
    ctx.__calls = calls;
    ctx.__reply = reply || (() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ x: 1 }) }));
    vm.runInContext("var BACKEND = 'https://backend.test';"
      + "function _backendAuthHeaders(extra) { __calls.headers.push(extra === undefined ? 'none' : extra); return Object.assign({ Authorization: 'Bearer t' }, extra || {}); }"
      + "function _recordCandleSubscriptionRequest(r) { __calls.record.push(r); }"
      + "var AbortSignal = { timeout: function (ms) { __calls.signal.push(ms); return { timeoutMs: ms }; } };"
      + "var fetch = function (url, init) { __calls.fetch.push({ url: url, init: init }); return __reply(url, init); };", ctx);
    vm.runInContext(WARMUP_TF, ctx);
    vm.runInContext(BODY, ctx);
    const seen = () => JSON.parse(JSON.stringify(calls));
    const call = (name, args) => { ctx.__args = args; return outcome(vm.runInContext(name + '.apply(null, __args)', ctx)); };
    return { ctx, calls: seen, warm: (...a) => call('_apexParityWarmupBackend', a), get: (...a) => call('_apexParityFetchBackend', a) };
  };

  // LOADING needs nothing; CALLING needs the neighbour, the recorder, the base URL and the auth headers, and only when it reaches them.
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(BODY, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its two owners');
  eq(OWNERS_EXPECTED.map((n) => vm.runInContext(n + '.constructor.name', bare)), ['AsyncFunction', 'AsyncFunction'], '…both ASYNC functions…');
  eq(OWNERS_EXPECTED.map((n) => vm.runInContext(n + '.length', bare)), [3, 2], '…taking three arguments and two: a symbol, a timeframe and a wait, then a symbol and a timeframe');
  {
    const p = vm.runInContext('_apexParityWarmupBackend("SPY", "1D", 1)', bare);
    eq(typeof p.then, 'function', 'CALLING the first one there does not throw: it returns a promise…');
    eq(await outcome(p), { error: 'ReferenceError: _apexParityWarmupTimeframes is not defined' },
      '…which REJECTS with ReferenceError for the neighbour it calls first: the dependency is read at CALL time…');
    eq(await outcome(vm.runInContext('_apexParityFetchBackend("SPY", "1D")', bare)), { error: 'ReferenceError: BACKEND is not defined' },
      '…and the second rejects for BACKEND, which it reads first');
    eq(await outcome(vm.runInContext('(async function () { return notDefinedAnywhere; })()', bare)), { error: 'ReferenceError: notDefinedAnywhere is not defined' },
      'control — the same bare VM rejects any async function that reads a name it does not have, so the failures above are the reasons claimed');
    const partial = vm.createContext(Object.create(null));
    vm.runInContext(WARMUP_TF, partial);
    vm.runInContext(BODY, partial);
    eq(await outcome(vm.runInContext('_apexParityWarmupBackend("SPY", "W", 1)', partial)), { error: 'ReferenceError: _recordCandleSubscriptionRequest is not defined' },
      'with the neighbour defined but not the recorder, a timeframe with nothing to warm up rejects for the RECORDER: it records the skip before it returns…');
    eq(await outcome(vm.runInContext('_apexParityWarmupBackend("SPY", "1D", 1)', partial)), { error: 'ReferenceError: _recordCandleSubscriptionRequest is not defined' },
      '…and a warmable one rejects for it too, it records the request before it ever reaches `fetch`');
  }

  // THE WARM-UP, on its happy path.
  {
    const h = fresh();
    const r = await h.warm('SPY', '1D', 15000);
    eq(r, { value: { ok: true, status: 200, request: { symbols: ['SPY'], timeframes: ['1D'], waitMs: 15000 }, response: { x: 1 } } },
      'a warm-up for `1D` posts ONE request and answers its status, the body it sent and the parsed response…');
    const c = h.calls();
    eq(c.fetch.length, 1, '…`fetch` called once…');
    eq(c.fetch[0].url, 'https://backend.test/dev/market/candles-dxlink/warmup', '…at BACKEND and the warm-up path…');
    eq(c.fetch[0].init, {
      method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: '{"symbols":["SPY"],"timeframes":["1D"],"waitMs":15000}', cache: 'no-store', signal: { timeoutMs: 25000 },
    }, '…as a POST with the auth headers extended by a JSON content type, a JSON body, no caching and a timeout of the wait plus ten seconds…');
    eq(c.headers, [{ 'Content-Type': 'application/json' }], '…the auth headers asked for with exactly that one extra header…');
    eq(c.record, [{
      requester: '_apexParityWarmupBackend', reason: 'parity_debug_warmup', eventType: 'Candle', timeframes: ['1D'], symbols: ['SPY'],
      action: 'backend_warmup', detail: 'POST /dev/market/candles-dxlink/warmup', context: { requestedTimeframe: '1D', waitMs: 15000 },
    }], '…and ONE record made of it, before the request, naming the owner as the requester and carrying the requested timeframe and wait');
  }
  // WHICH TIMEFRAMES ARE WARMED.
  {
    const body = async (tf) => { const h = fresh(); const r = await h.warm('SPY', tf, 1000); return [r.value && r.value.request && r.value.request.timeframes, h.calls().record[0].context && h.calls().record[0].context.requestedTimeframe]; };
    eq([await body('1D'), await body('30M'), await body('4H')], [[['1D'], '1D'], [['30M'], '30M'], [['30M'], '4H']],
      'the timeframes warmed are `1D` for 1D and `30M` for both 30M and 4H, because the backend derives 4H from 30M, the REQUESTED timeframe still recorded as asked…');
  }
  // THE SKIP.
  {
    const h = fresh();
    eq(await h.warm('SPY', 'W', 15000), { value: { ok: false, reason: 'no warmup timeframe for W' } },
      'a timeframe with nothing to warm up answers `ok: false` with its reason and sends NOTHING…');
    const c = h.calls();
    eq([c.fetch.length, c.signal.length, c.headers.length], [0, 0, 0], '…`fetch`, the timeout and the auth headers all untouched…');
    eq(c.record, [{ requester: '_apexParityWarmupBackend', reason: 'parity_debug_warmup', eventType: 'Candle', timeframe: 'W', symbols: 'SPY', action: 'skipped', detail: 'no_warmup_timeframe' }],
      '…but ONE record made, of a different SHAPE: the skip carries `timeframe` and a bare string for `symbols`, where the request carries `timeframes` and an array — a quirk pinned and not fixed');
    eq([(await fresh().warm('SPY', '', 1)).value.reason, (await fresh().warm('SPY', undefined, 1)).value.reason], ['no warmup timeframe for ', 'no warmup timeframe for undefined'],
      '…an empty timeframe and a missing one both skipped, the reason built by string concatenation');
  }
  // THE TIMEOUT, which is `max(5000, (wait || 0) + 10000)`.
  {
    const timeout = async (wait) => { const h = fresh(); await h.warm('SPY', '1D', wait); return h.calls().signal[0]; };
    eq([await timeout(15000), await timeout(100000), await timeout(0), await timeout(undefined), await timeout(null)], [25000, 110000, 10000, 10000, 10000],
      'the timeout is the wait plus ten seconds, and a wait of zero, null or none is ten seconds…');
    eq(await timeout(-9999), 5000, '…with a floor of five seconds that only a NEGATIVE wait reaches…');
    eq(await timeout('5000'), 500010000, '…and a wait passed as a numeric STRING concatenates instead of adding, so `\'5000\'` asks for a timeout of 500,010,000 ms — a quirk pinned and not fixed');
  }
  // WHAT COMES BACK WHEN THE REPLY IS NOT JSON, or never comes.
  {
    const h = fresh(() => Promise.resolve({ ok: false, status: 503, json: () => Promise.reject(new Error('not json')) }));
    eq(await h.warm('SPY', '1D', 1000), { value: { ok: false, status: 503, request: { symbols: ['SPY'], timeframes: ['1D'], waitMs: 1000 }, response: null } },
      'a reply whose body is not JSON does not reject: the response is `null` and the status is still reported…');
    const g = fresh(() => Promise.reject(new Error('network down')));
    eq(await g.warm('SPY', '1D', 1000), { error: 'Error: network down' }, '…while a request that fails outright REJECTS with the error it failed with, the caller\'s `try` being what turns that into a diagnostic');
  }

  // THE FETCH.
  {
    const h = fresh();
    eq(await h.get('SPY', '1D'), { value: { ok: true, status: 200, json: { x: 1 } } }, 'a fetch answers its status and the parsed body…');
    const c = h.calls();
    eq(c.fetch, [{ url: 'https://backend.test/dev/market/candles-dxlink/SPY?timeframe=1D', init: { headers: { Authorization: 'Bearer t' }, cache: 'no-store', signal: { timeoutMs: 15000 } } }],
      '…from BACKEND, the symbol in the path and the timeframe in the query, with the auth headers, no caching and a fixed fifteen-second timeout, and NO method: a plain GET…');
    eq([c.headers, c.record.length], [['none'], 0], '…the auth headers asked for with NO extra header, and nothing recorded: only the warm-up reports');
    const e = fresh();
    await e.get('BRK/B', '30M&x=1');
    eq(e.calls().fetch[0].url, 'https://backend.test/dev/market/candles-dxlink/BRK%2FB?timeframe=30M%26x%3D1', 'a symbol and a timeframe are both ENCODED, so a slash or an ampersand cannot change the path or add a parameter…');
    eq((await fresh().get(undefined, undefined)).value.status, 200, '…and a missing symbol and timeframe are not refused: they are encoded as the word `undefined`…');
    const u = fresh(); await u.get(undefined, undefined);
    eq(u.calls().fetch[0].url, 'https://backend.test/dev/market/candles-dxlink/undefined?timeframe=undefined', '…which is the URL asked for, a quirk pinned and not fixed');
    const bad = fresh(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('not json')) }));
    eq(await bad.get('SPY', '1D'), { value: { ok: false, status: 500, json: null } }, 'a reply whose body is not JSON gives `json: null` and keeps the status…');
    eq(await fresh(() => Promise.reject(new Error('network down'))).get('SPY', '1D'), { error: 'Error: network down' }, '…and a request that fails outright rejects with its error');
  }
  // PURITY.
  {
    const a = fresh(), b = fresh();
    await a.warm('SPY', '4H', 1234); await a.warm('SPY', '4H', 1234);
    await b.warm('SPY', '4H', 1234);
    eq(a.calls().fetch[1], a.calls().fetch[0], 'the same warm-up twice makes the same request twice…');
    eq(a.calls().fetch[0], b.calls().fetch[0], '…and a context that has never been called makes that request too, so the owner keeps no state between calls');
  }
}
// ─────────────────────────────────────────────────────────────────────
section('8. Where this layer would sit, and what it would change');
// ─────────────────────────────────────────────────────────────────────
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  ok(CHAIN.filter((rel) => path.dirname(rel) === path.dirname(MODULE_REL_IF_CUT)).length > 0 && fs.existsSync(path.join(ROOT, path.dirname(MODULE_REL_IF_CUT))), '…its directory, js/services, already holding layers of the chain');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, 'this cut is LARGER than that, by ' + (BODY_CHARS - SMALLEST_LAYER_CHARS) + ' units, so it would NOT be the smallest layer the chain holds…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, LAYERS_SMALLER_THAN_THIS_CUT,
    '…measured against every layer rather than inferred from the smallest: LAYERS_SMALLER_THAN_THIS_CUT layers are smaller than it…');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…and LAYERS_LARGER_THAN_THIS_CUT larger, counted over the whole set…');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 0, '…none of the same size…');
  eq(LAYERS_SMALLER_THAN_THIS_CUT + 1, SIZE_RANK_IF_CUT, '…so it would rank SIZE_RANK_IF_CUT by size…');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  // THE CHAIN-WIDE SHAPE COUNTS. This body is PURE ASCII, so the pure-ASCII count WOULD move; it opens on a declaration and not a
  // banner, so neither banner count moves.
  const ascii = (s2) => !/[^\x00-\x7F]/.test(s2);
  const banner = (s2) => /^\s*\/\/ ── /.test(s2.split('\n')[0]);
  const wide = (s2) => /^\s*\/\/ ─{2,}[ \t]+\S/.test(s2.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(ascii(BODY), '…and this body is too, so that count WOULD move…');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS + 1, '…measured with it included, to PURE_ASCII_LAYERS + 1');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does NOT, opening on a declaration, so that count would NOT move…');
  eq(sources.concat([BODY]).filter(banner).length, LAYERS_OPENING_ON_BANNER, '…measured with it included, which is the same count');
  eq(sources.filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER,
    'while LAYERS_OPENING_ON_WIDE_BANNER open on a banner of two or more dashes, the reading topLevelBanners uses…');
  ok(!wide(BODY), '…and this body does not open on one of those either, so the wider count would NOT move…');
  eq(sources.concat([BODY]).filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER, '…measured with it included, which is the same count');
  // THE FOURTH CHAIN-WIDE COUNT, which WOULD move here: layers whose contract pins a non-empty MONOLITH_DEPENDENCIES.
  // Counted over the suite and then compared with the figure the contract that carries it pins.
  const pinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))
    .filter((src) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    });
  eq(pinning.length, LAYERS_WITH_A_DEPENDENCY,
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, counted over the suite…');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]), LAYERS_WITH_A_DEPENDENCY,
  '…which is the figure the contract that carries it pins');
  ok(MONOLITH_DEPENDENCIES.length > 0, '…and this cut pins a NON-EMPTY list, its two monolith bindings, so that count WOULD move too, to LAYERS_WITH_A_DEPENDENCY + 1: of the four chain-wide counts, two move (pure ASCII and layers with a dependency) and the two banner counts stay');
}
// WHAT THE CUT WOULD COST THE DOCUMENT, forecast here so Phase 2 can be held
// to it the way the last cycle held this one to its own forecast.
eq(TAG_IF_CUT.length, RAW_CHARS - NET_REDUCTION,
  'the tag it would add is RAW_CHARS less NET_REDUCTION units');
eq(TAG_IF_CUT, '<script src="./' + MODULE_REL_IF_CUT + '"></script>\n',
  '…and names the module this audit recommends');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html would land at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
eq(LOCAL_SCRIPTS + 1, LOCAL_SCRIPTS_AFTER, '…and LOCAL_SCRIPTS_AFTER local scripts');
eq(count(INDEX, TAG_IF_CUT), 0, '…and no such tag exists yet');
eq(LOCALS[LOCALS.length - 1], 'js/services/swing-trend-context.js',
  '…the tag would follow the newest local script, which is the previous layer');
// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NOT ONE production file differs from the base: this PR measures, it does not move');
  eq(git(['show', BASE_SHA + ':index.html']).length, BASE_CHARS,
    '…and the base commit\'s index.html is the length measured above');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)),
    '…with the module this audit recommends not yet written');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  ok(all.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  eq(fs.readFileSync(path.join(ROOT, AUDIT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and AUDIT_REL is the path of THIS file, byte for byte');
  ok(all.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  ok(all.every((rel) => rel.startsWith('tests/')), '…and every changed path is a test artifact');
  // THE RATCHET.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this audit in it');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, TEST_FILE_COUNT - 1,
  '…one more than the base commit carried, read out of git');
  const RATCHETED = /^const TEST_FILE_COUNT = \d+;$/m;
  const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js') &&
      RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS files pin the suite file count');
  ok(contracts.every((f) => new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm')
    .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
  '…and every one of them now pins the ratcheted value, this audit included');
  ok(contracts.indexOf(path.basename(AUDIT_REL)) >= 0,
    '…this audit being one of them, so it ratchets itself rather than exempting itself');
  // THE BUDGET.
  const auditSpec = require(path.join(ROOT, AUDIT_SPEC_REL));
  eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length - RETIRED_MUTANTS,
    '…and the live total is the base, LESS the spec this cycle retires, PLUS this audit\'s own '
    + '— the arithmetic of the change rather than the total it happens to reach');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at MUTANT_BUDGET');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  // ABSENCE ALONE IS NOT A PIN.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the outgoing CONTRACT\'s spec is retired, in Phase 1 as the rhythm runs');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely one that never existed');
  ok(fs.existsSync(path.join(ROOT, PREVIOUS_CONTRACT)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + PREVIOUS_CONTRACT + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(AUDIT_SPEC_REL)], '…and during Phase 1 it is THIS audit\'s');
}



console.log('\n' + pass + ' assertions passed.');
console.log('APEX_PARITY_BACKEND_FETCH_AUDIT_OK');
}

main();
