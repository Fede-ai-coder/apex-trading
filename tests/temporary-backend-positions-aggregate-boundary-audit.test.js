'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND POSITIONS AGGREGATE — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [929673,933369) in monolith coordinates — 3,696 units, ONE
// function: `_backendEnrichedPositionsToAggregatedOptions`. One inbound edge,
// ZERO monolith dependencies, and zero in every other direction. It loads in a
// completely empty VM and runs nothing while it loads.
//
// ── THIS AUDIT'S FINDING: THE SCREEN CANNOT SEE ITS OWN BEST CANDIDATES ──────
//
// CLAUDE.md records that the SCREENING rule and the BOUNDARY rule are different
// questions, and that taking one for the other cuts in the wrong place. This
// audit records a third failure of the same confusion, and it is worse than a
// wrong boundary: with a screening rule as the unit of ranking, some candidates
// CANNOT BE RANKED AT ALL.
//
// The screening rule is one column-0 `// ── ` banner running to the next. The
// region that contains this candidate runs from 921786 to 1017315 — 95,529
// units, THIRTY-FIVE top-level owners, one banner. The banner screen can only
// report that region whole, and whole it scores in the hundreds.
//
// That is not one unlucky region. NOT ONE of the five best candidates at this
// base is a whole banner region — they span 1 owner of 35, 1 of 35, 1 of 5, 1
// of 35 and 1 of 6 — so for every one of them the banner screen scores
// something else. §4 asserts that over all five rather than over this one,
// because "every" is the word this programme has got wrong before.
//
// So this audit screens differently. It enumerates every CONTIGUOUS RUN of
// top-level declarations inside every banner region, snaps each to the body
// that would actually move, drops the ones `assertSeam` refuses, and scores
// what is left. At this base: 7,759 raw runs, 2,048 rejected by the seam,
// 3,391 distinct extractable candidates at 1,500 units or more. §4 executes
// that screen rather than quoting it.
//
// The banner screen's best score at this base is 10. The owner-run screen finds
// FIVE candidates scoring 1. That is not a better search of the same space; it
// is the same space, searched at the granularity the boundary rule actually
// uses.
//
// ── A LOW SCORE IS NECESSARY, NOT SUFFICIENT ────────────────────────────────
//
// Two of those five run something at load time, so they are disqualified by the
// rule audit #455 sharpened — and so are the two LARGER cuts at this same site,
// which is what decides the size of this one. Three owners sit together here
// and all three are called from `refreshPositionsLive`:
//
//     owners   body units   nine   load-time   verdict
//        1          3,695      1   none        ← this cut
//        2          7,493      2   `window.`   rejected
//        3         10,430      3   `window.`   rejected
//
// Between the first owner and the second sits
//
//     try { window._resolveLegGreeksDisplay = _resolveLegGreeksDisplay; } catch (e) {}
//
// — a module-scope side effect. Taking two owners or three would relocate it,
// and this programme has refused to relocate one since the DSB adapter cut,
// where the debug exposure stayed with the part that stayed. So the 10,430-unit
// cut is not available and the 3,695-unit one is. §5 measures that over the
// WHOLE candidate set rather than on these three: of 3,391 candidates, 2,093
// run nothing at load, and the 1,298 that do are disqualified whatever they
// score.
//
// ── WHAT THIS CANDIDATE IS NOT ──────────────────────────────────────────────
//
// §8 states the case against it, because three things about it are unusual and
// two of them are not improvements:
//
//   • It is SMALL. At 3,695 units it would rank 2nd of 33 by size — smaller
//     than every layer but the vega monitor. The programme chooses on coupling,
//     not size, and this is what that choice costs in a cycle.
//   • It carries NO DOCUMENTATION. 71 of its 72 lines are code and the 72nd is
//     empty: not one comment line. "The explanation travels with the code" has
//     been a stated value of these cuts; here there is no explanation to
//     travel. That is a fact about the region, not a reason to reshape it, and
//     it is pinned rather than glossed.
//   • It opens on `function`, not on a banner. That is NOT a first: 21 of the
//     32 shipped layers open on a `──` banner and ELEVEN do not, so §8 counts
//     the set instead of inferring from the layers nearest to hand.
//
// One superlative survives measurement, and only one: the module would be the
// first PURE-ASCII layer in the chain — 0 of 32 are today, because every one of
// them carries a box-drawing banner and this region carries no comment at all.
// §8 asserts that over the whole chain.
//
// A claim this audit does NOT make: that 1 is the best score the programme has
// ever recorded. Only TWO shipped contracts pin a nine-direction score at all
// (7 and 8), so the comparison exists for two layers out of thirty-two and is
// stated for those two only. The metric is younger than the chain.
//
// ── THE RETIREMENT ──────────────────────────────────────────────────────────
//
// One mutation spec retires per cycle, in chain order. This cycle: layer #30,
// journal snapshot helpers, 65 mutants. Its CONTRACT still runs on every push
// with every assertion intact, which §11 proves by counting them against the
// base.
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
const BASE_SHA = '27d2b94';
const BASE_CHARS = 1513908;
const BASE_UTF8 = 1542724;
const BASE_LF = 26236;
const BASE_SHA256 = 'd48afcc004e2b165564b116260ab990c3e882be14ee05c8b68286ddf477ee366';
const LOCAL_SCRIPTS = 76;
const BASE_TEST_FILE_COUNT = 160;
const TEST_FILE_COUNT = 161;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-backend-positions-aggregate-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/backend-positions-aggregate-audit.spec.js';
const RATCHETED_CONTRACTS = 22;
const RETIREMENT = {
  contract: 'tests/journal-snapshot-helpers-boundary-contract.test.js',
  spec: 'tests/mutation-specs/journal-snapshot-helpers-contract.spec.js',
  mutants: 65,
};
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 220;
const MUTANT_BUDGET = 250;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114397;
const CODE_CHARS = 1399485;
const TOP_LEVEL_DECLS = 947;
const TOP_LEVEL_BANNERS = 223;
const OWNER_REGIONS = 121;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 929673;
const RAW_END = 933369;
const BODY_END = 933368;
const RAW_CHARS = 3696;
const BODY_CHARS = 3695;
const BODY_UTF8 = 3695;
const BODY_LF = 71;
const BODY_SHA256 = '571ab25f8057fbf318255f1a816c3c7b510ed2d2448cc242fef4d2b70aac352b';
const BODY_ENDING = '}\n';
const OPENING_LINE = 'function _backendEnrichedPositionsToAggregatedOptions(enrichedResp) {';
const OWNERS_EXPECTED = ['_backendEnrichedPositionsToAggregatedOptions'];
const OWNER_COUNT = 1;
const FUNCTION_OWNERS = 1;
const OWNER_SIZES = [3694];
const CODE_LINES = 71;
const TOTAL_LINES = 72;
const COMMENT_LINES = 1;
const MODULE_REL_IF_CUT = 'js/portfolio/backend-positions-aggregate.js';
const NET_REDUCTION = 3626;
const RESIDUAL_MONOLITH = 1395789;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [1063469];
const EDGE_HOSTS = ['refreshPositionsLive'];
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 1;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 1;

