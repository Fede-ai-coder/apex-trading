'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL SNAPSHOT HELPERS — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #450 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/journal-snapshot-helpers-undo.js
// reconstructs the pre-extraction document byte for byte, and §8 asserts the
// production footprint is index.html plus the one new file.
//
// WHAT MOVED. [1210818,1221613) in monolith coordinates — 10,795 units holding
// THREE top-level owners, all functions: `_buildSnapshot`, `_logSnapshot` and
// `_greeksMergeFromCache`. 199 lines of code, zero top-level statements.
//
// SIX EDGES REACHED IN, AND THEY WERE THREE COPIES OF ONE IDIOM. Every inbound
// reference sat inside `positionManager`, `submitClosePosition` or
// `submitTrade`, and each of those three makes the same three calls in the same
// order: merge the cached greeks, build the rich snapshot, log it. §5 derives
// that rather than asserting it. The middle call, `_buildRichSnapshot`, is not
// in the monolith at all — it shipped as js/services/journal-rich-snapshot.js in
// an earlier cycle, so this layer is the two ends of an idiom whose centre had
// already left.
//
// THIS MODULE SHIPS 6,608 UNITS THAT NOTHING CALLS, and that is on the record
// rather than hidden. `_buildSnapshot` is named nowhere in production — not in
// the monolith's code, not in its literals, not in any of the seventy-three
// other local scripts, not in the static markup — and §4 re-measures that here
// rather than citing the deleted audit. Relocation cannot delete it: "byte-exact
// or it is not done" is the rule that makes the undo helper possible. Deleting
// it is a production change and belongs in its own PR. What this move buys is
// that the dead weight is now a named file instead of 6,608 units buried in a
// 1,415,349-unit inline script.
//
// AND THAT IS WHY THE SCREEN COULD NOT PICK THIS BOUNDARY ALONE. #450 measured
// four ends from this start; all four are valid seams — `assertSeam` accepts
// every one, so the mechanical check broke no tie here, unlike the cycle before
// — and the nine-direction score rises monotonically with size:
//
//     end        units   seven  eight  nine   seam
//     1217580    6,762       4      4     5   accepted
//     1218266    7,448       8      8     9   accepted
//     1221613   10,795      12     12    14   accepted   ← this one
//     1223775   12,957      17     17    19   accepted
//
// So a screen left to itself takes the NARROW cut, which is `_buildSnapshot`
// alone: it scores best because nothing calls it. Zero inbound is what a
// well-encapsulated leaf looks like and also what dead code looks like, and no
// direction of the screen tells them apart. §4 keeps both halves running — the
// four ends, and the reachability that decides between them.
//
// TWO DIRECTIONS THE OLDER CONTRACTS DO NOT HAVE, added by #450 and kept here:
// markup a region GENERATES naming something that stays behind, and code naming
// something that has ALREADY LEFT the monolith. This layer carries zero of the
// first and two of the second, both `buildStreamerSymbol` from
// js/utils/option-symbols.js. §5 measures them with controls.
//
// SEVENTEENTH OF THIRTY BY SIZE. At 10,794 units it displaces no superlative —
// the vega monitor (1,761) keeps smallest, the traffic light (71,811) keeps
// largest — so this change re-pins nothing in any earlier contract.
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
const UNDO = require('./lib/journal-snapshot-helpers-undo.js');

const MODULE_REL = 'js/services/journal-snapshot-helpers.js';
const TAG = '<script src="./js/services/journal-snapshot-helpers.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/chart-interactions.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '78e60b2';
const CONTRACT_REL = 'tests/journal-snapshot-helpers-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-snapshot-helpers-undo.js';
const AUDIT_REL = 'tests/temporary-snapshot-helpers-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/snapshot-helpers-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/journal-snapshot-helpers-contract.spec.js';

// Ratchet. The suite file count as it stands TODAY, not as it stood when this
// contract shipped: a Phase 1 audit adds its temporary file and advances this
// pin in every contract that carries it, and Phase 2 deletes that audit as the
// next contract arrives, leaving the count where it is.
const TEST_FILE_COUNT = 158;
const LOCAL_SCRIPT_COUNT = 74;
const MODULE_POSITION = 73;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 114212;
const CODE_CHARS = 1426144;
const RAW_AT_IN_CODE = 1210818;
const RAW_END_IN_CODE = 1221613;
const BODY_END_IN_CODE = 1221612;
const TOP_LEVEL_BANNERS = 177;
const RESIDUAL_MONOLITH = 1415349;
const TAG_GAP = 1210826;
const NET_REDUCTION = 10729;

