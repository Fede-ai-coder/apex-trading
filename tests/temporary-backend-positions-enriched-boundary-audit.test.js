'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND POSITIONS ENRICHED — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [891631,893380) in monolith coordinates — 1,749 units raw
// and 1,748 of body, ONE owner, an async function — into
// js/portfolio/backend-positions-enriched.js. `fetchBackendPortfolioPositionsEnriched`
// asks the backend to turn a portfolio's open positions into option legs: it
// answers null at once when it has no portfolio id or no positions, builds the
// live-refresh payload for the positions, POSTs it to
// `/portfolio/<id>/positions/enriched` with an 18-second timeout, and answers the
// parsed response, or null with a warning when the request fails, the response
// is not ok, or the body says it is not. The first 373 units are the five
// comment lines that document it.
//
// ── THE FINDING, PART ONE: THE PREVIOUS CONTRACT NAMED IT FIRST ────────────
//
// The contract before this audit published its four best other openings, and the
// first was this one. The cut that contract shipped sat BEFORE this opening in
// the monolith, so this opening is earlier than the one it published by that
// cut's raw length, 1,988 units; of the other three, two sat after that cut and
// moved by the same amount, and one sat before it and did not move. §4 checks the
// published list against this base: the first of the four is this opening, moved,
// the other three are the top of the list that remains, and the list gains a
// fourth entry from beneath.
//
// ── PART TWO: THE TIE IS GONE, AND THE SCREEN NEVER HELD THIS ROW ──────────
//
// The previous audit stated a tie at the best score the screen publishes between
// this opening and the one it took. That one shipped. §4 counts, over the screen
// and the pass over its sub-floor runs together, no row whose byConsumerSplit is
// below 2, and exactly ONE row at byConsumerSplit 2 whose raw nine is 4 or below:
// this one. Every other row at 2 has a raw nine of 5 or more. The claim is scoped
// to those two enumerations. And the row is not the screen's: measured from the
// declaration the run is 1,375 units, under the 1,500 floor, so the screen does
// not enumerate it at its declaration or at its documentation. Only the pass that re-measures from the
// documentation sees it, at 1,748; §2 and §4 measure both facts.
//
// ── PART THREE: THE DEPENDENCY IS THE FUNCTION DIRECTLY ABOVE, AND STAYS ───
//
// The body calls `buildPortfolioLiveRefreshPayload`, which is the owner
// immediately above the documentation and shares this banner region. It has four
// references in the monolith: its own declaration, this body, and the bodies of
// two other functions that stay. Taking it along would raise the raw nine from 4
// to 11 and byConsumerSplit from 2 to 7, and §5 prices every owner above it in
// the region too: none is better than the cut on either measure. The call is
// made when the function is CALLED, never when it loads.
//
// ── PART FOUR: THE CALL IS OUTSIDE THE `try`, SO A MISSING DEPENDENCY REJECTS ─
//
// The module loads in a bare VM, and called bare it answers null at once when
// the portfolio id or the positions are missing, before any dependency is
// touched. With both supplied but no payload builder, the returned promise
// REJECTS with a ReferenceError naming the builder, because that call sits above
// the `try`. Everything inside the `try` — `fetch`, `BACKEND`, `_backendAuthHeaders` — is
// caught and answered as null with a warning. The previous audit's function sat
// inside a `try`, which swallowed the same kind of failure there; §7 shows
// which failure is which here, and walks every branch with fakes.
//
// ── PART FIVE: THE BOUNDARY IS A JUDGEMENT, AND A BLANK LINE IS A CHOICE ───
//
// The seam accepts EIGHT line starts between the previous function's closing
// brace and the declaration: that brace, the blank line, each of the five
// documentation lines, and the declaration. Seven parse; the brace does not. The
// blank line is a legal opening of its own, and the recommendation does not take
// it: opening on the first documentation line leaves the blank line where it is,
// so the brace and the next function's documentation stay one blank line apart,
// while opening on the blank line would fuse them. §2 measures both joins.
//
// ── PART SIX: ONE OWNER BELOW CANNOT END A CUT, AND THE REST CARRY CODE ────
//
// The owner directly below, `_resolveLegGreeksDisplay`, ends against a top-level
// `try { window._resolveLegGreeksDisplay = … } catch (e) {}` statement, so no cut
// can end at it and §5 asserts the refusal by name. Of the legal ends further
// down that §5 prices, every one carries that statement, so each runs code at
// load. This function is owner 5 of 25 in a region of 64,468 units; the cut takes
// none of the region's banner.
//
// ── PRICED, AND WHERE IT WOULD SIT ─────────────────────────────────────────
//
// §5 prices the owners above it, the legal owners below it and the region. §8
// ranks it by size against the fifty-one layers the chain holds, and counts the
// shape measures against it: its body is pure ASCII, so the pure-ASCII count
// WOULD move, it does not open on a banner, so that count would not, and the
// count of layers that pin a monolith dependency would move by one.
//
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

const MODULE_REL_IF_CUT = 'js/portfolio/backend-positions-enriched.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'cbee8f8';
const BASE_CHARS = 1439609;
const BASE_UTF8 = 1468132;
const BASE_LF = 24867;
const BASE_SHA256 = '095ba4db9d7968a33e7948735fdf07424ffe3a7d659589c09394fc2ea2869664';
const LOCAL_SCRIPTS = 95;
const TEST_FILE_COUNT = 180;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-backend-positions-enriched-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/backend-positions-enriched-audit.spec.js';
const RATCHETED_CONTRACTS = 42;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/rs-quality-check-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 148;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/rs-quality-check-contract.spec.js';
const RETIRED_MUTANTS = 142;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115680;
const CODE_CHARS = 1323903;
const TOP_LEVEL_DECLS = 908;
const OWNER_REGIONS = 117;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the five comment lines that document the function, which sit
// below a blank line that follows the closing brace of the function above them.
// The screen does not visit this opening, and does not visit the declaration
// either: measured from the declaration the run is under the floor.
const RAW_AT_IN_CODE = 891631;
const DECL_AT_IN_CODE = 892004;
const RAW_END_IN_CODE = 893380;
const BODY_END_IN_CODE = 893379;
const RAW_CHARS = 1749;
const BODY_CHARS = 1748;
const BODY_UTF8 = 1748;
const BODY_LF = 38;
const BODY_SHA256 = '36b51163f5dc3d2996536ace6356f7f8b0945e973ea29d0c19138b7924d13914';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// Backend-owned portfolio option-leg enrichment.  The backend endpoint is the';
const DECL_FIRST_LINE =
  'async function fetchBackendPortfolioPositionsEnriched(portfolioId, positions) {';
