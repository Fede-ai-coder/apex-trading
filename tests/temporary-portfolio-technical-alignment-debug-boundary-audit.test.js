'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TECHNICAL ALIGNMENT DEBUG — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [990716,994856) in monolith coordinates — 4,140 raw units,
// TWO top-level owners: `buildPortfolioTechnicalAlignmentDebug` (3,405) and
// `mapLimit` (731). ONE consumer, ZERO monolith dependencies, and zero in every
// other direction. It loads in an empty VM and runs nothing while it loads.
//
// ── THIS AUDIT'S FINDING: A CRITERION PROPOSED, MEASURED, AND RETIRED ───────
//
// The two owners DO NOT REFERENCE EACH OTHER. `buildPortfolioTechnicalAlignment-
// Debug` builds a diagnostic record for one position; `mapLimit` is a general
// bounded-concurrency helper. They sit two blank lines apart with no banner
// between them, adjacent by accident rather than by design.
//
// That prompted an objection worth taking seriously: a module named for one
// feature should not carry an unrelated utility, and bundling two strangers
// would be a first for this chain — grounds to take the 3,406-unit single-owner
// cut instead and leave 733 units behind.
//
// THE OBJECTION WAS MEASURED BEFORE IT WAS WRITTEN DOWN, and it did not
// survive. Of the chain's 34 layers, 27 ship more than one owner; of those, only
// TEN have owners that form one connected graph under "names the other".
// SEVENTEEN already ship disconnected sets — `portfolio-dxlink-greeks` has the
// identical two-owners/one-connected shape, and so do `swing-direction`,
// `swing-weekly-candles`, `tt-reconnect` and `journal-snapshot-prefetch`.
// Bundling strangers is not a first; it is the MAJORITY case, by 17 to 10.
//
// So the criterion is retired rather than applied, and §5 executes the count
// that retires it. This is the fourth cycle running in which a claim about
// "the first layer that…" was checked against the whole chain instead of the
// layers nearest to hand, and the second in which the check changed the
// recommendation — #458 moved from 2,710 units to 5,832, and this one keeps
// 4,139 where an unmeasured instinct would have taken 3,406.
//
// WHAT THE SCREEN FOUND. 7,690 owner runs, 2,048 refused by `assertSeam`, 3,322
// distinct candidates, 2,059 of which run nothing at load. FIVE have a coupling
// that is exactly one consumer. 163 have one consumer and more than one site, so
// the #458 refinement still separates a twelfth of the set — this region is one
// of them, reading 5 on the raw score and 1 on consumers.
//
// ── WHAT THIS CANDIDATE IS ──────────────────────────────────────────────────
//
// `buildPortfolioTechnicalAlignmentDebug(ticker, pos, technical)` assembles the
// diagnostic record the live refresh attaches to a position when technical
// debugging is on; `mapLimit(items, limit, worker)` runs an async worker over an
// array at bounded concurrency. Both take everything they touch as parameters,
// so MONOLITH_DEPENDENCIES is EMPTY, not short.
//
// `mapLimit` HAS EXACTLY ONE CALL SITE in the whole application, which is what
// makes a generic-sounding helper a one-consumer region. §4 measures that rather
// than trusting the name: the monolith runs 22 `Promise.all` sites that do not
// use it, so its generality is unexercised, not shared.
//
// It would be the chain's SECOND pure-ASCII layer and its SECOND carrying no
// comment line at all — 64 code lines of 69, and not one `//`. §8 states both as
// counts over the chain rather than as superlatives, because this programme has
// written "the first layer that…" from a partial look and been wrong every time.
//
// ── THE RETIREMENT ──────────────────────────────────────────────────────────
//
// One mutation spec retires per cycle, in chain order. This cycle: layer #33,
// the backend positions aggregate, 76 mutants. Its CONTRACT still runs on every
// push with every assertion intact, which §10 proves by counting them against
// the base.
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

