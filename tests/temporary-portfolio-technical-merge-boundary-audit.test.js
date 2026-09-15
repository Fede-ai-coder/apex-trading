'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TECHNICAL MERGE — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [981453,987286) in monolith coordinates — 5,833 units, ONE
// function: `_mergeBatchInto`. ONE consumer, ZERO monolith dependencies, and
// zero in every other direction. It loads in a completely empty VM and runs
// nothing while it loads.
//
// ── THIS AUDIT'S FINDING: THE SCORE COUNTS SITES, NOT RELATIONSHIPS ─────────
//
// The nine-direction score counts inbound reference SITES. That is the wrong
// unit for the question the score is asked, and this cycle is where it changes
// the answer.
//
// `fetchPortfolioTechnicalRefresh` calls this function twice:
//
//     _mergeBatchInto(merged, result.data, ['1D']);
//     _mergeBatchInto(merged, result.data, ['4H']);
//
// One caller. One relationship. The two sites differ by a literal argument.
// The score reads 2, and by that reading this region ranks below a 2,710-unit
// region whose single caller calls it once — even though both have exactly one
// consumer, both have no dependencies, and both measure zero in the other
// seven directions.
//
// SO THE AUDIT MEASURES BOTH READINGS OVER THE WHOLE CANDIDATE SET, not on the
// two regions that prompted the question. Of the 2,087 candidates that run
// nothing at load, SIX have a coupling that is exactly one consumer and nothing
// else. Ranked by the raw score the winner is 2,710 units of body; ranked by
// distinct consumers it is 5,832 — 2.15 times the bytes, for the same one
// relationship. (The raw span this cut removes is 5,833: one more, for the
// structural separator. Both rankings are stated in body units so they compare.)
// §5 executes both rankings and asserts that the two winners differ, because a
// refinement that changed no decision would not be worth the file.
//
// THE DISTINCTION IS NOT RARE. 168 of the 2,087 clean candidates have one
// consumer and more than one site — one in twelve. So this is not a special
// pleading for one region: the two readings disagree about a twelfth of the
// candidate set, and §5 counts that rather than asserting it.
//
// WHAT THE REFINEMENT DOES NOT DO. It does not relax anything. Every other
// direction is counted exactly as before, the evaluation-time rule is
// unchanged, and a region with two genuinely different callers still scores
// two. The only term that is re-read is the inbound one, and it is re-read in
// the direction that makes the metric HARDER to game: a region cannot improve
// its rank by having its caller call it fewer times.
//
// ── THE COST OF THE OLD READING, STATED PLAINLY ─────────────────────────────
//
// Three cycles of taking the raw-score winner produced 6,502 units, then 3,695,
// then — had this cycle followed it — 2,710. The rule "coupling, not size" was
// written to stop a big messy region being taken over a small clean one. It was
// not written to prefer the smallest of several equally clean ones, and by
// treating repeated calls from one consumer as extra coupling it had begun to
// do exactly that. This cycle takes 5,832 units of body instead of 2,710
// without weakening a single criterion.
//
// ── WHAT THIS CANDIDATE IS ──────────────────────────────────────────────────
//
// `_mergeBatchInto(merged, data, timeframes)` folds one batch of a portfolio
// technical refresh into an accumulator. It takes everything it touches as a
// parameter — the accumulator, the batch, the timeframes — so it names no
// monolith declaration at all: MONOLITH_DEPENDENCIES is EMPTY, not short. Ten
// shipped contracts pin a non-empty list, so that is the exception and §4
// counts the set rather than inferring it.
//
// It is NOT the smallest layer, NOT the largest, and would rank ninth of
// thirty-four by size. It carries four comment lines in 116, which ranks it
// FOURTH-LEAST-DOCUMENTED of thirty-four — near the bare end but not at it,
// and §8 executes that rank rather than calling it "sparse". Both positions are
// stated as measured ranks rather than superlatives, because this programme has
// written "the first layer that…" from a partial look four times and been
// wrong every time.
//
// ── THE RETIREMENT ──────────────────────────────────────────────────────────
//
// One mutation spec retires per cycle, in chain order. This cycle: layer #31,
// swing weekly candles, 74 mutants — the same two-layer spacing #456 used when
// it retired layer #30 with the chain at thirty-two. Its CONTRACT still runs on
// every push with every assertion intact, which §10 proves by counting them
// against the base.
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
const BASE_SHA = '6916465';
const BASE_CHARS = 1510282;
const BASE_UTF8 = 1539098;
const BASE_LF = 26165;
const BASE_SHA256 = '43fdeeff33a11e3b3028bb94dca447f3f711beb8438dd74f3d96928075da90db';
const LOCAL_SCRIPTS = 77;
const BASE_TEST_FILE_COUNT = 161;
const TEST_FILE_COUNT = 162;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-technical-merge-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-merge-audit.spec.js';
const RATCHETED_CONTRACTS = 23;
const RETIREMENT = {
  contract: 'tests/swing-weekly-candles-boundary-contract.test.js',
  spec: 'tests/mutation-specs/swing-weekly-candles-contract.spec.js',
  mutants: 74,
};
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 231;
const MUTANT_BUDGET = 250;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114467;
const CODE_CHARS = 1395789;
const TOP_LEVEL_DECLS = 946;
const TOP_LEVEL_BANNERS = 223;
const OWNER_REGIONS = 121;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 981453;
const RAW_END = 987286;
const BODY_END = 987285;
const RAW_CHARS = 5833;
const BODY_CHARS = 5832;
const BODY_UTF8 = 5834;
const BODY_LF = 115;
const BODY_SHA256 = 'ef00b7311b032154426e10f2787a699d9b3b6082350171be51a7df6cc76c134b';
const BODY_ENDING = '}\n';
const OPENING_LINE = 'function _mergeBatchInto(merged, data, timeframes) {';
const OWNERS_EXPECTED = ['_mergeBatchInto'];
const OWNER_COUNT = 1;
const FUNCTION_OWNERS = 1;
const OWNER_SIZES = [5831];
const CODE_LINES = 111;
const TOTAL_LINES = 116;
const COMMENT_LINES = 5;
const OPENING_COMMENT_LINES = 4;
const MODULE_REL_IF_CUT = 'js/portfolio/portfolio-technical-merge.js';
const NET_REDUCTION = 5765;
const RESIDUAL_MONOLITH = 1389956;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 2;
const EDGE_SITES = [989715, 992501];
const EDGE_HOSTS = ['fetchPortfolioTechnicalRefresh'];
const DISTINCT_CONSUMERS = 1;
const CALL_LINES = [
  "_mergeBatchInto(merged, result.data, ['1D']);",
  "_mergeBatchInto(merged, result.data, ['4H']);",
];
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 2;
const BY_CONSUMER = 1;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 1;
const PARAMETERS = ['merged', 'data', 'timeframes'];

