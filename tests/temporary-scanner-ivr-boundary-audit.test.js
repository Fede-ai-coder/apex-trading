'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER IVR THROTTLE — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. The scanner IVR throttle/dedup/cache, [80720,84771) in
// monolith coordinates: 4,051 units, TWELVE owners, and FOUR references in the
// entire application — one real caller and three defensive `typeof` reads.
//
//     4 inbound references — 1 call to fetchScannerIvr, 3 guarded diag reads
//     0 inbound writes, and 0 inbound PROPERTY writes (§5 — not the same thing)
//     0 outbound property writes
//     0 monolith dependencies — it names nothing the monolith declares
//     0 references from any of the seventy shipped modules
//     0 references from static markup, and 0 from GENERATED markup (§4)
//     0 evaluation-time reads, 0 top-level statement lines
//     it loads in a COMPLETELY empty VM, defining twelve globals and running
//     no fetch, no timer and no DOM access at load
//
// A SIXTH DIRECTION THE SCREEN NEVER COUNTED. #440 established three, all
// measured inside the monolith; #442 added two more, from the sibling modules
// and from static markup. All five read the monolith through `maskLiterals`,
// which blanks string contents — so `onclick="rsApplyFilters()"` written into
// innerHTML is INVISIBLE to every screen this programme has run.
//
// It is not a corner case. §4 measures it over all 97 owner-carrying regions:
// TWENTY-SEVEN of them are named from markup the monolith generates at runtime,
// 73 references in total.
//
// The sharpest case is the region holding the scanner's filter handlers. Every
// INBOUND direction of the five reports zero for it — no reference from the
// monolith, no write, no sibling module, no static markup — and its score of 4
// is four OUTBOUND dependencies, not one caller. On the five-direction screen
// it therefore scored exactly what the recommendation scored, 4, and the two
// tied. It carries NINE generated-markup callers; the recommendation carries
// none. §4 asserts the tie rather than describing it, because a tie broken by a
// direction nobody was counting is the whole argument for counting it.
//
// A SEVENTH, AND IT IS WHAT SEPARATES THE RECOMMENDATION FROM ITS SIBLING.
// "Inbound writes" has always meant an assignment to a name the region owns.
// `_scannerCandleDiag.scannerDxCandleSubscriptionsBlocked++` is not that — it
// is a write THROUGH the name, into state the region owns, from a function that
// stays behind. The screen counted those four as plain references. §5 separates
// them and measures the reach: FIFTEEN of the 97 regions are written into from
// outside, 383 writes in total.
//
// THE FAMILY, AND WHY IT IS NOT THE CUT. The throttle is one of three mirror
// siblings, contiguous in the source and explicitly written as copies of each
// other — candles [75943,80720), IVR [80720,84771), earnings [84771,89653).
// The obvious move is to take all three as one 13,710-unit module. §6 measures
// what that would buy: NOTHING. Individually they score 9, 4 and 5; combined
// they score 18, which is the sum exactly. They never reference one another.
// "Mirrors fetchScannerIvr" describes shared SHAPE, not shared state, and
// combining them triples the blast radius for no reduction in coupling.
//
// Of the three, only the IVR one has zero on both new directions AND zero
// monolith dependencies: candles is written into four times from
// _scannerGuardBlockCandleSub and calls `fetchCandles`; earnings calls
// `fetchEarningsForTicker`. That is the whole reason the middle sibling is the
// one recommended, and §6 measures it rather than asserting it.
//
// WHAT THIS AUDIT DOES NOT DO. It does not change the screen helpers. The two
// new directions are measured here, in this file, against the whole set; making
// them part of `tests/lib/extraction-boundary.js` is a later change, so that
// Phase 1 stays a measurement.
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
  isBlankOrComment, snapBodyEnd, assertSeam, topLevelBanners, evaluationTimeReads,
} = require('./lib/extraction-boundary.js');

// ── The base these numbers were measured against ─────────────────────────────
const BASE_SHA = '8fb3b26e5cf6374963563fdc37aadf15b7c2d473';
const AUDIT_REL = 'tests/temporary-scanner-ivr-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/scanner-ivr-audit.spec.js';
const ADDED_FILES = [AUDIT_SPEC_REL, AUDIT_REL];

