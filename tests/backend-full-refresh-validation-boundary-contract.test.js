'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND FULL-REFRESH VALIDATION — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [910727,913664) in monolith coordinates — 2,937 units raw
// and 2,936 of body, ONE owner — now live in
// js/portfolio/backend-full-refresh-validation.js.
// `_validateBackendFullRefreshPayload` (2,709) checks a backend full-refresh
// payload before any legacy step is skipped and returns
// `{ valid, warnings[] }` — a pure function over its two arguments, with no
// side effects and no globals of any kind.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE: the undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, which is what
// keeps the coordinates inherited from audit #475 proved rather than remembered.
//
// ── A NOTE ON THESE FIRST LINES, repaired one cycle late ───────────────────
//
// THEY WERE WRONG FOR A CYCLE. The Phase 2 conversion carried the audit's
// header over unchanged, so this file opened by calling itself a TEMPORARY
// BOUNDARY AUDIT, saying MEASUREMENT ONLY — NOTHING MOVES IN THIS PR, and
// promising that Phase 2 would delete it. All three were false the moment the
// cut shipped. The contract one layer forward asserts that no such phrase
// survives ABOVE this note — the quotes in this paragraph are the record of
// the repair, not a description of the file — so it is checked, not re-read.
//
// ── THE FINDING: A REFUSAL THAT OUTLIVED ITS REASON ────────────────────────
//
// This region has been visible to the screen and NOT taken for two shipped
// cycles. Both contracts that record it say the same thing: a lone owner
// inside the 69,258-unit `[PortfolioRefreshPayload]` banner region, which
// holds 27 owners and is the mis-labelled catch-all audit #466 named.
//
// THAT IS THE DEAD RULE, WEARING A DESCRIPTION. *"Never cut inside a `// ── `
// banner region"* is pinned as DEAD in §5(c) of
// tests/journal-map-audit-boundary-contract.test.js, and the last TWO layers
// this programme shipped cut inside banner regions on purpose and published
// what obeying the rule would have cost. The ground for passing over this
// region had already been removed by the programme's own work, and nothing
// went back to re-read the refusal. §4 measures both halves of that rather
// than asserting it: the two contracts that name it, and the contract that
// kills the rule.
//
// AND THE COST OF OBEYING IT HERE IS THE LARGEST THE CHAIN HAS MEASURED.
// Taking the whole banner region instead would add 66,321 units and 26 owners,
// and take byConsumer from ONE to 64 across NINE consumers, with 23 monolith
// dependencies where this cut has none. §5(c) measures both sides.
//
// ── COUPLING: EVERY DIRECTION IS ZERO BUT ONE ──────────────────────────────
//
// ONE reference reaches in, from ONE consumer, at ONE site. Nothing else, in
// any direction: no monolith dependency, no inbound write, no property write,
// no outbound write, no sibling module, no static markup, no generated markup,
// no outbound generated reference, and both halves of the ninth are zero.
// The nine-direction total is 1 — which is the lowest a region that is
// referenced at all can score.
//
// AND THAT IS UNIQUE IN THE SCREEN, counted rather than claimed: of the 1,878
// clean candidates, EXACTLY ONE scores `byConsumer == 1`, and §6 asserts the
// count and the identity together. The audit says "one of 1,878" rather than
// "the cleanest", because the first is checkable and the second is the shape
// of claim this repository has been wrong about four times.
//
// ── THE BOUNDARY JUDGEMENT: THE CUT TAKES ITS OWN DOCUMENTATION ────────────
//
// The screen enumerates runs that begin at a region start or a declaration
// start, so what it can see is the FUNCTION alone, at [910953,913664). The
// recommendation opens 226 units earlier, on the three-line comment block that
// says what the function validates and what it returns.
//
// COUPLING IS IDENTICAL EITHER WAY — §2 measures both and they agree on all
// nine directions, because comments carry no references. What changes is
// whether the module ships the sentences that explain it. `assertSeam` accepts
// both boundaries; this is a judgement, not a rule, and §2 is where it is
// defended.
//
// ── WHERE IT WOULD SIT ─────────────────────────────────────────────────────
//
// SECOND SMALLEST of the forty-one shipped layers, displacing the 3,334-unit
// layer #474 shipped into third; only the 1,761-unit layer is smaller. §8
// asserts the rank by measurement and states it plainly rather than selling a
// 2,936-unit cut as a large one. The case for it is coupling.
//
// ── THE TWO RUNNERS-UP, PUBLISHED WITH THEIR NUMBERS ───────────────────────
//
// §5 records both remaining candidates that score 1, so the next cycle need
// not re-derive them — which is exactly what audit #470 did for the region
// #473 went on to take:
//
//   `_fetchPortfolioTechnicalBatch` — 1,852 units, one consumer, nine of 4.
//       It sits in the SAME catch-all as this cut and is refused on the same
//       axis the screen ranks by: smaller, and more coupled on the nine.
//   `_snapshotSqueezeState` + `_positionFieldsFromSnapshot` — 3,519 units, one
//       consumer, nine of 4. Its objection is DIFFERENT and still live: it
//       opens ON a `// ═══` section header whose region continues past the
//       cut, so taking the header would leave the owner that keeps the section
//       with no title. That is the defect audit #462 published, and §5
//       re-measures it rather than recalling it.
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

const UNDO = require('./lib/backend-full-refresh-validation-undo.js');
// The layer cut AFTER this one, peeled off before this layer's own document is
// reconstructed. Newest-first, which is the rule the whole chain follows.
const PORTFOLIO_TECHNICAL_BATCH_FETCH_U = require('./lib/portfolio-technical-batch-fetch-undo.js');
const PORTFOLIO_SNAPSHOT_FALLBACK_U = require('./lib/portfolio-snapshot-fallback-undo.js');

