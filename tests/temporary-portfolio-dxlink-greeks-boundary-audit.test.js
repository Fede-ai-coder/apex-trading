'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DXLINK GREEKS — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. The portfolio position-greeks pair, [68843,75365) in
// monolith coordinates: 6,522 units in TWO owners, one of them async.
//
//     0 external executable edges — NOTHING in the monolith names either owner
//     0 references from generated markup
//     0 inbound writes (vacuous — the region owns no binding)
//     0 outbound writes on any monolith-owned binding — NOT vacuous, see §5
//     0 top-level statement lines, and `evaluationTimeReads` is EMPTY
//     1 monolith dependency, `logEv`, used three times, all at call time
//     it loads in a COMPLETELY empty VM, defining exactly its two owners
//
// WHAT §2 MEASURES, scoped to the screen it measures and no further. Of the
// 101 banner-to-banner regions that own declarations AT THIS BASE, exactly
// FIVE score zero crossings. This candidate is not the only one of the five —
// a first draft of this header called it "the first region in the programme to
// score zero on both axes", which is a superlative over twenty-four shipped
// layers that nothing here measures, and false about this base besides. What
// IS measured: of those five, the two with the fewest monolith dependencies —
// zero and one — are ADJACENT and are one feature. That adjacency is the
// finding; joining them is the recommendation.
//
// WHY THE LAST FIVE AUDITS DID NOT SEE IT. Each of them applied an 8,000-unit
// size floor BEFORE ranking by coupling, and §2 asserts what that costs at this
// base: of the five zero-crossing regions, NONE clears it — the largest is
// 7,371 units. The floor did not merely rank this region low, it removed it
// from the screen, along with every other zero-coupling region in the monolith.
//
// FIVE, not "every screen since #420" — which is what this header said until
// the prose check ran git over the audits themselves. §2b pins the five commits
// that carried `SCREEN_FLOOR = 8000` and the one before them that did not, so
// the count is executed rather than recalled. CLAUDE.md says targets are chosen
// on coupling, not size; a size floor applied before the coupling measurement
// inverts that, and it had been in force for five consecutive cycles.
//
// THE OUTBOUND ZERO IS A MEASUREMENT, NOT AN ABSENCE OF WRITES. The previous
// cycle had to correct the outbound phrasing it inherited — "all writes are by
// key" was true of the rich async snapshot and false of the prefetch — so this
// one states the shape exactly rather than carrying anything over: the region
// performs FIFTEEN property writes. Every one lands on a base the body
// introduces itself; `symMap`, `ws` and `liveData` are `var`s inside
// `fetchPortfolioGreeks`, and `p` is a function parameter. §5 asserts both
// halves, because the count alone would read as "no writes" and the zero alone
// would read as vacuous.
//
// THE INBOUND ZERO IS VACUOUS, and is labelled so. `bindingNames` is empty:
// the region owns two function declarations and no mutable state, so there is
// nothing for an outside write to reach. That is exactly the shape CLAUDE.md
// records as scoring a perfect inbound zero while writing globals it does not
// own — which is why §5 measures the outbound direction separately, and why
// the interesting zero here is the outbound one.
//
// THE MODULE LOADS AFTER ITS ONLY CONSUMER. Both owners are called from
// js/portfolio/portfolio-data-fetch.js, which is script #59; the new tag would
// be #67. §7 pins that both call sites sit inside function bodies, so nothing
// resolves either name at evaluation time. This is the journal-trade-detail
// shape (#417), not a new risk — but it is the reason the load order is safe,
// so it is asserted rather than assumed.
//
// THE BOUNDARY SPANS A BANNER, deliberately. [68843,69409) and [69409,75365)
// are two banner-to-banner regions; the recommendation is their union. §6
// measures the split rule at every extent: alone each costs 0, joined they
// cost 0, and joining with the region on the far side costs 5. So the split
// rule does not decide this one — it cannot, since nothing separates a
// zero from a zero — and the tie is broken by cohesion and by the cost of a
// 566-unit layer carrying its own undo helper and contract. That is a
// judgement, and §6 publishes the numbers it was made on.
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
  maskLiterals,
  stripComments,
  scanTopLevelDeclarations,
  functionBodyRanges,
} = require('./lib/eic-contract-guards.js');
const {
  isBlankOrComment, snapBodyEnd, assertSeam,
  topLevelBanners, bindingNames, evaluationTimeReads,
} = require('./lib/extraction-boundary.js');

