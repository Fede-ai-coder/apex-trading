'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL MAP AUDIT — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [719625,723944) in monolith coordinates — 4,319 raw units,
// THREE top-level owners: `_journalMapAuditEnabled` (306),
// `_journalMapAuditSummarize` (2,024) and `_journalMapAudit` (924). They are the
// whole of the `[JOURNAL-PORTFOLIO-MAP-AUDIT]` feature: a gated diagnostic that
// checks the journal-trade → portfolio-position mapping and, by default, says
// nothing. ONE consumer, ONE monolith dependency, zero in every other direction.
// It loads in an empty VM and runs nothing while it loads.
//
// ── THIS AUDIT'S FINDING: THE SCREEN'S OWN TOP PICK CUTS A FEATURE IN HALF ──
//
// Ranked by the consumer reading, the best candidate this screen produces is
// [719173,722863) — 3,690 units, `byConsumer` 1, no dependencies. It is the
// runner-up the LAST cycle's contract already names. Taking it would be wrong
// twice, and §5 executes both.
//
// IT STARTS AT THE WRONG BANNER. 719173 is the `// ═══ PORTFOLIO MANAGER —
// state + CRUD ═══` SECTION header, 452 units before the feature's own
// `// ── [JOURNAL-PORTFOLIO-MAP-AUDIT]` banner. The prose in between describes
// `positionManager` and `_tradeAsPosition` — neither of which is in the region,
// and one of which is the region's own consumer. That is the hazard the
// programme already recorded: taking the screening rule as the boundary
// swallowed 551 units of the next feature at the trade-detail cut.
//
// IT STOPS ONE OWNER SHORT, AND THAT IS WHY IT SCORES WELL. `_journalMapAudit`
// is this feature's own logging wrapper — the entry point the rest of the
// application calls. The screen reads it as "the consumer" and scores the
// region `byConsumer` 1. Include it, as the feature does, and the reading is 2:
// one real external consumer and one real dependency.
//
// SO THE SCORE IS NOT COMPARABLE ACROSS CUTS OF DIFFERENT WIDTHS. Widening a cut
// can only raise it — the absorbed owner brings its own callers and its own
// dependencies, and the edges that used to cross the boundary stop counting. A
// low consumer score is therefore partly a fact about WHERE THE CUT WAS MADE and
// not only about how coupled the region is. The score ranks candidates; it does
// not choose boundaries. §5 drives that directly: it re-scores this feature at
// four widths and shows the reading moving with the width alone.
//
// AND THE OBVIOUS FIX IS FALSE. "Do not cut inside a `// ── ` banner region"
// looks like the rule that would have caught this, and it is refuted by the
// cycle immediately before this one: #459 cut `_mergeBatchInto` and left its
// consumer `fetchPortfolioTechnicalRefresh` behind, and BOTH sit under the same
// `// ── [PortfolioRefreshPayload]` banner. That cut was right. §5 reconstructs
// the pre-#459 document through the shipped undo helpers and executes the
// counterexample rather than describing it, so this becomes the THIRD dead
// boundary rule the programme has written down and measured away.
//
// THE FEATURE-COMPLETE REGION IS NOT REACHABLE BY THE SCREEN AT ALL, which §5
// also executes. The run generator starts a run only at a banner-region start or
// at a top-level declaration; 719625 is a banner INSIDE a larger section, so no
// run begins there. The screen could not have proposed this region however it
// were ranked. That is not a bug to fix in the screen — it is the reason the
// boundary is a judgement this audit publishes and defends.
//
// ── WHAT THE SCREEN FOUND ───────────────────────────────────────────────────
//
// 7,625 owner runs, 2,048 refused by `assertSeam`, 3,258 distinct candidates,
// 2,007 of which run nothing at load. THREE have a coupling that is exactly one
// consumer, down from five at the previous base — the layer #461 extracted was
// among those five, and §6 counts the survivors rather than explaining the
// difference. 135 have one consumer and more than one site, so the #458
// refinement still separates about a fifteenth of the set.
//
// ── WHAT THIS CANDIDATE IS ──────────────────────────────────────────────────
//
// `_journalMapAuditEnabled()` reads two opt-in flags and returns false when
// neither is set; `_journalMapAuditSummarize(t, diags)` folds per-leg
// diagnostics into a summary plus an anomaly list; `_journalMapAudit(t, legs)`
// is the wrapper that calls both and either logs verbosely or emits one compact
// warning. §7 calls all three, and §7 gives `_journalMapAuditEnabled` a control
// on inputs where the answer DIFFERS — a metric whose true value is `false`
// needs one, or `return false` is indistinguishable from reading the flags.
//
// ITS ONE DEPENDENCY IS REAL AND DISTANT. `optionLegScalarDiagnostics` lives
// 195,735 units away under a different banner, so absorbing it is not on the
// table; the module would call it at call time, which is the ordinary case this
// chain already carries in ten shipped contracts. §3 pins the list as exactly
// that one name.
//
// ── THE RETIREMENT: THERE ISN'T ONE, AND THAT IS THE POINT ──────────────────
//
// Specs have been retired in chain order since #446 — not once per PR, which is
// worth stating carefully because #453, #455 and #457 retired none at all. What
// IS true is that the queue is now EMPTY: the only layer contract spec left is
// the NEWEST layer's, and the programme's rule is that the newest contract
// always carries one. So this cycle retires nothing, and §10 asserts the
// arithmetic that makes that safe rather than asserting the absence — base, plus
// this audit's spec, still under a ceiling that has not moved.
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
// The #459 counterexample in §5 is measured on the document that cut actually
// faced, reconstructed by the shipped undo helpers rather than remembered.
const ALIGNMENT_DEBUG_U = require('./lib/portfolio-technical-alignment-debug-undo.js');
const TECHNICAL_MERGE_U = require('./lib/portfolio-technical-merge-undo.js');