const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-technical-alignment-debug.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'cc42f30';
const BASE_CHARS = 1504517;
const BASE_UTF8 = 1533331;
const BASE_LF = 26050;
const BASE_SHA256 = '6944b4231b09b963e6c044de4f0ea6c2a4623a042b81fb1331303b06b5258e5f';
const LOCAL_SCRIPTS = 78;
const BASE_TEST_FILE_COUNT = 162;
const TEST_FILE_COUNT = 163;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-technical-alignment-debug-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-alignment-debug-audit.spec.js';
const RATCHETED_CONTRACTS = 24;
const RETIREMENT = {
  contract: 'tests/backend-positions-aggregate-boundary-contract.test.js',
  spec: 'tests/mutation-specs/backend-positions-aggregate-contract.spec.js',
  mutants: 76,
};
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 162;
const MUTANT_BUDGET = 250;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114535;
const CODE_CHARS = 1389956;
const TOP_LEVEL_DECLS = 945;
const TOP_LEVEL_BANNERS = 223;
const OWNER_REGIONS = 121;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 990716;
const RAW_END_IN_CODE = 994856;
const BODY_END_IN_CODE = 994855;
const RAW_CHARS = 4140;
const BODY_CHARS = 4139;
const BODY_UTF8 = 4139;
const BODY_LF = 68;
const BODY_SHA256 = '47e8f0104a10cd1f16190da6d52b46ce78df20dce2b510694d05206c2f4ce057';
const BODY_ENDING = '}\n';
const OPENING_LINE = 'function buildPortfolioTechnicalAlignmentDebug(ticker, pos, technical) {';
const OWNERS_EXPECTED = ['buildPortfolioTechnicalAlignmentDebug', 'mapLimit'];
const OWNER_COUNT = 2;
const FUNCTION_OWNERS = 2;
const OWNER_SIZES = [3405, 731];
const CODE_LINES = 64;
const TOTAL_LINES = 69;
const COMMENT_LINES = 5;
const OPENING_COMMENT_LINES = 0;
const NET_REDUCTION = 4062;
const RESIDUAL_MONOLITH = 1385816;
const INDEX_AFTER = 1500455;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 5;
const EDGE_SITES = [1136310, 1162463, 1162564, 1167182, 1167277];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 5;
const BY_CONSUMER = 1;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 2;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7690;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3322;
const CLEAN_CANDIDATES = 2059;
const ONE_CONSUMER_CANDIDATES = 5;
const ONE_CONSUMER_MULTI_SITE = 163;
const BEST_BY_CONSUMER_UNITS = 4139;
const RUNNER_UP_UNITS = 3690;
const RUNNER_UP_OWNERS = ['_journalMapAuditEnabled', '_journalMapAuditSummarize'];

// ── THE COHESION CRITERION, PROPOSED AND REFUTED ─────────────────────────────
// The two owners do not reference each other. The objection that followed —
// "this chain does not ship modules whose owners are strangers" — is measured
// in §5 rather than believed, and the measurement kills it.
const OWNERS_REFERENCE_EACH_OTHER = false;
const OWNER_GAP = '\n\n';
const CHAIN_LENGTH = 34;
const MULTI_OWNER_LAYERS = 27;
const CONNECTED_LAYERS = 10;
const DISCONNECTED_LAYERS = 17;
const SAME_SHAPE_LAYER = 'js/portfolio/portfolio-dxlink-greeks.js';
const SAME_SHAPE_OWNERS = 2;
const SAME_SHAPE_CONNECTED = 1;
const SAME_SHAPE_LAYERS = ['js/ui/tt-reconnect.js', 'js/services/journal-snapshot-prefetch.js', 'js/portfolio/portfolio-dxlink-greeks.js'];

// ── Where this layer would sit ───────────────────────────────────────────────
const NEWEST_CONTRACT = 'tests/portfolio-technical-merge-boundary-contract.test.js';
const SIZE_RANK_IF_CUT = 4;
const SMALLEST_LAYER_CHARS = 1761;
const LARGEST_LAYER_CHARS = 71811;
const PURE_ASCII_LAYERS = 1;
const UNDOCUMENTED_LAYERS = 1;

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

console.log('PORTFOLIO TECHNICAL ALIGNMENT DEBUG — TEMPORARY BOUNDARY AUDIT');
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

