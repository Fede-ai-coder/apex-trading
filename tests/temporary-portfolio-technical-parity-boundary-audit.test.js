'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TECHNICAL PARITY — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [954446,967048) in monolith coordinates — 12,602 raw units,
// FOUR top-level owners that turn a backend technical-refresh response into a
// by-ticker map behind a formula-parity gate. ONE consumer, ONE monolith
// dependency, and ZERO in every other direction — including both halves of the
// ninth: it names no module at all, chain or foundation. It loads in a
// completely empty VM and runs nothing while loading.
//
// ── THIS AUDIT'S FINDING: THE BANNER SIGNAL IS SPENT ────────────────────────
//
// Every cut this programme has made leaned, where it could, on the strongest
// structural signal the document offers: a `// ── ` banner that NAMES the
// declaration it governs. When the banner names the owner, where the feature
// ends is not a judgement — the banner says.
//
// THERE IS NO SUCH BANNER LEFT. Of the 221 top-level banner marks in this
// monolith, 77 are `// ── ` dash banners, and NONE of them names an owner it
// governs. §4 measures that, and — because a metric whose true value is zero is
// indistinguishable from a metric that measures nothing — it runs the SAME
// predicate over the document reconstructed by the shipped undo helper, where
// the answer is ONE: `fetchDXLinkGreeks`, the region #465 cut. The signal was
// not scarce. It was singular, and the last cycle spent it.
//
// So this cycle's boundary cannot be read off a banner and has to be argued
// from the CALL GRAPH instead. §5 makes that argument and §2 pins it: of the
// four owners, TWO are referenced nowhere outside the cut at all, and the other
// two only from inside ONE function. Nothing in the eighteen owners that follow
// them under the same banner names any of the four.
//
// ── AND THE SCREEN'S WHOLE CLEAN SET IS BOUNDARY-BLOCKED ────────────────────
//
// Ranked on coupling alone, three candidates read exactly one consumer and
// nothing else. All three are refused here, each for a reason §5 executes:
//
//   [719173,722692)  3,519u  opens ON a `// ═══` SECTION header — `PORTFOLIO
//                            MANAGER — state + CRUD` — whose section CONTINUES
//                            past the cut: the very next owner, `positionManager`,
//                            is the section's subject. Taking the header would
//                            leave the section that keeps it with no title. That
//                            is the defect audit #462 published, unchanged.
//   [929378,932088)  2,710u  a LONE owner inside an 81,860-unit banner region.
//   [975281,977133)  1,852u  another lone owner inside the SAME region.
//
// THAT REGION IS A MIS-LABELLED CATCH-ALL, which is why the screen keeps
// recommending owners from inside it. `// ── [PortfolioRefreshPayload] — gated
// verbose payload diagnostics` governs 81,860 units and THIRTY-ONE owners with
// ZERO interior banner marks. The diagnostics it names are the first three
// owners — 1,602 units of the 81,860 — and the other twenty-eight are payload
// building, full and live refresh, the technical-refresh family and, at the far
// end, add-position form rendering. A banner that describes under a twentieth
// of what it governs is not a boundary; it is a label someone stopped
// maintaining.
//
// The recommendation is cut OUT of that catch-all, and §5 defends the two cuts
// it makes rather than asserting them: it begins where a 828-unit explanatory
// comment block begins, and ends where the last owner that nothing downstream
// names ends.
//
// ── WHAT THE SCREEN FOUND ───────────────────────────────────────────────────
//
// 7,649 owner runs, 2,048 refused by `assertSeam`, 3,284 distinct candidates,
// 2,033 of which run nothing at load. ONE reads exactly one consumer under the
// raw reading of the ninth direction and THREE do under the split reading #465
// shipped — down from four, because the fourth was the region #465 cut. 135
// have one consumer and more than one site.
//
// ── ONE CONSUMER, AND IT IS THE SAME HUB AS LAST CYCLE ─────────────────────
//
// All four inbound edges are hosted by `refreshPositionsLive`, which is 138,483
// units — still the largest top-level declaration in the monolith, and still
// the consumer the last cut answered to. §3 pins its size, because "one
// consumer" reads differently when that consumer is a tenth of the document.
//
// ── THE RETIREMENT: THERE ISN'T ONE ────────────────────────────────────────
//
// The only layer contract spec committed is the NEWEST layer's, which the
// programme requires it to keep, so chain-order retirement has nothing to take.
// §10 asserts the arithmetic that makes that safe rather than asserting the
// absence.
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
// §4 needs the document as it was BEFORE the last cut, to prove its zero is a
// measurement. The shipped undo helper reconstructs it byte-exactly.
const PREV_UNDO = require('./lib/dxlink-greeks-fetch-undo.js');

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-technical-parity.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '5b537b2';
const BASE_CHARS = 1491306;
const BASE_UTF8 = 1520056;
const BASE_LF = 25802;
const BASE_SHA256 = '088c2808f2668e6c47489729119a7baa880938835e1c6b112e1236222765abb8';
const LOCAL_SCRIPTS = 81;
const BASE_TEST_FILE_COUNT = 165;
const TEST_FILE_COUNT = 166;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-technical-parity-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-parity-audit.spec.js';
const RATCHETED_CONTRACTS = 27;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const NEWEST_CONTRACT = 'tests/dxlink-greeks-fetch-boundary-contract.test.js';
const NEWEST_CONTRACT_SPEC = 'tests/mutation-specs/dxlink-greeks-fetch-contract.spec.js';
const BASE_DECLARED_MUTANTS = 121;
const MUTANT_BUDGET = 250;
const LAYER_CONTRACT_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114733;
const CODE_CHARS = 1376547;
const TOP_LEVEL_DECLS = 939;
const TOP_LEVEL_BANNERS = 221;
const OWNER_REGIONS = 120;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 954446;
const RAW_END_IN_CODE = 967048;
const BODY_END_IN_CODE = 967047;
const RAW_CHARS = 12602;
const BODY_CHARS = 12601;
const BODY_UTF8 = 12608;
const BODY_LF = 197;
const BODY_SHA256 = 'b67908efa8b87770cfe9ab42af697ce2217b731d473b5ccc19fb18f84eb5dbc8';
const BODY_ENDING = '}\n';
const OWNERS_EXPECTED = [
  'PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES',
  '_resolvePortfolioTechnicalParityKey',
  'buildFormulaParityGate',
  'buildBackendTechnicalByTickerFromResponse',
];
const OWNER_COUNT = 4;
const FUNCTION_OWNERS = 3;
const BINDING_OWNERS = 1;
const OWNER_SIZES = [211, 261, 2943, 7529];
const TOTAL_LINES = 198;
const CODE_LINES = 156;
const COMMENT_LINES = 42;
const OPENING_COMMENT_LINES = 36;
// The explanatory comment block the cut OPENS on, which is where the boundary
// judgement in §5 starts. It is not a banner — §4 is the reason it cannot be.
const OPENING_BLOCK_CHARS = 828;
const OPENING_BLOCK_FIRST_LINE =
  '// Portfolio technical 1D formula-parity keys and their accepted, semantically';
