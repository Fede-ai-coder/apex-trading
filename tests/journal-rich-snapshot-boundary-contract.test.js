'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// RICH ASYNC SNAPSHOT — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #431 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/journal-rich-snapshot-undo.js
// reconstructs the pre-extraction document byte for byte. §9 runs that round
// trip and §10 exercises every documented failure.
//
// ONE OWNER — AND THE TWO SETS THAT CLAIM QUANTIFIES OVER. §4 keeps audit
// #431's finding executable now that the audit is deleted, because the finding
// was not "one owner" but the SCOPE of it. Two drafts of the audit's header
// asserted a superlative from a partial look, and the two sets disagree:
//
//     over the TWENTY-ONE monolith-extraction layers   2 have one owner
//     over ALL SIXTY-FIVE local scripts                7 have one owner
//
// This module is the larger of the two in the first set, and the THIRD largest
// of the seven in the second. "The biggest one-owner module" would have been
// false. Neither figure is offered as a reason the cut was made; §5 and §6 are.
//
// WHY IT COULD BE TAKEN. `evaluationTimeReads` returns the EMPTY LIST: one
// declaration, zero top-level statement lines, nothing runs at load. §7 shows
// the consequence directly rather than by inference — the module loads in a
// COMPLETELY empty VM, and calling it there produces a REJECTED promise, not a
// load failure. Every one of its eight monolith dependencies, `S` among them,
// resolves at call time by construction.
//
// COUPLING, AND WHY THE INBOUND ZERO IS NOT ENOUGH ON ITS OWN. Three external
// edges over one name, all at call time; zero markup references; zero inbound
// writes. That last zero is VACUOUS — the region owns no binding for anything
// to write — and a region that declares no binding scores a perfect inbound
// zero while writing globals it does not own. So §6 measures outbound too, and
// there the answer is not zero: TWO writes, both BY KEY on `_ivrCache`, which
// stays declared inline as a `var` before the region.
//
// THE RUNNER-UP AND THE SPLIT RULE, kept executable in §8. The Journal snapshot
// helper was better on outbound (zero) and lost on total crossings, 6 to 5. The
// per-family split rule from #429/#430 is re-measured on the same family at
// THREE extents, which is also what reconciles this contract with the
// candle-store one: that contract pins the widest join at 69 edges in its own
// base coordinates, and the same three ranges appear here shifted by exactly
// the 25,263 units the chart layer removed.
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
const UNDO = require('./lib/journal-rich-snapshot-undo.js');
const CHART_UNDO = require('./lib/backend-candle-store-chart-undo.js');

const MODULE_REL = 'js/services/journal-rich-snapshot.js';
const TAG = '<script src="./js/services/journal-rich-snapshot.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/backend-candle-store-chart.js"></script>\n';
const INLINE_OPEN = '<script>';

const BASE_SHA = '5ffe7f31fa6185f01abf13d78b2cf87a703ec270';
// Ratchet. The temporary audit is replaced ONE FOR ONE by this contract, so the
// count does not move: the undo helper is not a .test.js file.
const TEST_FILE_COUNT = 153;
const LOCAL_SCRIPT_COUNT = 65;
const AUDIT_REL = 'tests/temporary-journal-rich-snapshot-boundary-audit.test.js';

// Where the block sat in the monolith it was cut from.
const CODE_AT = 113642;
const RAW_AT_IN_CODE = 1377622;
const RAW_END_IN_CODE = 1393575;
const BODY_END_IN_CODE = 1393574;

// The single owner, and the 174 units that are not it.
const OWNER = '_buildRichSnapshot';
const OWNER_COUNT = 1;
const OWNER_CHARS = 15778;
const OWNER_START = 173;

