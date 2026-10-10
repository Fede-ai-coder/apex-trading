'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO SNAPSHOT FALLBACK — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [719625,722693) in monolith coordinates — 3,068 units raw
// and 3,067 of body, TWO owners, both functions — now live in
// js/portfolio/portfolio-snapshot-fallback.js. `_snapshotSqueezeState` (705)
// projects an entry snapshot's squeeze flag into the 'ACTIVE'/'OFF' string the
// positions row renders, and `_positionFieldsFromSnapshot` (984) derives the
// fallback position fields used ONLY when live streaming data is absent.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #477 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS REWRITTEN, NOT INHERITED — and the reason is the file one
// layer back. That conversion carried its audit's header into the permanent
// contract unchanged, so until this PR that file opened by calling itself a
// TEMPORARY BOUNDARY AUDIT, saying MEASUREMENT ONLY — NOTHING MOVES IN THIS
// PR, and promising that Phase 2 would delete it. All three were false of a
// contract that shipped 2,937 units and is still here; §10 of this file now
// asserts that none of the three survives there. Phase 1 of this cycle had
// already fixed one such sentence further down that same file. Both fixes
// landed a cycle after the text went false, because prose is not executed and
// nothing contradicts it — which is the whole of the lesson.
//
// ── THE FINDING: THE OBJECTION WAS TO THE BOUNDARY, NOT TO THE REGION ──────
//
// Audit #475 published this region as a runner-up and refused it, recording the
// objection as DIFFERENT from the dead rule it retired, and STILL LIVE: the
// region opens on a `// ═══` section header whose section continues past the
// cut, so taking the header would leave `positionManager` — the owner the
// section is named for — with no title. Reading the header confirms that is
// real and not a formality: its prose is about positionManager.
//
// BUT THE OBJECTION ATTACHES TO ONE BOUNDARY, NOT TO THE REGION. §2 measures
// THREE boundaries here and `assertSeam` accepts all three:
//
//   719173  3,519 units  the full header   → positionManager left with no title
//   719625  3,067 units  WHAT THIS LAYER TOOK
//   719847  2,845 units  the declaration   → strands the squeeze paragraph
//
// The cut taken opens 452 units into the header, on the paragraph that
// documents `_snapshotSqueezeState`, and leaves behind exactly the section
// title and positionManager's own description. Every piece of documentation
// travels with the code it describes — which neither of the other two
// boundaries achieves. §6 asserts the screen enumerates ONLY the first, so this
// boundary is a judgement this chain defends rather than something a rule
// produced.
//
// ── COUPLING: byConsumerSplit 1, AND NOTHING SCORED BETTER ─────────────────
//
// ONE consumer, `positionManager`, which sits immediately after the cut. No
// monolith dependency, no inbound write, no property write, no outbound write,
// no sibling module, no static markup, no generated markup, no outbound
// generated reference. The raw nine-direction total is 4 and byConsumerSplit is
// 1. §6 asserts that EXACTLY TWO of the 1,857 clean candidates score 1 and that
// both are the runners-up #475 published — so the screen re-derives nothing.
//
// ── IT LOADS BARE BUT DOES NOT FULLY RUN BARE, AND THAT IS STATED PLAINLY ──
//
// The module LOADS in a completely bare VM and declares exactly its two owners,
// and `_snapshotSqueezeState` RUNS there. `_positionFieldsFromSnapshot` does
// NOT: exercised on a snapshot that reaches the greeks path it throws
// `normalizeGreekPoints is not defined`. It names TWO foundation functions,
// `normalizeGreekPoints` and `normalizeIvrPercent`, over THREE real call sites.
// §7 measures that rather than inheriting the previous layer's property: that
// layer's only free identifiers were intrinsics, and this one's are not. Both
// names belong to already-shipped FOUNDATION modules that load before it, so
// the cut is sound — but "runs in a bare VM" would be false of it.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// THIRD smallest of the forty-three layers the chain now holds, displacing the
// 3,334-unit layer into fourth. TWO layers are smaller: the 1,761-unit one and
// the 2,936-unit one #476 shipped. §8 asserts the rank by measurement — an
// earlier draft of the audit header said "second smallest", carried over from a
// different boundary, and the assertion is what caught it.
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

