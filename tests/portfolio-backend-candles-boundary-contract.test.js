'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO BACKEND CANDLES — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #433 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/portfolio-backend-candles-undo.js
// reconstructs the pre-extraction document byte for byte. §9 runs that round
// trip and §10 exercises every documented failure.
//
// THE FINDING THIS FILE EXISTS TO KEEP EXECUTABLE: THE SCREEN AND THE BOUNDARY
// DISAGREE HERE, AND THE SCREEN IS WRONG.
//
// The banner-to-banner region this module was cut from, [1441121,1449999) in
// base coordinates, scored the LOWEST crossings of all 41 regions audit #433
// screened — one. It is also UNEXTRACTABLE. Its last 1,060 units are a dev-only
// console helper introduced by a TOP-LEVEL `if` that CALLS two
// monolith-declared functions. Module tags load BEFORE the inline monolith, so
// that `if` throws at load. §3 asserts BOTH halves — the whole region failing
// in an empty VM with that exact message, and this module loading in one —
// because either alone is a misleading fact.
//
// WHAT NARROWING COST AND BOUGHT, both measured in §3: it cost exactly one edge
// (the debug block's call became external, 1 → 2) and it dropped the monolith
// dependencies from THREE to ONE, because the two feature-flag functions were
// referenced only by the block left behind.
//
// THIS IS NOT THE DEAD RULE "regions end at their last declaration". That rule
// is pinned as dead in §6 of the seam contract against
// js/services/journal-backend-write-through.js, which ends on 4,878 units of
// trailing top-level code and DID move. The reason here is specific and
// asserted: what follows runs at load and depends on the monolith.
//
// A SEAM THAT IS NOT A BANNER IS NOT NEW — §8 measures it by peeling rather
// than recalling. Of the ELEVEN layers that record a single raw range, EIGHT
// have a banner seam and THREE do not: tt-reconnect, apex-post-auth-init and
// this one. The first two are followed immediately by another feature's code;
// this one by its OWN feature's debug block.
//
// COUPLING IS ZERO IN BOTH DIRECTIONS, and §6 says why that is worth stating
// twice: the inbound zero is VACUOUS — the module owns no binding for anything
// to write — so the outbound direction is measured separately, and it is zero
// on its own terms.
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
const UNDO = require('./lib/portfolio-backend-candles-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-backend-candles.js';
const TAG = '<script src="./js/portfolio/portfolio-backend-candles.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-rich-snapshot.js"></script>\n';
const INLINE_OPEN = '<script>';

const BASE_SHA = 'dd682ecd21613b8093c0effd8f42556df4a05c3e';
// Ratchet. The temporary audit is replaced ONE FOR ONE by this contract, so the
// count does not move: the undo helper is not a .test.js file.
const TEST_FILE_COUNT = 150;
const LOCAL_SCRIPT_COUNT = 66;
const AUDIT_REL = 'tests/temporary-portfolio-backend-candles-boundary-audit.test.js';

// Where the block sat in the monolith it was cut from.
const CODE_AT = 113705;
const RAW_AT_IN_CODE = 1441121;
const RAW_END_IN_CODE = 1448940;
const BODY_END_IN_CODE = 1448939;

// The part deliberately LEFT INLINE, and why.
const ENCLOSING_BANNER_END = 1450000;
const TRAILING_BLOCK_CHARS = 1060;
const TRAILING_BLOCK_CALLS = ['ffBackendCandlesPortfolioCharts', 'ffBackendCandleParityDebug'];
const WHOLE_REGION_LOAD_ERROR = 'ffBackendCandlesPortfolioCharts is not defined';
const WHOLE_REGION_EDGES = 1;

const OWNER = '_portfolioFetchBackendCandlesForChart';
const OWNER_COUNT = 1;
const OWNER_CHARS = 6905;
const OWNER_START = 912;

const EXTERNAL_EDGES = { _portfolioFetchBackendCandlesForChart: 2 };
const EXTERNAL_EDGE_TOTAL = 2;
const MARKUP_REFERENCES = 0;
const OUTBOUND_WRITES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

const MONOLITH_DEPENDENCIES = ['_recordCandleSubscriptionRequest'];
const SIBLING_DEPENDENCIES = {
  'js/api/backend-client.js': ['_backendAuthHeaders'],
  'js/config/backend-config.js': ['BACKEND'],
  'js/services/candle-normalization.js': ['_apexParityNormCandleArray', '_apexParityExtractBackendCandles'],
  'js/services/candle-auth-gate.js': ['_backendCandleGateOpen', '_backendCandleGateReason',
    '_noteBackendCandleFailure', '_noteBackendCandleSuccess', '_backendGateProvenanceSource'],
  'js/services/candle-provenance.js': ['_extractBackend4hDiag', '_recordCandleProvenance'],
};
const SIBLING_POSITIONS = {
  'js/api/backend-client.js': 4,
  'js/config/backend-config.js': 5,
  'js/services/candle-normalization.js': 18,
  'js/services/candle-auth-gate.js': 19,
  'js/services/candle-provenance.js': 20,
};
const VM_GLOBALS = 1;

// The candidates it was chosen over, in BASE monolith coordinates.
const RUNNER_UP = [1267671, 1278339];
const RUNNER_UP_CROSSINGS = 5;
const HELPER = [1254714, 1265508];
const HELPER_CROSSINGS = 6;
// Its neighbour past the enclosing banner: joining is decisively worse.
const NEXT_REGION = [1450000, 1486393];
const NEXT_REGION_CROSSINGS = 53;
const JOINED_CROSSINGS = 54;

// Seam shapes across the chain, measured by peeling.
const SEAM_LAYERS_MEASURED = 11;
const SEAM_IS_BANNER = 8;
const SEAM_NOT_BANNER = ['portfolio-backend-candles', 'tt-reconnect', 'apex-post-auth-init'];

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
function loadsBare(src, filename) {
  const sandbox = {};
  try { vm.createContext(sandbox); vm.runInContext(src, sandbox, { filename }); return null; }
  catch (e) { return String(e.message); }
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('PORTFOLIO BACKEND CANDLES — PERMANENT BOUNDARY CONTRACT');

const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// The journal snapshot prefetch was cut AFTER this layer, so the live document
// is no longer the one this contract shipped. Peel it first and assert against
// the document as it was when this layer landed.
const SNAPSHOT_PREFETCH_U = require('./lib/journal-snapshot-prefetch-undo.js');
const INDEX = SNAPSHOT_PREFETCH_U.isApplied(LIVE_INDEX)
  ? SNAPSHOT_PREFETCH_U.undoJournalSnapshotPrefetch(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/journal-snapshot-prefetch.js'), 'utf8'))
  : LIVE_INDEX;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const OWNERS = scanTopLevelDeclarations(MODULE);
const OWNED = new Set(OWNERS.map((d) => d.name));
// The reconstructed base, used wherever a measurement needs the pre-cut offsets.
const BASE = UNDO.undoPortfolioBackendCandles(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const BASE_FN_BODIES = functionBodyRanges(BASE_CODE);
const insideFunction = (i) => BASE_FN_BODIES.some((r) => i >= r.start && i <= r.end);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document and the module');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is the extracted document');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…and by UTF-8 byte length');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 7,818 units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…and by UTF-8 byte length');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-six local application scripts');
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
section('3. The module is the block’s bytes — and the JUDGEMENT that chose them');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the monolith sat at the pinned offset in the base');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MODULE,
    'the module is EXACTLY the bytes that were at [1441121,1448939)');
  eq(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + '\n',
    '…and the raw block is that body plus one LF');

  const chosenLimit = RAW_AT_IN_CODE + OWNERS[0].start + OWNERS[0].chars + 2;
  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, chosenLimit), BODY_END_IN_CODE,
    'snapBodyEnd reproduces the body end once the last construct is chosen');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the comment is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  // The whole banner region: BEST on the screen, and UNEXTRACTABLE. Both halves
  // are asserted, because either alone would mislead.
  const marks = topLevelBanners(BASE_CODE, BASE_FN_BODIES);
  ok(marks.indexOf(RAW_AT_IN_CODE) >= 0, 'the region opens on a top-level banner');
  eq(marks.indexOf(RAW_END_IN_CODE), -1, '…but its seam is NOT one');
  ok(marks.indexOf(ENCLOSING_BANNER_END) >= 0, '…while the enclosing region ends on one');
  const whole = BASE_CODE.slice(RAW_AT_IN_CODE, ENCLOSING_BANNER_END - 1);
  const wholeDecls = scanTopLevelDeclarations(whole);
  eq(wholeDecls.length, OWNER_COUNT, 'the whole region declares the same single owner');
  ok(statementLines(whole, wholeDecls).length > 0, '…but it also carries top-level statements');
  eq(loadsBare(whole, 'whole-region.js'), WHOLE_REGION_LOAD_ERROR,
    'and an empty VM REJECTS it, naming the monolith function its top-level `if` calls');
  eq(loadsBare(MODULE, MODULE_REL), null, 'while the module this layer shipped loads in one');
  eq(ENCLOSING_BANNER_END - RAW_END_IN_CODE, TRAILING_BLOCK_CHARS,
    'the block that stayed behind is 1,060 units');

  // The list of load-time calls must be COMPLETE, not merely non-empty.
  {
    const trailing = BASE_CODE.slice(RAW_END_IN_CODE, ENCLOSING_BANNER_END - 1);
    const tm = maskLiterals(trailing);
    const atLoad = new Set();
    for (const d of scanTopLevelDeclarations(BASE_CODE)) {
      for (const p of refSites(tm, d.name)) if (!insideFunction(RAW_END_IN_CODE + p)) atLoad.add(d.name);
    }
    eq(Array.from(atLoad).sort(), TRAILING_BLOCK_CALLS.slice().sort(),
      'those two are ALL the monolith names the trailing block reaches at load');
    ok(refSites(tm, OWNER).length > 0, 'control — the block does reference the owner too…');
    eq(refSites(tm, OWNER).every((p) => insideFunction(RAW_END_IN_CODE + p)), true,
      '…but only inside a function body, which is why it is not in that list');
  }

  // What narrowing cost, and what it bought.
  const wholeEdges = refSites(maskLiterals(BASE_CODE), OWNER)
    .filter((p) => p < RAW_AT_IN_CODE || p >= ENCLOSING_BANNER_END - 1).length;
  eq(wholeEdges, WHOLE_REGION_EDGES, 'the whole region would have cost ONE external edge');
  eq(EXTERNAL_EDGE_TOTAL - wholeEdges, 1, '…so narrowing cost exactly one more');

  eq(MODULE.slice(-2), '}\n', 'the module ends on a closing brace and a newline');
  eq(MODULE.endsWith('\n\n'), false, '…and not on a blank line');
  eq(isBlankOrComment(MODULE.slice(MODULE.lastIndexOf('\n', MODULE.length - 2) + 1)), false,
    '…its last line carries code');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. ONE owner');