const MODULE_REL_IF_CUT = 'js/services/journal-map-audit.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '0beea2b';
const BASE_CHARS = 1500455;
const BASE_UTF8 = 1529269;
const BASE_LF = 25982;
const BASE_SHA256 = '361533f1892dd215b00620c0537cd1337a05177eac5a9929c6378cec09dd29eb';
const LOCAL_SCRIPTS = 79;
const BASE_TEST_FILE_COUNT = 163;
const TEST_FILE_COUNT = 164;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-journal-map-audit-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/journal-map-audit-audit.spec.js';
const RATCHETED_CONTRACTS = 25;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const NEWEST_CONTRACT = 'tests/portfolio-technical-alignment-debug-boundary-contract.test.js';
const NEWEST_CONTRACT_SPEC = 'tests/mutation-specs/portfolio-technical-alignment-debug-contract.spec.js';
const BASE_DECLARED_MUTANTS = 88;
const MUTANT_BUDGET = 250;
const LAYER_CONTRACT_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114613;
const CODE_CHARS = 1385816;
const TOP_LEVEL_DECLS = 943;
const TOP_LEVEL_BANNERS = 223;
const OWNER_REGIONS = 121;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 719625;
const RAW_END_IN_CODE = 723944;
const BODY_END_IN_CODE = 723943;
const RAW_CHARS = 4319;
const BODY_CHARS = 4318;
const BODY_UTF8 = 4364;
const BODY_LF = 91;
const BODY_SHA256 = 'd75228b8db66a0363f7fe5cc9028848a8e79cbc96941b76b5194f2c98b9b307b';
const BODY_ENDING = '}\n';
const FEATURE_BANNER = '// ── [JOURNAL-PORTFOLIO-MAP-AUDIT] — gated mapping diagnostics ─────────────────';
const OWNERS_EXPECTED = ['_journalMapAuditEnabled', '_journalMapAuditSummarize', '_journalMapAudit'];
const OWNER_COUNT = 3;
const FUNCTION_OWNERS = 3;
const OWNER_SIZES = [306, 2024, 924];
const CODE_LINES = 67;
const TOTAL_LINES = 92;
const COMMENT_LINES = 25;
const OPENING_COMMENT_LINES = 22;
const NET_REDUCTION = 4260;
const RESIDUAL_MONOLITH = 1381497;
const INDEX_AFTER = 1496195;
const TAG_GAP = 719633;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [727567];
const EDGE_HOSTS = ['positionManager'];
const DISTINCT_CONSUMERS = 1;
const MONOLITH_DEPENDENCIES = ['optionLegScalarDiagnostics'];
const DEPENDENCY_AT = 915360;
const DEPENDENCY_DISTANCE = 195735;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 2;
const BY_CONSUMER = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 3;
const LAYERS_WITH_A_DEPENDENCY = 10;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7625;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3258;
const CLEAN_CANDIDATES = 2007;
const ONE_CONSUMER_CANDIDATES = 3;
const ONE_CONSUMER_MULTI_SITE = 135;

