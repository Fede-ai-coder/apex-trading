'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// RS SKIP BREAKDOWN — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [336476,338277) in monolith coordinates — 1,801 units raw and
// 1,800 of body, ONE owner, a synchronous function — now live in
// js/ui/rs-skip-breakdown-html.js. `rsbSkipBreakdownHtml` builds the "SKIPPED
// BREAKDOWN" block of the RS scanner panel as an HTML string: the skip reasons
// with their counts, a note on whether the SPY benchmark is cached, and the near
// misses with their signed scores. The first 109 units are the two comment lines
// that document it.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #484 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: THE SHIPPED SCREEN'S SCORE-1 TIER WAS EMPTY ─────
//
// The contract before this one counted exactly one clean candidate at
// byConsumerSplit 1, and that candidate had shipped. §4 reads the count out of
// that contract and counts the tier again on the reconstructed base: the SHIPPED
// SCREEN found nothing at 1 or below. That is a claim about the screen, not about
// the monolith: the screen floors a run at RUN_FLOOR units measured from the
// DECLARATION, so a function whose documentation lifts it over the floor was
// never enumerated, and the audit that followed this layer counted three such
// candidates at 1. The best score the screen found was 2, and this function was
// the only candidate in the whole screen with a raw nine below 3. It was also the
// first runner-up the previous contract published, at the same offset because it
// sits before the cut that left. The other three survive that cut too, one of
// them moved up by its raw length, and §4 asserts all four.
//
// ── PART TWO: WHAT THE 2 IS MADE OF ────────────────────────────────────────
//
// One consumer, `rsbMaybeRenderBackendRs`, at one call site, and ONE monolith
// dependency, `escHtml`: a global function declaration that other local scripts
// already reference, which §3 counts. What it changes is the failure
// mode. The previous layer swallowed every missing foundation into a returned
// object, so its load order was the only guard. This function has no `try`:
// without `escHtml` it throws a ReferenceError, and §7 runs the success path and
// that throw. §9 pins where the tag sits all the same — after every other local
// script and immediately before the inline monolith that declares `escHtml`.
//
// ── PART THREE: THE BOUNDARY IS A JUDGEMENT, IN A NEW SHAPE ────────────────
//
// Between the previous function's closing brace and the declaration the seam
// accepts FOUR line starts. One is that brace and is not valid JavaScript; the
// other three parse: the documentation, its second line, and the declaration.
// The screen visits only the declaration. The second line begins in the middle
// of a sentence, and cutting at the declaration would have left the documentation
// behind, directly above the next feature's banner. The cut opens on the
// documentation, and §2 measures both consequences instead of asserting them.
//
// ── PART FOUR: THE CUT CLOSES ITS REGION ───────────────────────────────────
//
// It was the last of fourteen owners in the "RS snapshot diagnostics" banner
// region, and the region ended exactly where the cut does. Taking more is priced
// in §5 and lost on every axis: the three owners above it, the consumer, and the
// whole region.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// SECOND smallest of the forty-five layers the chain now holds, displacing the
// 1,852-unit layer into third. §8 asserts the rank by measurement. The
// documentation decides it: the declaration alone, which is the row the screen
// scores, would have been the smallest of all. Neither chain-wide shape count
// moved, since this module contains an em dash and opens on a comment.
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
const PORTFOLIO_PRICE_FRESHNESS_U = require('./lib/portfolio-price-freshness-undo.js');
const PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U = require('./lib/portfolio-underlying-fallback-plan-undo.js');
const PORTFOLIO_GREEKS_FRESHNESS_U = require('./lib/portfolio-greeks-freshness-undo.js');
const UNDO = require('./lib/rs-skip-breakdown-html-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while
// the cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/ui/rs-skip-breakdown-html.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '88f6370';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = '6d48268';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '56e8b37';
const BASE_CHARS = 1452898;
const BASE_UTF8 = 1481465;
const BASE_LF = 25121;
const BASE_SHA256 = '4ae28fcadc38ec40b2d494ef2818d3231113975fed734610393801046f5b9e99';
const LOCAL_SCRIPTS = 88;
const TEST_FILE_COUNT = 177;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-rs-skip-breakdown-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/rs-skip-breakdown-audit.spec.js';
const CONTRACT_REL = 'tests/rs-skip-breakdown-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/rs-skip-breakdown-contract.spec.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = '6d48268';
const CONTRACT_SPEC_MUTANTS = 133;
const UNDO_REL = 'tests/lib/rs-skip-breakdown-html-undo.js';
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 39;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/portfolio-technical-batch-fetch-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 134;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the
// outgoing contract's spec went in Phase 1, which is the rhythm. §10 asserts
// the arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/rs-skip-breakdown-audit.spec.js';
const RETIRED_MUTANTS = 128;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115210;
const CODE_CHARS = 1337662;
const TOP_LEVEL_DECLS = 916;
const OWNER_REGIONS = 118;

// ── The region ───────────────────────────────────────────────────
// It opens on the two-line comment that documents the function, not on the
// declaration the screen enumerates.
const RAW_AT_IN_CODE = 336476;
const DECL_AT_IN_CODE = 336585;
const RAW_END_IN_CODE = 338277;
const BODY_END_IN_CODE = 338276;
const RAW_CHARS = 1801;
const BODY_CHARS = 1800;
const BODY_UTF8 = 1802;
const BODY_LF = 25;
const BODY_SHA256 = '484c7d2efd815a2af9cb691eb352fca88a4c8554132cfb887be7d0d3972a7326';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// Detailed skip-reason breakdown + near-miss list for the panel (replaces the';
const DOC_SECOND_LINE = '// generic "N skipped" note).';
const DECL_FIRST_LINE = 'function rsbSkipBreakdownHtml(breakdown,nearMisses,spyStatus){';
const NEXT_DECL = '_rsbBenchWarmAt';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['rsbSkipBreakdownHtml'];
const OWNER_SIZES = [1690];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 25;
const CODE_LINES = 23;
const COMMENT_LINES = 2;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the closing brace of the previous function and the declaration the
// seam accepts FOUR line starts. One is that closing brace and is not valid
// JavaScript; the other three parse. The screen visits only the last.
const OPENINGS = [336474, 336476, 336555, 336585];
const MID_LINE_OPENING = 336475;
const BRACE_OPENING = 336474;
const SECOND_DOC_LINE_OPENING = 336555;
const SEAM_LEGAL_OPENINGS = 4;
const PARSING_OPENINGS = 3;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 109;
const DOC_TAKEN_LINES = 2;
const CANDIDATES_AT_DECLARATION = 1;
const BANNER_AFTER_PREFIX = '// ── SPY benchmark rewarm';

// ── The banner region it closes ──────────────────────────────────────────────
const REGION_AT = 328091;
const REGION_END = 338277;
const REGION_CHARS = 10186;
const REGION_OWNERS = 14;
const OWNER_POSITION = 14;
const OWNER_BEFORE = 'rsbBuildDiag';
const BANNER_LINE_PREFIX = '// ── RS snapshot diagnostics';
const WHOLE_REGION_NINE = 15;
const WHOLE_REGION_BCS = 7;
const WHOLE_REGION_CONSUMERS = 2;
const WHOLE_REGION_DEPS = 5;
const WHOLE_REGION_SIB = 0;

// ── Taking more, priced: the three owners immediately above, then the consumer ─
// [name of the first owner taken, opening, units to the cut's raw end, raw
// nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS = [
  ['_rsScanDiagLogState', 332798, 5479, 10, 7, 6],
  ['_rsScanDiagLogKey', 332866, 5411, 12, 9, 7],
  ['rsbBuildDiag', 333725, 4552, 13, 10, 8],
];
const CONSUMER_RUN_AT = 322676;
const CONSUMER_RUN_UNITS = 15601;
const CONSUMER_RUN_NINE = 24;
const CONSUMER_RUN_BCS = 22;
const CONSUMER_END = 327436;
const CONSUMER_CHARS = 4761;
const CONSUMER_GAP_TO_REGION = 655;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 2;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = 'rsbMaybeRenderBackendRs';
const CONSUMER_SITES = 1;
const CONSUMER_SITE_AT = 324453;
const MONOLITH_DEPENDENCIES = ['escHtml'];
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
// escHtml, the one dependency: a monolith function declaration that other
// local scripts already reference.
const ESC_HTML = 'escHtml';
const ESC_HTML_CHARS = 134;
const ESC_HTML_USERS = 11;
const ESC_HTML_CHAIN_USERS = 7;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['rsbSkipBreakdownHtml'];
const ESCAPED_CALLS = 8;
const OUTPUT_CHARS = 1245;
const MISSING_ESC_ERROR = 'escHtml is not defined';

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7337;
const SEAM_REJECTED = 2048;
const CANDIDATES = 2992;
const CLEAN_CANDIDATES = 1834;
const SCORE_ONE_TIER = 0;
const PREVIOUS_SCORE_ONE_TIER = 1;
const SCORE_TWO = 15;
const SCORE_TWO_OPENINGS = 13;
const LOWEST_RAW_NINE = 2;
const LOWEST_RAW_NINE_COUNT = 1;
const RAW_NINE_AT_MOST_THREE = 7;
// The four best openings at score 2, by (nine, units): [opening, nine, units].
const RUNNERS_UP = [
  [336585, 2, 1691],
  [1148674, 3, 2382],
  [781085, 3, 2686],
  [61214, 3, 3034],
];
const PREVIOUS_RAW_CHARS = 1853;
const PREVIOUS_RAW_END = 940102;

