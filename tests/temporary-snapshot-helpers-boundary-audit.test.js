'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL SNAPSHOT HELPERS — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [1210818,1221613) in monolith coordinates — 10,795 units,
// THREE owners, all functions: `_buildSnapshot`, `_logSnapshot` and
// `_greeksMergeFromCache`. 199 lines of code, no top-level statement, nothing
// that runs at load.
//
// SIX EDGES REACH IN, AND THEY ARE THREE COPIES OF ONE IDIOM. Every inbound
// reference sits inside one of three functions — `positionManager`,
// `submitClosePosition`, `submitTrade` — and each of the three makes the SAME
// three calls in the same order: merge the cached greeks, build the rich
// snapshot, log it. The middle call of that idiom is `_buildRichSnapshot`,
// which is no longer in the monolith at all: it shipped as
// `js/services/journal-rich-snapshot.js`. This region is the two ends of an
// idiom whose centre already left, and §4 derives that rather than asserting it.
//
// ── THIS AUDIT'S FINDING: A COUPLING SCREEN CANNOT SEE REACHABILITY ──────────
//
// Four ends were measured from the same start. Every one of them is a valid
// seam — `assertSeam` accepts all four, so the structural check decides
// nothing here — and the score rises monotonically with size:
//
//     end        units   seven  eight  nine   seam
//     1217580    6,762       4      4     5   accepted
//     1218266    7,448       8      8     9   accepted
//     1221613   10,795      12     12    14   accepted   ← this one
//     1223775   12,957      17     17    19   accepted
//
// So the screen, left to itself, recommends the NARROW cut: 6,762 units at a
// score of 5, better than every one of the seventy screened regions of 3,000
// units or more, whose best is 8. That cut is `_buildSnapshot` alone — and
// `_buildSnapshot` is named NOWHERE in production. Not in the monolith's code,
// not in its string literals, not in any of the seventy-three shipped modules,
// not in the static markup. It scores best because nothing calls it.
//
// Zero inbound is what a perfectly encapsulated leaf looks like, and it is also
// what dead code looks like, and no direction of the screen tells them apart.
// §6 measures the whole monolith for it: NINETEEN of 956 top-level declarations
// are named nowhere in production, 11,926 units, 0.84% of what is left.
// `_buildSnapshot` is 6,608 of those units — 55.4% of all of it, and 7.9× the
// next largest. It is 61% of the region this audit recommends, and 113 of its
// 199 lines of code.
//
// THE RECOMMENDATION STANDS ANYWAY, and the reason is worth stating plainly
// rather than hiding in a ratio. Phase 2 relocates bytes; it cannot delete
// them, because "byte-exact or it is not done" is the rule that makes the undo
// helpers possible. Deleting `_buildSnapshot` is a PRODUCTION change and
// belongs in its own PR, which this audit recommends but does not make. What
// extraction buys meanwhile is that 6,608 units of unreachable code stop being
// buried in a 1,426,144-unit inline script and become a named file anyone can
// grep, diff and delete in one line. If that deletion lands first, this audit
// must be re-measured: every offset below moves.
//
// ── TWO DIRECTIONS THE SCREEN DID NOT HAVE ──────────────────────────────────
//
// #444 measured a direction nobody had: generated markup — `onclick="f()"` —
// could name a region's own functions where no masked-code scan would see it.
// That is the INBOUND half. The outbound half was never measured: markup the
// region generates naming something that stays behind. §5 measures it across
// the screen — NINETEEN of 92 owner-carrying regions, 69 edges — and it is not
// bookkeeping. The ticker-search region [688306,695677) is 7,371 units at a
// seven-score of 9; it names `setSort`, `openScannerChart`,
// `openChartForSymbolLookup` and `showDetail` inside the rows it builds, and
// at 13 it leaves the shortlist entirely.
//
// A NINTH is the same blindness one layer further on. `deps` ranges over the
// monolith's own declarations, so a call to something that ALREADY LEFT — one
// of the 726 names the shipped modules own — is counted by nothing. Fifty-two
// of the 92 regions carry such an edge, 456 in total, which is what
// twenty-nine layers of extraction look like from the inside. This region
// carries two, both `buildStreamerSymbol` from `js/utils/option-symbols.js`.
//
// THE FIELD OF COMPARABLE SIZE, MEASURED RATHER THAN RECALLED. Thirty-two
// regions carry 10,000 units or more, and the recommendation scores lowest of
// all of them. The RUNNER-UP is not disqualified by anything — the RS
// diagnostics region, 10,186 units at 15, loads bare exactly as this one does;
// it simply carries less code per point of coupling, 130 lines to 199. The
// nearest by SIZE is the one that fails: `LOGIN & INIT` [678008,688306), 10,298
// units at 22, carries NINETY top-level statement lines, and loading it in a
// stubbed VM throws on `document.getElementById('launchBtn').addEventListener`
// — it binds listeners, starts an interval and reads localStorage at load. The
// recommendation loads in a completely empty VM, defines exactly its three
// globals and does nothing at all. §8 measures all three.
//
// THE MUTANT BUDGET STAYS AT 250, AND THIS CYCLE RETIRES TWO SPECS TO HOLD IT.
// #446 established that the floor rises by one contract spec every cycle, so
// retiring in chain order is the only flat policy: #446 took layer #24's spec,
// #448 layer #25's, and this one takes #26's and #27's — vega-monitor (46) and
// scanner-ivr (59). One would not have paid: a retirement has to cover the
// temporary audit spec arriving with it, and this audit carries ninety-six pins
// and a hundred and two mutants because it introduces two directions and a
// reachability sweep. Over two cycles the rate is unchanged, and §11 asserts
// the arithmetic — base, less the retirements, plus this spec — instead of
// asserting the total it happens to reach. Both CONTRACTS still run on every
// push with every assertion intact; what stops is the mutation pass re-proving
// their pins are load-bearing.
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
const BASE_SHA = '5603a94';
const BASE_CHARS = 1540382;
const BASE_UTF8 = 1569392;
const BASE_LF = 26714;
const BASE_SHA256 = '31f968a564c28b3d006e494cc1829112dd8dacefc6539bc465c953ddfa8a7d42';
const LOCAL_SCRIPTS = 73;
const BASE_TEST_FILE_COUNT = 157;
const TEST_FILE_COUNT = 158;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-snapshot-helpers-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/snapshot-helpers-audit.spec.js';
const RATCHETED_CONTRACTS = 19;
// TWO retirements this cycle, in the same chain order the last two cycles used:
// #446 retired layer #24's spec, #448 layer #25's, and these are #26 and #27.
// One would not have fitted: the retirement has to pay for the audit spec, and
// this audit carries ninety-six pins because it introduces two directions and a
// reachability sweep. §11 asserts the arithmetic rather than asserting the
// count, so "the budget held" is checked and not claimed.
const RETIREMENTS = [
  { contract: 'tests/vega-monitor-boundary-contract.test.js',
    spec: 'tests/mutation-specs/vega-monitor-contract.spec.js', mutants: 46 },
  { contract: 'tests/scanner-ivr-throttle-boundary-contract.test.js',
    spec: 'tests/mutation-specs/scanner-ivr-contract.spec.js', mutants: 59 },
];
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 237;
const MUTANT_BUDGET = 250;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114212;
const CODE_CHARS = 1426144;
const TOP_LEVEL_DECLS = 956;
const BANNER_MARKS = 177;
const MERGED_REGIONS = 103;
const OWNER_REGIONS = 92;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 1210818;
const RAW_END = 1221613;
const BODY_END = 1221612;
const RAW_CHARS = 10795;
const BODY_CHARS = 10794;
const BODY_UTF8 = 10821;
const BODY_LF = 229;
const BODY_SHA256 = '3a49bac474239518dc0aea0f2033c4d7f6a25cb5fa1eab6d01a9fb075bdbd9c4';
const BODY_ENDING = '}\n';
const HEAD_BANNER = '// ── SNAPSHOT HELPER — reads only already-available state ────────';
const OWNER_COUNT = 3;
const FUNCTION_OWNERS = 3;
const CODE_LINES = 199;
const OWNERS_EXPECTED = ['_buildSnapshot', '_logSnapshot', '_greeksMergeFromCache'];
const MODULE_REL_IF_CUT = 'js/services/journal-snapshot-helpers.js';

