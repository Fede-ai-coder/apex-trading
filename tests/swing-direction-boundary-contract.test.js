'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SWING DIRECTION RESOLVER — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #452 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/swing-weekly-candles-undo.js
// reconstructs the pre-extraction document byte for byte, and §8 asserts the
// production footprint is index.html plus the one new file.
//
// WHAT MOVED. [401574,410935) in monolith coordinates — 9,361 units: the
// region's own banner and a 3,841-unit header, three top-level owners, one
// closing newline. Three functions, zero top-level statements, and 82 lines of
// code out of 158.
//
// HOW IT WAS FOUND is the part worth keeping. Audit #452 did not out-screen the
// previous cycles; it found the screen could not SEE this region. The banner
// rule matched `// ── ` — two dashes — and this region opens on three. Forty-
// nine titled banners were invisible, twenty-nine of them inside one stretch the
// screen therefore reported as a single 243,851-unit region: the swing block
// #424 had already proved unextractable because it assigns `S.swing` at load. So
// the screen spent twelve layers offering a block it knew it could not take and
// hiding the pieces inside it — §4 counts that distance off the chain, where it
// reads as THIRTEEN because the count includes this layer, the one that finally
// took a piece. The corrected rule ships in
// tests/lib/extraction-boundary.js with its own controls; this is the first
// thing it found, and §4 re-measures the improvement rather than citing it.
//
// THE SEAM RUNS THROUGH A MUTUAL REFERENCE, which is this layer's one genuinely
// unusual property and §5 pins it as such. `_etWeekBucket` stays in the monolith
// and names `_swingWeekBucket`, which leaves; this module calls `_etWeekBucket`
// twice in the other direction. A cycle across a file boundary is only safe when
// neither side needs the other while it evaluates, so §5 proves both directions
// resolve at CALL time, inside function bodies, rather than assuming it from the
// shape. §6 then loads the module in a COMPLETELY empty VM, which is the same
// claim from the other end.
//
// ONE OWNER IS NAMED NOWHERE ELSE IN THE APPLICATION. `_swingLogWeeklySource` is
// declared here and called three times here, and zero times anywhere else. That
// is not dead code — its own family calls it — it is a global that never needed
// to be one. Relocation does not change its scope, because these are classic
// scripts; what it changes is that every reference now lives in one greppable
// file. §5 measures that rather than asserting it in prose.
//
// SIXTEENTH OF THIRTY-ONE BY SIZE, measured in §4 and not described here. At
// 9,360 units this layer changes no superlative: the vega monitor (1,761) keeps
// smallest and the traffic light (71,811) keeps largest, so this change re-pins
// nothing in any earlier contract.
//
// IT IS MOSTLY PROSE AND THAT WAS ON THE RECORD BEFORE THE CUT. 76 of its 158
// lines are comment or blank. The audit stated it as a ratio instead of burying
// it, and §4 keeps it executed: the monolith loses the units either way, and the
// explanation of why weekly candles are derived in the frontend at all now
// travels with the code it explains.
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
const UNDO = require('./lib/swing-direction-undo.js');

const MODULE_REL = 'js/services/swing-direction.js';
const TAG = '<script src="./js/services/swing-direction.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/swing-weekly-candles.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '4622657';
const CONTRACT_REL = 'tests/swing-direction-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/swing-direction-undo.js';
const AUDIT_REL = 'tests/temporary-swing-direction-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/swing-direction-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/swing-direction-contract.spec.js';

// Ratchet. The suite file count as it stands TODAY. A Phase 1 audit advances it
// in every contract that carries it; Phase 2 deletes that audit as the next
// contract arrives, so this cycle leaves the count exactly where #452 put it.
const TEST_FILE_COUNT = 160;
const LOCAL_SCRIPT_COUNT = 76;
const MODULE_POSITION = 75;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 114340;
const CODE_CHARS = 1405988;
const RAW_AT_IN_CODE = 406512;
const RAW_END_IN_CODE = 413015;
const BODY_END_IN_CODE = 413014;
const TOP_LEVEL_BANNERS = 224;
const RESIDUAL_MONOLITH = 1399485;
const TAG_GAP = 406520;
const NET_REDUCTION = 6446;

