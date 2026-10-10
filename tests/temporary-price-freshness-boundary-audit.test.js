'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PRICE FRESHNESS — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [778314,779937) in monolith coordinates — 1,623 units raw
// and 1,622 of body, ONE owner, a synchronous function — into
// js/portfolio/portfolio-price-freshness.js. `_portfolioPriceFreshness` builds
// the `priceFreshness` block of the portfolio refresh diagnostics from the
// per-refresh price-resolution results: for SPY and for every underlying, the
// price, where it came from, whether it was live and how old it is. The first 492
// units are the six comment lines that document it.
//
// ── THE FINDING, PART ONE: NOTHING IS LEFT AT 1, AND THE 2 IS THE BEST ──────
//
// The previous audit forecast that once the layer before this one shipped, no row
// in the shipped screen or in the pass over its sub-floor runs would score 1 or
// below, and that the best score left would be 2. It shipped, and §4 measures
// both enumerations on this base: nothing scores 1 in either, and this function
// is the ONLY row in the two of them whose raw nine is 2 or below. The claim is
// scoped to those two enumerations.
//
// ── PART TWO: WHAT THE 2 IS MADE OF ────────────────────────────────────────
//
// Two references reach in, from two different hosts. One is
// `refreshPositionsLive`, which assigns the returned block into the refresh
// diagnostics. The other is an anonymous function the screen files under TOP
// LEVEL because it is not a declaration: the console getter
// `window.apexDebugPortfolioPrices`, assigned inside an
// `if (typeof window !== 'undefined')` block. Neither reference is a top-level
// statement: both sit inside function bodies, and the getter's body runs only when
// something calls it, which §4 counts anywhere in the application sources at zero.
// The 2 is therefore resolved by reading the code rather than carried as a number.
//
// ── PART THREE: THE CLOCK ──────────────────────────────────────────────────
//
// The function is free of globals but not of the clock: when `nowMs` is absent it
// reads `Date.now()`. Its documentation says the age is computed against `nowMs`
// at CALL time, so that a stale price's age keeps growing between refreshes. §7
// measures both halves: with an explicit `nowMs` the result is a pure function of
// its arguments, and without one it falls back to the real clock.
//
// ── PART FOUR: THE BOUNDARY IS A JUDGEMENT ─────────────────────────────────
//
// The seam accepts NINE line starts between the previous function's closing brace
// and the declaration: that brace, a blank line, each of the six documentation
// lines, and the declaration. Eight parse. The screen would visit only the last,
// 1,130 units from the declaration and under its floor, and cutting there would
// leave the documentation behind, fused to the next function's own with no blank
// line between them. The recommendation opens on the first documentation line,
// and §2 measures both consequences.
//
// ── A NEIGHBOURHOOD THAT CHANGED ───────────────────────────────────────────
//
// The previous cut removed the function that sat between
// `_portfolioAggregatedMissingUnderlyings` and `_portfolioIvrFallbackBudget`, so
// those two are now adjacent and a run over both exists that did not before. §4
// publishes it as the best other opening.
//
// ── PRICED, AND WHERE IT WOULD SIT ─────────────────────────────────────────
//
// §5 prices the owners above it, the owners below it and the region. It would be
// the smallest of the forty-eight layers the chain would then hold, displacing the
// 1,689-unit layer into second place. The module holds one em dash, so it is not
// pure ASCII and §8 forecasts that count unchanged, as it does the count of layers
// opening on a banner.
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

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-price-freshness.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '536e5f7';
const BASE_CHARS = 1447577;
const BASE_UTF8 = 1476124;
const BASE_LF = 25036;
const BASE_SHA256 = '8777670c86b5c860a3820af78e48278d58a40bf1ca276e86271c9abb8edbb40f';
const LOCAL_SCRIPTS = 91;
const TEST_FILE_COUNT = 176;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-price-freshness-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/price-freshness-audit.spec.js';
const RATCHETED_CONTRACTS = 38;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/portfolio-underlying-fallback-plan-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 137;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-underlying-fallback-plan-contract.spec.js';
const RETIRED_MUTANTS = 131;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115414;
const CODE_CHARS = 1332137;
const TOP_LEVEL_DECLS = 913;
const OWNER_REGIONS = 118;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the six comment lines that document the function, not on the
// declaration the screen enumerates.
const RAW_AT_IN_CODE = 778314;
const DECL_AT_IN_CODE = 778806;
const RAW_END_IN_CODE = 779937;
const BODY_END_IN_CODE = 779936;
const RAW_CHARS = 1623;
const BODY_CHARS = 1622;
const BODY_UTF8 = 1624;
const BODY_LF = 40;
const BODY_SHA256 = 'c8c6bebe90e3ba8c435e3ce7a1c63236e07a2839f4a9cfae2c4fc2dc141fa45e';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// _portfolioPriceFreshness — builds the priceFreshness debug block from the';
const DECL_FIRST_LINE =
  'function _portfolioPriceFreshness(priceDiag, meta, nowMs) {';