// ── Coupling, in seven directions ────────────────────────────────────────────
const EXTERNAL_EDGES = 6;
const EDGE_SITES = [747851, 747987, 1209468, 1209658, 1410339, 1410905];
// The five directions that measure zero, asserted as ONE object against one
// derived object. Five separate `eq(…, 0)` calls are five chances to delete one
// without the count noticing; a whole-object comparison is not.
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  staticMarkup: 0, generatedMarkup: 0,
};
const MONOLITH_DEPENDENCIES =
  ['S', '_portfolioLegEffectiveQty', 'debugLog', 'getCanonicalIvr', 'isActivePortfolioLeg'];
const SIBLING_REFERENCES = 1;
const SIBLING_REFERRER = 'js/ui/journal-trade-forms.js';
const FULL_SEVEN = 12;

// ── The idiom the six edges are three copies of ──────────────────────────────
const CALLERS = ['positionManager', 'submitClosePosition', 'submitTrade'];
const IDIOM_MIDDLE = '_buildRichSnapshot';
const IDIOM_MIDDLE_MODULE = 'js/services/journal-rich-snapshot.js';
const IDIOM_MIDDLE_SITES = [747931, 1209577, 1410412];

// ── The eighth and ninth directions ──────────────────────────────────────────
const OUTBOUND_GENERATED = 0;
const FULL_EIGHT = 12;
const OUTBOUND_MODULE_NAMES = ['buildStreamerSymbol'];
const OUTBOUND_MODULE_EDGES = 2;
const OUTBOUND_MODULE_OWNER = 'js/utils/option-symbols.js';
const FULL_NINE = 14;
const SHIPPED_MODULE_NAMES = 726;
// Across the whole screen, so the two directions are not claimed from one case.
const REGIONS_WITH_OUTBOUND_GENERATED = 19;
const OUTBOUND_GENERATED_EDGES = 69;
const REGIONS_WITH_OUTBOUND_MODULE = 52;
const OUTBOUND_MODULE_EDGES_TOTAL = 456;
// The region the eighth direction removes from the shortlist.
const TICKER_REGION = [688306, 695677];
const TICKER_UNITS = 7371;
const TICKER_SEVEN = 9;
const TICKER_EIGHT = 13;
const TICKER_GENERATED_NAMES =
  ['openChartForSymbolLookup', 'openScannerChart', 'setSort', 'showDetail'];