// ── The three owners ─────────────────────────────────────────────────────────
const OWNERS_EXPECTED = ['_swingResolveDirection', '_swingRsContext', '_swingVixSuitability'];
const OWNER_COUNT = 3;
const FUNCTION_OWNERS = 3;
const BODY_ENDING = '}\n';
const HEAD_BANNER = '// ─── Final multi-timeframe Swing direction (PURE, testable) ───────────────────';
const CODE_LINES = 49;
const TOTAL_LINES = 93;
const COMMENT_LINES = 44;
const HEADER_UNITS = 1604;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 5;
const EDGE_SITES = [417497, 528964, 571560, 574912, 621943];
const CALLERS = ['_swingBuildCandidate', '_swingEnrichOneOperationalRow', '_swingLazyEnrich4h',
  '_swingRenderRegime', '_swingRunActiveTab'];
const MONOLITH_DEPENDENCIES = ['S', 'SWING_VIX_MAX_SUITABLE', '_swingNormDir'];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 8;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 3;

// ── `S`, and the rule audit #424 left too broad ─────────────────────────────
const S_NAME = 'S';
const S_REFS_IN_BODY = 3;
const S_PROPERTY_WRITES = 0;
const S_FORM = 'const';
const EXPIRY_CONTRACT = 'tests/portfolio-expiry-manual-boundary-contract.test.js';
const RECORDED_UNITS = '242,294';
const LAYERS_WITH_A_DEPENDENCY = 10;
// The stretch #424 rejected, in THIS base's coordinates.
const BLOB = [391565, 626055];

// ── The four ends audit #454 measured ────────────────────────────────────────
const ENDS = [
  { end: 413015, units: 6503, owners: 3, nine: 8 },
  { end: 413963, units: 7451, owners: 4, nine: 9 },
  { end: 422877, units: 16365, owners: 6, nine: 23 },
];
const SHIPPED_ROW = 0;
const FOURTH_END = 425438;
const FOURTH_END_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
const SECOND_END_OWNER = '_swingScore';
const OWNER_SIZES = [3661, 651, 501];

// ── Reachability in the base monolith ────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;
const DEPARTED_DEAD = '_buildSnapshot';
const DEPARTED_DEAD_OWNER = 'js/services/journal-snapshot-helpers.js';

// ── The chain ────────────────────────────────────────────────────────────────
const CHAIN = [
  'js/services/journal-core.js',
  'js/services/mcx-regime-policy.js',
  'js/ui/journal-ui.js',
  'js/services/journal-remote-persistence.js',
  'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js',
  'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js',
  'js/ui/mcx-macro-check.js',
  'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js',
  'js/ui/tt-reconnect.js',
  'js/ui/journal-close-legs.js',
  'js/ui/journal-trade-forms.js',
  'js/ui/journal-trade-detail.js',
  'js/portfolio/portfolio-data-fetch.js',
  'js/portfolio/backend-portfolios.js',
  'js/portfolio/portfolio-expiry-manual.js',
  'js/portfolio/portfolio-traffic-light.js',
  'js/ui/backend-candle-store-chart.js',
  'js/services/journal-rich-snapshot.js',
  'js/portfolio/portfolio-backend-candles.js',
  'js/services/journal-snapshot-prefetch.js',
  'js/portfolio/portfolio-dxlink-greeks.js',
  'js/config/strategy-templates.js',
  'js/portfolio/portfolio-vega-monitor.js',
  'js/services/scanner-ivr-throttle.js',
  'js/services/scanner-earnings-throttle.js',
  'js/ui/chart-interactions.js',
  'js/services/journal-snapshot-helpers.js',
  'js/services/swing-weekly-candles.js',
  // Newest last: CHAIN is CHRONOLOGICAL, not sorted.
  MODULE_REL,
];
const CHAIN_LENGTH = 32;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const MODULE_SIZE_RANK = 8;
const LAYERS_ENDING_BRACE = 29;
const LAYERS_WITH_SEPARATOR = 24;
const LAYERS_WITH_RAW_PAIR = 21;
const LAYERS_WITHOUT_SEPARATOR = 8;
// #424's Phase 2, which rejected the block this layer came out of.
const REJECTED_LAYER = 'js/portfolio/portfolio-expiry-manual.js';
const LAYERS_SINCE_REJECTION = 14;

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

console.log('SWING DIRECTION RESOLVER — PERMANENT BOUNDARY CONTRACT');

