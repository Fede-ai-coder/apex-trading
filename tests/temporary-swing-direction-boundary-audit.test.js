'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SWING DIRECTION RESOLVER — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [406512,413015) in monolith coordinates — 6,503 units, THREE
// functions: `_swingResolveDirection`, `_swingRsContext` and
// `_swingVixSuitability`. Five inbound edges, three monolith dependencies, and
// zero in every other direction. It loads in a completely empty VM.
//
// ── THIS AUDIT'S FINDING: THE REGION NAMES `S`, AND IS STILL TAKEABLE ────────
//
// `S` is the const that disqualified audit #424. That audit measured the swing
// block at four external edges over 242,294 units — the best coupling this
// programme has ever recorded — and could not take it, because the block
// assigns `S.swing = { … }` while it EVALUATES, and `S` is a `const` declared
// inside the inline monolith, which loads after every module. The finding was
// correct and it has been carried ever since.
//
// It has also been carried too broadly. The rule that actually holds is not
// "a region that names `S` cannot be extracted"; it is "a region that TOUCHES
// `S` AT EVALUATION TIME cannot be extracted". This region names `S` three
// times, writes no property through it at all, and every one of those three
// references sits inside a function body — so nothing about `S` runs while the
// file loads. §5 measures all three parts separately, because the distinction
// only means something if each half is checked on its own, and §6 then loads
// the region in a COMPLETELY empty VM: three globals defined, nothing else
// touched. A region naming `S` passes; the block #424 measured still would not.
//
// That is worth pinning rather than remembering. NINE of the thirty-one shipped
// layers already name something the monolith declares and were taken anyway,
// on exactly this reasoning — a RUNTIME dependency is not a LOAD-TIME one —
// and §5 counts them rather than asserting the claim from the layers nearest
// to hand, which is how this programme has got that kind of claim wrong before.
//
// ── THE CORRECTED SCREEN IS STILL PAYING ────────────────────────────────────
//
// This is the SECOND region taken out of the stretch audit #452 opened. The
// banner rule used to match `// ── ` — two dashes — and missed the three-dash
// style, which collapsed 243,851 units into one region the screen could only
// report whole and #424 had already proved untakeable. Corrected, that stretch
// still shows TWENTY-NINE owner-carrying regions at this base. §5 measures that
// rather than citing #452, whose audit file no longer exists to be cited.
//
// IT IS NOT THE BEST-SCORING REGION IN THAT STRETCH, and the first draft of this
// audit said it was. A 948-unit region there scores 1 — the screen had hidden it
// behind a size floor. What is true is the claim that actually decides the
// cycle, and §5 measures it at four floors: from 3,000 units up, 8 is the best
// score anywhere in the monolith, and this region is the one that scores it.
//
// ── WHY THIS END ────────────────────────────────────────────────────────────
//
// Four ends measured from the same start, and for once the mechanical check is
// not silent — the fourth is not a legal seam at all:
//
//     end       units    nine   owners  seam
//     413015    6,503       8        3  accepted   ← this one
//     413963    7,451       9        4  accepted
//     422877   16,365      23        6  accepted
//     425438   18,926      26        7  REJECTED — no structural separator
//
// The second end costs one more owner and one more point for 948 units, which
// is close enough that §7 states the case for it rather than dismissing it:
// what decides it is that the extra owner, `_swingScore`, opens its own banner
// and IS the 948-unit region §5 measures at score 1 — a clean little region in
// its own right, and one a later cycle can take on its own terms rather than
// have absorbed here as a rounding error.
//
// 6,503 UNITS FOR 49 LINES OF CODE, because 44 of its 93 lines are comment and
// the region opens with a 1,604-unit header. §7 states that as a ratio, as the
// cycle before it did: the monolith loses the units either way.
//
// THE MUTANT BUDGET. The base declares 212 mutants against a ceiling of 250.
// Retirement runs on in chain order — #446 took layer #24's spec, #448 #25's,
// #450 #26's and #27's, #452 #28's, and this one takes #29's: chart-
// interactions, 68 mutants. Its CONTRACT still runs on every push with every
// assertion intact, which §10 proves by counting them against the base.
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

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '0efbfb5';
const BASE_CHARS = 1520354;
const BASE_UTF8 = 1549271;
const BASE_LF = 26328;
const BASE_SHA256 = '6f6e34aed9b095ba9a36ef3203d748d9d6b7abb84b2e811c1f41cc164537cc43';
const LOCAL_SCRIPTS = 75;
const BASE_TEST_FILE_COUNT = 159;
const TEST_FILE_COUNT = 160;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-swing-direction-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/swing-direction-audit.spec.js';
const RATCHETED_CONTRACTS = 21;
const RETIREMENT = {
  contract: 'tests/chart-interactions-boundary-contract.test.js',
  spec: 'tests/mutation-specs/chart-interactions-contract.spec.js',
  mutants: 68,
};
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 212;
const MUTANT_BUDGET = 250;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114340;
const CODE_CHARS = 1405988;
const TOP_LEVEL_DECLS = 950;
const TOP_LEVEL_BANNERS = 224;
const OWNER_REGIONS = 122;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 406512;
const RAW_END = 413015;
const BODY_END = 413014;
const RAW_CHARS = 6503;
const BODY_CHARS = 6502;
const BODY_UTF8 = 6603;
const BODY_LF = 92;
const BODY_SHA256 = '104fd8d828f83266089add312d2a85853ac60d27bbac501ae1d46ac567086638';
const BODY_ENDING = '}\n';
const HEAD_BANNER = '// ─── Final multi-timeframe Swing direction (PURE, testable) ───────────────────';
const OWNERS_EXPECTED = ['_swingResolveDirection', '_swingRsContext', '_swingVixSuitability'];
const OWNER_COUNT = 3;
const FUNCTION_OWNERS = 3;
const OWNER_SIZES = [3661, 651, 501];
const CODE_LINES = 49;
const TOTAL_LINES = 93;
const COMMENT_LINES = 44;
const HEADER_UNITS = 1604;
const MODULE_REL_IF_CUT = 'js/services/swing-direction.js';

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 5;
const EDGE_SITES = [417497, 528964, 571560, 574912, 621943];
const EDGE_HOSTS = ['_swingBuildCandidate', '_swingEnrichOneOperationalRow', '_swingLazyEnrich4h',
  '_swingRenderRegime', '_swingRunActiveTab'];
