'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER EARNINGS THROTTLE — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. The scanner Earnings throttle/dedup/cache,
// [80720,85602) in monolith coordinates: 4,882 units, ELEVEN owners, and FOUR
// references in the entire application — one real caller and three defensive
// `typeof` reads, the same shape the IVR sibling had when #444 recommended it.
//
//     4 inbound references — 1 call to fetchScannerEarnings, 3 guarded reads
//     0 inbound writes, 0 inbound PROPERTY writes
//     0 outbound property writes
//     0 references from any of the seventy-one shipped modules
//     0 references from static markup, 0 from GENERATED markup
//     0 evaluation-time reads, 0 top-level statement lines
//     it loads in a COMPLETELY empty VM, defining eleven globals
//     1 monolith dependency: fetchEarningsForTicker, called at RUNTIME
//
// THE ONE DEPENDENCY IS WHY IT WAS SECOND, NOT WHY IT IS UNSAFE. #444 took the
// IVR sibling first precisely because that one had none. `fetchEarningsForTicker`
// is called from inside `fetchScannerEarnings`, never at evaluation time, so the
// module loads in an empty VM regardless — §8 proves that rather than arguing it.
// SIX of the shipped contracts already pin a non-empty MONOLITH_DEPENDENCIES, so
// a runtime dependency is the common case and not an exception carved for this
// one. §5 counts them rather than asserting it — the first draft of this line
// said "two", inferred from the layers nearest to hand.
//
// THE SEVENTH DIRECTION HAS ALREADY CHANGED THE RANKING, which is the first
// evidence that promoting it in #445 was worth doing. §4 measures the effect
// over the whole screen: FORTY of the 96 owner-carrying regions score
// differently under seven directions than under five.
//
// It lands where it matters. On the five-direction screen FIVE regions ranked
// ahead of this recommendation — four tied at 4, plus CONFIGURATION at 2. Two of
// the four are worse than they looked: the scanner's filter handlers go 4 → 13
// on generated-markup callers, and the option-chain region goes 4 → 6 on inbound
// property writes. The recommendation did not improve; the screen stopped
// flattering its rivals. §4 counts both sets.
//
// THE FAMILY IS DOWN TO TWO, AND THE GAP WIDENED. With the IVR throttle gone
// the candle and earnings siblings are now ADJACENT. #444 scored them 9 and 5;
// under seven directions candles is 13, because its four inbound property
// writes are now counted as what they are instead of folded in with reads.
// Earnings is unchanged at 5. §6 measures both on the shipped tree.
//
// THE LOWEST-COUPLED REGION ON THE BOARD IS STILL NOT THE RECOMMENDATION, and
// §7 is the reason written down so it stops being rediscovered. `CONFIGURATION`
// [1,924) scores 2 — the best of all 96 at THIS base, which is the set §7
// measures; earlier screens are not re-derived here. It is 923 units
// wrapping three lines of code, and its single owner is a `const`, which NO
// layer of the twenty-seven has ever been.
//
// That matters beyond taste, because it breaks a check every contract carries:
//
//     vm.runInContext('const X = 1; var Y = 2;', ctx)   →  ctx keys: ['Y']
//
// A top-level `const` is a global LEXICAL binding, not a property of the VM
// context — so a const-only module reports VM_GLOBALS === 0 and reads as
// "exports nothing". §7 runs the CONFIGURATION body in a VM and shows it
// reporting zero context keys while still setting `window.APEX_BUILD_TAG`: the
// measurement is correct and the conclusion it invites is wrong.
//
// And the browser disagrees with the VM, which the SHIPPED APPLICATION already
// proves. `js/config/backend-config.js` — the one module of seventy-one that
// owns top-level `const`s — loads before the monolith, and the monolith reads
// its `BACKEND` THIRTY-NINE times. Cross-script const visibility is not a
// question this programme needs to answer in the abstract; it is load-bearing
// in production today. §7 asserts that rather than citing it.
//
// So CONFIGURATION is deferred on VALUE — three lines of code for 923 units —
// not on safety, and the next audit that meets it can read why here instead of
// measuring it again.
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
  literalView, isPropertyWriteAt,
} = require('./lib/extraction-boundary.js');

// ── The base these numbers were measured against ─────────────────────────────
const BASE_SHA = '6253ac40';
const AUDIT_REL = 'tests/temporary-scanner-earnings-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/scanner-earnings-audit.spec.js';
const ADDED_FILES = [AUDIT_SPEC_REL, AUDIT_REL];

