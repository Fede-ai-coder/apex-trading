'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TECHNICAL BATCH FETCH — TEMPORARY BOUNDARY AUDIT.
//
// MEASUREMENT ONLY. Nothing moves in this PR: index.html and every shipped
// module are byte-identical to 454f79e, and §9 asserts that against git rather
// than trusting the diff. Phase 2 converts this file into the permanent contract
// and ships the cut it recommends.
//
// THE RECOMMENDATION: [938249,940102) in monolith coordinates, 1,853 units raw
// and 1,852 of body, ONE owner — `_fetchPortfolioTechnicalBatch`, an async
// function — to js/portfolio/portfolio-technical-batch-fetch.js. It POSTs one
// batch of symbols to the backend's technical-refresh route and returns a result
// object: `{ ok: true, data, … }` on success and `{ ok: false, reason, … }` on
// every failure path it has.
//
// ── THE FINDING, PART ONE: ONE CANDIDATE IS LEFT AT 1 ──────────────────────
//
// At #477 two clean candidates scored byConsumerSplit 1: the section the
// snapshot-fallback cut came out of, and this function. This function had been
// published as a runner-up since #475 and refused there on a RELATIVE ground —
// it lost to a cut scoring 1 on the raw nine. Both cuts that stood ahead of it
// have shipped, so §6 counts EXACTLY ONE of the clean candidates at 1, and it is this one.
// §4 reads both earlier refusals out of the contracts that recorded them rather
// than recalling them, and joins the two cycles by arithmetic: the offset this
// function was published at, less the raw length of the cut that left, is the
// offset it has now.
//
// ── PART TWO: IT NEVER THROWS, AND THAT IS THE HAZARD ──────────────────────
//
// Every lookup of `fetch`, `BACKEND`, `_backendAuthHeaders` and `AbortSignal`
// sits inside one `try` (the single line before it only reads the clock, and §7
// asserts the position of each name rather than leaving that to this sentence).
// A missing foundation does not crash it: it RETURNS `{ ok: false, reason: 'request_error', errorName:
// 'ReferenceError' }`. §7 measures a ladder, supplying one missing name at a
// time, and none of the cases it runs throws. The layer shipped immediately
// before this one DOES throw when a foundation name it calls is missing, and §7
// runs that as a control rather than asserting the difference.
//
// THE CONSEQUENCE IS FOR PHASE 2. A load-order mistake would not fail loudly: it
// would turn every technical refresh into a quiet request_error. The permanent
// contract therefore has to pin the order of the tags, because the runtime will
// not complain. `BACKEND` and `_backendAuthHeaders` come from modules loaded at
// local indices 4 and 3 of 87, long before the tag this cut would add.
//
// ── PART THREE: THE SEAM IS NOT ENOUGH HERE EITHER ─────────────────────────
//
// `assertSeam` accepts THREE openings between three units above the declaration
// and the declaration itself. One of them begins on the closing brace of the PREVIOUS function and is not
// valid JavaScript; §2 measures that by parsing it. The screen never visits it,
// because it opens runs only at a region start or a declaration start. It is
// another instance of what CLAUDE.md records — the seam is mechanical, the
// boundary is not — and the shared helper is deliberately left alone in a PR
// whose job is to move no production byte.
//
// ── COUPLING: byConsumerSplit 1 ────────────────────────────────────────────
//
// ONE consumer, `fetchPortfolioTechnicalRefresh`, at two call sites, which is
// the immediate neighbour below the cut. No monolith dependency and no chain
// module; the two foundation names it reads are not counted against it. Both
// directions of state coupling are measured: nothing writes into it, and it
// assigns to no identifier it does not own, checked by a direct scan of the body
// as well as by the profile.
//
// ── WHAT TAKING MORE WOULD COST, PRICED ────────────────────────────────────
//
// Taking its consumer too is available and legal. §5 prices it, and prices the
// banner region it sits in, rather than dismissing either.
//
// ── WHERE IT WOULD SIT ─────────────────────────────────────────────────────
//
// SECOND smallest of the forty-four layers the chain would then hold, displacing
// the 2,936-unit layer into third. §8 asserts the rank by measurement, and
// forecasts the document figures and the two chain-wide shape counts so
// that Phase 2 is held to them. It is pure ASCII, so one of those counts moves.
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

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-technical-batch-fetch.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '454f79e';
const BASE_CHARS = 1454677;
const BASE_UTF8 = 1483244;
const BASE_LF = 25152;
const BASE_SHA256 = '0757e6576b328511c3014d6746ac2c6ff9513b0d16999f8b5ef321f2bf637aca';
const LOCAL_SCRIPTS = 87;
const TEST_FILE_COUNT = 172;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-technical-batch-fetch-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-batch-fetch-audit.spec.js';
const RATCHETED_CONTRACTS = 34;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/portfolio-snapshot-fallback-boundary-contract.test.js';
const PREVIOUS_CONTRACT_SPEC = 'tests/mutation-specs/portfolio-snapshot-fallback-contract.spec.js';
// The contract one further back, which refused this function the first time.
const REFUSING_CONTRACT = 'tests/backend-full-refresh-validation-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 114;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-snapshot-fallback-contract.spec.js';
const RETIRED_MUTANTS = 108;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115136;
const CODE_CHARS = 1339515;
const TOP_LEVEL_DECLS = 917;
const OWNER_REGIONS = 118;

