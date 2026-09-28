'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// CANONICAL LEG QUANTITY — TEMPORARY BOUNDARY AUDIT.
//
// MEASUREMENT ONLY. Nothing moves in this PR: index.html and every shipped
// module are byte-identical to 8acdfb8, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file and ships the cut it
// recommends.
//
// THE RECOMMENDATION: [747320,750655) in monolith coordinates, 3,335 units raw
// and 3,334 of body, five owners, to js/portfolio/portfolio-leg-quantity.js.
// They are the canonical leg-quantity vocabulary and its readers:
// `_portfolioResidualQuantityFields` (273), `_portfolioGrossQuantityFields`
// (87), `_portfolioQuantityFieldPresent` (237), `_portfolioStrictQuantity`
// (255) and `_portfolioReadQuantityField` (321). All five are functions, so the
// cut would ship no mutable binding at all.
//
// THIS REGION WAS PUBLISHED AS THE RUNNER-UP BY AUDIT #470, at [751577,754911)
// before that cycle's own 4,257 units left the document. §2 re-derives the
// shift rather than asserting it, and every number that audit published for it
// — five owners, byConsumerSplit 2, a nine-direction total of 6, two consumers
// — holds unchanged. §5 publishes this cycle's runner-up the same way.
//
// ── THE FINDING: THE TWO METRICS DISAGREE IN DIRECTION ─────────────────────
//
// The raw nine-direction total FALLS as the cut grows — 6 at five owners, 4 at
// six, 3 at seven — while byConsumerSplit, the metric this programme ranks on,
// RISES: 2, 3, 3. A reader who took "less coupling is better" from the nine
// would take seven owners and be choosing the worse cut on the axis that
// decides. §4 measures both series instead of asserting the conclusion.
//
// WHY THEY DISAGREE, MEASURED: growing the cut absorbs its own consumers, which
// removes inbound monolith edges — six, then three, then two. But the sixth
// owner, `_portfolioResolveLegQuantity`, is named by an ALREADY-SHIPPED module,
// js/services/portfolio-stress-parity.js. Taking it converts that module's edge
// into the JournalManager into an edge into the new module: the sibling-module
// direction goes 0 → 1 and stays there. The five-owner cut is the last one at
// which NO module reaches in.
//
// THIS IS NOT A CLAIM THAT MODULE-TO-MODULE EDGES ARE NEW. There are 74 of them
// among the forty shipped layers already, and §4 counts them rather than
// letting the finding sound like a first. What is specific here is narrower and
// checkable: `portfolio-stress-parity.js` is NOT in the chain, so the edge the
// larger cuts would acquire runs from a FOUNDATION module into a chain one, and
// the five-owner boundary is where that acquisition is still avoidable.
//
// ── COUPLING ───────────────────────────────────────────────────────────────
//
// SIX edges reach in, from TWO consumers — `_portfolioResolveLegQuantity` (4)
// and `_portfolioLegExplicitOpenQty` (2), both of them immediately after the
// cut. EIGHT of the nine directions are ZERO, including BOTH halves of the
// ninth and, unusually, the monolith-dependency direction: this region names no
// monolith declaration at all.
//
// THAT IS NOT A FIRST, AND §3 SAYS SO WITH A COUNT. Of the twenty shipped
// layers whose contract pins MONOLITH_DEPENDENCIES, SIX already pin it empty.
// The audit reports six of twenty rather than reaching for "the cleanest yet",
// which is the shape of claim this repository has been wrong about four times.
//
// TWO EDGE HOSTS IS, ON THE OTHER HAND, GENUINELY NEW — counted over the seven
// layers that pin EDGE_HOSTS at all, every one of which pins exactly ONE. §9
// asserts that over those seven, not over the chain, because most layers do not
// carry the constant and a denominator that includes them would be invented.
//
// ── THE SECOND CONSECUTIVE CUT INSIDE A `// ── ` BANNER REGION ─────────────
//
// The region opens ON the banner `// ── CANONICAL LEG QUANTITY`, whose region
// runs 7,697 units over SEVENTEEN owners. Obeying the rule this programme
// killed — "never cut inside a `// ── ` banner region", pinned as dead in §5(c)
// of tests/journal-map-audit-boundary-contract.test.js — would add 4,362 units,
// twelve unrelated owners, and take byConsumer from 2 to 24. §5(c) measures
// both sides.
//
// ── A PRODUCTION PROSE CLAIM THAT IS WRONG, AND WILL SHIP VERBATIM ─────────
//
// The banner's prose says the owners are declared as functions so that "the
// thirteen suites that build sandboxes out of individually extracted functions"
// resolve them. FOURTEEN suites quote one of these five names — and fourteen
// did so at f5113b4, the commit that introduced the sentence, so this was wrong
// when written rather than drifted into. §8 measures it, and also measures the
// thing that actually matters for Phase 2: all fourteen reach the source
// through tests/lib/load-app-source.js, which concatenates the modules, so the
// extraction breaks none of them.
//
// THIS AUDIT DOES NOT FIX THE SENTENCE. Phase 1 is byte-identical by
// construction, and Phase 2 relocates bytes verbatim — so the wrong number
// would be carried into the module unchanged. Correcting it is a production
// change and belongs in a PR of its own; §8 pins the claim so that PR has
// something to fail against.
//
// ── WHY THE OTHER BOUNDARIES ARE REFUSED ───────────────────────────────────
//
// §5 measures four alternatives:
//
//   (a) starting at the FIRST FUNCTION instead of the banner — identical
//       coupling on every axis, 1,184 units smaller, and it abandons the banner
//       that carries the reconciliation's entire rationale.
//   (b) taking the sixth owner — the nine falls 6 → 4, byConsumerSplit rises
//       2 → 3, and a foundation module acquires an edge into the chain.
//   (c) obeying the dead rule — 4,362 more units, byConsumer 2 → 24, eight
//       consumers instead of two. This is the banner-region finding, executed.
//   (d) taking the seventh owner — the nine falls again to 3, byConsumerSplit
//       stays at 3. The direction of the disagreement is confirmed, not
//       reversed, by going further.
//
// ── WHERE IT WOULD SIT ─────────────────────────────────────────────────────
//
// SECOND SMALLEST of the forty shipped layers: only one is smaller, at 1,761
// units. §9 asserts the rank by measurement, and the audit states it plainly
// rather than selling a 3,334-unit cut as a substantial one. The case for it is
// coupling, which is the axis this programme chose on purpose.
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

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-leg-quantity.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '8acdfb8';
const BASE_CHARS = 1463808;
const BASE_UTF8 = 1492447;
const BASE_LF = 25328;
const BASE_SHA256 = 'f838cb8fce06df6395aa8ea73075d8e0b37818c5852824763fa6e01c580c0250';
const LOCAL_SCRIPTS = 84;
const BASE_TEST_FILE_COUNT = 168;
const TEST_FILE_COUNT = 169;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-leg-quantity-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-leg-quantity-audit.spec.js';
const RATCHETED_CONTRACTS = 31;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const NEWEST_CONTRACT = 'tests/apex-storage-recovery-boundary-contract.test.js';
const NEWEST_CONTRACT_SPEC = 'tests/mutation-specs/apex-storage-recovery-contract.spec.js';
const BASE_DECLARED_MUTANTS = 144;
// The spec this cycle retires, and what it carried. §11 asserts the arithmetic
// rather than the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/apex-storage-recovery-contract.spec.js';
const RETIRED_MUTANTS = 138;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js` — the narrower one
// cannot see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114927;
const CODE_CHARS = 1348855;
const TOP_LEVEL_DECLS = 925;
const TOP_LEVEL_BANNERS = 220;
const OWNER_REGIONS = 119;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 747320;
const RAW_END_IN_CODE = 750655;
const BODY_END_IN_CODE = 750654;
const RAW_CHARS = 3335;
const BODY_CHARS = 3334;
const BODY_UTF8 = 3354;
const BODY_LF = 68;
const BODY_SHA256 = '864defd055e60aac363773766b742db8ebb941ea40d8b15e9211e419ffc301c1';
const BODY_ENDING = '}\n';
const OWNERS_EXPECTED = [
  '_portfolioResidualQuantityFields',
  '_portfolioGrossQuantityFields',
  '_portfolioQuantityFieldPresent',
  '_portfolioStrictQuantity',
  '_portfolioReadQuantityField',
];
const OWNER_COUNT = 5;
const OWNER_SIZES = [273, 87, 237, 255, 321];
// `split('\n')` on text ending in a newline leaves a PHANTOM empty final
// element. That is a named way this repository's scratch tools have been wrong,
// so the phantom is pinned here rather than absorbed into a line count: the
// three real counts below sum to BODY_LF, not to SPLIT_LINES.
const SPLIT_LINES = 69;
const CODE_LINES = 33;
const COMMENT_LINES = 32;
const BLANK_LINES = 3;
// The block the cut OPENS on: a `// ── ` banner line and the prose under it,
// running to the first declaration.
const OPENING_BLOCK_CHARS = 1184;
const OPENING_BLOCK_LINES = 19;
const BANNER_LINE =
  '// ── CANONICAL LEG QUANTITY — reconciled with the backend owner (semantics 2.1.0)';