// ── THE FINDING: the screen's top pick, and the four widths ──────────────────
// The section header the screen's run begins on, and the feature's own banner
// 452 units later. The prose between them belongs to neither owner in the pick.
const SECTION_HEADER_AT = 719173;
const BANNER_OFFSET = 452;
const SECTION_HEADER_TEXT = '// ═══════════════════════════════════════════════════════════════';
// EVERY top-level declaration the section prose names — the WHOLE set, not a
// sample. #462's pass found the sampled version survived a mutant that simply
// dropped an element: a loop over a list checks each member and never the
// list's completeness.
const FOREIGN_PROSE_NAMES = ['aggregateGreeks', 'journalManager', 'positionManager',
  'refreshPositionsLive', 'renderPositionsPanel'];
// The same feature scored at four widths. Only the width changes.
const WIDTH_SCREEN_PICK = { at: 719173, end: 722863, units: 3690, owners: 2, consumers: 1, deps: 0, byConsumer: 1 };
const WIDTH_OWN_BANNER_2 = { at: 719625, end: 722863, units: 3238, owners: 2, consumers: 1, deps: 0, byConsumer: 1 };
const WIDTH_RECOMMENDED = { at: 719625, end: 723943, units: 4318, owners: 3, consumers: 1, deps: 1, byConsumer: 2 };
const WIDTH_SECTION_PLUS_3 = { at: 719173, end: 723943, units: 4770, owners: 3, consumers: 1, deps: 1, byConsumer: 2 };
const INTERNAL_SITES = [723081, 723252];
const WRAPPER_NAME = '_journalMapAudit';
// The dead rule, and the cycle that refutes it.
const DEAD_RULE_LAYER = 'js/portfolio/portfolio-technical-merge.js';
const DEAD_RULE_REGION_OWNER = '_mergeBatchInto';
const DEAD_RULE_CONSUMER = 'fetchPortfolioTechnicalRefresh';
const DEAD_RULE_SHARED_BANNER = true;

// ── Where this layer would sit ───────────────────────────────────────────────
const CHAIN_LENGTH = 35;
const SIZE_RANK_IF_CUT = 5;
const SMALLEST_LAYER_CHARS = 1761;
const LARGEST_LAYER_CHARS = 71811;
const PURE_ASCII_LAYERS = 2;
const UNDOCUMENTED_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 19;

// ── Reachability at this base ────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
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

console.log('JOURNAL MAP AUDIT — TEMPORARY BOUNDARY AUDIT');
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
  'IT OPENS ON THE FEATURE\'S OWN BANNER, not on a declaration and not on the section header');
ok(/[^\x00-\x7F]/.test(BODY),
  'it is NOT pure ASCII — the banner\'s box-drawing rule alone settles that');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0].start;
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  ok(next > RAW_END_IN_CODE,
    'the next top-level owner begins AFTER the raw span, with no banner between — the '
    + '`tt-reconnect` shape, where "extend to the next header" would swallow the next feature');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly these three names');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…all three functions');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes, in declaration order');
  const lines = BODY.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment: this region is heavily documented, '
    + 'unlike the two layers before it');
}
// What the move would cost, predicted before it happens.
eq(BASE_CHARS - INDEX_AFTER, NET_REDUCTION,
  'index.html would fall by NET_REDUCTION units net: the span leaves and a tag arrives');
eq(RAW_CHARS - NET_REDUCTION,
  ('<script src="./' + MODULE_REL_IF_CUT + '"></script>\n').length,
  '…and the difference is exactly the tag line this layer would add');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, 'the monolith would be left at RESIDUAL_MONOLITH units');