const EM_DASHES = 0;
const NON_ASCII_CHARS = 0;
const NEXT_DECL = '_resolveLegGreeksDisplay';
const NEXT_DOC_PREFIX = '// Decide DISPLAY greeks';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['fetchBackendPortfolioPositionsEnriched'];
const OWNER_SIZES = [1374];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 38;
const CODE_LINES = 33;
const COMMENT_LINES = 5;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous function's closing brace and the declaration the seam
// accepts EIGHT line starts. One is that closing brace and is not valid
// JavaScript; one is the blank line; five are the lines of the documentation;
// the last is the declaration.
const BRACE_OPENING = 891628;
const MID_LINE_OPENING = 891629;
const BLANK_OPENING = 891630;
const SEAM_LEGAL_OPENINGS = 8;
const PARSING_OPENINGS = 7;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 373;
const DOC_TAKEN_LINES = 5;
const DECL_UNITS_FROM_DECLARATION = 1375;
const CANDIDATES_AT_DECLARATION = 0;
const CANDIDATES_AT_CUT = 0;
const HIDDEN_ROWS_AT_CUT = 1;
// What each choice of opening leaves behind: the recommended cut keeps the blank
// line that already separates the brace from the next function's documentation;
// opening on the blank line itself would lose it.
const JOIN_IF_CUT_AT_DOC = '}\n\n// Decide DISPLAY greeks';
const JOIN_IF_CUT_AT_BLANK = '}\n// Decide DISPLAY greeks';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 885493;
const REGION_END = 949961;
const REGION_CHARS = 64468;
const REGION_OWNERS = 25;
const OWNER_POSITION = 5;
const OWNER_BEFORE = 'buildPortfolioLiveRefreshPayload';
const BANNER_LINE_PREFIX = '// ── [PortfolioRefreshPayload]';
const WHOLE_REGION_NINE = 126;
const WHOLE_REGION_BCS = 51;
const WHOLE_REGION_CONSUMERS = 9;
const WHOLE_REGION_DEPS = 23;
const WHOLE_REGION_SIB = 4;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies]. They sit in the same
// banner region as the cut; the first is the function this one depends on.
const EXTENSIONS_UP = [
  ['buildPortfolioLiveRefreshPayload', 887774, 5606, 11, 7, 4],
  ['_portfolioTechnicalDebugEnabled', 887171, 6209, 21, 10, 4],
  ['_portfolioRiskDebugEnabled', 886520, 6860, 68, 16, 4],
  ['_portfolioRefreshPayloadDebugEnabled', 885493, 7887, 67, 15, 3],
];
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies]. The owner between the cut and
// these is not here: no cut can end at it, which §5 asserts by name. Every one of
// these ends carries the top-level statement that follows that owner.
const EXTENSIONS_DOWN = [
  ['fetchPortfolioFullRefresh', 22085, 10, 4, 2],
  ['fetchPortfolioLiveRefresh', 27904, 24, 13, 10],
  ['_mergePreviousPortfolioTechnicalsForPartialRefresh', 29091, 27, 13, 10],
];
const SEAM_ILLEGAL_DOWN = ['_resolveLegGreeksDisplay'];
const SEAM_ILLEGAL_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
const STATEMENT_AFTER_ILLEGAL =
  'try { window._resolveLegGreeksDisplay = _resolveLegGreeksDisplay; } catch (e) {}';

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 4;
const BY_CONSUMER = 4;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = 'refreshPositionsLive';
const CONSUMER_SITES = 1;
const CONSUMER_SITE_AT = 991077;
const CONSUMER_AT = 978826;
const CONSUMER_END = 1117308;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = ['buildPortfolioLiveRefreshPayload'];
const DEPENDENCY_REFERENCES = 1;
const DEPENDENCY_AT = 887774;
const DEPENDENCY_END = 891628;
// Every reference to the dependency in the monolith, as [offset, enclosing
// declaration]: its own declaration, this body, and two more callers that stay.
const DEPENDENCY_SITES = [
  [887783, 'buildPortfolioLiveRefreshPayload'],
  [892319, 'fetchBackendPortfolioPositionsEnriched'],
  [897515, 'fetchPortfolioFullRefresh'],
  [915985, 'fetchPortfolioLiveRefresh'],
];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 1;
const OUTBOUND_MODULE_REFERENCES = 2;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 2;
const FOUNDATION_NAMES = ['BACKEND', '_backendAuthHeaders'];
const FOUNDATION_MODULES = ['js/config/backend-config.js', 'js/api/backend-client.js'];
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// The scan this file inherited reads only the first name of a `var` list as
// local. This body declares no such list, so it reports nothing here; the
// controls in §3 show it still does where one exists.
const UNCORRECTED_SCAN_HITS = 0;

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['fetchBackendPortfolioPositionsEnriched'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7243;
const SEAM_REJECTED = 2045;
const CANDIDATES = 2908;
const CLEAN_CANDIDATES = 1774;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 7;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION. A function whose documentation lifts it over the floor
// was therefore never enumerated. This pass keeps every run the screen skipped
// for being short, re-measures it from the start of its documentation, and
// keeps those that then clear the floor. THIS CUT IS ONE OF THEM.
const HIDDEN_ROWS = 36;
const HIDDEN_CLEAN_ROWS = 35;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 2;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [891631, 893379, 1375, 1748, 4, 2, ['fetchBackendPortfolioPositionsEnriched']],
  [745622, 747321, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 9;
// EVERY row, over the screen and the pass together, at byConsumerSplit 2 or
// below: [opening, closing, raw nine, byConsumerSplit]. The first is this cut's
// own row, which only the pass holds.
const BEST_TIER_ROWS = [
  [891631, 893379, 4, 2],
  [182656, 184808, 5, 2],
  [937031, 938903, 5, 2],
  [71214, 72907, 6, 2],
  [576762, 578321, 6, 2],
  [620318, 623642, 6, 2],
  [70936, 72907, 7, 2],
  [745622, 747321, 7, 2],
  [876975, 879066, 7, 2],
];
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [937031, 2, 5, 1872],
  [182656, 2, 5, 2152],
  [576762, 2, 6, 1559],
  [71214, 2, 6, 1693],
];
const PREVIOUS_RAW_CHARS = 1988;
const PREVIOUS_RAW_AT = 283556;

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 51;
const SMALLEST_LAYER_CHARS = 1587;
const SIZE_RANK_IF_CUT = 4;
const LAYERS_LARGER_THAN_THIS_CUT = 48;
const PURE_ASCII_LAYERS = 4;
const LAYERS_OPENING_ON_BANNER = 24;
const LAYERS_WITH_A_DEPENDENCY = 18;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/portfolio/backend-positions-enriched.js"></script>\n';
const NET_REDUCTION = 1680;
const INDEX_AFTER = 1437929;
const RESIDUAL_MONOLITH = 1322154;
const LOCAL_SCRIPTS_AFTER = 96;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name.replace(/\$/g, '\\$') + ')\\b', 'g');
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



console.log('BACKEND POSITIONS ENRICHED — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. Phase 2 puts a peel here and this
// becomes the reconstruction the permanent contract runs against.
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
    rel, src, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
    bound: locallyBound(src), owners: scanTopLevelDeclarations(src).map((d) => d.name),
  };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');
const OTHER_INLINE = TAGS.filter((t) => !t.src && t.inline !== CODE).map((t) => t.inline).join('\n');
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

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
  const per = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked), rel: s.rel }));
  for (const d of DECLS) {
    let n = 0; const who = [];
    for (const m of per) {
      if (m.bound.has(d.name)) continue;
      const k = (m.idx.get(d.name) || []).length;
      n += k; if (k) who.push(m.rel);
    }
    SIB_REFS.set(d.name, { n, who });
  }
}
const at0 = (idx, n) => idx.get(n) || [];
function lowerBound(sorted, x) {
  let a = 0, b = sorted.length;
  while (a < b) { const m = (a + b) >> 1; if (sorted[m] < x) a = m + 1; else b = m; }
  return a;
}
const countIn = (sites, lo, hi) => lowerBound(sites, hi) - lowerBound(sites, lo);

function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0, sib = 0, mkp = 0;
  const sites = []; const sibWho = new Set();
  for (const n of names) {
    for (const at of at0(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += at0(OCC_STRINGS, n).filter(outside).length;
    const sr = SIB_REFS.get(n); sib += sr.n; for (const w of sr.who) sibWho.add(w);
    mkp += at0(OCC_MARKUP, n).length;
  }
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  const local = locallyBound(CODE.slice(range[0], range[1]));
  const bodyIdx = occurrenceIndex(bodyMasked);
  const deps = new Set();
  for (const [n] of bodyIdx) if (!nameSet.has(n) && !local.has(n) && BY_NAME.has(n)) deps.add(n);
  let outModule = 0;
  for (const [n, pos] of bodyIdx) {
    if (nameSet.has(n) || local.has(n)) continue;
    if (MODULE_OWNERS.has(n)) outModule += pos.length;
  }
  let outGen = 0;
  for (const d of DECLS) {
    if (nameSet.has(d.name)) continue;
    outGen += countIn(at0(OCC_STRINGS, d.name), range[0], range[1]);
  }
  const seven = inbound + inWrites + inPropWrites + outWrites.length + deps.size + sib + mkp + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp, outWrites,
    sibWho: Array.from(sibWho).sort(),
    deps: Array.from(deps).sort(), sites: sites.sort((a, b) => a - b),
    outGen, outModule, seven, nine: seven + outGen + outModule,
  };
}
function mergedRegions(marks) {
  const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : CODE.length }));
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    let r = raw[i];
    while (i + 1 < raw.length &&
      !CODE.slice(r.start, raw[i + 1].start).split('\n').some((l) => !isBlankOrComment(l))) {
      r = { start: r.start, end: raw[i + 1].end }; i++;
    }
    out.push(r);
  }
  return out.filter((x) => DECLS.some((d) => d.start >= x.start && d.end < x.end));
}
const PROFILE_CACHE = new Map();
const profileOf = (range) => {
  const key = range[0] + ':' + range[1];
  let hit = PROFILE_CACHE.get(key);
  if (!hit) { hit = profile(range); PROFILE_CACHE.set(key, hit); }
  return hit;
};
function loadTimeProfile(lo, hi) {
  const body = CODE.slice(lo, hi);
  const decls = scanTopLevelDeclarations(body);
  const blanked = Array.from(body);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) blanked[i] = ' ';
  return {
    stmtLines: codeLines(blanked.join('')),
    reads: evaluationTimeReads(body, decls, maskLiterals),
  };
}
const runsNothingAtLoad = (p) => p.stmtLines === 0 && p.reads.length === 0;
const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
function consumersOf(p) {
  return Array.from(new Set(p.sites.map((i) => (hostOf(i) || { name: '(TOP LEVEL)' }).name))).sort();
}
const byConsumer = (p) => consumersOf(p).length + p.inWrites + p.inPropWrites +
  p.outWrites.length + p.deps.length + p.sib + p.mkp + p.gen + p.outGen + p.outModule;
