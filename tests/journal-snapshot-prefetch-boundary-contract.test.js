'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL SNAPSHOT PREFETCH — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #435 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/journal-snapshot-prefetch-undo.js
// reconstructs the pre-extraction document byte for byte. §8 runs that round
// trip and §9 exercises every documented failure.
//
// THE OUTBOUND SHAPE IS NOT THE PREVIOUS LAYERS', and carrying their phrasing
// over would have been FALSE. js/services/journal-rich-snapshot.js writes two
// keys and nothing else, so "all outbound writes are by key" was true there.
// Here §5 measures three property writes on `S`: TWO keyed, and ONE dotted —
// `if (!S.greeksCache) S.greeksCache = {};`, a GUARDED LAZY INIT.
//
// That guard is measured by its whole LINE, not by a substring of the
// assignment. Audit #435 first asserted it with `indexOf(…)` on the guarded
// string, and mutation showed the UNGUARDED form `S.greeksCache = {};` passed
// too — a substring of it — so the assertion could not tell a guard from a
// reset, which was its entire purpose. §5 now pins the line and controls on the
// unguarded form; §5b drives the behaviour: with no cache the guard creates
// one, with entries present they are PRESERVED.
//
// COUPLING, AND WHY THE INBOUND ZERO IS NOT ENOUGH. Two external edges, one per
// owner, both inside function bodies — call time. Zero markup references. Zero
// inbound writes, which is VACUOUS: the module owns no binding for anything to
// write. That vacuity is exactly why the outbound direction is measured
// separately, and there the answer is three.
//
// WHAT IT WAS CHOSEN OVER, kept executable in §7 now that the audit is deleted:
// the Journal snapshot helper at six crossings against this region's five —
// the same figure #431 recorded for it, in a third set of base coordinates.
//
// AND THE REJECTION #435 MADE, which is the part most at risk of being redone.
// The FF_BACKEND_CANDLES_SCANNER_CHARTS helper carries the IDENTICAL debug-block
// shape as the region #434 extracted, so the narrow-cut judgement looked
// transferable. §7 pins that `assertSeam` REFUSES that narrow boundary, and
// that the region's 53-crossing score does not describe a feature at all:
// eleven unrelated owners, of which `escHtml` — 134 units — contributes forty
// of the fifty edges. A screen score ranks REGIONS; it does not describe the
// feature inside one.
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
const { isBlankOrComment, snapBodyEnd, assertSeam, bindingNames, evaluationTimeReads,
  topLevelBanners } = require('./lib/extraction-boundary.js');
const UNDO = require('./lib/journal-snapshot-prefetch-undo.js');

const MODULE_REL = 'js/services/journal-snapshot-prefetch.js';
const TAG = '<script src="./js/services/journal-snapshot-prefetch.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-backend-candles.js"></script>\n';
const INLINE_OPEN = '<script>';

const BASE_SHA = '1fa523ea2e2b116248bcc3e08e095b5dd9cdb6df';
// Ratchet. The suite file count as it stands TODAY, not as it stood when this
// contract shipped: a Phase 1 audit adds its temporary file and advances this
// pin in every contract that carries it, and Phase 2 deletes that audit as the
// next contract arrives, leaving the count where it is.
const TEST_FILE_COUNT = 158;
const LOCAL_SCRIPT_COUNT = 67;
const AUDIT_REL = 'tests/temporary-journal-snapshot-prefetch-boundary-audit.test.js';

// Where the block sat in the monolith it was cut from.
const CODE_AT = 113773;
const RAW_AT_IN_CODE = 1267671;
const RAW_END_IN_CODE = 1278340;
const BODY_END_IN_CODE = 1278339;

const OWNERS_EXPECTED = [
  { name: '_prefetchDXLinkForSnapshot', chars: 5153, start: 489 },
  { name: 'prefetchJournalSnapshotFromBackendDxlink', chars: 5023, start: 5644 },
];
const OWNER_COUNT = 2;

