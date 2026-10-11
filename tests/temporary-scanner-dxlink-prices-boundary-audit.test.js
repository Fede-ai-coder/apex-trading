'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER DXLINK PRICES — TEMPORARY BOUNDARY AUDIT (Phase 1).
//
// MEASUREMENT ONLY. Production stays byte-identical to the base; the next PR
// moves the bytes and deletes this file, replaced one-for-one by the permanent
// contract it becomes.
//
// THE RECOMMENDATION. [61214,64249) in monolith coordinates — 3,035 units raw
// and 3,034 of body, ONE owner, an async function — into
// js/services/scanner-dxlink-prices.js. `fetchScannerDXLinkPrices` opens a
// DXLink feed on demand for the scanner's stock quotes: it asks the backend for a
// quote token, walks the SETUP, AUTH, CHANNEL_REQUEST, FEED_SETUP and
// FEED_SUBSCRIPTION handshake, subscribes the tickers in batches of 150, and
// resolves with a bid, ask and mark per symbol on full coverage or after 25
// seconds, then disconnects. The first 308 units are the four comment lines that
// document it, the first of which is the `// ── ` banner that opens its region.
//
// ── THE FINDING, PART ONE: THE TIE IS GONE ─────────────────────────────────
//
// The audit before this one published a tie at the best score between two distinct
// openings, this one and the pair it took, and said how it broke the tie. That pair
// has shipped. §4 measures the rows that remain in the shipped screen and in the
// pass over its sub-floor runs: this opening is the ONLY row whose raw nine is 3 or
// below and which also scores 2 on byConsumerSplit, so there is no tie for a
// tie-break to choose against. The claim is scoped to those two enumerations.
//
// ── PART TWO: THE PREVIOUS CONTRACT NAMED IT FIRST ─────────────────────────
//
// The contract before this audit published its four best other openings, and the
// first was this one. The cut that contract shipped sat entirely AFTER this opening
// in the monolith, so no offset here moved because of it, and §4 checks the
// published list against this base: this opening is the first of the four,
// unmoved, and the other three are the top of the list that remains.
//
// ── PART THREE: THE SCAN WAS WRONG HERE, THE FUNCTION WAS NOT ──────────────
//
// A direct scan for assignment to anything the body does not own reports four hits
// on this function, to `channelId`, `subscribed` (twice) and `ask`. All four are
// names the body declares in comma-separated `var` lists, and the scan treated only
// the first name of a list as local. §3 measures the false positives, then the
// corrected scan, and plants a violation each is run against.
//
// ── PART FOUR: TWO REFERENCES OUT, BOTH READ AT CALL TIME ──────────────────
//
// The body reads `S`, the monolith's state object, on its first line, and calls
// `ttCall`, the backend client's request function, on its second. `S` is the whole
// of the raw nine's ninth direction. `ttCall` lives in a module that already
// shipped, which byConsumerSplit does not count but §3 measures by name. Both are
// reached only when the function is CALLED, never when it loads, so the module
// loads in a bare VM. §7 runs it with fakes for both, for the WebSocket and for the
// timers, and walks the whole handshake.
//
// ── PART FIVE: THE BOUNDARY IS A JUDGEMENT, IN A FAMILIAR SHAPE ────────────
//
// The seam accepts SEVEN line starts between the previous function's closing brace
// and the declaration: that brace, a blank line, each of the four documentation
// lines, and the declaration. Six parse; the brace does not. Unlike the declaration
// the screen usually visits, the opening the screen visits here is the FIRST
// documentation line, because that line is the banner that opens the region, and
// the run is long enough from the declaration to clear the floor. §2 measures both
// facts.
//
// ── PART SIX: THE CUT TAKES THE BANNER AND LEAVES ONE OWNER ────────────────
//
// The region holds two owners, this one and `_ensureVixFamily`. Taking the first
// takes the banner with it, so the owner left behind no longer sits under a banner
// of its own, and §5 measures that. Taking both would be the whole region.
//
// ── PRICED, AND WHERE IT WOULD SIT ─────────────────────────────────────────
//
// §5 prices the owners above it, the owners below it and the region. §8 ranks it by
// size against the forty-nine layers the chain holds, and counts the two shape
// measures against it: it opens on a banner, so that count WOULD move; it holds
// non-ASCII text, so the pure-ASCII count would not. The count of layers that pin a
// monolith dependency would move by one.
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