// ─────────────────────────────────────────────────────────────────────────────
eq(OWNERS.length, OWNER_COUNT, 'the module declares exactly one name at top level');
eq(OWNERS[0].name, OWNER, '…and it is _portfolioFetchBackendCandlesForChart');
eq(OWNERS[0].chars, OWNER_CHARS, '…spanning 6,905 of the 7,818 units');
eq(OWNERS[0].start, OWNER_START, '…after 912 units of banner and comment');
eq(OWNERS[0].isAsync, true, '…and it is async');
eq(bindingNames(OWNERS), [], 'it owns no binding at all');
eq(OWNER_START + OWNER_CHARS + 1, UNDO.MODULE_CHARS,
  'banner + declaration + the single trailing newline is the whole module');
eq(CODE.indexOf('function ' + OWNER + '('), -1, 'the owner is no longer declared inline');

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
    'it depends on exactly ONE monolith name');
  // Narrowing the cut is what made it one: the two feature-flag functions the
  // whole region called at load are referenced only by the block left inline.
  for (const name of TRAILING_BLOCK_CALLS) {
    eq(referenced.has(name), false, name + ' is NOT referenced by the shipped module');
    ok(monolith.has(name), '…though the monolith still declares it');
  }

  const spans = OWNERS.map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of MONOLITH_DEPENDENCIES) for (const p of refSites(masked, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'and it is not read at evaluation time');

  const fromModules = {};
  for (const rel of LOCALS) {
    if (rel === MODULE_REL) continue;
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on eleven names from five sibling modules');
  for (const rel of Object.keys(SIBLING_POSITIONS)) {
    eq(LOCALS.indexOf(rel) + 1, SIBLING_POSITIONS[rel], rel + ' loads at its pinned position');
    ok(SIBLING_POSITIONS[rel] < LOCAL_SCRIPT_COUNT, '…which is before this module');
  }
  eq(LOCALS.indexOf(MODULE_REL) + 1, LOCAL_SCRIPT_COUNT, 'and this module 66th — after all five');
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
  eq(edges, EXTERNAL_EDGES, 'two references remain inline, over ONE name');
  eq(total, EXTERNAL_EDGE_TOTAL, '…matching what the audit predicted');

  // Call time is decided by FUNCTION BODY containment, not declaration spans:
  // one of the two sits inside a function EXPRESSION assigned by a top-level
  // `if`, which a declaration-span test would wrongly call evaluation time.
  const liveBodies = functionBodyRanges(CODE);
  const inLiveFn = (i) => liveBodies.some((r) => i >= r.start && i <= r.end);
  const sites = refSites(view.code, OWNER);
  eq(sites.filter((p) => inLiveFn(p)).length, EXTERNAL_EDGE_TOTAL,
    'both sit inside a function body — call time');
  ok(liveBodies.length > 100, 'control — the function-body index is populated, so that is a measurement');

  let markup = 0;
  for (const n of OWNED) markup += refSites(view.strings, n).length;
  eq(markup, MARKUP_REFERENCES, 'the owner is never named inside a string the monolith builds');
  ok(refSites(view.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  eq(bindingNames(OWNERS).length, 0, 'the module owns no binding, so inbound is vacuous');
  let inbound = 0;
  for (const n of bindingNames(OWNERS)) {
    for (const p of refSites(view.code, n)) if (isWriteAt(view.code, p, n)) inbound++;
  }
  eq(inbound, 0, '…and the count over an empty set is zero');

  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S, so it is not var-only');
  ok(monolithBindings.size > 200, '…and is the whole set, not an empty one');
  const moduleMasked = maskLiterals(MODULE);
  const outbound = {};
  for (const n of monolithBindings) {
    if (OWNED.has(n)) continue;
    for (const p of refSites(moduleMasked, n)) {
      if (isWriteAt(moduleMasked, p, n)) outbound[n] = (outbound[n] || 0) + 1;
    }
  }
  eq(outbound, {}, 'and it writes NO binding it does not own — zero in BOTH directions');
  eq(Object.keys(outbound).length, OUTBOUND_WRITES, '…the figure the audit predicted');

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
  eq(bare[OWNER].constructor.name, 'AsyncFunction', '…an async function');
  eq(bare[OWNER].length, 1, '…of arity one');
}

// The behavioural half runs asynchronously; assertions are counted the same way.
const behaviour = (async () => {
  section('7b. …driven, not merely loaded');
  const host = (gateOpen, calls) => {
    const h = {
      console: { log() {}, warn() {}, error() {} },
      BACKEND: { base: 'https://example.invalid' },
      _backendAuthHeaders: () => ({}),
      _backendCandleGateOpen: () => gateOpen,
      _backendCandleGateReason: () => 'gate_closed',
      _noteBackendCandleFailure: () => {}, _noteBackendCandleSuccess: () => {},
      _backendGateProvenanceSource: () => 'stub',
      _apexParityNormCandleArray: (a) => (a || []),
      _apexParityExtractBackendCandles: () => [],
      _extractBackend4hDiag: () => null, _recordCandleProvenance: () => {},
      _recordCandleSubscriptionRequest: () => {},
      fetch: async () => { calls.push('fetch'); return { ok: true, status: 200, json: async () => ({}) }; },
      AbortSignal: { timeout: () => ({}) },
      Date, Math, JSON, isNaN, parseFloat, parseInt, Object, Array, Promise, String, Number,
      AbortController, setTimeout, clearTimeout,
    };
    vm.createContext(h);
    vm.runInContext(MODULE, h, { filename: MODULE_REL });
    return h;
  };

  // Every dependency is resolved at CALL time: the empty VM loads it, and only
  // calling it fails — naming a SIBLING module's export, not a monolith name.
  const empty = {};
  vm.createContext(empty);
  vm.runInContext(MODULE, empty, { filename: MODULE_REL });
  const rejected = await empty[OWNER]('SPY').then(() => null, (e) => e);
  // Not `instanceof ReferenceError`: the error is constructed inside the VM, so
  // a cross-realm instanceof is false even for exactly the expected error.
  eq(rejected.constructor.name, 'ReferenceError',
    'calling it in the empty VM REJECTS — it does not fail at load');
  eq(rejected.message, '_backendCandleGateOpen is not defined',
    '…naming the first sibling dependency it reaches');

  // The auth gate is honoured BEFORE any network call — the contrast is the
  // assertion: a module that ignored the gate would still resolve, but fetch.
  const closedCalls = [];
  const closed = await host(false, closedCalls)[OWNER]('SPY');
  eq(closed.ok, false, 'with the candle gate CLOSED it reports failure');
  eq(closed.fallbackReason, 'gate_closed', '…with the gate’s own reason');
  eq(closedCalls.length, 0, '…and attempts NO network call at all');

  const openCalls = [];
  await host(true, openCalls)[OWNER]('SPY');
  ok(openCalls.length > 0, 'with the gate OPEN it does reach the network — so that zero is a measurement');
})();

// ─────────────────────────────────────────────────────────────────────────────
section('8. What it was chosen over, the split rule, and the seam shape');
// ─────────────────────────────────────────────────────────────────────────────
{
  const view = lexicalViews(BASE_CODE);
  const baseBindings = new Set(bindingNames(scanTopLevelDeclarations(BASE_CODE)));
  function measure(at, end) {
    const ds = scanTopLevelDeclarations(BASE_CODE.slice(at, end));
    const names = new Set(ds.map((d) => d.name));
    let edges = 0;
    for (const n of names) for (const p of refSites(view.code, n)) if (p < at || p >= end) edges++;
    const bm = view.code.slice(at, end);
    let out = 0;
    for (const n of baseBindings) {
      if (names.has(n)) continue;
      for (const p of refSites(bm, n)) if (isWriteAt(bm, p, n)) out++;
    }
    return { owners: ds.length, edges, out, crossings: edges + out };
  }
  eq(measure(RAW_AT_IN_CODE, BODY_END_IN_CODE).crossings, EXTERNAL_EDGE_TOTAL + OUTBOUND_WRITES,
    'the cut that shipped costs TWO crossings');

  // Both comparison ranges must be anchored to REAL top-level marks, or a
  // one-unit shift of either end changes nothing and the constant pins nothing.
  // That survivor appeared in #429, #430, #431 and #433; it stays anchored.
  const marks = topLevelBanners(BASE_CODE, BASE_FN_BODIES);
  for (const [lo, hi, what] of [[RUNNER_UP[0], RUNNER_UP[1], 'the runner-up'],
                                [HELPER[0], HELPER[1], 'the snapshot helper']]) {
    ok(marks.indexOf(lo) >= 0, what + ' opens on a real top-level banner at ' + lo);
    ok(marks.indexOf(hi + 1) >= 0, '…and its seam is the banner one unit past ' + hi);
    eq(snapBodyEnd(BASE_CODE, lo, hi + 1), hi, '…so snapBodyEnd reproduces that end exactly');
  }
  eq(measure(RUNNER_UP[0], RUNNER_UP[1]).crossings, RUNNER_UP_CROSSINGS,
    'the targeted DXLink fetch — the runner-up — costs five');
  eq(measure(HELPER[0], HELPER[1]).crossings, HELPER_CROSSINGS,
    'the Journal snapshot helper costs six, as #431 recorded');

  // The split rule, per family.
  for (const at of NEXT_REGION) ok(marks.indexOf(at) >= 0, 'the neighbour is banner-bounded at ' + at);
  eq(measure(NEXT_REGION[0], NEXT_REGION[1]).crossings, NEXT_REGION_CROSSINGS,
    'the region past the enclosing banner costs fifty-three alone');
  eq(measure(RAW_AT_IN_CODE, NEXT_REGION[1]).crossings, JOINED_CROSSINGS,
    '…and joined with this cut, fifty-four');
  ok(JOINED_CROSSINGS > (EXTERNAL_EDGE_TOTAL + OUTBOUND_WRITES) * 25,
    'so joining is more than twenty-five times worse — measured, not assumed');

  // THE SEAM SHAPE over the whole chain, by peeling. This layer makes THREE.
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const CHAIN = [
    ['portfolio-backend-candles', 'portfolio-backend-candles-undo.js', MODULE_REL, 'undoPortfolioBackendCandles', true],
    ['journal-rich-snapshot', 'journal-rich-snapshot-undo.js', 'js/services/journal-rich-snapshot.js', 'undoJournalRichSnapshot', true],
    ['backend-candle-store-chart', 'backend-candle-store-chart-undo.js', 'js/ui/backend-candle-store-chart.js', 'undoBackendCandleStoreChart', true],
    ['portfolio-traffic-light', 'portfolio-traffic-light-undo.js', 'js/portfolio/portfolio-traffic-light.js', 'undoPortfolioTrafficLight', true],
    ['portfolio-expiry-manual', 'portfolio-expiry-manual-undo.js', 'js/portfolio/portfolio-expiry-manual.js', 'undoPortfolioExpiryManual', true],
    ['backend-portfolios', 'backend-portfolios-undo.js', 'js/portfolio/backend-portfolios.js', 'undoBackendPortfolios', true],
    ['portfolio-data-fetch', 'portfolio-data-fetch-undo.js', 'js/portfolio/portfolio-data-fetch.js', 'undoPortfolioDataFetch', true],
    ['journal-trade-detail', 'journal-trade-detail-undo.js', 'js/ui/journal-trade-detail.js', 'undoJournalTradeDetail', true],
    ['journal-trade-forms', 'journal-trade-forms-undo.js', 'js/ui/journal-trade-forms.js', 'undoJournalTradeForms', false],
    ['journal-close-legs', 'journal-close-legs-undo.js', 'js/ui/journal-close-legs.js', 'undoJournalCloseLegs', true],
    ['tt-reconnect', 'tt-reconnect-undo.js', 'js/ui/tt-reconnect.js', 'undoTtReconnect', true],
    ['apex-post-auth-init', 'apex-post-auth-init-undo.js', 'js/services/apex-post-auth-init.js', 'undoApexPostAuthInit', true],
  ];
  let doc = INDEX;
  let measured = 0, bannerSeam = 0;
  const notBanner = [];
  for (const [name, undoFile, modRel, fn, records] of CHAIN) {
    const U = require('./lib/' + undoFile);
    doc = U[fn](doc, read(modRel));
    if (!records) continue;
    const code = APP_LOADER.parseScriptTags(doc).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
    const codeAt = doc.indexOf(code);
    const m = topLevelBanners(code, functionBodyRanges(code));
    measured++;
    ok(m.indexOf(U.RAW_AT - codeAt) >= 0, name + ' opens on a top-level banner');
    if (m.indexOf(U.RAW_END - codeAt) >= 0) bannerSeam++; else notBanner.push(name);
  }
  eq(measured, SEAM_LAYERS_MEASURED, 'eleven layers record a single raw range and were measured');
  eq(bannerSeam, SEAM_IS_BANNER, 'EIGHT of them have a seam that IS a top-level banner');
  eq(notBanner, SEAM_NOT_BANNER, '…and THREE do not, this layer among them');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The byte-exact round trip');
// ─────────────────────────────────────────────────────────────────────────────
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, UNDO.BASE_CHARS, 'the base document is the pinned length');
  eq(sha256(fromGit), UNDO.BASE_SHA256, '…and the pinned hash');
  eq(APP_LOADER.parseScriptTags(fromGit).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying sixty-five local scripts');
  // BASE_SHA must name THIS layer's base, not merely SOME commit with the same
  // index.html: the audit PR changed only tests/, so its parent carries a
  // byte-identical document. What separates them is the audit file itself.
  // stdio 'pipe' on stderr too: the negative case is EXPECTED to fail, and a
  // stray `fatal:` on the console would read like a broken suite in CI logs.
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
    'the arithmetic closes: 7,819 units out, 68 in');
  eq(sha256(fromGit.slice(UNDO.RAW_AT, UNDO.RAW_END)), UNDO.RAW_SHA256, 'the raw block hashes to its pin');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Every documented failure, by its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const P = 'PORTFOLIO_BACKEND_CANDLES_UNDO_';
  const undo = UNDO.undoPortfolioBackendCandles;
  throwsWith(() => undo(null, MODULE), P + 'BAD_INPUT', 'a non-string document');
  throwsWith(() => undo(INDEX, null), P + 'BAD_INPUT', 'a non-string module');
  throwsWith(() => undo(INDEX, MODULE.slice(0, -1)), P + 'MODULE_IDENTITY', 'a truncated module');
  throwsWith(() => undo(INDEX, MODULE + '\n'),
    P + 'MODULE_IDENTITY', 'a module that absorbed the separator is caught by size');
  throwsWith(() => undo(INDEX, MODULE.slice(0, -2) + '\n}'),
    P + 'MODULE_SEPARATOR', 'a module whose final newline moved');
  // Isolates the HASH guard: same length, same bytes, same line count.
  const sameSize = MODULE.replace('_apexParityNormCandleArray', '_apexParityNormCandleArrey');
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
  ok(fs.readFileSync(path.join(ROOT, 'tests/lib/portfolio-backend-candles-undo.js'), 'utf8')
    .indexOf(P + 'BASE_IDENTITY') > 0, 'the final gate exists in the helper');
}

behaviour.then(() => {
  console.log('\n' + pass + ' assertions passed.');
}, (e) => {
  console.error(e);
  process.exit(1);
});