const SORTED_MARKS = MARKS.slice().sort((a, b) => a - b);
const lineAt = (at) => CODE.slice(at, CODE.indexOf('\n', at));
const firstLineOf = (text) => text.slice(0, text.indexOf('\n'));
const nextMarkAfter = (m) => {
  const n = SORTED_MARKS.filter((x) => x > m)[0];
  return n === undefined ? CODE.length : n;
};
const namesIt = (text, name) =>
  new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(text);
function blockAbove(d) {
  let at = CODE.lastIndexOf('\n', d.start - 1) + 1;
  let first = null;
  while (at > 0) {
    const ls = CODE.lastIndexOf('\n', at - 2) + 1;
    if (/^\s*\/\//.test(CODE.slice(ls, at - 1))) { first = ls; at = ls; } else break;
  }
  return first === null ? null : { start: first, text: CODE.slice(first, d.start) };
}

const REC = profileOf([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
const REGIONS = mergedRegions(MARKS);

// ── The screen, run ONCE and reused by §2, §4, §5 and §6 ─────────────────────────────
const candidateRuns = [];
let rawRunCount = 0, seamRejectedCount = 0;
{
  const seen = new Set();
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        rawRunCount++;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo || be - lo < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo, be); } catch (e) { seamRejectedCount++; continue; }
        const key = lo + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        candidateRuns.push({ lo, hi: be, units: be - lo });
      }
    }
  }
  for (const c of candidateRuns) { c.p = profileOf([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
}






async function main() {


// CHAIN, read off the newest contract rather than written here: that file
// carries the list ending at its own layer, and copying it would be a second
// place to drift. Phase 2 gives this cycle its own literal.
const CHAIN = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8')
  .match(/^const CHAIN = \[([\s\S]*?)^\];/m)[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith("'"))
  .map((l) => l.replace(/^'|',?$/g, ''));
const CHAIN_SET = new Set(CHAIN);
const OWNER_KIND = new Map();
for (const s of SIBLINGS) {
  for (const n of s.owners) if (!OWNER_KIND.has(n)) OWNER_KIND.set(n, CHAIN_SET.has(s.rel) ? 'chain' : 'foundation');
}
for (const s of SIBLINGS) {
  for (const n of s.owners) if (!OWNER_KIND.has(n)) OWNER_KIND.set(n, CHAIN_SET.has(s.rel) ? 'chain' : 'foundation');
}
function outboundSplit(lo, hi) {
  const body = MASKED.slice(lo, hi);
  const local = locallyBound(CODE.slice(lo, hi));
  const names = new Set(DECLS.filter((d) => d.start >= lo && d.end < hi).map((d) => d.name));
  let chain = 0, foundation = 0;
  const chainNames = new Set(), foundationNames = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(body))) {
    const n = m[2];
    if (names.has(n) || local.has(n)) continue;
    const kind = OWNER_KIND.get(n);
    if (kind === 'chain') { chain++; chainNames.add(n); }
    else if (kind === 'foundation') { foundation++; foundationNames.add(n); }
  }
  return { chain, foundation, chainNames: [...chainNames].sort(), foundationNames: [...foundationNames].sort() };
}
const byConsumerSplit = (p, split) => byConsumer(p) - p.outModule + split.chain;
for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }

const cleanRuns = candidateRuns.filter((c) => runsNothingAtLoad(c.load));

// ── THE PASS THE FLOOR HIDES ────────────────────────────────────────────────
// The screen above floors a run at RUN_FLOOR units measured from the
// DECLARATION. This pass takes every run the screen skipped for being short,
// re-measures it from the start of its documentation, and keeps those that then
// clear the floor and are at a real seam.
const hiddenRows = [];
{
  const seen = new Set();
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo) continue;
        const ba = i === 0 ? null : blockAbove(own[i]);
        const lo2 = (i === 0 || !ba) ? lo : ba.start;
        if (be - lo >= RUN_FLOOR || be - lo2 < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo2, be); } catch (e) { continue; }
        const key = lo2 + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        const p = profileOf([lo2, be]);
        const split = outboundSplit(lo2, be);
        hiddenRows.push({
          lo: lo2, hi: be, unitsDecl: be - lo, unitsDoc: be - lo2, p, split,
          load: loadTimeProfile(lo2, be), nine: p.nine, bcs: byConsumerSplit(p, split),
        });
      }
    }
  }
}

// A direct scan for assignment to anything the text does not own, kept apart
// from profile() so the outbound direction is measured twice by two different
// means. A metric whose true value is zero needs a control on an input where
// the answer differs, so this function is also run on a planted violation.
function nonLocalAssignmentsUncorrected(text) {
  const masked = maskLiterals(text);
  const local = locallyBound(text);
  const owned = new Set(scanTopLevelDeclarations(text).map((d) => d.name));
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]{1,60}\])*\s*(?:=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) if (!local.has(m[2]) && !owned.has(m[2])) out.push(m[2]);
  return out;
}
// The corrected scan: every declarator of a `var`/`let`/`const` list is local,
// not only the first. The shipped scan above is kept so the audit can measure
// what it got wrong.
function declaredNamesIn(text) {
  const masked = maskLiterals(text);
  const out = new Set();
  const re = /\b(?:var|let|const)\s+/g;
  let m;
  while ((m = re.exec(masked))) {
    let depth = 0, seg = '';
    const segs = [];
    for (let i = re.lastIndex; i < masked.length; i++) {
      const ch = masked[i];
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) { if (depth === 0) break; depth--; }
      if (depth === 0 && ch === ';') break;
      if (depth === 0 && ch === ',') { segs.push(seg); seg = ''; continue; }
      seg += ch;
    }
    segs.push(seg);
    for (const sg of segs) { const n = sg.trim().match(/^([A-Za-z_$][\w$]*)/); if (n) out.add(n[1]); }
  }
  return out;
}
function nonLocalAssignmentsIn(text) {
  const masked = maskLiterals(text);
  const local = new Set([...locallyBound(text), ...declaredNamesIn(text)]);
  const owned = new Set(scanTopLevelDeclarations(text).map((d) => d.name));
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]{1,60}\])*\s*(?:=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) if (!local.has(m[2]) && !owned.has(m[2])) out.push(m[2]);
  return out;
}
const hostGlobalMentions = (text) => (maskLiterals(text).match(/\b(window|globalThis|self|document)\b/g) || []).length;


// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, BASE_CHARS, 'index.html is BASE_CHARS units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…BASE_UTF8 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…BASE_LF line feeds');
eq(sha256(INDEX), BASE_SHA256, '…and this digest');
eq(sha256(git(['show', BASE_SHA + ':index.html'])), BASE_SHA256,
  '…which is the digest of the BASE_SHA commit\'s index.html, read out of git, so the base '
  + 'is a commit and not a remembered number');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and is CODE_CHARS units of residual code');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it holds TOP_LEVEL_DECLS top-level declarations');
eq(REGIONS.length, OWNER_REGIONS, '…across OWNER_REGIONS owner regions');
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the
// missing underlyings gate predicted the document, the residual monolith and the
// script count this audit measures, so the two cycles are joined by numbers.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  eq(CODE.length, Number(prev.match(/^const RESIDUAL_MONOLITH = (\d+);$/m)[1]),
    '…which is exactly the RESIDUAL_MONOLITH the previous contract forecast');
  eq(INDEX.length, Number(prev.match(/^const INDEX_AFTER = (\d+);$/m)[1]),
    '…and the document is exactly the INDEX_AFTER it forecast');
  eq(LOCALS.length, Number(prev.match(/^const LOCAL_SCRIPTS_AFTER = (\d+);$/m)[1]),
    '…with exactly the LOCAL_SCRIPTS_AFTER it forecast');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The region, its seam, and the eight openings the seam admits');