// ── The banner region that hides it ──────────────────────────────────────────
const HOST_REGION = [921786, 1017315];
const HOST_REGION_UNITS = 95529;
const HOST_REGION_OWNERS = 35;
const BANNER_SCREEN_BEST = 10;

// ── The owner-run screen ─────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7759;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3391;
const CANDIDATES_SCORING_ONE = 5;
const CLEAN_CANDIDATES = 2093;
const CLEAN_SCORING_ONE = 3;

// ── The three owners at this site, and the exposure between them ─────────────
const SITE_ENDS = [
  { end: 933368, owners: 1, units: 3695, nine: 1, loadTime: 0 },
  { end: 937166, owners: 2, units: 7493, nine: 2, loadTime: 1 },
  { end: 940103, owners: 3, units: 10430, nine: 3, loadTime: 1 },
];
const RECOMMENDED_ROW = 0;
const EXPOSURE_LINE = 'try { window._resolveLegGreeksDisplay = _resolveLegGreeksDisplay; } catch (e) {}';
const EXPOSURE_AT = 937085;

// ── Reachability ─────────────────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

// ── The chain it would join ──────────────────────────────────────────────────
const NEWEST_CONTRACT = 'tests/swing-direction-boundary-contract.test.js';
const CHAIN_LENGTH = 32;
const SIZE_RANK_IF_CUT = 2;
const LARGEST_LAYER_CHARS = 71811;
const SMALLEST_LAYER_CHARS = 1761;
const LAYERS_OPENING_ON_A_BANNER = 21;
const PURE_ASCII_LAYERS = 0;
const LAYERS_WITH_A_DEPENDENCY = 10;
const CONTRACTS_PINNING_NINE = 2;
const PINNED_NINE_SCORES = [7, 8];

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

