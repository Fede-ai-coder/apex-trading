'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TECHNICAL BATCH FETCH — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [938249,940102) in monolith coordinates — 1,853 units raw and
// 1,852 of body, ONE owner, an async function — now live in
// js/portfolio/portfolio-technical-batch-fetch.js. `_fetchPortfolioTechnicalBatch`
// POSTs one batch of symbols to the backend's technical-refresh route and returns
// a result object: `{ ok: true, data, … }` on success and `{ ok: false, reason,
// … }` on every failure path it has.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #482 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: ONE CANDIDATE WAS LEFT AT 1 ─────────────────────
//
// Audit #482 counted exactly one of 1,854 clean candidates at byConsumerSplit 1,
// and it was this function. It is named as a runner-up in each of the two
// contracts before this one. The first refused it on a RELATIVE ground: the cut
// it lost to scored strictly better on the raw nine, and that cut has since
// shipped. The second recorded that its own refusal had expired. §4 reads both
// out of the contracts that recorded them rather than recalling them, and joins
// the two cycles by arithmetic: the offset it was published at, less the raw
// length of the cut that left, is the offset it had.
//
// ── PART TWO: IT NEVER THROWS, SO THE TAG ORDER IS THE ONLY GUARD ──────────
//
// Every lookup of `fetch`, `BACKEND`, `_backendAuthHeaders` and `AbortSignal`
// sits inside one `try`. A missing foundation does not crash it: it RETURNS `{ ok:
// false, reason: 'request_error', errorName: 'ReferenceError' }`. §7 supplies one
// missing name at a time and none of the cases it runs throws, and runs the layer
// shipped immediately before this one as a control, which DOES throw.
//
// So a load-order mistake would not fail loudly: it would turn every technical
// refresh into a quiet request_error. §9 therefore pins the order itself — both
// foundation modules ahead of the tag, and the tag the last local script before
// the inline monolith — and the undo helper's adjacency guards refuse a tag that
// has moved. This is the pin the audit said the permanent contract would have to
// carry, because the runtime will not complain on its own.
//
// ── PART THREE: THE SEAM IS NOT ENOUGH HERE EITHER ─────────────────────────
//
// `assertSeam` accepts THREE openings between three units above the declaration
// and the declaration itself. One begins on the closing brace of the PREVIOUS
// function and is not valid JavaScript; §2 measures that by parsing it. The
// screen never visits it, because it opens runs only at a region start or a
// declaration start. It is another instance of what CLAUDE.md records — the seam
// is mechanical, the boundary is not.
//
// ── COUPLING: byConsumerSplit 1 ────────────────────────────────────────────
//
// ONE consumer, `fetchPortfolioTechnicalRefresh`, at two awaited call sites, the
// immediate neighbour below the cut. No monolith dependency and no chain module;
// the two foundation names it reads are not counted against it. Both directions
// of state coupling are measured: nothing writes into it, and it assigns to no
// identifier it does not own, checked by a direct scan of the body as well as by
// the profile.
//
// ── WHAT TAKING MORE WOULD HAVE COST, PRICED ───────────────────────────────
//
// Taking its consumer too was available and legal. §5 prices it, and prices the
// banner region it came out of, rather than dismissing either.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// SECOND smallest of the forty-four layers the chain now holds, displacing the
// 2,936-unit layer into third. §8 asserts the rank by measurement, and holds the
// move to the figures the audit forecast: it is pure ASCII, so one of the two
// chain-wide shape counts moved, and the other did not.
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
const PORTFOLIO_GREEKS_FRESHNESS_U = require('./lib/portfolio-greeks-freshness-undo.js');
const RS_SKIP_BREAKDOWN_HTML_U = require('./lib/rs-skip-breakdown-html-undo.js');
const UNDO = require('./lib/portfolio-technical-batch-fetch-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while
// the cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/portfolio-technical-batch-fetch.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '09932fa';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = '56e8b37';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = '454f79e';
const BASE_CHARS = 1454677;
const BASE_UTF8 = 1483244;
const BASE_LF = 25152;
const BASE_SHA256 = '0757e6576b328511c3014d6746ac2c6ff9513b0d16999f8b5ef321f2bf637aca';
const LOCAL_SCRIPTS = 87;
const TEST_FILE_COUNT = 174;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-technical-batch-fetch-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-batch-fetch-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-technical-batch-fetch-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-batch-fetch-contract.spec.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = '56e8b37';
const CONTRACT_SPEC_MUTANTS = 127;
const UNDO_REL = 'tests/lib/portfolio-technical-batch-fetch-undo.js';
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
const RATCHETED_CONTRACTS = 36;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/portfolio-snapshot-fallback-boundary-contract.test.js';
// The contract one further back, which refused this function the first time.
const REFUSING_CONTRACT = 'tests/backend-full-refresh-validation-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 129;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the
// outgoing contract's spec went in Phase 1, which is the rhythm. §10 asserts
// the arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-technical-batch-fetch-audit.spec.js';
const RETIRED_MUTANTS = 123;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115136;
const CODE_CHARS = 1339515;
const TOP_LEVEL_DECLS = 917;
const OWNER_REGIONS = 118;

// ── The region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 938249;
const RAW_END_IN_CODE = 940102;
const BODY_END_IN_CODE = 940101;
const RAW_CHARS = 1853;
const BODY_CHARS = 1852;
const BODY_UTF8 = 1852;
const BODY_LF = 31;
const BODY_SHA256 = 'ee1bb52df20c3b1c080619675c6480dcfa8faa9c4a3efc9f1c65b99eed3267f1';
const BODY_ENDING = '}\n';
const DECL_FIRST_LINE =
  'async function _fetchPortfolioTechnicalBatch(batchSymbols, timeframes, perBatchTimeoutMs, isLatestSeqFn) {';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['_fetchPortfolioTechnicalBatch'];
const OWNER_SIZES = [1851];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 31;
const CODE_LINES = 31;
const COMMENT_LINES = 0;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The openings the seam rule admits, in the units above the declaration ────
// Three are accepted. One is the closing brace of the previous function and is
// not valid JavaScript; one is a blank line; one is the declaration.
const OPENINGS = [938246, 938248, 938249];
const MID_LINE_OPENING = 938247;
const BRACE_OPENING = 938246;
const BLANK_OPENING = 938248;
const SEAM_LEGAL_OPENINGS = 3;
const PARSING_OPENINGS = 2;
// The NAME of the failure, not V8's wording of it: this assertion outlives the
// audit inside the permanent contract, and an engine rewording its message is
// not a reason for a boundary contract to fail.
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const LEAD_IN = '}\n\n';
const CANDIDATES_AT_OPENING = 14;

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 895974;
const REGION_END = 962295;
const REGION_CHARS = 66321;
const REGION_OWNERS = 26;
const OWNER_POSITION = 13;
const OWNER_BEFORE = '_applyTechnicalRefreshEarnings';
const BANNER_LINE_PREFIX = '// ── [PortfolioRefreshPayload]';
const WHOLE_REGION_NINE = 126;
const WHOLE_REGION_BCS = 49;
const WHOLE_REGION_CONSUMERS = 9;
const WHOLE_REGION_DEPS = 23;
const WHOLE_REGION_SIB = 4;

// ── The consumer pair, priced ────────────────────────────────────────────────
const PAIR_END = 949364;
const PAIR_UNITS = 11115;
const PAIR_NINE = 9;
const PAIR_BCS = 6;
const PAIR_CONSUMERS = ['refreshPositionsLive'];
const PAIR_DEPENDENCIES = ['S', '_portfolioTechnicalDebugEnabled'];

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 4;
const BY_CONSUMER = 3;
const BY_CONSUMER_SPLIT = 1;
const CONSUMER = 'fetchPortfolioTechnicalRefresh';
const CONSUMER_SITES = 2;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 2;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 2;
const FOUNDATION_NAMES = ['BACKEND', '_backendAuthHeaders'];
const BACKEND_CONFIG_REL = 'js/config/backend-config.js';
const BACKEND_CLIENT_REL = 'js/api/backend-client.js';
const BACKEND_CONFIG_INDEX = 4;
const BACKEND_CLIENT_INDEX = 3;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_fetchPortfolioTechnicalBatch'];
const LADDER_STEPS = 4;
const URL_SUFFIX = '/portfolio/technical-refresh';
const BENCHMARK = 'SPY';
const CONTENT_TYPE = 'application/json';
const FAILURE_REASONS = [
  'aborted_json_parse', 'http_not_ok', 'invalid_json', 'request_error', 'stale_seq', 'timeout',
];
const NEIGHBOUR_ERROR = 'normalizeGreekPoints is not defined';

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7363;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3018;
const CLEAN_CANDIDATES = 1854;
const ONE_CONSUMER_SPLIT = 1;
const PREVIOUS_ONE_CONSUMER_SPLIT = 2;
const BETTER_SCORING = 0;
const SCORE_TWO = 15;
const SCORE_TWO_OPENINGS = 13;
const SCORE_TWO_BEST_NINE = 2;
const SCORE_TWO_BEST_NINE_COUNT = 1;
// The four best openings at score 2, by (nine, units): [opening, nine, units].
const RUNNERS_UP = [
  [336585, 2, 1691],
  [1150527, 3, 2382],
  [781085, 3, 2686],
  [61214, 3, 3034],
];

// ── Where it sits ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 44;
const SMALLEST_LAYER_CHARS = 1761;
const DISPLACED_LAYER_CHARS = 2936;
const LARGEST_LAYER_CHARS = 71811;
const SIZE_RANK = 2;
const LAYERS_LARGER_THAN_THIS_CUT = 42;
// Two shape counts over the whole chain. This layer is pure ASCII, so the first
// MOVED and the second did not: §8 asserts each over the 44 layers AND over the
// 43 that preceded it, so "moved" and "did not move" are comparisons between
// two measurements rather than numbers carried forward.
const PURE_ASCII_LAYERS = 3;
const PURE_ASCII_BEFORE = 2;
const LAYERS_OPENING_ON_BANNER = 23;

// ── What the relocation cost the document ───────────────────────────────────────────────────────────────────
const NET_REDUCTION = 1779;
const INDEX_AFTER = 1452898;
const RESIDUAL_MONOLITH = 1337662;
const LOCAL_SCRIPTS_AFTER = 88;
// The tag's position among the local scripts, zero-based: the last of 88.
const TAG_LOCAL_INDEX = 87;

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

console.log('PORTFOLIO TECHNICAL BATCH FETCH — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_PORTFOLIO_GREEKS_FRESHNESS = PORTFOLIO_GREEKS_FRESHNESS_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_GREEKS_FRESHNESS_U.undoPortfolioGreeksFreshness(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-greeks-freshness.js'), 'utf8'))
  : HEAD_INDEX;
