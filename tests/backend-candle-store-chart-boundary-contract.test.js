'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND CANDLE STORE CHART + MAIN CHART — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #429 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/backend-candle-store-chart-undo.js
// reconstructs the pre-extraction document byte for byte. §10 runs that round
// trip and §11 exercises every documented failure.
//
// WHY THE TWO HALVES WENT TOGETHER, and why that is NOT a rule. §5 keeps audit
// #429's finding executable now that the audit is deleted:
//
//     this pair, split at the `// ══ CHART` header   32 edges over 11 names
//     this pair, taken together                       8 edges over  2 names
//
//     Journal snapshot helper, alone                  6 edges
//     …joined with its three neighbours              69 edges
//
// Both families are asserted side by side. Taking #427's result as the rule
// "join adjacent regions" would have been wrong for the second one by a factor
// of eleven, and a rejection that lives only in a deleted audit is a rejection
// someone makes again — which is exactly what happened to #424's swing finding.
//
// THIS IS THE SECOND MODULE THAT ASSIGNS TO `window` AT EVALUATION TIME. The
// block performs one top-level statement, and §8 pins what it reads: `window`,
// and a function this block itself declares — NOT one name the monolith owns.
// So it is a relocation of an assignment that already ran, the same case
// js/portfolio/backend-portfolios.js was, and the backend-directional-snapshot
// contract now pins TWO such modules rather than one. A decision to expose
// something NEW would still fail there.
//
// A consequence of the same statement: this module does NOT load in a
// completely empty VM. §9 shows both directions — it fails without `window`,
// and `window` alone is enough.
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
const UNDO = require('./lib/backend-candle-store-chart-undo.js');

const MODULE_REL = 'js/ui/backend-candle-store-chart.js';
const TAG = '<script src="./js/ui/backend-candle-store-chart.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-traffic-light.js"></script>\n';
const INLINE_OPEN = '<script>';

const BASE_SHA = '8311c0a5c428d9c039dbe5a86bec54928321c45f';
// Ratchet. The temporary audit is replaced ONE FOR ONE by this contract, so the
// count does not move: the undo helper is not a .test.js file.
const TEST_FILE_COUNT = 147;
const LOCAL_SCRIPT_COUNT = 64;
const AUDIT_REL = 'tests/temporary-backend-candle-store-chart-boundary-audit.test.js';

// Where the block sat in the monolith it was cut from.
const CODE_AT = 113580;
const RAW_AT_IN_CODE = 713744;
const RAW_END_IN_CODE = 739007;
const BODY_END_IN_CODE = 739006;
// The header the region spans, and the point the split would have cut at.
const SPANNED_HEADER_AT = 722400;
const SPLIT_A_CHARS = 8656;
const SPLIT_B_CHARS = 16607;

const OWNER_COUNT = 22;
const OWNER_SPAN_SUM = 24080;
const ASYNC_OWNERS = 6;
const OWNED_BINDINGS = ['APEX_FF_BACKEND_CANDLE_STORE_CHART', '_BACKEND_CANDLE_STORE_CHART_SOURCE',
  '_BACKEND_CANDLE_STORE_CHART_TF', 'CHART_STATE'];

const EXTERNAL_EDGES = { _backendCandleStoreChartNormTime: 4, CHART_STATE: 4 };
const EXTERNAL_EDGE_TOTAL = 8;
const MARKUP_REFERENCES = { openChart: 1 };
const SPLIT_EDGE_TOTAL = 32;
const SPLIT_EDGE_NAMES = 11;
// The counter-example, in BASE monolith coordinates.
const SNAPSHOT_HELPER = [1279977, 1290772];
const SNAPSHOT_HELPER_EDGES = 6;
const SNAPSHOT_JOINED = [1279977, 1321110];
const SNAPSHOT_JOINED_EDGES = 69;

const TOP_LEVEL_STATEMENT = 'window.apexSetBackendCandleStoreChartTimeframe=setBackendCandleStoreChartTimeframe;';
const WINDOW_TARGET = 'apexSetBackendCandleStoreChartTimeframe';
const WINDOW_MODULES = ['js/portfolio/backend-portfolios.js', MODULE_REL];

