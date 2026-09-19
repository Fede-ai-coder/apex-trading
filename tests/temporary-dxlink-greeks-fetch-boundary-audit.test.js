'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// DXLINK GREEKS FETCH — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [1025308,1030258) in monolith coordinates — 4,950 raw units,
// ONE top-level owner, `fetchDXLinkGreeks` (4,703). It opens a DXLink
// WebSocket, subscribes Greeks and Quote for a list of streamer symbols, fills
// a result map as events arrive, and resolves on completion or a 5s hard
// timeout. ONE consumer, ZERO monolith dependencies, zero in every direction
// but one. It loads in an empty VM and runs nothing while it loads.
//
// ── THIS AUDIT'S FINDING: THE NINTH DIRECTION COUNTS TWO THINGS AS ONE ──────
//
// `outboundModule` was added to the screen to catch a region that reaches into
// code which has ALREADY been extracted — a real hazard, because such a region
// depends on a module rather than on the monolith it is being cut from.
//
// It does not distinguish WHICH module. This region's single outbound edge is
// one call to `ttCall`, owned by `js/api/backend-client.js` — a foundation
// module that predates the extraction programme and that ELEVEN of the chain's
// thirty-six shipped layers already call. Counting that edge is not measuring a
// hazard; it is charging a module for using the HTTP client.
//
// SPLIT THE DIRECTION AND THE RANKING CHANGES. Counting only the CHAIN half —
// references to modules this programme extracted — the one-consumer set grows
// from ONE candidate to FOUR, and this region is the LARGEST of them at 4,949
// units of body — the raw fragment quoted above is 4,950, one more, because it
// carries the structural separator the module itself does not. Under the raw reading it is invisible: it scores 2 and the screen's
// top pick is a 2,710-unit validator. §5 executes both readings, and §6 lists
// the four.
//
// THE SPLIT IS NOT COSMETIC, AND IT IS NOT UNIVERSAL EITHER. 2,085 of the 3,245
// candidates touch a foundation module and 876 touch a chain module, so neither
// half is rare. But the direction DECIDES a candidate's rank in only a handful
// of cases — §5 counts them — so this is a narrow refinement that happens to
// decide this one. That is the same shape as the #458 refinement, which split
// distinct consumers out of a raw site count.
//
// WHAT THE RAW SCREEN PREFERRED, AND WHY THIS AUDIT DOES NOT. The raw pick is
// `_validateBackendFullRefreshPayload` — 2,710 units, genuinely clean: one
// site, one consumer, nothing else. It is not a bad region. It is one owner of
// THIRTY-ONE inside an 81,860-unit banner region whose banner names
// `[PortfolioRefreshPayload]` and not the validator, so where that feature ends
// is a judgement nobody has published. The recommendation needs no such
// judgement: its banner names its single owner and nothing else, which is the
// strongest structural signal this document offers. §4 executes both halves of
// that comparison.
//
// ── THE INCIDENTAL DEFECT, PINNED AND NOT FIXED ─────────────────────────────
//
// Two lines above the canary subscription the source says the canary is "not in
// streamerSymbols so it never blocks checkComplete or appears in the returned
// map". The first half is true and §7 proves it. The SECOND HALF IS FALSE:
// `result[CANARY]` is assigned before the Promise is built and never deleted,
// so `CSCO` is a key of the object the caller receives, carrying
// `{_canary:true, bid:null, ask:null}`. §7 drives the whole DXLink protocol
// against a fake socket and reads the key out of the resolved value, so this is
// executed rather than read off the source.
//
// A relocation moves bytes; it does not repair them. Phase 2 must carry the
// wrong comment across verbatim, and the permanent contract inherits this pin.
//
// ── WHAT THE SCREEN FOUND ───────────────────────────────────────────────────
//
// 7,610 owner runs, 2,048 refused by `assertSeam`, 3,245 distinct candidates,
// 1,994 of which run nothing at load. ONE has a coupling that is exactly one
// consumer under the raw reading, down from three at the previous base; FOUR do
// under the split reading. 131 have one consumer and more than one site, so the
// #458 refinement still separates about a fifteenth of the set.
//
// ── ONE CONSUMER, AND IT IS A HUB ───────────────────────────────────────────
//
// The single inbound edge is hosted by `refreshPositionsLive`, which is 138,483
// units — the largest top-level declaration in the monolith, and the consumer
// of HALF the split one-consumer set: two of the four, the other two answering
// to `positionManager` and `fetchPortfolioTechnicalRefresh`. The first draft of
// this audit said "three of the four", inferred from the three candidates
// nearest to hand; §5(d) counts it instead. §3 pins the hub's size, because "one
// consumer" reads differently when that consumer is a tenth of the monolith.
//
// ── THE RETIREMENT: THERE ISN'T ONE, FOR THE SECOND CYCLE RUNNING ───────────
//
// The only layer contract spec committed is the NEWEST layer's, which the
// programme requires it to keep, so chain-order retirement again has nothing to
// take. §10 asserts the arithmetic that makes that safe rather than asserting
// the absence — base, plus this audit's spec, plus one repair described below,
// under a ceiling that has not moved.
//
// ── AND ONE REPAIR THIS PR CARRIES BESIDES THE AUDIT ───────────────────────
//
// The newest contract pinned the LIVE declared-mutant total. That is a fact
// about the suite TODAY, not about the commit that shipped that layer, so this
// very audit broke it on a file it does not touch. The pin is replaced with
// that layer's own spec size, which stays true however many audits follow, and
// §10 measures the resulting growth against the base commit rather than
// asserting it as a 1.
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

