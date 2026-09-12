'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// CHART INTERACTIONS — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #448 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/chart-interactions-undo.js
// reconstructs the pre-extraction document byte for byte, and §8 asserts the
// production footprint is index.html plus the one new file.
//
// WHAT MOVED. [164995,184045) in monolith coordinates — 19,050 units: the candle
// chart's whole interaction family. SEVENTEEN owners, twelve functions and five
// vars, 296 lines of code, zero top-level statements.
//
// ITS ENTIRE EXTERNAL COUPLING IS SIX CALL SITES INSIDE ONE FUNCTION. All six
// sit inside `_drawCandleChart`, which began at 184045 — exactly where this
// region ended. Nothing else in 1,445,194 units of monolith named any of the
// seventeen. The family names `_drawCandleChart` once in return, from inside
// `_chartRedraw`, at runtime. §5 measures both directions.
//
// WHY THE BOUNDARY IS HERE AND NOT AT THE NEXT BANNER — the reason this cycle
// is worth remembering. #448 measured three ends from the same start, and §4
// re-measures all three on the shipped tree rather than citing the audit:
//
//     end      units    seven   seam
//     166016    1,021       4   accepted
//     176824   11,829      16   REFUSED
//     184045   19,050       7   accepted   ← this one
//
// The middle end is under two-thirds the size and scores more than twice as
// much, because nine of its fifteen inbound edges are INTERNAL edges the cut
// exposes and this cut never creates: FIVE owners inside it are read by the drag
// code it leaves behind. `assertSeam` refuses it independently, on the
// structural separator. Size does not predict coupling, and the cheapest
// boundary is not the nearest one.
//
// THE HEAD BANNER NAMED SOMETHING IT DID NOT CONTAIN. It announces the
// crosshair / tooltip engine; the three functions under it are formatters, and
// `_chartDrawHover` — the engine — sat under the NEXT banner. CLAUDE.md records
// the opposite failure (journal-trade-detail spans a banner); this is the same
// rule from the other side, and §4 pins it so the pair stays measured.
//
// TWENTY-FIRST OF TWENTY-NINE BY SIZE. At 19,049 units this layer displaces no
// superlative — the vega monitor keeps smallest, the traffic light largest — so
// unlike #445 it re-pins nothing in any earlier contract. §4 measures the rank.
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
const UNDO = require('./lib/chart-interactions-undo.js');

const MODULE_REL = 'js/ui/chart-interactions.js';
const TAG = '<script src="./js/ui/chart-interactions.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/scanner-earnings-throttle.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '3508590';
const CONTRACT_REL = 'tests/chart-interactions-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/chart-interactions-undo.js';
const AUDIT_REL = 'tests/temporary-chart-interaction-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/chart-interaction-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/chart-interactions-contract.spec.js';

// Ratchet. The suite file count as it stands TODAY, not as it stood when this
// contract shipped: a Phase 1 audit adds its temporary file and advances this
// pin in every contract that carries it, and Phase 2 deletes that audit as the
// next contract arrives, leaving the count where it is.
const TEST_FILE_COUNT = 159;
const LOCAL_SCRIPT_COUNT = 73;
const MODULE_POSITION = 72;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 114158;
const CODE_CHARS = 1445194;
const RAW_AT_IN_CODE = 164995;
const RAW_END_IN_CODE = 184045;
const BODY_END_IN_CODE = 184044;
const TOP_LEVEL_BANNERS = 229;
const RESIDUAL_MONOLITH = 1426144;
const TAG_GAP = 165003;
const NET_REDUCTION = 18996;

// ── The seventeen owners ─────────────────────────────────────────────────────
const OWNERS_EXPECTED = [
  '_chartPad2', '_chartFmtDateTime', '_chartFmtVol',
  '_CHART_DEFAULT_VISIBLE', '_CHART_MIN_VISIBLE', '_CHART_RIGHT_PAD_SLOTS',
  '_chartXSpan', '_chartViewKey', '_chartResolveView', '_chartRedraw',
  '_chartClearHover', '_chartDrawHover',
  '_chartDragState', '_chartDragBound', '_chartEndDrag',
  '_chartEnsureDragDispatcher', '_chartBindInteractions',
];
const OWNER_COUNT = 17;
const FUNCTION_OWNERS = 12;
const VAR_OWNERS = 5;
const CODE_LINES = 296;
const BODY_ENDING = '}\n';

