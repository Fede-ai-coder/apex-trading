'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO SNAPSHOT FALLBACK — TEMPORARY BOUNDARY AUDIT.
//
// MEASUREMENT ONLY. Nothing moves in this PR: index.html and every shipped
// module are byte-identical to 08a8b04, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file and ships the cut it
// recommends.
//
// THE RECOMMENDATION: [719625,722693) in monolith coordinates, 3,068 units raw
// and 3,067 of body, TWO owners — both functions — to
// js/portfolio/portfolio-snapshot-fallback.js. `_snapshotSqueezeState` (705)
// projects an entry snapshot's squeeze flag into the 'ACTIVE'/'OFF' string the
// positions row renders, and `_positionFieldsFromSnapshot` (984) derives the
// fallback position fields used ONLY when live streaming data is absent.
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
//   719625  3,067 units  THE RECOMMENDATION
//   719847  2,845 units  the declaration   → strands the squeeze paragraph
//
// The recommendation opens 452 units into the header, on the paragraph that
// documents `_snapshotSqueezeState`, and leaves behind exactly the section
// title and positionManager's own description. Every piece of documentation
// travels with the code it describes — which neither of the other two
// boundaries achieves. §6 asserts the screen enumerates ONLY the first, so this
// boundary is a judgement this audit defends rather than something a rule
// produced.
//
// ── COUPLING: byConsumerSplit 1, AND NOTHING SCORES BETTER ─────────────────
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
// ── WHERE IT WOULD SIT ─────────────────────────────────────────────────────
//
// THIRD smallest of the forty-three layers the chain would then hold, displacing
// the 3,334-unit layer into fourth. TWO layers are smaller: the 1,761-unit one
// and the 2,936-unit one #476 shipped. §8 asserts the rank by measurement — an
// earlier draft of this header said "second smallest", carried over from a
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

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-snapshot-fallback.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '08a8b04';
const BASE_CHARS = 1457675;
const BASE_UTF8 = 1486290;
const BASE_LF = 25203;
const BASE_SHA256 = '4560fd43a857ea60feef29fda90ade7826c39d7e76ce3a8f7794c13b941be19d';
const LOCAL_SCRIPTS = 86;
const TEST_FILE_COUNT = 171;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-snapshot-fallback-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-snapshot-fallback-audit.spec.js';
const RATCHETED_CONTRACTS = 33;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const NEWEST_CONTRACT = 'tests/backend-full-refresh-validation-boundary-contract.test.js';
const NEWEST_CONTRACT_SPEC = 'tests/mutation-specs/backend-full-refresh-validation-contract.spec.js';
const BASE_DECLARED_MUTANTS = 137;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/backend-full-refresh-validation-contract.spec.js';
const RETIRED_MUTANTS = 131;
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

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 42;
const SMALLEST_LAYER_CHARS = 1761;
const SECOND_SMALLEST_LAYER_CHARS = 2936;
const DISPLACED_LAYER_CHARS = 3334;
const LARGEST_LAYER_CHARS = 71811;
const SIZE_RANK_IF_CUT = 3;
const LAYERS_LARGER_THAN_THIS_CUT = 40;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/portfolio/portfolio-snapshot-fallback.js"></script>\n';
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


console.log('PORTFOLIO SNAPSHOT FALLBACK — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. Phase 2 puts a peel here and this
// becomes the reconstruction the permanent contract runs against.
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


// CHAIN, read off the newest contract rather than written here: that file
// carries the list ending at its own layer, and copying it would be a second
// place to drift. Phase 2 gives this cycle its own literal.
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
  '…which is the digest of the BASE_SHA commit\'s index.html, read out of git, so the base '
  + 'is a commit and not a remembered number');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and is CODE_CHARS units of residual code');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it holds TOP_LEVEL_DECLS top-level declarations');
eq(REGIONS.length, OWNER_REGIONS, '…across OWNER_REGIONS owner regions');
// THE PREVIOUS LAYER'S OWN FORECAST, checked. #476's contract predicted the
// residual monolith this audit measures, so the two cycles are joined by a
// number rather than by a sentence.
eq(CODE.length, Number(fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8')
  .match(/^const RESIDUAL_MONOLITH = (\d+);$/m)[1]),
'…which is exactly the RESIDUAL_MONOLITH the newest contract forecast');

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
  const newest = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  eq(Number(newest.match(/^const RUNNER_UP_B_AT = (\d+);$/m)[1]), SECTION_AT + 0,
    'the newest contract pins this region as its RUNNER_UP_B, at the section start');
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
  const newest = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  eq(newest.match(/^const RUNNER_UP_A_OWNER = '([^']+)';$/m)[1], RUNNER_UP_OWNER,
    'the newest contract pins RUNNER_UP_A_OWNER as this candidate');
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
    '…and they are exactly the two runners-up the newest contract published');
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
  const prev = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
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
section('8. Where this layer would sit');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length)
    .sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT by size — the THIRD smallest layer, and the audit '
    + 'says so rather than selling a 3,067-unit cut as a substantial one');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  eq(sizes[1], SECOND_SMALLEST_LAYER_CHARS,
    '…the second smallest being SECOND_SMALLEST_LAYER_CHARS, the layer the previous cycle shipped');
  eq(sizes[2], DISPLACED_LAYER_CHARS,
    '…and the layer it would displace into FOURTH place is DISPLACED_LAYER_CHARS units');
  ok(BODY_CHARS > SECOND_SMALLEST_LAYER_CHARS && BODY_CHARS < DISPLACED_LAYER_CHARS,
    '…so the rank is three because it sits strictly between those two, and TWO layers are '
    + 'smaller than it rather than one');
}
// WHAT THE CUT WOULD COST THE DOCUMENT, forecast here so Phase 2 can be held
// to it the way this cycle held #476 to its own forecast.
eq(TAG_IF_CUT.length, RAW_CHARS - NET_REDUCTION,
  'the tag it would add is RAW_CHARS less NET_REDUCTION units');
eq(TAG_IF_CUT, '<script src="./' + MODULE_REL_IF_CUT + '"></script>\n',
  '…and names the module this audit recommends');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html would land at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
eq(count(INDEX, TAG_IF_CUT), 0, '…and no such tag exists yet');

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
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
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  ok(all.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  eq(fs.readFileSync(path.join(ROOT, AUDIT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and AUDIT_REL is the path of THIS file, byte for byte');
  ok(all.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  ok(all.every((rel) => rel.startsWith('tests/')), '…and every changed path is a test artifact');
  // THE RATCHET.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this audit in it');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, TEST_FILE_COUNT - 1,
  '…one more than the base commit carried, read out of git');
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
  // THE BUDGET.
  const auditSpec = require(path.join(ROOT, AUDIT_SPEC_REL));
  eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length - RETIRED_MUTANTS,
    '…and the live total is the base, LESS the spec this cycle retires, PLUS this audit\'s own '
    + '— the arithmetic of the change rather than the total it happens to reach');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at MUTANT_BUDGET');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  // ABSENCE ALONE IS NOT A PIN.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the outgoing CONTRACT\'s spec is retired, in Phase 1 as the rhythm runs');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely one that never existed');
  ok(fs.existsSync(path.join(ROOT, NEWEST_CONTRACT)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + NEWEST_CONTRACT + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  eq(RETIRED_SPEC_REL, NEWEST_CONTRACT_SPEC,
    'the retired path IS the newest layer\'s spec: the retirement is in chain order');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(AUDIT_SPEC_REL)], '…and during Phase 1 it is THIS audit\'s');
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_SNAPSHOT_FALLBACK_AUDIT_OK');
}

main();