// ── The three owners ─────────────────────────────────────────────────────────
const OWNERS_EXPECTED = ['_buildSnapshot', '_logSnapshot', '_greeksMergeFromCache'];
const OWNER_COUNT = 3;
const FUNCTION_OWNERS = 3;
const CODE_LINES = 199;
const BODY_ENDING = '}\n';
const HEAD_BANNER = '// ── SNAPSHOT HELPER — reads only already-available state ────────';

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 6;
const EDGE_SITES = [747851, 747987, 1209468, 1209658, 1410339, 1410905];
const CALLERS = ['positionManager', 'submitClosePosition', 'submitTrade'];
const IDIOM_MIDDLE = '_buildRichSnapshot';
const IDIOM_MIDDLE_MODULE = 'js/services/journal-rich-snapshot.js';
const IDIOM_MIDDLE_SITES = [747931, 1209577, 1410412];
// Five directions that measure zero, asserted as ONE object against one derived
// object: five separate `eq(…, 0)` calls are five chances to lose one quietly.
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const MONOLITH_DEPENDENCIES =
  ['S', '_portfolioLegEffectiveQty', 'debugLog', 'getCanonicalIvr', 'isActivePortfolioLeg'];
const SIBLING_REFERENCES = 1;
const SIBLING_REFERRER = 'js/ui/journal-trade-forms.js';
const OUTBOUND_MODULE_NAMES = ['buildStreamerSymbol'];
const OUTBOUND_MODULE_EDGES = 2;
const OUTBOUND_MODULE_OWNER = 'js/utils/option-symbols.js';
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 3;

// ── The four ends, kept measured rather than remembered ──────────────────────
const ENDS = [
  { end: 1217580, units: 6762, owners: 1, nine: 5 },
  { end: 1218266, units: 7448, owners: 2, nine: 9 },
  { end: 1221613, units: 10795, owners: 3, nine: 14 },
  { end: 1223775, units: 12957, owners: 7, nine: 19 },
];
const RECOMMENDED_ROW = 2;

// ── Reachability: the half of the decision the score cannot make ─────────────
const DEAD_DECLS = 19;
const DEAD_UNITS = 11926;
const DEAD_LARGEST = '_buildSnapshot';
const DEAD_LARGEST_CHARS = 6608;
const DEAD_LARGEST_CODE_LINES = 113;

// ── The chain this joins ─────────────────────────────────────────────────────
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
  // Newest last: CHAIN is CHRONOLOGICAL, not sorted.
  MODULE_REL,
];
const CHAIN_LENGTH = 30;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const MODULE_SIZE_RANK = 17;
const LAYERS_ENDING_BRACE = 27;
const LAYERS_WITH_SEPARATOR = 22;
const LAYERS_WITH_RAW_PAIR = 19;
const LAYERS_WITHOUT_SEPARATOR = 8;

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

console.log('JOURNAL SNAPSHOT HELPERS — PERMANENT BOUNDARY CONTRACT');

const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate here is proved by
// the reconstruction that shipped.
const BASE = UNDO.undoJournalSnapshotHelpers(INDEX, MODULE);
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
function profile(range) {
  const names = ALL_DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const inside = (i) => i >= range[0] && i < range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0, sib = 0, mkp = 0;
  const sites = [];
  for (const n of names) {
    for (const at of refSites(MASKED, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += refSites(STRINGS, n).filter(outside).length;
    for (const s of SIBLINGS) if (!s.bound.has(n)) sib += refSites(s.masked, n).length;
    mkp += refSites(STATIC_MARKUP, n).length;
  }
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  const local = locallyBound(BASE_CODE.slice(range[0], range[1]));
  const deps = new Set();
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (refSites(bodyMasked, d.name).length) deps.add(d.name);
  }
  // EIGHTH — markup this range generates, naming something that stays behind.
  const outGen = [];
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name)) continue;
    for (const at of refSites(STRINGS, d.name).filter(inside)) outGen.push([d.name, at]);
  }
  // NINTH — code in this range naming something that already left.
  const outModule = [];
  for (const [n] of MODULE_OWNERS) {
    if (nameSet.has(n) || local.has(n)) continue;
    for (const at of refSites(MASKED, n).filter(inside)) outModule.push([n, at]);
  }
  const five = inbound + inWrites + outWrites.length + deps.size + sib + mkp;
  const seven = five + inPropWrites + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp, outWrites,
    deps: Array.from(deps).sort(), sites: sites.sort((a, b) => a - b),
    outGen, outModule,
    five, seven, eight: seven + outGen.length, nine: seven + outGen.length + outModule.length,
  };
}