const MODULE_REL_IF_CUT = 'js/services/scanner-dxlink-prices.js';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = '3aeabd2';
const BASE_CHARS = 1444511;
const BASE_UTF8 = 1473050;
const BASE_LF = 24972;
const BASE_SHA256 = 'c323235b7bc317569261456be1234b330a6a0f08fb345c286d106f8778454a69';
const LOCAL_SCRIPTS = 93;
const TEST_FILE_COUNT = 178;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-scanner-dxlink-prices-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/scanner-dxlink-prices-audit.spec.js';
const RATCHETED_CONTRACTS = 40;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that is newest at this base, and whose spec this phase retires.
const PREVIOUS_CONTRACT = 'tests/portfolio-missing-underlyings-gate-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 141;
// The spec this cycle retires — the outgoing CONTRACT's, which goes in Phase 1
// as the rhythm runs — and what it carried. §10 asserts the arithmetic.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-missing-underlyings-gate-contract.spec.js';
const RETIRED_MUTANTS = 135;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this audit's spec
// now, the next layer's contract spec after Phase 2. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 115559;
const CODE_CHARS = 1328926;
const TOP_LEVEL_DECLS = 910;
const OWNER_REGIONS = 118;

// ── The recommended region ───────────────────────────────────────────────────
// It opens on the four comment lines that document the function, the first of
// which is the banner that opens its region, and which the screen also visits.
const RAW_AT_IN_CODE = 61214;
const DECL_AT_IN_CODE = 61522;
const RAW_END_IN_CODE = 64249;
const BODY_END_IN_CODE = 64248;
const RAW_CHARS = 3035;
const BODY_CHARS = 3034;
const BODY_UTF8 = 3048;
const BODY_LF = 63;
const BODY_SHA256 = '14a53502a61988d26ca98f2d19e370e04c712db80cdce3b076cfb58f9c75d885';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE =
  '// ── DXLink on-demand stock price fetch for scanner ─';
const DECL_FIRST_LINE =
  'async function fetchScannerDXLinkPrices(tickers){';
const EM_DASHES = 0;
const NON_ASCII_CHARS = 7;
const NEXT_DECL = '_ensureVixFamily';
const NEXT_DOC_PREFIX = '// Parses a VIX-family timestamp';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['fetchScannerDXLinkPrices'];
const OWNER_SIZES = [2725];

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 63;
const CODE_LINES = 59;
const COMMENT_LINES = 4;
const BLANK_LINES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
// Between the previous function's closing brace and the declaration the seam
// accepts SEVEN line starts. One is that closing brace and is not valid
// JavaScript; one is a blank line; four are the lines of the documentation, the
// first being the banner, and the last is the declaration.
const BRACE_OPENING = 61211;
const BLANK_OPENING = 61213;
const MID_LINE_OPENING = 61212;
const SEAM_LEGAL_OPENINGS = 7;
const PARSING_OPENINGS = 6;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DOC_TAKEN = 308;
const DOC_TAKEN_LINES = 4;
const DECL_UNITS_FROM_DECLARATION = 2726;
const CANDIDATES_AT_CUT = 1;
const BLANK_AFTER_CUT = '}\n\n// Parses a VIX-family timestamp';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 61214;
const REGION_END = 65455;
const REGION_CHARS = 4241;
const REGION_OWNERS = 2;
const OWNER_POSITION = 1;
const BANNER_LINE_PREFIX = '// ── DXLink on-demand stock price fetch';
const WHOLE_REGION_NINE = 26;
const WHOLE_REGION_BCS = 15;
const WHOLE_REGION_CONSUMERS = 3;
const WHOLE_REGION_DEPS = 1;
const WHOLE_REGION_SIB = 7;

