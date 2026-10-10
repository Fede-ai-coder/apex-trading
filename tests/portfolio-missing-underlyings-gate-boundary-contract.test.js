'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// MISSING UNDERLYINGS GATE — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [1142802,1144390) in monolith coordinates — 1,588 units raw
// and 1,587 of body, TWO owners, both synchronous functions — now live in
// js/portfolio/portfolio-missing-underlyings-gate.js.
// `_portfolioAggregatedMissingUnderlyings` decides whether the aggregated
// portfolio refresh came back OK but carries no underlyings map, the state in
// which the per-symbol fallbacks must not fan out across the book, and
// `_portfolioIvrFallbackBudget` turns that decision into the number of per-ticker
// IVR fallbacks allowed this cycle. The first 414 units are the five comment
// lines that document the first of them.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #492 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT ──────────────────
//
// The contract before this layer published its four best other openings, and the
// first was this one, at byConsumerSplit 2 and raw nine 3. The cut that contract
// shipped sat entirely before it, so every offset moved up by that cut's raw
// length, and §4 checks the published list against the reconstructed base: this
// opening is the first of the four, moved, and the other three are the top of the
// list that remained.
//
// ── PART TWO: A TIE AT THE BEST SCORE, AND HOW IT WAS BROKEN ───────────────
//
// With the layer that held the lead shipped, §4 counts no row in the shipped
// screen or the pass over its sub-floor runs whose raw nine is 2 or below. At raw
// nine 3 there were five rows over five distinct openings, and exactly TWO of
// them also scored 2 on byConsumerSplit: this one and `fetchScannerDXLinkPrices`.
// They tied on both measures. The tie-break the greeks freshness audit stated, for
// a tie of its own, was size, which would have taken the larger of the two here,
// and that is the other one. The audit declined it and said so: it broke the tie
// on a count the score does not carry, references to foundation modules, the
// shipped modules outside the chain, which byConsumerSplit leaves out. This
// opening references none; the other references `ttCall`, and is an async
// function that opens a banner region of its own. §3 and §4 measure both, and the
// claim is scoped to those two.
//
// ── PART THREE: ONE DEPENDENCY, READ AT CALL TIME ───────────────────────────
//
// The first function reads `S`, the monolith's state object, to learn whether the
// last live refresh failed with a timeout or with missing underlyings:
// `typeof S !== 'undefined' && S && S.lastPortfolioLiveRefreshFailure`. That is
// the whole of the raw nine's ninth direction, and it is a guarded read made when
// the function is CALLED, never when it loads. §3 pins it, §7 runs the shipped
// module bare, where the guard answers, and again with an `S` injected, and §8
// counts the layers that pin a monolith dependency across the suite.
//
// ── PART FOUR: A SEAM WITHOUT A BRACE ──────────────────────────────────────
//
// The seam accepts SEVEN line starts between the previous owner and the
// declaration: a blank line, each of the five documentation lines, and the
// declaration. The previous owner is the one-line `var` that holds the fallback
// cap, so there is no closing-brace opening and no mid-line position to refuse as
// earlier layers had, and all seven parse. The screen visits only the last, 1,173
// units from the declaration and under its floor, and cutting there would have
// left the documentation behind, fused to the next function's own with no blank
// line between them. The cut opens on the first documentation line, and §2
// measures both consequences.
//
// ── PART FIVE: THE OWNER BELOW CANNOT BE TAKEN ─────────────────────────────
//
// The next owner, `getCanonicalIvr`, ends directly against the declaration after
// it with no blank line between them. The seam rule refuses a cut that ends
// there, so the extensions below the cut are measured at the ends the rule allows
// and the refusal is asserted by name.
//
// ── NO LOAD-ORDER CONSTRAINT, STATED AT THE LEVEL IT HOLDS ─────────────────
//
// The module loads in a bare VM and calls through its guard, so a missing global
// could not hide at load; §7 shows that. §9 pins where the tag sits all the same —
// after every other local script and immediately before the inline monolith —
// and the two call sites stay in the monolith.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// The SMALLEST of the forty-nine layers the chain now holds, displacing the
// 1,622-unit layer into second place; §8 asserts the rank by measurement. The
// module holds three em dashes, so it is not pure ASCII and that count did not
// move, as the count of layers opening on a banner did not. The count of layers
// that pin a non-empty monolith dependency DID move, by one, and §8 measures it.
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
const UNDO = require('./lib/portfolio-missing-underlyings-gate-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while
// the cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/portfolio-missing-underlyings-gate.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = 'e5f41c3';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '2e00d3d';
const BASE_CHARS = 1446022;
const BASE_UTF8 = 1474567;
const BASE_LF = 24996;
const BASE_SHA256 = 'a7eaa5b6f592ba12bd2dfcd2453027a6940e40abe66fcaab7743718ea55e7c28';
const LOCAL_SCRIPTS = 92;
const TEST_FILE_COUNT = 177;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-missing-underlyings-gate-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/missing-underlyings-gate-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-missing-underlyings-gate-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-missing-underlyings-gate-contract.spec.js';
const UNDO_REL = 'tests/lib/portfolio-missing-underlyings-gate-undo.js';
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY. It moves up by one whenever a cycle's audit lands,
// because the audit pins it; Phase 2 RENAMES the file that carries the pin and
// so adds none, which is why the rename left it where the audit had put it.
const RATCHETED_CONTRACTS = 39;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/portfolio-price-freshness-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 135;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the
// outgoing contract's spec went in Phase 1, which is the rhythm. §10 asserts
// the arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/missing-underlyings-gate-audit.spec.js';
const RETIRED_MUTANTS = 129;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115482;
const CODE_CHARS = 1330514;
const TOP_LEVEL_DECLS = 912;
const OWNER_REGIONS = 118;

// ── The region ──────────────────────────────────────────────────────────────
// It opens on the five comment lines that document the first function, not on
// the declaration the screen enumerates.
const RAW_AT_IN_CODE = 1142802;
const DECL_AT_IN_CODE = 1143216;
const RAW_END_IN_CODE = 1144390;
const BODY_END_IN_CODE = 1144389;
const RAW_CHARS = 1588;
const BODY_CHARS = 1587;
const BODY_UTF8 = 1593;
const BODY_LF = 24;
const BODY_SHA256 = '9bfc66b95cc93b9dedd7cb8cc67de8efa05365ceaf4bd925d87434b2bbb396cc';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// True when the aggregated portfolio refresh came back OK but carries no underlyings map';
const DECL_FIRST_LINE =
  'function _portfolioAggregatedMissingUnderlyings(aggregatedResp) {';
const NEXT_DECL = 'getCanonicalIvr';
const NEXT_DOC_PREFIX = '// Returns a canonical IVR object for symbol';
const EM_DASHES = 3;

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['_portfolioAggregatedMissingUnderlyings', '_portfolioIvrFallbackBudget'];
const OWNER_SIZES = [691, 155];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 24;
const CODE_LINES = 11;
const COMMENT_LINES = 12;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous owner and the declaration the seam accepts SEVEN line
// starts: a blank line, the five lines of the documentation, and the
// declaration. The previous owner is a one-line `var`, so there is no closing
// brace among them. The screen visits only the last.
const PREVIOUS_OWNER = 'PORTFOLIO_MISSING_UNDERLYINGS_FALLBACK_CAP';
const BLANK_OPENING = 1142801;
const SEAM_LEGAL_OPENINGS = 7;
const PARSING_OPENINGS = 7;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 414;
const DOC_TAKEN_LINES = 5;
const DECL_UNITS_FROM_DECLARATION = 1173;
const CANDIDATES_AT_DECLARATION = 0;
const BLANK_AFTER_CUT = ';\n\n// Returns a canonical IVR object';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 1129835;
const REGION_END = 1145652;
const REGION_CHARS = 15817;
const REGION_OWNERS = 9;
const OWNER_POSITION = 6;
const OWNER_BEFORE = 'PORTFOLIO_MISSING_UNDERLYINGS_FALLBACK_CAP';
const BANNER_LINE_PREFIX = '// ── Journal snapshot prefetch';
const WHOLE_REGION_NINE = 101;
const WHOLE_REGION_BCS = 59;
const WHOLE_REGION_CONSUMERS = 21;
const WHOLE_REGION_DEPS = 4;
const WHOLE_REGION_SIB = 17;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_UP = [
  ['PORTFOLIO_MISSING_UNDERLYINGS_FALLBACK_CAP', 1142491, 1899, 7, 2, 1],
  ['_lastKnownUnderlyingPrice', 1142109, 2281, 16, 3, 1],
  ['_ivrCache', 1141763, 2627, 51, 21, 1],
];
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies]. The owner between the cut and
// this one is not here: no cut can end at it, which §5 asserts by name.
const EXTENSIONS_DOWN = [
  ['_earningsCache', 2850, 27, 25, 2],
];
const SEAM_ILLEGAL_DOWN = 'getCanonicalIvr';
const SEAM_ILLEGAL_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
const SEAM_ILLEGAL_NEXT = 'var _earningsCache';

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 3;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = 'refreshPositionsLive';
const CONSUMER_SITES = 2;
const FIRST_SITE_AT = 1036859;
const SECOND_SITE_AT = 1046562;
const CONSUMER_AT = 983849;
const CONSUMER_END = 1122331;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = ['S'];
const S_REFERENCES = 3;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 2;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// BOTH scans find nothing here. The inherited one is wrong on a `var a, b` list
// and this body has none, so the two agree; the controls in §3 are what show
// each of them can find something.
const UNCORRECTED_SCAN_HITS = 0;

