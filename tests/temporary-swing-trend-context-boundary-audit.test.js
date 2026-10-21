'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SWING TREND CONTEXT EXTRACTION — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [388872,390487) in monolith coordinates — 1,615 units raw and
// 1,614 of body, ONE owner, synchronous — into js/services/swing-trend-context.js.
// `_swingTrendContextFromCandles(candles, minBars)` reads a series of candles, weekly or
// daily, and returns the trend context the swing screen shows: whether a read is available,
// the trend (`UP`, `DOWN`, `FLAT` or `unavailable`), the 20- and 30-bar averages, the last
// price and the structure of the two averages. The documentation says it never throws. The
// block is ONE WHOLE SECTION of the monolith: it opens on the section's `// ─── ` banner, with two
// comment lines under it, then the function, and the blank line AFTER the block, in front of the
// banner of the next section, is the separator.
//
// ── THE FINDING, PART ONE: THREE ROWS TIE AT THE BEST SCORE, AND THE KEY ORDERS ──
// ── THEM BY LENGTH ALONE ────────────────────────────────────────────────────────
//
// The contract before this layer published this block as the first of four runners-up, with
// the next two at the same (byConsumerSplit, raw nine) = (3, 8) behind it. The block that
// stood alone at (3, 5) has shipped, and measured again on the base that cut left, those three
// rows now TIE at (3, 8) over the screen and the pass together. The published key
// (byConsumerSplit, raw nine, units ascending) puts this block first by LENGTH ALONE, 1,614 units
// against 1,671 and 1,815, and the audit says so rather than presenting a margin on the raw nine
// that is not there. The other two are pairs and triples of owners from the parity tool's warm-up
// code; no row scores below 3, and the next rows behind them are one step behind on
// byConsumerSplit with a LOWER raw nine, which §4 shows is the ordering the key means.
//
// ── PART TWO: THE FLOOR IS CLEARED BECAUSE THE SCREEN MEASURES FROM THE REGION'S START ─
//
// From its declaration the block is 1,417 units, 83 UNDER the 1,500 floor. It clears the floor, by
// 114 units, only because the screen measures the first owner of a region from the region's start,
// which is where the banner stands: the cut and the screen's row are the same bytes. §2 shows the
// screen enumerates no run at the declaration and exactly one at the banner.
//
// ── PART THREE: FIVE CALLS FROM TWO CONSUMERS, ONE DEPENDENCY, ONE MODULE ───────
//
// The raw nine is 8: five inbound references, one dependency and two references to a shipped
// module. The five references are all CALLS inside function bodies, two in the synchronous
// `_swingBuildCandidate` and three in the async `_swingRenderSpyContext`; the weekly calls pass
// `SWING_MIN_WEEKLY_BARS` and the daily ones `SWING_MIN_DAILY_BARS`. The block reads ONE monolith
// binding, `SWING_MIN_DAILY_BARS`, a `var` declared above it, only as the default of its minimum
// and only when it runs; and it calls `smA` of the shipped js/utils/indicators.js twice, also only
// when it runs, a foundation module and not one of the layers this programme extracted. It writes
// no monolith name, deletes nothing, touches the host through none of window, document,
// storage, console, timers or fetch, and uses the language's own `Array`, `Math` and `isFinite`.
//
// ── PART FOUR: NOTHING IS EVALUATED AS THE MONOLITH LOADS ───────────────────────
//
// None of the five sites is outside a function body, and the block reads nothing as it is
// evaluated, so it loads in a bare VM, where calling it with a series that is too short returns the
// unavailable answer without touching anything, and calling it with enough closes throws
// ReferenceError for `smA`. §3 measures where the sites are. It does NOT measure what calls
// `_swingBuildCandidate` or `_swingRenderSpyContext`, so it does not show that neither runs while the
// monolith is being evaluated. Phase 2 puts the tag directly in front of the inline monolith,
// which makes the question moot rather than answered here.
//
// ── PART FIVE: SIX OPENINGS WERE LEGAL, AND THE BANNER IS PART OF THE CUT ───────
//
// The seam rule admits six line starts between the owner above and the declaration: the closing
// brace of `ffSwingTrading`, the blank line after it, the banner, the two comment lines and the
// declaration. Five of them parse as a program; the one on the brace does not. The cut opens on the
// banner, so the join it leaves, the brace of `ffSwingTrading` against the banner of the next
// section across one blank line, is a shape the monolith already holds 191 times; §2 counts it, and
// shows that cutting at the blank line instead would fuse the brace onto the next banner.
//
// ── PART SIX: THE CUT IS ITS REGION, AND TAKES ITS BANNER ───────────────────────
//
// The region holds this one owner and nothing else, so nothing is priced inside it. §5 prices the
// nearest owner on each side, across the banners: `ffSwingTrading` above and `_swing4hTiming`
// below, both worse than the cut on the raw nine and on byConsumerSplit. The cut takes one banner,
// its own, so the document's top-level banner marks fall from 215 to 214 and its owner regions from
// 114 to 113, which §5 recomputes on the text without the block.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED, NOT ASSUMED ──────────────────────────
//
// §7 loads the block in a VM with nothing defined, then beside the REAL indicators module and the
// monolith's own `var SWING_MIN_DAILY_BARS` declaration, and drives it: the unavailable answer and its
// shape, what counts as a close, the trend below twenty closes, with exactly twenty and with both
// averages, and purity. It pins two quirks without fixing them: a numeric string passes the finite
// test and comes back as a string price, and a perfectly flat series reads UP, because both comparisons
// are `>=`.
//
// ── PRICED, AND WHERE IT WOULD SIT ──────────────────────────────────────────────
//
// §8 ranks it by size against the sixty-five layers the chain holds: it would be the fourth
// smallest, with three layers smaller and sixty-two larger, measured against every layer. Its body
// holds 24 non-ASCII characters, all in the banner line, so the pure-ASCII count would not move; it
// opens on a banner of three dashes, which the narrow `// ── ` reading does not match, so the narrow
// banner count would not move either and the wide one WOULD, by one; and it pins a NON-EMPTY monolith
// dependency list, so the count of layers that pin one WOULD move, by one. §8 measures all four.
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

const MODULE_REL_IF_CUT = 'js/services/swing-trend-context.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'bcd932e';
const BASE_CHARS = 1411890;
const BASE_UTF8 = 1440255;
const BASE_LF = 24363;
const BASE_SHA256 = 'f1dd30ef4903c56fea9d87ebbe9ba8711e810644d3715bb78fdaddd6f110cfce';
const LOCAL_SCRIPTS = 109;
const TEST_FILE_COUNT = 194;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-swing-trend-context-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/swing-trend-context-audit.spec.js';
const RATCHETED_CONTRACTS = 56;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/apex-parity-compare-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 246;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/apex-parity-compare-contract.spec.js';
const RETIRED_MUTANTS = 240;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116628;
const CODE_CHARS = 1295236;
const TOP_LEVEL_DECLS = 881;
const OWNER_REGIONS = 114;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the `// ─── ` banner line of its own section, with two comment lines below it and then the declaration. The blank
// line above the banner stays behind; the blank line AFTER the block, in front of the NEXT section's banner, is the
// structural separator. The block is the WHOLE of its section: a banner, its documentation and its one function.
const RAW_AT_IN_CODE = 388872;
const DECL_AT_IN_CODE = 389069;
const RAW_END_IN_CODE = 390487;
const BODY_END_IN_CODE = 390486;
const RAW_CHARS = 1615;
const BODY_CHARS = 1614;
const BODY_UTF8 = 1662;
const BODY_LF = 34;
const BODY_SHA256 = '7bd3d768fd58927fdac7eb0e4940c0596c6f74ef0d58af1a9c399e8d30ef562f';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// ─── Trend context from a candle series (Weekly or Daily) ─────────────────────';
const DECL_FIRST_LINE = 'function _swingTrendContextFromCandles(candles, minBars) {';
const NON_ASCII_CHARS = 24;
const NEXT_DECL = '_swing4hTiming';
const NEXT_DOC_PREFIX = '// ─── 4H tactical timing';