const BASE_CHARS = 1564193;
const BASE_UTF8 = 1593963;
const BASE_LF = 27201;
const BASE_SHA256 = '4bed91411ec54f1b2e3314d890a552fc36b06c2c575a7ebe9fb40c32881967f0';
const LOCAL_SCRIPTS = 71;
const BASE_TEST_FILE_COUNT = 155;
const TEST_FILE_COUNT = 156;
const RATCHETED_CONTRACTS = 16;
// The seventeenth contract that changed is NOT a one-line ratchet: it records
// the retirement of its own mutation spec, which is what holds the mutant
// budget flat. §10 audits that edit separately rather than widening the
// one-line rule to cover it — a rule widened to fit an exception stops being a
// rule.
const SPEC_RETIREMENT_CONTRACT = 'tests/portfolio-dxlink-greeks-boundary-contract.test.js';
const RETIRED_SPEC = 'tests/mutation-specs/portfolio-dxlink-greeks-contract.spec.js';
const RETIRED_SPEC_MUTANTS = 49;
const MUTATION_BOOKKEEPING = [
  'tests/mutation-coverage-contract.test.js',
  'tests/mutation-specs/mutation-coverage-contract.spec.js',
  'tests/mutation-specs/portfolio-dxlink-greeks-contract.spec.js',
  'tests/mutation-specs/scanner-ivr-contract.spec.js',
  'tests/mutation-specs/strategy-templates-contract.spec.js',
  'tests/mutation-specs/vega-monitor-contract.spec.js',
];

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114091;
const CODE_CHARS = 1450076;
const TOP_LEVEL_DECLS = 984;
const BANNER_MARKS = 181;
const MERGED_REGIONS = 107;
const OWNER_REGIONS = 96;
const HEADER_PAIRS_MERGED = 74;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 80720;
const RAW_END = 85602;
const BODY_END = 85601;
const RAW_CHARS = 4882;
const BODY_CHARS = 4881;
const BODY_UTF8 = 4895;
const BODY_LF = 95;
const BODY_SHA256 = 'e3022a6e3b99ee0b47e9a8af01160301248713d5e08088c009e6df9b3a5c9da1';
const BODY_ENDING = '}\n';
const OWNER_COUNT = 11;
const FUNCTION_OWNERS = 3;
const OWNERS_EXPECTED = [
  { name: '_SCANNER_EARNINGS_CONCURRENCY', form: 'var', start: 362, chars: 38 },
  { name: '_SCANNER_EARNINGS_CACHE_TTL_MS', form: 'var', start: 401, chars: 52 },
  { name: '_SCANNER_EARNINGS_SOURCE', form: 'var', start: 468, chars: 49 },
  { name: '_scannerEarningsCache', form: 'var', start: 518, chars: 48 },
  { name: '_scannerEarningsInFlight', form: 'var', start: 594, chars: 51 },
  { name: '_scannerEarningsQueue', form: 'var', start: 665, chars: 31 },
  { name: '_scannerEarningsActive', form: 'var', start: 697, chars: 31 },
  { name: '_scannerEarningsDiag', form: 'var', start: 729, chars: 312 },
  { name: '_scannerEarningsCacheKey', form: 'function', start: 1042, chars: 169 },
  { name: '_scannerEarningsPumpQueue', form: 'function', start: 1212, chars: 2235 },
  { name: 'fetchScannerEarnings', form: 'function', start: 3448, chars: 1432 },
];

// ── Coupling, in all seven directions ────────────────────────────────────────
const EXTERNAL_EDGES = 4;
const EDGE_SITES = [95154, 733846, 733883, 733907];
const CONSUMER_SITE = 95154;
const CONSUMER_NAME = 'fetchScannerEarnings';
const DIAG_SITES = [733846, 733883, 733907];
const INBOUND_WRITES = 0;
const INBOUND_PROPERTY_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = ['fetchEarningsForTicker'];
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const GENERATED_MARKUP_REFERENCES = 0;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 11;

// ── What the seventh direction changed ───────────────────────────────────────
const REGIONS_SCORED_DIFFERENTLY = 40;
const RS_REGION = [333512, 334579];
const RS_FIVE = 4;
const RS_SEVEN = 13;
const OPTION_CHAIN_REGION = [1057111, 1057523];
const OPTION_CHAIN_FIVE = 4;
const OPTION_CHAIN_SEVEN = 6;
const RECOMMENDATION_SCORE = 5;
const REGIONS_AHEAD_ON_FIVE = 5;
const REGIONS_TIED_AT_FOUR = 4;
const CONTRACTS_WITH_A_DEPENDENCY = 6;

// ── The family, now two ──────────────────────────────────────────────────────
const CANDLES = [75943, 80720];
const CANDLES_SEVEN = 13;
const CANDLES_INBOUND_PROPERTY_WRITES = 4;
const CANDLES_DEPENDENCIES = ['fetchCandles'];