const LIVE_INDEX = RS_SKIP_BREAKDOWN_HTML_U.isApplied(PRE_PORTFOLIO_GREEKS_FRESHNESS)
  ? RS_SKIP_BREAKDOWN_HTML_U.undoRsSkipBreakdownHtml(
      PRE_PORTFOLIO_GREEKS_FRESHNESS, fs.readFileSync(path.join(ROOT, 'js/ui/rs-skip-breakdown-html.js'), 'utf8'))
  : PRE_PORTFOLIO_GREEKS_FRESHNESS;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX, MODULE);
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. #478's contract predicted both
// the document and the residual monolith this contract measures, so the two
// cycles are joined by numbers rather than by sentences.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  eq(CODE.length, Number(prev.match(/^const RESIDUAL_MONOLITH = (\d+);$/m)[1]),
    '…which is exactly the RESIDUAL_MONOLITH the previous contract forecast');
  eq(INDEX.length, Number(prev.match(/^const INDEX_AFTER = (\d+);$/m)[1]),
    '…and the document is exactly the INDEX_AFTER it forecast');
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
  eq(next.name, CONSUMER,
    '…and the declaration immediately after the cut is the consumer, the immediate neighbour');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits more than one opening.
{
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS, 'SEAM_LEGAL_OPENINGS openings are measured');
  eq(CODE.slice(BRACE_OPENING, RAW_AT_IN_CODE), LEAD_IN,
    'the units above the declaration are the previous function\'s closing brace and a blank line');
  for (const at of OPENINGS) {
    eq(assertSeam(CODE, at, BODY_END_IN_CODE), RAW_END_IN_CODE,
      'assertSeam accepts the opening at ' + at + ', so the seam does not decide');
  }
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    'while the one opening in between, which starts mid-line, is refused with its own error');
  // WHICH OF THE THREE IS A MODULE? Parse each as a standalone script, which is
  // what loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the closing brace does NOT parse: it fails as a BRACE_OPENING_ERROR');
  eq(parses(BLANK_OPENING), null, '…the opening on the blank line parses');
  eq(parses(RAW_AT_IN_CODE), null, '…and so does the opening on the declaration');
  eq(OPENINGS.filter((at) => parses(at) === null), [BLANK_OPENING, RAW_AT_IN_CODE].sort((a, b) => a - b),
    '…so PARSING_OPENINGS of the three are even candidates');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…which is PARSING_OPENINGS, counted rather than listed in this sentence');
  // OF THOSE TWO ONLY THE DECLARATION OPENS ON CODE.
  ok(isBlankOrComment(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE))),
    'the blank-line opening would make a module that begins on an empty line…');
  ok(!isBlankOrComment(firstLineOf(CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE))),
    '…where the declaration opens on code, which is the boundary this layer shipped');
  // THE SCREEN NEVER VISITS THE OTHER TWO: it opens runs only at a region start
  // or a declaration start.
  eq(candidateRuns.filter((c) => c.lo === BRACE_OPENING || c.lo === BLANK_OPENING).length, 0,
    'the screen enumerates NEITHER of the other two openings…');
  eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, CANDIDATES_AT_OPENING,
    '…and enumerates CANDIDATES_AT_OPENING runs opening on the declaration');
  eq(cleanRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, CANDIDATES_AT_OPENING,
    '…every one of which runs nothing at load');
  // NO DOCUMENTATION TO TAKE OR STRAND, unlike the two cuts before this one.
  // Control first: the same probe finds a block above SOME declaration.
  ok(DECLS.some((d) => blockAbove(d) !== null),
    'control — blockAbove DOES find a comment block above some declaration in this monolith');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])), null,
    'but there is NO comment block above this one, so there is no prose to take or to strand');
  // AND THE TWO CUTS BEFORE THIS ONE DID HAVE SOME: each module opens on a
  // comment, which is what taking its documentation looks like once shipped.
  for (const rel of ['js/portfolio/backend-full-refresh-validation.js',
    'js/portfolio/portfolio-snapshot-fallback.js']) {
    ok(fs.readFileSync(path.join(ROOT, rel), 'utf8').startsWith('//'),
      rel + ' opens on a comment, so that cut took prose with it — this one has none to take');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, and both directions of state measured');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a function, so this layer ships no mutable binding');
  ok(/^async function /.test(BODY), '…and an ASYNC one, stated rather than left to the scanner');
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names NO monolith declaration at all: the dependency direction is empty');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES references from outside');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in, and it is CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call sites');
ok(REC.sites.every((at) => CODE.slice(at - 6, at) === 'await '),
  '…every one of them awaited, so the result object is what the caller reads');
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.start >= RAW_END_IN_CODE, '…which sits AFTER the cut, the immediate neighbour');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation references');
  eq(split.foundationNames, FOUNDATION_NAMES, '…over exactly these names');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, the metric this programme ranks on');
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
// THE TWO FOUNDATION NAMES come from modules that load long before the tag this
// cut added, which is what makes the cut sound — and §7 shows why it matters
// that they do.
{
  const decl = { BACKEND: BACKEND_CONFIG_REL, _backendAuthHeaders: BACKEND_CLIENT_REL };
  for (const n of FOUNDATION_NAMES) {
    eq(OWNER_KIND.get(n), 'foundation', n + ' belongs to a FOUNDATION module, not the chain');
    eq(MODULE_OWNERS.get(n), decl[n], '…declared in ' + decl[n]);
  }
  eq(LOCALS.indexOf(BACKEND_CONFIG_REL), BACKEND_CONFIG_INDEX, 'backend-config loads at BACKEND_CONFIG_INDEX');
  eq(LOCALS.indexOf(BACKEND_CLIENT_REL), BACKEND_CLIENT_INDEX, '…backend-client at BACKEND_CLIENT_INDEX');
  ok(LOCALS.indexOf(BACKEND_CONFIG_REL) < LOCALS.length && LOCALS.indexOf(BACKEND_CLIENT_REL) < LOCALS.length,
    '…both before the position the tag took, which is index ' + LOCALS.length);
  ok(!CHAIN.includes(BACKEND_CONFIG_REL) && !CHAIN.includes(BACKEND_CLIENT_REL),
    '…and neither is a chain path');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING, part one: one candidate is left at 1');
// ─────────────────────────────────────────────────────────────────────────────
// BOTH EARLIER REFUSALS ARE READ OUT OF THE CONTRACTS THAT RECORDED THEM.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  const num = (src, name) => Number(src.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
  eq(prev.match(/^const RUNNER_UP_OWNER = '([^']+)';$/m)[1], OWNERS_EXPECTED[0],
    'the previous contract pins this function as its RUNNER_UP_OWNER');
  eq(num(prev, 'RUNNER_UP_UNITS'), BODY_CHARS, '…at the SAME length this contract measures');
  eq(num(prev, 'RUNNER_UP_NINE'), FULL_NINE, '…scoring the SAME raw nine');
  ok(prev.indexOf('why its own refusal has expired') >= 0,
    '…and records that its refusal had expired, in those words');
  // THE TWO CYCLES ARE JOINED BY ARITHMETIC. It was published at an offset
  // measured on the document BEFORE the snapshot-fallback cut left; that cut was
  // earlier in the monolith, so removing its raw length gives the offset now.
  eq(num(prev, 'RUNNER_UP_AT') - num(prev, 'RAW_CHARS'), RAW_AT_IN_CODE,
    '…at an offset which, less the raw length of the cut that left, IS this contract\'s offset');
  eq(num(prev, 'ONE_CONSUMER_SPLIT'), PREVIOUS_ONE_CONSUMER_SPLIT,
    'that contract counted PREVIOUS_ONE_CONSUMER_SPLIT clean candidates at 1…');
  ok(prev.indexOf('[SECTION_AT, RUNNER_UP_AT]') >= 0,
    '…and named them: the section the snapshot-fallback cut came out of, and this function');
}
{
  const refusing = fs.readFileSync(path.join(ROOT, REFUSING_CONTRACT), 'utf8');
  eq(refusing.match(/^const RUNNER_UP_A_OWNER = '([^']+)';$/m)[1], OWNERS_EXPECTED[0],
    'the contract that first refused it pins it as RUNNER_UP_A_OWNER');
  const shippedNine = Number(refusing.match(/^const FULL_NINE = (\d+);$/m)[1]);
  ok(shippedNine < FULL_NINE,
    '…and the cut it lost to scored ' + shippedNine + ' on the raw nine, strictly better, so the refusal was RELATIVE');
  ok(fs.existsSync(path.join(ROOT, refusing.match(/^const MODULE_REL = '([^']+)';$/m)[1])),
    '…and that cut has SHIPPED, so the comparison it lost no longer exists');
}
{
  const ones = cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT);
  eq(ones.length, ONE_CONSUMER_SPLIT, 'ONE_CONSUMER_SPLIT clean candidate scores byConsumerSplit 1 now…');
  eq(ones.map((c) => c.lo), [RAW_AT_IN_CODE], '…and it is this one');
  eq(ones[0].units, BODY_CHARS, '…at its full length');
  ok(ONE_CONSUMER_SPLIT < PREVIOUS_ONE_CONSUMER_SPLIT,
    '…down from two, because the other left when the snapshot-fallback cut shipped');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would cost: the consumer, and the banner region');