// AN OCCURRENCE INDEX, BUILT ONCE. §4 scores THREE THOUSAND candidate runs, and
// the obvious `profile` rescans the 1.4-million-unit monolith once per
// declaration name per run. Measured on the banner screen that shape cost 7
// MINUTES for 121 regions; at 3,391 runs it does not finish. Every position of
// every identifier is collected once instead, and a range query becomes two
// binary searches — 3 seconds for the whole screen. The tokenisation is the one
// `refSites` uses, an identifier not preceded by `.` or a word character, so
// the numbers are unchanged; §3 re-derives the recommendation's own profile
// with `refSites` directly, which is what says so.
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
  // INVERTED: the body's own identifiers are walked once, rather than asking all
  // 947 declarations whether they appear in it. Same answer, and it is what
  // makes three thousand candidates affordable.
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
// Does a range RUN anything while it loads? Both halves matter: a bare
// statement at module scope, and a read of a name at evaluation time.
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

// THE DISTINCTION THIS AUDIT ESTABLISHES. `profile` counts inbound reference
// SITES. Two calls from the same function is ONE consumer relationship, not
// two, and the nine-direction score cannot tell them apart. This derives the
// hosts of a range's inbound sites, so "how many consumers" can be measured
// rather than inferred from the score.
const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
function consumersOf(p) {
  return Array.from(new Set(p.sites.map((i) => (hostOf(i) || { name: '(TOP LEVEL)' }).name))).sort();
}
// The same nine directions with inbound collapsed to DISTINCT CONSUMERS. Every
// other direction is unchanged; only the inbound term is re-read.
const byConsumer = (p) => consumersOf(p).length + p.inWrites + p.inPropWrites +
  p.outWrites.length + p.deps.length + p.sib + p.mkp + p.gen + p.outGen + p.outModule;

// The coordinates are spelled _IN_CODE throughout, because this file also pins
// index.html offsets and the two are not the same number. Short aliases would
// read as pins the mutation spec has to cover, so the full names are used.
const REC = profileOf([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
const REGIONS = mergedRegions(MARKS);


// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, BASE_CHARS, 'index.html is BASE_CHARS units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…BASE_UTF8 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…BASE_LF line feeds');
eq(sha256(INDEX), BASE_SHA256, '…and this exact digest');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and runs CODE_CHARS units');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it carries TOP_LEVEL_DECLS top-level declarations');
eq(MARKS.length, TOP_LEVEL_BANNERS, '…under TOP_LEVEL_BANNERS top-level banners');
eq(REGIONS.length, OWNER_REGIONS, '…which merge to OWNER_REGIONS owner-carrying regions');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
  TEST_FILE_COUNT, 'the suite carries TEST_FILE_COUNT test files, this audit included');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The recommended region, its boundary and its seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  const nextOwner = DECLS.filter((d) => d.start > BY_NAME.get('mapLimit').start)[0].start;
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, nextOwner), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary on all four invariants');
}
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE).length, RAW_CHARS,
  '…and the raw span one more, for the separator');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY + '\n',
  '…which is exactly the body plus one newline — the relocation identity Phase 2 depends on');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'the body is BODY_UTF8 bytes');
eq(BODY_UTF8, BODY_CHARS, '…which EQUALS its unit count, so the region is pure ASCII');
ok(!/[^\x00-\x7F]/.test(BODY), '…confirmed on the bytes themselves, not inferred from the equality');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…with BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest, which Phase 2 must reproduce exactly');
eq(BODY.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
eq(BODY.slice(0, BODY.indexOf('\n')), OPENING_LINE, 'it opens on the first function declaration');
ok(RAW_AT_IN_CODE === 0 || CODE[RAW_AT_IN_CODE - 1] === '\n',
  '…at a line start, as a relocatable span must');
eq(CODE_AT + RAW_AT_IN_CODE, 1105251, 'in index.html coordinates the span starts here');

const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the region declares exactly these two names');
eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and both are functions');
eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…of 3,405 and 731 units');
{
  const lines = BODY.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…and NOT ONE of them is a comment: the region carries no documentation at all, which §8 '
    + 'counts over the chain rather than calling it bare');
}
// WHAT THE CUT WOULD ACHIEVE, derived rather than declared.
{
  const TAG = '<script src="./' + MODULE_REL_IF_CUT + '"></script>\n';
  eq(RAW_CHARS - TAG.length, NET_REDUCTION,
    'the span leaves and a tag arrives: index.html falls by NET_REDUCTION units net');
  eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, '…from 1,504,517 to INDEX_AFTER');
  eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH,
    '…and the inline monolith is left at RESIDUAL_MONOLITH units');
  ok(NET_REDUCTION < RAW_CHARS,
    'control — the reduction is NET: smaller than the span, because the tag costs bytes too');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'FIVE references reach in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at these exact sites');
ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'the pair depends on NOTHING the monolith declares — the list is empty, not short');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen, outboundModule: REC.outModule,
}, ZERO_DIRECTIONS,
'EIGHT of the nine directions measure zero: no write in, none through, none out, '
  + 'no markup either way, no sibling module, and nothing that already left');
