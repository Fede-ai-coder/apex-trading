'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// RS SKIP BREAKDOWN — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [336476,338277) in monolith coordinates — 1,801 units raw
// and 1,800 of body, ONE owner, a synchronous function — into
// js/ui/rs-skip-breakdown-html.js. `rsbSkipBreakdownHtml` builds the "SKIPPED
// BREAKDOWN" block of the RS scanner panel as an HTML string: the skip reasons
// with their counts, a note on whether the SPY benchmark is cached, and the
// near misses with their signed scores. The first 109 units are the two comment
// lines that document it.
//
// ── THE FINDING, PART ONE: THE SCORE-1 TIER IS EMPTY ───────────────────────
//
// The contract before this one counted exactly one clean candidate at
// byConsumerSplit 1, and that candidate has shipped. §4 reads the count out of
// that contract and counts the tier again: nothing is left at 1 or below. The
// best score that remains is 2, held by SCORE_TWO candidates over thirteen
// distinct openings, and this function is the only candidate in the whole
// screen with a raw nine below 3. It is also the first runner-up the previous
// contract published, at the same offset because it sits before the cut that
// left. The other three survive that cut too, one of them moved up by its raw
// length, and §4 asserts all four.
//
// ── PART TWO: WHAT THE 2 IS MADE OF ────────────────────────────────────────
//
// One consumer, `rsbMaybeRenderBackendRs`, at one call site, and ONE monolith
// dependency, `escHtml`. That dependency is not new ground: it is a global
// function declaration that other local scripts already call at call time, and
// §3 counts them. What it changes is the failure mode. The previous layer
// swallowed every missing foundation into a returned object, so its load order
// was the only guard. This function has no `try`: without `escHtml` it throws a
// ReferenceError, and §7 runs both the success path and that throw.
//
// ── PART THREE: THE BOUNDARY IS A JUDGEMENT, IN A NEW SHAPE ────────────────
//
// Between the previous function's closing brace and the declaration the seam
// accepts FOUR line starts. One is that brace and is not valid JavaScript; the
// other three parse: the documentation, its second line, and the declaration.
// The screen visits only the declaration. The second line begins in the middle
// of a sentence, and cutting at the declaration would leave the documentation
// behind, directly above the next feature's banner. The recommendation opens on
// the documentation, and §2 measures both consequences instead of asserting them.
//
// ── PART FOUR: THE CUT CLOSES ITS REGION ───────────────────────────────────
//
// It is the last of fourteen owners in the "RS snapshot diagnostics" banner
// region, and the region ends exactly where the cut does. Taking more is priced
// in §5 and loses on every axis: the three owners above it, the consumer, and
// the whole region.
//
// ── WHERE IT WOULD SIT ─────────────────────────────────────────────────────
//
// The SECOND smallest of the forty-five layers the chain would then hold. The
// documentation decides the rank: the declaration alone, which is the row the
// screen scores, would be the smallest of all. Neither chain-wide shape count
// would move, since this module contains an em dash and opens on a comment.
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

const MODULE_REL_IF_CUT = 'js/ui/rs-skip-breakdown-html.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '56e8b37';
const BASE_CHARS = 1452898;
const BASE_UTF8 = 1481465;
const BASE_LF = 25121;
const BASE_SHA256 = '4ae28fcadc38ec40b2d494ef2818d3231113975fed734610393801046f5b9e99';
const LOCAL_SCRIPTS = 88;
const TEST_FILE_COUNT = 173;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-rs-skip-breakdown-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/rs-skip-breakdown-audit.spec.js';
const RATCHETED_CONTRACTS = 35;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/portfolio-technical-batch-fetch-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 133;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-technical-batch-fetch-contract.spec.js';
const RETIRED_MUTANTS = 127;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115210;
const CODE_CHARS = 1337662;
const TOP_LEVEL_DECLS = 916;
const OWNER_REGIONS = 118;

// ── The recommended region ───────────────────────────────────────────────────
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
// local scripts already call at call time.
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

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 44;
const SMALLEST_LAYER_CHARS = 1761;
const DISPLACED_LAYER_CHARS = 1852;
const LARGEST_LAYER_CHARS = 71811;
const SIZE_RANK_IF_CUT = 2;
const LAYERS_LARGER_THAN_THIS_CUT = 43;
const DECLARATION_ONLY_CHARS = 1691;
const PURE_ASCII_LAYERS = 3;
const LAYERS_OPENING_ON_BANNER = 23;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/ui/rs-skip-breakdown-html.js"></script>\n';
const NET_REDUCTION = 1743;
const INDEX_AFTER = 1451155;
const RESIDUAL_MONOLITH = 1335861;
const LOCAL_SCRIPTS_AFTER = 89;

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


console.log('RS SKIP BREAKDOWN — TEMPORARY BOUNDARY AUDIT');
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

// CHAIN, read off the newest contract rather than written here: that file
// carries the list ending at its own layer, and copying it would be a second
// place to drift. Phase 2 gives this cycle its own literal.
const CHAIN = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8')
  .match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
  .map((l) => l.replace(/^'|',?$/g, ''));
const CHAIN_SET = new Set(CHAIN);
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
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and is CODE_CHARS units of residual code');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it holds TOP_LEVEL_DECLS top-level declarations');
eq(REGIONS.length, OWNER_REGIONS, '…across OWNER_REGIONS owner regions');
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the
// technical batch fetch predicted both the document and the residual monolith
// this audit measures, so the two cycles are joined by numbers.
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