// ─────────────────────────────────────────────────────────────────────────────
// THE CONSUMER PAIR is available and legal, so it is priced rather than waved
// away. It is the screen's own row, anchored by assertSeam.
{
  const pair = candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.p.names.length === 2)[0];
  eq(pair.p.names, [OWNERS_EXPECTED[0], CONSUMER], 'the pair is this function and its consumer');
  eq(pair.hi, PAIR_END, '…ending at PAIR_END');
  eq(assertSeam(CODE, pair.lo, pair.hi), PAIR_END + 1, '…at a real seam, anchored rather than left to arithmetic');
  eq(pair.units, PAIR_UNITS, '…PAIR_UNITS units');
  ok(runsNothingAtLoad(pair.load), '…and it too runs nothing at load, so the screen does enumerate it');
  eq(pair.p.nine, PAIR_NINE, '…but scores PAIR_NINE on the raw nine');
  eq(byConsumerSplit(pair.p, pair.split), PAIR_BCS, '…and PAIR_BCS on byConsumerSplit');
  eq(consumersOf(pair.p), PAIR_CONSUMERS, '…reached by a different consumer, one level up');
  eq(pair.p.deps, PAIR_DEPENDENCIES, '…and naming monolith state this cut does not');
  ok(PAIR_BCS > BY_CONSUMER_SPLIT && PAIR_NINE > FULL_NINE && pair.p.deps.length > MONOLITH_DEPENDENCIES.length,
    '…strictly worse on every axis this programme ranks by, which is why the cut stops at one owner');
}
// THE BANNER REGION it sits inside. It is the mis-labelled catch-all audit #466
// named, and the dead rule "never cut inside a `// ── ` banner region" is pinned
// as dead elsewhere. What obeying it would cost is measured here again.
{
  const reg = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT');
  eq(reg.end, REGION_END, '…and ends at REGION_END');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the `[PortfolioRefreshPayload]` banner');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…this function being owner number OWNER_POSITION of them');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…with OWNER_BEFORE immediately above it');
  eq(own[OWNER_POSITION].name, CONSUMER, '…and its consumer immediately below');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'obeying the rule would take the whole region: WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
}
// THE REGION IS THE SAME ONE THE VALIDATOR LEFT. The audit that took the
// validator measured it before the move; the only change since is that layer.
{
  const refusing = fs.readFileSync(path.join(ROOT, REFUSING_CONTRACT), 'utf8');
  const num = (name) => Number(refusing.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
  eq(num('BANNER_REGION_CHARS') - num('RAW_CHARS'), REGION_CHARS,
    'the region measured before the validator left, less the validator\'s raw length, is REGION_CHARS now');
  eq(num('BANNER_REGION_OWNERS') - 1, REGION_OWNERS, '…and it held one owner more, which is REGION_OWNERS now');
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
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) < BY_CONSUMER_SPLIT).length,
    BETTER_SCORING, 'BETTER_SCORING candidates score better than byConsumerSplit 1: nothing does');
  const two = cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2);
  eq(two.length, SCORE_TWO, 'SCORE_TWO clean candidates sit at 2, the next score up…');
  const byLo = new Map();
  for (const c of two) {
    const b = byLo.get(c.lo);
    if (!b || c.p.nine < b.p.nine || (c.p.nine === b.p.nine && c.units > b.units)) byLo.set(c.lo, c);
  }
  eq(byLo.size, SCORE_TWO_OPENINGS, '…over SCORE_TWO_OPENINGS distinct openings');
  eq(Math.min(...two.map((c) => c.p.nine)), SCORE_TWO_BEST_NINE,
    '…the lowest raw nine among them being SCORE_TWO_BEST_NINE');
  eq(two.filter((c) => c.p.nine === SCORE_TWO_BEST_NINE).length, SCORE_TWO_BEST_NINE_COUNT,
    '…held by SCORE_TWO_BEST_NINE_COUNT candidate, so that one is unique at its score');
  // THE RUNNERS-UP, published with their numbers so the next cycle re-derives
  // nothing. Ties at nine 3 are broken by units, ascending, and said to be.
  const ranked = [...byLo.values()].sort((a, b) => a.p.nine - b.p.nine || a.units - b.units).slice(0, RUNNERS_UP.length);
  eq(ranked.map((c) => [c.lo, c.p.nine, c.units]), RUNNERS_UP,
    'the four best openings at score 2, by (nine, then units), are exactly RUNNERS_UP');
  eq(new Set(ranked.map((c) => c.p.nine)).size, 2,
    '…across two distinct nines, the second shared by three openings');
}
eq(cleanRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, CANDIDATES_AT_OPENING,
  'the screen DOES enumerate the opening this layer shipped, unlike the boundary the previous cycle defended');