const NEXT_DECL = 'resolvePortfolioLivePrice';
const NEXT_DOC_PREFIX = '// resolvePortfolioLivePrice — ONE price resolver';
const EM_DASHES = 1;

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_portfolioPriceFreshness'];
const OWNER_SIZES = [1129];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 40;
const CODE_LINES = 34;
const COMMENT_LINES = 6;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous function's closing brace and the declaration the seam
// accepts NINE line starts. One is that closing brace and is not valid
// JavaScript; one is a blank line; six are the lines of the documentation, and
// the last is the declaration. The screen visits only the last.
const BRACE_OPENING = 778311;
const BLANK_OPENING = 778313;
const MID_LINE_OPENING = 778312;
const SEAM_LEGAL_OPENINGS = 9;
const PARSING_OPENINGS = 8;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 492;
const DOC_TAKEN_LINES = 6;
const DECL_UNITS_FROM_DECLARATION = 1130;
const CANDIDATES_AT_DECLARATION = 0;
const BLANK_AFTER_CUT = '}\n\n// resolvePortfolioLivePrice';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 746813;
const REGION_END = 805432;
const REGION_CHARS = 58619;
const REGION_OWNERS = 24;
const OWNER_POSITION = 19;
const OWNER_BEFORE = '_deltaThetaRatioMissingReason';
const BANNER_LINE_PREFIX = '// ── UNREALIZED P&L';
const WHOLE_REGION_NINE = 148;
const WHOLE_REGION_BCS = 61;
const WHOLE_REGION_CONSUMERS = 8;
const WHOLE_REGION_DEPS = 20;
const WHOLE_REGION_SIB = 4;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_UP = [
  ['_deltaThetaRatioMissingReason', 777607, 2330, 5, 3, 0],
  ['_aggregateBetaWtdMissingReason', 776782, 3155, 8, 3, 0],
  ['_betaMissingReasonLabel', 775916, 4021, 9, 3, 0],
];
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['resolvePortfolioLivePrice', 12219, 12, 5, 3],
  ['_apexLatestBetaBySymbol', 12749, 23, 9, 3],
  ['_portfolioLatestBackendBetaEntry', 13140, 23, 9, 3],
];

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 2;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = 'refreshPositionsLive';
const TOP_LEVEL_HOST = '(TOP LEVEL)';
const CONSUMER_SITES = 2;
const GETTER_SITE_AT = 805122;
const CONSUMER_SITE_AT = 1120120;
const CONSUMER_AT = 985472;
const CONSUMER_END = 1123954;
const CONSUMER_CHARS = 138483;
const GETTER_CALLS = 0;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 2;
// The two owners that surrounded the previous cut, adjacent now.
const OWNER_BEFORE_PREVIOUS_CUT = '_portfolioAggregatedMissingUnderlyings';
const NEXT_DECL_AFTER_PREVIOUS_CUT = '_portfolioIvrFallbackBudget';
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// BOTH scans find nothing here. The inherited one is wrong on a `var a, b` list
// and this body has none, so the two agree; the controls in §3 are what show
// each of them can find something.
const UNCORRECTED_SCAN_HITS = 0;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_portfolioPriceFreshness'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7288;
const SEAM_REJECTED = 2047;
const CANDIDATES = 2946;
const CLEAN_CANDIDATES = 1800;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 10;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION. A function whose documentation lifts it over the floor
// was therefore never enumerated. This pass keeps every run the screen skipped
// for being short, re-measures it from the start of its documentation, and
// keeps those that then clear the floor.
const HIDDEN_ROWS = 39;
const HIDDEN_CLEAN_ROWS = 38;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 4;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [778314, 779936, 1130, 1622, 2, 2, ['_portfolioPriceFreshness']],
  [1144425, 1146012, 1173, 1587, 3, 2, ['_portfolioAggregatedMissingUnderlyings', '_portfolioIvrFallbackBudget']],
  [898277, 900025, 1375, 1748, 4, 2, ['fetchBackendPortfolioPositionsEnriched']],
  [750645, 752344, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 14;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [1144425, 2, 3, 1587],
  [61214, 2, 3, 3034],
  [286843, 2, 4, 1735],
  [898277, 2, 4, 1748],
];
const PREVIOUS_RAW_CHARS = 1690;
const PREVIOUS_RAW_END = 1147222;

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 47;
const SMALLEST_LAYER_CHARS = 1689;
const SIZE_RANK_IF_CUT = 1;
const LAYERS_LARGER_THAN_THIS_CUT = 47;
const PURE_ASCII_LAYERS = 4;
const LAYERS_OPENING_ON_BANNER = 23;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/portfolio/portfolio-price-freshness.js"></script>\n';
const NET_REDUCTION = 1555;
const INDEX_AFTER = 1446022;
const RESIDUAL_MONOLITH = 1330514;
const LOCAL_SCRIPTS_AFTER = 92;

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