console.log('BACKEND POSITIONS AGGREGATE — TEMPORARY BOUNDARY AUDIT');
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

const REC = profileOf([RAW_AT, RAW_END]);
const BODY = CODE.slice(RAW_AT, BODY_END);
const REGIONS = mergedRegions(MARKS);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, BASE_CHARS, 'index.html is 1,513,908 units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…1,542,724 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…26,236 line feeds');
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
// THE JUDGEMENT IS "STOP AFTER THIS OWNER"; the snap is what is mechanical.
// snapBodyEnd does not FIND an end — given the region's own end as a limit it
// returns 1,017,314, the last code line of all thirty-five owners. What it does
// is trim a CHOSEN end back to the last line carrying code, and the chosen end
// here is where the next top-level owner begins.
const NEXT_OWNER_AT = DECLS.filter((d) => d.start > RAW_AT)[0].start;
eq(NEXT_OWNER_AT, 935045, 'the next top-level owner begins here');
eq(snapBodyEnd(CODE, RAW_AT, NEXT_OWNER_AT), BODY_END,
  '…and snapping that back to the last line of code lands on BODY_END');
ok(snapBodyEnd(CODE, RAW_AT, HOST_REGION[1]) > BODY_END,
  'control — given the whole region as a limit it lands far past it, which is why the '
  + 'boundary is a judgement and only the snap is mechanical');
eq(CODE.slice(BODY_END, NEXT_OWNER_AT).trim().indexOf('//'), 0,
  '…and everything between them is comment: 1,677 units documenting the owner that '
  + 'STAYS, which is exactly what a cut here must not take');
eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary on all four invariants');
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
eq(CODE_AT + RAW_AT, 1044070, 'in index.html coordinates the span starts here');

const OWNERS = DECLS.filter((d) => d.start >= RAW_AT && d.end < RAW_END);
eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the region declares exactly one name at top level');
eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and it is a function');
eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…of 3,694 units');
eq(OWNERS[0].end + 2, BODY_CHARS + RAW_AT,
  '…ending one unit before the body does: the only thing after it is the terminating newline');