const EXTERNAL_EDGES = { _prefetchDXLinkForSnapshot: 1, prefetchJournalSnapshotFromBackendDxlink: 1 };
const EXTERNAL_EDGE_TOTAL = 2;
const MARKUP_REFERENCES = 0;
const OUTBOUND_BINDING = 'S';
const OUTBOUND_WRITES = 3;
const OUTBOUND_KEYED = 2;
const OUTBOUND_LAZY_INIT = 'if (!S.greeksCache) S.greeksCache = {};';
const TOP_LEVEL_STATEMENT_LINES = 0;

const MONOLITH_DEPENDENCIES = ['S', '_saveGreeksCache', 'fetchBackendOptionLive', 'fetchLiveQuote',
  'getPreferredOptionDxlinkSymbol', 'subscribeBackendOptionLive', 'subscribeDxlinkQuotes'];
const SIBLING_DEPENDENCIES = { 'js/api/backend-client.js': ['ttCall'] };
const SIBLING_POSITIONS = { 'js/api/backend-client.js': 4 };
const VM_GLOBALS = 2;
const SUMMARY_SOURCE = 'BACKEND_DXLINK_PREFETCH';

// What it was chosen over, and the rejection, in BASE monolith coordinates.
const HELPER = [1254714, 1265508];
const HELPER_CROSSINGS = 6;
const SCANNER_REGION = [1442181, 1478573];
const SCANNER_OWNERS = 11;
const SCANNER_EDGES = 50;
const SCANNER_CROSSINGS = 53;
const SCANNER_NARROW_OWNER = '_scannerFetchBackendCandlesForChart';
const SCANNER_NARROW_OWNER_END = 1453624;
const SCANNER_NARROW_SEAM_ERROR = 'EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED';
const SCANNER_TOP_EDGE_NAME = 'escHtml';
const SCANNER_TOP_EDGE_COUNT = 40;
const SCANNER_TOP_EDGE_CHARS = 134;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = []; let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function lexicalViews(src) {
  const masked = maskLiterals(src);
  const noComments = stripComments(src);
  const build = (keep) => { const o = new Array(src.length);
    for (let i = 0; i < src.length; i++) o[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return o.join(''); };
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
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('JOURNAL SNAPSHOT PREFETCH — PERMANENT BOUNDARY CONTRACT');

// The portfolio DXLink greeks pair was cut AFTER this layer, so the live
// document is no longer the one this contract shipped. Peel it first; its helper
// re-verifies its own output by length and SHA-256, so the hop is proved rather
// than assumed.
// The strategy templates were cut AFTER the portfolio DXLink greeks pair, so
// they are the newest layer of all: peel them FIRST.
// The vega monitor ratios were cut AFTER the strategy templates, so they are
// the newest layer of all: peel them FIRST.
const JOURNAL_SNAPSHOT_HELPERS_U = require('./lib/journal-snapshot-helpers-undo.js');
const CHART_INTERACTIONS_U = require('./lib/chart-interactions-undo.js');
const SCANNER_EARNINGS_U = require('./lib/scanner-earnings-throttle-undo.js');
const SCANNER_IVR_U = require('./lib/scanner-ivr-throttle-undo.js');
const VEGA_MONITOR_U = require('./lib/vega-monitor-undo.js');
const STRATEGY_TEMPLATES_U = require('./lib/strategy-templates-undo.js');
const DXLINK_GREEKS_U = require('./lib/portfolio-dxlink-greeks-undo.js');
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const PRE_JOURNAL_SNAPSHOT_HELPERS = JOURNAL_SNAPSHOT_HELPERS_U.isApplied(LIVE_INDEX)
  ? JOURNAL_SNAPSHOT_HELPERS_U.undoJournalSnapshotHelpers(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/journal-snapshot-helpers.js'), 'utf8'))
  : LIVE_INDEX;
const PRE_CHART_INTERACTIONS = CHART_INTERACTIONS_U.isApplied(PRE_JOURNAL_SNAPSHOT_HELPERS)
  ? CHART_INTERACTIONS_U.undoChartInteractions(
      PRE_JOURNAL_SNAPSHOT_HELPERS, fs.readFileSync(path.join(ROOT, 'js/ui/chart-interactions.js'), 'utf8'))
  : PRE_JOURNAL_SNAPSHOT_HELPERS;
const PRE_SCANNER_EARNINGS = SCANNER_EARNINGS_U.isApplied(PRE_CHART_INTERACTIONS)
  ? SCANNER_EARNINGS_U.undoScannerEarningsThrottle(
      PRE_CHART_INTERACTIONS, fs.readFileSync(path.join(ROOT, 'js/services/scanner-earnings-throttle.js'), 'utf8'))
  : PRE_CHART_INTERACTIONS;
const PRE_SCANNER_IVR = SCANNER_IVR_U.isApplied(PRE_SCANNER_EARNINGS)
  ? SCANNER_IVR_U.undoScannerIvrThrottle(
      PRE_SCANNER_EARNINGS, fs.readFileSync(path.join(ROOT, 'js/services/scanner-ivr-throttle.js'), 'utf8'))
  : PRE_SCANNER_EARNINGS;
const PRE_VEGA_MONITOR = VEGA_MONITOR_U.isApplied(PRE_SCANNER_IVR)
  ? VEGA_MONITOR_U.undoVegaMonitor(
      PRE_SCANNER_IVR, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-vega-monitor.js'), 'utf8'))
  : PRE_SCANNER_IVR;
const PRE_STRATEGY_TEMPLATES = STRATEGY_TEMPLATES_U.isApplied(PRE_VEGA_MONITOR)
  ? STRATEGY_TEMPLATES_U.undoStrategyTemplates(
      PRE_VEGA_MONITOR, fs.readFileSync(path.join(ROOT, 'js/config/strategy-templates.js'), 'utf8'))
  : PRE_VEGA_MONITOR;
const INDEX = DXLINK_GREEKS_U.isApplied(PRE_STRATEGY_TEMPLATES)
  ? DXLINK_GREEKS_U.undoPortfolioDxlinkGreeks(
      PRE_STRATEGY_TEMPLATES, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-dxlink-greeks.js'), 'utf8'))
  : PRE_STRATEGY_TEMPLATES;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const OWNERS = scanTopLevelDeclarations(MODULE);
const OWNED = new Set(OWNERS.map((d) => d.name));
// The reconstructed base, used wherever a measurement needs the pre-cut offsets.
const BASE = UNDO.undoJournalSnapshotPrefetch(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const BASE_FN_BODIES = functionBodyRanges(BASE_CODE);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document and the module');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is the extracted document');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…and by UTF-8 byte length');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 10,668 units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…and by UTF-8 byte length');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-seven local application scripts');
eq(LOCALS[LOCALS.length - 1], MODULE_REL, '…and this module is the LAST of them');
eq(UNDO.EXTRACTED_LOCAL_SCRIPTS, LOCAL_SCRIPT_COUNT, 'the undo helper pins the extracted script count');
eq(UNDO.BASE_LOCAL_SCRIPTS + 1, UNDO.EXTRACTED_LOCAL_SCRIPTS, '…exactly one more than the base');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is ' + TEST_FILE_COUNT + ' test files — the audit is replaced one for one');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)), '…and the temporary audit is gone');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The tag, and where it loads');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(INDEX, TAG), 1, 'exactly one tag for this module');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG), 1, '…immediately after the previous layer');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1, '…and immediately before the inline monolith');
eq(TAG, '<script src="./' + MODULE_REL + '"></script>\n', 'the tag names exactly this module path');
ok(/^<script src="\.\/[a-z0-9/.-]+"><\/script>\n$/.test(TAG), 'the tag is a plain classic script');
eq(/\b(?:async|defer|type=)/.test(TAG), false, '…with no async, defer or type attribute');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The module is the block’s bytes, and the seam is the audited one');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the monolith sat at the pinned offset in the base');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MODULE,
    'the module is EXACTLY the bytes that were at [1267671,1278339)');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + '\n',
    '…and the raw block is that body plus one LF');

  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd reproduces the body end');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary and resumes at the next feature');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  const marks = topLevelBanners(BASE_CODE, BASE_FN_BODIES);
  ok(marks.indexOf(RAW_AT_IN_CODE) >= 0, 'the region opens on a top-level banner');
  ok(marks.indexOf(RAW_END_IN_CODE) >= 0, '…and its seam is another');
  ok(MODULE.slice(0, 100).indexOf('Targeted DXLink fetch') > 0, 'the module opens on its own banner');

  eq(MODULE.slice(-2), '}\n', 'the module ends on a closing brace and a newline');
  eq(MODULE.endsWith('\n\n'), false, '…and not on a blank line');
  eq(isBlankOrComment(MODULE.slice(MODULE.lastIndexOf('\n', MODULE.length - 2) + 1)), false,
    '…its last line carries code');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Two async owners, and nothing else');