console.log('PRICE FRESHNESS — TEMPORARY BOUNDARY AUDIT');
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
// underlying fallback plan predicted the document, the residual monolith and the
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
section('2. The region, its seam, and the nine openings the seam admits');
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
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dash');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * EM_DASHES,
  '…which is the whole of the gap between its UTF-8 and UTF-16 lengths, two bytes each');
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
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…whose own documentation begins exactly where the cut ends, so nothing sits between them');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits nine openings.
const OPENINGS = [];
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    'SEAM_LEGAL_OPENINGS line starts between the previous owner and the declaration are accepted');
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the previous function\'s closing brace');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last the declaration');
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
    '…so PARSING_OPENINGS of the nine are even candidates, counted rather than listed');
  eq(OPENINGS[1], BLANK_OPENING, 'the next is a blank line…');
  ok(isBlankOrComment(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE))),
    '…which would make a module that begins on an empty line');
  eq(OPENINGS[2], RAW_AT_IN_CODE, 'the one after it is the first line of the documentation, the cut');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES documentation lines are each an opening of their own');
}

// WHAT THE RECOMMENDATION TAKES is the whole comment block documenting the
// function, and nothing else: six comment lines directly above the declaration.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  ok(doc.indexOf('Pure + testable.') >= 0,
    '…and which claims the function is pure, a claim §3 and §7 measure rather than trust');
}
// WHAT LEAVING IT WOULD STRAND. Cutting at the declaration (the one opening the
// screen visits) would leave the six comment lines behind, fused to the next
// function's documentation with no blank line between them.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would leave the documentation fused to the next function\'s own');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(clean.indexOf(BLANK_AFTER_CUT), RAW_AT_IN_CODE - 3,
    'while the recommended cut leaves the previous function\'s closing brace, exactly one blank '
    + 'line, and the next function\'s documentation');
  ok(clean.indexOf(DOC_FIRST_LINE) < 0, '…and no line of this documentation behind');
}
// THE SCREEN CANNOT SEE IT. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION; this function measures DECL_UNITS_FROM_DECLARATION that
// way and BODY_CHARS from its documentation.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION < RUN_FLOOR && RUN_FLOOR <= BODY_CHARS,
  '…below RUN_FLOOR, while its documentation lifts it over the floor');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…so the shipped screen enumerates NO run that ends where this cut does');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, no dependency, and both directions measured');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a function, so this layer would ship no mutable binding');
  ok(!/^async /.test(DECL_FIRST_LINE), '…and a synchronous one');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES reference from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is EMPTY too');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [TOP_LEVEL_HOST, CONSUMER],
  'TWO consumers reach in, as the screen files them: TOP_LEVEL_HOST and CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call sites, one each');