// ── The owner-run screen ─────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7724;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3356;
const CLEAN_CANDIDATES = 2087;
// The two readings, and what each one picks.
const ONE_CONSUMER_CANDIDATES = 6;
// The adjacent two-owner run — the cut that would absorb the single consumer.
const PAIR_UNITS = 15095;
const PAIR_SITES = 2;
const PAIR_CONSUMERS = ['refreshPositionsLive'];
const PAIR_DEPENDENCIES = ['S', '_fetchPortfolioTechnicalBatch', '_portfolioTechnicalDebugEnabled'];
const PAIR_BY_CONSUMER = 5;
const ONE_CONSUMER_MULTI_SITE = 168;
const BEST_BY_NINE_UNITS = 2710;
const BEST_BY_NINE_OWNER = '_validateBackendFullRefreshPayload';
const BEST_BY_CONSUMER_UNITS = 5832;
const BEST_BY_NINE_SITES = 1;
const BEST_BY_NINE_SCORE = 1;

// ── Reachability ─────────────────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

// ── The chain it would join ──────────────────────────────────────────────────
const NEWEST_CONTRACT = 'tests/backend-positions-aggregate-boundary-contract.test.js';
const CHAIN_LENGTH = 33;
const SIZE_RANK_IF_CUT = 9;
const LARGEST_LAYER_CHARS = 71811;
const SMALLEST_LAYER_CHARS = 1761;
const LAYERS_WITH_A_DEPENDENCY = 10;
const CONTRACTS_PINNING_NINE = 3;
const PINNED_NINE_SCORES = [1, 7, 8];
const DOC_RANK_IF_CUT = 4;

// ── The retirement's place in the chain ──────────────────────────────────────
const RETIRING_LAYER = 'js/services/swing-weekly-candles.js';
const PREVIOUS_RETIRED_LAYER = 'js/services/journal-snapshot-helpers.js';
const RETIREMENT_GAP = 2;
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