const BASE_CHARS = 1568182;
const BASE_UTF8 = 1597962;
const BASE_LF = 27291;
const BASE_SHA256 = '2ef534b3039ff7ec98cc46cbe54e01ccf48fd765ac07c3f583a4bd471e79a52a';
const LOCAL_SCRIPTS = 70;
const BASE_TEST_FILE_COUNT = 154;
const TEST_FILE_COUNT = 155;
const RATCHETED_CONTRACTS = 16;
const MUTATION_BOOKKEEPING = [
  'tests/mutation-coverage-contract.test.js',
  'tests/mutation-specs/mutation-coverage-contract.spec.js',
  'tests/mutation-specs/portfolio-dxlink-greeks-contract.spec.js',
  'tests/mutation-specs/strategy-templates-contract.spec.js',
  'tests/mutation-specs/vega-monitor-contract.spec.js',
];

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114029;
const CODE_CHARS = 1454127;
const TOP_LEVEL_DECLS = 996;
const BANNER_MARKS = 182;
const MERGED_REGIONS = 108;
const OWNER_REGIONS = 97;
const HEADER_PAIRS_MERGED = 74;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 80720;
const RAW_END = 84771;
const BODY_END = 84770;
const RAW_CHARS = 4051;
const BODY_CHARS = 4050;
const BODY_UTF8 = 4060;
const BODY_LF = 90;
const BODY_SHA256 = '4f13ddbb95b7c5508fcd409ebfbd74a7974e6f7065d573fc39f771f9961a4775';
const BODY_ENDING = '}\n';
const OWNER_COUNT = 12;
const OWNERS_EXPECTED = [
  { name: '_SCANNER_IVR_CONCURRENCY', form: 'var', start: 297, chars: 33 },
  { name: '_SCANNER_IVR_CACHE_TTL_MS', form: 'var', start: 331, chars: 47 },
  { name: '_SCANNER_IVR_SOURCE', form: 'var', start: 393, chars: 39 },
  { name: '_SCANNER_IVR_DEBUG_PARITY', form: 'var', start: 433, chars: 38 },
  { name: '_scannerIvrCache', form: 'var', start: 524, chars: 43 },
  { name: '_scannerIvrInFlight', form: 'var', start: 595, chars: 46 },
  { name: '_scannerIvrQueue', form: 'var', start: 661, chars: 26 },
  { name: '_scannerIvrActive', form: 'var', start: 688, chars: 26 },
  { name: '_scannerIvrDiag', form: 'var', start: 715, chars: 267 },
  { name: '_scannerIvrCacheKey', form: 'function', start: 983, chars: 154 },
  { name: '_scannerIvrPumpQueue', form: 'function', start: 1138, chars: 1691 },
  { name: 'fetchScannerIvr', form: 'function', start: 2830, chars: 1219 },
];

// ── Coupling, in every direction now counted ─────────────────────────────────
const EXTERNAL_EDGES = 4;
const EDGE_SITES = [58584, 737805, 737837, 737856];
const CONSUMER_SITE = 58584;
const CONSUMER_NAME = 'fetchScannerIvr';
const DIAG_SITES = [737805, 737837, 737856];
const INBOUND_WRITES = 0;
const INBOUND_PROPERTY_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = [];
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const GENERATED_MARKUP_REFERENCES = 0;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 12;

// ── The sixth direction, over the whole screen ───────────────────────────────
const GEN_MARKUP_REGIONS = 27;
const GEN_MARKUP_TOTAL = 73;
const RS_REGION = [337563, 338630];
const RS_NAMES = ['rsSetMode', 'rsSetTf', 'rsToggleAdx5', 'rsApplyFilters'];
const RS_CODE_VIEW_INBOUND = 0;
const RS_GENERATED_INBOUND = 9;
const RS_DEPENDENCIES = ['S', '_rs5mStopPoll', '_rsClear5mSubs', 'renderRsScanner'];
const FIVE_DIRECTION_TIE = 4;

// ── The seventh, over the whole screen ───────────────────────────────────────
const INBOUND_PROP_WRITE_REGIONS = 15;
const INBOUND_PROP_WRITE_TOTAL = 383;