const NET_REDUCTION = 3270;
const RESIDUAL_MONOLITH = 1345520;
const INDEX_AFTER = 1460538;
const TAG_GAP = 747328;

// ── Where audit #470 published this region, before its own cut moved it ──────
const PUBLISHED_BY = 'tests/apex-storage-recovery-boundary-contract.test.js';
const PUBLISHED_AT = 751577;
const PUBLISHED_END = 754911;
const PUBLISHED_SHIFT = 4257;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 6;
const EDGE_SITES = [750828, 750861, 751044, 751077, 751280, 751313];
const EDGE_HOSTS = ['_portfolioLegExplicitOpenQty', '_portfolioResolveLegQuantity'];
const DISTINCT_CONSUMERS = 2;
const CONSUMER_SIZES = [184, 450];
// EMPTY, which is the direction that usually is not. Six of the twenty layers
// that pin this constant pin it empty too — §3 counts them rather than calling
// this a first.
const MONOLITH_DEPENDENCIES = [];
const LAYERS_PINNING_DEPENDENCIES = 20;
const LAYERS_WITH_NO_DEPENDENCY = 6;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const FULL_NINE = 6;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
// The host globals the region reaches, which are NOT monolith declarations and
// so score in none of the nine directions. All three are ECMAScript intrinsics
// present in any context, which is why §7 drives the owners with NOTHING
// injected — not a claim that the region closes over only its arguments.
const HOST_GLOBAL_REFS = { Object: 1, isFinite: 2, Number: 1 };
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 5;

// ── THE FINDING: the two metrics disagree in direction ───────────────────────
const SIXTH_OWNER = '_portfolioResolveLegQuantity';
const SEVENTH_OWNER = '_portfolioLegExplicitOpenQty';
const ALT_SIX_END = 751218;
const ALT_SEVEN_END = 751404;
const NINE_SERIES = [6, 4, 3];
const SPLIT_SERIES = [2, 3, 3];
const INBOUND_SERIES = [6, 3, 2];
const SIBLING_SERIES = [0, 1, 1];
const MODULE_CONSUMER = 'js/services/portfolio-stress-parity.js';
const MODULE_CONSUMER_REFS = 1;
// Module-to-module edges are COMMONPLACE, and this is the count that stops the
// finding reading as a first. It is the total over the shipped chain.
const CHAIN_TO_CHAIN_EDGES = 74;

// ── The banner region, and the rule that is dead ─────────────────────────────
const BANNER_REGION_AT = 747320;
const BANNER_REGION_END = 755017;
const BANNER_REGION_CHARS = 7697;
const BANNER_REGION_OWNERS = 17;
const EXTRA_BANNER_OWNERS = 12;
const DEAD_RULE_EXTRA_UNITS = 4362;
const DEAD_RULE_NINE = 41;
const DEAD_RULE_BY_CONSUMER = 24;
const DEAD_RULE_CONSUMERS = 8;
const DEAD_RULE_CONTRACT = 'tests/journal-map-audit-boundary-contract.test.js';
const DEAD_RULE_VERDICT = 'is pinned here as dead rather than adopted';
// THREE files carry that verdict now, so carrying it names none of them. The
// ORDINAL does: exactly one file executes which dead rule this is.
const VERDICT_CARRIERS = 3;
const DEAD_RULE_ORDINAL = 3;
const DASH_BANNERS = 76;
const BANNERS_NAMING_AN_OWNER_THEY_GOVERN = 0;

// ── The refused boundaries, and the runner-up ────────────────────────────────
const ALT_FN_START_AT = 748504;
const ALT_FN_START_UNITS = 2151;
const RUNNER_UP_AT = 1159400;
const RUNNER_UP_END = 1162730;
const RUNNER_UP_OWNERS = 4;
const RUNNER_UP_BY_CONSUMER_SPLIT = 2;
const RUNNER_UP_FULL_NINE = 8;
const RUNNER_UP_CONSUMERS = 1;
const RUNNER_UP_FIRST_OWNER = 'PORTFOLIO_MISSING_UNDERLYINGS_FALLBACK_CAP';
// It ships a MUTABLE BINDING, which this cut does not, and it opens on a
// declaration rather than a banner. Both are recorded so the next cycle weighs
// them instead of rediscovering them.
const RUNNER_UP_VAR_OWNERS = 1;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7374;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3024;
const CLEAN_CANDIDATES = 1854;
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 3;
const ONE_CONSUMER_MULTI_SITE = 100;
const SCREEN_RANK = 4;
const BETTER_SCORING = 3;
const LARGER_AT_THE_SAME_SCORE = 0;
const AHEAD_OWNERS = [
  '_snapshotSqueezeState',
  '_validateBackendFullRefreshPayload',
  '_fetchPortfolioTechnicalBatch',
];
const SECTION_REGION_CHARS = 9206;
const SECTION_REGION_OWNERS = 3;
const CATCH_ALL_AT = 902377;
const CATCH_ALL_END = 971635;
const CATCH_ALL_CHARS = 69258;
const CATCH_ALL_OWNERS = 27;