const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate here is proved by
// the reconstruction that shipped.
const BASE = UNDO.undoSwingDirection(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const MASKED = maskLiterals(BASE_CODE);
const STRINGS = literalView(BASE_CODE, maskLiterals, stripComments);
const ALL_DECLS = scanTopLevelDeclarations(BASE_CODE);
const BY_NAME = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(BASE_CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const MARKS = topLevelBanners(BASE_CODE, FN_BODIES);
const OWNERS = scanTopLevelDeclarations(MODULE);
const MASKED_MODULE = maskLiterals(MODULE);
const MODULE_FNS = functionBodyRanges(MODULE);
const insideModuleFunction = (i) => MODULE_FNS.some((r) => i >= r.start && i <= r.end);

const SIBLINGS = LOCALS.filter((rel) => rel !== MODULE_REL).map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return {
    rel, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
    bound: locallyBound(src), owners: scanTopLevelDeclarations(src).map((d) => d.name),
  };
});
const STATIC_MARKUP = BASE.slice(0, BASE.indexOf('<script')) +
  BASE.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');
const OTHER_INLINE = APP_LOADER.parseScriptTags(BASE)
  .filter((t) => !t.src && t.inline !== BASE_CODE).map((t) => t.inline).join('\n');

// Every name the OTHER shipped modules own — the ninth direction ranges over it.
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

// The nine-direction profile of a range of the BASE monolith.
// AN OCCURRENCE INDEX, BUILT ONCE. Written the obvious way, `profile` rescans
// the whole 1.4-million-unit monolith for each of ~950 declaration names, for
// every range it is asked about — and §4 asks about every region in the
// monolith, twice. That made this contract take NINETY-SIX SECONDS a run, which
// the mutation pass then pays 73 times: the single largest cost in CI. Every
// identifier position is collected once here instead, and a range query becomes
// two binary searches. The tokenisation is the one `refSites` already uses, so
// every number is unchanged — the assertions below are what proves it.
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
  const per = SIBLINGS.map((x) => ({ bound: x.bound, idx: occurrenceIndex(x.masked) }));
  for (const d of ALL_DECLS) {
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
const sliceIn = (sites, lo, hi) => sites.slice(lowerBound(sites, lo), lowerBound(sites, hi));

function profile(range) {
  const names = ALL_DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const inside = (i) => i >= range[0] && i < range[1];
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
  const local = locallyBound(BASE_CODE.slice(range[0], range[1]));
  const deps = new Set();
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (sliceIn(at0(OCC_CODE, d.name), range[0], range[1]).length) deps.add(d.name);
  }
  // EIGHTH — markup this range generates, naming something that stays behind.
  const outGen = [];
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name)) continue;
    for (const at of sliceIn(at0(OCC_STRINGS, d.name), range[0], range[1])) outGen.push([d.name, at]);
  }
  // NINTH — code in this range naming something that already left.
  const outModule = [];
  for (const [n] of MODULE_OWNERS) {
    if (nameSet.has(n) || local.has(n)) continue;
    for (const at of sliceIn(at0(OCC_CODE, n), range[0], range[1])) outModule.push([n, at]);
  }
  const seven = inbound + inWrites + inPropWrites + outWrites.length + deps.size + sib + mkp + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp, outWrites,
    deps: Array.from(deps).sort(), sites: sites.sort((a, b) => a - b),
    outGen, outModule,
    seven, nine: seven + outGen.length + outModule.length,
  };
}