console.log('PORTFOLIO TECHNICAL MERGE — TEMPORARY BOUNDARY AUDIT');
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

const REC = profileOf([RAW_AT, RAW_END]);
const BODY = CODE.slice(RAW_AT, BODY_END);
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
  const nextOwner = DECLS.filter((d) => d.start > RAW_AT)[0].start;
  eq(nextOwner, RAW_END, 'the next top-level owner begins exactly where the raw span ends');
  eq(snapBodyEnd(CODE, RAW_AT, nextOwner), BODY_END,
    '…and snapping that chosen end back to the last line of code lands on BODY_END');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END,
    'assertSeam accepts the boundary on all four invariants');
}
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(CODE.slice(RAW_AT, RAW_END).length, RAW_CHARS, '…and the raw span one more, for the separator');
eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n',
  '…which is exactly the body plus one newline — the relocation identity Phase 2 depends on');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'the body is BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…with BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest, which Phase 2 must reproduce exactly');
eq(BODY.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
eq(BODY.slice(0, BODY.indexOf('\n')), OPENING_LINE, 'it opens on the function declaration itself');
ok(RAW_AT === 0 || CODE[RAW_AT - 1] === '\n', '…at a line start, as a relocatable span must');
eq(CODE_AT + RAW_AT, 1095920, 'in index.html coordinates the span starts here');

const OWNERS = DECLS.filter((d) => d.start >= RAW_AT && d.end < RAW_END);
eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the region declares exactly one name at top level');
eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of it');
eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and it is a function');
eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…of 5,831 units');
{
  const lines = BODY.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment: it is neither the documented end of the '
    + 'chain nor the bare end, and §8 places it rather than calling it either');
}
// WHAT THE CUT WOULD ACHIEVE, derived rather than declared — the pin that
// shipped unread twice before is asserted here.
{
  const TAG = '<script src="./' + MODULE_REL_IF_CUT + '"></script>\n';
  eq(RAW_CHARS - TAG.length, NET_REDUCTION,
    'the span leaves and a tag arrives: index.html falls by NET_REDUCTION units net');
  eq(BASE_CHARS - NET_REDUCTION, 1504517, '…from 1,510,282 to 1,504,517');
  eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH,
    '…and the inline monolith is left at RESIDUAL_MONOLITH units');
  ok(NET_REDUCTION < RAW_CHARS,
    'control — the reduction is NET: smaller than the span, because the tag costs bytes too');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. What it is: everything it touches arrives as a parameter');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(/^function\s+_mergeBatchInto\s*\(([^)]*)\)/.exec(BODY)[1].split(',').map((p) => p.trim()),
    PARAMETERS, 'it takes three parameters: the accumulator, the batch, the timeframes');
  const bound = locallyBound(BODY);
  for (const p of PARAMETERS) ok(bound.has(p), p + ' is locally bound, so it is no inbound dependency');
  const masked = maskLiterals(BODY);
  eq(refSites(masked, 'S').length, 0, 'it never names `S`, so the #424/#455 rule does not arise');
  eq(propertyWriteBases(masked).filter((b) => BY_NAME.has(b)), [],
    'it writes no property through any monolith declaration — every write goes through `merged`, '
    + 'which is a parameter');
  ok(propertyWriteBases(masked).indexOf('merged') >= 0,
    'control — it DOES write properties, through the accumulator it was handed, so the clause '
    + 'above is a measurement and not an absence of writes');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Coupling in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'TWO references reach in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at these exact sites');
ok(REC.sites.every(insideFunction), '…both inside a function body, so neither runs at load');
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it depends on NOTHING the monolith declares — the list is empty, not short');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen, outboundModule: REC.outModule,
}, ZERO_DIRECTIONS,
'EIGHT of the nine directions measure zero: no write in, none through, none out, '
  + 'no markup either way, no sibling module, and nothing that already left');
