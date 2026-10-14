'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// DSS CHART LOAD GUARD — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [182656,184809) in monolith coordinates — 2,153 units raw
// and 2,152 of body, THREE owners, two mutable `var` bindings and one function —
// into js/services/scanner-dss-chart-load-guard.js. `_dssRenderLargeCharts`, the
// Directional Setup Scanner's detail chart, is re-entered from many paths, and
// this block is what keeps each re-entry from reloading the backend candles: the
// 45-second TTL constant `_DSS_CHART_LOAD_TTL_MS`, the guard object
// `_dssChartLoadGuard` that remembers the last complete load and the load in
// flight, and `_dssLoadBackendCandlesDeduped`, which starts the backend candle
// fetch for a symbol or hands back the promise of an identical fetch that is
// already running. The first 820 units are the ten comment lines that document
// it, and the first of those is the banner of its region.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT FIRST ────────────
//
// The contract before this audit published its four best other openings, and the
// first was this one. The cut that contract shipped sat AFTER this opening in the
// monolith, so this opening is at the offset it published; the other three also
// sat before that cut and did not move either. §4 checks the published list
// against this base: the first of the four is this opening, unmoved, the other
// three are the top of the list that remains, and the list gains a fourth entry
// from beneath.
//
// ── PART TWO: THE TIE IS GONE ──────────────────────────────────────────────
//
// The previous audit stated a tie at the best score the screen can state, between
// the opening it took and this one, and broke it with the order the screen
// publishes. That opening shipped. Over the screen and the pass over its
// sub-floor runs together, §4 counts no row whose byConsumerSplit is below 2 and
// exactly ONE row at 2 whose raw nine is 5: this one. Every other row at 2 has a
// raw nine of 6 or more. The claim is scoped to those two enumerations.
//
// ── PART THREE: THE SCREEN HOLDS THIS ROW BECAUSE IT OPENS ON A BANNER ─────
//
// Measured from the declaration the run is 1,332 units, under the 1,500 floor.
// The screen opens a region's first owner at the region's start, which here is
// the banner, so the run it enumerates is 2,152 units. §2 measures that the
// screen holds exactly one run opening at the cut and ending where the cut ends,
// none at the declaration, and that the pass over sub-floor runs holds none.
//
// ── PART FOUR: THE STATE IS SHARED THROUGH AN ALIAS THE PROFILE CANNOT SEE ─
//
// The profile counts no write into the block from outside. `_dssRenderLargeCharts`
// binds `var _dssGuard = _dssChartLoadGuard;` — the only reference to the guard
// outside the block — and writes eleven times to four of the guard's seven fields
// through that alias; the function writes six times to the other three through its
// own. §3 measures it with a scan that follows an alias, with a control that finds
// a planted write, and shows the two sets of fields are disjoint and together are
// the seven keys the guard declares. Nothing reassigns the binding itself.
//
// ── PART FIVE: A SMALLER CUT SCORES BETTER ON THE RAW NINE, AND THE FLOOR ──
// ── EXCLUDES IT ────────────────────────────────────────────────────────────
//
// Opening at `_dssChartLoadGuard` instead leaves the TTL constant, and the
// documentation and banner above it, in the monolith: 1,296 units, raw nine 3
// against 5, byConsumerSplit equal at 2. The whole of the difference is the two
// places the consumer reads the constant. That run is below the floor from its
// declaration and has no documentation above it for the pass to add, so neither
// enumeration holds it; §5 prices it, and the function alone, and refuses the
// ends that would split the block. The recommendation keeps the constant with the
// guard and the documentation. That is a judgement and this paragraph is where it
// is published, not a ranking the screen made.
//
// ── PART SIX: THE CUT TAKES ITS REGION'S BANNER, AND THE REST JOIN THE REGION ─
// ── ABOVE ──────────────────────────────────────────────────────────────────
//
// The banner names the thing that moves, so it moves. Its region holds eleven
// owners and the cut takes the first three; the other eight, `_dss4hRsWarned`
// onward, are left with no banner of their own and fall under the one above,
// which grows from sixteen owners to twenty-four. §5 applies the cut to the
// monolith and measures the banner count and the region count before and after.
//
// ── PART SEVEN: ONE MONOLITH DEPENDENCY, A REJECTION, AND ONE HOST GLOBAL ──
//
// The function calls `_scannerFetchBackendCandlesForChart`, which stays: it is
// declared about 1.1 million units further down and has five other references
// outside its own declaration and this block.
// The call sits inside a `try`, so a missing dependency, or one that throws,
// comes back as a REJECTED promise, not an exception. The one mention of
// `window`, `globalThis`, `self` or `document` is `window`, reached the first time
// a duplicate in-flight load is skipped; in a VM that lacks it that first
// duplicate throws a ReferenceError, after setting the flag that suppresses the
// log, and the next duplicate does not. §7 runs the
// block against fakes and walks each branch.
//
// ── PRICED, AND WHERE IT WOULD SIT ─────────────────────────────────────────
//
// §8 ranks it by size against the fifty-three layers the chain holds, and counts
// the shape measures against it: its body is not pure ASCII, so the pure-ASCII
// count would NOT move; it opens on a banner, so that count WOULD, by one; and the
// count of layers that pin a monolith dependency would move by one.
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

const MODULE_REL_IF_CUT = 'js/services/scanner-dss-chart-load-guard.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '09b5ad9';
const BASE_CHARS = 1436136;
const BASE_UTF8 = 1464659;
const BASE_LF = 24796;
const BASE_SHA256 = '94fd84a3d84bd7045c9ff58980fa56029f6f50deecadbc26c7623c4b1ad27a05';
const LOCAL_SCRIPTS = 97;
const TEST_FILE_COUNT = 182;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-scanner-dss-chart-load-guard-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/scanner-dss-chart-load-guard-audit.spec.js';
const RATCHETED_CONTRACTS = 44;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/option-streamer-diagnostics-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 149;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/option-streamer-diagnostics-contract.spec.js';
const RETIRED_MUTANTS = 143;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115829;
const CODE_CHARS = 1320281;
const TOP_LEVEL_DECLS = 906;
const OWNER_REGIONS = 117;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the REGION'S BANNER, ten comment lines above the first
// declaration. A blank line stands between the listener statement above it and
// the banner.
const RAW_AT_IN_CODE = 182656;
const DECL_AT_IN_CODE = 183476;
const RAW_END_IN_CODE = 184809;
const BODY_END_IN_CODE = 184808;
const RAW_CHARS = 2153;
const BODY_CHARS = 2152;
const BODY_UTF8 = 2190;
const BODY_LF = 39;
const BODY_SHA256 = '36470a958ef001f61244f4e9d6715739fc05cfe83dd9bf57edceb174f1824d72';
const BODY_ENDING = '}\n';
const BANNER_FIRST_LINE =
  '// ── Directional Chart backend-candle load dedup / TTL throttle ───────────────';