// ── Its owner ───────────────────────────────────────────────────────────────�
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_swingTrendContextFromCandles'];
const OWNER_SIZES = [1416];
const OWNER = '_swingTrendContextFromCandles';

// ── Its shape ───────────────────────────────────────────────────────────────�
const SPLIT_LINES = 34;
const CODE_LINES = 31;
const COMMENT_LINES = 3;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;
// Where the three comment lines are: all three document the function from above, none sits inside its body.
const BODY_COMMENT_LINES = 0;

// ── The boundary judgement: the openings the seam admits ─────────────────────
const OWNER_BEFORE = 'ffSwingTrading';
const BRACE_OPENING = 388869;
const BLANK_OPENING = 388871;
const DOC_TAKEN = 197;
const DOC_TAKEN_LINES = 3;
const SEAM_LEGAL_OPENINGS = 6;
const PARSING_OPENINGS = 5;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 388870;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 1417;
const CANDIDATES_AT_DECLARATION = 0;
const CANDIDATES_AT_CUT = 1;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut leaves behind: the closing brace of the owner above, one blank line, and the NEXT section's banner,
// a join the monolith already holds, once, at the end of the block; and what it removes: the join of that brace
// against this block's own banner. Taking the blank line as well would fuse the brace straight onto the next banner.
const JOIN_AFTER_CUT = '}\n\n' + NEXT_DOC_PREFIX;
const JOIN_AS_BEFORE = '}\n\n// ─── Trend context';
const FUSED_IF_BLANK_TAKEN = '}\n' + NEXT_DOC_PREFIX;
const JOINS_LIKE_THE_CUT_BEFORE = 191;

// ── The banner region it sits inside ─────────────────────────────────────────
// The block IS its region: the section opens on the banner the block opens on and closes where the next banner begins.
const REGION_AT = 388872;
const REGION_END = 390487;
const REGION_CHARS = 1615;
const REGION_OWNERS = 1;
const OWNER_POSITION = 1;
const BANNER_LINE_PREFIX = '// ─';
const WHOLE_REGION_NINE = 8;
const WHOLE_REGION_BCS = 3;
const WHOLE_REGION_CONSUMERS = 2;
const WHOLE_REGION_DEPS = 1;
const WHOLE_REGION_SIB = 0;
// THE CUT TAKES ONE BANNER: its own, the first line of the block. The document's top-level banner marks fall by one and
// its owner regions by one.
const BANNER_MARKS = 215;
const BANNER_MARKS_AFTER = 214;
const OWNER_REGIONS_AFTER = 113;

// ── Taking more, priced: the owners above; the owners below ──────────────────
// The region holds no owner but the cut, so nothing is priced INSIDE it: the extensions that remain are the
// nearest owner on each side, across the banners that bound the region.
// Above: [name, opening, units, raw nine, byConsumerSplit, monolith dependencies, runs nothing at load].
const EXTENSIONS_UP = [
  ['ffSwingTrading', 388462, 2024, 9, 4, 1, true],
];
const OWNERS_ABOVE = 1;
// Below: [name, closing, units from the cut's opening, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['_swing4hTiming', 391439, 2567, 13, 4, 2],
];
const OWNERS_BELOW = 1;
const UP_LEGAL = 1;
const UP_TIES = 0;
const UP_TIES_BCS = 0;
const UP_WORSE = 1;
const UP_NOT_CLEAN = 0;
const DOWN_LEGAL = 1;
const DOWN_REFUSED = 0;
const DOWN_WORSE = 1;
const DOWN_TIES_BCS = 0;
const DOWN_NOT_CLEAN = 0;
// THE ONE RUN the owner makes, which is the cut itself:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['_swingTrendContextFromCandles', '_swingTrendContextFromCandles', 388872, 390486, 1614, 8, 3, ['SWING_MIN_DAILY_BARS'], 5],
];
const OWN_RUNS_LEGAL = 1;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 0;