// ── The opening it ties with ─────────────────────────────────────────────────
const TIE_NAME = 'fetchScannerDXLinkPrices';
const TIE_OPENING = 61214;
const TIE_UNITS = 3034;
const TIE_FOUNDATION_OUTBOUND = 1;
const TIE_FOUNDATION_NAMES = ['ttCall'];
// [opening, closing, raw nine, byConsumerSplit] of every row, over the screen and
// the pass together, whose raw nine is at most FULL_NINE.
const NINE_AT_BEST_ROWS = [
  [61214, 64248, 3, 2],
  [71940, 73970, 3, 3],
  [926059, 929849, 3, 3],
  [927763, 929849, 3, 3],
  [1142802, 1144389, 3, 2],
];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_portfolioAggregatedMissingUnderlyings', '_portfolioIvrFallbackBudget'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7264;
const SEAM_REJECTED = 2047;
const CANDIDATES = 2923;
const CLEAN_CANDIDATES = 1789;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 10;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION. A function whose documentation lifts it over the floor
// was therefore never enumerated. This pass keeps every run the screen skipped
// for being short, re-measures it from the start of its documentation, and
// keeps those that then clear the floor.
const HIDDEN_ROWS = 38;
const HIDDEN_CLEAN_ROWS = 37;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 3;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [1142802, 1144389, 1173, 1587, 3, 2, ['_portfolioAggregatedMissingUnderlyings', '_portfolioIvrFallbackBudget']],
  [896654, 898402, 1375, 1748, 4, 2, ['fetchBackendPortfolioPositionsEnriched']],
  [750645, 752344, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 13;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [61214, 2, 3, 3034],
  [286843, 2, 4, 1735],
  [896654, 2, 4, 1748],
  [942054, 2, 5, 1872],
];
const PREVIOUS_RAW_CHARS = 1623;
const PREVIOUS_RAW_END = 779937;