const MODULE_REL_IF_CUT = 'js/services/dxlink-greeks-fetch.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'ce1a25f';
const BASE_CHARS = 1496195;
const BASE_UTF8 = 1524963;
const BASE_LF = 25891;
const BASE_SHA256 = 'cad874aeadb31e613487488a54ab9bcd92043bf8478084f55c148638dc1df900';
const LOCAL_SCRIPTS = 80;
const BASE_TEST_FILE_COUNT = 164;
const TEST_FILE_COUNT = 165;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-dxlink-greeks-fetch-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/dxlink-greeks-fetch-audit.spec.js';
const RATCHETED_CONTRACTS = 26;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const NEWEST_CONTRACT = 'tests/journal-map-audit-boundary-contract.test.js';
const NEWEST_CONTRACT_SPEC = 'tests/mutation-specs/journal-map-audit-contract.spec.js';
const BASE_DECLARED_MUTANTS = 98;
const MUTANT_BUDGET = 250;
const LAYER_CONTRACT_SPECS = 1;
// This PR also repairs a pin in the newest contract — see §10. Measured against
// the base commit rather than asserted, because a hand-written 1 is exactly the
// kind of number that drifts.
const NEWEST_SPEC_GROWTH = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114672;
const CODE_CHARS = 1381497;
const TOP_LEVEL_DECLS = 940;
const TOP_LEVEL_BANNERS = 222;
const OWNER_REGIONS = 121;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 1025308;
const RAW_END_IN_CODE = 1030258;
const BODY_END_IN_CODE = 1030257;
const RAW_CHARS = 4950;
const BODY_CHARS = 4949;
const BODY_UTF8 = 4967;
const BODY_LF = 89;
const BODY_SHA256 = '36dd908bed13d42361d6fcae84d0ea8a6f447295765609fe7409e43a669c1913';
const BODY_ENDING = '}\n';
const FEATURE_BANNER = '// ── fetchDXLinkGreeks — one-shot WebSocket fetch for a list of streamer symbols ──';
const OWNERS_EXPECTED = ['fetchDXLinkGreeks'];
const OWNER_COUNT = 1;
const FUNCTION_OWNERS = 1;
const OWNER_SIZES = [4703];
const TOTAL_LINES = 90;
const CODE_LINES = 83;
const COMMENT_LINES = 7;
const OPENING_COMMENT_LINES = 6;
const BANNER_BLOCK_CHARS = 245;
const NET_REDUCTION = 4889;
const RESIDUAL_MONOLITH = 1376547;
const INDEX_AFTER = 1491306;
const TAG_GAP = 1025316;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [1131945];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0,
};
const OUTBOUND_MODULE = 1;
const FULL_NINE = 2;
const BY_CONSUMER = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 1;