// ── Where it sits ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 45;
const SMALLEST_LAYER_CHARS = 1761;
const DISPLACED_LAYER_CHARS = 1852;
const LARGEST_LAYER_CHARS = 71811;
const SIZE_RANK = 2;
const LAYERS_LARGER_THAN_THIS_CUT = 43;
const DECLARATION_ONLY_CHARS = 1691;
const PURE_ASCII_LAYERS = 3;
const LAYERS_OPENING_ON_BANNER = 23;

// ── What the relocation cost the document ───────────────────────────────────────────────────────────────────
const NET_REDUCTION = 1743;
const INDEX_AFTER = 1451155;
const RESIDUAL_MONOLITH = 1335861;
const LOCAL_SCRIPTS_AFTER = 89;
// The tag's position among the local scripts, zero-based: the last of 89.
const TAG_LOCAL_INDEX = 88;

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


console.log('RS SKIP BREAKDOWN — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_PORTFOLIO_PRICE_FRESHNESS = PORTFOLIO_PRICE_FRESHNESS_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_PRICE_FRESHNESS_U.undoPortfolioPriceFreshness(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-price-freshness.js'), 'utf8'))
  : HEAD_INDEX;
const PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN = PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.isApplied(PRE_PORTFOLIO_PRICE_FRESHNESS)
  ? PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.undoPortfolioUnderlyingFallbackPlan(
      PRE_PORTFOLIO_PRICE_FRESHNESS, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-underlying-fallback-plan.js'), 'utf8'))
  : PRE_PORTFOLIO_PRICE_FRESHNESS;
const LIVE_INDEX = PORTFOLIO_GREEKS_FRESHNESS_U.isApplied(PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN)
  ? PORTFOLIO_GREEKS_FRESHNESS_U.undoPortfolioGreeksFreshness(
      PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-greeks-freshness.js'), 'utf8'))
  : PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX, MODULE);
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

// A direct scan for assignment to anything the text does not own, kept apart
// from profile() so the outbound direction is measured twice by two different
// means. A metric whose true value is zero needs a control on an input where
// the answer differs, so this function is also run on a planted violation.
function nonLocalAssignmentsIn(text) {
  const masked = maskLiterals(text);
  const local = locallyBound(text);
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the
// technical batch fetch predicted both the document and the residual monolith
// this contract measures, so the two cycles are joined by numbers.
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
section('2. The region, its seam, and the four openings the seam admits');
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
  ok(CODE.slice(RAW_END_IN_CODE).startsWith(BANNER_AFTER_PREFIX),
    '…reached across a `// ── ` banner: the cut ends on the last line before one');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits more than one opening.
{
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS, 'SEAM_LEGAL_OPENINGS openings are measured');
  for (const at of OPENINGS) {
    eq(assertSeam(CODE, at, BODY_END_IN_CODE), RAW_END_IN_CODE,
      'assertSeam accepts the opening at ' + at + ', so the seam does not decide');
  }
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    'while the one position in between, which starts mid-line, is refused with its own error');
  // WHICH OF THE FOUR IS A MODULE? Parse each as a standalone script, which is
  // what loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the previous function\'s closing brace does NOT parse: BRACE_OPENING_ERROR');
  eq(CODE.slice(BRACE_OPENING, RAW_AT_IN_CODE), '}\n',
    '…the two units above the documentation being exactly that brace and its line feed');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the four are even candidates, counted rather than listed in this sentence');
  eq(OPENINGS.filter((at) => parses(at) === null),
    [RAW_AT_IN_CODE, SECOND_DOC_LINE_OPENING, DECL_AT_IN_CODE],
    '…and they are the documentation, its second line, and the declaration');
}