// ─────────────────────────────────────────────────────────────────────────────
eq(RAW_END_IN_CODE - RAW_AT_IN_CODE, RAW_CHARS, 'the raw fragment is RAW_CHARS units');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE, BODY_CHARS, '…BODY_CHARS of which are body');
eq(RAW_CHARS - BODY_CHARS, 1, '…the difference being the one structural separator');
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single LF');
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest');
ok(BODY.endsWith(BODY_ENDING), '…ending on a real line of code');
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the documentation');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…holding NON_ASCII_CHARS non-ASCII characters, so it is pure ASCII…');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…and EM_DASHES em dashes');
eq(Buffer.byteLength(BODY, 'utf8'), BODY.length, '…which is why its UTF-8 and UTF-16 lengths are the same number');
eq(INDEX.indexOf(BODY), CODE_AT + RAW_AT_IN_CODE,
  '…and it occurs in the document at the offset the monolith coordinate implies');
eq(count(INDEX, BODY), 1, '…exactly once, so the fragment is not ambiguous');

// THE SEAM IS MECHANICAL, and it is checked before anything else is claimed.
eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
  'assertSeam accepts the chosen boundary and returns RAW_END_IN_CODE');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(next.name, NEXT_DECL, '…and the declaration immediately after the cut is NEXT_DECL');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DOC_PREFIX.length), NEXT_DOC_PREFIX,
    '…the comment that begins where the cut ends being NEXT_DOC_PREFIX…');
  eq(blockAbove(next).start, RAW_END_IN_CODE,
    '…which is the comment block directly above NEXT_DECL, so the cut ends exactly where the next function\'s documentation begins');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits eight openings.
const OPENINGS = [];
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  eq(prevOwner.name, OWNER_BEFORE, 'the owner before the cut is OWNER_BEFORE…');
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    '…and SEAM_LEGAL_OPENINGS line starts between it and the declaration are accepted');
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the previous function\'s closing brace');
  eq(OPENINGS[1], BLANK_OPENING, '…the next the blank line below it…');
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…then the first documentation line, the cut');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last the declaration');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES documentation lines are each an opening of their own');
  eq(OPENINGS.filter((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() === ''), [BLANK_OPENING],
    '…the blank line being the ONLY one of them that is an empty line');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    'while the one position in between that starts mid-line is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what
  // loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the previous function\'s closing brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the eight are even candidates, counted rather than listed');
  eq(assertSeam(CODE, BLANK_OPENING, BODY_END_IN_CODE), RAW_END_IN_CODE,
    '…and the blank line is a real seam: it ends where the cut ends');
}

// WHAT THE RECOMMENDATION TAKES is the whole comment block documenting the
// function, and nothing else: five comment lines directly above the declaration.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  ok(!/^\/\/ ── /.test(doc), '…and none a `// ── ` banner, so the cut does not open on one');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  ok(doc.indexOf('no journal trade,\n// portfolioId, or trade id is mutated by this path.') >= 0,
    '…and which states the path mutates no journal trade, portfolioId or trade id, a claim §7 measures rather than trusts');
}
// WHAT EACH CHOICE OF OPENING LEAVES. A blank line already separates the closing
// brace above from this function's documentation. Opening on the documentation
// keeps one blank line between that brace and the NEXT function's documentation;
// opening on the blank line itself would fuse them. Cutting at the declaration
// would strand the five comment lines against the next function's own.
{
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    'a blank line already stands between the brace above and the documentation…');
  const atDoc = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(atDoc, JOIN_IF_CUT_AT_DOC), 1,
    '…so the recommended cut leaves the brace, ONE blank line and the next function\'s documentation, once…');
  eq(atDoc.indexOf(JOIN_IF_CUT_AT_DOC), BRACE_OPENING, '…at the place the cut was made');
  ok(atDoc.indexOf(DOC_FIRST_LINE) < 0 && atDoc.indexOf(DECL_FIRST_LINE) < 0,
    '…and no line of this documentation or declaration behind');
  const atBlank = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(atBlank, JOIN_IF_CUT_AT_BLANK), 1,
    'while opening on the blank line instead fuses the brace to the next function\'s documentation, once…');
  eq(count(atBlank, JOIN_IF_CUT_AT_DOC), 0, '…and leaves no blank line between them');
  eq(count(CODE, JOIN_IF_CUT_AT_BLANK), 0, '…a join the monolith does not hold today, at that place or any other');
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'and cutting at the declaration would leave the documentation fused to the next function\'s own');
}
// THE SCREEN DOES NOT SEE THIS RUN AT ALL. The screen floors a run at RUN_FLOOR
// units measured from the DECLARATION; this function measures
// DECL_UNITS_FROM_DECLARATION that way, which is UNDER the floor, so no run ending
// where the cut ends opens at the declaration. Measured from the documentation
// the run is BODY_CHARS units, which clears it, and the pass over the sub-floor
// runs holds it.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION < RUN_FLOOR, '…UNDER RUN_FLOOR, so the floor hides it from the screen…');
ok(BODY_END_IN_CODE - RAW_AT_IN_CODE >= RUN_FLOOR, '…while from the documentation it clears the floor…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…the shipped screen enumerating CANDIDATES_AT_DECLARATION run that ends where this cut does and opens at its declaration…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…while the pass over runs the screen skipped for being short holds exactly HIDDEN_ROWS_AT_CUT row for it');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one call back, two foundation references, both directions measured');
// ─────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a function, so this layer would ship no mutable binding');
  ok(/^async function /.test(DECL_FIRST_LINE), '…an ASYNC one');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'seven of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the eighth being INBOUND_REFERENCES reference from outside');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly the one name buildPortfolioLiveRefreshPayload');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to shipped modules are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in: CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call site');
eq(REC.sites, [CONSUMER_SITE_AT], '…at CONSUMER_SITE_AT');
{
  const lead = 'var backendEnrichedResp = await ';
  eq(CODE.slice(CONSUMER_SITE_AT - lead.length, CONSUMER_SITE_AT), lead,
    '…the consumer AWAITING it and binding the result to `backendEnrichedResp`…');
  const after = CODE.slice(CONSUMER_SITE_AT, CONSUMER_SITE_AT + 400);
  ok(after.indexOf('_backendEnrichedPositionsToAggregatedOptions(backendEnrichedResp);') >= 0
    && after.indexOf('if (backendEnrichedResp) {') >= 0,
  '…and testing it for a truthy answer, which is what a null from the function is for');
}
{
  const keeper = BY_NAME.get(CONSUMER);
  ok(keeper.end < RAW_AT_IN_CODE || keeper.start > RAW_END_IN_CODE, '…the consumer sitting outside the cut');
  ok(CONSUMER_SITE_AT > keeper.start && CONSUMER_SITE_AT < keeper.end, '…and its site inside its body');
  ok(hostOf(CONSUMER_SITE_AT) && hostOf(CONSUMER_SITE_AT).name === CONSUMER, '…with an enclosing declaration of its own');
  eq(keeper.start, CONSUMER_AT, '…the consumer opening at CONSUMER_AT');
  eq(keeper.end, CONSUMER_END, '…ending at CONSUMER_END');
  eq(keeper.chars, CONSUMER_CHARS, '…CONSUMER_CHARS units long');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, which byConsumerSplit leaves out…');
  eq(split.foundationNames, FOUNDATION_NAMES, '…to the two names FOUNDATION_NAMES…');
  eq(FOUNDATION_NAMES.map((n) => MODULE_OWNERS.get(n)), FOUNDATION_MODULES,
    '…declared in FOUNDATION_MODULES respectively, both of which have shipped');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, two below the byConsumer');
  ok(BODY.indexOf('fetch(BACKEND + endpoint, {') >= 0 && BODY.indexOf('_backendAuthHeaders({\'Content-Type\':\'application/json\'})') >= 0,
    '…each read once, inside the request, which is where §7 takes them away one at a time');
}
// THE ONE CALL BACK INTO THE MONOLITH IS MADE WHEN THE FUNCTION IS CALLED, never
// when it loads, and the function it calls is the owner directly above the cut.
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), MONOLITH_DEPENDENCIES[0]).length, DEPENDENCY_REFERENCES,
    'the body names buildPortfolioLiveRefreshPayload at DEPENDENCY_REFERENCES place…');
  ok(BODY.indexOf('buildPortfolioLiveRefreshPayload(') < BODY.indexOf('  try {'),
    'the call stands ABOVE the body\'s `try`, which is why a missing builder rejects instead of resolving null…');
  ok(BODY.indexOf('var payload = buildPortfolioLiveRefreshPayload(positionList);') >= 0,
    '…a plain call on the position list it validated, whose result it writes three fields onto…');
  eq(dep.form, 'function', 'buildPortfolioLiveRefreshPayload is a top-level function of the monolith…');
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT…');
  eq(dep.end, DEPENDENCY_END, '…ending at DEPENDENCY_END…');
  eq(dep.end, BRACE_OPENING, '…which is the brace line the seam\'s first opening starts on: it is the owner directly above the cut…');
  ok(dep.start >= REGION_AT && dep.end < REGION_END, '…inside the same banner region as the cut, one of the owners the cut leaves behind…');
  eq(refSites(MASKED, MONOLITH_DEPENDENCIES[0]).map((at) => [at, (hostOf(at) || { name: '(TOP LEVEL)' }).name]),
    DEPENDENCY_SITES, '…and referenced at DEPENDENCY_SITES, its own declaration among them');
  eq(DEPENDENCY_SITES.filter((s) => s[1] === OWNERS_EXPECTED[0]).length, 1,
    '…exactly one of them in the cut…');
  eq(DEPENDENCY_SITES.filter((s) => s[1] !== OWNERS_EXPECTED[0] && s[1] !== MONOLITH_DEPENDENCIES[0]).length, 2,
    '…and two more in functions that stay, so the dependency is shared and the monolith still needs it after the move');
  eq(propertyWriteBases(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).filter((b) => b === MONOLITH_DEPENDENCIES[0]).length, 0,
    '…and the body only CALLS it: nothing is written to it');
  eq(propertyWriteBases('function f() { buildPortfolioLiveRefreshPayload.cache = 1; }')
    .filter((b) => b === MONOLITH_DEPENDENCIES[0]).length, 1,
  'control — the same scan finds a planted write to a property of it, so that zero is a measurement');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time, the payload builder, BACKEND and _backendAuthHeaders included');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