// ── THE FINDING: the ninth direction, split ──────────────────────────────────
const FOUNDATION_DEPENDENCIES = ['ttCall'];
const FOUNDATION_OWNER = 'js/api/backend-client.js';
const FOUNDATION_SITES = 1;
const CHAIN_OUTBOUND = 0;
const BY_CONSUMER_SPLIT = 1;
const CHAIN_LENGTH = 36;
const LAYERS_CALLING_TTCALL = 11;
const LAYERS_CALLING_FOUNDATION = 19;
const CANDIDATES_TOUCHING_FOUNDATION = 2085;
const CANDIDATES_TOUCHING_CHAIN = 876;
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 4;
// The whole split one-consumer set, largest first — an equality, not a sample.
const SPLIT_SET = [
  [1025308, 1030257],
  [719173, 722692],
  [929378, 932088],
  [975281, 977133],
];
// How many clean candidates the foundation half of the direction DECIDES — the
// ones whose rank changes because of it and for no other reason.
const DECIDED_BY_FOUNDATION = 3;
// How many of the split set the one hub consumer hosts. Counted, not called "most".
const SPLIT_SET_HOSTED_BY_CONSUMER = 2;

// ── The raw screen's own pick, for the contrast ──────────────────────────────
const RAW_PICK_AT = 929378;
const RAW_PICK_END = 932088;
const RAW_PICK_UNITS = 2710;
const RAW_PICK_OWNERS = ['_validateBackendFullRefreshPayload'];
const RAW_PICK_BY_CONSUMER = 1;
const RAW_PICK_REGION_AT = 917467;
const RAW_PICK_REGION_END = 999327;
const RAW_PICK_REGION_UNITS = 81860;
const RAW_PICK_REGION_OWNERS = 31;
const RAW_PICK_REGION_BANNER = '// ── [PortfolioRefreshPayload] — gated verbose payload diagnostics ─────────────';

// ── The incidental defect ────────────────────────────────────────────────────
const CANARY_SYMBOL = 'CSCO';
const CANARY_CLAIM = 'appears in the returned map';
const CANARY_IN_RESULT = true;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7610;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3245;
const CLEAN_CANDIDATES = 1994;
const ONE_CONSUMER_MULTI_SITE = 131;

// ── Where this layer would sit ───────────────────────────────────────────────
const SIZE_RANK_IF_CUT = 11;
const SMALLEST_LAYER_CHARS = 1761;
const LARGEST_LAYER_CHARS = 71811;
const PURE_ASCII_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 20;

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

console.log('DXLINK GREEKS FETCH — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. A permanent contract keeps a LIVE_*
// layer to tell the shipped document from the reconstructed one; here there is
// no such distinction to draw, and an alias for it would read as a pin that
// checks nothing.
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

// Which KIND of module owns a name: one this programme extracted, or one that
// predates it. THE WHOLE FINDING rests on this split, so it is derived from the
// newest contract's CHAIN rather than from a list written here.
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
eq(BODY.slice(0, BODY.indexOf('\n')), FEATURE_BANNER,
  'IT OPENS ON A BANNER THAT NAMES ITS ONLY OWNER, not on the declaration itself');
ok(FEATURE_BANNER.indexOf(OWNERS_EXPECTED[0]) >= 0,
  '…which is what "names it" means here, checked against the banner text rather than asserted');
eq(count(CODE, FEATURE_BANNER), 1,
  '…and that banner line occurs EXACTLY once in the monolith, so the seam is not one of '
  + 'several places it could have matched');
ok(/[^\x00-\x7F]/.test(BODY),
  'it is NOT pure ASCII — the banner rule and an arrow inside a log line settle that');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  ok(next.start > RAW_END_IN_CODE,
    'the next top-level owner begins AFTER the raw span, with no banner between — the '
    + '`tt-reconnect` shape, where "extend to the next header" would swallow the next feature');
  ok(bannerOf(next.start) === bannerOf(RAW_AT_IN_CODE),
    '…and it sits under THIS region\'s banner, which is why the banner alone cannot end the '
    + 'region and the boundary is a judgement this audit publishes');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly this one name');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and it is a function');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at this size');
  eq(OWNERS[0].start - RAW_AT_IN_CODE, BANNER_BLOCK_CHARS,
    '…preceded by BANNER_BLOCK_CHARS units of banner block, which is the only thing the body '
    + 'holds besides the owner');
  eq(CODE.slice(OWNERS[0].end + 1, BODY_END_IN_CODE), '\n',
    '…and exactly one newline trails it — the line terminator scanTopLevelDeclarations '
    + 'excludes from d.chars, which is why the sum below carries a +1 rather than balancing');
  eq(BANNER_BLOCK_CHARS + OWNER_SIZES[0] + 1, BODY_CHARS,
    'control — banner block, owner and that one newline account for every unit of the body');
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
eq(REC.inbound, EXTERNAL_EDGES, 'ONE reference reaches in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at this exact site');
ok(REC.sites.every(insideFunction), '…inside a function body, so it does not run at load');
eq(consumersOf(REC), EDGE_HOSTS, '…hosted by ONE function');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it depends on NO monolith declaration at all: the list is empty, not short');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS,
'SEVEN of the nine directions measure zero: no write in, none through, none out, no markup '
  + 'either way, no sibling-module reference reaching in, and nothing that already left');