// ── Where it sits ────────────────────────────────────────────────────────────
const CHAIN_LENGTH = 49;
const DISPLACED_LAYER_CHARS = 1622;
const SIZE_RANK = 1;
const LAYERS_LARGER_THAN_THIS_CUT = 48;
const PURE_ASCII_LAYERS = 4;
const LAYERS_OPENING_ON_BANNER = 23;
const LAYERS_WITH_A_DEPENDENCY = 16;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 15;

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1511;
const INDEX_AFTER = 1444511;
const RESIDUAL_MONOLITH = 1328926;
const LOCAL_SCRIPTS_AFTER = 93;
// The tag's position among the local scripts, zero-based: the last of 93.
const TAG_LOCAL_INDEX = 92;

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



console.log('MISSING UNDERLYINGS GATE — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// THIS IS THE NEWEST LAYER, so LIVE_INDEX is the head of the tree and nothing is
// peeled before it. The next cycle's Phase 2 adds a peel here, as this one's
// predecessor received.
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX, MODULE);

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
// not only the first. The shipped scan above is kept so the contract can measure
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the
// price freshness block predicted the document, the residual monolith and the
// script count this contract measures, so the two cycles are joined by numbers.
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
section('2. The region, its seam, and the seven openings the seam admits');
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

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits seven openings.
const OPENINGS = [];
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  eq(prevOwner.name, PREVIOUS_OWNER, 'the owner directly above the cut is PREVIOUS_OWNER…');
  eq(prevOwner.form, 'var', '…a `var`, not a function, so its end is a semicolon and not a closing brace');
  ok(CODE.slice(prevOwner.start, prevOwner.end + 1).indexOf('\n') < 0, '…on a single line');
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    'SEAM_LEGAL_OPENINGS line starts between the previous owner and the declaration are accepted');
  eq(OPENINGS[0], BLANK_OPENING, '…the first being the blank line after that `var`: there is no closing-brace opening');
  eq(OPENINGS[1], RAW_AT_IN_CODE, '…the one after it the first line of the documentation, the cut');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last the declaration');
  eq(OPENINGS.slice(1, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES documentation lines are each an opening of their own');
  // There is no position that starts mid-line among them to refuse, because the
  // one-line `var` leaves none: every position between two openings is refused
  // with the seam rule's own error.
  throwsWith(() => assertSeam(CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE), MID_LINE_ERROR,
    'a position inside the first documentation line is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what
  // loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…and PARSING_OPENINGS of the seven parse, counted rather than listed: all of them');
  ok(isBlankOrComment(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE))),
    'the first opening is a blank line, which would make a module that begins on an empty line');
}