// ── The family ───────────────────────────────────────────────────────────────
const CANDLES = [75943, 80720];
const IVR = [80720, 84771];
const EARNINGS = [84771, 89653];
const FAMILY = [75943, 89653];
const CANDLES_TOTAL = 9;
const IVR_TOTAL = 4;
const EARNINGS_TOTAL = 5;
const FAMILY_TOTAL = 18;
const FAMILY_UNITS = 13710;
const FAMILY_OWNERS = 36;
const CANDLES_INBOUND_PROP_WRITES = 4;
const CANDLES_DEPENDENCIES = ['fetchCandles'];
const EARNINGS_DEPENDENCIES = ['fetchEarningsForTicker'];

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = []; let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
// Names a source binds itself, at any nesting. Over-collecting is the safe
// direction: it can only drop a reference, never invent one. #442 added this
// after `field` — a callback PARAMETER — was counted as a call to the
// monolith's `field()`, inflating the sibling direction by 70.
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
function propertyWriteBases(masked) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(masked))) out.push(m[1]);
  return out;
}
// A write THROUGH a name the region owns: `X.k = v`, `X.k++`, `X[i] += n`.
// Distinct from an assignment TO the name, which is what every earlier screen
// meant by "inbound write". §5.
function isInboundPropertyWrite(masked, at, name) {
  const after = masked.slice(at + name.length, at + name.length + 40);
  return /^\s*(?:\.\s*[A-Za-z0-9_$]+|\[[^\]]{1,40}\])+\s*(?:=[^=]|\+\+|--|\+=|-=)/.test(after);
}

