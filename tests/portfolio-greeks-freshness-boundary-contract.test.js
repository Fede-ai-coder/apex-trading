'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// GREEKS FRESHNESS — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [778314,780348) in monolith coordinates — 2,034 units raw and
// 2,033 of body, ONE owner, a synchronous function — now live in
// js/portfolio/portfolio-greeks-freshness.js. `_portfolioGreeksFreshness` builds
// the `greeksFreshness` block of the portfolio refresh diagnostics: the dominant
// greeks source, the market-session status, whether the greeks were stale and
// whether that was expected, and how many quotes and greeks resolved. The first
// 970 units are the thirteen comment lines that document it.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #486 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: THE FLOOR HID THE SCORE-1 TIER ──────────────────
//
// The audit before this layer reported that nothing was left at byConsumerSplit
// 1 once the previous layer had shipped, and the shipped screen still says so.
// That is a statement about the SCREEN. The screen floors a run at RUN_FLOOR
// units measured from the DECLARATION, so a function whose documentation lifts it
// over the floor was never enumerated. §4 re-runs the screen over exactly the
// runs it skipped for being short, measuring each from the start of its
// documentation, on the reconstructed base, and finds three clean candidates at
// 1. This layer is the first of them in the order §4 sorts them (raw nine, then
// offset). The wording that called the tier empty was
// corrected, in the contract that carries it, by the audit that found this.
//
// ── PART TWO: A TIE, STATED AS ONE ─────────────────────────────────────────
//
// Two distinct openings tie at the best score there is — byConsumerSplit 1, raw
// nine 1, one consumer, no dependency — so the coupling measures do not separate
// them: this function and `_planPortfolioUnderlyingFallback`. The cut took the
// larger of the two, and the tie-break was size. The other is published as the
// next candidate.
//
// ── PART THREE: THE SCAN WAS WRONG, THE FUNCTION WAS NOT ───────────────────
//
// The second look at the outbound direction, a direct scan for assignment to
// anything the body does not own, reported two hits on this function. Both are to
// `topN`, which the body declares in the comma-separated list
// `var source = null, topN = -1;`, and the scan treated only the first name of a
// `var` list as local. §3 measures the false positive, then the corrected scan,
// and plants a violation each is run against.
//
// ── PART FOUR: THE BOUNDARY IS A JUDGEMENT, IN A NEW SHAPE ─────────────────
//
// The seam accepts SIXTEEN line starts between the previous function's closing
// brace and the declaration: that brace, a blank line, each of the thirteen
// documentation lines, and the declaration. Fifteen parse. The screen visits only
// the last, and cutting there would have left the documentation behind, fused to
// the next function's own with no blank line between them. The cut opens on the
// first documentation line, and §2 measures both consequences.
//
// ── NO DEPENDENCY, SO THE LOAD ORDER IS NOT LOAD-BEARING ───────────────────
//
// Unlike the layer before it, this function needs nothing from the monolith: §7
// loads it in a bare VM and calls it, so a missing global could not hide. §9 pins
// where the tag sits all the same — after every other local script and
// immediately before the inline monolith — and the call site stays in the
// monolith.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// FOURTH smallest of the forty-six layers the chain now holds. §8 asserts the
// rank by measurement. Neither chain-wide shape count moved, since the module
// holds nine em dashes and opens on a comment.
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
// The layer cut AFTER this one, peeled off before this layer's own document is
// reconstructed. Newest-first, which is the rule the whole chain follows.
const PORTFOLIO_MISSING_UNDERLYINGS_GATE_U = require('./lib/portfolio-missing-underlyings-gate-undo.js');
const PORTFOLIO_PRICE_FRESHNESS_U = require('./lib/portfolio-price-freshness-undo.js');
const PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U = require('./lib/portfolio-underlying-fallback-plan-undo.js');
const UNDO = require('./lib/portfolio-greeks-freshness-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while
// the cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/portfolio-greeks-freshness.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = 'f1739ad';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '6d48268';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = '8823e31';
const BASE_CHARS = 1451155;
const BASE_UTF8 = 1479720;
const BASE_LF = 25096;
const BASE_SHA256 = '2911fa206e185b83c94b0eab96d2dcfe4d4a991969ea220c8ed37dd8bc747ca0';
const LOCAL_SCRIPTS = 89;
const TEST_FILE_COUNT = 177;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-greeks-freshness-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/greeks-freshness-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-greeks-freshness-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-greeks-freshness-contract.spec.js';
const UNDO_REL = 'tests/lib/portfolio-greeks-freshness-undo.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = '8823e31';
const CONTRACT_SPEC_MUTANTS = 123;
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 39;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/rs-skip-breakdown-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 124;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the
// outgoing contract's spec went in Phase 1, which is the rhythm. §10 asserts
// the arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/greeks-freshness-audit.spec.js';
const RETIRED_MUTANTS = 118;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115268;
const CODE_CHARS = 1335861;
const TOP_LEVEL_DECLS = 915;
const OWNER_REGIONS = 118;

// ── The region ───────────────────────────────────────────────────────────────
// It opens on the thirteen comment lines that document the function, not on the
// declaration the screen enumerates.
const RAW_AT_IN_CODE = 778314;
const DECL_AT_IN_CODE = 779284;
const RAW_END_IN_CODE = 780348;
const BODY_END_IN_CODE = 780347;
const RAW_CHARS = 2034;
const BODY_CHARS = 2033;
const BODY_UTF8 = 2051;
const BODY_LF = 31;
const BODY_SHA256 = '721725a565cb497cbf13a8ca5f80dd8ecae2bb2ad00f7a5a1d6dce9808de6c68';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// _portfolioGreeksFreshness — builds the greeksFreshness debug block from the';
const DECL_FIRST_LINE =
  'function _portfolioGreeksFreshness(optDiag, fallbackSessionStatus, greeksRefreshDiag) {';
const NEXT_DECL = '_portfolioPriceFreshness';
const EM_DASHES = 9;

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_portfolioGreeksFreshness'];
const OWNER_SIZES = [1062];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 31;
const CODE_LINES = 17;
const COMMENT_LINES = 14;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous function's closing brace and the declaration the seam
// accepts SIXTEEN line starts. One is that closing brace and is not valid
// JavaScript; one is a blank line; thirteen are the lines of the documentation,
// and the last is the declaration. The screen visits only the last.
const BRACE_OPENING = 778311;
const BLANK_OPENING = 778313;
const MID_LINE_OPENING = 778312;
const SEAM_LEGAL_OPENINGS = 16;
const PARSING_OPENINGS = 15;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 970;
const DOC_TAKEN_LINES = 13;
const DECL_UNITS_FROM_DECLARATION = 1063;
const CANDIDATES_AT_DECLARATION = 0;
const BLANK_AFTER_CUT = '}\n\n// _portfolioPriceFreshness';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 746813;
const REGION_END = 807466;
const REGION_CHARS = 60653;
const REGION_OWNERS = 25;
const OWNER_POSITION = 19;
const OWNER_BEFORE = '_deltaThetaRatioMissingReason';
const BANNER_LINE_PREFIX = '// ── UNREALIZED P&L';
const WHOLE_REGION_NINE = 149;
const WHOLE_REGION_BCS = 61;
const WHOLE_REGION_CONSUMERS = 8;
const WHOLE_REGION_DEPS = 20;
const WHOLE_REGION_SIB = 4;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_UP = [
  ['_deltaThetaRatioMissingReason', 777607, 2741, 4, 3, 0],
  ['_aggregateBetaWtdMissingReason', 776782, 3566, 7, 3, 0],
  ['_betaMissingReasonLabel', 775916, 4432, 8, 3, 0],
];
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['_portfolioPriceFreshness', 3657, 3, 2, 0],
  ['resolvePortfolioLivePrice', 14253, 13, 5, 3],
  ['_apexLatestBetaBySymbol', 14783, 24, 9, 3],
];

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 1;
const BY_CONSUMER = 1;
const BY_CONSUMER_SPLIT = 1;
const CONSUMER = 'refreshPositionsLive';
const CONSUMER_SITES = 1;
const CONSUMER_SITE_AT = 1121994;
const CONSUMER_AT = 987506;
const CONSUMER_END = 1125988;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 1;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// THE SHIPPED SCAN'S FALSE POSITIVES. The scan this file inherited reads only
// the FIRST name of a `var` list, so `var source = null, topN = -1;` leaves
// `topN` looking like a global being written. It reported this many; the
// corrected scan reports none.
const UNCORRECTED_SCAN_HITS = 2;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_portfolioGreeksFreshness'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7323;
const SEAM_REJECTED = 2048;
const CANDIDATES = 2978;
const CLEAN_CANDIDATES = 1820;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 14;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION. A function whose documentation lifts it over the floor
// was therefore never enumerated. This pass keeps every run the screen skipped
// for being short, re-measures it from the start of its documentation, and
// keeps those that then clear the floor.
const HIDDEN_ROWS = 41;
const HIDDEN_CLEAN_ROWS = 40;
const HIDDEN_SCORE_ONE = 3;
const HIDDEN_SCORE_TWO = 3;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_ONE_ROWS = [
  [778314, 780347, 1063, 2033, 1, 1, ['_portfolioGreeksFreshness']],
  [1147566, 1149255, 707, 1689, 1, 1, ['_planPortfolioUnderlyingFallback']],
  [1147566, 1149736, 1188, 2170, 2, 1, ['_planPortfolioUnderlyingFallback', '_portfolioIvrFallbackBudget']],
];
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [1147566, 1, 1, 1689],
  [780348, 2, 2, 1622],
  [1146873, 2, 3, 2382],
  [61214, 2, 3, 3034],
];
const PREVIOUS_RAW_CHARS = 1801;
const PREVIOUS_RAW_END = 338277;