// ─────────────────────────────────────────────────────────────────────────────
eq(OWNERS.length, OWNER_COUNT, 'the module declares exactly two names at top level');
eq(OWNERS.map((d) => ({ name: d.name, chars: d.chars, start: d.start })), OWNERS_EXPECTED,
  '…at their pinned spans');
eq(OWNERS.every((d) => d.isAsync), true, 'both are async');
eq(OWNERS.every((d) => d.form === 'function'), true, '…both function declarations, no bindings');
eq(bindingNames(OWNERS), [], 'the module owns no binding at all');
eq(OWNERS[0].start + OWNERS[0].chars + 2, OWNERS[1].start,
  'one blank line separates the two declarations');
eq(OWNERS[1].start + OWNERS[1].chars + 1, UNDO.MODULE_CHARS,
  'banner + both declarations + the trailing newline is the whole module');
for (const d of OWNERS) eq(CODE.indexOf('function ' + d.name + '('), -1, d.name + ' is no longer declared inline');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling in both directions — and the OUTBOUND SHAPE');
// ─────────────────────────────────────────────────────────────────────────────
{
  const view = lexicalViews(CODE);
  const edges = {};
  let total = 0;
  for (const n of OWNED) {
    for (const p of refSites(view.code, n)) { edges[n] = (edges[n] || 0) + 1; total++; }
  }
  eq(edges, EXTERNAL_EDGES, 'two references remain inline, one per owner');
  eq(total, EXTERNAL_EDGE_TOTAL, '…matching what the audit predicted');
  const liveBodies = functionBodyRanges(CODE);
  const inFn = (i) => liveBodies.some((r) => i >= r.start && i <= r.end);
  const sites = [];
  for (const n of OWNED) for (const p of refSites(view.code, n)) sites.push(p);
  eq(sites.filter((p) => inFn(p)).length, EXTERNAL_EDGE_TOTAL, 'both sit inside a function body — call time');
  ok(liveBodies.length > 100, 'control — the function-body index is populated, so that is a measurement');

  let markup = 0;
  for (const n of OWNED) markup += refSites(view.strings, n).length;
  eq(markup, MARKUP_REFERENCES, 'no owner is named inside a string the monolith builds');
  ok(refSites(view.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x.k = 1;', 0, 'x'), true, 'control — a dotted assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');

  eq(bindingNames(OWNERS).length, 0, 'the module owns no binding, so inbound is vacuous');
  let inbound = 0;
  for (const n of bindingNames(OWNERS)) {
    for (const p of refSites(view.code, n)) if (isWriteAt(view.code, p, n)) inbound++;
  }
  eq(inbound, 0, '…and the count over an empty set is zero');

  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S');
  ok(monolithBindings.size > 200, '…and is the whole set, not an empty one');
  const moduleMasked = maskLiterals(MODULE);
  const outbound = {};
  let outboundTotal = 0;
  for (const n of monolithBindings) {
    if (OWNED.has(n)) continue;
    for (const p of refSites(moduleMasked, n)) {
      if (isWriteAt(moduleMasked, p, n)) { outbound[n] = (outbound[n] || 0) + 1; outboundTotal++; }
    }
  }
  eq(Object.keys(outbound), [OUTBOUND_BINDING], 'it writes exactly ONE binding it does not own');
  eq(outboundTotal, OUTBOUND_WRITES, '…three times');

  // "All by key" was true of the rich-snapshot layer and is FALSE here.
  const writes = refSites(moduleMasked, OUTBOUND_BINDING)
    .filter((p) => isWriteAt(moduleMasked, p, OUTBOUND_BINDING));
  const keyed = writes.filter((p) => /^S\.greeksCache\[/.test(MODULE.slice(p, p + 20)));
  const dotted = writes.filter((p) => /^S\.greeksCache =/.test(MODULE.slice(p, p + 20)));
  eq(keyed.length, OUTBOUND_KEYED, 'TWO of the three are keyed writes into the cache');
  eq(dotted.length, 1, '…and ONE is dotted, so "all by key" would be false here');

  // The guard is measured by its whole LINE. A substring match on the guarded
  // string also passes the UNGUARDED form — that was #435's mutation survivor,
  // and it defeated the only assertion that distinguished a guard from a reset.
  {
    const line = MODULE.slice(MODULE.lastIndexOf('\n', dotted[0]) + 1,
                              MODULE.indexOf('\n', dotted[0])).trim();
    eq(line, OUTBOUND_LAZY_INIT, 'the dotted write’s whole LINE is the guarded lazy init');
    ok(/^if \(!S\.greeksCache\)/.test(line), '…so it cannot run when a cache already exists');
    eq(/^if \(!S\.greeksCache\)/.test('S.greeksCache = {};'), false,
      'control — the unguarded form fails that test, which a substring match did not');
    ok('S.greeksCache = {};'.length < OUTBOUND_LAZY_INIT.length &&
       OUTBOUND_LAZY_INIT.indexOf('S.greeksCache = {};') > 0,
      '…and it IS a substring of the guarded form, which is why the old assertion passed');
  }
  eq(/(^|[^.\w$])S\s*=[^=]/.test(moduleMasked), false,
    'and `S` itself is NEVER rebound — every write is a property write');
  eq(scanTopLevelDeclarations(CODE).filter((d) => d.name === 'S')[0].form, 'const',
    'control — S is a const, so a rebinding could not have been written anyway');

  eq(statementLines(MODULE, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'the module is two declarations and nothing else — zero top-level statement lines');
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 0,
    'control — the same counter finds statements in the monolith as a whole');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependencies, and the load order that makes them safe');
// ─────────────────────────────────────────────────────────────────────────────
{
  const monolith = new Map(scanTopLevelDeclarations(CODE).map((d) => [d.name, d.form]));
  const masked = maskLiterals(MODULE);
  const referenced = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) if (!OWNED.has(m[2])) referenced.add(m[2]);
  eq(Array.from(referenced).filter((n) => monolith.has(n)).sort(), MONOLITH_DEPENDENCIES,
    'it depends on exactly these seven monolith names');
  eq(monolith.get('S'), 'const', 'S among them is the const no module can supply');

  const spans = OWNERS.map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of MONOLITH_DEPENDENCIES) for (const p of refSites(masked, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'not one of them is read at evaluation time');

  const fromModules = {};
  for (const rel of LOCALS) {
    if (rel === MODULE_REL) continue;
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on one name from one sibling module');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < LOCAL_SCRIPT_COUNT, '…which is before this module');
  }
  eq(LOCALS.indexOf(MODULE_REL) + 1, LOCAL_SCRIPT_COUNT, 'and this module 67th — after it');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. What it was chosen over, and the rejection #435 made');
// ─────────────────────────────────────────────────────────────────────────────
{
  const view = lexicalViews(BASE_CODE);
  const baseBindings = new Set(bindingNames(scanTopLevelDeclarations(BASE_CODE)));
  function measure(at, end) {
    const ds = scanTopLevelDeclarations(BASE_CODE.slice(at, end));
    const names = new Set(ds.map((d) => d.name));
    const per = {};
    let edges = 0;
    for (const n of names) {
      for (const p of refSites(view.code, n)) if (p < at || p >= end) { per[n] = (per[n] || 0) + 1; edges++; }
    }
    const bm = view.code.slice(at, end);
    let out = 0;
    for (const n of baseBindings) {
      if (names.has(n)) continue;
      for (const p of refSites(bm, n)) if (isWriteAt(bm, p, n)) out++;
    }
    return { owners: ds.length, per, edges, out, crossings: edges + out };
  }
  eq(measure(RAW_AT_IN_CODE, BODY_END_IN_CODE).crossings, EXTERNAL_EDGE_TOTAL + OUTBOUND_WRITES,
    'the region that shipped costs FIVE crossings');

  // Anchored to real marks: an unanchored range survived mutation in #429–#435.
  const marks = topLevelBanners(BASE_CODE, BASE_FN_BODIES);
  ok(marks.indexOf(HELPER[0]) >= 0, 'the snapshot helper opens on a real top-level banner');
  ok(marks.indexOf(HELPER[1] + 1) >= 0, '…and its seam is the banner one unit past its end');
  eq(snapBodyEnd(BASE_CODE, HELPER[0], HELPER[1] + 1), HELPER[1], '…so snapBodyEnd reproduces that end');
  eq(measure(HELPER[0], HELPER[1]).crossings, HELPER_CROSSINGS,
    'the Journal snapshot helper costs six, as #431 and #435 both recorded');

  // THE REJECTION. The sibling helper carries the same debug-block shape as the
  // region #434 extracted, so the narrow-cut judgement looked transferable.
  ok(marks.indexOf(SCANNER_REGION[0]) >= 0, 'the scanner region opens on a real banner');
  ok(marks.indexOf(SCANNER_REGION[1] + 1) >= 0, '…and its seam is the banner one past its end');
  const scanner = measure(SCANNER_REGION[0], SCANNER_REGION[1]);
  eq(scanner.owners, SCANNER_OWNERS, 'the scanner banner region holds ELEVEN owners');
  eq(scanner.edges, SCANNER_EDGES, '…and fifty external edges');
  {
    const owner = scanTopLevelDeclarations(BASE_CODE.slice(SCANNER_REGION[0], SCANNER_REGION[1]))
      .filter((d) => d.name === SCANNER_NARROW_OWNER)[0];
    ok(owner, 'the scanner fetch owner is found inside that region');
    const end = SCANNER_REGION[0] + owner.start + owner.chars;
    eq(end, SCANNER_NARROW_OWNER_END, 'its declaration ends at the pinned offset');
    throwsWith(() => assertSeam(BASE_CODE, SCANNER_REGION[0], snapBodyEnd(BASE_CODE, SCANNER_REGION[0], end + 2)),
      SCANNER_NARROW_SEAM_ERROR,
      'and assertSeam REFUSES the narrow cut — the shape transferred, the cut did not');
  }

  // THE SCREEN'S OWN LIMIT: 53 does not describe a feature. The 53 is pinned
  // here and not only narrated, because it is the number the header quotes.
  eq(scanner.crossings, SCANNER_CROSSINGS, 'the region scores 53 crossings on the screen');
  eq(scanner.edges, SCANNER_EDGES, '…of which fifty are inbound edges');
  eq(scanner.per[SCANNER_TOP_EDGE_NAME], SCANNER_TOP_EDGE_COUNT,
    'escHtml alone contributes FORTY of the region’s fifty edges');
  const esc = scanTopLevelDeclarations(BASE_CODE.slice(SCANNER_REGION[0], SCANNER_REGION[1]))
    .filter((d) => d.name === SCANNER_TOP_EDGE_NAME)[0];
  eq(esc.chars, SCANNER_TOP_EDGE_CHARS, '…and it is 134 units — a shared escaper, not the feature');
  ok(Object.keys(scanner.per).length < scanner.owners,
    'most of the eleven owners have NO external edge, which the region score hides');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads bare, and the byte-exact round trip');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(MODULE, OWNERS, maskLiterals), [],
    'NOTHING is read at evaluation time — the list is empty');
  const probe = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals),
    ['elsewhere', 'window'], 'control — a region that reads a foreign name at load reports it');
  const bare = {};
  vm.createContext(bare);
  vm.runInContext(MODULE, bare, { filename: MODULE_REL });
  eq(Object.keys(bare).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(bare).sort(), OWNERS_EXPECTED.map((o) => o.name).sort(), '…defining exactly its two owners');
  eq(Object.keys(bare).every((k) => bare[k].constructor.name === 'AsyncFunction'), true, '…both async');

  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, UNDO.BASE_CHARS, 'the base document is the pinned length');
  eq(sha256(fromGit), UNDO.BASE_SHA256, '…and the pinned hash');
  eq(APP_LOADER.parseScriptTags(fromGit).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying sixty-six local scripts');
  // BASE_SHA must name THIS layer's base, not merely SOME commit with the same
  // index.html: the audit PR changed only tests/, so its parent is byte-identical.
  const has = (rev, rel) => {
    try {
      execFileSync('git', ['cat-file', '-e', rev + ':' + rel],
        { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
      return true;
    } catch (e) { return false; }
  };
  eq(has(BASE_SHA, AUDIT_REL), true, 'the pinned base is the commit that carried the temporary audit');
  eq(has(BASE_SHA + '^', AUDIT_REL), false, 'control — its parent does not, so the pin distinguishes them');
  eq(git(['show', BASE_SHA + '^:index.html']), fromGit,
    '…even though that parent has a byte-identical index.html, which is why the control is needed');

  eq(UNDO.isApplied(INDEX), true, 'the live document carries this layer');
  eq(UNDO.isApplied(fromGit), false, '…and the base does not');
  eq(BASE, fromGit, 'the undo reconstructs the base BYTE FOR BYTE');
  eq(fromGit.slice(UNDO.RAW_AT, UNDO.RAW_END), MODULE + UNDO.SEPARATOR,
    '…and the raw range it puts back is the module plus its separator');
  eq(UNDO.SEPARATOR_AT, UNDO.RAW_END - 1, 'the separator is the LAST unit of the raw range');
  eq(fromGit[UNDO.SEPARATOR_AT], '\n', '…and it is a newline in the base document');
  eq(fromGit.slice(UNDO.RAW_AT, UNDO.SEPARATOR_AT), MODULE, '…so the body is everything before it');
  eq(UNDO.RAW_AT, CODE_AT + RAW_AT_IN_CODE,
    'the document offset is the monolith offset plus where the monolith starts');
  eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, UNDO.RAW_CHARS - TAG.length,
    'the arithmetic closes: 10,669 units out, 67 in');
  eq(sha256(fromGit.slice(UNDO.RAW_AT, UNDO.RAW_END)), UNDO.RAW_SHA256, 'the raw block hashes to its pin');
}

// The behavioural half runs asynchronously; assertions are counted the same way.
const behaviour = (async () => {
  section('8b. The guarded lazy init, driven rather than described');
  const load = (S) => {
    const h = {
      console: { log() {}, warn() {}, error() {} }, S,
      ttCall: async () => null, fetchLiveQuote: async () => null,
      fetchBackendOptionLive: async () => null,
      subscribeDxlinkQuotes: () => {}, subscribeBackendOptionLive: () => {},
      getPreferredOptionDxlinkSymbol: () => null, _saveGreeksCache: () => {},
      Date, Math, JSON, Object, Array, Promise, String, Number, isNaN, parseFloat,
      setTimeout, clearTimeout,
    };
    vm.createContext(h);
    vm.runInContext(MODULE, h, { filename: MODULE_REL });
    return h;
  };
  const OWNER = 'prefetchJournalSnapshotFromBackendDxlink';

  // Every dependency resolves at CALL time: the empty VM loads it, and only
  // calling it fails.
  const empty = {};
  vm.createContext(empty);
  vm.runInContext(MODULE, empty, { filename: MODULE_REL });
  const rejected = await empty[OWNER]('SPY', []).then(() => null, (e) => e);
  // Not `instanceof`: the error is constructed inside the VM, so a cross-realm
  // instanceof is false even for exactly the expected error.
  eq(rejected.constructor.name, 'ReferenceError',
    'calling it in the empty VM REJECTS — it does not fail at load');
  eq(rejected.message, 'S is not defined', '…naming the monolith const it reaches first');

  const fresh = load({ ttSessionId: null });
  eq(fresh.S.greeksCache, undefined, 'control — the host starts with no greeks cache');
  const summary = await fresh[OWNER]('SPY', []);
  eq(typeof fresh.S.greeksCache, 'object', 'the guarded lazy init creates one');
  eq(summary.source, SUMMARY_SOURCE, '…and the call returns its own summary shape');
  eq(summary.ticker, 'SPY', '…carrying the ticker it was given');

  // The assertion that separates a lazy init from a reset. No static read of
  // the source distinguishes them as plainly, which is why it is driven.
  const warm = load({ ttSessionId: null, greeksCache: { AAPL: { keep: 1 } } });
  await warm[OWNER]('SPY', []);
  eq(warm.S.greeksCache.AAPL, { keep: 1 }, 'a pre-existing cache entry is PRESERVED, not reset');
})();

// ─────────────────────────────────────────────────────────────────────────────
section('9. Every documented failure, by its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const P = 'JOURNAL_SNAPSHOT_PREFETCH_UNDO_';
  const undo = UNDO.undoJournalSnapshotPrefetch;
  throwsWith(() => undo(null, MODULE), P + 'BAD_INPUT', 'a non-string document');
  throwsWith(() => undo(INDEX, null), P + 'BAD_INPUT', 'a non-string module');
  throwsWith(() => undo(INDEX, MODULE.slice(0, -1)), P + 'MODULE_IDENTITY', 'a truncated module');
  throwsWith(() => undo(INDEX, MODULE + '\n'),
    P + 'MODULE_IDENTITY', 'a module that absorbed the separator is caught by size');
  throwsWith(() => undo(INDEX, MODULE.slice(0, -2) + '\n}'),
    P + 'MODULE_SEPARATOR', 'a module whose final newline moved');
  // Isolates the HASH guard: same length, same bytes, same line count.
  const sameSize = MODULE.replace('getPreferredOptionDxlinkSymbol', 'getPreferredOptionDxlinkSymbal');
  eq(sameSize.length, MODULE.length, 'control — the isolating probe is the same length');
  eq(Buffer.byteLength(sameSize, 'utf8'), Buffer.byteLength(MODULE, 'utf8'), '…the same bytes');
  eq((sameSize.match(/\n/g) || []).length, UNDO.MODULE_LF, '…and the same line count');
  ok(sameSize !== MODULE, '…but not the same content');
  throwsWith(() => undo(INDEX, sameSize), P + 'MODULE_IDENTITY', '…and the hash alone rejects it');
  throwsWith(() => undo(INDEX.replace(TAG, ''), MODULE), P + 'TAG_IDENTITY', 'a document with the tag removed');
  throwsWith(() => undo(INDEX.replace(TAG, TAG + TAG), MODULE),
    P + 'TAG_IDENTITY', 'a document with the tag duplicated');
  throwsWith(() => undo(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    P + 'TAG_ADJACENCY', 'a reordered tag');
  throwsWith(() => undo(INDEX + ' ', MODULE), P + 'EXTRACTED_IDENTITY', 'foreign content anywhere');
  ok(fs.readFileSync(path.join(ROOT, 'tests/lib/journal-snapshot-prefetch-undo.js'), 'utf8')
    .indexOf(P + 'BASE_IDENTITY') > 0, 'the final gate exists in the helper');
}

behaviour.then(() => {
  console.log('\n' + pass + ' assertions passed.');
}, (e) => {
  console.error(e);
  process.exit(1);
});