console.log('SCANNER IVR THROTTLE — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA.slice(0, 7));

const INDEX = APP_LOADER.loadIndexHtml();
const CODE = APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const MASKED = maskLiterals(CODE);
const NO_COMMENTS = stripComments(CODE);
// The STRING view: literal content that is not comment. The five older
// directions all read MASKED, where this is blank.
let STRINGS = '';
for (let i = 0; i < CODE.length; i++) {
  STRINGS += (MASKED[i] !== CODE[i] && NO_COMMENTS[i] === CODE[i]) ? CODE[i] : (CODE[i] === '\n' ? '\n' : ' ');
}
const DECLS = scanTopLevelDeclarations(CODE);
const BY_NAME = new Map(DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const MARKS = topLevelBanners(CODE, FN_BODIES);

// The regions, with the header-rule merge #441 established.
const NAIVE = MARKS.map((s, i) => ({ start: s, end: i + 1 < MARKS.length ? MARKS[i + 1] : CODE.length }));
const REGIONS = [];
for (let i = 0; i < NAIVE.length; i++) {
  let r = NAIVE[i];
  while (i + 1 < NAIVE.length) {
    const body = CODE.slice(r.start, NAIVE[i + 1].start);
    if (body.split('\n').some((l) => !isBlankOrComment(l))) break;
    r = { start: r.start, end: NAIVE[i + 1].end };
    i++;
  }
  REGIONS.push(r);
}
const OWNED_REGIONS = REGIONS.filter((r) => DECLS.some((d) => d.start >= r.start && d.end < r.end));
const namesIn = (r) => DECLS.filter((d) => d.start >= r[0] && d.end < r[1]).map((d) => d.name);
const outsideOf = (r) => (i) => i < r[0] || i >= r[1];

// The full coupling profile of an arbitrary range, in all seven directions.
const SIBLINGS = APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src))
  .map((t) => {
    const rel = t.src.replace(/^\.\//, '');
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return { rel, masked: maskLiterals(src), bound: locallyBound(src) };
  });
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');

// The two NEW directions alone, for the whole-screen sweeps in §4 and §5.
// `profile` below also scans all seventy sibling modules for every owned name,
// which those sweeps never read: running the full thing 97 times took the
// target from 2.4 s to 6.2 s a run, and a mutant costs one run of its target.
//
// The sweep is then indexed rather than searched. `refSites` scans a 1.45 MB
// view once PER NAME, so 97 regions over 996 owned names is about two thousand
// full scans; one pass per view, bucketing every identifier occurrence by name,
// answers all of them. Same regex, same exclusion of property accesses — §4 and
// §5 assert the totals either way would produce, and §7 still uses `refSites`
// directly on the recommendation, so the index cannot quietly disagree.
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
const OCC_MASKED = occurrenceIndex(MASKED);
const OCC_STRINGS = occurrenceIndex(STRINGS);
const occ = (idx, n) => idx.get(n) || [];

function newDirections(range) {
  const names = namesIn(range);
  const outside = outsideOf(range);
  let gen = 0, inPropWrites = 0;
  for (const n of names) {
    gen += occ(OCC_STRINGS, n).filter(outside).length;
    for (const at of occ(OCC_MASKED, n).filter(outside)) {
      if (isInboundPropertyWrite(MASKED, at, n)) inPropWrites++;
    }
  }
  return { gen, inPropWrites };
}
const SWEEP = OWNED_REGIONS.map((r) => newDirections([r.start, r.end]));

function profile(range) {
  const names = namesIn(range), nameSet = new Set(names);
  const outside = outsideOf(range);
  const bodyMasked = MASKED.slice(range[0], range[1]);
  const body = CODE.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0;
  const sites = [];
  for (const n of names) for (const at of refSites(MASKED, n).filter(outside)) {
    inbound++; sites.push(at);
    const after = MASKED.slice(at + n.length, at + n.length + 30);
    if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after)) inWrites++;
    if (isInboundPropertyWrite(MASKED, at, n)) inPropWrites++;
  }
  const outWrites = new Set(propertyWriteBases(bodyMasked).filter((b) => !nameSet.has(b) && BY_NAME.has(b)));
  const local = locallyBound(body);
  const deps = new Set();
  for (const d of DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (refSites(bodyMasked, d.name).length) deps.add(d.name);
  }
  let sib = 0;
  for (const n of names) for (const s of SIBLINGS) if (!s.bound.has(n)) sib += refSites(s.masked, n).length;
  let mkp = 0;
  for (const n of names) mkp += refSites(STATIC_MARKUP, n).length;
  let gen = 0;
  for (const n of names) gen += refSites(STRINGS, n).filter(outside).length;
  return {
    names, inbound, inWrites, inPropWrites, sites: sites.sort((a, b) => a - b),
    outWrites: Array.from(outWrites).sort(), deps: Array.from(deps).sort(), sib, mkp, gen,
    units: range[1] - range[0], owners: names.length,
    total: inbound + inWrites + outWrites.size + deps.size + sib + mkp + gen,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, BASE_CHARS, 'index.html is 1,568,182 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…1,597,962 bytes');
  eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…27,291 line feeds');
  eq(sha256(INDEX), BASE_SHA256, '…and hashes to the shipped digest');
  eq(INDEX, git(['show', BASE_SHA + ':index.html']), '…and is the base commit\'s index.html byte for byte');
  eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at 114,029');
  eq(CODE.length, CODE_CHARS, '…and is 1,454,127 units — the residual after twenty-six layers');
  eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src)).length,
    LOCAL_SCRIPTS, 'seventy local application scripts, unchanged by this audit');
  eq(DECLS.length, TOP_LEVEL_DECLS, 'the monolith declares 996 names at top level');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The region opens on its OWN banner, not on a header's closing rule.
  const firstLine = CODE.slice(RAW_AT, CODE.indexOf('\n', RAW_AT));
  eq(firstLine, '// ── Scanner IVR throttle/dedup/cache (mirrors fetchScannerCandles) ──',
    'the region opens on the feature\'s own banner line');
  ok(CODE[RAW_AT - 1] === '\n', '…which begins a line');
  eq(CODE.slice(EARNINGS[0], CODE.indexOf('\n', EARNINGS[0])),
    '// ── Scanner Earnings throttle/dedup/cache (mirrors fetchScannerIvr) ──',
    'and it ends where the next sibling\'s banner begins');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of that banner');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');

  const BODY = CODE.slice(RAW_AT, BODY_END);
  eq(RAW_END - RAW_AT, RAW_CHARS, 'the raw fragment is 4,051 units');
  eq(BODY.length, BODY_CHARS, '…of which 4,050 are the body');
  eq(CODE.slice(BODY_END, RAW_END), '\n', '…and exactly one line feed separates body from banner');
  eq(BODY.slice(-2), BODY_ENDING, 'the body ends `}\\n` — the last construct is the last declaration');
  eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'body is 4,060 bytes');
  eq((BODY.match(/\n/g) || []).length, BODY_LF, '…with 90 line feeds');
  eq(sha256(BODY), BODY_SHA256, '…and hashes to the digest Phase 2 must reproduce');

  // No trailing top-level code after the last declaration — the shape that made
  // both written boundary "rules" wrong on journal-backend-write-through.
  const owners = scanTopLevelDeclarations(BODY);
  const last = owners[owners.length - 1];
  eq(last.start + last.chars + 1, BODY.length,
    'the last declaration runs to the body\'s final newline: no trailing IIFE, no trailing statement');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The screen at this base');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MARKS.length, BANNER_MARKS, '182 top-level banner marks');
  eq(NAIVE.length, BANNER_MARKS, '…so a banner-to-banner walk would start 182 regions');
  eq(REGIONS.length, MERGED_REGIONS, '…but merging the header rules leaves 108');
  eq(NAIVE.length - REGIONS.length, HEADER_PAIRS_MERGED,
    '74 starts were a box header\'s CLOSING rule, not a feature start');
  eq(OWNED_REGIONS.length, OWNER_REGIONS, '97 of the 108 carry a top-level declaration');

  const mine = REGIONS.filter((r) => r.start === RAW_AT);
  eq(mine.length, 1, 'the recommended region is exactly one of them');
  eq([mine[0].start, mine[0].end], IVR, '…and the screen agrees on its span');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. A SIXTH direction — markup the monolith generates at runtime');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The demonstration. Five directions say this region is free.
  // Pinned to the screen first: the point is about a region the SCREEN offers,
  // not an interval chosen to make one. (Without this the region's end is a pin
  // nothing reads — a mutant moving it by one changed no answer and survived.)
  const rsOnScreen = REGIONS.filter((r) => r.start === RS_REGION[0]);
  eq(rsOnScreen.length, 1, 'the filter-handler region is one the screen produced');
  eq([rsOnScreen[0].start, rsOnScreen[0].end], RS_REGION, '…spanning exactly [337563,338630)');

  const rs = profile(RS_REGION);
  eq(rs.names, RS_NAMES, 'the scanner filter handlers are four names');
  eq(rs.inbound, RS_CODE_VIEW_INBOUND, 'the code view finds ZERO references to them');
  eq(rs.mkp, 0, '…and static markup finds none either');
  eq(rs.sib, 0, '…and no sibling module names them');
  eq(rs.inWrites, 0, '…so every INBOUND direction of the five reports zero');
  eq(rs.deps, RS_DEPENDENCIES, '…its score comes entirely from four OUTBOUND dependencies');
  eq(rs.gen, RS_GENERATED_INBOUND, 'yet NINE references exist, in markup the monolith writes into innerHTML');

  // The tie, asserted rather than described. On the five older directions this
  // region and the recommendation score the SAME, and the sixth separates them.
  const fiveOf = (p) => p.inbound + p.inWrites + p.outWrites.length + p.deps.length + p.sib + p.mkp;
  const rec = profile(IVR);
  eq(fiveOf(rs), FIVE_DIRECTION_TIE, 'on the five older directions the handler region scores 4');
  eq(fiveOf(rec), FIVE_DIRECTION_TIE, '…and so does the recommendation: the screen could not separate them');
  eq(rec.gen, GENERATED_MARKUP_REFERENCES, 'the sixth does: the recommendation has none');
  ok(rs.gen > rec.gen, '…and the handler region has nine');

  // …and they are real callers, not names appearing in prose.
  const one = refSites(STRINGS, 'rsSetMode').filter(outsideOf(RS_REGION))[0];
  ok(typeof one === 'number', 'a concrete site exists');
  ok(/onclick="rsSetMode\(/.test(CODE.slice(one - 12, one + 30)),
    '…and it is an onclick= attribute, so the handler must be a global when the click happens');

  // The reach, over the WHOLE screen rather than the region that revealed it.
  let regionsWith = 0, total = 0;
  for (const s of SWEEP) if (s.gen) { regionsWith++; total += s.gen; }
  eq(regionsWith, GEN_MARKUP_REGIONS, 'TWENTY-SEVEN of the 97 regions are named from generated markup');
  eq(total, GEN_MARKUP_TOTAL, '…73 references in total — not a corner case');

  // And the recommendation is clean on it.
  eq(profile(IVR).gen, GENERATED_MARKUP_REFERENCES,
    'the recommended region has none: nothing it owns is written into markup');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. A SEVENTH — a write THROUGH a name is not a reference to it');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The semantics, first: an assignment TO the name and a write THROUGH it are
  // different edits with different consequences, and only the first was counted.
  const probe = maskLiterals('X.k++; X.j = 1; X = 2;\n');
  const at = refSites(probe, 'X');
  eq(at.length, 3, 'three mentions of X in the probe');
  eq(at.filter((i) => isInboundPropertyWrite(probe, i, 'X')).length, 2,
    'two of them write THROUGH X');
  eq(at.filter((i) => /^\s*=[^=]/.test(probe.slice(i + 1, i + 8))).length, 1,
    '…and one assigns TO X — the only kind an earlier screen counted');

  // The candle sibling is written into four times, from a function that stays.
  const candles = profile(CANDLES);
  eq(candles.inWrites, 0, 'the candle region takes ZERO assignments to a name it owns');
  eq(candles.inPropWrites, CANDLES_INBOUND_PROP_WRITES,
    '…and FOUR writes through one — `_scannerCandleDiag.…++` and friends');
  const writer = FN_BODIES.filter((r) => 91676 >= r.start && 91676 <= r.end)
    .sort((a, b) => b.start - a.start)[0];
  ok(writer && CODE.slice(writer.start - 120, writer.start).indexOf('_scannerGuardBlockCandleSub') >= 0,
    '…from inside _scannerGuardBlockCandleSub, which is not part of the region');

  // The recommendation takes neither kind.
  const ivr = profile(IVR);
  eq(ivr.inWrites, INBOUND_WRITES, 'the recommended region takes no assignment to a name it owns');
  eq(ivr.inPropWrites, INBOUND_PROPERTY_WRITES, '…and no write through one either');

  // The reach, over the whole screen.
  let regionsWith = 0, total = 0;
  for (const s of SWEEP) if (s.inPropWrites) { regionsWith++; total += s.inPropWrites; }
  eq(regionsWith, INBOUND_PROP_WRITE_REGIONS, 'FIFTEEN of the 97 regions are written into from outside');
  eq(total, INBOUND_PROP_WRITE_TOTAL, '…383 writes in total');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The family — three mirrors that share shape, not state');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(CANDLES[1], IVR[0], 'candles ends where IVR begins');
  eq(IVR[1], EARNINGS[0], '…and IVR ends where earnings begins: the three are contiguous');
  eq([FAMILY[0], FAMILY[1]], [CANDLES[0], EARNINGS[1]], 'so the family is one range');

  const c = profile(CANDLES), i = profile(IVR), e = profile(EARNINGS), f = profile(FAMILY);
  eq(c.total, CANDLES_TOTAL, 'candles scores 9');
  eq(i.total, IVR_TOTAL, 'IVR scores 4');
  eq(e.total, EARNINGS_TOTAL, 'earnings scores 5');
  eq(f.total, FAMILY_TOTAL, 'and all three together score 18');
  eq(c.total + i.total + e.total, f.total,
    'which is the SUM EXACTLY — combining them removes not one reference');
  eq(f.units, FAMILY_UNITS, 'the family is 13,710 units');
  eq(f.owners, FAMILY_OWNERS, '…and 36 owners, for no coupling gain over the 4,051 of the middle one');

  // Each name is referenced only from outside the family or inside its own
  // member — none of the three reaches into another.
  for (const [label, a, b] of [['candles', CANDLES, IVR], ['ivr', IVR, EARNINGS], ['earnings', EARNINGS, CANDLES]]) {
    const names = namesIn(a);
    let crossing = 0;
    for (const n of names) crossing += refSites(MASKED, n).filter((p) => p >= b[0] && p < b[1]).length;
    eq(crossing, 0, label + ' is never named by the sibling next to it');
  }

  // And why the middle one: it is the only member with no dependency.
  eq(c.deps, CANDLES_DEPENDENCIES, 'candles calls fetchCandles, which stays in the monolith');
  eq(e.deps, EARNINGS_DEPENDENCIES, 'earnings calls fetchEarningsForTicker, likewise');
  eq(i.deps, MONOLITH_DEPENDENCIES, 'IVR calls nothing the monolith declares');
  ok(i.total < c.total && i.total < e.total, '…and scores lowest of the three');
  ok(i.inPropWrites === 0 && c.inPropWrites > 0,
    '…and is the only one of the two lowest that is not written into from outside');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. The recommendation');