// The two sets §4 keeps separate. The chain is the layers cut OUT of the inline
// monolith, oldest first; LOCALS is every local script, which is a superset.
const EXTRACTION_CHAIN = [
  'js/services/journal-core.js', 'js/services/mcx-regime-policy.js', 'js/ui/journal-ui.js',
  'js/services/journal-remote-persistence.js', 'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js', 'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js', 'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js', 'js/ui/tt-reconnect.js', 'js/ui/journal-close-legs.js',
  'js/ui/journal-trade-forms.js', 'js/ui/journal-trade-detail.js',
  'js/portfolio/portfolio-data-fetch.js', 'js/portfolio/backend-portfolios.js',
  'js/portfolio/portfolio-expiry-manual.js', 'js/portfolio/portfolio-traffic-light.js',
  'js/ui/backend-candle-store-chart.js', MODULE_REL,
];
const CHAIN_LENGTH = 21;
const CHAIN_ONE_OWNER = ['js/services/apex-post-auth-init.js', MODULE_REL];
const OTHER_CHAIN_ONE_OWNER_CHARS = 4470;
const ALL_ONE_OWNER_COUNT = 7;
// The one-owner scripts strictly larger than this module, largest first.
const LARGER_ONE_OWNERS = [
  ['js/ui/pess-batch-panel.js', 24542],
  ['js/ui/eic-ticker-analysis-panel.js', 17589],
];

const EXTERNAL_EDGES = { _buildRichSnapshot: 3 };
const EXTERNAL_EDGE_TOTAL = 3;
const MARKUP_REFERENCES = 0;
const OUTBOUND_BINDING = '_ivrCache';
const OUTBOUND_WRITES = 2;
const OUTBOUND_DECLARED_AT = 1290588;
const TOP_LEVEL_STATEMENT_LINES = 0;

const MONOLITH_DEPENDENCIES = ['S', '_calcTechnicalsFromCandles', '_earningsCache',
  '_ensureVixFamily', '_getIntradayTech', '_getTechForTF', '_ivrCache',
  '_portfolioLatestBackendBetaEntry'];
const SIBLING_DEPENDENCIES = {
  'js/utils/normalizers.js': ['normalizeIvrPercent'],
  'js/api/backend-client.js': ['ttCall'],
};
const SIBLING_POSITIONS = { 'js/utils/normalizers.js': 3, 'js/api/backend-client.js': 4 };
const VM_GLOBALS = 1;
const SNAPSHOT_KEYS = 53;