// WHAT THE CUT TAKES is the whole comment block documenting the first
// function, and nothing else: five comment lines directly above the declaration.
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
  ok(doc.indexOf('must NOT fan out across every unresolved ticker') >= 0,
    '…and which states what the gate is for, a claim §7 measures rather than trusts');
}
// WHAT LEAVING IT WOULD HAVE STRANDED. Cutting at the declaration (the one opening
// the screen visits) would have left the five comment lines behind, fused to the next
// function's documentation with no blank line between them.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would leave the documentation fused to the next function\'s own');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(clean.indexOf(BLANK_AFTER_CUT), RAW_AT_IN_CODE - 3,
    'while the cut that shipped left the previous owner\'s semicolon, exactly one blank '
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
section('3. Coupling: one consumer, one guarded dependency, and both directions measured');
// ─────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these names, in this order');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…both functions, so this layer ships no mutable binding');
  ok(own.every((d) => !/^async /.test(firstLineOf(CODE.slice(d.start)))), '…and both synchronous');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly the one name S');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in: CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call sites, one for each function');
eq(REC.sites, [FIRST_SITE_AT, SECOND_SITE_AT], '…at FIRST_SITE_AT and SECOND_SITE_AT');
eq(CODE.slice(FIRST_SITE_AT - 'var aggMissingUnderlyings = '.length, FIRST_SITE_AT), 'var aggMissingUnderlyings = ',
  '…the first binding the decision to a local…');