// WHAT THE RECOMMENDATION TAKES is the paragraph documenting the function, and
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
// banner for a different feature; the recommendation leaves nothing orphaned.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(DOC_FIRST_LINE + '\n' + DOC_SECOND_LINE + '\n' + BANNER_AFTER_PREFIX) >= 0,
    'cutting at the declaration would leave the two comment lines directly above the next banner');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(clean.indexOf(DOC_FIRST_LINE) < 0 && clean.indexOf(DOC_SECOND_LINE) < 0,
    '…while the recommended cut leaves neither line behind');
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
    '…a function, so this layer would ship no mutable binding');
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
// monolith, called by other local scripts already. The cut therefore adds a
// call-time edge of a kind the chain already carries.
{
  const esc = BY_NAME.get(ESC_HTML);
  ok(esc !== undefined && esc.start > RAW_END_IN_CODE, ESC_HTML + ' is declared in the monolith, AFTER the cut');
  eq(esc.form, 'function', '…as a function declaration, so it is a global the moment the monolith runs');
  eq(esc.chars, ESC_HTML_CHARS, '…ESC_HTML_CHARS units long');
  eq(OWNER_KIND.get(ESC_HTML), undefined, '…and owned by NO local module');
  const users = SIBLINGS.filter((s) => !s.bound.has(ESC_HTML)
    && /(^|[^.\w$])escHtml\b/.test(s.masked)).map((s) => s.rel);
  eq(users.length, ESC_HTML_USERS, 'ESC_HTML_USERS local scripts already call it');
  eq(users.filter((rel) => CHAIN_SET.has(rel)).length, ESC_HTML_CHAIN_USERS,
    '…ESC_HTML_CHAIN_USERS of them chain layers, so this would not be the first');
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
section('4. THE FINDING: the score-1 tier is empty, and one candidate leads the next');
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
    'this screen counts SCORE_ONE_TIER clean candidates at 1 or below: the tier is empty');
  ok(SCORE_ONE_TIER < PREVIOUS_SCORE_ONE_TIER, '…down from the previous contract\'s count');
  // THE FOUR RUNNERS-UP IT PUBLISHED SURVIVE THE CUT THAT LEFT, shifted by its
  // raw length where they sat after it. Read, not recalled.
  eq(num('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(num('RAW_END_IN_CODE'), PREVIOUS_RAW_END, '…ending at PREVIOUS_RAW_END');
  const listed = prev.match(/^const RUNNERS_UP = \[([\s\S]*?)^\];/m)[1]
    .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
    .map((l) => JSON.parse(l.replace(/,$/, '')));
  eq(listed.length, RUNNERS_UP.length, 'it published as many runners-up as this audit does…');
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
section('5. What taking more would cost: the owners above, the consumer, the region');
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
  '…and its row ends exactly where the recommended cut does');
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
section('8. Where this layer would sit, and what it would change');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT by size — the SECOND smallest layer, and the audit says '
    + 'so rather than selling a 1,800-unit cut as a substantial one');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  eq(sizes[1], DISPLACED_LAYER_CHARS,
    '…the layer it would displace into THIRD place being DISPLACED_LAYER_CHARS units');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < DISPLACED_LAYER_CHARS,
    '…so it sits strictly between those two, and exactly ONE layer is smaller than it');
  // THE DOCUMENTATION DECIDES THE RANK. The declaration alone, which is what the
  // screen scores, would be SMALLER than every shipped layer.
  ok(DECLARATION_ONLY_CHARS < SMALLEST_LAYER_CHARS && BODY_CHARS - DOC_TAKEN === DECLARATION_ONLY_CHARS,
    'control — without its documentation it would be the SMALLEST layer of all, at DECLARATION_ONLY_CHARS units');
  eq(sizes.filter((u) => u < DECLARATION_ONLY_CHARS).length, 0,
    '…which is measured against every layer, not inferred from the smallest');
  // THE TWO CHAIN-WIDE SHAPE COUNTS: neither moves. This module is NOT pure ASCII
  // (a null score renders as an em dash) and does not open on a `── ` banner.
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(!ascii(BODY), '…and this body is not, so that count would NOT move');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does not, so that count would NOT move either');
}
// WHAT THE CUT WOULD COST THE DOCUMENT, forecast here so Phase 2 can be held
// to it the way the last cycle held this one to its own forecast.
eq(TAG_IF_CUT.length, RAW_CHARS - NET_REDUCTION,
  'the tag it would add is RAW_CHARS less NET_REDUCTION units');
eq(TAG_IF_CUT, '<script src="./' + MODULE_REL_IF_CUT + '"></script>\n',
  '…and names the module this audit recommends');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html would land at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
eq(LOCAL_SCRIPTS + 1, LOCAL_SCRIPTS_AFTER, '…and LOCAL_SCRIPTS_AFTER local scripts');
eq(count(INDEX, TAG_IF_CUT), 0, '…and no such tag exists yet');
eq(LOCALS[LOCALS.length - 1], 'js/portfolio/portfolio-technical-batch-fetch.js',
  '…the tag would follow the newest local script, which is the previous layer');

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
  ok(fs.existsSync(path.join(ROOT, PREVIOUS_CONTRACT)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + PREVIOUS_CONTRACT + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(AUDIT_SPEC_REL)], '…and during Phase 1 it is THIS audit\'s');
}

console.log('\n' + pass + ' assertions passed.');
console.log('RS_SKIP_BREAKDOWN_AUDIT_OK');
}

main();
