'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// OPTION STREAMER DIAGNOSTICS — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [935282,937155) in monolith coordinates — 1,873 units raw
// and 1,872 of body, ONE owner, a synchronous function — into
// js/portfolio/portfolio-option-streamer-diagnostics.js.
// `getOptionStreamerDiagnosticsForPosition` takes a portfolio position and
// returns one diagnostic row for each of its call and put legs: the underlying,
// the leg's type, strike, expiration, side and quantity, the streamer symbol the
// leg already carries, whether that symbol is consistent with the leg, the
// compact, preferred and built DXLink symbols the option-symbol helpers would
// produce for it, and the list of fields the leg and position supplied. It has no
// documentation of its own and no `try`.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT FIRST ────────────
//
// The contract before this audit published its four best other openings, and the
// first was this one. The cut that contract shipped sat BEFORE this opening in
// the monolith, so this opening is earlier than the one it published by that
// cut's raw length, 1,749 units; the other three all sat before that cut and did
// not move. §4 checks the published list against this base: the first of the four
// is this opening, moved, the other three are the top of the list that remains,
// and the list gains a fourth entry from beneath.
//
// ── PART TWO: A TIE AT THE BEST SCORE THE SCREEN CAN STATE ─────────────────
//
// Over the screen and the pass over its sub-floor runs together, §4 counts no row
// whose byConsumerSplit is below 2, and two rows at 2 whose raw nine is 5, the
// lowest raw nine among the rows at 2: this opening and the Directional Chart
// backend-candle load dedup, three owners opening at `_DSS_CHART_LOAD_TTL_MS`.
// They tie on both measures the score carries. Counts the score does not carry
// differ between them: this opening has one owner, one inbound site and three
// references to a foundation module, `js/utils/option-symbols.js`, which
// byConsumerSplit leaves out; the other has three owners, four inbound sites and
// no foundation reference. The audit does not invent a
// measure to break a tie the measures do not break. It takes the order the screen
// itself publishes, byConsumerSplit, then raw nine, then length ascending, which
// puts this opening first by 280 units, and publishes the other as the next
// candidate. The claim is scoped to the two enumerations.
//
// ── PART THREE: THE SCREEN HOLDS THIS ROW, AND THE CUT HAS NO DOCUMENTATION ─
//
// The previous audit's row was found by the pass over runs the screen skips for
// being under its floor from the declaration. This one is the screen's own: 1,872
// units from the declaration, over the 1,500 floor, and with no comment lines
// above it the declaration is also where the cut opens. §2 measures that the
// screen enumerates exactly one run opening there and ending where the cut ends,
// and that the pass holds none.
//
// ── PART FOUR: THE CONSUMER IS THE VERY NEXT FUNCTION ──────────────────────
//
// `logOptionStreamerDiagnostics`, 293 units, calls it once, and it sits directly
// below: the cut ends exactly where the consumer begins. Taking the consumer
// along does not remove the coupling, it raises it: §5 prices that, and prices
// every owner in the banner region both ways. Of the twelve owners above the cut,
// every one scores worse than it on the raw nine and on byConsumerSplit, and five
// of those runs also carry a top-level statement and so do not run nothing at
// load. Of the eleven below, every one is a legal end, every one runs nothing at
// load, and every one scores worse. The series are not monotone and nothing here
// claims they are.
//
// ── PART FIVE: ONE MONOLITH DEPENDENCY, THREE FOUNDATION REFERENCES, NO `try` ─
//
// The body calls `getPreferredOptionDxlinkSymbol`, which stays in the monolith:
// it has nine references there, this body's among them, and seven of the others
// sit in five functions that stay. It also calls three helpers that live in a
// module that already shipped, `js/utils/option-symbols.js`. All are reached when
// the function is CALLED, never when it loads, so the module loads in a bare VM.
// There is no `try`: called bare with a position that has no call or put legs it
// answers an empty list without touching a dependency, and with one it THROWS a
// ReferenceError naming the first helper it reaches, synchronously. §7 runs the
// body against fakes, takes each dependency away in turn, and walks every field
// of the row.
//
// ── PART SIX: THE BOUNDARY IS A JUDGEMENT, AND A BLANK LINE IS A CHOICE ────
//
// The seam accepts THREE line starts between the previous function's closing
// brace and the declaration: that brace, the blank line, and the declaration. Two
// parse; the brace does not. The recommendation opens on the declaration, which
// leaves the blank line where it is, so the brace and the next function stay one
// blank line apart; opening on the blank line would fuse them. §2 measures both
// joins.
//
// ── PRICED, AND WHERE IT WOULD SIT ─────────────────────────────────────────
//
// §8 ranks it by size against the fifty-two layers the chain holds, and counts
// the shape measures against it: its body is pure ASCII, so the pure-ASCII count
// WOULD move; it does not open on a banner, so that count would not; and the
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

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-option-streamer-diagnostics.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'e4eea64';
const BASE_CHARS = 1437929;
const BASE_UTF8 = 1466452;
const BASE_LF = 24829;
const BASE_SHA256 = '2769c16701180463a17a64340d907a18543b04d516352101bf37ae04cd43c854';
const LOCAL_SCRIPTS = 96;
const TEST_FILE_COUNT = 181;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-option-streamer-diagnostics-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/option-streamer-diagnostics-audit.spec.js';
const RATCHETED_CONTRACTS = 43;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/backend-positions-enriched-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 149;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/backend-positions-enriched-contract.spec.js';
const RETIRED_MUTANTS = 143;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115749;
const CODE_CHARS = 1322154;
const TOP_LEVEL_DECLS = 907;
const OWNER_REGIONS = 117;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the declaration: this function has no documentation of its own.
// A blank line stands between the closing brace above it and the declaration.
const RAW_AT_IN_CODE = 935282;
const DECL_AT_IN_CODE = 935282;
const RAW_END_IN_CODE = 937155;
const BODY_END_IN_CODE = 937154;
const RAW_CHARS = 1873;
const BODY_CHARS = 1872;
const BODY_UTF8 = 1872;
const BODY_LF = 33;
const BODY_SHA256 = 'a5987467873c168f167bbcd9c831b360594310a4285c8a7af9a87ccd1e4ea3ad';
const BODY_ENDING = '}\n';
const DECL_FIRST_LINE =
  'function getOptionStreamerDiagnosticsForPosition(position) {';