eq(CODE.slice(SECOND_SITE_AT - 'var _ivrFanoutCap = '.length, SECOND_SITE_AT), 'var _ivrFanoutCap = ',
  '…and the second turning it into the cap, which is all the consumer does with either');
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.end < RAW_AT_IN_CODE || keeper.start > RAW_END_IN_CODE, '…the consumer sitting outside the cut');
  ok(REC.sites.every((at) => at > keeper.start && at < keeper.end), '…and both sites inside its body');
  ok(REC.sites.every((at) => hostOf(at) && hostOf(at).name === CONSUMER),
    '…each with an enclosing declaration, so the screen files neither under TOP LEVEL');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and NO foundation module either: FOUNDATION_OUTBOUND');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT');
}
// THE ONE DEPENDENCY IS A GUARDED READ OF `S`, MADE WHEN THE FUNCTION IS CALLED.
{
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), 'S').length, S_REFERENCES,
    'the body names S at S_REFERENCES places, all inside the one expression below…');
  ok(BODY.indexOf("(typeof S !== 'undefined' && S && S.lastPortfolioLiveRefreshFailure) || null") >= 0,
    '…which tests that S exists before it reads it, so a missing S answers instead of throwing');
  const s = BY_NAME.get('S');
  eq(s.form, 'const', 'S is a top-level `const` of the monolith…');
  ok(s.end < RAW_AT_IN_CODE, '…declared above the cut, so the monolith still owns it after the move');
  eq(DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE && d.name === 'S').length, 0,
    '…and the cut does not take it');
  eq(propertyWriteBases(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).filter((b) => b === 'S').length, 0,
    '…and the body only READS it: no property of S is written, and the scan below finds no plain assignment either');
  eq(propertyWriteBases('function f() { S.lastPortfolioLiveRefreshFailure = 1; }').filter((b) => b === 'S').length, 1,
    'control — the same scan finds a planted write to a property of S, so that zero is a measurement');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time, S included');
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
section('4. THE FINDING: the previous contract named it, and it tied at the best score');
// ─────────────────────────────────────────────────────────────────────
// WHAT THE PREVIOUS CONTRACT PUBLISHED, read out of it and moved up by the raw
// length of the cut it shipped.
const prevText = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
const listOf = (name) => prevText.match(new RegExp('^const ' + name + ' = \\[([\\s\\S]*?)^\\];', 'm'))[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
  .map((l) => JSON.parse(l.replace(/,$/, '').replace(/'/g, '"')));
const prevNum = (name) => Number(prevText.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
const moved = (lo) => (lo >= PREVIOUS_RAW_END ? lo - PREVIOUS_RAW_CHARS : lo);
{
  eq(prevNum('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(prevNum('RAW_END_IN_CODE'), PREVIOUS_RAW_END, '…ending at PREVIOUS_RAW_END…');
  ok(prevNum('RAW_AT_IN_CODE') < RAW_AT_IN_CODE,
    '…and it sat entirely BEFORE this cut, so every offset here is the published one moved up by that length');
  ok(prevText.indexOf('the best score that remained was 2') >= 0,
    'the previous contract forecast that the best score left would be 2…');
  const listed = listOf('RUNNERS_UP').map(([lo, bcs, nine, units]) => [moved(lo), bcs, nine, units]);
  eq(listed.length, RUNNERS_UP.length, '…and published as many runners-up as this contract does…');
  eq(listed[0], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the first of them, moved, being THIS cut, at the same byConsumerSplit, raw nine and length');
  eq(listed.slice(1, 3), RUNNERS_UP.slice(0, 2), '…and the next two being exactly the top of RUNNERS_UP now…');
  eq(listed[3], RUNNERS_UP[2], '…with the fourth moved up to third, and a new fourth entering behind it');
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
    'HIDDEN_SCORE_ONE of them score 1 on byConsumerSplit: neither enumeration holds a row at 1…');
  const atTwo = hiddenClean.filter((c) => c.bcs === 2).sort((a, b) => a.nine - b.nine || a.lo - b.lo || a.hi - b.hi);
  eq(atTwo.length, HIDDEN_SCORE_TWO, '…and HIDDEN_SCORE_TWO score 2');
  eq(atTwo.map((c) => [c.lo, c.hi, c.unitsDecl, c.unitsDoc, c.nine, c.bcs, c.p.names]),
    HIDDEN_SCORE_TWO_ROWS, '…those being exactly HIDDEN_SCORE_TWO_ROWS');
  eq(HIDDEN_SCORE_TWO_ROWS[0].slice(0, 2), [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    'the first of them IS the cut that shipped');
  // THE RAW NINE, over the screen and the pass together.
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc })));
  eq(rows.filter((r) => r.nine < FULL_NINE).length, 0,
    'in the screen and the pass together NOT ONE row has a raw nine below FULL_NINE: the layer that held that lead has shipped…');
  const atBest = rows.filter((r) => r.nine <= FULL_NINE).map((r) => [r.lo, r.hi, r.nine, r.bcs])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  eq(atBest, NINE_AT_BEST_ROWS, '…and the rows at FULL_NINE are exactly NINE_AT_BEST_ROWS');
  eq(new Set(atBest.map((r) => r[0])).size, atBest.length, '…each at an opening of its own');
  const tied = atBest.filter((r) => r[3] <= BY_CONSUMER_SPLIT);
  eq(tied.map((r) => r[0]), [TIE_OPENING, RAW_AT_IN_CODE],
    '…and exactly TWO of them also score BY_CONSUMER_SPLIT on byConsumerSplit: TIE_OPENING and this cut. They TIE on both measures');
  eq(new Set(rows.filter((r) => r.bcs <= BY_CONSUMER_SPLIT).map((r) => r.lo)).size, OPENINGS_AT_TWO_OR_BELOW,
    '…among OPENINGS_AT_TWO_OR_BELOW distinct openings that score 2 or below, so the byConsumerSplit alone does not give the lead');
  // HOW THE TIE WAS BROKEN. The greeks freshness audit broke its own tie on size,
  // which takes the larger; that contract still says so, checked below.
  // This one measures a count the score does not carry: references to foundation
  // modules, and whether the function is async.
  {
    ok(fs.readFileSync(path.join(ROOT, 'tests/portfolio-greeks-freshness-boundary-contract.test.js'), 'utf8')
      .indexOf('the cut took the LARGER of the two, a size tie-break stated as one') >= 0,
    'the greeks freshness contract records that its tie was broken on size, taking the larger…');
    const other = BY_NAME.get(TIE_NAME);
    eq(blockAbove(other).start, TIE_OPENING, 'TIE_NAME is the declaration whose documentation opens at TIE_OPENING…');
    eq(tied[0][1] - tied[0][0], TIE_UNITS, '…TIE_UNITS units long, the larger of the two, so a size rule would take it');
    ok(tied[0][1] - tied[0][0] > BODY_CHARS, '…asserted as a comparison, not carried as a claim');
    ok(/^async function /.test(firstLineOf(CODE.slice(other.start))), '…an async function');
    const os = outboundSplit(TIE_OPENING, tied[0][1]);
    eq([os.chain, os.foundation], [CHAIN_OUTBOUND, TIE_FOUNDATION_OUTBOUND],
      '…referencing TIE_FOUNDATION_OUTBOUND foundation module, against none for this cut');
    eq(os.foundationNames, TIE_FOUNDATION_NAMES, '…by the name TIE_FOUNDATION_NAMES');
    ok(REGIONS.some((r) => r.start === TIE_OPENING), '…and it opens a banner region of its own, which this cut does not');
    ok(!REGIONS.some((r) => r.start === RAW_AT_IN_CODE), '…asserted of this cut directly');
  }
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
  eq(RUNNERS_UP[0][0], TIE_OPENING, '…the first of them being the opening this cut ties with');
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
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine and no better on byConsumerSplit');
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
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…and is worse on the raw nine, and no better on byConsumerSplit');
}
// THE OWNER BELOW CANNOT BE TAKEN. It ends directly against the declaration after
// it, so no cut can end there, and the refusal is asserted by name.
{
  const d = BY_NAME.get(SEAM_ILLEGAL_DOWN);
  eq(d.name, NEXT_DECL, 'the first owner below the cut is NEXT_DECL, which is SEAM_ILLEGAL_DOWN…');
  const hb = downEnd(d);
  throwsWith(() => assertSeam(CODE, RAW_AT_IN_CODE, hb), SEAM_ILLEGAL_ERROR,
    '…and it is not a legal end for this cut: the seam rule refuses it by name');
  eq(CODE.slice(hb - 2, hb + SEAM_ILLEGAL_NEXT.length), '}\n' + SEAM_ILLEGAL_NEXT,
    '…because it ends directly against SEAM_ILLEGAL_NEXT with no blank line between them');
}
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
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the snapshot-prefetch banner, which labels a region it does not describe');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…the first function being owner number OWNER_POSITION of them');
  eq(own[OWNER_POSITION].name, OWNERS_EXPECTED[1], '…the second the owner after it');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…with OWNER_BEFORE immediately above the pair');
  eq(own[OWNER_POSITION - 1 + OWNER_COUNT].name, NEXT_DECL, '…and NEXT_DECL immediately below it');
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
section('7. It loads bare, decides on the response and then on S, and the budget is arithmetic');
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
  const ctx = vm.createContext(Object.create(null));
  // THE SHIPPED MODULE is what loads here, not a slice of the reconstructed
  // monolith: §9 proves the two are the same bytes.
  vm.runInContext(MODULE, ctx);
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM and declares exactly its two owners');
  const gate = vm.runInContext(VM_GLOBALS[0], ctx);
  const budget = vm.runInContext(VM_GLOBALS[1], ctx);
  // THE RESPONSE DECIDES FIRST, and does so without S.
  eq(gate({ ok: true, underlyings: {} }), false, 'an OK response that carries an underlyings map is not the missing state…');
  eq(gate({ ok: true }), true, '…an OK response with no map is…');
  eq(gate({ ok: true, underlyings: null }), true, '…and so is one whose map is null');
  eq(gate({ ok: false }), false, 'a response that is not OK is not the state, with no S to consult…');
  eq(gate(null), false, '…nor is a null response…');
  eq(gate(undefined), false, '…nor an absent one: in a bare VM the guard on S answers instead of throwing');
  // WITH AN S INJECTED, the recorded failure decides when there was no response.
  const withS = (state) => {
    const c = vm.createContext({ S: state });
    vm.runInContext(MODULE, c);
    return vm.runInContext(VM_GLOBALS[0], c);
  };
  eq(withS({ lastPortfolioLiveRefreshFailure: { reason: 'timeout' } })(null), true,
    'with S recording a timeout, a null response IS the missing state…');
  eq(withS({ lastPortfolioLiveRefreshFailure: { reason: 'missing_underlyings' } })(null), true,
    '…and so is a recorded missing_underlyings…');
  eq(withS({ lastPortfolioLiveRefreshFailure: { reason: 'network' } })(null), false,
    '…while any other recorded reason is not…');
  eq(withS({ lastPortfolioLiveRefreshFailure: {} })(null), false, '…nor a record with no reason…');
  eq(withS({})(null), false, '…nor an S that has recorded nothing…');
  eq(withS(null)(null), false, '…nor an S that is null');
  eq(withS({ lastPortfolioLiveRefreshFailure: { reason: 'timeout' } })({ ok: true, underlyings: {} }), false,
    'and a recorded timeout does not override an OK response that carries its map: the response decides first');
  // THE BUDGET is arithmetic over its three arguments.
  eq(budget(false, false, 3), Infinity, 'outside the missing state the budget is unbounded, whoever asked…');
  eq(budget(false, true, 3), Infinity, '…user-initiated or not');
  eq(budget(true, false, 3), 0, 'inside it the budget is ZERO unless the user clicked Refresh…');
  eq(budget(true, true, 3), 3, '…and then it is the cap…');
  eq(budget(true, true, 3.9), 3, '…truncated to a whole number…');
  eq(budget(true, true, -2), 0, '…never negative…');
  eq(budget(true, true, undefined), 0, '…and zero when there is no cap');
  eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(), '…and defines no global when called');
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
  eq(sizes[0], BODY_CHARS, 'the smallest shipped layer is now this one, BODY_CHARS units…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    '…measured against every layer rather than inferred from the first: it ranks SIZE_RANK by size, the smallest');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in,
  // rather than being left to make the total drift by one forever.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  eq(sizes[1], DISPLACED_LAYER_CHARS,
    '…the layer it displaced into SECOND place being DISPLACED_LAYER_CHARS units, the audit\'s SMALLEST_LAYER_CHARS');
  // THE TWO CHAIN-WIDE SHAPE COUNTS, over the whole chain AND over the chain
  // before this layer. The audit forecast that NEITHER would move; both are
  // asserted as comparisons between two measurements rather than carried
  // forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(prior.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is not, asserted of the module directly: it holds three em dashes…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is the same: it did not move');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  eq(prior.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…the same count before this layer, because this module does NOT open on one');
  ok(!banner(MODULE), '…asserted of the module directly: it opens on its documentation');
  // THE ONE CHAIN-WIDE COUNT THAT DID MOVE: layers whose contract pins a
  // non-empty MONOLITH_DEPENDENCIES. Counted over the suite with this contract in
  // it and again without it, then compared with the figure the contract that
  // carries it pins.
  const contractsPinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => ({ f, src: fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8') }))
    .filter(({ src }) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    }).map((x) => x.f);
  eq(contractsPinning.length, LAYERS_WITH_A_DEPENDENCY,
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, counted over the suite…');
  ok(contractsPinning.indexOf(path.basename(CONTRACT_REL)) >= 0, '…this contract being one of them…');
  eq(contractsPinning.length - 1, PRIOR_LAYERS_WITH_A_DEPENDENCY,
    '…so the count before this layer was PRIOR_LAYERS_WITH_A_DEPENDENCY, and it moved up by exactly one');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]), LAYERS_WITH_A_DEPENDENCY,
  '…which is the figure the contract that carries it pins now');
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
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL].sort(),
    'exactly TWO production paths differ from the base: the document and the new module');
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
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, EM_DASHES * 2,
    '…its UTF-8 length exceeding its UTF-16 length by two bytes for each of its EM_DASHES em dashes, since it is not pure ASCII');
}
// THE LOAD ORDER. The module loads bare and reads S only when called (§7), so the
// tag's position is not load-bearing for loading. It is pinned all the same: last
// of the local scripts, immediately before the inline monolith, whose two call
// sites stay behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/portfolio/portfolio-price-freshness.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, which calls it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name), 0, 'the declaration of ' + name + ' has left the monolith…');
  }
  eq(OWNERS_EXPECTED.map((n) => (LIVE_MONOLITH.match(new RegExp('\\b' + n + '\\(', 'g')) || []).length),
    [1, 1], '…leaving exactly one call site for each behind');
  eq(OWNERS_EXPECTED.length, CONSUMER_SITES, '…CONSUMER_SITES in all');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its two owners and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === 'S').length, 1,
    '…while S stays declared in the monolith, which owns it');
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
  const E = 'PORTFOLIO_MISSING_UNDERLYINGS_GATE_UNDO_';
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,588 units, not 1,587 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('cap | 0', 'cap | 1');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: this module holds em dashes, so its
    // UTF-8 and UTF-16 lengths already differ, and swapping a 1-byte letter
    // for a 2-byte one keeps the length and the line-feed count and moves only
    // the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoPortfolioMissingUnderlyingsGate(INDEX, MODULE),
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
  ok(fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)), '…replaced by this contract\'s');
  ok(fs.existsSync(path.join(ROOT, UNDO_REL)), 'and the undo helper ships');
  eq(all.filter((rel) => !rel.startsWith('tests/') && rel !== 'index.html'
    && !rel.startsWith('js/')), [],
  '…with every remaining changed path being a test artifact, the document or a module');
  // THE RATCHET. The audit left and this contract arrived, so the suite file
  // count is UNCHANGED — which is asserted against git rather than assumed from
  // the fact that a rename happened.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  '…the same count the base commit carried, read out of git: one file left as one arrived');
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
  const contractSpec = require(path.join(ROOT, CONTRACT_SPEC_REL));
  eq(contractSpec.target, CONTRACT_REL, 'this contract\'s spec targets this contract');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  eq(declaredNow, BASE_DECLARED_MUTANTS + contractSpec.mutants.length - RETIRED_MUTANTS,
    '…and the live total is the base, LESS the audit spec this phase retires, PLUS this '
    + 'contract\'s own — the arithmetic of the change rather than the total it reaches');
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
  eq(layerSpecs, [path.basename(CONTRACT_SPEC_REL)], '…and it is THIS contract\'s');
}

console.log('\n' + pass + ' assertions passed.');
console.log('MISSING_UNDERLYINGS_GATE_CONTRACT_OK');
}

main();