// WHAT THE CUT TAKES is the paragraph documenting the function, and
// nothing else: two comment lines directly above the declaration.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(DECL_AT_IN_CODE - RAW_AT_IN_CODE, DOC_TAKEN, '…the declaration opening that far below the cut');
  eq(doc.split('\n').filter(Boolean), [DOC_FIRST_LINE, DOC_SECOND_LINE],
    '…exactly DOC_TAKEN_LINES lines');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…counted, not only listed');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  ok(doc.indexOf('skip-reason breakdown') >= 0,
    '…and it documents this function, which is why it belongs with the cut');
  // The sentence runs across both lines, so the SECOND opening would begin
  // mid-sentence — a module that opens on "generic ... note)." with its subject
  // left behind. Control: the first line ends on the word that continues.
  ok(DOC_FIRST_LINE.endsWith(' the'), 'the first line ends on "the", mid-sentence…');
  eq(firstLineOf(CODE.slice(SECOND_DOC_LINE_OPENING)), DOC_SECOND_LINE,
    '…so the opening at SECOND_DOC_LINE_OPENING would begin on the sentence\'s tail');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
}
// WHAT LEAVING IT WOULD STRAND. Cutting at the declaration (the one opening the
// screen visits) would leave the documentation behind, now directly above a
// banner for a different feature; the cut that shipped leaves nothing orphaned.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(DOC_FIRST_LINE + '\n' + DOC_SECOND_LINE + '\n' + BANNER_AFTER_PREFIX) >= 0,
    'cutting at the declaration would leave the two comment lines directly above the next banner');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(clean.indexOf(DOC_FIRST_LINE) < 0 && clean.indexOf(DOC_SECOND_LINE) < 0,
    '…while the cut that shipped left neither line behind');
  ok(clean.indexOf('}\n' + BANNER_AFTER_PREFIX) === RAW_AT_IN_CODE - 2,
    '…the previous function\'s closing brace then meeting the banner directly');
}
// THE SCREEN SEES ONLY ONE OF THE FOUR. It opens runs only at a region start or
// a declaration start.
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE || c.lo === SECOND_DOC_LINE_OPENING
  || c.lo === BRACE_OPENING).length, 0,