const UNDO = require('./lib/portfolio-snapshot-fallback-undo.js');
// The layer cut AFTER this one, peeled off before this layer's own document is
// reconstructed. Newest-first, which is the rule the whole chain follows.
const PORTFOLIO_MISSING_UNDERLYINGS_GATE_U = require('./lib/portfolio-missing-underlyings-gate-undo.js');
const PORTFOLIO_PRICE_FRESHNESS_U = require('./lib/portfolio-price-freshness-undo.js');
const PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U = require('./lib/portfolio-underlying-fallback-plan-undo.js');
const PORTFOLIO_GREEKS_FRESHNESS_U = require('./lib/portfolio-greeks-freshness-undo.js');
const RS_SKIP_BREAKDOWN_HTML_U = require('./lib/rs-skip-breakdown-html-undo.js');
const PORTFOLIO_TECHNICAL_BATCH_FETCH_U = require('./lib/portfolio-technical-batch-fetch-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while
// the cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/portfolio-snapshot-fallback.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical at 08a8b04 and here, but only this
// commit carries the audit that §10 asserts was replaced one-for-one.
const BASE_SHA = 'e6e65ec';
// The commit that SHIPPED this layer. "The rename moved no files" is a fact about
// these TWO commits; comparing the base commit's count against the LIVE
// TEST_FILE_COUNT held only until the next cycle ratcheted it — a historical
// value pinned against a live one, the pattern the previous contract had to be
// converted for.
const SHIPPED_SHA = '454f79e';
const BASE_CHARS = 1457675;
const BASE_UTF8 = 1486290;
const BASE_LF = 25203;
const BASE_SHA256 = '4560fd43a857ea60feef29fda90ade7826c39d7e76ce3a8f7794c13b941be19d';
const LOCAL_SCRIPTS = 86;
const TEST_FILE_COUNT = 177;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-snapshot-fallback-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-snapshot-fallback-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-snapshot-fallback-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-snapshot-fallback-contract.spec.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = '454f79e';
const CONTRACT_SPEC_MUTANTS = 108;
const UNDO_REL = 'tests/lib/portfolio-snapshot-fallback-undo.js';
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY, which moves up by one whenever a cycle's audit lands,
// because the audit pins it. At the commit that shipped this layer it was one
// fewer, since Phase 2 RENAMES the file that carries the pin and so adds none.
// The 40 contracts that phase re-chained are a different set — they carry the
// peel, not the suite count.
const RATCHETED_CONTRACTS = 39;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/backend-full-refresh-validation-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 110;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the
// outgoing contract's spec went in Phase 1, which is the rhythm. §10 asserts
// the arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-snapshot-fallback-audit.spec.js';
const RETIRED_MUTANTS = 104;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115066;
const CODE_CHARS = 1342583;
const TOP_LEVEL_DECLS = 919;
const OWNER_REGIONS = 118;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 719625;
const RAW_END_IN_CODE = 722693;
const BODY_END_IN_CODE = 722692;
const RAW_CHARS = 3068;
const BODY_CHARS = 3067;
const BODY_UTF8 = 3115;
const BODY_LF = 51;
const BODY_SHA256 = 'a8d72073de0526c75423c48cfcad2640f05c80afab3ebff927c7dcc07831178d';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// Boolean squeeze from an entry snapshot (1D preferred, then 4H) → the';

// ── Its owners ───────────────────────────────────────────────────────────────
const OWNER_COUNT = 2;
const OWNERS_EXPECTED = ['_snapshotSqueezeState', '_positionFieldsFromSnapshot'];
const OWNER_SIZES = [705, 984];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 51;
const CODE_LINES = 28;
const COMMENT_LINES = 22;
const BLANK_LINES = 1;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the three seam-legal boundaries ──────────────────
// The screen can only open a run at a region start or a declaration start, so
// it sees the first of these and not the one this audit recommends.
const HEADER_AT = 719173;
const HEADER_UNITS = 3519;
const DECL_AT = 719847;
const DECL_UNITS = 2845;
const HEADER_LEFT = 452;
const DOC_TAKEN = 222;
const DOC_TAKEN_LINES = 3;
const SEAM_LEGAL_BOUNDARIES = 3;
// THE FOURTH OPTION: take the whole section, keeper included. That resolves the
// title objection by leaving nothing orphaned — and §4 measures what it costs.
const WHOLE_SECTION_END = 728378;
const WHOLE_SECTION_UNITS = 9205;
const WHOLE_SECTION_OWNERS = 3;
const WHOLE_SECTION_NINE = 63;
const WHOLE_SECTION_BCS = 27;
const WHOLE_SECTION_CONSUMERS = 14;
const WHOLE_SECTION_DEPS = 4;
const WHOLE_SECTION_SIB = 5;
const CANDIDATES_AT_HEADER = 2;

// ── The section it cuts inside ───────────────────────────────────────────────
const SECTION_AT = 719173;
const SECTION_END = 728379;
const SECTION_CHARS = 9206;
const SECTION_OWNERS = 3;
const SECTION_KEEPER = 'positionManager';
const SECTION_KEEPER_CHARS = 5684;
const SECTION_TITLE = '// PORTFOLIO MANAGER — state + CRUD';
const HEADER_CHARS = 674;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 4;
const BY_CONSUMER = 4;
const BY_CONSUMER_SPLIT = 1;
const CONSUMER = 'positionManager';
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 3;
const FOUNDATION_NAMES = ['normalizeGreekPoints', 'normalizeIvrPercent'];
const EVALUATION_TIME_READS = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['_snapshotSqueezeState', '_positionFieldsFromSnapshot'];
const BARE_RUNNER = '_snapshotSqueezeState';
const NOT_BARE_RUNNER = '_positionFieldsFromSnapshot';
const NOT_BARE_ERROR = 'normalizeGreekPoints is not defined';

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7368;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3021;
const CLEAN_CANDIDATES = 1857;
const ONE_CONSUMER_SPLIT = 2;
const BETTER_SCORING = 0;
const RUNNER_UP_AT = 941317;
const RUNNER_UP_END = 943169;
const RUNNER_UP_UNITS = 1852;
const RUNNER_UP_OWNER = '_fetchPortfolioTechnicalBatch';
const RUNNER_UP_NINE = 4;

// ── Where it sits ────────────────────────────────────────────────────────────
const CHAIN_LENGTH = 43;
const SMALLEST_LAYER_CHARS = 1761;
const SECOND_SMALLEST_LAYER_CHARS = 2936;
const DISPLACED_LAYER_CHARS = 3334;
const LARGEST_LAYER_CHARS = 71811;
const SIZE_RANK = 3;
const LAYERS_LARGER_THAN_THIS_CUT = 40;
// Two shape counts over the whole chain. This layer changes NEITHER — it is not
// pure ASCII and it does not open on a `── ` banner — so §8 asserts each over
// the 43 layers AND over the 42 that preceded it, and that the two agree. A
// count carried forward unmeasured is how "unchanged" stops being true.
const PURE_ASCII_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 23;

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 2998;
const INDEX_AFTER = 1454677;
const RESIDUAL_MONOLITH = 1339515;
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


console.log('PORTFOLIO SNAPSHOT FALLBACK — PERMANENT BOUNDARY CONTRACT');
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
const PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN = PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.isApplied(PRE_PORTFOLIO_PRICE_FRESHNESS)
  ? PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.undoPortfolioUnderlyingFallbackPlan(
      PRE_PORTFOLIO_PRICE_FRESHNESS, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-underlying-fallback-plan.js'), 'utf8'))
  : PRE_PORTFOLIO_PRICE_FRESHNESS;
const PRE_PORTFOLIO_GREEKS_FRESHNESS = PORTFOLIO_GREEKS_FRESHNESS_U.isApplied(PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN)
  ? PORTFOLIO_GREEKS_FRESHNESS_U.undoPortfolioGreeksFreshness(
      PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-greeks-freshness.js'), 'utf8'))
  : PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN;
const PRE_RS_SKIP_BREAKDOWN_HTML = RS_SKIP_BREAKDOWN_HTML_U.isApplied(PRE_PORTFOLIO_GREEKS_FRESHNESS)
  ? RS_SKIP_BREAKDOWN_HTML_U.undoRsSkipBreakdownHtml(
      PRE_PORTFOLIO_GREEKS_FRESHNESS, fs.readFileSync(path.join(ROOT, 'js/ui/rs-skip-breakdown-html.js'), 'utf8'))
  : PRE_PORTFOLIO_GREEKS_FRESHNESS;
const LIVE_INDEX = PORTFOLIO_TECHNICAL_BATCH_FETCH_U.isApplied(PRE_RS_SKIP_BREAKDOWN_HTML)
  ? PORTFOLIO_TECHNICAL_BATCH_FETCH_U.undoPortfolioTechnicalBatchFetch(
      PRE_RS_SKIP_BREAKDOWN_HTML, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-batch-fetch.js'), 'utf8'))
  : PRE_RS_SKIP_BREAKDOWN_HTML;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX, MODULE);
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

// ── The screen, run ONCE and reused by §5 and §6 ─────────────────────────────
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
// list ends at its own layer and the next cycle reads it from here. The audit's
// sentence that described the READ is gone rather than left standing above the
// literal that replaced it: that is precisely the defect this cycle's Phase 1
// had to repair one file back.
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
];
const CHAIN_SET = new Set(CHAIN);
// THE SELF-INCLUSION GUARD. CHAIN now ends at THIS layer and this file is its
// contract, so any census over CHAIN that reads contracts counts this cut as
// evidence for a claim about the layers that preceded it. Every such census
// runs over PRIOR_LAYERS and asserts this layer's own half separately — the
// trap that fired five times two cycles ago, in exactly these places.
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
// THE PREVIOUS LAYER'S OWN FORECAST, checked. #476's contract predicted the
// residual monolith this contract measures, so the two cycles are joined by a
// number rather than by a sentence. It is read from PREVIOUS_CONTRACT: that
// file was the newest at this base, and THIS file is the newest now.
eq(CODE.length, Number(fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8')
  .match(/^const RESIDUAL_MONOLITH = (\d+);$/m)[1]),
'…which is exactly the RESIDUAL_MONOLITH the previous contract forecast');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The region, its seam, and the boundary judgement');
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
  eq(next.name, SECTION_KEEPER,
    '…and the declaration immediately after the cut is the owner that keeps the section');
}

// THE BOUNDARY IS A JUDGEMENT, AND THERE ARE THREE SEAM-LEGAL ONES.
// This is the heart of the audit: assertSeam accepts all three, so mechanics do
// not choose between them. §4 defends the choice.
{
  const boundaries = [HEADER_AT, RAW_AT_IN_CODE, DECL_AT];
  eq(boundaries.length, SEAM_LEGAL_BOUNDARIES, 'SEAM_LEGAL_BOUNDARIES boundaries are measured');
  for (const at of boundaries) {
    eq(assertSeam(CODE, at, BODY_END_IN_CODE), RAW_END_IN_CODE,
      'assertSeam accepts the boundary at ' + at + ', so the seam does not decide');
    ok(at === 0 || CODE[at - 1] === '\n', '…and it opens on a line start');
  }
  eq(BODY_END_IN_CODE - HEADER_AT, HEADER_UNITS, 'the header-inclusive boundary is HEADER_UNITS');
  eq(BODY_END_IN_CODE - DECL_AT, DECL_UNITS, '…the declaration boundary DECL_UNITS');
  eq(RAW_AT_IN_CODE - HEADER_AT, HEADER_LEFT,
    '…and the recommendation opens HEADER_LEFT units into the header, which is what stays');
  eq(DECL_AT - RAW_AT_IN_CODE, DOC_TAKEN, '…taking DOC_TAKEN units of prose with it');
  eq(HEADER_LEFT + DOC_TAKEN, HEADER_CHARS,
    '…control — the two halves of the header close on HEADER_CHARS, so neither drifts alone');
  eq(BODY_CHARS, HEADER_UNITS - HEADER_LEFT,
    '…so the recommendation is the header-inclusive cut less the title it leaves behind');
}
// WHAT THE RECOMMENDATION TAKES is the paragraph documenting the first owner.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES of comment');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…and every line of it is a comment, so the cut takes prose and no code');
  eq(firstLineOf(doc), DOC_FIRST_LINE, '…opening on DOC_FIRST_LINE');
  ok(doc.indexOf('squeeze') >= 0,
    '…and it documents the squeeze helper, which is why it belongs with the cut');
}
// WHAT IT LEAVES BEHIND is the section title and the keeper's own description.
{
  const left = CODE.slice(HEADER_AT, RAW_AT_IN_CODE);
  eq(left.length, HEADER_LEFT, 'what is left of the header is HEADER_LEFT units');
  ok(left.indexOf(SECTION_TITLE) >= 0, '…and it still contains the section title');
  ok(left.indexOf(SECTION_KEEPER) >= 0,
    '…and names the owner that keeps the section, so the title is not orphaned');
  eq(HEADER_CHARS, DECL_AT - HEADER_AT, 'the whole header is HEADER_CHARS units');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, and nothing better in the screen');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly these names');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  // THE OWNERS BY DECLARATION, not only by the profile's name list. OWNER_SIZES
  // was declared and read by NOTHING in the first draft, and the mutation pass
  // is what found it — the same defect MODULE_REL had one cycle ago.
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are those names');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units respectively');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…both of them functions, so this layer would ship no mutable binding');
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names NO monolith declaration at all: the dependency direction is empty');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in, and it is CONSUMER');
{
  const keeper = BY_NAME.get(SECTION_KEEPER);
  ok(keeper.start >= RAW_END_IN_CODE,
    '…which sits AFTER the cut, so the consumer is the immediate neighbour');
  eq(keeper.chars, SECTION_KEEPER_CHARS, '…and is SECTION_KEEPER_CHARS units');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation call sites');
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
// THE COUPLING IS THE SAME AT ALL THREE BOUNDARIES, because comments carry no
// references. That is why the boundary is a judgement and not an optimisation.
{
  for (const at of [HEADER_AT, RAW_AT_IN_CODE, DECL_AT]) {
    const p = profileOf([at, RAW_END_IN_CODE]);
    eq(p.nine, FULL_NINE, 'the nine-direction total is FULL_NINE at boundary ' + at);
    eq(consumersOf(p), [CONSUMER], '…with the same single consumer');
    eq(p.deps, MONOLITH_DEPENDENCIES, '…and the same empty dependency direction');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the objection was to the boundary, not the region');
// ─────────────────────────────────────────────────────────────────────────────
// #475 PUBLISHED THIS REGION AS A RUNNER-UP AND REFUSED IT, recording the
// objection as DIFFERENT from the dead rule it retired and STILL LIVE. Both
// halves are read out of that contract rather than recalled.
{
  const newest = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  eq(Number(newest.match(/^const RUNNER_UP_B_AT = (\d+);$/m)[1]), SECTION_AT + 0,
    'the previous contract pins this region as its RUNNER_UP_B, at the section start');
  eq(newest.match(/^const RUNNER_UP_B_OWNER = '([^']+)';$/m)[1], OWNERS_EXPECTED[0],
    '…naming the owner this cut opens on');
  ok(newest.indexOf('DIFFERENT and still live') >= 0,
    '…and recording its objection as different and STILL LIVE, in those words');
  ok(newest.indexOf('with no title') >= 0,
    '…the objection being that taking the header leaves an owner with no title');
}
// THE OBJECTION IS REAL AT THE BOUNDARY THE SCREEN SEES.
{
  const reg = REGIONS.filter((r) => r.start === SECTION_AT)[0];
  eq(reg.start, SECTION_AT, 'the section region opens at SECTION_AT');
  eq(reg.end, SECTION_END, '…and ends at SECTION_END');
  eq(reg.end - reg.start, SECTION_CHARS, '…SECTION_CHARS units');
  ok(/^\/\/ ═+/.test(lineAt(reg.start)), '…opening on a `// ═══` section header');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, SECTION_OWNERS, '…holding SECTION_OWNERS owners');
  eq(own.map((d) => d.name), OWNERS_EXPECTED.concat([SECTION_KEEPER]),
    '…the two this cut takes, and the one that keeps the section');
  ok(reg.end > RAW_END_IN_CODE, '…and the section CONTINUES past the cut');
  // THE TITLE IS THE KEEPER'S, not the helpers'. Measured, not asserted from
  // the name: the header's prose names it.
  const header = CODE.slice(HEADER_AT, DECL_AT);
  ok(header.indexOf(SECTION_KEEPER) >= 0,
    'the header names SECTION_KEEPER, so the title is the keeper\'s');
  ok(header.indexOf(SECTION_TITLE) >= 0, '…under SECTION_TITLE');
  eq(header.length, HEADER_CHARS, '…and the header is HEADER_CHARS units');
}
// AND THAT IS WHY THE RECOMMENDATION MOVES THE BOUNDARY RATHER THAN THE RULE.
// The header-inclusive cut would strand the title; the declaration cut would
// strand the squeeze paragraph. Only the chosen one leaves each piece of prose
// with the code it describes, and all three are seam-legal — so this is a
// judgement, measured here, and not a rule anybody could compute.
// THE FOURTH WAY TO RESOLVE IT — take the keeper too — is PRICED, not dismissed.
// It orphans nothing, and that is exactly why it has to be measured rather than
// waved away: the cost is coupling, by a factor the chosen boundary avoids.
{
  const whole = profileOf([HEADER_AT, WHOLE_SECTION_END + 1]);
  const wsplit = outboundSplit(HEADER_AT, WHOLE_SECTION_END + 1);
  eq(whole.names.length, WHOLE_SECTION_OWNERS, 'the whole-section cut takes WHOLE_SECTION_OWNERS owners');
  ok(whole.names.indexOf(SECTION_KEEPER) >= 0, '…the keeper among them, so nothing is orphaned');
  eq(WHOLE_SECTION_END - HEADER_AT, WHOLE_SECTION_UNITS, '…over WHOLE_SECTION_UNITS units');
  eq(whole.nine, WHOLE_SECTION_NINE, '…but it scores WHOLE_SECTION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_SECTION_BCS, '…and WHOLE_SECTION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_SECTION_CONSUMERS, '…with WHOLE_SECTION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_SECTION_DEPS, '…WHOLE_SECTION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_SECTION_SIB, '…and WHOLE_SECTION_SIB sibling modules');
  ok(WHOLE_SECTION_BCS > BY_CONSUMER_SPLIT && WHOLE_SECTION_NINE > FULL_NINE
    && WHOLE_SECTION_DEPS > MONOLITH_DEPENDENCIES.length,
  '…so resolving the objection by swallowing the keeper is strictly worse on every axis this '
  + 'programme ranks by, which is why the boundary moves instead');
}
{
  const headerCut = CODE.slice(HEADER_AT, DECL_AT);
  ok(headerCut.indexOf(SECTION_TITLE) >= 0,
    'the header-inclusive boundary would take SECTION_TITLE away from its owner');
  const declCut = CODE.slice(HEADER_AT, RAW_AT_IN_CODE);
  ok(declCut.indexOf('squeeze') < 0,
    'the declaration boundary would leave the squeeze paragraph behind…');
  ok(CODE.slice(RAW_AT_IN_CODE, DECL_AT).indexOf('squeeze') >= 0,
    '…which documents an owner that left, so that prose would be stranded');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The runner-up, and why its own refusal has expired');
// ─────────────────────────────────────────────────────────────────────────────
// THE OTHER CANDIDATE SCORING 1 is the SAME one #475 published as RUNNER_UP_A,
// and its refusal there was RELATIVE: it lost to a cut scoring 1 on the raw
// nine. That cut has shipped, so the comparison no longer exists — which is a
// fact about the chain, measured here rather than argued.
{
  const newest = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  eq(newest.match(/^const RUNNER_UP_A_OWNER = '([^']+)';$/m)[1], RUNNER_UP_OWNER,
    'the previous contract pins RUNNER_UP_A_OWNER as this candidate');
  const shippedNine = Number(newest.match(/^const FULL_NINE = (\d+);$/m)[1]);
  eq(shippedNine, 1, '…and the cut it lost to scored 1 on the raw nine');
  ok(shippedNine < RUNNER_UP_NINE,
    '…strictly better than the runner-up, which is why it was refused');
  ok(fs.existsSync(path.join(ROOT, newest.match(/^const MODULE_REL = '([^']+)';$/m)[1])),
    '…and that cut has SHIPPED: its module exists, so the comparison has expired');
}
{
  const p = profileOf([RUNNER_UP_AT, RUNNER_UP_END + 1]);
  eq(p.names, [RUNNER_UP_OWNER], 'the runner-up is RUNNER_UP_OWNER');
  eq(p.nine, RUNNER_UP_NINE, '…scoring RUNNER_UP_NINE on the raw nine, the SAME as this cut');
  eq(assertSeam(CODE, RUNNER_UP_AT, RUNNER_UP_END), RUNNER_UP_END + 1,
    '…and its boundary is a real seam, anchored rather than left to arithmetic');
  eq(RUNNER_UP_END - RUNNER_UP_AT, RUNNER_UP_UNITS, '…of RUNNER_UP_UNITS units');
  ok(RUNNER_UP_UNITS < BODY_CHARS,
    '…smaller than this cut, which is the tiebreak the screen ranks by');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and what the screen cannot see');
// ─────────────────────────────────────────────────────────────────────────────
eq(RUN_FLOOR, 1500, 'the screen floors runs at RUN_FLOOR units');
eq(rawRunCount, RAW_RUNS, 'it enumerates RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…of which assertSeam refuses SEAM_REJECTED');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
const cleanRuns = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
eq(cleanRuns.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
{
  const ones = cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT);
  eq(ones.length, ONE_CONSUMER_SPLIT,
    'ONE_CONSUMER_SPLIT clean candidates score byConsumerSplit 1');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) < BY_CONSUMER_SPLIT).length,
    BETTER_SCORING, '…and BETTER_SCORING score better: nothing does');
  // BOTH OF THEM ARE THE RUNNERS-UP #475 PUBLISHED, so this screen re-derives
  // nothing. The count and the identities are pinned together.
  eq(ones.map((c) => c.lo).sort((a, b) => a - b), [SECTION_AT, RUNNER_UP_AT],
    '…and they are exactly the two runners-up the previous contract published');
}
// THE SCREEN CANNOT SEE THE RECOMMENDED BOUNDARY. It opens runs at a region
// start or a declaration start, and the recommendation is neither — which is
// precisely why the boundary is a judgement this audit defends.
eq(cleanRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
  'the screen does NOT enumerate the recommended boundary');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
  '…not even before the load-time filter, so it is absent by construction');