// TAG_GAP, derived rather than asserted against itself. The new tag would be
// inserted immediately BEFORE the inline monolith opens — that is where every
// layer's tag has gone — so its offset in the extracted document is the inline
// open's offset in this one, and the gap follows from the region's own offset.
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
  'it depends on exactly ONE monolith declaration, named rather than counted');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen, outboundModule: REC.outModule,
}, ZERO_DIRECTIONS,
'the other EIGHT directions measure zero: no write in, none through, none out, no markup '
  + 'either way, no sibling module, and nothing that already left');
eq(REC.nine, FULL_NINE, 'nine directions, total score 2 — one inbound site and one dependency');
eq(byConsumer(REC), BY_CONSUMER, '…and the consumer reading agrees at BY_CONSUMER');
eq(FULL_NINE, BY_CONSUMER,
  'THE TWO READINGS AGREE HERE, because the one inbound edge is one site AND one consumer — '
  + 'this region is not one of the set the #458 refinement separates');
// The dependency is real and too far away to absorb.
{
  const d = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  ok(d, MONOLITH_DEPENDENCIES[0] + ' is a monolith declaration…');
  eq(d.start, DEPENDENCY_AT, '…at DEPENDENCY_AT');
  eq(d.start - RAW_AT_IN_CODE, DEPENDENCY_DISTANCE,
    '…DEPENDENCY_DISTANCE units away, under a different banner, so absorbing it is not on '
    + 'the table and the module would call it at call time');
  ok(bannerOf(d.start) !== bannerOf(RAW_AT_IN_CODE),
    '…which the banner governing each of them confirms: they are different');
  eq(SIBLINGS.filter((s) => s.owners.indexOf(MONOLITH_DEPENDENCIES[0]) >= 0).map((s) => s.rel), [],
    '…and no already-extracted module owns that name either');
}
// A runtime dependency is the ORDINARY case, counted over the shipped set rather
// than asserted from the layers nearest to hand.
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
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, so '
    + 'having one is the ordinary case and this region is not the exception it would be '
    + 'without that count');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. What the feature is, and that the consumer is outside it');
// ─────────────────────────────────────────────────────────────────────────────
{
  const wrapper = BY_NAME.get(WRAPPER_NAME);
  ok(wrapper.start >= RAW_AT_IN_CODE && wrapper.end < RAW_END_IN_CODE,
    'the wrapper ' + WRAPPER_NAME + ' is INSIDE the recommended region…');
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…and the one consumer is declared outside it');
  // The three owners form one connected graph — unlike the last layer, whose two
  // owners were strangers. Stated as a measurement, not as a virtue.
  const bodies = OWNERS_EXPECTED.map((n) => {
    const d = BY_NAME.get(n);
    return maskLiterals(CODE.slice(d.start, d.end + 1));
  });
  eq(refSites(bodies[2], OWNERS_EXPECTED[0]).length > 0, true,
    'the wrapper names ' + OWNERS_EXPECTED[0] + '…');
  eq(refSites(bodies[2], OWNERS_EXPECTED[1]).length > 0, true, '…and ' + OWNERS_EXPECTED[1]);
  eq(refSites(bodies[0], OWNERS_EXPECTED[2]).length, 0,
    '…while neither of them names the wrapper back, so the graph is a star and not a cycle');
  ok(refSites(bodies[0], OWNERS_EXPECTED[1]).length === 0,
    'control — the two leaves do not name each other either, so "connected" here rests '
    + 'entirely on the wrapper this cut keeps');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE FINDING: the screen\'s own top pick cuts this feature in half');