'the screen enumerates NONE of the three openings above the declaration…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).length, CANDIDATES_AT_DECLARATION,
  '…and enumerates CANDIDATES_AT_DECLARATION run opening on the declaration');
eq(cleanRuns.filter((c) => c.lo === DECL_AT_IN_CODE).length, CANDIDATES_AT_DECLARATION,
  '…which runs nothing at load');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one dependency, and both directions measured');
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
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'and the ninth is the whole of what makes this a 2: ONE monolith dependency, MONOLITH_DEPENDENCIES');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in, and it is CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call site');
eq(REC.sites, [CONSUMER_SITE_AT], '…at CONSUMER_SITE_AT');
ok(/^var breakdownHtml=rsbSkipBreakdownHtml\(/.test(CODE.slice(CONSUMER_SITE_AT - 'var breakdownHtml='.length)),
  '…assigning the result to a variable the consumer renders, so the HTML string is what crosses');
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.end < RAW_AT_IN_CODE, '…which sits BEFORE the cut, not beside it');
  eq(keeper.start, CONSUMER_RUN_AT, '…opening at CONSUMER_RUN_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
  eq(REGION_AT - keeper.end, CONSUMER_GAP_TO_REGION,
    '…CONSUMER_GAP_TO_REGION units short of the banner region the function closes');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and NO foundation module either: FOUNDATION_OUTBOUND');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, the metric this programme ranks on');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE ONE DEPENDENCY, measured as what it is: a function declaration in the