const REC = profile([RAW_AT_IN_CODE, RAW_END_IN_CODE]);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,520,354 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,549,271 bytes');
  eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…26,328 line feeds');
  eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
  eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'seventy-five local scripts ship');
  eq(LOCALS.length, UNDO.EXTRACTED_LOCAL_SCRIPTS, '…which is what the undo helper pins');
  eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, 'this module is the LAST of them');
  eq(LOCALS.length - 1, UNDO.BASE_LOCAL_SCRIPTS, '…one more than the base carried');

  eq(BASE.length, UNDO.BASE_CHARS, 'the reconstructed base is 1,529,653 units');
  eq(sha256(BASE), UNDO.BASE_SHA256, '…and hashes to the base digest');
  eq(BASE, git(['show', BASE_SHA + ':index.html']),
    'and it is byte-identical to index.html at the base commit — the reconstruction is checked '
    + 'against git, not against a copy this file carries');
  eq(BASE.length - INDEX.length, NET_REDUCTION,
    'the document lost 9,299 units net: 9,361 of monolith out, 62 of tag in');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 9,360 units');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…9,426 bytes');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…157 line feeds');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and hashes to the digest #452 pinned BEFORE the move');
  eq(MODULE, BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
    'it is the base monolith\'s bytes, verbatim, with nothing added and nothing renamed');
  eq(MODULE.slice(-2), BODY_ENDING, 'it ends `}\\n`');
  ok(!MODULE.endsWith('\n\n'), '…and not on a blank line: the separator stayed in the reconstruction');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + UNDO.SEPARATOR,
    'raw IS module plus exactly one structural line feed');
  eq(sha256(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE)), UNDO.RAW_SHA256,
    '…and that raw pair hashes as pinned');
  eq(MODULE.slice(0, MODULE.indexOf('\n')), HEAD_BANNER,
    'it opens on the three-dash banner the old screening rule could not see');

  // The fragment is GONE from the live monolith, not duplicated into the module.
  eq(LIVE_CODE.length, RESIDUAL_MONOLITH, 'the residual monolith is 1,405,988 units');
  eq(BASE_CODE.length - LIVE_CODE.length, RAW_END_IN_CODE - RAW_AT_IN_CODE,
    '…exactly 9,361 units shorter than the base monolith');
  eq(LIVE_CODE.indexOf(MODULE.slice(0, 400)), -1, 'no part of the module is left inline');
  for (const n of OWNERS_EXPECTED) {
    eq(scanTopLevelDeclarations(LIVE_CODE).filter((d) => d.name === n).length, 0,
      n + ' is no longer declared in the monolith');
  }
  eq(LIVE_CODE, BASE_CODE.slice(0, RAW_AT_IN_CODE) + BASE_CODE.slice(RAW_END_IN_CODE),
    'and the monolith is exactly the base with that one range excised — no other byte moved');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the base monolith started at 114,278');
  eq(BASE_CODE.length, CODE_CHARS, '…and was 1,415,349 units');
  eq(CODE_AT + RAW_AT_IN_CODE, UNDO.RAW_AT, 'the fragment sat at 515,852 in base document coordinates');
  eq(CODE_AT + RAW_END_IN_CODE, UNDO.RAW_END, '…ending at 525,213');
  ok(BASE_CODE[RAW_AT_IN_CODE - 1] === '\n', 'the region opened on a line start');
  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd lands one unit short of the next line');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE - 1),
    'EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED', 'control — a body end one unit short is refused');
  eq(MARKS.filter((m) => m > RAW_AT_IN_CODE && m < RAW_END_IN_CODE).length, 0,
    'the region spans no column-0 banner of its own');
  eq(MARKS.length, TOP_LEVEL_BANNERS, 'the base monolith carried the pinned number of them');
  ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0,
    '…and the corrected rule marks THIS region\'s opening banner, which is why it could be chosen');

  // The tag, and what it sits between.
  eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
    'the tag loads immediately after journal-snapshot-helpers.js and immediately before the monolith');
  eq(UNDO.RAW_AT - INDEX.indexOf(TAG), TAG_GAP,
    'the tag line begins 401,582 units before the fragment it replaced');
  eq(TAG.length, 57, 'the tag line is 57 units');
  eq(NET_REDUCTION, (RAW_END_IN_CODE - RAW_AT_IN_CODE) - TAG.length,
    '…which is the whole of the net difference');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Three ends, the screen that could not see them, and the chain');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares three names at top level');
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, '…in this order');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…all three functions');
  eq(codeLines(MODULE), CODE_LINES, 'it carries 82 lines of code');
  {
    const ch = Array.from(MODULE);
    for (const d of OWNERS) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
    eq(codeLines(ch.join('')), TOP_LEVEL_STATEMENT_LINES,
      'zero top-level statement lines: nothing outside the declarations');
  }

  // THE RATIO, kept executed rather than left in the header. This is the trade
  // the cycle made, and it should stay visible after the audit that made it is
  // deleted.
  const lines = MODULE.split('\n');
  eq(lines.length, TOTAL_LINES, 'the module is 158 lines');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…76 of them comment or blank');
  eq(OWNERS[0].start, HEADER_UNITS,
    'the first owner begins 3,841 units in: the region opens with a documentation header');
  ok(UNDO.MODULE_CHARS > CODE_LINES * 100,
    '…so this is 9,360 units for 82 lines of code, and the explanation travels with the code');

  // THE THREE ENDS, re-measured here rather than cited from the audit this PR
  // deletes. The whole table against one derived table, so a dropped row cannot
  // simply run one assertion fewer.
  const measured = ENDS.map(({ end }) => {
    const p = profile([RAW_AT_IN_CODE, end]);
    return { end, units: end - RAW_AT_IN_CODE, owners: p.names.length, nine: p.nine };
  });
  eq(measured, ENDS, 'three ends, their sizes, their owners and their nine-direction scores');
  eq(ENDS[SHIPPED_ROW].end, RAW_END_IN_CODE, '…the first being the one that shipped');
  const accepted = ENDS.map(({ end }) => {
    try { return assertSeam(BASE_CODE, RAW_AT_IN_CODE, snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, end)) === end; }
    catch (e) { return e.message; }
  });
  eq(accepted, [true, true, true], 'assertSeam accepts all three…');
  // AND REFUSES A FOURTH. The mechanical check is usually silent — the two
  // cycles before this one had every candidate end accepted — so the one time
  // it does reject a boundary is worth keeping rather than dropping from the
  // table. 425438 is not a legal seam: nothing separates the body from what
  // follows it.
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, FOURTH_END)),
    FOURTH_END_ERROR, '…and REFUSES the fourth, for want of a structural separator');

  // THE CLOSE CALL, argued rather than dismissed: one owner and one point away.
  ok(ENDS[1].nine - ENDS[0].nine === 1 && ENDS[1].units - ENDS[0].units === 948,
    'the second end costs one more point for 948 more units — close enough to need a reason');
  {
    const second = profile([RAW_AT_IN_CODE, ENDS[1].end]);
    eq(second.names.filter((n) => OWNERS_EXPECTED.indexOf(n) < 0), [SECOND_END_OWNER],
      '…the owner it adds being _swingScore');
    ok(MARKS.indexOf(ENDS[0].end) >= 0,
      '…which opens its OWN banner, so the shipped end is where one feature stops and the next '
      + 'begins: absorbing it would have taken a clean region as a rounding error');
  }

  // Measured over the WHOLE chain, not inferred from the layers nearest to hand.
  eq(CHAIN.length, CHAIN_LENGTH, 'thirty-one layers ship today');
  // NO DUPLICATES. Without this, replacing one entry with a copy of another
  // passes every other clause — the length is unchanged, both paths resolve to
  // an undo helper, and the size table simply counts one file twice. A mutant
  // that did exactly that survived in CI.
  eq(Array.from(new Set(CHAIN)).length, CHAIN_LENGTH,
    '…and each of them exactly once: a chain with a duplicated entry is a chain missing a layer');
  eq(CHAIN.length - (CHAIN.indexOf(REJECTED_LAYER) + 1), LAYERS_SINCE_REJECTION,
    'thirteen layers have shipped since #424 rejected the block this one came out of');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at 1,761 units');
  eq(bySize.findIndex((x) => x.rel === MODULE_REL) + 1, MODULE_SIZE_RANK,
    'this layer is SIXTEENTH of thirty-one by size');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS, '…at 9,360 units');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS, 'the chain\'s largest is still 71,811');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[bySize.length - 1].units > UNDO.MODULE_CHARS,
    '…so this layer displaces no superlative, and re-pins no earlier contract');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\\n`, this one among them');

  // The bridge's separator claims, executed. Helpers are matched by the module
  // path in their own TAG, not by filename: a basename matcher does not derive
  // `vega-monitor-undo.js` from `js/portfolio/portfolio-vega-monitor.js`.
  const HELPERS = fs.readdirSync(path.join(ROOT, 'tests/lib'))
    .filter((f) => /-undo\.js$/.test(f) && f !== 'post-journal-mcx-pr3-undo.js')
    .map((f) => require(path.join(ROOT, 'tests/lib', f)));
  const forLayer = CHAIN.map((rel) => {
    const hit = HELPERS.filter((M) => typeof M.TAG === 'string' && M.TAG.indexOf('/' + rel + '"') >= 0);
    return hit.length === 1 ? hit[0] : null;
  });
  eq(forLayer.filter(Boolean).length, CHAIN_LENGTH,
    'every one of the thirty-one resolves to exactly one undo helper by its own TAG');
  const withSeparator = forLayer.filter((M) => Object.prototype.hasOwnProperty.call(M, 'SEPARATOR'));
  eq(withSeparator.length, LAYERS_WITH_SEPARATOR,
    'LAYERS_WITH_SEPARATOR carry a SEPARATOR export, this one among them');
  eq(CHAIN_LENGTH - withSeparator.length, LAYERS_WITHOUT_SEPARATOR,
    '…and the eight oldest have no separator concept at all');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…but not all of them pin a single RAW_CHARS one unit longer than MODULE_CHARS, '
    + 'so the pair is not the tell the separator is');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling in all nine directions, and the cycle across the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(REC.sites, EDGE_SITES, 'FOUR references reached in from the rest of the monolith');
  eq(REC.inbound, EXTERNAL_EDGES, '…exactly four');
  ok(REC.sites.every(insideFunction), '…every one inside a function body, so none ran at load');

  // THE HOSTS ARE DERIVED, not listed and looped over.
  const hostOf = (i) => ALL_DECLS.filter((d) => i >= d.start && i <= d.end).pop();
  const hosts = Array.from(new Set(REC.sites.map((i) => hostOf(i).name))).sort();
  eq(hosts, CALLERS.slice().sort(), 'all four sat inside exactly THREE functions, all of which stay behind');
  for (const name of CALLERS) {
    ok(BY_NAME.has(name), name + ' is a monolith declaration…');
    eq(scanTopLevelDeclarations(LIVE_CODE).filter((d) => d.name === name).length, 1,
      '…and it is still declared in the shipped monolith');
  }

  // `S`, AND THE RULE #424 LEFT TOO BROAD. This is the one thing about this
  // layer worth carrying forward, so it is measured rather than described.
  // THE HISTORY IS READ OUT OF THE SHIPPED CONTRACT, not restated from memory.
  {
    const expiry = fs.readFileSync(path.join(ROOT, EXPIRY_CONTRACT), 'utf8');
    ok(expiry.indexOf(RECORDED_UNITS) >= 0,
      '#424\'s rejection is still on the record in the manual-expiry contract…');
    ok(/S\.swing/.test(expiry), '…and it records the reason: `S.swing` assigned at evaluation time');
  }
  ok(BY_NAME.has(S_NAME), 'S is a top-level declaration of the base monolith…');
  eq(BY_NAME.get(S_NAME).form, S_FORM, '…and a const, which is what made #424 fatal');
  // THE THREE HALVES OF THE DISTINCTION, each on its own. Together they are the
  // difference between "names S" and "touches S while the file loads".
  eq(refSites(MASKED_MODULE, S_NAME).length, S_REFS_IN_BODY, 'this module names S three times…');
  ok(refSites(MASKED_MODULE, S_NAME).every(insideModuleFunction),
    '…every one inside a function body, so not one of them runs at load…');
  eq(propertyWriteBases(MASKED_MODULE).filter((x) => x === S_NAME).length, S_PROPERTY_WRITES,
    '…and it writes NO property through S, which is the thing #424 could not survive');
  // The negative case, or the rule is only a description of this one module.
  {
    const blob = BASE_CODE.slice(BLOB[0], snapBodyEnd(BASE_CODE, BLOB[0], BLOB[1]));
    const blobMasked = maskLiterals(blob);
    const blobFns = functionBodyRanges(blob);
    ok(propertyWriteBases(blobMasked).filter((x) => x === S_NAME).length > 0,
      'control — the stretch #424 measured DOES write through S…');
    ok(refSites(blobMasked, S_NAME).some((i) => !blobFns.some((r) => i >= r.start && i <= r.end)),
      '…at top level, outside every function body: the rule still rejects it, and should');
  }
  // Is a runtime dependency normal here? Counted over the chain, not inferred.
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
      'TEN shipped contracts pin a non-empty MONOLITH_DEPENDENCIES — this one included, which is '
      + 'why the count moved: a runtime dependency is the common case in this chain, not an '
      + 'exception argued for this layer');
  }

  eq({
    inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
    outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
    staticMarkup: REC.mkp, generatedMarkup: REC.gen,
    outboundGenerated: REC.outGen.length, outboundModule: REC.outModule.length,
  }, ZERO_DIRECTIONS,
  'EIGHT of the nine directions measure zero: no write in, none through, none out, '
  + 'no markup either way, no sibling module, and nothing that already left');
  eq(REC.nine, FULL_NINE, 'nine directions, total score 8 — five edges in and three dependencies out');

  // The controls those zeros need, from inputs where the answer differs.
  {
    const CANDLES = [75943, 80720];
    const cn = ALL_DECLS.filter((d) => d.start >= CANDLES[0] && d.end < CANDLES[1]).map((d) => d.name);
    let cp = 0;
    for (const n of cn) for (const at of refSites(MASKED, n).filter((i) => i < CANDLES[0] || i >= CANDLES[1])) {
      if (isPropertyWriteAt(MASKED, at, n)) cp++;
    }
    ok(cp > 0, 'control — the candle-fetch region DOES take writes through a name it owns');
    ok(refSites(STRINGS, 'rsApplyFilters').length > 0,
      'control — the literal view DOES find rsApplyFilters, so the generated-markup zero measures');
    ok(profile([678945, 686316]).outGen.length > 0,
      'control — the ticker-search region DOES generate markup naming names that stay behind');
    // THE OUTBOUND-MODULE ZERO needs an input where the answer differs, not a
    // restatement that the map is populated — which is true whatever the metric
    // does. The SPY-rewarm region names things that have already left.
    ok(profile([338277, 342591]).outModule.length > 0,
      'control — the SPY-rewarm region DOES name what already left, so this zero is a measurement');
  }

  eq(REC.deps, MONOLITH_DEPENDENCIES, 'it names three things the monolith declares — S among them');
  ok(REC.deps.every((d) => refSites(MASKED_MODULE, d).every(insideModuleFunction)),
    '…every one from inside a function body: runtime dependencies, not load-time ones');
  for (const d of MONOLITH_DEPENDENCIES) {
    eq(scanTopLevelDeclarations(LIVE_CODE).filter((x) => x.name === d).length, 1,
      d + ' is still declared in the shipped monolith, which loads last of all');
  }

  eq(SIBLINGS.length, LOCAL_SCRIPT_COUNT - 1, 'there are seventy-five siblings to have named it');
  eq(SIBLINGS.filter((s) => REC.names.some((n) => !s.bound.has(n) && refSites(s.masked, n).length)).map((s) => s.rel),
    [], '…and not one of them does');

  // REACHABILITY IN THE BASE. Carried forward because the number is a property
  // of the monolith rather than of any one layer, and because the 6,608 dead
  // units an earlier cycle relocated are still dead — relocation is not
  // deletion, and deleting them is a production change of its own.
  const dead = ALL_DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return refSites(MASKED, d.name).filter((i) => !self(i)).length === 0 &&
      refSites(STRINGS, d.name).length === 0 &&
      refSites(STATIC_MARKUP, d.name).length === 0 &&
      refSites(OTHER_INLINE, d.name).length === 0 &&
      SIBLINGS.every((s) => refSites(s.masked, d.name).length === 0 &&
        refSites(s.strings, d.name).length === 0);
  });
  eq(dead.length, DEAD_DECLS, 'eighteen of the base monolith\'s declarations are named nowhere in production');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…5,318 units of them');
  eq(dead.filter((d) => OWNERS_EXPECTED.indexOf(d.name) >= 0), [],
    'and none of this layer\'s owners is among them');
  // THIS PIN USED TO CHECK NOTHING. It asserted only `!BY_NAME.has(name)`, which
  // is true of EVERY name that has ever left the monolith — a mutant naming a
  // different departed function survived it in CI. The claim is about one
  // specific declaration, so it is now measured as such: it left the monolith,
  // the previous layer owns it, and NOTHING in production calls it.
  // This pin used to assert only `!BY_NAME.has(name)`, which is true of EVERY
  // departed name — a mutant naming a different one survived it in CI. It pins
  // the identity now: gone from the monolith, owned by a known layer, called by
  // nothing anywhere.
  ok(!BY_NAME.has(DEPARTED_DEAD), '_buildSnapshot is no longer in the monolith…');
  eq(MODULE_OWNERS.get(DEPARTED_DEAD), DEPARTED_DEAD_OWNER, '…it belongs to the snapshot-helpers layer…');
  eq(refSites(MASKED, DEPARTED_DEAD).length +
     refSites(STRINGS, DEPARTED_DEAD).length +
     refSites(STATIC_MARKUP, DEPARTED_DEAD).length +
     SIBLINGS.filter((x) => x.rel !== DEPARTED_DEAD_OWNER)
       .reduce((n, x) => n + refSites(x.masked, DEPARTED_DEAD).length, 0), 0,
  '…and nothing in production names it: 6,608 units this chain relocated but cannot delete');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(MODULE, OWNERS, maskLiterals), EVALUATION_TIME_READS,
    'the module reads NO name at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining three globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(), '…exactly its own owners');
  for (const dep of MONOLITH_DEPENDENCIES) {
    ok(!(dep in ctx), '…and ' + dep + ' is not among them: the dependency is called, never defined');
  }
  eq(typeof ctx._swingResolveDirection, 'function', 'the resolver the five callers reach for is there');
  eq(typeof ctx._swingRsContext, 'function', '…as is the RS context helper…');
  eq(typeof ctx._swingVixSuitability, 'function', '…and the VIX suitability check');

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
  vm.runInContext(MODULE, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer, reads no storage and binds no listener');
  ok(!/\bnew\s+WebSocket\b/.test(MASKED_MODULE), '…and opens no socket');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  throwsWith(() => UNDO.undoSwingDirection(null, MODULE),
    'SWING_DIRECTION_UNDO_BAD_INPUT', 'a non-string document is refused');
  throwsWith(() => UNDO.undoSwingDirection(INDEX, null),
    'SWING_DIRECTION_UNDO_BAD_INPUT', '…and a non-string module');
  throwsWith(() => UNDO.undoSwingDirection(INDEX, MODULE.slice(0, -1)),
    'SWING_DIRECTION_UNDO_MODULE_IDENTITY', 'a truncated module is refused');
  // WHICH GUARD CATCHES A RE-ABSORBED SEPARATOR, measured rather than assumed:
  // such a module is 6,503 units with 93 line feeds, so the SIZE guard fires
  // first and MODULE_SEPARATOR never sees it.
  throwsWith(() => UNDO.undoSwingDirection(INDEX, MODULE + '\n'),
    'SWING_DIRECTION_UNDO_MODULE_IDENTITY',
    'a module that re-absorbed the separator is caught by SIZE, not the separator clause');
  eq((MODULE + '\n').length, UNDO.MODULE_CHARS + 1, '…because it is one unit too long');
  eq(((MODULE + '\n').match(/\n/g) || []).length, UNDO.MODULE_LF + 1, '…and one line feed too many');
  throwsWith(() => UNDO.undoSwingDirection(INDEX, MODULE.slice(0, -2) + 'x\n'),
    'SWING_DIRECTION_UNDO_MODULE_SEPARATOR', 'a module not ending `}\\n` is refused');
  throwsWith(() => UNDO.undoSwingDirection(BASE, MODULE),
    'SWING_DIRECTION_UNDO_TAG_IDENTITY', 'an already-unextracted document is refused');
  throwsWith(() => UNDO.undoSwingDirection(INDEX.replace(TAG, TAG + TAG), MODULE),
    'SWING_DIRECTION_UNDO_TAG_IDENTITY', 'a duplicated tag is refused');
  throwsWith(() => UNDO.undoSwingDirection(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    'SWING_DIRECTION_UNDO_TAG_ADJACENCY', 'a reordered tag is refused');
  throwsWith(() => UNDO.undoSwingDirection(INDEX.replace(INLINE_OPEN, '<!-- x -->' + INLINE_OPEN), MODULE),
    'SWING_DIRECTION_UNDO_TAG_ADJACENCY', 'content wedged between the tag and the monolith is refused');
  throwsWith(() => UNDO.undoSwingDirection(INDEX.replace('</body>', '<!-- foreign --></body>'), MODULE),
    'SWING_DIRECTION_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  eq(UNDO.undoSwingDirection(INDEX, MODULE), BASE,
    'and the accepted path reconstructs the base exactly');
  ok(UNDO.isApplied(INDEX), 'isApplied sees this layer in the shipped document');
  ok(!UNDO.isApplied(BASE), '…and does not see it in the base');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
    ['index.html', MODULE_REL],
    'production footprint is exactly index.html plus the one new module');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary audit is shipped: this contract replaces it one for one');
  // ABSENCE ALONE IS NOT A PIN: any wrong path is also absent, so the name has
  // to be the one the base actually carried.
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)),
    'the audit’s mutation spec is gone with the audit it targeted');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely a path that does not exist');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]), '', '…as is the audit\'s own path');
  ok(fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)), '…replaced by one for this contract');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite matches the pin above: the audit left as this contract arrived');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
}

console.log('\n' + pass + ' assertions passed.');
console.log('SWING_DIRECTION_BOUNDARY_OK');