// ── The base this audit measures ─────────────────────────────────────────────
const BASE_SHA = '43b6ca690c5b918e668ca9d014af3633100ec9c6';
const BASE_CHARS = 1583906;
const BASE_SHA256 = '77e3e862c6f4d496b9d90f0256ccf22ad9ed510868d704f2bfae5041d29158e6';
const CODE_AT = 113840;
const CODE_CHARS = 1470040;
const LOCAL_SCRIPT_COUNT = 67;
// The suite size at this audit's BASE, and now. #437 added this audit (150 ->
// 151) and the mutation tooling added its contract (151 -> 152).
const BASE_TEST_FILE_COUNT = 150;
const TEST_FILE_COUNT = 152;

// ── The region, in MONOLITH coordinates ──────────────────────────────────────
const RAW_AT = 68843;
const RAW_END = 75365;
const RAW_CHARS = 6522;
const BODY_END = 75364;
const MODULE_CHARS = 6521;
const MODULE_SHA256 = '9b9af31fa5e41432dbf506b098aa71b1ac438c75cb3e530dc12ff9317b9da873';
const RAW_SHA256 = '666279ee9abd1cfce3c71207bca57a1c34d350816086217a72f17573a6f847b4';
const OWNERS_EXPECTED = [
  { name: 'portfolioGetUnderlying', chars: 441, start: 123 },
  { name: 'fetchPortfolioGreeks', chars: 5607, start: 913 },
];
const OWNER_COUNT = 2;
const ASYNC_OWNERS = 1;
// The region's own two banner sections, and the banner it spans between them.
const INNER_BANNER = 69409;

// ── What the screen saw, measured over the WHOLE screen ──────────────────────
const TOP_LEVEL_BANNERS = 187;
const REGIONS_WITH_OWNERS = 101;
const ZERO_CROSSING_REGIONS = [68843, 69409, 351714, 730440, 1249375];
const ZERO_CROSSING_COUNT = 5;
// The floor every screen since #420 applied BEFORE ranking by coupling.
const LEGACY_SIZE_FLOOR = 8000;
const REGIONS_CLEARING_FLOOR = 38;
const ZERO_CROSSING_CLEARING_FLOOR = 0;
const LARGEST_ZERO_CROSSING = 7371;
const ZERO_CROSSING_DEPS = [0, 1, 4, 8, 11];
// The audits that screened behind that floor, newest last. Pinned as commits so
// the count in the header is executed; §2b reads each one out of git.
const FLOOR_AUDITS = [
  ['ea34e52', 'tests/temporary-portfolio-traffic-light-boundary-audit.test.js'],
  ['8311c0a', 'tests/temporary-backend-candle-store-chart-boundary-audit.test.js'],
  ['5ffe7f3', 'tests/temporary-journal-rich-snapshot-boundary-audit.test.js'],
  ['dd682ec', 'tests/temporary-portfolio-backend-candles-boundary-audit.test.js'],
  ['1fa523e', 'tests/temporary-journal-snapshot-prefetch-boundary-audit.test.js'],
];
const FLOOR_AUDIT_COUNT = 5;
const PRE_FLOOR_AUDIT = ['177622e', 'tests/temporary-portfolio-expiry-manual-boundary-audit.test.js'];

// ── Coupling, both directions ────────────────────────────────────────────────
const EXTERNAL_EDGES = {};
const EXTERNAL_EDGE_TOTAL = 0;
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
const OUTBOUND_WRITES_ON_MONOLITH_BINDINGS = 0;
const PROPERTY_WRITES = 15;
const WRITE_BASES = ['liveData', 'p', 'symMap', 'ws'];
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The split rule, at every extent ──────────────────────────────────────────
const SPLIT_A1 = [68843, 69409];
const SPLIT_A2 = [69409, 75365];
const NEIGHBOUR = [75365, 79606];
const CROSSINGS_JOINED = 0;
const CROSSINGS_A1 = 0;
const CROSSINGS_A2 = 0;
const CROSSINGS_WITH_NEIGHBOUR = 5;
const CROSSINGS_NEIGHBOUR_ALONE = 5;
// The standing runner-up, unchanged since #431 measured it and re-pinned by
// the permanent contract #436 shipped.
const HELPER = [1254714, 1265508];
const HELPER_CROSSINGS = 6;