// ── The production prose claim, and the harness that actually matters ────────
const PROSE_CLAIM = 'thirteen suites';
const PROSE_COMMIT = 'f5113b4';
const SUITES_QUOTING_AN_OWNER = 14;
const SUITES_VIA_LOADER = 14;
const SUITES_READING_INDEX_DIRECTLY = 0;
const LOADER_REL = 'tests/lib/load-app-source.js';

// ── Where this layer would sit ───────────────────────────────────────────────
const CHAIN_LENGTH = 40;
const SIZE_RANK_IF_CUT = 2;
const SMALLEST_LAYER_CHARS = 1761;
const LARGEST_LAYER_CHARS = 71811;
const LAYERS_LARGER_THAN_THIS_CUT = 39;
const PURE_ASCII_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 22;
const LAYERS_PINNING_EDGE_HOSTS = 7;
const LAYERS_WITH_A_SINGLE_EDGE_HOST = 7;
const LAYERS_ON_THESE_HUBS = 0;

// ── Reachability at this base ────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
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

console.log('CANONICAL LEG QUANTITY — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures.
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

// CHAIN, read off the newest contract rather than written here: it is that file
// that carries the list, and copying it would be a second place to drift.
const CHAIN = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8')
  .match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
  .map((l) => l.replace(/^'|',?$/g, ''));
const CHAIN_SET = new Set(CHAIN);
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
section('2. The recommended region, its boundary and its seam');
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
ok(/[^\x00-\x7F]/.test(BODY),
  'it is NOT pure ASCII — the rule characters and the em dash in its banner settle that');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  eq(next.name, SIXTH_OWNER,
    'the next top-level owner is SIXTH_OWNER, which §4 is about');
  const block = blockAbove(next);
  ok(block, '…and it is headed by a comment block of its own');
  eq(block.start, RAW_END_IN_CODE,
    '…beginning at EXACTLY the raw end, so the seam falls between the two features rather '
    + 'than inside either');
}
// THE PHANTOM FINAL ELEMENT, pinned rather than absorbed. `split('\n')` on text
// that ends in a newline yields one more element than there are lines, and that
// is a named way this repository's scratch tools have been wrong.
{
  const lines = BODY.split('\n');
  eq(lines.length, SPLIT_LINES, 'splitting the body on newlines yields SPLIT_LINES elements');
  eq(lines[lines.length - 1], '',
    '…the last of which is EMPTY: the phantom that a trailing newline leaves behind');
  eq(SPLIT_LINES - 1, BODY_LF, '…so the real line count is BODY_LF, one fewer');
  const real = lines.slice(0, -1);
  eq(real.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, 'CODE_LINES of them are code');
  eq(real.filter((l) => /^\s*\/\//.test(l)).length, COMMENT_LINES, '…COMMENT_LINES are comment');
  eq(real.filter((l) => l.trim() === '').length, BLANK_LINES, '…and BLANK_LINES are blank');
  eq(CODE_LINES + COMMENT_LINES + BLANK_LINES, BODY_LF,
    '…the three summing to BODY_LF and NOT to SPLIT_LINES, which is the whole point of '
    + 'pinning the phantom');
}
// THE NEAR SIDE: the cut opens ON a banner mark.
ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0, 'the cut DOES begin on a banner mark');
eq(firstLineOf(BODY), BANNER_LINE, '…that mark being BANNER_LINE');
eq(BY_NAME.get(OWNERS_EXPECTED[0]).start - RAW_AT_IN_CODE, OPENING_BLOCK_CHARS,
  '…which runs OPENING_BLOCK_CHARS units, banner and prose, before the first declaration');
{
  const block = CODE.slice(RAW_AT_IN_CODE, RAW_AT_IN_CODE + OPENING_BLOCK_CHARS);
  const blockLines = block.split('\n').filter(Boolean);
  ok(blockLines.every((l) => /^\s*\/\//.test(l)),
    '…every line of it a comment, so nothing executable is swept in');
  eq(blockLines.length, OPENING_BLOCK_LINES, '…OPENING_BLOCK_LINES of them');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    '…with a BLANK LINE before it, so the banner belongs to what FOLLOWS it');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE - 2), '}',
    '…and what precedes it closed on a brace, so nothing is left dangling');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly these five names');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…and ALL of them are functions, so this layer would ship no mutable binding at all');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes');
}
// THIS REGION IS THE RUNNER-UP AUDIT #470 PUBLISHED, and the shift is derived
// from that cycle's own extraction rather than asserted.
{
  const contract = fs.readFileSync(path.join(ROOT, PUBLISHED_BY), 'utf8');
  const at = Number(contract.match(/^const RUNNER_UP_AT = (\d+);$/m)[1]);
  const end = Number(contract.match(/^const RUNNER_UP_END = (\d+);$/m)[1]);
  eq(at, PUBLISHED_AT, 'the previous cycle published a runner-up at PUBLISHED_AT');
  eq(end, PUBLISHED_END, '…ending at PUBLISHED_END');
  const raw = Number(contract.match(/^const RAW_CHARS = (\d+);$/m)[1]);
  eq(raw, PUBLISHED_SHIFT, '…and its own cut removed PUBLISHED_SHIFT units, read from that contract');
  eq(at - raw, RAW_AT_IN_CODE,
    '…so the region it published is THIS one, shifted by exactly the bytes that left: the '
    + 'identity is derived, not asserted');
  eq(end - raw, BODY_END_IN_CODE, '…and its end lands on BODY_END_IN_CODE the same way');
  eq(Number(contract.match(/^const RUNNER_UP_OWNERS = (\d+);$/m)[1]), OWNER_COUNT,
    '…it predicted OWNER_COUNT owners');
  eq(Number(contract.match(/^const RUNNER_UP_BY_CONSUMER_SPLIT = (\d+);$/m)[1]), BY_CONSUMER_SPLIT,
    '…and BY_CONSUMER_SPLIT, both of which §3 re-derives and confirms');
}
// What the move would cost.
eq(RAW_CHARS - NET_REDUCTION, ('<script src="./' + MODULE_REL_IF_CUT + '"></script>\n').length,
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
section('3. Coupling in all nine directions, and the absent dependency');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'EXTERNAL_EDGES references reach in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at these exact sites');
ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
eq(consumersOf(REC), EDGE_HOSTS, '…hosted by exactly these TWO functions');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there are DISTINCT_CONSUMERS consumers');
{
  const sizes = EDGE_HOSTS.map((n) => BY_NAME.get(n).chars);
  eq(sizes, CONSUMER_SIZES, '…of CONSUMER_SIZES units');
  ok(EDGE_HOSTS.every((n) => {
    const h = BY_NAME.get(n);
    return h.start >= RAW_END_IN_CODE || h.end < RAW_AT_IN_CODE;
  }), '…both declared outside the region, so the edges really do cross the boundary');
  ok(EDGE_HOSTS.every((n) => BY_NAME.get(n).start >= RAW_END_IN_CODE),
    '…and BOTH of them FOLLOW it: the consumers sit immediately downstream of the '
    + 'vocabulary they read, which is what §4 is about');
}
// THE DEPENDENCY DIRECTION IS EMPTY, which is unusual but NOT a first. The
// denominator is the layers that pin the constant, because most do not.
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names NO monolith declaration at all: the dependency direction is empty');
{
  const pinned = [];
  for (const rel of CHAIN) {
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
    '…and LAYERS_WITH_NO_DEPENDENCY of them pin it EMPTY, so an empty dependency direction '
    + 'is a property six layers already have and not a superlative this cut invents');
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
eq(REC.sib, 0,
  'NO shipped module reaches into this region: the sibling direction is zero, which §4 shows '
  + 'is exactly what the larger cuts give up');
// THE HOST GLOBALS, which are not monolith declarations and so are in none of
// the nine directions. Naming them here is what makes §7's bare drive honest:
// the reason nothing needs injecting is that all three are intrinsics, not that
// the region closes over only its arguments.
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
// THE NINTH, SPLIT. Both halves are zero, which is not the same claim twice.
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND,
    'it reaches into NO module this programme extracted: CHAIN_OUTBOUND references');
  eq(split.foundation, FOUNDATION_OUTBOUND,
    '…and FOUNDATION_OUTBOUND into modules that predate it either, which is the other half');
  eq(split.chain + split.foundation, REC.outModule,
    '…and the two halves account for every outbound module reference, none left over');
  // THE CONTROL. A split that returned zero for everything would say so here
  // too, and elsewhere in this document it does not.
  const prev = outboundSplit(CODE.indexOf('function refreshPositionsLive'), CODE.length);
  ok(prev.foundation > 0,
    'control — the same split reports a NON-zero foundation half elsewhere in this document');
}
eq(REC.nine, FULL_NINE, 'the nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…BY_CONSUMER when the edges are counted per consumer');
eq(byConsumerSplit(REC, outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE)), BY_CONSUMER_SPLIT,
  '…and BY_CONSUMER_SPLIT once the foundation half is set aside — the same number, because '
  + 'this region has no foundation half to set aside');

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the two metrics disagree in direction');
// ─────────────────────────────────────────────────────────────────────────────
const alt = (lo, hi) => {
  const be = snapBodyEnd(CODE, lo, hi);
  assertSeam(CODE, lo, be);
  const p = profileOf([lo, be + 1]);
  const s = outboundSplit(lo, be + 1);
  return { p, split: s, units: be + 1 - lo, bcs: byConsumerSplit(p, s) };
};
{
  // The three cuts are anchored to DOCUMENT FEATURES — the starts of the owners
  // that follow — rather than left as bare offsets, because `alt` snaps its end
  // back to the last line of code and would absorb a one-unit mutation.
  const after = DECLS.filter((d) => d.start >= RAW_END_IN_CODE);
  eq(after[0].name, SIXTH_OWNER, 'the sixth owner is SIXTH_OWNER');
  eq(after[1].name, SEVENTH_OWNER, '…and the seventh is SEVENTH_OWNER');
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, after[1].start) + 1, ALT_SIX_END,
    'ALT_SIX_END is where the body ends once the sixth owner is taken');
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, after[2].start) + 1, ALT_SEVEN_END,
    '…and ALT_SEVEN_END once the seventh is');

  const five = { p: REC, split: outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE) };
  const six = alt(RAW_AT_IN_CODE, ALT_SIX_END);
  const seven = alt(RAW_AT_IN_CODE, ALT_SEVEN_END);
  const series = [five, six, seven];

  eq(series.map((x) => x.p.names.length), [OWNER_COUNT, OWNER_COUNT + 1, OWNER_COUNT + 2],
    'the three cuts take five, six and seven owners');
  // THE TWO SERIES, MEASURED. This is the finding, and it is two arrays rather
  // than a sentence about them.
  eq(series.map((x) => x.p.nine), NINE_SERIES,
    'the RAW nine-direction total FALLS as the cut grows: NINE_SERIES');
  eq(series.map((x) => byConsumerSplit(x.p, x.split)), SPLIT_SERIES,
    '…while byConsumerSplit, the metric this programme ranks on, RISES: SPLIT_SERIES');
  ok(NINE_SERIES[2] < NINE_SERIES[0] && SPLIT_SERIES[2] > SPLIT_SERIES[0],
    '…so the two metrics genuinely disagree about direction, which is the finding');
  ok(SPLIT_SERIES[0] === Math.min.apply(null, SPLIT_SERIES),
    '…and the FIVE-owner cut is the best on the metric that decides');

  // WHY, MEASURED IN THE TWO DIRECTIONS THAT MOVE.
  eq(series.map((x) => x.p.inbound), INBOUND_SERIES,
    'growing the cut absorbs its own consumers, so inbound monolith edges fall: INBOUND_SERIES');
  eq(series.map((x) => x.p.sib), SIBLING_SERIES,
    '…but a shipped MODULE acquires an edge into it, and keeps it: SIBLING_SERIES');
  eq(six.p.sibWho, [MODULE_CONSUMER],
    '…that module being MODULE_CONSUMER, named rather than counted');
  eq(seven.p.sibWho, [MODULE_CONSUMER], '…and the same one at seven owners');
  eq(five.p.sibWho, [], '…where the five-owner cut has none at all');
  {
    const mod = SIBLINGS.filter((s) => s.rel === MODULE_CONSUMER)[0];
    ok(mod, 'MODULE_CONSUMER is a module index.html actually loads');
    eq(refSites(mod.masked, SIXTH_OWNER).length, MODULE_CONSUMER_REFS,
      '…and it names SIXTH_OWNER MODULE_CONSUMER_REFS time');
    eq(OWNERS_EXPECTED.filter((n) => refSites(mod.masked, n).length > 0), [],
      '…while naming NONE of the five this cut takes, which is why the sibling direction is '
      + 'zero at five owners and one at six');
    ok(!CHAIN_SET.has(MODULE_CONSUMER),
      '…and MODULE_CONSUMER is NOT in the chain, so the edge the larger cuts acquire runs '
      + 'from a FOUNDATION module into a chain one');
  }
  // THIS IS NOT A CLAIM THAT MODULE-TO-MODULE EDGES ARE NEW. Counting them is
  // what keeps the finding from reading as a first, which is the shape of claim
  // this repository has been wrong about four times.
  {
    const mods = CHAIN.map((rel) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      return { rel, masked: maskLiterals(src), owners: scanTopLevelDeclarations(src).map((d) => d.name) };
    });
    let edges = 0;
    for (const a of mods) for (const b of mods) {
      if (a.rel === b.rel) continue;
      for (const n of b.owners) edges += refSites(a.masked, n).length;
    }
    eq(edges, CHAIN_TO_CHAIN_EDGES,
      'CHAIN_TO_CHAIN_EDGES references already run between shipped layers, so nothing here '
      + 'is a first: the specific claim is only that the five-owner boundary is where this '
      + 'particular acquisition is still avoidable');
    ok(edges > 0, '…and the counter is not reporting zero for want of measuring');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The refused boundaries, and the runner-up');