const DECL_FIRST_LINE = 'var _DSS_CHART_LOAD_TTL_MS = 45000;';
const EM_DASHES = 2;
const BOX_DRAWING_CHARS = 17;
const NON_ASCII_CHARS = 19;
const NEXT_DECL = '_dss4hRsWarned';
const DOC_UNITS = 820;
const DOC_LINES = 10;
const UNITS_FROM_DECLARATION = 1332;
const FUNCTION_DOC_LINES = 3;

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 3;
const OWNERS_EXPECTED = ['_DSS_CHART_LOAD_TTL_MS', '_dssChartLoadGuard', '_dssLoadBackendCandlesDeduped'];
const OWNER_SIZES = [35, 224, 839];
const OWNER_FORMS = ['var', 'var', 'function'];
const FUNCTION_OWNER = '_dssLoadBackendCandlesDeduped';
const GUARD_OWNER = '_dssChartLoadGuard';
const TTL_OWNER = '_DSS_CHART_LOAD_TTL_MS';
const TTL_VALUE = 45000;
const GUARD_FIELDS = ['key', 'ts', 'scbc', 'inflight', 'inflightKey', 'inflightSkipLogged', 'ttlSkipLogged'];
const GUARD_INITIAL = { key: null, ts: 0, scbc: null, inflight: null, inflightKey: null, inflightSkipLogged: false, ttlSkipLogged: false };

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 39;
const CODE_LINES = 25;
const COMMENT_LINES = 14;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous owner's declaration and the cut the seam accepts
// EIGHTEEN line starts: two on the resize listener's comment and statement, four
// inside the listener's body, the blank line, the banner, the nine further
// documentation lines, and the declaration.
const PREVIOUS_OWNER = '_dssResizeTimer';
const LISTENER_COMMENT_OPENING = 182356;
const LISTENER_OPENING = 182446;
const INSIDE_LISTENER_OPENINGS = [182492, 182525, 182558, 182651];
const BLANK_OPENING = 182655;
const DOC_OPENINGS = [182737, 182822, 182906, 182968, 183050, 183131, 183215, 183300, 183385];
const MID_LINE_OPENING = 182357;
const SEAM_LEGAL_OPENINGS = 18;
const PARSING_OPENINGS = 14;
const SYNTAX_ERROR_OPENINGS = 4;
const CLEAN_OPENINGS = 12;
const STATEMENT_OPENINGS = 2;
const LISTENER_STATEMENT_LINES = 5;
const LISTENER_READS_AT_LOAD = 9;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const SYNTAX_ERROR = 'SyntaxError';
const CANDIDATES_AT_CUT = 1;
const CANDIDATES_AT_DECL = 0;
const HIDDEN_ROWS_AT_CUT = 0;
// What each choice of opening leaves behind. The listener's closing `});` ends
// at the cut's raw start less the blank line; the block below it opens with the
// documentation of the next owner.
const LISTENER_END_AT = 182651;
const JOIN_IF_CUT = '});\n\n// Compute 4H Relative Strength vs SPY';
const JOIN_IF_CUT_AT_BLANK = '});\n// Compute 4H Relative Strength vs SPY';

// ── The banner region it sits inside, and the one above ──────────────────────
const REGION_AT = 182656;
const REGION_END = 190073;
const REGION_CHARS = 7417;
const REGION_OWNERS = 11;
const OWNER_POSITION = 1;
const BANNER_LINE_PREFIX = '// ── Directional Chart backend-candle load dedup';
const ABOVE_REGION_AT = 146963;
const ABOVE_REGION_OWNERS = 16;
const ABOVE_BANNER_PREFIX = '// ── RTH 4H aggregation from DXLink 30M buffer';
const BANNERS_BEFORE = 218;
const BANNERS_AFTER = 217;
const REGIONS_AFTER = 116;
const MERGED_REGION_OWNERS = 24;
const MERGED_REGION_END_AFTER_CUT = 187920;
const WHOLE_REGION_NINE = 20;
const WHOLE_REGION_BCS = 11;
const WHOLE_REGION_CONSUMERS = 3;
const WHOLE_REGION_DEPS = 8;
const WHOLE_REGION_SIB = 0;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: the cut is the FIRST owner of its region, so every owner above it is in
// the region above, and every run up to the cut crosses the resize listener, a
// top-level statement. [name of the first owner taken, opening, raw units to the
// cut's raw end, raw nine, byConsumerSplit, monolith dependencies]. The first
// four of the sixteen; §5 prices all sixteen.
const EXTENSIONS_UP = [
  ['_dssResizeTimer', 182326, 2483, 7, 4, 3],
  ['_dssDetailSymbol', 182244, 2565, 28, 17, 2],
  ['_drawCandleChart', 161960, 22849, 47, 32, 4],
  ['prepareHiDPICanvas', 160881, 23928, 49, 34, 3],
];
const OWNERS_ABOVE = 16;
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies]. The legal ends among the eight
// owners below the block; the other five are refused by the seam rule.
const EXTENSIONS_DOWN = [
  ['_dssCandleClose', 2999, 23, 8, 1],
  ['_dss4hRelativeStrength', 6403, 14, 9, 6],
  ['_dss4hStartSpyPoll', 7417, 20, 11, 8],
];
const OWNERS_BELOW = 8;
const DOWN_REFUSED = ['_dss4hRsWarned', '_dss4hSpyPollTimer', '_dss4hSpyPollCount', '_DSS4H_SPY_POLL_MAX', '_dss4hStopSpyPoll'];
const REFUSAL_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
// The two SMALLER cuts that open on a later owner of the block: [name of the
// first owner taken, opening, units of body, raw nine, byConsumerSplit, monolith
// dependencies, inbound reference sites]. Neither is held by the screen.
const SMALLER_CUTS = [
  ['_dssChartLoadGuard', 183512, 1296, 3, 2, ['_scannerFetchBackendCandlesForChart'], 2],
  ['_dssLoadBackendCandlesDeduped', 183737, 1071, 3, 3, ['_dssChartLoadGuard', '_scannerFetchBackendCandlesForChart'], 1],
];
// The ends inside the block, refused: after the TTL constant and after the guard.
const INTERIOR_END_REFUSALS = [183512, 183737];
const TTL_CONSUMER_SITES = 2;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 5;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = '_dssRenderLargeCharts';
const CONSUMER_SITES = 4;
const CONSUMER_SITES_AT = [193758, 194232, 195396, 195587];
const CONSUMER_AT = 193251;
const CONSUMER_END = 206064;
const CONSUMER_CHARS = 12814;
const MONOLITH_DEPENDENCIES = ['_scannerFetchBackendCandlesForChart'];
const DEPENDENCY_REFERENCES = 1;
const DEPENDENCY_AT = 1283629;
const DEPENDENCY_END = 1293195;
const DEPENDENCY_CHARS = 9567;
// Every reference to the dependency in the monolith, as [offset, enclosing
// declaration]: this block, four more in named functions that stay, its own
// declaration, and one inside a function expression assigned at top level.
const DEPENDENCY_SITES = [
  [184459, '_dssLoadBackendCandlesDeduped'],
  [211986, '_scannerPrefetchLookupCandles'],
  [226625, '_scannerLoadBackendCandlesForInlineChart'],
  [246372, 'openChartForSymbolLookup'],
  [1282693, '_loadBackendChartCandles'],
  [1283644, '_scannerFetchBackendCandlesForChart'],
  [1293759, '(TOP LEVEL)'],
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
const HOST_GLOBAL_MENTIONS = 1;
const EVALUATION_TIME_READS = [];
// The scan this file inherited reads only the first name of a `var` list as
// local. This block declares no such list inside a function, so it reports
// nothing here; the controls in §3 show it still does where one exists.
const UNCORRECTED_SCAN_HITS = 0;
// THE ALIAS. The consumer binds the guard once and writes through the binding;
// the function writes through its own. [field, writes] over each.
const CONSUMER_ALIAS_MENTIONS = 25;
const CONSUMER_ALIAS_WRITES = [['key', 4], ['scbc', 4], ['ts', 1], ['ttlSkipLogged', 2]];
const CONSUMER_ALIAS_READS = 13;
const FUNCTION_ALIAS_MENTIONS = 13;
const FUNCTION_ALIAS_WRITES = [['inflight', 3], ['inflightKey', 1], ['inflightSkipLogged', 2]];
const FUNCTION_ALIAS_READS = 6;
const ALIAS_BINDING = 'var _dssGuard = _dssChartLoadGuard;';
const DEPENDENCY_DISTANCE_MILLIONS = 1.1;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_DSS_CHART_LOAD_TTL_MS', '_dssChartLoadGuard', '_dssLoadBackendCandlesDeduped'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7194;
const SEAM_REJECTED = 2045;
const CANDIDATES = 2860;
const CLEAN_CANDIDATES = 1751;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 6;
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
  [745622, 747321, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 7;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit].
const BEST_TIER_ROWS = [
  [182656, 184808, 5, 2],
  [71214, 72907, 6, 2],
  [576762, 578321, 6, 2],
  [620318, 623642, 6, 2],
  [70936, 72907, 7, 2],
  [745622, 747321, 7, 2],
  [876975, 879066, 7, 2],
];
const SECOND_BEST_NINE = 6;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [576762, 2, 6, 1559],
  [71214, 2, 6, 1693],
  [620318, 2, 6, 3324],
  [745622, 2, 7, 1699],
];
// The previous audit's tie partner was this opening; the previous contract
// published it as the first of its runners-up.
const TIE_OPENING = 182656;
// The shipped cut took this many runs out of the screen, measured against the
// figures the previous contract pinned.
const DELTA_RAW_RUNS = 24;
const DELTA_CANDIDATES = 24;
const DELTA_CLEAN = 19;
const PREVIOUS_RAW_CHARS = 1873;
const PREVIOUS_RAW_AT = 935282;

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 53;
const SMALLEST_LAYER_CHARS = 1587;
const SIZE_RANK_IF_CUT = 11;
const LAYERS_LARGER_THAN_THIS_CUT = 43;
const PURE_ASCII_LAYERS = 6;
const LAYERS_OPENING_ON_BANNER = 24;
const LAYERS_WITH_A_DEPENDENCY = 20;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/services/scanner-dss-chart-load-guard.js"></script>\n';
const NET_REDUCTION = 2083;
const INDEX_AFTER = 1434053;
const RESIDUAL_MONOLITH = 1318128;
const LOCAL_SCRIPTS_AFTER = 98;

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