const MONOLITH_DEPENDENCIES = ['S', '_loadBackendChartCandles', 'fetchCandles',
  'ffPreferBackendCandlesForCharts', 'postCandleContext', 'resolveLatestDisplayPrice', 'showToast'];
const SIBLING_DEPENDENCIES = {
  'js/api/backend-client.js': ['ttCall'],
  'js/config/backend-config.js': ['BACKEND'],
  'js/services/candle-provenance.js': ['_recordCandleProvenance', '_recordBackendCandleProvenance'],
};
const SIBLING_POSITIONS = { 'js/api/backend-client.js': 4, 'js/config/backend-config.js': 5,
  'js/services/candle-provenance.js': 20 };
const VM_GLOBALS = 22;

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

console.log('BACKEND CANDLE STORE CHART + MAIN CHART — PERMANENT BOUNDARY CONTRACT');

const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const OWNERS = scanTopLevelDeclarations(MODULE);
const OWNED = new Set(OWNERS.map((d) => d.name));
// The reconstructed base, used wherever a measurement needs the pre-cut offsets.
const BASE = UNDO.undoBackendCandleStoreChart(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document and the module');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is the extracted document');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…and by UTF-8 byte length');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 25,262 units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…and by UTF-8 byte length');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-four local application scripts');
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
    'the module is EXACTLY the bytes that were at [713744,739006)');
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

  // The spanned header — the reason no banner rule finds this boundary.
  const rel = SPANNED_HEADER_AT - RAW_AT_IN_CODE;
  ok(rel > 0 && rel < MODULE.length, 'a `// ══` header sits INSIDE the module');
  eq(MODULE.slice(rel, rel + 5), '// ══', '…at column 0');
  eq(MODULE[rel - 1], '\n', '…at a line start, so a banner scan would have found it');
  ok(MODULE.slice(rel, rel + 140).indexOf('// CHART') > 0, '…and it is the CHART header');
  ok(MODULE.slice(0, 140).indexOf('BACKEND CANDLE STORE CHART EXPERIMENT') > 0,
    'the module opens on the experiment’s own title block');
  ok(BASE_CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + 140).indexOf('FUNDAMENTALS') > 0,
    'and what follows the seam is a different feature');

  eq(MODULE.slice(-2), '}\n', 'the module ends on a closing brace and a newline');
  eq(MODULE.endsWith('\n\n'), false, '…and not on a blank line');
  eq(isBlankOrComment(MODULE.slice(MODULE.lastIndexOf('\n', MODULE.length - 2) + 1)), false,
    '…its last line carries code');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The twenty-two owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(OWNERS.length, OWNER_COUNT, 'the module declares twenty-two names at top level');
eq(OWNERS.reduce((a, d) => a + d.chars, 0), OWNER_SPAN_SUM, '…spanning 24,080 units');
eq(bindingNames(OWNERS), OWNED_BINDINGS, 'four of them are bindings');
eq(OWNERS.filter((d) => d.form === 'function').length, OWNER_COUNT - OWNED_BINDINGS.length,
  '…and eighteen are function declarations');
