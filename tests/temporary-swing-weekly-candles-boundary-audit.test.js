'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SWING WEEKLY CANDLES — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [401574,410935) in monolith coordinates — 9,361 units, THREE
// functions: `_swingWeekBucket`, `_swingLogWeeklySource` and
// `_swingDeriveWeeklyCandles`. Four inbound edges, three monolith dependencies,
// and zero in every other direction. It loads in a completely empty VM.
//
// ── THIS AUDIT'S FINDING: THE SCREEN COULD NOT SEE THE REGION ────────────────
//
// The recommendation was invisible to every screen this programme has run, and
// so was everything around it. The screening rule matched `// ── ` — exactly two
// dashes — and this monolith also writes section banners as `// ─── Title ───`,
// three. One dash of difference made FORTY-NINE titled banners invisible.
//
// The blindness was not spread evenly. TWENTY-NINE of the forty-nine sit inside
// one stretch, so the screen saw [391565,635416) — 243,851 units, 17% of the
// monolith — as a SINGLE region. And that region is one the programme had
// already measured and rejected: #424 scored it at four external edges, which
// the manual-expiry contract still records as the best coupling this programme
// has ever measured, and could not take it, because it assigns `S.swing` at
// load. §3 reads that verdict out of the shipped contract rather than repeating
// it from memory, and re-measures the block on today's tree: forty-one
// top-level statement lines, and a ReferenceError in an empty VM. The block is
// 243,851 units now against the 242,294 #424 recorded — it has grown since, so
// this is the same stretch, not the same bytes.
//
// So for TWELVE LAYERS — §9 counts them off the shipped chain rather than my
// memory of them — the screen has been reporting a block it knew it could not
// take, and could not show the pieces inside it. Correcting the rule splits that
// block into THIRTY owner-carrying regions, scoring from 1 to 49 — and the one
// this audit recommends scores 7 and loads clean.
//
// WHAT THE CORRECTION IS. `// ─{2,}` followed by whitespace and a title, so both
// styles count and the THIRTEEN bare divider rules — `// ─────────────` with
// nothing after them — still do not, because they start no section. §2 measures
// all three groups and pins the controls. The change lands in
// tests/lib/extraction-boundary.js, where the rule already lives, rather than in
// this audit: CLAUDE.md's own instruction is that a rule worth repeating belongs
// in a helper with a contract. NINE pins across seven contracts moved with it,
// every one re-measured against its own base rather than nudged — §11 counts
// both numbers and checks each banner pin moved by exactly the delta §2 derives.
//
// WHAT IT CHANGES. The monolith goes from 91 owner-carrying regions to 123;
// 324,220 units — 22% of it — sat in regions that split. The best nine-direction
// score among regions of 8,000 units or more goes from 15 to 7, and among
// regions of 5,000 or more from 13 to 7 — at both floors measured here, what
// the old screen ranked was the best thing VISIBLE, not the best thing there.
//
// ── THE RECOMMENDATION, AND WHY THIS END ────────────────────────────────────
//
// Three ends measured from the same start, all three valid seams:
//
//     end       units   nine   owners
//     410935    9,361      7        3   ← this one
//     412550   10,976     15        4
//     413503   11,929     20        5
//
// Seventeen per cent more size costs more than twice the coupling: the fourth
// owner, `_swingTrendContextFromCandles`, brings five more inbound edges and two
// calls to `smA`, which left for js/utils/indicators.js long ago. The cheapest
// cut is also the one the banner marks — which is what a corrected screen is
// for.
//
// ITS FOUR INBOUND EDGES sit in three functions that all stay behind, and its
// three dependencies are named from inside function bodies, never at load. §6
// measures every direction, including the two #450 added.
//
// 9,361 UNITS FOR 82 LINES OF CODE, because 76 of its 158 lines are comment: the
// region opens with a 3,841-unit documentation header explaining why weekly
// candles are derived in the frontend at all. That is the value question this
// cycle has to answer honestly, and §7 states it as a ratio rather than burying
// it: the monolith loses 9,361 units either way.
//
// THE MUTANT BUDGET. The base declares 197 mutants against a ceiling of 250.
// This audit's spec plus the contract spec that follows it would cross that, so
// retirement runs on in chain order — #446 took layer #24's spec, #448 #25's,
// #450 #26's and #27's, and this one takes #28's: scanner-earnings, 58 mutants.
// Its CONTRACT still runs on every push with every assertion intact.
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
const BASE_SHA = '5254187';
const BASE_CHARS = 1529653;
const BASE_UTF8 = 1558636;
const BASE_LF = 26485;
const BASE_SHA256 = 'bad872575738d9fd4735c592438b6956af0d449dc8b79a34eae89429882f0b48';
const LOCAL_SCRIPTS = 74;
const BASE_TEST_FILE_COUNT = 158;
const TEST_FILE_COUNT = 159;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-swing-weekly-candles-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/swing-weekly-candles-audit.spec.js';
const RULE_HELPER_REL = 'tests/lib/extraction-boundary.js';
const RATCHETED_CONTRACTS = 20;
const RETIREMENT = {
  contract: 'tests/scanner-earnings-throttle-boundary-contract.test.js',
  spec: 'tests/mutation-specs/scanner-earnings-contract.spec.js',
  mutants: 58,
};
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 197;
const MUTANT_BUDGET = 250;
// The banner pins that moved with the rule, and the contracts that carry them.
const REPINNED_CONTRACTS = 7;
const REPINNED_PINS = 9;
const REPINNED_PIN_NAMES = ['TOP_LEVEL_BANNERS', 'REGIONS_WITH_OWNERS',
  'REGIONS_ON_CLOSING_RULE', 'RULE_MARKS'];