// monolith, referenced by other local scripts already. The cut therefore adds a
// reference of a kind the chain already carries.
{
  const esc = BY_NAME.get(ESC_HTML);
  ok(esc !== undefined && esc.start > RAW_END_IN_CODE, ESC_HTML + ' is declared in the monolith, AFTER the cut');
  eq(esc.form, 'function', '…as a function declaration, so it is a global the moment the monolith runs');
  eq(esc.chars, ESC_HTML_CHARS, '…ESC_HTML_CHARS units long');
  eq(OWNER_KIND.get(ESC_HTML), undefined, '…and owned by NO local module');
  const users = SIBLINGS.filter((s) => !s.bound.has(ESC_HTML)
    && /(^|[^.\w$])escHtml\b/.test(s.masked)).map((s) => s.rel);
  eq(users.length, ESC_HTML_USERS, 'ESC_HTML_USERS local scripts already reference it');
  eq(users.filter((rel) => CHAIN_SET.has(rel)).length, ESC_HTML_CHAIN_USERS,
    '…ESC_HTML_CHAIN_USERS of them chain layers, so this was not the first');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
{
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'a direct scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the body does not own…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document');
  // CONTROLS: the same two functions DO find a planted violation, so a zero from
  // them is a measurement and not a function that returns zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1; leaked = 2; g.x = 3; a = 4; }'), ['leaked', 'g'],
    'control — the scan finds a plain write and a property write, and ignores a local');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the shipped screen\'s score-1 tier is empty, and one candidate leads the next');