ok(DECLS.some((d) => d.start === RAW_AT_IN_CODE), '…because it is a declaration start');

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare — and never throws, which is the hazard');
// ─────────────────────────────────────────────────────────────────────────────
{
  const lines = BODY.split('\n');
  lines.pop();
  eq(lines.length, SPLIT_LINES, 'the body is SPLIT_LINES lines');
  eq(lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length, CODE_LINES,
    '…CODE_LINES of code');
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
  // WHERE THE TRY IS. The header says every lookup of the four names sits inside
  // it, so the position of each is measured, along with what comes before it.
  const tryAt = BODY.indexOf('try {');
  const before = BODY.slice(0, tryAt);
  ok(tryAt > 0, 'the body has a `try` block…');
  eq(before.split('\n').filter((l) => l.trim()).slice(1), ['  var t0 = Date.now();'],
    '…preceded only by the clock read, so the claim is about the four lookups and not the whole body');
  for (const n of ['fetch', 'BACKEND', '_backendAuthHeaders', 'AbortSignal']) {
    const at = BODY.indexOf(n + (n === 'fetch' ? '(' : ''));
    ok(at > tryAt, n + ' is first used AFTER the try opens, so a missing ' + n + ' is caught');
  }
  // CONTROL: the position test can fail. `Date` IS used before the try.
  ok(BODY.indexOf('Date.now()') < tryAt, 'control — `Date` is used before the try, so the ordering test is not vacuous');
}
{
  // A VM-REALM RESULT is compared through JSON, never directly: its prototypes
  // belong to the VM's own realm, so a strict deep-equal against a host object
  // fails even when every field matches.
  const ARGS = () => [['AAPL', 'MSFT'], ['1D'], 5000, () => true];
  const ran = [];
  async function run(label, globals, args) {
    const ctx = vm.createContext(Object.assign(Object.create(null), globals));
    vm.runInContext(BODY, ctx);
    const fn = vm.runInContext(VM_GLOBALS[0], ctx);
    let threw = null, result = null;
    try { result = await fn.apply(null, args || ARGS()); } catch (e) { threw = e; }
    ran.push({ label, threw });
    return JSON.parse(JSON.stringify(result));
  }
  const okRes = (data) => ({ ok: true, status: 200, json: async () => data });
  const fetchOk = async () => okRes({ x: 1 });
  const headers = (h) => h;
  const full = (extra) => Object.assign({ fetch: fetchOk, BACKEND: 'http://b', _backendAuthHeaders: headers, AbortSignal }, extra);
  const rejecting = (name, message) => { const e = new Error(message); e.name = name; return e; };

  // THE LADDER: one missing name supplied at a time. Each step is swallowed into
  // a returned object. Not one throws.
  const ladder = [
    [{}, 'fetch is not defined'],
    [{ fetch: fetchOk }, 'BACKEND is not defined'],
    [{ fetch: fetchOk, BACKEND: 'http://b' }, '_backendAuthHeaders is not defined'],
    [{ fetch: fetchOk, BACKEND: 'http://b', _backendAuthHeaders: headers }, 'AbortSignal is not defined'],
  ];
  eq(ladder.length, LADDER_STEPS, 'the ladder has LADDER_STEPS steps, one per name the body needs');
  for (const [globals, message] of ladder) {
    const r = await run('ladder: ' + message, globals);
    eq({ ok: r.ok, reason: r.reason, errorName: r.errorName, errorMessage: r.errorMessage },
      { ok: false, reason: 'request_error', errorName: 'ReferenceError', errorMessage: message },
      'missing name → RETURNED { ok:false, reason:"request_error", errorName:"ReferenceError" }: ' + message);
    eq([r.symbols, r.timeframes], [['AAPL', 'MSFT'], ['1D']], '…echoing the batch it was given');
    eq(typeof r.durationMs, 'number', '…and timing itself even then');
  }
  {
    const r = await run('everything supplied', full());
    eq({ ok: r.ok, data: r.data }, { ok: true, data: { x: 1 } }, 'with every name supplied it succeeds: ok and the parsed data');
  }

  // THE SIX FAILURE REASONS, each reached by its own path.
  const reasons = {};
  {
    const r = await run('http', full({ fetch: async () => ({ ok: false, status: 503 }) }));
    reasons.http_not_ok = r.reason;
    eq([r.status, r.errorMessage], [503, 'HTTP 503'], 'a non-ok response → http_not_ok, carrying the status');
  }
  {
    const r = await run('stale', full(), [['AAPL'], ['1D'], 5000, () => false]);
    reasons.stale_seq = r.reason;
    eq([r.ok, 'status' in r], [false, false], 'a superseded sequence → stale_seq, discarded before the data is returned');
  }
  {
    const r = await run('badjson', full({ fetch: async () => ({ ok: true, status: 200, json: async () => { throw rejecting('SyntaxError', 'bad'); } }) }));
    reasons.invalid_json = r.reason;
    eq([r.errorName, r.errorMessage, r.status], ['SyntaxError', 'bad', 200], 'unparseable JSON → invalid_json, with the status of the response');
  }
  {
    const r = await run('abortjson', full({ fetch: async () => ({ ok: true, status: 200, json: async () => { throw rejecting('AbortError', 'cut'); } }) }));
    reasons.aborted_json_parse = r.reason;
    eq(r.errorName, 'AbortError', 'an abort while reading the body → aborted_json_parse');
  }
  {
    const r = await run('timeout', full({ fetch: async () => { throw rejecting('AbortError', 'slow'); } }));
    reasons.timeout = r.reason;
    eq(r.errorName, 'AbortError', 'an abort of the request itself → timeout');
  }
  {
    const r = await run('boom', full({ fetch: async () => { throw rejecting('Error', 'boom'); } }));
    reasons.request_error = r.reason;
    eq([r.errorName, r.errorMessage], ['Error', 'boom'], 'any other rejection → request_error');
  }
  eq(Object.values(reasons).sort(), FAILURE_REASONS,
    'the six paths yield exactly FAILURE_REASONS, each distinct');
  {
    const r = await run('plain', full({ fetch: async () => { throw 'plain'; } }));
    eq([r.reason, r.errorName, r.errorMessage], ['request_error', 'Error', 'plain'],
      'a rejection that is not an Error at all is normalised to name "Error" and its string form');
  }
  {
    const r = await run('noseq', full(), [['AAPL'], ['1D'], 5000, undefined]);
    eq(r.ok, true, 'an isLatestSeqFn that is not a function is ignored, so the stale check is skipped');
  }

  // THE REQUEST ITSELF.
  {
    const seen = [];
    const spy = async (url, init) => { seen.push({ url, init }); return okRes({}); };
    await run('request', full({ fetch: spy }));
    eq(seen.length, 1, 'one request is made per call');
    eq(seen[0].url, 'http://b' + URL_SUFFIX, '…to BACKEND plus URL_SUFFIX');
    eq(seen[0].init.method, 'POST', '…by POST');
    eq(seen[0].init.cache, 'no-store', '…uncached');
    eq(JSON.parse(JSON.stringify(seen[0].init.headers)), { 'Content-Type': CONTENT_TYPE },
      '…with the headers passed through _backendAuthHeaders');
    eq(JSON.parse(seen[0].init.body), { symbols: ['AAPL', 'MSFT'], benchmark: BENCHMARK, timeframes: ['1D'] },
      '…carrying the symbols, the BENCHMARK and the timeframes');
    ok(seen[0].init.signal instanceof AbortSignal, '…with an AbortSignal for the timeout');
  }

  // NONE OF THEM THREW.
  ok(ran.every((r) => r.threw === null),
    'across all ' + ran.length + ' cases run here, not one threw: every failure came back as data');
  eq(ran.length, LADDER_STEPS + 1 + 6 + 1 + 1 + 1, '…and the case count is the sum of its parts, so none was skipped');

  // CONTROL: the layer shipped immediately before this one DOES throw on its
  // foundation names. Run, not recalled, so this is a difference and not a
  // property of every layer.
  const neighbour = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-snapshot-fallback.js'), 'utf8');
  const nctx = vm.createContext(Object.create(null));
  vm.runInContext(neighbour, nctx);
  let raised = null;
  try { vm.runInContext('_positionFieldsFromSnapshot({entrySnapshot:{delta:0.1094}}, {qty:1})', nctx); } catch (e) { raised = e; }
  ok(raised !== null, 'control — the previous layer THROWS when its foundation is missing…');
  eq(raised && raised.message, NEIGHBOUR_ERROR, '…with exactly NEIGHBOUR_ERROR');
  eq(raised && raised.name, 'ReferenceError', '…a ReferenceError, which this layer returns instead');
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
    + 'than selling a 1,852-unit cut as a substantial one');
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
  // THE TWO CHAIN-WIDE SHAPE COUNTS, over the whole chain AND over the chain
  // before this layer. The audit forecast that exactly one of them would move;
  // "moved" and "did not move" are each asserted as a comparison between two
  // measurements rather than carried forward as a number.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII');
  eq(prior.filter(ascii).length, PURE_ASCII_BEFORE,
    '…PURE_ASCII_BEFORE before this layer, because this module IS pure ASCII…');
  ok(ascii(MODULE), '…asserted of the module directly, not inferred');
  eq(PURE_ASCII_LAYERS - PURE_ASCII_BEFORE, 1, '…so the count moved by exactly one');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  eq(prior.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…the same count before this layer, because this module does NOT open on one');
  ok(!banner(MODULE), '…asserted of the module directly: it opens on code');
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
    ['index.html', MODULE_REL, 'js/ui/rs-skip-breakdown-html.js', 'js/portfolio/portfolio-greeks-freshness.js'].sort(),
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
  eq(firstLineOf(MODULE), DECL_FIRST_LINE,
    '…and OPENS on the declaration, DECL_FIRST_LINE, the boundary §2 defends');
}
// THE LOAD ORDER IS THE ONLY GUARD, so it is pinned here. §7 shows this function
// swallows its own ReferenceErrors, which means a tag in the wrong place would
// not fail loudly — it would turn every technical refresh into a quiet
// request_error. The audit said the permanent contract would have to carry this
// pin because the runtime will not complain, and this is that pin.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  ok(LIVE_LOCALS.indexOf(BACKEND_CONFIG_REL) >= 0 && LIVE_LOCALS.indexOf(BACKEND_CONFIG_REL) < tagIndex,
    'backend-config, which declares BACKEND, loads BEFORE the tag…');
  ok(LIVE_LOCALS.indexOf(BACKEND_CLIENT_REL) >= 0 && LIVE_LOCALS.indexOf(BACKEND_CLIENT_REL) < tagIndex,
    '…and so does backend-client, which declares _backendAuthHeaders');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, which calls it, the very next script');
  }
  // CONTROL: the same predicate fails on a document with the tag moved, so the
  // pin is a measurement and not a statement that is true of any document.
  const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
  const movedLocals = APP_LOADER.parseScriptTags(moved)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  ok(movedLocals.indexOf(MODULE_REL) !== TAG_LOCAL_INDEX && movedLocals[movedLocals.length - 1] !== MODULE_REL,
    'control — with the tag moved to the top of the document, both of those pins would fail');
}
// THE UNDO'S SIX REACHABLE GUARDS, each driven by PLANTING the exact violation
// it claims to catch. A guard that is never made to fire is a guard nobody has
// checked, and its EXACT message is asserted so a mutant cannot pass by raising
// some other error. BASE_IDENTITY is deliberately absent: the helper's header
// states it is a redundant final gate, unreachable once the module digest and
// the whole-document digest have both passed.
{
  const E = 'PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_';
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 1,853 units, not 1,852 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX, MODULE + '\n'),
    E + 'MODULE_IDENTITY', '…so SIZE refuses it, before the separator gate is reached');
  {
    // THE SEPARATOR GATE, reached on its own terms: a module of the RIGHT length
    // and the RIGHT line-feed count that still does not end on a line of code.
    // Without this the gate would be unreachable and its message never proved.
    // The naive mutant — swap the trailing `}\n` for `\n\n` — does NOT reach it:
    // that moves the line-feed count and gate 1 refuses it first. One LF is
    // traded away elsewhere to keep the count, which is what makes the probe
    // land on this gate rather than on the one above it.
    const blankEnded = MODULE.slice(0, -2).replace('\n', ' ') + '\n\n';
    eq(blankEnded.length, MODULE.length, 'control — the blank-ended module is the right length');
    eq((blankEnded.match(/\n/g) || []).length, (MODULE.match(/\n/g) || []).length,
      '…and has the same line-feed count, so only the separator gate can refuse it');
    ok(blankEnded.endsWith('\n\n'), '…and it really does end on a blank line');
    throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('var t0 = Date.now();', 'var t1 = Date.now();');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoPortfolioTechnicalBatchFetch(INDEX, MODULE),
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
console.log('PORTFOLIO_TECHNICAL_BATCH_FETCH_CONTRACT_OK');
}

main();