// ── Dependencies and load order ──────────────────────────────────────────────
const MONOLITH_DEPENDENCIES = ['logEv'];
const LOG_EV_USES = 3;
const SIBLING_DEPENDENCIES = { 'js/api/backend-client.js': ['ttCall'] };
const CONSUMER_REL = 'js/portfolio/portfolio-data-fetch.js';
const CONSUMER_POSITION = 59;
const CONSUMER_CALL_SITES = 2;
const MODULE_POSITION = 67;
const VM_GLOBALS = 2;

// ── The modelled extraction ──────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-dxlink-greeks-boundary-audit.test.js';
// Everything added since the base, sorted. #437 added only the audit; the
// mutation tooling that followed added the other four.
const ADDED_FILES = [
  'tests/lib/fixtures/mutation-fixture-target.js',
  'tests/lib/mutation-harness.js',
  'tests/lib/mutation-spec.js',
  'tests/mutation-coverage-contract.test.js',
  'tests/mutation-specs/mutation-coverage-contract.spec.js',
  'tests/mutation-specs/portfolio-dxlink-greeks-audit.spec.js',
  'tests/temporary-portfolio-dxlink-greeks-boundary-audit.test.js',
];
const RATCHETED_CONTRACTS = 13;
const MODULE_REL = 'js/portfolio/portfolio-dxlink-greeks.js';
const TAG = '<script src="./js/portfolio/portfolio-dxlink-greeks.js"></script>\n';
const TAG_CHARS = 66;
const ANCHOR_TAG = '<script src="./js/services/journal-snapshot-prefetch.js"></script>\n';
const INLINE_OPEN = '<script>';
const EXTRACTED_CHARS = 1577450;
const EXTRACTED_UTF8 = 1607582;
const EXTRACTED_LF = 27389;
const EXTRACTED_SHA256 = '572a03e9f80c0f93c0dafb626b45cc1c3388703d531d14a72e5956853de34928';
const EXTRACTED_LOCAL_SCRIPTS = 68;

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
function lexicalViews(src) {
  const masked = maskLiterals(src);
  const noComments = stripComments(src);
  const build = (keep) => {
    const o = new Array(src.length);
    for (let i = 0; i < src.length; i++) o[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return o.join('');
  };
  return { code: masked, strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]) };
}
function isWriteAt(text, at, name) {
  const after = text.slice(at + name.length, at + name.length + 30);
  return /^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after) ||
    /^\s*(?:\[[^\]]*\]|\.[A-Za-z0-9_$]+)+\s*=[^=]/.test(after);
}
function statementLines(src, decls) {
  const ch = Array.from(src);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
  return ch.join('').split('\n').filter((l) => !isBlankOrComment(l));
}
// Property-write bases in a masked body: `base.k = …` or `base[k] = …`.
function propertyWriteBases(maskedBody) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(maskedBody))) out.push(m[1]);
  return out;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('PORTFOLIO DXLINK GREEKS — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA.slice(0, 7));

const INDEX = APP_LOADER.loadIndexHtml();
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const VIEWS = lexicalViews(CODE);
const BODY = CODE.slice(RAW_AT, BODY_END);
const MASKED_BODY = maskLiterals(BODY);
const OWNERS = scanTopLevelDeclarations(BODY);
const OWNED_HERE = new Set(OWNERS.map((d) => d.name));
const ALL_DECLS = scanTopLevelDeclarations(CODE);
const MONOLITH_OWNED = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);