eq(OWNERS.filter((d) => d.isAsync).length, ASYNC_OWNERS, 'six owners are async');
{
  let leftInline = 0;
  for (const d of OWNERS) if (CODE.indexOf('function ' + d.name + '(') >= 0) leftInline++;
  eq(leftInline, 0, 'no owner is still declared inline');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE SPLIT COST — and the family where joining is WRONG');
// ─────────────────────────────────────────────────────────────────────────────
{
  const view = lexicalViews(BASE_CODE);
  function edges(at, end) {
    const names = new Set(scanTopLevelDeclarations(BASE_CODE.slice(at, end)).map((d) => d.name));
    const seen = {};
    let total = 0;
    for (const n of names) {
      for (const p of refSites(view.code, n)) {
        if (p < at || p >= end) { seen[n] = (seen[n] || 0) + 1; total++; }
      }
    }
    return { owners: scanTopLevelDeclarations(BASE_CODE.slice(at, end)).length,
             names: Object.keys(seen).length, total };
  }
  const whole = edges(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(whole.total, EXTERNAL_EDGE_TOTAL, 'taken together the pair costs eight external edges');
  eq(whole.names, Object.keys(EXTERNAL_EDGES).length, '…over two names');

  const A = edges(RAW_AT_IN_CODE, SPANNED_HEADER_AT);
  const B = edges(SPANNED_HEADER_AT, RAW_END_IN_CODE);
  eq(A.owners, 14, 'the experiment half declares fourteen owners');
  eq(B.owners, 8, '…and the CHART half eight');
  eq(A.owners + B.owners, OWNER_COUNT, '…which is every owner the module has');
  eq(SPANNED_HEADER_AT - RAW_AT_IN_CODE, SPLIT_A_CHARS, 'the experiment half is 8,656 units');
  eq(RAW_END_IN_CODE - SPANNED_HEADER_AT, SPLIT_B_CHARS, '…and the CHART half 16,607');
  eq(A.total + B.total, SPLIT_EDGE_TOTAL, 'split at that header it would cost THIRTY-TWO');
  eq(A.names + B.names, SPLIT_EDGE_NAMES, '…over eleven names');
  ok(A.total + B.total > EXTERNAL_EDGE_TOTAL * 3, 'more than three times the joint cut');

  // AND THE COUNTER-EXAMPLE, kept because the audit that found it is deleted.
  // Taking #427's result as a rule would have been wrong here by a factor of 11.
  // Both endpoints must be real top-level marks in the base, or a one-unit shift
  // of either changes nothing and pins nothing — a survivor the audit caught.
  const marks = topLevelBanners(BASE_CODE, functionBodyRanges(BASE_CODE));
  for (const at of [SNAPSHOT_HELPER[0], SNAPSHOT_HELPER[1], SNAPSHOT_JOINED[1]]) {
    ok(marks.indexOf(at) >= 0, 'the counter-example is bounded by a real banner at ' + at);
  }
  const helper = edges(SNAPSHOT_HELPER[0], SNAPSHOT_HELPER[1]);
  const joined = edges(SNAPSHOT_JOINED[0], SNAPSHOT_JOINED[1]);
  eq(helper.total, SNAPSHOT_HELPER_EDGES, 'the Journal snapshot helper alone costs six edges');
  eq(joined.total, SNAPSHOT_JOINED_EDGES, '…and joined with its neighbours SIXTY-NINE, not fewer');
  ok(joined.total > helper.total * 10,
    'so "take adjacent regions together" is a measurement, not a rule');
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
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on five names from three sibling modules');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < LOCAL_SCRIPT_COUNT, '…which is before this module');
  }
  eq(LOCALS.indexOf(MODULE_REL) + 1, LOCAL_SCRIPT_COUNT, 'and this module 64th — after all three');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Coupling in both directions, and the consumers left inline');
// ─────────────────────────────────────────────────────────────────────────────
{
  const view = lexicalViews(CODE);
  const edges = {};
  let total = 0;
  for (const n of OWNED) {
    for (const p of refSites(view.code, n)) { edges[n] = (edges[n] || 0) + 1; total++; }
  }
  eq(edges, EXTERNAL_EDGES, 'eight references remain inline, over two names');
  eq(total, EXTERNAL_EDGE_TOTAL, '…matching what the audit predicted');

  const spans = scanTopLevelDeclarations(CODE).map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of Object.keys(EXTERNAL_EDGES)) for (const p of refSites(view.code, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'every one sits inside a declaration — call time');

  const markup = {};
  for (const n of OWNED) {
    const hits = refSites(view.strings, n);
    if (hits.length) markup[n] = hits.length;
  }
  eq(markup, MARKUP_REFERENCES, 'exactly one owner is named inside a string the monolith builds');
  ok(refSites(view.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that count is a measurement');

  // Controls for the write detector: this module performs NO write of either
  // shape, so both zeros below would survive a detector that had lost a branch.
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  const ownedBindings = new Set(bindingNames(OWNERS));
  let inbound = 0;
  for (const n of ownedBindings) {
    for (const p of refSites(view.code, n)) if (isWriteAt(view.code, p, n)) inbound++;
  }
  eq(inbound, 0, 'nothing inline writes any of the four bindings it owns');

  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S');
  ok(monolithBindings.size > 200, '…and is the whole set, not an empty one');
  const moduleMasked = maskLiterals(MODULE);
  const outbound = {};
  for (const n of monolithBindings) {
    if (OWNED.has(n)) continue;
    for (const p of refSites(moduleMasked, n)) {
      if (isWriteAt(moduleMasked, p, n)) outbound[n] = (outbound[n] || 0) + 1;
    }
  }
  eq(outbound, {}, 'and it writes NO binding it does not own — zero in both directions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The one top-level statement, and the invariant it moves');
// ─────────────────────────────────────────────────────────────────────────────
{
  const stmts = statementLines(MODULE, OWNERS);
  eq(stmts.length, 1, 'the module performs exactly ONE top-level statement');
  eq(stmts[0].trim(), TOP_LEVEL_STATEMENT, '…and this is it');
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 1,
    'control — the same counter finds many in the monolith as a whole');

  const reads = evaluationTimeReads(MODULE, OWNERS, maskLiterals);
  eq(reads, ['window'], 'at evaluation time it reads `window` and nothing else');
  const monolithNames = new Set(scanTopLevelDeclarations(CODE).map((d) => d.name));
  eq(reads.filter((n) => monolithNames.has(n) && !OWNED.has(n)), [],
    '…so NOT one monolith-declared name is read at load');
  ok(OWNED.has('setBackendCandleStoreChartTimeframe'),
    'the value it assigns is a function the module itself declares');
  const probe = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals),
    ['elsewhere', 'window'], 'control — a region that reads a foreign name at load reports it');

  // TWO shipped modules now assign to window at evaluation time, both by
  // relocation. The DSB contract pins the same pair; this is the other half of
  // that assertion, stated where the second one lives.
  const WINDOW_ASSIGN = /window\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/;
  const assigning = LOCALS.filter((rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return WINDOW_ASSIGN.test(statementLines(src, scanTopLevelDeclarations(src)).join('\n'));
  });
  eq(assigning.sort(), WINDOW_MODULES.slice().sort(),
    'exactly TWO shipped modules assign to window at evaluation time');
  eq((stmts.join('\n').match(/window\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/g) || []).length, 1,
    '…and this one makes exactly one such assignment, not more');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. It loads, and it still works');
// ─────────────────────────────────────────────────────────────────────────────
{
  // It does NOT load bare — measured, not assumed, and the message says why.
  const bare = (() => {
    const sandbox = {};
    try { vm.createContext(sandbox); vm.runInContext(MODULE, sandbox, { filename: MODULE_REL }); return null; }
    catch (e) { return String(e.message); }
  })();
  eq(bare, 'window is not defined', 'an empty VM rejects it, and says why');

  const host = { window: {} };
  vm.createContext(host);
  vm.runInContext(MODULE, host, { filename: MODULE_REL });
  eq(Object.keys(host).length - 1, VM_GLOBALS, '`window` alone is enough to load it');
  eq(Object.keys(host.window), [WINDOW_TARGET], '…exposing exactly one name on window');
  eq(typeof host.window[WINDOW_TARGET], 'function', '…and it is the function, not a value');

  // Drive the pure ones. A module that loads is not a module that works.
  eq(host.ffBackendCandleStoreChart(), false,
    'the feature flag reads false with no storage present');
  eq(host._backendCandleStoreChartTimeframe('1D'), '1D', 'a known timeframe passes through');
  eq(host._backendCandleStoreChartTimeframe('nonsense'), '1D', '…and an unknown one falls back');
  eq(typeof host._backendCandleStoreChartNormTime, 'function',
    'the normaliser the monolith calls four times is present');
  eq(host.CHART_STATE.period, 90, 'CHART_STATE carries its initial period');
  eq(host.CHART_STATE.timeframe, '1D', '…and its initial timeframe');
  // Not deepStrictEqual against []: the array is built inside the VM, so its
  // prototype is the VM's Array and a structural compare fails on that alone.
  eq(host.CHART_STATE.candles.length, 0, '…and starts with no candles');
  eq(Array.isArray(host.CHART_STATE.charts), true, '…with an empty chart list beside it');
  host.window[WINDOW_TARGET]('4H');
  eq(host.CHART_STATE.timeframe, '4H',
    'and the function exposed on window really does set the timeframe');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The byte-exact round trip');
// ─────────────────────────────────────────────────────────────────────────────
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, UNDO.BASE_CHARS, 'the base document is the pinned length');
  eq(sha256(fromGit), UNDO.BASE_SHA256, '…and the pinned hash');
  eq(APP_LOADER.parseScriptTags(fromGit).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying sixty-three local scripts');
  eq(UNDO.isApplied(INDEX), true, 'the live document carries this layer');
  eq(UNDO.isApplied(fromGit), false, '…and the base does not');
  eq(BASE, fromGit, 'the undo reconstructs the base BYTE FOR BYTE');
  eq(fromGit.slice(UNDO.RAW_AT, UNDO.RAW_END), MODULE + UNDO.SEPARATOR,
    '…and the raw range it puts back is the module plus its separator');
  eq(UNDO.SEPARATOR_AT, UNDO.RAW_END - 1, 'the separator is the LAST unit of the raw range');
  eq(fromGit[UNDO.SEPARATOR_AT], '\n', '…and it is a newline in the base document');
  eq(fromGit.slice(UNDO.RAW_AT, UNDO.SEPARATOR_AT), MODULE, '…so the body is everything before it');
  eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, UNDO.RAW_CHARS - TAG.length,
    'the arithmetic closes: 25,263 units out, 62 in');
  eq(sha256(fromGit.slice(UNDO.RAW_AT, UNDO.RAW_END)), UNDO.RAW_SHA256, 'the raw block hashes to its pin');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. Every documented failure, by its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const P = 'BACKEND_CANDLE_STORE_CHART_UNDO_';
  throwsWith(() => UNDO.undoBackendCandleStoreChart(null, MODULE), P + 'BAD_INPUT', 'a non-string document');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX, null), P + 'BAD_INPUT', 'a non-string module');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX, MODULE.slice(0, -1)),
    P + 'MODULE_IDENTITY', 'a truncated module');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX, MODULE + '\n'),
    P + 'MODULE_IDENTITY', 'a module that absorbed the separator is caught by size');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX, MODULE.slice(0, -2) + '\n}'),
    P + 'MODULE_SEPARATOR', 'a module whose final newline moved');
  // Isolates the HASH guard: same length, same bytes, same line count. Without
  // this the size guard answers for it and a disabled hash would be invisible.
  const sameSize = MODULE.replace('function closeChart', 'function clsseChart');
  eq(sameSize.length, MODULE.length, 'control — the isolating probe is the same length');
  eq(Buffer.byteLength(sameSize, 'utf8'), Buffer.byteLength(MODULE, 'utf8'), '…the same bytes');
  eq((sameSize.match(/\n/g) || []).length, UNDO.MODULE_LF, '…and the same line count');
  ok(sameSize !== MODULE, '…but not the same content');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX, sameSize),
    P + 'MODULE_IDENTITY', '…and the hash alone rejects it');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX.replace(TAG, ''), MODULE),
    P + 'TAG_IDENTITY', 'a document with the tag removed');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX.replace(TAG, TAG + TAG), MODULE),
    P + 'TAG_IDENTITY', 'a document with the tag duplicated');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    P + 'TAG_ADJACENCY', 'a reordered tag');
  throwsWith(() => UNDO.undoBackendCandleStoreChart(INDEX + ' ', MODULE),
    P + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document');
  // BASE_IDENTITY is the deliberate redundant gate the helper documents: once
  // both hashes have passed the result is a pure function of two fixed byte
  // strings, so no ordinary mutant reaches it. Asserted to exist, not triggered.
  ok(fs.readFileSync(path.join(ROOT, 'tests/lib/backend-candle-store-chart-undo.js'), 'utf8')
    .indexOf(P + 'BASE_IDENTITY') > 0, 'the final gate exists in the helper');
}

console.log('\n' + pass + ' assertions passed.');