// ── Taking more, priced: the owners above, the owners below ──────────────────
// Above: [name of the first owner taken, opening, raw units to the cut's raw
// end, raw nine, byConsumerSplit, monolith dependencies]. They sit in the region
// before this one, so taking them crosses a banner.
const EXTENSIONS_UP = [
  ['togglePortfolioAutoRefresh', 60925, 3324, 8, 7, 3],
  ['formatPnl', 60803, 3446, 12, 11, 3],
  ['stopPortfolioRefresh', 60479, 3770, 15, 14, 2],
];
// Below: [name of the last owner taken, raw units from the cut's opening, raw
// nine, byConsumerSplit, monolith dependencies].
const EXTENSIONS_DOWN = [
  ['_ensureVixFamily', 4241, 26, 15, 1],
  ['refreshSharedMarketRegime', 6141, 42, 22, 1],
];

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 3;
const BY_CONSUMER = 3;
const BY_CONSUMER_SPLIT = 2;
const CONSUMER = 'runScan';
const CONSUMER_SITES = 1;
const CONSUMER_SITE_AT = 93623;
const CONSUMER_AT = 91119;
const CONSUMER_END = 99954;
const CONSUMER_CHARS = 8836;
const MONOLITH_DEPENDENCIES = ['S'];
const S_REFERENCES = 1;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 1;
const OUTBOUND_MODULE_REFERENCES = 1;
const FOUNDATION_MODULE = 'js/api/backend-client.js';
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 1;
const FOUNDATION_NAMES = ['ttCall'];
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// The scan this file inherited reads only the first name of a `var` list as
// local, so the four names below read as globals being written. They are the
// names the body declares in its two comma-separated lists.
const UNCORRECTED_SCAN_HITS = 4;
const UNCORRECTED_SCAN_NAMES = ['channelId', 'subscribed', 'subscribed', 'ask'];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['fetchScannerDXLinkPrices'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7247;
const SEAM_REJECTED = 2045;
const CANDIDATES = 2913;
const CLEAN_CANDIDATES = 1779;
const SCORE_ONE_TIER = 0;
const SCORE_TWO = 9;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION. A function whose documentation lifts it over the floor
// was therefore never enumerated. This pass keeps every run the screen skipped
// for being short, re-measures it from the start of its documentation, and
// keeps those that then clear the floor.
const HIDDEN_ROWS = 36;
const HIDDEN_CLEAN_ROWS = 35;
const HIDDEN_SCORE_ONE = 0;
const HIDDEN_SCORE_TWO = 2;
// [opening, closing, units from the declaration, units from the documentation,
// raw nine, byConsumerSplit, owners].
const HIDDEN_SCORE_TWO_ROWS = [
  [896654, 898402, 1375, 1748, 4, 2, ['fetchBackendPortfolioPositionsEnriched']],
  [750645, 752344, 1278, 1699, 7, 2, ['_backendCacheStaleMark', '_squeezeToState']],
];
const OPENINGS_AT_TWO_OR_BELOW = 11;
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [286843, 2, 4, 1735],
  [896654, 2, 4, 1748],
  [942054, 2, 5, 1872],
  [185691, 2, 5, 2152],
];
// [opening, closing, raw nine, byConsumerSplit] of every row, over the screen and
// the pass together, whose raw nine is at most FULL_NINE.
const NINE_AT_BEST_ROWS = [
  [61214, 64248, 3, 2],
  [71940, 73970, 3, 3],
  [926059, 929849, 3, 3],
  [927763, 929849, 3, 3],
];
const PREVIOUS_RAW_CHARS = 1588;
const PREVIOUS_RAW_AT = 1142802;

// ── Where it would sit ───────────────────────────────────────────────────────
const CHAIN_LENGTH = 49;
const SMALLEST_LAYER_CHARS = 1587;
const SIZE_RANK_IF_CUT = 9;
const LAYERS_LARGER_THAN_THIS_CUT = 41;
const PURE_ASCII_LAYERS = 4;
const LAYERS_OPENING_ON_BANNER = 23;
const LAYERS_OPENING_ON_BANNER_IF_CUT = 24;
const LAYERS_WITH_A_DEPENDENCY = 16;

// ── If cut ───────────────────────────────────────────────────────────────────
const TAG_IF_CUT = '<script src="./js/services/scanner-dxlink-prices.js"></script>\n';
const NET_REDUCTION = 2972;
const INDEX_AFTER = 1441539;
const RESIDUAL_MONOLITH = 1325891;
const LOCAL_SCRIPTS_AFTER = 94;

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



console.log('SCANNER DXLINK PRICES — TEMPORARY BOUNDARY AUDIT');
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
section('2. The region, its seam, and the seven openings the seam admits');
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
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dashes…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…but NON_ASCII_CHARS non-ASCII characters: the box-drawing rules of its banner and the arrows of its handshake comment…');
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * NON_ASCII_CHARS,
  '…each three bytes in UTF-8, which is the whole of the gap between its UTF-8 and UTF-16 lengths');
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
  ok(blockAbove(next) === null, '…which has no comment block directly above it…');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DOC_PREFIX.length), NEXT_DOC_PREFIX,
    '…the comment that begins where the cut ends being a one-line leftover, NEXT_DOC_PREFIX…');
  ok(CODE.slice(RAW_END_IN_CODE).indexOf('\n\n\nfunction ' + NEXT_DECL) > 0
    && CODE.slice(RAW_END_IN_CODE).split('\n').slice(0, 2).every((l) => l.startsWith('//') || l === ''),
  '…detached from NEXT_DECL by two blank lines, so it documents nothing the cut takes or leaves');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits seven openings.
const OPENINGS = [];
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    'SEAM_LEGAL_OPENINGS line starts between the previous owner and the declaration are accepted');
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the previous function\'s closing brace');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last the declaration');
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
    '…so PARSING_OPENINGS of the seven are even candidates, counted rather than listed');
  eq(OPENINGS[1], BLANK_OPENING, 'the next is a blank line…');
  ok(isBlankOrComment(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE))),
    '…which would make a module that begins on an empty line');
  eq(OPENINGS[2], RAW_AT_IN_CODE, 'the one after it is the first line of the documentation, the cut');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES documentation lines are each an opening of their own');
}