console.log('DSS CHART LOAD GUARD — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. Phase 2 puts a peel here and this
// becomes the reconstruction the permanent contract runs against.
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the
// option streamer diagnostics predicted the document, the residual monolith and
// the script count this audit measures, so the two cycles are joined by numbers.
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
section('2. The region, its seam, and the eighteen openings the seam admits');
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
eq(firstLineOf(BODY), BANNER_FIRST_LINE, '…and opening on BANNER_FIRST_LINE, the banner of its region');
eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE, '…ten comment lines above DECL_FIRST_LINE, the first declaration');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…holding NON_ASCII_CHARS non-ASCII characters, so it is NOT pure ASCII…');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…EM_DASHES of them em dashes…');
eq((BODY.match(/─/g) || []).length, BOX_DRAWING_CHARS, '…and BOX_DRAWING_CHARS of them the box-drawing rule of the banner…');
eq(EM_DASHES + BOX_DRAWING_CHARS, NON_ASCII_CHARS, '…which together are every one of them');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, NON_ASCII_CHARS * 2,
  '…each taking three bytes in UTF-8 and one UTF-16 unit, which is why the two lengths differ by twice their count');
eq(INDEX.indexOf(BODY), CODE_AT + RAW_AT_IN_CODE,
  '…and it occurs in the document at the offset the monolith coordinate implies');
eq(count(INDEX, BODY), 1, '…exactly once, so the fragment is not ambiguous');

// THE SEAM IS MECHANICAL, and it is checked before anything else is claimed.
eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
  'assertSeam accepts the chosen boundary and returns RAW_END_IN_CODE');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping back to the last line of code from the declaration after the cut lands on BODY_END_IN_CODE');
  eq(next.name, NEXT_DECL, '…and the declaration after the cut is NEXT_DECL');
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…whose own documentation begins exactly where the cut ends, so nothing of it is cut off from it');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits eighteen openings.
const OPENINGS = [];
const parses = (at) => {
  try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
};
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  eq(prevOwner.name, PREVIOUS_OWNER, 'the owner before the cut is PREVIOUS_OWNER, in the region above…');
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    '…and SEAM_LEGAL_OPENINGS line starts between it and the first declaration are accepted');
  eq(OPENINGS, [LISTENER_COMMENT_OPENING, LISTENER_OPENING].concat(INSIDE_LISTENER_OPENINGS, [BLANK_OPENING, RAW_AT_IN_CODE], DOC_OPENINGS, [DECL_AT_IN_CODE]),
    '…they are, in order: the listener\'s comment, the listener statement, four lines inside its body, the blank line, the banner, the nine further documentation lines, and the declaration');
  eq(DOC_OPENINGS.length + 1, DOC_LINES, '…the banner and the nine lines after it being the DOC_LINES comment lines of the documentation');
  eq(OPENINGS.filter((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() === ''), [BLANK_OPENING],
    '…the blank line being the ONLY one of them that is an empty line');
  eq(MID_LINE_OPENING, LISTENER_COMMENT_OPENING + 1, 'a position one unit past the first of them…');
  ok(CODE[MID_LINE_OPENING - 1] !== '\n' && !OPENINGS.includes(MID_LINE_OPENING), '…is mid-line, and not among them…');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    '…and is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what
  // loading it would do.
  eq(OPENINGS.filter((at) => parses(at) === SYNTAX_ERROR), INSIDE_LISTENER_OPENINGS,
    'the openings inside the resize listener\'s body do NOT parse: SYNTAX_ERROR…');
  eq(INSIDE_LISTENER_OPENINGS.length, SYNTAX_ERROR_OPENINGS, '…SYNTAX_ERROR_OPENINGS of them…');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the eighteen are even candidates, counted rather than listed');
  eq(OPENINGS.filter((at) => parses(at) !== null && parses(at) !== SYNTAX_ERROR).length, 0,
    '…and none fails for any other reason');
  // WHICH OF THE PARSING ONES RUN NOTHING AT LOAD?
  const stmt = OPENINGS.filter((at) => parses(at) === null && !runsNothingAtLoad(loadTimeProfile(at, BODY_END_IN_CODE)));
  eq(stmt, [LISTENER_COMMENT_OPENING, LISTENER_OPENING],
    'only the two openings that take the resize listener along run anything at load…');
  for (const at of stmt) {
    const l = loadTimeProfile(at, BODY_END_IN_CODE);
    eq([l.stmtLines, l.reads.length], [LISTENER_STATEMENT_LINES, LISTENER_READS_AT_LOAD],
      '…LISTENER_STATEMENT_LINES top-level statement lines and LISTENER_READS_AT_LOAD evaluation-time reads, from ' + at);
  }
  eq(stmt.length, STATEMENT_OPENINGS, '…STATEMENT_OPENINGS of them');
  eq(OPENINGS.filter((at) => parses(at) === null && runsNothingAtLoad(loadTimeProfile(at, BODY_END_IN_CODE))).length, CLEAN_OPENINGS,
    '…leaving CLEAN_OPENINGS that parse and run nothing at load');
  eq(PARSING_OPENINGS - STATEMENT_OPENINGS, CLEAN_OPENINGS, '…which is the parsing ones less the two that carry the listener');
  eq(assertSeam(CODE, BLANK_OPENING, BODY_END_IN_CODE), RAW_END_IN_CODE,
    '…and the blank line is a real seam: it ends where the cut ends');
  ok(lineAt(LISTENER_OPENING).startsWith('window.addEventListener(\'resize\''),
    'the listener opening is the `window.addEventListener(\'resize\'` statement that redraws the large charts');
}
// THE DOCUMENTATION. The programme's own rule finds a ten-line comment block
// directly above the first declaration, and it starts on the banner.
{
  const first = BY_NAME.get(OWNERS_EXPECTED[0]);
  const ba = blockAbove(first);
  eq(ba.start, RAW_AT_IN_CODE, 'the programme\'s blockAbove rule finds the comment block above the first declaration, and it starts at RAW_AT_IN_CODE…');
  eq(ba.text.length, DOC_UNITS, '…DOC_UNITS units long…');
  eq(ba.text.split('\n').length - 1, DOC_LINES, '…DOC_LINES lines…');
  eq(DECL_AT_IN_CODE - RAW_AT_IN_CODE, DOC_UNITS, '…so the cut takes DOC_UNITS units of documentation before the declaration…');
  ok(ba.text.split('\n').filter(Boolean).every((l) => l.startsWith('//')), '…every one of them a comment line…');
  ok(ba.text.startsWith(BANNER_FIRST_LINE), '…the first being the banner of the region');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n', '…with a blank line above the banner');
  eq(count(CODE, BANNER_FIRST_LINE), 1, '…and that banner line occurs once in the whole monolith');
}
// WHAT EACH CHOICE OF OPENING LEAVES. Opening on the banner keeps the blank line
// that already separates the listener from the block, so the listener and the
// next owner's documentation stay one blank line apart; opening on the blank line
// would fuse them; opening on the declaration would strand the documentation.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(atCut, JOIN_IF_CUT), 1,
    'the recommended cut leaves the listener\'s closing brace, ONE blank line and the next owner\'s documentation, once…');
  eq(atCut.indexOf(JOIN_IF_CUT), LISTENER_END_AT, '…at the place the cut was made');
  eq(count(atCut, BANNER_FIRST_LINE), 0, '…with the banner gone from the residue…');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0, '…and no line of the first declaration behind');
  const atBlank = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(atBlank, JOIN_IF_CUT_AT_BLANK), 1,
    'while opening on the blank line instead would fuse the brace to that documentation, once…');
  eq(count(atBlank, JOIN_IF_CUT), 0, '…and leaves no blank line between them');
  eq(count(CODE, JOIN_IF_CUT_AT_BLANK), 0, '…a join the monolith does not hold today, at that place or any other');
  const atDecl = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(atDecl.indexOf(BANNER_FIRST_LINE), RAW_AT_IN_CODE,
    'and opening on the declaration would leave the banner exactly where it is…');
  ok(atDecl.slice(RAW_AT_IN_CODE + DOC_UNITS).startsWith('// Compute 4H Relative Strength vs SPY'),
    '…with all DOC_UNITS units of documentation stranded directly above the next owner\'s own, describing code that is no longer there');
}
// THE SCREEN HOLDS THIS RUN, and holds it because it opens on a banner. Measured
// from the DECLARATION the run is under the floor; the screen measures the first
// owner of a region from the region\'s start.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, UNITS_FROM_DECLARATION, 'measured from the first declaration the run is UNITS_FROM_DECLARATION units…');
ok(UNITS_FROM_DECLARATION < RUN_FLOOR, '…under RUN_FLOOR, so a floor applied there would hide it…');
ok(BODY_END_IN_CODE - RAW_AT_IN_CODE >= RUN_FLOOR, '…while from the banner it is at or above it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).length, CANDIDATES_AT_DECL,
  '…and the shipped screen enumerates CANDIDATES_AT_DECL runs that open at the declaration…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…but exactly CANDIDATES_AT_CUT run that opens at the banner and ends where the cut does…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…while the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT rows for it, since it skipped nothing here');