const LINES = BODY.split('\n');
eq(LINES.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
eq(LINES.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
eq(LINES.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES,
  '…and exactly one that is not, which is the empty last element `split` leaves on a '
  + 'newline-terminated string — so there is not ONE comment line in the region');
eq(LINES.filter((l) => /^\s*\/\//.test(l)).length, 0,
  '…measured directly too: zero lines begin a comment. §8 states what that costs');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling, in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'exactly ONE reference reaches in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at this exact site');
ok(REC.sites.every(insideFunction), '…inside a function body, so it does not run at load');
{
  const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
  eq(Array.from(new Set(REC.sites.map((i) => hostOf(i).name))).sort(), EDGE_HOSTS,
    '…hosted by refreshPositionsLive, which stays behind');
  for (const n of EDGE_HOSTS) {
    ok(BY_NAME.has(n), n + ' is a monolith declaration…');
    ok(BY_NAME.get(n).start > RAW_END || BY_NAME.get(n).end < RAW_AT, '…declared outside the region');
  }
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it depends on NOTHING the monolith declares — the dependency list is empty, not short');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen, outboundModule: REC.outModule,
}, ZERO_DIRECTIONS,
'EIGHT of the nine directions measure zero: no write in, none through, none out, '
  + 'no markup either way, no sibling module, and nothing that already left');
eq(REC.nine, FULL_NINE, 'nine directions, total score 1 — one inbound edge and nothing else');

// THE INDEXED PROFILE IS RE-DERIVED THE SLOW WAY. The screen in §4 is only
// affordable because of the occurrence index, and an index with a bug would
// give a wrong answer fast. So the recommendation's own numbers are recomputed
// with the direct regex scan and must agree.
{
  const name = OWNERS_EXPECTED[0];
  const direct = refSites(MASKED, name).filter((i) => i < RAW_AT || i >= RAW_END);
  eq(direct, EDGE_SITES, 'control — a direct regex rescan finds the same inbound sites as the index');
  eq(refSites(STRINGS, name).filter((i) => i < RAW_AT || i >= RAW_END).length, 0,
    'control — …and the same zero references from generated markup');
  eq(refSites(STATIC_MARKUP, name).length, 0, 'control — …and the same zero from static markup');
  eq(refSites(OTHER_INLINE, name).length, 0, 'control — …and none from the other inline blocks');
  let sib = 0;
  for (const s of SIBLINGS) if (!s.bound.has(name)) sib += refSites(s.masked, name).length;
  eq(sib, 0, 'control — …and no shipped module names it');
  // A CONTROL ON AN INPUT WHERE THE ANSWER DIFFERS: five of those six metrics
  // are zero, and `return 0` would satisfy every one of them.
  const decoy = '_resolveLegGreeksDisplay';
  ok(refSites(MASKED, decoy).length > 0,
    'control — the same scan on a name that IS referenced returns a non-zero count, '
    + 'so the zeros above are measurements and not a constant');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The banner screen cannot rank this candidate; the owner-run screen can');
// ─────────────────────────────────────────────────────────────────────────────
{
  const host = REGIONS.filter((r) => r.start <= RAW_AT && r.end > RAW_AT);
  eq(host.length, 1, 'exactly one banner region contains the recommendation');
  eq([host[0].start, host[0].end], HOST_REGION, '…and it is this one');
  eq(host[0].end - host[0].start, HOST_REGION_UNITS, '…95,529 units of it');
  eq(DECLS.filter((d) => d.start >= host[0].start && d.end < host[0].end).length, HOST_REGION_OWNERS,
    '…carrying THIRTY-FIVE top-level owners under a single banner');
  eq(MARKS.filter((m) => m > RAW_AT && m < HOST_REGION[1]).length, 0,
    '…with no banner anywhere between the recommendation and the end of the region: '
    + 'the screening rule has nothing finer to offer here');
  ok(profileOf([host[0].start, host[0].end]).nine > BANNER_SCREEN_BEST * 10,
    '…and scored whole it is an order of magnitude worse than the banner screen\'s best, '
    + 'which is why no candidate inside it can be ranked by that screen');
}

// THE OWNER-RUN SCREEN, EXECUTED. Every contiguous run of top-level owners in
// every banner region, snapped to the body that would move, seam-checked, and
// scored.
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
  eq(seamRejected, SEAM_REJECTED,
    '…of which SEAM_REJECTED are refused by assertSeam and never ranked: the seam is '
    + 'mechanical even though the boundary is a judgement');
  eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct extractable candidates at the floor');
}
for (const c of candidateRuns) { c.p = profileOf([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
{
  const byScore = candidateRuns.slice().sort((a, b) => a.p.nine - b.p.nine || b.units - a.units);
  const ones = candidateRuns.filter((c) => c.p.nine === 1);
  eq(ones.length, CANDIDATES_SCORING_ONE, 'FIVE candidates score 1');
  eq(byScore[0].p.nine, 1, '…so the best score in the monolith at this floor is 1');
  ok(BANNER_SCREEN_BEST > 1,
    '…where the banner screen\'s best was 10: the same space, searched at the granularity '
    + 'the boundary rule uses');
  // NOT ONE of the five is a whole banner region, so the banner screen never
  // scores any of them — it scores the region each is buried in.
  for (const c of ones) {
    const r = REGIONS.filter((x) => x.start <= c.lo && x.end > c.lo)[0];
    const ownersInRegion = DECLS.filter((d) => d.start >= r.start && d.end < r.end).length;
    ok(ownersInRegion > c.p.names.length,
      'candidate at ' + c.lo + ' spans ' + c.p.names.length + ' of its region\'s '
      + ownersInRegion + ' owners, so the banner screen ranks the region and not the candidate');
  }
  // The recommendation is the best CLEAN candidate, and best on both axes at once,
  // so there is no trade-off between coupling and size to argue about.
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load))
    .sort((a, b) => a.p.nine - b.p.nine || b.units - a.units);
  eq([clean[0].lo, clean[0].hi], [RAW_AT, BODY_END],
    'the best clean candidate IS the recommendation…');
  eq(clean[0].p.nine, FULL_NINE, '…at score 1…');
  eq(clean[0].units, BODY_CHARS, '…and BODY_CHARS units, the largest of those scoring 1: '
    + 'lowest coupling and most bytes are the same candidate here');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. A low score is necessary, not sufficient');
// ─────────────────────────────────────────────────────────────────────────────
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, 'CLEAN_CANDIDATES of the candidates run nothing at load');
  ok(candidateRuns.length - clean.length > 0,
    '…and the rest DO, so the rule discriminates rather than passing everything');
  eq(candidateRuns.filter((c) => c.p.nine === 1 && runsNothingAtLoad(c.load)).length, CLEAN_SCORING_ONE,
    'of the five scoring 1, three are clean and two are disqualified by it');
}
// The three owners at this site, and why the cut stops at the first.
{
  const measured = SITE_ENDS.map((row) => {
    const p = profileOf([RAW_AT, row.end]);
    const l = loadTimeProfile(RAW_AT, row.end);
    return { end: row.end, owners: p.names.length, units: row.end - RAW_AT, nine: p.nine,
      loadTime: l.stmtLines };
  });
  eq(measured, SITE_ENDS,
    'three ends from the same start: one owner, two, three — their sizes, scores and '
    + 'load-time statement counts, as a whole table so a dropped row cannot pass');
  eq(SITE_ENDS[RECOMMENDED_ROW].end, BODY_END, 'the recommendation is the first row');
  eq(SITE_ENDS[RECOMMENDED_ROW].loadTime, 0, '…the only one that runs nothing at load');
  ok(SITE_ENDS[1].units > SITE_ENDS[0].units && SITE_ENDS[2].units > SITE_ENDS[1].units,
    '…and it is the SMALLEST of the three, so the case against it is stated, not hidden');
  for (const row of [SITE_ENDS[1], SITE_ENDS[2]]) {
    const reads = loadTimeProfile(RAW_AT, row.end).reads;
    ok(reads.indexOf('window') >= 0,
      'the ' + row.owners + '-owner cut reads `window` at evaluation time…');
  }
}
// THE EXPOSURE ITSELF, located rather than described.
{
  eq(CODE.indexOf(EXPOSURE_LINE), EXPOSURE_AT, 'the module-scope exposure sits at EXPOSURE_AT');
  ok(EXPOSURE_AT > BODY_END, '…after the recommended body, so this cut leaves it behind…');
  ok(EXPOSURE_AT < SITE_ENDS[1].end && EXPOSURE_AT < SITE_ENDS[2].end,
    '…and inside both larger cuts, which is what disqualifies them');
  ok(!insideFunction(EXPOSURE_AT), '…and it is at top level, not inside any function body');
  eq(CODE.slice(BODY_END, EXPOSURE_AT).indexOf(EXPOSURE_LINE), -1,
    'control — it occurs once in that stretch, so the position above is the only one');
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
  eq(typeof ctx._backendEnrichedPositionsToAggregatedOptions, 'function',
    '…and the function the single caller reaches for is there');
}
// NOTHING IS STARTED, BOUND OR READ while it loads — checked by watching, not
// by reading the source.
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
  // AND THE WATCHER WORKS, on an input where the answer differs.
  const ctl = [];
  const ctx2 = { setTimeout: () => { ctl.push('setTimeout'); } };
  vm.createContext(ctx2);
  vm.runInContext('setTimeout(function(){}, 0);', ctx2);
  eq(ctl, ['setTimeout'], 'control — the same watcher records a call when there is one to record');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. What the region actually is');
// ─────────────────────────────────────────────────────────────────────────────
{
  const masked = maskLiterals(BODY);
  eq(refSites(masked, 'S').length, 0,
    'it never names `S`, so the rule audit #455 sharpened does not even arise here');
  eq(propertyWriteBases(masked).filter((b) => BY_NAME.has(b)).length, 0,
    '…and it writes no property through any monolith declaration');
  ok(/^function\s+_backendEnrichedPositionsToAggregatedOptions\s*\(enrichedResp\)/.test(BODY),
    'it takes one parameter, the backend response');
  const bound = locallyBound(BODY);
  ok(bound.has('enrichedResp'), '…which is locally bound, so it is not an inbound dependency');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. What this candidate is NOT');
// ─────────────────────────────────────────────────────────────────────────────
{
  const chainSrc = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const m = chainSrc.match(/^const CHAIN = \[([\s\S]*?)^\];/m);
  ok(m, 'the chain is read from the newest shipped contract, not retyped here');
  const CHAIN = m[1].split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith("'")).map((l) => l.replace(/^'|',?$/g, ''));
  CHAIN.push('js/services/swing-direction.js');
  eq(CHAIN.length, CHAIN_LENGTH, '…and it is CHAIN_LENGTH layers long');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');

  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length)
    .sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is 1,761 units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest 71,811');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT by size: smaller than every layer but one');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS,
    '…and larger than that one, so it displaces no superlative and re-pins no contract');

  // IT DOES NOT OPEN ON A BANNER — and that is NOT a first. Counted over the
  // whole chain, because "the first layer that …" has been written from a
  // partial look four times in this programme and was wrong every time.
  const BANNER = /^[ \t]*\/\/ ─{2,}[ \t]+\S/;
  const opensOnBanner = CHAIN.filter(
    (rel) => BANNER.test(fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n')[0]));
  eq(opensOnBanner.length, LAYERS_OPENING_ON_A_BANNER,
    'LAYERS_OPENING_ON_A_BANNER of the chain open on a ── banner');
  eq(CHAIN.length - opensOnBanner.length, CHAIN_LENGTH - LAYERS_OPENING_ON_A_BANNER,
    '…and ELEVEN do not, so opening on `function` is the minority habit, not a new one');
  ok(!BANNER.test(OPENING_LINE), '…and this region is one of the minority');

  // ONE SUPERLATIVE SURVIVES MEASUREMENT, and it is asserted over the whole set.
  const ascii = CHAIN.filter((rel) => {
    const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return Buffer.byteLength(s, 'utf8') === s.length;
  });
  eq(ascii.length, PURE_ASCII_LAYERS, 'NOT ONE shipped layer is pure ASCII today');
  eq(BODY_UTF8, BODY_CHARS,
    '…and this one would be: it carries no comment, so it carries no box-drawing character');

  // THE SCORE COMPARISON IS SCOPED TO WHAT IS ACTUALLY PINNED. The nine-direction
  // metric is younger than the chain, and a claim about "the best score ever" is
  // one this audit cannot support.
  const pinned = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8').match(/^const FULL_NINE = (\d+);/m))
    .filter(Boolean).map((x) => Number(x[1])).sort((a, b) => a - b);
  eq(pinned.length, CONTRACTS_PINNING_NINE, 'only TWO shipped contracts pin a nine-direction score');
  eq(pinned, PINNED_NINE_SCORES, '…and those two are 7 and 8');
  ok(FULL_NINE < pinned[0],
    '…so all that can be said is that 1 is lower than both, for two layers of thirty-two');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Reachability, and the runtime dependency question');
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
    '…and the recommendation is not among them: it is live code with a live caller');
}
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
    'TEN shipped contracts pin a non-empty MONOLITH_DEPENDENCIES — a runtime dependency is '
    + 'normal in this chain, which is why having NONE is worth recording rather than assumed');
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
    'NOT ONE production file differs from the base: this phase measures, it does not move');
  eq(git(['show', BASE_SHA + ':index.html']).length, BASE_CHARS,
    '…and the base really did carry an index.html of this length');
  eq(sha256(git(['show', BASE_SHA + ':index.html'])), BASE_SHA256, '…with this digest');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)),
    'the module Phase 2 would write does not exist yet');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. The change set, the ratchet and the budget');
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

  // THE RETIREMENT and the budget, as arithmetic rather than as a claim.
  {
    ok(changed.indexOf(RETIREMENT.spec) >= 0, 'the retired mutation spec is part of the change');
    ok(!fs.existsSync(path.join(ROOT, RETIREMENT.spec)), '…and is gone from the tree');
    const mod = { exports: {} };
    new Function('module', 'exports', git(['show', BASE_SHA + ':' + RETIREMENT.spec]))(mod, mod.exports);
    eq(mod.exports.mutants.length, RETIREMENT.mutants, '…having carried sixty-five mutants');
    ok(fs.existsSync(path.join(ROOT, RETIREMENT.contract)), 'the contract it targeted still ships');
    const CALL = /\b(?:eq|ok|throwsWith|throws|deepStrictEqual|strictEqual)\s*\(/g;
    const before = git(['show', BASE_SHA + ':' + RETIREMENT.contract]);
    const after = fs.readFileSync(path.join(ROOT, RETIREMENT.contract), 'utf8');
    eq((after.match(CALL) || []).length, (before.match(CALL) || []).length,
      '…with exactly as many assertions as before: the spec retired, not the contract');
    ok(/ok\(!fs\.existsSync\(path\.join\(ROOT, CONTRACT_SPEC_REL\)\)/.test(after),
      '…and its spec-existence assertion is now its NEGATION, so the retirement is executed');

    const auditSpec = require('./mutation-specs/backend-positions-aggregate-audit.spec.js');
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
console.log('BACKEND_POSITIONS_AGGREGATE_AUDIT_OK');