// WHAT THE RECOMMENDATION TAKES is the whole comment block documenting the
// function, and nothing else: four comment lines directly above the declaration,
// the first of them the banner that opens the region.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the documentation taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES lines of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…every one a comment, so the cut takes prose and no code');
  ok(/^\/\/ ── /.test(doc), '…the first being a `// ── ` banner line');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNERS_EXPECTED[0])).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  ok(doc.indexOf('Resolves on full coverage or 25s timeout, then disconnects.') >= 0,
    '…and which states when it resolves, a claim §7 measures rather than trusts');
}
// WHAT LEAVING IT WOULD STRAND. Cutting at the declaration would leave the four
// comment lines behind, banner included, fused to the next function's
// documentation with no blank line between them.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DOC_PREFIX) >= 0,
    'cutting at the declaration would leave the documentation fused to the next function\'s own');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(clean.indexOf(BLANK_AFTER_CUT), RAW_AT_IN_CODE - 3,
    'while the recommended cut leaves the previous function\'s closing brace, exactly one blank '
    + 'line, and the next function\'s documentation');
  ok(clean.indexOf(DOC_FIRST_LINE) < 0, '…and no line of this documentation behind');
}
// THE SCREEN CAN SEE IT, and that is the difference from the cuts before it. The
// screen floors a run at RUN_FLOOR units measured from the DECLARATION; this
// function measures DECL_UNITS_FROM_DECLARATION that way, which clears the floor,
// and the banner that opens its region is the first line of its documentation, so
// the screen's own opening for it IS the cut's.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION >= RUN_FLOOR, '…at or above RUN_FLOOR, so the floor does not hide it…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and the shipped screen enumerates exactly CANDIDATES_AT_CUT run that ends where this cut does and opens where it does');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one dependency, one foundation reference, both directions measured');
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
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly the one name S');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES reference to a shipped module is counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), [CONSUMER], 'ONE consumer reaches in: CONSUMER');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES call site');
eq(REC.sites, [CONSUMER_SITE_AT], '…at CONSUMER_SITE_AT');
eq(CODE.slice(CONSUMER_SITE_AT - 'dxlinkPrices=await '.length, CONSUMER_SITE_AT), 'dxlinkPrices=await ',
  '…the consumer awaiting it and binding the result, which is all it does with it');
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
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module reference, which byConsumerSplit leaves out…');
  eq(split.foundationNames, FOUNDATION_NAMES, '…by the name FOUNDATION_NAMES…');
  eq(MODULE_OWNERS.get(FOUNDATION_NAMES[0]), FOUNDATION_MODULE, '…declared in FOUNDATION_MODULE, which has shipped');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT,
    '…so byConsumerSplit is BY_CONSUMER_SPLIT, one below the byConsumer');
}
// THE TWO REFERENCES OUT ARE READ WHEN THE FUNCTION IS CALLED, never when it loads.
{
  eq(refSites(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), 'S').length, S_REFERENCES,
    'the body names S at S_REFERENCES place, the first line of the function…');
  ok(/^async function fetchScannerDXLinkPrices\(tickers\)\{\n  if\(!S\.ttConnected\)return\{\};\n/.test(BODY.slice(BODY.indexOf('async function'))),
    '…an unguarded read, so the function must be called with S in scope: §7 runs it that way');
  const s = BY_NAME.get('S');
  eq(s.form, 'const', 'S is a top-level `const` of the monolith…');
  ok(s.end < RAW_AT_IN_CODE, '…declared above the cut, so the monolith still owns it after the move');
  eq(propertyWriteBases(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE)).filter((b) => b === 'S').length, 0,
    '…and the body only READS it: no property of S is written');
  eq(propertyWriteBases('function f() { S.ttConnected = 1; }').filter((b) => b === 'S').length, 1,
    'control — the same scan finds a planted write to a property of S, so that zero is a measurement');
  ok(BODY.indexOf("var tokenResp=await ttCall('/quote-token');") >= 0, 'the call to ttCall is the second line of the body…');
}
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time, S and ttCall included');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which is what the screen filters on');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region
// that declares no top-level `var` scores a perfect zero inbound while writing
// globals it does not own, so the profile's answer is not left standing alone.
//
// THE SCAN THIS FILE INHERITED WAS WRONG HERE, and it was the scan, not the
// function. It treats only the first name of a `var` list as local, so
// `var ws,channelId=1,subscribed=false;` and `var bid=+ev2.bidPrice,ask=+ev2.askPrice;`
// leave `channelId`, `subscribed` and `ask` reading as globals being written.
// All four hits are measured below, then the corrected scan, which reads every
// declarator. A zero from either needs a control that finds a violation.
{
  eq(nonLocalAssignmentsUncorrected(BODY).length, UNCORRECTED_SCAN_HITS,
    'the inherited scan reports UNCORRECTED_SCAN_HITS assignments to names it takes for globals…');
  eq(nonLocalAssignmentsUncorrected(BODY), UNCORRECTED_SCAN_NAMES, '…to exactly UNCORRECTED_SCAN_NAMES…');
  ok(/var ws,channelId=1,subscribed=false;/.test(BODY) && /var bid=\+ev2\.bidPrice,ask=\+ev2\.askPrice;/.test(BODY),
    '…which the body declares in two comma-separated var lists');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    'the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the body does not own…');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS,
    '…and HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document');
  // CONTROLS: the corrected scan DOES find a planted violation and still ignores
  // every declarator, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — it finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the tie is gone, and this opening is the only one at the best score');
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
  ok(PREVIOUS_RAW_AT > RAW_END_IN_CODE,
    '…and it sat entirely AFTER this cut, so no offset in this audit moved because of it');
  const listed = listOf('RUNNERS_UP');
  eq(listed.length, RUNNERS_UP.length, 'the previous contract published as many runners-up as this audit does…');
  eq(listed[0], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the first of them being THIS cut, at the same byConsumerSplit, raw nine and length, unmoved…');
  eq(listed.slice(1), RUNNERS_UP.slice(0, 3), '…and the other three being exactly the top of RUNNERS_UP now…');
  ok(listOf('NINE_AT_BEST_ROWS').length === 5,
    '…the contract having recorded five rows at the best raw nine, this one and the pair it took among them');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= 1).length, SCORE_ONE_TIER,
    'the shipped screen counts SCORE_ONE_TIER clean candidates at 1 or below…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 2).length, SCORE_TWO,
    '…the best it finds being SCORE_TWO candidates at 2, this cut among them');
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
    HIDDEN_SCORE_TWO_ROWS, '…those being exactly HIDDEN_SCORE_TWO_ROWS, none of them this cut, which the SCREEN holds');
  // THE RAW NINE, over the screen and the pass together.
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc })));
  eq(rows.filter((r) => r.nine < FULL_NINE).length, 0,
    'in the screen and the pass together NOT ONE row has a raw nine below FULL_NINE…');
  const atBest = rows.filter((r) => r.nine <= FULL_NINE).map((r) => [r.lo, r.hi, r.nine, r.bcs])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  eq(atBest, NINE_AT_BEST_ROWS, '…and the rows at FULL_NINE are exactly NINE_AT_BEST_ROWS, each at an opening of its own');
  eq(new Set(atBest.map((r) => r[0])).size, atBest.length, '…counted by opening');
  const tied = atBest.filter((r) => r[3] <= BY_CONSUMER_SPLIT);
  eq(tied.map((r) => r[0]), [RAW_AT_IN_CODE],
    '…and exactly ONE of them also scores BY_CONSUMER_SPLIT or below on byConsumerSplit: this cut. The tie the previous audit stated is gone');
  eq(rows.filter((r) => r.nine <= FULL_NINE && r.bcs <= BY_CONSUMER_SPLIT).length, 1,
    '…counted over the rows rather than the openings, so a second row at the same opening could not hide');
  eq(new Set(rows.filter((r) => r.bcs <= BY_CONSUMER_SPLIT).map((r) => r.lo)).size, OPENINGS_AT_TWO_OR_BELOW,
    '…among OPENINGS_AT_TWO_OR_BELOW distinct openings that score 2 or below, so the lead is in the nine and the byConsumerSplit alone does not give it');
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
  ok(ranked.every((r) => r[2] > FULL_NINE), '…every one with a raw nine above FULL_NINE, so none of them is a second opening at the best score');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What taking more would cost: the owners above, the owners below, the region');