eq(REGIONS.filter((r) => r.start === RAW_AT_IN_CODE).length, 1, '…the banner being the start of a region, which is where the screen starts the first owner\'s run');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one dependency, state shared through an alias, both directions measured');
// ─────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these three names, in this order');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.map((d) => d.form), OWNER_FORMS, '…two `var` bindings and a function, so this layer WOULD ship mutable bindings');
  ok(!/^async function /.test(firstLineOf(CODE.slice(BY_NAME.get(FUNCTION_OWNER).start))), '…the function a SYNCHRONOUS one');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly the one name _scannerFetchBackendCandlesForChart');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in: CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES places');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  const names = REC.sites.map((at) => OWNERS_EXPECTED.filter((n) => MASKED.startsWith(n, at))[0]);
  eq(names, [GUARD_OWNER, TTL_OWNER, TTL_OWNER, FUNCTION_OWNER],
    '…which are, in order, the guard, the TTL constant twice, and the function');
  eq(CODE.slice(CONSUMER_SITES_AT[0] + GUARD_OWNER.length + 1 - ALIAS_BINDING.length, CONSUMER_SITES_AT[0] + GUARD_OWNER.length + 1), ALIAS_BINDING,
    '…the guard being reached once, by the binding `var _dssGuard = _dssChartLoadGuard;`…');
  eq(CODE.slice(CONSUMER_SITES_AT[3] - 'await '.length, CONSUMER_SITES_AT[3]), 'await ',
    '…and the function once, awaited');
}
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.start >= RAW_END_IN_CODE, '…the consumer sitting outside the cut, below it');
  ok(REC.sites.every((at) => at > keeper.start && at < keeper.end), '…all four sites inside its body');
  ok(REC.sites.every((at) => hostOf(at) && hostOf(at).name === CONSUMER), '…each with the consumer as its enclosing declaration');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
  ok(/^async function /.test(firstLineOf(CODE.slice(keeper.start))), '…an async function');
  ok(keeper.start > RAW_END_IN_CODE, '…and NOT the next function: other owners lie between the cut and it');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, so byConsumerSplit leaves nothing out…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…and is BY_CONSUMER_SPLIT, the same as byConsumer');
}
// THE ONE CALL BACK INTO THE MONOLITH IS MADE WHEN THE FUNCTION IS CALLED, never
// when it loads. The function it calls is declared far below, in another region.
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MONOLITH_DEPENDENCIES[0]).length, DEPENDENCY_REFERENCES,
    'the body names _scannerFetchBackendCandlesForChart at DEPENDENCY_REFERENCES place…');
  ok(BODY.indexOf('try { p = Promise.resolve(_scannerFetchBackendCandlesForChart(symbol)); }') >= 0,
    '…a plain call inside a `try`, wrapped in Promise.resolve…');
  ok(BODY.indexOf('catch (e) { p = Promise.reject(e); }') >= 0, '…whose `catch` turns a throw into a rejected promise');
  eq(dep.form, 'function', '_scannerFetchBackendCandlesForChart is a top-level function of the monolith…');
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT…');
  eq(dep.end, DEPENDENCY_END, '…ending at DEPENDENCY_END…');
  eq(dep.chars, DEPENDENCY_CHARS, '…DEPENDENCY_CHARS units long…');
  ok(dep.start > RAW_END_IN_CODE, '…BELOW the cut, so the monolith still owns it after the move…');
  eq(Math.round((dep.start - RAW_END_IN_CODE) / 100000) / 10, DEPENDENCY_DISTANCE_MILLIONS,
    '…about DEPENDENCY_DISTANCE_MILLIONS million units below it…');
  ok(dep.start >= REGION_END, '…and below the banner region the cut sits in');
  eq(refSites(MASKED, MONOLITH_DEPENDENCIES[0]).map((at) => [at, (hostOf(at) || { name: '(TOP LEVEL)' }).name]),
    DEPENDENCY_SITES, '…referenced at DEPENDENCY_SITES, its own declaration among them');
  eq(DEPENDENCY_SITES.filter((s) => s[1] === FUNCTION_OWNER).length, 1, '…exactly one of them in the cut…');
  eq(DEPENDENCY_SITES.filter((s) => s[1] !== FUNCTION_OWNER && s[1] !== MONOLITH_DEPENDENCIES[0]).length, 5,
    '…and five more outside it and outside its own declaration, so the dependency is shared and the monolith still needs it after the move');
  eq(propertyWriteBases(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).filter((b) => b === MONOLITH_DEPENDENCIES[0]).length, 0,
    '…and the body only CALLS it: nothing is written to it');
  eq(propertyWriteBases('function f() { _scannerFetchBackendCandlesForChart.cache = 1; }')
    .filter((b) => b === MONOLITH_DEPENDENCIES[0]).length, 1,
  'control — the same scan finds a planted write to a property of it, so that zero is a measurement');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time, the dependency included');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: two `var` initialisers and a function declaration only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE STATE THE PROFILE CANNOT SEE. The profile counts a property write only