//
// THE SCAN THIS FILE INHERITED READS ONLY THE FIRST NAME OF A `var` LIST AS LOCAL.
// This body declares no comma-separated list, so it reports nothing here, and the
// corrected scan agrees. A zero from either needs a control that finds a
// violation.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignments to a name it takes for a global…');
  ok([...declaredNamesIn(BODY)].every((n) => locallyBound(BODY).has(n)),
    '…because every name the body declares with var is already one the inherited scan reads as local: there is no list for it to misread');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the body does not own…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document');
  ok(BODY.indexOf('payload.portfolioId = portfolioId;') >= 0 && !nonLocalAssignmentsIn(BODY).includes('payload'),
    '…the three writes it makes being property writes on `payload`, a local, which the scan does not take for a global');
  // CONTROLS: the corrected scan DOES find a planted violation and still ignores
  // every declarator, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — it finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('async function f(p) { var payload = {}; payload.x = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and one on a name the body does not own is found');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the previous contract named it, the tie is gone, and the screen never held the row');
// ─────────────────────────────────────────────────────────────────────
// WHAT THE PREVIOUS CONTRACT PUBLISHED, read out of it.
const prevText = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
const listOf = (name) => prevText.match(new RegExp('^const ' + name + ' = \\[([\\s\\S]*?)^\\];', 'm'))[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
  .map((l) => JSON.parse(l.replace(/,$/, '').replace(/'/g, '"')));
const prevNum = (name) => Number(prevText.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
{
  eq(prevNum('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(prevNum('RAW_AT_IN_CODE'), PREVIOUS_RAW_AT, '…opening at PREVIOUS_RAW_AT…');
  ok(PREVIOUS_RAW_AT + PREVIOUS_RAW_CHARS < RAW_AT_IN_CODE,
    '…and it sat entirely BEFORE this cut, so this opening is earlier than the one it published, by PREVIOUS_RAW_CHARS');
  const listed = listOf('RUNNERS_UP');
  eq(listed.length, RUNNERS_UP.length, 'the previous contract published as many runners-up as this audit does…');
  eq(listed[0], [RAW_AT_IN_CODE + PREVIOUS_RAW_CHARS, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the first of them being THIS cut\'s row, at the same byConsumerSplit and raw nine, its length measured from the documentation, moved by PREVIOUS_RAW_CHARS…');
  const moved = (r) => [r[0] > PREVIOUS_RAW_AT ? r[0] - PREVIOUS_RAW_CHARS : r[0], r[1], r[2], r[3]];
  eq(listed.slice(1).filter((r) => r[0] > PREVIOUS_RAW_AT).length, 2,
    '…of the other three, two sat after that cut and moved by the same amount and one sat before it and did not…');
  eq(listed.slice(1).map(moved), RUNNERS_UP.slice(0, 3),
    '…and the three, moved that way, are exactly the top of RUNNERS_UP now, which gains a fourth from beneath');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidates at 2…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2 && c.lo < RAW_END_IN_CODE && c.hi > RAW_AT_IN_CODE).length, 0,
    '…NOT ONE of them overlapping this cut, which is why this cut is not in the screen at all…');
  eq(hiddenRows.length, HIDDEN_ROWS, 'the pass over runs the screen skipped for being short has HIDDEN_ROWS rows…');
  const hiddenClean = hiddenRows.filter((c) => runsNothingAtLoad(c.load));
  eq(hiddenClean.length, HIDDEN_CLEAN_ROWS, '…HIDDEN_CLEAN_ROWS of which run nothing at load');
  ok(hiddenRows.every((c) => c.unitsDecl < RUN_FLOOR && c.unitsDoc >= RUN_FLOOR),
    '…every one below RUN_FLOOR from its declaration and at or above it from its documentation');
  ok(hiddenRows.every((c) => !candidateRuns.some((s) => s.lo === c.lo && s.hi === c.hi)),
    '…and not one of them is a row the shipped screen already has');
  eq(hiddenClean.filter((c) => c.bcs <= 1).length, HIDDEN_SCORE_ONE,
    'HIDDEN_SCORE_ONE of them score 1 on byConsumerSplit: neither enumeration holds a row at 1…');
  const atTwo = hiddenClean.filter((c) => c.bcs === 2).sort((a, b) => a.nine - b.nine || a.lo - b.lo || a.hi - b.hi);
  eq(atTwo.length, HIDDEN_SCORE_TWO, '…and HIDDEN_SCORE_TWO score 2');
  eq(atTwo.map((c) => [c.lo, c.hi, c.unitsDecl, c.unitsDoc, c.nine, c.bcs, c.p.names]),
    HIDDEN_SCORE_TWO_ROWS, '…those being exactly HIDDEN_SCORE_TWO_ROWS, the first of them THIS cut, which only the pass holds');
  // EVERY ROW AT THE BEST TIER, over the screen and the pass together.
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    'in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit…');
  const best = rows.filter((r) => r.bcs <= BY_CONSUMER_SPLIT).map((r) => [r.lo, r.hi, r.nine, r.bcs])
    .sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
  eq(best, BEST_TIER_ROWS, '…and the rows AT it are exactly BEST_TIER_ROWS');
  eq(new Set(best.map((r) => r[0])).size, OPENINGS_AT_TWO_OR_BELOW,
    '…over OPENINGS_AT_TWO_OR_BELOW distinct openings');
  eq(best.length, OPENINGS_AT_TWO_OR_BELOW, '…counted over the rows as well as the openings, so a second row at one opening could not hide');
  // THE TIE IS GONE: exactly one row at the best score has a raw nine of
  // FULL_NINE or below, and it is this cut's.
  eq(best.filter((r) => r[2] <= FULL_NINE).map((r) => r[0]), [RAW_AT_IN_CODE],
    '…exactly ONE of them has a raw nine of FULL_NINE or below, and it opens where this cut does: there is no tie left for a tie-break to choose between');
  ok(best.filter((r) => r[0] !== RAW_AT_IN_CODE).every((r) => r[2] > FULL_NINE),
    '…every other row at that score having a raw nine ABOVE FULL_NINE');
  // THE ORDER THE SCREEN PUBLISHES puts this cut first on its first two keys alone.
  const bestPerAll = new Map();
  for (const r of rows) {
    const b = bestPerAll.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPerAll.set(r.lo, r);
  }
  const rankedAll = [...bestPerAll.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units);
  eq([rankedAll[0].lo, rankedAll[0].bcs, rankedAll[0].nine], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE],
    'ranked by (byConsumerSplit, nine, units), the order the screen publishes, this cut\'s row comes first…');
  ok(rankedAll[1].bcs > rankedAll[0].bcs || rankedAll[1].nine > rankedAll[0].nine,
    '…ahead of the second row on the first two keys alone, so the length key is never consulted');
  // WHAT IS PUBLISHED FOR THE NEXT CYCLE, over the screen and the hidden pass
  // together, skipping anything that overlaps the cut.
  const overlaps = (lo, hi) => lo < RAW_END_IN_CODE && hi > RAW_AT_IN_CODE;
  const pool = rows.filter((r) => !overlaps(r.lo, r.hi));
  const bestPer = new Map();
  for (const r of pool) {
    const b = bestPer.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPer.set(r.lo, r);
  }
  const ranked = [...bestPer.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units)
    .slice(0, RUNNERS_UP.length).map((r) => [r.lo, r.bcs, r.nine, r.units]);
  eq(ranked, RUNNERS_UP,
    'the four best other openings, by (byConsumerSplit, nine, units), are exactly RUNNERS_UP');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would cost: the owners above, the owner and ends below, the region');
// ─────────────────────────────────────────────────────────────────────────────
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  eq((blockAbove(d) || { start: d.start }).start, lo, 'taking ' + name + ' with its documentation, if it has any, opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  const p = profileOf([lo, BODY_END_IN_CODE]);
  eq([RAW_END_IN_CODE - lo, p.nine, byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), p.deps.length],
    [units, nine, bcs, deps], '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(runsNothingAtLoad(loadTimeProfile(lo, BODY_END_IN_CODE)), '…and it too runs nothing at load');
  ok(nine > FULL_NINE && bcs > BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine and on byConsumerSplit');
}
eq(EXTENSIONS_UP[0][0], MONOLITH_DEPENDENCIES[0],
  'the first owner taken above is the dependency itself: taking it along does not remove the coupling, it raises the score…');
ok(EXTENSIONS_UP[0][3] > FULL_NINE && EXTENSIONS_UP[0][4] > BY_CONSUMER_SPLIT,
  '…from FULL_NINE to its pinned nine and from BY_CONSUMER_SPLIT to its pinned byConsumerSplit');
// THE SERIES IS NOT MONOTONE, and nothing above claims it is: the fourth owner
// brings the raw nine and byConsumerSplit DOWN from the third. What holds, and is
// asserted above for each, is that none of the four is better than the cut.
ok(EXTENSIONS_UP[3][3] < EXTENSIONS_UP[2][3] && EXTENSIONS_UP[3][4] < EXTENSIONS_UP[2][4],
  'the series is NOT monotone: the fourth owner scores below the third on both, which is why only "none beats the cut" is claimed');
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
for (const [name, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const d = BY_NAME.get(name);
  const hb = downEnd(d);
  const hr = assertSeam(CODE, RAW_AT_IN_CODE, hb);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq([hr - RAW_AT_IN_CODE, p.nine, byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), p.deps.length],
    [units, nine, bcs, deps], 'running the cut down through ' + name + ' costs the pinned units, nine, byConsumerSplit and dependencies');
  ok(CODE.slice(RAW_AT_IN_CODE, hb).indexOf(STATEMENT_AFTER_ILLEGAL) >= 0,
    '…and carries the top-level statement that follows ' + SEAM_ILLEGAL_DOWN[0] + '…');
  ok(!runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb)), '…so it does NOT run nothing at load…');
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…and is worse on the raw nine, and no better on byConsumerSplit');
}
// THE OWNER DIRECTLY BELOW CANNOT BE TAKEN. It ends directly against a top-level
// statement, so no cut can end there, and the refusal is asserted by name.
{
  const below = DECLS.filter((d) => d.start >= RAW_END_IN_CODE).map((d) => d.name);
  eq(below.slice(0, SEAM_ILLEGAL_DOWN.length), SEAM_ILLEGAL_DOWN,
    'the owner directly below the cut is SEAM_ILLEGAL_DOWN…');
  eq(below[SEAM_ILLEGAL_DOWN.length], EXTENSIONS_DOWN[0][0],
    '…and the first owner after it is the first of EXTENSIONS_DOWN');
  eq(below[0], NEXT_DECL, '…the one directly below being NEXT_DECL');
  for (const name of SEAM_ILLEGAL_DOWN) {
    const hb = downEnd(BY_NAME.get(name));
    throwsWith(() => assertSeam(CODE, RAW_AT_IN_CODE, hb), SEAM_ILLEGAL_ERROR,
      name + ' is not a legal end for this cut: the seam rule refuses it by name');
    eq(CODE.slice(hb - 2, hb), '}\n', '…it ends on its closing brace…');
    eq(CODE.slice(hb, hb + STATEMENT_AFTER_ILLEGAL.length), STATEMENT_AFTER_ILLEGAL,
      '…and what follows begins at once with STATEMENT_AFTER_ILLEGAL, a statement that runs when the script loads');
  }
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner
// region" would forbid cutting any of it. This cut is owner 5 of 25, so it sits
// in the middle of its region and leaves the banner and every other owner.
{
  const reg = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, above the cut');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
  ok(reg.end > RAW_END_IN_CODE, '…so the cut does NOT close its region');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the PortfolioRefreshPayload banner, which the cut leaves where it is');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…this function being owner number OWNER_POSITION of them');
  eq(own[OWNER_POSITION - 2].name, OWNER_BEFORE, '…and OWNER_BEFORE the one above it');
  eq(own.slice(0, OWNER_POSITION - 1).map((d) => d.name).reverse(), EXTENSIONS_UP.map((e) => e[0]),
    'the owners above the cut in its region are exactly the EXTENSIONS_UP names, nearest first, so every owner above it is priced');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  // WHAT THE CUT LEAVES BEHIND. The banner is above the cut, so every owner left
  // in the region keeps it.
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(clean.slice(REGION_AT, REGION_AT + BANNER_LINE_PREFIX.length), BANNER_LINE_PREFIX,
    'after the cut the region\'s banner is where it was…');
  eq(scanTopLevelDeclarations(clean).filter((d) => d.start >= REGION_AT && d.end <= REGION_END - RAW_CHARS).length,
    REGION_OWNERS - 1, '…over the REGION_OWNERS - 1 owners left in it');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and what it counts');
// ─────────────────────────────────────────────────────────────────────────────
eq(RUN_FLOOR, 1500, 'the screen floors runs at RUN_FLOOR units');
eq(rawRunCount, RAW_RUNS, 'it enumerates RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…of which assertSeam refuses SEAM_REJECTED');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
eq(cleanRuns.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
{
  // THE CUT THAT SHIPPED CHANGED THE SCREEN. It took the last of five owners out
  // of a region, which removes the runs that ended there: five raw runs and five
  // candidates, five of which were clean, and no seam rejection.
  eq([prevNum('RAW_RUNS') - RAW_RUNS, prevNum('CANDIDATES') - CANDIDATES, prevNum('CLEAN_CANDIDATES') - CLEAN_CANDIDATES,
    prevNum('SEAM_REJECTED') - SEAM_REJECTED], [5, 5, 5, 0],
  '…against the previous contract\'s figures the shipped cut took five raw runs, five candidates and five clean candidates out of the screen, and no seam rejection');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => c.hi > BODY_END_IN_CODE),
  '…and every run the screen opens there is LONGER than the cut, since the cut itself is under the floor from there and so is not one of them');

// ─────────────────────────────────────────────────────────────────────
section('7. It loads bare, rejects without its payload builder, and answers null for every failure inside the request');
// ─────────────────────────────────────────────────────────────────────
{
  const lines = BODY.split('\n');
  lines.pop();
  eq(lines.length, SPLIT_LINES, 'the body is SPLIT_LINES lines');
  eq(lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length, CODE_LINES, '…CODE_LINES of code');
  eq(lines.filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES, '…COMMENT_LINES comment');
  eq(lines.filter((l) => !l.trim()).length, BLANK_LINES, '…and BLANK_LINES blank');
  eq(CODE_LINES + COMMENT_LINES + BLANK_LINES, SPLIT_LINES,
    '…the three summing to SPLIT_LINES, so none is unaccounted for');
}
{
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const WARN_FAILED = '[PortfolioRefresh] backend enriched positions failed';
  const WARN_NOT_OK = '[PortfolioRefresh] backend enriched positions not ok';
  const WARN_UNAVAILABLE = '[PortfolioRefresh] backend enriched positions unavailable';
  const POSITIONS = [{ ticker: 'AAPL', qty: 1 }, { ticker: 'MSFT', qty: -2 }];
  const answer = (data, over) => Object.assign({
    ok: true, status: 200, text: async () => '', json: async () => data,
  }, over || {});
  // A HARNESS: the function run in a fresh VM context whose dependencies are
  // fakes this file controls and records. Nothing real is read, and a dependency
  // can be left out to see what its absence does.
  const harness = (opts = {}) => {
    const log = { fetch: [], warn: [], build: [], headers: [], timeout: [], payloads: [] };
    const sandbox = {};
    if (opts.builder !== false) {
      sandbox.buildPortfolioLiveRefreshPayload = (list) => {
        log.build.push(list);
        if (opts.builderThrows) throw opts.builderThrows;
        const payload = { positions: list, openPositions: list, optionSymbols: [], symbols: [] };
        log.payloads.push(payload);
        return payload;
      };
    }
    if (opts.backend !== false) sandbox.BACKEND = 'https://backend.test';
    if (opts.auth !== false) {
      sandbox._backendAuthHeaders = (h) => { log.headers.push(plain(h)); return Object.assign({ Authorization: 'Bearer t' }, h); };
    }
    if (opts.fetch !== false) {
      sandbox.fetch = async (url, init) => {
        log.fetch.push({ url, init });
        const r = opts.respond ? opts.respond(url, init) : answer({ ok: true });
        if (r && r.__throw !== undefined) throw r.__throw;
        return r;
      };
    }
    if (opts.abort !== false) sandbox.AbortSignal = { timeout: (ms) => { log.timeout.push(ms); return { timeoutMs: ms }; } };
    sandbox.console = { warn: (...a) => log.warn.push(a.map((x) => (x === undefined ? '(undefined)' : plain(x)))) };
    const ctx = vm.createContext(sandbox);
    vm.runInContext(BODY, ctx);
    const fn = vm.runInContext(VM_GLOBALS[0], ctx);
    return { log, fn, call: (id, positions) => fn(id, positions) };
  };
  const rejection = async (p) => { try { await p; return null; } catch (e) { return e; } };

  // LOADS BARE: declaring the function needs nothing.
  {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(BODY, ctx);
    eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
      'it LOADS in a completely bare VM and declares exactly its one owner');
    const bare = vm.runInContext(VM_GLOBALS[0], ctx);
    eq(bare.constructor.name, 'AsyncFunction', '…an async function…');
    eq(typeof bare(null, []).then, 'function', '…which answers a promise even when it exits at once…');
    eq([await bare(null, POSITIONS), await bare('p1', []), await bare('p1', null), await bare(0, POSITIONS), await bare('', POSITIONS)],
      [null, null, null, null, null],
      '…and CALLED with no dependency at all it resolves null, without touching one, when the portfolio id or the positions are missing');
    const err = await rejection(bare('p1', POSITIONS));
    eq(err && err.name, 'ReferenceError',
      'with both supplied it REJECTS with a ReferenceError, because the payload builder is called above the `try`…');
    ok(err && err.message.indexOf(MONOLITH_DEPENDENCIES[0]) >= 0, '…and the error names the payload builder');
  }
  // EVERYTHING INSIDE THE `try` IS CAUGHT: take each dependency away in turn.
  {
    for (const [what, opts, name] of [
      ['fetch', { fetch: false }, 'fetch'],
      ['BACKEND', { backend: false }, 'BACKEND'],
      ['_backendAuthHeaders', { auth: false }, '_backendAuthHeaders'],
      ['AbortSignal', { abort: false }, 'AbortSignal'],
    ]) {
      const h = harness(opts);
      eq(await h.call('p1', POSITIONS), null, 'with ' + what + ' missing the call resolves null, not a rejection…');
      eq(h.log.warn.length, 1, '…after one warning…');
      eq(h.log.warn[0][0], WARN_UNAVAILABLE, '…the "unavailable" one…');
      ok(h.log.warn[0][1].indexOf(name) >= 0, '…carrying the ReferenceError\'s message, which names ' + what);
      eq(h.log.fetch.length, 0, '…and no request was made');
    }
    const h = harness({ builderThrows: new Error('bad positions') });
    const e = await rejection(h.call('p1', POSITIONS));
    eq(e && e.message, 'bad positions', 'a payload builder that THROWS rejects the call with its own error, outside the `try`…');
    eq([h.log.fetch.length, h.log.warn.length], [0, 0], '…with no request made and no warning logged');
  }
  // THE EARLY EXITS touch nothing.
  {
    const h = harness();
    eq([await h.call(null, POSITIONS), await h.call('p1', []), await h.call('p1', undefined), await h.call('p1', { length: 1 }), await h.call(0, POSITIONS)],
      [null, null, null, null, null], 'a missing id, an empty list, a missing list and a list-like that is not an array each answer null…');
    eq([h.log.build.length, h.log.fetch.length, h.log.headers.length, h.log.timeout.length, h.log.warn.length], [0, 0, 0, 0, 0],
      '…without building a payload, making a request, asking for headers, starting a timeout or logging a warning');
  }
  // THE REQUEST.
  {
    const data = { ok: true, positions: [{ id: 1 }] };
    const snapshot = JSON.stringify(POSITIONS);
    const h = harness({ respond: () => answer(data) });
    const got = await h.call('p1', POSITIONS);
    ok(got === data, 'a good answer is returned as the very object the response parsed to, untouched…');
    eq(h.log.warn.length, 0, '…with no warning');
    eq(h.log.build.length, 1, 'the payload builder is called once…');
    ok(h.log.build[0] === POSITIONS, '…with the very list it was given…');
    eq(JSON.stringify(POSITIONS), snapshot, '…and the list is left exactly as it was: this path mutates no position, as its documentation says');
    eq(h.log.fetch.length, 1, 'one request is made…');
    const { url, init } = h.log.fetch[0];
    eq(url, 'https://backend.test/portfolio/p1/positions/enriched', '…to BACKEND plus the portfolio\'s enriched-positions path…');
    eq(init.method, 'POST', '…by POST…');
    eq(init.cache, 'no-store', '…never cached…');
    eq(h.log.headers, [{ 'Content-Type': 'application/json' }], '…with headers built by _backendAuthHeaders from a JSON content type…');
    eq(plain(init.headers), { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, '…and the headers it returned are the ones sent');
    eq([h.log.timeout, plain(init.signal)], [[18000], { timeoutMs: 18000 }], '…with an 18-second timeout signal, started once');
    eq(JSON.parse(init.body), {
      positions: POSITIONS, openPositions: POSITIONS, optionSymbols: [], symbols: [],
      portfolioId: 'p1', includeDiagnostics: true, source: 'portfolio_panel',
    }, '…and a body that is the builder\'s payload with exactly three fields written onto it');
    ok(h.log.payloads[0].includeDiagnostics === true && h.log.payloads[0].source === 'portfolio_panel' && h.log.payloads[0].portfolioId === 'p1',
      '…written onto the payload the builder returned, and nowhere else');
    // THE ID.
    const g = harness();
    await g.call(7, POSITIONS);
    eq(g.log.fetch[0].url, 'https://backend.test/portfolio/7/positions/enriched', 'a numeric id is turned into text for the path…');
    eq(JSON.parse(g.log.fetch[0].init.body).portfolioId, 7, '…while the payload keeps it as the number it was');
    const k = harness();
    await k.call('a/b c?d', POSITIONS);
    eq(k.log.fetch[0].url, 'https://backend.test/portfolio/a%2Fb%20c%3Fd/positions/enriched', 'an id with a slash, a space and a question mark is percent-encoded in the path');
  }
  // THE FAILURES, each answered null with one warning.
  {
    const long = 'x'.repeat(300);
    const notOk = harness({ respond: () => answer(null, { ok: false, status: 503, text: async () => long }) });
    eq(await notOk.call('p1', POSITIONS), null, 'a response that is not ok answers null…');
    eq(notOk.log.warn, [[WARN_FAILED, { status: 503, body: 'x'.repeat(240) }]], '…warning with its status and the first 240 characters of its text');
    const noText = harness({ respond: () => answer(null, { ok: false, status: 500, text: async () => { throw new Error('closed'); } }) });
    eq(await noText.call('p1', POSITIONS), null, 'a text() that rejects does not change the answer…');
    eq(noText.log.warn, [[WARN_FAILED, { status: 500, body: '' }]], '…the body logged being empty');
    const nullText = harness({ respond: () => answer(null, { ok: false, status: 502, text: async () => null }) });
    await nullText.call('p1', POSITIONS);
    eq(nullText.log.warn, [[WARN_FAILED, { status: 502, body: '' }]], 'a text() that answers null is logged as an empty body');
    let jsonCalls = 0;
    const neverParsed = harness({ respond: () => answer(null, { ok: false, status: 500, json: async () => { jsonCalls++; return {}; } }) });
    await neverParsed.call('p1', POSITIONS);
    eq(jsonCalls, 0, 'and a response that is not ok is never parsed');
    const nullBody = harness({ respond: () => answer(null) });
    eq(await nullBody.call('p1', POSITIONS), null, 'a body that parses to null answers null…');
    eq(nullBody.log.warn, [[WARN_NOT_OK, null]], '…warning "not ok" with the null');
    const reasons = [
      [{ ok: false, reason: 'r', error: 'e', message: 'm' }, 'r'],
      [{ ok: false, error: 'e', message: 'm' }, 'e'],
      [{ ok: false, message: 'm' }, 'm'],
      [{ ok: false }, '(undefined)'],
    ];
    for (const [data, expected] of reasons) {
      const h = harness({ respond: () => answer(data) });
      eq(await h.call('p1', POSITIONS), null, 'a body with ok:false answers null…');
      eq(h.log.warn, [[WARN_NOT_OK, expected]], '…warning with its reason, else its error, else its message, else nothing: ' + expected);
    }
    for (const data of [{}, { ok: 0 }, { ok: null }, { ok: 'false' }, { ok: true }]) {
      const h = harness({ respond: () => answer(data) });
      const got = await h.call('p1', POSITIONS);
      ok(got === data && h.log.warn.length === 0,
        'only ok:false is a refusal: ' + JSON.stringify(data) + ' is returned as it is, without a warning');
    }
    const boom = harness({ respond: () => ({ __throw: new Error('boom') }) });
    eq(await boom.call('p1', POSITIONS), null, 'a request that rejects answers null…');
    eq(boom.log.warn, [[WARN_UNAVAILABLE, 'boom']], '…warning "unavailable" with the error\'s message');
    const text = harness({ respond: () => ({ __throw: 'plain text' }) });
    await text.call('p1', POSITIONS);
    eq(text.log.warn, [[WARN_UNAVAILABLE, 'plain text']], 'a rejection that is a bare string is logged as that string');
    const nul = harness({ respond: () => ({ __throw: null }) });
    await nul.call('p1', POSITIONS);
    eq(nul.log.warn, [[WARN_UNAVAILABLE, 'null']], '…and a null rejection as the text "null"');
    const badJson = harness({ respond: () => answer(null, { json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } }) });
    eq(await badJson.call('p1', POSITIONS), null, 'a body that cannot be parsed answers null…');
    eq(badJson.log.warn, [[WARN_UNAVAILABLE, 'Unexpected end of JSON input']], '…warning "unavailable" with the parser\'s message');
  }
}

// ─────────────────────────────────────────────────────────────────────
section('8. Where this layer would sit, and what it would change');
// ─────────────────────────────────────────────────────────────────────
{
  ok(CHAIN.indexOf(MODULE_REL_IF_CUT) < 0, 'this module is not in the chain yet');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)), '…and its path does not exist yet');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, 'this cut is larger than that, so it would not be the smallest…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK_IF_CUT,
    '…measured against every layer rather than inferred from the first: it would rank SIZE_RANK_IF_CUT by size');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 0, '…and none exactly its size');
  eq(SIZE_RANK_IF_CUT + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH + 1,
    '…the rank and that count partitioning the chain plus this cut, so neither drifts alone');
  // THE TWO CHAIN-WIDE SHAPE COUNTS. This body is pure ASCII, so the pure-ASCII
  // count WOULD move; it does not open on a `── ` banner, so the banner count
  // would not.
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(ascii(BODY), '…and this body is too, so that count WOULD move');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS + 1, '…by one, measured with it included');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(!banner(BODY), '…and this body does not, so that count would NOT move');
  eq(sources.concat([BODY]).filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…measured with it included, which is the same count');
  // THE OTHER CHAIN-WIDE COUNT THAT WOULD MOVE: layers whose contract pins a
  // non-empty MONOLITH_DEPENDENCIES. Counted over the suite and then compared with
  // the figure the contract that carries it pins.
  const pinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))
    .filter((src) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    });
  eq(pinning.length, LAYERS_WITH_A_DEPENDENCY,
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, counted over the suite…');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]), LAYERS_WITH_A_DEPENDENCY,
  '…which is the figure the contract that carries it pins');
  ok(MONOLITH_DEPENDENCIES.length > 0, '…and this cut pins a non-empty list, so that count WOULD move, by one');
}
// WHAT THE CUT WOULD COST THE DOCUMENT, forecast here so Phase 2 can be held
// to it the way the last cycle held this one to its own forecast.
eq(TAG_IF_CUT.length, RAW_CHARS - NET_REDUCTION,
  'the tag it would add is RAW_CHARS less NET_REDUCTION units');