// Crossings for an arbitrary monolith range, the way the screen scores them:
// executable references to the range's owners from OUTSIDE it, plus property
// writes onto monolith-owned bindings the range does not own.
function crossings(s, e) {
  const own = ALL_DECLS.filter((d) => d.start >= s && d.start + d.chars <= e);
  const set = new Set(own.map((d) => d.name));
  let edges = 0;
  for (const n of set) {
    for (const p of refSites(VIEWS.code, n)) if (p < s || p >= e) edges++;
  }
  let out = 0;
  for (const base of propertyWriteBases(VIEWS.code.slice(s, e))) {
    if (!set.has(base) && MONOLITH_OWNED.has(base)) out++;
  }
  return { owners: own.length, edges, out, total: edges + out };
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(Array.from(INDEX).length, BASE_CHARS, 'index.html is 1,583,906 units');
eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned digest');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at the pinned offset');
eq(Array.from(CODE).length, CODE_CHARS, '…and is 1,470,040 units');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-seven local scripts precede it');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 151 files — this audit is the one that was added');
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, BASE_CHARS, 'the pinned base commit really carries this index.html');
  eq(sha256(fromGit), BASE_SHA256, '…byte for byte');
  // Counted the same way before and after committing: a `git diff` alone
  // reports nothing while the file is untracked — the #427 failure exactly.
  const committedAdds = git(['diff', '--name-only', '--diff-filter=A', BASE_SHA]).split('\n').filter(Boolean);
  const untracked = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter((l) => /^(\?\?|A )/.test(l)).map((l) => l.slice(3));
  // This audit shipped in #437 adding exactly itself. The mutation tooling that
  // followed adds four more files, all of them test infrastructure, and widens
  // this list rather than loosening it — the point of the assertion is that the
  // set is EXACT, not that it has one element. Phase 2 deletes this file and
  // the question goes away.
  eq(Array.from(new Set(committedAdds.concat(untracked))).sort(), ADDED_FILES,
    '…and these are exactly the files added since the base, committed or not');
  eq(ADDED_FILES.filter((rel) => !rel.startsWith('tests/')), [],
    '…every one of them under tests/, so production is untouched by the addition');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The screen, and the floor that hid this region for six cycles');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, FN_BODIES);
  eq(marks.length, TOP_LEVEL_BANNERS, '187 banners sit at top level');
  const all = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m; while ((m = re.exec(CODE))) all.push(m.index);
  }
  ok(all.length > marks.length,
    'control — the unfiltered count is strictly larger, so the top-level filter does work');
  ok(marks.indexOf(RAW_AT) >= 0, 'the chosen region opens on one of them');
  ok(marks.indexOf(INNER_BANNER) >= 0, '…SPANS another, which is the union this audit recommends');
  ok(marks.indexOf(RAW_END) >= 0, '…and its seam is a third');

  // Score every region the screen can see, then answer two questions about the
  // WHOLE set rather than about the regions nearest to hand.
  const scored = [];
  for (let i = 0; i < marks.length; i++) {
    const s = marks[i];
    const e = (i + 1 < marks.length ? marks[i + 1] : CODE.length);
    const c = crossings(s, e);
    if (c.owners === 0) continue;
    scored.push({ s, e, units: e - s, total: c.total });
  }
  eq(scored.length, REGIONS_WITH_OWNERS, '101 banner-to-banner regions own declarations');
  eq(scored.filter((r) => r.units >= LEGACY_SIZE_FLOOR).length, REGIONS_CLEARING_FLOOR,
    '38 of them clear the 8,000-unit floor every screen since #420 applied first');

  const zero = scored.filter((r) => r.total === 0);
  eq(zero.map((r) => r.s).sort((a, b) => a - b), ZERO_CROSSING_REGIONS,
    'exactly these five regions score ZERO crossings');
  eq(zero.length, ZERO_CROSSING_COUNT, '…five of the hundred and one');
  // THE FINDING. Not "this region was ranked low" — it was not on the screen.
  eq(zero.filter((r) => r.units >= LEGACY_SIZE_FLOOR).length, ZERO_CROSSING_CLEARING_FLOOR,
    'and NONE of the five clears that floor — the floor removed every zero-coupling region');
  eq(Math.max(...zero.map((r) => r.units)), LARGEST_ZERO_CROSSING,
    '…the largest of them being 7,371 units, short of 8,000');
  // Control: the floor is not vacuous in the other direction either. If it
  // excluded everything, the clause above would be trivially true.
  ok(REGIONS_CLEARING_FLOOR > 0,
    'control — the floor does admit regions, so excluding all five is a measurement');
  ok(zero.some((r) => r.s === RAW_AT) && zero.some((r) => r.s === INNER_BANNER),
    'both halves of the recommended union are among the five');

  // WHY THESE TWO OF THE FIVE. The header says they carry the fewest monolith
  // dependencies; that is a superlative over the five, so it is measured over
  // the five rather than asserted from the two.
  const depsOf = (s, e) => {
    const own = ALL_DECLS.filter((d) => d.start >= s && d.start + d.chars <= e);
    const mine = new Set(own.map((d) => d.name));
    const out = new Set();
    for (const m of VIEWS.code.slice(s, e).matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
      if (MONOLITH_OWNED.has(m[0]) && !mine.has(m[0])) out.add(m[0]);
    }
    return out.size;
  };
  eq(zero.sort((a, b) => a.s - b.s).map((r) => depsOf(r.s, r.e)), ZERO_CROSSING_DEPS,
    'the five zero-crossing regions carry these dependency counts');
  eq(ZERO_CROSSING_DEPS.indexOf(Math.min(...ZERO_CROSSING_DEPS)), 0,
    'the fewest belongs to the first of them');
  eq(ZERO_CROSSING_DEPS[0] < ZERO_CROSSING_DEPS[2] &&
     ZERO_CROSSING_DEPS[1] < ZERO_CROSSING_DEPS[2], true,
    '…and the second-fewest to the region immediately after it — the two are ADJACENT');
  eq(zero[0].e, zero[1].s, 'adjacent in the literal sense: one ends where the next begins');
}