eq(REC.outModule, OUTBOUND_MODULE,
  'the NINTH direction is the only non-zero one besides the single inbound edge');
eq(REC.nine, FULL_NINE, 'nine directions, total score 2');
eq(byConsumer(REC), BY_CONSUMER, '…and the consumer reading agrees at BY_CONSUMER');
// THE CONSUMER IS A HUB, and "one consumer" reads differently when it is.
{
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  ok(host, EDGE_HOSTS[0] + ' is a top-level declaration…');
  eq(host.chars, CONSUMER_CHARS, '…of CONSUMER_CHARS units');
  eq(DECLS.slice().sort((a, b) => b.chars - a.chars)[0].name, EDGE_HOSTS[0],
    '…which makes it the LARGEST top-level declaration in the monolith, measured over all of '
    + 'them rather than asserted from the ones nearby');
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…and it is declared outside the region, so the edge really does cross the boundary');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Its banner names it; the raw pick\'s banner does not name the raw pick');
// ─────────────────────────────────────────────────────────────────────────────
{
  // THIS region: the banner names the one owner it contains.
  eq(bannerOf(RAW_AT_IN_CODE), RAW_AT_IN_CODE,
    'the region STARTS on a banner mark — the screen knows this offset as a banner');
  const owner = BY_NAME.get(OWNERS_EXPECTED[0]);
  ok(FEATURE_BANNER.indexOf(owner.name) >= 0, '…and that banner names its owner');
  // THE RAW PICK: its banner names a feature, and the pick is one owner of many.
  const REGA = REGIONS.find((r) => RAW_PICK_AT >= r.start && RAW_PICK_AT < r.end);
  eq(REGA.start, RAW_PICK_REGION_AT, 'the raw pick sits in the banner region at RAW_PICK_REGION_AT');
  eq(REGA.end, RAW_PICK_REGION_END, '…ending at RAW_PICK_REGION_END');
  eq(REGA.end - REGA.start, RAW_PICK_REGION_UNITS, '…RAW_PICK_REGION_UNITS units wide');
  eq(CODE.slice(REGA.start, CODE.indexOf('\n', REGA.start)), RAW_PICK_REGION_BANNER,
    '…under this banner');
  eq(DECLS.filter((d) => d.start >= REGA.start && d.end < REGA.end).length, RAW_PICK_REGION_OWNERS,
    '…which governs RAW_PICK_REGION_OWNERS owners in total');
  eq(RAW_PICK_REGION_BANNER.indexOf(RAW_PICK_OWNERS[0]), -1,
    '…and does NOT name the raw pick, so where that feature ends is a judgement nobody has '
    + 'published — which is the whole of this audit\'s objection to it');
  ok(RAW_PICK_REGION_UNITS > BODY_CHARS * 10,
    'control — the difference is not marginal: the raw pick\'s region is an order of '
    + 'magnitude wider than the region recommended here');
  // AND THE RAW PICK IS NOT ACCUSED OF BEING COUPLED. It is clean; that is the point.
  const pa = profileOf([RAW_PICK_AT, RAW_PICK_END]);
  eq(byConsumer(pa), RAW_PICK_BY_CONSUMER,
    'the raw pick scores RAW_PICK_BY_CONSUMER, which is as clean as this screen can read — '
    + 'the objection is to its boundary, not to its coupling');
  eq(DECLS.filter((d) => d.start >= RAW_PICK_AT && d.end < RAW_PICK_END).map((d) => d.name),
    RAW_PICK_OWNERS, '…and it owns exactly the name this audit names');
  eq(RAW_PICK_END - RAW_PICK_AT, RAW_PICK_UNITS, '…across RAW_PICK_UNITS units');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE FINDING: the ninth direction counts two different things as one');
// ─────────────────────────────────────────────────────────────────────────────
// (a) What this region's single outbound edge actually is.
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.foundationNames, FOUNDATION_DEPENDENCIES,
    'the region\'s outbound-module edge is exactly this one name');
  eq(split.foundation, FOUNDATION_SITES, '…at FOUNDATION_SITES site');
  eq(split.chain, CHAIN_OUTBOUND,
    '…and it reaches into NO module this programme extracted: CHAIN_OUTBOUND is zero');
  eq(split.foundation + split.chain, REC.outModule,
    'control — the two halves account for the whole of the ninth direction, so nothing is '
    + 'being quietly dropped by the split');
  eq(MODULE_OWNERS.get(FOUNDATION_DEPENDENCIES[0]), FOUNDATION_OWNER,
    '…and the name is owned by FOUNDATION_OWNER');
  ok(!CHAIN_SET.has(FOUNDATION_OWNER),
    '…which is NOT one of the chain\'s layers: it predates the extraction programme');
  ok(LOCALS.indexOf(FOUNDATION_OWNER) >= 0, '…while still being a local script the page loads');
}
// (b) Calling it is the ordinary case, counted over the shipped chain.
{
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');
  const callsTt = CHAIN.filter((rel) => refSites(
    maskLiterals(fs.readFileSync(path.join(ROOT, rel), 'utf8')), FOUNDATION_DEPENDENCIES[0]).length > 0);
  eq(callsTt.length, LAYERS_CALLING_TTCALL,
    'LAYERS_CALLING_TTCALL of the shipped layers already call that exact name, so charging '
    + 'this region for it would charge it for what the chain routinely does');
  const callsAny = CHAIN.filter((rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const masked = maskLiterals(src);
    const own = new Set(scanTopLevelDeclarations(src).map((d) => d.name));
    const bound = locallyBound(src);
    const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let m;
    while ((m = re.exec(masked))) {
      const n = m[2];
      if (own.has(n) || bound.has(n)) continue;
      if (OWNER_KIND.get(n) === 'foundation') return true;
    }
    return false;
  });
  eq(callsAny.length, LAYERS_CALLING_FOUNDATION,
    '…and LAYERS_CALLING_FOUNDATION call SOME foundation name, which is the majority of the '
    + 'chain and settles that this direction is not measuring a hazard here');
  ok(LAYERS_CALLING_FOUNDATION > CHAIN_LENGTH / 2, '…a majority, stated as a comparison rather than a word');
}
// (c) Neither half of the split is rare, so the refinement is not a special case.
{
  for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }
  eq(candidateRuns.filter((c) => c.split.foundation > 0).length, CANDIDATES_TOUCHING_FOUNDATION,
    'CANDIDATES_TOUCHING_FOUNDATION of the candidates touch a foundation module');
  eq(candidateRuns.filter((c) => c.split.chain > 0).length, CANDIDATES_TOUCHING_CHAIN,
    '…and CANDIDATES_TOUCHING_CHAIN touch a chain module, so BOTH halves are common and the '
    + 'split is not a rule invented for one region');
}
// (d) The ranking, both ways — and the four the split reading admits.
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_RAW,
    'under the RAW reading exactly ONE_CONSUMER_RAW candidate reads one consumer and nothing else');
  const split = clean.filter((c) => byConsumerSplit(c.p, c.split) === 1)
    .sort((a, b) => b.units - a.units);
  eq(split.length, ONE_CONSUMER_SPLIT, '…and under the SPLIT reading, ONE_CONSUMER_SPLIT do');
  eq(split.map((c) => [c.lo, c.hi]), SPLIT_SET,
    '…which are exactly these four, largest first — the WHOLE set asserted by equality, so '
    + 'dropping one fails rather than merely looping less');
  eq([split[0].lo, split[0].hi], [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    'and the LARGEST of the four is the region this audit recommends');
  eq(byConsumerSplit(REC, outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE)), BY_CONSUMER_SPLIT,
    '…reading BY_CONSUMER_SPLIT under the split and BY_CONSUMER under the raw');
  ok(BY_CONSUMER > BY_CONSUMER_SPLIT,
    '…so the raw reading costs it exactly the one point the ninth direction contributes');
  ok(split.some((c) => c.lo === RAW_PICK_AT && c.hi === RAW_PICK_END),
    'the raw pick is in the split set too: the split ADDS candidates, it does not displace one');
  // THE HUB, counted rather than described. The header calls this consumer the
  // host of MOST of the split set; how many is measured here, because "most"
  // quantifies over a set and this programme has written four such claims from
  // a partial look and been wrong every time.
  eq(split.filter((c) => consumersOf(c.p).indexOf(EDGE_HOSTS[0]) >= 0).length,
    SPLIT_SET_HOSTED_BY_CONSUMER,
    'SPLIT_SET_HOSTED_BY_CONSUMER of the four are consumed by the same hub this region '
    + 'feeds, which is why a one-consumer reading is cheap to come by in this part of the '
    + 'document and worth stating with the hub named');
  eq(SPLIT_SET_HOSTED_BY_CONSUMER * 2, ONE_CONSUMER_SPLIT,
    '…exactly HALF of them — the first draft of this audit said "three of the four" from\n'
    + '     reading the three candidates nearest to hand, and the count says two');
  ok(SPLIT_SET_HOSTED_BY_CONSUMER < ONE_CONSUMER_SPLIT,
    '…so the other two answer to different consumers, and the count measures something '
    + 'rather than restating the set size');
}
// (e) But the direction DECIDES only a handful, so this is a narrow refinement.
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  const decided = clean.filter((c) => byConsumer(c.p) > 1 && byConsumerSplit(c.p, c.split) === 1);
  eq(decided.length, DECIDED_BY_FOUNDATION,
    'the foundation half changes the verdict for DECIDED_BY_FOUNDATION clean candidates and '
    + 'no others — a narrow refinement that happens to decide this cycle, which is the same '
    + 'shape as the #458 split of consumers out of sites');
  ok(decided.some((c) => c.lo === RAW_AT_IN_CODE),
    '…this region among them, which is why the audit is written about it');
  ok(DECIDED_BY_FOUNDATION < CLEAN_CANDIDATES / 100,
    '…and under a hundredth of the clean set, stated as a comparison rather than as "few"');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen that found it');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(rawRunCount, RAW_RUNS, 'the regions yield RAW_RUNS contiguous owner runs');
  eq(seamRejectedCount, SEAM_REJECTED, '…of which SEAM_REJECTED are refused by assertSeam');
  eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct extractable candidates');
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, 'CLEAN_CANDIDATES of them run nothing at load');
  ok(candidateRuns.length - clean.length > 0,
    '…and the rest DO, so the evaluation-time rule still discriminates');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE have one consumer and more than one site, so the #458 refinement '
    + 'still separates part of the set');
  ok(clean.some((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE),
    'and THIS recommendation IS in the candidate set — unlike the last cycle\'s, which the '
    + 'screen could not reach at all');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, the owner runs, and the canary comment is wrong');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx), OWNERS_EXPECTED, 'it loads in a COMPLETELY empty VM, defining one global');
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
  eq(watched, [],
    'loading it opens no socket, performs no fetch, starts no timer and binds no listener — '
    + 'note it does ALL of those when CALLED, which is exactly the distinction');
  const ctl = [];
  const ctx2 = { setTimeout: () => { ctl.push('setTimeout'); } };
  vm.createContext(ctx2);
  vm.runInContext('setTimeout(function(){}, 0);', ctx2);
  eq(ctl, ['setTimeout'], 'control — the same watcher records a call when there is one to record');
}
// THE OWNER IS CALLED, three ways. A function that loads bare but throws on its
// own shape would satisfy every clause above.
function driveDxlink(symbols, over) {
  const sent = [];
  let socket = null;
  function FakeWebSocket(url) {
    this.url = url; this.readyState = 1; socket = this;
    this.send = (s) => { sent.push(JSON.parse(s)); };
    this.close = () => { this.readyState = 3; };
  }
  const ctx = Object.assign({
    ttCall: async () => ({ dxlinkUrl: 'wss://fake.invalid', token: 'TOKEN' }),
    WebSocket: FakeWebSocket,
    setTimeout, clearTimeout, Promise, JSON, Error,
    console: { log() {}, warn() {}, error() {}, debug() {} },
  }, over);
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  const promise = ctx.fetchDXLinkGreeks(symbols);
  return {
    promise, sent,
    socket: () => socket,
    reply: (msg) => socket.onmessage({ data: JSON.stringify(msg) }),
  };
}
{
  // (i) The empty list short-circuits before any socket or token call.
  let tokenCalls = 0;
  const d = driveDxlink([], { ttCall: async () => { tokenCalls++; return {}; } });
  const empty = await d.promise;
  // Object.assign copies the VM realm's object into this one. deepStrictEqual
  // compares PROTOTYPES, and a literal built inside a vm context carries that
  // context's Object.prototype — so a bare eq() here fails on two empty maps.
  eq(Object.assign({}, empty), {}, 'called with no symbols it returns an empty map…');
  eq(tokenCalls, 0, '…without asking for a quote token');
  eq(d.socket(), null, '…and without opening a socket');
}
{
  // (ii) A control on an input where the answer DIFFERS — the whole protocol,
  //      driven against a fake socket, resolving BEFORE the 5s deadline.
  const d = driveDxlink(['.SPY240614C500']);
  await new Promise((r) => setImmediate(r));
  ok(d.socket() !== null, 'called with a symbol it opens a socket…');
  eq(d.socket().url, 'wss://fake.invalid', '…at the url the quote token gave it');
  d.socket().onopen();
  eq(d.sent.map((m) => m.type), ['SETUP'], '…and sends SETUP first');
  d.reply({ type: 'SETUP', channel: 0 });
  d.reply({ type: 'AUTH_STATE', channel: 0, state: 'AUTHORIZED' });
  d.reply({ type: 'CHANNEL_OPENED', channel: 1 });
  eq(d.sent.map((m) => m.type), ['SETUP', 'AUTH', 'CHANNEL_REQUEST', 'FEED_SETUP', 'FEED_SUBSCRIPTION'],
    '…then walks the whole DXLink handshake in order');
  d.reply({ type: 'FEED_DATA', channel: 1, data: [{ eventSymbol: '.SPY240614C500',
    delta: 0.5, theta: -0.1, gamma: 0.02, vega: 0.3, volatility: 0.2, bidPrice: 1.2, askPrice: 1.3 }] });
  const got = await d.promise;
  eq(Object.assign({}, got['.SPY240614C500']),
    { delta: 0.5, theta: -0.1, gamma: 0.02, vega: 0.3, volatility: 0.2, bid: 1.2, ask: 1.3 },
    '…and resolves with the requested symbol filled from the feed, which is the answer '
    + 'DIFFERING from the empty-list case rather than an empty map twice');
  eq(d.socket().readyState, 3, '…having closed the socket on the way out');

  // THE INCIDENTAL DEFECT, read out of the resolved value.
  eq(Object.prototype.hasOwnProperty.call(got, CANARY_SYMBOL), CANARY_IN_RESULT,
    'THE CANARY IS IN THE RETURNED MAP, which the comment two lines above it denies');
  eq(Object.assign({}, got[CANARY_SYMBOL]), { _canary: true, bid: null, ask: null },
    '…carrying the shape the source gives it, untouched by the feed');
  eq(Object.keys(got).sort(), ['.SPY240614C500', CANARY_SYMBOL].sort(),
    '…so the caller receives one key MORE than it asked for');
  ok(BODY.indexOf(CANARY_CLAIM) >= 0,
    'and the source really does carry the claim this section refutes, quoted rather than '
    + 'paraphrased: a relocation moves bytes, so Phase 2 carries the wrong comment across');
  ok(BODY.indexOf('never blocks checkComplete') >= 0,
    '…whose FIRST half is true, which is why the defect is worth pinning precisely');
}
{
  // (iii) A bad token shape throws, by its exact message.
  const d = driveDxlink(['.X'], { ttCall: async () => ({}) });
  let message = null;
  try { await d.promise; } catch (e) { message = e.message; }
  eq(message, 'fetchDXLinkGreeks: /quote-token bad shape',
    'a /quote-token response with neither url nor token is refused by its exact message');
}
{
  // (iv) A socket error resolves rather than hanging.
  const d = driveDxlink(['.Y']);
  await new Promise((r) => setImmediate(r));
  d.socket().onerror();
  const got = await d.promise;
  eq(Object.assign({}, got['.Y']),
    { delta: null, theta: null, gamma: null, vega: null, volatility: null, bid: null, ask: null },
    'a socket error resolves with the unfilled map rather than rejecting or hanging');
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
    '…and the owner is not among them: this is live code with a live consumer');
}
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT of thirty-seven by size: mid-pack, neither end');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < LARGEST_LAYER_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'PURE_ASCII_LAYERS shipped layers are pure ASCII');
  ok(/[^\x00-\x7F]/.test(BODY), '…and this region would NOT join them, so that count is unchanged');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(/^\/\/ ── /.test(BODY.split('\n')[0]),
    '…and this region would open on one, which is why §2 pins its exact text');
  ok(CHAIN_LENGTH - LAYERS_OPENING_ON_BANNER > 0,
    '…while the rest do not, so opening on one is neither a rule nor a first');
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
  // THE RETIREMENT QUEUE IS EMPTY AGAIN, and that is asserted rather than narrated.
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

    const auditSpec = require('./mutation-specs/dxlink-greeks-fetch-audit.spec.js');
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared BASE_DECLARED_MUTANTS mutants');
    // THIS PR ALSO FIXES A PIN IN THE NEWEST CONTRACT, so the arithmetic is not
    // base-plus-audit alone. That contract pinned the LIVE declared total, which
    // is a fact about the suite today rather than about the commit that shipped
    // it — so this very audit broke it on a file it does not touch. The fix
    // replaces that pin with the layer's own spec size, which costs one mutant.
    // The growth is MEASURED against the base commit, not asserted as a 1.
    const baseNewestSpec = git(['show', BASE_SHA + ':' + NEWEST_CONTRACT_SPEC]);
    const countEntries = (src) => (src.match(/\n  \{ id: "/g) || []).length;
    const newestNow = require('./mutation-specs/journal-map-audit-contract.spec.js');
    eq(countEntries(baseNewestSpec) + NEWEST_SPEC_GROWTH, newestNow.mutants.length,
      'the newest layer\'s spec grew by NEWEST_SPEC_GROWTH against the base, which is the pin '
      + 'this PR repairs in that contract');
    eq(countEntries(baseNewestSpec), newestNow.mutants.length - NEWEST_SPEC_GROWTH,
      'control — the entry count really is read off the base commit rather than recomputed '
      + 'from the live file');
    eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length + NEWEST_SPEC_GROWTH,
      '…and this change declares the base PLUS this audit\'s spec PLUS that one repair, with '
      + 'nothing subtracted');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow,
      '…and the declared total is under it, which is what makes retiring nothing safe rather '
      + 'than merely convenient');
    eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('DXLINK_GREEKS_FETCH_AUDIT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
