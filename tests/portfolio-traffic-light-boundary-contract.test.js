'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO ALIGNMENT + ROW TRAFFIC LIGHT — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #427 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/portfolio-traffic-light-undo.js
// reconstructs the pre-extraction document byte for byte. §8 runs that round
// trip and §9 exercises every documented failure.
//
// THE REGION SPANS A `// ══` FEATURE HEADER — and that is NOT what makes it
// unusual. A draft of this header said it was. Measured over the eighteen
// prior modules, SIX already carry a column-0 `// ══` header and SIXTEEN carry
// a `// ── ` banner, so a shipped region containing a mark is the norm, not the
// exception. §3 asserts both counts rather than repeating the claim.
//
// What is actually new is WHY the mark was crossed: audit #427 measured the
// cost of stopping at it. The monolith presents two features here, and cutting
// between them is the expensive move:
//
//     taken separately   16 external executable edges over 13 names
//     taken together      6 external executable edges over  3 names
//
// The halves are mutually recursive — the alignment engine calls SEVEN of the
// traffic light's owners, the traffic light calls THREE of the alignment
// engine's — so a rule that stopped at the next banner would have made this cut
// almost three times worse. §5 keeps that measurement executable now that the
// audit which found it is deleted, because a rejection that lives only in a
// deleted file is a rejection that gets made again.
//
// journal-trade-detail already spanned a `// ── ` section banner, so this is
// the same lesson one level up rather than a new kind of boundary. No ordinal
// is claimed anywhere in this file.
//
// WHY IT COULD BE TAKEN AT ALL. `evaluationTimeReads` over the block returns the
// EMPTY LIST: twenty-six top-level declarations, ZERO top-level statement lines,
// so nothing runs at load. It depends on seventeen names the monolith declares —
// `S` among them, the same `const` that disqualified audit #424's swing
// candidate — but every reference sits inside a declaration and resolves at CALL
// time. §6 measures that distinction rather than asserting it, because it is the
// only thing separating this region from the one that was rejected.
//
// SIBLING DEPENDENCIES ARE PINNED BY LOAD POSITION. It takes smA and
// calcRSIWilder from js/utils/indicators.js and buildStreamerSymbol from
// js/utils/option-symbols.js, which load at positions 1 and 2 against this
// module's 63. #423 shipped a module whose sibling dependencies nothing pinned,
// and a tag reorder would have broken it silently; §6 does not repeat that.
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
} = require('./lib/eic-contract-guards.js');
const { isBlankOrComment, snapBodyEnd, assertSeam, bindingNames, evaluationTimeReads } =
  require('./lib/extraction-boundary.js');