// ── Coupling ───────────────────────────────────────────────────────────────�
const FULL_NINE = 8;
const BY_CONSUMER = 5;
const BY_CONSUMER_SPLIT = 3;
const CONSUMERS = ['_swingBuildCandidate', '_swingRenderSpyContext'];
const CONSUMER_SITES = 5;
const CONSUMER_SITES_AT = [395961, 396053, 601985, 602485, 602630];
// What each of the five sites is: [site, the text written there]. All five are CALLS inside function bodies, evaluated
// only when a consumer runs; none is read as the monolith loads.
const SITE_TEXTS = [
  [395961, '_swingTrendContextFromCandles(aligned.weeklyCandles, SWING_MIN_WEEKLY_BARS)'],
  [396053, '_swingTrendContextFromCandles(aligned.dailyCandles, SWING_MIN_DAILY_BARS)'],
  [601985, '_swingTrendContextFromCandles(weekly, SWING_MIN_WEEKLY_BARS)'],
  [602485, '_swingTrendContextFromCandles(backendWeekly, SWING_MIN_WEEKLY_BARS)'],
  [602630, '_swingTrendContextFromCandles(daily, SWING_MIN_DAILY_BARS)'],
];
// The declared consumers that hold the calls: [name, start, end, chars].
const CONSUMER_DECLS = [
  ['_swingBuildCandidate', 394840, 403500, 8661],
  ['_swingRenderSpyContext', 601638, 603365, 1728],
];
// How many other places name the dependency: its own declaration and the places that pass it in or read it. Measured, not assumed.
const OTHER_DEPENDENCY_MENTIONS = 4;
const MONOLITH_DEPENDENCIES = ['SWING_MIN_DAILY_BARS'];
// [name, start, end, chars, form] of each monolith dependency.
const DEPENDENCY_DECLS = [
  ['SWING_MIN_DAILY_BARS', 380580, 380610, 31],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 5;
const OUTBOUND_MODULE_REFERENCES = 2;
const OUTBOUND_MODULE = 'js/utils/indicators.js';
const OUTBOUND_MODULE_NAME = 'smA';
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 2;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_swingTrendContextFromCandles'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7060;
const SEAM_REJECTED = 2077;
const CANDIDATES = 2735;
const CLEAN_CANDIDATES = 1637;
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
const ROWS_AT_THREE = 3;
const ROWS_AT_THREE_SCREEN = 3;
const ROWS_AT_THREE_HIDDEN = 0;
const LOWEST_NINE_AT_THREE = 8;
// THE ROWS AT (byConsumerSplit, raw nine) = (3, 8), pinned in full, in the SCREEN's coordinates:
// [opening, closing, units, consumers, monolith dependencies]. THREE rows tie, and the published key orders them by units.
const TIED_AT_BEST = [
  [388872, 390486, 1614, 2, 1],
  [1176377, 1178048, 1671, 1, 2],
  [1176233, 1178048, 1815, 2, 1],
];
// The best four OTHER openings over the screen and the hidden pass together,
// as [opening, byConsumerSplit, raw nine, units], by the published key.
const RUNNERS_UP = [
  [1176377, 3, 8, 1671],
  [1176233, 3, 8, 1815],
  [565695, 4, 4, 1582],
  [730521, 4, 4, 1949],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
// They are NEGATIVE, because that cut took no banner and its region lost one owner, and a region of fewer
// owners makes fewer runs.
const DELTA_RAW_RUNS = -14;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = -14;
const DELTA_CLEAN = -8;
const PREVIOUS_RAW_CHARS = 2392;
const PREVIOUS_RAW_AT = 1174787;
// The previous contract's published list, in the coordinates of the document BEFORE the cut that
// shipped, which sat below this block.
const PREVIOUS_RUNNERS_UP = [
  [388872, 3, 8, 1614],
  [1178769, 3, 8, 1671],
  [1178625, 3, 8, 1815],
  [565695, 4, 4, 1582],
];

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 65;
const SMALLEST_LAYER_CHARS = 1540;
const SIZE_RANK_IF_CUT = 4;
const LAYERS_LARGER_THAN_THIS_CUT = 62;
const PURE_ASCII_LAYERS = 9;
const LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_WIDE_BANNER = 29;
const LAYERS_WITH_A_DEPENDENCY = 28;

// ── If cut ────────────────────────────────────────────────────────────────�
const TAG_IF_CUT = '<script src="./js/services/swing-trend-context.js"></script>\n';
const NET_REDUCTION = 1554;
const INDEX_AFTER = 1410336;
const RESIDUAL_MONOLITH = 1293621;
const LOCAL_SCRIPTS_AFTER = 110;
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


console.log('SWING TREND CONTEXT EXTRACTION — TEMPORARY BOUNDARY AUDIT');
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the apex parity
// comparison predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the six openings the seam admits');
// ─────────────────────────────────────────────────────────────────────────────
eq(RAW_END_IN_CODE - RAW_AT_IN_CODE, RAW_CHARS, 'the raw fragment is RAW_CHARS units');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE, BODY_CHARS, '…BODY_CHARS of which are body');
eq(RAW_CHARS - BODY_CHARS, 1, '…the difference being the one structural separator');
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single LF, the blank line between the block and the banner of the section that holds ' + NEXT_DECL);
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest');
ok(BODY.endsWith(BODY_ENDING), '…ending on a real line of code');
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the first line of its documentation');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII characters: the body is NOT pure ASCII, so its UTF-8 and UTF-16 lengths are two numbers to pin…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * NON_ASCII_CHARS, '…each of them a box-drawing dash of three bytes in UTF-8 and one unit in UTF-16, two bytes apart');
ok(BODY.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).every((l) => l === DOC_FIRST_LINE),
  '…and every one of them on the FIRST line, the banner, none in code: the encoding of the file matters for that one comment line only');
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
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…the next the banner line, the first line of the cut…');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES lines of documentation, the banner and the two comment lines, are each an opening of their own…');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last being the declaration');
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the six…');
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
    '…so PARSING_OPENINGS of the six are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the whole documentation block above the function and nothing else: the section's own banner and the
// two comment lines directly above the declaration, with the blank line above THEM left behind.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  ok(/^\/\/ ─{2,}[ \t]+\S/.test(doc) && !/^\/\/ ═{2,}/m.test(doc), '…the first of them a `// ── ` banner with a title, the dash kind and not the double-rule kind, so the cut takes ONE section heading with it…');
  eq((doc.match(/^\/\/ ─{2,}[ \t]+\S/gm) || []).length, 1, '…exactly one, the other two being plain comment lines');
  ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0, '…and that banner is one of the document\'s top-level banner marks, at the cut\'s opening');
  ok(MARKS.indexOf(RAW_END_IN_CODE) >= 0, '…the next mark standing exactly where the cut ends, the banner of the following section, which stays');
  eq(MARKS.filter((m) => m > RAW_AT_IN_CODE && m < RAW_END_IN_CODE).length, 0, '…no mark lying between them, so the cut is one WHOLE section and nothing partial');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNER)).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  const fn = BY_NAME.get(OWNER);
  const commentsIn = (text) => text.split('\n').filter((l) => l.trim().startsWith('//')).length;
  eq(commentsIn(CODE.slice(fn.start, fn.end + 1)), BODY_COMMENT_LINES, 'the function holds BODY_COMMENT_LINES comment lines inside its body…');
  eq(DOC_TAKEN_LINES + BODY_COMMENT_LINES, COMMENT_LINES, '…so the block\'s COMMENT_LINES are the three at the top and none inside');
  ok(doc.indexOf('Trend context from a candle series') >= 0 && doc.indexOf('Never throws') >= 0,
    '…and the block promises a trend context from a candle series that NEVER THROWS, a claim §7 measures rather than trusts');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the banner is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE COMMENT BLOCK WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would have left the banner and the two comment lines directly above the banner of the section that holds ' + NEXT_DECL + ', which they do not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto the next section\'s banner, the section of ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith holds nowhere today, once there');
}
// WHAT THE CUT LEAVES. The brace of the owner above, one blank line, then the next section's banner: the very
// join the monolith holds today at the END of the block, so the cut moves it and the document gains no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith holds the join `}` blank line `' + NEXT_DOC_PREFIX + '` once today, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the function…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of this block\'s own banner is held once today, and is gone after the cut…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the banner leaving with the block');
  eq(count(CODE, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE, 'and a brace, a blank line and a comment is a shape the document holds JOINS_LIKE_THE_CUT_BEFORE times…');
  eq(count(atCut, '}\n\n// '), JOINS_LIKE_THE_CUT_BEFORE - 1, '…one fewer after the cut, which removes the join in front of the documentation and keeps the other');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this comment block or declaration is left behind');
}
// THE SCREEN MEASURES THIS RUN FROM THE START OF ITS REGION, which is its banner: from the declaration alone it is UNDER the floor.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION < RUN_FLOOR, '…UNDER RUN_FLOOR, so a run that opens at the declaration is not enumerated…');
eq(RUN_FLOOR - DECL_UNITS_FROM_DECLARATION, 83, '…short of it by 83 units…');
eq(BODY_CHARS - RUN_FLOOR, 114, '…while the cut clears it by 114, the extra being the banner and the two comment lines…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the screen enumerates CANDIDATES_AT_DECLARATION runs that open at the declaration and end where this cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does: the first owner of a region is measured from the region\'s start, which is where its banner stands…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, HIDDEN_ROWS_AT_CUT,
  '…and the pass over sub-floor runs holds HIDDEN_ROWS_AT_CUT rows for it, because the screen already has it');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE - DECL_UNITS_FROM_DECLARATION, DOC_TAKEN,
  '…the cut being the owner measured from its declaration plus exactly the DOC_TAKEN units of documentation above it, which this time the screen DOES measure');
// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one function, five calls from two consumers, one dependency and one module read at call time');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this one name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a declared function, so this layer would ship no mutable binding');
  ok(own.every((d) => !d.isAsync), '…SYNCHRONOUS');
  eq((MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE).match(/\bfunction\b/g) || []).length, 1,
    '…holding NO function expression inside it besides itself: a plain loop, no callbacks…');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).map((d) => d.name), OWNERS_EXPECTED,
    '…and the top-level scan of the block sees only the one owner');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one, among them the reference from a shipped module: no module names the function');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from the monolith outside the block…');