// The runner-up and the family split, in BASE monolith coordinates. Three
// extents of ONE family: alone, joined with one neighbour, joined with three.
const HELPER = [1254714, 1265509];
const HELPER_CHARS = 10795;
const HELPER_OWNERS = 3;
const HELPER_EDGES = 6;
const HELPER_EDGE_NAMES = 2;
const HELPER_OUTBOUND = 0;
const HELPER_JOIN_ONE = [1254714, 1278340];
const HELPER_JOIN_ONE_EDGES = 11;
const HELPER_JOIN_ONE_NAMES = 6;
const HELPER_JOIN_THREE = [1254714, 1295847];
const HELPER_JOIN_THREE_EDGES = 69;
const HELPER_JOIN_THREE_NAMES = 14;
// The candle-store contract pins the same three ranges in ITS base, which was
// this base plus the chart fragment. The offset between them is that fragment.
const CHART_SHIFT = 25263;
// This candidate's own neighbour: joining it adds the JOURNAL MANAGER title
// block and no owners, so nothing changes.
const WITH_NEXT_HEADER = 1393688;

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
function ownerCount(rel) {
  return scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length;
}
function unitsOf(rel) {
  return Array.from(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('RICH ASYNC SNAPSHOT — PERMANENT BOUNDARY CONTRACT');

const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// The portfolio backend-candle fetch was cut AFTER this layer, so the live
// document is no longer the one this contract shipped. Peel it first and assert
// against the document as it was when this layer landed.
const BACKEND_CANDLES_U = require('./lib/portfolio-backend-candles-undo.js');
// The journal snapshot prefetch was cut AFTER the portfolio backend-candle
// fetch, so it is the newest layer of all: peel it FIRST.
// The portfolio DXLink greeks pair was cut AFTER the journal snapshot
// prefetch, so it is the newest layer of all: peel it FIRST.
// The strategy templates were cut AFTER the portfolio DXLink greeks pair, so
// they are the newest layer of all: peel them FIRST.
const STRATEGY_TEMPLATES_U = require('./lib/strategy-templates-undo.js');
const DXLINK_GREEKS_U = require('./lib/portfolio-dxlink-greeks-undo.js');
const PRE_STRATEGY_TEMPLATES = STRATEGY_TEMPLATES_U.isApplied(LIVE_INDEX)
  ? STRATEGY_TEMPLATES_U.undoStrategyTemplates(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/config/strategy-templates.js'), 'utf8'))
  : LIVE_INDEX;
const PRE_DXLINK_GREEKS = DXLINK_GREEKS_U.isApplied(PRE_STRATEGY_TEMPLATES)
  ? DXLINK_GREEKS_U.undoPortfolioDxlinkGreeks(
      PRE_STRATEGY_TEMPLATES, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-dxlink-greeks.js'), 'utf8'))
  : PRE_STRATEGY_TEMPLATES;
const SNAPSHOT_PREFETCH_U = require('./lib/journal-snapshot-prefetch-undo.js');
const PRE_SNAPSHOT_PREFETCH = SNAPSHOT_PREFETCH_U.isApplied(PRE_DXLINK_GREEKS)
  ? SNAPSHOT_PREFETCH_U.undoJournalSnapshotPrefetch(
      PRE_DXLINK_GREEKS, fs.readFileSync(path.join(ROOT, 'js/services/journal-snapshot-prefetch.js'), 'utf8'))
  : PRE_DXLINK_GREEKS;
const INDEX = BACKEND_CANDLES_U.isApplied(PRE_SNAPSHOT_PREFETCH)
  ? BACKEND_CANDLES_U.undoPortfolioBackendCandles(
      PRE_SNAPSHOT_PREFETCH, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-backend-candles.js'), 'utf8'))
  : PRE_SNAPSHOT_PREFETCH;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const OWNERS = scanTopLevelDeclarations(MODULE);
const OWNED = new Set(OWNERS.map((d) => d.name));
// The reconstructed base, used wherever a measurement needs the pre-cut offsets.
const BASE = UNDO.undoJournalRichSnapshot(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document and the module');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is the extracted document');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…and by UTF-8 byte length');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 15,952 units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…and by UTF-8 byte length');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-five local application scripts');
eq(LOCALS[LOCALS.length - 1], MODULE_REL, '…and this module is the LAST of them');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is ' + TEST_FILE_COUNT + ' test files — the audit is replaced one for one');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)), '…and the temporary audit is gone');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The tag, and where it loads');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(INDEX, TAG), 1, 'exactly one tag for this module');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG), 1, '…immediately after the previous layer');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1, '…and immediately before the inline monolith');
ok(/^<script src="\.\/[a-z0-9/.-]+"><\/script>\n$/.test(TAG), 'the tag is a plain classic script');
eq(/\b(?:async|defer|type=)/.test(TAG), false, '…with no async, defer or type attribute');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The module is the block’s bytes, and the seam is the audited one');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the monolith sat at the pinned offset in the base');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MODULE,
    'the module is EXACTLY the bytes that were at [1377622,1393574)');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + '\n',
    '…and the raw block is that body plus one LF');

  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd reproduces the body end');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary and resumes at the next feature');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the header is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  // Both ends of the region are real top-level marks. Unlike tt-reconnect and
  // apex-post-auth-init, whose boundaries no banner rule reproduces, this one
  // happens to sit banner-to-banner — which is a fact about this region, not a
  // rule that found it.
  const marks = topLevelBanners(BASE_CODE, functionBodyRanges(BASE_CODE));
  ok(marks.indexOf(RAW_AT_IN_CODE) >= 0, 'the region opens on a top-level banner');
  ok(marks.indexOf(RAW_END_IN_CODE) >= 0, '…and the seam is another');
  ok(MODULE.slice(0, 100).indexOf('RICH ASYNC SNAPSHOT') > 0, 'the module opens on its own banner');
  ok(BASE_CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + 200).indexOf('JOURNAL MANAGER') > 0,
    'and what follows the seam is a different feature');

  eq(MODULE.slice(-2), '}\n', 'the module ends on a closing brace and a newline');
  eq(MODULE.endsWith('\n\n'), false, '…and not on a blank line');
  eq(isBlankOrComment(MODULE.slice(MODULE.lastIndexOf('\n', MODULE.length - 2) + 1)), false,
    '…its last line carries code');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. ONE owner — and the two sets that claim quantifies over');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares exactly one name at top level');
  eq(OWNERS[0].name, OWNER, '…and it is _buildRichSnapshot');
  eq(OWNERS[0].chars, OWNER_CHARS, '…spanning 15,778 of the 15,952 units');
  eq(OWNERS[0].start, OWNER_START, '…starting after 173 units of banner and comment');
  eq(OWNERS[0].isAsync, true, '…and it is async');
  eq(OWNERS[0].form, 'function', '…a function declaration, not a binding');
  eq(bindingNames(OWNERS), [], 'it owns no binding at all');
  eq(OWNER_START + OWNER_CHARS + 1, UNDO.MODULE_CHARS,
    'banner + declaration + the single trailing newline is the whole module');
  eq(MODULE.slice(OWNER_START + OWNER_CHARS), '\n', '…and that trailing unit is the newline');
  {
    let leftInline = 0;
    for (const d of OWNERS) if (CODE.indexOf('function ' + d.name + '(') >= 0) leftInline++;
    eq(leftInline, 0, 'the owner is no longer declared inline');
  }

  // TWO different sets, because the answer differs between them and two drafts
  // of the audit's header quantified over the wrong one. Both are measured.
  eq(EXTRACTION_CHAIN.length, CHAIN_LENGTH, 'twenty-one layers have been cut from the monolith');
  eq(EXTRACTION_CHAIN[CHAIN_LENGTH - 1], MODULE_REL, '…this one being the newest');
  eq(EXTRACTION_CHAIN.filter((rel) => LOCALS.indexOf(rel) < 0), [],
    'control — every layer in the chain is a shipped local script');
  ok(LOCALS.length > CHAIN_LENGTH,
    '…but the chain is a strict SUBSET of them, which is why the two counts differ');

  // (a) the twenty-one monolith-extraction layers.
  eq(EXTRACTION_CHAIN.filter((rel) => ownerCount(rel) === 1), CHAIN_ONE_OWNER,
    'exactly TWO of them have a single owner');
  eq(unitsOf(CHAIN_ONE_OWNER[0]), OTHER_CHAIN_ONE_OWNER_CHARS, '…the other being 4,470 units');
  ok(UNDO.MODULE_CHARS > OTHER_CHAIN_ONE_OWNER_CHARS,
    '…so this module is the larger of the two THERE');

  // (b) every local script, where the answer is different and the superlative
  //     that two drafts wanted to state is false.
  const allOneOwner = LOCALS.filter((rel) => ownerCount(rel) === 1);
  eq(allOneOwner.length, ALL_ONE_OWNER_COUNT, 'across all sixty-five local scripts, SEVEN have one owner');
  ok(allOneOwner.indexOf(MODULE_REL) >= 0, '…this module among them');
  const larger = allOneOwner
    .map((rel) => [rel, unitsOf(rel)])
    .filter(([, n]) => n > UNDO.MODULE_CHARS)
    .sort((a, b) => b[1] - a[1]);
  eq(larger, LARGER_ONE_OWNERS, 'TWO of the seven are larger than this module');
  eq(larger.length + 1, 3, '…so it is the THIRD largest, not the largest');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Dependencies, and the load order that makes them safe');