eq(REC.nine, FULL_NINE, 'nine directions, total score 2 — two inbound sites and nothing else');
// A runtime dependency is the ordinary case, counted over the set.
{
  const withDep = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))
    .filter((src) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    });
  eq(withDep.length, LAYERS_WITH_A_DEPENDENCY,
    'TEN shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, so having NONE is the '
    + 'exception and is recorded rather than assumed');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The finding: the score counts SITES, the coupling is CONSUMERS');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(consumersOf(REC), EDGE_HOSTS, 'both sites are hosted by ONE function');
  eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
  eq(byConsumer(REC), BY_CONSUMER, '…and read that way the whole coupling is BY_CONSUMER');
  ok(FULL_NINE > BY_CONSUMER,
    '…where the raw score reads higher, which is the entire distinction this audit makes');
  for (const n of EDGE_HOSTS) {
    ok(BY_NAME.has(n), n + ' is a monolith declaration…');
    ok(BY_NAME.get(n).start >= RAW_END || BY_NAME.get(n).end < RAW_AT, '…declared outside the region');
  }
  eq(BY_NAME.get(EDGE_HOSTS[0]).start, RAW_END,
    '…and it begins exactly where the region ends: the single consumer is the NEXT top-level '
    + 'owner, adjacent to the cut');
  // WHICH RAISES THE OBVIOUS QUESTION — why not take the consumer too, and have
  // no inbound edge at all? Because the consumer brings its own coupling. The
  // pair is measured rather than dismissed.
  {
    const after = DECLS.filter((d) => d.start > BY_NAME.get(EDGE_HOSTS[0]).start)[0];
    const pairEnd = snapBodyEnd(CODE, RAW_AT, after.start);
    eq(assertSeam(CODE, RAW_AT, pairEnd), after.start,
      'the two-owner run is a LEGAL boundary, so taking both was genuinely available');
    eq(pairEnd - RAW_AT, PAIR_UNITS, '…and would move PAIR_UNITS units, 2.6 times as many');
    const pair = profileOf([RAW_AT, pairEnd]);
    eq(pair.sites.filter((i) => EDGE_SITES.indexOf(i) >= 0), [],
      '…with THIS region\'s two inbound sites gone, because they become internal calls');
    eq(pair.sites.length, PAIR_SITES,
      '…and PAIR_SITES others in their place, reaching into the consumer instead');
    eq(consumersOf(pair), PAIR_CONSUMERS, '…and one consumer of its own inherited from the pair');
    eq(pair.deps, PAIR_DEPENDENCIES,
      '…but THREE monolith dependencies where this region has none, `S` among them');
    eq(byConsumer(pair), PAIR_BY_CONSUMER,
      'so the pair reads PAIR_BY_CONSUMER against this region\'s 1: absorbing the consumer '
      + 'trades one relationship for five, which is why the cut stops at one owner');
    ok(runsNothingAtLoad(loadTimeProfile(RAW_AT, pairEnd)),
      'control — the pair was NOT declined for touching anything at load; it runs nothing '
      + 'either, so the only thing separating them is the coupling just measured');
  }
  // THE TWO CALLS, QUOTED FROM THE SOURCE. The claim is that they differ by a
  // literal argument and nothing else, so the lines themselves are asserted.
  const lineAt = (i) => CODE.slice(CODE.lastIndexOf('\n', i) + 1, CODE.indexOf('\n', i)).trim();
  eq(EDGE_SITES.map(lineAt), CALL_LINES,
    'the two calls are the same call with a different timeframe literal');
  const [a, b] = CALL_LINES;
  eq(a.replace("'1D'", 'X'), b.replace("'4H'", 'X'),
    '…identical once the literal is masked: one relationship, called twice');
}
// BOTH READINGS, RUN OVER THE WHOLE CANDIDATE SET.
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

  // THE DISTINCTION IS SYSTEMATIC, not special pleading for this region.
  const multiSiteOneConsumer = clean.filter(
    (c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1);
  eq(multiSiteOneConsumer.length, ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE clean candidates have ONE consumer and more than one site — the '
    + 'two readings disagree about a sixth of the set, not about one region');

  // THE SIX WHOSE ENTIRE COUPLING IS ONE CONSUMER.
  const oneConsumerOnly = clean.filter((c) => byConsumer(c.p) === 1);
  eq(oneConsumerOnly.length, ONE_CONSUMER_CANDIDATES,
    'ONE_CONSUMER_CANDIDATES candidates have a coupling that is exactly one consumer and nothing else');
  ok(oneConsumerOnly.some((c) => c.lo === RAW_AT && c.hi === BODY_END),
    '…the recommendation among them');

  // AND THE TWO RANKINGS DISAGREE. A refinement that changed no decision would
  // not be worth a file, so the audit asserts that it changes THIS one.
  const byNine = clean.slice().sort((a, b) => a.p.nine - b.p.nine || b.units - a.units)[0];
  const byCons = clean.slice().sort((a, b) => byConsumer(a.p) - byConsumer(b.p) || b.units - a.units)[0];
  eq(byNine.units, BEST_BY_NINE_UNITS, 'ranked by the raw score the winner is BEST_BY_NINE_UNITS units');
  eq(byNine.p.names[0], BEST_BY_NINE_OWNER, '…and it is BEST_BY_NINE_OWNER');
  // The header says that region's single caller calls it ONCE, that it has no
  // dependencies, and that it measures zero in the other seven directions. All
  // three are what makes the comparison fair, so all three are executed.
  eq(byNine.p.sites.length, BEST_BY_NINE_SITES, '…reached by BEST_BY_NINE_SITES site: called once');
  eq(byNine.p.deps, [], '…depending on nothing the monolith declares, as this region does');
  eq(byNine.p.nine, BEST_BY_NINE_SCORE,
    '…and scoring BEST_BY_NINE_SCORE in all nine, which is only possible with the other seven '
    + 'directions at zero — so the two candidates differ in NO criterion but size');
  eq(byCons.units, BEST_BY_CONSUMER_UNITS, 'ranked by consumers it is BEST_BY_CONSUMER_UNITS units');
  eq([byCons.lo, byCons.hi], [RAW_AT, BODY_END], '…and that winner is this recommendation');
  ok(byNine.lo !== byCons.lo,
    'THE TWO RANKINGS PICK DIFFERENT REGIONS — which is what makes the distinction worth a cycle');
  ok(byCons.units > byNine.units * 2,
    '…and the consumer reading takes more than twice the bytes for the same one relationship');
  // The refinement does not relax anything: the loser still has one consumer too.
  eq(consumersOf(byNine.p).length, 1,
    'control — the raw-score winner also has exactly one consumer, so the two differ on SIZE '
    + 'at equal coupling, not on coupling');
}
// THE HEADER'S CLAIM ABOUT GAMING, EXECUTED. "A region cannot improve its rank
// by having its caller call it fewer times" is a property of `byConsumer`, so it
// is driven on this region's own profile with one site dropped.
{
  const oneSiteFewer = { ...REC, sites: REC.sites.slice(0, 1), inbound: 1, nine: REC.nine - 1 };
  ok(oneSiteFewer.nine < REC.nine,
    'dropping one call site DOES lower the raw score, which is the behaviour objected to');
  eq(byConsumer(oneSiteFewer), byConsumer(REC),
    '…and leaves the consumer reading exactly where it was: the rank cannot be bought by '
    + 'calling less often');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT, BODY_END);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED, 'it loads in a COMPLETELY empty VM, defining one global');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
  eq(typeof ctx._mergeBatchInto, 'function', '…and the function its single consumer calls is there');
}
{
  const watched = [];
  const ctx = {
    fetch: () => { watched.push('fetch'); },
    setTimeout: () => { watched.push('setTimeout'); },
    setInterval: () => { watched.push('setInterval'); },
    localStorage: { getItem: () => { watched.push('localStorage.getItem'); return null; },
      setItem: () => { watched.push('localStorage.setItem'); } },
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
// IT ALSO RUNS. A function that loads bare but throws on its own shape would
// pass every clause above, so it is called on a minimal input.
{
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  // The accumulator is built HERE and the merged objects inside it are built in
  // the VM's realm, so their prototypes differ and deepStrictEqual would reject
  // two structurally identical objects. Keys and values are compared instead.
  const merged = {};
  ctx._mergeBatchInto(merged, { dataSourceByTicker: { SPY: 'backend' } }, ['1D']);
  eq(Object.keys(merged.dataSourceByTicker), ['SPY'],
    'called with one batch it folds that batch into the accumulator it was handed');
  eq(merged.dataSourceByTicker.SPY, 'backend', '…carrying the value through');
  eq(typeof merged._diagSeenBySymbolTf, 'object',
    '…and seeds its own de-duplication map on the accumulator, so it really ran');
  ctx._mergeBatchInto(merged, null, ['4H']);
  eq(Object.keys(merged.dataSourceByTicker), ['SPY'],
    '…and called with no data it leaves the accumulator alone, which is why the second call '
    + 'at a different timeframe is safe');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Reachability at this base');
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
    '…and the recommendation is not among them: it is live code with a live consumer');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Where this layer would sit, stated as position rather than superlative');
// ─────────────────────────────────────────────────────────────────────────────
{
  const chainSrc = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const m = chainSrc.match(/^const CHAIN = \[([\s\S]*?)^\];/m);
  ok(m, 'the chain is read from the newest shipped contract, not retyped here');
  const CHAIN = m[1].split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith("'")).map((l) => l.replace(/^'|',?$/g, ''));
  CHAIN.push('js/portfolio/backend-positions-aggregate.js');
  eq(CHAIN.length, CHAIN_LENGTH, '…and it is CHAIN_LENGTH layers long');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');

  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length)
    .sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT of thirty-four by size: neither the smallest nor '
    + 'the largest, which is the whole claim made about its size');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < LARGEST_LAYER_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');

  // AND THE SAME TREATMENT FOR HOW DOCUMENTED IT IS. "Sparse" is a superlative
  // waiting to be written wrong, so it is a rank over the whole chain instead.
  const commentRatio = (src) => {
    const lines = src.split('\n');
    return lines.filter((l) => /^\s*\/\//.test(l)).length / lines.length;
  };
  const ratios = CHAIN.map((rel) => commentRatio(fs.readFileSync(path.join(ROOT, rel), 'utf8')))
    .concat([commentRatio(BODY)]).sort((a, b) => a - b);
  eq(ratios.length, CHAIN_LENGTH + 1, 'the chain plus this candidate is thirty-four files');
  eq(ratios.indexOf(commentRatio(BODY)) + 1, DOC_RANK_IF_CUT,
    'by comment-line share it would rank DOC_RANK_IF_CUT of thirty-four: near the bare end, '
    + 'and NOT at it — which is the whole claim made about its documentation');
  ok(ratios[0] < commentRatio(BODY),
    '…a layer with a smaller share exists, so "least documented" would have been false');
  ok(ratios[ratios.length - 1] > commentRatio(BODY),
    '…and one with a larger share too');

  // THE SCORE COMPARISON IS SCOPED TO WHAT IS PINNED, not to the whole chain.
  const pinned = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8').match(/^const FULL_NINE = (\d+);/m))
    .filter(Boolean).map((x) => Number(x[1])).sort((a, b) => a - b);
  eq(pinned.length, CONTRACTS_PINNING_NINE, 'only THREE shipped contracts pin a nine-direction score');
  eq(pinned, PINNED_NINE_SCORES, '…and those three are 1, 7 and 8');
  ok(FULL_NINE > pinned[0],
    '…so this region does NOT have the lowest raw score even among those three, and the audit '
    + 'says so rather than quietly ranking on the reading that flatters it');
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
    eq(mod.exports.mutants.length, RETIREMENT.mutants, '…having carried seventy-four mutants');
    ok(fs.existsSync(path.join(ROOT, RETIREMENT.contract)), 'the contract it targeted still ships');
    const CALL = /\b(?:eq|ok|throwsWith|throws|deepStrictEqual|strictEqual)\s*\(/g;
    const before = git(['show', BASE_SHA + ':' + RETIREMENT.contract]);
    const after = fs.readFileSync(path.join(ROOT, RETIREMENT.contract), 'utf8');
    eq((after.match(CALL) || []).length, (before.match(CALL) || []).length,
      '…with exactly as many assertions as before: the spec retired, not the contract');
    ok(/ok\(!fs\.existsSync\(path\.join\(ROOT, CONTRACT_SPEC_REL\)\)/.test(after),
      '…and its spec-existence assertion is now its NEGATION, so the retirement is executed');

    // THE SPACING, executed rather than remembered. The header says this is the
    // same distance from the chain's head that #456 retired at; that is a claim
    // about two cycles, and it is read off the chain rather than recalled.
    const chainSrc = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
    const CHAIN = chainSrc.match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
      .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
      .map((l) => l.replace(/^'|',?$/g, ''))
      .concat(['js/portfolio/backend-positions-aggregate.js']);
    eq(CHAIN.length - (CHAIN.indexOf(RETIRING_LAYER) + 1), RETIREMENT_GAP,
      'this cycle retires the layer RETIREMENT_GAP places from the head of a chain of ' + CHAIN.length);
    eq((CHAIN.length - 1) - (CHAIN.indexOf(PREVIOUS_RETIRED_LAYER) + 1), RETIREMENT_GAP,
      '…and #456 retired at the same distance from the head of the chain as it stood then: the '
      + 'spacing is IDENTICAL, not merely similar');

    const auditSpec = require('./mutation-specs/portfolio-technical-merge-audit.spec.js');
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

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_TECHNICAL_MERGE_AUDIT_OK');