eq(REC.deps, MONOLITH_DEPENDENCIES.slice().sort(), '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: ONE monolith binding, SWING_MIN_DAILY_BARS');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: five inbound references, one dependency and two references to a shipped module');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer, which counts the module references too, is BY_CONSUMER: two consumers, one dependency and two module references, the five calls counting once per consumer…');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'TWO consumers reach in from the monolith: CONSUMERS, both declared functions');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const outside = (at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE;
  eq(refSites(MASKED, OWNER).filter(outside), CONSUMER_SITES_AT, 'all of those references are to ' + OWNER + '…');
  eq(refSites(STRINGS, OWNER).filter(outside).length, 0,
    '…and the name appears in no string or generated markup outside the block');
  eq(count(STATIC_MARKUP, OWNER), 0, '…nor in the static markup, so no inline handler names it');
  eq(SIB_REFS.get(OWNER), { n: 0, who: [] }, '…and no shipped module names it, so the chain of layers already extracted does not reach the block');
  // WHAT EACH OF THE FIVE SITES IS, as written.
  eq(SITE_TEXTS.map(([at]) => at), CONSUMER_SITES_AT, 'SITE_TEXTS pins the same five sites…');
  eq(SITE_TEXTS.map(([at, text]) => CODE.slice(at, at + text.length)), SITE_TEXTS.map(([, text]) => text),
    '…each exactly the text written there');
  eq(SITE_TEXTS.map(([at]) => CODE.slice(at).match(/^_swingTrendContextFromCandles\([^;]*\);/)[0]),
    SITE_TEXTS.map(([, text]) => text + ';'),
    '…every one a CALL, matched through its closing parenthesis and the semicolon that ends its statement, so no pinned text is a prefix of a longer one: a candle series and a minimum bar count, the weekly calls passing SWING_MIN_WEEKLY_BARS and the daily calls SWING_MIN_DAILY_BARS');
}
// WHERE EACH SITE IS: every one is a call inside a function body; none is evaluated as the monolith loads.
{
  const innermost = (at) => FN_BODIES.filter((r) => at >= r.start && at <= r.end).sort((a, b) => b.start - a.start)[0];
  eq(CONSUMER_DECLS.map(([name]) => name), CONSUMERS, 'the declared consumers are CONSUMER_DECLS, both of CONSUMERS…');
  for (const [name, start, end, chars] of CONSUMER_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'function'],
      name + ' is a declared function opening at ' + start + ', ' + chars + ' units long');
    ok(d.start > RAW_END_IN_CODE, '…outside the block, BELOW it');
  }
  eq(CONSUMER_DECLS.map(([name]) => BY_NAME.get(name).isAsync), [false, true], '…the first synchronous and the second ASYNC, the one that builds a candidate and the one that renders SPY context…');
  eq(CONSUMER_SITES_AT.map((at) => (hostOf(at) || {}).name), ['_swingBuildCandidate', '_swingBuildCandidate', '_swingRenderSpyContext', '_swingRenderSpyContext', '_swingRenderSpyContext'],
    '…two of the calls in the first and three in the second');
  ok(CONSUMER_SITES_AT.every((at) => insideFunction(at)), '…every call inside a function body, so not one is a statement the monolith evaluates as it loads…');
  ok(CONSUMER_SITES_AT.every((at) => { const body = innermost(at); const host = BY_NAME.get(hostOf(at).name); return body && body.start >= host.start && body.end <= host.end; }),
    '…each within the body of its host');
  eq(CONSUMER_SITES_AT.filter((at) => !insideFunction(at)).length, 0, '…and none outside one: this block has no load-time reference, so the tag position is not shown to be load-bearing');
}
// THE DEPENDENCY, with its declaration, where the block reads it, and a CONTROL.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  for (const [name, start, end, chars] of DEPENDENCY_DECLS) {
    const d = BY_NAME.get(name);
    eq([d.start, d.end, d.chars, d.form], [start, end, chars, 'var'],
      name + ' is a top-level `var` opening at ' + start + ', ' + chars + ' units long: a global binding the monolith assigns as it evaluates');
    ok(d.end < RAW_AT_IN_CODE, '…declared ABOVE the block, ' + (RAW_AT_IN_CODE - d.end) + ' units above it');
  }
  eq(CODE.slice(DEPENDENCY_DECLS[0][1], DEPENDENCY_DECLS[0][2] + 1), 'var SWING_MIN_DAILY_BARS  = 30;', '…`var SWING_MIN_DAILY_BARS  = 30;`, a number of bars');
  const useSites = refSites(bodyMasked, 'SWING_MIN_DAILY_BARS');
  eq(useSites.length, 1, 'the block names SWING_MIN_DAILY_BARS at ONE place…');
  ok(useSites.every((p) => FN_BODIES.some((r) => p + RAW_AT_IN_CODE >= r.start && p + RAW_AT_IN_CODE <= r.end)),
    '…inside the function body, so the dependency is read when the function runs and not as the block is evaluated…');
  eq(bodyMasked.slice(useSites[0] - 'var min = minBars || '.length, useSites[0] + 'SWING_MIN_DAILY_BARS'.length), 'var min = minBars || SWING_MIN_DAILY_BARS',
    '…as the DEFAULT of `min`, read only when the caller passes no minimum bar count of its own: `var min = minBars || SWING_MIN_DAILY_BARS`');
  ok(!/\bSWING_MIN_DAILY_BARS\s*(=(?!=)|\+\+|--|\+=|-=)/.test(bodyMasked), '…and never as the target of an assignment');
  eq(refSites(MASKED, 'SWING_MIN_DAILY_BARS').filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, OTHER_DEPENDENCY_MENTIONS,
    'control — SWING_MIN_DAILY_BARS is named OTHER_DEPENDENCY_MENTIONS times elsewhere in the monolith, its declaration and the places that pass it in or read it, so the count of 1 above is the block\'s own and not every mention in the file');
  const wider = EXTENSIONS_DOWN[0];
  eq(profileOf([RAW_AT_IN_CODE, wider[1]]).deps.length, wider[5],
    'control — the same profile finds ' + wider[5] + ' dependencies on the cut widened to include ' + wider[0] + ', so the single one above is a measurement');
  // THE OTHER MINIMUM, which the consumers pass and the block does not read.
  eq(refSites(bodyMasked, 'SWING_MIN_WEEKLY_BARS').length, 0, 'the sibling minimum SWING_MIN_WEEKLY_BARS is NOT read by the block: the weekly calls pass it in as an argument from the consumers…');
  ok(bodyMasked.indexOf('minBars') >= 0, '…which is what the `minBars` parameter is for');
}
// THE MODULE IT CALLS: two references to a function of a SHIPPED module, both inside the function body.
{
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  const at = refSites(bodyMasked, OUTBOUND_MODULE_NAME);
  eq(at.length, OUTBOUND_MODULE_REFERENCES, 'the block names ' + OUTBOUND_MODULE_NAME + ' ' + OUTBOUND_MODULE_REFERENCES + ' times…');
  ok(at.every((p) => /^\s*\(/.test(bodyMasked.slice(p + OUTBOUND_MODULE_NAME.length))), '…both as a CALL, one for the 20-bar average and one for the 30-bar…');
  eq(MODULE_OWNERS.get(OUTBOUND_MODULE_NAME), OUTBOUND_MODULE, '…a function declared in ' + OUTBOUND_MODULE + '…');
  ok(LOCALS.indexOf(OUTBOUND_MODULE) >= 0, '…one of the local scripts loaded BEFORE the inline monolith, so it is already defined when the function runs and the move changes nothing about it');
  eq(BY_NAME.get(OUTBOUND_MODULE_NAME), undefined, '…and not declared in the monolith');
  ok(CHAIN.indexOf(OUTBOUND_MODULE) < 0, '…and it is a FOUNDATION module, not one of the layers this programme has extracted, which is why byConsumerSplit leaves its two references out');
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
  eq((bodyMasked.match(/\bnew\s+\w+/g) || []), [], '…no `new` at all…');
  eq((bodyMasked.match(/\b(Math|Object|Number|Date|Array|String|Boolean|JSON|isFinite)\b/g) || []).sort(), ['Array', 'Math', 'Math', 'isFinite'],
    '…and the language\'s own `Array` (for `isArray`), `Math` twice (`max` and `min`) and the global `isFinite`, which any context supplies and which are not the monolith\'s…');
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
  const INHERITED_SCAN_FALSE_HITS = ['s20', 's30'];
  eq(nonLocalAssignmentsUncorrected(BODY), INHERITED_SCAN_FALSE_HITS,
    'the inherited scan reports ' + INHERITED_SCAN_FALSE_HITS.length + ' names as assigned that the block does not own, and not one is foreign: each is a later declarator of a `var` list, which that scan reads as a global…');
  ok(INHERITED_SCAN_FALSE_HITS.every((n) => declaredNamesIn(BODY).has(n)), '…both names the block DECLARES with `var`, which the corrected scan below knows…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan, which counts every declarator of a list as local, finds NON_LOCAL_ASSIGNMENTS either: the block assigns only its own locals and its `out` object');
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { SWING_MIN_DAILY_BARS = 1; }'), ['SWING_MIN_DAILY_BARS'],
    'control — a write to the dependency the block reads is found: the zero above is not blind to the one name that matters here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}
// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: three rows tie at (3, 8), and the published key orders them by length alone');
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
  ok(PREVIOUS_RAW_AT > BODY_END_IN_CODE,
    '…and it sat entirely AFTER this block, so everything this audit measures before it did not move, and everything at or after it moved down by exactly that many units, as read from the rows below');
  const moved = (at) => (at >= PREVIOUS_RAW_AT ? at - PREVIOUS_RAW_CHARS : at);
  // WHAT THE PREVIOUS CONTRACT RECORDED AT THE BEST SCORE, and what became of it.
  const prevAlone = listOf('ALONE_AT_BEST');
  eq(prevAlone.length, 1, 'the previous contract recorded ONE row at the best score and the lowest raw nine, the block that shipped, and it is gone from the document…');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, '…and it published exactly PREVIOUS_RUNNERS_UP behind it…');
  eq(listed[0], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the FIRST of them being THIS block, in the same coordinates (it sat above the cut that shipped, so it did not move), with the same byConsumerSplit and raw nine and the same length, measured from the region\'s start…');
  eq(listed.slice(0, 3).map((r) => [moved(r[0]), r[1], r[2], r[3]]), TIED_AT_BEST.map((r) => [r[0], BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE, r[2]]),
    '…the first THREE of them, moved by the same rule, being exactly the three rows that now tie at the best score…');
  eq(listed.slice(3).map((r) => [moved(r[0]), r[1], r[2], r[3]]), [RUNNERS_UP[2]],
    '…and the fourth, moved by the same rule, this audit\'s third runner-up…');
  ok(listed.some((r) => r[0] < PREVIOUS_RAW_AT) && listed.some((r) => r[0] >= PREVIOUS_RAW_AT),
    '…the rule having moved some of them and left others where they were, both cases present among the four');
  ok(!listed.some((r) => moved(r[0]) === RUNNERS_UP[3][0]),
    '…this audit\'s fourth runner-up being a row the previous contract did not list');
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
  // THE ROWS AT THE BEST SCORE AND THE LOWEST RAW NINE, pinned in full: THREE of them tie, and this block is the shortest.
  const tiedRows = atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .sort((a, b) => a.units - b.units || a.lo - b.lo || a.hi - b.hi);
  const tied = tiedRows.map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length]);
  eq(tied, TIED_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE) are exactly TIED_AT_BEST: THREE rows, every row at the best score among them…');
  eq(tiedRows.length, ROWS_AT_THREE, '…so there is no row at the best score with a worse raw nine than the three that tie');
  ok(tied[0][2] < tied[1][2] && tied[1][2] < tied[2][2], 'their lengths are all different, in strictly ascending order, so the third key column settles it without a further tie: ' + tied.map((r) => r[2]).join(' < '));
  eq([tied[1][2] - tied[0][2], tied[2][2] - tied[0][2]], [57, 201], '…this block 57 units shorter than the second and 201 shorter than the third: it is first by LENGTH ALONE, and the audit says so rather than presenting a margin on the raw nine that is not there…');
  ok(tiedRows[0].hidden !== true, '…its row one of the SCREEN\'s own, not of the pass\'s, and measured from the start of its region, which is where its banner stands…');
  eq(tiedRows[0].c.p.names, OWNERS_EXPECTED, '…its one owner being this block\'s…');
  eq(tiedRows.slice(1).map((r) => r.c.p.names.length), [2, 3], '…while each of the other two is a pair or a triple of owners from the parity tool\'s warm-up code, not a single function');
  eq(tiedRows.slice(1).every((r) => r.lo > RAW_END_IN_CODE), true, '…both below this block, in a different region');
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
  eq(rankedAll.slice(0, 3).map((r) => [r.lo, r.bcs, r.nine, r.units]), [[RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS], RUNNERS_UP[0], RUNNERS_UP[1]],
    'the published key puts this block FIRST over every row, and the other two tied rows second and third…');
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
  ok(ranked.slice(0, 2).every((r) => r[1] === BY_CONSUMER_SPLIT && r[2] === FULL_NINE),
    '…the first two at ' + BY_CONSUMER_SPLIT + ', the same score, with the SAME raw nine as this block\'s, the tie continuing, and the other two one step behind on byConsumerSplit with a LOWER raw nine…');
  ok(ranked.slice(2).every((r) => r[1] === BY_CONSUMER_SPLIT + 1 && r[2] < FULL_NINE), '…both of them');
  eq(ranked[2].slice(1, 3), [BY_CONSUMER_SPLIT + 1, 4], '…which is the ordering the key means by putting byConsumerSplit first');
}
// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: the owner on each side, the one run, and the whole region and its banner');
// ───────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const REGION_UP = REGION_OWNER_LIST.slice(0, OWNER_POSITION - 1).reverse();
const REGION_DOWN = REGION_OWNER_LIST.slice(OWNER_POSITION - 1 + OWNER_COUNT);
// The region holds no owner but the cut, so the extensions that exist are the nearest owner on each side, across the banners.
const OWNERS_UP = DECLS.filter((d) => d.end < REGION.start).slice(-1);
const OWNERS_DOWN = DECLS.filter((d) => d.start >= REGION.end).slice(0, 1);
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
// THE REGION HOLDS NO OWNER BUT THE CUT, so there is nothing to price inside it.
eq([REGION_UP.length, REGION_DOWN.length], [0, 0], 'the region holds NO owner above the cut and NO owner below it…');
// THE NEAREST OWNER ABOVE, across the banner. Priced as the cut extended UP to the start of that owner's documentation.
eq(OWNERS_UP.length, OWNERS_ABOVE, '…so the extensions are the OWNERS_ABOVE nearest owner above the region…');
{
  const priced = OWNERS_UP.map((d) => Object.assign({ name: d.name }, priceUp(d)));
  eq(priced.filter((r) => r.seam !== null).length, UP_LEGAL, '…UP_LEGAL extension at a real seam…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine === FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES,
    '…UP_TIES of them TYING the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, UP_WORSE,
    '…UP_WORSE worse than the cut on BOTH the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, UP_TIES_BCS,
    '…UP_TIES_BCS tying it on byConsumerSplit while worse on the raw nine…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…and not one better on either measure');
  eq(priced.filter((r) => !r.clean).length, UP_NOT_CLEAN, '…UP_NOT_CLEAN of them also running something at load…');
  eq(priced.map((r) => [r.name, r.lo, BODY_END_IN_CODE - r.lo, r.p.nine, r.bcs, r.p.deps.length, r.clean]),
    EXTENSIONS_UP, 'the extension is exactly EXTENSIONS_UP, pinned in full');
  ok(EXTENSIONS_UP.every((e) => e[2] === BODY_END_IN_CODE - e[1]), '…each pinned opening agreeing with its pinned length');
  ok(priced[0].name === OWNER_BEFORE && priced[0].lo === upStart(BY_NAME.get(OWNER_BEFORE)),
    '…the one OWNER_BEFORE, opening at the start of its own documentation');
  ok(priced[0].lo < REGION.start, '…which lies above the region, so the extension takes the whole of this cut and runs on up over the blank line above its banner');
  eq(candidateRuns.filter((c) => c.lo < RAW_AT_IN_CODE && c.hi > RAW_AT_IN_CODE).length, 0,
    '…and the shipped screen enumerates NO run that crosses the banner at the cut\'s opening, which is why this extension is priced here and not read off the screen');
}
// THE NEAREST OWNER BELOW, across the next banner. Priced as the cut extended down to the end of that owner.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'and the OWNERS_BELOW nearest owner below the region…');
{
  const priced = OWNERS_DOWN.map((d) => Object.assign({ name: d.name }, priceDown(d)));
  eq(priced.filter((r) => r.seam !== null).length, DOWN_LEGAL, '…DOWN_LEGAL end at a real seam…');
  eq(priced.filter((r) => r.seam === null).length, DOWN_REFUSED,
    '…and DOWN_REFUSED of them REFUSED by the seam rule…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT).length, DOWN_WORSE,
    '…DOWN_WORSE of them worse than the cut on both the raw nine and byConsumerSplit…');
  eq(priced.filter((r) => r.seam !== null && r.p.nine > FULL_NINE && r.bcs === BY_CONSUMER_SPLIT).length, DOWN_TIES_BCS,
    '…and DOWN_TIES_BCS of them tying it on byConsumerSplit while worse on the raw nine…');
  eq(priced.filter((r) => r.p.nine < FULL_NINE || r.bcs < BY_CONSUMER_SPLIT).length, 0, '…not one better on either measure…');
  eq(priced.filter((r) => !r.clean).length, DOWN_NOT_CLEAN, '…DOWN_NOT_CLEAN of them also running something at load');
  eq(priced.map((r) => [r.name, r.hb, r.hb - RAW_AT_IN_CODE, r.p.nine, r.bcs, r.p.deps.length]),
    EXTENSIONS_DOWN, 'the extension is exactly EXTENSIONS_DOWN, pinned in full');
  ok(EXTENSIONS_DOWN.every((e) => e[2] === e[1] - RAW_AT_IN_CODE), '…each pinned closing agreeing with its pinned length');
  eq(priced[0].name, NEXT_DECL, '…the function right after the cut, in the next section: extending down to it takes a neighbour along and its banner');
  ok(priced[0].hb > REGION.end, '…the extension running past the region\'s end and taking the next banner with it');
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
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR: the cut clears it, by 114 units, with its documentation…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[RAW_AT_IN_CODE, BODY_END_IN_CODE]],
    '…the shipped screen enumerating exactly ONE run inside the block, from the start of its region, which is the cut itself…');
  eq(hiddenRows.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [],
    '…and the pass over sub-floor runs none');
}
// THE BANNER REGION it sits inside IS THE CUT. The block is one whole section: its banner opens the region and the next banner
// closes it, so the cut takes the banner and the document's banner marks and owner regions each fall by one — which the
// regions are recomputed on the text without the block to show.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT…');
  eq([reg.start, reg.end], [RAW_AT_IN_CODE, RAW_END_IN_CODE], '…and the region IS the raw fragment, both ends the cut\'s own: nothing of the region is left behind and nothing outside it is taken…');
  eq(reg.end, REGION_END, '…ending at REGION_END');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on a banner of the BANNER_LINE_PREFIX kind…');
  ok(CODE.slice(reg.start).split('\n')[1].startsWith('// Returns { available, trend'), '…whose documentation, the next line, opens `// Returns { available, trend`…');
  eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…and holding REGION_OWNERS owner');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine, exactly what the cut scores…');
  eq(WHOLE_REGION_NINE, FULL_NINE, '…because it IS the cut…');
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
  eq([before.marks.length, after.marks.length], [BANNER_MARKS, BANNER_MARKS_AFTER],
    'the cut takes ONE banner: the document\'s top-level banner marks fall from BANNER_MARKS to BANNER_MARKS_AFTER…');
  eq(BANNER_MARKS - BANNER_MARKS_AFTER, 1, '…by exactly one…');
  eq([before.regions.length, after.regions.length], [OWNER_REGIONS, OWNER_REGIONS_AFTER],
    '…and its owner regions from OWNER_REGIONS to OWNER_REGIONS_AFTER…');
  eq(after.regions.filter((r) => r.start === reg.start).map((r) => r.end - r.start),
    before.regions.filter((r) => r.start === RAW_END_IN_CODE).map((r) => r.end - r.start),
    '…the region that now opens where the cut was made being the NEXT section, moved up unchanged and the same length');
  eq(after.decls.length, before.decls.length - OWNER_COUNT, '…and the document holding OWNER_COUNT fewer top-level declarations');
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
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — three negative and the seam rejections unchanged, so the screen did not grow');
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs. That cut took no banner, so its
  // region simply lost the owners it held, and the region went from n to n less that many owners.
  const tri = (n) => n * (n + 1) / 2;
  const own = prevNum('REGION_OWNERS'), left = own - prevNum('OWNER_COUNT');
  eq(tri(left) - tri(own), DELTA_RAW_RUNS,
    '…and the raw-run change is exactly what that loss predicts: a region of ' + left + ' owners makes ' + tri(left) + ' runs where one of ' + own + ' made ' + tri(own) + ', a difference of DELTA_RAW_RUNS');
  ok(DELTA_RAW_RUNS < 0 && DELTA_SEAM_REJECTED === 0 && DELTA_CANDIDATES < 0 && DELTA_CLEAN < 0,
    '…the candidate counts shrinking with it and the seam rejections not moving, which this audit measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).length, 0,
  '…and the screen enumerates NO run that opens at the declaration: it measures the first owner of a region from the region\'s start, so every run that includes this owner opens at the banner instead…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).map((c) => c.hi).sort((a, b) => a - b), [BODY_END_IN_CODE],
  '…and the ONE run that opens at the banner is the cut itself, the region holding no other owner for a run to go on into');
