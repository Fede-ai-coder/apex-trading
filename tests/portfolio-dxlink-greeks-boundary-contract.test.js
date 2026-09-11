'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DXLINK GREEKS — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #437 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/portfolio-dxlink-greeks-undo.js
// reconstructs the pre-extraction document byte for byte. §8 runs that round
// trip and §9 exercises every documented failure.
//
// ZERO ON BOTH AXES, which no earlier layer in this chain managed, and the
// claim is scoped to what §6 measures: of the 101 banner-to-banner regions the
// screen saw at the base, five scored zero crossings, and this is the union of
// the two carrying the fewest monolith dependencies. It is NOT claimed to be
// the first such region in the programme — that quantifies over twenty-four
// shipped layers at twenty-four different bases, and nothing here measures it.
// A first draft of the audit's header made exactly that claim and was wrong.
//
// THE TWO ZEROES ARE DIFFERENT KINDS OF FACT. §5 keeps them apart because
// collapsing them is how a region scores perfectly while writing globals it
// does not own:
//
//   INBOUND is VACUOUS. `bindingNames` is empty — the region owns two function
//   declarations and no mutable state, so there is nothing for an outside write
//   to reach. Asserting it proves nothing about the code and everything about
//   the shape, so it is labelled rather than celebrated.
//
//   OUTBOUND is a MEASUREMENT. The body performs FIFTEEN property writes, and
//   none lands on a binding the monolith declares. §5 asserts both halves and
//   controls on `S`: it fails the locally-introduced test AND is monolith-owned,
//   so a write onto it would have been counted. Without that control the zero
//   would read as "no writes", which is false.
//
// WHAT THE SCREEN COST BEFORE THIS, kept executable because it is the finding
// worth more than the region. Each of the five audits before #437 applied an
// 8,000-unit size floor BEFORE ranking by coupling, and §6 pins what that costs:
// none of the five zero-crossing regions clears it, the largest being 7,371
// units. The floor did not rank them low, it removed every zero-coupling region
// in the monolith from the screen. Targets are chosen on coupling, not size; a
// size floor applied first inverts that, and it ran for five cycles.
//
// THE SPLIT RULE DID NOT DECIDE THIS BOUNDARY and §6 says so rather than
// implying the numbers chose: the union costs 0, each half alone costs 0. The
// tie went to cohesion and to the cost of a 566-unit layer carrying its own
// undo helper and contract. What the rule DID decide is the far side — joining
// past the seam costs five, all five the neighbour's own.
//
// THE MODULE LOADS AFTER ITS ONLY CONSUMER, which is safe for a measured reason
// and not a lucky one. §7 pins that both call sites in
// js/portfolio/portfolio-data-fetch.js sit inside function bodies and that the
// consumer reads neither name at evaluation time. That is the #417 shape.
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
const UNDO = require('./lib/portfolio-dxlink-greeks-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-dxlink-greeks.js';
const TAG = '<script src="./js/portfolio/portfolio-dxlink-greeks.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-snapshot-prefetch.js"></script>\n';
const INLINE_OPEN = '<script>';

// The commit this layer was cut from — the merge of #438.
const BASE_SHA = 'bdbfd4addd5678ab129a4f83c9a69904395f4321';
const CONTRACT_REL = 'tests/portfolio-dxlink-greeks-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/portfolio-dxlink-greeks-undo.js';
const AUDIT_REL = 'tests/temporary-portfolio-dxlink-greeks-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-dxlink-greeks-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-dxlink-greeks-contract.spec.js';
// The audit is deleted and its contract added, so the suite size is unchanged;
// only the mutation spec is renamed. That is the first cycle where the count
// does NOT move, which is why it is pinned rather than ratcheted.
const TEST_FILE_COUNT = 157;
const LOCAL_SCRIPT_COUNT = 68;
const MODULE_POSITION = 67;

// Monolith coordinates in the BASE document, which §3 re-derives by peeling.
const CODE_AT = 113840;
const RAW_AT_IN_CODE = 68843;
const RAW_END_IN_CODE = 75365;
const BODY_END_IN_CODE = 75364;
const INNER_BANNER = 69409;

const OWNERS_EXPECTED = [
  { name: 'portfolioGetUnderlying', chars: 441, start: 123 },
  { name: 'fetchPortfolioGreeks', chars: 5607, start: 913 },
];
const OWNER_COUNT = 2;
const ASYNC_OWNERS = 1;
const DECL_GAP = 349;

// Coupling, both directions.
const EXTERNAL_EDGES = {};
const EXTERNAL_EDGE_TOTAL = 0;
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
const OUTBOUND_WRITES_ON_MONOLITH_BINDINGS = 0;
const PROPERTY_WRITES = 15;
const WRITE_BASES = ['liveData', 'p', 'symMap', 'ws'];
const TOP_LEVEL_STATEMENT_LINES = 0;

// The screen, and the floor that hid this region for five cycles.
const REGIONS_WITH_OWNERS = 101;
const ZERO_CROSSING_REGIONS = [68843, 69409, 351714, 730440, 1249375];
const ZERO_CROSSING_DEPS = [0, 1, 4, 8, 11];
const LEGACY_SIZE_FLOOR = 8000;
const ZERO_CROSSING_CLEARING_FLOOR = 0;
const LARGEST_ZERO_CROSSING = 7371;

// The split rule at every extent.
const CROSSINGS_JOINED = 0;
const CROSSINGS_A1 = 0;
const CROSSINGS_A2 = 0;
const CROSSINGS_WITH_NEIGHBOUR = 5;
const CROSSINGS_NEIGHBOUR_ALONE = 5;

// Dependencies and load order.
const MONOLITH_DEPENDENCIES = ['logEv'];
const LOG_EV_USES = 3;
const SIBLING_DEPENDENCIES = { 'js/api/backend-client.js': ['ttCall'] };
const CONSUMER_REL = 'js/portfolio/portfolio-data-fetch.js';
const CONSUMER_POSITION = 59;
const CONSUMER_CALL_SITES = 2;
const VM_GLOBALS = 2;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function countLiteral(hay, needle) {
  let n = 0, at = 0;
  while ((at = hay.indexOf(needle, at)) >= 0) { n++; at += needle.length; }
  return n;
}
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = []; let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function lexicalViews(src) {
  const masked = maskLiterals(src);
  const noComments = stripComments(src);
  const build = (keep) => {
    const o = new Array(src.length);
    for (let i = 0; i < src.length; i++) o[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return o.join('');
  };
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
function propertyWriteBases(maskedBody) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(maskedBody))) out.push(m[1]);
  return out;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('PORTFOLIO DXLINK GREEKS — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited #437 · base=' + BASE_SHA.slice(0, 7));

// The strategy templates were cut AFTER this layer, so the live document is no
// longer the one this contract shipped. Peel them first; the helper re-verifies
// its own output by length and SHA-256, so the hop is proved, not assumed.
// The vega monitor ratios were cut AFTER the strategy templates, so they are
// the newest layer of all: peel them FIRST.
const SCANNER_EARNINGS_U = require('./lib/scanner-earnings-throttle-undo.js');
const SCANNER_IVR_U = require('./lib/scanner-ivr-throttle-undo.js');
const VEGA_MONITOR_U = require('./lib/vega-monitor-undo.js');
const STRATEGY_TEMPLATES_U = require('./lib/strategy-templates-undo.js');
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const PRE_SCANNER_EARNINGS = SCANNER_EARNINGS_U.isApplied(LIVE_INDEX)
  ? SCANNER_EARNINGS_U.undoScannerEarningsThrottle(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/scanner-earnings-throttle.js'), 'utf8'))
  : LIVE_INDEX;
const PRE_SCANNER_IVR = SCANNER_IVR_U.isApplied(PRE_SCANNER_EARNINGS)
  ? SCANNER_IVR_U.undoScannerIvrThrottle(
      PRE_SCANNER_EARNINGS, fs.readFileSync(path.join(ROOT, 'js/services/scanner-ivr-throttle.js'), 'utf8'))
  : PRE_SCANNER_EARNINGS;
const PRE_VEGA_MONITOR = VEGA_MONITOR_U.isApplied(PRE_SCANNER_IVR)
  ? VEGA_MONITOR_U.undoVegaMonitor(
      PRE_SCANNER_IVR, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-vega-monitor.js'), 'utf8'))
  : PRE_SCANNER_IVR;
const INDEX = STRATEGY_TEMPLATES_U.isApplied(PRE_VEGA_MONITOR)
  ? STRATEGY_TEMPLATES_U.undoStrategyTemplates(
      PRE_VEGA_MONITOR, fs.readFileSync(path.join(ROOT, 'js/config/strategy-templates.js'), 'utf8'))
  : PRE_VEGA_MONITOR;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));

// The BASE document, reached through the undo rather than re-read from git, so
// every coordinate below is proved by the reconstruction that shipped.
const BASE = UNDO.undoPortfolioDxlinkGreeks(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const VIEWS = lexicalViews(BASE_CODE);
const ALL_DECLS = scanTopLevelDeclarations(BASE_CODE);
const MONOLITH_OWNED = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(BASE_CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const OWNERS = scanTopLevelDeclarations(MODULE);
const OWNED_HERE = new Set(OWNERS.map((d) => d.name));
const MASKED_MODULE = maskLiterals(MODULE);

function crossings(s, e) {
  const own = ALL_DECLS.filter((d) => d.start >= s && d.start + d.chars <= e);
  const set = new Set(own.map((d) => d.name));
  let edges = 0;
  for (const n of set) for (const p of refSites(VIEWS.code, n)) if (p < s || p >= e) edges++;
  let out = 0;
  for (const base of propertyWriteBases(VIEWS.code.slice(s, e))) {
    if (!set.has(base) && MONOLITH_OWNED.has(base)) out++;
  }
  return { owners: own.length, edges, out, total: edges + out };
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,577,450 units');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,607,582 bytes');
eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…27,389 line feeds');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-eight local scripts');
eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last, at position 67');
eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
  '…immediately after the prefetch anchor and immediately before the inline monolith');
// The LIVE document is one layer newer, and both states are pinned: the peel
// above is proved to return this contract's EXACT shipped state, and the live
// state is pinned against the layer that now owns it. Without the second pair
// the live document would be checked by nothing here.
eq(LIVE_INDEX.length, SCANNER_EARNINGS_U.EXTRACTED_CHARS,
  'the live document is the NEWEST layer\'s extracted length — the message names the\n   // role, not a layer, because naming the layer went stale the next cycle');
eq(sha256(LIVE_INDEX), SCANNER_EARNINGS_U.EXTRACTED_SHA256, '…and its digest');
eq(APP_LOADER.parseScriptTags(LIVE_INDEX).filter((t) => t.src && /^\.\//.test(t.src)).length,
  LOCAL_SCRIPT_COUNT + 4, '…carrying four more local scripts than this layer shipped');
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, UNDO.BASE_CHARS, 'the pinned base carries the pre-extraction index.html');
  eq(sha256(fromGit), UNDO.BASE_SHA256, '…byte for byte');
  // PIN THE BASE BY SOMETHING ONLY IT HAS. #437 changed nothing outside tests/,
  // so index.html is byte-identical at this commit and at its parent — and a
  // mutant swapping one for the other survived every hash assertion above. The
  // same gap survived in #432 for the same reason. The discriminator is the
  // mutation tooling #438 added: present here, absent one commit earlier.
  const parent = git(['rev-parse', BASE_SHA + '^']).trim();
  eq(git(['show', parent + ':index.html']), fromGit,
    'the parent commit carries the SAME index.html — which is why the hashes cannot pin the base');
  ok(git(['cat-file', '-e', BASE_SHA + ':tests/mutation-coverage-contract.test.js']) === '',
    '…so the base is pinned by the mutation contract #438 added');
  assert.throws(() => git(['cat-file', '-e', parent + ':tests/mutation-coverage-contract.test.js']),
    'control — its parent does NOT carry that file, so the two commits are told apart');
  pass++;
  eq(BASE, fromGit, 'and the UNDO reproduces it exactly — the reconstruction is proved, not assumed');
  eq(APP_LOADER.parseScriptTags(fromGit).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying sixty-seven local scripts');
}
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite matches the pin above, which a new Phase 1 audit ratchets by one');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 6,521 units');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…6,603 bytes');
eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…145 line feeds');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and the digest audit #437 predicted before the move');
eq(MODULE, BASE.slice(UNDO.RAW_AT, UNDO.SEPARATOR_AT),
  'it is the base document’s bytes at the recorded offsets, unaltered');