// ─────────────────────────────────────────────────────────────────────────────
for (const [name, lo, units, nine, bcs, deps] of EXTENSIONS_UP) {
  const d = BY_NAME.get(name);
  eq((blockAbove(d) || { start: d.start }).start, lo, 'taking ' + name + ' with its documentation, if it has any, opens at the pinned offset');
  eq(assertSeam(CODE, lo, BODY_END_IN_CODE), RAW_END_IN_CODE, '…at a real seam');
  const p = profileOf([lo, BODY_END_IN_CODE]);
  eq([RAW_END_IN_CODE - lo, p.nine, byConsumerSplit(p, outboundSplit(lo, BODY_END_IN_CODE)), p.deps.length],
    [units, nine, bcs, deps], '…units, raw nine, byConsumerSplit and dependencies are as pinned');
  ok(runsNothingAtLoad(loadTimeProfile(lo, BODY_END_IN_CODE)), '…and it too runs nothing at load');
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…worse than the cut on the raw nine and no better on byConsumerSplit');
}
eq(EXTENSIONS_UP.every((e, i) => i === 0 || (e[3] > EXTENSIONS_UP[i - 1][3] && e[2] > EXTENSIONS_UP[i - 1][2])), true,
  'each further owner taken above raises the raw nine and the length again, so no stopping point is better');
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
for (const [name, units, nine, bcs, deps] of EXTENSIONS_DOWN) {
  const d = BY_NAME.get(name);
  const hb = downEnd(d);
  const hr = assertSeam(CODE, RAW_AT_IN_CODE, hb);
  const p = profileOf([RAW_AT_IN_CODE, hb]);
  eq([hr - RAW_AT_IN_CODE, p.nine, byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, hb)), p.deps.length],
    [units, nine, bcs, deps], 'running the cut down through ' + name + ' costs the pinned units, nine, byConsumerSplit and dependencies');
  ok(runsNothingAtLoad(loadTimeProfile(RAW_AT_IN_CODE, hb)), '…a run that also runs nothing at load');
  ok(nine > FULL_NINE && bcs >= BY_CONSUMER_SPLIT, '…and is worse on the raw nine, and no better on byConsumerSplit');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner
// region" would require all of it. This cut is different in kind: it OPENS the
// region, so the banner goes with it.
{
  const reg = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, which is where the cut opens');
  eq(reg.end, REGION_END, '…and ends at REGION_END');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the DXLink price-fetch banner, which describes it');
  const own = DECLS.filter((d) => d.start >= reg.start && d.end < reg.end);
  eq(own.length, REGION_OWNERS, '…holding REGION_OWNERS owners');
  eq(own.findIndex((d) => d.name === OWNERS_EXPECTED[0]) + 1, OWNER_POSITION,
    '…this function being owner number OWNER_POSITION of them, the first');
  eq(own[OWNER_POSITION].name, NEXT_DECL, '…and NEXT_DECL the one below it');
  ok(reg.end > RAW_END_IN_CODE, '…so the cut does NOT close its region');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependencies');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling modules');
  // WHAT THE CUT LEAVES BEHIND. The banner is the first line of the cut, so the
  // owner left in the region is no longer under a banner of its own: it falls under
  // the banner of the region before.
  const left = BY_NAME.get(NEXT_DECL);
  const bannerOver = (marks, at) => marks.filter((m) => m < at).pop();
  eq(bannerOver(MARKS, left.start), RAW_AT_IN_CODE,
    'before the cut the banner over NEXT_DECL is the cut\'s own first line…');
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  const cleanMarks = topLevelBanners(clean, functionBodyRanges(clean));
  const cleanLeft = scanTopLevelDeclarations(clean).filter((d) => d.name === NEXT_DECL)[0];
  const over = bannerOver(cleanMarks, cleanLeft.start);
  ok(over !== undefined && over < RAW_AT_IN_CODE,
    '…and after it the banner over NEXT_DECL opens BEFORE the cut: the previous region\'s');
  ok(clean.slice(over, clean.indexOf('\n', over)) !== DOC_FIRST_LINE,
    '…and is not this banner, which left with the cut');
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
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  ok(CLEAN_CANDIDATES < Number(prev.match(/^const CLEAN_CANDIDATES = (\d+);$/m)[1]),
    '…fewer than the previous contract counted, because a cut left the monolith');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