const EM_DASHES = 0;
const NON_ASCII_CHARS = 0;
const NEXT_DECL = 'logOptionStreamerDiagnostics';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['getOptionStreamerDiagnosticsForPosition'];
const OWNER_SIZES = [1871];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 33;
const CODE_LINES = 33;
const COMMENT_LINES = 0;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous function's closing brace and the declaration the seam
// accepts THREE line starts: the closing brace, which is not valid JavaScript,
// the blank line below it, and the declaration. There is no documentation.
const BRACE_OPENING = 935279;
const MID_LINE_OPENING = 935280;
const BLANK_OPENING = 935281;
const SEAM_LEGAL_OPENINGS = 3;
const PARSING_OPENINGS = 2;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 0;
const CANDIDATES_AT_CUT = 1;
const HIDDEN_ROWS_AT_CUT = 0;
// What each choice of opening leaves behind: opening on the declaration keeps the
// blank line that already separates the brace from the next function; opening on
// the blank line itself would lose it.
const JOIN_IF_CUT_AT_DECL = '}\n\nfunction logOptionStreamerDiagnostics';
const JOIN_IF_CUT_AT_BLANK = '}\nfunction logOptionStreamerDiagnostics';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 885493;
const REGION_END = 948212;
const REGION_CHARS = 62719;
const REGION_OWNERS = 24;
const OWNER_POSITION = 13;
const OWNER_BEFORE = 'fetchPortfolioTechnicalRefresh';
const BANNER_LINE_PREFIX = '// ── [PortfolioRefreshPayload]';
const WHOLE_REGION_NINE = 124;
const WHOLE_REGION_BCS = 52;
const WHOLE_REGION_CONSUMERS = 9;
const WHOLE_REGION_DEPS = 23;
const WHOLE_REGION_SIB = 5;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies]. The first four of the
// twelve owners above it in the region; §5 prices all twelve.
const EXTENSIONS_UP = [
  ['fetchPortfolioTechnicalRefresh', 926019, 11136, 14, 10, 3],
  ['_applyTechnicalRefreshEarnings', 923078, 14077, 23, 17, 9],
  ['_extractBackendSqueezeByTicker', 920156, 16999, 25, 18, 10],
  ['_portfolioTechnicalRowMapFromResponse', 918973, 18182, 24, 17, 9],
];
// Of the twelve owners above it, those whose run up to the cut also carries a
// top-level statement and so does not run nothing at load.
const UP_NOT_CLEAN = 5;
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies]. The first is the consumer, the
// very next function; §5 prices all eleven owners below it in the region.
const EXTENSIONS_DOWN = [
  ['logOptionStreamerDiagnostics', 2168, 7, 4, 3],
  ['updateStreamerPreview', 3223, 8, 4, 3],
  ['renderAddPositionForm', 5352, 22, 17, 9],
];
const OWNERS_ABOVE = 12;
const OWNERS_BELOW = 11;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 5;
const BY_CONSUMER = 5;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = 'logOptionStreamerDiagnostics';
const CONSUMER_SITES = 1;
const CONSUMER_SITE_AT = 937218;
const CONSUMER_AT = 937155;
const CONSUMER_END = 937447;
const CONSUMER_CHARS = 293;
const MONOLITH_DEPENDENCIES = ['getPreferredOptionDxlinkSymbol'];
const DEPENDENCY_REFERENCES = 1;
const DEPENDENCY_AT = 870564;
const DEPENDENCY_END = 872466;
// Every reference to the dependency in the monolith, as [offset, enclosing
// declaration]: its own declaration, this body, and seven more at five other
// functions that stay.
const DEPENDENCY_SITES = [
  [870573, 'getPreferredOptionDxlinkSymbol'],
  [875057, 'normalizeOptionLegSymbolAliases'],
  [879183, 'optionLegScalarDiagnostics'],
  [912752, 'fetchPortfolioLiveRefresh'],
  [936831, 'getOptionStreamerDiagnosticsForPosition'],
  [976550, '_portfolioRefreshDedupeKey'],
  [980684, 'refreshPositionsLive'],
  [1026093, 'refreshPositionsLive'],
  [1080929, 'refreshPositionsLive'],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 1;
const OUTBOUND_MODULE_REFERENCES = 3;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 3;
const FOUNDATION_NAMES = ['buildCompactOptionDxlinkSymbol', 'buildOptionDxlinkSymbolCandidate', 'isOptionStreamerSymbolConsistent'];
const FOUNDATION_MODULE = 'js/utils/option-symbols.js';
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// The scan this file inherited reads only the first name of a `var` list as
// local. This body declares no such list, so it reports nothing here; the
// controls in §3 show it still does where one exists.
const UNCORRECTED_SCAN_HITS = 0;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['getOptionStreamerDiagnosticsForPosition'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7218;
const SEAM_REJECTED = 2045;
const CANDIDATES = 2884;
const CLEAN_CANDIDATES = 1770;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 7;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION. A function whose documentation lifts it over the floor
// was therefore never enumerated. This pass keeps every run the screen skipped
// for being short, re-measures it from the start of its documentation, and
// keeps those that then clear the floor. THIS CUT IS NOT ONE OF THEM: it has
// no documentation and the screen holds it.
const HIDDEN_ROWS = 35;
const HIDDEN_CLEAN_ROWS = 34;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 1;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [745622, 747321, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 8;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit].
const BEST_TIER_ROWS = [
  [182656, 184808, 5, 2],
  [935282, 937154, 5, 2],
  [71214, 72907, 6, 2],
  [576762, 578321, 6, 2],
  [620318, 623642, 6, 2],
  [70936, 72907, 7, 2],
  [745622, 747321, 7, 2],
  [876975, 879066, 7, 2],
];
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [182656, 2, 5, 2152],
  [576762, 2, 6, 1559],
  [71214, 2, 6, 1693],
  [620318, 2, 6, 3324],
];
// THE TIE PARTNER: the other row at the best score on both measures the score
// carries. [opening, closing, units, owners, foundation references, inbound
// reference sites, monolith dependencies].
const TIE_ROW = [182656, 184808, 2152, ['_DSS_CHART_LOAD_TTL_MS', '_dssChartLoadGuard', '_dssLoadBackendCandlesDeduped'], 0, 4, ['_scannerFetchBackendCandlesForChart']];
const TIE_OPENING = 182656;
// The shipped cut took this many runs out of the screen, measured against the
// figures the previous contract pinned.
const DELTA_RAW_RUNS = 25;
const DELTA_CANDIDATES = 24;
const DELTA_CLEAN = 4;
const PREVIOUS_RAW_CHARS = 1749;
const PREVIOUS_RAW_AT = 891631;

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 52;
const SMALLEST_LAYER_CHARS = 1587;
const SIZE_RANK_IF_CUT = 8;
const LAYERS_LARGER_THAN_THIS_CUT = 45;
const PURE_ASCII_LAYERS = 5;
const LAYERS_OPENING_ON_BANNER = 24;
const LAYERS_WITH_A_DEPENDENCY = 19;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/portfolio/portfolio-option-streamer-diagnostics.js"></script>\n';
const NET_REDUCTION = 1793;
const INDEX_AFTER = 1436136;
const RESIDUAL_MONOLITH = 1320281;
const LOCAL_SCRIPTS_AFTER = 97;

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



console.log('OPTION STREAMER DIAGNOSTICS — TEMPORARY BOUNDARY AUDIT');
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the
// missing underlyings gate predicted the document, the residual monolith and the
// script count this audit measures, so the two cycles are joined by numbers.
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
  eq(next.name, NEXT_DECL, '…and the declaration immediately after the cut is NEXT_DECL, the consumer');
  eq(next.start, RAW_END_IN_CODE, '…which begins exactly where the cut ends');
  eq(blockAbove(next), null, '…with no comment block above it, so nothing of its own is cut off from it');
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
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the previous function\'s closing brace');
  eq(OPENINGS[1], BLANK_OPENING, '…the next the blank line below it…');
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…and the last the declaration, which is the cut: it has no documentation to open on');
  eq(RAW_AT_IN_CODE, DECL_AT_IN_CODE, '…so the cut and the declaration are the same position');
  eq(OPENINGS.filter((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() === ''), [BLANK_OPENING],
    '…the blank line being the ONLY one of them that is an empty line');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    'while the one position in between that starts mid-line is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what
  // loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the previous function\'s closing brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the three are even candidates, counted rather than listed');
  eq(assertSeam(CODE, BLANK_OPENING, BODY_END_IN_CODE), RAW_END_IN_CODE,
    '…and the blank line is a real seam: it ends where the cut ends');
}
// THE FUNCTION HAS NO DOCUMENTATION. The programme's own rule finds no comment
// block above the declaration, and the line above it is blank.
{
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])), null, 'the programme\'s blockAbove rule finds NO comment block above the declaration…');
  eq(DECL_AT_IN_CODE - RAW_AT_IN_CODE, DOC_TAKEN, '…so the cut takes DOC_TAKEN units of documentation…');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE, '…and opens on DECL_FIRST_LINE');
  ok(BODY.split('\n').every((l) => !l.trim().startsWith('//')), '…the body holding no comment line at all');
}
// WHAT EACH CHOICE OF OPENING LEAVES. A blank line already separates the closing
// brace above from this function. Opening on the declaration keeps one blank line
// between that brace and the NEXT function; opening on the blank line itself
// would fuse them.
{
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    'a blank line already stands between the brace above and the declaration…');
  const atDecl = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(atDecl, JOIN_IF_CUT_AT_DECL), 1,
    '…so the recommended cut leaves the brace, ONE blank line and the next function, once…');
  eq(atDecl.indexOf(JOIN_IF_CUT_AT_DECL), BRACE_OPENING, '…at the place the cut was made');
  ok(atDecl.indexOf(DECL_FIRST_LINE) < 0, '…and no line of this declaration behind');
  const atBlank = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(atBlank, JOIN_IF_CUT_AT_BLANK), 1,
    'while opening on the blank line instead would fuse the brace to the next function, once…');
  eq(count(atBlank, JOIN_IF_CUT_AT_DECL), 0, '…and leaves no blank line between them');
  eq(count(CODE, JOIN_IF_CUT_AT_BLANK), 0, '…a join the monolith does not hold today, at that place or any other');
}
// THE SCREEN HOLDS THIS RUN. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, and this function clears it; with no documentation the
// declaration is also where the cut opens.
ok(BODY_END_IN_CODE - DECL_AT_IN_CODE >= RUN_FLOOR, 'measured from the declaration the run is at or above RUN_FLOOR, so the floor does not hide it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and the shipped screen enumerates exactly CANDIDATES_AT_CUT run that opens at the declaration and ends where the cut does…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…while the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT row for it, since it skipped nothing here');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one call back, three foundation references, both directions measured');
// ─────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a function, so this layer would ship no mutable binding');
  ok(!/^async function /.test(DECL_FIRST_LINE), '…a SYNCHRONOUS one');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES reference from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly the one name getPreferredOptionDxlinkSymbol');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in: CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call site');