eq(BASE.slice(UNDO.RAW_AT, UNDO.RAW_END), MODULE + '\n', 'the raw block is the body plus one LF');
eq(sha256(BASE.slice(UNDO.RAW_AT, UNDO.RAW_END)), UNDO.RAW_SHA256, '…hashing to the pinned digest');
eq(MODULE.slice(-2), '}\n', 'the body ends on a closing brace and a newline');
ok(!MODULE.endsWith('\n\n'), '…and not on a blank line, so git diff --check stays clean');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary — a judgement, with a mechanical seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the monolith starts where it was measured');
  eq(CODE_AT + RAW_AT_IN_CODE, UNDO.RAW_AT, 'the monolith offset maps to the document offset');
  eq(CODE_AT + BODY_END_IN_CODE, UNDO.SEPARATOR_AT, '…and so does the body end');

  const marks = topLevelBanners(BASE_CODE, FN_BODIES);
  ok(marks.indexOf(RAW_AT_IN_CODE) >= 0, 'the region opens on a top-level banner');
  ok(marks.indexOf(INNER_BANNER) >= 0, '…SPANS a second, which is the union this layer took');
  ok(marks.indexOf(RAW_END_IN_CODE) >= 0, '…and its seam is a third');
  ok(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_AT_IN_CODE + 120).indexOf('Extract underlying symbol') > 0,
    'the first banner names the symbol extractor');
  ok(BASE_CODE.slice(INNER_BANNER, INNER_BANNER + 120).indexOf('DXLink one-shot greeks') > 0,
    'the inner banner names the greeks fetch');
  ok(BASE_CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + 200).indexOf('DXLink on-demand stock price') > 0,
    'and what follows the seam is a different feature');

  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary — the cut was performed THROUGH it');

  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Two owners, one async, and no binding at all');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares exactly two names at top level');
  eq(OWNERS.map((d) => ({ name: d.name, chars: d.chars, start: d.start })), OWNERS_EXPECTED,
    '…at their pinned spans');
  eq(OWNERS.filter((d) => d.isAsync).length, ASYNC_OWNERS, 'one of the two is async');
  eq(OWNERS[1].isAsync, true, '…the DXLink fetch, not the symbol extractor');
  eq(OWNERS.every((d) => d.form === 'function'), true, 'both are function declarations');
  eq(bindingNames(OWNERS), [], 'the module owns no binding at all — which §5 needs');
  eq(OWNERS[1].start - (OWNERS[0].start + OWNERS[0].chars), DECL_GAP,
    'the gap between them is the inner banner and its comment');
  eq(RAW_AT_IN_CODE + OWNERS[0].start + OWNERS[0].chars + 2, INNER_BANNER,
    '…and that banner is the section start the screen counted');
  eq(OWNERS[1].start + OWNERS[1].chars + 1, UNDO.MODULE_CHARS,
    'banner + both declarations + the trailing newline is the whole body');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling in BOTH directions — and which zero is vacuous');