const MONOLITH_DEPENDENCIES = ['S', 'SWING_VIX_MAX_SUITABLE', '_swingNormDir'];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 8;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 3;

// ── `S`, and the rule #424 left too broad ────────────────────────────────────
const S_NAME = 'S';
const S_REFS_IN_BODY = 3;
const S_PROPERTY_WRITES = 0;
const S_FORM = 'const';
const EXPIRY_CONTRACT = 'tests/portfolio-expiry-manual-boundary-contract.test.js';
const RECORDED_UNITS = '242,294';
const LAYERS_WITH_A_DEPENDENCY = 9;

// ── The stretch #452 opened ──────────────────────────────────────────────────
const BLOB = [391565, 626055];
const BLOB_SUBREGIONS = 29;
const BLOB_BEST_NINE = 1;
const BLOB_BEST_UNITS = 948;
// The best nine-direction score in the WHOLE monolith at each size floor.
const BEST_BY_FLOOR = [[3000, 8], [4000, 8], [5000, 8], [6000, 8]];

// ── The four ends ────────────────────────────────────────────────────────────
const ENDS = [
  { end: 413015, units: 6503, owners: 3, nine: 8 },
  { end: 413963, units: 7451, owners: 4, nine: 9 },
  { end: 422877, units: 16365, owners: 6, nine: 23 },
];
const RECOMMENDED_ROW = 0;
const FOURTH_END = 425438;
const FOURTH_END_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
const SECOND_END_OWNER = '_swingScore';

// ── Reachability ─────────────────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