eq(REC.sites, [CONSUMER_SITE_AT], '…at CONSUMER_SITE_AT');
{
  const lead = 'var rows = ';
  eq(CODE.slice(CONSUMER_SITE_AT - lead.length, CONSUMER_SITE_AT), lead,
    '…the consumer binding the result to `rows`…');
  const after = CODE.slice(CONSUMER_SITE_AT, CONSUMER_SITE_AT + 320);
  ok(after.indexOf('if (!rows.length) return;') >= 0 && after.indexOf('debugTable(\'portfolio\', rows);') >= 0,
    '…returning when it is empty and otherwise logging the rows as a table, which is all it does with them');
}
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.end < RAW_AT_IN_CODE || keeper.start >= RAW_END_IN_CODE, '…the consumer sitting outside the cut');
  ok(CONSUMER_SITE_AT > keeper.start && CONSUMER_SITE_AT < keeper.end, '…and its site inside its body');
  ok(hostOf(CONSUMER_SITE_AT) && hostOf(CONSUMER_SITE_AT).name === CONSUMER, '…with an enclosing declaration of its own');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
  eq(keeper.start, RAW_END_IN_CODE, '…and beginning exactly where the cut ends: it is the very next function');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, which byConsumerSplit leaves out…');
  eq(split.foundationNames, FOUNDATION_NAMES, '…to the three names FOUNDATION_NAMES…');
  eq(FOUNDATION_NAMES.map((n) => MODULE_OWNERS.get(n)), FOUNDATION_NAMES.map(() => FOUNDATION_MODULE),
    '…every one declared in the one module FOUNDATION_MODULE, which has shipped');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, three below the byConsumer');
}
// THE ONE CALL BACK INTO THE MONOLITH IS MADE WHEN THE FUNCTION IS CALLED, never
// when it loads. The function it calls is far above the cut, in another banner
// region, and is shared.
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MONOLITH_DEPENDENCIES[0]).length, DEPENDENCY_REFERENCES,
    'the body names getPreferredOptionDxlinkSymbol at DEPENDENCY_REFERENCES place…');
  ok(BODY.indexOf('preferredDxlinkSymbol: getPreferredOptionDxlinkSymbol(underlying || leg.ticker, leg),') >= 0,
    '…a plain call inside the row it builds for each leg…');
  eq(dep.form, 'function', 'getPreferredOptionDxlinkSymbol is a top-level function of the monolith…');
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT…');
  eq(dep.end, DEPENDENCY_END, '…ending at DEPENDENCY_END…');
  ok(dep.end < RAW_AT_IN_CODE, '…above the cut, so the monolith still owns it after the move…');
  ok(dep.end < REGION_AT, '…and above the banner region the cut sits in, so it is not among the owners priced in §5…');
  eq(refSites(MASKED, MONOLITH_DEPENDENCIES[0]).map((at) => [at, (hostOf(at) || { name: '(TOP LEVEL)' }).name]),
    DEPENDENCY_SITES, '…and referenced at DEPENDENCY_SITES, its own declaration among them');
  eq(DEPENDENCY_SITES.filter((s) => s[1] === OWNERS_EXPECTED[0]).length, 1,
    '…exactly one of them in the cut…');
  eq(DEPENDENCY_SITES.filter((s) => s[1] !== OWNERS_EXPECTED[0] && s[1] !== MONOLITH_DEPENDENCIES[0]).length, 7,
    '…and seven more in the bodies of functions that stay…');
  eq(new Set(DEPENDENCY_SITES.filter((s) => s[1] !== OWNERS_EXPECTED[0] && s[1] !== MONOLITH_DEPENDENCIES[0]).map((s) => s[1])).size, 5,
    '…five of them, so the dependency is shared and the monolith still needs it after the move');
  eq(propertyWriteBases(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).filter((b) => b === MONOLITH_DEPENDENCIES[0]).length, 0,
    '…and the body only CALLS it: nothing is written to it');
  eq(propertyWriteBases('function f() { getPreferredOptionDxlinkSymbol.cache = 1; }')
    .filter((b) => b === MONOLITH_DEPENDENCIES[0]).length, 1,
  'control — the same scan finds a planted write to a property of it, so that zero is a measurement');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time, the dependency and the three helpers included');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