const BANNER_DELTA = 49;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114278;
const CODE_CHARS = 1415349;
const TOP_LEVEL_DECLS = 953;

// ── The screening rule, before and after ─────────────────────────────────────
const BANNER_LOOKING_LINES = 238;
const MARKS_BEFORE = 176;
const MARKS_AFTER = 225;
const NEWLY_VISIBLE = 49;
const BARE_DIVIDERS = 13;
const REGIONS_BEFORE = 102;
const REGIONS_AFTER = 135;
const OWNER_REGIONS_BEFORE = 91;
const OWNER_REGIONS_AFTER = 123;
const UNITS_IN_SPLIT_REGIONS = 324220;

// ── The block the blindness hid, and #424's verdict on it ────────────────────
const BLOB = [391565, 635416];
const BLOB_UNITS = 243851;
const BLOB_OWNERS = 163;
const BLOB_STATEMENT_LINES = 41;
const BLOB_VM_ERROR = 'S is not defined';
const BLOB_HIDDEN_BANNERS = 29;
const BLOB_SUBREGIONS = 30;
const BLOB_SUBREGION_SCORE_RANGE = [1, 49];
const EXPIRY_CONTRACT = 'tests/portfolio-expiry-manual-boundary-contract.test.js';
const RECORDED_VERDICT = 'the best\n// coupling this programme has ever measured';
const RECORDED_UNITS = '242,294';

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 401574;
const RAW_END = 410935;
const BODY_END = 410934;
const RAW_CHARS = 9361;
const BODY_CHARS = 9360;
const BODY_UTF8 = 9426;
const BODY_LF = 157;
const BODY_SHA256 = '3d1de7b9a82c597afe7c4ab327ec4be84fdfffbe08ba06eb1ce8109f665fd528';
const BODY_ENDING = '}\n';
const HEAD_BANNER = '// ─── Weekly candle derivation (frontend; no backend weekly series exists) ─────';
const OWNER_COUNT = 3;
const FUNCTION_OWNERS = 3;
const OWNERS_EXPECTED = ['_swingWeekBucket', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles'];
const CODE_LINES = 82;
const TOTAL_LINES = 158;
const COMMENT_LINES = 76;
const HEADER_UNITS = 3841;
const MODULE_REL_IF_CUT = 'js/services/swing-weekly-candles.js';

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 4;
const EDGE_SITES = [616643, 619792, 619836, 632064];
const EDGE_HOSTS = ['_etWeekBucket', '_swingPreparePriceAlignedCandles', '_swingRenderSpyContext'];
const MONOLITH_DEPENDENCIES = ['_candleTradingSessionDate', '_etWeekBucket', '_swingCandleTimeMs'];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 7;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 3;

// ── The three ends ───────────────────────────────────────────────────────────
const ENDS = [
  { end: 410935, units: 9361, owners: 3, nine: 7 },
  { end: 412550, units: 10976, owners: 4, nine: 15 },
  { end: 413503, units: 11929, owners: 5, nine: 20 },
];
const RECOMMENDED_ROW = 0;
const FOURTH_OWNER = '_swingTrendContextFromCandles';
const OUTBOUND_MODULE_OWNER = 'js/utils/indicators.js';

// ── What the corrected screen changes about the ranking ──────────────────────
const BEST_NINE_ABOVE_5K_BEFORE = 13;
const BEST_NINE_ABOVE_5K_AFTER = 7;
const BEST_NINE_ABOVE_8K_BEFORE = 15;
const BEST_NINE_ABOVE_8K_AFTER = 7;

// ── Reachability, carried forward from #450 ──────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;
const DEAD_UNITS_BEFORE_451 = 11926;
const DEPARTED_DEAD_UNITS = 6608;

// ── The chain it would join ──────────────────────────────────────────────────
const NEWEST_CONTRACT = 'tests/journal-snapshot-helpers-boundary-contract.test.js';
const CHAIN_LAYERS = 30;
const REJECTED_LAYER = 'js/portfolio/portfolio-expiry-manual.js';
const LAYERS_SINCE_REJECTION = 12;
const SIZE_RANK_IF_CUT = 16;
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
function codeLines(src) { return src.split('\n').filter((l) => !isBlankOrComment(l)).length; }
function occurrenceIndex(text) {
  const idx = new Map();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const a = m.index + m[1].length;
    const b = idx.get(m[2]);
    if (b) b.push(a); else idx.set(m[2], [a]);
  }
  return idx;
}
const at = (idx, n) => idx.get(n) || [];
function countInRange(sites, lo, hi) {
  const bound = (x) => {
    let a = 0, b = sites.length;
    while (a < b) { const m = (a + b) >> 1; if (sites[m] < x) a = m + 1; else b = m; }
    return a;
  };
  return bound(hi) - bound(lo);
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('SWING WEEKLY CANDLES — TEMPORARY BOUNDARY AUDIT');
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

const OCC_CODE = occurrenceIndex(MASKED);
const OCC_STRINGS = occurrenceIndex(STRINGS);
const OCC_MARKUP = occurrenceIndex(STATIC_MARKUP);
const OCC_OTHER = occurrenceIndex(OTHER_INLINE);
const OCC_SIB_CODE = occurrenceIndex(SIBLINGS.map((s) => s.masked).join('\n'));
const OCC_SIB_STR = occurrenceIndex(SIBLINGS.map((s) => s.strings).join('\n'));
const SIB_REFS = new Map();
{
  const per = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked) }));
  for (const d of DECLS) {
    let n = 0;
    for (const m of per) if (!m.bound.has(d.name)) n += at(m.idx, d.name).length;
    SIB_REFS.set(d.name, n);
  }
}