// ── The chain it would join ──────────────────────────────────────────────────
const NEWEST_CONTRACT = 'tests/swing-weekly-candles-boundary-contract.test.js';
const CHAIN_LENGTH = 31;
const SIZE_RANK_IF_CUT = 8;
const LARGEST_LAYER_CHARS = 71811;
const SMALLEST_LAYER_CHARS = 1761;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
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

console.log('SWING DIRECTION RESOLVER — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

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
    rel, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
    bound: locallyBound(src), owners: scanTopLevelDeclarations(src).map((d) => d.name),
  };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');
const OTHER_INLINE = TAGS.filter((t) => !t.src && t.inline !== CODE).map((t) => t.inline).join('\n');
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

// AN OCCURRENCE INDEX, BUILT ONCE. The obvious way to write `profile` rescans
// the 1.4-million-unit monolith for every one of 950 declaration names, for
// every region — and §5 asks about 122 regions. That cost 235 SECONDS a run,
// which the mutation pass pays 74 times over. Every position of every
// identifier is therefore collected once, and a range query becomes two binary
// searches. The tokenisation is the same one `refSites` uses — an identifier
// not preceded by `.` or a word character — so the numbers are unchanged, and
// the 108 assertions below are what says so.
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
  const deps = new Set();
  for (const d of DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (countIn(at0(OCC_CODE, d.name), range[0], range[1])) deps.add(d.name);
  }
  let outGen = 0;
  for (const d of DECLS) {
    if (nameSet.has(d.name)) continue;
    outGen += countIn(at0(OCC_STRINGS, d.name), range[0], range[1]);
  }
  let outModule = 0;
  for (const [n] of MODULE_OWNERS) {
    if (nameSet.has(n) || local.has(n)) continue;
    outModule += countIn(at0(OCC_CODE, n), range[0], range[1]);
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

// MEMOISED. §5 asks for the best score at four size floors, and §7 walks the
// ends; computed naively that profiles all 122 regions four times over, and the
// audit took 235 SECONDS per run — which the mutation pass then pays 74 times.
// The ranges repeat exactly, so the answer is cached rather than recomputed.
// Same inputs, same numbers, and nothing about what is asserted changes.
const PROFILE_CACHE = new Map();
const profileOf = (range) => {
  const key = range[0] + ':' + range[1];
  let hit = PROFILE_CACHE.get(key);
  if (!hit) { hit = profile(range); PROFILE_CACHE.set(key, hit); }
  return hit;
};

const REC = profileOf([RAW_AT, RAW_END]);
const BODY = CODE.slice(RAW_AT, BODY_END);
const MASKED_BODY = maskLiterals(BODY);
const BODY_FNS = functionBodyRanges(BODY);
const insideBodyFunction = (i) => BODY_FNS.some((r) => i >= r.start && i <= r.end);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, BASE_CHARS, 'index.html is 1,520,354 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…1,549,271 bytes');
  eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…26,328 line feeds');
  eq(sha256(INDEX), BASE_SHA256, '…and hashes to the base digest');
  eq(LOCALS.length, LOCAL_SCRIPTS, 'seventy-five local scripts ship today');
  eq(INDEX, git(['show', BASE_SHA + ':index.html']),
    'and the working tree is byte-identical to the base commit');
  eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at 114,340');
  eq(CODE.length, CODE_CHARS, '…and is 1,405,988 units');
  eq(DECLS.length, TOP_LEVEL_DECLS, 'it declares 950 names at top level');
  eq(MARKS.length, TOP_LEVEL_BANNERS, 'the corrected rule marks 224 top-level banners');
  eq(mergedRegions(MARKS).length, OWNER_REGIONS, '…producing 122 owner-carrying regions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The recommended region, its boundary and its seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE[RAW_AT - 1] === '\n', 'the region opens on a line start');
  eq(CODE.slice(RAW_AT, CODE.indexOf('\n', RAW_AT)), HEAD_BANNER, '…on its own banner');
  ok(MARKS.indexOf(RAW_AT) >= 0, '…which the screen marks');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next line');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts it on all four invariants');
  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, BODY_END - 1),
    'EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED', 'control — a body end one unit short is refused');

  eq(RAW_END - RAW_AT, RAW_CHARS, 'the raw fragment is 6,503 units');
  eq(BODY.length, BODY_CHARS, '…of which the body is 6,502');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', '…and raw IS body plus one structural line feed');
  eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'the body is 6,603 bytes');
  eq((BODY.match(/\n/g) || []).length, BODY_LF, '…92 line feeds');
  eq(sha256(BODY), BODY_SHA256, '…and this is the digest Phase 2 must reproduce');
  eq(BODY.slice(-2), BODY_ENDING, 'it ends `}\\n`');
  eq(MARKS.filter((m) => m > RAW_AT && m < RAW_END).length, 0, 'it spans no banner of its own');

  const owners = scanTopLevelDeclarations(BODY);
  eq(owners.length, OWNER_COUNT, 'three top-level owners');
  eq(owners.map((d) => d.name), OWNERS_EXPECTED, '…in this order');
  eq(owners.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…all three functions');
  eq(owners.map((d) => d.chars), OWNER_SIZES, '…of these sizes, the resolver being most of it');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling, in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(REC.sites, EDGE_SITES, 'FIVE references reach in from the rest of the monolith');
  eq(REC.inbound, EXTERNAL_EDGES, '…exactly five');
  ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
  const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
  eq(Array.from(new Set(REC.sites.map((i) => hostOf(i).name))).sort(), EDGE_HOSTS.slice().sort(),
    '…spread over five functions, all of which stay behind');

  eq({
    inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
    outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
    staticMarkup: REC.mkp, generatedMarkup: REC.gen,
    outboundGenerated: REC.outGen, outboundModule: REC.outModule,
  }, ZERO_DIRECTIONS, 'EIGHT of the nine directions measure zero');
  // The controls those zeros need, from inputs where the answer differs.
  ok(refSites(STRINGS, 'rsApplyFilters').length > 0,
    'control — the literal view DOES find rsApplyFilters, so the generated-markup zero measures');
  ok(profileOf([678945, 686316]).outGen > 0,
    'control — the ticker-search region DOES generate markup naming names that stay behind');
  ok(profileOf([338277, 342591]).outModule > 0,
    'control — the SPY-rewarm region DOES name things that already left, so the ninth zero measures');
  {
    const anySibling = DECLS.filter((d) => SIBLINGS.some((s) => !s.bound.has(d.name) &&
      refSites(s.masked, d.name).length)).length;
    ok(anySibling > 0, 'control — sibling modules DO name monolith declarations, so that zero measures');
  }

  eq(REC.deps, MONOLITH_DEPENDENCIES, 'it names three things the monolith declares');
  eq(REC.nine, FULL_NINE, 'nine directions, total score 8 — five edges in and three dependencies out');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. `S`, and the rule audit #424 left too broad');
// ─────────────────────────────────────────────────────────────────────────────
{
  // THE HISTORY IS READ OUT OF THE SHIPPED CONTRACT, not restated from memory.
  const expiry = fs.readFileSync(path.join(ROOT, EXPIRY_CONTRACT), 'utf8');
  ok(expiry.indexOf(RECORDED_UNITS) >= 0,
    '#424\'s rejection is still on the record in the manual-expiry contract…');
  ok(/S\.swing/.test(expiry) && /const/.test(expiry),
    '…and it records the reason: `S.swing` assigned at evaluation time, `S` being a const');

  // `S` REALLY IS THE SAME NAME, and really is a const in this monolith.
  ok(BY_NAME.has(S_NAME), 'S is a top-level declaration of the monolith…');
  eq(BY_NAME.get(S_NAME).form, S_FORM, '…and it is a const, which is what made #424 fatal');

  // THE THREE HALVES OF THE DISTINCTION, each measured on its own. Together
  // they are the difference between "names S" and "touches S at load".
  eq(refSites(MASKED_BODY, S_NAME).length, S_REFS_IN_BODY, 'this region names S three times…');
  ok(refSites(MASKED_BODY, S_NAME).every(insideBodyFunction),
    '…every one inside a function body: not one of them runs while the file loads…');
  eq(propertyWriteBases(MASKED_BODY).filter((b) => b === S_NAME).length, S_PROPERTY_WRITES,
    '…and it writes NO property through S at all, which is the thing #424 could not survive');

  // The claim needs the negative case too, or it is only a description of one
  // region: the block #424 measured still fails, at this base, for its reason.
  {
    const blob = CODE.slice(BLOB[0], snapBodyEnd(CODE, BLOB[0], BLOB[1]));
    const blobMasked = maskLiterals(blob);
    const blobFns = functionBodyRanges(blob);
    ok(propertyWriteBases(blobMasked).filter((b) => b === S_NAME).length > 0,
      'control — the stretch #424 measured DOES write through S…');
    ok(refSites(blobMasked, S_NAME).some((i) => !blobFns.some((r) => i >= r.start && i <= r.end)),
      '…at top level, outside every function body: the rule still rejects it, and should');
  }

  // IS A RUNTIME DEPENDENCY NORMAL HERE? Counted over the whole chain rather
  // than inferred from the layers nearest to hand.
  {
    const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /-boundary-contract\.test\.js$/.test(f))
      .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))
      .filter((src) => {
        const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
        if (!m) return false;
        try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
      });
    eq(contracts.length, LAYERS_WITH_A_DEPENDENCY,
      'NINE shipped contracts pin a non-empty MONOLITH_DEPENDENCIES: a runtime dependency is the '
      + 'common case in this chain, not an exception argued for this layer');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The stretch #452 opened is still paying');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(RAW_AT >= BLOB[0] && RAW_AT < BLOB[1],
    'this region sits inside the 243,851-unit stretch the old banner rule could only see whole');
  const inBlob = mergedRegions(MARKS).filter((r) => r.start >= BLOB[0] && r.start < BLOB[1]);
  eq(inBlob.length, BLOB_SUBREGIONS,
    'twenty-nine owner-carrying regions are visible inside it at this base');
  // THE SUPERLATIVE, SCOPED TO WHAT IS ACTUALLY MEASURED. The first draft of
  // this audit said "the best of them is this one". It is not: a 948-unit
  // region inside the same stretch scores 1, and the screen had simply hidden
  // it behind a 4,000-unit floor. What is true — and what decides the cycle —
  // is that 8 is the best score available in the WHOLE monolith once regions
  // too small to be worth a layer are excluded, and this region is it.
  const best = Math.min.apply(null, inBlob.map((r) => profileOf([r.start, r.end]).nine));
  eq(best, BLOB_BEST_NINE, 'the best-scoring region inside that stretch scores 1, not 8…');
  {
    const smallest = inBlob.filter((r) => profileOf([r.start, r.end]).nine === BLOB_BEST_NINE);
    eq(smallest.map((r) => r.end - r.start), [BLOB_BEST_UNITS],
      '…over 948 units, which is a seventh of this one and too little to carry a layer');
  }
  const allRegions = mergedRegions(MARKS);
  const bestAbove = (floor) => Math.min.apply(null, allRegions
    .filter((r) => r.end - r.start >= floor).map((r) => profileOf([r.start, r.end]).nine));
  eq(BEST_BY_FLOOR.map(([floor]) => [floor, bestAbove(floor)]), BEST_BY_FLOOR,
    'at every size floor from 3,000 units up, the best score in the whole monolith is 8');
  eq(REC.nine, BEST_BY_FLOOR[0][1], '…and this region is the region that scores it');
  // The old rule, reconstructed, so the claim is measured and not remembered.
  {
    const oldMarks = [];
    for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
      let m;
      while ((m = re.exec(CODE))) if (!insideFunction(m.index)) oldMarks.push(m.index);
    }
    ok(oldMarks.indexOf(RAW_AT) < 0, 'the OLD rule did not mark this region\'s banner either…');
    ok(MARKS.indexOf(RAW_AT) >= 0, '…so this is the second layer the correction has made available');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  const owners = scanTopLevelDeclarations(BODY);
  eq(evaluationTimeReads(BODY, owners, maskLiterals), EVALUATION_TIME_READS,
    'the region reads NO name at evaluation time');
  const blanked = Array.from(BODY);
  for (const d of owners) for (let i = d.start; i <= d.end; i++) blanked[i] = ' ';
  eq(codeLines(blanked.join('')), TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the three declarations');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining three globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(), '…exactly its own owners');
  ok(!(S_NAME in ctx), '…and S is not among them: named, never defined, never touched at load');
  for (const dep of MONOLITH_DEPENDENCIES) ok(!(dep in ctx), '…nor is ' + dep);
  const watched = [];
  const ctx2 = {
    fetch: () => { watched.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.push('setInterval'); },
    setTimeout: () => { watched.push('setTimeout'); },
    localStorage: { getItem: () => { watched.push('localStorage'); return null; } },
    document: { getElementById: () => { watched.push('document'); return null; },
      addEventListener: () => { watched.push('doc.addEventListener'); } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
  };
  vm.createContext(ctx2);
  vm.runInContext(BODY, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer, reads no storage and binds no listener');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Four ends, and the value question stated as a ratio');
// ─────────────────────────────────────────────────────────────────────────────
{
  const measured = ENDS.map(({ end }) => {
    const p = profileOf([RAW_AT, end]);
    return { end, units: end - RAW_AT, owners: p.names.length, nine: p.nine };
  });
  eq(measured, ENDS, 'three legal ends, their sizes, their owners and their nine-direction scores');
  eq(ENDS[RECOMMENDED_ROW].end, RAW_END, '…the first being the recommendation');
  const accepted = ENDS.map(({ end }) => {
    try { return assertSeam(CODE, RAW_AT, snapBodyEnd(CODE, RAW_AT, end)) === end; }
    catch (e) { return e.message; }
  });
  eq(accepted, [true, true, true], 'assertSeam accepts all three…');
  // AND THE FOURTH IS NOT A SEAM AT ALL. The mechanical check is usually silent
  // — the two cycles before this one had every candidate end accepted — so when
  // it does reject one, that is worth keeping rather than quietly dropping the
  // row from the table.
  throwsWith(() => assertSeam(CODE, RAW_AT, snapBodyEnd(CODE, RAW_AT, FOURTH_END)),
    FOURTH_END_ERROR, '…and REFUSES the fourth: no structural separator before what follows');

  // THE CLOSE CALL, argued rather than dismissed: the second end is one owner
  // and one point away.
  ok(ENDS[1].nine - ENDS[0].nine === 1 && ENDS[1].units - ENDS[0].units === 948,
    'the second end costs one more point for 948 more units — close enough to need a reason');
  {
    const second = profileOf([RAW_AT, ENDS[1].end]);
    eq(second.names.filter((n) => OWNERS_EXPECTED.indexOf(n) < 0), [SECOND_END_OWNER],
      '…the owner it adds being _swingScore');
    ok(MARKS.indexOf(ENDS[0].end) >= 0,
      '…which opens its OWN banner, so the recommended end is where one feature stops and the '
      + 'next begins: taking it would cut that feature in half for a point of coupling');
  }

  // THE VALUE QUESTION, stated rather than buried.
  const lines = BODY.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is 93 lines');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…44 of them comment or blank');
  eq(codeLines(BODY), CODE_LINES, '…and 49 lines of code');
  eq(scanTopLevelDeclarations(BODY)[0].start, HEADER_UNITS,
    'the first owner begins 1,604 units in: the region opens with a documentation header');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Reachability, and the chain it would join');
// ─────────────────────────────────────────────────────────────────────────────
{
  const dead = DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return refSites(MASKED, d.name).filter((i) => !self(i)).length === 0 &&
      refSites(STRINGS, d.name).length === 0 &&
      refSites(STATIC_MARKUP, d.name).length === 0 &&
      refSites(OTHER_INLINE, d.name).length === 0 &&
      SIBLINGS.every((s) => refSites(s.masked, d.name).length === 0 &&
        refSites(s.strings, d.name).length === 0);
  });
  eq(dead.length, DEAD_DECLS, 'eighteen declarations are named nowhere in production');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…5,318 units of them');
  eq(REC.names.filter((n) => dead.some((d) => d.name === n)), [],
    'and none of the recommended region\'s owners is among them');

  const NEWEST = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = new Function('MODULE_REL',
    `return ${NEWEST.match(/^const CHAIN = (\[[\s\S]*?^\]);$/m)[1]};`
  )(NEWEST.match(/^const MODULE_REL = '([^']+)';$/m)[1]);
  eq(CHAIN.length, CHAIN_LENGTH, 'thirty-one layers ship today, read from the newest contract');
  eq(Number(NEWEST.match(/^const CHAIN_LENGTH = (\d+);$/m)[1]), CHAIN_LENGTH,
    '…and the CHAIN_LENGTH it pins agrees with the list it ships');
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, '…and none of them is the file Phase 2 would write');
  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length)
    .concat([BODY_CHARS]).sort((a, b) => a - b);
  eq(sizes.indexOf(BODY_CHARS) + 1, SIZE_RANK_IF_CUT,
    'cut, it would rank eighth of thirty-two by size — no superlative moves');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…against a largest of 71,811');
  eq(sizes[0], SMALLEST_LAYER_CHARS, '…and a smallest of 1,761');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NO production file changed: this audit measures, it does not move bytes');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'CLAUDE.md' || rel.startsWith('tests/')),
    'every changed path is a test artifact');
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
    TEST_FILE_COUNT, 'the suite ratchets by one: 159 files before, 160 after');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length,
  BASE_TEST_FILE_COUNT, '…and 159 is what the base actually carried');
  {
    const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /\.test\.js$/.test(f) && f !== path.basename(AUDIT_REL))
      .filter((f) => /^const TEST_FILE_COUNT = \d+;$/m.test(
        fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(contracts.length, RATCHETED_CONTRACTS, 'TWENTY-ONE contracts pin the suite file count');
    const RATCHETED = new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm');
    ok(contracts.every((f) => RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
      '…and every one of them reads the ratcheted count, none left behind');
  }

  // THE RETIREMENT and the budget, as arithmetic rather than as a claim.
  {
    ok(changed.indexOf(RETIREMENT.spec) >= 0, 'the retired mutation spec is part of the change');
    ok(!fs.existsSync(path.join(ROOT, RETIREMENT.spec)), '…and is gone from the tree');
    const mod = { exports: {} };
    new Function('module', 'exports', git(['show', BASE_SHA + ':' + RETIREMENT.spec]))(mod, mod.exports);
    eq(mod.exports.mutants.length, RETIREMENT.mutants, '…having carried sixty-eight mutants');
    ok(fs.existsSync(path.join(ROOT, RETIREMENT.contract)), 'the contract it targeted still ships');
    const CALL = /\b(?:eq|ok|throwsWith|throws|deepStrictEqual|strictEqual)\s*\(/g;
    const before = git(['show', BASE_SHA + ':' + RETIREMENT.contract]);
    const after = fs.readFileSync(path.join(ROOT, RETIREMENT.contract), 'utf8');
    eq((after.match(CALL) || []).length, (before.match(CALL) || []).length,
      '…with exactly as many assertions as before: the spec retired, not the contract');
    ok(/ok\(!fs\.existsSync\(path\.join\(ROOT, CONTRACT_SPEC_REL\)\)/.test(after),
      '…and its spec-existence assertion is now its NEGATION, so the retirement is executed');

    const auditSpec = require('./mutation-specs/swing-direction-audit.spec.js');
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared 212 mutants');
    eq(declaredNow, BASE_DECLARED_MUTANTS - RETIREMENT.mutants + auditSpec.mutants.length,
      '…and this change declares exactly that, less the retirement, plus this audit\'s spec');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow, '…and the declared total is under it');
    eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('SWING_DIRECTION_AUDIT_OK');