// ── CONFIGURATION: lowest coupling, deferred on value ────────────────────────
const CONFIG_REGION = [1, 924];
const CONFIG_SCORE = 2;
const CONFIG_OWNER = 'APEX_BUILD_TAG';
const CONFIG_OWNER_FORM = 'const';
const CONFIG_CODE_LINES = 3;
// Where the chain-wide counts are READ from, never restated. CLAUDE.md keeps
// them in the newest layer's contract for exactly this reason.
const NEWEST_CONTRACT = 'tests/vega-monitor-boundary-contract.test.js';
const CHAIN_LAYERS = 27;
const CHAIN_LAYERS_OWNING_CONST = 0;
const SHIPPED_MODULES_OWNING_CONST = 1;
const CONST_MODULE = 'js/config/backend-config.js';
const BACKEND_READS_FROM_MONOLITH = 39;

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

console.log('SCANNER EARNINGS THROTTLE — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

const INDEX = APP_LOADER.loadIndexHtml();
const CODE = APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const MASKED = maskLiterals(CODE);
const STRINGS = literalView(CODE, maskLiterals, stripComments);
const DECLS = scanTopLevelDeclarations(CODE);
const BY_NAME = new Map(DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const MARKS = topLevelBanners(CODE, FN_BODIES);

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

const SIBLINGS = APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src))
  .map((t) => {
    const rel = t.src.replace(/^\.\//, '');
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return { rel, masked: maskLiterals(src), bound: locallyBound(src) };
  });
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');

// One indexed pass per view: the whole-screen sweep is otherwise ~2,000 scans
// of a 1.45 MB string, which is what took #444's target from 2.4 s to 6.2 s a
// run — and a mutant costs one run of its target.
function occurrenceIndex(text) {
  const idx = new Map();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const at = m.index + m[1].length;
    const b = idx.get(m[2]);
    if (b) b.push(at); else idx.set(m[2], [at]);
  }
  return idx;
}
const OCC_CODE = occurrenceIndex(MASKED);
const OCC_STR = occurrenceIndex(STRINGS);
const occ = (i, n) => i.get(n) || [];