// ─────────────────────────────────────────────────────────────────────────────
{
  const edges = {};
  let total = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(VIEWS.code, n)) {
      if (p < UNDO.RAW_AT - CODE_AT || p >= BODY_END_IN_CODE) { edges[n] = (edges[n] || 0) + 1; total++; }
    }
  }
  eq(edges, EXTERNAL_EDGES, 'NO external executable edge — the monolith never names either owner');
  eq(total, EXTERNAL_EDGE_TOTAL, '…zero references in total');
  for (const n of OWNED_HERE) {
    eq(refSites(VIEWS.code, n).length, 1, n + ' appears exactly once in the monolith: its declaration');
  }
  // That zero is only interesting if the detector finds edges elsewhere.
  ok(crossings(1254714, 1265508).edges > 0,
    'control — the same detector scores the snapshot helper above zero');
  ok(FN_BODIES.length > 100, 'control — the function-body index is populated');

  let markup = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(VIEWS.strings, n)) markup++;
  }
  eq(markup, MARKUP_REFERENCES, 'no owner is named inside a string the monolith builds');
  ok(refSites(VIEWS.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  // INBOUND: vacuous, and said so.
  let inbound = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(VIEWS.code, n)) if (isWriteAt(VIEWS.code, p, n)) inbound++;
  }
  eq(inbound, INBOUND_WRITES, 'zero inbound writes');
  eq(bindingNames(OWNERS).length, 0,
    '…which is VACUOUS: the module owns no binding for a write to reach');
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts as a write');
  eq(isWriteAt('x === 1;', 0, 'x'), false, 'control — a comparison does not');

  // OUTBOUND: NOT vacuous. The writes exist; none reaches a monolith binding.
  const bases = propertyWriteBases(MASKED_MODULE);
  eq(bases.length, PROPERTY_WRITES, 'the body performs FIFTEEN property writes');
  eq(Array.from(new Set(bases)).sort(), WRITE_BASES, '…over exactly four bases');
  eq(bases.filter((b) => MONOLITH_OWNED.has(b) && !OWNED_HERE.has(b)).length,
    OUTBOUND_WRITES_ON_MONOLITH_BINDINGS,
    'and NONE lands on a binding the monolith declares — the outbound zero');
  const introduced = (name) =>
    new RegExp('(?:var|let|const)\\s+' + name + '\\b').test(MODULE) ||
    new RegExp('function[^(]*\\([^)]*\\b' + name + '\\b[^)]*\\)').test(MODULE);
  for (const b of WRITE_BASES) ok(introduced(b), b + ' is introduced inside the body');
  eq(introduced('S'), false,
    'control — the monolith state object would NOT pass that test, so it is a real check');
  eq(MONOLITH_OWNED.has('S'), true,
    '…and `S` is monolith-owned, so a write onto it would have been counted');

  eq(statementLines(MODULE, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the two declarations');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. What the screen saw, and the floor that hid it');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(BASE_CODE, FN_BODIES);
  const scored = [];
  for (let i = 0; i < marks.length; i++) {
    const s = marks[i];
    const e = (i + 1 < marks.length ? marks[i + 1] : BASE_CODE.length);
    const c = crossings(s, e);
    if (c.owners === 0) continue;
    scored.push({ s, e, units: e - s, total: c.total });
  }
  eq(scored.length, REGIONS_WITH_OWNERS, '101 banner-to-banner regions own declarations');
  const zero = scored.filter((r) => r.total === 0).sort((a, b) => a.s - b.s);
  eq(zero.map((r) => r.s), ZERO_CROSSING_REGIONS, 'exactly these five score ZERO crossings');
  // THE FINDING. Not "this region ranked low" — it was not on the screen.
  eq(zero.filter((r) => r.units >= LEGACY_SIZE_FLOOR).length, ZERO_CROSSING_CLEARING_FLOOR,
    'NONE of the five clears the 8,000-unit floor the five audits before #437 applied first');
  eq(Math.max(...zero.map((r) => r.units)), LARGEST_ZERO_CROSSING,
    '…the largest being 7,371 units, short of 8,000');
  ok(scored.filter((r) => r.units >= LEGACY_SIZE_FLOOR).length > 0,
    'control — the floor does admit regions, so excluding all five is a measurement');

  const depsOf = (s, e) => {
    const own = ALL_DECLS.filter((d) => d.start >= s && d.start + d.chars <= e);
    const mine = new Set(own.map((d) => d.name));
    const out = new Set();
    for (const m of VIEWS.code.slice(s, e).matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
      if (MONOLITH_OWNED.has(m[0]) && !mine.has(m[0])) out.add(m[0]);
    }
    return out.size;
  };
  eq(zero.map((r) => depsOf(r.s, r.e)), ZERO_CROSSING_DEPS,
    'the five carry these monolith-dependency counts');
  eq(zero[0].e, zero[1].s, 'the two lowest are ADJACENT — one ends where the next begins');
  eq([zero[0].s, zero[1].e], [RAW_AT_IN_CODE, RAW_END_IN_CODE],
    '…and their union is exactly the region this layer took');

  // THE SPLIT RULE DID NOT DECIDE THIS ONE, and the contract says so.
  eq(crossings(RAW_AT_IN_CODE, RAW_END_IN_CODE).total, CROSSINGS_JOINED, 'the union costs ZERO');
  eq(crossings(RAW_AT_IN_CODE, INNER_BANNER).total, CROSSINGS_A1, '…the extractor alone, zero');
  eq(crossings(INNER_BANNER, RAW_END_IN_CODE).total, CROSSINGS_A2, '…the fetch alone, zero');
  const iSeam = marks.indexOf(RAW_END_IN_CODE);
  const neighbourEnd = marks[iSeam + 1];
  eq(crossings(RAW_AT_IN_CODE, neighbourEnd).total, CROSSINGS_WITH_NEIGHBOUR,
    'joining past the seam costs five');
  eq(crossings(RAW_END_IN_CODE, neighbourEnd).total, CROSSINGS_NEIGHBOUR_ALONE,
    '…all five the neighbour’s own, so the union buys nothing and loses the zero');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. One dependency, and a consumer that loads BEFORE the module');
// ─────────────────────────────────────────────────────────────────────────────
{
  const deps = new Set();
  for (const m of MASKED_MODULE.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (MONOLITH_OWNED.has(m[0]) && !OWNED_HERE.has(m[0])) deps.add(m[0]);
  }
  eq(Array.from(deps).sort(), MONOLITH_DEPENDENCIES, 'exactly ONE monolith dependency: logEv');
  const uses = refSites(MASKED_MODULE, 'logEv');
  eq(uses.length, LOG_EV_USES, '…used three times');
  const moduleBodies = functionBodyRanges(MODULE);
  eq(uses.every((p) => moduleBodies.some((r) => p >= r.start && p <= r.end)), true,
    '…every use inside a function body, so none runs at load');

  const sibDeps = {};
  for (const rel of LOCALS) {
    if (rel === MODULE_REL) continue;
    const names = scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8')).map((d) => d.name);
    const hit = names.filter((n) => new RegExp('\\b' + n + '\\b').test(MASKED_MODULE));
    if (hit.length) sibDeps[rel] = hit;
  }
  eq(sibDeps, SIBLING_DEPENDENCIES, 'one sibling dependency, ttCall from the backend client');
  ok(LOCALS.indexOf('js/api/backend-client.js') < MODULE_POSITION,
    '…and that sibling loads before this module');

  eq(LOCALS.indexOf(CONSUMER_REL), CONSUMER_POSITION, 'the only consumer is script #59');
  ok(CONSUMER_POSITION < MODULE_POSITION, '…which is BEFORE this module at #67');
  const consumer = fs.readFileSync(path.join(ROOT, CONSUMER_REL), 'utf8');
  const consumerMasked = maskLiterals(consumer);
  const consumerBodies = functionBodyRanges(consumer);
  let sites = 0;
  for (const n of OWNED_HERE) {
    for (const p of refSites(consumerMasked, n)) {
      sites++;
      ok(consumerBodies.some((r) => p >= r.start && p <= r.end),
        n + ' is referenced by the consumer INSIDE a function body — call time');
    }
  }
  eq(sites, CONSUMER_CALL_SITES, 'two call sites, one per owner');
  eq(evaluationTimeReads(consumer, scanTopLevelDeclarations(consumer), maskLiterals)
    .filter((n) => OWNED_HERE.has(n)), [],
    '…and the consumer reads neither name at evaluation time');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads bare, works, and the byte-exact round trip');
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
  eq(Object.keys(bare).sort(), OWNERS_EXPECTED.map((o) => o.name).sort(),
    '…defining exactly its two owners');
  eq(bare.portfolioGetUnderlying.constructor.name, 'Function', 'the extractor is a plain function');
  eq(bare.fetchPortfolioGreeks.constructor.name, 'AsyncFunction', '…the fetch an async one');

  // The pure half WORKS with no host at all — loading is not the same as running.
  eq(bare.portfolioGetUnderlying({ underlyingSymbol: 'SPY' }), 'SPY',
    'the extractor returns the explicit underlying');
  eq(bare.portfolioGetUnderlying({ 'underlying-symbol': 'QQQ' }), 'QQQ',
    '…and the hyphenated spelling the backend sends');

  eq(UNDO.undoPortfolioDxlinkGreeks(INDEX, MODULE), BASE,
    'the undo reconstructs the base document byte for byte');
  eq(sha256(BASE), UNDO.BASE_SHA256, '…hashing to the pinned base digest');
  eq(BASE.length, UNDO.BASE_CHARS, '…at the pinned length');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(null, MODULE),
  'PORTFOLIO_DXLINK_GREEKS_UNDO_BAD_INPUT', '9.1 a non-string document is rejected');
throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(INDEX, null),
  'PORTFOLIO_DXLINK_GREEKS_UNDO_BAD_INPUT', '9.2 a non-string module is rejected');
throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(INDEX, MODULE.slice(0, -1)),
  'PORTFOLIO_DXLINK_GREEKS_UNDO_MODULE_IDENTITY', '9.3 a truncated module is rejected');
throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(INDEX, MODULE + '\n'),
  'PORTFOLIO_DXLINK_GREEKS_UNDO_MODULE_IDENTITY',
  '9.4 a module that re-absorbed the separator is one unit too long');
{
  // A SAME-LENGTH, same-byte-count, same-line-count probe, so the hash check is
  // reached in isolation and cannot hide behind the size check.
  // One letter changed, deep in the body: same length, same byte count, same
  // line count. Built by index rather than by a text substitution, because a
  // substitution silently produces an IDENTICAL probe when its needle is absent
  // — which is what a first draft did, and the control below caught it.
  let at = 3000;
  while (at < MODULE.length && !/[a-z]/.test(MODULE[at])) at++;
  const probe = MODULE.slice(0, at) + (MODULE[at] === 'z' ? 'y' : 'z') + MODULE.slice(at + 1);
  eq(probe.length, MODULE.length, 'the probe is the same length as the module');
  eq(Buffer.byteLength(probe, 'utf8'), UNDO.MODULE_UTF8, '…the same byte count');
  eq((probe.match(/\n/g) || []).length, UNDO.MODULE_LF, '…with the same line count');
  ok(probe !== MODULE, '…and different bytes');
  throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(INDEX, probe),
    'PORTFOLIO_DXLINK_GREEKS_UNDO_MODULE_IDENTITY',
    '9.5 a same-length mutated module is rejected by the HASH, not the size');
}
{
  const blankTail = MODULE.slice(0, -1) + '\n\n';
  throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(INDEX, blankTail),
    'PORTFOLIO_DXLINK_GREEKS_UNDO_MODULE_IDENTITY',
    '9.6 a module ending on a blank line is rejected');
}
throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(BASE, MODULE),
  'PORTFOLIO_DXLINK_GREEKS_UNDO_TAG_IDENTITY',
  '9.7 an already-unextracted document has no tag and is rejected');
throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(INDEX.replace(TAG, TAG + TAG), MODULE),
  'PORTFOLIO_DXLINK_GREEKS_UNDO_TAG_IDENTITY', '9.8 a duplicate tag is rejected');
{
  const reordered = INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG);
  eq(countLiteral(reordered, TAG), 1, 'the reordered mutant still has exactly one tag');
  throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(reordered, MODULE),
    'PORTFOLIO_DXLINK_GREEKS_UNDO_TAG_ADJACENCY',
    '9.9 a tag moved before its anchor fails adjacency, not identity');
}
throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(INDEX + ' ', MODULE),
  'PORTFOLIO_DXLINK_GREEKS_UNDO_EXTRACTED_IDENTITY',
  '9.10 one foreign byte anywhere in the document is rejected');
{
  const stranded = INDEX.slice(0, UNDO.RAW_AT) + '\n' + INDEX.slice(UNDO.RAW_AT);
  eq(stranded.length, UNDO.EXTRACTED_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throwsWith(() => UNDO.undoPortfolioDxlinkGreeks(stranded, MODULE),
    'PORTFOLIO_DXLINK_GREEKS_UNDO_EXTRACTED_IDENTITY',
    '9.11 a structural separator left inline is rejected');
}
// isApplied is ROUTING, not safety: it answers only "is the tag here".
eq(UNDO.isApplied(BASE), false, '9.12 isApplied is false for a document predating this layer');
eq(UNDO.isApplied(INDEX), true, '…and true for the shipped one');
eq(UNDO.isApplied(INDEX.replace(TAG, TAG + TAG)), false,
  '9.13 …and false for a duplicated tag, so the guards below it do the real work');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
    ['index.html', 'js/config/strategy-templates.js', 'js/portfolio/portfolio-vega-monitor.js', 'js/services/scanner-earnings-throttle.js', 'js/services/scanner-ivr-throttle.js', MODULE_REL].sort(),
    'production footprint is index.html, this module and the two cut after it');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary audit is shipped: this contract replaces it one for one');
  // The audit's mutation spec retires WITH the audit, and this contract's spec
  // replaces it. A spec whose target no longer exists would fail the coverage
  // contract, so this is not bookkeeping — it is the thing that keeps §2 of
  // tests/mutation-coverage-contract.test.js honest.
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)),
    'the audit’s mutation spec is gone with the audit it targeted');
  // RETIRED IN #446, deliberately. The mutant budget's floor rises by one
  // contract spec per cycle for ever, so raising the ceiling buys a single cycle
  // each time and retiring one older spec per new layer keeps the count flat.
  // This layer — #24, three cycles settled — was the one retired.
  //
  // What that costs is exact, and this assertion is where it is recorded: every
  // assertion in this contract still runs on every push; what stopped is the
  // mutation pass proving those pins are load-bearing. Restoring it is a matter
  // of writing the spec again and raising DECLARED_MUTANTS by its count.
  ok(!fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)),
    'this contract\'s mutation spec was RETIRED in #446 to hold the mutant budget flat');
  ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
  ok(!changed.some((rel) => rel.endsWith('.md') && rel !== 'CLAUDE.md'),
    'no documentation changed, except the repository working notes');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(!changed.some((rel) => rel === '.gitattributes'), '.gitattributes is untouched');
  ok(changed.every((rel) => rel === 'index.html' || rel === 'js/portfolio/portfolio-vega-monitor.js' || rel === MODULE_REL ||
    rel === 'js/services/scanner-ivr-throttle.js' ||
    rel === 'js/services/scanner-earnings-throttle.js' ||
    rel === 'js/config/strategy-templates.js' ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
    'every other changed path is a test artifact');
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_DXLINK_GREEKS_BOUNDARY_OK');