//
// THE SCAN THIS FILE INHERITED READS ONLY THE FIRST NAME OF A `var` LIST AS LOCAL.
// This body declares no comma-separated list, so it reports nothing here, and the
// corrected scan agrees. A zero from either needs a control that finds a
// violation.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignments to a name it takes for a global…');
  ok([...declaredNamesIn(BODY)].every((n) => locallyBound(BODY).has(n)),
    '…because every name the body declares with var is already one the inherited scan reads as local: there is no list for it to misread');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the body does not own…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document');
  // CONTROLS: the corrected scan DOES find a planted violation and still ignores
  // every declarator, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — it finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the body does not own is found');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the previous contract named it, and two openings tie at the best score the screen states');
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
  ok(PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS < RAW_AT_IN_CODE,
    '…and it sat entirely BEFORE this cut, so this opening is earlier than the one it published, by PREVIOUS_RAW_CHARS');
  const listed = listOf('RUNNERS_UP');
  eq(listed.length, RUNNERS_UP.length, 'the previous contract published as many runners-up as this audit does…');
  eq(listed[0], [RAW_AT_IN_CODE + PREVIOUS_RAW_CHARS, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the first of them being THIS cut\'s row, at the same byConsumerSplit and raw nine and the same length, moved by PREVIOUS_RAW_CHARS…');
  eq(listed.slice(1).filter((r) => r[0] > PREVIOUS_RAW_AT).length, 0,
    '…the other three all sitting before that cut, so none of them moved…');
  eq(listed.slice(1), RUNNERS_UP.slice(0, 3),
    '…and being exactly the top of RUNNERS_UP now, which gains a fourth from beneath');
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
  eq(atBestNine.map((r) => r[0]), [TIE_OPENING, RAW_AT_IN_CODE],
    '…and exactly TWO of them are AT FULL_NINE: TIE_OPENING and this cut\'s row. This is a tie on both measures the score carries');
  // THE TIE, MEASURED ON WHAT THE SCORE DOES NOT CARRY, and shown to differ.
  const tieRun = cleanRuns.filter((c) => c.lo === TIE_OPENING && c.hi === TIE_ROW[1])[0];
  eq(tieRun.units, TIE_ROW[2], 'the other row is TIE_ROW: a run of the pinned length…');
  eq(tieRun.p.names, TIE_ROW[3], '…over the pinned three owners…');
  eq([tieRun.split.foundation, tieRun.p.inbound, tieRun.p.deps], [TIE_ROW[4], TIE_ROW[5], TIE_ROW[6]],
    '…with the pinned foundation references, inbound reference sites and monolith dependencies');
  ok(tieRun.p.names.length > REC.names.length && tieRun.p.inbound > REC.inbound && tieRun.split.foundation < FOUNDATION_OUTBOUND,
    '…so it has MORE owners and MORE inbound sites than this cut and FEWER foundation references: the counts the score leaves out do not rank them, they differ');
  eq([tieRun.p.deps.length, consumersOf(tieRun.p).length], [MONOLITH_DEPENDENCIES.length, consumersOf(REC).length],
    '…while the number of monolith dependencies and of consumers is the same, ONE each');
  // THE ORDER THE SCREEN PUBLISHES breaks the tie, and nothing else does.
  const bestPerAll = new Map();
  for (const r of rows) {
    const b = bestPerAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPerAll.set(r.lo, r);
  }
  const rankedAll = [...bestPerAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq(rankedAll.slice(0, 2).map((r) => [r.lo, r.bcs, r.nine]),
    [[RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE], [TIE_OPENING, BY_CONSUMER_SPLIT, FULL_NINE]],
    'ranked by (byConsumerSplit, nine, units), the order the screen publishes, this cut\'s row comes first and TIE_OPENING second…');
  eq(rankedAll[1].units - rankedAll[0].units, TIE_ROW[2] - BODY_CHARS,
    '…the whole of the difference being the length key');
  eq(TIE_ROW[2] - BODY_CHARS, 280, '…which is 280 units');
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
  eq(ranked[0][0], TIE_OPENING, '…the first being the opening this cut ties with');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would cost: every owner above, the consumer and every owner below, the region');
// ─────────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const OWNERS_UP = REGION_OWNER_LIST.slice(0, OWNER_POSITION - 1).reverse();
const OWNERS_DOWN = REGION_OWNER_LIST.slice(OWNER_POSITION);
const priceUp = (d) => {
  const lo = (blockAbove(d) || { start: d.start }).start;
  const p = profileOf([lo, BODY_END_IN_CODE]);
  return { lo, p, bcs: byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), clean: runsNothingAtLoad(loadTimeProfile(lo, BODY_END_IN_CODE)) };
};
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
    '…and EVERY one of them worse than the cut on the raw nine and on byConsumerSplit, so no stopping point above is better');
  eq(priced.filter((r) => !r.clean).length, UP_NOT_CLEAN,
    '…UP_NOT_CLEAN of them running code at load, because the run reaches the top-level statement after `_resolveLegGreeksDisplay`');
  // THE SERIES IS NOT MONOTONE, and nothing above claims it is.
  ok(EXTENSIONS_UP[3][3] < EXTENSIONS_UP[2][3] && EXTENSIONS_UP[3][4] < EXTENSIONS_UP[2][4],
    'the series is NOT monotone: the fourth owner scores below the third on both, which is why only "none beats the cut" is claimed');
}
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
for (const [name, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const d = BY_NAME.get(name);
  const hb = downEnd(d);
  const hr = assertSeam(CODE, RAW_AT_IN_CODE, hb);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq([hr - RAW_AT_IN_CODE, p.nine, byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), p.deps.length],
    [units, nine, bcs, deps], 'running the cut down through ' + name + ' costs the pinned units, nine, byConsumerSplit and dependencies');
  ok(runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb)), '…a run that also runs nothing at load');
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…and is worse on the raw nine, and no better on byConsumerSplit');
}
// THE CONSUMER IS THE FIRST OWNER BELOW, and every owner below it is a legal end.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owners below the cut…');
eq(OWNERS_DOWN[0].name, CONSUMER, '…the first being the consumer, the very next function…');
eq(EXTENSIONS_DOWN.map((e) => e[0]), OWNERS_DOWN.slice(0, EXTENSIONS_DOWN.length).map((d) => d.name),
  '…the pinned rows being the nearest ones, nearest first…');
{
  const ends = OWNERS_DOWN.map((d) => downEnd(d));
  ok(ends.every((hb) => { try { return typeof assertSeam(CODE, RAW_AT_IN_CODE, hb) === 'number'; } catch (e) { return false; } }),
    '…every one of them a LEGAL end for the cut, so unlike the previous cycle nothing below is refused by the seam rule…');
  ok(ends.every((hb) => runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb))), '…every one running nothing at load…');
  ok(OWNERS_DOWN.every((d, i) => {
    const p = profileOf([RAW_AT_IN_CODE, ends[i]]);
    return p.nine > FULL_NINE && byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, ends[i])) >= BY_CONSUMER_SPLIT;
  }), '…and EVERY one worse than the cut on the raw nine and no better on byConsumerSplit, taking the consumer included');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner
// region" would forbid cutting any of it. This cut is owner 13 of 24, so it sits
// in the middle of its region and leaves the banner and every other owner.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, above the cut');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
  ok(reg.end > RAW_END_IN_CODE && reg.start < RAW_AT_IN_CODE, '…so the cut sits strictly INSIDE its region');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the PortfolioRefreshPayload banner, which the cut leaves where it is');
  const own = REGION_OWNER_LIST;
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…this function being owner number OWNER_POSITION of them');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…and OWNER_BEFORE the one above it');
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
    REGION_OWNERS - 1, '…over the REGION_OWNERS - 1 owners left in it');
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
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => c.hi >= BODY_END_IN_CODE),
  '…and every run the screen opens there is at least as long as the cut, since the cut is one of them or contains it');

// ─────────────────────────────────────────────────────────────────────
section('7. It loads bare, throws without its helpers, and builds one row per call or put leg');
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
  const HELPERS = ['isOptionStreamerSymbolConsistent', 'buildCompactOptionDxlinkSymbol', 'getPreferredOptionDxlinkSymbol', 'buildOptionDxlinkSymbolCandidate'];
  // A HARNESS: the function run in a fresh VM context whose four helpers are
  // fakes this file controls and records. Nothing real is read, and a helper can
  // be left out to see what its absence does.
  const harness = (without) => {
    const calls = [];
    const sandbox = {};
    const fake = (name, tag) => (underlying, leg, third) => {
      calls.push([name, underlying, leg, third]);
      return tag + ':' + underlying + ':' + (leg && leg.strike);
    };
    sandbox.isOptionStreamerSymbolConsistent = (u, leg, existing) => { calls.push([HELPERS[0], u, leg, existing]); return existing === 'GOOD'; };
    sandbox.buildCompactOptionDxlinkSymbol = fake(HELPERS[1], 'compact');
    sandbox.getPreferredOptionDxlinkSymbol = fake(HELPERS[2], 'preferred');
    sandbox.buildOptionDxlinkSymbolCandidate = fake(HELPERS[3], 'built');
    if (without) delete sandbox[without];
    const ctx = vm.createContext(sandbox);
    vm.runInContext(BODY, ctx);
    const fn = vm.runInContext(VM_GLOBALS[0], ctx);
    return { calls, fn, run: (position) => plain(fn(position)) };
  };
  const KEYS = ['underlying', 'legType', 'strike', 'expiration', 'side', 'qty', 'existingStreamerSymbol',
    'streamerSymbolConsistent', 'compactDxlinkSymbol', 'preferredDxlinkSymbol', 'existingOptionSymbol',
    'existingSymbol', 'builtDxlinkSymbol', 'sourceFieldsFound'];
  // LOADS BARE: declaring the function needs nothing.
  {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(BODY, ctx);
    eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
      'it LOADS in a completely bare VM and declares exactly its one owner');
    const bare = vm.runInContext(VM_GLOBALS[0], ctx);
    eq(bare.constructor.name, 'Function', '…an ordinary, synchronous function…');
    eq([bare(null), bare(undefined), bare(0), bare('')].map(plain), [[], [], [], []],
      '…and CALLED with no position, or a falsy one, it answers an empty list without touching a helper…');
    eq([bare({}), bare({ legs: [] }), bare({ legs: [{ type: 'STOCK' }, null, {}] })].map(plain), [[], [], []],
      '…as it does for a position with no legs, or none that is a call or a put');
    let err = null;
    try { bare({ ticker: 'AAPL', legs: [{ type: 'CALL' }] }); } catch (e) { err = e; }
    eq(err && err.name, 'ReferenceError',
      'with a call leg and no helpers it THROWS, synchronously, a ReferenceError…');
    ok(err && err.message.indexOf(HELPERS[0]) >= 0, '…naming the first helper the row reaches, ' + HELPERS[0]);
  }
  // EACH DEPENDENCY, TAKEN AWAY IN TURN.
  for (const name of HELPERS) {
    const h = harness(name);
    let err = null;
    try { h.fn({ ticker: 'AAPL', legs: [{ type: 'CALL', strike: 1 }] }); } catch (e) { err = e; }
    eq(err && err.name, 'ReferenceError', 'with ' + name + ' missing the call throws a ReferenceError…');
    ok(err && err.message.indexOf(name) >= 0, '…naming ' + name);
    // an empty row list never reaches a helper
    eq(h.run({ ticker: 'AAPL', legs: [{ type: 'STOCK' }] }), [], '…while a position with no call or put leg still answers an empty list');
  }
  // THE UNDERLYING.
  {
    const h = harness();
    const leg = { type: 'CALL', strike: 100, ticker: 'LEG' };
    eq(h.run({ ticker: ' aapl ', symbol: 'ZZZ', legs: [leg] })[0].underlying, 'AAPL', 'the underlying is the position\'s ticker, trimmed and upper-cased…');
    eq(h.run({ symbol: ' msft', legs: [leg] })[0].underlying, 'MSFT', '…else its symbol…');
    const none = harness();
    const r0 = none.run({ legs: [leg] })[0];
    eq(r0.underlying, '', '…else the empty string…');
    eq(none.calls.every((c) => c[1] === 'LEG'), true, '…and then every helper is asked about the LEG\'s own ticker instead');
    const num = harness();
    eq(num.run({ ticker: 12, legs: [leg] })[0].underlying, '12', 'a numeric ticker is turned into text');
  }
  // THE FILTER.
  {
    const h = harness();
    const p = { ticker: 'X', legs: [
      { type: 'call', strike: 1 }, { optionType: 'put', strike: 2 }, { right: 'c', strike: 3 }, { type: 'P', strike: 4 },
      { type: 'STOCK', strike: 5 }, { strike: 6 }, null, { type: 'CALLS', strike: 7 }, { type: '', optionType: 'PUT', strike: 8 },
    ] };
    eq(h.run(p).map((r) => r.strike), [1, 2, 3, 4, 8], 'a leg is kept when its type, else optionType, else right reads CALL, PUT, C or P in any case, in order; STOCK, an empty leg, a null and CALLS are dropped');
    eq(h.run(p).map((r) => r.legType), ['CALL', 'PUT', 'C', 'P', 'PUT'], '…and the row reports that type upper-cased, taken from the first of the three that is set');
    eq(h.calls.length, 5 * 4 * 2, '…the helpers are called only for the kept legs: four each, and twice here because the position was run twice');
  }
  // THE ROW.
  {
    const h = harness();
    const full = { type: 'put', strike: 150, expiration: '2026-12-18', expiry: 'X', side: 'SELL', action: 'Y', qty: 2,
      streamerSymbol: 'GOOD', optionSymbol: 'OPT', symbol: 'SYM', rawSymbol: 'RAW', ticker: 'LEGT' };
    const pos = { ticker: 'abc', symbol: 'ignored', legs: [full] };
    const snapshot = JSON.stringify(pos);
    const row = h.run(pos)[0];
    eq(Object.keys(row), KEYS, 'a row has exactly the pinned keys, in the pinned order');
    eq(row, {
      underlying: 'ABC', legType: 'PUT', strike: 150, expiration: '2026-12-18', side: 'SELL', qty: 2,
      existingStreamerSymbol: 'GOOD', streamerSymbolConsistent: true, compactDxlinkSymbol: 'compact:ABC:150',
      preferredDxlinkSymbol: 'preferred:ABC:150', existingOptionSymbol: 'OPT', existingSymbol: 'SYM',
      builtDxlinkSymbol: 'built:ABC:150',
      sourceFieldsFound: 'leg.streamerSymbol, leg.optionSymbol, leg.symbol, leg.rawSymbol, leg.expiration, leg.expiry, leg.strike, leg.type, leg.side, leg.qty, leg.ticker, position.ticker, position.symbol',
    }, 'a fully populated leg reads through to every field, and the helpers\' answers are copied unchanged');
    eq(JSON.stringify(pos), snapshot, 'the position and its leg are left exactly as they were');
    eq(h.calls.map((c) => c[0]), HELPERS, 'the four helpers are called once each, in the order streamer consistency, compact, preferred, built…');
    ok(h.calls.every((c) => c[1] === 'ABC' && c[2] === full), '…each with the underlying and the very leg object…');
    eq(h.calls[0][3], 'GOOD', '…the consistency check also being handed the leg\'s existing streamer symbol');
    // FALLBACKS.
    const alt = harness();
    const r = alt.run({ ticker: 'T', legs: [{ type: 'C', expiry: 'E', action: 'BUY', 'streamer-symbol': 'DASH', rawSymbol: 'RAW' }] })[0];
    eq([r.expiration, r.side, r.existingStreamerSymbol, r.existingSymbol, r.strike, r.qty, r.existingOptionSymbol],
      ['E', 'BUY', 'DASH', 'RAW', null, null, null],
      'expiration falls back to expiry, side to action, the existing streamer symbol to its hyphenated key, the existing symbol to rawSymbol, and a missing strike, quantity and option symbol are null');
    eq(alt.calls[0][3], 'DASH', '…the hyphenated key being what the consistency check is handed too');
    const zero = harness().run({ ticker: 'T', legs: [{ type: 'C', strike: 0, qty: 0 }] })[0];
    eq([zero.strike, zero.qty, zero.sourceFieldsFound], [0, 0, 'leg.strike, leg.type, leg.qty, position.ticker'],
      'a strike or a quantity of zero is kept as zero and counts as found, since only undefined, null and the empty string do not');
    const empty = harness().run({ legs: [{ type: 'C', strike: '', expiration: null, side: undefined }] })[0];
    eq(empty.sourceFieldsFound, 'leg.type', 'an empty string, null and undefined are not found, and a position with neither ticker nor symbol adds none of its own');
    const sym = harness().run({ symbol: 'S', legs: [{ type: 'C' }] })[0];
    eq(sym.sourceFieldsFound, 'leg.type, position.symbol', 'a position with only a symbol reports position.symbol');
  }
  // A LEGS VALUE THAT IS NOT AN ARRAY has no filter, and the function does not guard it.
  {
    const h = harness();
    let err = null;
    try { h.fn({ legs: {} }); } catch (e) { err = e; }
    eq(err && err.name, 'TypeError', 'a legs value that is not an array throws a TypeError: the function does not guard it');
    eq(h.run({ legs: 0 }), [], '…while a falsy one is replaced by an empty list');
  }
}

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
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, 'this cut is larger than that, so it would not be the smallest…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    '…measured against every layer rather than inferred from the first: it would rank SIZE_RANK_IF_CUT by size');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 0, '…and none exactly its size');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  // THE TWO CHAIN-WIDE SHAPE COUNTS. This body is pure ASCII, so the pure-ASCII
  // count WOULD move; it does not open on a `── ` banner, so the banner count
  // would not.
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(ascii(BODY), '…and this body is too, so that count WOULD move');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS + 1, '…by one, measured with it included');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does not, so that count would NOT move');
  eq(sources.concat([BODY]).filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…measured with it included, which is the same count');
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
eq(LOCALS[LOCALS.length - 1], 'js/portfolio/backend-positions-enriched.js',
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
console.log('OPTION_STREAMER_DIAGNOSTICS_AUDIT_OK');
}

main();