// The module this layer shipped. The audit called it MODULE_REL while
// the cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/backend-full-refresh-validation.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical at f00e596 and here, but only this
// commit carries the audit that §10 asserts was replaced one-for-one.
const BASE_SHA = 'c7efffc';
// The commit that SHIPPED this layer. The "the rename moved no files" claim is
// a fact about these TWO commits; an earlier draft compared the base commit's
// count against the LIVE TEST_FILE_COUNT, which held only until the next cycle
// ratcheted it — a historical value pinned against a live one.
const SHIPPED_SHA = '08a8b04';
const BASE_CHARS = 1460538;
const BASE_UTF8 = 1489157;
const BASE_LF = 25260;
const BASE_SHA256 = '3bfa332025683970702a7a889f5f8d0ce35ec49f0ba4eca836d3c6adca3f965c';
const LOCAL_SCRIPTS = 85;
const TEST_FILE_COUNT = 173;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-backend-full-refresh-validation-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/backend-full-refresh-validation-audit.spec.js';
const CONTRACT_REL = 'tests/backend-full-refresh-validation-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/backend-full-refresh-validation-contract.spec.js';
// THIS CONTRACT'S SPEC IS RETIRED, by the next cycle's Phase 1 as the rhythm
// runs, so it can no longer be `require`d. What it held is a fact about the
// commit that last carried it and stays true forever.
const SPEC_RETIRED_FROM = '08a8b04';
const CONTRACT_SPEC_MUTANTS = 131;
const UNDO_REL = 'tests/lib/backend-full-refresh-validation-undo.js';
const RATCHETED_CONTRACTS = 35;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/portfolio-leg-quantity-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 135;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the
// outgoing contract's spec went in Phase 1, which is the rhythm. §10 asserts
// the arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/backend-full-refresh-validation-audit.spec.js';
const RETIRED_MUTANTS = 129;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next cycle's audit spec after its Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114992;
const CODE_CHARS = 1345520;
const TOP_LEVEL_DECLS = 920;
const TOP_LEVEL_BANNERS = 219;
const OWNER_REGIONS = 118;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 910727;
const RAW_END_IN_CODE = 913664;
const BODY_END_IN_CODE = 913663;
const RAW_CHARS = 2937;
const BODY_CHARS = 2936;
const BODY_UTF8 = 2940;
const BODY_LF = 57;
const BODY_SHA256 = '1a9044a67603bea70723a6645008411f3f5fca719e1eede414b1a9a43b45cf34';
const BODY_ENDING = '}\n';
const OWNERS_EXPECTED = ['_validateBackendFullRefreshPayload'];
const OWNER_COUNT = 1;
const OWNER_SIZES = [2709];
// `split('\n')` on text ending in a newline leaves a PHANTOM empty final
// element — a named way this repository's scratch tools have been wrong. The
// three real counts below sum to BODY_LF, not to SPLIT_LINES.
const SPLIT_LINES = 58;
const CODE_LINES = 46;
const COMMENT_LINES = 11;
const BLANK_LINES = 0;
// The doc block the cut OPENS on, and the boundary judgement §2 defends.
const DOC_BLOCK_CHARS = 226;
const DOC_BLOCK_LINES = 3;
const DOC_FIRST_LINE =
  '// Validates a backend full-refresh payload before any legacy step is skipped.';
// What the screen can see on its own: the function without its documentation.
const FN_ONLY_AT = 910953;
const FN_ONLY_UNITS = 2711;
const NET_REDUCTION = 2863;
const RESIDUAL_MONOLITH = 1342583;
const INDEX_AFTER = 1457675;
const TAG_GAP = 910735;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [1012324];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = [];
const LAYERS_PINNING_DEPENDENCIES = 21;
const LAYERS_WITH_NO_DEPENDENCY = 7;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const FULL_NINE = 1;
const BY_CONSUMER = 1;
const BY_CONSUMER_SPLIT = 1;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 1;
// It needs NOTHING injected: the only free identifiers are these intrinsics.
const HOST_GLOBAL_REFS = { Object: 1, Array: 5, String: 1, isFinite: 2, parseFloat: 2 };

// ── THE FINDING: a refusal that outlived its reason ──────────────────────────
const AHEAD_NAMING_CONTRACTS = 2;
const AHEAD_NAMING_EXPECTED = [
  'apex-storage-recovery-boundary-contract.test.js',
  'portfolio-leg-quantity-boundary-contract.test.js',
];
const DEAD_RULE_CONTRACT = 'tests/journal-map-audit-boundary-contract.test.js';
const DEAD_RULE_VERDICT = 'is pinned here as dead rather than adopted';
const DEAD_RULE_ORDINAL = 3;
// The ordinal is declared by more than one file now, so it cannot name the
// pinning contract on its own. The contract's OTHER DEAD_RULE* pins can: they
// are the evidence that killed the rule, and each is declared by that file
// alone. The two lists below partition every DEAD_RULE* constant the contract
// declares, and §4 asserts that partition is complete — so an entry cannot be
// dropped from either list and leave the check quietly measuring one fewer.
const DEAD_RULE_ORDINAL_DECLARERS = 2;
const DEAD_RULE_SHARED = ['DEAD_RULE_ORDINAL'];
const DEAD_RULE_EVIDENCE = [
  'DEAD_RULES_ELSEWHERE', 'DEAD_RULE_CONSUMER', 'DEAD_RULE_LAYER',
  'DEAD_RULE_REGION_OWNER', 'DEAD_RULE_SHARED_BANNER',
];
// The two layers that cut INSIDE a banner region on purpose, most recent last.
const LAYERS_CUT_INSIDE_A_BANNER = [
  'tests/apex-storage-recovery-boundary-contract.test.js',
  'tests/portfolio-leg-quantity-boundary-contract.test.js',
];

// ── The band, and what obeying the dead rule would cost ──────────────────────
const BANNER_REGION_AT = 899042;
const BANNER_REGION_END = 968300;
const BANNER_REGION_CHARS = 69258;
const BANNER_REGION_OWNERS = 27;
const EXTRA_BANNER_OWNERS = 26;
const DEAD_RULE_EXTRA_UNITS = 66321;
const DEAD_RULE_NINE = 127;
const DEAD_RULE_BY_CONSUMER = 64;
const DEAD_RULE_CONSUMERS = 9;
const DEAD_RULE_DEPENDENCIES = 23;
const BANNER_LINE =
  '// ── [PortfolioRefreshPayload] — gated verbose payload diagnostics ─────────────';
const DASH_BANNERS = 75;
const BANNERS_NAMING_AN_OWNER_THEY_GOVERN = 0;

// ── The refused boundaries, and the two runners-up ───────────────────────────
const ALT_WITH_NEXT_OWNER_END = 930202;
const ALT_WITH_NEXT_OWNER_UNITS = 19475;
const ALT_WITH_NEXT_OWNER_NINE = 7;
const ALT_WITH_NEXT_OWNER_BCS = 4;
const NEXT_OWNER = 'fetchPortfolioFullRefresh';
const NEXT_OWNER_CHARS = 16373;
const PREV_OWNER = '_resolveLegGreeksDisplay';
const RUNNER_UP_A_AT = 944254;
const RUNNER_UP_A_END = 946106;
const RUNNER_UP_A_OWNER = '_fetchPortfolioTechnicalBatch';
const RUNNER_UP_A_NINE = 4;
const RUNNER_UP_B_AT = 719173;
const RUNNER_UP_B_END = 722692;
const RUNNER_UP_B_OWNER = '_snapshotSqueezeState';
const RUNNER_UP_B_NINE = 4;
const SECTION_REGION_CHARS = 9206;
const SECTION_REGION_OWNERS = 3;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7395;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3048;
const CLEAN_CANDIDATES = 1878;
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 3;
const SCREEN_RANK = 2;
const BETTER_SCORING = 0;
const LARGER_AT_THE_SAME_SCORE = 1;

// ── Where this layer would sit ───────────────────────────────────────────────
const CHAIN_LENGTH = 42;
const SIZE_RANK = 2;
const SMALLEST_LAYER_CHARS = 1761;
const LARGEST_LAYER_CHARS = 71811;
const LAYERS_LARGER_THAN_THIS_CUT = 40;
const DISPLACED_LAYER_CHARS = 3334;
const PURE_ASCII_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 23;
const LAYERS_PINNING_EDGE_HOSTS = 8;