eq(TAG_IF_CUT, '<script src="./' + MODULE_REL_IF_CUT + '"></script>\n',
  '…and names the module this audit recommends');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html would land at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
eq(LOCAL_SCRIPTS + 1, LOCAL_SCRIPTS_AFTER, '…and LOCAL_SCRIPTS_AFTER local scripts');
eq(count(INDEX, TAG_IF_CUT), 0, '…and no such tag exists yet');
eq(LOCALS[LOCALS.length - 1], 'js/services/rs-quality-check.js',
  '…the tag would follow the newest local script, which is the previous layer');

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NOT ONE production file differs from the base: this PR measures, it does not move');
  eq(git(['show', BASE_SHA + ':index.html']).length, BASE_CHARS,
    '…and the base commit\'s index.html is the length measured above');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL_IF_CUT)),
    '…with the module this audit recommends not yet written');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  ok(all.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  eq(fs.readFileSync(path.join(ROOT, AUDIT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and AUDIT_REL is the path of THIS file, byte for byte');
  ok(all.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  ok(all.every((rel) => rel.startsWith('tests/')), '…and every changed path is a test artifact');
  // THE RATCHET.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this audit in it');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, TEST_FILE_COUNT - 1,
  '…one more than the base commit carried, read out of git');
  const RATCHETED = /^const TEST_FILE_COUNT = \d+;$/m;
  const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js') &&
      RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS files pin the suite file count');
  ok(contracts.every((f) => new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm')
    .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
  '…and every one of them now pins the ratcheted value, this audit included');
  ok(contracts.indexOf(path.basename(AUDIT_REL)) >= 0,
    '…this audit being one of them, so it ratchets itself rather than exempting itself');
  // THE BUDGET.
  const auditSpec = require(path.join(ROOT, AUDIT_SPEC_REL));
  eq(auditSpec.target, AUDIT_REL, 'the audit spec targets this audit');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  eq(declaredNow, BASE_DECLARED_MUTANTS + auditSpec.mutants.length - RETIRED_MUTANTS,
    '…and the live total is the base, LESS the spec this cycle retires, PLUS this audit\'s own '
    + '— the arithmetic of the change rather than the total it happens to reach');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at MUTANT_BUDGET');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  // ABSENCE ALONE IS NOT A PIN.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the outgoing CONTRACT\'s spec is retired, in Phase 1 as the rhythm runs');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely one that never existed');
  ok(fs.existsSync(path.join(ROOT, PREVIOUS_CONTRACT)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + PREVIOUS_CONTRACT + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(AUDIT_SPEC_REL)], '…and during Phase 1 it is THIS audit\'s');
}

console.log('\n' + pass + ' assertions passed.');
console.log('BACKEND_POSITIONS_ENRICHED_AUDIT_OK');
}

main();