// ─────────────────────────────────────────────────────────────────────────────
{
  const monolith = new Map(scanTopLevelDeclarations(CODE).map((d) => [d.name, d.form]));
  const masked = maskLiterals(MODULE);
  const referenced = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) if (!OWNED.has(m[2])) referenced.add(m[2]);
  eq(Array.from(referenced).filter((n) => monolith.has(n)).sort(), MONOLITH_DEPENDENCIES,
    'it depends on exactly these eight monolith names');
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
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on two names from two sibling modules');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < LOCAL_SCRIPT_COUNT, '…which is before this module');
  }
  eq(LOCALS.indexOf(MODULE_REL) + 1, LOCAL_SCRIPT_COUNT, 'and this module 65th — after both');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Coupling in both directions — the inbound zero is VACUOUS');
// ─────────────────────────────────────────────────────────────────────────────
{
  const view = lexicalViews(CODE);
  const edges = {};
  let total = 0;
  for (const n of OWNED) {
    for (const p of refSites(view.code, n)) { edges[n] = (edges[n] || 0) + 1; total++; }
  }
  eq(edges, EXTERNAL_EDGES, 'three references remain inline, over ONE name');
  eq(total, EXTERNAL_EDGE_TOTAL, '…matching what the audit predicted');

  const spans = scanTopLevelDeclarations(CODE).map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of Object.keys(EXTERNAL_EDGES)) for (const p of refSites(view.code, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'every one sits inside a declaration — call time');

  let markup = 0;
  for (const n of OWNED) markup += refSites(view.strings, n).length;
  eq(markup, MARKUP_REFERENCES, 'the owner is never named inside a string the monolith builds');
  ok(refSites(view.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  // Controls for the write detector. This module performs only KEYED writes, so
  // the direct-assignment branch is not exercised by the data below.
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  // INBOUND is zero, and it is zero for a reason that makes it worthless alone:
  // there is nothing to write. That is exactly the shape CLAUDE.md records as
  // scoring a perfect inbound zero while writing globals it does not own.
  eq(bindingNames(OWNERS).length, 0, 'the module owns no binding, so inbound is vacuous');
  let inbound = 0;
  for (const n of bindingNames(OWNERS)) {
    for (const p of refSites(view.code, n)) if (isWriteAt(view.code, p, n)) inbound++;
  }
  eq(inbound, 0, '…and the count over an empty set is zero');

  // OUTBOUND is what actually constrains this cut, and it is NOT zero.
  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S, so it is not var-only');
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
  eq(outboundTotal, OUTBOUND_WRITES, '…twice');
  const writes = refSites(moduleMasked, OUTBOUND_BINDING)
    .filter((p) => isWriteAt(moduleMasked, p, OUTBOUND_BINDING))
    .map((p) => MODULE[p + OUTBOUND_BINDING.length]);
  eq(writes, ['[', '['], 'both writes are BY KEY, never rebindings of the name');
  const declared = scanTopLevelDeclarations(CODE).filter((d) => d.name === OUTBOUND_BINDING);
  eq(declared.length, 1, 'the cache is still declared exactly once, inline');
  eq(declared[0].form, 'var', '…as a var, so the module resolves it at call time');
  const baseDeclared = scanTopLevelDeclarations(BASE_CODE).filter((d) => d.name === OUTBOUND_BINDING);
  eq(baseDeclared[0].start, OUTBOUND_DECLARED_AT, '…at the offset the audit pinned in the base');
  ok(baseDeclared[0].start < RAW_AT_IN_CODE, '…before the region, so the cut did not move it');

  eq(statementLines(MODULE, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'the module is one declaration and nothing else — zero top-level statement lines');
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 0,
    'control — the same counter finds statements in the monolith as a whole');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, defers everything, and still works');
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
  eq(Object.keys(bare), [OWNER], '…defining exactly its one owner');
  eq(typeof bare[OWNER], 'function', '…and it is callable');
  eq(bare[OWNER].constructor.name, 'AsyncFunction', '…an async function');
  eq(bare[OWNER].length, 2, '…of arity two');
}

// The behavioural half runs asynchronously; assertions are counted the same way.
const behaviour = (async () => {
  section('7b. …and what "call time" means, driven rather than inferred');
  const stubs = () => ({
    console: { log() {}, warn() {}, error() {} },
    S: { scanData: [], greeksCache: {}, ttSessionId: null },
    _calcTechnicalsFromCandles: () => ({ rsi: null }),
    _ivrCache: {}, _earningsCache: {},
    _portfolioLatestBackendBetaEntry: () => null,
    _getTechForTF: () => null, _ensureVixFamily: () => null,
    _getIntradayTech: () => ({ technicals: null, indicatorSource: 'UNAVAILABLE',
      indicatorMissingReason: 'stub' }),
    normalizeIvrPercent: (v) => v, ttCall: async () => null,
    Date, Math, JSON, isNaN, parseFloat, parseInt, Object, Array, Promise, String, Number,
  });
  const load = (host) => { vm.createContext(host); vm.runInContext(MODULE, host, { filename: MODULE_REL }); return host; };

  // The dependency failure is DEFERRED into the returned promise. A module that
  // read any of the eight at load could not have got this far.
  const empty = load({});
  const rejected = await empty[OWNER]().then(() => null, (e) => e);
  // Not `instanceof ReferenceError`: the error is constructed inside the VM, so
  // its prototype chain is the VM's and a cross-realm instanceof is false even
  // when the error is exactly the expected one.
  eq(rejected.constructor.name, 'ReferenceError',
    'calling it in the empty VM REJECTS, it does not fail at load');
  eq(rejected.message, '_calcTechnicalsFromCandles is not defined',
    '…naming the first monolith dependency it actually reaches');

  const host = load(stubs());
  const snap = await host[OWNER]();
  eq(Object.keys(snap).length, SNAPSHOT_KEYS, 'with its dependencies present it builds a 53-key snapshot');
  eq(snap.indicatorMissingReason, 'no_ticker', '…reporting why indicators are absent for a blank call');
  eq(snap.indicatorSource, 'UNAVAILABLE', '…and that the source is unavailable');
  eq(snap.underlyingPrice, null, '…with no underlying price');
  eq(snap.source, 'manual', '…tagged as a manual snapshot');
  ok(/^\d{4}-\d{2}-\d{2}T/.test(snap.timestamp), '…carrying an ISO timestamp');

  // The greeksToMerge parameter is the second half of the signature; a module
  // that loaded but ignored its arguments would still pass everything above.
  const merged = await host[OWNER](undefined, { delta: 0.42, theta: -3, betaWeightedDelta: 7 });
  eq(merged.delta, 0.42, 'greeksToMerge is merged into the snapshot');
  eq(merged.theta, -3, '…every supplied field');
  eq(merged.betaWeightedDelta, 7, '…including the beta-weighted delta');
  eq(snap.delta, null, 'control — without it the same field is null, so the merge is a measurement');
})();

// ─────────────────────────────────────────────────────────────────────────────
section('8. The runner-up, and the split rule measured per family');
// ─────────────────────────────────────────────────────────────────────────────
{
  const view = lexicalViews(BASE_CODE);
  function edges(at, end) {
    const ds = scanTopLevelDeclarations(BASE_CODE.slice(at, end));
    const seen = {};
    let total = 0;
    for (const n of new Set(ds.map((d) => d.name))) {
      for (const p of refSites(view.code, n)) {
        if (p < at || p >= end) { seen[n] = (seen[n] || 0) + 1; total++; }
      }
    }
    return { owners: ds.length, names: Object.keys(seen).length, total };
  }
  function outboundOf(at, end) {
    const owned = new Set(scanTopLevelDeclarations(BASE_CODE.slice(at, end)).map((d) => d.name));
    const bm = view.code.slice(at, end);
    let n = 0;
    for (const name of new Set(bindingNames(scanTopLevelDeclarations(BASE_CODE)))) {
      if (owned.has(name)) continue;
      for (const p of refSites(bm, name)) if (isWriteAt(bm, p, name)) n++;
    }
    return n;
  }

  // Every extent below must be bounded by REAL top-level marks. A range pinned
  // to an arbitrary offset is the survivor #429, #430 and #431 each found: a
  // one-unit shift changes nothing, so the constant pins nothing.
  const marks = topLevelBanners(BASE_CODE, functionBodyRanges(BASE_CODE));
  for (const at of [HELPER[0], HELPER[1], HELPER_JOIN_ONE[1], HELPER_JOIN_THREE[1], WITH_NEXT_HEADER]) {
    ok(marks.indexOf(at) >= 0, 'the extent is bounded by a real top-level banner at ' + at);
  }

  // THE RUNNER-UP. Better on outbound, worse on total crossings and on size.
  const helper = edges(HELPER[0], HELPER[1]);
  eq(HELPER[1] - HELPER[0], HELPER_CHARS, 'the Journal snapshot helper is 10,795 units');
  eq(helper.owners, HELPER_OWNERS, '…with three owners');
  eq(helper.total, HELPER_EDGES, '…six external edges');
  eq(helper.names, HELPER_EDGE_NAMES, '…over two names');
  eq(outboundOf(HELPER[0], HELPER[1]), HELPER_OUTBOUND, '…and ZERO outbound writes');
  eq(helper.total + HELPER_OUTBOUND, 6, 'so the helper costs six crossings in total');
  eq(EXTERNAL_EDGE_TOTAL + OUTBOUND_WRITES, 5, '…and the region actually cut, five');
  ok(UNDO.MODULE_CHARS > HELPER_CHARS, '…while moving 5,157 more units');

  // THE SPLIT RULE, on ONE family at THREE extents. The cost grows with the
  // extent, so joining is worse here at every step — the opposite of the chart
  // pair, where splitting was the expensive move.
  const one = edges(HELPER_JOIN_ONE[0], HELPER_JOIN_ONE[1]);
  const three = edges(HELPER_JOIN_THREE[0], HELPER_JOIN_THREE[1]);
  eq(one.owners, 9, 'joined with one neighbour the helper carries nine owners');
  eq(one.total, HELPER_JOIN_ONE_EDGES, '…and costs eleven edges');
  eq(one.names, HELPER_JOIN_ONE_NAMES, '…over six names');
  eq(three.owners, 19, 'joined with three it carries nineteen');
  eq(three.total, HELPER_JOIN_THREE_EDGES, '…and costs SIXTY-NINE');
  eq(three.names, HELPER_JOIN_THREE_NAMES, '…over fourteen names');
  ok(three.total > one.total && one.total > helper.total,
    'the cost rises monotonically with the extent, so joining is wrong at every step');

  // This reconciles the two contracts rather than leaving them to look like
  // rival measurements: the candle-store contract pins the same three ranges in
  // ITS base, which was this base plus the chart fragment.
  eq(CHART_UNDO.RAW_CHARS, CHART_SHIFT, 'the chart layer removed 25,263 units');
  ok(CHART_UNDO.RAW_AT < UNDO.RAW_AT, '…from before this family, so the shift applies to it');
  eq(HELPER[0] + CHART_SHIFT, 1279977, 'the helper sat 25,263 later in the candle-store base');
  eq(HELPER[1] + CHART_SHIFT, 1290772, '…as did its end');
  eq(HELPER_JOIN_THREE[1] + CHART_SHIFT, 1321110, '…and the widest join, the 69-edge one');

  // This candidate had no neighbour worth joining: the next region is a header.
  const withHeader = edges(RAW_AT_IN_CODE, WITH_NEXT_HEADER);
  ok(WITH_NEXT_HEADER > RAW_END_IN_CODE, 'the next mark is past the seam');
  eq(withHeader.owners, OWNER_COUNT, 'extending to it adds no owner');
  eq(withHeader.total, EXTERNAL_EDGE_TOTAL, '…and no edge — only the JOURNAL MANAGER title block');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The byte-exact round trip');
// ─────────────────────────────────────────────────────────────────────────────
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, UNDO.BASE_CHARS, 'the base document is the pinned length');
  eq(sha256(fromGit), UNDO.BASE_SHA256, '…and the pinned hash');
  eq(APP_LOADER.parseScriptTags(fromGit).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying sixty-four local scripts');
  // BASE_SHA must name THIS layer's base, not merely SOME commit with the same
  // index.html. The audit PR changed only tests/, so its parent carries a
  // byte-identical document and every assertion above would pass against it —
  // a pin that cannot tell the two apart pins nothing. What separates them is
  // the audit file itself, which exists at the base and nowhere earlier.
  const has = (rev, rel) => {
    try { git(['cat-file', '-e', rev + ':' + rel]); return true; } catch (e) { return false; }
  };
  eq(has(BASE_SHA, AUDIT_REL), true, 'the pinned base is the commit that carried the temporary audit');
  eq(has(BASE_SHA + '^', AUDIT_REL), false,
    'control — its parent does not, so the pin distinguishes the two');
  eq(git(['show', BASE_SHA + '^:index.html']), fromGit,
    '…even though that parent has a byte-identical index.html, which is why the control is needed');
  eq(UNDO.EXTRACTED_LOCAL_SCRIPTS, LOCAL_SCRIPT_COUNT, 'the undo helper pins the extracted script count');
  eq(UNDO.BASE_LOCAL_SCRIPTS + 1, UNDO.EXTRACTED_LOCAL_SCRIPTS, '…exactly one more than the base');
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
    'the arithmetic closes: 15,953 units out, 63 in');
  eq(sha256(fromGit.slice(UNDO.RAW_AT, UNDO.RAW_END)), UNDO.RAW_SHA256, 'the raw block hashes to its pin');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Every documented failure, by its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const P = 'JOURNAL_RICH_SNAPSHOT_UNDO_';
  const undo = UNDO.undoJournalRichSnapshot;
  throwsWith(() => undo(null, MODULE), P + 'BAD_INPUT', 'a non-string document');
  throwsWith(() => undo(INDEX, null), P + 'BAD_INPUT', 'a non-string module');
  throwsWith(() => undo(INDEX, MODULE.slice(0, -1)), P + 'MODULE_IDENTITY', 'a truncated module');
  throwsWith(() => undo(INDEX, MODULE + '\n'),
    P + 'MODULE_IDENTITY', 'a module that absorbed the separator is caught by size');
  throwsWith(() => undo(INDEX, MODULE.slice(0, -2) + '\n}'),
    P + 'MODULE_SEPARATOR', 'a module whose final newline moved');
  // Isolates the HASH guard: same length, same bytes, same line count. Without
  // this the size guard answers for it and a disabled hash would be invisible.
  const sameSize = MODULE.replace('_calcTechnicalsFromCandles', '_calcTechnicalsFromCandels');
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
  // BASE_IDENTITY is the deliberate redundant gate the helper documents: once
  // both hashes have passed the result is a pure function of two fixed byte
  // strings, so no ordinary mutant reaches it. Asserted to exist, not triggered.
  ok(fs.readFileSync(path.join(ROOT, 'tests/lib/journal-rich-snapshot-undo.js'), 'utf8')
    .indexOf(P + 'BASE_IDENTITY') > 0, 'the final gate exists in the helper');
}

behaviour.then(() => {
  console.log('\n' + pass + ' assertions passed.');
}, (e) => {
  console.error(e);
  process.exit(1);
});