ok(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).every((c) => c.hi >= BODY_END_IN_CODE),
  '…and every run the screen opens there is at least as long as the cut, since the cut is one of them or contains it');

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, needs S, ttCall and a WebSocket to run, and walks the handshake');
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
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const plain = (v) => JSON.parse(JSON.stringify(v));
  // A HARNESS: the function run in a fresh VM context whose S, ttCall, WebSocket
  // and timers are fakes this file controls. Nothing real is opened.
  const harness = (opts = {}) => {
    const sent = [], calls = [], timers = [];
    const h = { sent, calls, timers, ws: null, constructed: 0 };
    class FakeWebSocket {
      constructor(url) {
        h.constructed++;
        if (opts.constructorThrows) throw new Error('no websocket');
        this.url = url; this.closed = 0; h.ws = this;
      }
      send(m) { sent.push(JSON.parse(m)); }
      close() { this.closed++; }
    }
    const sandbox = {
      S: { ttConnected: opts.connected !== false },
      ttCall: async (p) => { calls.push(p); return opts.token === undefined ? { token: 'TKN' } : opts.token; },
      WebSocket: FakeWebSocket,
      setTimeout: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length; },
      clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].cleared = true; },
    };
    if (opts.dxlinkUrl) sandbox.ttCall = async (p) => { calls.push(p); return { token: 'TKN', dxlinkUrl: opts.dxlinkUrl }; };
    const c = vm.createContext(sandbox);
    vm.runInContext(BODY, c);
    h.run = (tickers) => { h.p = vm.runInContext(VM_GLOBALS[0], c)(tickers); return h.p; };
    h.msg = (m) => h.ws.onmessage({ data: typeof m === 'string' ? m : JSON.stringify(m) });
    h.handshake = async (tickers) => {
      h.run(tickers); await flush();
      h.ws.onopen();
      h.msg({ type: 'SETUP' });
      h.msg({ type: 'AUTH_STATE', state: 'AUTHORIZED' });
      h.msg({ type: 'CHANNEL_OPENED', channel: 1 });
    };
    return h;
  };
  // LOADS BARE: declaring the function needs nothing.
  {
    const ctx = vm.createContext(Object.create(null));
    vm.runInContext(BODY, ctx);
    eq(Object.getOwnPropertyNames(ctx).sort(), VM_GLOBALS.slice().sort(),
      'it LOADS in a completely bare VM and declares exactly its one owner');
    let err = null;
    await vm.runInContext(VM_GLOBALS[0], ctx)(['AAPL']).catch((e) => { err = e; });
    ok(err && err.name === 'ReferenceError',
      '…but CALLED with no S it rejects with a ReferenceError: the read of S is unguarded, so S must be in scope');
  }
  // THE EARLY EXITS.
  {
    const off = harness({ connected: false });
    eq(plain(await off.run(['AAPL'])), {}, 'with S.ttConnected false it resolves with an empty map…');
    eq([off.calls.length, off.constructed], [0, 0], '…having asked for no token and opened no socket');
    const none = harness({ token: null });
    eq(plain(await none.run(['AAPL'])), {}, 'when ttCall returns nothing it resolves with an empty map…');
    eq(none.constructed, 0, '…without opening a socket');
    const noTok = harness({ token: {} });
    eq(plain(await noTok.run(['AAPL'])), {}, '…and so does a response with no token');
    const boom = harness({ constructorThrows: true });
    eq(plain(await boom.run(['AAPL'])), {}, 'when the WebSocket cannot be constructed it resolves with an empty map…');
    ok(boom.timers.length === 1 && boom.timers[0].cleared, '…and clears the 25-second timer it had already armed');
  }
  // THE HANDSHAKE, in order, and the resolution on full coverage.
  {
    const h = harness();
    h.run(['AAPL', 'MSFT']); await flush();
    eq(h.calls, ['/quote-token'], 'it asks the backend for a quote token…');
    eq(h.ws.url, 'wss://tasty-openapi-ws.dxfeed.com/realtime', '…and opens the default DXLink URL when none is returned…');
    eq([h.timers.length, h.timers[0].ms], [1, 25000], '…arming exactly one timer, of 25 seconds');
    h.ws.onopen();
    eq(h.sent[0], { type: 'SETUP', channel: 0, version: '0.1', keepaliveTimeout: 60, acceptKeepaliveTimeout: 60 },
      'on open it sends SETUP…');
    h.msg({ type: 'SETUP' });
    eq(h.sent[1], { type: 'AUTH', channel: 0, token: 'TKN' }, '…on SETUP it sends AUTH with the token…');
    h.msg({ type: 'AUTH_STATE', state: 'UNAUTHORIZED' });
    eq(h.sent.length, 2, '…an AUTH_STATE that is not AUTHORIZED sends nothing…');
    h.msg({ type: 'AUTH_STATE', state: 'AUTHORIZED' });
    eq(h.sent[2], { type: 'CHANNEL_REQUEST', channel: 1, service: 'FEED', parameters: { contract: 'AUTO' } },
      '…AUTHORIZED requests channel 1…');
    h.msg({ type: 'CHANNEL_OPENED', channel: 2 });
    eq(h.sent.length, 3, '…a CHANNEL_OPENED for another channel is ignored…');
    h.msg({ type: 'CHANNEL_OPENED', channel: 1 });
    eq(h.sent[3].type, 'FEED_SETUP', '…and channel 1 opening sends FEED_SETUP…');
    eq(h.sent[3].acceptEventFields, { Quote: ['eventSymbol', 'bidPrice', 'askPrice'] }, '…asking for the symbol, bid and ask…');
    eq(h.sent[4], { type: 'FEED_SUBSCRIPTION', channel: 1, add: [{ type: 'Quote', symbol: 'AAPL' }, { type: 'Quote', symbol: 'MSFT' }] },
      '…then subscribing both tickers in one batch');
    h.msg({ type: 'KEEPALIVE' });
    eq(h.sent[5], { type: 'KEEPALIVE', channel: 0 }, 'a KEEPALIVE is answered in kind…');
    h.msg('not json'); h.msg('null');
    eq(h.sent.length, 6, '…and unparseable or empty messages are ignored without throwing');
    h.msg({ type: 'FEED_DATA', channel: 1, data: [
      { eventSymbol: 'AAPL', bidPrice: 100, askPrice: 101.5 },
      { eventSymbol: 'MSFT', bidPrice: 0, askPrice: 5 },
      { bidPrice: 1, askPrice: 2 },
      { eventSymbol: 'NOPE', bidPrice: null, askPrice: 3 },
    ] });
    eq(h.ws.closed, 0, 'partial coverage does not resolve: a zero bid, a missing symbol and a null bid are all skipped…');
    h.msg({ type: 'FEED_DATA', channel: 2, data: [{ eventSymbol: 'MSFT', bidPrice: 9, askPrice: 9 }] });
    eq(h.ws.closed, 0, '…and data for another channel is ignored…');
    h.msg({ type: 'FEED_DATA', channel: 1, data: [{ eventSymbol: 'MSFT', bidPrice: '200', askPrice: '200.5' }] });
    const got = plain(await h.p);
    eq(got, { AAPL: { bid: 100, ask: 101.5, mark: 100.75 }, MSFT: { bid: 200, ask: 200.5, mark: 200.25 } },
      '…full coverage resolves bid, ask and mark per symbol, strings coerced to numbers…');
    eq([h.ws.closed, h.timers[0].cleared], [1, true], '…closing the socket once and clearing the timer');
  }
  // THE URL, THE BATCHES, AND THE GATE ON SUBSCRIBING.
  {
    const h = harness({ dxlinkUrl: 'wss://example.test/feed' });
    const many = Array.from({ length: 301 }, (_, i) => 'T' + i);
    await h.handshake(many);
    eq(h.ws.url, 'wss://example.test/feed', 'a URL in the token response is used instead of the default…');
    const subs = h.sent.filter((m) => m.type === 'FEED_SUBSCRIPTION');
    eq(subs.map((m) => m.add.length), [150, 150, 1], '…301 tickers go out in batches of 150, 150 and 1');
    const early = harness();
    early.run(['AAPL']); await flush();
    early.ws.onopen();
    early.msg({ type: 'FEED_DATA', channel: 1, data: [{ eventSymbol: 'AAPL', bidPrice: 1, askPrice: 3 }] });
    eq(early.ws.closed, 0, 'data that arrives before the subscription is made does not resolve it, even at full coverage');
    early.ws.onerror();
    eq(plain(await early.p), { AAPL: { bid: 1, ask: 3, mark: 2 } }, '…and an error resolves with what had arrived, so the map is partial, not lost');
  }
  // THE THREE WAYS OUT BESIDES FULL COVERAGE, each resolving once with the partial map.
  {
    const t = harness();
    await t.handshake(['A', 'B']);
    t.msg({ type: 'FEED_DATA', channel: 1, data: [{ eventSymbol: 'A', bidPrice: 2, askPrice: 4 }] });
    t.timers[0].fn();
    eq(plain(await t.p), { A: { bid: 2, ask: 4, mark: 3 } }, 'the 25-second timer resolves with the partial map…');
    eq(t.ws.closed, 1, '…and closes the socket');
    t.ws.onclose(); t.ws.onerror(); t.timers[0].fn();
    eq(t.ws.closed, 1, '…and nothing that fires afterwards closes it again: it resolves ONCE');
    const c = harness();
    await c.handshake(['A']);
    c.ws.onclose();
    eq(plain(await c.p), {}, 'a close before any data resolves with an empty map…');
    eq(c.ws.closed, 0, '…without closing a socket that is already closed');
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
  // THE TWO CHAIN-WIDE SHAPE COUNTS. This body holds non-ASCII text, so the
  // pure-ASCII count does not move; it opens on a `── ` banner, so the banner
  // count DOES.
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, 'PURE_ASCII_LAYERS of the chain are pure ASCII today');
  ok(!ascii(BODY), '…and this body is not, so that count would NOT move');
  eq(sources.concat([BODY]).filter(ascii).length, PURE_ASCII_LAYERS, '…measured with it included, which is the same count');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line today');
  ok(banner(BODY), '…and this body DOES, so that count WOULD move');
  eq(sources.concat([BODY]).filter(banner).length, LAYERS_OPENING_ON_BANNER_IF_CUT,
    '…to LAYERS_OPENING_ON_BANNER_IF_CUT, measured with it included');
  eq(LAYERS_OPENING_ON_BANNER_IF_CUT, LAYERS_OPENING_ON_BANNER + 1, '…which the two constants say as well');
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
eq(LOCALS[LOCALS.length - 1], 'js/portfolio/portfolio-missing-underlyings-gate.js',
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
console.log('SCANNER_DXLINK_PRICES_AUDIT_OK');
}

main();