// The full seven-direction profile of a range, plus the five-direction score the
// older screen would have produced for it.
function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  const body = CODE.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0;
  const sites = [];
  for (const n of names) {
    for (const at of occ(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += occ(OCC_STR, n).filter(outside).length;
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
  const five = inbound + inWrites + outWrites.size + deps.size + sib + mkp;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp,
    outWrites: Array.from(outWrites).sort(), deps: Array.from(deps).sort(),
    sites: sites.sort((a, b) => a - b),
    five, seven: five + inPropWrites + gen,
  };
}
// THE SWEEP NEEDS TWO NUMBERS, NOT SEVEN. §4 asks only whether a region scores
// differently under seven directions than five, and that difference is exactly
// `inPropWrites + gen` — both answerable from the indexes above. The full
// `profile` also scans all seventy-one sibling modules for every owned name,
// which over 96 regions is what took #444's target from 2.4 s to 6.2 s a run.
// A mutant costs one run of its target, and this spec has 76 of them, so the
// indexed-and-capped sweep is 88 s of CI against 155 s for the unabridged one —
// measured on this file both ways, best-of-three and alone.
function sweepDelta(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const outside = (i) => i < range[0] || i >= range[1];
  let inPropWrites = 0, gen = 0;
  for (const n of names) {
    for (const at of occ(OCC_CODE, n).filter(outside)) {
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += occ(OCC_STR, n).filter(outside).length;
  }
  return inPropWrites + gen;
}
const SWEEP_DELTA = OWNED_REGIONS.map((r) => sweepDelta([r.start, r.end]));

// §4 counts how many of the 96 regions rank AHEAD of the recommendation on the
// five-direction screen — a claim over the whole set, so the whole set is
// measured. But it only needs the five-score where it is BELOW the cap, and the
// six directions are all non-negative: once a partial sum reaches the cap the
// region cannot rank ahead, and the rest of the scan is wasted. So the terms run
// cheapest-first and bail at the cap, exact below it and `null` at or above.
// This is not sampling — every region is still screened. `fiveCapped` is proven
// against the unabridged `profile` in §4's control.
function fiveCapped(range, cap) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  let n5 = 0;
  for (const n of names) {
    for (const at of occ(OCC_CODE, n).filter(outside)) {
      n5++;
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) n5++;
    }
  }
  if (n5 >= cap) return null;
  const bodyMasked = MASKED.slice(range[0], range[1]);
  n5 += new Set(propertyWriteBases(bodyMasked).filter((b) => !nameSet.has(b) && BY_NAME.has(b))).size;
  if (n5 >= cap) return null;
  for (const n of names) n5 += refSites(STATIC_MARKUP, n).length;
  if (n5 >= cap) return null;
  const local = locallyBound(CODE.slice(range[0], range[1]));
  for (const d of DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (refSites(bodyMasked, d.name).length) n5++;
  }
  if (n5 >= cap) return null;
  for (const n of names) for (const s of SIBLINGS) if (!s.bound.has(n)) n5 += refSites(s.masked, n).length;
  return n5 >= cap ? null : n5;
}
const SWEEP_FIVE = OWNED_REGIONS.map((r) => fiveCapped([r.start, r.end], RECOMMENDATION_SCORE));

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, BASE_CHARS, 'index.html is 1,564,193 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…1,593,963 bytes');
  eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…27,201 line feeds');
  eq(sha256(INDEX), BASE_SHA256, '…and hashes to the shipped digest');
  eq(INDEX, git(['show', BASE_SHA + ':index.html']), '…and is the base commit\'s index.html byte for byte');
  eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at 114,091');
  eq(CODE.length, CODE_CHARS, '…and is 1,450,076 units — the residual after twenty-seven layers');
  eq(SIBLINGS.length, LOCAL_SCRIPTS, 'seventy-one local application scripts, unchanged by this audit');
  eq(DECLS.length, TOP_LEVEL_DECLS, 'the monolith declares 984 names at top level');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  const firstLine = CODE.slice(RAW_AT, CODE.indexOf('\n', RAW_AT));
  eq(firstLine, '// ── Scanner Earnings throttle/dedup/cache (mirrors fetchScannerIvr) ──',
    'the region opens on the feature\'s own banner line');
  ok(CODE[RAW_AT - 1] === '\n', '…which begins a line');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');

  const BODY = CODE.slice(RAW_AT, BODY_END);
  eq(RAW_END - RAW_AT, RAW_CHARS, 'the raw fragment is 4,882 units');
  eq(BODY.length, BODY_CHARS, '…of which 4,881 are the body');
  eq(CODE.slice(BODY_END, RAW_END), '\n', '…and exactly one line feed separates body from banner');
  eq(BODY.slice(-2), BODY_ENDING, 'the body ends `}\\n`');
  eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'body is 4,895 bytes');
  eq((BODY.match(/\n/g) || []).length, BODY_LF, '…with 95 line feeds');
  eq(sha256(BODY), BODY_SHA256, '…and hashes to the digest Phase 2 must reproduce');

  const owners = scanTopLevelDeclarations(BODY);
  const last = owners[owners.length - 1];
  eq(last.start + last.chars + 1, BODY.length,
    'the last declaration runs to the body\'s final newline: no trailing IIFE, no trailing statement');

  // THE BOUNDARY ARRIVES PRE-VALIDATED. #444 published this same region at
  // [84771,89653), before the IVR throttle was cut from above it. The shift is
  // exactly the 4,051 the IVR relocation removed, so the two audits agree to the
  // byte. (This line first said 4,882 — that is THIS region's own size, not what
  // left from above it. The three assertions below always said 4,051.)
  const IVR_REMOVED = require('./lib/scanner-ivr-throttle-undo.js').RAW_CHARS;
  eq(IVR_REMOVED, 4051, 'the IVR relocation removed 4,051 units from above this region');
  eq(RAW_AT + IVR_REMOVED, 84771, '…so #444\'s published start of 84,771 maps onto this one');
  eq(RAW_END + IVR_REMOVED, 89653, '…and its published end of 89,653 likewise');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The screen at this base');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MARKS.length, BANNER_MARKS, '181 top-level banner marks');
  eq(REGIONS.length, MERGED_REGIONS, '…merging the header rules leaves 107 regions');
  eq(NAIVE.length - REGIONS.length, HEADER_PAIRS_MERGED,
    '74 starts were a box header\'s CLOSING rule, not a feature start');
  eq(OWNED_REGIONS.length, OWNER_REGIONS, '96 of the 107 carry a top-level declaration');
  const mine = REGIONS.filter((r) => r.start === RAW_AT);
  eq(mine.length, 1, 'the recommended region is exactly one of them');
  eq([mine[0].start, mine[0].end], [RAW_AT, RAW_END], '…and the screen agrees on its span');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. What the seventh direction changed');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The reach, over the whole screen.
  eq(SWEEP_DELTA.filter((d) => d !== 0).length, REGIONS_SCORED_DIFFERENTLY,
    'FORTY of the 96 regions score differently under seven directions than five');

  // And where it lands: the two rivals that tied ahead of the recommendation.
  // Each rival is a region the screen produced, not a pair typed in beside it.
  // Widening any of them by one unit changes no score, so the scores alone left
  // all three endpoints pinned by nothing.
  const screened = (r) => REGIONS.some((x) => x.start === r[0] && x.end === r[1]);
  ok(screened(RS_REGION), 'the rs-handlers range is exactly a screened region');
  ok(screened(OPTION_CHAIN_REGION), '…as is the option-chain range');

  const rs = profile(RS_REGION);
  eq(rs.five, RS_FIVE, 'the scanner filter handlers scored 4 on the five-direction screen');
  eq(rs.seven, RS_SEVEN, '…and score 13 on seven, on generated-markup callers');
  eq(rs.gen, RS_SEVEN - RS_FIVE, '…all nine of the difference being those callers');

  const oc = profile(OPTION_CHAIN_REGION);
  eq(oc.five, OPTION_CHAIN_FIVE, 'the option-chain region also scored 4 on five');
  eq(oc.seven, OPTION_CHAIN_SEVEN, '…and scores 6 on seven, on inbound property writes');
  eq(oc.inPropWrites, OPTION_CHAIN_SEVEN - OPTION_CHAIN_FIVE,
    '…both of the difference being writes THROUGH a name it owns');

  const rec = profile([RAW_AT, RAW_END]);
  eq(rec.five, RECOMMENDATION_SCORE, 'the recommendation scored 5 on five directions');
  eq(rec.seven, RECOMMENDATION_SCORE, '…and 5 on seven: nothing about it changed');
  ok(rs.five <= rec.five && oc.five <= rec.five,
    'both rivals RANKED AHEAD of it on the old screen');
  ok(rs.seven > rec.seven && oc.seven > rec.seven,
    '…and both rank behind it now — the screen stopped flattering them');

  // And the size of that set, measured rather than recalled. The header's first
  // draft said THREE; it is five, of which four tie at 4.
  eq(SWEEP_FIVE.filter((f) => f !== null).length, REGIONS_AHEAD_ON_FIVE,
    'FIVE regions ranked ahead of the recommendation on the five-direction screen');
  eq(SWEEP_FIVE.filter((f) => f === 4).length, REGIONS_TIED_AT_FOUR, '…four of them tied at exactly 4');

  // Control — the capped screen is an optimisation, so it is held against the
  // unabridged profile it replaces. Both regions that rank ahead and one that
  // does not: a `fiveCapped` that returned `null` unconditionally would score
  // zero regions ahead and pass the two counts above, and this is what refutes
  // it. §4's whole argument rests on these being the same measurement.
  for (const r of [RS_REGION, OPTION_CHAIN_REGION, [RAW_AT, RAW_END]]) {
    const full = profile(r).five;
    eq(fiveCapped(r, RECOMMENDATION_SCORE), full < RECOMMENDATION_SCORE ? full : null,
      `capped screen agrees with the full profile at [${r[0]},${r[1]})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The recommendation');
// ─────────────────────────────────────────────────────────────────────────────
{
  const BODY = CODE.slice(RAW_AT, BODY_END);
  const owners = scanTopLevelDeclarations(BODY);
  eq(owners.length, OWNER_COUNT, 'eleven top-level owners');
  eq(owners.map((d) => ({ name: d.name, form: d.form, start: d.start, chars: d.chars })),
    OWNERS_EXPECTED, '…three config vars, five state vars, three functions');
  eq(owners.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, 'three of them are functions');

  const p = profile([RAW_AT, RAW_END]);
  eq(p.inbound, EXTERNAL_EDGES, 'FOUR references reach in from the rest of the monolith');
  eq(p.sites, EDGE_SITES, '…at exactly these four sites');
  ok(p.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
  eq(CODE.slice(CONSUMER_SITE, CONSUMER_SITE + CONSUMER_NAME.length), CONSUMER_NAME,
    'the site at 95,154 names fetchScannerEarnings');
  ok(/await fetchScannerEarnings\(/.test(CODE.slice(CONSUMER_SITE - 8, CONSUMER_SITE + 30)),
    '…as the real consumer: an awaited call');
  for (const at of DIAG_SITES) {
    ok(/_scannerEarningsDiag/.test(CODE.slice(at, at + 24)),
      'the other three read _scannerEarningsDiag at ' + at);
  }
  eq(p.inWrites, INBOUND_WRITES, 'nothing outside assigns TO a name it owns');
  eq(p.inPropWrites, INBOUND_PROPERTY_WRITES, '…and nothing writes THROUGH one either');
  eq(p.outWrites.length, OUTBOUND_WRITES, 'it writes through no name it does not own');
  eq(p.deps, MONOLITH_DEPENDENCIES, 'it calls exactly one monolith function');
  eq(p.sib, SIBLING_REFERENCES, 'none of the seventy-one shipped modules names it');
  eq(p.mkp, MARKUP_REFERENCES, 'static markup does not name it');
  eq(p.gen, GENERATED_MARKUP_REFERENCES, 'and neither does generated markup');

  // THE DEPENDENCY IS A RUNTIME CALL, which is the whole of why it is not a bar.
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  ok(dep && dep.start > RAW_END,
    'fetchEarningsForTicker is declared AFTER this region, so load order could not help anyway');
  const callSites = refSites(MASKED.slice(RAW_AT, RAW_END), MONOLITH_DEPENDENCIES[0])
    .map((i) => i + RAW_AT);
  ok(callSites.length > 0, '…and the region does call it');
  ok(callSites.every(insideFunction), '…from inside a function body, never at evaluation time');

  // A runtime dependency is the COMMON case, not an exception made for this one.
  const withDeps = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /boundary-contract\.test\.js$/.test(f))
    .filter((f) => {
      const m = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')
        .match(/^const MONOLITH_DEPENDENCIES = (\[[^;]*\]);$/m);
      return m && m[1].trim() !== '[]';
    });
  eq(withDeps.length, CONTRACTS_WITH_A_DEPENDENCY,
    'SIX shipped contracts already pin a non-empty MONOLITH_DEPENDENCIES');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The family, now two — and the gap widened');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(CANDLES[1], RAW_AT, 'with the IVR throttle gone the candle sibling now ends where this region begins');
  const c = profile(CANDLES);
  eq(c.seven, CANDLES_SEVEN, 'the candle sibling scores 13 under seven directions');
  eq(c.inPropWrites, CANDLES_INBOUND_PROPERTY_WRITES,
    '…four of which are writes THROUGH a name it owns, counted for the first time');
  eq(c.deps, CANDLES_DEPENDENCIES, '…and it calls fetchCandles');
  const rec = profile([RAW_AT, RAW_END]);
  ok(c.seven > rec.seven, 'so of the two remaining siblings this one is clearly the better cut');
  eq(c.seven - rec.seven, 8, '…by eight points, where #444 measured the gap at four');

  // Still no cross-reference between them: the reason the family was never
  // worth taking whole has not changed.
  let crossing = 0;
  for (const n of c.names) crossing += refSites(MASKED, n).filter((i) => i >= RAW_AT && i < RAW_END).length;
  for (const n of profile([RAW_AT, RAW_END]).names) {
    crossing += refSites(MASKED, n).filter((i) => i >= CANDLES[0] && i < CANDLES[1]).length;
  }
  eq(crossing, 0, 'neither sibling names the other, so combining them would still remove no coupling');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. The lowest-coupled region is deferred on VALUE, not on safety');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(REGIONS.some((x) => x.start === CONFIG_REGION[0] && x.end === CONFIG_REGION[1]),
    'CONFIGURATION is exactly a screened region, endpoints included');
  const conf = profile(CONFIG_REGION);
  eq(conf.seven, CONFIG_SCORE, 'CONFIGURATION scores 2 — the lowest of all 96 regions');
  ok(SWEEP_DELTA.every((d) => d >= 0), 'control — the seven-direction delta is never negative');
  ok(conf.seven < profile([RAW_AT, RAW_END]).seven, '…lower than the recommendation');

  const CONF_BODY = CODE.slice(CONFIG_REGION[0], CONFIG_REGION[1] - 1);
  const confOwners = scanTopLevelDeclarations(CONF_BODY);
  eq(confOwners.map((d) => d.name), [CONFIG_OWNER], 'it owns exactly one name');
  eq(confOwners[0].form, CONFIG_OWNER_FORM, '…and that name is a `const`');
  eq(CONF_BODY.split('\n').filter((l) => l.trim() && !/^\s*\/\//.test(l)).length, CONFIG_CODE_LINES,
    '…wrapping THREE lines of code in 923 units, which is why it is deferred');

  // NO LAYER OF THE CHAIN HAS EVER OWNED A CONST.
  // The chain is not re-listed here, and not guessed from the sibling set. The
  // first draft did the latter — it took the chain to be "every sibling except
  // the const-owning one", which assumes the answer it then reported. It also
  // checked the length with `>=`, which is true of 27 and of 28 alike and so
  // pinned nothing. Both are read from the newest layer's contract instead,
  // which is where CLAUDE.md puts the chain-wide counts precisely because
  // restating them is how they go stale.
  const VEGA = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = new Function('MODULE_REL',
    `return ${VEGA.match(/^const CHAIN = (\[[\s\S]*?^\]);$/m)[1]};`
  )(VEGA.match(/^const MODULE_REL = '([^']+)';$/m)[1]);
  eq(CHAIN.length, CHAIN_LAYERS, 'the chain is twenty-seven layers, read from that contract');
  eq(Number(VEGA.match(/^const CHAIN_LENGTH = (\d+);$/m)[1]), CHAIN_LAYERS,
    '…and the CHAIN_LENGTH it pins agrees with the list it ships');

  const chainOwningConst = CHAIN.filter((rel) =>
    scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8')).some((d) => d.form === 'const'));
  eq(chainOwningConst.length, CHAIN_LAYERS_OWNING_CONST,
    'NO layer of the twenty-seven owns a top-level const — measured over the real chain');

  const owningConst = SIBLINGS.filter((s) =>
    scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, s.rel), 'utf8')).some((d) => d.form === 'const'));
  eq(owningConst.length, SHIPPED_MODULES_OWNING_CONST,
    'exactly ONE of the seventy-one shipped modules owns a top-level const');
  eq(owningConst[0].rel, CONST_MODULE, '…and it is js/config/backend-config.js');
  ok(!CHAIN.includes(CONST_MODULE),
    '…which is a shipped module but not a layer, so the two counts do not contradict');

  // AND THAT BREAKS A CHECK EVERY CONTRACT CARRIES.
  {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext('const PINNED_CONST = 1;\nvar PINNED_VAR = 2;\n', ctx);
    eq(Object.keys(ctx), ['PINNED_VAR'],
      'a top-level `const` is NOT a property of the VM context; a `var` is');
  }
  {
    // The region does its work and still reports zero globals.
    const ctx = { console: { log() {} }, window: {} };
    vm.createContext(ctx);
    vm.runInContext(CONF_BODY, ctx);
    eq(Object.keys(ctx).filter((k) => k !== 'console' && k !== 'window'), [],
      'so CONFIGURATION reports ZERO globals under the VM_GLOBALS check every contract carries');
    eq(ctx.window.APEX_BUILD_TAG, 'audit-portfolio-cross-browser-2026-06-12',
      '…while having set window.APEX_BUILD_TAG: the measurement is right, the conclusion it invites is wrong');
  }

  // THE BROWSER DISAGREES WITH THE VM, AND THE SHIPPED APP ALREADY PROVES IT.
  {
    const bc = fs.readFileSync(path.join(ROOT, CONST_MODULE), 'utf8');
    const bcOwners = scanTopLevelDeclarations(bc);
    ok(bcOwners.some((d) => d.form === 'const' && d.name === 'BACKEND'),
      'backend-config.js owns `BACKEND` as a top-level const');
    const tagAt = INDEX.indexOf('<script src="./' + CONST_MODULE + '">');
    ok(tagAt >= 0 && tagAt < INDEX.indexOf(INDEX.slice(CODE_AT - 8, CODE_AT)),
      '…and loads before the inline monolith');
    eq(refSites(MASKED, 'BACKEND').length, BACKEND_READS_FROM_MONOLITH,
      '…and the monolith reads it THIRTY-NINE times, so cross-script const visibility is load-bearing today');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  const BODY = CODE.slice(RAW_AT, BODY_END);
  const owners = scanTopLevelDeclarations(BODY);
  eq(evaluationTimeReads(BODY, owners, maskLiterals), EVALUATION_TIME_READS,
    'the region reads NO name at evaluation time — the dependency is called, never read at load');
  const chars = Array.from(BODY);
  for (const d of owners) for (let i = d.start; i <= d.end; i++) chars[i] = ' ';
  eq(chars.join('').split('\n').filter((l) => !isBlankOrComment(l)).length,
    TOP_LEVEL_STATEMENT_LINES, 'zero top-level statement lines outside the declarations');

  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining eleven globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.map((d) => d.name).sort(), '…exactly its own owners');
  eq(typeof ctx.fetchScannerEarnings, 'function', 'the entry point is there');
  eq(ctx._scannerEarningsActive, 0, 'the queue starts idle');
  eq(ctx._scannerEarningsCacheKey('AAPL'), ctx._scannerEarningsCacheKey('AAPL'), 'the cache key is deterministic');
  ok(ctx._scannerEarningsCacheKey('AAPL') !== ctx._scannerEarningsCacheKey('MSFT'), '…and distinguishes tickers');
  // Eleven globals and a `var` lineage — the case §7 shows would report zero.
  ok(owners.every((d) => d.form === 'var' || d.form === 'function'),
    'every owner is a `var` or a function, so VM_GLOBALS means what it appears to mean here');

  const watched = [];
  const ctx2 = {
    fetch: () => { watched.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.push('setInterval'); },
    setTimeout: () => { watched.push('setTimeout'); },
    document: { getElementById: () => { watched.push('document'); return null; } },
  };
  vm.createContext(ctx2);
  vm.runInContext(BODY, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer and touches no DOM');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The modelled extraction — the figures Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  const BODY = CODE.slice(RAW_AT, BODY_END);
  const TAG = '<script src="./js/services/scanner-earnings-throttle.js"></script>\n';
  const ANCHOR = '<script src="./js/services/scanner-ivr-throttle.js"></script>\n';
  ok(INDEX.indexOf(ANCHOR) >= 0, 'the scanner-IVR tag is the anchor the new tag follows');
  ok(INDEX.indexOf(TAG) < 0, '…and no scanner-earnings tag exists yet: this audit ships no tag');

  eq(BODY + '\n', CODE.slice(RAW_AT, RAW_END),
    'body + one line feed IS the raw fragment — the identity Phase 2\'s undo helper rests on');

  const rawStartInIndex = CODE_AT + RAW_AT;
  eq(INDEX.slice(rawStartInIndex, rawStartInIndex + 20), CODE.slice(RAW_AT, RAW_AT + 20),
    'the raw fragment sits at 194,811 in document coordinates');
  const anchorEnd = INDEX.indexOf(ANCHOR) + ANCHOR.length;
  ok(anchorEnd < rawStartInIndex, 'the anchor tag is upstream of the fragment');

  const extracted = INDEX.slice(0, anchorEnd) + TAG
    + INDEX.slice(anchorEnd, rawStartInIndex)
    + INDEX.slice(rawStartInIndex + RAW_CHARS);
  eq(extracted.length, BASE_CHARS - RAW_CHARS + TAG.length,
    'the extracted document is the base less 4,882 units plus the tag');
  eq((extracted.match(/<script src="\.\/[^"]+"><\/script>/g) || []).length, LOCAL_SCRIPTS + 1,
    '…making seventy-two local application scripts');

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

  // THE RETIREMENT, AUDITED ON ITS OWN TERMS.
  ok(changed.indexOf(RETIRED_SPEC) >= 0, 'the retired mutation spec is part of the change');
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC)), '…and is gone from the tree');
  ok(fileExistsAt(BASE_SHA, RETIRED_SPEC), '…having existed at the base');
  // What the retirement costs, counted from the spec as it stood at the base.
  // A deleted file cannot be counted in the tree, and absence alone pins no
  // number: before this line, RETIRED_SPEC_MUTANTS could have said anything.
  eq((git(['show', BASE_SHA + ':' + RETIRED_SPEC]).match(/^\s*\{ id: /gm) || []).length,
    RETIRED_SPEC_MUTANTS, '…and carried FORTY-NINE mutants when it did');
  eq(require(path.join(ROOT, 'tests/lib/mutation-spec.js'))
      .loadSpecs('tests/mutation-specs').filter((x) => x.file === RETIRED_SPEC).length, 0,
    '…so the coverage contract no longer loads it');
  ok(fs.existsSync(path.join(ROOT, SPEC_RETIREMENT_CONTRACT)),
    'the contract it covered still ships, with every assertion intact');
  {
    // Its change is the ratchet PLUS the recorded retirement, and nothing else.
    const before = git(['show', BASE_SHA + ':' + SPEC_RETIREMENT_CONTRACT]).split('\n');
    const after = fs.readFileSync(path.join(ROOT, SPEC_RETIREMENT_CONTRACT), 'utf8').split('\n');
    const removed = before.filter((l) => after.indexOf(l) < 0);
    eq(removed.filter((l) => /^\s*(?:ok|eq|throwsWith|assert)\(/.test(l)).length, 1,
      'exactly one assertion line left that contract — the one that required the spec to exist');
    ok(after.some((l) => l.indexOf('RETIRED in #446') >= 0),
      '…replaced by one asserting the retirement, so the cost is recorded where it lands');
  }

  const ratcheted = changed.filter((rel) => rel !== AUDIT_REL && rel !== AUDIT_SPEC_REL
    && rel !== SPEC_RETIREMENT_CONTRACT && MUTATION_BOOKKEEPING.indexOf(rel) < 0);
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
    TEST_FILE_COUNT, 'the suite is 156 files with this audit in it');
}

function fileExistsAt(sha, rel) {
  try { git(['cat-file', '-e', sha + ':' + rel]); return true; } catch (e) { return false; }
}

console.log('\n' + pass + ' assertions passed.');
console.log('SCANNER_EARNINGS_AUDIT_OK');