// ── Reachability ─────────────────────────────────────────────────────────────
const DEAD_DECLS = 19;
const DEAD_UNITS = 11926;
const DEAD_LARGEST = '_buildSnapshot';
const DEAD_LARGEST_CHARS = 6608;
const DEAD_SECOND = 'updateStreamerPreview';
const DEAD_SECOND_CHARS = 840;
const DEAD_LARGEST_CODE_LINES = 113;
const DEAD_NAMED_IN_TESTS = ['tests/post-eic-monolith-extraction-audit.test.js'];

// ── The four ends ────────────────────────────────────────────────────────────
// One table, compared whole against one derived table. #449 shipped a list that
// was asserted element by element in a loop, so dropping an element simply ran
// one assertion fewer and passed — and the list turned out to be one short.
const ENDS = [
  { end: 1217580, units: 6762, owners: 1, nine: 5 },
  { end: 1218266, units: 7448, owners: 2, nine: 9 },
  { end: 1221613, units: 10795, owners: 3, nine: 14 },
  { end: 1223775, units: 12957, owners: 7, nine: 19 },
];
const RECOMMENDED_ROW = 2;
const NARROW_END = 1217580;
// What the narrow cut would beat, measured over the screen and not over the
// regions nearest to hand.
const SCREEN_FLOOR_UNITS = 3000;
const REGIONS_ABOVE_FLOOR = 70;
const BEST_NINE_ABOVE_FLOOR = 8;

// ── Evaluation time ──────────────────────────────────────────────────────────
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 3;
// The rival, and why it is not the recommendation.
// Everything of comparable size, so "the rival" is a measured position and not
// the region that came to mind. Among the 32 regions of 10,000 units or more
// the recommendation scores lowest; the RUNNER-UP loses on score, not on
// evaluation time, and LOGIN & INIT is the one that fails on load behaviour.
const BIG_REGION_FLOOR = 10000;
const BIG_REGIONS = 32;
const RUNNER_UP_REGION = [328091, 338277];
const RUNNER_UP_NINE = 15;
const RUNNER_UP_CODE_LINES = 130;
const RIVAL_REGION = [678008, 688306];
const RIVAL_UNITS = 10298;
const RIVAL_NINE = 22;
const RIVAL_STATEMENT_LINES = 90;
const RIVAL_LOAD_ERROR = "Cannot read properties of null (reading 'addEventListener')";
const RIVAL_FIRST_DOM_CALL = 'launchBtn';

// ── The chain it would join ──────────────────────────────────────────────────
const NEWEST_CONTRACT = 'tests/chart-interactions-boundary-contract.test.js';
const CHAIN_LAYERS = 29;
const SIZE_RANK_IF_CUT = 17;
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
function codeLines(src) { return src.split('\n').filter((l) => !isBlankOrComment(l)).length;
}
// How many mutants a spec source declares, evaluated the way loadSpecs does.
function specMutants(source) {
  const mod = { exports: {} };
  new Function('module', 'exports', source)(mod, mod.exports);
  return mod.exports.mutants.length;
}
// One indexed pass per view. The sweeps below ask 956 names of six views; done
// with a regex each that is 5,736 full scans of the document.
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
const at = (idx, name) => idx.get(name) || [];
// Occurrence lists are ascending by construction, so "how many of these sites
// fall in [lo,hi)" is a pair of binary searches. The sweep below asks that
// question 92 × 1,682 times; asking it with `.filter` is where an earlier
// sweep's two seconds went.
function countInRange(sites, lo, hi) {
  const bound = (x) => {
    let a = 0, b = sites.length;
    while (a < b) { const m = (a + b) >> 1; if (sites[m] < x) a = m + 1; else b = m; }
    return a;
  };
  return bound(hi) - bound(lo);
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('JOURNAL SNAPSHOT HELPERS — TEMPORARY BOUNDARY AUDIT');
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

// Every name the shipped modules own, and which file owns it. The ninth
// direction ranges over exactly this map.
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

// The region model the screen uses: one column-0 banner to the next, with the
// header-merge rule #441 established.
const rawRegions = MARKS.map((s, i) => ({ start: s, end: i + 1 < MARKS.length ? MARKS[i + 1] : CODE.length }));
const REGIONS = [];
for (let i = 0; i < rawRegions.length; i++) {
  let r = rawRegions[i];
  while (i + 1 < rawRegions.length) {
    const between = CODE.slice(r.start, rawRegions[i + 1].start);
    if (between.split('\n').some((l) => !isBlankOrComment(l))) break;
    r = { start: r.start, end: rawRegions[i + 1].end }; i++;
  }
  REGIONS.push(r);
}
const OWNED_REGIONS = REGIONS.filter((r) => DECLS.some((d) => d.start >= r.start && d.end < r.end));

const OCC_CODE = occurrenceIndex(MASKED);
const OCC_STRINGS = occurrenceIndex(STRINGS);
// How many times the shipped modules name each monolith declaration, counting
// only modules that do not bind the name themselves. Computed once for all 956
// names rather than once per region: the same question asked the slow way is
// 69,788 regex scans of module source.
const SIB_REFS = new Map();
{
  const perModule = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked) }));
  for (const d of DECLS) {
    let n = 0;
    for (const m of perModule) if (!m.bound.has(d.name)) n += at(m.idx, d.name).length;
    SIB_REFS.set(d.name, n);
  }
}
const OCC_SIB_CODE = occurrenceIndex(SIBLINGS.map((s) => s.masked).join('\n'));
const OCC_SIB_STRINGS = occurrenceIndex(SIBLINGS.map((s) => s.strings).join('\n'));
const OCC_MARKUP = occurrenceIndex(STATIC_MARKUP);
const OCC_OTHER_INLINE = occurrenceIndex(OTHER_INLINE);