// ── Where it sits ────────────────────────────────────────────────────────────
const CHAIN_LENGTH = 46;
const SMALLEST_LAYER_CHARS = 1761;
const SIZE_RANK = 4;
const LAYERS_LARGER_THAN_THIS_CUT = 42;
const SMALLER_LAYERS = [1761, 1800, 1852];
const PURE_ASCII_LAYERS = 3;
const LAYERS_OPENING_ON_BANNER = 23;

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1965;
const INDEX_AFTER = 1449190;
const RESIDUAL_MONOLITH = 1333827;
const LOCAL_SCRIPTS_AFTER = 90;
// The tag's position among the local scripts, zero-based: the last of 90.
const TAG_LOCAL_INDEX = 89;

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



console.log('GREEKS FRESHNESS — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE = PORTFOLIO_MISSING_UNDERLYINGS_GATE_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_MISSING_UNDERLYINGS_GATE_U.undoPortfolioMissingUnderlyingsGate(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-missing-underlyings-gate.js'), 'utf8'))
  : HEAD_INDEX;
const PRE_PORTFOLIO_PRICE_FRESHNESS = PORTFOLIO_PRICE_FRESHNESS_U.isApplied(PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE)
  ? PORTFOLIO_PRICE_FRESHNESS_U.undoPortfolioPriceFreshness(
      PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-price-freshness.js'), 'utf8'))
  : PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE;
const LIVE_INDEX = PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.isApplied(PRE_PORTFOLIO_PRICE_FRESHNESS)
  ? PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.undoPortfolioUnderlyingFallbackPlan(
      PRE_PORTFOLIO_PRICE_FRESHNESS, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-underlying-fallback-plan.js'), 'utf8'))
  : PRE_PORTFOLIO_PRICE_FRESHNESS;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX, MODULE);

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
];
const CHAIN_SET = new Set(CHAIN);
// THE SELF-INCLUSION GUARD. CHAIN now ends at THIS layer and this file is its
// contract, so any census over CHAIN that reads contracts would count this cut as
// evidence for a claim about the layers that preceded it. Every such census runs
// over PRIOR_LAYERS and asserts this layer's own half separately.
const PRIOR_LAYERS = CHAIN.slice(0, CHAIN.length - 1);
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the RS
// skip breakdown predicted the document, the residual monolith and the script
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
section('2. The region, its seam, and the sixteen openings the seam admits');
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
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dashes');
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

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits sixteen openings.
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
    '…so PARSING_OPENINGS of the sixteen are even candidates, counted rather than listed');
  eq(OPENINGS[1], BLANK_OPENING, 'the next is a blank line…');
  ok(isBlankOrComment(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE))),
    '…which would make a module that begins on an empty line');
  eq(OPENINGS[2], RAW_AT_IN_CODE, 'the one after it is the first line of the documentation, the cut');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES documentation lines are each an opening of their own');
}