// ── 2b. The floor's history, executed rather than recalled ───────────────────
{
  // The header used to say "every screen since #420". Reading the audits shows
  // FIVE consecutive ones carried the floor and the audit before them had no
  // such constant at all, so the claim is pinned here against git.
  for (const [commit, rel] of FLOOR_AUDITS) {
    const src = git(['show', commit + ':' + rel]);
    ok(src.indexOf('SCREEN_FLOOR = ' + LEGACY_SIZE_FLOOR) >= 0,
      rel.replace(/^tests\/temporary-|-boundary-audit\.test\.js$/g, '') +
      ' screened behind the ' + LEGACY_SIZE_FLOOR + '-unit floor');
  }
  eq(FLOOR_AUDITS.length, FLOOR_AUDIT_COUNT, 'five consecutive audits carried it');
  // The control that makes that count a measurement and not an anecdote.
  const before = git(['show', PRE_FLOOR_AUDIT[0] + ':' + PRE_FLOOR_AUDIT[1]]);
  eq(before.indexOf('SCREEN_FLOOR'), -1,
    'control — the audit immediately before them declares no floor at all, so "five" is the count');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE.slice(RAW_AT, RAW_AT + 120).indexOf('Extract underlying symbol') > 0,
    'the region opens on the first feature banner');
  ok(CODE.slice(INNER_BANNER, INNER_BANNER + 120).indexOf('DXLink one-shot greeks') > 0,
    '…spans the second');
  ok(CODE.slice(RAW_END, RAW_END + 200).indexOf('DXLink on-demand stock price fetch') > 0,
    '…and what follows the seam is a different feature');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 6,522 units');
  eq(sha256(CODE.slice(RAW_AT, RAW_END)), RAW_SHA256, '…hashing to the pinned digest');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 6,521');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', 'the raw block is the body plus one LF');
  eq(BODY.slice(-2), '}\n', 'the body ends on a closing brace and a newline');

  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Two owners, one async, and no binding at all');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares exactly two names at top level');
  eq(OWNERS.map((d) => ({ name: d.name, chars: d.chars, start: d.start })), OWNERS_EXPECTED,
    '…at their pinned spans');
  eq(OWNERS.filter((d) => d.isAsync).length, ASYNC_OWNERS, 'one of the two is async');
  eq(OWNERS[1].isAsync, true, '…the DXLink fetch, not the symbol extractor');
  eq(OWNERS.every((d) => d.form === 'function'), true, 'both are function declarations');
  eq(bindingNames(OWNERS), [], 'the region owns no binding at all — which §5 needs');
  // The 349 units between them are the second feature's own banner and comment,
  // which is what makes this boundary a union of two banner sections.
  eq(OWNERS[1].start - (OWNERS[0].start + OWNERS[0].chars), 349,
    'the gap between the declarations is the inner banner and its comment');
  eq(RAW_AT + OWNERS[0].start + OWNERS[0].chars + 2, INNER_BANNER,
    '…and that banner is the one the screen counted as a section start');
  eq(OWNERS[1].start + OWNERS[1].chars + 1, MODULE_CHARS,
    'banner + both declarations + the trailing newline is the whole body');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling in BOTH directions — and which zero is vacuous');