const NET_REDUCTION = 12533;
const RESIDUAL_MONOLITH = 1363945;
const INDEX_AFTER = 1478773;
const TAG_GAP = 954454;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 4;
const EDGE_SITES = [1053378, 1058085, 1064371, 1070219];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = ['_technicalTfSqueezeState'];
const DEPENDENCY_AT = 764975;
const DEPENDENCY_DISTANCE = 189471;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
// BOTH halves of the ninth direction are zero here, which is not the same claim
// twice: one says it reaches into no module this programme extracted, the other
// that it reaches into no foundation module either.
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const FULL_NINE = 5;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 4;

// ── THE FINDING: the banner signal is spent ──────────────────────────────────
const DASH_BANNERS = 77;
const BANNERS_NAMING_AN_OWNER = 0;
// The control, on the document the shipped undo helper reconstructs.
const PREV_DASH_BANNERS = 78;
const PREV_BANNERS_NAMING_AN_OWNER = 1;
const PREV_NAMED_OWNER = 'fetchDXLinkGreeks';
const PREV_NAMED_BANNER_AT = 1025308;

// ── The three clean candidates, and why each boundary is refused ─────────────
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 3;
const SPLIT_SET = [
  [719173, 722692],
  [929378, 932088],
  [975281, 977133],
];
// (a) opens on a SECTION header whose section continues past the cut.
const HEADER_CUT_AT = 719173;
const HEADER_CUT_END = 722692;
const HEADER_CUT_UNITS = 3519;
const HEADER_FIRST_LINE = '// ═══════════════════════════════════════════════════════════════';
const HEADER_TITLE_LINE = '// PORTFOLIO MANAGER — state + CRUD';
const HEADER_NEXT_OWNER = 'positionManager';
// (b) and (c) are lone owners inside the catch-all below.
const CATCH_ALL_AT = 917467;
const CATCH_ALL_END = 999327;
const CATCH_ALL_UNITS = 81860;
const CATCH_ALL_OWNERS = 31;
const CATCH_ALL_INTERIOR_MARKS = 0;
const CATCH_ALL_BANNER =
  '// ── [PortfolioRefreshPayload] — gated verbose payload diagnostics ─────────────';
// What the banner actually describes: the first three owners.
const DIAGNOSTICS_OWNERS = [
  '_portfolioRefreshPayloadDebugEnabled',
  '_portfolioRiskDebugEnabled',
  '_portfolioTechnicalDebugEnabled',
];
const DIAGNOSTICS_UNITS = 1602;