const UNDO = require('./lib/portfolio-traffic-light-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-traffic-light.js';
const TAG = '<script src="./js/portfolio/portfolio-traffic-light.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-expiry-manual.js"></script>\n';
const INLINE_OPEN = '<script>';

const BASE_SHA = 'ea34e52fe9655caa45c41d272f3a61ab9fe00eeb';
// Ratchet. The temporary audit is replaced ONE FOR ONE by this contract, so the
// count does not move: the undo helper is not a .test.js file.
const TEST_FILE_COUNT = 147;
const LOCAL_SCRIPT_COUNT = 63;
const AUDIT_REL = 'tests/temporary-portfolio-traffic-light-boundary-audit.test.js';

// Where the block sat in the base document, and in the monolith it was cut from.
const RAW_AT_IN_CODE = 991380;
const RAW_END_IN_CODE = 1063192;
const BODY_END_IN_CODE = 1063191;
const CODE_AT = 113514;
// The split point IS this header. A separate constant duplicated it and survived
// mutation — a pin that checks nothing — so §5 measures the split at this offset.
const SPANNED_HEADER_AT = 1011292;

const OWNER_COUNT = 26;
const OWNER_SPAN_SUM = 67659;
const OWNED_BINDING = 'VOL_DELTA_TOLERANCE';

const EXTERNAL_EDGES = { _pfUpdateAlignment: 1, _pfRefreshAllRowTrafficLights: 4,
  _pfComputeAndRenderRowTrafficLight: 1 };
const EXTERNAL_EDGE_TOTAL = 6;
const SPLIT_EDGE_TOTAL = 16;
const SPLIT_EDGE_NAMES = 13;
const CROSSINGS_INTO_ALIGNMENT = 3;
const CROSSINGS_INTO_TRAFFIC = 7;

const OUTBOUND_BINDING = '_pfAlignmentCache';
const OUTBOUND_WRITES = 2;

const MONOLITH_DEPENDENCIES = ['S', '_activePanelPortfolioId', '_fmtShortLegDelta',
  '_pfAlignmentCache', '_pfBackendCandleCache', '_pfDeltaLongThreshold',
  '_pfDeltaShortThreshold', '_pfNormalizeChartUnderlyingSymbol',
  '_portfolioLegEffectiveQty', '_portfolioTechnicalDebugEnabled', 'escHtml',
  'ffPortfolioTechnicalFrontendFallback', 'getDailyCandles', 'getFourHourCandles',
  'getPortfolioUnderlyingIvr', 'isActivePortfolioLeg', 'positionManager'];
const SIBLING_DEPENDENCIES = {
  'js/utils/indicators.js': ['smA', 'calcRSIWilder'],
  'js/utils/option-symbols.js': ['buildStreamerSymbol'],
};
// The eighteen layers shipped before this one, oldest first. §3 measures how
// many of them already contain a banner or a header, so the claim that this
// region is unusual for spanning one cannot be made from a partial look again.
const PRIOR_CHAIN = [
  'js/services/journal-core.js', 'js/services/mcx-regime-policy.js', 'js/ui/journal-ui.js',
  'js/services/journal-remote-persistence.js', 'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js', 'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js', 'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js', 'js/ui/tt-reconnect.js', 'js/ui/journal-close-legs.js',
  'js/ui/journal-trade-forms.js', 'js/ui/journal-trade-detail.js',
  'js/portfolio/portfolio-data-fetch.js', 'js/portfolio/backend-portfolios.js',
  'js/portfolio/portfolio-expiry-manual.js',
];
const INDICATORS_POSITION = 1;
const OPTION_SYMBOLS_POSITION = 2;

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
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('PORTFOLIO ALIGNMENT + ROW TRAFFIC LIGHT — PERMANENT BOUNDARY CONTRACT');

const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// The candle-store chart pair was cut AFTER this layer, so the live document is
// no longer the one this contract shipped. Peel it first.
const CANDLE_CHART_U = require('./lib/backend-candle-store-chart-undo.js');
const INDEX = CANDLE_CHART_U.isApplied(LIVE_INDEX)
  ? CANDLE_CHART_U.undoBackendCandleStoreChart(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/ui/backend-candle-store-chart.js'), 'utf8'))
  : LIVE_INDEX;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const OWNERS = scanTopLevelDeclarations(MODULE);
const OWNED = new Set(OWNERS.map((d) => d.name));

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document and the module');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is the extracted document');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…and by UTF-8 byte length');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 71,811 units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…confirmed by hash');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…and by UTF-8 byte length');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-three local application scripts');
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
  // Reconstruct the base and check the cut against it, rather than trusting the
  // offsets this file carries.
  const base = UNDO.undoPortfolioTrafficLight(INDEX, MODULE);
  const baseCode = APP_LOADER.parseScriptTags(base).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  eq(base.indexOf(baseCode), CODE_AT, 'the monolith sat at the pinned offset in the base');
  eq(baseCode.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MODULE,
    'the module is EXACTLY the bytes that were at [991380,1063191)');
  eq(baseCode.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + '\n',
    '…and the raw block is that body plus one LF');

  // The seam, through the shared guard — the same call Phase 2 made.
  eq(snapBodyEnd(baseCode, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd reproduces the body end');
  eq(assertSeam(baseCode, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary and resumes at the next feature');
  throwsWith(() => assertSeam(baseCode, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
  throwsWith(() => assertSeam(baseCode, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  // THE HEADER THE REGION SPANS — the reason no banner rule finds this boundary.
  const rel = SPANNED_HEADER_AT - RAW_AT_IN_CODE;
  ok(rel > 0 && rel < MODULE.length, 'a `// ══` feature header sits INSIDE the module');
  eq(MODULE.slice(rel, rel + 5), '// ══', '…and it is a real header, at column 0');
  ok(MODULE.slice(rel, rel + 200).indexOf('PORTFOLIO ROW TRAFFIC LIGHT') > 0,
    '…naming the second half of the feature');
  eq(MODULE[rel - 1], '\n', '…at a line start, so a banner scan would have found it');
  ok(baseCode.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + 80).indexOf('ADD POSITION FORM') > 0,
    'and what follows the seam is a different feature');

  // Containing a mark is the NORM, measured over the whole chain rather than
  // inferred from the layers nearest to hand — which is how a draft of this
  // file's header came to call it unusual.
  const withHeader = PRIOR_CHAIN.filter((rel) => /^\/\/ ══/m.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
  const withBanner = PRIOR_CHAIN.filter((rel) => /^[ \t]*\/\/ ── /m.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
  eq(PRIOR_CHAIN.length, 18, 'eighteen layers shipped before this one');
  eq(withHeader.length, 6, 'SIX of them already contain a column-0 `// ══` header');
  eq(withBanner.length, 16, '…and sixteen contain a `// ── ` banner');
  ok(withHeader.indexOf('js/ui/journal-ui.js') >= 0,
    'control — the header scan really matched, and named a layer that has one');

  // The module ends on code, so `git diff --check` sees no blank line at EOF.
  eq(MODULE.slice(-2), '}\n', 'the module ends on a closing brace and a newline');
  eq(MODULE.endsWith('\n\n'), false, '…and not on a blank line');
  const lastLine = MODULE.slice(MODULE.lastIndexOf('\n', MODULE.length - 2) + 1);
  eq(isBlankOrComment(lastLine), false, '…its last line carries code');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The twenty-six owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(OWNERS.length, OWNER_COUNT, 'the module declares twenty-six names at top level');
eq(OWNERS.reduce((a, d) => a + d.chars, 0), OWNER_SPAN_SUM, '…spanning 67,659 units');
eq(bindingNames(OWNERS), [OWNED_BINDING], 'exactly one is a binding rather than a function');
eq(OWNERS.filter((d) => d.isAsync).length, 0, 'not one owner is async');
eq((MODULE.match(/\basync function\b/g) || []).length, 0, '…confirmed textually too');
{
  // Nothing is left behind: every owner is gone from the monolith, and the
  // residue of the module is empty — it is declarations and nothing else.
  const view = lexicalViews(CODE);
  let leftInline = 0;
  for (const d of OWNERS) if (CODE.indexOf('function ' + d.name + '(') >= 0) leftInline++;
  eq(leftInline, 0, 'no owner is still declared inline');
  const ch = Array.from(MODULE);
  for (const d of OWNERS) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
  eq(ch.join('').split('\n').filter((l) => !isBlankOrComment(l)).length, 0,
    'ZERO top-level statement lines — the module runs nothing at load');
  ok(refSites(view.code, '_pfAlignmentCache').length > 0,
    'control — the monolith view is populated, so the zeros above are measurements');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE SPLIT COST — audit #427’s finding, kept executable');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The audit that measured this is deleted by this PR. A rejection that lives
  // only in a deleted file is a rejection someone makes again, so it is pinned
  // here against the reconstructed base.
  const base = UNDO.undoPortfolioTrafficLight(INDEX, MODULE);
  const baseCode = APP_LOADER.parseScriptTags(base).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  const view = lexicalViews(baseCode);

  function edges(at, end) {
    const names = new Set(scanTopLevelDeclarations(baseCode.slice(at, end)).map((d) => d.name));
    const seen = {};
    let total = 0;
    for (const n of names) {
      for (const p of refSites(view.code, n)) {
        if (p < at || p >= end) { seen[n] = (seen[n] || 0) + 1; total++; }
      }
    }
    return { names: Object.keys(seen).length, total };
  }
  const whole = edges(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(whole.total, EXTERNAL_EDGE_TOTAL, 'taken together the region costs six external edges');
  eq(whole.names, Object.keys(EXTERNAL_EDGES).length, '…over three names');

  const A = edges(RAW_AT_IN_CODE, SPANNED_HEADER_AT);
  const B = edges(SPANNED_HEADER_AT, RAW_END_IN_CODE);
  eq(A.total + B.total, SPLIT_EDGE_TOTAL, 'split at the header it would cost SIXTEEN');
  eq(A.names + B.names, SPLIT_EDGE_NAMES, '…over thirteen names');
  ok(A.total + B.total > EXTERNAL_EDGE_TOTAL * 2, 'more than twice the joint cut');

  // And the reason, measured in both directions.
  function crossings(fromAt, fromEnd, intoAt, intoEnd) {
    const names = new Set(scanTopLevelDeclarations(baseCode.slice(fromAt, fromEnd)).map((d) => d.name));
    let n = 0;
    for (const name of names) {
      for (const p of refSites(view.code, name)) if (p >= intoAt && p < intoEnd) n++;
    }
    return n;
  }
  eq(crossings(RAW_AT_IN_CODE, SPANNED_HEADER_AT, SPANNED_HEADER_AT, RAW_END_IN_CODE), CROSSINGS_INTO_ALIGNMENT,
    'the traffic light calls three of the alignment engine’s owners');
  eq(crossings(SPANNED_HEADER_AT, RAW_END_IN_CODE, RAW_AT_IN_CODE, SPANNED_HEADER_AT), CROSSINGS_INTO_TRAFFIC,
    '…and the alignment engine calls seven of the traffic light’s');
  eq(CROSSINGS_INTO_ALIGNMENT + CROSSINGS_INTO_TRAFFIC, SPLIT_EDGE_TOTAL - EXTERNAL_EDGE_TOTAL,
    'those ten crossings are exactly the edges the joint cut removes');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Can it be a module — the test the swing block failed');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(MODULE, OWNERS, maskLiterals), [],
    'NOTHING is read at evaluation time — the list is empty');
  const probe = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals),
    ['elsewhere', 'window'], 'control — on a region that DOES read at load, the same call reports it');

  const monolith = new Map(scanTopLevelDeclarations(CODE).map((d) => [d.name, d.form]));
  const masked = maskLiterals(MODULE);
  const referenced = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) if (!OWNED.has(m[2])) referenced.add(m[2]);
  eq(Array.from(referenced).filter((n) => monolith.has(n)).sort(), MONOLITH_DEPENDENCIES,
    'it depends on exactly these seventeen monolith names');
  eq(monolith.get('S'), 'const', 'S among them is the const no module can supply');

  // Every one of those references is inside a declaration, so all resolve at
  // call time. That, not the dependency list, is why this cut is safe.
  const spans = OWNERS.map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of MONOLITH_DEPENDENCIES) for (const p of refSites(masked, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'not one of them is read at evaluation time');

  // Sibling modules, pinned by load position.
  const fromModules = {};
  for (const rel of LOCALS) {
    if (rel === MODULE_REL) continue;
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on three names from two sibling modules');
  eq(LOCALS.indexOf('js/utils/indicators.js') + 1, INDICATORS_POSITION, 'indicators loads first');
  eq(LOCALS.indexOf('js/utils/option-symbols.js') + 1, OPTION_SYMBOLS_POSITION, 'option-symbols second');
  eq(LOCALS.indexOf(MODULE_REL) + 1, LOCAL_SCRIPT_COUNT, 'and this module 63rd — after both');
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
  eq(edges, EXTERNAL_EDGES, 'six references remain inline, over three names');
  eq(total, EXTERNAL_EDGE_TOTAL, '…six in total, matching what the audit predicted');

  // All at call time: an evaluation-time call would run before the module loads.
  const spans = scanTopLevelDeclarations(CODE).map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of Object.keys(EXTERNAL_EDGES)) for (const p of refSites(view.code, n)) if (outside(p)) evalTime++;
  eq(evalTime, 0, 'every one sits inside a declaration');

  // Nothing reaches an owner through generated markup — the edge an executable
  // count cannot see, and the one manual expiry had.
  let inStrings = 0;
  for (const n of OWNED) inStrings += refSites(view.strings, n).length;
  eq(inStrings, 0, 'no owner is named inside a string the monolith builds');
  ok(refSites(view.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  // INBOUND: nothing outside writes the one binding the module owns.
  let inbound = 0;
  for (const p of refSites(view.code, OWNED_BINDING)) if (isWriteAt(view.code, p, OWNED_BINDING)) inbound++;
  eq(inbound, 0, 'nothing inline writes VOL_DELTA_TOLERANCE');
  // Controls for the write detector: every write this module performs is BY KEY,
  // so the direct-assignment branch is not exercised by the data and the zero
  // above would survive a detector that had lost it.
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  // OUTBOUND: the one binding the module writes without owning, scanned over
  // var, const AND let — the var-only scan is what missed `S` in audit #424.
  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S');
  const moduleMasked = maskLiterals(MODULE);
  const outbound = {};
  for (const n of monolithBindings) {
    if (OWNED.has(n)) continue;
    for (const p of refSites(moduleMasked, n)) {
      if (isWriteAt(moduleMasked, p, n)) outbound[n] = (outbound[n] || 0) + 1;
    }
  }
  eq(outbound, { [OUTBOUND_BINDING]: OUTBOUND_WRITES },
    'it writes exactly one binding it does not own, twice');
  const writes = refSites(moduleMasked, OUTBOUND_BINDING)
    .filter((p) => isWriteAt(moduleMasked, p, OUTBOUND_BINDING))
    .map((p) => MODULE[p + OUTBOUND_BINDING.length]);
  eq(writes, ['[', '['], 'both writes are BY KEY, never rebindings of the name');
  const declared = scanTopLevelDeclarations(CODE).filter((d) => d.name === OUTBOUND_BINDING);
  eq(declared.length, 1, 'the cache stays declared in the monolith, exactly once');
  eq(declared[0].form, 'var', '…as a var, so the module resolves it at call time');
  eq(declared[0].start, 935029, '…at the offset the undo helper’s header names');
  ok(declared[0].start < RAW_AT_IN_CODE, '…which is before this region, so the cut did not move it');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads, and it still works');
// ─────────────────────────────────────────────────────────────────────────────
{
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  eq(Object.keys(sandbox).length, OWNER_COUNT, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(sandbox).sort(), Array.from(OWNED).sort(), '…defining exactly its owners');

  // Drive the pure ones. A module that loads is not a module that works, and
  // #423 shipped a relocation whose behaviour nothing had exercised.
  const ranges = sandbox.getStructureScaledDeltaRanges(1);
  ok(ranges && typeof ranges === 'object', 'getStructureScaledDeltaRanges returns a table');
  const doubled = sandbox.getStructureScaledDeltaRanges(2);
  const k = Object.keys(ranges).find((n) => typeof ranges[n] === 'number' && ranges[n] !== 0);
  ok(k !== undefined, '…with numeric thresholds in it');
  eq(doubled[k], ranges[k] * 2, '…and they scale with the structure count, as the name says');
  eq(sandbox.getStructureScaledDeltaRanges(0)[k], ranges[k],
    'a zero count is clamped to one rather than collapsing the table');
  eq(typeof sandbox.VOL_DELTA_TOLERANCE, 'number', 'the one binding is a number');
  eq(typeof sandbox.classifyPortfolioDeltaExposure, 'function', 'the classifier is callable');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The byte-exact round trip');
// ─────────────────────────────────────────────────────────────────────────────
{
  const base = git(['show', BASE_SHA + ':index.html']);
  eq(base.length, UNDO.BASE_CHARS, 'the base document is the pinned length');
  eq(sha256(base), UNDO.BASE_SHA256, '…and the pinned hash');
  eq(APP_LOADER.parseScriptTags(base).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying sixty-two local scripts');
  eq(UNDO.isApplied(INDEX), true, 'the live document carries this layer');
  eq(UNDO.isApplied(base), false, '…and the base does not');
  eq(UNDO.undoPortfolioTrafficLight(INDEX, MODULE), base,
    'the undo reconstructs the base BYTE FOR BYTE');
  eq(base.slice(UNDO.RAW_AT, UNDO.RAW_END), MODULE + UNDO.SEPARATOR,
    '…and the raw range it puts back is the module plus its separator');
  // SEPARATOR_AT was exported and never asserted: a mutation of it survived.
  eq(UNDO.SEPARATOR_AT, UNDO.RAW_END - 1, 'the separator is the LAST unit of the raw range');
  eq(base[UNDO.SEPARATOR_AT], '\n', '…and it is a newline in the base document');
  eq(base.slice(UNDO.RAW_AT, UNDO.SEPARATOR_AT), MODULE, '…so the body is everything before it');
  eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, UNDO.RAW_CHARS - TAG.length,
    'the arithmetic closes: 71,812 units out, 66 in');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Every documented failure, by its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const P = 'PORTFOLIO_TRAFFIC_LIGHT_UNDO_';
  throwsWith(() => UNDO.undoPortfolioTrafficLight(null, MODULE), P + 'BAD_INPUT', 'a non-string document');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX, null), P + 'BAD_INPUT', 'a non-string module');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX, MODULE.slice(0, -1)),
    P + 'MODULE_IDENTITY', 'a truncated module');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX, MODULE + '\n'),
    P + 'MODULE_IDENTITY', 'a module that absorbed the separator is caught by size');
  // Same length, same bytes, same line count — but it no longer ends on code.
  // This is the only shape that reaches the separator guard.
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX, MODULE.slice(0, -2) + '\n}'),
    P + 'MODULE_SEPARATOR', 'a module whose final newline moved');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX,
    MODULE.replace('function getIvrDeltaRange', 'function getIvrDeltaRangeX')),
    P + 'MODULE_IDENTITY', 'a mutated module of the right size');
  // The probe above is one unit longer, so the SIZE guard answers for it and a
  // disabled hash check would be invisible. This one is the same length, the
  // same bytes and the same line count, so only the hash can reject it.
  const sameSize = MODULE.replace('getIvrDeltaRange', 'getIvrDeltaRagne');
  eq(sameSize.length, MODULE.length, 'control — the isolating probe is the same length');
  eq(Buffer.byteLength(sameSize, 'utf8'), Buffer.byteLength(MODULE, 'utf8'), '…the same bytes');
  eq((sameSize.match(/\n/g) || []).length, UNDO.MODULE_LF, '…and the same line count');
  ok(sameSize !== MODULE, '…but not the same content');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX, sameSize),
    P + 'MODULE_IDENTITY', '…and the hash alone rejects it');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX.replace(TAG, ''), MODULE),
    P + 'TAG_IDENTITY', 'a document with the tag removed');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX.replace(TAG, TAG + TAG), MODULE),
    P + 'TAG_IDENTITY', 'a document with the tag duplicated');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    P + 'TAG_ADJACENCY', 'a reordered tag');
  throwsWith(() => UNDO.undoPortfolioTrafficLight(INDEX + ' ', MODULE),
    P + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document');
  // BASE_IDENTITY is the deliberate redundant gate the helper documents: once
  // both hashes have passed, the result is a pure function of two fixed byte
  // strings, so no ordinary mutant reaches it. It is asserted to exist rather
  // than triggered, and this contract says so instead of pretending otherwise.
  ok(fs.readFileSync(path.join(ROOT, 'tests/lib/portfolio-traffic-light-undo.js'), 'utf8')
    .indexOf(P + 'BASE_IDENTITY') > 0, 'the final gate exists in the helper');
}

console.log('\n' + pass + ' assertions passed.');