eq(REC.nine, FULL_NINE, 'nine directions, total score 5 — five inbound sites and nothing else');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Five sites, ONE consumer — and a generic name that is not shared');
// ─────────────────────────────────────────────────────────────────────────────
eq(consumersOf(REC), EDGE_HOSTS, 'all five sites are hosted by ONE function');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
eq(byConsumer(REC), BY_CONSUMER, '…and read that way the whole coupling is BY_CONSUMER');
ok(FULL_NINE > BY_CONSUMER,
  '…where the raw score reads 5, so the #458 refinement is what makes this region visible');
{
  const h = BY_NAME.get(EDGE_HOSTS[0]);
  ok(h.start >= RAW_END_IN_CODE || h.end < RAW_AT_IN_CODE, 'the consumer is declared outside the region');
}
// `mapLimit` SOUNDS shared. It is not, and that is measured rather than trusted.
{
  const m = BY_NAME.get('mapLimit');
  const self = (i) => i >= m.start && i <= m.end;
  const outside = refSites(MASKED, 'mapLimit').filter((i) => !self(i));
  eq(outside.length, 1, '`mapLimit` has exactly ONE call site in the whole monolith');
  eq(outside, [EDGE_SITES[0]], '…and it is the first of this region\'s five inbound sites');
  eq(SIBLINGS.filter((s) => refSites(s.masked, 'mapLimit').length).map((s) => s.rel), [],
    '…no sibling module names it either');
  eq(refSites(STATIC_MARKUP, 'mapLimit').length, 0, '…nor does the static markup');
  // Its GENERALITY is unexercised, not shared: the monolith runs plenty of
  // unbounded parallelism that could have used it and does not.
  ok((MASKED.split('Promise.all').length - 1) > 20,
    'the monolith has more than twenty `Promise.all` sites that do NOT route through it, so the '
    + 'helper is general in shape and single-use in fact');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE FINDING: a cohesion criterion, proposed and then measured away');
// ─────────────────────────────────────────────────────────────────────────────
{
  const a = BY_NAME.get(OWNERS_EXPECTED[0]);
  const b = BY_NAME.get(OWNERS_EXPECTED[1]);
  const aBody = maskLiterals(CODE.slice(a.start, a.end + 1));
  const bBody = maskLiterals(CODE.slice(b.start, b.end + 1));
  const crossRefs = refSites(aBody, b.name).length + refSites(bBody, a.name).length;
  eq(crossRefs > 0, OWNERS_REFERENCE_EACH_OTHER,
    'the two owners do NOT reference each other: they are strangers sharing a file');
  eq(CODE.slice(a.end + 1, b.start), OWNER_GAP,
    '…separated by two blank lines and nothing else — no banner, no header, adjacent by accident');
  ok(b.start > a.end, 'control — they ARE adjacent, so the run is contiguous and takeable');
}
// THE OBJECTION, EXECUTED OVER THE WHOLE CHAIN RATHER THAN BELIEVED.
{
  const chainSrc = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = chainSrc.match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
    .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
    .map((l) => l.replace(/^'|',?$/g, ''));
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');

  let multi = 0, connected = 0;
  const disconnected = [];
  const shapes = new Map();
  for (const rel of CHAIN) {
    const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const decls = scanTopLevelDeclarations(s);
    if (decls.length < 2) continue;
    multi++;
    const names = decls.map((d) => d.name);
    const adj = new Map(names.map((n) => [n, new Set()]));
    for (const d of decls) {
      const body = maskLiterals(s.slice(d.start, d.end + 1));
      for (const other of names) {
        if (other === d.name) continue;
        if (refSites(body, other).length) { adj.get(d.name).add(other); adj.get(other).add(d.name); }
      }
    }
    const seen = new Set([names[0]]);
    const q = [names[0]];
    while (q.length) for (const n of adj.get(q.pop())) if (!seen.has(n)) { seen.add(n); q.push(n); }
    if (seen.size === names.length) connected++; else disconnected.push(rel);
    shapes.set(rel, { owners: names.length, connected: seen.size });
  }
  eq(multi, MULTI_OWNER_LAYERS, 'MULTI_OWNER_LAYERS of the chain ship more than one owner');
  eq(connected, CONNECTED_LAYERS, '…and only CONNECTED_LAYERS of those have owners that all connect');
  eq(disconnected.length, DISCONNECTED_LAYERS,
    'DISCONNECTED_LAYERS already ship owners that do NOT all reference one another');
  ok(DISCONNECTED_LAYERS > CONNECTED_LAYERS,
    'SO BUNDLING STRANGERS IS THE MAJORITY CASE, 17 to 10 — the objection that it would be a '
    + 'first is false, and the criterion is retired here rather than applied');
  // NOT merely "some disconnected layer exists": a layer with this region's
  // EXACT shape. Membership in the disconnected set is satisfied by layers of
  // any shape, so the shape itself is what is asserted.
  ok(disconnected.indexOf(SAME_SHAPE_LAYER) >= 0, '…SAME_SHAPE_LAYER among them…');
  eq(shapes.get(SAME_SHAPE_LAYER), { owners: SAME_SHAPE_OWNERS, connected: SAME_SHAPE_CONNECTED },
    '…and it has this region\'s EXACT shape: two owners, one of them connected');
  eq({ owners: OWNER_COUNT, connected: 1 },
    { owners: SAME_SHAPE_OWNERS, connected: SAME_SHAPE_CONNECTED },
    '…which is the shape this cut would ship, so the precedent is the same shape and not '
    + 'merely the same category');
  eq(disconnected.filter((rel) => {
    const sh = shapes.get(rel);
    return sh.owners === SAME_SHAPE_OWNERS && sh.connected === SAME_SHAPE_CONNECTED;
  }), SAME_SHAPE_LAYERS,
  '…and these are ALL the shipped layers of that exact shape, named rather than counted');
  eq(multi + CHAIN.filter((rel) =>
    scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length < 2).length,
  CHAIN_LENGTH, 'control — every layer is counted once, as multi-owner or as single-owner');
}
// WHAT THE RETIRED CRITERION WOULD HAVE COST.
{
  const a = BY_NAME.get(OWNERS_EXPECTED[0]);
  const soloEnd = snapBodyEnd(CODE, RAW_AT_IN_CODE, BY_NAME.get('mapLimit').start);
  eq(assertSeam(CODE, RAW_AT_IN_CODE, soloEnd), BY_NAME.get('mapLimit').start,
    'the single-owner cut is a LEGAL boundary too, so the choice was real');
  const solo = profileOf([RAW_AT_IN_CODE, BY_NAME.get('mapLimit').start]);
  eq(byConsumer(solo), BY_CONSUMER, '…with the same consumer coupling of 1');
  eq(solo.deps, [], '…and the same empty dependency list');
  ok(soloEnd - RAW_AT_IN_CODE < BODY_CHARS,
    'but it is SMALLER: applying the unmeasured criterion would have left units behind');
  eq(BODY_CHARS - (soloEnd - RAW_AT_IN_CODE), OWNER_SIZES[1] + 2,
    '…exactly `mapLimit` and the two newlines before it');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen that found it, and both readings of the score');
// ─────────────────────────────────────────────────────────────────────────────
const candidateRuns = [];
{
  const seen = new Set();
  let rawRuns = 0, seamRejected = 0;
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        rawRuns++;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo || be - lo < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo, be); } catch (e) { seamRejected++; continue; }
        const key = lo + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        candidateRuns.push({ lo, hi: be, units: be - lo });
      }
    }
  }
  eq(rawRuns, RAW_RUNS, 'the regions yield RAW_RUNS contiguous owner runs');
  eq(seamRejected, SEAM_REJECTED, '…of which SEAM_REJECTED are refused by assertSeam');
  eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct extractable candidates');
}
for (const c of candidateRuns) { c.p = profileOf([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, 'CLEAN_CANDIDATES of them run nothing at load');
  ok(candidateRuns.length - clean.length > 0,
    '…and the rest DO, so the evaluation-time rule still discriminates');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE clean candidates have ONE consumer and more than one site, so the '
    + '#458 refinement still separates about a twelfth of the set');
  const oneConsumerOnly = clean.filter((c) => byConsumer(c.p) === 1);
  eq(oneConsumerOnly.length, ONE_CONSUMER_CANDIDATES,
    'ONE_CONSUMER_CANDIDATES have a coupling that is exactly one consumer and nothing else');
  const best = oneConsumerOnly.slice().sort((a, b) => b.units - a.units)[0];
  eq([best.lo, best.hi], [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    '…and the LARGEST of them is this recommendation');
  eq(best.units, BEST_BY_CONSUMER_UNITS, '…at BEST_BY_CONSUMER_UNITS units');
  const second = oneConsumerOnly.slice().sort((a, b) => b.units - a.units)[1];
  eq(second.units, RUNNER_UP_UNITS, 'the runner-up at equal coupling is RUNNER_UP_UNITS units');
  eq(second.p.names, RUNNER_UP_OWNERS,
    '…a different region entirely, pinned by its WHOLE owner list: membership alone would be '
    + 'satisfied by either of its two names');
  ok(best.units > second.units,
    'so among candidates of EQUAL coupling the choice is size, which is the only tie-break left');
  // This region is one of the set the two readings disagree about.
  ok(REC.nine > byConsumer(REC), 'this region reads 5 raw and 1 by consumer…');
  eq(clean.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 1,
    '…and it is in the clean set exactly once');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, does nothing at load, and both owners run');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'it loads in a COMPLETELY empty VM, defining both globals');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
}
{
  const watched = [];
  const ctx = {
    fetch: () => { watched.push('fetch'); },
    setTimeout: () => { watched.push('setTimeout'); },
    setInterval: () => { watched.push('setInterval'); },
    localStorage: { getItem: () => { watched.push('localStorage.getItem'); return null; } },
    document: { getElementById: () => { watched.push('doc.getElementById'); return null; },
      addEventListener: () => { watched.push('doc.addEventListener'); } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
    console: { log() {}, warn() {}, error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(watched, [], 'loading it performs no fetch, starts no timer, reads no storage and binds no listener');
  const ctl = [];
  const ctx2 = { setTimeout: () => { ctl.push('setTimeout'); } };
  vm.createContext(ctx2);
  vm.runInContext('setTimeout(function(){}, 0);', ctx2);
  eq(ctl, ['setTimeout'], 'control — the same watcher records a call when there is one to record');
}
// BOTH OWNERS ARE CALLED. A pair that loads bare but throws on its own shape
// would satisfy every clause above, and the strangers are exercised separately
// because nothing in the file connects them. `mapLimit` is async, so its call
// runs in the deferred block at the end of this file.
const VM_CTX = { console: { log() {}, warn() {}, error() {} }, Promise, Array, Math, String, JSON };
vm.createContext(VM_CTX);
vm.runInContext(BODY, VM_CTX);
{
  const debug = VM_CTX.buildPortfolioTechnicalAlignmentDebug('SPY', {}, null);
  eq(debug.ticker, 'SPY', 'the alignment debug builder returns a record for the ticker it was given');
  // Arrays built inside the VM carry its realm's prototype, so deepStrictEqual
  // would reject two structurally identical lists; they are joined instead.
  eq(debug.missingFields.join(','), 'rsi14,sma20,sma30,rsi14_4h,sma20_4h,sma30_4h',
    '…and handed no technical payload it names all SIX indicator fields as missing, which is '
    + 'the work the function exists to do');
  eq(debug.source, 'BACKEND_TECHNICAL_REFRESH', '…tagging the record with its source');
  ok(Array.isArray(debug.reasons), '…with a reasons array, which is the shape its consumer reads');
  eq(typeof VM_CTX.mapLimit, 'function', 'and mapLimit is defined — it is called below, after the rest');
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
    '…and NEITHER owner is among them: both are live code with a live consumer');
}
{
  const chainSrc = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = chainSrc.match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
    .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
    .map((l) => l.replace(/^'|',?$/g, ''));
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT of thirty-five by size: neither end of the chain');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < LARGEST_LAYER_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');

  // "PURE ASCII" AND "NO DOCUMENTATION" ARE BOTH SUPERLATIVES WAITING TO BE
  // WRITTEN WRONG, so each is a count over the chain instead of an adjective.
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'exactly PURE_ASCII_LAYERS shipped layer is pure ASCII today');
  ok(!/[^\x00-\x7F]/.test(BODY), '…and this region would be the SECOND, not the first');
  eq(sources.filter((s) => s.split('\n').filter((l) => /^\s*\/\//.test(l)).length === 0).length,
    UNDOCUMENTED_LAYERS, 'exactly UNDOCUMENTED_LAYERS shipped layer carries no comment line');
  eq(BODY.split('\n').filter((l) => /^\s*\/\//.test(l)).length, 0,
    '…and this region would be the SECOND of those too, which is a position, not a boast');
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
  eq(sha256(git(['show', BASE_SHA + ':index.html'])), BASE_SHA256, '…with this digest');
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
  {
    ok(changed.indexOf(RETIREMENT.spec) >= 0, 'the retired mutation spec is part of the change');
    ok(!fs.existsSync(path.join(ROOT, RETIREMENT.spec)), '…and is gone from the tree');
    const mod = { exports: {} };
    new Function('module', 'exports', git(['show', BASE_SHA + ':' + RETIREMENT.spec]))(mod, mod.exports);
    eq(mod.exports.mutants.length, RETIREMENT.mutants, '…having carried seventy-six mutants');
    ok(fs.existsSync(path.join(ROOT, RETIREMENT.contract)), 'the contract it targeted still ships');
    const CALL = /\b(?:eq|ok|throwsWith|throws|deepStrictEqual|strictEqual)\s*\(/g;
    const before = git(['show', BASE_SHA + ':' + RETIREMENT.contract]);
    const after = fs.readFileSync(path.join(ROOT, RETIREMENT.contract), 'utf8');
    eq((after.match(CALL) || []).length, (before.match(CALL) || []).length,
      '…with exactly as many assertions as before: the spec retired, not the contract');
    ok(/ok\(!fs\.existsSync\(path\.join\(ROOT, CONTRACT_SPEC_REL\)\)/.test(after),
      '…and its spec-existence assertion is now its NEGATION, so the retirement is executed');

    const auditSpec = require('./mutation-specs/portfolio-technical-alignment-debug-audit.spec.js');
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared BASE_DECLARED_MUTANTS mutants');
    eq(declaredNow, BASE_DECLARED_MUTANTS - RETIREMENT.mutants + auditSpec.mutants.length,
      '…and this change declares exactly that, less the retirement, plus this audit\'s spec');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow, '…and the declared total is under it');
    eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// `mapLimit` is async, so the last two assertions run here, after everything
// above has already passed. The summary prints from inside, so a rejected
// promise cannot leave the file looking green.
// ─────────────────────────────────────────────────────────────────────────────
Promise.resolve(VM_CTX.mapLimit([1, 2, 3], 2, async (n) => n * 2)).then((out) => {
  eq(out.join(','), '2,4,6', 'mapLimit maps every item through the worker, in order');
  return VM_CTX.mapLimit([], 4, async () => 1);
}).then((empty) => {
  eq(empty.length, 0, '…and returns an empty array for empty input rather than throwing');
  console.log('\n' + pass + ' assertions passed.');
  console.log('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_AUDIT_OK');
}).catch((e) => { console.error(e); process.exit(1); });