// when the base of the write is a name the block owns. The consumer reaches the
// guard through an ALIAS, so its eleven writes are invisible to that count, and
// the function reaches it through its own. This scan follows the alias.
const aliasAccesses = (masked, alias) => {
  const re = new RegExp('\\b' + alias + '\\.([A-Za-z_$][\\w$]*)(\\s*(?:=(?!=)|\\+\\+|--|\\+=|-=|\\*=|\\/=))?', 'g');
  const writes = [], reads = []; let m;
  while ((m = re.exec(masked))) (m[2] ? writes : reads).push(m[1]);
  return { writes, reads };
};
const tally = (list) => Object.entries(list.reduce((a, k) => { a[k] = (a[k] || 0) + 1; return a; }, {}))
  .sort((a, b) => (a[0] < b[0] ? -1 : 1));
{
  const cons = BY_NAME.get(CONSUMER);
  const ctext = MASKED.slice(cons.start, cons.end);
  const ftext = MASKED.slice(BY_NAME.get(FUNCTION_OWNER).start, BY_NAME.get(FUNCTION_OWNER).end);
  const ca = aliasAccesses(ctext, '_dssGuard');
  const fa = aliasAccesses(ftext, 'g');
  eq(count(CODE.slice(cons.start, cons.end), ALIAS_BINDING), 1, 'the consumer binds the guard to a local alias exactly once…');
  eq(refSites(MASKED, GUARD_OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, 1,
    '…and that binding is the ONLY reference to the guard in the whole monolith outside the block…');
  eq((ctext.match(/\b_dssGuard\b/g) || []).length, CONSUMER_ALIAS_MENTIONS,
    '…the alias being mentioned CONSUMER_ALIAS_MENTIONS times in the consumer…');
  eq((MASKED.match(/\b_dssGuard\b/g) || []).length, CONSUMER_ALIAS_MENTIONS, '…and nowhere else: it does not escape the consumer');
  eq(1 + ca.writes.length + ca.reads.length, CONSUMER_ALIAS_MENTIONS,
    '…one binding, the writes and the reads accounting for every one of them');
  eq(tally(ca.writes), CONSUMER_ALIAS_WRITES, 'through it the consumer WRITES the pinned fields, the pinned number of times…');
  eq(ca.writes.length, CONSUMER_ALIAS_WRITES.reduce((a, r) => a + r[1], 0), '…eleven in all…');
  eq(ca.reads.length, CONSUMER_ALIAS_READS, '…and reads CONSUMER_ALIAS_READS times');
  eq((ftext.match(/\bg\b/g) || []).length, FUNCTION_ALIAS_MENTIONS, 'the function binds `var g = _dssChartLoadGuard` and mentions g FUNCTION_ALIAS_MENTIONS times…');
  ok(ftext.indexOf('var g = _dssChartLoadGuard;') >= 0, '…the binding being that one');
  eq(tally(fa.writes), FUNCTION_ALIAS_WRITES, 'through it the function WRITES the pinned fields…');
  eq(fa.writes.length, 6, '…six times in all…');
  eq(fa.reads.length, FUNCTION_ALIAS_READS, '…and reads FUNCTION_ALIAS_READS times');
  eq(1 + fa.writes.length + fa.reads.length, FUNCTION_ALIAS_MENTIONS, '…which with the binding is every mention');
  // THE TWO PARTIES NEVER TOUCH EACH OTHER'S FIELDS.
  const cw = new Set(ca.writes), fw = new Set(fa.writes);
  eq([...cw].filter((k) => fw.has(k)), [], 'the fields the consumer writes and the fields the function writes do not overlap…');
  eq([...cw, ...fw].sort(), GUARD_FIELDS.slice().sort(), '…and together are exactly the GUARD_FIELDS the guard declares…');
  eq([...new Set(ca.reads)].sort(), [...cw].sort(), '…the consumer reading only the fields it writes…');
  eq([...new Set(fa.reads)].sort(), [...fw].sort(), '…and the function reading only the fields it writes: the object is two halves that share an identity and nothing else');
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(BODY, bare);
  eq(JSON.parse(vm.runInContext('JSON.stringify(Object.keys(_dssChartLoadGuard))', bare)), GUARD_FIELDS,
    'GUARD_FIELDS is read off the guard the block builds, in its declared order');
  // THE PROFILE IS BLIND TO THIS, and the blindness is shown by difference.
  eq(REC.inPropWrites, 0, 'the profile counts ZERO inbound property writes into the block, although the consumer makes eleven…');
  eq(aliasAccesses('a.x = 1; a.y; a.z += 2; a.w == 3; a.v === 4; a.u.t = 5; b.q = 6;', 'a'),
    { writes: ['x', 'z'], reads: ['y', 'w', 'v', 'u'] },
    'control — the alias scan finds a plain write and a compound write, and reads comparisons and a nested write as reads, ignoring another name');
  eq(propertyWriteBases('function f() { var a = G; a.x = 1; G.y = 2; }').filter((b) => b === 'G').length, 1,
    'control — the profile\'s own scan finds the write whose base is the owned name and not the one through the alias');
  // NOTHING REASSIGNS THE BINDINGS.
  eq(REC.inWrites, 0, 'and nothing outside assigns the guard or the constant themselves…');
  const assignsGuard = (text) => (text.match(/\b_dssChartLoadGuard\s*=(?!=)/g) || []).length;
  eq(assignsGuard(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)), 1,
    '…and inside the block the guard binding is assigned exactly once, by its own declaration: the object has one owner and every holder shares it');
  eq(assignsGuard('var _dssChartLoadGuard = {}; _dssChartLoadGuard = null; if (_dssChartLoadGuard == 1) {}'), 2,
    'control — the scan finds a planted reassignment and ignores a comparison'),
  eq(nonLocalAssignmentsIn('var _dssChartLoadGuard = {}; function f() { var g = _dssChartLoadGuard; g.k = 1; }').length, 0,
    'control — the outbound scan ignores a write through a local alias, which is why the alias scan above exists');
}
// THE TWIN. The monolith holds a near-identical guard for the RS detail chart, and
// the comment above it says it mirrors this one. The mirror is in prose only: no
// code of the twin names an owner of the block, and the one comment that names one
// is measured here.
{
  const TWIN = ['_RS_CHART_LOAD_TTL_MS', '_rsChartLoadGuard', '_rsLoadBackendCandlesDeduped'];
  ok(TWIN.every((n) => BY_NAME.has(n)), 'the RS detail chart declares its own TWIN owners in the monolith…');
  ok(TWIN.every((n) => BY_NAME.get(n).start >= RAW_END_IN_CODE), '…all of them outside the block, below it…');
  ok(consumersOf(REC).every((n) => TWIN.indexOf(n) < 0), '…and none of them is a consumer of the block: no code of the twin names an owner of it…');
  const prose = (n) => refSites(CODE, n).length - refSites(MASKED, n).length;
  eq(OWNERS_EXPECTED.map(prose), [0, 1, 0],
    '…the only mention of an owner outside code being ONE comment, naming the guard…');
  const at = refSites(CODE, GUARD_OWNER).filter((p) => refSites(MASKED, GUARD_OWNER).indexOf(p) < 0)[0];
  ok(at > RAW_END_IN_CODE && lineAt(CODE.lastIndexOf('\n', at) + 1).indexOf('Directional Scanner guard (_dssChartLoadGuard)') >= 0,
    '…the comment that says the RS guard "Mirrors the Directional Scanner guard (_dssChartLoadGuard)"');
  eq(count(CODE, 'load dedup / TTL throttle'), 2, '…and that comment is the second place the phrase "load dedup / TTL throttle" occurs, after the banner');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
//
// THE SCAN THIS FILE INHERITED READS ONLY THE FIRST NAME OF A `var` LIST AS LOCAL.
// This block declares no comma-separated list inside a function, so it reports
// nothing here, and the corrected scan agrees. A zero from either needs a control
// that finds a violation.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignments to a name it takes for a global…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the block does not own…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mention of window, globalThis, self or document: the `window` of `window.console`');
  ok(BODY.indexOf("if (window.console && console.debug) console.debug('[SCANNER][CHART][BACKEND-CANDLES] skipped duplicate in-flight symbol=' + symbol);") >= 0,
    '…which sits in the branch that skips a duplicate in-flight load');
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
section('4. THE FINDING: the previous contract named it, the tie is gone, and no other row has a raw nine of 5');
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
  ok(PREVIOUS_RAW_AT > RAW_END_IN_CODE,
    '…and it sat entirely AFTER this cut, so this opening is at the offset the previous contract published');
  const listed = listOf('RUNNERS_UP');
  eq(listed.length, RUNNERS_UP.length, 'the previous contract published as many runners-up as this audit does…');
  eq(listed[0], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the first of them being THIS cut\'s row, at the same offset, byConsumerSplit, raw nine and length…');
  eq(listed.filter((r) => r[0] > PREVIOUS_RAW_AT).length, 0,
    '…none of the four sitting after that cut, so none of them moved…');
  eq(listed.slice(1), RUNNERS_UP.slice(0, 3),
    '…the other three being exactly the top of RUNNERS_UP now, which gains a fourth from beneath');
  eq(prevNum('TIE_OPENING'), TIE_OPENING, 'the previous contract named this opening as its tie partner…');
  eq(TIE_OPENING, RAW_AT_IN_CODE, '…and TIE_OPENING is this cut\'s opening');
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
  eq(atBestNine.map((r) => r[0]), [RAW_AT_IN_CODE],
    '…and exactly ONE of them is AT FULL_NINE: this cut\'s row. The tie the previous audit stated is gone');
  eq(Math.min.apply(null, best.filter((r) => r[2] !== FULL_NINE).map((r) => r[2])), SECOND_BEST_NINE,
    '…the lowest raw nine among all the others being SECOND_BEST_NINE');
  // THE ORDER THE SCREEN PUBLISHES agrees: no tie to break.
  const bestPerAll = new Map();
  for (const r of rows) {
    const b = bestPerAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPerAll.set(r.lo, r);
  }
  const rankedAll = [...bestPerAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq(rankedAll[0].lo, RAW_AT_IN_CODE, 'ranked by (byConsumerSplit, nine, units), the order the screen publishes, this cut\'s row comes first…');
  eq([rankedAll[1].bcs, rankedAll[1].nine], [BY_CONSUMER_SPLIT, SECOND_BEST_NINE],
    '…and the second is decided on the raw nine, before the length key is consulted');
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

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: the region above, the smaller cuts, the owners below, the region');
// ─────────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const ABOVE_REGION = REGIONS.filter((r) => r.end <= REGION.start).pop();
const ABOVE_OWNER_LIST = DECLS.filter((d) => d.start >= ABOVE_REGION.start && d.end < ABOVE_REGION.end);
const OWNERS_UP = ABOVE_OWNER_LIST.slice().reverse();
const OWNERS_DOWN = REGION_OWNER_LIST.slice(OWNER_COUNT);
const priceUp = (d) => {
  const lo = (blockAbove(d) || { start: d.start }).start;
  const p = profileOf([lo, BODY_END_IN_CODE]);
  const l = loadTimeProfile(lo, BODY_END_IN_CODE);
  return { lo, p, bcs: byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), clean: runsNothingAtLoad(l), stmt: l.stmtLines };
};
// THE CUT IS THE FIRST OWNER OF ITS REGION, so everything above it is in the
// region above, and the listener statement stands between the two.
eq(REGION_OWNER_LIST.findIndex((d) => d.name === TTL_OWNER) + 1, OWNER_POSITION, 'the cut opens on owner number OWNER_POSITION of its region…');
eq(ABOVE_REGION.start, ABOVE_REGION_AT, '…the region above it opening at ABOVE_REGION_AT…');
ok(lineAt(ABOVE_REGION.start).startsWith(ABOVE_BANNER_PREFIX), '…on the RTH 4H aggregation banner…');
eq(ABOVE_REGION.end, RAW_AT_IN_CODE, '…and ending exactly where the cut begins');
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  const r = priceUp(d);
  eq(r.lo, lo, 'taking ' + name + ' with its documentation, if it has any, opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  eq([RAW_END_IN_CODE - lo, r.p.nine, r.bcs, r.p.deps.length], [units, nine, bcs, deps],
    '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine and on byConsumerSplit');
}
// EVERY OWNER ABOVE IT IN THE REGION ABOVE, not the nearest few.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region above holds OWNERS_ABOVE owners…');
eq(OWNERS_UP.length, ABOVE_REGION_OWNERS, '…which is ABOVE_REGION_OWNERS, the count before the cut…');
eq(EXTENSIONS_UP.map((e) => e[0]), OWNERS_UP.slice(0, EXTENSIONS_UP.length).map((d) => d.name),
  '…the pinned rows being the nearest ones, nearest first…');
{
  const priced = OWNERS_UP.map(priceUp);
  ok(priced.every((r) => assertSeam(CODE, r.lo, BODY_END_IN_CODE) === RAW_END_IN_CODE), '…every one a real seam…');
  ok(priced.every((r) => r.p.nine > FULL_NINE && r.bcs > BY_CONSUMER_SPLIT),
    '…and EVERY one of them worse than the cut on the raw nine and on byConsumerSplit, so no stopping point above is better…');
  eq(priced.filter((r) => !r.clean).length, OWNERS_ABOVE,
    '…and EVERY one of them also running code at load, because the run crosses the resize listener…');
  ok(priced.every((r) => r.stmt === LISTENER_STATEMENT_LINES), '…the same LISTENER_STATEMENT_LINES statement lines each time');
}
// THE SMALLER CUTS. Opening on a later owner of the block drops the owners above
// it and the documentation with them. These are priced by the same profile; the
// screen does not enumerate them.
for (const [name, lo, units, nine, bcs, deps, inbound] of SMALLER_CUTS) {
  const d = BY_NAME.get(name);
  const r = priceUp(d);
  eq(r.lo, lo, 'opening on ' + name + ' puts the run at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  eq([BODY_END_IN_CODE - lo, r.p.nine, r.bcs, r.p.deps, r.p.inbound], [units, nine, bcs, deps, inbound],
    '…units of body, raw nine, byConsumerSplit, dependencies and inbound sites are as pinned');
  ok(r.clean, '…running nothing at load');
  ok(units < RUN_FLOOR, '…under RUN_FLOOR from its declaration…');
  eq(candidateRuns.filter((c) => c.lo === lo && c.hi === BODY_END_IN_CODE).length, 0, '…so the shipped screen does not enumerate it…');
  eq(hiddenRows.filter((c) => c.lo === lo && c.hi === BODY_END_IN_CODE).length, 0, '…and the pass over sub-floor runs does not hold it either');
  ok(nine < FULL_NINE, '…its raw nine BELOW the cut\'s…');
}
{
  const guardCut = priceUp(BY_NAME.get(SMALLER_CUTS[0][0]));
  eq(blockAbove(BY_NAME.get(SMALLER_CUTS[0][0])), null,
    'the guard has no documentation of its own: the TTL constant stands directly above it, so the pass over sub-floor runs has nothing to add…');
  eq(blockAbove(BY_NAME.get(SMALLER_CUTS[1][0])).text.split('\n').length - 1, FUNCTION_DOC_LINES,
    '…while the function has a FUNCTION_DOC_LINES-line comment of its own, which a cut opening there would take');
  eq([guardCut.bcs, BY_CONSUMER_SPLIT], [BY_CONSUMER_SPLIT, BY_CONSUMER_SPLIT],
    'dropping the constant leaves byConsumerSplit exactly where it was…');
  eq(REC.nine - guardCut.p.nine, TTL_CONSUMER_SITES,
    '…and takes the raw nine from FULL_NINE to 3, a difference of TTL_CONSUMER_SITES…');
  eq(refSites(MASKED, TTL_OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, TTL_CONSUMER_SITES,
    '…which is exactly the number of places outside the block that read the TTL constant, all in the consumer');
  ok(refSites(MASKED.slice(BY_NAME.get(GUARD_OWNER).start, BODY_END_IN_CODE), TTL_OWNER).length === 0,
    '…the guard and the function never reading the constant themselves');
  ok(guardCut.p.nine < REC.nine && guardCut.bcs === BY_CONSUMER_SPLIT && BODY_END_IN_CODE - guardCut.lo < RUN_FLOOR,
    'so IF the screen enumerated that run it would rank above this cut on its own key: that is what the floor keeps out, and the recommendation is a judgement against it');
}
// THE ENDS INSIDE THE BLOCK are refused by the seam rule: each leaves a
// declaration on the very next line, with no separator.
for (const at of INTERIOR_END_REFUSALS) {
  throwsWith(() => assertSeam(CODE, RAW_AT_IN_CODE, at), REFUSAL_ERROR,
    'ending the cut at offset ' + at + ', inside the block, is refused with REFUSAL_ERROR');
}
// THE OWNERS BELOW, and which of them are legal ends.
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the block…');
eq(OWNERS_DOWN[0].name, NEXT_DECL, '…the first being NEXT_DECL, the declaration after the cut…');
{
  const legal = OWNERS_DOWN.filter((d) => { try { assertSeam(CODE, RAW_AT_IN_CODE, downEnd(d)); return true; } catch (e) { return false; } });
  eq(legal.map((d) => d.name), EXTENSIONS_DOWN.map((e) => e[0]), '…and exactly the pinned three of them are LEGAL ends for the cut…');
  const refused = OWNERS_DOWN.filter((d) => legal.indexOf(d) < 0);
  eq(refused.map((d) => d.name), DOWN_REFUSED, '…the other five being refused…');
  for (const d of refused) {
    throwsWith(() => assertSeam(CODE, RAW_AT_IN_CODE, downEnd(d)), REFUSAL_ERROR, '…' + d.name + ' with REFUSAL_ERROR');
  }
}
for (const [name, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const d = BY_NAME.get(name);
  const hb = downEnd(d);
  const hr = assertSeam(CODE, RAW_AT_IN_CODE, hb);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq([hr - RAW_AT_IN_CODE, p.nine, byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), p.deps.length],
    [units, nine, bcs, deps], 'running the cut down through ' + name + ' costs the pinned units, nine, byConsumerSplit and dependencies');
  ok(runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb)), '…a run that also runs nothing at load');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…and is worse than the cut on the raw nine and on byConsumerSplit');
}
// THE SERIES IS NOT MONOTONE, and nothing above claims it is.
ok(EXTENSIONS_DOWN[1][2] < EXTENSIONS_DOWN[0][2] && EXTENSIONS_DOWN[2][2] > EXTENSIONS_DOWN[1][2],
  'the series below is NOT monotone on the raw nine: it falls from the first legal end to the second and rises again, which is why only "none beats the cut" is claimed');