// ── Coupling, in all SEVEN directions ────────────────────────────────────────
const EXTERNAL_EDGES = 6;
const EDGE_SITES = [185490, 190278, 198935, 198965, 202147, 204246];
const NEIGHBOUR = '_drawCandleChart';
const NEIGHBOUR_AT = 184045;
const NEIGHBOUR_CHARS = 20282;
const DEPENDENCY_CALL_SITES = 1;
const INBOUND_WRITES = 0;
const INBOUND_PROPERTY_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = ['_drawCandleChart'];
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const GENERATED_MARKUP_REFERENCES = 0;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 17;

// ── The three ends, kept measured rather than remembered ─────────────────────
const NARROW_END = 166016;
const NARROW_UNITS = 1021;
const NARROW_SEVEN = 4;
const MID_END = 176824;
const MID_UNITS = 11829;
const MID_SEVEN = 16;
const MID_EXPOSED_EDGES = 9;
const MID_SEAM_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
const FULL_SEVEN = 7;
// Measured, not listed from memory: the first draft named the four functions
// that were salient and missed _CHART_MIN_VISIBLE, which the drag code reads too.
const SPLIT_BY_MID = ['_CHART_MIN_VISIBLE', '_chartXSpan', '_chartRedraw',
  '_chartClearHover', '_chartDrawHover'];
const HEAD_BANNER = '// ── Interactive crosshair / tooltip engine for _drawCandleChart ──────────────';
const ENGINE = '_chartDrawHover';
const ENGINE_CHARS = 5592;
const FORMATTERS_UNDER_HEAD_BANNER = 3;

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
  // Newest last: CHAIN is CHRONOLOGICAL, not sorted.
  MODULE_REL,
];
const CHAIN_LENGTH = 29;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const MODULE_SIZE_RANK = 21;
const LAYERS_ENDING_BRACE = 26;
// CHAIN-WIDE COUNTS LIVE IN THE NEWEST LAYER'S CONTRACT, and move forward with
// it each cycle, because the newest contract is the one that always carries a
// mutation spec and a chain-wide number nobody mutates is one nobody checks.
const LAYERS_WITH_SEPARATOR = 21;
const LAYERS_WITH_RAW_PAIR = 18;
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

console.log('CHART INTERACTIONS — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited #448 · base=' + BASE_SHA);