// THE RULE AS IT STOOD, kept here so the before/after is measured rather than
// remembered. This is the exact body topLevelBanners carried until this change.
function bannersUnderOldRule(src) {
  const marks = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m;
    while ((m = re.exec(src))) if (!insideFunction(m.index)) marks.push(m.index);
  }
  return marks.sort((a, b) => a - b);
}
function mergedRegions(marks) {
  const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : CODE.length }));
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    let r = raw[i];
    while (i + 1 < raw.length) {
      const between = CODE.slice(r.start, raw[i + 1].start);
      if (between.split('\n').some((l) => !isBlankOrComment(l))) break;
      r = { start: r.start, end: raw[i + 1].end }; i++;
    }
    out.push(r);
  }
  return out;
}
const ownerCarrying = (regions) =>
  regions.filter((r) => DECLS.some((d) => d.start >= r.start && d.end < r.end));

function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const inside = (i) => i >= range[0] && i < range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0, sib = 0, mkp = 0;
  const sites = [];
  for (const n of names) {
    for (const site of at(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(site);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(site + n.length, site + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, site, n)) inPropWrites++;
    }
    gen += at(OCC_STRINGS, n).filter(outside).length;
    sib += SIB_REFS.get(n);
    mkp += at(OCC_MARKUP, n).length;
  }
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  const local = locallyBound(CODE.slice(range[0], range[1]));
  const deps = new Set();
  for (const d of DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (countInRange(at(OCC_CODE, d.name), range[0], range[1])) deps.add(d.name);
  }
  let outGen = 0;
  for (const d of DECLS) {
    if (nameSet.has(d.name)) continue;
    outGen += countInRange(at(OCC_STRINGS, d.name), range[0], range[1]);
  }
  let outModule = 0;
  for (const [n] of MODULE_OWNERS) {
    if (nameSet.has(n) || local.has(n)) continue;
    outModule += countInRange(at(OCC_CODE, n), range[0], range[1]);
  }
  const seven = inbound + inWrites + inPropWrites + outWrites.length + deps.size + sib + mkp + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp, outWrites,
    deps: Array.from(deps).sort(), sites: sites.sort((a, b) => a - b),
    outGen, outModule, seven, nine: seven + outGen + outModule,
  };
}