// THE BANNER REGION it sits inside, and what the cut does to it. The dead rule
// "never cut inside a banner region" would forbid cutting any of it. This cut
// takes the region's banner and its first three owners, and leaves the other
// eight under the region above.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, which is the cut\'s own opening');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
  ok(reg.start === RAW_AT_IN_CODE && reg.end > RAW_END_IN_CODE, '…so the cut takes the region\'s start but not its end');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the banner the cut takes');
  eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(REGION_OWNER_LIST.slice(0, OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED, '…the first OWNER_COUNT of them being the cut\'s');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  // WHAT THE CUT LEAVES BEHIND, measured by applying it.
  const regionsOf = (code) => {
    const decls = scanTopLevelDeclarations(code);
    const marks = topLevelBanners(code, functionBodyRanges(code));
    const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : code.length }));
    const merged = [];
    for (let i = 0; i < raw.length; i++) {
      let r = raw[i];
      while (i + 1 < raw.length &&
        !code.slice(r.start, raw[i + 1].start).split('\n').some((l) => !isBlankOrComment(l))) {
        r = { start: r.start, end: raw[i + 1].end }; i++;
      }
      merged.push(r);
    }
    return { decls, marks, regions: merged.filter((x) => decls.some((d) => d.start >= x.start && d.end < x.end)) };
  };
  const before = regionsOf(CODE);
  const after = regionsOf(CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE));
  eq([before.marks.length, before.regions.length], [BANNERS_BEFORE, OWNER_REGIONS], 'the monolith holds BANNERS_BEFORE banners across OWNER_REGIONS regions…');
  eq([after.marks.length, after.regions.length], [BANNERS_AFTER, REGIONS_AFTER],
    '…and after the cut BANNERS_AFTER banners across REGIONS_AFTER: one banner and one region fewer…');
  eq(before.marks.length - after.marks.length, 1, '…exactly one of each, the banner this cut takes');
  const merged = after.regions.filter((r) => r.start === ABOVE_REGION_AT)[0];
  eq(merged.end, MERGED_REGION_END_AFTER_CUT, 'the region above now ends at MERGED_REGION_END_AFTER_CUT…');
  eq(merged.end, REGION_END - RAW_CHARS, '…which is the old region\'s end less the cut\'s raw length…');
  eq(after.decls.filter((d) => d.start >= merged.start && d.end < merged.end).length, MERGED_REGION_OWNERS,
    '…and holds MERGED_REGION_OWNERS owners, the OWNERS_ABOVE it had plus the REGION_OWNERS - OWNER_COUNT left behind…');
  eq(ABOVE_REGION_OWNERS + REGION_OWNERS - OWNER_COUNT, MERGED_REGION_OWNERS, '…which is the arithmetic of it');
  ok(after.regions.every((r) => r.start !== RAW_AT_IN_CODE), '…no region now starting where the old one did');
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
  // THE CUT THAT SHIPPED CHANGED THE SCREEN: the figures the previous contract
  // pinned against the figures measured here.
  eq([prevNum('RAW_RUNS') - RAW_RUNS, prevNum('CANDIDATES') - CANDIDATES, prevNum('CLEAN_CANDIDATES') - CLEAN_CANDIDATES,
    prevNum('SEAM_REJECTED') - SEAM_REJECTED], [DELTA_RAW_RUNS, DELTA_CANDIDATES, DELTA_CLEAN, 0],
  '…against the previous contract\'s figures the shipped cut took DELTA_RAW_RUNS raw runs, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates out of the screen, and no seam rejection');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the first declaration is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).every((c) => c.hi >= BODY_END_IN_CODE),
  '…and every run the screen opens at the banner is at least as long as the cut, since the cut is one of them or contains it');