// ─────────────────────────────────────────────────────────────────────────────
// (a) START AT THE FIRST FUNCTION, abandoning the banner.
{
  eq(BY_NAME.get(OWNERS_EXPECTED[0]).start, ALT_FN_START_AT,
    'the first function begins at ALT_FN_START_AT');
  const a = alt(ALT_FN_START_AT, BODY_END_IN_CODE);
  eq(a.units, ALT_FN_START_UNITS, '…for a cut of ALT_FN_START_UNITS units');
  eq(RAW_CHARS - a.units, OPENING_BLOCK_CHARS, '…OPENING_BLOCK_CHARS smaller than the recommendation');
  eq(a.p.nine, FULL_NINE, '…at an IDENTICAL nine-direction total');
  eq(a.bcs, BY_CONSUMER_SPLIT, '…and an identical byConsumerSplit, so size is all it buys');
  eq(MARKS.indexOf(ALT_FN_START_AT), -1,
    '…while beginning on no banner at all, which discards the prose that records why the '
    + 'two tiers were reconciled');
}
// (b) and (d) TAKE THE SIXTH, THEN THE SEVENTH OWNER — measured in §4.
ok(SPLIT_SERIES[1] > SPLIT_SERIES[0],
  'taking the sixth owner is strictly worse on the deciding metric, which §4 measures');