// ── Reachability at this base ────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;



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

console.log('BACKEND FULL-REFRESH VALIDATION — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// A LATER CYCLE HAS CUT, so this is no longer the newest layer and LIVE_INDEX is
// no longer the head of the tree — exactly as the sentence this replaces said
// would happen. HEAD_INDEX is the live document; LIVE_INDEX keeps its meaning
// throughout this file, THIS layer's shipped document, which is what every
// assertion below about extracted lengths, digests and tag adjacency refers to.
// Peeling newest-first is what restores it.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH = PORTFOLIO_TECHNICAL_BATCH_FETCH_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_TECHNICAL_BATCH_FETCH_U.undoPortfolioTechnicalBatchFetch(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-batch-fetch.js'), 'utf8'))
  : HEAD_INDEX;
const LIVE_INDEX = PORTFOLIO_SNAPSHOT_FALLBACK_U.isApplied(PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH)
  ? PORTFOLIO_SNAPSHOT_FALLBACK_U.undoPortfolioSnapshotFallback(
      PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-snapshot-fallback.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoBackendFullRefreshValidation(LIVE_INDEX, MODULE);
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
// list ends at its own layer and the next cycle reads it from here.
// (The audit's own sentence — "read off the newest contract rather than written
// here" — was left standing above this one when the read became a literal, so
// the file asserted both. Prose nothing executes is exactly what drifts.)
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
];
const CHAIN_SET = new Set(CHAIN);
// THE SELF-INCLUSION GUARD. CHAIN now ends at THIS layer and this file is its
// contract, so any census over CHAIN that reads contracts counts this cut as
// evidence for a claim about the layers that preceded it. Every such census
// runs over PRIOR_LAYERS and asserts this layer's own half separately — the
// trap that fired five times in the previous cycle, in exactly these places.
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
  'and that digest is the one the base COMMIT carries, not merely one this file remembers');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and runs CODE_CHARS units');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it declares TOP_LEVEL_DECLS names at top level');
eq(MARKS.length, TOP_LEVEL_BANNERS, '…under TOP_LEVEL_BANNERS top-level banners');
eq(REGIONS.length, OWNER_REGIONS, '…which merge into OWNER_REGIONS regions that own a declaration');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The region, its seam, and the boundary judgement');
// ─────────────────────────────────────────────────────────────────────────────
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest, which Phase 2 must reproduce exactly');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE).length, RAW_CHARS,
  'the raw fragment is RAW_CHARS units: the body plus one separator');
eq(RAW_CHARS - BODY_CHARS, 1, '…exactly one, which is the separator');
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single newline');
eq(BODY.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!BODY.endsWith('\n\n'), '…and not on a blank line');
eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
  'assertSeam accepts this boundary on all four invariants');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(next.name, NEXT_OWNER, 'the next top-level owner is NEXT_OWNER');
  eq(next.chars, NEXT_OWNER_CHARS, '…of NEXT_OWNER_CHARS units, which §5(b) weighs');
}
// THE PHANTOM FINAL ELEMENT, pinned rather than absorbed.
{
  const lines = BODY.split('\n');
  eq(lines.length, SPLIT_LINES, 'splitting the body on newlines yields SPLIT_LINES elements');
  eq(lines[lines.length - 1], '',
    '…the last of which is EMPTY: the phantom a trailing newline leaves behind');
  eq(SPLIT_LINES - 1, BODY_LF, '…so the real line count is BODY_LF, one fewer');
  const real = lines.slice(0, -1);
  eq(real.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, 'CODE_LINES of them are code');
  eq(real.filter((l) => /^\s*\/\//.test(l)).length, COMMENT_LINES, '…COMMENT_LINES are comment');
  eq(real.filter((l) => l.trim() === '').length, BLANK_LINES,
    '…and BLANK_LINES are blank: this region carries none at all');
  eq(CODE_LINES + COMMENT_LINES + BLANK_LINES, BODY_LF,
    '…the three summing to BODY_LF and NOT to SPLIT_LINES, which is why the phantom is pinned');
}
// THE OWNER.
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly this one name');
  eq(own.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…and it is a function, so this layer would ship no mutable binding');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at this size');
}
// THE BOUNDARY JUDGEMENT: the cut takes the function's own documentation.
// The screen can only see the function; this is the 226 units it cannot.
{
  const fn = BY_NAME.get(OWNERS_EXPECTED[0]);
  eq(fn.start, FN_ONLY_AT, 'the function itself begins at FN_ONLY_AT');
  eq(fn.start - RAW_AT_IN_CODE, DOC_BLOCK_CHARS,
    '…DOC_BLOCK_CHARS after the cut opens, which is the doc block this boundary takes');
  const block = CODE.slice(RAW_AT_IN_CODE, fn.start);
  const blockLines = block.split('\n').filter(Boolean);
  eq(blockLines.length, DOC_BLOCK_LINES, 'the doc block is DOC_BLOCK_LINES lines');
  ok(blockLines.every((l) => /^\s*\/\//.test(l)),
    '…every one a comment, so nothing executable is swept in');
  eq(blockLines[0], DOC_FIRST_LINE, '…opening on DOC_FIRST_LINE');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    '…with a BLANK LINE before it, so the block belongs to what FOLLOWS it');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE - 2), '}',
    '…and what precedes it closed on a brace, so nothing is left dangling');
  const prev = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  eq(prev.name, PREV_OWNER, '…that brace belonging to PREV_OWNER');
  // BOTH BOUNDARIES ARE SEAM-VALID. The choice between them is a judgement,
  // and it is defended by what the module ships, not by a rule.
  eq(assertSeam(CODE, FN_ONLY_AT, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam ALSO accepts the function-only boundary, so the seam does not decide this');
  eq(RAW_END_IN_CODE - FN_ONLY_AT, FN_ONLY_UNITS, '…which would be FN_ONLY_UNITS units');
  eq(RAW_CHARS - FN_ONLY_UNITS, DOC_BLOCK_CHARS, '…exactly DOC_BLOCK_CHARS smaller');
}
// What the move would cost.
eq(RAW_CHARS - NET_REDUCTION, ('<script src="./' + MODULE_REL + '"></script>\n').length,
  'index.html would fall by NET_REDUCTION units net: the span leaves and a tag arrives');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, '…leaving index.html at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…and the monolith at RESIDUAL_MONOLITH');
{
  const tagWouldSitAt = CODE_AT - '<script>'.length;
  eq((CODE_AT + RAW_AT_IN_CODE) - tagWouldSitAt, TAG_GAP,
    'the tag line would sit TAG_GAP units before the fragment it replaces');
  eq(TAG_GAP - RAW_AT_IN_CODE, '<script>'.length,
    '…which is the region offset plus the width of the inline open, and nothing else');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: every direction is zero but one');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'EXTERNAL_EDGES reference reaches in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at this exact site');
ok(REC.sites.every(insideFunction), '…inside a function body, so it does not run at load');
eq(consumersOf(REC), EDGE_HOSTS, '…hosted by exactly ONE function');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
{
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  eq(host.chars, CONSUMER_CHARS, '…of CONSUMER_CHARS units');
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…declared outside the region, so the edge really does cross the boundary');
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names NO monolith declaration at all: the dependency direction is empty');
// NOT A FIRST, and the denominator is the layers that pin the constant.
{
  const pinned = [];
  for (const rel of PRIOR_LAYERS) {
    const base = path.basename(rel).replace(/\.js$/, '');
    const f = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((x) => x.endsWith('-boundary-contract.test.js'))
      .find((x) => x.replace('-boundary-contract.test.js', '') === base);
    if (!f) continue;
    const m = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')
      .match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
    if (m) pinned.push({ rel, v: m[1] });
  }
  eq(pinned.length, LAYERS_PINNING_DEPENDENCIES,
    'LAYERS_PINNING_DEPENDENCIES shipped layers pin MONOLITH_DEPENDENCIES at all');
  eq(pinned.filter((x) => x.v === '[]').length, LAYERS_WITH_NO_DEPENDENCY,
    '…and LAYERS_WITH_NO_DEPENDENCY of them pin it EMPTY, so an empty dependency direction is '
    + 'a property seven layers already have and not a superlative this cut invents');
  ok(LAYERS_WITH_NO_DEPENDENCY < pinned.length,
    '…while the rest do carry one, so the predicate distinguishes and is not vacuous');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS,
'seven further directions are ZERO, and OUTBOUND WRITES is among them — the direction that '
+ 'disqualified a candidate which scored a perfect zero inbound');
// THE NINTH, SPLIT. Both halves zero is not the same claim twice.
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it reaches into NO module this programme extracted');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and none that predates it either');
  eq(split.chain + split.foundation, REC.outModule,
    '…and the two halves account for every outbound module reference, none left over');
  const prev = outboundSplit(CODE.indexOf('function refreshPositionsLive'), CODE.length);
  ok(prev.foundation > 0,
    'control — the same split reports a NON-zero foundation half elsewhere in this document');
}
eq(REC.nine, FULL_NINE, 'so the nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…BY_CONSUMER when the edges are counted per consumer');
eq(byConsumerSplit(REC, outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE)), BY_CONSUMER_SPLIT,
  '…and BY_CONSUMER_SPLIT once the foundation half is set aside — the same number, because '
  + 'there is no foundation half to set aside');