// ─────────────────────────────────────────────────────────────────────
section('7. It loads bare, REJECTS without its dependency, dedups in-flight loads, and reaches `window` only to log a duplicate');
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
const settle = () => new Promise((r) => setImmediate(r));
const plain = (v) => JSON.parse(JSON.stringify(v));
async function sevenMain() {
  // A HARNESS: the block run in a fresh VM context whose dependency, `window` and
  // `console` are fakes this file controls and records. Nothing real is read, and
  // any of them can be left out to see what its absence does.
  const harness = (o = {}) => {
    const debugs = [], fetched = [], pending = [];
    const sandbox = Object.create(null);
    const con = { debug: (m) => { debugs.push(m); } };
    if (o.window !== false) sandbox.window = o.window || { console: con };
    if (o.console !== false) sandbox.console = o.console || con;
    if (o.fetcher !== 'missing') {
      sandbox._scannerFetchBackendCandlesForChart = (symbol) => {
        fetched.push(symbol);
        if (o.fetcher === 'throws') throw new Error('boom');
        if (o.fetcher === 'value') return { ok: true, v: symbol };
        let resolve, reject;
        const p = new Promise((a, b) => { resolve = a; reject = b; });
        pending.push({ symbol, resolve, reject });
        return p;
      };
    }
    const ctx = vm.createContext(sandbox);
    vm.runInContext(BODY, ctx);
    return {
      ctx, debugs, fetched, pending,
      guard: vm.runInContext(GUARD_OWNER, ctx),
      call: vm.runInContext(FUNCTION_OWNER, ctx),
    };
  };
  const rejection = (p) => p.then(() => null, (e) => e);
  const LOG = '[SCANNER][CHART][BACKEND-CANDLES] skipped duplicate in-flight symbol=';

  // LOADS BARE: declaring the block needs nothing.
  {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(BODY, ctx);
    eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
      'it LOADS in a completely bare VM and declares exactly its three owners');
    eq(vm.runInContext(TTL_OWNER, ctx), TTL_VALUE, '…the TTL constant being TTL_VALUE milliseconds…');
    eq(plain(vm.runInContext(GUARD_OWNER, ctx)), GUARD_INITIAL, '…and the guard starting with the pinned seven fields, empty');
    eq(Object.keys(vm.runInContext(GUARD_OWNER, ctx)), GUARD_FIELDS, '…in the pinned order');
    eq(vm.runInContext('typeof ' + FUNCTION_OWNER, ctx), 'function', '…and the third being a function');
    eq(vm.runInContext(FUNCTION_OWNER + '.constructor.name', ctx), 'Function', '…an ordinary synchronous one');
  }
  // CALLED BARE: the dependency is missing, and the call sits inside the `try`, so
  // the function does NOT throw: it hands back a promise that REJECTS.
  {
    const h = harness({ fetcher: 'missing', window: false, console: false });
    let p = null, threw = null;
    try { p = h.call('AAPL', 'AAPL|k', false); } catch (e) { threw = e; }
    eq(threw, null, 'called with no dependency the function does not throw…');
    ok(p && typeof p.then === 'function', '…it returns a promise…');
    eq(h.guard.inflight === p, true, '…recorded as the guard\'s in-flight handle at once…');
    eq(h.guard.inflightKey, 'AAPL|k', '…under the key it was given…');
    const err = await rejection(p);
    eq(err && err.name, 'ReferenceError', '…which REJECTS with a ReferenceError…');
    ok(err && err.message.indexOf(MONOLITH_DEPENDENCIES[0]) >= 0, '…naming ' + MONOLITH_DEPENDENCIES[0]);
    await settle();
    eq(h.guard.inflight, null, 'and once settled, even by rejection, the handle is cleared…');
    eq(h.guard.inflightKey, 'AAPL|k', '…while the key stays, which is only read when a handle is present');
  }
  // THE HOST GLOBAL. A duplicate in-flight load logs once through `window.console`.
  // Where `window` does not exist that FIRST duplicate throws, after the flag that
  // suppresses the log has been set, and the next one does not.
  {
    const h = harness({ fetcher: 'missing', window: false, console: false });
    const first = h.call('AAPL', 'K', false);
    let err = null;
    try { h.call('AAPL', 'K', false); } catch (e) { err = e; }
    eq(err && err.name, 'ReferenceError', 'in a VM with no `window` the first duplicate in-flight call THROWS a ReferenceError…');
    ok(err && err.message.indexOf('window') >= 0, '…naming window…');
    eq(h.guard.inflightSkipLogged, true, '…having already set the flag that suppresses the log…');
    eq(h.call('AAPL', 'K', false) === first, true, '…so the next duplicate does not throw and returns the shared promise');
    await rejection(first);
  }
  // THE DEDUP.
  {
    const h = harness();
    const p1 = h.call('AAPL', 'AAPL|view', false);
    eq(h.fetched, ['AAPL'], 'the first call starts one fetch, for its symbol…');
    eq(h.guard.inflight === p1, true, '…and records the promise it returns…');
    const p2 = h.call('AAPL', 'AAPL|view', false);
    eq(p2 === p1, true, 'an identical non-forced call returns the SAME promise object…');
    eq(h.fetched, ['AAPL'], '…without a second fetch…');
    eq(h.debugs, [LOG + 'AAPL'], '…and logs the skip once, at debug level, with the pinned text…');
    h.call('AAPL', 'AAPL|view', false); h.call('AAPL', 'AAPL|view', false);
    eq(h.debugs.length, 1, '…however many more duplicates follow: the flag keeps it to one');
    eq(h.guard.inflightSkipLogged, true, '…the flag being set');
    h.pending[0].resolve({ ok: true, candles1d: [1], candles4h: [2] });
    eq(plain(await p1), { ok: true, candles1d: [1], candles4h: [2] }, 'the shared promise resolves to what the fetcher resolved to…');
    await settle();
    eq(h.guard.inflight, null, '…the handle is cleared once it settles…');
    const p3 = h.call('AAPL', 'AAPL|view', false);
    eq(h.fetched, ['AAPL', 'AAPL'], '…and the next identical call starts a fresh fetch…');
    eq(p3 === p1, false, '…with a new promise…');
    eq(h.guard.inflightSkipLogged, false, '…and the log flag is reset by a real load');
    h.pending[1].resolve(null); await settle();
  }
  // FORCE BYPASSES, and a quirk of doing so is pinned: the OLDER promise settling
  // clears the handle of the NEWER one, because the key is the same.
  {
    const h = harness();
    const p1 = h.call('AAPL', 'K', false);
    const p2 = h.call('AAPL', 'K', true);
    eq(p2 === p1, false, 'a forced call returns a NEW promise even while an identical load is in flight…');
    eq(h.fetched, ['AAPL', 'AAPL'], '…and starts a second fetch…');
    eq(h.guard.inflight === p2, true, '…the guard now holding the new promise…');
    eq(h.debugs, [], '…without logging a skip');
    h.pending[0].resolve('old'); await p1; await settle();
    eq(h.guard.inflight, null,
      'when the OLDER promise settles first it clears the handle although the newer one is still pending, because the key matches…');
    h.call('AAPL', 'K', false);
    eq(h.fetched.length, 3, '…so the next non-forced identical call is NOT deduped onto the still-pending forced load: a third fetch starts');
    h.pending.forEach((x) => x.resolve(null)); await settle();
  }
  // A DIFFERENT KEY is a different load, and an older settle does not clear it.
  {
    const h = harness();
    const pA = h.call('AAA', 'AAA|v', false);
    const pB = h.call('BBB', 'BBB|v', false);
    eq(h.fetched, ['AAA', 'BBB'], 'a different key starts its own fetch even while another is in flight…');
    eq(h.guard.inflightKey, 'BBB|v', '…and replaces the recorded key…');
    h.pending[0].resolve('a'); await pA; await settle();
    eq(h.guard.inflight === pB, true, '…so the older load settling does NOT clear the newer one\'s handle…');
    h.pending[1].resolve('b'); await pB; await settle();
    eq(h.guard.inflight, null, '…and the newer one clears its own');
    const same = harness();
    same.call('AAA', 'AAA|v1', false); same.call('AAA', 'AAA|v2', false);
    eq(same.fetched, ['AAA', 'AAA'], 'the same symbol under a different key is not deduped either');
    same.pending.forEach((x) => x.resolve(null)); await settle();
  }
  // THE FETCHER THROWS, RETURNS A VALUE, OR REJECTS.
  {
    const t = harness({ fetcher: 'throws' });
    let p = null, threw = null;
    try { p = t.call('X', 'K', false); } catch (e) { threw = e; }
    eq(threw, null, 'a fetcher that THROWS does not make the function throw…');
    const e1 = await rejection(p);
    eq(e1 && e1.message, 'boom', '…the promise rejects with that very error…');
    await settle();
    eq(t.guard.inflight, null, '…and the handle is cleared');
    const v = harness({ fetcher: 'value' });
    eq(plain(await v.call('Y', 'K', false)), { ok: true, v: 'Y' }, 'a fetcher that returns a plain value is wrapped: the promise resolves to it');
    const r = harness();
    const pr = r.call('Z', 'K', false);
    r.pending[0].reject(new Error('nope'));
    const e2 = await rejection(pr);
    eq(e2 && e2.message, 'nope', 'a fetcher whose promise rejects is not swallowed: the caller sees the rejection…');
    await settle();
    eq(r.guard.inflight, null, '…and the handle is cleared on that path too');
  }
  // WHAT THE FUNCTION NEVER TOUCHES: the consumer\'s four fields, and the TTL constant.
  {
    const h = harness();
    const pa = h.call('A', 'A|v', false); h.call('A', 'A|v', false); h.call('A', 'A|v', true);
    h.pending.forEach((x) => x.resolve({ ok: true })); await pa; await settle();
    eq(plain({ key: h.guard.key, ts: h.guard.ts, scbc: h.guard.scbc, ttlSkipLogged: h.guard.ttlSkipLogged }),
      { key: null, ts: 0, scbc: null, ttlSkipLogged: false },
      'after a dedup, a forced reload and a settle, the four fields only the consumer writes are exactly as they started');
    eq(vm.runInContext(TTL_OWNER, h.ctx), TTL_VALUE, '…and the TTL constant is unchanged');
    const fnText = BODY.slice(BODY.indexOf('function ' + FUNCTION_OWNER));
    eq(count(fnText, TTL_OWNER), 0, '…the function\'s text never naming it');
  }
  // THE LOG GUARD reads `window.console` but CALLS the global `console.debug`.
  {
    const noConsole = harness({ fetcher: 'missing', window: {} });
    const first = noConsole.call('A', 'K', false);
    let err = null;
    try { noConsole.call('A', 'K', false); } catch (e) { err = e; }
    eq(err, null, 'with a `window` that has no console the duplicate branch does not throw…');
    eq([noConsole.guard.inflightSkipLogged, noConsole.debugs.length], [true, 0], '…sets the flag and logs nothing');
    await rejection(first);
    const split = harness({ fetcher: 'missing', window: { console: {} } });
    const f2 = split.call('A', 'K', false); split.call('A', 'K', false);
    eq(split.debugs, [LOG + 'A'],
      'with `window.console` an empty object it still logs, through the GLOBAL console.debug: the guard tests one object and calls another');
    await rejection(f2);
    const noDebug = harness({ fetcher: 'missing', console: {} });
    const f3 = noDebug.call('A', 'K', false); noDebug.call('A', 'K', false);
    eq([noDebug.debugs.length, noDebug.guard.inflightSkipLogged], [0, true], 'and with no global console.debug nothing is logged and the flag is still set');
    await rejection(f3);
  }
}
await sevenMain();