// ─────────────────────────────────────────────────────────────────────────────
{
  const BODY = CODE.slice(RAW_AT, BODY_END);
  const owners = scanTopLevelDeclarations(BODY);
  eq(owners.length, OWNER_COUNT, 'twelve top-level owners');
  eq(owners.map((d) => ({ name: d.name, form: d.form, start: d.start, chars: d.chars })),
    OWNERS_EXPECTED, '…four config vars, five state vars, three functions');
  eq(owners.filter((d) => d.form === 'function').map((d) => d.name),
    ['_scannerIvrCacheKey', '_scannerIvrPumpQueue', 'fetchScannerIvr'], 'the three functions');

  const p = profile(IVR);
  eq(p.inbound, EXTERNAL_EDGES, 'FOUR references reach in from the rest of the monolith');
  eq(p.sites, EDGE_SITES, '…at exactly these four sites');
  ok(p.sites.every(insideFunction), '…every one inside a function body, so none runs at load');

  // What the four actually are.
  eq(CODE.slice(CONSUMER_SITE, CONSUMER_SITE + CONSUMER_NAME.length), CONSUMER_NAME,
    'the site at 58,584 names fetchScannerIvr');
  ok(/await fetchScannerIvr\(/.test(CODE.slice(CONSUMER_SITE - 8, CONSUMER_SITE + 30)),
    '…as the real consumer: an awaited call');
  for (const at of DIAG_SITES) {
    ok(/typeof _scannerIvrDiag === 'object'|_scannerIvrDiag\) \? _scannerIvrDiag|_scannerIvrDiag : \{\}/
      .test(CODE.slice(at - 30, at + 60)),
      'the other three are guarded diag reads at ' + at);
  }
  eq(p.outWrites.length, OUTBOUND_WRITES, 'it writes through no name it does not own');
  eq(p.outWrites, [], '…the outbound direction that disqualified #424\'s candidate is empty here');
  eq(p.deps, MONOLITH_DEPENDENCIES, 'it names nothing the monolith declares');
  eq(p.sib, SIBLING_REFERENCES, 'none of the seventy shipped modules names it');
  eq(p.mkp, MARKUP_REFERENCES, 'static markup does not name it');
  eq(p.gen, GENERATED_MARKUP_REFERENCES, 'generated markup does not name it');

  // It is the lowest-coupled region carrying this much code.
  // Only the regions big enough to qualify are profiled in full — the rest
  // cannot win the comparison and each full profile costs a sweep of every
  // sibling module.
  const ranked = OWNED_REGIONS.filter((r) => r.end - r.start >= 4000)
    .map((r) => ({ r, p: profile([r.start, r.end]) }))
    .sort((a, b) => a.p.total - b.p.total);
  eq([ranked[0].r.start, ranked[0].r.end], IVR,
    'of every region of 4,000 units or more, this one is the least coupled');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  const BODY = CODE.slice(RAW_AT, BODY_END);
  const owners = scanTopLevelDeclarations(BODY);
  eq(evaluationTimeReads(BODY, owners, maskLiterals), EVALUATION_TIME_READS,
    'the region reads NO name at evaluation time — the check that disqualified #424\'s candidate');
  const chars = Array.from(BODY);
  for (const d of owners) for (let i = d.start; i <= d.end; i++) chars[i] = ' ';
  eq(chars.join('').split('\n').filter((l) => !isBlankOrComment(l)).length,
    TOP_LEVEL_STATEMENT_LINES, 'zero top-level statement lines outside the declarations');

  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining twelve globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.map((d) => d.name).sort(), '…exactly its own owners');
  eq(typeof ctx.fetchScannerIvr, 'function', 'the entry point is there');
  eq(ctx._scannerIvrActive, 0, 'the queue starts idle');
  eq(ctx._scannerIvrCacheKey('AAPL'), ctx._scannerIvrCacheKey('AAPL'), 'the cache key is deterministic');
  ok(ctx._scannerIvrCacheKey('AAPL') !== ctx._scannerIvrCacheKey('MSFT'), '…and distinguishes tickers');

  // Inert at load: no network, no timer, no DOM. A stub host would have caught
  // nothing here, because nothing is called.
  const watched = { calls: [] };
  const ctx2 = {
    fetch: () => { watched.calls.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.calls.push('setInterval'); },
    setTimeout: () => { watched.calls.push('setTimeout'); },
    document: { getElementById: () => { watched.calls.push('document'); return null; } },
  };
  vm.createContext(ctx2);
  vm.runInContext(BODY, ctx2);
  eq(watched.calls, [], 'loading it performs no fetch, starts no timer and touches no DOM');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The modelled extraction — the figures Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  const BODY = CODE.slice(RAW_AT, BODY_END);
  const TAG = '<script src="./js/services/scanner-ivr-throttle.js"></script>\n';
  const ANCHOR = '<script src="./js/portfolio/portfolio-vega-monitor.js"></script>\n';
  ok(INDEX.indexOf(ANCHOR) >= 0, 'the vega-monitor tag is the anchor the new tag follows');
  ok(INDEX.indexOf(TAG) < 0, '…and no scanner-ivr tag exists yet: this audit ships no tag');

  const rawStartInIndex = CODE_AT + RAW_AT;
  eq(INDEX.slice(rawStartInIndex, rawStartInIndex + 20), CODE.slice(RAW_AT, RAW_AT + 20),
    'the raw fragment sits at 194,749 in document coordinates');

  // The identity the whole relocation rests on: the module file is the BODY,
  // and the raw fragment is that body plus one structural line feed. Both leave
  // index.html; only the body is written to the module, which is what keeps
  // `git diff --check` clean on a file that would otherwise end mid-line.
  eq(BODY + '\n', CODE.slice(RAW_AT, RAW_END),
    'body + one line feed IS the raw fragment — the identity Phase 2\'s undo helper rests on');

  // Model the move without performing it. The tag goes after the anchor, which
  // is upstream of the monolith, so the fragment's offset shifts by the tag.
  const anchorEnd = INDEX.indexOf(ANCHOR) + ANCHOR.length;
  ok(anchorEnd < rawStartInIndex, 'the anchor tag is upstream of the fragment');
  const extracted = INDEX.slice(0, anchorEnd) + TAG
    + INDEX.slice(anchorEnd, rawStartInIndex)
    + INDEX.slice(rawStartInIndex + RAW_CHARS);
  eq(extracted.length, BASE_CHARS - RAW_CHARS + TAG.length,
    'the extracted document is the base less 4,051 units plus the tag');
  eq(BASE_CHARS - extracted.length, RAW_CHARS - TAG.length, '…a net reduction of 3,990 units');
  eq(extracted.indexOf(ANCHOR + TAG) >= 0, true, 'the tag lands immediately after the anchor');
  eq((extracted.match(/<script src="\.\/[^"]+"><\/script>/g) || []).length, LOCAL_SCRIPTS + 1,
    '…making seventy-one local application scripts');

  // And the round trip, so Phase 2 inherits a reconstruction that is known to
  // work before a single byte is moved: drop the tag, put the fragment back.
  const reinsertAt = rawStartInIndex + TAG.length;
  const restored = extracted.slice(0, anchorEnd)
    + extracted.slice(anchorEnd + TAG.length, reinsertAt)
    + BODY + '\n'
    + extracted.slice(reinsertAt);
  eq(restored.length, BASE_CHARS, 'the reconstruction is the right length');
  eq(sha256(restored), BASE_SHA256, '…and byte-identical to the base document');
  eq(restored, INDEX, '…which is the round trip Phase 2 must ship as a helper');
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
    'NO production file changed — this is a measurement, not a move');
  eq(git(['diff', '--name-only', BASE_SHA, '--', 'index.html', 'js/']).trim(), '',
    '…asserted against git, not inferred from the diff');
  ok(changed.every((rel) => rel.startsWith('tests/')), 'every changed path is a test artifact');

  const added = changed.filter((rel) => !fileExistsAt(BASE_SHA, rel)).sort();
  eq(added, ADDED_FILES, 'exactly two files are added: this audit and its mutation spec');

  const ratcheted = changed.filter((rel) => rel !== AUDIT_REL && rel !== AUDIT_SPEC_REL
    && MUTATION_BOOKKEEPING.indexOf(rel) < 0);
  eq(ratcheted.length, RATCHETED_CONTRACTS, 'sixteen contracts carry the suite-count ratchet');
  for (const rel of ratcheted) {
    const before = git(['show', BASE_SHA + ':' + rel]);
    const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const b = before.split('\n'), a = after.split('\n');
    eq(b.length, a.length, rel + ': the ratchet changes no line count');
    const diffLines = [];
    for (let i = 0; i < b.length; i++) if (b[i] !== a[i]) diffLines.push([b[i], a[i]]);
    eq(diffLines.length, 1, rel + ': exactly one line differs');
    eq(diffLines[0][0], 'const TEST_FILE_COUNT = ' + BASE_TEST_FILE_COUNT + ';', rel + ': …and it was the count');
    eq(diffLines[0][1], 'const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';', rel + ': …ratcheted by one');
  }
  for (const rel of MUTATION_BOOKKEEPING) {
    ok(changed.indexOf(rel) >= 0, rel + ': re-pinned because the ratchet moved a constant it names');
  }
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is 155 files with this audit in it');
}

function fileExistsAt(sha, rel) {
  try { git(['cat-file', '-e', sha + ':' + rel]); return true; } catch (e) { return false; }
}

console.log('\n' + pass + ' assertions passed.');
console.log('SCANNER_IVR_AUDIT_OK');