ok(FULL_NINE === EXTERNAL_EDGES,
  'the whole of this region\'s coupling IS that single edge: nothing else contributes');
// THE DOC BLOCK CHANGES NOTHING, which is what makes §2's judgement free.
{
  const fnOnly = profileOf([FN_ONLY_AT, RAW_END_IN_CODE]);
  eq(fnOnly.nine, REC.nine, 'the function-only boundary scores the SAME nine-direction total');
  eq(byConsumer(fnOnly), byConsumer(REC), '…the same byConsumer');
  eq(consumersOf(fnOnly), consumersOf(REC), '…and the same consumer');
  eq(fnOnly.sites, REC.sites, '…at the same site: comments carry no references');
}
// THE HOST GLOBALS, which are not monolith declarations and score in no
// direction. Naming them is what makes §7's bare drive honest.
{
  const raw = maskLiterals(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE));
  const got = {};
  for (const n of Object.keys(HOST_GLOBAL_REFS)) got[n] = refSites(raw, n).length;
  eq(got, HOST_GLOBAL_REFS, 'it reaches these host globals, at these counts');
  ok(Object.keys(HOST_GLOBAL_REFS).every((n) => !BY_NAME.has(n)),
    '…none of which is a monolith declaration, which is why they score in no direction');
  ok(Object.keys(HOST_GLOBAL_REFS).every((n) => typeof globalThis[n] !== 'undefined'),
    '…and every one is an intrinsic present in a bare context, which is what §7 relies on');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: a refusal that outlived its reason');