// ── The recommended region ───────────────────────────────────────────────────
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

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 43;
const SMALLEST_LAYER_CHARS = 1761;
const DISPLACED_LAYER_CHARS = 2936;
const LARGEST_LAYER_CHARS = 71811;
const SIZE_RANK_IF_CUT = 2;
const LAYERS_LARGER_THAN_THIS_CUT = 42;
const PURE_ASCII_LAYERS = 2;
const PURE_ASCII_AFTER = 3;
const LAYERS_OPENING_ON_BANNER = 23;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/portfolio/portfolio-technical-batch-fetch.js"></script>\n';
const NET_REDUCTION = 1779;
const INDEX_AFTER = 1452898;
const RESIDUAL_MONOLITH = 1337662;
const LOCAL_SCRIPTS_AFTER = 88;

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

console.log('PORTFOLIO TECHNICAL BATCH FETCH — TEMPORARY BOUNDARY AUDIT');
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
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. #478's contract predicted both
// the document and the residual monolith this audit measures, so the two cycles
// are joined by numbers rather than by sentences.
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
    '…where the declaration opens on code, which is the boundary this audit recommends');
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
    '…a function, so this layer would ship no mutable binding');
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
// cut would add, which is what makes the cut sound — and §7 shows why it matters
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
    '…both before the position the new tag would take, which is index ' + LOCALS.length);
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
  eq(num(prev, 'RUNNER_UP_UNITS'), BODY_CHARS, '…at the SAME length this audit measures');
  eq(num(prev, 'RUNNER_UP_NINE'), FULL_NINE, '…scoring the SAME raw nine');
  ok(prev.indexOf('why its own refusal has expired') >= 0,
    '…and records that its refusal had expired, in those words');
  // THE TWO CYCLES ARE JOINED BY ARITHMETIC. It was published at an offset
  // measured on the document BEFORE the snapshot-fallback cut left; that cut was
  // earlier in the monolith, so removing its raw length gives the offset now.
  eq(num(prev, 'RUNNER_UP_AT') - num(prev, 'RAW_CHARS'), RAW_AT_IN_CODE,
    '…at an offset which, less the raw length of the cut that left, IS this audit\'s offset');
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
  'the screen DOES enumerate the recommended opening, unlike the boundary the previous cycle defended');
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
  eq(raised && raised.name, 'ReferenceError', '…a ReferenceError, which this layer would have returned instead');
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
    + 'so rather than selling a 1,852-unit cut as a substantial one');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  eq(sizes[1], DISPLACED_LAYER_CHARS,
    '…the layer it would displace into THIRD place being DISPLACED_LAYER_CHARS units');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < DISPLACED_LAYER_CHARS,
    '…so it sits strictly between those two, and exactly ONE layer is smaller than it');
  // THE TWO CHAIN-WIDE SHAPE COUNTS, forecast so Phase 2 can be held to them.
  // Each is measured over the chain as it stands; this layer's own half is
  // asserted separately of the module, never folded into the census.
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(ascii(BODY), '…and this body is pure ASCII too, so the count would move');
  eq(sources.filter(ascii).length + 1, PURE_ASCII_AFTER, '…to PURE_ASCII_AFTER');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does not, so that count would NOT move');
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
eq(LOCALS[LOCALS.length - 1], 'js/portfolio/portfolio-snapshot-fallback.js',
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
  eq(RETIRED_SPEC_REL, PREVIOUS_CONTRACT_SPEC,
    'the retired path IS the previous layer\'s spec: the retirement is in chain order');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(AUDIT_SPEC_REL)], '…and during Phase 1 it is THIS audit\'s');
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_TECHNICAL_BATCH_FETCH_AUDIT_OK');
}

main();