// ─────────────────────────────────────────────────────────────────────────────
// THE PREVIOUS CONTRACT COUNTED ONE CLEAN CANDIDATE AT 1, read out of it.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  const num = (name) => Number(prev.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
  eq(num('ONE_CONSUMER_SPLIT'), PREVIOUS_SCORE_ONE_TIER,
    'the previous contract counted PREVIOUS_SCORE_ONE_TIER clean candidate at byConsumerSplit 1…');
  ok(fs.existsSync(path.join(ROOT, prev.match(/^const MODULE_REL = '([^']+)';$/m)[1])),
    '…and that candidate has SHIPPED, so nothing is left at 1 for want of being taken');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the SHIPPED screen counts SCORE_ONE_TIER clean candidates at 1 or below — a statement about the screen, whose floor is measured on the declaration alone');
  ok(SCORE_ONE_TIER < PREVIOUS_SCORE_ONE_TIER, '…down from the previous contract\'s count');
  // THE FOUR RUNNERS-UP IT PUBLISHED SURVIVE THE CUT THAT LEFT, shifted by its
  // raw length where they sat after it. Read, not recalled.
  eq(num('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(num('RAW_END_IN_CODE'), PREVIOUS_RAW_END, '…ending at PREVIOUS_RAW_END');
  const listed = prev.match(/^const RUNNERS_UP = \[([\s\S]*?)^\];/m)[1]
    .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
    .map((l) => JSON.parse(l.replace(/,$/, '')));
  eq(listed.length, RUNNERS_UP.length, 'it published as many runners-up as this contract does…');
  eq(listed.map(([lo, nine, units]) => [lo >= PREVIOUS_RAW_END ? lo - PREVIOUS_RAW_CHARS : lo, nine, units]),
    RUNNERS_UP, '…and, with each offset after that cut moved up by its raw length, they are exactly RUNNERS_UP');
  eq(listed[0][0], DECL_AT_IN_CODE,
    '…the first being this function, published at the same offset because it sits before that cut');
  ok(listed[0][0] < num('RAW_AT_IN_CODE'), '…which is why its offset did not move');
}
{
  // THE CANDIDATE LEADS THE NEXT TIER ON THE RAW NINE, uniquely.
  const nines = cleanRuns.map((c) => c.p.nine);
  eq(Math.min(...nines), LOWEST_RAW_NINE, 'the lowest raw nine among ALL clean candidates is LOWEST_RAW_NINE…');
  eq(nines.filter((n) => n === LOWEST_RAW_NINE).length, LOWEST_RAW_NINE_COUNT,
    '…held by LOWEST_RAW_NINE_COUNT candidate…');
  eq(cleanRuns.filter((c) => c.p.nine === LOWEST_RAW_NINE).map((c) => c.lo), [DECL_AT_IN_CODE],
    '…which is this one');
  eq(nines.filter((n) => n <= 3).length, RAW_NINE_AT_MOST_THREE,
    '…and RAW_NINE_AT_MOST_THREE candidates in all score 3 or better on it, counted');
  const two = cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2);
  eq(two.length, SCORE_TWO, 'SCORE_TWO clean candidates sit at 2, the best score there is now…');
  const byLo = new Map();
  for (const c of two) {
    const b = byLo.get(c.lo);
    if (!b || c.p.nine < b.p.nine || (c.p.nine === b.p.nine && c.units > b.units)) byLo.set(c.lo, c);
  }
  eq(byLo.size, SCORE_TWO_OPENINGS, '…over SCORE_TWO_OPENINGS distinct openings');
  const ranked = [...byLo.values()].sort((a, b) => a.p.nine - b.p.nine || a.units - b.units).slice(0, RUNNERS_UP.length);
  eq(ranked.map((c) => [c.lo, c.p.nine, c.units]), RUNNERS_UP,
    'the four best openings at score 2, by (nine, then units), are exactly RUNNERS_UP');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would have cost: the owners above, the consumer, the region');
// ─────────────────────────────────────────────────────────────────────────────
// THE OWNERS IMMEDIATELY ABOVE are the only extension within reach: nothing in
// the region follows the cut. Each is a run the screen enumerates, anchored by
// assertSeam rather than left to arithmetic.
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS) {
  const row = candidateRuns.filter((c) => c.lo === lo && c.hi === BODY_END_IN_CODE)[0];
  ok(row !== undefined, 'the run from ' + name + ' to the cut is a screen row');
  eq(BY_NAME.get(name).start, lo, '…opening on that declaration');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  eq([row.units + 1, row.p.nine, byConsumerSplit(row.p, row.split), row.p.deps.length], [units, nine, bcs, deps],
    '…units, raw nine, byConsumerSplit and dependency count are as pinned');
  ok(runsNothingAtLoad(row.load), '…and it too runs nothing at load, so the screen does enumerate it');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT && deps > MONOLITH_DEPENDENCIES.length,
    '…strictly worse than the cut on every axis this programme ranks by');
}
{
  // The strictly-worse claim over the WHOLE chain of three extensions, not the
  // last one: each step up adds more than it removes.
  eq(EXTENSIONS.every((e, i) => i === 0 || (e[3] > EXTENSIONS[i - 1][3] && e[4] > EXTENSIONS[i - 1][4])), true,
    'each further owner taken raises the raw nine and byConsumerSplit again, so no stopping point is better');
}
// THE CONSUMER is not adjacent, so taking it means taking everything between.
// That run spans two banner regions, which the screen never enumerates, so it is
// profiled directly over the same bounds.
{
  const p = profileOf([CONSUMER_RUN_AT, RAW_END_IN_CODE]);
  const sp = outboundSplit(CONSUMER_RUN_AT, RAW_END_IN_CODE);
  eq(assertSeam(CODE, CONSUMER_RUN_AT, BODY_END_IN_CODE), RAW_END_IN_CODE, 'the run from the consumer to the cut is at a real seam');
  ok(candidateRuns.filter((c) => c.lo === CONSUMER_RUN_AT).length > 0
    && candidateRuns.filter((c) => c.lo === CONSUMER_RUN_AT && c.hi === BODY_END_IN_CODE).length === 0,
    '…and NOT a screen row: runs open there, but none reaches the cut, because it crosses a banner region');
  eq([RAW_END_IN_CODE - CONSUMER_RUN_AT, p.nine, byConsumerSplit(p, sp)],
    [CONSUMER_RUN_UNITS, CONSUMER_RUN_NINE, CONSUMER_RUN_BCS],
    '…CONSUMER_RUN_UNITS units, scoring CONSUMER_RUN_NINE on the raw nine and CONSUMER_RUN_BCS on byConsumerSplit');
  ok(runsNothingAtLoad(loadTimeProfile(CONSUMER_RUN_AT, BODY_END_IN_CODE)), '…and it too runs nothing at load');
  ok(CONSUMER_RUN_BCS > BY_CONSUMER_SPLIT, '…so taking the consumer is not a refinement of this cut but a different one');
}
// THE BANNER REGION IT CLOSES. Taking all of it is what "never cut inside a
// banner region" would require, and that rule is pinned as dead elsewhere.
{
  const reg = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT');
  eq(reg.end, REGION_END, '…and ends at REGION_END');
  eq(reg.end, RAW_END_IN_CODE, '…which IS the raw end of the cut: the function closes its region');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the RS snapshot diagnostics banner');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…this function being owner number OWNER_POSITION of them, the last');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…with OWNER_BEFORE immediately above it');
  eq(nextMarkAfter(RAW_AT_IN_CODE), REGION_END, '…and the next banner opening exactly where the cut ends');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  ok(WHOLE_REGION_BCS > BY_CONSUMER_SPLIT && WHOLE_REGION_NINE > FULL_NINE,
    '…strictly worse than the cut, which is why the cut takes the region\'s last owner and not the region');
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
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start, so the screen reaches it');
eq(cleanRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 1,
  '…and its row ends exactly where the cut that shipped does');