// ─────────────────────────────────────────────────────────────────────────────
{
  const edges = {};
  let total = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(VIEWS.code, n)) {
      if (p < RAW_AT || p >= BODY_END) { edges[n] = (edges[n] || 0) + 1; total++; }
    }
  }
  eq(edges, EXTERNAL_EDGES, 'NO external executable edge — the monolith never names either owner');
  eq(total, EXTERNAL_EDGE_TOTAL, '…zero references in total');
  // That zero is only interesting if the detector finds edges elsewhere.
  ok(crossings(HELPER[0], HELPER[1]).edges === HELPER_CROSSINGS,
    'control — the same detector scores the standing runner-up at six edges');
  for (const n of OWNED_HERE) {
    eq(refSites(VIEWS.code, n).filter((p) => p >= RAW_AT && p < BODY_END).length, 1,
      n + ' appears exactly once in the monolith: its own declaration');
  }

  let markup = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(VIEWS.strings, n)) if (p < RAW_AT || p >= BODY_END) markup++;
  }
  eq(markup, MARKUP_REFERENCES, 'no owner is named inside a string the monolith builds');
  ok(refSites(VIEWS.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  // INBOUND: vacuous, and said so.
  let inbound = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(VIEWS.code, n)) {
      if ((p < RAW_AT || p >= BODY_END) && isWriteAt(VIEWS.code, p, n)) inbound++;
    }
  }
  eq(inbound, INBOUND_WRITES, 'zero inbound writes');
  eq(bindingNames(OWNERS).length, 0,
    '…which is VACUOUS: the region owns no binding for a write to reach');
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts as a write');
  eq(isWriteAt('x === 1;', 0, 'x'), false, 'control — a comparison does not');

  // OUTBOUND: NOT vacuous. The writes exist; none reaches a monolith binding.
  const bases = propertyWriteBases(MASKED_BODY);
  eq(bases.length, PROPERTY_WRITES, 'the body performs FIFTEEN property writes');
  eq(Array.from(new Set(bases)).sort(), WRITE_BASES, '…over exactly four bases');
  eq(bases.filter((b) => MONOLITH_OWNED.has(b) && !OWNED_HERE.has(b)).length,
    OUTBOUND_WRITES_ON_MONOLITH_BINDINGS,
    'and NONE of them lands on a binding the monolith declares — the outbound zero');
  // Each base is introduced by the body itself: three `var`s and one parameter.
  const introduced = (name) =>
    new RegExp('(?:var|let|const)\\s+' + name + '\\b').test(BODY) ||
    new RegExp('function[^(]*\\([^)]*\\b' + name + '\\b[^)]*\\)').test(BODY);
  for (const b of WRITE_BASES) ok(introduced(b), b + ' is introduced inside the body');
  eq(introduced('S'), false,
    'control — the monolith state object would NOT pass that test, so it is a real check');
  eq(MONOLITH_OWNED.has('S'), true,
    '…and `S` is a binding the monolith owns, so a write onto it would have been counted');

  eq(statementLines(BODY, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the two declarations');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The split rule, measured at every extent');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The two halves are DERIVED from the region and its inner banner, not typed
  // out again: a hand-written pair here would survive a one-unit shift, which
  // is the survivor shape this cycle already had to close twice below.
  eq(SPLIT_A1, [RAW_AT, INNER_BANNER], 'the first half runs from the region start to the inner banner');
  eq(SPLIT_A2, [INNER_BANNER, RAW_END], '…and the second from the inner banner to the seam');
  eq(crossings(RAW_AT, RAW_END).total, CROSSINGS_JOINED, 'the union costs ZERO crossings');
  eq(crossings(SPLIT_A1[0], SPLIT_A1[1]).total, CROSSINGS_A1, '…the symbol extractor alone, zero');
  eq(crossings(SPLIT_A2[0], SPLIT_A2[1]).total, CROSSINGS_A2, '…the DXLink fetch alone, zero');
  // So the split rule cannot decide this one, and the audit says so rather than
  // pretending the numbers chose. What it CAN decide is the far side.
  // ANCHOR BOTH COMPARISON RANGES TO REAL MARKS BEFORE USING THEM. An offset
  // pinned loose measures nothing: in the first mutation pass a one-unit shift
  // of either endpoint below changed no result, which is the same survivor
  // shape #429 through #435 each produced. Derived here from the banner list,
  // so a shifted pin fails at the derivation rather than passing quietly.
  {
    const marks = topLevelBanners(CODE, FN_BODIES);
    const iSeam = marks.indexOf(RAW_END);
    ok(iSeam >= 0, 'the seam is a top-level banner');
    eq(NEIGHBOUR[0], RAW_END, 'the neighbour starts exactly at this region’s seam');
    eq(NEIGHBOUR[1], marks[iSeam + 1], '…and ends at the next top-level banner');
    const iHelper = marks.indexOf(HELPER[0]);
    ok(iHelper >= 0, 'the runner-up opens on a top-level banner too');
    eq(HELPER[1], snapBodyEnd(CODE, HELPER[0], marks[iHelper + 1]),
      '…and its end is the snapped body end, not a hand-written offset');
  }
  eq(crossings(RAW_AT, NEIGHBOUR[1]).total, CROSSINGS_WITH_NEIGHBOUR,
    'joining the next region instead costs five');
  eq(crossings(NEIGHBOUR[0], NEIGHBOUR[1]).total, CROSSINGS_NEIGHBOUR_ALONE,
    '…all five of them the neighbour’s own, so the union buys nothing and loses the zero');
  ok(crossings(RAW_AT, NEIGHBOUR[1]).total > crossings(RAW_AT, RAW_END).total,
    'so the recommended boundary stops at the seam');

  // The standing runner-up, re-measured rather than recalled. #436's permanent
  // contract pins the same six in its own base coordinates.
  eq(crossings(HELPER[0], HELPER[1]).total, HELPER_CROSSINGS,
    'the Journal snapshot helper still costs six');
  ok(HELPER_CROSSINGS > CROSSINGS_JOINED, '…which this candidate beats outright');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. One dependency, and a consumer that loads BEFORE the module');
// ─────────────────────────────────────────────────────────────────────────────
{
  const deps = new Set();
  for (const m of MASKED_BODY.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (MONOLITH_OWNED.has(m[0]) && !OWNED_HERE.has(m[0])) deps.add(m[0]);
  }
  eq(Array.from(deps).sort(), MONOLITH_DEPENDENCIES, 'exactly ONE monolith dependency: logEv');
  const uses = refSites(MASKED_BODY, 'logEv');
  eq(uses.length, LOG_EV_USES, '…used three times');
  eq(uses.every((p) => functionBodyRanges(BODY).some((r) => p >= r.start && p <= r.end)), true,
    '…every use inside a function body, so none of them runs at load');

  const sibDeps = {};
  for (const rel of LOCALS) {
    const names = scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8')).map((d) => d.name);
    const hit = names.filter((n) => new RegExp('\\b' + n + '\\b').test(MASKED_BODY));
    if (hit.length) sibDeps[rel] = hit;
  }
  eq(sibDeps, SIBLING_DEPENDENCIES, 'one sibling dependency, ttCall from the backend client');
  ok(LOCALS.indexOf('js/api/backend-client.js') < MODULE_POSITION,
    '…and that sibling already loads before the new module would');

  // THE LOAD ORDER THAT MATTERS: the only consumer loads EARLIER than the
  // module would. Safe because both call sites are call-time, not because of
  // where the tag goes.
  eq(LOCALS.indexOf(CONSUMER_REL), CONSUMER_POSITION, 'the only consumer is script #59');
  ok(CONSUMER_POSITION < MODULE_POSITION, '…which is BEFORE the new module at #67');
  const consumer = fs.readFileSync(path.join(ROOT, CONSUMER_REL), 'utf8');
  const consumerMasked = maskLiterals(consumer);
  const consumerBodies = functionBodyRanges(consumer);
  let sites = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(consumerMasked, n)) {
      sites++;
      ok(consumerBodies.some((r) => p >= r.start && p <= r.end),
        n + ' is referenced by the consumer INSIDE a function body — call time');
    }
  }
  eq(sites, CONSUMER_CALL_SITES, 'two call sites, one per owner');
  eq(evaluationTimeReads(consumer, scanTopLevelDeclarations(consumer), maskLiterals)
    .filter((n) => OWNED_HERE.has(n)), [],
    '…and the consumer reads neither name at evaluation time');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It runs nothing at load, and loads in an empty VM');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(BODY, OWNERS, maskLiterals), [],
    'NOTHING is read at evaluation time — the list is empty');
  const probe = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals),
    ['elsewhere', 'window'], 'control — a region that reads a foreign name at load reports it');

  const bare = {};
  vm.createContext(bare);
  vm.runInContext(BODY, bare, { filename: MODULE_REL });
  eq(Object.keys(bare).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(bare).sort(), OWNERS_EXPECTED.map((o) => o.name).sort(),
    '…defining exactly its two owners');
  eq(bare.portfolioGetUnderlying.constructor.name, 'Function', 'the extractor is a plain function');
  eq(bare.fetchPortfolioGreeks.constructor.name, 'AsyncFunction', '…the fetch an async one');

  // It also WORKS in isolation: the pure half needs no host at all.
  eq(bare.portfolioGetUnderlying({ underlyingSymbol: 'SPY' }), 'SPY',
    'the extractor returns the explicit underlying');
  eq(bare.portfolioGetUnderlying({ 'underlying-symbol': 'QQQ' }), 'QQQ',
    '…and the hyphenated spelling the backend sends');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The modelled extraction — the figures Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag line is 66 units');
  eq(INDEX.split(ANCHOR_TAG).length - 1, 1, 'the anchor tag appears exactly once');
  eq(INDEX.indexOf(ANCHOR_TAG + INLINE_OPEN) >= 0, true,
    '…immediately before the inline monolith, which is where the new tag goes');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT in the document yet — this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');

  const docAt = CODE_AT + RAW_AT;
  const docEnd = CODE_AT + RAW_END;
  eq(INDEX.slice(docAt, docEnd), CODE.slice(RAW_AT, RAW_END),
    'the monolith range maps to the document range Phase 2 will cut');
  const withoutRaw = INDEX.slice(0, docAt) + INDEX.slice(docEnd);
  const insertAt = withoutRaw.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const extracted = withoutRaw.slice(0, insertAt) + TAG + withoutRaw.slice(insertAt);

  eq(extracted.length, EXTRACTED_CHARS, 'the extracted document is 1,577,450 units');
  eq(Buffer.byteLength(extracted, 'utf8'), EXTRACTED_UTF8, '…1,607,582 bytes');
  eq((extracted.match(/\n/g) || []).length, EXTRACTED_LF, '…27,389 line feeds');
  eq(sha256(extracted), EXTRACTED_SHA256, '…and hashes to the digest Phase 2 must produce');
  eq(BASE_CHARS - RAW_CHARS + TAG_CHARS, EXTRACTED_CHARS,
    'the arithmetic closes: base − raw + tag');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src)).length,
    EXTRACTED_LOCAL_SCRIPTS, '…carrying sixty-eight local scripts');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src))
    .map((t) => t.src.replace(/^\.\//, '')).indexOf(MODULE_REL), MODULE_POSITION,
    '…the new one last, at position 67');
  // The tag lands EARLIER in the document than the fragment it replaces, so a
  // tag-free reconstruction can reuse the base offset directly. Phase 2's undo
  // helper depends on this and would otherwise need a shifted REINSERT_AT.
  ok(insertAt - TAG.length < docAt,
    'the tag sits before the cut, so REINSERT_AT is the base offset unchanged');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Production is untouched');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NO production file changed — index.html and every module are byte-identical');
  eq(changed.filter((rel) => !rel.startsWith('tests/')), [],
    '…and nothing outside tests/ changed at all');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'this audit is in the change set');
  // The rest of the change set is the suite-count ratchet, and this audit
  // AUDITS THAT EDIT rather than describing it. CLAUDE.md's first check says a
  // mechanical edit across a family must be compared against the base, because
  // a weakened assertion still passes CI. So: each of these files must differ
  // from the base by exactly ONE line, and that line must be the ratchet.
  const ratcheted = changed.filter((rel) => ADDED_FILES.indexOf(rel) < 0);
  eq(ratcheted.length, RATCHETED_CONTRACTS,
    'thirteen contracts carry the suite-count ratchet');
  for (const rel of ratcheted) {
    const before = git(['show', BASE_SHA + ':' + rel]);
    const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const b = before.split('\n');
    const a = after.split('\n');
    eq(a.length, b.length, rel + ': the ratchet changed no line COUNT');
    const differing = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differing.push(i);
    eq(differing.length, 1, rel + ': exactly one line differs from the base');
    // Pinned against the BASE's value, not against TEST_FILE_COUNT - 1: the
    // increment is not always one. #437 took these files 150 -> 151 and the
    // mutation tooling took them 151 -> 152, so measured from this audit's base
    // the step is two. Assuming a step of one would have made this check pass
    // only in the cycles where nothing else shipped.
    eq(b[differing[0]], 'const TEST_FILE_COUNT = ' + BASE_TEST_FILE_COUNT + ';',
      rel + ': …and the old line was the count this audit\u2019s base carried');
    ok(BASE_TEST_FILE_COUNT < TEST_FILE_COUNT, rel + ': …which the ratchet only ever raises');
    eq(a[differing[0]], 'const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';',
      rel + ': …replaced by the incremented count, and nothing else');
    // A dropped assertion is what this check exists to catch, so count them.
    const calls = (t) => (t.match(/\b(?:eq|ok|throws|throwsWith|same|near)\(/g) || []).length;
    eq(calls(after), calls(before), rel + ': no assertion call was added or removed');
  }
  for (const rel of LOCALS) {
    eq(sha256(fs.readFileSync(path.join(ROOT, rel), 'utf8')),
      sha256(git(['show', BASE_SHA + ':' + rel])), rel + ' is byte-identical to the base');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_DXLINK_GREEKS_AUDIT_OK');