// WHAT THE CUT TAKES is the whole comment block documenting the
// function, and nothing else: thirteen comment lines directly above the
// declaration.
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
  ok(DOC_FIRST_LINE.endsWith(' the'),
    '…whose first sentence runs on past its first line, so the second opening is mid-sentence');
  ok(doc.indexOf('Pure (no globals): fully unit-testable.') >= 0,
    '…and which claims the function is pure, a claim §3 and §7 measure rather than trust');
}
// WHAT LEAVING IT WOULD HAVE STRANDED. Cutting at the declaration (the one opening the
// screen visits) would have left the thirteen comment lines behind, fused to the
// next function's documentation with no blank line between them.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + '// ' + NEXT_DECL + ' —') >= 0,
    'cutting at the declaration would leave the documentation fused to the next function\'s own');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(clean.indexOf(BLANK_AFTER_CUT), RAW_AT_IN_CODE - 3,
    'while the cut that shipped left the previous function\'s closing brace, exactly one blank '
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
    '…a function, so this layer ships no mutable binding');
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
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in, and it is CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call site');
eq(REC.sites, [CONSUMER_SITE_AT], '…at CONSUMER_SITE_AT');
eq(CODE.slice(CONSUMER_SITE_AT - '_apexPortfolioGreeksRefreshDiag.greeksFreshness = '.length, CONSUMER_SITE_AT),
  '_apexPortfolioGreeksRefreshDiag.greeksFreshness = ',
  '…assigning the returned block into the refresh diagnostics, which is all the consumer does with it');
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.end < RAW_AT_IN_CODE || keeper.start > RAW_END_IN_CODE, '…which sits outside the cut');
  ok(CONSUMER_SITE_AT > keeper.start && CONSUMER_SITE_AT < keeper.end, '…and the site is inside its body');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and NO foundation module either: FOUNDATION_OUTBOUND');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, the best score there is');
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
// THE SCAN THIS FILE INHERITED WAS WRONG HERE, and it was the scan, not the
// function. It treats only the first name of a `var` list as local, so
// `var source = null, topN = -1;` leaves `topN` reading as a global being
// written. Both hits are measured below, then the corrected scan, which reads
// every declarator. A zero from either needs a control that finds a violation.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignments to names it takes for globals…');
  eq(nonLocalAssignmentsUncorrected(BODY), ['topN', 'topN'], '…both to topN…');
  ok(/var source = null, topN = -1;/.test(BODY), '…which the body declares in a comma-separated var list');
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
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the floor hid the score-1 tier');
// ─────────────────────────────────────────────────────────────────────────────
// THE SHIPPED SCREEN STILL COUNTS NOTHING AT 1 — the previous audit was right
// about the screen. What it could not say is that the screen is the monolith.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  const num = (name) => Number(prev.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
  eq(num('SCORE_ONE_TIER'), SCORE_ONE_TIER, 'the previous contract counted SCORE_ONE_TIER clean candidates at 1 on the screen…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    '…and the shipped screen still counts SCORE_ONE_TIER at this base');
  ok(prev.indexOf("THE SHIPPED SCREEN'S SCORE-1 TIER WAS EMPTY") >= 0 && prev.indexOf('THE SCORE-1 TIER WAS EMPTY') < 0,
    '…and the previous contract\'s wording now scopes that claim to the screen, which is what this pass found it needed');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidates at 2');
  // The previous contract's runners-up survive the cut that left, the later ones
  // moved up by its raw length, and they are the screen's top three again.
  eq(num('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(num('RAW_END_IN_CODE'), PREVIOUS_RAW_END, '…ending at PREVIOUS_RAW_END');
  const listed = prev.match(/^const RUNNERS_UP = \[([\s\S]*?)^\];/m)[1]
    .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
    .map((l) => JSON.parse(l.replace(/,$/, '')));
  const survivors = listed.filter(([lo]) => lo >= PREVIOUS_RAW_END || lo < num('RAW_AT_IN_CODE'))
    .map(([lo, nine, units]) => [lo >= PREVIOUS_RAW_END ? lo - PREVIOUS_RAW_CHARS : lo, nine, units]);
  eq(listed.length - survivors.length, 1, 'of the runners-up it published exactly one was the cut itself…');
  const screenTop = (() => {
    const byLo = new Map();
    for (const c of cleanRuns.filter((x) => byConsumerSplit(x.p, x.split) === 2)) {
      const b = byLo.get(c.lo);
      if (!b || c.p.nine < b.p.nine || (c.p.nine === b.p.nine && c.units > b.units)) byLo.set(c.lo, c);
    }
    return [...byLo.values()].sort((a, b) => a.p.nine - b.p.nine || a.units - b.units)
      .slice(0, 4).map((c) => [c.lo, c.p.nine, c.units]);
  })();
  eq(screenTop.slice(0, survivors.length), survivors,
    '…and the others, moved up by its raw length where they sat after it, are exactly the screen\'s top three now');
}
// THE PASS THE FLOOR HIDES.
{
  eq(hiddenRows.length, HIDDEN_ROWS, 'the pass over runs the screen skipped for being short has HIDDEN_ROWS rows…');
  const hiddenClean = hiddenRows.filter((c) => runsNothingAtLoad(c.load));
  eq(hiddenClean.length, HIDDEN_CLEAN_ROWS, '…HIDDEN_CLEAN_ROWS of which run nothing at load');
  ok(hiddenRows.every((c) => c.unitsDecl < RUN_FLOOR && c.unitsDoc >= RUN_FLOOR),
    '…every one below RUN_FLOOR from its declaration and at or above it from its documentation');
  ok(hiddenRows.every((c) => !candidateRuns.some((s) => s.lo === c.lo && s.hi === c.hi)),
    '…and not one of them is a row the shipped screen already has');
  eq(hiddenClean.filter((c) => c.bcs <= 1).length, HIDDEN_SCORE_ONE,
    'HIDDEN_SCORE_ONE of them score 1 on byConsumerSplit…');
  eq(hiddenClean.filter((c) => c.bcs === 2).length, HIDDEN_SCORE_TWO, '…and HIDDEN_SCORE_TWO score 2');
  eq(hiddenClean.filter((c) => c.bcs <= 1).sort((a, b) => a.nine - b.nine || a.lo - b.lo || a.hi - b.hi)
    .map((c) => [c.lo, c.hi, c.unitsDecl, c.unitsDoc, c.nine, c.bcs, c.p.names]),
  HIDDEN_SCORE_ONE_ROWS,
  '…and those are exactly HIDDEN_SCORE_ONE_ROWS: the shipped screen\'s score-1 tier was not empty, it was blind');
  // The cut is the first of them, and the tie is stated, not hidden.
  eq(HIDDEN_SCORE_ONE_ROWS[0].slice(0, 2), [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    'the first of those rows IS the cut that shipped');
  const best = hiddenClean.filter((c) => c.bcs === 1 && c.nine === FULL_NINE);
  eq(new Set(best.map((c) => c.lo)).size, 2,
    'TWO distinct openings tie at the best score there is, byConsumerSplit 1 and raw nine ' + FULL_NINE + '…');
  ok(best.every((c) => c.p.deps.length === 0 && consumersOf(c.p).length === 1),
    '…each with one consumer and no dependency, so the coupling measures do not separate them');
  const sized = best.map((c) => c.unitsDoc).sort((a, b) => b - a);
  eq(sized[0], BODY_CHARS, '…and the cut took the LARGER of the two, a size tie-break stated as one');
  ok(sized[0] > sized[1], '…strictly larger, so the tie-break decides');
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
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would have cost: the owners above, the owners below, the region');
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
for (const [name, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const d = BY_NAME.get(name);
  const hb = snapBodyEnd(CODE, RAW_AT_IN_CODE, d.end + 5);
  const hr = assertSeam(CODE, RAW_AT_IN_CODE, hb);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq([hr - RAW_AT_IN_CODE, p.nine, byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), p.deps.length],
    [units, nine, bcs, deps], 'running the cut down through ' + name + ' costs the pinned units, nine, byConsumerSplit and dependencies');
  ok(runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb)), '…a run that also runs nothing at load');
  ok(bcs > BY_CONSUMER_SPLIT, '…and is worse on byConsumerSplit');
}
eq(EXTENSIONS_DOWN[0][0], NEXT_DECL, 'the first owner below is the very next declaration, NEXT_DECL');
{
  const hb = snapBodyEnd(CODE, RAW_AT_IN_CODE, BY_NAME.get(NEXT_DECL).end + 5);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq(consumersOf(p), ['(TOP LEVEL)', CONSUMER], 'running the cut down through it adds a consumer the screen files under TOP LEVEL…');
  const topSite = p.sites.filter((at) => !hostOf(at))[0];
  ok(/window\.apexDebugPortfolioPrices = function\(\) \{/.test(CODE.slice(topSite - 900, topSite)),
    '…which is the body of an anonymous debug getter assigned to window, called on demand and not at load');
}
eq(EXTENSIONS_DOWN[0][3], BY_CONSUMER_SPLIT + 1,
  '…taking it costs exactly one point: an anonymous debug getter that the screen counts as a consumer at TOP LEVEL');
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
    '…this function being owner number OWNER_POSITION of them, in the middle');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…with OWNER_BEFORE immediately above it');
  eq(own[OWNER_POSITION].name, NEXT_DECL, '…and NEXT_DECL immediately below');
  ok(reg.end > RAW_END_IN_CODE, '…so unlike the layer before, the cut does NOT close its region');
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
section('7. It loads bare, is pure, and returns plain data');
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
  // THE SHIPPED MODULE is what loads here, not a slice of the reconstructed
  // monolith: §9 proves the two are the same bytes.
  vm.runInContext(MODULE, ctx);
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM and declares exactly its one owner');
  // A VM-REALM RESULT is compared through JSON, never directly: its prototypes
  // belong to the VM's own realm, so a strict deep-equal against a host object
  // fails even when every field matches.
  const call = (...args) => JSON.parse(JSON.stringify(vm.runInContext(VM_GLOBALS[0], ctx).apply(null, args)));
  const EMPTY = { source: null, marketSessionStatus: null, greeksStale: false, greeksStaleExpected: false,
    quoteResolved: null, greeksResolved: null, lastUpdatedAt: null };
  eq(call(), EMPTY, 'with no arguments at all it returns the all-empty block, without needing any global');
  eq(call({ marketSessionStatus: 'closed', staleGreeksCount: '3', greeksStaleExpected: true, quoteResolved: '5', greeksResolved: 4 },
    'open', { sources: { dxlink: 3, backend: 7 }, lastUpdatedAt: '2026-01-02T03:04:05Z' }),
  { source: 'backend', marketSessionStatus: 'closed', greeksStale: true, greeksStaleExpected: true,
    quoteResolved: 5, greeksResolved: 4, lastUpdatedAt: '2026-01-02T03:04:05Z' },
  'a full call picks the dominant source, prefers the diagnostics\' session status, and parses the counts');
  eq(call({}, 'open', {}).marketSessionStatus, 'open', 'the fallback session status is used when the diagnostics carry none');
  eq(call({ staleGreeksCount: '0' }).greeksStale, false, 'a stale count of zero is not stale…');
  eq(call({ staleGreeksCount: 'x', greeksStaleExpected: 'yes' }).greeksStale, false, '…nor is an unparseable one…');
  eq(call({ staleGreeksCount: 'x', greeksStaleExpected: 'yes' }).greeksStaleExpected, false,
    '…and "expected" is true only for the boolean true, not for a truthy string');
  eq(call({}, null, { sources: { a: 2, b: 2 } }).source, 'a', 'a tie between sources goes to the first key');
  eq(call({ quoteResolved: null, greeksResolved: 'abc' }, null, null),
    EMPTY, 'null counts and an unparseable count come back null, and a null refresh diagnostic is tolerated');
  eq(call(), call(), 'two identical calls return identical blocks: it is deterministic…');
  const input = { sources: { x: 1 } };
  const before = JSON.stringify(input);
  vm.runInContext(VM_GLOBALS[0], ctx)({}, null, input);
  eq(JSON.stringify(input), before, '…and it leaves its argument untouched');
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(), '…and defines no global when called');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Where this layer sits, and what it changed');
// ─────────────────────────────────────────────────────────────────────────────
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
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes.filter((u) => u < BODY_CHARS), SMALLER_LAYERS, 'the layers smaller than this one are exactly SMALLER_LAYERS…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK, '…so it ranks SIZE_RANK by size');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in,
  // rather than being left to make the total drift by one forever.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  eq(sizes[SIZE_RANK - 1], BODY_CHARS, '…this layer occupying that slot itself');
  // THE TWO CHAIN-WIDE SHAPE COUNTS, over the whole chain AND over the chain
  // before this layer. The audit forecast that NEITHER would move; "did not
  // move" is asserted as a comparison between two measurements rather than
  // carried forward as a number.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII');
  eq(prior.filter(ascii).length, PURE_ASCII_LAYERS,
    '…the same count before this layer, because this module is NOT pure ASCII…');
  ok(!ascii(MODULE), '…asserted of the module directly, not inferred: it holds em dashes');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  eq(prior.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…the same count before this layer, because this module does NOT open on one');
  ok(!banner(MODULE), '…asserted of the module directly: it opens on its documentation');
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
  // THE AUDIT ASSERTED THAT NOTHING MOVED. The phase that shipped this layer
  // moved exactly the audited bytes and nothing else, so the claim is inverted
  // rather than dropped. It now reads against a base that a LATER layer has also
  // moved past, so the footprint is the document, this layer's module, and the
  // module of every layer cut after it.
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-underlying-fallback-plan.js',
      'js/portfolio/portfolio-price-freshness.js', 'js/portfolio/portfolio-missing-underlyings-gate.js'].sort(),
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
    '…and OPENS on the documentation, DOC_FIRST_LINE, the boundary §2 defends');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * EM_DASHES,
    '…its UTF-8 length exceeding its UTF-16 length by the two bytes each of its em dashes costs');
}
// THE LOAD ORDER. This function needs nothing from the monolith (§7 loads and
// calls it in a bare VM), so the tag's position is not load-bearing for it. It
// is pinned all the same: last of the local scripts, immediately before the
// inline monolith, whose single call site stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/ui/rs-skip-breakdown-html.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, which calls it, the very next script');
  }
  eq(count(LIVE_MONOLITH, 'function ' + OWNERS_EXPECTED[0]), 0,
    'the declaration has left the monolith…');
  eq((LIVE_MONOLITH.match(/\b_portfolioGreeksFreshness\(/g) || []).length, CONSUMER_SITES,
    '…leaving exactly CONSUMER_SITES call site behind');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its one owner and nothing else');
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
  const E = 'PORTFOLIO_GREEKS_FRESHNESS_UNDO_';
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 2,034 units, not 2,033 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('staleCount > 0', 'staleCount > 1');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned because this module is NOT pure ASCII: swapping
    // a 3-byte em dash for a 2-byte letter keeps the length and the line-feed
    // count and moves only the byte length.
    const narrowed = MODULE.replace('—', 'é');
    eq(narrowed.length, MODULE.length, 'control — the narrowed module has the same UTF-16 length');
    eq(Buffer.byteLength(MODULE, 'utf8') - Buffer.byteLength(narrowed, 'utf8'), 1,
      '…and is one UTF-8 byte shorter');
    throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX, narrowed),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoPortfolioGreeksFreshness(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoPortfolioGreeksFreshness(INDEX, MODULE),
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
console.log('GREEKS_FRESHNESS_CONTRACT_OK');
}

main();