// A later layer landed, so it is peeled here, first — which is exactly what the
// previous version of this comment said would happen. INDEX below is therefore
// this layer's own extracted document, not the live one, and §8 keeps the two
// apart: the production footprint is measured against the LIVE tree.
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const JOURNAL_SNAPSHOT_HELPERS_U = require('./lib/journal-snapshot-helpers-undo.js');
const INDEX = JOURNAL_SNAPSHOT_HELPERS_U.isApplied(LIVE_INDEX)
  ? JOURNAL_SNAPSHOT_HELPERS_U.undoJournalSnapshotHelpers(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/journal-snapshot-helpers.js'), 'utf8'))
  : LIVE_INDEX;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// The BASE document, reached through the undo rather than re-read from git, so
// every coordinate below is proved by the reconstruction that shipped.
const BASE = UNDO.undoChartInteractions(INDEX, MODULE);
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
  return { rel, masked: maskLiterals(src), bound: locallyBound(src) };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');

// The seven-direction profile of a range of the BASE monolith.
function profile(range) {
  const names = ALL_DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0;
  const sites = [];
  for (const n of names) {
    for (const at of refSites(MASKED, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += refSites(STRINGS, n).filter(outside).length;
  }
  const outWrites = new Set(propertyWriteBases(bodyMasked).filter((b) => !nameSet.has(b) && BY_NAME.has(b)));
  const local = locallyBound(BASE_CODE.slice(range[0], range[1]));
  const deps = new Set();
  for (const d of ALL_DECLS) {
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

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,540,382 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,569,392 bytes');
  eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…26,714 line feeds');
  eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
  eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'seventy-three local scripts');
  eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last, at index 72 — the 73rd');
  eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
    '…immediately after the scanner-Earnings anchor and immediately before the inline monolith');
  eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, NET_REDUCTION,
    'the document lost 18,996 units: 19,050 of code out, 54 of tag in');

  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(BASE, fromGit, 'the undo reconstructs the base commit\'s index.html byte for byte');
  eq(sha256(BASE), UNDO.BASE_SHA256, '…and its digest');
  eq(BASE.length, UNDO.BASE_CHARS, '…and its length');
  ok(UNDO.isApplied(INDEX), 'the layer reads as applied on the shipped document');
  ok(!UNDO.isApplied(BASE), '…and not applied on the base it came from');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 19,049 units');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…19,795 bytes');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…392 line feeds');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and hashes to the digest audit #448 predicted');
  eq(MODULE, BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
    'it is the audited block\'s bytes, verbatim — not a re-indented copy');
  eq(MODULE + '\n', BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'body + one structural line feed IS the raw fragment');
  eq(MODULE.slice(-2), BODY_ENDING, 'it ends `}\\n`');
  ok(!MODULE.endsWith('\n\n'), '…and carries no trailing blank line: the separator stayed behind');
  eq(codeLines(MODULE), CODE_LINES, 'it carries 296 lines of code');
  eq(LIVE_CODE.length, RESIDUAL_MONOLITH, 'the residual monolith is 1,426,144 units');
  eq(BASE_CODE.length, CODE_CHARS, '…where the base carried 1,445,194');
  eq(BASE_CODE.length - LIVE_CODE.length, UNDO.RAW_CHARS,
    '…the difference being exactly the raw fragment');
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the base monolith starts at 114,158');
  eq(UNDO.RAW_AT - (INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length), TAG_GAP,
    'the anchor tag ends 165,003 units before the fragment began');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, BASE_CODE.indexOf('\n', RAW_AT_IN_CODE)), HEAD_BANNER,
    'the region opens on the crosshair banner — §4 shows the engine is not under it');
  ok(BASE_CODE[RAW_AT_IN_CODE - 1] === '\n', '…which begins a line');
  eq(BASE_CODE.slice(RAW_END_IN_CODE, BASE_CODE.indexOf('\n', RAW_END_IN_CODE)),
    'function _drawCandleChart(wrapId, candles, indicators, opts) {',
    'and it ends exactly where _drawCandleChart begins — the one neighbour it couples to');

  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd lands one unit short of that declaration');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  eq(topLevelBanners(BASE_CODE, FN_BODIES).length, TOP_LEVEL_BANNERS,
    'the base monolith carried the pinned number of top-level banner marks');
  const last = OWNERS[OWNERS.length - 1];
  eq(last.start + last.chars + 1, MODULE.length,
    'the last declaration runs to the body\'s final newline: no trailing IIFE, no trailing statement');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Three ends from one start — why this boundary, and where the chain sits');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares seventeen names at top level');
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, '…in this order');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, 'twelve are functions');
  eq(OWNERS.filter((d) => d.form === 'var').length, VAR_OWNERS, '…and five are vars');
  {
    const ch = Array.from(MODULE);
    for (const d of OWNERS) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
    eq(ch.join('').split('\n').filter((l) => !isBlankOrComment(l)).length, TOP_LEVEL_STATEMENT_LINES,
      'zero top-level statement lines: nothing outside the declarations');
  }

  // THE THREE ENDS, re-measured here rather than cited from the audit that is
  // deleted by this PR. This is the cycle's finding, so it keeps running.
  const narrow = profile([RAW_AT_IN_CODE, NARROW_END]);
  const mid = profile([RAW_AT_IN_CODE, MID_END]);
  const full = profile([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
  eq(NARROW_END - RAW_AT_IN_CODE, NARROW_UNITS, 'the narrow end is 1,021 units');
  eq(narrow.seven, NARROW_SEVEN, '…scoring 4');
  eq(MID_END - RAW_AT_IN_CODE, MID_UNITS, 'the middle end is 11,829 units');
  eq(mid.seven, MID_SEVEN, '…scoring SIXTEEN');
  eq(full.seven, FULL_SEVEN, 'and the full family, at 19,050 units, scores 7');
  ok(MID_UNITS < RAW_END_IN_CODE - RAW_AT_IN_CODE && mid.seven > full.seven,
    'the middle cut is SMALLER and scores HIGHER: size does not predict coupling');
  eq(mid.inbound - full.inbound, MID_EXPOSED_EDGES,
    '…by exactly nine edges, which the cut EXPOSES rather than finds');
  // DERIVED, not iterated. A loop over a pinned list runs one assertion per
  // element, so dropping an element simply runs one fewer — and passes. The
  // mutation pass caught exactly that here. The set is computed from the two
  // ranges and compared whole, which a dropped element cannot survive.
  const splitByMid = mid.names.filter((n) =>
    refSites(MASKED, n).some((i) => i >= MID_END && i < RAW_END_IN_CODE)).sort();
  eq(splitByMid, SPLIT_BY_MID.slice().sort(),
    'these FIVE owners are inside the middle cut AND called from the drag code it leaves behind');
  eq(splitByMid.length, SPLIT_BY_MID.length, '…five of them, which is what makes that cut worse');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, MID_END)),
    MID_SEAM_ERROR, 'and assertSeam refuses the middle boundary independently of any score');

  // THE BANNER NAMED SOMETHING IT DID NOT CONTAIN.
  const engine = BY_NAME.get(ENGINE);
  eq(engine.chars, ENGINE_CHARS, '_chartDrawHover — the engine the head banner names — is 5,592 units');
  ok(engine.start >= NARROW_END, '…and sat past the region under that banner, not inside it');
  eq(scanTopLevelDeclarations(BASE_CODE.slice(RAW_AT_IN_CODE, NARROW_END))
    .filter((d) => d.form === 'function').length, FORMATTERS_UNDER_HEAD_BANNER,
    '…which holds three formatters instead');
  ok(MARKS.indexOf(NARROW_END) >= 0, '…the engine living under the NEXT banner mark');

  // Measured over the WHOLE chain, not inferred from the layers nearest to hand.
  eq(CHAIN.length, CHAIN_LENGTH, 'twenty-nine layers ship today');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at 1,761 units');
  eq(bySize.findIndex((x) => x.rel === MODULE_REL) + 1, MODULE_SIZE_RANK,
    'this layer is TWENTY-FIRST of twenty-nine by size');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS, '…at 19,049 units');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS, 'the chain\'s largest is still 71,811');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[bySize.length - 1].units > UNDO.MODULE_CHARS,
    '…so this layer displaces no superlative, and re-pins no earlier contract');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\n`, this one among them — the counts are '
    + 'pinned above rather than spelled out here, which is how the suite-count messages '
    + 'drifted to four different wrong numbers before #448 repaired them');

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
    'every one of the twenty-nine resolves to exactly one undo helper by its own TAG');
  const withSeparator = forLayer.filter((M) => Object.prototype.hasOwnProperty.call(M, 'SEPARATOR'));
  eq(withSeparator.length, LAYERS_WITH_SEPARATOR,
    'twenty-one layers carry a SEPARATOR export, this one among them');
  eq(CHAIN_LENGTH - withSeparator.length, LAYERS_WITHOUT_SEPARATOR,
    '…and the eight oldest have no separator concept at all');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…but only eighteen of the twenty-one pin a single RAW_CHARS one unit longer than '
    + 'MODULE_CHARS, so the pair is not the tell the separator is');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling, in all seven directions — and it runs to ONE neighbour');
// ─────────────────────────────────────────────────────────────────────────────
{
  const names = OWNERS.map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < RAW_AT_IN_CODE || i >= RAW_END_IN_CODE;

  const sites = [];
  for (const n of names) for (const at of refSites(MASKED, n).filter(outside)) sites.push(at);
  sites.sort((a, b) => a - b);
  eq(sites, EDGE_SITES, 'SIX references reach in from the rest of the monolith');
  eq(sites.length, EXTERNAL_EDGES, '…exactly six');
  ok(sites.every(insideFunction), '…every one inside a function body, so none runs at load');

  // THE FACT THAT MADE THIS REGION WORTH TAKING WHOLE.
  const neighbour = BY_NAME.get(NEIGHBOUR);
  eq(neighbour.start, NEIGHBOUR_AT, '_drawCandleChart began at 184,045 — where this region ended');
  eq(neighbour.chars, NEIGHBOUR_CHARS, '…and ran 20,282 units');
  ok(sites.every((i) => i >= neighbour.start && i < neighbour.start + neighbour.chars),
    'ALL SIX sit inside that one function: nothing else in the monolith named the seventeen');

  let inWrites = 0, inPropWrites = 0;
  for (const n of names) for (const at of refSites(MASKED, n).filter(outside)) {
    if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
    if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
  }
  eq(inWrites, INBOUND_WRITES, 'nothing outside assigns TO a name this region owns');
  eq(inPropWrites, INBOUND_PROPERTY_WRITES, '…and nothing writes THROUGH one either');
  // The control the seventh direction needs, from a region where it differs.
  {
    const CANDLES = [75943, 80720];
    const cn = ALL_DECLS.filter((d) => d.start >= CANDLES[0] && d.end < CANDLES[1]).map((d) => d.name);
    let cp = 0;
    for (const n of cn) for (const at of refSites(MASKED, n).filter((i) => i < CANDLES[0] || i >= CANDLES[1])) {
      if (isPropertyWriteAt(MASKED, at, n)) cp++;
    }
    eq(cp, 4, 'control — the candle-fetch region takes FOUR writes through a name it owns, so the zero measures');
  }

  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  eq(outWrites.length, OUTBOUND_WRITES, 'it writes through no name it does not own');

  const local = locallyBound(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE));
  const deps = new Set();
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (refSites(bodyMasked, d.name).length) deps.add(d.name);
  }
  eq(Array.from(deps).sort(), MONOLITH_DEPENDENCIES,
    'it names exactly ONE thing the monolith declares — the same neighbour that calls it');

  const depSites = refSites(MASKED_MODULE, NEIGHBOUR);
  eq(depSites.length, DEPENDENCY_CALL_SITES, '…once');
  const moduleFns = functionBodyRanges(MODULE);
  ok(depSites.every((i) => moduleFns.some((r) => i >= r.start && i <= r.end)),
    '…from inside a function body, so it is a RUNTIME dependency, not a load-time one');

  let sib = 0;
  for (const n of names) for (const s of SIBLINGS) if (!s.bound.has(n)) sib += refSites(s.masked, n).length;
  eq(sib, SIBLING_REFERENCES, 'none of the seventy-two sibling modules names it');
  eq(SIBLINGS.length, LOCAL_SCRIPT_COUNT - 1, '…and there are seventy-two of them to have named it');

  let mkp = 0;
  for (const n of names) mkp += refSites(STATIC_MARKUP, n).length;
  eq(mkp, MARKUP_REFERENCES, 'static markup does not name it');
  let gen = 0;
  for (const n of names) gen += refSites(STRINGS, n).filter(outside).length;
  eq(gen, GENERATED_MARKUP_REFERENCES, 'and neither does markup the monolith generates at runtime');
  ok(refSites(STRINGS, 'rsApplyFilters').length > 0,
    'control — the literal view DOES find rsApplyFilters, so the zero above measures');
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
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining seventeen globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(), '…exactly its own owners');
  ok(!(NEIGHBOUR in ctx),
    '…and _drawCandleChart is NOT among them: the dependency is called, never defined');
  eq(typeof ctx._chartBindInteractions, 'function', 'the entry point is there');
  eq(ctx._chartDragState, null, 'the drag state starts idle');
  eq(ctx._chartPad2(7), '07', 'a formatter works standalone');
  eq(ctx._chartFmtVol(1500), '1.5K', '…and so does the volume formatter');

  const watched = [];
  const ctx2 = {
    fetch: () => { watched.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.push('setInterval'); },
    setTimeout: () => { watched.push('setTimeout'); },
    document: { getElementById: () => { watched.push('document'); return null; },
      addEventListener: () => { watched.push('doc.addEventListener'); } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
  };
  vm.createContext(ctx2);
  vm.runInContext(MODULE, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer and binds no listener');
  ok(!/\bnew\s+WebSocket\b/.test(MASKED_MODULE), '…and opens no socket');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  throwsWith(() => UNDO.undoChartInteractions(null, MODULE),
    'CHART_INTERACTIONS_UNDO_BAD_INPUT', 'a non-string document is refused');
  throwsWith(() => UNDO.undoChartInteractions(INDEX, null),
    'CHART_INTERACTIONS_UNDO_BAD_INPUT', '…and a non-string module');
  throwsWith(() => UNDO.undoChartInteractions(INDEX, MODULE.slice(0, -1)),
    'CHART_INTERACTIONS_UNDO_MODULE_IDENTITY', 'a truncated module is refused');
  // WHICH GUARD CATCHES A RE-ABSORBED SEPARATOR, measured rather than assumed:
  // such a module is 19,050 units with 393 line feeds, so the SIZE guard fires
  // first and MODULE_SEPARATOR never sees it.
  throwsWith(() => UNDO.undoChartInteractions(INDEX, MODULE + '\n'),
    'CHART_INTERACTIONS_UNDO_MODULE_IDENTITY',
    'a module that re-absorbed the separator is caught by SIZE, not the separator clause');
  eq((MODULE + '\n').length, UNDO.MODULE_CHARS + 1, '…because it is one unit too long');
  eq(((MODULE + '\n').match(/\n/g) || []).length, UNDO.MODULE_LF + 1, '…and one line feed too many');
  throwsWith(() => UNDO.undoChartInteractions(INDEX, MODULE.slice(0, -2) + 'x\n'),
    'CHART_INTERACTIONS_UNDO_MODULE_SEPARATOR', 'a module not ending `}\\n` is refused');
  throwsWith(() => UNDO.undoChartInteractions(BASE, MODULE),
    'CHART_INTERACTIONS_UNDO_TAG_IDENTITY', 'an already-unextracted document is refused');
  throwsWith(() => UNDO.undoChartInteractions(INDEX.replace(TAG, TAG + TAG), MODULE),
    'CHART_INTERACTIONS_UNDO_TAG_IDENTITY', 'a duplicated tag is refused');
  throwsWith(() => UNDO.undoChartInteractions(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    'CHART_INTERACTIONS_UNDO_TAG_ADJACENCY', 'a reordered tag is refused');
  throwsWith(() => UNDO.undoChartInteractions(INDEX.replace(INLINE_OPEN, '<!-- x -->' + INLINE_OPEN), MODULE),
    'CHART_INTERACTIONS_UNDO_TAG_ADJACENCY', 'content wedged between the tag and the monolith is refused');
  throwsWith(() => UNDO.undoChartInteractions(INDEX.replace('</body>', '<!-- foreign --></body>'), MODULE),
    'CHART_INTERACTIONS_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  eq(UNDO.undoChartInteractions(INDEX, MODULE), BASE,
    'and the accepted path reconstructs the base exactly');
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
    ['index.html', MODULE_REL, 'js/services/journal-snapshot-helpers.js'].sort(),
    'production footprint is index.html, this module, and every layer cut after it');
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
    rel === 'js/services/journal-snapshot-helpers.js' ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
    'every other changed path is a test artifact');
}

console.log('\n' + pass + ' assertions passed.');
console.log('CHART_INTERACTIONS_BOUNDARY_OK');