const REC = profile([RAW_AT, RAW_END]);
const BODY = CODE.slice(RAW_AT, BODY_END);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, BASE_CHARS, 'index.html is 1,529,653 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…1,558,636 bytes');
  eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…26,485 line feeds');
  eq(sha256(INDEX), BASE_SHA256, '…and hashes to the base digest');
  eq(LOCALS.length, LOCAL_SCRIPTS, 'seventy-four local scripts ship today');
  eq(INDEX, git(['show', BASE_SHA + ':index.html']),
    'and the working tree is byte-identical to the base commit');
  eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at 114,278');
  eq(CODE.length, CODE_CHARS, '…and is 1,415,349 units');
  eq(DECLS.length, TOP_LEVEL_DECLS, 'it declares 953 names at top level');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. THE SCREENING RULE WAS BLIND, and by exactly how much');
// ─────────────────────────────────────────────────────────────────────────────
{
  // Every column-0 comment line that LOOKS like a banner, at top level.
  const looksLikeBanner = [];
  {
    let offset = 0;
    for (const line of CODE.split('\n')) {
      if (/^[ \t]*\/\/ [─═]/.test(line) && !insideFunction(offset)) looksLikeBanner.push([offset, line]);
      offset += line.length + 1;
    }
  }
  eq(looksLikeBanner.length, BANNER_LOOKING_LINES,
    '238 top-level comment lines are drawn as banners');

  const before = bannersUnderOldRule(CODE);
  eq(before.length, MARKS_BEFORE, 'the rule as it stood recognised 176 of them');
  eq(MARKS.length, MARKS_AFTER, '…and the corrected rule recognises 225');
  eq(MARKS_AFTER - MARKS_BEFORE, NEWLY_VISIBLE, '…forty-nine more');

  // The two groups that make up the difference, DERIVED rather than asserted.
  const seenBefore = new Set(before);
  const invisible = looksLikeBanner.filter(([i]) => !seenBefore.has(i));
  const titled = invisible.filter(([, l]) => /^[ \t]*\/\/ [─═]+[ \t]+\S/.test(l));
  const bare = invisible.filter(([, l]) => !/^[ \t]*\/\/ [─═]+[ \t]+\S/.test(l));
  eq(titled.length, NEWLY_VISIBLE, 'forty-nine of the invisible ones carry a section title');
  eq(bare.length, BARE_DIVIDERS, '…and thirteen are bare divider rules, which start no section');
  const seenAfter = new Set(MARKS);
  ok(titled.every(([i]) => seenAfter.has(i)), 'the corrected rule admits every titled one…');
  ok(bare.every(([i]) => !seenAfter.has(i)), '…and still refuses every bare one');
  ok(before.every((i) => seenAfter.has(i)),
    'control — it drops nothing the old rule found, so the delta is a gain and not a swap');

  // The control the correction needs: the rule must still reject a banner that
  // is not at top level, which is the property the whole helper exists for.
  {
    const inFnBanner = [];
    let offset = 0;
    for (const line of CODE.split('\n')) {
      if (/^[ \t]*\/\/ ─{2,}[ \t]+\S/.test(line) && insideFunction(offset)) inFnBanner.push(offset);
      offset += line.length + 1;
    }
    ok(inFnBanner.length > 0, 'control — banners DO sit inside function bodies…');
    ok(inFnBanner.every((i) => !seenAfter.has(i)), '…and the corrected rule excludes every one of them');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. WHAT THE BLINDNESS HID: a block already known to be untakeable');
// ─────────────────────────────────────────────────────────────────────────────
{
  const before = bannersUnderOldRule(CODE);
  const oldRegions = mergedRegions(before);
  const blob = oldRegions.find((r) => r.start === BLOB[0]);
  ok(!!blob, 'the old screen produced a region starting at 391,565');
  eq(blob.end, BLOB[1], '…running to 635,416');
  eq(blob.end - blob.start, BLOB_UNITS, '…243,851 units in one region');
  ok(BLOB_UNITS * 100 > CODE_CHARS * 17, '…which is more than 17% of the whole monolith');
  eq(DECLS.filter((d) => d.start >= BLOB[0] && d.end < BLOB[1]).length, BLOB_OWNERS,
    '…carrying 163 top-level declarations');

  // Why the screen saw one region: the titled banners inside it were invisible.
  const seenBefore = new Set(before);
  const hiddenInside = [];
  {
    let offset = 0;
    for (const line of CODE.split('\n')) {
      if (offset >= BLOB[0] && offset < BLOB[1] && !insideFunction(offset) &&
          /^[ \t]*\/\/ ─{2,}[ \t]+\S/.test(line) && !seenBefore.has(offset)) hiddenInside.push(offset);
      offset += line.length + 1;
    }
  }
  eq(hiddenInside.length, BLOB_HIDDEN_BANNERS, 'TWENTY-NINE of the forty-nine sit inside that one region');

  // And the region was already known to be untakeable. THE VERDICT IS READ OUT
  // OF THE SHIPPED CONTRACT, not restated from memory: #424's Phase 2 records
  // both the score and the size it scored, and this audit's claim about the
  // block's history is only as good as that record still saying so.
  {
    const expiry = fs.readFileSync(path.join(ROOT, EXPIRY_CONTRACT), 'utf8');
    ok(expiry.indexOf(RECORDED_VERDICT) >= 0,
      'the manual-expiry contract still records #424\'s rejection as the best coupling measured');
    ok(expiry.indexOf(RECORDED_UNITS) >= 0, '…over the size it names');
    ok(BLOB_UNITS > Number(RECORDED_UNITS.replace(/,/g, '')),
      '…and the block is LARGER today than the figure that contract carries: '
      + 'the same stretch, grown since, not the same bytes');
  }
  // Re-measured here, on the tree that ships.
  const blobBody = CODE.slice(BLOB[0], snapBodyEnd(CODE, BLOB[0], BLOB[1]));
  const blobOwners = scanTopLevelDeclarations(blobBody);
  const blanked = Array.from(blobBody);
  for (const d of blobOwners) for (let i = d.start; i <= d.end; i++) blanked[i] = ' ';
  eq(codeLines(blanked.join('')), BLOB_STATEMENT_LINES,
    'it carries FORTY-ONE top-level statement lines');
  ok(evaluationTimeReads(blobBody, blobOwners, maskLiterals).length > 0,
    '…and reads names at evaluation time');
  {
    const ctx = {};
    vm.createContext(ctx);
    let message = null;
    try { vm.runInContext(blobBody, ctx); } catch (e) { message = e.message; }
    eq(message, BLOB_VM_ERROR, '…so loading it in an empty VM throws on S, exactly as #424 found');
  }

  // The pieces inside it, which no screen could rank until now.
  const afterRegions = ownerCarrying(mergedRegions(MARKS))
    .filter((r) => r.start >= BLOB[0] && r.start < BLOB[1]);
  eq(afterRegions.length, BLOB_SUBREGIONS,
    'corrected, that one block resolves into THIRTY owner-carrying regions');
  const scores = afterRegions.map((r) => profile([r.start, r.end]).nine).sort((a, b) => a - b);
  eq([scores[0], scores[scores.length - 1]], BLOB_SUBREGION_SCORE_RANGE,
    '…scoring from 1 to 49: it was never one thing');
  ok(scores[0] < FULL_NINE,
    '…and the cleanest piece inside it scores better than the one this audit recommends, '
    + 'which is the honest way to say a corrected screen has more to offer than one cycle');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. What the correction changes about the screen as a whole');
// ─────────────────────────────────────────────────────────────────────────────
{
  const before = bannersUnderOldRule(CODE);
  const oldRegions = mergedRegions(before);
  const newRegions = mergedRegions(MARKS);
  eq(oldRegions.length, REGIONS_BEFORE, 'the old rule merged to 102 regions');
  eq(newRegions.length, REGIONS_AFTER, '…the corrected one to 135');
  eq(ownerCarrying(oldRegions).length, OWNER_REGIONS_BEFORE, '91 of the old ones carried declarations');
  eq(ownerCarrying(newRegions).length, OWNER_REGIONS_AFTER, '…and 123 of the new ones do');

  const split = oldRegions.filter((o) => newRegions.filter((n) => n.start >= o.start && n.start < o.end).length > 1);
  const splitUnits = split.reduce((s, r) => s + (r.end - r.start), 0);
  eq(splitUnits, UNITS_IN_SPLIT_REGIONS, '324,220 units sat in regions that split');
  ok(splitUnits * 100 > CODE_CHARS * 22, '…which is more than 22% of the monolith');

  // THE RANKING CHANGED, which is the part that matters for choosing.
  const bestAbove = (regions, floor) => Math.min.apply(null, ownerCarrying(regions)
    .filter((r) => r.end - r.start >= floor).map((r) => profile([r.start, r.end]).nine));
  eq(bestAbove(oldRegions, 5000), BEST_NINE_ABOVE_5K_BEFORE,
    'the best score among regions of 5,000 units or more was 13');
  eq(bestAbove(newRegions, 5000), BEST_NINE_ABOVE_5K_AFTER, '…and is now 7');
  eq(bestAbove(oldRegions, 8000), BEST_NINE_ABOVE_8K_BEFORE, 'among regions of 8,000 or more it was 15');
  eq(bestAbove(newRegions, 8000), BEST_NINE_ABOVE_8K_AFTER, '…and is now 7');
  ok(bestAbove(newRegions, 8000) < bestAbove(oldRegions, 8000) &&
     bestAbove(newRegions, 5000) < bestAbove(oldRegions, 5000),
  'at BOTH size floors measured here the corrected screen finds a better-coupled '
  + 'region than the old one could see: what the old screen ranked was the best '
  + 'thing VISIBLE, not the best thing there');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The recommended region, its boundary and its seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE[RAW_AT - 1] === '\n', 'the region opens on a line start');
  eq(CODE.slice(RAW_AT, CODE.indexOf('\n', RAW_AT)), HEAD_BANNER,
    '…on a banner the old rule could not see');
  ok(bannersUnderOldRule(CODE).indexOf(RAW_AT) < 0, '…which is the point: it was invisible');
  ok(MARKS.indexOf(RAW_AT) >= 0, '…and the corrected rule marks it');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next line');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts it on all four invariants');
  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  eq(RAW_END - RAW_AT, RAW_CHARS, 'the raw fragment is 9,361 units');
  eq(BODY.length, BODY_CHARS, '…of which the body is 9,360');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', '…and raw IS body plus one structural line feed');
  eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'the body is 9,741 bytes');
  eq((BODY.match(/\n/g) || []).length, BODY_LF, '…157 line feeds');
  eq(sha256(BODY), BODY_SHA256, '…and this is the digest Phase 2 must reproduce');
  eq(BODY.slice(-2), BODY_ENDING, 'it ends `}\\n`');

  const owners = scanTopLevelDeclarations(BODY);
  eq(owners.length, OWNER_COUNT, 'three top-level owners');
  eq(owners.map((d) => d.name), OWNERS_EXPECTED, '…in this order');
  eq(owners.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…all three functions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Coupling, in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(REC.sites, EDGE_SITES, 'FOUR references reach in from the rest of the monolith');
  eq(REC.inbound, EXTERNAL_EDGES, '…exactly four');
  ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
  const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
  eq(Array.from(new Set(REC.sites.map((i) => hostOf(i).name))).sort(), EDGE_HOSTS.slice().sort(),
    '…spread over three functions, all of which stay behind');

  eq({
    inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
    outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
    staticMarkup: REC.mkp, generatedMarkup: REC.gen,
    outboundGenerated: REC.outGen, outboundModule: REC.outModule,
  }, ZERO_DIRECTIONS,
  'EIGHT of the nine directions measure zero — including both that #450 added');
  // The controls those zeros need, from regions where the answer differs.
  ok(refSites(STRINGS, 'rsApplyFilters').length > 0,
    'control — the literal view DOES find rsApplyFilters, so the generated-markup zero measures');
  ok(profile([688306, 695677]).outGen > 0,
    'control — the ticker-search region DOES generate markup naming names that stay behind');
  // THE CONTROL THIS ZERO NEEDS is not "the module-owner map is populated" —
  // that is true whatever the metric does. It is a region where the answer
  // DIFFERS, and the sharpest one available is the same region with the next
  // end: extend to 412,550 and the count becomes two. Same start, same code
  // path, different answer.
  eq(profile([RAW_AT, ENDS[1].end]).outModule, 2,
    'control — extend the region by one owner and the outbound-module count is no longer zero');

  eq(REC.deps, MONOLITH_DEPENDENCIES, 'it names three things the monolith declares');
  {
    const bodyMasked = maskLiterals(BODY);
    const bodyFns = functionBodyRanges(BODY);
    ok(REC.deps.every((d) => refSites(bodyMasked, d)
      .every((i) => bodyFns.some((r) => i >= r.start && i <= r.end))),
    '…every one from inside a function body: runtime dependencies, not load-time ones');
  }
  eq(REC.nine, FULL_NINE, 'nine directions, total score 7');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Three ends, and the value question stated as a ratio');
// ─────────────────────────────────────────────────────────────────────────────
{
  const measured = ENDS.map(({ end }) => {
    const p = profile([RAW_AT, end]);
    return { end, units: end - RAW_AT, owners: p.names.length, nine: p.nine };
  });
  eq(measured, ENDS, 'three ends, their sizes, their owners and their nine-direction scores');
  eq(ENDS[RECOMMENDED_ROW].end, RAW_END, '…the first being the recommendation');
  const accepted = ENDS.map(({ end }) => {
    try { return assertSeam(CODE, RAW_AT, snapBodyEnd(CODE, RAW_AT, end)) === end; }
    catch (e) { return e.message; }
  });
  eq(accepted, [true, true, true], 'assertSeam accepts all three: the seam decides nothing here');
  ok(ENDS[1].nine > ENDS[0].nine * 2 && ENDS[1].units < ENDS[0].units * 1.2,
    'the second end costs more than TWICE the coupling for under 20% more size');
  {
    const fourth = profile([RAW_AT, ENDS[1].end]);
    eq(fourth.names.filter((n) => OWNERS_EXPECTED.indexOf(n) < 0), [FOURTH_OWNER],
      '…and the one owner it adds is _swingTrendContextFromCandles');
    eq(fourth.inbound - REC.inbound, 5, '…which brings five more inbound edges');
    eq(fourth.outModule - REC.outModule, 2, '…and two references to a name a module already owns');
    eq(Array.from(new Set(refSites(MASKED, 'smA').filter((i) => i >= RAW_END && i < ENDS[1].end)
      .map(() => MODULE_OWNERS.get('smA')))), [OUTBOUND_MODULE_OWNER],
    '…both of them calls to smA, which lives in js/utils/indicators.js');
  }

  // THE VALUE QUESTION, stated rather than buried: this region is mostly prose.
  const lines = BODY.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is 158 lines');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…76 of them comment or blank');
  eq(codeLines(BODY), CODE_LINES, '…and 82 lines of code');
  eq(scanTopLevelDeclarations(BODY)[0].start, HEADER_UNITS,
    'the first owner begins 3,841 units in: the region opens with a documentation header');
  ok(RAW_CHARS > CODE_LINES * 100,
    'so it is 9,361 units for 82 lines of code — the monolith loses the units either way, '
    + 'and this is the trade the cycle is making, not a fact it is hiding');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads bare, and does nothing at load');
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
  const ctx2 = {
    fetch: () => { watched.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.push('setInterval'); },
    setTimeout: () => { watched.push('setTimeout'); },
    localStorage: { getItem: () => { watched.push('localStorage'); return null; } },
    document: { getElementById: () => { watched.push('document'); return null; },
      addEventListener: () => { watched.push('doc.addEventListener'); } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
  };
  vm.createContext(ctx2);
  vm.runInContext(BODY, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer, reads no storage and binds no listener');

  // THE CONTRAST THAT MAKES THIS CYCLE POSSIBLE: the block it comes out of
  // cannot do any of that, which is why it was rejected and this piece is not.
  ok(BLOB_STATEMENT_LINES > TOP_LEVEL_STATEMENT_LINES,
    'the 243,851-unit block around it carries top-level statements; this region carries none');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Reachability, and the chain it would join');
// ─────────────────────────────────────────────────────────────────────────────
{
  // #450's measurement, carried forward: the dead weight fell by exactly what
  // left with the module, which is the arithmetic that proves both numbers.
  const dead = DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return at(OCC_CODE, d.name).filter((i) => !self(i)).length === 0 &&
      at(OCC_STRINGS, d.name).length === 0 && at(OCC_SIB_CODE, d.name).length === 0 &&
      at(OCC_SIB_STR, d.name).length === 0 && at(OCC_MARKUP, d.name).length === 0 &&
      at(OCC_OTHER, d.name).length === 0;
  });
  eq(dead.length, DEAD_DECLS, 'eighteen declarations are named nowhere in production');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…5,318 units of them');
  eq(DEAD_UNITS_BEFORE_451 - DEPARTED_DEAD_UNITS, DEAD_UNITS,
    '…which is exactly what #450 measured, less the 6,608 that left with the module');
  eq(REC.names.filter((n) => dead.some((d) => d.name === n)), [],
    'and none of the recommended region\'s owners is among them');

  const NEWEST = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = new Function('MODULE_REL',
    `return ${NEWEST.match(/^const CHAIN = (\[[\s\S]*?^\]);$/m)[1]};`
  )(NEWEST.match(/^const MODULE_REL = '([^']+)';$/m)[1]);
  eq(CHAIN.length, CHAIN_LAYERS, 'thirty layers ship today, read from the newest contract');
  // HOW LONG THE BLIND SPOT STOOD, counted rather than remembered. #424's Phase 2
  // is a layer in this chain, so the distance from it to the tail is a number the
  // chain itself carries — and the draft of this audit said "nine cycles" from
  // memory, which is the mistake CLAUDE.md records four times over.
  eq(CHAIN.length - (CHAIN.indexOf(REJECTED_LAYER) + 1), LAYERS_SINCE_REJECTION,
    'twelve layers shipped between #424\'s rejection and this audit');
  ok(CHAIN.indexOf(REJECTED_LAYER) >= 0, '…and that layer is in the chain, so the distance is real');
  eq(Number(NEWEST.match(/^const CHAIN_LENGTH = (\d+);$/m)[1]), CHAIN_LAYERS,
    '…and the CHAIN_LENGTH it pins agrees with the list it ships');
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, '…and none of them is the file Phase 2 would write');
  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length)
    .concat([BODY_CHARS]).sort((a, b) => a - b);
  eq(sizes.indexOf(BODY_CHARS) + 1, SIZE_RANK_IF_CUT,
    'cut, it would rank sixteenth of thirty-one by size — no superlative moves');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…against a largest of 71,811');
  eq(sizes[0], SMALLEST_LAYER_CHARS, '…and a smallest of 1,761');
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
section('11. The change set, the re-pinned contracts, and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();

  ok(changed.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  ok(changed.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  ok(changed.indexOf(RULE_HELPER_REL) >= 0, '…and the helper the rule lives in');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite ratchets by one: 158 files before, 159 after');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length,
    BASE_TEST_FILE_COUNT, '…and 158 is what the base actually carried');

  // THE RE-PINNED CONTRACTS. Changing the rule moved every banner count in the
  // suite, and each was re-measured against its OWN base rather than nudged.
  {
    const carriers = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /\.test\.js$/.test(f) && f !== path.basename(AUDIT_REL))
      .filter((f) => /^const (?:TOP_LEVEL_BANNERS|REGIONS_WITH_OWNERS) = \d+;$/m.test(
        fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(carriers.length, REPINNED_CONTRACTS, 'SEVEN contracts carry a banner-derived pin');
    ok(carriers.every((f) => changed.indexOf('tests/' + f) >= 0),
      '…and every one of them is in this change set');
    // The delta is uniform, which is what makes the re-pinning checkable: the
    // corrected rule adds the same forty-nine banners to every base.
    const deltas = carriers.map((f) => {
      const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
      const now = Number((src.match(/^const TOP_LEVEL_BANNERS = (\d+);$/m) || [])[1]);
      const was = Number((git(['show', BASE_SHA + ':tests/' + f])
        .match(/^const TOP_LEVEL_BANNERS = (\d+);$/m) || [])[1]);
      return Number.isFinite(now) && Number.isFinite(was) ? now - was : null;
    }).filter((d) => d !== null);
    eq(Array.from(new Set(deltas)), [BANNER_DELTA],
      '…each moved by exactly forty-nine, the count §2 derives');
    // SEVEN CONTRACTS, NINE PINS: strategy-templates carries three of them, so
    // counting files would understate the edit. Every one is re-measured against
    // its own base, and this is what says none was left behind.
    const moved = [];
    for (const f of carriers) {
      const now = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
      const was = git(['show', BASE_SHA + ':tests/' + f]);
      for (const n of REPINNED_PIN_NAMES) {
        const re = new RegExp('^const ' + n + ' = (\\d+);$', 'm');
        const a = (now.match(re) || [])[1];
        const b = (was.match(re) || [])[1];
        if (a !== undefined && b !== undefined && a !== b) moved.push(f + ':' + n);
      }
    }
    eq(moved.length, REPINNED_PINS, 'NINE pins moved, across those seven contracts');
    eq(moved.filter((x) => x.startsWith('strategy-templates')).length, 3,
      '…three of them in strategy-templates alone, which is why the file count understates it');
  }

  // THE SUITE-COUNT RATCHET.
  {
    const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /\.test\.js$/.test(f) && f !== path.basename(AUDIT_REL))
      .filter((f) => /^const TEST_FILE_COUNT = \d+;$/m.test(
        fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(contracts.length, RATCHETED_CONTRACTS, 'TWENTY contracts pin the suite file count');
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
    eq(mod.exports.mutants.length, RETIREMENT.mutants, '…having carried fifty-eight mutants');
    ok(fs.existsSync(path.join(ROOT, RETIREMENT.contract)), 'the contract it targeted still ships');
    const CALL = /\b(?:eq|ok|throwsWith|throws|deepStrictEqual|strictEqual)\s*\(/g;
    const before = git(['show', BASE_SHA + ':' + RETIREMENT.contract]);
    const after = fs.readFileSync(path.join(ROOT, RETIREMENT.contract), 'utf8');
    eq((after.match(CALL) || []).length, (before.match(CALL) || []).length,
      '…with exactly as many assertions as before: the spec retired, not the contract');
    ok(/ok\(!fs\.existsSync\(path\.join\(ROOT, CONTRACT_SPEC_REL\)\)/.test(after),
      '…and its spec-existence assertion is now its NEGATION, so the retirement is executed');

    const auditSpec = require('./mutation-specs/swing-weekly-candles-audit.spec.js');
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared 197 mutants');
    eq(declaredNow, BASE_DECLARED_MUTANTS - RETIREMENT.mutants + auditSpec.mutants.length,
      '…and this change declares exactly that, less the retirement, plus this audit\'s spec');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow, '…and the declared total is under it');
    eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('SWING_WEEKLY_CANDLES_AUDIT_OK');