// ─────────────────────────────────────────────────────────────────────────────
{
  // HOW LONG IT STOOD, counted over the SHIPPED contracts that record it. The
  // audits that first named it were deleted by their own Phase 2, so the
  // checkable set is the contracts, and this says "two" because two is what
  // the census returns — not "several cycles", which nothing here could check.
  const naming = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js'))
    .filter((f) => new RegExp('AHEAD_OWNERS[\\s\\S]{0,400}' + OWNERS_EXPECTED[0])
      .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')))
    .sort();
  eq(naming, AHEAD_NAMING_EXPECTED.slice().sort(),
    'exactly these shipped contracts list this region as ahead-on-the-metric but not taken');
  eq(naming.length, AHEAD_NAMING_CONTRACTS, '…AHEAD_NAMING_CONTRACTS of them');
  ok(naming.every((f) => /-boundary-contract\.test\.js$/.test(f)),
    '…both permanent contracts, so the record survives its own cycle');

  // AND THE RULE THAT REFUSAL RESTS ON IS DEAD. The file that kills it is
  // named by the ORDINAL it executes, not by existing and not by carrying the
  // verdict: three files carry that sentence now, and only one runs the count.
  const carriesVerdict = (src) => src.indexOf(DEAD_RULE_VERDICT + "'") >= 0;
  ok(carriesVerdict(fs.readFileSync(path.join(ROOT, DEAD_RULE_CONTRACT), 'utf8')),
    'DEAD_RULE_CONTRACT carries the verdict, matched to its closing quote because `indexOf` '
    + 'matches a substring');
  // THE ORDINAL ALONE NO LONGER NAMES IT. The layer shipped last cycle declares
  // DEAD_RULE_ORDINAL too — in order to check it — so a census over that
  // constant returns TWO, and a first draft of this assertion asserted one and
  // failed. What still names the pinning contract is the EVIDENCE it carries
  // for the rule: the layer, the region owner and the shared-banner finding
  // that killed it, which no other file declares.
  const ordinalPin = /^const DEAD_RULE_ORDINAL = (\d+);$/m;
  const declaring = (re) => fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js') && f !== path.basename(CONTRACT_REL))
    .filter((f) => re.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  eq(declaring(ordinalPin).length, DEAD_RULE_ORDINAL_DECLARERS,
    'DEAD_RULE_ORDINAL_DECLARERS files declare the ordinal, so declaring it names none of them');
  ok(declaring(ordinalPin).indexOf(path.basename(DEAD_RULE_CONTRACT)) >= 0,
    '…and DEAD_RULE_CONTRACT is among them');
  // COMPLETENESS. Without this the loop below is a set assumed closed: dropping
  // an entry from DEAD_RULE_EVIDENCE would check one constant fewer and still
  // pass. The two lists are asserted to be EVERY DEAD_RULE* pin that contract
  // declares, measured from the file rather than recalled.
  const declaredThere = [...new Set([...fs.readFileSync(path.join(ROOT, DEAD_RULE_CONTRACT), 'utf8')
    .matchAll(/^const (DEAD_RULE[A-Z_]*) = /gm)].map((m) => m[1]))].sort();
  eq(declaredThere, [...DEAD_RULE_EVIDENCE, ...DEAD_RULE_SHARED].sort(),
    'DEAD_RULE_EVIDENCE and DEAD_RULE_SHARED together are EVERY DEAD_RULE* constant the '
    + 'pinning contract declares, so neither list can lose an entry unnoticed');
  for (const c of DEAD_RULE_SHARED) {
    ok(declaring(new RegExp('^const ' + c + ' = ', 'm')).length > 1,
      c + ' is declared by more than one file, which is why it names none of them');
  }
  for (const c of DEAD_RULE_EVIDENCE) {
    eq(declaring(new RegExp('^const ' + c + ' = ', 'm')), [path.basename(DEAD_RULE_CONTRACT)],
      '…while ' + c + ' is declared by that contract ALONE: the evidence for the rule is what '
      + 'names the file that pins it');
  }
  eq(Number(fs.readFileSync(path.join(ROOT, DEAD_RULE_CONTRACT), 'utf8').match(ordinalPin)[1]),
    DEAD_RULE_ORDINAL, '…which records it as dead rule number DEAD_RULE_ORDINAL');

  // AND THE PROGRAMME HAS ALREADY ACTED ON THAT, TWICE. Both of the last two
  // layers cut inside a banner region on purpose. Their own contracts record
  // it as a region holding strictly more owners than the cut took.
  for (const rel of LAYERS_CUT_INSIDE_A_BANNER) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const region = Number(src.match(/^const BANNER_REGION_OWNERS = (\d+);$/m)[1]);
    const owners = Number(src.match(/^const OWNER_COUNT = (\d+);$/m)[1]);
    ok(region > owners,
      path.basename(rel) + ' cut inside a banner region: its own contract records a region '
      + 'holding strictly more owners than the cut took');
  }
  eq(LAYERS_CUT_INSIDE_A_BANNER.length, 2,
    '…and there are two of them, the two most recent layers in the chain');
  eq(LAYERS_CUT_INSIDE_A_BANNER.map((r) => 'js/' + path.basename(r)
    .replace('-boundary-contract.test.js', '.js')).length, 2,
  '…which is what makes the ground for passing this region over already spent');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The refused boundaries, and the two runners-up');
// ─────────────────────────────────────────────────────────────────────────────
const alt = (lo, hi) => {
  const be = snapBodyEnd(CODE, lo, hi);
  assertSeam(CODE, lo, be);
  const p = profileOf([lo, be + 1]);
  const s = outboundSplit(lo, be + 1);
  return { p, split: s, units: be + 1 - lo, bcs: byConsumerSplit(p, s) };
};
// (a) THE FUNCTION WITHOUT ITS DOCUMENTATION — measured in §2 and §3.
ok(FN_ONLY_UNITS < RAW_CHARS,
  'the function-only boundary is smaller, and §3 shows its coupling is identical, so what it '
  + 'costs is the three lines that say what the function does');
// (b) ABSORB THE NEXT OWNER.
{
  const next = BY_NAME.get(NEXT_OWNER);
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start + next.chars + 2) + 1, ALT_WITH_NEXT_OWNER_END,
    'ALT_WITH_NEXT_OWNER_END is where the body ends once the next owner is taken');
  const b = alt(RAW_AT_IN_CODE, ALT_WITH_NEXT_OWNER_END);
  eq(b.units, ALT_WITH_NEXT_OWNER_UNITS, '…for a cut of ALT_WITH_NEXT_OWNER_UNITS units');
  eq(b.p.nine, ALT_WITH_NEXT_OWNER_NINE, '…a nine-direction total of ALT_WITH_NEXT_OWNER_NINE');
  eq(b.bcs, ALT_WITH_NEXT_OWNER_BCS, '…and byConsumerSplit of ALT_WITH_NEXT_OWNER_BCS');
  ok(b.bcs > BY_CONSUMER_SPLIT,
    '…strictly worse on the deciding metric, for six times the size');
  ok(b.p.deps.length > MONOLITH_DEPENDENCIES.length,
    '…and it acquires monolith dependencies this cut does not have');
}
// (c) OBEY THE DEAD RULE — the whole banner region.
{
  const band = REGIONS.filter((r) => r.start <= RAW_AT_IN_CODE && r.end > RAW_AT_IN_CODE)[0];
  eq(band.start, BANNER_REGION_AT, 'the banner region begins at BANNER_REGION_AT');
  eq(band.end, BANNER_REGION_END, '…and ends at BANNER_REGION_END');
  eq(band.end - band.start, BANNER_REGION_CHARS, '…BANNER_REGION_CHARS units in all');
  ok(band.start < RAW_AT_IN_CODE,
    '…and the cut opens INSIDE it, not on its start: this region is not a band opener');
  const own = DECLS.filter((d) => d.start >= band.start && d.end < band.end);
  eq(own.length, BANNER_REGION_OWNERS, '…holding BANNER_REGION_OWNERS top-level declarations');
  const strangers = own.filter((d) => OWNERS_EXPECTED.indexOf(d.name) < 0);
  eq(strangers.length, EXTRA_BANNER_OWNERS, '…EXTRA_BANNER_OWNERS of them strangers to this cut');
  eq(band.end - band.start - RAW_CHARS, DEAD_RULE_EXTRA_UNITS,
    'obeying the dead rule would add DEAD_RULE_EXTRA_UNITS units');
  eq(lineAt(band.start), BANNER_LINE, 'the banner line is BANNER_LINE');
  eq(own.filter((d) => namesIt(BANNER_LINE, d.name)).map((d) => d.name), [],
    '…and it names NONE of the twenty-seven by identifier');
  const whole = profileOf([band.start, band.end]);
  const wsp = outboundSplit(band.start, band.end);
  eq(whole.nine, DEAD_RULE_NINE, 'the whole band scores DEAD_RULE_NINE on the nine');
  eq(byConsumer(whole), DEAD_RULE_BY_CONSUMER, '…DEAD_RULE_BY_CONSUMER per consumer');
  eq(byConsumerSplit(whole, wsp) > BY_CONSUMER_SPLIT, true, '…which is worse, not better');
  eq(consumersOf(whole).length, DEAD_RULE_CONSUMERS,
    '…reaching DEAD_RULE_CONSUMERS consumers where the cut reaches one');
  eq(whole.deps.length, DEAD_RULE_DEPENDENCIES,
    '…and DEAD_RULE_DEPENDENCIES monolith dependencies where the cut has none');
  ok(DEAD_RULE_BY_CONSUMER > BY_CONSUMER * 60,
    '…which is the largest margin this chain has measured for that rule, and §4 is why it '
    + 'is not a reason to refuse the cut');
  // THE BANNER NAMES NO OWNER BY IDENTIFIER — audit #466's measurement, re-run.
  {
    const dash = MARKS.filter((m) => /^\/\/ ── /.test(lineAt(m)));
    eq(dash.length, DASH_BANNERS, 'DASH_BANNERS of the top-level banners are `// ── ` banners');
    let naming = 0;
    for (const m of dash) {
      const line = lineAt(m);
      const governed = DECLS.filter((d) => d.start >= m && d.start < nextMarkAfter(m));
      if (governed.some((d) => namesIt(line, d.name))) naming++;
    }
    eq(naming, BANNERS_NAMING_AN_OWNER_THEY_GOVERN,
      'and BANNERS_NAMING_AN_OWNER_THEY_GOVERN of them name an owner they govern');
    let blocks = 0;
    for (const d of DECLS) {
      const b = blockAbove(d);
      if (b && namesIt(firstLineOf(b.text), d.name)) blocks++;
    }
    ok(blocks > 0,
      'control — the same naming predicate over comment blocks is NOT zero, so the zero above '
      + 'is a measurement rather than a metric that measures nothing');
  }
}
// THE TWO RUNNERS-UP, published with their numbers so the next cycle need not
// re-derive them — which is what audit #470 did for the region #473 took.
{
  // Each END is anchored to the document before it is used. `alt` passes it to
  // snapBodyEnd as the LIMIT, which snaps a perturbed value back to the same
  // body end — so without this the two ends are pins that check nothing.
  // assertSeam is fail-closed on the four invariants every recorded boundary
  // satisfies, and it rejects these two at ±1.
  eq(assertSeam(CODE, RUNNER_UP_A_AT, RUNNER_UP_A_END), RUNNER_UP_A_END + 1,
    'RUNNER_UP_A_END is a real seam: it is where the owner’s last line of code falls');
  eq(assertSeam(CODE, RUNNER_UP_B_AT, RUNNER_UP_B_END), RUNNER_UP_B_END + 1,
    'RUNNER_UP_B_END likewise, so both runners-up are published at boundaries that hold');

  const a = alt(RUNNER_UP_A_AT, RUNNER_UP_A_END);
  eq(a.p.names, [RUNNER_UP_A_OWNER], 'the first runner-up is RUNNER_UP_A_OWNER');
  eq(a.bcs, BY_CONSUMER_SPLIT, '…scoring the SAME byConsumerSplit as this cut');
  eq(a.p.nine, RUNNER_UP_A_NINE, '…but RUNNER_UP_A_NINE on the raw nine, which is worse');
  ok(a.units < RAW_CHARS, '…and it is smaller, which is the tiebreak the screen ranks by');
  const band = REGIONS.filter((r) => r.start <= RUNNER_UP_A_AT && r.end > RUNNER_UP_A_AT)[0];
  eq(band.start, BANNER_REGION_AT,
    '…and it sits in the SAME catch-all as this cut, so §4 applies to it unchanged');

  const b = alt(RUNNER_UP_B_AT, RUNNER_UP_B_END);
  eq(b.p.names[0], RUNNER_UP_B_OWNER, 'the second runner-up opens on RUNNER_UP_B_OWNER');
  eq(b.bcs, BY_CONSUMER_SPLIT, '…also scoring the same byConsumerSplit');
  eq(b.p.nine, RUNNER_UP_B_NINE, '…and RUNNER_UP_B_NINE on the raw nine');
  ok(b.units > RAW_CHARS, '…while being LARGER than this cut, so size is not why it loses');
  // ITS OBJECTION IS DIFFERENT AND STILL LIVE, and it is re-measured here
  // rather than recalled from the audit that first published it.
  const band2 = REGIONS.filter((r) => r.start <= RUNNER_UP_B_AT && r.end > RUNNER_UP_B_AT)[0];
  eq(b.p.names.length >= 1, true, '…it takes at least one owner');
  eq(RUNNER_UP_B_AT, band2.start, 'it opens exactly ON its region start');
  ok(/^\/\/ ═+/.test(lineAt(band2.start)), '…and that region opens on a `// ═══` SECTION header');
  eq(band2.end - band2.start, SECTION_REGION_CHARS, '…of SECTION_REGION_CHARS units');
  eq(DECLS.filter((d) => d.start >= band2.start && d.end < band2.end).length,
    SECTION_REGION_OWNERS, '…holding SECTION_REGION_OWNERS owners');
  ok(band2.end > RUNNER_UP_B_END,
    '…and the section CONTINUES past the cut, so taking the header would leave the owner that '
    + 'keeps the section with no title. That is the defect audit #462 published, and it is a '
    + 'DIFFERENT objection from the one §4 retires');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and what is unique about this cut');
// ─────────────────────────────────────────────────────────────────────────────
eq(RUN_FLOOR, 1500, 'the screen floors runs at RUN_FLOOR units');
eq(rawRunCount, RAW_RUNS, 'it enumerates RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…of which assertSeam refuses SEAM_REJECTED');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
const cleanRuns = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
eq(cleanRuns.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
{
  // THE SCREEN SEES THE FUNCTION, NOT THE RECOMMENDATION: runs begin at a
  // region start or a declaration start, and the doc block is neither.
  const rec = cleanRuns.filter((c) => c.lo === FN_ONLY_AT && c.hi === BODY_END_IN_CODE)[0];
  ok(rec, 'the screen enumerates the function-only run');
  eq(cleanRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
    '…and does NOT enumerate the recommended boundary, because it opens on a comment block: '
    + 'that 226-unit difference is the judgement §2 defends, not something the screen chose');
  // ONE OF 1,878 — counted, and the identity asserted with the count.
  const byOne = cleanRuns.filter((c) => byConsumer(c.p) === 1);
  eq(byOne.length, ONE_CONSUMER_RAW, 'ONE_CONSUMER_RAW clean candidate scores byConsumer 1');
  eq(byOne.map((c) => c.p.names), [OWNERS_EXPECTED],
    '…and it is THIS one, so the count and the identity are pinned together');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 1).length, ONE_CONSUMER_SPLIT,
    '…while ONE_CONSUMER_SPLIT score 1 under the split reading, which is the set §5 publishes');
  const ranked = cleanRuns.slice()
    .sort((a, b) => byConsumerSplit(a.p, a.split) - byConsumerSplit(b.p, b.split) || b.units - a.units);
  eq(ranked.findIndex((c) => c.lo === FN_ONLY_AT && c.hi === BODY_END_IN_CODE) + 1, SCREEN_RANK,
    '…and the screen ranks this cut SCREEN_RANK by byConsumerSplit then size');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) < BY_CONSUMER_SPLIT).length,
    BETTER_SCORING, 'BETTER_SCORING candidates score better than it: nothing does');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT
    && c.units > FN_ONLY_UNITS).length, LARGER_AT_THE_SAME_SCORE,
  '…and LARGER_AT_THE_SAME_SCORE is larger at the same score, which is why the rank is two '
  + 'rather than one: §5 measures why that larger one is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, and the validator runs with nothing injected');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'it loads in a COMPLETELY empty VM, defining exactly its own owner');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
}
{
  const watched = [];
  const ctx = {
    fetch: () => { watched.push('fetch'); },
    setTimeout: () => { watched.push('setTimeout'); },
    localStorage: { getItem: () => { watched.push('localStorage.getItem'); return null; } },
    document: { getElementById: () => { watched.push('doc.getElementById'); return null; } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
    console: { log() {}, warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(watched, [], 'and touches no fetch, timer, storage read or listener while loading');
}
// THE VALIDATOR RUNS WITH NOTHING INJECTED — §3's empty dependency direction
// executed rather than restated. Every drive is a PAIR whose answers differ,
// because a validator that always returned the same verdict would pass a test
// that only ever fed it one payload.
{
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  const f = ctx._validateBackendFullRefreshPayload;
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const ok1 = { underlyingsBySymbol: { AAPL: {} } };

  eq(plain(f(ok1, ['AAPL'])), { valid: true, warnings: [] },
    'a payload carrying the expected underlying is VALID with no warnings');
  eq(plain(f(null, ['AAPL'])), { valid: false, warnings: ['payload_null_or_non_object'] },
    '…a null payload is refused outright');
  eq(plain(f(42, ['AAPL'])), { valid: false, warnings: ['payload_null_or_non_object'] },
    '…and so is a non-object, which is the same branch on a different input');
  eq(plain(f({}, ['AAPL'])).warnings, ['missing_or_invalid_underlyings'],
    'a payload with no underlyings map is refused for that reason');
  eq(plain(f({ underlyingsBySymbol: [] }, [])).warnings, ['missing_or_invalid_underlyings'],
    '…and an ARRAY is refused too, although an array IS an object: the Array.isArray guard is '
    + 'what separates them');
  eq(plain(f({ underlyingsBySymbol: { AAPL: {} } }, ['MSFT'])).warnings,
    ['underlying_missing_MSFT'], 'a requested ticker that is absent is named in the warning');
  eq(plain(f({ underlyingsBySymbol: { AAPL: {} } }, ['  aapl  '])), { valid: true, warnings: [] },
    '…and the requested tickers are trimmed and upper-cased before that check');

  // THE SUBTLE ONE, which the region's own comment explains: a null
  // betaWeightedDelta means the backend COULD NOT COMPUTE, not that the
  // payload is malformed. The pair is what proves the distinction is real.
  eq(plain(f({ underlyingsBySymbol: { A: {} }, betaWeightedDelta: null }, [])),
    { valid: true, warnings: [] },
    'a NULL betaWeightedDelta is unavailable, not malformed, and raises nothing');
  eq(plain(f({ underlyingsBySymbol: { A: {} }, betaWeightedDelta: { bwd: 'abc' } }, [])).warnings,
    ['betaWeightedDelta_bwd_not_finite'],
    '…while a non-finite bwd IS malformed, so the two answers differ');
  eq(plain(f({ underlyingsBySymbol: { A: {} }, betaWeightedDelta: { bwd: null } }, [])),
    { valid: true, warnings: [] },
    '…and a null bwd inside the object is unavailable too, which is the third case the '
    + 'comment distinguishes');

  eq(plain(f({ underlyingsBySymbol: { A: {} }, options: [] }, [])).warnings,
    ['options_not_object_map'], 'options given as an array is refused');
  eq(plain(f({ underlyingsBySymbol: { A: {} }, options: {} }, [])), { valid: true, warnings: [] },
    '…and as a map it is accepted');
  eq(plain(f({ underlyingsBySymbol: { A: {} }, exitAlertsByPositionId: { p1: 'x' } }, [])).warnings,
    ['exitAlertsByPositionId_p1_not_array'],
    'a non-array alert list is named by its position id');
  eq(plain(f({ underlyingsBySymbol: { A: {} }, exitAlertsByPositionId: { p1: [] } }, [])),
    { valid: true, warnings: [] }, '…and an array one is accepted');

  // ALIGNMENT IS ONLY TRUSTED WHEN THE BACKEND CONFIRMS IT.
  eq(plain(f({ underlyingsBySymbol: { A: {} }, portfolioAlignmentBySymbol: { A: 1 } }, [])).warnings,
    ['portfolioAlignmentBySymbol_source_not_confirmed'],
    'alignment without a confirmed source is withheld');
  eq(plain(f({ underlyingsBySymbol: { A: {} }, portfolioAlignmentBySymbol: { A: 1 },
    fullRefreshDiagnostics: { alignmentSource: 'backend' } }, [])), { valid: true, warnings: [] },
  '…and with alignmentSource "backend" it is trusted, so the two drives disagree');

  // WARNINGS ACCUMULATE: `valid` is the emptiness of the list, not a separate
  // verdict, and a payload wrong in two ways says so twice.
  const two = plain(f({ options: [] }, []));
  eq(two.warnings.length, 2, 'a payload wrong in two ways collects two warnings');
  eq(two.valid, false, '…and is invalid');
  ok(two.warnings.indexOf('missing_or_invalid_underlyings') >= 0
    && two.warnings.indexOf('options_not_object_map') >= 0, '…naming both faults');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Reachability, and where this layer would sit');
// ─────────────────────────────────────────────────────────────────────────────
{
  const dead = DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return refSites(MASKED, d.name).filter((i) => !self(i)).length === 0 &&
      refSites(STRINGS, d.name).length === 0 && refSites(STATIC_MARKUP, d.name).length === 0 &&
      refSites(OTHER_INLINE, d.name).length === 0 &&
      SIBLINGS.every((s) => refSites(s.masked, d.name).length === 0 &&
        refSites(s.strings, d.name).length === 0);
  });
  eq(dead.length, DEAD_DECLS, 'DEAD_DECLS of the monolith\'s declarations are named nowhere');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…DEAD_UNITS of code');
  eq(dead.filter((d) => OWNERS_EXPECTED.indexOf(d.name) >= 0).map((d) => d.name), [],
    '…and the owner of this cut is NOT among them: it is live code');
}
{
  // THE AUDIT ASSERTED THE OPPOSITE of the first two: while the cut was still a
  // recommendation this module was absent from the chain and from disk. It
  // ships now, so the claims are inverted rather than deleted — an assertion
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
    'this layer ranks SIZE_RANK by size — the SECOND SMALLEST layer, and the contract '
    + 'says so rather than selling a 2,936-unit cut as a substantial one');
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
  eq(sizes[1], BODY_CHARS,
    '…this layer occupies the second-smallest slot itself');
  eq(sizes[2], DISPLACED_LAYER_CHARS,
    '…and the layer it displaced into third place is DISPLACED_LAYER_CHARS units, the one '
    + 'the previous cycle shipped');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < DISPLACED_LAYER_CHARS,
    '…so it lands between them and displaces no superlative');
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'PURE_ASCII_LAYERS shipped layers are pure ASCII');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(!/^\/\/ ── /.test(BODY.split('\n')[0]),
    '…and this one would NOT: it opens on a plain doc comment, so that count is unchanged');
}
// ONE EDGE HOST, which is the ordinary case — the previous layer was the
// exception, and this audit does not inherit its property by assumption.
{
  const pinned = [];
  for (const rel of PRIOR_LAYERS) {
    const base = path.basename(rel).replace(/\.js$/, '');
    const f = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((x) => x.endsWith('-boundary-contract.test.js'))
      .find((x) => x.replace('-boundary-contract.test.js', '') === base);
    if (!f) continue;
    const m = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')
      .match(/^const EDGE_HOSTS = (\[[^\]]*\]);$/m);
    if (m) pinned.push({ rel, hosts: JSON.parse(m[1].replace(/'/g, '"')) });
  }
  eq(pinned.length, LAYERS_PINNING_EDGE_HOSTS,
    'LAYERS_PINNING_EDGE_HOSTS shipped layers pin EDGE_HOSTS at all');
  eq(pinned.filter((x) => x.hosts.length > 1).length, 1,
    '…exactly ONE of which names more than one consumer, which is the layer cut last');
  eq(EDGE_HOSTS.length, 1, '…and this cut names one, like the other seven');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The relocation is the whole of the production change');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  // THE AUDIT ASSERTED THAT NOTHING MOVED. The phase that shipped this layer
  // moved exactly the audited bytes and nothing else, so the claim is inverted
  // rather than dropped. It now reads against a base that LATER layers have
  // also moved past, so the footprint is the document, this layer's module, and
  // the module of every layer cut after it — the idiom every older contract in
  // this chain already carries, adopted here the cycle it first applied.
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-snapshot-fallback.js', 'js/portfolio/portfolio-technical-batch-fetch.js'].sort(),
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
  eq(LIVE_LOCALS.length, UNDO.EXTRACTED_LOCAL_SCRIPTS,
    '…carrying one more local script than the base');
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
  ok(MODULE.endsWith('}\n') && !MODULE.endsWith('\n\n'),
    '…and the module ends on a real line of code, not on the separator it gave up');
}
// THE UNDO'S SIX REACHABLE GUARDS, each driven by PLANTING the exact violation
// it claims to catch. A guard that is never made to fire is a guard nobody has
// checked, and its EXACT message is asserted so a mutant cannot pass by raising
// some other error. BASE_IDENTITY is deliberately absent: the helper's header
// states it is a redundant final gate, unreachable once the module digest and
// the whole-document digest have both passed.
{
  const E = 'BACKEND_FULL_REFRESH_VALIDATION_UNDO_';
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 2,937 units, not 2,936 — which is exactly what the
  // helper's own gate-1 comment claims. Asserting MODULE_SEPARATOR here would
  // be wrong about the helper, as the previous cycle's first draft was.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX, MODULE + '\n'),
    E + 'MODULE_IDENTITY', '…so SIZE refuses it, before the separator gate is reached');
  {
    // THE SEPARATOR GATE, reached on its own terms: a module of the RIGHT length
    // and the RIGHT line-feed count that still ends on a blank line. Without
    // this the gate would be unreachable and its message never proved.
    const blankEnded = MODULE.slice(0, -2).replace('\n', ' ') + '\n\n';
    eq(blankEnded.length, MODULE.length, 'control — the blank-ended module is the right length');
    eq((blankEnded.match(/\n/g) || []).length, (MODULE.match(/\n/g) || []).length,
      '…and has the same line-feed count, so only the separator gate can refuse it');
    ok(blankEnded.endsWith('\n\n'), '…and it really does end on a blank line');
    throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('normalizedTickers', 'normalizedTickerX');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoBackendFullRefreshValidation(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoBackendFullRefreshValidation(INDEX, MODULE),
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
  ok(all.indexOf(CONTRACT_REL) >= 0, 'this permanent contract is part of the change');
  // CONTRACT_REL NAMES THIS FILE. A mutant pointing it at a neighbouring
  // contract would otherwise survive, because every other use is satisfied by
  // that file too.
  eq(fs.readFileSync(path.join(ROOT, CONTRACT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and CONTRACT_REL is the path of THIS file, byte for byte');
  ok(all.indexOf(UNDO_REL) >= 0, '…and the byte-exact undo helper');
  ok(all.indexOf(AUDIT_REL) >= 0, '…and the temporary audit\'s removal is visible in it');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    '…because the audit is GONE: replaced one-for-one, not left beside its replacement');
  ok(all.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec is retired in the same change');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)), '…and that spec is gone too');
  ok(all.every((rel) => rel.startsWith('tests/') || rel === 'index.html'
    || rel === MODULE_REL || rel === 'js/portfolio/portfolio-snapshot-fallback.js' || rel === 'js/portfolio/portfolio-technical-batch-fetch.js'),
  '…and every other changed path is a test artifact or a later layer\'s module');
  // THE RATCHET. The audit was RENAMED into this contract, so the suite file
  // count does NOT move this phase. That is asserted as the two commit facts,
  // never as a difference against the live TEST_FILE_COUNT: the live count
  // ratchets whenever a later cycle lands an audit, and pinning a difference
  // against it is what made the previous cycle's Phase 1 fail on a contract it
  // had not touched.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this contract in it');
  ok(git(['show', BASE_SHA + ':' + AUDIT_REL]).length > 0,
    '…and the base carried the AUDIT at that count');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)) && fs.existsSync(path.join(ROOT, CONTRACT_REL)),
    '…while today it is the CONTRACT: one file replaced, not one added');
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
  '…and every one of them now pins the ratcheted value, this contract included');
  ok(contracts.indexOf(path.basename(CONTRACT_REL)) >= 0,
    '…this contract being one of them, so it ratchets itself rather than exempting itself');
  // THE BUDGET.
  // READ OUT OF THE REVISION THAT LAST CARRIED IT: `require` would throw now.
  const contractSpecAt = git(['show', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]);
  eq((contractSpecAt.match(/\n  \{ id: /g) || []).length, CONTRACT_SPEC_MUTANTS,
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
  // this contract's spec and landed its own audit — the third live-versus-
  // historical pin this file has had to convert, and the pattern is always the
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
    'the retired path IS the audit\'s spec — Phase 2 retires that one and no other, because '
    + 'the outgoing contract\'s spec already went in Phase 1');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + AUDIT_REL + "'") >= 0,
    '…and it is the audit that retired spec TARGETED, not merely a file that existed');
  // PREVIOUS_CONTRACT MUST BE THE CONTRACT OF THE LAYER THIS ONE DISPLACED, not
  // merely a file that exists. Its only use was an existence check, which every
  // shipped contract satisfies, so a mutant pointing it at a neighbouring
  // contract survived the first pass. It is now derived from the chain.
  eq(PREVIOUS_CONTRACT,
    'tests/' + path.basename(CHAIN[CHAIN.length - 2], '.js') + '-boundary-contract.test.js',
    'PREVIOUS_CONTRACT is the contract of the layer immediately before this one in the chain');
  ok(fs.existsSync(path.join(ROOT, PREVIOUS_CONTRACT)),
    '…while the contract that was newest before this one still ships and still runs');
  ok(!fs.existsSync(path.join(ROOT, 'tests/mutation-specs/portfolio-leg-quantity-contract.spec.js')),
    '…with its own spec still retired from the phase before, not quietly restored');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  ok(!fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)),
    '…and this contract\'s own spec is retired now too, by the next cycle\'s Phase 1');
  eq(git(['cat-file', '-e', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]), '',
    '…a path the commit that shipped this layer really carried, so its absence is a retirement');
}

console.log('\n' + pass + ' assertions passed.');
console.log('BACKEND_FULL_REFRESH_VALIDATION_CONTRACT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