const REC = profile([RAW_AT_IN_CODE, RAW_END_IN_CODE]);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,529,653 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,558,636 bytes');
  eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…26,485 line feeds');
  eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
  eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'seventy-four local scripts ship');
  eq(LOCALS.length, UNDO.EXTRACTED_LOCAL_SCRIPTS, '…which is what the undo helper pins');
  eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, 'this module is the LAST of them');
  eq(LOCALS.length - 1, UNDO.BASE_LOCAL_SCRIPTS, '…one more than the base carried');

  eq(BASE.length, UNDO.BASE_CHARS, 'the reconstructed base is 1,540,382 units');
  eq(sha256(BASE), UNDO.BASE_SHA256, '…and hashes to the base digest');
  eq(BASE, git(['show', BASE_SHA + ':index.html']),
    'and it is byte-identical to index.html at the base commit — the reconstruction is checked '
    + 'against git, not against a copy this file carries');
  eq(INDEX, git(['show', 'HEAD:index.html']).length ? INDEX : INDEX,
    'control — the live document is read from the working tree');
  eq(BASE.length - INDEX.length, NET_REDUCTION,
    'the document lost 10,729 units net: 10,795 of monolith out, 66 of tag in');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 10,794 units');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…10,821 bytes');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…229 line feeds');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and hashes to the digest #450 pinned BEFORE the move');
  eq(MODULE, BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
    'it is the base monolith\'s bytes, verbatim, with nothing added and nothing renamed');
  eq(MODULE.slice(-2), BODY_ENDING, 'it ends `}\\n`');
  ok(!MODULE.endsWith('\n\n'), '…and not on a blank line: the separator stayed in the reconstruction');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + UNDO.SEPARATOR,
    'raw IS module plus exactly one structural line feed');
  eq(sha256(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE)), UNDO.RAW_SHA256, '…and that raw pair hashes as pinned');
  eq(MODULE.slice(0, MODULE.indexOf('\n')), HEAD_BANNER, 'it opens on the snapshot-helper banner');

  // The fragment is GONE from the live monolith, not duplicated into the module.
  eq(LIVE_CODE.length, RESIDUAL_MONOLITH, 'the residual monolith is 1,415,349 units');
  eq(BASE_CODE.length - LIVE_CODE.length, RAW_END_IN_CODE - RAW_AT_IN_CODE,
    '…exactly 10,795 units shorter than the base monolith');
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
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the base monolith started at 114,212');
  eq(BASE_CODE.length, CODE_CHARS, '…and was 1,426,144 units');
  eq(CODE_AT + RAW_AT_IN_CODE, UNDO.RAW_AT, 'the fragment sat at 1,325,030 in base document coordinates');
  eq(CODE_AT + RAW_END_IN_CODE, UNDO.RAW_END, '…ending at 1,335,825');
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
  eq(MARKS.length, TOP_LEVEL_BANNERS, 'the base monolith carried 177 of them');

  // The tag, and what it sits between.
  eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
    'the tag loads immediately after chart-interactions.js and immediately before the monolith');
  eq(UNDO.RAW_AT - INDEX.indexOf(TAG), TAG_GAP,
    'the tag line begins 1,210,826 units before the fragment it replaced');
  eq(TAG.length, 66, 'the tag line is 66 units');
  eq(NET_REDUCTION, (RAW_END_IN_CODE - RAW_AT_IN_CODE) - TAG.length, '…which is the whole of the net difference');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Four ends, and the reachability the score could not see');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares three names at top level');
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, '…in this order');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…all three functions');
  eq(codeLines(MODULE), CODE_LINES, 'it carries 199 lines of code');
  {
    const ch = Array.from(MODULE);
    for (const d of OWNERS) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
    eq(codeLines(ch.join('')), TOP_LEVEL_STATEMENT_LINES,
      'zero top-level statement lines: nothing outside the declarations');
  }

  // THE FOUR ENDS, re-measured here rather than cited from the audit this PR
  // deletes. The whole table against one derived table, so a dropped row cannot
  // simply run one assertion fewer.
  const measured = ENDS.map(({ end }) => {
    const p = profile([RAW_AT_IN_CODE, end]);
    return { end, units: end - RAW_AT_IN_CODE, owners: p.names.length, nine: p.nine };
  });
  eq(measured, ENDS, 'four ends, their sizes, their owners and their nine-direction scores');
  eq(ENDS[RECOMMENDED_ROW].end, RAW_END_IN_CODE, '…the third being the one that shipped');
  const scores = ENDS.map((r) => r.nine);
  eq(scores.slice().sort((a, b) => a - b), scores, 'the score rises monotonically with the size of the cut');
  const accepted = ENDS.map(({ end }) => {
    try { return assertSeam(BASE_CODE, RAW_AT_IN_CODE, snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, end)) === end; }
    catch (e) { return e.message; }
  });
  eq(accepted, [true, true, true, true],
    'assertSeam accepts ALL FOUR — the mechanical check broke no tie here');

  // WHY THE NARROW CUT WAS NOT TAKEN, which is the cycle's finding and so keeps
  // running: it scores best because nothing calls what it contains.
  const dead = ALL_DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return refSites(MASKED, d.name).filter((i) => !self(i)).length === 0 &&
      refSites(STRINGS, d.name).length === 0 &&
      refSites(STATIC_MARKUP, d.name).length === 0 &&
      refSites(OTHER_INLINE, d.name).length === 0 &&
      SIBLINGS.every((s) => refSites(s.masked, d.name).length === 0 &&
        refSites(s.strings, d.name).length === 0);
  }).sort((a, b) => b.chars - a.chars);
  eq(dead.length, DEAD_DECLS, 'nineteen of the base monolith\'s declarations were named nowhere in production');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…11,926 units of them');
  eq(dead[0].name, DEAD_LARGEST, 'the largest was _buildSnapshot');
  eq(dead[0].chars, DEAD_LARGEST_CHARS, '…6,608 units');
  ok(dead[0].chars * 2 > DEAD_UNITS, '…more than half of all the dead weight in one declaration');
  const narrow = profile([RAW_AT_IN_CODE, ENDS[0].end]);
  eq(narrow.names, [DEAD_LARGEST], 'the narrow cut was that declaration and nothing else');
  eq(narrow.inbound, 0, '…with zero inbound edges — the best score any direction can give');
  ok(narrow.nine < REC.nine, '…so on score alone the screen preferred it to what shipped');

  // AND IT IS STILL UNREACHED NOW THAT IT IS A MODULE. Relocation changed the
  // file it lives in, not the fact that nothing calls it.
  const stillDead = refSites(maskLiterals(LIVE_CODE), DEAD_LARGEST).length === 0 &&
    refSites(literalView(LIVE_CODE, maskLiterals, stripComments), DEAD_LARGEST).length === 0 &&
    SIBLINGS.every((s) => refSites(s.masked, DEAD_LARGEST).length === 0);
  ok(stillDead, 'nothing in the shipped document calls it either: the move relocated dead code, '
    + 'deliberately, and deleting it is a production change for its own PR');
  eq(codeLines(MODULE.slice(OWNERS[0].start, OWNERS[0].end + 1)), DEAD_LARGEST_CODE_LINES,
    '…113 of the module\'s 199 lines');

  // Measured over the WHOLE chain, not inferred from the layers nearest to hand.
  eq(CHAIN.length, CHAIN_LENGTH, 'thirty layers ship today');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at 1,761 units');
  eq(bySize.findIndex((x) => x.rel === MODULE_REL) + 1, MODULE_SIZE_RANK,
    'this layer is SEVENTEENTH of thirty by size');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS, '…at 10,794 units');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS, 'the chain\'s largest is still 71,811');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[bySize.length - 1].units > UNDO.MODULE_CHARS,
    '…so this layer displaces no superlative, and re-pins no earlier contract');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\n`, this one among them');

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
    'every one of the thirty resolves to exactly one undo helper by its own TAG');
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
section('5. Coupling, in all nine directions — three copies of one idiom');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(REC.sites, EDGE_SITES, 'SIX references reached in from the rest of the monolith');
  eq(REC.inbound, EXTERNAL_EDGES, '…exactly six');
  ok(REC.sites.every(insideFunction), '…every one inside a function body, so none ran at load');

  // THE HOSTS ARE DERIVED, not listed and looped over.
  const hostOf = (i) => ALL_DECLS.filter((d) => i >= d.start && i <= d.end).pop();
  const hosts = Array.from(new Set(REC.sites.map((i) => hostOf(i).name))).sort();
  eq(hosts, CALLERS.slice().sort(), 'all six sat inside exactly THREE functions');

  // …and each of the three makes the same three calls, in the same order.
  eq(refSites(MASKED, IDIOM_MIDDLE), IDIOM_MIDDLE_SITES,
    '_buildRichSnapshot is named three times in the base monolith');
  const idiom = CALLERS.map((name) => {
    const host = BY_NAME.get(name);
    const within = (sites) => sites.filter((i) => i >= host.start && i <= host.end);
    const merge = within(refSites(MASKED, '_greeksMergeFromCache'));
    const rich = within(refSites(MASKED, IDIOM_MIDDLE));
    const log = within(refSites(MASKED, '_logSnapshot'));
    return merge.length === 1 && rich.length === 1 && log.length === 1 &&
      merge[0] < rich[0] && rich[0] < log[0];
  });
  eq(idiom, [true, true, true],
    'each caller merges the cached greeks, builds the rich snapshot, then logs it — in that order');
  ok(!BY_NAME.has(IDIOM_MIDDLE), '…and the middle call is NOT in the monolith…');
  eq(MODULE_OWNERS.get(IDIOM_MIDDLE), IDIOM_MIDDLE_MODULE,
    '…it belongs to js/services/journal-rich-snapshot.js, a layer already shipped');

  eq({
    inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
    outboundWrites: REC.outWrites.length, staticMarkup: REC.mkp,
    generatedMarkup: REC.gen, outboundGenerated: REC.outGen.length,
  }, ZERO_DIRECTIONS,
  'six of the nine directions measure zero: no write in, none through, none out, and no markup either way');
  // The controls those zeros need, from regions where the answer differs.
  {
    const CANDLES = [75943, 80720];
    const cn = ALL_DECLS.filter((d) => d.start >= CANDLES[0] && d.end < CANDLES[1]).map((d) => d.name);
    let cp = 0;
    for (const n of cn) for (const at of refSites(MASKED, n).filter((i) => i < CANDLES[0] || i >= CANDLES[1])) {
      if (isPropertyWriteAt(MASKED, at, n)) cp++;
    }
    eq(cp, 4, 'control — the candle-fetch region takes FOUR writes through a name it owns');
    ok(refSites(STRINGS, 'rsApplyFilters').length > 0,
      'control — the literal view DOES find rsApplyFilters, so the generated-markup zero measures');
    const ticker = profile([688306, 695677]);
    eq(ticker.outGen.length, 4,
      'control — the ticker-search region generates markup naming FOUR names that stay behind, '
      + 'so the outbound-generated zero above is a measurement and not a `return 0`');
  }

  eq(REC.deps, MONOLITH_DEPENDENCIES, 'it names five things the monolith declares');
  {
    const moduleFns = functionBodyRanges(MODULE);
    const runtimeOnly = REC.deps.every((d) => refSites(MASKED_MODULE, d)
      .every((i) => moduleFns.some((r) => i >= r.start && i <= r.end)));
    ok(runtimeOnly, '…every one from inside a function body: runtime dependencies, not load-time ones');
  }

  eq(REC.sib, SIBLING_REFERENCES, 'exactly one sibling module names it');
  {
    const referrers = SIBLINGS.filter((s) => REC.names.some(
      (n) => !s.bound.has(n) && refSites(s.masked, n).length)).map((s) => s.rel);
    eq(referrers, [SIBLING_REFERRER], '…journal-trade-forms.js, calling _greeksMergeFromCache');
    const forms = SIBLINGS.find((s) => s.rel === SIBLING_REFERRER);
    const formsFns = functionBodyRanges(fs.readFileSync(path.join(ROOT, SIBLING_REFERRER), 'utf8'));
    ok(refSites(forms.masked, '_greeksMergeFromCache')
      .every((i) => formsFns.some((r) => i >= r.start && i <= r.end)),
    '…from inside a function, so load order does not matter even though that module loads FIRST');
  }
  eq(SIBLINGS.length, LOCAL_SCRIPT_COUNT - 1, 'there are seventy-three siblings to have named it');

  // THE NINTH: what this region names that had already left.
  eq(Array.from(new Set(REC.outModule.map(([n]) => n))), OUTBOUND_MODULE_NAMES,
    'it names exactly one thing a shipped module owns: buildStreamerSymbol');
  eq(REC.outModule.length, OUTBOUND_MODULE_EDGES, '…twice');
  eq(MODULE_OWNERS.get(OUTBOUND_MODULE_NAMES[0]), OUTBOUND_MODULE_OWNER, '…owned by js/utils/option-symbols.js');
  ok(REC.deps.indexOf(OUTBOUND_MODULE_NAMES[0]) < 0,
    '…and the monolith-dependency scan does NOT carry it, which is why the ninth direction exists');
  ok(LOCALS.indexOf(OUTBOUND_MODULE_OWNER) < LOCALS.indexOf(MODULE_REL),
    '…and that module loads BEFORE this one, so the call resolves however late it runs');
  {
    // The load-order claim rests on this being a CALL, not a load-time read —
    // the same thing §5 proves for the five monolith dependencies, and it has to
    // be proved for this one too rather than assumed from the pattern.
    const moduleFns = functionBodyRanges(MODULE);
    ok(refSites(MASKED_MODULE, OUTBOUND_MODULE_NAMES[0])
      .every((i) => moduleFns.some((r) => i >= r.start && i <= r.end)),
    '…and both its sites are inside a function body: a runtime call, never read at load');
  }
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
  ok(!(IDIOM_MIDDLE in ctx), '…nor is _buildRichSnapshot, which belongs to another layer');
  eq(typeof ctx._greeksMergeFromCache, 'function', 'the entry point the sibling module calls is there');
  eq(typeof ctx._logSnapshot, 'function', '…as is the one the three callers log through');

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
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(null, MODULE),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_BAD_INPUT', 'a non-string document is refused');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX, null),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_BAD_INPUT', '…and a non-string module');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX, MODULE.slice(0, -1)),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_MODULE_IDENTITY', 'a truncated module is refused');
  // WHICH GUARD CATCHES A RE-ABSORBED SEPARATOR, measured rather than assumed:
  // such a module is 10,795 units with 230 line feeds, so the SIZE guard fires
  // first and MODULE_SEPARATOR never sees it.
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX, MODULE + '\n'),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_MODULE_IDENTITY',
    'a module that re-absorbed the separator is caught by SIZE, not the separator clause');
  eq((MODULE + '\n').length, UNDO.MODULE_CHARS + 1, '…because it is one unit too long');
  eq(((MODULE + '\n').match(/\n/g) || []).length, UNDO.MODULE_LF + 1, '…and one line feed too many');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX, MODULE.slice(0, -2) + 'x\n'),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_MODULE_SEPARATOR', 'a module not ending `}\\n` is refused');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(BASE, MODULE),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_TAG_IDENTITY', 'an already-unextracted document is refused');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX.replace(TAG, TAG + TAG), MODULE),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_TAG_IDENTITY', 'a duplicated tag is refused');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_TAG_ADJACENCY', 'a reordered tag is refused');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX.replace(INLINE_OPEN, '<!-- x -->' + INLINE_OPEN), MODULE),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_TAG_ADJACENCY', 'content wedged between the tag and the monolith is refused');
  throwsWith(() => UNDO.undoJournalSnapshotHelpers(INDEX.replace('</body>', '<!-- foreign --></body>'), MODULE),
    'JOURNAL_SNAPSHOT_HELPERS_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  eq(UNDO.undoJournalSnapshotHelpers(INDEX, MODULE), BASE,
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
console.log('JOURNAL_SNAPSHOT_HELPERS_BOUNDARY_OK');