// ─────────────────────────────────────────────────────────────────────────────
section('7. The function loads bare, needs the shipped moving average to run, and every branch of the trend read is measured');
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
  const INDICATORS = fs.readFileSync(path.join(ROOT, OUTBOUND_MODULE), 'utf8');
  const MIN_DECL = CODE.slice(DEPENDENCY_DECLS[0][1], DEPENDENCY_DECLS[0][2] + 1);
  const thrown = (f) => { try { f(); return null; } catch (e) { return e.name + ': ' + e.message; } };
  // A context holding the block, the REAL indicators module it calls, and the monolith's own declaration of the default minimum.
  const fresh = () => {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(INDICATORS, ctx);
    vm.runInContext(MIN_DECL, ctx);
    vm.runInContext(BODY, ctx);
    return {
      ctx,
      // Results are copied out through JSON: objects built inside the VM have that realm's prototypes, which a deep
      // equality in this one would refuse. Every value the function returns is a number, string, boolean, null or plain
      // container, and no case below expects a NaN, which JSON would turn into null.
      f: (candles, minBars) => { ctx.__c = candles; ctx.__m = minBars; return JSON.parse(vm.runInContext('JSON.stringify(_swingTrendContextFromCandles(__c, __m))', ctx)); },
      f1: (candles) => { ctx.__c = candles; return JSON.parse(vm.runInContext('JSON.stringify(_swingTrendContextFromCandles(__c))', ctx)); },
    };
  };
  const cl = (a) => a.map((c) => ({ close: c }));
  const run = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
  const UNAVAILABLE = { available: false, trend: 'unavailable', sma20: null, sma30: null, price: null, structure: 'unavailable' };

  // LOADING needs nothing; CALLING needs the moving average and the default minimum only when it reaches them.
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(BODY, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its one owner');
  eq(vm.runInContext(OWNER + '.constructor.name', bare), 'Function', '…an ordinary synchronous function');
  eq(vm.runInContext(OWNER + '.length', bare), 2, '…taking two arguments, a candle series and a minimum bar count');
  eq(JSON.parse(vm.runInContext('JSON.stringify(' + OWNER + '([], 5))', bare)), UNAVAILABLE,
    '…and CALLING it there with a series that is too short returns the unavailable answer, because it reaches neither the default minimum nor the moving average…');
  eq(JSON.parse(vm.runInContext('JSON.stringify(' + OWNER + '(null, 5))', bare)), UNAVAILABLE, '…as does a series that is not an array at all…');
  eq(thrown(() => vm.runInContext(OWNER + '([], 0)', bare)), 'ReferenceError: SWING_MIN_DAILY_BARS is not defined',
    '…but with no minimum of its own it reads the default first and throws ReferenceError for it: the dependency is read at CALL time and only as the default…');
  eq(thrown(() => vm.runInContext(OWNER + '([{ close: 1 }, { close: 2 }, { close: 3 }], 3)', bare)), 'ReferenceError: smA is not defined',
    '…and with enough closes to need a moving average it throws ReferenceError for ' + OUTBOUND_MODULE_NAME + ': loading needs nothing, calling needs the indicators module');
  eq(thrown(() => vm.runInContext('(function () { return notDefinedAnywhere; })()', bare)), 'ReferenceError: notDefinedAnywhere is not defined',
    'control — the same bare VM raises ReferenceError for any function that reads a name it does not have, so the failures above are the reasons claimed');
  {
    const noMin = vm.createContext(Object.create(null));
    vm.runInContext(INDICATORS, noMin);
    vm.runInContext(BODY, noMin);
    eq(JSON.parse(vm.runInContext('JSON.stringify(' + OWNER + '([{ close: 1 }, { close: 2 }, { close: 3 }], 3))', noMin)).trend, 'UP',
      'with the indicators defined but the default minimum NOT, a caller that passes its own minimum never reads the binding: the call succeeds…');
    eq(thrown(() => vm.runInContext(OWNER + '([{ close: 1 }], 0)', noMin)), 'ReferenceError: SWING_MIN_DAILY_BARS is not defined',
      '…and one that passes none throws');
  }

  // THE UNAVAILABLE ANSWER and its shape.
  {
    const h = fresh();
    eq(h.f([], 5), UNAVAILABLE, 'a series shorter than the minimum gives the unavailable answer: not available, trend `unavailable`, no averages, no price, structure `unavailable`…');
    eq(Object.keys(h.f([], 5)), ['available', 'trend', 'sma20', 'sma30', 'price', 'structure'], '…its six keys in a fixed order…');
    eq([null, undefined, 'abc', 5, {}, { length: 99 }, true].map((v) => h.f(v, 1)), Array(7).fill(UNAVAILABLE),
      '…and so does any input that is not an array — null, undefined, a string, a number, an object, an object that merely claims a length, a boolean — even with a minimum of one');
    eq([h.f1(cl(run(29, (i) => i + 1))), h.f1(cl(run(30, (i) => i + 1))).available], [UNAVAILABLE, true],
      'with no minimum given the default is THIRTY bars: 29 closes are unavailable and 30 are not…');
    eq([h.f(cl(run(29, (i) => i + 1)), 0), h.f(cl(run(29, (i) => i + 1)), null), h.f(cl(run(29, (i) => i + 1)), NaN), h.f(cl(run(29, (i) => i + 1)), undefined)],
      Array(4).fill(UNAVAILABLE), '…a minimum that is zero, null, NaN or undefined falling back to that default (it is `minBars || default`, so any falsy value does)…');
    eq([h.f(cl(run(4, (i) => i + 1)), 5).available, h.f(cl(run(5, (i) => i + 1)), 5).available], [false, true], '…while a given minimum of five makes five closes the line…');
    vm.runInContext('SWING_MIN_DAILY_BARS = 10;', h.ctx);
    eq([h.f1(cl(run(9, (i) => i + 1))).available, h.f1(cl(run(10, (i) => i + 1))).available], [false, true],
      '…and once the default binding is reassigned the SAME call moves its line, the default being read when the function runs, not when it loads');
  }
  // WHAT COUNTS AS A CLOSE.
  {
    const h = fresh();
    eq(h.f([{ close: 0, c: 99 }, { close: null, c: 2 }, { c: 3 }, { close: NaN, c: 4 }, null, { close: 'x' }, { close: Infinity }, {}], 1),
      { available: true, trend: 'UP', sma20: null, sma30: null, price: 3, structure: 'partial' },
      'the close is `close` when that is not null, else `c`: a close of ZERO is kept and does not fall back to `c`, a null `close` does, a candle with neither is skipped, and so are NaN, a non-numeric string, Infinity and a null entry — leaving the closes 0, 2 and 3, the last of them the price');
    eq(h.f([{ close: 1 }, { close: 2 }, { close: NaN }], 3), UNAVAILABLE,
      '…and the minimum is applied AGAIN to what is left: three entries with one unusable close are two closes, under a minimum of three, and the answer is unavailable');
    eq(h.f([{ close: null, c: 2 }, { c: 3 }], 2).price, 3, '…the fallback to `c` working for every entry that has no `close`');
    eq(JSON.parse(vm.runInContext('JSON.stringify((function () { var r = _swingTrendContextFromCandles([{ close: "1" }, { close: "2" }, { close: "3" }], 3); return [r.available, typeof r.price, r.price, r.trend]; })())', h.ctx)),
      [true, 'string', '3', 'UP'], '…and a numeric STRING passes the finite test and is kept as a string, so the price comes back as the string `3`, a quirk pinned and not fixed');
  }
  // THE TREND BELOW TWENTY CLOSES: no average, so the last close is compared with the close five bars before it.
  {
    const h = fresh();
    eq(h.f(cl(run(10, (i) => i + 1)), 5), { available: true, trend: 'UP', sma20: null, sma30: null, price: 10, structure: 'partial' },
      'with fewer than 20 closes there is no average: a rising series is UP, with both averages null, the price the last close and the structure `partial`…');
    eq(h.f(cl(run(10, (i) => 10 - i)), 5).trend, 'DOWN', '…a falling one DOWN…');
    eq(h.f(cl(run(10, () => 7)), 5).trend, 'FLAT', '…and a flat one FLAT, the three outcomes of the comparison of the last close with the one five bars back…');
    eq([h.f(cl([1, 1, 1, 1, 1, 9, 2]), 7).trend, h.f(cl([9, 1, 1, 1, 1, 1, 2]), 7).trend, h.f(cl([1, 9, 1, 1, 1, 1, 2]), 7).trend], ['UP', 'UP', 'DOWN'],
      '…the comparison being with the close FIVE bars before the last, not four and not six: a 9 at that place makes the read DOWN and a 9 one place earlier or later does not');
    eq([h.f(cl([3, 5]), 2).trend, h.f(cl([5, 3]), 2).trend], ['UP', 'DOWN'], '…and with fewer than six closes the comparison is with the FIRST close');
  }
  // THE TREND WITH A TWENTY-BAR AVERAGE.
  {
    const h = fresh();
    eq(h.f(cl(run(20, (i) => i + 1)), 20), { available: true, trend: 'UP', sma20: 10.5, sma30: null, price: 20, structure: 'partial' },
      'with exactly 20 closes the 20-bar average exists and the 30-bar one does not: a rising series is UP and the structure stays `partial`…');
    eq(h.f(cl(run(20, (i) => 20 - i)), 20), { available: true, trend: 'DOWN', sma20: 10.5, sma30: null, price: 1, structure: 'partial' },
      '…a falling one DOWN, the price below its average — and with 20 closes there is no average three bars back, so the slope falls back to the position against the average itself…');
    eq(h.f(cl(run(24, (i) => i + 1)), 24), { available: true, trend: 'UP', sma20: 14.5, sma30: null, price: 24, structure: 'partial' },
      '…and from 24 closes on the slope is real, taken against the 20-bar average three bars back');
  }
  // THE TREND WITH BOTH AVERAGES.
  {
    const h = fresh();
    eq(h.f(cl(run(40, (i) => i + 1))), { available: true, trend: 'UP', sma20: 30.5, sma30: 25.5, price: 40, structure: 'SMA20>SMA30' },
      'with 40 rising closes both averages exist — the mean of the last 20 and of the last 30 — and the read is UP with structure `SMA20>SMA30`…');
    eq(h.f(cl(run(40, (i) => 40 - i))), { available: true, trend: 'DOWN', sma20: 10.5, sma30: 15.5, price: 1, structure: 'SMA20<SMA30' },
      '…40 falling closes give DOWN and `SMA20<SMA30`…');
    eq(h.f(cl(run(40, () => 100))), { available: true, trend: 'UP', sma20: 100, sma30: 100, price: 100, structure: 'SMA20>SMA30' },
      '…a perfectly FLAT series reads UP and `SMA20>SMA30`, because both comparisons are `>=`: equal counts as above and as rising, a quirk pinned and not fixed…');
    eq(h.f(cl(run(30, () => 100).concat([90, 90, 90, 101]))), { available: true, trend: 'FLAT', sma20: 98.55, sma30: 99.03333333333333, price: 101, structure: 'SMA20<SMA30' },
      '…a price ABOVE its average while the average is falling reads FLAT, the two signals disagreeing…');
    eq(h.f(cl(run(39, (i) => i + 1).concat([28]))), { available: true, trend: 'FLAT', sma20: 29.9, sma30: 25.1, price: 28, structure: 'SMA20>SMA30' },
      '…and a price BELOW its average while the average is still rising reads FLAT too, the other way round, with the structure independent of the trend');
  }
  // PURITY.
  {
    const h = fresh();
    const frozen = Object.freeze(run(40, (i) => Object.freeze({ close: i + 1 })));
    eq(h.f(frozen), h.f(cl(run(40, (i) => i + 1))), 'with the series and every candle in it FROZEN the answer is the same: the function writes to nothing it is handed…');
    eq(h.f(frozen), h.f(frozen), '…and the same call twice gives the same answer, so it keeps no state between calls');
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
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    '…measured against every layer rather than inferred from the smallest: it would rank SIZE_RANK_IF_CUT by size');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it, counted over the whole set');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  // THE CHAIN-WIDE SHAPE COUNTS. This body holds NON_ASCII_CHARS non-ASCII characters, so the pure-ASCII count would NOT move.
  // It opens on a banner of THREE dashes, which the `// ── ` reading (two dashes and a space) does not match but the wider
  // reading topLevelBanners uses does, so the narrow banner count would NOT move and the wide one WOULD.
  const ascii = (s2) => !/[^\x00-\x7F]/.test(s2);
  const banner = (s2) => /^\s*\/\/ ── /.test(s2.split('\n')[0]);
  const wide = (s2) => /^\s*\/\/ ─{2,}[ \t]+\S/.test(s2.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(!ascii(BODY), '…and this body is not, holding NON_ASCII_CHARS non-ASCII characters, so that count would NOT move…');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS, '…measured with it included, which is the same count');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does NOT, its first line being a banner of three dashes where that reading wants two and a space, so that count would NOT move…');
  eq(sources.concat([BODY]).filter(banner).length, LAYERS_OPENING_ON_BANNER, '…measured with it included, which is the same count');
  eq(sources.filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER,
    'while LAYERS_OPENING_ON_WIDE_BANNER open on a banner of two or more dashes, the reading topLevelBanners uses…');
  ok(wide(BODY), '…while this body opens on one of those, so the wider count WOULD move…');
  eq(sources.concat([BODY]).filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER + 1, '…measured with it included, to LAYERS_OPENING_ON_WIDE_BANNER + 1: of the two banner counts the wide one moves and the narrow one stays');
  // THE FOURTH CHAIN-WIDE COUNT, which WOULD move here too: layers whose contract pins a non-empty MONOLITH_DEPENDENCIES.
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
  ok(MONOLITH_DEPENDENCIES.length > 0, '…and this cut pins a NON-EMPTY list, its one monolith binding, `SWING_MIN_DAILY_BARS`, so that count WOULD move too, to LAYERS_WITH_A_DEPENDENCY + 1: of the four chain-wide counts, two move — the wide banner count and this one — and the pure-ASCII and narrow banner counts stay');
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
eq(LOCALS[LOCALS.length - 1], 'js/services/apex-parity-compare.js',
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
console.log('SWING_TREND_CONTEXT_AUDIT_OK');
}

main();