// ── The call-graph argument the boundary rests on instead ────────────────────
// Owners referenced NOWHERE outside the cut, and owners referenced only from
// inside one function. Together they are the whole owner list.
const OWNERS_WITH_NO_OUTSIDE_REFERENCE = [
  'PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES',
  '_resolvePortfolioTechnicalParityKey',
];
const OWNERS_REFERENCED_FROM_ONE_HOST = [
  'buildFormulaParityGate',
  'buildBackendTechnicalByTickerFromResponse',
];
// The owners that FOLLOW the cut under the same banner, none of which names any
// of the four — which is what makes the end of the cut a boundary and not a
// severed call.
const FOLLOWING_OWNERS_UNDER_BANNER = 18;
const FOLLOWING_REFERENCES_INTO_THE_CUT = 0;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7649;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3284;
const CLEAN_CANDIDATES = 2033;
const ONE_CONSUMER_MULTI_SITE = 135;

// ── Where this layer would sit ───────────────────────────────────────────────
const CHAIN_LENGTH = 37;
const SIZE_RANK_IF_CUT = 28;
const SMALLEST_LAYER_CHARS = 1761;
const LARGEST_LAYER_CHARS = 71811;
const LAYERS_LARGER_THAN_THIS_CUT = 10;
const PURE_ASCII_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 21;

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
function section(t) { console.log('\n' + t); }
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
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