// The profile, in nine directions. Seven are what the shipped contracts
// measure; `outGen` and `outModule` are this audit's additions, and are
// reported separately so the older number stays comparable.
function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const inside = (i) => i >= range[0] && i < range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0;
  const sites = [];
  for (const n of names) {
    for (const site of at(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(site);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(site + n.length, site + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, site, n)) inPropWrites++;
    }
    gen += at(OCC_STRINGS, n).filter(outside).length;
  }
  const outWrites = new Set(propertyWriteBases(bodyMasked).filter((b) => !nameSet.has(b) && BY_NAME.has(b)));
  const local = locallyBound(CODE.slice(range[0], range[1]));
  const deps = new Set();
  for (const d of DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (countInRange(at(OCC_CODE, d.name), range[0], range[1])) deps.add(d.name);
  }
  let sib = 0;
  for (const n of names) sib += SIB_REFS.get(n);
  let mkp = 0;
  for (const n of names) mkp += at(OCC_MARKUP, n).length;
  // EIGHTH — markup this range generates, naming something that stays behind.
  const outGen = [];
  for (const d of DECLS) {
    if (nameSet.has(d.name)) continue;
    if (!countInRange(at(OCC_STRINGS, d.name), range[0], range[1])) continue;
    for (const site of at(OCC_STRINGS, d.name).filter(inside)) outGen.push([d.name, site]);
  }
  // NINTH — code in this range naming something that already left.
  const outModule = [];
  for (const [n] of MODULE_OWNERS) {
    if (nameSet.has(n) || local.has(n)) continue;
    if (!countInRange(at(OCC_CODE, n), range[0], range[1])) continue;
    for (const site of at(OCC_CODE, n).filter(inside)) outModule.push([n, site]);
  }
  const five = inbound + inWrites + outWrites.size + deps.size + sib + mkp;
  const seven = five + inPropWrites + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp,
    outWrites: Array.from(outWrites).sort(), deps: Array.from(deps).sort(),
    sites: sites.sort((a, b) => a - b),
    outGen, outModule,
    five, seven, eight: seven + outGen.length, nine: seven + outGen.length + outModule.length,
  };
}