eq(cleanRuns.filter((c) => c.lo === HEADER_AT).length, CANDIDATES_AT_HEADER,
  '…while it DOES enumerate CANDIDATES_AT_HEADER opening on the header');
eq(cleanRuns.filter((c) => c.lo === HEADER_AT).map((c) => c.units).sort((a, b) => a - b),
  [HEADER_UNITS, WHOLE_SECTION_UNITS],
  '…the header-inclusive cut with the objection, and the whole-section cut §4 prices');
ok(RAW_AT_IN_CODE !== HEADER_AT && RAW_AT_IN_CODE !== DECL_AT,
  '…and the recommendation is neither a region start nor a declaration start');

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare — and does NOT fully run bare, which is stated');
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
    'it LOADS in a completely bare VM and declares exactly its two owners');
  // THE FIRST OWNER RUNS THERE.
  eq(vm.runInContext(BARE_RUNNER + '({})', ctx), null,
    BARE_RUNNER + ' RUNS bare: an empty snapshot yields null, not a throw');
  // THE SECOND DOES NOT, and that is the honest difference from the previous
  // layer, whose only free identifiers were intrinsics. Asserted by its EXACT
  // message so a mutant cannot pass by throwing something else.
  // NOT `throwsWith`: the error is raised inside the VM's OWN realm, so its
  // `instanceof Error` is false against the host realm's constructor even
  // though the message matches exactly. The message is asserted directly, and
  // the throw is asserted separately so a silent return cannot pass.
  const snap = JSON.stringify({ delta: 0.1094, theta: -0.5, ivRank: 0.45 });
  let raised = null;
  try {
    vm.runInContext(NOT_BARE_RUNNER + '({entrySnapshot:' + snap + '}, {qty:1})', ctx);
  } catch (e) { raised = e; }
  ok(raised !== null,
    NOT_BARE_RUNNER + ' does NOT run bare: on a snapshot that reaches the greeks path it throws');
  eq(raised && raised.message, NOT_BARE_ERROR,
    '…with EXACTLY the NOT_BARE_ERROR message, because it names a foundation function');
  eq(raised && raised.name, 'ReferenceError', '…and it is a ReferenceError, not some other fault');
  // CONTROL: the previous layer DID run bare, so this is a difference and not
  // a property of every layer.
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  const prevMod = fs.readFileSync(path.join(ROOT, prev.match(/^const MODULE_REL = '([^']+)';$/m)[1]), 'utf8');
  const prevCtx = vm.createContext(Object.create(null));
  vm.runInContext(prevMod, prevCtx);
  ok(Object.getOwnPropertyNames(prevCtx).length > 0,
    'control — the previous layer loads bare too, so loading is not the difference');
}
// THE NAMES IT REACHES OUT TO ARE FOUNDATION, not chain: already shipped and
// loaded before it, which is why the cut is sound despite not running bare.
{
  for (const n of FOUNDATION_NAMES) {
    eq(OWNER_KIND.get(n), 'foundation', n + ' belongs to a FOUNDATION module, not the chain');
    ok(!CHAIN_SET.has(n), '…and is not a chain path');
  }
  eq(outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE).chain, CHAIN_OUTBOUND,
    '…so the chain-outbound direction stays CHAIN_OUTBOUND');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Where this layer sits');
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
    'this layer ranks SIZE_RANK by size — the THIRD smallest, and the contract says so '
    + 'rather than selling a 3,067-unit cut as a substantial one');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in,
  // rather than being left to make the total drift by one forever.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  // sizes NOW CONTAINS THIS LAYER, so slot 2 is this cut and the layer it
  // displaced has moved to slot 3. The audit read slot 2 for the displaced
  // layer because the chain excluded this one; both slots are asserted here so
  // the displacement is measured rather than assumed to have happened.
  eq(sizes[1], SECOND_SMALLEST_LAYER_CHARS,
    '…the second smallest being SECOND_SMALLEST_LAYER_CHARS, the layer the previous cycle shipped');
  eq(sizes[2], BODY_CHARS, '…this layer occupying the third-smallest slot itself');
  eq(sizes[3], DISPLACED_LAYER_CHARS,
    '…and the layer it displaced into FOURTH place is DISPLACED_LAYER_CHARS units');
  ok(BODY_CHARS > SECOND_SMALLEST_LAYER_CHARS && BODY_CHARS < DISPLACED_LAYER_CHARS,
    '…so the rank is three because it sits strictly between those two, and TWO layers are '
    + 'smaller than it rather than one');
  // THE TWO SHAPE COUNTS, over the whole chain AND over the chain before this
  // layer. Both are unchanged, and "unchanged" is asserted as an equality
  // between two measurements rather than carried forward as a number.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const asciiOf = (ss) => ss.filter((s) => !/[^\x00-\x7F]/.test(s)).length;
  const bannerOf = (ss) => ss.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length;
  eq(asciiOf(sources), PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS shipped layers are pure ASCII');
  eq(asciiOf(prior), PURE_ASCII_LAYERS,
    '…the same count before this layer, because this module is NOT pure ASCII');
  ok(/[^\x00-\x7F]/.test(MODULE), '…which is asserted of the module directly, not inferred');
  eq(bannerOf(sources), LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  eq(bannerOf(prior), LAYERS_OPENING_ON_BANNER,
    '…the same count before this layer, because this module does NOT open on one');
  ok(!/^\/\/ ── /.test(MODULE.split('\n')[0]),
    '…which is asserted of the module directly: it opens on a plain doc comment');
}
// WHAT THE RELOCATION COST THE DOCUMENT — the audit forecast these three before
// anything moved, and §9 holds the shipped document to them.
eq(UNDO.TAG.length, RAW_CHARS - NET_REDUCTION,
  'the tag it added is RAW_CHARS less NET_REDUCTION units');
eq(UNDO.TAG, '<script src="./' + MODULE_REL + '"></script>\n',
  '…and names the module this layer shipped');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html lands at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
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
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-technical-batch-fetch.js', 'js/ui/rs-skip-breakdown-html.js', 'js/portfolio/portfolio-greeks-freshness.js', 'js/portfolio/portfolio-underlying-fallback-plan.js', 'js/portfolio/portfolio-price-freshness.js', 'js/portfolio/portfolio-missing-underlyings-gate.js'].sort(),
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
  {
    // `.pop()` drops the PHANTOM final element `split('\n')` leaves on text
    // ending in a newline — the named scratch-tool failure this repository
    // records, and the one this very assertion hit on its first draft, reading
    // 2 blank lines where the module has one.
    const modLines = MODULE.split('\n');
    modLines.pop();
    eq(modLines.length, SPLIT_LINES, '…the module is SPLIT_LINES real lines');
    eq(modLines.filter((l) => !l.trim()).length, BLANK_LINES,
      '…carrying BLANK_LINES blank line INSIDE it, which is why the ENDING is what the '
      + 'separator gate checks and not the presence of a blank line anywhere');
  }
  eq(MODULE.split('\n')[0], DOC_FIRST_LINE,
    'and the module OPENS on DOC_FIRST_LINE: the documentation travelled with its code, '
    + 'which is the whole of the boundary judgement §2 defends');
}
// THE UNDO'S SIX REACHABLE GUARDS, each driven by PLANTING the exact violation
// it claims to catch. A guard that is never made to fire is a guard nobody has
// checked, and its EXACT message is asserted so a mutant cannot pass by raising
// some other error. BASE_IDENTITY is deliberately absent: the helper's header
// states it is a redundant final gate, unreachable once the module digest and
// the whole-document digest have both passed.
{
  const E = 'PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_';
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 3,068 units, not 3,067 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX, MODULE + '\n'),
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
    throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('var out = {};', 'var out = [];');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoPortfolioSnapshotFallback(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoPortfolioSnapshotFallback(INDEX, MODULE),
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
    + 'outgoing CONTRACT\'s spec that goes in Phase 1 instead');
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
// THE PREVIOUS CONTRACT'S HEADER, repaired by this PR and asserted here so the
// repair cannot be undone silently. That file opened by describing itself as a
// temporary audit that moved nothing and would be deleted — three claims the
// cut it shipped had already falsified. This is the §10 reference the header of
// this file makes, and it is checked against the file rather than remembered.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  const NOTE = '// ── A NOTE ON THESE FIRST LINES, repaired one cycle late ';
  const noteAt = prev.indexOf(NOTE);
  ok(noteAt > 0, 'the previous contract carries the delimited repair note');
  eq(prev.split(NOTE).length - 1, 1, '…exactly once, so the delimiter is unambiguous');
  // THE CLAIM IS ABOUT SELF-DESCRIPTION, so it is scoped to the text ABOVE the
  // note. The note itself QUOTES the three phrases to record what was repaired,
  // and a blanket "appears nowhere" check would be refuted by that quotation —
  // which is exactly how the first draft of this assertion failed.
  const selfDescription = prev.slice(0, noteAt);
  for (const phrase of ['TEMPORARY BOUNDARY AUDIT', 'MEASUREMENT ONLY',
    'Phase 2 deletes this file']) {
    eq(selfDescription.indexOf(phrase), -1,
      'the previous contract no longer DESCRIBES ITSELF with "' + phrase + '"');
  }
  ok(noteAt < prev.indexOf('\nconst assert'),
    '…and the note sits inside the header block, not loose in the body');
  eq(prev.split('\n')[3], '// BACKEND FULL-REFRESH VALIDATION — PERMANENT BOUNDARY CONTRACT.',
    '…its title line naming it what it is: a permanent contract');
  ok(git(['show', BASE_SHA + ':' + PREVIOUS_CONTRACT])
    .indexOf('// BACKEND FULL-REFRESH VALIDATION — TEMPORARY BOUNDARY AUDIT.') >= 0,
  '…while the BASE commit really did carry the false title, so this is a repair of '
  + 'something that was there and not a guard against something imagined');
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_SNAPSHOT_FALLBACK_CONTRACT_OK');
}

main();