eq(REC.sites, [GETTER_SITE_AT, CONSUMER_SITE_AT], '…at GETTER_SITE_AT and CONSUMER_SITE_AT');
eq(CODE.slice(CONSUMER_SITE_AT - '_apexPortfolioGreeksRefreshDiag.priceFreshness = '.length, CONSUMER_SITE_AT),
  '_apexPortfolioGreeksRefreshDiag.priceFreshness = ',
  '…the named consumer assigning the returned block into the refresh diagnostics, which is all it does with it');
eq(CODE.slice(GETTER_SITE_AT - 'var pf = '.length, GETTER_SITE_AT), 'var pf = ',
  '…and the other binding it to a local inside the console getter');
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.end < RAW_AT_IN_CODE || keeper.start > RAW_END_IN_CODE, '…which sits outside the cut');
  ok(CONSUMER_SITE_AT > keeper.start && CONSUMER_SITE_AT < keeper.end, '…and its site is inside its body');
  ok(!hostOf(GETTER_SITE_AT), '…while the other site has NO enclosing declaration, which is why the screen files it under TOP LEVEL');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and NO foundation module either: FOUNDATION_OUTBOUND');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, the best score left on this base');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
//
// TWO SCANS, AND THEY AGREE HERE. The one this file inherited reads only the
// first name of a `var` list as local; the corrected one reads every declarator.
// This body has no comma-separated list, so both find nothing — which is why
// the controls below matter: a zero from either needs an input where the
// answer differs.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignments to names it takes for globals…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the body does not own…');
  const varKeywords = (maskLiterals(BODY).match(/\bvar\b/g) || []).length;
  eq(declaredNamesIn(BODY).size, varKeywords,
    '…the body declaring exactly one name per `var`, so it has no comma-separated list, which is the only place the two differ');
  eq(declaredNamesIn('function f() { var a = 1, b = 2; }').size, 2,
    'control — the same count sees two names behind one `var` in a list, so the check can fail');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document');
  // CONTROLS: both scans DO find a planted violation, and only the corrected one
  // ignores every declarator, so a zero is a measurement and not a function
  // returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — it finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsUncorrected('function f() { leaked = 2; }'), ['leaked'],
    'control — and the inherited scan does find a plain planted write, so its zero here is a measurement');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: nothing is left at 1, the 2 is the best there is, and what it is made of');
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE PREVIOUS CONTRACT PUBLISHED, read out of it.
const prevText = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
const listOf = (name) => prevText.match(new RegExp('^const ' + name + ' = \\[([\\s\\S]*?)^\\];', 'm'))[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
  .map((l) => JSON.parse(l.replace(/,$/, '').replace(/'/g, '"')));
const prevNum = (name) => Number(prevText.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
const prevStr = (name) => prevText.match(new RegExp("^const " + name + " = '([^']*)';$", 'm'))[1];
{
  eq(prevNum('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(prevNum('RAW_END_IN_CODE'), PREVIOUS_RAW_END, '…ending at PREVIOUS_RAW_END…');
  ok(prevNum('RAW_AT_IN_CODE') > RAW_END_IN_CODE,
    '…and it sat entirely AFTER this cut, so no offset in this audit moved because of it');
  ok(prevText.indexOf('the best score that remained was 2') >= 0,
    'the previous contract forecast that the best score left would be 2…');
  eq(listOf('RUNNERS_UP')[0], [RAW_AT_IN_CODE, 2, 2, 1622],
    '…and published this function\'s opening as its first runner-up, at byConsumerSplit 2 and raw nine 2');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidates at 2');
  eq(hiddenRows.length, HIDDEN_ROWS, 'the pass over runs the screen skipped for being short has HIDDEN_ROWS rows…');
  const hiddenClean = hiddenRows.filter((c) => runsNothingAtLoad(c.load));
  eq(hiddenClean.length, HIDDEN_CLEAN_ROWS, '…HIDDEN_CLEAN_ROWS of which run nothing at load');
  ok(hiddenRows.every((c) => c.unitsDecl < RUN_FLOOR && c.unitsDoc >= RUN_FLOOR),
    '…every one below RUN_FLOOR from its declaration and at or above it from its documentation');
  ok(hiddenRows.every((c) => !candidateRuns.some((s) => s.lo === c.lo && s.hi === c.hi)),
    '…and not one of them is a row the shipped screen already has');
  eq(hiddenClean.filter((c) => c.bcs <= 1).length, HIDDEN_SCORE_ONE,
    'HIDDEN_SCORE_ONE of them score 1 on byConsumerSplit: neither enumeration holds a row at 1 any more…');
  const atTwo = hiddenClean.filter((c) => c.bcs === 2).sort((a, b) => a.nine - b.nine || a.lo - b.lo || a.hi - b.hi);
  eq(atTwo.length, HIDDEN_SCORE_TWO, '…and HIDDEN_SCORE_TWO score 2');
  eq(atTwo.map((c) => [c.lo, c.hi, c.unitsDecl, c.unitsDoc, c.nine, c.bcs, c.p.names]),
    HIDDEN_SCORE_TWO_ROWS, '…those being exactly HIDDEN_SCORE_TWO_ROWS');
  eq(HIDDEN_SCORE_TWO_ROWS[0].slice(0, 2), [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    'the first of them IS the recommended cut');
  // THE ONLY ROW AT RAW NINE 2 OR BELOW, over the screen and the pass together.
  const rows = cleanRuns.map((c) => ({ lo: c.lo, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, bcs: c.bcs, nine: c.nine, units: c.unitsDoc })));
  eq(rows.filter((r) => r.nine <= FULL_NINE).map((r) => r.lo), [RAW_AT_IN_CODE],
    'in the screen and the pass together, the recommended opening is the ONLY one whose raw nine is FULL_NINE or below');
  eq(new Set(rows.filter((r) => r.bcs <= BY_CONSUMER_SPLIT).map((r) => r.lo)).size, OPENINGS_AT_TWO_OR_BELOW,
    '…among OPENINGS_AT_TWO_OR_BELOW distinct openings that score 2 or below, so the lead is in the nine and the byConsumerSplit alone does not give it');
  // WHAT IS PUBLISHED FOR THE NEXT CYCLE, over the screen and the hidden pass
  // together, skipping anything that overlaps the cut.
  const overlaps = (lo, hi) => lo < RAW_END_IN_CODE && hi > RAW_AT_IN_CODE;
  const pool = cleanRuns.filter((c) => !overlaps(c.lo, c.hi))
    .map((c) => ({ lo: c.lo, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units }))
    .concat(hiddenClean.filter((c) => !overlaps(c.lo, c.hi))
      .map((c) => ({ lo: c.lo, bcs: c.bcs, nine: c.nine, units: c.unitsDoc })));
  const bestPer = new Map();
  for (const r of pool) {
    const b = bestPer.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPer.set(r.lo, r);
  }
  const ranked = [...bestPer.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units)
    .slice(0, RUNNERS_UP.length).map((r) => [r.lo, r.bcs, r.nine, r.units]);
  eq(ranked, RUNNERS_UP,
    'the four best other openings, by (byConsumerSplit, nine, units), are exactly RUNNERS_UP');
  // THE PREVIOUS CONTRACT'S OTHER RUNNERS-UP survive the cut that left: it sat
  // after all of them, so none moved.
  eq(listOf('RUNNERS_UP').slice(1), RUNNERS_UP.slice(1),
    '…and the three the previous contract published after this one are still exactly RUNNERS_UP[1..3]');
  // A RUN THAT DID NOT EXIST BEFORE: the previous cut removed the function that
  // sat between these two owners, so they are adjacent now.
  eq(RUNNERS_UP[0][0], HIDDEN_SCORE_TWO_ROWS[1][0], 'the new best other opening is the second row at 2…');
  eq(HIDDEN_SCORE_TWO_ROWS[1][6], [OWNER_BEFORE_PREVIOUS_CUT, NEXT_DECL_AFTER_PREVIOUS_CUT],
    '…a run over the two owners that surrounded the previous cut…');
  eq(DECLS.indexOf(BY_NAME.get(NEXT_DECL_AFTER_PREVIOUS_CUT)) - DECLS.indexOf(BY_NAME.get(OWNER_BEFORE_PREVIOUS_CUT)), 1,
    '…which are adjacent declarations now');
  eq([prevStr('OWNER_BEFORE'), prevStr('NEXT_DECL')], [OWNER_BEFORE_PREVIOUS_CUT, NEXT_DECL_AFTER_PREVIOUS_CUT],
    '…and are the owner above and the owner below in the previous contract, which is where the function between them used to be');
}
// WHAT THE 2 IS MADE OF, resolved by reading the code. One reference is a named
// consumer; the other is inside an anonymous function the screen cannot name.
{
  const before = CODE.slice(GETTER_SITE_AT - 900, GETTER_SITE_AT);
  ok(/window\.apexDebugPortfolioPrices = function\(\) \{/.test(before),
    'the reference the screen files under TOP LEVEL is inside the function expression assigned to window.apexDebugPortfolioPrices…');
  ok(/if \(typeof window !== 'undefined'\) \{/.test(before),
    '…which is assigned inside an `if (typeof window !== \'undefined\')` block, a console API and not application flow');
  const refs = (re) => [CODE].concat(SIBLINGS.map((x) => x.src)).concat([STATIC_MARKUP, OTHER_INLINE])
    .reduce((n, text) => n + (text.match(re) || []).length, 0);
  eq(refs(/apexDebugPortfolioPrices\s*\(/g), GETTER_CALLS,
    'no application source, local script or markup CALLS that getter: GETTER_CALLS call sites, so its body never runs by itself');
  ok(refs(/\bapexDebugPortfolioPrices\b/g) > 0,
    'control — the getter is named in the application, so that zero is a count and not a name that matches nothing');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would cost: the owners above, the owners below, the region');
// ─────────────────────────────────────────────────────────────────────────────
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  eq(blockAbove(d).start, lo, 'taking ' + name + ' with its documentation opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  const p = profileOf([lo, BODY_END_IN_CODE]);
  eq([RAW_END_IN_CODE - lo, p.nine, byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), p.deps.length],
    [units, nine, bcs, deps], '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(runsNothingAtLoad(loadTimeProfile(lo, BODY_END_IN_CODE)), '…and it too runs nothing at load');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…strictly worse than the cut on the nine and on byConsumerSplit');
}
eq(EXTENSIONS_UP.every((e, i) => i === 0 || (e[3] > EXTENSIONS_UP[i - 1][3] && e[2] > EXTENSIONS_UP[i - 1][2])), true,
  'each further owner taken above raises the raw nine and the length again, so no stopping point is better');
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
for (const [name, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const d = BY_NAME.get(name);
  const hb = downEnd(d);
  const hr = assertSeam(CODE, RAW_AT_IN_CODE, hb);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq([hr - RAW_AT_IN_CODE, p.nine, byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), p.deps.length],
    [units, nine, bcs, deps], 'running the cut down through ' + name + ' costs the pinned units, nine, byConsumerSplit and dependencies');
  ok(runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb)), '…a run that also runs nothing at load');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…and is worse on the raw nine and on byConsumerSplit');
}
eq(EXTENSIONS_DOWN[0][0], NEXT_DECL, 'the first owner below is the very next declaration, NEXT_DECL');
// THE CONSUMER is larger than any layer the chain holds.
{
  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length);
  ok(CONSUMER_CHARS > Math.max(...sizes),
    'the consumer, CONSUMER_CHARS units, is larger than the largest shipped layer, so taking it is not a refinement of this cut');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner
// region" would require all of it.
{
  const reg = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT');
  eq(reg.end, REGION_END, '…and ends at REGION_END');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the unrealized P&L banner');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…this function being owner number OWNER_POSITION of them');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…with OWNER_BEFORE immediately above it');
  eq(own[OWNER_POSITION].name, NEXT_DECL, '…and NEXT_DECL immediately below');
  ok(reg.end > RAW_END_IN_CODE, '…so the cut does NOT close its region');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
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
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  ok(CLEAN_CANDIDATES < Number(prev.match(/^const CLEAN_CANDIDATES = (\d+);$/m)[1]),
    '…fewer than the previous contract counted, because a cut left the monolith');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => c.hi > BODY_END_IN_CODE),
  '…but every run the screen opens there is LONGER than the cut, because the cut\'s own length is under the floor');

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, is pure given a clock, and returns plain data');
// ─────────────────────────────────────────────────────────────────────────────
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
  vm.runInContext(BODY, ctx);
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM and declares exactly its one owner');
  // A VM-REALM RESULT is compared through JSON, never directly: its prototypes
  // belong to the VM's own realm, so a strict deep-equal against a host object
  // fails even when every field matches.
  const fn = vm.runInContext(VM_GLOBALS[0], ctx);
  const call = (...args) => JSON.parse(JSON.stringify(fn.apply(null, args)));
  const NOW = Date.parse('2026-01-02T03:04:15Z');
  const diag = { resolvedPricesBySymbol: {
    SPY: { price: 500, source: 'dxlink', updatedAt: '2026-01-02T03:04:05Z', isLive: true },
    AAPL: { price: 190, source: 'cache', updatedAt: '2026-01-02T03:00:00Z', isLive: false,
      staleReason: 'CACHE_PREVIOUS_PRICE', attempts: [{ source: 'dxlink', ok: false }] },
    MSFT: null,
    FUT: { price: 7, updatedAt: '2026-01-02T03:05:00Z' },
    BAD: { price: null, updatedAt: 'not a date' },
  } };
  eq(call(null, null, NOW), { refreshStartedAt: null, refreshCompletedAt: null, symbols: [], spy: null, underlyings: {} },
    'with nothing to report it returns the empty block, without needing any global');
  const full = call(diag, { refreshStartedAt: 'a', refreshCompletedAt: 'b' }, NOW);
  eq([full.refreshStartedAt, full.refreshCompletedAt], ['a', 'b'], 'the refresh window is carried through from meta');
  eq(full.symbols, ['AAPL', 'MSFT', 'FUT', 'BAD'], '…the symbols are every key but SPY, in insertion order');
  eq(full.spy, { price: 500, source: 'dxlink', updatedAt: '2026-01-02T03:04:05Z', isLive: true,
    staleReason: null, ageMs: 10000, attempts: [] },
  '…SPY is its own entry, aged against the explicit now, with defaults for what is missing');
  eq(full.underlyings.AAPL.ageMs, 255000, '…a stale underlying is 4m15s old');
  eq(full.underlyings.AAPL.staleReason, 'CACHE_PREVIOUS_PRICE', '…keeps its stale reason…');
  eq(full.underlyings.AAPL.attempts, [{ source: 'dxlink', ok: false }], '…and its attempts');
  eq(full.underlyings.MSFT, null, '…a null entry stays null');
  eq(full.underlyings.FUT.ageMs, 0, '…an update in the future ages to zero, not negative');
  eq(full.underlyings.BAD.ageMs, null, '…and an unparseable date has no age');
  eq(full.underlyings.BAD.price, null, '…nor a price');
  // THE AGE GROWS WITH THE CALL-TIME CLOCK, as the documentation says.
  eq(call(diag, {}, NOW + 60000).spy.ageMs, 70000,
    'the same diagnostics called a minute later age by exactly a minute: ages are computed at CALL time');
  eq(call(diag, {}, NOW), call(diag, {}, NOW),
    'with an explicit clock two identical calls return identical blocks: it is deterministic…');
  // WITHOUT a clock it reads Date.now().
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
  const stamped = { resolvedPricesBySymbol: { SPY: { price: 1, updatedAt: fiveSecondsAgo } } };
  const live = call(stamped, {});
  ok(live.spy.ageMs >= 5000 && live.spy.ageMs < 60000,
    '…and without one it falls back to the real clock: a price stamped five seconds ago is about five seconds old');
  const nan = call(stamped, {}, NaN);
  ok(nan.spy.ageMs >= 5000 && nan.spy.ageMs < 60000, '…and so does a clock that is not finite');
  const input = JSON.stringify(diag);
  fn(diag, {}, NOW);
  eq(JSON.stringify(diag), input, '…and it leaves its argument untouched');
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(), '…and defines no global when called');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Where this layer would sit, and what it would change');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  ok(BODY_CHARS < SMALLEST_LAYER_CHARS, 'this cut is smaller than that — the layer it would displace into second place…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    '…measured against every layer rather than inferred from the first: it would rank SIZE_RANK_IF_CUT by size, the smallest');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  // THE TWO CHAIN-WIDE SHAPE COUNTS: neither moves. This module holds an em dash,
  // so it is NOT pure ASCII, and it does not open on a `── ` banner.
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(!ascii(BODY), '…and this body is not, so that count would NOT move');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS, '…measured with it included, which is the same count');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does not, so that count would NOT move');
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
eq(LOCALS[LOCALS.length - 1], 'js/portfolio/portfolio-underlying-fallback-plan.js',
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
console.log('PRICE_FRESHNESS_AUDIT_OK');
}

main();