const REC = profile([RAW_AT, RAW_END]);
const BODY = CODE.slice(RAW_AT, BODY_END);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, BASE_CHARS, 'index.html is 1,540,382 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…1,569,392 bytes');
  eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…26,714 line feeds');
  eq(sha256(INDEX), BASE_SHA256, '…and hashes to the base digest');
  eq(LOCALS.length, LOCAL_SCRIPTS, 'seventy-three local scripts ship today');
  eq(INDEX, git(['show', BASE_SHA + ':index.html']),
    'and the working tree is byte-identical to the base commit');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The monolith, and the region model the screen uses');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at 114,212');
  eq(CODE.length, CODE_CHARS, '…and is 1,426,144 units — what twenty-nine layers have left');
  eq(DECLS.length, TOP_LEVEL_DECLS, 'it declares 956 names at top level');
  eq(MARKS.length, BANNER_MARKS, '177 column-0 banner marks');
  eq(REGIONS.length, MERGED_REGIONS, '…merging to 103 regions under the header rule');
  eq(OWNED_REGIONS.length, OWNER_REGIONS, '…of which 92 carry a top-level declaration');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The recommended region, its boundary and its seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE[RAW_AT - 1] === '\n', 'the region opens on a line start');
  eq(CODE.slice(RAW_AT, CODE.indexOf('\n', RAW_AT)), HEAD_BANNER, '…on the snapshot-helper banner');
  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next line');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts it on all four invariants');
  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  eq(RAW_END - RAW_AT, RAW_CHARS, 'the raw fragment is 10,795 units');
  eq(BODY.length, BODY_CHARS, '…of which the body is 10,794');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', '…and raw IS body plus one structural line feed');
  eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'the body is 10,821 bytes');
  eq((BODY.match(/\n/g) || []).length, BODY_LF, '…229 line feeds');
  eq(sha256(BODY), BODY_SHA256, '…and this is the digest Phase 2 must reproduce');
  eq(BODY.slice(-2), BODY_ENDING, 'it ends `}\\n`');

  const owners = scanTopLevelDeclarations(BODY);
  eq(owners.length, OWNER_COUNT, 'three top-level owners');
  eq(owners.map((d) => d.name), OWNERS_EXPECTED, '…in this order');
  eq(owners.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and all three are functions');
  eq(codeLines(BODY), CODE_LINES, 'the body carries 199 lines of code');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Six edges reach in, and they are three copies of ONE idiom');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(REC.sites, EDGE_SITES, 'SIX references reach in from the rest of the monolith');
  eq(REC.inbound, EXTERNAL_EDGES, '…exactly six');
  ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');

  // The hosts are DERIVED. A list compared against a list; write one name wrong
  // and the set differs, which is what #449 learned when a loop-asserted list
  // turned out to be one element short and passed anyway.
  const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
  const hosts = Array.from(new Set(REC.sites.map((i) => hostOf(i).name))).sort();
  eq(hosts, CALLERS.slice().sort(), 'all six sit inside exactly THREE functions');

  // …and each of the three makes the same three calls, in the same order.
  const middle = at(OCC_CODE, IDIOM_MIDDLE);
  eq(middle, IDIOM_MIDDLE_SITES, '_buildRichSnapshot is named three times in the monolith');
  const idiom = CALLERS.map((name) => {
    const host = BY_NAME.get(name);
    const within = (sites) => sites.filter((i) => i >= host.start && i <= host.end);
    const merge = within(at(OCC_CODE, '_greeksMergeFromCache'));
    const rich = within(middle);
    const log = within(at(OCC_CODE, '_logSnapshot'));
    return merge.length === 1 && rich.length === 1 && log.length === 1 &&
      merge[0] < rich[0] && rich[0] < log[0];
  });
  eq(idiom, [true, true, true],
    'each caller merges the cached greeks, builds the rich snapshot, then logs it — in that order');

  // The middle call is not in the monolith at all: it shipped as a layer.
  ok(!BY_NAME.has(IDIOM_MIDDLE), '_buildRichSnapshot is NOT declared in the monolith…');
  eq(MODULE_OWNERS.get(IDIOM_MIDDLE), IDIOM_MIDDLE_MODULE,
    '…it is owned by js/services/journal-rich-snapshot.js — a layer this programme already shipped');

  eq({
    inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
    outboundWrites: REC.outWrites.length, staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  }, ZERO_DIRECTIONS,
  'five of the seven directions measure zero: no write in, no write through, no write out, no markup');
  eq(REC.deps, MONOLITH_DEPENDENCIES, 'it names five things the monolith declares');
  eq(REC.sib, SIBLING_REFERENCES, 'exactly one shipped module names it');
  {
    const referrers = SIBLINGS.filter((s) => REC.names.some(
      (n) => !s.bound.has(n) && refSites(s.masked, n).length)).map((s) => s.rel);
    eq(referrers, [SIBLING_REFERRER], '…and it is journal-trade-forms.js, calling _greeksMergeFromCache');
  }
  ok(at(OCC_STRINGS, 'rsApplyFilters').length > 0,
    'control — the literal view DOES find rsApplyFilters, so the zero above measures');
  eq(REC.seven, FULL_SEVEN, 'seven directions, total score 12');

  // Every dependency is called, never read at load.
  const bodyMasked = maskLiterals(BODY);
  const bodyFns = functionBodyRanges(BODY);
  const runtimeOnly = REC.deps.every((d) => refSites(bodyMasked, d)
    .every((i) => bodyFns.some((r) => i >= r.start && i <= r.end)));
  ok(runtimeOnly, 'every one of the five is named from inside a function body — runtime, not load time');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. TWO DIRECTIONS THE SCREEN DID NOT HAVE');
// ─────────────────────────────────────────────────────────────────────────────
{
  // EIGHTH — the outbound half of what #444 added inbound.
  eq(REC.outGen.length, OUTBOUND_GENERATED, 'the recommendation generates markup naming nothing outside it');
  eq(REC.eight, FULL_EIGHT, '…so its eight-direction score is its seven-direction score');

  const ticker = profile(TICKER_REGION);
  eq(TICKER_REGION[1] - TICKER_REGION[0], TICKER_UNITS, 'the ticker-search region is 7,371 units');
  eq(ticker.seven, TICKER_SEVEN, '…scoring 9 on the seven directions — better than the recommendation');
  eq(Array.from(new Set(ticker.outGen.map(([n]) => n))).sort(), TICKER_GENERATED_NAMES,
    '…but the rows it builds name four functions that would stay behind');
  eq(ticker.eight, TICKER_EIGHT, '…which puts it at 13, off the shortlist');
  ok(ticker.outGen.every(([, i]) => i >= TICKER_REGION[0] && i < TICKER_REGION[1]),
    'control — every one of those four names is found INSIDE the region, in its own literals');

  // NINTH — a call to something that already left is counted by nothing.
  eq(MODULE_OWNERS.size, SHIPPED_MODULE_NAMES, 'the shipped modules own 726 top-level names');
  eq(Array.from(new Set(REC.outModule.map(([n]) => n))), OUTBOUND_MODULE_NAMES,
    'the recommendation names exactly one of them: buildStreamerSymbol');
  eq(REC.outModule.length, OUTBOUND_MODULE_EDGES, '…twice');
  eq(MODULE_OWNERS.get(OUTBOUND_MODULE_NAMES[0]), OUTBOUND_MODULE_OWNER,
    '…owned by js/utils/option-symbols.js');
  ok(REC.deps.indexOf(OUTBOUND_MODULE_NAMES[0]) < 0,
    '…and `deps` does not carry it, because it ranges over the monolith\'s own declarations');
  eq(REC.nine, FULL_NINE, 'nine directions, total score 14');

  // Both, measured over the whole screen rather than over this one region.
  const sweep = OWNED_REGIONS.map((r) => profile([r.start, r.end]));
  eq(sweep.filter((p) => p.outGen.length).length, REGIONS_WITH_OUTBOUND_GENERATED,
    'NINETEEN of the 92 owner-carrying regions generate markup naming something outside them');
  eq(sweep.reduce((n, p) => n + p.outGen.length, 0), OUTBOUND_GENERATED_EDGES, '…69 edges in all');
  eq(sweep.filter((p) => p.outModule.length).length, REGIONS_WITH_OUTBOUND_MODULE,
    'FIFTY-TWO of them name something that has already left the monolith');
  eq(sweep.reduce((n, p) => n + p.outModule.length, 0), OUTBOUND_MODULE_EDGES_TOTAL,
    '…456 edges, which is what twenty-nine layers look like from the inside');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. REACHABILITY: what none of the nine directions can see');
// ─────────────────────────────────────────────────────────────────────────────
{
  // A declaration named nowhere in production, in ANY view of it.
  const dead = DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return at(OCC_CODE, d.name).filter((i) => !self(i)).length === 0 &&
      at(OCC_STRINGS, d.name).length === 0 &&
      at(OCC_SIB_CODE, d.name).length === 0 &&
      at(OCC_SIB_STRINGS, d.name).length === 0 &&
      at(OCC_MARKUP, d.name).length === 0 &&
      at(OCC_OTHER_INLINE, d.name).length === 0;
  }).sort((a, b) => b.chars - a.chars);

  eq(dead.length, DEAD_DECLS, 'NINETEEN of the 956 top-level declarations are named nowhere in production');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…11,926 units of it');
  ok(DEAD_UNITS * 100 < CODE_CHARS, '…under one per cent of what is left of the monolith');
  eq(dead[0].name, DEAD_LARGEST, 'the largest by far is _buildSnapshot');
  eq(dead[0].chars, DEAD_LARGEST_CHARS, '…6,608 units');
  eq(dead[1].name, DEAD_SECOND, '…against a second-largest of updateStreamerPreview');
  eq(dead[1].chars, DEAD_SECOND_CHARS, '…which is 840, so the first is 7.9× the second');
  ok(dead[0].chars * 2 > DEAD_UNITS, '…and one declaration is more than half of all the dead weight');

  // It is inside the recommendation, and it is most of it.
  ok(dead[0].start > RAW_AT && dead[0].end < RAW_END, '_buildSnapshot is inside the recommended region');
  ok(dead[0].chars * 100 > BODY_CHARS * 60, '…and is more than 60% of its units');
  eq(codeLines(CODE.slice(dead[0].start, dead[0].end + 1)), DEAD_LARGEST_CODE_LINES,
    '…113 of the region\'s 199 lines of code');

  // Scoped exactly: it IS named once, in a test that lists names by area. That
  // is the only thing standing between "unreferenced" and "unreferenced
  // anywhere", and Phase 2 has to update it when the name moves.
  const named = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.js') && refSites(fs.readFileSync(p, 'utf8'), DEAD_LARGEST).length) {
        named.push(path.relative(ROOT, p));
      }
    }
  })(path.join(ROOT, 'tests'));
  eq(named.filter((f) => f !== AUDIT_REL && f !== AUDIT_SPEC_REL).sort(), DEAD_NAMED_IN_TESTS,
    'in the TEST tree — this audit and its own spec aside — it is named exactly once, by the post-EIC area map');

  // The direction that does not exist: nothing in the profile distinguishes
  // "nothing calls it because it is well encapsulated" from "nothing calls it".
  const narrow = profile([RAW_AT, NARROW_END]);
  eq(narrow.names, [DEAD_LARGEST], 'the narrow cut is that declaration and nothing else');
  eq(narrow.inbound, 0, '…and it has zero inbound edges, the best score any direction can give');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Four ends from one start — every seam valid, the score monotone');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The whole table, measured and compared in one go.
  const measured = ENDS.map(({ end }) => {
    const p = profile([RAW_AT, end]);
    return { end, units: end - RAW_AT, owners: p.names.length, nine: p.nine };
  });
  eq(measured, ENDS, 'four ends, their sizes, their owners and their nine-direction scores');
  eq(ENDS[RECOMMENDED_ROW].end, RAW_END, '…the third of which is the recommendation');
  eq(ENDS[RECOMMENDED_ROW].nine, FULL_NINE, '…scoring 14, as §5 measured independently');
  eq(ENDS[0].end, NARROW_END, 'and the first is the narrow cut §6 identified');

  // #448's finding was that ITS middle cut scored WORSE than the wider one.
  // Here it does not: this family costs more the more of it you take, which is
  // what makes the choice a judgement instead of an optimisation.
  const scores = ENDS.map((r) => r.nine);
  eq(scores.slice().sort((a, b) => a - b), scores, 'the score rises monotonically with the size of the cut');

  // And every one of the four is a structurally valid seam, so the mechanical
  // check cannot break the tie the way it did in #448.
  const accepted = ENDS.map(({ end }) => {
    try { return assertSeam(CODE, RAW_AT, snapBodyEnd(CODE, RAW_AT, end)) === end; }
    catch (e) { return e.message; }
  });
  eq(accepted, [true, true, true, true], 'assertSeam accepts ALL FOUR — the seam decides nothing here');
  throwsWith(() => assertSeam(CODE, RAW_AT, snapBodyEnd(CODE, RAW_AT, RAW_END) - 1),
    'EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED',
    'control — a body end one unit short IS refused, so those four acceptances measure');

  // What the screen would recommend if the score were the whole story.
  const above = OWNED_REGIONS.filter((r) => r.end - r.start >= SCREEN_FLOOR_UNITS);
  eq(above.length, REGIONS_ABOVE_FLOOR, 'seventy screened regions carry 3,000 units or more');
  const best = Math.min.apply(null, above.map((r) => profile([r.start, r.end]).nine));
  eq(best, BEST_NINE_ABOVE_FLOOR, '…and the best score among them is 8');
  const narrow = profile([RAW_AT, NARROW_END]);
  ok(narrow.nine < best,
    'the narrow cut beats every one of them — and it is the declaration nothing calls');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads bare and does nothing — unlike the rival its size');
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
  for (const dep of MONOLITH_DEPENDENCIES) {
    ok(!(dep in ctx), '…and ' + dep + ' is not among them: the dependency is called, never defined');
  }

  const watched = [];
  const stub = () => ({
    fetch: () => { watched.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.push('setInterval'); },
    setTimeout: () => { watched.push('setTimeout'); },
    localStorage: { getItem: () => { watched.push('localStorage'); return null; } },
    document: {
      getElementById: (id) => { watched.push('getElementById:' + id); return null; },
      addEventListener: () => { watched.push('document.addEventListener'); },
    },
    window: { addEventListener: () => { watched.push('window.addEventListener'); } },
  });
  const ctx2 = stub();
  vm.createContext(ctx2);
  vm.runInContext(BODY, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer, reads no storage and binds no listener');

  // THE FIELD OF COMPARABLE SIZE, measured rather than recalled.
  const big = OWNED_REGIONS.filter((r) => r.end - r.start >= BIG_REGION_FLOOR)
    .map((r) => ({ start: r.start, end: r.end, nine: profile([r.start, r.end]).nine }))
    .sort((a, b) => a.nine - b.nine);
  eq(big.length, BIG_REGIONS, 'thirty-two regions carry 10,000 units or more');
  eq(big[0].start, RAW_AT, '…and the recommendation is the best-scoring of all of them');
  eq(big[1].start, RUNNER_UP_REGION[0], '…with the RS diagnostics region behind it');
  eq(big[1].nine, RUNNER_UP_NINE, '…at 15');

  // The runner-up is NOT disqualified: it loads bare too. It loses on score,
  // and on how much code it carries per point of coupling. Saying otherwise
  // would be the mistake CLAUDE.md records four times over — a claim inferred
  // from the region that came to mind rather than from the field.
  const runnerBody = CODE.slice(RUNNER_UP_REGION[0],
    snapBodyEnd(CODE, RUNNER_UP_REGION[0], RUNNER_UP_REGION[1]));
  const runnerCtx = {};
  vm.createContext(runnerCtx);
  vm.runInContext(runnerBody, runnerCtx);
  ok(Object.keys(runnerCtx).length > 0, 'the runner-up loads in an empty VM as well…');
  eq(codeLines(runnerBody), RUNNER_UP_CODE_LINES, '…carrying 130 lines of code to this region\'s 199');
  ok(CODE_LINES / FULL_NINE > RUNNER_UP_CODE_LINES / RUNNER_UP_NINE,
    '…so the recommendation carries more code per point of coupling');

  // THE RIVAL. Third by score among those thirty-two, and the one that is
  // disqualified on what it does while being loaded rather than on coupling.
  const rival = profile(RIVAL_REGION);
  eq(big[2].start, RIVAL_REGION[0], 'LOGIN & INIT is third of the thirty-two by score');
  eq(RIVAL_REGION[1] - RIVAL_REGION[0], RIVAL_UNITS, 'LOGIN & INIT is 10,298 units');
  eq(rival.nine, RIVAL_NINE, '…scoring 22');
  const rivalBody = CODE.slice(RIVAL_REGION[0], snapBodyEnd(CODE, RIVAL_REGION[0], RIVAL_REGION[1]));
  const rivalOwners = scanTopLevelDeclarations(rivalBody);
  const rivalBlanked = Array.from(rivalBody);
  for (const d of rivalOwners) for (let i = d.start; i <= d.end; i++) rivalBlanked[i] = ' ';
  eq(codeLines(rivalBlanked.join('')), RIVAL_STATEMENT_LINES,
    '…and carries NINETY top-level statement lines against this region\'s zero');
  const rivalWatched = [];
  const ctx3 = stub();
  ctx3.document.getElementById = (id) => { rivalWatched.push(id); return null; };
  vm.createContext(ctx3);
  let rivalError = null;
  try { vm.runInContext(rivalBody, ctx3); } catch (e) { rivalError = e.message; }
  eq(rivalError, RIVAL_LOAD_ERROR, 'loading it in a stubbed VM THROWS…');
  eq(rivalWatched[0], RIVAL_FIRST_DOM_CALL, '…on the launch button it reaches for while being evaluated');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The chain it would join');
// ─────────────────────────────────────────────────────────────────────────────
{
  const NEWEST = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = new Function('MODULE_REL',
    `return ${NEWEST.match(/^const CHAIN = (\[[\s\S]*?^\]);$/m)[1]};`
  )(NEWEST.match(/^const MODULE_REL = '([^']+)';$/m)[1]);
  eq(CHAIN.length, CHAIN_LAYERS, 'twenty-nine layers ship today, read from the newest contract');
  eq(Number(NEWEST.match(/^const CHAIN_LENGTH = (\d+);$/m)[1]), CHAIN_LAYERS,
    '…and the CHAIN_LENGTH it pins agrees with the list it ships');
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, '…and none of them is the file Phase 2 would write');

  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length)
    .concat([BODY_CHARS]).sort((a, b) => a - b);
  eq(sizes.indexOf(BODY_CHARS) + 1, SIZE_RANK_IF_CUT,
    'cut, it would rank seventeenth of thirty by size — no superlative moves');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…against a largest of 71,811');
  eq(sizes[0], SMALLEST_LAYER_CHARS, '…and a smallest of 1,761, which it does not displace either');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Production is byte-identical to the base');
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
section('11. The change set, and the budget held flat');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();

  ok(changed.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  ok(changed.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite ratchets by one: 157 files before, 158 after');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length,
    BASE_TEST_FILE_COUNT, '…and 157 is what the base actually carried');

  // THE RETIREMENTS, counted from the specs as they stood at the base.
  const CALL = /\b(?:eq|ok|throwsWith|throws|deepStrictEqual|strictEqual)\s*\(/g;
  for (const r of RETIREMENTS) {
    ok(changed.indexOf(r.spec) >= 0, r.spec + ' is part of the change');
    ok(!fs.existsSync(path.join(ROOT, r.spec)), '…and is gone from the tree');
    // EVALUATED, not counted with a regex. `/^\s*\{ id: /gm` misses an entry
    // whose `{ id:` is not first on its line, and scanner-ivr's spec had one:
    // the regex said 58 where the loader — and therefore the budget — said 59.
    // A retirement credited with one mutant fewer than it carried would make
    // the arithmetic below quietly wrong in the safe-looking direction.
    eq(specMutants(git(['show', BASE_SHA + ':' + r.spec])), r.mutants,
      '…having carried the pinned number of mutants when it existed');
    ok(fs.existsSync(path.join(ROOT, r.contract)), 'the contract it targeted still ships');
    const before = git(['show', BASE_SHA + ':' + r.contract]);
    const after = fs.readFileSync(path.join(ROOT, r.contract), 'utf8');
    eq((after.match(CALL) || []).length, (before.match(CALL) || []).length,
      '…with exactly as many assertions as before: the spec retired, not the contract');
    ok(/ok\(!fs\.existsSync\(path\.join\(ROOT, CONTRACT_SPEC_REL\)\)/.test(after),
      '…and its spec-existence assertion is now its NEGATION, so the retirement is executed');
  }

  // THE BUDGET, as arithmetic rather than as a claim. What this cycle adds is
  // the audit spec; what it removes is the two retirements; the ceiling does
  // not move.
  {
    const auditSpec = require('./mutation-specs/snapshot-helpers-audit.spec.js');
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared 237 mutants');
    eq(declaredNow,
      BASE_DECLARED_MUTANTS - RETIREMENTS.reduce((n, r) => n + r.mutants, 0) + auditSpec.mutants.length,
      '…and this change declares exactly that, less the two retirements, plus this audit\'s spec');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250 — the retirements paid, not the budget');
    ok(declaredNow < budgetNow, '…and the declared total is under it');
    eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  }

  // THE SUITE-COUNT RATCHET, which every Phase 1 audit pays across the chain.
  {
    const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /\.test\.js$/.test(f) && f !== path.basename(AUDIT_REL))
      .filter((f) => /^const TEST_FILE_COUNT = \d+;$/m.test(
        fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(contracts.length, RATCHETED_CONTRACTS, 'NINETEEN contracts pin the suite file count');
    const RATCHETED = new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm');
    ok(contracts.every((f) => RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
      '…and every one of them reads the ratcheted count, none left behind');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('SNAPSHOT_HELPERS_AUDIT_OK');