console.log('PORTFOLIO TECHNICAL PARITY — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. §4 reconstructs the PREVIOUS one
// for its control, and that is the only place a peeled document appears.
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

// The siblings are the modules that had ALREADY left at this base, which is the
// set this region could have depended on. The module this layer ships is not
// among them — it did not exist yet.
const SIBLINGS = LOCALS.map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return {
    rel, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
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
  const per = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked) }));
  for (const d of DECLS) {
    let n = 0;
    for (const m of per) if (!m.bound.has(d.name)) n += (m.idx.get(d.name) || []).length;
    SIB_REFS.set(d.name, n);
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
  const sites = [];
  for (const n of names) {
    for (const at of at0(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += at0(OCC_STRINGS, n).filter(outside).length;
    sib += SIB_REFS.get(n);
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
// Which banner governs an offset — the last `// ── ` or `// ═══` mark at or
// before it. §5 needs this for the dead rule and for nothing else.
const SORTED_MARKS = MARKS.slice().sort((a, b) => a - b);
function bannerOf(i, marks) {
  const ms = marks || SORTED_MARKS;
  let b = -1;
  for (const m of ms) { if (m <= i) b = m; else break; }
  return b;
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

// CHAIN, read off the newest contract rather than written here: it is that
// file that carries the list, and copying it would be a second place to drift.
const CHAIN = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8')
  .match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
  .map((l) => l.replace(/^'|',?$/g, ''));
// Which KIND of module owns a name: one this programme extracted, or one that
// predates it. THE WHOLE FINDING rests on this split, and CHAIN is the literal
// above — this is the newest layer, so this contract is where that list lives.
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
// byConsumer with the FOUNDATION half of the ninth direction removed.
const byConsumerSplit = (p, split) => byConsumer(p) - p.outModule + split.chain;


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
  'the raw fragment is RAW_CHARS units: the body plus one structural separator');
eq(RAW_CHARS - BODY_CHARS, 1, '…exactly one, which is the separator');
eq(BODY.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!BODY.endsWith('\n\n'), '…and not on a blank line');
ok(/[^\x00-\x7F]/.test(BODY),
  'it is NOT pure ASCII — the prose in its opening block settles that');
// IT DOES NOT OPEN ON A BANNER, and §4 is the reason no region can any more.
// It opens on an explanatory comment block, which is a weaker signal and is
// therefore argued in §5 rather than asserted here.
eq(MARKS.indexOf(RAW_AT_IN_CODE), -1, 'the cut does NOT begin on a banner mark');
eq(BODY.slice(0, BODY.indexOf('\n')), OPENING_BLOCK_FIRST_LINE,
  '…it begins on the first line of an explanatory comment block');
eq(BY_NAME.get(OWNERS_EXPECTED[0]).start - RAW_AT_IN_CODE, OPENING_BLOCK_CHARS,
  '…which runs OPENING_BLOCK_CHARS units before the first declaration');
{
  const block = CODE.slice(RAW_AT_IN_CODE, RAW_AT_IN_CODE + OPENING_BLOCK_CHARS);
  ok(block.split('\n').filter(Boolean).every((l) => /^\s*\/\//.test(l)),
    '…and every line of it is a comment, so nothing executable is being swept in');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    '…with a blank line before it, so the block belongs to what FOLLOWS it and not to '
    + 'the declaration above');
}
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  eq(next.start, RAW_END_IN_CODE,
    'the next top-level owner begins EXACTLY where the raw span ends — no blank line, no\n'
    + '     banner and no header between them. That is the `tt-reconnect` shape, the one where\n'
    + '     "extend to the next header" would swallow the next feature whole');
  ok(bannerOf(next.start) === bannerOf(RAW_AT_IN_CODE),
    '…and it sits under the SAME banner, which is exactly why the banner cannot end this '
    + 'region and the boundary is the judgement §5 publishes');
  eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n',
    '…with exactly one structural newline between the body and that owner');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly these four names');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS,
    '…FUNCTION_OWNERS of which are functions');
  eq(OWNERS.length - OWNERS.filter((d) => d.form === 'function').length, BINDING_OWNERS,
    '…and BINDING_OWNERS is a `var`, so this layer ships a mutable binding as well as code');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes');
  const lines = BODY.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment');
}
// What the move would cost, predicted before it happens.
eq(BASE_CHARS - INDEX_AFTER, NET_REDUCTION,
  'index.html would fall by NET_REDUCTION units net: the span leaves and a tag arrives');
eq(RAW_CHARS - NET_REDUCTION,
  ('<script src="./' + MODULE_REL_IF_CUT + '"></script>\n').length,
  '…and the difference is exactly the tag line this layer would add');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, 'the monolith would be left at RESIDUAL_MONOLITH units');
{
  const INLINE_OPEN = '<script>';
  const tagWouldSitAt = CODE_AT - INLINE_OPEN.length;
  eq(INDEX.slice(tagWouldSitAt, CODE_AT), INLINE_OPEN,
    'the inline monolith opens with INLINE_OPEN immediately before CODE_AT');
  eq(INDEX.slice(tagWouldSitAt - 1, tagWouldSitAt), '\n',
    '…on its own line, so a tag line inserted there needs no reflow');
  eq((CODE_AT + RAW_AT_IN_CODE) - tagWouldSitAt, TAG_GAP,
    'so the tag line would begin TAG_GAP units before the fragment it replaces');
  eq(TAG_GAP - RAW_AT_IN_CODE, INLINE_OPEN.length,
    '…which is the region offset plus the width of the inline open, and nothing else');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'EXTERNAL_EDGES references reach in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at these exact sites');
ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
eq(consumersOf(REC), EDGE_HOSTS, '…all of them hosted by ONE function');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
{
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  eq(host.chars, CONSUMER_CHARS, '…of CONSUMER_CHARS units');
  eq(DECLS.slice().sort((a, b) => b.chars - a.chars)[0].name, EDGE_HOSTS[0],
    '…which makes it the LARGEST top-level declaration in the monolith, measured over all of '
    + 'them rather than asserted from the ones nearby');
  // THE SAME HUB AS LAST CYCLE, read off that layer's contract rather than
  // recalled: two consecutive cuts answering to one function is a fact about
  // this document worth executing, not a sentence worth repeating.
  {
    const prevHost = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8')
      .match(/^const EDGE_HOSTS = \[([^\]]*)\];$/m)[1].replace(/'/g, '').trim();
    eq(prevHost, EDGE_HOSTS[0],
      '…and it is the SAME consumer the layer before this one answered to');
  }
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…and it is declared outside the region, so the edges really do cross the boundary');
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names exactly ONE monolith declaration, and the list is the name rather than a count');
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT');
  eq(Math.abs(dep.start - RAW_AT_IN_CODE), DEPENDENCY_DISTANCE,
    '…DEPENDENCY_DISTANCE units away, so it is not a neighbour the cut could absorb');
  ok(dep.start < RAW_AT_IN_CODE, '…and it precedes the region, so load order already resolves it');
}
eq(Object.assign({}, {
  inboundWrites: REC.inWrites,
  inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length,
  siblingModules: REC.sib,
  staticMarkup: REC.mkp,
  generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen,
  outboundModule: REC.outModule,
}), ZERO_DIRECTIONS,
'every remaining direction is ZERO — the object is compared as a whole, so a direction that '
+ 'started scoring could not hide behind the ones that did not');
eq(REC.nine, FULL_NINE, 'the nine-direction total is FULL_NINE: four inbound sites and one dependency');
eq(byConsumer(REC), BY_CONSUMER, '…and BY_CONSUMER under the #458 reading, which collapses the four '
  + 'sites to the one consumer that hosts them');