ok(SPLIT_SERIES[2] > SPLIT_SERIES[0],
  '…and taking the seventh does not recover it, so going further confirms the direction');
// (c) OBEY THE DEAD RULE — the whole banner region.
{
  const band = REGIONS.filter((r) => r.start <= RAW_AT_IN_CODE && r.end > RAW_AT_IN_CODE)[0];
  eq(band.start, BANNER_REGION_AT, 'the banner region begins where the cut begins');
  eq(band.end, BANNER_REGION_END, '…and ends at BANNER_REGION_END');
  eq(band.end - band.start, BANNER_REGION_CHARS, '…BANNER_REGION_CHARS units in all');
  const own = DECLS.filter((d) => d.start >= band.start && d.end < band.end);
  eq(own.length, BANNER_REGION_OWNERS, '…holding BANNER_REGION_OWNERS top-level declarations');
  eq(own.slice(0, OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
    '…the first OWNER_COUNT of which are exactly this cut');
  eq(band.end - RAW_END_IN_CODE, DEAD_RULE_EXTRA_UNITS,
    'obeying the dead rule would add DEAD_RULE_EXTRA_UNITS units');
  // NOT `own.length - OWNER_COUNT` against `BANNER_REGION_OWNERS - OWNER_COUNT`:
  // `own.length` is pinned to BANNER_REGION_OWNERS two lines up, so that
  // comparison is true by arithmetic and checks nothing. The twelve are named
  // against the cut instead.
  const strangers = own.slice(OWNER_COUNT).map((d) => d.name);
  eq(strangers.length, EXTRA_BANNER_OWNERS, '…and EXTRA_BANNER_OWNERS further owners');
  eq(strangers.filter((n) => OWNERS_EXPECTED.indexOf(n) >= 0), [],
    '…none of which this feature contains, so the dead rule would swallow twelve strangers');
  eq(strangers[0], SIXTH_OWNER, '…the first of them being the sixth owner §4 weighs');
  const whole = profileOf([band.start, band.end]);
  const wsp = outboundSplit(band.start, band.end);
  eq(whole.nine, DEAD_RULE_NINE, 'the whole banner region scores DEAD_RULE_NINE on the nine');
  eq(byConsumer(whole), DEAD_RULE_BY_CONSUMER, '…DEAD_RULE_BY_CONSUMER per consumer');
  eq(consumersOf(whole).length, DEAD_RULE_CONSUMERS,
    '…reaching DEAD_RULE_CONSUMERS consumers where the cut reaches two');
  ok(byConsumerSplit(whole, wsp) > BY_CONSUMER_SPLIT * 10,
    '…an order of magnitude worse on the deciding metric, which is what makes this a '
    + 'counterexample and not a preference');
  // THE BANNER NAMES THE FAMILY IN PROSE AND NO OWNER BY IDENTIFIER, which is
  // the measurement audit #466 published, re-run rather than recalled.
  const bannerText = lineAt(band.start);
  eq(bannerText, BANNER_LINE, 'the banner line is BANNER_LINE');
  eq(own.filter((d) => namesIt(bannerText, d.name)).map((d) => d.name), [],
    '…and it names NONE of the seventeen by identifier');
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
    // THE CONTROL, because a zero and a predicate that measures nothing look
    // identical: the same scan over COMMENT BLOCKS is not zero.
    let blocks = 0;
    for (const d of DECLS) {
      const b = blockAbove(d);
      if (b && namesIt(firstLineOf(b.text), d.name)) blocks++;
    }
    ok(blocks > 0,
      'control — the same naming predicate over comment blocks is NOT zero, so the zero '
      + 'above is a measurement rather than a metric that measures nothing');
  }
  // THE RULE IS DEAD, and it is pinned as dead in one named file. Existence and
  // a common substring name nothing: every sibling contract ships too.
  ok(fs.existsSync(path.join(ROOT, DEAD_RULE_CONTRACT)),
    'DEAD_RULE_CONTRACT ships, which is where that rule is pinned as dead');
  const carriesVerdict = (src) => src.indexOf(DEAD_RULE_VERDICT + "'") >= 0;
  ok(carriesVerdict(fs.readFileSync(path.join(ROOT, DEAD_RULE_CONTRACT), 'utf8')),
    '…and it carries the verdict, matched to its closing quote because `indexOf` matches a '
    + 'substring');
  // EXISTENCE AND THE VERDICT TOGETHER STILL NAME NOTHING. Three files carry
  // that sentence now — the contract that pins the rule, the layer whose audit
  // was renamed into its own census, and THIS audit quoting it — so a mutant
  // pointing DEAD_RULE_CONTRACT at a neighbouring contract satisfied both
  // clauses and SURVIVED the pass. The previous cycle pinned "the ONLY contract
  // that carries that verdict", which was true when written and is false now.
  // What is singular is the ORDINAL: the file that pins the rule is the one
  // that records WHICH dead rule it is, and no other file carries that constant.
  {
    const carriers = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => f.endsWith('.test.js'))
      .filter((f) => carriesVerdict(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(carriers.length, VERDICT_CARRIERS,
      'VERDICT_CARRIERS files carry the verdict, so carrying it is NOT what names this one');
    ok(carriers.indexOf(path.basename(DEAD_RULE_CONTRACT)) >= 0, '…and this is among them');
    const ordinalPin = /^const DEAD_RULE_ORDINAL = (\d+);$/m;
    // SET ASIDE THIS FILE, for the reason §8 pins at length: the audit declares
    // DEAD_RULE_ORDINAL itself in order to check it, so a census over tests/
    // counts the census. Its FIRST draft did not, and the assertion failed on
    // its own author — which is the same self-inclusion twice in one file.
    const pinners = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => f.endsWith('.test.js') && f !== path.basename(AUDIT_REL))
      .filter((f) => ordinalPin.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(pinners, [path.basename(DEAD_RULE_CONTRACT)],
      '…while exactly ONE file executes the ordinal, and it is DEAD_RULE_CONTRACT: that is '
      + 'what makes it the contract that PINS the rule rather than one that mentions it');
    eq(Number(fs.readFileSync(path.join(ROOT, DEAD_RULE_CONTRACT), 'utf8')
      .match(ordinalPin)[1]), DEAD_RULE_ORDINAL,
    '…recording this as dead rule number DEAD_RULE_ORDINAL');
  }
  // THE SECOND CONSECUTIVE CYCLE TO CUT INSIDE A BANNER REGION. Executed rather
  // than narrated, and scoped to the two cycles it quantifies over: the
  // previous layer's own contract records the same shape, a region holding
  // strictly more owners than the cut took.
  {
    const prev = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
    const prevRegion = Number(prev.match(/^const BANNER_REGION_OWNERS = (\d+);$/m)[1]);
    const prevOwners = Number(prev.match(/^const OWNER_COUNT = (\d+);$/m)[1]);
    ok(prevRegion > prevOwners,
      'the layer shipped immediately before this one ALSO cut inside a `// ── ` banner '
      + 'region, which its own contract records — so this is the second consecutive cycle, '
      + 'a claim over exactly the two cycles named and not over the chain');
    ok(BANNER_REGION_OWNERS > OWNER_COUNT, '…and this cut has the same shape');
  }
}
// THE RUNNER-UP, published with its numbers so the next cycle need not re-derive
// them — which is exactly what audit #470 did for the region this one takes.
{
  eq(snapBodyEnd(CODE, RUNNER_UP_AT, DECLS.filter((d) => d.start > RUNNER_UP_END)[0].start),
    RUNNER_UP_END, 'RUNNER_UP_END is where the runner-up\'s last line of code falls');
  const r = alt(RUNNER_UP_AT, RUNNER_UP_END);
  eq(r.p.names.length, RUNNER_UP_OWNERS, 'the runner-up takes RUNNER_UP_OWNERS owners');
  eq(r.p.names[0], RUNNER_UP_FIRST_OWNER, '…the first being RUNNER_UP_FIRST_OWNER');
  eq(r.bcs, RUNNER_UP_BY_CONSUMER_SPLIT, '…scoring RUNNER_UP_BY_CONSUMER_SPLIT, the same as this cut');
  eq(r.p.nine, RUNNER_UP_FULL_NINE, '…but RUNNER_UP_FULL_NINE on the raw nine, which is worse');
  eq(consumersOf(r.p).length, RUNNER_UP_CONSUMERS, '…from RUNNER_UP_CONSUMERS consumer');
  ok(r.units < RAW_CHARS, '…and it is smaller, so nothing about it outranks the recommendation');
  // THE TWO PROPERTIES THE NEXT CYCLE SHOULD WEIGH, recorded rather than left
  // to be rediscovered.
  eq(DECLS.filter((d) => d.start >= RUNNER_UP_AT && d.end < RUNNER_UP_END)
    .filter((d) => d.form !== 'function').length, RUNNER_UP_VAR_OWNERS,
  '…it would ship RUNNER_UP_VAR_OWNERS mutable binding, which this cut does not');
  eq(MARKS.indexOf(RUNNER_UP_AT), -1,
    '…and it opens on a declaration rather than a banner, so it carries no prose of its own');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and the three candidates ahead of this one');
// ─────────────────────────────────────────────────────────────────────────────
eq(RUN_FLOOR, 1500, 'the screen floors runs at RUN_FLOOR units');
eq(rawRunCount, RAW_RUNS, 'it enumerates RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…of which assertSeam refuses SEAM_REJECTED');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
const cleanRuns = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
eq(cleanRuns.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
eq(cleanRuns.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_RAW,
  'ONE_CONSUMER_RAW scores 1 under the raw reading of the ninth');
eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 1).length, ONE_CONSUMER_SPLIT,
  '…ONE_CONSUMER_SPLIT under the split reading');
eq(cleanRuns.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
  ONE_CONSUMER_MULTI_SITE, '…and ONE_CONSUMER_MULTI_SITE have one consumer at more than one site');
{
  const rec = cleanRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE)[0];
  ok(rec, 'the screen enumerates this exact cut');
  const ranked = cleanRuns.slice()
    .sort((a, b) => byConsumerSplit(a.p, a.split) - byConsumerSplit(b.p, b.split) || b.units - a.units);
  eq(ranked.findIndex((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE) + 1, SCREEN_RANK,
    '…and ranks it SCREEN_RANK by byConsumerSplit then size');
  const better = cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) < BY_CONSUMER_SPLIT);
  eq(better.length, BETTER_SCORING, 'BETTER_SCORING clean candidates score better than it');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT
    && c.units > BODY_CHARS).length, LARGER_AT_THE_SAME_SCORE,
  '…and LARGER_AT_THE_SAME_SCORE are larger at the same score, so this is the largest of '
  + 'its class');
  // THE THREE AHEAD, by OWNER NAME rather than by offset, and each refusal
  // re-measured on this document rather than recalled from the audit that
  // first published it.
  eq(better.map((c) => c.p.names[0]).sort(), AHEAD_OWNERS.slice().sort(),
    'the three ahead are the regions owned by AHEAD_OWNERS');
  const bandOf = (at) => REGIONS.filter((r) => r.start <= at && r.end > at)[0];
  {
    const c = better.filter((x) => x.p.names[0] === AHEAD_OWNERS[0])[0];
    const b = bandOf(c.lo);
    eq(c.lo, b.start, 'the first opens exactly ON its region start');
    ok(/^\/\/ ═+/.test(lineAt(b.start)), '…and that region opens on a `// ═══` SECTION header');
    eq(b.end - b.start, SECTION_REGION_CHARS, '…of SECTION_REGION_CHARS units');
    eq(DECLS.filter((d) => d.start >= b.start && d.end < b.end).length, SECTION_REGION_OWNERS,
      '…holding SECTION_REGION_OWNERS owners');
    ok(b.end > c.hi,
      '…and the section CONTINUES past the cut, so taking the header would leave what keeps '
      + 'it with no title. That is the defect audit #462 published, re-measured here');
  }
  for (const name of AHEAD_OWNERS.slice(1)) {
    const c = better.filter((x) => x.p.names[0] === name)[0];
    const b = bandOf(c.lo);
    eq(b.start, CATCH_ALL_AT, name + ' sits inside the region at CATCH_ALL_AT');
    eq(b.end, CATCH_ALL_END, '…which ends at CATCH_ALL_END');
    eq(b.end - b.start, CATCH_ALL_CHARS, '…CATCH_ALL_CHARS units');
    eq(DECLS.filter((d) => d.start >= b.start && d.end < b.end).length, CATCH_ALL_OWNERS,
      '…holding CATCH_ALL_OWNERS owners: the mis-labelled catch-all audit #466 named');
    ok(c.lo > b.start, '…and it is a LONE owner well inside it, not a region start');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, and the five owners run');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'it loads in a COMPLETELY empty VM, defining exactly its own owners');
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
// THE OWNERS RUN, with no injection at all — there is nothing to inject, which
// is §3's empty dependency direction executed rather than restated. Every drive
// below is a PAIR whose answers differ, because a helper that always returned
// the same shape would pass a test that only ever fed it one.
{
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  // Values cross OUT of the VM, so an array built inside it is a foreign-realm
  // Array and deepStrictEqual compares prototypes. This normaliser is why.
  const plain = (v) => JSON.parse(JSON.stringify(v));

  const residual = plain(ctx._portfolioResidualQuantityFields());
  eq(residual.length, 12, 'the residual vocabulary is twelve fields');
  eq(residual[0], 'effectiveQty', '…led by the one the backend reads first');
  eq(plain(ctx._portfolioGrossQuantityFields()), ['qty', 'quantity', 'contracts'],
    '…and the gross vocabulary is a different, shorter list');
  eq(residual.filter((f) => ctx._portfolioGrossQuantityFields().indexOf(f) >= 0), [],
    '…sharing NO field with it, so "residual" and "gross" are disjoint questions');

  // PRESENT: own property, neither null nor undefined. Empty string IS present.
  eq(ctx._portfolioQuantityFieldPresent({ a: 1 }, 'a'), true, 'a recorded value is present');
  eq(ctx._portfolioQuantityFieldPresent({ a: null }, 'a'), false, '…null is not');
  eq(ctx._portfolioQuantityFieldPresent({ a: '' }, 'a'), true,
    '…and an EMPTY STRING is, which makes it invalid rather than absent');
  eq(ctx._portfolioQuantityFieldPresent(Object.create({ a: 5 }), 'a'), false,
    '…while an INHERITED name is not present, so Object.prototype cannot be mistaken for data');
  eq(ctx._portfolioQuantityFieldPresent(null, 'a'), false, '…and a null leg is not an object');

  // STRICT: deliberately not parseFloat.
  eq(ctx._portfolioStrictQuantity(3), 3, 'a finite number reads as itself');
  eq(ctx._portfolioStrictQuantity(' 4 '), 4, '…a well-formed numeric string parses');
  eq(ctx._portfolioStrictQuantity('3abc'), null,
    '…and "3abc" is NULL where parseFloat would answer 3, turning a corrupted field into a '
    + 'plausible position');
  ok(parseFloat('3abc') === 3,
    '…control — parseFloat really does answer 3 here, so that contrast is measured');
  eq([''].concat([true, {}, NaN, Infinity]).map((v) => ctx._portfolioStrictQuantity(v)),
    [null, null, null, null, null],
    '…and empty string, booleans, objects, NaN and Infinity are all null');

  // THE FIRST FIELD PRESENT WINS OUTRIGHT, even when unreadable.
  const leg = { openQty: '', qty: 7 };
  eq(plain(ctx._portfolioReadQuantityField(leg, residual)),
    { present: true, source: 'openQty', value: null },
    'the first PRESENT residual field wins even though its value is unusable');
  eq(plain(ctx._portfolioReadQuantityField(leg, ctx._portfolioGrossQuantityFields())),
    { present: true, source: 'qty', value: 7 },
    '…while the gross vocabulary reads 7 from the same leg, so the two drives disagree and '
    + 'the reader is being measured rather than echoed');
  eq(plain(ctx._portfolioReadQuantityField({}, residual)),
    { present: false, source: null, value: null },
    '…and nothing recorded reads as absent, which a caller can tell from unusable');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. A production prose claim that is wrong, and ships verbatim');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(BODY.indexOf(PROSE_CLAIM) >= 0,
    'the region\'s own prose claims PROSE_CLAIM build sandboxes out of these functions');
  const OWNER_RE = OWNERS_EXPECTED.map((n) => "['\"]" + n + "['\"]").join('|');
  const suites = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js'));
  const quotingAll = suites.filter((f) =>
    new RegExp(OWNER_RE).test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  // THIS FILE IS IN THE CENSUS IT TAKES. OWNERS_EXPECTED quotes all five names,
  // so a census over tests/ counts the audit itself and reports one too many.
  // That is pinned rather than quietly filtered: the same self-inclusion turned
  // a "the ONLY contract" claim false one cycle ago, and a filter with no
  // assertion behind it is how it gets rediscovered a third time.
  eq(quotingAll.length, SUITES_QUOTING_AN_OWNER + 1,
    'a census over tests/ reports one MORE than the suites that use these functions');
  ok(quotingAll.indexOf(path.basename(AUDIT_REL)) >= 0,
    '…because THIS FILE quotes all five names in OWNERS_EXPECTED and is itself a .test.js');
  const quoting = quotingAll.filter((f) => f !== path.basename(AUDIT_REL));
  eq(quoting.length, SUITES_QUOTING_AN_OWNER,
    '…so with the audit set aside, SUITES_QUOTING_AN_OWNER suites name one of the five as a '
    + 'quoted extraction argument');
  ok(SUITES_QUOTING_AN_OWNER !== 13,
    '…which is not thirteen, so the sentence is WRONG as it stands');
  ok(quoting.length < suites.length,
    '…while most suites do not, so the predicate distinguishes and is not counting everything');
  // IT WAS WRONG WHEN WRITTEN, not drifted into: the same predicate over the
  // commit that INTRODUCED the sentence already answered fourteen.
  {
    const files = git(['ls-tree', '-r', '--name-only', PROSE_COMMIT, 'tests/'])
      .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f));
    let then = 0;
    for (const f of files) {
      if (new RegExp(OWNER_RE).test(git(['show', PROSE_COMMIT + ':' + f]))) then++;
    }
    eq(then, SUITES_QUOTING_AN_OWNER,
      'at PROSE_COMMIT, which introduced the sentence, the count was ALREADY '
      + 'SUITES_QUOTING_AN_OWNER — so this was wrong at birth rather than drifted into');
    // PRESENCE ALONE DOES NOT NAME THE COMMIT THAT INTRODUCED IT. The sentence
    // is carried by every commit from here to HEAD and the count has been
    // fourteen throughout, so a mutant moving PROSE_COMMIT to a LATER commit
    // satisfied both clauses above and SURVIVED the pass. What identifies the
    // commit that introduced it is the one thing only it has: a parent without
    // the sentence. That is also the assertion the "wrong at birth" claim
    // actually rests on — without it the claim is about some commit, not this one.
    ok(git(['show', PROSE_COMMIT + ':index.html']).indexOf(PROSE_CLAIM) >= 0,
      '…and that commit really does carry the sentence');
    eq(git(['show', PROSE_COMMIT + '~1:index.html']).indexOf(PROSE_CLAIM), -1,
      '…while its PARENT does not, which is what makes PROSE_COMMIT the commit that '
      + 'INTRODUCED the sentence rather than merely one that carries it');
  }
  // WHAT ACTUALLY MATTERS FOR PHASE 2, which the wrong number distracts from:
  // every one of those suites reaches the source through the loader, which
  // concatenates the modules — so relocating these functions breaks none of them.
  {
    let viaLoader = 0, direct = 0;
    for (const f of quoting) {
      const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
      if (/load-app-source/.test(src)) viaLoader++;
      if (/readFileSync\([^)]*index\.html/.test(src)) direct++;
    }
    eq(viaLoader, SUITES_VIA_LOADER,
      'SUITES_VIA_LOADER of them read the application source through the loader');
    eq(direct, SUITES_READING_INDEX_DIRECTLY,
      '…and SUITES_READING_INDEX_DIRECTLY read index.html directly, so none would stop '
      + 'finding these functions once they move');
    eq(viaLoader, quoting.length, '…which is ALL of them, counted over the same set');
    const loader = fs.readFileSync(path.join(ROOT, LOADER_REL), 'utf8');
    ok(/loadAppJavaScriptSource/.test(loader),
      '…the loader being LOADER_REL, which exists and exposes that entry point');
    // ANCHORED ON CONTIGUOUS INNER TEXT, because the sentence this reads for is
    // wrapped across two comment lines in that file and the phrase a reader
    // would quote does not exist as one string.
    ok(loader.indexOf('functions later move to external local scripts') >= 0,
      '…and which documents this exact guarantee, so the safety is designed rather than '
      + 'incidental');
  }
  // THIS AUDIT DOES NOT FIX IT. Phase 1 is byte-identical and Phase 2 relocates
  // bytes verbatim, so the wrong number travels into the module unchanged.
  ok(BODY.indexOf(PROSE_CLAIM) >= 0 && sha256(BODY) === BODY_SHA256,
    'the sentence is INSIDE the body Phase 2 must reproduce byte-for-byte, so the correction '
    + 'cannot ride along with the relocation and belongs in a production PR of its own');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Reachability, and where this layer would sit');
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
    '…and NO owner of this cut is among them: all five are live code');
}
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT by size — the SECOND SMALLEST layer in the chain, '
    + 'and the audit says so rather than selling it as a substantial one');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS,
    '…and it would NOT become the smallest, so it displaces no superlative and re-pins no '
    + 'earlier contract');
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'PURE_ASCII_LAYERS shipped layers are pure ASCII');
  ok(/[^\x00-\x7F]/.test(BODY), '…and this region would NOT join them, so that count is unchanged');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(/^\/\/ ── /.test(BODY.split('\n')[0]), '…and this one WOULD');
}
// TWO EDGE HOSTS, counted over the layers that pin EDGE_HOSTS rather than over
// the chain: most layers do not carry the constant, and a denominator that
// included them would be invented.
{
  const pinned = [];
  for (const rel of CHAIN) {
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
  eq(pinned.filter((x) => x.hosts.length === 1).length, LAYERS_WITH_A_SINGLE_EDGE_HOST,
    '…and EVERY one of them names exactly ONE consumer');
  eq(LAYERS_WITH_A_SINGLE_EDGE_HOST, LAYERS_PINNING_EDGE_HOSTS,
    '…so two hosts would be new — over the seven that pin it, which is the only set this '
    + 'can honestly be measured against');
  eq(pinned.filter((x) => x.hosts.some((h) => EDGE_HOSTS.indexOf(h) >= 0)).length,
    LAYERS_ON_THESE_HUBS,
  '…and LAYERS_ON_THESE_HUBS of them name either of THIS cut\'s consumers');
  ok(pinned.some((x) => x.hosts[0] === 'refreshPositionsLive'),
    '…control — the same read does find a hub that several layers share, so the zero above '
    + 'is a measurement');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Production is byte-identical to the base');
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
section('11. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  ok(all.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  ok(all.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  ok(all.every((rel) => rel.startsWith('tests/')), '…and every changed path is a test artifact');
  // THE RATCHET. One file arrives, and every contract that pins the suite size
  // has to be told.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this audit in it');
  eq(TEST_FILE_COUNT - BASE_TEST_FILE_COUNT, 1, '…exactly one more than the base');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, BASE_TEST_FILE_COUNT,
  '…and BASE_TEST_FILE_COUNT is what the base commit carried, read out of git');
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
  // THE BUDGET, executed rather than narrated.
  const auditSpec = require(path.join(ROOT, AUDIT_SPEC_REL));
  eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length - RETIRED_MUTANTS,
    '…and the live total is the base, LESS the spec this cycle retires, PLUS this audit\'s '
    + 'own — the arithmetic of the change rather than the total it happens to reach');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at MUTANT_BUDGET');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  // ABSENCE ALONE IS NOT A PIN: any wrong path is also absent, so the retired
  // spec is named by what the BASE commit carried.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the outgoing layer\'s spec is retired, in Phase 1 as the rhythm now runs');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely a path that never existed');
  ok(fs.existsSync(path.join(ROOT, NEWEST_CONTRACT)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + NEWEST_CONTRACT + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  eq(RETIRED_SPEC_REL, NEWEST_CONTRACT_SPEC,
    'the retired path IS the newest layer\'s spec: the retirement is in chain order');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + NEWEST_CONTRACT_SPEC]), '',
    '…a path the base commit really carried');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(AUDIT_SPEC_REL)],
    '…and during Phase 1 it is THIS audit\'s');
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_LEG_QUANTITY_AUDIT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