eq(cleanRuns.filter((c) => c.lo === DECL_AT_IN_CODE)[0].units, DECLARATION_ONLY_CHARS,
  '…at DECLARATION_ONLY_CHARS units: the screen\'s row is the declaration without its documentation');

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, runs once escHtml exists, and fails loudly without it');
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
  const bare = vm.runInContext(VM_GLOBALS[0], ctx);
  eq(bare(null, null, null), '', 'with nothing to show it returns the empty string…');
  eq(bare({ total: 0 }, [], null), '', '…also for an empty breakdown and no near misses, without needing escHtml');
  // WITH escHtml SUPPLIED, through a recording stub. A VM-realm result is a string
  // here, so it is compared directly.
  const calls = [];
  const full = vm.createContext(Object.assign(Object.create(null), {
    escHtml: (s) => { calls.push(String(s)); return '[' + s + ']'; },
  }));
  vm.runInContext(BODY, full);
  const out = vm.runInContext(VM_GLOBALS[0], full)(
    { total: 3, byReason: [{ reason: 'a<b', count: 2 }, { reason: 'c', count: 1 }] },
    [{ ticker: 'AAPL', reason: 'r', score: 1.234 }, { ticker: 'X', reason: 'q', score: -0.5 }, { ticker: 'Y', reason: 'z', score: null }],
    { spy1d: { cached: true, candles: 250 }, spy4h: { cached: false, candles: 0 } });
  eq(out.length, OUTPUT_CHARS, 'a full call returns OUTPUT_CHARS units of HTML');
  eq(calls, ['a<b', 'c', 'AAPL', 'r', 'X', 'q', 'Y', 'z'],
    '…having passed EVERY reason, ticker and near-miss reason through escHtml, in order');
  eq(calls.length, ESCAPED_CALLS, '…ESCAPED_CALLS calls, counted');
  ok(out.indexOf('<span>[a<b]</span>') >= 0, '…the escaped text appearing where it was inserted, never the raw reason');
  ok(out.indexOf('SKIPPED BREAKDOWN &middot; 3') >= 0, '…the heading carrying the total');
  ok(out.indexOf('1D ok (250)') >= 0 && out.indexOf('4H missing') >= 0, '…the SPY note reading each timeframe\'s cache state');
  ok(out.indexOf('+1.23%') >= 0 && out.indexOf('-0.50%') >= 0, '…scores signed and rounded to two places');
  ok(out.indexOf('var(--gr)') >= 0 && out.indexOf('var(--rd)') >= 0, '…green for a non-negative score and red otherwise');
  ok(out.lastIndexOf('—') > out.indexOf('Y'), '…and a null score rendered as the dash that makes this file non-ASCII');
  // CONTROL: the same function WITHOUT escHtml. It is not wrapped in a try, so it
  // THROWS — a misplaced or missing dependency is loud here, unlike a layer whose
  // lookups sit inside a catch.
  let raised = null;
  try { bare({ total: 1, byReason: [{ reason: 'a', count: 1 }] }, [], null); } catch (e) { raised = e; }
  ok(raised !== null, 'control — without escHtml a call that has rows to show THROWS');
  eq(raised && raised.name, 'ReferenceError', '…a ReferenceError');
  eq(raised && raised.message, MISSING_ESC_ERROR, '…with exactly MISSING_ESC_ERROR');
  ok(!/\btry\b/.test(BODY), '…because the body contains no try at all, which is why it is not swallowed');
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
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    'this layer ranks SIZE_RANK by size — the SECOND smallest, and the contract says so rather '
    + 'than selling a 1,800-unit cut as a substantial one');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in,
  // rather than being left to make the total drift by one forever.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  // sizes NOW CONTAINS THIS LAYER, so slot 1 is this cut and the layer it
  // displaced has moved to slot 2. The audit read slot 1 for the displaced
  // layer because the chain excluded this one; both slots are asserted here so
  // the displacement is measured rather than assumed to have happened.
  eq(sizes[1], BODY_CHARS, '…this layer occupying the second-smallest slot itself');
  eq(sizes[2], DISPLACED_LAYER_CHARS,
    '…and the layer it displaced into THIRD place is DISPLACED_LAYER_CHARS units');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < DISPLACED_LAYER_CHARS,
    '…so it sits strictly between those two, and exactly ONE layer is smaller than it');
  // THE DOCUMENTATION DECIDES THE RANK, measured against every layer now shipped.
  ok(DECLARATION_ONLY_CHARS < SMALLEST_LAYER_CHARS && BODY_CHARS - DOC_TAKEN === DECLARATION_ONLY_CHARS,
    'control — without its documentation it would have been the SMALLEST layer of all, at DECLARATION_ONLY_CHARS units');
  eq(sizes.filter((u) => u < DECLARATION_ONLY_CHARS).length, 0,
    '…which is measured against every layer, not inferred from the smallest');
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
  ok(!ascii(MODULE), '…asserted of the module directly, not inferred: it holds an em dash');
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
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-greeks-freshness.js', 'js/portfolio/portfolio-underlying-fallback-plan.js', 'js/portfolio/portfolio-price-freshness.js'].sort(),
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
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2,
    '…its UTF-8 length exceeding its UTF-16 length by the two bytes its em dash costs');
}
// THE LOAD ORDER AND THE ONE DEPENDENCY. This function throws without `escHtml`
// (§7), so a call that runs before the monolith has declared it would be loud —
// and the pins below show it cannot. The tag sits last, immediately before the
// inline monolith, which is where `escHtml` is declared; the module defines
// nothing of the sort, and the call site stays in the monolith.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/portfolio/portfolio-technical-batch-fetch.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, which calls it, the very next script');
  }
  eq(count(LIVE_MONOLITH, 'function ' + ESC_HTML + '('), 1,
    'the monolith still declares ' + ESC_HTML + ' exactly once, as a hoisted function declaration…');
  eq(count(MODULE, 'function ' + ESC_HTML), 0, '…and the module declares nothing of that name');
  eq(count(LIVE_MONOLITH, 'function ' + OWNERS_EXPECTED[0]), 0,
    'the declaration has left the monolith…');
  eq((LIVE_MONOLITH.match(/\brsbSkipBreakdownHtml\(/g) || []).length, CONSUMER_SITES,
    '…leaving exactly CONSUMER_SITES call site behind');
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
  const E = 'RS_SKIP_BREAKDOWN_HTML_UNDO_';
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,801 units, not 1,800 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('font-size:8px', 'font-size:9px');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned because this module is NOT pure ASCII: swapping
    // the 3-byte em dash for a 2-byte letter keeps the length and the line-feed
    // count and moves only the byte length.
    const narrowed = MODULE.replace('—', 'é');
    eq(narrowed.length, MODULE.length, 'control — the narrowed module has the same UTF-16 length');
    eq(Buffer.byteLength(MODULE, 'utf8') - Buffer.byteLength(narrowed, 'utf8'), 1,
      '…and is one UTF-8 byte shorter');
    throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX, narrowed),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoRsSkipBreakdownHtml(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoRsSkipBreakdownHtml(INDEX, MODULE),
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
console.log('RS_SKIP_BREAKDOWN_CONTRACT_OK');
}

main();