// ─────────────────────────────────────────────────────────────────────
section('8. Where this layer would sit, and what it would change');
// ─────────────────────────────────────────────────────────────────────
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, '…this cut is larger than that, so it would not be the smallest…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    '…measured against every layer rather than inferred from the first: it would rank SIZE_RANK_IF_CUT by size');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 0, '…and none exactly its size');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  // THE TWO CHAIN-WIDE SHAPE COUNTS. This body is NOT pure ASCII, so the
  // pure-ASCII count would not move; it opens on a `── ` banner, so the banner
  // count WOULD.
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(!ascii(BODY), '…and this body is not, so that count would NOT move');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS, '…measured with it included, which is the same count');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(banner(BODY), '…and this body does, so that count WOULD move');
  eq(sources.concat([BODY]).filter(banner).length, LAYERS_OPENING_ON_BANNER + 1, '…by one, measured with it included');
  // THE OTHER CHAIN-WIDE COUNT THAT WOULD MOVE: layers whose contract pins a
  // non-empty MONOLITH_DEPENDENCIES. Counted over the suite and then compared with
  // the figure the contract that carries it pins.
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
  ok(MONOLITH_DEPENDENCIES.length > 0, '…and this cut pins a non-empty list, so that count WOULD move, by one');
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
eq(LOCALS[LOCALS.length - 1], 'js/portfolio/portfolio-option-streamer-diagnostics.js',
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
console.log('DSS_CHART_LOAD_GUARD_AUDIT_OK');
}

main();