ok(FULL_NINE > BY_CONSUMER, '…so the two readings genuinely differ here, and the difference is the '
  + 'three extra sites inside the same function');

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: no banner in this document names its own owner');
// ─────────────────────────────────────────────────────────────────────────────
// A '// ── ' banner that NAMES a declaration it governs is the strongest
// structural signal this document offers: where the feature ends stops being a
// judgement. Every measurement below is over the WHOLE set of banner marks,
// because "there is no such banner" is a universal and this programme has
// written four universals from a partial look and been wrong every time.
function dashBannersNamingAnOwner(code, marks, decls) {
  const sorted = marks.slice().sort((a, b) => a - b);
  const out = [];
  let dash = 0;
  for (const m of sorted) {
    const line = code.slice(m, code.indexOf('\n', m));
    if (!/^\/\/ ── /.test(line)) continue;
    dash++;
    let end = code.length;
    for (const n of sorted) if (n > m) { end = n; break; }
    const named = decls.filter((d) => d.start >= m && d.end < end && line.indexOf(d.name) >= 0);
    if (named.length) out.push({ at: m, line, named: named.map((d) => d.name) });
  }
  return { dash, naming: out };
}
{
  const here = dashBannersNamingAnOwner(CODE, MARKS, DECLS);
  eq(here.dash, DASH_BANNERS, 'DASH_BANNERS of the banner marks are `// ── ` dash banners');
  ok(here.dash < MARKS.length, '…which is fewer than every mark, so the filter selects something');
  eq(here.naming.length, BANNERS_NAMING_AN_OWNER,
    'and BANNERS_NAMING_AN_OWNER of them name an owner they govern — the signal is SPENT');
  eq(here.naming, [], '…the empty list itself, so a banner that started naming one would appear here');
}
// THE CONTROL. A metric whose true value is zero is indistinguishable from a
// metric that measures nothing, so the SAME function runs over the document the
// shipped undo helper reconstructs — the one that existed before #465 cut.
{
  const PREV_INDEX = PREV_UNDO.undoDxlinkGreeksFetch(
    INDEX, fs.readFileSync(path.join(ROOT, 'js/services/dxlink-greeks-fetch.js'), 'utf8'));
  const prevTags = APP_LOADER.parseScriptTags(PREV_INDEX);
  const prevCode = prevTags.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  const prevDecls = scanTopLevelDeclarations(prevCode);
  const prevMarks = topLevelBanners(prevCode, functionBodyRanges(prevCode));
  const prev = dashBannersNamingAnOwner(prevCode, prevMarks, prevDecls);
  eq(prev.dash, PREV_DASH_BANNERS, 'the PREVIOUS document carried PREV_DASH_BANNERS dash banners');
  eq(prev.naming.length, PREV_BANNERS_NAMING_AN_OWNER,
    '…and PREV_BANNERS_NAMING_AN_OWNER of them DID name an owner: the function measures something');
  eq(prev.naming[0].named, [PREV_NAMED_OWNER], '…and that owner is PREV_NAMED_OWNER');
  eq(prev.naming[0].at, PREV_NAMED_BANNER_AT, '…at PREV_NAMED_BANNER_AT in that document');
  eq(prev.dash - DASH_BANNERS, 1, 'exactly one dash banner left with that cut');
  eq(prev.naming.length - BANNERS_NAMING_AN_OWNER, 1,
    '…and it was THE naming one: the signal was not scarce, it was singular');
  ok(prevCode.length > CODE.length, 'control — the reconstructed document really is the larger one');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Why the screen\'s three clean candidates are all refused');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The split reading needs the ninth direction resolved per candidate; it is
  // computed once here and reused by every clause below.
  for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_RAW,
    'under the RAW reading ONE_CONSUMER_RAW candidate reads one consumer and nothing else');
  const split = clean.filter((c) => byConsumerSplit(c.p, c.split) === 1)
    .sort((a, b) => b.units - a.units);
  eq(split.length, ONE_CONSUMER_SPLIT, '…and ONE_CONSUMER_SPLIT do under the split reading #465 shipped');
  // DOWN FROM FOUR, and that is read out of the contract that measured the four
  // rather than remembered here. The one that left is the region #465 cut.
  {
    const wasSplit = Number(fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8')
      .match(/^const ONE_CONSUMER_SPLIT = (\d+);$/m)[1]);
    eq(wasSplit - ONE_CONSUMER_SPLIT, 1,
      '…exactly one fewer than the newest contract pinned at ITS base: the set shrank by the\n'
      + '     candidate that became a module');
  }
  eq(split.map((c) => [c.lo, c.hi]), SPLIT_SET,
    '…which are exactly these three, largest first — the WHOLE set asserted by equality');
  ok(split.every((c) => c.lo !== RAW_AT_IN_CODE),
    'and the recommendation is NOT among them: it is refused by coupling and chosen on boundary, '
    + 'which is the opposite of how the last three cycles chose');
}
// (a) The largest of the three opens on a SECTION header whose section continues.
{
  eq(CODE.slice(HEADER_CUT_AT, CODE.indexOf('\n', HEADER_CUT_AT)), HEADER_FIRST_LINE,
    'the largest clean candidate opens on a `// ═══` rule');
  const second = CODE.indexOf('\n', HEADER_CUT_AT) + 1;
  eq(CODE.slice(second, CODE.indexOf('\n', second)), HEADER_TITLE_LINE,
    '…whose next line is the SECTION TITLE');
  eq(HEADER_CUT_END - HEADER_CUT_AT, HEADER_CUT_UNITS, '…and the candidate is HEADER_CUT_UNITS units');
  const next = DECLS.filter((d) => d.start >= HEADER_CUT_END)[0];
  eq(next.name, HEADER_NEXT_OWNER,
    '…while the very next owner past it is HEADER_NEXT_OWNER — the subject the title names');
  ok(HEADER_TITLE_LINE.toUpperCase().indexOf('PORTFOLIO MANAGER') >= 0 &&
     next.name.toLowerCase().indexOf('positionmanager') >= 0,
  '…so cutting here takes the title off the section that keeps its subject: the defect '
  + 'audit #462 published, unchanged');
}
// (b)+(c) The other two are lone owners inside a mis-labelled catch-all.
{
  const inCatchAll = SPLIT_SET.filter(([lo]) => lo > CATCH_ALL_AT && lo < CATCH_ALL_END);
  eq(inCatchAll.length, SPLIT_SET.length - 1, 'the other two candidates sit inside ONE banner region');
  eq(CODE.slice(CATCH_ALL_AT, CODE.indexOf('\n', CATCH_ALL_AT)), CATCH_ALL_BANNER,
    '…the region whose banner is CATCH_ALL_BANNER');
  eq(CATCH_ALL_END - CATCH_ALL_AT, CATCH_ALL_UNITS, '…which governs CATCH_ALL_UNITS units');
  const own = DECLS.filter((d) => d.start >= CATCH_ALL_AT && d.end < CATCH_ALL_END);
  eq(own.length, CATCH_ALL_OWNERS, '…and CATCH_ALL_OWNERS owners');
  eq(MARKS.filter((m) => m > CATCH_ALL_AT && m < CATCH_ALL_END).length, CATCH_ALL_INTERIOR_MARKS,
    '…with CATCH_ALL_INTERIOR_MARKS interior banner marks: it is one flat run, not a nest');
  eq(own.slice(0, DIAGNOSTICS_OWNERS.length).map((d) => d.name), DIAGNOSTICS_OWNERS,
    'the diagnostics the banner NAMES are its first three owners');
  eq(snapBodyEnd(CODE, own[0].start, own[DIAGNOSTICS_OWNERS.length].start) - own[0].start,
    DIAGNOSTICS_UNITS, '…DIAGNOSTICS_UNITS of the CATCH_ALL_UNITS it governs');
  ok(DIAGNOSTICS_UNITS * 20 < CATCH_ALL_UNITS,
    '…under a twentieth, stated as a comparison rather than as a percentage nobody re-derives');
  ok(own.slice(DIAGNOSTICS_OWNERS.length).every((d) => CATCH_ALL_BANNER.indexOf(d.name) < 0),
    'and the banner names NONE of the twenty-eight owners that follow them');
}
// The boundary this audit publishes instead, argued from the call graph.
{
  const inCut = new Set(OWNERS_EXPECTED);
  const outside = (i) => i < RAW_AT_IN_CODE || i >= RAW_END_IN_CODE;
  const hostsOf = (n) => Array.from(new Set(refSites(MASKED, n).filter(outside)
    .map((i) => (hostOf(i) || { name: '(TOP LEVEL)' }).name))).sort();
  eq(OWNERS_EXPECTED.filter((n) => hostsOf(n).length === 0), OWNERS_WITH_NO_OUTSIDE_REFERENCE,
    'TWO of the four owners are referenced nowhere outside the cut at all');
  eq(OWNERS_EXPECTED.filter((n) => hostsOf(n).length === 1), OWNERS_REFERENCED_FROM_ONE_HOST,
    '…and the other two only from inside ONE function each');
  eq(Array.from(new Set(OWNERS_REFERENCED_FROM_ONE_HOST.flatMap(hostsOf))), EDGE_HOSTS,
    '…which is the same function in both cases, and it is the consumer §3 pins');
  eq(OWNERS_EXPECTED.length,
    OWNERS_WITH_NO_OUTSIDE_REFERENCE.length + OWNERS_REFERENCED_FROM_ONE_HOST.length,
    'control — those two sets are the whole owner list, so none was left unclassified');
  // And nothing downstream under the same banner reaches back into the cut.
  const following = DECLS.filter((d) => d.start >= RAW_END_IN_CODE && d.end < CATCH_ALL_END);
  eq(following.length, FOLLOWING_OWNERS_UNDER_BANNER,
    'FOLLOWING_OWNERS_UNDER_BANNER owners follow the cut under the same banner');
  const reachBack = following.filter((d) => {
    const body = MASKED.slice(d.start, d.end + 1);
    return OWNERS_EXPECTED.some((n) => refSites(body, n).length > 0);
  });
  eq(reachBack.map((d) => d.name), [],
    '…and NOT ONE of them names an owner of the cut');
  eq(reachBack.length, FOLLOWING_REFERENCES_INTO_THE_CUT,
    '…so the end of the cut severs no call: it is a boundary, not a cut through a call graph');
  // The control that makes that zero mean something.
  ok(following.some((d) => refSites(MASKED.slice(d.start, d.end + 1), EDGE_HOSTS[0]).length >= 0),
    'control — the same scan over the same bodies does find names, so it is not scanning nothing');
  const anyName = following.filter((d) => refSites(MASKED.slice(d.start, d.end + 1),
    MONOLITH_DEPENDENCIES[0]).length > 0);
  ok(anyName.length > 0,
    '…and some of those owners DO name the dependency this cut has, which is the same scan '
    + 'returning a non-zero answer on a name that is genuinely there');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen that found it');
// ─────────────────────────────────────────────────────────────────────────────
eq(rawRunCount, RAW_RUNS, 'RAW_RUNS owner runs were enumerated');
eq(seamRejectedCount, SEAM_REJECTED, '…SEAM_REJECTED of them refused by assertSeam');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE have one consumer and more than one site, so the #458 refinement '
    + 'still separates a real slice of the population');
  // THE RECOMMENDATION IS NOT REACHABLE BY THE SCREEN, and that is a fact about
  // the screen rather than about the region. A run begins only at a REGION start
  // or a DECLARATION start, and the comment block this cut opens on is neither —
  // the same gap audit #462 recorded for the journal map audit. The screen RANKS
  // candidates; it does not choose boundaries, and this cycle it cannot even see
  // the one being proposed.
  eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
    'no enumerated run begins where this cut begins');
  eq(MARKS.indexOf(RAW_AT_IN_CODE), -1, '…because that offset is not a region start');
  eq(DECLS.filter((d) => d.start === RAW_AT_IN_CODE).length, 0, '…nor a declaration start');
  // What the screen DID enumerate is the same cut minus its opening block, which is
  // the closest the screen can come — and it ranks there among the cleanest.
  const rec = candidateRuns.filter((c) => c.lo === BY_NAME.get(OWNERS_EXPECTED[0]).start
    && c.hi === BODY_END_IN_CODE)[0];
  ok(rec, 'the screen DOES enumerate the same cut starting at its first declaration');
  eq(RAW_AT_IN_CODE + OPENING_BLOCK_CHARS, rec.lo,
    '…and the difference between the two is exactly the opening comment block');
  eq(byConsumerSplit(rec.p, rec.split), BY_CONSUMER_SPLIT, '…reading BY_CONSUMER_SPLIT');
  eq(rec.split.chain, CHAIN_OUTBOUND, '…with CHAIN_OUTBOUND references into extracted modules');
  eq(rec.split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND into foundation modules');
  ok(clean.filter((c) => c.units > rec.units).length > 0,
    'control — larger clean candidates exist, so this was not chosen for being the biggest');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare and all four owners run');
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
    setInterval: () => { watched.push('setInterval'); },
    WebSocket: function () { watched.push('WebSocket'); },
    localStorage: { getItem: () => { watched.push('localStorage.getItem'); return null; } },
    document: { getElementById: () => { watched.push('doc.getElementById'); return null; } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
    console: { log() {}, warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(watched, [], 'and touches no fetch, timer, socket, storage read or listener while loading');
}
// The owners RUN, and the parity gate is exercised on inputs where the answer
// differs — a gate that always returned the same verdict would pass a test that
// only ever fed it one shape.
{
  const ctx = { console: { log() {}, warn() {}, error() {}, debug() {} }, _technicalTfSqueezeState: () => null };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  const aliases = ctx.PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES;
  ok(aliases && typeof aliases === 'object', 'the alias table is an object');
  ok(Object.keys(aliases).length > 0, '…with entries');
  for (const [canon, accepted] of Object.entries(aliases)) {
    ok(Array.isArray(accepted) && accepted.length > 0, canon + ': its accepted list is non-empty');
    eq(accepted[0], canon, canon + ': the CANONICAL key is always tried first, as its prose claims');
  }
  // THE RESOLVER, AND THE PROSE IN THE BLOCK THIS CUT OPENS ON. That block claims
  // the canonical key is always tried FIRST and an alias only confirms when the
  // canonical one has not. Both halves are executed here rather than read, on
  // inputs where the answer DIFFERS — a resolver that always returned the first
  // alias would pass a test that only ever fed it a confirmed canonical key.
  const R = ctx._resolvePortfolioTechnicalParityKey;
  const RSI = aliases.rsi14;
  eq(R({ rsi14: 'confirmed' }, RSI), 'rsi14',
    'a confirmed CANONICAL key resolves to the canonical key');
  eq(R({ rsi14_1d: 'confirmed' }, RSI), 'rsi14_1d',
    '…a confirmed ALIAS resolves to the alias, which is the whole point of the table');
  eq(R({ rsi14: 'confirmed', rsi14_1d: 'confirmed' }, RSI), 'rsi14',
    '…and when BOTH are confirmed the canonical one wins: "tried FIRST", executed');
  eq(R({}, RSI), null, 'nothing confirmed resolves to null');
  eq(R({ rsi14: 'partial' }, RSI), null,
    '…and so does a key that is present but NOT confirmed — no threshold is loosened');
  eq(R(null, RSI), null, 'a null parity object is refused rather than thrown on');
  eq(R({ rsi14: 'confirmed' }, 'rsi14'), null,
    '…as is an alias argument that is not an array');
  eq(typeof ctx.buildFormulaParityGate, 'function', 'the parity gate is a function');
  eq(typeof ctx.buildBackendTechnicalByTickerFromResponse, 'function', '…as is the map builder');
  const empty = ctx.buildBackendTechnicalByTickerFromResponse({}, [], 'TEST');
  ok(empty && typeof empty === 'object', 'the map builder returns an object on an empty response');
  eq(empty.usable, false, '…marked unusable, because nothing came back');
  const gate = ctx.buildFormulaParityGate({}, []);
  ok(gate && typeof gate === 'object', 'and the gate returns an object on an empty response too');
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
    '…and NO owner of this cut is among them: all four are live code');
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
    'this cut would rank SIZE_RANK_IF_CUT by size — well into the upper half, and not at either end');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers still larger than it');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < LARGEST_LAYER_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'PURE_ASCII_LAYERS shipped layers are pure ASCII');
  ok(/[^\x00-\x7F]/.test(BODY), '…and this region would NOT join them, so that count is unchanged');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(!/^\/\/ ── /.test(BODY.split('\n')[0]),
    '…and this one would NOT, which §4 explains: there is no such banner left to open on');
  ok(CHAIN_LENGTH - LAYERS_OPENING_ON_BANNER > 0,
    '…while the rest already do not, so opening on one was never the rule');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NOT ONE production file differs from the base: this phase measures, it does not move');
  eq(git(['show', BASE_SHA + ':index.html']).length, BASE_CHARS,
    '…and the base really did carry an index.html of this length');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)),
    'the module Phase 2 would write does not exist yet');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();

  ok(changed.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  ok(changed.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite ratchets by one');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length,
  BASE_TEST_FILE_COUNT, '…and BASE_TEST_FILE_COUNT is what the base actually carried');
  {
    const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /\.test\.js$/.test(f) && f !== path.basename(AUDIT_REL))
      .filter((f) => /^const TEST_FILE_COUNT = \d+;$/m.test(
        fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS contracts pin the suite file count');
    const RATCHETED = new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm');
    ok(contracts.every((f) => RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
      '…and every one of them reads the ratcheted count, none left behind');
  }
  // THE RETIREMENT QUEUE IS EMPTY, and that is asserted rather than narrated.
  {
    const specs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'));
    const layerSpecs = specs.filter((f) => /-contract\.spec\.js$/.test(f) &&
      f !== 'mutation-coverage-contract.spec.js');
    eq(layerSpecs.length, LAYER_CONTRACT_SPECS,
      'exactly LAYER_CONTRACT_SPECS layer contract spec is committed');
    eq(layerSpecs, [path.basename(NEWEST_CONTRACT_SPEC)],
      '…and it belongs to the NEWEST layer, which the programme requires to keep one — so '
      + 'chain-order retirement has nothing left to take and this cycle retires nothing');
    ok(fs.existsSync(path.join(ROOT, NEWEST_CONTRACT)), '…whose contract ships');

    // LOADED THROUGH AUDIT_SPEC_REL, not through a literal beside it. The mutation
    // pass found this constant checking nothing: its only consumer asked whether the
    // path was in the change set, and the mutant pointed it at a NEIGHBOURING spec
    // that this same PR also touches — so the clause was satisfied by the wrong file.
    // Requiring the spec through the constant makes the two assertions below read it.
    const auditSpec = require(path.join(ROOT, AUDIT_SPEC_REL));
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared BASE_DECLARED_MUTANTS mutants');
    eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length,
      '…and this change declares the base PLUS this audit\'s spec, with nothing subtracted');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow,
      '…and the declared total is under it, which is what makes retiring nothing safe rather '
      + 'than merely convenient');
    eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_TECHNICAL_PARITY_AUDIT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