// ─────────────────────────────────────────────────────────────────────────────
// (a) It starts at the SECTION header, not at the feature's banner.
{
  eq(RAW_AT_IN_CODE - SECTION_HEADER_AT, BANNER_OFFSET,
    'the screen\'s run begins BANNER_OFFSET units before the feature\'s own banner');
  eq(CODE.slice(SECTION_HEADER_AT, SECTION_HEADER_AT + SECTION_HEADER_TEXT.length),
    SECTION_HEADER_TEXT, '…on a `═══` SECTION rule, which is a different kind of mark');
  const between = CODE.slice(SECTION_HEADER_AT, RAW_AT_IN_CODE);
  eq(between.split('\n').filter((l) => !isBlankOrComment(l)).length, 0,
    '…and every line between the two is comment or blank: it is prose, not code');
  eq(DECLS.filter((d) => refSites(between, d.name).length > 0).map((d) => d.name).sort(),
    FOREIGN_PROSE_NAMES.slice().sort(),
    '…prose naming EXACTLY these top-level declarations — the whole set, so dropping one '
    + 'from the pin fails rather than merely looping less');
  for (const n of FOREIGN_PROSE_NAMES) {
    ok(OWNERS_EXPECTED.indexOf(n) < 0, n + ' is not one of this feature\'s owners');
  }
  eq(FOREIGN_PROSE_NAMES.filter((n) => OWNERS_EXPECTED.indexOf(n) >= 0), [],
    '…so the 452 units the screen would drag in describe other code entirely');
  ok(FOREIGN_PROSE_NAMES.indexOf(EDGE_HOSTS[0]) >= 0,
    'one of those names IS this region\'s own consumer, so the pick would ship a paragraph '
    + 'describing the caller it leaves behind');
}
// (b) It stops one owner short, and that is WHY it scores well.
{
  const widths = [WIDTH_SCREEN_PICK, WIDTH_OWN_BANNER_2, WIDTH_RECOMMENDED, WIDTH_SECTION_PLUS_3];
  for (const w of widths) {
    const p = profileOf([w.at, w.end]);
    eq(w.end - w.at, w.units, 'width [' + w.at + ',' + w.end + ') is ' + w.units + ' units');
    eq(DECLS.filter((d) => d.start >= w.at && d.end < w.end).length, w.owners, '…with ' + w.owners + ' owners');
    eq(consumersOf(p).length, w.consumers, '…' + w.consumers + ' consumer');
    eq(p.deps.length, w.deps, '…' + w.deps + ' dependency');
    eq(byConsumer(p), w.byConsumer, '…and byConsumer ' + w.byConsumer);
    ok(runsNothingAtLoad(loadTimeProfile(w.at, w.end)), '…and all four run nothing at load');
  }
  // THE POINT: the reading moves with the WIDTH, on the same feature.
  ok(WIDTH_SCREEN_PICK.byConsumer < WIDTH_RECOMMENDED.byConsumer,
    'the narrower cut scores BETTER than the feature it is a part of');
  eq(WIDTH_SCREEN_PICK.owners + 1, WIDTH_RECOMMENDED.owners,
    '…and the only difference is one owner');
  const narrow = profileOf([WIDTH_SCREEN_PICK.at, WIDTH_SCREEN_PICK.end]);
  eq(narrow.sites, INTERNAL_SITES,
    'the narrow cut\'s inbound edges are INTERNAL_SITES — both inside the wrapper it excluded');
  eq(consumersOf(narrow), [WRAPPER_NAME],
    '…so the "consumer" it scores against IS this feature\'s own wrapper');
  for (const s of INTERNAL_SITES) {
    ok(s >= RAW_AT_IN_CODE && s < RAW_END_IN_CODE,
      '…and site ' + s + ' lies INSIDE the recommended region, so the edge is internal to the '
      + 'feature and vanishes once the cut is made whole');
  }
  eq(profileOf([WIDTH_RECOMMENDED.at, WIDTH_RECOMMENDED.end]).sites.filter(
    (s) => INTERNAL_SITES.indexOf(s) >= 0), [],
  'and the whole-feature profile counts NEITHER of them, which is the mechanism: widening '
    + 'a cut deletes the edges it used to cross');
}
// (c) The obvious rule that would catch it is FALSE, and the counterexample is
//     the cycle immediately before this one — executed, not remembered.
{
  ok(bannerOf(BY_NAME.get(OWNERS_EXPECTED[0]).start) === bannerOf(BY_NAME.get(WRAPPER_NAME).start),
    'HERE the region and its apparent consumer share one banner, which invites the rule '
    + '"never cut inside a banner region"');
  // Reconstruct the document #459 actually faced, newest-first, through the
  // shipped undo helpers rather than a remembered copy.
  let old = ALIGNMENT_DEBUG_U.undoPortfolioTechnicalAlignmentDebug(
    INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-alignment-debug.js'), 'utf8'));
  old = TECHNICAL_MERGE_U.undoPortfolioTechnicalMerge(
    old, fs.readFileSync(path.join(ROOT, DEAD_RULE_LAYER), 'utf8'));
  eq(sha256(old), TECHNICAL_MERGE_U.BASE_SHA256,
    '…the pre-#459 document, reached byte for byte by two undo helpers that ship green');
  const oldTags = APP_LOADER.parseScriptTags(old);
  const oldCode = oldTags.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  const oldDecls = scanTopLevelDeclarations(oldCode);
  const oldMarks = topLevelBanners(oldCode, functionBodyRanges(oldCode)).slice().sort((a, b) => a - b);
  const oldBy = new Map(oldDecls.map((d) => [d.name, d]));
  const region = oldBy.get(DEAD_RULE_REGION_OWNER);
  const consumer = oldBy.get(DEAD_RULE_CONSUMER);
  ok(region && consumer, 'both the #459 region and its consumer are in that document');
  eq(bannerOf(region.start, oldMarks) === bannerOf(consumer.start, oldMarks), DEAD_RULE_SHARED_BANNER,
    'THEY SHARE A BANNER TOO — and #459 cut between them, correctly. So "never cut inside a '
    + 'banner region" is FALSE, and is pinned here as dead rather than adopted');
  ok(fs.existsSync(path.join(ROOT, DEAD_RULE_LAYER)),
    '…which the shipped module proves: that cut is in production');
}
// (d) The screen could not have proposed the recommendation however it ranked.
{
  const startsRunsAt = new Set();
  for (const r of REGIONS) {
    startsRunsAt.add(r.start);
    for (const d of DECLS.filter((x) => x.start >= r.start && x.end < r.end)) startsRunsAt.add(d.start);
  }
  ok(startsRunsAt.has(SECTION_HEADER_AT), 'the screen can begin a run at the section header…');
  ok(!startsRunsAt.has(RAW_AT_IN_CODE),
    '…and CANNOT begin one at the feature\'s own banner: a run starts at a region start or at '
    + 'a declaration, and this banner is neither');
  ok(DECLS.every((d) => d.start !== RAW_AT_IN_CODE), '…because no declaration begins there');
  ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0,
    '…though it IS a banner the screen knows about, which is what makes the gap structural '
    + 'rather than an oversight');
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
  eq(clean.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_CANDIDATES,
    'ONE_CONSUMER_CANDIDATES have a coupling that is exactly one consumer and nothing else');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE have one consumer and more than one site, so the #458 refinement '
    + 'still separates part of the set');
  // The screen's own answer, named rather than left implicit.
  const best = clean.filter((c) => byConsumer(c.p) === 1).sort((a, b) => b.units - a.units)[0];
  eq([best.lo, best.hi], [WIDTH_SCREEN_PICK.at, WIDTH_SCREEN_PICK.end],
    'and the screen\'s top-ranked candidate is the one §5 takes apart');
  eq(best.units, WIDTH_SCREEN_PICK.units, '…at WIDTH_SCREEN_PICK units');
  // And it is the region the PREVIOUS cycle's contract already names as its
  // runner-up, which is checked against that file rather than recalled.
  {
    const prev = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
    eq(Number(prev.match(/^const RUNNER_UP_UNITS = (\d+);$/m)[1]), WIDTH_SCREEN_PICK.units,
      'the newest contract pins RUNNER_UP_UNITS at exactly the width the screen picks here');
    eq(prev.match(/^const RUNNER_UP_OWNERS = (\[[^\]]*\]);$/m)[1].replace(/'/g, '"'),
      JSON.stringify(OWNERS_EXPECTED.slice(0, 2)).replace(/","/g, '", "'),
      '…and names its owners as the first two of this feature\'s three, which is the same '
      + 'cut, recorded a cycle before it was taken apart');
  }
  ok(!clean.some((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE),
    '…and the recommendation is NOT in the candidate set, as §5(d) explains');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, does nothing at load, and all three owners run');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'it loads in a COMPLETELY empty VM, defining all three globals');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
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
    console: { log() {}, warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(watched, [],
    'loading it performs no fetch, starts no timer, reads no storage and binds no listener — '
    + 'note it reads localStorage when CALLED, which is exactly the distinction');
  const ctl = [];
  const ctx2 = { setTimeout: () => { ctl.push('setTimeout'); } };
  vm.createContext(ctx2);
  vm.runInContext('setTimeout(function(){}, 0);', ctx2);
  eq(ctl, ['setTimeout'], 'control — the same watcher records a call when there is one to record');
}
// ALL THREE ARE CALLED. A feature that loads bare but throws on its own shape
// would satisfy every clause above.
const mkCtx = (over) => {
  const c = Object.assign({
    console: { log() {}, warn() {}, error() {}, debug() {} },
    localStorage: { getItem: () => null }, window: {},
    Math, JSON, Array, String, Object,
    optionLegScalarDiagnostics: (tk, id, idx) => ({ ticker: tk, tradeId: id, legIndex: idx, anomalies: [] }),
  }, over);
  vm.createContext(c);
  vm.runInContext(BODY, c);
  return c;
};
{
  // The gate's true value is `false`, so it needs inputs where the answer DIFFERS.
  eq(mkCtx({})._journalMapAuditEnabled(), false, 'with no flag set the audit is OFF, as shipped');
  eq(mkCtx({ window: { APEX_DEBUG_JOURNAL_MAP: true } })._journalMapAuditEnabled(), true,
    'control — the window flag turns it ON, so the gate reads the flag rather than returning false');
  eq(mkCtx({ localStorage: { getItem: (k) => (k === 'APEX_DEBUG_JOURNAL_MAP' ? '1' : null) } })
    ._journalMapAuditEnabled(), true,
  'control — and so does the localStorage flag, which is the second documented path');
}
{
  const c = mkCtx({});
  const trade = { ticker: 'SPY', id: 't1' };
  const sum = c._journalMapAuditSummarize(trade, [{ ticker: 'SPY', tradeId: 't1', legIndex: 0, anomalies: [] }]);
  eq(Object.keys(sum).sort(), ['anomalies', 'summary'],
    'the summariser returns a summary and an anomaly list, which is the shape its wrapper reads');
  ok(Array.isArray(sum.anomalies), '…the anomalies being an array');
  ok(sum.anomalies.length > 0,
    '…and a trade with no portfolioId IS flagged, so the summariser is measuring rather than '
    + 'returning an empty list');
  eq(sum.anomalies.map((a) => a.kind).indexOf('missing-portfolioId') >= 0, true,
    '…naming the missing field it found');
  const quiet = [];
  const c2 = mkCtx({ console: { log() {}, warn: () => quiet.push('warn'), error() {}, debug: () => quiet.push('debug') } });
  c2._journalMapAudit(trade, [{}]);
  eq(quiet, ['warn'],
    'and the wrapper runs: with the gate OFF and an anomaly present it emits exactly one '
    + 'compact warning, and no verbose debug output');
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
    '…and NONE of the three owners is among them: the feature is live code');
}
{
  const chainSrc = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = chainSrc.match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
    .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
    .map((l) => l.replace(/^'|',?$/g, ''));
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, '…and this one is not in it yet');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    'this cut would rank SIZE_RANK_IF_CUT of thirty-six by size: neither end of the chain');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < LARGEST_LAYER_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  // Counts, not adjectives — the two the last cycle introduced, plus the one
  // this region's opening line makes relevant.
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'PURE_ASCII_LAYERS shipped layers are pure ASCII');
  ok(/[^\x00-\x7F]/.test(BODY), '…and this region would NOT join them, so that count is unchanged');
  eq(sources.filter((s) => s.split('\n').filter((l) => /^\s*\/\//.test(l)).length === 0).length,
    UNDOCUMENTED_LAYERS, 'UNDOCUMENTED_LAYERS carry no comment line at all');
  ok(BODY.split('\n').filter((l) => /^\s*\/\//.test(l)).length > 0,
    '…and this one would not join those either: it is the opposite case');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(CHAIN_LENGTH - LAYERS_OPENING_ON_BANNER > 0,
    '…and the rest do not, so opening on one is neither a rule nor a first');
  ok(/^\/\/ ── /.test(BODY.split('\n')[0]),
    '…and this region would open on one, which is why §2 pins its exact text');
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

    const auditSpec = require('./mutation-specs/journal-map-audit-audit.spec.js');
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared BASE_DECLARED_MUTANTS mutants');
    eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length,
      '…and this change declares exactly that PLUS this audit\'s spec, with nothing subtracted');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow,
      '…and the declared total is under it, which is what makes retiring nothing safe rather '
      + 'than merely convenient');
    eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('JOURNAL_MAP_AUDIT_AUDIT_OK');
